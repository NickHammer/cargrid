/**
 * Moves one brand's staged records from the bulk import into the live catalog.
 *
 *   node scripts/move-import-wave.mjs Nissan
 *   node scripts/move-import-wave.mjs --list
 *
 * Why staging exists at all: the game resolves grid answers client-side from
 * data/cars.json, so a record added there is immediately a valid answer. With
 * no image it renders as a text tile, and the standing rule for this catalog
 * is that a car ships only with accurate data AND an accurate image. So the
 * 3,500-odd imported records wait in data/incoming/cargrid-import.json and
 * cross over one brand at a time, each wave finishing its images before the
 * next starts. Nothing reaches the site until a deploy, so a half-finished
 * wave in the working tree is not visible to players.
 *
 * Every record is re-checked with validateCar on the way in, and an id
 * collision aborts the whole wave rather than merging half of it.
 *
 * See docs/IMPORT-REVIEW.md for the decisions behind the import, and
 * data/curation/import-map.json for the de-duplication and renumbering map.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { validateCar } from "./lib/curation.mjs";

const STAGE = "data/incoming/cargrid-import.json";
const CARS = "data/cars.json";

const brand = process.argv[2];
const staged = JSON.parse(readFileSync(STAGE, "utf8"));

if (!brand || brand === "--list") {
  const counts = new Map();
  for (const car of staged) counts.set(car.make, (counts.get(car.make) ?? 0) + 1);
  console.log(`${staged.length} records still staged across ${counts.size} makes:\n`);
  for (const [make, n] of [...counts].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(n).padStart(4)}  ${make}`);
  }
  process.exit(brand ? 0 : 1);
}

const cars = JSON.parse(readFileSync(CARS, "utf8"));

const wave = staged.filter((car) => car.make === brand);
if (!wave.length) {
  console.error(`no staged records for make "${brand}" — run --list to see what is left`);
  process.exit(1);
}

const existing = new Set(cars.map((car) => car.id));
const clashes = wave.filter((car) => existing.has(car.id)).map((car) => car.id);
if (clashes.length) {
  console.error(`id collision, nothing moved: ${clashes.join(", ")}`);
  process.exit(1);
}

const problems = wave.flatMap((car) => validateCar(car).map((e) => `${car.id}: ${e}`));
if (problems.length) {
  console.error(`${problems.length} validation problem(s), nothing moved:`);
  console.error(problems.join("\n"));
  process.exit(1);
}

cars.push(...wave);
cars.sort((a, b) => a.id.localeCompare(b.id));
writeFileSync(CARS, JSON.stringify(cars, null, 2));

const moved = new Set(wave.map((car) => car.id));
writeFileSync(STAGE, JSON.stringify(staged.filter((car) => !moved.has(car.id)), null, 2));

const decades = {};
for (const car of wave) for (const d of car.decades) decades[d] = (decades[d] ?? 0) + 1;

console.log(`moved ${wave.length} ${brand} record(s) into the catalog.`);
console.log(`catalog: ${cars.length} cars   |   still staged: ${staged.length - wave.length}`);
console.log(`decade spread: ${JSON.stringify(Object.fromEntries(Object.entries(decades).sort()))}`);
console.log(`\nnext: node scripts/fetch-car-images.mjs && node scripts/make-contact-sheets.mjs --unverified`);
