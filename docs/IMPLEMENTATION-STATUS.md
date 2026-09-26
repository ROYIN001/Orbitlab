# Where Orbitlab stands

Updated 2026-09-26. This file states the current position only; how it was reached is in the
dated records under [history/](history/), and where those disagree with this file, this file is
right.

## What the app is

A browser simulator of orbital launches: 18 launch vehicles from 16 launch sites (and four more in the site table, flown by no vehicle yet), flown by
closed-loop ascent guidance and a burn sequencer to the orbit a mission asks for, drawn in 3-D
from a flight recording that can be replayed and scrubbed. Four modes — Home, Watch
(ready-made launches with a director's camera), Explore and Engineer (every guidance
parameter, the six-DOF flight controls, telemetry and CSV export). English, Russian and Thai
throughout.

Since S01 this is the **Launch** section of three ([ROADMAP-PART2-3.md](ROADMAP-PART2-3.md)):
the top bar switches the section (Launch, Orbit, Build) and the level (Watch, Explore, Engineer),
at `#/<section>/<level>`; the old `#/watch`, `#/explore` and `#/engineer` open Launch and are
rewritten. **Orbit** opens on its playground (O01): an orbit by its elements, in 3-D about the
turning Earth, as its ground track, and Newton's cannon, with Kepler's three laws in numbers, the
secular J2 drift, a repeat-ground-track design tool at the Engineer level and a narrated
seven-step tour at Watch. Its maneuver planner (O02) makes Hohmann and bi-elliptic transfers,
plane changes, GTO→GEO in one or several apogee burns, phasing, deorbit burns, Edelbaum's
low-thrust spiral and the user's own burns. At the Engineer level it adds a Lambert rendezvous
chosen on a porkchop plot. Every plan is drawn and flown. With a spacecraft (the one a flight
handed on, or one described by hand) each plan is budgeted against its tanks (O03): the
propellant and the engine time of each burn, and how far short a plan is when they run dry. The
lifetime analysis can be run on any orbit in the playground. **What satellites do** (O04) has three
parts:

- Communications from GEO: where a dish points from a city or typed-in coordinates, the
  footprint, the delay and, at the Engineer level, the link budget.
- Earth observation: a camera's swath, ground sample distance, how far apart the day's tracks
  are and how far tilting reaches.
- Thailand's satellites: THEOS, THEOS-2, NAPA-1, NAPA-2 and the Thaicom fleet, from public
  sources, each with its catalogue orbit to put in the playground.

A flight's orbit arrives there through **Continue in Orbit** (S03). **Real satellites** (R01–R02),
the playground's other half, draws the satellites of a catalogue group where SGP4 puts them now:
the space stations, Thailand's satellites, the navigation and weather satellites, and the debris
of Fengyun-1C. The group is shown in 3-D and on the map, the one picked with its orbit, track and
element set. A file of element sets can be read in the page. What the section will hold next is
listed under the playground. **Build** is still an "in
development" screen that lists what is coming, from the roadmap, and nothing more.

- **Physics** ([PHYSICS.md](PHYSICS.md)): a rigid-body (six-DOF) model with finite actuators
  for every vehicle, which is the default, with each stage's chambers, steering, thrusters and
  tanks from its own data and aerodynamic tables built from each configuration's own layout
  ([SIXDOF-VEHICLE-DATA.md](SIXDOF-VEHICLE-DATA.md)); point-mass flight for every vehicle as
  the alternative.
  Engines have start-up and tail-off transients, and every cut-off anticipates the tail-off.
- **Threading**: the physics and the flight recorder run in a Web Worker; the page only draws.
  `?physics=inline` (or a browser without module workers) runs them on the main thread, with
  the same flight.
- **Launch geometry**: every direction is flown inside its site's range-safety corridor; an
  inclination the corridor does not reach directly is flown with a dogleg of up to 5°, and the
  setup panel shows what it costs.
