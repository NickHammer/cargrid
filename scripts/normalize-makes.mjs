/**
 * Rewrites `make` and `brands[]` in data/cars.json to canonical display
 * spelling (see scripts/make-names.mjs).
 *
 * Idempotent — safe to re-run after a batch add. Car IDs are lowercase slugs
 * and are not touched, so image filenames and image-credits keys stay valid.
 *
 * Usage: node scripts/normalize-makes.mjs [--dry]
 */

import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { canonicalMakeName } from "./make-names.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const carsPath = join(__dirname, "../data/cars.json");
const dry = process.argv.includes("--dry");

const cars = JSON.parse(readFileSync(carsPath, "utf8"));
const changes = [];

const updated = cars.map((car) => {
  const make = canonicalMakeName(car.make);
  const brands = car.brands.map(canonicalMakeName);
  if (make !== car.make || brands.some((b, i) => b !== car.brands[i])) {
    changes.push(`${car.id}: ${car.make} -> ${make}`);
  }
  return { ...car, make, brands };
});

for (const line of changes) console.log(line);
console.log(`\n${changes.length} of ${cars.length} records ${dry ? "would change" : "changed"}.`);

if (!dry) writeFileSync(carsPath, JSON.stringify(updated, null, 2));
