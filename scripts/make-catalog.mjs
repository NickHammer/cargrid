/**
 * Regenerates CATALOG.md — the human-readable list of every car in the game.
 *
 * This is a report, never a source of truth: data/cars.json and
 * data/image-credits.json are. Re-run it after any catalog change so the list
 * does not drift from the dataset:
 *
 *   node scripts/make-catalog.mjs
 *
 * "Playable" means the record is wired up end to end — it has a verified image
 * credit, that image file exists on disk, and `image_url` points at it. A car
 * without one still answers grid cells, but renders as a text tile, so the
 * distinction is worth showing rather than hiding.
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const cars = JSON.parse(readFileSync(join(root, "data/cars.json"), "utf8"));
const credits = JSON.parse(readFileSync(join(root, "data/image-credits.json"), "utf8"));

const isPlayable = (car) => {
  const credit = credits[car.id];
  return Boolean(
    car.image_url &&
    credit?.verified &&
    credit.file === car.image_url &&
    existsSync(join(root, "public", car.image_url))
  );
};

const years = (car) => `${car.production_start}–${car.production_end ?? "now"}`;
const power = (car) =>
  car.power_output_hp_min === car.power_output_hp_max
    ? `${car.power_output_hp_min}`
    : `${car.power_output_hp_min}–${car.power_output_hp_max}`;

const byMake = new Map();
for (const car of cars) {
  if (!byMake.has(car.make)) byMake.set(car.make, []);
  byMake.get(car.make).push(car);
}
for (const list of byMake.values()) {
  list.sort((a, b) => a.model.localeCompare(b.model) || a.generation - b.generation);
}

const makes = [...byMake.keys()].sort();
const playable = cars.filter(isPlayable);
const notPlayable = cars.filter((c) => !isPlayable(c));

const out = [];
out.push("# CarGrid catalog");
out.push("");
out.push("Every car currently in the game. Generated — do not hand-edit.");
out.push("Re-run `node scripts/make-catalog.mjs` after any change to `data/cars.json`.");
out.push("");
out.push(`- **${cars.length}** cars across **${makes.length}** makes`);
out.push(`- **${playable.length}** playable (verified image wired up)`);
if (notPlayable.length) {
  out.push(`- **${notPlayable.length}** awaiting an image — these render as a text tile:`);
  for (const car of notPlayable) out.push(`  - \`${car.id}\``);
} else {
  out.push("- **0** awaiting an image");
}
out.push("");
out.push("A car is one **generation** of a nameplate. Power is the span of that");
out.push("generation's factory line-up in hp, performance variants included.");
out.push("");

out.push("## Makes");
out.push("");
out.push("| Make | Cars | Country |");
out.push("|---|---:|---|");
for (const make of makes) {
  const list = byMake.get(make);
  const countries = [...new Set(list.map((c) => c.country_of_origin))].join(", ");
  out.push(`| [${make}](#${make.toLowerCase().replace(/[^a-z0-9]+/g, "-")}) | ${list.length} | ${countries} |`);
}
out.push("");

for (const make of makes) {
  out.push(`## ${make}`);
  out.push("");
  out.push("| Model | Gen | Years | Class | Body | hp | Image |");
  out.push("|---|---:|---|---|---|---|:-:|");
  for (const car of byMake.get(make)) {
    out.push(
      `| ${car.model} | ${car.generation} | ${years(car)} | ${car.car_class} | ` +
      `${car.body_style} | ${power(car)} | ${isPlayable(car) ? "yes" : "**no**"} |`
    );
  }
  out.push("");
}

writeFileSync(join(root, "CATALOG.md"), out.join("\n") + "\n");
console.log(
  `CATALOG.md written: ${cars.length} cars, ${makes.length} makes, ` +
  `${playable.length} playable, ${notPlayable.length} without an image.`
);
