# Brand pass

The repeatable process for adding one marque to the catalog. Run it once per
brand, from a reference list (usually the Wikipedia "List of &lt;brand&gt;
automobiles" page).

The goal is **depth, not breadth**. A category needs 8 cars to become eligible
and 3 workable partners to appear in a grid at all, so eight cars concentrated
in one brand unlock that brand; fifty scattered across fifty brands unlock
nothing. `node scripts/generate-grids.mjs --report` says which categories are
short and by how much — read it before and after every pass.

## 0. Baseline

```bash
node scripts/make-catalog.mjs        # refresh CATALOG.md
node scripts/generate-grids.mjs --report
```

Note what the brand already has, so the pass fills gaps instead of duplicating.

## 1. Decide what qualifies

From the reference list, **include**:

- Production road cars, one record per **generation** of a nameplate.
- Kei cars and JDM-only models — they are real cars people can guess, and they
  are the catalog's only source of sub-100 hp and sub-1.0 L coverage.
- Performance variants folded into their parent record, widening its ranges
  (CLAUDE.md's asterisk rule). A Type R is a Civic.

**Exclude**:

- Concepts and racing cars. Never sold, not guessable.
- Commercial-only vans and kei trucks. The `body_style` enum has no Van, and
  forcing them into Minivan misrepresents them.
- **Regional renames of a car already recorded.** A Honda Vezel is an HR-V, an
  Inspire is an Accord, a Breeze is a CR-V. One record per car, under the
  global nameplate. This is the easiest way to accidentally double-count.
- A nameplate reused for an unrelated car in another market, unless it is
  genuinely a separate vehicle — then it is its own record.

Rebadges across *different brands* are the exception: those stay one record
with multiple entries in `brands[]` (CLAUDE.md), because a grid entry is
Make + Model and both makes should resolve it.

## 2. Research

Facts come from the generation's own sources, not the nameplate's current page.
Per CLAUDE.md: global launch year, the generation's full factory line-up, exact
figures only, and **never invent a power figure to fill a range**.

Browser notes, learned the hard way:

- Manufacturer spec pages are usually JavaScript-rendered — `WebFetch` returns
  an empty page. Use Claude in Chrome: `navigate` then `get_page_text`.
- **PDFs**: `get_page_text` returns nothing. Navigate Chrome to the PDF URL and
  take a `screenshot` / `zoom` instead — that reads fine, and manufacturer
  technical-specification PDFs are often the only place exact displacement is
  published.
- Cookie/consent banners: dismiss with the banner's own Close control, never
  "Accept All". They can swallow clicks until dismissed.

## 3. Add the records

Write a throwaway insertion script in the scratchpad with a comment per car
explaining any judgment call, then:

```bash
node scripts/derive-fields.mjs       # decades + power buckets
node scripts/normalize-makes.mjs     # canonical make spelling
node scripts/validate-cars.mjs
```

Leave `image_url` empty until the image is reviewed.

## 4. Images

```bash
node scripts/fetch-car-images.mjs
node scripts/make-contact-sheets.mjs --unverified
# read every sheet; reject interiors, rear shots, wrong generations, modified cars
node scripts/mark-image-verified.mjs <ids>   |   --reject <ids>
node scripts/fetch-car-images.mjs --unverified
node scripts/optimize-car-images.mjs && node scripts/apply-image-urls.mjs
```

Expect roughly a quarter to fail the first pass — that has been the rate across
every tranche. Pin a chassis code in `PINNED_FILES` when free-text search keeps
returning the wrong generation.

## 5. Regenerate and verify

```bash
# keep today and earlier, drop future dates, then:
node scripts/generate-grids.mjs --from <tomorrow> --days 731
node scripts/validate-grids.mjs --min 3 --min-days 90
node scripts/generate-grids.mjs --report
node scripts/make-catalog.mjs
npx tsc --noEmit && npx eslint src scripts && npm run build
```

Past grids must stay byte-identical — check with a hash of the kept dates
before and after. Never `--force`.

## 6. Report

Say what the pass unlocked: categories that crossed the floor of 8, categories
that gained partners, and anything still short. That is the input to choosing
the next brand.
