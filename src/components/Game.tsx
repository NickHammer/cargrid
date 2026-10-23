"use client";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
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
import { localDateString, formatDisplayDate } from "@/lib/date";
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
      if (inProgress) setPendingDate(next);
      else switchToDate(next);
    },
    [state, switchToDate]
  );

  // Archive routes are pinned to their date and must not roll over.
  useDailyRollover(date, handleNewDay, !dateProp);

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
    },
    [grid, state, selectedCell]
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
    <div className="flex min-h-[100dvh] flex-col bg-gray-950 px-3 py-3 sm:px-4">
      {/* Compact top bar — wordmark + date left, stats right, so the grid gets
          the vertical space instead of a stacked header. */}
      <header className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-x-6 gap-y-2 pb-3">
        <div className="flex items-baseline gap-3">
          <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
            Car<span className="text-amber-400">Grid</span>
          </h1>
          <span className="text-xs text-gray-500 sm:text-sm">
            {formatDisplayDate(date)}
            {isArchive && " · Archive"}
          </span>
        </div>

        <div className="flex items-center gap-4 text-sm">
          <Stat label="Solved" value={`${solved}/9`} />
          <Stat
            label="Left"
            value={String(guessesLeft)}
            tone={guessesLeft <= 2 ? "text-red-400" : "text-white"}
          />
          <Stat label="Guesses" value={String(state.guessesUsed)} />
          <nav className="ml-1 hidden items-center gap-3 text-xs text-gray-500 sm:flex">
            {!isArchive && (
              <Link href="/archive" className="hover:text-amber-400">
                Archive
              </Link>
            )}
            <Link href="/credits" className="hover:text-amber-400">
              Credits
            </Link>
          </nav>
        </div>
      </header>

      {/* Grid */}
      <main className="flex flex-1 flex-col items-center justify-center">
        {pendingDate && (
          <div className="mb-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-center text-sm">
            <span className="text-amber-200">
              A new grid is ready for {formatDisplayDate(pendingDate)}.
            </span>
            <button
              onClick={() => switchToDate(pendingDate)}
              className="rounded-lg bg-amber-500 px-3 py-1 text-xs font-bold text-gray-950 hover:bg-amber-400"
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
          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 rounded-xl border border-gray-800 bg-gray-900 px-5 py-3 text-center">
            <p className="text-base font-bold text-white">
              {solved === 9 ? "Perfect!" : `${solved}/9 solved`}
            </p>
            <p className="text-sm text-gray-400">
              {state.guessesUsed} guess{state.guessesUsed !== 1 ? "es" : ""}
              {state.guessesUsed > 0 && <> · {accuracyPercent(state)}% accuracy</>}
            </p>
            <p className="text-xs text-gray-500">
              {isArchive ? (
                <Link href="/" className="text-amber-400 hover:text-amber-300">
                  Play today&apos;s grid
                </Link>
              ) : (
                "New grid tomorrow"
              )}
            </p>
          </div>
        )}
      </main>

      {/* Links repeat at the bottom on mobile, where the header has no room */}
      <nav className="mt-3 flex justify-center gap-4 text-xs text-gray-600 sm:hidden">
        {!isArchive && (
          <Link href="/archive" className="hover:text-amber-400">
            Archive
          </Link>
        )}
        <Link href="/credits" className="hover:text-amber-400">
          Image credits
        </Link>
      </nav>

      {/* Guess modal */}
      {selectedCell && !gameOver && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && handleCloseModal()}
        >
          <div className="w-full max-w-md rounded-2xl border border-gray-700 bg-gray-900 p-6 shadow-2xl">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-widest text-gray-500">
                  Find a car that is…
                </p>
                <p className="mt-1 text-lg font-bold text-white">
                  <span className="text-amber-400">{activeRow?.label}</span>
                  {" × "}
                  <span className="text-amber-400">{activeCol?.label}</span>
                </p>
              </div>
              <button
                onClick={handleCloseModal}
                className="ml-4 rounded-lg p-1 text-gray-500 hover:text-white"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {lastResult === "incorrect" && (
              <div className="mb-3 rounded-lg bg-red-900/40 px-3 py-2 text-sm text-red-400">
                Not quite — try another car.
              </div>
            )}

            <GuessInput onSelect={handleGuess} usedCarIds={usedCarIds} />

            <p className="mt-4 text-center text-xs text-gray-500">
              {guessesLeft} guess{guessesLeft !== 1 ? "es" : ""} remaining
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, tone = "text-white" }: { label: string; value: string; tone?: string }) {
  return (
    <div className="text-center leading-tight">
      <div className={`text-sm font-bold sm:text-base ${tone}`}>{value}</div>
      <div className="text-[10px] uppercase tracking-wide text-gray-500">{label}</div>
    </div>
  );
}