- **Recovery** ([PHYSICS.md §8.1–8.2](PHYSICS.md)): a recovered stage can be flown back with a
  boostback to Landing Zone 1 or 2, to a drone ship, or to the Starbase tower's arms, and
  Starship can fly a suborbital test flight whose ship comes home to a splashdown. The Watch
  launches fly Bandwagon-1, Arabsat-6A and Flight 5 that way; Explore and Engineer offer the
  same choices (off by default).
- **The R-7 as drawn** (`src/render/soyuz.ts`): Blok A's taper from 2.05 m at its engines to
  2.95 m, the strap-ons leaning in against it, the open truss up to Blok I, Blok I's aft skirt
  falling away in three petals ten seconds after Blok A, the frost on the oxygen tanks shedding
  in the first half minute, and on a crewed launch the escape tower and the fairing's four grid
  fins, the tower pulling away at T+114.5 s. Drawing only; the physics is unchanged.
- **Launch escape** ([PHYSICS.md §8.3](PHYSICS.md)): a crewed Soyuz's escape tower, fairing
  motors and spacecraft separation, flown as rigid bodies to the descent module on its
  parachutes and soft-landing motors. It fires on any failure that is losing the rocket with the
  crew on it, on the `launchAbort` failure and on the Engineer mode's Abort button; the pad fire,
  strap-on collision and separation failure of Soyuz T-10-1, MS-10 and 18a are failure modes and
  Watch launches.
- **Soyuz-2.1a's fairing** is the 4.11 × 11.43 m unit with its own adapter cone down to Blok I,
  drawn and flown (it was 3.7 × 10.1 m): the stack stands 46.85 m, 51.0 m with the escape tower,
  inside the owner's 46.3–51.38 m, and a crewed head with the tower is 15.59 m.
- **Baikonur's pads** (roadmap V05, `src/render/pads.ts`): an R-7 from Baikonur is drawn on
  Site 31/6, where every crewed Soyuz has flown from since MS-16 (2020), and the three Watch
  aborts on Gagarin's Start, Site 1/5, where T-10-1, 18a and MS-10 flew from (`padId` in the
  mission; see below). Both have the КБОМ "Тюльпан" launch system turned to the launch azimuth —
  the rocket hanging in the table by its strap-ons, four support arms that swing clear on their
  counterweights as it rises, the two cable masts already back — the service gantry's halves
  lowered, the rail line to the assembly building with the erector and its locomotive at its
  door, the bunker, the propellant store and the lightning masts; Gagarin's Start has its quarry
  and the Korolev and Gagarin cottages. Drawing only: every pad launches from the site's own
  point, so the choice changes no trajectory. Any other vehicle at Baikonur keeps the generic pad.
  Every pad's arms and masts now react to the height of the vehicle's base: in six-DOF the state
  is the centre of mass, 14.5 m up a Soyuz on the pad, and the generic R-7 pad's arms had been
  standing half open before the engines lit.
- **Smoke and the vapour cone** (roadmap V03, `src/render/trails.ts`, `vapour.ts`): the exhaust
  trail is drawn from the flight's own recording — a puff for every engine burning in every
  recorded frame, the core's, each strap-on's, a stage flying home, an escape motor — fixed where
  it was left, widening and fading with age, and carried by the flight's own wind: the six-DOF
  crosswind or shear, nothing when the flight is calm (the default) or point-mass. So a scrub or a
  replay draws the same trail. What it looks like is the propellant's: solid motors a thick white
  column that hangs for minutes, kerosene a thin grey one (darker behind a Merlin's gas
  generator), hydrogen almost nothing but a contrail in humid air, methane little, the
  hypergolic stages a reddish-brown haze. Separations leave their own puffs: a liquid strap-on
  venting its oxygen (the Korolev cross), a solid booster's separation motors, a stage's
  separation plane. The pad's cloud has a third layer that lingers for minutes, heavier after
  solid motors, drifting with the surface wind. Through Mach 0.85–1.15 below about 13 km a
  condensation collar forms at the fairing's shoulder (a ship's, on Starship), strong at humid
  coastal sites and faint over the steppe. Watch names the speed of sound and a solid booster's
  separation. Drawing only; the physics is unchanged.
