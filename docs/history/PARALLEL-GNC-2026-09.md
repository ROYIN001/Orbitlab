# Parallel GNC work, September 2026

This session works on branch `claude/dreamy-archimedes-r04m47`, started from
`claude/awesome-fermi-r6ntep` at 7834edd, alongside a second session that does item 10b (the
Watch mode's real missions and booster recovery) and then E01, V04, G06, V05, V03, G07 and C01.
This session's items, in order: **P05 → U07 → G03 → E02 → G04 → E04 → G02 → G08 → G01 → G05**.
The roadmap table in [../IMPLEMENTATION-STATUS.md](../IMPLEMENTATION-STATUS.md) is left alone
here; this file records progress for the owner to fold in at the merge.

## Decisions agreed with the owner

- GNC tools (G03, G04, E04, …) live in the Engineer mode; E02 in Explore and Engineer.
- PEG/IGM (G01), INS + Kalman (G02) and slosh/bending/notch (P05) are options, off by default,
  and off they leave every flight bit for bit as it was.
- U07: the notation is switchable; Russian uses ГОСТ 20058-80, English and Thai ISO.
- G05: minimal dispersions. Heavy tests go to `npm run test:heavy`.
- P05 (asked 2026-09-23): with P05 on, **every vehicle must reach orbit**; **bending past the
  structure's limit breaks the vehicle up**; the **IMU station and the notch's parameters are
  tunable in the Engineer mode** from P05 on; and the bending is **drawn in 3-D**.
- U07 (asked 2026-09-24): the **language decides** — Russian ГОСТ 20058-80, English and Thai
  ISO 1151; **everywhere**, with a **symbol table in Physics and sources**; a **setting in the
  Engineer mode's setup**, by language unless chosen; and the **numbers follow each standard's
  axes and positive directions**, not only its letters.
- G03 (asked 2026-09-24): a **window of its own**, opened from the 6-DOF panel; the loop is
  **recorded at every control step** and left out of the golden fingerprints, so replay works
  from T+0; **no single-step button** (analysis belongs to G04 and E04).
- The load relief's switch-off at 500 Pa, found by G03 (asked 2026-09-24): **fix it with G01**
  (PEG/IGM), not on its own.
- E02 (asked 2026-09-24): an **Equations view in the telemetry panel**; Explore mode: Newton,
  dynamic pressure and Mach, drag, the rocket equation, the Δv budget — **thrust against ambient
  pressure and vis-viva in the Engineer mode** with gravity (J2), α/β, Euler, quaternion
  kinematics and the control law; **balance checks**, with the equation terms recorded per step
  and flights bit for bit as before.

## Progress

| Item | State |
|---|---|
| P05 slosh, bending and notch filter | done 2026-09-24 (see below) |
| U07 ГОСТ 20058-80 notation | done 2026-09-24 (see below) |
| G03 attitude-loop inspector | done 2026-09-24 (see below) |
| E02 live equations panel | done 2026-09-24 (see below) |
| G04 Bode, step response, margins | |
| E04 controller tuning mode | |
| G02 inertial navigation and Kalman filter | |
| G08 control-system failures | |
| G01 PEG and IGM guidance | (also: the load relief's switch-off, see G03) |
| G05 Monte Carlo insertion accuracy | |

### P05 — slosh, bending and the bending filter

Physics in [../PHYSICS.md](../PHYSICS.md) §2b, data in
[../SIXDOF-VEHICLE-DATA.md](../SIXDOF-VEHICLE-DATA.md) ("The flexible vehicle"), results in
[../SIXDOF-ACCEPTANCE.md](../SIXDOF-ACCEPTANCE.md) ("The flexible vehicle").

- **Slosh**: first-mode spring-mass analogue of every liquid tank (SP-106 / Dodge 2000), coupled
  to the rigid body by an exact Newton–Euler solve at every integrator evaluation.
- **Bending**: first free-free mode of each configuration from a 40-element beam on the mass
  model, with the three coupling paths (generalised force, thrust and tank axes following the
  slope — with the axial compression's geometric stiffness, which cancels most of the follower
  thrust — and the IMU reading the bent structure); modes above 16 Hz quasi-static.
- **Shell loads**: force summation each control step; break-up (`evt.bendingFailure`) past a
  250 MPa effective allowable.
- **Bending filter**: a scheduled Tustin notch on the pitch/yaw torque (ζz 0.02, ζp 0.3) and the
  autopilot's rate gain held to ω_b/6 (attitude gain half that).
- **What was found on the way**: without the filter Falcon 9's first mode diverges (effective
  damping −0.22) and breaks the stack up at T+7 s; a notch alone cannot stabilise it because
  the rigid autopilot, crossing over near 0.5 Hz, has a bending-path loop gain of about one
  even off resonance — hence the bandwidth limit. Including the follower thrust without the
  axial compression shifted the in-flight frequency by 6 % and put the notch off the mode; with
  both (Beal 1965) the shift is under 1 %. Upper stacks of 45–75 Hz made RK4 at 0.01 s unstable
  (limit ωh = 2.8) until modes above ωh = 1 went quasi-static. At 1 % slosh damping Ariane 6's
  upper stage (11 t of sloshing oxygen at 0.3 Hz) emptied its cold-gas thrusters fighting the
  liquid and was rolled by its swirl until the circularisation burn could not align (Falcon 1
  flight 2's failure mode); the default is 3 %, a baffled tank, and 1 % stays as a lesson.
- **UI**: Engineer-mode setup section (three options; IMU at the instrument bay or a chosen
  station; notch depth, width and centre; bandwidth ratio; both damping ratios); two telemetry
  charts (bending and slosh, shell stress); CSV columns; the 3-D stack bent at 25× by a vertex
  shader on the rocket's own materials; `configure_mission`'s `flex` object (merged, `null`
  resets a field); en/ru/th.

**Files touched that the other session also edits** (every change additive):
`src/types.ts` (`DynamicsConfig.flex`, `FlexConfig`), `src/config/validation.ts` (flex fields and
check), `src/mcp.ts` (`flex` property and its handling; a vehicle/wind edit keeps the flex
settings), `src/ui/panel.ts` (the flex section, one call line, and keeping flex across a vehicle
change), `src/ui/result-content.ts` (one line: `evt.bendingFailure` → structure), the three
dictionaries (`// --- P05 ---` blocks), `src/physics/simulation.ts` (flex options for the
vehicle's runtime only, and the shell-load break-up check). RigidRuntime (`runtime.ts`,
`integrator.ts`, `telemetry.ts`): the flexible body is an optional `flex` option and optional
state; without it the rigid code path is untouched — debris runtimes never receive it.

**Tests**: tests/rigid-flex.test.ts (analogue values, conservation of momentum, angular
momentum and energy, reduced-mass frequency, uniform beam, orthogonality, IMU reading, notch
response, shell stress), tests/rigid-flex-flight.test.ts (Falcon 9 breaks up without the filter,
flies max-q with it, sloshes), tests/rigid-flex-golden.test.ts (options absent or all off:
bit-identical to 7834edd), tests/flex-config.test.ts, a block in tests/mcp.test.ts;
heavy: tests/heavy/flex-golden.test.ts (whole missions bit-identical) and
tests/heavy/flex-fleet-*.test.ts (every vehicle's reference case with everything on, and the
0.01/0.005 s comparison).

**Results (2026-09-24)**: `npm test` 64 files / 923 tests pass (11 min); the flexible fleet
(18 vehicles with everything on) and the three whole-mission fingerprints pass in
`npm run test:heavy` (22 min for the P05 files); shell loads peak at 5–44 % of allowable,
bending at 0.1–14 cm (Starship), slosh at 4–50 cm. `npm run test:sixdof-fleet` re-run on the
P05 commit (723c811): **161 of 161 passed** in 2 h 9 min (finished 2026-09-24).

### U07 — ISO 1151 and ГОСТ 20058-80 notation

Physics in [../PHYSICS.md](../PHYSICS.md) §2c (the axes, the mapping and the table), use in
[../USER-GUIDE.md](../USER-GUIDE.md) §8. Code: `src/ui/notation.ts` (symbols, the preference,
`bodyRates`/`simulatorRates`, `aeroAngles`), `src/ui/notation.css`.

- **Choice**: `auto` (Russian → ГОСТ, English and Thai → ISO), `iso` or `gost`, stored in
  `localStorage` (`orbitlab.notation`) as a display preference, not a mission setting; set in the
  Engineer mode's setup, which shows the standard in force. A change relabels the app as a
  language change does.
- **Symbols** in the telemetry card (full and compact), the charts' titles, the onboard view, the
  6-DOF controls and the table in *Physics and sources* (20 quantities, both columns, the one in
  force highlighted, each definition in that standard's signs).
- **Axes and signs**: the simulator's body axes are relabelled into each standard's
  (ISO (x, y, z) = (x, −z, y); ГОСТ (x, y, z) = (x, −y, −z)), so the rate fields, the measured
  rates, the manual rate commands, the event log's α and β, the result screen's aerodynamic
  warnings and the CSV's `iso_*`/`gost_*` columns read in the standard in force.
- **What was found on the way**: the 6-DOF controls called the simulator's y rate "pitch" and its
  z rate "yaw", and the event log's α was its x–z angle. During ascent the simulator's y lies in
  the trajectory plane (towards the belly) and z across it, so those were physically the yaw
  rate, the pitch rate and the sideslip: Falcon 9's pitch-over showed as a "yaw" rate. Now the
  pitch-over reads q < 0 (ISO) and ω_z < 0 (ГОСТ), and a flight test checks it.
- **Unchanged**: the physics, the recorded telemetry, the CSV's existing columns and
  `read_flight_state`'s `rigid` object stay in the simulator's axes, so every flight and golden
  fingerprint is bit for bit as before; `read_flight_state` adds a `flightDynamics` object with
  both standards' rates and α, β.

**Files touched that the other session also edits**: the three dictionaries (`// --- U07 ---`
blocks); `src/ui/panel.ts` (the notation section and one call line); `src/main.ts` (three lines
after `initLang()`, none in the camera or floating-origin code); `src/ui/mission-result.ts` (the
aerodynamic warnings' α and β only, not the recovery part). One change in `src/mcp.ts` is not
additive and is deliberate: **`set_flight_control` takes its rates in ISO axes** (roll p, pitch
q positive nose up, yaw r positive nose right) and returns `ratesRadS` as `{ p, q, r }`; before,
its "pitch" and "yaw" went to the simulator's y and z unconverted. `frameSummary` gains
`flightDynamics`. `src/physics/simulation.ts`: `evt.controlCommand` records the command in ISO
axes (one statement). `configure_mission` is untouched.

**Tests**: tests/notation.test.ts (the choice and its listeners, both symbol sets, the rate
round trip, α and β planes, and a Falcon 9 flight to T+120 s: nose-down q during the pitch-over
equal to ГОСТ ω_z, ISO y to the right of the path and ГОСТ y above it, α under 5°, the CSV's
columns by language); updated expectations in tests/i18n.test.ts (the event's α, β),
tests/mcp.test.ts (`set_flight_control` in ISO axes), tests/rigid-replay.test.ts (the recorded
`evt.controlCommand` in ISO axes) and the fake DOM of tests/rigid-controls.test.ts (appended
text).

**Results (2026-09-24)**: `npm test` 65 files / 932 tests pass (the one expectation in
tests/rigid-replay.test.ts updated after the first full run); typecheck and build pass. Flights
are bit for bit as before (the golden fingerprints in the regular suite pass unchanged).

### G03 — the attitude-loop inspector

Physics and findings in [../PHYSICS.md](../PHYSICS.md) §2d, use in
[../USER-GUIDE.md](../USER-GUIDE.md) §9.

- **The record** (`src/physics/rigid/loop.ts`): at every control step of the flown vehicle,
  `RigidTelemetry.attitudeLoop` holds the target, the attitude error, the rate command, the rates
  the controller read, the angular acceleration, the moment asked for (and after P05's notch),
  the air's, the engines' and the thrusters' moments, the gains and limits in force, the limiter
  flags per axis, gimbal travel and thruster duty used, and the ascent load relief. The
  controller fills an optional `ControlTrace` (`control.ts`) that it never reads back; the
  runtime's new `recordLoop` option (off by default, on for the vehicle in `Simulation`, never
  for debris) builds the record. The recorder counts ~1.6 kB a frame for it (measured); the
  CPU cost is within run-to-run noise (−1 % Falcon 9, +4 % Soyuz over 200 s).
- **Bit for bit**: the P05 golden fingerprints leave `attitudeLoop` out and still match 7834edd;
  a flight with the record off equals the flight with it on.
- **The inspector** (`src/ui/loop-inspector.ts`, `loop-view.ts`): a non-modal, draggable window
  over the Engineer mode, opened from the 6-DOF panel — nine blocks and the IMU's feedback path
  with the step's values in the notation in force (U07; new symbols L M N / M<sub>x</sub>
  M<sub>z</sub> M<sub>y</sub> for the moments, also in the notation table), blocks held by a
  limit outlined, and four charts over 10/30/120 s; its own play/pause; live and replay.
- **Also**: CSV columns `iso_loop_*`/`gost_loop_*`, `loop_limiters`, … in the notation's axes;
  `read_flight_state.frame.flightDynamics.attitudeLoop` in ISO axes; an "attitude loop" section in
  Physics and sources; `drawChart` series take an optional dash pattern.
- **What it found**: on Falcon 9 the load relief holds the ascent command up to 24° nearer the
  air than guidance asks, and switches off in one step when the dynamic pressure falls through
  500 Pa (T+127.3 s): the attitude error jumps to 24° and the stack slews at its 5°/s limit for
  five seconds. Left as it is here — a fix changes every six-DOF ascent — and, as the owner
  decided, to be fixed with G01. Also: from T+89 s guidance pitches away from the airflow faster than the stack follows
  (4.6° of pitch error, the rate held by its stopping distance).

**Files touched that the other session also edits** (additive): the three dictionaries
(`// --- G03 ---`), `src/physics/simulation.ts` (the vehicle runtime's `recordLoop`; the load
relief's angles recorded — the relief call itself computes the same values in the same order),
`src/mcp.ts` (`attitudeLoop` in `flightDynamics`), `src/main.ts` (the inspector: one field, its
construction beside the 6-DOF panel's, two lines in `setMode`, three in the frame loop — none in
the camera or floating-origin code), `src/replay/recorder.ts` (the byte estimate).
RigidRuntime (`runtime.ts`, `control.ts`): optional `recordLoop` and `trace` only; absent, the
code path computes what it did.

**Tests**: tests/attitude-loop.test.ts (the trace leaves every demand bit-identical and names
each limiter; flags pack and unpack; a Falcon 9 ascent records every step, the vehicle only,
obeys ω_d = K_θ·e and ε = K_ω·(ω_d − ω̂) to 12 digits wherever no limit acts, records the load
relief, flies bit-identically with the record off; the views in ISO and ГОСТ; history windows;
the CSV columns), a block in tests/mcp.test.ts, the inspector button in
tests/rigid-controls.test.ts.

**Results (2026-09-24)**: `npm test` 66 files / 946 tests pass (10 min); the whole-mission
fingerprints of tests/heavy/flex-golden.test.ts pass unchanged (3 min); typecheck passes.

### E02 — the live equations panel

Physics in [../PHYSICS.md](../PHYSICS.md) §2e, use in [../USER-GUIDE.md](../USER-GUIDE.md) §10.

- **The record** (`src/physics/eom.ts`): every flight step writes `SimState.eom` — the engines',
  the air's and gravity's specific forces at the step start, the step's mean acceleration, the
  running engines' vacuum thrust and exit area, air data, the Δv book at the step end, and in
  six-DOF the body rates and attitude at both ends; cleared at every step, so no record outlives
  its step. It goes into every recorded frame (copied, never shared) but not into the
  telemetry, so the golden fingerprints are unchanged. About 1.6 kB a frame (measured).
- **The view** (`src/ui/equations.ts`, `equations-model.ts`, `equations.css`): Charts |
  Equations in the telemetry panel's header; MathML formulas in the notation in force (vectors
  bold through CSS — MathML Core ignores `mathvariant`), the substituted values, the balance
  line, and a note where a model difference or a limiter matters. Explore: 5 equations;
  Engineer: 12.
- **What the checks show** on Falcon 9 to LEO: Newton's law balances to 0.4 % at worst (six-DOF),
  the Δv book to 0.1 %, the thrust formula exactly, Euler's equations to 0.1–0.2 % of the
  moments, quaternion kinematics to 10⁻⁴; at T+127 s the control law shows the rate limit that
  G03 found holding the pitch command.

**Files touched that the other session also edits** (additive): the three dictionaries
(`// --- E02 ---`), `src/physics/simulation.ts` (the record, built from the step's own values
after the g-load; the step start's rigid state kept for it), `src/physics/sim/types.ts`
(`SimState.eom`), `src/physics/frame.ts` (`VisualFrame.eom`, captured, cloned and taken from the
left frame when interpolating — `DebrisFrame` untouched), `src/replay/recorder.ts` (the byte
estimate), `src/main.ts` (the frame passed to the telemetry panel; the level set in `setMode`),
`src/ui/telemetry.ts` (the view toggle and the equations container).

**Tests**: tests/equations.test.ts (Newton's law, the thrust formula and the Δv book over a
Falcon 9 ascent in six-DOF and point mass; no record outside flight steps or in the telemetry;
the Explore and Engineer sets; every check passing through max-q; the limiter note at T+127 s;
α and β alike in both standards; Euler rows in each standard's axes; the vacuum-engine note; the
record copied with every frame).

**Results (2026-09-24)**: `npm test` 67 files / 956 tests pass (10 min); the whole-mission
fingerprints of tests/heavy/flex-golden.test.ts pass unchanged (3 min); typecheck passes.

