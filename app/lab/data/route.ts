import type { NextRequest } from "next/server";
import { getCalendar } from "@/lib/github";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { normalizeUsername } from "@/lib/username";

/** Prototype-only JSON feed so the lab pages can swap users without a page load. */
export async function GET(req: NextRequest) {
  const login = normalizeUsername(req.nextUrl.searchParams.get("user"));
  if (!login) return Response.json({ status: "invalid" }, { status: 400 });
  if (!rateLimit(`lab:${clientIp(req.headers)}`, 60).ok) {
    return Response.json({ status: "error", message: "Too many requests" }, { status: 429 });
  }
  const result = await getCalendar(login);
  return Response.json(result, {
    headers: { "Cache-Control": result.status === "ok" ? "public, max-age=600" : "no-store" },
  });
}
