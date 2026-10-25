/**
 * Canonical display spelling for car makes.
 *
 * NHTSA returns make names in all caps ("BMW", "MERCEDES-BENZ"), so naive
 * title-casing produces "Bmw" and "Mercedes-benz". Brand matching in the game
 * is exact string equality, so a single mis-cased record silently drops out of
 * its own Brand parameter.
 *
 * Keys are lowercased; anything not listed falls back to title-casing each
 * space- and hyphen-separated segment.
 */

export const DISPLAY_MAKE = {
  "bmw": "BMW",
  "bmw alpina": "BMW Alpina",
  "gmc": "GMC",
  "mg": "MG",
  "tvr": "TVR",
  "hsv": "HSV",
  "bac": "BAC",
  "ktm": "KTM",
  "fpv": "FPV",
  "mini": "MINI",
  "amc": "AMC",
  "am general": "AM General",
  "ds": "DS",
  "byd": "BYD",
  "nio": "NIO",
  "jac": "JAC",
  "faw": "FAW",
  "ineos": "INEOS",
  "vinfast": "VinFast",
  "mclaren": "McLaren",
  "mclaren automotive": "McLaren",
  "mercedes-benz": "Mercedes-Benz",
  "mercedes benz": "Mercedes-Benz",
  "mercedes-amg": "Mercedes-AMG",
  "rolls-royce": "Rolls-Royce",
  "rolls royce": "Rolls-Royce",
  "alfa romeo": "Alfa Romeo",
  "land rover": "Land Rover",
  "aston martin": "Aston Martin",
  "citroen": "Citroën",
  "citroën": "Citroën",
  "kg mobility": "KG Mobility",
  "srt": "SRT",
};

function titleCaseSegment(word) {
  return word
    .split("-")
    .map((part) => (part ? part[0].toUpperCase() + part.slice(1) : part))
    .join("-");
}

/** Canonical display spelling for a make, from any input casing. */
export function canonicalMakeName(raw) {
  const key = String(raw).trim().toLowerCase().replace(/\s+/g, " ");
  if (!key) return "";
  if (DISPLAY_MAKE[key]) return DISPLAY_MAKE[key];
  return key.split(" ").map(titleCaseSegment).join(" ");
}
