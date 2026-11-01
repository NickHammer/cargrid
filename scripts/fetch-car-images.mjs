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
 * Every candidate must live on Commons and pass an explicit license metadata
 * check. Local enwiki files can be non-free. Attribution is recorded in
 * data/image-credits.json; visual approval remains a separate step.
 *
 * Images still need visual verification (right model AND generation) before
 * cars.json image_url is set; scripts/make-contact-sheets.mjs builds sheets for
 * that review, and scripts/apply-image-urls.mjs only wires up entries whose
 * credit record is marked "verified": true.
 */

import fs from "fs";
import path from "path";
import { reviewImageLicense } from "./lib/image-license.mjs";

// Path overrides let this script run against an alternate car list / credits
// file (e.g. a curation tranche staged outside data/cars.json) without
// touching the main dataset files. Default behavior is unchanged.
const CARS_PATH = process.env.CARS_PATH || "data/cars.json";
const CREDITS_PATH = process.env.CREDITS_PATH || "data/image-credits.json";
const OUT_DIR = "public/cars";

const UA = {
  "User-Agent": "CarGridCuration/1.0 (https://cargrid.fun)",
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
  "ford-fusion-g1": "2010 Ford Fusion in Smokestone Metallic, front left, 10-12-2025.jpg",
  "ford-gt-g1": "2006 Ford GT Petersen Automotive Museum.jpg",
  // Distinct from ford-f-250-g1, which takes the F-Series article lead image.
  "ford-f-350-g1": "1955 Ford F-100 Standard Cab Pickup (44976781304).jpg",

  // Framing pass: these were the right car and generation but made poor tiles —
  // the car was lost in a wide landscape, shot from behind, or wearing a custom
  // wrap. Replacements are front-three-quarter shots that fill the frame.
  "toyota-supra-g1": "1979 Toyota Celica Supra Mk I Coupe (23155184553).jpg",
  "subaru-crosstrek-g1": "2013 Subaru XV Crosstrek, front left view.jpg",
  "honda-accord-g1": "1978 Honda Accord 1600 01.jpg",
  "ford-expedition-g1": "2000 Ford Expedition XLT.jpg",
  "chevrolet-traverse-g1": "2011 Chevrolet Traverse LT in White Diamond Tricoat, front left, 04-26-2025.jpg",
  "subaru-wrx-g1": "2015 Subaru WRX Limited, Front Right, 04-10-2021.jpg",
  "subaru-outback-g1": "'96-'97 Subaru Outback Wagon.JPG",
  "porsche-cayenne-g1": "2006 Porsche Cayenne, front left (Springs, NY).jpg",
  "nissan-armada-g1": "'05-'07 Nissan Armada.JPG",
  "nissan-altima-g1": "1995 Nissan Altima.jpg",
  "nissan-leaf-g1": "Nissan LEAF (ZE0) front.JPG",
  "bmw-x7-g1": "2019 BMW X7 xDrive30d M Sport Automatic 3.0 Front.jpg",
  "audi-a6-g1": "Audi A6 C4.jpg",
  "chevrolet-silverado-g1": "1999-2002 Chevrolet Silverado 1500 extended.jpg",
  "chevrolet-blazer-g1": "1970 Chevrolet Blazer (35016494241).jpg",
  "subaru-impreza-g1": "1996-1997 Subaru Impreza (GC) 1.6 GX Sedan (07-08-2017) 01.jpg",
  "porsche-panamera-g1": "Porsche Panamera 4S (970) – Frontansicht, 7. August 2012, Tübingen.jpg",
  "nissan-maxima-g1": "Datsun 810 Maxima Wagon Diesel.jpg",
  "bmw-z4-g1": "'03-'05 BMW Z4 Roadster (Orange Julep).jpg",
  "mercedes-benz-amg-gt-g1": "2015-2017 Mercedes-AMG GT (C 190) S coupe (2017-07-15) 01.jpg",
  "mercedes-benz-g-class-g1": "1989 Mercedes-Benz 280 GE (W460) (4535432871).jpg",

  // Tranche A (data/tranche-a.json) — classic/exotic nameplates where the
  // default search strategy landed on engine bays, rear shots, the wrong
  // generation, or show-floor clutter. Picked and visually verified via
  // contact-sheet review.
  "toyota-gr-yaris-g1": "Toyota GR Yaris RZ (2020) IMG 9308.jpg",
  "chevrolet-chevelle-g2": "1968 Chevrolet Chevelle SS, red, front right side, Golden Super Cruise 2026-08-01.jpg",
  "chevrolet-nova-g3": "1969 Chevrolet Nova SS 396 in Burnished Brown Poly, Front Right, 06-11-2022.jpg",
  "plymouth-barracuda-g3": "1970 Plymouth AAR 'Cuda in Moulin Rouge, front right (Queen Street 2023).jpg",
  "bentley-continental-gt-g1": "2005 Bentley Continental GT DutchAngle 8825.jpg",
  "audi-rs6-avant-g1": "Audi RS6 C5 Avant.jpg",
  "volvo-v70-g1": "1st Volvo V70.jpg",
  "nissan-patrol-g1": "1983 Nissan Patrol (4560886250).jpg",
  "ferrari-enzo-g1": "Scarsdale Concours Enzo 2.jpg",
  "lamborghini-countach-g1": "Lamborghini Countach LP 400 Periscopio (1975) (52866218691).jpg",
  "lamborghini-miura-g1": "Lamborghini Miura P400 S (1970) (52866384629).jpg",
  "lancia-stratos-g1": "Lancia Stratos HF 001.JPG",
  "subaru-legacy-touring-wagon-g2": "1997-1998 Subaru Legacy Touring Wagon GT-B Limited.jpg",
  "ferrari-f40-g1": "1990 Ferrari F40 Petersen Automotive Museum.jpg",
  "lamborghini-espada-g1": "Lamborghini Espada Series II (1974) (52866384814).jpg",
  "pontiac-firebird-g2": "1971 firebird esprit.jpg",
  "mercedes-benz-300-sl-g1": "Mercedes-Benz 300 SL - left.jpg",
  "mini-john-cooper-works-gp-g3": "2020 Mini John Cooper Works GP II Automatic 2.0 Front.jpg",
  // The generic "Buick Regal (1978)" museum shot read fine for the G-body
  // shape but didn't show the GNX's distinctive all-black turbo trim; this one
  // does, without opening the hood or going full rear/side.
  "buick-regal-gnx-g1": "Sloan Museum at Courtland Center December 2018 30 (1987 Buick GNX).jpg",
  "volkswagen-golf-gti-g2": "1987 Volkswagen Golf GTi 1.8 Front.jpg",

  // Wave-1 review (the 66 cars added with the 264-car catalog). Every one of
  // these resolved through the free-text search strategy, which is the weakest
  // rung — it matches on words, not on the car. Four classes of failure showed
  // up on the contact sheets:
  //
  //   wrong subject   "Ferrari Roma" hit a 1530s painting of Mary Magdalene
  //                   arriving in Rome; "Mazda 3 2019" hit a Mazda CX-3.
  //   wrong generation a year in the filename is the model year, not the
  //                   generation: "2020 Elantra" is the last gen-6 AD, and
  //                   "2012-2016 Boxster" is the 981, not the 718 this record
  //                   describes.
  //   wrong body      the 812 GTS is a spider, but the search landed on an 812
  //                   Superfast coupe; same for the F430 Coupe vs Spider.
  //   unusable frame  a bare Vanquish badge, two cars with the bonnet open, a
  //                   derelict in a yard, an Austrian police Tiguan, and five
  //                   rear-three-quarter shots. A rear view is near-impossible
  //                   to guess from.
  //
  // Replacements are front-three-quarter shots of the right generation, picked
  // by reading Commons filenames for a chassis code where one exists.
  "aston-martin-db11-g1": "2017 Aston Martin DB11 V12 coupé, Lightning Silver, front right.jpg",
  "aston-martin-vanquish-g2": "Geneva MotorShow 2013 - Aston Martin Vanquish.jpg",
  "aston-martin-vantage-g2": "2019 Aston Martin Vantage, front left view (Greenwich 2018).jpg",
  // Round 2 landed on an interior shot of the steering wheel: a Commons
  // filename naming the model and engine says nothing about what is in frame.
  "ferrari-458-g1": "2011 Ferrari 458 Italia DCT S-A 4.5 Front.jpg",
  "ferrari-812-gts-g1": "2022 Ferrari 812GTS in Verde British, front left (Newark).jpg",
  "ferrari-f430-g1": "2006 Ferrari F430 F1 (15803258744).jpg",
  "ferrari-f8-spider-g1": "2022 Ferrari F8 Spider.jpg",
  "ferrari-roma-g1": "2021 Ferrari Roma in Rosso Fiorano, front right.jpg",
  "hyundai-elantra-g7": "2021 Hyundai Elantra SEL (Canada), front 8.28.21.jpg",
  "hyundai-santa-fe-g5": "2024 Hyundai Santa Fe 2.5 GLS AWD in Creamy Pearl White, front left, 05-18-2024.jpg",
  "jaguar-s-type-g1": "Jaguar S-Type Front Left.jpg",
  // X150 is the chassis code for the 2006-2014 car; "Jaguar XK" alone pulls
  // the 1996 XK8 and the 2005 show car.
  "jaguar-xk-g2": "Jaguar X150 front 20080223.jpg",
  "lamborghini-gallardo-g1": "Lamborghini Gallardo Nera 1.jpg",
  // BP is the gen-4 Mazda3 chassis code, which is what keeps this off the CX-3.
  // FASTBACK is the hatchback this record describes; round 2 found the right
  // car but shot at night with the headlights on, which made a murky tile.
  "mazda-3-g4": "Mazda3 FASTBACK XD Burgundy Selection (3DA-BP8P) front.jpg",
  "mclaren-600lt-g1": "McLaren 600LT IMG 2954.jpg",
  "mclaren-765lt-g1": "2021 McLaren 765LT Coupé in White, front right.jpg",
  "pontiac-grand-prix-g1": "1964 Pontiac Grand Prix, front left, 06-16-2024.jpg",
  // 982 is the 718 generation; the 981 it replaced looks similar enough that
  // the model year in a filename is not enough to tell them apart.
  "porsche-boxster-g4": "Porsche 718 Boxster T (front).jpg",
  "porsche-cayman-g3": "Porsche 718 Cayman GTS (982c) front.jpg",
  "volkswagen-tiguan-g3": "2025 Volkswagen Tiguan Highline R-Line 4MOTION in Oryx White Pearl, front left, 2025-05-18.jpg",

  // Kia tranche. Search found the right nameplate but the wrong thing in frame:
  // the Soul hit the "Diva" show concept photographed from behind, and the
  // Stinger hit a close-up of the grille script.
  "kia-optima-g3": "Silver Kia Optima in Dhaka Motor Show 2012.jpg",
  // Free-text search finds almost no first-generation Sorento; the BL category
  // is full of them.
  "kia-sorento-g1": "'03-'06 Kia Sorento Limited.JPG",
  "kia-soul-g1": "2010 Kia Soul 2.0L 4u in Vanilla Shake, Front Left, 2021-04-28.jpg",
  "kia-stinger-g1": "2023 Kia Stinger GT-Line, front left, 07-21-2024.jpg",

  // Subaru tranche. A22 is the first-generation Leone chassis code; search on
  // the nameplate returned a rusted shell in a yard. VM is the first-generation
  // Levorg; search returned a show car photographed with its tailgate open.
  "subaru-leone-g1": "Subaru A22 Leone 4door 1400 CUSTOM (23110312463).jpg",
  "subaru-levorg-g1": "Subaru LEVORG 2.0GT-S EyeSight (VMG) front.JPG",

  // Muscle + EV tranche. 7 of 28 failed the contact-sheet review, all from the
  // free-text search rung, in the same four classes seen on every earlier wave:
  //
  //   interiors   — "BYD Atto 3" and "Pontiac Firebird" both returned a
  //                 dashboard-and-steering-wheel shot with no car visible.
  //   rear views  — "Ford Mustang 2015" and "Tesla Model 3" returned rear
  //                 three-quarters, the Model 3 in a packed auto-show hall.
  //   not the car — "Tesla Model X" returned an open falcon-wing door behind a
  //                 velvet rope, the body cropped out of frame entirely.
  //   wrong car   — "Chevrolet Camaro 1993" found the Indy Pace Car in full
  //                 livery in a crowded lot, which reads as a race car.
  //
  // Each replacement is a front-three-quarter of a plain example. Model years
  // are pinned where a nameplate spans generations the search cannot tell
  // apart.
  "byd-atto-3-g1": "BYD Atto 3 front-left.jpg",
  // A base 2000 coupe rather than the pace car or a Z28 — the fourth-gen
  // F-body shape is the point, not the trim.
  "chevrolet-camaro-g4": "2000 Chevrolet Camaro coupe, front right, 10-28-2022.jpg",
  // 2018 is the S550 facelift, inside the 2015-2023 span of this record.
  "ford-mustang-g6": "2018 Ford Mustang GT V8 5.0 facelift Front.jpg",
  // Third-gen Firebird took three rounds. Free-text search returned an
  // interior; the GTA file that replaced it turned out to be a rear
  // three-quarter (full-width taillight bar, spoiler, exhaust); and the
  // category's best-lit front shot is a hot rod with a blower through the hood.
  // This one is a stock 1989 car, pop-ups closed, front three-quarter.
  "pontiac-firebird-g3": "1989 Pontiac Firebird (9074822607).jpg",
  "tesla-cybertruck-g1": "2024 Tesla Cybertruck, front left, 07-27-2024.jpg",
  "tesla-model-3-g1":
    "2019 Tesla Model 3 Long Range Dual Motor in Red Multi-Coat, front left, 2021-05-30.jpg",
  "tesla-model-x-g1":
    "2017 Tesla Model X 100D in Catalina White, Front Left, 04-30-2023.jpg",

  // Honda brand pass. The Civic spans eleven generations that look broadly
  // alike, so free-text search is near useless on it: 5 of 10 failed review,
  // and the SAME photo of an ivy-covered abandoned car came back for both g4
  // and g5. Commons files them by launch year — "Category:Honda Civic (1991)"
  // — with a body-style subcategory under each, which is the reliable route.
  // Each pin below is a stock example from that generation's hatchback
  // subcategory, matching the Hatchback body these records carry.
  "honda-civic-g3": "1984 Honda Civic 3 door, Cambridge.jpg",
  "honda-civic-g4": "1990 Honda Civic 3 door 1.5I (8079904700).jpg",
  // Neither the "1992 Honda Civic with a V6!" file from the same set
  // (engine-swapped) nor "1992 Honda Civic (7601196922).jpg", which is a show
  // car photographed with its bonnet open over the engine bay.
  // In this photographer's series the trailing 01 is the front three-quarter
  // and 02 is the rear — 02 was fetched first and came back as a rear shot.
  "honda-civic-g5": "1993-1995 Honda Civic GLi 3-door hatchback (2011-11-17) 01.jpg",
  "honda-civic-g6": "1998-2000 Honda Civic CXi 3-door hatchback (2009-11-17) 01.jpg",
  "honda-civic-g11": "2022 Honda Civic Sport Touring, Front Right, 11-07-2021.jpg",

  // Nissan wave. Both of these defeated four fetch rounds: the search ranked a
  // single bad file top every time, and once rejected the guard left the car
  // with no candidate at all rather than a worse one.
  //   micra-march-g2: every round returned a close-up of the boot badge of a
  //   "HOLIDAY" special edition — a photograph of lettering, not of a car.
  //   skyline-g11: the V35 kept resolving to the current V37 via the bare
  //   nameplate article, and Commons files most V35s as rear shots.
  "nissan-micra-march-g2": "1999 Nissan Micra Inspiration (K11) - 1.0 16v (55PS) petrol manual - 2025-06-09, front left.jpg",
  "nissan-skyline-g11": "2003 Nissan Skyline V35.jpg",
};

