# Physics audit of 2026-11-26

## 1. Status of this document

This is the permanent record of a physics-realism audit of Orbitlab made on 2026-11-26. Five reading agents each audited one area. Their reports were consolidated into this document the same day. The areas are: the ascent dynamics core; validation of the launcher fleet against real flights; the Orbit section; special phases and missions; the Build and design models.

No simulation, test or build was run for the audit or for this document. The agents read documents and code. Every error figure here comes from the project's own documents and tests, as recorded there. A few figures were recomputed by an agent from the source or from published formulas; these are marked "by hand" or "(recomputed)". Published reference values were not re-fetched, except that one agent compared five reference sources for the fleet area (see section 8).

The classes A to D are those of plan [S20](../plan/S20-physics-foundation.md) §2:

- **A** Engineering-analysis grade: first-principles or standard model, published inputs, agreement with an independent reference to about 1 % (or the reference's own tolerance).
- **B** Preliminary-design grade: right physics, moderate simplifications, key quantities within about 1 to 5 % of an independent reference.
- **C** Educational grade: right phenomena and magnitudes, within about 5 to 20 %, some effects absent or tuned.
- **D** Illustrative: scripted, heavily fitted or qualitative.

Two rules apply to every class claim. An independent reference is data or a tool that shares no code with Orbitlab and was not used to set the model's inputs. Agreement with a flight the model was fitted to counts for nothing: a fitted model is C at most unless a held-out check supports more.

A finding in this document is a lead until someone re-checks it, except where the reference check in section 9 confirmed the code reference. That check confirms only that the cited place exists and holds what the report says is there. It does not re-verify the physics. Where a report differs from plan S20 §4 ("Now" column), the difference is stated in the section concerned. The plan lists no class for Apollo 11, for the individual launchers or for Starship's return; the classes for those come from the raw reports only.

Reference check: 465 locations were enumerated from the five reports and all 465 were checked. Result: 460 confirmed, 1 moved, 4 not found (the four are tests or assertions that a document or code comment cites and that do not exist; each is marked in the body). All 140 cited files exist. Locations are cited in the body as they are on 2026-11-26's main. Line numbers cited in this document are current ones.

Abbreviations for documents (all under `docs/`): [PHYSICS.md](../../PHYSICS.md), [VALIDATION.md](../../VALIDATION.md), [IMPLEMENTATION-STATUS.md](../../IMPLEMENTATION-STATUS.md) (written IS in the fleet tables), [SIXDOF-ACCEPTANCE.md](../../SIXDOF-ACCEPTANCE.md), [SIXDOF-VEHICLE-DATA.md](../../SIXDOF-VEHICLE-DATA.md), [audit-2026-10-01-flight-profile.md](../../history/audit-2026-10-01-flight-profile.md) (AUD in the fleet tables). Short names used in tables and lists throughout: V = `docs/VALIDATION.md`, P = `docs/PHYSICS.md`, IS = `docs/IMPLEMENTATION-STATUS.md`, AUD = the audit of 2026-10-01, VEH = `src/data/vehicles.ts`, PARTS = `src/data/parts.ts`, MIS = `src/physics/mission.ts`, ORB = `src/physics/orbital.ts`, STG = `src/physics/sim/staging.ts`, REF = `tests/validation/reference-data.ts`, FH = `tests/fleet-harness.ts`, FD = `tests/fleet-defaults.test.ts`; a number after a colon is a line.

## 2. How the modes are built

**One shared core.** The three levels in each section (Watch/Basics, Explore, Engineer) run the same physics code. The level changes which settings and readouts can be reached, not equations or constants. Statements of this in the code and documents: "The screens format the cores' output; none re-derives physics" (`docs/VALIDATION.md:3242`, Build); the Orbit level only filters the screen (Orbit report).

**Launch.**
- The switch is `MissionConfig.dynamics.model`, `'pointMass'` or `'sixDof'` (`src/types.ts:721`). `Simulation` builds the rigid-body runtime only for `'sixDof'`; with no `dynamics` it flies point mass (`src/physics/simulation.ts:216-218`).
- The app default is six-DOF, calm air, seed 20260919, for every catalogue vehicle (`defaultDynamics()`, `src/physics/rigid/config.ts:17-22`). The setup panel applies it when a mission is loaded or a vehicle is picked (`src/ui/panel.ts:521`, `:1321`).
- Six-DOF data exist for all 25 catalogue specs (`src/data/vehicles.ts:171`, `:886`, `:1061`). Falcon 9 and Soyuz-2.1a have dedicated data. The others come from id-keyed tables: 55 steering entries, 21 marked estimated (`src/physics/rigid/vehicle-data.ts:201-275`). A custom vehicle gets generic plus or minus 5 degree steering and generic thrusters (`vehicle-data.ts:284`, `:494-503`).
- Point mass is labelled "Point mass (legacy)" (`src/i18n/en.ts:14`). The regular fleet matrix and the default-suite Falcon 9 comparison fly it ([PHYSICS.md](../../PHYSICS.md) lines 82-84; [VALIDATION.md](../../VALIDATION.md) lines 88-89). A rocket handed over from Build flies point mass unless "Fly it in six-DOF (experimental)" is ticked (`src/design/build-handoff.ts:19-25`). Monte Carlo always flies six-DOF (`src/physics/monte-carlo.ts:54-59`).
- Labelled experimental: six-DOF for a rocket of one's own (`src/i18n/en.ts:2252`, `:2652`) and six-DOF booster recovery (`src/i18n/en.ts:89`).
- Slosh, bending and the notch are `dynamics.flex.slosh`, `.bending`, `.notch`: six-DOF only, off by default (`src/types.ts:742-745`). Navigation, faults, PEG/IGM and flex are absent from the default flight, so it is rigid, flies on the true state and uses the standard guidance.
- Watch is a live flight, not a recording. `startWatch` loads the mission's settings and calls `launch()` (`src/main.ts:984-989`); the session builds a `Simulation` and steps it (`src/session/core.ts:112`). Seeking afterwards interpolates frames recorded from that same flight (`src/physics/frame.ts:19-22`). Watch missions carry no dynamics settings, so they fly the default above (tests fly them "exactly as the app builds it", `tests/watch-missions-flights.ts:4-8`).
- Explore changes only the wind scenario (`src/ui/panel.ts:2434-2443`). Engineer adds the model choice, wind seed, flex, autopilot gains, navigation, control faults, PEG/IGM, a dispersed run and Monte Carlo (`src/ui/panel.ts:1005-1011`, `:2445-2466`).

**Orbit: three families that do not share code.**
1. Kepler's equation plus first-order secular J2 (rates of node, argument of perigee and mean anomaly only): the playground, ground track, repeat and sun-synchronous solvers, the maneuver planner, applications (`src/orbit/kepler.ts:122-131`).
2. SGP4/SDP4 on element sets, with TEME to ITRF: Real satellites, passes, close approaches (`src/orbit/sgp4.ts`, `src/orbit/earth-orientation.ts`).
3. The numerical propagator (mean-element method or Cowell): reachable only through the Orbit-lifetime dialog, the re-entry tool and Build (`src/physics/propagator/propagate.ts`).
- Basics (route `watch`) is a narrated tour with no panels (`src/ui/orbit/playground.ts:1199-1200`). Explore has the orbit sliders, J2 toggle, eight maneuver kinds (`src/orbit/maneuver-setup.ts:22`), every Real-satellites tool and the lifetime dialog with all six force toggles. Engineer adds inputs and readouts, not fidelity: a, e, M0, secular-rate, nodal-period and LTAN readouts (`playground.ts:1018-1037`, `:1225-1236`), the repeat-track solver (`:1050`), Lambert rendezvous and porkchop (`maneuver-setup.ts:23`), manual burns to plus or minus 5 km/s, link budget and optics (`src/ui/orbit/applications-panel.ts:71-108`), raw GP elements and the TEME state (`src/ui/orbit/sky-panel.ts:666-677`), miss components and per-pass timing uncertainty.

**Build.** All three levels use the same cores.
- Watch shows catalogue rockets with the budget core's ideal figures; no flight is run.
- Explore adds remix, the parts builder, warnings, computed ratings (point-mass probe flights) and the satellite designer (the same `designFigures` as the bench, fewer fields).
- Engineer adds the test stand, wind tunnel, readiness review, staging, sizing, the satellite bench (all fields, a lifetime run) and Start from requirements.

**Structure.** Depth selects tree tier 1, 2 or 3: "The depth changes what is shown, never the physical data" (`src/structure/types.ts:8-9`). The Soyuz ST31 model is descriptive geometry plus assembly order; it carries no mass and feeds no simulation. EduSat-3U is the only calculation: parts-list mass, centre of gravity, specification bounds and an energy balance. Its mass, size, drag area and orbit are handed to Orbit and Launch.

**Where the modes do not share one base.** Items 1 to 4 are those S20 §2 records; the rest come from the raw reports.

| # | Difference | Size or detail | Source |
|---|---|---|---|
| 1 | Launch places sites and measures air height on a sphere; passes, the propagator's density and the Vostok descent use WGS-84 | about 0.19 degrees or 21 km at Baikonur | S20 §2; summary |
| 2 | Point mass has no J2 under thrust (`pointMassAcceleration(..., useJ2=false)` at `src/physics/simulation.ts:1144`; true for coasts at `:1374`; six-DOF has J2 throughout, `src/physics/rigid/runtime.ts:581`) | about 8 m/s per 500 s | S20 §2 and the summary (an estimate by hand); the code references are the ascent report's |
| 3 | The atmosphere above 86 km is one model in Launch and another (NRLMSISE-00) in the lifetime tools | not sized | S20 §2; summary |
| 4 | The Sun's position comes from four separate models | the propagator's is 0.45 degrees from the of-date frame | S20 §2; Orbit report |
| 5 | Solar constant 1,361 W/m2 in Build power (`src/orbit/power.ts:59`); the propagator's radiation pressure `P_SUN = 4.56e-6` N/m2 (`src/physics/propagator/forces.ts:33`) is the older 1,367 W/m2 value (comment at `power.ts:55`) | 0.4 % (comment at `power.ts:56`) | Build report; the 0.4 % is the code comment's, read during consolidation |
| 6 | Orbit playground and Real-satellite readouts give geocentric latitude and height above a 6,378.137 km sphere (`src/orbit/real-sky.ts:72`); passes use the ellipsoid | up to 0.19 degrees; about 13 km low for the ISS at 51.6 degrees (by hand) | Orbit report |
| 7 | Orbit has one inertial frame (TEME taken as inertial) and UTC only; Launch runs in its own ECI; Apollo 11 uses a JPL DE441 Moon and Sun; the propagator uses an analytic Sun and Moon series (`src/physics/ephemeris-series.ts:28-58`) | not sized | Orbit and special-phase reports |
| 8 | Lambert is solved two-body but the plan is flown with the J2 toggle | see section 6 | Orbit report |
| 9 | Build's requirements table sizes power with a closed-form eclipse and the payload off in shadow; the bench samples the eclipse with every load on | THEOS-2: the table differs from the bench by 18.9 % (array) and 60.2 % (battery) (`docs/IMPLEMENTATION-STATUS.md:706`) | Build report |
| 10 | A flight started from Build is point mass unless six-DOF is ticked; Launch defaults to six-DOF | `src/design/build-handoff.ts:19-25` | Build and ascent reports |
| 11 | Launch's point-mass and six-DOF models differ on one flight | Falcon 9 to LEO: 43 m/s of Δv left, 5,415 against 5,458 ([PHYSICS.md](../../PHYSICS.md) lines 857-861) | Ascent report |
| 12 | A shooting corrector with J2, Clohessy-Wiltshire and LVLH code live in Launch's rendezvous files and are not imported by `src/orbit` | `src/physics/rendezvous/targeting.ts:6-10` | Orbit report |

## 3. Audited areas

One subsection per area, in this order: ascent dynamics core, launcher fleet, Orbit section, special phases and missions, Build and design models.

### 3.1 Ascent dynamics core (Launch section)

Basis of the report: commit aa582e9, read-only. Two Python recomputations over text were made (atmosphere formulas, engine Isp arithmetic). Entries called "docs" are the documents' recorded results.

| Model or feature | Class | Why (the evidence) | Where |
|---|---|---|---|
| Frames, Earth, gravity | B | Correct terms and constants (mu 3.986004418e14, J2 1.08262668e-3, rotation 7.2921159e-5 rad/s, GMST IAU 1982). Spherical Earth, J2 only, no J3+, no third body. Effect on ascent well under 1 %. Analytic checks only: energy drift under 1e-9 per revolution; J2 node rate within 5 % of the formula | `src/physics/constants.ts:7-15`; `src/physics/simulation.ts:1144`, `:1374`; `src/physics/rigid/runtime.ts:581` |
| Integration | A six-DOF plant; B point mass | Six-DOF: RK4 at 0.01 s or less in a fixed 0.01 s control tick; fourth-order fixture; missions at 0.01 against 0.005 s differ by at most 4.4e-5 m (Falcon 9) and 3.0e-3 m (Soyuz) (docs); gate under 10 m, 0.1 m/s, 0.1 degrees, 0.02 s. Point mass: fixed steps by regime (0.1 s below 100 km, 0.25 s above, 0.02 s near cut-off), Kepler when unpowered above 140 km, no convergence test, no error control; live equals headless bit for bit (docs) | `src/physics/simulation.ts:211-213`, `:690`, `:703`, `:728`, `:743-746`; `src/physics/rigid/integrator.ts:73-98` (moved); `tests/rigid-mission-convergence.test.ts:27-37` |
| Atmosphere | A to 86 km as a standard atmosphere; B above | USSA-1976, 7 layers to 86 km, exponential table 86 to 1,000 km. The agent's recomputation from the file's constants matches within 0.01 % at 10-86 km and is about -6 to +26 % at 100-300 km (reference values from memory, approximate above 86 km). One annual-mean atmosphere for every site and date; air co-rotates | `src/physics/atmosphere.ts:25-33`, `:38-39`, `:49` |
| Wind, gusts | D | Six-DOF only. "Crosswind": 8 m/s eastward at all heights plus a sine gust (2, 1, 0) m/s over 12 s. "Shear": adds (1.0, 0.5) m/s per km to 12 km, about 21 m/s aloft. No measured profile, jet stream, turbulence or design gust; the code calls them "scenarios, not measured weather". Point mass has no wind | `src/physics/rigid/runtime.ts:112-119` |
| Point-mass aerodynamics | C | Drag 0.5 rho v^2 Cd(M) A with one Cd(M) table (0.30; 0.64 at Mach 1.2; 0.22) for every launcher. No lift, moments, base, plume or Reynolds effects. No validation; tests check the curve's shape. Drag loss 100-200 m/s across the fleet (docs) | `src/physics/aero.ts:6-20` |
| Six-DOF aerodynamics | C, accuracy not determined | Axial: the same Cd(M) times cos^2 alpha. Normal: slender-body lift plus viscous crossflow, built per configuration from each vehicle's drawn layout (Allen and Perkins; Jorgensen). Rate damping -10 (pitch, yaw), -0.2 (roll). Body-of-revolution method applied to multi-body stacks; confidence flagged to 15 degrees. No tunnel or flight data; sign and energy checks and sweeps only | `src/physics/rigid/aero-tables.ts:174-246`, `:242`; `src/physics/rigid/mass.ts:262-291`; `src/physics/rigid/aero.ts:1` |
| Propulsion | C overall; the thrust law itself B | F(p) = F_vac - (F_vac - F_SL) p/p0, constant mass flow F_vac/(g0 Isp_vac). Start-up 1.0 s liquid, 0.3 s solid; tail-off tau 0.25 s and 1.0 s, cut at 5 tau; solids fly mean thrust times a linear regressive ramp. Impulse over propellant equals g0 Isp to 6 decimals at 10-500 ms steps. Throttled in air the pressure term is scaled too: +14 % for a Merlin at 40 % at sea level, +19 % for an RD-191 at 30 % at 2 km (docs). Tanks burn to empty (no residuals, mixture ratio, ullage, boil-off, thrust misalignment). 24 of 31 ground-lit engines deliver the quoted sea-level Isp within 1 %, worst 5 % (by hand). Flight: Falcon 9 MECO 4-10 % early; Electron stage 2 about 25 % short; Falcon Heavy cores 11-13 % early (docs) | `src/physics/vehicle.ts:102-107`, `:210-240`, `:308-313`, `:529-532`, `:829-831`; `tests/engine-transients.test.ts:65-72`; [PHYSICS.md](../../PHYSICS.md) lines 1173-1184 |
| Mass, CG, inertia | C | Mass, CG and full inertia tensor rebuilt at every RK stage: 75 % of dry mass a thin shell, 25 % an aft package; two liquid cylinders (0.9 R) settled; solid grain an annulus. Estimated distribution, no measured CG or inertia; stage masses are the "calibrated point-mass data set". Arithmetic repeated in an independent Python calculation (docs) | `src/physics/rigid/mass.ts:131-132` |
| Staging, fairing | C | Serial stages, strap-ons, Soyuz hot staging; fairing on a 1135 W/m2 heating placard or a published time; six-DOF separation by paired impulses (2 m/s assumed). No separation mechanisms, plume impingement or recontact. Partition fixtures conserve momentum (gate 1e-8, docs). Fairing times are inputs on several vehicles | see section 3 |
| Point-mass flight as a whole | C | No attitude dynamics; angle of attack up to 60 degrees allowed at low q. Falcon 9, five webcast flights: 49 of 66 rows inside tolerance (docs). T+60 s speed within 2-9 %, SECO speed 1-4 %; flight-path angle 4-20 degrees too steep to T+100 s, then 24-29 degrees at T+140 s against 30-58 degrees flown (docs). Per-vehicle kick, pitch rate, loft and throttle bucket are tuned | [VALIDATION.md](../../VALIDATION.md) lines 295-316, 577-601 |
| Six-DOF rigid body, actuators, attitude loop | C | Each chamber at its drawn position; gimbal travel per stage; 20 degrees/s and 0.1 s lag on every nozzle; 100 Hz cascade (gains 1.5 and 3 per second, the same for every vehicle) with aerodynamic feed-forward and a load-relief cone. Default autopilot reads true attitude, rate and aerodynamic moment; rigid structure. The acceptance file calls itself "not a claim of flight validation". 161 of 161 fleet cases reach their own target (docs). Falcon 9: 53 of 66 rows (docs); mean flight-path-angle error 5.3 degrees on fit flights, 12.5 degrees on held-out flights (docs). Fitted to the flights it is compared with; the held-out check is weak | `src/physics/rigid/runtime.ts:90-93`, `:490`; `src/physics/rigid/vehicle-data.ts:378`, `:428`; [SIXDOF-ACCEPTANCE.md](../../SIXDOF-ACCEPTANCE.md) line 39 |
| Flexible vehicle (option, off) | C | First lateral slosh mode per tank (zeta 3 %), first free-free bending mode of a 40-element beam (zeta 0.5 %), IMU on the bent structure, shell stress against 250 MPa, notch plus bandwidth cap. Uniform-beam frequency within 0.1 %; momentum and energy to 1e-7 (docs). No modal-survey data; stiffness, damping and allowable estimated | `src/physics/rigid/slosh.ts:28`; `bending.ts:27`; `flex.ts:53` |
| Standard ascent guidance | C | Vertical rise, kick, zero-alpha gravity turn with pitch-rate floor, or stored pitch programme (Soyuz-2, Saturn V AS-506); linear-tangent closed loop blended in from 12 to 4 kPa; throttle bucket, load relief 95 % to 40 %, g-limit; reads the true state. "Not the flight software of any real vehicle". Fleet acceptance: own target within max(10 km, 2 %) apsis and 0.3 degrees (126 accepted rows; 161 six-DOF cases, docs). Per-vehicle numbers tuned until each reaches orbit, so that result is by construction; path shape 4-20 degrees off flight | `src/physics/guidance.ts:67`, `:76`, `:169-170`, `:365` |
| PEG and IGM (option) | B | Reduced forms of the published laws; exact knowledge of thrust and mass. Vacuum test: 199.6 x 200.7 km (PEG), 200.0 x 202.0 km (IGM) on 200 x 200 km; 32 of 32 fleet cases (docs). No independent implementation or flight comparison | `src/physics/explicit-guidance.ts:52-65` |
| Navigation (option, off) | B for model form | IMU with bias, Gauss-Markov (tau 300 s), scale factor, noise; three grades; 27-state error-state filter; GNSS 5 m, 0.05 m/s, 1 Hz; star tracker 10 arcsec above 150 km. Self-consistency (error/sigma)^2 0.78-1.20. Falcon 9 unaided SECO error 84 m, 0.98 km, 9.3 km by grade (docs). Grade figures are "textbook orders of magnitude"; agreement with hardware not determined | `src/physics/nav/sensors.ts:36-44`, `:71-74` |
| Break-up limits, control faults | D | Every flight is lost above 1.15 x max-q; six-DOF also above q-alpha 300 kPa-degrees. Thresholds assumed; no structural model. Accident re-creations only (e.g. Ariane 501 on Ariane 6) | `src/physics/sim/ascent.ts:535`; `src/physics/rigid/faults.ts:60` |
| Monte Carlo dispersions | C as a method; D as vehicle statistics | Per stage and strap-on group: thrust 1 %, Isp 0.3 %, propellant 0.5 %, dry mass 0.5 %; density 5 %; steady wind 5 m/s per axis; Gaussian clipped at 3 sigma; six-DOF only. Sigmas are "the minimal set agreed with the owner"; wind constant with height; no operator data. Falcon 9: 4 of 40 runs lost at the q placard; Soyuz-2.1b: 6 of 30 lost; three of six recorded issues "not yet understood" (docs) | `src/physics/dispersion.ts:31-43`, `:49`, `:172-180`; [PHYSICS.md](../../PHYSICS.md) lines 977-1009 |

Plan S20 §4 lists the thrust law as "exact at full throttle, 14-19 % high when throttled in air" and gives it no class; the report's B is for the law itself at full throttle.

**Findings, most important first.**

1. **Steering and throttle are a generic law with tuned per-vehicle numbers.** Against five Falcon 9 webcasts: MECO 4-10 % early with published masses; T+100 s speed 14-22 % high on three flights (before the mass change); flight-path angle 4-20 degrees too steep from T+40 to T+100 s in both models; point mass then dives to 24-29 degrees at T+140 s against 30-58 degrees flown. Fitting the six-DOF kick cut the mean angle error from 10.1 to 5.3 degrees, and from 14.8 to 12.5 degrees on held-out flights. Evidence: [VALIDATION.md](../../VALIDATION.md) lines 295-316, 577-601, 621-628; [PHYSICS.md](../../PHYSICS.md) lines 3005-3006.
2. **Six-DOF vehicle data are unvalidated estimates.** Mass distribution is a 75/25 split; aerodynamics are "low-order"; every nozzle moves at 20 degrees/s with 0.1 s lag. The dossier found no public mass-property, servo, RCS or aerodynamic-derivative data ([SIXDOF-VEHICLE-DATA.md](../../SIXDOF-VEHICLE-DATA.md) line 16), and its results "verify the implemented model, not real-flight accuracy" ([SIXDOF-ACCEPTANCE.md](../../SIXDOF-ACCEPTANCE.md) line 39). Error size: not determined.
3. **The default autopilot is idealised.** It reads the true state, feeds forward the exact aerodynamic moment and uses one gain set for every vehicle on a rigid structure. With bending on and no filter, Falcon 9 breaks up at T+7 s; the rigid loop "runs three times faster" than classical launchers ([PHYSICS.md](../../PHYSICS.md) lines 177-181, 189-192). A nominal Falcon 9 shows a 15 degree command jump at load-relief release and a 37.5 degree peak attitude error (lines 847-848, 859-860).
4. **Day-of-launch environment.** The default is calm standard air at every site; the wind scenarios are synthetic, at most about 21 m/s. Yet with a 5 m/s steady wind (1 sigma) and 5 % density, 4 of 40 Falcon 9 runs exceed the q placard and 6 of 30 Soyuz-2.1b runs are lost ([PHYSICS.md](../../PHYSICS.md) lines 977-1004), so wind margins are not representative.
5. **Propulsion detail.** Throttling in air overstates thrust by 14-19 % (lines 1173-1184); solids are a linear ramp; transients are generic; tanks burn to empty. Data are "public figures rounded to about plus or minus 10 %"; recorded misses include Electron stage 2 about 25 % short and PSLV-XL's first stage 29 % slow at separation (lines 3007, 3029-3033).
6. **One drag curve for every launcher**, also the six-DOF axial coefficient. With drag losses of 100-200 m/s ([PHYSICS.md](../../PHYSICS.md) lines 1374-1375), a 30 % coefficient error is 30-60 m/s (by hand).
7. **Point-mass specifics.** No J2 in powered flight; Kepler coasts without J2 or drag (`src/physics/simulation.ts:1094`, `:1140`); a fixed step schedule. Cutting steps to animation frames moved insertion orbits by up to 2.7 km and Electron's SECO perigee by 15-21 km ([PHYSICS.md](../../PHYSICS.md) lines 1051-1058).
8. **Monte Carlo inputs are assumed** (see table).

### 3.2 Launcher fleet against real flights

Method (five lines of the fleet report).

1. **What is compared.** Event times, altitude and speed at events, Falcon 9's trace at T+60, 100 and 140 s, and Soyuz's insertion apsides. Speed is graded only where the source states its frame (Falcon 9 Earth-relative, PSLV inertial). Payload capacity is judged separately, in the fleet matrix. Each reference flight is flown point mass (regular suite) and six-DOF (heavy suite); disagreeing rows are pinned by name ([VALIDATION.md](../../VALIDATION.md) lines 59-70, 86-93).
2. **Sources.** One telemetry set (Falcon 9 webcasts, third-party frame transcription), two as-flown timelines (Soyuz MS-25 via RussianSpaceWeb, H-IIA F50), nine planned press-kit or brochure timelines, and user's manuals for Soyuz. The "published" callouts of [PHYSICS.md](../../PHYSICS.md) §6a carry no source.
3. **Tolerances, fixed beforehand.** Time 10 % (at least 3 s), speed 10 % plus 5 m/s, altitude 15 % plus 1 km (`tests/validation/reference-data.ts:153-157`). PHYSICS.md §6a asserts a band of 8-10 s around the model's own value, not the published one (lines 1793-1798). The fleet gate is max(10 km, 2 %) per apsis, 0.3 degrees inclination, 1.5 degrees RAAN, and max(15 km, 5 %) on a transfer perigee (`tests/fleet-harness.ts:50-55`).
4. **The "Fitted and derived values" register** ([VALIDATION.md](../../VALIDATION.md) lines 99-131). Fitted means solved against a target, which then cannot be a check. Construction means chosen so an event lands on a published time. Derived is arithmetic on published figures. Estimate has no source.
5. **Adjusted to a flight:** Falcon 9's six-DOF kick, 3.5 degrees, on three flights' flight-path angles (two held out); Soyuz-2.1a's pitch-programme scalars, to 79, 157 and 143 km, plus hand-set shape values, the strap-on cut-off time and the fairing floor; eight fairing clocks, and solid motors' mean thrust and separation delays, set from published times; Falcon 9/Heavy's 22 kPa bucket, kept by selection on the same flights; Sputnik's core load, set to reach its orbit. Per-vehicle kick, loft and pitch limits are tuned on the model's own matrix, not on flights, and are not in the register.

Legend: V = `docs/VALIDATION.md`, P = `docs/PHYSICS.md`, IS = `docs/IMPLEMENTATION-STATUS.md`, AUD = `docs/history/audit-2026-10-01-flight-profile.md`, VEH = `src/data/vehicles.ts`, PARTS = `src/data/parts.ts`, MIS = `src/physics/mission.ts`, ORB = `src/physics/orbital.ts`, STG = `src/physics/sim/staging.ts`, REF = `tests/validation/reference-data.ts`, FH = `tests/fleet-harness.ts`, FD = `tests/fleet-defaults.test.ts`. The 21 entries are those of `VEHICLES` (VEH:172-818). "PM / 6DOF" = point mass / six-DOF. n/m = rows inside tolerance. "Fitted?" says fitted or by construction (F) or held out (H). The report: no vehicle reaches A; the domain overall is C.

| Vehicle | Compared with | Measured agreement | Fitted or held out | Class |
|---|---|---|---|---|
| Soyuz-2.1a | Soyuz MS-25 as-flown times with nominal heights; Progress MS-19 nominal cyclogram; manuals | 23/23 rows. Times 0-1 % (inputs). Heights 79.0 / 157.0 / 143.0 km six-DOF (fit targets); PM -1.5 / -2.5 / -3.1 %. Held out: SECO +0.5 s; speeds at strap-on separation and fairing inside 1.64-1.75 and 1.90-1.93 km/s; max Q T+63 against 65 s, 37.2 against 36.3 kPa; lift-off 306.8 t, 1.39 g in band; fairing impact 490 against about 500 km (V:804-819). Misses: core impact -11 %; core-separation speed 3.85 against 3.65-3.8 km/s; Progress heights +9 / +8 %; no matrix row accepted. Build rating 7,021 against 7,430 kg (-5.5 %) | F: 3 fitted scalars, 4 hand-set shape values, strap-on cut-off 117.45 s, fairing floor, cut-off, hot-staging and fairing clocks are inputs (V:110-123). H: the rest | B (low): published propulsion closed on gross mass; held-out set mostly within 1-5 %. References are nominal, not measured; held-out speeds and impacts are not pinned in the two Soyuz tests |
| Soyuz-2.1b | None for a flight. Rests on 2.1a's stages and programme (unfitted) and a typical GTO profile | Heights +9 / +4 % and +6 / -2 %; speeds -1 to -4 % (V:819, document only). LEO capacity 58-63 % of published | core cut-off derived; fairing 208.4 s clock | not determined; C at most |
| Proton-M | ILS Telstar 14R overview (planned), times only | 4/5: staging -5 / +1 / -1 %, fairing -1 %, max Q -16 %. Staging heights +23 to +35 % against RussianSpaceWeb, untested (AUD:380). LEO capacity 25 % | fairing = stage-3 ignition + 10 s; published loads adopted after a shortfall | C: clock only; the repo's own audit calls the trajectory lofted |
| Angara-A5 | RussianSpaceWeb planned timeline, flight 2 (secondary), times only | 8/8 within 3 %. No state data. LEO/SSO capacity 28-34 % | fairing = URM-2 ignition + 9 s; six-DOF kick 8 degrees by Δv sweep | C: clock only |
| Falcon 9 | Webcast telemetry of 5 flights, 2018-19 (as flown; whole km, km/h) | PM 50/66, 6DOF 55/66 (pins). T+60 s speed -1 to -11 %, altitude +4 to +8 %; MECO -4 to -10 %; SECO-1 time 0 to -7 %, speed ±1-3 %. Misses: max Q -7 to -33 %; T+100 s speed up to +16 %; MECO speed -23 % (Bangabandhu-1, PM); SECO altitude -3 to +55 %; path 4-20 degrees steep to T+100 s. Build rating 20,031 against 22,800 kg LEO (-12.1 %), 6,832 against 8,300 kg GTO (-17.7 %) | F: six-DOF kick (held-out angle error 14.8 to 12.5 degrees); bucket by selection; S1 masses replaced by published ones after the miss | C: the only flight telemetry; systematic 5-20 % misses; the fit barely transfers |
| Falcon Heavy | SpaceX planned timeline via Spaceflight Now, times only | 1/8: BECO -11 %, MECO -13 %, max Q -30 %, fairing -17 / -33 %; SECO -3 %. Every first-stage event outside tolerance | Falcon 9 masses; bucket from the Demo-1 webcast | C (low) |
| Atlas V 551 | ULA Juno booklet, 2011 (planned), times only | 5/6: max Q -10 %, SRB -7 %, BECO -6 %; fairing -24 / -26 %. Reference hardware 13 t apart at lift-off (AUD:293) | six-DOF kick 8 degrees; bucket 22 kPa / 60 % uncited; SRB delay clock-fitted | C |
| Vulcan VC4 | None. Guidance tuned on its own matrix rows | Matrix rows pass; 93-101 % of LEO rating, GTO above 115 %. Parks at about 137 x 1,200 km against a 250 x 500 km plan (IS:291) | kick 3 degrees, pitch 40 degrees, loft 150 km, parking 250 km | not determined |
| Ariane 64 | Arianespace kit VA267 (planned), 4 times and 4 altitudes | PM 8/8, 6DOF 7/8. Times -3 to -5 %; altitudes PM 0 / +1 / -13 / -13 %, 6DOF +16 / +25 / +12 / +12 %. PM altitude match attributed to compensating data errors (AUD:473). Build rating 26,274 against 21,600 kg (+21.6 %) LEO, 13,328 against 11,500 kg (+15.9 %) GTO | fairing 200 s clock; P120C mean thrust from the published burn time | C |
| Vega-C | Arianespace/Avio kit VV25 (planned), 4 times | 1/4: P120C -4 %; Z40 -15 %, Z9 -17 %, fairing -28 %. AVUM+ lights at T+49 min, in reality about a minute after Z9 (P:1965). Build rating 4,330 against 3,300 kg LEO (+31.2 %, outside the +/-25 % bound) | fairing 220 s clock; solids from burn times | C (low); D above stage 1 |
| Long March 2D | None (uncited callout: cut-off 155.2 against about 160 s) | No matrix row accepted; dedicated SSO mission, the satellite raising its own perigee; direct insertion closes only below about 300 km. Build rating 3,165 against 3,500 kg (-9.6 %) | fairing 220 s clock | not determined |
| Long March 3B/E | None (uncited callouts within 1 %; burn times are inputs) | LEO and GTO rows pass | fairing 215 s clock | not determined |
| H-IIA 202 | JAXA/MHI results, F50 (as flown), 6 times | 4/6: MECO -2 %; SRB separation -14 %, SECO -17 %. F50 flew a longer-burn SRB and a direct lofted insertion (AUD:619) | fairing 250 s clock; SRB delay 8 s; kick tuned on matrix | C |
| Long March 5 | None, no timeline | Matrix rows pass | none | not determined |
| H3-22 | JAXA launch plan, F3 (planned), times and altitudes | PM 7/12, 6DOF 5/12. SRB -6 %, MECO +5 %; altitude -38 to -51 % from MECO; SECO -30 %. Flat first stage; parks at 200 km against a direct 613 km | kick "matches the published SRB separation time" (VEH:683) | C clock, D profile |
| PSLV-XL | ISRO brochure C52 (planned), times, altitudes, inertial speeds | 11/22. Staging within 2 % to PS2 separation; stage-1 altitude +20 to +43 %, speed -5 to -35 %; PS4 cut-off altitude -63 / -52 %. Flown on 191 degrees against the real 140 degrees (gap 7) | none to flight | D profile, C clock |
| Electron | Rocket Lab press kit (planned), 6 times | PM 4/6, 6DOF 3/6. MECO -4 %; SECO -18 %; second-stage burn 298 against 387 s. Build rating 315 against 300 kg (+5.0 %) | none; stage loads uncited | C |
| Starship | None for the ascent; data uncited | LEO rows pass; GTO 79 % | reserves set by "least that lands" | not determined |
| Sputnik 8K71PS | Sputnik-1's orbit and two times | 214.8 x 937 against 215 x 939 km; strap-on separation 117 +/- 5 s | F: orbit is the target; 90 t core load "puts it on the orbit" (VEH:747) | C, capped: fitted to its only datum |
| Vostok-K | Vostok-1's orbit | 180.9 x 324 against 181 x 327 km; six-DOF verdict "off target" (343 km apex) | F: orbit is the target; fairing 156 s clock | C, capped |
| Saturn V (fleet) | Apollo 11 record | S-IC cut-off 162 +/- 5 s; parking 207 against 186 km; escape tower not modelled | none | C |

Other fleet comparisons from the special-phases report: MS-16, MS-25, ORBCOMM-2, Angara-A5 1L, Hayabusa2 and Demo-2 fly the real second, site and mass on fleet vehicles (stand-ins with the model's own burn plans). Event differences run from +7 s (Soyuz) to -185 s (Dragon separation), test band max(60 s, 30 %); class C, not fitted. Mercury-Redstone 3 and Sputnik 1 are in section 3.4.

Plan S20 §4 lists "the other seventeen launchers" as C or D; the six vehicles with no flight comparison are Soyuz-2.1b, Vulcan, Long March 2D (no flight), Long March 3B/E, Long March 5 and Starship (ascent) (the summary: "6 of 21").

**Fleet acceptance, sequencing, launch geometry.**

- **Matrix.** Each vehicle flies from its first site to 500 km LEO, the ISS plane (where the corridor allows), 600 km SSO and GTO, at 25, 50 and 90 % of the published rating for that orbit, carried inert, on default guidance (FH:24, 125-129, 152-167). The ratings are mostly quoted for about 200 km, not the presets' 420-600 km (P:2231).
- **Counts differ between document and harness.** The documents give 195 combinations: 126 pass, 69 are excluded (33 range safety, 23 capability, 13 architecture, 0 guidance defects) (P:2008, 2183-2185; IS:313-317). The harness now iterates all 21 vehicles (FH:154); the fleet agent counts 222 combinations, 131 pass, 91 excluded (by reading, not executed). `BEYOND_CAPABILITY` holds 24 keys and `ARCHITECTURE` 25 (FH:368-467). P:2008-2011 (45 / 150 / 111 / 39) contradicts its own table.
- **Capacity** (largest accepted payload over published, P:2086-2103): Proton 25 %, Angara 28-34 %, PSLV 43-74 %, Soyuz-2.1b 58-63 %, Falcon Heavy 68-72 %, Falcon 9 75-79 %, Atlas V 82-90 %, H-IIA 90-105 %, Vulcan 93-101 %; Ariane 64, Vega-C and H3 reach the 115 % search ceiling. Rated to the published orbit in Build, six vehicles give 0.82-1.31 (V:3079-3090). The Falcon 9 and Falcon Heavy rows predate their mass change (P:2086-2106).
- **Exclusions.** SSO from Baikonur, the Cape, Xichang, Wenchang, Sriharikota and Starbase (heading more than 5 degrees outside the window). Most 90 % rows of Falcon 9, Falcon Heavy, PSLV and Long March 2D. Proton and Angara LEO at 50 and 90 % (Briz-M always aboard). Every Soyuz-2.1a and Long March 2D row (no restart).
- **Insertion accuracy.** Circular orbits within about 3 km. GTO apogee within tens of km, plane 0.1 degrees, perigee -13 to +11 km, where real injections hold a few km (P:2366-2386).

| Scripted (clock or fixed delay) | Emergent (state-triggered) |
|---|---|
| Soyuz-2: strap-on step and cut-off, core cut-off, hot-staging lead, stored pitch table to T+287.7 s (VEH:60, 94-96, 222-230) | Cut-off by propellant depletion, less a recovery reserve, on every other stage |
| Fairing clock on 8 vehicles; ignition + 9/10 s on Proton and Angara (STG:291-295) | Fairing on 0.5 rho v^3 below 1,135 W/m2 for the rest (STG:296-299) |
| Separation and ignition delays on every stage (STG:252-253); PSLV air-lit pair at T+25 s | Max Q; throttle bucket and load relief on q; g-limit |
| Kick angle, turn rate, loft per vehicle | Closed-loop hand-over as q falls from 12 to 4 kPa; SECO on periapsis and apoapsis gates |
| Parking altitude by rule: 200 km, 250 km for GTO and Vulcan, 200 x 242 km crewed | Burns planned and re-planned from the achieved orbit, at apsides and nodes |

**Launch geometry.**
- Modelled: azimuth sin(beta) = cos(i)/cos(phi) with a rotating-frame correction (ORB:294-312); heading chosen from each site's azimuth window; a dogleg of up to 5 degrees flown from the window's edge (MIS:322, 358-375); RAAN from spherical trigonometry; windows one instant per sidereal day, LTAN from a low-precision Sun, SSO inclination from first-order J2 (MIS:1208-1240).
- Approximated: spherical Earth; a 200 s lead for when the plane is set (MIS:720; measured residual under 0.11 degrees, P:2452); the ISS plane is RAAN 200 degrees at 2026-01-01 plus the J2 rate, except within 10 days of three anchored launches (MIS:155-185); windows have no duration; doglegs over 5 degrees are not flown, yet an unlicensed heading still flies if asked (MIS:374).
- Check (the fleet report calls it independent; the special-phases report and section 4 say the node is arranged from these same three anchors, so it is not held out): near the three anchors the computed window falls within 180 s of the real lift-off (`tests/watch-missions.test.ts:70-74`).

**Findings, most important first.**

| # | Gap | Size | Evidence |
|---|---|---|---|
| 1 | Generic ascent shape: one kick, a gravity turn, then closed loop, per vehicle; a stored programme only on Soyuz-2 | Where state points exist: PSLV stage-1 altitude +20 to +43 %; H3 altitude -38 to -51 %; Falcon 9 path 4-20 degrees steep; Proton staging heights +23 to +35 %; fleet ascent losses 1,684-2,633 m/s | V:1195-1217, 1344-1379, 549-599; AUD:380; P:1566 |
| 2 | Thin evidence: flight-measured trajectory for 1 vehicle; nominal heights for 1 (then used as fit targets); planned state points for 3, one flight each; times only for 6; nothing for 6; 3 historical judged on the orbit they are aimed at. The 10-15 % tolerances make a pass class C at most | | V:24-33, 72-80, 1166-1167; IS:777-793 |
| 3 | Clocks short where throttle schedules and coasts are absent | First-stage cut-off: Falcon 9 -4 to -10 %, Falcon Heavy -11 to -13 %, Electron -4 % (-9 % on published data). Upper stages: Electron burn -23 %; SECO H3 -30 %, H-IIA -17 %; Vega-C -15 to -17 %. Max Q 7-33 % early on five vehicles | V:407-409, 715-727, 1319-1342, 1449-1455; AUD:545 |
| 4 | One mission template | Fixed parking orbit: SECO altitude +9 to +55 % (Falcon 9), -52 to -67 % (PSLV, H3). Kick stages always aboard: LEO capacity 25-63 %. No direct insertion above 300 km. Placard fairing 17-33 % early on Atlas V and Falcon Heavy | V:335-337, 1217, 1382-1447; P:1558, 2233; FH:449-467 |
| 5 | Agreement that is not evidence | See section 4 | V:655-661; VEH:11-27; AUD:293, 473, 619, 737-742; PARTS:655 |
| 6 | Payload capacity | 25 % to above 115 % of published on unlike orbits; 0.82-1.31 like for like | P:2086-2106; V:3079-3090 |
| 7 | PSLV graded in inertial speed on another heading | The model flies 191.0 degrees, the direct heading its own corridor does not license; the brochure gives 140 degrees. By the fleet agent's estimate 180-300 m/s of the 631 m/s shortfall at PS1 separation is heading; the Earth-relative shortfall is about -20 %, not -29 %. F12 does not mention it | MIS:374, 1033-1034, 1153-1155; V:1344-1347; ISRO brochure p. 2 |
| 8 | Launch windows are schematic | The ISS plane is a placeholder outside three dates; windows are instants; spherical Earth; 5 degree dogleg limit | MIS:155-185, 322, 720; P:3009 |

Where the reports differ: the ascent report cites the documents' "49 of 66" Falcon 9 point-mass rows and "53 of 66" six-DOF rows; the fleet report finds 50 (16 pinned rows, `tests/validation/falcon9-webcast.test.ts:22-30`) and 55 (11 pinned rows, `tests/heavy/validation-falcon9.test.ts:20-28`). The T+100 s speed error is "14-22 % high on three flights (before the mass change)" in the ascent report and "up to +16 %" in the fleet report.

### 3.3 The Orbit section

Figures marked [R] were recomputed independently in Python by the Orbit agent from the published formula or the bundled data. Every other agreement figure is the documents' or tests' assertion as written.

| Model or feature | Class | Why (the evidence) | Where |
|---|---|---|---|
| O01 playground, ground track, repeat and sun-synchronous solvers | B | Kepler plus first-order secular J2 of node, perigee, mean anomaly only. Published GEO, GPS, Landsat WRS-2 and Sentinel-2 orbits: semi-major axis within 0.5 km, inclination 0.02-0.08 degrees low. [R]: 42,164.17 km; 7,077.72 km, 98.186 degrees, 5,933.047 s; SSO 97.79 degrees at 600 km. No short-period J2, J3+, drag, Sun, Moon; ground point geocentric on a sphere | `src/orbit/kepler.ts:122-131`, `:214`, `:309-322`; [VALIDATION.md](../../VALIDATION.md) lines 1472-1485 |
| O02 maneuver planner | B | Impulsive Hohmann, bi-elliptic, node plane change, apogee circularise (1-6 burns), phasing, deorbit, up to 5 manual nodes, Edelbaum; Engineer: Lambert and a 64x48 porkchop. Vallado 6-1, 6-2, 7-5 and Curtis 5.2 to 1e-5 to 1e-3 km/s; closed forms 1e-9. [R]: Hohmann 3.935224 km/s, 5.256713 h; GTO to GEO 1.833 km/s. No finite burns or gravity loss; Lambert under one revolution, prograde, null for collinear endpoints; UI target is a circle in the chaser's plane; Edelbaum needs e up to 0.01, constant acceleration | `src/orbit/maneuvers.ts:439`, `:511-528`; `src/orbit/maneuver-setup.ts:98-101` |
| O03 continue in orbit | B | Flight state to orbit; rocket-equation budget against the craft's own propellant; one recorded Soyuz hand-off exact. A burn over 0.1 orbit is only flagged | `src/ui/orbit/maneuver-panel.ts:357` |
| O04 applications | B | GEO look angles on WGS-84; spherical footprint; delay; C/N0; swath, GSD, reach, track spacing. Spherical closed forms 0.2 degrees, single link terms 0.1 dB, THEOS repeat cycle. [R]: 59.88 / 239.5 degrees Bangkok to 78.5 E; 195.6 dB; 822.4 km, 98.70 degrees. Every non-free-space loss is one user number; Thai satellites on their catalogue orbit of 2026-09-26. The published-calculator and full textbook-budget checks planned at `docs/ROADMAP-PART2-3.md:116` are not in the tests | `src/orbit/applications.ts:90-95`, `:197-215` |
| R01 SGP4/SDP4 and TEME to ITRF | A | Port of Vallado et al. AIAA 2006-6753 (2020 revision), WGS-72, improved mode; GMST-82 of UT1 plus polar motion from bundled IERS finals2000A. 33 sets, 666 state lines: worst 1.2e-7 km (bound 2e-7); seven error cases exact; Appendix C example 71 mm. [R]: 0.071 m; 16.4 m without the pole; 262 m with UTC. Accuracy to reality is the element sets': 0.1-0.5 km 1 sigma at epoch, about 1.5 km/day growth. No TEME to GCRF/J2000 | `src/orbit/sgp4.ts:1048-1057`; `src/orbit/earth-orientation.ts:77-83`; `tests/sgp4.test.ts:107-108`, `:116`, `:135-137` |
| R02 catalogue | not a physics model | CelesTrak GP sets; TLE/2LE/3LE, OMM JSON/CSV/XML/KVN, Alpha-5; bundled snapshot of 2026-09-26; default data mode offline. One set in six formats gives identical results, 10 m after a day | `src/provider/data-mode.ts:15` |
| R03 passes | A geometry and timing; C brightness | SGP4 to ITRF to WGS-84 az/el; golden section and bisection to 1 ms; cylinder shadow; Saemundsson refraction; McCants magnitude. Skyfield 1.55 (own frames, DE421; same SGP4 theory), 249 events: 0.34 s, 0.005 degrees, 53 m (asserted bounds 2 s, 0.02 degrees, 1 km); refraction 0.066 arcmin; brightness held to its convention only. No penumbra; no flares | `src/orbit/passes.ts:89`, `:214`; `tests/passes.test.ts:77-80` |
| R04 uncertainty | D | Flohrer 2008 sigma(R,T,N) by orbit class plus 1.5 km/day along-track. Symmetric, unbiased, the same growth for every orbit; a catalogue statistic, not the object's covariance. Matched only to its own source tables; the epoch band "may be narrow by a factor of two or three" | `src/orbit/uncertainty.ts:31-49`, `:115`; [VALIDATION.md](../../VALIDATION.md) line 1784 |
| P07/R05 lifetime, mean elements | C | J2 secular rates plus orbit-averaged drag (24 or 24+12 points), steps 5 days or less; NRLMSISE-00 with previous-day F10.7, 81-day mean, daily Ap; GFZ, SWPC, forecast, then mean of cycles 19-24. Seven spheres 1999-2010: -23.2 to +1.5 %, six early by 8-23 %, mean -16 %. NRLMSISE-00 port: 17 cases to 2e-6, 400 Fortran points to 1e-4. Sun, Moon, SRP, J3/J4 toggles ignored; storm (3-hour ap) mode unused; start state's osculating elements taken as mean; C_D 2.2 and a class area | `src/physics/propagator/propagate.ts:211-291`, `:253`; `tests/activity.test.ts:249`; `tests/msis.test.ts:58`, `:89` |
| P07 Cowell | C for lifetime; state accuracy not determined | Central term, J2-J4 zonals, NRLMSISE-00 drag, Sun and Moon (Montenbruck-Gill low-precision series), cannonball SRP; Dormand-Prince 5(4), tolerance 1e-9 in the page (default 1e-10). Potential gradient checked; J2 nodal rate 0.1 %; force-free a within 1 m over 5 days; GEO inclination rate accepted anywhere in 0.6-1.2 degrees/yr; against the mean method +/-25 %; eight transfer-orbit stages: five within 25 %. No tesseral or sectoral terms, tides, relativity, penumbra; Sun and Moon in the J2000 equinox against of-date states (0.45 degrees); UTC as ephemeris time | `src/physics/propagator/propagate.ts:160-182`; `src/physics/propagator/forces.ts:28-29`, `:60-136`; `tests/propagator.test.ts:150-151`, `:172-173` |
| M03 re-entry | C | Perigee under 700 km: mean method; e of 0.1 or more: Cowell from SGP4's state; window +/-20 % of the time left. Long March 5B x4: +1.1, -4.1, +16.6, +6.8 %; 66 stages from a first set: 33 inside, median 19 %; B from two sets, 100 objects of 1985-2004: 81 / 85 / 79 inside at 30 / 10 / 5 days, median absolute error 6.6-8.9 %; eccentric 0 of 9 at 5 and 10 days. The two-set fit gives no B once an eccentric orbit's mean perigee is under 120 km | `src/orbit/reentry.ts:62-101`; `src/orbit/ballistic.ts:47-111`; `tests/ballistic.test.ts:119`; `tests/heavy/reentry-agencies.test.ts:34`, `:67` |
| M01 close approaches | A Pc from a CDM; B screening geometry; D Pc from element sets | SGP4 for both objects; 2-D Foster Pc; CDM KVN reader. Filtered against full search, 108 runs identical; NASA CARA 11 Alfano cases + Omitron 1: at most 0.12 % and 0.0003 %; Iridium 33-Cosmos 2251 published 2.6e-51, [R] 2.66e-51, 226.3 m, 11.65 km/s, 102.5 degrees. 2-D only; position covariance only; no external screening reproduced; CARA bound set after the first run | `src/orbit/conjunction.ts:211-258`; `src/orbit/cdm.ts:112-113`; `tests/cdm.test.ts:42`, `:52` |
| M02 overflights | B | R03 passes of the imaging group plus off-nadir, side, incidence, local mean solar time; published swath and pointing limits for 95 satellites. Published descending-node times 10:08-10:32 against 10:12 and 10:30; swath from field of view within 2 % (two later entries +4.4 and +5.4 %). Judged at the highest point only; tasking and cloud not modelled | |

Accuracy statements, verbatim from `docs/VALIDATION.md`: line 2432, "33 of 66: 29 of 58 near-circular orbits, 4 of 8 transfer orbits" (GCAT's dry mass and size, a tumbling cylinder, C_D 2.2); lines 2491-2492, "half the stages come down inside the window, whichever way the drag is had; the median error of the time left is 19 %"; line 2593, "5 days | 79 of 100 | >= 80 %: **missed**"; lines 2597-2598, "Two criteria met, one missed by one object. At 5 days 79 of 100 came down inside, against the 80 fixed."; lines 1863-1864, "Six of the seven are still early, by 8 to 23 % (-16 % on average, as with R05's averages)". "Inside the window" means an error of the time left between -16.7 % and +25 % (lines 2586-2587).

S20 §4 agrees with these classes (playground B, planner B, lifetime C, uncertainty D, SGP4 A, numerical propagator C and "never checked at state level"). The summary gives close approaches and passes "A" together; the raw report splits M01 into A, B and D as in the table.

**Against a GMAT / Orekit / STK-class tool** (section 7 repeats the absent items as a list).

| Capability | Status | Evidence |
|---|---|---|
| Numerical propagation with selectable forces | Partial | Only in the Orbit-lifetime dialog: six toggles, mean or Cowell, horizons 30 days to 25 years, mass, area, C_D, C_R (`src/ui/lifetime.ts:34`, `:52`, `:98-101`, `:282-288`). Output is perigee/apogee/i/e charts and a lifetime (`:323-346`); samples are elements, not states (`propagate.ts:42-63`). Also used inside the re-entry tool and Build. Not available to the playground, planner, coverage or SGP4 tools |
| Gravity field degree and order | Absent | Zonals J2-J4 only (`forces.ts:28-29`, `:60-87`) |
| Atmosphere and space-weather choice | Partial | NRLMSISE-00 only; measured/forecast or ECSS low/moderate/high (`lifetime.ts:38`; F10.7 65/140/250, Ap 0/15/45, `src/physics/propagator/activity.ts:55-59`) |
| Finite burns | Absent | "Burns are impulsive: no finite-burn or gravity losses" (VALIDATION.md line 1514); Edelbaum's analytic spiral is the only continuous thrust (`maneuvers.ts:439`) |
| Targeting / differential correction | Absent in Orbit | A J2 shooting corrector exists only in Launch's rendezvous (`targeting.ts:6-10`), not imported by `src/orbit` |
| Multi-revolution or out-of-plane Lambert, optimisation | Absent | `maneuvers.ts:511-516`; coplanar circular target (`maneuver-setup.ts:98-101`); grid minimum only |
| Orbit determination | Absent | Nearest: a one-parameter ballistic-coefficient fit (`ballistic.ts:47`, `:75`) |
| Covariance propagation | Absent | Table plus linear growth (`uncertainty.ts:111-121`); CDM covariances used at TCA as given (`cdm.ts:123-135`) |
| Relative motion (Clohessy-Wiltshire) | Absent in Orbit | Only a miss vector's components at TCA (`conjunction.ts:163-165`); CW and LVLH live in Launch's rendezvous code |
| Station-keeping | Absent in Orbit | Closed-form budget lines for Build only (`src/orbit/disposal.ts:118`, `:155`) |
| Constellation / coverage | Partial | One satellite: footprint, track spacing, reach (`applications.ts:90-95`, `:197-215`); brute-force revisit and station contact exist (`src/orbit/coverage.ts:148`, `:272`) but are called from Build, not `src/ui/orbit`; no match for "walker" or "constellation" in `src/orbit` |
| Conjunction assessment | Present | Screening, 2-D Pc, CDM KVN; no 3-D Pc or Monte Carlo |
| Pass / access analysis | Present | `passes.ts:214`; three days in the page (`sky-panel.ts:1530`) |
| Standard formats | Partial | Read: TLE, OMM (CCSDS 502.0-B-3), CDM (508.0-B-1, KVN). Write: none; no OEM, OPM, OMM or TLE export (only worksheet HTML, `sky-panel.ts:1432`) |
| Batch / scripted runs | Absent in Orbit | The 13 WebMCP tools are all Launch (`src/mcp.ts:796-1372`) |
| Frames | Partial | TEME (taken as the one inertial frame), ITRF, radial/along/cross at TCA; no GCRF/J2000 to TEME, no precession or nutation anywhere in `src/orbit` or `src/physics/propagator` |
| Time scales | Partial | UTC Julian dates; UT1 = UTC + IERS dUT1 for the Earth's rotation only (`earth-orientation.ts:68-70`); no TT, TDB, TAI |
| Ephemerides | Partial | Analytic Sun and Moon series (`src/physics/ephemeris-series.ts:28-58`); no JPL DE in the propagator |

**Findings, most important first.**

1. **No general trajectory propagation where the user works.** Playground, planner and coverage fly Kepler plus first-order secular J2; the numerical propagator is reachable only through the lifetime dialog and the re-entry tool and returns element histories. Published inclinations are missed by 0.02-0.08 degrees ([VALIDATION.md](../../VALIDATION.md) line 1494); J2's short-period swing of the semi-major axis, "several kilometres a revolution", is not modelled (`src/orbit/mean-state.ts:6-7`).
2. **The numerical force model is truncated and unvalidated at state level.** Zonals to J4 only, so no GEO longitude drift and no 12 h or 24 h resonance (SDP4 carries both); Sun and Moon 0.45 degrees from the of-date frame ([VALIDATION.md](../../VALIDATION.md) lines 3369-3374; [R] 0.46 degrees today). Tests accept a GEO inclination rate anywhere in 0.6-1.2 degrees/yr and Cowell against the mean method within 25 %.
3. **Drag and lifetime.** Mean bias -16 %; from one element set half of 66 stages fall outside +/-20 % (median 19 %); eccentric objects 0 of 9 inside at 5 and 10 days ([VALIDATION.md](../../VALIDATION.md) line 2610); a storm enters as a daily Ap (lines 2381-2383); beyond NOAA's forecast the Sun is the mean of cycles 19-24.
4. **Maneuvers are ideal impulses.** No finite burns, losses or targeting. Lambert is solved two-body but flown with the J2 toggle (section 6, item 2).
5. **No object-specific uncertainty.** A catalogue statistic plus 1.5 km/day, possibly narrow by a factor of two or three at epoch; no orbit determination or covariance propagation; screening Pc "shows traffic, not collisions" (VALIDATION.md line 2032).
6. **Frames, time and readouts.** One inertial frame, UTC only. Real-satellite and playground readouts give geocentric latitude and height above a 6,378.137 km sphere (`src/orbit/real-sky.ts:72`): by WGS-84's flattening up to 0.19 degrees and about 13 km low for the ISS at 51.6 degrees (by hand), while passes use the ellipsoid.
7. **Data currency.** Default mode is offline; the bundled catalogue is of 2026-09-26, and `docs/IMPLEMENTATION-STATUS.md:463` records published builds up to 2026-11-25 carrying it after CelesTrak failures: 61-day-old sets, about 90 km along-track by the app's own growth figure.
8. **No export, scripting or constellation analysis** (table above).

### 3.4 Special phases and missions

Paired model values are point mass / six-DOF. "Fitted?" results are in section 4.

| Model or feature | Class | Why (the evidence) | Where |
|---|---|---|---|
| Stage return and landing, point mass | C | Right sequence; landing time -2 % to -14 %. Boostback aimed by a 2x2 finite-difference solve; entry burn 70 to 25 km; constant-deceleration landing burn with zero-effort-miss divert. In-model miss 0.2-2.1 m (test: inside 43 m pad / 30 m deck). Demo-2 landing T+552 against 562 s; ORBCOMM-2 517 against 604 s (Block 5 stand-in); Arabsat-6A ship 930 against 967 km (test 700-1,200 km). Bandwagon-1 and Arabsat-6A are profiles only. Drag only (Cd 1.2, no lift, no wind); 10 degrees/s slew; instant engine changes; "landed" below 12 m/s | [PHYSICS.md](../../PHYSICS.md) §8.1; `src/physics/sim/debris.ts:611`, `:350-356` |
| Same, six-DOF; tower catch | C | Gimbal flip, cold gas, steerable grid fins, body lift to 8 degrees, single terminal restart, contact gate. Lands 1.6-1.8 m off; catch 0.3 m at 2.4 m/s; converges over 0.0025 / 0.005 / 0.01 s steps; 16 of 18 restart-stress cases land. Aero table estimated and flown outside its 15 degree envelope; cold gas (200 N, estimated) empty before T+180 s; no legs or contact dynamics; no flown data. "Experimental" (Falcon 9); the acceptance document says it "does not validate real Falcon recovery" | `src/i18n/en.ts:89` |
| Suborbital cut-off; Starship's ship home | C; splash location D | Cut-off T+7:52 / 7:58 against about 8:30; entry interface 41:25 / 39:42 against about 47 min; splash 61:00 / 59:00 against 65:40; 15-25 degrees of longitude short (test 50-70 min, 60-115 degrees E). No entry guidance, no heating; point mass has no lift. Flip margins tuned to land; six-DOF loses the ship at 60 t payload | [PHYSICS.md](../../PHYSICS.md) lines 2661, 2718 |
| Crew escape | C | Three modes by time; rigid bodies (RK4, J2), motor thrust profiles, drogue 24 m2 and reefed 1,000 m2 main. T-10-1: 15.5 g (14-17), 1.7 km (1.2-2), down 0.7 km away against about 4 km, 3.6 against 5.2 min. MS-10: 102 against 93 km, 7.9 against 6.7 g, 411 against 402 km. 18a: 169 against 192 km, 17.0 against 18-21 g, 1,535 against 1,574 km. Apogee +/-10-12 %, g +18 %, downrange +/-2.5 %. Aero, fins, fairing and control motors, release times estimated; entry always ballistic; calm air; failures set off by timers | `src/physics/rigid/escape.ts:76-124` |
| Failure injection and break-up | D | Seeded deterministic modes; placard at 1.15 x max-q; six-DOF q-alpha and shell-load limits. Failures are switches and timers; loss of vehicle ends the flight and the break-up is a hashed visual effect; no fragments, no impact prediction. Determinism only | `src/physics/sim/failures.ts:12-14`, `:53-74`; `src/physics/simulation.ts:1458-1470`; `src/replay/explosion.ts:36-38` |
| Debris and impacts | C | Gravity and drag (fixed Cd 1.2 / 1.5) to impact; Kepler above a 120 km perigee; opt-in burn-up for Vostok's module (unvalidated). Soyuz-2.1a drop zones: strap-ons 361 against 320-375 / about 350 km; fairing 493 against 490 / about 500; core 1,415 against 1,377 / about 1,550 km (-9 to -11 %). No test enforces them | [VALIDATION.md](../../VALIDATION.md) lines 810-812 |
| Station flight: phasing, transfer, braking | C: sound orbital mechanics, arranged target | Both craft under J2; finite main-engine burns (2,950 N, 302 s) with a tank; transfer and braking by Newton shooting; two-day trim by secant. Copied flights: contact 3:13:12 against 3:10:33, 6:22:24 against 6:20:59, 2 d 02:37 against 02:35 (test +/-8, +/-8, +/-20 min). Other flights: MS-16 6:29 against 6:08:15; MS-25 2 d 02:37 against 02:26:39 (+/-25, +/-20 min). Lead at separation 11.2 / 25.7 / 309 degrees | `src/physics/sim/rendezvous.ts:234`, `:314-344`, `:262-269`, `:291-312`; `src/physics/rendezvous/targeting.ts:48-102`; `src/physics/rendezvous/profiles.ts:49-79` |
| Kurs approach, contact, manual mode | C | Six-DOF rigid body; velocity control within 460 / 258 N and 400 N-m; contact judged on speed, miss, angles, rate. True-state navigation; ideal continuous thrusters; station exactly LVLH; contact is the probe tip crossing the port plane; manual mode named "TORU" though only a crewed Soyuz MS can fly it. Tested matrix: 3 profiles to Rassvet, 4 ports on two-orbit, one six-DOF ascent | `src/physics/sim/rendezvous.ts:520-561`, `:564-605`; `src/physics/rendezvous/profiles.ts:129-134`, `:149-152`; `src/i18n/en.ts:3565-3650` |
| Capture to hard dock; ISS orbit | D | Pose snapped to the port, hooks after 780 s. Station: 418 km reference circle; not the ISS's real orbit or phase. No docking dynamics | `src/physics/rendezvous/profiles.ts:136`; `src/physics/sim/rendezvous.ts:616` |
| Apollo 11: parking orbit to injection | C | Cut-off +5.9 / -0.1 s; C3 -1.3905 / -1.3909 against -1.3916 (test 10 s, 0.005). Target is the flown conic; transposition, docking, ejection at flown times | `src/physics/sim/apollo.ts:334` |
| Apollo 11: coast to the Moon, ephemeris | B, not A: the one independent check is loose | JPL DE441 Moon and Sun, hourly, 1969-07-16 13:00 to 07-24 18:00 TDB, Hermite, IAU-1976 precession; Earth J2 plus Moon and Sun; RK4. Independent check: published injection state propagated gives perilune 665.6 n mi at 75:15:30 against the Mission Report's 896.3 at 75:05:21 (test 300 n mi, 15 min). Sphere of influence +35 s, within 40 km and 1 m/s; correction 3.9 against 6.4 m/s. No nutation, radiation pressure or venting | `src/data/ephemeris-1969.ts:1-3`, `:26` (198 hourly rows); `src/physics/lunar/ephemeris.ts:22`; `src/physics/lunar/cislunar.ts:28` |
| Apollo: lunar orbit insertion, lunar orbit | C | LOI-1 902.0 against 889.3 m/s; 320 x 105 against 314 x 111 km; inclination 0.69 against 1.25 degrees (test +/-25 m/s, +/-7 km). Lunar J2 and C22 (GRAIL); no mascons; masses reset to Mission Report values; unexplained 5.2 degree approach-plane offset | `src/physics/lunar/gravity.ts:6-8`, `:15-19` |
| Apollo: descent and landing | C | Ignition -45 s; throttle recovery +374 / +368 against +386 s; 3 m from the site; 7,326 against 7,327 kg (test 50 m, 100 kg). Gate times and heights flown, gate ranges and speeds invented; no navigation, radar or terrain | `src/physics/sim/apollo.ts:1195` |
| Apollo: ascent, rendezvous | C | CSI 17.1 against 15.7, CDH 4.5 against 6.1, TPI 7.6 against 7.8 m/s (4.8 min early); docking +20 s (test +/-5 min). Lift-off re-timed (-42 s); docking kinematic | `src/physics/sim/apollo.ts:1358` |
| Apollo: return and entry | C | Burn 1,007 against 999.4 m/s; entry angle -6.47 / -6.51 against -6.48 degrees; 6.3 / 6.5 against 6.56 g; splash -37 / -42 s, 5 / 2 km (test 120 s, 15 km). L/D 0.30, round aero values | `src/physics/sim/apollo.ts:1428`, `:1588` |
| Vostok 1 | C | Orbit 168.0 x 314.8 against 168 x 314 km; sphere 0.7 / 1.0 km from its place (fitted); hatch +2 min 35 s against the reported 10:42; Gagarin +2.5 to +4.5 min (test 15 km). Retro pitch 2.51 degrees fitted; over-burn scripted | `src/physics/rigid/escape.ts:323` |
| Sputnik 1; Mercury-Redstone 3 | C | Sputnik 214 x 937 / 949 against 214 x 938 km, cut-off +8 s. MR-3: cut-off -5.5 s; 11.6 / 11.3 against 11.0 g; 496 / 490 against 487 km; 16 / 11 km from the splashdown (test +/-25 km, +/-1.5 g). Pitch kick or pitch floor set to the flown apogee or arc | |
| Mission replays (MS-16, MS-25, ORBCOMM-2, Angara-A5 1L, Hayabusa2, Demo-2) | C | Event differences +7 s to -185 s (test max(60 s, 30 %)); stand-in vehicles; Dragon's flight to the station not flown | |
| Replay | not a physics model | Never re-simulated. Between frames: Kepler (point-mass coast), cubic through both states (six-DOF, docked, Apollo, escape), linear under thrust and for scalars. Against the simulation's own state: coasts 0.5 m or less; cut-off span 25 m; falling stages 24 m or less six-DOF, 0.39 km or less point mass; docked ten-minute spans 3 km off orbit (tests 0.1 m, 1 m, 30 m / 450 m, 5 km) | `src/physics/frame.ts:898-901`; `src/replay/recorder.ts:862-889`; `CHANGELOG.md:41-58` |

Plan S20 §4 gives booster recovery (Falcon 9) and crew escape (Soyuz) C and the flight to the station "C and D"; the raw report agrees (C for orbital mechanics, D for the station's orbit and capture). The summary gives Starship's return "C-D" and Apollo 11 "B for the travel, C for the rest"; the raw report gives C with the splash location D, and B for the ephemeris coast only.

**The station flight in detail.**

Real physics: both craft under J2 with RK4 (`src/physics/rendezvous/station.ts:49`; `src/physics/sim/rendezvous.ts:234`); finite burns, rocket equation and tank limit (`sim/rendezvous.ts:314-344`); transfer and braking by Newton shooting on the J2 coast (`src/physics/rendezvous/targeting.ts:48-102`; `sim/rendezvous.ts:262-269`); two-day trim by secant (`sim/rendezvous.ts:291-312`); six-DOF approach with bounded force, torque and propellant (`sim/rendezvous.ts:520-561`); contact judged against the docking limits (`sim/rendezvous.ts:564-605`; `profiles.ts:129-134`).

Arranged:
- Station phase set from the plan after separation (`plan.ts:137-147`; `sim/rendezvous.ts:141`).
- Station placed in the spacecraft's own plane at arrival, so plane error costs nothing (`plan.ts:139-143`). No rendezvous file calls `issRaanAt` (it appears only in a comment, `station.ts:7`). The station's inclination constant 51.64 degrees is unused (`station.ts:23-24`).
- Burn times and sizes copied from one flight each (`profiles.ts:49-79`); approach speeds, ranges and holds chosen to the flown timeline (`profiles.ts:113-127`); hard dock is a timer (`profiles.ts:136`; `sim/rendezvous.ts:616`).
- A transfer shot that fails falls back silently to the first guess (`sim/rendezvous.ts:265-266`; see section 6).

Listed limitations, all still holding on 2026-11-26: station phased afterwards; plane from a fixed node (200 degrees on 2026-01-01) regressed by J2, three anchors within +/-10 days (`mission.ts:155-186`; sets only the launch target, the rendezvous station ignores it; anchors 329.18, 74.49, 20.03 at `mission.ts:172-177`); no drag on either craft (`station.ts:49`; `sim/rendezvous.ts:226`, `:234`, `:327`, `:372`, `:549`); pose capture, no momentum exchange, no free drift, station attitude locked (`sim/rendezvous.ts:77-80`, `:589-593`, `:608-615`); no navigation error or sensor latency (the controller reads true states, `sim/rendezvous.ts:400-485`); manual mode named "TORU" although only a crewed Soyuz MS can fly it (`profiles.ts:149-152`).

Fuel: 858 kg (12 % of 7,150 kg, `src/data/satellites.ts:11`). The test only bounds two-orbit use to 200-400 kg (`tests/rendezvous.test.ts:187-191`); 117 m/s is about 277 kg (by hand). Attitude in the far phases costs nothing (`sim/rendezvous.ts:236`, `:281`). An empty tank aborts the flight (`:348-358`).

**Findings, most important first.**

1. **The station is arranged around the flight.** Phase and plane are set after separation, on a 418 km reference circle (`plan.ts:137-147`; `station.ts:22-25`). A launch can never miss the station by timing, plane or phasing. The 0.4 degree plane error the document quotes for MS-16 would be about 54 m/s (by hand).
2. **Proximity operations have no sensors, thruster layout or contact dynamics.** An automatic contact is always on the axis ([PHYSICS.md](../../PHYSICS.md) line 2935); capture snaps the pose and waits 780 s; the only collision test is the port plane (`sim/rendezvous.ts:566`).
3. **Docking times agree by construction.** Within 1.4-2.6 min of the flights the burns were copied from, but +21 min (5.6 %) on MS-16 and +10 min on MS-25.
4. **Apollo 11 is a targeted re-flight on a scripted timeline.** Ignitions at flown times, masses reset from the Mission Report, targets equal to the flown outcomes, and a point mass from the parking orbit on even in six-DOF (`apollo.ts:14-16`). No mascons: descent ignition 45 s early, lift-off 42 s early, descent orbit 99.5 x 14.9 against 108.3 x 14.4 km. An unexplained 5.2 degree approach-plane offset costs +12.7 m/s ([PHYSICS.md](../../PHYSICS.md) lines 4142-4148). The ephemeris covers one week: launches 13:32:00-13:40:45 UTC only.
5. **Starship's ship has no entry guidance or heating.** It comes down 15-25 degrees of longitude short, about 1,500-2,600 km (by hand), and 5-7 min early ([PHYSICS.md](../../PHYSICS.md) lines 2661, 2718).
6. **Booster recovery rests on estimated aerodynamics and actuators.** Compared with flights only by landing time (-10 s, -87 s) and ship distance (-37 km). Point mass counts a landing below 12 m/s (`debris.ts:611`); the ship is placed where the stage will fall (`debris.ts:350-356`).
7. **Failures are scripted and break-up is visual** (`failures.ts:12-14`, `:53-74`; `simulation.ts:1458-1470`; `replay/explosion.ts:36-38`). The only debris check, Soyuz drop zones, misses the core by 9-11 % and is untested ([VALIDATION.md](../../VALIDATION.md) lines 810-812).
8. **Replay can differ only between frames.** Metres normally; kilometres on recordings thinned to ten-minute coast frames; spans over a quarter orbit fall back to a straight line (`frame.ts:898-901`; `CHANGELOG.md:41-58`). Frames themselves are the flight: both models fly whole steps (`recorder.ts:862-889`).

### 3.5 Build and design models

Figures are those recorded in the repository's documents and test comments unless marked "by hand".

| Model or feature | Class | Why (the evidence) | Where |
|---|---|---|---|
| Parts catalogue (D01), engine masses | C | 55 engines, 49 stage bodies, 14 strap-on bodies, 18 fairings, typed from public sources, no regression; the file's own accuracy is "public sources, rounded, +/-10 %". Engine masses: 32 published, 6 secondary, 5 Wikipedia-only, 8 inferred, 4 none. No source for 27 engines (5 more cite only the peak ratio), 24 stage bodies, 5 strap-ons, 13 fairings. 4 "lumped" engine entries are not one real engine; interstages massless. Emits the earlier fleet bit for bit (identity). 20 published burn times within 10 % (worst -7.1 %) | `src/data/parts.ts:4-5`, `:59-64`, `:209-210`; `tests/parts.test.ts:96`; `tests/parts-engine-masses.test.ts:46`, `:57` |
| Budget core (D02-D05) | B | Ideal rocket equation per phase; T/W at ignition; structural ratio. No loss term; losses only in the planner: flat 1,750 m/s + 150 m/s margin - Earth-rotation credit. Equals the flight model's own Δv walk exactly (21 vehicles); hand-worked equation 1e-12; six published burn times -2.2 % to +1.4 % (bound 10 %). Every strap-on group at the first group's Isp; Falcon Heavy and Angara cores at full throttle beside strap-ons; fairing dropped at first staging | `src/physics/mission.ts:524`, `:536`; `tests/design-budget.test.ts:48` |
| Optimal staging (D05) | B | Lagrange multipliers by bisection, serial stages of given Isp and structural ratio. Closed form 1e-12; brute-force grid within one step (1-5 m/s); NPTEL Lecture 20 worked examples (payload ratio within 1e-4; beta 0.84947, pi 0.32664, m0 93.73 kg confirmed by hand). Loss-free; epsilon independent of size; no strap-ons or T/W constraint. Real first-stage Δv differs from the optimum by -2.44 to +2.13 km/s over 6 vehicles | `src/design/optimal-staging.ts:132` |
| Remix (D02) | C | Stretch 50-200 % (propellant and non-engine dry mass times k); engine swap; strap-ons; fairing. Exact consequences of unvalidated mass rules: tank mass proportional to propellant, full-width cylinder tanks, no ullage or domes. Arithmetic identities 1e-12, 630 random edit lists; no real stretched vehicle. Falcon 9 second stage x1.3 rates 8,870 kg against 20,031 kg, cause not shown. Mixture ratios are family medians (2.6 / 5.88 / 3.6 / 2.1) | `src/design/remix.ts:44-51`; `src/design/propellant.ts:14-17` |
| Parts builder and warnings (D03) | C | Nine warning codes (hold-down replay, T/W floor 1.15, upper stage under 1.6 m/s2, fixed thrust over the acceleration limit, Δv floor 9,500 m/s, propellant fraction outside 0.51-0.97, fairing narrower than stage). No loads, bending, stability, control or tank checks. Limits are fleet medians (40 kPa, 50 m/s2, fairing off at 115 km). Same simulator only: lift-off verdict 85 of 85; release T/W within 0.0041 (bound 0.01) | `src/design/assemble.ts:168-171`; `src/config/satellite-spec.ts:237` (fairing fit 85 % of diameter, 80 % of length) |
| Test stand (D04) | C | The flight engine model: thrust linear in ambient pressure, mass flow fixed. No chamber pressure, mixture ratio, expansion ratio or flow separation. Steady thrust and vacuum Isp are the catalogue's by construction. Sea-level Isp against quoted: worst -5.0 % (Vulcain 2.1; bound 8 %). A deeply throttled engine low in the air reads 14-19 % strong | `src/physics/vehicle.ts:220-239`; `src/design/static-fire.ts:31-32`; `tests/physics-core.test.ts:386`; `tests/design-static-fire.test.ts:147` |
| Wind tunnel (D04) | C by method; accuracy not determined | Slender-body theory plus viscous crossflow built from the stack layout; axial force from one generic Mach curve. Fins, nose shape, Reynolds number, base flow and damping absent. Geometry is the drawn stack (Vega-C 41.9 m against 34.8 m published; up to 20 % taller than published). Identities with the flight tables (1e-6), C_Nalpha = 2 per radian (1e-12). No tunnel or flight data | `src/design/tunnel.ts:17-24`; `src/physics/aero.ts:6-20`; [VALIDATION.md](../../VALIDATION.md) lines 2939-2942 |
| Readiness review (D04) | C as a review | Validator, warnings, mission plan, one point-mass calm-air probe flight, Launch's verdict. Verdict identical to the Launch panel on 36 catalogue rows. One nominal flight; no winds, dispersions, loads or controllability | |
| Computed payload ratings (D03, D04) | C | Bisection on payload; each trial flies the point-mass probe to first orbit and requires the Δv left for later burns. 8 published ratings on 6 of 21 vehicles: -17.7 % to +31.2 %, mean absolute 14.8 % (bound +/-25 %; Vega-C a recorded miss). Resolution 0.5 % of the ceiling, at most 9 flights a rating; calm air; delivery assumed monotone in payload. The test pins only which rows fall inside +/-25 %. The core defaults to 8 s and 40 flights; the Build page removes the wall-time limit and keeps 40 flights; two ratings need at most 18 flights; an unfinished search is not stored | `tests/design-ratings.test.ts:25-33`, `:144-154`; `src/design/ratings.ts:247-249`; `src/ui/build/ratings-budget.ts:10`; `src/data/vehicles.ts:535` |
| Six-DOF, own vehicle (D03) | D | Mass, CG and inertia from estimated cylinder and tank distributions; aero tables from the layout; generic +/-5 degree gimbal; generic 50 N thrusters; origin's or default guidance. No slosh or flex. Single-engine first stage has no roll control; thrusters not scaled; fixed-nozzle motors get 5 degrees of steering. Thrust sum equals point-mass thrust (1e-9); one constructed vehicle flew 180 s without loss; a renamed PSLV rolled 2.2 degrees/s against 0.075 degrees/s. Labelled experimental | `src/design/build-handoff.ts:19-25`; `src/physics/rigid/vehicle-data.ts:284`, `:494-503`; [VALIDATION.md](../../VALIDATION.md) lines 3165-3180 |
| Launcher sizing (D05) | C: magnitudes plausible, the design does not close | Design Δv = perigee speed + 1,750 + 150 - rotation credit (9,049 m/s for 1 t from Kourou; by hand 7,613 + 1,750 - 463 + 150); optimal split; masses from a user-typed epsilon; whole engines to a target T/W; length from propellant volume + 1.4445 diameters. Internal identities 1e-9; sanity bound only (1 t launcher: 31.6 t, inside 20-80 t). Flown: short of orbit at design Δv in all 5 cases. Serial liquid stages only; fairing dropped at first staging in the budget; loss allowance not vehicle-specific | `src/design/sizing.ts:17-24`; `src/physics/mission.ts:524`; `tests/design-sizing.test.ts:153-158` |
| Satellite: eclipse and beta (D06) | A | Beta from the Sun direction and J2-drifted node; cylinder-shadow closed form and sampled shadow; worst eclipse over a year. SMAD table, 41 rows, within 0.005 min (bound 0.01); sampled against closed form 0.47 s (bound 2 s); Skyfield ISS shadow edges +/-3 s (other section, not re-verified). No penumbra, oblateness or refraction; charge cycles are an upper bound | `src/orbit/power.ts:59` |
| Satellite: power | B by method; accuracy against hardware not determined | SMAD sizing: array power through path efficiencies; area from 1,361 W/m2, cell efficiency, degradation 0.77, yearly loss; battery from eclipse energy and depth of discharge. Four textbook worked examples within 0.1 W and 0.01 m2 (one example's inputs inferred). Loads equal in sunlight and shadow; flux fixed at 1 AU; fixed 23.5 degree worst angle; no temperature, voltage or ageing | `src/orbit/power.ts:59`; `src/design/satellite-model.ts:521` |
| Satellite: attitude | C | Worst-case gravity-gradient (45 degree tilt), solar, aerodynamic and magnetic torques; centred dipole; wheel, bias-momentum and torquer rules. Starin and Eterno tables to half a unit of the last printed digit. Bounding magnitudes, not histories; no control loop | |
| Satellite: radio link | B for the arithmetic; default inputs unrepresentative | Design control table; highest rate at 3 dB. MarCO table line by line within 0.070 dB (bound 0.1); Palo et al. margin 5.31 against 4.79 dB (bound 0.6). No rain or atmosphere model, no bandwidth limit; one ground station; default receiver is an 11.28 m dish; the default station gives 28.4 Gbit/s from 10 W | `src/design/satellite-link.ts:40-49`; `src/orbit/link.ts:75-95`; [VALIDATION.md](../../VALIDATION.md) line 3816 |
| Satellite: camera | B | Ground sample h*p/f, off-nadir sample, diffraction 1.22 lambda h/D, swath, push-broom data rate. Sentinel-2: 9.825 against 10 m, 292.0 against 290 km; Landsat 8: 185.8 against 185 km (bounds 1-3 %). Spherical Earth; ground speed without Earth rotation; off-nadir and diffraction have no published check | `src/data/satellite-templates.ts:233` (THEOS-2: 0.501 m, 10.33 km by hand) |
| Satellite: propellant, drag area, lifetime | B for manoeuvres; C for drag-dependent figures | Rocket equation; Hohmann, IADC graveyard raise, controlled re-entry; drag make-up from the lifetime propagator; drag area = quarter of the box surface + half the wing area. Published Δv and propellant within 0.1 m/s or 0.1 kg (one miss, 0.11 kg). NAPA-2 lifetime +8.0 % with measured solar activity (bound 25 %). Impulsive burns; drag make-up frozen at the epoch (+/-30 % over a year); low orbits always budgeted for controlled re-entry | `src/orbit/disposal.ts:145-149`; `src/orbit/reentry.ts:52`; `src/data/napa2.ts:27-29` |
| Templates | C (NAPA-2, THEOS-2 class); D (five classes) | NAPA-2: 10 kg (GCAT), 20x10x34.05 cm (Janes), flown orbit; ballistic coefficient 0.013437 m2/kg by hand. THEOS-2 class: 425 kg labelled an estimate. Five classes: unsourced typical mass, engine, size. Three class templates fail their own Δv budget (communications -667.8 m/s, weather -632.4, science -25.6). Flown to 519.4 x 537.0 km and 620.6 x 623.1 km against 520 x 540 and 621 km (bound 30 km). Cameras chosen to match published resolution | `src/data/satellite-templates.ts`; `src/data/napa2.ts` |
| Start from requirements (D07) | B for orbit and coverage geometry; C as satellite sizing | Repeat-ground-track orbits 150-5,000 km; per row focal length, aperture, swath, brute-force revisit, station contact, link rate, array and battery at worst beta, lifetime by bisection (+/-5 km), disposal Δv. Inverses round-trip 1e-9; THEOS-2 orbit 621.071 km, 97.871 degrees against 621 km, 97.91 degrees; Landsat 8 within 16 d, Sentinel-2 10.00 d, Sentinel-1 7.51 d within 12 (one-sided). Mass and drag area stay the template's whatever the optics; circular orbits; the table differs from the bench by 18.9 % (array) and 60.2 % (battery) on THEOS-2 | `src/design/requirement-trades.ts:42-43`; `docs/IMPLEMENTATION-STATUS.md:706` |
| Structure: Soyuz-2.1b ST31 | not a physical model | 2,069 drawn parts (`public/structure/soyuz-2-1b-fregat-st31.r4.json`, none with a mass field), 11 assemblies, order rules. No mass, loads or strength; "passing these rules says nothing of strength" (`src/structure/soyuz.ts:14-15`); not connected to the flight model | |
| Structure: EduSat-3U | C: exact bookkeeping on assumed inputs | 13 units: mass sum, CG from box centres, CubeSat Design Specification bounds, exact battery balance over 3 orbits at 500 km. Closed forms 1e-9; hand-off mass within 0.5 g. Every part mass and load an assumed typical value; no strength, vibration or thermal | |

Computed payload against published (recorded in `tests/design-ratings.test.ts:25-33`): Soyuz-2.1a LEO 7,021 / 7,430 kg (-5.5 %); Falcon 9 LEO 20,031 / 22,800 (-12.1 %); Long March 2D LEO 3,165 / 3,500 (-9.6 %); Vega-C LEO 4,330 / 3,300 (+31.2 %, missed); Ariane 64 LEO 26,274 / 21,600 (+21.6 %); Electron LEO 315 / 300 (+5.0 %); Falcon 9 GTO 6,832 / 8,300 (-17.7 %); Ariane 64 GTO 13,328 / 11,500 (+15.9 %). Several of these figures are held only in comments and may predate the 2026-10-01 Soyuz data change.

S20 §4 puts the satellite designer at "A to C" and the five class templates at D, and the payload rating and launcher sizing at C; these agree with the table.

**Findings, most important first.**

1. **Sizing does not close.** "no sized launcher tried reaches orbit at it" (`docs/IMPLEMENTATION-STATUS.md:613`); "Finding: the design Δv is not enough" ([VALIDATION.md](../../VALIDATION.md) line 3215). Four launchers need +100 to +500 m/s (1-6 % of 9,049 m/s); the fifth reaches no orbit up to +1,000 m/s. A sized 1 t launcher runs out of propellant at +0 and +220 m/s and reaches orbit at +500 (`tests/design-sizing.test.ts:153-158`). Causes in code: a flat loss allowance and a fairing dropped at first staging (`src/design/sizing.ts:17-24`; `src/physics/mission.ts:524`).
2. **Payload ratings are +/-25 % figures.** "Vega-C's LEO rating is 31 % high (4 330 against 3 300 kg), and 26 % high to its own 700 km reference orbit, which is not explained" (`docs/IMPLEMENTATION-STATUS.md:605-606`). Only 6 of 21 vehicles were compared.
3. **No engine physics.** Thrust is interpolated between two catalogue numbers and mass flow is fixed (`src/physics/vehicle.ts:220-239`). Sea-level Isp is inconsistent by up to 5.0 %; throttling low in the air errs by 14-19 % (`docs/IMPLEMENTATION-STATUS.md:662-664`).
4. **No mass or structural estimation anywhere.** Dry mass is typed or scaled with propellant (`src/design/remix.ts:44-51`); tanks are full cylinders (`src/design/propellant.ts:14-17`); interstages are massless (`src/data/parts.ts:59-64`); structural limits are fleet medians (`src/design/assemble.ts:168-171`). Structure computes no loads.
5. **Aerodynamics are unvalidated estimates.** One drag curve serves every shape (`src/physics/aero.ts:6-20`); fins and nose shape change nothing (`src/design/tunnel.ts:17-24`); the stack measured is the drawn one.
6. **Catalogue provenance.** Roughly half the hardware figures carry no source, and the file states +/-10 % (`src/data/parts.ts:209-210`).
7. **The satellite designer has no mass budget, thermal model or bandwidth limit.** Loads are equal in sunlight and shadow (`src/design/satellite-model.ts:521`); the default station gives 28.4 Gbit/s from 10 W (`src/design/satellite-link.ts:44`; 28.42 Gbit/s by hand from `satellite-link.ts:40-49` and `src/orbit/link.ts:75-95`); the requirements tool keeps the template's mass (`src/design/requirement-trades.ts:42-43`) and differs from the bench by 18.9 % (array) and 60.2 % (battery) on THEOS-2 (`IMPLEMENTATION-STATUS.md:706`); drag make-up moves +/-30 % over a year (`src/orbit/disposal.ts:145-149`).
8. **Six-DOF for an own vehicle** flies generic actuators with untuned guidance ([VALIDATION.md](../../VALIDATION.md) lines 3165-3180).

## 4. Agreement that is not evidence

Every place a report says a match comes from fitting, from an input or from construction.

| Where | What agrees | Why it is not evidence |
|---|---|---|
| Soyuz-2.1a ascent | Event times 0-1 %; heights 79 / 157 / 143 km | Times are inputs (cut-off, hot-staging, fairing clocks, strap-on cut-off 117.45 s); heights are the fit targets of three solved scalars and four hand-set shape values (V:110-123). Only the held-out rows count |
| Fairing jettison on 8 vehicles | Fairing times | Eight fairing clocks are the operators' callouts, entered as inputs (VEH:11-27); on Proton and Angara fairing = ignition + 9 or 10 s |
| Solid motors | Burn times, separation gaps | Mean thrust = grain / published burn time; peak factor = published peak / mean; separation delays set from published times (also the budget core's burn-time checks) |
| Falcon 9 six-DOF | Flight-path angle | Kick 3.5 degrees fitted on three flights; the check on two held-out flights is weak (14.8 to 12.5 degrees). The 22 kPa bucket was kept by selection on the same flights. Falcon 9 first-stage masses were replaced by published ones after a miss |
| Soyuz and Saturn V event times and loads | Times and loads | By construction (ascent report). Per-vehicle kick, loft and pitch numbers are tuned until each vehicle reaches orbit, so "reaches its orbit" is by construction |
| Sputnik, Vostok-K | Orbit | The orbit is the target; Sputnik's 90 t core load "puts it on the orbit" (VEH:747); Vostok retro pitch 2.51 degrees fitted to the landing (`src/physics/rigid/escape.ts:323`); over-burn +25.43 m/s scripted |
| Ariane 64 | Altitudes (PM 0 / +1 / -13 / -13 %) | Attributed to compensating data errors (AUD:473) |
| Atlas V, H-IIA | Timelines | Reference hardware differs (Atlas V 13 t apart at lift-off, AUD:293; H-IIA F50 longer-burn SRB, AUD:619) |
| Falcon 9 SECO speed | ±1-3 % agreement | It is the orbital speed at the commanded altitude (fleet report) |
| Per-vehicle kick, loft and pitch limits | Fleet-matrix passes | Tuned on the model's own matrix rows, not on flights, and not in the register (Vulcan, H-IIA and others) |
| Station flight | Docking times (3:13:12 against 3:10:33; 6:22:24 against 6:20:59; 2 d 02:37 against 02:35) | Phasing burn times and sizes are copied from MS-28, TMA-19M and MS-01; phase set after separation; approach speeds, ranges and holds chosen to the flown timeline; phase durations set to MS-28's timeline; hard dock is a 780 s timer. Other flights: MS-16 +21 min (5.6 %), MS-25 +10 min |
| Station | Launch never misses | The station is placed in the spacecraft's own plane at arrival, at 418 km (`src/physics/rendezvous/plan.ts:137-147`), so no launch can miss it by timing, plane or phasing |
| ISS launch window | Opens 158 s (MS-16) and 69 s (MS-25) from real lift-off | Arranged; the node is a fixed 2026 value regressed by J2 with three anchors within +/-10 days (`src/physics/mission.ts:155-186`) |
| Apollo 11 | Cut-off +5.9 / -0.1 s, C3, LOI, descent, rendezvous, entry | Ignitions at flown times; masses reset from the Mission Report (`src/physics/sim/apollo.ts:334`, `:1195`, `:1358`, `:1428`, `:1588`); targets equal the flown outcomes; engine point fitted to the flight's own first burn; gate times and heights flown |
| Crew escape | T-10-1 g; MS-10 timing | Tower thrust chosen to give T-10-1's g; MS-10's 3.57 s delay taken from its timeline. Tests are regression bands (18a 155-185 km excludes the flown 192 km) |
| Starship return | Landing | Flip margins tuned to land (splash point not fitted) |
| Booster recovery | Landing | Reserves chosen in-model (13 % is the least that lands; 15 % kept); drone ship stationed on the stage's own predicted impact (`src/physics/sim/debris.ts:350-356`) |
| Orbit: THEOS-2 | Repeat cycle | 385 revolutions chosen to give 621 km ([VALIDATION.md](../../VALIDATION.md) lines 1585-1586) |
| Orbit: CARA, re-entry screening | Pc agreement; re-entry counts | CARA bound of 0.5 % was set after the first run; re-entry screening rules written after the results, reported beside the record |
| Build: ratings | Payload ratings | Method changed after first GTO results came out 2.05x and 2.29x published; bound unchanged |
| Build: link, camera, templates | Palo et al. margin, THEOS-2 camera, GEO drift 0.85 degrees/yr | Palo's noise temperature and atmospheric loss worked back from its table; THEOS-2 camera chosen to give the published 0.5 m; GEO drift chosen to reproduce 45.5 m/s a year; cameras chosen to match published resolution |
| Build: parts, test stand, budget | Catalogue figures, steady thrust, vacuum Isp, Δv | Steady thrust and vacuum Isp are the catalogue's by construction; the budget equals the flight model's own Δv walk exactly (identity, not accuracy); the catalogue emits the earlier fleet bit for bit (identity) |
| Build: warnings | Lift-off verdict 85 of 85 | Same simulator only; thresholds are the fleet's own envelope; a 2 % threshold was set after a probe |
| Build: sizing, 1,750 m/s | Loss allowance | It is the low end of the simulator's own fleet losses (1,684-2,633, median 1,970), not flight data |
| Fleet register | Completeness | [VALIDATION.md](../../VALIDATION.md) lines 15-17 say every fitted, derived and constructed value is in one register; it is not (see section 5, row 25) |
| Sourced corrections | Accepted 2026-10-01 | Not in the data (AUD:737-742 against PARTS:655, VEH:123, FD:762) |

## 5. Documents that disagree with the code

This list is the work order of package PF-03 ("Documents brought to the code", S20 §5.1, "about twelve" in the summary). It has 28 rows: every mismatch named by any of the five reports. "Code" means the code, test or other document that holds the contradicting fact. A mark "(reference not found on 2026-11-26's main)" means the thing the document cites does not exist.

How PF-03 uses this list. PF-03 changes documents only. Where a row is marked "reference not found" (rows 13, 14, 15, 18, 27), the document's sentence is reworded to what a test does show, and the missing test is recorded as a gap for the package that owns the model; no test is written in PF-03. Counts that only a run can give (rows 22 to 24) are taken from the output of the next CI or heavy run, not recounted by reading. Row 28 is package LV-2's. Every row is checked against the code again before the document is changed: the audit read, it did not run.

| # | Document and place | What it says | What the code does | Where in the code |
|---|---|---|---|---|
| 1 | [PHYSICS.md](../../PHYSICS.md) line 36 | Every vehicle flies by default as a rigid body | True for the app. `Simulation` without `dynamics` flies point mass; a Build hand-over flies point mass unless six-DOF is ticked | `src/physics/rigid/config.ts:17-22`; `src/physics/simulation.ts:216-218`; `src/design/build-handoff.ts:19-25` |
| 2 | [PHYSICS.md](../../PHYSICS.md) lines 30-31 | RK4 "with adaptive steps (0.1 s in the atmosphere, up to 30 s in orbit)" | The values are right; "adaptive" means chosen by regime, with no error control | `src/physics/simulation.ts:690`, `:703`, `:728` |
| 3 | [PHYSICS.md](../../PHYSICS.md) line 1139 | Six-DOF aero table built "for each configuration of the vehicle (Falcon 9 and Soyuz-2.1a" | Stale: tables are built for every vehicle | `src/physics/rigid/mass.ts:262-291`; `src/physics/rigid/aero-tables.ts:174-246` |
| 4 | [PHYSICS.md](../../PHYSICS.md) lines 1110-1121 | Vallado's 86 km density row is "6.6e-6" | The code comment gives "6.958e-6" (the value 6.95793e-6 with 5.575 km is confirmed). Wording differs | `src/physics/atmosphere.ts:25-33`, `:38-39`, `:49` |
| 5 | [PHYSICS.md](../../PHYSICS.md) lines 1168-1171 | Sea-level Isp within 1 % for most engines; exceptions Vulcain 2.1 +5.0 %, Rutherford +2.6 %, Raptor 2 +2.4 % | Only 24 of 31 within 1 %; also off: HPS3 -2.2 %, Merlin 1D +2.0 %, BE-4 +1.2 %, YF-77 +1.1 %; Vulcain and Raptor deliver less than quoted (the report's by-hand figures; "24 of 31" and the BE-4 and YF-77 figures are by hand, not re-derived here). Test bound is 8 % with a pinned list above 2 %: the test covers only the ground-lit engines of each vehicle's first stage and its boosters (not vacuum-only engines), and pins the engines over 2 % to exactly Raptor 2, Rutherford and Vulcain 2.1. HPS3 is PSLV's third-stage engine (`src/data/parts.ts:446`, stage `ps3`), so it is outside the set the test covers, and the pinned list does not contradict -2.2 %. Merlin 1D is in the set; from the file's constants it delivers 311 x 845 / 914 = 287.5 s against 282 s, +1.96 %, just under the 2 % line, so it is not on the list. HPS3 re-derived the same way: 295 x 150 / 174 = 254.3 s against 260 s, -2.2 %. The code comment's claim that `data-consistency` asserts 1 % was not found (reference not found on 2026-11-26's main) | `tests/physics-core.test.ts:378-394`; `src/physics/vehicle.ts:248-249`; `src/data/parts.ts:331`, `:373`; `tests/data-consistency.test.ts` |
| 6 | [PHYSICS.md](../../PHYSICS.md) lines 1505-1520 | Per-vehicle guidance defaults table | Differs on two rows: Vulcan is kick 3 degrees, pitch max 40 degrees; PSLV-XL loft 80 km. The table omits the six-DOF kicks the default flight uses (Falcon 9 3.5, Atlas V 8, Angara-A5 8 degrees) | `src/data/vehicles.ts:497`, `:707`, `:396`, `:448`, `:360` |
| 7 | [VALIDATION.md](../../VALIDATION.md) lines 2721-2722; [IMPLEMENTATION-STATUS.md](../../IMPLEMENTATION-STATUS.md) line 490; `src/data/parts.ts:4-5` | "50 stage bodies, 17 fairings"; 25 stage bodies uncited | 49 stage bodies and 18 fairings; 24 of 49 uncited by count. Uncited engines 27 + 5 confirmed | `tests/parts.test.ts:96` |
| 8 | [VALIDATION.md](../../VALIDATION.md) lines 2991-2993; comment at `src/design/static-fire.ts:31-32` ("up to 6.9 % in the catalogue") | Sea-level Isp "worst RD-108A, +6.93 %", four engines over 2 % | By hand from today's data RD-108A is +0.12 % and the worst is Vulcain 2.1 at -5.03 %; the test names three engines. Bound 8 % confirmed | `tests/design-static-fire.test.ts:147`; `tests/physics-core.test.ts:386` |
| 9 | [IMPLEMENTATION-STATUS.md](../../IMPLEMENTATION-STATUS.md) line 464 (R03) | "times within 0.35 s, angles within 0.004 degrees" | VALIDATION.md gives 0.34 s and 0.005 degrees (pre-P2.5 figures left in the row) | [VALIDATION.md](../../VALIDATION.md) lines 1717-1720 |
| 10 | [IMPLEMENTATION-STATUS.md](../../IMPLEMENTATION-STATUS.md) line 466 (R05) | "GFZ's monthly F10.7 and Ap since 1947 ... 13-22 % early" | Data are daily from 1954-01-01 and the current figure is 8-23 % early (the row describes the superseded model) | `src/data/solar-daily.json` |
| 11 | `src/orbit/sgp4.ts` header lines 30-32 | UT1 - UTC and polar motion "are left out" | Not in every user path: passes apply both (`temeToItrf`: UT1 and polar motion, `src/orbit/passes.ts:89`); the sky readouts apply UT1 only, no pole (`earthAngle`, `src/orbit/real-sky.ts:67`). The header is stale either way | `src/orbit/passes.ts:89`; `src/orbit/real-sky.ts:67`; `src/orbit/earth-orientation.ts:68-79` |
| 12 | `src/physics/propagator/propagate.ts` header lines 15-18 | Mean method "steps of up to a day" | Steps up to 5 days, 24 or 24+12 points, 300 km split, 0.5 % | `src/physics/propagator/propagate.ts:40`, `:211`, `:242-246`, `:267` |
| 13 | [VALIDATION.md](../../VALIDATION.md) lines 1880-1882 | "Starshine 2 by the full equations: 142.6 days against 132.8" | No Cowell run of a sphere found under `tests/` (reference not found on 2026-11-26's main) | `tests/` (searched) |
| 14 | [VALIDATION.md](../../VALIDATION.md) (screening filter: "108 runs, 591 approaches") | 591 approaches | The equality criterion is in the test; the count 591 is not pinned | `tests/heavy/screening-filter.test.ts:14-22` |
| 15 | `docs/ROADMAP-PART2-3.md` line 116 | Published-calculator and full textbook-budget checks planned for the Orbit applications | Not in the tests | `tests/` (searched) |
| 16 | [PHYSICS.md](../../PHYSICS.md) lines 2844-2845 | The station is a circle at 418 km "in the plane the launch windows use" | The spacecraft's own plane at arrival. The station's 51.64 degree constant is unused; no rendezvous file calls `issRaanAt` | `src/physics/rendezvous/plan.ts:139-143`; `src/physics/rendezvous/station.ts:23-24` |
| 17 | [PHYSICS.md](../../PHYSICS.md) lines 2930-2931 | "Every profile docks, to every port, in the point-mass and the six-DOF ascent alike" | Narrower in tests: 3 profiles to Rassvet, 4 ports on the two-orbit profile, one six-DOF ascent | `tests/heavy/rendezvous.test.ts:48-84` |
| 18 | [PHYSICS.md](../../PHYSICS.md) lines 3251-3253 | MS-16 "reaches a plane 0.4 degrees from the station's (tests/watch-missions.test.ts)" | Not found; that file checks only the 180 s window (reference not found on 2026-11-26's main) | `tests/watch-missions.test.ts:70-74` |
| 19 | [PHYSICS.md](../../PHYSICS.md) line 2891 | A two-orbit flight costs 116.8 m/s | Not reproducible: the table's own rows sum to 120.8 m/s (115.1 without braking); the test bounds 95-135 | `tests/rendezvous.test.ts:83-85` |
| 20 | [PHYSICS.md](../../PHYSICS.md) lines 2749, 2772 | Head section with the tower 7,635 kg | The code's parts sum to 7,170 kg | `src/physics/rigid/escape.ts:78`, `:99`, `:108-109`, `:494-499` |
| 21 | [PHYSICS.md](../../PHYSICS.md) lines 3688-3692 | A point-mass step is cut at the recorder's packet, moving Vostok's sphere by up to 4 km | Stale: the simulation steps whole steps | `src/replay/recorder.ts:862-889` |
| 22 | [VALIDATION.md](../../VALIDATION.md) lines 396, 602; ascent report on six-DOF rows | Falcon 9 point mass "49 of 66"; six-DOF "53 of 66" (ascent report) | 16 pinned rows give 50; six-DOF 11 pinned rows give 55 (the heavy suite was once found stale, V lines 400-405) | `tests/validation/falcon9-webcast.test.ts:22-30`; `tests/heavy/validation-falcon9.test.ts:20-28` |
| 23 | [PHYSICS.md](../../PHYSICS.md) lines 2008, 2183-2185; [IMPLEMENTATION-STATUS.md](../../IMPLEMENTATION-STATUS.md) lines 313-317 | Fleet matrix: 195 combinations, 126 pass, 33 / 23 / 13 excluded | The harness iterates all 21 vehicles; `BEYOND_CAPABILITY` holds 24 keys, `ARCHITECTURE` 25; the fleet agent counts 222 / 131 / 42 + 24 + 25 (by reading, not executed) | `tests/fleet-harness.ts:154`, `:368-467` |
| 24 | [PHYSICS.md](../../PHYSICS.md) lines 2008-2011 | 45 not flyable, 150, 111 acceptance cases, 39 excluded | Contradicts its own table (and the 195 / 126 / 69 above) | same document |
| 25 | [VALIDATION.md](../../VALIDATION.md) lines 15-17 | "Every fitted, derived and constructed value is in one register" | The register covers Falcon 9 (kick only), Soyuz, Saturn V AS-506 and Mercury-Redstone. Absent: six-DOF kicks 8 degrees, the 22 kPa bucket, Sputnik's core load | `src/data/vehicles.ts:360`, `:448`, `:382`, `:747` |
| 26 | [PHYSICS.md](../../PHYSICS.md) line 2234 (not line 2089, which is in a table of model-delivered masses such as "5.2 t / 8.2 t") | Soyuz-2.1b published LEO "8.2 t" (the "published 23 t / 24.5 t / 8.2 t LEO figures" for the configuration without the kick stage) | `payloadLEO: 8670` | `src/data/vehicles.ts:256` |
| 27 | [VALIDATION.md](../../VALIDATION.md) lines 819, 878-880 | Soyuz-2.1b profile check and "acceleration within 1 %" | Not found in any test (searched for 1.828, 43.2, 144.7) (reference not found on 2026-11-26's main) | `tests/` (searched) |
| 28 (not PF-03 work: this is package LV-2) | [audit-2026-10-01-flight-profile.md](../../history/audit-2026-10-01-flight-profile.md) lines 737-742 | Accepted: Falcon 9 second stage 4,000 / 107,500 kg, ignition delay 8 s, label "MECO + 11 s" | Not applied: 4,300 / 108,000 kg; delay 4; label "MECO + 7 s" | `src/data/parts.ts:655`; `src/data/vehicles.ts:123`; `tests/fleet-defaults.test.ts:762` |

Also named by the fleet report, not a document-against-code row: the Rocket Lab press kit's 5,600 lbf (24.9 kN) differs from the model's 24 kN (`src/data/parts.ts:467`).

## 6. Suspected silent wrong answers

Two were named in the summary. For both, no run was made: neither was observed in a running app.

**1. The station-transfer solver that keeps its first guess.**
- Where: `src/physics/sim/rendezvous.ts:262-267`: `const shot = interceptImpulse(here, plan.tArrive - tc, aim.r, guess, 5); dv = shot ? shot.dv : guess;`. `interceptImpulse` is Newton's method on a J2 coast and returns `null` when it does not converge to within the tolerance (here 5 m; default 12 iterations) (`src/physics/rendezvous/targeting.ts:44-48`). The special-phases report gave the location (`sim/rendezvous.ts:265-266`) and the silent fall-back to the first guess; the rest of this bullet was read in the code during consolidation and confirmed on 2026-11-26 (`src/physics/sim/rendezvous.ts:262-267`; `src/physics/rendezvous/targeting.ts:44-49`, where the defaults are tolerance 1 m and 12 iterations, and this call passes 5 m).
- Observed: by reading the code, a failed shot falls back to the first guess (an impulse from `raiseImpulse`) with no flag, event or message.
- Not confirmed: whether any profile, port or launch condition reaches the fallback; no flight was run to find one. The size of the resulting miss is unknown.

**2. The Lambert plan solved for two bodies and flown with J2.**
- Where: `lambert` is a two-body universal-variable solver, under one revolution (`src/orbit/maneuvers.ts:511-528`); the rendezvous target is a circle in the chaser's plane (`src/orbit/maneuver-setup.ts:98-101`); the plan is flown with the J2 toggle.
- Computed: the Orbit agent's re-implementation of the code's formulas (scratch script, not in the repo) gives an arrival miss of 15 km (i = 51.6 degrees), 28 km (98 degrees) and 58 km (equatorial) for a 400 to 800 km, 165 degree transfer with J2 on, and under 0.1 mm with it off.
- The script is not in the repository. PF-04's first step is to reproduce the miss with the app's own code in a test.
- Tests: `tests/maneuvers.test.ts:296` flies it with J2 off only.
- Not confirmed: the 15-58 km figures are from the agent's re-implementation, not from running the app; the report did not look at behaviour in a browser, so whether the page tells the user is unknown.

**Others named by a report as gaps** (the reports do not call them silent wrong answers; they are listed because they change a number without the user being told):

| Item | Where | Observed or computed | Not confirmed |
|---|---|---|---|
| CDM frames accepted without conversion | `src/orbit/cdm.ts:112-113` | The reader requires both states in the same frame and takes EME2000, GCRF or ITRF alike, with no conversion | The size of the effect on Pc |
| Readouts on a sphere | `src/orbit/real-sky.ts:72` | Geocentric latitude and height above a 6,378.137 km sphere while passes use the ellipsoid: up to 0.19 degrees, about 13 km low for the ISS (by hand) | Whether any user-visible comparison is affected |
| PSLV graded on a heading the corridor does not license | `src/physics/mission.ts:374`, `:1033-1034`, `:1153-1155`; V:1344-1347 | Model flies 191.0 degrees against the brochure's 140; 180-300 m/s of the 631 m/s shortfall is heading (the fleet agent's estimate); F12 does not mention it | The 180-300 m/s is an estimate, not a measurement |
| Plane error costs nothing in the station flight | `src/physics/rendezvous/plan.ts:139-143` | A launch cannot miss the station by plane; the 0.4 degree error quoted for MS-16 would cost about 54 m/s (by hand) | Not run |
| Stale bundled catalogue | `docs/IMPLEMENTATION-STATUS.md:463`; `src/provider/data-mode.ts:15` | Default mode offline; catalogue of 2026-09-26; builds up to 2026-11-25 carry it: sets 61 days old, about 90 km along-track by the app's own growth figure | Whether the deployed site carries a fresh catalogue today |
| Start state's elements taken as mean | `src/physics/propagator/propagate.ts:253` | The osculating elements of the start are used as mean elements in the mean method | Size not stated |

## 7. What an engineer's Orbit tool needs and the app lacks

From the Orbit report (the list of absent and partial capabilities in section 3.3), as the summary lists them:

- Numerical trajectory calculation that the user can call and that returns states (today it returns element histories, and only from the lifetime dialog and the re-entry tool).
- Gravity field beyond J4 (today J2-J4 zonals; no tesseral or sectoral terms).
- Finite-duration burns and targeting by iterative correction (today impulses only; the J2 shooting corrector is in Launch only).
- Multi-revolution or out-of-plane Lambert, and optimisation (today single revolution, grid minimum).
- Relative-motion tools (Clohessy-Wiltshire lives in Launch only).
- Orbit determination and covariance propagation (today a one-parameter ballistic fit; a table plus 1.5 km/day).
- GCRF/J2000 frames and the TT time scale (also TAI, TDB; today TEME and UTC only; no precession or nutation).
- Export of standard files: OEM, OPM, OMM, TLE (today read-only; only worksheet HTML out).
- Also in the Orbit report's table: station-keeping in Orbit (Build only), constellation and coverage in Orbit (Build only), batch or scripted runs in Orbit (the 13 WebMCP tools are all Launch), JPL DE ephemerides in the propagator, a full gravity-field choice and a choice of atmosphere beyond NRLMSISE-00.
- Plan S20 §5.4 ("Phase 3 — engineer's tools in Orbit") is the plan section for these tools. The summary notes that the earlier plan's item R4.6 covered only some of these and had nothing on frames, time scales, export, the full gravity field or a check against an independent tool.

## 8. What was not checked, and how sure each part is

Common to all five: no simulation, test or build was run. Every model figure not marked "by hand" or [R] is the documents' or the tests' assertion as written.

| Area | Not checked | Confidence statement in the report |
|---|---|---|
| Ascent dynamics core | No code or test run. Constants-only reading: `explicit-guidance.ts`, `nav/navigation.ts`, `rigid/faults.ts`, `flex.ts`, `bending.ts`, `slosh.ts`. Skimmed: `sim/burns.ts`, `sim/staging.ts`, `sim/ascent.ts`. Not read: rigid linear, tuning, pointing, orbit-prediction, surfaces, and the files of other areas (abort, Apollo, rendezvous, returns, descent, debris, escape). PHYSICS.md §2c-2g, §2k, §6-§9 not read; six-DOF files skimmed (recovery and historical sections not read); VALIDATION.md §1-§2 only. Engine and stage data not checked against their sources. USSA-76 reference values in the atmosphere check are from memory and approximate above 86 km. Lesson-specific and WebMCP dynamics settings not traced | The classes for six-DOF aerodynamics, mass properties, navigation and PEG/IGM rest on the absence of independent reference data, not on a measured error |
| Launcher fleet | No test or flight run. Six-DOF pins come from the heavy suite, which the documents say was once found stale (V lines 400-405). The other references were not opened (Ariane 64, H3, H-IIA, Vega-C, Proton, Falcon Heavy, Angara, Progress MS-19, the Soyuz manuals); of the Falcon 9 data set only CRS-16's events file and README were read. Payload ratings and site azimuth windows not compared with sources. The 222 / 131 / 91 recount and the PSLV heading effect are the agent's own reading and arithmetic. Out of scope: dynamics core, Monte Carlo accuracy, recovery and aborts, the historical vehicles (AS-506, Mercury-Redstone, `r7sputnik`, `vostokk`), the Build rating code | Five reference sources were fetched and compared on 2026-11-26 and the data sets matched: Falcon 9 CRS-16 (data set at commit b245d3b), ISRO PSLV-C52 brochure pp. 2, 4, 5 (read as images; no text layer), Rocket Lab Electron press kit, ULA Atlas V Juno booklet, RussianSpaceWeb Soyuz MS-25 |
| Orbit | No test, build or app code executed; none of the lifetime, sphere, stage or agency numbers reproduced. The SGP4/SDP4 port (1,088 lines), NRLMSISE-00 port (885) and screening time filter (563) not read line by line. The 15-58 km Lambert-with-J2 miss is from the agent's re-implementation. Not covered: behaviour in a browser; Thai and Russian texts; the Build-side use of `src/orbit` cores (eclipse, power, attitude, link, imaging, disposal, coverage); Launch's rendezvous; the lunar ephemeris. Whether the deployed site carries a fresh catalogue (records stop at the build of 2026-11-25) | Classes A for SGP4, passes and CDM probability rest on tests the agent read but did not execute |
| Special phases | Nothing executed. The real-flight reference values were not checked against outside sources. Not read beyond headers and cited lines: `apollo.ts`, `tli-guidance.ts`, `tli-target.ts`, `apollo-rendezvous.ts`, `module-entry.ts`, `crew-descent.ts`, the rigid return runtime; nor the ascent parts of PHYSICS.md §13 | Arithmetic marked "mine" in the report (54 m/s; 277 kg; 1,500-2,600 km) is the only thing it derived |
| Build and Structure | No test, build or flight run. Rating and sizing figures are the repository's recorded ones; several are held only in comments and may predate the 2026-10-01 Soyuz data change. Published values not re-fetched. Not read line by line: the point-mass ascent, planner and insertion probe, the lifetime propagator, the pass search, the coverage code, the six-DOF fingerprints. Not read: the Skyfield fixture, the user-interface texts, the CubeSat specification figures against the document itself | Spot-checks (section 4 of that report) confirmed by hand: engine-mass bases 32 / 6 / 5 / 8 / 4; design Δv 9,049 m/s; staging example; NAPA-2 ballistic coefficient; THEOS-2 camera figures; 28.4 Gbit/s; solar constants; fleet-median limits; Structure's 2,069 parts |
| This consolidation | The reference check in section 9 confirms that cited places exist and hold the named token or text; for the places used in sections 5 and 6 and the constants quoted in section 3 the cited lines were read. Physics, test results and the reports' recomputations were not re-verified. The plan S20 §2 says nine items are D; the reports mark D on more rows (wind, break-up limits, Monte Carlo as vehicle statistics, failures and break-up, the ISS station orbit and capture, Starship's splash location, R04 uncertainty, collision probability from element sets, six-DOF for an own vehicle, five satellite class templates, and the H3 and PSLV profiles). That count was not reconciled. On 2026-11-26 a second reader compared 60 claims of sections 3 and 4, all 28 rows of section 5 and both items of section 6 with the five reports: 55 of the 60 matched, and the ten differences it found are corrected in this text | |

## 9. Reference check

Method: for every code or document location cited in the five reports, the file was checked to exist, and a distinctive token or phrase was searched within 15 lines of the cited line. Locations used in sections 5 and 6 and the constants quoted in the tables were also read. Locations are grouped by file; "location as cited" lists the line ranges cited for that file. Status: `confirmed` (file and content found at the cited place), `moved` (content found elsewhere), `not found`. Total 465 locations: 460 confirmed, 1 moved, 4 not found.

The four not found are references a document or comment makes that the repository does not satisfy: the 0.4 degree plane test cited by PHYSICS.md:3253 (in `tests/watch-missions.test.ts`), the Starshine 2 full-equation run cited by VALIDATION.md:1880-1882, the Soyuz-2.1b profile and "acceleration within 1 %" checks cited by VALIDATION.md:819 and :878-880, and the `data-consistency` 1 % Isp assertion cited by the comment at `src/physics/vehicle.ts:248-249`.

| location as cited | status | note |
|---|---|---|
| `tests/design-ratings.test.ts:25-33, 144-154` | confirmed |  |
| `src/design/ratings.ts:247-249` | confirmed |  |
| `src/ui/build/ratings-budget.ts:10` | confirmed |  |
| `docs/VALIDATION.md:3242, 3215, 2939-2942, 3165-3180, 2767-2769, 2721-2722, 2991-2993, 3816, 810-812, 88-89, 295-316, 577-601, 621-628, 1585-1586, 1764-1774, 1784, 1494, 3369-3374, 2610, 2381-2383, 2032, 2037, 1514, 1717-1720, 1880-1882, 1863-1864, 2432, 2491-2492, 2593, 2597-2598, 2586-2587, 1650-1652, 1472-1485, 1519, 1525, 1569-1580, 59-70, 86-93, 99-131, 110-123, 15-17, 72-80, 77-79, 24-33, 109, 111-115, 351-354, 335-337, 396, 602, 400-405, 407-409, 549-599, 655-661, 715-727, 804-819, 819, 878-880, 1166-1167, 1182, 1195-1217, 1217, 1319-1342, 1344-1347, 1344-1379, 1382-1447, 1449-1455, 3079-3090` | confirmed | each cited range holds the searched token or text (several ranges were token-checked only); the Starshine and Soyuz-2.1b test claims are listed below as not found |
| `src/design/build-handoff.ts:19-25` | confirmed |  |
| `src/structure/types.ts:8-9` | confirmed |  |
| `src/structure/soyuz.ts:14-15` | confirmed |  |
| `docs/IMPLEMENTATION-STATUS.md:613, 605-606, 662-664, 706, 490, 463, 464, 466, 291, 313-317, 777-793` | confirmed | each cited range holds the searched token or text |
| `src/design/sizing.ts:17-24` | confirmed | `:17-24` is the prose naming the loss allowance and fairing causes; the 1,750 constant is in `mission.ts` |
| `src/physics/mission.ts:524, 536, 155-186, 172-177, 322, 358-375, 374, 720, 1208-1240, 1033-1034, 1153-1155, 155-185` | confirmed | `:524` and `:536` hold the 1,750 and 150 m/s allowances |
| `tests/design-sizing.test.ts:153-158` | confirmed |  |
| `src/physics/vehicle.ts:220-239, 308-313, 102-105, 529-532, 829-831, 102-107, 248-249` | confirmed | `:248-249` comment says `data-consistency` asserts 1 % (the assertion itself is not found; see below) |
| `src/design/remix.ts:44-51` | confirmed |  |
| `src/design/propellant.ts:14-17` | confirmed |  |
| `src/data/parts.ts:59-64, 209-210, 4-5, 331, 373, 467, 653, 655` | confirmed |  |
| `src/design/assemble.ts:168-171` | confirmed |  |
| `src/physics/aero.ts:6-20` | confirmed |  |
| `src/design/tunnel.ts:17-24` | confirmed |  |
| `src/design/satellite-model.ts:521` | confirmed |  |
| `src/design/satellite-link.ts:44, 40-49` | confirmed |  |
| `src/design/requirement-trades.ts:42-43` | confirmed |  |
| `src/orbit/disposal.ts:145-149, 118, 155` | confirmed | `:145-149` is the +/-30 % drag make-up comment |
| `tests/parts-engine-masses.test.ts:46, 57` | confirmed |  |
| `tests/parts.test.ts:96` | confirmed |  |
| `src/design/static-fire.ts:31-32` | confirmed |  |
| `tests/design-static-fire.test.ts:147` | confirmed |  |
| `tests/physics-core.test.ts:386, 378-394, 452-460` | confirmed |  |
| `src/data/vehicles.ts:535, 171-812, 171, 886, 1061, 497, 707, 396, 448, 360, 172-818, 60, 94-96, 222-230, 123, 256, 382, 683, 747, 11-27` | confirmed | `:171` and `:886` are the starts of `VEHICLES` and `HISTORICAL_VEHICLES`, `:1061` is `ALL_VEHICLES` |
| `src/design/optimal-staging.ts:132` | confirmed |  |
| `tests/design-budget.test.ts:48` | confirmed |  |
| `src/orbit/reentry.ts:52, 62-101` | confirmed | `:52` is `tumblingBoxArea` |
| `src/data/napa2.ts:27-29` | confirmed | `:27` is the size (0.2, 0.1, 0.3405) |
| `src/data/satellite-templates.ts:233` | confirmed |  |
| `src/orbit/link.ts:75-95` | confirmed |  |
| `src/orbit/power.ts:59` | confirmed |  |
| `src/physics/propagator/forces.ts:33, 60-136, 60-87, 28-29, 98-104` | confirmed | `:33` holds `P_SUN = 4.56e-6`, the 1,367 W/m2 value (named in the comment at `src/orbit/power.ts:55`); `:28-29` J3/J4 |
| `src/config/satellite-spec.ts:237` | confirmed |  |
| `src/physics/rendezvous/station.ts:49, 22-25, 23-24` | confirmed | `:7` mentions `issRaanAt` in a comment only |
| `src/physics/sim/rendezvous.ts:234, 314-344, 262-269, 265-266, 291-312, 520-561, 564-605, 566, 141, 616, 77-80, 589-593, 608-615, 400-485, 549, 348-358, 236, 281` | confirmed |  |
| `src/physics/rendezvous/targeting.ts:48-102, 6-10` | confirmed |  |
| `src/physics/rendezvous/profiles.ts:129-134, 49-79, 113-127, 136, 149-152, 94-109` | confirmed |  |
| `src/physics/rendezvous/plan.ts:137-147, 139-143` | confirmed |  |
| `src/i18n/en.ts:3565-3650, 14, 2252, 2652, 89` | confirmed |  |
| `src/data/satellites.ts:11` | confirmed |  |
| `tests/rendezvous.test.ts:187-191, 83-85` | confirmed |  |
| `docs/PHYSICS.md:2935, 4142-4148, 2661, 2718, 2844-2845, 2931, 3253, 2891, 2749, 2772, 3688-3692, 82-84, 3005-3006, 177-181, 189-192, 847-848, 859-860, 977-1004, 1173-1184, 3007, 3029-3033, 1374-1375, 1051-1058, 857-861, 1002-1009, 2948, 2828, 1793-1798, 1813-1821, 1558, 1566, 1965, 2008, 2008-2011, 2086-2106, 2086-2103, 2089, 2183-2185, 2231, 2233, 2366-2386, 2408, 2425, 2448, 2452, 3009` | confirmed | each cited range holds the searched token or text; the claims the code contradicts are in section 5 |
| `src/physics/sim/apollo.ts:334, 1195, 1358, 1428, 1588, 14-16` | confirmed |  |
| `src/physics/lunar/gravity.ts:6-8, 15-19` | confirmed |  |
| `src/physics/sim/debris.ts:611, 350-356` | confirmed |  |
| `src/physics/sim/failures.ts:12-14, 53-74` | confirmed |  |
| `src/physics/simulation.ts:1458-1470, 216-218, 1144, 1094, 1140, 1374, 690, 703, 728, 743-746, 1400-1403` | confirmed | `:1144` and `:1374` call `pointMassAcceleration` with `useJ2` false and true |
| `src/replay/explosion.ts:36-38` | confirmed |  |
| `src/physics/frame.ts:898-901, 19-22` | confirmed |  |
| `CHANGELOG.md:41-58` | confirmed |  |
| `src/replay/recorder.ts:862-889` | confirmed |  |
| `src/physics/rendezvous/ports.ts:30-33` | confirmed |  |
| `tests/heavy/rendezvous.test.ts:42-46, 48-84` | confirmed |  |
| `tests/heavy/historical-docking.test.ts:23` | confirmed |  |
| `tests/watch-missions.test.ts:70-74` | confirmed | `:70-74` holds the 180 s window test only |
| `src/physics/rigid/escape.ts:76-124, 78, 99, 108-109, 494-499, 323` | confirmed |  |
| `src/data/ephemeris-1969.ts:1-3, 26` | confirmed |  |
| `src/physics/lunar/ephemeris.ts:22` | confirmed |  |
| `src/physics/lunar/cislunar.ts:28` | confirmed |  |
| `src/physics/sim/ascent.ts:535` | confirmed |  |
| `src/types.ts:721, 742-745` | confirmed |  |
| `src/physics/rigid/config.ts:17-22` | confirmed |  |
| `src/ui/panel.ts:521, 1321, 2434-2443, 1005-1011, 2445-2466` | confirmed | `:2445-2466` holds model, wind and seed selectors; flex, control, navigation, faults, explicit guidance, dispersed run and Monte Carlo sections are added at `:1005-1011` |
| `src/physics/rigid/vehicle-data.ts:201-275, 284, 494-503, 378, 428` | confirmed |  |
| `src/physics/monte-carlo.ts:54-59` | confirmed |  |
| `src/main.ts:984-989` | confirmed |  |
| `src/session/core.ts:112` | confirmed |  |
| `tests/watch-missions-flights.ts:4-8` | confirmed |  |
| `src/physics/rigid/mass.ts:131-132, 262-291` | confirmed |  |
| `src/physics/rigid/aero.ts:1` | confirmed |  |
| `docs/SIXDOF-VEHICLE-DATA.md:16` | confirmed |  |
| `docs/SIXDOF-ACCEPTANCE.md:39` | confirmed |  |
| `src/physics/rigid/runtime.ts:490, 90-93, 112-119, 581` | confirmed |  |
| `src/physics/rigid/aero-tables.ts:242, 174-246` | confirmed |  |
| `src/physics/dispersion.ts:31-43, 172-180, 35-43, 49` | confirmed |  |
| `src/physics/constants.ts:7, 15` | confirmed |  |
| `src/physics/rigid/integrator.ts:114-134` | moved | file is now 98 lines; the RK4 step `integrateRigidStep` is at `:77`, the coupled RK4 comment at `:73`; cited in this document as `:73-98` |
| `src/physics/atmosphere.ts:25-33, 38-39, 49` | confirmed |  |
| `tests/engine-transients.test.ts:65-72` | confirmed |  |
| `src/physics/guidance.ts:67, 76, 169-170, 365` | confirmed |  |
| `src/physics/rigid/faults.ts:60` | confirmed |  |
| `src/physics/nav/sensors.ts:36-44, 71-74` | confirmed |  |
| `src/physics/rigid/slosh.ts:28` | confirmed |  |
| `src/physics/rigid/bending.ts:27` | confirmed |  |
| `src/physics/rigid/flex.ts:53` | confirmed |  |
| `src/physics/explicit-guidance.ts:52-65` | confirmed |  |
| `tests/rigid-mission-convergence.test.ts:27-37` | confirmed |  |
| `src/orbit/kepler.ts:122-131, 309-322, 214` | confirmed |  |
| `src/orbit/maneuvers.ts:511-528, 439` | confirmed |  |
| `src/orbit/maneuver-setup.ts:98-101, 22, 23` | confirmed |  |
| `src/ui/orbit/maneuver-panel.ts:357` | confirmed |  |
| `src/orbit/applications.ts:90-95, 197-215` | confirmed |  |
| `docs/ROADMAP-PART2-3.md:116` | confirmed |  |
| `src/orbit/sgp4.ts:1048-1057, 30-32` | confirmed |  |
| `src/orbit/earth-orientation.ts:77-83, 68-70` | confirmed |  |
| `src/provider/data-mode.ts:15` | confirmed |  |
| `src/orbit/passes.ts:214, 89` | confirmed | `:89` calls `temeToItrf` |
| `src/orbit/real-sky.ts:67, 72` | confirmed | `:67` holds `earthAngle(jd)`; whether it applies UT1 and polar motion was not traced further; `:72` confirmed |
| `src/orbit/uncertainty.ts:31-49, 115, 111-121` | confirmed |  |
| `src/physics/propagator/propagate.ts:211-291, 253, 160-182, 139-150, 160, 40, 242-246, 267, 15-18, 42-63` | confirmed | `:40` is `STEP_MAX` (5 days); the 300 km split is `PERIGEE_ARC_HEIGHT` at `:211` |
| `src/orbit/ballistic.ts:47-111, 47, 75` | confirmed |  |
| `src/orbit/conjunction.ts:211-258, 163-165` | confirmed |  |
| `src/orbit/cdm.ts:112-113, 123-135` | confirmed |  |
| `src/orbit/coverage.ts:148, 272` | confirmed |  |
| `src/orbit/mean-state.ts:6-7` | confirmed |  |
| `src/ui/orbit/sky-panel.ts:1530, 1432, 666-677` | confirmed |  |
| `src/ui/orbit/playground.ts:1199-1200, 1018-1037, 1225-1236, 1050` | confirmed |  |
| `src/ui/orbit/applications-panel.ts:71-108` | confirmed |  |
| `src/ui/lifetime.ts:34, 52, 98-101, 282-288, 323-346, 38` | confirmed |  |
| `src/mcp.ts:796-1372` | confirmed |  |
| `src/physics/ephemeris-series.ts:28-58` | confirmed |  |
| `src/physics/propagator/activity.ts:55-59` | confirmed |  |
| `tests/ballistic.test.ts:119` | confirmed |  |
| `tests/heavy/reentry-agencies.test.ts:34, 67` | confirmed |  |
| `tests/activity.test.ts:249` | confirmed |  |
| `tests/propagator.test.ts:150-151, 172-173` | confirmed |  |
| `tests/maneuvers.test.ts:296` | confirmed |  |
| `tests/sgp4.test.ts:107-108, 116, 135-137` | confirmed |  |
| `tests/passes.test.ts:77-80` | confirmed | `:77-80` asserts 2 s, 5 s, 0.02, 0.02; the 1 km bound and the 249-event count were not located in those lines |
| `tests/cdm.test.ts:42, 52` | confirmed |  |
| `tests/msis.test.ts:58, 89` | confirmed |  |
| `tests/heavy/screening-filter.test.ts:14-22` | confirmed | `:14-22` holds the identical-result comparison; the count 591 is not pinned |
| `src/data/iridium33-cosmos2251.json` | confirmed |  |
| `src/data/solar-daily.json` | confirmed |  |
| `tests/fixtures/passes/skyfield-passes.json` | confirmed |  |
| `tests/fixtures/conjunction/cara-cases.json` | confirmed |  |
| `docs/history/audit-2026-10-01-flight-profile.md:380, 293, 473, 545, 619, 737-742, 737` | confirmed |  |
| `src/physics/orbital.ts:294-312, 294-299` | confirmed |  |
| `src/physics/sim/staging.ts:291-295, 296-299, 252-253` | confirmed |  |
| `tests/validation/reference-data.ts:153-157, 73-75, 346-361, 286-291, 332-337, 219-237` | confirmed |  |
| `tests/validation/timelines.test.ts:23-31` | confirmed |  |
| `tests/validation/falcon9-webcast.test.ts:22-30` | confirmed |  |
| `tests/heavy/validation-timelines.test.ts:21-32` | confirmed |  |
| `tests/heavy/validation-falcon9.test.ts:20-28` | confirmed |  |
| `tests/fleet-harness.ts:50-55, 24, 125-129, 152-167, 154, 368-467, 449-467` | confirmed |  |
| `tests/fleet-defaults.test.ts:1001-1008, 762` | confirmed |  |
| `tests/watch-missions.test.ts` (0.4 degree plane test, cited by `docs/PHYSICS.md:3253`) | not found | searched for the 0.4 degree claim; only the 180 s window test exists (`:70-74`) |
| Starshine 2 full-equation run (cited by `docs/VALIDATION.md:1880-1882`) | not found | searched `tests/` for 142.6 and 132.8 and for a Cowell run of a sphere; no match in any test (hits only in fixtures) |
| Soyuz-2.1b profile check and "acceleration within 1 %" (cited by `docs/VALIDATION.md:819`, `:878-880`) | not found | searched `tests/` for 1.828, 43.2, 144.7; no test (the report searched the same tokens) |
| `tests/data-consistency.test.ts` 1 % Isp assertion (cited by the comment at `src/physics/vehicle.ts:248-249`) | not found | file exists; no sea-level Isp 1 % assertion found in it (it has a 10 % burn-time check at `:139` and ispSL > 0 checks) |
