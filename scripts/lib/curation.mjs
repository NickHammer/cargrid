import { isDeepStrictEqual } from "node:util";
import { deriveDecades, derivePowerRanges } from "../derive-fields.mjs";
import { MATCH, VALUES, IDENTITY_TYPES } from "../grid-params.mjs";
import { canonicalMakeName } from "../make-names.mjs";

export const CAR_CLASSES = ["Muscle Car", "Sports Car", "Supercar", "Hypercar", "Hot Hatch", "SUV", "Off-Road", "Pickup Truck", "Sedan", "Coupe", "Hatchback", "Wagon", "Minivan"];
export const FACT_FIELDS = ["engine_position", "powertrains"];
const required = ["id", "make", "model", "generation", "brands", "country_of_origin", "production_start", "production_end", "decades", "engine_layouts", "body_style", "drivetrain", "car_class", "power_output_hp_min", "power_output_hp_max", "power_output_ranges", "transmission", "fuel_type", "pop_culture", "price_at_launch_usd", "manufacturer_still_active", "image_url"];
const arrays = ["brands", "decades", "engine_layouts", "drivetrain", "power_output_ranges", "transmission", "fuel_type"];
const nonempty = (value) => typeof value === "string" && value.trim().length > 0 && !value.includes("TODO");
const validURL = (value) => {
  try { return ["https:", "http:"].includes(new URL(value).protocol); } catch { return false; }
};

export function validateCar(car) {
  const errors = [];
  if (!car || typeof car !== "object" || Array.isArray(car)) return ["car must be an object"];
  for (const field of required) if (!(field in car)) errors.push(`missing ${field}`);
  for (const field of ["id", "make", "model", "country_of_origin", "body_style", "car_class"]) {
    if (!nonempty(car[field])) errors.push(`invalid ${field}`);
  }
  if (!Number.isInteger(car.generation) || car.generation < 1 || !new RegExp(`^[a-z0-9]+(?:-[a-z0-9]+)*-g${car.generation}$`).test(car.id)) errors.push("id must end with its truthful generation suffix");
  if (car.make !== canonicalMakeName(car.make)) errors.push("noncanonical make");
  for (const field of arrays) {
    if (!Array.isArray(car[field]) || !car[field].length || car[field].some((v) => !nonempty(v))) errors.push(`invalid ${field}`);
    else if (new Set(car[field]).size !== car[field].length) errors.push(`duplicate ${field} values`);
  }
  if (Array.isArray(car.brands) && (!car.brands.includes(car.make) || car.brands.some((b) => b !== canonicalMakeName(b)))) errors.push("invalid brands");
  const validYears = Number.isInteger(car.production_start) && car.production_start >= 1885 && car.production_start <= new Date().getFullYear() && (car.production_end === null || (Number.isInteger(car.production_end) && car.production_end >= car.production_start));
  if (!validYears) errors.push("invalid production years");
  else if (!isDeepStrictEqual(car.decades, deriveDecades(car.production_start, car.production_end))) errors.push("stale decades");
  const validPower = Number.isFinite(car.power_output_hp_min) && Number.isFinite(car.power_output_hp_max) && car.power_output_hp_min > 0 && car.power_output_hp_max >= car.power_output_hp_min;
  if (!validPower) errors.push("invalid horsepower range");
  else if (!isDeepStrictEqual(car.power_output_ranges, derivePowerRanges(car.power_output_hp_min, car.power_output_hp_max))) errors.push("stale power buckets");
  if (!CAR_CLASSES.includes(car.car_class)) errors.push("unknown car_class");
  if (typeof car.manufacturer_still_active !== "boolean") errors.push("manufacturer_still_active must be boolean");
  if (car.pop_culture !== null && (!Array.isArray(car.pop_culture) || car.pop_culture.some((v) => !nonempty(v)))) errors.push("invalid pop_culture");
  if (car.price_at_launch_usd !== null && (!Number.isFinite(car.price_at_launch_usd) || car.price_at_launch_usd < 0)) errors.push("invalid launch price");
  if (typeof car.image_url !== "string" || (car.image_url && car.image_url !== `/cars/${car.id}.webp`)) errors.push("invalid image path");
  errors.push(...validateFacts(car));
  return errors;
}

