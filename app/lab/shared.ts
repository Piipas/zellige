import type { CalendarResult } from "@/lib/github";
import type { Day } from "@/lib/render";

export interface WallData {
  login: string;
  total: number;
  weeks: Day[][];
}

export async function loadUser(user: string): Promise<WallData | string> {
  try {
    const res = await fetch(`/lab/data?user=${encodeURIComponent(user)}`);
    const json = (await res.json()) as CalendarResult | { status: "invalid" };
    if (json.status === "ok") return { login: json.login, total: json.total, weeks: json.weeks };
    if (json.status === "not_found") return `No one called @${user} on GitHub`;
    if (json.status === "invalid") return "That isn't a GitHub username";
    return "GitHub didn't answer, try again in a minute";
  } catch {
    return "Couldn't reach the server";
  }
}
