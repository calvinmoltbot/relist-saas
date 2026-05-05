import sharp from "sharp";
import { put, del } from "@vercel/blob";

// Full-size: 1200x1200 JPEG q70 (~200-400 KB). Detail views.
// Thumbnail: 200x200 JPEG q60 (~10-20 KB). List cards.
//
// Phase 1 (this file): new uploads write to Vercel Blob and we persist the
// public CDN URLs into items.photoUrls / items.thumbnailUrl. Existing rows
// from the legacy world still hold `data:image/...;base64,...` strings;
// readers branch on the prefix (see `thumbSrc`).

const DATA_URI_RE = /^data:(image\/[^;]+);base64,(.+)$/;

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

function assertBlobToken(): string {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    throw new Error(
      "BLOB_READ_WRITE_TOKEN is not set. A Vercel Blob store must be " +
        "provisioned and the token added to the environment before photos " +
        "can be uploaded.",
    );
  }
  return token;
}

export async function resizePhotoBuffer(
  buffer: Buffer,
): Promise<{ full: Buffer; thumb: Buffer }> {
  const [full, thumb] = await Promise.all([
    sharp(buffer)
      .resize(1200, 1200, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 70 })
      .toBuffer(),
    sharp(buffer)
      .resize(200, 200, { fit: "cover" })
      .jpeg({ quality: 60 })
      .toBuffer(),
  ]);
  return { full, thumb };
}

/** Resize an incoming data-URI client upload, push both versions to Vercel
 *  Blob, and return the resulting public URLs.  Throws if the Blob token
 *  isn't configured — we want loud failure, not a silent fallback. */
export async function resizeAndUploadFromDataUri(
  dataUri: string,
  userId: string,
  itemId: string,
): Promise<{ full: string; thumb: string } | null> {
  const match = dataUri.match(DATA_URI_RE);
  if (!match) return null;
  let buffer: Buffer;
  try {
    buffer = Buffer.from(match[2], "base64");
  } catch {
    return null;
  }

  const token = assertBlobToken();
  const { full, thumb } = await resizePhotoBuffer(buffer);

  const basePath = `items/${userId}/${itemId}`;
  const [fullRes, thumbRes] = await Promise.all([
    put(`${basePath}/photo.jpeg`, full, {
      access: "public",
      contentType: "image/jpeg",
      addRandomSuffix: true,
      cacheControlMaxAge: ONE_YEAR_SECONDS,
      token,
    }),
    put(`${basePath}/photo-thumb.jpeg`, thumb, {
      access: "public",
      contentType: "image/jpeg",
      addRandomSuffix: true,
      cacheControlMaxAge: ONE_YEAR_SECONDS,
      token,
    }),
  ]);

  return { full: fullRes.url, thumb: thumbRes.url };
}

/** Resize a buffer that's already been decoded (used by the thumb-rederive
 *  path inside DELETE) and upload only a thumbnail.  Returns the URL. */
export async function uploadThumbFromDataUri(
  dataUri: string,
  userId: string,
  itemId: string,
): Promise<string | null> {
  const match = dataUri.match(DATA_URI_RE);
  if (!match) return null;
  let buffer: Buffer;
  try {
    buffer = Buffer.from(match[2], "base64");
  } catch {
    return null;
  }
  const token = assertBlobToken();
  const { thumb } = await resizePhotoBuffer(buffer);
  const res = await put(
    `items/${userId}/${itemId}/photo-thumb.jpeg`,
    thumb,
    {
      access: "public",
      contentType: "image/jpeg",
      addRandomSuffix: true,
      cacheControlMaxAge: ONE_YEAR_SECONDS,
      token,
    },
  );
  return res.url;
}

/** True when `value` is a Vercel Blob CDN URL we own. */
export function isBlobUrl(value: string | null | undefined): boolean {
  if (!value) return false;
  return /^https?:\/\/[^/]*blob\.vercel-storage\.com\//.test(value);
}

/** Best-effort delete of a Blob URL.  No-ops on non-blob inputs (legacy
 *  base64 entries). Errors are swallowed — orphan blobs are tolerable, a
 *  failed user delete is not. */
export async function tryDeleteBlobUrl(value: string): Promise<void> {
  if (!isBlobUrl(value)) return;
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) return;
  try {
    await del(value, { token });
  } catch {
    // Swallow — leave the orphan.  Logging would be nice but the route's
    // contract is "the photo is gone from the user's view".
  }
}

/** Decide what `<img src>` to use for a thumbnail.  New uploads have https
 *  Blob URLs and we serve them from the CDN.  Legacy base64 rows go via
 *  the per-user proxy at /api/inventory/thumb/[id]. */
export function thumbSrc(itemId: string, thumbnailUrl: string | null | undefined): string {
  if (thumbnailUrl && /^https?:\/\//.test(thumbnailUrl)) return thumbnailUrl;
  return `/api/inventory/thumb/${itemId}`;
}

// ---------------------------------------------------------------------------
// Legacy helpers — kept for the thumb proxy route + DELETE rederive path.
// ---------------------------------------------------------------------------

/** Legacy: resize a base64 data URI in-memory and return both as data URIs. */
export async function resizeFromDataUri(
  dataUri: string,
): Promise<{ full: string; thumb: string } | null> {
  const match = dataUri.match(DATA_URI_RE);
  if (!match) return null;
  try {
    const buffer = Buffer.from(match[2], "base64");
    const { full, thumb } = await resizePhotoBuffer(buffer);
    return {
      full: `data:image/jpeg;base64,${full.toString("base64")}`,
      thumb: `data:image/jpeg;base64,${thumb.toString("base64")}`,
    };
  } catch {
    return null;
  }
}

export function decodeDataUri(
  dataUri: string,
): { contentType: string; buffer: Buffer } | null {
  const match = dataUri.match(DATA_URI_RE);
  if (!match) return null;
  return {
    contentType: match[1],
    buffer: Buffer.from(match[2], "base64"),
  };
}