- **A flight to the station** (roadmap G07, [PHYSICS.md §9.2](PHYSICS.md)): a Soyuz MS (the
  crewed spacecraft on a Soyuz-2.1a) launched to the ISS orbit can fly on to the station and dock — the two-orbit
  (about 3 h, as Soyuz MS-28), four-orbit (about 6 h, as TMA-19M) or two-day (as MS-01)
  profile, to Rassvet, Poisk, Prichal or Zvezda's aft port. The ascent inserts at 200 × 242 km;
  the station is phased to the plan as flight control phases it; the phasing burns are the
  flights' own, the transfer and the braking are solved on the J2 coast, and Kurs flies the
  approach, flyaround, stationkeeping and final approach in six degrees of freedom to a contact
  judged against the docking system's limits. Docking comes at 3:13 (MS-28: 3:10), 6:22
  (TMA-19M: 6:21) and 2 d 02:37 (MS-01: 2 d 02:35). The ISS is drawn with its ports and their
  docking targets; the exterior camera keeps the station in the picture near it, the onboard
  view becomes the Soyuz's docking TV camera, and the telemetry panel plots the motion in the
  station's LVLH frame. In the Engineer mode TORU takes the approach over by hand. Watch has
  "Soyuz MS: at the station in 3 hours".
- **Reference frames in 3-D** ([PHYSICS.md §2k](PHYSICS.md)): a Frames menu by the camera
  buttons draws the body and air-path axes, the normal Earth and flight-path axes, the orbital
  R, S, W and ECI/ECEF on the flight, with α, β, pitch, yaw, roll, the flight-path angle, the
  track and the sidereal angle as arcs and values, in ISO 1151 or ГОСТ 20058-80 symbols.

### Baikonur's pads: what is sourced and what is estimated

| | Site 1/5, Gagarin's Start | Site 31/6 | Source |
|---|---|---|---|
| Position | 45.920°N 63.342°E | 45.996°N 63.564°E | en.wikipedia (drawn at the site's own point) |
| Pit | 250 m long, 100 m wide, 45 m deep | 135 × 32 m, 24 m deep | Site 1: Roscosmos, elementy (50 m deep in Техника—молодёжи 1991); Site 31: "scaled down", at least 20 m deep where the service cabin fell in 2025 (Habr, iXBT); its length and width are estimates |
| Direction the pit runs | 300° | 250° | estimates: no source gives them |
| Launch table opening | 15 m | 15 m | ESA, on the Kourou copy of the Baikonur design |
| Support arms | lean 17° in while they hold the rocket; swing 60° out | the same | КБОМ study (CyberLeninka); the swing is an estimate |
| Rocket's base below the table's deck | 4.5 m | 4.5 m | estimate |
| Cable masts | 27 m and 38 m, back by T−10 s | the same | retracted at T−35 s and T−15 s (NASA prelaunch timelines); heights estimates |
| Service gantry | two 50 m halves, lowered | the same | lowered at about T−40 min (NASA); size an estimate |
| Assembly building | Site 2, 1.75 km along the rail, 130 × 48 × 30 m | structure 40, 650 m, 110 × 42 × 26 m | distance 1.6–2 km (GlobalSecurity, en.wikipedia), 600 m (ESA, uncertain); sizes estimates |
| Bunker | 200 m from the pad | 150 m | Site 1: 4glaza, elementy; Site 31: estimate |
| Service cabin niche | — | shut in the gas duct's wall | Habr, iXBT |
| Cottages of Korolev and Gagarin | by the assembly building at Site 2 | — | Advantour (2.5 km from the pad; drawn nearer) |
| Lightning masts, floodlights, tanks, erector, locomotive | | | estimates |

### Smoke and the vapour cone: estimates

Everything V03 draws is an estimate from launch photographs and climate, not a measurement:
each exhaust's colour, opacity, lifetime, width and the altitudes it thins out over
(`LOOKS` in `src/render/trails.ts`), the separation puffs, each site's humidity
(`SITE_HUMIDITY`: Kourou 0.95 … Jiuquan 0.2), the vapour cone's Mach band (0.85–1.15), its
ceiling (13.5 km) and its size, and the lingering cloud's lifetime (up to 8 min). The trail
moves only with the physics' wind; the calm default leaves it where it was made.

## What is experimental

- **Falcon 9 first-stage recovery in six-DOF.** The acceptance landings pass at three
  integration steps, and 16 of 18 terminal-restart stress trajectories land (the other two end
  honestly as impacts), but the stage's cold-gas supply runs out before T+180 s and the outcome
  still depends on the separation state ([SIXDOF-ACCEPTANCE.md](SIXDOF-ACCEPTANCE.md)).
- **Soyuz-2.1a's late first-stage pitch in six-DOF**: from about T+89 s, as the dynamic
  pressure falls, the aerodynamic angle limit releases a closed-loop pitch command that has run
  far below the vehicle (7° against 33°), and the vehicle pitches down from 60° to 33° above the
  horizon over twenty seconds at up to 3 °/s. It is not a thrust effect and is left for the
  guidance work (G01).
- **Flying back and flying home.** The returns and the ship's descent are flown on estimated
  data (return aerodynamics, the flaps, the catch envelope, the landing propellant), and
  Flight 5's ship comes down about six minutes early and 15–25° of longitude short of the real
  splashdown (PHYSICS.md §8.2).
- **Vulcan's ascent** inserts well away from its planned parking orbit (about 137 × 1 200 km
  against 250 × 500 km) and makes the target with its later burns. Every Vulcan mission in the
  fleet matrix reaches its target; the ascent itself is a guidance-quality item for G01.

