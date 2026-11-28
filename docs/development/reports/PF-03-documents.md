# PF-03: documents brought to the code

Package PF-03 ("Documents brought to the code", S20 §5.1) takes the 28 rows of §5 of the
[physics audit of 2026-11-26](physics-audit-2026-11-26.md). Each row was checked against today's
code, test or document before its document was touched; the audit read the code, it did not run
it. The package changes Markdown only: [PHYSICS.md](../../PHYSICS.md),
[VALIDATION.md](../../VALIDATION.md), [IMPLEMENTATION-STATUS.md](../../IMPLEMENTATION-STATUS.md)
and [ROADMAP-PART2-3.md](../../ROADMAP-PART2-3.md) are the four documents edited (ROADMAP-PART2-3.md only for review-round item 3b), and no file
under `src/`, `tests/` or `scripts/` was changed. Where a row names a source comment (rows 5, 7, 8,
11 and 12), and for the two comments the review round added (rows 4 and 20), the wording it should
get is given below, for the batch that next edits that file.

Verdicts are those of the plan's list. A sentence is quoted as it stood; where a row was edited,
the sentence after is quoted too. Row 28 is not PF-03's: it is package LV-2's and was not touched.

## Rows 1 to 28

| # | Document sentence before | Code fact today (file and line) | Verdict | Sentence after |
|---|---|---|---|---|
| 1 | PHYSICS.md line 36: "Every vehicle flies by default as a **rigid body**: the state adds a quaternion attitude…" | `src/physics/rigid/config.ts:17-22`: `defaultDynamics` gives `sixDof` for catalogue vehicles. `src/physics/simulation.ts:216-218`: `dynamics` is read only when given. `:1203`: the integrator is `pointMass` without rigid accelerations. `src/design/build-handoff.ts:19-25`: the hand-over sets dynamics, `pointMass` unless six-DOF is ticked | reworded | "In the app, every vehicle flies by default as a **rigid body** (a `Simulation` without `dynamics`, and a Build hand-over without six-DOF ticked, fly point mass): the state adds…" |
| 2 | PHYSICS.md lines 30-31: "classical fourth-order Runge–Kutta with adaptive steps (0.1 s in the atmosphere, up to 30 s in orbit)" | `src/physics/simulation.ts:690` ascent step 0.1 s below 100 km; `:703` orbit step `Math.min(30, …)`; `:728` the same in orbit. `src/physics/integrator.ts:11-22`: `rk4Step` is a fixed step with no error estimate | reworded | "classical fourth-order Runge–Kutta with steps chosen by flight regime and no error control (0.1 s in the atmosphere, up to 30 s in orbit)." |
| 3 | PHYSICS.md line 1139: "a table built for each configuration of the vehicle (Falcon 9 and Soyuz-2.1a;" | `src/physics/rigid/mass.ts:262-291`: `stackAeroTable` builds a table per stack configuration for any vehicle with a launcher; the cache is keyed by the spec. `src/physics/rigid/aero-tables.ts:174-246`: `ascentAeroTable(spec, …)` takes any spec | corrected | "a table built for each configuration of the vehicle (every vehicle;" |
| 4 | PHYSICS.md lines 1110-1121: "Vallado's published values … 6.6e-6 kg/m³ with a 5.5 km scale height is 5.1 % below the USSA-76 density" | `src/physics/atmosphere.ts:38-39`: the comment says Vallado quotes 6.958e-6 with 5.5 km. `:49`: the table row is `[86, 6.95793e-6, 5.575]`. The comment's own "5.1 % below" holds for 6.6e-6, not for 6.958e-6 | undecided (see below) | none |
| 5 | PHYSICS.md lines 1168-1171: "within 1 % of the quoted `ispSL` for most of the fleet … Vulcain 2.1 +5.0 %, Rutherford +2.6 %, Raptor 2 +2.4 % (and the RD-108A +6.9 % …)" | `tests/physics-core.test.ts:374`: "The bound is 8 %". `:386`: `toBeLessThan(0.08)` over the ground-lit engines of the first stage and boosters. `:394`: the pinned list is `['Raptor 2 2.4 %', 'Rutherford 2.6 %', 'Vulcain 2.1 5.0 %']`. No test asserts "1 %" or "24 of 31" | reworded; source comment carried | "The sea-level Isp a ground-lit engine of each vehicle's first stage and its boosters then delivers is within 8 % of the quoted `ispSL`, the bound `tests/physics-core.test.ts` asserts; the engines it pins above 2 % are Vulcain 2.1, Rutherford and Raptor 2 (the RD-108A left that list on 2026-10-01, when it took Arianespace's published pair)." |
| 6 | PHYSICS.md lines 1505-1520, table: "Vulcan Centaur \| 1.5 \| 0.30 \| 35 \| 150", "PSLV-XL \| 1.5 \| 0.30 \| 25 \| 0"; no six-DOF kicks | `src/data/vehicles.ts:497`: Vulcan `kickAngle: 3`, `pitchMax: 40`, `loftAltitude: 150e3`. `:707`: PSLV-XL `loftAltitude: 80e3`. `:396`: Falcon 9 `guidanceDefaultsSixDof: { kickAngle: 3.5 }`. `:448`: Atlas V six-DOF kick 8. `:360`: Angara-A5 six-DOF kick 8 | corrected | Vulcan row "3.0 \| 0.30 \| 40 \| 150"; PSLV-XL row "1.5 \| 0.30 \| 25 \| 80"; new sentence after the table: "The six-DOF kicks the default flight uses are not in this table; among them are Soyuz-2.1a 6°, Falcon 9 3.5°, Atlas V 8° and Angara-A5 8° (`src/data/vehicles.ts`, `guidanceDefaultsSixDof`)." |
| 7 | VALIDATION.md line 2721-2722: "55 engine parts (…), 50 stage bodies, 14 strap-on bodies, 17 fairings"; IMPLEMENTATION-STATUS.md line 490: "55 engines, 50 stage bodies, 14 strap-on bodies and 17 fairings"; findings: "25 of 49 stage bodies", "13 of 17 fairings" | `tests/parts.test.ts:96`: `toEqual([21, 55, 49, 14, 18])`. No test asserts the uncited counts; the only test using `UNCITED` (`tests/design-part-card.test.ts`) uses the marker text | corrected (49 and 18); reworded (uncited counts); source comment carried (`src/data/parts.ts:4-5`) | "49 stage bodies, 14 strap-on bodies, 18 fairings"; IMPLEMENTATION-STATUS: "55 engines, 49 stage bodies, 14 strap-on bodies and 18 fairings"; findings: "stage bodies with no cited source (no test holds how many; `UNCITED` in `src/data/parts.ts` marks them; …)" and "fairings with no cited source (no test holds how many)."; review round, item 3a: VALIDATION.md line 43 "sources missing for some of the engines, stage bodies, strap-on bodies and fairings, stated (§8)"; item 3b: ROADMAP-PART2-3.md lines 155-156 "49 stage bodies, 14 strap-on bodies and 18 fairings" |
| 8 | VALIDATION.md lines 2991-2993: "bound 8 % (from `physics-core.test.ts`): worst RD-108A, +6.93 %. The engines more than 2 % off are the four already known: RD-108A +6.9 %, Vulcain 2.1 5.0 %, Rutherford 2.6 %, Raptor 2 2.4 %" | `tests/design-static-fire.test.ts:143`: `toBeLessThan(0.08)`. `:146`: `toEqual(['Raptor 2 2.4 %', 'Rutherford 2.6 %', 'Vulcain 2.1 5.0 %'])`: three engines. `tests/physics-core.test.ts:386`: the 8 % bound. RD-108A is not in the list | reworded; source comment carried (`src/design/static-fire.ts:31-32`) | "bound 8 % (from `physics-core.test.ts`): the engines that both tests pin above 2 % off are three: Vulcain 2.1, Rutherford and Raptor 2 (`tests/physics-core.test.ts`, `tests/design-static-fire.test.ts`). **Met.**" |
| 9 | IMPLEMENTATION-STATUS.md line 464 (R03): "Held to Skyfield: times within 0.35 s, angles within 0.004°" | VALIDATION.md line 36: "times within 0.34 s, angles within 0.005°". VALIDATION.md lines 1717-1720: rise and set within 0.34 s; elevation within 0.005°; azimuth within 0.004° | corrected | "Held to Skyfield: times within 0.34 s, angles within 0.005°" |
| 10 | IMPLEMENTATION-STATUS.md line 466 (R05): "GFZ's monthly F10.7 and Ap since 1947 … 13–22 % early for six" | `src/data/solar-daily.json` line 1: `"from":"1954-01-01"`, "F10.7obs and Ap by UT day". VALIDATION.md line 1865-1866: "Six of the seven are still early, by 8 to 23 %" (the default: the daily-index column) | corrected | "GFZ's daily F10.7 and Ap from 1954-01-01, …" and "8–23 % early for six" |
| 11 | `src/orbit/sgp4.ts` header lines 30-32: "UT1 − UTC (under a second) and polar motion are left out" | `src/orbit/passes.ts:89`: `temeToItrf` applies UT1 and polar motion. `src/orbit/real-sky.ts:67`: `earthAngle` applies UT1 only, no pole. `src/orbit/earth-orientation.ts:68-79`: `temeToItrf` | source comment carried (no document edit) | see Source comments carried |
| 12 | `src/physics/propagator/propagate.ts` header lines 15-18: "carried in steps of up to a day" | `:40`: `STEP_MAX = 5 * 86400`. `:211`: `PERIGEE_ARC_HEIGHT = 300e3`. `:242`, `:246`: arcs of 24, then 12 points. `:267`, `:271`: step limit `0.005 * margin` (0.5 %) | source comment carried (no document edit) | see Source comments carried |
| 13 | VALIDATION.md lines 1880-1883: "Starshine 2 carried by the full equations of motion … comes down after 142.6 days against the mean method's 132.8" | No test runs a sphere by Cowell. `tests/integrator-convergence.test.ts:89` runs Cowell on a generic case; `tests/ballistic.test.ts:69` fits Starshine 2 by a set history, not this run. "142.6" appears in no test | gap recorded | "…the full equations start from the mean elements taken as osculating ones. No test in the repository holds this run. R05's density…" |
| 14 | VALIDATION.md line 1946: "(108 runs, 591 approaches)"; line 1984: "All 108 runs gave the full search's approaches, 591 in all" | `tests/heavy/screening-filter.test.ts:14-22`: the sweep. `tests/screening-cases.ts:86-93`: asserts that nothing is dropped or added (`toEqual([])`) and a miss within 1 mm; no test asserts the count 591 | gap recorded; reworded | "(108 runs; no test pins the number of approaches)"; "All 108 runs gave the full search's approaches, with none dropped and none added (`tests/heavy/screening-filter.test.ts` asserts that equality; no test pins the count of 591)." |
| 15 | ROADMAP-PART2-3.md line 116 (O04): "Look angles against a published calculator's worked examples; link budget against a textbook example" | `tests/applications.test.ts` holds closed-form checks only: look angles against the spherical closed form (lines 55-60), Thaicom's bearings (68-75), the footprint and coverage of GEO (78-81), signal delay (92-96), and the free-space loss of 195.6 dB at 36 000 km and 4 GHz with the link-budget sum (100-116). No test uses a published calculator's worked examples or a textbook link-budget example | no edit; gap recorded | none (the roadmap states a plan, which is still true) |
| 16 | PHYSICS.md lines 2843-2844: "a circle at 418 km in the plane the launch windows use" | `src/physics/rendezvous/plan.ts:139-143`: the station is placed on the spacecraft's arrival plane (`h = normalize(cross(sArr.r, sArr.v))`). `src/physics/rendezvous/station.ts:23-24`: `inclination: 51.64` is unused (only `STATION.altitude` is read, `:107`). `issRaanAt` is called only at `src/physics/mission.ts:459` | corrected | "a circle at 418 km in the spacecraft's own plane at arrival" |
| 17 | PHYSICS.md lines 2929-2931: "every profile docks, to every port, in the point-mass and the six-DOF ascent alike" | `tests/heavy/rendezvous.test.ts:42-46`: three profiles (`FLOWN`). `:48-58`: each to Rassvet. `:60-70`: four ports of `PORT_IDS` (`src/physics/rendezvous/ports.ts:24-33`) on the two-orbit profile. `:72-84`: one six-DOF ascent | reworded | "the tests dock three profiles to Rassvet, four ports on the two-orbit profile, and one six-DOF ascent (`tests/heavy/rendezvous.test.ts`); no test docks every profile to every port." |
| 18 | PHYSICS.md lines 3251-3253: "MS-16, launched at its real second, reaches a plane 0.4° from the station's (tests/watch-missions.test.ts)." | `tests/watch-missions.test.ts:70-74`: asserts only that the window opens within 180 s of the real liftoff. The figure 0.4 appears nowhere in that file | reworded; gap recorded | "…reaches a plane 0.4° from the station's; no test holds that angle, and `tests/watch-missions.test.ts` checks only that the launch window opens within 180 s of the real liftoff." |
| 19 | PHYSICS.md line 2891: "the whole two-orbit flight costs 116.8 m/s against MS-28's 117" | PHYSICS.md two-orbit table: DV1 22.0, DV2 50.9, DV3 42.2, braking 5.7 m/s: sum 120.8; 115.1 without braking (see Sums). `tests/rendezvous.test.ts:84-85`: `total > 95` and `< 135` | reworded | "…where MS-28 arrived still closing. The whole two-orbit flight costs 120.8 m/s, the sum of the four burns in the table above (115.1 without the braking burn); `tests/rendezvous.test.ts` bounds the total between 95 and 135 m/s." |
| 20 | PHYSICS.md line 2748: "(7 635 kg)"; line 2771: "Head section with the tower \| 7 635 kg \| Braeunig…" | `src/physics/rigid/escape.ts:78`: tower 1740 kg, propellant 800. `:99`: fairing 1180 kg, propellant 176. `:108`: orbital module 1300. `:109`: descent module 2950. `:494-499`: `headConfiguration` sums the four parts: 7170 kg (see Sums) | corrected | "(7 170 kg)"; "Head section with the tower \| 7 170 kg \| Sum of the parts in `src/physics/rigid/escape.ts`: …" |
| 21 | PHYSICS.md lines 3685-3689: "A point-mass step is cut at the end of the recorder's packet, … moves the sphere along the track by up to 4 km" | `src/replay/recorder.ts:862-889`: `advanceAhead` flies whole steps of `sim.suggestedDt()`; a packet only decides when a step is flown | corrected | "(The point-mass flight steps whole steps (`sim.suggestedDt()`, `src/replay/recorder.ts:862-889`): no step is cut at the end of a recorder's packet, and a packet's length decides only when a step is flown. The six-DOF takes the same steps at any packet.)" |
| 22 | VALIDATION.md line 601-602: "**48 → 53 of 66**" (six-DOF); "The point-mass rows are unchanged (49 of 66)" | Counts only a run gives: `tests/validation/falcon9-webcast.test.ts:22-30`; `tests/heavy/validation-falcon9.test.ts:20-28`. Line 396, named by the row, holds neither figure | waits for a run | none (left as it stands) |
| 23 | PHYSICS.md lines 2183-2185 (table: 33, 23, 13 excluded); IMPLEMENTATION-STATUS.md lines 313-317: "195 vehicle × orbit × payload combinations; 126 are flown … 69 are excluded … 33 … 23 … 13" | `tests/fleet-harness.ts:368` (`BEYOND_CAPABILITY`), `:449` (`ARCHITECTURE`); the counts are a run's | waits for a run | none (left as it stands) |
| 24 | PHYSICS.md lines 2008-2011: "45 not flyable, 150, 111 acceptance cases, 39 excluded" | The same document's table, in row 23, gives 195, 126 and 69 | waits for a run (the two sets contradict each other) | none (left as it stands) |
| 25 | VALIDATION.md lines 15-17: "Every fitted, derived and constructed value the vehicles fly is in one register" | VALIDATION.md §1 register (line 99 on): Falcon 9 (kick only), Soyuz-2.1a and 2.1b, Saturn V (AS-506), Mercury-Redstone. Not in it: `src/data/vehicles.ts:360` and `:448` (kicks of 8°), `:382` (Falcon 9's 22 kPa throttle bucket), `:747` (Sputnik's core, 97.5 t) | reworded | "The fitted, derived and constructed values of Falcon 9 (its six-DOF kick only), the Soyuz-2.1 vehicles, Saturn V AS-506 and Mercury-Redstone are in one register (§1, \"Fitted and derived values\"); it lacks the 8° six-DOF kicks of Atlas V and Angara-A5, Falcon 9's 22 kPa throttle bucket and Sputnik's core load." |
| 26 | PHYSICS.md line 2233-2234: "The published 23 t / 24.5 t / 8.2 t LEO figures are for the configuration without it" | `src/data/vehicles.ts:256`: Soyuz-2.1b `payloadLEO: 8670` | open question, recorded (not edited) | none |
| 27 | VALIDATION.md line 819: "met within 10 %" (Soyuz-2.1b on the same programme, unfitted); lines 876-877: "acceleration trace within 1 % through max Q (… against 1.828 / 1.841 / 1.869 g)" | No test: searched for 1.828, 43.2 and 144.7 across `tests/`; the only hits are fixture data (`tests/fixtures/reentry/agencies.json`) | reworded; gap recorded | "met within 10 %; no test in the repository holds this check"; "…1.869 g); no test in the repository holds this within-1 % check." |
| 28 | audit-2026-10-01-flight-profile.md lines 737-742 | not touched: package LV-2's | not touched | none |

