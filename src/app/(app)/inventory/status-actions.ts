"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { userScope } from "@/lib/db/scoped";

type Status = "sourced" | "listed" | "sold" | "shipped";

function parseMoney(input: string): string | null {
  const trimmed = input.trim();
  if (trimmed === "") return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n < 0) return null;
  return n.toFixed(2);
}

/**
 * Mark an item as sold from the inventory list. Mirrors the sold-side logic of
 * PATCH /api/inventory/[id]: stamps soldAt, sets soldPrice, and auto-creates a
 * sell transaction. Vinted has no seller fees (see AGENTS.md), so we never
 * surface or accept a fees input — platformFees is always 0.
 */
export async function markItemSoldAction(
  id: string,
  rawSoldPrice: string,
  rawShipping: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { userId } = await auth();
  if (!userId) return { ok: false, error: "Not signed in" };

  const soldPrice = parseMoney(rawSoldPrice);
  if (soldPrice === null) {
    return { ok: false, error: "Enter a sold price" };
  }
  const shipping = parseMoney(rawShipping) ?? "0.00";

  const scope = userScope(userId);
  const existing = await scope.getItem(id);
  if (!existing) return { ok: false, error: "Not found" };

  if (existing.status === "sold" || existing.status === "shipped") {
    return { ok: false, error: "Already sold" };
  }

  const now = new Date();
  const updates: Record<string, unknown> = {
    status: "sold" as Status,
    soldPrice,
  };
  if (!existing.soldAt) updates.soldAt = now;

  const [updated] = await scope.updateItem(id, updates);

  const cost = updated.costPrice ?? "0";
  const profit = (
    Number(soldPrice) - Number(cost) - Number(shipping)
  ).toFixed(2);

  await scope.insertTransaction({
    itemId: id,
    transactionType: "sell",
    grossPrice: soldPrice,
    shippingCost: shipping,
    platformFees: "0",
    profit,
    completedAt: now,
  });

  revalidatePath("/inventory");
  revalidatePath(`/inventory/${id}`);
  revalidatePath("/dashboard");
  return { ok: true };
}

/**
 * One-tap inventory status transition. Mirrors the timestamp logic of the
 * PATCH /api/inventory/[id] route so that "Mark as listed" from the inventory
 * list behaves identically to changing status on the detail page.
 *
 * Note: this helper does NOT auto-create a sell transaction. The listed→sold
 * transition has its own action (markItemSoldAction) because it needs sale
 * inputs. Use this for sourced→listed and sold→shipped one-tap transitions.
 */
export async function transitionItemStatusAction(
  id: string,
  next: Status,
): Promise<void> {
  const { userId } = await auth();
  if (!userId) throw new Error("Not signed in");

  const scope = userScope(userId);
  const existing = await scope.getItem(id);
  if (!existing) throw new Error("Not found");

  if (existing.status === next) return;

  const now = new Date();
  const updates: Record<string, unknown> = { status: next };
  if (next === "listed" && !existing.listedAt) updates.listedAt = now;
  if (next === "sold" && !existing.soldAt) updates.soldAt = now;
  if (next === "shipped" && !existing.shippedAt) updates.shippedAt = now;

  await scope.updateItem(id, updates);

  revalidatePath("/inventory");
  revalidatePath(`/inventory/${id}`);
  revalidatePath("/dashboard");
}
