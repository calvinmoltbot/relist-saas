"use client";

import { useRouter, useSearchParams } from "next/navigation";

type Option = { value: string; label: string };

/** Auto-submitting preset select for /expenses. Replaces the URL on change. */
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
        router.replace(qs ? `/expenses?${qs}` : "/expenses", { scroll: false });
      }}
      className="rounded-md border px-2 py-1"
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
