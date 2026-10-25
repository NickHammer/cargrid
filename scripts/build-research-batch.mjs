/**
 * Builds a prioritized research batch from discovery candidates.
 *
 * The generator only lets a parameter value onto an axis once 8 cars support
 * it. Most of the catalog's axes are starved not because the cars are missing
 * but because they are spread thin: only 9 of 44 brands clear the bar, so every
 * brand axis is drawn from the same nine names.
 *
 * So candidates are ranked by UNLOCK VALUE, not by how interesting the car is:
 * a make sitting at 7 cars is one car away from becoming a usable axis, while a
 * make already at 18 gains nothing. Cheapest unlocks come first.
 *
 * Usage:
 *   node scripts/build-research-batch.mjs \
 *     --in data/incoming/autodev-discovery.json \
 *     --out data/incoming/research-batch.json [--target 8] [--margin 1]
 */

import { readFileSync, writeFileSync } from "fs";

const argv = process.argv.slice(2);
const argOf = (n, d) => { const i = argv.indexOf(n); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };
const inFile = argOf("--in", "data/incoming/autodev-discovery.json");
const outFile = argOf("--out", "data/incoming/research-batch.json");
const TARGET = parseInt(argOf("--target", "8"), 10);   // generator's support floor
const MARGIN = parseInt(argOf("--margin", "1"), 10);   // spare cars above the floor

const cars = JSON.parse(readFileSync("data/cars.json", "utf8"));
const discovery = JSON.parse(readFileSync(inFile, "utf8"));
const candidates = discovery.cars ?? discovery;

// --- where each brand stands today ----------------------------------------

const brandCount = {};
for (const c of cars) for (const b of c.brands) brandCount[b] = (brandCount[b] ?? 0) + 1;

// --- electrified models unlock fuel_type AND the Electric engine layout ----
// Both sit below the floor (Electric 5 cars, Hybrid 2), so these are worth
// more than their brand contribution alone.
const EV = /mach-e|ioniq|ev6|id\.?4|model [3ysx]|leaf|bolt|e-tron|eqs|eqe|eqb|taycan|lyriq|blazer ev|equinox ev|silverado ev|f-150 lightning|r1t|r1s|ariya|kona electric|niro|soul ev|i4|ix\b|i7|polestar|solterra|bz4x|prologue|vistiq|optiq|escalade iq/i;
const HYBRID = /hybrid|prime|plug-in|phev/i;

const score = (c) => {
  const have = brandCount[c.make] ?? 0;
  const deficit = Math.max(0, TARGET - have);
  // A make already eligible gains nothing from another model.
  const brandValue = deficit === 0 ? 0 : 1 / deficit;
  const fuelValue = EV.test(c.model) ? 1.0 : HYBRID.test(c.model) ? 0.5 : 0;
  return brandValue * 2 + fuelValue;
};

// --- allocate: take only as many per make as the unlock actually needs -----

// Listing facets carry case variants of the same model ("Model X" and
// "MODEL X", "F-Pace" and "F-PACE") and the odd truncated artifact ("Y").
// Left alone these become duplicate research tasks and colliding car ids.
const byMake = {};
const seenPerMake = {};
for (const c of candidates) {
  const model = String(c.model ?? "").trim();
  if (model.length < 2) continue;                    // junk facet value
  const key = c.make + "|" + model.toLowerCase().replace(/[^a-z0-9]/g, "");
  const prior = (seenPerMake[key] ??= { entry: null });
  if (prior.entry) {
    // Same car twice: keep the better-cased label, sum the listing volume.
    const allCaps = (x) => x === x.toUpperCase();
    if (allCaps(prior.entry.model) && !allCaps(model)) prior.entry.model = model;
    prior.entry.listings = (prior.entry.listings ?? 0) + (c.listings ?? 0);
    continue;
  }
  const entry = { ...c, model };
  prior.entry = entry;
  (byMake[c.make] ??= []).push(entry);
}

