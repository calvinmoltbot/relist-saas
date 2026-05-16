import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import {
  computeBestsellers,
  type Dimension,
  type GroupStat,
  type ItemStat,
} from "@/lib/analytics/bestsellers";
import type { AcquisitionType } from "@/db/schema";
import { resolveDateRange } from "@/lib/date-range";
import {
  Card,
  CardHeader,
  PageHeader,
  SegmentedControl,
  Tile,
} from "@/components/ui";
import { PresetSelect } from "./PresetSelect";

const PRESETS = [
  { value: "this_month", label: "This month" },
  { value: "last_month", label: "Last month" },
  { value: "last_90_days", label: "Last 90 days" },
  { value: "this_year", label: "This year" },
  { value: "tax_year", label: "Tax year (UK)" },
  { value: "", label: "All time" },
];

const DIMENSIONS: { value: Dimension; label: string }[] = [
  { value: "category", label: "Category" },
  { value: "brand", label: "Brand" },
  { value: "sourceType", label: "Source" },
  { value: "condition", label: "Condition" },
  { value: "size", label: "Size" },
];

const SOURCE_LABELS: Record<string, string> = {
  charity_shop: "Charity shop",
  car_boot: "Car boot",
  online: "Online",
  other: "Other",
};

const CONDITION_LABELS: Record<string, string> = {
  new: "New",
  like_new: "Like new",
  good: "Good",
  fair: "Fair",
};

function prettifyKey(dimension: Dimension, key: string): string {
  if (key === "uncategorised") return "Uncategorised";
  if (dimension === "sourceType") return SOURCE_LABELS[key] ?? key;
  if (dimension === "condition") return CONDITION_LABELS[key] ?? key;
  return key;
}

function formatDays(days: number): string {
  if (days < 1) return "same day";
  if (days === 1) return "1 day";
  return `${Math.round(days)}d`;
}

const gbp = (n: number) => `£${n.toFixed(2)}`;
const gbp0 = (n: number) => `£${Math.round(n).toLocaleString("en-GB")}`;
const pct = (n: number) => `${Math.round(n)}%`;

type SortKey = "fastest" | "profit" | "margin";

const SORTS: { value: SortKey; label: string }[] = [
  { value: "fastest", label: "Fastest" },
  { value: "profit", label: "Profit" },
  { value: "margin", label: "Margin" },
];

type TypeFilter = "all" | "bought" | "own";
const TYPE_OPTIONS: { value: TypeFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "bought", label: "Bought" },
  { value: "own", label: "Own" },
];

function sortGroups(groups: GroupStat[], sort: SortKey): GroupStat[] {
  const copy = [...groups];
  if (sort === "fastest") return copy.sort((a, b) => a.medianDaysToSell - b.medianDaysToSell);
  if (sort === "profit") return copy.sort((a, b) => b.medianProfit - a.medianProfit);
  return copy.sort((a, b) => b.medianMarginPct - a.medianMarginPct);
}

function buildHref(params: {
  preset?: string;
  dim: Dimension;
  sort: SortKey;
  type: TypeFilter;
}): string {
  const sp = new URLSearchParams({ dim: params.dim, sort: params.sort });
  if (params.preset) sp.set("preset", params.preset);
  if (params.type !== "all") sp.set("type", params.type);
  return `/bestsellers?${sp.toString()}`;
}

