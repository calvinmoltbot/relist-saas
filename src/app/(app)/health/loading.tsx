// Lightweight skeleton — instant Suspense fallback while /health data loads.

const tile = "h-[112px] rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface-card)] p-4";
const ghost = "rounded-[var(--radius-sm)] bg-[var(--surface-muted)]";

export default function HealthLoading() {
  return (
    <div className="space-y-8 animate-pulse">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-[var(--text-primary)] md:text-4xl">
            Inventory health
          </h1>
          <div className={`${ghost} mt-2 h-3 w-80`} />
        </div>
        <div className={`${ghost} h-3 w-40`} />
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className={tile}>
            <div className={`${ghost} h-3 w-28`} />
            <div className={`${ghost} mt-3 h-7 w-20`} />
            <div className={`${ghost} mt-2 h-3 w-32`} />
          </div>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface-card)] p-5">
            <div className={`${ghost} h-5 w-40`} />
            <div className={`${ghost} mt-2 h-3 w-56`} />
            <div className={`${ghost} mt-4 h-32 w-full`} />
            <div className="mt-3 space-y-2">
              <div className={`${ghost} h-3 w-full`} />
              <div className={`${ghost} h-3 w-3/4`} />
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
