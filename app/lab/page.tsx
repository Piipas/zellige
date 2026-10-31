import Link from "next/link";

export default function Lab() {
  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-16">
      <h1 className="font-display text-4xl font-semibold tracking-tight">Prototypes</h1>
      <ul className="mt-8 space-y-4 text-lg">
        <li>
          <Link href="/lab/wall" className="text-majorelle underline underline-offset-4">
            The wall is the app
          </Link>
          <span className="text-muted"> · full-screen wall, in-place re-tiling</span>
        </li>
        <li>
          <Link href="/lab/wipe" className="text-majorelle underline underline-offset-4">
            Tile-wipe transition
          </Link>
          <span className="text-muted"> · stars sweep over the screen and reveal your year</span>
        </li>
      </ul>
    </main>
  );
}
