// Lightweight skeleton — instant Suspense fallback while /plan data loads.

const ghost = "rounded-[var(--radius-sm)] bg-[var(--surface-muted)]";

export default function PlanLoading() {
  return (
    <div className="space-y-8 animate-pulse">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--text-primary)]">
            Plan my day
          </h1>
          <div className={`${ghost} mt-2 h-3 w-44`} />
        </div>
        <div className="text-right">
          <div className={`${ghost} ml-auto h-3 w-20`} />
          <div className={`${ghost} mt-2 ml-auto h-6 w-24`} />
        </div>
      </header>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-md border border-[var(--border-subtle)] bg-[var(--surface-card)] p-4">
            <div className={`${ghost} h-3 w-16`} />
            <div className={`${ghost} mt-3 h-7 w-10`} />
          </div>
        ))}
      </section>

      {Array.from({ length: 3 }).map((_, s) => (
        <section key={s}>
          <div className="mb-2 flex items-center gap-2">
            <div className={`${ghost} h-5 w-20`} />
            <div className={`${ghost} h-3 w-12`} />
          </div>
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-card)] p-3"
              >
                <div className={`${ghost} h-10 w-10`} />
                <div className="flex-1 space-y-2">
                  <div className={`${ghost} h-4 w-1/2`} />
                  <div className={`${ghost} h-3 w-1/3`} />
                </div>
                <div className={`${ghost} h-8 w-20`} />
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
