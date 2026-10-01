# Validation against flight data

[PHYSICS.md](PHYSICS.md) §6a compares each vehicle's timeline with a published callout the model
was **calibrated** against. This document is the validation: the simulator flies real missions
as they were flown (vehicle, pad, payload, orbit and booster recovery), and its trajectory is
compared with measurements from those flights, using tolerances fixed before the comparison.
Where the model and the flight disagree, the disagreement is recorded here with its most likely
cause. It is not tuned away.

The comparison was first made with nothing in `src/` changed (main @ 844ffca). It then led to two
data changes and one bug fix, all in §2. Falcon 9's first stage now flies its published masses
("Data change applied"), and a propellant-conservation bug found along the way is fixed (F10).
Falcon 9's six-DOF pitch programme was fitted to three flights' flight-path angles and checked on
two held-out flights ("Six-DOF pitch programme fitted"). Soyuz-2.1a's stored pitch programme has
two fitted scalars, to its flown heights at the fairing and at core separation (§3, "Soyuz-2.1a
flies its stored pitch programme"). Every fitted, derived and constructed value the vehicles fly
is in one register (§1, "Fitted and derived values").
Later, Falcon Heavy took the same published first-stage masses and Falcon 9's max-Q bucket
(§4, F11), and Proton-M its published stage propellant loads and, with Angara-A5, its operator's
fairing jettison rule (§4, F14). None of these was fitted.

Status on 2026-09-28:

| vehicle | reference | state |
| --- | --- | --- |
| Falcon 9 Block 5 | Webcast telemetry of five flights, 2018–2019 | Compared in both flight models (§2); first-stage masses corrected |
| Soyuz-2.1a | Soyuz MS-25 as flown (RussianSpaceWeb, quoting Roskosmos); Arianespace's and Starsem's user's manuals; SoyCOM | Published engines and loads, commanded cut-offs, a stored pitch programme with two fitted scalars; held-out checks judged in both flight models (§3), 2026-10-01 |
| Electron, Ariane 64 | Rocket Lab press kit, Arianespace launch kit (planned timelines) | Compared in both flight models (§3) |
| Atlas V 551, PSLV-XL, H3, H-IIA 202, Vega-C, Proton-M, Falcon Heavy, Angara-A5 | ULA, ISRO, JAXA, Arianespace, ILS (primary); Spaceflight Now, RussianSpaceWeb (secondary) | Compared in both flight models (§4) |
| Orbit playground (O01) | Published orbits: geostationary, GPS, Landsat WRS-2, Sentinel-2; closed forms | Kepler and first-order J2 held to them (§5), 2026-09-26 |
| Maneuver planner (O02) | Vallado's and Curtis's worked examples; closed forms | Transfers and Lambert held to them (§5), 2026-09-26 |
| Continue in orbit (O03) | A recorded Soyuz flight's hand-off; the rocket equation | The playground's orbit is the flight's; the budget is Tsiolkovsky's (§5), 2026-09-26 |
| Applications (O04) | Closed forms; THEOS and THEOS-2 as published (eoPortal); the satellite catalogue (CelesTrak) | Pointing, coverage, delay, link budget, swath held to them (§5), 2026-09-26 |
| SGP4/SDP4 (R01) | The verification of AIAA 2006-6753 (SGP4-VER.TLE, tcppver.out); CelesTrak's documented element set | Every line of the reference output reproduced (§6), 2026-09-26 |
| Uncertainty of an element set (R04) | Flohrer et al. 2008 (Tables 1–2); Levit & Marshall 2011 (1.5 km/day); Kelso 2007 | The estimate is those studies' numbers, stated as an estimate (§6), 2026-09-26 |
| Passes (R03, P2.5) | Skyfield 1.55 with JPL DE421: 249 events of three satellites over two places; Skyfield's refraction | Every event found; times within 0.34 s, angles within 0.005°; refraction within 0.07′ (§6), 2026-09-27 |
| Satellite catalogue (R02) | CelesTrak's six formats of one element set; published orbits of the ISS, Thaicom 8, THEOS-2, GPS | Every format read alike; the catalogue's satellites where they are published to be (§6), 2026-09-26 |
| Re-entry prediction (M03, P2.5) | The four Long March 5B core stages' re-entries (GCAT); ESA's ±20 % window (Klinkrad 2013); seven spheres' known C_D A/m; 66 rocket stages of 2023–2025 and NAPA-2 (GCAT); 100 re-entries of 1985–2004 (GCAT) with NORAD's element sets (J. McDowell's archive) | All four Long March 5B inside the window; B fitted to two sets within 30 % for all seven spheres; the 66 stages 33 inside from their first sets, the criterion fixed before missed (a finding), 32 of 61 after a screen written after the results; the agencies' way, B fitted to two sets a week apart: 81 % inside at 30 days and 85 % at 10 (met), 79 % at 5 days (missed, 80 % fixed); NAPA-2 +8 % by its size, −28 % with B from its first set's decay (§7), 2026-09-27 |
| Overflights (M02, P2.5) | R03's passes; published local times of Landsat 8 and 9 (USGS), Sentinel-2A/B/C (ESA), THEOS-2 (eoPortal); published swaths, fields of view and revisit periods (USGS, ESA, NASA; eoPortal for those added on 2026-09-28) | The same passes; every near-overhead overflight of Bangkok in 16 days at its satellite's published local time; swaths from fields of view within 2 %, but two of the four added on 2026-09-28 missed it (+4.4 %, +5.4 %: a finding); Landsat, Sentinel-2 and Sentinel-1 can image Bangkok within their published revisit periods (§7), 2026-09-27 and 2026-09-28 |
| Close approaches (M01, P2.5) | Constructed encounters with exact answers; Rice's integral; the Iridium 33–Cosmos 2251 conjunction data and probabilities as published (Shepperd, AMOS 2023); NASA CARA's test conjunctions as messages (Alfano 2009; Omitron) | Times and misses exact; all three published probabilities reproduced within a tenth of a decade; CARA's twelve within 0.12 % (§7), 2026-09-27 |
| Space weather in the lifetime (R05, P2.5) | NRLMSISE-00's own test cases and NRL's Fortran; ECSS-E-ST-10-04C's tables of it; seven spheres of published mass and size, 1999–2010, and their re-entries (GCAT) | The port within 2 × 10⁻⁶ of the test cases and 10⁻⁴ of the Fortran; ECSS's averages within 0.3 %; all seven spheres within 25 % of their days in orbit with the daily Sun (+1.5 to −23 %); a fixed moderate Sun is off by −72 to +98 % (§6), 2026-09-27 |
| The Earth's orientation (P2.5) | Vallado et al., AIAA 2006-6753, Appendix C: TEME to ITRF with UT1 − UTC and polar motion; the IERS's finals2000A | The paper's Earth-fixed position within 71 mm (262 m before) (§6), 2026-09-27 |
| Parts catalogue (D01) | The fleet's specs and 27 point-mass and 21 six-DOF flights, recorded before the catalogue; main's literal fleet after F11 | The 21 vehicles emitted value for value and key for key; every flight bit for bit; sources missing for 29 of 55 engines, 25 of 50 stage bodies, 6 of 14 strap-on bodies and 13 of 17 fairings, stated (§8), 2026-09-28 |
| The builder's figures (D02–D05) | The model's own Δv walk; the rocket equation worked by hand; published burn times; engine masses from makers, agencies, secondary sources and Wikipedia, some inferred | Exactly the walk's Δv from every state tried; the hand-worked stage figures within 1e-12; six published burn times within 10 %; a mass with its sources for every engine but the four with none published (§8), 2026-09-28 |
| Optimal staging (D05) | Closed forms; brute-force grids; NPTEL Lecture 20's worked examples (IIT Bombay); Saturn V and Falcon 9 by hand | All met; one bound widened after a result, for the slide's truncated β, and the page's Saturn V bounds set after a probe; two of the slide's figures found not to follow from its own; the real first stage takes more than the optimum on two vehicles and less on four (§8), 2026-09-28 |
| Remix, parts builder and warnings (D02, D03) | The catalogue vehicles; the published engine masses; the rocket equation; the flight's own liftoff, planner and acceleration decisions | Unchanged remixes and rebuilt vehicles equal the catalogue; `noLiftoff` agrees with 85 flights; no catalogue vehicle fails (§8), 2026-09-28 |
| Test stand, wind tunnel, readiness review (D04) | The engine data and 20 published burn times; the six-DOF tables, the point-mass drag and slender-body theory; the Launch panel's verdict | Met; the known sea-level Isp inconsistencies shown, not tuned; the verdict identical on 36 catalogue rows (§8), 2026-09-28 |
| Computed payload ratings (D03, D04) | Eight published ratings (Soyuz-2.1a, Falcon 9, Long March 2D, Vega-C, Ariane 64, Electron), ±25 % fixed before | Seven met; Vega-C's LEO 31 % high, missed and unexplained; the method changed after its first GTO results (§8), 2026-09-28 |
| Six-DOF for a vehicle of one's own (D03) | The point-mass thrust; slender-body theory; the thick-walled tube; the 21 six-DOF fingerprints | Four fixes and two found in review, each with a test that failed first; the catalogue unchanged; still experimental (§8), 2026-09-28 |
| Sizing (D05) | The planner's own ascent cost; sanity bounds from launchers of the class; point-mass flights | The design Δv is the planner's exactly; the 1 t launcher plausible; but none of the sized launchers tried reaches orbit at its design Δv (a finding) (§8), 2026-09-28 |

## 1. Method

### What is compared

- **Event times**: max Q, first-stage cut-off (MECO), second-stage ignition (SES-1) and the
  second stage's first cut-off (SECO-1).
- **The state at those events**: altitude and speed.
- **The trace at fixed times**: altitude and speed at T+60, T+100 and T+140 s. This is the
  first-stage flight, before the missions' guidance targets begin to differ.

The speed on a SpaceX webcast is measured relative to the rotating Earth. At SECO-1 on CRS-16 it
reads 7 538 m/s at 207 km, where a circular orbit's inertial speed is 7 790 m/s. It is therefore
compared with the simulator's air-relative speed `vAir`, which in the calm atmosphere these runs
use is the same quantity.

### Tolerances

These were fixed in `tests/validation/reference-data.ts` (`TOLERANCE`) before any comparison was
flown:

| quantity | tolerance | why |
| --- | --- | --- |
| time | ±10 %, never tighter than ±3 s | The vehicle data are public figures good to about ±10 % (PHYSICS.md §10), and a burn time is a propellant mass divided by a mass flow. The events file rounds to 1 s, and the model's own event detection adds a step or two. |
| speed | ±10 % + 5 m/s | The same ±10 % in the data, plus the webcast's whole-km/h display and the frame-by-frame transcription. |
| altitude | ±15 % + 1 km | Altitude integrates vertical speed, so the same ±10 % in thrust-to-weight grows in it. The webcast shows whole kilometres. |

A row outside its tolerance is marked ✗ in the tables. A row more than three tolerances away is
marked ✗✗ ("gross"). That label shows severity only. It is not a second pass/fail limit.

### How the tests use this

`tests/validation/falcon9-webcast.test.ts` (point mass, part of `npm test`) and
`tests/heavy/validation-falcon9.test.ts` (six-DOF, `npm run test:heavy`) fly every reference
mission. Each test **lists by name** the rows that disagree, and fails if the list changes in
either direction. A row that starts to agree is as much news as one that stops. Changing the
list means updating this document with it. Every milestone also has to be reached: a missing
event is a failure, not a pass.

The code is in `tests/validation/`: `flight-harness.ts` flies a mission and samples its
telemetry, `reference-data.ts` holds the flight data with a source for every number, and
`compare.ts` turns the two into rows.

### Fitted and derived values

Every value a vehicle flies that is not a published figure used as given. *Fitted*: solved for
against a target, which then cannot be a check. *Construction*: an input chosen so that an event
lands on a published time. *Derived*: computed from published figures by stated arithmetic.
*Estimate*: no source. How a vehicle goes through this is in
[FLIGHT-PROFILE-METHOD.md](FLIGHT-PROFILE-METHOD.md).

| vehicle | value | role | targets or basis | result | date |
| --- | --- | --- | --- | --- | --- |
| Falcon 9 | six-DOF kick | fitted | three flights' flight-path angles (§2, "Six-DOF pitch programme fitted") | two held-out flights | 2026-09-26 |
| Soyuz-2.1a, crewed | pitch programme: departure from the vertical × 1.06, then × 1.028 for the 3.0 m fairing | fitted | 79 km at T+153.3 s (RussianSpaceWeb, MS-16 to MS-28) | 79.0 km six-DOF, 77.8 km point mass | 2026-10-01 |
| Soyuz-2.1a, crewed | pitch programme: the core's 17.28° at T+210 s and 11.28° at T+285 s, shifted together | fitted | 157 km at T+287.7 s (same) | 157.0 km six-DOF, 153.1 km point mass | 2026-10-01 |
| Soyuz-2.1a | pitch programme: Starsem's shape advanced 10 s; 5° below the path from T+96 s; 7° down after the strap-ons | set by hand | the same two heights; Starsem Fig. 2-4's post-staging pitch-down | — | 2026-10-01 |
| Soyuz-2.1a, cargo | pitch programme: the crewed one's departure × 1.05 | set by hand | the flattest strap-on phase whose six-DOF max Q (37.9 kPa) stays under the 38 kPa load-relief placard; the flown 43 / 91 km need × 1.14–1.20 and 38.3–38.6 kPa | 46.7 km at strap-on separation, 98.0 km at the fairing (flown 43, 91) | 2026-10-01 |
| Soyuz-2.1a, cargo | pitch programme: the core's 15.11° at T+210 s and 9.11° at T+285 s, shifted together | fitted | 143 km at T+287.42 s (RussianSpaceWeb, Progress MS-19 to MS-34) | 143.0 km six-DOF, 138.6 km point mass | 2026-10-01 |
| Soyuz-2.1a | strap-on cut-off T+117.45 s | construction | the flown separation, 117.85 s, less Arianespace's 0.4 s delay | separation at 117.8–117.9 s | 2026-10-01 |
| Soyuz-2.1a, 2.1b | strap-on intermediate level 81 % from T+112.0 s | derived | Arianespace Fig. 3.2.1a: 3.981 → 3.367 g with the core unchanged | — | 2026-10-01 |
| Soyuz-2.1a, 2.1b | pad start, 2 s of full flow | derived (estimate) | Arianespace §A5 (about 20 s at intermediate levels); the acceleration drop at separation gives about 5.1 t per strap-on | 1.03–1.05 t left per strap-on, about 1 % in the core, 306.8 t at liftoff | 2026-10-01 |
| Soyuz-2.1a, cargo | core cut-off T+286.399 s; Blok I 0.24 s before it; separation 1.02 s after it; skirt 10.62 s after Blok I lights | input | the Progress MS-19 cyclogram (RussianSpaceWeb, from TsUP's table): 286.159 / 286.399 / 287.419 / 296.779 s | the events on those times | 2026-10-01 |
| Soyuz-2.1a, crewed | core cut-off T+286.68 s; skirt 9.68 s after Blok I lights | derived | the flown separation, 287.70 s (MS-21 to MS-29), and skirt, 296.12 s (MS-25), less the cargo cyclogram's 1.02 s and 0.24 s | the events on 286.44 / 286.68 / 287.70 / 296.12 s | 2026-10-01 |
| Soyuz-2.1b | core cut-off T+286.58 s; skirt 14.06 s after Blok I lights | derived | Arianespace's separation at 287.6 s and skirt at 300.4 s, less the 2.1a cyclogram's 1.02 s and 0.24 s; fits the manual's acceleration drop between 286.45 and 287.19 s | — | 2026-10-01 |
| Soyuz-2.1a, 2.1b | Blok I aft skirt, 430 kg | estimate | Starsem's 2 410 kg dry Blok I less Braeunig's 1 976 kg without it | — | 2026-10-01 |
| Soyuz-2.1a | fairing altitude floor 70 km | construction | below the 79 km and 91 km heights, so the published times (153.3 s crewed, 183.2 s cargo) decide | the fairing on its time in both models | 2026-10-01 |
| Soyuz-2.1a | the two payload sections' fairings, 3.0 m: 9.5 m (crewed, 11S517A3) and 10.4 m (cargo, 11S517A2) long; 1 645 and 1 100 kg | input / derived / estimate | the 3.0 m: RKTs Progress for 11S517A2; the lengths: Arianespace's drawing (CSG User's Manual, Table A5-1); the masses: estimates | — | 2026-10-01 |
| Soyuz-2.1a | escape tower 1 740 kg; upper fairing 1 180 kg | estimate | the escape model's head (PHYSICS.md §8.3); KTRV gives the ДУ САС 855М 1 930 kg | — | 2026-10-01 |
| Soyuz-2.1a | the four fairing motors, 135 kN for about 3 s, in pairs 0.32 s apart | input / estimate | KTRV: 56 kg, about 3 s, 2.4–4.5 tf each, flown at the middle; SoyCOM for the pairs | MS-10 102 km against 93 km | 2026-10-01 |
| Saturn V (AS-506) | S-IC tilt programme | input | FER Fig. 11-1 digitised (±0.5°); its frame turned to the local horizon with D5-15560-6's range angle (derived; the same table's flight-path angles are a check, a weak overlap: the angle is at most 1.7° by T+204 s) | OECO 65.8 km / 2,770 m/s against 66.1 / 2,764; SECO −0.9 s | 2026-10-01 |
| Saturn V (AS-506) | F-1 flow 2,654.8 kg/s (6,886.2 / 7,914.6 kN) | derived | FER Table 5-2 over Table 2-2's engine-seconds, less the GOX kept (Table 20-9); Fig. 5-3 and Table 20-9's mainstage use (0.04 % apart) are checks | liftoff thrust 34.4 MN against 34.35 | 2026-10-01 |
| Saturn V (AS-506) | S-IC load 2,102,829 kg, dry 164,995 kg | derived | FER Table 5-2, Table 20-9; the 27.9 t the model burns on the pad from its T−2.5 s start (measured: it moves if the fleet's start rule does) | liftoff 2,898.9 t against 2,899.0; the LOX out at T+161.40 s against 161.63 is by construction, not a result | 2026-10-01 |
| Saturn V (AS-506) | S-II load 439,005 kg, start T+165.72 s | input / derived | FER Table 6-2; the build-up's 593 kg at full flow (Table 20-9, Table 2-2). Its dry mass, 49,179 kg, keeps Table 20-9's gross: the two readings of the S-II (Table 6-2's flowmeter, Table 20-9's mass summary, 2.9 t apart) are a sensitivity (S-IVB cut-off +7 s) | the S-II's cut-off time is by construction too (one flowmeter record) | 2026-10-01 |
| Saturn V (AS-506) | S-IVB: 1,795 kg of the 107,095 kg load carried as dry mass | estimate | "the two burns use 105.3 t" | the TLI leftover is not yet judged against Table 20-9's 2,559 kg | 2026-09 |
| Mercury-Redstone | pitch floor, 3° kick falling 0.34 °/s | fitted | both models cut off on the flown arc (PHYSICS.md, C01) | — | 2026-09 |
| crewed Soyuz | 3.57 s from a strap-on's strike to the loss of the vehicle, the core's thrust gone at the strike | input | Roscosmos's MS-10 timeline: strap-ons separated at 118 s, abort at 121.57 s; the core's tail section torn off (`COLLISION_TO_LOSS`) | abort at T+121.4 s | 2026-10-01 |

Retired 2026-10-01: Soyuz-2.1a's 87 000 kg core load, held to the published clock, and its
kick-and-turn programmes (3° / 0.3 °/s for the point mass; 6° with a T+140 s hand-over in
six-DOF, audit PHY-01); Saturn V AS-506's S-IC and S-II loads (2,053,900 and 442,530 kg, held to
the clock over an F-1 flow 2.5 % low) and its fitted kick (3° at 0.5 °/s, set so that the S-IC
handed over at the flown state). The kick programmes remain what an operator who edits the
pitch-over flies in place of the stored programme.

## 2. Falcon 9 Block 5

### Source

**Webcast telemetry transcribed from SpaceX's launch webcasts**, in
[github.com/shahar603/Telemetry-Data](https://github.com/shahar603/Telemetry-Data), read at commit
`b245d3b81aa36b7941ec10f3f4b508999d106a6d` (24 January 2020). For each flight the data set gives
the webcast's time, speed and altitude at 30 frames per second (`stage1 raw.json` /
`stage2 raw.json`) and an events file rounded to the second (`events.json`: `maxq`, `meco`,
`ses1`). Every Block 5 flight in the data set whose README gives a payload mass was used:

| flight | date | pad | payload (source) | orbit | booster |
| --- | --- | --- | --- | --- | --- |
| SpaceX CRS-16 | 2018-12-05 | SLC-40 | 2 573 kg cargo (data set README) + 4 200 kg Dragon dry mass ([Wikipedia](https://en.wikipedia.org/wiki/SpaceX_CRS-16)); Dragon's propellant is unpublished and left out | ISS, 51.6° | RTLS (LZ-1) |
| SSO-A | 2018-12-03 | SLC-4E | 4 000 kg (README) | ~575 km sun-synchronous ([Spaceflight](https://www.spaceflightservices.com/sso-a/)) | drone ship |
| Iridium NEXT 8 | 2019-01-11 | SLC-4E | 9 600 kg (README) | 625 km, 86° ([Spaceflight Now](https://spaceflightnow.com/2019/01/11/spacex-begins-2019-with-eighth-and-final-for-upgraded-iridium-network/)) | drone ship |
| Bangabandhu-1 | 2018-05-11 | LC-39A | 3 750 kg (README) | GTO, 300 × 35 706 km, 19.3° ([Spaceflight Now](https://spaceflightnow.com/2018/05/11/falcon-9-launch-timeline-with-bangabandhu-1/)) | drone ship |
| GPS III SV01 | 2018-12-23 | SLC-40 | 4 400 kg (README) | MEO | expended |

What the simulator flies in place of what was flown:

- **Payload**: modelled as a point mass in a catalogue shape. The first stage burns about 1 % of
  its lift-off mass per second, so a tonne of uncertainty in the payload moves nothing in the
  first-stage comparison.
- **Orbit plane**: free (no launch window). Only the inclination sets the ascent azimuth.
- **Bangabandhu-1**: flown to the model's standard GTO at the site's inclination. The real
  19.3° transfer orbit needs a plane change on the second burn, which does not affect the first
  stage.
- **SSO-A**: flew a single burn straight to 575 km. The model parks at 200 km first, so there is
  no SECO-1 row for it.
- **SECO-1** is derived, not read from the events file: it is the first sample at which the
  webcast speed reaches (to within 1 m/s) its maximum before T+700 s. The CRS-16 and
  Iridium NEXT 8 traces then stay flat for 3 s and 7 s. Bangabandhu-1 and GPS III SV01 have a
  gap in the trace 2 s after it. Take the time as good to about ±3 s.

### Results

*Measured before the data change below (main @ 844ffca, first stage 395.7 t / 25.6 t); the
tables with the published masses are under "Data change applied".*

The flight value is followed by point mass and six-DOF, with the error relative to the flight in
brackets.

**SpaceX CRS-16** (RTLS)

| milestone | unit | flight | point mass | six-DOF | tolerance |
| --- | --- | ---: | ---: | ---: | ---: |
| max Q (callout) | s | 54.0 | 50.3 (−7 %) | 49.9 (−8 %) | ±5.4 |
| T+60 altitude | km | 8.8 | 9.9 (+12 %) | 10.0 (+14 %) | ±2.3 |
| T+60 speed | m/s | 318 | 325 (+2 %) | 326 (+3 %) | ±37 |
| T+100 altitude | km | 27.1 | 31.9 (+18 %) | 32.3 (+19 %) ✗ | ±5.1 |
| T+100 speed | m/s | 723 | 878 (+21 %) ✗ | 880 (+22 %) ✗ | ±77 |
| T+140 altitude | km | 61.4 | 65.2 (+6 %) | 76.1 (+24 %) ✗ | ±10.2 |
| T+140 speed | m/s | 1516 | 1459 (−4 %) | 1480 (−2 %) | ±157 |
| MECO | s | 145.0 | 128.5 (−11 %) ✗ | 128.4 (−11 %) ✗ | ±14.5 |
| MECO altitude | km | 66.9 | 56.2 (−16 %) | 62.2 (−7 %) | ±11.0 |
| MECO speed | m/s | 1624 | 1475 (−9 %) | 1556 (−4 %) | ±167 |
| SES-1 | s | 156.0 | 135.5 (−13 %) ✗ | 135.4 (−13 %) ✗ | ±15.6 |
| SECO-1 | s | 535.6 | 499.1 (−7 %) | 497.4 (−7 %) | ±53.6 |
| SECO-1 altitude | km | 207.0 | 200.0 (−3 %) | 200.0 (−3 %) | ±32.0 |
| SECO-1 speed | m/s | 7538 | 7463 (−1 %) | 7459 (−1 %) | ±759 |

**SSO-A** (drone ship)

| milestone | unit | flight | point mass | six-DOF | tolerance |
| --- | --- | ---: | ---: | ---: | ---: |
| max Q (callout) | s | 58.0 | 50.5 (−13 %) ✗ | 50.3 (−13 %) ✗ | ±5.8 |
| T+60 altitude | km | 9.3 | 10.1 (+9 %) | 10.2 (+10 %) | ±2.4 |
| T+60 speed | m/s | 355 | 330 (−7 %) | 331 (−7 %) | ±41 |
| T+100 altitude | km | 29.8 | 31.9 (+7 %) | 32.1 (+8 %) | ±5.5 |
| T+100 speed | m/s | 778 | 902 (+16 %) ✗ | 905 (+16 %) ✗ | ±83 |
| T+140 altitude | km | 70.1 | 63.9 (−9 %) | 72.4 (+3 %) | ±11.5 |
| T+140 speed | m/s | 1591 | 1702 (+7 %) | 1732 (+9 %) | ±164 |
| MECO | s | 143.0 | 133.0 (−7 %) | 133.0 (−7 %) | ±14.3 |
| MECO altitude | km | 74.2 | 58.7 (−21 %) ✗ | 64.8 (−13 %) | ±12.1 |
| MECO speed | m/s | 1642 | 1718 (+5 %) | 1764 (+7 %) | ±169 |
| SES-1 | s | 154.0 | 140.0 (−9 %) | 140.0 (−9 %) | ±15.4 |

**Iridium NEXT 8** (drone ship)

| milestone | unit | flight | point mass | six-DOF | tolerance |
| --- | --- | ---: | ---: | ---: | ---: |
| max Q (callout) | s | 61.0 | 50.4 (−17 %) ✗ | 50.3 (−18 %) ✗ | ±6.1 |
| T+60 altitude | km | 9.0 | 9.9 (+10 %) | 10.0 (+11 %) | ±2.4 |
| T+60 speed | m/s | 343 | 325 (−5 %) | 326 (−5 %) | ±39 |
| T+100 altitude | km | 27.5 | 31.2 (+13 %) | 31.4 (+14 %) | ±5.1 |
| T+100 speed | m/s | 773 | 884 (+14 %) ✗ | 886 (+15 %) ✗ | ±82 |
| T+140 altitude | km | 58.7 | 62.5 (+6 %) | 70.4 (+20 %) ✗ | ±9.8 |
| T+140 speed | m/s | 1621 | 1658 (+2 %) | 1692 (+4 %) | ±167 |
| MECO | s | 150.0 | 132.8 (−11 %) ✗ | 132.8 (−11 %) ✗ | ±15.0 |
| MECO altitude | km | 68.5 | 57.2 (−16 %) | 62.7 (−8 %) | ±11.3 |
| MECO speed | m/s | 1896 | 1676 (−12 %) ✗ | 1725 (−9 %) | ±195 |
| SECO-1 | s | 531.2 | 518.5 (−2 %) | 513.1 (−3 %) | ±53.1 |
| SECO-1 altitude | km | 183.0 | 200.2 (+9 %) | 200.0 (+9 %) | ±28.4 |
| SECO-1 speed | m/s | 7911 | 7851 (−1 %) | 7867 (−1 %) | ±796 |

**Bangabandhu-1** (drone ship)

| milestone | unit | flight | point mass | six-DOF | tolerance |
| --- | --- | ---: | ---: | ---: | ---: |
| max Q (callout) | s | 74.0 | 50.5 (−32 %) ✗✗ | 50.1 (−32 %) ✗✗ | ±7.4 |
| T+60 altitude | km | 8.9 | 10.0 (+12 %) | 10.1 (+13 %) | ±2.3 |
| T+60 speed | m/s | 337 | 328 (−3 %) | 329 (−2 %) | ±39 |
| T+100 altitude | km | 25.5 | 32.2 (+26 %) ✗ | 32.5 (+27 %) ✗ | ±4.8 |
| T+100 speed | m/s | 874 | 890 (+2 %) | 892 (+2 %) | ±92 |
| T+140 altitude | km | 53.5 | 65.8 (+23 %) ✗ | 76.3 (+43 %) ✗ | ±9.0 |
| T+140 speed | m/s | 1901 | 1632 (−14 %) ✗ | 1659 (−13 %) ✗ | ±195 |
| MECO | s | 152.0 | 133.1 (−12 %) ✗ | 133.0 (−12 %) ✗ | ±15.2 |
| MECO altitude | km | 64.5 | 60.4 (−6 %) | 67.9 (+5 %) | ±10.7 |
| MECO speed | m/s | 2259 | 1651 (−27 %) ✗ | 1698 (−25 %) ✗ | ±231 |
| SES-1 | s | 163.0 | 140.1 (−14 %) ✗ | 140.0 (−14 %) ✗ | ±16.3 |
| SECO-1 | s | 501.8 | 501.5 (0 %) | 494.6 (−1 %) | ±50.2 |
| SECO-1 altitude | km | 164.0 | 252.1 (+54 %) ✗✗ | 250.0 (+52 %) ✗✗ | ±25.6 |
| SECO-1 speed | m/s | 7490 | 7743 (+3 %) | 7756 (+4 %) | ±754 |

**GPS III SV01** (expended)

| milestone | unit | flight | point mass | six-DOF | tolerance |
| --- | --- | ---: | ---: | ---: | ---: |
| max Q (callout) | s | 63.0 | 50.2 (−20 %) ✗ | 49.9 (−21 %) ✗ | ±6.3 |
| T+60 altitude | km | 9.0 | 10.0 (+11 %) | 10.1 (+12 %) | ±2.4 |
| T+60 speed | m/s | 359 | 328 (−9 %) | 328 (−9 %) | ±41 |
| T+100 altitude | km | 27.1 | 32.2 (+19 %) ✗ | 32.6 (+20 %) ✗ | ±5.1 |
| T+100 speed | m/s | 836 | 886 (+6 %) | 888 (+6 %) | ±89 |
| T+140 altitude | km | 56.3 | 66.2 (+18 %) ✗ | 77.2 (+37 %) ✗ | ±9.4 |
| T+140 speed | m/s | 1763 | 1897 (+8 %) | 1858 (+5 %) | ±181 |
| MECO | s | 168.0 | 152.4 (−9 %) | 152.3 (−9 %) | ±16.8 |
| MECO altitude | km | 82.8 | 75.9 (−8 %) | 91.4 (+10 %) | ±13.4 |
| MECO speed | m/s | 2653 | 2395 (−10 %) | 2256 (−15 %) ✗ | ±270 |
| SES-1 | s | 179.0 | 159.4 (−11 %) ✗ | 159.3 (−11 %) ✗ | ±17.9 |
| SECO-1 | s | 500.8 | 498.6 (0 %) | 499.5 (0 %) | ±50.1 |
| SECO-1 altitude | km | 168.0 | 200.0 (+19 %) ✗ | 200.0 (+19 %) ✗ | ±26.2 |
| SECO-1 speed | m/s | 7852 | 7954 (+1 %) | 7934 (+1 %) | ±790 |

In total the point-mass model agrees on 43 of 66 rows and the six-DOF model on 41.

### What agrees

- **The first minute.** At T+60 s all ten speed and altitude rows agree, in both models, on
  every flight. Lift-off thrust-to-weight, drag through the transonic region and the early pitch
  program together produce the right state.
- **Orbit insertion.** The speed at SECO-1 is within 1–4 % on all four flights that have one,
  and the time of SECO-1 is within 0–7 %. The second stage and the parking-orbit energy match
  the flights.
- **The recovery reserve.** The real booster flown back to the pad (CRS-16) cuts off
  145/168 = 0.863 of the way through the expended burn (GPS III SV01). The model's ratio is
  128.5/152.4 = 0.843. A separate test checks this ratio (`keeps the first-stage recovery
  reserve in proportion`) to within ±0.03, which is the scatter of the three drone-ship flights'
  own ratios (143, 150 and 152 s over 168 s: 0.85–0.90) about their mean. This check was
  written after the probe flights had been seen. Its band comes from the flight data, not from
  the model.

### Findings: where it disagrees, and why

**F1. The first-stage burn is about 10 % short, on every flight and in both models.** MECO comes
7–12 % early (expended: 152.4 s against 168 s), and SES-1 comes 9–14 % early with it. The model
fixes MECO at the propellant load divided by the mass flow. With nine Merlin 1D engines at 845 kN
and a specific impulse of 282 s, 395.7 t burns at about 2.7 t/s, which takes about 146 s at full
throttle and about 152 s with the throttle bucket. The real 168 s needs either about 10 % more
propellant or about 10 % less mass flow, or a deeper and longer throttle-down than the model's.
The events file puts the real throttle-down window at 18–35 s long, between T+43 and T+78 s.
This is inside the ±10 % the data are quoted to (PHYSICS.md §10), but it is **systematic**:
all five flights agree on the sign and on the size. It is a vehicle-data finding
(`falcon9`'s first stage, now the body `s1` and the engine part `merlin1d` in `src/data/parts.ts`), not an error in the equations.
The published first-stage masses have since been applied ("Data change applied" below), which
narrows this gap by about a third (the expended burn is 157.9 s against 168 s) but does not
close it.

**F2. Speed at T+100 s is 14–22 % high on three flights, and 2–6 % high on the other two.** The
same cause as F1 seen earlier in the flight: a higher mass flow is a higher thrust-to-weight once
the throttle bucket ends. The bucket starts at 22 kPa (`maxQThrottle`), so full thrust returns
earlier in the model than in the flights. By T+140 s the lead has closed or reversed, because the
real vehicle is still at full thrust while the model is near its cut-off.

**F3. Max Q is 50 s in the model against 54–74 s on the flights.** This is already disclosed in
PHYSICS.md §6a. That section measured it and explains why raising the bucket's `qStart` does not
fix it. The spread in the flights (54–74 s) is wider than the model's error on the earliest of
them. The webcast's "Max Q" is a callout, not a measurement of the peak, and it tracks each
flight's own throttle profile.

**F4. MECO speed on the drone-ship flights varies from 1 642 to 2 259 m/s in reality. In the
model it stays between 1 651 and 1 764 m/s.** SpaceX sizes the landing reserve for each mission
from the payload and the landing distance. The model keeps a fixed 12 % of first-stage propellant
for a drone ship (`recoveryReserve`) and 15 % to return to the pad (`returnReserve`). The
lightest reserve in the set, Bangabandhu-1's to GTO, is where the model is furthest off
(−27 %). This is a model assumption (a fixed reserve), stated in PHYSICS.md §8.1.

**F5 (root cause found and fixed for six-DOF below, "Six-DOF pitch programme fitted"). The six-DOF model climbs higher between T+100 and T+140 s than the point-mass model and the
flights.** At T+140 s it is 70–77 km against 53–70 km in the flights and 62–66 km in the
point-mass model. Its MECO altitude is correspondingly higher. The six-DOF first stage flies an
attitude loop with a real angle of attack and aerodynamic moments, and it comes out of the high-q
region steeper. At T+60 s the two models agree with each other to 0.2 km, so the difference
opens after max Q.

**F6. SECO-1 altitude: the model parks at 200 km (250 km for GTO). The flights parked at
164–207 km.** This comes from the model's guidance, which uses a fixed parking altitude
(PHYSICS.md §6). It says nothing about the physics. The speed and the time of SECO-1 agree.

**Summary.** The comparison found no disagreement that points to wrong equations of motion,
gravity, atmosphere or staging logic. The model reaches the right state at T+60 s and the right
orbital energy at SECO-1, at the right time. The disagreements in between trace back to three
things: one systematic vehicle-data offset (F1, and F2 as its consequence), one model assumption
(F4), and the guidance's fixed choices (F3, F6). F5 is a difference between the two flight
models.

### Data change applied

F1 had a sourced fix. Wikipedia's "Falcon 9 Block 5" specification table (`action=raw`, read
2026-09-25) cites *Espace & Exploration* no. 39 (May 2017, "Fiche technique: Falcon-9") for the
first stage's tank capacities and empty mass:

| first stage | before (main @ 844ffca) | now (`src/data/parts.ts`, body `s1`) |
| --- | --- | --- |
| propellant | 395 700 kg | 287 400 kg LOX + 123 500 kg RP-1 = 410 900 kg |
| empty mass | 25 600 kg | 22 200 kg |

Falcon Heavy's cores took the same figures later (§4, F11). The second stage keeps its own. Its published
4 000 kg empty and 107 500 kg of propellant are within 7 % and 0.5 % of the model's
4 300 / 108 000 kg. It was not part of F1, so it was left alone.

The values were flown in memory first and then applied. A throttle bucket at 28 kPa and 70 % was
tried at the same time and made the comparison worse (42 of 66 rows in point mass), so it was not
applied. PHYSICS.md §6a has the re-measured bucket table.

**Rows in tolerance, before → after:**

| flight | rows | point mass | six-DOF |
| --- | ---: | ---: | ---: |
| CRS-16 | 14 | 11 → 12 | 9 → 11 |
| Iridium NEXT 8 | 13 | 9 → 12 | 9 → 11 |
| GPS III SV01 | 14 | 9 → 11 | 8 → 11 |
| SSO-A (held out) | 11 | 8 → 6 | 9 → 7 |
| Bangabandhu-1 (held out) | 14 | 6 → 8 | 6 → 8 |
| **total** | 66 | **43 → 49** | **41 → 48** |

**Hold-out.** Before any change, anything that had to be fitted was to be fitted on CRS-16,
Iridium NEXT 8 and GPS III SV01 and judged on SSO-A and Bangabandhu-1. Nothing was fitted in the
end: both numbers are published values, not chosen from these flights. The split is still
reported. The three "fit" flights gained 13 rows between the two models. The two held-out
flights gained none overall: Bangabandhu-1 gained 2 and SSO-A lost 2, because with the longer
burn SSO-A's MECO speed is now above the flight's (the fixed 12 % drone-ship reserve, F4, is too
large for that mission).

### The drone-ship reserve sized for the mission

C01 (roadmap, part 3) replaced the fixed 12 % drone-ship reserve of a lone first stage (F4) with
`droneShipReserve`: the propellant its return needs for the mission's payload, never above the
vehicle's own (PHYSICS.md §13.5). The three drone-ship flights here fly with it. Re-measured on
the merge of that work with main, in point mass:

| flight | rows | point mass, before → after |
| --- | ---: | ---: |
| SSO-A (held out) | 11 | 6 → 7: the MECO altitude now agrees |
| Iridium NEXT 8 | 13 | 12 → 11: the speed at T+140 s, 1 866 m/s against 1 621 ± 167, now just outside |
| Bangabandhu-1 (held out) | 14 | 8 → 9: the second stage's start now agrees |
| **total of the 66** | | **49 → 49** (CRS-16 and GPS III SV01 fly no drone ship) |

The smaller reserve burns the first stage longer, which is what SSO-A needed (above) and what
Iridium NEXT 8's T+140 s speed did not. Nothing was fitted.

The six-DOF comparison (`tests/heavy/validation-falcon9.test.ts`, outside `npm test`) was not
re-measured with that work and was found failing on the first `npm run test:heavy` after it, on
2026-10-01. In six-DOF only Bangabandhu-1 moved: 9 → 11 of its 14 rows, the MECO speed (2 042 m/s
against 2 259 ± 231) and the second stage's start (150.2 s against 163.0 ± 16.3) now agreeing. Its
maximum dynamic pressure time, T+140 s altitude and SECO altitude still disagree. The other four
flights' six-DOF rows are unchanged.

**What is left of F1 and F2.** MECO is now 4–10 % early (it was 7–12 %). The expended flight's
first-stage burn is 157.9 s against 168 s. The speed at T+100 s is within 1–16 % (it was 2–22 %).
The first minute moved the other way: the heavier stack is 1–11 % slow at T+60 s, where it was
within 9 %, and GPS III SV01's T+60 s speed is now just outside its tolerance in point mass.
Less acceleration early and a cut-off that still comes early together point at the throttle
profile, not the loaded mass. The real Merlins throttle deeper and longer through max Q (18–35 s
between T+43 and T+78 s in the events files) and then run longer. There is no public source for
that profile, so it stays a disclosed difference.

Results with the published masses (the tables in "Results" above are the earlier ones):

**SpaceX CRS-16 (RTLS)**

| milestone | unit | flight | point mass | six-DOF | tolerance |
| --- | --- | ---: | ---: | ---: | ---: |
| max Q (callout) | s | 54.0 | 50.0 (−7 %) | 49.5 (−8 %) | ±5.4 |
| T+60 altitude | km | 8.8 | 9.5 (+8 %) | 9.5 (+8 %) | ±2.3 |
| T+60 speed | m/s | 318 | 316 (−1 %) | 317 (0 %) | ±37 |
| T+100 altitude | km | 27.1 | 30.4 (+12 %) | 30.8 (+14 %) | ±5.1 |
| T+100 speed | m/s | 723 | 841 (+16 %) ✗ | 840 (+16 %) ✗ | ±77 |
| T+140 altitude | km | 61.4 | 62.7 (+2 %) | 72.8 (+19 %) ✗ | ±10.2 |
| T+140 speed | m/s | 1516 | 1528 (+1 %) | 1552 (+2 %) | ±157 |
| MECO | s | 145.0 | 132.8 (−8 %) | 132.7 (−8 %) | ±14.5 |
| MECO altitude | km | 66.9 | 57.3 (−14 %) | 64.2 (−4 %) | ±11.0 |
| MECO speed | m/s | 1624 | 1551 (−4 %) | 1596 (−2 %) | ±167 |
| SES-1 | s | 156.0 | 139.8 (−10 %) ✗ | 139.7 (−10 %) ✗ | ±15.6 |
| SECO-1 | s | 535.6 | 501.9 (−6 %) | 499.6 (−7 %) | ±53.6 |
| SECO-1 altitude | km | 207.0 | 200.0 (−3 %) | 200.0 (−3 %) | ±32.0 |
| SECO-1 speed | m/s | 7538 | 7461 (−1 %) | 7474 (−1 %) | ±759 |

**SSO-A (drone ship)**

| milestone | unit | flight | point mass | six-DOF | tolerance |
| --- | --- | ---: | ---: | ---: | ---: |
| max Q (callout) | s | 58.0 | 50.4 (−13 %) ✗ | 50.3 (−13 %) ✗ | ±5.8 |
| T+60 altitude | km | 9.3 | 9.7 (+4 %) | 9.7 (+4 %) | ±2.4 |
| T+60 speed | m/s | 355 | 320 (−10 %) | 321 (−10 %) | ±41 |
| T+100 altitude | km | 29.8 | 30.3 (+2 %) | 30.5 (+2 %) | ±5.5 |
| T+100 speed | m/s | 778 | 865 (+11 %) ✗ | 867 (+11 %) ✗ | ±83 |
| T+140 altitude | km | 70.1 | 61.3 (−13 %) | 67.8 (−3 %) | ±11.5 |
| T+140 speed | m/s | 1591 | 1819 (+14 %) ✗ | 1838 (+16 %) ✗ | ±164 |
| MECO | s | 143.0 | 137.5 (−4 %) | 137.5 (−4 %) | ±14.3 |
| MECO altitude | km | 74.2 | 59.4 (−20 %) ✗ | 65.3 (−12 %) | ±12.1 |
| MECO speed | m/s | 1642 | 1815 (+11 %) ✗ | 1842 (+12 %) ✗ | ±169 |
| SES-1 | s | 154.0 | 144.5 (−6 %) | 144.5 (−6 %) | ±15.4 |

**Iridium NEXT 8 (drone ship)**

| milestone | unit | flight | point mass | six-DOF | tolerance |
| --- | --- | ---: | ---: | ---: | ---: |
| max Q (callout) | s | 61.0 | 50.3 (−18 %) ✗ | 50.1 (−18 %) ✗ | ±6.1 |
| T+60 altitude | km | 9.0 | 9.5 (+6 %) | 9.5 (+6 %) | ±2.4 |
| T+60 speed | m/s | 343 | 316 (−8 %) | 317 (−8 %) | ±39 |
| T+100 altitude | km | 27.5 | 29.6 (+8 %) | 29.8 (+8 %) | ±5.1 |
| T+100 speed | m/s | 773 | 847 (+10 %) | 849 (+10 %) | ±82 |
| T+140 altitude | km | 58.7 | 60.2 (+3 %) | 66.2 (+13 %) | ±9.8 |
| T+140 speed | m/s | 1621 | 1767 (+9 %) | 1793 (+11 %) ✗ | ±167 |
| MECO | s | 150.0 | 137.3 (−8 %) | 137.3 (−8 %) | ±15.0 |
| MECO altitude | km | 68.5 | 58.2 (−15 %) | 63.5 (−7 %) | ±11.3 |
| MECO speed | m/s | 1896 | 1764 (−7 %) | 1797 (−5 %) | ±195 |
| SECO-1 | s | 531.2 | 521.4 (−2 %) | 513.1 (−3 %) | ±53.1 |
| SECO-1 altitude | km | 183.0 | 200.9 (+10 %) | 200.0 (+9 %) | ±28.4 |
| SECO-1 speed | m/s | 7911 | 7858 (−1 %) | 7867 (−1 %) | ±796 |

**Bangabandhu-1 (drone ship)**

| milestone | unit | flight | point mass | six-DOF | tolerance |
| --- | --- | ---: | ---: | ---: | ---: |
| max Q (callout) | s | 74.0 | 50.3 (−32 %) ✗✗ | 49.9 (−33 %) ✗✗ | ±7.4 |
| T+60 altitude | km | 8.9 | 9.6 (+8 %) | 9.6 (+8 %) | ±2.3 |
| T+60 speed | m/s | 337 | 318 (−6 %) | 319 (−5 %) | ±39 |
| T+100 altitude | km | 25.5 | 30.6 (+20 %) ✗ | 31.0 (+22 %) ✗ | ±4.8 |
| T+100 speed | m/s | 874 | 852 (−3 %) | 853 (−2 %) | ±92 |
| T+140 altitude | km | 53.5 | 63.1 (+18 %) ✗ | 72.4 (+35 %) ✗ | ±9.0 |
| T+140 speed | m/s | 1901 | 1748 (−8 %) | 1744 (−8 %) | ±195 |
| MECO | s | 152.0 | 137.5 (−10 %) | 137.5 (−10 %) | ±15.2 |
| MECO altitude | km | 64.5 | 61.2 (−5 %) | 69.6 (+8 %) | ±10.7 |
| MECO speed | m/s | 2259 | 1745 (−23 %) ✗ | 1752 (−22 %) ✗ | ±231 |
| SES-1 | s | 163.0 | 144.5 (−11 %) ✗ | 144.5 (−11 %) ✗ | ±16.3 |
| SECO-1 | s | 501.8 | 503.5 (0 %) | 496.7 (−1 %) | ±50.2 |
| SECO-1 altitude | km | 164.0 | 254.4 (+55 %) ✗✗ | 250.0 (+52 %) ✗✗ | ±25.6 |
| SECO-1 speed | m/s | 7490 | 7736 (+3 %) | 7750 (+3 %) | ±754 |

**GPS III SV01 (expended)**

| milestone | unit | flight | point mass | six-DOF | tolerance |
| --- | --- | ---: | ---: | ---: | ---: |
| max Q (callout) | s | 63.0 | 50.1 (−20 %) ✗ | 49.6 (−21 %) ✗ | ±6.3 |
| T+60 altitude | km | 9.0 | 9.6 (+7 %) | 9.6 (+7 %) | ±2.4 |
| T+60 speed | m/s | 359 | 318 (−11 %) ✗ | 319 (−11 %) | ±41 |
| T+100 altitude | km | 27.1 | 30.7 (+13 %) | 31.1 (+15 %) | ±5.1 |
| T+100 speed | m/s | 836 | 848 (+1 %) | 848 (+1 %) | ±89 |
| T+140 altitude | km | 56.3 | 63.4 (+13 %) | 73.6 (+31 %) ✗ | ±9.4 |
| T+140 speed | m/s | 1763 | 1822 (+3 %) | 1791 (+2 %) | ±181 |
| MECO | s | 168.0 | 157.9 (−6 %) | 157.8 (−6 %) | ±16.8 |
| MECO altitude | km | 82.8 | 77.0 (−7 %) | 93.3 (+13 %) | ±13.4 |
| MECO speed | m/s | 2653 | 2547 (−4 %) | 2388 (−10 %) | ±270 |
| SES-1 | s | 179.0 | 164.9 (−8 %) | 164.8 (−8 %) | ±17.9 |
| SECO-1 | s | 500.8 | 500.5 (0 %) | 501.1 (0 %) | ±50.1 |
| SECO-1 altitude | km | 168.0 | 200.0 (+19 %) ✗ | 200.0 (+19 %) ✗ | ±26.2 |
| SECO-1 speed | m/s | 7852 | 7944 (+1 %) | 7952 (+1 %) | ±790 |

**What else the change moved** (all re-measured on 2026-09-25, full `npm test` green):

- **PHYSICS.md §6a:** Falcon 9's reference timeline has MECO at T+156.3 s (150.8 s before) and
  fairing jettison at T+221.5 s. Both are still inside their published windows. Max Q is still
  the one row outside.
- **The flexible autopilot (PHYSICS.md §2g):** the first bending mode is lower (1.61 Hz at T+25 s,
  where it was 1.72 Hz). The two PD gains can no longer hold GM ≥ 4 dB from lift-off (best about
  2.7 dB), and the default flexible autopilot is within 0.1 dB of that. The tuner now reports
  4 dB as infeasible and is exercised at 2.5 dB in `tests/control-tuning.test.ts`.
- **The equations panel:** the load relief releases at T+130.5 s (it was T+127.3 s).
- **Landing:** from the 255.9 m descent fixture the lighter stage coasts and lights once. The old
  stage braked first and relit. Bandwagon-1's return to LZ-1 still needs 13 % and lands with
  15 %.
- **Golden fingerprints:** Falcon 9's six-DOF flight was re-recorded by the P05 baseline commit
  (7834edd) with only these two numbers changed. The current code with the flexible options off
  matches it bit for bit, over the first 160 s and over the whole mission.

**F10. A propellant-conservation bug, found through the change.** In the point-mass path, a step
that ran through the tank's depletion boundary burned its full flow × dt, and `consume()` then
clamped the tank back to empty. That is impulse no propellant paid for. It showed up because
410.9 t happened to put the boundary inside a 0.5 s step in `tests/engine-transients.test.ts`:
418 kg of free propellant, specific impulse 0.3 s high. 395.7 t had missed it by luck. The
burning level is now capped at what the tank holds, in `thrust()` and `consume()`, for cores and
strap-ons alike, the way the tail-off already was (`VehicleModel.withinTank`). A new test sweeps
the propellant load so the boundary falls anywhere inside a step. The six-DOF path splits its step
at the boundary and was not affected.

### Six-DOF pitch programme fitted (F5)

**Root cause.** The two flight models get the same guidance. Up to about T+90 s both follow a
gravity turn that starts from a 1.5° kick. When the dynamic pressure falls below about 12 kPa,
the guidance blends into closed-loop steering, and that asks for a nearly horizontal attitude:
13° above the horizon at T+110 s, while the vehicle is still climbing at 40 km.

- **Point mass:** its angle-of-attack placard (2 100 Pa·rad / q, up to 60°) lets it fly that.
- **Six-DOF:** the structural load relief holds the command within 15° of the relative wind
  until q falls below 500 Pa, so it cannot, and the stack keeps climbing.

The webcast data settle which is closer to the real vehicle, because the data set's `analysed`
files give the flight-path angle (the angle of the Earth-relative velocity above the horizon):

| flight-path angle, ° | T+40 | T+60 | T+80 | T+100 | T+120 | T+140 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| **CRS-16, flight** | 81.6 | 73.7 | 69.1 | 61.9 | 53.8 | 45.2 |
| point mass | 85 | 81 | 76 | 68 | 43 | 29 |
| six-DOF, 1.5° kick | 86 | 83 | 79 | 72 | 58 | 47 |
| six-DOF, 3.5° kick | 80 | 73 | 66 | 59 | 44 | 34 |
| **Iridium NEXT 8, flight** | 80.2 | 73.3 | 62.9 | 51.2 | 43.3 | 35.0 |
| point mass | 84 | 77 | 69 | 61 | 39 | 24 |
| six-DOF, 1.5° kick | 84 | 77 | 69 | 61 | 46 | 34 |
| six-DOF, 3.5° kick | 79 | 71 | 65 | 59 | 43 | 31 |
| **GPS III SV01, flight** | 76.3 | 62.9 | 54.3 | 44.4 | 35.8 | 29.6 |
| point mass | 84 | 82 | 76 | 68 | 43 | 25 |
| six-DOF, 1.5° kick | 84 | 83 | 79 | 72 | 59 | 41 |
| six-DOF, 3.5° kick | 79 | 73 | 66 | 59 | 44 | 31 |
| **SSO-A, flight** (held out) | 90.0 | 82.8 | 71.4 | 65.9 | 61.6 | 57.8 |
| point mass | 83 | 77 | 70 | 61 | 38 | 24 |
| six-DOF, 1.5° kick | 82 | 77 | 70 | 61 | 46 | 33 |
| six-DOF, 3.5° kick | 78 | 72 | 65 | 58 | 43 | 31 |
| **Bangabandhu-1, flight** (held out) | 80.1 | 61.5 | 48.7 | 38.1 | 31.6 | 27.8 |
| point mass | 83 | 81 | 75 | 67 | 42 | 26 |
| six-DOF, 1.5° kick | 83 | 82 | 77 | 69 | 56 | 41 |
| six-DOF, 3.5° kick | 79 | 73 | 66 | 59 | 44 | 32 |

The model's angle is asin(climb rate / air-relative speed), measured over ±1 s. The flight's is
the data set's own, derived from whole-kilometre altitudes, so take it as good to a degree or two.

With the 1.5° kick both models are 4–20° too steep from T+40 to T+100 s. After that the point-mass
model dives through the real angle: 24–29° at T+140 s against 30–58°. So its good altitude match
(F9 in §3 notes that it tracks the published altitudes) is partly the unphysical dive cancelling a turn that
is too slow. The six-DOF model cannot dive, and it arrived too high. The flights do not dive
either: from T+100 s their path keeps coming down steadily.

**What was fitted, and how it was judged.** Only one number: Falcon 9's six-DOF kick
(`guidanceDefaultsSixDof: { kickAngle: 3.5 }` in `src/data/vehicles.ts`, the same mechanism
Soyuz-2.1a already uses). The point-mass programme is unchanged.

- **Sweep:** kick 1.5–5.5° and turn-rate limit 0.3–0.5 °/s, flown in six-DOF on the three "fit"
  flights, CRS-16, Iridium NEXT 8 and GPS III SV01.
- **Scored on:** the mean flight-path-angle error at the six times above, and the rows in
  tolerance.
- **Choice:** 3.5° with the 0.3 °/s limit unchanged was best on both scores. The mean error went
  from 10.1° to 5.3°, and rows in tolerance from 33 to 36 of 41. 4.5° and 5.5° were as good on
  rows and slightly worse on angle. A 0.5 °/s limit was worse, and one flight failed to reach
  orbit.
- **Held-out flights:** judged afterwards, and not used to choose. SSO-A and Bangabandhu-1
  improved as well, the mean angle error from 14.8° to 12.5° and rows from 15 to 17 of 25.
  Bangabandhu-1's real turn (a GTO flight) is still much faster than the model's single
  programme, and SSO-A's much slower. One pitch programme per vehicle cannot follow per-mission
  steering.

Six-DOF rows in tolerance, all five flights: **48 → 53 of 66**. The disagreements left are listed
in `tests/heavy/validation-falcon9.test.ts`. The point-mass rows are unchanged (49 of 66).

**What else the change moved** (`npm test` green; the two long suites re-run separately):

- **Golden fingerprints:** Falcon 9's six-DOF flight was re-recorded by 7834edd with only the two
  data changes applied (masses and pitch programme). The current code with the flexible options
  off still matches it bit for bit.
- **Recovery landing:** the returning first stage of the six-DOF recovery reference lands at
  T+474 s (it was T+538.7 s), so that test's convergence checkpoints moved inside the descent. The
  step-size convergence is unchanged: sub-millimetre and sub-micro-degree.
- **Load relief:** it now lets go at T+133.5 s with a swing of about 15° (it was 24°), because the
  earlier turn leaves it less to hold back. The equations-panel sample and the explicit-guidance
  test moved with it.
- **The flexible autopilot tuner:** gains tuned at GM ≥ 2.5 dB over the first 60 s leave a slowly
  growing mode from T+64 s, outside the part of the flight they were tuned on. The test now
  tunes to 2 dB, which holds through T+90 s (PHYSICS.md §2g).

### The throttle profile (F1, F2): nothing to apply

MECO is still 4–10 % early and the early speed is off. The throttle bucket was swept on the fit
flights in point mass: start and end q of 15–22 kPa, throttle 50–75 %. None beat the shipped
22 kPa / 75 % (35 of 41 rows, 6.3 % mean speed error). Below 22 kPa the early ascent is far too
slow (275 m/s at T+60 s against 318–359 m/s). The model's bucket is a q-limiter: it pins q at its
start value, so its depth barely matters. The real vehicle throttles down for a fixed window
(T+43–78 s in the events files) and then runs at full thrust. Expressing that needs a time-based
throttle schedule in the model, and a source for its depth. Neither exists, so nothing was
changed.

## 3. Soyuz-2.1a, Electron and Ariane 64: published timelines

### Sources

These references are event timelines, not telemetry traces: they give times, sometimes an
altitude, and for Soyuz the initial orbit. The test code is
`tests/validation/timelines.test.ts` (point mass) and `tests/heavy/validation-timelines.test.ts`
(six-DOF). The tolerances are the same as in §1.

| flight | what the source gives | source | kind |
| --- | --- | --- | --- |
| **Soyuz MS-25**, 2024-03-23, Baikonur → ISS, spacecraft ~7 152 kg | as-flown event times to 0.01 s, a 200.0 × 242.0 km initial orbit, altitudes and speeds at the fairing and core separation | [russianspaceweb.com/soyuz-ms-25.html](https://www.russianspaceweb.com/soyuz-ms-25.html) (Anatoly Zak, quoting Roskosmos) | secondary. roscosmos.ru and energia.ru refused the connection. |
| **Electron "No Time Toulouse"**, 2024-06-20, Mahia → 635 km, 98°, 150 kg (5 Kinéis satellites) | planned event times | [Rocket Lab press kit](https://rocketlabcorp.com/assets/Uploads/No-Time-Toulouse-Press-Kit.pdf); payload from [Kinéis](https://kineis.com/en/nanosatellites-kineis-size-doesnt-matter/) | primary, planned |
| **Ariane 64 VA267** (Amazon Leo LE-01), 2026-02-12, Kourou → ~465 km, "approximately 20 tons" | planned times and altitudes | [Arianespace launch kit](https://www.ariane.group/app/uploads/2026/02/LAUNCH-KIT-VA267-EN_FINAL.pdf), "Flight sequence"; 51.9° inclination from [NASASpaceflight](https://www.nasaspaceflight.com/2026/02/le-01-launch/) | primary, planned |

Three caveats about how independent these comparisons are:

- **The altitudes and speeds for Soyuz are nominal.** They are the profile RussianSpaceWeb
  repeats word for word for every crewed flight since MS-16, not a measurement of MS-25. The
  times cross-check: MS-21, -23, -24 and -26 on the same site agree with them to within 0.5 s.
- **Speeds are reported but not graded.** None of these sources says whether its speed is
  inertial or relative to the Earth. At Soyuz staging the two differ by about 0.3 km/s, which
  is more than the tolerance. Grading would mean choosing the frame after seeing the result.
  The model's speed comes out close to the source's speed in one frame at one event and in the
  other frame at the next (see the table).
- **These timelines are the same kind of number PHYSICS.md §6a calibrates against.** The Soyuz
  and Ariane 64 times in the table below are close to that section's published callouts (Soyuz:
  118 / 287 / 528 s), so their agreement is partly calibration, not independent evidence. The
  altitudes, Soyuz's initial orbit and Electron's second stage (which §6a does not list) are
  the independent part. The Soyuz and Ariane 64 fairings are flown on fixed times (`fairing.sepTime`, 153.3 s and
  200 s), so their times agree by construction. Ariane 64's altitudes are still a real comparison; Soyuz's
  two heights have been the targets of its programme's fit since 2026-10-01.

### Results

**Soyuz MS-25** (as flown)

| milestone | flight | point mass | six-DOF | tolerance |
| --- | ---: | ---: | ---: | ---: |
| strap-on separation | 117.8 s | 117.8 s (0 %) | 117.9 s (0 %) | ±11.8 s |
| fairing jettison | 153.3 s | 153.4 s (0 %) | 153.3 s (0 %) | ±15.3 s |
| fairing altitude (nominal) | 79 km | 77.7 km (−2 %) | 79.1 km (0 %) | ±12.8 km |
| core separation | 287.7 s | 285.1 s (−1 %) | 285.0 s (−1 %) | ±28.8 s |
| core separation altitude (nominal) | 157 km | 152.0 km (−3 %) | 156.3 km (0 %) | ±24.6 km |
| third-stage cut-off | 525.9 s | 526.7 s (0 %) | 526.4 s (0 %) | ±52.6 s |
| spacecraft separation | 529.2 s | 527.9 s (0 %) | 527.6 s (0 %) | ±52.9 s |
| initial orbit, perigee | 200.0 km | 200.0 km | 200.0 km | ±31.0 km |
| initial orbit, apogee | 242.0 km | 240.0 km (−1 %) | 240.0 km (−1 %) | ±37.3 km |
| *speed at fairing (frame not stated)* | *2.2 km/s* | *1.93 relative / 2.20 inertial* | *1.92 / 2.19* | *not graded* |
| *speed at core separation (frame not stated)* | *3.8 km/s* | *3.85 relative / 4.14 inertial* | *3.83 / 4.12* | *not graded* |

Re-measured 2026-10-01 with the stored pitch programme, the published data and the commanded
sequence ("Soyuz-2.1a flies its stored pitch programme", below). The strap-on, fairing and
core-cut-off times are now inputs (construction rows), so they agree by construction; the two
heights are the programme's fit targets, so they are not evidence either. What is evidence is in
the held-out checks below. The core separates 2.65 s before the flown time because hot staging is
not modelled. Under the PHY-01 strap-on turn the six-DOF column read 101.8 km and 199.2 km, and
the point mass 89.2 km and 166.0 km, with a 197 × 200 km insertion (F8).

**Electron "No Time Toulouse"** (planned)

| milestone | press kit | point mass | six-DOF | tolerance |
| --- | ---: | ---: | ---: | ---: |
| MECO | 144 s | 138.2 s (−4 %) | 138.3 s (−4 %) | ±14.4 s |
| stage separation | 148 s | 139.2 s (−6 %) | 139.3 s (−6 %) | ±14.8 s |
| second-stage ignition | 151 s | 141.2 s (−6 %) | 141.3 s (−6 %) | ±15.1 s |
| fairing separation | 187 s | 185.3 s (−1 %) | 158.6 s (−15 %) ✗ | ±18.7 s |
| SECO | 538 s | 439.2 s (−18 %) ✗ | 439.5 s (−18 %) ✗ | ±53.8 s |
| kick-stage separation | 542 s | 442.5 s (−18 %) ✗ | 442.8 s (−18 %) ✗ | ±54.2 s |

**Ariane 64 VA267** (planned)

| milestone | launch kit | point mass | six-DOF | tolerance |
| --- | ---: | ---: | ---: | ---: |
| P120C separation | 145 s | 137.3 s (−5 %) | 137.4 s (−5 %) | ±14.5 s |
| P120C separation altitude | 87 km | 87.1 km (0 %) | 101.0 km (+16 %) | ±14.1 km |
| fairing separation | 191 s | 200.1 s (+5 %) | 200.0 s (+5 %) | ±19.1 s |
| fairing altitude | 127 km | 128.5 km (+1 %) | 159.2 km (+25 %) ✗ | ±20.1 km |
| main-stage separation | 463 s | 447.8 s (−3 %) | 448.1 s (−3 %) | ±46.3 s |
| main-stage separation altitude | 265 km | 230.2 km (−13 %) | 298.0 km (+12 %) | ±40.8 km |
| Vinci first ignition | 472 s | 453.8 s (−4 %) | 454.1 s (−4 %) | ±47.2 s |
| Vinci ignition altitude | 269 km | 233.8 km (−13 %) | 302.2 km (+12 %) | ±41.4 km |

### Findings

**F7. Electron's second stage burns about 25 % too short.** The press kit runs it from T+151 s
to T+538 s, 387 s. The model runs it from T+141 s to T+439 s, 298 s. With the model's data
(`src/data/parts.ts`, body `e2`: 2 300 kg of propellant, one Rutherford Vacuum at 25.8 kN and 343 s,
about 7.7 kg/s), 298 s is exactly a burn to depletion. The real stage burns for longer, so it
must carry more propellant (about 3 t at the same flow) or throttle below full thrust. Nothing
reachable here says which. This is a vehicle-data finding, like F1, but unlike F1 no published
stage mass exists to correct it (Rocket Lab does not publish them), so it is not applied.
Rocket Lab's Payload User's Guide (v7.0, 2022) does not settle it either. It gives the second
stage "approximately 2,000 kg of propellant" and "a burn time of approximately five minutes",
and its own example profile runs the stage from L+162 s to L+535 s, 373 s. At the published
25.8 kN and 343 s, 2 000 kg lasts 261 s at full thrust. The figures agree with each other only if
the stage throttles to about 70 % on average, which the model does not do. The
first stage is 4 % early, as PHYSICS.md §6a already records.

**F8 (closed 2026-10-01). Soyuz inserted into a 197 × 200 km orbit; the flight went to
200 × 242 km.** The model aimed the third stage at a circular 200 km parking orbit and let the
crew ship raise it; the real Soyuz is put on an ellipse with a 242 km apogee from the start
(Roscosmos: 200 ± 2 × 242 ± 5 km for every crewed flight since MS-16). A Soyuz MS or Progress MS
on Soyuz-2.1a is now inserted there whatever it does next (`soyuzShipInsertion`,
src/physics/rendezvous/profiles.ts; it used to be done only with a rendezvous planned): 200.0 ×
241.0 km in the point mass, 199.9 × 239.6 km in six-DOF.

**F9. The six-DOF model climbs higher than the point-mass model on every vehicle.** Soyuz was
13–33 km higher at fairing and core separation (10–17 km before its strap-on turn below); flying
one stored pitch programme in both models it is 1.4 and 4.3 km higher (2026-10-01), which says the
gap was the two models' different turns, not their dynamics. Ariane 64 is 14–68 km higher from booster
separation onwards. Electron's six-DOF fairing leaves 27 s earlier than the point-mass one,
because it is released on the heating placard, which is reached sooner on the higher
trajectory. This is the same behaviour as F5 on Falcon 9, now seen on four vehicles: the
six-DOF ascent comes out of max Q steeper than the flights, while the point-mass ascent tracks
the published altitudes (Ariane 64: 87.1 km against 87 km at booster separation, 128.5 km
against 127 km at the fairing).

### Soyuz-2.1a flies its stored pitch programme (2026-10-01)

**The request.** Fly Soyuz-2.1a as the real one flies: its attitude, the fairing's and the core's
separation heights, the abort apogees. Never fly an attitude the real vehicle cannot. The method
is written down for the other vehicles in [FLIGHT-PROFILE-METHOD.md](FLIGHT-PROFILE-METHOD.md).

**Sources and their roles.** Each source has one role, so that none is both a target and a
check.

| source | role |
| --- | --- |
| Arianespace, Soyuz CSG User's Manual (Issue 2, 2012; Issue 2.1, 2018), Fig. 1.5.1a | input: engines and stage loads |
| the same, Fig. 2.3.1a (2.1b's sequence) | input: the strap-ons' step at T+112.0 s, the 0.4 s separation delay; 2.1b's own times |
| the same, Fig. 3.2.1a (acceleration) | derived: the step's 81 %, the pad start; the rest of the trace a check |
| the same, Fig. 2.3.1c (2.1b's altitude and speed) | check: Soyuz-2.1b flown on 2.1a's programme, unfitted |
| Starsem, Soyuz User's Manual (2001), Fig. 2-4 | input: the programme's shape; its altitude curve not used (it disagrees with its own pitch) |
| SoyCOM (the Soyuz Crew Operations Manual, Soyuz-FG) | check, loose: max Q, the state at GK-1 and GK-2 (another rocket) |
| RussianSpaceWeb, Soyuz MS-16 to MS-28 | times: inputs (tower, fairing, cut-offs, skirt); 79 km and 157 km: fit targets; impacts: checks |
| Andrienko, Tropova and Chadaev (Problemy Upravleniya 2013) | input: the strap-ons cut off by command, never at depletion |
| Khorolsky (2011) | input: the R-7 flies its first two stages on a stored pitch programme |
| RKTs Progress (via RussianSpaceWeb) | input: 7 430 kg to 200 × 240 km at 51.6° |

**What changed, in the order the method takes it.**

1. *Data* (`src/data/parts.ts`). The RD-107A and RD-108A are Arianespace's figures; the RD-108A
   was 921.9 kN in vacuum, 7 % low, which left the core 2.4 % slow. The strap-on and core loads
   close on the published gross masses, the hydrogen peroxide counted as propellant (the
   published Isp covers the whole flow; the acceleration trace gives about 1 600 kg/s for the
   whole first stage, 1 622 on this reading and 1 672 with the peroxide as extra flow) and the
   nitrogen as dry mass. The 87 000 kg core load, held to the clock, is gone.
2. *Propulsion and events* (`src/data/vehicles.ts`). The strap-ons step to 81 % at T+112.0 s
   (`BoosterGroupSpec.thrustSteps`) and are cut off by command at T+117.45 s; the core by GK-2 at
   T+285.05 s (`StageSpec.cutoffAt`); a 2 s pad start (`VehicleSpec.padBurnS`). The propellant
   left at the cut-offs is a prediction and came out inside its bands: 1.03–1.05 t per strap-on
   (0.3–1.3 t expected), 1.3 % of the core (0–2 %), 306.8 t and 1.39 g at liftoff (306–313 t,
   1.36–1.40 g). A crewed flight carries its 1 740 kg escape tower to T+113.5 s (flown
   113.45–113.70 s); Blok I drops its aft skirt 11.07 s after it lights.
3. *Guidance* (`GuidanceParams.pitchProgram`). The R-7's own structure: a stored programme for
   the strap-ons and the core, flown in both flight models, then the closed loop on Blok I from
   T+285.1 s. Pitch is above the local horizon on the launch azimuth; a plane fixed in inertial
   space was tried and left the pad's eastward speed across it (0.8° of RAAN off an ISS target,
   up to 9° of yaw on Blok I).
4. *Fit*: two scalars for two targets (the register in §1). Zero-angle iterations of the
   high-q segment were tried and lofted the trajectory away from both targets; Starsem's shape
   holds the angle at −1.4 to +0.6° and was kept.

**Flyability.** Six-DOF, Soyuz MS-25, calm: max Q 35.7 kPa at T+63 s (the R-7's 3 700 kgf/m²,
36.3 kPa, SoyCOM), at most 1.4° of angle while q > 2 kPa, q·α at most 47 kPa·deg (the steering
is allowed 120), the body turning at most 1.1 °/s (on Blok I's closed loop), the aerodynamic
table left only under 1 Pa. The same table reaches orbit in the reference crosswind and shear
(at most 1.5° while q > 2 kPa; the wind across the pad gives 8–9° at T+15 s, under 1 kPa) and at
3 t and 7.43 t (2.1° and 1.4°), each to 199.9–200.0 × 239.3–239.9 km. Held by `tests/rigid-soyuz-programme.test.ts`; the sequence by
`tests/r7-sequence.test.ts`.

**Held-out checks.** Fixed before the fit; nothing was refitted to pass them.

| check | model (six-DOF / point mass) | reference | |
| --- | --- | --- | --- |
| speed at strap-on separation | 1.70 / 1.71 km/s over the ground | 1.64–1.75 km/s | met |
| peak acceleration on stage I | 4.10 g | at most 4.3 g (Arianespace); 3.5 g at GK-1 on Soyuz-FG (SoyCOM) | met |
| max Q | T+63 s, 11.0 km | T+65 s, 11.1 km (SoyCOM) | met |
| speed at the fairing | 1.92 / 1.93 km/s over the ground | 1.90–1.93 km/s | met |
| strap-on impacts | 320–375 / 361 km | about 350 km | met |
| fairing impact | 490 / 493 km | about 500 km (loose) | met |
| core impact | 1 377 / 1 415 km | about 1 550 km | **missed**, −11 % |
| speed at core separation | 3.85 / 3.87 km/s over the ground | 3.65–3.8 km/s | **missed** by 0.05 km/s |
| third-stage cut-off | T+526.4 / 526.7 s | T+525.9 s | met |
| insertion | 199.9 × 239.6 / 199.8 × 240.6 km | 200 ± 2 × 242 ± 5 km | met |
| the rating: 7 430 kg | 200.0 × 237.5 km | to 200 × 240 km | met |
| Blok I's attitude | its closed loop lifts the nose from 10° to 35° above the horizon, then down to −3° | Starsem: smooth, 12° to −10° | **missed** |
| aborts | MS-10 108 km, 18a 167 km (PHYSICS.md §8.3) | 93 km, 192 km | MS-10 met loosely, 18a **missed** |
| Soyuz-2.1b on the same programme, unfitted | T+117.9 s: 47.2 / 45.0 km, 1.66 / 1.68 km/s; T+286.4 s: 153.2 / 142.2 km, 3.61 / 3.66 km/s | 43.2 km, 1.72 km/s; 144.7 km, 3.65 km/s (Arianespace Fig. 2.3.1c, to GTO from Kourou) | met within 10 % |

**Disagreements, pinned.**

- *Hot staging is not modelled.* The model separates the core as it cuts off, 2.65 s before the
  flown separation (287.70 s), so the core-separation event is that much early.
- *The core falls 11 % short.* Probably the same cause as the speed at separation and the climb
  angle of 5° there: SoyCOM's Soyuz-FG is at 168 km and about 6° at GK-2. With 79 km at the
  fairing and 157 km at separation both held, about 5° is what a monotonic turn allows.
- *Blok I's closed loop is not Starsem's smooth programme.* It flies the closed loop's own
  answer to a 200 × 242 km insertion.
- *The 18a abort* comes out 25 km low: another rocket (the 1975 11A511) and a failure the model
  does not fly (its Blok I pushing the core it could not shed).

### Soyuz-2.1a: hot staging, and a crewed and a cargo flight (2026-10-01, second pass)

**The request.** Finish Soyuz: build the hot staging as the real vehicle does it; fly the crewed
payload section's own fairing (3.0–3.7 m, not the commercial flights' 4.11 m); separate the
profiles by mission (Progress drops its fairing at T+183 s, a crew at about T+153 s); and bring
MS-10's abort apogee to about 93 km by the head's mass.

**Sources and their roles (added).**

| source | role |
| --- | --- |
| RussianSpaceWeb, Progress MS-19 (TsUP's nominal cyclogram) | input: Blok I's ignition, the core's cut-off and separation, the skirt (286.159 / 286.399 / 287.419 / 296.779 s) |
| RussianSpaceWeb, Progress MS-15 to MS-34 | input: the cargo fairing at T+183.2 s (183.06–183.52 s); 143 km at core separation: fit target; 43 and 91 km: checks; 193 × 240 km: the insertion |
| RKTs Progress (via RussianSpaceWeb) | input: the cargo payload section 11S517A2's 3.0 m fairing |
| Arianespace, Soyuz CSG User's Manual (2012), Table A5-1 | derived: the two payload sections' lengths and the crewed head with its tower, from the drawing |
| Arianespace, the same, Fig. 3.2.1a | check: the drag (Soyuz-2.1b's acceleration through max Q) |
| KTRV (MKB Iskra's parent) | input: the fairing motors РДГ 860М, 4 × 56 kg, about 3 s, 2.4–4.5 tf |
| Roscosmos, MS-10 timeline and briefing (1 November 2018) | input: the abort 3.57 s after the strap-ons separated; the core's tail section torn off |

**Hot staging** (`StageSpec.hotStage`, src/physics/sim/staging.ts). Blok I lights 0.24 s before
the core's commanded cut-off, on the core's integrator, while still attached; both stages thrust
through the overlap, the core tails off attached and separates 1.02 s after its cut-off; the
stored programme holds the attitude to the separation and hands Blok I the closed loop there. The
six-DOF body carries both stages' chambers. Its effect on the trajectory is small (the core's
tail-off is no longer lost with its debris, Blok I starts 1.26 s earlier); its effect on the
sequence is the 2.65 s by which the core used to separate early. Starsem's and Arianespace's
prose ("about 2 seconds before shutdown of the central core") is not borne out by any timed
sequence and is not flown. Off on every other vehicle: their fingerprints are bit-identical.

**Two payload sections, three profiles.** The vehicle is its cargo configuration (11S517A2: the
3.0 × 10.4 m fairing at T+183.2 s and the Progress MS-19 cyclogram), which every payload but a
crew flies. A crewed launch flies `crewedProfile`: the crewed fairing (11S517A3) under the
escape tower at T+153.3 s and the crewed cyclogram. A Progress MS (`progress`, 7 430 kg, put into
193 × 240 km) flies `cargoShipProfile`: its own programme. Every other payload flies the crewed
programme, which separates the core higher and leaves Blok I room for other orbits; on the cargo
one a 6.3 t, 200 km circular single burn ended 197 × 215 km and the 250 km cells 100 km off. The
owner's "11S517A2" for the crewed fairing is the cargo one in RussianSpaceWeb's flight tables;
the crewed one is A3, the same 3.0 m class in Arianespace's drawing. Soyuz-2.1b's fairing goes at
Arianespace's T+208.4 s (it was the crewed 157 s).

**Drag, checked before fitting.** Soyuz-2.1b with the 4.11 m fairing follows Arianespace's
acceleration trace within 1 % through max Q (1.839 / 1.833 / 1.855 g at T+45 / 50 / 55 s, against
1.828 / 1.841 / 1.869 g). The 3.0 m fairings take 18 % off the stack's drag area, and the stack
climbs higher for it: a zero-lift turn that keeps max Q under SoyCOM's 3 700 kgf/m² (36.3 kPa)
puts the crewed fairing at 88 km, not 79. So the refit trades the two:

- *Crewed*: the programme's head scaled by a further 1.028 and its core lifted by 1.27° reach
  79.0 and 157.0 km in six-DOF (77.8 and 153.1 km as a point mass). Max Q is 37.2 kPa at T+62 s,
  2.5 % over SoyCOM's figure, which is the Soyuz-U's, at 1.5° of angle and 55 kPa·deg. Bringing
  79 km under 36.3 kPa needed 28–38° of pitch below the path and failed.
- *Cargo*: Progress flies lower and faster (about 43 / 91 / 143 km). Reaching all three needs
  38.3–38.6 kPa, where the model's load relief throttles an R-7 that never throttles for it (its
  integrators then run 0.3 s late). So the cargo programme takes the flattest strap-on phase that
  stays under the placard in six-DOF (× 1.05 over the crewed one, set by hand) and fits only its
  core to the 143 km: 143.0 km in six-DOF, 138.6 km as a point mass.

**The MS-10 apogee and the head's mass.** The head's mass cannot bring MS-10 to 93 km. A lighter
head gets more from the motors and climbs higher; from this 2.1a's state at the abort (50.6 km,
1.72 km/s, 33°) a crew with no motors at all coasts to about 97 km. The 4.2–4.5 t sometimes
quoted is the orbital and descent modules alone; what the fairing motors pull is about 5.4 t,
the upper fairing with them. What was wrong instead, and is fixed from sources: the fairing motors
had twice KTRV's impulse (280 kN for 2.6 s; now 135 kN for about 3 s, in pairs); the core kept
thrusting for the three seconds after the strike, where its tail section had been torn off; and
the abort came 3.57 s after the strike, not 3. MS-10 comes down from 102 km (108 before), 411 km
downrange (402 flown) at 7.9 g. The 9 km left are the launcher: MS-10 flew a Soyuz-FG, whose tower
went at 42 km against this 2.1a's 45.

**Results, both flights (calm, six-DOF / point mass).**

| | crewed (Soyuz MS-25) | flown | cargo (Progress MS-19) | flown |
| --- | --- | --- | --- | --- |
| strap-on separation | 117.9 / 117.8 s; 47.2 / 46.5 km | 117.85 s; about 45 km | 117.9 / 118.0 s; 46.7 / 45.8 km | 117.85 s; about 43 km |
| fairing | 153.3 s; 79.0 / 77.8 km | 153.3 s; 79 km | 183.2 s; 98.0 / 95.9 km | 183.2 s; about 91 km |
| Blok I lights; core cut-off; separation | 286.44 / 286.68 / 287.70 s | — / — / 287.70 s | 286.16 / 286.40 / 287.42 s | 286.159 / 286.399 / 287.419 s |
| core separation height | 157.0 / 153.1 km | 157 km | 143.0 / 138.6 km | 143 km |
| aft skirt | 296.12 s | 296.12 s | 296.78 s | 296.78 s |
| insertion | 199.9 × 239.8 / 199.9 × 240.4 km | 200 ± 2 × 242 ± 5 km | 192.8 × 238.1 / 191.9 × 237.4 km | 193 ± 2 × 240 ± 7 km |
| max Q; largest angle in high q | 37.2 kPa; 1.5° | under 36.3 kPa (SoyCOM, Soyuz-U) | 37.9 kPa; 1.8° | — |

**Blok I's attitude, re-judged.** The comparison with Starsem's smooth 12° → −10° was wrong:
Starsem's Fig. 2-4 is its suborbital profile, whose Blok I falls back short of orbit with the
Fregat on it (Starsem User's Manual, §2.3.1). A Blok I that inserts directly has to climb: the
crewed one pitches up from 10° to 28° in the 15 s after separation and comes down to −1° at its
cut-off, and the cargo one, from a lower separation, holds the guidance's 35° limit for 90 s and
comes down to −12°. No published Blok I attitude for a direct insertion is known to check them.

**Disagreements, pinned (this pass).**

- *Max Q 2.5 % over SoyCOM's* on the crewed flight (above).
- *Progress's strap-on and fairing heights*, 3.7 and 7 km high (above).
- *MS-10 9 km high* (above); *18a 23 km low* (169 km against 192; the 1975 rocket, PHYSICS.md §8.3).
- *The tower's motor* is still the Soyuz-T system T-10-1 flew (1.05 MN for 1.55 s, for its
  14–17 g); KTRV gives today's ДУ САС 855М 1 930 kg, about 4 s, 45–73 tf. Not flown yet: it would
  move the T-10-1 scenario off its own rocket.
- *The jet's push on the core's dome* during the overlap is not modelled: Blok I's full thrust
  acts on the attached stack (Arianespace's 2.1b trace shows Blok I's acceleration before the
  separation; Starsem's shows a plateau), worth under 5 m/s either way.

**Found in passing: Soyuz-2.1b to sun-synchronous orbit ended off target.** 4 t to the 600 km SSO
preset from Plesetsk ended `off target` in both flight models. It was not the
ascent. In six-DOF it was the burn planner, which now flies the mission to its orbit (next
section); in the point mass it was the launch time. 2.1b's ascent reaches orbit in six-DOF on the
cases it used to fail (5 t to the ISS plane fell back on the kick; it reaches 412 × 424 km), and its
seven six-DOF matrix rows (LEO and the ISS plane at 25 and 50 %, GTO at 25, 50 and 90 %) all reach
their targets on the stored programme
(`tests/sixdof-fleet/vulcan-soyuz21b-falconheavy-longmarch3be.test.ts`, flown 2026-10-01).

### Soyuz-2.1b to sun-synchronous orbit: the burn order (six-DOF, 2026-10-01)

**The case.** Soyuz-2.1b/Fregat-M with 4 t (the `weather` satellite) to the 600 km SSO preset
(LTAN 10:30) from Plesetsk: six-DOF, calm, seed 20260919, launched in the LTAN window. The fleet
matrix has no row for it, because it flies 2.1b from Baikonur, and no Baikonur azimuth reaches the
orbit. The case is now `tests/sixdof-fleet/dedicated.test.ts`.

**What was wrong.** Three things, each set up by the one before.

1. *The parking orbit was high, not short.* The Fregat's first burn cuts off at T+1 062.8 s on an
   osculating 187 × 597 km. The 3 km under 600 km comes from the cut-off gate. An ascent to an
   elliptical insertion stops as soon as the apoapsis is within 3 km of the insertion apoapsis
   (`checkAscent`, `src/physics/sim/ascent.ts`). The apoapsis is still rising by several kilometres
   a second when it gets there, so the cut-off lands on that edge. That happens in both models, and
   inside the 12 km band. In the point mass that is the orbit. A six-DOF coast is flown under J2,
   and at 97.8°, 236 s past the perigee, the osculating apoapsis reads 20 km under the highest point
   the stage reaches. That point is 617.6 km, above the planner's 609.6 km.
2. *The planner lowered that apex before circularising.* It planned a 5 m/s retrograde trim at the
   next J2 perigee, then the 115 m/s circularisation at the apex. The perigee had passed 236 s before
   the cut-off, so the trim waited a revolution (5 307 s). It also turned the stage retrograde and
   back.
3. *The Fregat ran out of attitude gas.* The model gives it 60 kg (an estimate, `STAGE_RCS`). The
   first burn, which the Fregat steers on its jets (its engine is fixed), and the settling after it
   took about 30 kg. A held coast costs nothing: the tank stayed at the same mass through 4 900 s of
   coast. The two turns took the other 30 kg, 23 kg of it before the first had finished. The coast
   loop turns the 7.1 t stack (42 000 kg·m² across) at up to 4.6 °/s, overshoots retrograde by 49°,
   and swings back and forth for two more minutes before it settles. A turn paced to the 240 s
   pre-orientation would cost about 2 kg or less. With the Fregat's tank empty, its component left
   the configuration, and the coast took that for a new planning context. It re-planned from the
   osculating apoapsis of the moment: 583 km, on an orbit whose apex the trim had just put at
   600 km. The result was an 8 m/s trim another revolution later. The stage could not turn for it:
   `evt.burnAlignmentTimeout` came after 240 s (the floor, since an empty tank has no stopping time
   to allow for), and the mission ended off target at T+12 157 s on 188 × 600 km.

The point mass's `off target` came from the launch time. The finding was measured at the fixed epoch
2026-09-15 12:00 UTC, and the plane reached from there is 81.5° of RAAN away from the LTAN plane.
The RAAN was its only miss, and in the window it reaches its orbit (below).

**What changed** (`src/physics/sim/burns.ts`; six-DOF only, the point mass is untouched).

- *The last shaping burn goes before the trim of an apex outside the band.* This applies when the
  apex is outside the band the orbit is judged on (Soyuz's 617.6 km against 612 km), and the
  shaping burn is the last one and one aimed impulse can fly it: no plane change left, and one pass
  (`aimableShape`, the test the aimed circularisation already used). It is then flown first, at the
  apex, aimed at the target perigee as the lowest altitude of the next revolution. The
  end-of-mission correction (`finalPhysicalCorrection`), which flies for an orbit outside that
  band, then brings the apex down at the perigee. That is one turn to retrograde and none back. The
  conic planner already puts a high apoapsis in this order (`planBurns`). In every other case the
  apex is lowered first, as before. That includes a plane change or a multi-pass burn still to
  fly, and an apex above the planner's band but inside the judged one. In that last case the
  circularisation would leave the apex where it came out, with nothing left to correct it. A
  first version of this change did it anyway, and the Soyuz-2.1b Monte Carlo set at 500 km
  (`tests/heavy/monte-carlo-soyuz21b.test.ts`) ended its runs 500.0 × 508.1–508.9 km instead of
  498.4 × 501.5 km, which widened the perigee's 3σ to 9.1 km against the set's 8 km.
- *The attitude gas is not a planning context* (`rigidOrbitContext`). A tank that runs dry no
  longer makes the coast re-plan.

**Results.** Soyuz-2.1b, 4 t:

| flown | point mass | six-DOF before | six-DOF after |
| --- | --- | --- | --- |
| in the LTAN window | target orbit, 597.1 × 597.1 km, T+3 563 s | off target, 188.0 × 599.9 km, T+12 157 s (`evt.burnAlignmentTimeout`) | **target orbit, 597.9 × 602.2 km, T+6 436 s**, 1 119 m/s left |
| at 2026-09-15 12:00 UTC | off target on RAAN only (232.3° against 150.8°), 597.1 × 597.1 km | not re-flown | off target on RAAN only (232.5°), 597.9 × 602.2 km |

Electron to the same orbit takes the same branch (apex 612–625 km). In the six-DOF fleet matrix it
now reaches the orbit 39–45 minutes sooner, and nearer its middle:

| six-DOF fleet row | before | after |
| --- | --- | --- |
| electron/sso/25 | 595.3 × 603.3 km, T+8 847 s | 597.2 × 602.8 km, T+6 517 s |
| electron/sso/50 | 594.9 × 603.1 km, T+8 876 s | 597.3 × 602.7 km, T+6 513 s |
| electron/sso/90 | 595.3 × 601.9 km, T+9 344 s | 598.1 × 601.9 km, T+6 653 s |

The six-DOF fleet matrix and its dedicated missions (`npm run test:sixdof-fleet`, 164 tests, flown
2026-10-01) pass with this change. Nine flights reach the high-apex branch:

- *Six circularise first*, with the apex outside the band: Electron's three SSO rows (619–625 km)
  and its ISS-plane row at 25 % (430.3 km), Long March 2D's 650 kg SSO mission (621.9 km) and this
  mission (618.0 km).
- *Three still lower first*, with the apex inside the band: Soyuz-2.1b's LEO and ISS-plane rows
  at 25 % (508.5 and 428.3 km) and Electron's ISS-plane row at 50 % (429.9 km).

The matrix was first flown with all nine circularising first. Re-flown with the final rule, the
three that lower first end as they did before this change: 498.4 × 501.6, 418.4 × 421.6 and
417.4 × 422.1 km. So do the heavy tests that fly Soyuz-2.1b's 25 % LEO row:

- its Monte Carlo set: 25 of 30 runs on target, perigee and apogee 3σ 7.2 and 7.6 km, the same as
  without the change;
- its flexible flight;
- its PEG and IGM flights.

The flexible Long March 2D and Electron flights and Electron's PEG and IGM flights passed under
the first version of the rule.

None of the others reached that branch; the rows that raise a low apex first fly as they did. No
tank ran dry on a coast with a burn ahead.

**What remains.**

- *The margin is the Fregat's attitude gas.* It reaches its orbit with 0.16 kg of its 60 kg left;
  the 10 kg aboard after that are the spacecraft's. The one turn left costs 25 kg. This change
  leaves alone how the coast loop turns a stage this weak, and the 60 kg is an estimate. Either one
  moving could take the mission back off target.
- *The six-DOF ascent still cuts off on the osculating apoapsis.* Under J2 that puts a near-polar
  parking orbit's apex up to 20 km from the insertion apoapsis, and the planner absorbs it with an
  apex correction. Cutting off on the physical apex would change every six-DOF row with an
  elliptical insertion. It is not done here.
- *Both models cut off 3 km under the insertion apoapsis*, by construction of the gate. That is
  inside the band and is not changed.
- *A six-DOF re-plan still reads the osculating apsides* (`replanRemainingBurns`). A coast that an
  operator's command, a separation or an engine failure re-plans starts from the orbit of that
  instant. Only the empty tank, which changes none of those, no longer triggers a re-plan.

Held by `tests/rigid-orbit-planning.test.ts` (the order, and the empty tank) and
`tests/sixdof-fleet/dedicated.test.ts` (the mission).

### Soyuz-2.1a's strap-ons fly a zero-lift turn (six-DOF, audit PHY-01)

*Superseded on 2026-10-01 by the stored programme above. This is what an operator who edits the
six-DOF pitch-over flies in its place.*

**What was wrong.** Soyuz MS-25 in six-DOF handed its steering over to the closed loop in the
usual way, blended in from 12 kPa and complete at 4 kPa. From T+90 s that loop asked for a nose
that ran down to 7° above the horizon while the stack, strap-ons still on, climbed at 45–60°.
The load relief held the command at the edge of the aerodynamic table, 15° from the relative
wind, and the stack pitched down from 59° at T+90 s to 26° at T+120 s, at up to 3.0 °/s, with a
flow angle of 11–14° at 4–6 kPa. At 500 Pa the relief lets go, and after the strap-ons left the stack swung to
25° while the dynamic pressure was still 130–400 Pa. `evt.aeroEnvelopeExceeded` was recorded at
T+123.5 s and 374 Pa, on a crewed flight. PHYSICS.md and IMPLEMENTATION-STATUS had carried it as
"the late first-stage pitch-down" for the guidance work (G01).

**What changed.** Data only, in `guidanceDefaultsSixDof` of `soyuz21a`
(`src/data/vehicles.ts`): the strap-ons fly their pitch programme as a zero-lift gravity turn
from a 6° kick (it was 4°), and the steering closes the loop at a fixed T+140 s
(`closedLoopStart`, the mechanism the Saturn V uses), twenty seconds after the strap-ons leave,
where the air is under 100 Pa and the command turns at the 1 °/s the model allows above the
atmosphere. Until the hand-over the turn holds the launch azimuth (`src/physics/guidance.ts`,
six-DOF only), as the R-7's lateral stabilisation held the stack in its firing plane. The
point-mass programme is unchanged.

**Why the azimuth is held.** Following its own ground track for 140 s, the six-DOF stack let the
wind and its attitude loop turn its plane, and the closed loop, which steers into the plane with
the target inclination through wherever the vehicle is, cannot take that back. Soyuz-2.1a to the
ISS (the quick-start mission, `tests/heavy/delivered-soyuz-wind.test.ts`), RAAN off the target at
spacecraft separation:

| | calm | crosswind | shear |
| --- | ---: | ---: | ---: |
| before (kick 4°, closed loop from ~4 kPa) | 0.32° | 1.05° | 0.96° |
| kick 6°, closed loop at T+140 s, following the ground track | 0.76° | 2.05° | 1.87° |
| **the same, holding the launch azimuth (chosen)** | **0.13°** | **0.14°** | **0.14°** |

The band is 1.5°; the middle row missed it in both winds at the end of the mission (1.9° and
1.7°). Holding the azimuth leaves the flow angle at most 0.7° and moves the other figures below by
under 1 km and 1 s.

**How it was chosen.** Soyuz MS-25 flown in six-DOF, calm, from the pad to spacecraft
separation. Flow angle: from T+20 s until the dynamic pressure is under 100 Pa after max Q.
Altitudes at T+153.3 s (the flown fairing time) and at core separation.

| six-DOF programme | largest flow angle | peak pitch rate after T+60 s | left the aero table | altitudes, km | orbit |
| --- | ---: | ---: | --- | ---: | --- |
| kick 4°, closed loop from ~4 kPa (before) | 14.3° with strap-ons; 24.9° after, at 132 Pa | 3.0 °/s at T+92 s | T+123.5 s, 374 Pa | 94.6 / 182.8 | reached |
| kick 5–7°, closed loop from ~4 kPa | 14.3°; 14.6° | 3.0 °/s | T+306 s, in vacuum | 87.4–83.2 / 172.3–166.5 | reached |
| kick 4°, closed loop at T+122 s | 0.4°; 28.8° | 5.2 °/s | T+127.6 s, 97 Pa | 107.6 / 207.2 | **missed** (perigee −190 km) |
| kick 6°, closed loop at T+122 s | 0.6°; 31.8° | 5.1 °/s | T+127.5 s, 265 Pa | 95.7 / 188.2 | reached |
| kick 6°, closed loop at T+140 s | 0.6°; 0.3° | 1.0 °/s at T+158 s | T+161 s, under 1 Pa | 97.1 / 199.7 | reached |
| **the same, holding the launch azimuth (chosen)** | **0.6°; 0.5°** | **1.0 °/s at T+158 s** | **T+162 s, under 1 Pa** | **97.1 / 199.1** | reached |
| kick 7°, closed loop at T+140 s | 0.6° (1.9° at max Q); 0.3° | 1.0 °/s | T+161 s, under 1 Pa | 95.8 / 196.6 | reached |
| kick 7.5°, closed loop at T+140 s | — | — | — | — | **broke up** at max Q (T+58 s) |
| kick 6°, turn limit 1 °/s, closed loop at T+140 s | calm 0.6°; crosswind 31.6°, shear 35.0° at hand-over | 4.0–4.7 °/s in wind | | calm 93.1 / 190.5 | reached |

- **The second row** is why the altitudes do not decide it. A larger kick with the old
  hand-over brings both nominal altitudes to about the edge of tolerance, by flying the same 14° at 5–10 kPa
  and the same 3 °/s pitch-down. That is F5's point-mass dive again: a good altitude from an
  attitude the vehicle cannot fly.
- **The kick.** 4° with the late hand-over lofts the core out of reach of its orbit. Above 7°
  the programme's 0.5 °/s turn limit holds the nose above a turn that wants to fall faster, the
  flow angle grows through max Q, and at 7.5° the stack diverges at 36.6 kPa. 6° keeps 1.5° of
  margin to that and 1.2° of flow angle at max Q (36.7 kPa, under the 40 kPa placard). Lifting the
  turn limit instead (last row) lowers the calm trajectory but lets a crosswind or shear flatten it
  until the air is still thick at the hand-over.
- **The hand-over.** At T+122 s, just after the strap-ons, the air is still a few hundred
  pascals and the closed loop swings the stack 30° at 5 °/s. By T+135–140 s it is under 100 Pa.
- **The chosen programme, elsewhere.** Crosswind and shear (the reference winds): at most 0.6°
  with the strap-ons and 0.5° after, 1.0 °/s, 93.7–94.7 / 190.9–193.3 km. Payloads of 3 t and
  7.43 t (the rating) from Baikonur, 4 t to SSO from Plesetsk, 6 t to 240 km from Vostochny: at
  most 0.7°, 1.0 °/s, the table left at T+161.7–162.1 s under 1 Pa, every orbit reached.

The criteria were the flow angle, the pitch rate, the table and reaching orbit; the altitudes
were looked at and did not decide it. So this is a choice of programme on physical grounds, not a
value fitted to the flight.

**What it costs.** The six-DOF core now separates 199.2 km up against the nominal 157 km, 16 km
further out than before (the table above, §3 Results). Both altitudes were outside tolerance
before and are now, so `tests/heavy/validation-timelines.test.ts` lists the same rows. A flatter
zero-lift turn would need more authority at max Q than the model's R-7 has; the real strap-ons
also steer with an air vane each, which the model does not have, so that is one place to look.
It was held by `tests/rigid-soyuz-strapon-turn.test.ts` (flow angle under 2°, pitch rate under
1.5 °/s, the table left only under 10 Pa, the strap-ons on the flown clock), which became
`tests/rigid-soyuz-programme.test.ts` with the stored programme; the plane by the delivered-orbit
matrix in the reference winds.

**Found in passing, not changed.** In the crosswind and shear reference winds every Soyuz
programme, old and new, records `evt.aeroEnvelopeExceeded` at T+0: the wind across the pad
before the stack has any speed gives a flow angle near 90° at 33 Pa.

## 4. Eight more flights: published timelines

Found 2026-09-26. Primary sources were used where one exists. Where the timeline was planned
before flight, the table says so; only H-IIA F50's is as flown. The same tolerances apply. Speeds
are graded only where the source states the frame, which here is PSLV's "inertial velocity".
Soyuz-2.1b, Long March 2D, 3B/E and 5, Vulcan and Starship are not included. Either nothing
reachable gave a flight-specific timeline with its payload, or the only source was third-hand.

| flight | source | kind |
| --- | --- | --- |
| **Atlas V 551, Juno**, 2011-08-05, SLC-41, 3 625 kg | [ULA mission booklet](https://www.ulalaunch.com/docs/default-source/news-items/av_juno_mob.pdf); payload mass from Wikipedia | primary, planned. Juno went to Earth escape; the model flies its standard GTO from SLC-40, which does not change the first stage. |
| **PSLV-XL C52 / EOS-04**, 2022-02-14, FLP, 1 735.6 kg to 529 km, 97.5° | [ISRO mission brochure](https://www.isro.gov.in/media_isro/pdf/Missions/pslv-c52-eos-04-v4.pdf), with altitudes and inertial velocities | primary, planned |
| **H3-22S F3 / ALOS-4**, 2024-07-01, LP2, ~3 t to 613 km, 97.9° | [JAXA launch plan](https://www.jaxa.jp/press/2024/04/files/20240426-1_01.pdf), with altitudes; its speeds do not state a frame | primary, planned |
| **H-IIA 202 F50 / GOSAT-GW**, 2025-06-29, ~2.6 t to 666 km, 97.03° | [JAXA/MHI flight results to MEXT](https://www.mext.go.jp/content/20250703-mxt_uchukai01-000043486_000002.pdf) | primary, **as flown** |
| **Vega-C VV25 / Sentinel-1C**, 2024-12-05, Kourou, 2 286 kg to ~700 km, 98.19° | Arianespace/Avio launch kit (newsroom.arianespace.com, VV25) | primary, planned |
| **Proton-M / Briz-M, Telstar 14R**, 2011-05-20, Baikonur 39, ~5 000 kg to GTO | [ILS mission overview](https://www.ilslaunch.com/wp-content/uploads/2018/09/T-14R-Mission-Overview-final.pdf) | primary, planned |
| **Falcon Heavy, Arabsat-6A**, 2019-04-11, LC-39A, 6 465 kg | SpaceX timeline via [Spaceflight Now](https://spaceflightnow.com/2019/04/10/launch-timeline-for-falcon-heavys-second-flight/) | secondary, planned |
| **Angara-A5 flight 2**, 2020-12-14, Plesetsk 35, 2 406 kg | [RussianSpaceWeb](http://www.russianspaceweb.com/angara5-flight2.html), cross-checked by Spaceflight Now | secondary, planned |

The code is in `tests/validation/reference-data.ts`. The pinned disagreements are in
`tests/validation/timelines.test.ts` (point mass) and `tests/heavy/validation-timelines.test.ts`
(six-DOF). The point-mass model agrees on 41 of these 71 rows, the six-DOF model on 39 (39 and 37 before
F14's fairing rule).

### Results

**Atlas V 551 Juno (planned)**

| milestone | unit | published | point mass | six-DOF | tolerance |
| --- | --- | ---: | ---: | ---: | ---: |
| maxQ time | s | 46.4 | 41.8 (−10 %) | 42.1 (−9 %) | ±4.6 |
| srbSep time | s | 104.0 | 97.1 (−7 %) | 97.2 (−7 %) | ±10.4 |
| fairing time | s | 204.9 | 156.7 (−24 %) ✗ | 151.2 (−26 %) ✗ | ±20.5 |
| beco time | s | 267.2 | 250.2 (−6 %) | 250.7 (−6 %) | ±26.7 |
| sep time | s | 273.2 | 253.2 (−7 %) | 253.7 (−7 %) | ±27.3 |
| mes1 time | s | 283.2 | 263.2 (−7 %) | 263.7 (−7 %) | ±28.3 |

**PSLV-XL C52 / EOS-04 (planned; speeds inertial)**

| milestone | unit | published | point mass | six-DOF | tolerance |
| --- | --- | ---: | ---: | ---: | ---: |
| glSep time | s | 69.9 | 69.2 (−1 %) | 69.3 (−1 %) | ±7.0 |
| glSep altitude | km | 26.9 | 35.0 (+30 %) ✗ | 35.1 (+30 %) ✗ | ±5.0 |
| glSep speed | m/s | 1304 | 1234 (−5 %) | 1234 (−5 %) | ±135 |
| alSep time | s | 92.0 | 94.2 (+2 %) | 94.3 (+2 %) | ±9.2 |
| alSep altitude | km | 48.0 | 66.7 (+39 %) ✗ | 68.7 (+43 %) ✗ | ±8.2 |
| alSep speed | m/s | 1866 | 1433 (−23 %) ✗ | 1581 (−15 %) ✗ | ±192 |
| ps1Sep time | s | 109.7 | 107.3 (−2 %) | 107.4 (−2 %) | ±11.0 |
| ps1Sep altitude | km | 68.9 | 83.0 (+20 %) ✗ | 87.9 (+28 %) ✗ | ±11.3 |
| ps1Sep speed | m/s | 2143 | 1512 (−29 %) ✗ | 1604 (−25 %) ✗ | ±219 |
| ps2Ign time | s | 109.9 | 108.3 (−1 %) | 108.4 (−1 %) | ±11.0 |
| heatShield time | s | 150.3 | 121.6 (−19 %) ✗ | 115.8 (−23 %) ✗ | ±15.0 |
| heatShield altitude | km | 115.5 | 99.7 (−14 %) | 99.7 (−14 %) | ±18.3 |
| heatShield speed | m/s | 2381 | 1543 (−35 %) ✗✗ | 1586 (−33 %) ✗✗ | ±243 |
| ps2Sep time | s | 262.5 | 257.1 (−2 %) | 257.3 (−2 %) | ±26.2 |
| ps2Sep altitude | km | 237.0 | 208.7 (−12 %) | 235.5 (−1 %) | ±36.6 |
| ps2Sep speed | m/s | 4033 | 4066 (+1 %) | 3902 (−3 %) | ±408 |
| ps3Sep time | s | 493.6 | 386.4 (−22 %) ✗ | 386.8 (−22 %) ✗ | ±49.4 |
| ps3Sep altitude | km | 450.7 | 245.9 (−45 %) ✗ | 280.7 (−38 %) ✗ | ±68.6 |
| ps3Sep speed | m/s | 5815 | 6289 (+8 %) | 6033 (+4 %) | ±587 |
| ps4Cutoff time | s | 1020.4 | 846.2 (−17 %) ✗ | 870.8 (−15 %) ✗ | ±102.0 |
| ps4Cutoff altitude | km | 534.0 | 198.0 (−63 %) ✗✗ | 256.1 (−52 %) ✗✗ | ±81.1 |
| ps4Cutoff speed | m/s | 7592 | 7878 (+4 %) | 7805 (+3 %) | ±764 |

**H3-22S F3 / ALOS-4 (planned)**

| milestone | unit | published | point mass | six-DOF | tolerance |
| --- | --- | ---: | ---: | ---: | ---: |
| srbSep time | s | 116.0 | 109.4 (−6 %) | 109.5 (−6 %) | ±11.6 |
| srbSep altitude | km | 44.0 | 44.9 (+2 %) | 46.3 (+5 %) | ±7.6 |
| fairing time | s | 210.0 | 201.6 (−4 %) | 176.1 (−16 %) ✗ | ±21.0 |
| fairing altitude | km | 120.0 | 105.3 (−12 %) | 100.4 (−16 %) ✗ | ±19.0 |
| meco time | s | 303.0 | 319.3 (+5 %) | 319.6 (+5 %) | ±30.3 |
| meco altitude | km | 278.0 | 156.6 (−44 %) ✗ | 171.7 (−38 %) ✗ | ±42.7 |
| stageSep time | s | 311.0 | 322.3 (+4 %) | 322.6 (+4 %) | ±31.1 |
| stageSep altitude | km | 296.0 | 157.6 (−47 %) ✗✗ | 172.6 (−42 %) ✗ | ±45.4 |
| seli1 time | s | 324.0 | 327.3 (+1 %) | 327.6 (+1 %) | ±32.4 |
| seli1 altitude | km | 324.0 | 159.2 (−51 %) ✗✗ | 174.1 (−46 %) ✗✗ | ±49.6 |
| seco1 time | s | 985.0 | 690.9 (−30 %) ✗ | 698.6 (−29 %) ✗ | ±98.5 |
| seco1 altitude | km | 613.0 | 200.0 (−67 %) ✗✗ | 200.0 (−67 %) ✗✗ | ±93.0 |

**H-IIA 202 F50 / GOSAT-GW (as flown)**

| milestone | unit | published | point mass | six-DOF | tolerance |
| --- | --- | ---: | ---: | ---: | ---: |
| srbSep time | s | 124.0 | 107.1 (−14 %) ✗ | 107.1 (−14 %) ✗ | ±12.4 |
| fairing time | s | 266.0 | 250.1 (−6 %) | 250.0 (−6 %) | ±26.6 |
| meco time | s | 400.0 | 390.6 (−2 %) | 390.7 (−2 %) | ±40.0 |
| stageSep time | s | 408.0 | 396.6 (−3 %) | 396.7 (−3 %) | ±40.8 |
| seli time | s | 417.0 | 402.6 (−3 %) | 402.7 (−3 %) | ±41.7 |
| seco time | s | 916.0 | 760.4 (−17 %) ✗ | 762.2 (−17 %) ✗ | ±91.6 |

**Vega-C VV25 / Sentinel-1C (planned)**

| milestone | unit | published | point mass | six-DOF | tolerance |
| --- | --- | ---: | ---: | ---: | ---: |
| p120Sep time | s | 142.0 | 135.8 (−4 %) | 135.9 (−4 %) | ±14.2 |
| z40Sep time | s | 272.0 | 230.7 (−15 %) ✗ | 230.9 (−15 %) ✗ | ±27.2 |
| fairing time | s | 304.0 | 220.2 (−28 %) ✗ | 220.0 (−28 %) ✗ | ±30.4 |
| z9Sep time | s | 428.0 | 357.3 (−17 %) ✗ | 353.6 (−17 %) ✗ | ±42.8 |

**Proton-M / Briz-M Telstar 14R (planned)**

| milestone | unit | published | point mass | six-DOF | tolerance |
| --- | --- | ---: | ---: | ---: | ---: |
| maxQ time | s | 62.0 | 52.2 (−16 %) ✗ | 52.4 (−15 %) ✗ | ±6.2 |
| sep12 time | s | 120.0 | 113.7 (−5 %) | 113.6 (−5 %) | ±12.0 |
| sep23 time | s | 327.0 | 331.6 (+1 %) | 331.5 (+1 %) | ±32.7 |
| fairing time | s | 347.0 | 342.6 (−1 %) | 342.5 (−1 %) | ±34.7 |
| sep3b time | s | 582.0 | 576.6 (−1 %) | 576.7 (−1 %) | ±58.2 |

**Falcon Heavy Arabsat-6A (planned)**

| milestone | unit | published | point mass | six-DOF | tolerance |
| --- | --- | ---: | ---: | ---: | ---: |
| maxQ time | s | 69.0 | 48.1 (−30 %) ✗✗ | 47.9 (−31 %) ✗✗ | ±6.9 |
| beco time | s | 150.0 | 134.0 (−11 %) ✗ | 134.0 (−11 %) ✗ | ±15.0 |
| boosterSep time | s | 154.0 | 136.0 (−12 %) ✗ | 136.0 (−12 %) ✗ | ±15.4 |
| meco time | s | 211.0 | 184.2 (−13 %) ✗ | 184.2 (−13 %) ✗ | ±21.1 |
| stageSep time | s | 215.0 | 187.2 (−13 %) ✗ | 187.2 (−13 %) ✗ | ±21.5 |
| ses1 time | s | 222.0 | 191.2 (−14 %) ✗ | 191.2 (−14 %) ✗ | ±22.2 |
| fairing time | s | 247.0 | 204.7 (−17 %) ✗ | 164.9 (−33 %) ✗✗ | ±24.7 |
| seco1 time | s | 528.0 | 513.0 (−3 %) | 517.9 (−2 %) | ±52.8 |

Measured with the data change of F11 below. Before it, side-booster cut-off came at T+122.7 s,
MECO at T+174.0 s (six-DOF 174.2 s), max Q at T+51.3 s and fairing jettison at T+180.2 s
(six-DOF 147.3 s).

**Angara-A5 flight 2 (planned)**

| milestone | unit | published | point mass | six-DOF | tolerance |
| --- | --- | ---: | ---: | ---: | ---: |
| stage1Cutoff time | s | 206.0 | 201.9 (−2 %) | 202.0 (−2 %) | ±20.6 |
| stage1Sep time | s | 209.0 | 202.9 (−3 %) | 203.0 (−3 %) | ±20.9 |
| stage2Cutoff time | s | 323.0 | 330.6 (+2 %) | 330.8 (+2 %) | ±32.3 |
| stage2Sep time | s | 326.0 | 331.6 (+2 %) | 331.8 (+2 %) | ±32.6 |
| stage3Ign time | s | 328.0 | 332.6 (+1 %) | 332.8 (+1 %) | ±32.8 |
| fairing time | s | 340.0 | 341.6 (+0 %) | 341.8 (+1 %) | ±34.0 |
| stage3Cutoff time | s | 746.0 | 729.5 (−2 %) | 732.6 (−2 %) | ±74.6 |
| brizSep time | s | 748.0 | 732.7 (−2 %) | 735.9 (−2 %) | ±74.8 |

The Proton-M and Angara-A5 fairing rows are measured with the jettison rule of F14, and Proton-M
with its published stage propellant loads (F14). On the heating placard and the earlier loads the
Proton rows were max Q 50.4 / 50.5 s, sep12 111.6 / 111.4 s, sep23 327.6 / 327.7 s, fairing
174.6 / 151.0 s and sep3b 572.6 / 572.9 s; Angara's fairing was 301.6 / 256.2 s, and its
third-stage cut-off and Briz-M separation 727.3 / 743.1 s and 730.6 / 746.3 s before the fairing
rule and its six-DOF kick (F14).

### Findings

**What agrees.**

- **Angara-A5:** every time is within 3 %, the fairing included since F14's rule.
- **Atlas V 551, Proton-M and H-IIA 202:** the staging times are within 7 % (Atlas V and Proton)
  and 3 % (H-IIA, as flown).
- **PSLV-XL:** the second-stage separation agrees in time, altitude and inertial speed.
- **Falcon Heavy:** SECO-1 is within 4 %.

**F11. Falcon Heavy's first stages cut off 11–13 % early.** Side-booster cut-off comes at
T+134.0 s against 150 s, and the core at T+184.2 s against 211 s, with everything after shifted
the same way. It was 18 % (T+122.7 s and T+174 s) before two data changes, applied 2026-09-27:

- *Published masses.* The side boosters are Falcon 9 first stages (Wikipedia's "Falcon Heavy":
  "three Falcon 9 derived cores"; SpaceX builds "a Falcon 9 first stage or Falcon Heavy side
  booster" on one line), and the core's tanks are a Falcon 9 first stage's. All three now carry
  F1's published 410.9 t, and the side boosters its 22.2 t empty mass. The core keeps its 28 t
  empty mass as an estimate, since none is published for the reinforced core. The lift-off
  stack comes to 1 420.3 t against the published 1 420 t; it was 1 381.5 t.
- *Falcon 9's max-Q bucket* (22 kPa, 75 %). The model's Falcon Heavy had none and peaked at
  34 kPa. Falcon Heavy Demo 1's webcast telemetry (the same dataset as §2, Block 3 hardware, so
  used for this and nothing else) shows the vehicle throttled down from T+38 to T+72 s and the
  dynamic pressure on a 20–23 kPa plateau, peak 22.9 kPa. With the bucket the model peaks at
  23.7 kPa.

The masses alone moved cut-off by 5 s (T+127.6 s), the bucket another 6 s. The pitch kick was
measured too (1.5° to 7°) and moves these times by about a second. What is left is the throttle
schedule of each core: burning 410.9 t at full thrust takes about 150 s, so a side booster that
cuts off at 150 s and still flies home, and a core that burns to 211 s and lands on a drone
ship, must both throttle deeper and longer than the model's (the core to 55 % from T+20 s).
SpaceX does not publish that schedule, and Arabsat-6A is the only Block 5 Falcon Heavy flight
here, so it is not fitted. The disagreement list is unchanged, and max Q moved 3 s earlier
(T+48 s against 69 s): a q-limited plateau puts the peak where the plateau starts.

**F12. PSLV-XL's first stage flies too steep.** At first-stage separation the model is at
1 512 m/s inertial against 2 143 m/s (−29 %), and 14 km higher. The stage and strap-on masses
agree with ISRO's brochure (139 t, 6 × 12.2 t), and so do the burn times. The second stage makes
up the speed (4 066 m/s against 4 033 at its separation). The real flight then climbs to 451 km
before the fourth stage lights; the model parks at 200 km, as in F6.

This was first put down to the thrust curve: the model flies every solid motor as a linear
taper about its published mean (PHYSICS.md §10). Measured on 2026-09-28, the curve is not the
cause:

- *The shape moves the impulse, not the total.* Flown with the S139's and the PSOM-XLs' peak
  factor at 1 (flat), at the shipped 1.43 / 1.53 and at 2, the stack gets the same ideal delta-v
  to T+107 s, 2 882–2 894 m/s. It reaches PS1 separation at 1 578, 1 515 and 1 494 m/s: all
  about 600 m/s short, and within 84 m/s of each other
  (`tests/validation/pslv-first-stage.test.ts`). The shipped peak also agrees with the published
  one: 3 400 kN × 1.43 = 4 862 kN against the S139's 4 847 kN maximum (Wikipedia, "S139
  Booster"). No published thrust-time curve was found for either motor.
- *The loss is in the trajectory.* The real flight gains 1 691 m/s by PS1 separation, so its
  losses are about 1 200 m/s; the model's are about 1 800 m/s. It climbs almost vertically
  (pitch 86–87° up to T+60 s) and is at 35 km by T+70 s, where the real vehicle was at 27 km.
  Once the dynamic pressure falls below 12 kPa, closed-loop guidance takes over and pitches the
  thrust down to 10–20° while the velocity still points about 70° up. Between T+70 and T+92 s
  the thrust turns the velocity rather than adding to it: 180 m/s gained for 600 m/s of ideal
  delta-v.
- *The pitch programme moves it.* A 25–30° kick instead of 1.5° puts the first-stage rows inside
  tolerance: 1 899–1 934 m/s at PS1 separation, 63–66 km. But the second stage then flies far too
  flat, 155–161 km at PS2 separation against 237 km. The real PSLV lofts through its second and
  third stages, as H3 does (F13). Matching it means reshaping the ascent profile as a whole,
  fitted on several PSLV-XL flights and checked on others, not on C52 alone. That is not done
  here.

**F13. H3 flies a far flatter first stage than JAXA's plan.** JAXA's plan reaches MECO at 278 km
and 3.6 km/s (frame not stated). The model reaches 157 km and 5.9 km/s. The gap is much larger
than any frame difference (about 0.4 km/s). The stage data agree with JAXA's table: 224.5 t,
2 942 kN, SRB-3 134.4 t. The real first stage lofts steeply and spends the difference on
gravity, and its second stage then burns for 661 s where the model's burns for 364 s. This is
guidance, not propulsion.

**F14. Fairing jettison: two operators' rules applied, two placard vehicles still early.** On a
heating placard the model drops the fairing where the free-molecular heating falls to
1 135 W/m². At first it did that on these flights:

| vehicle | model, point mass / six-DOF | published |
| --- | --- | --- |
| Atlas V | 157 s / 151 s | 205 s |
| Proton-M | 175 s / 151 s | 347 s (after second-stage separation) |
| Angara-A5 | 302 s / 256 s | 340 s |
| Falcon Heavy | 205 s / 165 s | 247 s |
| H3, six-DOF only | 176 s | 210 s |

Measured on 2026-09-28, the heating the model has at each published time spans 25 to 950 W/m²
(Electron 950, H3 638, Angara 342, Falcon Heavy 146, Atlas V 58, Proton 31, PSLV-XL 25). No single
lower threshold fits all of them, so the placard itself was not changed. What the operators'
documents say instead:

- *Proton-M and Angara-A5 are timed to the sequence, not to heating.* ILS's Proton Mission
  Planner's Guide (Rev. 7, 2009, §2.3.1) has the third stage lighting at 338 s and "PLF jettison
  typically at 348 s", and says jettison times "are constrained to occur so that fairing
  hardware will impact in designated areas" (§2.4.2); the 1 135 W/m² figure is only a ceiling.
  ILS describes Angara-A5's as "at the initial phase of Stage III operation", ten seconds after
  the core separated on the first flight (23 December 2014). Both now fly that rule,
  `fairing.sepAfterIgnition`: ten seconds after the Proton third stage lights, nine after the
  URM-2 does (it lights a second after separation). The rule comes from the operator's guide and
  from Angara's first flight; Telstar 14R and Angara flight 2 are the check. Proton comes off at
  T+342.6 / 342.5 s against 347 s (−1 %), Angara at T+341.6 / 341.8 s against 340 s. The Proton
  row is not fully independent of the guide's 348 s, since the model's third stage lights at
  332.6 s, near the flight's 327 s, but it is timed by the model's own staging.
- *The early jettison had been hiding a Proton shortfall.* Carrying the 2 t fairing to T+339 s
  instead of T+175 s costs about 110 m/s, and on its earlier stage data Proton-M no longer took
  90 % of its GTO rating (6.2 t) to orbit. Those data were short: the first and second stages
  carried 419.4 t and 156.1 t of propellant, with no source, against the published 428.3 t and
  157.3 t (Wikipedia, "Proton-M"). With the published loads the row flies again, with 425 m/s
  to spare, and every Telstar 14R row moves towards the flight (table above). The crew-ship
  flight (7.15 t, which stays beyond the stack) showed that the insertion floor did not cover a
  stack that never reaches SECO: it broke up at T+1 448 s instead of ending as an abandoned
  insertion. The floor now applies during the ascent once the first stage has gone (PHYSICS.md
  §6, "The insertion floor"); it ends at T+1 458 s.
- *And a six-DOF coast that could not reach its apex.* Angara-A5 to low orbit (6.1 t, six-DOF
  with PEG or IGM) now cuts its URM-2 off at 200.5 km, a kilometre past a 201.6 km apex, with a
  −602 km perigee. The next apoapsis is a revolution away through the Earth, the J2 coast
  prediction reported the impact and the mission ended there with the Briz-M full. With the
  placard the same cut-off came before the apex. The sequencer now burns at once when that
  prediction fails on a suborbital state, and the flight reaches its orbit at T+4 251 s.
- *And a six-DOF ascent that was already short.* Angara-A5 to the sun-synchronous preset (6.1 t,
  six-DOF) stopped reaching orbit: the Briz-M, burning from a suborbital cut-off, sank into the
  air during its first burn and the insertion was abandoned at 76 km with 3.1 km/s aboard. The
  sequencer was not the cause (keeping its thrust at or above the horizon changed nothing): the
  six-DOF ascent handed the Briz-M 257 m/s less than the point mass does (7 094 m/s at 250 km
  against 7 351 m/s at 190 km), which the placard's earlier jettison had been covering. As for
  Atlas V, the rigid body cannot hold the angle of attack the point mass pitches over at. A
  six-DOF kick (`guidanceDefaultsSixDof`) of 4–8° was swept on that case and 8° chosen, as the
  one leaving the most delta-v; it brings the held-out cases, low orbit at 25 % and the transfer
  orbit at 25, 50 and 90 %, to within 20 m/s of the point mass's remaining delta-v, where they
  had been up to 255 m/s short. No flight data was fitted: Angara's published timelines give
  times only, and every flight-2 row stays inside its tolerance.
- *Atlas V's criterion is a 3-sigma one.* ULA jettisons "when the 3-sigma free molecular heat flux
  falls below 1,135 W/m²" (Atlas V Launch Services User's Guide, Rev. 11, 2010, §2.3), on a
  dispersed atmosphere and trajectory. The model evaluates the same number on the nominal
  atmosphere, so it jettisons earlier. The guide's typical 500-series timelines put it at 206–212
  s, but for the 521, not the 551, so no time was applied. Falcon Heavy is in the same position.
  H3 agrees in point mass and is early only in six-DOF, where the trajectory differs.

Two fixed jettison times (`fairing.sepTime`) also do not match these flights: Vega-C's 220 s
against VV25's 304 s, and H-IIA's 250 s against F50's 266 s (inside tolerance).

**F15. Vega-C's second and third stages separate 15–17 % early**: T+231 s against 272 s, and
T+357 s against 428 s. The first stage agrees (−4 %). The kit gives only separation times, so it
cannot say whether the real stages burn longer or coast before separating.

**F16. H-IIA's SRB-A separation comes at T+107 s against 124 s as flown (−14 %), and SECO at
T+760 s against 916 s (−17 %).** MECO agrees within 2 %.

Max Q is early on Proton-M (−19 %) and Falcon Heavy (−30 %), the same pattern as Falcon 9 (F3).
Atlas V's max Q is inside its tolerance.

None of these was fitted. Each is a single flight, so there is nothing to hold out, and fitting
to one flight would turn the comparison into calibration.

## 5. The Orbit section (O01–O04): orbits, maneuvers and applications against published data

The Orbit section's playground (roadmap O01, [ROADMAP-PART2-3.md](ROADMAP-PART2-3.md)) carries
an orbit by Kepler's equation and, when asked, by the secular drift the Earth's oblateness gives
the node, the perigee and the mean motion, to first order in J2 (Vallado, *Fundamentals of
Astrodynamics and Applications*, §9.6). That is the whole model: no drag, no Sun or Moon, no
higher harmonics. The long-term propagator of P07 is the tool for those. The model is held to
closed forms and to the published figures of real orbits, in `tests/kepler.test.ts` and
`tests/orbit-playground.test.ts`. The tolerances were fixed before the comparison.

| quantity | reference | model | tolerance |
| --- | --- | --- | --- |
| geostationary radius, one turn per sidereal day | 42 164.2 km (closed form) | 42 164.2 km | 0.1 km |
| drift of that radius under J2 | — | 0.0268°/day east | — |
| mean semi-major axis that stands still under J2 | 42 166 km, a geostationary element set's | 42 166.3 km | 0.1 km |
| GPS period at 26 560 km | 11 h 58 min, half a sidereal day | 717.9 min | 20 s of half a sidereal day |
| Landsat WRS-2, 233 revolutions in 16 days: mean semi-major axis | 7 077.44 and 7 077.95 km, measured either side of Landsat 5's 1995 orbit correction (NASA, *Landsat Program Chronology*) | 7 077.72 km | ±0.5 km of that range |
| Landsat WRS-2: inclination | 98.2096° (USGS calibration parameter file LT05CPF_19900101_19900331) | 98.1863° | 0.05° |
| Landsat WRS-2: nodal period | 5 933.0472 s (the same file) | 5 933.047 s | 0.1 s |
| Sentinel-2, 143 revolutions in 10 days: mean altitude | 786 km (ESA, SentiWiki "S2 Mission") | 786.1 km | 3 km |
| Sentinel-2: inclination | 98.62° (the same page) | 98.54° | 0.1° |
| sun-synchronous inclination at 600 km | 97.8° | 97.79° | 0.05° |
| Molniya, 600 × 39 750 km at 63.4°: perigee drift | 0 at the critical inclination | < 0.01°/day | 0.01°/day |
| first and second cosmic velocities at the surface | 7.905 and 11.18 km/s | 7.905, 11.18 km/s | 1 m/s, 10 m/s |
| a slow cannon shot (100 m/s from 1 km) | range v√(2h/g), time √(2h/g) | both | 1 % |
| a 45° lob at 300 m/s from the ground | range v²/g | — | 1 % |

**Findings.**

- Landsat's "705 km" is a nominal altitude. It is not a height above the equatorial radius:
  the measured mean semi-major axis puts the orbit 699.6 km above it. The repeat condition
  gives the measured axis, not 705 km, and the test holds it to the measured one.
- The first-order J2 inclinations are 0.02° to 0.08° below the published ones. Second-order
  terms and the mean-element definition an operator uses are both of that size. This is the
  model's limit for the playground, and it is stated as such.
- The local time of the ascending node is taken against the mean Sun (the Astronomical
  Almanac's 280.460° + 0.9856474°/day), which is how a mission's LTAN is specified. The launch
  planner's `raanFromLtan` (src/physics/mission.ts) aims at the true Sun instead. Over a year
  the two differ by the equation of time, never more than 17 minutes
  (`tests/orbit-playground.test.ts`). The built-in flights were left as they are.
- The Watch tour's plain-language claims are each checked against the orbit the step shows, in
  `tests/orbit-playground.test.ts`:
  - the ISS "about an hour and a half, more than fifteen times a day, 7.7 km/s";
  - Molniya "under an hour of its twelve in the south" (0.9 h);
  - the geostationary satellite "over 78.5° E", holding within 0.05° for three days;
  - the sun-synchronous orbit "10:30 heading north", holding within a minute for 180 days.

### The maneuver planner (O02)

The planner (`src/orbit/maneuvers.ts`) builds every plan the way it would be flown. The orbit
is carried to the burn, the burn is added to the velocity there, and the new orbit is read off
the state. The closed forms sit beside the plans. The tests hold each plan to its closed form,
and both to worked examples. Burns are impulsive: no finite-burn or gravity losses.
`tests/maneuvers.test.ts` and `tests/maneuver-setup.test.ts` hold them.

| case | reference | model | tolerance |
| --- | --- | --- | --- |
| Hohmann, 191.344 11 → 35 781.348 57 km | Vallado Example 6-1: Δv 2.457 038 + 1.478 187 = 3.935 224 km/s, 5.256 713 h | same, as closed form and as a plan flown | 10⁻⁵ km/s, 10⁻⁴ h |
| bi-elliptic, 191.344 11 km via 503 873 km to 376 310 km | Vallado Example 6-2: Δv_a 3.156 233, Δv_b 0.677 358 km/s, 593.919 h | same | 10⁻⁵ km/s, 0.1 h |
| where bi-elliptic beats Hohmann | radius ratio 11.94 with the far point at infinity; 15.58 for any far point | the crossings fall between 11.8 and 12.1, and between 15 and 16 | — |
| Lambert, universal variables | Vallado Example 7-5; Curtis Example 5.2 | both velocities of each | 10⁻⁴ km/s, 10⁻³ km/s |
| Lambert round trip, short and long way | Kepler propagation of the solution | lands on r₂ | 1 m, 1 mm/s |
| plane change at a node | 2v sin(Δi/2) | same; burn at the equator, shape unchanged | 10⁻⁹ relative |
| GTO 250 × 35 786 km at 28.5° → GEO, one burn | law of cosines: 1.833 km/s | same | 10⁻⁹ relative |
| the same in three apogee burns | adds up to the one burn | same; perigee rising burn by burn, a revolution apart | 10⁻⁹ relative |
| phasing 20° in 3 revolutions | meets a target 20° ahead | within 1 m and 1 mm/s | — |
| deorbit from 400 km to a 50 km perigee | vis-viva | Δv; reaches 100 km at the time given | 10⁻⁶ m/s, 1 m |
| Edelbaum's spiral | Δv = √(v₀² + v₁² − 2v₀v₁ cos(πΔi/2)); coplanar |v₀ − v₁| | reaches v₁ and Δi exactly as the Δv runs out | 10⁻⁹ relative |
| a low-thrust plane change at constant radius | π/2 times the impulsive one | ratio π/2 | 10⁻³ |
| porkchop between coplanar circles, 400 and 800 km | Hohmann is the cheapest two-burn transfer | grid minimum ≥ Hohmann, within 25 % of it | — |
| a hyperbola (a transfer fast enough to escape) | two-body RK4, half-second steps | position, velocity | 1 m, 1 mm/s |

**Findings.**

- `propagateKepler` in src/physics/orbital.ts carries a hyperbola with a coarse fixed-step
  integration: 5 km off after ten minutes. The playground carries hyperbolas with hyperbolic
  Kepler instead, held to RK4. The launch simulator's function is left as it is: it does not
  meet hyperbolas in flight.
- `elementsFromState` leaves ω at 0 for an equatorial ellipse and measures ν from the perigee,
  so the elements do not give the state back. The playground's `orbitFromState` puts the
  perigee's longitude into ω instead, which the GTO→GEO plan needs after its plane change.
- A rendezvous is planned against a target in the chaser's own plane, at a chosen height and
  phase. A target in another plane (an ISS-like orbit from a Starlink-like one) costs over
  12 km/s whatever the timing, which teaches nothing about rendezvous: a real one starts with
  the launch into the target's plane.

### Continue in orbit (O03)

| case | reference | model | tolerance |
| --- | --- | --- | --- |
| the orbit a recorded Soyuz flight hands on | the flight's own state and elements at the hand-off | the playground's orbit gives back the state; perigee and apogee equal the flight's | 1 mm, 1 µm/s; 1 m |
| 1 000 kg, Isp 300 s, Δv 1 km/s | rocket equation: 288.2 kg; a 400 N engine runs 2 119 s | same | 0.05 kg, 1 s |
| three burns against one of their sum | Tsiolkovsky: the same propellant | same | 10⁻⁹ kg |
| tanks that run dry | the plan short by its Δv beyond what the tanks hold | the burn where they run dry, and the shortfall | 10⁻⁶ m/s |

`tests/budget.test.ts` and `tests/orbit-handoff.test.ts` hold them. A burn that lasts more
than a tenth of an orbit is flagged. The plan treats it as an instant kick, which a burn that
long only roughly is.

### What satellites are for (O04)

`src/orbit/applications.ts`, `tests/applications.test.ts`. The textbook formulas are those of
Maral & Bousquet's *Satellite Communications Systems* and of *Space Mission Engineering: The New
SMAD*. A dish's look angles are worked on the WGS-84 ellipsoid, "up" along its normal.

| case | reference | model | tolerance |
| --- | --- | --- | --- |
| a dish under a geostationary satellite | straight up; range 35 786 km | same | 10⁻⁶°; 1 m |
| a dish on the satellite's meridian | due south (due north below the equator) | same | 10⁻⁶° |
| look angles anywhere, west and east | spherical closed form tan el = (cos γ − R/r)/sin γ | elevation within the ellipsoid's difference | 0.2° |
| Bangkok (13.7563° N, 100.5018° E) to Thaicom 8 at 78.5° E | spherical closed form: el 59.88°, az 239.5° | 59.9°, 239.5° (south-west) | shown |
| the edge of a geostationary satellite's view | 81.3° of arc; 42.4 % of the Earth | same; the footprint's edge is at the minimum elevation | 0.1°; 0.3° |
| up and down beneath GEO | 238.7 ms; a question and its answer 477.5 ms | same | 0.1 ms |
| free-space loss, 36 000 km at 4 GHz | 195.6 dB | same | 0.1 dB |
| Boltzmann's constant | −228.6 dBW/(K·Hz) | same | 0.1 dB |
| a 1.2 m dish at 12 GHz, 65 % | 41.7 dBi | same | 0.1 dB |
| a camera's swath | 2h·tan(fov/2) for a narrow view; wider on a curved Earth; none past the horizon | same; inverts | 10⁻³ relative |
| THEOS: 26-day repeat, 14 5/26 revolutions a day (eoPortal) | 822 km, 98.7° | 369/26 revolutions: 822.4 km, 98.70° | 1 km, 0.05° |
| THEOS-2: 26-day repeat (eoPortal) | 621 km (eoPortal); 97.91° (CelesTrak) | 385/26 revolutions: 621.1 km, 97.87° | 1 km, 0.1° |

**Findings.**

- Both Thai Earth-observation satellites' published heights follow from their published 26-day
  repeat cycles, by J2 alone. THEOS's 369 revolutions are also published; THEOS-2's 385 are the
  one whole number that puts a 26-day repeat near 621 km.
- THEOS-2's 10.3 km swath covers 0.4 % of the 2 630 km between the day's tracks over Bangkok,
  and a tenth of its 104 km repeat grid. Tilting 45° reaches 658 km to each side. That is why
  it tilts, and why the playground shows the track spacing and the reach rather than a "days to
  cover" figure, which would mislead for a repeating orbit.
- Thailand's satellites (`src/data/thai-satellites.ts`) are taken from public sources only, each
  fact with its source; the orbits are CelesTrak's catalogue as read on 2026-09-26. Where sources
  differ the value is left out: THEOS-2's mass is 417 kg in one report and 425 kg in another.
  NAPA-2 re-entered on 2026-07-05, by the catalogue.

## 6. Real satellites (R01–R05): SGP4 against its reference, the catalogue, passes, uncertainty, the Sun's activity

Real satellites are propagated from their element sets by SGP4 and SDP4
(`src/orbit/sgp4.ts`, roadmap R01), the theory those element sets are fitted to. It is the
reference implementation of Vallado, Crawford, Hujsak and Kelso, "Revisiting Spacetrack Report
#3" (AIAA 2006-6753, [CelesTrak](https://celestrak.org/publications/AIAA/2006-6753/)), carried
over to TypeScript procedure for procedure. The paper verifies its code with 33 element sets
chosen to exercise every branch: near-Earth drag, perigees under 156 and 98 km, the deep-space
lunar–solar terms, the 12-hour and 24-hour resonances, the Lyddane choice at low inclination,
integration backwards, and seven sets that must fail. `tests/sgp4.test.ts` runs them the way
the paper's test driver does and compares the result with the paper's published output line by
line. The fixtures and where they come from are in `tests/fixtures/sgp4/README.md`.

| quantity | reference | model | tolerance |
| --- | --- | --- | --- |
| lines of output, set by set | tcppver.out: 33 sets, 700 lines | the same sets, the same number of lines each | exact |
| errors | seven sets stop: codes 1, 1, 6, 6, 4, 3, 6 | the same sets stop at the same time with the same codes | exact |
| position, 666 lines | printed to 10⁻⁸ km | worst 1.2 × 10⁻⁷ km (satellite 20413, 3½ years from its epoch); every other line under 3 × 10⁻⁸ km | 2 × 10⁻⁷ km |
| velocity, 666 lines | printed to 10⁻⁹ km/s | worst 5 × 10⁻¹⁰ km/s | 2 × 10⁻⁷ km/s |
| calendar date of each line | printed to 1 µs | within 21 µs (the reference dates from one Julian date in a double, which resolves 40 µs) | 0.1 ms |
| the element-set format | CelesTrak's documented ISS set (checksums 7 and 7, every field) | every field; Alpha-5 numbers both ways | exact |
| Greenwich mean sidereal time | Vallado Example 3-5: 152.578 787 810° at 1992-08-20 12:14 UT1 | same | 10⁻⁶° |

The tolerance is the one the widely used Python port of the same code (`sgp4` on PyPI) holds
itself to against the same file. It is twenty times the output's printed precision.

**Findings.**

- The deep-space resonance keeps its last integration step, as the reference does, so moving
  forward in time costs one step, not all of them from the epoch. Stepped forward or run once,
  it gives the same bits; going back before the last step restarts it from the epoch.
- The two operation modes differ only in the sidereal time at the epoch and in angle handling
  for deep-space orbits. A near-Earth set gives the same answer in both. The improved mode ('i')
  is the default, as in the paper.
- A Julian date held in one double resolves about 40 µs, which is a few millimetres of flight.
  The element set's epoch is kept as a whole day and a fraction, as the reference keeps it.
- TEME is turned to the Earth-fixed frame by the Greenwich mean sidereal time of UT1, then the
  pole's wander, from the IERS (P2.5, below). Until P2.5 UTC stood in for UT1 and the pole was left
  alone: that moved a point by up to about 400 m, less than an element set's own error, which is
  kilometres (R04), but for no reason the data could not remove.

### The Earth's orientation (P2.5)

SGP4's TEME turns into the Earth-fixed frame by the sidereal time of UT1 and then by the polar
motion (Vallado et al., AIAA 2006-6753, Appendix C). UT1 − UTC and the pole's x_p, y_p are the
IERS's, day by day from 2019 with Bulletin A's predictions a year ahead (`finals2000A`,
[IERS data centre](https://datacenter.iers.org/)), bundled as a snapshot
(`public/data/earth-orientation.json`) that the scheduled build refreshes. The IERS sends no
cross-origin header, so a browser cannot fetch it: the snapshot is used in both data modes
(`src/provider/earth-orientation.ts`, `src/orbit/earth-orientation.ts`,
`tests/earth-orientation.test.ts`). The tolerance, a metre, was fixed before the comparison.

| case | reference | model | tolerance |
| --- | --- | --- | --- |
| the paper's example: 2004-04-06 07:51:28.386 UTC, ΔUT1 −0.439 961 s, x_p −0.140 682″, y_p 0.333 309″ | r_ITRF = (−1033.479 383 00, 7901.295 275 40, 6380.356 595 80) km from r_TEME = (5094.180 107 20, 6127.644 705 20, 6380.344 532 70) km | 71 mm from it | 1 m |
| the same without the pole's wander | — | 16.4 m off | — |
| the same with UTC for UT1 as well, as before P2.5 | — | 262 m off | — |
| a leap second between two days | the day keeps its own UT1 − UTC to midnight | so | exact |

**Findings.**

- In 2026 UT1 − UTC is small (−0.018 s at the end of September), so the change moves today's
  satellites by only some 8 m over the ground; it was 0.44 s in the paper's example and has been up
  to 0.9 s.
- Skyfield's built-in timescale (1.55) predicts UT1 − UTC for the R03 fixtures' dates from its own
  release, +0.095 s against the IERS's measured −0.018 s. With the IERS values the model moves
  some 55 m from Skyfield: the R03 comparison below is now within 0.34 s and 0.005° rather than
  0.35 s and 0.004°. Skyfield is the one extrapolating there.

### The satellite catalogue and its formats (R02)

The Orbit section's real satellites come from a dataset of CelesTrak's element sets
(`src/provider/satellites.ts`): the space stations, Thailand's satellites, the four navigation
constellations, the weather satellites, the Earth-imaging satellites (CelesTrak's Earth Resources
group, added for M02) and the debris of Fengyun-1C. It is bundled as a snapshot
(`public/data/satellites.json`, fetched 2026-09-26) and, online, fetched from CelesTrak at most
once in two hours. Element sets come in two families of formats: the two-line format, and the
Orbit Mean-Elements Message (CCSDS 502.0-B-3) as JSON, CSV, XML and KVN. The OMM is the only one
that holds the six-digit catalogue numbers given since 2026-07-11. Both are read, and so is a file
the user brings (`src/orbit/omm.ts`, `src/orbit/tle.ts`). `tests/omm.test.ts`,
`tests/satellite-catalogue.test.ts` and `tests/real-sky.test.ts` hold them.

| case | reference | model | tolerance |
| --- | --- | --- | --- |
| the ISS's element set in CelesTrak's six formats (TLE, 2LE, JSON, CSV, XML, KVN), served 2026-09-26 | one element set | the four OMM forms give the same elements to the bit; the two-line forms agree to their printed digits | exact; 10⁻¹⁴ |
| the same, propagated a day | one position | the OMM forms identical; the two-line forms within 10 m (their epoch is printed to 10⁻⁸ day, 0.86 ms) | 0; 10 m |
| Space-Track's JSON (numbers as text) | CelesTrak's JSON | the same elements | exact |
| a six-digit catalogue number | CelesTrak: TLEs cannot carry it | read from the OMM and propagated | — |
| an SGP4-XP element set (ephemeris type 4) | a different theory | refused, and the reason named | — |
| the ISS in the snapshot | 51.6°, about 420 km | 51.63°, 416 × 426 km | 0.5°; 380–440 km |
| Thaicom 8 | 78.5° E (Thaicom) | over 78.5° E, on the equator, deep-space theory | 0.2° |
| THEOS-2 | 621 km, 97.9° (eoPortal, §5) | 620 × 622 km, 97.91° | 610–635 km; 0.5° |
| every GPS satellite in the snapshot | two revolutions a sidereal day | 717.9 ± 2 min | 2 min |
| the point below a satellite | SGP4's own TEME to Earth-fixed turn | the playground's sidereal time gives the same point | 5 m |

**Findings.**

- CelesTrak's TLE queries return nothing for objects numbered 100 000 and above (its GP data
  documentation, updated 2026-06-23). The snapshot and the online source therefore use the OMM
  JSON, and the file import reads every OMM form.
- CelesTrak refreshes its element sets every two hours and blocks addresses that fetch the same
  file more often. Online, the answers (or a refusal) are kept for two hours, in the browser's
  Cache Storage where it has one. A refusal is not asked again in that time. The bundled snapshot
  is refreshed by the scheduled deploy, once a day.
- Thaicom 7 is catalogued as AsiaSat 6, so a search by name misses it. The Thai group is asked for
  by name and by that one number, then kept to the seven catalogue numbers of §5's list.

### Passes over a place (R03)

A pass is found by sampling the elevation (every 1/60 of a revolution, at most a minute),
refining each highest point by golden section and each rise and set by bisection
(`src/orbit/passes.ts`). The look angles are O04's, on WGS-84. The Earth's shadow is a cylinder,
and the sky counts as dark with the Sun 6° below the horizon. `tests/passes.test.ts` holds it to
Skyfield 1.55 (JPL DE421, its own TEME-to-Earth transformation with UT1, its own event search). The
comparison uses the same element sets: the ISS, THEOS-2 and a GPS satellite, over Bangkok and
Saint Petersburg, three days each, 249 events (`tests/fixtures/passes/`, with the script that
made them). The tolerances were set before the comparison.

| quantity | model against Skyfield | tolerance |
| --- | --- | --- |
| the events, in order: rise, highest point(s), set | the same, all six cases | exact |
| rise and set times | within 0.34 s | 2 s |
| time of the highest point | within 0.11 s | 5 s |
| elevation at every event | within 0.005° | 0.02° |
| azimuth, as arc across the sky | within 0.004° | 0.02° |
| range | within 53 m | 1 km |
| the Sun's elevation at the place | within 0.005° | 0.05° |
| the satellite sunlit or not, at every event | the same, 249 of 249 | exact |
| the ISS into and out of the Earth's shadow (31 edges in a day) | on the same side 3 s either side of each | 3 s |

**Findings.**

- The figures are with the IERS's UT1 and pole (P2.5); with UTC for UT1, as first compared, they
  were 0.35 s, 0.11 s, 0.004°, 0.003° and 43 m. The small change is Skyfield's own prediction of
  UT1 for these dates (above).
- The comparison is of geometric elevations, as Skyfield's fixture has them; the page shows them as
  seen, with the air's refraction (P2.5, below).
- A pass of half a day or more belongs to a high orbit (GPS, a geostationary satellite). Its
  visibility is not worked out: such a satellite is too faint to see with the eye.

### Passes as they are seen (P2.5)

The page lists passes as an observer sees them (`src/orbit/visibility.ts`, `findPasses` with
refraction): the air lifts a satellite by Sæmundsson's refraction, R = 1.02′ / tan(h + 10.3/(h +
5.11)) at 1010 hPa and 10 °C (J. Meeus, *Astronomical Algorithms*, 2nd ed., eq. 16.4), so a pass
rises and sets at the horizon one sees. Its brightness is estimated from the satellite's standard
magnitude, fully lit at 1000 km, in M. McCants's Quicksat table of observers' estimates
(`src/data/standard-magnitudes.json`, the file of 2020-09-14, 3166 satellites), with the lit
fraction of a sphere as the phase law: m = m₀ + 5 log₁₀(d / 1000 km) − 2.5 log₁₀((1 + cos φ)/2).
`tests/visibility.test.ts` holds them. The refraction's tolerance, 0.005°, was fixed before the
comparison.

| check | reference | model | tolerance |
| --- | --- | --- | --- |
| the apparent elevation of 17 true ones, −0.5° to 89°, at 10 °C, 1010 hPa | Skyfield 1.55 (`earthlib.refract`: Bennett's formula solved for the apparent altitude) | within 0.066′, at the horizon | 0.005° (0.3′) |
| half lit against fully lit | the 0.8 magnitude between Molczan's and McCants's conventions | 0.753 | — |
| the ISS's rises and sets over Bangkok, three days | geometric ones | 1 to 39 s sooner and later, a grazing pass the most | 1–120 s |

**Findings.** McCants's table has not been updated since 2020, so satellites launched since have no
standard magnitude, and the page gives them none rather than a guess. The phase law is the
observers' simple one; a satellite's panels catching the Sun flare brighter than any of it.

### How far off an element set may be (R04)

An element set says nothing of its own accuracy (Kelso, "Validation of SGP4 and IS-GPS-200D
Against GPS Precision Ephemerides", AAS 07-127, 2007). The page therefore shows an estimate
(`src/orbit/uncertainty.ts`), labelled as such and built from two studies:

- **At the epoch**, the standard deviations radial, along-track and cross-track that Flohrer, Krag
  and Klinkrad found for the whole catalogue of 2008 January 1
  ([AMOS 2008](https://amostech.com/TechnicalPapers/2008/Orbital_Debris/Flohrer.pdf)). They are
  taken from Table 2, by eccentricity, perigee height and inclination: for the ISS 107, 308 and
  169 m; for a sun-synchronous orbit like THEOS-2 115, 517 and 137 m; for GPS 71, 228 and 95 m;
  for a geostationary orbit 357, 432 and 83 m. Where Table 2 has no entry, Table 1's average for
  the regime is used.
- **After the epoch**, a growth of 1.5 km a day, the typical figure Levit and Marshall measured
  against laser-ranging ephemerides for four satellites from 800 to 19 100 km
  ([Advances in Space Research 47, 2011](https://arxiv.org/abs/1002.2277)). It is put along the
  track, where Kelso found the error dominant.

`tests/uncertainty.test.ts` holds the model to those tables, cell by cell, and to that growth.

**Findings and limits.**

- Kelso found TLE errors biased, and not the same before and after the epoch; the band is
  symmetric and unbiased. It shows how the error grows, not where the satellite really is.
- Levit and Marshall report an instantaneous range error of 0.8 ± 0.3 km for their four
  satellites, above Flohrer's standard deviations for such orbits (0.26 to 0.45 km). The band at
  the epoch may be narrow by a factor of two or three.
- Below about 500 km the air's drag, which depends on the Sun, makes the growth faster and less
  regular. Satellites that manoeuvre (the ISS reboosts) break the estimate altogether. The page
  says both.
- Converted to time along the track, the errors are small for passes: a day-old ISS set is early
  or late by about a quarter of a second.

### The Sun's activity in the lifetime (R05, P2.5)

The lifetime model's density is NRLMSISE-00 itself (P2.5), at the satellite's place and time and
for each day's solar and geomagnetic indices:

- **The model** (`src/physics/propagator/msis.ts`) is a line-by-line port of the C release of
  NRLMSISE-00 (D. Brodowski, 2004, in the public domain; U.S. Government material from NRL's
  Fortran): GTD7, and GTD7D, whose mass density counts the anomalous oxygen, for the drag. It is
  the model ECSS-E-ST-10-04C names for orbit decay, and ECSS puts its uncertainty in mean
  conditions at about 15 % (Annex G.5). Until P2.5 the density was its day-and-season average at
  the height (ECSS's Tables G-1 to G-3), interpolated between the three activity levels by the IPS
  relation and spread through the day by Harris–Priester's bulge.
- **The indices** (`src/physics/propagator/activity.ts`) are what the model reads for a day: the
  previous day's observed F10.7, its 81-day mean centred on the day, and the day's Ap. They are
  GFZ's daily values since 1954 (`src/data/solar-daily.json`,
  [doi:10.5880/Kp.0001](https://doi.org/10.5880/Kp.0001), CC BY 4.0), then NOAA SWPC's monthly
  flux, the last thirty days' flux and the last week's Ap from Kp (Bartels's table), then SWPC's
  monthly forecast (expected, or the high or low side of its range) to its end. Beyond it the Sun
  is the mean of solar cycles 19 to 24, month by month from their minima
  ([SILSO](https://www.sidc.be/SILSO/cyclesminmax)), with its spread across the six cycles for
  the high and low sides, taken to repeat from cycle 25's minimum (2019-12). Where no Ap is
  measured it is the same mean cycle's. Until P2.5 the series was monthly, the Sun beyond the
  forecast repeated its last eleven years, and the Ap was a constant 13.
- **The average over a revolution** (`src/physics/propagator/propagate.ts`) splits an eccentric
  orbit's revolution where the height is 300 km above the perigee's, with 24 points about the
  perigee and 12 over the rest, and takes the drag's rates over steps of up to five days (each
  losing at most 0.5 % of the height left), reading the indices' mean over a step longer than a
  day.

`tests/msis.test.ts` holds the port to the model's own reference: the seventeen test cases of the
distribution (the C release's DOCUMENTATION, §7, the same as NRL's Fortran package) within
2 × 10⁻⁶ of every printed output, and 400 random points from the ground to 1000 km run through NRL's
Fortran itself (pymsis 0.13.0, `tests/fixtures/msis/`) within 10⁻⁴, the Fortran working in
single precision. The tolerances were fixed before the comparison.

| check | reference | model | tolerance |
| --- | --- | --- | --- |
| the distribution's 17 test cases: nine densities and two temperatures each | printed to seven figures | every one within 2 × 10⁻⁶ | 2 × 10⁻⁶ |
| 400 random points, 0–1000 km, quiet to stormy, a quarter with the 3-hour ap history | NRL's Fortran (single precision) | mass density within 1.3 × 10⁻⁵; every species within 8 × 10⁻⁵ | 10⁻⁴ |
| the equatorial mean over the day and the months, at ECSS's three levels, 200, 400 and 700 km | ECSS-E-ST-10-04C Tables G-1 to G-3 ("at equatorial latitude … averaged over diurnal and seasonal variations") | within 0.3 %, all nine | 10 % |
| the drag average over a revolution of a transfer orbit, perigee 200 km | 20 000 even points of eccentric anomaly | within 0.1 % | 3 % |

The first run against the Fortran broke its bound only for species at densities below one particle
per cubic metre: anomalous oxygen under 115 km (10⁻³² to 10⁻²⁸ m⁻³, up to 5 %) and hydrogen at 74
km (4 × 10⁻⁵ m⁻³, 1.2 × 10⁻⁴), where single precision runs out. Those are held only to staying
below one; the finding is the test's comment.

The validation of the decay takes spheres, whose drag area does not depend on how they tumble.
Each starts from its first element set (CelesTrak) as mean elements (`src/orbit/mean-state.ts`),
with its published mass and diameter and C_D 2.2, and is carried by the mean-element method with
the series the app builds until its perigee is below 120 km. The tolerance, ±25 % of the days it
actually spent in orbit, was fixed before R05's comparison and kept. Sources are in
`tests/fixtures/space-weather/README.md`.

| sphere | mass, diameter | first set → re-entry (GCAT) | days in orbit | P2.5: NRLMSISE-00, daily indices | R05: ECSS's averages, monthly indices | fixed moderate Sun (P2.5) |
| --- | --- | --- | --- | --- | --- | --- |
| Starshine | 39 kg, 0.48 m | 1999-06-05 → 2000-02-18 | 258.2 | 238.4 (−7.7 %) | 223.9 (−13.3 %) | 306.2 (+18.6 %) |
| Starshine 2 | 39 kg, 0.48 m | 2001-12-16 → 2002-04-26 | 130.8 | 132.8 (+1.5 %) | 131.2 (+0.3 %) | 258.7 (+97.7 %) |
| Starshine 3 | 91 kg, 0.94 m | 2001-09-30 → 2003-01-21 | 478.2 | 385.7 (−19.4 %) | 386.0 (−19.3 %) | 774.6 (+62.0 %) |
| ANDE MAA | 52.04 kg, 0.4826 m | 2006-12-22 → 2007-12-25 | 367.6 | 286.9 (−22.0 %) | 286.5 (−22.1 %) | 109.5 (−70.2 %) |
| ANDE FCal | 62.70 kg, 0.4445 m | 2006-12-22 → 2008-05-25 | 519.5 | 399.2 (−23.2 %) | 412.2 (−20.7 %) | 152.7 (−70.6 %) |
| ANDE-2 Pollux | 27.442 kg, 0.4826 m | 2009-07-31 → 2010-03-29 | 241.4 | 186.4 (−22.8 %) | 192.6 (−20.2 %) | 68.3 (−71.7 %) |
| ANDE-2 Castor | 47.45 kg, 0.4826 m | 2009-07-31 → 2010-08-18 | 383.4 | 300.1 (−21.7 %) | 317.6 (−17.2 %) | 111.3 (−71.0 %) |

`tests/activity.test.ts` holds each sphere to the tolerance, the density to ECSS's tables, the place
and time the model is asked about, and the series to the data it is built from.

**Findings.**

- **All seven are within 25 % with the Sun as measured**, from the solar maximum of 2000–2002 to
  the deep minimum of 2008–2009; a fixed moderate Sun gets the maximum's spheres down 1.2 to 2 times
  too late and the minimum's 3.4 times too early.
- **The full model did not remove the early bias.** Six of the seven are still early, by 8 to
  23 % (−16 % on average, as with R05's averages): the day-to-day indices, the season and the
  latitude move single spheres by a few per cent either way, not the whole. The bias is the
  model's own in those years. NRLMSISE-00 puts too much air in the thermosphere of the 2008
  minimum (Emmert, Lean and Picone, "Record-low thermospheric density during the 2008 solar
  minimum", GRL 37, L12102, 2010), which fits the four ANDE spheres of 2007–2010, and 15 % is the
  uncertainty ECSS itself gives the model. A density some 20 % too high, or a drag coefficient that
  high, would do it; the two are not separated here, and nothing was fitted to remove it. (The
  P2.5 fix-up's diagnosis puts it on the density: see §7, M03, "The model's early bias is
  NRLMSISE-00's own".)
- **The model's averages are ECSS's to 0.3 %.** Averaged at the equator over the hours and the
  months, the port gives ECSS's tabulated densities at all three levels and heights: the tables
  were made from this model that way, and so R05's first-order model was sound.
- **An eccentric orbit's drag was undersampled before P2.5.** R05 averaged the drag over 36 even
  points of eccentric anomaly: for a transfer orbit with a 200 km perigee that finds 57 % of the
  decay rate, the air being met over a few degrees about the perigee, so a transfer orbit's
  lifetime came out nearly twice too long. The split average finds it within 0.1 %.
- **The two methods agree to 7 %.** Starshine 2 carried by the full equations of motion, every
  force on and NRLMSISE-00 at every point, comes down after 142.6 days against the mean method's
  132.8 (and 130.8 on record); the full equations start from the mean elements taken as
  osculating ones. R05's density gave 140.3 and 131.2.
- **Steps.** Up to a day, the spheres come down within 0.4 % of their six-hour-step days; up to five
  days (with the indices' mean over the step) within 0.8 %, and a century at 700 km takes some 3 s
  instead of 7.
- **Beyond NOAA's forecast the Sun is the mean cycle.** A lifetime of decades is an estimate; the
  dialog offers the forecast's high and low sides, and beyond it the mean cycle's spread across
  the six cycles, to show how far it can move.

## 7. The military track (M01–M03): close approaches, overflights, re-entry

### Close approaches (M01)

**Real satellites** can screen the catalogue for close approaches to the satellite picked, as
CelesTrak's SOCRATES does with the same public element sets (`src/orbit/screening.ts`). Every
object whose band of heights overlaps the satellite's is carried beside it by SGP4. Each approach
nearer than the limit is reported with its time, its miss distance (radial, along-track and
cross-track at Engineer), the relative speed, and an estimated probability of collision.

- **The search** (`src/orbit/conjunction.ts`) samples the range and refines each local minimum
  by golden section to 0.1 ms. A sampled minimum farther than the limit plus v·step/2 cannot hide
  an approach within the limit, and is not refined. Pairs whose bands of heights are farther apart
  than the limit are not searched (Hoots, Crawford and Roehrich, 1984). Since P2.5 a near-Earth
  object's band is the one SGP4's radius stays in over the window. The band used before, perigee
  to apogee at the epoch with 30 km either way, misses an object that is coming down: SGP4 takes
  the fastest-decaying objects of a catalogue up to 346 km below their perigee within a week. An
  object that SGP4 brings down within the window is taken from the ground up. A near-Earth object
  whose band cannot be bounded over the window is taken to be at any height (neither catalogue
  below has one). Deep-space objects keep the old band.
- **The time filter** (P2.5, `src/orbit/screening-filter.ts`) says, for each pair, when the two
  can come within the limit at all. Only those stretches are searched.
  - It is Hoots' time filter written on SGP4's own terms. It follows SGP4's secular and drag
    polynomials: the mean argument of latitude, the node, a and e.
  - It bounds every periodic term SGP4 adds, from SGP4's own formula (Spacetrack Report #3;
    Vallado et al., AIAA 2006-6753): the radius, the angle along the track and the tilt of the
    plane. Nothing is fitted to a catalogue. The published filters reach zero misses only with
    pads fitted to their test catalogues: 30 km and 10 s (Woodburn et al., AAS 09-372), 10.7 km
    (Rivero et al., arXiv 2309.02379).
  - At each pass of the primary through the line where the planes cross, the other object's pass
    is found. A window is kept only if the two radii at that pass can meet.
  - The search then takes the same samples the whole search takes there, so an approach found in
    a window is the whole search's own, to the last bit.
  - Deep-space objects, pairs whose planes are within 3° of each other, and objects that SGP4
    brings down within the window go to the whole search.
  - The whole search stays callable as the reference.
- **The probability** is the two-dimensional one used in operations (Foster and Estes 1992;
  Chan 2008): the combined position uncertainty, projected on the plane square to the relative
  velocity, integrated over a circle of the pair's combined radius. It is summed in logarithms,
  so that 10⁻⁵¹ is still a number. Each covariance is given in its object's radial, transverse and
  normal axes, the normal along the angular momentum of the *inertial* orbit (CCSDS 508.0-B-1).
- **The uncertainty** in the page is R04's estimate for each element set, and the combined radius
  is the user's. The result is labelled as an estimate.

`tests/conjunction.test.ts` holds it to:

| check | reference | result | tolerance |
| --- | --- | --- | --- |
| two straight lines, 250 m apart at 7 km/s | closed form | TCA and miss exact | 0.01 s, 1 mm |
| two circular orbits crossing at their nodes, 100 m apart | closed form | every node found; miss 100 m, all radial | 0.01 m; 1 m along/across |
| a direct hit through a round uncertainty | 1 − exp(−R²/2σ²) | exact | 10⁻⁹ |
| a round uncertainty off to one side, down to beyond 10⁻¹⁰⁰⁰ | Rice's integral, by Simpson's rule | agrees | 10⁻³ in log₁₀ |
| the screening's coarse steps against a 10 s brute force | the same pairs (a DMSP satellite and 40 Fengyun-1C fragments, one day) | every approach found | 0.01 s, 0.1 m |
| the time filter's bounds: every near-Earth object of the bundled catalogue at 40 times across a week (88 450 states) | SGP4's own radius, argument of latitude and plane | none outside; the largest along-track and tilt 0.80 of the bounds | none outside |
| the radius at a pass: the same objects, stretches of 10 s to 10 min (132 675 states) | SGP4's own radius | none outside | none outside |
| the filtered screening: 12 primaries × 1, 3, 7 days × 1, 5, 25 km (108 runs, 591 approaches) | the full search | the same 591, none dropped, none added | same objects; TCA 1 ms, miss 1 mm |
| Iridium 33–Cosmos 2251: relative speed, crossing angle | 11.6 km/s, "nearly right angles" (Shepperd; Kelso) | 11.6 km/s, 102° | 0.05 km/s; 95–110° |
| the same: TCA of the conjunction message | 16:55:59.798 UTC | found again by straight-line motion; miss 226.3 m | 2 ms |
| the same: probability, the military's covariances | 2.6 × 10⁻⁵¹ (Shepperd, Table 2, 9 February) | 2.66 × 10⁻⁵¹ | 0.1 in log₁₀ |
| the same: Iridium's orbit estimate and covariance | 1.0 × 10⁻³ | 9.28 × 10⁻⁴ | 0.1 in log₁₀ |
| the same: Iridium's conservative covariance | 3.3 × 10⁻² | 3.23 × 10⁻² | 0.1 in log₁₀ |

**The time filter (P2.5): its test, fixed before it ran.** A time filter
(`src/orbit/screening-filter.ts`) is to choose the stretches of the window in which each pair is
searched. It must not change the answer. Its test is recorded here before the filter is compared
with anything:

- **Primaries**, each screened against the bundled catalogue (every group, 2 409 sets):
  - the ISS;
  - a 700 km sun-synchronous satellite (Landsat 8);
  - a 1 200 km orbit (Yaogan-22);
  - a geostationary satellite (Thaicom 8);
  - a decaying object (the snapshot's lowest, at 270 km);
  - a Fengyun-1C fragment on an eccentric orbit with heavy drag (786 × 3 105 km).
  - Constructed element sets, because the snapshot has none of these: a Molniya orbit, a
    geostationary transfer orbit, a transfer from 400 to 1 200 km, and an object that re-enters
    within the window.
- **Runs:** windows of 1, 3 and 7 days, limits of 1, 5 and 25 km, each screened with the filter
  and with the full search it replaces. The full search stays callable as the reference.
- **Passing** means the same approaches: the same objects, each TCA within 1 ms and each miss
  within 1 mm. None may be dropped and none added. A failure is recorded as a failure.
- **The bounds** the filter rests on are held to SGP4 itself. Take every near-Earth object of
  the catalogue at 40 times across a week. Its radius, its argument of latitude and its distance
  from its mean plane must all stay inside what the filter assumes, with none outside.

Every `npm test` runs part of it: every primary for one day, and three primaries over a week.
`npm run test:heavy` runs the whole sweep.

**Result.** The criterion held in every run: no approach was dropped and none added. The filter
was changed after the first runs (the radial test at each pass, and the handling of objects that
come down), and two primaries were added; the whole sweep was then run again on the final code,
in review, with the same result.

- **The sweep.** All 108 runs gave the full search's approaches, 591 in all, with none dropped and
  none added. The criterion allows 1 ms and 1 mm. Where they were compared exactly, the times and
  misses were equal to the last bit: in one run of the regular suite and in the 30 000-object runs
  below. The filtered search takes the very samples the full search takes, so this is expected.
- **Primaries added.** Two constructed primaries were added to the ten above: a second object that
  comes down within the window (156 × 701 km, with SGP4's simplified drag), and an object at
  481 × 495 km that SGP4 brings below 400 km within the week.
- **Pairs sent to the whole search.** Over the sweep's near-Earth primaries, 2 764 of 66 106
  pairs went to the whole search: pairs whose planes are within 3° of each other, or that failed
  another of the filter's checks. This leaves out the object that comes down within a week
  (constructed, B* 0.05): over that week all its pairs are searched whole.
  - Deep-space primaries have every pair searched whole: the geostationary one, the Molniya and
    the geostationary transfer orbit. For them the filter changes nothing.
- **The bounds.** Every state stayed inside them. They are tight, which is why Δu and ε are
  taken 1.25 times: the suite's own check (the table above) reaches 0.80 of the scaled bounds,
  that is, the unscaled ones. A one-off check, not part of the suite, took 2.8 million states of
  the 28 000 near-Earth objects of the 30 000-object load below, at random times across a week:
  - the along-track angle and the tilt reached 0.999 and 1.000 of the unscaled bounds;
  - SGP4's radius came within 0.06 km of the whole-orbit bound and within 0.1 m of a pass's bound.
- **A guard that failed.** One check written before the first run, that more than half the pairs
  of a 700 km satellite need no search at all, failed on that run (46 % over three days). It was
  left as written. It passes since the radial test at each pass was added.
- **A wider check, in review.** Two sweeps beyond the test above, run once and not part of the
  suite, found no difference either:
  - 60 near-Earth primaries drawn at random from the bundled catalogue, two days at 25 km, against
    a search of every pair with no band test at all (so the new band is checked too): the same
    1 404 approaches;
  - 15 near-Earth primaries drawn at random from the 30 000-object load, two days at 25 km, with
    and without the filter: the same 4 552 approaches, to the last bit.

The conjunction data are the appendix of R. W. Shepperd, "Subsequent Assessment of the Collision
between Iridium 33 and COSMOS 2251"
([AMOS 2023](https://amostech.com/TechnicalPapers/2023/Conjunction-RPO/Shepperd.pdf)): both
objects' states at the time of closest approach in the conjunction message of 9 February 2009,
Iridium's own orbit estimate, the three covariances, and the hard-body radii (3.942 m and 16 m).
The paper's Table 2 gives the probability each yields. The fixture is
`src/data/iridium33-cosmos2251.json` (the case worksheet reads it too).

**Findings.**

- **The frame decides a tail probability.** With each object's axes taken from its Earth-fixed
  velocity instead of its inertial one, the first case gives 10⁻⁵¹·⁹, more than a decade off; with
  the inertial velocity, as CCSDS defines the axes, it gives 10⁻⁵⁰·⁶. The other two cases barely
  move (their uncertainty is large).
- **Two states must be at one time.** Iridium's estimate is at 16:55:59.8155 and the message's
  secondary at 16:55:59.798. Left as they are, the 17.5 ms between them puts 128 m of Cosmos's own
  motion into the miss, and the probability comes out two decades low. Carried to one time along
  straight lines, as the paper does, they give the published values.
- **Screening with element sets shows traffic, not collisions.** SOCRATES predicted this pair's
  approach every day of the week before, at 117 m to 1.8 km (584 m on the day), and ranked it
  152nd when they hit (Kelso, [AAS 09-368](https://celestrak.org/publications/AAS/09-368/)). The
  page says so. The same data with the operator's covariance gave a probability of 1 in 30 on
  the 9th.
- SOCRATES's own 584 m cannot be reproduced here: it used the element sets of 10 February 2009,
  which are Space-Track data and are not redistributed.

### Conjunction data messages (P2.5)

An operator is warned of a close approach by a conjunction data message (CCSDS 508.0-B-1): the
time of closest approach, both objects' states at it and each one's position covariance from the
orbit determination behind it. **Close approaches** reads one in KVN from a file the user brings
(`src/orbit/cdm.ts`; nothing leaves the page) and computes the two-dimensional probability from the
message's own covariances, each object's axes from its inertial velocity (an ITRF state has the
Earth's turning added back). The combined radius comes from a `COMMENT HBR` line where there is one,
otherwise from the user. `tests/cdm.test.ts` holds it to NASA CARA's test conjunctions
([CARA Analysis Tools](https://github.com/nasa/CARA_Analysis_Tools), NASA Open Source Agreement;
the numbers only, in `tests/fixtures/conjunction/cara-cases.json`, with the script that read them):

| case | reference | model | tolerance |
| --- | --- | --- | --- |
| Alfano's eleven test conjunctions (Alfano, AAS 09-233, 2009), each written as a message and read back | the probabilities CARA's unit test holds its Pc2D_Foster to, 1.58 × 10⁻⁴ to 0.29 | ten within 0.03 %; case 4 within 0.12 % | 0.5 % |
| Omitron's case 1 (states and covariances inertial, 20 m) | 2.706 × 10⁻⁵ | 2.706 × 10⁻⁵ (0.0003 %) | 0.1 % |
| the same encounter written in ITRF | the EME2000 probability | the same to 10⁻³ in log₁₀ | 10⁻³ |

**Findings.** CARA's own test holds its method to 0.1 %. Ten of the eleven are well inside that; case
4, a miss of 134 m that is nine standard deviations of the smaller axis, is 0.12 % off, where the
last digits of the quadrature count. The bound of 0.5 % was set after that first run, and so this
says. With a message the probability is the operators' own; with public element sets (above) it is
an estimate from the sets' rough uncertainty.

Below 10⁻¹⁰ the page gives no number but "below 10⁻¹⁰": such a value is the tail of a Gaussian
many standard deviations out (a 25 km miss against a 157 m standard deviation gives 10⁻⁶¹⁸), and
neither element sets' nor tracking errors are Gaussian that far out. The tests still check the
computed logarithm itself.

**A whole catalogue, timed (P2.5).** Before the time filter: screened in a Web Worker, measured
in Chromium at a phone's size (375 × 812) on this build machine, with a catalogue of 30 000
objects read from a file: the
3 104 real element sets at hand (the bundled groups and CelesTrak's Cosmos 2251, Iridium 33 and
Cosmos 1408 debris) and copies of them turned to other nodes and places in their orbits, a
synthetic load labelled as such. Reading the file took 2 s (4 s with the page's CPU slowed four
times). Against the ISS, whose height band few objects share, the screening took 3 s (4 s slowed);
against a satellite at 700 km, in the crowded band, 27 s either way. The page kept drawing
throughout: its frames came every 117 ms at the median (183 ms slowed), against 83 ms (133 ms)
at rest — software WebGL in this machine sets that pace, not the screening. Chromium's CPU
slow-down does not reach a worker (the 700 km run took 27 s at both speeds), so a phone, whose
cores are slower than this machine's, would take longer.

With the time filter it was timed in Node 22 on this build machine: one core of a 4-vCPU Intel
Xeon at 2.1 GHz, each figure the best of three runs. The machine was shared (a load of about four),
so two such sets of runs differ by up to 15 %; the table is the later one. The load is the same
30 000-object file as above. It is synthetic: 3 104 real element sets, and copies of them turned
to other nodes and other places in their orbits. The start is 2026-09-27 12:00 UTC and the limit
5 km. Every run with the filter gave the same approaches as the full search, to the last bit.

| primary | window | pairs searched | full search | with the filter | faster | worker's whole job |
| --- | --- | --- | --- | --- | --- | --- |
| ISS, 416 × 426 km | 1 day | 581 | 0.23 s | 0.03 s | 7× | 0.17 s |
| ISS | 3 days | 590 | 0.83 s | 0.05 s | 17× | 0.16 s |
| Landsat 8, 699 × 701 km | 1 day | 10 412 | 5.6 s | 0.23 s | 25× | 0.34 s |
| Landsat 8 | 3 days | 10 422 | 18.5 s | 0.55 s | 34× | 0.69 s |

- **Pairs searched** are those whose SGP4 bands overlap.
- **The worker's whole job** is `screenSets`: it makes the 30 000 sets ready for SGP4 again, then
  screens them with the filter. It does not include the browser's copy of the sets to the worker.
- **Where the rest of the time goes** (Landsat 8, three days, timed stage by stage):
  - the filter's own work, pass by pass, about 0.3 s;
  - the 132 pairs whose planes are within 3° of each other, searched whole, 0.13 to 0.23 s.

**In Chromium, with the worker slowed (P2.5).** Chromium's own CPU slow-down reaches only the
page's thread. So the worker's threads were put in a Linux control group limited to a quarter of
one core (cgroup v1, `cpu.cfs_quota_us` 25 000 of 100 000), and the page's thread was slowed four
times with DevTools. This stands in for a slow phone; it is not a phone. It slows the arithmetic
but not the memory or the caches, and no phone was measured. The page was 375 × 812, the file the
same 30 000 objects, the window three days and the limit 5 km. Each figure is one run, on
28 September, timed from the button to the answer. It includes copying the sets to the worker,
which runs on the page's slowed thread.

| primary | worker at full speed | worker at a quarter core | before the filter, at a quarter core |
| --- | --- | --- | --- |
| ISS | 2.0 s | 2.7 s | — |
| SCD 1, 708 × 768 km at 25°, the page's first in the imaging group | 2.7 s | 5.3 s | 80.5 s (27 s at full speed) |
| Landsat 8 | 2.5 s | 4.7 s | — |

- With the filter, most of the time is the page's own work, which the DevTools slow-down governs:
  the quarter-core worker adds 0.7 to 2.6 s.
- The page drew throughout, at a median of 133 to 183 ms a frame (117 to 133 ms at rest). Software
  WebGL on this machine sets that pace, not the screening.
- The before-the-filter figures are from the same script and page on 27 September.

### Overflights of a place (M02)

**Overflights of** a place (`src/orbit/overflights.ts`) lists every pass of a group's satellites
over it whose highest point is above a chosen elevation, and for each the view from the satellite
at that point: the off-nadir angle a camera must look at, the distance from the ground track,
whether the place is in daylight, the local mean solar time and the heading. For it the catalogue
gained a group, CelesTrak's Earth Resources set (167 satellites on 2026-09-26: civil and
commercial imagers, radar satellites, and military ones whose element sets are published, such as
China's Yaogan, "government remote sensing … likely also used as a military reconnaissance
satellite", [Gunter's Space Page](https://space.skyrocket.de/doc_sdat/yaogan-1.htm)).

`tests/overflights.test.ts` holds it to R03 and to published orbit design:

- **The passes are R03's**: the Earth-imaging group over Bangkok for a day gives exactly the passes
  R03 finds for each satellite, in time order (497 above 10°).
- **The off-nadir angle** agrees with the triangle the satellite, the place and the Earth's centre
  make, sin η = (|site| / |sat|) cos ε, to the rounding of a degree (the elevation is geodetic,
  the triangle geocentric).
- **Local times.** A sun-synchronous imager crosses the equator southbound at a fixed local time;
  over a place off the equator and off the track the time moves by up to about 25 minutes at 60°
  of elevation. The tolerance, 30 minutes either side of the published time, was fixed before the
  comparison. Every overflight of Bangkok above 60° in 16 days from 2026-09-26 12:00 UTC:

| satellite | published local time, descending node | by day, southbound | by night, northbound |
| --- | --- | --- | --- |
| Landsat 8 | 10:12 ± 5 min ([USGS](https://www.usgs.gov/landsat-missions/landsat-8-and-9-maneuvers)) | 5, at 10:08–10:32 | 4, at 21:54–22:12 |
| Landsat 9 | 10:12 ± 5 min (USGS) | 5, at 10:08–10:32 | 4, at 21:54–22:12 |
| Sentinel-2A, 2B, 2C | 10:30 ([ESA SentiWiki](https://sentiwiki.copernicus.eu/web/s2-mission)) | 5 each, at 10:26–10:47 | 5 each, at 22:09–22:29 |
| THEOS-2 | 10:00–10:30 ([eoPortal](https://www.eoportal.org/satellite-missions/theos-2)) | 3, at 10:18–10:26 | 4, at 21:58–22:16 |

Every one is by day when southbound and in the dark when northbound, as a morning orbit must be.
THEOS-2 was added to the test after the first run, at the same tolerance. Landsat's reference was
first written as 10:00 ± 15 minutes (Landsat 7's requirement) and corrected to the USGS figure for
Landsat 8 and 9 before this was committed; the results are within the tolerance either way.

#### What the instrument can image (P2.5)

An overflight is not an image: that depends on the instrument. `src/data/sensors.ts` holds the
published geometry of the instruments on 95 of the catalogue's satellites (64 entries, satellites of one design sharing one), each
with its sources: a fixed camera's swath (Landsat's OLI, Sentinel-2's MSI, MODIS, Sentinel-3's
OLCI), an agile camera's largest off-nadir angle (Pléiades, WorldView, THEOS and THEOS-2, the
Gaofen, …), a radar's incidence angles and, where a source says so, the side it looks to
(Sentinel-1 to the right, ESA's
[instrument description](https://sentinel.esa.int/web/sentinel/technical-guides/sentinel-1-sar/sar-instrument/description)).
`src/orbit/sensors.ts` judges each overflight at its highest point: a camera needs daylight and the
place inside its swath or within its off-nadir limit; a radar needs the place on its side and the
incidence (90° less the elevation there) within its band. Where an agile satellite's limit is not
published it would not be judged (the path is kept and tested with a made-up entry), but every
agile satellite in the table now has one; the 15 the operators have retired but the catalogue
still lists (SPOT 7, COSMO-SkyMed 1 and 3, and 12 of those added on 2026-09-28, below) are marked
so. Where sources disagree the operator's figure is used and the other noted in the table (the
Maxar angles, for one, are the tasking limits, not what the satellites can turn to). Cartosat-2C to
2F take the 0.6 m of NRSC's
[product sheet](https://bhoonidhi.nrsc.gov.in/bhoonidhi_resources/help/sampleprods/Cartosat-2S/C2S-Specs.pdf)
for the series over eoPortal's 0.65 m, as Cartosat-3 takes NRSC's 0.28 m.

Three agile satellites were first entered unjudged and were given limits in the P2.5 fix-up
(2026-09-27). Where the along- and across-track limits differ the across-track one is used: a pass
is judged at its highest point, where the place is square to the track and the satellite rolls to
see it.

- **Cartosat-3**: its operator's figures, from NRSC's
  [brochure](https://www.nrsc.gov.in/nrscnew/assets/pdf/announcements/C3_BROCHURE_JAN2021_modified.pdf):
  "The satellite is capable of steering up to +45° and +26 ° along and across the track
  respectively", so 26°; and 0.28 m and a ~17 km swath, as distributed, where the table had the
  design figures of eoPortal and Gunter's Space Page (0.25 m, 16 km).
- **Cartosat-2C**: ISRO gives no angle for it, only that it "is similar to the earlier Cartosat-2, 2A
  and 2B". The series' figure is ISRO's for
  [Cartosat-2B](https://www.isro.gov.in/CARTOSAT_2B.html), "steerable up to ± 26o along as well as
  across track", so 26°. The sources disagree: eoPortal's Cartosat-2D page says "off-nadir angles of
  up to 45 degrees", as eoPortal and a Department of Space paper (Radhadevi et al.) say for the first
  Cartosat-2 and eoPortal for 2B itself ("up to ±45° along-track and cross-track", against ISRO's
  ±26°), and eoPortal's 2E page gives ±45° along the track and ±26° across; the operator's figure is
  used, and ISRO's 2B page is the entry's first source, the one the Engineer level's "source" link
  opens. The "field of regard of 400 km" the table used to cite is WMO OSCAR's text, which
  OSCAR gives for Cartosat-3's camera too. Since 2026-09-28 Cartosat-2D, 2E and 2F share the entry
  (below).
- **CO3D**: no operator publishes how far it can turn. The one angle published is a planning limit,
  in CNES's paper written before launch (Lebègue, Cazala-Hourcade, Languille, Artigues, Melet,
  ["CO3D, a worldwide one-meter accuracy DEM for 2025"](https://doi.org/10.5194/isprs-archives-XLIII-B1-2020-299-2020),
  ISPRS Archives XLIII-B1-2020, 299–304): "the CO3D acquisition plan limits roll angles to 15° and
  pitch angles to 20° for each satellite of a stereo pair". It is used as 15°, labelled a planning
  limit as the Maxar and SkySat tasking limits are: the 3D mission's, not what the satellites can
  turn to.

**Added on 2026-09-28: 44 satellites, in 25 new entries and 4 joined to existing ones.** Joined:
Cartosat-2D, 2E and 2F to 2C, ISRO calling each "similar to the earlier" satellites "of the
Cartosat-2 series" ([PSLV-C37](https://www.isro.gov.in/CARTOSAT_2_PSLVC37.html)); SkySat-C2 to C11 to C1,
Planet's figures being for the whole C generation ([Planet](https://docs.planet.com/data/imagery/skysat/));
WorldView Legion 2 to 4 to Legion 1, on the operator's one
[datasheet](https://pacgeo.com/wp-content/uploads/2025/12/Vantor_WorldView-Legion_25AUG2025_Datasheet_PacGeo.pdf)
for the fleet; CSG-3 to the CSG ([ESA](https://earth.esa.int/eogateway/missions/cosmo-skymed-second-generation)).
New agile cameras: Cartosat-1, 2A and 2B, Resourcesat-2 and 2A (LISS-4, on its steering motor),
KOMPSAT-2, KazEOSat-1 and 2, KazSTSAT, DubaiSat-1 and 2, RASAT, Göktürk-1A, ASNARO-1, LAPAN-A3,
Resurs-DK1, Resurs-P No.4, CBERS-4 (PAN, by its mirror) and ZY-1 02C (HR). New fixed ones:
Oceansat-2's OCM-2, which tilts only along the track ([eoPortal](https://www.eoportal.org/satellite-missions/oceansat-2)),
Deimos-1, HJ-1A and 1B, HY-1B's CZI, GOSAT's TANSO-CAI and TechSat-1B. HJ-1's and HY-1B's are
fixed by inference: no source describes a way to turn them, and none says they cannot. SWOT's
KaRIn, a water-height interferometer, is entered as a radar looking to both sides, its band of
incidence (0.73° to 4.39°) worked out on a sphere from the "two 50 km swaths from 10 to 60 km on
each side of the nadir ground track" of JPL's
[handbook](https://www.earthdata.nasa.gov/s3fs-public/2024-06/D-109532_SWOT_UserHandbook_20240502.pdf),
not a published angle. Some retirements are known to the month or the year only (Oceansat-2,
TechSat-1B, Cartosat-2A), and DubaiSat-1's is the date of the report that it had stopped imaging.
Each entry's comment in the table gives its sources and their disagreements. Of the imaging group's
73 satellites not in the table, 72 were examined and left out; the 73rd, PRSC-E03, launched in
2026, was not examined.

- **Not imagers in this sense**: altimeters, radiometers, sounders, a scatterometer and receivers,
  which measure a line under the track or kilometres to a pixel, or make no picture at all.
  SCATSAT-1, a wind scatterometer ([ISRO](https://www.isro.gov.in/SCATSAT_1.html)); SMOS, "a
  spatial resolution of 35 - 50 km" ([eoPortal](https://www.eoportal.org/satellite-missions/smos));
  SMAP, whose radar "stopped transmitting" in 2015
  ([eoPortal](https://www.eoportal.org/satellite-missions/smap)); GPM Core
  ([eoPortal](https://www.eoportal.org/satellite-missions/gpm)), Jason-3
  ([eoPortal](https://www.eoportal.org/satellite-missions/jason-3)), Sentinel-5P ("spatial sampling
  of 7 km x 7 km", [eoPortal](https://www.eoportal.org/satellite-missions/copernicus-sentinel-5p)),
  Sentinel-6A and 6B ([eoPortal](https://www.eoportal.org/satellite-missions/copernicus-sentinel-6)),
  ICESat-2 ("split into 6 beams", [eoPortal](https://www.eoportal.org/satellite-missions/icesat-2)),
  SARAL ([eoPortal](https://www.eoportal.org/satellite-missions/saral)), HY-2A
  ([eoPortal](https://www.eoportal.org/satellite-missions/hy-2a)), MicroCarb
  ([eoPortal](https://www.eoportal.org/satellite-missions/microcarb)), Aura
  ([eoPortal](https://www.eoportal.org/satellite-missions/aura)), GOSAT-GW
  ([eoPortal](https://www.eoportal.org/satellite-missions/gosat-gw)), Ionosfera-M 1 to 4
  ([eoPortal](https://www.eoportal.org/satellite-missions/ionosphera-m-ionosfera-m)), SCD 1 and 2,
  data relays ([Gunter's Space Page](https://space.skyrocket.de/doc_sdat/scd-1.htm)), SRMSAT, a
  spectrometer ([eoPortal](https://www.eoportal.org/satellite-missions/srmsat)), ExactView-1, an AIS
  receiver ([eoPortal](https://www.eoportal.org/satellite-missions/ev-1)), and CAS500-3, which "is
  not an Earth observation mission" ([eoPortal](https://www.eoportal.org/satellite-missions/cas500)).
- **No published pointing limit**, or for a few no geometry at all. Cameras for which no source
  gives how far they turn, or says that they are fixed: HySIS (neither ISRO's
  [page](https://www.isro.gov.in/HysIS.html) nor [eoPortal](https://www.eoportal.org/satellite-missions/hysis)
  gives a range); SkySat-A and B
  (Planet's [documents](https://docs.planet.com/data/imagery/skysat/) cover the C generation only);
  CAS500-1 and 2 ([KARI](https://www.kari.re.kr/eng/contents/170),
  [eoPortal](https://www.eoportal.org/satellite-missions/cas500)); NEMO-HD
  ([eoPortal](https://www.eoportal.org/satellite-missions/nemo-hd)); AlSat-1B, which images "en
  pointage Nadir et en roulis" ([ASAL](https://asal.dz/?page_id=76)); Göktürk-2
  ([eoPortal](https://www.eoportal.org/satellite-missions/gokturk-2)); Gaofen-1 02 to 04, which
  roll ("重访周期（侧摆时） 4天", [operator](https://www.sasclouds.com/satellite/chinese/gf1bcd)) on a
  smaller bus than Gaofen-1's ([Gunter's](https://space.skyrocket.de/doc_sdat/gf-1-02.htm)), so its
  ±35° is not carried over; Gaofen-5 01, whose AHSI has a
  pointing mirror of no published range ([operator](https://www.sasclouds.com/satellite/chinese/gf5));
  Gaofen-6 ([operator](https://www.sasclouds.com/satellite/chinese/gf6)); DLR-TUBSAT, Maroc-TUBSAT
  and LAPAN-TUBSAT ([eoPortal](https://www.eoportal.org/satellite-missions/tubsat)); HODOYOSHI-3
  and 4 ([eoPortal](https://www.eoportal.org/satellite-missions/hodoyoshi-3-4)); Kent Ridge 1
  ([eoPortal](https://www.eoportal.org/satellite-missions/kent-ridge-1)); Pathfinder 1
  ([eoPortal](https://www.eoportal.org/satellite-missions/blacksky-constellation)). ZY-3 02 was
  proposed at 32° and rejected: that is eoPortal's figure for ZY-3 01
  ([eoPortal](https://www.eoportal.org/satellite-missions/zy-3a)), and no source gives one for 02.
  Gaofen-4 is geostationary ([operator](https://www.sasclouds.com/satellite/chinese/gf4)), outside
  a low orbit's pass judgement, and no pointing limit is published for it either. Carbonite-1 has
  no published swath and is retired ([eoPortal](https://www.eoportal.org/satellite-missions/carbonite)).
  No geometry is published for SaudiSat 5A and 5B, PARS 1, PRSC-EO1, Shiyan-1, Sinah-1, Gaofen-8
  ([Gunter's Space Page](https://space.skyrocket.de/doc_sdat/gf-8.htm)), Gaofen-9 01 ("sub-meter
  class", [Gunter's](https://space.skyrocket.de/doc_sdat/gf-9.htm)), Gaofen-10R ("The exact nature
  of the GF 10 satellite is not known", [Gunter's](https://space.skyrocket.de/doc_sdat/gf-10.htm)),
  or the radars Gaofen-12 01 to 04 ([Gunter's](https://space.skyrocket.de/doc_sdat/gf-12.htm)) and
  PRSC-S1 ([Gunter's](https://space.skyrocket.de/doc_sdat/prsc-s1.htm)).
- **Military, with no public figures**: Gaofen-11 01, "believed to be in fact a military
  satellite" ([Gunter's](https://space.skyrocket.de/doc_sdat/gf-11.htm)); the radars Yaogan-3 and
  10, of which "It is not known which band the JB-5's radar is working, and what kind of resolution
  the radar image can achieve" ([Gunter's](https://space.skyrocket.de/doc_sdat/yaogan-1.htm)), and
  Yaogan-29, likely their successor ([Gunter's](https://space.skyrocket.de/doc_sdat/yaogan-29.htm));
  and the optical reconnaissance satellites Yaogan-4, 7 and 24
  ([Gunter's](https://space.skyrocket.de/doc_sdat/yaogan-2.htm)), 21
  ([Gunter's](https://space.skyrocket.de/doc_sdat/yaogan-5.htm)), 22 and 27
  ([Gunter's](https://space.skyrocket.de/doc_sdat/yaogan-8.htm)), 26
  ([Gunter's](https://space.skyrocket.de/doc_sdat/yaogan-26.htm)) and 28
  ([Gunter's](https://space.skyrocket.de/doc_sdat/yaogan-14.htm)).

`tests/sensors.test.ts`:

- **The swaths follow from the fields of view**: 2 × the ground reach of half the field of view at
  the orbit's height, asin((R + h)/R · sin η) − η on a sphere, gives MODIS's 2 330 km (±55° at
  705 km), OLI's 185 km (15° at 705 km) and MSI's 290 km (20.6° at 786 km, 286 km) within 2 %;
  OLCI's 68.5° field turned 12.6° from the Sun gives 1 274 km for its published 1 270 km, reaching
  947 km to one side and 327 km to the other. The 2 % was set after Sentinel-2's figure had been
  worked out while the table was built.
  The fixed cameras added on 2026-09-28 whose source gives the field of view, the altitude and
  the swath together were held to the same 2 %, fixed before any of them was worked out:
  Oceansat-2's OCM-2 (±43° at ~720 km, eoPortal) gives 1 419.4 km for 1 420 and GOSAT's TANSO-CAI
  (72° at 666 km, eoPortal's GOSAT-2 article) 997.1 km for 1 002, both inside; HY-1B's CZI (36° at
  798 km) gives 522.2 km for 500 (+4.4 %) and Deimos-1's SLIM6 (52° at ~661 km) 653.2 km for
  ~620 (+5.4 %), both outside. That is a finding: those published figures do not agree with each
  other on a sphere, and the test records it (the bounds that do so were set after the run). The
  table keeps the published swaths, the operator's 600 km for Deimos-1. HJ-1's WVC (its "aspect
  angle" not called a field of view) and TechSat-1B's ERIP (no field of view published) were not
  held to it.
- **The side and incidence of each overflight**: for the near-polar imagers over Bangkok the side
  the place is on agrees with its longitude against the point below the satellite and the heading
  (every pass more than 100 km off the track), and the incidence agrees with the off-nadir angle by
  the sine rule on a sphere, within 0.5°.
- **The ground an instrument reaches**, drawn on the map (`reachEdges`): Sentinel-1's band of
  incidence, 29.1° to 46.0° from 693 km, reaches 344 to 617 km to the right of the track on a
  sphere, 273 km across for its published 250 km (held to 10 %, worked out before the test was
  written); a fixed camera's edges are its swath's, an agile one's its pointing reach either side.
- **The three limits found later**: Cartosat-3 and Cartosat-2C are judged against 26° and the four
  CO3D against 15°, and their reach either side from 505 and 502 km (the altitudes NRSC and ISRO
  give for the Cartosats, CNES for CO3D) is 248.7 and 134.9 km, worked out on a sphere before the
  test was written and held to 1 km.
- **Revisits as the missions publish them.** The tolerance — at least one image possible in the
  published period, from 2026-09-26 12:00 UTC — was fixed before the run:

| satellite | published | images of Bangkok possible |
| --- | --- | --- |
| Landsat 8 | "crossing every point on Earth once every 16 days" ([USGS](https://www.usgs.gov/landsat-missions/landsat-8)) | 1 in 16 days: 2026-10-01 03:37 UTC, 10 km from the track |
| Landsat 9 | the same | 1 in 16 days: 2026-10-09 03:38 UTC, eight days after Landsat 8, as the pair is phased |
| Sentinel-2A, 2B, 2C | "The revisit frequency of each single satellite is 10 days" ([ESA](https://sentiwiki.copernicus.eu/web/s2-mission)) | 1 each in 10 days: 09-29, 10-02 and 09-27, at 03:54 UTC, 52 km from the track |
| Sentinel-1A | "a 12 day repeat cycle" (ESA) | 2 in 12 days, both before dawn going south with Bangkok to the right, at incidences of 41° and 32° |

The tests say nothing of tasking or cloud: an image possible is not an image taken.

### Re-entry prediction (M03)

For a satellite in a low orbit (perigee under 700 km), **When it will come down**
(`src/orbit/reentry.ts`) carries its element set's mean orbit (`src/orbit/mean-state.ts`) down by
the long-term propagator's mean elements, J2 and drag in the R05 density with the Sun as
measured and forecast, until the perigee is under 120 km. The user gives the mass and mean
cross-section, which an element set does not carry. The window is ±20 % of the time left, the
convention of the agencies that make these predictions: ESA takes it as about two standard
deviations and found its own predictions outside it in about 5 % of 15 campaigns
([Klinkrad, "Methods and procedures for re-entry predictions at ESA", 2013](https://conference.sdo.esoc.esa.int/proceedings/sdc6/paper/148/SDC6-paper148.pdf)).
It narrows as the time left does, with each later element set.

The case study is the four Long March 5B core stages, 21.6 t each, left in orbit by their
launches and fallen uncontrolled days later. Each is predicted from its first element set
(CelesTrak) as a tumbling cylinder of GCAT's 31.7 × 5.0 m, whose mean cross-section is a quarter
of its surface (Cauchy: 134.3 m²), C_D 2.2, the Sun as measured, against its re-entry as GCAT
records it. The tolerance, the re-entry inside the ±20 % window, was fixed before the comparison.

| stage (payload) | first element set | predicted | re-entry (GCAT) | error of the time left | ±20 % window | fixed moderate Sun |
| --- | --- | --- | --- | --- | --- | --- |
| Y1 (crew spacecraft test) | 2020-05-05 14:12 | 2020-05-11 17:13 | 2020-05-11 15:34 | +1.1 % | inside | −28.5 % |
| Y2 (Tianhe) | 2021-04-29 09:08 | 2021-05-08 16:45 | 2021-05-09 02:14 | −4.1 % | inside | −35.5 % |
| Y3 (Wentian) | 2022-07-24 14:45 | 2022-07-31 17:08 | 2022-07-30 16:51 | +16.6 % | inside, 9.8 h from its edge | +0.2 % |
| Y4 (Mengtian) | 2022-10-31 13:01 | 2022-11-04 16:20 | 2022-11-04 10:01 | +6.8 % | inside | +2.3 % |

Times are UTC, with P2.5's density (NRLMSISE-00, daily indices). With R05's day-averaged density and
monthly indices they were −1.4, −3.2, −7.0 and +18.9 % (mean 7.6 %). `tests/reentry.test.ts` holds
each inside its window, the cross-section to Cauchy's formula, and the measured Sun's mean error
(7.2 %) below the fixed Sun's (16.6 %).

**Findings.**

- **All four came down inside the window**, three of them within 7 % of the time left. That is
  as good as ESA reports for half its own predictions (within ±6 %), with a size taken from a
  catalogue rather than fitted to the tracking. Four cases are not a statistic.
- **The daily indices moved the stages both ways.** Y4, which flew in the most active Sun of the
  four and was predicted 18.9 % late with monthly means, is now 6.8 % late; Y3 went from 7.0 %
  early to 16.6 % late, 9.8 hours from its window's edge. Averaged, the error is the same (7.2 % against
  7.6 %). The fixed moderate Sun happens to do well for the two stages of 2022, whose Sun was
  moderate, and badly for the two of the quiet Sun.
- **The stages tumble, and their area is a guess.** A stage flying broadside (158.5 m²) would
  come down about 15 % sooner than the tumbling average; one end-on (19.6 m²), far later. With the
  area fitted to the stage's own decay, as the agencies do, the window can be trusted; with a
  catalogue's size, it is an estimate, and the page says so.
- **A storm is its day's Ap.** The indices are daily since P2.5; within a day the peak of a storm's
  3-hour ap is averaged in (NRLMSISE-00's storm mode, which reads the ap history, is not used), which
  can move a re-entry by an hour or two.

#### The drag fitted to the tracking, and 66 more stages (P2.5)

The agencies do not guess the area: they fit the ballistic coefficient B = C_D A/m to the
object's own decay in the tracking, which takes in the density model's error along with the
object's shape and attitude (Klinkrad 2013). `src/orbit/ballistic.ts` fits it two ways, and
**When it will come down** offers whichever the element sets allow, beside the mass and size
given by hand:

- **to a history of element sets** read from a file (Space-Track's history of an object, say, which
  the user downloads; nothing is fetched): B such that the orbit carried from the earliest set falls
  to the latest set's mean semi-major axis by its epoch, found by regula falsi on log B on the time
  to fall, which shortens steadily as B grows. The prediction then starts from the latest set.
- **to one set's decay rate**: the set carries ṅ, its maker's fit of the decay; the semi-major axis
  falls as ȧ = −(2/3)(a/n)ṅ, the mean-element drag rate at the epoch is proportional to B, and so B
  follows at once. A set with ṅ ≤ 0 gives nothing.

A prediction with a fitted B, or an eccentric one (below), runs in a Web Worker
(`src/orbit/reentry-job.ts`). `tests/ballistic.test.ts`; the sources of its data are in
`tests/fixtures/space-weather/README.md` and `tests/fixtures/reentry/make_stages.py`.

**Two sets of each sphere.** Each sphere's first and last element sets (CelesTrak, the last within
hours of its re-entry): B within 30 % of its known C_D A/m, fixed before. Met:

| sphere | known C_D A/m, m²/kg | fitted to first and last sets |
| --- | --- | --- |
| Starshine | 0.01021 | 0.00937 (−8.2 %) |
| Starshine 2 | 0.01021 | 0.01037 (+1.6 %) |
| Starshine 3 | 0.01678 | 0.01426 (−15.0 %) |
| ANDE MAA | 0.00773 | 0.00596 (−23.0 %) |
| ANDE FCal | 0.00545 | 0.00416 (−23.5 %) |
| ANDE-2 Pollux | 0.01466 | 0.01081 (−26.3 %) |
| ANDE-2 Castor | 0.00848 | 0.00680 (−19.8 %) |

The fitted B is short by what the model's air is too thick (§6: the same spheres come down 8 to
23 % early with their true B), which is the point of fitting it: carried with it, each comes down on
its day. Starshine 2 from its last set, with B fitted to both, comes down within a day of GCAT's
date (fixed before, met).

**The rocket stages of 2023–2025.** The selection, fixed before any prediction: every rocket stage
in GCAT (satcat of 2026-09-24) re-entered uncontrolled (status R), dated to the minute, between
2023-01-01 and 2025-12-31, 5 to 150 days after its launch — 66, each with its first element set
(CelesTrak, one request per launch). Fixed before: at least 20 predicted with B from the first
set's decay rate, 70 % of them inside the ±20 % window.

| predicted from the first element set | inside the ±20 % window |
| --- | --- |
| B fitted to the set's decay rate | 7 inside of 13 predicted (only 14 of 66 first sets give a B) |
| GCAT's dry mass and size, a tumbling cylinder, C_D 2.2 | 33 of 66: 29 of 58 near-circular orbits, 4 of 8 transfer orbits |
| the same, before P2.5 (mean elements for every orbit) | 29 of 66: none of the 8 transfer orbits |

**A screen, written after the results (P2.5 fix-up).** Some misses are not natural decays from the
orbit of the first set. Excluding them one by one, after seeing them, would be choosing the data;
so three general rules, computed from the fixture for all 66 (GCAT's catalogued orbit, bus and
motor against the first set's mean elements), are applied, and their counts are reported beside
the unscreened ones, which stay the result of record. The rules were made after the results, and
the thresholds (25 km, 3 days, 30 km) were set with the worst misses in view.

- **(a) The first set is not the stage's**: its mean perigee differs from GCAT's catalogued perigee
  by more than 25 km while GCAT's orbit is dated within 3 days of the set's epoch. Drag cannot move
  a perigee of 150–350 km by 25 km in 3 days without bringing the stage down, and the two
  conventions (a set's mean elements, GCAT's heights) differ by a few kilometres. Prompted by
  Electron 43 stage 2, whose first set (515 × 537 km) is the payload stack's; GCAT puts the stage at
  179 × 527 km. It also catches Electron 77 stage 2 (first set 177 km, GCAT 263 km), whose first set
  (rev 13) decays as its perigee should and which both arms bring down inside: there GCAT's orbit
  looks the odd one, and the rule excludes a good case. The rule is kept as written.
- **(b) A stage built to fire after deploying its payloads**, so that its orbit can change after the
  first set, by GCAT's `Motor`: Electron's kick stage (Curie), whose sequence ends with a "Final
  engine burn to lower Kick Stage altitude and accelerate deorbiting" ([Rocket Lab, Electron Payload
  User Guide 8.0](https://rocketlabcorp.com/assets/Rocket-Lab-Electron-Payload-User-Guide-8.0.pdf),
  pp. 17–19). It catches the Electron 67 kick stage, 647 % late: down in 5 days from 235 × 605 km,
  which its published 40 kg and 1.2 m cannot do even flying flat-face-on. Other upper stages lowered
  their perigee after deployment (the Long March 4B third stages, Gushenxing-1, Kuaizhou-1A,
  Jielong-3: GCAT's orbits against their payloads'), but before their first set, whose perigee
  already agrees with GCAT's; their decay from it is natural, and they stay.
- **(c) An eccentric orbit (e ≥ 0.1) whose GCAT orbit, dated after the set, has its perigee more
  than 30 km below the first set's.** On such an orbit drag takes the apogee down far faster than the
  perigee, which hardly moves until the orbit is nearly circular (D. King-Hele, *Satellite Orbits in
  an Atmosphere*, 1987), so a perigee lowered that far was a burn or venting, not decay. The Sun and
  the Moon move such a perigee too, and the model carries them: Cowell with J2–J4, the Sun and the
  Moon keeps both stages the rule catches within some 10 km of their first sets' perigees over those
  weeks, and SGP4/SDP4's analytic terms within 20 km (the P2.5 fix-up's diagnosis). It catches H3 F4 stage 2 (first set 351 km; GCAT 135 × 33 801 km
  62 days later) and the Long March 7A Y13 third stage (174 km; GCAT 104 × 6 127 km 9 days later).
  Neither burn nor venting is published: JAXA says F4 made no third ignition, and the first set was
  taken during its five-hour coast experiment; nothing was found for the Long March 7A Y13.

| predicted from the first element set | unscreened | screened (61 of 66) |
| --- | --- | --- |
| B fitted to the set's decay rate | 7 inside of 13 predicted (14 fitted) | 6 inside of 12 predicted (12 fitted) |
| GCAT's dry mass and size | 33 of 66 | 32 of 61 |
| — near-circular orbits | 29 of 58 | 28 of 55 |
| — transfer orbits | 4 of 8 | 4 of 6 |

Split by GCAT's mass flag (nothing refitted): 26 of the 43 stages whose dry mass is GCAT's own
estimate ("?", "hopefully good to about 20 percent") come down inside, and 7 of the 23 whose mass is
not flagged — the Soyuz Blok-I and Long March 2F second stages, whose masses agree with published
dry masses, are among the latter.

**Findings.**

- **The fixed criterion was missed, and could not have been met.** It asked for at least 20
  predictions with B from the first set's decay rate, 70 % of them inside. A first element set is
  made from the first days of tracking, often 0 to 10 revolutions after launch: 52 of the 66 carry
  no decay that gives a B, so only 14 could be fitted — fewer than the 20 asked for, whatever the
  model — and 7 of the 13 predicted (54 %) came down inside. The fits range from 0.06 to 7.6 times
  the B of the stage's catalogued size (for a transfer orbit the mean drag rate at the epoch is a
  poor measure of B). It stays recorded as missed on both counts; nothing was changed to meet it.
  Predicted from their first sets, half the stages come down inside the window, whichever way the
  drag is had; the median error of the time left is 19 %. No published hit rate exists for
  predictions from a single first set with a catalogued size to set this against: the agencies'
  90–95 % inside ±20 % (Klinkrad 2013; Pardini and Anselmo, J. Space Safety Eng. 5, 2018) are
  campaign predictions in the last one to two weeks, with the drag refitted to every new set from
  several sources. The test that asks what they ask, with the drag fitted to later sets, is the
  agencies'-way test below, fixed before it ran.
- **The stages of one kind err one way.** The Soyuz Blok-I stages come down 18 to 65 % early, the
  Long March 2F second stages 10 to 46 % early and the Long March 4B third stages 66 to 71 % early,
  as if they flew heavier (or with less area) than GCAT's figures. For the first two GCAT's dry mass
  mostly agrees with the published one (four of the six Blok-I at 2 350 kg against 2 355 kg in
  Arianespace's Soyuz CSG User's Manual, 2012, the other two, of Soyuz-2-1b No. 067, at 2 710 kg;
  Long March 2F stage 2, 5 500 kg against 5 500 kg empty in
  [Wikipedia](https://en.wikipedia.org/wiki/Long_March_2F)); the Long March 4B's 1 000 kg is GCAT's own
  estimate ("?"), and no published dry mass was found. Propellant left in a stage would do it, but no
  source says so, and the Long March 4B third stage has a system to vent what is left (Chinese
  Wikipedia, "长征四号乙运载火箭"). The Long March 7 second stages, in the same orbits as the 2F's,
  come down inside every time. Nothing was fitted to them.
- **A transfer orbit is the Sun's and the Moon's.** Eight stages were left in transfer orbits
  (eccentricity 0.36 to 0.82; the first sets' mean perigees 114 to 174 km for six of them, 213 km
  for Falcon 9-402 and 351 km for H3 F4 — until the P2.5 fix-up this said "112 to 171 km" for all
  eight, which was wrong). With the mean elements, which leave out the
  Sun and the Moon, five stayed up past 400 days, one came down three times too late, and the two
  whose first perigee was already under 120 km were declared down at once; carried by Cowell
  without the Sun and the Moon, all eight stayed up. Their pull moves such a perigee by tens of
  kilometres in weeks, and that sets the day. Since P2.5 an orbit of eccentricity 0.1 or more is
  carried by Cowell from SGP4's state at the epoch, with J2–J4, the Sun and the Moon, until it is
  down: five of the eight come down within 25 % of the day (Falcon 9's two within 2 %, the Long
  March 3C's within 5 %), four inside the window; H3 F4's stays up past 400 days and the Long
  March 7A Y13's comes down nine times too late. This change was made after the first run showed
  the failure; the circular orbits' predictions are unchanged by it. Those two are not natural
  decays from their first sets' orbits (the screen's rule (c) above): GCAT's later orbits put their
  perigees 216 and 70 km lower within 62 and 9 days, where Cowell with J2–J4, the Sun and the Moon,
  and SGP4/SDP4 too, hold them within some 20 km of the first sets'. A burn, venting or a bad first
  set would do it; no source for either stage was found (JAXA says F4 made no third ignition; its
  first set was taken during the five-hour coast experiment after separation). Lowering the
  perigee to some 160 km (H3 F4, about 20 m/s at apogee) or 130 km (Long March 7A Y13, about
  11 m/s) at the first apogee brings each down within 8 % of its day and puts the Long March 7A
  Y13's apogee on GCAT's mid-life orbit within 25 km — a diagnosis run, not a fit adopted.
- **The model's early bias is NRLMSISE-00's own.** Six of the seven spheres of §6 come down 8 to
  23 % early and Starshine 2 1.5 % late (−16 % on average); to land on their days each needs NRLMSISE-00's density times 0.92, 1.02, 0.85, 0.78, 0.77,
  0.74 and 0.80, which is what the B fitted to two sets gives (above), so the whole bias acts as one
  factor on density × C_D. The literature finds the same: densities 10–30 % below expectation in
  2007–2009 (Emmert, Lean and Picone, GRL 37, L12102, 2010), mean NRLMSISE-00 scale factors of 0.74
  to 0.95 for 2006–2010 (Zeitler et al., 2021). A physical C_D cannot explain it (Sentman's sphere
  formula gives 2.11–2.13 with full accommodation, which would lengthen the lifetimes by only 3–4 %,
  and more with less accommodation, which would shorten them). With NRL's Fortran run from pymsis in
  a scratch diagnosis (not the app), NRLMSIS 2.0/2.1 would bring the spheres from −16 % to about −5 %
  on average — an estimate — and would not help the stages (by a simplified model, inside the
  window would fall from about 30 of 57 near-circular stages to about 24). The only better model
  that could legally be ported is NRLMSIS 2.1: JB2008's licence forbids translating the code or
  adapting its index files (Space Environment Technologies), DTM2020's forbids modifying or passing
  on the code (CNES). NRLMSIS 2.1's licence, in NRL's download, allows a translation for research,
  academic and non-profit use, on conditions: the port published as open source and marked as
  changed, sent to NRL (Code 7630), shipped with the licence file, never sold. Whether to accept them
  is the owner's decision, **pending**: on 2026-09-27 the owner asked to come back to it later.
  NRLMSISE-00 stays the model (ECSS-E-ST-10-04C Rev.1 says it "shall" be used), and a B fitted to
  the tracking takes its bias in.
- **The mass column was corrected (P2.5 fix-up).** Until 2026-09-27 the fixture read GCAT's `Mass`,
  which for a stage is its mass at orbital insertion; GCAT gives `DryMass` as "a reasonable proxy for
  the mass of the object after its active lifetime" ([GCAT's columns](https://planet4589.org/space/gcat/web/cat/cols.html)),
  which is what a spent stage falls with. `make_stages.py` now takes `DryMass` where GCAT gives one,
  else `Mass`, and keeps both with their flags. They differ for four stages, the Long March third
  stages in transfer orbits (8 400 kg against 2 800 kg, both flagged "?", an estimate); the published
  empty mass of the Long March 7A third stage is 2 800 kg ([Wikipedia](https://en.wikipedia.org/wiki/Long_March_7A)).
  The counts inside the window are unchanged (33 of 66; 4 of 8 transfer orbits); within 25 % of
  the day the transfer orbits went from 6 of 8 to 5 (the Long March 7A Y6 from −22 % to −27 %, the
  Long March 3C from 0 % to −5 %), and the Long March 7A Y13, which stayed up past 400 days at
  8 400 kg, comes down at 2 800 kg 858 % late.

**Re-entries predicted the agencies' way: the test fixed before it runs (P2.5, 2026-09-27).**
A first element set is made from days of tracking, and the test above asks more of it than the
agencies do: they refit the drag with every new set. This test does as they do, on element-set
histories from J. McDowell's archive ([planet4589.org/space/elements](https://planet4589.org/space/ele.html)),
whose sets of NORAD origin before 2004 were distributed without restriction; the owner agreed on
2026-09-27 that the sets used be bundled, with attribution. Fixed before any prediction:

- **The objects.** From GCAT, payloads and rocket stages (not debris) that re-entered uncontrolled
  (status R) between 1985-01-01 and 2004-06-30 and whose history holds sets of NORAD origin at every
  lead time below; sorted by catalogue number, 100 taken at even steps (all, if fewer).
- **The predictions.** For each lead time L of 30, 10 and 5 days: the set of NORAD origin nearest
  to L days before re-entry (within a day of it), and a second set nearest to 7 days before that one
  (4 to 12 days before); B fitted to the two (`ballisticFromSets`), the prediction carried from the
  later set with the Sun as measured (GFZ), by the mean elements, or by Cowell with the Sun and the
  Moon for an eccentric orbit, as the app does. The re-entry is GCAT's `DDate`, noon for a day.
- **The criteria.** Inside the ±20 % window: at least 80 % of the objects at 5 and at 10 days,
  at least 70 % at 30 days.

**The result (first run, 2026-09-27).** `tests/fixtures/reentry/make_agencies.py` applied the
selection: of the 1 893 objects GCAT has re-entering in those dates (and 13 more dated only to the
month or year, which give no lead time), 12 have no file in the archive and 1 314 lack a NORAD set
at some lead time; 567 qualify, and 100 were taken. 53 are payloads and 47 rocket stages, 1985 to
2004; 97 re-entries are dated to the day, 3 to the minute; none of the 600 sets used carries a
problem flag. The fixture and `tests/heavy/reentry-agencies.test.ts` were committed before the
test first ran. The error is that of the time left, (predicted − from)/(actual − from) − 1, over the
objects predicted; the window is ±20 % of the predicted time left, so an object is inside when its
error lies between −16.7 % and +25 %.

| lead time | inside the ±20 % window | criterion | median error | interquartile range | median \|error\| | no B fitted |
| --- | --- | --- | --- | --- | --- | --- |
| 30 days | 81 of 100 | ≥ 70 %: **met** | +0.4 % | −6.2 to +7.2 % | 6.6 % | 7 |
| 10 days | 85 of 100 | ≥ 80 %: **met** | −1.5 % | −7.2 to +6.9 % | 7.2 % | 8 |
| 5 days | 79 of 100 | ≥ 80 %: **missed** | −0.8 % | −9.2 to +8.4 % | 8.9 % | 8 |

**Findings.**

- **Two criteria met, one missed by one object.** At 5 days 79 of 100 came down inside, against the
  80 fixed. The selection, the method and the criteria are as fixed; the test records the counts.
- **Why the 5-day one fell short.** Two things, both found after the run and neither changed:
  - *The method fits no B to an eccentric orbit in its last weeks.* 7 or 8 objects at each lead
    time get no B and count as outside: all in eccentric orbits (Molniya, Blok-L and Blok-ML, Blok
    DM-2, H-II, Ariane H10 and Centaur upper stages; e ≥ 0.1) but Kosmos-2244 at 30 days. A
    diagnosis run after the result shows why: of the 22 eccentric cases with no B (over the three
    lead times), in all but one (the Ariane H10 at 10 days, 187 km) the earlier set's mean perigee
    is already at or under 120 km — the height at which the mean-element propagator counts an
    orbit as down — while the object keeps flying for weeks, losing apogee at each pass; so
    `ballisticFromSets`, which carries the orbit by the mean elements, ends its own run at its start
    and no B brackets the fall. (Kosmos-2244's two sets at 30 days put its perigee 167 km lower in
    seven days, which no B up to 1 m²/kg does.) Of the objects in eccentric orbits none came down
    inside at 5 or 10 days (0 of 9) and 2 of 11 at 30 days; of the near-circular ones, 79 of 91
    (87 %) at 5 days, 85 of 91 (93 %) at 10 days and 79 of 89 (89 %) at 30 days — a breakdown made
    after the run, not a criterion.
  - *The re-entry is known to a day.* 97 of the 100 dates are GCAT's day, taken at noon; half a day
    is 10 % of a 5-day lead, half the window, against 1.7 % of a 30-day one; the interquartile
    range of the error widens from 13 points at 30 days to 18 at 5.
- **Where it works, it is near the agencies'.** The median error is under 2 % at every lead time,
  and half of the predictions are within 6.6 to 8.9 % of the time left; ESA's campaign predictions
  were "within ±6 % … for about 50 %" and "±10 % for about 75 %" of cases (Klinkrad 2013), with
  many orbit states from several agencies. Here the drag is fitted to two NORAD sets a week apart,
  with the Sun as measured.

**NAPA-2** (`src/data/napa2.ts`), the Royal Thai Air Force's 6U CubeSat of 10 kg, launched
2021-06-30 and re-entered 2026-07-05 (GCAT; 20 × 10 × 34.05 cm, Janes). From its first element set
(2021-07-25), 1 806 days before, fixed before: within 25 %.

| drag | C_D A/m, m²/kg | predicted | error of the time |
| --- | --- | --- | --- |
| a tumbling box of its size, C_D 2.2 | 0.0134 | 2026-11-27 | +8.0 % (met) |
| fitted to the first set's decay rate | 0.0197 | 2025-02-17 | −27.9 % (missed) |

The first set's decay rate came from its first week of tracking, in the quiet Sun of mid-2021;
over five years any error in it is multiplied. The test records the −28 %.

## 8. The Build section (D01–D05): the parts catalogue, the builder's figures, testing, sizing

The Build section (roadmap D01–D05, [ROADMAP-PART2-3.md](ROADMAP-PART2-3.md)) adds little physics
of its own. It builds vehicles from a parts catalogue and hands them to the models the launches
already fly: the Δv walk, the engine model, the aerodynamic tables, the mission planner, the
pre-flight verdict and the flight itself. So most of its checks are identities: a figure the
builder shows must be the flight model's own, or the rocket equation worked by hand in the test.
The rest are closed forms, a published worked example, published figures, and flights. The code
is in `src/data/parts.ts`, `src/design/` (no DOM) and `src/ui/build/`; the tests are
`tests/d01-*.test.ts`, `tests/parts*.test.ts`, `tests/design-*.test.ts` and
`tests/heavy/sixdof-fingerprint.test.ts`.

The bounds were fixed before each comparison unless the text says otherwise. Several cores went
in as one commit each, so for them git cannot show that the bound came first; the reviewers said
so, and it is repeated below where it matters.

### The parts catalogue (D01)

`src/data/parts.ts` holds the fleet's hardware as parts: engines, stage bodies, strap-on bodies
and fairings. The 21 vehicles of `src/data/vehicles.ts` are assembled from it. Interstages are
derived for the drawing only (`src/design/interstages.ts`) and have no mass. The catalogue must
emit exactly the fleet that flew before it, and that fleet must fly exactly as before.

**Spec identity** (`tests/d01-vehicles-identity.test.ts`). Before `vehicles.ts` was touched, the
whole `VEHICLES` value was written to `tests/fixtures/vehicles-pre-d01.json` (keys sorted,
42 929 bytes, at eedd035). In review a SHA-256 of the unsorted JSON at eedd035 was added, for the
key order.
The 21 vehicles the catalogue emits equal the fixture exactly (`256.4 * kN` is pinned as
`256399.99999999997`) and give the same hash, so even the key order is unchanged. A recursive
walk finds no value JSON cannot show (an undefined key, −0, NaN, ±Infinity, a function). **Met.**
In review the test was changed from a file snapshot to a read and compare: with Blok A's mass
changed to 87 001 kg, `vitest -u`, which the repository uses for another file, passed and
rewrote the fixture. Now an update run fails and leaves the file alone.

**Main's F11, re-recorded once, with its reason.** On 2026-09-28 main changed Falcon Heavy on
purpose (§4, F11): its side boosters and core carry Falcon 9 Block 5's published first-stage
masses, and it flies Falcon 9's max-Q bucket. When main was merged, the catalogue took the same
figures (the `side` and `core` bodies, and the bucket in the vehicle's installation). The fixture
and the key-order hash were then written again from main's own literal `vehicles.ts` (at
3d713b5, before the catalogue), not from the catalogue, so the test still proves that the
catalogue emits the fleet main flies. Only Falcon Heavy changed: the fixture is now 43 012 bytes
and the unsorted JSON 30 987 characters (30 926 at eedd035). Falcon Heavy's point-mass and
six-DOF fingerprints were re-recorded, each with the reason written beside it and the old hash
kept in the comment. The other vehicles' were not touched.

**Soyuz-2, re-recorded with its reasons (2026-10-01).** The Soyuz realism work (§3: the
published engines and loads, the commanded sequence, the stored pitch programme, then the hot
staging and the crewed and cargo payload sections) changed Soyuz-2.1a and Soyuz-2.1b on purpose,
in two passes. Each pass re-recorded `soyuz21a/leo/50`, `soyuz21b/leo/50` and `soyuz21b/gto/50`
(point mass), `soyuz21a` and `soyuz21b` (six-DOF, 160 s; in the second pass Soyuz-2.1b's fairing
moved from T+157 s to Arianespace's T+208.4 s, out of the window) and the Soyuz-2.1a whole-mission
golden, each with the reason and the old hash beside it, and wrote the identity fixture again
(32 830 characters with main's F14). Every other vehicle's hash is unchanged, which is what shows
that the hot staging (`StageSpec.hotStage`) and the payload profiles reach no other vehicle. The
T02 re-check fixtures were written again with `--force` for the same reason: the crewed Soyuz
aborted at T+60 s (`class-abort`) now peaks at 17.48 g instead of 15.27 g, and every other record
came out bit for bit (tests/recheck-fixture-build.ts).

**Point-mass flights** (`tests/d01-fleet-fingerprint.test.ts`, part of `npm test`). 27 fleet
cases, flown as the fleet matrix flies them, each hashed (SHA-256, first 16 hex digits) over the
state `[t, r, v]` once a second from T−10 s, the recorded telemetry and the event log:

- every vehicle's `leo` row at 50 % (21);
- five kick-stage and restart rows: `protonm/gto/50`, `soyuz21b/gto/50`, `ariane64/gto/50`,
  `vegac/sso/50`, `pslvxl/sso/50`;
- `angaraa5/leo/25`, because `angaraa5/leo/50` is a known break-up at T+179 s, before its upper
  stages light.

All 27 match the hashes recorded at eedd035 (Falcon Heavy's, since F11, main's). **Met.** The
fleet matrix (`tests/fleet-defaults.test.ts`) passes. The test notices small changes: 1 g added to
Electron's fairing fails `electron/leo/50` and nothing else.

**Six-DOF flights** (`tests/heavy/sixdof-fingerprint.test.ts`, `npm run test:heavy`). Each of the
21 vehicles flies its `leo` row at 50 % as a rigid body, in crosswind, for 160 s. The hash covers
every second of state and rigid-body telemetry, the telemetry and the events. The hashes were
recorded before any of the six-DOF changes below, and recomputed in two separate processes, in
reverse order, with the same result. After every change all 21 match (Falcon Heavy's since F11),
and so do the whole-mission goldens of Falcon 9, Soyuz-2.1a and Angara-A5. The bound is bit
identity. **Met.** The 160 s do not reach most upper-stage burns. Those are covered by the three
whole-mission goldens and by a one-off comparison of every catalogue stage's six-DOF inputs
before and after the changes (below).

Both kinds of hash are exact hashes of floating-point flights. A new Node or V8 could break them
with no change to the code, as it could the older six-DOF goldens.

**The catalogue held to itself** (`tests/parts.test.ts`, every comparison exact):

- 21 vehicles; 55 engine parts (49 single engines, 2 clusters, 4 lumped entries), 50 stage
  bodies, 14 strap-on bodies, 17 fairings.
- Every stage, strap-on group and fairing of every vehicle is emitted, field for field, by exactly
  one part, and every part is used. This is found by value, not by asking the catalogue.
- The propellant family agrees with the six-DOF model's `PROPELLANT_LOADS` for the 51 of 64
  bodies that have an entry. The other 13 (the R-7's and Falcon's) were not checked at first; in
  review they were held to kerolox, stated by hand.
- `solid` is set exactly where the family is solid (10 motors), and `historical` exactly on the
  10 engines that only retired vehicles fly.
- The lumped and cluster entries keep the counts they flew with: RD-0210/0211 ×4, YF-21C ×4,
  RD-0213 + RD-0214 ×1, YF-24C ×1, YF-75 ×1, Raptor 2 / RVac ×6.
- The custom-vehicle validator passes all 21. The parts are frozen, so an edit in the builder
  cannot reach the catalogue.

**Interstages** (`tests/design-interstages.test.ts`). 26 massless display parts over the 21
vehicles, each |Δd| × 1.1 + 0.6 m high, the drawing's own rule, restated by hand: Falcon 9's is
(5.2 − 3.66) × 1.1 + 0.6 = 2.294 m. The stack heights were first rebuilt with the same calls the
layout makes, which the review found circular. They are now also held to totals added by hand:
Falcon 9 59.294 m, Soyuz-2.1a 35.419 m (46.849 m with its fairing, the 46.85 m the data says is
drawn), Saturn V 90.15 m. Bound 1e-12 m, fixed before the first comparison. **Met.**

**Findings, not filled in.** The old file recorded no source for many figures, and the parts say
so (`UNCITED`) rather than borrow one:

- 27 of 55 engine parts (29 before the RD-107A and RD-108A took Arianespace's figures on
  2026-10-01, §3), and 5 more solid motors that cite only their peak-to-mean thrust ratio;
- 25 of 49 stage bodies (26 of 50 before F11 gave Falcon Heavy's core a source for its
  propellant, and the two Soyuz-2 cores became one on 2026-10-01; Falcon Heavy's 28 000 kg dry
  mass is still an estimate), and Proton-M's first stage cites only its diameter;
- 5 of 14 strap-on bodies (7 before F11, 6 before Soyuz-2's strap-ons took Arianespace's figures);
- 13 of 17 fairings.

Four engine entries are not one real engine: RD-0213 + RD-0214, YF-24C, YF-75 and Raptor 2 /
RVac are lumped, and the builder refuses to re-count them (below). Some propellant families are
estimates copied from the six-DOF data (Curie as hypergolic, for one) and are not labelled as
estimates. The six-DOF model still reads the family by stage id, not from the part.

### Engine masses (D02, D03)

A remix or a design from parts needs what an engine weighs, which no flight did. Every engine part
now carries a mass per unit of its count (one engine, or the whole of a lumped entry), with its
sources as links, what the figure includes and a note (`EnginePart.mass`;
`tests/parts-engine-masses.test.ts`, all exact):

- **Coverage:** all 55. Four are null because no source publishes one, each with its reason:
  Curie, PS4's L-2-5, PSOM-XL and Raptor 2 / RVac.
- **Basis:** 32 published, 6 from a secondary source, 5 from Wikipedia only, 8 inferred,
  4 unpublished. Three are marked low confidence, and are estimates even where a source prints
  them: Merlin Vacuum, BE-4 and Vinci.
- **Solids:** a solid motor's figure is its inert mass, which belongs to its own body.
- **A sanity bound:** for every liquid body, count × engine mass is below the body's dry mass. The
  tightest is Vulcan's first stage: two BE-4 at the low-confidence 5 400 kg are 38 % of its
  28 600 kg. That it is the tightest was recorded after the run (the test had guessed another
  stage).
- **Never flown:** no emitted engine carries a mass. The identity fixture and the 27 fingerprints
  are unchanged. **Met.**

**Findings, recorded, not acted on.** Each solid body's dry mass beside its motor's published inert
mass: equal for Vega-C's P120C, Z40 and Z9 and PSLV's PS1 and PS3; GEM 63 5 100 against 5 035 kg;
GEM 63XL 5 177 against 5 352 kg; Ariane 6's P120C strap-ons 13 000 against 11 200 kg; H-IIA's
SRB-A 8 700 against 10 600 kg (the body carries SRB-3's planning value); H3's SRB-3 8 700 against
9 000 kg; PSOM-XL 2 010 kg against none published. The flown data were not changed. The
8D74K/8D75K index labels may be wrong, and the engine named RD-869 is really the RD-843.

### The budget core (D02–D05)

`src/design/budget.ts` splits the model's own Δv walk (`deltaVRemaining`) into phases: each stage,
and for a stage with strap-ons one phase with them and one of the core alone. Every figure the
builder shows (Δv, burn time, thrust-to-weight, structural ratio ε, propellant fraction) comes
from it. `tests/design-budget.test.ts`:

| check | reference | bound, fixed first | result |
| --- | --- | --- | --- |
| the phases' Δv added up, 21 vehicles at half the LEO rating | `idealDeltaV`, the model's own walk | exact (the phases are added in the walk's order) | met: 0 difference for all 21 |
| the same from other states: recovery reserves, part-burned tanks, strap-ons gone, first stage gone; in review also one engine out, each first-stage engine out, the fairing gone, a spacecraft stage on top | `deltaVRemaining()` | exact | met, every state, every vehicle |
| every serial stage: m0, mf, ve, Δv = g0·Isp_vac·ln(m0/mf), burn time mp/ṁ, the fairing dropped at the first boundary | worked by hand in the test | 1e-12 relative | met; largest Δv difference 3.9e-15 |
| 14 strap-on first stages, the phase with strap-ons: ve = ΣF/Σṁ, masses, burn time | worked by hand | 1e-12 relative | met |
| the same 14, the core alone | worked by hand | 1e-12 relative and 1e-9 m/s | met |
| liftoff T/W | the setup panel's own T0/(m0·g0) | exact | met, all 21 |
| second stage's T/W | `nextStageAccel()` × the solid head factor | 1e-12 relative | met |
| full-throttle burn times | published: Vega-C Z40 92.9 s, Z9 119.6 s; Long March 3B third stage 478 s; H-IIA second stage 534 s; GEM 63 94 s; Long March 3B strap-on 140 s (sources as in `tests/data-consistency.test.ts`) | 10 %, the fleet's | met: 92.9, 119.6, 467.6 (−2.2 %), 531.1 (−0.5 %), 93.0 (−1.1 %), 141.9 s (+1.4 %) |

- The exact equality holds by construction: the review compared the module with the walk line by
  line (the same mass bookkeeping, flow floor, fairing drop and order of addition). The
  hand-worked checks are separate code.
- The 1e-9 m/s part of the core-alone bound was probably added after Falcon Heavy's and
  Angara-A5's cores gave 0/0 on the relative bound (they run dry with their strap-ons, so their
  core phase is 0 m/s), although the test's comment says it was fixed first. The history cannot
  tell.
- The strap-on check works ve with each group's own Isp; the model uses the first group's Isp for
  every group. Every fleet vehicle's groups have equal Isp, so the test cannot see the difference,
  but a design with unlike groups gets a wrong Δv. The model's other simplifications are copied
  on purpose, so that the builder's figures stay the flight model's: Falcon Heavy's and
  Angara-A5's cores are counted at full throttle beside their strap-ons, and PSLV's two air-lit
  strap-ons from liftoff.

The Watch level's table therefore showed the core alone at "0 m/s, 0 s" for Falcon Heavy and
Angara-A5. It now says that the flight throttles those cores to 55 % and 30 % while the strap-ons
burn (`tests/design-stage-table.test.ts` finds exactly those two rows, from the data).

### Optimal staging (D05)

`src/design/optimal-staging.ts` divides a Δv among serial stages of given Isp and structural ratio
ε for the largest payload ratio, by Lagrange multipliers: n_i = (c_i η − 1)/(c_i ε_i η), solved by
bisection. The method is the textbook one (Curtis, *Orbital Mechanics for Engineering Students*);
no figure is taken from the book. One correction to the plan: Δv < Σ c ln(1/ε) is not enough, since
every stage also needs n_i > 1. For a small Δv on unlike stages the formula gives a stage a
negative mass, and the true optimum drops that stage. That case is reported (`stageWithoutDv`),
not solved. `tests/design-optimal-staging.test.ts`:

| check | reference | bound, fixed first | result |
| --- | --- | --- | --- |
| equal stages, N = 1–5, Isp 350 s, ε 0.1, 7 000 m/s | closed form: equal shares, n = exp(Δv/(Nc)) | 1e-12 relative | met (largest 6.9e-16). The first Δv tried, 9 000 m/s, is past one stage's limit (7 903 m/s), so it was lowered; the bound was not changed |
| two stages with Falcon 9's Isp and ε, 9 500 m/s | brute-force grid, 1 m/s | one grid step | met: 3 247.7 / 6 252.3 m/s; grid 3 248 |
| three stages with Saturn V's, 12 000 m/s | brute-force grid, 5 m/s | one step per free share | met: 1 669.8 / 5 983.1 / 4 347.0 m/s; grid 1 670 / 5 985 |
| δ = 1, 10 and 100 m/s moved between every pair of stages, both ways | the payload ratio worked by hand | strictly lower | met |
| the feasibility limit Σ c ln(1/ε) | by hand | 1e-15 | met |
| a stage the optimum drops (200 s under 450 s, 3 km/s) | brute force puts 0 m/s on it | reported, not solved | met; in review the switch falls between 7 907 and 7 908 m/s, whichever way round the stages are listed |
| the stack rebuilt from the answer | ε, n = m0/mf, Σ c ln n = Δv, scaling with the payload | 1e-12 | met |

**A published worked example.** "Introduction to Launch Vehicle Analysis and Design",
Prof. Ashok Joshi, IIT Bombay, Lecture 20, "Lagrange Solution"
([NPTEL course 101101086](https://nptel.ac.in/courses/101101086)). The slides were read from
[a mirror](http://elearn.psgcas.ac.in/nptel/courses/video/101101086/lec20.pdf), whose checksum
the test records. The lecture's g0 = 9.81 is passed in.

- **Two equal stages** (ε 0.15, Isp 240 s, 4 000 m/s, 10 kg): the slide's β 0.8494, e^−β 0.428,
  π 0.3267, π* 0.1067 and m0 93.7 kg; here 0.84947, 0.42764, 0.32664, 0.10669 and 93.73 kg.
  **Finding, and a bound changed after the result:** π was held to 5e-5 like the others and missed
  by 1.4e-5, because the slide truncates β to 0.8494 and works π from the truncated value. The
  bound was widened to 1.0e-4, what that truncation is worth. The test says so, and checks that
  the truncated β gives the slide's 0.3267.
- **The payload-constrained example** (π* 0.15, V* 3 466.4 m/s): π 0.38700 and π* 0.14977 here.
  Met. The slide's middle factor, −1.4482, is a misprint for −1.4723; recorded, not relied on.
- **Unequal stages** (Angara 1.2: 310 s and ε 0.072, 342.5 s and ε 0.089, π* 0.025): the slide's
  root λ = −2 055.9 against −2 056.81 here (bound 2.5, from the slide's three-figure
  coefficient); π 0.162 / 0.154 against 0.16213 / 0.15420. Met. **Finding:** the slide's
  π* = 0.029 and V* = 8 337.8 m/s do not follow from its own π1 and π2, which by its own formula
  give π* 0.0249 and V* 9 520.8 m/s. Here V* is 9 516.5 m/s. The lecturer says π* "will be close
  to 0.025".

**Two real vehicles by hand.** In review, at each vehicle's own ideal Δv and half its LEO rating,
with n_i = (c_i − x)/(c_i ε_i) and bisection: Saturn V 1 747 / 6 006 / 4 370 m/s (payload ratio
2.2166 %) and Falcon 9 4 209 / 6 891 m/s. Both equal the page to 0.1 m/s. The real splits, from
the rocket equation on the data: Saturn V 3.88 / 4.51 / 3.73 km/s (2.00 %), Falcon 9 4 056 /
7 045 m/s (2.04 %, against the optimum's 2.07 %). The optimum always carries at least as much as
the real split. The page's Saturn V bounds (1.70–1.80 and 3.83–3.93 km/s on the first stage) were
set after a probe printed 1 747 and 3 882 m/s (`tests/design-staging-model.test.ts`).

**Finding: the real first stage against the optimum.** For each vehicle with no strap-ons, at half
its LEO rating (recorded after a probe, not tuned):

| vehicle | the real first stage's Δv against the loss-free optimum's |
| --- | --- |
| Saturn V | +2.13 km/s |
| Proton-M | +0.02 km/s |
| Falcon 9 | −0.15 km/s |
| Electron | −0.72 km/s |
| Long March 2D | −1.62 km/s |
| Starship | −2.44 km/s |
| Vega-C | no optimum at its own Δv |

The page first said that real first stages "usually" take more, because they pay the gravity and
drag losses. Both halves were wrong. The catalogue goes the other way four times out of six, and
the two splits are compared at the same total ideal Δv, where the payload ratio depends only on
each stage's ideal Δv: a loss of fixed size cannot move the optimum, whichever stage pays it.
Only losses that depend on the split, or structural ratios that change with a stage's size, can.
The page now gives split-dependent gravity loss as one possible reason, and claims no reason
where the first stage takes less.

### Remix (D02)

`src/design/remix.ts` turns a catalogue vehicle into one of the user's own: stretch or shrink a
stage or strap-on, swap or re-count its engines, add or remove strap-on groups, fit another
fairing. `tests/design-remix.test.ts`, bounds fixed first:

- **Identity:** with no changes, the remix equals the S02 copy for all 21 vehicles, with nothing
  estimated. H3's unchanged remix flies point mass to the 500 km preset with 5 t and records the
  catalogue H3's flight, strap-on separation included. **Met.**
- **Swap arithmetic:** the dry mass changes by count × the engines' published masses, exactly:
  Falcon 9's first stage with one RD-180 for nine Merlin 1D is 22 200 + 5 480 − 9 × 467 kg; Atlas
  V's Centaur III takes two RL10C-1-1, Angara-A5's URM-1 strap-ons two YF-100 each. Fregat's
  engine swapped for Curie, whose mass is unpublished, leaves the dry mass and says so. **Met.**
- **Stretch:** Falcon 9's second stage × 1.25 grows by exactly the extra propellant's volume at
  3.66 m (kerolox at a mixture ratio of 2.6), within 1e-12 m. Proton-M's first stage falls back to
  a proportional length (its load does not fit the core's diameter); a Zefiro 9 scales its whole
  inert mass. The Δv change equals the rocket equation on the budget core's phases within 1e-12
  relative for Falcon 9's second stage × 1.25, Saturn V's S-II × 0.8, Electron's first stage
  × 1.1, Angara-A5's URM-2 × 1.5 and H3's second stage × 1.3. **Met.** The test re-derives the
  stretch's mass rule itself, so it only partly tests it, and the rule (tank structure scales with
  the propellant) is an estimate.
- **Refusals**, each with its own code: re-counting a lumped or cluster entry (YF-75 ×2, RD-0210
  ×3, Raptor 2 / RVac ×1), swapping a solid motor, an engine of another propellant family on the
  tanks, a vacuum engine on the pad, bad counts and factors, a fifth strap-on group, anything past
  the validator's limits, unknown parts and edits. **Met.** The propellant-family refusal was added
  in review: Falcon 9's second stage had taken a YF-75 and kept 108 t of kerolox tankage, flown as
  hydrolox (about three times the volume), with no refusal and no estimate.
- **Fuzz** (seeded, 630 lists of edits over the 21 vehicles): 278 accepted, every one clean under
  the validator; every refusal a coded one; the catalogue unchanged. The floor of 25 % accepted was
  fixed before the first run, lowered from 50 % on an estimate. **Met.**

### Building from parts, and the warnings (D03)

`src/design/assemble.ts` builds a vehicle from catalogue bodies or bodies of one's own
(`tests/design-assemble.test.ts`):

- **The catalogue from its own parts:** all 21 vehicles, parts found by value, assemble to the
  same stages, strap-ons and fairing (`toStrictEqual`), with identical ideal Δv at 0 and at half
  the LEO rating, identical liftoff thrust, and a clean validator. **Met.**
- **Defaults, each reported as a default or an estimate:** a max-Q limit of 40 kPa and an
  acceleration limit of 50 m/s² (the fleet's medians), fairing jettison at 115 km (the median),
  ratings of 0 flagged until computed, and the country taken from the first launch site (flagged
  since the review; a Baikonur design gets KZ).
- **Fuzz:** 600 designs. The floor of 25 % accepted was fixed before the first run. After the
  propellant-family refusal the fuzz accepted 139, under the floor; the floor was kept and the draw
  changed to pick a catalogue body's other engine as it already picked one for a body of one's own:
  from the body's propellant family, with a 10 % chance of any. It now accepts 162, all clean
  under the validator with unique, valid ids. **Met.**
- **Heights, recorded:** the drawn height (the stages and adapters as the flight stacks them)
  differs from the typed one: Soyuz-2.1a 46.85 against 46.3 m, Vega-C 41.85 against 34.8 m,
  PSLV-XL 52.84 against 44 m, Atlas V 551 70.52 against 62.2 m, Saturn V 90.15 against 110.6 m
  (the Apollo spacecraft and its tower are not drawn). The builder states the drawn height.

`src/design/warnings.ts` gives a design's warnings as codes (`tests/design-warnings.test.ts`).
Each code is shown on one constructed design and on its negation. Those that restate a decision
the flight or the planner makes are held to that decision:

- **`noLiftoff` is not "T/W ≤ 1".** The flight burns propellant on the hold-down from T−2.5 s and
  releases at T+3 s, so it lifts off designs whose static T/W is below 1: Falcon 9 from 0.982,
  Soyuz-2.1a from 0.978, Electron from 0.983, H3 from 0.992. The warning replays the hold-down
  instead. Against the flight's own `evt.noLiftoff`: 85 point-mass flights over static T/W 0.90 to
  1.06 on five vehicles (Falcon 9, Soyuz-2.1a, Vega-C, H3, Electron). A band of ±0.5 % about a
  release T/W of 1 was fixed before the run for the one-step difference in where the two put T+0.
  75 flights fell outside it with no disagreement; the 10 inside it agreed too. The replay's
  release T/W is within 0.0041 of the one the flight logs (bound 0.01). **Met.** The replay
  mirrors the point-mass 0.1 s step; six-DOF flies the prelaunch at 0.01 s, so its release can
  differ by one step's burn.
- **`weakUpperStage`** gives the planner's own `weakFinalStage` at 1.5, 1.59, 1.61 and 1.7 m/s²
  (1.6 m/s² with a 1 500 kg margin). **Met.** It is also applied to middle stages, which the
  planner never does.
- **`fixedThrustOverAccel`** against the peak thrust acceleration of every stage of the fleet,
  flown point mass to LEO at half the rating: it names exactly the stages the flight takes more
  than 2 % over the vehicle's limit. **The 2 % was set after a probe** had shown every unwarned
  stage at most 0.5 % over and every warned one at least 5.8 % over; the test says so. Warned,
  flight peak against limit in m/s²: Long March 2D's first stage (63.5 against 60) and second
  (113.9 against 60), Long March 5's strap-on phase (54.4 against 45; the warning predicts 54.6),
  Sputnik's (111.5 against 70) and Saturn V's first stage (48.3 against 45). At zero payload it
  predicts more warnings (the upper stages of Falcon 9 and Soyuz-2.1a) that no flight has
  confirmed.
- **The catalogue** at half its LEO rating: no vehicle fails. It raises nine warnings, recorded:
  four kick stages under the planner's 1.6 m/s² (Proton-M, Angara-A5, Vega-C, Electron) and the
  five places above. The propellant-fraction band, 0.51–0.97 against the catalogue's 0.516–0.962,
  is an estimate of what is plausible, not a physical limit.
- **Not checked:** a body of one's own may state a dry mass below its engines' mass (100 kg with
  an RD-180 is accepted without a flag).

The warnings, refusals and estimates in words (`tests/design-warning-text.test.ts`): every code
has a sentence in English, Russian and Thai, and every sentence gets exactly the numbers its
placeholders need. Checked on constructed warnings, on every warning the fleet raises at half its
rating, and on a Falcon 9 that cannot lift off. **Met.**

### The test stand, the wind tunnel and the readiness review (D04)

**The test stand** (`src/design/static-fire.ts`, `src/design/test-stand.ts`;
`tests/design-static-fire.test.ts`, `tests/design-test-stand.test.ts`) fires an engine with the
engine model every flight runs.

- **Steady state:** for every liquid installation in the fleet (more than 60 firings), thrust is
  count × thrustVac at zero pressure and count × thrustSL at 101 325 Pa exactly, and Isp in
  vacuum is ispVac within 1e-12. **Met.**
- **Delivered sea-level Isp against the quoted one**, bound 8 % (from `physics-core.test.ts`):
  worst RD-108A, +6.93 %. The engines more than 2 % off are the four already known: RD-108A
  +6.9 %, Vulcain 2.1 5.0 %, Rutherford 2.6 %, Raptor 2 2.4 %. **Met.** In review the expected
  value was worked from the data in the test, not from the model the stand runs on. These are
  inconsistencies in the data (the model derives sea-level Isp from the thrust ratio), shown on
  screen and not tuned: Merlin 1D 287.52 s against 282 s (+1.96 %), Vulcain 2.1 302.0 s against
  318 s (−5.0 %).
- **Impulse = propellant × g0 × Isp(p)** within 1e-9, on Merlin 1D, P120C and RL10C-1, at steps of
  0.01, 0.1 and 0.5 s with the tank emptied; in review also at 40 kPa. **Met.**
- **Transients:** the start-up deficit F·T/2 and the tail-off impulse F·τ·(1 − e⁻⁵), within 1e-9, on
  Merlin 1D and a test engine with its own transients, at four step sizes. **Met.** The stand's Isp
  stays constant through both, the model's own simplification, and both are estimates.
- **Burn times:** all 20 published burn times of `tests/data-consistency.test.ts` within 10 %.
  Worst: Long March 2D's first stage, 158.0 s against 170 s (−7.1 %); then Ariane 6's P120C
  +4.2 %, PSOM-XL −3.9 %, S139 −3.3 %. **Met.** Each is also within one step plus 0.01 s of the
  closed form m/ṁ + T/2 − τ(1 − e⁻⁵); the 0.01 s is an estimate.
- **Solid peaks,** all ten solids: the data's peak within 0.5 % of the published table (worst S139,
  4 862.0 against 4 846.9 kN, +0.31 %) and the stand's within 1 % (worst ±0.24 %). **Met.** On
  screen, P120C in vacuum peaks at 4 321 kN against the published 4 323 kN (Vega C).
- **Bounds corrected after a first run,** and the test says so: the firing's length (the end of the
  tail-off, rounded up to the step), and the count of the burn-time table (20, not 21).
- **Finding:** a solid's mean thrust on the stand reads high, P120C +0.63 % and GEM 63 +0.92 %. The
  mean is the impulse over the burn time; the impulse includes the tail-off and the burn time
  does not. Recorded, not adjusted.
- **At a launch site:** every site's pressure is within 0.1 % of the barometric formula
  P0·(1 − 2.25577e-5·h)^5.25588 (the bound covers geometric against geopotential height), and
  thrust is linear in pressure within 1e-12. At Xichang (1 825 m) it is 81.2 kPa. A vacuum-only
  engine is refused in air, and a solid's shutdown is refused.

**The wind tunnel** (`src/design/tunnel.ts`, `src/design/tunnel-view.ts`;
`tests/design-tunnel.test.ts`, `tests/design-tunnel-view.test.ts`) sweeps the aerodynamic tables
the six-DOF flight flies over Mach and angle of attack. The tables are the model's estimates
(slender-body theory plus crossflow), not measured data.

- **Against the flight's tables:** as the angle goes to 0, C_Nα and the centre of pressure equal the
  table's slope and x_cp at 25 Mach numbers on 8 configurations of 6 vehicles (bound 1e-6; worst
  1.3e-10 and 1.2e-8). **Met.**
- **Drag:** C_A at zero angle equals the point-mass flight's `dragCoefficient(M)` at all 13 table
  Mach numbers (bound 1e-12, worst 4.4e-16) and at the 201 drawn from Mach 0 to 10 on Falcon 9,
  Ariane 6, Soyuz-2.1a and Saturn V; the reference area is `frontalArea()` exactly. **Met.**
- **Slender-body theory:** a nose on a cylinder gives C_Nα = 2 per radian for 1.2, 3.7 and 5.4 m
  at Mach 0.8 and below, and a stack under a wider fairing 2·(d_base/d_max)², 1.125 for 3 m under
  4 m (table within 1e-12, tunnel within 1e-6). **Met.**
- **Through 90°:** continuous, bounds 1e-4 on C_N and C_A and 1 mm on x_cp; worst 2.5e-6, 5.6e-12
  and 0.03 mm. **Met.**
- **The moment's sign,** which the page's "above zero is unstable" rests on: C_m = −C_N × margin
  within 1e-9 on all 21 vehicles at Mach 0.6, 1.2 and 3, at 2°, 5° and 10°. **Met.**
- **A probe, not a test:** with full tanks and half the rated payload every catalogue stack has a
  negative static margin at small angles at Mach 0 and 1.5, from about −0.95 calibres (Sputnik) to
  −8.0 (Falcon 9 subsonic; −6.3 supersonic). The steering keeps them pointed.
- The tables were cached by vehicle id, so a design edited under one id got its old table. The
  six-DOF work below keys them per design; the tunnel's comment was corrected to say so.

**The flight readiness review** (`src/design/readiness.ts`, `src/design/review-model.ts`;
`tests/design-readiness.test.ts`, `tests/design-review-model.test.ts`) runs the Launch panel's own
verdict, and always flies the insertion probe for a vehicle of one's own.

- **The catalogue:** on 36 rows (every vehicle's LEO row at half its rating, the 12 rows the panel's
  verdict test names, and 3 added in review) the verdict and the probe are identical to the Launch
  panel's, and the rows reach nine of its causes: ready, margin, corridor, burnBudget, noRestart,
  noInsertion, overCapacity, noRating and inclination. Two causes cannot be reached from the
  catalogue. **Met.** In Chromium, "Fly it" from the review gives Launch's verdict text for
  Falcon 9 to the station orbit (11.4 t), Proton-M to GTO (6 t, "2,830 m/s short") and Electron to
  SSO (200 kg); Falcon 9 at 21 t, Soyuz-2.1a at 7 t to the station orbit and Long March 2D at
  1.2 t to SSO are refused by both.
- **A vehicle of one's own:** Falcon 9 with its sea-level thrust halved and a typed rating passes
  the static verdict; the review fails it and blocks the flight. Falcon 9 typed at 1.5 × its LEO
  rating and flying 90 % of the real one would not be probed by the static verdict; the review's
  probe runs out of propellant and fails it. **Met.**
- **Bugs found in review, each fixed:** the review could fly the wrong vehicle when the mission
  still carried another vehicle's spec (Falcon 9 at 90 %, which the probe fails, came out as a
  tight margin that may fly; reproduced by a test that failed before the fix); the test flight's
  row said "reached orbit −1 s after liftoff" for a rocket still flying, never lost, at the
  probe's 2 400 s limit (unchanged Vulcan and Angara-A5 remixes coasting on a 137 km perigee;
  Long March 2D to GTO), which the verdict counts as orbit and the row now says as a note;
  computing ratings in the review reset the typed payload (900 kg re-reviewed at 1 000 kg) and
  kept an SSO rating never computed (a saved Vega-C remix kept the published 2 300 kg); and the
  reached-orbit sentence claimed the perigee had just risen past 140 km and promised later burns
  that a stack with no restart cannot make.

### Computed payload ratings (D03, D04)

`src/design/ratings.ts` finds the heaviest payload a design delivers by flying it: point mass, calm
air, the guidance programme the design carries (a remix keeps its origin's), 6 to 9 probe flights a
rating. The rating orbits are the
vehicle's (or its origin's) published reference orbit, else 200 km at the site's lowest
inclination for LEO, and the fleet's `gto` preset. `tests/design-ratings.test.ts`, bound ±25 %
against the published figure, fixed first:

| vehicle and rating | computed / published, kg | ratio | result |
| --- | --- | --- | --- |
| Soyuz-2.1a LEO (240 km × 51.6°, Baikonur) | 7 021 / 7 430 | 0.945 | met |
| Falcon 9 LEO | 20 031 / 22 800 | 0.879 | met |
| Long March 2D LEO (200 km × 41°, Jiuquan) | 3 165 / 3 500 | 0.904 | met |
| Vega-C LEO | 4 330 / 3 300 | 1.312 | **missed** |
| Ariane 64 LEO | 26 274 / 21 600 | 1.216 | met |
| Electron LEO | 315 / 300 | 1.050 | met |
| Falcon 9 GTO | 6 832 / 8 300 | 0.823 | met |
| Ariane 64 GTO | 13 328 / 11 500 | 1.159 | met |

- **Vega-C's miss is not explained.** To its published reference orbit, 700 km × 98.2° from
  Kourou, it rates 2 906 kg against 2 300 kg (1.26), limited by the burns after the insertion, so
  the 200 km convention does not explain the LEO miss on its own. The suspects are AVUM+'s burns
  counted as instantaneous (2.42 kN under a 4 t payload burns for minutes) and the solid stages.
- **The method was changed after its first result.** The first method judged a payload delivered by
  the verdict and the probe alone. It gave Falcon 9 17 005 kg to GTO (2.05 × published) and
  Ariane 64 26 303 kg (2.29 ×), about what each lifts to LEO, because the probe stops at the
  parking orbit and the verdict's burn budget counts the last stage as full. The method now also
  requires the Δv left at the probe's stop to cover the planned burns. The ±25 % bound was not
  changed. Both results are in the test's comment.
- **A bug found in review:** a typed rating capped a computed one when the verdict filed the rating
  orbit under another class (an orbit at 95° or more is SSO to it): Vega-C to 700 km × 98.2° came
  out 2 297 kg, its own typed 2 300 kg. Fixed; the eight figures above did not move.
- GTO ratings count the burns after the insertion as instantaneous, so a low-thrust kick stage is
  rated generously, and the search assumes that a vehicle that delivers a payload delivers any
  lighter one.
- **Finding in the browser, not a test:** Falcon 9 with its second stage stretched to 110 % and
  130 % rates 18 130 and 8 870 kg to LEO, against 20 031 kg unchanged; heavier payloads end short
  of orbit (`noInsertion`). A remix flies its origin's guidance programme, set for the original
  rocket; that this is the cause is a guess, not shown.

### Six-DOF for a vehicle of one's own (D03)

Before Phase 3, six-DOF built a custom vehicle's rigid-body data from the spec, but several things
were keyed by the catalogue's stage ids ([ROADMAP-PART2-3.md](ROADMAP-PART2-3.md), "S02: what keys
off a vehicle id"). Four were fixed (`src/physics/rigid/vehicle-data.ts`, `mass.ts`;
`tests/custom-vehicle-rigid.test.ts`, `tests/rigid-fleet.test.ts`), each with a test that failed
before the fix:

1. **Every engine's thrust reaches the chambers.** The chambers' thrust must add up to the thrust
   the point-mass model flies (1e-9 relative), on all 21 vehicles and three constructed ones (new
   ids: a 12-Merlin core with RD-191 and GEM 63 strap-ons, a four-RL10 second stage and a Zefiro 9
   third stage; a Falcon 9 with 5 engines on its first stage; a Soyuz with 2/2/3 engines). Before,
   the chambers carried 0.368, 0.200 and 0.500 of it; after, 1. The chambers sit on the bells the
   drawing draws (1e-12 m), with generic ±5° steering, an estimate.
2. **Aerodynamic tables follow the design, not the id.** A first stage stretched 6.5 m under the
   same id keeps C_Nα at every Mach (slender-body theory: lengths do not enter it), moves the
   centre of pressure up 6.5 m (1e-9 m) and adds d × 6.5 of side area; before, the centre of
   pressure moved 0 m. Widened to 4.2 m, its subsonic C_Nα is 2·A_base/S within 1e-12; before, it
   read 0.759 of that, (3.66/4.2)², the old table's.
3. **A solid stage with an id of its own burns as a grain.** A renamed Zefiro 9 gives exactly the
   catalogue Zefiro 9's mass components at 100, 50, 10 and 0 % fill (before, four liquid tanks),
   and the full grain's axial inertia is the thick-walled tube's within 1e-12. Its radii, 0.95 and
   0.3 of the stage's, are estimates.
4. **An upper stage with an id of its own gets three-axis thrusters:** Falcon 9's second-stage
   installation, 50 N pairs at 60 s of Isp with the lesser of 10 % of the dry mass and 30 kg of gas
   (estimates, not scaled to the stage). Roll authority equals the couple F·d within 1e-9; before,
   the renamed solid third stage had none.

What keys off an origin stays with it: a Soyuz-2.1a copy keeps its 65 % trim share (a 2.28° limit
at 30 kPa and Mach 1.2), the same hardware with no origin gets 35 % (1.25°, Soyuz-2.1b's), and only
a Falcon 9 copy's first stage flies home in six-DOF.

**Two defects found in review, fixed:**

- **Engine out.** Where a stage has more engines than drawn bells (the generic ring draws at most
  8) or bells that do not divide evenly (3 engines on the R-7's 4 chambers, 5 on the octaweb), an
  engine out zeroed whole bells: six-DOF thrust was 0.979, 0.972 and 0.75 of the point-mass
  model's on the three constructed vehicles. Each such chamber now records which engines it holds,
  and one engine out, or each engine shut down in turn, keeps the chambers' thrust equal to the
  flight's within 1e-9, on all 21 vehicles and the three constructed ones. No catalogue chamber
  gets a span.
- **Falcon 9's second stage on a vehicle with no origin** kept its catalogue id, so it was passed
  over by the new rule, and Falcon's thrusters are keyed by the vehicle's id: it flew with none, no
  roll and nothing to hold attitude in a coast. It now gets the generic set.

**The catalogue is unchanged:** the 21 fingerprints and the three whole-mission goldens match.
Beyond them, the review compared the base source with the branch for every catalogue stage and
strap-on: chamber geometry, thrusters, mass components at four fills, and the whole rigid vehicle
with its aerodynamic table in every burning configuration, with no failure, a random engine out,
and each engine shut down in turn. All deep-equal. A vehicle with new ids flies 180 s in six-DOF on
Falcon 9's guidance, through both strap-on separations, staging and second-stage ignition, without
loss.

**What is still wrong or missing**, which is why six-DOF stays experimental for a vehicle of one's
own:

- A single-engine first stage with an id of its own has no roll control. PSLV, H-IIA, Ariane 6 and
  Vega-C flown with the first stage renamed and no origin were not lost, but PSLV rolled at
  2.2°/s against the catalogue vehicle's 0.075°/s.
- Where bells share engines, the fault system names a bell by its first engine, so shutting that
  engine leaves the rest of a failed bell burning, and its "a quarter of the stage's engines" limit
  counts bells.
- A single-engine stage or strap-on with an id of its own gets 5° steering even when copied from a
  fixed-nozzle motor such as the GEM 63.
- R-7 blocks with more than one engine fly generic 5° steering on their four main chambers, and
  their verniers stay in the list with no thrust.
- The generic thrusters do not scale with the stage.
- The drawing still draws the nine-engine octaweb for a kept Falcon 9 first stage with another
  engine count, and at most 8 bells in a generic ring.

### Sizing a launcher (D05)

`src/design/sizing.ts` sizes serial liquid stages from a payload, an orbit, a site and, for each
stage, an engine, a structural ratio, a diameter and a thrust-to-weight. The design Δv is the
planner's ascent cost to that orbit plus its required margin (and any extra Δv asked for); it is
split optimally, and the stages' masses, engine counts and lengths follow.
`tests/design-sizing.test.ts`, bounds fixed first:

- **The design Δv is the planner's own:** for three requests (1 t to LEO from Kourou; 8 t to the
  station's plane from Baikonur, RD-191 then RL10C-1-1; 3 t to SSO from Vandenberg on three
  stages), the sized vehicle's ideal Δv is the design Δv within 1e-9 relative, the planner's
  ascent margin is exactly its required margin (1e-6 m/s), each stage's Δv is its optimal share
  (1e-9), every T/W at ignition meets its target, the validator is clean, and nothing fails.
  **Met.**
- **Sanity bounds** for 1 t to the 500 km preset from Kourou (Rutherford and Rutherford Vacuum,
  ε 0.08 and 0.09, 1.8 m), taken from launchers of that class (Firefly Alpha, 54 t for about
  1 030 kg; Electron, 13 t for 300 kg; Vega-C, 210 t for 3.3 t). They say "plausible", not "right":

| figure | bound | result |
| --- | --- | --- |
| design Δv | — | 9 049 m/s |
| split | — | 4 723 / 4 327 m/s |
| liftoff mass | 20–80 t | 31.6 t |
| payload fraction | 1–5 % | 3.17 % |
| engines | first stage ≤ 33 | 17 + 2 |
| T/W at ignition | 1.3–2.6; upper stage 0.7–2.6 | 1.317; 0.926 |
| height | 15–60 m | 22.25 m |

  All **met**. Whole engines overshoot the T/W target (0.926 against 0.7 on the upper stage). The
  lengths come from the propellant's volume plus the catalogue's median length beyond the tanks,
  a recorded value: 1.466 diameters when it was written, 1.4648 since F11 filled Falcon Heavy's
  core fuller, 1.4445 since the Soyuz-2 cores and strap-ons took their published loads (§3).

**Finding: the design Δv is not enough.** The plan expected a sized launcher to pass the readiness
review at its design Δv. It does not. Flown point mass, the 1 t launcher runs out of propellant
short of orbit; with the fleet's median loss over the planner's allowance (+220 m/s) it still does;
with +500 m/s it reaches orbit (at T+455 s, 167 × 432 km). Most of the shortfall is the fairing:
"the narrowest that fits" gives the 1.8 m stage Vostok's 800 kg shroud, which the design Δv drops
at the first staging (as the planner counts it) but the flight carries to 115 km, well into the
second burn. In review, the extra Δv each launcher needs to reach orbit, in steps of 100 m/s, on
the review's mission:

| launcher | extra Δv to reach orbit |
| --- | --- |
| 1 t, Rutherford, fairing chosen by the sizing | +500 m/s |
| 1 t, Rutherford, no fairing | +100 m/s |
| 10 t, Merlin 1D and Merlin Vacuum, Cape, fairing chosen | +300 m/s |
| 10 t, Merlin 1D and Merlin Vacuum, Cape, no fairing | +200 m/s |
| 5 t, RD-180 and RL10C-1, Baikonur, the station's orbit | not reached up to +1 000 m/s (lost in flight up to +700, then out of propellant) |

The first measurement, on the sizing test's own mission, tried fewer steps: with no fairing it
reached orbit at +200 m/s (only +0 and +200 were tried), with Sputnik's 300 kg shroud at +400, with
the chosen fairing at +500. Nothing was tuned: `extraDvMps` lets the user ask for more, and the
page says why. Charging the fairing to the second stage, or choosing fairings otherwise, is a
design decision left to the owner. With +500 m/s the 1 t launcher's computed ratings are 1 033 kg
to LEO and 246 kg to GTO (18 flights, about 1.5 s), and the review then says ready, with one
warning.

### The screens (Watch, Explore, Engineer)

The screens format the cores' output; none re-derives physics. What they show was checked in tests
where it is logic, and in Chromium (Playwright, software rendering) where it is layout.

- **Watch** (`tests/design-exploded.test.ts`, `design-stack-drawing`, `design-part-card`,
  `design-stage-table`, `design-build-tour`): every stage, strap-on group and fairing of the 21
  vehicles is found as the one part that emits it, and five vehicles also against part lists
  written by hand. Every drawn part keeps the spec's length and diameter exactly and stands where
  the flight's own stack layout puts it; taken apart, no two parts overlap. At a phone's
  343 × 440 px and at 700 × 600 px, labels stay inside the drawing, clear of it and of each other.
  A card's numbers are the flown spec's (ε plus the propellant fraction is 1 within 1e-15). The
  stage table is the budget core's phases, adding up to the total within 1e-9. The tour's figures
  mean what each step says: Falcon 9's Δv with nothing dropped (an estimate) 8 533 m/s against
  11 100 staged; Soyuz-2.1a's liftoff T/W 1.42 against the core alone's 0.27 (an estimate); Atlas
  V's Centaur lights at a T/W of 0.29, its liftoff 1.96; Ariane 64's fairing 2 900 kg, 20 m, off at
  T+200 s as published. **Finding:** the first run failed on −0 in the geometry; the code now emits
  +0, no bound changed.
- **Explore** (`tests/design-explore-model.test.ts`, `design-handoff`, `design-explore-drafts`,
  `design-stage-names`): an unchanged remix equals the catalogue vehicle, with the same stage table,
  for all 21; designs survive a round trip (to JSON, through the design store and as a file) field
  for field; the engines offered never include a lumped or cluster entry other than the one
  installed, another propellant, or a vacuum engine on the first stage. "Fly it" hands a mission
  document that the Launch panel's own parser takes, point mass unless six-DOF is ticked, and a
  stretched Falcon 9 remix so handed climbs more than 3 km in 60 s (bound fixed first).
- **Engineer** (`tests/design-review-model.test.ts`, `design-staging-model`, `design-sizing-model`):
  the checklist passes exactly when the review allows the flight, and every sentence can be said in
  the three languages; the staging curve is the optimiser's own score and peaks within one sample
  of the optimum; for three requests the sized launcher opens in the parts builder and is rebuilt
  field for field.
- **Number entry in three languages** (`tests/design-number-entry.test.ts`, 9 tests, cases fixed
  before the first run). **Found in review:** every Build number box was a browser number field,
  and under a Russian locale "0,08" became 008 with nothing on screen to show it: a structural
  ratio of 8, or a payload a hundred times too heavy. The boxes now read a comma or a point as the
  decimal mark and spaces as thousands. In English, Russian and Thai "0,08" and "0.08" read 0.08;
  "11,400" is 11 400 in English and Thai and 11.4 in Russian; "", "abc", "0x10", "1,2,3",
  "1.234,5", "12kg" and "Infinity" read as no number; every value written back reads back exactly.
  **Met.** In Chromium with a Russian locale, "0,1" was taken as 0.1 and "12kg" marked invalid.
- **Chromium,** not part of the suite: each level was walked in English, Russian and Thai at
  widths of 1440, 1280, 375 and 360 px. The last pass, 96 views, had no sideways scroll of
  the page and no page errors. The walks found and fixed, among others: clicks on parts swallowed
  by the launch camera's pointer capture (which had also broken the Orbit playground's drag and its
  porkchop plot), a tour's figures covered by its own buttons, and the phone layouts of the
  drawing, the sizing and staging tables and the tunnel's labels.

## 9. Re-running

```sh
npx vitest run tests/kepler.test.ts tests/orbit-playground.test.ts tests/maneuvers.test.ts tests/maneuver-setup.test.ts tests/budget.test.ts tests/applications.test.ts   # the Orbit section, ~3 s
npx vitest run tests/sgp4.test.ts tests/omm.test.ts tests/real-sky.test.ts tests/satellite-catalogue.test.ts tests/passes.test.ts tests/uncertainty.test.ts   # real satellites, ~3 s
npx vitest run tests/activity.test.ts tests/propagator.test.ts                   # the Sun's activity in the lifetime, ~5 s
npx vitest run tests/conjunction.test.ts tests/overflights.test.ts tests/reentry.test.ts   # the military track, ~6 s
npx vitest run tests/screening-filter.test.ts                                    # P2.5: the screening's time filter, ~30 s
npx vitest run tests/msis.test.ts tests/earth-orientation.test.ts tests/cdm.test.ts tests/sensors.test.ts tests/case-worksheets.test.ts   # P2.5, ~10 s
npx vitest run tests/ballistic.test.ts                                           # P2.5: the fitted drag, 66 stages, NAPA-2, ~2 min
npx vitest run --config vitest.heavy.config.ts tests/heavy/reentry-agencies.test.ts   # P2.5: re-entries the agencies' way, 100 objects
npx vitest run tests/d01-vehicles-identity.test.ts tests/d01-fleet-fingerprint.test.ts tests/parts.test.ts tests/parts-engine-masses.test.ts tests/design-*.test.ts   # the Build section (D01–D05)
npx vitest run --config vitest.heavy.config.ts tests/heavy/sixdof-fingerprint.test.ts   # D01: 21 six-DOF flights of 160 s, ~4 min
npx vitest run tests/validation                                                   # point mass, ~10 s
npx vitest run --config vitest.heavy.config.ts tests/heavy/validation-falcon9.test.ts   # six-DOF, ~6 min
npx vitest run --config vitest.heavy.config.ts tests/heavy/validation-timelines.test.ts # six-DOF, ~13 min
npx vitest run --config vitest.heavy.config.ts tests/heavy/screening-filter.test.ts     # the time filter's whole sweep, ~4 min
```

When a test fails, its message prints the whole comparison table for that flight. If the change
behind it is intended, update the disagreement list in the test and the tables and findings here
in the same commit.
