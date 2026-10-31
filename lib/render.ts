/**
 * Zellige renderer: turns a GitHub contribution calendar into Moroccan tilework.
 *
 * This file is the single source of truth for geometry and colour. It is pure
 * (no React, no DOM, no Node APIs) so it runs in the API route, in React server
 * and client components, in the OG image, and in scripts/preview.ts.
 *
 *   layout()  → a plain data model (sizes, shapes, tiles with positions/fills)
 *   render()  → that model serialised to an SVG string (the README image)
 *
 * The website maps the same model to React elements, so both look identical.
 */

export type Level = 0 | 1 | 2 | 3 | 4;

export interface Day {
  date: string; // YYYY-MM-DD
  count: number;
  level: Level;
}

export interface Theme {
  /** Background and the lines between tiles. */
  grout: string;
  /** Star fill for days with no contributions. */
  empty: string;
  /** Star fills for levels 1–4. */
  levels: [string, string, string, string];
  /** Small cross pieces at the grid corners. */
  cross: string;
  /** Octagon "heart" inside level 3–4 stars. */
  heart: string;
  /** Title text. */
  text: string;
}

/**
 * Want to add a theme? Add an entry here — that's all it takes.
 * See CONTRIBUTING.md for tips on picking colours.
 */
export const THEMES = {
  fes: {
    grout: "#f3ede0",
    empty: "#e4dccb",
    levels: ["#8cc7b8", "#1f8a70", "#1d4e89", "#c8922a"],
    cross: "#1b3a4b",
    heart: "#f8f4ea",
    text: "#5b5245",
  },
  night: {
    grout: "#0d1117",
    empty: "#1c2430",
    levels: ["#2f6f62", "#1f9d7a", "#3a6fc4", "#e0a83a"],
    cross: "#26323f",
    heart: "#f3ede0",
    text: "#8b949e",
  },
  marrakech: {
    grout: "#f6eadf",
    empty: "#ead6c4",
    levels: ["#e9a77d", "#c8553d", "#8f2d2d", "#1f6f5c"],
    cross: "#3d2a1f",
    heart: "#fff7ee",
    text: "#6b4a3a",
  },
} satisfies Record<string, Theme>;

export type ThemeName = keyof typeof THEMES;
export const THEME_NAMES = Object.keys(THEMES) as ThemeName[];
export const DEFAULT_THEME: ThemeName = "fes";

export function isThemeName(value: unknown): value is ThemeName {
  return typeof value === "string" && Object.hasOwn(THEMES, value);
}

// ---------------------------------------------------------------------------
// Geometry
// ---------------------------------------------------------------------------

/** Distance between tile centres. */
export const CELL = 16;
/** Outer padding. */
export const PAD = 20;
/** Space above the grid for the title. */
export const TOP = 34;

/** Outer radius of the 8-point star. */
export const STAR_R = CELL * 0.64;
export const STAR_STROKE = 1.4;
export const CROSS_OPACITY = 0.55;
export const FONT_STACK =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";

export type Point = readonly [number, number];

const DEG = Math.PI / 180;

/** 8-point star (khatam): 16 vertices alternating outer/inner, starting at -90°. */
export function starPolygon(R: number): Point[] {
  const r = (R * Math.cos(45 * DEG)) / Math.cos(22.5 * DEG);
  return Array.from({ length: 16 }, (_, i) => {
    const radius = i % 2 === 0 ? R : r;
    const a = (-90 + i * 22.5) * DEG;
    return [radius * Math.cos(a), radius * Math.sin(a)] as const;
  });
}

/** 12-point plus shape with half-size `s` and arm half-width `0.32 * s`. */
export function crossPolygon(s: number): Point[] {
  const a = 0.32 * s;
  return [
    [-a, -s], [a, -s], [a, -a], [s, -a], [s, a], [a, a],
    [a, s], [-a, s], [-a, a], [-s, a], [-s, -a], [-a, -a],
  ];
}

/** Regular octagon of radius `r`, rotated by `rotationDeg`. */
export function octagonPolygon(r: number, rotationDeg = 22.5): Point[] {
  return Array.from({ length: 8 }, (_, i) => {
    const a = (rotationDeg + i * 45) * DEG;
    return [r * Math.cos(a), r * Math.sin(a)] as const;
  });
}

