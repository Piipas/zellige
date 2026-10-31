import { getCalendar } from "@/lib/github";
import { OG_SIZE, ogImage } from "@/lib/og";
import { normalizeUsername } from "@/lib/username";

export const alt = "GitHub contributions as Moroccan zellige tilework";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ user: string }> }) {
  const login = normalizeUsername((await params).user);
  const result = login ? await getCalendar(login) : null;

  if (result?.status !== "ok") {
    return ogImage({ heading: "zellige", subheading: "GitHub contributions as Moroccan tilework" });
  }
  return ogImage({
    heading: `@${result.login}`,
    subheading: `${result.total.toLocaleString("en-US")} contributions in the last year`,
    weeks: result.weeks,
  });
}
