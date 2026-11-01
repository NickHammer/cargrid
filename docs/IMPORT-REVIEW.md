# Importing `data/incoming/cargrid-cars.json` (3,812 records)

Plan and decision checklist for the dataset, decisions log and review report
produced in a separate Claude session. Answer the checklist in section 2 and
the import can run.

## 1. Verdict on the data

**It is usable, and it is the single biggest upgrade available to the game.**

| measure | result |
|---|---|
| records | 3,812 |
| schema shape | matches our `Car` interface exactly, all 24 fields on every record |
| overlap with our catalog | 257 records (by id) |
| genuinely new | 3,555 records |
| brands | 98, including **Nissan (139 records)** — the hole in the generation list |
| review report | 0 errors, 20 warnings, all 20 explained as judgment calls |
| `decades` consistent with production years | 3,555 / 3,555 |
| `power_output_ranges` consistent with hp | 3,514 / 3,555 — 41 use `"1001+"` for our `"1000+"` |
| hp min > max, negative hp, end year before start | 0 |
| electric cars carrying a fake displacement | 0 |

The `"1001+"` bug is the only systematic data error and `derive-fields.mjs`
overwrites that field anyway, so it costs nothing.

**Measured payoff.** Eligible categories (the floor is 8 supporting cars) go
from **113 to 207**, with `engine_position`/`powertrains` stripped:

| parameter type | now | after |
|---|---:|---:|
| brand | 22 | **84** |
| engine_layout | 7 | 16 |
| country_of_origin | 7 | 14 |
| car_class | 11 | 14 |
| power_output | 9 | 12 |
| decade | 8 | 11 |
| cylinder_count | 4 | 8 |
| body_style | 7 | 9 |
| everything else | unchanged | unchanged |

Brand nearly quadrupling is the important line: the identity axis was the
bottleneck that forced Region and Parent Group into existence.

### What is wrong with it

1. **`engine_position` and `powertrains` are on all 3,812 records and are
   unsourced.** `validate-cars.mjs` requires an approved record in
   `data/curation/provenance.json` with a source URL per field. Importing them
   as-is means 3,410 × 2 provenance records we cannot evidence. Stripping both
   fields costs **4 categories out of 211** — aspiration, engine_position and
   displacement stay at their current support either way.
2. **`image_url` is pre-filled** as `/cars/<id>.webp` on every record, but only
   the 257 overlapping files exist. 3,555 records would point at missing files.
   Must be blanked on import.
3. **397 records use values our enums reject** (section 2.2).
4. **~40 of our records exist in the file under a different id** — the same car
   twice after a naive merge (section 2.4).
5. **The 257 overlapping records disagree with ours** on nearly every field —
   216 on `engine_position`, 181 on max hp, 118 on min hp, 63 on
   `production_start`. Different conventions, not errors (section 2.3).
6. **Provenance of the facts themselves**: the log states plainly that the data
   is from the author's own knowledge, not web lookups, and that 2025–26 cars
   are least certain. That is weaker than our curation rule, which is why the
   import must not overwrite source-verified records.

## 2. Decisions to answer

### 2.1 Blocking — ANSWERED 2026-11-01

- [x] **D1 · Chinese brands → DROP BYD.** Our 8 BYD records come out, matching
      the other dataset. Consequences, measured: **no published grid is
      affected** — all 21 grids with a `Chinese` or `BYD` axis are future-dated
      and get rebuilt anyway. But the new dataset contains **zero** `Chinese`
      records (that session files Chinese-owned brands under their own
      nationality: Volvo, Polestar, Lotus, Smart, MG), so `Chinese` leaves the
      game entirely rather than shrinking, and `BYD` leaves the brand pool.
      Also removes 8 files from `public/cars/` and 8 credit entries.
      Reversible later from `data/incoming/models-by-generation.json`, which still
      lists BYD 32, Geely 25, Great Wall 23, Xiaomi 3.
- [x] **D2 · Strip `engine_position` and `powertrains` → YES.** Imported
      records carry neither. Costs 4 of 211 categories. Add back per-brand with
      citations later.
- [x] **D3 · Leave the 257 overlapping records untouched → YES.** Import only
      the 3,555 new ones. Write the field diffs to a review file so the
      overlaps can be adjudicated per-brand as a separate pass.
