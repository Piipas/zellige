import { sampleCalendar } from "@/lib/sample";
import { Wall } from "./Wall";

const sample = sampleCalendar();

export default function WallPrototype() {
  return <Wall initial={{ login: "zellige", total: sample.total, weeks: sample.weeks }} />;
}
