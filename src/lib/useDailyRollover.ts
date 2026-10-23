"use client";

import { useEffect, useRef } from "react";
import { localDateString, msUntilNextLocalDay } from "./date";

/**
 * Calls `onNewDay(nextDate)` when the player's local calendar date moves past
 * `currentDate` — for a tab that was left open across midnight.
 *
 * Two triggers, because neither is sufficient alone:
 *
 *  - a timer aimed at the next local midnight, which covers a tab left open and
 *    awake;
 *  - a visibility/focus check, which covers the far more common case of a
 *    laptop sleeping overnight. Browsers throttle or suspend background timers,
 *    so the timer may fire late or not at all; re-checking the clock whenever
 *    the tab is looked at again catches it.
 *
 * Pass `enabled: false` on the archive routes, which are pinned to a date and
 * must never roll over.
 */
export function useDailyRollover(
  currentDate: string,
  onNewDay: (nextDate: string) => void,
  enabled = true
): void {
  // Held in a ref so a re-render with a fresh callback does not tear down and
  // rebuild the timer.
  const callbackRef = useRef(onNewDay);
  useEffect(() => {
    callbackRef.current = onNewDay;
  }, [onNewDay]);

  useEffect(() => {
    if (!enabled) return;

    let timer: ReturnType<typeof setTimeout> | undefined;

    const check = () => {
      const today = localDateString();
      if (today !== currentDate) callbackRef.current(today);
    };

    const schedule = () => {
      clearTimeout(timer);
      // A second past midnight, so the timer can never land a hair early and
      // read the old date.
      timer = setTimeout(() => {
        check();
        schedule();
      }, msUntilNextLocalDay() + 1000);
    };

    const recheck = () => {
      if (document.visibilityState === "visible") {
        check();
        schedule();
      }
    };

    schedule();
    document.addEventListener("visibilitychange", recheck);
    window.addEventListener("focus", recheck);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", recheck);
      window.removeEventListener("focus", recheck);
    };
  }, [currentDate, enabled]);
}
