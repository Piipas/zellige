"use client";

import { useEffect, useState } from "react";
import { DEFAULT_THEME, type Day, type ThemeName } from "@/lib/render";
import { Controls } from "./Controls";
import { EmbedPanel } from "./EmbedPanel";
import { ZelligeGraph } from "./ZelligeGraph";

interface Props {
  weeks: Day[][];
  login: string;
  total: number;
  initialTheme: ThemeName;
  initialAnimate: boolean;
  site: string;
}

/** Interactive preview: graph, controls and embed snippets sharing one state. */
export function Preview({ weeks, login, total, initialTheme, initialAnimate, site }: Props) {
  const [theme, setTheme] = useState(initialTheme);
  const [animate, setAnimate] = useState(initialAnimate);
  const [replay, setReplay] = useState(0);

  // Mirror options into the query string so a copied link reproduces the view.
  // replaceState keeps it client-side: no server round trip, no history spam.
  useEffect(() => {
    const url = new URL(window.location.href);
    if (theme === DEFAULT_THEME) url.searchParams.delete("theme");
    else url.searchParams.set("theme", theme);
    if (animate) url.searchParams.delete("animate");
    else url.searchParams.set("animate", "0");
    if (url.href !== window.location.href) window.history.replaceState(null, "", url);
  }, [theme, animate]);

  return (
    <>
      <Controls
        theme={theme}
        onTheme={setTheme}
        animate={animate}
        onAnimate={(on) => {
          setAnimate(on);
          setReplay((n) => n + 1);
        }}
        onReplay={animate ? () => setReplay((n) => n + 1) : undefined}
      />
      <div className="mt-4 overflow-x-auto rounded-xl pb-2">
        <ZelligeGraph key={replay} weeks={weeks} user={login} total={total} theme={theme} animate={animate} />
      </div>
      <EmbedPanel weeks={weeks} login={login} total={total} theme={theme} animate={animate} site={site} />
    </>
  );
}
