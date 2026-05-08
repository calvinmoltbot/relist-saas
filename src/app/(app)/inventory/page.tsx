import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { userScope } from "@/lib/db/scoped";
import { FirstRunNudge } from "@/components/FirstRunNudge";
import {
  ButtonLink,
  Card,
  PageHeader,
  StatusPill,
  ViewToggle,
} from "@/components/ui";
import { StatusTransitionButton } from "./StatusTransitionButton";
import { FiltersBar } from "./FiltersBar";
import { scoreItem, type FieldStatus } from "@/lib/inventory/completeness";

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "sourced", label: "Sourced" },
  { value: "listed", label: "Listed" },
  { value: "sold", label: "Sold" },
  { value: "shipped", label: "Shipped" },
];

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
    view?: string;
  }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/");

  const sp = await searchParams;

  const statusParam = sp.status ?? "listed";
  const status = statusParam === "all" ? null : statusParam;
  const sort = sp.sort === "price" || sp.sort === "brand" ? sp.sort : "date";
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const view: "table" | "grid" = sp.view === "grid" ? "grid" : "table";

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
  const showMissingCol = sp.incomplete === "1";
  const enriched: Row[] = rows.map((r) => {
    if (!showMissingCol) return r as unknown as Row;
    const { missing } = scoreItem({
      name: r.name,
      brand: r.brand,
      category: r.category,
      size: r.size,
      description: (r as { description?: string | null }).description ?? null,
      photoCount: Number((r as { photoCount?: number | null }).photoCount ?? 0),
      vintedUrl: (r as { vintedUrl?: string | null }).vintedUrl ?? null,
    });
    return { ...(r as unknown as Row), missing };
  });
  const filtersApplied =
    statusParam !== "listed" ||
    !!sp.search?.trim() ||
    sp.incomplete === "1";
  const isFirstRun = totalCount === 0;
  const showStart = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const showEnd = Math.min(page * PAGE_SIZE, total);

  function pageHref(n: number): string {
    const params = new URLSearchParams();
    if (statusParam !== "listed") params.set("status", statusParam);
    if (sp.search) params.set("search", sp.search);
    if (sp.sort && sp.sort !== "date") params.set("sort", sp.sort);
    if (sp.incomplete === "1") params.set("incomplete", "1");
    if (view === "grid") params.set("view", "grid");
    if (n > 1) params.set("page", String(n));
    const qs = params.toString();
    return qs ? `/inventory?${qs}` : "/inventory";
  }

  const subtitle =
    total === 0
      ? "0 items"
      : `Showing ${showStart}–${showEnd} of ${total}${
          totalCount > total ? ` · ${totalCount} total in account` : ""
        }`;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventory"
        subtitle={subtitle}
        actions={
          <ButtonLink href="/inventory/new" variant="primary" size="sm">
            + Add item
          </ButtonLink>
        }
      />

      <Card padded className="p-4">
        <FiltersBar
          initialSearch={sp.search ?? ""}
          initialStatus={statusParam}
          initialSort={sort}
          initialIncomplete={sp.incomplete === "1"}
          statusOptions={STATUS_OPTIONS}
        />
      </Card>

      <div className="flex items-center justify-end">
        <ViewToggle
          param="view"
          value={view}
          ariaLabel="Inventory layout"
          options={[
            { value: "table", label: "Table", icon: <TableIcon /> },
            { value: "grid", label: "Grid", icon: <GridIcon /> },
          ]}
        />
      </div>

      {rows.length === 0 ? (
        isFirstRun ? (
          <FirstRunNudge variant="panel" />
        ) : (
          <Card>
            <p className="py-10 text-center text-sm text-[var(--text-muted)]">
              {filtersApplied
                ? "No items match these filters. Try adjusting the search or status."
                : "No items in this view."}
            </p>
          </Card>
        )
      ) : view === "grid" ? (
        <GridView rows={enriched} />
      ) : (
        <TableView rows={enriched} showMissing={showMissingCol} />
      )}

      {rows.length > 0 && pageCount > 1 && (
        <nav className="flex items-center justify-between gap-3 pt-2 text-sm">
          {page > 1 ? (
            <Link
              href={pageHref(page - 1)}
              className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-card)] px-3 py-1.5 hover:bg-[var(--surface-muted)]"
            >
              ← Previous
            </Link>
          ) : (
            <span className="text-[var(--text-muted)]">← Previous</span>
          )}
          <span className="text-[var(--text-secondary)]">
            Page {page} of {pageCount}
          </span>
          {page < pageCount ? (
            <Link
              href={pageHref(page + 1)}
              className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-card)] px-3 py-1.5 hover:bg-[var(--surface-muted)]"
            >
              Next →
            </Link>
          ) : (
            <span className="text-[var(--text-muted)]">Next →</span>
          )}
        </nav>
      )}
    </div>
  );
}

