/**
 * Re-crops over-wide car photos to the 4:3 shape the grid tile actually shows.
 *
 * Why this exists: the optimiser stores whatever shape Commons gave us, and the
 * tile is 4:3 with `object-cover`, so the browser throws away the sides of a
 * wide photo — half the width of a 2.66:1 shot. Nothing chose which half, so
 * the car can end up with its nose or tail outside the tile.
 *
 * The published 640px webp is too small to re-crop well (a 4:3 window out of
 * 640x241 is 321px wide for a ~300px tile, with nothing spare), and the fetched
 * original was deleted, so this re-downloads a large copy from Commons first.
 * The Commons file name is recoverable from the `source` URL already recorded in
 * data/image-credits.json for the attribution page.
 *
 * Usage:
 *   node scripts/recrop-wide-images.mjs --fetch              # cache big originals
 *   node scripts/recrop-wide-images.mjs --candidates         # crops + review sheets
 *   node scripts/recrop-wide-images.mjs --apply picks.json   # publish chosen crops
 */

import fs from "fs";
import path from "path";
import sharp from "sharp";

// `--apply` overwrites the very files this script has just measured, and on
// Windows that failed with `UNKNOWN: errno -4094` every time: libvips keeps the
// images it has opened in its cache, memory-mapped, so the handle is still live
// when the overwrite comes. The same write succeeds from a fresh process, which
// is what made this look like a copyFileSync bug and sent the last two attempts
// after the wrong fix. The cache only saves re-decoding a file within one run,
// which this script never does.
sharp.cache(false);

const CREDITS_PATH = process.env.CREDITS_PATH || "data/image-credits.json";
const DIR = "public/cars";
const WORK = process.env.RECROP_WORK || "recrop-work";
const CACHE = path.join(WORK, "originals");
const CROPS = path.join(WORK, "crops");
const SHEETS = path.join(WORK, "sheets");

const UA = { "User-Agent": "CarGridCuration/1.0 (https://cargrid.fun)" };
const argv = process.argv.slice(2);
const argOf = (n, d) => {
  const i = argv.indexOf(n);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : d;
};
const MIN_ASPECT = parseFloat(argOf("--min-aspect", "2.0"));
const OUT_W = parseInt(argOf("--width", "640"), 10);
const QUALITY = parseInt(argOf("--quality", "80"), 10);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const credits = JSON.parse(fs.readFileSync(CREDITS_PATH, "utf8"));

/** Commons file name out of the File: page URL kept for attribution. */
function commonsFileName(credit) {
  const m = /\/File:(.+)$/.exec(credit.source || "");
  if (!m) return null;
  return decodeURIComponent(m[1]).replace(/_/g, " ");
}

/** The published photos whose sides the tile is currently cutting off. */
async function wideCars() {
  const out = [];
  for (const [id, credit] of Object.entries(credits)) {
    const file = path.join(DIR, id + ".webp");
    if (!credit.verified || !fs.existsSync(file)) continue;
    const m = await sharp(file).metadata();
    const aspect = m.width / m.height;
    if (aspect > MIN_ASPECT) out.push({ id, credit, aspect, w: m.width, h: m.height });
  }
  return out.sort((a, b) => b.aspect - a.aspect);
}

async function fetchOriginals(cars) {
  fs.mkdirSync(CACHE, { recursive: true });
  let got = 0;
  let skipped = 0;
  const failed = [];
  for (const car of cars) {
    const existing = fs.readdirSync(CACHE).find((f) => f.startsWith(car.id + "."));
    if (existing) {
      skipped++;
      continue;
    }
    const name = commonsFileName(car.credit);
    if (!name) {
      failed.push([car.id, "no File: name in source URL"]);
      continue;
    }
    try {
      // 2400px wide is ample: a 4:3 window out of it is >=1200px for a 640px tile.
      const api =
        "https://commons.wikimedia.org/w/api.php?action=query&format=json" +
        "&prop=imageinfo&iiprop=url&iiurlwidth=2400&titles=" +
        encodeURIComponent("File:" + name);
      const res = await fetch(api, { headers: UA });
      const data = await res.json();
      const page = Object.values(data?.query?.pages ?? {})[0];
      const info = page?.imageinfo?.[0];
      if (!info) {
        failed.push([car.id, 'Commons has no file "' + name + '"']);
        continue;
      }
      const url = info.thumburl ?? info.url;
      const img = await fetch(url, { headers: UA });
      if (!img.ok) {
        failed.push([car.id, "HTTP " + img.status]);
        continue;
      }
      const ext = (path.extname(new URL(url).pathname) || ".jpg").toLowerCase();
      fs.writeFileSync(
        path.join(CACHE, car.id + (ext === ".jpeg" ? ".jpg" : ext)),
        Buffer.from(await img.arrayBuffer()),
      );
      got++;
      await sleep(250); // be polite to Commons
    } catch (err) {
      failed.push([car.id, err.message]);
    }
  }
  console.log(got + " downloaded, " + skipped + " already cached, " + failed.length + " failed");
  for (const [id, why] of failed) console.log("  ! " + id + " — " + why);
  return failed;
}

const original = (id) => {
  if (!fs.existsSync(CACHE)) return null;
  const f = fs.readdirSync(CACHE).find((x) => x.startsWith(id + "."));
  return f ? path.join(CACHE, f) : null;
};

/**
 * Three ways to pick the 4:3 window, because none of them knows what a car is:
 *   centre    — what the browser does today, kept as the baseline to beat
 *   attention — sharp's busiest-region guess
 *   entropy   — sharp's most-detailed-region guess
 * Every one gets looked at; attention happily locks onto a tree or a road sign.
 */
const STRATEGIES = {
  centre: "centre",
  attention: sharp.strategy.attention,
  entropy: sharp.strategy.entropy,
};

