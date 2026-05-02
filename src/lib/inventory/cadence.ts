// Listing cadence — items listed per week vs target.
// Weeks are Monday-Sunday in local time. Current week's pace is scaled to the
// fraction of the week elapsed so we don't flag "behind" on a Tuesday morning.

export interface CadenceWeek {
  weekStart: string;
  count: number;
  current: boolean;
}

export interface CadenceResult {
  weeks: CadenceWeek[];
  currentCount: number;
  target: number;
  pace: number;
  paceBand: "green" | "amber" | "red";
  weeklyAverage: number;
}

function startOfWeek(d: Date): Date {
  const day = d.getDay();
  const diff = (day + 6) % 7;
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  out.setDate(out.getDate() - diff);
  return out;
}

function addDays(d: Date, n: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}

export function computeCadence(
  listedAts: Date[],
  target: number,
  now: Date = new Date(),
): CadenceResult {
  const currentWeekStart = startOfWeek(now);

  const buckets: CadenceWeek[] = [];
  for (let i = 3; i >= 0; i--) {
    const weekStart = addDays(currentWeekStart, -i * 7);
    buckets.push({
      weekStart: weekStart.toISOString().slice(0, 10),
      count: 0,
      current: i === 0,
    });
  }

  const earliest = addDays(currentWeekStart, -21).getTime();
  const weekEnd = addDays(currentWeekStart, 7).getTime();

  for (const ts of listedAts) {
    const t = ts.getTime();
    if (t < earliest || t >= weekEnd) continue;
    const weekIndex = 3 - Math.floor((currentWeekStart.getTime() - t) / (7 * 86400_000));
    const idx = Math.min(3, Math.max(0, weekIndex));
    buckets[idx].count += 1;
  }

  const currentCount = buckets[3].count;
  const msSinceWeekStart = now.getTime() - currentWeekStart.getTime();
  const weekFraction = Math.min(
    1,
    Math.max(1 / 7, msSinceWeekStart / (7 * 86400_000)),
  );
  const expectedByNow = target * weekFraction;
  const pace = expectedByNow > 0 ? currentCount / expectedByNow : 0;
  const paceBand: "green" | "amber" | "red" =
    pace >= 1 ? "green" : pace >= 0.5 ? "amber" : "red";

  const weeklyAverage =
    buckets.slice(0, 3).reduce((s, w) => s + w.count, 0) / 3;

  return {
    weeks: buckets,
    currentCount,
    target,
    pace,
    paceBand,
    weeklyAverage: Math.round(weeklyAverage * 10) / 10,
  };
}
