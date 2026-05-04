"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type AcquisitionType = "bought" | "own";

const LABEL: Record<AcquisitionType, string> = {
  bought: "Bought",
  own: "Own",
};

/**
 * Small chip rendered next to StatusPill on the item-detail page. Click to
 * toggle between `bought` and `own`. Switching to `own` zeros the cost on
 * the server; switching to `bought` clears it for re-entry. See AGENTS.md →
 * "Cost handling".
 */
export function AcquisitionChip({
  id,
  initial,
}: {
  id: string;
  initial: AcquisitionType;
}) {
  const router = useRouter();
  const [type, setType] = useState<AcquisitionType>(initial);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    const next: AcquisitionType = type === "bought" ? "own" : "bought";
    setBusy(true);
    try {
      const res = await fetch(`/api/inventory/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ acquisitionType: next }),
      });
      if (res.ok) {
        setType(next);
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      title="Toggle acquisition type"
      aria-label={`Acquisition type: ${LABEL[type]}. Click to change.`}
      className="inline-flex items-center gap-1.5 rounded-full bg-[var(--surface-muted)] px-2.5 py-1 text-[11px] font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-inset)] hover:text-[var(--text-primary)] disabled:opacity-50"
    >
      <span
        className="h-1.5 w-1.5 rounded-full bg-[var(--text-muted)]"
        aria-hidden
      />
      {LABEL[type]}
    </button>
  );
}
