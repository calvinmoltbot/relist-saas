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
  SegmentedControl,
  Tile,
} from "@/components/ui";
import { RevenueVsCostsChart } from "./charts";
import { ItemsSearch } from "./ItemsSearch";
import type { AcquisitionType } from "@/db/schema";

const PRESETS = [
  { value: "this_month", label: "This month" },
  { value: "last_month", label: "Last month" },
  { value: "last_90_days", label: "Last 90 days" },
  { value: "this_year", label: "This year" },
  { value: "tax_year", label: "Tax year (UK)" },
  { value: "all", label: "All time" },
];

const PAGE_SIZE = 25;

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

type TypeFilter = "all" | "bought" | "own";
const TYPE_OPTIONS: { value: TypeFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "bought", label: "Bought" },
  { value: "own", label: "Own" },
];

type Tab = "items" | "category" | "source" | "month";
const TAB_OPTIONS: { value: Tab; label: string }[] = [
  { value: "items", label: "Items" },
  { value: "category", label: "Category" },
  { value: "source", label: "Source" },
  { value: "month", label: "Month" },
];

type SortKey = "sold" | "cost" | "net" | "soldAt";
type SortDir = "asc" | "desc";

type Params = {
  preset: string;
  type: TypeFilter;
  tab: Tab;
  q: string;
  sort: SortKey;
  dir: SortDir;
  page: number;
};

function buildHref(p: Params, overrides: Partial<Params>): string {
  const merged = { ...p, ...overrides };
  const sp = new URLSearchParams();
  if (merged.preset && merged.preset !== "this_month") sp.set("preset", merged.preset);
  if (merged.type !== "all") sp.set("type", merged.type);
  if (merged.tab !== "items") sp.set("tab", merged.tab);
  if (merged.q) sp.set("q", merged.q);
  if (merged.sort !== "net") sp.set("sort", merged.sort);
  if (merged.dir !== "desc") sp.set("dir", merged.dir);
  if (merged.page > 1) sp.set("page", String(merged.page));
  const qs = sp.toString();
  return qs ? `/profit?${qs}` : "/profit";
}

function readParams(raw: {
  preset?: string;
  type?: string;
  tab?: string;
  q?: string;
  sort?: string;
  dir?: string;
  page?: string;
}): Params {
  const tab = (TAB_OPTIONS.map((t) => t.value).includes(raw.tab as Tab)
    ? raw.tab
    : "items") as Tab;
  const type = (TYPE_OPTIONS.map((t) => t.value).includes(raw.type as TypeFilter)
    ? raw.type
    : "all") as TypeFilter;
  const sort = (["sold", "cost", "net", "soldAt"].includes(raw.sort ?? "")
    ? raw.sort
    : "net") as SortKey;
  const dir = (raw.dir === "asc" ? "asc" : "desc") as SortDir;
  const pageNum = Math.max(1, Number(raw.page) || 1);
  return {
    preset: raw.preset ?? "this_month",
    type,
    tab,
    q: (raw.q ?? "").trim(),
    sort,
    dir,
    page: pageNum,
  };
}

