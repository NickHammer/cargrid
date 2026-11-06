import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  MATCH,
  VALUES,
  labelFor,
  nameplateKey,
  groupByNameplate,
  firstAnswering,
  hasDistinctSolution,
  countNameplates,
  matchRank,
} from "./grid-params.mjs";
import { prepareBatch, validateCar, coverage, validateSchedule } from "./lib/curation.mjs";
import { reviewImageLicense } from "./lib/image-license.mjs";

const cars = JSON.parse(fs.readFileSync(new URL("../data/cars.json", import.meta.url), "utf8"));
const base = { ...cars[0] };
delete base.powertrains;
delete base.engine_position;
const record = () => ({ carId: base.id, status: "approved", scope: "launch", market: "Global", reviewedAt: "2026-10-23", facts: { powertrains: [{ name: "Test launch engine", displacement_cc: 1998, cylinders: 4, aspiration: "Turbocharged" }] }, evidence: { powertrains: [{ url: "https://example.com/launch-specs", note: "Fixture source for the test launch engine." }] } });
const batch = (r) => ({ schemaVersion: 1, id: "test-batch", records: [r] });

test("unapproved discovery records cannot leak into published cars", () => {
  const result = prepareBatch([base], batch({ status: "candidate", car: { id: "unverified" } }));
  assert.deepEqual(result.cars, [base]);
  assert.equal(result.skipped, 1);
  assert.equal(result.provenance.length, 0);
});

test("approval requires field-specific evidence, explicit scope, market and review date", () => {
  for (const edit of [
    (r) => { r.evidence = {}; },
    (r) => { r.evidence.powertrains[0].url = "javascript:bad"; },
    (r) => { r.evidence.powertrains[0].note = ""; },
    (r) => { r.facts.engine_position = "Mid-engine"; },
    (r) => { r.market = ""; },
    (r) => { r.scope = "entire production run"; },
    (r) => { r.reviewedAt = "2999-01-01"; },
  ]) {
    const r = record(); edit(r);
    assert.throws(() => prepareBatch([base], batch(r)));
  }
});

test("publishing is idempotent, retains evidence and leaves input data untouched", () => {
  const r = record();
  const first = prepareBatch([base], batch(r));
  assert.equal(first.enriched, 1);
  assert.equal(first.provenance.length, 1);
  assert.equal(base.powertrains, undefined);
  const again = prepareBatch(first.cars, batch(r), first.provenance);
  assert.equal(again.enriched, 0);
  assert.deepEqual(again.cars, first.cars);
  assert.equal(again.provenance.length, 1);
});

test("conflicting, unsupported, unknown-car and duplicate records are rejected", () => {
  const r = record();
  assert.throws(() => prepareBatch([{ ...base, powertrains: [{ name: "Different" }] }], batch(r)), /conflicting/);
  assert.throws(() => prepareBatch([], batch(r)), /unknown car/);
  assert.throws(() => prepareBatch([base], { ...batch(r), records: [r, r] }), /duplicate/);
  const bad = record(); bad.facts.powertrains[0].displacement_cc = -1;
  assert.throws(() => prepareBatch([base], batch(bad)), /displacement/);
});

test("new car additions require complete validated records and cannot overwrite existing cars", () => {
  const r = record();
  delete r.facts;
  r.car = { ...base, id: "test-launch-g1", generation: 1, image_url: "" };
  r.carId = r.car.id;
  r.evidence = Object.fromEntries(Object.keys(r.car).filter((f) => !["id", "decades", "power_output_ranges", "image_url"].includes(f)).map((f) => [f, [{ url: "https://example.com/spec", note: `Source for ${f}` }]]));
  const result = prepareBatch([base], batch(r));
  assert.equal(result.added, 1);
  const missing = structuredClone(r); delete missing.car.drivetrain;
  assert.throws(() => prepareBatch([base], batch(missing)), /drivetrain/);
  const changed = structuredClone(r); changed.car.model = "Different model";
  assert.throws(() => prepareBatch(result.cars, batch(changed)), /cannot be replaced/);
});

