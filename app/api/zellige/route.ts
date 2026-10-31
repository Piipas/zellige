import type { NextRequest } from "next/server";
import { getCalendar } from "@/lib/github";
import { clientIp, isCamo, rateLimit } from "@/lib/rate-limit";
import { DEFAULT_THEME, isThemeName, render, renderError, type ThemeName } from "@/lib/render";
import { endpointQuery } from "@/lib/site";
import { normalizeUsername } from "@/lib/username";

const CACHE_OK = "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400";
const CACHE_NOT_FOUND = "public, max-age=600, s-maxage=600";
const CACHE_REDIRECT = "public, max-age=86400, s-maxage=86400";

/** Requests per minute per IP, per instance. Camo fetches every README view. */
const LIMIT_VISITOR = 60;
const LIMIT_CAMO = 1200;

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const rawTheme = params.get("theme");
  const theme: ThemeName = isThemeName(rawTheme) ? rawTheme : DEFAULT_THEME;
  const user = normalizeUsername(params.get("user"));

  if (!user) {
    const msg = params.get("user") ? "Invalid GitHub username" : "Add ?user=<github username>";
    return svg(renderError(msg, theme), { cache: "no-store", error: "invalid-user" });
  }

  // One canonical URL per (user, theme, animate): lowercase user, known params
  // only, fixed order, defaults omitted. Anything else redirects there, so the
  // CDN caches one entry per graph however the URL was written.
  const animate = params.get("animate") !== "0";
  const canonical = endpointQuery(user, theme, animate);
  if (req.nextUrl.search.slice(1) !== canonical) {
    return new Response(null, {
      status: 308,
      headers: { Location: `${req.nextUrl.pathname}?${canonical}`, "Cache-Control": CACHE_REDIRECT },
    });
  }

  const camo = isCamo(req.headers);
  const limit = rateLimit(`${camo ? "camo" : "ip"}:${clientIp(req.headers)}`, camo ? LIMIT_CAMO : LIMIT_VISITOR);
  if (!limit.ok) {
    return svg(renderError("Too many requests, try again in a minute", theme), {
      status: 429,
      cache: "no-store",
      error: "rate-limited",
      extra: { "Retry-After": String(limit.retryAfter) },
    });
  }

  const result = await getCalendar(user);
  switch (result.status) {
    case "ok":
      return svg(render(result.weeks, { user: result.login, total: result.total, theme, animate }), {
        cache: CACHE_OK,
      });
    case "not_found":
      return svg(renderError(`No GitHub user called @${user}`, theme), {
        cache: CACHE_NOT_FOUND,
        error: "not-found",
      });
    case "error":
      return svg(renderError("Couldn't load contributions from GitHub", theme), {
        cache: "no-store",
        error: "upstream",
      });
  }
}

/**
 * Errors are still served as 200 images (except rate limiting): GitHub's camo
 * proxy shows a broken image for non-2xx responses, and a readable error card
 * is more useful in a README. The real reason is in X-Zellige-Error.
 */
function svg(
  body: string,
  opts: { status?: number; cache: string; error?: string; extra?: Record<string, string> },
) {
  const headers: Record<string, string> = {
    "Content-Type": "image/svg+xml; charset=utf-8",
    "Cache-Control": opts.cache,
    "X-Content-Type-Options": "nosniff",
    // The SVG is opened directly sometimes; it never needs to load anything.
    "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'",
    ...opts.extra,
  };
  if (opts.error) headers["X-Zellige-Error"] = opts.error;
  return new Response(body, { status: opts.status ?? 200, headers });
}
