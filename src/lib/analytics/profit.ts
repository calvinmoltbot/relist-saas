import { and, eq, gte, lte, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import { items, transactions, expenses } from "@/db/schema";
import type { DateRange } from "@/lib/date-range";

const num = (s: string | null | undefined) => (s ? parseFloat(s) : 0);
const round = (n: number) => Math.round(n * 100) / 100;

export type ProfitReport = Awaited<ReturnType<typeof computeProfit>>;

/**
 * User-scoped profit aggregation. Mirrors the original profit route's headline
 * shape — summary, stock, comparisons, breakdowns — minus targets and the
 * inventory-health buckets (those land alongside user_settings/daily-plan).
 */
export async function computeProfit(userId: string, range: DateRange) {
  const allItems = await db
    .select({
      id: items.id,
      name: items.name,
      brand: items.brand,
      category: items.category,
      status: items.status,
      costPrice: items.costPrice,
      listedPrice: items.listedPrice,
      soldPrice: items.soldPrice,
      soldAt: items.soldAt,
      listedAt: items.listedAt,
      sourceType: items.sourceType,
    })
    .from(items)
    .where(eq(items.userId, userId));

  const hasFilter = range.from != null || range.to != null;
  const sold = allItems.filter((i) => {
    if (i.status !== "sold" && i.status !== "shipped") return false;
    if (hasFilter && !i.soldAt) return false;
    if (range.from && i.soldAt && i.soldAt < range.from) return false;
    if (range.to && i.soldAt && i.soldAt > range.to) return false;
    return true;
  });
  const listed = allItems.filter((i) => i.status === "listed");
  const sourced = allItems.filter((i) => i.status === "sourced");

  const soldIds = sold.map((i) => i.id);
  const txns = soldIds.length
    ? await db
        .select()
        .from(transactions)
        .where(
          and(
            eq(transactions.userId, userId),
            eq(transactions.transactionType, "sell"),
            inArray(transactions.itemId, soldIds),
          ),
        )
    : [];
  const txByItem = new Map(txns.map((t) => [t.itemId, t]));

  let revenue = 0;
  let cost = 0;
  let shipping = 0;
  let fees = 0;

  const byCategory = new Map<string, { revenue: number; profit: number; count: number }>();
  const bySource = new Map<string, { revenue: number; profit: number; count: number }>();
  const byMonth = new Map<string, { revenue: number; profit: number; count: number }>();
  const itemProfits: Array<{
    id: string;
    name: string;
    brand: string | null;
    sold: number;
    cost: number;
    netProfit: number;
    soldAt: string | null;
  }> = [];

  for (const it of sold) {
    const c = num(it.costPrice);
    const s = num(it.soldPrice);
    const tx = txByItem.get(it.id);
    const sh = num(tx?.shippingCost ?? null);
    const fe = num(tx?.platformFees ?? null);
    const net = s - c - sh - fe;

    revenue += s;
    cost += c;
    shipping += sh;
    fees += fe;

    const cat = it.category || "uncategorised";
    const src = it.sourceType || "unknown";
    const month = it.soldAt ? it.soldAt.toISOString().slice(0, 7) : "unknown";
    for (const [m, key] of [
      [byCategory, cat],
      [bySource, src],
      [byMonth, month],
    ] as const) {
      const cur = m.get(key) ?? { revenue: 0, profit: 0, count: 0 };
      cur.revenue += s;
      cur.profit += net;
      cur.count += 1;
      m.set(key, cur);
    }

    itemProfits.push({
      id: it.id,
      name: it.name,
      brand: it.brand,
      sold: s,
      cost: c,
      netProfit: net,
      soldAt: it.soldAt?.toISOString() ?? null,
    });
  }

  // Business expenses in range
  const expConds = [eq(expenses.userId, userId)];
  if (range.from) expConds.push(gte(expenses.incurredAt, range.from));
  if (range.to) expConds.push(lte(expenses.incurredAt, range.to));
  const exps = await db.select().from(expenses).where(and(...expConds));

  let totalExpenses = 0;
  const byExpenseCategory = new Map<string, number>();
  for (const e of exps) {
    const a = num(e.amount);
    totalExpenses += a;
    byExpenseCategory.set(e.category, (byExpenseCategory.get(e.category) ?? 0) + a);
  }

  const grossProfit = revenue - cost;
  const netProfit = grossProfit - shipping - fees - totalExpenses;

  // Always-current stock value (not date-filtered)
  let stockCost = 0;
  let stockListed = 0;
  for (const it of [...listed, ...sourced]) {
    stockCost += num(it.costPrice);
    stockListed += num(it.listedPrice);
  }

  const sellThrough =
    sold.length + listed.length > 0
      ? (sold.length / (sold.length + listed.length)) * 100
      : 0;

  return {
    summary: {
      revenue: round(revenue),
      cost: round(cost),
      grossProfit: round(grossProfit),
      netProfit: round(netProfit),
      shipping: round(shipping),
      fees: round(fees),
      totalExpenses: round(totalExpenses),
      itemsSold: sold.length,
      itemsListed: listed.length,
      itemsSourced: sourced.length,
      stockCost: round(stockCost),
      stockListedValue: round(stockListed),
      avgMargin: revenue > 0 ? round((netProfit / revenue) * 100) : 0,
      avgProfitPerItem: sold.length ? round(netProfit / sold.length) : 0,
      sellThroughRate: round(sellThrough),
    },
    itemProfits: itemProfits.sort((a, b) => b.netProfit - a.netProfit),
    byCategory: Array.from(byCategory, ([category, v]) => ({
      category,
      revenue: round(v.revenue),
      profit: round(v.profit),
      count: v.count,
    })).sort((a, b) => b.profit - a.profit),
    bySource: Array.from(bySource, ([source, v]) => ({
      source,
      revenue: round(v.revenue),
      profit: round(v.profit),
      count: v.count,
    })).sort((a, b) => b.profit - a.profit),
    byMonth: Array.from(byMonth, ([month, v]) => ({
      month,
      revenue: round(v.revenue),
      profit: round(v.profit),
      count: v.count,
    }))
      .filter((m) => m.month !== "unknown")
      .sort((a, b) => a.month.localeCompare(b.month)),
    byExpenseCategory: Array.from(byExpenseCategory, ([category, amount]) => ({
      category,
      amount: round(amount),
    })).sort((a, b) => b.amount - a.amount),
  };
}
