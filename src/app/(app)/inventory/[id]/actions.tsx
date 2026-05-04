"use client";

import { useMemo, useState } from "react";
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
  const [sell, setSell] = useState({
    soldPrice: soldPrice ?? listedPrice ?? "",
    shippingCost: "0",
    platformFees: "0",
  });

  const estimatedProfit = useMemo(() => {
    const gross = gbpNum(sell.soldPrice);
    const ship = gbpNum(sell.shippingCost);
    const fees = gbpNum(sell.platformFees);
    const cost = gbpNum(costPrice);
    return gross - ship - fees - cost;
  }, [sell, costPrice]);

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
      platformFees: sell.platformFees || "0",
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

  if (!primary && !secondary && !showSell) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {primary && (
          <Button
            disabled={busy}
            onClick={() => transition(primary.next)}
            variant="primary"
            size="md"
          >
            {primary.label}
          </Button>
        )}
        {secondary && (
          <Button
            disabled={busy}
            onClick={() => transition(secondary.next)}
            variant="secondary"
            size="md"
          >
            {secondary.label}
          </Button>
        )}
      </div>

      {showSell && (
        <form
          onSubmit={confirmSell}
          className="rounded-[var(--radius-lg)] border border-[var(--accent-amber)]/40 bg-[var(--accent-amber-soft)] p-5"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-[var(--accent-amber-soft-fg)]">
                Mark as sold
              </h3>
              <p className="mt-0.5 text-xs text-[var(--accent-amber-soft-fg)]/80">
                Record the sale to update profit and transactions.
              </p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Field label="Sold price (£)">
              <input
                type="number"
                step="0.01"
                value={sell.soldPrice}
                onChange={(e) =>
                  setSell({ ...sell, soldPrice: e.target.value })
                }
                required
                className="w-full rounded-[var(--radius-md)] border border-[var(--border-default)] bg-white px-3 py-2 text-sm focus:border-[var(--brand)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/30"
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
                className="w-full rounded-[var(--radius-md)] border border-[var(--border-default)] bg-white px-3 py-2 text-sm focus:border-[var(--brand)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/30"
              />
            </Field>
            <Field label="Platform fees (£)">
              <input
                type="number"
                step="0.01"
                value={sell.platformFees}
                onChange={(e) =>
                  setSell({ ...sell, platformFees: e.target.value })
                }
                className="w-full rounded-[var(--radius-md)] border border-[var(--border-default)] bg-white px-3 py-2 text-sm focus:border-[var(--brand)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/30"
              />
            </Field>
          </div>

          <div className="mt-4 flex items-center justify-between rounded-[var(--radius-md)] bg-white/60 px-3 py-2 text-sm">
            <span className="text-[var(--accent-amber-soft-fg)]">
              Estimated profit
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

          <div className="mt-4 flex flex-wrap gap-2">
            <Button type="submit" variant="primary" size="md" disabled={busy}>
              Confirm sale
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="md"
              onClick={() => setShowSell(false)}
              disabled={busy}
            >
              Cancel
            </Button>
          </div>
        </form>
      )}
    </div>
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
      <span className="text-xs font-medium text-[var(--accent-amber-soft-fg)]">
        {label}
      </span>
      {children}
    </label>
  );
}

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