/**
 * The fourth option, for photos no crop can save.
 *
 * When the car fills the full width of a 2.6:1 frame, every 4:3 window holds a
 * door and a wheel and nothing you could name. So instead of cutting, fit the
 * whole photo into the tile and fill the band above and below with a blurred,
 * darkened blow-up of the photo itself. The car stays whole and the tile stays
 * 4:3; the filler reads as background rather than as two black bars.
 */
async function fitWithBlurredFill(src, w, h, quality) {
  const photo = await sharp(src).resize(w, null).toBuffer();
  const { height: ph } = await sharp(photo).metadata();
  const backdrop = await sharp(src)
    .resize(w, h, { fit: "cover", position: "centre" })
    .blur(18)
    .modulate({ brightness: 0.55, saturation: 0.6 })
    .toBuffer();
  return sharp(backdrop)
    .composite([{ input: photo, top: Math.round((h - ph) / 2), left: 0 }])
    .webp({ quality })
    .toBuffer();
}

async function makeCandidates(cars) {
  fs.mkdirSync(CROPS, { recursive: true });
  fs.mkdirSync(SHEETS, { recursive: true });
  const made = [];
  for (const car of cars) {
    const src = original(car.id);
    if (!src) {
      console.log("  ! " + car.id + " — no cached original");
      continue;
    }
    // Three of these files are small on Commons itself (the smallest is
    // 600x286), so a 640px 4:3 crop would be an upscale. Fall back to the
    // largest 4:3 window the source actually holds — still wider than the
    // ~300px the tile displays, which is what matters.
    const meta = await sharp(src).metadata();
    const w = Math.min(OUT_W, meta.height * (4 / 3), meta.width);
    const h = Math.round((w * 3) / 4);
    for (const [label, position] of Object.entries(STRATEGIES)) {
      await sharp(src)
        .resize(Math.round(w), h, { fit: "cover", position })
        .webp({ quality: QUALITY })
        .toFile(path.join(CROPS, car.id + "__" + label + ".webp"));
    }
    fs.writeFileSync(
      path.join(CROPS, car.id + "__whole.webp"),
      await fitWithBlurredFill(src, Math.round(w), h, QUALITY),
    );
    made.push(car);
  }
  console.log(made.length + " cars x " + Object.keys(STRATEGIES).length + " crops");
  return made;
}

/** One row per car: the candidates side by side, labelled. */
async function makeSheets(cars, perSheet = 4) {
  const labels = [...Object.keys(STRATEGIES), "whole"];
  const TH_W = 300;
  const TH_H = 225;
  const PAD = 24;
  const NAME_H = 20;
  const rowH = TH_H + NAME_H + PAD;
  for (let s = 0; s * perSheet < cars.length; s++) {
    const batch = cars.slice(s * perSheet, (s + 1) * perSheet);
    const W = labels.length * (TH_W + PAD) + PAD;
    const H = batch.length * rowH + PAD + 24;
    const composites = [];
    let svg =
      '<svg width="' + W + '" height="' + H + '" xmlns="http://www.w3.org/2000/svg">' +
      '<rect width="' + W + '" height="' + H + '" fill="#14181d"/>' +
      "<style>text{font-family:sans-serif;fill:#e8eaed}</style>";
    labels.forEach((l, i) => {
      svg +=
        '<text x="' + (PAD + i * (TH_W + PAD) + TH_W / 2) + '" y="18" font-size="15"' +
        ' text-anchor="middle" fill="#ff9d00">' + l + "</text>";
    });
    for (let r = 0; r < batch.length; r++) {
      const y = 24 + PAD + r * rowH;
      svg +=
        '<text x="' + PAD + '" y="' + (y - 6) + '" font-size="14">' +
        batch[r].id + "  (" + batch[r].aspect.toFixed(2) + ":1)</text>";
      for (let i = 0; i < labels.length; i++) {
        composites.push({
          input: await sharp(path.join(CROPS, batch[r].id + "__" + labels[i] + ".webp"))
            .resize(TH_W, TH_H)
            .png()
            .toBuffer(),
          left: PAD + i * (TH_W + PAD),
          top: y,
        });
      }
    }
    svg += "</svg>";
    const out = path.join(SHEETS, "sheet-" + String(s + 1).padStart(2, "0") + ".png");
    await sharp(Buffer.from(svg)).composite(composites).png().toFile(out);
    console.log("  " + out);
  }
}

/** picks.json: { "<car id>": "centre" | "attention" | "entropy" | "keep" } */
async function apply(picksPath) {
  const picks = JSON.parse(fs.readFileSync(picksPath, "utf8"));
  let applied = 0;
  let kept = 0;
  for (const [id, choice] of Object.entries(picks)) {
    if (choice === "keep") {
      kept++;
      continue;
    }
    const src = path.join(CROPS, id + "__" + choice + ".webp");
    if (!fs.existsSync(src)) throw new Error("no crop " + src);
    // Read-then-write rather than copyFileSync: on Windows the latter fails
    // here with UNKNOWN errno -4094 overwriting a published image, which has
    // bitten this repo more than once. These files are a few hundred KB, so
    // buffering one costs nothing.
    fs.writeFileSync(path.join(DIR, id + ".webp"), fs.readFileSync(src));
    applied++;
  }
  console.log(applied + " re-cropped, " + kept + " left as they were");
}

const cars = await wideCars();
console.log(cars.length + " published photos wider than " + MIN_ASPECT + ":1");
if (argv.includes("--fetch")) await fetchOriginals(cars);
else if (argv.includes("--candidates")) await makeSheets(await makeCandidates(cars));
else if (argv.includes("--apply")) await apply(argOf("--apply"));
else console.log("nothing to do — pass --fetch, --candidates or --apply <picks.json>");
