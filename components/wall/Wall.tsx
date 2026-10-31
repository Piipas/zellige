"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useCallback, useEffect, useEffectEvent, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { StarMark } from "@/components/StarMark";
import { CELL, CROSS_OPACITY, STAR_R, THEME_NAMES, THEMES, layout, type Theme, type ThemeName, type Tile } from "@/lib/render";
import { AUTHOR, REPO_URL } from "@/lib/site";
import { computeStats } from "@/lib/stats";
import { normalizeUsername } from "@/lib/username";
import { errorView, loadCalendar, optionsQuery, type View, type WallData } from "./data";
import { EmbedSheet } from "./EmbedSheet";
import { grid, inkFor, wallPattern } from "./geometry";
import { LiftedTile, WallTile } from "./WallTile";

const EASE_OUT = [0.22, 1, 0.36, 1] as const;
const WAVE_S_PER_TILE = 0.022;

interface Props {
  /** What to draw first: the sample year, a user's year, or a blank wall for errors. */
  data: WallData;
  view: View;
  /** Restores the demo when navigating back to "/". */
  demo: WallData;
  initialTheme: ThemeName;
  initialAnimate: boolean;
  site: string;
}

const narrowQuery = "(max-width: 639px)";
function subscribeNarrow(cb: () => void) {
  const mq = window.matchMedia(narrowQuery);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

/**
 * The whole app: one full-screen zellige wall. The year is the crisp panel in
 * the middle; the same tiles continue faintly to the screen edges. Looking up
 * someone else flips the tiles over in place; the URL follows along.
 */
export function Wall({ data: initialData, view: initialView, demo, initialTheme, initialAnimate, site }: Props) {
  const reduceMotion = useReducedMotion();
  const vertical = useSyncExternalStore(subscribeNarrow, () => window.matchMedia(narrowQuery).matches, () => false);

  const [data, setData] = useState(initialData);
  const [view, setView] = useState<View>(initialView);
  const [theme, setTheme] = useState(initialTheme);
  const [animateOn, setAnimateOn] = useState(initialAnimate);
  const [gen, setGen] = useState(0);
  const [replay, setReplay] = useState(0);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [sheet, setSheet] = useState(false);
  const [hover, setHover] = useState<Tile | null>(null);
  const clearHover = useCallback(() => setHover(null), []);

  const motionOn = animateOn && !reduceMotion;
  const m = useMemo(() => layout(data.weeks, { user: data.login, total: data.total, theme }), [data, theme]);
  const g = useMemo(() => grid(m.weeks.length, vertical), [m.weeks.length, vertical]);
  const stats = useMemo(() => computeStats(data.weeks, data.total), [data]);
  const t = m.theme;
  const tiles = useMemo(() => withFillers(m.groups.flatMap((group) => group.tiles), m.weeks.length, t), [m, t]);
  const { ink } = inkFor(t);

  // ---- URL ----------------------------------------------------------------
  const pathFor = (v: View, d: WallData) => (v.kind === "user" ? `/${d.login.toLowerCase()}` : window.location.pathname);

  useEffect(() => {
    const url = `${pathFor(view, data)}${optionsQuery(theme, animateOn)}`;
    if (url !== window.location.pathname + window.location.search) window.history.replaceState(null, "", url);
    document.title = view.kind === "user" ? `@${data.login} · zellige` : "zellige · GitHub contributions as Moroccan tilework";
  }, [theme, animateOn, view, data]);

  // ---- Switching users ------------------------------------------------------
  const show = useCallback((next: WallData, nextView: View, push: boolean) => {
    setData(next);
    setView(nextView);
    setGen((n) => n + 1);
    setHover(null);
    if (push) window.history.pushState(null, "", `${nextView.kind === "user" ? `/${next.login.toLowerCase()}` : "/"}${window.location.search}`);
  }, []);

  async function lookUp(raw: string, push = true) {
    const login = normalizeUsername(raw);
    if (!login) {
      setNotice(errorView("invalid", raw).title);
      return;
    }
    if (view.kind === "user" && login === data.login.toLowerCase()) return;
    setBusy(true);
    setNotice(null);
    const result = await loadCalendar(login);
    setBusy(false);
    if (result.ok) {
      show(result.data, { kind: "user" }, push);
      setQuery("");
    } else if (view.kind === "user") {
      // Keep the current wall; just say what went wrong.
      setNotice(result.title);
    } else {
      setView({ kind: "error", title: result.title, detail: result.detail });
    }
  }

  // Back/forward between users flips the wall too.
  const onPop = useEffectEvent(() => {
    const seg = decodeURIComponent(window.location.pathname.slice(1));
    if (!seg) show(demo, { kind: "demo" }, false);
    else void lookUp(seg, false);
  });
  useEffect(() => {
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  // ---- Background alignment ---------------------------------------------------
  const svgRef = useRef<SVGSVGElement>(null);
  const [geo, setGeo] = useState({ s: 1.6, x: 0, y: 0 });
  useLayoutEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      setGeo({ s: r.width / g.width, x: r.left, y: r.top });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener("scroll", measure, true);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("scroll", measure, true);
      window.removeEventListener("resize", measure);
    };
  }, [g.width]);
  const period = CELL * geo.s;

  return (
    <div
      className="fixed inset-0 flex flex-col"
      style={{ backgroundColor: t.grout, color: ink, transition: "background-color 450ms ease, color 450ms ease", ["--paper" as string]: t.grout }}
    >
      {/* the wall continues past the graph to every edge */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-45"
        style={{ backgroundImage: wallPattern(t), backgroundSize: `${period}px ${period}px`, backgroundPosition: `${geo.x}px ${geo.y}px` }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ background: `radial-gradient(ellipse 85% 75% at 50% 55%, transparent 35%, ${t.grout} 100%)` }}
      />

      <header className="relative z-20 flex items-center justify-between gap-3 px-4 py-4 sm:px-8">
        <Link
          href="/"
          className="flex items-center gap-2 font-display text-xl font-semibold tracking-tight"
          onClick={(e) => {
            // Flip back to the sample in place rather than reloading.
            e.preventDefault();
            if (view.kind !== "demo") show(demo, { kind: "demo" }, true);
          }}
        >
          <StarMark className="size-6" />
          <span className="hidden sm:inline">zellige</span>
        </Link>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void lookUp(query);
          }}
          className="relative flex items-center gap-1 rounded-full border py-1.5 pr-1.5 pl-4 backdrop-blur-md transition-shadow focus-within:ring-3 focus-within:ring-current/15"
          style={{ borderColor: `${ink}2b`, background: `${t.grout}cc` }}
        >
          <span className="opacity-60">@</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="any github user"
            aria-label="GitHub username"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            autoFocus={view.kind !== "user"}
            className="w-36 bg-transparent outline-none placeholder:opacity-50 sm:w-52"
          />
          <button
            type="submit"
            disabled={busy}
            className="rounded-full px-3 py-1 text-sm font-medium"
            style={{ background: ink, color: t.grout }}
          >
            {busy ? "Laying…" : "Tile"}
          </button>
          <AnimatePresence>
            {notice && (
              <motion.p
                role="alert"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="absolute top-full right-2 mt-2 rounded-md px-3 py-1.5 text-sm whitespace-nowrap shadow-lg"
                style={{ background: ink, color: t.grout }}
              >
                {notice}
              </motion.p>
            )}
          </AnimatePresence>
        </form>
      </header>

      <main className="relative z-10 flex flex-1 flex-col gap-6 overflow-auto px-4 pb-28 sm:justify-center sm:px-8">
        <Headline view={view} data={data} stats={stats} />

        <div
          className={`relative mx-auto w-full ${vertical ? "max-w-[280px]" : "min-w-[640px]"}`}
          onPointerLeave={() => setHover(null)}
        >
          <svg
            ref={svgRef}
            viewBox={`0 0 ${g.width} ${g.height}`}
            className="block h-auto w-full overflow-visible"
            role="img"
            aria-label={view.kind === "user" ? m.title : "A sample year of contributions"}
          >
            <g fill={t.cross} opacity={CROSS_OPACITY} style={{ transition: "fill 450ms ease" }}>
              {g.crosses.map(([x, y]) => (
                <polygon key={`${x},${y}`} points={m.shapes.cross} transform={`translate(${x} ${y})`} />
              ))}
            </g>
            {/* One flat list keyed by grid position: a day that changes layer
                (empty ↔ active) is reordered, not remounted, so it flips too. */}
            <g key={`${replay}-${vertical}`}>
              {tiles.map((tile) => {
                const [x, y] = g.pos(tile.w, tile.d);
                return (
                  <WallTile
                    key={`${tile.w}-${tile.d}`}
                    tile={tile}
                    x={x}
                    y={y}
                    theme={t}
                    shapes={m.shapes}
                    gen={gen}
                    waveDelay={g.fromSearch(tile.w, tile.d) * WAVE_S_PER_TILE}
                    animate={motionOn}
                    onHover={tile.day.date ? setHover : clearHover}
                  />
                );
              })}
            </g>
            {hover && (
              <LiftedTile
                key={hover.day.date}
                tile={hover}
                x={g.pos(hover.w, hover.d)[0]}
                y={g.pos(hover.w, hover.d)[1]}
                theme={t}
                shapes={m.shapes}
                animate={!reduceMotion}
              />
            )}
          </svg>
          {hover && view.kind === "user" && <Tooltip tile={hover} g={g} scale={geo.s} ink={ink} paper={t.grout} />}
        </div>
        {view.kind === "demo" && <p className="text-center text-xs tracking-wide uppercase opacity-50">a sample year</p>}
        {/* On smaller screens the dock owns the bottom edge, so the credit sits under the wall. */}
        <Credit className="justify-center pt-2 lg:hidden" />
      </main>

      <footer className="pointer-events-none fixed inset-x-0 bottom-0 z-20 flex justify-center px-3 pb-5">
        <nav
          className="pointer-events-auto flex max-w-full items-center gap-0.5 overflow-x-auto rounded-full border p-1.5 shadow-lg backdrop-blur-md"
          style={{ borderColor: `${ink}1f`, background: `${t.grout}e0` }}
        >
          <DockButton ink={ink} paper={t.grout} onClick={() => { setGen(0); setReplay((r) => r + 1); }} label="Replay">
            ↻<span className="hidden sm:inline">Replay</span>
          </DockButton>
          <Divider ink={ink} />
          {THEME_NAMES.map((name) => (
            <DockButton key={name} ink={ink} paper={t.grout} active={name === theme} onClick={() => setTheme(name)} label={`${name} theme`}>
              <span className="flex gap-px rounded-[2px] p-px" style={{ background: THEMES[name].grout }} aria-hidden>
                {THEMES[name].levels.map((c) => (
                  <span key={c} className="size-2 rounded-[1px]" style={{ background: c }} />
                ))}
              </span>
              <span className="hidden capitalize sm:inline">{name}</span>
            </DockButton>
          ))}
          <Divider ink={ink} />
          <DockButton
            ink={ink}
            paper={t.grout}
            active={animateOn}
            onClick={() => {
              setAnimateOn((on) => !on);
              setReplay((r) => r + 1);
              setGen(0);
            }}
            label="Animation"
            role="switch"
          >
            ✦<span className="hidden sm:inline">Motion</span>
          </DockButton>
          {view.kind === "user" && (
            <>
              <Divider ink={ink} />
              <DockButton ink={ink} paper={t.grout} active={sheet} onClick={() => setSheet((s) => !s)} label="Embed in README">
                {"</>"}
                <span className="hidden sm:inline">Embed</span>
              </DockButton>
            </>
          )}
        </nav>
      </footer>

      <AnimatePresence>
        {sheet && view.kind === "user" && (
          <EmbedSheet
            login={data.login}
            total={data.total}
            weeks={data.weeks}
            theme={theme}
            animate={animateOn}
            site={site}
            colors={t}
            ink={ink}
            onClose={() => setSheet(false)}
          />
        )}
      </AnimatePresence>

      <p className="fixed bottom-6 left-6 z-20 hidden text-xs lg:block">
        <a href={AUTHOR.url} className="opacity-60 transition-opacity hover:opacity-100">
          Made by <span className="font-semibold">{AUTHOR.name}</span>
        </a>
      </p>
      <a href={REPO_URL} className="fixed right-6 bottom-6 z-20 hidden text-xs opacity-60 transition-opacity hover:opacity-100 lg:block">
        Source on GitHub
      </a>
    </div>
  );
}

