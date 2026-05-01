"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Status = "sourced" | "listed" | "sold" | "shipped";

export function ItemActions({
  id,
  status,
  listedPrice,
  soldPrice,
}: {
  id: string;
  status: string;
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

  async function remove() {
    if (!confirm("Delete this item and its transactions?")) return;
    const res = await fetch(`/api/inventory/${id}`, { method: "DELETE" });
    if (res.ok) router.push("/inventory");
  }

  const next: Record<string, Status[]> = {
    sourced: ["listed"],
    listed: ["sold", "sourced"],
    sold: ["shipped"],
    shipped: [],
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {next[status]?.map((s) => (
        <button
          key={s}
          disabled={busy}
          onClick={() => transition(s)}
          className="rounded-md border px-3 py-1.5 text-sm disabled:opacity-50"
        >
          Mark as {s}
        </button>
      ))}
      <button
        onClick={remove}
        disabled={busy}
        className="ml-auto rounded-md border border-red-200 px-3 py-1.5 text-sm text-red-600 disabled:opacity-50"
      >
        Delete
      </button>

      {showSell && (
        <form
          onSubmit={confirmSell}
          className="mt-3 w-full rounded-md border bg-amber-50 p-4"
        >
          <div className="text-sm font-medium">Mark as sold</div>
          <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
            <label className="flex flex-col gap-1">
              <span className="text-xs text-gray-600">Sold price (£)</span>
              <input
                type="number"
                step="0.01"
                value={sell.soldPrice}
                onChange={(e) => setSell({ ...sell, soldPrice: e.target.value })}
                className="rounded-md border px-2 py-1.5"
                required
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-gray-600">Shipping (£)</span>
              <input
                type="number"
                step="0.01"
                value={sell.shippingCost}
                onChange={(e) => setSell({ ...sell, shippingCost: e.target.value })}
                className="rounded-md border px-2 py-1.5"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-gray-600">Platform fees (£)</span>
              <input
                type="number"
                step="0.01"
                value={sell.platformFees}
                onChange={(e) => setSell({ ...sell, platformFees: e.target.value })}
                className="rounded-md border px-2 py-1.5"
              />
            </label>
          </div>
          <div className="mt-3 flex gap-2">
            <button className="rounded-md bg-black px-3 py-1.5 text-sm text-white">
              Confirm sale
            </button>
            <button
              type="button"
              onClick={() => setShowSell(false)}
              className="rounded-md border px-3 py-1.5 text-sm"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
