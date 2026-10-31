import type { Metadata } from "next";
import { Suspense } from "react";
import { errorView, type View, type WallData } from "@/components/wall/data";
import { Wall } from "@/components/wall/Wall";
import { getCalendar } from "@/lib/github";
import { DEFAULT_THEME, THEMES, isThemeName } from "@/lib/render";
import { emptyCalendar, sampleCalendar } from "@/lib/sample";
import { siteUrl } from "@/lib/site";
import { normalizeUsername } from "@/lib/username";

const sample = sampleCalendar();
const demo: WallData = { login: "zellige", total: sample.total, weeks: sample.weeks };

export async function generateMetadata({ params }: PageProps<"/[user]">): Promise<Metadata> {
  const login = normalizeUsername(safeDecode((await params).user));
  if (!login) return { title: "Invalid username" };
  const result = await getCalendar(login);
  if (result.status !== "ok") return { title: `@${login}` };
  return {
    title: `@${result.login}`,
    description: `${result.total.toLocaleString("en-US")} GitHub contributions in the last year, as Moroccan zellige tilework.`,
  };
}

export default function UserPage({ params, searchParams }: PageProps<"/[user]">) {
  return (
    <Suspense fallback={<div className="fixed inset-0" style={{ background: THEMES[DEFAULT_THEME].grout }} />}>
      <UserWall params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function UserWall({ params, searchParams }: Pick<PageProps<"/[user]">, "params" | "searchParams">) {
  const [{ user }, query] = await Promise.all([params, searchParams]);
  const raw = safeDecode(user);
  const login = normalizeUsername(raw);
  const theme = isThemeName(query.theme) ? query.theme : DEFAULT_THEME;
  const animate = query.animate !== "0";

  let data: WallData;
  let view: View;
  if (!login) {
    ({ data, view } = blank(errorView("invalid", raw)));
  } else {
    const result = await getCalendar(login);
    if (result.status === "ok") {
      data = { login: result.login, total: result.total, weeks: result.weeks };
      view = { kind: "user" };
    } else {
      ({ data, view } = blank(errorView(result.status, login)));
    }
  }

  return <Wall data={data} view={view} demo={demo} initialTheme={theme} initialAnimate={animate} site={siteUrl()} />;
}

/** Errors still get a wall: every tile plain, with the message as the headline. */
function blank(view: View): { data: WallData; view: View } {
  return { data: { login: "", total: 0, weeks: emptyCalendar().weeks }, view };
}

function safeDecode(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}
