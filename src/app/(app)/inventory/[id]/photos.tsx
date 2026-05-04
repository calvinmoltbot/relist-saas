"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";

const MAX_PHOTOS = 10;
const MAX_BATCH = 5;

export function ItemPhotos({
  itemId,
  initialPhotos,
}: {
  itemId: string;
  initialPhotos: string[];
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [photos, setPhotos] = useState<string[]>(initialPhotos);
  const [activeIndex, setActiveIndex] = useState(0);
  const [busy, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const canAdd = photos.length < MAX_PHOTOS && !busy;
  const active = photos[activeIndex] ?? photos[0];

  async function readFiles(files: FileList): Promise<string[]> {
    const slots = MAX_PHOTOS - photos.length;
    const limit = Math.min(slots, MAX_BATCH, files.length);
    const out: string[] = [];
    for (let i = 0; i < limit; i++) {
      const file = files[i];
      if (!file.type.startsWith("image/")) continue;
      const dataUri = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });
      out.push(dataUri);
    }
    return out;
  }

  async function handleFiles(list: FileList | null) {
    if (!list || list.length === 0) return;
    setError(null);
    const dataUris = await readFiles(list);
    if (dataUris.length === 0) return;

    startTransition(async () => {
      const res = await fetch(`/api/inventory/${itemId}/photos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photos: dataUris }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? "Upload failed");
        return;
      }
      const body = await res.json();
      setPhotos(body.item.photoUrls ?? []);
      router.refresh();
    });
  }

  async function handleRemove(index: number) {
    setError(null);
    startTransition(async () => {
      const res = await fetch(
        `/api/inventory/${itemId}/photos?index=${index}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? "Delete failed");
        return;
      }
      const body = await res.json();
      const nextPhotos: string[] = body.item.photoUrls ?? [];
      setPhotos(nextPhotos);
      setActiveIndex((i) => Math.min(i, Math.max(0, nextPhotos.length - 1)));
      router.refresh();
    });
  }

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-medium text-[var(--text-secondary)]">
          Photos
          {photos.length > 0 && (
            <span className="ml-1 text-[var(--text-muted)]">
              · {photos.length}/{MAX_PHOTOS}
            </span>
          )}
        </h2>
        {canAdd && (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
          >
            {busy ? "Uploading…" : "Add photos"}
          </Button>
        )}
      </div>

      {error && (
        <p className="rounded-[var(--radius-md)] bg-[var(--accent-rose-soft)] p-2 text-xs text-[var(--accent-rose-soft-fg)]">
          {error}
        </p>
      )}

      {photos.length === 0 ? (
        <div className="flex h-[340px] w-full items-center justify-center rounded-[var(--radius-lg)] border border-dashed border-[var(--border-subtle)] bg-[var(--surface-inset)] text-sm text-[var(--text-muted)]">
          {canAdd
            ? "No photos yet — add up to 10 (resized to 1200px)."
            : "No photos."}
        </div>
      ) : (
        <>
          <div className="relative h-[340px] w-full overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface-inset)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={active}
              alt={`Photo ${activeIndex + 1}`}
              className="h-full w-full object-contain"
            />
            <button
              type="button"
              onClick={() => handleRemove(activeIndex)}
              disabled={busy}
              aria-label={`Remove photo ${activeIndex + 1}`}
              className="absolute right-2 top-2 rounded-[var(--radius-sm)] bg-white/90 px-2 py-1 text-xs font-medium text-[var(--accent-rose-soft-fg)] shadow-[var(--elev-1)] hover:bg-white disabled:opacity-50"
            >
              Remove
            </button>
          </div>

          {photos.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {photos.map((src, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setActiveIndex(i)}
                  aria-label={`Show photo ${i + 1}`}
                  aria-current={i === activeIndex}
                  className={`relative h-14 w-14 flex-none overflow-hidden rounded-[var(--radius-md)] border bg-[var(--surface-inset)] transition ${
                    i === activeIndex
                      ? "border-[var(--brand)] ring-2 ring-[var(--brand)]/30"
                      : "border-[var(--border-subtle)] hover:border-[var(--border-default)]"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={src}
                    alt={`Thumbnail ${i + 1}`}
                    className="h-full w-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = "";
        }}
      />
    </section>
  );
}
