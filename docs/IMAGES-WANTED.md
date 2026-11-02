# Images wanted

Cars with no verified photo. The automated fetcher has exhausted its
strategies on these — more retries will not help, because the reject guard
correctly refuses to re-serve a file already turned down.

## How to help

**Give filenames, not files.** Every published image must be a Wikimedia
Commons file: that is what lets `fetch-car-images.mjs` verify the licence and
record the photographer in `data/image-credits.json`, which `/credits`
publishes. Attribution is a condition of the CC BY / CC BY-SA licences most of
these carry, so an image of unknown origin cannot ship.

1. Open the search link for a car below.
2. Find a photo of **the right generation** showing the **front three-quarter**
   of an **unmodified** car that fills the frame. Avoid rear shots, interiors,
   engine bays, open bonnets, show-stand clutter and race liveries.
3. Copy the file name exactly as Commons shows it, without the `File:` prefix —
   e.g. `1999 Nissan Micra Inspiration (K11) - 1.0 16v (55PS) petrol manual - 2025-06-09, front left.jpg`
4. Paste it into `data/curation/pinned-files.json` against the car id.

Then the pipeline takes over: download, licence check, attribution, 640px WebP,
and a contact sheet for me to eyeball before anything is wired up.

A tile is cropped to 4:3, so a pure side profile loses the grille and makes a
poor tile even when the car is correct.

