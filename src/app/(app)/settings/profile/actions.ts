"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { setProfilePrefs, type ProfilePrefs } from "@/lib/settings";

export async function saveProfilePrefsAction(formData: FormData): Promise<void> {
  const { userId } = await auth();
  if (!userId) throw new Error("Not signed in");

  const currency = formData.get("displayCurrency");
  const acq = formData.get("defaultAcquisitionType");

  const next: Partial<ProfilePrefs> = {};
  if (typeof currency === "string") next.displayCurrency = currency;
  if (acq === "bought" || acq === "own") next.defaultAcquisitionType = acq;

  await setProfilePrefs(userId, next);
  revalidatePath("/settings/profile");
  revalidatePath("/inventory/new");
}
