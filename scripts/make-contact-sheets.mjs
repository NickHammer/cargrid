/**
 * Builds labeled contact sheets of the downloaded car images so a human (or
 * Claude) can check that each picture shows the right model AND the right
 * generation — the fetcher cannot tell, and a nameplate's lead image is usually
 * the current generation, not the one the record describes.
 *
 * Each tile is captioned with the car id and its production years, which is
 * what the reviewer checks the bodywork against. Two separate questions get
 * asked of every tile: is it the right model AND generation, and does the car
 * actually fill the frame (a car lost in a wide landscape shot makes a useless
 * tile once it is cropped to 4:3).
 *
 * Usage:
 *   node scripts/make-contact-sheets.mjs [--out <dir>] [--per 12] [--unverified]
 *
 * Writes sheet-01.jpg, sheet-02.jpg, … plus sheets.json listing the tile order.
 * Output goes outside the repo by default; pass --out to choose where.
 */

import fs from "fs";
import path from "path";
import sharp from "sharp";

const CARS_PATH = process.env.CARS_PATH || "data/cars.json";
const CREDITS_PATH = process.env.CREDITS_PATH || "data/image-credits.json";

const argv = process.argv.slice(2);
const argOf = (name, fallback) => {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
};

const outDir = argOf("--out", "contact-sheets");
const perSheet = parseInt(argOf("--per", "12"), 10);
const onlyUnverified = argv.includes("--unverified");

// Match the 4:3 tile shape used by src/components/Grid.tsx, so what gets
// reviewed is exactly what players see — framing problems only show up at the
// real aspect ratio.
const TILE_W = 320;
const TILE_H = 240;
const LABEL_H = 34;
const COLS = 4;

const cars = JSON.parse(fs.readFileSync(CARS_PATH, "utf8"));
const credits = JSON.parse(fs.readFileSync(CREDITS_PATH, "utf8"));

const entries = cars
  .filter((c) => credits[c.id] && (!onlyUnverified || !credits[c.id].verified))
  .map((c) => ({
    car: c,
    credit: credits[c.id],
    file: path.join("public", credits[c.id].file.replace(/^\//, "")),
  }))
  .filter((e) => fs.existsSync(e.file));

if (!entries.length) {
  console.log("Nothing to sheet.");
  process.exit(0);
}

const escapeXml = (s) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function labelSvg(car, credit) {
  const years = `${car.production_start}–${car.production_end ?? "now"}`;
  const left = escapeXml(`${car.id}  ${years}`);
  const right = escapeXml(credit.matched);
  return Buffer.from(
    `<svg width="${TILE_W}" height="${LABEL_H}">
      <rect width="100%" height="100%" fill="#111827"/>
      <text x="6" y="14" font-family="monospace" font-size="11" fill="#fbbf24">${left}</text>
      <text x="6" y="28" font-family="monospace" font-size="10" fill="#9ca3af">${right}</text>
    </svg>`
  );
}

async function tile(entry) {
  const image = await sharp(entry.file)
    .resize(TILE_W, TILE_H, { fit: "cover", position: "centre" })
    .toBuffer();
  return sharp({
    create: {
      width: TILE_W,
      height: TILE_H + LABEL_H,
      channels: 3,
      background: { r: 17, g: 24, b: 39 },
    },
  })
    .composite([
      { input: image, top: 0, left: 0 },
      { input: labelSvg(entry.car, entry.credit), top: TILE_H, left: 0 },
    ])
    .jpeg({ quality: 82 })
    .toBuffer();
}

fs.mkdirSync(outDir, { recursive: true });
const manifest = [];

for (let s = 0; s * perSheet < entries.length; s++) {
  const batch = entries.slice(s * perSheet, (s + 1) * perSheet);
  const rows = Math.ceil(batch.length / COLS);
  const tiles = await Promise.all(batch.map(tile));

  const sheet = sharp({
    create: {
      width: COLS * TILE_W,
      height: rows * (TILE_H + LABEL_H),
      channels: 3,
      background: { r: 17, g: 24, b: 39 },
    },
  }).composite(
    tiles.map((input, i) => ({
      input,
      left: (i % COLS) * TILE_W,
      top: Math.floor(i / COLS) * (TILE_H + LABEL_H),
    }))
  );

  const name = `sheet-${String(s + 1).padStart(2, "0")}.jpg`;
  await sheet.jpeg({ quality: 80 }).toFile(path.join(outDir, name));
  manifest.push({ sheet: name, ids: batch.map((e) => e.car.id) });
  console.log(`${name}: ${batch.map((e) => e.car.id).join(", ")}`);
}

fs.writeFileSync(path.join(outDir, "sheets.json"), JSON.stringify(manifest, null, 2));
console.log(`\n${manifest.length} sheet(s) covering ${entries.length} cars -> ${outDir}`);
