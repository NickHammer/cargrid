# Photos wanted

71 cars are curated and ready but have no usable photo, so they are
**not in the game**. They wait in `data/incoming/needs-photo.json` and return
automatically once a photo is verified:

```bash
# put the Commons file name in data/curation/pinned-files.json against the car id, then:
node scripts/fetch-car-images.mjs <car-id>
node scripts/mark-image-verified.mjs <car-id>
node scripts/optimize-car-images.mjs
node scripts/park-imageless-cars.mjs --restore
node scripts/validate-grids.mjs --min 3
```

**Renault** 25 · **Fiat** 10 · **Peugeot** 10 · **Citroën** 9 · **Mitsubishi** 7 · **Nissan** 5 · **Cadillac** 2 · **Lexus** 2 · **Jeep** 1

## What a usable photo looks like

Tiles are 4:3 at about 300px, so: a front three-quarter view, the car filling
the frame, a standard car with no livery, decals or roof rack, nothing and
nobody in front of it, and above all **the right generation and the right
body**. Body Style is a live grid category, so an estate or a cabriolet against
a Sedan or Hatchback record makes a puzzle wrong — that has now cost 7 cars
across four waves, and none of them looked wrong at thumbnail size.

## The list

| id | car | years | body / class | search Commons |
|---|---|---|---|---|
| `cadillac-cts-g3` | Cadillac CTS | 2014–2019 | Sedan / Sedan | [CTS](https://commons.wikimedia.org/w/index.php?search=Cadillac%20CTS%202014&ns6=1) |
| `cadillac-eldorado-g1` | Cadillac Eldorado | 1953–1953 | Convertible / Coupe | [Eldorado](https://commons.wikimedia.org/w/index.php?search=Cadillac%20Eldorado%201953&ns6=1) |
| `citroen-ami-g1` | Citroën Ami | 1961–1978 | Sedan / Sedan | [Ami](https://commons.wikimedia.org/w/index.php?search=Citro%C3%ABn%20Ami%201961&ns6=1) |
| `citroen-berlingo-g1` | Citroën Berlingo | 1996–2008 | Minivan / Minivan | [Berlingo](https://commons.wikimedia.org/w/index.php?search=Citro%C3%ABn%20Berlingo%201996&ns6=1) |
| `citroen-berlingo-g2` | Citroën Berlingo | 2008–2018 | Minivan / Minivan | [Berlingo](https://commons.wikimedia.org/w/index.php?search=Citro%C3%ABn%20Berlingo%202008&ns6=1) |
| `citroen-c-zero-g1` | Citroën C-Zero | 2010–2020 | Hatchback / Hatchback | [C-Zero](https://commons.wikimedia.org/w/index.php?search=Citro%C3%ABn%20C-Zero%202010&ns6=1) |
| `citroen-c3-g4` | Citroën C3 | 2024–now | Hatchback / Hatchback | [C3](https://commons.wikimedia.org/w/index.php?search=Citro%C3%ABn%20C3%202024&ns6=1) |
| `citroen-c4-g1` | Citroën C4 | 2004–2010 | Hatchback / Hatchback | [C4](https://commons.wikimedia.org/w/index.php?search=Citro%C3%ABn%20C4%202004&ns6=1) |
| `citroen-dyane-g1` | Citroën Dyane | 1967–1983 | Hatchback / Hatchback | [Dyane](https://commons.wikimedia.org/w/index.php?search=Citro%C3%ABn%20Dyane%201967&ns6=1) |
| `citroen-mehari-g1` | Citroën Méhari | 1968–1988 | Convertible / Off-Road | [Méhari](https://commons.wikimedia.org/w/index.php?search=Citro%C3%ABn%20M%C3%A9hari%201968&ns6=1) |
| `citroen-xsara-g1` | Citroën Xsara | 1997–2006 | Hatchback / Hatchback | [Xsara](https://commons.wikimedia.org/w/index.php?search=Citro%C3%ABn%20Xsara%201997&ns6=1) |
| `fiat-124-g1` | Fiat 124 | 1966–1974 | Sedan / Sedan | [124](https://commons.wikimedia.org/w/index.php?search=Fiat%20124%201966&ns6=1) |
| `fiat-125-g1` | Fiat 125 | 1967–1972 | Sedan / Sedan | [125](https://commons.wikimedia.org/w/index.php?search=Fiat%20125%201967&ns6=1) |
| `fiat-130-g1` | Fiat 130 | 1969–1977 | Sedan / Sedan | [130](https://commons.wikimedia.org/w/index.php?search=Fiat%20130%201969&ns6=1) |
| `fiat-600-g2` | Fiat 600 | 2023–now | SUV / SUV | [600](https://commons.wikimedia.org/w/index.php?search=Fiat%20600%202023&ns6=1) |
| `fiat-marea-g1` | Fiat Marea | 1996–2002 | Sedan / Sedan | [Marea](https://commons.wikimedia.org/w/index.php?search=Fiat%20Marea%201996&ns6=1) |
| `fiat-mobi-g1` | Fiat Mobi | 2016–now | Hatchback / Hatchback | [Mobi](https://commons.wikimedia.org/w/index.php?search=Fiat%20Mobi%202016&ns6=1) |
| `fiat-panda-g3` | Fiat Panda | 2011–now | Hatchback / Hatchback | [Panda](https://commons.wikimedia.org/w/index.php?search=Fiat%20Panda%202011&ns6=1) |
| `fiat-punto-g1` | Fiat Punto | 1993–1999 | Hatchback / Hatchback | [Punto](https://commons.wikimedia.org/w/index.php?search=Fiat%20Punto%201993&ns6=1) |
| `fiat-regata-g1` | Fiat Regata | 1983–1990 | Sedan / Sedan | [Regata](https://commons.wikimedia.org/w/index.php?search=Fiat%20Regata%201983&ns6=1) |
| `fiat-strada-g1` | Fiat Strada | 1996–2020 | Pickup Truck / Pickup Truck | [Strada](https://commons.wikimedia.org/w/index.php?search=Fiat%20Strada%201996&ns6=1) |
| `jeep-cj-6-g1` | Jeep CJ-6 | 1955–1975 | SUV / Off-Road | [CJ-6](https://commons.wikimedia.org/w/index.php?search=Jeep%20CJ-6%201955&ns6=1) |
| `lexus-es-g2` | Lexus ES | 1991–1996 | Sedan / Sedan | [ES](https://commons.wikimedia.org/w/index.php?search=Lexus%20ES%201991&ns6=1) |
| `lexus-ls-g2` | Lexus LS | 1994–2000 | Sedan / Sedan | [LS](https://commons.wikimedia.org/w/index.php?search=Lexus%20LS%201994&ns6=1) |
| `mitsubishi-galant-g6` | Mitsubishi Galant | 1987–1992 | Sedan / Sedan | [Galant](https://commons.wikimedia.org/w/index.php?search=Mitsubishi%20Galant%201987&ns6=1) |
| `mitsubishi-l200-triton-g1` | Mitsubishi L200 / Triton | 1978–1986 | Pickup Truck / Pickup Truck | [L200](https://commons.wikimedia.org/w/index.php?search=Mitsubishi%20L200%201978&ns6=1) · [Triton](https://commons.wikimedia.org/w/index.php?search=Mitsubishi%20Triton%201978&ns6=1) |
| `mitsubishi-l200-triton-g2` | Mitsubishi L200 / Triton | 1986–1996 | Pickup Truck / Pickup Truck | [L200](https://commons.wikimedia.org/w/index.php?search=Mitsubishi%20L200%201986&ns6=1) · [Triton](https://commons.wikimedia.org/w/index.php?search=Mitsubishi%20Triton%201986&ns6=1) |
| `mitsubishi-lancer-evolution-ii-g1` | Mitsubishi Lancer Evolution II | 1994–1995 | Sedan / Sports Car | [Lancer Evolution II](https://commons.wikimedia.org/w/index.php?search=Mitsubishi%20Lancer%20Evolution%20II%201994&ns6=1) |
| `mitsubishi-lancer-evolution-iii-g1` | Mitsubishi Lancer Evolution III | 1995–1996 | Sedan / Sports Car | [Lancer Evolution III](https://commons.wikimedia.org/w/index.php?search=Mitsubishi%20Lancer%20Evolution%20III%201995&ns6=1) |
| `mitsubishi-lancer-evolution-v-g1` | Mitsubishi Lancer Evolution V | 1998–1999 | Sedan / Sports Car | [Lancer Evolution V](https://commons.wikimedia.org/w/index.php?search=Mitsubishi%20Lancer%20Evolution%20V%201998&ns6=1) |
| `mitsubishi-pajero-sport-montero-sport-g2` | Mitsubishi Pajero Sport / Montero Sport | 2008–2015 | SUV / Off-Road | [Pajero Sport](https://commons.wikimedia.org/w/index.php?search=Mitsubishi%20Pajero%20Sport%202008&ns6=1) · [Montero Sport](https://commons.wikimedia.org/w/index.php?search=Mitsubishi%20Montero%20Sport%202008&ns6=1) |
| `nissan-micra-g6` | Nissan Micra | 2025–now | Hatchback / Hatchback | [Micra](https://commons.wikimedia.org/w/index.php?search=Nissan%20Micra%202025&ns6=1) |
| `nissan-patrol-g2` | Nissan Patrol | 1980–1989 | SUV / Off-Road | [Patrol](https://commons.wikimedia.org/w/index.php?search=Nissan%20Patrol%201980&ns6=1) |
| `nissan-pulsar-nx-nx-g1` | Nissan Pulsar NX / NX | 1983–1993 | Coupe / Coupe | [Pulsar NX](https://commons.wikimedia.org/w/index.php?search=Nissan%20Pulsar%20NX%201983&ns6=1) · [NX](https://commons.wikimedia.org/w/index.php?search=Nissan%20NX%201983&ns6=1) |
| `nissan-skyline-g9` | Nissan Skyline | 1993–1998 | Sedan / Sedan | [Skyline](https://commons.wikimedia.org/w/index.php?search=Nissan%20Skyline%201993&ns6=1) |
| `nissan-skyline-gt-r-g2` | Nissan Skyline GT-R | 1973–1973 | Coupe / Sports Car | [Skyline GT-R](https://commons.wikimedia.org/w/index.php?search=Nissan%20Skyline%20GT-R%201973&ns6=1) |
| `peugeot-106-g1` | Peugeot 106 | 1991–2003 | Hatchback / Hatchback | [106](https://commons.wikimedia.org/w/index.php?search=Peugeot%20106%201991&ns6=1) |
| `peugeot-304-g1` | Peugeot 304 | 1969–1980 | Sedan / Sedan | [304](https://commons.wikimedia.org/w/index.php?search=Peugeot%20304%201969&ns6=1) |
| `peugeot-308-g1` | Peugeot 308 | 2007–2013 | Hatchback / Hatchback | [308](https://commons.wikimedia.org/w/index.php?search=Peugeot%20308%202007&ns6=1) |
| `peugeot-309-g1` | Peugeot 309 | 1985–1993 | Hatchback / Hatchback | [309](https://commons.wikimedia.org/w/index.php?search=Peugeot%20309%201985&ns6=1) |
| `peugeot-404-g1` | Peugeot 404 | 1960–1975 | Sedan / Sedan | [404](https://commons.wikimedia.org/w/index.php?search=Peugeot%20404%201960&ns6=1) |
| `peugeot-406-g1` | Peugeot 406 | 1995–2004 | Sedan / Sedan | [406](https://commons.wikimedia.org/w/index.php?search=Peugeot%20406%201995&ns6=1) |
| `peugeot-5008-g1` | Peugeot 5008 | 2009–2016 | Minivan / Minivan | [5008](https://commons.wikimedia.org/w/index.php?search=Peugeot%205008%202009&ns6=1) |
| `peugeot-508-g1` | Peugeot 508 | 2010–2018 | Sedan / Sedan | [508](https://commons.wikimedia.org/w/index.php?search=Peugeot%20508%202010&ns6=1) |
| `peugeot-607-g1` | Peugeot 607 | 1999–2010 | Sedan / Sedan | [607](https://commons.wikimedia.org/w/index.php?search=Peugeot%20607%201999&ns6=1) |
| `peugeot-ion-g1` | Peugeot iOn | 2011–2020 | Hatchback / Hatchback | [iOn](https://commons.wikimedia.org/w/index.php?search=Peugeot%20iOn%202011&ns6=1) |
| `renault-10-g1` | Renault 10 | 1965–1971 | Sedan / Sedan | [10](https://commons.wikimedia.org/w/index.php?search=Renault%2010%201965&ns6=1) |
| `renault-14-g1` | Renault 14 | 1976–1983 | Hatchback / Hatchback | [14](https://commons.wikimedia.org/w/index.php?search=Renault%2014%201976&ns6=1) |
| `renault-19-g1` | Renault 19 | 1988–2000 | Hatchback / Hatchback | [19](https://commons.wikimedia.org/w/index.php?search=Renault%2019%201988&ns6=1) |
| `renault-21-g1` | Renault 21 | 1986–1995 | Sedan / Sedan | [21](https://commons.wikimedia.org/w/index.php?search=Renault%2021%201986&ns6=1) |
| `renault-25-g1` | Renault 25 | 1984–1992 | Hatchback / Hatchback | [25](https://commons.wikimedia.org/w/index.php?search=Renault%2025%201984&ns6=1) |
| `renault-4-e-tech-g2` | Renault 4 E-Tech | 2024–now | SUV / SUV | [4 E-Tech](https://commons.wikimedia.org/w/index.php?search=Renault%204%20E-Tech%202024&ns6=1) |
| `renault-5-e-tech-g3` | Renault 5 E-Tech | 2024–now | Hatchback / Hatchback | [5 E-Tech](https://commons.wikimedia.org/w/index.php?search=Renault%205%20E-Tech%202024&ns6=1) |
| `renault-5-g1` | Renault 5 | 1972–1985 | Hatchback / Hatchback | [5](https://commons.wikimedia.org/w/index.php?search=Renault%205%201972&ns6=1) |
| `renault-9-11-g1` | Renault 9 / 11 | 1981–1989 | Sedan / Sedan | [9](https://commons.wikimedia.org/w/index.php?search=Renault%209%201981&ns6=1) · [11](https://commons.wikimedia.org/w/index.php?search=Renault%2011%201981&ns6=1) |
| `renault-arkana-g1` | Renault Arkana | 2019–now | SUV / SUV | [Arkana](https://commons.wikimedia.org/w/index.php?search=Renault%20Arkana%202019&ns6=1) |
| `renault-clio-g3` | Renault Clio | 2005–2014 | Hatchback / Hatchback | [Clio](https://commons.wikimedia.org/w/index.php?search=Renault%20Clio%202005&ns6=1) |
| `renault-clio-g6` | Renault Clio | 2025–now | Hatchback / Hatchback | [Clio](https://commons.wikimedia.org/w/index.php?search=Renault%20Clio%202025&ns6=1) |
| `renault-espace-g1` | Renault Espace | 1984–1991 | Minivan / Minivan | [Espace](https://commons.wikimedia.org/w/index.php?search=Renault%20Espace%201984&ns6=1) |
| `renault-fluence-g1` | Renault Fluence | 2009–2017 | Sedan / Sedan | [Fluence](https://commons.wikimedia.org/w/index.php?search=Renault%20Fluence%202009&ns6=1) |
| `renault-kangoo-g1` | Renault Kangoo | 1997–2007 | Minivan / Minivan | [Kangoo](https://commons.wikimedia.org/w/index.php?search=Renault%20Kangoo%201997&ns6=1) |
| `renault-kangoo-g3` | Renault Kangoo | 2021–now | Minivan / Minivan | [Kangoo](https://commons.wikimedia.org/w/index.php?search=Renault%20Kangoo%202021&ns6=1) |
| `renault-laguna-g1` | Renault Laguna | 1993–2001 | Hatchback / Hatchback | [Laguna](https://commons.wikimedia.org/w/index.php?search=Renault%20Laguna%201993&ns6=1) |
| `renault-megane-g1` | Renault Mégane | 1995–2002 | Hatchback / Hatchback | [Mégane](https://commons.wikimedia.org/w/index.php?search=Renault%20M%C3%A9gane%201995&ns6=1) |
| `renault-megane-rs-g2` | Renault Mégane RS | 2004–2009 | Hatchback / Hot Hatch | [Mégane RS](https://commons.wikimedia.org/w/index.php?search=Renault%20M%C3%A9gane%20RS%202004&ns6=1) |
| `renault-rafale-g1` | Renault Rafale | 2024–now | SUV / SUV | [Rafale](https://commons.wikimedia.org/w/index.php?search=Renault%20Rafale%202024&ns6=1) |
| `renault-scenic-g2` | Renault Scénic | 2003–2009 | Minivan / Minivan | [Scénic](https://commons.wikimedia.org/w/index.php?search=Renault%20Sc%C3%A9nic%202003&ns6=1) |
| `renault-scenic-g4` | Renault Scénic | 2016–2022 | Minivan / Minivan | [Scénic](https://commons.wikimedia.org/w/index.php?search=Renault%20Sc%C3%A9nic%202016&ns6=1) |
| `renault-symbioz-g1` | Renault Symbioz | 2024–now | SUV / SUV | [Symbioz](https://commons.wikimedia.org/w/index.php?search=Renault%20Symbioz%202024&ns6=1) |
| `renault-talisman-g1` | Renault Talisman | 2015–2022 | Sedan / Sedan | [Talisman](https://commons.wikimedia.org/w/index.php?search=Renault%20Talisman%202015&ns6=1) |
| `renault-twingo-g1` | Renault Twingo | 1993–2007 | Hatchback / Hatchback | [Twingo](https://commons.wikimedia.org/w/index.php?search=Renault%20Twingo%201993&ns6=1) |

Generated 2026-11-04.
