import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { userScope } from "@/lib/db/scoped";
import { FirstRunNudge } from "@/components/FirstRunNudge";

const STATUSES = ["all", "sourced", "listed", "sold", "shipped"] as const;

function gbp(n: string | null) {
  if (n == null) return "—";
  return `£${parseFloat(n).toFixed(2)}`;
}

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; search?: string; sort?: string; incomplete?: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/");

  const sp = await searchParams;
  const status = sp.status === "all" || !sp.status ? null : sp.status;
  const sort = sp.sort === "price" || sp.sort === "brand" ? sp.sort : "date";
  const scope = userScope(userId);
  const [rows, totalCount] = await Promise.all([
    scope.listItems({
      status,
      search: sp.search ?? null,
      sort,
      incompleteOnly: sp.incomplete === "1",
    }),
    scope.countItems(),
  ]);
  const filtersApplied =
    !!status || !!sp.search?.trim() || sp.incomplete === "1";
  const isFirstRun = totalCount === 0;

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Inventory</h1>
          <p className="mt-1 text-sm text-gray-600">{rows.length} items</p>
        </div>
        <Link
          href="/inventory/new"
          className="rounded-md bg-black px-4 py-2 text-sm text-white"
        >
          Add item
        </Link>
      </header>

      <form className="flex flex-wrap gap-2 text-sm">
        <input
          type="search"
          name="search"
          defaultValue={sp.search ?? ""}
          placeholder="Search name, brand, category"
          className="min-w-[200px] flex-1 rounded-md border px-3 py-1.5"
        />
        <select
          name="status"
          defaultValue={sp.status ?? "all"}
          className="rounded-md border px-2 py-1.5"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          name="sort"
          defaultValue={sort}
          className="rounded-md border px-2 py-1.5"
        >
          <option value="date">Newest</option>
          <option value="price">Price</option>
          <option value="brand">Brand</option>
        </select>
        <label className="flex items-center gap-1.5 px-2 text-xs text-gray-600">
          <input
            type="checkbox"
            name="incomplete"
            value="1"
            defaultChecked={sp.incomplete === "1"}
          />
          Incomplete only
        </label>
        <button className="rounded-md border px-3 py-1.5">Apply</button>
      </form>

      {rows.length === 0 ? (
        isFirstRun ? (
          <FirstRunNudge variant="panel" />
        ) : (
          <p className="rounded-md border border-dashed p-8 text-center text-sm text-gray-500">
            {filtersApplied
              ? "No items match these filters."
              : "No items in this view."}
          </p>
        )
      ) : (
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b text-left text-xs uppercase text-gray-500">
              <th className="py-2 pr-4">Name</th>
              <th className="py-2 pr-4">Brand</th>
              <th className="py-2 pr-4">Size</th>
              <th className="py-2 pr-4">Status</th>
              <th className="py-2 pr-4 text-right">Cost</th>
              <th className="py-2 pr-4 text-right">Listed</th>
              <th className="py-2 pr-4 text-right">Sold</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b hover:bg-gray-50">
                <td className="py-2 pr-4">
                  <Link href={`/inventory/${r.id}`} className="underline">
                    {r.name}
                  </Link>
                </td>
                <td className="py-2 pr-4">{r.brand ?? "—"}</td>
                <td className="py-2 pr-4">{r.size ?? "—"}</td>
                <td className="py-2 pr-4">
                  <span className="rounded bg-gray-100 px-2 py-0.5 text-xs">
                    {r.status}
                  </span>
                </td>
                <td className="py-2 pr-4 text-right">{gbp(r.costPrice)}</td>
                <td className="py-2 pr-4 text-right">{gbp(r.listedPrice)}</td>
                <td className="py-2 pr-4 text-right">{gbp(r.soldPrice)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
