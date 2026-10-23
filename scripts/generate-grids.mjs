/**
 * Generates the dated grid schedule into data/grids.json.
 *
 * Grids are pre-generated and committed rather than derived at runtime so that
 * archived grids stay stable when the car dataset changes, and so a human can
 * eyeball them before they go live.
 *
 * Seeded off the date string, so a rerun reproduces the same grid for the same
 * date. Existing dates are kept untouched unless --force is passed, which makes
 * the script safe to re-run to extend the schedule.
 *
 * Usage:
 *   node scripts/generate-grids.mjs                      # fill 180 days from today
 *   node scripts/generate-grids.mjs --from 2026-10-22 --days 365
 *   node scripts/generate-grids.mjs --force              # regenerate every date
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
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
  minSupport: 8,     // a parameter value needs this many cars to be eligible
  minCell: 3,        // every cell needs this many valid answers
  attempts: 80,      // candidate grids per day; best-scoring one wins
  maxSameType: 2,    // same parameter type per axis
  maxTier3: 1,       // "use sparingly" parameters per grid
};

// Relaxation ladder for the rare seed that cannot satisfy the strict config.
const LADDER = [
  CONFIG,
  // Before loosening anything, just search harder — most days that miss on the
  // first pass succeed at full strictness with more candidate draws.
  { ...CONFIG, attempts: 600 },
  { ...CONFIG, minCell: 2 },
  { ...CONFIG, minCell: 2, minSupport: 6 },
  { ...CONFIG, minCell: 1, minSupport: 5, maxTier3: 2 },
];

// ---------------------------------------------------------------------------
// Args
// ---------------------------------------------------------------------------

const argv = process.argv.slice(2);
const argOf = (name, fallback) => {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
};
const force = argv.includes("--force");
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

// ---------------------------------------------------------------------------
// Pool + solvability
// ---------------------------------------------------------------------------

const key = (p) => `${p.type}:${p.value}`;
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

/**
 * Can 9 *distinct* cars fill the 9 cells? Per-cell candidate counts are not
 * enough on their own — the autocomplete bars reusing a car, so a grid where
 * every cell is individually fillable can still be impossible to complete.
 * Kuhn's augmenting-path matching over the bipartite cell/car graph.
 */
function hasPerfectMatching(cells) {
  const assignedTo = new Map(); // carId -> cell index
  const augment = (cell, seen) => {
    for (const carId of cells[cell]) {
      if (seen.has(carId)) continue;
      seen.add(carId);
      const holder = assignedTo.get(carId);
      if (holder === undefined || augment(holder, seen)) {
        assignedTo.set(carId, cell);
        return true;
      }
    }
    return false;
  };
  for (let i = 0; i < 9; i++) if (!augment(i, new Set())) return false;
  return true;
}

function drawAxis(pool, pick, config) {
  const out = [];
  const used = new Set();
  for (let guard = 0; out.length < 3 && guard < 300; guard++) {
    const candidate = pick(pool);
    if (!candidate) break;
    const k = key(candidate);
    if (used.has(k)) continue;
    if (out.filter((p) => p.type === candidate.type).length >= config.maxSameType) continue;
    used.add(k);
    out.push(candidate);
  }
  return out.length === 3 ? out : null;
}

/** Ordered pairs on one axis where one parameter is contained in another. */
function axisOverlap(axis, sets) {
  let n = 0;
  for (const a of axis) {
    for (const b of axis) {
      if (a === b) continue;
      const A = sets.get(key(a));
      const B = sets.get(key(b));
      if ([...A].every((id) => B.has(id))) n++;
    }
  }
  return n;
}

function generateForDate(cars, date, config) {
  const pool = buildPool(cars, config.minSupport);
  const sets = new Map(
    pool.map((p) => [key(p), new Set(cars.filter((c) => MATCH[p.type](c, p.value)).map((c) => c.id))])
  );
  const rng = makeRng(`cargrid:${date}`);
  const pick = (arr) => arr[Math.floor(rng() * arr.length)];
  let best = null;

  for (let attempt = 0; attempt < config.attempts; attempt++) {
    // One axis leans identity (Brand/Country/Decade), the other attribute —
    // the soft guideline in CLAUDE.md. Which axis gets which alternates.
    const identityOnRows = rng() < 0.5;
    const rowPool = pool.filter((p) => IDENTITY_TYPES.has(p.type) === identityOnRows);
    const colPool = pool.filter((p) => IDENTITY_TYPES.has(p.type) !== identityOnRows);

    const rows = drawAxis(rowPool, pick, config);
    const cols = drawAxis(colPool, pick, config);
    if (!rows || !cols) continue;

    const params = [...rows, ...cols];
    if (params.filter((p) => TIER[p.type] === 3).length > config.maxTier3) continue;

    const cells = [];
    let ok = true;
    for (const row of rows) {
      for (const col of cols) {
        const a = sets.get(key(row));
        const b = sets.get(key(col));
        const shared = [...a].filter((id) => b.has(id));
        // An implied cell — one parameter wholly containing the other — is a
        // freebie (every Audi is German), so reject it.
        if (shared.length < config.minCell || shared.length === a.size || shared.length === b.size) {
          ok = false;
          break;
        }
        cells.push(shared);
      }
      if (!ok) break;
    }
    if (!ok || !hasPerfectMatching(cells)) continue;

    const counts = cells.map((c) => c.length);
    const min = Math.min(...counts);
    const avg = counts.reduce((s, n) => s + n, 0) / 9;
    const tierBonus = params.reduce(
      (s, p) => s + (TIER[p.type] === 1 ? 3 : TIER[p.type] === 2 ? 1 : 0),
      0
    );
    // Penalise axes whose parameters shadow each other: Audi and German as two
    // rows is legal but makes for a flat puzzle.
    const overlap = axisOverlap(rows, sets) + axisOverlap(cols, sets);
    const score = min * 10 + avg + tierBonus - overlap * 4;

    if (!best || score > best.score) {
      best = { rows, cols, score, min, avg: Number(avg.toFixed(1)) };
    }
  }
  return best;
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

const cars = JSON.parse(readFileSync(carsPath, "utf8"));
const existing = existsSync(gridsPath) ? JSON.parse(readFileSync(gridsPath, "utf8")) : { grids: [] };
const byDate = new Map(force ? [] : existing.grids.map((g) => [g.date, g]));

let made = 0, kept = 0, relaxed = 0, extraSearch = 0, failed = 0;

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
  // Rung 1 only searches harder at full strictness; rung 2+ actually loosens.
  if (rung > 2) {
    relaxed++;
    console.log(`  ~ ${date} needed relaxation level ${rung - 2}`);
  } else if (rung === 2) {
    extraSearch++;
  }

  byDate.set(date, {
    id: `grid-${date}`,
    date,
    rows: grid.rows.map(toParam),
    columns: grid.cols.map(toParam),
    minCandidates: grid.min,
    avgCandidates: grid.avg,
  });
  made++;
}

const grids = [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
writeFileSync(gridsPath, JSON.stringify({ config: CONFIG, grids }, null, 2));

console.log(
  `\n${made} generated, ${kept} kept, ${extraSearch} needed a longer search, ` +
    `${relaxed} relaxed, ${failed} failed.`
);
console.log(`Schedule now covers ${grids.length} days: ${grids[0]?.date} -> ${grids.at(-1)?.date}`);
