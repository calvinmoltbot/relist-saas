/**
 * Resolve a date range from query params. Mirrors the original Relist
 * behaviour so existing UI conventions (preset names, ISO dates) carry over.
 */
export type DateRange = { from: Date | null; to: Date | null };

export type Preset =
  | "this_month"
  | "last_month"
  | "last_90_days"
  | "this_year"
  | "tax_year";

export function resolveDateRange(
  preset: string | null,
  fromStr: string | null,
  toStr: string | null,
  now: Date = new Date(),
): DateRange {
  if (preset) {
    switch (preset as Preset) {
      case "this_month":
        return {
          from: new Date(now.getFullYear(), now.getMonth(), 1),
          to: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59),
        };
      case "last_month":
        return {
          from: new Date(now.getFullYear(), now.getMonth() - 1, 1),
          to: new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59),
        };
      case "last_90_days":
        return { from: new Date(now.getTime() - 90 * 86400000), to: now };
      case "this_year":
        return { from: new Date(now.getFullYear(), 0, 1), to: now };
      case "tax_year": {
        const start =
          now.getMonth() > 3 || (now.getMonth() === 3 && now.getDate() >= 6)
            ? new Date(now.getFullYear(), 3, 6)
            : new Date(now.getFullYear() - 1, 3, 6);
        return { from: start, to: now };
      }
    }
  }
  return {
    from: fromStr ? new Date(fromStr + "T00:00:00") : null,
    to: toStr ? new Date(toStr + "T23:59:59") : null,
  };
}
