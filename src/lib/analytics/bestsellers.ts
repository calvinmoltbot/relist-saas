import { and, eq, inArray, or } from "drizzle-orm";
import { db } from "@/db/client";
import { items, transactions, type AcquisitionType } from "@/db/schema";
import type { DateRange } from "@/lib/date-range";
import { coerceMoney } from "@/lib/money";

export const MIN_GROUP_SIZE = 2;

export type Dimension = "brand" | "category" | "sourceType" | "condition" | "size";

export interface ItemStat {
  id: string;
  name: string;
  brand: string | null;
  category: string | null;
  daysToSell: number;
  soldPrice: number;
  netProfit: number;
  marginPct: number;
}

export interface GroupStat {
  key: string;
  count: number;
  medianDaysToSell: number;
  medianProfit: number;
  medianMarginPct: number;
  meanSoldPrice: number;
  totalRevenue: number;
  fastestDays: number;
  slowestDays: number;
}

export type BestsellersReport = Awaited<ReturnType<typeof computeBestsellers>>;

const num = coerceMoney;

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

export async function computeBestsellers(
  userId: string,
  range: DateRange,
  acquisitionType?: AcquisitionType,
) {
  // Pull sold + shipped items in the user's scope; we filter by soldAt range
  // in JS so the schema's soldAt nullable case stays explicit.
  const conds = [
    eq(items.userId, userId),
    or(eq(items.status, "sold"), eq(items.status, "shipped"))!,
  ];
  if (acquisitionType) conds.push(eq(items.acquisitionType, acquisitionType));
  const rows = await db
    .select({
      id: items.id,
      name: items.name,
      brand: items.brand,
      category: items.category,
      sourceType: items.sourceType,
      condition: items.condition,
      size: items.size,
      costPrice: items.costPrice,
      soldPrice: items.soldPrice,
      listedAt: items.listedAt,
      soldAt: items.soldAt,
    })
    .from(items)
    .where(and(...conds));

  const inRange = rows.filter((r) => {
    if (!r.listedAt || !r.soldAt) return false;
    if (range.from && r.soldAt < range.from) return false;
    if (range.to && r.soldAt > range.to) return false;
    return true;
  });

  const ids = inRange.map((r) => r.id);
  const txns = ids.length
    ? await db
        .select({
          itemId: transactions.itemId,
          shippingCost: transactions.shippingCost,
        })
        .from(transactions)
        .where(
          and(
            eq(transactions.userId, userId),
            eq(transactions.transactionType, "sell"),
            inArray(transactions.itemId, ids),
          ),
        )
    : [];
  const txByItem = new Map(txns.map((t) => [t.itemId, t]));

  const itemStats: ItemStat[] = inRange.map((r) => {
    const cost = num(r.costPrice);
    const soldPrice = num(r.soldPrice);
    const tx = txByItem.get(r.id);
    const shipping = num(tx?.shippingCost);
    const netProfit = soldPrice - cost - shipping;
    const marginPct = soldPrice > 0 ? (netProfit / soldPrice) * 100 : 0;
    const days = Math.max(
      0,
      Math.round((r.soldAt!.getTime() - r.listedAt!.getTime()) / 86_400_000),
    );
    return {
      id: r.id,
      name: r.name,
      brand: r.brand,
      category: r.category,
      daysToSell: days,
      soldPrice,
      netProfit,
      marginPct,
    };
  });

  const rowById = new Map(inRange.map((r) => [r.id, r]));
  const dimensionKey: Record<Dimension, (id: string) => string | null> = {
    brand: (id) => rowById.get(id)?.brand ?? null,
    category: (id) => rowById.get(id)?.category ?? null,
    sourceType: (id) => rowById.get(id)?.sourceType ?? null,
    condition: (id) => rowById.get(id)?.condition ?? null,
    size: (id) => rowById.get(id)?.size ?? null,
  };

  const buildGroups = (key: (id: string) => string | null): GroupStat[] => {
    const buckets = new Map<string, ItemStat[]>();
    for (const s of itemStats) {
      const raw = key(s.id);
      const k = raw && raw.trim() ? raw : "uncategorised";
      const list = buckets.get(k) ?? [];
      list.push(s);
      buckets.set(k, list);
    }
    const out: GroupStat[] = [];
    for (const [k, list] of buckets) {
      if (list.length < MIN_GROUP_SIZE) continue;
      const days = list.map((b) => b.daysToSell);
      const totalRev = list.reduce((s, b) => s + b.soldPrice, 0);
      out.push({
        key: k,
        count: list.length,
        medianDaysToSell: median(days),
        medianProfit: median(list.map((b) => b.netProfit)),
        medianMarginPct: median(list.map((b) => b.marginPct)),
        meanSoldPrice: list.length ? totalRev / list.length : 0,
        totalRevenue: totalRev,
        fastestDays: Math.min(...days),
        slowestDays: Math.max(...days),
      });
    }
    return out.sort((a, b) => a.medianDaysToSell - b.medianDaysToSell);
  };

  const groups: Record<Dimension, GroupStat[]> = {
    brand: buildGroups(dimensionKey.brand),
    category: buildGroups(dimensionKey.category),
    sourceType: buildGroups(dimensionKey.sourceType),
    condition: buildGroups(dimensionKey.condition),
    size: buildGroups(dimensionKey.size),
  };

  const overallTotalRev = itemStats.reduce((s, b) => s + b.soldPrice, 0);
  const overall = {
    totalSold: itemStats.length,
    medianDaysToSell: median(itemStats.map((s) => s.daysToSell)),
    medianProfit: median(itemStats.map((s) => s.netProfit)),
    medianMarginPct: median(itemStats.map((s) => s.marginPct)),
    meanSoldPrice: itemStats.length ? overallTotalRev / itemStats.length : 0,
    fastestDays: itemStats.length
      ? Math.min(...itemStats.map((s) => s.daysToSell))
      : 0,
    totalRevenue: overallTotalRev,
  };

  const topFastest = [...itemStats]
    .sort((a, b) => a.daysToSell - b.daysToSell || b.netProfit - a.netProfit)
    .slice(0, 10);
  const topProfit = [...itemStats]
    .sort((a, b) => b.netProfit - a.netProfit)
    .slice(0, 10);

  return { overall, groups, topFastest, topProfit, minGroupSize: MIN_GROUP_SIZE };
}
