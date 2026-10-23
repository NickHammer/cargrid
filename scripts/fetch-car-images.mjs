/**
 * Fetches one candidate image per car from Wikipedia/Wikimedia Commons.
 *
 * Usage:
 *   node scripts/fetch-car-images.mjs                 # every car without a credit entry
 *   node scripts/fetch-car-images.mjs <car-id> [...]  # re-fetch specific cars (overwrites)
 *   node scripts/fetch-car-images.mjs --unverified    # re-fetch everything not marked verified
 *
 * Strategies are tried in order, most generation-specific first:
 *   0. pinned       — a hand-picked Commons file (PINNED_FILES)
 *   1. article      — lead image of a generation-specific article (OVERRIDES)
 *   2. category     — a file from the generation's Commons category
 *   3. search       — a Commons file search seeded with the launch year
 *   4. main-article — lead image of the bare "Make Model" article (last resort;
 *                     usually shows the *current* generation, so these need the
 *                     closest look during review)
 *
 * Every candidate must live on Commons, which guarantees a free license — local
 * enwiki files can be non-free. Attribution is recorded in data/image-credits.json.
 *
 * Images still need visual verification (right model AND generation) before
 * cars.json image_url is set; scripts/make-contact-sheets.mjs builds sheets for
 * that review, and scripts/apply-image-urls.mjs only wires up entries whose
 * credit record is marked "verified": true.
 */

import fs from "fs";
import path from "path";

const CARS_PATH = "data/cars.json";
const CREDITS_PATH = "data/image-credits.json";
const OUT_DIR = "public/cars";

const UA = {
  "User-Agent": "CarGridCuration/1.0 (https://github.com/NickHammer/cargrid.io)",
  Accept: "application/json",
};

// Hand-picked Commons files, used ahead of every other strategy. These are the
// cars where automated resolution kept landing on the wrong generation — a
// nameplate article's lead image is almost always the *current* car, and a
// free-text search for "Ford GT" is swamped by Mustang GTs.
const PINNED_FILES = {
  "toyota-yaris-g1": "1999 Toyota Yaris GLS 1.0 (Front).jpg",
  "toyota-rav4-g1": "1997 Toyota Rav4, Front Left, 05-01-2021.jpg",
  "toyota-land-cruiser-g1": "Toyota jeep-bj 1951 pictures 1 b.jpg",
  "honda-accord-g1": "Honda Accord 1.6 (first generation), Pandaan.jpg",
  "ford-fusion-g1": "2010 Ford Fusion in Smokestone Metallic, front left, 10-12-2025.jpg",
  "ford-gt-g1": "2006 Ford GT Petersen Automotive Museum.jpg",
  // Distinct from ford-f-250-g1, which takes the F-Series article lead image.
  "ford-f-350-g1": "1955 Ford F-100 Standard Cab Pickup (44976781304).jpg",
  "chevrolet-silverado-g1": "1999-2002 Chevrolet Silverado 1500 extended.jpg",
  "chevrolet-blazer-g1": "1970 Chevrolet Blazer (35016494241).jpg",
  "subaru-impreza-g1": "1996-1997 Subaru Impreza (GC) 1.6 GX Sedan (07-08-2017) 01.jpg",
  "porsche-cayenne-g1": "2003-2006 Porsche Cayenne (9PA) S wagon 01.jpg",
  "porsche-panamera-g1": "Porsche Panamera 4S (970) – Frontansicht, 7. August 2012, Tübingen.jpg",
  "nissan-maxima-g1": "Datsun 810 Maxima Wagon Diesel.jpg",
  "bmw-z4-g1": "'03-'05 BMW Z4 Roadster (Orange Julep).jpg",
  "audi-a6-g1": "1996 Audi A6 2.5 TDI (C4).jpg",
  "mercedes-benz-amg-gt-g1": "2015-2017 Mercedes-AMG GT (C 190) S coupe (2017-07-15) 01.jpg",
  "mercedes-benz-g-class-g1": "1989 Mercedes-Benz 280 GE (W460) (4535432871).jpg",
};

