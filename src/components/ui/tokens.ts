/**
 * Status → pill style mapping. Used by StatusPill and any place where
 * an item status is rendered as a coloured tag. Mapping:
 *   sourced  → amber  (raw stock, not yet on the platform)
 *   listed   → teal   (live on Vinted — brand colour)
 *   sold     → violet (won)
 *   shipped  → slate  (done, archived)
 */
export type ItemStatus = "sourced" | "listed" | "sold" | "shipped";

export const STATUS_LABEL: Record<ItemStatus, string> = {
  sourced: "Sourced",
  listed: "Listed",
  sold: "Sold",
  shipped: "Shipped",
};

export const STATUS_PILL: Record<ItemStatus, { bg: string; fg: string; dot: string }> = {
  sourced: {
    bg: "bg-[var(--accent-amber-soft)]",
    fg: "text-[var(--accent-amber-soft-fg)]",
    dot: "bg-[var(--accent-amber)]",
  },
  listed: {
    bg: "bg-[var(--brand-soft)]",
    fg: "text-[var(--brand-soft-fg)]",
    dot: "bg-[var(--brand)]",
  },
  sold: {
    bg: "bg-[var(--accent-violet-soft)]",
    fg: "text-[var(--accent-violet-soft-fg)]",
    dot: "bg-[var(--accent-violet)]",
  },
  shipped: {
    bg: "bg-[var(--accent-slate-soft)]",
    fg: "text-[var(--accent-slate-soft-fg)]",
    dot: "bg-[var(--accent-slate)]",
  },
};

/**
 * Health bands for completeness scores, margin %, age days, etc.
 */
export type HealthBand = "good" | "watch" | "bad";

export const HEALTH_PILL: Record<HealthBand, { bg: string; fg: string }> = {
  good: { bg: "bg-[var(--accent-emerald-soft)]", fg: "text-[var(--accent-emerald-soft-fg)]" },
  watch: { bg: "bg-[var(--accent-amber-soft)]", fg: "text-[var(--accent-amber-soft-fg)]" },
  bad: { bg: "bg-[var(--accent-rose-soft)]", fg: "text-[var(--accent-rose-soft-fg)]" },
};
