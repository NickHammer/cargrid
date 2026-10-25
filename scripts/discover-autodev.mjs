/**
 * Discovers make/model pairs from the auto.dev Listings API that are not yet in
 * the catalog, to seed the research queue.
 *
 * Why Listings and not Specifications: the Specifications endpoint (engine
 * detail, aspiration, horsepower) requires auto.dev's paid Growth plan and
 * returns 402 on the free key. Listings is free and exposes faceted
 * aggregations, which is enough to enumerate what exists.
 *
 * What this can and cannot find: Listings indexes cars currently for sale in
 * the US, so it surfaces mainstream and modern models well. It will NOT surface
 * pre-1981 classics (no VIN), JDM-only cars, or European-only models. Treat the
 * output as discovery candidates for popular cars, not a complete catalog.
 *
 * Every response is cached under data/incoming/autodev-cache/ so reruns cost no
 * API calls. The free tier allows 1,000 calls per month.
 *
 * Usage:
 *   node scripts/discover-autodev.mjs                  # enumerate + report
 *   node scripts/discover-autodev.mjs --max-calls 40   # cap new API calls
 *   node scripts/discover-autodev.mjs --json out.json  # write candidate list
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from "fs";
import { join } from "path";

const CACHE_DIR = "data/incoming/autodev-cache";
const API = "https://api.auto.dev/listings";

const argv = process.argv.slice(2);
const argOf = (n, d) => { const i = argv.indexOf(n); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };
const maxCalls = parseInt(argOf("--max-calls", "60"), 10);
const jsonOut = argOf("--json", null);

// ---------------------------------------------------------------------------

function apiKey() {
  const raw = readFileSync(".env.local", "utf8");
  for (const line of raw.split("\n")) {
    if (line.trim().startsWith("#") || !line.includes("=")) continue;
    const k = line.slice(0, line.indexOf("=")).trim();
    if (k === "AUTO_DEV_KEY") return line.slice(line.indexOf("=") + 1).trim();
  }
  throw new Error("AUTO_DEV_KEY not found in .env.local");
}

const KEY = apiKey();
let calls = 0;

mkdirSync(CACHE_DIR, { recursive: true });
const cacheFile = (name) => join(CACHE_DIR, name.replace(/[^a-z0-9]+/gi, "_") + ".json");

/** Cached GET. Returns null when the call budget is spent. */
async function get(url, cacheName) {
  const f = cacheFile(cacheName);
  if (existsSync(f)) return JSON.parse(readFileSync(f, "utf8"));
  if (calls >= maxCalls) return null;
  calls++;
  const r = await fetch(url, { headers: { Authorization: "Bearer " + KEY, Accept: "application/json" } });
  if (!r.ok) {
    console.log(`  ! HTTP ${r.status} for ${cacheName}`);
    return null;
  }
  const j = await r.json();
  writeFileSync(f, JSON.stringify(j));
  await new Promise((s) => setTimeout(s, 350)); // be polite
  return j;
}

/**
 * Facets arrive as an object mapping a label to a drill-down URL:
 *   { "Ford (709120)": "https://api.auto.dev/listings?...&vehicle.make=Ford" }
 * The count is embedded in the label text, so parse it back out.
 */
function parseFacet(entries) {
  if (!entries) return [];
  const list = Array.isArray(entries) ? entries : Object.keys(entries);
  return list.map((e) => {
    const label = Array.isArray(e) ? e[0] : String(e);
    const m = label.match(/^(.*?)\s*\((\d+)\)\s*$/);
    return m ? { value: m[1].trim(), count: Number(m[2]) } : { value: label.trim(), count: 0 };
  });
}

// ---------------------------------------------------------------------------

const cars = JSON.parse(readFileSync("data/cars.json", "utf8"));
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
const haveModel = new Set(cars.map((c) => norm(c.make + c.model)));
const haveMake = [...new Set(cars.map((c) => c.make))];

// Don't re-propose anything already sitting in another batch under data/incoming
const queued = new Set();
for (const f of readdirSync("data/incoming").filter((f) => f.endsWith(".json"))) {
  try {
    const j = JSON.parse(readFileSync(join("data/incoming", f), "utf8"));
    const list = Array.isArray(j) ? j : j.cars ?? j.candidates ?? [];
    for (const c of list) if (c?.make && c?.model) queued.add(norm(c.make + c.model));
  } catch { /* not a candidate batch */ }
}

console.log(`catalog: ${cars.length} cars across ${haveMake.length} makes`);
console.log(`already queued elsewhere: ${queued.size} make/model pairs\n`);

// 1. top makes by listing volume
const top = await get(`${API}?limit=1&includes=facets`, "facets-root");
if (!top) { console.log("no data (budget spent or request failed)"); process.exit(1); }
const listingMakes = parseFacet(top.facets?.makes);

// 2. models per make — union of what listings ranks highest and what we already carry
const targets = [...new Set([...listingMakes.map((m) => m.value), ...haveMake])];
console.log(`enumerating models for ${targets.length} makes (cache + up to ${maxCalls} calls)\n`);

const candidates = [];
let skippedForBudget = 0;
for (const make of targets) {
  const url = `${API}?limit=1&includes=facets&vehicle.make=${encodeURIComponent(make)}`;
  const j = await get(url, `models-${make}`);
  if (!j) { skippedForBudget++; continue; }
  for (const { value: model, count } of parseFacet(j.facets?.models)) {
    const key = norm(make + model);
    if (haveModel.has(key) || queued.has(key)) continue;
    candidates.push({ make, model, listings: count });
  }
}

candidates.sort((a, b) => b.listings - a.listings);

console.log(`API calls used this run: ${calls}`);
if (skippedForBudget) console.log(`makes skipped for budget: ${skippedForBudget} (rerun to continue)`);
console.log(`new candidates found: ${candidates.length}\n`);

console.log("most-listed models absent from the catalog:");
for (const c of candidates.slice(0, 40)) {
  console.log(`  ${(c.make + " " + c.model).padEnd(34)}${String(c.listings).padStart(8)} listings`);
}

const byMake = {};
for (const c of candidates) byMake[c.make] = (byMake[c.make] ?? 0) + 1;
console.log("\ngaps by make:");
for (const [m, n] of Object.entries(byMake).sort((a, b) => b[1] - a[1]).slice(0, 15)) {
  console.log(`  ${m.padEnd(18)}${String(n).padStart(3)} models missing`);
}

if (jsonOut) {
  writeFileSync(jsonOut, JSON.stringify({
    source: "auto.dev Listings facets (US cars currently for sale)",
    caveat: "Skews modern and US-market. Does not surface pre-1981, JDM-only or Europe-only models. Unverified discovery candidates, not vehicle facts.",
    generated_calls: calls,
    cars: candidates,
  }, null, 2) + "\n");
  console.log(`\nwrote ${candidates.length} candidates -> ${jsonOut}`);
}