export function validateFacts(facts) {
  const errors = [];
  if (facts.engine_position !== undefined && !["Front-engine", "Mid-engine", "Rear-engine"].includes(facts.engine_position)) errors.push("unknown engine_position");
  if (facts.powertrains !== undefined) {
    if (!Array.isArray(facts.powertrains) || !facts.powertrains.length) return [...errors, "powertrains must be nonempty"];
    const names = new Set();
    for (const p of facts.powertrains) {
      if (!p || !nonempty(p.name)) { errors.push("powertrain needs a name"); continue; }
      if (names.has(p.name)) errors.push("duplicate powertrain name");
      names.add(p.name);
      if (Object.keys(p).some((k) => !["name", "displacement_cc", "cylinders", "aspiration"].includes(k))) errors.push("unknown powertrain field");
      if (p.displacement_cc !== undefined && (!Number.isFinite(p.displacement_cc) || p.displacement_cc <= 0 || p.displacement_cc > 15000)) errors.push("invalid displacement_cc");
      if (p.cylinders !== undefined && (!Number.isInteger(p.cylinders) || p.cylinders < 1 || p.cylinders > 16)) errors.push("invalid cylinders");
      if (p.aspiration !== undefined && !["Naturally aspirated", "Turbocharged", "Supercharged"].includes(p.aspiration)) errors.push("unknown aspiration");
    }
  }
  return errors;
}

/** Retain sources per field; a URL attached to one fact cannot approve another. */
export function validateEvidence(record, fields) {
  const errors = [];
  if (!nonempty(record.market) || record.scope !== "launch") errors.push("explicit market and launch scope required");
  const date = record.reviewedAt;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date ?? "") || Number.isNaN(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date || date > new Date().toISOString().slice(0, 10)) errors.push("valid, nonfuture reviewedAt required");
  for (const field of fields) {
    const sources = record.evidence?.[field];
    if (!Array.isArray(sources) || !sources.length || sources.some((s) => !validURL(s.url) || !nonempty(s.note))) errors.push(`missing source URL and evidence note for ${field}`);
  }
  return errors;
}

/** Pure preparation: reject the entire batch before any filesystem writes. */
export function prepareBatch(cars, batch, history = []) {
  if (batch.schemaVersion !== 1 || !nonempty(batch.id) || !Array.isArray(batch.records)) throw new Error("invalid curation batch");
  if (batch.records.some((r) => !r || !["candidate", "needs-review", "approved", "rejected"].includes(r.status))) throw new Error("unknown record status");
  const updated = structuredClone(cars);
  const approved = batch.records.filter((r) => r.status === "approved");
  const seen = new Set();
  const provenance = [...history];
  let added = 0, enriched = 0;
  for (const record of approved) {
    const id = record.carId ?? record.car?.id;
    if (!id || seen.has(id)) throw new Error(`missing or duplicate batch id: ${id}`);
    seen.add(id);
    const index = updated.findIndex((c) => c.id === id);
    if (!record.car && (!record.facts || Object.keys(record.facts).length === 0)) throw new Error(`${id}: empty facts`);
    if (record.car && record.facts) throw new Error(`${id}: use either car or facts`);
    if (record.car && record.car.id !== id) throw new Error(`${id}: car id mismatch`);
    const fields = record.car ? Object.keys(record.car).filter((f) => !["id", "decades", "power_output_ranges", "image_url"].includes(f)) : Object.keys(record.facts);
    const evidenceErrors = validateEvidence(record, fields);
    if (evidenceErrors.length) throw new Error(`${id}: ${evidenceErrors.join("; ")}`);
    if (record.car) {
      // Reapplying the same approved batch is safe; additions cannot replace cars.
      if (index >= 0 && !isDeepStrictEqual(updated[index], record.car)) throw new Error(`${id}: existing car cannot be replaced by an addition`);
      if (index < 0) { updated.push(structuredClone(record.car)); added++; }
    } else {
      if (index < 0) throw new Error(`${id}: unknown car`);
      if (fields.some((f) => !FACT_FIELDS.includes(f))) throw new Error(`${id}: unsupported enrichment field`);
      for (const field of fields) {
        if (updated[index][field] !== undefined && !isDeepStrictEqual(updated[index][field], record.facts[field])) throw new Error(`${id}: conflicting existing ${field}; resolve explicitly before publishing`);
      }
      if (fields.some((f) => !isDeepStrictEqual(updated[index][f], record.facts[f]))) enriched++;
      updated[index] = { ...updated[index], ...structuredClone(record.facts) };
    }
    const car = updated.find((c) => c.id === id);
    const errors = validateCar(car);
    if (errors.length) throw new Error(`${id}: ${errors.join("; ")}`);
    const entry = { batchId: batch.id, ...record, carId: id };
    const previous = provenance.find((r) => r.batchId === batch.id && r.carId === id);
    if (previous && !isDeepStrictEqual(previous, entry)) throw new Error(`${id}: batch history differs; use a new batch id`);
    if (!previous) provenance.push(entry);
  }
  return { cars: updated, provenance, added, enriched, skipped: batch.records.length - approved.length };
}

