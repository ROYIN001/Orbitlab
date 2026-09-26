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
two held-out flights ("Six-DOF pitch programme fitted"). That is the only fitted value.

Status on 2026-09-25:

| vehicle | reference | state |
| --- | --- | --- |
| Falcon 9 Block 5 | Webcast telemetry of five flights, 2018–2019 | Compared in both flight models (§2); first-stage masses corrected |
| Soyuz-2.1a | Soyuz MS-25 as flown (RussianSpaceWeb, quoting Roskosmos) | Compared in both flight models (§3) |
| Electron, Ariane 64 | Rocket Lab press kit, Arianespace launch kit (planned timelines) | Compared in both flight models (§3) |
| Atlas V 551, PSLV-XL, H3, H-IIA 202, Vega-C, Proton-M, Falcon Heavy, Angara-A5 | ULA, ISRO, JAXA, Arianespace, ILS (primary); Spaceflight Now, RussianSpaceWeb (secondary) | Compared in both flight models (§4) |
| Orbit playground (O01) | Published orbits: geostationary, GPS, Landsat WRS-2, Sentinel-2; closed forms | Kepler and first-order J2 held to them (§5), 2026-09-26 |
| Maneuver planner (O02) | Vallado's and Curtis's worked examples; closed forms | Transfers and Lambert held to them (§5), 2026-09-26 |
| Continue in orbit (O03) | A recorded Soyuz flight's hand-off; the rocket equation | The playground's orbit is the flight's; the budget is Tsiolkovsky's (§5), 2026-09-26 |
| Applications (O04) | Closed forms; THEOS and THEOS-2 as published (eoPortal); the satellite catalogue (CelesTrak) | Pointing, coverage, delay, link budget, swath held to them (§5), 2026-09-26 |
| SGP4/SDP4 (R01) | The verification of AIAA 2006-6753 (SGP4-VER.TLE, tcppver.out); CelesTrak's documented element set | Every line of the reference output reproduced (§6), 2026-09-26 |
| Uncertainty of an element set (R04) | Flohrer et al. 2008 (Tables 1–2); Levit & Marshall 2011 (1.5 km/day); Kelso 2007 | The estimate is those studies' numbers, stated as an estimate (§6), 2026-09-26 |
| Passes (R03) | Skyfield 1.55 with JPL DE421: 249 events of three satellites over two places | Every event found; times within 0.35 s, angles within 0.004° (§6), 2026-09-26 |
| Satellite catalogue (R02) | CelesTrak's six formats of one element set; published orbits of the ISS, Thaicom 8, THEOS-2, GPS | Every format read alike; the catalogue's satellites where they are published to be (§6), 2026-09-26 |
| Close approaches (M01) | Constructed encounters with exact answers; Rice's integral; the Iridium 33–Cosmos 2251 conjunction data and probabilities as published (Shepperd, AMOS 2023) | Times and misses exact; all three published probabilities reproduced within a tenth of a decade (§7), 2026-09-26 |
| Space weather in the lifetime (R05) | NRLMSISE-00 as ECSS-E-ST-10-04C tabulates it; seven spheres of published mass and size, 1999–2010, and their re-entries (GCAT) | All seven within 25 % of their days in orbit with the measured Sun (+0.3 to −22 %); a fixed moderate Sun is off by −74 to +83 % (§6), 2026-09-26 |

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
(`src/data/vehicles.ts`, `falcon9` first stage and `MERLIN1D`), not an error in the equations.
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

| first stage | before (main @ 844ffca) | now (`src/data/vehicles.ts`) |
| --- | --- | --- |
| propellant | 395 700 kg | 287 400 kg LOX + 123 500 kg RP-1 = 410 900 kg |
| empty mass | 25 600 kg | 22 200 kg |

Falcon Heavy's cores and the second stage keep their own figures. The second stage's published
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
  the independent part. The Soyuz and Ariane 64 fairings are flown on fixed times (`fairing.sepTime`, 157 s and
  200 s), so their times agree by construction. Their altitudes are still a real comparison.

