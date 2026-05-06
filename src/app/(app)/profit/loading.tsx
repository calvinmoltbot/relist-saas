// Lightweight skeleton — instant Suspense fallback while /profit data loads.

const tile = "h-[112px] rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface-card)] p-4";
const ghost = "rounded-[var(--radius-sm)] bg-[var(--surface-muted)]";

export default function ProfitLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-[var(--text-primary)] md:text-4xl">
            Profit
          </h1>
          <div className={`${ghost} mt-2 h-3 w-40`} />
        </div>
        <div className="flex items-center gap-3">
          <div className={`${ghost} h-9 w-44`} />
          <div className={`${ghost} h-9 w-32`} />
        </div>
      </header>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-7">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className={tile}>
            <div className={`${ghost} h-3 w-20`} />
            <div className={`${ghost} mt-3 h-6 w-24`} />
            <div className={`${ghost} mt-2 h-3 w-16`} />
          </div>
        ))}
      </section>

      <div className="rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface-card)] p-5">
        <div className={`${ghost} h-5 w-56`} />
        <div className={`${ghost} mt-2 h-3 w-72`} />
        <div className={`${ghost} mt-4 h-44 w-full`} />
      </div>

      <div className="rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface-card)]">
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] p-4">
          <div className={`${ghost} h-8 w-72`} />
          <div className={`${ghost} h-8 w-48`} />
        </div>
        <div className="space-y-2 p-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={`${ghost} h-9 w-full`} />
          ))}
        </div>
      </div>
    </div>
  );
}