// Generation-specific article titles. Missing/wrong guesses fall through to the
// next strategy; "Make Model" is always the final fallback.
const OVERRIDES = {
  "ford-mustang-g1": ["Ford Mustang (first generation)"],
  "porsche-911-g1": ["Porsche 911 (classic)"],
  "toyota-corolla-g1": ["Toyota Corolla (E10)"],
  "dodge-viper-g1": ["Dodge Viper (SR I)"],
  "subaru-crosstrek-g1": ["Subaru XV"],
  "bmw-m3-g1": ["BMW M3 (E30)"],
  "toyota-supra-g1": ["Toyota Supra (A40)", "Toyota Celica Supra"],
  "toyota-camry-g1": ["Toyota Camry (V10)"],
  "toyota-avalon-g1": ["Toyota Avalon (XX10)"],
  "toyota-sienna-g1": ["Toyota Sienna (XL10)"],
  "toyota-4runner-g1": ["Toyota 4Runner (N60)"],
  "toyota-crown-g1": ["Toyopet Crown", "Toyota Crown (RS)"],
  "toyota-prius-g1": ["Toyota Prius (XW10)"],
  "toyota-yaris-g1": ["Toyota Yaris (XP10)", "Toyota Vitz"],
  "toyota-c-hr-g1": ["Toyota C-HR (AX10)"],
  "toyota-rav4-g1": ["Toyota RAV4 (XA10)"],
  "toyota-highlander-g1": ["Toyota Highlander (XU20)"],
  "toyota-sequoia-g1": ["Toyota Sequoia (XK30/XK40)", "Toyota Sequoia (XK30)"],
  "toyota-land-cruiser-g1": ["Toyota Land Cruiser (J20)", "Toyota BJ"],
  "honda-civic-g1": ["Honda Civic (first generation)"],
  "honda-accord-g1": ["Honda Accord (first generation)"],
  "honda-fit-g1": ["Honda Fit (GD)", "Honda Fit (first generation)"],
  "honda-odyssey-g1": ["Honda Odyssey (RA1)", "Honda Odyssey (international)"],
  "honda-cr-v-g1": ["Honda CR-V (RD1)", "Honda CR-V (first generation)"],
  "honda-pilot-g1": ["Honda Pilot (YF1)"],
  "honda-ridgeline-g1": ["Honda Ridgeline (YK1)"],
  "honda-passport-g1": ["Isuzu Rodeo"],
  "ford-explorer-g1": ["Ford Explorer (first generation)", "Ford Explorer (UN46)"],
  "ford-f-150-g1": ["Ford F-Series (sixth generation)"],
  "ford-f-250-g1": ["Ford F-Series (second generation)"],
  "ford-f-350-g1": ["Ford F-Series (second generation)"],
  "ford-focus-g1": ["Ford Focus (first generation)"],
  "ford-bronco-g1": ["Ford Bronco (first generation)"],
  "ford-taurus-g1": ["Ford Taurus (first generation)"],
  "ford-fusion-g1": ["Ford Fusion (Americas)"],
  "ford-maverick-g1": ["Ford Maverick (1970–1977)", "Ford Maverick (Americas)"],
  "ford-ranger-g1": ["Ford Ranger (Americas)"],
  "ford-edge-g1": ["Ford Edge (first generation)"],
  "ford-escape-g1": ["Ford Escape (first generation)"],
  "ford-expedition-g1": ["Ford Expedition (first generation)", "Ford Expedition (UN93)"],
  "chevrolet-camaro-g1": ["Chevrolet Camaro (first generation)"],
  "chevrolet-corvette-g1": ["Chevrolet Corvette (C1)"],
  "chevrolet-impala-g1": ["Chevrolet Impala (first generation)"],
  "chevrolet-malibu-g1": ["Chevrolet Chevelle"],
  "chevrolet-silverado-g1": ["Chevrolet Silverado (GMT800)"],
  "chevrolet-blazer-g1": ["Chevrolet K5 Blazer"],
  "chevrolet-trailblazer-g1": ["Chevrolet TrailBlazer"],
  "chevrolet-cruze-g1": ["Chevrolet Cruze (J300)"],
  "chevrolet-bolt-ev-g1": ["Chevrolet Bolt"],
  "dodge-charger-g1": ["Dodge Charger (B-body)"],
  "dodge-grand-caravan-g1": ["Dodge Caravan"],
  "dodge-neon-g1": ["Chrysler Neon"],
  "dodge-dart-g4": ["Dodge Dart"],
  "subaru-wrx-g1": ["Subaru WRX (VA)"],
  "subaru-outback-g1": ["Subaru Outback (first generation)"],
  "subaru-forester-g1": ["Subaru Forester (SF)"],
  "subaru-impreza-g1": ["Subaru Impreza (first generation)"],
  "subaru-legacy-g1": ["Subaru Legacy (first generation)"],
  "porsche-cayenne-g1": ["Porsche Cayenne (9PA)"],
  "porsche-boxster-g1": ["Porsche Boxster (986)", "Porsche 986"],
  "porsche-panamera-g1": ["Porsche Panamera (970)"],
  "nissan-frontier-g1": ["Nissan Navara (D22)"],
  "nissan-pathfinder-g1": ["Nissan Pathfinder (WD21)"],
  "nissan-rogue-g1": ["Nissan Rogue (S35)"],
  "nissan-murano-g1": ["Nissan Murano (Z50)"],
  "nissan-altima-g1": ["Nissan Altima (U13)"],
  "nissan-maxima-g1": ["Datsun Maxima", "Datsun 810"],
  "nissan-sentra-g1": ["Nissan Sentra (B11)"],
  "nissan-versa-g1": ["Nissan Tiida"],
  "bmw-m5-g1": ["BMW M5 (E28)"],
  "bmw-x1-g1": ["BMW X1 (E84)"],
  "bmw-x2-g1": ["BMW X2 (F39)"],
  "bmw-x3-g1": ["BMW X3 (E83)"],
  "bmw-x5-g1": ["BMW X5 (E53)"],
  "bmw-x6-g1": ["BMW X6 (E71)"],
  "bmw-z4-g1": ["BMW Z4 (E85)"],
  "audi-r8-g1": ["Audi R8 (Type 42)"],
  "audi-a3-g1": ["Audi A3 (8L)"],
  "audi-a4-g1": ["Audi A4 (B5)"],
  "audi-a5-g1": ["Audi A5 (8T)"],
  "audi-a6-g1": ["Audi A6 (C4)"],
  "audi-a8-g1": ["Audi A8 (D2)"],
  "audi-q3-g1": ["Audi Q3 (8U)"],
  "audi-q5-g1": ["Audi Q5 (8R)"],
  "audi-q7-g1": ["Audi Q7 (4L)"],
  "mercedes-benz-c-class-g1": ["Mercedes-Benz C-Class (W202)"],
  "mercedes-benz-e-class-g1": ["Mercedes-Benz W124"],
  "mercedes-benz-s-class-g1": ["Mercedes-Benz W116"],
  "mercedes-benz-g-class-g1": ["Mercedes-Benz G-Class"],
  "aston-martin-vantage-g1": ["Aston Martin V8 Vantage (2005)"],
  "mazda-rx-7-g1": ["Mazda RX-7 (FB)"],
  "acura-nsx-g1": ["Honda NSX (first generation)"],
  "rolls-royce-phantom-g1": ["Rolls-Royce Phantom VII"],
  "ford-gt-g1": ["Ford GT (first generation)"],
  "bmw-m6-g1": ["BMW M6 (E24)", "BMW M635CSi"],
  "nissan-juke-g1": ["Nissan Juke (F15)"],
  "nissan-leaf-g1": ["Nissan Leaf (ZE0)"],
  "nissan-armada-g1": ["Nissan Armada (TA60)"],
  "chevrolet-traverse-g1": ["Chevrolet Traverse (first generation)"],
  "mercedes-benz-amg-gt-g1": ["Mercedes-AMG GT (C190)"],
};

