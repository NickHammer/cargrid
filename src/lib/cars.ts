import type { Car, Nameplate } from "./types";
import { groupByNameplate, matchRank } from "./nameplates.mjs";
// The import attribute is required by Node, which the Next build also accepts.
// Without it this module can only be loaded by the bundler, and the search the
// whole dropdown depends on cannot be exercised by a test.
import carsData from "../../data/cars.json" with { type: "json" };

export const allCars: Car[] = carsData as Car[];

/**
 * Every nameplate in the game, ordered as cars.json is and each one's
 * generations ordered within it. Built once at module load: the old
 * per-keystroke search rebuilt a match string for all 1,000 records on every
 * character typed.
 */
export const allNameplates: Nameplate[] = [...groupByNameplate(allCars)].map(
  ([key, cars]) => ({ key, make: cars[0].make, model: cars[0].model, cars }),
);

/**
 * Everything a query may match against, folded across the whole nameplate.
 * Aliases are included so common names ("Miata", "Mazda3", "Bug") find the car
 * even when only one generation carries the alias, and a space-stripped copy is
 * appended so "mazda3" matches a model stored as "3".
 */
function searchText(np: Nameplate): string {
  const names = [np.key, ...np.cars.flatMap((car) => car.aliases ?? [])];
  return [...names, ...names.map((n) => n.replace(/\s+/g, ""))].join(" ").toLowerCase();
}

const searchIndex: { np: Nameplate; text: string }[] = allNameplates.map((np) => ({
  np,
  text: searchText(np),
}));

const MAX_RESULTS = 10;

/**
 * Up to ten nameplates matching the query — one row per make+model, never one
 * per generation.
 *
 * The de-duplication is the point, not a tidy-up. While results were records,
 * the cap was applied *after* filtering, so a nameplate with more generations
 * than the cap swallowed the whole list: typing "civic" returned ten Honda
 * Civics and typing "skyline" ten Nissan Skylines, pushing every other match
 * out of the dropdown. That got worse with every generation added, and 2,664
 * records are still staged.
 *
 * `exclude` holds the nameplates already on the board, and is applied *before*
 * the cap for the same reason: filtering afterwards would let up to nine used
 * answers eat nine of the ten slots.
 *
 * Results are ranked rather than taken in catalog order, because a nameplate
 * could otherwise be buried under its own variants: typing the exact words
 * "Mitsubishi Lancer" put the Lancer ninth, below seven Lancer Evolutions and
 * a Lancer EX. Short model names had it worse — "ES", "CT", "Z" and "3" are
 * substrings of dozens of other names, so the car actually called that did not
 * make the ten at all.
 */
export function searchNameplates(query: string, exclude?: ReadonlySet<string>): Nameplate[] {
  const q = query.toLowerCase().trim();
  if (q.length < 2) return [];
  const hits: { np: Nameplate; rank: number; order: number }[] = [];
  searchIndex.forEach((entry, order) => {
    if (!entry.text.includes(q)) return;
    if (exclude?.has(entry.np.key)) return;
    hits.push({
      np: entry.np,
      rank: matchRank(entry.np.key, entry.np.model, entry.text, q),
      order,
    });
  });
  // Ties keep catalog order, so the list is stable between keystrokes.
  hits.sort((a, b) => b.rank - a.rank || a.order - b.order);
  return hits.slice(0, MAX_RESULTS).map((hit) => hit.np);
}

export function getCarById(id: string): Car | undefined {
  return allCars.find((car) => car.id === id);
}

/**
 * What the player sees in the dropdown: make and model, nothing else.
 *
 * No production years, because Decade is a live grid parameter and printing the
 * span would hand over the answer. No generation number either — that was the
 * previous compromise and it was worse than both alternatives, because it asked
 * the player to choose between eleven identical-looking Civics with nothing to
 * choose on. A guess is Make + Model, so the label is Make + Model, and
 * `resolveAnswer` works out which generation was meant.
 */
export function nameplateLabel(np: Nameplate): string {
  return np.key;
}
