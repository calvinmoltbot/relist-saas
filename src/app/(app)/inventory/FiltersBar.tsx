"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type StatusOption = { value: string; label: string };

/** Auto-applying filter bar for /inventory. Selects + checkbox commit
 *  immediately; the search input debounces 300ms. Every change resets
 *  ?page=1 and uses router.replace({ scroll: false }) so the back button
 *  stays sane. The "view" param (table/grid) is preserved. */
export function FiltersBar({
  initialSearch,
  initialStatus,
  initialSort,
  initialIncomplete,
  statusOptions,
}: {
  initialSearch: string;
  initialStatus: string;
  initialSort: string;
  initialIncomplete: boolean;
  statusOptions: StatusOption[];
}) {
  const router = useRouter();
  const params = useSearchParams();

  const [search, setSearch] = useState(initialSearch);
  const [status, setStatus] = useState(initialStatus);
  const [sort, setSort] = useState(initialSort);
  const [incomplete, setIncomplete] = useState(initialIncomplete);

  // Track the most-recent submitted search so the debounce doesn't race
  // a fresh URL change.
  const lastPushedSearch = useRef(initialSearch);

  function pushUrl(next: {
    search: string;
    status: string;
    sort: string;
    incomplete: boolean;
  }) {
    const sp = new URLSearchParams(params?.toString() ?? "");
    if (next.search.trim()) sp.set("search", next.search.trim());
    else sp.delete("search");
    if (next.status && next.status !== "listed") sp.set("status", next.status);
    else sp.delete("status");
    if (next.sort && next.sort !== "date") sp.set("sort", next.sort);
    else sp.delete("sort");
    if (next.incomplete) sp.set("incomplete", "1");
    else sp.delete("incomplete");
    sp.delete("page");
    const qs = sp.toString();
    router.replace(qs ? `/inventory?${qs}` : "/inventory", { scroll: false });
  }

  // Debounce search input.
  useEffect(() => {
    if (search === lastPushedSearch.current) return;
    const t = setTimeout(() => {
      lastPushedSearch.current = search;
      pushUrl({ search, status, sort, incomplete });
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search name, brand, SKU…"
        className="min-w-[220px] flex-1 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-inset)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--brand)] focus:outline-none focus:ring-1 focus:ring-[var(--brand)]"
      />
      <label className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
        <span className="hidden sm:inline">Status</span>
        <select
          value={status}
          onChange={(e) => {
            const next = e.target.value;
            setStatus(next);
            lastPushedSearch.current = search;
            pushUrl({ search, status: next, sort, incomplete });
          }}
          className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-card)] px-2.5 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--brand)] focus:outline-none"
        >
          {statusOptions.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </label>
      <label className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
        <span className="hidden sm:inline">Sort by</span>
        <select
          value={sort}
          onChange={(e) => {
            const next = e.target.value;
            setSort(next);
            lastPushedSearch.current = search;
            pushUrl({ search, status, sort: next, incomplete });
          }}
          className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-card)] px-2.5 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--brand)] focus:outline-none"
        >
          <option value="date">Newest</option>
          <option value="price">Price</option>
          <option value="brand">Brand</option>
        </select>
      </label>
      <label className="flex items-center gap-1.5 px-1 text-xs text-[var(--text-secondary)]">
        <input
          type="checkbox"
          checked={incomplete}
          onChange={(e) => {
            const next = e.target.checked;
            setIncomplete(next);
            lastPushedSearch.current = search;
            pushUrl({ search, status, sort, incomplete: next });
          }}
          className="h-3.5 w-3.5 rounded border-[var(--border-default)] text-[var(--brand)]"
        />
        Incomplete only
      </label>
    </div>
  );
}
