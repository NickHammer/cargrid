# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CarGrid.fun is a browser game idea based on [MovieGrid.io](https://moviegrid.io/).
- You have a 3x3 grid with a unique parameter corresponding to each row and each column. With the grid being 3x3, you naturally have 9 guesses to complete the grid (100% accuracy).
- The grid is blank, until you guess the cell correctly, in which point the cell will display the image of the correct car.
- The grid changes every 24 hours and the old grid get archived. These archived grids should be repeatably playable in an archive section of the website.

## Tech Stack

- **Next.js** (App Router) — primary framework, keep server usage minimal
- **React** — UI components
- **Local Storage** — user identifier, guesses, score history (no DB required initially)
- **Postgres** (optional, future) — add only if persistent server-side stats become necessary

## Development Commands

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Lint
npm run lint

# Re-derive `decades` and `power_output_ranges` in data/cars.json
node scripts/derive-fields.mjs

# Generate a car entry template from NHTSA (Node 18+)
node scripts/fetch-car-specs.mjs "<make>" "<model>"

# Extend the daily grid schedule (idempotent — existing dates are kept)
node scripts/generate-grids.mjs --from 2027-10-22 --days 180

# Which categories can't appear in any grid, and which are one partner from it
node scripts/generate-grids.mjs --report

# Check every scheduled grid is still solvable — run after ANY cars.json edit
node scripts/validate-grids.mjs --min 3
```

## Grid Parameters

17 parameter types, drawn from a pool to construct each daily grid. `src/lib/parameters.mjs` is the source of truth — this list
has gone stale before, so check `PARAMETER_TYPES` rather than trusting it.

**Tier 1 — Identity/Attribute (high value)**
- Brand/Make, Country of Origin, Decade, Engine Layout, Body Style, Drivetrain, Engine Position, Cylinder Count

**Tier 2 — Good**
- Car Class, Power Output, Aspiration, Displacement, Region, Parent Group

**Tier 3 — Use sparingly**
- Transmission, Fuel Type, Manufacturer Still Active

**Pop Culture and Price at Launch were retired as axes on 2026-11-03**, taking
the list from 19 to 17. Both failed on data, not on idea. Pop Culture had 7 of
730 cars filled in, never cleared the eligibility floor, and appeared in **zero**
of 742 scheduled grids — a declared type that could not appear is a trap for
whoever reads this list next. Price at Launch had 50 of 730 priced and reached
27 grids, but a square asking which car cost $25–50k in 1994 tests recall, not
reasoning, which is the wrong kind of hard for this game. **The `pop_culture`
and `price_at_launch_usd` fields stay on the records** and are still
schema-checked — only the axes are gone, so re-adding one means filling in a few
hundred records first, not editing `parameters.mjs`. Retiring Price at Launch
meant regenerating every future grid, since 27 of them referenced it; past dates
and the live day were verified byte-identical across that regeneration.

**Region and Parent Group are derived, not stored** — from `country_of_origin`
and `brands` respectively, via lookup tables in `parameters.mjs`, so they cannot
drift from the fields they generalise. They exist because the *identity* axis
was the game's bottleneck: every grid needs three identity categories and there
were only three types to draw them from. They are Tier 2 rather than Tier 1
because each is broader than the category it generalises, so it makes an easier
puzzle than Brand or Country and should not outrank them. Parent Group maps only
genuine multi-marque owners and is a point-in-time fact — Subaru and Mazda are
*not* Toyota subsidiaries (minority stakes), and Bugatti left VW Group in 2021.

### Parameter Design Rules
- Brand CAN appear on both row and column axes — rebadged cars can satisfy two brand parameters simultaneously; a car record supports multiple brands.
- Car Class definitions are kept as strict as possible; each car has an explicit, curated class tag — not inferred.
- One axis should generally favor identity-based parameters (Brand, Country, Decade) and the other attribute-based (Engine, Body Style, Class), but this is a soft guideline.
- A grid entry is **Make + Model** (e.g., "Ford Mustang") — no year, trim, or edition required when guessing. When multiple generations exist in the dataset, autocomplete disambiguates: "Subaru Crosstrek (Gen 2 · 2018–2023)".
- Each generation is a **separate entry** with its own ID (`subaru-crosstrek-g2`) and specs scoped to that generation, recorded as the **span of that generation's factory line-up\***.
- \* **A performance version gets its own record. Fold it into its parent only when it adds nothing** — same `car_class`, same `body_style`, same `drivetrain`, and its power sits inside a 100 hp bucket the base line-up already covers. A badge-and-wheels trim 15 hp up folds in; a different machine gets its own entry. So Challenger SRT Demon, Charger Hellcat, Mustang GT500, Camaro ZL1, Golf GTI and EV6 GT are all **separate records**, alongside M3, WRX STI, Civic Type R and Focus RS.
- \* **Do not decide this by counting differing fields.** `power_output_hp_min`, `power_output_hp_max` and `power_output_ranges` always move together, so any faster version differs in three fields before anything else is compared — measured at 7–9 of 13 fields across six real parent/variant pairs. A threshold that never returns "fold" is not a test.
- \* **Why separate, despite Make + Model guessing:** folding makes a record claim capability no ordinary example of that car had. While the Demon was folded in, `dodge-challenger-g3` spanned 250–1025 hp, so "Dodge Challenger" was accepted as a correct answer to a **1000+ hp** square. Separating makes the Demon right and the base car wrong, which is the better puzzle, and the autocomplete disambiguates by name exactly as it already does for generations. Engine *options* on one model are not variants and stay folded — a 1970 Challenger could be ordered with a straight-six or a 426 Hemi, which is why `dodge-challenger-g1` legitimately reads 145–425 hp.
- This says *span*, not *launch day*. An engine added mid-generation counts; an engine from the next generation does not. The dataset has always worked this way — `subaru-impreza-g1` reads 110–240 hp for 1992–2000, a range no 1992 car could reach — and the earlier "launch specs only" wording contradicted it.
- IDs always include the generation suffix (`-g1`, `-g2`, etc.) even if only one generation exists in the dataset.
- Decades, Engine Layout, Drivetrain, Transmission, and Fuel Type are **multi-value** — a car qualifies for all options it was offered with at release.
- Power Output uses **100hp buckets**: `0-100`, `101-200`, `201-300`, `301-400`, `401-500`, `501-600`, `601-700`, `701-800`, `801-900`, `901-1000`, `1000+`. A car with multiple engine options spans multiple buckets.

## Car Data Schema

```typescript
interface Car {
  id: string;                       // slug — "ford-mustang-g1", "subaru-crosstrek-g3"
  make: string;                     // "Ford"
  model: string;                    // "Mustang"
  generation: number;               // 1, 2, 3 — always included, even if only one gen exists in dataset
  brands: string[];                 // ["Ford"] or ["Subaru", "Chevrolet"] for rebadges
  country_of_origin: string;        // "American" | "German" | "Japanese" | "Italian" | "British" | ...
  production_start: number;         // first gen start year — 1964
  production_end: number | null;    // first gen end year — 1973, or null if still running
  decades: string[];                // ["1960s", "1970s"] — derived from production years, stored for lookup
  engine_layouts: string[];         // ["V8", "Inline-6"] — all options offered at release
  body_style: string;               // "Coupe" — single value
  drivetrain: string[];             // ["RWD"] or ["RWD", "AWD"] if multiple offered
  car_class: string;                // "Muscle Car" — strict, curated, single value
  power_output_hp_min: number;      // weakest engine option at release
  power_output_hp_max: number;      // strongest engine option at release
  power_output_ranges: string[];    // ["101-200", "301-400"] — derived, stored for lookup
  transmission: string[];           // ["Manual", "Automatic"]
  fuel_type: string[];              // ["Gasoline"] or ["Gasoline", "Hybrid"]
  pop_culture: string[] | null;     // ["Bullitt", "Gone in 60 Seconds"]
  price_at_launch_usd: number | null;
  manufacturer_still_active: boolean;
  image_url: string;                // one canonical image per car entry
}
```

### Parameter Matching Logic

| Parameter | Match |
|---|---|
| Brand | `car.brands.includes(param)` |
| Country of Origin | `car.country_of_origin === param` |
| Decade | `car.decades.includes(param)` |
| Engine Layout | `car.engine_layouts.includes(param)` |
| Body Style | `car.body_style === param` |
| Drivetrain | `car.drivetrain.includes(param)` |
| Car Class | `car.car_class === param` |
| Power Output | `car.power_output_ranges.includes(param)` |
| Transmission | `car.transmission.includes(param)` |
| Fuel Type | `car.fuel_type.includes(param)` |
| Manufacturer Still Active | boolean match |

## Car Dataset

### Storage
`data/cars.json` — flat JSON array of `Car` objects. Loaded client-side; no DB required initially.

### Scripts
```bash
# Fetch raw specs for a make/model from Car Query API (Node 18+)
node scripts/fetch-car-specs.mjs ford mustang

