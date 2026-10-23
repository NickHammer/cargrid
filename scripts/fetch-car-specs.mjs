/**
 * Validates a make/model against NHTSA, fetches launch specs from the EPA
 * fueleconomy.gov API (1984+), and appends a pre-filled record to cars.json.
 *
 * Auto-fills (when EPA data exists): production_start, drivetrain, fuel_type,
 *   transmission, engine_layouts (unambiguous cases), country_of_origin and
 *   manufacturer_still_active (known makes).
 *
 * Still needs manual fill: production_end, car_class, body_style,
 *   power_output_hp_min/max, engine_layouts for 6-cyl (I6 vs V6 vs Flat-6).
 *
 * Requires Node 18+.
 *
 * Usage:
 *   node scripts/fetch-car-specs.mjs "<make>" "<model>"
 */

import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { derivePowerRanges } from "./derive-fields.mjs";
import { canonicalMakeName } from "./make-names.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const carsPath = join(__dirname, "../data/cars.json");


const [, , make, model] = process.argv;

if (!make || !model) {
  console.error('Usage: node scripts/fetch-car-specs.mjs "<make>" "<model>"');
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Lookup tables
// ---------------------------------------------------------------------------

const COUNTRY_BY_MAKE = {
  ford: "American", chevrolet: "American", dodge: "American", chrysler: "American",
  jeep: "American", cadillac: "American", buick: "American", gmc: "American",
  lincoln: "American", pontiac: "American", oldsmobile: "American", plymouth: "American",
  mercury: "American", tesla: "American", rivian: "American", saturn: "American",
  hummer: "American", ram: "American",
  toyota: "Japanese", honda: "Japanese", nissan: "Japanese", mazda: "Japanese",
  subaru: "Japanese", mitsubishi: "Japanese", suzuki: "Japanese", lexus: "Japanese",
  acura: "Japanese", infiniti: "Japanese", scion: "Japanese", isuzu: "Japanese",
  daihatsu: "Japanese",
  bmw: "German", "mercedes-benz": "German", volkswagen: "German", audi: "German",
  porsche: "German", opel: "German",
  ferrari: "Italian", lamborghini: "Italian", fiat: "Italian", "alfa romeo": "Italian",
  maserati: "Italian", lancia: "Italian", pagani: "Italian",
  "aston martin": "British", bentley: "British", "rolls-royce": "British",
  "land rover": "British", jaguar: "British", lotus: "British", mclaren: "British",
  mini: "British", triumph: "British",
  peugeot: "French", renault: "French", citroën: "French", bugatti: "French",
  volvo: "Swedish", saab: "Swedish", koenigsegg: "Swedish",
  hyundai: "Korean", kia: "Korean", genesis: "Korean",
};

const INACTIVE_MAKES = new Set([
  "pontiac", "oldsmobile", "plymouth", "mercury", "saturn", "hummer",
  "saab", "geo", "eagle", "daewoo", "triumph", "daihatsu",
]);

// ---------------------------------------------------------------------------
// Field mappers
// ---------------------------------------------------------------------------

function mapDrivetrain(drive) {
  if (!drive) return null;
  const d = drive.toLowerCase();
  if (d.includes("rear")) return "RWD";
  if (d.includes("front")) return "FWD";
  if (d.includes("4-wheel") || d.includes("four-wheel") || d === "4wd") return "4WD";
  if (d.includes("all-wheel") || d === "awd") return "AWD";
  return null;
}

function mapTransmission(trany) {
  if (!trany) return null;
  const t = trany.toLowerCase();
  if (t.startsWith("man") || t.includes("manual")) return "Manual";
  if (t.includes("cvt") || t.includes("variable")) return "CVT";
  if (t.startsWith("auto") || t.includes("automatic") || t.includes("spd")) return "Automatic";
  return null;
}

function mapFuelType(fuelType1) {
  if (!fuelType1) return null;
  const f = fuelType1.toLowerCase();
  if (f.includes("plug") || f.includes("phev")) return "Plug-in Hybrid";
  if (f.includes("electric")) return "Electric";
  if (f.includes("hybrid")) return "Hybrid";
  if (f.includes("diesel")) return "Diesel";
  if (f.includes("gas") || f.includes("gasoline") || f.includes("regular") ||
      f.includes("premium") || f.includes("midgrade")) return "Gasoline";
  return null;
}

// Infer engine layout from cylinder count.
// Returns a string (confident) or an object { hint } (ambiguous) or null.
function inferEngineLayout(cylinders) {
  const n = parseInt(cylinders);
  if (!n) return null;
  if (n === 4) return "Inline-4";   // Flat-4 exists (Subaru/Porsche) but rare — user can correct
  if (n === 8) return "V8";
  if (n === 10) return "V10";
  if (n === 12) return "V12";
  if (n === 6) return { hint: `6-cyl — verify: Inline-6 | V6 | Flat-6` };
  return null;
}

function unique(arr) {
  return [...new Set(arr.filter(Boolean))];
}

function todo(msg) {
  return `TODO — ${msg}`;
}

// ---------------------------------------------------------------------------
// Step 1: NHTSA validation
// ---------------------------------------------------------------------------

const NHTSA = "https://vpic.nhtsa.dot.gov/api/vehicles";

console.log("\nValidating against NHTSA…");
const makesRes = await fetch(`${NHTSA}/getallmakes?format=json`);
const makesData = await makesRes.json();
const matchedMake = makesData.Results.find(
  (m) => m.Make_Name.toLowerCase() === make.toLowerCase()
);

if (!matchedMake) {
  console.error(`Make "${make}" not found in NHTSA database. Check spelling.`);
  process.exit(1);
}

const modelsRes = await fetch(
  `${NHTSA}/GetModelsForMake/${encodeURIComponent(matchedMake.Make_Name)}?format=json`
);
const modelsData = await modelsRes.json();
const matchedModel = modelsData.Results.find(
  (m) => m.Model_Name.toLowerCase() === model.toLowerCase()
);

if (!matchedModel) {
  const similar = modelsData.Results
    .filter((m) => m.Model_Name.toLowerCase().includes(model.toLowerCase()))
    .map((m) => m.Model_Name);
  console.error(`Model "${model}" not found under ${matchedMake.Make_Name}.`);
  if (similar.length) console.error(`  Did you mean: ${similar.join(", ")}?`);
  process.exit(1);
}

const canonicalMake = canonicalMakeName(matchedMake.Make_Name);
const canonicalModel = matchedModel.Model_Name;
const slug = `${canonicalMake}-${canonicalModel}`.toLowerCase().replace(/\s+/g, "-");

console.log(`✓ ${canonicalMake} ${canonicalModel} confirmed`);

// ---------------------------------------------------------------------------
// Step 2: EPA fueleconomy.gov spec fetch (1984+ only)
// ---------------------------------------------------------------------------

const EPA = "https://www.fueleconomy.gov/ws/rest";
const JSON_HEADERS = { Accept: "application/json" };
// EPA menu endpoints return menuItem as a bare object when there is exactly
// one result, and an array otherwise
const asArray = (x) => (Array.isArray(x) ? x : x == null ? [] : [x]);
let epaSpecs = null;

console.log("Fetching launch specs from fueleconomy.gov…");
try {
  // Get all available years for this make/model
  const yearsRes = await fetch(
    `${EPA}/vehicle/menu/year?make=${encodeURIComponent(canonicalMake)}&model=${encodeURIComponent(canonicalModel)}`,
    { headers: JSON_HEADERS }
  );
  const yearsData = await yearsRes.json();
  const years = asArray(yearsData?.menuItem)
    .map((item) => parseInt(item.value))
    .filter(Boolean)
    .sort((a, b) => a - b);

  if (years.length === 0) {
    console.log("  ⚠ Not in EPA database (pre-1984 or make/model spelling differs) — spec fields left as TODO");
  } else {
    // Walk forward from earliest year until we find one with actual trim data
    // (EPA sometimes lists a year with no trims — bad data)
    let firstYear = null;
    let trimIds = [];
    for (const year of years) {
      const trimsRes = await fetch(
        `${EPA}/vehicle/menu/options?make=${encodeURIComponent(canonicalMake)}&model=${encodeURIComponent(canonicalModel)}&year=${year}`,
        { headers: JSON_HEADERS }
      );
      const trimsData = await trimsRes.json();
      const ids = asArray(trimsData?.menuItem).map((item) => item.value).filter(Boolean);
      if (ids.length > 0) { firstYear = year; trimIds = ids; break; }
    }

    if (firstYear) {
      // Fetch full spec for each trim (in parallel, capped at 6 to avoid hammering)
      const specs = await Promise.all(
        trimIds.slice(0, 6).map((id) =>
          fetch(`${EPA}/vehicle/${id}`, { headers: JSON_HEADERS }).then((r) => r.json())
        )
      );

      const drivetrains = unique(specs.map((s) => mapDrivetrain(s.drive)));
      const transmissions = unique(specs.map((s) => mapTransmission(s.trany)));
      const fuelTypes = unique(specs.map((s) => mapFuelType(s.fuelType1)));
      const cylCounts = unique(specs.map((s) => s.cylinders).filter(Boolean));

      // Infer engine layouts — collect confident results and hints
      const engineLayouts = [];
      const engineHints = [];
      for (const cyl of cylCounts) {
        const result = inferEngineLayout(cyl);
        if (!result) continue;
        if (typeof result === "string") engineLayouts.push(result);
        else engineHints.push(result.hint);
      }

      epaSpecs = {
        production_start: firstYear,
        drivetrain: drivetrains.length ? drivetrains : null,
        transmission: transmissions.length ? transmissions : null,
        fuel_type: fuelTypes.length ? fuelTypes : null,
        engine_layouts: engineLayouts.length ? engineLayouts : null,
        engine_hints: engineHints,
      };

      console.log(`  ✓ Found ${trimIds.length} trim(s) for ${firstYear}`);
      if (engineHints.length) console.log(`  ⚠ Engine layout ambiguous: ${engineHints.join("; ")}`);
    } else {
      console.log("  ⚠ EPA listed years but all trim fetches empty — spec fields left as TODO");
    }
  }
} catch (e) {
  console.log(`  ⚠ EPA fetch failed (${e.message}) — spec fields left as TODO`);
}

// ---------------------------------------------------------------------------
// Step 3: Wikipedia HP fetch
// ---------------------------------------------------------------------------

let hpMin = null;
let hpMax = null;
let wikiUrl = null;

console.log("Fetching HP data from Wikipedia…");
try {
  const WIKI_HEADERS = { "User-Agent": "CarGrid.io/1.0 (curation script; nick.hammerstrom14@gmail.com)" };

  // Search for the most relevant article, preferring first/specific-generation articles
  const query = `${canonicalMake} ${canonicalModel}`;
  const searchRes = await fetch(
    `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&srlimit=1&format=json`,
    { headers: WIKI_HEADERS }
  );
  const searchData = await searchRes.json();
  const pageTitle = searchData?.query?.search?.[0]?.title;

  if (!pageTitle) {
    console.log("  ⚠ No Wikipedia article found — HP left as TODO");
  } else {
    wikiUrl = `https://en.wikipedia.org/wiki/${pageTitle.replace(/ /g, "_")}`;

    const wikiRes = await fetch(
      `https://en.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(pageTitle)}&prop=wikitext&format=json`,
      { headers: WIKI_HEADERS }
    );
    const wikiData = await wikiRes.json();
    const wikitext = wikiData?.parse?.wikitext?.["*"] ?? "";

    // Extract HP numbers from a wikitext string.
    // Handles: {{convert|N|hp|...}}, {{cvt|N|hp|...}}, {{cvt|N-M|hp|...}},
    //          PS/bhp sources, kW sources, and bare "N hp" text.
    function parseHp(str) {
      const nums = [];
      // {{convert|N|unit}} and {{cvt|N|unit}} — also handles ranges like {{cvt|600-770|hp}}
      const tmplRe = /\{\{(?:convert|cvt)\|(\d+)(?:[–\-](\d+))?\|(?:[–\-]\|(\d+)\|)?(hp|bhp|PS|kW)/gi;
      for (const m of str.matchAll(tmplRe)) {
        const unit = m[4].toLowerCase();
        const a = parseInt(m[1]), b = parseInt(m[2] ?? m[3] ?? m[1]);
        const toHp = (n) => unit === "kw" ? Math.round(n * 1.341) : n; // PS ≈ hp close enough
        nums.push(toHp(a), toHp(b));
      }
      // Bare "N hp" / "N bhp" / "N SAE hp"
      for (const m of str.matchAll(/(\d{2,4})\s*(?:SAE\s+)?(?:hp|bhp)\b/gi)) {
        nums.push(parseInt(m[1]));
      }
      return [...new Set(nums)].filter((n) => n > 0 && n < 3000);
    }

    // Strategy 1: |power = field in any infobox
    const powerField = wikitext.match(/\|\s*power\s*=\s*([^\n]+)/i)?.[1];
    const s1 = powerField ? parseHp(powerField) : [];

    // Strategy 2: first spec-table row containing hp/bhp/PS (gen-specific tables)
    // Look for the first {{cvt|N|hp|...}} or {{cvt|N|bhp|...}} in the whole article
    const firstCvt = wikitext.match(/\{\{(?:convert|cvt)\|(\d+)(?:[–\-]\d+)?\|(?:[–\-]\|\d+\|)?(hp|bhp|PS|kW)/i);
    const s2 = firstCvt ? parseHp(firstCvt[0]) : [];

    const allNums = s1.length ? s1 : s2;

    if (allNums.length > 0) {
      hpMin = Math.min(...allNums);
      hpMax = Math.max(...allNums);
      const src = s1.length ? "infobox" : "spec table";
      console.log(`  ✓ HP: ${hpMin === hpMax ? hpMin : `${hpMin}–${hpMax}`} hp (from ${src} — verify: ${wikiUrl})`);
    } else {
      console.log(`  ⚠ Couldn't parse HP from Wikipedia — fill manually`);
      console.log(`  → ${wikiUrl}`);
    }
  }
} catch (e) {
  console.log(`  ⚠ Wikipedia fetch failed (${e.message}) — HP left as TODO`);
}

// ---------------------------------------------------------------------------
// Step 4: Build template
// ---------------------------------------------------------------------------

const makeLower = canonicalMake.toLowerCase();
const country = COUNTRY_BY_MAKE[makeLower] ?? null;
// Known inactive → false; known make but not inactive → true; unknown → TODO
const stillActive = INACTIVE_MAKES.has(makeLower)
  ? false
  : (makeLower in COUNTRY_BY_MAKE ? true : null);

const productionStart = epaSpecs?.production_start ?? todo("first gen start year (integer)");

// Always leave decades as TODO — production_end is unknown at this stage,
// so pre-deriving would produce a misleadingly wide range.
const decades = [todo("run derive-fields.mjs after setting production years")];

// Engine layout: use confident auto-fills if we have them;
// otherwise build a helpful TODO hint from cylinder data
let engineLayoutsField;
if (epaSpecs?.engine_layouts?.length) {
  engineLayoutsField = epaSpecs.engine_layouts;
} else if (epaSpecs?.engine_hints?.length) {
  engineLayoutsField = [todo(epaSpecs.engine_hints.join(" | "))];
} else {
  engineLayoutsField = [todo("V8 | V12 | V10 | V6 | Inline-6 | Inline-4 | Flat-6 | Flat-4 | Rotary | Electric | ...")];
}

const template = {
  id: `${slug}-g1`,
  make: canonicalMake,
  model: canonicalModel,
  generation: 1,
  brands: [canonicalMake],
  country_of_origin: country ?? todo("American | German | Japanese | Italian | British | French | Swedish | Korean | ..."),
  production_start: productionStart,
  production_end: todo("first gen end year (integer), or null if still in first gen"),
  decades,
  engine_layouts: engineLayoutsField,
  body_style: todo("Sedan | Coupe | Convertible | Hatchback | Wagon | SUV | Pickup Truck | Minivan"),
  drivetrain: epaSpecs?.drivetrain ?? [todo("RWD | FWD | AWD | 4WD (array — include all offered options)")],
  car_class: todo("Muscle Car | Sports Car | Supercar | Hypercar | Hot Hatch | SUV | Off-Road | Pickup Truck | Sedan | Coupe | Hatchback | Wagon | Minivan"),
  power_output_hp_min: hpMin ?? todo("integer, weakest engine option at first gen launch"),
  power_output_hp_max: hpMax ?? todo("integer, strongest engine option at first gen launch"),
  power_output_ranges: (hpMin !== null && hpMax !== null)
    ? derivePowerRanges(hpMin, hpMax)
    : [todo("run derive-fields.mjs after setting hp values")],
  transmission: epaSpecs?.transmission ?? [todo("Manual | Automatic | CVT (array — include all offered options)")],
  fuel_type: epaSpecs?.fuel_type ?? [todo("Gasoline | Diesel | Electric | Hybrid | Plug-in Hybrid (array)")],
  pop_culture: null,
  price_at_launch_usd: null,
  manufacturer_still_active: stillActive ?? todo("boolean — is the brand still producing cars?"),
  image_url: "",
};

// ---------------------------------------------------------------------------
// Step 5: Append to cars.json
// ---------------------------------------------------------------------------

const cars = JSON.parse(readFileSync(carsPath, "utf8"));
const duplicate = cars.find((c) => c.id === template.id);
if (duplicate) {
  console.error(`⚠ "${template.id}" already exists in cars.json — skipping.`);
  process.exit(1);
}

cars.push(template);
writeFileSync(carsPath, JSON.stringify(cars, null, 2));
console.log(`✓ Added "${template.id}" to data/cars.json (${cars.length} total)`);

// Report remaining TODOs
const remaining = [];
function scanTodos(obj) {
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === "string" && v.startsWith("TODO")) remaining.push(k);
    else if (Array.isArray(v) && v.length === 1 && typeof v[0] === "string" && v[0].startsWith("TODO"))
      remaining.push(k);
  }
}
scanTodos(template);

if (remaining.length) {
  console.log(`  Manual fill needed: ${remaining.join(", ")}`);
}
console.log("  Run when done: node scripts/derive-fields.mjs");
