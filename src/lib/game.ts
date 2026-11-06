import type { Car, GridParameter, GameState, Nameplate } from "./types";
import { MATCH } from "./parameters.mjs";
import { nameplateKey, firstAnswering } from "./nameplates.mjs";

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

/**
 * Which generation of a guessed nameplate answers this square, or null if none
 * does.
 *
 * **One record has to satisfy both axes.** It is not enough for a 1983 Civic to
 * be a hatchback and a 2006 Civic to be front-wheel-drive — "Honda Civic" only
 * answers `Hatchback x FWD` if some single Civic is both. Resolving per record
 * rather than unioning the nameplate's fields is what keeps the puzzle honest.
 *
 * The lowest qualifying generation wins. That is cosmetic rather than
 * meaningful: a nameplate is consumed whole when it is used, so the generation
 * picked here cannot change what remains available for the other eight squares.
 * It only has to be deterministic, so that replaying an archived board shows
 * the same photo it showed the first time.
 *
 * The rule itself lives in `firstAnswering` (nameplates.mjs) so the test runner
 * can reach it without loading the TypeScript module graph.
 */
export function resolveAnswer(
  nameplate: Nameplate,
  rowParam: GridParameter,
  colParam: GridParameter
): Car | null {
  return firstAnswering(nameplate.cars, rowParam, colParam);
}

/**
 * The nameplates already on the board.
 *
 * A cell stores the id of the generation that filled it — the saved-game shape
 * is unchanged, so boards saved before guessing became nameplate-level still
 * load — so the keys are derived by looking each id back up. An id that no
 * longer resolves is skipped rather than throwing: a car can leave the catalog
 * between sessions by being parked for want of a photo, and a stale archive
 * entry must not break the board it is on.
 *
 * Takes the lookup as an argument so this stays free of the car dataset and can
 * be tested against a fixture.
 */
export function usedNameplateKeys(
  state: GameState,
  getCar: (id: string) => Car | undefined
): Set<string> {
  const keys = new Set<string>();
  for (const cell of state.cells) {
    if (!cell.carId) continue;
    const car = getCar(cell.carId);
    if (car) keys.add(nameplateKey(car));
  }
  return keys;
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
