import type { Day } from "./render";

export interface Stats {
  total: number;
  longestStreak: { days: number; start?: string; end?: string };
  currentStreak: { days: number; start?: string };
  bestDay: { count: number; date?: string };
}

export function computeStats(weeks: Day[][], total: number): Stats {
  const days = weeks.flat().sort((a, b) => a.date.localeCompare(b.date));

  let longest: Stats["longestStreak"] = { days: 0 };
  let run = 0;
  let runStart: string | undefined;
  let best: Stats["bestDay"] = { count: 0 };

  for (const day of days) {
    if (day.count > 0) {
      if (run === 0) runStart = day.date;
      run++;
      if (run > longest.days) longest = { days: run, start: runStart, end: day.date };
    } else {
      run = 0;
    }
    if (day.count > best.count) best = { count: day.count, date: day.date };
  }

  // Like GitHub: an empty "today" doesn't break the streak yet.
  let i = days.length - 1;
  if (i >= 0 && days[i].count === 0) i--;
  let current = 0;
  while (i >= 0 && days[i].count > 0) {
    current++;
    i--;
  }

  return {
    total,
    longestStreak: longest,
    currentStreak: { days: current, start: current ? days[i + 1].date : undefined },
    bestDay: best,
  };
}
