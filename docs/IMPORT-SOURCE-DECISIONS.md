# CarGrid data: decisions you might want to change

Each entry is a judgment call I made while building `cargrid_cars.json`. To change one, tell me the rule and I'll re-run the affected brands. Most changes are a one-line edit plus a rebuild.

## Global rules (apply to every brand)

- **One row per generation.** Facelifts stay inside their generation. Performance versions (M3, RS 4, Type R, etc.) get their own rows.
- **`generation` is an integer.** Models that only ever had one design get `generation: 1`.
- **`brands`** = every badge this exact car was sold under. Example: NSX = `["Acura","Honda"]`. A car that was only ever sold under one badge lists just that badge, even if another company built it (A90 Supra = `["Toyota"]`).
- **`brands` only includes near-identical rebadges**, such as Opel/Vauxhall/Holden versions of a Buick or the Rolls-Royce twins of old Bentleys. US platform siblings with different styling (e.g. Buick LeSabre vs Oldsmobile 88) are NOT combined.
- **Plug-in hybrids sold alongside an EV version** list both fuel types and keep `engine_position: "Front-engine"`.
- **Brands removed at your request:** BYD, Geely, Great Wall and Xiaomi are gone from the master list and the JSON. Non-Chinese brands with Chinese owners are kept: Volvo, Polestar, Lotus, Smart, and the modern SAIC-era MG.
- **Hydrogen fuel-cell cars are treated like EVs**: `engine_position: null`, `engine_layouts: ["Electric"]`.
- **EVs get `engine_position: null`**, so they don't show up in Front/Mid/Rear-engine grids. EV motors appear in `powertrains` with null cylinders, aspiration and displacement.
- **Cars sold as both gas and electric** (e.g. Alfa Romeo Junior, 33 Stradale) list both fuel types, and `engine_layouts` includes "Electric".
- **Mild hybrids count as "Hybrid"** only where the hybrid system is a headline feature (e.g. Alfa Tonale). Otherwise they count as Gasoline/Diesel.
- **DCT, automated manual (Selespeed, SMG, etc.), sequential and single-speed EV gearboxes all count as "Automatic".**
- **`body_style` is the most common or best-known body** when a generation came in several. Convertible variants of coupes aren't listed separately.
- **4-door fastbacks / "4-door coupes"** (Audi A7, RS 7, e-tron GT, Aston Rapide, BMW Gran Coupés) are body "Sedan".
- **Horsepower** is converted from metric horsepower (PS) where that's the manufacturer's rating. Ranges cover every market's ratings, from the weakest engine to the strongest.
- **`powertrains` lists up to ~4-5 typical engines per generation** (base, mid, top, plus any famous one), not every engine variant.
- **`price_at_launch_usd` and `pop_culture` are null** everywhere for now.
- **Data comes from my own knowledge, not web lookups.** The newest cars (2025-2026) are the least certain.
- **Values your site doesn't accept yet:**
  - Countries: Australian, Czech, Romanian, Russian, Austrian, Danish, Vietnamese, Dutch, Croatian (Rimac)
  - Engine layouts: Flat-12, Inline-8, W8, V5, Flat-2, Single-cylinder, V16 (Bugatti Tourbillon), V2 (Mazda R360, Morgan 3 Wheeler and Three-Wheeler)
  - Fuel type: Hydrogen (Hyundai Nexo, Honda Clarity, Honda CR-V e:FCEV)
  - Body style and class: Van
  - Aspiration: Supercharged
- **Brand-level `manufacturer_still_active`:**
  - `false`: Datsun, Daewoo, DeLorean, Fisker, Hummer (now a GMC sub-brand), Holden, HSV, Mercury, Mosler, Oldsmobile, Pontiac, Plymouth, Saab, Scion, Studebaker, Saturn, Spyker
  - `true` but uncertain: TVR, Alpina (BMW took over the brand in 2026), Apollo, Jaguar (mid-rebrand, no cars on sale)

## Acura

- NSX 1st gen: hp max 290 (3.2L engine from 1997), not 270 as in your example. Added the C32B engine.
- NSX 2nd gen = "Supercar". NSX 1st gen = "Sports Car".
- Integra 2nd/3rd gen: body "Hatchback" (sedan also sold).
- RSX: body "Coupe", class "Coupe".
- SLX: `brands: ["Acura","Isuzu","Honda"]` (rebadged Isuzu Trooper / Honda Horizon).
- Models also sold as Hondas (Integra, Legend, RL, Vigor, early TL, TSX, MDX 1st gen) include "Honda" in `brands`.

## Audi

- RS 4 and RS 6 are body "Wagon", because they were mostly built as Avants. The exception is RS 4 B7, which is "Sedan".
- A7 / S7 / RS 7 / e-tron GT / new A5 (B10) = "Sedan".
- R8 = "Supercar". TT, RS 5 and the original Quattro = "Sports Car". S3 and RS 3 = "Hot Hatch".
- The 2026 RS 5 plug-in hybrid is listed at ~630 hp. That's the least certain number.
- The S4 numbering starts at the B5 (1997). The earlier Audi 100-based S4 is folded into S6 1st gen.

## Aston Martin

- Cygnet: `brands: ["Aston Martin","Toyota"]` (rebadged Toyota iQ).
- Valkyrie and Valhalla = "Hypercar". One-77 and Vulcan = "Supercar". Everything else = "Sports Car".
- Rapide = body "Sedan".
- Vulcan's sequential gearbox counts as "Automatic".

## Alfa Romeo

- 33 Stradale and Junior list both fuel types and both engine layouts (gas + electric versions).
- Arna: `brands: ["Alfa Romeo","Nissan"]` (based on the Nissan Cherry).
- 8C Competizione = "Supercar".
- Giulietta 1st gen (1954) is body "Sedan", although the Sprint coupe is the more famous version.

## Alpina

- `brands` is just ["Alpina"], not BMW.
- Gran Coupés (B6, B8, B4) = body "Sedan".

## Abarth

- Classic Fiat-based Abarths list `brands: ["Abarth","Fiat"]`. Modern Abarths list just Abarth.
- Fiat-Abarth 595/695 (1960s) = body "Hatchback", class "Hatchback". The 1960s 850 TC and 1000 TC = "Sedan".

## Ariel / Apollo

- Atom = Convertible / Sports Car. Nomad = Convertible / Off-Road.
- Gumpert Apollo: `brands: ["Apollo","Gumpert"]`.
- Intensa Emozione = "Hypercar". Gumpert Apollo and Apollo N = "Supercar".

## BMW