- [x] **D4 · Image gate → NO GATE.** User: "We simply just need to gather the
      images for the cars that do not have any." No generator change.
      **Sequencing replaces the gate**: do not regenerate future grids from the
      enlarged catalog until that wave's images have landed, so cells never
      reveal as text-only. Phase 3 therefore moves after each image wave rather
      than running once before them.

### 2.2 New values to accept — ANSWERED 2026-11-01: add everything

- [x] **D5 · `aspiration`: Supercharged** — 174 records. **Added.**
- [x] **D6 · `country_of_origin`: Australian (69), Czech (35), Romanian (24),
      Russian (21), Vietnamese (12), Dutch (6), Austrian (5), Danish (4)**
      **All added.** Croatian already existed. Note `Chinese` is removed by D1,
      so the net country count goes from 10 to 17.
- [x] **D7 · `engine_layouts`: Inline-8 (20), Flat-2 (7), Flat-12 (5), V2 (3),
      V5 (3), Single-cylinder (2), V16 (1), W8 (1)** — **all added.** Takes
      `engine_layout` from 7 eligible values to 16. Note `cylinderValues` parses
      counts out of the layout string with `/^(?:V|W|Inline-|Flat-)(\d+)$/`, so
      Inline-8, Flat-12, V2, V5, V16 and W8 all yield a cylinder count for free
      — but `Single-cylinder` does not match and must be handled explicitly.
- [x] **D8 · `fuel_type`: Hydrogen** — 6 records. **Added.** Mirai, Nexo,
      Clarity, CR-V e:FCEV. Below the floor of 8, so it will not be a live
      category until more arrive — it just stops those cars being mislabelled.
- [x] **D9 · `body_style` and `car_class`: Van** — 31 records. **Added.**
      Reverse the commercial-van exclusion in `docs/BRAND-PASS.md` and add Van
      to the frozen `car_class` enum in CLAUDE.md with its boundary note
      (Transit, Econoline, Express, Savana, ProMaster, Vandura, Damas).

### 2.3 Convention clashes with decisions we already made

- [x] **D10 · Honda Civic body style → ADOPT THEIRS.** `honda-civic-g8`
      through `-g11` become body **Sedan** and class **Sedan**; g1–g7 stay
      Hatchback. This reverses the 2026-10-29 call and is a deliberate
      exception to D3, since those four are in the overlap set.
      Impact measured before accepting: **92 grid cells lose an answer, none
      drops below the floor of 3, and no published grid is affected.**
      Re-run `validate-grids.mjs` after applying to confirm on the real data.
- [x] **D11 · Performance variants → SEPARATE BY DEFAULT.** This **reverses**
      CLAUDE.md's asterisk rule, which must be rewritten.

      > A performance version gets its own record. Fold it into its parent only
      > when it adds nothing: same `car_class`, same `body_style`, same
      > `drivetrain`, and its power sits inside a 100 hp band the base car
      > already covers. A badge-and-wheels trim 15 hp up folds in; a different
      > machine gets its own record.

      Why the field-count test was rejected: `power_output_hp_min`,
      `power_output_hp_max` and `power_output_ranges` are three fields that
      always move together, so any variant with more power than its parent
      already shows 3 differences before anything else is compared. Measured on
      six real parent/variant pairs: **7 to 9 of 13 comparable fields differ,
      every time.** A threshold that never returns "fold" is not a test.

      Why separating wins anyway — the decisive argument, and the user's:
      folding makes a record claim capability no ordinary example of that car
      had. `dodge-challenger-g3` currently spans 250–1025 hp, so **"Dodge
      Challenger" is today accepted as a correct answer to a 1000+ hp square.**
      Separating makes the Demon right and the base Challenger wrong, which is
      the better puzzle. The guess box disambiguates by name exactly as it
      already does for generations.

      Consequence: parent records must **shrink**. `dodge-challenger-g3`,
      `dodge-charger-g7` and `ford-mustang-g6` are currently the main support
      for the 701-800 and higher bands, so the shrink has to be checked against
      published grids before it lands (see §2.7).

      Also accepts all 141 variant rows in the incoming file, and resolves the
      standing contradiction that our catalog already held 19 standalone
      variant records while CLAUDE.md said to fold them.

### 2.4 Duplicate-identity mapping

~40 of our records appear in the file under a different id and must be mapped,
not imported, or the catalog gets the same car twice. Confirmed pairs include:

