import Link from "next/link";
import type { ReactNode } from "react";

export type SegmentedTone = "brand" | "emerald";

type Option<V extends string> = {
  value: V;
  label: string;
  icon?: ReactNode;
};

type Props<V extends string> = {
  /** Optional label rendered before the segments. */
  label?: string;
  options: Option<V>[];
  active: V;
  /** Build the href for a given option value. */
  hrefFor: (value: V) => string;
  /** Tone of the active pill. Defaults to brand (teal). */
  tone?: SegmentedTone;
  className?: string;
};

const ACTIVE_TONE: Record<SegmentedTone, string> = {
  brand:
    "bg-[var(--brand)] text-white shadow-[var(--elev-1)]",
  emerald:
    "bg-[var(--accent-emerald)] text-white shadow-[var(--elev-1)]",
};

/**
 * Link-based segmented control. Renders a row of `<Link>` segments inside a
 * pill-shaped track; the active segment is filled in the chosen tone. Built
 * for server-rendered filter switches (Bestsellers dimension/sort, etc.) —
 * no client JS required.
 */
export function SegmentedControl<V extends string>({
  label,
  options,
  active,
  hrefFor,
  tone = "brand",
  className = "",
}: Props<V>) {
  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      {label && (
        <span className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
          {label}
        </span>
      )}
      <div
        role="tablist"
        className="inline-flex rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface-inset)] p-1"
      >
        {options.map((opt) => {
          const isActive = opt.value === active;
          return (
            <Link
              key={opt.value}
              href={hrefFor(opt.value)}
              role="tab"
              aria-selected={isActive}
              className={`inline-flex items-center gap-1.5 rounded-[var(--radius-md)] px-3 py-1.5 text-xs font-medium transition-colors ${
                isActive
                  ? ACTIVE_TONE[tone]
                  : "text-[var(--text-secondary)] hover:bg-[var(--surface-card)] hover:text-[var(--text-primary)]"
              }`}
            >
              {opt.icon && <span aria-hidden>{opt.icon}</span>}
              {opt.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
