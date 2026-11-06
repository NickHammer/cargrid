/**
 * Re-checks every grid in data/grids.json against the current data/cars.json.
 *
 * A committed schedule can be invalidated from underneath by a dataset edit —
 * a corrected hp figure moves a car out of a power bucket, a production-year
 * fix moves it out of a decade. Run this after any change to cars.json.
 *
 * Checks each grid for:
 *   - known parameter types and non-empty labels
 *   - at least MIN_CELL distinct nameplates answering every cell
 *   - a perfect matching of 9 distinct nameplates (a 9/9 is achievable)
 *
 * Answers are counted as nameplates, not records, because a guess is Make +
 * Model: a square holding five generations of Honda Civic offers the player one
 * answer, not five, and using a nameplate consumes all of its generations.
 *
 * Also guards the schedule runway: --min-days fails the run when fewer than N
 * days remain from today, so a schedule about to run dry breaks CI instead of
 * quietly serving "no grid scheduled" to every visitor.
 *
 * Usage: node scripts/validate-grids.mjs [--min 3] [--min-days 60] [--verbose]
 * Exits non-zero if any grid fails.
 */

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { MATCH, PARAMETER_TYPES, nameplateKey, hasDistinctSolution } from "./grid-params.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const cars = JSON.parse(readFileSync(join(__dirname, "../data/cars.json"), "utf8"));
const { grids } = JSON.parse(readFileSync(join(__dirname, "../data/grids.json"), "utf8"));

const argv = process.argv.slice(2);
const minIdx = argv.indexOf("--min");
const MIN_CELL = minIdx >= 0 ? parseInt(argv[minIdx + 1], 10) : 1;
const daysIdx = argv.indexOf("--min-days");
const MIN_DAYS = daysIdx >= 0 ? parseInt(argv[daysIdx + 1], 10) : 0;
const verbose = argv.includes("--verbose");

function todayLocal() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** The distinct nameplates answering a square — what a player can type. */
function candidates(row, col) {
  const plates = new Set();
  for (const c of cars) {
    if (MATCH[row.type](c, row.value) && MATCH[col.type](c, col.value)) {
      plates.add(nameplateKey(c));
    }
  }
  return [...plates];
}

let failures = 0;
const worst = [];

for (const grid of grids) {
  const problems = [];
  const params = [...grid.rows, ...grid.columns];

  if (grid.rows.length !== 3 || grid.columns.length !== 3) problems.push("not a 3x3 grid");
  for (const p of params) {
    if (!PARAMETER_TYPES.includes(p.type)) problems.push(`unknown parameter type "${p.type}"`);
    if (!p.label) problems.push(`missing label for ${p.type}:${p.value}`);
  }

  const cells = [];
  if (!problems.length) {
    for (const [r, row] of grid.rows.entries()) {
      for (const [c, col] of grid.columns.entries()) {
        const ids = candidates(row, col);
        if (ids.length < MIN_CELL) {
          problems.push(`cell [${r}][${c}] ${row.label} x ${col.label}: ${ids.length} nameplate(s)`);
        }
        cells.push(ids);
      }
    }
    if (cells.length === 9 && !hasDistinctSolution(cells)) {
      problems.push("no perfect matching — 9 distinct nameplates cannot fill the grid");
    }
  }

  const min = cells.length ? Math.min(...cells.map((c) => c.length)) : 0;
  worst.push({ date: grid.date, min });

  if (problems.length) {
    failures++;
    console.log(`FAIL ${grid.date}`);
    for (const p of problems) console.log(`      ${p}`);
  } else if (verbose) {
    console.log(`ok   ${grid.date}  worst cell ${min}`);
  }
}

worst.sort((a, b) => a.min - b.min);
console.log(`\n${grids.length - failures}/${grids.length} grids valid (min ${MIN_CELL} per cell).`);
console.log(
  "Tightest grids: " + worst.slice(0, 5).map((w) => `${w.date} (${w.min})`).join(", ")
);

// Runway check — how many scheduled days are still ahead of today?
const today = todayLocal();
const remaining = grids.filter((g) => g.date >= today).length;
const last = grids.at(-1)?.date;
console.log(`Runway: ${remaining} day(s) remaining, through ${last}.`);

let runwayShort = false;
if (MIN_DAYS && remaining < MIN_DAYS) {
  console.log(
    `\nSCHEDULE RUNNING OUT: ${remaining} day(s) left, below the ${MIN_DAYS} required.\n` +
      `Extend it with:  node scripts/generate-grids.mjs --from ${last} --days 365`
  );
  runwayShort = true;
}

process.exit(failures || runwayShort ? 1 : 0);