function Headline({ view, data, stats }: { view: View; data: WallData; stats: ReturnType<typeof computeStats> }) {
  const key = view.kind === "user" ? data.login : view.kind === "error" ? view.title : "demo";
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={key}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.35, ease: EASE_OUT }}
        className="mx-auto flex w-full flex-wrap items-end justify-between gap-x-10 gap-y-4"
      >
        {view.kind === "demo" && (
          <div className="max-w-2xl">
            <h1 className="font-display text-4xl leading-[1.05] font-semibold tracking-tight text-balance sm:text-6xl">
              Your coding year, laid in zellige.
            </h1>
            <p className="mt-3 max-w-lg text-pretty opacity-70">
              Every day you commit becomes an eight-point star. Type a GitHub username above and the wall re-tiles into
              their year, ready to embed in a profile README.
            </p>
          </div>
        )}
        {view.kind === "error" && (
          <div className="max-w-2xl">
            <h1 className="font-display text-4xl font-semibold tracking-tight text-balance sm:text-5xl">{view.title}</h1>
            <p className="mt-3 opacity-70">{view.detail}</p>
          </div>
        )}
        {view.kind === "user" && (
          <>
            <div className="min-w-0">
              <h1 className="truncate font-display text-5xl font-semibold tracking-tight sm:text-7xl">
                <a href={`https://github.com/${data.login}`} className="hover:underline hover:decoration-2 hover:underline-offset-8">
                  @{data.login}
                </a>
              </h1>
              <p className="mt-1 opacity-70">
                {data.total === 0
                  ? "No public contributions in the last year yet."
                  : `${data.total.toLocaleString("en-US")} contributions in the last year`}
              </p>
            </div>
            <dl className="flex gap-6 text-sm">
              {[
                ["Longest streak", days(stats.longestStreak.days)],
                ["Current streak", days(stats.currentStreak.days)],
                ["Best day", stats.bestDay.count.toLocaleString("en-US")],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-[11px] tracking-wide uppercase opacity-60">{label}</dt>
                  <dd className="font-display text-2xl font-semibold tabular-nums">{value}</dd>
                </div>
              ))}
            </dl>
          </>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

const days = (n: number) => `${n} ${n === 1 ? "day" : "days"}`;

/**
 * The year starts and ends mid-week, so the first and last columns are short.
 * Fill those cells with plain tiles (no date, no tooltip) so the panel is a
 * full rectangle. They go first, in the empty layer, and flip like the rest.
 */
function withFillers(tiles: Tile[], cols: number, t: Theme): Tile[] {
  const taken = new Set(tiles.map((tile) => `${tile.w}-${tile.d}`));
  const fillers: Tile[] = [];
  for (let w = 0; w < cols; w++) {
    for (let d = 0; d < 7; d++) {
      if (taken.has(`${w}-${d}`)) continue;
      fillers.push({ day: { date: "", count: 0, level: 0 }, w, d, cx: 0, cy: 0, fill: t.empty, heart: false, label: "" });
    }
  }
  return [...fillers, ...tiles];
}

const dateFormat = new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

function Tooltip({ tile, g, scale, ink, paper }: { tile: Tile; g: ReturnType<typeof grid>; scale: number; ink: string; paper: string }) {
  const [x, y] = g.pos(tile.w, tile.d);
  const below = y < CELL * 2;
  const left = x * scale;
  const shiftX = x < CELL * 4 ? "0%" : x > g.width - CELL * 4 ? "-100%" : "-50%";
  const top = (below ? y + STAR_R * 1.3 : y - STAR_R * 1.3) * scale;
  const { count, date } = tile.day;
  return (
    <div
      role="tooltip"
      className="pointer-events-none absolute z-10 rounded-md px-2.5 py-1.5 text-xs whitespace-nowrap shadow-lg"
      style={{ left, top, transform: `translate(${shiftX}, ${below ? "0%" : "-100%"})`, background: ink, color: paper }}
    >
      <b>{count === 0 ? "No" : count.toLocaleString("en-US")} {count === 1 ? "contribution" : "contributions"}</b>
      <span className="opacity-70"> on {dateFormat.format(new Date(`${date}T00:00:00Z`))}</span>
    </div>
  );
}

function Credit({ className = "" }: { className?: string }) {
  return (
    <p className={`flex gap-2 text-xs ${className}`}>
      <a href={AUTHOR.url} className="opacity-60 transition-opacity hover:opacity-100">
        Made by <span className="font-semibold">{AUTHOR.name}</span>
      </a>
      <span className="opacity-30">·</span>
      <a href={REPO_URL} className="opacity-60 transition-opacity hover:opacity-100">
        Source
      </a>
    </p>
  );
}

function Divider({ ink }: { ink: string }) {
  return <span className="mx-1 h-5 w-px shrink-0" style={{ background: `${ink}26` }} />;
}

function DockButton({
  children,
  onClick,
  active,
  ink,
  paper,
  label,
  role,
}: {
  children: React.ReactNode;
  onClick: () => void;
  active?: boolean;
  ink: string;
  paper: string;
  label: string;
  role?: "switch";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={role ? undefined : active}
      aria-checked={role ? active : undefined}
      role={role}
      className="flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition-colors"
      style={active ? { background: ink, color: paper } : undefined}
    >
      {children}
    </button>
  );
}
