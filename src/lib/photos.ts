import sharp from "sharp";
import { put, del } from "@vercel/blob";

// Full-size: 1200x1200 JPEG q70 (~200-400 KB). Detail views.
// Thumbnail: 200x200 JPEG q60 (~10-20 KB). List cards.
//
// All photos live on Vercel Blob; items.photoUrls / items.thumbnailUrl
// always hold public CDN URLs (or null when no photo).

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