// Commons category hints, used before falling back to a free-text file search.
// Most of these exist because the nameplate's lead image shows the *current*
// generation, which is the single most common way this fetcher goes wrong.
const CATEGORY_HINTS = {
  "ford-maverick-g1": ["Ford Maverick (1970)"],
  "dodge-dart-g4": ["Dodge Dart (1967-1976)", "Dodge Dart"],
  "honda-passport-g1": ["Honda Passport (first generation)"],
  "nissan-rogue-g1": ["Nissan Rogue (S35)", "Nissan X-Trail (T31)"],
  "toyota-yaris-g1": ["Toyota Vitz (XP10)", "Toyota Yaris (XP10)"],
  "toyota-rav4-g1": ["Toyota RAV4 (XA10)"],
  "toyota-land-cruiser-g1": ["Toyota Land Cruiser BJ", "Toyota Land Cruiser (J20)"],
  "honda-accord-g1": ["Honda Accord (first generation)"],
  "honda-cr-v-g1": ["Honda CR-V (RD1)", "Honda CR-V (first generation)"],
  "ford-f-350-g1": ["Ford F-350 (1953-1956)", "Ford F-Series (second generation)"],
  "ford-expedition-g1": ["Ford Expedition (UN93)"],
  "ford-fusion-g1": ["Ford Fusion (Americas) (first generation)", "Ford Fusion (Americas)"],
  "ford-gt-g1": ["Ford GT (2005)"],
  "chevrolet-silverado-g1": ["Chevrolet Silverado (GMT800)"],
  "chevrolet-traverse-g1": ["Chevrolet Traverse (first generation)"],
  "chevrolet-blazer-g1": ["Chevrolet K5 Blazer (1969-1972)", "Chevrolet Blazer (first generation)"],
  "dodge-neon-g1": ["Dodge Neon (first generation)", "Chrysler Neon (first generation)"],
  "subaru-forester-g1": ["Subaru Forester (SF)"],
  "subaru-impreza-g1": ["Subaru Impreza (first generation)", "Subaru Impreza (GC)"],
  "porsche-cayenne-g1": ["Porsche Cayenne (955)", "Porsche Cayenne (9PA)"],
  "porsche-macan-g1": ["Porsche Macan (95B)"],
  "porsche-panamera-g1": ["Porsche Panamera (970)"],
  "nissan-armada-g1": ["Nissan Armada (TA60)"],
  "nissan-altima-g1": ["Nissan Altima (U13)"],
  "nissan-maxima-g1": ["Datsun Maxima", "Nissan Maxima (U11)"],
  "nissan-juke-g1": ["Nissan Juke (F15)"],
  "nissan-leaf-g1": ["Nissan Leaf (ZE0)"],
  "bmw-i3-g1": ["BMW i3 (I01)", "BMW i3"],
  "bmw-m6-g1": ["BMW M635CSi", "BMW M6 (E24)"],
  "bmw-z4-g1": ["BMW Z4 (E85)"],
  "audi-a6-g1": ["Audi A6 C4"],
  "audi-a8-g1": ["Audi A8 D2"],
  "audi-q5-g1": ["Audi Q5 (8R)"],
  "mercedes-benz-amg-gt-g1": ["Mercedes-Benz C190"],
  "mercedes-benz-g-class-g1": ["Mercedes-Benz W460"],
};

