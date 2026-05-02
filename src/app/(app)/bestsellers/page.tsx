import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import {
  computeBestsellers,
  type Dimension,
  type GroupStat,
  type ItemStat,
} from "@/lib/analytics/bestsellers";
import { resolveDateRange } from "@/lib/date-range";

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
const pct = (n: number) => `${Math.round(n)}%`;

type SortKey = "fastest" | "profit" | "margin";

const SORTS: { value: SortKey; label: string }[] = [
  { value: "fastest", label: "Fastest" },
  { value: "profit", label: "Profit" },
  { value: "margin", label: "Margin" },
];

function sortGroups(groups: GroupStat[], sort: SortKey): GroupStat[] {
  const copy = [...groups];
  if (sort === "fastest") return copy.sort((a, b) => a.medianDaysToSell - b.medianDaysToSell);
  if (sort === "profit") return copy.sort((a, b) => b.medianProfit - a.medianProfit);
  return copy.sort((a, b) => b.medianMarginPct - a.medianMarginPct);
}

export default async function BestsellersPage({
  searchParams,
}: {
  searchParams: Promise<{ preset?: string; dim?: string; sort?: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/");

  const { preset = "", dim = "category", sort = "fastest" } = await searchParams;
  const dimension: Dimension = (
    DIMENSIONS.map((d) => d.value).includes(dim as Dimension) ? dim : "category"
  ) as Dimension;
  const sortKey: SortKey = (
    SORTS.map((s) => s.value).includes(sort as SortKey) ? sort : "fastest"
  ) as SortKey;

  const range = resolveDateRange(preset || null, null, null);
  const data = await computeBestsellers(userId, range);
  const groups = sortGroups(data.groups[dimension], sortKey);
  const hasEnough = data.overall.totalSold >= data.minGroupSize;

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Best sellers</h1>
          <p className="mt-1 text-sm text-gray-600">
            What is flying out the door — time-to-sell grouped by product attributes.
          </p>
        </div>
        <form className="flex gap-2 text-sm">
          <input type="hidden" name="dim" value={dimension} />
          <input type="hidden" name="sort" value={sortKey} />
          <select
            name="preset"
            defaultValue={preset}
            className="rounded-md border px-2 py-1.5"
          >
            {PRESETS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
          <button className="rounded-md border px-3 py-1.5">Apply</button>
        </form>
      </header>

      {/* Overall tiles */}
      <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Tile label="Sold items analysed" value={data.overall.totalSold.toString()} />
        <Tile
          label="Median days to sell"
          value={data.overall.totalSold ? formatDays(data.overall.medianDaysToSell) : "—"}
        />
        <Tile
          label="Median profit"
          value={data.overall.totalSold ? gbp(data.overall.medianProfit) : "—"}
        />
        <Tile
          label="Median margin"
          value={data.overall.totalSold ? pct(data.overall.medianMarginPct) : "—"}
        />
      </section>

      {!hasEnough ? (
        <section className="rounded-md border border-dashed bg-gray-50 p-10 text-center">
          <p className="text-base font-medium">Not enough sales yet</p>
          <p className="mt-1 text-sm text-gray-600">
            Best sellers needs at least {data.minGroupSize} sold items with a
            listed date before it can compare groups. Keep going — it will fill
            up fast.
          </p>
        </section>
      ) : (
        <>
          {/* Group breakdown */}
          <section className="rounded-md border p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-sm font-medium">Group breakdown</h2>
                <p className="text-xs text-gray-500">
                  Groups with fewer than {data.minGroupSize} sales are hidden so
                  one lucky sale does not skew the ranking.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs">
                <DimSwitch active={dimension} preset={preset} sort={sortKey} />
                <SortSwitch active={sortKey} preset={preset} dim={dimension} />
              </div>
            </div>

            <div className="mt-4">
              <GroupTable dimension={dimension} groups={groups} />
            </div>
          </section>

          {/* Hall of fame */}
          <div className="grid gap-4 md:grid-cols-2">
            <HallOfFame
              title="Fastest to sell"
              items={data.topFastest}
              valueLabel="days"
              format={(i) => formatDays(i.daysToSell)}
            />
            <HallOfFame
              title="Highest profit"
              items={data.topProfit}
              valueLabel="profit"
              format={(i) => gbp(i.netProfit)}
            />
          </div>
        </>
      )}
    </div>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border p-4">
      <div className="text-xs uppercase text-gray-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </div>
  );
}

function DimSwitch({
  active,
  preset,
  sort,
}: {
  active: Dimension;
  preset: string;
  sort: SortKey;
}) {
  return (
    <div className="flex flex-wrap gap-1 rounded border p-0.5">
      {DIMENSIONS.map((d) => {
        const params = new URLSearchParams({ dim: d.value, sort });
        if (preset) params.set("preset", preset);
        const isActive = d.value === active;
        return (
          <Link
            key={d.value}
            href={`/bestsellers?${params.toString()}`}
            className={`rounded px-2 py-1 ${
              isActive ? "bg-gray-900 text-white" : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            {d.label}
          </Link>
        );
      })}
    </div>
  );
}

function SortSwitch({
  active,
  preset,
  dim,
}: {
  active: SortKey;
  preset: string;
  dim: Dimension;
}) {
  return (
    <div className="flex gap-1 rounded border p-0.5">
      {SORTS.map((s) => {
        const params = new URLSearchParams({ dim, sort: s.value });
        if (preset) params.set("preset", preset);
        const isActive = s.value === active;
        return (
          <Link
            key={s.value}
            href={`/bestsellers?${params.toString()}`}
            className={`rounded px-2 py-1 ${
              isActive
                ? "bg-emerald-100 text-emerald-800"
                : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            {s.label}
          </Link>
        );
      })}
    </div>
  );
}

function GroupTable({
  dimension,
  groups,
}: {
  dimension: Dimension;
  groups: GroupStat[];
}) {
  if (groups.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-6 text-center text-sm text-gray-500">
        Not enough sales grouped by this attribute yet.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-xs uppercase text-gray-500">
            <th className="py-2 pr-3 font-medium">Group</th>
            <th className="py-2 pr-3 text-right font-medium">Sales</th>
            <th className="py-2 pr-3 text-right font-medium">Median days</th>
            <th className="py-2 pr-3 text-right font-medium">Range</th>
            <th className="py-2 pr-3 text-right font-medium">Median profit</th>
            <th className="py-2 pr-3 text-right font-medium">Margin</th>
            <th className="py-2 pr-3 text-right font-medium">Revenue</th>
          </tr>
        </thead>
        <tbody>
          {groups.map((g) => (
            <tr key={g.key} className="border-b">
              <td className="py-2 pr-3 font-medium">{prettifyKey(dimension, g.key)}</td>
              <td className="py-2 pr-3 text-right">{g.count}</td>
              <td className="py-2 pr-3 text-right text-emerald-700">
                {formatDays(g.medianDaysToSell)}
              </td>
              <td className="py-2 pr-3 text-right text-xs text-gray-500">
                {g.fastestDays}–{g.slowestDays}d
              </td>
              <td className="py-2 pr-3 text-right">{gbp(g.medianProfit)}</td>
              <td className="py-2 pr-3 text-right">
                <MarginBadge pct={g.medianMarginPct} />
              </td>
              <td className="py-2 pr-3 text-right text-gray-600">
                {gbp(g.totalRevenue)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MarginBadge({ pct: p }: { pct: number }) {
  const tone =
    p >= 65
      ? "bg-emerald-50 text-emerald-700"
      : p >= 40
        ? "bg-amber-50 text-amber-700"
        : "bg-red-50 text-red-700";
  return <span className={`rounded px-1.5 py-0.5 text-xs ${tone}`}>{pct(p)}</span>;
}

function HallOfFame({
  title,
  items,
  valueLabel,
  format,
}: {
  title: string;
  items: ItemStat[];
  valueLabel: string;
  format: (i: ItemStat) => string;
}) {
  return (
    <section className="rounded-md border p-4">
      <h2 className="text-sm font-medium">{title}</h2>
      {items.length === 0 ? (
        <p className="mt-2 text-sm text-gray-500">No sold items yet.</p>
      ) : (
        <ol className="mt-2 divide-y">
          {items.map((item, idx) => (
            <li key={item.id} className="flex items-center justify-between gap-3 py-2">
              <div className="flex min-w-0 items-center gap-3">
                <span className="w-5 shrink-0 text-right text-xs font-semibold text-gray-400">
                  {idx + 1}
                </span>
                <div className="min-w-0">
                  <Link
                    href={`/inventory/${item.id}`}
                    className="block truncate text-sm font-medium underline"
                  >
                    {item.name}
                  </Link>
                  <div className="truncate text-xs text-gray-500">
                    {[item.brand, item.category].filter(Boolean).join(" · ") || "—"}
                  </div>
                </div>
              </div>
              <div className="shrink-0 text-right">
                <div className="text-sm font-semibold text-emerald-700">
                  {format(item)}
                </div>
                <div className="text-[10px] uppercase tracking-wider text-gray-400">
                  {valueLabel}
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