| ours | theirs |
|---|---|
| `ferrari-458-g1` | `ferrari-458-italia-g1` |
| `ferrari-488-g1` | `ferrari-488-gtb-spider-g1` |
| `mazda-mx-5-g1` | `mazda-mx-5-miata-g1` |
| `mazda-3-g4` | `mazda-mazda3-g4` |
| `honda-fit-g1` | `honda-fit-jazz-g1` |
| `porsche-boxster-g4` | `porsche-718-boxster-g4` |
| `porsche-cayman-g3` | `porsche-718-cayman-g3` |
| `subaru-crosstrek-g1` / `-g2` | `subaru-xv-crosstrek-g1` / `-g2` |
| `subaru-tribeca-g1` | `subaru-b9-tribeca-tribeca-g1` |
| `subaru-xt-g1` | `subaru-xt-alcyone-g1` |
| `toyota-supra-g1` | `toyota-celica-supra-g1` |
| `kia-optima-g3` | `kia-optima-k5-g3` |
| `mitsubishi-pajero-g2` | `mitsubishi-pajero-montero-g2` |
| `pontiac-firebird-g2` / `-g3` / `-g4` | `pontiac-firebird-trans-am-g2` / `-g3` / `-g4` |
| `plymouth-barracuda-g3` | `plymouth-barracuda-cuda-g3` |
| `land-rover-defender-g3` | `land-rover-90-110-defender-g1` |
| `mclaren-570s-g1` | `mclaren-570s-570gt-540c-g1` |
| `mercedes-benz-300sl-g1` | `mercedes-benz-300-sl-g1` |
| `volvo-v70-g1` | `volvo-s70-v70-g1` |
| `gmc-jimmy-g1` | `gmc-s-15-jimmy-jimmy-g1` |
| `volkswagen-atlas-g1` | `volkswagen-atlas-teramont-g1` |

- [x] **D12 · Which id wins on a mapped pair → OURS.** Their row is dropped
      and logged in `import-map.json` as mapped-and-skipped, so the pairing is
      recorded rather than silently lost. Published grids, `/credits` and the
      files in `public/cars/` all reference our ids.

Also needing a judgment, because the generation numbers disagree rather than
the names:

- [x] **D13 · Clashing generation numbers → WHICHEVER IS ACCURATE.** Where our
      numbering and theirs disagree on a shared nameplate, research the
      nameplate and renumber to the truthful sequence, per CLAUDE.md's existing
      rule. Neither file wins by default. The 2013 Dodge Dart is not g2 when
      ours correctly holds the 1967–76 car at g4. Produce the list of affected
      nameplates during Phase 2 and record each decision with its source.

      **Correction to an earlier draft of this doc:** `chevrolet-malibu-g1`
      (1964–67), `chevrolet-suburban-g1` (1935–40), `ford-f-150-g1` (1975–79)
      and `chevrolet-blazer-g1` (1969–72) are **not** mis-numbered. Ours count
      generations of the nameplate; theirs count the underlying platform
      (their Suburban starts at g7, their F-150 at g10). Two schemes, not a
      bug. Ours matches CLAUDE.md, which scopes `generation` to the nameplate
      as curated. Their rows for these nameplates need renumbering on import,
      not ours.
- [x] **D14 · Our five genuinely mis-numbered records → FIX ALL FIVE NOW.**
      `rolls-royce-phantom-g1` (2003) → g7 · `jaguar-xj-g4` (2009, X351) → g8 ·
      `mercedes-benz-s-class-g1` (1972, W116) → g2 ·
      `jaguar-s-type-g1` (1999) → g2 · `infiniti-q60-g1` (2017) → g2.
      Each is a new id, so the `public/cars/` file, the `image-credits.json`
      key and any `aliases` move with it. Re-run `validate-grids.mjs`
      afterwards — ids are not used in grid matching, but the image/credit
      triple must stay consistent or `make-catalog` drops the car to unplayable.
      **Toyota Land Cruiser is left alone and flagged**: our g1 is the 1951 BJ,
      theirs the 1955 20-Series, and the BJ is a defensible first generation.

### 2.5 Class and body judgment calls — ANSWERED 2026-11-01

**All recommendations accepted as written.** Each is listed below as applied,
so any single one can be overturned later without revisiting the rest.

- [ ] **D15 · Chevrolet Corvette C8** — Sports Car (theirs) or Supercar, given
      the 1,064–1,250 hp ZR1/ZR1X? *Recommend: Sports Car*, matching our C1
      and the "every 911 is a Sports Car" rule.
