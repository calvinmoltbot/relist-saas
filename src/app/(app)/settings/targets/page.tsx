import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getTargets, TARGET_DEFAULTS } from "@/lib/settings";
import { saveTargetsAction } from "./actions";

export default async function TargetsSettingsPage() {
  const { userId } = await auth();
  if (!userId) redirect("/");

  const targets = await getTargets(userId);

  return (
    <div className="max-w-2xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Targets</h1>
        <p className="mt-1 text-sm text-gray-600">
          Tune the thresholds that drive your daily plan and health report.
          Defaults work for most sellers — adjust if your cadence or stock
          turnover is different.
        </p>
      </header>

      <form action={saveTargetsAction} className="space-y-5 rounded-md border p-4">
        <Field
          name="staleListingDays"
          label="Stale listing (days)"
          help={`Listings older than this show up in the daily reprice lane. Default ${TARGET_DEFAULTS.staleListingDays}.`}
          defaultValue={targets.staleListingDays}
        />
        <Field
          name="refreshSuggestedDays"
          label="Refresh suggested (days)"
          help={`How long a listing can sit before health flags it as dead stock. Default ${TARGET_DEFAULTS.refreshSuggestedDays}.`}
          defaultValue={targets.refreshSuggestedDays}
        />
        <Field
          name="weeklyListingsTarget"
          label="Weekly listings target"
          help={`The cadence pace your health report compares against. Default ${TARGET_DEFAULTS.weeklyListingsTarget}.`}
          defaultValue={targets.weeklyListingsTarget}
        />

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            className="rounded-md bg-black px-4 py-2 text-sm text-white"
          >
            Save targets
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({
  name,
  label,
  help,
  defaultValue,
}: {
  name: string;
  label: string;
  help: string;
  defaultValue: number;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium">{label}</span>
      <input
        type="number"
        name={name}
        min={1}
        step={1}
        defaultValue={defaultValue}
        className="mt-1 block w-32 rounded-md border px-3 py-2 text-sm"
        required
      />
      <span className="mt-1 block text-xs text-gray-500">{help}</span>
    </label>
  );
}
