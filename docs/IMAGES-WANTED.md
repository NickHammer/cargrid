# Photos wanted

16 of 730 cars still have no photo. They render as a plain
text tile in the game, which works but looks unfinished.

**Mitsubishi** 7 · **Nissan** 4 · **Cadillac** 2 · **Buick** 1 · **Jeep** 1 · **Lexus** 1

## Why these are still empty

Not because Wikimedia Commons lacks the cars. It holds thousands of photos
of most of them. These are the ones where the automatic picker keeps
choosing a photo of the wrong thing, and a person has to look instead.

The three ways it goes wrong, all seen in the last pass:

- **The wrong generation.** A nameplate runs for forty years and every
  version is called the same thing. A photo labelled 1999 can be the
  outgoing shape rather than the incoming one.
- **The year in the file name is when the photo was taken**, not what the
  car is. A 2006 truck photographed in 2023 reads as a 2023 truck.
- **The wrong body.** A convertible where the record says saloon, an
  estate where it says saloon. Body Style is a real category in the game,
  so this one actually makes a puzzle wrong.

## What a good photo looks like

Tiles are cropped to 4:3 and shown about 300px wide, so:

1. **Front three-quarter.** Front corner of the car, showing the grille and
   one side at once. A straight-on nose shot hides the shape; a pure side
   view loses the grille, which is most of what you recognise a car by.
2. **The car fills the frame.** Not a street scene with a car in it.
3. **Standard car, nothing on it or in front of it.** No race livery, no
   body kit, no crates on the bonnet, nobody leaning on it.
4. **Right generation.** The single thing most worth double-checking.

## How to hand one back

Give the **file name**, not the file. Every published photo has to be a
Commons file, because that is what lets the pipeline check the licence and
record the photographer on the `/credits` page. Crediting them is a
condition of the licences most of these carry, so a photo of unknown origin
cannot be used.

1. Open a search link below.
2. Pick a photo. **Open it full size** before deciding; the small previews
   crop tightly and hide what is wrong with a shot.
3. Copy the name exactly as Commons shows it, without the `File:` part.
4. Paste it into `data/curation/pinned-files.json` against the car id, or
   just send the list over.

You can also take the photo yourself. Most of what is left is an ordinary
car you could find in a car park, and a photo you took has no licence
question at all. Flickr is the other good source: set its licence filter to
allow commercial use and changes, and photos found there can be moved onto
Commons with the Flickypedia tool.

## The list

