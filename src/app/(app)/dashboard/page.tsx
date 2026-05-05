import Link from "next/link";
import Image from "next/image";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { computeProfit } from "@/lib/analytics/profit";
import { computeDashboardSparks } from "@/lib/analytics/dashboard-sparks";
import { userScope } from "@/lib/db/scoped";
import { hasSampleData } from "@/lib/sample-data";
import { FirstRunNudge } from "@/components/FirstRunNudge";
import {
  ButtonLink,
  Card,
  CardHeader,
  PageHeader,
  Tile,
} from "@/components/ui";
import { clearSampleDataAction } from "./sample-data-actions";

const gbp = (n: number) => `£${n.toFixed(2)}`;
const num0 = (n: number) => n.toLocaleString("en-GB");
const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);

function deltaPct(spark: number[]): { label: string; dir: "up" | "down" | "flat" } | null {
  if (spark.length < 14) return null;
  const half = Math.floor(spark.length / 2);
  const recent = sum(spark.slice(half));
  const prior = sum(spark.slice(0, half));
  if (prior === 0 && recent === 0) return null;
  if (prior === 0) return { label: "new", dir: "up" };
  const change = ((recent - prior) / prior) * 100;
  if (Math.abs(change) < 1) return { label: "±0%", dir: "flat" };
  const sign = change > 0 ? "+" : "−";
  return {
    label: `${sign}${Math.abs(change).toFixed(1)}%`,
    dir: change > 0 ? "up" : "down",
  };
}

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) redirect("/");

  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const [month, allTime, itemCount, sampleLoaded, sparks] = await Promise.all([
    computeProfit(userId, { from, to }),
    computeProfit(userId, { from: null, to: null }),
    userScope(userId).countItems(),
    hasSampleData(userId),
    computeDashboardSparks(userId),
  ]);

  const isFirstRun = itemCount === 0;

  const revDelta = deltaPct(sparks.revenue);
  const profitDelta = deltaPct(sparks.profit);
  const stockDelta = deltaPct(sparks.listed);

  const topProfit = allTime.itemProfits.slice(0, 8);
  const hasThumb = await userScope(userId).getItemHasThumbnailMap(
    topProfit.map((p) => p.id),
  );
  const topThumbs = topProfit.map((p) => ({ ...p, hasThumbnail: hasThumb.get(p.id) ?? false }));

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        subtitle={now.toLocaleString("en-GB", { month: "long", year: "numeric" })}
        actions={
          <>
            <ButtonLink href="/profit" variant="secondary" size="sm">Profit</ButtonLink>
            <ButtonLink href="/inventory/new" size="sm">+ Add item</ButtonLink>
          </>
        }
      />

      {sampleLoaded && (
        <section className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-md)] border border-[var(--accent-amber)]/30 bg-[var(--accent-amber-soft)] px-4 py-3 text-sm text-[var(--accent-amber-soft-fg)]">
          <span>
            Sample data is loaded in your account. Clear it once you&apos;re ready to work with real items only.
          </span>
          <form action={clearSampleDataAction}>
            <button
              type="submit"
              className="rounded-[var(--radius-md)] border border-[var(--accent-amber)]/40 bg-white px-3 py-1.5 text-xs font-medium text-[var(--accent-amber-soft-fg)] hover:bg-[var(--surface-muted)]"
            >
              Clear sample data
            </button>
          </form>
        </section>
      )}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Tile
          label="Revenue this month"
          value={gbp(month.summary.revenue)}
          sub={`${month.summary.itemsSold} sold`}
          tone="brand"
          icon={<MoneyIcon />}
          delta={revDelta?.label}
          deltaDirection={revDelta?.dir}
          spark={sparks.revenue}
        />
        <Tile
          label="Net profit this month"
          value={gbp(month.summary.netProfit)}
          sub={`${month.summary.avgMargin}% avg margin`}
          tone="emerald"
          icon={<TrendIcon />}
          delta={profitDelta?.label}
          deltaDirection={profitDelta?.dir}
          spark={sparks.profit}
        />
        <Tile
          label="Stock value (listed)"
          value={gbp(allTime.summary.stockListedValue)}
          sub={`${allTime.summary.itemsListed} listed`}
          tone="amber"
          icon={<StackIcon />}
          delta={stockDelta?.label}
          deltaDirection={stockDelta?.dir}
          spark={sparks.listed}
        />
        <Tile
          label="Items sourced"
          value={num0(allTime.summary.itemsSourced)}
          sub="ready to list"
          tone="violet"
          icon={<PlusIcon />}
          spark={sparks.sourced}
        />
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card padded={false}>
            <div className="flex items-center justify-between p-5 pb-3">
              <h2 className="font-display text-lg font-semibold">Top profit (lifetime)</h2>
              <Link
                href="/profit"
                className="text-xs font-medium text-[var(--brand)] hover:underline"
              >
                View all →
              </Link>
            </div>
            {topThumbs.length === 0 ? (
              <p className="px-5 pb-5 text-sm text-[var(--text-muted)]">
                Nothing sold yet. Add items at{" "}
                <Link href="/inventory/new" className="text-[var(--brand)] underline">
                  Inventory → New
                </Link>
                .
              </p>
            ) : (
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-y border-[var(--border-subtle)] bg-[var(--surface-muted)] text-left text-[11px] uppercase tracking-wide text-[var(--text-muted)]">
                    <th className="py-2 pl-5 pr-3 font-medium">Item</th>
                    <th className="py-2 pr-3 font-medium">Brand</th>
                    <th className="py-2 pr-3 text-right font-medium">Sold</th>
                    <th className="py-2 pr-5 text-right font-medium">Net</th>
                  </tr>
                </thead>
                <tbody>
                  {topThumbs.map((p) => (
                    <tr
                      key={p.id}
                      className="border-b border-[var(--border-subtle)] last:border-b-0 hover:bg-[var(--surface-muted)]/60"
                    >
                      <td className="py-2.5 pl-5 pr-3">
                        <Link href={`/inventory/${p.id}`} className="flex items-center gap-3">
                          <span className="relative inline-flex h-9 w-9 shrink-0 overflow-hidden rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--surface-inset)]">
                            {p.hasThumbnail ? (
                              <Image
                                src={`/api/inventory/thumb/${p.id}`}
                                alt=""
                                width={36}
                                height={36}
                                className="h-full w-full object-cover"
                                unoptimized
                              />
                            ) : (
                              <span className="m-auto text-[9px] uppercase text-[var(--text-muted)]">no img</span>
                            )}
                          </span>
                          <span className="flex items-center gap-2">
                            <span className="font-medium text-[var(--text-primary)] hover:underline">
                              {p.name}
                            </span>
                            {p.acquisitionType === "own" && (
                              <span
                                className="inline-flex items-center rounded-full border border-[var(--border-subtle)] bg-[var(--surface-inset)] px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[var(--text-muted)]"
                                title="From your own goods"
                              >
                                Own
                              </span>
                            )}
                          </span>
                        </Link>
                      </td>
                      <td className="py-2.5 pr-3 text-[var(--text-secondary)]">{p.brand ?? "—"}</td>
                      <td className="py-2.5 pr-3 text-right tabular-nums">{gbp(p.sold)}</td>
                      <td className="py-2.5 pr-5 text-right font-semibold tabular-nums text-[var(--accent-emerald-soft-fg)]">
                        {gbp(p.netProfit)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </div>

        <div>
          {isFirstRun ? (
            <FirstRunNudge variant="panel" />
          ) : (
            <Card>
              <CardHeader title="Quick actions" description="The fast path to common tasks." />
              <ul className="mt-4 space-y-2 text-sm">
                <ActionRow href="/inventory/new" label="Add a new item" />
                <ActionRow href="/plan" label="See today's plan" />
                <ActionRow href="/inventory?status=listed" label="Browse listed items" />
                <ActionRow href="/expenses" label="Log an expense" />
              </ul>
            </Card>
          )}
        </div>
      </section>
    </div>
  );
}

function ActionRow({ href, label }: { href: string; label: string }) {
  return (
    <li>
      <Link
        href={href}
        className="flex items-center justify-between rounded-[var(--radius-md)] border border-[var(--border-subtle)] px-3 py-2 hover:bg-[var(--surface-muted)]"
      >
        <span className="text-[var(--text-primary)]">{label}</span>
        <span className="text-[var(--text-muted)]" aria-hidden>›</span>
      </Link>
    </li>
  );
}

/* ----- Icons (inline so we don't pull a lib) ----- */
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
function StackIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      <path d="M9 2L2 5.5l7 3.5 7-3.5L9 2zM2 9l7 3.5L16 9M2 12.5L9 16l7-3.5" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}
function PlusIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      <path d="M9 4v10M4 9h10" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}
