/**
 * Renders every theme with seeded fake data to preview-<theme>.svg.
 *
 *   npm run preview          → ./preview-*.svg (git-ignored, for eyeballing)
 *   npm run preview -- docs  → ./docs/preview-*.svg (the README images)
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { render, renderError, THEME_NAMES } from "../lib/render";
import { sampleCalendar } from "../lib/sample";

const outDir = process.argv[2] ?? ".";
mkdirSync(outDir, { recursive: true });
const { total, weeks } = sampleCalendar();

for (const theme of THEME_NAMES) {
  const file = join(outDir, `preview-${theme}.svg`);
  writeFileSync(file, render(weeks, { user: "zellige", total, theme }));
  console.log(`wrote ${file}`);
}

const errorFile = join(outDir, "preview-error.svg");
writeFileSync(errorFile, renderError("No GitHub user called @nobody", "fes"));
console.log(`wrote ${errorFile}`);
