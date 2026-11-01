"use client";

import { useCallback, useEffect, useState } from "react";
import { MAX_GUESSES } from "@/lib/game";
import { track } from "@/lib/analytics";

/**
 * The rules, reachable from the header.
 *
 * Until now a first-time visitor landed on nine dark squares with "+" signs
 * and nothing telling them what to do. The content here is checked against the
 * real logic rather than written from memory — the guess budget comes from
 * MAX_GUESSES, "a wrong guess still costs one" is true because `handleGuess`
 * increments `guessesUsed` either way, and "one car per grid" is enforced by
 * `isCarAlreadyUsed`.
 */

const RULES: { title: string; body: string }[] = [
  {
    title: "Every row and column is a category",
    body: "Name a car that fits both the row and the column.",
  },
  {
    title: `You get ${MAX_GUESSES} guesses for 9 squares`,
    body: "Wrong guesses count too. Nine for nine is a perfect game.",
  },
  {
    title: "Each car can only be used once",
    body: "Cars already on the board drop out of the list.",
  },
  {
    // Deliberately does NOT promise nicknames. Only 8 of 528 cars carry an
    // alias and most are spelling variants ("Mazda3", "CX5", "VW Golf"), so
    // advertising them would send players hunting for "Vette" and finding
    // nothing.
    title: "Make and model is enough",
    body: "No year or trim. Where a nameplate has several generations, pick the one you mean.",
  },
  {
    title: "A new grid every day",
    body: "Changes at your local midnight. Past grids stay playable in the Archive.",
  },
];

export default function HowToPlay() {
  const [open, setOpen] = useState(false);

  const close = useCallback(() => setOpen(false), []);

  // Escape closes it. Bound only while open so the listener is not sitting on
  // the document for the whole game.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, close]);

  return (
    <>
      <button
        onClick={() => {
          setOpen(true);
          track("how_to_play_opened");
        }}
        className="btn-ghost px-2.5 py-1 text-xs font-semibold"
      >
        How to play
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && close()}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="how-to-play-title"
            className="panel max-h-[85dvh] w-full max-w-md overflow-y-auto p-6 shadow-2xl"
          >
            <div className="mb-1 flex items-start justify-between gap-4">
              <h2
                id="how-to-play-title"
                className="font-display text-2xl uppercase tracking-tight text-ink"
              >
                How to play
              </h2>
              <button
                onClick={close}
                autoFocus
                className="rounded-lg p-1 text-ink-faint transition-colors hover:text-ink"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="checker-rule mb-5 w-24" />

            <ol className="flex flex-col gap-4">
              {RULES.map((rule, i) => (
                <li key={rule.title} className="flex gap-3">
                  <span
                    className="font-display mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-hazard-500/50 text-xs text-hazard-400"
                    aria-hidden="true"
                  >
                    {i + 1}
                  </span>
                  <div>
                    <p className="font-semibold leading-snug text-ink">{rule.title}</p>
                    <p className="mt-0.5 text-sm leading-snug text-ink-dim">{rule.body}</p>
                  </div>
                </li>
              ))}
            </ol>

            <button onClick={close} className="btn-hazard mt-6 w-full py-2 text-sm">
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
}