function num(n: number): string {
  // Two decimals is plenty at this scale and keeps the SVG small.
  return String(Math.round(n * 100) / 100);
}

/** Polygon points as an SVG `points` attribute value. */
export function pointsAttr(points: readonly Point[], dx = 0, dy = 0): string {
  return points.map(([x, y]) => `${num(x + dx)},${num(y + dy)}`).join(" ");
}

// ---------------------------------------------------------------------------
// Layout model
// ---------------------------------------------------------------------------

export interface Tile {
  day: Day;
  /** Column (week index). */
  w: number;
  /** Row (UTC weekday, Sunday = 0). */
  d: number;
  cx: number;
  cy: number;
  fill: string;
  /** Level 3–4 days get an octagon heart. */
  heart: boolean;
  /** Plain-text tooltip, e.g. "12 contributions on 2026-03-04". */
  label: string;
}

/**
 * Neighbouring stars overlap at their points, so whatever is drawn last wins.
 * Empty days go in a first pass and active days in a second, so every active
 * star stays whole. Both passes are grouped by week for the entrance animation.
 */
export interface TileGroup {
  w: number;
  layer: "empty" | "active";
  tiles: Tile[];
}

export interface Layout {
  width: number;
  height: number;
  theme: Theme;
  title: string;
  /** Shapes centred on the origin, as `points` attribute values. */
  shapes: { star: string; cross: string; heart: string };
  /** Grid-corner positions for the cross pieces. */
  crosses: Point[];
  /** Tiles grouped by week (column), in calendar order. */
  weeks: Tile[][];
  /** The same tiles in drawing order. */
  groups: TileGroup[];
}

export interface LayoutOptions {
  user: string;
  total: number;
  theme?: ThemeName;
}

export interface RenderOptions extends LayoutOptions {
  animate?: boolean;
  /** Draw the title line. Off for the OG image, which sets its own text. */
  title?: boolean;
}

/** UTC weekday for a YYYY-MM-DD date (Sunday = 0). */
export function weekday(date: string): number {
  return new Date(`${date}T00:00:00Z`).getUTCDay();
}

export function tileFill(theme: Theme, level: Level): string {
  return level === 0 ? theme.empty : theme.levels[level - 1];
}

export function tileLabel(day: Day): string {
  const noun = day.count === 1 ? "contribution" : "contributions";
  return `${day.count} ${noun} on ${day.date}`;
}

export function titleText(user: string, total: number): string {
  return `${total.toLocaleString("en-US")} contributions · @${user}`;
}

export function layout(weeks: Day[][], opts: LayoutOptions): Layout {
  const theme = THEMES[opts.theme ?? DEFAULT_THEME];
  const cols = weeks.length;

  const crosses: Point[] = [];
  for (let w = 0; w <= cols; w++) {
    for (let d = 0; d <= 7; d++) crosses.push([PAD + w * CELL, TOP + d * CELL]);
  }

  const tiles = weeks.map((days, w) =>
    days.map((day): Tile => {
      const d = weekday(day.date);
      return {
        day,
        w,
        d,
        cx: PAD + w * CELL + CELL / 2,
        cy: TOP + d * CELL + CELL / 2,
        fill: tileFill(theme, day.level),
        heart: day.level >= 3,
        label: tileLabel(day),
      };
    }),
  );

  const groups: TileGroup[] = [];
  for (const layer of ["empty", "active"] as const) {
    tiles.forEach((week, w) => {
      const picked = week.filter((t) => (t.day.level === 0) === (layer === "empty"));
      if (picked.length) groups.push({ w, layer, tiles: picked });
    });
  }

  return {
    width: PAD * 2 + cols * CELL,
    height: TOP + 7 * CELL + PAD,
    theme,
    title: titleText(opts.user, opts.total),
    shapes: {
      star: pointsAttr(starPolygon(STAR_R)),
      cross: pointsAttr(crossPolygon(CELL * 0.2)),
      heart: pointsAttr(octagonPolygon(STAR_R * 0.32, 22.5)),
    },
    crosses,
    weeks: tiles,
    groups,
  };
}

// ---------------------------------------------------------------------------
// SVG serialisation
// ---------------------------------------------------------------------------

export function escapeXml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

