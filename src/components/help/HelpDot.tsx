"use client";

import { useEffect, useId, useRef, useState } from "react";
import { GLOSSARY, type GlossaryTerm } from "./glossary";

type Props = {
  term: GlossaryTerm;
  /** Override the label read aloud by screen readers. Defaults to "More about {label}". */
  ariaLabel?: string;
  /** Where the tooltip floats relative to the dot. */
  placement?: "top" | "bottom";
  className?: string;
};

/**
 * Tiny info-dot that reveals a one-sentence glossary entry on hover or
 * focus. Keyboard-accessible: Tab to focus, Esc to dismiss. The tooltip
 * is absolutely positioned so it doesn't push surrounding layout — safe
 * inside tight Aurora cards and the 1280x800 no-scroll rule.
 *
 * Copy comes from `glossary.ts` keyed by `term`, so adding a new dot is
 * a one-line change there.
 */
export function HelpDot({
  term,
  ariaLabel,
  placement = "top",
  className,
}: Props) {
  const entry = GLOSSARY[term];
  const tipId = useId();
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        btnRef.current?.blur();
      }
    }
    function onDocClick(e: MouseEvent) {
      if (!btnRef.current) return;
      if (!btnRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDocClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDocClick);
    };
  }, [open]);

  const positionClass =
    placement === "bottom"
      ? "top-full mt-2 left-1/2 -translate-x-1/2"
      : "bottom-full mb-2 left-1/2 -translate-x-1/2";

  return (
    <span
      className={`relative inline-flex align-middle ${className ?? ""}`}
    >
      <button
        ref={btnRef}
        type="button"
        aria-label={ariaLabel ?? `More about ${entry.label}`}
        aria-describedby={open ? tipId : undefined}
        aria-expanded={open}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={(e) => {
          // Stop parent labels/links from swallowing the click.
          e.preventDefault();
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full border border-[var(--border-default)] bg-[var(--surface-inset)] text-[9px] font-semibold leading-none text-[var(--text-muted)] transition-colors hover:border-[var(--brand)] hover:text-[var(--text-primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-soft)]"
      >
        <span aria-hidden>?</span>
      </button>
      {open && (
        <span
          id={tipId}
          role="tooltip"
          className={`pointer-events-none absolute z-50 w-56 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-card)] px-3 py-2 text-[11px] leading-snug text-[var(--text-secondary)] shadow-[var(--elev-2)] ${positionClass}`}
        >
          <span className="block text-[11px] font-semibold text-[var(--text-primary)]">
            {entry.label}
          </span>
          <span className="mt-0.5 block">{entry.description}</span>
        </span>
      )}
    </span>
  );
}
