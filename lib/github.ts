import "server-only";
import { cacheLife } from "next/cache";
import type { Day, Level } from "./render";

const ENDPOINT = "https://api.github.com/graphql";

const QUERY = /* GraphQL */ `
  query ($login: String!) {
    user(login: $login) {
      login
      contributionsCollection {
        contributionCalendar {
          totalContributions
          weeks {
            contributionDays {
              date
              contributionCount
              contributionLevel
            }
          }
        }
      }
    }
  }
`;

const LEVELS: Record<string, Level> = {
  NONE: 0,
  FIRST_QUARTILE: 1,
  SECOND_QUARTILE: 2,
  THIRD_QUARTILE: 3,
  FOURTH_QUARTILE: 4,
};

export interface Calendar {
  /** Login with GitHub's casing, e.g. "Torvalds" for a "torvalds" request. */
  login: string;
  total: number;
  weeks: Day[][];
}

export class UserNotFoundError extends Error {
  constructor(public readonly user: string) {
    super(`GitHub user not found: ${user}`);
    this.name = "UserNotFoundError";
  }
}

export class GitHubError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "GitHubError";
  }
}

interface GraphQLResponse {
  data?: {
    user: null | {
      login: string;
      contributionsCollection: {
        contributionCalendar: {
          totalContributions: number;
          weeks: {
            contributionDays: { date: string; contributionCount: number; contributionLevel: string }[];
          }[];
        };
      };
    };
  };
  errors?: { type?: string; message: string }[];
}

/** Fetches a user's last-year contribution calendar from the GitHub GraphQL API. */
export async function fetchCalendar(user: string, token: string): Promise<Calendar> {
  let res: Response;
  try {
    res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `bearer ${token}`,
        "Content-Type": "application/json",
        "User-Agent": "zellige-contribution-graph",
      },
      body: JSON.stringify({ query: QUERY, variables: { login: user } }),
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    });
  } catch {
    throw new GitHubError("Could not reach GitHub");
  }

  if (!res.ok) {
    const limited = res.status === 403 || res.status === 429;
    throw new GitHubError(limited ? "GitHub rate limit reached" : `GitHub responded ${res.status}`, res.status);
  }

  const json = (await res.json()) as GraphQLResponse;
  const u = json.data?.user;
  if (!u) {
    if (json.errors?.some((e) => e.type === "NOT_FOUND") || json.data?.user === null) {
      throw new UserNotFoundError(user);
    }
    throw new GitHubError(json.errors?.[0]?.message ?? "Unexpected response from GitHub");
  }

  const cal = u.contributionsCollection.contributionCalendar;
  return {
    login: u.login,
    total: cal.totalContributions,
    weeks: cal.weeks.map((w) =>
      w.contributionDays.map((d) => ({
        date: d.date,
        count: d.contributionCount,
        level: LEVELS[d.contributionLevel] ?? 0,
      })),
    ),
  };
}

export type CalendarResult =
  | ({ status: "ok" } & Calendar)
  | { status: "not_found" }
  | { status: "error"; message: string };

/**
 * Cached calendar lookup, shared by the API route, the preview page and the OG
 * image. The key is the normalised (lowercase) login only, so query-string
 * noise never reaches GitHub. On Vercel, `use cache: remote` is shared across
 * instances; elsewhere it falls back to an in-memory LRU.
 *
 * Results are returned rather than thrown so each outcome gets its own lifetime:
 * found users for an hour, unknown users for 10 minutes (so bad names can't be
 * used to hammer the API), and upstream failures briefly.
 */
export async function getCalendar(login: string): Promise<CalendarResult> {
  "use cache: remote";

  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    cacheLife({ stale: 30, revalidate: 30, expire: 60 });
    return { status: "error", message: "Server is missing GITHUB_TOKEN" };
  }

  try {
    const calendar = await fetchCalendar(login, token);
    cacheLife({ stale: 300, revalidate: 3600, expire: 86400 });
    return { status: "ok", ...calendar };
  } catch (err) {
    if (err instanceof UserNotFoundError) {
      cacheLife({ stale: 300, revalidate: 600, expire: 900 });
      return { status: "not_found" };
    }
    cacheLife({ stale: 30, revalidate: 30, expire: 60 });
    return { status: "error", message: err instanceof GitHubError ? err.message : "Unknown error" };
  }
}
