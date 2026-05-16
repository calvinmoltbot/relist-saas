import type { ReactNode } from "react";
import { Sparkline } from "./Sparkline";

type Tone = "brand" | "emerald" | "amber" | "violet" | "rose" | "slate";

type Props = {
  label: string;
  value: string;
  sub?: string;
  /** Optional tone for the icon chip + sparkline. Default: brand. */
  tone?: Tone;
  /** Optional small icon shown in a coloured chip in the top-left. */
  icon?: ReactNode;
  /** Trend delta vs previous period, e.g. "+8.2%". Optional sign-aware colour. */
  delta?: string;
  deltaDirection?: "up" | "down" | "flat";
  /** Inline sparkline data (small numeric series). */
  spark?: number[];
};

const ICON_BG: Record<Tone, string> = {
  brand: "bg-[var(--brand-soft)] text-[var(--brand-soft-fg)]",
  emerald: "bg-[var(--accent-emerald-soft)] text-[var(--accent-emerald-soft-fg)]",
  amber: "bg-[var(--accent-amber-soft)] text-[var(--accent-amber-soft-fg)]",
  violet: "bg-[var(--accent-violet-soft)] text-[var(--accent-violet-soft-fg)]",
  rose: "bg-[var(--accent-rose-soft)] text-[var(--accent-rose-soft-fg)]",
  slate: "bg-[var(--accent-slate-soft)] text-[var(--accent-slate-soft-fg)]",
};

const DELTA_COLOR = {
  up: "text-[var(--money-positive)]",
  down: "text-[var(--money-negative)]",
  flat: "text-[var(--text-muted)]",
} as const;

export function Tile({
  label,
  value,
  sub,
  tone = "brand",
  icon,
  delta,
  deltaDirection = "flat",
  spark,
}: Props) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface-card)] p-3.5 shadow-[var(--elev-1)]">
      <div className="flex items-start justify-between gap-3">
        {icon && (
          <span className={`inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] ${ICON_BG[tone]}`}>
            {icon}
          </span>
        )}
        {delta && (
          <span className={`text-xs font-medium ${DELTA_COLOR[deltaDirection]}`}>
            {delta}
          </span>
        )}
      </div>

      <div className="mt-2.5">
        <div className="text-[12px] font-medium uppercase tracking-[0.08em] text-[var(--text-muted)]">
          {label}
        </div>
        <div className="mt-1 text-[24px] font-semibold tracking-tight tabular-nums text-[var(--text-primary)] md:text-[28px]">
          {value}
        </div>
        {sub && (
          <div className="mt-0.5 text-[13px] text-[var(--text-secondary)]">{sub}</div>
        )}
      </div>

      {spark && spark.length > 1 && (
        <div className="mt-2">
          <Sparkline data={spark} tone={tone} height={28} />
        </div>
      )}
    </div>
  );
}
