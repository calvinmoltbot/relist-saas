"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function RestoreForm() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    counts: Record<string, number>;
    restoredAt: string;
  } | null>(null);
  const [busy, startTransition] = useTransition();

  const armed = confirm.trim().toUpperCase() === "REPLACE";

  async function handleFile(file: File) {
    setError(null);
    setResult(null);
    let parsed: unknown;
    try {
      parsed = JSON.parse(await file.text());
    } catch {
      setError("That file isn't valid JSON.");
      return;
    }

    startTransition(async () => {
      const res = await fetch("/api/backup/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error ?? `Restore failed (${res.status})`);
        return;
      }
      setResult(body);
      setConfirm("");
      router.refresh();
    });
  }

  return (
    <div className="mt-3 space-y-3">
      <label className="block text-xs font-medium text-red-900">
        Type <code className="rounded bg-red-100 px-1">REPLACE</code> to enable
        the restore button:
        <input
          type="text"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="mt-1 block w-48 rounded-md border border-red-300 px-2 py-1 text-sm font-mono"
        />
      </label>

      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={!armed || busy}
          onClick={() => inputRef.current?.click()}
          className="rounded-md bg-red-600 px-3 py-1.5 text-sm text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? "Restoring…" : "Choose backup file…"}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
            e.target.value = "";
          }}
        />
      </div>

      {error && (
        <p className="rounded-md bg-red-100 p-2 text-xs text-red-800">{error}</p>
      )}
      {result && (
        <div className="rounded-md bg-emerald-50 p-3 text-xs text-emerald-900">
          <p className="font-medium">Restored at {result.restoredAt}</p>
          <ul className="mt-1 space-y-0.5">
            {Object.entries(result.counts).map(([k, v]) => (
              <li key={k}>
                {k}: {v}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
