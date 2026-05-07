"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui";
import {
  scoreItem,
  type CompletenessField,
  type FieldStatus,
} from "@/lib/inventory/completeness";

type Initial = {
  name: string;
  brand: string | null;
  category: string | null;
  size: string | null;
  description: string | null;
  vintedUrl: string | null;
  photoCount: number;
};

const FOCUS_PARAM_FIELDS: CompletenessField[] = [
  "title",
  "brand",
  "category",
  "size",
  "description",
  "vintedUrl",
  "photos",
];

export function EditDetails({
  itemId,
  initial,
}: {
  itemId: string;
  initial: Initial;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const focusParam = searchParams.get("focus") as CompletenessField | null;
  const shouldOpen = focusParam != null && FOCUS_PARAM_FIELDS.includes(focusParam);

  const [open, setOpen] = useState(shouldOpen);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: initial.name ?? "",
    brand: initial.brand ?? "",
    category: initial.category ?? "",
    size: initial.size ?? "",
    description: initial.description ?? "",
    vintedUrl: initial.vintedUrl ?? "",
  });

  const refs = {
    title: useRef<HTMLInputElement | null>(null),
    brand: useRef<HTMLInputElement | null>(null),
    category: useRef<HTMLInputElement | null>(null),
    size: useRef<HTMLInputElement | null>(null),
    description: useRef<HTMLTextAreaElement | null>(null),
    vintedUrl: useRef<HTMLInputElement | null>(null),
  };

  // Auto-focus the requested field once when the section is auto-opened.
  useEffect(() => {
    if (!open || !focusParam) return;
    const r = refs[focusParam as keyof typeof refs] as
      | { current: HTMLElement | null }
      | undefined;
    if (r?.current) {
      r.current.focus();
      r.current.scrollIntoView({ block: "center", behavior: "smooth" });
    }
    // photos doesn't have a field here — fall through to the photo grid above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Live completeness preview as the user types.
  const preview = scoreItem({
    name: form.name,
    brand: form.brand || null,
    category: form.category || null,
    size: form.size || null,
    description: form.description || null,
    photoCount: initial.photoCount,
    vintedUrl: form.vintedUrl || null,
  });

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const payload: Record<string, string | null> = {
        name: form.name.trim() || null,
        brand: form.brand.trim() || null,
        category: form.category.trim() || null,
        size: form.size.trim() || null,
        description: form.description.trim() || null,
        vintedUrl: form.vintedUrl.trim() || null,
      };
      const res = await fetch(`/api/inventory/${itemId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        setError(body?.error ?? `Save failed (${res.status})`);
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface-card)] p-5">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">
            Listing details
          </h2>
          <p className="mt-0.5 text-xs text-[var(--text-muted)]">
            {preview.score === 100
              ? "All seven completeness fields are filled."
              : `${preview.missing.length} field${preview.missing.length === 1 ? "" : "s"} missing — completeness ${preview.score}/100.`}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] px-2.5 py-1 text-xs font-medium text-[var(--text-secondary)] hover:border-[var(--border-default)] hover:text-[var(--text-primary)]"
        >
          {open ? "Close" : "Edit"}
        </button>
      </header>

      {!open && preview.missing.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {preview.missing.map((m) => (
            <li key={m.field}>
              <button
                type="button"
                onClick={() => setOpen(true)}
                title={m.hint}
                className="inline-flex items-center gap-1 rounded-[var(--radius-sm)] bg-[var(--accent-amber-soft)] px-1.5 py-0.5 text-[11px] font-medium text-[var(--accent-amber-soft-fg)] hover:bg-[var(--accent-amber)]/30"
              >
                <span className="tabular-nums opacity-80">+{m.weight}</span>
                <span>{m.label}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {open && (
        <form onSubmit={save} className="mt-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field
              label="Title"
              hint={fieldHint(preview.fields, "title")}
              full
            >
              <input
                ref={refs.title}
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className={inputCls}
                disabled={busy}
              />
            </Field>
            <Field label="Brand" hint={fieldHint(preview.fields, "brand")}>
              <input
                ref={refs.brand}
                type="text"
                value={form.brand}
                onChange={(e) => setForm({ ...form, brand: e.target.value })}
                className={inputCls}
                disabled={busy}
              />
            </Field>
            <Field label="Category" hint={fieldHint(preview.fields, "category")}>
              <input
                ref={refs.category}
                type="text"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className={inputCls}
                disabled={busy}
              />
            </Field>
            <Field label="Size" hint={fieldHint(preview.fields, "size")}>
              <input
                ref={refs.size}
                type="text"
                value={form.size}
                onChange={(e) => setForm({ ...form, size: e.target.value })}
                className={inputCls}
                disabled={busy}
              />
            </Field>
            <Field
              label="Vinted URL"
              hint={fieldHint(preview.fields, "vintedUrl")}
            >
              <input
                ref={refs.vintedUrl}
                type="url"
                placeholder="https://www.vinted.co.uk/items/…"
                value={form.vintedUrl}
                onChange={(e) => setForm({ ...form, vintedUrl: e.target.value })}
                className={inputCls}
                disabled={busy}
              />
            </Field>
            <Field
              label="Description"
              hint={fieldHint(preview.fields, "description")}
              full
            >
              <textarea
                ref={refs.description}
                rows={4}
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                className={`${inputCls} min-h-[6rem] resize-y`}
                disabled={busy}
              />
            </Field>
          </div>

          {error && (
            <p className="rounded-[var(--radius-sm)] bg-[var(--accent-rose-soft)] px-2 py-1.5 text-xs text-[var(--accent-rose-soft-fg)]">
              {error}
            </p>
          )}

          <div className="flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setOpen(false)}
              disabled={busy}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={busy}>
              {busy ? "Saving…" : "Save details"}
            </Button>
          </div>
        </form>
      )}
    </section>
  );
}

const inputCls =
  "w-full rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--surface-inset)] px-2 py-1.5 text-sm focus:border-[var(--brand)] focus:outline-none focus:ring-1 focus:ring-[var(--brand)] disabled:opacity-50";

function fieldHint(
  fields: FieldStatus[],
  field: CompletenessField,
): string {
  const f = fields.find((x) => x.field === field);
  if (!f) return "";
  return f.present ? `✓ ${f.label}` : `${f.label} · +${f.weight} pts`;
}

function Field({
  label,
  hint,
  children,
  full,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  full?: boolean;
}) {
  return (
    <label className={`flex flex-col gap-1 ${full ? "sm:col-span-2" : ""}`}>
      <span className="flex items-baseline justify-between gap-2">
        <span className="text-[11px] font-medium uppercase tracking-wide text-[var(--text-muted)]">
          {label}
        </span>
        {hint && (
          <span
            className={`text-[10px] tabular-nums ${hint.startsWith("✓") ? "text-[var(--accent-emerald-soft-fg)]" : "text-[var(--accent-amber-soft-fg)]"}`}
          >
            {hint}
          </span>
        )}
      </span>
      {children}
    </label>
  );
}