test("numeric displacement buckets have exact nonoverlapping boundaries", () => {
  for (const [cc, expected] of [[1998, "0-2000"], [2000, "0-2000"], [2000.1, "2000-3000"], [3000, "2000-3000"], [3001, "3000-4000"], [4000, "3000-4000"], [5000, "4000-5000"], [5001, "5000+"]]) {
    const car = { ...base, powertrains: [{ name: "Fixture", displacement_cc: cc }] };
    assert.deepEqual(VALUES.displacement(car), [expected]);
    assert.equal(MATCH.displacement(car, expected), true);
  }
  assert.deepEqual(VALUES.displacement({ ...base, powertrains: [] }), []);
});

test("cylinder counts reuse layout facts, deduplicate and exclude electric and rotary", () => {
  assert.deepEqual(VALUES.cylinder_count({ ...base, engine_layouts: ["V6", "Inline-6", "Flat-4", "Rotary", "Electric"] }), ["4", "6"]);
  assert.deepEqual(VALUES.cylinder_count({ ...base, engine_layouts: ["Electric", "Rotary"] }), []);
  assert.equal(MATCH.aspiration(base, "Naturally aspirated"), false);
  assert.equal(MATCH.engine_position(base, "Front-engine"), false);
});

test("all enumerated values match the same cars in generator and runtime rules", () => {
  for (const car of cars) for (const [type, getValues] of Object.entries(VALUES)) {
    for (const value of getValues(car)) {
      assert.equal(MATCH[type](car, value), true, `${car.id} ${type}:${value}`);
      assert.ok(labelFor(type, value));
    }
  }
});

test("coverage excludes single-value types, thin and implied intersections", () => {
  // Distinct models on purpose. Support is counted in nameplates now, so
  // eight copies of one nameplate would make this pass for the wrong reason —
  // nothing eligible at all, rather than the single-value-type rule under test.
  const small = Array.from({ length: 8 }, (_, i) => ({ ...base, id: `fixture-${i}`, model: `Fixture ${i}`, brands: ["OnlyBrand"], country_of_origin: "OnlyCountry", engine_layouts: ["V8"] }));
  const report = coverage(small);
  assert.equal(report.playableIntersections, 0);
});

test("schedule validation catches impossible distinct-nameplate assignment despite individual answers", () => {
  const grid = { date: "fixture", rows: Array(3).fill({ type: "brand", value: base.make }), columns: Array(3).fill({ type: "country_of_origin", value: base.country_of_origin }) };
  assert.match(validateSchedule([base], [grid], 1).join(" "), /no distinct-nameplate solution/);
});

test("new image downloads reject incomplete, restrictive or mismatched license metadata", () => {
  const meta = { LicenseShortName: { value: "CC BY-SA 4.0" }, LicenseUrl: { value: "https://creativecommons.org/licenses/by-sa/4.0/" }, Artist: { value: "<a>Photographer</a>" } };
  assert.equal(reviewImageLicense(meta).artist, "Photographer");
  for (const value of ["unknown", "CC BY-NC 4.0", "CC BY-ND 4.0", "All rights reserved"]) {
    assert.equal(reviewImageLicense({ ...meta, LicenseShortName: { value } }), null);
  }
  assert.equal(reviewImageLicense({ ...meta, LicenseUrl: { value: "https://example.com/license" } }), null);
  assert.equal(reviewImageLicense({ ...meta, LicenseUrl: { value: "https://creativecommons.org/licenses/by/4.0/" } }), null);
  assert.equal(reviewImageLicense({ ...meta, Artist: { value: "" } }), null);
});

test("current published cars satisfy schema invariants", () => {
  for (const car of cars) assert.deepEqual(validateCar(car), [], car.id);
});

