// Lightweight skeleton — instant Suspense fallback while /inventory data loads.

const ghost = "rounded-[var(--radius-sm)] bg-[var(--surface-muted)]";

export default function InventoryLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-[var(--text-primary)] md:text-4xl">
            Inventory
          </h1>
          <div className={`${ghost} mt-2 h-3 w-48`} />
        </div>
        <div className={`${ghost} h-8 w-24`} />
      </header>

      <div className="rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface-card)] p-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className={`${ghost} h-9 flex-1 min-w-[220px]`} />
          <div className={`${ghost} h-9 w-32`} />
          <div className={`${ghost} h-9 w-32`} />
          <div className={`${ghost} h-9 w-28`} />
          <div className={`${ghost} ml-auto h-9 w-20`} />
        </div>
      </div>

      <div className="flex justify-end">
        <div className={`${ghost} h-8 w-32`} />
      </div>

      <div className="rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface-card)]">
        <div className="flex items-center gap-4 border-b border-[var(--border-subtle)] bg-[var(--surface-muted)]/40 px-4 py-3">
          <div className={`${ghost} h-3 w-16`} />
          <div className={`${ghost} h-3 w-24`} />
          <div className={`${ghost} h-3 w-16`} />
          <div className={`${ghost} h-3 w-12`} />
          <div className={`${ghost} h-3 w-16`} />
          <div className={`${ghost} ml-auto h-3 w-20`} />
        </div>
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 border-b border-[var(--border-subtle)] px-4 py-3 last:border-0"
          >
            <div className={`${ghost} h-10 w-10`} />
            <div className={`${ghost} h-4 w-48`} />
            <div className={`${ghost} h-3 w-20`} />
            <div className={`${ghost} h-3 w-12`} />
            <div className={`${ghost} h-5 w-16`} />
            <div className={`${ghost} ml-auto h-3 w-16`} />
          </div>
        ))}
      </div>
    </div>
  );
}
