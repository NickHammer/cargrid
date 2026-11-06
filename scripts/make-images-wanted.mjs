/**
 * Regenerates docs/IMAGES-WANTED.md — every curated car that is NOT in the
 * game because no photo could be verified for it.
 *
 * This file used to be written by hand, which is exactly why it needed a
 * script: the counts in its header drifted every wave, and building it with a
 * shell heredoc once ate the backticks in the prose and shipped a line reading
 * "Check  too:". It is derived entirely from data/incoming/needs-photo.json,
 * so generating it is both cheaper and correct.
 *
 * The prose sections are kept verbatim rather than recomputed — they are
 * review guidance earned over the waves, not data.
 *
 * Usage: node scripts/make-images-wanted.mjs
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const PARKED = join(root, "data/incoming/needs-photo.json");
const DEST = join(root, "docs/IMAGES-WANTED.md");

const parked = existsSync(PARKED) ? JSON.parse(readFileSync(PARKED, "utf8")) : [];

const cars = [...parked].sort(
  (a, b) =>
    a.make.localeCompare(b.make) ||
    a.model.localeCompare(b.model) ||
    a.generation - b.generation,
);

const byMake = new Map();
for (const car of cars) byMake.set(car.make, (byMake.get(car.make) ?? 0) + 1);

/** A pipe would end the table cell early. */
const cell = (s) => String(s).replace(/\|/g, "\\|");
const years = (car) => `${car.production_start}–${car.production_end ?? "now"}`;

/**
 * A Commons search seeded with the make, model and the generation's FIRST
 * year. The year is what makes the link worth clicking: a bare nameplate
 * search returns the current generation, which is how a 2024 Rogue nearly got
 * filed under the 2008 one.
 */
function searchLink(car) {
  const q = `${car.make} ${car.model} ${car.production_start}`;
  const url = `https://commons.wikimedia.org/w/index.php?search=${encodeURIComponent(q)}&ns6=1`;
  return `[${cell(car.model)}](${url})`;
}

const out = [];
out.push("# Photos wanted");
out.push("");
out.push(
  `${cars.length} cars are curated and ready but have no usable photo, so they are`,
);
out.push(
  "**not in the game**. They wait in `data/incoming/needs-photo.json` and return",
);
out.push("automatically once a photo is verified:");
out.push("");
out.push("```bash");
out.push(
  "# put the Commons file name in data/curation/pinned-files.json against the car id, then:",
);
out.push("node scripts/fetch-car-images.mjs <car-id>");
out.push("node scripts/mark-image-verified.mjs <car-id>");
out.push("node scripts/optimize-car-images.mjs");
out.push("node scripts/park-imageless-cars.mjs --restore");
out.push("node scripts/validate-grids.mjs --min 3");
out.push("```");
out.push("");
out.push(
  [...byMake]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([make, n]) => `**${make}** ${n}`)
    .join(" · "),
);
out.push("");
out.push("Generated — do not hand-edit. Re-run with `npm run docs:refresh`.");
out.push("");
out.push("## What a usable photo looks like");
out.push("");
out.push(
  "Tiles are 4:3 at about 300px, so: a front three-quarter view, the car filling",
);
out.push(
  "the frame, a standard car with no livery, decals, roof rack or bull bar,",
);
out.push(
  "nothing and nobody in front of it, and above all **the right generation and",
);
out.push(
  "the right body**. Body Style is a live grid category, so an estate against a",
);
out.push(
  "Sedan record makes a puzzle wrong — 10 cars across seven waves, none obvious",
);
out.push(
  "at thumbnail size. Check the record, not your eye. Check `brands` too: a",
);
out.push(
  "Chevrolet-badged Holden Caprice is correct, because that record lists both.",
);
out.push("");
out.push(
  "**The filename catches what the thumbnail does not.** In the Honda wave, 16 of",
);
out.push(
  "21 rejects were named on Commons as the wrong generation or the wrong body —",
);
out.push(
  "a `1980-1981 Accord` against a 1982 record, an `Accord Tourer` against a Sedan,",
);
out.push(
  "a `Fit Shuttle` against a Fit. Read the Commons file name before the picture.",
);
out.push("");
out.push("## The list");
out.push("");
out.push("| id | car | years | body / class | search Commons |");
out.push("|---|---|---|---|---|");
for (const car of cars) {
  out.push(
    `| \`${car.id}\` | ${cell(car.make)} ${cell(car.model)} | ${years(car)} ` +
      `| ${cell(car.body_style)} / ${cell(car.car_class)} | ${searchLink(car)} |`,
  );
}
out.push("");

writeFileSync(DEST, out.join("\n"));
console.log(
  `docs/IMAGES-WANTED.md written: ${cars.length} cars waiting on a photo, ` +
    `${byMake.size} make(s).`,
);