/**
 * Two records must never share one Commons file.
 *
 * Found live, not hypothetically: the base Nissan Skyline R33 was wearing the
 * GT-R's photo, the base Cadillac CTS the CTS-V's, and a Renault Scenic was
 * showing a Renault Megane. The fetcher searches per record and has no idea
 * another record already took that file, so a shared file means at least one
 * of the two is wrong — usually the plain car showing its faster sibling,
 * which is exactly the distinction the dataset keeps separate records for.
 *
 * It survived visual review three times because a silver Megane and a silver
 * Scenic look alike at thumbnail size. The file name does not.
 */
test("no two published cars share the same source photo", () => {
  const credits = JSON.parse(fs.readFileSync(new URL("../data/image-credits.json", import.meta.url), "utf8"));
  const byFile = new Map();
  for (const [id, credit] of Object.entries(credits)) {
    if (!credit?.verified || !credit.source) continue;
    byFile.set(credit.source, [...(byFile.get(credit.source) ?? []), id]);
  }
  const shared = [...byFile].filter(([, ids]) => ids.length > 1);
  assert.deepEqual(shared.map(([, ids]) => ids.join(" + ")), []);
});

/** Every published image is on disk, and every file on disk is published. */
test("cars.json image_url and public/cars are in sync", () => {
  const dir = new URL("../public/cars/", import.meta.url);
  const onDisk = new Set(fs.readdirSync(dir));
  const referenced = new Set(cars.filter((c) => c.image_url).map((c) => c.image_url.replace("/cars/", "")));
  assert.deepEqual([...referenced].filter((f) => !onDisk.has(f)), [], "referenced but missing from disk");
  assert.deepEqual([...onDisk].filter((f) => !referenced.has(f)), [], "on disk but referenced by no car");
});

/**
 * Attribution is a licence condition, not a nicety: most of these files are
 * CC BY or CC BY-SA, which require naming the photographer. A published image
 * with no credit entry is a licence breach, so this guards /credits coverage.
 */
test("every published image has a verified credit entry", () => {
  const credits = JSON.parse(fs.readFileSync(new URL("../data/image-credits.json", import.meta.url), "utf8"));
  const missing = cars
    .filter((c) => c.image_url)
    .filter((c) => !credits[c.id]?.verified || !credits[c.id]?.artist)
    .map((c) => c.id);
  assert.deepEqual(missing, []);
});

/**
 * No car ships without a photo.
 *
 * A record with an empty image_url used to render as a plain text tile. That
 * made it a correct answer that showed the player nothing, and the standing
 * rule for this catalog is accurate data AND an accurate image — both, or the
 * car waits. Records without a photo live in data/incoming/needs-photo.json
 * and come back via `park-imageless-cars.mjs --restore` once one is verified.
 */
test("every car in the catalog has a photo", () => {
  const missing = cars.filter((car) => !car.image_url).map((car) => car.id);
  assert.deepEqual(missing, []);
});

/**
 * The two generated reports must list exactly the cars that are in the game.
 *
 * Both are local-only tracking aids and are gitignored, so this is a guard for
 * the machine that generates them, not for CI — on a fresh checkout the files
 * are absent and the test skips. That is the right place for it anyway: the
 * reports are regenerated and read locally, so local is where staleness bites.
 *
 * It earns its keep because these are reports, not sources of truth, which is
 * exactly why they rot — nothing breaks when they fall behind, so nobody
 * notices. CATALOG.md sat at 730 cars while the catalog reached 1,000, still
 * advertising a "73 awaiting an image" section that the no-photo-no-ship rule
 * had already emptied. A stale PHOTO-CHECK.md is worse: it silently omits the
 * newest cars, which are the ones that have had the least scrutiny.
 *
 *   npm run docs:refresh
 *
 * Checked on car ids and counts rather than byte equality, so editing the
 * generators' wording does not fail the suite.
 */
