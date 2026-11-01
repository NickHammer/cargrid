import type { GameState } from "./types";
import { PREFIX } from "./storage";
import { isGameOver, solvedCount } from "./game";
import { localDateString } from "./date";

/**
 * All-time stats and the shareable result card.
 *
 * Nothing new is written to storage for this. Every finished board is already
 * saved under `cargrid-state-<date>`, so the stats are *derived* by scanning
 * those keys — which means they are correct for games played before this code
 * existed, and there is no second copy of the truth to drift out of sync.
 */

export interface Stats {
  /** Boards taken to a conclusion — all nine solved, or nine guesses spent. */
  played: number;
  perfect: number;
  /** Solved cells as a share of cells attempted across all finished boards. */
  solveRate: number;
  currentStreak: number;
  bestStreak: number;
}

const EMPTY: Stats = { played: 0, perfect: 0, solveRate: 0, currentStreak: 0, bestStreak: 0 };

/** Every finished board in storage, keyed by its date. */
function finishedDates(): string[] {
  const dates: string[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key?.startsWith(PREFIX)) continue;
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const state = JSON.parse(raw) as GameState;
      if (state?.cells?.length === 9 && isGameOver(state)) dates.push(state.date);
    }
  } catch {
    // Storage unavailable, or one corrupt entry — a partial list is still
    // better than no stats, and this must never break the board.
  }
  return dates.sort();
}

/** Days between two "YYYY-MM-DD" strings, parsed as local calendar dates. */
function dayGap(earlier: string, later: string): number {
  const [y1, m1, d1] = earlier.split("-").map(Number);
  const [y2, m2, d2] = later.split("-").map(Number);
  const a = Date.UTC(y1, m1 - 1, d1);
  const b = Date.UTC(y2, m2 - 1, d2);
  return Math.round((b - a) / 86_400_000);
}

export function loadStats(): Stats {
  const dates = finishedDates();
  if (dates.length === 0) return EMPTY;

  let perfect = 0;
  let solved = 0;
  let attempted = 0;

  for (const date of dates) {
    try {
      const raw = localStorage.getItem(`${PREFIX}${date}`);
      if (!raw) continue;
      const state = JSON.parse(raw) as GameState;
      const n = solvedCount(state);
      if (n === 9) perfect++;
      solved += n;
      attempted += Math.max(state.guessesUsed, n);
    } catch {
      // skip
    }
  }

  // Streaks run over consecutive calendar days. A gap of one day is the
  // streak continuing; anything larger breaks it.
  let best = 1;
  let run = 1;
  for (let i = 1; i < dates.length; i++) {
    run = dayGap(dates[i - 1], dates[i]) === 1 ? run + 1 : 1;
    if (run > best) best = run;
  }

  // The current streak only counts if it reaches today or yesterday —
  // yesterday included, because today's grid may simply not be played yet.
  const today = localDateString();
  const lastGap = dayGap(dates[dates.length - 1], today);
  const currentStreak = lastGap <= 1 ? run : 0;

  return {
    played: dates.length,
    perfect,
    solveRate: attempted > 0 ? Math.round((solved / attempted) * 100) : 0,
    currentStreak,
    bestStreak: best,
  };
}

/**
 * The result card, as plain text for the clipboard.
 *
 * Deliberately spoiler-free: a solved cell is a green square and an unsolved
 * one is a dark square, so the shape of the board travels but no car name
 * does. Posting a result cannot hand today's answers to anyone.
 */
export function shareText(state: GameState, url = "cargrid.fun"): string {
  const solved = solvedCount(state);
  const rows: string[] = [];
  for (let r = 0; r < 3; r++) {
    rows.push(
      state.cells
        .slice(r * 3, r * 3 + 3)
        .map((c) => (c.solved ? "🟩" : "⬛"))
        .join(""),
    );
  }

  // Two fractions side by side ("7/9 · 9/9 guesses") read as a contradiction,
  // so the guess count is plain.
  const score = solved === 9 ? "9/9 — perfect" : `${solved}/9`;
  const guesses = `${state.guessesUsed} guess${state.guessesUsed === 1 ? "" : "es"}`;

  return [`CarGrid ${state.date}`, `${score} · ${guesses}`, "", ...rows, "", url].join("\n");
}
