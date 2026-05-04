/**
 * Coerce any money-shaped value (string, number, null, undefined) into a
 * finite number. `null` and `undefined` — and any non-numeric string —
 * collapse to 0. This is the single source of truth for "null cost = 0"
 * across the app: route every cost/price read through here so analytics,
 * profit math, and completeness all agree.
 *
 * See AGENTS.md → "Cost handling" for the design rule.
 */
export function coerceMoney(value: string | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  const n = typeof value === "string" ? Number(value) : value;
  return Number.isFinite(n) ? n : 0;
}
