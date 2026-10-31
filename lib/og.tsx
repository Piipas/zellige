import { ImageResponse } from "next/og";
import { CELL, PAD, render, THEMES, TOP, type Day } from "./render";

export const OG_SIZE = { width: 1200, height: 630 };

const t = THEMES.fes;

/** Shared Open Graph card: a heading plus the static (unanimated) graph. */
export function ogImage({ heading, subheading, weeks }: { heading: string; subheading: string; weeks?: Day[][] }) {
  const graph = weeks
    ? `data:image/svg+xml;base64,${Buffer.from(render(weeks, { user: "", total: 0, animate: false, title: false })).toString("base64")}`
    : null;
  const graphWidth = 1088;
  const aspect = weeks ? (TOP + 7 * CELL + PAD) / (PAD * 2 + weeks.length * CELL) : 0;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 56,
          background: "#f7f2e7",
          color: "#2a2620",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 72, fontWeight: 700, letterSpacing: -2 }}>{heading}</div>
          <div style={{ fontSize: 32, color: t.text, marginTop: 8 }}>{subheading}</div>
        </div>
        {graph && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={graph} width={graphWidth} height={Math.round(graphWidth * aspect)} alt="" />
        )}
        <div style={{ display: "flex", fontSize: 28, color: t.levels[2], fontWeight: 600 }}>zellige</div>
      </div>
    ),
    OG_SIZE,
  );
}
