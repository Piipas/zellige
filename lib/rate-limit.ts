/**
 * Best-effort, per-instance fixed-window rate limiter. No dependencies.
 *
 * It only counts requests that reach a single server instance (CDN cache hits
 * never get here), so treat it as a speed bump. For real protection, add a
 * Vercel Firewall rate-limit rule as described in the README.
 */

const WINDOW_MS = 60_000;
const MAX_KEYS = 10_000;
const hits = new Map<string, { count: number; reset: number }>();

export interface RateLimitResult {
  ok: boolean;
  retryAfter: number;
}

export function rateLimit(key: string, limit: number, now = Date.now()): RateLimitResult {
  let entry = hits.get(key);
  if (!entry || entry.reset <= now) {
    if (hits.size >= MAX_KEYS) prune(now);
    entry = { count: 0, reset: now + WINDOW_MS };
    hits.set(key, entry);
  }
  entry.count++;
  return { ok: entry.count <= limit, retryAfter: Math.ceil((entry.reset - now) / 1000) };
}

function prune(now: number) {
  for (const [key, entry] of hits) if (entry.reset <= now) hits.delete(key);
  // Still full of live entries: drop the oldest rather than grow without bound.
  if (hits.size >= MAX_KEYS) hits.delete(hits.keys().next().value!);
}

/** Client IP from the platform's forwarding headers. */
export function clientIp(headers: Headers): string {
  return (
    headers.get("x-vercel-forwarded-for")?.split(",")[0].trim() ||
    headers.get("x-real-ip") ||
    headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    "unknown"
  );
}

/**
 * Every README view arrives through GitHub's image proxy (camo) from a handful
 * of IPs, so it needs a much higher allowance than a single visitor.
 */
export function isCamo(headers: Headers): boolean {
  return /github-camo/i.test(headers.get("user-agent") ?? "");
}
