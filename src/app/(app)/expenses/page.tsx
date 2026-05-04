import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { userScope } from "@/lib/db/scoped";
import { resolveDateRange } from "@/lib/date-range";
import { ExpensesClient } from "./client";

const PRESETS = [
  { value: "", label: "All time" },
  { value: "this_month", label: "This month" },
  { value: "last_month", label: "Last month" },
  { value: "last_90_days", label: "Last 90 days" },
  { value: "this_year", label: "This year" },
  { value: "tax_year", label: "Tax year (UK)" },
];

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{ preset?: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/");

  const { preset = "" } = await searchParams;
  const { from, to } = resolveDateRange(preset || null, null, null);
  const rows = await userScope(userId).listExpenses({ from, to });

  const byCategory: Record<string, number> = {};
  let total = 0;
  for (const r of rows) {
    const amt = parseFloat(r.amount);
    total += amt;
    byCategory[r.category] = (byCategory[r.category] ?? 0) + amt;
  }

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Expenses</h1>
          <p className="mt-1 text-sm text-gray-600">
            Business costs: packaging and shipping supplies.
          </p>
        </div>
        <form className="flex gap-2 text-sm">
          <select
            name="preset"
            defaultValue={preset}
            className="rounded-md border px-2 py-1"
          >
            {PRESETS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
          <button className="rounded-md border px-3 py-1">Apply</button>
        </form>
      </header>

      <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="Total" value={`£${total.toFixed(2)}`} />
        <Stat label="Items" value={rows.length.toString()} />
        {Object.entries(byCategory)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 2)
          .map(([cat, amt]) => (
            <Stat key={cat} label={cat} value={`£${amt.toFixed(2)}`} />
          ))}
      </section>

      <ExpensesClient
        initialRows={rows.map((r) => ({
          id: r.id,
          category: r.category,
          description: r.description,
          amount: r.amount,
          incurredAt: r.incurredAt.toISOString(),
        }))}
      />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border p-4">
      <div className="text-xs uppercase text-gray-500">{label}</div>
      <div className="mt-1 text-xl font-semibold">{value}</div>
    </div>
  );
}
