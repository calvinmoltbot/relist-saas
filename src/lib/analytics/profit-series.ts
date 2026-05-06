import { and, eq, gte, lte, inArray, or } from "drizzle-orm";
import { db } from "@/db/client";
import { items, transactions, expenses, type AcquisitionType } from "@/db/schema";
import type { DateRange } from "@/lib/date-range";
import { coerceMoney } from "@/lib/money";
import { withUserItemsCache } from "./cache";

const num = coerceMoney;

export type ProfitSeriesPoint = {
  /** ISO yyyy-mm-dd */
  date: string;
  /** ms-epoch for chart x-axis math */
  t: number;
  revenue: number;
  cost: number;
  shipping: number;
  expenses: number;
  netProfit: number;
};

const DAY_MS = 86400000;

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

/**
 * Build a daily revenue/cost/profit series across the resolved range.
 * If the range is open-ended, we clamp to the first sale -> today (or
 * last 90 days if no sales yet) so the chart has a sensible domain.
 *
 * User-scoped: we filter by userId on every table read.
 */
async function _computeProfitSeries(
  userId: string,
  range: DateRange,
  acquisitionType?: AcquisitionType,
): Promise<ProfitSeriesPoint[]> {
  // Only sold/shipped rows contribute to the series. Filter in SQL so we
  // never load listed/sourced rows for /profit charts.
  const conds = [
    eq(items.userId, userId),
    or(eq(items.status, "sold"), eq(items.status, "shipped"))!,
  ];
  if (acquisitionType) conds.push(eq(items.acquisitionType, acquisitionType));
  if (range.from) conds.push(gte(items.soldAt, range.from));
  if (range.to) conds.push(lte(items.soldAt, range.to));
  const sold = await db
    .select({
      id: items.id,
      costPrice: items.costPrice,
      soldPrice: items.soldPrice,
      soldAt: items.soldAt,
      status: items.status,
    })
    .from(items)
    .where(and(...conds));

  // Clamp range
  const soldDates = sold
    .filter((i) => (i.status === "sold" || i.status === "shipped") && i.soldAt)
    .map((i) => startOfDay(i.soldAt as Date).getTime());

  let from = range.from ? startOfDay(range.from) : null;
  let to = range.to ? startOfDay(range.to) : null;

  if (!from) {
    const earliest = soldDates.length ? Math.min(...soldDates) : Date.now() - 89 * DAY_MS;
    from = startOfDay(new Date(earliest));
  }
  if (!to) {
    to = startOfDay(new Date());
  }
  if (to < from) return [];

  const days = Math.floor((to.getTime() - from.getTime()) / DAY_MS) + 1;
  const points: ProfitSeriesPoint[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(from.getTime() + i * DAY_MS);
    points.push({
      date: d.toISOString().slice(0, 10),
      t: d.getTime(),
      revenue: 0,
      cost: 0,
      shipping: 0,
      expenses: 0,
      netProfit: 0,
    });
  }
  const idxFor = (d: Date) => {
    const day = startOfDay(d).getTime();
    const i = Math.floor((day - from!.getTime()) / DAY_MS);
    return i >= 0 && i < points.length ? i : -1;
  };

  // Item-level sale data. Status + soldAt are already filtered in SQL above.
  const itemBy: Record<string, { idx: number; cost: number; sold: number }> = {};
  for (const it of sold) {
    if (!it.soldAt) continue;
    const i = idxFor(it.soldAt as Date);
    if (i < 0) continue;
    const s = num(it.soldPrice);
    const c = num(it.costPrice);
    points[i].revenue += s;
    points[i].cost += c;
    itemBy[it.id] = { idx: i, cost: c, sold: s };
  }

  // Transactions for shipping — scope to the in-window item IDs so we don't
  // pull every historical sell transaction for the user.
  const itemIds = Object.keys(itemBy);
  if (itemIds.length) {
    const txns = await db
      .select({
        itemId: transactions.itemId,
        shippingCost: transactions.shippingCost,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          eq(transactions.transactionType, "sell"),
          inArray(transactions.itemId, itemIds),
        ),
      );
    for (const t of txns) {
      const ref = itemBy[t.itemId];
      if (!ref) continue;
      points[ref.idx].shipping += num(t.shippingCost);
    }
  }

  // Business expenses in window
  const expConds = [eq(expenses.userId, userId), gte(expenses.incurredAt, from), lte(expenses.incurredAt, to)];
  const exps = await db
    .select({ amount: expenses.amount, incurredAt: expenses.incurredAt })
    .from(expenses)
    .where(and(...expConds));
  for (const e of exps) {
    const i = idxFor(e.incurredAt as Date);
    if (i < 0) continue;
    points[i].expenses += num(e.amount);
  }

  for (const p of points) {
    p.netProfit = p.revenue - p.cost - p.shipping - p.expenses;
  }

  return points;
}

export const computeProfitSeries = withUserItemsCache(_computeProfitSeries, "profit-series");
