import { NextRequest, NextResponse } from "next/server";
import { getUserId, UnauthorizedError } from "@/lib/auth/getUserId";
import { userScope } from "@/lib/db/scoped";
import { resizeFromDataUri } from "@/lib/photos";

const MAX_PHOTOS_PER_ITEM = 10;
const MAX_BATCH = 5;

// POST /api/inventory/[id]/photos
// Body: { photos: string[] }  — array of base64 data URIs from the client.
// Server-resizes each one to a 1200x1200 JPEG (full) + 200x200 JPEG (thumb)
// and appends to items.photoUrls. Sets items.thumbnailUrl from the first
// uploaded photo if it's currently empty.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  let userId: string;
  try {
    userId = await getUserId(req);
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: e.message }, { status: 401 });
    }
    throw e;
  }

  const { id } = await params;
  const scope = userScope(userId);
  const item = await scope.getItem(id);
  if (!item) return NextResponse.json({ error: "not found" }, { status: 404 });

  const body = (await req.json().catch(() => null)) as { photos?: unknown } | null;
  if (!body || !Array.isArray(body.photos)) {
    return NextResponse.json(
      { error: "photos: string[] required" },
      { status: 400 },
    );
  }
  const incoming = body.photos.filter((p): p is string => typeof p === "string");
  if (incoming.length === 0) {
    return NextResponse.json({ error: "no photos provided" }, { status: 400 });
  }
  if (incoming.length > MAX_BATCH) {
    return NextResponse.json(
      { error: `max ${MAX_BATCH} photos per upload` },
      { status: 400 },
    );
  }

  const existing = item.photoUrls ?? [];
  const slotsLeft = MAX_PHOTOS_PER_ITEM - existing.length;
  if (slotsLeft <= 0) {
    return NextResponse.json(
      { error: `item already at ${MAX_PHOTOS_PER_ITEM}-photo limit` },
      { status: 400 },
    );
  }

  const resized = await Promise.all(
    incoming.slice(0, slotsLeft).map((p) => resizeFromDataUri(p)),
  );
  const ok = resized.filter(
    (r): r is { full: string; thumb: string } => r != null,
  );
  if (ok.length === 0) {
    return NextResponse.json(
      { error: "could not decode any of the provided photos" },
      { status: 400 },
    );
  }

  const nextPhotos = [...existing, ...ok.map((r) => r.full)];
  const nextThumb = item.thumbnailUrl || ok[0].thumb;
  const [updated] = await scope.setItemPhotos(id, nextPhotos, nextThumb);

  return NextResponse.json({
    added: ok.length,
    skipped: incoming.length - ok.length,
    photoCount: nextPhotos.length,
    item: updated,
  });
}

// DELETE /api/inventory/[id]/photos?index=N — remove the photo at index.
// Recomputes thumbnailUrl if we removed the first photo.
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  let userId: string;
  try {
    userId = await getUserId(req);
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: e.message }, { status: 401 });
    }
    throw e;
  }

  const { id } = await params;
  const indexParam = req.nextUrl.searchParams.get("index");
  const index = indexParam == null ? NaN : Number(indexParam);
  if (!Number.isInteger(index) || index < 0) {
    return NextResponse.json({ error: "index required" }, { status: 400 });
  }

  const scope = userScope(userId);
  const item = await scope.getItem(id);
  if (!item) return NextResponse.json({ error: "not found" }, { status: 404 });

  const photos = item.photoUrls ?? [];
  if (index >= photos.length) {
    return NextResponse.json({ error: "index out of range" }, { status: 400 });
  }

  const next = photos.filter((_, i) => i !== index);
  // If we removed the first photo, refresh the thumbnail from the new first.
  // (Cheaper than re-resizing — we keep the existing thumbnail bytes if
  // it wasn't index 0.)
  let nextThumb: string | null = item.thumbnailUrl;
  if (index === 0) {
    if (next.length === 0) {
      nextThumb = null;
    } else {
      // Re-derive a thumb from the new first photo. Lazy: just store the
      // full data URI as the thumbnail. The /thumb endpoint resizes
      // on-demand anyway. Cleaner approach is to re-run sharp here, but
      // that's a memory spike on a delete; defer until we move to blob.
      const { resizeFromDataUri } = await import("@/lib/photos");
      const resized = await resizeFromDataUri(next[0]);
      nextThumb = resized?.thumb ?? next[0];
    }
  }
  const [updated] = await scope.setItemPhotos(id, next, nextThumb);

  return NextResponse.json({
    removed: index,
    photoCount: next.length,
    item: updated,
  });
}
