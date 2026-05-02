import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { computeHealth } from "@/lib/analytics/health";

const gbp = (n: number) => `£${n.toFixed(0)}`;

const BUCKETS: Array<{ key: "0-3" | "4-7" | "8-14" | "15-21" | "22+"; label: string; color: string }> = [
  { key: "0-3", label: "Just listed", color: "bg-emerald-500" },
  { key: "4-7", label: "This week", color: "bg-lime-500" },
  { key: "8-14", label: "2 weeks", color: "bg-amber-500" },
  { key: "15-21", label: "Over 2 weeks", color: "bg-orange-500" },
  { key: "22+", label: "Really stale", color: "bg-red-500" },
];

const PACE_BAND_LABEL: Record<"green" | "amber" | "red", string> = {
  green: "On pace",
  amber: "Slipping",
  red: "Behind",
};

const PACE_BAND_TONE: Record<"green" | "amber" | "red", string> = {
  green: "text-emerald-700 bg-emerald-50",
  amber: "text-amber-700 bg-amber-50",
  red: "text-red-700 bg-red-50",
};

export default async function HealthPage() {
  const { userId } = await auth();
  if (!userId) redirect("/");

  const h = await computeHealth(userId);
  const totalAging = Object.values(h.aging.buckets).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold">Inventory health</h1>
        <p className="mt-1 text-sm text-gray-600">
          How fresh, complete and well-paced your listings are.
        </p>
      </header>

      {/* Headline tiles */}
      <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Tile
          label="Active listings"
          value={String(h.aging.totalUnsold)}
          sub={`${h.completeness.healthyPct}% green`}
        />
        <Tile
          label="Avg completeness"
          value={`${h.completeness.averageScore}/100`}
          sub={`${h.completeness.bands.green} green · ${h.completeness.bands.amber} amber · ${h.completeness.bands.red} red`}
        />
        <Tile
          label="Stale (15+ days)"
          value={gbp(h.aging.stockAtRisk)}
          sub="value tied up"
        />
        <Tile
          label="This week's listings"
          value={`${h.cadence.currentCount} / ${h.cadence.target}`}
          sub={PACE_BAND_LABEL[h.cadence.paceBand]}
          tone={PACE_BAND_TONE[h.cadence.paceBand]}
        />
      </section>

      {/* Cadence + Aging */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Listing cadence" description="Last 4 weeks vs your weekly target.">
          <div className="space-y-2">
            {h.cadence.weeks.map((w) => {
              const max = Math.max(h.cadence.target, ...h.cadence.weeks.map((x) => x.count), 1);
              const pct = (w.count / max) * 100;
              return (
                <div key={w.weekStart} className="flex items-center gap-3 text-sm">
                  <span className={`w-20 text-xs ${w.current ? "font-medium" : "text-gray-500"}`}>
                    {w.current ? "This week" : new Date(w.weekStart).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                  </span>
                  <div className="flex-1 h-5 rounded bg-gray-100">
                    <div
                      className={`h-full rounded ${w.current ? "bg-blue-500" : "bg-gray-400"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-10 text-right tabular-nums">{w.count}</span>
                </div>
              );
            })}
            <p className="pt-2 text-xs text-gray-600">
              Weekly average over the last 3 weeks: {h.cadence.weeklyAverage}
            </p>
          </div>
        </Card>

        <Card title="Inventory aging" description="How long each unsold item has been listed.">
          {totalAging === 0 ? (
            <p className="text-sm text-gray-500">No active inventory.</p>
          ) : (
            <>
              <div className="mb-4 flex h-6 overflow-hidden rounded bg-gray-100">
                {BUCKETS.map((b) => {
                  const count = h.aging.buckets[b.key];
                  if (!count) return null;
                  const pct = (count / totalAging) * 100;
                  return (
                    <div
                      key={b.key}
                      className={b.color}
                      style={{ width: `${pct}%` }}
                      title={`${b.label}: ${count} items`}
                    />
                  );
                })}
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                {BUCKETS.map((b) => (
                  <div key={b.key} className="text-xs">
                    <div className="flex items-center gap-1.5">
                      <div className={`h-2 w-2 rounded-full ${b.color}`} />
                      <span className="text-gray-600">{b.label}</span>
                    </div>
                    <p className="mt-0.5 text-sm font-medium">{h.aging.buckets[b.key]}</p>
                    <p className="text-xs text-gray-500">{gbp(h.aging.bucketValues[b.key])}</p>
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>
      </div>

      {/* Needs refresh + Completeness biggest impact */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card
          title="Needs a refresh"
          description="Listings most overdue an edit, weighted by completeness gap and price at risk."
        >
          {h.needsRefresh.length === 0 ? (
            <p className="text-sm text-gray-500">Nothing is overdue.</p>
          ) : (
            <ul className="divide-y">
              {h.needsRefresh.map((r) => (
                <li key={r.itemId} className="flex items-center justify-between py-2 text-sm">
                  <Link href={`/inventory/${r.itemId}`} className="min-w-0 flex-1 truncate underline">
                    {r.name}
                  </Link>
                  <div className="ml-3 flex shrink-0 items-center gap-3 text-xs text-gray-600">
                    <span>{r.score}/100</span>
                    <span>{r.daysSinceEdit}d</span>
                    <span className="tabular-nums">{gbp(r.listedPrice)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card
          title="Biggest completeness wins"
          description="Fix one field to bump these the most."
        >
          {h.completeness.biggestImpact.length === 0 ? (
            <p className="text-sm text-gray-500">Everything is complete.</p>
          ) : (
            <ul className="divide-y">
              {h.completeness.biggestImpact.map((b) => (
                <li key={b.itemId} className="flex items-center justify-between py-2 text-sm">
                  <Link href={`/inventory/${b.itemId}`} className="min-w-0 flex-1 truncate underline">
                    {b.itemId}
                  </Link>
                  <div className="ml-3 flex shrink-0 items-center gap-3 text-xs">
                    <span className="text-gray-600">{b.score}/100</span>
                    <span className="rounded bg-amber-50 px-1.5 py-0.5 text-amber-700">
                      +{b.missingWeight} {b.missingLabel}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* Dead stock + Category mix */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card
          title="Dead stock"
          description="Listed for more than a week — candidates to reprice or relist."
        >
          {h.deadStock.length === 0 ? (
            <p className="text-sm text-emerald-700">Nothing past the refresh threshold.</p>
          ) : (
            <ul className="divide-y">
              {h.deadStock.slice(0, 15).map((d) => (
                <li key={d.id} className="flex items-center justify-between py-2 text-sm">
                  <Link href={`/inventory/${d.id}`} className="min-w-0 flex-1 truncate underline">
                    {d.name}
                  </Link>
                  <div className="ml-3 flex shrink-0 items-center gap-3 text-xs text-gray-600">
                    {d.brand && <span>{d.brand}</span>}
                    <span className="tabular-nums">{gbp(d.listedPrice)}</span>
                    <span
                      className={`rounded px-1.5 py-0.5 ${
                        d.daysListed >= 22
                          ? "bg-red-50 text-red-700"
                          : d.daysListed >= 15
                            ? "bg-orange-50 text-orange-700"
                            : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      {d.daysListed}d
                    </span>
                  </div>
                </li>
              ))}
              {h.deadStock.length > 15 && (
                <li className="py-2 text-center text-xs text-gray-500">
                  + {h.deadStock.length - 15} more
                </li>
              )}
            </ul>
          )}
        </Card>

        <Card
          title="Where your stock lives"
          description="Active inventory grouped by category."
        >
          {h.categoryMix.length === 0 ? (
            <p className="text-sm text-gray-500">No active inventory.</p>
          ) : (
            <ul className="space-y-1.5">
              {h.categoryMix.slice(0, 10).map((g) => (
                <li key={g.key} className="text-sm">
                  <div className="flex items-center justify-between">
                    <span className="truncate">{g.key === "—" ? "Uncategorised" : g.key}</span>
                    <span className="ml-3 text-xs text-gray-600">
                      {g.count} · {gbp(g.valueTiedUp)}
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 rounded bg-gray-100">
                    <div
                      className="h-full rounded bg-gray-500"
                      style={{ width: `${g.pctOfCount}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

function Tile({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: string;
}) {
  return (
    <div className="rounded-md border p-4">
      <div className="text-xs uppercase text-gray-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
      {sub && (
        <div
          className={`mt-1 inline-block rounded px-1.5 text-xs ${tone ?? "text-gray-500"}`}
        >
          {sub}
        </div>
      )}
    </div>
  );
}

function Card({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-md border p-4">
      <h2 className="text-sm font-medium">{title}</h2>
      {description && <p className="mt-0.5 text-xs text-gray-500">{description}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}
