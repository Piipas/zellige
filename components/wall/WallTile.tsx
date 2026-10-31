"use client";

import { motion, useAnimate } from "motion/react";
import { memo, useEffect, useRef } from "react";
import { STAR_STROKE, type Theme, type Tile } from "@/lib/render";

const EASE_OUT = [0.22, 1, 0.36, 1] as const;
const RECOLOUR = { transition: "fill 450ms ease, stroke 450ms ease" };

interface Props {
  tile: Tile;
  x: number;
  y: number;
  theme: Theme;
  shapes: { star: string; heart: string };
  /** Bumped every time the wall shows a different user; triggers the flip. */
  gen: number;
  /** Seconds before this tile's turn in the flip/recolour wave. */
  waveDelay: number;
  animate: boolean;
  onHover: (tile: Tile) => void;
}

/**
 * One star. On mount it drops in along a diagonal wave. Afterwards, its colour
 * and heart are driven imperatively so each change waits for the tile's turn in
 * the wave: a new user flips the tile edge-on and shows the new glaze on the
 * back; a theme change just re-glazes it in place.
 */
export const WallTile = memo(function WallTile({ tile, x, y, theme: t, shapes, gen, waveDelay, animate, onHover }: Props) {
  const [scope, run] = useAnimate();
  const lastGen = useRef<number | null>(null);

  useEffect(() => {
    if (lastGen.current === null) {
      lastGen.current = gen;
      return;
    }
    const flip = animate && gen !== lastGen.current;
    lastGen.current = gen;
    const root = scope.current as SVGGElement;
    const delay = animate ? waveDelay : 0;
    const at = { delay: delay + (flip ? 0.3 : 0), duration: flip || !animate ? 0.01 : 0.35 };
    if (flip) run(root, { scaleX: [1, 0, 1], scaleY: [1, 1.08, 1] }, { delay, duration: 0.6, ease: "easeInOut" });
    run(root.querySelector(".zg-glaze")!, { fill: tile.fill }, at);
    run(root.querySelector(".zg-heart")!, { opacity: tile.heart ? 1 : 0 }, at);
  }, [gen, tile.fill, tile.heart, waveDelay, animate, run, scope]);

  return (
    <g transform={`translate(${x} ${y})`} onPointerEnter={() => onHover(tile)}>
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
          style={RECOLOUR}
        />
        <g className={animate && tile.day.level === 4 ? "zg-pulse" : undefined}>
          <motion.polygon
            className="zg-heart"
            points={shapes.heart}
            fill={t.heart}
            initial={{ opacity: tile.heart ? 1 : 0 }}
            style={RECOLOUR}
          />
        </g>
      </motion.g>
    </g>
  );
});

/** A raised copy of the hovered tile, drawn last so it sits above its neighbours. */
export function LiftedTile({
  tile,
  x,
  y,
  theme: t,
  shapes,
  animate,
}: {
  tile: Tile;
  x: number;
  y: number;
  theme: Theme;
  shapes: { star: string; heart: string };
  animate: boolean;
}) {
  return (
    <g transform={`translate(${x} ${y})`} pointerEvents="none">
      <motion.g
        initial={animate ? { scale: 1 } : false}
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
