import { Wall } from "@/components/wall/Wall";
import { sampleCalendar } from "@/lib/sample";
import { siteUrl } from "@/lib/site";

// A fixed sample year: the home page never calls GitHub.
const sample = sampleCalendar();
const demo = { login: "zellige", total: sample.total, weeks: sample.weeks };

export default function Home() {
  return <Wall data={demo} demo={demo} view={{ kind: "demo" }} initialTheme="fes" initialAnimate site={siteUrl()} />;
}
