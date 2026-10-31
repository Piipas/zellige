/** GitHub's username rules: alphanumerics and single inner hyphens, max 39 chars. */
export const USERNAME_RE = /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i;

/** Trims, strips a leading "@", validates and lowercases. Null if invalid. */
export function normalizeUsername(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const name = raw.trim().replace(/^@/, "");
  return USERNAME_RE.test(name) ? name.toLowerCase() : null;
}