- [ ] **D16 · Dodge Challenger Demon 170** (1,025 hp, 2023) — its own record?
      *Recommend: no*, fold into `dodge-challenger-g3` per the asterisk rule.
- [ ] **D17 · Ford Falcon (Australian) XR–XY / XA–XC** — Sedan or Muscle Car?
      *Recommend: Muscle Car*, except CLAUDE.md says Muscle Car must be
      American, so *recommend: leave as Sedan* and note the rule blocks it.
- [ ] **D18 · Ferrari 360 vs F430 class line** — theirs splits Sports Car /
      Supercar there. *Recommend: accept.*
- [ ] **D19 · GMC Syclone / Typhoon** — Pickup/SUV (theirs), or Muscle Car /
      Sports Car? *Recommend: accept theirs.*
- [ ] **D20 · Holden Barina** — one catch-all row across four unrelated
      platforms. *Recommend: split*, or drop until split.
- [ ] **D21 · Mazda R360 engine layout** — new `V2` value or fall back to
      `Inline-2`? *Recommend: `V2`*, if D7 is accepted.
- [ ] **D22 · Mini Moke** — Convertible/Off-Road (theirs) or Hatchback?
      *Recommend: accept theirs*, and accept the resulting `class-drive`
      warning (Off-Road without 4WD) for it, the Ariel Nomad and the VW Thing.
- [ ] **D23 · Chinese-built but non-Chinese-badged cars** — Mazda CX-6e / EZ-6,
      SAIC-era MG, Smart #1/#3/#5, Toyota bZ3, Mini Aceman, Volvo EM90/ES90.
      *Recommend: keep all*, country follows the brand.
- [ ] **D24 · Tesla Semi** — classed Van, hp estimated. *Recommend: drop.*
- [ ] **D25 · Holden Commodore VE** — add Pontiac to `brands` for symmetry with
      the G8? *Recommend: yes.*
- [ ] **D26 · GM eAssist and Saturn Green Line** — Hybrid (theirs, because GM
      marketed them as hybrids) or Gasoline (our mild-hybrid rule)?
      *Recommend: Gasoline*, consistent with the Mercedes EQ Boost treatment in
      the same log.

### 2.6 Not decisions — records to re-verify before they reach a grid

Flagged as uncertain by the log itself. These import fine; they just need a
source pass, and they should not be in the first image wave.

Rivian EDV and R2 hp · Rolls-Royce pre-1998 hp (Phantom I–VI, Silver Ghost,
Silver Shadow, Camargue) · RUF RCT and RGT · Subaru Trailseeker, Uncharted,
2026 Crosstrek/Forester hybrids · Saleen S302 · Zenvo Aurora · Audi RS 5 PHEV
(~630 hp) · Buick Electra E5 · Brabus 850 and SV12 S displacement · Maybach W3
and Zeppelin · Renault Twingo E-Tech 2026 · VW T-Roc 2nd gen · Studebaker and
Bentley pre-war figures · every pre-war row with a wide catch-all hp range.

Plus the 20 warnings from `docs/IMPORT-SOURCE-VALIDATION.md`: 15 cars over 1,000 hp not classed
Hypercar, 4 RWD Off-Road cars, and `daewoo-damas-g1` in production under a
defunct brand.

### 2.7 Un-folding queue (consequence of D11)

**Published grids are safe.** Verified by collapsing `dodge-challenger-g3`,
`dodge-charger-g7` and `ford-mustang-g6` to their *minimum* horsepower — a
harsher cut than any real split — and re-running the per-cell count and the
perfect matching over all 11 published grids:

- **0 of 11 broken**, lowest cell count 3, which is exactly the floor.
- No published grid uses a power band above `301-400` at all, so the high bands
  are not load-bearing in the archive.
- The thinnest cell those three appear in is *Ford × Inline-4* at 8 answers,
  and an hp change cannot affect `engine_layouts` membership anyway.

**32 records have an hp span of 2.2× or wider**, which is the signal for a
folded variant. They need a per-record decision, not a mechanical cut — several
are legitimately wide because one generation was sold with both a small diesel
and a big V8. Worst offenders:

