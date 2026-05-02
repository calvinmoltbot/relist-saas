import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { getUserId, UnauthorizedError } from "@/lib/auth/getUserId";
import { userScope } from "@/lib/db/scoped";
import { decodeDataUri } from "@/lib/photos";

// GET /api/inventory/thumb/[id]
// Serves the user's item thumbnail as binary so list payloads can ship a
// URL instead of inline base64. Strong ETag so repeat loads are free.
export async function GET(
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
  const thumb = await userScope(userId).getItemThumbnail(id);
  if (!thumb) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const decoded = decodeDataUri(thumb);
  if (!decoded) {
    if (thumb.startsWith("http")) return NextResponse.redirect(thumb);
    return NextResponse.json({ error: "invalid thumbnail" }, { status: 500 });
  }

  const etag = `"${createHash("sha1").update(decoded.buffer).digest("hex")}"`;
  if (req.headers.get("if-none-match") === etag) {
    return new Response(null, { status: 304, headers: { ETag: etag } });
  }

  return new Response(new Uint8Array(decoded.buffer), {
    status: 200,
    headers: {
      "Content-Type": decoded.contentType,
      "Content-Length": String(decoded.buffer.length),
      "Cache-Control": "private, max-age=604800, immutable",
      ETag: etag,
    },
  });
}
