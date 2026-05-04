import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getTargets, TARGET_DEFAULTS } from "@/lib/settings";
import { Button, Card, CardHeader, PageHeader } from "@/components/ui";
import { saveTargetsAction } from "./actions";

export default async function TargetsSettingsPage() {
  const { userId } = await auth();
  if (!userId) redirect("/");

  const targets = await getTargets(userId);

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader
        title="Targets"
        subtitle="Tune the thresholds that drive your daily plan and health report. Defaults work for most sellers — adjust if your cadence or stock turnover is different."
      />

      <Card>
        <CardHeader
          title="Thresholds"
          description="Saved values apply immediately to your plan and health views."
        />
        <form action={saveTargetsAction} className="mt-4 space-y-5">
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
            <Button type="submit">Save targets</Button>
          </div>
        </form>
      </Card>
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
      <span className="text-sm font-medium text-[var(--text-primary)]">
        {label}
      </span>
      <input
        type="number"
        name={name}
        min={1}
        step={1}
        defaultValue={defaultValue}
        className="mt-1 block w-32 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-inset)] px-3 py-2 text-sm tabular-nums"
        required
      />
      <span className="mt-1 block text-xs text-[var(--text-secondary)]">
        {help}
      </span>
    </label>
  );
}
