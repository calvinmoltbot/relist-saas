import sharp from "sharp";

// Full-size: 1200x1200 JPEG q70 (~200-400 KB). Detail views.
// Thumbnail: 200x200 JPEG q60 (~10-20 KB). List cards.
// Both stored as base64 data URIs in items.photoUrls / items.thumbnailUrl
// so we don't yet need a blob store.

const DATA_URI_RE = /^data:(image\/[^;]+);base64,(.+)$/;

export async function resizePhotoBuffer(
  buffer: Buffer,
): Promise<{ full: string; thumb: string }> {
  const [fullBuf, thumbBuf] = await Promise.all([
    sharp(buffer)
      .resize(1200, 1200, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 70 })
      .toBuffer(),
    sharp(buffer)
      .resize(200, 200, { fit: "cover" })
      .jpeg({ quality: 60 })
      .toBuffer(),
  ]);

  return {
    full: `data:image/jpeg;base64,${fullBuf.toString("base64")}`,
    thumb: `data:image/jpeg;base64,${thumbBuf.toString("base64")}`,
  };
}

export async function resizeFromDataUri(
  dataUri: string,
): Promise<{ full: string; thumb: string } | null> {
  const match = dataUri.match(DATA_URI_RE);
  if (!match) return null;
  try {
    const buffer = Buffer.from(match[2], "base64");
    return await resizePhotoBuffer(buffer);
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
