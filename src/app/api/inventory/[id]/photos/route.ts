import { NextRequest, NextResponse } from "next/server";
import { getUserId, UnauthorizedError } from "@/lib/auth/getUserId";
import { userScope } from "@/lib/db/scoped";
import {
  isBlobUrl,
  resizeAndUploadFromDataUri,
  tryDeleteBlobUrl,
  uploadThumbFromDataUri,
} from "@/lib/photos";

const MAX_PHOTOS_PER_ITEM = 10;
const MAX_BATCH = 5;

// POST /api/inventory/[id]/photos
// Body: { photos: string[] }  — array of base64 data URIs from the client.
// Server-resizes each one to a 1200x1200 JPEG (full) + 200x200 JPEG (thumb)
// and uploads both to Vercel Blob.  We persist the public Blob URLs into
// items.photoUrls / items.thumbnailUrl.  Existing rows in the database
// can still hold legacy data: URIs and continue to render via the proxy
// route — a backfill is phase 2.
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

  let uploaded: { full: string; thumb: string }[];
  try {
    const results = await Promise.all(
      incoming
        .slice(0, slotsLeft)
        .map((p) => resizeAndUploadFromDataUri(p, userId, id)),
    );
    uploaded = results.filter(
      (r): r is { full: string; thumb: string } => r != null,
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "upload failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  if (uploaded.length === 0) {
    return NextResponse.json(
      { error: "could not decode any of the provided photos" },
      { status: 400 },
    );
  }

  const nextPhotos = [...existing, ...uploaded.map((r) => r.full)];
  const nextThumb = item.thumbnailUrl || uploaded[0].thumb;
  const [updated] = await scope.setItemPhotos(id, nextPhotos, nextThumb);

  return NextResponse.json({
    added: uploaded.length,
    skipped: incoming.length - uploaded.length,
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

  const removed = photos[index];
  const next = photos.filter((_, i) => i !== index);

  // Re-derive the thumbnail when we removed the first photo.  For new (Blob)
  // first photos we have to upload a fresh thumb because the original `full`
  // is already an https URL — re-resizing in-memory isn't possible without
  // re-fetching it.  In that case we just point the thumbnail at the new
  // first photo (the CDN copy is the 1200px full; using it as a thumb is
  // sub-optimal but cheap and correct).  For legacy base64 rows we still
  // run sharp the way the old code did.
  let nextThumb: string | null = item.thumbnailUrl;
  let oldThumbToDelete: string | null = null;
  if (index === 0) {
    if (next.length === 0) {
      oldThumbToDelete = item.thumbnailUrl;
      nextThumb = null;
    } else {
      const firstNext = next[0];
      if (firstNext.startsWith("data:")) {
        const reThumb = await uploadThumbFromDataUri(firstNext, userId, id).catch(
          () => null,
        );
        // If blob upload failed (no token in dev), fall back to using the
        // legacy data URI as the thumb — keeps behaviour for legacy rows.
        nextThumb = reThumb ?? firstNext;
      } else {
        nextThumb = firstNext;
      }
      // The old thumb is only safe to delete if it differs from what we're
      // setting now and isn't referenced elsewhere in photoUrls.
      if (
        item.thumbnailUrl &&
        item.thumbnailUrl !== nextThumb &&
        !next.includes(item.thumbnailUrl)
      ) {
        oldThumbToDelete = item.thumbnailUrl;
      }
    }
  }

  const [updated] = await scope.setItemPhotos(id, next, nextThumb);

  // Best-effort blob cleanup after the DB has been updated.  Failures are
  // swallowed inside tryDeleteBlobUrl.
  const toDelete: string[] = [];
  if (isBlobUrl(removed)) toDelete.push(removed);
  if (oldThumbToDelete && isBlobUrl(oldThumbToDelete)) {
    toDelete.push(oldThumbToDelete);
  }
  await Promise.all(toDelete.map((u) => tryDeleteBlobUrl(u)));

  return NextResponse.json({
    removed: index,
    photoCount: next.length,
    item: updated,
  });
}
