import type { CalendarResult } from "@/lib/github";
import type { Day, ThemeName } from "@/lib/render";
import { DEFAULT_THEME } from "@/lib/render";

export interface WallData {
  login: string;
  total: number;
  weeks: Day[][];
}

/** What the headline above the wall is about. The wall itself always has tiles to show. */
export type View = { kind: "demo" } | { kind: "user" } | { kind: "error"; title: string; detail: string };

export type LoadResult = { ok: true; data: WallData } | { ok: false; title: string; detail: string };

export function errorView(status: "invalid" | "not_found" | "error", login: string): Extract<View, { kind: "error" }> {
  switch (status) {
    case "invalid":
      return {
        kind: "error",
        title: "That isn't a GitHub username",
        detail: "Usernames use letters, numbers and single hyphens, up to 39 characters.",
      };
    case "not_found":
      return { kind: "error", title: `No one called @${login} on GitHub`, detail: "Check the spelling, or try another name." };
    case "error":
      return { kind: "error", title: "GitHub didn't answer", detail: "Couldn't load contributions right now. Try again in a minute." };
  }
}

export async function loadCalendar(login: string): Promise<LoadResult> {
  try {
    const res = await fetch(`/api/calendar?user=${encodeURIComponent(login)}`);
    const json = (await res.json()) as CalendarResult | { status: "invalid" };
    if (json.status === "ok") return { ok: true, data: { login: json.login, total: json.total, weeks: json.weeks } };
    const { title, detail } = errorView(json.status, login);
    return { ok: false, title, detail };
  } catch {
    return { ok: false, ...errorView("error", login) };
  }
}

/** Query string for the view options; defaults are omitted. */
export function optionsQuery(theme: ThemeName, animate: boolean): string {
  const q = new URLSearchParams();
  if (theme !== DEFAULT_THEME) q.set("theme", theme);
  if (!animate) q.set("animate", "0");
  const s = q.toString();
  return s ? `?${s}` : "";
}