test("CATALOG.md and docs/PHOTO-CHECK.md cover exactly the cars in the game", (t) => {
  const path = (p) => new URL(`../${p}`, import.meta.url);
  const photoPath = path("docs/PHOTO-CHECK.md");
  const catalogPath = path("CATALOG.md");
  if (!fs.existsSync(photoPath) && !fs.existsSync(catalogPath)) {
    return t.skip("generated reports not present (gitignored) — nothing to check");
  }
  const inGame = cars.map((c) => c.id).sort();

  if (fs.existsSync(photoPath)) {
    const pictured = [
      ...fs.readFileSync(photoPath, "utf8")
        .matchAll(/<img src="\.\.\/public\/cars\/([^"]+)\.webp"/g),
    ].map((m) => m[1]).sort();
    assert.deepEqual(
      pictured.filter((id) => !inGame.includes(id)), [],
      "PHOTO-CHECK.md shows a car no longer in the game — run npm run docs:refresh",
    );
    assert.deepEqual(
      inGame.filter((id) => !pictured.includes(id)), [],
      "PHOTO-CHECK.md is missing a car in the game — run npm run docs:refresh",
    );
  }

  if (fs.existsSync(catalogPath)) {
    // CATALOG.md carries no ids, so hold it to the totals it advertises.
    const declared = /\*\*(\d+)\*\* cars across \*\*(\d+)\*\* makes/.exec(
      fs.readFileSync(catalogPath, "utf8"),
    );
    assert.ok(declared, "CATALOG.md has no car/make count line");
    assert.equal(Number(declared[1]), cars.length, "CATALOG.md car count is stale");
    assert.equal(
      Number(declared[2]),
      new Set(cars.map((c) => c.make)).size,
      "CATALOG.md make count is stale",
    );
  }
});

// ---------------------------------------------------------------------------
// Nameplates
//
// A guess is Make + Model. The autocomplete used to list one row per
// generation, labelled "(Gen N)" with no years — years are withheld because
// Decade is a live axis — so eleven unlabelled Honda Civics went into the list
// and eight of them were marked wrong. Measured over the schedule at the time:
// 80% of squares held a nameplate where some generations answered and some did
// not, and a player who knew the right car had a 44.5% chance of picking the
// right generation. These tests hold the collapsed rule in place.
// ---------------------------------------------------------------------------

const schedule = JSON.parse(
  fs.readFileSync(new URL("../data/grids.json", import.meta.url), "utf8"),
).grids;

const answersTo = (row, col) =>
  cars.filter((c) => MATCH[row.type](c, row.value) && MATCH[col.type](c, col.value));

const eachSquare = (visit) => {
  for (const grid of schedule) {
    for (const row of grid.rows) for (const col of grid.columns) visit(grid, row, col);
  }
};

/**
 * The rule that keeps the collapse honest.
 *
 * Accepting a nameplate because *some* generation matches the row and *some
 * other* generation matches the column would make "Honda Civic" a correct
 * answer to squares no Civic ever satisfied — a 1983 hatchback and a 2006
 * front-driver are not one car. One record has to carry both facts.
 */
test("a nameplate answers a square only when one record satisfies both axes", () => {
  const row = { type: "body_style", value: "Hatchback", label: "Hatchback" };
  const col = { type: "drivetrain", value: "AWD", label: "AWD" };
  const g1 = { ...base, id: "fix-g1", generation: 1, body_style: "Hatchback", drivetrain: ["FWD"] };
  const g2 = { ...base, id: "fix-g2", generation: 2, body_style: "Sedan", drivetrain: ["AWD"] };
  assert.equal(firstAnswering([g1, g2], row, col), null, "split across two generations is not an answer");

  const g3 = { ...base, id: "fix-g3", generation: 3, body_style: "Hatchback", drivetrain: ["AWD"] };
  assert.equal(firstAnswering([g1, g2, g3], row, col)?.id, "fix-g3");

  // Lowest qualifying generation wins, so replaying an archived board shows the
  // same photo it showed the first time.
  const g0 = { ...base, id: "fix-g0", generation: 0, body_style: "Hatchback", drivetrain: ["AWD"] };
  assert.equal(firstAnswering([g0, g3], row, col)?.id, "fix-g0");
});

