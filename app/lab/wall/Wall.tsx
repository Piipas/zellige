"use client";

import { AnimatePresence, motion, useAnimate, useReducedMotion } from "motion/react";
import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  CELL,
  CROSS_OPACITY,
  PAD,
  STAR_R,
  STAR_STROKE,
  THEME_NAMES,
  THEMES,
  TOP,
  crossPolygon,
  layout,
  pointsAttr,
  starPolygon,
  type Theme,
  type ThemeName,
  type Tile,
} from "@/lib/render";
import { endpointPath } from "@/lib/site";
import { computeStats } from "@/lib/stats";
import { normalizeUsername } from "@/lib/username";
import { loadUser, type WallData } from "../shared";

const EASE_OUT = [0.22, 1, 0.36, 1] as const;
const RECOLOUR = { transition: "fill 450ms ease, stroke 450ms ease, color 450ms ease, background-color 450ms ease" };

function isDark(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  return ((n >> 16) * 299 + ((n >> 8) & 255) * 587 + (n & 255) * 114) / 1000 < 128;
}

/** The surrounding wall: the graph's own tile, repeated, so the year sits inside a larger wall. */
function wallPattern(t: Theme): string {
  const star = starPolygon(STAR_R);
  const c = CELL / 2;
  const stars = [
    [c, c],
    [c - CELL, c],
    [c + CELL, c],
    [c, c - CELL],
    [c, c + CELL],
  ]
    .map(
      ([x, y]) =>
        `<polygon points="${pointsAttr(star, x, y)}" fill="${t.empty}" stroke="${t.grout}" stroke-width="${STAR_STROKE}" stroke-linejoin="round"/>`,
    )
    .join("");
  const cross = crossPolygon(CELL * 0.2);
  const crosses = [
    [0, 0],
    [CELL, 0],
    [0, CELL],
    [CELL, CELL],
  ]
    .map(([x, y]) => `<polygon points="${pointsAttr(cross, x, y)}"/>`)
    .join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${CELL}" height="${CELL}" viewBox="0 0 ${CELL} ${CELL}"><rect width="${CELL}" height="${CELL}" fill="${t.grout}"/><g fill="${t.cross}" opacity="${CROSS_OPACITY}">${crosses}</g>${stars}</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

export function Wall({ initial }: { initial: WallData }) {
  const reduceMotion = useReducedMotion();
  const [data, setData] = useState(initial);
  const [theme, setTheme] = useState<ThemeName>("fes");
  const [gen, setGen] = useState(0); // 0 = entrance; each new user flips the tiles over
  const [replay, setReplay] = useState(0);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [embedOpen, setEmbedOpen] = useState(false);
  const [hover, setHover] = useState<Tile | null>(null);

  const m = useMemo(() => layout(data.weeks, { user: data.login, total: data.total, theme }), [data, theme]);
  const stats = useMemo(() => computeStats(data.weeks, data.total), [data]);
  const t = m.theme;
  const dark = isDark(t.grout);
  const ink = dark ? "#f3ede0" : "#2a2620";
  const cols = m.weeks.length;
  const gridW = cols * CELL;
  const gridH = 7 * CELL;

  // Align the background wall with the graph's grid, whatever size the graph renders at.
  const svgRef = useRef<SVGSVGElement>(null);
  const [geo, setGeo] = useState({ s: 1.6, x: 0, y: 0 });
  useLayoutEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      setGeo({ s: r.width / gridW, x: r.left, y: r.top });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener("scroll", measure, true);
    return () => {
      ro.disconnect();
      window.removeEventListener("scroll", measure, true);
    };
  }, [gridW]);

  async function lookUp(raw: string) {
    const login = normalizeUsername(raw);
    if (!login) {
      setError("That isn't a GitHub username");
      return;
    }
    setBusy(true);
    setError(null);
    const result = await loadUser(login);
    setBusy(false);
    if (typeof result === "string") {
      setError(result);
      return;
    }
    setData(result);
    setGen((g) => g + 1);
    window.history.replaceState(null, "", `/lab/wall?user=${result.login.toLowerCase()}`);
  }

  // Deep link: /lab/wall?user=octocat
  useEffect(() => {
    const user = new URLSearchParams(window.location.search).get("user");
    if (!user) return;
    // After the entrance has started, so the deep-linked user arrives as a flip.
    const timer = setTimeout(() => void lookUp(user), 300);
    return () => clearTimeout(timer);
  }, []);

  const period = CELL * geo.s;
  const embed = `![zellige](${typeof window === "undefined" ? "" : window.location.origin}${endpointPath(data.login, theme)})`;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col overflow-hidden"
      style={{ backgroundColor: t.grout, color: ink, ...RECOLOUR }}
    >
      {/* the wall */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-45 transition-opacity"
        style={{
          backgroundImage: wallPattern(t),
          backgroundSize: `${period}px ${period}px`,
          backgroundPosition: `${geo.x}px ${geo.y}px`,
        }}
      />
      {/* soften the wall toward the edges so the year reads as the focal panel */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(ellipse 80% 70% at 50% 55%, transparent 40%, ${t.grout} 100%)`,
        }}
      />

      <header className="relative z-10 flex items-center justify-between gap-4 px-5 py-4 sm:px-8">
        <span className="font-display text-xl font-semibold tracking-tight">zellige</span>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void lookUp(query);
          }}
          className="flex items-center gap-1 rounded-full border px-3 py-1.5 backdrop-blur-md"
          style={{ borderColor: `${ink}26`, background: `${t.grout}cc` }}
        >
          <span className="opacity-60">@</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="any github user"
            aria-label="GitHub username"
            autoComplete="off"
            spellCheck={false}
            className="w-36 bg-transparent outline-none placeholder:opacity-50 sm:w-48"
          />
          <button type="submit" disabled={busy} className="text-sm font-medium opacity-80 hover:opacity-100">
            {busy ? "laying…" : "↵"}
          </button>
        </form>
      </header>

      <main className="relative z-10 flex flex-1 flex-col justify-center gap-6 overflow-x-auto px-5 sm:px-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={data.login}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.45, ease: EASE_OUT }}
            className="flex flex-wrap items-end justify-between gap-x-10 gap-y-3"
          >
            <div>
              <h1 className="font-display text-5xl font-semibold tracking-tight sm:text-7xl">@{data.login}</h1>
              <p className="mt-1 opacity-70">
                {data.total.toLocaleString("en-US")} contributions in the last year
              </p>
            </div>
            <dl className="flex gap-6 text-sm">
              {[
                ["longest", `${stats.longestStreak.days}d`],
                ["current", `${stats.currentStreak.days}d`],
                ["best day", stats.bestDay.count.toLocaleString("en-US")],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-xs tracking-wide uppercase opacity-60">{label}</dt>
                  <dd className="font-display text-2xl font-semibold tabular-nums">{value}</dd>
                </div>
              ))}
            </dl>
          </motion.div>
        </AnimatePresence>

        {error && (
          <p role="alert" className="text-sm" style={{ color: t.levels[2] }}>
            {error}
          </p>
        )}

        <div className="relative w-full min-w-[640px]" onPointerLeave={() => setHover(null)}>
          <svg
            ref={svgRef}
            viewBox={`${PAD} ${TOP} ${gridW} ${gridH}`}
            className="block h-auto w-full overflow-visible"
            role="img"
            aria-label={m.title}
          >
            <g fill={t.cross} opacity={CROSS_OPACITY} style={RECOLOUR}>
              {m.crosses.map(([x, y]) => (
                <polygon key={`${x},${y}`} points={m.shapes.cross} transform={`translate(${x} ${y})`} />
              ))}
            </g>
            {/* One flat list keyed by grid position: when a day changes layer
                (empty ↔ active) React reorders the node instead of remounting
                it, so it flips like every other tile. */}
            <g key={replay}>
              {m.groups
                .flatMap((g) => g.tiles)
                .map((tile) => (
                  <WallTile
                    key={`${tile.w}-${tile.d}`}
                    tile={tile}
                    theme={t}
                    shapes={m.shapes}
                    gen={gen}
                    cols={cols}
                    animate={!reduceMotion}
                    onHover={setHover}
                  />
                ))}
            </g>
            {hover && <Lifted key={hover.day.date} tile={hover} theme={t} shapes={m.shapes} />}
          </svg>
          {hover && (
            <div
              className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-md px-2.5 py-1.5 text-xs whitespace-nowrap shadow-lg"
              style={{
                left: (hover.cx - PAD) * geo.s,
                top: (hover.cy - TOP - STAR_R - 4) * geo.s,
                background: ink,
                color: t.grout,
              }}
            >
              <b>{hover.day.count}</b> on {hover.day.date}
            </div>
          )}
        </div>
      </main>

      <footer className="relative z-10 flex justify-center px-4 pt-4 pb-6">
        <nav
          className="flex items-center gap-1 rounded-full border p-1.5 shadow-lg backdrop-blur-md"
          style={{ borderColor: `${ink}1f`, background: `${t.grout}d9` }}
        >
          <DockButton
            ink={ink}
            paper={t.grout}
            onClick={() => {
              setGen(0);
              setReplay((r) => r + 1);
            }}
          >
            ▶ Replay
          </DockButton>
          <span className="mx-1 h-5 w-px" style={{ background: `${ink}26` }} />
          {THEME_NAMES.map((name) => (
            <DockButton key={name} ink={ink} paper={t.grout} active={name === theme} onClick={() => setTheme(name)}>
              <span className="flex gap-px" aria-hidden>
                {THEMES[name].levels.map((c) => (
                  <span key={c} className="size-2 rounded-[1px]" style={{ background: c }} />
                ))}
              </span>
              <span className="capitalize">{name}</span>
            </DockButton>
          ))}
          <span className="mx-1 h-5 w-px" style={{ background: `${ink}26` }} />
          <DockButton ink={ink} paper={t.grout} active={embedOpen} onClick={() => setEmbedOpen((o) => !o)}>
            {"</>"} Embed
          </DockButton>
        </nav>
      </footer>

      <AnimatePresence>
        {embedOpen && (
          <motion.div
            initial={{ y: "110%" }}
            animate={{ y: 0 }}
            exit={{ y: "110%" }}
            transition={{ type: "spring", stiffness: 300, damping: 32 }}
            className="absolute inset-x-4 bottom-24 z-20 mx-auto max-w-2xl rounded-2xl border p-5 shadow-2xl backdrop-blur-xl"
            style={{ borderColor: `${ink}1f`, background: `${t.grout}f0` }}
          >
            <p className="text-sm font-medium">Paste into your profile README</p>
            <pre className="mt-2 overflow-x-auto rounded-lg p-3 font-mono text-[13px]" style={{ background: `${ink}0d` }}>
              {embed}
            </pre>
            <button
              type="button"
              onClick={() => navigator.clipboard?.writeText(embed)}
              className="mt-3 rounded-md px-3 py-1.5 text-sm font-medium"
              style={{ background: ink, color: t.grout }}
            >
              Copy
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function DockButton({
  children,
  onClick,
  active,
  ink,
  paper,
}: {
  children: React.ReactNode;
  onClick: () => void;
  active?: boolean;
  ink: string;
  paper: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition-colors"
      style={active ? { background: ink, color: paper } : undefined}
    >
      {children}
    </button>
  );
}

interface WallTileProps {
  tile: Tile;
  theme: Theme;
  shapes: { star: string; heart: string };
  gen: number;
  cols: number;
  animate: boolean;
  onHover: (tile: Tile) => void;
}

/**
 * gen 0: tiles drop in along a diagonal wave.
 * gen > 0: tiles flip over in a wave from the search box (top right), showing
 * the new user's glaze on the back. Theme changes ripple along the same wave.
 */
const WallTile = memo(function WallTile({ tile, theme: t, shapes, gen, cols, animate, onHover }: WallTileProps) {
  const [scope, run] = useAnimate();
  const seen = useRef<{ gen: number } | null>(null);

  // After mount, colour and heart are driven imperatively so a change can wait
  // for this tile's turn in the wave (and, on a flip, for the edge-on moment).
  useEffect(() => {
    if (!seen.current) {
      seen.current = { gen };
      return;
    }
    const flip = gen !== seen.current.gen && gen > 0;
    seen.current.gen = gen;
    const root = scope.current as SVGGElement;
    const delay = animate ? Math.hypot(cols - 1 - tile.w, tile.d * 1.4) * 0.022 : 0;
    const swapAt = { delay: delay + (flip && animate ? 0.3 : 0), duration: flip || !animate ? 0.01 : 0.35 };
    if (flip && animate) {
      run(root, { scaleX: [1, 0, 1], scaleY: [1, 1.08, 1] }, { delay, duration: 0.6, ease: "easeInOut" });
    }
    run(root.querySelector(".zg-glaze")!, { fill: tile.fill }, swapAt);
    run(root.querySelector(".zg-heart")!, { opacity: tile.heart ? 1 : 0 }, swapAt);
  }, [gen, tile.fill, tile.heart, tile.w, tile.d, cols, animate, run, scope]);

  return (
    <g transform={`translate(${tile.cx} ${tile.cy})`} onPointerEnter={() => onHover(tile)}>
      <motion.g
        ref={scope}
        initial={animate ? { opacity: 0, scale: 0.4, y: -10 } : false}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ delay: (tile.w * 25 + tile.d * 14) / 1000, duration: 0.5, ease: EASE_OUT }}
      >
        <motion.polygon
          className="zg-glaze"
          points={shapes.star}
          stroke={t.grout}
          strokeWidth={STAR_STROKE}
          strokeLinejoin="round"
          initial={{ fill: tile.fill }}
        />
        <motion.polygon
          className="zg-heart"
          points={shapes.heart}
          fill={t.heart}
          initial={{ opacity: tile.heart ? 1 : 0 }}
          style={RECOLOUR}
        />
      </motion.g>
    </g>
  );
});

function Lifted({ tile, theme: t, shapes }: { tile: Tile; theme: Theme; shapes: { star: string; heart: string } }) {
  return (
    <g transform={`translate(${tile.cx} ${tile.cy})`} pointerEvents="none">
      <motion.g
        initial={{ scale: 1 }}
        animate={{ scale: 1.3 }}
        transition={{ type: "spring", stiffness: 420, damping: 22 }}
        style={{ filter: `drop-shadow(0 1px 1.5px rgb(0 0 0 / .3)) drop-shadow(0 0 4px ${tile.fill})` }}
      >
        <polygon points={shapes.star} fill={tile.fill} stroke={t.grout} strokeWidth={STAR_STROKE} strokeLinejoin="round" />
        {tile.heart && <polygon points={shapes.heart} fill={t.heart} />}
      </motion.g>
    </g>
  );
}
