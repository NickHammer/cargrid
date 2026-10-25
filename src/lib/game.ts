import type { Car, GridParameter, GameState } from "./types";
import { MATCH } from "./parameters.mjs";

export const MAX_GUESSES = 9;

export function carMatchesParameter(car: Car, param: GridParameter): boolean {
  return MATCH[param.type](car, param.value);
}

export function isValidAnswer(
  car: Car,
  rowParam: GridParameter,
  colParam: GridParameter
): boolean {
  return carMatchesParameter(car, rowParam) && carMatchesParameter(car, colParam);
}

export function isCarAlreadyUsed(state: GameState, carId: string): boolean {
  return state.cells.some((cell) => cell.carId === carId);
}

export function isGameOver(state: GameState): boolean {
  return (
    state.guessesUsed >= MAX_GUESSES || state.cells.every((c) => c.solved)
  );
}

export function solvedCount(state: GameState): number {
  return state.cells.filter((c) => c.solved).length;
}

export function accuracyPercent(state: GameState): number {
  if (state.guessesUsed === 0) return 0;
  return Math.round((solvedCount(state) / state.guessesUsed) * 100);
}
