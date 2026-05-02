import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function DescribePage() {
  const { userId } = await auth();
  if (!userId) redirect("/");

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <header>
        <h1 className="text-2xl font-semibold">Describe</h1>
        <p className="mt-1 text-sm text-gray-600">
          Auto-generate Vinted listing descriptions from a photo and a few details.
        </p>
      </header>

      <div className="rounded-md border border-dashed bg-gray-50 p-8 text-center">
        <span className="inline-block rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
          Coming soon — bring your own key
        </span>
        <p className="mt-3 text-sm text-gray-700">
          Describe will call an LLM provider to draft listing copy from your
          photos. Because this costs money per call, it will be opt-in: you
          add an API key in settings, choose a model, and pay the provider
          directly. Nothing runs against a shared key.
        </p>
        <p className="mt-2 text-xs text-gray-500">
          Not wired up yet. Want it sooner? Let us know which provider you use.
        </p>
      </div>
    </div>
  );
}
