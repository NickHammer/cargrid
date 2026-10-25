import type { Car } from "./types";
import carsData from "../../data/cars.json";

export const allCars: Car[] = carsData as Car[];

export function searchCars(query: string): Car[] {
  const q = query.toLowerCase().trim();
  if (q.length < 2) return [];
  return allCars
    .filter((car) => searchText(car).includes(q))
    .slice(0, 10);
}

/**
 * Everything a query may match against. Aliases are folded in so common names
 * ("Miata", "Mazda3", "Bug") find the car, and a space-stripped copy is
 * appended so "mazda3" matches a model stored as "3".
 */
function searchText(car: Car): string {
  const names = [`${car.make} ${car.model}`, ...(car.aliases ?? [])];
  return [...names, ...names.map((n) => n.replace(/\s+/g, ""))].join(" ").toLowerCase();
}

export function getCarById(id: string): Car | undefined {
  return allCars.find((car) => car.id === id);
}

// Nameplates with more than one generation in the dataset — computed once so
// carDisplayLabel doesn't re-scan allCars on every keystroke/render.
const multiGenNameplates = new Set<string>(
  (() => {
    const counts = new Map<string, number>();
    for (const car of allCars) {
      const key = `${car.make} ${car.model}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return [...counts.entries()].filter(([, count]) => count > 1).map(([key]) => key);
  })()
);

// Deliberately excludes production years — Decade is a live grid parameter,
// and showing the year span would let a player read the answer off the
// dropdown instead of knowing the car. Only disambiguate generation when the
// nameplate actually needs it (e.g. Toyota Supra has five).
export function carDisplayLabel(car: Car): string {
  const base = `${car.make} ${car.model}`;
  return multiGenNameplates.has(base) ? `${base} (Gen ${car.generation})` : base;
}
