"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";

type Status = "sourced" | "listed" | "sold" | "shipped";

function gbpNum(n: string | null | undefined): number {
  if (n == null || n === "") return 0;
  const v = parseFloat(n);
  return Number.isFinite(v) ? v : 0;
}

export function ItemActions({
  id,
  status,
  costPrice,
  listedPrice,
  soldPrice,
}: {
  id: string;
  status: string;
  costPrice: string | null;
  listedPrice: string | null;
  soldPrice: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [showSell, setShowSell] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const sellWrapRef = useRef<HTMLDivElement | null>(null);
  const [sell, setSell] = useState({
    soldPrice: soldPrice ?? listedPrice ?? "",
    shippingCost: "0",
  });

  const estimatedProfit = useMemo(() => {
    const gross = gbpNum(sell.soldPrice);
    const ship = gbpNum(sell.shippingCost);
    const cost = gbpNum(costPrice);
    return gross - ship - cost;
  }, [sell, costPrice]);

  // Click-outside / Escape closes the sell popover.
  useEffect(() => {
    if (!showSell) return;
    function onDown(e: MouseEvent) {
      if (!sellWrapRef.current?.contains(e.target as Node)) setShowSell(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setShowSell(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [showSell]);

  async function transition(next: Status) {
    if (next === "sold") {
      setShowSell(true);
      return;
    }
    await patch({ status: next });
  }

  async function confirmSell(e: React.FormEvent) {
    e.preventDefault();
    await patch({
      status: "sold",
      soldPrice: sell.soldPrice || null,
      shippingCost: sell.shippingCost || "0",
    });
    setShowSell(false);
  }

  async function patch(body: Record<string, unknown>) {
    setBusy(true);
    try {
      const res = await fetch(`/api/inventory/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) router.refresh();
    } finally {
      setBusy(false);
    }
  }

  // primary / secondary buttons by status
  const primaryByStatus: Partial<Record<Status, { label: string; next: Status }>> = {
    sourced: { label: "Mark as listed", next: "listed" },
    listed: { label: "Mark as sold", next: "sold" },
    sold: { label: "Mark as shipped", next: "shipped" },
  };
  const secondaryByStatus: Partial<Record<Status, { label: string; next: Status }>> = {
    listed: { label: "Mark as sourced", next: "sourced" },
  };

  const primary = primaryByStatus[status as Status];
  const secondary = secondaryByStatus[status as Status];

  return (
    <div className="flex items-center justify-between gap-2">
      <div ref={sellWrapRef} className="relative flex-1">
        {primary ? (
          <Button
            disabled={busy}
            onClick={() => transition(primary.next)}
            variant="primary"
            size="md"
            className="w-full"
          >
            {primary.label}
          </Button>
        ) : (
          <p className="text-xs text-[var(--text-muted)]">
            No further actions — item shipped.
          </p>
        )}

        {showSell && (
          <div
            role="dialog"
            aria-label="Mark as sold"
            className="absolute left-0 right-0 top-full z-30 mt-2 rounded-[var(--radius-lg)] border border-[var(--border-default)] bg-[var(--surface-card)] p-4 shadow-lg"
          >
            <form onSubmit={confirmSell} className="space-y-3">
              <div>
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                  Mark as sold
                </h3>
                <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">
                  Records the sale and updates profit.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Field label="Sold price (£)">
                  <input
                    type="number"
                    step="0.01"
                    value={sell.soldPrice}
                    onChange={(e) =>
                      setSell({ ...sell, soldPrice: e.target.value })
                    }
                    required
                    autoFocus
                    className="w-full rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--surface-inset)] px-2 py-1.5 text-sm focus:border-[var(--brand)] focus:outline-none focus:ring-1 focus:ring-[var(--brand)]"
                  />
                </Field>
                <Field label="Shipping (£)">
                  <input
                    type="number"
                    step="0.01"
                    value={sell.shippingCost}
                    onChange={(e) =>
                      setSell({ ...sell, shippingCost: e.target.value })
                    }
                    className="w-full rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--surface-inset)] px-2 py-1.5 text-sm focus:border-[var(--brand)] focus:outline-none focus:ring-1 focus:ring-[var(--brand)]"
                  />
                </Field>
              </div>

              <div className="flex items-center justify-between rounded-[var(--radius-sm)] bg-[var(--surface-muted)] px-2 py-1.5 text-xs">
                <span className="text-[var(--text-secondary)]">
                  Est. profit
                </span>
                <span
                  className={`font-semibold ${
                    estimatedProfit >= 0
                      ? "text-[var(--accent-emerald-soft-fg)]"
                      : "text-[var(--accent-rose-soft-fg)]"
                  }`}
                >
                  £{estimatedProfit.toFixed(2)}
                </span>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSell(false)}
                  disabled={busy}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={busy}
                >
                  Confirm sale
                </Button>
              </div>
            </form>
          </div>
        )}
      </div>

      <div className="relative">
        <button
          type="button"
          aria-haspopup="menu"
          aria-expanded={showMore}
          onClick={() => setShowMore((v) => !v)}
          className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] px-2 py-2 text-sm text-[var(--text-secondary)] hover:border-[var(--border-default)] hover:text-[var(--text-primary)]"
        >
          More
        </button>
        {showMore && (
          <MoreMenu onClose={() => setShowMore(false)}>
            {secondary && (
              <MenuItem
                onClick={() => {
                  setShowMore(false);
                  transition(secondary.next);
                }}
                disabled={busy}
              >
                {secondary.label}
              </MenuItem>
            )}
            <MenuItem
              onClick={async () => {
                setShowMore(false);
                if (!confirm("Delete this item and its transactions?")) return;
                setBusy(true);
                try {
                  const res = await fetch(`/api/inventory/${id}`, {
                    method: "DELETE",
                  });
                  if (res.ok) router.push("/inventory");
                } finally {
                  setBusy(false);
                }
              }}
              disabled={busy}
              destructive
            >
              Delete item
            </MenuItem>
          </MoreMenu>
        )}
      </div>
    </div>
  );
}

function MoreMenu({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) onClose();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);
  return (
    <div
      ref={ref}
      role="menu"
      className="absolute right-0 top-full z-30 mt-1 w-48 overflow-hidden rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-card)] py-1 shadow-lg"
    >
      {children}
    </div>
  );
}

function MenuItem({
  children,
  onClick,
  disabled,
  destructive,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  destructive?: boolean;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      disabled={disabled}
      className={`block w-full px-3 py-1.5 text-left text-sm hover:bg-[var(--surface-muted)] disabled:opacity-50 ${
        destructive
          ? "text-[var(--accent-rose-soft-fg)]"
          : "text-[var(--text-primary)]"
      }`}
    >
      {children}
    </button>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-medium text-[var(--text-secondary)]">
        {label}
      </span>
      {children}
    </label>
  );
}

// Kept exported for any external imports; no longer rendered on the detail
// page (delete moved into the More menu next to ItemActions).
export function DeleteItemButton({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function remove() {
    if (!confirm("Delete this item and its transactions?")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/inventory/${id}`, { method: "DELETE" });
      if (res.ok) router.push("/inventory");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button
      variant="destructive"
      size="md"
      onClick={remove}
      disabled={busy}
    >
      Delete item
    </Button>
  );
}
