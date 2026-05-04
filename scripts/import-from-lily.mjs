#!/usr/bin/env node
/**
 * Import a Relist (legacy single-tenant) JSON backup into the multi-tenant
 * relist-saas DB under a chosen Clerk userId, with every row tagged
 * is_sample = true so it can be cleared via the UI.
 *
 * READ-ONLY against the source backup file. Never touches Lily's app or DB.
 *
 * Usage:
 *   node scripts/import-from-lily.mjs --backup <path-to-backup.json> --user-id <clerk_user_id>
 *
 * Optional flags:
 *   --dry-run        parse + map but don't insert
 *   --replace        delete this user's existing is_sample rows first
 *
 * Mapping notes:
 * - vinted_url is dropped intentionally (no public links, per request)
 * - photo_urls + thumbnail_url come through as-is (base64 data URIs)
 * - new UUIDs are generated for items / transactions / expenses
 * - timestamps preserved
 */
import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";

config({ path: ".env.local", quiet: true });

const args = parseArgs(process.argv.slice(2));
if (args.help || (!args["backup"] && !args["b"])) {
  console.log(usage());
  process.exit(args.help ? 0 : 1);
}

const backupPath = args.backup ?? args.b;
const targetUserId = args["user-id"] ?? args.u;
const dryRun = !!args["dry-run"];
const replace = !!args.replace;

if (!targetUserId) {
  console.error("Missing --user-id. Available users with rows already in the DB:");
  await printUserCandidates();
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);

console.log(`→ reading ${backupPath}`);
const raw = await readFile(backupPath, "utf8");
const backup = JSON.parse(raw);
const data = backup.data ?? {};
const items = data.items ?? [];
const transactions = data.transactions ?? [];
const expenses = data.expenses ?? [];

console.log(
  `→ source: ${items.length} items, ${transactions.length} transactions, ${expenses.length} expenses`,
);
console.log(`→ target user: ${targetUserId}`);
if (dryRun) console.log("→ DRY RUN — no writes");
if (replace) console.log("→ will delete existing is_sample rows for this user first");

// Build item id remap — old UUID → new UUID
const itemIdMap = new Map();
for (const it of items) itemIdMap.set(it.id, randomUUID());

// Map items to relist-saas shape
const itemsToInsert = items.map((it) => ({
  id: itemIdMap.get(it.id),
  user_id: targetUserId,
  name: it.name,
  brand: it.brand ?? null,
  category: it.category ?? null,
  condition: it.condition ?? null,
  size: it.size ?? null,
  cost_price: it.costPrice ?? null,
  listed_price: it.listedPrice ?? null,
  sold_price: it.soldPrice ?? null,
  status: it.status ?? "sourced",
  platform: it.platform ?? "vinted",
  photo_urls: it.photoUrls ?? null,
  thumbnail_url: it.thumbnailUrl ?? null,
  description: it.description ?? null,
  source_type: it.sourceType ?? null,
  source_location: it.sourceLocation ?? null,
  vinted_url: null, // intentionally dropped
  listed_at: it.listedAt ?? null,
  sold_at: it.soldAt ?? null,
  buyer_paid_shipping: it.buyerPaidShipping ?? true,
  shipped_at: it.shippedAt ?? null,
  last_edited_at: it.lastEditedAt ?? null,
  relist_count: it.relistCount ?? 0,
  is_sample: true,
  created_at: it.createdAt ?? new Date().toISOString(),
  updated_at: it.updatedAt ?? new Date().toISOString(),
}));

const txToInsert = transactions
  .filter((t) => itemIdMap.has(t.itemId))
  .map((t) => ({
    id: randomUUID(),
    user_id: targetUserId,
    item_id: itemIdMap.get(t.itemId),
    transaction_type: t.transactionType,
    gross_price: t.grossPrice ?? null,
    shipping_cost: t.shippingCost ?? "0",
    platform_fees: t.platformFees ?? "0",
    profit: t.profit ?? null,
    completed_at: t.completedAt ?? null,
    is_sample: true,
    created_at: t.createdAt ?? new Date().toISOString(),
  }));

