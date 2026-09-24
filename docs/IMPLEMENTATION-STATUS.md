# Where Orbitlab stands

Updated 2026-09-23. This file states the current position only; how it was reached is in the
dated records under [history/](history/), and where those disagree with this file, this file is
right.

## What the app is

A browser simulator of orbital launches: 18 launch vehicles from 16 launch sites, flown by
closed-loop ascent guidance and a burn sequencer to the orbit a mission asks for, drawn in 3-D
from a flight recording that can be replayed and scrubbed. Four modes — Home, Watch
(ready-made launches with a director's camera), Explore and Engineer (every guidance
parameter, the six-DOF flight controls, telemetry and CSV export). English, Russian and Thai
throughout.

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
- **Vulcan's ascent** inserts well away from its planned parking orbit (about 137 × 1 200 km
  against 250 × 500 km) and makes the target with its later burns. Every Vulcan mission in the
  fleet matrix reaches its target; the ascent itself is a guidance-quality item for G01.

## How it is tested

`npm test` runs the regular suite (vitest): 897 tests in 60 files, about 25 minutes. Among it:

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
model (tests/heavy/, about 15 minutes). `npm run test:sixdof-fleet` flies the fleet matrix as
rigid bodies: its 126 accepted cases, each vehicle's first case in crosswind and shear, and Long
March 2D's real mission — 161 cases, about 2 h 40 min on four cores
([SIXDOF-ACCEPTANCE.md](SIXDOF-ACCEPTANCE.md)). `npm run typecheck` and `npm run build` complete the
gate.

## Roadmap

The owner's roadmap (2026-09-22) selected 27 items to do now, in this order; the ones marked
done are on branch `claude/awesome-fermi-r6ntep`.

| Item | | Item | |
|---|---|---|---|
| F03 delivered-orbit matrix in the repository | done | G04 Bode, step response, margins | |
| F05 simulation split into modules | done | E04 controller tuning mode | |
| F01 range-safety corridor and dogleg | done | G02 inertial navigation and Kalman filter | |
| F04 break-ups with Δv left | done | G08 control-system failures | |
| P02 engine start-up and tail-off | done | G01 PEG and IGM guidance | |
| F07 glow on 30 fps screens | done | G05 Monte Carlo insertion accuracy | |
| F02 physics in a Web Worker | done | V04 Soyuz vehicle detail | |
| F06 documentation | done | G06 Soyuz launch escape system | |
| P03 per-vehicle aerodynamic tables | done | V05 Gagarin's Start pad | |
| P01 six-DOF for all 18 vehicles | done | V03 vapour cone and booster smoke | |
| Watch mode: flown missions with booster landings | | G07 ISS rendezvous and docking | |
| P05 slosh, bending and notch filter | | C01 historical missions | |
| U07 ГОСТ 20058-80 notation | | | |
| G03 attitude-loop inspector | | | |
| E02 live equations panel | | | |
| E01 reference frames in 3-D | | | |

Twenty further items are kept for later, once these are done.

## Known limitations

- At about 1100 × 650 px the Engineer mode's panels squeeze the 3-D viewport out.
- The physics has not been validated against flight data; see "Assumptions and limitations" in
  [PHYSICS.md](PHYSICS.md).