## Source comments carried

Not edited in this package (no file under `src/` changed). The wording for the batch that next edits
each file:

- **Row 5, `src/physics/vehicle.ts:246-249`.** Today: "`data-consistency` asserts the two agree to
  1 % for every ground-lit engine". Should read: "`tests/physics-core.test.ts` asserts the delivered
  sea-level Isp of each ground-lit engine of a vehicle's first stage and its boosters within 8 % of
  `ispSL`, and pins the engines above 2 % (Vulcain 2.1, Rutherford, Raptor 2); `tests/data-consistency.test.ts`
  asserts no 1 % bound." (`data-consistency` asserts only `ispSL <= ispVac` and positive values.)
- **Row 7, `src/data/parts.ts:4-5`.** Today: "55 engine parts, 50 stage bodies, 14 strap-on bodies
  and 17 fairings." Should read: "55 engine parts, 49 stage bodies, 14 strap-on bodies and 18 fairings"
  (`tests/parts.test.ts:96`).
- **Row 8, `src/design/static-fire.ts:31-32`.** Today: "(by up to 6.9 % in the catalogue,
  tests/physics-core.test.ts)". Should read: "(by up to 8 % in the catalogue, the bound
  `tests/physics-core.test.ts` asserts; three engines are pinned above 2 %)".
