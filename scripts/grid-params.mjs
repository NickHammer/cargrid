/**
 * Parameter definitions for grid generation.
 *
 * Mirrors the "Parameter Matching Logic" table in CLAUDE.md and the
 * `carMatchesParameter` switch in src/lib/game.ts, which stays the runtime
 * source of truth for judging a player's guess. Keep the two in sync — any
 * new parameter type must be added in both places.
 */

/** Does a car satisfy `value` for this parameter type? */
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
};

/** Which values of this parameter type does a car satisfy? Drives the pool. */
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
};

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
};

/** Identity-flavoured types — CLAUDE.md asks one axis to lean this way. */
export const IDENTITY_TYPES = new Set(["brand", "country_of_origin", "decade"]);

export const PARAMETER_TYPES = Object.keys(MATCH);

/** Human-facing axis label for a parameter value. */
export function labelFor(type, value) {
  switch (type) {
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