## How it is tested

`npm test` runs the regular suite (vitest): 1 454 tests in 109 files, 15 to 20 minutes on four cores. Among it:

- **Fleet acceptance** (tests/fleet-defaults.test.ts): 195 vehicle × orbit × payload
  combinations; 126 are flown with each vehicle's default guidance and must reach their target
  orbit, and 69 are excluded, each with its measured reason — 33 outside a site's range-safety
  corridor, 23 beyond the vehicle's capability, 13 needing an architecture the vehicle does not
  have. No combination is excluded as a guidance failure.
- **Six-DOF**: rigid-body mechanics, actuators, staging, replay, recovery and mission
  convergence between 0.01 s and 0.005 s integration steps, and every vehicle's six-DOF data
  held to its flight data — mass closure, three-axis authority, chamber thrust
  (tests/rigid-*.test.ts).
- **The physics worker**: its main-thread mirror is held frame for frame to an in-process
  recording (tests/session.test.ts).

`npm run test:heavy` runs the seven delivered-orbit cases with wind and a reduced-flux mass flow
model, and Soyuz MS-10's and 18a's aborts flown to the crew on the ground (tests/heavy/, about
15 minutes). `npm run test:sixdof-fleet` flies the fleet matrix as
rigid bodies: its 126 accepted cases, each vehicle's first case in crosswind and shear, and Long
March 2D's real mission — 161 cases, about 2 h 40 min on four cores
([SIXDOF-ACCEPTANCE.md](SIXDOF-ACCEPTANCE.md)). `npm run typecheck` and `npm run build` complete the
gate.

## Roadmap

The owner's roadmap (2026-09-22) selected 27 items to do now, in this order. The first ten are
on branch `claude/awesome-fermi-r6ntep`; the watch-mode missions (10b) on
`claude/exciting-bardeen-2v14fj`.

