import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  getUserId,
  UnauthorizedError,
  generateApiKey,
} from "@/lib/auth/getUserId";
import { userScope } from "@/lib/db/scoped";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  let userId: string;
  try {
    userId = await getUserId(req);
  } catch (e) {
    if (e instanceof UnauthorizedError)
      return NextResponse.json({ error: e.message }, { status: 401 });
    throw e;
  }
  const keys = await userScope(userId).listApiKeys();
  return NextResponse.json({ keys });
}

const CreateSchema = z.object({ name: z.string().min(1).max(80) });

export async function POST(req: NextRequest) {
  let userId: string;
  try {
    userId = await getUserId(req);
  } catch (e) {
    if (e instanceof UnauthorizedError)
      return NextResponse.json({ error: e.message }, { status: 401 });
    throw e;
  }

  const body = await req.json().catch(() => null);
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { raw, hash, prefix } = generateApiKey();
  const [row] = await userScope(userId).insertApiKey({
    name: parsed.data.name,
    tokenHash: hash,
    tokenPrefix: prefix,
  });

  // Raw token returned ONCE — never stored, never retrievable later.
  return NextResponse.json({ id: row.id, name: row.name, token: raw });
}
