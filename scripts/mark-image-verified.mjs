/**
 * Records the outcome of a contact-sheet review in data/image-credits.json.
 *
 * Only entries marked verified are wired into cars.json by
 * scripts/apply-image-urls.mjs, so this is the gate between "downloaded" and
 * "shipped".
 *
 * Usage:
 *   node scripts/mark-image-verified.mjs ford-mustang-g1 porsche-911-g1 ...
 *   node scripts/mark-image-verified.mjs --reject nissan-rogue-g1 ...   # wrong generation etc.
 *   node scripts/mark-image-verified.mjs --list-unverified
 */

import { readFileSync, writeFileSync } from "fs";

const CREDITS_PATH = "data/image-credits.json";
const credits = JSON.parse(readFileSync(CREDITS_PATH, "utf8"));

const argv = process.argv.slice(2);
const reject = argv.includes("--reject");
const ids = argv.filter((a) => !a.startsWith("--"));

if (argv.includes("--list-unverified")) {
  const pending = Object.keys(credits).filter((id) => !credits[id].verified);
  console.log(pending.join("\n"));
  console.log(`\n${pending.length} unverified.`);
  process.exit(0);
}

let changed = 0;
for (const id of ids) {
  if (!credits[id]) {
    console.log(`? ${id} — no credit entry`);
    continue;
  }
  if (reject) {
    delete credits[id].verified;
    credits[id].rejected = true;
  } else {
    credits[id].verified = true;
    delete credits[id].rejected;
  }
  changed++;
}

writeFileSync(CREDITS_PATH, JSON.stringify(credits, null, 2) + "\n");

const verified = Object.values(credits).filter((c) => c.verified).length;
console.log(`${changed} marked ${reject ? "rejected" : "verified"}.`);
console.log(`${verified}/${Object.keys(credits).length} credit entries now verified.`);