const expToInsert = expenses.map((e) => ({
  id: randomUUID(),
  user_id: targetUserId,
  category: e.category ?? "other",
  description: e.description ?? null,
  amount: e.amount ?? "0",
  item_id: e.itemId && itemIdMap.has(e.itemId) ? itemIdMap.get(e.itemId) : null,
  incurred_at: e.incurredAt ?? e.createdAt ?? new Date().toISOString(),
  is_sample: true,
  created_at: e.createdAt ?? new Date().toISOString(),
}));

console.log(
  `→ mapped: ${itemsToInsert.length} items, ${txToInsert.length} transactions (${
    transactions.length - txToInsert.length
  } orphaned), ${expToInsert.length} expenses`,
);

if (dryRun) {
  console.log("→ DRY RUN complete, no writes performed");
  process.exit(0);
}

if (replace) {
  console.log("→ deleting existing is_sample rows for this user…");
  const t = await sql`DELETE FROM transactions WHERE user_id = ${targetUserId} AND is_sample = true RETURNING id`;
  const x = await sql`DELETE FROM expenses WHERE user_id = ${targetUserId} AND is_sample = true RETURNING id`;
  const i = await sql`DELETE FROM items WHERE user_id = ${targetUserId} AND is_sample = true RETURNING id`;
  console.log(`  ↳ removed ${i.length} items, ${t.length} transactions, ${x.length} expenses`);
}

console.log("→ inserting items…");
let n = 0;
for (const batch of chunks(itemsToInsert, 20)) {
  await bulkInsert("items", batch);
  n += batch.length;
  process.stdout.write(`  ${n}/${itemsToInsert.length}\r`);
}
console.log(`  ↳ ${n} items inserted`);

console.log("→ inserting transactions…");
n = 0;
for (const batch of chunks(txToInsert, 50)) {
  if (batch.length === 0) continue;
  await bulkInsert("transactions", batch);
  n += batch.length;
}
console.log(`  ↳ ${n} transactions inserted`);

if (expToInsert.length > 0) {
  console.log("→ inserting expenses…");
  await bulkInsert("expenses", expToInsert);
  console.log(`  ↳ ${expToInsert.length} expenses inserted`);
}

console.log("\n✓ done");

// ------------------------------------------------------------------- helpers

function* chunks(arr, n) {
  for (let i = 0; i < arr.length; i += n) yield arr.slice(i, i + n);
}

/**
 * Multi-row bulk insert via sql.query with $N placeholders, since
 * @neondatabase/serverless tagged-template doesn't support row arrays.
 */
async function bulkInsert(table, rows) {
  if (rows.length === 0) return;
  const cols = Object.keys(rows[0]);
  const colList = cols.map((c) => `"${c}"`).join(", ");
  const params = [];
  const valuesSql = rows
    .map((row) => {
      const placeholders = cols.map((c) => {
        params.push(row[c]);
        return `$${params.length}`;
      });
      return `(${placeholders.join(", ")})`;
    })
    .join(", ");
  await sql.query(`INSERT INTO "${table}" (${colList}) VALUES ${valuesSql}`, params);
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--") && !a.startsWith("-")) continue;
    const key = a.replace(/^--?/, "");
    const next = argv[i + 1];
    if (next && !next.startsWith("-")) {
      out[key] = next;
      i++;
    } else {
      out[key] = true;
    }
  }
  return out;
}

function usage() {
  return `Usage:
  node scripts/import-from-lily.mjs --backup <path> --user-id <clerk_user_id> [--dry-run] [--replace]

Examples:
  node scripts/import-from-lily.mjs --backup ~/Dev/Projects/relist/backups/relist-20260424-072905.json --user-id user_xxx --dry-run
  node scripts/import-from-lily.mjs --backup ~/Dev/Projects/relist/backups/relist-20260424-072905.json --user-id user_xxx --replace`;
}

async function printUserCandidates() {
  const rows = await sql`
    SELECT user_id, count(*)::int AS items
    FROM items WHERE is_sample = false
    GROUP BY user_id ORDER BY items DESC
  `;
  if (rows.length === 0) {
    console.error("  (no users with non-sample items yet)");
  } else {
    console.table(rows);
  }
}
