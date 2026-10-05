# Where Orbitlab stands

Updated 2026-10-03. This file states the current position only; how it was reached is in the
dated records under [history/](history/), and where those disagree with this file, this file is
right.

## What the app is

A browser simulator of orbital launches: 21 launch vehicles (three of them historical, roadmap C01) from 16 launch sites (and four more in the site table, flown by no vehicle yet), flown by
closed-loop ascent guidance and a burn sequencer to the orbit a mission asks for, drawn in 3-D
from a flight recording that can be replayed and scrubbed. Four modes — Home, Watch
(ready-made launches with a director's camera), Explore (the same physics, set up in three
steps under a pre-flight light, with the guidance computed and shown rather than asked for,
failures as challenges, and a card at the end of the flight; `src/ui/explore.ts`) and Engineer
(every guidance parameter, the six-DOF flight controls, telemetry and CSV export). English,
Russian and Thai throughout.

Startup retries a rejected high-performance GPU request with the browser's
default preference, preserving the requested rendering attributes. Unavailable
WebGL 2 gets localized recovery instructions and a reload action; unrelated
startup failures retain their own diagnosis. Flight controls wait for successful
startup. Browser- or driver-disabled WebGL still needs device-side recovery.

Stage 2 of the October improvement pass makes the core journey clearer: full preflight
explanations remain visible in Explore, the Launch button exposes them to assistive technology,
the first-use guide labels its independent sequence as tips, and the phone section switch
includes descriptions of each level. Ratings and readiness workers compute language-free
results, localized on the page; teacher authoring and result-checking pages load on demand.
The earlier measurements and unresolved scientific findings remain in
[the Stage 1 baseline](stage1-2026-10-02/README.md).

Stages 3–4 add **My work** in the top bar: a prediction-and-comparison notebook, model limits
and local validation-report viewing, classroom offline readiness and version-safe repair,
and combined project backups with explicit collection replacement and recovery. Pack pages
show source provenance and pending teacher/native-language review. The new tooling does not
certify the physics or mark the outstanding Stage 1 scientific discrepancies as resolved.
See [the implementation record](history/2026-10-03/STAGE3-4.md) and
[the review checklist](LESSON-REVIEW-CHECKLIST.md).

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
listed under the playground.

**Build** (Phase 3, D01–D05) takes rockets apart and puts them together, on a parts catalogue from
which the 21 vehicles are themselves assembled (D01). Its Watch level draws any of them to scale,
taken apart or assembled, with a catalogue card for each part, the stage-by-stage figures and a
five-step tour. Explore remixes a real rocket (D02) or builds one from parts (D03), with the
design's warnings in plain words, payload ratings computed by flying it, saving, export and
import, and **Fly it**, which hands the design to Launch as a mission, point-mass unless six-DOF
(experimental) is asked for. Engineer tests a rocket on a test stand, in a wind tunnel and in a
flight readiness review (D04), finds the best split of a Δv among stages, and sizes a launcher
from a payload and an orbit (D05). The figures are the launch physics' own, and estimates are
labelled as such; the known gaps are under "Known limitations" below.

Since Phase 4, Build designs satellites too (D06, D07): a switch above the level turns Explore
and Engineer to **Satellite**. Explore designs one from NAPA-2, a THEOS-2-class imager or one of
five classes of the catalogue, and works out every figure as it is typed — the eclipse, the array and
battery, the Δv budget, the torques and the wheel, the downlink, the camera — for a design date,
saying in words what fails and what is an estimate. **Send to Orbit** puts the satellite in its
orbit in the Orbit section with no launch; **Fly it** flies it to its orbit on a rocket in Launch,
as the mission's own satellite, with the Launch section's verdict before the click. Engineer is the
satellite bench, a tab for each subsystem and the lifetime against the 25-year rule, and **Start
from requirements** works the orbit and the satellite out from what a mission must do. The
**lessons** page gained two pages for teachers (T01, T02): a scenario writer that makes a flight or
a design lesson and hands it out as a file or a link, and a check that flies a class's results
again on the teacher's own computer. Five lesson packs matched to Thai and Russian curricula (T03)
are listed there as drafts awaiting the owner's review.

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
  falling away in three petals some nine seconds after Blok A (T+296 s, as flown), Blok I's flame through the truss
  before the core has gone, the frost on the oxygen tanks shedding
  in the first half minute, and on a crewed launch the escape tower and the fairing's four grid
  fins, the tower pulling away at T+113.5 s. Drawing only; the physics is unchanged.
- **Soyuz-2 on its real flight** ([VALIDATION.md §3](VALIDATION.md), 2026-10-01): published
  engines and stage loads; the strap-ons' step to 81 % and their commanded cut-off, the core's
  commanded cut-off, a pad start; a crewed flight's escape tower carried to T+113.5 s and Blok I's
  aft skirt; the R-7's stored pitch programme in both flight models to the core's separation, then
  the closed loop. The crewed fairing goes at 79.0 km (flown 79) and the core at 157.0 km (157);
  the insertion is 199.9 × 239.8 km (200 × 242). The method, for the other vehicles, is
  [FLIGHT-PROFILE-METHOD.md](FLIGHT-PROFILE-METHOD.md).
- **Launch escape** ([PHYSICS.md §8.3](PHYSICS.md)): a crewed Soyuz's escape tower, fairing
  motors and spacecraft separation, flown as rigid bodies to the descent module on its
  parachutes and soft-landing motors. It fires on any failure that is losing the rocket with the
  crew on it, on the `launchAbort` failure and on the Engineer mode's Abort button; the pad fire,
  strap-on collision and separation failure of Soyuz T-10-1, MS-10 and 18a are failure modes and
  Watch launches.
