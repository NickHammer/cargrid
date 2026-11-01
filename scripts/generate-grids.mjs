/**
 * Generates the dated grid schedule into data/grids.json.
 *
 * Grids are pre-generated and committed rather than derived at runtime so that
 * archived grids stay stable when the car dataset changes, and so a human can
 * eyeball them before they go live.
 *
 * HOW A GRID IS BUILT
 * -------------------
 * By construction, not by guessing. An earlier version drew six categories at
 * random and threw the whole grid away if any of the nine squares held fewer
 * than `minCell` cars. That failed in two ways, both measured on this dataset:
 *
 *   - It got *less* reliable as the catalog grew. Every car added brings new
 *     eligible categories with it, and the number of possible combinations
 *     grows far faster than the number of workable ones: one workable grid per
 *     40 random draws at 100 cars, but one per 225 at 281. Only 37 of 120 days
 *     found a grid inside the 80-draw budget; the other 69% fell through to
 *     600- and 2000-draw retries.
 *   - It could not reach a third of the catalog at all. 35 of 96 eligible
 *     categories never appeared across 120 days, and Electric, Muscle Car and
 *     Wagon appeared in none of 730 days. Not because their grids do not exist
 *     — 883,559 workable grids do, 378 of them containing Electric — but
 *     because a random draw never lands on one.
 *
 * So the search was replaced rather than tuned:
 *
 *   1. Pair every two categories once and record whether their square works: at
 *      least `minCell` cars, and not a giveaway. ~2k comparisons, ~10ms.
 *   2. Each date gets a *featured* category from an even rotation, so every
 *      reachable category gets its turn no matter how common it is.
 *   3. Build grids around that category by only ever choosing partners the
 *      table says fit. All nine squares are then valid by construction, so
 *      nothing is built and discarded and the squares need no checking.
 *   4. Score the candidates and keep the best — which is what the scorer is
 *      good at, now that it chooses between real options instead of rating the
 *      one grid a random search happened to stumble onto.
 *
 * Cost: ~10ms of setup, then 1-2ms per day.
 *
 * Seeded off the date string, so a rerun reproduces the same grid for the same
 * date. Existing dates are kept untouched unless --force is passed, which makes
 * the script safe to re-run to extend the schedule.
 *
 * Usage:
 *   node scripts/generate-grids.mjs                      # fill 180 days from today
 *   node scripts/generate-grids.mjs --from 2026-10-22 --days 365
 *   node scripts/generate-grids.mjs --force              # regenerate every date
 *   node scripts/generate-grids.mjs --report             # category gap report, no writes
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { fileURLToPath, pathToFileURL } from "url";
import { dirname, join } from "path";
import { MATCH, VALUES, TIER, IDENTITY_TYPES, labelFor } from "./grid-params.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const carsPath = join(__dirname, "../data/cars.json");
const gridsPath = join(__dirname, "../data/grids.json");

// ---------------------------------------------------------------------------
// Tuning. minSupport 8 / minCell 3 was picked by simulating a 365-day run
// against the current dataset: no unfillable days, median worst-cell of 6.
// ---------------------------------------------------------------------------

const CONFIG = {
  minSupport: 8,     // a category needs this many cars to be eligible
  minCell: 3,        // every square needs this many valid answers
  maxSameType: 2,    // same category type per axis
  maxTier3: 1,       // "use sparingly" categories per grid
  candidates: 60,    // grids built per day before scoring picks the best
  featureTries: 6,   // next-in-rotation categories to try if the first yields none
};

// Fallbacks for a date whose featured category — and the next few after it —
// cannot produce a grid at full strictness. Building more candidates and trying
// more featured categories comes FIRST, because that costs only time; loosening
// the fairness floor is the last resort. With construction replacing guesswork
// these rungs are close to dead code, which is the point: a failure now means
// no such grid exists, not that the search got unlucky.
const LADDER = [
  CONFIG,
  { ...CONFIG, candidates: 400, featureTries: 24 },
  { ...CONFIG, candidates: 400, featureTries: 96, minCell: 2 },
  { ...CONFIG, candidates: 400, featureTries: 96, minCell: 2, minSupport: 6 },
  { ...CONFIG, candidates: 400, featureTries: 96, minCell: 1, minSupport: 5, maxTier3: 2 },
];

// Day 0 of the featured-category rotation. Fixed so that a date's feature does
// not depend on which other dates happen to be in the file.
const ROTATION_EPOCH = "2020-01-01";

// How much to discourage the biggest categories in the five non-featured slots.
// The rotation guarantees breadth for the featured slot, but `min * 10` pulls
// the rest toward whatever covers the most cars, which put "2010s" (110 cars)
// in 52% of grids. Swept over the 731-day schedule; 22 was the knee of the
// curve, and it improves fairness rather than trading against it:
//
//   spread   2010s share   grids at the 3-answer floor
//        0           52%                            51
//       18           46%                            39
//       22           43%                            40
//       26           40%                            42
//       30           39%                            48
//
// Above ~26 the scorer starts accepting tight grids to chase small categories,
// which is the trade this is meant to avoid. Note this works only because the
// builder hands the scorer dozens of genuinely different valid grids — the same
// idea failed completely against the old random search, which had nothing to
// choose between.
const SPREAD = 22;

// ---------------------------------------------------------------------------
// Args
// ---------------------------------------------------------------------------

const argv = process.argv.slice(2);
const argOf = (name, fallback) => {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
};
const force = argv.includes("--force");
const report = argv.includes("--report");
const days = parseInt(argOf("--days", "180"), 10);
const from = argOf("--from", todayLocal());

function todayLocal() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function addDays(date, n) {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

function daysBetween(a, b) {
  const t = (s) => {
    const [y, m, d] = s.split("-").map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((t(b) - t(a)) / 86400000);
}

// ---------------------------------------------------------------------------
// Seeded RNG — xorshift32 over an FNV hash of the date, so each date is
// independent and reproducible.
// ---------------------------------------------------------------------------

function makeRng(seed) {
  let s = 2166136261;
  for (const ch of seed) {
    s ^= ch.charCodeAt(0);
    s = Math.imul(s, 16777619) >>> 0;
  }
  s = s || 1;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5;  s >>>= 0;
    return s / 4294967296;
  };
}

/** Fisher-Yates on a copy, so callers can shuffle without surprises. */
function shuffled(list, rng) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// ---------------------------------------------------------------------------
// Category pool
// ---------------------------------------------------------------------------