// Hand-picked pins live in data/curation/pinned-files.json so a human can add
// them without editing this file. They win over the entries above, because a
// person looked at the photo and the map above is only ever a previous guess.
// Empty values are ignored, which lets the JSON carry a slot per car that
// still needs one — see docs/IMAGES-WANTED.md.
{
  const path = "data/curation/pinned-files.json";
  if (fs.existsSync(path)) {
    const { pins = {} } = JSON.parse(fs.readFileSync(path, "utf8"));
    let added = 0;
    for (const [id, file] of Object.entries(pins)) {
      if (typeof file === "string" && file.trim()) {
        PINNED_FILES[id] = file.trim().replace(/^File:/i, "");
        added++;
      }
    }
    if (added) console.log(`${added} hand-picked pin(s) loaded from ${path}\n`);
  }
}

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
  "toyota-supra-g2": ["Toyota Supra (A60)", "Toyota Celica XX (A60)"],
  "toyota-supra-g3": ["Toyota Supra (A70, pre-facelift)", "Toyota Supra (A70)"],
  "toyota-supra-g4": ["Toyota Supra (A80, pre-facelift)", "Toyota Supra (A80)"],
  "toyota-supra-g5": ["Toyota GR Supra", "Toyota Supra (J29)"],
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
  // A front three-quarter is the tile this game wants. A pure side profile is
  // not: cropped to 4:3 it loses the grille, which is most of what identifies
  // a car at a glance. "side" and "profile" used to earn the same bonus as
  // "front", which actively promoted the wrong shot — every side-on candidate
  // across the Nissan, Lexus and Jeep waves was rejected on review.
  if (/(front|3-4|three.quarter)/.test(name)) score += 3;
  if (/(side|profile)/.test(name)) score -= 2;
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
  const reviewedLicense = reviewImageLicense(meta);
  if (!reviewedLicense) return null;
  return {
    thumbUrl: info.thumburl ?? info.url,
    ...reviewedLicense,
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
/**
 * Chassis codes, read from data/incoming/models-by-generation.json.
 *
 * That file carries a `code` per generation, and where it holds a real chassis
 * designation (XJ, W126, R33, X351, "80 Series") it is the single best search
 * term available: it names one generation and cannot match another. Both image
 * waves so far failed mainly on wrong generations, because a launch-year query
 * only hints at the era.
 *
 * The field is inconsistent across brands, so it is filtered rather than
 * trusted. Rejected: generation echoes ("3rd gen"), purely numeric Fiat/Abarth
 * project numbers ("312", "348") which match nothing on Commons, and free text
 * ("Nuova 500 based", "2nd gen (Brazil)"). A usable code has a letter in it,
 * is short, and carries no parentheses.
 *
 * The file is optional — absent, the fetcher simply falls back to the
 * launch-year queries it used before.
 */
const CHASSIS_CODES = (() => {
  const index = new Map();
  const path = "data/incoming/models-by-generation.json";
  if (!fs.existsSync(path)) return index;
  const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  const usable = (code) => {
    const c = (code ?? "").trim();
    if (!c || c.length > 12) return false;
    if (/gen\b|\(|\)|based|original/i.test(c)) return false;
    if (!/[a-z]/i.test(c)) return false;          // "312" is a project number
    return /^[a-z0-9][a-z0-9 /.-]*$/i.test(c);
  };
  for (const row of JSON.parse(fs.readFileSync(path, "utf8"))) {
    if (!usable(row.code)) continue;
    const gen = Number(/^(\d+)/.exec(row.generation ?? "")?.[1] ?? 1);
    index.set(`${slug(row.brand)}|${slug(row.model)}|${gen}`, row.code.trim());
  }
  return index;
})();

function chassisCode(car) {
  const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  return CHASSIS_CODES.get(`${slug(car.make)}|${slug(car.model)}|${car.generation}`) ?? null;
}

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
  const chassis = chassisCode(car);
  const queries = [
    ...(SEARCH_HINTS[car.id] ?? []),
    // A chassis code names one generation and nothing else, so it beats a
    // launch-year query that only hints at the era. "Jeep Cherokee XJ" cannot
    // come back as a KL; "Jeep Cherokee 1984" frequently does.
    ...(chassis ? [`${car.make} ${car.model} ${chassis}`, `${car.make} ${chassis}`] : []),
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
  // Last resort, and only for a car still in production. The bare "Make Model"
  // article leads with the CURRENT generation, so this strategy is right for
  // the newest record of a nameplate and reliably wrong for every older one.
  // Measured over the Nissan and Lexus waves: it produced a 2010s Y62 Patrol
  // for a 1980 record, a 2016 Maxima for a 2004 record, an R34 GT-R for a 1973
  // record and a 2014 Skyline for a 2001 record — while being correct for
  // patrol-g5, skyline-g13 and navara-g2, all of which are current.
  if (car.production_end === null) {
    plan.push({
      strategy: "main-article",
      label: `${car.make} ${car.model}`,
      run: () => pageImage(`${car.make} ${car.model}`),
    });
  }
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
  const rejectedFiles = new Set(credits[car.id]?.rejectedFiles ?? []);
  for (const step of planFor(car)) {
    if (done) break;
    try {
      const candidate = await step.run();
      if (!candidate) continue;
      const info = await commonsInfo(candidate.file);
      if (!info) continue; // not on Commons — likely non-free, skip
      // A file turned down for this car during review must not come back. The
      // strategies are deterministic, so without this a re-fetch returns the
      // same reject and the review loop never terminates.
      if (rejectedFiles.has(info.source)) {
        console.log(`  · ${car.id} skipping previously rejected ${candidate.article}`);
        continue;
      }
      const dest = await download(info.thumbUrl, path.join(OUT_DIR, car.id));
      credits[car.id] = {
        file: "/" + path.relative("public", dest).replace(/\\/g, "/"),
        article: candidate.article,
        matched: step.strategy,
        license: info.license,
        licenseUrl: info.licenseUrl,
        artist: info.artist,
        source: info.source,
        // Carried across the overwrite: the reject history belongs to the car,
        // not to whichever candidate happens to be current.
        ...(rejectedFiles.size ? { rejectedFiles: [...rejectedFiles] } : {}),
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