- **Soyuz-2 hot staging and Soyuz-2.1a's two payload sections** ([VALIDATION.md §3](VALIDATION.md),
  2026-10-01, second pass): Blok I lights 0.24 s before the core's cut-off and fires through the
  truss, the core separating 1.02 s after it (`StageSpec.hotStage`). Soyuz-2.1a flies its cargo
  payload section (11S517A2, 3.0 × 10.4 m, fairing at T+183.2 s, the Progress MS cyclogram) for
  every payload but a crew, and a crewed launch the crewed one (11S517A3, 3.0 × 9.5 m under the
  tower, fairing at T+153.3 s, its own cyclogram; `VehicleSpec.crewedProfile`). A Progress MS
  payload flies its own programme (`cargoShipProfile`) into 193 × 240 km. The crewed stack
  stands 50.9 m with its tower, its head 15.5 m. The fairing motors are KTRV's; MS-10's core
  loses its thrust at the strike.
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
| Position | 45.920°N 63.342°E | 45.996°N 63.564°E | en.wikipedia (drawn at the site's own point; a mission that names the pad, flown from it — C01) |
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
- **Six-DOF for a rocket of one's own** (Build, D03). Point mass is its default; six-DOF flies it
  with generic steering and thrusters where the real rockets have their own. What is still
  missing is under "Known limitations" below.
- **Flying back and flying home.** The returns and the ship's descent are flown on estimated
  data (return aerodynamics, the flaps, the catch envelope, the landing propellant), and
  Flight 5's ship comes down about six minutes early and 15–25° of longitude short of the real
  splashdown (PHYSICS.md §8.2).
- **Vulcan's ascent** inserts well away from its planned parking orbit (about 137 × 1 200 km
  against 250 × 500 km) and makes the target with its later burns. Every Vulcan mission in the
  fleet matrix reaches its target; the ascent itself is a guidance-quality item for G01.
- **The lesson packs** (T03) are drafts. Their curriculum codes, their Thai and Russian wording,
  the cohort each is for and the naming of the RTAF Academy and NAPA-1 wait for the owner's
  review; each pack says so on the page.
- **A satellite's figures are sizing estimates** (D06, D07), each marked on screen: the class
  templates carry their class's typical mass, engine and size, not any satellite's; the THEOS-2
  class carries eoPortal's 425 kg, labelled an estimate; NAPA-2's radio is a CubeSat X-band
  transceiver's (Palo et al.) and its camera one that gives its published 5 m, neither its own; the
  drag area is a tumbling mean; the receiving station is NASA's 11.28 m dish; whether a satellite
  fits its fairing is an estimate, a note that does not stop a launch.

## How it is tested

`npm test` runs the regular suite (vitest): 9 906 tests in 255 files, 20 to 30 minutes on four cores
(measured 2026-10-01 at the end of Phase 4: 1 615 s with nothing else running; on a machine shared
with other work a run took 50 minutes, and tests that ran past their time limits under that load
passed alone). Among it:

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
- **The Build section** (tests/d01-*.test.ts, tests/parts*.test.ts, tests/design-*.test.ts): the
  parts catalogue emits the fleet main flies, value for value, and 27 point-mass flights hash as
  they did before it; the builder's figures are the flight model's own or the rocket equation
  worked by hand ([VALIDATION.md](VALIDATION.md) §8).
- **The satellite builder and instructor mode** (tests/eclipse, power, satellite-attitude, link,
  imaging, d06-*, d07-*, live-stepping, instructor-mode, recheck*, design-lesson*, lesson-pack*):
  each satellite core against published worked examples; the satellite model as the cores' own
  answers; the catalogue satellites held to their recorded values and a copied satellite flown as
  the original; D07 against D06 and O04; a live flight against the headless one, bit for bit; and
  the re-check against committed fixtures in Node, with its Chromium half in the `recheck` browser
  journey ([VALIDATION.md](VALIDATION.md) §9).

`npm run test:heavy` runs the seven delivered-orbit cases with wind and a reduced-flux mass flow
model, Soyuz MS-10's and 18a's aborts flown to the crew on the ground, Soyuz MS-16 and MS-25 flown
from their real second of launch to the station, and the screening's time filter against the full
search over its whole sweep (tests/heavy/, about 20 minutes), and D01's 21 six-DOF fingerprints,
160 s of flight each (about four minutes more); for Phase 4, a copied communications satellite and
a copied Soyuz MS flown as the originals in six-DOF (about 20 minutes on a shared machine) and the
lesson packs' three six-DOF lessons (about 6 minutes).
`npm run test:sixdof-fleet` flies the fleet matrix as rigid bodies: its 126 accepted cases, each
vehicle's first case in crosswind and shear, and Long March 2D's real mission — 161 cases, about
2 h 40 min on four cores ([SIXDOF-ACCEPTANCE.md](SIXDOF-ACCEPTANCE.md)). `npm run typecheck` and
`npm run build` complete the gate.

## Roadmap

The owner's roadmap (2026-09-22) selected 27 items to do now, in this order. The first ten are
on branch `claude/awesome-fermi-r6ntep`; the watch-mode missions (10b) on
`claude/exciting-bardeen-2v14fj`.

