import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getProfilePrefs } from "@/lib/settings";
import { NewItemForm } from "./form";

export default async function NewItemPage() {
  const { userId } = await auth();
  if (!userId) redirect("/");
  const prefs = await getProfilePrefs(userId);
  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold">Add item</h1>
      <NewItemForm defaultAcquisitionType={prefs.defaultAcquisitionType} />
    </div>
  );
}
