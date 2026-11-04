/**
 * Regenerates docs/PHOTO-CHECK.md — every published photo, two per row, so the
 * whole catalog can be eyeballed in one scroll.
 *
 * This exists because the failures that survive review are the ones that look
 * fine in isolation. Seen in a row next to its neighbours, a wrong-generation
 * car or an estate filed as a saloon is obvious; seen alone on a contact sheet
 * during a wave, it is not. Ten body-style mismatches reached "verified" that
 * way before being caught against the record.
 *
 * So each caption carries the three things worth checking against the picture:
 *   production years  -> is this the right generation?
 *   body style        -> Body Style is a live grid category, so an estate
 *                        behind a Sedan record makes a real puzzle wrong
 *   car id            -> what to quote back when something is wrong
 *
 * Years appear here deliberately, even though the guess autocomplete and
 * /credits both hide them. Those are player-facing and years would give the
 * Decade answer away; this is a maintainer's checklist inside the repo, where
 * the whole point is to check the year against the bodywork.
 *
 * Usage: node scripts/make-photo-check.mjs [--cols 2] [--width 320]
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const argv = process.argv.slice(2);
const argOf = (n, d) => {
  const i = argv.indexOf(n);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : d;
};
const COLS = parseInt(argOf("--cols", "2"), 10);
const WIDTH = parseInt(argOf("--width", "320"), 10);

const cars = JSON.parse(readFileSync(join(root, "data/cars.json"), "utf8"));
const credits = JSON.parse(readFileSync(join(root, "data/image-credits.json"), "utf8"));

const withPhoto = cars
  .filter((car) => car.image_url)
  .sort((a, b) =>
    `${a.make} ${a.model}`.localeCompare(`${b.make} ${b.model}`) ||
    a.generation - b.generation,
  );

const missingFile = withPhoto.filter(
  (car) => !existsSync(join(root, "public", car.image_url.replace(/^\//, ""))),
);

/** A pipe in a caption would end the table cell early. */
const cell = (s) => String(s).replace(/\|/g, "\\|");
const years = (car) => `${car.production_start}–${car.production_end ?? "now"}`;

function tile(car) {
  // The file lives in docs/, the images in public/cars/, so every src has to
  // climb one level. GitHub and VS Code both resolve this against the file.
  // loading="lazy" matters at this length: without it the browser tries to
  // fetch all 1,000 images at once (~30 MB) and the page stalls before you
  // can scroll it. With it, only what is near the viewport loads.
  const img =
    `<img src="../public/cars/${car.id}.webp" width="${WIDTH}" loading="lazy"` +
    ` alt="${cell(car.make)} ${cell(car.model)}">`;
  const gen = cars.filter((c) => c.make === car.make && c.model === car.model).length > 1
    ? ` · Gen ${car.generation}`
    : "";
  return [
    img,
    `**${cell(car.make)} ${cell(car.model)}**${gen}`,
    `${years(car)} · ${cell(car.body_style)} · ${cell(car.car_class)}`,
    `\`${car.id}\``,
  ].join("<br>");
}

const byMake = new Map();
for (const car of withPhoto) {
  if (!byMake.has(car.make)) byMake.set(car.make, []);
  byMake.get(car.make).push(car);
}
const makes = [...byMake.keys()].sort((a, b) => a.localeCompare(b));

const anchor = (make) =>
  make.toLowerCase().replace(/[^a-z0-9 -]/g, "").trim().replace(/\s+/g, "-");

const out = [];
out.push("# Photo check");
out.push("");
out.push(
  `**${withPhoto.length}** cars, **${makes.length}** makes, ${COLS} per row, ` +
    "alphabetical by make then model.",
);
out.push("");
out.push("Generated — do not hand-edit. Re-run after any catalog change:");
out.push("");
out.push("```bash");
out.push("node scripts/make-photo-check.mjs");
out.push("```");
out.push("");
out.push("## What to look for");
out.push("");
out.push(
  "Each caption gives the production years and the body style, because those " +
    "are the two things a wrong photo gets wrong while still looking fine:",
);
out.push("");
out.push(
  "- **Wrong generation.** A nameplate runs for decades and every version " +
    "carries the same name. Check the bodywork against the years.",
);
out.push(
  "- **Wrong body.** Body Style is a live grid category, so an estate behind " +
    "a `Sedan` record or a cabriolet behind a `Hatchback` one makes a real " +
    "puzzle wrong. Ten of these were caught during the import waves.",
);
out.push(
  "- **Not a standard car.** Race or police livery, dealer decals, a roof " +
    "box, a bull bar, or a performance variant standing in for the base car.",
);
out.push("");
out.push(
  "Quote the `car-id` under any tile that looks wrong. Rejecting one is:",
);
out.push("");
out.push("```bash");
out.push("node scripts/mark-image-verified.mjs --reject <car-id>");
out.push("node scripts/apply-image-urls.mjs");
out.push("node scripts/park-imageless-cars.mjs   # drops it out of the game");
out.push("node scripts/validate-grids.mjs --min 3");
out.push("```");
out.push("");
if (missingFile.length) {
  out.push(
    `> **${missingFile.length} record(s) point at a file that is not on disk:** ` +
      missingFile.map((c) => `\`${c.id}\``).join(", "),
  );
  out.push("");
}
out.push("## Makes");
out.push("");
out.push(makes.map((m) => `[${m}](#${anchor(m)}) ${byMake.get(m).length}`).join(" · "));
out.push("");

for (const make of makes) {
  const list = byMake.get(make);
  out.push(`## ${make}`);
  out.push("");
  out.push(`${list.length} car${list.length === 1 ? "" : "s"}`);
  out.push("");
  out.push(`|${" |".repeat(COLS)}`);
  out.push(`|${"---|".repeat(COLS)}`);
  for (let i = 0; i < list.length; i += COLS) {
    const row = list.slice(i, i + COLS).map(tile);
    while (row.length < COLS) row.push("");
    out.push(`| ${row.join(" | ")} |`);
  }
  out.push("");
}

const uncredited = withPhoto.filter((c) => !credits[c.id]?.artist).length;
out.push("---");
out.push("");
out.push(
  `Every photo above is a Wikimedia Commons file under a free licence, ` +
    `credited on \`/credits\`${uncredited ? ` (**${uncredited} missing a credit**)` : ""}.`,
);
out.push("");

const dest = join(root, "docs/PHOTO-CHECK.md");
writeFileSync(dest, out.join("\n"));
const kb = (Buffer.byteLength(out.join("\n")) / 1024).toFixed(0);
console.log(`docs/PHOTO-CHECK.md written: ${withPhoto.length} cars, ${makes.length} makes, ${kb} KB`);
if (missingFile.length) console.log(`  ! ${missingFile.length} missing image file(s)`);
