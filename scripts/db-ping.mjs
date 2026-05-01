// Quick connectivity + schema check. Run: node scripts/db-ping.mjs
import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";

config({ path: ".env.local", quiet: true });

const sql = neon(process.env.DATABASE_URL);
const tables = await sql`
  SELECT table_name FROM information_schema.tables
  WHERE table_schema = 'public'
  ORDER BY table_name
`;
console.log("Tables:", tables.map((t) => t.table_name).join(", "));

const counts = {};
for (const { table_name } of tables) {
  if (table_name.startsWith("__")) continue;
  const [{ count }] = await sql`SELECT COUNT(*)::int AS count FROM ${sql.unsafe(`"${table_name}"`)}`;
  counts[table_name] = count;
}
console.log("Row counts:", counts);
