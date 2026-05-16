import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";

config({ path: ".env.local", quiet: true });
const sql = neon(process.env.DATABASE_URL);

console.log("=== price_data — rows per user ===");
const pd = await sql`
  SELECT user_id, count(*)::int AS n,
         array_agg(title ORDER BY observed_at) AS titles
  FROM price_data GROUP BY user_id
`;
console.table(pd.map(r => ({ user_id: r.user_id, count: r.n, titles: r.titles.join(", ") })));

console.log("\n=== items — rows per user ===");
const it = await sql`
  SELECT user_id, count(*)::int AS n,
         array_agg(name ORDER BY created_at) AS names
  FROM items GROUP BY user_id
`;
console.table(it.map(r => ({ user_id: r.user_id, count: r.n, names: r.names.join(", ") })));

console.log("\n=== api_keys — keys per user (active only) ===");
const ak = await sql`
  SELECT user_id, count(*)::int AS active_keys
  FROM api_keys WHERE revoked_at IS NULL GROUP BY user_id
`;
console.table(ak);

console.log("\n=== Isolation check: any row with NULL user_id? ===");
for (const t of ["price_data", "price_stats", "items", "transactions", "expenses", "api_keys", "user_settings"]) {
  const r = await sql.query(`SELECT count(*)::int AS n FROM "${t}" WHERE user_id IS NULL`);
  console.log(`  ${t}: ${r[0].n} null-user rows`);
}
