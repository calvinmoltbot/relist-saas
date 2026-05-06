"use client";

import { useRouter, useSearchParams } from "next/navigation";

type Option = { value: string; label: string };

/** Auto-submitting preset select for /bestsellers. Preserves dim/sort/type
 *  from the current URL via useSearchParams; replaces (not pushes) the URL
 *  so back button doesn't fill up. /bestsellers isn't paginated. */
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
        if (next) sp.set("preset", next);
        else sp.delete("preset");
        const qs = sp.toString();
        router.replace(qs ? `/bestsellers?${qs}` : "/bestsellers", {
          scroll: false,
        });
      }}
      className="h-9 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-card)] px-3 text-sm"
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