const toParam = (p) => ({ type: p.type, value: p.value, label: labelFor(p.type, p.value) });

function buildPool(cars, minSupport) {
  const pool = [];
  for (const type of Object.keys(VALUES)) {
    const counts = new Map();
    for (const car of cars) {
      for (const value of VALUES[type](car)) {
        counts.set(value, (counts.get(value) ?? 0) + 1);
      }
    }
    // A type with fewer than two eligible values cannot discriminate between
    // cars (e.g. "Brand still active" when almost everything qualifies).
    const eligible = [...counts].filter(([, n]) => n >= minSupport);
    if (eligible.length < 2) continue;
    for (const [value, support] of eligible) pool.push({ type, value, support });
  }
  return pool;
}

// ---------------------------------------------------------------------------
// The compatibility table
// ---------------------------------------------------------------------------

function popcount(x) {
  x -= (x >> 1) & 0x55555555;
  x = (x & 0x33333333) + ((x >> 2) & 0x33333333);
  x = (x + (x >> 4)) & 0x0f0f0f0f;
  return (x * 0x01010101) >> 24;
}

const worldCache = new Map();

/**
 * Everything the builder needs, computed once per (cars, config) pair: which
 * categories are eligible, which cars each covers, which pairs make a workable
 * square, and which categories can appear in a grid at all.
 *
 * Car membership is held as bitmasks so a square's size costs a few AND +
 * popcount operations instead of a Set intersection. The table grows with the
 * square of the category count rather than the car count, which is what keeps
 * it cheap as the catalog grows — 96 categories is ~2k pairs; ten times the
 * cars might be 300 categories and ~20k pairs, still milliseconds.
 */