export default async function ProfitPage({
  searchParams,
}: {
  searchParams: Promise<{
    preset?: string;
    type?: string;
    tab?: string;
    q?: string;
    sort?: string;
    dir?: string;
    page?: string;
  }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/");

  const raw = await searchParams;
  const p = readParams(raw);

  const presetKey = p.preset === "all" ? "" : p.preset;
  const range = resolveDateRange(presetKey || null, null, null);
  const acquisitionFilter: AcquisitionType | undefined =
    p.type === "all" ? undefined : (p.type as AcquisitionType);

  const [r, series, itemCount] = await Promise.all([
    computeProfit(userId, range, acquisitionFilter),
    computeProfitSeries(userId, range, acquisitionFilter),
    userScope(userId).countItems(),
  ]);

  const isFirstRun = itemCount === 0;
  const s = r.summary;

  // ----- Items tab: filter, sort, paginate in-memory -----
  const qLower = p.q.toLowerCase();
  const filtered = qLower
    ? r.itemProfits.filter((it) => it.name.toLowerCase().includes(qLower))
    : r.itemProfits;
  const sorted = [...filtered].sort((a, b) => {
    let av: number | string;
    let bv: number | string;
    switch (p.sort) {
      case "sold":
        av = a.sold;
        bv = b.sold;
        break;
      case "cost":
        av = a.cost;
        bv = b.cost;
        break;
      case "soldAt":
        av = a.soldAt ?? "";
        bv = b.soldAt ?? "";
        break;
      case "net":
      default:
        av = a.netProfit;
        bv = b.netProfit;
    }
    if (av < bv) return p.dir === "asc" ? -1 : 1;
    if (av > bv) return p.dir === "asc" ? 1 : -1;
    return 0;
  });
  const totalItems = sorted.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const currentPage = Math.min(p.page, totalPages);
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const pageRows = sorted.slice(pageStart, pageStart + PAGE_SIZE);

  // Thumbnails for the visible page only.
  const thumbMap = await userScope(userId).getItemHasThumbnailMap(
    pageRows.map((row) => row.id),
  );

  // Wardrobe context — only meaningful when both bought + own contributed.
  const ownRev = r.byAcquisition.own.revenue;
  const ownCount = r.byAcquisition.own.count;
  const boughtRev = r.byAcquisition.bought.revenue;
  const showWardrobeContext = p.type === "all" && ownRev > 0 && boughtRev > 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Profit"
        subtitle={formatRangeSubtitle(range.from, range.to)}
        actions={
          <div className="flex items-center gap-3">
            <SegmentedControl
              options={TYPE_OPTIONS}
              active={p.type}
              tone="brand"
              hrefFor={(v) => buildHref(p, { type: v, page: 1 })}
            />
            <form className="flex items-center gap-2 text-sm">
              {p.type !== "all" && <input type="hidden" name="type" value={p.type} />}
              {p.tab !== "items" && <input type="hidden" name="tab" value={p.tab} />}
              <select
                name="preset"
                defaultValue={p.preset}
                className="h-9 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-card)] px-3 text-sm text-[var(--text-primary)]"
              >
                {PRESETS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
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
          </div>
        }
      />

      {isFirstRun && (
        <FirstRunNudge
          heading="No profit data yet"
          body="Add items and mark them sold to see revenue, margin and net profit broken down."
        />
      )}

      {/* Tile row — single grid, 7 metrics */}
      <section className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-7">
        <Tile
          label="Net profit"
          value={gbp(s.netProfit)}
          sub={`${gbp(s.grossProfit)} gross · ${s.avgMargin}% margin`}
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
          sub={s.itemsSold ? `${gbp(s.avgProfitPerItem)} avg` : "—"}
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
      </section>

      {showWardrobeContext && (
        <p className="-mt-3 text-xs text-[var(--text-muted)]">
          Of which {gbp(ownRev)} ({ownCount}{" "}
          {ownCount === 1 ? "item" : "items"}) was from your own wardrobe.
        </p>
      )}

      {/* Single chart row */}
      <Card>
        <CardHeader
          title="Revenue vs costs over time"
          description="Daily revenue, cost of goods and net profit across the selected window."
        />
        <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-[var(--text-secondary)]">
          <LegendDot color="var(--brand)" label="Revenue" />
          <LegendDot color="var(--accent-rose)" label="Cost" />
          <LegendDot color="var(--accent-emerald)" label="Net profit" />
        </div>
        <div className="mt-2">
          <RevenueVsCostsChart data={series} />
        </div>
      </Card>

      {/* Tabbed analytical section */}
      <Card padded={false}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-subtle)] p-4">
          <SegmentedControl
            options={TAB_OPTIONS}
            active={p.tab}
            tone="brand"
            hrefFor={(v) => buildHref(p, { tab: v, page: 1 })}
          />
          {p.tab === "items" && <ItemsSearch initial={p.q} />}
        </div>

        {p.tab === "items" && (
          <ItemsTab
            params={p}
            rows={pageRows}
            totalItems={totalItems}
            currentPage={currentPage}
            totalPages={totalPages}
            pageStart={pageStart}
            thumbMap={thumbMap}
          />
        )}
        {p.tab === "category" && (
          <BreakdownTable
            dimension="category"
            rows={r.byCategory.map((c) => ({ key: c.category, ...c }))}
          />
        )}
        {p.tab === "source" && (
          <BreakdownTable
            dimension="source"
            rows={r.bySource.map((c) => ({ key: c.source, ...c }))}
          />
        )}
        {p.tab === "month" && (
          <BreakdownTable
            dimension="month"
            rows={r.byMonth.map((c) => ({ key: c.month, ...c }))}
          />
        )}
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------

function ItemsTab({
  params,
  rows,
  totalItems,
  currentPage,
  totalPages,
  pageStart,
  thumbMap,
}: {
  params: Params;
  rows: Array<{
    id: string;
    name: string;
    sold: number;
    cost: number;
    netProfit: number;
    soldAt: string | null;
  }>;
  totalItems: number;
  currentPage: number;
  totalPages: number;
  pageStart: number;
  thumbMap: Map<string, { hasThumbnail: boolean; thumbnailUrl: string | null }>;
}) {
  if (totalItems === 0) {
    return (
      <p className="p-6 text-sm text-[var(--text-muted)]">
        {params.q
          ? `No items match "${params.q}".`
          : "No sales in this period."}
      </p>
    );
  }

  const showingFrom = pageStart + 1;
  const showingTo = pageStart + rows.length;

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-[var(--border-subtle)] bg-[var(--surface-muted)] text-left text-[11px] uppercase tracking-wide text-[var(--text-muted)]">
              <th className="py-2 pl-5 pr-3 font-medium">Item</th>
              <SortableHeader
                params={params}
                sortKey="sold"
                align="right"
                label="Sold"
              />
              <SortableHeader
                params={params}
                sortKey="cost"
                align="right"
                label="Cost"
              />
              <SortableHeader
                params={params}
                sortKey="net"
                align="right"
                label="Net"
              />
              <SortableHeader
                params={params}
                sortKey="soldAt"
                align="left"
                label="Sold at"
                last
              />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const t = thumbMap.get(row.id);
              return (
                <tr
                  key={row.id}
                  className="border-b border-[var(--border-subtle)] last:border-b-0 hover:bg-[var(--surface-muted)]/60"
                >
                  <td className="py-2.5 pl-5 pr-3">
                    <Link
                      href={`/inventory/${row.id}`}
                      className="flex items-center gap-3"
                    >
                      <span className="relative inline-flex h-9 w-9 shrink-0 overflow-hidden rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--surface-inset)]">
                        {t?.hasThumbnail ? (
                          <Image
                            src={t.thumbnailUrl ?? ""}
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
                        {row.name}
                      </span>
                    </Link>
                  </td>
                  <td className="py-2.5 pr-3 text-right tabular-nums">
                    {gbp(row.sold)}
                  </td>
                  <td className="py-2.5 pr-3 text-right tabular-nums text-[var(--text-secondary)]">
                    {gbp(row.cost)}
                  </td>
                  <td
                    className={`py-2.5 pr-3 text-right font-semibold tabular-nums ${
                      row.netProfit >= 0
                        ? "text-[var(--accent-emerald-soft-fg)]"
                        : "text-[var(--accent-rose-soft-fg)]"
                    }`}
                  >
                    {gbp(row.netProfit)}
                  </td>
                  <td className="py-2.5 pr-5 text-xs text-[var(--text-muted)]">
                    {row.soldAt
                      ? new Date(row.soldAt).toLocaleDateString("en-GB")
                      : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between border-t border-[var(--border-subtle)] px-5 py-3 text-xs text-[var(--text-muted)]">
        <span className="tabular-nums">
          Showing {showingFrom.toLocaleString("en-GB")}–
          {showingTo.toLocaleString("en-GB")} of{" "}
          {totalItems.toLocaleString("en-GB")}
        </span>
        <div className="flex items-center gap-2">
          <PageLink
            href={buildHref(params, { page: currentPage - 1 })}
            disabled={currentPage <= 1}
            label="← Prev"
          />
          <span className="tabular-nums">
            Page {currentPage} of {totalPages}
          </span>
          <PageLink
            href={buildHref(params, { page: currentPage + 1 })}
            disabled={currentPage >= totalPages}
            label="Next →"
          />
        </div>
      </div>
    </>
  );
}

function SortableHeader({
  params,
  sortKey,
  label,
  align,
  last = false,
}: {
  params: Params;
  sortKey: SortKey;
  label: string;
  align: "left" | "right";
  last?: boolean;
}) {
  const isActive = params.sort === sortKey;
  const nextDir: SortDir = isActive && params.dir === "desc" ? "asc" : "desc";
  const arrow = isActive ? (params.dir === "desc" ? " ↓" : " ↑") : "";
  const padR = last ? "pr-5" : "pr-3";
  return (
    <th
      className={`py-2 ${padR} font-medium ${align === "right" ? "text-right" : ""}`}
    >
      <Link
        href={buildHref(params, { sort: sortKey, dir: nextDir, page: 1 })}
        className={`inline-flex items-center hover:text-[var(--text-primary)] ${
          isActive ? "text-[var(--text-primary)]" : ""
        }`}
      >
        {label}
        {arrow}
      </Link>
    </th>
  );
}

function PageLink({
  href,
  disabled,
  label,
}: {
  href: string;
  disabled: boolean;
  label: string;
}) {
  if (disabled) {
    return (
      <span className="rounded-[var(--radius-sm)] px-2 py-1 text-[var(--text-muted)] opacity-50">
        {label}
      </span>
    );
  }
  return (
    <Link
      href={href}
      className="rounded-[var(--radius-sm)] px-2 py-1 hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]"
    >
      {label}
    </Link>
  );
}

function BreakdownTable({
  dimension,
  rows,
}: {
  dimension: string;
  rows: { key: string; revenue: number; profit: number; count: number }[];
}) {
  if (rows.length === 0) {
    return <p className="p-6 text-sm text-[var(--text-muted)]">No data.</p>;
  }
  const totalRev = rows.reduce((a, b) => a + b.revenue, 0);
  const totalProfit = rows.reduce((a, b) => a + b.profit, 0);
  const totalCount = rows.reduce((a, b) => a + b.count, 0);
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-[var(--border-subtle)] bg-[var(--surface-muted)] text-left text-[11px] uppercase tracking-wide text-[var(--text-muted)]">
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
              <td className="py-2.5 pl-5 pr-3 text-[var(--text-primary)]">
                {row.key}
              </td>
              <td className="py-2.5 pr-3 text-right tabular-nums text-[var(--text-secondary)]">
                {row.count}
              </td>
              <td className="py-2.5 pr-3 text-right tabular-nums">
                {gbp(row.revenue)}
              </td>
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
