import type { Metadata } from "next";
import { Fraunces, Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { StarMark } from "@/components/StarMark";
import { patternBackground } from "@/lib/pattern";
import { REPO_URL, siteUrl } from "@/lib/site";
import "./globals.css";

const geist = Geist({ variable: "--font-geist", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const fraunces = Fraunces({ variable: "--font-fraunces", subsets: ["latin"], axes: ["SOFT", "opsz"] });

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: "zellige · GitHub contributions as Moroccan tilework",
    template: "%s · zellige",
  },
  description:
    "Turn any GitHub contribution graph into Moroccan zellige tilework, with an animated SVG for your profile README.",
};

const pattern = patternBackground();

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geist.variable} ${geistMono.variable} ${fraunces.variable} antialiased`}>
      <body className="min-h-dvh font-sans" style={{ backgroundImage: pattern }}>
        {/* Fade the pattern out behind the content so it never competes with it. */}
        <div className="flex min-h-dvh flex-col bg-[radial-gradient(ellipse_at_top,var(--color-cream)_35%,color-mix(in_srgb,var(--color-cream)_70%,transparent)_100%)]">
          <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-5 sm:px-6">
            <Link href="/" className="flex items-center gap-2 font-display text-xl font-semibold tracking-tight">
              <StarMark className="size-6" />
              zellige
            </Link>
            <a
              href={REPO_URL}
              className="text-sm text-muted underline-offset-4 transition-colors hover:text-ink hover:underline"
            >
              Source on GitHub
            </a>
          </header>
          <div className="flex flex-1 flex-col">{children}</div>
          <footer className="mx-auto w-full max-w-5xl px-4 py-10 text-sm text-muted sm:px-6">
            Made by Ismail Baalouk · MIT licensed ·{" "}
            <a href={REPO_URL} className="underline underline-offset-4 hover:text-ink">
              contribute a theme
            </a>
            . Not affiliated with GitHub.
          </footer>
        </div>
      </body>
    </html>
  );
}
