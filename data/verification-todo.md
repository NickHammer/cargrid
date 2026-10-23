# Verification queue

All 147 cars were filled from model knowledge in the bulk pass (2026-07-13).
The flagged entries were checked against generation-specific Wikipedia articles
on 2026-10-22; what follows is what was decided and what is still open.

## Resolved — decisions applied to cars.json

**Nameplate / generation calls**

- **ford-maverick-g1** — now the 1970–77 compact, replacing the 2022 pickup. Launch price $1,995; 170/200 I6 and 302 V8, 105–210 hp gross; body and class both Sedan (Ford sold it as a 2-door and 4-door sedan, never a coupe).
- **dodge-dart-g4** — now the 1967–76 Dart (was the 2013–16 compact). Renumbered to generation 4, which is what that car actually is; the ID moved from `dodge-dart-g1`. 101–300 hp gross, classed Muscle Car on the GTS/Swinger 340 identity.
- **rolls-royce-phantom-g1** — kept as the 2003 BMW-era Phantom VII. 453 hp, 2003–2016 confirmed.
- **aston-martin-vantage-g1** — kept as the 2005 standalone V8 Vantage; 380 hp, 2005–2017 confirmed.
- **ford-f-150-g1** — kept at 1975–79. The F-150 nameplate began mid-way through the sixth-generation F-Series, so generation numbering here follows the *nameplate*, not the F-Series platform. F-250/F-350 stay dated to their 1953 naming for the same reason.
- **mercedes-benz-e-class-g1** — kept as the W124 (1984). The "E-Class" name arrived with the 1993 facelift, but the W124 is universally read as the first E-Class.
- **bmw-m5-g1** — confirmed E28 (1984–88), 256 hp US / 286 hp EU.
- **chevrolet-impala-g1** — confirmed 1958 as a one-year generation (Bel Air Impala); 1959 began the standalone nameplate.
- **chevrolet-malibu-g1** — kept as Muscle Car. Same rule now applied to the Dart: a nameplate is classed Muscle Car when its performance variant is the car's defining identity in enthusiast culture (Chevelle SS, Dart GTS).

**Launch years — the rule is global launch, not US launch**

- bmw-i3-g1 corrected to 2013 (production began September 2013).
- nissan-kicks-g1 corrected to 2016 (Brazil launch; US 2018).
- Confirmed as already correct: toyota-prius-g1 (1997 JP), toyota-yaris-g1 (1999), honda-fit-g1 (2001 JP), audi-a3-g1 (1996 EU), chevrolet-cruze-g1 (2008), chevrolet-trax-g1 (2013).

**Engine ranges — US-market figures widened to the launch line-up**

- audi-a4-g1 → 90–174 hp, fuel now Gasoline + Diesel (1.9 TDI was a launch engine).
- audi-a6-g1 → 90–174 hp, added the 2.5 TDI inline-5, quattro (AWD) and Diesel.
- audi-a8-g1 → min 174 hp (2.8 V6 base); quattro corrected from 4WD to AWD.
- audi-q7-g1 → min 233 hp, fuel now Gasoline + Diesel (3.0 TDI at launch).
- porsche-macan-g1 → min 258 hp, fuel now Gasoline + Diesel (S Diesel at launch).
- toyota-c-hr-g1 → 116–122 hp, FWD + AWD, Manual + CVT, Gasoline + Hybrid (global 2016 line-up; the US-only 2.0 144 hp arrived in 2018).
- lincoln-continental-g1 → fuel corrected to Gasoline only; the 1939 V12 was never a diesel.

**Rebadges and launch-era branding** (the multiple-brands rule)

- acura-nsx-g1 → brands `["Acura", "Honda"]` (Honda NSX outside North America).
- honda-passport-g1 → brands `["Honda", "Isuzu"]` (rebadged Isuzu Rodeo).
- nissan-maxima-g1 → brands `["Nissan", "Datsun"]` (launched as the Datsun 810 Maxima).

**Spot-checked and confirmed as already correct**

toyota-crown-g1 (1955 Toyopet Crown, 48 hp) · toyota-land-cruiser-g1 (1951 BJ, 85 hp) ·
toyota-yaris-g1 (68–106) · toyota-prius-g1 (70 hp system) · honda-cr-v-g1 (126) ·
honda-accord-g1 (68–72, launch body Hatchback) · ford-transit-g1 (43–85) ·
ford-taurus-g1 (90–140; Manual via the MT-5) · ford-f-250/f-350-g1 (101–130 gross) ·
chevrolet-suburban-g1 (60–85) · chevrolet-blazer-g1 (155–255 gross) ·
chevrolet-silverado-g1 (gasoline only at the 1999 GMT800 launch; Duramax came 2001) ·
dodge-charger-g1 (230–425 gross) · subaru-impreza-g1 (110–240 incl. JDM WRX) ·
subaru-legacy-g1 (160 turbo) · subaru-forester-g1 (165) · nissan-frontier-g1 (143–170) ·
bmw-m6-g1 (256–286) · bmw-x1-g1 (143–258) · mercedes-benz-s-class-g1 (160–225 DIN) ·
mercedes-benz-g-class-g1 (72–156) · jaguar-f-type-g1 (340–495, launch body Convertible) ·
tesla-model-s-g1 (302–416) · pagani-huayra-g1 (720 hp, 2012–2018) · mazda-rx-7-g1 (100–115) ·
toyota-supra-g1 (110, A40) · nissan-maxima-g1 (diesel LD28 was genuinely offered)

## Still open

- **mercedes-benz-amg-gt-g1 class.** Kept as Sports Car rather than Supercar: the base C190 GT is 456 hp, and it is a direct 911 rival — and porsche-911-g1 is Sports Car. The 500+ hp tiebreaker would flip it on the GT S alone. Revisit if the class mix needs it.
- **No `Van` value in the frozen `car_class` enum.** `chevrolet-express-g1` and `ford-transit-g1` are full-size vans currently forced into `Minivan`, which pollutes a class that otherwise holds five actual people-carriers. Adding `Van` means editing the frozen enum, so it is left as a product decision.
- **Non-enum engine layouts with thin coverage.** `V4` (Transit), `Inline-3` (i8), `W16` (Chiron), `Rotary` (RX-7) each have one car; `Inline-5` has two. The grid generator already gates on an 8-car minimum, so none of these can reach an axis — no action needed unless the dataset grows.
- **bmw-i3-g1 range extender.** Recorded as Electric only. The REx variant carries a petrol generator, but surfacing the i3 as an answer to a Hybrid parameter would surprise players; revisit if a PHEV distinction is ever added.
- **price_at_launch_usd is null for 138 of 147 cars** and `pop_culture` is set on one. Both parameters are therefore gated out of grid generation by the 8-car support minimum. They become usable on their own once the data is filled in.
