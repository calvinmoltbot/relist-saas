"use client";

import { useRouter, useSearchParams } from "next/navigation";

type Option = { value: string; label: string };

/** Auto-submitting preset select for /profit. Replaces the URL on change so
 *  the back button doesn't fill up; resets ?page=1 because the Items tab is
 *  paginated. */
export function PresetSelect({
  options,
  value,
}: {
  options: Option[];
  value: string;
}) {
  const router = useRouter();
  const params = useSearchParams();

  return (
    <select
      value={value}
      onChange={(e) => {
        const sp = new URLSearchParams(params?.toString() ?? "");
        const next = e.target.value;
        if (next && next !== "this_month") sp.set("preset", next);
        else sp.delete("preset");
        sp.delete("page");
        const qs = sp.toString();
        router.replace(qs ? `/profit?${qs}` : "/profit", { scroll: false });
      }}
      className="h-9 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-card)] px-3 text-sm text-[var(--text-primary)]"
      aria-label="Date range preset"
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
