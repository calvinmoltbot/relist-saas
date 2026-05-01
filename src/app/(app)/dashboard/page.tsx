import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { computeProfit } from "@/lib/analytics/profit";

const gbp = (n: number) => `£${n.toFixed(2)}`;

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) redirect("/");

  // Headline = current month
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  const month = await computeProfit(userId, { from, to });
  const allTime = await computeProfit(userId, { from: null, to: null });

  const tiles: Array<{ label: string; value: string; sub?: string }> = [
    { label: "Revenue this month", value: gbp(month.summary.revenue), sub: `${month.summary.itemsSold} sold` },
    { label: "Net profit this month", value: gbp(month.summary.netProfit), sub: `${month.summary.avgMargin}% avg margin` },
    { label: "Stock value (listed)", value: gbp(allTime.summary.stockListedValue), sub: `${allTime.summary.itemsListed} listed` },
    { label: "Items sourced", value: allTime.summary.itemsSourced.toString(), sub: "ready to list" },
  ];

  return (
    <div className="space-y-8">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-600">
            {now.toLocaleString("en-GB", { month: "long", year: "numeric" })}
          </p>
        </div>
        <div className="flex gap-2 text-sm">
          <Link href="/profit" className="rounded-md border px-3 py-1.5">
            Profit
          </Link>
          <Link
            href="/inventory/new"
            className="rounded-md bg-black px-3 py-1.5 text-white"
          >
            Add item
          </Link>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-md border p-4">
            <div className="text-xs uppercase text-gray-500">{t.label}</div>
            <div className="mt-1 text-2xl font-semibold">{t.value}</div>
            {t.sub && <div className="mt-0.5 text-xs text-gray-500">{t.sub}</div>}
          </div>
        ))}
      </section>

      <section>
        <h2 className="text-sm font-medium text-gray-600">Top profit (lifetime)</h2>
        {allTime.itemProfits.length === 0 ? (
          <p className="mt-2 text-sm text-gray-500">
            Nothing sold yet. Add items at{" "}
            <Link href="/inventory/new" className="underline">
              Inventory → New
            </Link>
            .
          </p>
        ) : (
          <table className="mt-2 w-full border-collapse text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase text-gray-500">
                <th className="py-2 pr-4">Item</th>
                <th className="py-2 pr-4">Brand</th>
                <th className="py-2 pr-4 text-right">Sold</th>
                <th className="py-2 pr-4 text-right">Net</th>
              </tr>
            </thead>
            <tbody>
              {allTime.itemProfits.slice(0, 8).map((p) => (
                <tr key={p.id} className="border-b">
                  <td className="py-2 pr-4">
                    <Link href={`/inventory/${p.id}`} className="underline">
                      {p.name}
                    </Link>
                  </td>
                  <td className="py-2 pr-4">{p.brand ?? "—"}</td>
                  <td className="py-2 pr-4 text-right">{gbp(p.sold)}</td>
                  <td className="py-2 pr-4 text-right font-medium">
                    {gbp(p.netProfit)}
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