export default async function BestsellersPage({
  searchParams,
}: {
  searchParams: Promise<{ preset?: string; dim?: string; sort?: string; type?: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/");

  const {
    preset = "",
    dim = "category",
    sort = "fastest",
    type = "all",
  } = await searchParams;
  const dimension: Dimension = (
    DIMENSIONS.map((d) => d.value).includes(dim as Dimension) ? dim : "category"
  ) as Dimension;
  const sortKey: SortKey = (
    SORTS.map((s) => s.value).includes(sort as SortKey) ? sort : "fastest"
  ) as SortKey;
  const typeFilter: TypeFilter = (
    TYPE_OPTIONS.map((o) => o.value).includes(type as TypeFilter)
      ? (type as TypeFilter)
      : "all"
  );
  const acquisitionFilter: AcquisitionType | undefined =
    typeFilter === "all" ? undefined : (typeFilter as AcquisitionType);

  const range = resolveDateRange(preset || null, null, null);
  const data = await computeBestsellers(userId, range, acquisitionFilter);
  const groups = sortGroups(data.groups[dimension], sortKey);
  const hasEnough = data.overall.totalSold >= data.minGroupSize;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Best sellers"
        subtitle="What's flying out the door — time-to-sell grouped by product attributes."
        actions={
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <SegmentedControl
              options={TYPE_OPTIONS}
              active={typeFilter}
              tone="brand"
              hrefFor={(v) =>
                buildHref({ preset, dim: dimension, sort: sortKey, type: v })
              }
            />
            <PresetSelect options={PRESETS} value={preset} />
          </div>
        }
      />

      {/* Overall tiles */}
      <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Tile
          tone="slate"
          icon={<span aria-hidden>#</span>}
          label="Sold items analysed"
          value={data.overall.totalSold.toString()}
        />
        <Tile
          tone="brand"
          icon={<span aria-hidden>⏱</span>}
          label="Median days to sell"
          value={data.overall.totalSold ? formatDays(data.overall.medianDaysToSell) : "—"}
          sub={
            data.overall.totalSold
              ? `Fastest ${formatDays(data.overall.fastestDays)}`
              : undefined
          }
        />
        <Tile
          tone="emerald"
          icon={<span aria-hidden>£</span>}
          label="Median profit"
          value={data.overall.totalSold ? gbp(data.overall.medianProfit) : "—"}
        />
        {typeFilter === "own" ? (
          <Tile
            tone="violet"
            icon={<span aria-hidden>£</span>}
            label="Mean sold for"
            value={data.overall.totalSold ? gbp(data.overall.meanSoldPrice) : "—"}
            sub={
              data.overall.totalSold
                ? `${gbp0(data.overall.totalRevenue)} revenue`
                : undefined
            }
          />
        ) : (
          <Tile
            tone="violet"
            icon={<span aria-hidden>%</span>}
            label="Median margin"
            value={data.overall.totalSold ? pct(data.overall.medianMarginPct) : "—"}
            sub={
              data.overall.totalSold
                ? `${gbp0(data.overall.totalRevenue)} revenue`
                : undefined
            }
          />
        )}
      </section>

      {!hasEnough ? (
        <Card>
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <p className="font-display text-xl font-semibold text-[var(--text-primary)]">
              Not enough sales yet
            </p>
            <p className="mt-2 max-w-md text-sm text-[var(--text-secondary)]">
              Best sellers needs at least {data.minGroupSize} sold items with a
              listed date before it can compare groups. Keep going — it will fill
              up fast.
            </p>
          </div>
        </Card>
      ) : (
        <>
          {/* Group breakdown */}
          <Card>
            <CardHeader
              title="Group breakdown"
              description={`Groups with fewer than ${data.minGroupSize} sales are hidden so one lucky sale doesn't skew the ranking.`}
            />
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <SegmentedControl
                label="Dimension"
                options={DIMENSIONS}
                active={dimension}
                tone="brand"
                hrefFor={(v) => buildHref({ preset, dim: v, sort: sortKey, type: typeFilter })}
              />
              <SegmentedControl
                label="Sort"
                options={SORTS}
                active={sortKey}
                tone="emerald"
                hrefFor={(v) => buildHref({ preset, dim: dimension, sort: v, type: typeFilter })}
              />
            </div>

            <div className="mt-5">
              <GroupTable
                dimension={dimension}
                groups={groups}
                hideMargin={typeFilter === "own"}
              />
            </div>
          </Card>

          {/* Hall of fame */}
          <section className="space-y-3">
            <h2 className="font-display text-xl font-semibold tracking-tight text-[var(--text-primary)]">
              Hall of fame
            </h2>
            <div className="grid gap-4 lg:grid-cols-2">
              <HallOfFame
                title="Fastest to sell"
                accent="brand"
                items={data.topFastest}
                valueLabel="days"
                format={(i) => formatDays(i.daysToSell)}
              />
              <HallOfFame
                title="Highest profit"
                accent="emerald"
                items={data.topProfit}
                valueLabel="profit"
                format={(i) => gbp(i.netProfit)}
              />
            </div>
          </section>
        </>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------- */
/* Group breakdown table                                                 */
/* -------------------------------------------------------------------- */

function marginBand(p: number): "good" | "watch" | "bad" {
  if (p >= 65) return "good";
  if (p >= 40) return "watch";
  return "bad";
}

const MARGIN_TONE: Record<"good" | "watch" | "bad", { bar: string; pill: string }> = {
  good: {
    bar: "bg-[var(--accent-emerald)]",
    pill: "bg-[var(--accent-emerald-soft)] text-[var(--accent-emerald-soft-fg)]",
  },
  watch: {
    bar: "bg-[var(--accent-amber)]",
    pill: "bg-[var(--accent-amber-soft)] text-[var(--accent-amber-soft-fg)]",
  },
  bad: {
    bar: "bg-[var(--accent-rose)]",
    pill: "bg-[var(--accent-rose-soft)] text-[var(--accent-rose-soft-fg)]",
  },
};

function GroupTable({
  dimension,
  groups,
  hideMargin,
}: {
  dimension: Dimension;
  groups: GroupStat[];
  hideMargin?: boolean;
}) {
  if (groups.length === 0) {
    return (
      <div className="rounded-[var(--radius-md)] border border-dashed border-[var(--border-default)] bg-[var(--surface-muted)] p-8 text-center text-sm text-[var(--text-muted)]">
        Not enough sales grouped by this attribute yet.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--border-subtle)] text-left text-[11px] uppercase tracking-wide text-[var(--text-muted)]">
            <th className="py-2 pr-3 font-medium">Group</th>
            <th className="py-2 pr-3 text-right font-medium">Sales</th>
            <th className="py-2 pr-3 text-right font-medium">Median days</th>
            <th className="py-2 pr-3 text-right font-medium">Range</th>
            <th className="py-2 pr-3 text-right font-medium">Median profit</th>
            {hideMargin ? (
              <th className="py-2 pr-3 text-right font-medium">Mean sold for</th>
            ) : (
              <th className="py-2 pr-3 font-medium">Margin</th>
            )}
            <th className="py-2 pr-3 text-right font-medium">Revenue</th>
          </tr>
        </thead>
        <tbody>
          {groups.map((g) => {
            const band = marginBand(g.medianMarginPct);
            const tone = MARGIN_TONE[band];
            const barWidth = Math.max(4, Math.min(100, g.medianMarginPct));
            return (
              <tr
                key={g.key}
                className="border-b border-[var(--border-subtle)] last:border-b-0 transition-colors hover:bg-[var(--surface-muted)]"
              >
                <td className="py-3 pr-3 font-medium text-[var(--text-primary)]">
                  {prettifyKey(dimension, g.key)}
                </td>
                <td className="py-3 pr-3 text-right tabular-nums text-[var(--text-secondary)]">
                  {g.count}
                </td>
                <td className="py-3 pr-3 text-right font-medium tabular-nums text-[var(--brand-soft-fg)]">
                  {formatDays(g.medianDaysToSell)}
                </td>
                <td className="py-3 pr-3 text-right text-xs tabular-nums text-[var(--text-muted)]">
                  {g.fastestDays}–{g.slowestDays}d
                </td>
                <td className="py-3 pr-3 text-right tabular-nums text-[var(--text-primary)]">
                  {gbp(g.medianProfit)}
                </td>
                {hideMargin ? (
                  <td className="py-3 pr-3 text-right tabular-nums text-[var(--text-primary)]">
                    {gbp(g.meanSoldPrice)}
                  </td>
                ) : (
                  <td className="py-3 pr-3">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-[var(--surface-inset)]">
                        <div
                          className={`h-full rounded-full ${tone.bar}`}
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                      <span
                        className={`rounded-[var(--radius-sm)] px-1.5 py-0.5 text-xs font-medium tabular-nums ${tone.pill}`}
                      >
                        {pct(g.medianMarginPct)}
                      </span>
                    </div>
                  </td>
                )}
                <td className="py-3 pr-3 text-right tabular-nums text-[var(--text-secondary)]">
                  {gbp(g.totalRevenue)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* -------------------------------------------------------------------- */
/* Hall of fame — podium-style ranked list                               */
/* -------------------------------------------------------------------- */

const PODIUM_TONE: Record<
  "brand" | "emerald",
  { value: string; medal: string[] }
> = {
  brand: {
    value: "text-[var(--brand-soft-fg)]",
    medal: [
      "bg-[var(--brand)] text-white",
      "bg-[var(--brand-soft)] text-[var(--brand-soft-fg)]",
      "bg-[var(--surface-inset)] text-[var(--text-secondary)]",
    ],
  },
  emerald: {
    value: "text-[var(--accent-emerald-soft-fg)]",
    medal: [
      "bg-[var(--accent-emerald)] text-white",
      "bg-[var(--accent-emerald-soft)] text-[var(--accent-emerald-soft-fg)]",
      "bg-[var(--surface-inset)] text-[var(--text-secondary)]",
    ],
  },
};

function HallOfFame({
  title,
  items,
  valueLabel,
  format,
  accent,
}: {
  title: string;
  items: ItemStat[];
  valueLabel: string;
  format: (i: ItemStat) => string;
  accent: "brand" | "emerald";
}) {
  const tone = PODIUM_TONE[accent];
  return (
    <Card>
      <CardHeader title={title} />
      {items.length === 0 ? (
        <p className="mt-3 text-sm text-[var(--text-muted)]">No sold items yet.</p>
      ) : (
        <ol className="mt-4 space-y-1.5">
          {items.map((item, idx) => {
            const rank = idx + 1;
            const medalClass = tone.medal[Math.min(idx, 2)];
            const isPodium = idx < 3;
            return (
              <li
                key={item.id}
                className={`flex items-center justify-between gap-3 rounded-[var(--radius-md)] px-2.5 py-2 transition-colors hover:bg-[var(--surface-muted)] ${
                  isPodium ? "bg-[var(--surface-muted)]/50" : ""
                }`}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold tabular-nums ${medalClass}`}
                    aria-label={`Rank ${rank}`}
                  >
                    {rank}
                  </span>
                  <div className="min-w-0">
                    <Link
                      href={`/inventory/${item.id}`}
                      className="block truncate text-sm font-medium text-[var(--text-primary)] hover:text-[var(--brand)] hover:underline"
                    >
                      {item.name}
                    </Link>
                    <div className="truncate text-xs text-[var(--text-muted)]">
                      {[item.brand, item.category].filter(Boolean).join(" · ") ||
                        "—"}
                    </div>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div
                    className={`font-display text-base font-semibold tabular-nums ${tone.value}`}
                  >
                    {format(item)}
                  </div>
                  <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
                    {valueLabel}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </Card>
  );
}
