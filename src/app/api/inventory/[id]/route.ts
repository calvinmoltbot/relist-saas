import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUserId, UnauthorizedError } from "@/lib/auth/getUserId";
import { userScope } from "@/lib/db/scoped";

export const runtime = "nodejs";

async function withUser(req: NextRequest) {
  try {
    return { userId: await getUserId(req) } as const;
  } catch (e) {
    if (e instanceof UnauthorizedError)
      return { error: NextResponse.json({ error: e.message }, { status: 401 }) } as const;
    throw e;
  }
}

const numStr = z
  .union([z.number(), z.string()])
  .transform((v) => String(v))
  .nullable()
  .optional();

const PatchSchema = z.object({
  name: z.string().nullish(),
  brand: z.string().nullish(),
  category: z.string().nullish(),
  condition: z.string().nullish(),
  size: z.string().nullish(),
  costPrice: numStr,
  listedPrice: numStr,
  soldPrice: numStr,
  description: z.string().nullish(),
  vintedUrl: z.string().url().nullish(),
  photoUrls: z.array(z.string()).nullish(),
  thumbnailUrl: z.string().nullish(),
  status: z.enum(["sourced", "listed", "sold", "shipped"]).optional(),
  shippingCost: numStr, // for the auto-created sell tx
  platformFees: numStr, // for the auto-created sell tx
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const u = await withUser(req);
  if ("error" in u) return u.error;
  const { id } = await params;
  const scope = userScope(u.userId);
  const item = await scope.getItem(id);
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const txns = await scope.listTransactionsForItem(id);
  return NextResponse.json({ item, transactions: txns });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const u = await withUser(req);
  if ("error" in u) return u.error;

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const scope = userScope(u.userId);
  const existing = await scope.getItem(id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const data = parsed.data;
  const now = new Date();
  const updates: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data)) {
    if (k === "shippingCost" || k === "platformFees") continue;
    if (v !== undefined) updates[k] = v;
  }

  // Status transitions stamp the corresponding timestamp.
  if (data.status && data.status !== existing.status) {
    if (data.status === "listed" && !existing.listedAt) updates.listedAt = now;
    if (data.status === "sold" && !existing.soldAt) updates.soldAt = now;
    if (data.status === "shipped" && !existing.shippedAt) updates.shippedAt = now;
  }

  const [updated] = await scope.updateItem(id, updates);

  // On transition into "sold", auto-create a sell transaction.
  if (data.status === "sold" && existing.status !== "sold") {
    const gross = data.soldPrice ?? updated.soldPrice ?? updated.listedPrice ?? "0";
    const shipping = data.shippingCost ?? "0";
    const fees = data.platformFees ?? "0";
    const cost = updated.costPrice ?? "0";
    const profit = (
      Number(gross) - Number(cost) - Number(shipping) - Number(fees)
    ).toFixed(2);

    await scope.insertTransaction({
      itemId: id,
      transactionType: "sell",
      grossPrice: String(gross),
      shippingCost: String(shipping),
      platformFees: String(fees),
      profit,
      completedAt: now,
    });
  }

  return NextResponse.json({ item: updated });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const u = await withUser(req);
  if ("error" in u) return u.error;
  const { id } = await params;
  const rows = await userScope(u.userId).deleteItem(id);
  if (rows.length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ deleted: true });
}
