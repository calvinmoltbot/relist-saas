import { and, eq, isNotNull, gte, or, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { items } from "@/db/schema";
import { computeCadence, type CadenceResult } from "@/lib/inventory/cadence";
import { scoreItem, summarise, type CompletenessSummary } from "@/lib/inventory/completeness";
import { getTargets } from "@/lib/settings";

const num = (s: string | null | undefined) => (s ? parseFloat(s) : 0);

export type HealthReport = Awaited<ReturnType<typeof computeHealth>>;

export async function computeHealth(userId: string) {
  const now = new Date();
  const fourWeeksAgo = new Date(now);
  fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 35);
  const { weeklyListingsTarget, refreshSuggestedDays } = await getTargets(userId);

  // Pull the active inventory (listed + sourced) plus recent listed timestamps
  // for cadence. One round-trip via union of conditions keeps this cheap.
  const allRelevant = await db
    .select({
      id: items.id,
      name: items.name,
      brand: items.brand,
      category: items.category,
      size: items.size,
      description: items.description,
      vintedUrl: items.vintedUrl,
      status: items.status,
      costPrice: items.costPrice,
      listedPrice: items.listedPrice,
      listedAt: items.listedAt,
      lastEditedAt: items.lastEditedAt,
      createdAt: items.createdAt,
      photoCount: sql<number>`COALESCE(array_length(${items.photoUrls}, 1), 0)`.as("photo_count"),
    })
    .from(items)
    .where(
      and(
        eq(items.userId, userId),
        or(
          eq(items.status, "listed"),
          eq(items.status, "sourced"),
          and(isNotNull(items.listedAt), gte(items.listedAt, fourWeeksAgo)),
        )!,
      ),
    );

  // Cadence — last 4 weeks of listing activity
  const recentListedAts = allRelevant
    .map((r) => r.listedAt)
    .filter((d): d is Date => d != null && d.getTime() >= fourWeeksAgo.getTime());
  const cadence: CadenceResult = computeCadence(
    recentListedAts,
    weeklyListingsTarget,
    now,
  );

  // Active inventory = listed + sourced
  const active = allRelevant.filter(
    (r) => r.status === "listed" || r.status === "sourced",
  );
  const listed = active.filter((r) => r.status === "listed");

  // Completeness — score every active row
  const completeness: CompletenessSummary = summarise(
    active.map((r) => ({
      id: r.id,
      name: r.name,
      brand: r.brand,
      category: r.category,
      size: r.size,
      description: r.description,
      photoCount: r.photoCount,
      vintedUrl: r.vintedUrl,
    })),
    5,
  );

  // Aging buckets + dead stock + stockAtRisk
  const buckets = { "0-3": 0, "4-7": 0, "8-14": 0, "15-21": 0, "22+": 0 };
  const bucketValues = { "0-3": 0, "4-7": 0, "8-14": 0, "15-21": 0, "22+": 0 };
  let stockAtRisk = 0;
  const deadStock: Array<{
    id: string;
    name: string;
    brand: string | null;
    listedPrice: number;
    daysListed: number;
  }> = [];
  for (const r of active) {
    const ref = r.listedAt ?? r.createdAt;
    const days = Math.max(
      0,
      Math.floor((now.getTime() - ref.getTime()) / 86_400_000),
    );
    const value = num(r.listedPrice) || num(r.costPrice);
    const bucket: keyof typeof buckets =
      days <= 3 ? "0-3"
      : days <= 7 ? "4-7"
      : days <= 14 ? "8-14"
      : days <= 21 ? "15-21"
      : "22+";
    buckets[bucket] += 1;
    bucketValues[bucket] += value;
    if (days >= 15) stockAtRisk += value;
    if (days >= refreshSuggestedDays && r.status === "listed") {
      deadStock.push({
        id: r.id,
        name: r.name,
        brand: r.brand,
        listedPrice: num(r.listedPrice),
        daysListed: days,
      });
    }
  }
  deadStock.sort((a, b) => b.daysListed - a.daysListed);

  // Needs-refresh — listed items ranked by daysSinceEdit × completenessGap × price
  const needsRefresh = listed.map((r) => {
    const refAt = r.lastEditedAt ?? r.listedAt ?? r.createdAt;
    const daysSinceEdit = Math.max(
      1,
      Math.floor((now.getTime() - refAt.getTime()) / 86_400_000),
    );
    const { score } = scoreItem({
      name: r.name,
      brand: r.brand,
      category: r.category,
      size: r.size,
      description: r.description,
      photoCount: r.photoCount,
      vintedUrl: r.vintedUrl,
    });
    const gap = Math.max(0.2, (100 - score) / 100);
    const price = Math.max(1, num(r.listedPrice));
    return {
      itemId: r.id,
      name: r.name,
      brand: r.brand,
      listedPrice: num(r.listedPrice),
      daysSinceEdit,
      score,
      priority: Math.round(daysSinceEdit * gap * price * 100) / 100,
    };
  });
  needsRefresh.sort((a, b) => b.priority - a.priority);

  // Portfolio mix by category
  const categoryGroups = new Map<string, { count: number; value: number }>();
  for (const r of active) {
    const k = r.category?.trim() || "—";
    const cur = categoryGroups.get(k) ?? { count: 0, value: 0 };
    cur.count += 1;
    cur.value += num(r.listedPrice) || num(r.costPrice);
    categoryGroups.set(k, cur);
  }
  const totalCount = active.length;
  const categoryMix = Array.from(categoryGroups, ([key, v]) => ({
    key,
    count: v.count,
    valueTiedUp: Math.round(v.value * 100) / 100,
    pctOfCount: totalCount ? (v.count / totalCount) * 100 : 0,
  })).sort((a, b) => b.count - a.count);

  return {
    cadence,
    completeness,
    aging: {
      buckets,
      bucketValues: Object.fromEntries(
        Object.entries(bucketValues).map(([k, v]) => [k, Math.round(v * 100) / 100]),
      ) as typeof bucketValues,
      totalUnsold: active.length,
      stockAtRisk: Math.round(stockAtRisk * 100) / 100,
    },
    deadStock,
    needsRefresh: needsRefresh.slice(0, 10),
    categoryMix,
  };
}