# Re-derive `decades` and `power_output_ranges` for all cars after editing hp or production years
node scripts/derive-fields.mjs
```

### Curation Workflow
1. Run `fetch-car-specs.mjs` — fills in drivetrain, transmission, fuel type, body style, HP from Car Query API
2. Manually fill in `TODO` fields: engine_layout config (V/Inline/Flat), car_class, pop_culture, price, image_url
3. Set `production_end` to the end year of **the generation being curated** (not the nameplate's final year)
4. Run `derive-fields.mjs` to recompute `decades` and `power_output_ranges`

### Curation Rules
- HP figures pre-1972 are gross ratings (engine on stand); post-1972 are net (SAE). Use whichever figure is commonly cited in enthusiast references for consistency.
- `body_style` is a single value — pick the primary/most iconic body for that model (e.g., Mustang → Coupe, not Fastback or Convertible)
- `manufacturer_still_active` refers to the **brand**, not the specific model
- Production years use the **global launch**, not the US launch (Prius 1997, not 2001; Kicks 2016, not 2018). This covers the same car reaching a market later — it does not pull in an earlier car sold under a different name, so the VW Taos starts in 2020 even though the Tharu it restyles has been built in China since 2018.
- Record the full line-up for the generation, including engines never sold in the US — that is what widens `fuel_type` and `power_output_ranges` correctly.
- **Never invent a power figure to fill a range.** If a source documents one engine and lists others without outputs, record only the documented one and say so, as `kia-sorento-g1` does. A guessed floor is how a record ends up claiming a 99 hp V6.
- `make` and `brands[]` use canonical display spelling from `scripts/make-names.mjs` ("BMW", not "Bmw"). Brand matching is exact string equality, so run `node scripts/normalize-makes.mjs` after any batch add.
- `generation` counts generations of the **nameplate as curated**, and the number must be truthful: the 1967–76 Dart is `dodge-dart-g4`, not `-g1`. A dataset may hold `-g4` without holding `-g1`.
- Muscle Car is applied when a nameplate's performance variant is its defining identity in enthusiast culture (Chevelle SS → Malibu, GTS/340 → Dart), even though base models were ordinary.
- **Road cars only.** A record must be a vehicle sold to the public for road use. Pure competition cars are excluded — they were never sold, never
registered, and a player cannot reasonably be expected to guess them.
- **Homologation specials are valid**: a road-going version built to qualify a car for a racing class is a road car, and usually a famous one (Lancia Delta HF Integrale, Ford RS200, Nissan Skyline GT-R, Porsche 959, BMW M3 E30). The test is whether a road-legal version was sold, not how many were built. Excluded by this rule: `nissan-r390-gt1-g1` (the Le Mans GT1 entry — one road car existed as a homologation formality but was never sold), Ferrari's FXX and Vulcan-style track-only specials, and any "Rally"/"GT1"/"DTM"/"Group B prototype" row that never reached a showroom.

### `car_class` Enum (frozen)

**Performance**
- `Muscle Car` — American, large engine, affordable, straight-line focus
- `Sports Car` — handling-focused, typically 2-seat or 2+2
- `Supercar` — exotic manufacturer OR mainstream halo car with 500+ hp as tiebreaker
- `Hypercar` — beyond supercar tier (Bugatti, Koenigsegg, Pagani, Rimac)
- `Hot Hatch` — performance hatchback (GTI, Type R, 205 GTI)

**Utility**
- `SUV` — absorbs crossovers; unibody or body-on-frame mainstream utility
- `Off-Road` — purpose-built serious off-road capability (Wrangler, Defender, FJ40)
- `Pickup Truck` — truck bed

**Body-type defaults** (for anything not covered above)
- `Sedan` — all sedans regardless of price point, luxury level, or sport intent
- `Coupe` — absorbs Gran Turismo (DB5, Continental GT, Ferrari 456 all land here)
- `Hatchback` — non-performance hatchbacks
- `Wagon` — estates; shooting brakes deferred here for now
- `Minivan` — people carriers
- `Van` — commercial-derived vans, panel vans and microvans (Transit, Econoline, Express, Savana, ProMaster, Vandura, Damas). Used as both `body_style` and `car_class`

**Boundary decisions**
- Van vs Minivan: a Minivan was designed to carry people (Odyssey, Caravan); a Van is a commercial vehicle, whether or not the example at hand has seats. `docs/BRAND-PASS.md` used to exclude vans outright because there was no value for them — that exclusion is withdrawn
- Muscle Car must be American — a Japanese or European performance coupe is Sports Car regardless of engine size
- Sports Car vs Supercar: exotic manufacturer = Supercar by default; use 500+ hp as tiebreaker for ambiguous cases
- Dodge Viper → Supercar (purpose-built exotic despite being American)
- Chevrolet Corvette C1 (1953 first gen) → Sports Car (no V8 at launch, not straight-line focused)
- BMW M3 E30 → Sports Car. BMW 3 Series base → Sedan
- Golf GTI → Hot Hatch. Golf base → Hatchback
- Jeep Wrangler → Off-Road. Jeep Grand Cherokee → SUV
- GT/touring cars (Aston Martin DB series, Bentley Continental GT) → Coupe

### Image Strategy
One canonical image per car in `/public/cars/<id>.webp`, sourced from Wikimedia Commons (free license guaranteed by requiring the file to live on Commons) and credited on `/credits`, which is a condition of the CC BY / CC BY-SA licenses most of them carry. Do not scrape automaker or auction sites.

The pipeline, in order:

```bash
node scripts/fetch-car-images.mjs                 # download candidates (pinned file -> generation article -> Commons category -> search)
node scripts/make-contact-sheets.mjs --unverified # labeled sheets for visual review
node scripts/mark-image-verified.mjs <id>...      # or --reject <id>...
node scripts/fetch-car-images.mjs --unverified    # retry whatever was rejected
node scripts/optimize-car-images.mjs              # re-encode to 640px WebP
node scripts/apply-image-urls.mjs                 # verified entries -> cars.json image_url
```

**A photo wider than 2:1 cannot just be dropped in.** The tile is 4:3 and crops
from the centre, so a 2.66:1 photo shows only its middle 50% and nothing picked
which 50% — the car's nose or tail ends up outside the tile. 70 of 716 published
photos were in that state. `optimize-car-images.mjs` now lists anything over 2:1
at the end of a run, and `recrop-wide-images.mjs` fixes them:

```bash
node scripts/recrop-wide-images.mjs --fetch        # big originals back from Commons
node scripts/recrop-wide-images.mjs --candidates   # 4 options per car + review sheets
node scripts/recrop-wide-images.mjs --apply picks.json
```

It re-downloads from Commons rather than re-cropping the published file, because
a 4:3 window out of a 640x241 webp is 321px wide for a ~300px tile with nothing
spare; the `source` URL kept for attribution is what makes the original findable
again. Four options are offered because **no automatic rule gets this right**:
sharp's `attention` strategy picked a background pickup truck over the Buick
Riviera in front of it. Of the 70, `attention` won 34, `entropy` 17, plain
centre 3 — and 16 needed the fourth option, `whole`, which fits the entire photo
into the tile and fills the band above and below with a blurred, darkened copy
of itself. That one exists because when a car fills the width of a 2.6:1 frame,
*every* 4:3 crop is a door and a wheel; it is also the right answer when cropping
would cut off what defines the class, like a pickup's bed or an estate's tail.
The crops are stored at exactly 4:3, so the tile no longer crops at all.

**A car without a photo does not ship.** An empty `image_url` used to render as
a plain text tile, which made the record a correct answer that showed the player
nothing. Records without a verified photo now wait in
`data/incoming/needs-photo.json` instead of sitting in the catalog:

```bash
node scripts/park-imageless-cars.mjs --dry-run   # what has no photo
node scripts/park-imageless-cars.mjs             # move those out of cars.json
node scripts/park-imageless-cars.mjs --restore   # bring back the now-photographed
node scripts/validate-grids.mjs --min 3          # removing cars CAN break a grid
```

Nothing is deleted — the full record is kept and comes back the moment a photo
is verified. `curation.test.mjs` enforces this, so a car with no photo fails CI.
**Park after the image rounds, never before**: the fetcher reads `cars.json` to
know what to look for, so a car parked early is a car it will never retry.

**Give up on a photo rather than lower the bar.** Two fetch rounds is the
budget; what is still wrong after that gets parked and logged, not shipped with
a doubtful picture. Older European models are the hard case — for the Renault
wave, plain Commons search returned a postage stamp of a 1910 car, a line
drawing, a toy in a display box, four crashed cars, three race liveries, a
police car, a fire engine, two interior shots and a close-up of an indicator
lens. 25 of 79 were parked.

**Every image needs the visual check.** A nameplate's lead image on Wikipedia is almost always the *current* generation, so an unreviewed fetch will happily file a 2024 Rogue under the 2008 one. Only entries marked `"verified": true` in `data/image-credits.json` are wired into `cars.json`; anything else leaves `image_url` empty and the grid renders a text tile instead of the wrong car. When automated resolution keeps failing, pin an exact Commons filename in `PINNED_FILES` in `scripts/fetch-car-images.mjs`.

## Deployment

Hosted on **Netlify** as a pure static export. `next.config.ts` sets
`output: "export"`, `images.unoptimized`, and `trailingSlash`; `netlify.toml`
publishes `out/`. There is no Next.js runtime, no serverless function and no
database in production — Netlify just serves files.

```bash
npm run build      # writes out/ (~736 pages, ~27 MB incl. images)
```

- **The daily rotation needs no server and no redeploy.** `data/grids.json` is
  committed with 730 days of grids; each visitor's browser picks the grid for
  *its own* local date, and `/archive` filters the same list to dates already
  past. A site left untouched for six months still rotates daily and keeps
  growing its archive.
- **A redeploy is only needed** to change the dataset, the code, or to extend
  the schedule.
- **The schedule runs out on 2028-11-02.** `validate-grids.mjs --min-days 90`
  exits non-zero once fewer than 90 days remain. This is now wired into
  `.github/workflows/checks.yml` rather than left to memory.

### Checks run automatically

`.github/workflows/checks.yml` runs lint, the curation tests, the grid schedule
check and the build on every push and pull request to `main` and `dev`.

It exists because **Netlify only runs `npm run build`, which is `next build`**.
That typechecks and lints, so a code mistake already fails the deploy — but
nothing looks at the data. Measured, not assumed: deleting `honda-cr-v-g1`
drops the `SUV x Honda` square on 2026-10-23 from 3 answers to 2, and
`npm run build` still succeeds and would deploy an unsolvable grid.
`data:validate:grids` catches it and exits 1. 45 squares in the schedule sit at
exactly the 3-answer minimum, so this is one careless edit away at all times.

`validate-cars.mjs` is deliberately **not** in the workflow yet — it exits
non-zero on 57 pre-existing provenance warnings, and a check that is always red
is a check everyone ignores. It runs locally as `npm run data:validate:cars`,
and joins the workflow once those are triaged.
- `trailingSlash` matters: without it the export emits both `archive/<date>.html`
  and a directory `archive/<date>/` holding RSC payloads, and static hosts
  disagree about which wins. Every route is `<path>/index.html` instead.
- Netlify's free Starter plan permits commercial use including ads and affiliate
  links; the restriction is on reselling hosting.

## Architecture

The app is intentionally lightweight and mostly client-side:

- **Grid logic** — a 3x3 grid with a row parameter and column parameter per axis; players guess which car satisfies both parameters for a cell. Gameplay and generation now share `src/lib/parameters.mjs`, re-exported by `scripts/grid-params.mjs`. Add parameter types to `src/lib/types.ts` and shared matching/value/label/tier rules together.
- **Daily rotation** — the schedule is **pre-generated and committed** to `data/grids.json` by `scripts/generate-grids.mjs`, not derived at runtime, so an archived grid cannot change when the car dataset does. Dates roll over at the player's *local* midnight (`src/lib/date.ts`) — never `toISOString()`, which would flip the grid at 8pm ET.
- **Grid solvability** — a grid is only valid if every cell has at least 3 answers *and* 9 **distinct** cars can fill the 9 cells. Per-cell counts alone are not enough, because the autocomplete bars reusing a car; the generator proves it with a bipartite perfect matching. `scripts/validate-grids.mjs` re-checks the whole schedule and must be run after any `cars.json` edit.
- **Grids are built, not guessed.** The generator pairs every two categories once into a compatibility table (does their square hold `minCell` cars without being a giveaway?), then assembles grids by only ever picking partners that table approves — so all nine cells are valid by construction and the per-cell check is redundant. Each date also gets a **featured category** from an even rotation, which is what guarantees breadth: an under-used category appears because its turn came up, not because a random draw got lucky. The long comment at the top of `generate-grids.mjs` has the measurements, including why the previous random-draw search got *worse* as the catalog grew and left a third of the categories permanently unreachable. **Do not replace this with a random search, and do not try to fix category coverage by adjusting the score** — that was tried and provably cannot work, because a losing category never reaches the scorer at all.
- **Two categories on one axis must not be interchangeable.** `maxSameType` only counts *types*, so it misses cross-type clashes: "SUV" is both a `body_style` and a `car_class`, "Electric" both an `engine_layout` and a `fuel_type`. Without a check, an axis renders as `SUV | Inline-4 | SUV` — two columns a player cannot tell apart; 11 of 736 scheduled grids had one. `trioDistinct` in the generator rejects a trio with a repeated label, or with two categories that are **nearly** the same set — shared cars over combined cars above `maxTwinOverlap` (0.8). It used to demand the sets be *exactly* equal, which was too strict to catch anything useful: "Ford" (24 cars) and "Ford Motor Company" (25) differ by one Lincoln, so 2026-11-02 went live with both as columns. The exact test missed 65 of 742 days, all from four pairs that are two names for one idea — Asian/Japanese, 4 cylinders/Inline-4, Ford/Ford Motor Company, Jaguar/Tata Motors. The measure is deliberately two-way: a one-way "is a inside b" test also flags V6 inside 6 cylinders and V8 inside Automatic, which are real distinctions. 0.8 sits in a wide gap — the four bad pairs score 0.90–0.96, the next pair down (6 cylinders/V6) scores 0.71. Cross-*axis* duplicates need no check, because that square would be the whole of both categories and the compatibility table already rejects it as a giveaway.
- **A category needs three workable partners to appear at all.** With `minCell: 3`, a category crossing a 3-category axis needs three partners that each yield a 3-answer square, so a narrow category (Plug-in Hybrid, 8 cars, 2 partners) is unusable no matter how interesting it is. `generate-grids.mjs --report` lists what is unreachable and what is one partner away, which makes it the data-collection to-do list: prefer a new category that crosses many existing ones over one that is merely novel.
- **Archive** — `/archive` lists past dates, `/archive/[date]` replays one. `localStorage` is keyed by date and discards state when the grid id changes, so replays need no extra storage.
- **Client-only game** — `GameClient`/`ArchiveListClient` load their component with `next/dynamic` and `ssr: false`, which lets `localStorage` and the local clock be read in a `useState` initializer rather than a mount effect (React 19 flags that as a cascading render) and rules out hydration mismatches on the date.
- **State persistence** — user ID (UUID), guesses, and score history stored in `localStorage`; no login required
- **Server usage** — limit to heavier calculations (e.g., end-of-game stats aggregation); avoid server round-trips for core gameplay

### Answer exposure — a decided trade-off

Both `cars.json` and `grids.json` are inlined into a single client chunk (measured: ~423 KB). Anyone who opens devtools has the complete answer key — every car's specs, the pre-computed `decades` array, and **every scheduled grid for two years**. No reasoning required; the answers are literal values in the bundle.

**This is accepted, not an open bug.** It is inherent to the no-server architecture: the game resolves the daily grid and judges guesses entirely client-side, which is also what makes the archive replayable with no backend. Closing it would mean validating guesses in a serverless function and never shipping the dataset — a different architecture, and the wrong trade for a casual daily puzzle. Casual players will not open devtools; determined ones would cheat regardless. Do not re-raise this as a defect.

Two **friction** measures ship anyway, because they cost nothing and fix the cases a normal player would stumble into:

- The guess autocomplete shows no production years (`carDisplayLabel`, `src/lib/cars.ts`). `Decade` is a live parameter, so printing the year span handed over the answer in the UI itself. Generations are disambiguated with `(Gen N)` only where a nameplate has more than one.
- `/credits` is sorted by photographer and omits production years, so it reads as the licence-compliance list it is rather than a browsable car index. It still covers **every** published image — that part is a licence obligation and must not be narrowed.

If the exposure ever does matter, the cheapest real improvement is shipping only past-and-present grids and rebuilding daily (a scheduled Netlify build), which removes the two-year preview without touching the architecture.
