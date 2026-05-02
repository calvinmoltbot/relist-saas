"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { setTargets, type Targets } from "@/lib/settings";

function parseField(value: FormDataEntryValue | null): number | undefined {
  if (typeof value !== "string" || value.trim() === "") return undefined;
  const n = parseInt(value, 10);
  if (!Number.isFinite(n) || n <= 0) return undefined;
  return n;
}

export async function saveTargetsAction(formData: FormData): Promise<void> {
  const { userId } = await auth();
  if (!userId) throw new Error("Not signed in");

  const next: Partial<Targets> = {
    staleListingDays: parseField(formData.get("staleListingDays")),
    refreshSuggestedDays: parseField(formData.get("refreshSuggestedDays")),
    weeklyListingsTarget: parseField(formData.get("weeklyListingsTarget")),
  };

  await setTargets(userId, next);
  revalidatePath("/settings/targets");
}