type Row = {
  id: string;
  name: string;
  brand: string | null;
  category: string | null;
  size: string | null;
  status: string;
  costPrice: string | null;
  listedPrice: string | null;
  soldPrice: string | null;
  hasThumbnail: boolean;
  thumbnailUrl: string | null;
  /** Populated by the inventory page when `incomplete=1`. */
  missing?: FieldStatus[];
};

function Thumb({ row, size = 40 }: { row: Row; size?: number }) {
  const px = `${size}px`;
  if (row.hasThumbnail) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={row.thumbnailUrl ?? ""}
        alt=""
        loading="lazy"
        style={{ width: px, height: px }}
        className="rounded-[var(--radius-sm)] bg-[var(--surface-muted)] object-cover"
      />
    );
  }
  return (
    <div
      aria-hidden
      style={{ width: px, height: px }}
      className="flex items-center justify-center rounded-[var(--radius-sm)] bg-[var(--surface-muted)] text-[10px] text-[var(--text-muted)]"
    >
      no img
    </div>
  );
}

function TableView({
  rows,
  showMissing = false,
}: {
  rows: Row[];
  showMissing?: boolean;
}) {
  return (
    <Card padded={false} className="overflow-visible">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-[var(--border-subtle)] bg-[var(--surface-muted)]/40 text-left text-[11px] uppercase tracking-wide text-[var(--text-muted)]">
              <th className="w-16 py-3 pl-4 pr-2 font-medium">Thumbnail</th>
              <th className="py-3 pr-4 font-medium">Item</th>
              {showMissing ? (
                <th className="py-3 pr-4 font-medium">Missing</th>
              ) : (
                <>
                  <th className="py-3 pr-4 font-medium">Brand</th>
                  <th className="py-3 pr-4 font-medium">Size</th>
                </>
              )}
              <th className="py-3 pr-4 font-medium">Status</th>
              <th className="py-3 pr-4 text-right font-medium">Cost</th>
              <th className="py-3 pr-4 text-right font-medium">Listed</th>
              <th className="py-3 pr-4 text-right font-medium">Sold</th>
              <th className="py-3 pr-4 font-medium" aria-label="Actions"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.id}
                className="border-b border-[var(--border-subtle)] last:border-0 hover:bg-[var(--surface-muted)]/40"
              >
                <td className="py-3 pl-4 pr-2">
                  <Link
                    href={`/inventory/${r.id}`}
                    aria-label={`View ${r.name}`}
                    className="block"
                  >
                    <Thumb row={r} />
                  </Link>
                </td>
                <td className="py-3 pr-4">
                  <Link
                    href={`/inventory/${r.id}`}
                    className="font-medium text-[var(--text-primary)] hover:underline"
                  >
                    {r.name}
                  </Link>
                  {r.category && (
                    <div className="mt-0.5 text-xs text-[var(--text-muted)]">
                      {r.category}
                    </div>
                  )}
                </td>
                {showMissing ? (
                  <td className="py-3 pr-4">
                    <MissingChips itemId={r.id} missing={r.missing ?? []} />
                  </td>
                ) : (
                  <>
                    <td className="py-3 pr-4 text-[var(--text-secondary)]">
                      {r.brand ?? "—"}
                    </td>
                    <td className="py-3 pr-4 text-[var(--text-secondary)]">
                      {r.size ?? "—"}
                    </td>
                  </>
                )}
                <td className="py-3 pr-4">
                  <StatusPill status={r.status} />
                </td>
                <td className="py-3 pr-4 text-right tabular-nums text-[var(--text-secondary)]">
                  {gbp(r.costPrice)}
                </td>
                <td className="py-3 pr-4 text-right tabular-nums text-[var(--text-primary)]">
                  {gbp(r.listedPrice)}
                </td>
                <td className="py-3 pr-4 text-right tabular-nums text-[var(--text-secondary)]">
                  {gbp(r.soldPrice)}
                </td>
                <td className="py-3 pr-4">
                  <StatusTransitionButton
                    itemId={r.id}
                    status={r.status}
                    listedPrice={r.listedPrice}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function GridView({ rows }: { rows: Row[] }) {
  return (
    <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {rows.map((r) => (
        <li key={r.id}>
          <Card padded={false} className="overflow-hidden">
            <Link
              href={`/inventory/${r.id}`}
              aria-label={`View ${r.name}`}
              className="block"
            >
              <div className="aspect-square w-full overflow-hidden bg-[var(--surface-muted)]">
                {r.hasThumbnail ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={r.thumbnailUrl ?? ""}
                    alt=""
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs text-[var(--text-muted)]">
                    no img
                  </div>
                )}
              </div>
            </Link>
            <div className="space-y-2 p-3">
              <div className="flex items-start justify-between gap-2">
                <Link
                  href={`/inventory/${r.id}`}
                  className="line-clamp-2 text-sm font-medium text-[var(--text-primary)] hover:underline"
                >
                  {r.name}
                </Link>
                <StatusPill status={r.status} />
              </div>
              <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                <span className="truncate">
                  {r.brand ?? "—"}
                  {r.size ? ` · ${r.size}` : ""}
                </span>
                <span className="tabular-nums text-[var(--text-primary)]">
                  {gbp(r.listedPrice)}
                </span>
              </div>
              <div className="flex justify-end">
                <StatusTransitionButton
                    itemId={r.id}
                    status={r.status}
                    listedPrice={r.listedPrice}
                  />
              </div>
            </div>
          </Card>
        </li>
      ))}
    </ul>
  );
}

