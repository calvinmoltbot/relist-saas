"use client";

import { useTransition } from "react";
import { transitionItemStatusAction } from "./status-actions";
import { MarkAsSoldPopover } from "./MarkAsSoldPopover";

type Status = "sourced" | "listed" | "sold" | "shipped";

const ONE_TAP: Partial<Record<Status, { label: string; next: Status }>> = {
  sourced: { label: "Mark as listed", next: "listed" },
  sold: { label: "Mark as shipped", next: "shipped" },
};

/**
 * Inline action chip for a row's next status transition. Three forms:
 *   sourced → listed   one-tap chip
 *   listed  → sold     chip with anchored popover (sold price + shipping)
 *   sold    → shipped  one-tap chip
 *   shipped            no action (terminal)
 */
export function StatusTransitionButton({
  itemId,
  status,
  listedPrice,
}: {
  itemId: string;
  status: string;
  listedPrice?: string | null;
}) {
  const [pending, startTransition] = useTransition();

  if (status === "listed") {
    return (
      <MarkAsSoldPopover itemId={itemId} defaultSoldPrice={listedPrice} />
    );
  }

  const def = ONE_TAP[status as Status];
  if (!def) return null;

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await transitionItemStatusAction(itemId, def.next);
        })
      }
      className="inline-flex items-center gap-1 rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--surface-card)] px-2 py-1 text-[11px] font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--border-default)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)] disabled:opacity-50"
    >
      {pending ? "Saving…" : def.label}
    </button>
  );
}
