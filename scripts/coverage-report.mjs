/** Read-only. node scripts/coverage-report.mjs [--batch path] [--json] */
import fs from "node:fs";
import { coverage, prepareBatch } from "./lib/curation.mjs";
const args = process.argv.slice(2);
const cars = JSON.parse(fs.readFileSync("data/cars.json", "utf8"));
const report = coverage(cars);
const batchIndex = args.indexOf("--batch");
if (batchIndex >= 0) {
  if (!args[batchIndex + 1]) throw new Error("--batch needs a path");
  const batch = JSON.parse(fs.readFileSync(args[batchIndex + 1], "utf8"));
  const prepared = prepareBatch(cars, batch);
  const after = coverage(prepared.cars);
  report.batch = { id: batch.id, approvedAdditions: prepared.added, approvedEnrichments: prepared.enriched, unapprovedSkipped: prepared.skipped, eligibleValuesGained: after.eligibleValues - report.eligibleValues, playableIntersectionsGained: after.playableIntersections - report.playableIntersections };
}
if (args.includes("--json")) console.log(JSON.stringify(report, null, 2));
else {
  console.log(`${report.carCount} cars; ${report.eligibleValues} generator-eligible values; ${report.playableIntersections} usable identity/attribute intersections.`);
  console.log(`Eligibility requires ${report.minSupport} cars and two supported values per parameter type. Intersections require ${report.minCell} answers and no implication; this does not prove a whole grid is solvable.\n`);
  for (const type of [...new Set(report.parameters.map((p) => p.type))]) {
    console.log(`${type}: ${report.parameters.filter((p) => p.type === type).sort((a, b) => b.count - a.count).map((p) => `${p.value}=${p.count}${p.eligible ? "" : ` (needs ${p.needed})`}`).join(", ")}`);
  }
  if (report.batch) console.log("\nApproved batch impact (candidate targets are not counted):\n" + JSON.stringify(report.batch, null, 2));
}
