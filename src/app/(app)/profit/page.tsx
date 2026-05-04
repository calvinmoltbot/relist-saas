import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { computeProfit } from "@/lib/analytics/profit";
import { computeProfitSeries } from "@/lib/analytics/profit-series";
import { resolveDateRange } from "@/lib/date-range";
import { userScope } from "@/lib/db/scoped";
import { FirstRunNudge } from "@/components/FirstRunNudge";
import {
  Card,
  CardHeader,
  PageHeader,
  Tile,
} from "@/components/ui";
import { CostCompositionChart, RevenueVsCostsChart } from "./charts";
import type { CostSlice } from "./charts";

const PRESETS = [
  { value: "this_month", label: "This month" },
  { value: "last_month", label: "Last month" },
  { value: "last_90_days", label: "Last 90 days" },
  { value: "this_year", label: "This year" },
  { value: "tax_year", label: "Tax year (UK)" },
  { value: "all", label: "All time" },
];

const gbp = (n: number) =>
  `£${n.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const num0 = (n: number) => n.toLocaleString("en-GB");

function formatRangeSubtitle(from: Date | null, to: Date | null) {
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  if (!from && !to) return "All time";
  if (from && to) return `${fmt(from)} – ${fmt(to)}`;
  if (from) return `From ${fmt(from)}`;
  if (to) return `Up to ${fmt(to)}`;
  return "";
}

export default async function ProfitPage({
  searchParams,
}: {
  searchParams: Promise<{ preset?: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/");

  const { preset = "this_month" } = await searchParams;
  const presetKey = preset === "all" ? "" : preset;
  const range = resolveDateRange(presetKey || null, null, null);

  const [r, series, itemCount] = await Promise.all([
    computeProfit(userId, range),
    computeProfitSeries(userId, range),
    userScope(userId).countItems(),
  ]);

  const isFirstRun = itemCount === 0;
  const s = r.summary;

  // Resolve thumbnail availability for the items-in-range table.
  const itemIds = r.itemProfits.map((p) => p.id);
  const thumbMap = await userScope(userId).getItemHasThumbnailMap(itemIds);

  const costSlices: CostSlice[] = [
    { name: "Cost of goods", value: s.cost, color: "var(--brand)" },
    { name: "Shipping", value: s.shipping, color: "var(--accent-amber)" },
    { name: "Other expenses", value: s.totalExpenses, color: "var(--accent-rose)" },
  ].filter((s) => s.value > 0);
  const totalCosts = s.cost + s.shipping + s.totalExpenses;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Profit"
        subtitle={formatRangeSubtitle(range.from, range.to)}
        actions={
          <form className="flex items-center gap-2 text-sm">
            <select
              name="preset"
              defaultValue={preset}
              className="h-9 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-card)] px-3 text-sm text-[var(--text-primary)]"
            >
              {PRESETS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="h-9 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-card)] px-3 text-sm font-medium hover:bg-[var(--surface-muted)]"
            >
              Apply
            </button>
          </form>
        }
      />

      {isFirstRun && (
        <FirstRunNudge
          heading="No profit data yet"
          body="Add items and mark them sold to see revenue, margin and net profit broken down."
        />
      )}

      {/* What came in */}
      <section className="space-y-3">
        <h2 className="text-xs font-medium uppercase tracking-[0.14em] text-[var(--text-muted)]">
          What came in
        </h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Tile
            label="Net profit"
            value={gbp(s.netProfit)}
            sub={`${s.avgMargin}% avg margin`}
            tone="emerald"
            icon={<TrendIcon />}
          />
          <Tile
            label="Revenue"
            value={gbp(s.revenue)}
            sub={`${s.itemsSold} items sold`}
            tone="brand"
            icon={<MoneyIcon />}
          />
          <Tile
            label="Items sold"
            value={num0(s.itemsSold)}
            sub={s.itemsSold ? `${gbp(s.avgProfitPerItem)} avg profit` : "—"}
            tone="violet"
            icon={<TagIcon />}
          />
          <Tile
            label="Sell-through"
            value={`${s.sellThroughRate}%`}
            sub={`${s.itemsListed} still listed`}
            tone="amber"
            icon={<RotateIcon />}
          />
        </div>
      </section>

      {/* What went out */}
      <section className="space-y-3">
        <h2 className="text-xs font-medium uppercase tracking-[0.14em] text-[var(--text-muted)]">
          What went out
        </h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          <Tile
            label="Cost of goods"
            value={gbp(s.cost)}
            tone="brand"
            icon={<BagIcon />}
          />
          <Tile
            label="Shipping"
            value={gbp(s.shipping)}
            tone="amber"
            icon={<TruckIcon />}
          />
          <Tile
            label="Other expenses"
            value={gbp(s.totalExpenses)}
            tone="rose"
            icon={<ReceiptIcon />}
          />
        </div>
      </section>

      {/* Charts row: line chart (2/3), donut (1/3), summary card */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader
              title="Revenue vs costs over time"
              description="Daily revenue, cost of goods and net profit across the selected window."
            />
            <div className="mt-4 flex flex-wrap gap-3 text-[11px] text-[var(--text-secondary)]">
              <LegendDot color="var(--brand)" label="Revenue" />
              <LegendDot color="var(--accent-rose)" label="Cost" />
              <LegendDot color="var(--accent-emerald)" label="Net profit" />
            </div>
            <div className="mt-2">
              <RevenueVsCostsChart data={series} />
            </div>
          </Card>
        </div>
        <div className="space-y-6">
          <Card>
            <CardHeader title="Cost composition" />
            <div className="mt-2">
              <CostCompositionChart
                data={costSlices}
                centerLabel="Total costs"
                centerValue={gbp(totalCosts)}
              />
            </div>
            {costSlices.length > 0 && (
              <ul className="mt-3 space-y-1.5 text-xs text-[var(--text-secondary)]">
                {costSlices.map((c) => (
                  <li key={c.name} className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2">
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-full"
                        style={{ background: c.color }}
                        aria-hidden
                      />
                      {c.name}
                    </span>
                    <span className="tabular-nums text-[var(--text-primary)]">{gbp(c.value)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </section>

      {/* Summary card */}
      <section>
        <Card>
          <CardHeader title="Summary" description="Totals for the selected period." />
          <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 text-sm md:grid-cols-4">
            <SummaryRow label="Revenue" value={gbp(s.revenue)} />
            <SummaryRow label="Gross profit" value={gbp(s.grossProfit)} />
            <SummaryRow
              label="Net profit"
              value={gbp(s.netProfit)}
              tone={s.netProfit >= 0 ? "positive" : "negative"}
            />
            <SummaryRow label="Avg margin" value={`${s.avgMargin}%`} />
            <SummaryRow label="Cost of goods" value={gbp(s.cost)} />
            <SummaryRow label="Shipping" value={gbp(s.shipping)} />
            <SummaryRow label="Other expenses" value={gbp(s.totalExpenses)} />
          </dl>
        </Card>
      </section>

      {/* Three breakdown tables + items in range */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <BreakdownCard
          title="By category"
          rows={r.byCategory.map((c) => ({ key: c.category, ...c }))}
        />
        <BreakdownCard
          title="By source"
          rows={r.bySource.map((c) => ({ key: c.source, ...c }))}
        />
        <BreakdownCard
          title="By month"
          rows={r.byMonth.map((c) => ({ key: c.month, ...c }))}
        />
        <Card padded={false}>
          <div className="flex items-center justify-between p-5 pb-3">
            <h3 className="text-base font-semibold text-[var(--text-primary)]">Items in range</h3>
            <span className="text-xs text-[var(--text-muted)]">
              {r.itemProfits.length} {r.itemProfits.length === 1 ? "item" : "items"}
            </span>
          </div>
          {r.itemProfits.length === 0 ? (
            <p className="px-5 pb-5 text-sm text-[var(--text-muted)]">
              No sales in this period.
            </p>
          ) : (
            <div className="max-h-[420px] overflow-auto">
              <table className="w-full border-collapse text-sm">
                <thead className="sticky top-0 z-10 bg-[var(--surface-muted)]">
                  <tr className="border-y border-[var(--border-subtle)] text-left text-[11px] uppercase tracking-wide text-[var(--text-muted)]">
                    <th className="py-2 pl-5 pr-3 font-medium">Item</th>
                    <th className="py-2 pr-3 text-right font-medium">Sold</th>
                    <th className="py-2 pr-3 text-right font-medium">Cost</th>
                    <th className="py-2 pr-3 text-right font-medium">Net</th>
                    <th className="py-2 pr-5 font-medium">Sold at</th>
                  </tr>
                </thead>
                <tbody>
                  {r.itemProfits.map((p) => {
                    const hasThumbnail = thumbMap.get(p.id) ?? false;
                    return (
                      <tr
                        key={p.id}
                        className="border-b border-[var(--border-subtle)] last:border-b-0 hover:bg-[var(--surface-muted)]/60"
                      >
                        <td className="py-2.5 pl-5 pr-3">
                          <Link
                            href={`/inventory/${p.id}`}
                            className="flex items-center gap-3"
                          >
                            <span className="relative inline-flex h-9 w-9 shrink-0 overflow-hidden rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--surface-inset)]">
                              {hasThumbnail ? (
                                <Image
                                  src={`/api/inventory/thumb/${p.id}`}
                                  alt=""
                                  width={36}
                                  height={36}
                                  className="h-full w-full object-cover"
                                  unoptimized
                                />
                              ) : (
                                <span className="m-auto text-[9px] uppercase text-[var(--text-muted)]">
                                  no img
                                </span>
                              )}
                            </span>
                            <span className="font-medium text-[var(--text-primary)] hover:underline">
                              {p.name}
                            </span>
                          </Link>
                        </td>
                        <td className="py-2.5 pr-3 text-right tabular-nums">{gbp(p.sold)}</td>
                        <td className="py-2.5 pr-3 text-right tabular-nums text-[var(--text-secondary)]">
                          {gbp(p.cost)}
                        </td>
                        <td
                          className={`py-2.5 pr-3 text-right font-semibold tabular-nums ${
                            p.netProfit >= 0
                              ? "text-[var(--accent-emerald-soft-fg)]"
                              : "text-[var(--accent-rose-soft-fg)]"
                          }`}
                        >
                          {gbp(p.netProfit)}
                        </td>
                        <td className="py-2.5 pr-5 text-xs text-[var(--text-muted)]">
                          {p.soldAt ? new Date(p.soldAt).toLocaleDateString("en-GB") : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </section>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "positive" | "negative";
}) {
  const valueClass =
    tone === "positive"
      ? "text-[var(--accent-emerald-soft-fg)]"
      : tone === "negative"
        ? "text-[var(--accent-rose-soft-fg)]"
        : "text-[var(--text-primary)]";
  return (
    <div className="flex flex-col">
      <dt className="text-[11px] uppercase tracking-wide text-[var(--text-muted)]">{label}</dt>
      <dd className={`mt-1 text-lg font-semibold tabular-nums ${valueClass}`}>{value}</dd>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className="inline-block h-2.5 w-2.5 rounded-full"
        style={{ background: color }}
        aria-hidden
      />
      {label}
    </span>
  );
}

function BreakdownCard({
  title,
  rows,
}: {
  title: string;
  rows: { key: string; revenue: number; profit: number; count: number }[];
}) {
  const dimension = title.replace("By ", "");
  const totalRev = rows.reduce((a, b) => a + b.revenue, 0);
  const totalProfit = rows.reduce((a, b) => a + b.profit, 0);
  const totalCount = rows.reduce((a, b) => a + b.count, 0);
  return (
    <Card padded={false}>
      <div className="p-5 pb-3">
        <h3 className="text-base font-semibold text-[var(--text-primary)] capitalize">
          {title}
        </h3>
      </div>
      {rows.length === 0 ? (
        <p className="px-5 pb-5 text-sm text-[var(--text-muted)]">No data.</p>
      ) : (
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-y border-[var(--border-subtle)] bg-[var(--surface-muted)] text-left text-[11px] uppercase tracking-wide text-[var(--text-muted)]">
              <th className="py-2 pl-5 pr-3 font-medium capitalize">{dimension}</th>
              <th className="py-2 pr-3 text-right font-medium">Items</th>
              <th className="py-2 pr-3 text-right font-medium">Revenue</th>
              <th className="py-2 pr-5 text-right font-medium">Profit</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.key}
                className="border-b border-[var(--border-subtle)] last:border-b-0"
              >
                <td className="py-2.5 pl-5 pr-3 text-[var(--text-primary)]">{row.key}</td>
                <td className="py-2.5 pr-3 text-right tabular-nums text-[var(--text-secondary)]">
                  {row.count}
                </td>
                <td className="py-2.5 pr-3 text-right tabular-nums">{gbp(row.revenue)}</td>
                <td
                  className={`py-2.5 pr-5 text-right font-semibold tabular-nums ${
                    row.profit >= 0
                      ? "text-[var(--accent-emerald-soft-fg)]"
                      : "text-[var(--accent-rose-soft-fg)]"
                  }`}
                >
                  {gbp(row.profit)}
                </td>
              </tr>
            ))}
            <tr className="bg-[var(--surface-muted)]/60">
              <td className="py-2.5 pl-5 pr-3 text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
                Total
              </td>
              <td className="py-2.5 pr-3 text-right tabular-nums text-[var(--text-secondary)]">
                {totalCount}
              </td>
              <td className="py-2.5 pr-3 text-right font-semibold tabular-nums">
                {gbp(totalRev)}
              </td>
              <td
                className={`py-2.5 pr-5 text-right font-semibold tabular-nums ${
                  totalProfit >= 0
                    ? "text-[var(--accent-emerald-soft-fg)]"
                    : "text-[var(--accent-rose-soft-fg)]"
                }`}
              >
                {gbp(totalProfit)}
              </td>
            </tr>
          </tbody>
        </table>
      )}
    </Card>
  );
}

/* ---- Inline icons ---- */
function MoneyIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      <path d="M11 5.5C11 4.67 10.1 4 9 4S7 4.67 7 5.5 7.9 7 9 7s2 .67 2 1.5S10.1 10 9 10s-2-.67-2-1.5M9 3v1M9 10v1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
function TrendIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      <path d="M3 14l4-4 3 3 5-6M11 7h4v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function TagIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      <path d="M2.5 9V3h6l7 7-6 6-7-7zM6 6a1 1 0 100-2 1 1 0 000 2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}
function RotateIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      <path d="M3 9a6 6 0 0110-4.5L15 6M15 3v3h-3M15 9a6 6 0 01-10 4.5L3 12M3 15v-3h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function BagIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      <path d="M4 6h10l-1 9H5L4 6zM6 6V4a3 3 0 016 0v2" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}
function TruckIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      <path d="M2 5h8v8H2zM10 8h4l2 2v3h-6zM5 15a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM13 15a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}
function ReceiptIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      <path d="M4 2v14l2-1.5L8 16l2-1.5 2 1.5 2-1.5V2zM6 6h6M6 9h6M6 12h4" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}
