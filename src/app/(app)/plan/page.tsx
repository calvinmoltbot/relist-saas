import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { buildDailyPlan, type DailyTask, type TaskType } from "@/lib/analytics/daily-plan";

const TYPE_META: Record<
  TaskType,
  { label: string; tone: string; emptyLabel: string }
> = {
  ship: {
    label: "Ship",
    tone: "bg-emerald-100 text-emerald-800",
    emptyLabel: "Nothing to ship",
  },
  update: {
    label: "Update",
    tone: "bg-blue-100 text-blue-800",
    emptyLabel: "All details filled in",
  },
  reprice: {
    label: "Reprice",
    tone: "bg-amber-100 text-amber-800",
    emptyLabel: "No stale listings",
  },
  photo: {
    label: "Photos",
    tone: "bg-fuchsia-100 text-fuchsia-800",
    emptyLabel: "All listings have photos",
  },
};

const ORDER: TaskType[] = ["ship", "update", "reprice", "photo"];

export default async function PlanPage() {
  const { userId } = await auth();
  if (!userId) redirect("/");

  const plan = await buildDailyPlan(userId);
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
    <div className="space-y-8">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Plan my day</h1>
          <p className="mt-1 text-sm text-gray-600">{today}</p>
        </div>
        <div className="text-right">
          <div className="text-xs uppercase text-gray-500">Total time</div>
          <div className="text-xl font-semibold">
            {plan.totalEstimatedMinutes ? `~${plan.totalEstimatedMinutes} min` : "—"}
          </div>
        </div>
      </header>

      {/* Counts */}
      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {ORDER.map((t) => (
          <div key={t} className="rounded-md border p-4">
            <div className="text-xs uppercase text-gray-500">{TYPE_META[t].label}</div>
            <div className="mt-1 text-2xl font-semibold">{plan.countsByType[t]}</div>
          </div>
        ))}
      </section>

      {plan.tasks.length === 0 ? (
        <section className="rounded-md border border-dashed bg-gray-50 p-10 text-center">
          <p className="text-base font-medium">Inbox zero</p>
          <p className="mt-1 text-sm text-gray-600">
            Nothing urgent — go source some stock or take the afternoon off.
          </p>
        </section>
      ) : (
        ORDER.map((type) => (
          <section key={type}>
            <header className="mb-2 flex items-center gap-2">
              <span
                className={`rounded px-1.5 py-0.5 text-xs font-medium ${TYPE_META[type].tone}`}
              >
                {TYPE_META[type].label}
              </span>
              <h2 className="text-sm font-medium text-gray-700">
                {grouped[type].length > 0
                  ? `${grouped[type].length} ${grouped[type].length === 1 ? "task" : "tasks"}`
                  : TYPE_META[type].emptyLabel}
              </h2>
            </header>
            {grouped[type].length === 0 ? null : (
              <ul className="divide-y rounded-md border">
                {grouped[type].map((task) => (
                  <li
                    key={task.id}
                    className="flex items-center justify-between gap-3 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <Link
                        href={`/inventory/${task.itemId}`}
                        className="block truncate text-sm font-medium underline"
                      >
                        {task.title}
                      </Link>
                      <p className="truncate text-xs text-gray-600">{task.subtitle}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3 text-xs text-gray-500">
                      <span>~{task.estimatedMinutes}m</span>
                      <Link
                        href={`/inventory/${task.itemId}`}
                        className="rounded-md border px-2 py-1 text-gray-700 hover:bg-gray-50"
                      >
                        {task.action}
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))
      )}
    </div>
  );
}
