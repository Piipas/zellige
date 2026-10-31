import type { NextRequest } from "next/server";
import { getCalendar } from "@/lib/github";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { normalizeUsername } from "@/lib/username";

/**
 * JSON calendar for the website, so the wall can switch users without a page
 * load. Shares the cached GitHub lookup with the SVG endpoint.
 */
export async function GET(req: NextRequest) {
  const login = normalizeUsername(req.nextUrl.searchParams.get("user"));
  if (!login) return Response.json({ status: "invalid" }, { status: 400 });

  if (!rateLimit(`calendar:${clientIp(req.headers)}`, 60).ok) {
    return Response.json({ status: "error", message: "Too many requests" }, { status: 429 });
  }

  const result = await getCalendar(login);
  const cache =
    result.status === "ok"
      ? "public, max-age=600, s-maxage=3600, stale-while-revalidate=86400"
      : result.status === "not_found"
        ? "public, max-age=600, s-maxage=600"
        : "no-store";
  return Response.json(result, { headers: { "Cache-Control": cache } });
}