- **Row 11, `src/orbit/sgp4.ts:30-32`.** Today: "UT1 − UTC (under a second) and polar motion are left
  out, which moves a point on the ground by at most half a kilometre". Should read: "`temeToItrf`
  (`src/orbit/earth-orientation.ts:68-79`), used by the passes (`src/orbit/passes.ts:89`), applies UT1
  − UTC and polar motion; the sky readouts (`earthAngle`, `src/orbit/real-sky.ts:67`) apply UT1 − UTC and
  no pole. This function, `temeToEcef`, applies the sidereal time alone." (The half-kilometre figure is
  the header's own; no test holds it.)
- **Row 12, `src/physics/propagator/propagate.ts:15-18`.** Today: "carried in steps of up to a day".
  Should read: "carried in steps of up to five days (`STEP_MAX`, line 40), with 24 or 24 + 12 points in
  eccentric anomaly split at a 300 km perigee arc (lines 211, 242-246), and a step is limited so that the
  semi-major axis falls by at most 0.5 % of the perigee's margin above the re-entry height (line 267).
- **Atmosphere, `src/physics/atmosphere.ts` lines 38-48 (row 4).** Today the comment says Vallado's table
  quotes 6.958e-6 with a 5.5 km scale height and that this is "5.1 % below" the USSA-76 value and decays to
  3.190e-6 at 90 km. The first two statements do not follow from 6.958e-6: 6.958e-6 is the USSA-76 value
  itself, and 6.958e-6 × exp(−4/5.5) is 3.362e-6, not 3.190e-6. Wording it should get, once the owner has said what
  Vallado's table prints at 86 km: give that value as Vallado's, and state the "5.1 %" and "3.190e-6" only if they
  are recomputed from it; the table row used (line 49, 6.95793e-6) is the re-derived one. Waits for the owner's
  answer on row 4.
