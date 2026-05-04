"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";

export function RestoreForm() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [confirm, setConfirm] = useState("");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    counts: Record<string, number>;
    restoredAt: string;
  } | null>(null);
  const [busy, startTransition] = useTransition();

  const armed = confirm.trim().toUpperCase() === "REPLACE";

  function pickFile() {
    inputRef.current?.click();
  }

  function onFilePicked(file: File) {
    setError(null);
    setResult(null);
    setPendingFile(file);
  }

  function cancelRestore() {
    setPendingFile(null);
  }

  async function executeRestore() {
    if (!pendingFile) return;
    let parsed: unknown;
    try {
      parsed = JSON.parse(await pendingFile.text());
    } catch {
      setError("That file isn't valid JSON.");
      setPendingFile(null);
      return;
    }

    startTransition(async () => {
      const res = await fetch("/api/backup/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed),
      });
      const body = await res.json().catch(() => ({}));
      setPendingFile(null);
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
    <div className="space-y-4">
      <label className="block text-xs font-medium text-[var(--accent-rose-soft-fg)]">
        Type{" "}
        <code className="rounded bg-[var(--surface-card)] px-1 py-0.5 font-mono text-[var(--accent-rose)]">
          REPLACE
        </code>{" "}
        to enable the restore button:
        <input
          type="text"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="mt-1 block w-48 rounded-[var(--radius-md)] border border-[var(--accent-rose)]/40 bg-[var(--surface-card)] px-2 py-1 font-mono text-sm"
        />
      </label>

      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="destructive"
          size="sm"
          disabled={!armed || busy}
          onClick={pickFile}
        >
          {busy ? "Restoring…" : "Choose backup file…"}
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onFilePicked(f);
            e.target.value = "";
          }}
        />
      </div>

      {error && (
        <p className="rounded-[var(--radius-md)] bg-[var(--accent-rose-soft)] px-3 py-2 text-xs text-[var(--accent-rose-soft-fg)]">
          {error}
        </p>
      )}
      {result && (
        <div className="rounded-[var(--radius-md)] bg-[var(--accent-emerald-soft)] p-3 text-xs text-[var(--accent-emerald-soft-fg)]">
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

      {pendingFile && (
        <ConfirmRestoreModal
          fileName={pendingFile.name}
          fileSize={pendingFile.size}
          busy={busy}
          onCancel={cancelRestore}
          onConfirm={executeRestore}
        />
      )}
    </div>
  );
}

function ConfirmRestoreModal({
  fileName,
  fileSize,
  busy,
  onCancel,
  onConfirm,
}: {
  fileName: string;
  fileSize: number;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const sizeKb = Math.max(1, Math.round(fileSize / 1024));
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="restore-confirm-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={busy ? undefined : onCancel}
    >
      <div
        className="w-full max-w-md rounded-[var(--radius-lg)] border border-[var(--accent-rose)]/40 bg-[var(--surface-card)] p-5 shadow-[var(--elev-3)]"
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          id="restore-confirm-title"
          className="font-display text-xl font-semibold text-[var(--accent-rose)]"
        >
          Replace all your data?
        </h2>
        <p className="mt-2 text-sm text-[var(--text-primary)]">
          You&apos;re about to wipe every row you currently have and replace
          it with the contents of <strong>{fileName}</strong> ({sizeKb} KB).
        </p>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          This cannot be undone. Other users&apos; data is not touched.
        </p>
        <div className="mt-5 flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onCancel}
            disabled={busy}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? "Restoring…" : "Yes, replace my data"}
          </Button>
        </div>
      </div>
    </div>
  );
}
