"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  useTransition,
  type FormEvent,
} from "react";
import { markItemSoldAction } from "./status-actions";

/**
 * Compact "Mark as sold" chip with an anchored popover. Two inputs only:
 * Sold price + Shipping. No fees field — Vinted does not charge sellers
 * (see AGENTS.md). The popover is absolutely positioned, so it overlays
 * surrounding content and never grows the page (no-scroll rule).
 *
 * Designed to be reusable: anywhere a row needs a "Mark as sold" affordance
 * with sale inputs, drop this in. /plan can reuse it later.
 */
export function MarkAsSoldPopover({
  itemId,
  defaultSoldPrice,
}: {
  itemId: string;
  defaultSoldPrice?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const firstFieldRef = useRef<HTMLInputElement | null>(null);
  const priceId = useId();
  const shipId = useId();

  // Click-outside + Escape to close.
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Focus the price field when opened.
  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => firstFieldRef.current?.focus());
    } else {
      setError(null);
    }
  }, [open]);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const soldPrice = String(fd.get("soldPrice") ?? "");
    const shipping = String(fd.get("shipping") ?? "");
    setError(null);
    startTransition(async () => {
      const result = await markItemSoldAction(itemId, soldPrice, shipping);
      if (result.ok) {
        setOpen(false);
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div ref={wrapRef} className="relative inline-block">
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1 rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--surface-card)] px-2 py-1 text-[11px] font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--border-default)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]"
      >
        Mark as sold
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Mark as sold"
          className="absolute right-0 top-full z-30 mt-1 w-64 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-card)] p-3 shadow-lg"
        >
          <form onSubmit={onSubmit} className="space-y-2">
            <div className="space-y-1">
              <label
                htmlFor={priceId}
                className="block text-[11px] font-medium text-[var(--text-secondary)]"
              >
                Sold price (£)
              </label>
              <input
                ref={firstFieldRef}
                id={priceId}
                name="soldPrice"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                required
                defaultValue={defaultSoldPrice ?? ""}
                className="w-full rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--surface-inset)] px-2 py-1.5 text-sm text-[var(--text-primary)] focus:border-[var(--brand)] focus:outline-none focus:ring-1 focus:ring-[var(--brand)]"
              />
            </div>
            <div className="space-y-1">
              <label
                htmlFor={shipId}
                className="block text-[11px] font-medium text-[var(--text-secondary)]"
              >
                Shipping (£)
              </label>
              <input
                id={shipId}
                name="shipping"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                defaultValue="0"
                className="w-full rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--surface-inset)] px-2 py-1.5 text-sm text-[var(--text-primary)] focus:border-[var(--brand)] focus:outline-none focus:ring-1 focus:ring-[var(--brand)]"
              />
            </div>
            {error && (
              <p className="text-[11px] text-[var(--accent-rose)]">{error}</p>
            )}
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-[var(--radius-sm)] px-2 py-1 text-[11px] text-[var(--text-secondary)] hover:bg-[var(--surface-muted)]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={pending}
                className="rounded-[var(--radius-sm)] border border-transparent bg-[var(--brand)] px-2.5 py-1 text-[11px] font-medium text-white hover:bg-[var(--brand-hover)] disabled:opacity-50"
              >
                {pending ? "Saving…" : "Confirm"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
