import {
  CELL,
  CROSS_OPACITY,
  STAR_R,
  STAR_STROKE,
  crossPolygon,
  pointsAttr,
  starPolygon,
  type Point,
  type Theme,
} from "@/lib/render";

/**
 * The wall reuses lib/render's tiles and colours but places them itself, so it
 * can stand the year upright on narrow screens (weeks run down, weekdays across).
 */
export interface Grid {
  vertical: boolean;
  cols: number;
  width: number;
  height: number;
  /** Tile centre for week `w`, weekday `d`. */
  pos(w: number, d: number): Point;
  crosses: Point[];
  /** Distance (in tiles) from the corner under the search box; drives the flip wave. */
  fromSearch(w: number, d: number): number;
}

export function grid(cols: number, vertical: boolean): Grid {
  const across = vertical ? 7 : cols;
  const down = vertical ? cols : 7;
  const crosses: Point[] = [];
  for (let i = 0; i <= across; i++) for (let j = 0; j <= down; j++) crosses.push([i * CELL, j * CELL]);

  return {
    vertical,
    cols,
    width: across * CELL,
    height: down * CELL,
    pos: (w, d) => (vertical ? [d * CELL + CELL / 2, w * CELL + CELL / 2] : [w * CELL + CELL / 2, d * CELL + CELL / 2]),
    crosses,
    fromSearch: (w, d) => (vertical ? Math.hypot(6 - d, w) : Math.hypot(cols - 1 - w, d * 1.4)),
  };
}

/** One background tile, repeated to continue the wall past the graph to the screen edges. */
export function wallPattern(t: Theme): string {
  const star = starPolygon(STAR_R);
  const c = CELL / 2;
  // Star points reach into the neighbouring tiles, so draw those neighbours too.
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
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${CELL}" height="${CELL}" viewBox="0 0 ${CELL} ${CELL}">` +
    `<rect width="${CELL}" height="${CELL}" fill="${t.grout}"/>` +
    `<g fill="${t.cross}" opacity="${CROSS_OPACITY}">${crosses}</g>${stars}</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

/** Light or dark text for a theme, from its grout (background) colour. */
export function inkFor(t: Theme): { ink: string; dark: boolean } {
  const n = parseInt(t.grout.slice(1), 16);
  const dark = ((n >> 16) * 299 + ((n >> 8) & 255) * 587 + (n & 255) * 114) / 1000 < 128;
  return { ink: dark ? "#f3ede0" : "#2a2620", dark };
}