| Item | | Item | |
|---|---|---|---|
| F03 delivered-orbit matrix in the repository | done | G04 Bode, step response, margins | |
| F05 simulation split into modules | done | E04 controller tuning mode | |
| F01 range-safety corridor and dogleg | done | G02 inertial navigation and Kalman filter | |
| F04 break-ups with Δv left | done | G08 control-system failures | |
| P02 engine start-up and tail-off | done | G01 PEG and IGM guidance | |
| F07 glow on 30 fps screens | done | G05 Monte Carlo insertion accuracy | |
| F02 physics in a Web Worker | done | V04 Soyuz vehicle detail | done |
| F06 documentation | done | G06 Soyuz launch escape system | done |
| P03 per-vehicle aerodynamic tables | done | V05 Gagarin's Start pad | done |
| P01 six-DOF for all 18 vehicles | done | V03 vapour cone and booster smoke | done |
| Watch mode: flown missions with booster landings | done | G07 ISS rendezvous and docking | done |
| P05 slosh, bending and notch filter | done | C01 historical missions | |
| U07 ГОСТ 20058-80 notation | done | | |
| G03 attitude-loop inspector | | | |
| E02 live equations panel | | | |
| E01 reference frames in 3-D | done | | |

Twenty further items are kept for later, once these are done.

Eight of the "interesting" items are being done alongside them on branch
`claude/interest-group-8`, in this order:

| Item | |
|---|---|
| U01 mission links and mission files | done |
| U03 install as an app, work offline (PWA) | done |
| C04 more launch sites (Yasny, Kapustin Yar, Svobodny, Palmachim) | done — no vehicle flies from them yet |
| U06 chart and flight-report export | done |
| U02 comparing two flights | done |
| V01 sound | done |
| P07 long-term orbit perturbations | done |
| V02 physically based sky | done |

### Parts 2 and 3: Orbit and Build

[ROADMAP-PART2-3.md](ROADMAP-PART2-3.md) (2026-09-26) plans the Orbit and Build sections in six
phases. Phase 0, the structure, is on branch `claude/eloquent-meitner-mvmno4`:

| Item | |
|---|---|
| S01 section × level shell | done |
| S02 custom vehicles in a mission | done |
| S03 orbit hand-off | done |
| S04 data provider, online and offline | done |
| S05 local design storage | done |

Phase 1, the Orbit core, continues on the same branch:

| Item | |
|---|---|
| O01 orbit playground | done: Kepler and first-order J2, held to the geostationary, GPS, Landsat WRS-2 and Sentinel-2 orbits ([VALIDATION.md](VALIDATION.md) §5) |
| O02 maneuver planner | done: every transfer held to Vallado's and Curtis's worked examples and to its closed form ([VALIDATION.md](VALIDATION.md) §5) |
| O03 continue in orbit | done: a flight's orbit and spacecraft carry on in the playground; plans are budgeted against its own propellant by the rocket equation, and the lifetime analysis is open to any orbit there |
| O04 applications | done: pointing a dish, coverage, delay and the link budget from GEO; a camera's swath, detail and reach from SSO; Thailand's satellites from public sources, each cited ([VALIDATION.md](VALIDATION.md) §5) |

Phase 2, real satellites and the military track, continues on the same branch:

| Item | |
|---|---|
| R01 SGP4 | done: SGP4/SDP4 and the two-line element format, `src/orbit/sgp4.ts` and `src/orbit/tle.ts`. Every line of the AIAA 2006-6753 verification output is reproduced ([VALIDATION.md](VALIDATION.md) §6) |
| R02 snapshots and the scheduled refresh | done: **Real satellites** in the Orbit section, from a catalogue of CelesTrak's element sets (stations, Thailand's satellites, GNSS, weather, Earth imaging, the Fengyun-1C debris). The catalogue is bundled (`public/data/satellites.json`), fetched online at most once in two hours, and refreshed daily by the deploy without committing. Files in TLE and every OMM form can be read in the page. Held to CelesTrak's six formats and to published orbits ([VALIDATION.md](VALIDATION.md) §6) |
| R03 passes | done: the passes of the satellite picked over a place (a city, or coordinates typed in), for three days: rise, highest point and set, with directions and heights, and when it can be seen (sunlit, in a dark sky). Held to Skyfield: times within 0.35 s, angles within 0.004° ([VALIDATION.md](VALIDATION.md) §6) |
| R04 uncertainty from the element set's age | done: an estimate of how far off the satellite picked may be, from its orbit class at the epoch (Flohrer et al. 2008) and 1.5 km a day of growth (Levit & Marshall 2011), shown as a value, as time along the track, and as a band widening with the set's age; at Engineer each pass's timing ([VALIDATION.md](VALIDATION.md) §6) |
| R05 space weather | done: the orbit-lifetime analysis reads the Sun's activity as measured by default — GFZ's monthly F10.7 and Ap since 1947, then NOAA SWPC's months, the last days' flux and Kp, then SWPC's forecast (expected, high or low side) — or ECSS's fixed levels. The density's level is NRLMSISE-00's as ECSS tabulates it, at the height above the ellipsoid. Seven spheres of published mass and size (1999–2010) come down within 25 % of their days in orbit on record, 13–22 % early for six ([VALIDATION.md](VALIDATION.md) §6) |
| M01 SSA and conjunctions | done: **Close approaches** in Real satellites screens every loaded object against the satellite picked (apogee–perigee filter, sampled range refined to 0.1 ms), with the miss in radial, along-track and cross-track axes and a two-dimensional probability of collision from R04's estimated uncertainty and a size the user gives. The probability reproduces the three published values for the Iridium 33–Cosmos 2251 conjunction data of 9 February 2009 within a tenth of a decade ([VALIDATION.md](VALIDATION.md) §7) |
| M02 overflight timing | done: **Overflights of** a place in Real satellites lists every pass of the group's satellites (a new group, the Earth-imaging satellites of CelesTrak's Earth Resources set) whose highest point is above a chosen elevation: time, height and direction, off-nadir angle, daylight, heading; at Engineer the distance from the track, the local solar time and the timing uncertainty. The passes are R03's; the daytime overflights of Landsat 8 and 9, Sentinel-2A/B/C and THEOS-2 over Bangkok fall at their published local times ([VALIDATION.md](VALIDATION.md) §7) |
| M03 re-entry prediction | |

## Known limitations

- The orbit playground (O01) carries an orbit by Kepler's equation and J2's secular drift to
  first order, nothing more: no drag, no Sun or Moon, no higher harmonics, and its inclinations
  for a repeat orbit come out 0.02° to 0.08° below the published ones
  ([VALIDATION.md](VALIDATION.md) §5). For how an orbit decays, the lifetime analysis (P07) is
  the tool. Its 3-D view needs WebGL; without it the ground track and Newton's cannon still work.
- The maneuver planner's burns are impulsive: no finite-burn or gravity losses. A burn longer
  than a tenth of an orbit is flagged as such. Edelbaum's spiral assumes near-circular orbits
  and a constant acceleration, and its propellant is budgeted as one burn of its Δv. A
  rendezvous target is always in the chaser's plane.
- The applications' Thai satellites fly their catalogue orbit (as of 2026-09-26), not where they
  are today; **Real satellites** (R02) shows where they are. The link budget's starting values
  are an example, not any satellite's.
- Real satellites (R02): TEME is taken as the program's inertial frame, and the Earth is turned
  by mean sidereal time alone, with no UT1 − UTC or polar motion; that moves a point on the
  ground by up to about 400 m, less than an element set's own error. They are not at the Watch
  level yet. An imported file is kept only while the page is open.
- At about 1100 × 650 px the Engineer mode's panels squeeze the 3-D viewport out.
- The physics has been compared with flight data for eleven of the eighteen vehicles: Falcon 9
  against webcast telemetry of five flights, the others against published timelines
  ([VALIDATION.md](VALIDATION.md)). No disagreement pointed at the equations. As a result,
  Falcon 9's first stage flies its published masses and its six-DOF pitch programme is fitted to
  the flights. Among what is left and recorded:
  - Electron's second stage burns ~25 % short.
  - Falcon Heavy's first stages cut off ~18 % early.
  - PSLV-XL's first stage is 29 % slow at separation.
  - H3's first stage flies far flatter than planned.
  - Most fairings come off 10–50 % early.

  Long March 2D, 3B/E and 5, Vulcan, Soyuz-2.1b and Starship are not compared; see
  "Assumptions and limitations" in [PHYSICS.md](PHYSICS.md).