test("nameplates group every record exactly once, in generation order", () => {
  const groups = groupByNameplate(cars);
  assert.equal([...groups.values()].reduce((n, list) => n + list.length, 0), cars.length);
  assert.equal(groups.size, new Set(cars.map(nameplateKey)).size);
  for (const [key, list] of groups) {
    const gens = list.map((c) => c.generation);
    assert.deepEqual(gens, [...gens].sort((a, b) => a - b), `${key} is out of generation order`);
    assert.equal(new Set(list.map(nameplateKey)).size, 1, key);
  }
});

/**
 * The difficulty floor counts what a player can type.
 *
 * `minCell: 3` has always meant "three answers", and while the judge compared
 * records that was the same number. It is not any more: seven squares in the
 * schedule held three or more records that collapsed to fewer than three
 * nameplates, and 2026-11-22's `Diesel x Honda Motor` held five records that
 * were all Honda Civic — a square with exactly one answer.
 */
test("every scheduled square offers at least three distinct nameplates", () => {
  const thin = [];
  eachSquare((grid, row, col) => {
    const n = countNameplates(answersTo(row, col));
    if (n < 3) thin.push(`${grid.date} ${row.label} x ${col.label}: ${n}`);
  });
  assert.deepEqual(thin, []);
});

/**
 * Per-square counts are not enough: a nameplate is used up whole, so a grid
 * whose squares are each fillable can still be impossible to finish 9/9. This
 * is the check that had to be re-proved at nameplate level before the collapse
 * could ship — it passed on all 743 grids then scheduled, which is why no
 * regeneration was needed for solvability.
 */
test("every scheduled grid can be filled with nine distinct nameplates", () => {
  const broken = schedule
    .filter(
      (grid) =>
        !hasDistinctSolution(
          grid.rows.flatMap((row) =>
            grid.columns.map((col) => [...new Set(answersTo(row, col).map(nameplateKey))]),
          ),
        ),
    )
    .map((g) => g.date);
  assert.deepEqual(broken, []);
});

/**
 * Eligibility counts nameplates too, or a category can look well supported
 * while offering almost nothing to type. `brand:Infiniti` was the live case: 13
 * records but 7 nameplates, because every Infiniti in the catalog is a rebadged
 * Nissan sharing its nameplate. It was in 8 scheduled grids and produced the
 * worst squares in the whole schedule.
 */
test("category support counts nameplates, not records", () => {
  const twins = [
    { ...base, id: "twin-g1", generation: 1, model: "Twin", brands: ["Thin"] },
    { ...base, id: "twin-g2", generation: 2, model: "Twin", brands: ["Thin"] },
  ];
  const brandRow = coverage(twins, 2).parameters.find((p) => p.type === "brand" && p.value === "Thin");
  assert.equal(brandRow.count, 2, "two records");
  assert.equal(brandRow.nameplates, 1, "but one nameplate");
  assert.equal(brandRow.eligible, false, "so it does not clear a floor of 2");
});

/**
 * One car must be one row in the dropdown.
 *
 * A guess is make + model, so two spellings of one model are two rows for the
 * same car with nothing to choose between them. Found live once the dropdown
 * collapsed to nameplates: Nissan "Silvia", "Silvia / 200SX" and
 * "Silvia / 240SX" were three rows for one car, and Cadillac "De Ville" and
 * "DeVille" differed only in a space. 16 clusters in all, none of them visible
 * while the dropdown listed one row per generation.
 *
 * The slash form is the usual culprit, because it is how a car with two market
 * names gets recorded ("Micra / March"). That is fine on its own — plenty of
 * records keep it, like "Holden 48-215 / FJ" — and it is only a split when a
 * sibling record of the same make uses one of those names by itself. Market
 * names belong in `aliases`, which searchNameplates folds across a nameplate's
 * generations, so "march" still finds the Micra.
 *
 * When the two really are different cars that collided on a name — the Fiat
 * Ritmo hatchback against the Strada pickup, the 1963 Jeep Gladiator against
 * the 2020 one — the fix is to rename one, not to merge them.
 */