const batch = [];
const makeNotes = [];
for (const [make, models] of Object.entries(byMake)) {
  const have = brandCount[make] ?? 0;
  const deficit = Math.max(0, TARGET - have);
  if (deficit === 0) continue;                       // brand already usable

  // Prefer electrified models inside a make, then by how common the car is —
  // familiar cars make better puzzle answers.
  const ranked = models.slice().sort((a, b) => {
    const ev = (EV.test(b.model) ? 1 : 0) - (EV.test(a.model) ? 1 : 0);
    if (ev !== 0) return ev;
    return (b.listings ?? 0) - (a.listings ?? 0);
  });

  // Skip makes this source cannot carry over the line: researching 1 of the 7
  // cars Koenigsegg needs unlocks nothing, so it is wasted effort here.
  if (ranked.length < deficit) {
    makeNotes.push(`${make}: ${ranked.length} candidates vs a deficit of ${deficit} — cannot unlock from this source, skipped`);
    continue;
  }
  const take = ranked.slice(0, deficit + MARGIN);
  for (const c of take) {
    batch.push({
      make: c.make,
      model: c.model,
      brand_has: have,
      brand_needs: deficit,
      unlocks: [
        deficit > 0 ? `brand:${make}` : null,
        EV.test(c.model) ? "fuel_type:Electric + engine_layout:Electric" : null,
        HYBRID.test(c.model) ? "fuel_type:Hybrid" : null,
      ].filter(Boolean),
      us_listings: c.listings ?? null,
      priority: Number(score(c).toFixed(3)),
    });
  }
}

batch.sort((a, b) => b.priority - a.priority || (b.us_listings ?? 0) - (a.us_listings ?? 0));

// Group into waves by whole make — a half-finished make unlocks nothing, so a
// wave must always complete every brand it touches.
const WAVE = parseInt(argOf("--wave", "0"), 10);
if (WAVE > 0) {
  const order = [...new Set(batch.map((c) => c.make))]
    .sort((a, b) => batch.filter((c) => c.make === a).length - batch.filter((c) => c.make === b).length);
  const picked = new Set();
  let n = 0;
  for (const mk of order) {
    const size = batch.filter((c) => c.make === mk).length;
    if (n + size > WAVE) continue;
    picked.add(mk);
    n += size;
  }
  for (let i = batch.length - 1; i >= 0; i--) if (!picked.has(batch[i].make)) batch.splice(i, 1);
}

// --- what would this actually unlock? -------------------------------------

const projected = { ...brandCount };
for (const c of batch) projected[c.make] = (projected[c.make] ?? 0) + 1;
const before = Object.values(brandCount).filter((n) => n >= TARGET).length;
const after = Object.values(projected).filter((n) => n >= TARGET).length;

const evCount = batch.filter((c) => EV.test(c.model)).length;
const hybridCount = batch.filter((c) => HYBRID.test(c.model)).length;

writeFileSync(outFile, JSON.stringify({
  generated_from: inFile,
  note: "Research queue, not vehicle facts. Each entry still needs a generation chosen and specs sourced per CLAUDE.md. Ordered by how much grid variety each car unlocks, cheapest unlock first.",
  target_support: TARGET,
  projected_brand_axes: { before, after },
  cars: batch,
}, null, 2) + "\n");

console.log(`batch written: ${batch.length} cars -> ${outFile}\n`);
console.log(`brands usable as a grid axis: ${before} now -> ${after} if this batch lands`);
console.log(`electrified in batch: ${evCount} EV, ${hybridCount} hybrid (unlocks fuel_type + Electric layout)\n`);

const tiers = [
  ["1 car from unlocking", (c) => c.brand_needs === 1],
  ["2-3 cars away", (c) => c.brand_needs >= 2 && c.brand_needs <= 3],
  ["4-7 cars away", (c) => c.brand_needs >= 4 && c.brand_needs <= 7],
  ["from scratch (8)", (c) => c.brand_needs >= 8],
];
for (const [label, test] of tiers) {
  const rows = batch.filter(test);
  if (!rows.length) continue;
  const makes = [...new Set(rows.map((r) => r.make))];
  console.log(`${label}: ${rows.length} cars across ${makes.length} makes`);
  console.log(`    ${makes.join(", ")}`);
}
if (makeNotes.length) {
  console.log("\nshortfalls:");
  for (const n of makeNotes) console.log("  " + n);
}