function buildWorld(cars, config) {
  const sig = `${config.minSupport}:${config.minCell}`;
  const hit = worldCache.get(sig);
  if (hit && hit.cars === cars) return hit;

  const pool = buildPool(cars, config.minSupport);
  const words = Math.ceil(cars.length / 32) || 1;
  const bits = pool.map((p) => {
    const mask = new Uint32Array(words);
    cars.forEach((car, i) => {
      if (MATCH[p.type](car, p.value)) mask[i >>> 5] |= 1 << (i & 31);
    });
    return mask;
  });
  const size = bits.map((mask) => {
    let n = 0;
    for (const w of mask) n += popcount(w);
    return n;
  });

  const cellSize = (a, b) => {
    let n = 0;
    for (let w = 0; w < words; w++) n += popcount(bits[a][w] & bits[b][w]);
    return n;
  };
  // A square is workable when it has enough answers AND neither category
  // implies the other — "every Audi is German" is a freebie, not a puzzle.
  const works = (a, b) => {
    const s = cellSize(a, b);
    return s >= config.minCell && s !== size[a] && s !== size[b];
  };

  const identityIx = [];
  const attributeIx = [];
  pool.forEach((p, i) => (IDENTITY_TYPES.has(p.type) ? identityIx : attributeIx).push(i));

  const compat = new Map(pool.map((_, i) => [i, new Set()]));
  let comparisons = 0;
  for (const a of identityIx) {
    for (const b of attributeIx) {
      comparisons++;
      if (!works(a, b)) continue;
      compat.get(a).add(b);
      compat.get(b).add(a);
    }
  }

  const world = {
    cars, config, pool, bits, size, words, compat, identityIx, attributeIx,
    comparisons, cellSize,
    widest: Math.max(...pool.map((p) => p.support), 1),
    /** Car indices in the square where categories a and b cross. */
    members(a, b) {
      const out = [];
      for (let w = 0; w < words; w++) {
        const m = bits[a][w] & bits[b][w];
        if (!m) continue;
        for (let bit = 0; bit < 32; bit++) if (m & (1 << bit)) out.push(w * 32 + bit);
      }
      return out;
    },
    /** Does every car in a also sit in b? Used to penalise flat axes. */
    contains(a, b) {
      for (let w = 0; w < words; w++) if (bits[a][w] & ~bits[b][w]) return false;
      return true;
    },
  };

  // Which categories can appear in a grid at all? Asking once here means an
  // impossible category (Plug-in Hybrid, with two partners where three are
  // needed) is reported as a data gap instead of silently never showing up.
  world.reachable = pool
    .map((_, i) => i)
    .filter((i) => build(world, i, makeRng(`reach:${pool[i].type}:${pool[i].value}`), 1).length > 0);

  // A fixed shuffle, so consecutive days do not feature three brands in a row.
  // Recomputed when the eligible set changes, which shifts *future* features
  // only — dates already in grids.json are kept as they are.
  world.rotation = shuffled(world.reachable, makeRng("cargrid:rotation"));

  worldCache.set(sig, world);
  return world;
}

/**
 * Can 9 *distinct* cars fill the 9 squares? Per-square counts are not enough on
 * their own — the autocomplete bars reusing a car, so a grid where every square
 * is individually fillable can still be impossible to complete. Kuhn's
 * augmenting-path matching over the bipartite square/car graph.
 *
 * This is the only validity check left: the compatibility table already
 * guarantees every square has enough answers.
 */
function hasPerfectMatching(cells) {
  const assignedTo = new Map(); // car index -> cell index
  const augment = (cell, seen) => {
    for (const carIx of cells[cell]) {
      if (seen.has(carIx)) continue;
      seen.add(carIx);
      const holder = assignedTo.get(carIx);
      if (holder === undefined || augment(holder, seen)) {
        assignedTo.set(carIx, cell);
        return true;
      }
    }
    return false;
  };
  for (let i = 0; i < cells.length; i++) if (!augment(i, new Set())) return false;
  return true;
}

// ---------------------------------------------------------------------------
// Building grids around a featured category
// ---------------------------------------------------------------------------

/**
 * Two categories on the SAME axis must not be interchangeable.
 *
 * `maxSameType` does not catch this, because the clash is across types: "SUV"
 * is both a body_style and a car_class, "Electric" both an engine_layout and a
 * fuel_type. A trio drawn from both lists renders as `SUV | Inline-4 | SUV` —
 * two columns the player cannot tell apart. 11 of 736 scheduled grids had such
 * a pair before this check existed.
 *
 * Cross-axis duplicates need no check: their square would be the whole of both
 * categories, which the compatibility table already rejects as a giveaway.
 */
function trioDistinct(world, trio) {
  const labels = new Set();
  for (const i of trio) {
    const label = labelFor(world.pool[i].type, world.pool[i].value);
    if (labels.has(label)) return false;
    labels.add(label);
  }
  // Different labels can still cover exactly the same cars, which makes two
  // rows produce identical squares — a 3x3 grid with only two real columns.
  for (let x = 0; x < trio.length; x++) {
    for (let y = x + 1; y < trio.length; y++) {
      if (world.contains(trio[x], trio[y]) && world.contains(trio[y], trio[x])) return false;
    }
  }
  return true;
}

/** Tier-3 count for a trio, or -1 if it breaks the same-type or distinctness limits. */
function trioCost(world, trio, maxSameType) {
  const perType = new Map();
  let tier3 = 0;
  for (const i of trio) {
    const t = world.pool[i].type;
    perType.set(t, (perType.get(t) ?? 0) + 1);
    if (TIER[t] === 3) tier3++;
  }
  for (const n of perType.values()) if (n > maxSameType) return -1;
  if (!trioDistinct(world, trio)) return -1;
  return tier3;
}

