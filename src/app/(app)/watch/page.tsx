import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function WatchPage() {
  const { userId } = await auth();
  if (!userId) redirect("/");

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <header>
        <h1 className="text-2xl font-semibold">Watch list</h1>
        <p className="mt-1 text-sm text-gray-600">
          Track items you are considering — sourcing leads, deals to revisit, listings to keep an eye on.
        </p>
      </header>

      <div className="rounded-md border border-dashed bg-gray-50 p-8 text-center">
        <span className="inline-block rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
          Coming soon
        </span>
        <p className="mt-3 text-sm text-gray-700">
          The watch list is not built yet. It will let you bookmark interesting
          items, jot a note about why, and bubble them up when prices change.
        </p>
        <p className="mt-2 text-xs text-gray-500">
          Not on the roadmap yet — ping us if you want it sooner.
        </p>
      </div>
    </div>
  );
}
