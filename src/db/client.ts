import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

const url = process.env.DATABASE_URL;
if (!url) {
  // Don't throw at import time during build; throw on first use.
  console.warn("[db] DATABASE_URL is not set");
}

const sql = neon(url ?? "");
export const db = drizzle(sql, { schema, casing: "snake_case" });
export { schema };
