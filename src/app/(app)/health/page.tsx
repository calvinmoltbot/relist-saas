import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { computeHealth } from "@/lib/analytics/health";
import { userScope } from "@/lib/db/scoped";
import { FirstRunNudge } from "@/components/FirstRunNudge";
import { Card, CardHeader, PageHeader, Tile } from "@/components/ui";
import { CadenceChart } from "./CadenceChart";

const gbp = (n: number) => `£${Math.round(n).toLocaleString("en-GB")}`;

type AgingKey = "0-3" | "4-7" | "8-14" | "15-21" | "22+";

const BUCKETS: Array<{
  key: AgingKey;
  label: string;
  bg: string;
  dot: string;
  text: string;
}> = [
  {
    key: "0-3",
    label: "Just listed",
    bg: "bg-[var(--accent-emerald)]",
    dot: "bg-[var(--accent-emerald)]",
    text: "text-[var(--accent-emerald-soft-fg)]",
  },
  {
    key: "4-7",
    label: "This week",
    bg: "bg-lime-500",
    dot: "bg-lime-500",
    text: "text-lime-800",
  },
  {
    key: "8-14",
    label: "2 weeks",
    bg: "bg-[var(--accent-amber)]",
    dot: "bg-[var(--accent-amber)]",
    text: "text-[var(--accent-amber-soft-fg)]",
  },
  {
    key: "15-21",
    label: "Over 2 weeks",
    bg: "bg-orange-500",
    dot: "bg-orange-500",
    text: "text-orange-800",
  },
  {
    key: "22+",
    label: "Really stale",
    bg: "bg-[var(--accent-rose)]",
    dot: "bg-[var(--accent-rose)]",
    text: "text-[var(--accent-rose-soft-fg)]",
  },
];

const PACE_TONE: Record<"green" | "amber" | "red", "emerald" | "amber" | "rose"> = {
  green: "emerald",
  amber: "amber",
  red: "rose",
};

const PACE_LABEL: Record<"green" | "amber" | "red", string> = {
  green: "On pace",
  amber: "Slipping",
  red: "Behind",
};

const HEALTH_TONE = (
  band: "good" | "watch" | "bad",
): "emerald" | "amber" | "rose" =>
  band === "good" ? "emerald" : band === "watch" ? "amber" : "rose";

function scoreBand(score: number): "good" | "watch" | "bad" {
  if (score >= 80) return "good";
  if (score >= 50) return "watch";
  return "bad";
}

function dayBucket(days: number): AgingKey {
  if (days <= 3) return "0-3";
  if (days <= 7) return "4-7";
  if (days <= 14) return "8-14";
  if (days <= 21) return "15-21";
  return "22+";
}

