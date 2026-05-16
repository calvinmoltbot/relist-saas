import { userScope } from "@/lib/db/scoped";

/**
 * Per-user configurable analytics targets. Defaults are the historical
 * constants — used when the user hasn't set a row yet.
 */
export const TARGET_DEFAULTS = {
  staleListingDays: 2,
  refreshSuggestedDays: 7,
  weeklyListingsTarget: 10,
} as const;

export type Targets = {
  staleListingDays: number;
  refreshSuggestedDays: number;
  weeklyListingsTarget: number;
};

const KEYS = {
  staleListingDays: "stale_listing_days",
  refreshSuggestedDays: "refresh_suggested_days",
  weeklyListingsTarget: "weekly_listings_target",
  displayCurrency: "display_currency",
  defaultAcquisitionType: "default_acquisition_type",
} as const;

export const PROFILE_DEFAULTS = {
  displayCurrency: "GBP",
  defaultAcquisitionType: "bought" as "bought" | "own",
};

export type ProfilePrefs = {
  displayCurrency: string;
  defaultAcquisitionType: "bought" | "own";
};

const CURRENCY_ALLOW = new Set(["GBP", "EUR", "USD"]);

export async function getProfilePrefs(userId: string): Promise<ProfilePrefs> {
  const settings = await getSettings(userId);
  const currency = settings[KEYS.displayCurrency];
  const acq = settings[KEYS.defaultAcquisitionType];
  return {
    displayCurrency:
      currency && CURRENCY_ALLOW.has(currency)
        ? currency
        : PROFILE_DEFAULTS.displayCurrency,
    defaultAcquisitionType:
      acq === "own" || acq === "bought"
        ? acq
        : PROFILE_DEFAULTS.defaultAcquisitionType,
  };
}

export async function setProfilePrefs(
  userId: string,
  prefs: Partial<ProfilePrefs>,
): Promise<void> {
  const scope = userScope(userId);
  const updates: Array<Promise<unknown>> = [];
  if (prefs.displayCurrency && CURRENCY_ALLOW.has(prefs.displayCurrency)) {
    updates.push(scope.setUserSetting(KEYS.displayCurrency, prefs.displayCurrency));
  }
  if (
    prefs.defaultAcquisitionType === "bought" ||
    prefs.defaultAcquisitionType === "own"
  ) {
    updates.push(
      scope.setUserSetting(
        KEYS.defaultAcquisitionType,
        prefs.defaultAcquisitionType,
      ),
    );
  }
  await Promise.all(updates);
}

function parsePositiveInt(value: string | undefined, fallback: number): number {
  if (value == null) return fallback;
  const n = parseInt(value, 10);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return n;
}

export async function getSettings(userId: string): Promise<Record<string, string>> {
  const rows = await userScope(userId).listUserSettings();
  const out: Record<string, string> = {};
  for (const r of rows) out[r.key] = r.value;
  return out;
}

export async function getTargets(userId: string): Promise<Targets> {
  const settings = await getSettings(userId);
  return {
    staleListingDays: parsePositiveInt(
      settings[KEYS.staleListingDays],
      TARGET_DEFAULTS.staleListingDays,
    ),
    refreshSuggestedDays: parsePositiveInt(
      settings[KEYS.refreshSuggestedDays],
      TARGET_DEFAULTS.refreshSuggestedDays,
    ),
    weeklyListingsTarget: parsePositiveInt(
      settings[KEYS.weeklyListingsTarget],
      TARGET_DEFAULTS.weeklyListingsTarget,
    ),
  };
}

export async function setTargets(
  userId: string,
  targets: Partial<Targets>,
): Promise<void> {
  const scope = userScope(userId);
  const updates: Array<Promise<unknown>> = [];
  const targetKeys: Array<keyof Targets> = [
    "staleListingDays",
    "refreshSuggestedDays",
    "weeklyListingsTarget",
  ];
  for (const k of targetKeys) {
    const v = targets[k];
    if (v == null) continue;
    if (!Number.isFinite(v) || v <= 0) continue;
    updates.push(scope.setUserSetting(KEYS[k], String(v)));
  }
  await Promise.all(updates);
}

export const SETTING_KEYS = KEYS;
