import {
  pgTable,
  text,
  integer,
  doublePrecision,
  numeric,
  timestamp,
  boolean,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

/**
 * Tenancy invariant: every row belongs to one Clerk user.
 * Indexes lead with userId so all reads are user-scoped.
 */

export const priceData = pgTable(
  "price_data",
  {
    id: text("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: text("user_id").notNull(),
    source: text("source").notNull(), // "vinted", etc.
    externalId: text("external_id"),
    title: text("title").notNull(),
    brand: text("brand"),
    category: text("category"),
    size: text("size"),
    condition: text("condition"),
    priceMinor: integer("price_minor").notNull(), // cents/pence
    currency: text("currency").notNull().default("GBP"),
    url: text("url"),
    rawPayload: text("raw_payload"), // JSON blob from extension
    observedAt: timestamp("observed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("price_data_user_observed_idx").on(t.userId, t.observedAt),
    index("price_data_user_brand_idx").on(t.userId, t.brand),
    uniqueIndex("price_data_user_source_external_idx").on(
      t.userId,
      t.source,
      t.externalId,
    ),
  ],
);

export const priceStats = pgTable(
  "price_stats",
  {
    id: text("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: text("user_id").notNull(),
    bucketKey: text("bucket_key").notNull(), // e.g. "brand:Nike|category:tops"
    sampleSize: integer("sample_size").notNull(),
    medianMinor: integer("median_minor").notNull(),
    p25Minor: integer("p25_minor").notNull(),
    p75Minor: integer("p75_minor").notNull(),
    meanMinor: doublePrecision("mean_minor").notNull(),
    currency: text("currency").notNull().default("GBP"),
    computedAt: timestamp("computed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("price_stats_user_bucket_idx").on(t.userId, t.bucketKey),
  ],
);

export const items = pgTable(
  "items",
  {
    id: text("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: text("user_id").notNull(),
    name: text("name").notNull(),
    brand: text("brand"),
    category: text("category"),
    condition: text("condition"), // new | like_new | good | fair
    size: text("size"),
    costPrice: numeric("cost_price", { precision: 10, scale: 2 }),
    listedPrice: numeric("listed_price", { precision: 10, scale: 2 }),
    soldPrice: numeric("sold_price", { precision: 10, scale: 2 }),
    status: text("status").notNull().default("sourced"), // sourced | listed | sold | shipped
    platform: text("platform").default("vinted"),
    photoUrls: text("photo_urls").array(),
    thumbnailUrl: text("thumbnail_url"),
    description: text("description"),
    sourceType: text("source_type"),
    sourceLocation: text("source_location"),
    vintedUrl: text("vinted_url"),
    listedAt: timestamp("listed_at", { withTimezone: true }),
    soldAt: timestamp("sold_at", { withTimezone: true }),
    buyerPaidShipping: boolean("buyer_paid_shipping").default(true),
    shippedAt: timestamp("shipped_at", { withTimezone: true }),
    lastEditedAt: timestamp("last_edited_at", { withTimezone: true }),
    relistCount: integer("relist_count").notNull().default(0),
    isSample: boolean("is_sample").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("items_user_status_idx").on(t.userId, t.status),
    index("items_user_sample_idx").on(t.userId, t.isSample),
    index("items_user_brand_idx").on(t.userId, t.brand),
    index("items_user_category_idx").on(t.userId, t.category),
    index("items_user_created_idx").on(t.userId, t.createdAt),
    index("items_user_listed_idx").on(t.userId, t.listedAt),
    index("items_user_sold_idx").on(t.userId, t.soldAt),
  ],
);

export const transactions = pgTable(
  "transactions",
  {
    id: text("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: text("user_id").notNull(),
    itemId: text("item_id")
      .notNull()
      .references(() => items.id, { onDelete: "cascade" }),
    transactionType: text("transaction_type").notNull(), // buy | sell
    grossPrice: numeric("gross_price", { precision: 10, scale: 2 }),
    shippingCost: numeric("shipping_cost", { precision: 10, scale: 2 })
      .notNull()
      .default("0"),
    platformFees: numeric("platform_fees", { precision: 10, scale: 2 })
      .notNull()
      .default("0"),
    profit: numeric("profit", { precision: 10, scale: 2 }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    isSample: boolean("is_sample").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("transactions_user_item_idx").on(t.userId, t.itemId),
    index("transactions_user_completed_idx").on(t.userId, t.completedAt),
    index("transactions_user_sample_idx").on(t.userId, t.isSample),
  ],
);

export const expenses = pgTable(
  "expenses",
  {
    id: text("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: text("user_id").notNull(),
    category: text("category").notNull(), // shipping_supplies | packaging | promotion | platform_fee | other
    description: text("description"),
    amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
    itemId: text("item_id"), // FK added when items table lands; same-user enforced via userScope
    incurredAt: timestamp("incurred_at", { withTimezone: true }).notNull(),
    isSample: boolean("is_sample").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("expenses_user_incurred_idx").on(t.userId, t.incurredAt),
    index("expenses_user_category_idx").on(t.userId, t.category),
    index("expenses_user_sample_idx").on(t.userId, t.isSample),
  ],
);

export const apiKeys = pgTable(
  "api_keys",
  {
    id: text("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: text("user_id").notNull(),
    name: text("name").notNull(),
    tokenHash: text("token_hash").notNull().unique(), // sha256 hex of raw token
    tokenPrefix: text("token_prefix").notNull(), // first 8 chars for UI display
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (t) => [index("api_keys_user_idx").on(t.userId)],
);

export const userSettings = pgTable(
  "user_settings",
  {
    id: text("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: text("user_id").notNull(),
    key: text("key").notNull(),
    value: text("value").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("user_settings_user_key_idx").on(t.userId, t.key),
  ],
);
