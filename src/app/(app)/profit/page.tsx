import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { computeProfit } from "@/lib/analytics/profit";
import { resolveDateRange } from "@/lib/date-range";
import { userScope } from "@/lib/db/scoped";
import { FirstRunNudge } from "@/components/FirstRunNudge";

const PRESETS = [
  { value: "this_month", label: "This month" },
  { value: "last_month", label: "Last month" },
  { value: "last_90_days", label: "Last 90 days" },
  { value: "this_year", label: "This year" },
  { value: "tax_year", label: "Tax year (UK)" },
  { value: "", label: "All time" },
];

const gbp = (n: number) => `£${n.toFixed(2)}`;

export default async function ProfitPage({
  searchParams,
}: {
  searchParams: Promise<{ preset?: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/");

  const { preset = "this_month" } = await searchParams;
  const range = resolveDateRange(preset || null, null, null);
  const [r, itemCount] = await Promise.all([
    computeProfit(userId, range),
    userScope(userId).countItems(),
  ]);
  const isFirstRun = itemCount === 0;

  return (
    <div className="space-y-8">
      <header className="flex items-end justify-between">
        <h1 className="text-2xl font-semibold">Profit</h1>
        <form className="flex gap-2 text-sm">
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

      {isFirstRun && (
        <FirstRunNudge
          heading="No profit data yet"
          body="Add items and mark them sold to see revenue, margin and net profit broken down."
        />
      )}

      <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Tile label="Revenue" value={gbp(r.summary.revenue)} />
        <Tile label="Net profit" value={gbp(r.summary.netProfit)} />
        <Tile label="Avg margin" value={`${r.summary.avgMargin}%`} />
        <Tile label="Items sold" value={r.summary.itemsSold.toString()} />
        <Tile label="Cost of goods" value={gbp(r.summary.cost)} />
        <Tile label="Shipping" value={gbp(r.summary.shipping)} />
        <Tile label="Platform fees" value={gbp(r.summary.fees)} />
        <Tile label="Other expenses" value={gbp(r.summary.totalExpenses)} />
      </section>

      <Breakdown
        title="By category"
        rows={r.byCategory.map((c) => ({ key: c.category, ...c }))}
      />
      <Breakdown
        title="By source"
        rows={r.bySource.map((c) => ({ key: c.source, ...c }))}
      />
      <Breakdown
        title="By month"
        rows={r.byMonth.map((c) => ({ key: c.month, ...c }))}
      />

      <section>
        <h2 className="text-sm font-medium text-gray-600">Items in range</h2>
        {r.itemProfits.length === 0 ? (
          <p className="mt-2 text-sm text-gray-500">No sales in this period.</p>
        ) : (
          <table className="mt-2 w-full border-collapse text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase text-gray-500">
                <th className="py-2 pr-4">Item</th>
                <th className="py-2 pr-4 text-right">Sold</th>
                <th className="py-2 pr-4 text-right">Cost</th>
                <th className="py-2 pr-4 text-right">Net</th>
                <th className="py-2 pr-4">Sold at</th>
              </tr>
            </thead>
            <tbody>
              {r.itemProfits.map((p) => (
                <tr key={p.id} className="border-b">
                  <td className="py-2 pr-4">
                    <Link href={`/inventory/${p.id}`} className="underline">
                      {p.name}
                    </Link>
                  </td>
                  <td className="py-2 pr-4 text-right">{gbp(p.sold)}</td>
                  <td className="py-2 pr-4 text-right">{gbp(p.cost)}</td>
                  <td className="py-2 pr-4 text-right font-medium">
                    {gbp(p.netProfit)}
                  </td>
                  <td className="py-2 pr-4 text-xs text-gray-500">
                    {p.soldAt ? new Date(p.soldAt).toLocaleDateString() : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border p-4">
      <div className="text-xs uppercase text-gray-500">{label}</div>
      <div className="mt-1 text-xl font-semibold">{value}</div>
    </div>
  );
}

function Breakdown({
  title,
  rows,
}: {
  title: string;
  rows: { key: string; revenue: number; profit: number; count: number }[];
}) {
  if (rows.length === 0) return null;
  return (
    <section>
      <h2 className="text-sm font-medium text-gray-600">{title}</h2>
      <table className="mt-2 w-full border-collapse text-sm">
        <thead>
          <tr className="border-b text-left text-xs uppercase text-gray-500">
            <th className="py-2 pr-4">{title.replace("By ", "")}</th>
            <th className="py-2 pr-4 text-right">Items</th>
            <th className="py-2 pr-4 text-right">Revenue</th>
            <th className="py-2 pr-4 text-right">Profit</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key} className="border-b">
              <td className="py-2 pr-4">{r.key}</td>
              <td className="py-2 pr-4 text-right">{r.count}</td>
              <td className="py-2 pr-4 text-right">{gbp(r.revenue)}</td>
              <td className="py-2 pr-4 text-right font-medium">{gbp(r.profit)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
