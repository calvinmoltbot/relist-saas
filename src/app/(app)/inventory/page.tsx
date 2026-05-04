import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { userScope } from "@/lib/db/scoped";
import { FirstRunNudge } from "@/components/FirstRunNudge";

const STATUSES = ["all", "sourced", "listed", "sold", "shipped"] as const;
const PAGE_SIZE = 25;

function gbp(n: string | null) {
  if (n == null) return "—";
  return `£${parseFloat(n).toFixed(2)}`;
}

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    search?: string;
    sort?: string;
    incomplete?: string;
    page?: string;
  }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/");

  const sp = await searchParams;

  // Default filter: listed (active inventory). Empty string is treated the
  // same as "listed" — only an explicit ?status=all bypasses to all.
  const statusParam = sp.status ?? "listed";
  const status = statusParam === "all" ? null : statusParam;
  const sort = sp.sort === "price" || sp.sort === "brand" ? sp.sort : "date";
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);

  const scope = userScope(userId);
  const [result, totalCount] = await Promise.all([
    scope.listItems({
      status,
      search: sp.search ?? null,
      sort,
      incompleteOnly: sp.incomplete === "1",
      page,
      pageSize: PAGE_SIZE,
    }),
    scope.countItems(),
  ]);

  const { rows, total, pageCount } = result;
  const filtersApplied =
    statusParam !== "listed" ||
    !!sp.search?.trim() ||
    sp.incomplete === "1";
  const isFirstRun = totalCount === 0;
  const showStart = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const showEnd = Math.min(page * PAGE_SIZE, total);

  // Build a query-string for prev/next that preserves filters
  function pageHref(n: number): string {
    const params = new URLSearchParams();
    if (statusParam !== "listed") params.set("status", statusParam);
    if (sp.search) params.set("search", sp.search);
    if (sp.sort && sp.sort !== "date") params.set("sort", sp.sort);
    if (sp.incomplete === "1") params.set("incomplete", "1");
    if (n > 1) params.set("page", String(n));
    const qs = params.toString();
    return qs ? `/inventory?${qs}` : "/inventory";
  }

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Inventory</h1>
          <p className="mt-1 text-sm text-gray-600">
            {total === 0
              ? "0 items"
              : `Showing ${showStart}–${showEnd} of ${total}`}
            {totalCount > total && (
              <span className="text-gray-400"> · {totalCount} total in account</span>
            )}
          </p>
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
          defaultValue={statusParam}
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
        <>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase text-gray-500">
                <th className="w-12 py-2 pr-2"></th>
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
                  <td className="py-2 pr-2">
                    <Link
                      href={`/inventory/${r.id}`}
                      aria-label={`View ${r.name}`}
                      className="block"
                    >
                      {r.hasThumbnail ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={`/api/inventory/thumb/${r.id}`}
                          alt=""
                          loading="lazy"
                          className="h-10 w-10 rounded object-cover bg-gray-100"
                        />
                      ) : (
                        <div
                          aria-hidden
                          className="h-10 w-10 rounded bg-gray-100 flex items-center justify-center text-[10px] text-gray-400"
                        >
                          no img
                        </div>
                      )}
                    </Link>
                  </td>
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

          {pageCount > 1 && (
            <nav className="flex items-center justify-between gap-3 pt-2 text-sm">
              {page > 1 ? (
                <Link
                  href={pageHref(page - 1)}
                  className="rounded-md border px-3 py-1.5"
                >
                  ← Previous
                </Link>
              ) : (
                <span className="text-gray-400">← Previous</span>
              )}
              <span className="text-gray-600">
                Page {page} of {pageCount}
              </span>
              {page < pageCount ? (
                <Link
                  href={pageHref(page + 1)}
                  className="rounded-md border px-3 py-1.5"
                >
                  Next →
                </Link>
              ) : (
                <span className="text-gray-400">Next →</span>
              )}
            </nav>
          )}
        </>
      )}
    </div>
  );
}