| record | span | note |
|---|---|---|
| `dodge-challenger-g3` | 250–1025 (4.1×, 9 bands) | Demon/Hellcat → split |
| `mercedes-benz-e-class-estate-g1` | 87–342 | E55 AMG is AMG-badged → split |
| `kia-ev6-g1` | 168–577 | EV6 GT → split |
| `ford-mustang-g5` / `-g6` | 210–662 / 305–760 | GT500 → split |
| `dodge-charger-g7` | 292–797 | Hellcat Redeye → split |
| `chevrolet-camaro-g6` | 275–650 | ZL1 → split |
| `volkswagen-golf-g8` | 89–242 | GTI/R, different `car_class` → split |
| `tesla-cybertruck-g1`, `rivian-r1s-g1` | 315–845, 402–1025 | top trims of one model → judgment |
| `dodge-challenger-g1`, `chevrolet-chevelle-g2`, `plymouth-barracuda-g3` | 145–425, 140–450, 125–425 | **engine options, not separate models → keep folded** |
| `honda-civic-g4/g5/g6`, `subaru-360-g1` | 70–168 … 16–36 | market engine choices → **keep folded** |

25 of the 32 span three or more power bands. Five are BYD records that D1
deletes, so they drop out of this queue.

Each split is two edits: shrink the parent to its base line-up, and add the
variant as its own record with its own image. The variant needs an image like
any other car, and some variants are visually near-identical to their parent
(an S4 next to an A4), so the contact-sheet review matters more here than
usual — label the sheet with the chassis code.

## 3. Execution plan

### Phase 0 — decisions and enums
Answer section 2. Then extend `src/lib/types.ts` and `src/lib/parameters.mjs`
with the accepted values (D5–D9), and `scripts/make-names.mjs` with the 54 new
brands. Add Van to the `car_class` enum block in CLAUDE.md with its boundary
rule, and reverse the van exclusion in `docs/BRAND-PASS.md`.

### Phase 1 — rules, removals and renumbering

**Status 2026-11-01: steps 1–4 and 6 DONE and verified. Step 5 reopened — see
the note after the list.**

Verification after steps 1–4: catalog 319 → **311 cars, 45 makes, 311/311
playable**. `validate-cars` reports **57 errors, all pre-existing provenance,
zero new**. Published grids **11/11 valid, fingerprint `eba29a625acecafc`
unchanged**. 27 future grids broke on the BYD/Chinese removal and were rebuilt:
schedule regenerated from 2026-11-02 for 731 days, now **742/742 valid**,
runway through 2028-11-01. `tsc`, `eslint` and `npm run build` all clean.
Eligible categories 113 → **111** (lost `Chinese` and `BYD` as expected).

No image gate (D4). Instead:

1. Rewrite the asterisk rule in CLAUDE.md per D11, and add Van to the frozen
   `car_class` enum per D9.
2. Delete the 8 BYD records, their 8 files in `public/cars/` and their 8 credit
   entries (D1).
3. Renumber the five mis-numbered records (D14), moving each image file and
   credit key with its new id.
4. Apply the Civic g8–g11 body change (D10).
5. Work the un-folding queue in §2.7. **Reopened — do this with the import,
   not before it.** Two findings:

   - **The 2.2× hp-span screen under-detects.** It catches 28 records but
     misses `tesla-model-x-g1` (670–1020, Plaid — only 1.5×) and
     `rivian-r1t-g1` (533–1025, Quad — 1.9×). A ratio cannot find a variant
     whose base car is already powerful. The real queue is "records whose top
     figure comes from a separately-badged trim", which needs a pass over all
     311, not a filter.
   - **The import half-covers it, with the opposite convention in places.** It
     supplies `dodge-challenger-srt-demon-g3` (808–840), `volkswagen-golf-r-g6`
     …`-g8`, `mercedes-amg-e-55-amg-g1/g2`, `pontiac-firebird-trans-am-g2`…`g4`
     — but it folds Shelby GT500 into Mustang and ZL1 into Camaro, and has no
     row for Cyberbeast, Rivian Quad, Tesla Plaid, EV6 GT or SVT Cobra.

   So importing first would **double-count**: the catalog would hold our
   `dodge-challenger-g3` at 250–1025 *and* their Demon record at 808–840, with
   the Demon's power counted twice. Shrinking a parent must therefore happen in
   the same operation that imports its variant. Fold this into Phase 2 as a
   per-nameplate reconciliation rather than a separate pass.

   (Unrelated but worth knowing: their `dodge-demon-g1` at 125–275 is the
   1971–72 Dart-based Dodge Demon, a different car from the Challenger SRT
   Demon. Both ids are distinct, so neither collides.)
6. `derive-fields.mjs` → `validate-cars.mjs` → `validate-grids.mjs --min 3`.