export function coverage(cars, minSupport = 8, minCell = 3) {
  const parameters = [];
  for (const [type, values] of Object.entries(VALUES)) {
    const counts = new Map();
    for (const car of cars) for (const value of new Set(values(car))) counts.set(value, (counts.get(value) ?? 0) + 1);
    for (const [value, count] of counts) parameters.push({ type, value, count, eligible: count >= minSupport, needed: Math.max(0, minSupport - count) });
  }
  const eligibleTypeCounts = new Map();
  for (const p of parameters.filter((p) => p.eligible)) eligibleTypeCounts.set(p.type, (eligibleTypeCounts.get(p.type) ?? 0) + 1);
  // Match generator's two-value-per-type rule and identity/attribute axis split.
  const eligible = parameters.filter((p) => p.eligible && eligibleTypeCounts.get(p.type) >= 2);
  const intersections = [];
  for (const a of eligible.filter((p) => IDENTITY_TYPES.has(p.type))) {
    for (const b of eligible.filter((p) => !IDENTITY_TYPES.has(p.type))) {
      const count = cars.filter((c) => MATCH[a.type](c, a.value) && MATCH[b.type](c, b.value)).length;
      intersections.push({ identity: `${a.type}:${a.value}`, attribute: `${b.type}:${b.value}`, count, playable: count >= minCell && count < a.count && count < b.count });
    }
  }
  return { carCount: cars.length, minSupport, minCell, parameters, eligibleValues: eligible.length, playableIntersections: intersections.filter((i) => i.playable).length, intersections };
}

export function validateSchedule(cars, grids, minCell = 3) {
  const errors = [];
  for (const grid of grids) {
    if (grid.rows?.length !== 3 || grid.columns?.length !== 3) { errors.push(`${grid.date}: invalid axes`); continue; }
    if ([...grid.rows, ...grid.columns].some((p) => !MATCH[p.type])) { errors.push(`${grid.date}: unknown parameter`); continue; }
    const cells = grid.rows.flatMap((r) => grid.columns.map((col) => cars.filter((c) => MATCH[r.type](c, r.value) && MATCH[col.type](c, col.value)).map((c) => c.id)));
    if (cells.some((c) => c.length < minCell)) errors.push(`${grid.date}: cell below ${minCell} answers`);
    const assigned = new Map();
    function augment(i, visited) {
      for (const id of cells[i]) {
        if (visited.has(id)) continue;
        visited.add(id);
        if (!assigned.has(id) || augment(assigned.get(id), visited)) { assigned.set(id, i); return true; }
      }
      return false;
    }
    if (!cells.every((_, i) => augment(i, new Set()))) errors.push(`${grid.date}: no distinct-car solution`);
  }
  return errors;
}
