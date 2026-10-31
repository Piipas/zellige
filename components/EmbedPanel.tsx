"use client";

import { useState } from "react";
import { render, type Day, type ThemeName } from "@/lib/render";
import { endpointPath } from "@/lib/site";

interface Props {
  weeks: Day[][];
  login: string;
  total: number;
  theme: ThemeName;
  animate: boolean;
  /** Public base URL for the snippets (the production domain). */
  site: string;
}

export function EmbedPanel({ weeks, login, total, theme, animate, site }: Props) {
  const url = `${site}${endpointPath(login, theme, animate)}`;
  const lightTheme = theme === "night" ? "fes" : theme;
  const markdown = `![zellige](${url})`;
  const picture = [
    "<picture>",
    `  <source media="(prefers-color-scheme: dark)" srcset="${site}${endpointPath(login, "night", animate)}">`,
    `  <img alt="zellige contribution graph for @${login}" src="${site}${endpointPath(login, lightTheme, animate)}">`,
    "</picture>",
  ].join("\n");

  function download() {
    const svg = render(weeks, { user: login, total, theme, animate });
    const href = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
    const a = Object.assign(document.createElement("a"), { href, download: `zellige-${login}-${theme}.svg` });
    a.click();
    URL.revokeObjectURL(href);
  }

  return (
    <section className="mt-12 rounded-2xl border border-line bg-white/60 p-5 sm:p-7">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-display text-2xl font-semibold tracking-tight">Add to your README</h2>
          <p className="mt-1 text-sm text-muted">The snippets follow the theme and animation settings above.</p>
        </div>
        <button
          type="button"
          onClick={download}
          className="self-start rounded-lg border border-line bg-white px-3 py-1.5 text-sm font-medium transition hover:border-muted sm:self-auto"
        >
          Download SVG
        </button>
      </div>

      <Snippet label="Markdown" code={markdown} />
      <Snippet label="Light and dark mode" hint="Uses the night theme when the viewer prefers dark mode." code={picture} />

      <div className="mt-8">
        <p className="text-sm font-medium">This is what GitHub will show</p>
        <p className="mt-0.5 text-xs text-muted">Served live by the endpoint and cached for an hour.</p>
        <div className="mt-3 overflow-x-auto pb-1">
          {/* The real endpoint, not the React graph, so this is exactly what GitHub renders. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={url}
            src={endpointPath(login, theme, animate)}
            alt={`zellige contribution graph for @${login}`}
            className="max-w-none"
          />
        </div>
      </div>
    </section>
  );
}

function Snippet({ label, hint, code }: { label: string; hint?: string; code: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard can be blocked (permissions, insecure context); the text is selectable anyway.
    }
  }

  return (
    <div className="mt-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium">{label}</p>
          {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
        </div>
        <button
          type="button"
          onClick={copy}
          className="rounded-md px-2 py-1 text-sm font-medium text-majorelle transition hover:bg-majorelle/10"
          aria-live="polite"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="mt-2 overflow-x-auto rounded-lg border border-line bg-cream/70 p-3 font-mono text-[13px] leading-relaxed">
        {code}
      </pre>
    </div>
  );
}
