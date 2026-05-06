import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUserId, UnauthorizedError } from "@/lib/auth/getUserId";
import { userScope } from "@/lib/db/scoped";
import { coerceMoney } from "@/lib/money";
import { revalidateUserItems } from "@/lib/analytics/cache";

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
  acquisitionType: z.enum(["bought", "own"]).optional(),
  shippingCost: numStr, // for the auto-created sell tx
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
    if (k === "shippingCost") continue;
    if (v !== undefined) updates[k] = v;
  }

  // Acquisition-type semantics:
  //   • Switching to 'own' zeros the cost.
  //   • Switching to 'bought' clears cost so the user can re-enter it
  //     (unless they passed a costPrice in the same request).
  if (data.acquisitionType === "own") {
    updates.costPrice = "0";
  } else if (
    data.acquisitionType === "bought" &&
    existing.acquisitionType !== "bought" &&
    data.costPrice === undefined
  ) {
    updates.costPrice = null;
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
    const profit = (
      coerceMoney(gross) - coerceMoney(updated.costPrice) - coerceMoney(shipping)
    ).toFixed(2);

    await scope.insertTransaction({
      itemId: id,
      transactionType: "sell",
      grossPrice: String(gross),
      shippingCost: String(shipping),
      platformFees: "0",
      profit,
      completedAt: now,
    });
  }

  revalidateUserItems(u.userId);
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
  revalidateUserItems(u.userId);
  return NextResponse.json({ deleted: true });
}
