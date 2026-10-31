import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Preview } from "@/components/Preview";
import { Stats } from "@/components/Stats";
import { UsernameForm } from "@/components/UsernameForm";
import { getCalendar } from "@/lib/github";
import { DEFAULT_THEME, isThemeName } from "@/lib/render";
import { siteUrl } from "@/lib/site";
import { computeStats } from "@/lib/stats";
import { normalizeUsername } from "@/lib/username";

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
    <main className="mx-auto w-full max-w-5xl px-4 pt-6 sm:px-6">
      <Suspense fallback={<Loading />}>
        <UserView params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function UserView({ params, searchParams }: Pick<PageProps<"/[user]">, "params" | "searchParams">) {
  const [{ user }, query] = await Promise.all([params, searchParams]);
  const raw = safeDecode(user);
  const login = normalizeUsername(raw);

  if (!login) {
    return (
      <ErrorState title="That isn't a GitHub username" defaultValue={raw}>
        Usernames use letters, numbers and single hyphens, up to 39 characters.
      </ErrorState>
    );
  }

  const result = await getCalendar(login);
  if (result.status === "not_found") {
    return (
      <ErrorState title={`No one called @${login} on GitHub`} defaultValue={login}>
        Check the spelling, or try another username.
      </ErrorState>
    );
  }
  if (result.status === "error") {
    return (
      <ErrorState title="GitHub didn't answer" defaultValue={login} retry={`/${login}`}>
        We couldn&apos;t load contributions right now ({result.message.toLowerCase()}). Try again in a minute.
      </ErrorState>
    );
  }

  const theme = isThemeName(query.theme) ? query.theme : DEFAULT_THEME;
  const animate = query.animate !== "0";
  const stats = computeStats(result.weeks, result.total);

  return (
    <>
      <div className="mb-8 flex flex-col gap-1">
        <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">
          <a
            href={`https://github.com/${result.login}`}
            className="decoration-line decoration-2 underline-offset-8 hover:underline"
          >
            @{result.login}
          </a>
        </h1>
        <p className="text-muted">A year of contributions, laid in zellige.</p>
      </div>

      <Stats stats={stats} />

      {result.total === 0 && (
        <p className="mt-6 rounded-lg border border-line bg-white/60 px-4 py-3 text-sm text-muted">
          No public contributions in the last year yet, so every tile is plain. Private contributions only count if
          they&apos;re enabled in this user&apos;s GitHub profile settings.
        </p>
      )}

      <div className="mt-8">
        <Preview
          weeks={result.weeks}
          login={result.login}
          total={result.total}
          initialTheme={theme}
          initialAnimate={animate}
          site={siteUrl()}
        />
      </div>
    </>
  );
}

function ErrorState({
  title,
  children,
  defaultValue,
  retry,
}: {
  title: string;
  children: React.ReactNode;
  defaultValue?: string;
  retry?: string;
}) {
  return (
    <section className="max-w-xl py-10">
      <h1 className="font-display text-3xl font-semibold tracking-tight text-balance">{title}</h1>
      <p className="mt-3 text-muted">{children}</p>
      {retry && (
        <Link href={retry} prefetch={false} className="mt-4 inline-block text-majorelle underline underline-offset-4">
          Try again
        </Link>
      )}
      <div className="mt-8">
        <UsernameForm defaultValue={defaultValue} />
      </div>
    </section>
  );
}

function Loading() {
  return (
    <div aria-busy className="animate-pulse">
      <div className="h-12 w-64 rounded-lg bg-sand" />
      <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="h-24 rounded-xl bg-sand" />
        ))}
      </div>
      <div className="mt-8 h-[166px] max-w-[888px] rounded-xl bg-sand" />
      <span className="sr-only">Loading contributions…</span>
    </div>
  );
}

function safeDecode(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}