| id | car | years | body / class | why it is here | search |
|---|---|---|---|---|---|
| `jeep-cj-5-g1` | Jeep CJ-5 | 1954–1983 | SUV / Off-Road | rejected on review (2 files turned down) | [Commons](https://commons.wikimedia.org/w/index.php?search=Jeep%20CJ-5%201954&ns6=1) |
| `jeep-cj-6-g1` | Jeep CJ-6 | 1955–1975 | SUV / Off-Road | rejected on review (2 files turned down) | [Commons](https://commons.wikimedia.org/w/index.php?search=Jeep%20CJ-6%201955&ns6=1) |
| `jeep-cj-8-scrambler-g1` | Jeep CJ-8 Scrambler | 1981–1986 | Pickup Truck / Off-Road | no candidate found at all | [Commons](https://commons.wikimedia.org/w/index.php?search=Jeep%20CJ-8%20Scrambler%201981&ns6=1) |
| `jeep-compass-g3` | Jeep Compass | 2025–now | SUV / SUV | rejected on review (2 files turned down) | [Commons](https://commons.wikimedia.org/w/index.php?search=Jeep%20Compass%202025&ns6=1) |
| `jeep-jeepster-g1` | Jeep Jeepster | 1948–1950 | Convertible / SUV | rejected on review (2 files turned down) | [Commons](https://commons.wikimedia.org/w/index.php?search=Jeep%20Jeepster%201948&ns6=1) |
| `jeep-wrangler-g2` | Jeep Wrangler | 1997–2006 | SUV / Off-Road | rejected on review (2 files turned down) | [Commons](https://commons.wikimedia.org/w/index.php?search=Jeep%20Wrangler%201997&ns6=1) |
| `lexus-es-g2` | Lexus ES | 1991–1996 | Sedan / Sedan | rejected on review (2 files turned down) | [Commons](https://commons.wikimedia.org/w/index.php?search=Lexus%20ES%201991&ns6=1) |
| `lexus-es-g3` | Lexus ES | 1996–2001 | Sedan / Sedan | rejected on review (3 files turned down) | [Commons](https://commons.wikimedia.org/w/index.php?search=Lexus%20ES%201996&ns6=1) |
| `lexus-gs-g1` | Lexus GS | 1991–1997 | Sedan / Sedan | rejected on review (3 files turned down) | [Commons](https://commons.wikimedia.org/w/index.php?search=Lexus%20GS%201991&ns6=1) |
| `lexus-ls-g1` | Lexus LS | 1989–1994 | Sedan / Sedan | rejected on review (3 files turned down) | [Commons](https://commons.wikimedia.org/w/index.php?search=Lexus%20LS%201989&ns6=1) |
| `lexus-lx-g1` | Lexus LX | 1996–1997 | SUV / SUV | rejected on review (3 files turned down) | [Commons](https://commons.wikimedia.org/w/index.php?search=Lexus%20LX%201996&ns6=1) |
| `nissan-maxima-g6` | Nissan Maxima | 2004–2008 | Sedan / Sedan | rejected on review (3 files turned down) | [Commons](https://commons.wikimedia.org/w/index.php?search=Nissan%20Maxima%202004&ns6=1) |
| `nissan-micra-g6` | Nissan Micra | 2025–now | Hatchback / Hatchback | rejected on review (3 files turned down) | [Commons](https://commons.wikimedia.org/w/index.php?search=Nissan%20Micra%202025&ns6=1) |
| `nissan-micra-march-g3` | Nissan Micra / March | 2002–2010 | Hatchback / Hatchback | no candidate found at all | [Commons](https://commons.wikimedia.org/w/index.php?search=Nissan%20Micra%20%2F%20March%202002&ns6=1) |
| `nissan-navara-g1` | Nissan Navara | 2005–2015 | Pickup Truck / Pickup Truck | rejected on review (3 files turned down) | [Commons](https://commons.wikimedia.org/w/index.php?search=Nissan%20Navara%202005&ns6=1) |
| `nissan-patrol-g2` | Nissan Patrol | 1980–1989 | SUV / Off-Road | rejected on review (1 file turned down) | [Commons](https://commons.wikimedia.org/w/index.php?search=Nissan%20Patrol%201980&ns6=1) |
| `nissan-pulsar-gti-r-g1` | Nissan Pulsar GTI-R | 1990–1994 | Hatchback / Hot Hatch | rejected on review (2 files turned down) | [Commons](https://commons.wikimedia.org/w/index.php?search=Nissan%20Pulsar%20GTI-R%201990&ns6=1) |
| `nissan-pulsar-nx-nx-g1` | Nissan Pulsar NX / NX | 1983–1993 | Coupe / Coupe | no candidate found at all | [Commons](https://commons.wikimedia.org/w/index.php?search=Nissan%20Pulsar%20NX%20%2F%20NX%201983&ns6=1) |
| `nissan-qashqai-rogue-sport-g1` | Nissan Qashqai / Rogue Sport | 2006–2013 | SUV / SUV | no candidate found at all | [Commons](https://commons.wikimedia.org/w/index.php?search=Nissan%20Qashqai%20%2F%20Rogue%20Sport%202006&ns6=1) |
| `nissan-qashqai-rogue-sport-g2` | Nissan Qashqai / Rogue Sport | 2013–2021 | SUV / SUV | no candidate found at all | [Commons](https://commons.wikimedia.org/w/index.php?search=Nissan%20Qashqai%20%2F%20Rogue%20Sport%202013&ns6=1) |
| `nissan-silvia-200sx-g4` | Nissan Silvia / 200SX | 1983–1988 | Coupe / Sports Car | rejected on review (1 file turned down) | [Commons](https://commons.wikimedia.org/w/index.php?search=Nissan%20Silvia%20%2F%20200SX%201983&ns6=1) |
| `nissan-silvia-240sx-g5` | Nissan Silvia / 240SX | 1988–1994 | Coupe / Sports Car | no candidate found at all | [Commons](https://commons.wikimedia.org/w/index.php?search=Nissan%20Silvia%20%2F%20240SX%201988&ns6=1) |
| `nissan-skyline-g11` | Nissan Skyline | 2001–2006 | Sedan / Sedan | rejected on review (3 files turned down) | [Commons](https://commons.wikimedia.org/w/index.php?search=Nissan%20Skyline%202001&ns6=1) |
| `nissan-skyline-gt-r-g2` | Nissan Skyline GT-R | 1973–1973 | Coupe / Sports Car | rejected on review (2 files turned down) | [Commons](https://commons.wikimedia.org/w/index.php?search=Nissan%20Skyline%20GT-R%201973&ns6=1) |

Generated 2026-11-01 — 24 of 528 cars.
