/**
 * Nameplates — the unit the game actually deals in.
 *
 * A record is one generation ("honda-civic-g7"); a **nameplate** is a make plus
 * model ("Honda Civic"), which is what a player types. CLAUDE.md has always
 * said a grid entry is Make + Model, but the dropdown used to append `(Gen N)`
 * and the judge compared the exact record, so eleven unlabelled Civics went
 * into the list and eight of them were marked wrong. Years cannot be shown to
 * disambiguate them — Decade is a live axis — so the fix is to stop asking:
 * one row per nameplate, correct when *any* of its generations answers.
 *
 * Measured over the 743-day schedule before the change: 5,352 of 6,687 squares
 * (80%) held a nameplate where some generations answered and some did not, and
 * a player who knew the right car had a 44.5% chance of picking the right
 * generation — worse than a coin flip.
 *
 * Shared by the browser, the generator and both validators. No filesystem or
 * network dependencies, same contract as parameters.mjs, because
 * scripts/grid-params.mjs re-exports this for the offline tooling.
 */

import { MATCH } from "./parameters.mjs";

/**
 * The nameplate a record belongs to. Make + model and nothing else: generation
 * is deliberately excluded, and trims never reach this because a performance
 * variant is curated as its own model.
 *
 * @param {import('./types').Car} car
 * @returns {string}
 */
export function nameplateKey(car) {
  return `${car.make} ${car.model}`;
}

/**
 * Records grouped by nameplate, each group ordered by generation.
 *
 * The order is what makes answer resolution deterministic: when several
 * generations answer a square, the lowest-numbered one fills the tile. That
 * choice is purely cosmetic — using a nameplate consumes all of its
 * generations, so which one is shown cannot change what is left for the other
 * eight squares — but it has to be stable, or an archived board would replay
 * with a different photo than the one the player saw.
 *
 * @param {readonly import('./types').Car[]} cars
 * @returns {Map<string, import('./types').Car[]>}
 */
export function groupByNameplate(cars) {
  /** @type {Map<string, import('./types').Car[]>} */
  const out = new Map();
  for (const car of cars) {
    const key = nameplateKey(car);
    const list = out.get(key);
    if (list) list.push(car);
    else out.set(key, [car]);
  }
  for (const list of out.values()) list.sort((a, b) => a.generation - b.generation);
  return out;
}

/**
 * Can nine *distinct* answers fill the nine squares? Kuhn's augmenting-path
 * matching over the bipartite square/answer graph.
 *
 * Per-square counts are not enough on their own: the autocomplete bars reusing
 * an answer, so a grid where every square is individually fillable can still be
 * impossible to finish 9/9.
 *
 * Deliberately agnostic about what an answer *is* — it matches on whatever keys
 * it is handed, so the generator can pass nameplate indices while the
 * validators pass nameplate strings. This function used to exist in three
 * independent copies (generate-grids.mjs, validate-grids.mjs and
 * lib/curation.mjs); they agreed only by luck, and a generator that disagrees
 * with its validator builds schedules that fail their own check.
 *
 * @param {readonly (readonly (string | number)[])[]} cellLists
 * @returns {boolean}
 */
export function hasDistinctSolution(cellLists) {
  /** @type {Map<string | number, number>} answer key -> cell index */
  const assignedTo = new Map();
  /** @type {(cell: number, seen: Set<string | number>) => boolean} */
  const augment = (cell, seen) => {
    for (const key of cellLists[cell]) {
      if (seen.has(key)) continue;
      seen.add(key);
      const holder = assignedTo.get(key);
      if (holder === undefined || augment(holder, seen)) {
        assignedTo.set(key, cell);
        return true;
      }
    }
    return false;
  };
  for (let i = 0; i < cellLists.length; i++) {
    if (!augment(i, new Set())) return false;
  }
  return true;
}

/**
 * The first record in `cars` that answers both axes, or null if none does.
 *
 * **One record has to satisfy both.** It is not enough for a 1983 Civic to be a
 * hatchback and a 2006 Civic to be front-wheel-drive — "Honda Civic" only
 * answers `Hatchback x FWD` if some single Civic is both. Resolving per record
 * instead of unioning the nameplate's fields together is what keeps the puzzle
 * honest once the guess stops naming a generation.
 *
 * Takes the records in generation order (as `groupByNameplate` returns them),
 * so the answer is the lowest qualifying generation — deterministic, which an
 * archived board replaying the same photo depends on.
 *
 * @param {readonly import('./types').Car[]} cars
 * @param {import('./types').GridParameter} rowParam
 * @param {import('./types').GridParameter} colParam
 * @returns {import('./types').Car | null}
 */
export function firstAnswering(cars, rowParam, colParam) {
  return (
    cars.find(
      (car) =>
        MATCH[rowParam.type](car, rowParam.value) && MATCH[colParam.type](car, colParam.value),
    ) ?? null
  );
}

/**
 * Distinct nameplates among a set of records — how many different answers a
 * player could type for a square.
 *
 * This is the number the difficulty floor has to count. `minCell: 3` meant
 * "three answers", and while the judge compared records those were the same
 * thing; once a guess is a nameplate they are not. Seven squares in the
 * schedule held three or more records that collapsed to fewer than three
 * nameplates, and one — 2026-11-22 Diesel x Honda Motor — held five records
 * that were all Honda Civic, so its only answer was "Honda Civic".
 *
 * @param {readonly import('./types').Car[]} cars
 * @returns {number}
 */
export function countNameplates(cars) {
  const seen = new Set();
  for (const car of cars) seen.add(nameplateKey(car));
  return seen.size;
}
