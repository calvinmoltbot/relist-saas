"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { seedSampleData, clearSampleData } from "@/lib/sample-data";

function revalidateAll() {
  for (const p of [
    "/settings/sample-data",
    "/dashboard",
    "/inventory",
    "/profit",
    "/health",
    "/bestsellers",
    "/plan",
    "/expenses",
    "/market",
  ]) {
    revalidatePath(p);
  }
}

export async function loadSampleDataAction(): Promise<void> {
  const { userId } = await auth();
  if (!userId) throw new Error("Not signed in");
  await seedSampleData(userId);
  revalidateAll();
}

export async function clearSampleDataAction(): Promise<void> {
  const { userId } = await auth();
  if (!userId) throw new Error("Not signed in");
  await clearSampleData(userId);
  revalidateAll();
}
