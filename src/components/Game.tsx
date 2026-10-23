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
import { getGridForDate } from "@/lib/grids";
import { loadGameState, saveGameState } from "@/lib/storage";
import { localDateString, formatDisplayDate } from "@/lib/date";

interface Props {
  /** Omitted for today's puzzle; set by the archive routes. */
  date?: string;
  /** Archive plays get a way back to today. */
  isArchive?: boolean;
}

export default function Game({ date: dateProp, isArchive = false }: Props) {
  // This component is loaded with ssr:false, so localStorage and the local
  // clock are both available on first render — no mount effect needed.
  const [date] = useState(() => dateProp ?? localDateString());
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

  const gameOver = isGameOver(state);
  const solved = solvedCount(state);
  const guessesLeft = MAX_GUESSES - state.guessesUsed;
  const activeRow = selectedCell ? grid.rows[selectedCell.row] : null;
  const activeCol = selectedCell ? grid.columns[selectedCell.col] : null;

  return (
    <div className="flex min-h-screen flex-col items-center bg-gray-950 px-4 py-8">
      {/* Header */}
      <div className="mb-6 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-white">
          Car<span className="text-amber-400">Grid</span>
        </h1>
        <p className="mt-1 text-sm text-gray-400">{formatDisplayDate(date)}</p>
        {isArchive && (
          <p className="mt-1 text-xs font-medium uppercase tracking-widest text-gray-600">
            Archive
          </p>
        )}
      </div>

      {/* Stats bar */}
      <div className="mb-4 flex gap-6 text-center text-sm">
        <div>
          <div className="font-bold text-white">{solved}/9</div>
          <div className="text-gray-500">Solved</div>
        </div>
        <div>
          <div className={`font-bold ${guessesLeft <= 2 ? "text-red-400" : "text-white"}`}>
            {guessesLeft}
          </div>
          <div className="text-gray-500">Remaining</div>
        </div>
        <div>
          <div className="font-bold text-white">{state.guessesUsed}</div>
          <div className="text-gray-500">Guesses</div>
        </div>
      </div>

      {/* Grid */}
      <div className="w-full max-w-lg">
        <Grid
          layout={grid}
          cells={state.cells}
          selectedCell={selectedCell}
          gameOver={gameOver}
          onCellClick={handleCellClick}
        />
      </div>

      {/* Game over banner */}
      {gameOver && (
        <div className="mt-6 rounded-xl border border-gray-700 bg-gray-800 px-6 py-4 text-center">
          <p className="text-lg font-bold text-white">
            {solved === 9 ? "Perfect!" : `${solved}/9 solved`}
          </p>
          <p className="mt-1 text-sm text-gray-400">
            {state.guessesUsed} guess{state.guessesUsed !== 1 ? "es" : ""} used
            {state.guessesUsed > 0 && <> · {accuracyPercent(state)}% accuracy</>}
          </p>
          <p className="mt-3 text-xs text-gray-500">
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

      {/* Guess modal */}
      {selectedCell && !gameOver && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && handleCloseModal()}
        >
          <div className="w-full max-w-md rounded-2xl border border-gray-700 bg-gray-900 p-6 shadow-2xl">
            {/* Modal header */}
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

            {/* Result flash */}
            {lastResult === "incorrect" && (
              <div className="mb-3 rounded-lg bg-red-900/40 px-3 py-2 text-sm text-red-400">
                Not quite — try another car.
              </div>
            )}

            {/* Search input */}
            <GuessInput onSelect={handleGuess} usedCarIds={usedCarIds} />

            {/* Guess counter */}
            <p className="mt-4 text-center text-xs text-gray-500">
              {guessesLeft} guess{guessesLeft !== 1 ? "es" : ""} remaining
            </p>
          </div>
        </div>
      )}

      {/* Footer nav */}
      <nav className="mt-8 flex gap-4 text-xs text-gray-500">
        {!isArchive && (
          <Link href="/archive" className="hover:text-amber-400">
            Archive
          </Link>
        )}
        <Link href="/credits" className="hover:text-amber-400">
          Image credits
        </Link>
      </nav>
    </div>
  );
}
