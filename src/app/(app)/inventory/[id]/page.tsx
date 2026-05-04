import { auth } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { userScope } from "@/lib/db/scoped";
import { Card, StatusPill } from "@/components/ui";
import { ItemActions } from "./actions";
import { ItemPhotos } from "./photos";
import { AcquisitionChip } from "./AcquisitionChip";

function gbp(n: string | null) {
  return n == null ? "—" : `£${parseFloat(n).toFixed(2)}`;
}

function formatDate(d: Date | string | null) {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const CONDITION_LABEL: Record<string, string> = {
  new: "New",
  like_new: "Like new",
  good: "Good",
  fair: "Fair",
  very_good: "Very good",
};

export default async function ItemDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/");

  const { id } = await params;
  const scope = userScope(userId);
  const item = await scope.getItem(id);
  if (!item) notFound();

  const txns = await scope.listTransactionsForItem(id);

  const subtitleParts = [item.brand, item.category, item.size].filter(Boolean);

  return (
    <div className="space-y-4">
      {/* Header — compact, single row of meta + status */}
      <header className="space-y-1">
        <Link
          href="/inventory"
          className="inline-flex items-center gap-1 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          <span aria-hidden>←</span> Inventory
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="font-display text-xl font-semibold tracking-tight text-[var(--text-primary)] md:text-2xl">
              {item.name}
            </h1>
            {subtitleParts.length > 0 && (
              <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
                {subtitleParts.join(" · ")}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <StatusPill status={item.status} size="md" />
            <AcquisitionChip id={item.id} initial={item.acquisitionType} />
          </div>
        </div>
      </header>

      {/* Hero row: photos (left) + facts/actions (right) */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Card>
          <ItemPhotos itemId={item.id} initialPhotos={item.photoUrls ?? []} />
        </Card>

        <div className="space-y-3">
          <Card>
            <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
              <Row label="Cost" value={gbp(item.costPrice)} />
              <Row label="Listed" value={gbp(item.listedPrice)} />
              <Row label="Sold" value={gbp(item.soldPrice)} />
              <Row
                label="Condition"
                value={
                  item.condition
                    ? CONDITION_LABEL[item.condition] ?? item.condition
                    : "—"
                }
              />
              <Row label="Listed at" value={formatDate(item.listedAt)} />
              <Row label="Sold at" value={formatDate(item.soldAt)} />
              {item.shippedAt && (
                <Row label="Shipped at" value={formatDate(item.shippedAt)} />
              )}
            </dl>
          </Card>

          <Card>
            <ItemActions
              id={item.id}
              status={item.status}
              costPrice={item.costPrice}
              listedPrice={item.listedPrice}
              soldPrice={item.soldPrice}
            />
          </Card>
        </div>
      </div>

      {/* Description — below the fold */}
      {item.description && (
        <Card>
          <h2 className="text-sm font-semibold text-[var(--text-secondary)]">
            Description
          </h2>
          <p className="mt-2 whitespace-pre-wrap text-sm text-[var(--text-primary)]">
            {item.description}
          </p>
        </Card>
      )}

      {/* Transactions — below the fold */}
      <Card padded={false}>
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-5 py-4">
          <h2 className="text-sm font-semibold text-[var(--text-secondary)]">
            Transactions
          </h2>
          <span className="text-xs text-[var(--text-muted)]">
            {txns.length} {txns.length === 1 ? "entry" : "entries"}
          </span>
        </div>
        {txns.length === 0 ? (
          <p className="px-5 py-6 text-sm text-[var(--text-muted)]">
            No transactions yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border-subtle)] bg-[var(--surface-muted)] text-left text-[11px] uppercase tracking-wide text-[var(--text-muted)]">
                  <th className="px-5 py-2.5 font-medium">Type</th>
                  <th className="px-3 py-2.5 font-medium">Gross</th>
                  <th className="px-3 py-2.5 font-medium">Shipping</th>
                  <th className="px-3 py-2.5 font-medium">Profit</th>
                  <th className="px-5 py-2.5 font-medium">Completed</th>
                </tr>
              </thead>
              <tbody>
                {txns.map((t, i) => {
                  const profitNum =
                    t.profit != null ? parseFloat(t.profit) : null;
                  return (
                    <tr
                      key={t.id}
                      className={
                        i === txns.length - 1
                          ? ""
                          : "border-b border-[var(--border-subtle)]"
                      }
                    >
                      <td className="px-5 py-3">
                        <span className="inline-flex items-center rounded-[var(--radius-sm)] bg-[var(--surface-muted)] px-2 py-0.5 text-xs capitalize text-[var(--text-secondary)]">
                          {t.transactionType.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-[var(--text-primary)]">
                        {gbp(t.grossPrice)}
                      </td>
                      <td className="px-3 py-3 text-[var(--text-secondary)]">
                        {gbp(t.shippingCost)}
                      </td>
                      <td
                        className={`px-3 py-3 font-medium ${
                          profitNum == null
                            ? "text-[var(--text-secondary)]"
                            : profitNum >= 0
                              ? "text-[var(--accent-emerald-soft-fg)]"
                              : "text-[var(--accent-rose-soft-fg)]"
                        }`}
                      >
                        {gbp(t.profit)}
                      </td>
                      <td className="px-5 py-3 text-xs text-[var(--text-muted)]">
                        {formatDate(t.completedAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm font-medium text-[var(--text-primary)]">
        {value}
      </dd>
    </div>
  );
}