// Explicit Commons search queries, tried before the generic make/model/year
// ones when a car needs a chassis code or an old marque name to disambiguate.
const SEARCH_HINTS = {
  "nissan-maxima-g1": ["Datsun 810 Maxima 1982", "Datsun Maxima 1983"],
  "bmw-m6-g1": ["BMW M635CSi 1985"],
  "mercedes-benz-g-class-g1": ["Mercedes-Benz 280 GE 1982", "Mercedes-Benz G-Class 1985"],
  "toyota-land-cruiser-g1": ["Toyota Land Cruiser BJ 1953", "Toyota Jeep BJ"],
  "ford-gt-g1": ["Ford GT 2005", "Ford GT 2006"],
  "ford-f-350-g1": ["Ford F-350 1955", "Ford F-Series 1956 truck"],
  "subaru-impreza-g1": ["Subaru Impreza 1995 sedan", "Subaru Impreza 1997"],
  "porsche-cayenne-g1": ["Porsche Cayenne 2004", "Porsche Cayenne 2006"],
  "porsche-macan-g1": ["Porsche Macan 2015", "Porsche Macan 2016"],
  "porsche-panamera-g1": ["Porsche Panamera 2011", "Porsche Panamera 2012"],
  "audi-a6-g1": ["Audi A6 1996 C4", "Audi A6 1995"],
  "audi-a8-g1": ["Audi A8 1998 D2", "Audi A8 1997"],
  "audi-q5-g1": ["Audi Q5 2010", "Audi Q5 2012"],
  "bmw-i3-g1": ["BMW i3 2015", "BMW i3 2016"],
  "bmw-z4-g1": ["BMW Z4 2004 E85", "BMW Z4 2006"],
  "nissan-armada-g1": ["Nissan Armada 2006", "Nissan Armada 2008"],
  "nissan-altima-g1": ["Nissan Altima 1995", "Nissan Altima 1996"],
  "nissan-juke-g1": ["Nissan Juke 2012", "Nissan Juke 2014"],
  "nissan-leaf-g1": ["Nissan Leaf 2013", "Nissan Leaf 2015"],
  "nissan-rogue-g1": ["Nissan Rogue 2009", "Nissan Rogue 2011"],
  "chevrolet-traverse-g1": ["Chevrolet Traverse 2010", "Chevrolet Traverse 2012"],
  "chevrolet-silverado-g1": ["Chevrolet Silverado 2001", "Chevrolet Silverado 2003"],
  "chevrolet-blazer-g1": ["Chevrolet Blazer 1970", "Chevrolet K5 Blazer 1971"],
  "dodge-neon-g1": ["Dodge Neon 1996", "Dodge Neon 1998"],
  "ford-fusion-g1": ["Ford Fusion 2007 sedan", "Ford Fusion 2009 sedan"],
  "ford-expedition-g1": ["Ford Expedition 1998", "Ford Expedition 2000"],
  "toyota-rav4-g1": ["Toyota RAV4 1996", "Toyota RAV4 1998"],
  "toyota-yaris-g1": ["Toyota Yaris 2001", "Toyota Vitz 2000"],
  "honda-accord-g1": ["Honda Accord 1978", "Honda Accord 1980"],
  "honda-cr-v-g1": ["Honda CR-V 1998", "Honda CR-V 2000"],
  "subaru-forester-g1": ["Subaru Forester 1999", "Subaru Forester 2001"],
  "mercedes-benz-amg-gt-g1": ["Mercedes-AMG GT 2016", "Mercedes-AMG GT 2017"],
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getJson(url) {
  const res = await fetch(url, { headers: UA });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
}

// --- strategy 1/4: lead image of an article -------------------------------

async function pageImage(title) {
  const url =
    "https://en.wikipedia.org/w/api.php?action=query&format=json&redirects=1" +
    "&prop=pageimages&piprop=name&titles=" + encodeURIComponent(title);
  const data = await getJson(url);
  const page = Object.values(data?.query?.pages ?? {})[0];
  if (!page || page.missing !== undefined || !page.pageimage) return null;
  return { file: page.pageimage, article: page.title };
}

// --- strategy 2: files in a Commons category ------------------------------

async function categoryFiles(category) {
  const url =
    "https://commons.wikimedia.org/w/api.php?action=query&format=json" +
    "&list=categorymembers&cmtype=file&cmlimit=40&cmtitle=" +
    encodeURIComponent("Category:" + category);
  const data = await getJson(url);
  return (data?.query?.categorymembers ?? []).map((m) => m.title.replace(/^File:/, ""));
}

// --- strategy 3: Commons file search --------------------------------------

async function searchFiles(query) {
  const url =
    "https://commons.wikimedia.org/w/api.php?action=query&format=json" +
    "&list=search&srnamespace=6&srlimit=25&srsearch=" + encodeURIComponent(query);
  const data = await getJson(url);
  return (data?.query?.search ?? []).map((m) => m.title.replace(/^File:/, ""));
}

/**
 * Ranks candidate filenames for a car. A year in the filename that falls inside
 * the generation's production run is the strongest signal available without
 * looking at the picture.
 */
function scoreFile(fileName, car) {
  const name = fileName.toLowerCase();
  if (!/\.(jpe?g|png)$/i.test(fileName)) return -1;
  // Interiors, engine bays, badges and brochures make poor grid tiles.
  if (/(interior|engine|dashboard|badge|logo|emblem|wheel|brochure|rear|taillight|headlight)/.test(name)) {
    return -1;
  }
  let score = 0;
  const end = car.production_end ?? new Date().getFullYear();
  const years = [...name.matchAll(/\b(19|20)\d{2}\b/g)].map((m) => Number(m[0]));
  if (years.length) {
    score += years.some((y) => y >= car.production_start - 1 && y <= end + 1) ? 12 : -8;
  }
  for (const word of car.model.toLowerCase().split(/[\s-]+/)) {
    if (word.length > 1 && name.includes(word)) score += 3;
  }
  if (name.includes(car.make.toLowerCase())) score += 2;
  if (/(front|side|profile|3-4|three.quarter)/.test(name)) score += 2;
  return score;
}

// --- shared: Commons file info --------------------------------------------

async function commonsInfo(fileName) {
  const url =
    "https://commons.wikimedia.org/w/api.php?action=query&format=json" +
    "&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=800&titles=" +
    encodeURIComponent("File:" + fileName);
  const data = await getJson(url);
  const page = Object.values(data?.query?.pages ?? {})[0];
  const info = page?.imageinfo?.[0];
  if (!info || page.missing !== undefined) return null;
  const meta = info.extmetadata ?? {};
  const strip = (s) => (s ?? "").replace(/<[^>]*>/g, "").trim();
  return {
    thumbUrl: info.thumburl ?? info.url,
    license: strip(meta.LicenseShortName?.value) || "unknown",
    artist: strip(meta.Artist?.value) || "unknown",
    source: info.descriptionurl,
  };
}

async function download(url, destBase) {
  const res = await fetch(url, { headers: { "User-Agent": UA["User-Agent"] } });
  if (!res.ok) throw new Error(`HTTP ${res.status} downloading ${url}`);
  const ext = (path.extname(new URL(url).pathname) || ".jpg").toLowerCase();
  const dest = destBase + (ext === ".jpeg" ? ".jpg" : ext);
  fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
  return dest;
}

// --- candidate plan per car ------------------------------------------------

/** Ordered list of {strategy, run} producing {file, article} candidates. */
function planFor(car) {
  const plan = [];
  if (PINNED_FILES[car.id]) {
    const file = PINNED_FILES[car.id];
    plan.push({
      strategy: "pinned",
      label: file,
      run: async () => ({ file, article: `Commons file: ${file}` }),
    });
  }
  for (const title of OVERRIDES[car.id] ?? []) {
    plan.push({ strategy: "article", label: title, run: () => pageImage(title) });
  }
  for (const category of CATEGORY_HINTS[car.id] ?? []) {
    plan.push({
      strategy: "category",
      label: `Commons category: ${category}`,
      run: async () => bestOf(await categoryFiles(category), car, `Commons category: ${category}`),
    });
  }
  const end = car.production_end ?? new Date().getFullYear();
  const queries = [
    ...(SEARCH_HINTS[car.id] ?? []),
    `${car.make} ${car.model} ${car.production_start}`,
    `${car.make} ${car.model} ${Math.min(car.production_start + 2, end)}`,
  ];
  for (const q of queries) {
    plan.push({
      strategy: "search",
      label: `Commons search: ${q}`,
      run: async () => bestOf(await searchFiles(q), car, `Commons search: ${q}`),
    });
  }
  plan.push({
    strategy: "main-article",
    label: `${car.make} ${car.model}`,
    run: () => pageImage(`${car.make} ${car.model}`),
  });
  return plan;
}

function bestOf(files, car, article) {
  const ranked = files
    .map((file) => ({ file, score: scoreFile(file, car) }))
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score);
  return ranked.length ? { file: ranked[0].file, article } : null;
}

