"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { userScope } from "@/lib/db/scoped";

type Status = "sourced" | "listed" | "sold" | "shipped";

/**
 * One-tap inventory status transition. Mirrors the timestamp logic of the
 * PATCH /api/inventory/[id] route so that "Mark as listed" from the inventory
 * list behaves identically to changing status on the detail page.
 *
 * Note: we deliberately don't auto-create a sell transaction here. A "Mark as
 * sold" tap from the list has no shipping/fees context — the detail page is
 * still the right place for that flow. The list is for low-friction
 * sourced→listed and sold→shipped transitions.
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
