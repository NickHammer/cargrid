import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { MATCH, VALUES, labelFor } from "./grid-params.mjs";
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
  const small = Array.from({ length: 8 }, (_, i) => ({ ...base, id: `fixture-${i}`, brands: ["OnlyBrand"], country_of_origin: "OnlyCountry", engine_layouts: ["V8"] }));
  const report = coverage(small);
  assert.equal(report.playableIntersections, 0);
});

test("schedule validation catches impossible distinct-car assignment despite individual answers", () => {
  const grid = { date: "fixture", rows: Array(3).fill({ type: "brand", value: base.make }), columns: Array(3).fill({ type: "country_of_origin", value: base.country_of_origin }) };
  assert.match(validateSchedule([base], [grid], 1).join(" "), /no distinct-car solution/);
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
 * Both are reports, not sources of truth, which is precisely why they rot:
 * nothing breaks when they fall behind, so nobody notices. CATALOG.md sat at
 * 730 cars while the catalog reached 1,000, still advertising a "73 awaiting
 * an image" section that the no-car-without-a-photo rule had already emptied.
 *
 * docs/PHOTO-CHECK.md is the one that matters most, because its whole purpose
 * is a visual pass over the catalog — a stale one quietly omits the newest
 * cars, which are exactly the ones least looked at. Refresh both with:
 *
 *   npm run docs:refresh
 *
 * The check is deliberately on car ids and counts rather than byte equality,
 * so editing the generator's wording does not fail the suite.
 */
test("CATALOG.md and docs/PHOTO-CHECK.md cover exactly the cars in the game", () => {
  const read = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
  const inGame = cars.map((c) => c.id).sort();

  const photoCheck = read("docs/PHOTO-CHECK.md");
  const pictured = [...photoCheck.matchAll(/<img src="\.\.\/public\/cars\/([^"]+)\.webp"/g)]
    .map((m) => m[1])
    .sort();
  assert.deepEqual(
    pictured.filter((id) => !inGame.includes(id)), [],
    "PHOTO-CHECK.md shows a car that is no longer in the game — run npm run docs:refresh",
  );
  assert.deepEqual(
    inGame.filter((id) => !pictured.includes(id)), [],
    "PHOTO-CHECK.md is missing a car that is in the game — run npm run docs:refresh",
  );

  // CATALOG.md carries no ids, so hold it to the totals it advertises.
  const catalog = read("CATALOG.md");
  const declared = /\*\*(\d+)\*\* cars across \*\*(\d+)\*\* makes/.exec(catalog);
  assert.ok(declared, "CATALOG.md has no car/make count line");
  assert.equal(Number(declared[1]), cars.length, "CATALOG.md car count is stale");
  assert.equal(
    Number(declared[2]),
    new Set(cars.map((c) => c.make)).size,
    "CATALOG.md make count is stale",
  );
});