- **Row 20, `src/physics/rigid/escape.ts:77`.** Today: "head section with the tower, kg: 7 635 kg (Braeunig)".
  Should read: "head section with the tower, kg: 7 170 kg as modelled, the sum of the parts below it (Braeunig's
  7 635 kg is the 1966 system's figure)." The parts are at `:78`, `:99`, `:108`, `:109` (see Sums)."

## Gaps recorded

The work order names no owning package for these. Each is a missing test; none was written.

- **Row 13.** A Cowell run of Starshine 2 (142.6 days against 132.8 by the mean method). Owner: not named in the work order.
- **Row 14.** A pin of the approach count of the 108-run screening sweep (591). Owner: not named in the work order.
- **Row 15.** No test uses a published calculator's worked examples or a textbook link-budget example for the Orbit applications (O04); `tests/applications.test.ts` holds closed-form checks only (see the row 15 cell). Owner: not named in the work order.
- **Row 17 (by the narrowed sentence).** No test docks every profile to every port. Owner: not named in the work order.
- **Row 18.** The 0.4° plane angle of MS-16 against the station. Owner: not named in the work order.
- **Row 27.** The Soyuz-2.1b profile check (43.2 and 144.7 km, 1.72 and 3.65 km/s, within 10 %) and the within-1 % acceleration trace through max Q. Owner: not named in the work order.