### Phase 2 — import

**Status 2026-11-01: staging complete. 3,517 records staged, all passing
`validateCar`. Wave 1 (Nissan, 125) moved into the catalog; images in flight.**

**Staged, not merged — a correction to this plan's original shape.** The game
resolves grid answers client-side from `cars.json`, so a record added there is
a live answer immediately, and with no image it renders a text tile. The
standing rule is that a car ships only with accurate data *and* an accurate
image, so the import lands in `data/incoming/cargrid-import.json` and crosses
into the catalog one brand at a time via `scripts/move-import-wave.mjs`, each
wave finishing its images before the next starts. Nothing reaches players until
a deploy, so a half-finished wave in the working tree is invisible.

The transform: 3,812 incoming → 257 dropped as already ours (D3) → 36 dropped
as mapped duplicates (D12) → 3 renumbered (D13) → 2 deferred as double-counts →
**3,517 staged**. No id collides with the catalog or with another staged record,
and every id encodes its own generation as `validate-cars` requires.

Four classes of defect found and fixed in staging, none left:

| problem | records | fix |
|---|---:|---|
| noncanonical `make` | 83 | `canonicalMakeName` — Citroen→Citroën, Mini→MINI, Vinfast→VinFast |
| noncanonical `brands[]` | 104 | same |
| stale power buckets | 41 | re-derived; the import writes `"1001+"` for our `"1000+"` |
| `make` mangled by title-casing | 4 brands | added RUF, SEAT, SS, SsangYong to `make-names.mjs` |

Also added: the eight new countries to `REGION_BY_COUNTRY` in `parameters.mjs`,
with **Australian mapped to a new `Oceanian` region** (69 cars, comfortably over
the floor). Without that mapping those records would silently drop out of the
Region parameter.
1. Write `data/curation/import-map.json`: the ~40 duplicate-identity mappings
   from 2.4, plus every id excluded by a decision.
2. Transform in the scratchpad, not in place — strip `engine_position` and
   `powertrains` (D2), blank `image_url`, drop mapped and excluded ids, drop
   the 257 overlaps (D3).
3. `node scripts/derive-fields.mjs` (fixes `"1001+"`), `normalize-makes.mjs`,
   `validate-cars.mjs`. Expect 0 new errors; the 57 pre-existing provenance
   errors are unrelated and tracked separately.
4. `make-catalog.mjs` — expect roughly 3,850 cars, 319 playable.

### Phase 3 — grids, after each image wave
There is no image gate, so a car becomes a grid answer the moment it is
imported — which would fill cells with text tiles. **Sequencing replaces the
gate:** do not regenerate the future schedule from the enlarged catalog until
that wave's images have landed. Phases 3 and 4 therefore alternate.

Per wave: keep dates through today, regenerate the future, then
`validate-grids.mjs --min 3 --min-days 90` and `generate-grids.mjs --report`.
Past grids must stay byte-identical; fingerprint before and after.

### Phase 4 — images, in waves
3,555 images cannot be reviewed in one pass. At the observed rate — roughly a
quarter rejected on the first attempt, reviewed by eye on contact sheets — this
is **15 to 20 waves of 150–250 cars**. Each wave is the standard pipeline from
`docs/BRAND-PASS.md` steps 4–5, and each wave is what actually releases that
slice of the catalog into grids.

Wave order, highest value first:

1. **Nissan (125)** — the brand the game is missing entirely.
2. **Brands that cross the 8-car floor for the first time** — the 54 new makes,
   taking brand from 22 to 84 eligible values.
3. **Missing generations of nameplates already in the game** — Corolla, Camry,
   Accord, Impala, Golf, 911, Mustang. Depth, and the easiest photos to source.
4. **Defunct brands** — Pontiac, Mercury, Oldsmobile, Holden, Plymouth,
   Studebaker — which is the thinnest live category at 14 cars.
5. Everything else, newest first; 2,442 of the new records start in 1990 or
   later, and Commons coverage is far better for those than for the 206 pre-1960
   rows.

Wikimedia Commons stays the only source, and the chassis codes in
`data/incoming/models-by-generation.json` are the search keys that make the right
generation come back.

## 4. What I am not doing without being asked

- Touching any of the 257 existing records (D3).
- Adding `engine_position` or `powertrains` without a citation (D2).
- Re-pointing `image_url` at a file that does not exist.
- Importing the Chinese brands the log removed, or re-removing our BYD records.
