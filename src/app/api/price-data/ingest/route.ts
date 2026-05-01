import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUserId, UnauthorizedError } from "@/lib/auth/getUserId";
import { userScope } from "@/lib/db/scoped";

export const runtime = "nodejs";

const ItemSchema = z.object({
  source: z.string().min(1).default("vinted"),
  externalId: z.string().optional(),
  title: z.string().min(1),
  brand: z.string().optional(),
  category: z.string().optional(),
  size: z.string().optional(),
  condition: z.string().optional(),
  priceMinor: z.number().int().nonnegative(),
  currency: z.string().default("GBP"),
  url: z.string().url().optional(),
  rawPayload: z.unknown().optional(),
  observedAt: z.string().datetime().optional(),
});

const BodySchema = z.union([ItemSchema, z.object({ items: z.array(ItemSchema) })]);

export async function POST(req: NextRequest) {
  let userId: string;
  try {
    userId = await getUserId(req);
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: e.message }, { status: 401 });
    }
    throw e;
  }

  const json = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const items = "items" in parsed.data ? parsed.data.items : [parsed.data];
  const scope = userScope(userId);

  const inserted = [];
  for (const item of items) {
    const rows = await scope.insertPriceData({
      source: item.source,
      externalId: item.externalId,
      title: item.title,
      brand: item.brand,
      category: item.category,
      size: item.size,
      condition: item.condition,
      priceMinor: item.priceMinor,
      currency: item.currency,
      url: item.url,
      rawPayload: item.rawPayload ? JSON.stringify(item.rawPayload) : null,
      observedAt: item.observedAt ? new Date(item.observedAt) : new Date(),
    });
    if (rows[0]) inserted.push(rows[0].id);
  }

  return NextResponse.json({
    ok: true,
    received: items.length,
    inserted: inserted.length,
  });
}
