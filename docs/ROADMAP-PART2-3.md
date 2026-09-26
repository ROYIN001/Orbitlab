# Roadmap: Part 2 (Orbit) and Part 3 (Build)

Written 2026-09-26 from the owner's planning conversation. It says what comes after the launch
simulator and in what order. The status of each item is kept in
[IMPLEMENTATION-STATUS.md](IMPLEMENTATION-STATUS.md); where the two disagree about what is
*done*, that file is right, and this one is right about what is *planned*.

## The idea

Orbitlab today is Part 1, **Launch**: 18 real vehicles flown from the pad to orbit, point-mass or
six-DOF, recorded and replayable, in English, Russian and Thai. It becomes one space program for
anyone interested, in three parts inside the same app:

- **Launch** (exists): put a vehicle into orbit.
- **Orbit**: what orbits are, how they are changed, what different satellites do up there.
- **Build**: design a rocket and a satellite, then launch them in Launch and operate them in Orbit.

The three make a loop: **Build → Launch → Operate in orbit → learn → redesign.**

The app gets two axes, **section × level**. Every section offers the three levels the launch part
already has:

| Level | Launch (exists) | Orbit | Build |
|---|---|---|---|
| **Watch** | real launches | narrated tours ("why GEO stands still", "how GPS finds you"), real satellites overhead | exploded views of real rockets and satellites |
| **Explore** | set up a mission | element sliders, maneuver buttons, challenges | remix a real rocket, a parts builder, satellite templates |
| **Engineer** | every parameter, six-DOF | elements, perturbations, Lambert and porkchop plots, link budget, coverage | parametric design, optimal staging, mass/power/Δv/link budgets, six-DOF, Monte Carlo |

Addresses follow the axes: `#/<section>/<level>`, for example `#/orbit/explore`; `#/home` is the
landing page.

## Principles

The owner's answers in the planning conversation, which every item below follows.

1. **Audience**: Thai school students, RTAF cadets and military personnel, for education. Not a
   thesis project.
2. **Static first.** The core app stays a static site that works fully offline: GitHub Pages now,
   and the `dist/` folder must be deployable as-is on a closed military intranet. Optional online
   services come later, behind interfaces (`DataProvider`, `DesignStore`) whose offline
   implementations are always there. **No accounts and no personal data** for now (Thai PDPA;
   many users are minors).