## Waiting for a run

Rows 22, 23 and 24 are left as they stand. Their counts come from the next heavy and fleet run, not from
reading the code.

- **Row 22.** The six-DOF "53 of 66" and the point-mass "49 of 66" (VALIDATION.md lines 601-602). Line 396,
  which the row also names, holds neither figure.
- **Row 23.** The fleet matrix of 195 combinations, 126 passing, 33 / 23 / 13 excluded
  (PHYSICS.md lines 2183-2185; IMPLEMENTATION-STATUS.md lines 313-317). `tests/fleet-harness.ts` iterates all
  vehicles; the key counts of `BEYOND_CAPABILITY` and `ARCHITECTURE` were not counted by reading.
- **Row 24.** PHYSICS.md lines 2008-2011 contradict their own table (45 / 150 / 111 / 39 against 195 / 126 / 69).
  Which set is right is what the run tells.

## Open questions

- **Row 26.** PHYSICS.md line 2233-2234 says the published Soyuz-2.1b LEO figure is 8.2 t for the configuration
  without the kick stage; `src/data/vehicles.ts:256` holds `payloadLEO: 8670` (8.67 t). Which is right is a
  data question for the launcher-data packages. Not edited.

Seen and left, outside the rows (not in any row's places, so not edited):

- VALIDATION.md line 43 (the summary table): "25 of 50 stage bodies, … 13 of 17 fairings" carries the same
  stale totals (50 and 17) as row 7.
- VALIDATION.md, the strap-on finding "5 of 14 strap-on bodies (7 before F11 …)": an uncited count that no test asserts.
- VALIDATION.md, the sentence after row 8: "Merlin 1D 287.52 s against 282 s (+1.96 %), Vulcain 2.1 302.0 s against 318 s (−5.0 %)":
  by hand, not named by row 8.

## Sums shown term by term

Row 19 (PHYSICS.md, the two-orbit table, model column; m/s):

- DV1 22.0 + DV2 50.9 + DV3 42.2 = 115.1 (without braking)
- + braking at the aim point 5.7 = **120.8**

Row 20 (`src/physics/rigid/escape.ts`, `headConfiguration`, tower mode at the start of the abort;
the propellant terms are the values the mode sets, `:673-674`):

- descent module 2950 (`:109`)
- + orbital module 1300 (`:108`)
- + fairing (1180 − 176 + 176) = 1180 (`:99`; `fairingPropellant` = 176 in tower mode, `:674`)
- + tower (1740 − 800 + 800) = 1740 (`:78`; `towerPropellant` = 800 in tower mode, `:673`)
- = **7170 kg**

## Undecided

- **Row 4.** The sentence "Vallado's published values … 6.6e-6 kg/m³ with a 5.5 km scale height is 5.1 % below the
  USSA-76 density … decays to 3.190e-6 at 90 km …, a 6.4 % density inversion" is built on 6.6e-6. The row's
  disposition says to correct the value to `src/physics/atmosphere.ts`, which says 6.958e-6 (`:38-39`, `:49`:
  6.95793e-6 is the re-derived 86 km base). But 6.958e-6 is the USSA-76 value itself, so "5.1 % below" would be
  false with it; with 6.958e-6 and 5.5 km the decay to 90 km gives about 3.36e-6, not 3.190e-6, and the 6.4 %
  inversion disappears. Changing the one number would make the paragraph's argument false. The comment in
  `atmosphere.ts` is the side that contradicts itself, and the table row the code uses (`[86, 6.95793e-6, 5.575]`, line 49) is the re-derived one. The paragraph is self-consistent for 6.6e-6: 6.6e-6 × exp(−4/5.5) = 3.189e-6; 1 − 6.6/6.95793 = 5.1 %; 3.396/3.19 − 1 = 6.5 % (the paragraph says 6.4 %). The question for the owner is which value Vallado's table prints at 86 km. Not edited; needs the owner's decision on which
  value Vallado's table gives.

## Review round

The independent review's verdict was "pass with fixes": no edit made a document state something the code
contradicts, and leaving row 4 undecided was right. The orchestrating session's six items were done as follows.

1. **PHYSICS.md, the row 19 paragraph.** "the sum is the same" is removed. It now reads "…where MS-28 arrived
   still closing. The whole two-orbit flight costs 120.8 m/s, the sum of the four burns in the table above
   (115.1 without the braking burn); `tests/rendezvous.test.ts` bounds the total between 95 and 135 m/s." No
   figure for MS-28's total is written.
2. **PHYSICS.md, the known-limits item (row 5's claim, the same fact).** Now: "Three engines' quoted sea-level
   Isp is more than 2 % away from what their thrust and mass flow deliver (Vulcain 2.1, Rutherford and Raptor 2,
   the list `tests/physics-core.test.ts` pins); the model flies the delivered value (§4)." The three names match
   `tests/physics-core.test.ts:394`.
3. **Row 7's counts, two more places.**
   a. VALIDATION.md, summary row "Parts catalogue (D01)": "sources missing for 29 of 55 engines, 25 of 50 stage
      bodies, 6 of 14 strap-on bodies and 13 of 17 fairings" now reads "sources missing for some of the engines,
      stage bodies, strap-on bodies and fairings, stated (§8)". The rest of the row, its date included, is unchanged.
   b. ROADMAP-PART2-3.md, lines 155-156 (the only ROADMAP edit): "50 stage bodies, 14 strap-on bodies and 17
      fairings" now reads "49 stage bodies, 14 strap-on bodies and 18 fairings" (`tests/parts.test.ts:96`).
4. **PHYSICS.md, the row 6 sentence after the table.** It no longer reads as a complete list. `src/data/vehicles.ts:249`
   (Soyuz-2.1a's `guidanceDefaultsSixDof`, `kickAngle: 6`, whose comment says the rigid body flies this 6° kick) is
   added: "among them are Soyuz-2.1a 6°, Falcon 9 3.5°, Atlas V 8° and Angara-A5 8°".
5. **VALIDATION.md §8, row 8's sentence.** "the engines this test pins" is now "the engines that both tests pin above
   2 % off are three: …(`tests/physics-core.test.ts`, `tests/design-static-fire.test.ts`)". Both assert the same
   three-name list (`tests/physics-core.test.ts:394`, `tests/design-static-fire.test.ts:146`).
6. **This report.**
   a. Row 12's clamp clause corrected: a step is limited so that the semi-major axis falls by at most 0.5 % of the
      perigee's margin above the re-entry height (`propagate.ts:267`).
   b. "Source comments carried" gains two entries: `src/physics/atmosphere.ts` lines 38-48 (row 4; the comment is at
      38-48, not 25-33 as the review's note said) and `src/physics/rigid/escape.ts:77` (row 20). Both are wording
      for later batches; neither file is edited.
   c. "Undecided" (row 4) now records that the paragraph is self-consistent for 6.6e-6 (3.189e-6 decay; 5.1 %; 6.5 %
      against 3.19e-6, where the paragraph says 6.4 %), that the code comment is the side that contradicts itself,
      and that the owner's question is which value Vallado's table prints at 86 km.
   d. Row 15: `tests/applications.test.ts` was read. It holds closed-form checks (look angles, Thaicom bearings, footprint,
      signal delay, the 195.6 dB free-space loss, the link-budget sum). The gap is now worded as "no test uses a
      published calculator's worked examples or a textbook link-budget example".
   e. The intro and "Checks run" state the documents actually edited: four (PHYSICS.md, VALIDATION.md,
      IMPLEMENTATION-STATUS.md, ROADMAP-PART2-3.md). The first round's intro had listed the ROADMAP among the
      documents edited while it was not; that is now true.
   f. This section.
   g. The table's sentence-after cells were brought into line for rows 5 (already matched), 6, 7, 8 and 19.

Seen and left alone (what remains from the first list, not corrected in this round):

- Row 4: undecided. The owner's answer on Vallado's value at 86 km is needed.
- VALIDATION.md §8, the finding under row 7: "27 of 55 engine parts" and "5 of 14 strap-on bodies (7 before F11 …)"
  still state uncited counts that no test asserts. Item 3a's wording was given for the summary row; §8 keeps its counts
  because the review's wording did not cover them and row 7's scope named only stage bodies and fairings.
- VALIDATION.md, the sentence after row 8: "Merlin 1D 287.52 s against 282 s (+1.96 %), Vulcain 2.1 302.0 s against
  318 s (−5.0 %)": by-hand figures, not named by row 8.
- PHYSICS.md, the row 19 paragraph: "(42 + 6 m/s against 31 + 12 m/s)", the MS-28 split figures, by hand, not named by row 19.
- Row 22: line 396, which the row names, holds neither "49 of 66" nor "53 of 66".

## Checks run

- Each edit was checked against its row by reading the edited sentence in `git diff`; no edit touched a sentence
  outside its row except for the table cells and the one added sentence named under row 6.
- `npx vitest run tests/repo-hygiene.test.ts` (run once after the first round's edits, and once again after the review round's): 1 file, 9 of 9 tests passed both times.
- Relative links in the four edited documents, this report and the fragment: a Python script resolved each `](...)`
  target against the file's folder (the fragment's against `docs/development/`, where its links are copied),
  anchors stripped: 114 relative links, 0 missing.
- `git status --short` and `git diff --stat`: only the four Markdown documents, this report and the fragment.
