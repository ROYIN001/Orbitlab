# Validation against flight data

[PHYSICS.md](PHYSICS.md) §6a compares each vehicle's timeline with a published callout the model
was **calibrated** against, and §10 says the physics "has not been validated against flight data".
This document is that validation: the simulator flies real missions as they were flown (vehicle,
pad, payload, orbit and booster recovery), and its trajectory is compared with measurements from
those flights, using tolerances fixed before the comparison. Nothing in `src/` was changed for it.
Where the model and the flight disagree, the disagreement is recorded here with its most likely
cause. It is not tuned away.

Status on 2026-09-25, main @ 844ffca:

| vehicle | reference | state |
| --- | --- | --- |
| Falcon 9 Block 5 | Webcast telemetry of five flights, 2018–2019 | Compared in both flight models (§2) |
| Soyuz-2.1a | Roscosmos / NASA launch timelines to the ISS | Not yet done: the sources cannot be reached from the build environment (§3) |
| Electron, Ariane 6 | Operator timelines | Not yet done, same reason (§3) |

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
Nothing has been changed here, because changing it moves every calibrated row of PHYSICS.md §6a.

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

## 3. Soyuz-2.1a, Electron and Ariane 6: not yet compared

The sources for these vehicles are the operators' and NASA's published launch timelines, for
example the ISS-mission Soyuz timelines on nasa.gov, Rocket Lab's mission press kits and
Arianespace's launch kits. None of them could be reached from the environment this was
written in, where only GitHub was reachable. They are left out rather than filled in from
memory. Until they are compared, the Soyuz, Electron and Ariane 6 rows of PHYSICS.md §6a are
calibration targets, not validation.

## 4. Re-running

```sh
npx vitest run tests/validation                                                   # point mass, ~10 s
npx vitest run --config vitest.heavy.config.ts tests/heavy/validation-falcon9.test.ts   # six-DOF, ~6 min
```

When a test fails, its message prints the whole comparison table for that flight. If the change
behind it is intended, update the disagreement list in the test and the tables and findings here
in the same commit.
