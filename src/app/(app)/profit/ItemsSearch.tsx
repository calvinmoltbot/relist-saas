"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

/** Search box for the Items tab on /profit. Pushes `?q=` into the URL on
 *  a 300ms debounce. Resets `?page=` to 1 on every change so users don't
 *  end up on an empty page after narrowing. */
export function ItemsSearch({ initial }: { initial: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const [value, setValue] = useState(initial);

  useEffect(() => {
    setValue(initial);
  }, [initial]);

  useEffect(() => {
    const t = setTimeout(() => {
      const sp = new URLSearchParams(params?.toString() ?? "");
      const trimmed = value.trim();
      if (trimmed) sp.set("q", trimmed);
      else sp.delete("q");
      sp.delete("page");
      const qs = sp.toString();
      router.replace(qs ? `/profit?${qs}` : "/profit", { scroll: false });
    }, 300);
    return () => clearTimeout(t);
    // params is intentionally omitted — we read it once each tick
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <input
      type="search"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      placeholder="Search items…"
      className="h-8 w-56 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-card)] px-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
    />
  );
}