/**
 * Builds up to `want` valid grids that contain `featured`, choosing partners
 * only from the compatibility table. Walks candidate pairs for the featured
 * category's own axis in shuffled order and takes a few partner trios from
 * each, so the candidates come from across the space rather than all sharing
 * one pair.
 */
function build(world, featured, rng, want) {
  const { pool, compat, config } = world;
  const onIdentity = IDENTITY_TYPES.has(pool[featured].type);
  const ownSide = onIdentity ? world.identityIx : world.attributeIx;
  const found = [];
  const perPair = Math.max(2, Math.ceil(want / 8));

  // Pairs to join the featured category on its own axis.
  const mates = ownSide.filter((i) => i !== featured);
  const pairs = [];
  for (let i = 0; i < mates.length; i++) {
    for (let j = i + 1; j < mates.length; j++) pairs.push([mates[i], mates[j]]);
  }

  for (const [a, b] of shuffled(pairs, rng)) {
    const mine = [featured, a, b];
    const tier3Mine = trioCost(world, mine, config.maxSameType);
    if (tier3Mine < 0) continue;

    // Only categories that fit all three of this axis can form the other axis.
    const common = [...compat.get(featured)].filter(
      (x) => compat.get(a).has(x) && compat.get(b).has(x)
    );
    if (common.length < 3) continue;

    const opts = shuffled(common, rng);
    let takenHere = 0;
    for (let i = 0; i < opts.length && takenHere < perPair; i++) {
      for (let j = i + 1; j < opts.length && takenHere < perPair; j++) {
        for (let k = j + 1; k < opts.length && takenHere < perPair; k++) {
          const theirs = [opts[i], opts[j], opts[k]];
          const tier3Theirs = trioCost(world, theirs, config.maxSameType);
          if (tier3Theirs < 0 || tier3Mine + tier3Theirs > config.maxTier3) continue;

          const identityTrio = onIdentity ? mine : theirs;
          const attributeTrio = onIdentity ? theirs : mine;
          const cells = [];
          for (const r of identityTrio) {
            for (const c of attributeTrio) cells.push(world.members(r, c));
          }
          if (!hasPerfectMatching(cells)) continue;

          found.push({ identityTrio, attributeTrio, cells });
          takenHere++;
          if (found.length >= want) return found;
        }
      }
    }
  }
  return found;
}

/** Ordered pairs on one axis where one category is contained in another. */
function axisOverlap(world, axis) {
  let n = 0;
  for (const a of axis) {
    for (const b of axis) {
      if (a !== b && world.contains(a, b)) n++;
    }
  }
  return n;
}

function scoreOf(world, candidate) {
  const counts = candidate.cells.map((c) => c.length);
  const min = Math.min(...counts);
  const avg = counts.reduce((s, n) => s + n, 0) / 9;
  const all = [...candidate.identityTrio, ...candidate.attributeTrio];
  const tierBonus = all.reduce((s, i) => {
    const tier = TIER[world.pool[i].type];
    return s + (tier === 1 ? 3 : tier === 2 ? 1 : 0);
  }, 0);
  // Penalise axes whose categories shadow each other: Audi and German as two
  // rows is legal but makes for a flat puzzle.
  const overlap =
    axisOverlap(world, candidate.identityTrio) + axisOverlap(world, candidate.attributeTrio);
  // Lean against the broadest categories, so the slots the rotation does not
  // control still vary. Measured against `widest` so the term does not drift as
  // the catalog grows.
  const bulk = all.reduce((s, i) => s + world.pool[i].support / world.widest, 0);
  return { score: min * 10 + avg + tierBonus - overlap * 4 - SPREAD * bulk, min, avg };
}

function generateForDate(cars, date, config) {
  const world = buildWorld(cars, config);
  const size = world.rotation.length;
  if (!size) return null;

  const rng = makeRng(`cargrid:${date}`);
  const slot = ((daysBetween(ROTATION_EPOCH, date) % size) + size) % size;

  // The date's own featured category first, then the next few in the rotation.
  // Trying a different feature is always better than loosening the puzzle, so
  // this happens before the caller drops to the next ladder rung.
  for (let step = 0; step < config.featureTries; step++) {
    const featured = world.rotation[(slot + step) % size];
    const candidates = build(world, featured, rng, config.candidates);
    if (!candidates.length) continue;

    let best = null;
    for (const candidate of candidates) {
      const s = scoreOf(world, candidate);
      if (!best || s.score > best.score) best = { candidate, ...s };
    }
    // One axis leans identity (Brand/Country/Decade), the other attribute — the
    // soft guideline in CLAUDE.md. Which axis gets which alternates by date.
    const identityOnRows = rng() < 0.5;
    const rows = identityOnRows ? best.candidate.identityTrio : best.candidate.attributeTrio;
    const cols = identityOnRows ? best.candidate.attributeTrio : best.candidate.identityTrio;
    return {
      rows: rows.map((i) => world.pool[i]),
      cols: cols.map((i) => world.pool[i]),
      featured: world.pool[featured].value,
      featuredOffset: step,
      score: best.score,
      min: best.min,
      avg: Number(best.avg.toFixed(1)),
    };
  }
  return null;
}