function MissingChips({
  itemId,
  missing,
}: {
  itemId: string;
  missing: FieldStatus[];
}) {
  if (missing.length === 0) {
    return (
      <span className="inline-flex items-center rounded-[var(--radius-sm)] bg-[var(--accent-emerald-soft)] px-1.5 py-0.5 text-[11px] font-medium text-[var(--accent-emerald-soft-fg)]">
        Complete
      </span>
    );
  }
  return (
    <ul className="flex flex-wrap gap-1">
      {missing.map((m) => (
        <li key={m.field}>
          <Link
            href={`/inventory/${itemId}?focus=${m.field}`}
            title={`+${m.weight} pts · ${m.hint}`}
            className="inline-flex items-center gap-1 rounded-[var(--radius-sm)] bg-[var(--accent-amber-soft)] px-1.5 py-0.5 text-[11px] font-medium text-[var(--accent-amber-soft-fg)] hover:bg-[var(--accent-amber)]/30"
          >
            <span className="tabular-nums opacity-80">+{m.weight}</span>
            <span>{m.label}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function TableIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden
    >
      <rect x="2" y="3" width="12" height="10" rx="1.5" />
      <path d="M2 7h12M2 11h12" />
    </svg>
  );
}

function GridIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden
    >
      <rect x="2" y="2" width="5" height="5" rx="1" />
      <rect x="9" y="2" width="5" height="5" rx="1" />
      <rect x="2" y="9" width="5" height="5" rx="1" />
      <rect x="9" y="9" width="5" height="5" rx="1" />
    </svg>
  );
}