/** Animation timings, shared with the website so both feel the same. */
export const WEEK_DELAY_MS = 25;
export const ENTRANCE_MS = 500;
export const PULSE_MS = 3200;

const ANIMATION_CSS = `
.zg-w{animation:zg-in ${ENTRANCE_MS}ms ease-out both;transform-box:fill-box;transform-origin:center}
.zg-p{animation:zg-pulse ${PULSE_MS}ms ease-in-out infinite}
@keyframes zg-in{from{opacity:0;transform:scale(.4)}to{opacity:1;transform:scale(1)}}
@keyframes zg-pulse{0%,100%{opacity:1}50%{opacity:.55}}
@media (prefers-reduced-motion:reduce){.zg-w,.zg-p{animation:none}}`;

export function render(weeks: Day[][], opts: RenderOptions): string {
  const m = layout(weeks, opts);
  const { theme: t } = m;
  const animate = opts.animate ?? true;
  const out: string[] = [];

  out.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${m.width}" height="${m.height}" viewBox="0 0 ${m.width} ${m.height}" role="img" aria-label="${escapeXml(m.title)}">`,
    `<title>${escapeXml(m.title)}</title>`,
  );
  if (animate) out.push(`<style>${ANIMATION_CSS}</style>`);
  out.push(
    `<defs>`,
    `<polygon id="zg-c" points="${m.shapes.cross}"/>`,
    `<polygon id="zg-s" points="${m.shapes.star}" stroke="${t.grout}" stroke-width="${STAR_STROKE}" stroke-linejoin="round"/>`,
    `<polygon id="zg-h" points="${m.shapes.heart}" fill="${t.heart}"/>`,
    `</defs>`,
    `<rect width="${m.width}" height="${m.height}" rx="10" fill="${t.grout}"/>`,
  );
  if (opts.title ?? true) {
    out.push(
      `<text x="${PAD}" y="22" fill="${t.text}" font-family="${FONT_STACK}" font-size="12" font-weight="600">${escapeXml(m.title)}</text>`,
    );
  }

  // 1. Cross pieces at every grid corner.
  out.push(`<g fill="${t.cross}" opacity="${CROSS_OPACITY}">`);
  for (const [x, y] of m.crosses) out.push(`<use href="#zg-c" x="${x}" y="${y}"/>`);
  out.push(`</g>`);

  // 2–3. Stars, then hearts, per week group (see TileGroup for the layering).
  for (const { w, tiles } of m.groups) {
    out.push(
      animate
        ? `<g class="zg-w" style="animation-delay:${w * WEEK_DELAY_MS}ms">`
        : `<g>`,
    );
    for (const tile of tiles) {
      out.push(
        `<use href="#zg-s" x="${tile.cx}" y="${tile.cy}" fill="${tile.fill}"><title>${escapeXml(tile.label)}</title></use>`,
      );
    }
    for (const tile of tiles) {
      if (!tile.heart) continue;
      const pulse = animate && tile.day.level === 4 ? ` class="zg-p"` : "";
      out.push(`<use href="#zg-h" x="${tile.cx}" y="${tile.cy}"${pulse}/>`);
    }
    out.push(`</g>`);
  }

  out.push(`</svg>`);
  return out.join("");
}

/** Small error card in the same style, for the API's failure cases. */
export function renderError(message: string, themeName: ThemeName = DEFAULT_THEME): string {
  const t = THEMES[themeName];
  const width = 420;
  const height = 96;
  const star = pointsAttr(starPolygon(STAR_R));
  const stars = t.levels
    .map((fill, i) => {
      const cx = PAD + CELL / 2 + i * CELL;
      return `<polygon points="${star}" transform="translate(${cx} 56)" fill="${fill}" stroke="${t.grout}" stroke-width="${STAR_STROKE}" stroke-linejoin="round"/>`;
    })
    .join("");
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeXml(message)}">`,
    `<rect width="${width}" height="${height}" rx="10" fill="${t.grout}"/>`,
    `<text x="${PAD}" y="26" fill="${t.text}" font-family="${FONT_STACK}" font-size="12" font-weight="600">zellige</text>`,
    stars,
    `<text x="${PAD + CELL * 5}" y="60" fill="${t.text}" font-family="${FONT_STACK}" font-size="13">${escapeXml(message)}</text>`,
    `</svg>`,
  ].join("");
}
