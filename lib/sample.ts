import type { Day, Level } from "./render";

/** Small, fast, seeded PRNG so sample data is identical on every render. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Assign levels by quartiles of the non-zero counts, like GitHub does. */
function withLevels(counts: { date: string; count: number }[]): Day[] {
  const sorted = counts
    .map((c) => c.count)
    .filter((n) => n > 0)
    .sort((a, b) => a - b);
  const q = (p: number) => sorted[Math.floor((sorted.length - 1) * p)] ?? 0;
  const [q1, q2, q3] = [q(0.25), q(0.5), q(0.75)];
  return counts.map(({ date, count }) => {
    const level: Level =
      count === 0 ? 0 : count <= q1 ? 1 : count <= q2 ? 2 : count <= q3 ? 3 : 4;
    return { date, count, level };
  });
}

/**
 * A plausible year of contributions: busier on weekdays, with streaks,
 * quiet spells and the odd big day. Ends on `end` (inclusive) and starts
 * mid-week like GitHub's calendar, so the first column may be partial.
 */
export function sampleCalendar(seed = 7, end = "2026-10-31"): { total: number; weeks: Day[][] } {
  const rand = mulberry32(seed);
  const endDate = new Date(`${end}T00:00:00Z`);
  const days: { date: string; count: number }[] = [];
  let mood = 0.6; // drifts over time to create busy and quiet spells

  for (let i = 364; i >= 0; i--) {
    const date = new Date(endDate);
    date.setUTCDate(endDate.getUTCDate() - i);
    const weekend = date.getUTCDay() === 0 || date.getUTCDay() === 6;
    mood = Math.min(1, Math.max(0.05, mood + (rand() - 0.5) * 0.25));
    const active = rand() < mood * (weekend ? 0.45 : 0.95);
    const burst = rand() < 0.04 ? 3 + rand() * 4 : 1;
    const count = active ? Math.round((1 + rand() * 7 * mood) * burst) : 0;
    days.push({ date: date.toISOString().slice(0, 10), count });
  }

  const leveled = withLevels(days);
  const weeks: Day[][] = [];
  for (const day of leveled) {
    const isSunday = new Date(`${day.date}T00:00:00Z`).getUTCDay() === 0;
    if (weeks.length === 0 || isSunday) weeks.push([]);
    weeks[weeks.length - 1].push(day);
  }
  return { total: days.reduce((sum, d) => sum + d.count, 0), weeks };
}
