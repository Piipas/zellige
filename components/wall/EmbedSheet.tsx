"use client";

import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { render, type Day, type Theme, type ThemeName } from "@/lib/render";
import { endpointPath } from "@/lib/site";

interface Props {
  login: string;
  total: number;
  weeks: Day[][];
  theme: ThemeName;
  animate: boolean;
  /** Public base URL for the snippets (the production domain). */
  site: string;
  colors: Theme;
  ink: string;
  onClose: () => void;
}

export function EmbedSheet({ login, total, weeks, theme, animate, site, colors: t, ink, onClose }: Props) {
  const url = `${site}${endpointPath(login, theme, animate)}`;
  const lightTheme = theme === "night" ? "fes" : theme;
  const markdown = `![zellige](${url})`;
  const picture = [
    "<picture>",
    `  <source media="(prefers-color-scheme: dark)" srcset="${site}${endpointPath(login, "night", animate)}">`,
    `  <img alt="zellige contribution graph for @${login}" src="${site}${endpointPath(login, lightTheme, animate)}">`,
    "</picture>",
  ].join("\n");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function download() {
    const svg = render(weeks, { user: login, total, theme, animate });
    const href = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
    Object.assign(document.createElement("a"), { href, download: `zellige-${login}-${theme}.svg` }).click();
    URL.revokeObjectURL(href);
  }

  return (
    <motion.section
      role="dialog"
      aria-label="Add to your README"
      initial={{ y: "105%", opacity: 0.6 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: "105%", opacity: 0.6 }}
      transition={{ type: "spring", stiffness: 300, damping: 32 }}
      className="fixed inset-x-3 bottom-24 z-30 mx-auto max-h-[70dvh] max-w-2xl overflow-y-auto rounded-2xl border p-5 shadow-2xl backdrop-blur-xl sm:p-6"
      style={{ borderColor: `${ink}1f`, background: `${t.grout}f2`, color: ink }}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-semibold tracking-tight">Add to your README</h2>
          <p className="mt-0.5 text-sm opacity-70">Follows the theme and animation you picked.</p>
        </div>
        <button type="button" onClick={onClose} aria-label="Close" className="rounded-full px-2 text-xl opacity-60 hover:opacity-100">
          ×
        </button>
      </div>

      <Snippet label="Markdown" code={markdown} ink={ink} />
      <Snippet label="Light and dark mode" hint="Switches to the night theme for dark-mode readers." code={picture} ink={ink} />

      <div className="mt-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-medium">What GitHub will show</p>
            <p className="text-xs opacity-60">Served live by the endpoint, cached for an hour.</p>
          </div>
          <button
            type="button"
            onClick={download}
            className="rounded-md border px-3 py-1.5 text-sm font-medium"
            style={{ borderColor: `${ink}33` }}
          >
            Download SVG
          </button>
        </div>
        <div className="mt-3 overflow-x-auto rounded-lg">
          {/* The real endpoint, not the React wall: exactly what GitHub renders. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={url}
            src={endpointPath(login, theme, animate)}
            alt={`zellige contribution graph for @${login}`}
            className="max-w-none"
          />
        </div>
      </div>
    </motion.section>
  );
}

function Snippet({ label, hint, code, ink }: { label: string; hint?: string; code: string; ink: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard can be blocked; the text is still selectable.
    }
  }

  return (
    <div className="mt-5">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium">{label}</p>
          {hint && <p className="text-xs opacity-60">{hint}</p>}
        </div>
        <button
          type="button"
          onClick={copy}
          aria-live="polite"
          className="rounded-md px-3 py-1 text-sm font-medium"
          style={{ background: ink, color: "var(--paper)" }}
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="mt-2 overflow-x-auto rounded-lg p-3 font-mono text-[13px] leading-relaxed" style={{ background: `${ink}0f` }}>
        {code}
      </pre>
    </div>
  );
}
