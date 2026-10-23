import type { GridLayout } from "./types";
import gridsData from "../../data/grids.json";

/**
 * The daily schedule is pre-generated and committed (scripts/generate-grids.mjs)
 * so archived grids stay stable when the car dataset changes.
 */
// The JSON widens `type` to string and the axes to plain arrays; the shape is
// guaranteed instead by scripts/validate-grids.mjs, which checks every grid
// against the car dataset.
export const allGrids: GridLayout[] = (gridsData.grids as unknown as GridLayout[])
  .slice()
  .sort((a, b) => a.date.localeCompare(b.date));

const byDate = new Map(allGrids.map((g) => [g.date, g]));

export function getGridForDate(date: string): GridLayout | null {
  return byDate.get(date) ?? null;
}

/** Scheduled dates strictly before `today`, newest first. */
export function getArchiveDates(today: string): string[] {
  return allGrids
    .map((g) => g.date)
    .filter((d) => d < today)
    .reverse();
}

export const firstGridDate = allGrids[0]?.date ?? null;
export const lastGridDate = allGrids.at(-1)?.date ?? null;
