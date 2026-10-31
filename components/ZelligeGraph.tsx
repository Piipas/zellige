"use client";

import { motion, useReducedMotion } from "motion/react";
import { memo, useId, useMemo, useState } from "react";
import {
  CROSS_OPACITY,
  ENTRANCE_MS,
  FONT_STACK,
  PAD,
  PULSE_MS,
  STAR_R,
  STAR_STROKE,
  WEEK_DELAY_MS,
  layout,
  type Day,
  type Layout,
  type ThemeName,
  type Tile,
} from "@/lib/render";

/** Extra delay per row, which turns the per-week stagger into a diagonal wave. */
const ROW_DELAY_MS = 14;
/** Colour changes (theme switch) fade rather than snap. */
const RECOLOUR = { transition: "fill 450ms ease, stroke 450ms ease" } as const;
const EASE_OUT = [0.22, 1, 0.36, 1] as const;

interface Props {
  weeks: Day[][];
  user: string;
  total: number;
  theme: ThemeName;
  /** Play the entrance and pulse animations (still off under reduced motion). */
  animate?: boolean;
  /** Hover tooltip and lift. Off for small decorative graphs. */
  interactive?: boolean;
}

/**
 * The README image's exact geometry (from lib/render's layout model), drawn
 * as React elements so it can be animated and explored.
 */
export function ZelligeGraph({ weeks, user, total, theme, animate = true, interactive = true }: Props) {
  const reduceMotion = useReducedMotion();
  const play = animate && !reduceMotion;
  const m = useMemo(() => layout(weeks, { user, total, theme }), [weeks, user, total, theme]);
  const clipId = `zg-star-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const [hover, setHover] = useState<Tile | null>(null);
  const t = m.theme;

  return (
    <div className="relative w-max" onPointerLeave={() => setHover(null)}>
      <svg
        width={m.width}
        height={m.height}
        viewBox={`0 0 ${m.width} ${m.height}`}
        role="img"
        aria-label={m.title}
        className="block"
      >
        <defs>
          <clipPath id={clipId}>
            <polygon points={m.shapes.star} />
          </clipPath>
        </defs>
        <rect width={m.width} height={m.height} rx={10} fill={t.grout} style={RECOLOUR} />
        <text x={PAD} y={22} fill={t.text} fontFamily={FONT_STACK} fontSize={12} fontWeight={600} style={RECOLOUR}>
          {m.title}
        </text>

        <g fill={t.cross} opacity={CROSS_OPACITY} style={RECOLOUR}>
          {m.crosses.map(([x, y]) => (
            <polygon key={`${x},${y}`} points={m.shapes.cross} transform={`translate(${x} ${y})`} />
          ))}
        </g>

        {m.groups.map((g) => (
          <g key={`${g.layer}-${g.w}`}>
            {g.tiles.map((tile) => (
              <TileView
                key={tile.day.date}
                tile={tile}
                m={m}
                play={play}
                clipId={clipId}
                onHover={interactive ? setHover : undefined}
              />
            ))}
          </g>
        ))}

        {interactive && hover && <LiftedTile key={hover.day.date} tile={hover} m={m} play={!reduceMotion} />}
      </svg>
      {interactive && hover && <Tooltip tile={hover} weeks={m.weeks.length} />}
    </div>
  );
}

interface TileProps {
  tile: Tile;
  m: Layout;
  play: boolean;
  clipId: string;
  onHover?: (tile: Tile) => void;
}

const TileView = memo(function TileView({ tile, m, play, clipId, onHover }: TileProps) {
  const t = m.theme;
  const delay = (tile.w * WEEK_DELAY_MS + tile.d * ROW_DELAY_MS) / 1000;
  const entrance = ENTRANCE_MS / 1000;
  // Busy days land in the empty colour, then their colour spreads from the centre.
  const ink = play && tile.heart;

  return (
    <g
      transform={`translate(${tile.cx} ${tile.cy})`}
      onPointerEnter={onHover && (() => onHover(tile))}
      className={onHover && "cursor-default"}
    >
      <motion.g
        initial={play ? { opacity: 0, scale: 0.4, y: -10 } : false}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ delay, duration: entrance, ease: EASE_OUT }}
      >
        <polygon
          points={m.shapes.star}
          fill={ink ? t.empty : tile.fill}
          stroke={t.grout}
          strokeWidth={STAR_STROKE}
          strokeLinejoin="round"
          style={RECOLOUR}
        />
        {ink && (
          <>
            <motion.circle
              fill={tile.fill}
              clipPath={`url(#${clipId})`}
              initial={{ r: 0 }}
              animate={{ r: STAR_R }}
              transition={{ delay: delay + entrance * 0.6, duration: 0.7, ease: "easeOut" }}
              style={RECOLOUR}
            />
            <polygon
              points={m.shapes.star}
              fill="none"
              stroke={t.grout}
              strokeWidth={STAR_STROKE}
              strokeLinejoin="round"
              style={RECOLOUR}
            />
          </>
        )}
        {tile.heart && (
          <motion.polygon
            points={m.shapes.heart}
            fill={t.heart}
            style={RECOLOUR}
            animate={play && tile.day.level === 4 ? { opacity: [1, 0.55, 1] } : { opacity: 1 }}
            transition={
              play && tile.day.level === 4
                ? { duration: PULSE_MS / 1000, repeat: Infinity, ease: "easeInOut", delay: delay + entrance }
                : undefined
            }
          />
        )}
      </motion.g>
    </g>
  );
});

/** A raised copy of the hovered tile, drawn last so it sits above its neighbours. */
function LiftedTile({ tile, m, play }: { tile: Tile; m: Layout; play: boolean }) {
  const t = m.theme;
  return (
    <g transform={`translate(${tile.cx} ${tile.cy})`} pointerEvents="none">
      <motion.g
        initial={play ? { scale: 1 } : false}
        animate={{ scale: 1.22 }}
        transition={{ type: "spring", stiffness: 420, damping: 24 }}
        style={{
          filter: `drop-shadow(0 1.5px 1.5px rgb(0 0 0 / 0.25)) drop-shadow(0 0 5px ${tile.fill})`,
        }}
      >
        <polygon
          points={m.shapes.star}
          fill={tile.fill}
          stroke={t.grout}
          strokeWidth={STAR_STROKE}
          strokeLinejoin="round"
        />
        {tile.heart && <polygon points={m.shapes.heart} fill={t.heart} />}
      </motion.g>
    </g>
  );
}

const dateFormat = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

function Tooltip({ tile, weeks }: { tile: Tile; weeks: number }) {
  const { count, date } = tile.day;
  // Keep the tooltip inside the scroll container: below the tile on the top
  // rows, and anchored to the side near the left and right edges.
  const below = tile.d <= 1;
  const x = tile.w < 4 ? "0%" : tile.w > weeks - 5 ? "-100%" : "-50%";
  const y = below ? "0%" : "-100%";
  const top = below ? tile.cy + STAR_R + 6 : tile.cy - STAR_R - 6;

  return (
    <div
      role="tooltip"
      className="pointer-events-none absolute z-10 whitespace-nowrap rounded-md bg-ink px-2.5 py-1.5 text-xs text-cream shadow-lg"
      style={{ left: tile.cx, top, transform: `translate(${x}, ${y})` }}
    >
      <span className="font-semibold">
        {count === 0 ? "No" : count.toLocaleString("en-US")} {count === 1 ? "contribution" : "contributions"}
      </span>
      <span className="text-cream/70"> on {dateFormat.format(new Date(`${date}T00:00:00Z`))}</span>
    </div>
  );
}
