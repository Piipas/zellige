import { crossPolygon, pointsAttr, starPolygon } from "./render";

/**
 * Page background: the graph's own star-and-cross geometry as a repeating
 * tile, outlined at very low opacity. Returned as a CSS `url()` value.
 */
export function patternBackground(size = 44, ink = "#1b3a4b", accent = "#c8922a"): string {
  const c = size / 2;
  const star = starPolygon(size * 0.64);
  const cross = crossPolygon(size * 0.2);

  // Star points reach past the tile edge, so neighbours on each axis are drawn
  // too and the pattern tiles seamlessly.
  const stars = [
    [c, c],
    [c - size, c],
    [c + size, c],
    [c, c - size],
    [c, c + size],
  ]
    .map(([x, y]) => `<polygon points="${pointsAttr(star, x, y)}"/>`)
    .join("");
  const crosses = [
    [0, 0],
    [size, 0],
    [0, size],
    [size, size],
  ]
    .map(([x, y]) => `<polygon points="${pointsAttr(cross, x, y)}"/>`)
    .join("");

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">` +
    `<g fill="none" stroke="${ink}" stroke-opacity=".07" stroke-width="1">${stars}</g>` +
    `<g fill="${accent}" fill-opacity=".12">${crosses}</g>` +
    `</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}