// --- run -------------------------------------------------------------------

const cars = JSON.parse(fs.readFileSync(CARS_PATH, "utf8"));
const credits = fs.existsSync(CREDITS_PATH) ? JSON.parse(fs.readFileSync(CREDITS_PATH, "utf8")) : {};
fs.mkdirSync(OUT_DIR, { recursive: true });

const args = process.argv.slice(2);
const ids = args.filter((a) => !a.startsWith("--"));
let targets;
if (ids.length) {
  targets = cars.filter((c) => ids.includes(c.id));
} else if (args.includes("--unverified")) {
  targets = cars.filter((c) => !credits[c.id]?.verified);
} else {
  targets = cars.filter((c) => !credits[c.id]);
}

console.log(`Fetching images for ${targets.length} car(s)…\n`);

let ok = 0, missed = 0;
for (const car of targets) {
  let done = false;
  for (const step of planFor(car)) {
    if (done) break;
    try {
      const candidate = await step.run();
      if (!candidate) continue;
      const info = await commonsInfo(candidate.file);
      if (!info) continue; // not on Commons — likely non-free, skip
      const dest = await download(info.thumbUrl, path.join(OUT_DIR, car.id));
      credits[car.id] = {
        file: "/" + path.relative("public", dest).replace(/\\/g, "/"),
        article: candidate.article,
        matched: step.strategy,
        license: info.license,
        artist: info.artist,
        source: info.source,
      };
      console.log(`+ ${car.id} <- ${candidate.article} [${info.license}] (${step.strategy})`);
      ok++;
      done = true;
    } catch (err) {
      console.log(`  ! ${car.id} via "${step.label}": ${err.message}`);
    }
    await sleep(250);
  }
  if (!done) {
    console.log(`- ${car.id} — no free image found`);
    missed++;
  }
  fs.writeFileSync(CREDITS_PATH, JSON.stringify(credits, null, 2) + "\n");
}

console.log(`\nDone: ${ok} downloaded, ${missed} missed.`);
console.log("Review with scripts/make-contact-sheets.mjs, then mark entries verified.");
