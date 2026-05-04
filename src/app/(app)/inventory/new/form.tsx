"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type AcquisitionType = "bought" | "own";

export function NewItemForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [acquisitionType, setAcquisitionType] =
    useState<AcquisitionType>("bought");
  const [form, setForm] = useState({
    name: "",
    brand: "",
    category: "",
    size: "",
    condition: "good",
    costPrice: "",
    listedPrice: "",
    status: "sourced" as "sourced" | "listed" | "sold" | "shipped",
    description: "",
    vintedUrl: "",
  });

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      // 'own' items always have cost = 0 (cleaner than null going forward).
      const costPrice =
        acquisitionType === "own"
          ? "0"
          : form.costPrice === ""
            ? null
            : form.costPrice;
      const res = await fetch("/api/inventory", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...form,
          acquisitionType,
          costPrice,
          listedPrice: form.listedPrice || null,
          vintedUrl: form.vintedUrl || null,
          brand: form.brand || null,
          category: form.category || null,
          size: form.size || null,
          description: form.description || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      router.push(`/inventory/${data.item.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
      <div className="md:col-span-2">
        <span className="text-xs uppercase text-gray-500">
          Where did this come from?
        </span>
        <div
          role="radiogroup"
          aria-label="Where did this come from?"
          className="mt-1 inline-flex rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface-inset)] p-1"
        >
          {(
            [
              { value: "bought", label: "Bought" },
              { value: "own", label: "Own" },
            ] as const
          ).map((opt) => {
            const isActive = acquisitionType === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                role="radio"
                aria-checked={isActive}
                onClick={() => setAcquisitionType(opt.value)}
                className={`inline-flex items-center rounded-[var(--radius-md)] px-4 py-1.5 text-xs font-medium transition-colors ${
                  isActive
                    ? "bg-[var(--brand)] text-white shadow-[var(--elev-1)]"
                    : "text-[var(--text-secondary)] hover:bg-[var(--surface-card)] hover:text-[var(--text-primary)]"
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
        <p className="mt-1 text-[11px] text-gray-500">
          {acquisitionType === "own"
            ? "Already yours — we treat the cost as £0."
            : "Sourced for resale — record what you paid."}
        </p>
      </div>

      <Field label="Name *" full>
        <input
          required
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
          className="w-full rounded-md border px-3 py-2 text-sm"
        />
      </Field>
      <Field label="Brand">
        <input
          value={form.brand}
          onChange={(e) => set("brand", e.target.value)}
          className="w-full rounded-md border px-3 py-2 text-sm"
        />
      </Field>
      <Field label="Category">
        <input
          value={form.category}
          onChange={(e) => set("category", e.target.value)}
          className="w-full rounded-md border px-3 py-2 text-sm"
        />
      </Field>
      <Field label="Size">
        <input
          value={form.size}
          onChange={(e) => set("size", e.target.value)}
          className="w-full rounded-md border px-3 py-2 text-sm"
        />
      </Field>
      <Field label="Condition">
        <select
          value={form.condition}
          onChange={(e) => set("condition", e.target.value)}
          className="w-full rounded-md border px-3 py-2 text-sm"
        >
          {["new", "like_new", "good", "fair"].map((c) => (
            <option key={c} value={c}>
              {c.replace(/_/g, " ")}
            </option>
          ))}
        </select>
      </Field>
      {acquisitionType === "bought" && (
        <Field label="Cost price (£)">
          <input
            type="number"
            step="0.01"
            value={form.costPrice}
            onChange={(e) => set("costPrice", e.target.value)}
            className="w-full rounded-md border px-3 py-2 text-sm"
          />
        </Field>
      )}
      <Field label="Listed price (£)">
        <input
          type="number"
          step="0.01"
          value={form.listedPrice}
          onChange={(e) => set("listedPrice", e.target.value)}
          className="w-full rounded-md border px-3 py-2 text-sm"
        />
      </Field>
      <Field label="Status">
        <select
          value={form.status}
          onChange={(e) =>
            set("status", e.target.value as typeof form.status)
          }
          className="w-full rounded-md border px-3 py-2 text-sm"
        >
          {["sourced", "listed", "sold", "shipped"].map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Vinted URL" full>
        <input
          type="url"
          value={form.vintedUrl}
          onChange={(e) => set("vintedUrl", e.target.value)}
          className="w-full rounded-md border px-3 py-2 text-sm"
        />
      </Field>
      <Field label="Description" full>
        <textarea
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
          rows={3}
          className="w-full rounded-md border px-3 py-2 text-sm"
        />
      </Field>

      {error && <div className="md:col-span-2 text-sm text-red-600">{error}</div>}

      <div className="md:col-span-2">
        <button
          disabled={busy}
          className="rounded-md bg-black px-5 py-2 text-sm text-white disabled:opacity-50"
        >
          {busy ? "Saving…" : "Save item"}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  children,
  full,
}: {
  label: string;
  children: React.ReactNode;
  full?: boolean;
}) {
  return (
    <label className={`flex flex-col gap-1 text-sm ${full ? "md:col-span-2" : ""}`}>
      <span className="text-xs uppercase text-gray-500">{label}</span>
      {children}
    </label>
  );
}
