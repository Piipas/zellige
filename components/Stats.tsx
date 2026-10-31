import type { Stats as StatsData } from "@/lib/stats";

const short = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
const fmt = (date?: string) => (date ? short.format(new Date(`${date}T00:00:00Z`)) : undefined);
const days = (n: number) => `${n} ${n === 1 ? "day" : "days"}`;

export function Stats({ stats }: { stats: StatsData }) {
  const { longestStreak: longest, currentStreak: current, bestDay: best } = stats;
  const items = [
    { label: "Contributions", value: stats.total.toLocaleString("en-US"), note: "in the last year", accent: "bg-zellige" },
    {
      label: "Longest streak",
      value: days(longest.days),
      note: longest.days ? `${fmt(longest.start)} – ${fmt(longest.end)}` : "no streak yet",
      accent: "bg-majorelle",
    },
    {
      label: "Current streak",
      value: days(current.days),
      note: current.days ? `since ${fmt(current.start)}` : "start one today",
      accent: "bg-ochre",
    },
    {
      label: "Best day",
      value: best.count.toLocaleString("en-US"),
      note: best.date ? `on ${fmt(best.date)}` : "nothing yet",
      accent: "bg-terracotta",
    },
  ];

  return (
    <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="relative overflow-hidden rounded-xl border border-line bg-white/60 p-4">
          <span className={`absolute inset-y-0 left-0 w-1 ${item.accent}`} aria-hidden />
          <dt className="text-xs font-medium tracking-wide text-muted uppercase">{item.label}</dt>
          <dd className="mt-1 font-display text-2xl font-semibold tabular-nums">{item.value}</dd>
          <dd className="text-xs text-muted">{item.note}</dd>
        </div>
      ))}
    </dl>
  );
}
