# Free-source curation workflow

The production catalog currently contains 198 generation records. Research
candidates are not production cars. No paid API, account or subscription is
needed for this workflow.

## Start with coverage

```sh
npm run data:coverage
node scripts/coverage-report.mjs --json
node scripts/coverage-report.mjs --batch data/incoming/launch-facts-2026-10-23.json
```

The report shows support for each parameter value and identity/attribute
intersections that meet the generator's minimum of three answers. It excludes
implied cells and types with fewer than two values supported by eight cars.
An intersection count is a coverage metric, not proof that a full grid has a
nine-car solution. The grid validator checks that separately.

## Research queue

`data/incoming/pilot-b-free-sources.json` contains 50 **unapproved discovery
candidates**. The batch targets deeper Volvo, Renault, Hyundai, Kia, Volkswagen,
Mazda and Mercedes-Benz coverage, plus Saab and Tesla. Era hints and target tags
are planning notes, not sourced vehicle facts. In particular, launch dates,
generation numbers and the availability of later EV/hybrid variants still need
review.

```sh
node scripts/fetch-wikidata-candidates.mjs data/incoming/pilot-b-free-sources.json
```

Results are cached beside the batch in `pilot-b-free-sources-wikidata.json`.
The command skips completed queries, retries busy responses and stops on errors;
rerun to resume. `--limit 5` limits new queries; `--refresh` refreshes matches.
Search can return race cars, engines or entire nameplates: never assume the first
result is the correct generation. Selecting an identity does not verify specs.

Use free sources for distinct jobs:

- [Wikidata](https://www.wikidata.org/wiki/Wikidata:Licensing): candidate identity
  discovery and links; structured data is CC0.
- [NHTSA vPIC](https://vpic.nhtsa.dot.gov/api/): manufacturer/model identity and
  VIN information. It is not a definitive global generation catalog.
- [EPA data](https://www.fueleconomy.gov/feg/ws/index.shtml): US-market powertrain
  leads through the existing spec-fetch script. Its earliest year is not proof
  of a car's global introduction year.
- Manufacturer launch releases, archives and technical brochures: primary
  evidence for generation scope and specifications.
- Wikipedia generation articles: research leads and cited references. Do not
  copy the current nameplate's specs into an older generation.
- Wikimedia Commons: image candidates, with their own licensing and visual
  reviews. Never assume a manufacturer press image is reusable in this game.

## Evidence and approval

Create a batch with `schemaVersion: 1`, a unique `id`, and `records`.
Statuses are `candidate`, `needs-review`, `approved` and `rejected`. Only approved
records can publish. Each approved record needs:

- `carId`, `scope: "launch"`, explicit `market`, and `reviewedAt` (ISO date).
- Either `car` (a complete new Car record) or `facts` (new enrichment fields).
- `evidence` keyed by every supplied field. Each field's evidence is a nonempty
  list of `{ "url": "https://…", "note": "What this source establishes" }`.

See `data/incoming/launch-facts-2026-10-23.json` for 18 real reviewed examples.
Core facts of the existing catalog have **not** been retroactively verified by
this work. New enrichment provenance is retained in `provenance.json`.

For new cars, evidence is required for every provided field except the internal
ID, derived decades/power buckets and image path. Use the generation's global
launch lineup, canonical make spelling, truthful generation number, the frozen
class enum and an empty `image_url` until image review is complete. Derived
values can be computed with the functions exported by `scripts/derive-fields.mjs`.
Do not publish a template containing TODOs.

Enrichment records can add `engine_position` and/or `powertrains` to existing
cars. Linked powertrain records keep a variant's name, exact displacement in cc,
piston cylinder count and aspiration together. Partial evidence is allowed:
omit unknown fields instead of guessing. Positive facts from a reviewed launch
variant qualify the generation; absence means unknown, not proof that an option
was unavailable globally. An `evidence.powertrains` note must identify which
variants and attributes each source supports. The first batch documents limited
market coverage explicitly, including the Supra 3.0 and GR Yaris performance
variant. Further sources are needed for their other global launch variants.

Displacement is based on exact cc, not a rounded marketing size. For example,
1998 cc is in "Up to 2.0 L", while 2001 cc is in "Over 2.0–3.0 L". A source
saying only "4.0 L" does not establish an exact 4000 cc value. Electric motors
have no piston displacement or cylinder count. Rotary engines do not acquire
a piston cylinder count either.

Front-mid layouts are categorized as Front-engine; rear-mid layouts as
Mid-engine. Position refers to the combustion engine, not an EV's motor axles.
Do not add a position based solely on the drive wheels.

```sh
# Review the proposed changes and their coverage impact, with no writes
node scripts/publish-curation.mjs data/incoming/my-batch.json

# Publish already-reviewed records after all validations pass
node scripts/publish-curation.mjs data/incoming/my-batch.json --apply
npm run data:validate
npm run data:test
```

Publishing rejects conflicting existing facts, incomplete cars, missing evidence,
unverified image paths, duplicate IDs and batches that break scheduled grids.
Reapplying the same approved batch is idempotent. Resolve corrections explicitly
with their sources; additions cannot silently replace an existing generation.
The tool prepares the complete result before writing, keeps source history and
rolls back if a write fails. Do not run two publishers concurrently.

## New puzzle categories

Gameplay and tooling share `src/lib/parameters.mjs`. Added types are aspiration,
engine position, displacement and cylinder count. Cylinder count can also be
derived from existing piston engine-layout facts. Unverified facts do not create
eligible values. Support thresholds still apply; engine position and displacement
need more reviewed coverage before the generator can use them.

The existing 730-grid schedule is unchanged. New categories are available when
generating additional puzzles. Never force-regenerate published archive dates.
The existing generator's `--force` resets its schedule map, so it should not be
used to selectively refresh future dates.

## Images

Keep the existing fetch → contact sheets → visual verification → optimize →
apply pipeline. New downloads automatically accept only recognized CC BY,
CC BY-SA, CC0 or public-domain metadata with a named artist and a consistent
license URL where applicable. Other metadata needs manual investigation. Existing
image credits are preserved; this does not retroactively re-audit them.

Sources must be hosted on Commons and correct for the generation, with suitable
framing at 4:3. Store attribution independently of spec provenance. New downloads
also retain `licenseUrl`. See
[Commons reuse guidance](https://commons.wikimedia.org/wiki/Commons:Reusing_content_outside_Wikimedia).
