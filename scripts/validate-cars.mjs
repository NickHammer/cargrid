import fs from "node:fs";
import { validateCar, validateEvidence } from "./lib/curation.mjs";
const cars = JSON.parse(fs.readFileSync("data/cars.json", "utf8"));
const credits = JSON.parse(fs.readFileSync("data/image-credits.json", "utf8"));
const history = fs.existsSync("data/curation/provenance.json") ? JSON.parse(fs.readFileSync("data/curation/provenance.json", "utf8")) : [];
const errors = [], seen = new Set();
for (const car of cars) {
  for (const problem of validateCar(car)) errors.push(`${car.id}: ${problem}`);
  if (seen.has(car.id)) errors.push(`${car.id}: duplicate id`);
  seen.add(car.id);
  if (car.image_url && (!fs.existsSync(`public${car.image_url}`) || !credits[car.id]?.verified || credits[car.id].file !== car.image_url)) errors.push(`${car.id}: missing image or matching verified credit`);
  for (const field of ["engine_position", "powertrains"].filter((f) => car[f] !== undefined)) {
    const record = history.findLast((r) => r.carId === car.id && r.status === "approved" && (r.facts?.[field] !== undefined || r.car?.[field] !== undefined));
    if (!record || validateEvidence(record, [field]).length || JSON.stringify((record.facts ?? record.car)[field]) !== JSON.stringify(car[field])) errors.push(`${car.id}: ${field} has no matching approved source record`);
  }
}
if (errors.length) { console.error(errors.join("\n")); process.exitCode = 1; }
else console.log(`${cars.length} cars valid; images and new-field provenance checked. Legacy core facts are not retroactively source-verified.`);
