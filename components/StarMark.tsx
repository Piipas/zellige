import { octagonPolygon, pointsAttr, starPolygon } from "@/lib/render";

const STAR = pointsAttr(starPolygon(11));
const HEART = pointsAttr(octagonPolygon(3.6));

/** Logo: one khatam tile with its heart. */
export function StarMark({ className }: { className?: string }) {
  return (
    <svg viewBox="-12 -12 24 24" aria-hidden className={className}>
      <polygon points={STAR} fill="#1d4e89" />
      <polygon points={HEART} fill="#f8f4ea" />
    </svg>
  );
}
