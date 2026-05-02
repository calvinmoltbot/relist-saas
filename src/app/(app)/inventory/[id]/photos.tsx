"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

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
  const [busy, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const canAdd = photos.length < MAX_PHOTOS && !busy;

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
      setPhotos(body.item.photoUrls ?? []);
      router.refresh();
    });
  }

  return (
    <section>
      <div className="flex items-end justify-between">
        <h2 className="text-sm font-medium text-gray-600">
          Photos {photos.length > 0 && <span className="text-gray-400">· {photos.length}/{MAX_PHOTOS}</span>}
        </h2>
        {canAdd && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-50"
            disabled={busy}
          >
            {busy ? "Uploading…" : "Add photos"}
          </button>
        )}
      </div>

      {error && (
        <p className="mt-2 rounded-md bg-red-50 p-2 text-xs text-red-700">
          {error}
        </p>
      )}

      {photos.length === 0 ? (
        <p className="mt-2 text-sm text-gray-500">
          No photos yet. {canAdd && "Add up to 10 — they will be resized to 1200px."}
        </p>
      ) : (
        <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-5">
          {photos.map((src, i) => (
            <div
              key={i}
              className="relative aspect-square overflow-hidden rounded-md border bg-gray-50"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={`Photo ${i + 1}`} className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => handleRemove(i)}
                disabled={busy}
                aria-label={`Remove photo ${i + 1}`}
                className="absolute right-1 top-1 rounded bg-white/90 px-1.5 py-0.5 text-xs text-red-700 shadow hover:bg-white disabled:opacity-50"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
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
