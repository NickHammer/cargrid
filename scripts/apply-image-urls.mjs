/**
 * Copies verified image paths from data/image-credits.json into the
 * `image_url` field of data/cars.json.
 *
 * Only entries marked "verified": true are wired up — an unverified or rejected
 * image leaves image_url empty, and the grid falls back to a text tile rather
 * than showing the wrong car.
 *
 * Usage: node scripts/apply-image-urls.mjs [--dry]
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

const CARS_PATH = "data/cars.json";
const CREDITS_PATH = "data/image-credits.json";

const dry = process.argv.includes("--dry");
const cars = JSON.parse(readFileSync(CARS_PATH, "utf8"));
const credits = JSON.parse(readFileSync(CREDITS_PATH, "utf8"));

let set = 0, cleared = 0, missingFile = 0, unverified = 0;

const updated = cars.map((car) => {
  const credit = credits[car.id];
  if (!credit?.verified) {
    if (credit) unverified++;
    if (car.image_url) cleared++;
    return { ...car, image_url: "" };
  }
  if (!existsSync(join("public", credit.file.replace(/^\//, "")))) {
    console.log(`! ${car.id} — verified but ${credit.file} is missing on disk`);
    missingFile++;
    return { ...car, image_url: "" };
  }
  if (car.image_url !== credit.file) set++;
  return { ...car, image_url: credit.file };
});

if (!dry) writeFileSync(CARS_PATH, JSON.stringify(updated, null, 2));

const withImages = updated.filter((c) => c.image_url).length;
console.log(`${set} image_url set, ${cleared} cleared${dry ? " (dry run)" : ""}.`);
console.log(`${withImages}/${cars.length} cars now have an image.`);
if (unverified) console.log(`${unverified} credit entries are still unverified.`);
if (missingFile) console.log(`${missingFile} verified entries point at a missing file.`);
