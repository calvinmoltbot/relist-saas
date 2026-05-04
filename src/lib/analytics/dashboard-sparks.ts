import { and, eq, gte } from "drizzle-orm";
import { db } from "@/db/client";
import { items } from "@/db/schema";

const DAYS = 30;

const num = (s: string | null | undefined) => (s ? parseFloat(s) : 0);

/**
 * Compute small daily series for the dashboard tile sparklines:
 *   revenue   — sum of soldPrice on days items were sold (last 30d)
 *   profit    — soldPrice minus costPrice on those same days
 *   listed    — running count of items in `listed` status by listedAt date
 *   sourced   — running count of items in `sourced` status by createdAt date
 */
export async function computeDashboardSparks(userId: string) {
  const since = new Date();
  since.setDate(since.getDate() - DAYS);

  const rows = await db
    .select({
      status: items.status,
      costPrice: items.costPrice,
      soldPrice: items.soldPrice,
      listedAt: items.listedAt,
      soldAt: items.soldAt,
      createdAt: items.createdAt,
    })
    .from(items)
    .where(and(eq(items.userId, userId), gte(items.createdAt, since)));

  const revenue = new Array(DAYS).fill(0) as number[];
  const profit = new Array(DAYS).fill(0) as number[];
  const listed = new Array(DAYS).fill(0) as number[];
  const sourced = new Array(DAYS).fill(0) as number[];

  const todayMidnight = new Date();
  todayMidnight.setHours(0, 0, 0, 0);
  const dayIndex = (d: Date | null) => {
    if (!d) return -1;
    const days = Math.floor((todayMidnight.getTime() - new Date(d).setHours(0, 0, 0, 0)) / 86400000);
    const i = DAYS - 1 - days;
    return i >= 0 && i < DAYS ? i : -1;
  };

  for (const r of rows) {
    if (r.status === "sold" || r.status === "shipped") {
      const i = dayIndex(r.soldAt);
      if (i >= 0) {
        const sold = num(r.soldPrice);
        const cost = num(r.costPrice);
        revenue[i] += sold;
        profit[i] += sold - cost;
      }
    }
    if (r.status === "listed") {
      const i = dayIndex(r.listedAt);
      if (i >= 0) listed[i] += 1;
    }
    if (r.status === "sourced") {
      const i = dayIndex(r.createdAt);
      if (i >= 0) sourced[i] += 1;
    }
  }

  return { revenue, profit, listed, sourced };
}