export default async function HealthPage() {
  const { userId } = await auth();
  if (!userId) redirect("/");

  const scope = userScope(userId);
  const [h, itemCount] = await Promise.all([
    computeHealth(userId),
    scope.countItems(),
  ]);

  const isFirstRun = itemCount === 0;
  const totalAging = Object.values(h.aging.buckets).reduce((a, b) => a + b, 0);

  // Enrich topGaps rows with item names (one round-trip).
  const impactIds = h.completeness.topGaps.map((g) => g.itemId);
  const nameMap = await scope.getItemNamesByIds(impactIds);

  const paceTone = PACE_TONE[h.cadence.paceBand];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Inventory health"
        subtitle="A weekly pulse on the quality, freshness and value of your live stock."
        actions={
          <span className="text-xs text-[var(--text-muted)]">
            Refresh data ·{" "}
            {new Date().toLocaleString("en-GB", {
              day: "numeric",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        }
      />

      {isFirstRun ? (
        <FirstRunNudge
          variant="panel"
          heading="Nothing to score yet"
          body="Health metrics need active listings. Add an item and check back."
        />
      ) : (
        <>
      {/* Headline tiles */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Tile
          label="Active listings"
          value={String(h.aging.totalUnsold)}
          sub={`${h.completeness.bands.green} green · ${h.completeness.bands.amber} amber · ${h.completeness.bands.red} red`}
          tone="emerald"
          icon={<CheckIcon />}
        />
        <Tile
          label="Avg completeness"
          value={`${h.completeness.averageScore}/100`}
          sub={`${h.completeness.healthyPct}% in the green band`}
          tone={HEALTH_TONE(scoreBand(h.completeness.averageScore))}
          icon={<GaugeIcon />}
        />
        <Tile
          label="Stale (15+ days) £"
          value={gbp(h.aging.stockAtRisk)}
          sub="value tied up in old listings"
          tone="rose"
          icon={<HourglassIcon />}
        />
        <Tile
          label="This week's listings"
          value={`${h.cadence.currentCount} / ${h.cadence.target}`}
          sub={`${PACE_LABEL[h.cadence.paceBand]} · ${Math.round(h.cadence.pace * 100)}% of pace`}
          tone={paceTone}
          icon={<BoltIcon />}
        />
      </section>

      {/* Cadence + Aging + Needs-refresh row */}
      <section className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader
            title="Listing cadence"
            description="Last 4 weeks vs your weekly target."
            action={
              <span className="text-xs text-[var(--text-muted)]">
                Avg {h.cadence.weeklyAverage}/wk
              </span>
            }
          />
          <div className="mt-4">
            {totalAging === 0 && h.cadence.weeks.every((w) => w.count === 0) ? (
              <p className="py-8 text-center text-sm text-[var(--text-muted)]">
                Nothing listed in the last four weeks.
              </p>
            ) : (
              <CadenceChart weeks={h.cadence.weeks} target={h.cadence.target} />
            )}
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Inventory aging"
            description="How long each unsold item has been listed."
            action={
              <span className="text-xs text-[var(--text-muted)]">
                {totalAging} active
              </span>
            }
          />

          {totalAging === 0 ? (
            <p className="mt-6 text-sm text-[var(--text-muted)]">
              No active inventory.
            </p>
          ) : (
            <>
              <div className="mt-4 flex h-7 overflow-hidden rounded-[var(--radius-md)] bg-[var(--surface-inset)]">
                {BUCKETS.map((b) => {
                  const count = h.aging.buckets[b.key];
                  if (!count) return null;
                  const pct = (count / totalAging) * 100;
                  return (
                    <div
                      key={b.key}
                      className={b.bg}
                      style={{ width: `${pct}%` }}
                      title={`${b.label}: ${count} items`}
                    />
                  );
                })}
              </div>
              <ul className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-5">
                {BUCKETS.map((b) => {
                  const count = h.aging.buckets[b.key];
                  return (
                    <li key={b.key} className="text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <span className={`h-2 w-2 rounded-full ${b.dot}`} />
                        <span className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
                          {b.label}
                        </span>
                      </div>
                      <p className="mt-1 text-base font-semibold tabular-nums text-[var(--text-primary)]">
                        {count}
                      </p>
                      <p className="text-[11px] tabular-nums text-[var(--text-muted)]">
                        {gbp(h.aging.bucketValues[b.key])}
                      </p>
                    </li>
                  );
                })}
              </ul>
              <p className="mt-4 text-xs text-[var(--text-muted)]">
                {gbp(h.aging.stockAtRisk)} tied up in inventory listed 15+ days.
              </p>
            </>
          )}
        </Card>

        <Card>
          <CardHeader
            title="Needs a refresh"
            description="Most overdue listings, weighted by gap and price."
          />
          {h.needsRefresh.length === 0 ? (
            <p className="mt-6 text-sm text-[var(--text-muted)]">
              Nothing is overdue. Nice work.
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-[var(--border-subtle)]">
              {h.needsRefresh.slice(0, 5).map((r) => {
                const band = scoreBand(r.score);
                return (
                  <li key={r.itemId} className="py-2.5">
                    <Link
                      href={`/inventory/${r.itemId}`}
                      className="group flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-[var(--text-primary)] group-hover:underline">
                          {r.name}
                        </p>
                        <p className="text-xs text-[var(--text-muted)]">
                          {r.daysSinceEdit}d since edit ·{" "}
                          <span className="tabular-nums">
                            {gbp(r.listedPrice)}
                          </span>
                        </p>
                      </div>
                      <ScoreBadge score={r.score} band={band} />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
          {h.needsRefresh.length > 5 && (
            <Link
              href="/inventory?status=listed"
              className="mt-3 block text-center text-xs font-medium text-[var(--brand)] hover:underline"
            >
              View all {h.needsRefresh.length} →
            </Link>
          )}
        </Card>
      </section>

      {/* Biggest wins + Dead stock + Where stock lives */}
      <section className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader
            title="Biggest completeness wins"
            description="Fix one field to bump these the most."
          />
          {h.completeness.topGaps.length === 0 ? (
            <p className="mt-6 text-sm text-[var(--accent-emerald-soft-fg)]">
              Everything is complete.
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-[var(--border-subtle)]">
              {h.completeness.topGaps.slice(0, 5).map((g) => {
                const band = scoreBand(g.score);
                const name = nameMap.get(g.itemId) ?? g.itemId;
                return (
                  <li key={g.itemId} className="py-2.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/inventory/${g.itemId}`}
                          className="block truncate text-sm font-medium text-[var(--text-primary)] hover:underline"
                        >
                          {name}
                        </Link>
                        <ul className="mt-1 flex flex-wrap gap-1">
                          {g.missing.map((m) => (
                            <li key={m.field}>
                              <Link
                                href={`/inventory/${g.itemId}?focus=${m.field}`}
                                title={`+${m.weight} pts · ${m.hint}`}
                                className="inline-flex items-center gap-1 rounded-[var(--radius-sm)] bg-[var(--accent-amber-soft)] px-1.5 py-0.5 text-[11px] font-medium text-[var(--accent-amber-soft-fg)] hover:bg-[var(--accent-amber)]/30"
                              >
                                <span className="tabular-nums opacity-80">+{m.weight}</span>
                                <span>{m.label}</span>
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <ScoreBadge score={g.score} band={band} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          {h.completeness.topGaps.length > 0 && (
            <Link
              href="/inventory?incomplete=1"
              className="mt-3 block text-center text-xs font-medium text-[var(--brand)] hover:underline"
            >
              See all missing fields →
            </Link>
          )}
        </Card>

        <Card>
          <CardHeader
            title="Dead stock"
            description="Listed for more than a week — candidates to reprice or relist."
            action={
              <span className="text-xs text-[var(--text-muted)]">
                {h.deadStock.length} flagged
              </span>
            }
          />
          {h.deadStock.length === 0 ? (
            <p className="mt-6 text-sm text-[var(--accent-emerald-soft-fg)]">
              Nothing past the refresh threshold.
            </p>
          ) : (
            <>
              <ul className="mt-3 divide-y divide-[var(--border-subtle)]">
                {h.deadStock.slice(0, 6).map((d) => {
                  const bucket = dayBucket(d.daysListed);
                  const meta = BUCKETS.find((b) => b.key === bucket)!;
                  return (
                    <li key={d.id} className="py-2.5">
                      <Link
                        href={`/inventory/${d.id}`}
                        className="group flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-[var(--text-primary)] group-hover:underline">
                            {d.name}
                          </p>
                          <p className="text-xs text-[var(--text-muted)]">
                            {d.brand ? `${d.brand} · ` : ""}
                            <span className="tabular-nums">
                              {gbp(d.listedPrice)}
                            </span>
                          </p>
                        </div>
                        <DayChip days={d.daysListed} colorBg={meta.bg} />
                      </Link>
                    </li>
                  );
                })}
              </ul>
              {h.deadStock.length > 6 && (
                <Link
                  href="/inventory?status=listed&sort=date"
                  className="mt-3 block text-center text-xs font-medium text-[var(--brand)] hover:underline"
                >
                  + {h.deadStock.length - 6} more 8+ day listings →
                </Link>
              )}
            </>
          )}
        </Card>

        <Card>
          <CardHeader
            title="Where your stock lives"
            description="Active inventory grouped by category."
          />
          {h.categoryMix.length === 0 ? (
            <p className="mt-6 text-sm text-[var(--text-muted)]">
              No active inventory.
            </p>
          ) : (
            <ul className="mt-3 space-y-3">
              {h.categoryMix.slice(0, 8).map((g) => (
                <li key={g.key}>
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="truncate font-medium text-[var(--text-primary)]">
                      {g.key === "—" ? "Uncategorised" : g.key}
                    </span>
                    <span className="shrink-0 text-xs tabular-nums text-[var(--text-muted)]">
                      {g.count} · {gbp(g.valueTiedUp)}
                    </span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-[var(--surface-inset)]">
                    <div
                      className="h-full rounded-full bg-[var(--brand)]"
                      style={{ width: `${Math.max(2, g.pctOfCount)}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
          {h.categoryMix.length > 8 && (
            <p className="mt-3 text-center text-xs text-[var(--text-muted)]">
              + {h.categoryMix.length - 8} smaller categories
            </p>
          )}
        </Card>
      </section>
        </>
      )}
    </div>
  );
}

/* ---------- Small presentational helpers ---------- */

function ScoreBadge({
  score,
  band,
}: {
  score: number;
  band: "good" | "watch" | "bad";
}) {
  const cls =
    band === "good"
      ? "bg-[var(--accent-emerald-soft)] text-[var(--accent-emerald-soft-fg)]"
      : band === "watch"
        ? "bg-[var(--accent-amber-soft)] text-[var(--accent-amber-soft-fg)]"
        : "bg-[var(--accent-rose-soft)] text-[var(--accent-rose-soft-fg)]";
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-[var(--radius-sm)] px-2 py-1 text-xs font-semibold tabular-nums ${cls}`}
      title={`Completeness ${score}/100`}
    >
      {score}
    </span>
  );
}

function DayChip({ days, colorBg }: { days: number; colorBg: string }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-[var(--radius-sm)] px-2 py-1 text-xs font-semibold text-white ${colorBg}`}
    >
      {days}d
    </span>
  );
}

/* ---------- Inline icons (mirror Dashboard convention) ---------- */

function CheckIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      <path
        d="M3.5 9.5l3 3 8-8"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function GaugeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      <path
        d="M3 12a6 6 0 1 1 12 0M9 12l3-3"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function HourglassIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      <path
        d="M5 3h8M5 15h8M5 3v2.5L9 9l-4 3.5V15M13 3v2.5L9 9l4 3.5V15"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function BoltIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      <path
        d="M10 2L4 10h4l-1 6 6-8h-4l1-6z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}
