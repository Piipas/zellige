import { DEFAULT_THEME, type ThemeName } from "./render";

export const REPO_URL = "https://github.com/Piipas/zellige";

/**
 * Public base URL used in README snippets and metadata.
 * NEXT_PUBLIC_SITE_URL wins; on Vercel it falls back to the production domain,
 * so forks work without any configuration.
 */
export function siteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, "");
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercel) return `https://${vercel}`;
  return "http://localhost:3000";
}

/**
 * Canonical query string for the SVG endpoint. Parameters always appear in the
 * same order and defaults are omitted, so equivalent requests share one CDN
 * cache entry.
 */
export function endpointQuery(user: string, theme: ThemeName = DEFAULT_THEME, animate = true): string {
  const q = new URLSearchParams({ user: user.toLowerCase() });
  if (theme !== DEFAULT_THEME) q.set("theme", theme);
  if (!animate) q.set("animate", "0");
  return q.toString();
}

export function endpointPath(user: string, theme?: ThemeName, animate?: boolean): string {
  return `/api/zellige?${endpointQuery(user, theme, animate)}`;
}
