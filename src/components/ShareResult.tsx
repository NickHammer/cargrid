"use client";

import { useCallback, useState } from "react";
import type { GameState } from "@/lib/types";
import { shareText } from "@/lib/stats";
import { track } from "@/lib/analytics";

/**
 * "Copy result" — the emoji card that makes a daily puzzle spreadable.
 *
 * Two things it deliberately does not do:
 *   - It never names a car, so a posted result cannot spoil the day's grid.
 *   - It uses no `alert()` or `confirm()`. On the (rare) clipboard failure it
 *     reveals the text in a pre-selected textarea instead, so there is always
 *     a way to get the card out by hand.
 *
 * `navigator.share` is deliberately NOT used. It exists in desktop Chrome on
 * Windows, so routing through it would make a button labelled "Copy result"
 * open an OS share sheet instead of copying — surprising, and a blocking
 * dialog on the one platform where the clipboard already works fine. If the
 * share sheet is wanted on phones later, gate it on
 * `matchMedia("(pointer: coarse)")` and change the label to match.
 */
export default function ShareResult({ state }: { state: GameState }) {
  const [status, setStatus] = useState<"idle" | "copied" | "manual">("idle");
  const text = shareText(state);

  const handleShare = useCallback(async () => {
    track("result_shared", { date: state.date });

    try {
      await navigator.clipboard.writeText(text);
      setStatus("copied");
      window.setTimeout(() => setStatus("idle"), 2200);
    } catch {
      setStatus("manual");
    }
  }, [text, state.date]);

  return (
    <div className="flex w-full flex-col items-center gap-2">
      <button onClick={handleShare} className="btn-hazard px-5 py-2 text-sm">
        {status === "copied" ? "Copied!" : "Copy result"}
      </button>

      {status === "manual" && (
        <textarea
          readOnly
          rows={7}
          value={text}
          onFocus={(e) => e.currentTarget.select()}
          autoFocus
          aria-label="Your result — select and copy"
          className="w-full max-w-xs rounded-lg border border-asphalt-600 bg-asphalt-900 p-2 text-center font-mono text-xs text-ink"
        />
      )}
    </div>
  );
}