- Isetta: body "Coupe", class "Coupe", engine "Single-cylinder", rear-engine.
- M3 1st–4th gen and M4 = Coupe / Sports Car. M3 5th and 6th gen (F80, G80) = Sedan / Sports Car. M5 = Sedan / Sedan.
- M1 = "Supercar". The i8 = "Sports Car" (Plug-in Hybrid, mid-engine).
- i3 lists `["Electric", "Plug-in Hybrid"]`, because the REx range-extender version has a small 2-cylinder engine. That gives it `engine_position: "Rear-engine"` instead of null.
- 5 Series GT and 6 Series GT = Hatchback / Hatchback. 2 Series Active Tourer = Minivan.
- The 2002 is listed as "Sedan" (it's a 2-door sedan, despite its sporty reputation).
- SMG automated manuals count as "Automatic".

## Bugatti

- Veyron and every car since = "Hypercar". EB110 = "Supercar". Pre-war cars = "Sports Car", except the Royale = "Sedan".
- Pre-war straight-8s use the new "Inline-8" layout. The Tourbillon uses the new "V16" layout.

## Bentley

- Old Bentleys that were Rolls-Royce twins (S1–S3, T-Series, Corniche, Mulsanne 1st gen, Continental convertible) list `brands: ["Bentley","Rolls-Royce"]`.
- Continental GT = "Sports Car". Older 2-door Bentleys (Continental R, Azure, Brooklands coupe, Corniche) = "Coupe".
- The 4th gen Continental GT includes the non-hybrid RWD Supersports, so it lists AWD + RWD and Gasoline + Plug-in Hybrid.
- Pre-war power figures are approximate.

## Buick

- Rebadged Opels list `["Buick","Opel","Vauxhall"(,"Holden")]`: Encore 1st gen, Regal 5th and 6th gen, Cascada.
- Regal Grand National, GNX and Gran Sport = "Muscle Car". Riviera / Reatta / Skylark coupes = "Coupe".
- Regal 6th gen = body "Hatchback" (Sportback liftback), class "Sedan".
- 1950s–70s horsepower is the period-correct rating (gross before 1972, net after), so ranges can look wide.
- The Electra E5 (China-only EV) hp range is uncertain.

## Brabus

- `brands` is just ["Brabus"], even though they're Mercedes/smart-based.
- 4x4² and Crawler = SUV / Off-Road (4WD). Rocket 1000 = Convertible / Supercar.
- Some Brabus engine sizes (850, SV12 S) are approximate.

## BAC

- Mono = Convertible / Sports Car (open single-seater). Sequential gearbox = "Automatic".

## Chevrolet

- C8 Corvette = "Sports Car" with `engine_position: "Mid-engine"`, even though the ZR1/ZR1X (1,064–1,250 hp) are hypercar-level. Tell me if you'd rather class the C8 as "Supercar".
- Camaro (all gens), Chevelle 1st–3rd gen = "Muscle Car". Impala SS (1994–96) = Sedan / Sedan. Nova 3rd gen = Coupe / Coupe.
- El Camino and SSR = "Pickup Truck".
- GM truck/SUV twins list `["Chevrolet","GMC"]`: C/K, Silverado, Suburban, Tahoe, K5 Blazer, S-10, S-10 Blazer, Colorado, Express, El Camino 3rd–5th gen.
- Other rebadges in `brands`:
  - Nova 5th gen, Prizm → Toyota
  - Metro → Suzuki
  - Tracker 1st gen → Geo, Suzuki
  - Aveo → Daewoo, Holden, Pontiac
  - Volt 1st gen → Opel, Vauxhall, Holden (Ampera)
  - Captiva Sport → Opel, Vauxhall, Saturn
- Express is the first car with the new "Van" body style and class.
- Spark 1st gen includes the Spark EV, so it lists Gasoline + Electric.
- Pre-1972 horsepower figures are gross ratings, so 1950s–60s cars show big ranges like 135–425.

## Cadillac

- **Split the catch-all row** "Eldorado 1st–5th gen" into real generations (1953, 1954–56, 1957–58, 1959–60, 1961–66). The master list now has 3,881 entries.
- Eldorado 1st–5th and 7th gen = body "Convertible" (the famous versions). Eldorado 6th and 8th–10th gen = "Coupe".
- Allanté and XLR = "Sports Car". Everything else follows the body: Sedan, Coupe or SUV.
- Catera: `brands: ["Cadillac","Opel","Vauxhall"]` (Opel Omega).

## Chrysler

- 300 Letter Series (1955–65) = "Muscle Car". 300 (non-letter) and Cordoba = "Coupe".
- Town & Country numbering starts with the 1990 minivan. The old wagon is "Town & Country (wagon)".
- Rebadges in `brands`:
  - Conquest → Mitsubishi, Dodge, Plymouth
  - Cirrus → Dodge, Plymouth
  - Laser → Dodge
  - Prowler → Plymouth
  - 300 2nd gen, 200 1st gen, T&C 4th gen → Lancia
- PT Cruiser = Hatchback.

## Citroën

- 2CV and the 1960s Ami = "Sedan". Dyane = Hatchback. Méhari = Convertible / Off-Road.
- XM, Xantia, C5 1st gen and C5 X = body "Hatchback", class "Sedan" (liftbacks).
- GS / GSA includes the rare GS Birotor, so its engine layouts include "Rotary".
- Berlingo = Minivan (passenger version). The H Van = Van.
- The Ami EV quadricycle (2020) = Hatchback, 8 hp, `brands: ["Citroen","Opel","Fiat"]` (Rocks-e, Topolino).
- `make` is spelled "Citroen" (no ë), matching your brand list.

## Czinger

- 21C = "Hypercar", Hybrid, mid-engine.

## Dodge

- **Charger:** 1st–3rd and 6th–8th gen = "Muscle Car" (the 6th/7th gen are body "Sedan" but class "Muscle Car"). 4th gen (1975–78) = Coupe. 5th gen (1982–87 FWD hatch) = Hatchback.
- Challenger 1st and 3rd gen, Demon, Super Bee and Charger Daytona = "Muscle Car". Challenger 2nd gen (Mitsubishi-built, 1978–83) = Coupe.
- Viper (all gens) = "Supercar". RT/10 roadster gens (1st and 3rd) = body Convertible. GTS-era gens = Coupe.
- Challenger SRT Demon covers only the 2018 car (808–840 hp). The 2023 Demon 170 (1,025 hp) isn't a separate entry. Tell me if you want one.
- Charger Daytona 8th gen = the EV. Charger Sixpack = the gas Hurricane I6 version.
- Mopar twins in `brands`:
  - Plymouth: Omni, Aries, Aspen, Shadow, Spirit, Neon, Caravan 1st–3rd gen, Ramcharger, Demon
  - Chrysler: Diplomat, Lancer, Dynasty, Stratus, Avenger coupe, Caravan 2nd–5th gen
- Other rebadges in `brands`:
  - Stealth, Colt, Challenger 2nd gen → Mitsubishi
  - Journey → Fiat (Freemont)
  - Hornet → Alfa Romeo (Tonale)
  - Grand Caravan 5th gen → Volkswagen (Routan), Lancia (Voyager)
  - Neon 3rd gen → Fiat (Tipo)
  - Monaco 2nd gen → Eagle (Premier)
  - Viper 5th gen → SRT (the 2013–14 cars were badged "SRT Viper")
- B-Series / Ram Van = Van. Ramcharger = SUV / Off-Road. Power Wagon = Pickup Truck.

## Datsun

- Nearly every Datsun lists `brands: ["Datsun","Nissan"]` (same car sold as a Nissan in Japan or elsewhere). The modern GO / redi-GO list Datsun only.
- 240Z / 260Z / 280Z / 280ZX = Coupe / Sports Car. Fairlady roadsters = Convertible / Sports Car.

## Dacia

- `country_of_origin: "Romanian"` (a new value).
- Most modern Dacias list `brands: ["Dacia","Renault"]` (sold as Renaults in many markets). Duster 1st gen also lists Nissan (Terrano).
- Jogger = body "Wagon", class "Wagon" (7-seat crossover-wagon). Lodgy / Dokker = Minivan.
- Sandero Stepway = Hatchback, not SUV.
- Duster "4x4" = AWD (on-demand), not 4WD.

## Daewoo

- Korando / Musso list `brands: ["Daewoo","SsangYong"]`.
- Later Daewoos list Chevrolet (Matiz 2nd gen, Kalos, Lacetti, Magnus, Tosca, Winstorm, Tacuma, Gentra). Lacetti and Magnus also list Suzuki (Forenza/Reno/Verona).
- Arcadia: `brands: ["Daewoo","Honda"]` (licensed Honda Legend). Tico: `["Daewoo","Suzuki"]`.
- Damas = Van (microvan).

## DeLorean

- DMC-12 = Coupe / Sports Car, rear-engine, 130 hp, `country_of_origin: "American"` (built in Northern Ireland, American company).

## ID format fix (affects all brands)

- IDs now convert accented letters and symbols properly. "Doblò" → `fiat-doblo-g1` (it was briefly `fiat-dobl-g1`), "Ka+" → `ford-ka-plus-g1`, "4½ Litre" → `bentley-4-half-litre-g1`, "330 GT 2+2" → `ferrari-330-gt-2-plus-2-g1`. This fixed a duplicate ID (Ka and Ka+ had collided). All earlier brands were rebuilt, so every ID in `cargrid_cars.json` is unique.

## Ford

- **Biggest brand so far (208 generations).**
- Mustang 1st and 3rd–7th gen, Torino = "Muscle Car". Mustang II = Coupe. Capri = "Sports Car".
- Raptors (F-150 and Ranger) = Pickup / "Off-Road". Bronco (all except Bronco Sport) = SUV / "Off-Road".
- GT40, GT (both gens), RS200 = "Supercar". Escort RS Cosworth, Sierra RS Cosworth and Focus RS = "Hot Hatch".
- Falcon (AU) = Sedan / Sedan for every generation, including the GT-HO era. Tell me if you want the XR–XY or XA–XC gens as "Muscle Car".
- Model T = body "Convertible" (the open tourer was the most common), class "Sedan".
- Transit, Econoline and Transit Connect = Van. The 1st gen Transit's Essex V4 uses the "V4" layout.
- Rebadges in `brands`:
  - Mercury: Taurus 1st–5th gen (Sable), Crown Victoria / LTD Crown Victoria (Grand Marquis), Explorer 2nd–4th gen (Mountaineer), Escape (Mariner), Fusion 1st gen (Milan), Contour (Mystique), Tempo (Topaz), Pinto (Bobcat), Fairmont (Zephyr), EXP (LN7), Freestar (Monterey), Five Hundred (Montego), Escort NA 2nd/3rd gen (Tracer), Granada NA (Monarch), Capri Mk1/Mk2
  - Mazda: Ranger NA 2nd/3rd gen and Ranger T6 (B-Series/BT-50), Explorer 1st gen (Navajo), Escape 1st/2nd gen (Tribute), Fiesta Mk4 (121), Festiva
  - Kia: Festiva (Pride), Aspire (Avella)
  - Volkswagen/SEAT: Galaxy Mk1 (Sharan/Alhambra). Volkswagen: Ranger 5th gen (Amarok)
  - Merkur: Sierra (XR4Ti)
- Super Duty 4th gen hp tops out at 500 (6.7 Power Stroke HO). F-150 13th gen includes the short-lived 3.0 diesel.

## Ferrari

- **Class rule:**
  - "Supercar": modern mid-engine V8/V6 cars from the 458 onward (458, 488, F8, 296, SF90, 849 Testarossa), the front-V12 flagships from the 599 onward (599, F12, 812, 12Cilindri), the Flat-12 Berlinetta Boxers / Testarossa, 288 GTO, F40, F50, Monza SP1/SP2, Daytona SP3
  - "Hypercar": Enzo, LaFerrari, F80
  - "Sports Car": everything else (classic V12 GTs, 308/328/348/F355/360/F430, California/Portofino/Roma/Amalfi, 550/575M, 456/612, FF/GTC4Lusso)
  - Purosangue = SUV
  - Note the F430 and 360 are split: 360 = Sports Car, F430 = Supercar. Tell me if you'd rather draw the line elsewhere.
- FF and GTC4Lusso = body "Wagon" (shooting brakes), class "Sports Car".
- Dino 206/246 and 308 GT4 list `brands: ["Ferrari","Dino"]` (they wore Dino badges).
- F1 / DCT gearboxes = "Automatic".
- Flat-12 cars (365 GT4 BB, 512 BB, Testarossa, 512 TR, F512 M) use the new "Flat-12" layout.

## Fiat

- Topolino, 600, Nuova 500, 126 = Hatchback (city cars), rear-engine for 600/500/126. Nuova 500 and 126 use "Inline-2".
- 124 (sedan) lists `brands: ["Fiat","Lada","SEAT"]` (Lada 2101, SEAT 124). 127/131 → SEAT. Panda 1st gen → SEAT. 126 → Polski Fiat. X1/9 → Bertone.
- Doblò 2nd gen → Opel, Vauxhall, Ram (Combo / ProMaster City). Doblò 3rd gen → Citroën, Peugeot, Opel, Vauxhall, Toyota (Berlingo-based).
- Freemont → Dodge (Journey). Fullback → Mitsubishi (L200). Sedici → Suzuki (SX4). Idea → Lancia (Musa). Ulysse → Peugeot, Citroën, Lancia. Tipo 2nd gen → Dodge (Neon).
- 600 2nd gen (600e) = SUV, Hybrid + Electric. Pulse / Fastback = SUV.
- Croma 2nd gen = Wagon. Croma 1st gen = Hatchback / Sedan (liftback).

## Fisker

- Karma = Plug-in Hybrid (range-extender), front-engine generator. Ocean = Electric.

## Genesis

- G80 1st gen (DH) lists `brands: ["Genesis","Hyundai"]` (it began life as the 2015–16 Hyundai Genesis sedan).
- Electrified G80 and Electrified GV70 are separate entries from their gas versions (separate model names in the master list).
- GV80 Coupe = SUV.

## GMC

- Nearly every GMC truck/SUV/van lists `brands: ["GMC","Chevrolet"]` (Sierra, Yukon, Yukon XL, Jimmy, Sonoma, Canyon, Safari, Savana, Vandura, Sprint, Caballero). Sonoma 2nd gen and Canyon 1st gen also list Isuzu.
- Acadia, Terrain and Envoy are GMC-only. Their Chevy/Buick/Saturn siblings look different.
- Syclone = Pickup / Pickup and Typhoon = SUV / SUV (performance trucks). Tell me if you want either as "Muscle Car" or "Sports Car".
- Hummer EV Pickup and Hummer EV SUV = "Off-Road" class, `brands: ["GMC"]` only (sold as "GMC Hummer EV").

## Honda

- Civic 1st–7th gen = Hatchback. Civic 8th–11th gen = Sedan (the US-market body). Type R = Hot Hatch (all gens, including the FD2 sedan, which shares its entry with the FN2 hatch).
- Prelude 4th–6th gen, CR-X, S2000, S500/S600/S800, Beat, S660 = "Sports Car". Prelude 1st–3rd gen = Coupe.
- Integra, Legend and NSX list `brands: ["Honda","Acura"]`. Legend 2nd gen also lists Daewoo (Arcadia). Passport 1st/2nd gen list Isuzu (Rodeo).
- CR-V 6th gen includes the e:FCEV fuel-cell plug-in, so its fuel types are Gasoline, Hybrid, Plug-in Hybrid and Hydrogen.
- Clarity covers all three versions (EV, plug-in hybrid, fuel cell) in one entry.
- Hybrid e-CVT gearboxes = "CVT".
- N-Box (kei) = Hatchback.

## Hyundai

- Nexo = Hydrogen, `engine_position: null`.
- i20 N, i30 N, Veloster N = "Hot Hatch". Elantra N = Sedan. Kona N and Ioniq 5 N = SUV.
- Ioniq 5 = SUV (crossover). Ioniq 6 = Sedan and includes the Ioniq 6 N (up to 641 hp).
- Mitsubishi-licensed models list Mitsubishi: Excel/Presto, Grandeur 1st/2nd gen, Galloper, Equus 1st gen. Entourage → Kia (Sedona). Genesis sedan 2nd gen → Genesis.
- Starex/H-1 and Staria = Minivan (passenger versions).

## Hummer

- All = SUV / Off-Road, 4WD (H3T = Pickup / Off-Road). `manufacturer_still_active: false` (the brand now lives on as GMC Hummer EV).

## Hennessey

- Venom GT and all Venom F5 versions = "Hypercar", mid-engine.
- Modified trucks list the donor brand: VelociRaptor → Ford, Goliath / Exorcist → Chevrolet, Mammoth → Ram. Exorcist = Muscle Car.

## Holden

- `country_of_origin: "Australian"` (new value). `manufacturer_still_active: false`.
- Monaro (all gens) = "Muscle Car". Kingswood, Commodore, Torana, Statesman = Sedan.
- Commodore 4th gen (VE–VF) lists Chevrolet + Vauxhall (SS / Caprice / VXR8). Commodore ZB lists Opel, Vauxhall, Buick (Insignia / Regal). Monaro V2 lists Pontiac + Vauxhall (GTO / Monaro).
- Isuzu-based models list Isuzu: Gemini, Jackaroo, Rodeo, Colorado RC. Early Astras list Nissan (Pulsar).
- Barina is one catch-all row covering several unrelated generations (Suzuki-, Opel-, Daewoo- and Chevrolet-based). Tell me if you want it split.
- Sandman = Van (panel van).

## HSV

- Every HSV lists `brands: ["HSV","Holden"]`, except the Camaro and Silverado, which list Chevrolet.
- ClubSport, GTS, Senator, Grange, W427, GTSR W1 = Sedan / Sedan. Coupe GTO/GTS and Camaro = Muscle Car. Maloo = Pickup Truck. Avalanche XUV = Wagon.

## Infiniti

- Most Infinitis list `brands: ["Infiniti","Nissan"]` (sold as Nissans in Japan: Q45/President/Cima, G35/Skyline, M/Fuga, QX56/QX80/Armada/Patrol, QX4/Pathfinder, G20/Primera, I30/Cefiro, Q50/Skyline V37, etc.). FX, QX50 J55, QX55, QX60, Q40, Q60 and Q30 list Infiniti only.
- Q60 2nd gen = Coupe / Coupe (not Sports Car), even the 400 hp Red Sport.
- VC-Turbo CVT models (QX50/QX55) = "CVT".

## Isuzu

- Trooper 2nd gen: `brands: ["Isuzu","Acura","Honda","Holden","Opel","Vauxhall"]` (SLX, Horizon, Jackaroo, Monterey).
- Rebadges in `brands`:
  - Rodeo → Honda (Passport)
  - Hombre / i-Series → Chevrolet, GMC
  - Ascender → GMC (Envoy)
  - D-Max 3rd gen → Mazda (BT-50)
  - Faster/P'up, Gemini, Trooper 1st gen, D-Max 1st gen → Holden
  - Faster 1st/2nd gen → Chevrolet (LUV)
- Trooper, Amigo, VehiCROSS = SUV / Off-Road. Rodeo, Axiom, Ascender, MU-X = SUV / SUV.

## Jeep

- Wrangler, CJs, Willys MB, original Cherokee SJ, Jeepster Commando, Recon = SUV / "Off-Road". Grand Cherokee, Compass, Renegade, Wagoneer and the rest = SUV / SUV.
- The 1948–50 Jeepster (a RWD phaeton) = body Convertible, class SUV. Early Willys-era models list `brands: ["Jeep","Willys"]`.
- Gladiator (JT) = Pickup / Pickup Truck, not Off-Road. CJ-8 Scrambler = Pickup / Off-Road.
- Cherokee numbering follows Jeep's official count, so KL is the 5th gen. KJ/KK (the Liberty) are the missing 3rd/4th gens and live under "Liberty".

## Jaguar

- E-Type Series 1/2 = Coupe (Series 3 = Convertible, the V12 roadster is the best-known). Pre-war SS 100 lists `brands: ["Jaguar","SS"]`.
- XJ Series 1 through X308, plus the 420, list Daimler as a twin badge.
- XJ220 = "Supercar". C-Type / D-Type / XKSS = Convertible / Sports Car (racing-derived roadsters).
- Supercharged Jaguar V6/V8 engines use the new "Supercharged" aspiration value.

## Kia

- EV6, EV9, EV5, EV3, Niro = SUV. EV4 = Sedan. PV5 = Van.
- Stinger = Sedan / Sedan (not Sports Car).
- Rebadges in `brands`:
  - Pride → Ford, Mazda (Festiva / 121)
  - Elan → Lotus
  - Sedona 2nd gen → Hyundai (Entourage)
  - Optima 1st gen → Hyundai
- Soul = Hatchback.

## Koenigsegg

- CC8S and CCR = "Supercar". CCX onward = "Hypercar".
- Gemera includes both the original 3-cylinder TFG and the later HV8 V8, so `engine_layouts` = `["Inline-3","V8"]` and it's a Plug-in Hybrid.
- Jesko hp range covers gasoline vs E85 ratings.

## KTM

- `country_of_origin: "Austrian"` (new value).
- X-Bow and X-Bow GT = Convertible / Sports Car (open-top). GT4 and GTX are track cars (Coupe / Sports Car). GT-XR (road-legal, closed) = "Supercar".

## Lexus

- Japan-market Toyota twins list `brands: ["Lexus","Toyota"]`: LS 1st–3rd (Celsior), ES 1st–4th (Camry Prominent/Windom), SC (Soarer), GS 1st/2nd (Aristo), IS 1st (Altezza), RX 1st/2nd (Harrier), LX 1st/2nd and GX (Land Cruiser / Prado), LM 1st gen (Alphard).
- IS F and RC F = "Sports Car" (IS F is body Sedan). GS F is folded into GS 4th gen. LC = Sports Car. SC = Coupe.
- LFA = "Supercar", front-engine.
- Hybrid e-CVT = "CVT". The LBX includes the manual Morizo RR.

## Lamborghini

- **Class rule:**
  - "Supercar": Miura, Countach (LP400–25th), Diablo, Murciélago, Gallardo, Aventador, Huracán, Reventón, Sesto Elemento, Revuelto, Temerario
  - "Hypercar": Veneno, Centenario, Sián, Countach LPI 800-4, Fenomeno
  - "Sports Car": 350 GT, 400 GT, Islero, Jarama, Urraco, Silhouette, Jalpa
  - Espada = Coupe. LM002 = SUV / Off-Road. Urus = SUV.
- Silhouette and Jalpa = body Convertible (targa tops).

## Lincoln

- Personal-luxury coupes (Continental Mark II–VI, Mark VII/VIII) = Coupe / Coupe.
- Continental Mark II lists `brands: ["Lincoln","Continental"]` (it was sold under the short-lived Continental marque).
- Blackwood and Mark LT list Ford (F-150-based pickups). Navigator is Lincoln-only (it looks different from the Expedition).
- 1st gen Continental (1939–48) = Convertible / Coupe.

## Lotus

- Every Lotus = "Sports Car" except the Esprit V8 era (3rd gen) and Evija. Esprit 3rd gen = "Supercar", Evija = "Hypercar", Eletre = SUV, Emeya = Sedan.
- Elise, Seven, Eleven, 340R, 2-Eleven, 3-Eleven, Elan = Convertible (open). Exige, Europa, Evora, Emira, Esprit = Coupe.
- Elan M100 (FWD, Isuzu engine) lists `brands: ["Lotus","Kia"]` (Kia built it as the Kia Elan).
- Elite Type 75 = body Hatchback (shooting brake).

## Land Rover

- Series I–III, Defender (both gens) and Discovery 1st/2nd gen = SUV / "Off-Road". Range Rover, Range Rover Sport, Discovery 3rd–5th gen, Freelander, Evoque, Velar, Discovery Sport = SUV / SUV.
- Discovery 3 and 4 keep their LR3/LR4 US names in the model field.

## Lucid

- Air = Sedan (up to 1,234 hp with the Sapphire). Gravity = SUV.

## Lancia

- Stratos, Rally 037, Fulvia coupe, Aurelia, Beta Montecarlo = "Sports Car". Delta HF Integrale = "Hot Hatch". Other Deltas = Hatchback.
- Thema 1st gen includes the Ferrari-engined 8.32.
- Pre-war Lambda/Aprilia and the Fulvia use the "V4" layout.
- Chrysler rebadges list Chrysler (Thema 2nd gen = 300, Flavia 2nd gen = 200 convertible, Voyager = Town & Country + Dodge). The MPVs (Zeta, Phedra) list Peugeot, Citroën, Fiat. Y10 lists Autobianchi.
- Ypsilon 4th gen includes the HF electric hot hatch (up to 276 hp) but stays class Hatchback.

## Lada

- `country_of_origin: "Russian"` (new value).
- 2101 lists `brands: ["Lada","Fiat"]` (licensed Fiat 124). Niva Travel lists Chevrolet (Chevrolet Niva). Largus lists Dacia (Logan MCV).
- Niva = SUV / Off-Road, 4WD.
- 2102 and 2104 = Wagon.

## Mercedes-Benz

- Non-AMG model rows include the smaller AMG trims that aren't their own rows in your list (e.g. C 43 / C 32 / C 55 inside C-Class, A 35 inside A-Class, GLA 45 inside GLA, G 55 / G 65 inside G-Class 2nd gen, GL 63 inside GL / GLS, SL 65 inside SL 6th gen, CLK 63 inside CLK 2nd gen). That pushes max hp up on those rows. The AMG models that ARE their own rows (C 63, E 63, etc.) are excluded from the base model.
- Maybach-badged versions (S 680, EQS 680 SUV, GLS 600) are left out of the Mercedes rows; they belong under Maybach.
- B-Class = Hatchback / Hatchback (not Minivan). R-Class and V-Class / Viano = Minivan.
- CLA 3rd gen (2025) carries both the EV and the 1.5 hybrid, so engine_position is Front-engine with both "Electric" and "Inline-4" layouts.
- SLR McLaren = Coupe / "Supercar", front-engine. SL (all) and SLK = Convertible / Sports Car. CL, CLK, CLE = Coupe / Coupe.
- G-Class 1st–3rd gen and G 580 EQ = SUV / "Off-Road". X-Class pickup does NOT list Nissan (Navara-based but restyled).
- Mild hybrids (MHEV / EQ Boost) count as Gasoline, not Hybrid.

## Mercedes-AMG

- AMG sedans (C 63, E 63, S 63, AMG GT 4-Door) = Sedan / Sedan, matching the M5 rule. Coupes / roadsters (AMG GT, SL 55/63/65/73, Black Series) = "Sports Car". SLS = "Supercar". CLK GTR and AMG ONE = "Hypercar".
- A 45 = Hatchback / "Hot Hatch". CLA 45 = Sedan / Sedan.
- SLS AMG includes the SLS Electric Drive (740 hp), so fuel = Gasoline + Electric.
- SL 63 2nd gen includes the 2024 SL 63 S E Performance (805 hp, plug-in).

## Mazda

- Rotary engines use layout "Rotary" with cylinders null; displacement is the rotor-chamber number Mazda quotes (e.g. 1308 cc for the 13B). Eunos Cosmo includes the 3-rotor 20B.
- **New value needed:** R360's air-cooled V-twin uses layout `"V2"` (not on your list). Swap to "Inline-2" if you'd rather not add it.
- Skyactiv-X = "Supercharged" (it has a small supercharger). 626 4th gen 2.0 Comprex diesel = "Supercharged" (pressure-wave).
- Mazda2 (DJ) lists Toyota and Scion (Yaris iA / Scion iA sedan). Mazda5 2nd gen lists Nissan (Lafesta). Navajo lists Ford (2-door Explorer). Tribute and BT-50 do NOT list Ford/Isuzu (restyled siblings).
- Mazdaspeed3 = "Hot Hatch". RX-7, RX-8, MX-5, MX-3, Cosmo Sport = "Sports Car". MX-6, Cosmo, Eunos Cosmo, RX-3, R100 = Coupe.
- CX-6e and EZ-6 / 6e are Changan-built in China but Mazda-badged, so they stay (Japanese brand). Flag if you want them out.
- MX-30 includes the rotary range-extender R-EV, so it's Front-engine with Electric + Rotary layouts.

## McLaren

- Everything is mid-engine. Sports/Super Series (12C through 750S, GT, GTS, Artura) = "Supercar". F1, P1, Senna, Elva, Speedtail, Solus GT, W1 = "Hypercar".
- P1 and Artura = Plug-in Hybrid. Speedtail and W1 = Hybrid.

## Mitsubishi

- Lancer Evolution I–X = Sedan / "Sports Car" (matches the M3 5th/6th gen rule).
- Rebadges listed in `brands`: 3000GT (Dodge Stealth), Eclipse 1st gen (Plymouth Laser, Eagle Talon), Eclipse 2nd gen (Eagle Talon), Starion (Chrysler/Dodge/Plymouth Conquest), Mirage 1st gen and Lancer/Mirage 4th–5th gen (Dodge/Plymouth Colt, Eagle Summit), Expo (Eagle Summit Wagon, Plymouth Colt Vista), L200 1st–2nd gen (Dodge Ram 50), L200 5th gen (Fiat Fullback, Ram 1200), L200 6th gen (2025 Nissan Navara), Pajero 1st gen (Dodge Raider), Raider (Dodge Dakota), i-MiEV (Peugeot iOn, Citroën C-Zero), Outlander 2nd gen (Peugeot 4007, Citroën C-Crosser), Outlander Sport/ASX (Peugeot 4008, Citroën C4 Aircross), ASX 2nd gen and Colt 2nd gen (Renault Captur / Clio), Xpander (Nissan Livina). "Eagle" isn't a brand in your list but is included as a badge.
- The "Galant 2nd–5th gen" catch-all row is generation 2 and spans RWD and FWD cars.
- Pajero / Montero 1st–4th gen and Pajero Sport = SUV / "Off-Road". Pajero iO / Pinin = SUV / SUV.

## Maserati

- Bora, Merak, Ghibli 1st/2nd gen, Khamsin, GranTurismo, etc. = "Sports Car". MC20 and MCPura = "Supercar". MC12 = "Hypercar".
- GranTurismo / GranCabrio 2nd gen and Grecale include the Folgore EVs, so fuel = Gasoline + Electric.
- Ghibli/Levante 2.0 "Hybrid" is a 48V mild hybrid, listed as Gasoline.
- Quattroporte 2nd gen (Citroën SM V6, ~13 built) is FWD.

## Mini

- Cooper S, JCW and GP versions stay inside each Cooper / Hatch generation, so the class is Hatchback (not Hot Hatch) and max hp includes the GP (up to 302 hp on 3rd gen).
- Convertible = Convertible / Hatchback (there's no convertible class). Coupé and Roadster (R58/R59) = "Sports Car". Clubman = Wagon. Aceman, Countryman, Paceman = SUV.
- Classic Mini and Mini Moke list `brands: ["Mini","Austin","Morris"]` (sold as Austin and Morris before Mini became its own badge). Austin and Morris aren't brands in your list.
- Mini Moke = Convertible / "Off-Road" (utility buggy). Flag if you'd rather call it Hatchback.
- Aceman is built in China (Spotlight JV) but kept since Mini isn't a Chinese brand.

## Maybach

- Model names kept as "Mercedes-Maybach ..." per your list. No `brands` cross-listing with Mercedes-Benz (distinct badge and styling).
- W3 and Zeppelin are pre-war; horsepower is approximate.

## Mercury

- Matches the Ford side: every near-identical Ford twin lists `brands: ["Mercury","Ford"]` (Sable, Grand Marquis 2nd–4th, Mountaineer, Mariner (+Mazda), Milan, Mystique, Topaz, Bobcat, Zephyr, LN7, Lynx, Tracer, Monarch, Montego 2nd gen, Monterey minivan, Capri 1st/2nd gen, Cougar 8th gen). Villager lists Nissan (Quest).
- Cougar 2nd–7th gen do NOT list Ford (Thunderbird/Torino-based but restyled), same as the Ford side.
- Cougar 1st–2nd gen, Cyclone, Marauder (all three gens), Capri 1st gen = "Muscle Car". Later Cougars = Coupe.
- Comet, Marquis, Monterey, Montclair, Park Lane are single long rows covering several redesigns, so their hp ranges are wide.

## MG

- MG is kept even though SAIC owns it (British brand). Newer MGs (MG4, ZS, HS, Cyberster, Comet EV, Windsor EV, etc.) are built in China or India. Flag if you'd rather drop the SAIC-era models.
- Midget lists Austin-Healey (Sprite twin).
- Metro and ZR = "Hot Hatch". MGF and TF 2nd gen = mid-engine, CVT option. XPower SV = "Supercar".
- MG5 2nd gen = Wagon (the EV estate) and includes the petrol sedan sold in some markets.

## Morgan

- All open cars = Convertible / Sports Car. Aero Coupé = Coupe.
- 3 Wheeler (2011) and the original Three-Wheeler use the new "V2" layout (V-twin); Super 3 uses a Ford 3-cylinder.
- 4/4 and Plus 4 1st run are long rows spanning many engines.

## Mosler

- Consulier GTP, Raptor, Intruder = Sports Car. MT900 / MT900S = "Supercar". All mid-engine, manual.

## Nissan

- Infiniti twins list `brands: ["Nissan","Infiniti"]`, matching the Infiniti side: Skyline 11th–13th gen (G35/G37/Q50), Maxima 4th–5th gen (I30/I35), Primera 1st–2nd gen (G20), Pathfinder 2nd gen (QX4), Patrol 5th–6th gen and Armada (QX56/QX80).
- Other rebadges: Quest 1st–2nd gen (Mercury Villager), Navara 2nd gen (Renault Alaskan), NV200 (Chevrolet City Express), Sakura (Mitsubishi eK X EV). Maxima 1st gen, Sentra 1st gen, Stanza and 300ZX 3rd gen list Datsun (sold under the Datsun badge in early years).
- Skyline GT-R R32/R33/R34 are all listed at the official 276 hp ("gentlemen's agreement" rating). Nismo specials (400R, Z-tune) are not included.
- GT-R (R35) = Coupe / "Supercar". R390 GT1 = "Hypercar". Skyline GT-R, 180SX, Silvia, Z cars = "Sports Car". Pulsar GTI-R = "Hot Hatch".
- Pathfinder 1st gen, Patrol (all), Xterra = SUV / "Off-Road". Later Pathfinders, Armada, Terra = SUV / SUV.
- e-Power cars (Note 2nd/3rd gen, Kicks 1st gen, Qashqai 3rd gen, X-Trail 4th gen) = Hybrid. Murano 3rd gen / Pathfinder 4th gen / Rogue 2nd gen hybrids use a supercharged 2.5 / 2.0.
- Rogue 3rd gen includes the 2026 Rogue Plug-in (Mitsubishi Outlander PHEV powertrain).
- Leaf 3rd gen = SUV body (it became a crossover). Cube and Note = Hatchback. Figaro = Convertible / Hatchback. S-Cargo and NV = Van.
- Navara (D40) and Frontier (D40) are separate rows in your list, so they're kept separate here too.

## Opel

- Vauxhall twins list `brands: ["Opel","Vauxhall", ...]` for essentially every model from the Kadett D / Ascona C onward. Other badges where near-identical: Holden (Astra, Vectra, Calibra, Tigra, Corsa, Zafira, Insignia, Cascada), Buick (Insignia → Regal, Cascada, Mokka → Encore), Chevrolet (Ampera → Volt, Ampera-e → Bolt, Karl → Spark, Corsa B), Saturn (Astra H, Antara → Vue), Cadillac (Omega B → Catera), Isuzu (Frontera A/B), Suzuki (Agila), Daewoo/Pontiac (Kadett E → LeMans), Citroën (Rocks-e → Ami).
- OPC / GSi / GSE performance versions stay inside their model row (e.g. Astra J up to 276 hp, Insignia A OPC 321 hp). Omega 1st gen includes the 372 hp Lotus Omega.
- Calibra, Manta, GT, Speedster = "Sports Car". Speedster is mid-engine. Cascada and Tigra = Coupe class (matching the Buick Cascada).
- Rekord, Kapitän, Olympia and Diplomat are single long rows with wide hp ranges.
- Frontera 1st/2nd gen = SUV / "Off-Road". Frontera 3rd gen (2024) = SUV / SUV.

## Oldsmobile

- GM US siblings (Alero/Grand Am, Cutlass 5th gen/Malibu, Silhouette/Venture, Bravada/TrailBlazer) do NOT cross-list, matching the Chevrolet/Pontiac side.
- 442 = Coupe / "Muscle Car". Toronado, Cutlass, Starfire = Coupe / Coupe.
- 88 / Delta 88, 98, Custom Cruiser, Vista Cruiser, F-85 are long catch-all rows (some span 50 years), so hp and drivetrain cover RWD and FWD eras.
- 98 uses the "Inline-8" layout for the pre-war straight-8. Curved Dash uses "Single-cylinder" and is mid-engine (under the seat), body Convertible / class Sedan, matching the Model T.

## Porsche

- 911 (all gens), 356, 912, 959 = rear-engine. Boxster, Cayman, 718, 914, 904, 550, 918, Carrera GT = mid-engine. 924/944/968/928 and the SUVs/sedans = front-engine.
- Turbo, GT2, GT3 and RS versions stay inside each 911 generation, so max hp includes them (e.g. 997 up to the 611 hp GT2 RS, 992 up to the 701 hp Turbo S T-Hybrid). Class stays "Sports Car" for every 911.
- 959 = "Supercar". 918 Spyder and Carrera GT = "Hypercar" (Carrera GT matches the Enzo).
- 914 lists `brands: ["Porsche","Volkswagen"]` (VW-Porsche 914).
- Cayenne Electric's 1,139 hp is the Turbo's launch-control overboost figure. Taycan's 1,019 hp is the Turbo GT overboost.
- Panamera, Taycan = Sedan / Sedan.

## Pagani

- Every Pagani = "Hypercar", mid-engine, RWD. Huayra R uses Pagani's own naturally aspirated V12; everything else uses AMG V12s.

## Polestar

- Kept as a Swedish brand. Polestar 1 = Coupe / Sports Car, plug-in hybrid. Polestar 2 = Hatchback body / Sedan class (liftback). Model names are just "1"–"5", so IDs are `polestar-1-g1` etc.

## Peugeot

- Rebadges listed in `brands`: 104 (Citroën LN), 107/108 (Citroën C1, Toyota Aygo), iOn/4007/4008 (Mitsubishi + Citroën), 806/807 (Citroën, Fiat, Lancia), Rifter (Berlingo family incl. Opel, Vauxhall, Toyota).
- GTi / RC / PSE versions stay inside their model row (205 GTI, 208 GTi, 308 GTi, 508 PSE). Class stays Hatchback/Sedan. The 205 T16 homologation car is NOT included.
- HYbrid4 (3008 1st gen, 5008 1st gen, 508 1st gen) = diesel-electric "Hybrid". 2024+ 48V MHEV models count as Gasoline.
- 408 (2022) = Hatchback (fastback crossover). Landtrek pickup is Changan-built but Peugeot-badged.

## Plymouth

- Matches the Dodge side: every Dodge twin lists `brands: ["Plymouth","Dodge", ...]` (Acclaim/Spirit, Caravelle/600, Duster/Demon, Gran Fury/Diplomat, Horizon/Omni, TC3/024, Neon, Reliant/Aries, Sundance/Shadow, Trailduster/Ramcharger, Volaré/Aspen, Voyager/Caravan). Breeze lists Chrysler and Dodge (Cirrus/Stratus). Laser lists Mitsubishi and Eagle. Arrow lists Mitsubishi. Prowler lists Chrysler.
- Barracuda, 'Cuda, Duster, GTX, Road Runner, Superbird = Coupe / "Muscle Car". Belvedere, Satellite, Fury, Savoy = Sedan (long rows covering several redesigns).

## Pontiac

- GM US siblings with different styling are NOT cross-listed (Grand Am/Alero, Sunfire/Cavalier, Montana/Venture, Solstice/Sky, Astre/Vega, T1000/Chevette, Phoenix/Citation). Near-identical ones are: G3 (Aveo), G5 (Cobalt), Torrent (Equinox), GTO 4th gen (Holden Monaro, Vauxhall Monaro), G8 (Holden Commodore VE), LeMans 2nd gen (Daewoo LeMans / Opel Kadett E), Vibe 1st gen (Toyota Voltz in Japan).
- Note: the Holden Commodore VE row doesn't list Pontiac yet; tell me if you want me to add it for symmetry.
- Firebird / Trans Am (all gens), GTO = "Muscle Car". Fiero = mid-engine Sports Car. Solstice = Convertible / Sports Car.
- Bonneville 1st gen, Catalina, Chieftain, Star Chief, Tempest, LeMans 1st gen are long catch-all rows. Chieftain and Star Chief use "Inline-8" for the straight-eights.

## Rivian

- **Least certain:** EDV van hp (300–400) and R2 hp (350–650) are estimates; Rivian hasn't published firm numbers for every version. R1S/R1T 2nd gen top out at 1,025 hp (Quad).
- R1T = Pickup Truck / Pickup Truck. R1S, R2 = SUV. EDV = Van.

## Ram

- 1500 4th gen (2009–2018) lists `brands: ["Ram","Dodge"]` because it launched as the Dodge Ram (matches the Dodge side).
- 1500 TRX = Pickup / "Off-Road". 1500 RHO (2025) is inside 1500 5th gen (up to 540 hp).
- ProMaster lists Fiat, Citroën and Peugeot (Ducato / Jumper / Boxer). ProMaster City and ProMaster EV list Fiat.
- eTorque mild hybrids = Gasoline.

## Renault

- Rebadges listed: 12 (Dacia 1300), 21 (Eagle Medallion), Captur 2nd gen and Clio 5th gen (Mitsubishi ASX / Colt), Kangoo (Nissan Kubistar; Mercedes-Benz Citan and Nissan NV250/Townstar on 2nd/3rd gen). Renault Samsung (Korean) twins are not listed.
- RS / Gordini / Williams / GT Turbo versions stay inside their model rows. Mégane RS has its own rows per your list = "Hot Hatch". 5 Turbo and Clio V6 = mid-engine "Hot Hatch".
- Rear-engine: 4CV, Dauphine, Floride/Caravelle, 8, 10, Twingo 3rd gen.
- Crossover EVs (4 E-Tech, Mégane E-Tech, Scénic E-Tech) and Espace 6th gen = SUV.
- Twizy = Convertible / Hatchback (quadricycle). Wind = Convertible / Sports Car.
- Twingo E-Tech (2026) hp is an estimate.

## Rimac

- `country_of_origin: "Croatian"` (new value, added to the list above). All three = "Hypercar". Nevera 1,888 hp, Nevera R 2,078 hp.

## Rolls-Royce

- Bentley twins list `brands: ["Rolls-Royce","Bentley"]`, matching the Bentley side: Silver Dawn (Mk VI/R-Type), Silver Cloud (S1–S3), Silver Shadow (T-Series), Corniche 1st gen, Silver Spirit/Spur (Mulsanne/Eight).
- **Least certain:** Rolls-Royce didn't publish horsepower ("adequate") until the late 1990s, so pre-1998 figures (Phantom I–VI, Silver Ghost, Silver Shadow, Camargue, etc.) are period estimates.
- Corniche, Dawn, Phantom Drophead = Convertible / Coupe. Wraith 2nd gen, Spectre, Camargue = Coupe. Pre-war Wraith (1938) = Sedan.

## RUF

- No Porsche cross-listing (RUF is its own manufacturer). CTR, CTR2, CTR3, CTR Anniversary, Rt 12 = "Supercar"; the rest = Sports Car. CTR3 is mid-engine; everything else rear-engine.
- RCT and RGT hp are the least certain RUF numbers.

## Subaru

- All boxer engines use the "Flat-4" / "Flat-6" layouts.
- WRX (non-STI) versions stay inside Impreza 1st–3rd gen (like your list). Standalone WRX, WRX STI and Impreza WRX STI rows = Sedan / "Sports Car" (matches the Lancer Evo rule). Impreza WRX STI 3rd gen = Hatchback body.
- Toyota twins list Toyota: BRZ (GR86 / 86; 1st gen also Scion FR-S), Solterra (bZ4X), Trailseeker and Uncharted (2026 Toyota EV twins). Impreza 2nd gen lists Saab (9-2X).
- Outback 1st–6th gen = Wagon. Outback 7th gen (2025) = SUV (it became a boxy SUV). Baja and BRAT = Pickup Truck.
- e-Boxer mild-ish hybrids and the 2025+ Strong Hybrid = Hybrid. Justy 1st gen = CVT (first ECVT car).
- **Least certain:** Trailseeker, Uncharted and 2026 Crosstrek/Forester hybrid hp.

## Suzuki

- Rebadges listed: Swift/Cultus 1st–2nd gen (Chevrolet Sprint/Metro, Geo Metro, Pontiac Firefly, Holden Barina), Vitara/Sidekick (Geo/Chevrolet Tracker), Grand Vitara 2nd gen (Chevrolet Tracker), Forenza/Reno/Verona (Daewoo/Chevrolet), Equator (Nissan Frontier), SX4 (Fiat Sedici), Splash and Wagon R (Opel/Vauxhall Agila), Ignis 1st gen (Chevrolet Cruze JDM, Subaru Justy), and the Toyota deals (Across, Swace, Baleno, Brezza, Ertiga, Fronx, Grand Vitara India, e Vitara).
- Jimny (all), Samurai = SUV / "Off-Road". Hustler = SUV (kei crossover). Cappuccino = Convertible / Sports Car.
- Alto and Wagon R are single long rows (1979– and 1993–) spanning kei and export versions.
- SHVS / BoosterJet MHEV = Gasoline; Swift 6th gen (Japan strong hybrid) and S-Cross 2nd gen / Vitara 4th gen Full Hybrid = Hybrid.

## Scion

- Every Scion lists its Toyota twin: FR-S (also Subaru BRZ), iA (Mazda2 sedan), iM (Auris), iQ, tC 2nd gen (Zelas), xA (ist), xB 1st/2nd gen (bB / Corolla Rumion), xD (ist). tC 1st gen had no Toyota twin. Aston Martin Cygnet (iQ-based) is not listed.

## Smart

- Kept as a German brand even though the #1/#3/#5 are Geely-built in China. Flag if you want those three dropped.
- Their model names start with "#", so IDs are `smart-1-g1`, `smart-3-g1`, `smart-5-g1`. (I also fixed my script so lines starting with "#" weren't treated as comments.)
- Fortwo, Forfour 2nd gen, Roadster, Crossblade = rear-engine. Forfour 1st gen (Mitsubishi Colt-based) = front-engine FWD. Fortwo = Hatchback body (the coupe). Roadster = Convertible / Sports Car.

## Saab

- 9-2X lists Subaru (Impreza wagon). 9-7X (TrailBlazer) and 9-4X (Cadillac SRX) don't list GM siblings, matching the GM-twin rule.
- 92, 93, 95, 96, Sonett I/II use two-stroke I2/I3 engines; 95/96/Sonett also use the Ford V4.
- 900, 9000, 9-3 1st gen = Hatchback. Sonett = Sports Car.

## Skoda

- Liftbacks (Octavia, Superb 2nd–4th gen, Rapid) = Hatchback body / Sedan class, same as the Insignia B.
- RS versions stay inside each model row (Octavia RS up to 261 hp, Fabia RS, Kodiaq RS). Class stays Sedan / Hatchback / SUV.
- Citigo lists `brands: ["Skoda","Volkswagen","SEAT"]` (VW up! / SEAT Mii). SEAT isn't a brand in your list. India models (Kushaq, Slavia, Kylaq) don't list VW (restyled twins).
- Rear-engine: 1000 MB, 100/110, 110 R, 105/120/Estelle, Rapid (Garde). Pre-war Popular and the 1959 Octavia = front-engine.

## Studebaker

- Every row is a long catch-all (Commander 1927–1958, Champion 1939–1958, etc.), so hp ranges are wide and pre-war figures are estimates.
- Avanti, Hawks (Golden, Silver, Gran Turismo, Hawk) = Coupe / Sports Car. The R2/R3 Avanti/Lark engines are "Supercharged". Dictator, Land Cruiser and President 1st gen use "Inline-8".
- Studebaker's 1965–66 Canadian cars used Chevrolet engines (listed on Cruiser, Lark, Daytona, Wagonaire).

## Saleen

- No Ford cross-listing; Saleens are re-engineered cars with their own VINs.
- Mustang-based models (Saleen Mustang, S351, S281, S302) = Coupe / "Muscle Car". S7 / S7 Twin Turbo = "Supercar" (Twin Turbo up to 1,000 hp with the competition package). S1 = Sports Car.
- **Least certain:** S302 hp ranges (Saleen's many "Label" trims).

## Saturn

- Astra lists Opel/Vauxhall/Holden; Vue 2nd gen lists Opel/Vauxhall/Chevrolet (Antara / Captiva Sport). Aura, Outlook, Relay, Sky, L-Series don't list their GM siblings (GM-twin rule).
- Green Line (BAS) hybrids on Aura and Vue = Hybrid.
- S-Series = Sedan (also coupe/wagon). Sky = Convertible / Sports Car.

## Spyker

- `country_of_origin: "Dutch"`. Every C8 and C12 = mid-engine "Supercar". C4 (1920s) = Sedan with a Maybach I6.

## Tesla

- Model S = Hatchback body / Sedan class (liftback). Roadster (2008) = Convertible / Sports Car.
- Plaid Model S/X = 1,020 hp. Cybertruck Cyberbeast = 845 hp.
- **Semi** = body/class "Van" (there's no truck class); hp ~1,000 is an estimate. Consider dropping it from the game.

## Toyota

- **Crown split:** the old "1st–15th gen" catch-all row is now 15 separate rows (S30 through S220), so Toyota has 181 rows. The master list and CSV were rebuilt.
- Twins listed in `brands` (matching the other brands' rows): 86/GT86 (Subaru BRZ, Scion FR-S), GR86 (Subaru), bZ4X (Subaru Solterra), Aygo 1st/2nd gen (Peugeot 107/108, Citroën C1), Auris 2nd gen (Scion iM), RAV4 5th gen (Suzuki Across), Corolla 12th gen (Suzuki Swace), Corolla 5th/8th gen (Chevrolet Nova/Prizm), Yaris 4th gen (Mazda2 Hybrid), Hilux 5th gen (VW Taro), and Lexus twins (Soarer 3rd/4th gen = SC, Land Cruiser 80/100 = LX, Prado J120/J150/250 = GX, Alphard 3rd gen = LM).
- GR Yaris, GR Corolla = "Hot Hatch". Supra, Celica, MR2, 86/GR86, 2000GT, AE86 = "Sports Car". Land Cruiser (all), Prado, 4Runner, FJ Cruiser = SUV / "Off-Road".
- MR2, Previa and the TownAce van are mid-engine. Sports 800 uses the "Flat-2" layout.
- Mirai = "Hydrogen". Toyota hybrids (e-CVT) = CVT. Crown 11th gen's THS-M mild hybrid counts as Hybrid.
- bZ3 is built with BYD in China but kept (Toyota brand). Flag if you want it out.
- Supra 5th gen does NOT list BMW (Z4 has a different body).

## TVR

- Every TVR = front-engine RWD Sports Car, manual (Tasmin had an auto option). Wedge-era cars (350i/390SE/450SE) and S Series = Convertible.

## Ultima

- All mid-engine, manual. GTR, Can-Am, Evolution, RS = "Supercar" (RS up to 1,200 hp). Mk1–Mk3, Sports, Spyder = Sports Car. Kit-car hp ranges are wide because buyers choose engines.

## Volkswagen

- Golf R, Golf R32 = "Hot Hatch" (their own rows). GTI versions stay inside each Golf row (class Hatchback), matching how other brands' hot trims were handled when they don't have their own row.
- Twins listed: up! (Skoda Citigo, SEAT Mii), Lupo (SEAT Arosa), Polo 1st gen (Audi 50), Sharan 1st gen (Ford Galaxy, SEAT Alhambra), Sharan 2nd gen (SEAT), Amarok 2nd gen (Ford Ranger), Routan (Dodge/Chrysler). "SEAT" is spelled in caps everywhere (fixed the Skoda Citigo row to match).
- Rear-engine: Beetle (Type 1), Type 2/Vanagon, Type 3, Type 4, Karmann Ghia, Thing. XL1 = mid-engine diesel plug-in hybrid with an "Inline-2".
- Passat 5th gen includes the W8 (uses the "W8" layout). Golf 4th gen / Jetta 4th gen / Passat 5th gen include the V5.
- Passat 9th gen = Wagon (estate-only). T-Roc 2nd gen (2025) hp is an estimate.

## Volvo

- No cross-listing (S40/V40 1st gen's Mitsubishi Carisma twin isn't in your list).
- 340/360 = RWD with the Variomatic CVT (DAF origin). 480 = Coupe class (shooting brake). P1800 = Sports Car.
- Polestar-tuned S60/V60 2nd gen go up to 362 hp; T8 Polestar Engineered up to 455 hp.
- EM90 and ES90 are China-built but Volvo-badged; kept.

## Vauxhall

- Opel twins copy the Opel row's data exactly and list `brands: ["Vauxhall","Opel", ...]`. Mapping: Astra Mk1 = Kadett D, Astra Mk2 = Kadett E, Astra Mk3–Mk8 = Opel Astra F–L, Nova = Corsa A, Cavalier Mk2/Mk3 = Ascona C/Vectra A, Carlton Mk2 = Omega A, Omega = Omega B, Viva 4th gen = Karl, VX220 = Speedster, Belmont = Kadett E sedan, Frontera 1st gen covers both Frontera A and B.
- Vauxhall-only cars (Victor, Viva HA–HC, Cresta/Velox, Chevette, Firenza) have their own data. Carlton Mk1, Cavalier Mk1, Royale, Senator list Opel (Rekord/Ascona/Senator twins). Monaro lists Holden/Pontiac. Monterey lists the Isuzu Trooper family. VXR8 lists HSV/Holden. Sintra lists Opel/Chevrolet (Venture).
- Lotus Carlton = Sedan / Sedan (matches the M5 rule).

## VinFast

- Brand key is "Vinfast" (as in your master list). `country_of_origin: "Vietnamese"`.
- Lux A2.0 / SA2.0 use BMW's 2.0 turbo; President uses a GM 6.2 V8. Fadil (Opel Karl-based) doesn't list Opel (restyled).
- VF 3 (43 hp) is a mini SUV.

## Zenvo

- All = "Hypercar", mid-engine. ST1 is supercharged + turbocharged (listed as "Turbocharged"). Aurora (2025) = V12 hybrid, 1,450–1,850 hp (least certain).

## Review script fixes (first run)

- Lancia Ypsilon 3rd gen: added Diesel to fuel (it lists the 1.3 Multijet).
- VW XL1: fuel is now Diesel + Plug-in Hybrid (diesel PHEV).
- Ford Focus 4th gen and Fiat 500X: removed "Hybrid" (their hybrids are 48V mild hybrids, which count as Gasoline here).
- Added missing diesel engines where fuel already said Diesel: BMW 2 Series Gran Coupé 2nd gen, F-150 14th gen (3.0 Power Stroke, 2021), Jeep CJ-8 (Isuzu 2.4), Comanche (Renault 2.1), Kia Soul 2nd gen (1.6 CRDi).
- Added the hybrid engine to Audi A6 4th gen and Q5 1st gen (2.0 TFSI hybrid).
- Note: GM eAssist (Buick LaCrosse/Regal, Chevy Malibu/Impala) and Saturn Green Line are mild hybrids but stay "Hybrid" because GM sold them as hybrids. Say the word if you want them as Gasoline instead.
- Remaining warnings are judgment calls, not errors: 1,000+ hp cars that aren't "Hypercar" (Corvette ZR1X, SF90, Revuelto, 849 Testarossa, Plaid Teslas, Lucid Air Sapphire, Rivian Quad, Cayenne Electric, Taycan Turbo GT, Hennessey trucks, Ultima), RWD "Off-Road" cars (Ariel Nomad, Mini Moke, VW Thing), and Daewoo Damas showing as still in production under an inactive brand (it's from your master list).
