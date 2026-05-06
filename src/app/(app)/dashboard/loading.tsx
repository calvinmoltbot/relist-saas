// Lightweight skeleton — instant Suspense fallback while dashboard data loads.
// No data, no auth, no imports from app components. Mirrors page.tsx layout.

const tile = "h-[112px] rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface-card)] p-4";
const ghost = "rounded-[var(--radius-sm)] bg-[var(--surface-muted)]";

export default function DashboardLoading() {
  return (
    <div className="space-y-8 animate-pulse">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-[var(--text-primary)] md:text-4xl">
            Dashboard
          </h1>
          <div className={`${ghost} mt-2 h-3 w-32`} />
        </div>
        <div className="flex gap-2">
          <div className={`${ghost} h-8 w-20`} />
          <div className={`${ghost} h-8 w-24`} />
        </div>
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className={tile}>
            <div className={`${ghost} h-3 w-24`} />
            <div className={`${ghost} mt-3 h-7 w-28`} />
            <div className={`${ghost} mt-2 h-3 w-20`} />
          </div>
        ))}
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface-card)]">
          <div className="flex items-center justify-between p-5 pb-3">
            <div className={`${ghost} h-5 w-44`} />
            <div className={`${ghost} h-3 w-16`} />
          </div>
          <div className="space-y-2 px-5 pb-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className={`${ghost} h-9 w-full`} />
            ))}
          </div>
        </div>
        <div className="rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface-card)] p-5">
          <div className={`${ghost} h-5 w-32`} />
          <div className={`${ghost} mt-2 h-3 w-48`} />
          <div className="mt-4 space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className={`${ghost} h-10 w-full`} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
