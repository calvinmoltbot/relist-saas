import { and, asc, count, desc, eq, gte, ilike, inArray, lte, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db/client";
import {
  priceData,
  priceStats,
  apiKeys,
  expenses,
  items,
  transactions,
  userSettings,
} from "@/db/schema";

type NewPriceData = typeof priceData.$inferInsert;
type NewApiKey = typeof apiKeys.$inferInsert;
type NewExpense = typeof expenses.$inferInsert;
type NewItem = typeof items.$inferInsert;
type NewTransaction = typeof transactions.$inferInsert;
type ItemUpdate = Partial<typeof items.$inferInsert>;

/** Slim column set for dedup lookups — everything except the photo blobs.
 *  Selecting `photo_urls` here would pull every item's base64 array (~150KB
 *  each) just to check whether it's empty in the dedup branch below.
 *  We expose `hasPhotos` as a boolean derived in SQL instead. */
const FIND_ITEM_COLS = {
  id: items.id,
  userId: items.userId,
  name: items.name,
  brand: items.brand,
  category: items.category,
  condition: items.condition,
  size: items.size,
  costPrice: items.costPrice,
  listedPrice: items.listedPrice,
  soldPrice: items.soldPrice,
  status: items.status,
  description: items.description,
  vintedUrl: items.vintedUrl,
  thumbnailUrl: items.thumbnailUrl,
  hasPhotos: sql<boolean>`COALESCE(array_length(${items.photoUrls}, 1), 0) > 0`.as("has_photos"),
} as const;

export type InventoryFilters = {
  status?: string | null;
  search?: string | null;
  sort?: "date" | "price" | "brand" | null;
  incompleteOnly?: boolean;
  /** 1-based page number for pagination. Default: 1. */
  page?: number;
  /** Page size. Default: 25. Pass 0 to disable LIMIT (used by backups). */
  pageSize?: number;
};

/**
 * All user-facing DB access goes through here. Routes call userScope(userId)
 * and must never use the bare `db` import.
 */
export function userScope(userId: string) {
  return {
    listPriceData: (limit = 100) =>
      db
        .select()
        .from(priceData)
        .where(eq(priceData.userId, userId))
        .orderBy(desc(priceData.observedAt))
        .limit(limit),

    insertPriceData: (data: Omit<NewPriceData, "userId">) =>
      db
        .insert(priceData)
        .values({ ...data, userId })
        .onConflictDoNothing({
          target: [priceData.userId, priceData.source, priceData.externalId],
        })
        .returning(),

    listPriceStats: () =>
      db.select().from(priceStats).where(eq(priceStats.userId, userId)),

    listApiKeys: () =>
      db
        .select({
          id: apiKeys.id,
          name: apiKeys.name,
          tokenPrefix: apiKeys.tokenPrefix,
          createdAt: apiKeys.createdAt,
          lastUsedAt: apiKeys.lastUsedAt,
          revokedAt: apiKeys.revokedAt,
        })
        .from(apiKeys)
        .where(eq(apiKeys.userId, userId))
        .orderBy(desc(apiKeys.createdAt)),

    insertApiKey: (data: Omit<NewApiKey, "userId">) =>
      db
        .insert(apiKeys)
        .values({ ...data, userId })
        .returning(),

    revokeApiKey: (id: string) =>
      db
        .update(apiKeys)
        .set({ revokedAt: new Date() })
        .where(and(eq(apiKeys.userId, userId), eq(apiKeys.id, id)))
        .returning(),

    purgeApiKey: (id: string) =>
      db
        .delete(apiKeys)
        .where(and(eq(apiKeys.userId, userId), eq(apiKeys.id, id)))
        .returning({ id: apiKeys.id }),

    listExpenses: ({ from, to }: { from?: Date | null; to?: Date | null } = {}) => {
      const conds: SQL[] = [eq(expenses.userId, userId)];
      if (from) conds.push(gte(expenses.incurredAt, from));
      if (to) conds.push(lte(expenses.incurredAt, to));
      return db
        .select()
        .from(expenses)
        .where(and(...conds))
        .orderBy(desc(expenses.incurredAt));
    },

    insertExpense: (data: Omit<NewExpense, "userId">) =>
      db.insert(expenses).values({ ...data, userId }).returning(),

    deleteExpense: (id: string) =>
      db
        .delete(expenses)
        .where(and(eq(expenses.userId, userId), eq(expenses.id, id)))
        .returning({ id: expenses.id }),

    listItems: async ({
      status,
      search,
      sort,
      incompleteOnly,
      page = 1,
      pageSize = 25,
    }: InventoryFilters = {}) => {
      const conds: SQL[] = [eq(items.userId, userId)];
      if (status) conds.push(eq(items.status, status));
      if (search) {
        const like = `%${search}%`;
        const cond = or(
          ilike(items.name, like),
          ilike(items.brand, like),
          ilike(items.category, like),
        );
        if (cond) conds.push(cond);
      }
      const orderBy =
        sort === "price"
          ? desc(items.listedPrice)
          : sort === "brand"
            ? asc(items.brand)
            : desc(items.createdAt);

      const cols = {
        id: items.id,
        userId: items.userId,
        name: items.name,
        brand: items.brand,
        category: items.category,
        condition: items.condition,
        size: items.size,
        costPrice: items.costPrice,
        listedPrice: items.listedPrice,
        soldPrice: items.soldPrice,
        status: items.status,
        platform: items.platform,
        hasThumbnail: sql<boolean>`${items.thumbnailUrl} IS NOT NULL`.as("has_thumbnail"),
        thumbnailUrl: items.thumbnailUrl,
        description: items.description,
        sourceType: items.sourceType,
        sourceLocation: items.sourceLocation,
        vintedUrl: items.vintedUrl,
        photoCount: sql<number>`COALESCE(array_length(${items.photoUrls}, 1), 0)`.as("photo_count"),
        listedAt: items.listedAt,
        soldAt: items.soldAt,
        buyerPaidShipping: items.buyerPaidShipping,
        shippedAt: items.shippedAt,
        lastEditedAt: items.lastEditedAt,
        relistCount: items.relistCount,
        createdAt: items.createdAt,
        updatedAt: items.updatedAt,
        isSample: items.isSample,
      };

      // incompleteOnly post-filters using the same scoring rules as the Health
      // page — i.e. any of the seven completeness fields below target. Skips
      // SQL pagination and lets the page render the slice.
      if (incompleteOnly) {
        const { scoreItem } = await import("@/lib/inventory/completeness");
        const all = await db
          .select(cols)
          .from(items)
          .where(and(...conds))
          .orderBy(orderBy);
        const filtered = all.filter((r) => {
          const { score } = scoreItem({
            name: r.name,
            brand: r.brand,
            category: r.category,
            size: r.size,
            description: r.description,
            photoCount: Number(r.photoCount ?? 0),
            vintedUrl: r.vintedUrl,
          });
          return score < 100;
        });
        return {
          rows: filtered,
          total: filtered.length,
          page: 1,
          pageSize: filtered.length,
          pageCount: 1,
        };
      }

      const [{ n }] = await db
        .select({ n: count() })
        .from(items)
        .where(and(...conds));
      const total = Number(n ?? 0);

      const safePage = Math.max(1, Math.floor(page));
      const safeSize = pageSize > 0 ? Math.max(1, Math.floor(pageSize)) : total || 1;
      const offset = (safePage - 1) * safeSize;
      const pageCount = Math.max(1, Math.ceil(total / safeSize));

      const query = db
        .select(cols)
        .from(items)
        .where(and(...conds))
        .orderBy(orderBy);

      const rows = pageSize > 0
        ? await query.limit(safeSize).offset(offset)
        : await query;

      return { rows, total, page: safePage, pageSize: safeSize, pageCount };
    },

    countItems: async () => {
      const [row] = await db
        .select({ n: count() })
        .from(items)
        .where(eq(items.userId, userId));
      return Number(row?.n ?? 0);
    },

    getItem: async (id: string) => {
      const [row] = await db
        .select()
        .from(items)
        .where(and(eq(items.userId, userId), eq(items.id, id)))
        .limit(1);
      return row ?? null;
    },

    findItemByVintedUrl: async (url: string) => {
      const [row] = await db
        .select(FIND_ITEM_COLS)
        .from(items)
        .where(and(eq(items.userId, userId), eq(items.vintedUrl, url)))
        .limit(1);
      return row ?? null;
    },

    findItemByName: async (name: string) => {
      const [row] = await db
        .select(FIND_ITEM_COLS)
        .from(items)
        .where(and(eq(items.userId, userId), ilike(items.name, name.trim())))
        .limit(1);
      return row ?? null;
    },

    insertItem: (data: Omit<NewItem, "userId">) =>
      db.insert(items).values({ ...data, userId }).returning(),

    updateItem: (id: string, data: ItemUpdate) =>
      db
        .update(items)
        .set({ ...data, updatedAt: new Date() })
        .where(and(eq(items.userId, userId), eq(items.id, id)))
        .returning(),

    deleteItem: (id: string) =>
      db
        .delete(items)
        .where(and(eq(items.userId, userId), eq(items.id, id)))
        .returning({ id: items.id }),

    setItemPhotos: (id: string, photoUrls: string[], thumbnailUrl: string | null) =>
      db
        .update(items)
        .set({ photoUrls, thumbnailUrl, updatedAt: new Date() })
        .where(and(eq(items.userId, userId), eq(items.id, id)))
        .returning(),

    getItemThumbnail: async (id: string) => {
      const [row] = await db
        .select({ thumbnailUrl: items.thumbnailUrl })
        .from(items)
        .where(and(eq(items.userId, userId), eq(items.id, id)))
        .limit(1);
      return row?.thumbnailUrl ?? null;
    },

    /** Return a Map<id, name> in one round-trip. Used by analytics views
     *  that compute aggregates by id but want to render a human label. */
    getItemNamesByIds: async (ids: string[]) => {
      const out = new Map<string, string>();
      if (ids.length === 0) return out;
      const rows = await db
        .select({ id: items.id, name: items.name })
        .from(items)
        .where(and(eq(items.userId, userId), inArray(items.id, ids)));
      for (const r of rows) out.set(r.id, r.name);
      return out;
    },

    /** Return a Map<id, { hasThumbnail, thumbnailUrl }> in one round-trip. */
    getItemHasThumbnailMap: async (ids: string[]) => {
      const out = new Map<
        string,
        { hasThumbnail: boolean; thumbnailUrl: string | null }
      >();
      if (ids.length === 0) return out;
      const rows = await db
        .select({
          id: items.id,
          hasThumbnail: sql<boolean>`${items.thumbnailUrl} IS NOT NULL`.as("has_thumbnail"),
          thumbnailUrl: items.thumbnailUrl,
        })
        .from(items)
        .where(and(eq(items.userId, userId), inArray(items.id, ids)));
      for (const r of rows) {
        out.set(r.id, {
          hasThumbnail: !!r.hasThumbnail,
          thumbnailUrl: r.thumbnailUrl ?? null,
        });
      }
      return out;
    },

    insertTransaction: (data: Omit<NewTransaction, "userId">) =>
      db.insert(transactions).values({ ...data, userId }).returning(),

    listTransactionsForItem: (itemId: string) =>
      db
        .select()
        .from(transactions)
        .where(and(eq(transactions.userId, userId), eq(transactions.itemId, itemId)))
        .orderBy(desc(transactions.createdAt)),

    listUserSettings: () =>
      db
        .select({ key: userSettings.key, value: userSettings.value })
        .from(userSettings)
        .where(eq(userSettings.userId, userId)),

    setUserSetting: (key: string, value: string) =>
      db
        .insert(userSettings)
        .values({ userId, key, value })
        .onConflictDoUpdate({
          target: [userSettings.userId, userSettings.key],
          set: { value, updatedAt: new Date() },
        })
        .returning(),
  };
}
