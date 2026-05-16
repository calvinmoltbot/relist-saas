import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Button,
  ButtonLink,
  Card,
  CardHeader,
  PageHeader,
} from "@/components/ui";
import { getProfilePrefs, getTargets } from "@/lib/settings";
import { saveProfilePrefsAction } from "./actions";

const CURRENCY_OPTIONS = ["GBP", "EUR", "USD"] as const;

export default async function ProfileSettingsPage() {
  const { userId } = await auth();
  if (!userId) redirect("/");

  const user = await currentUser();
  const [prefs, targets] = await Promise.all([
    getProfilePrefs(userId),
    getTargets(userId),
  ]);

  const name =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    user?.username ||
    "—";
  const email =
    user?.primaryEmailAddress?.emailAddress ??
    user?.emailAddresses?.[0]?.emailAddress ??
    "—";
  const avatar = user?.imageUrl ?? null;
  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString("en-GB", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "—";

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader
        title="Profile"
        subtitle="Your account details and a couple of personal defaults. Password, email and 2FA are managed by Clerk."
      />

      <Card>
        <CardHeader
          title="Account"
          description="Synced from Clerk — change name, email or password from your account page."
          action={
            <ButtonLink href="/user" variant="secondary" size="sm">
              Manage account
            </ButtonLink>
          }
        />
        <div className="mt-4 flex items-center gap-4">
          {avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatar}
              alt=""
              className="h-16 w-16 rounded-full border border-[var(--border-subtle)]"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full border border-[var(--border-subtle)] bg-[var(--surface-inset)] text-lg font-semibold text-[var(--text-secondary)]">
              {(name?.[0] ?? "?").toUpperCase()}
            </div>
          )}
          <dl className="grid flex-1 grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-3">
            <Field label="Name" value={name} />
            <Field label="Email" value={email} />
            <Field label="Member since" value={memberSince} />
          </dl>
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Preferences"
          description="Personal defaults applied across the app."
        />
        <form action={saveProfilePrefsAction} className="mt-4 space-y-5">
          <label className="block">
            <span className="text-sm font-medium text-[var(--text-primary)]">
              Display currency
            </span>
            <select
              name="displayCurrency"
              defaultValue={prefs.displayCurrency}
              className="mt-1 block w-32 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-inset)] px-3 py-2 text-sm"
            >
              {CURRENCY_OPTIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <span className="mt-1 block text-xs text-[var(--text-secondary)]">
              Used to label totals across dashboards. Defaults to GBP.
            </span>
          </label>

          <fieldset>
            <legend className="text-sm font-medium text-[var(--text-primary)]">
              Default acquisition type
            </legend>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">
              Pre-selected on the &ldquo;Add item&rdquo; form. Choose
              &ldquo;own&rdquo; if you mostly list things from your own wardrobe.
            </p>
            <div className="mt-2 flex gap-4">
              <RadioOption
                name="defaultAcquisitionType"
                value="bought"
                label="Bought"
                checked={prefs.defaultAcquisitionType === "bought"}
              />
              <RadioOption
                name="defaultAcquisitionType"
                value="own"
                label="Own"
                checked={prefs.defaultAcquisitionType === "own"}
              />
            </div>
          </fieldset>

          <div className="flex items-center gap-3 pt-1">
            <Button type="submit">Save preferences</Button>
          </div>
        </form>
      </Card>

      <Card>
        <CardHeader
          title="Weekly listing target"
          description={`Currently ${targets.weeklyListingsTarget} listings / week. Adjust the cadence used by your plan and health views.`}
          action={
            <Link
              href="/settings/targets"
              className="text-sm font-medium text-[var(--brand)] hover:underline"
            >
              Edit targets →
            </Link>
          }
        />
      </Card>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm text-[var(--text-primary)]">{value}</dd>
    </div>
  );
}

function RadioOption({
  name,
  value,
  label,
  checked,
}: {
  name: string;
  value: string;
  label: string;
  checked: boolean;
}) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-inset)] px-3 py-2 text-sm">
      <input
        type="radio"
        name={name}
        value={value}
        defaultChecked={checked}
        className="accent-[var(--brand)]"
      />
      <span>{label}</span>
    </label>
  );
}