| id | car | years | body / class | status | search Commons |
|---|---|---|---|---|---|
| `buick-roadmaster-g1` | Buick Roadmaster | 1936–1958 | Sedan / Sedan | 5 photos tried, all wrong | [Roadmaster](https://commons.wikimedia.org/w/index.php?search=Buick%20Roadmaster%201936&ns6=1) |
| `cadillac-ct6-g1` | Cadillac CT6 | 2016–2020 | Sedan / Sedan | 3 photos tried, all wrong | [CT6](https://commons.wikimedia.org/w/index.php?search=Cadillac%20CT6%202016&ns6=1) |
| `cadillac-eldorado-g1` | Cadillac Eldorado | 1953–1953 | Convertible / Coupe | 1 photo tried, all wrong | [Eldorado](https://commons.wikimedia.org/w/index.php?search=Cadillac%20Eldorado%201953&ns6=1) |
| `jeep-cj-6-g1` | Jeep CJ-6 | 1955–1975 | SUV / Off-Road | 2 photos tried, all wrong | [CJ-6](https://commons.wikimedia.org/w/index.php?search=Jeep%20CJ-6%201955&ns6=1) |
| `lexus-es-g2` | Lexus ES | 1991–1996 | Sedan / Sedan | 4 photos tried, all wrong | [ES](https://commons.wikimedia.org/w/index.php?search=Lexus%20ES%201991&ns6=1) |
| `mitsubishi-galant-g6` | Mitsubishi Galant | 1987–1992 | Sedan / Sedan | 4 photos tried, all wrong | [Galant](https://commons.wikimedia.org/w/index.php?search=Mitsubishi%20Galant%201987&ns6=1) |
| `mitsubishi-l200-triton-g1` | Mitsubishi L200 / Triton | 1978–1986 | Pickup Truck / Pickup Truck | 2 photos tried, all wrong | [L200](https://commons.wikimedia.org/w/index.php?search=Mitsubishi%20L200%201978&ns6=1) · [Triton](https://commons.wikimedia.org/w/index.php?search=Mitsubishi%20Triton%201978&ns6=1) |
| `mitsubishi-l200-triton-g2` | Mitsubishi L200 / Triton | 1986–1996 | Pickup Truck / Pickup Truck | 3 photos tried, all wrong | [L200](https://commons.wikimedia.org/w/index.php?search=Mitsubishi%20L200%201986&ns6=1) · [Triton](https://commons.wikimedia.org/w/index.php?search=Mitsubishi%20Triton%201986&ns6=1) |
| `mitsubishi-lancer-evolution-ii-g1` | Mitsubishi Lancer Evolution II | 1994–1995 | Sedan / Sports Car | 2 photos tried, all wrong | [Lancer Evolution II](https://commons.wikimedia.org/w/index.php?search=Mitsubishi%20Lancer%20Evolution%20II%201994&ns6=1) |
| `mitsubishi-lancer-evolution-iii-g1` | Mitsubishi Lancer Evolution III | 1995–1996 | Sedan / Sports Car | 2 photos tried, all wrong | [Lancer Evolution III](https://commons.wikimedia.org/w/index.php?search=Mitsubishi%20Lancer%20Evolution%20III%201995&ns6=1) |
| `mitsubishi-lancer-evolution-v-g1` | Mitsubishi Lancer Evolution V | 1998–1999 | Sedan / Sports Car | 1 photo tried, all wrong | [Lancer Evolution V](https://commons.wikimedia.org/w/index.php?search=Mitsubishi%20Lancer%20Evolution%20V%201998&ns6=1) |
| `mitsubishi-pajero-sport-montero-sport-g2` | Mitsubishi Pajero Sport / Montero Sport | 2008–2015 | SUV / Off-Road | 4 photos tried, all wrong | [Pajero Sport](https://commons.wikimedia.org/w/index.php?search=Mitsubishi%20Pajero%20Sport%202008&ns6=1) · [Montero Sport](https://commons.wikimedia.org/w/index.php?search=Mitsubishi%20Montero%20Sport%202008&ns6=1) |
| `nissan-micra-g6` | Nissan Micra | 2025–now | Hatchback / Hatchback | 3 photos tried, all wrong | [Micra](https://commons.wikimedia.org/w/index.php?search=Nissan%20Micra%202025&ns6=1) |
| `nissan-patrol-g2` | Nissan Patrol | 1980–1989 | SUV / Off-Road | 2 photos tried, all wrong | [Patrol](https://commons.wikimedia.org/w/index.php?search=Nissan%20Patrol%201980&ns6=1) |
| `nissan-pulsar-nx-nx-g1` | Nissan Pulsar NX / NX | 1983–1993 | Coupe / Coupe | nothing found yet | [Pulsar NX](https://commons.wikimedia.org/w/index.php?search=Nissan%20Pulsar%20NX%201983&ns6=1) · [NX](https://commons.wikimedia.org/w/index.php?search=Nissan%20NX%201983&ns6=1) |
| `nissan-skyline-gt-r-g2` | Nissan Skyline GT-R | 1973–1973 | Coupe / Sports Car | 3 photos tried, all wrong | [Skyline GT-R](https://commons.wikimedia.org/w/index.php?search=Nissan%20Skyline%20GT-R%201973&ns6=1) |

Generated 2026-11-02.
