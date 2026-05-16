"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui";

export const MAX_PHOTOS_PER_ITEM = 10;
export const MAX_BATCH = 5;

export type StagedPhoto = {
  dataUri: string;
  name: string;
};

async function fileToDataUri(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function PhotoDropzone({
  photos,
  onChange,
  disabled,
  max = MAX_PHOTOS_PER_ITEM,
}: {
  photos: StagedPhoto[];
  onChange: (next: StagedPhoto[]) => void;
  disabled?: boolean;
  max?: number;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canAdd = photos.length < max && !disabled;

  async function ingest(list: FileList | File[]) {
    setError(null);
    const slots = max - photos.length;
    if (slots <= 0) {
      setError(`Max ${max} photos.`);
      return;
    }
    const files = Array.from(list).filter((f) => f.type.startsWith("image/"));
    if (files.length === 0) return;
    const accepted = files.slice(0, slots);
    try {
      const added: StagedPhoto[] = [];
      for (const file of accepted) {
        const dataUri = await fileToDataUri(file);
        added.push({ dataUri, name: file.name });
      }
      onChange([...photos, ...added]);
      if (files.length > accepted.length) {
        setError(`Only added ${accepted.length} — ${max}-photo cap.`);
      }
    } catch {
      setError("Could not read one or more files.");
    }
  }

  function removeAt(index: number) {
    onChange(photos.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[12px] font-medium uppercase tracking-[0.08em] text-[var(--text-muted)]">
          Photos
          {photos.length > 0 && (
            <span className="ml-1 normal-case tracking-normal text-[var(--text-muted)]">
              · {photos.length}/{max}
            </span>
          )}
        </span>
        {canAdd && (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => inputRef.current?.click()}
            disabled={!canAdd}
          >
            Add photos
          </Button>
        )}
      </div>

      <div
        onDragOver={(e) => {
          if (!canAdd) return;
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          if (!canAdd) return;
          e.preventDefault();
          setDragging(false);
          if (e.dataTransfer.files?.length) ingest(e.dataTransfer.files);
        }}
        onClick={() => canAdd && inputRef.current?.click()}
        role="button"
        tabIndex={canAdd ? 0 : -1}
        aria-label="Add photos"
        onKeyDown={(e) => {
          if (!canAdd) return;
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        className={`flex min-h-[88px] w-full cursor-pointer items-center justify-center rounded-[var(--radius-lg)] border border-dashed px-3 py-3 text-center text-xs transition-colors ${
          dragging
            ? "border-[var(--brand)] bg-[var(--brand-soft)]/30"
            : "border-[var(--border-subtle)] bg-[var(--surface-inset)] hover:border-[var(--border-default)]"
        } ${!canAdd ? "cursor-not-allowed opacity-60" : ""}`}
      >
        {photos.length === 0 ? (
          <span className="text-[var(--text-muted)]">
            Drop photos here or click to choose — up to {max}. First one becomes the thumbnail.
          </span>
        ) : (
          <div className="flex w-full flex-wrap gap-2">
            {photos.map((p, i) => (
              <div
                key={i}
                className="relative h-16 w-16 overflow-hidden rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-card)]"
                onClick={(e) => e.stopPropagation()}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.dataUri}
                  alt={p.name}
                  className="h-full w-full object-cover"
                />
                <button
                  type="button"
                  aria-label={`Remove ${p.name}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    removeAt(i);
                  }}
                  disabled={disabled}
                  className="absolute right-0 top-0 rounded-bl-[var(--radius-sm)] bg-black/65 px-1.5 py-0.5 text-[10px] font-medium text-white hover:bg-black/80 disabled:opacity-50"
                >
                  ×
                </button>
              </div>
            ))}
            {canAdd && (
              <div className="flex h-16 w-16 items-center justify-center rounded-[var(--radius-md)] border border-dashed border-[var(--border-subtle)] text-[var(--text-muted)]">
                +
              </div>
            )}
          </div>
        )}
      </div>

      {error && (
        <p className="text-[11px] text-[var(--accent-rose-soft-fg)]">{error}</p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files) ingest(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}