### Results

**Soyuz MS-25** (as flown)

| milestone | flight | point mass | six-DOF | tolerance |
| --- | ---: | ---: | ---: | ---: |
| strap-on separation | 117.8 s | 120.6 s (+2 %) | 120.7 s (+2 %) | ±11.8 s |
| fairing jettison | 153.3 s | 157.1 s (+2 %) | 157.0 s (+2 %) | ±15.3 s |
| fairing altitude (nominal) | 79 km | 89.8 km (+14 %) | 99.3 km (+26 %) ✗ | ±12.8 km |
| core separation | 287.7 s | 294.6 s (+2 %) | 294.5 s (+2 %) | ±28.8 s |
| core separation altitude (nominal) | 157 km | 166.5 km (+6 %) | 183.7 km (+17 %) ✗ | ±24.6 km |
| third-stage cut-off | 525.9 s | 536.3 s (+2 %) | 532.8 s (+1 %) | ±52.6 s |
| spacecraft separation | 529.2 s | 537.6 s (+2 %) | 534.1 s (+1 %) | ±52.9 s |
| initial orbit, perigee | 200.0 km | 197.0 km | 197.0 km | ±31.0 km |
| initial orbit, apogee | 242.0 km | 200.0 km (−17 %) ✗ | 200.0 km (−17 %) ✗ | ±37.3 km |
| *speed at fairing (frame not stated)* | *2.2 km/s* | *1.93 relative / 2.20 inertial* | *2.01 / 2.28* | *not graded* |
| *speed at core separation (frame not stated)* | *3.8 km/s* | *3.86 relative / 4.15 inertial* | *3.92 / 4.21* | *not graded* |

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
(`src/data/vehicles.ts`: 2 300 kg of propellant, one Rutherford Vacuum at 25.8 kN and 343 s,
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

**F8. Soyuz inserts into a 197 × 200 km orbit; the flight went to 200 × 242 km.** The model aims
the third stage at a circular 200 km parking orbit and lets the crew ship raise it. The real
Soyuz is put on an ellipse with a 242 km apogee from the start. This is a guidance choice, like
F6, not physics. The times of the whole ascent agree with the flight to within 2 %.

**F9. The six-DOF model climbs higher than the point-mass model on every vehicle.** Soyuz is
10–17 km higher at fairing and core separation. Ariane 64 is 14–68 km higher from booster
separation onwards. Electron's six-DOF fairing leaves 27 s earlier than the point-mass one,
because it is released on the heating placard, which is reached sooner on the higher
trajectory. This is the same behaviour as F5 on Falcon 9, now seen on four vehicles: the
six-DOF ascent comes out of max Q steeper than the flights, while the point-mass ascent tracks
the published altitudes (Ariane 64: 87.1 km against 87 km at booster separation, 128.5 km
against 127 km at the fairing).

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
(six-DOF). The point-mass model agrees on 39 of these 68 rows, the six-DOF model on 37.

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
| maxQ time | s | 62.0 | 50.4 (−19 %) ✗ | 50.5 (−19 %) ✗ | ±6.2 |
| sep12 time | s | 120.0 | 111.6 (−7 %) | 111.4 (−7 %) | ±12.0 |
| sep23 time | s | 327.0 | 327.6 (0 %) | 327.7 (0 %) | ±32.7 |
| fairing time | s | 347.0 | 174.6 (−50 %) ✗✗ | 151.0 (−56 %) ✗✗ | ±34.7 |
| sep3b time | s | 582.0 | 572.6 (−2 %) | 572.9 (−2 %) | ±58.2 |

**Falcon Heavy Arabsat-6A (planned)**

| milestone | unit | published | point mass | six-DOF | tolerance |
| --- | --- | ---: | ---: | ---: | ---: |
| maxQ time | s | 69.0 | 51.3 (−26 %) ✗ | 51.2 (−26 %) ✗ | ±6.9 |
| beco time | s | 150.0 | 122.7 (−18 %) ✗ | 122.7 (−18 %) ✗ | ±15.0 |
| boosterSep time | s | 154.0 | 124.7 (−19 %) ✗ | 124.7 (−19 %) ✗ | ±15.4 |
| meco time | s | 211.0 | 174.0 (−18 %) ✗ | 174.2 (−17 %) ✗ | ±21.1 |
| stageSep time | s | 215.0 | 177.0 (−18 %) ✗ | 177.2 (−18 %) ✗ | ±21.5 |
| ses1 time | s | 222.0 | 181.0 (−18 %) ✗ | 181.2 (−18 %) ✗ | ±22.2 |
| fairing time | s | 247.0 | 180.2 (−27 %) ✗ | 147.3 (−40 %) ✗✗ | ±24.7 |
| seco1 time | s | 528.0 | 509.0 (−4 %) | 510.5 (−3 %) | ±52.8 |

**Angara-A5 flight 2 (planned)**

| milestone | unit | published | point mass | six-DOF | tolerance |
| --- | --- | ---: | ---: | ---: | ---: |
| stage1Cutoff time | s | 206.0 | 201.9 (−2 %) | 202.0 (−2 %) | ±20.6 |
| stage1Sep time | s | 209.0 | 202.9 (−3 %) | 203.0 (−3 %) | ±20.9 |
| stage2Cutoff time | s | 323.0 | 330.6 (+2 %) | 330.8 (+2 %) | ±32.3 |
| stage2Sep time | s | 326.0 | 331.6 (+2 %) | 331.8 (+2 %) | ±32.6 |
| stage3Ign time | s | 328.0 | 332.6 (+1 %) | 332.8 (+1 %) | ±32.8 |
| fairing time | s | 340.0 | 301.6 (−11 %) ✗ | 256.2 (−25 %) ✗ | ±34.0 |
| stage3Cutoff time | s | 746.0 | 727.3 (−3 %) | 743.1 (0 %) | ±74.6 |
| brizSep time | s | 748.0 | 730.6 (−2 %) | 746.3 (0 %) | ±74.8 |

### Findings

**What agrees.**

- **Angara-A5:** every time except the fairing is within 3 %.
- **Atlas V 551, Proton-M and H-IIA 202:** the staging times are within 7 % (Atlas V and Proton)
  and 3 % (H-IIA, as flown).
- **PSLV-XL:** the second-stage separation agrees in time, altitude and inertial speed.
- **Falcon Heavy:** SECO-1 is within 4 %.

**F11. Falcon Heavy's first stages cut off about 18 % early.** Side-booster cut-off comes at
T+122.7 s against 150 s, and the core at T+174 s against 211 s, with everything after shifted
the same way. Falcon Heavy's side boosters and core still fly the earlier Falcon 9 first-stage
figures (395.7 t / 25.6 t), which F1 found burn short. The real core also throttles down while
the side boosters burn, to last longer. The published Falcon 9 masses are a candidate for the
side boosters, which are Falcon 9 first stages. They are not applied, because Falcon Heavy's core
is a different stage with no published figures of its own.

**F12. PSLV-XL's first stage delivers too little.** At first-stage separation the model is at
1 512 m/s inertial against 2 143 m/s (−29 %), and 14 km higher. The deficit builds between T+70
and T+92 s: 199 m/s gained against 562 m/s. The stage and strap-on masses agree with ISRO's
brochure (139 t, 6 × 12.2 t), and so do the burn times. What differs is the thrust curve. The
model flies every solid motor as a linear taper about its published mean (PHYSICS.md §10), and a
steeply tapered S139 is weak exactly there. The second stage makes up the speed (4 066 m/s
against 4 033 at its separation). The real flight then climbs to 451 km before the fourth stage
lights; the model parks at 200 km, as in F6.

**F13. H3 flies a far flatter first stage than JAXA's plan.** JAXA's plan reaches MECO at 278 km
and 3.6 km/s (frame not stated). The model reaches 157 km and 5.9 km/s. The gap is much larger
than any frame difference (about 0.4 km/s). The stage data agree with JAXA's table: 224.5 t,
2 942 kN, SRB-3 134.4 t. The real first stage lofts steeply and spends the difference on
gravity, and its second stage then burns for 661 s where the model's burns for 364 s. This is
guidance, not propulsion.

**F14. Fairing jettison is mostly early.** On a heating placard the model drops the fairing
where the free-molecular heating falls to 1 135 W/m²:

| vehicle | model, point mass / six-DOF | published |
| --- | --- | --- |
| Atlas V | 157 s / 151 s | 205 s |
| Proton-M | 175 s / 151 s | 347 s (after second-stage separation) |
| Angara-A5 | 302 s / 256 s | 340 s |
| Falcon Heavy | 180 s / 147 s | 247 s |
| H3, six-DOF only | 176 s | 210 s |

The real vehicles hold theirs much longer. Two fixed jettison times (`fairing.sepTime`) also do
not match these flights: Vega-C's 220 s against VV25's 304 s, and H-IIA's 250 s against F50's
266 s (inside tolerance). The placard is one physical criterion standing in for each operator's
own thermal and loads rules (PHYSICS.md §10). On these flights it drops the fairing 10–50 %
early.

**F15. Vega-C's second and third stages separate 15–17 % early**: T+231 s against 272 s, and
T+357 s against 428 s. The first stage agrees (−4 %). The kit gives only separation times, so it
cannot say whether the real stages burn longer or coast before separating.

**F16. H-IIA's SRB-A separation comes at T+107 s against 124 s as flown (−14 %), and SECO at
T+760 s against 916 s (−17 %).** MECO agrees within 2 %.

Max Q is early on Proton-M (−19 %) and Falcon Heavy (−26 %), the same pattern as Falcon 9 (F3).
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
- TEME is turned to the Earth-fixed frame by Greenwich mean sidereal time alone. UT1 − UTC
  (under 0.9 s) and polar motion are left out. They can move a point on the ground by up to about
  400 m, less than an element set's own error, which is kilometres (R04).

### The satellite catalogue and its formats (R02)

The Orbit section's real satellites come from a dataset of CelesTrak's element sets
(`src/provider/satellites.ts`): the space stations, Thailand's satellites, the four navigation
constellations, the weather satellites and the debris of Fengyun-1C. It is bundled as a snapshot
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
| rise and set times | within 0.35 s | 2 s |
| time of the highest point | within 0.11 s | 5 s |
| elevation at every event | within 0.004° | 0.02° |
| azimuth, as arc across the sky | within 0.003° | 0.02° |
| range | within 43 m | 1 km |
| the Sun's elevation at the place | within 0.005° | 0.05° |
| the satellite sunlit or not, at every event | the same, 249 of 249 | exact |
| the ISS into and out of the Earth's shadow (31 edges in a day) | on the same side 3 s either side of each | 3 s |

**Findings.**

- Leaving out UT1 − UTC and polar motion costs well under a second in the times of rise and set,
  which is less than the element set's own error.
- Elevations are geometric. Refraction lifts a satellite on the horizon by about half a degree,
  so it is seen some seconds before its listed rise. The page says so.
- A pass of half a day or more belongs to a high orbit (GPS, a geostationary satellite). Its
  visibility is not worked out: such a satellite is too faint to see with the eye.

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

### The Sun's activity in the lifetime (R05)

The lifetime model's density (`src/physics/propagator/density.ts`) now reads the Sun's activity
as measured, instead of one of three fixed levels:

- **The level** is NRLMSISE-00's total density averaged over the day and the seasons, as ECSS
  tabulates it for low, moderate and high long-term activity (F10.7 65, 140, 250; Ap 0, 15, 45;
  [ECSS-E-ST-10-04C](https://ecss.nl/wp-content/uploads/standards/ecss-e/ECSS-E-ST-10-04C15November2008.pdf),
  Annex G, Tables G-1 to G-3). Between and a little beyond them, the logarithm of the density is
  interpolated in 1/T, with T the exospheric temperature of the IPS relation
  T = 900 + 2.5 (F10.7 − 70) + 1.5 Ap
  ([IPS, "Satellite Orbital Decay Calculations"](https://www.sws.bom.gov.au/Category/Educational/Space%20Weather/Space%20Weather%20Effects/SatelliteOrbitalDecayCalculations.pdf)).
- **The spread through the day** is Harris–Priester's diurnal bulge (Montenbruck & Gill), scaled
  so that its average over the globe is that level.
- **The indices** (`src/physics/propagator/activity.ts`) are GFZ's monthly means of the observed
  F10.7 and of Ap since 1947 (`src/data/solar-history.ts`,
  [doi:10.5880/Kp.0001](https://doi.org/10.5880/Kp.0001), CC BY 4.0), then NOAA SWPC's monthly
  flux, the last thirty days' flux and the last week's Ap from Kp (Bartels's table), then SWPC's
  monthly forecast (expected, or the high or low side of its range) to its end, then the Sun
  taken to repeat itself eleven years on. Where no Ap is measured it is 13, the mean daily Ap of
  solar cycles 19 to 24. The space-weather dataset carries SWPC's months and forecast offline in
  its snapshot and online from SWPC.

The validation takes spheres, whose drag area does not depend on how they tumble. Each starts
from its first element set (CelesTrak) as mean elements (`src/orbit/mean-state.ts`), with its
published mass and diameter and C_D 2.2 (the app's value for a compact body), and is carried by
the mean-element method with the series the app builds until its perigee is below 120 km. The
tolerance, ±25 % of the days it actually spent in orbit, was fixed before the comparison.
Sources are in `tests/fixtures/space-weather/README.md`.

| sphere | mass, diameter | first set → re-entry (GCAT) | days in orbit | measured Sun | fixed moderate Sun |
| --- | --- | --- | --- | --- | --- |
| Starshine | 39 kg, 0.48 m | 1999-06-05 → 2000-02-18 | 258.2 | 223.9 (−13.3 %) | 289.5 (+12.1 %) |
| Starshine 2 | 39 kg, 0.48 m | 2001-12-16 → 2002-04-26 | 130.8 | 131.2 (+0.3 %) | 239.6 (+83.1 %) |
| Starshine 3 | 91 kg, 0.94 m | 2001-09-30 → 2003-01-21 | 478.2 | 386.0 (−19.3 %) | 755.6 (+58.0 %) |
| ANDE MAA | 52.04 kg, 0.4826 m | 2006-12-22 → 2007-12-25 | 367.6 | 286.5 (−22.1 %) | 107.6 (−70.7 %) |
| ANDE FCal | 62.70 kg, 0.4445 m | 2006-12-22 → 2008-05-25 | 519.5 | 412.2 (−20.7 %) | 151.4 (−70.9 %) |
| ANDE-2 Pollux | 27.442 kg, 0.4826 m | 2009-07-31 → 2010-03-29 | 241.4 | 192.6 (−20.2 %) | 64.1 (−73.5 %) |
| ANDE-2 Castor | 47.45 kg, 0.4826 m | 2009-07-31 → 2010-08-18 | 383.4 | 317.6 (−17.2 %) | 111.4 (−70.9 %) |

`tests/activity.test.ts` holds each sphere to the tolerance, the density to the ECSS tables at
the three levels (and its bulge to an average of one over the globe), and the series to the data
it is built from.

**Findings.**

- **All seven are within 25 % with the Sun as measured**, from the solar maximum of 2000–2002
  to the deep minimum of 2008–2009. A fixed moderate Sun gets the maximum's spheres down 1.6 to
  1.8 times too late and the minimum's 3.4 times too early. That spread, not the model, was the
  largest error of P07's fixed levels.
- **The model is early for six of the seven, by 13 to 22 % (−16 % on average).** A density some
  15–20 % too high, or a drag coefficient that high, would do it. NRLMSISE-00 is known to put
  too much air in the thermosphere of the 2008 minimum (Emmert, Lean and Picone, "Record-low
  thermospheric density during the 2008 solar minimum", GRL 37, L12102, 2010), which fits the
  ANDE spheres of 2007–2010; for the Starshines at maximum there is no such account, and the two
  causes are not separated here. Nothing was fitted to remove the bias.
- **Heights above the ellipsoid, not a sphere.** Run first with P07's altitude over a sphere of
  the equatorial radius, the spheres came down 12 to 35 % early, five of them outside the
  tolerance. Both tables are of height above the ellipsoid (Montenbruck & Gill evaluate
  Harris–Priester at the geodetic height): at 50° of latitude a sphere reads 12 km low, about a
  third too much air. The density now takes the height above WGS-84 (`heightKm`), which is what
  the tables mean; that correction was made once, for that reason, and the table above is its
  result.
- **The two methods agree to 7 %.** Starshine 2 carried by the full equations of motion, every
  force on, comes down after 140.3 days against the mean method's 131.2 (and 130.8 on record);
  the full equations start from the mean elements taken as osculating ones.
- **Monthly means smooth out storms.** For lifetimes of months that costs little; for a
  re-entry days away (M03) the daily indices matter, and a storm can move it by a day.
- **Beyond NOAA's forecast the Sun is assumed.** The series repeats the last eleven years; a
  lifetime of decades is an estimate, and the dialog offers the forecast's high and low sides to
  show how far it can move.

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
  than the limit are not searched (Hoots, Crawford and Roehrich, 1984).
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
| Iridium 33–Cosmos 2251: relative speed, crossing angle | 11.6 km/s, "nearly right angles" (Shepperd; Kelso) | 11.6 km/s, 102° | 0.05 km/s; 95–110° |
| the same: TCA of the conjunction message | 16:55:59.798 UTC | found again by straight-line motion; miss 226.3 m | 2 ms |
| the same: probability, the military's covariances | 2.6 × 10⁻⁵¹ (Shepperd, Table 2, 9 February) | 2.66 × 10⁻⁵¹ | 0.1 in log₁₀ |
| the same: Iridium's orbit estimate and covariance | 1.0 × 10⁻³ | 9.28 × 10⁻⁴ | 0.1 in log₁₀ |
| the same: Iridium's conservative covariance | 3.3 × 10⁻² | 3.23 × 10⁻² | 0.1 in log₁₀ |

The conjunction data are the appendix of R. W. Shepperd, "Subsequent Assessment of the Collision
between Iridium 33 and COSMOS 2251"
([AMOS 2023](https://amostech.com/TechnicalPapers/2023/Conjunction-RPO/Shepperd.pdf)): both
objects' states at the time of closest approach in the conjunction message of 9 February 2009,
Iridium's own orbit estimate, the three covariances, and the hard-body radii (3.942 m and 16 m).
The paper's Table 2 gives the probability each yields. The fixture is
`tests/fixtures/conjunction/iridium33-cosmos2251.json`.

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

## 8. Re-running

```sh
npx vitest run tests/kepler.test.ts tests/orbit-playground.test.ts tests/maneuvers.test.ts tests/maneuver-setup.test.ts tests/budget.test.ts tests/applications.test.ts   # the Orbit section, ~3 s
npx vitest run tests/sgp4.test.ts tests/omm.test.ts tests/real-sky.test.ts tests/satellite-catalogue.test.ts tests/passes.test.ts tests/uncertainty.test.ts   # real satellites, ~3 s
npx vitest run tests/activity.test.ts tests/propagator.test.ts                   # the Sun's activity in the lifetime, ~5 s
npx vitest run tests/conjunction.test.ts                                          # close approaches, ~3 s
npx vitest run tests/validation                                                   # point mass, ~10 s
npx vitest run --config vitest.heavy.config.ts tests/heavy/validation-falcon9.test.ts   # six-DOF, ~6 min
npx vitest run --config vitest.heavy.config.ts tests/heavy/validation-timelines.test.ts # six-DOF, ~13 min
```

When a test fails, its message prints the whole comparison table for that flight. If the change
behind it is intended, update the disagreement list in the test and the tables and findings here
in the same commit.
