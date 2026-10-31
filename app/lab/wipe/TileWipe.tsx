"use client";

import { useEffect, useMemo, useState } from "react";
import { STAR_STROKE, crossPolygon, octagonPolygon, pointsAttr, starPolygon, type Theme } from "@/lib/render";

export type WipeMode = "hidden" | "cover" | "reveal";

const CELL = 72;
const DURATION = 420; // per tile, ms
const SPREAD = 650; // first to last tile, ms

const STAR = pointsAttr(starPolygon(CELL * 0.64));
const CROSS = pointsAttr(crossPolygon(CELL * 0.2));
const HEART = pointsAttr(octagonPolygon(CELL * 0.64 * 0.32));

/** Deterministic 0–1 noise per cell, so the mosaic doesn't reshuffle between renders. */
function noise(i: number, j: number) {
  const x = Math.sin(i * 127.1 + j * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/** Total time for a cover or reveal to finish. */
export const WIPE_MS = DURATION + SPREAD + 60;

/**
 * Full-screen transition: interlocking star tiles grow out from `origin`
 * until they cover the screen (cover), then shrink away from it (reveal).
 * Pure CSS animations, so ~400 tiles stay smooth.
 */
export function TileWipe({ mode, origin, theme: t }: { mode: WipeMode; origin: { x: number; y: number }; theme: Theme }) {
  const [view, setView] = useState({ w: 1280, h: 800 });
  useEffect(() => {
    const update = () => setView({ w: window.innerWidth, h: window.innerHeight });
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const cells = useMemo(() => {
    const cols = Math.ceil(view.w / CELL) + 1;
    const rows = Math.ceil(view.h / CELL) + 1;
    const far = Math.max(
      ...[
        [0, 0],
        [view.w, 0],
        [0, view.h],
        [view.w, view.h],
      ].map(([x, y]) => Math.hypot(x - origin.x, y - origin.y)),
    );
    const palette = [t.empty, t.levels[0], t.levels[1], t.levels[2], t.levels[3]];
    const out = [];
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        const cx = i * CELL + CELL / 2;
        const cy = j * CELL + CELL / 2;
        const n = noise(i, j);
        const level = n < 0.22 ? 0 : n < 0.42 ? 1 : n < 0.62 ? 2 : n < 0.82 ? 3 : 4;
        const delay = (Math.hypot(cx - origin.x, cy - origin.y) / far) * SPREAD + noise(j, i) * 60;
        out.push({ key: `${i}-${j}`, cx, cy, fill: palette[level], heart: level >= 3, delay });
      }
    }
    return out;
  }, [view, origin, t]);

  if (mode === "hidden") return null;
  const anim = mode === "cover" ? "zw-in" : "zw-out";

  return (
    <svg
      className="fixed inset-0 z-[100] h-full w-full"
      viewBox={`0 0 ${view.w} ${view.h}`}
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
    >
      <style>{`
        .zw{transform-box:fill-box;transform-origin:center;animation-duration:${DURATION}ms;animation-fill-mode:both;animation-timing-function:cubic-bezier(.22,1,.36,1)}
        .zw-in{animation-name:zw-in}.zw-out{animation-name:zw-out;animation-timing-function:cubic-bezier(.64,0,.78,0)}
        .zw-spin.zw-in{animation-name:zw-in-spin}.zw-spin.zw-out{animation-name:zw-out-spin}
        @keyframes zw-in{from{transform:scale(0)}to{transform:scale(1)}}
        @keyframes zw-out{from{transform:scale(1)}to{transform:scale(0)}}
        @keyframes zw-in-spin{from{transform:scale(0) rotate(-90deg)}to{transform:scale(1) rotate(0)}}
        @keyframes zw-out-spin{from{transform:scale(1) rotate(0)}to{transform:scale(0) rotate(90deg)}}
      `}</style>
      {/* grout backing squares tile the screen exactly, so nothing shows through */}
      <g fill={t.grout}>
        {cells.map((c) => (
          <rect
            key={c.key}
            x={c.cx - CELL / 2 - 0.5}
            y={c.cy - CELL / 2 - 0.5}
            width={CELL + 1}
            height={CELL + 1}
            className={`zw ${anim}`}
            style={{ animationDelay: `${c.delay}ms` }}
          />
        ))}
      </g>
      <g fill={t.cross} opacity={0.55}>
        {cells.map((c) => (
          <polygon
            key={c.key}
            points={CROSS}
            transform={`translate(${c.cx + CELL / 2} ${c.cy + CELL / 2})`}
            className={`zw ${anim}`}
            style={{ animationDelay: `${c.delay + 40}ms` }}
          />
        ))}
      </g>
      {cells.map((c) => (
        <g key={c.key} transform={`translate(${c.cx} ${c.cy})`}>
          <g className={`zw zw-spin ${anim}`} style={{ animationDelay: `${c.delay}ms` }}>
            <polygon points={STAR} fill={c.fill} stroke={t.grout} strokeWidth={STAR_STROKE * 2.5} strokeLinejoin="round" />
            {c.heart && <polygon points={HEART} fill={t.heart} />}
          </g>
        </g>
      ))}
    </svg>
  );
}
