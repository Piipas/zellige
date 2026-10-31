import { OG_SIZE, ogImage } from "@/lib/og";
import { sampleCalendar } from "@/lib/sample";

export const alt = "zellige: GitHub contributions as Moroccan tilework";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return ogImage({
    heading: "Your coding year, in zellige",
    subheading: "GitHub contribution graphs as Moroccan tilework",
    weeks: sampleCalendar().weeks,
  });
}
