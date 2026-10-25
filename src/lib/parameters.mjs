/**
 * Shared by the browser, generator, coverage reports and validator.
 * No filesystem or network dependencies: facts ship as static JSON.
 */

/** @type {Record<import('./types').ParameterType, (car: import('./types').Car, value: string) => boolean>} */
export const MATCH = {
  brand: (c, v) => c.brands.includes(v),
  country_of_origin: (c, v) => c.country_of_origin === v,
  decade: (c, v) => c.decades.includes(v),
  engine_layout: (c, v) => c.engine_layouts.includes(v),
  body_style: (c, v) => c.body_style === v,
  drivetrain: (c, v) => c.drivetrain.includes(v),
  car_class: (c, v) => c.car_class === v,
  power_output: (c, v) => c.power_output_ranges.includes(v),
  transmission: (c, v) => c.transmission.includes(v),
  fuel_type: (c, v) => c.fuel_type.includes(v),
  pop_culture: (c, v) => c.pop_culture?.includes(v) ?? false,
  price_at_launch: (c, v) => inPriceRange(c.price_at_launch_usd, v),
  manufacturer_still_active: (c, v) => String(c.manufacturer_still_active) === v,
  aspiration: (c, v) => powertrainValues(c).includes(v),
  engine_position: (c, v) => c.engine_position === v,
  displacement: (c, v) => displacementValues(c).includes(v),
  cylinder_count: (c, v) => cylinderValues(c).includes(v),
};

/** @type {Record<import('./types').ParameterType, (car: import('./types').Car) => string[]>} */
export const VALUES = {
  brand: (c) => c.brands,
  country_of_origin: (c) => [c.country_of_origin],
  decade: (c) => c.decades,
  engine_layout: (c) => c.engine_layouts,
  body_style: (c) => [c.body_style],
  drivetrain: (c) => c.drivetrain,
  car_class: (c) => [c.car_class],
  power_output: (c) => c.power_output_ranges,
  transmission: (c) => c.transmission,
  fuel_type: (c) => c.fuel_type,
  pop_culture: (c) => c.pop_culture ?? [],
  price_at_launch: (c) => PRICE_BUCKETS.filter((b) => inPriceRange(c.price_at_launch_usd, b)),
  manufacturer_still_active: (c) => [String(c.manufacturer_still_active)],
  aspiration: powertrainValues,
  engine_position: (c) => c.engine_position ? [c.engine_position] : [],
  displacement: displacementValues,
  cylinder_count: cylinderValues,
};

// Exact cc boundaries; electric cars never acquire a fictional 0 L engine.
export const DISPLACEMENT_BUCKETS = [
  { value: "0-2000", min: 0, max: 2000, label: "Up to 2.0 L" },
  { value: "2000-3000", min: 2000, max: 3000, label: "Over 2.0–3.0 L" },
  { value: "3000-4000", min: 3000, max: 4000, label: "Over 3.0–4.0 L" },
  { value: "4000-5000", min: 4000, max: 5000, label: "Over 4.0–5.0 L" },
  { value: "5000+", min: 5000, max: Infinity, label: "Over 5.0 L" },
];

/** @param {import('./types').Car} car */
function powertrainValues(car) {
  return [...new Set((car.powertrains ?? []).flatMap((p) => p.aspiration ? [p.aspiration] : []))];
}

/** @param {import('./types').Car} car */
export function displacementValues(car) {
  return DISPLACEMENT_BUCKETS.filter((b) =>
    (car.powertrains ?? []).some((p) =>
      typeof p.displacement_cc === "number" && p.displacement_cc > b.min && p.displacement_cc <= b.max
    )
  ).map((b) => b.value);
}

/** Existing engine layouts encode piston counts. Electric and Rotary have none.
 * @param {import('./types').Car} car */
export function cylinderValues(car) {
  const counts = car.engine_layouts.flatMap((layout) => {
    const match = /^(?:V|W|Inline-|Flat-)(\d+)$/.exec(layout);
    return match ? [Number(match[1])] : [];
  });
  for (const p of car.powertrains ?? []) if (p.cylinders) counts.push(p.cylinders);
  return [...new Set(counts)].sort((a, b) => a - b).map(String);
}

export const PRICE_BUCKETS = [
  "0-10000", "10001-25000", "25001-50000", "50001-100000", "100000+",
];

function inPriceRange(price, range) {
  if (price === null || price === undefined) return false;
  if (range.endsWith("+")) return price >= parseInt(range);
  const [min, max] = range.split("-").map(Number);
  return price >= min && price <= max;
}

/** Tiers from CLAUDE.md — tier 3 is "use sparingly". */
export const TIER = {
  brand: 1, country_of_origin: 1, decade: 1,
  engine_layout: 1, body_style: 1, drivetrain: 1,
  car_class: 2, power_output: 2,
  transmission: 3, fuel_type: 3,
  pop_culture: 3, price_at_launch: 3, manufacturer_still_active: 3,
  aspiration: 2, engine_position: 1, displacement: 2, cylinder_count: 1,
};

/** Identity-flavoured types — CLAUDE.md asks one axis to lean this way. */
export const IDENTITY_TYPES = new Set(["brand", "country_of_origin", "decade"]);

export const PARAMETER_TYPES = Object.keys(MATCH);

/** Human-facing axis label for a parameter value. */
export function labelFor(type, value) {
  switch (type) {
    case "displacement":
      return DISPLACEMENT_BUCKETS.find((b) => b.value === value)?.label ?? value;
    case "cylinder_count":
      return `${value} cylinders`;
    case "power_output":
      return value.endsWith("+") ? `${value.slice(0, -1)}+ hp` : `${value.replace("-", "–")} hp`;
    case "price_at_launch": {
      const usd = (n) => `$${Number(n).toLocaleString("en-US")}`;
      if (value.endsWith("+")) return `${usd(value.slice(0, -1))}+`;
      const [min, max] = value.split("-");
      return `${usd(min)}–${usd(max)}`;
    }
    case "manufacturer_still_active":
      return value === "true" ? "Brand still active" : "Brand defunct";
    case "fuel_type":
      return value === "Gasoline" ? "Gasoline" : value;
    default:
      return value;
  }
}

/** Cars matching a parameter. */
export function carsMatching(cars, param) {
  return cars.filter((c) => MATCH[param.type](c, param.value));
}
