// Lightweight skeleton — instant Suspense fallback while /bestsellers data loads.

const tile = "h-[112px] rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface-card)] p-4";
const ghost = "rounded-[var(--radius-sm)] bg-[var(--surface-muted)]";

export default function BestsellersLoading() {
  return (
    <div className="space-y-8 animate-pulse">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-[var(--text-primary)] md:text-4xl">
            Best sellers
          </h1>
          <div className={`${ghost} mt-2 h-3 w-72`} />
        </div>
        <div className="flex items-center gap-3">
          <div className={`${ghost} h-9 w-44`} />
          <div className={`${ghost} h-9 w-32`} />
        </div>
      </header>

      <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className={tile}>
            <div className={`${ghost} h-3 w-24`} />
            <div className={`${ghost} mt-3 h-7 w-20`} />
            <div className={`${ghost} mt-2 h-3 w-16`} />
          </div>
        ))}
      </section>

      <div className="rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface-card)] p-5">
        <div className={`${ghost} h-5 w-44`} />
        <div className={`${ghost} mt-2 h-3 w-80`} />
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <div className={`${ghost} h-9 w-72`} />
          <div className={`${ghost} h-9 w-44`} />
        </div>
        <div className="mt-5 space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className={`${ghost} h-10 w-full`} />
          ))}
        </div>
      </div>

      <section className="grid gap-4 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, c) => (
          <div key={c} className="rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface-card)] p-5">
            <div className={`${ghost} h-5 w-40`} />
            <div className="mt-4 space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className={`${ghost} h-10 w-full`} />
              ))}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