test("one car is one nameplate: no make has two names for the same model", () => {
  const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  const parts = (n) => n.split("/").map((x) => norm(x.trim()));
  const byMake = new Map();
  for (const car of cars) {
    if (!byMake.has(car.make)) byMake.set(car.make, new Set());
    byMake.get(car.make).add(car.model);
  }
  const splits = [];
  for (const [make, models] of byMake) {
    const names = [...models];
    for (let i = 0; i < names.length; i++) {
      for (let j = i + 1; j < names.length; j++) {
        const [a, b] = [names[i], names[j]];
        if (norm(a) === norm(b)) {
          splits.push(`${make}: "${a}" and "${b}" differ only in punctuation`);
        } else if (parts(a).includes(norm(b)) || parts(b).includes(norm(a))) {
          splits.push(`${make}: "${a}" and "${b}" — one is a slash variant of the other`);
        }
      }
    }
  }
  assert.deepEqual(splits, [], "same car, two dropdown rows — unify the model name and move the other into aliases");
});

/**
 * Generation numbers have to be unique inside a nameplate, or "Gen 1" names two
 * different cars and `firstAnswering` picks between them on insertion order.
 *
 * This is the check that decided three of the renames above. Holden's
 * 1971-1980 Statesman and its 1990-1999 Statesman/Caprice are both `g1`, and
 * the 1963 and 2020 Jeep Gladiators are both `g1`, so merging those names —
 * the obvious fix for a split — would have produced exactly this fault.
 * They were renamed apart instead.
 */
test("generations are unique within a nameplate", () => {
  const dupes = [];
  for (const [key, list] of groupByNameplate(cars)) {
    const gens = list.map((c) => c.generation);
    if (new Set(gens).size !== gens.length) {
      dupes.push(`${key}: ${[...gens].sort((a, b) => a - b).join(", ")}`);
    }
  }
  assert.deepEqual(dupes, []);
});

/**
 * The autocomplete caps its list, so an exact name has to outrank an
 * incidental substring or the cap hides the car the player asked for.
 *
 * Measured before this existed: typing the exact words "Mitsubishi Lancer"
 * ranked the Lancer **ninth**, under seven Lancer Evolutions and a Lancer EX,
 * because matches were taken in catalog order. Twelve nameplates were below
 * rank 3 for their own name; now none are.
 */
test("an exact nameplate name outranks a name that merely contains it", () => {
  const text = (key, aliases = []) =>
    [key, ...aliases].flatMap((n) => [n, n.replace(/\s+/g, "")]).join(" ").toLowerCase();

  const lancer = matchRank("Mitsubishi Lancer", "Lancer", text("Mitsubishi Lancer"), "lancer");
  const evo = matchRank(
    "Mitsubishi Lancer Evolution X",
    "Lancer Evolution X",
    text("Mitsubishi Lancer Evolution X"),
    "lancer",
  );
  assert.ok(lancer > evo, `exact "Lancer" (${lancer}) must beat "Lancer Evolution X" (${evo})`);

  // A short model name is a substring of plenty of unrelated ones; the car
  // actually called ES still has to come first.
  const es = matchRank("Lexus ES", "ES", text("Lexus ES"), "es");
  const other = matchRank("Mercedes-Benz E-Class", "E-Class", text("Mercedes-Benz E-Class"), "es");
  assert.ok(es > other, `exact "ES" (${es}) must beat an incidental match (${other})`);

  // An alias is a whole word in the search text, so it beats a stray substring
  // but does not beat the car genuinely named that.
  const qashqai = matchRank("Nissan Qashqai", "Qashqai", text("Nissan Qashqai", ["Rogue Sport"]), "rogue");
  const rogue = matchRank("Nissan Rogue", "Rogue", text("Nissan Rogue"), "rogue");
  assert.ok(rogue > qashqai, "the car called Rogue outranks the one aliased Rogue Sport");
  assert.ok(qashqai > 1, "an alias match still beats a bare substring");
});
