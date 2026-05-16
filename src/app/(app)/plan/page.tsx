import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { buildDailyPlan, type DailyTask, type TaskType } from "@/lib/analytics/daily-plan";
import { userScope } from "@/lib/db/scoped";
import { FirstRunNudge } from "@/components/FirstRunNudge";
import { Card, PageHeader } from "@/components/ui";

const TYPE_META: Record<
  TaskType,
  { label: string; tone: string; emptyLabel: string }
> = {
  ship: {
    label: "Ship",
    tone: "bg-[var(--accent-emerald-soft)] text-[var(--accent-emerald-soft-fg)]",
    emptyLabel: "Nothing to ship",
  },
  update: {
    label: "Update",
    tone: "bg-[var(--accent-blue-soft)] text-[var(--accent-blue-soft-fg)]",
    emptyLabel: "All details filled in",
  },
  reprice: {
    label: "Reprice",
    tone: "bg-[var(--accent-amber-soft)] text-[var(--accent-amber-soft-fg)]",
    emptyLabel: "No stale listings",
  },
  photo: {
    label: "Photos",
    tone: "bg-[var(--accent-violet-soft)] text-[var(--accent-violet-soft-fg)]",
    emptyLabel: "All listings have photos",
  },
};

const ORDER: TaskType[] = ["ship", "update", "reprice", "photo"];

export default async function PlanPage() {
  const { userId } = await auth();
  if (!userId) redirect("/");

  const [plan, itemCount] = await Promise.all([
    buildDailyPlan(userId),
    userScope(userId).countItems(),
  ]);
  const isFirstRun = itemCount === 0;
  const grouped: Record<TaskType, DailyTask[]> = {
    ship: [],
    update: [],
    reprice: [],
    photo: [],
  };
  for (const t of plan.tasks) grouped[t.type].push(t);

  const today = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Plan my day"
        subtitle={today}
        actions={
          <div className="text-right">
            <div className="text-[10px] font-medium uppercase tracking-[0.12em] text-[var(--text-muted)]">
              Total time
            </div>
            <div className="font-display text-xl font-semibold text-[var(--text-primary)] tabular-nums">
              {plan.totalEstimatedMinutes ? `~${plan.totalEstimatedMinutes} min` : "—"}
            </div>
          </div>
        }
      />

      {isFirstRun ? (
        <FirstRunNudge
          variant="panel"
          heading="No tasks yet"
          body="Once you add items, the daily plan will surface what to ship, photo, reprice or update first."
        />
      ) : (
        <>
          {/* Counts */}
          <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {ORDER.map((t) => (
              <Card key={t} className="!p-4">
                <div className="text-[10px] font-medium uppercase tracking-[0.12em] text-[var(--text-muted)]">
                  {TYPE_META[t].label}
                </div>
                <div className="mt-1 font-display text-2xl font-semibold text-[var(--text-primary)] tabular-nums">
                  {plan.countsByType[t]}
                </div>
              </Card>
            ))}
          </section>

          {plan.tasks.length === 0 ? (
            <Card className="text-center !p-10">
              <p className="font-display text-lg font-semibold text-[var(--text-primary)]">
                Inbox zero
              </p>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                Nothing urgent — go source some stock or take the afternoon off.
              </p>
            </Card>
          ) : (
            <div className="space-y-6">
              {ORDER.map((type) => (
                <section key={type}>
                  <header className="mb-2 flex items-center gap-2">
                    <span
                      className={`rounded-[var(--radius-sm)] px-1.5 py-0.5 text-xs font-medium ${TYPE_META[type].tone}`}
                    >
                      {TYPE_META[type].label}
                    </span>
                    <h2 className="text-sm font-medium text-[var(--text-secondary)]">
                      {grouped[type].length > 0
                        ? `${grouped[type].length} ${grouped[type].length === 1 ? "task" : "tasks"}`
                        : TYPE_META[type].emptyLabel}
                    </h2>
                  </header>
                  {grouped[type].length === 0 ? null : (
                    <Card padded={false}>
                      <ul className="divide-y divide-[var(--border-subtle)]">
                        {grouped[type].map((task) => (
                          <li
                            key={task.id}
                            className="flex items-center justify-between gap-3 px-4 py-3"
                          >
                            <div className="min-w-0">
                              <Link
                                href={`/inventory/${task.itemId}`}
                                className="block truncate text-sm font-medium text-[var(--text-primary)] hover:text-[var(--brand)]"
                              >
                                {task.title}
                              </Link>
                              <p className="truncate text-xs text-[var(--text-muted)]">
                                {task.subtitle}
                              </p>
                            </div>
                            <div className="flex shrink-0 items-center gap-3 text-xs text-[var(--text-muted)]">
                              <span className="tabular-nums">~{task.estimatedMinutes}m</span>
                              <Link
                                href={`/inventory/${task.itemId}`}
                                className="inline-flex items-center rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--surface-glass)] px-2 py-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                              >
                                {task.action}
                              </Link>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </Card>
                  )}
                </section>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
