"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Row = {
  id: string;
  category: string;
  description: string | null;
  amount: string;
  incurredAt: string;
};

const CATEGORIES = [
  "shipping_supplies",
  "packaging",
  "promotion",
  "platform_fee",
  "other",
];

export function ExpensesClient({ initialRows }: { initialRows: Row[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    category: "shipping_supplies",
    amount: "",
    description: "",
    incurredAt: new Date().toISOString().slice(0, 10),
  });

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...form,
          amount: parseFloat(form.amount),
          incurredAt: form.incurredAt,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
      setForm({ ...form, amount: "", description: "" });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this expense?")) return;
    const res = await fetch(`/api/expenses/${id}`, { method: "DELETE" });
    if (res.ok) router.refresh();
  }

  return (
    <div className="space-y-6">
      <form onSubmit={add} className="grid grid-cols-1 gap-3 md:grid-cols-5">
        <select
          value={form.category}
          onChange={(e) => setForm({ ...form, category: e.target.value })}
          className="rounded-md border px-3 py-2 text-sm"
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c.replace(/_/g, " ")}
            </option>
          ))}
        </select>
        <input
          type="number"
          step="0.01"
          placeholder="Amount £"
          value={form.amount}
          onChange={(e) => setForm({ ...form, amount: e.target.value })}
          className="rounded-md border px-3 py-2 text-sm"
          required
        />
        <input
          type="date"
          value={form.incurredAt}
          onChange={(e) => setForm({ ...form, incurredAt: e.target.value })}
          className="rounded-md border px-3 py-2 text-sm"
          required
        />
        <input
          type="text"
          placeholder="Description (optional)"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          className="rounded-md border px-3 py-2 text-sm md:col-span-1"
        />
        <button
          disabled={busy}
          className="rounded-md bg-black px-4 py-2 text-sm text-white disabled:opacity-50"
        >
          {busy ? "Adding…" : "Add expense"}
        </button>
        {error && (
          <div className="md:col-span-5 text-sm text-red-600">{error}</div>
        )}
      </form>

      {initialRows.length === 0 ? (
        <p className="rounded-md border border-dashed p-6 text-sm text-gray-500">
          No expenses in range.
        </p>
      ) : (
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b text-left text-xs uppercase text-gray-500">
              <th className="py-2 pr-4">Date</th>
              <th className="py-2 pr-4">Category</th>
              <th className="py-2 pr-4">Description</th>
              <th className="py-2 pr-4 text-right">Amount</th>
              <th className="py-2 pr-4"></th>
            </tr>
          </thead>
          <tbody>
            {initialRows.map((r) => (
              <tr key={r.id} className="border-b">
                <td className="py-2 pr-4">
                  {new Date(r.incurredAt).toLocaleDateString()}
                </td>
                <td className="py-2 pr-4">{r.category.replace(/_/g, " ")}</td>
                <td className="py-2 pr-4 text-gray-600">{r.description ?? "—"}</td>
                <td className="py-2 pr-4 text-right font-medium">
                  £{parseFloat(r.amount).toFixed(2)}
                </td>
                <td className="py-2 pr-4 text-right">
                  <button
                    onClick={() => remove(r.id)}
                    className="text-xs text-red-600 underline"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
