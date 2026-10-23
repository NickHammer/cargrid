# CarGrid

A daily car-guessing puzzle. Nine cells, two axes, one shot at a perfect grid.

**[Play at cargrid.fun →](https://cargrid.fun)**

Every day you get a 3×3 grid where each row and each column is a car attribute —
*Japanese*, *1990s*, *RWD*, *Muscle Car*, *301–400 hp*. Name a car that satisfies
both the row and the column and its photo fills the cell. You get nine guesses
for nine cells, so a perfect game is 100% accuracy with no wasted shots. No car
can be used twice.

Inspired by [MovieGrid](https://moviegrid.io/), built for people who can tell a
Mk3 Supra from a Mk4 at a glance.

---

## Contents

- [How it works](#how-it-works)
- [Tech stack](#tech-stack)
- [Getting started](#getting-started)
- [Project layout](#project-layout)
- [The car dataset](#the-car-dataset)
- [Grid generation](#grid-generation)
- [Images](#images)
- [Deployment](#deployment)
- [Scripts reference](#scripts-reference)
- [Credits and licensing](#credits-and-licensing)

---

## How it works

**The daily grid.** Puzzles are pre-generated and committed to
`data/grids.json` — currently **730 days**, through 2028-10-20. Each visitor's
browser looks up the grid for *its own* local date. There is no server deciding
what today's puzzle is, which means the site rotates daily and the archive keeps
growing without a single redeploy.

**The archive.** Every past grid stays playable at `/archive/<date>`, with its
own independent saved state. Because the schedule is committed rather than
generated on the fly, an archived puzzle is guaranteed to be exactly what people
played that day, even after the car dataset changes underneath it.

**Your progress.** Guesses and results live in `localStorage`, keyed by date.
No account, no login, no database, nothing phoned home.

**Rolling over.** Leave a tab open past local midnight and the board rolls over
on its own — silently if the current game is finished or untouched, or with a
"new grid is ready" prompt if a game is still in progress, so the board is never
yanked out from under you mid-guess.

## Tech stack

| | |
|---|---|
| **Next.js 16** | App Router, exported as fully static HTML |
| **React 19** | |
| **TypeScript 5** | |
| **Tailwind CSS 4** | |
| **Node scripts** | Dataset curation, grid generation, image pipeline |

No database, no API routes, no server actions, no middleware. The production
build is a folder of static files.

## Getting started

```bash
npm install
npm run dev          # http://localhost:3000
```

Other commands:

```bash
npm run build        # static export to out/
npm run lint         # eslint
npx tsc --noEmit     # typecheck
```

Before committing changes to the data or the game logic:

```bash
node scripts/validate-grids.mjs --min 3 --min-days 90
```

This re-checks every scheduled grid against the current dataset and fails if the
schedule is running out. See [Grid generation](#grid-generation) for why it
matters.

## Project layout

```
src/
  app/
    page.tsx                 today's grid
    archive/page.tsx         list of past dates
    archive/[date]/page.tsx  replay a specific day
    credits/page.tsx         image attribution (a licence requirement)
  components/
    Game.tsx                 game state, rollover, guess handling
    Grid.tsx                 the 3×3 board and its tiles
    GuessInput.tsx           autocomplete over the car dataset
    *Client.tsx              ssr:false wrappers (see note below)
  lib/
    game.ts                  parameter matching — the rules of the game
    grids.ts                 schedule lookup
    cars.ts                  dataset access and search
    storage.ts               localStorage persistence
    date.ts                  local-date helpers
    useDailyRollover.ts      midnight detection

data/
  cars.json                  151 curated cars
  grids.json                 730 pre-generated daily grids
  image-credits.json         per-image licence and attribution
  verification-todo.md       dataset decisions and open questions

scripts/                     curation and generation tooling
public/cars/                 151 WebP car photos
```

**Why the `*Client.tsx` wrappers.** The game reads `localStorage` and the local
clock during its first render, so it must not be server-rendered. Each wrapper
loads its component with `next/dynamic` and `ssr: false`, which lets state live
in a `useState` initializer instead of a mount effect — React 19 flags the latter
as a cascading render — and rules out hydration mismatches on the date.

## The car dataset

`data/cars.json` holds **151 cars** spanning **1935–2024** across **26 makes** and
**12 classes**.

A record is one **generation** of one nameplate, scoped to that generation's
specs — not the nameplate as a whole. `toyota-supra-g4` is the 1993–2002 A80,
distinct from `toyota-supra-g5`, the 2019 J29. Guessing only needs make and
model; the autocomplete disambiguates generations where several exist:

```
Toyota Supra (Gen 1 · 1978–1981)
Toyota Supra (Gen 2 · 1981–1986)
Toyota Supra (Gen 3 · 1986–1993)
Toyota Supra (Gen 4 · 1993–2002)
Toyota Supra (Gen 5 · 2019–present)
```

Several fields are deliberately **multi-value**, because a car qualifies for
every option it was offered with: `decades`, `engine_layouts`, `drivetrain`,
`transmission`, `fuel_type`, and `brands` (for rebadges — the Honda Passport is
also an Isuzu, and the Acura NSX is a Honda outside North America).

```ts
interface Car {
  id: string;                     // "toyota-supra-g4"
  make: string;                   // "Toyota"
  model: string;                  // "Supra"
  generation: number;             // 4
  brands: string[];               // ["Toyota"] — more for rebadges
  country_of_origin: string;      // "Japanese"
  production_start: number;       // 1993
  production_end: number | null;  // 2002, or null if still made
  decades: string[];              // derived
  engine_layouts: string[];       // ["Inline-6"]
  body_style: string;             // "Coupe"
  drivetrain: string[];           // ["RWD"]
  car_class: string;              // "Sports Car" — curated, from a frozen enum
  power_output_hp_min: number;    // 220
  power_output_hp_max: number;    // 320
  power_output_ranges: string[];  // derived, 100 hp buckets
  transmission: string[];         // ["Manual", "Automatic"]
  fuel_type: string[];            // ["Gasoline"]
  pop_culture: string[] | null;   // ["The Fast and the Furious"]
  price_at_launch_usd: number | null;
  manufacturer_still_active: boolean;
  image_url: string;              // "/cars/toyota-supra-g4.webp"
}
```

`decades` and `power_output_ranges` are derived — after editing production years
or horsepower, re-run:

```bash
node scripts/derive-fields.mjs
```

Curation conventions, class definitions and resolved judgment calls live in
[`CLAUDE.md`](CLAUDE.md) and [`data/verification-todo.md`](data/verification-todo.md).

## Grid generation

A grid is **not** random. `scripts/generate-grids.mjs` is seeded by date — the
same date always produces the same puzzle — and every candidate must survive a
set of constraints:

- **Parameter support.** A value needs at least 8 cars behind it to be eligible.
  This automatically keeps thin parameters (Pop Culture, Price at Launch) out of
  the pool until the data supports them, and lets them back in on their own once
  it does.
- **Axis character.** One axis leans identity (Brand / Country / Decade), the
  other attribute (Body Style / Engine / Class), per the design rules.
- **Cell depth.** Every cell needs at least 3 valid answers.
- **No implied cells.** A pairing where one parameter wholly contains the other
  is rejected — *Audi × German* is a freebie, not a puzzle.
- **A perfect matching must exist.** This is the important one. Per-cell counts
  are *not* sufficient: since no car may be used twice, a grid where every cell
  is individually fillable can still be impossible to complete. The generator
  proves 9 **distinct** cars can fill the 9 cells using bipartite matching
  (Kuhn's augmenting path). Skipping this check is how you ship an unwinnable
  puzzle.

Candidates are scored on worst-cell depth, average depth and parameter tier, and
the best of 80 attempts wins.

```bash
# extend the schedule (existing dates are never touched)
node scripts/generate-grids.mjs --from 2028-10-21 --days 365

# re-check every grid against the current dataset
node scripts/validate-grids.mjs --min 3 --min-days 90
```

Run the validator after **any** change to `cars.json` — correcting a horsepower
figure can move a car out of a power bucket and quietly break a grid scheduled
months out. `--min-days` additionally fails the run when the schedule is close to
running dry, so it belongs in CI.

## Images

Every car has one canonical photo in `public/cars/<id>.webp`, sourced from
Wikimedia Commons. Candidates are only accepted if the file lives on Commons,
which guarantees a free licence.

**Automated fetching is not enough, and the pipeline assumes that.** A
nameplate's lead image on Wikipedia is almost always the *current* generation, so
an unreviewed fetch will cheerfully file a 2024 Rogue under the 2008 one. Images
are therefore reviewed in two passes — *is this the right model and generation?*
and *does the car actually fill the frame?* — using generated contact sheets at
the real tile aspect ratio. Only entries marked `"verified": true` in
`image-credits.json` are wired into `cars.json`; anything else leaves
`image_url` empty and the grid falls back to a text tile rather than showing the
wrong car.

```bash
node scripts/fetch-car-images.mjs                 # pinned file → generation article → Commons category → search
node scripts/make-contact-sheets.mjs --unverified # build review sheets
node scripts/mark-image-verified.mjs <id>...      # or --reject <id>...
node scripts/fetch-car-images.mjs --unverified    # retry the rejects
node scripts/optimize-car-images.mjs              # re-encode to 640px WebP
node scripts/apply-image-urls.mjs                 # verified entries → cars.json
```

When automated resolution keeps landing on the wrong car, pin an exact Commons
filename in `PINNED_FILES` in `scripts/fetch-car-images.mjs`.

## Deployment

Hosted on **Netlify** as a static export. `next.config.ts` sets
`output: "export"`, `images.unoptimized` and `trailingSlash`; `netlify.toml`
publishes `out/`.

```bash
npm run build     # → out/ (~736 pages)
```

Notes worth knowing:

- **Daily rotation needs no redeploy.** The schedule is committed and resolved
  client-side against the visitor's local date.
- **`trailingSlash` is load-bearing**, not cosmetic. Without it the export emits
  both `archive/<date>.html` *and* a directory `archive/<date>/` holding RSC
  payloads, and static hosts disagree about which wins. Every route becomes
  `<path>/index.html` instead.
- **Images are unoptimized by design.** They are already hand-optimised to 640px
  WebP and render in ~300px tiles, so Next's optimiser buys almost nothing — and
  skipping it keeps the export portable to any static host.

## Scripts reference

| Script | Purpose |
|---|---|
| `generate-grids.mjs` | Build the dated puzzle schedule (seeded, idempotent) |
| `validate-grids.mjs` | Re-check every grid for solvability + schedule runway |
| `grid-params.mjs` | Parameter definitions shared by generator and validator |
| `fetch-car-specs.mjs` | Pre-fill a car record from NHTSA + EPA + Wikipedia |
| `batch-add-cars.mjs` | Run the above over `data/cars-to-add.json` |
| `derive-fields.mjs` | Recompute `decades` and `power_output_ranges` |
| `normalize-makes.mjs` | Canonicalise make spelling (`Bmw` → `BMW`) |
| `make-names.mjs` | Canonical make-name table |
| `fetch-car-images.mjs` | Download Commons images with generation-aware strategies |
| `make-contact-sheets.mjs` | Build labelled review sheets at the real tile shape |
| `mark-image-verified.mjs` | Record image review outcomes |
| `optimize-car-images.mjs` | Re-encode to 640px WebP |
| `apply-image-urls.mjs` | Copy verified image paths into `cars.json` |

> `src/lib/game.ts` is the runtime source of truth for whether a car satisfies a
> parameter. `scripts/grid-params.mjs` mirrors it for generation, and the two
> must be kept in sync — any new parameter type goes in both.

## Credits and licensing

Car photographs come from **Wikimedia Commons** under free licences — CC BY-SA
4.0, CC BY 2.0, CC BY-SA 3.0, public domain and CC0 among them. Attribution for
every image (photographer, licence, source file) is published at
**[/credits](https://cargrid.fun/credits/)**, which is a condition of the CC BY
and CC BY-SA licences, not a courtesy. Per-image metadata lives in
`data/image-credits.json`.

Automaker and auction-site images are never scraped.
