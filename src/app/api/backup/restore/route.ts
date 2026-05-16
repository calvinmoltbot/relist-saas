import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { items, transactions, expenses, priceData, priceStats } from "@/db/schema";
import { getUserId, UnauthorizedError } from "@/lib/auth/getUserId";

const SUPPORTED_VERSIONS = [1, 2];

const TABLE_KEYS = [
  "items",
  "transactions",
  "expenses",
  "priceData",
  "priceStats",
] as const;
type TableKey = (typeof TABLE_KEYS)[number];

// Safety caps. A restore wipes the caller's data — if a malformed or oversized
// upload made it through, the user would be left with empty tables. Reject
// before we touch anything.
const MAX_BODY_BYTES = 50 * 1024 * 1024; // 50 MB
const MAX_ROWS_PER_TABLE: Record<TableKey, number> = {
  items: 50_000,
  transactions: 200_000,
  expenses: 50_000,
  priceData: 200_000,
  priceStats: 50_000,
};

interface BackupFile {
  version: number;
  exportedAt?: string;
  userId?: string;
  data: Partial<Record<TableKey, Array<Record<string, unknown>>>>;
}

function isBackupFile(x: unknown): x is BackupFile {
  if (!x || typeof x !== "object") return false;
  const obj = x as Record<string, unknown>;
  if (typeof obj.version !== "number") return false;
  if (!obj.data || typeof obj.data !== "object") return false;
  return true;
}

// POST /api/backup/restore
// Replace the current user's data with the uploaded backup. NEVER touches
// other users' rows. Any row in the file whose userId does not match the
// caller is rewritten to the caller's userId so a backup can be re-imported
// across accounts (the data is still scoped to the importer).
export async function POST(req: NextRequest) {
  let userId: string;
  try {
    userId = await getUserId(req);
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: e.message }, { status: 401 });
    }
    throw e;
  }

  const contentLength = Number(req.headers.get("content-length") ?? "0");
  if (contentLength && contentLength > MAX_BODY_BYTES) {
    return NextResponse.json(
      { error: `Backup file too large (max ${MAX_BODY_BYTES / 1024 / 1024} MB).` },
      { status: 413 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!isBackupFile(body)) {
    return NextResponse.json(
      { error: "File is not a Relist backup (missing version or data)" },
      { status: 400 },
    );
  }

  if (!SUPPORTED_VERSIONS.includes(body.version)) {
    return NextResponse.json(
      {
        error: `Unsupported backup version ${body.version}. This app reads versions: ${SUPPORTED_VERSIONS.join(", ")}.`,
      },
      { status: 400 },
    );
  }

  // Validate every row shape BEFORE we touch the user's data. A restore is
  // destructive — failing mid-flight with the deletes done and inserts not
  // would leave the family-member account empty.
  for (const key of TABLE_KEYS) {
    const rows = body.data[key];
    if (rows === undefined) continue;
    if (!Array.isArray(rows)) {
      return NextResponse.json(
        { error: `data.${key} must be an array if present` },
        { status: 400 },
      );
    }
    if (rows.length > MAX_ROWS_PER_TABLE[key]) {
      return NextResponse.json(
        {
          error: `data.${key} has ${rows.length} rows (cap ${MAX_ROWS_PER_TABLE[key]}). Refusing to restore.`,
        },
        { status: 413 },
      );
    }
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row || typeof row !== "object" || Array.isArray(row)) {
        return NextResponse.json(
          { error: `data.${key}[${i}] is not an object` },
          { status: 400 },
        );
      }
    }
  }

  // Wipe the caller's rows in FK-safe order (children before parents).
  // Neon HTTP doesn't support transactions — the caller is expected to
  // have downloaded a fresh /api/backup right before calling this so they
  // can roll forward by re-importing if anything fails mid-way.
  await db.delete(transactions).where(eq(transactions.userId, userId));
  await db.delete(expenses).where(eq(expenses.userId, userId));
  await db.delete(priceData).where(eq(priceData.userId, userId));
  await db.delete(priceStats).where(eq(priceStats.userId, userId));
  await db.delete(items).where(eq(items.userId, userId));

  const counts: Record<TableKey, number> = {
    items: 0,
    transactions: 0,
    expenses: 0,
    priceData: 0,
    priceStats: 0,
  };

  // Force userId on every row so we never write another user's id into
  // our own scope, regardless of what the file claims.
  const force = <T extends Record<string, unknown>>(rows: T[]): T[] =>
    rows.map((r) => ({ ...r, userId }));

  const itemRows = body.data.items ?? [];
  if (itemRows.length) {
    await db.insert(items).values(force(itemRows) as (typeof items.$inferInsert)[]);
    counts.items = itemRows.length;
  }

  const txRows = body.data.transactions ?? [];
  if (txRows.length) {
    await db
      .insert(transactions)
      .values(force(txRows) as (typeof transactions.$inferInsert)[]);
    counts.transactions = txRows.length;
  }

  const expRows = body.data.expenses ?? [];
  if (expRows.length) {
    await db
      .insert(expenses)
      .values(force(expRows) as (typeof expenses.$inferInsert)[]);
    counts.expenses = expRows.length;
  }

  const pdRows = body.data.priceData ?? [];
  if (pdRows.length) {
    await db
      .insert(priceData)
      .values(force(pdRows) as (typeof priceData.$inferInsert)[]);
    counts.priceData = pdRows.length;
  }

  const psRows = body.data.priceStats ?? [];
  if (psRows.length) {
    await db
      .insert(priceStats)
      .values(force(psRows) as (typeof priceStats.$inferInsert)[]);
    counts.priceStats = psRows.length;
  }

  return NextResponse.json({
    ok: true,
    counts,
    restoredAt: new Date().toISOString(),
  });
}

// GET — current row counts, so the client can compare against an upload
// before clobbering everything.
export async function GET(req: NextRequest) {
  let userId: string;
  try {
    userId = await getUserId(req);
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: e.message }, { status: 401 });
    }
    throw e;
  }

  const [it, tx, ex, pd, ps] = await Promise.all([
    db.$count(items, eq(items.userId, userId)),
    db.$count(transactions, eq(transactions.userId, userId)),
    db.$count(expenses, eq(expenses.userId, userId)),
    db.$count(priceData, eq(priceData.userId, userId)),
    db.$count(priceStats, eq(priceStats.userId, userId)),
  ]);

  return NextResponse.json({
    counts: {
      items: it,
      transactions: tx,
      expenses: ex,
      priceData: pd,
      priceStats: ps,
    },
  });
}
