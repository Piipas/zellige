"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { normalizeUsername } from "@/lib/username";

export function UsernameForm({ defaultValue = "", autoFocus = false }: { defaultValue?: string; autoFocus?: boolean }) {
  const router = useRouter();
  const [value, setValue] = useState(defaultValue);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const login = normalizeUsername(value);
    if (!login) {
      setError(value.trim() ? "That isn't a valid GitHub username." : "Enter a GitHub username.");
      return;
    }
    setError(null);
    startTransition(() => router.push(`/${login}`));
  }

  return (
    <form onSubmit={submit} className="w-full max-w-md" noValidate>
      <div className="flex flex-col gap-2 sm:flex-row">
        <label className="flex flex-1 items-center rounded-lg border border-line bg-white/80 shadow-sm transition focus-within:border-majorelle focus-within:ring-2 focus-within:ring-majorelle/20">
          <span className="pl-3 text-muted" aria-hidden>
            @
          </span>
          <span className="sr-only">GitHub username</span>
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="github username"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            autoFocus={autoFocus}
            aria-invalid={!!error}
            aria-describedby={error ? "username-error" : undefined}
            className="w-full bg-transparent px-1.5 py-2.5 outline-none placeholder:text-muted/60"
          />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-majorelle px-5 py-2.5 font-medium text-cream shadow-sm transition hover:bg-[#173f70] disabled:opacity-70"
        >
          {pending ? "Laying tiles…" : "Tile my year"}
        </button>
      </div>
      {error && (
        <p id="username-error" className="mt-2 text-sm text-terracotta">
          {error}
        </p>
      )}
    </form>
  );
}