3. **Online and offline are separate modes**, chosen by the user and shown in the top bar.
   **Offline is the default** (owner, 2026-09-26): no request leaves the page until the user
   switches to online — no data, and not the web fonts either (offline, the interface uses the
   platform's own fonts).
   - Offline reads data snapshots bundled with the build, each marked "data as of …".
   - Online reads the live sources and falls back to the snapshot on any failure:
     - [CelesTrak](https://celestrak.org/NORAD/documentation/gp-data-formats.php) GP data as
       OMM JSON. Whether it sends CORS headers is **unverified** (the planning sandbox could not
       reach it), so the plan assumes it may not, and the snapshot is the fallback.
     - [NOAA SWPC](https://services.swpc.noaa.gov/json/) JSON for F10.7 and Kp. CORS verified
       (`access-control-allow-origin: *`).
     - [Launch Library 2](https://thespacedevs.com/llapi) for upcoming and past launches.
       Rate-limited for anonymous use, so it is read sparingly and cached.
   - **Semi-live data without a server**: a scheduled GitHub Actions build fetches the snapshots
     at build time and deploys them with the site. What it fetches is *not* committed to the
     repository; only a baseline snapshot is, so a build with no network has data (the owner,
     2026-09-26).
   - **Space-Track is never bundled or fetched** (its user agreement forbids redistribution);
     a user who has an account may import a file they downloaded themselves.
4. **Accuracy and realism first, then a game layer on top.** The game layer (constraints, scores,
   a story) never changes the physics. Every new physics module is validated against published
   data, the way [VALIDATION.md](VALIDATION.md) holds the launch physics to flight data, and the
   validation is a test in the repository. Anything estimated is labelled as an estimate.
5. **Military and security topics** are included where the information is public, and every one
   cites its source. Nothing classified, nothing operational beyond what the cited sources say.
6. **Scope is the Earth–Moon system.** No planets.
7. **The launch simulator does not change underneath.** Built-in flights stay bit-for-bit what
   they are; the full `npm test` stays green at every step.
8. **No new runtime dependency** without the owner's agreement (today there is one: three.js).

## Item identifiers

The repository already uses F, P, G, V, U, E and C for the launch roadmap, and the 2026-09-16
audit's items are cited in source comments as B1…B40. The new items take these prefixes:

| Prefix | Area | Note |
|---|---|---|
| **S** | structure (Phase 0) | |
| **O** | orbit core | |
| **R** | real satellites and live data | |
| **M** | military track | |
| **D** | design: the rocket and satellite builders | Called B01–B07 in the planning conversation; renamed because B collides with the audit's B1–B40 (B13, B17, B22, B26 and B40 are two digits already). |
| **T** | teaching: instructor mode and lessons | |
| **L** | the Moon | |
| **X** | the game layer | |

A roadmap item is always a letter and **two** digits. Single-digit L1 and L2 are the Earth–Moon
Lagrange points, S1–S9 are the source references of
[SIXDOF-VEHICLE-DATA.md](SIXDOF-VEHICLE-DATA.md), and T with a number is a mission time.

Two launch-roadmap items that were never scheduled are taken over here: the lunar transfer the
propagator's comments call **C05** becomes L03, and the worksheets `src/ui/report.ts` calls
**E05** become part of T01 and T03.

## Phase 0: Structure

The ground the other phases stand on. No new physics.

| Item | What | Acceptance |
|---|---|---|
| **S01** section × level shell | `AppSection` = launch \| orbit \| build beside the existing level (`src/ui/app-mode.ts`). Routes `#/<section>/<level>`; `#/home` stays. The old `#/watch`, `#/explore` and `#/engineer` open the launch section and the address is rewritten to `#/launch/<level>` (owner, 2026-09-26). The last section and level are remembered. The home page presents the three sections. Orbit and Build show honest "in development" screens that say what is coming, from this document, in all three languages. | Back works; mission links (`?m=…`, U01) still open; three columns on a desktop, two on a tablet, one on a phone with nothing behind a drawer; the keyboard shortcuts unchanged; `tests/app-mode.test.ts`. |
| **S02** custom vehicles in a mission | `MissionConfig` may carry an inline `vehicleSpec`. One resolver is used wherever a mission's vehicle is resolved, including the flight worker, the auto-tuner and the Monte Carlo workers. Mission file version 2 embeds the spec; version 1 files are upgraded. `src/config/validation.ts` bounds-checks a spec. WebMCP's `configure_mission` does **not** accept a spec yet (owner, 2026-09-26). Everything that keys off a vehicle id or an engine name is listed, and a custom vehicle gets generic behaviour there. | A deep copy of Falcon 9 and of Soyuz-2.1a under a new id flies a recording identical to the original's, point-mass and six-DOF. Built-in flights unchanged. |
| **S03** orbit hand-off | A DOM-free `OrbitHandoff`: r, v in the simulator's ECI frame, the Julian date, the spacecraft (mass, area, C_D, C_R, kind, propulsion), a label and the originating mission. JSON-serialisable. The lifetime dialog consumes it; a **Continue in Orbit** action carries a flight that reached orbit into the Orbit section, which shows the orbit's elements. | A hand-off built from a recorded flight survives a JSON round trip and its elements match the flight's. |
| **S04** data provider, online and offline | A persisted offline \| online preference (default offline) with an indicator in the top bar. A DOM-free `DataProvider` with an offline implementation reading dated snapshots under `public/data/` and an online one that fetches with a timeout and falls back to the snapshot. The service worker precaches the snapshots and caches online answers. No live data feeds the physics yet. | Tests with fakes, as `tests/pwa.test.ts` does. |
| **S05** local design storage | A `DesignStore` interface for user designs (vehicles now, satellites later), a guarded local implementation, and export/import as a versioned `.orbitlab.json` file. Cloud or intranet stores would implement the same interface later. | Round trip, version upgrade, denied storage. |

## Phase 1: Orbit core

| Item | What | Validation |
|---|---|---|
| **O01** orbit playground | Sliders for a, e, i, Ω, ω (and the anomaly); the orbit in 3-D and its ground track; Kepler's three laws shown on the orbit (equal areas, the period against a); Newton's cannon from a mountain top, speed up until the shot goes round. Watch: narrated tours such as "why a geostationary satellite stands still". | The elements ↔ state conversion of `src/physics/orbital.ts` round-trips; period and vis-viva against the closed forms; ground-track repeat of a known repeating orbit. |
| **O02** maneuver planner | Maneuver nodes with prograde, normal and radial components; ready-made Hohmann, bi-elliptic, plane change, combined plane change, phasing, GTO→GEO with the apogee burns split, a low-thrust spiral (Edelbaum), and a deorbit burn to a target perigee. Engineer: Lambert's problem and a porkchop plot for an Earth-orbit rendezvous. | Δv and transfer times against worked examples (Curtis, *Orbital Mechanics for Engineering Students*; Vallado, *Fundamentals of Astrodynamics and Applications*); Lambert against Vallado's test cases; Edelbaum against its closed form. |
| **O03** continue in orbit | The S03 hand-off made full: the orbit a flight reached opens in the playground and the planner with the spacecraft's own propellant, and the lifetime analysis is one of the Orbit section's tools. | The hand-off's elements equal the flight's at the hand-off time. |
| **O04** applications | **GEO communications**: the footprint; a dish's look angles from the user's location, e.g. Thaicom at 78.5°E and 119.5°E from Bangkok; GEO against LEO latency; a link budget in Engineer. **Earth observation from a sun-synchronous orbit**: swath, revisit, ground sample distance, LTAN. **Thai satellites**: THEOS-2, Thaicom, and the RTAF's NAPA-1 and NAPA-2, each with its sources. | Look angles against a published calculator's worked examples; link budget against a textbook example (Maral & Bousquet, *Satellite Communications Systems*); swath, revisit and GSD against *Space Mission Engineering: The New SMAD*. |

## Phase 2: Real satellites and the military track

| Item | What | Validation |
|---|---|---|
| **R01** SGP4 | The SGP4/SDP4 propagator for GP element sets, in TypeScript, no dependency. | The test vectors of Vallado, Crawford, Hujsak and Kelso, "Revisiting Spacetrack Report #3" (AIAA 2006-6753), every case, to their published tolerance. |
| **R02** snapshots and the scheduled refresh | The offline snapshot of chosen GP groups (stations, Thai satellites, GNSS, weather, a debris set) and a scheduled GitHub Actions build that refreshes it at build time and deploys it, without committing data. A user may import a TLE/OMM file, including one they downloaded from Space-Track. | The snapshot's parser against CelesTrak's own format documentation; the "data as of" date always shown. |
| **R03** passes | Passes of a chosen satellite over the user's location (entered by hand, never sent anywhere): rise, culmination, set, visibility against the Sun. | Pass times against an independent SGP4 implementation's look angles computed offline and kept as fixtures. |
| **R04** uncertainty from the element set's age | The position uncertainty grows with the time since the element set's epoch, drawn as a widening band and stated as an estimate. | The growth rate against published TLE accuracy studies, cited. |
| **R05** space weather | F10.7 and Kp from NOAA SWPC (online) or the snapshot (offline) feed the lifetime density model, `src/physics/propagator/density.ts`, in place of the low/mean/high setting. | The P07 lifetime cases re-run with measured indices, against their published re-entry dates. |
| **M01** SSA and conjunctions | Space situational awareness: the catalogue around an orbit, close approaches between two objects, miss distance and time of closest approach, with the R04 uncertainty. | Closest-approach geometry against a constructed case with a known answer; a published conjunction, cited. |
| **M02** overflight timing | When the imaging satellites of the public catalogue pass over a place, and at what elevation — the public-source planning question of when a site is overflown. | Against R03's passes. |
| **M03** re-entry prediction | An uncontrolled re-entry predicted from the element sets and the density model, with the window widening honestly; case study: the Long March 5B core stages. | Predictions against the published re-entry times, cited. |

## Phase 3: Rocket builder

| Item | What | Validation |
|---|---|---|
| **D01** parts catalog | Engines, tanks, fairings and interstages as a catalogue extracted from `src/data/vehicles.ts` (about 45 real engines). The 18 real vehicles are re-expressed on the catalogue, so the fleet tests validate it. | Every re-expressed vehicle flies the same recording as today; the fleet matrix stays green. |
| **D02** remix a real rocket | Start from a real vehicle and change it: stretch a stage, swap an engine, add boosters. | A remix identical to its original flies identically (S02's test). |
| **D03** parts builder | Build a vehicle from parts. Point-mass by default; six-DOF marked experimental for custom vehicles. Live Δv, thrust-to-weight and mass fractions, and plain-language warnings ("the upper stage cannot lift itself off the pad"). | Δv against the rocket equation stage by stage; the warnings against constructed cases. |
| **D04** test facilities | A static fire (the engine model's thrust and Isp against pressure, start-up and tail-off); a "wind tunnel" from the aerodynamic tables, `src/physics/rigid/aero-tables.ts`; a flight readiness review using the existing pre-flight feasibility verdict. | Static fire against the engine data's published figures; the tunnel against the tables the six-DOF flight uses. |
| **D05** parametric design and optimal staging | Size a vehicle from a payload and an orbit; the optimal division of Δv among stages. | Optimal staging against the analytic Lagrange-multiplier solution for stages of given Isp and structural ratio (Curtis ch. 11). |

## Phase 4: Satellite builder and instructor mode

| Item | What | Validation |
|---|---|---|
| **D06** satellite subsystems | Power against eclipse (arrays, battery depth of discharge), propulsion Δv, attitude determination and control, a communications link budget, the payload's ground sample distance, and the drag area that feeds the P07 lifetime. Satellite templates from the existing classes (`src/data/satellites.ts`). | Eclipse fraction against the cylindrical-shadow closed form; the budgets against *Space Mission Engineering: The New SMAD* worked examples. |
| **D07** requirements-driven design | Start from what the mission must do (revisit, resolution, lifetime, data volume) and derive the satellite and the orbit, showing each trade. | The derived numbers against the D06 and O04 models. |
| **T01** instructor scenarios | An instructor writes a scenario with assessment criteria (reach this orbit with at least this margin; design a satellite that meets these requirements) and hands it out as a link or a file. Nothing is sent to a server. | Scenario files round-trip; criteria evaluate on constructed flights. |
| **T02** checking a student's file | The instructor's copy re-flies a student's submitted mission or design and checks it against the criteria. Results are compared with a tolerance, because `Math.*` can differ in the last bits between JavaScript engines. | A file flown on two engines (Node and Chromium) passes within the tolerance. |
| **T03** lesson packs | Lessons matched to the Thai science curriculum (สสวท., IPST), built on the three sections. | Reviewed by the owner. |

## Phase 5: The Moon

| Item | What | Validation |
|---|---|---|
| **L01** a better Moon ephemeris | Today's Moon (`src/physics/propagator/ephemeris.ts`, Montenbruck & Gill's low-precision series) is off by a few hundred kilometres, which is fine for a third-body perturbation and not for going there. Replace it with Meeus, *Astronomical Algorithms* ch. 47 (truncated ELP-2000/82), or an embedded span of JPL DE440 Chebyshev coefficients, whichever meets the accuracy at an acceptable size. | Against JPL Horizons positions over the span, to a stated tolerance. |
| **L02** central-body switching | The propagator switches its central body between the Earth and the Moon at the sphere of influence (or integrates in one frame with both); lunar J2, and higher degree and order for the frozen orbits at 27°, 50°, 76° and 86°. | The frozen orbits stay frozen over months; lunar J2's nodal regression against the closed form. |
| **L03** getting there | Trans-lunar injection, a free-return trajectory, Chandrayaan-style phasing loops, lunar orbit insertion, and in Engineer the near-rectilinear halo orbit. Takes over C05. | TLI Δv and flight time against the published figures of Apollo and Chandrayaan missions. |
| **L04** powered descent | Descent and landing on the Moon, reusing the landing guidance the recovered stages fly. | Against published descent profiles, cited. |
| **L05** return and skip entry | Trans-Earth injection, entry at lunar return speed, and a skip entry. | Entry corridor against published Apollo and Artemis I figures. |
| — | Watch missions such as Chandrayaan-1 on PSLV-XL, flown with the vehicle the fleet already has. | As the Watch launches are tested today. |

## Phase 6: The game layer

| Item | What |
|---|---|
| **X01** challenges and scores | Challenges with constraints and scores on top of the physics, never inside it. |
| **X02** campaign | A campaign from the first orbit to the Moon. |
| — | An optional backend for scores or shared designs, decided then, behind `DesignStore`. |

## The military track

Public sources only, each cited. Spread over the phases above rather than a phase of its own:

- **Space situational awareness** and conjunctions (M01).
- **Overflight timing** of imaging satellites (M02).
- **Re-entry prediction** (M03), e.g. the Long March 5B core stages.
- **GNSS resilience**, conceptually: why jamming and spoofing work, geometry and DOP.
- **SATCOM planning**: footprints, look angles and link budgets (O04).
- **Humanitarian assistance and disaster relief imagery**: revisit and resolution (O04, D07).
- **Debris case studies** of the 2007 and 2021 anti-satellite tests: the consequences only — the
  debris clouds, their lifetimes and the conjunctions they caused.
- **Thai space assets**: THEOS-2, Thaicom, NAPA-1 and NAPA-2 (O04).

## Architecture notes for Phase 0

- **Routing** (`src/ui/app-mode.ts`): a route is a section and a level; `home` has no section.
  The hash is the source of truth. A legacy hash is rewritten with `history.replaceState`, so it
  adds no history entry.
- **One vehicle resolver**: a mission's vehicle comes from its inline spec when it has one, else
  from the catalogue by id (`missionVehicle`, `src/data/vehicles.ts`). Nothing else in the code
  looks a mission's vehicle up by id. What S02 found keyed off the vehicle id or an engine name
  is in the next section.
- **DOM-free cores, thin DOM parts**: the hand-off, the data provider, the design store and the
  route logic are plain modules with unit tests; the screens that show them are thin.
- **The hand-off** (`src/orbit/handoff.ts`, S03): the state vector in the simulator's ECI frame and
  its Julian date, the spacecraft (mass in orbit — a spacecraft that raised its own orbit is
  lighter by what it burned —, the class's estimated area, C_D and C_R, its engine and the
  propellant left), a label and the mission document it came from. JSON with a format and a
  version; `parseHandoff` refuses anything not wholly sound. `src/orbit/` is where the Orbit
  section's modules live, and the propagator's import guard (tests/propagator.test.ts) lets them
  use it.
- **Data, offline and online** (`src/provider/`, S04): a `DataProvider` loads a dataset by id; the
  offline one reads `public/data/<dataset>.json` (a snapshot: format, version, the dataset's
  data, its "as of" — the newest reading — and when it was fetched), the online one fetches the
  sources with an 8 s timeout and falls back to the snapshot on any failure, saying why. A
  dataset's parser is the same for the online answer and for `scripts/refresh-snapshots.ts`, which
  writes the snapshot (`npm run snapshots`). The service worker precaches the snapshots with the
  build and answers the online hosts network-first from their last answer. A baseline snapshot is
  committed so a build with no network has data (the owner, 2026-09-26: it stays committed;
  R02's element-set snapshot follows the same rule); R02's scheduled build refreshes it at build time
  without committing. Checked on 2026-09-26 with curl: SWPC, CelesTrak's GP JSON and Launch
  Library 2 all answer `access-control-allow-origin: *` — CelesTrak, which the planning could not
  reach, can be read straight from the page.
- **Designs** (`src/design/design-store.ts`, S05): `DesignStore` is asynchronous (`list`, `get`,
  `save`, `remove`) so an intranet or cloud store can implement it later; `LocalDesignStore` keeps
  designs in localStorage under one key and rejects a save it cannot keep (`unavailable`, `full`)
  rather than losing someone's work. A design is checked by its kind's own check before it is kept
  or read (a vehicle's is S02's), and leaves the browser as `<name>-<kind>.orbitlab.json`
  (`orbitlab.design`, version 1), read back all or nothing — half a rocket is not a rocket.
  No builder uses it yet; Phase 3's will.
- **Everything a user makes is a file first**: missions (U01), designs (S05) and scenarios (T01)
  are versioned JSON documents that open offline, so the closed-intranet deployment loses
  nothing but the live data.

## S02: what keys off a vehicle id

A custom vehicle (`MissionConfig.vehicleSpec`) has an id no catalogue vehicle has. Everything the
code looked up by vehicle id was found and given a rule, listed here so nothing is papered over.
`VehicleSpec.derivedFrom` names the catalogue vehicle a custom one was made from (a copy, or a D02
remix); `vehicleDataId(spec)` is that id, or the vehicle's own. "Origin" below means that vehicle;
a custom vehicle without one gets the generic behaviour.

| What | Keyed by | A custom vehicle gets |
|---|---|---|
| Resolving the mission's vehicle: simulation, flight worker, auto-tuner, Monte Carlo job and workers, setup panel, WebMCP, narration | `vehicleById(cfg.vehicleId)` | `missionVehicle(cfg)`: the inline spec. The workers receive it inside the config (structured clone). |
| Six-DOF available | `supportsRigid(id)`: catalogue membership | six-DOF: the rigid data are built from the spec itself. |
| Six-DOF RCS installation (Falcon's, and `vegac:p120c`'s roll pair) | vehicle id + stage id | its origin's; else the generic installation by stage id. |
| Six-DOF trim share (Soyuz-2.1a 0.65, others 0.35) | vehicle id | its origin's; else 0.35. |
| Six-DOF stages that can fly home (`RIGID_RECOVERABLE`) | vehicle id + stage id | its origin's; else none in six-DOF (point-mass recovery follows `recoverable`, a spec field). |
| Flexible body: launcher stages, solid propellant | catalogue lookup by id, cached per id | read from the spec itself (`RigidVehicleGeometry.launcherStageIds`, `solidPropellantIds`). The per-id cache would have gone stale across two custom vehicles with one id in the same worker; the lists now travel with the geometry. |
| Flight to the station (G07) | `vehicleId === 'soyuz21a'` | available when its origin is Soyuz-2.1a. |
| Launch escape (G06) | `escapeSystem`, a spec field | allowed only on a vehicle derived from one that has it. |
| Random failure's seed | launch time + vehicle id | its own id: a different vehicle draws a different failure. The one thing a copy does not share. |
| Livery, texture seed, plume colour (Proton/Angara hypergolics) | vehicle id | its origin's; else the stage's own colours and the engine's propellant. |
| Localized stage names | `stage.<vehicle>.<stage>.name` | its origin's translation for a part it did not rename; else the name in the spec. |
| Vehicle notes and manufacturer | `vehicle.<id>.notes` | the text in the spec, untranslated: it is the designer's. |
| Rated-orbit line in the setup panel | `RATING_ORBITS[id]` | none. |
| Pads (the R-7 pads at Baikonur) | the first stage's `profile`, a spec field | follows the spec. |
| Engine layout (nozzle pattern) | stage id | the catalogue stage's pattern when it keeps a catalogue stage id, else a generic ring from the engine count. **Open for D03:** a custom stage that keeps `s1` but changes its engine count keeps the nine-engine octaweb. |
| Propellant family and mixture ratio | stage id | as the engine layout: by stage id, else the model's default. |
| Exhaust colour (Merlin gas generator) | engine name | follows the spec's engine name. |
| Fault presets (G08) | a catalogue vehicle each | offered as before; one that belongs to another vehicle says so. |

Checked by tests/custom-vehicle.test.ts and its two six-DOF companions: a deep copy of Falcon 9
and of Soyuz-2.1a under a new id flies a recording identical to the catalogue vehicle's, point
mass and six-DOF, to the end of the mission, and through the flight worker's transport; only the
recorded vehicle name differs when the copy is renamed. A mission file's version 2 carries the
spec (tests/mission-file.test.ts); `src/config/vehicle-spec.ts` bounds-checks it, and every
catalogue vehicle passes those bounds. WebMCP's `configure_mission` takes no spec (the owner,
2026-09-26) but keeps one the mission already carries.
