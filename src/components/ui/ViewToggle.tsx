"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import type { ReactNode } from "react";

type Option<T extends string> = {
  value: T;
  label: string;
  icon?: ReactNode;
};

/**
 * Segmented toggle bound to a URL search param. Generic so it can be reused
 * for any "this page can render the same data two ways" surface (e.g. table
 * vs grid on /inventory). Server-component-friendly: parent reads the param
 * to decide what to render; this component just updates it.
 */
export function ViewToggle<T extends string>({
  param,
  value,
  options,
  ariaLabel,
}: {
  param: string;
  value: T;
  options: Option<T>[];
  ariaLabel?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  function setValue(next: T) {
    const params = new URLSearchParams(sp?.toString() ?? "");
    if (next === options[0].value) {
      params.delete(param);
    } else {
      params.set(param, next);
    }
    // View change resets pagination — different layouts = different starting cursor feel.
    params.delete("page");
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className="inline-flex items-center rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-card)] p-0.5 text-xs"
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => setValue(opt.value)}
            className={`inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] px-2.5 py-1 font-medium transition-colors ${
              active
                ? "bg-[var(--surface-muted)] text-[var(--text-primary)] shadow-[var(--elev-1)]"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            {opt.icon}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
