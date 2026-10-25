/** Dry-run by default; --apply publishes a fully validated approved batch. */
import fs from "node:fs";
import { prepareBatch, coverage, validateCar, validateSchedule } from "./lib/curation.mjs";
const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith("--"));
if (!file) throw new Error("Usage: node scripts/publish-curation.mjs <batch.json> [--apply]");
const read = (path) => JSON.parse(fs.readFileSync(path, "utf8"));
const cars = read("data/cars.json");
const batch = read(file);
const provenancePath = "data/curation/provenance.json";
const history = fs.existsSync(provenancePath) ? read(provenancePath) : [];
const prepared = prepareBatch(cars, batch, history);
const credits = read("data/image-credits.json");
const seen = new Set();
for (const car of prepared.cars) {
  const errors = validateCar(car);
  if (seen.has(car.id)) errors.push("duplicate car id");
  seen.add(car.id);
  if (errors.length) throw new Error(`${car.id}: ${errors.join("; ")}`);
  if (!car.image_url) continue;
  const credit = credits[car.id];
  if (!credit?.verified || credit.file !== car.image_url || !fs.existsSync(`public${car.image_url}`)) throw new Error(`${car.id}: image must exist and have a verified matching credit, or use an empty image_url`);
}
const problems = validateSchedule(prepared.cars, read("data/grids.json").grids);
if (problems.length) throw new Error(problems.join("\n"));
const before = coverage(cars), after = coverage(prepared.cars);
console.log(`${prepared.added} additions; ${prepared.enriched} enrichments; ${prepared.skipped} unapproved skipped.`);
console.log(`Eligible values ${before.eligibleValues} -> ${after.eligibleValues}; playable intersections ${before.playableIntersections} -> ${after.playableIntersections}. All scheduled grids remain solvable.`);
if (args.includes("--apply")) {
  // Keep previous contents available for recovery if either write fails.
  const previousCars = fs.readFileSync("data/cars.json", "utf8");
  const previousProvenance = fs.existsSync(provenancePath) ? fs.readFileSync(provenancePath, "utf8") : null;
  try {
    fs.writeFileSync(provenancePath, JSON.stringify(prepared.provenance, null, 2) + "\n");
    fs.writeFileSync("data/cars.json", JSON.stringify(prepared.cars, null, 2) + "\n");
  } catch (error) {
    fs.writeFileSync("data/cars.json", previousCars);
    if (previousProvenance !== null) fs.writeFileSync(provenancePath, previousProvenance);
    else if (fs.existsSync(provenancePath)) fs.unlinkSync(provenancePath);
    throw error;
  }
  console.log("Published cars and source history. Existing grid schedule preserved.");
} else console.log("Dry run only. Use --apply to publish reviewed records.");
