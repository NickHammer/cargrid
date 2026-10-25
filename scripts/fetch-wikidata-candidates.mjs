/** Free discovery only: no inferred specs and no automatic approvals.
 * node scripts/fetch-wikidata-candidates.mjs <batch.json> [--limit 50] [--refresh]
 * Resumable results live in <batch-id>-wikidata.json beside the batch.
 */
import fs from "node:fs";
import path from "node:path";
const args = process.argv.slice(2);
const batchPath = args[0];
if (!batchPath || batchPath.startsWith("--")) throw new Error("Supply a candidate batch JSON path");
const limitIndex = args.indexOf("--limit");
const limit = limitIndex >= 0 ? Number(args[limitIndex + 1]) : 50;
if (!Number.isInteger(limit) || limit < 1) throw new Error("--limit must be a positive integer");
const batch = JSON.parse(fs.readFileSync(batchPath, "utf8"));
if (!/^[a-z0-9-]+$/.test(batch.id) || !Array.isArray(batch.records)) throw new Error("Invalid batch id or records");
const output = path.join(path.dirname(batchPath), `${batch.id}-wikidata.json`);
const cache = fs.existsSync(output) ? JSON.parse(fs.readFileSync(output, "utf8")) : { batchId: batch.id, source: "Wikidata", structuredDataLicense: "CC0-1.0", results: {} };
let completed = 0, failed = 0;
async function getSearch(url) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const response = await fetch(url, { headers: { "User-Agent": "CarGridCuration/1.0 (https://cargrid.fun)", Accept: "application/json" }, signal: AbortSignal.timeout(20000) });
    const data = await response.json();
    const retryable = [429, 503].includes(response.status) || data.error?.code === "maxlag";
    if (retryable && attempt < 2) {
      const delay = Math.min(30, Math.max(5, Number(response.headers.get("retry-after")) || 5));
      console.log(`Wikidata busy; retrying in ${delay}s`);
      await new Promise((resolve) => setTimeout(resolve, delay * 1000));
      continue;
    }
    if (!response.ok) throw new Error(`Wikidata HTTP ${response.status}`);
    if (data.error) throw new Error(data.error.info ?? data.error.code);
    return data;
  }
}
for (const record of batch.records.filter((r) => r.status === "candidate")) {
  if (completed >= limit) break;
  const query = record.discovery?.query;
  if (!query || (!args.includes("--refresh") && cache.results[query] && !cache.results[query].error)) continue;
  const url = new URL("https://www.wikidata.org/w/api.php");
  url.search = new URLSearchParams({ action: "wbsearchentities", search: query, language: "en", uselang: "en", type: "item", limit: "5", format: "json", maxlag: "10" }).toString();
  try {
    const data = await getSearch(url);
    cache.results[query] = { retrievedAt: new Date().toISOString(), requestUrl: url.href, matches: (data.search ?? []).map((m) => ({ id: m.id, label: m.label, description: m.description ?? "", url: `https://www.wikidata.org/wiki/${m.id}` })), reviewRequired: "Select a generation-specific identity; these search matches do not verify specifications." };
    console.log(`${query}: ${cache.results[query].matches.length} candidates`);
  } catch (error) {
    cache.results[query] = { retrievedAt: new Date().toISOString(), requestUrl: url.href, error: error.message };
    console.error(`${query}: ${error.message}`);
    failed++;
  }
  completed++;
  fs.writeFileSync(output, JSON.stringify(cache, null, 2) + "\n");
  // Be polite, stop on service failures rather than hammering all 50 requests.
  if (failed) { process.exitCode = 1; break; }
  await new Promise((resolve) => setTimeout(resolve, 1000));
}
console.log(`${completed} lookups; ${failed} failures. Batch approval states unchanged. Cache: ${output}`);
