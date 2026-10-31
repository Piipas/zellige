import { UsernameForm } from "@/components/UsernameForm";
import { ZelligeGraph } from "@/components/ZelligeGraph";
import { THEME_NAMES, THEMES } from "@/lib/render";
import { sampleCalendar } from "@/lib/sample";
import { siteUrl } from "@/lib/site";

// Fixed sample data: the landing page never calls GitHub.
const sample = sampleCalendar();

export default function Home() {
  const embed = `![zellige](${siteUrl()}/api/zellige?user=YOUR_USERNAME)`;

  return (
    <main className="mx-auto w-full max-w-5xl px-4 sm:px-6">
      <section className="pt-10 pb-12 sm:pt-16">
        <p className="mb-4 text-sm font-medium tracking-wide text-zellige uppercase">GitHub contributions, in tilework</p>
        <h1 className="max-w-3xl font-display text-4xl leading-[1.08] font-semibold tracking-tight text-balance sm:text-6xl">
          Your coding year, laid in zellige.
        </h1>
        <p className="mt-5 max-w-xl text-lg text-pretty text-muted">
          Every day you commit becomes an eight-point star, set in grout like the tile walls of Fes. Preview yours,
          then add the animated SVG to your profile README.
        </p>
        <div className="mt-8">
          <UsernameForm autoFocus />
        </div>
      </section>

      <section aria-label="Example graph" className="overflow-x-auto rounded-2xl pb-2">
        <ZelligeGraph weeks={sample.weeks} user="zellige" total={sample.total} theme="fes" />
      </section>

      <section className="grid gap-8 py-16 sm:grid-cols-3">
        {[
          ["Look up", "Enter any GitHub username to fetch the last year of contributions."],
          ["Choose a palette", "Fes blues, Marrakech terracotta, or Night for dark mode. Every option lives in the URL."],
          ["Embed", "Copy one line of Markdown. GitHub serves the animated SVG straight into your README."],
        ].map(([title, body], i) => (
          <div key={title}>
            <p className="font-display text-3xl text-ochre">{i + 1}</p>
            <h2 className="mt-1 font-display text-xl font-semibold">{title}</h2>
            <p className="mt-2 text-muted">{body}</p>
          </div>
        ))}
      </section>

      <section className="border-t border-line py-16">
        <h2 className="font-display text-3xl font-semibold tracking-tight">Palettes</h2>
        <p className="mt-2 text-muted">
          Each theme is a single object in <code className="font-mono text-sm">lib/render.ts</code>. New ones are
          welcome.
        </p>
        <div className="mt-8 grid gap-6">
          {THEME_NAMES.map((name) => (
            <figure key={name}>
              <figcaption className="mb-2 flex items-center gap-2 text-sm font-medium capitalize">
                <span className="flex gap-0.5" aria-hidden>
                  {THEMES[name].levels.map((c) => (
                    <span key={c} className="size-3 rounded-sm" style={{ background: c }} />
                  ))}
                </span>
                {name}
              </figcaption>
              <div className="overflow-x-auto pb-1">
                <ZelligeGraph
                  weeks={sample.weeks}
                  user="zellige"
                  total={sample.total}
                  theme={name}
                  animate={false}
                  interactive={false}
                />
              </div>
            </figure>
          ))}
        </div>
      </section>

      <section className="border-t border-line py-16">
        <h2 className="font-display text-3xl font-semibold tracking-tight">One line in your README</h2>
        <p className="mt-2 text-muted">Paste this into your profile README and replace the username.</p>
        <pre className="mt-6 overflow-x-auto rounded-lg border border-line bg-white/70 p-4 font-mono text-sm">
          {embed}
        </pre>
      </section>
    </main>
  );
}
