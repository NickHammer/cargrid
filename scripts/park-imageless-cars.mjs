/**
 * Moves every car that has no photo out of the live catalog.
 *
 * The rule: a car does not appear in the game unless it has an accurate photo
 * behind it. A record with an empty `image_url` used to render as a plain text
 * tile — playable, but unfinished-looking, and it let a car be a correct answer
 * while showing the player nothing. So those records now wait in
 * data/incoming/needs-photo.json instead, and come back the moment a photo is
 * verified for them.
 *
 * Nothing is deleted. The record, its id and all its curated facts are kept
 * intact in the parking file, and `--restore` puts back any car whose photo has
 * since been verified. docs/IMAGES-WANTED.md is the human-facing list.
 *
 * Order matters in a wave: park AFTER the image rounds, because the fetcher
 * reads cars.json to know what to look for. A car parked too early is a car the
 * fetcher will never try again.
 *
 * Usage:
 *   node scripts/park-imageless-cars.mjs            # park what has no photo
 *   node scripts/park-imageless-cars.mjs --dry-run  # say what would move
 *   node scripts/park-imageless-cars.mjs --restore  # bring back the now-photographed
 */

import fs from "node:fs";
import { validateCar } from "./lib/curation.mjs";

const CARS = "data/cars.json";
const PARKED = "data/incoming/needs-photo.json";

const argv = process.argv.slice(2);
const dryRun = argv.includes("--dry-run");
const restore = argv.includes("--restore");

const readJson = (p, fallback) =>
  fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf8")) : fallback;

const cars = readJson(CARS, []);
const parked = readJson(PARKED, []);
const credits = readJson("data/image-credits.json", {});

const write = (p, v) => fs.writeFileSync(p, JSON.stringify(v, null, 2) + "\n");
const byId = (a, b) => a.id.localeCompare(b.id);

if (restore) {
  // A parked car earns its place back only with a verified credit AND a file
  // on disk — the same bar a car in the catalog has to clear.
  const onDisk = new Set(fs.readdirSync("public/cars"));
  const ready = parked.filter(
    (car) => credits[car.id]?.verified && onDisk.has(`${car.id}.webp`),
  );
  if (!ready.length) {
    console.log(`nothing to restore — ${parked.length} car(s) still waiting on a photo`);
    process.exit(0);
  }
  const problems = ready.flatMap((car) => validateCar(car).map((e) => `${car.id}: ${e}`));
  if (problems.length) {
    console.error(`${problems.length} validation problem(s), nothing restored:`);
    console.error(problems.join("\n"));
    process.exit(1);
  }
  const existing = new Set(cars.map((c) => c.id));
  const clashes = ready.filter((c) => existing.has(c.id)).map((c) => c.id);
  if (clashes.length) {
    console.error(`id collision, nothing restored: ${clashes.join(", ")}`);
    process.exit(1);
  }
  for (const car of ready) car.image_url = `/cars/${car.id}.webp`;
  if (dryRun) {
    console.log(`would restore ${ready.length}: ${ready.map((c) => c.id).join(", ")}`);
    process.exit(0);
  }
  const restoredIds = new Set(ready.map((c) => c.id));
  write(CARS, [...cars, ...ready].sort(byId));
  write(PARKED, parked.filter((c) => !restoredIds.has(c.id)).sort(byId));
  console.log(`restored ${ready.length} car(s) — catalog ${cars.length + ready.length}, still parked ${parked.length - ready.length}`);
  process.exit(0);
}

const imageless = cars.filter((car) => !car.image_url);
if (!imageless.length) {
  console.log(`nothing to park — all ${cars.length} cars have a photo`);
  process.exit(0);
}

const byMake = {};
for (const car of imageless) byMake[car.make] = (byMake[car.make] ?? 0) + 1;

console.log(`${imageless.length} car(s) without a photo:`);
for (const [make, n] of Object.entries(byMake).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(n).padStart(3)}  ${make}`);
}

if (dryRun) {
  console.log("\n--dry-run: nothing written");
  process.exit(0);
}

const parkedIds = new Set(parked.map((c) => c.id));
const added = imageless.filter((c) => !parkedIds.has(c.id));
write(CARS, cars.filter((car) => car.image_url).sort(byId));
write(PARKED, [...parked, ...added].sort(byId));

console.log(`\nparked ${added.length} new (${imageless.length} moved out of the catalog).`);
console.log(`catalog: ${cars.length - imageless.length} cars, every one with a photo.`);
console.log(`waiting on a photo: ${parked.length + added.length} — see docs/IMAGES-WANTED.md`);
console.log(`\nnext: node scripts/validate-grids.mjs --min 3   # removing cars can break a grid`);
