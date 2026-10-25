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
