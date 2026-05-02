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
} as const;

type SettingKey = keyof typeof KEYS;

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
  for (const k of Object.keys(targets) as SettingKey[]) {
    const v = targets[k];
    if (v == null) continue;
    if (!Number.isFinite(v) || v <= 0) continue;
    updates.push(scope.setUserSetting(KEYS[k], String(v)));
  }
  await Promise.all(updates);
}

export const SETTING_KEYS = KEYS;
