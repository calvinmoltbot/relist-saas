import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { hasSampleData } from "@/lib/sample-data";
import { loadSampleDataAction, clearSampleDataAction } from "./actions";

export default async function SampleDataSettingsPage() {
  const { userId } = await auth();
  if (!userId) redirect("/");

  const hasSamples = await hasSampleData(userId);

  return (
    <div className="max-w-2xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Sample data</h1>
        <p className="mt-1 text-sm text-gray-600">
          Populate your account with a small set of demo items, transactions,
          and expenses so you can see how every page looks before adding any
          real data. Clearing only removes the seeded rows — anything you
          added yourself stays untouched.
        </p>
      </header>

      <section className="rounded-md border p-4 space-y-4">
        <div>
          <h2 className="text-sm font-semibold">Status</h2>
          <p className="mt-1 text-sm text-gray-600">
            {hasSamples
              ? "Sample data is currently loaded in your account."
              : "No sample data is currently loaded."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <form action={loadSampleDataAction}>
            <button
              type="submit"
              disabled={hasSamples}
              className="rounded-md bg-black px-4 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              Load sample data
            </button>
          </form>

          <form action={clearSampleDataAction}>
            <button
              type="submit"
              disabled={!hasSamples}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-40"
            >
              Clear sample data
            </button>
          </form>
        </div>

        <p className="text-xs text-gray-500">
          Loading seeds 8 items across a handful of brands and statuses
          (sourced / listed / sold), their buy and sell transactions, and 2
          expenses. Clear is safe — it only removes rows tagged as sample.
        </p>
      </section>
    </div>
  );
}
