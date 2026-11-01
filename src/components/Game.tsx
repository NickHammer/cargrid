"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import SiteFooter from "@/components/SiteFooter";
import ShareResult from "@/components/ShareResult";
import HowToPlay from "@/components/HowToPlay";
import Grid from "./Grid";
import GuessInput from "./GuessInput";
import type { Car, GameState } from "@/lib/types";
import {
  isValidAnswer,
  isGameOver,
  isCarAlreadyUsed,
  solvedCount,
  accuracyPercent,
  MAX_GUESSES,
} from "@/lib/game";
import { allCars } from "@/lib/cars";
import { getGridForDate } from "@/lib/grids";
import { loadGameState, saveGameState } from "@/lib/storage";
import { loadStats } from "@/lib/stats";
import { localDateString, formatDisplayDate } from "@/lib/date";
import { track } from "@/lib/analytics";
import { useDailyRollover } from "@/lib/useDailyRollover";

interface Props {
  /** Omitted for today's puzzle; set by the archive routes. */
  date?: string;
  /** Archive plays get a way back to today. */
  isArchive?: boolean;
}

export default function Game({ date: dateProp, isArchive = false }: Props) {
  // This component is loaded with ssr:false, so localStorage and the local
  // clock are both available on first render — no mount effect needed.
  const [date, setDate] = useState(() => dateProp ?? localDateString());
  const [pendingDate, setPendingDate] = useState<string | null>(null);
  const isFuture = date > localDateString();
  const grid = useMemo(() => (isFuture ? null : getGridForDate(date)), [date, isFuture]);

  const [state, setState] = useState<GameState | null>(() =>
    grid ? loadGameState(date, grid.id) : null
  );
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null);
  const [lastResult, setLastResult] = useState<"correct" | "incorrect" | null>(null);

  const usedCarIds = useMemo(
    () => new Set((state?.cells ?? []).map((c) => c.carId).filter((id): id is string => !!id)),
    [state]
  );

  const gameOver = !!state && isGameOver(state);

  // One example answer per cell, shown for unsolved cells after the game ends
  // so a 6/9 tells you what you missed.
  const reveals = useMemo(() => {
    if (!grid || !gameOver) return undefined;
    const taken = new Set(usedCarIds);
    return grid.rows.flatMap((row) =>
      grid.columns.map((colParam) => {
        const hit = allCars.find(
          (car) => !taken.has(car.id) && isValidAnswer(car, row, colParam)
        );
        if (hit) taken.add(hit.id);
        return hit ? `${hit.make} ${hit.model}` : null;
      })
    );
  }, [grid, gameOver, usedCarIds]);

  /** Move the board to another date, loading whatever is saved for it. */
  const switchToDate = useCallback((next: string) => {
    const nextGrid = getGridForDate(next);
    setDate(next);
    setState(nextGrid ? loadGameState(next, nextGrid.id) : null);
    setSelectedCell(null);
    setLastResult(null);
    setPendingDate(null);
  }, []);

  // At local midnight: swap straight to the new grid if this one is finished or
  // untouched, but never yank the board away from a game in progress — show a
  // banner and let the player decide.
  const handleNewDay = useCallback(
    (next: string) => {
      const inProgress = !!state && state.guessesUsed > 0 && !isGameOver(state);
      if (inProgress) {
        setPendingDate(next);
        track("rollover_prompted", { from: date, to: next });
      } else {
        switchToDate(next);
      }
    },
    [state, switchToDate, date]
  );

  // Archive routes are pinned to their date and must not roll over.
  useDailyRollover(date, handleNewDay, !dateProp);

  // One per board so completion rate has a denominator. Keyed on the date so a
  // midnight rollover counts as opening a new grid, not a re-render.
  const opened = useRef<string | null>(null);
  useEffect(() => {
    if (!grid || opened.current === date) return;
    opened.current = date;
    track(isArchive ? "archive_opened" : "grid_opened", {
      date,
      resumed: (state?.guessesUsed ?? 0) > 0,
    });
  }, [date, grid, isArchive, state]);

  // All-time stats, derived from the finished boards already in localStorage.
  // Only read once the board is over, because that is the only place they are
  // shown — and reading on every render would scan storage nine times a game.
  // `date` is in the deps on purpose, though loadStats() does not read it:
  // finishing one archive board and then opening another already-finished one
  // leaves `gameOver` true the whole time, and without `date` the panel would
  // still be showing the stats from before the first board was counted.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const stats = useMemo(() => (gameOver ? loadStats() : null), [gameOver, date]);

  const handleCellClick = useCallback((row: number, col: number) => {
    setSelectedCell({ row, col });
    setLastResult(null);
  }, []);

  const handleGuess = useCallback(
    (car: Car) => {
      if (!grid || !state || !selectedCell) return;
      // The autocomplete already hides used cars; this guards the state update
      // itself so a car can never occupy two cells.
      if (isCarAlreadyUsed(state, car.id)) return;

      const { row, col } = selectedCell;
      const correct = isValidAnswer(car, grid.rows[row], grid.columns[col]);

      const newState: GameState = {
        ...state,
        cells: state.cells.map((cell, i) =>
          i === row * 3 + col && correct ? { solved: true, carId: car.id } : cell
        ),
        guessesUsed: state.guessesUsed + 1,
      };

      setState(newState);
      saveGameState(newState);
      setLastResult(correct ? "correct" : "incorrect");
      if (correct) setSelectedCell(null);

      // Which cells people get right, and what they guess when wrong, is what
      // tells us whether a grid was fair. Cell is reported as a position, not
      // the answer, so the beacon never carries the solution.
      track(correct ? "guess_correct" : "guess_incorrect", {
        date,
        cell: `${row}-${col}`,
        row_label: grid.rows[row].label,
        col_label: grid.columns[col].label,
        guess_number: newState.guessesUsed,
        is_archive: isArchive,
      });

      if (isGameOver(newState)) {
        const solved = solvedCount(newState);
        track("grid_completed", {
          date,
          solved,
          guesses_used: newState.guessesUsed,
          perfect: solved === 9,
          is_archive: isArchive,
        });
      }
    },
    [grid, state, selectedCell, date, isArchive]
  );

  const handleCloseModal = useCallback(() => {
    setSelectedCell(null);
    setLastResult(null);
  }, []);

  if (!grid || !state) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-gray-950 px-4 text-center">
        <p className="text-lg font-semibold text-white">
          {isFuture ? "That grid has not opened yet" : `No grid scheduled for ${date}`}
        </p>
        <p className="max-w-sm text-sm text-gray-400">
          {isFuture
            ? "Come back when the day arrives."
            : "The puzzle schedule does not cover this date."}
        </p>
        <Link href="/" className="text-sm font-medium text-amber-400 hover:text-amber-300">
          Play today&apos;s grid
        </Link>
      </div>
    );
  }

  const solved = solvedCount(state);
  const guessesLeft = MAX_GUESSES - state.guessesUsed;
  const activeRow = selectedCell ? grid.rows[selectedCell.row] : null;
  const activeCol = selectedCell ? grid.columns[selectedCell.col] : null;

  return (
    <div className="flex min-h-[100dvh] flex-col px-3 py-3 sm:px-4">
      {/* Compact top bar — wordmark + date left, stats right, so the grid gets
          the vertical space instead of a stacked header. */}
      <header className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-x-6 gap-y-2 pb-3">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="font-display text-2xl uppercase leading-none tracking-tight text-ink sm:text-3xl">
              Car
              <span className="bg-gradient-to-br from-hazard-400 to-hazard-600 bg-clip-text text-transparent">
                Grid
              </span>
            </h1>
            {/* Stoplight: red, amber, then green — which holds. */}
            <div className="mt-1.5 flex items-center gap-1.5" aria-hidden="true">
              <span className="lamp lamp-stop" />
              <span className="lamp lamp-wait" />
              <span className="lamp lamp-go" />
            </div>
          </div>
          <span className="self-end pb-0.5 text-xs font-medium text-ink-dim sm:text-sm">
            {formatDisplayDate(date)}
            {isArchive && " · Archive"}
          </span>
        </div>

        <div className="flex items-center gap-4 text-sm">
          <HowToPlay />
          <Stat label="Solved" value={`${solved}/9`} />
          <Stat
            label="Left"
            value={String(guessesLeft)}
            tone={guessesLeft <= 2 ? "text-stop-400" : "text-ink"}
          />
          <Stat label="Guesses" value={String(state.guessesUsed)} />
        </div>
      </header>

      {/* Grid */}
      <main className="flex flex-1 flex-col items-center justify-center">
        {pendingDate && (
          <div className="mb-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 rounded-xl border border-hazard-500/40 bg-hazard-500/10 px-4 py-2 text-center text-sm">
            <span className="text-hazard-400">
              A new grid is ready for {formatDisplayDate(pendingDate)}.
            </span>
            <button
              onClick={() => switchToDate(pendingDate)}
              className="btn-hazard px-3 py-1 text-xs"
            >
              Play it
            </button>
          </div>
        )}

        <Grid
          layout={grid}
          cells={state.cells}
          selectedCell={selectedCell}
          gameOver={gameOver}
          onCellClick={handleCellClick}
          reveals={reveals}
        />

        {/* Game over banner */}
        {gameOver && (
          <div className="panel mt-4 flex w-full max-w-sm flex-col items-center gap-3 px-5 py-4 text-center">
            <div>
              <p className="font-display text-xl uppercase">
                {solved === 9 ? (
                  // Flare is used nowhere else — it should mean one thing only.
                  <span className="bg-gradient-to-r from-flare-400 via-hazard-400 to-volt-400 bg-clip-text text-transparent">
                    Perfect!
                  </span>
                ) : (
                  <span className="text-ink">{solved}/9 solved</span>
                )}
              </p>
              <p className="mt-0.5 text-sm text-ink-dim">
                {state.guessesUsed} guess{state.guessesUsed !== 1 ? "es" : ""}
                {state.guessesUsed > 0 && <> · {accuracyPercent(state)}% accuracy</>}
              </p>
            </div>

            <ShareResult state={state} />

            {stats && stats.played > 0 && (
              <>
                <div className="checker-rule w-full" />
                <div className="flex w-full items-start justify-between gap-2">
                  <Stat label="Played" value={String(stats.played)} />
                  <Stat label="Solve rate" value={`${stats.solveRate}%`} />
                  <Stat
                    label="Streak"
                    value={String(stats.currentStreak)}
                    tone={stats.currentStreak > 0 ? "text-go-400" : "text-ink"}
                  />
                  <Stat label="Best" value={String(stats.bestStreak)} />
                  <Stat
                    label="Perfect"
                    value={String(stats.perfect)}
                    tone={stats.perfect > 0 ? "text-flare-400" : "text-ink"}
                  />
                </div>
              </>
            )}

            <p className="text-xs text-ink-faint">
              {isArchive ? (
                <Link href="/" className="text-hazard-400 hover:text-hazard-500">
                  Play today&apos;s grid
                </Link>
              ) : (
                "New grid tomorrow"
              )}
            </p>
          </div>
        )}
      </main>

      <SiteFooter current={isArchive ? "archive" : "today"} />

      {/* Guess modal */}
      {selectedCell && !gameOver && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && handleCloseModal()}
        >
          <div className="panel w-full max-w-md p-6 shadow-2xl">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-widest text-ink-faint">
                  Find a car that is…
                </p>
                <p className="font-display mt-1 text-lg text-ink">
                  <span className="text-hazard-400">{activeRow?.label}</span>
                  {" × "}
                  <span className="text-hazard-400">{activeCol?.label}</span>
                </p>
              </div>
              <button
                onClick={handleCloseModal}
                className="ml-4 rounded-lg p-1 text-ink-faint transition-colors hover:text-ink"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {lastResult === "incorrect" && (
              <div className="mb-3 rounded-lg border border-stop-400/30 bg-stop-400/10 px-3 py-2 text-sm text-stop-400">
                Not quite — try another car.
              </div>
            )}

            <GuessInput onSelect={handleGuess} usedCarIds={usedCarIds} />

            <p className="mt-4 text-center text-xs text-ink-faint">
              {guessesLeft} guess{guessesLeft !== 1 ? "es" : ""} remaining
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, tone = "text-ink" }: { label: string; value: string; tone?: string }) {
  return (
    <div className="text-center leading-tight">
      <div className={`text-sm font-bold sm:text-base ${tone}`}>{value}</div>
      <div className="text-[10px] uppercase tracking-wide text-ink-faint">{label}</div>
    </div>
  );
}