| Item | | Item | |
|---|---|---|---|
| F03 delivered-orbit matrix in the repository | done | G04 Bode, step response, margins | done |
| F05 simulation split into modules | done | E04 controller tuning mode | done |
| F01 range-safety corridor and dogleg | done | G02 inertial navigation and Kalman filter | done |
| F04 break-ups with Δv left | done | G08 control-system failures | done |
| P02 engine start-up and tail-off | done | G01 PEG and IGM guidance | done |
| F07 glow on 30 fps screens | done | G05 Monte Carlo insertion accuracy | not started |
| F02 physics in a Web Worker | done | V04 Soyuz vehicle detail | done |
| F06 documentation | done | G06 Soyuz launch escape system | done |
| P03 per-vehicle aerodynamic tables | done | V05 Gagarin's Start pad | done |
| P01 six-DOF for every vehicle (18 when chosen; C01's three have it too) | done | V03 vapour cone and booster smoke | done |
| Watch mode: flown missions with booster landings | done | G07 ISS rendezvous and docking | done |
| P05 slosh, bending and notch filter | done | C01 historical missions | parts 1–5, 6a–6e of 7 (below) |
| U07 ГОСТ 20058-80 notation | done | | |
| G03 attitude-loop inspector | done | | |
| E02 live equations panel | done | | |
| E01 reference frames in 3-D | done | | |

C01 historical missions is done in seven parts on branch `claude/c01-historical-missions`:
(1) real flights on the fleet's vehicles, on their real dates — Soyuz MS-16 and MS-25,
ORBCOMM-2, Angara-A5 1L, Hayabusa2 — in Watch and in Explore/Engineer, with the station's
measured node on those days ([PHYSICS.md §13](PHYSICS.md)) — done; (2) Crew Dragon and Demo-2, flown on Falcon 9 without a fairing, and a drone-ship entry burn that spends the stage's spare propellant (the lone Falcon 9 stage never landed on the ship before) — done;
(3) each flight compared with the real one — the caption, a table under the result and on
Watch's end card, the real events on the telemetry charts, and the dockings timed; and a lone
first stage's drone-ship reserve sized for its return, found on Demo-2 — done;
(4) Sputnik 1 and Vostok 1 on the first R-7s (8K71PS, 8K72K), vehicles of historical flights
kept out of the fleet matrix and held to their own flights, and Vostok 1 flown on from its orbit to
Gagarin on the ground — the TDU-1's retro-fire at its flown time, the instrument module broken up on its
own, the sphere and Gagarin each down on their own parachutes in the wind measured that morning, the
sphere within a kilometre of its place in six-DOF, the app's model, and within about 4 km in point-mass as the app steps it ([PHYSICS.md §13.6](PHYSICS.md)) — done; (5) Mercury-Redstone 3 from LC-5,
the Mercury capsule flown home on its own after a suborbital cut-off (retros, drogue, main,
splashdown), within 11–16 km of Freedom 7's splashdown in both models, flown from LC-5 itself — done; (6) Apollo 11 on
Saturn V, the whole mission to the Moon and back, in seven steps: (6a) the Saturn V to the parking
orbit, with planned engine shutdowns, the mixture shift and the jettisons, LC-39A as in 1969 — done;
(6b) the S-IVB's restart for the Moon onto the flown conic and the transposition, docking and the
LM's extraction at the flown times — done; (6c) the Moon in the model — JPL's DE441 Moon and Sun for
the week, the Moon turned as the IAU turns it, their pull on the flight, the injection aimed at the
flown conic's perigee, the service engine's evasive burn and the midcourse correction worked out as
the flight's was, to the lunar orbit insertion within 40 km and a metre per second of the flown
approach, and the Moon drawn — done; (6d) lunar
orbit and the landing — the Moon's degree-2 field, LOI-1 turned into the plane over the landing site
and LOI-2 at the flown times, Eagle undocked and flown on its own beside Columbia, DOI to the targeted
perilune, the powered descent through P63, P64 and P66 with the descent engine's fixed throttle and
throttle recovery, to within a few metres of Tranquility Base and 10 kg of the flown landed mass, and
the LM, the CSM and the ground at the site drawn — done; (6e) the LM's ascent and docking — the
ascent engine's P12 guidance off the Moon, the lift-off timed for the CSM, the coelliptic sequence (CSI, CDH,
TPI, two midcourse corrections, the braking gates) on the LM's thrusters to within minutes of the flown
times and a metre or two a second of the flown burns, the docking, the ascent stage's jettison, and the
descent stage left at Tranquility Base drawn — done; (6f) home and splashdown — the transearth
injection aimed as the ground aimed it, at the entry the flight flew, the coast home and its correction,
the command module on its own, its lifting entry steered by a prediction of the rest of the flight
against the range to the flown splash point, the drogues and the mains, into the Pacific within a
minute of the flown time and a few kilometres of the flown point, and the command module, its parachutes
and the service module drawn — done; (6g) the viewer and the documents — the ascent stage drawn in its
own shape, the lift-off watched looking down at the descent stage it leaves, the braking and the
station-keeping from behind Eagle with Columbia ahead, the entry's glow, the station-keeping at 10×, the
whole flight in about forty minutes of Watch, and the README — done; (7) the fleet acceptance and the
documents.

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
| M03 re-entry prediction | done: **When it will come down**, for a satellite with a perigee under 700 km: its element set's mean orbit carried down by the mean-element propagator with the Sun as measured (R05), with the mass and cross-section the user gives, and the agencies' ±20 % window of the time left. The case study, the four Long March 5B core stages predicted from their first element sets, all came down inside their windows (errors −1.4 to +18.9 %) ([VALIDATION.md](VALIDATION.md) §7) |

Phase 2.5, the physics made finer and the gaps of Phase 2 closed, on the same branch:

| Item | |
|---|---|
| NRLMSISE-00 and daily indices | done: the density is the full NRLMSISE-00 (a port of Brodowski's public-domain C, held to the Fortran and to pymsis), at the place and hour, with the day's F10.7, its 81-day mean and the day's Ap (GFZ, since 1954), then SWPC's forecast; the orbit is carried in steps of five days with the step's mean indices. Seven spheres within 25 %, six still 8–23 % early ([VALIDATION.md](VALIDATION.md) §6) |
| UT1 − UTC and polar motion | done: TEME is turned into the Earth-fixed frame by the sidereal time of UT1 and the pole's wander (IERS finals2000A, bundled, refreshed by the deploy); held to Vallado et al.'s example ([VALIDATION.md](VALIDATION.md) §6) |
| Passes as they are seen | done: the air's refraction lifts a low satellite (Sæmundsson), and a pass carries its brightness from the satellite's standard magnitude and phase ([VALIDATION.md](VALIDATION.md) §6) |
| M01: messages, a whole catalogue, the encounter plane | done: a conjunction data message (CCSDS 508.0-B-1, KVN) read from a file gives the probability from its own covariances, held to NASA CARA's twelve test conjunctions; the screening runs in a Web Worker, so a catalogue of 30 000 objects read from a file is screened with the page in use; a time filter written on SGP4's own terms searches each pair only where it can meet, giving exactly the full search's approaches 7 to 34 times sooner for the ISS and a 700 km satellite against 30 000 objects (none sooner for a deep-space primary), and a near-Earth object's height band is now SGP4's own, which an object coming down no longer leaves; **Show it** draws the other object's orbit and the meeting in 3-D and on the map, and the encounter plane; a probability under 10⁻¹⁰ is said to be so ([VALIDATION.md](VALIDATION.md) §7) |
| M02: what the instrument can see | done: the published geometry of the instruments on 95 imaging satellites (64 entries), each sourced — a fixed camera's swath, an agile one's pointing limit, a radar's incidence band and side — judges each overflight; **Show on the map** draws the pass and the ground the instrument reaches. Swaths held to their fields of view (two of the four added on 2026-09-28 missed the 2 %, a finding), and Landsat, Sentinel-2 and Sentinel-1 to their published revisits. Every agile camera is judged: Cartosat-3 by NRSC's 26° across the track, Cartosat-2C to 2F by ISRO's 26° for their series, CO3D by the 15° of roll of CNES's acquisition plan, a planning limit ([VALIDATION.md](VALIDATION.md) §7) |
| M03: the drag fitted, transfer orbits, more cases | done: the ballistic coefficient fitted to the element set's decay rate or to a history of sets read from a file (seven spheres within 30 % of their known C_D A/m); an eccentric orbit carried by Cowell with the Sun and the Moon; 66 rocket stages of 2023–2025 and NAPA-2 as new cases (a finding: from first sets, half come down inside the window, 33 of 66; the criterion fixed before, on B from the first set's decay, was missed and could not have been met, only 14 first sets giving a B); the stages' mass is GCAT's dry mass since the fix-up, and a screen written after the results (a first set not the stage's, a kick stage built to fire after deployment, an eccentric perigee lowered more than drag can) is reported beside the unscreened counts (32 of 61); where it may come down drawn on the map. The test fixed before it ran, the agencies' way (B fitted to two NORAD sets a week apart, 100 re-entries of 1985–2004 from J. McDowell's archive): 81 % inside at 30 days and 85 % at 10 (met), 79 % at 5 days (missed by one object; median error under 2 % at each) ([VALIDATION.md](VALIDATION.md) §7) |
| Real satellites at the Watch level | done: the Watch tour goes on to eight steps with the real catalogue: the station and its passes, THEOS-2, the navigation and weather satellites, the imagers, the Fengyun-1C debris and the Long March 5B re-entries |
| Worksheets from real cases | done: a sheet and its answer key for the Iridium 33–Cosmos 2251 collision, the Long March 5B stage of Tianhe and THEOS-2 over Bangkok, worked with the published data and this app's physics, in three languages, each with its units and option letters in its own script. Graded as lessons 6.1–6.3 (E03, track 6): Real satellites opens at the case's tool, and the typed answers are graded by the sheet's own key and tolerances with the data frozen when the lesson opens ([USER-GUIDE](USER-GUIDE.md) §18) |
| Checks in a real browser, and the daily refresh | done: online mode in Chromium through this machine's proxy. NOAA's four answers were read both times. CelesTrak's nine lists, asked all at once, came back three without the cross-origin header a page needs; asked one at a time two hours later, one of nine did — so it is not the asking at once alone, and whether CelesTrak's edge or this machine's proxy drops the header could not be told apart from here. Either way the whole catalogue fell back to the snapshot for one list, so now a list that cannot be read keeps only its own group from the snapshot (the data window and the panel say which), and a host that refuses (403, 429) is asked nothing more. A 30 000-object screening was timed with the CPU slowed fourfold (below). The deploy's refresh step ran on the builds of 27 September (fresh CelesTrak and SWPC data at 13:02 UTC); the scheduled daily build (cron 03:17 UTC) runs, but late: GitHub started it at 09:55 UTC on 28 September and 09:56 UTC on 29 September, about six and a half hours after its time (GitHub documents that scheduled runs may be delayed under load; an earlier note here, written at 05:21 on the 28th, took the delay for a run that had not happened). On 29 September its snapshot step read all three sources afresh, none keeping its baseline: SWPC's space weather (30 days of F10.7, 59 Kp readings, as of 06:00 UTC), CelesTrak's six groups (2 409 element sets, as of 05:56 UTC) and the IERS Earth orientation (3 197 days from 2019-01-01, predicted from 25 September). The deploys pushed to main run the same step. Opened straight from its link, a case lesson sometimes lost the catalogue: the bundled snapshot was read under the online sources' 8 s limit while the page was still starting. The snapshot now has its own limit, 60 s, for a server that hangs; nine cold opens of the three case lessons at a phone's size in Chromium all loaded, in 10 to 12 s. |

Phase 3, the rocket builder (the Build section), on the same branch. No built-in flight changed
(the fingerprints below); Falcon Heavy's data changed on main (F11), and the catalogue took them.

| Item | |
|---|---|
| D01 parts catalogue | done: `src/data/parts.ts`, 55 engines, 50 stage bodies, 14 strap-on bodies and 17 fairings, from which the 21 vehicles are assembled, with interstages derived for the drawing and, for the builder, each engine's mass with its sources (none for the four whose mass is unpublished). The fleet it emits equals the literal one value for value and key for key (main's F11 included), and 27 point-mass and 21 six-DOF flights hash as they did before it ([VALIDATION.md](VALIDATION.md) §8) |
| D02 remix a real rocket | done, at Explore: stretch or shrink a stage's propellant (50–200 %), swap or re-count its engines for engines of the same propellant, add or take off strap-on groups, fit another fairing. Unchanged, a remix is the real rocket and flies as it does; a swap moves the dry mass by the engines' published masses exactly; a stretch moves the Δv as the rocket equation does; 630 random lists of edits give a valid vehicle or a refusal with its reason ([VALIDATION.md](VALIDATION.md) §8) |
| D03 parts builder | done, at Explore: up to six stages from catalogue bodies or bodies of one's own, engines, strap-ons, a fairing; the design's warnings in plain words; payload ratings computed by flying it; save, export, import; **Fly it**, point-mass by default, six-DOF experimental. Every catalogue vehicle rebuilds from its own parts exactly; each warning is shown on constructed cases, "will not lift off" agrees with the flight in 85 flights, and no catalogue vehicle fails; computed ratings fall within 25 % of seven of eight published ones, Vega-C's LEO 31 % high ([VALIDATION.md](VALIDATION.md) §8). The Engineer level still lists designing from parts there as to come, with a link to Explore |
| D04 test facilities | done, at Engineer: a test stand that fires any engine with the flights' own engine model, in a vacuum, at sea level or at a site's height; a wind tunnel of the six-DOF flight's aerodynamic tables over Mach and angle of attack; a flight readiness review. Thrust, Isp, impulse and the transients are held to the data and to closed forms, 20 published burn times fall within 10 %, the tunnel's zero-angle drag is the point-mass flight's, and the review gives the Launch panel's own verdict on 36 catalogue rows ([VALIDATION.md](VALIDATION.md) §8) |
| D05 optimal staging and sizing | done, at Engineer: the loss-free best split of a Δv among stages, by Lagrange multipliers, beside a real rocket's own split; a launcher sized from a payload, an orbit and a site. Staging is held to closed forms, brute-force grids and NPTEL Lecture 20's worked examples; sizing's Δv is the planner's own, but no sized launcher tried reaches orbit at it (a finding, below) ([VALIDATION.md](VALIDATION.md) §8) |
| Build at Watch: real rockets taken apart | done: any of the 21 drawn to scale, taken apart or assembled; a card for each part with its figures and sources; each stage's ideal Δv, burn time, T/W and mass fractions; a five-step tour on Saturn V, Falcon 9, Soyuz-2.1a, Atlas V 551 and Ariane 64. The geometry is the flight's own stack layout, the figures the budget core's ([VALIDATION.md](VALIDATION.md) §8) |
| Build at Explore | done: D02 and D03 above, with designs kept in the browser (the one on the bench also across a reload), `.orbitlab.json` files, and ratings computed off the page's thread with a Stop button. Walked in Chromium in English, Russian and Thai at desktop and phone widths ([VALIDATION.md](VALIDATION.md) §8) |
| Build at Engineer ("Design and test") | done: D04 and D05 above as five tabs, on a real rocket, the design open in Explore, a saved one or a launcher sized there. **Fly it** from the review opens Launch's Engineer level on the mission reviewed; **Open in the builder** takes a sized launcher to Explore's parts builder ([VALIDATION.md](VALIDATION.md) §8) |

Phase 4, the satellite builder and instructor mode, on the same branch. No built-in flight changed
(the fingerprints above, and since D06 the satellites' own fixture).

| Item | |
|---|---|
| D06 satellite subsystems | done, at Explore and Engineer: **Design a satellite** starts from NAPA-2, a THEOS-2-class imager or one of five classes (communications, Earth observation, weather, navigation, science) and works out, as the student types and for a design date, the eclipse and β, the array and battery for the year's longest eclipse, the Δv budget (insertion, drag make-up or station keeping, disposal), the disturbance torques and the wheel and torquer they call for, the downlink's design control table, and the camera's sample, swath and diffraction limit; each number is marked sourced, estimate or the student's own. The **satellite bench** (Engineer) shows each subsystem in a tab with its sources and runs the lifetime against the 25-year rule. Designs are kept in the browser and as `.orbitlab.json` files. **Send to Orbit** hands the satellite to the Orbit section with no launch (its mass, drag area, C_D, C_R and engine); **Fly it** flies it in Launch as the mission's own satellite (a mission file of version 3), from a site whose corridor reaches its plane, with the Launch section's verdict shown before the click and the rockets that can fly it offered. Each core is held to published worked examples (TU Delft's reader, Rickman, Starin & Eterno, MarCO, Palo et al., ITU-R P.525, Sentinel-2, Landsat 8, TM-113111, Hull, IADC): all met but TM-113111's arcjet row (0.11 kg), and the slips found in the sources are recorded. Copies of catalogue satellites fly their flights exactly, point mass and six-DOF ([VALIDATION.md](VALIDATION.md) §9) |
| D07 requirements-driven design | done, at Engineer: **Start from requirements** on the bench (`#/build/engineer/requirements`). A place, the coarsest GSD, the longest wait between looks, a tilt, daylight or not, the plane, a life, a fixed solar-activity level, the 25-year rule, the data a day and the stations give a table of the repeat-ground-track orbits from 150 to 5 000 km: what each asks of the satellite (focal length, aperture, transmitter, array, battery, Δv), what it gives (the revisit by brute force, contact, the longest eclipse, the lifetime from a search over P07 in a worker), which requirement binds and every one unmet; two charts; and **Open**, which puts a row's design on the bench, where every figure is worked out again and set beside the row's. Held to D06 and O04 to 1e-9 but the eclipse (0.12 %), to the published repeat cycles of Landsat 8, Sentinel-2 and Sentinel-1, and to TU Delft's data-volume example ([VALIDATION.md](VALIDATION.md) §9) |
| T01 instructor scenarios | done: **Write a scenario** (`#/lessons/author`) makes a lesson from the mission on the setup panel (a rocket or a satellite of one's own included) or from the satellite design open in Build: its texts in any of the three languages, what students may not change, and criteria for a flight (how it ends, a number within bounds, a number worked out, an event) or for a design (one of 13 figures within bounds, or worked out; the 14th, the longest wait between looks, needs the mission's place, which a lesson file can carry but the writer does not write). It saves the lesson as a file, makes a `?scenario=` link (up to 8 000 characters) that opens and starts it in any browser, or tries it at once. A design lesson is graded on the satellite model's figures at the date and solar activity it fixes, on the lesson's desk in the designer; an example is `public/lessons/napa2-power.orbitlab-lesson.json`. A teacher's lessons are numbered 9.1, 9.2… in the order of the file. A lesson file is written at the lowest version that can fly it: 1 for flights, 2 for a case or a rocket of one's own, 3 for a satellite of one's own or a design, and reads back to the same lessons. Each kind of flight criterion passes and fails on constructed flights, and each of the 14 design measures on constructed designs ([VALIDATION.md](VALIDATION.md) §9) |
| T02 checking a student's file | done: **Check results** (`#/lessons/check`) opens a class's results files and the teacher's lesson file, flies each point-mass record again in a worker to the time it was graded at, its journaled commands at the same step boundaries, or works a design record's figures out again at its date and solar activity, and says Match, Borderline, Differs or Cannot re-fly with the reason and whether the file changed after it was saved; the check can be saved as CSV. A results file now keeps a flight's grading time, the instant on screen, its commands and the app's build, and a design lesson's design. Underneath, a live point-mass flight is the headless flight bit for bit at any frame rate and warp ([PHYSICS.md](PHYSICS.md) §2n), and a lesson grades the orbit where the flight ended, however late the page grades it. Node and Chromium agree within 1.4e-12 s of grading time and 1.4e-11 m/s on flights and 5.4e-15 relative on designs, against tolerances fixed before the first comparison ([VALIDATION.md](VALIDATION.md) §9) |
| T03 lesson packs | drafts, awaiting the owner's review: five packs, precached files under `public/lessons/packs/`, listed on the lessons page as groups with their curriculum codes as chips — IPST basic science (M.5–M.6), IPST Earth, astronomy and space (M.6), IPST additional physics (M.4–M.6), space flight dynamics and control (an institution-level lab for undergraduate aeronautical engineers), and Russia's speciality 24.05.06 — with 17 lessons of their own (11.1–15.4: flights, a case and design lessons) and built-in lessons listed again with their codes. Each pack says on the page that it is a draft. Every worked solution passes and a wrong answer fails; two tolerances were set after the flight, and say so ([VALIDATION.md](VALIDATION.md) §9) |

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
- Real satellites (R02): TEME is taken as the program's inertial frame for the orbits; the
  Earth is turned by UT1 and the pole since P2.5, from the bundled IERS data (not fetched by the
  page: the IERS cannot be read from a browser). An imported file is kept only while the page is
  open.
- The lifetime model (R05, P2.5) reads the Sun day by day, but a storm's 3-hour peaks are averaged
  into its day (NRLMSISE-00's storm mode is not used); beyond SWPC's forecast the Sun follows the
  mean of cycles 19–24 from the last minimum. With the Sun as measured six of seven spheres of
  known size still come down 8 to 23 % early: the model's own bias in those years, not fitted away.
- Close approaches (M01) are screened with element sets, as SOCRATES does, and their probability
  rests on R04's estimated uncertainty and a size the user gives: they show traffic worth a closer
  look, not the collisions to come. With a conjunction data message the probability is the
  operators' own. A satellite at 700 km, in the crowded band, screened against 30 000 objects
  over three days at 5 km took 0.55 s with the time filter and 18.5 s without, in Node on one
  core of this build machine. The whole worker job took 0.69 s. The load is synthetic: 3 104 real
  sets and copies of them turned to other nodes and anomalies. Deep-space primaries (GEO, Molniya,
  geostationary transfer) and near-coplanar pairs are still searched whole. In Chromium, with the
  worker held to a quarter of one core and the page slowed four times, as a stand-in for a slow
  phone, the same screening took 2.7 to 5.3 s (80.5 s before the filter). No phone was measured
  ([VALIDATION.md](VALIDATION.md) §7).
- Overflights (M02) count only satellites whose element sets are published, and are when a place
  could be seen, not that it was imaged. The instruments' limits are the published ones (for the
  Maxar satellites and SkySat, the tasking limits). CO3D's is a planning limit (its acquisition
  plan's 15° of roll, from before launch) and Cartosat-2C to 2F's is their series' figure (ISRO
  gives none for them): no operator publishes how far those satellites can turn. HJ-1's and
  HY-1B's cameras are fixed by inference, and SWOT's band of incidence is worked out from its
  published ground band. The imaging group's other 73 satellites are left out: 72 examined (no
  published limit or figures, or not imagers) and PRSC-E03, launched in 2026, not examined
  ([VALIDATION.md](VALIDATION.md) §7).
- Re-entry (M03): predicted from one element set, as here, half of 66 rocket stages came down
  inside the ±20 % window; the criterion fixed before (70 % with B from the first set's decay, of
  at least 20) was missed and could not have been met, only 14 first sets giving a B. With the drag
  fitted to two NORAD sets a week apart, as the agencies do, 81 to 85 % of 100 re-entries of
  1985–2004 came down inside at 30 and 10 days, 79 % at 5 days (the 80 % fixed before, missed by
  one); the two-set fit gives no B for an eccentric orbit whose mean perigee is already under
  120 km. The model's early bias on the spheres is NRLMSISE-00's own; NRLMSIS 2.1, the one better
  model whose licence allows a port, waits on the owner's decision on its conditions. A transfer
  orbit is carried by Cowell with the Sun and the Moon, which takes seconds; of eight such stages,
  H3 F4 stays up past 400 days and the Long March 7A Y13 comes down nine times too late, both
  after their orbits changed in a way drag and the Sun and the Moon cannot account for.
- The lessons' grades are formative. The answer keys are on the same device: a case's key, and the
  Long March 5B case study's error for the stage of Tianhe, wait while that case's lesson is open and
  unanswered, but a flight's worksheet key does not. Showing a lesson's answers is recorded, and a
  number once shown passes only "with help". The case lessons' Russian and Thai texts have not yet
  been read by a native speaker.
- Build's computed payload ratings (D03, D04) are the model's estimates, flown point-mass in calm
  air on the guidance programme the design carries. Seven of eight published ratings come out
  within 25 %; Vega-C's LEO rating is 31 % high (4 330 against 3 300 kg), and 26 % high to its own
  700 km reference orbit, which is not explained. GTO ratings count the burns after the insertion
  as instantaneous, so a low-thrust kick stage is rated generously. The rating method was changed
  after its first GTO results, which were about twice the published ones; the bound was not. A
  remix keeps its origin's guidance programme: Falcon 9 with its second stage stretched to 130 %
  rates 8 870 kg to LEO against 20 031 kg unchanged, and whether that is the programme or the
  rocket was not shown. A rating takes 1–2 s ([VALIDATION.md](VALIDATION.md) §8).
- Build's sizing (D05): the design Δv is the planner's, whose loss allowance is the low end of
  what the fleet spends, and no sized launcher tried reaches orbit at it. The extra Δv each needed,
  in steps of 100 m/s: the 1 t launcher the page starts on +500 m/s, mostly for the 800 kg fairing
  "the narrowest that fits" gives it, which the design Δv drops at the first staging and the flight
  carries to 115 km (+100 m/s with no fairing); a 10 t launcher from the Cape +300 m/s (+200 with no
  fairing); a 5 t launcher from Baikonur to the station's orbit reached no orbit up to +1 000 m/s.
  Only serial liquid stages can be sized; left to choose, it picks the fairing by diameter alone;
  whole engines overshoot the thrust-to-weight asked for; the lengths are estimates from the propellant's volume.
  A launcher just sized has no payload rating, so the review fails it on "no rating" until its
  ratings are computed. After **Open in the builder**, its lengths, its fairing and its relightable
  last stage are no longer marked as estimates in Explore ([VALIDATION.md](VALIDATION.md) §8).
- Build's figures are the flight model's, with its simplifications: every strap-on group burns at
  the first group's Isp (a design with unlike groups gets a wrong Δv), Falcon Heavy's and
  Angara-A5's cores are counted at full throttle beside their strap-ons, and PSLV's air-lit
  strap-ons from liftoff. Optimal staging counts no losses, leaves strap-ons out, and where the
  optimum would drop a stage it says so rather than solve it.
- Build's remix and parts builder (D02, D03): a stretch's mass rule (the tank structure grows with
  the propellant) is an estimate awaiting the owner's decision. A swapped engine keeps the stage's
  drawing (nozzle length, profile, legs, grid fins), which may then be drawn wrong. Strap-on groups
  can be added or taken off, not stretched or re-engined, and the parts builder's strap-ons are
  catalogue bodies only. A body of one's own may state a dry mass below its engines' mass without a
  warning. A saved design keeps the vehicle, not how it was made: a remix reopens as the base of a
  new remix with its stretches back at 100 %, a parts design reopens in the parts builder only when
  it rebuilds exactly, and neither keeps its payload; ratings computed in the review for a saved
  design are not written back to it. **Fly it** from Explore always aims at the 500 km preset from
  the design's first site, with the design's payload named as the rideshare dispenser whatever its
  mass. A design whose ratings have not been computed reads "will not fly" at Launch's Explore
  level, where a rating of 0 counts as none. The validator's and the design store's details are
  shown in English.
- Six-DOF for a rocket of one's own (D03) is experimental. A single-engine first stage with an id
  of its own has no roll control (PSLV so renamed rolled at 2.2°/s, against 0.075°/s). Where bells
  share engines, the fault system names a bell by its first engine and counts bells, not engines,
  towards its limit of a quarter of the stage. A renamed single-engine stage or strap-on gets 5° of
  steering even when copied from a fixed-nozzle motor such as the GEM 63. R-7 blocks with several
  engines fly generic steering, and their verniers give no thrust. The generic thrusters (50 N
  pairs, at most 30 kg of gas, estimates) do not scale with the stage
  ([VALIDATION.md](VALIDATION.md) §8).
- Build's drawings: each strap-on group is drawn as one unit on each side, and a second group
  (PSLV's air-lit pair) outside the first rather than where it sits on the ring; nose shapes, the
  R-7's taper, the bells and the gaps are drawing only. The drawn height is the stages and adapters
  as the flight stacks them, not the published height: Vega-C 41.9 against 34.8 m, PSLV-XL 52.8
  against 44 m, Atlas V 551 70.5 against 62.2 m; Saturn V's published 110.6 m counts the Apollo
  spacecraft and its escape tower, which are not drawn (90.15 m). A kept Falcon 9 first stage with
  another engine count is still drawn with the nine-engine octaweb, and a generic ring draws at most
  8 bells.
- Build's test facilities (D04): the wind tunnel's tables are the model's estimates
  (slender-body theory and crossflow), not tunnel data; fins and the nose's shape do not change
  them, and the reference diameter includes the strap-ons, as the flight's does. On the test stand
  the Isp stays constant through start-up and tail-off, both estimates, and a solid motor's mean
  thrust reads 0.6–0.9 % high, because the impulse includes the tail-off and the burn time does
  not.
- Build: the landing page has no Build chapter (one would need new pictures; the owner's call), so
  the top bar is the way in. Designing from parts at the Engineer level (D03's face there) is
  listed as to come, with a link to Explore, where it is. The Russian and Thai texts have not been
  read by a native speaker. The parts' source notes are partly in English: a note after a link is
  dropped, and a reference that is not a link is shown as written. Chart tick labels use "." in
  every language. On a phone the wind tunnel's table of numbers scrolls sideways in its own box,
  the Engineer level's lead runs to 8–12 lines, and in Russian at 360 px its five tabs take five
  rows; at 1440 px the sizing drawing cuts off "Rutherford Vacu…".
- The satellite builder (D06), each left open by a review ([VALIDATION.md](VALIDATION.md) §9):
  - The propagator's Sun is 0.45° from the orbit tools', so its sunlight-pressure shadow edges move by up to 11 s; not changed.
  - Power reads 1 361 W/m² and the propagator's sunlight pressure 1 367 W/m²; which to keep is the owner's call.
  - Charge cycles a year assume an eclipse every revolution, an upper bound, and are shown as "at most".
  - The off-nadir sample, the diffraction limit and the pointing loss have no published worked example to be held to.
  - The ground speed leaves out the Earth's turning: about 1 % low on a sun-synchronous track, 6.6 % high on the equator.
  - The torques are sized with the field over the pole (the smallest torquer) and the gravity gradient at a 45° tilt.
  - The loads are the same in sunlight and in shadow, and a geostationary camera gets no data rate.
  - A low orbit's end of life is always budgeted as a controlled re-entry; the Δv budget has no "decay within 25 years".
  - The drag make-up holds the Sun and the season at the design date (±30 % over a year) and averages the indices, not the density.
  - TM-113111's arcjet row is missed by 0.11 kg, unexplained; Hull's 25-year curve is checked from one side only.
  - A design names one ground station and has no argument of perigee (taken as 0); the designer draws no picture of it.
  - The receiving station is NASA's 11.28 m dish, so link rates come out far above a school station's (28 Gbit/s from 10 W).
  - The geostationary templates' default place (the node at 0°) is below Bangkok's horizon, so their data a day is 0.
  - The bench's lifetime runs at a fixed ECSS level, while the Orbit section's lifetime dialog starts on the Sun as measured.
  - The design date is kept with the unsaved design only, not with a saved one, and its box shows the browser's date format.
  - While the figures are worked out again (about 180 ms) the checks read the new design against the old figures.
  - The Orbit section tells a design's hand-off from a flight's by its having no mission and no vehicle: a heuristic.
  - The pointing loss holds inside the main beam only, and the design lets the pointing error run to 180°.
  - Some bad inputs to the cores are taken quietly: an infinite β gives no eclipse, and a tiny step can hold a page.
  - Launch aims a node's local time at the true Sun and the designer at the mean Sun, so a flown node is up to about 16 min off.
  - A crew-kind satellite of one's own flies a rendezvous with the Soyuz MS's engine and inertia, not its own.
  - An electric engine flies in Launch without its engine, its propellant still in the mass; Send to Orbit keeps the engine.
  - Fly it offers other rockets only when the verdict fails, not on a caution, and one insertion probe can hold the page 0.5 s.
  - The fairing fit is a note, not part of the verdict; NAPA-2's template lays its 0.34 m side across, so it reads 0.39 × 0.10 m.
  - On a phone the current rocket's entry in Fly it's rocket menu can be cut, as the font allows: with DejaVu Sans in English and Russian at 360 px and Russian at 375 px; an earlier walk saw it in Thai.
  - The solar torque counts nothing when the Sun is behind a surface, so a two-sided array lit from behind is understated.
  - The ground speed and the longest pass assume a circular orbit; the off-nadir sample tilts the camera across the track only.
  - With a craft of one's own picked in the playground, a design without an engine handed on keeps that craft's mass beside the design's area, as a flight's hand-off does.
  - A weather satellite on Ariane 64, designed or from the catalogue, separates only when the recorder steps 20 s (at T+47 439 s), not 5 s: Launch's behaviour, unchanged.
- Requirements (D07), each left open by a review:
  - D07 sizes the array and battery with the closed-form eclipse and, for daylight looks, the payload off in the shadow; the bench keeps every load on (THEOS-2: 18.9 % more array, 60.2 % more battery).
  - D07 lets an orbit that lasts its life by drag take life + 25 years; D06 gives a satellite with an engine 25 from its design orbit (THEOS-2's rows from about 645 to 663 km disagree).
  - The lifetime search flies the template's mass and drag area; a row's resized wings change the area (THEOS-2: 3.85 → 3.575 m²).
  - A daylight revisit holds for the season of the start date only (a dawn–dusk orbit over Tromsø sees nothing in December).
  - A row inside the lifetime search's bracket says "not proven to last"; a row that never enters the shadow gets no battery.
  - The table stops at 400 rows: THEOS-2's own 26-day case needs the shortest cycle set to 26 (112 rows, about 28 s).
  - The table's time estimate runs about 2.5 times high on the machine the lifetime estimate was fitted on.
  - At a GSD of 1 000 m, 8 of 18 rows are refused, their aperture below the smallest the bench takes.
  - Opening a row replaces the unsaved design on the bench without asking.
  - THEOS-2's template camera gives 0.5014 m from 621 km, 0.3 % coarser than the published 0.5 m.
- Instructor mode and design lessons (T01, T02), each left open by a review:
  - Six-DOF flights and case lessons are not re-flown; drift across engines past two days, and TORU across engines, are unmeasured.
  - A results file's checksum shows an accident, not a forgery; deleting the four new fields makes an edited record read as an old one.
  - Records from before T02 re-check only approximately (a difference reads "Cannot re-fly", saved by an older version); those from before grading at the flight's end differ on an orbit graded late.
  - The `?scenario=` link reaches the web server that serves the app, as a mission link does; it carries the lesson, nothing about a student.
  - Only V8's engines (Node, Chromium) have been compared; the design revisit's 1e-7 day may not hold in another browser.
  - A grading measure reads the simulation up to one step ahead of the picture (a peak load can fail 0.1–0.25 s early); so do the CSV export and the worksheets.
  - A six-DOF coast holds the picture 10 s at 1×, and a command moves the picture on by up to one step (0.1 s low down, 1 s on a far approach).
  - The orbit is graded at cut-off with the tail-off added at once: 0.016 m/s from the speed after it on lesson 1.1.
  - A design lesson that starts from a template moves if the template changes, and its old records then read as breaking a lock.
  - Opening a requirements row or a saved design during a design lesson replaces the lesson's design without asking.
  - A typed answer to a design lesson can be read off its criterion chip after a check, and off the bench.
  - A lesson file's range whose lower bound is above its upper one is read; only the writer refuses it.
  - A design lesson's requirements may name another solar activity than the lesson's own; the strip then shows both.
  - The revisit measure assumes a camera looking straight down, over a fixed 30 days from the design date.
  - The writer writes no mission requirements, so it does not offer the revisit measure.
  - On a phone the design lesson's strip can take 42 % of the screen, and the writer's long measure names are cut in its menu.
  - The check page does not report a lesson file whose lesson takes a built-in id, and the lesson-file notice still says "1 lessons".
  - A typed answer on a lifetime the run did not see the end of is graded against the run's length.
  - A record that names its build but lacks its grading time is a match when its numbers come out the same; the re-check's header says it differs.
  - A teacher's lesson that ends on an event other than the insertion reads the orbit with the rest of that engine's tail-off added.
- The lesson packs (T03), each left open by a review:
  - The packs are drafts (`reviewed: false`); the research's lessons A5, P4 and R4 are not written.
  - Lesson 15.3 flies uncrewed: the grader does not end a crewed failed flight that ends on the escape system's parachutes.
  - Pack lessons are listed once the packs are fetched; before that WebMCP's lesson tools and a check page opened first miss them.
  - A teacher's lesson file that reuses a pack lesson's id is replaced silently.
  - The event log's "Target orbit achieved" line prints the period in whole minutes, much of the answer in 11.2, 12.2, 13.1 and 13.2.
  - Lessons 13.3 and 15.4 start from unchanged templates, so a later change to a template would move them.
  - 15.4 asks for the torquer dipole and the wheel ratio, not the two torques the research asked for; 13.4's depth bound is 30 %, not 40 %.
  - 11.4's link is reckoned at 10° elevation, about 1 dB worse than Bangkok sees; 15.4 passes any wheel from 5.99 to 11.98 N·m·s.
  - The storm question holds Kp 7 through the whole prediction, an upper bound; built-in lesson 6.2 now asks nine questions.
  - The design names stored in the pack files are not translated.
  - A build from before T03b refuses a case lesson with the CZ-5B sheet's storm question as invalid, not as newer (unreleased builds only).
  - R6's brief says the wheel cannot hold the momentum built up over an orbit, while the rule it gives uses a quarter orbit.
- Phase 4's Russian and Thai texts, the lesson packs' among them, have not been read by a native speaker.
- D01's fingerprints (27 point-mass flights, 21 six-DOF) are exact hashes of floating-point
  flights: a Node or V8 upgrade could change them with no change to the code, as it could the older
  six-DOF goldens.
- At about 1100 × 650 px the Engineer mode's panels squeeze the 3-D viewport out.
- The physics has been compared with flight data for twelve of the 21 vehicles: Falcon 9
  against webcast telemetry of five flights, the others against published timelines
  ([VALIDATION.md](VALIDATION.md)). No disagreement pointed at the equations. As a result,
  Falcon 9's first stage flies its published masses and its six-DOF pitch programme is fitted to
  the flights. Among what is left and recorded:
  - Electron's second stage burns ~25 % short.
  - Falcon Heavy's first stages cut off ~11–13 % early: how deeply each core throttles is not
    published.
  - PSLV-XL's first stage is 29 % slow at separation, because of its ascent profile, not its
    solid-motor thrust curve.
  - H3's first stage flies far flatter than planned.
  - Atlas V's and Falcon Heavy's fairings come off 17–27 % early. Proton-M and Angara-A5 now fly
    their operator's jettison rule.

  Long March 2D, 3B/E and 5, Vulcan, Soyuz-2.1b and Starship are not compared; see
  "Assumptions and limitations" in [PHYSICS.md](PHYSICS.md). The three historical vehicles are
  flown on their own missions and set beside the orbits those reached
  ([SIXDOF-VEHICLE-DATA.md](SIXDOF-VEHICLE-DATA.md)).
