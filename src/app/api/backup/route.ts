import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { items, transactions, expenses, priceData, priceStats } from "@/db/schema";
import { getUserId, UnauthorizedError } from "@/lib/auth/getUserId";

// GET /api/backup
// Full export of the calling user's data as a single JSON file. Multi-tenant:
// every table is filtered by userId. api_keys are intentionally excluded —
// tokens are sha256-hashed so re-importing them is useless; the user can
// regenerate keys from the UI.
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

  const [
    allItems,
    allExpenses,
    allPriceData,
    allPriceStats,
  ] = await Promise.all([
    db.select().from(items).where(eq(items.userId, userId)),
    db.select().from(expenses).where(eq(expenses.userId, userId)),
    db.select().from(priceData).where(eq(priceData.userId, userId)),
    db.select().from(priceStats).where(eq(priceStats.userId, userId)),
  ]);

  // transactions reference items via FK — pulling the user's own rows is
  // already user-scoped because every transactions row carries userId.
  const allTransactions = await db
    .select()
    .from(transactions)
    .where(eq(transactions.userId, userId));

  const exportedAt = new Date().toISOString();
  const backup = {
    version: 2,
    exportedAt,
    userId,
    counts: {
      items: allItems.length,
      transactions: allTransactions.length,
      expenses: allExpenses.length,
      priceData: allPriceData.length,
      priceStats: allPriceStats.length,
    },
    data: {
      items: allItems,
      transactions: allTransactions,
      expenses: allExpenses,
      priceData: allPriceData,
      priceStats: allPriceStats,
    },
  };

  const filename = `relist-backup-${exportedAt.slice(0, 10)}.json`;
  return new NextResponse(JSON.stringify(backup, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
