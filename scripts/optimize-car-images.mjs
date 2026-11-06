/**
 * Re-encodes public/cars/* to WebP at a grid-appropriate size.
 *
 * The fetcher pulls 800px JPEGs (~24 MB for the full set) but tiles render at
 * roughly 160px square, so the originals are far larger than anything the game
 * displays — and they would live in git history forever at that size.
 *
 * Rewrites the file paths in data/image-credits.json; run
 * scripts/apply-image-urls.mjs afterwards to push them into cars.json.
 *
 * Usage: node scripts/optimize-car-images.mjs [--width 640] [--quality 78] [--keep]
 */

import fs from "fs";
import path from "path";
import sharp from "sharp";

const CREDITS_PATH = process.env.CREDITS_PATH || "data/image-credits.json";
const DIR = "public/cars";

const argv = process.argv.slice(2);
const argOf = (name, fallback) => {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
};
const width = parseInt(argOf("--width", "640"), 10);
const quality = parseInt(argOf("--quality", "78"), 10);
const keepOriginals = argv.includes("--keep");

const credits = JSON.parse(fs.readFileSync(CREDITS_PATH, "utf8"));
let before = 0, after = 0, converted = 0;

for (const [id, credit] of Object.entries(credits)) {
  const src = path.join("public", credit.file.replace(/^\//, ""));
  if (!fs.existsSync(src)) {
    console.log(`? ${id} — ${src} missing`);
    continue;
  }
  if (src.endsWith(".webp")) continue;

  const dest = path.join(DIR, `${id}.webp`);
  const srcSize = fs.statSync(src).size;
  await sharp(src)
    .resize({ width, withoutEnlargement: true })
    .webp({ quality })
    .toFile(dest);

  before += srcSize;
  after += fs.statSync(dest).size;
  converted++;
  credit.file = `/cars/${id}.webp`;
  if (!keepOriginals) fs.unlinkSync(src);
}

fs.writeFileSync(CREDITS_PATH, JSON.stringify(credits, null, 2) + "\n");

const mb = (n) => (n / 1024 / 1024).toFixed(1) + " MB";
console.log(`${converted} images converted: ${mb(before)} -> ${mb(after)}`);

/**
 * Flag anything the 4:3 tile will cut badly.
 *
 * This resize keeps the source shape, and the tile crops to 4:3 from the
 * centre, so a 2.5:1 photo loses nearly half its width with nothing choosing
 * which half — 70 published photos were in that state before being re-cropped
 * by hand. Warn rather than crop automatically: which part of a wide photo
 * holds the car is a judgment a script keeps getting wrong, which is why
 * recrop-wide-images.mjs offers candidates for review instead of deciding.
 */
const wide = [];
for (const id of Object.keys(credits)) {
  const file = path.join(DIR, `${id}.webp`);
  if (!fs.existsSync(file)) continue;
  const meta = await sharp(file).metadata();
  const aspect = meta.width / meta.height;
  if (aspect > 2.0) wide.push([id, aspect]);
}
if (wide.length) {
  console.log(`\n${wide.length} photo(s) wider than 2:1 — the tile will cut off the sides:`);
  for (const [id, aspect] of wide.sort((a, b) => b[1] - a[1])) {
    console.log(`  ${id} — ${aspect.toFixed(2)}:1, keeps ${Math.round((4 / 3 / aspect) * 100)}% of its width`);
  }
  console.log("  Fix with: node scripts/recrop-wide-images.mjs --fetch && --candidates");
}
