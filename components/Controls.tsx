"use client";

import { THEME_NAMES, THEMES, type ThemeName } from "@/lib/render";

interface Props {
  theme: ThemeName;
  onTheme: (theme: ThemeName) => void;
  animate: boolean;
  onAnimate: (on: boolean) => void;
  onReplay?: () => void;
}

export function Controls({ theme, onTheme, animate, onAnimate, onReplay }: Props) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div role="radiogroup" aria-label="Theme" className="flex flex-wrap gap-2">
        {THEME_NAMES.map((name) => {
          const t = THEMES[name];
          const active = name === theme;
          return (
            <button
              key={name}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onTheme(name)}
              className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm capitalize transition ${
                active
                  ? "border-ink bg-ink text-cream"
                  : "border-line bg-white/70 text-ink hover:border-muted"
              }`}
            >
              <span
                className="flex gap-0.5 rounded-sm p-0.5"
                style={{ background: t.grout }}
                aria-hidden
              >
                {t.levels.map((c) => (
                  <span key={c} className="size-2.5 rounded-[2px]" style={{ background: c }} />
                ))}
              </span>
              {name}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-4">
        {onReplay && (
          <button type="button" onClick={onReplay} className="text-sm text-muted underline-offset-4 hover:text-ink hover:underline">
            Replay
          </button>
        )}
        <button
          type="button"
          role="switch"
          aria-checked={animate}
          onClick={() => onAnimate(!animate)}
          className="flex items-center gap-2 text-sm"
        >
          <span className={`relative h-6 w-10 rounded-full transition-colors ${animate ? "bg-zellige" : "bg-line"}`}>
            <span
              className={`absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow transition-transform ${
                animate ? "translate-x-4" : ""
              }`}
            />
          </span>
          Animation
        </button>
      </div>
    </div>
  );
}
