"use client";

import { AnimatePresence, motion } from "motion/react";
import { useRef, useState } from "react";
import { Stats } from "@/components/Stats";
import { ZelligeGraph } from "@/components/ZelligeGraph";
import { THEMES } from "@/lib/render";
import { computeStats } from "@/lib/stats";
import { normalizeUsername } from "@/lib/username";
import { loadUser, type WallData } from "../shared";
import { TileWipe, WIPE_MS, type WipeMode } from "./TileWipe";

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const SUGGESTIONS = ["torvalds", "gaearon", "sindresorhus", "piipas"];

export default function WipePrototype() {
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<WallData | null>(null);
  const [mode, setMode] = useState<WipeMode>("hidden");
  const [origin, setOrigin] = useState({ x: 0, y: 0 });
  const busy = useRef(false);

  /** cover → swap content underneath → reveal */
  async function transition(from: HTMLElement | null, prepare: () => Promise<() => void>) {
    if (busy.current) return;
    busy.current = true;
    const r = from?.getBoundingClientRect();
    setOrigin(r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : { x: innerWidth / 2, y: innerHeight / 2 });
    setMode("cover");
    // Load while the tiles cover the screen, but only swap once fully covered,
    // so the new graph's entrance plays as it's uncovered.
    const [apply] = await Promise.all([prepare(), wait(WIPE_MS)]);
    apply();
    window.scrollTo(0, 0);
    // Reveal from the middle of the screen, where the new content is.
    setOrigin({ x: innerWidth / 2, y: innerHeight * 0.45 });
    setMode("reveal");
    await wait(WIPE_MS);
    setMode("hidden");
    busy.current = false;
  }

  function go(user: string, el: HTMLElement | null) {
    const login = normalizeUsername(user);
    if (!login) {
      setError("That isn't a GitHub username");
      return;
    }
    setError(null);
    void transition(el, async () => {
      const result = await loadUser(login);
      return typeof result === "string" ? () => setError(result) : () => setData(result);
    });
  }

  const submitRef = useRef<HTMLButtonElement>(null);

  return (
    <main className="mx-auto w-full max-w-5xl px-4 sm:px-6">
      <TileWipe mode={mode} origin={origin} theme={THEMES.fes} />

      <AnimatePresence mode="wait" initial={false}>
        {!data ? (
          <motion.section key="entry" className="flex min-h-[70dvh] flex-col items-center justify-center text-center">
            <h1 className="font-display text-5xl font-semibold tracking-tight text-balance sm:text-7xl">
              Whose year shall we tile?
            </h1>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                go(query, submitRef.current);
              }}
              className="mt-10 flex w-full max-w-md items-center gap-2 rounded-full border border-line bg-white/80 p-1.5 pl-5 shadow-sm"
            >
              <span className="text-muted">@</span>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="github username"
                aria-label="GitHub username"
                autoComplete="off"
                spellCheck={false}
                autoFocus
                className="min-w-0 flex-1 bg-transparent py-2 outline-none"
              />
              <button ref={submitRef} type="submit" className="rounded-full bg-majorelle px-5 py-2 font-medium text-cream">
                Tile it
              </button>
            </form>
            {error && <p className="mt-3 text-sm text-terracotta">{error}</p>}
            <p className="mt-6 text-sm text-muted">
              or try{" "}
              {SUGGESTIONS.map((s, i) => (
                <span key={s}>
                  <button
                    type="button"
                    onClick={(e) => go(s, e.currentTarget)}
                    className="underline decoration-line underline-offset-4 hover:text-ink"
                  >
                    @{s}
                  </button>
                  {i < SUGGESTIONS.length - 1 ? " · " : ""}
                </span>
              ))}
            </p>
          </motion.section>
        ) : (
          <motion.section key={data.login} className="pt-6 pb-16">
            <button
              type="button"
              onClick={(e) =>
                void transition(e.currentTarget, async () => () => setData(null))
              }
              className="text-sm text-muted hover:text-ink"
            >
              ← another user
            </button>
            <h1 className="mt-4 mb-8 font-display text-5xl font-semibold tracking-tight">@{data.login}</h1>
            <Stats stats={computeStats(data.weeks, data.total)} />
            <div className="mt-8 overflow-x-auto pb-2">
              <ZelligeGraph weeks={data.weeks} user={data.login} total={data.total} theme="fes" />
            </div>
          </motion.section>
        )}
      </AnimatePresence>
    </main>
  );
}
