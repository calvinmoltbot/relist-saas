"use client";

import { useTransition } from "react";
import { transitionItemStatusAction } from "./status-actions";

type Status = "sourced" | "listed" | "sold" | "shipped";

const NEXT_LABEL: Partial<Record<Status, { label: string; next: Status }>> = {
  sourced: { label: "Mark as listed", next: "listed" },
  sold: { label: "Mark as shipped", next: "shipped" },
};

/**
 * Inline action chip for a single-tap status transition from the inventory
 * list. Renders nothing for statuses without a meaningful next-step from this
 * surface (listed → sold needs a sale price; shipped is terminal).
 */
export function StatusTransitionButton({
  itemId,
  status,
}: {
  itemId: string;
  status: string;
}) {
  const [pending, startTransition] = useTransition();
  const def = NEXT_LABEL[status as Status];
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
