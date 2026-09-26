# Validation against flight data

[PHYSICS.md](PHYSICS.md) §6a compares each vehicle's timeline with a published callout the model
was **calibrated** against. This document is the validation: the simulator flies real missions
as they were flown (vehicle, pad, payload, orbit and booster recovery), and its trajectory is
compared with measurements from those flights, using tolerances fixed before the comparison.
Where the model and the flight disagree, the disagreement is recorded here with its most likely
cause. It is not tuned away.

The comparison was first made with nothing in `src/` changed (main @ 844ffca). It then led to one
data change and one bug fix, both in §2 "Data change applied": Falcon 9's first stage now flies
its published masses, and a propellant-conservation bug found along the way is fixed (F10).
Nothing was fitted to the flights.

Status on 2026-09-25:

| vehicle | reference | state |
| --- | --- | --- |
| Falcon 9 Block 5 | Webcast telemetry of five flights, 2018–2019 | Compared in both flight models (§2); first-stage masses corrected |
| Soyuz-2.1a | Soyuz MS-25 as flown (RussianSpaceWeb, quoting Roskosmos) | Compared in both flight models (§3) |
| Electron, Ariane 64 | Rocket Lab press kit, Arianespace launch kit (planned timelines) | Compared in both flight models (§3) |
| Orbit playground (O01) | Published orbits: geostationary, GPS, Landsat WRS-2, Sentinel-2; closed forms | Kepler and first-order J2 held to them (§4), 2026-09-26 |
| Maneuver planner (O02) | Vallado's and Curtis's worked examples; closed forms | Transfers and Lambert held to them (§4), 2026-09-26 |
| Continue in orbit (O03) | A recorded Soyuz flight's hand-off; the rocket equation | The playground's orbit is the flight's; the budget is Tsiolkovsky's (§4), 2026-09-26 |

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

**F5. The six-DOF model climbs higher between T+100 and T+140 s than the point-mass model and the
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
stage mass exists to correct it (Rocket Lab does not publish them), so it is not applied. The
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

## 4. The orbit playground (O01): Kepler and J2 against published orbits

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

## 5. Re-running

```sh
npx vitest run tests/kepler.test.ts tests/orbit-playground.test.ts tests/maneuvers.test.ts tests/maneuver-setup.test.ts tests/budget.test.ts   # the Orbit section, ~3 s
npx vitest run tests/validation                                                   # point mass, ~10 s
npx vitest run --config vitest.heavy.config.ts tests/heavy/validation-falcon9.test.ts   # six-DOF, ~6 min
npx vitest run --config vitest.heavy.config.ts tests/heavy/validation-timelines.test.ts # six-DOF, ~3 min
```

When a test fails, its message prints the whole comparison table for that flight. If the change
behind it is intended, update the disagreement list in the test and the tables and findings here
in the same commit.
