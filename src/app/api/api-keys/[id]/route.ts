import { NextRequest, NextResponse } from "next/server";
import { getUserId, UnauthorizedError } from "@/lib/auth/getUserId";
import { userScope } from "@/lib/db/scoped";

export const runtime = "nodejs";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  let userId: string;
  try {
    userId = await getUserId(req);
  } catch (e) {
    if (e instanceof UnauthorizedError)
      return NextResponse.json({ error: e.message }, { status: 401 });
    throw e;
  }

  const { id } = await params;
  const rows = await userScope(userId).revokeApiKey(id);
  if (rows.length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