export { buildPool, buildWorld, build, generateForDate, CONFIG, LADDER, toParam };

// ---------------------------------------------------------------------------
// Run — skipped when this module is imported, so simulations can exercise the
// real generator rather than a copy that might drift from it.
// ---------------------------------------------------------------------------

const invokedDirectly =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (invokedDirectly) main();

function main() {
  const cars = JSON.parse(readFileSync(carsPath, "utf8"));

  if (report) {
    printGapReport(cars);
    return;
  }

  const existing = existsSync(gridsPath)
    ? JSON.parse(readFileSync(gridsPath, "utf8"))
    : { grids: [] };
  const byDate = new Map(force ? [] : existing.grids.map((g) => [g.date, g]));

  const started = Date.now();
  let made = 0, kept = 0, relaxed = 0, substituted = 0, failed = 0;

  for (let i = 0; i < days; i++) {
    const date = addDays(from, i);
    if (byDate.has(date)) { kept++; continue; }

    let grid = null, rung = 0;
    for (; rung < LADDER.length && !grid; rung++) grid = generateForDate(cars, date, LADDER[rung]);

    if (!grid) {
      console.log(`x ${date} — no solvable grid found`);
      failed++;
      continue;
    }
    // Rungs 1-2 only work harder at full strictness; rung 3+ actually loosens.
    if (rung > 2) {
      relaxed++;
      console.log(`  ~ ${date} needed relaxation level ${rung - 2}`);
    }
    if (grid.featuredOffset > 0) substituted++;

    byDate.set(date, {
      id: `grid-${date}`,
      date,
      rows: grid.rows.map(toParam),
      columns: grid.cols.map(toParam),
      featured: grid.featured,
      minCandidates: grid.min,
      avgCandidates: grid.avg,
    });
    made++;
  }

  const grids = [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
  writeFileSync(gridsPath, JSON.stringify({ config: CONFIG, grids }, null, 2));

  console.log(
    `\n${made} generated in ${Date.now() - started}ms, ${kept} kept, ` +
      `${substituted} used a substitute feature, ${relaxed} relaxed, ${failed} failed.`
  );
  console.log(`Schedule now covers ${grids.length} days: ${grids[0]?.date} -> ${grids.at(-1)?.date}`);
}

/**
 * The compatibility table doubles as a data-collection to-do list: a category
 * that cannot reach three partners cannot appear in any grid, and this says
 * exactly how far short it is rather than letting it silently vanish.
 */
function printGapReport(cars) {
  const world = buildWorld(cars, CONFIG);
  // The same label can be two different categories — "Electric" is both a fuel
  // type and an engine layout, "Wagon" both a body style and a car class — so
  // the type has to be printed or the report reads as duplicated rows.
  const rows = world.pool.map((p, i) => ({
    value: `${p.value} (${p.type})`,
    support: p.support,
    partners: world.compat.get(i).size,
    reachable: world.reachable.includes(i),
  }));
  console.log(
    `${cars.length} cars, ${world.pool.length} eligible categories, ` +
      `${world.comparisons} pair comparisons.`
  );
  console.log(`Reachable: ${world.reachable.length}/${world.pool.length}\n`);

  const dead = rows.filter((r) => !r.reachable);
  if (dead.length) {
    console.log("UNREACHABLE — cannot appear in any grid (needs 3 workable partners):");
    for (const r of dead) {
      console.log(
        `  ${r.value.padEnd(34)} ${String(r.support).padStart(4)} cars  ` +
          `${r.partners} partner(s) — short by ${Math.max(0, 3 - r.partners)}`
      );
    }
    console.log("");
  }
  const thin = rows
    .filter((r) => r.reachable && r.partners <= 6)
    .sort((a, b) => a.partners - b.partners);
  if (thin.length) {
    console.log("THIN — reachable but fragile; losing a partner would kill these:");
    for (const r of thin) {
      console.log(
        `  ${r.value.padEnd(34)} ${String(r.support).padStart(4)} cars  ${r.partners} partners`
      );
    }
  }
}
