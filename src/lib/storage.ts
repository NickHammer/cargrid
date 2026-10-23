import type { GameState } from "./types";

const PREFIX = "cargrid-state-";

function key(date: string): string {
  return `${PREFIX}${date}`;
}

export function loadGameState(date: string, gridId: string): GameState {
  try {
    const raw = localStorage.getItem(key(date));
    if (raw) {
      const state = JSON.parse(raw) as GameState;
      if (state.date === date && state.gridId === gridId) return state;
    }
  } catch {
    // localStorage unavailable or corrupt — fall through to fresh state
  }
  return freshGameState(date, gridId);
}

export function saveGameState(state: GameState): void {
  try {
    localStorage.setItem(key(state.date), JSON.stringify(state));
  } catch {
    // ignore write failures
  }
}

function freshGameState(date: string, gridId: string): GameState {
  return {
    date,
    gridId,
    cells: Array.from({ length: 9 }, () => ({ solved: false, carId: null })),
    guessesUsed: 0,
  };
}

/** Saved state for a date, or null if that puzzle has never been opened. */
export function peekGameState(date: string, gridId: string): GameState | null {
  try {
    const raw = localStorage.getItem(key(date));
    if (!raw) return null;
    const state = JSON.parse(raw) as GameState;
    return state.date === date && state.gridId === gridId ? state : null;
  } catch {
    return null;
  }
}
