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
- G05: minimal dispersions. Heavy tests go to `npm run test:heavy`. Asked 2026-09-24: **200 runs by
  default, 20–2000**; **six-DOF only**; the minimal set as defaults, **each 1σ editable and
  switchable**; the orbit's spread per law **with which dispersion drives it** (a sensitivity);
  a **window of its own in the Engineer mode**, opened from the setup, with progress, and a WebMCP
  `run_monte_carlo`; one law by default, **the three on the same draws when asked** (a checkbox).
  On its findings (asked 2026-09-25): **fix the tactical/MEMS burn alignment here** (finding 5;
  `sim/burns.ts` may be edited for it) and record the others as known issues; the heavy sets
  **check the tool** (every run counted, every loss named) and **guard the recorded numbers**
  (ceilings on the runs lost, bands on the runs on target); **the wind's 1σ stays 5 m/s** per axis.
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
- G04 (asked 2026-09-24): **tabs in G03's window** — Loop | Frequency response | Step response;
  the linear model **with P05's bending, slosh, IMU and notch**, plus a **feed-forward error
  ±X %** setting; a **chart of the margins over the flight**, from linearisations recorded as the
  flight goes and flights bit for bit as before; the **step response from the linear model
  only** (a step injected into the flight belongs to E04); the loop **linearised every 0.5 s**.
- E04 (asked 2026-09-24): the tuning is **set before launch** in the mission configuration, with
  a **what-if** on the recorded loop during and after a flight; **K_θ, K_ω, the rate and
  angular-acceleration limits and the feed-forward's weight** per channel; a **flight test** (step
  or doublet) against the linear prediction; and an **auto-tuner** for phase- and gain-margin
  targets. Confirmed afterwards: pitch–yaw gains set by hand fly without P05's cap, and the
  auto-tuner maximises K_θ with K_θ/K_ω in 0.25–0.5.
- G02 (asked 2026-09-24): an **IMU** (gyro and accelerometer bias, scale factor, noise, random
  walk) with a **strapdown INS** and an **error-state Kalman filter** aided by **GNSS** (with
  outages to set) and a **star tracker in orbit**; **both the autopilot and guidance fly on the
  estimate**; **sensor-grade presets** (navigation, tactical, MEMS) and custom values in the
  Engineer mode; a **Navigation tab** in the attitude-loop inspector (errors against the ±3σ the
  filter claims, innovations, GNSS state). Off by default, and off, every flight bit for bit.
  Afterwards: the in-orbit burns should fly on the estimate too, **done by the other session**
  from written instructions ([HANDOFF-G02-BURNS.md](HANDOFF-G02-BURNS.md)), on
  `Simulation.knownState()`.
- G08 (asked 2026-09-24): **actuator, sensor and flight-computer failures**; **presets of real
  accidents** (Proton-M 2013, Ariane 5 flight 501, Vega VV17, a stuck gimbal); a simple **FDIR**
  (2-of-3 IMU voting, gimbal monitoring, reconfiguration) that can be switched off to compare;
  failures **set in the mission setup and injected live** (and through WebMCP), marked in the
  attitude-loop inspector. Break-up by q·α with the failures layer only at first; the owner then
  chose (Q0, 2026-09-24) **every six-DOF ascent**, done with G05.
- G01 (asked 2026-09-24): **PEG and IGM both, selectable**; the first stage flies the pitch
  program as before and **PEG/IGM takes over out of the atmosphere or after staging**; the target
  is the **whole insertion state — altitude and speed, flight-path angle, and the orbit's plane
  (yaw steering to the inclination)**; the guidance is chosen in the Engineer mode, with a
  **Guidance tab in the attitude-loop inspector** (t_go, the orbit it predicts, its steering
  against the standard law); the load relief's switch-off is **released smoothly, in PEG/IGM
  flights only** (every other flight bit for bit as before).

## Progress

| Item | State |
|---|---|
| P05 slosh, bending and notch filter | done 2026-09-24 (see below) |
| U07 ГОСТ 20058-80 notation | done 2026-09-24 (see below) |
| G03 attitude-loop inspector | done 2026-09-24 (see below) |
| E02 live equations panel | done 2026-09-24 (see below) |
| G04 Bode, step response, margins | done 2026-09-24 (see below) |
| E04 controller tuning mode | done 2026-09-24 (see below) |
| G02 inertial navigation and Kalman filter | done 2026-09-24 (see below) |
| G08 control-system failures | done 2026-09-24 (see below) |
| G01 PEG and IGM guidance | done 2026-09-24 (see below; also the load relief's switch-off, see G03) |
| G05 Monte Carlo insertion accuracy | done 2026-09-25 (see below; also Q0, the q·α break-up for every six-DOF ascent) |

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

### G04 — frequency response, margins and step response

Physics, checks and findings in [../PHYSICS.md](../PHYSICS.md) §2f, use in
[../USER-GUIDE.md](../USER-GUIDE.md) §11.

- **The linearisation** (`src/physics/rigid/linear.ts`): per plane (roll, pitch, yaw), the
  flight's own derivative function differentiated numerically about the step's state — angle,
  rate, lateral drift, and with P05 each tank's slosh and the bending mode — with the delivered
  moment as input (B from the gimbal allocation's own engine moves, or a pure thruster moment),
  the IMU's readings (with the bending slope) and the air's moment as outputs. Sampled with a
  zero-order hold through the gimbal lag, closed through P05's notch biquad and the feed-forward
  (with its error), margins from a Hessenberg-form loop gain on 240 frequencies, stability from
  the closed loop's eigenvalues (balanced shifted QR), the step response by stepping the
  discrete closed loop.
- **Cadence**: the plan said the linear parameters would be recorded every step; a
  linearisation costs 17–37 evaluations of the equations of motion and 720 loop-gain points, so
  at every 0.01 s control step a flight would run about ten times slower. First done once a
  second (every 5 s with the engines off); **the owner chose every 0.5 s** (asked 2026-09-24),
  now throughout the flight — in a coast it costs nothing measurable, the long coasts being
  propagated without the rigid runtime.
- **The record**: `RigidRuntime.latestLinear` (built only where `recordLoop` is on, so for the
  flown vehicle only), attached by `Simulation.sample()` to the telemetry samples of that second
  as `RigidTelemetry.linearModel` — one shared, immutable object, never copied, not in recorded
  frames. The golden harness and the G03 "same flight" test leave it out with `attitudeLoop`;
  the flights are bit for bit as before (the whole-mission fingerprints below).
- **The tabs** (`src/ui/loop-analysis.ts`, `loop-inspector.ts`, `.css`): Loop | Frequency
  response | Step response in G03's window; Bode magnitude and phase on a log axis with ω_c and
  ω_g marked and the phase drawn with the crossover's phase in (−360°, 0°]; the verdict, margins
  and model; PM and GM over the flight with red lines where unstable; the 1° step (angle, IMU,
  moment asked and delivered) with rise, overshoot and settling; the feed-forward error slider
  (−100 % to +100 %, both tabs). `drawChart` takes an optional x-tick formatter.
- **Also**: CSV columns `loop_linearised_t_s` and per plane `loop_{roll,pitch,yaw}_{stable,
  growth_per_s, pm_deg, crossover_rad_s, gm_db, gm_rad_s, gm_low_db}`; `read_flight_state.loopMargins`
  (per plane, at the cursor); units in the tabs from the dictionaries (`u.s` now has a call site
  and left the i18n test's reserved list).
- **What it found**: Falcon 9 rigid at max-q has a textbook loop (PM 46° at 0.49 Hz, GM 35 dB),
  and the margins **hardly move over the flight** — the feed-forward removes the air's moment,
  so they are set by the gains, the gimbal lag and the hold (46.2° on the gimbals, 64.6° on the
  thrusters). The feed-forward matters little: M_α/I ≈ 0.24 s⁻² against K_ωK_θ = 4.5 s⁻²;
  without it the PM rises to 52° (it also cancels the air's damping) and a −24.5 dB
  gain-reduction margin appears. With all of P05 the loop is stable but its **gain margin is
  only 3 dB** at 8.3 rad/s, between the slosh (4.8 rad/s) and the notched bending mode
  (11.9 rad/s) — short of the customary 6 dB; worth a look in E04 (tuning). Without the notch
  the linear model predicts the divergence the flight shows: 7.70 against 7.66 rad/s, a growth
  of 2.86 against about 2.4 s⁻¹ (§2b's damping estimate of −0.22 is nearer −0.3).
- **Cost** (every 0.5 s, with the G03 record, medians of three): +6 % CPU on Falcon 9 and +27 %
  on Proton-M with P05 over the first 150 s; within the noise over Falcon 9's whole flight to
  orbit. Some 940 models on that flight, 1.7 MB (4.2 MB with P05).

**Files touched that the other session also edits** (additive): the three dictionaries
(`// --- G04 ---`), `src/physics/simulation.ts` (two lines in `sample()`), `src/mcp.ts`
(`loopMargins` in `read_flight_state`, and its helper), `src/main.ts` (the telemetry passed to
the inspector). RigidRuntime (`runtime.ts`): an optional probe argument to its internal model
function, the `latestLinear` field and the linearisation behind `recordLoop`, all pure
evaluations — absent `recordLoop`, the code path is what it was; `integrator.ts` exports
`rigidDerivative`; `flex.ts` a read-only `linearContext()`; `telemetry.ts` the optional field.

**Tests**: tests/linear-loop.test.ts (expm and the eigenvalues, also of a badly scaled matrix;
a PD loop on a double integrator against the textbook phase margin, its gain margin against the
eigenvalues, its step response, and an unstable airframe without the feed-forward; Falcon 9's
models every half second, in the telemetry and not the frames, with the right states per plane,
rigid and P05 margins at max-q, Bode gain margins against the eigenvalues, the Hessenberg solve
against a dense one, the feed-forward error, roll on the thrusters after staging, the CSV
columns; the model against the nonlinear flight without the notch), a block in
tests/mcp.test.ts.


**Results (2026-09-24)**: `npm test` 68 files / 973 tests pass (12 min); the whole-mission
fingerprints of tests/heavy/flex-golden.test.ts pass unchanged (3.5 min); typecheck passes.
After the owner's 0.5 s cadence: `npm test` 68 files / 973 tests pass; the whole-mission
fingerprints pass unchanged; typecheck passes.

### E04 — tuning the autopilot, and flight tests

Physics, method and findings in [../PHYSICS.md](../PHYSICS.md) §2g, use in
[../USER-GUIDE.md](../USER-GUIDE.md) §12.

- **The setting** (`DynamicsConfig.control`, `src/physics/rigid/control-config.ts`): per channel
  (roll; pitch–yaw) K_θ, K_ω, rate limit, angular-acceleration ceiling; the feed-forward's
  weight. Validated in `validateDynamics` and `validateConfigInput`; the setup panel's *Attitude
  autopilot* section (Engineer mode, six-DOF); `configure_mission.control` (merged field by field,
  null resets, kept across vehicle and wind edits). Absent, the runtime is untouched; the defaults
  set explicitly fly the same bits (tested).
- **Pitch–yaw gains set by hand are flown as set**, without P05's flexible-vehicle cap, so that
  a tuning flies what its analysis showed; the cap still applies to the default gains (proposed
  here, confirmed by the owner 2026-09-24).
- **The runtime**: optional `feedForward` and `capPitchYawGains` options (the gimbals asked for
  M_d − w·M_aero, the weight 1 taking the old path); `PlaneModel.feedForward` so G04's
  linearisation carries it; `startAttitudeTest` and the record, the offset rotating the target
  about its own axis.
- **Trials and auto-tune** (`src/physics/rigid/tuning.ts`): the plant's frequency response per
  model computed once (`plantTable` in `linear.ts`, which `bode` and `margins` now use too — the
  G04 numbers are unchanged), trial margins by arithmetic; the search for the highest K_θ with
  K_θ/K_ω in 0.25–0.5 meeting the targets over 16 sampled models, checked on every model with
  failures added back.
- **Flight tests** (`src/physics/rigid/attitude-test.ts`): `Simulation.startAttitudeTest`, the
  `evt.attitudeTestStep`/`Doublet` events, a stub on the telemetry while it runs and the record
  once at the end; in a worker session (F02) the main-thread shell checks it and sends an
  `attitudeTest` message (`src/session/`); `run_attitude_test` and `read_flight_state.attitudeTest`.
- **The inspector**: two more tabs, Tuning and Flight test (`src/ui/loop-tuning.ts`).
- **What it found**: the default rigid autopilot sits at the 45° phase-margin target (auto-tune:
  1.61/3.39 against 1.5/3); with P05 no PD gains meet 45°/6 dB over the flight (a slosh
  resonance at T+33.5 s), 40°/4 dB gives 0.74/1.49, and flown again those keep GM ≥ 4.1 dB against
  the default's 2.3 dB. Flight tests: roll follows the linear model to 0.8 %; pitch and yaw
  depart from it where the acceleration, rate and stopping-distance limiters hold the axis and
  where guidance follows the velocity the test bends.

**Files touched that the other session also edits** (additive): the three dictionaries
(`// --- E04 ---`); `src/types.ts` (`DynamicsConfig.control`, and `ControlConfig`,
`ControlChannelConfig` at the end); `src/config/validation.ts` (the fields' ranges, one call, one
function); `src/mcp.ts` (`control` in configure_mission's schema and handler, keeping it on
vehicle and wind edits; the `run_attitude_test` tool; `attitudeTest` in read_flight_state);
`src/ui/panel.ts` (the section, two lines keeping the tuning on a vehicle change, `applyControl`
and `currentControl`); `src/physics/simulation.ts` (the tuning passed to the vehicle's runtime,
`startAttitudeTest`, the record on the samples); `src/main.ts` (three callbacks in the
inspector's construction); `src/ui/names.ts` (the test's axis and sense in the event text);
`src/style.css` (one rule). Also: `src/session/protocol.ts`, `core.ts`, `session.ts` (the worker
message), `src/physics/rigid/config.ts`, `runtime.ts`, `linear.ts`, `src/ui/loop-inspector.ts`,
`.css`, `loop-analysis.ts` (`logTick` exported).

**Tests**: tests/control-tuning.test.ts (the defaults and their bits; the cap only for default
gains; ranges; the feed-forward weight in flight and in the linear loop; trials equal to the
recorded margins; auto-tune on a PD loop — widest, well damped — and infeasible targets; P05
tuned and flown again with its margins kept; the test shapes, refusals, a roll step against the
prediction with the stub and the single record, a yaw step held by the limiters; the event text),
blocks in tests/mcp.test.ts and tests/session.test.ts (a test flown in the worker records as
on the main thread).


**Results (2026-09-24)**: `npm test` 69 files / 992 tests pass (12 min); the whole-mission
fingerprints of tests/heavy/flex-golden.test.ts pass unchanged; typecheck and build pass.

### G02 — inertial navigation, GNSS and a star tracker

Physics, method and findings in [../PHYSICS.md](../PHYSICS.md) §2h, use in
[../USER-GUIDE.md](../USER-GUIDE.md) §13.

- **The sensors** (`src/physics/nav/sensors.ts`): the IMU's error model (turn-on bias,
  Gauss–Markov in-run bias, scale factor, angle and velocity random walk), three grades, GNSS and
  star-tracker figures, and the navigation's own seeded normal stream (the wind's untouched).
- **The navigation** (`src/physics/nav/navigation.ts`): strapdown in ECI with free fall under J2
  plus the specific force; a 21-state error-state EKF (position, velocity, attitude, gyro and
  accelerometer biases and scale factors) with GNSS position/velocity and star-tracker attitude
  as scalar updates; a staging's centre-of-mass shift carried into the solution; long gaps (held
  coasts) integrated in substeps.
- **Who flies on it**: the autopilot (the `sensed` seam in `RigidRuntime.step`: the navigation's
  attitude and rate; `reading` at the step start, `advance` at its end), ascent guidance (its
  position and velocity), the ascent and burn cut-offs and core burnout (the orbit it believes
  in), the in-orbit prograde hold. **Left on the truth**: air data (load relief), and the
  in-orbit burns' planning and steering, which read `sim.state` inside `src/physics/sim/burns.ts`
  — the other session's file. The owner decided they should fly on the estimate, done by the
  other session: `Simulation.knownState()` (the navigation's position, velocity, thrust axis,
  elements, attitude and rate, or the truth's very own objects without it) is there for it, and
  [HANDOFF-G02-BURNS.md](HANDOFF-G02-BURNS.md) lists every read to move and the acceptance tests.
- **A tuning margin**: the filter adds velocity noise of 10⁻⁴ of the specific force per √s under
  thrust; without it (and before carrying the staging's centre-of-mass shift) it was
  overconfident through staging and max-q (a mean normalised error of 4 against 1).
- **The record**: `RigidTelemetry.navigation` on the telemetry samples (errors in the true
  orbit's radial/along/cross axes and body axes, the filter's σ, biases true and estimated, GNSS
  and star-tracker state, innovations); `read_flight_state.navigation`; CSV `nav_*` columns; the
  inspector's Navigation tab (`src/ui/loop-navigation.ts`); the setup's Navigation section.
- **What it found**: see PHYSICS §2h — tactical + GNSS consistent within 3σ and the orbit true to
  tens of metres; a 140 s GNSS outage costs 130 m; MEMS without GNSS believes in a 529 km apoapsis
  while flying a 511 km one; gyro noise makes the attitude thrusters work harder (84 % against
  64 % full duty).

**Files touched that the other session also edits** (additive): the three dictionaries
(`// --- G02 ---`); `src/types.ts` (`DynamicsConfig.navigation`; `NavigationConfig` at the end);
`src/config/validation.ts` (ranges, one call); `src/mcp.ts` (`navigation` in configure_mission's
schema and handler, kept across edits; `navigation` in read_flight_state); `src/ui/panel.ts` (the
section, a line keeping it on a vehicle change); `src/physics/simulation.ts` (the runtime's
option; guidance's inputs, the cut-off's elements, core burnout's state and the orbit's prograde
hold taken through `navigationView`/`navigationEnd`, which hand back the very same true objects
without navigation; the held coast advancing it; the record on the samples). Also:
`src/physics/rigid/runtime.ts` (optional `navigation`; the `sensed` seam), `flex.ts`
(`imuCase`), `config.ts`, `telemetry.ts`, `src/ui/csv.ts`, `loop-inspector.ts`.

**Tests**: tests/navigation.test.ts (perfect sensors follow the truth; long steps as short ones;
seeded; settings and ranges; tactical + GNSS within 3σ through staging, its believed orbit true;
an outage within the filter's σ and the recovery; MEMS without GNSS off its believed orbit, the
star tracker fixing the attitude; no navigation, no record), blocks in tests/mcp.test.ts and
tests/session.test.ts (a navigated flight in the worker records as on the main thread).


**Results (2026-09-24)**: `npm test` 70 files / 1003 tests pass (12 min); the whole-mission
fingerprints of tests/heavy/flex-golden.test.ts pass unchanged; typecheck and build pass.

**Fixed with G05 (2026-09-25; finding 5 there, the owner's choice to fix it here)**: that harder
work was the whole second stage's cold gas. With a tactical or MEMS unit the gyro noise, read as
rate and turned into moment by the rate loop, fired the jets until the 30 kg were gone by T+250 s;
in orbit the stack could not turn for its circularisation burn, so every such flight ended with
`evt.burnAlignmentTimeout` and off its target. The jets now have a rate deadband when the flight
flies on a navigation (`JET_RATE_DEADBAND_SIGMA` = 4 in `src/physics/rigid/runtime.ts`, on the
σ the navigation reports for its rate, `NavigationSystem.rateNoise`): an axis whose rate error is
within 4σ is left to the nozzles, and a slew fires them as before. A deadband on the moment (tried
first) could not tell the noise from a slew: the loop's acceleration limit holds a slew's demand
to less than the noise's. A low-pass filter on the rate did not save the gas. Falcon 9 to its
reference orbit now reaches it on every grade: second-stage gas 16.4 kg tactical, 14.7 kg MEMS,
17.2 kg navigation grade, 17.3 kg on the truth (PHYSICS §2h). Without navigation nothing changes
(the golden fingerprints). Tests: the rate's noise in tests/navigation.test.ts;
tests/heavy/navigation-burns.test.ts (tactical and MEMS reach the target orbit, gas to spare).
`src/physics/sim/burns.ts` was not touched.

### G08 — failures of the control system, and the FDIR

Physics, method and findings in [../PHYSICS.md](../PHYSICS.md) §2i, use in
[../USER-GUIDE.md](../USER-GUIDE.md) §14.

- **The failures** (`src/physics/rigid/faults.ts`, `fault-config.ts`): sixteen kinds in three
  groups — actuators (nozzle stuck, hard-over, slowed, wired backwards; RCS jet stuck on, dead),
  sensors (three redundant strapdown IMUs: rate read backwards, stuck, biased, noisy, a unit that
  fails and flies its diagnostic word; with G02 on, an accelerometer bias and the loss of GNSS or
  the star tracker) and the flight computer (a hang, a gain of the wrong sign). Each strikes at
  its time and, if given, not before its stage flies; targets are an engine or jet of the flying
  stage, or IMU units 1–3, or all of them.
- **The FDIR** (switchable): the IMU vote (median of three, isolation by flag or by persistent
  distance from the median, the mean of two, an open loop with none); a model of every healthy
  nozzle actuator fed the computer's commands, and an engine shut down when its nozzle stays off
  the model for 0.3 s — only if the stage can spare it; jet isolation; a backup computer after
  0.2 s. Off, the computer reads IMU 1 and watches nothing.
- **Where it plugs in** (`RigidRuntime.step`, optional `faults`): the IMU case through the units
  and the vote (without navigation) or into the navigation's increments (with it); the control
  law's moment (a wrong gain, an open loop); the commands the nozzles receive and the hardware
  that moves them; the jets the allocator may use and the duty each fires at; the nozzles as the
  computer reads them, for the jets' share. With nothing struck every seam hands back the very
  object it was given: a flight that carries the layer — or has a failure still to come — is the
  flight without it, bit for bit (tested).
- **An engine shut down** (`StageState.shutEngines`, `buildRigidVehicle`): the stage's
  `engineFraction` loses the engine's share and the engine the FDIR named is the one that stops;
  without the list, the old rule (the lowest index first), untouched.
- **Break-up**: with the layer only, the attached stack is lost when q·α exceeds 300 kPa·°. The
  fleet's healthy ascents reach at most 133 kPa·° (measured on all eighteen vehicles, calm and
  shear). The owner chose (Q0) every six-DOF ascent; done with G05 (see there).
- **Presets**: Proton-M 2013, Ariane 501 (on Ariane 6, the nearest in the fleet), Vega VV17 and a
  hypothetical Falcon 9 nozzle hard-over, each with an explanation; the setup switches to the
  preset's vehicle.
- **Live injection**: `Simulation.injectControlFault(spec, fdir?)` (a flight without failures
  takes the layer from then on), through the worker (`controlFault` message; the shell checks it
  first), and WebMCP's `inject_control_fault`.
- **The record**: `RigidTelemetry.controlFaults` (failures struck, each IMU's state and those in
  use, open loop, the computer, engines and jets out, the sensed against the true rate and the
  sensors' attitude error); `read_flight_state.controlFaults`; CSV columns; events for every
  failure and FDIR action (`evt.controlFault`, `evt.fdir*`, `evt.aeroBreakup`); the inspector
  marks the IMU, actuator and control-law blocks that failed and plots the sensed rate.

**Files touched that the other session also edits** (additive): the three dictionaries
(`// --- G08 ---`); `src/types.ts` (`DynamicsConfig.controlFaults`; the G08 types at the end);
`src/config/validation.ts` (one call); `src/mcp.ts` (`controlFaults` in configure_mission's schema
and handler, kept across edits; `controlFaults` in read_flight_state; the `inject_control_fault`
tool); `src/ui/panel.ts` (the section; a line keeping it on a vehicle change);
`src/physics/simulation.ts` (the runtime's option; the stage told before a step and the events and
shutdowns taken after; the break-up check; `injectControlFault`); `src/physics/vehicle.ts` (the
optional `StageState.shutEngines`); `src/physics/rigid/mass.ts` (`budgetEngines` takes it). Also:
`src/physics/rigid/runtime.ts`, `telemetry.ts`, `config.ts`, `src/physics/nav/navigation.ts` (the
failure hooks and a `failed` aiding state), `src/session/*`, `src/ui/csv.ts`, `names.ts`,
`loop-inspector.ts`, `loop-view.ts`, `loop-navigation.ts`, `fault-names.ts`, the stylesheets, and
tests/i18n.test.ts (the G08 key families).

**Tests**: tests/control-faults.test.ts (bit for bit until the first failure; every seam hands
back its own object; the vote, a bad majority, common mode, an open loop, a flagged unit; hard-over,
stuck, slowed, miswired nozzles and the monitor; the engine-out rule; jets; the hang and the
backup; a wrong gain; the shut engine's budget; Ariane 501, Proton-M and the Falcon 9 hard-over
flown; a live injection; a sensor failure through the navigation; settings, validation, presets;
the events in three languages; the CSV), blocks in tests/mcp.test.ts and tests/session.test.ts (a
failure injected in the worker records as on the main thread).


**Results (2026-09-24)**: `npm test` 71 files / 1035 tests pass (12 min); the whole-mission
fingerprints of tests/heavy/flex-golden.test.ts pass unchanged; typecheck and build pass.

### G01 — PEG and IGM ascent guidance

Physics, method and findings in [../PHYSICS.md](../PHYSICS.md) §2j, use in
[../USER-GUIDE.md](../USER-GUIDE.md) §15.

- **The laws** (`src/physics/explicit-guidance.ts`): the burn ahead from the vehicle's stages
  (`burnProfile`: each stage from its mass at ignition, the acceleration ceiling, the staging
  gaps, the weak final stage left out as the standard law leaves it), its thrust integrals, and
  the linear tangent law; **PEG** as a predictor–corrector on the velocity to be gained with the
  cut-off predicted by integrating J2 gravity and the thrust, **IGM** in closed form in the
  terminal frame with averaged gravity and its χ̃ mode; the target the insertion orbit's perigee
  (radius, speed, a level flight path) in the plane of the mission's inclination.
- **In flight** (`ExplicitGuidance`, `Simulation`): the standard law still runs every step; the
  explicit one takes over once a later stage is lit or the first is out of the atmosphere (under
  100 Pa above 70 km, no strap-on burning), re-solves every cycle and blends each solution into
  the last, and hands back — with an event — when the stages left fall short or it does not
  converge. Guidance reads the navigation's state when G02 is on. The cut-off stays the ascent's
  (`sim/ascent.ts`, the other session's), on the orbit reached.
- **The load relief** (the G03 finding, fixed here as decided): in six-DOF PEG/IGM flights the
  command is released from where the relief held it at 4 °/s below 500 Pa, not all at once;
  every other flight is untouched (`this.explicitGuidance` guards both lines).
- **The record**: `TelemetrySample.explicitGuidance` during the ascent (law, state, t_go, v_go,
  the orbit predicted at cut-off and the target, the pitch it steers and the standard law's, its
  yaw out of the target plane, PEG's last correction, the stages planned);
  `read_flight_state.explicitGuidance`; CSV `guide_*`; the inspector's Guidance tab
  (`src/ui/loop-guidance.ts`); events `evt.guidanceEngaged/Resumed/Short/Diverged`.

**Files touched that the other session also edits** (additive): the three dictionaries
(`// --- G01 ---`); `src/types.ts` (`DynamicsConfig.explicitGuidance`; `ExplicitGuidanceConfig` at
the end); `src/physics/sim/types.ts` (the optional `TelemetrySample.explicitGuidance`);
`src/config/validation.ts` (a range, one call); `src/mcp.ts` (`explicitGuidance` in
configure_mission's schema and handler, kept across edits; the summary in read_flight_state);
`src/ui/panel.ts` (the section; lines keeping it on a vehicle change and a G08 preset's vehicle
switch); `src/physics/simulation.ts` (the law built beside the standard one; its direction taken
after the standard command in the ascent; the release in the ascent's rate limit and the relief's
last command kept; the record on the samples). Also `src/physics/rigid/config.ts`,
`src/ui/csv.ts`, `loop-inspector.ts`, `loop-guidance.ts`, tests/i18n.test.ts (a key family).

**Tests**: tests/explicit-guidance.test.ts (the thrust integrals against numerical sums; t_go
and the shortfall; the vehicle's burn ahead; PEG and IGM into three orbits in a vacuum ascent;
handing back when short; the engage rule; Falcon 9 to its insertion orbit on both, from the
second stage, on no more propellant; the six-DOF load relief released under 8° of attitude error
where the standard flight swings over 20°; the CSV; settings; the events in three languages), a
block in tests/mcp.test.ts, and tests/heavy/explicit-fleet-1/2.test.ts (every vehicle's reference
mission on PEG and on IGM, judged as the fleet is).

**Results (2026-09-24, on the code merged with main)**: `npm test` 79 files / 1110 tests pass;
the whole-mission fingerprints of tests/heavy/flex-golden.test.ts pass unchanged; typecheck and
build pass. tests/heavy/explicit-fleet-1/2.test.ts: every vehicle reaches its target orbit on both
laws and passes the fleet's acceptance, 32 of 32 (reference mission `leo` at 25 % payload,
six-DOF, crosswind, seed 20260919; 30 min):

| Vehicle | Law takes over | Δv left, PEG (m/s) | Δv left, IGM (m/s) |
|---|---|---|---|
| Soyuz-2.1b | T+128 s | 2680 | 2940 |
| Proton-M | no — short at T+111 s, standard law flies | 3013 | 3013 |
| Angara A5 | no — short at T+203 s, standard law flies | 3470 | 3470 |
| Falcon 9 | T+143 s | 2940 | 2937 |
| Falcon Heavy | T+151 s | 2807 | 2800 |
| Atlas V 551 | T+118 s | 4300 | 4280 |
| Vulcan | T+175 s | 4830 | 5098 |
| Ariane 64 | T+136 s | 4811 | 4785 |
| Vega C | T+121 s | 1139 | 1140 |
| Long March 3B/E | T+140 s | 4082 | 4075 |
| H-IIA 202 | T+121 s | 3769 | 3748 |
| Long March 5 | T+182 s | 4434 | 4452 |
| H3 | T+142 s | 5399 | 5372 |
| PSLV-XL | T+95 s | 1633 | 1578 |
| Electron | T+129 s | 2700 | 2700 |
| Starship | T+136 s | 2472 | 2467 |

### G05 — Monte Carlo insertion accuracy

Physics, method and findings in [../PHYSICS.md](../PHYSICS.md) §2k, use in
[../USER-GUIDE.md](../USER-GUIDE.md) §16.

- **The dispersions** (`src/physics/dispersion.ts`): per stage and strap-on group thrust, Isp,
  propellant and dry mass; the air's density; a steady wind and gust phase over the mission's;
  with G02 a fresh IMU realisation. Each run draws all its numbers from its own seeded stream in
  one order, clipped at ±3σ. `Simulation`'s `dispersion` option flies the dispersed vehicle
  (`dispersedVehicle`) and air (`RigidRuntimeOptions.air`, the density factor in the step and the
  point-mass drag) on the nominal plan; absent, nothing changes.
- **The set** (`src/physics/monte-carlo.ts`): `flyRun` flies a run in six-DOF to the end of its
  mission, without the attitude-loop and equation records, and reads its orbit there (against
  the target, the apsides under J2) and at the ascent's cut-off (against the planned insertion) —
  the second point added after an Electron set, whose ascent cuts off short for its kick stage,
  came back with no run in orbit; `summarizeMonteCarlo` gives per
  law the statistics, the 3σ perigee–apogee ellipse, the runs lost and why, and the regression
  shares; `monteCarloCsv` every run. `MonteCarloJob` (`monte-carlo-job.ts`) flies a set in a pool
  of workers (`monte-carlo.worker.ts`), all the laws on run k before run k + 1.
- **The window** (`src/ui/monte-carlo.ts`, `.css`): opened from the setup's *Monte Carlo* section
  (Engineer mode); settings, progress and stop, the table, the scatter with its ellipses, the
  histograms, the shares, the CSV. It is also the app's runner for WebMCP's `run_monte_carlo`
  (start, status, stop).
- **Q0** (the owner's answer, with G05): the q·α break-up of G08 now judges every six-DOF ascent,
  not only flights with the failures layer; a re-entry is not judged by it.

**Files touched that the other session also edits** (additive): the three dictionaries
(`// --- G05 ---`); `src/mcp.ts` (`McpAppHost.monteCarlo`, the tool); `src/ui/panel.ts` (the
section, `SetupCallbacks.onMonteCarlo`); `src/main.ts` (the window, closed outside the Engineer
mode); `src/physics/simulation.ts` (the `dispersion` option: the vehicle model, the density
factor, the rigid runtime's air, the navigation seed; Q0's break-up rule);
`src/physics/sim/forces.ts` (an optional density factor); `src/physics/rigid/runtime.ts` (the
air option). tests/i18n.test.ts (two key families).

**Tests**: tests/monte-carlo.test.ts (the draws: reproducible, per stage and strap-on group,
independent of what is switched off, standard normal and clipped; the dispersed vehicle and wind;
nothing dispersed flies bit for bit; thrust, density and wind reach the flight; a fresh IMU; the
settings; the set's laws; the statistics, the ellipse, the regression and the shares; the CSV;
the job: order, workers, a dead worker, stop), a block in tests/mcp.test.ts, and
tests/heavy/monte-carlo-*.test.ts (Falcon 9 on the three laws, 40 runs each so the shares are
computed; Soyuz-2.1b with its strap-ons, 30; Falcon 9 on PEG with a tactical navigation, 20: every
run counted in one outcome, every loss named by the failure that caused it — never
`evt.vehicleLost`, a timeout or a thrown error — and no more lost, no fewer on target, the runs on
target within bands, than when recorded).

**Results (2026-09-25)**, seed 1, each vehicle's reference mission to 500 × 500 km, six-DOF in
crosswind, the minimal set (± 3σ, bias; the full lines printed by the sets, run with
`--reporter=default`: under an AI agent vitest hides a passing test's output):

| Set | In orbit | On target | Lost (why) | On target: perigee, apogee (km), inclination (°) | s/run |
|---|---|---|---|---|---|
| Falcon 9 standard, 40 | 36 | 33 | 4 structuralFailure | 499.78 ± 1.11 (−0.22), 501.37 ± 0.84 (+1.37), 28.6138 ± 0.0006 | 80 |
| Falcon 9 PEG, 40 | 36 | 33 | 4 structuralFailure | 499.80 ± 1.10 (−0.20), 501.53 ± 0.83 (+1.53), 28.6156 ± 0.0009 | 83 |
| Falcon 9 IGM, 40 | 36 | 33 | 4 structuralFailure | 499.89 ± 1.07 (−0.11), 501.44 ± 0.81 (+1.44), 28.6133 ± 0.0001 | 83 |
| Falcon 9 PEG + tactical, 20 | 20 | 19 | 0 | 499.76 ± 0.91 (−0.24), 501.39 ± 0.60 (+1.39), 28.6155 ± 0.0013 | 68 |
| Soyuz-2.1b standard, 30 | 24 | 24 | 3 aeroBreakup, 3 outOfPropellant | 494.79 ± 5.18 (−5.21), 505.20 ± 5.20 (+5.20), 51.6033 ± 0.0114 | 111 |

(Five sets on four cores, 76 min.) At the cut-off, against the planned 200 × 500 km:
Falcon 9 standard 200.00 ± 0.00 × 497.86 ± 1.31, PEG 199.36 ± 0.64 × 497.62 ± 1.11, IGM
200.01 ± 0.02 × 497.82 ± 1.27; Soyuz 195.86 ± 16.30 × 497.06 ± 0.07. The shares at the cut-off:
the apogee is the propellant's and the thrust's (standard 24 % / 14 %, IGM 34 % / 40 %), the
perigee on PEG and IGM the wind's and the Isp's; the inclination over all the runs in orbit is the wind's
(46 %), through the runs in the wrong plane. Soyuz's shares are not computed (19 numbers drawn,
57 runs needed).

**Known issues** (the runs not on target; PHYSICS §2k has them in full), left for the owner:

1. Falcon 9 breaks up on q past its placard (46 kPa) at T+68–88 s: runs 21, 23, 25, 34, on every
   law (the three examined had +6.7 to +9.6 m/s of dispersed wind to the east).
2. Soyuz-2.1b breaks up on q·α (Q0's 300 kPa·°) at T+34–62 s: runs 1, 20, 23 (+6 to +13 m/s to
   the east, α 8–17°).
3. Soyuz-2.1b runs out of propellant: runs 12, 16, 25 (run 12: the third stage burns to its last
   propellant at T+1493 s on a 6400 km-apogee path; the ascent never cuts off). Not understood.
4. Falcon 9 stays in the wrong plane (29.1–29.3° against 28.61°, already at the cut-off): runs
   13, 35, 36 on every law, 13 with the navigation too; run 13 timed out aligning for its burn.
   Not understood.
5. A tactical or MEMS navigation missed its target on every flight (the set: 20 in orbit, none on
   target): the gyro noise had emptied the second stage's gas. **Fixed** (G02 above, the jets'
   rate deadband): 19 of 20 on target.
6. Electron (3 probe runs, no heavy set): one run's second stage cut off with no burn prediction
   (`evt.burnPredictionUnavailable`, −14.6 m/s to the east); it ended suborbital, the kick stage
   unlit.

Also found by the sets and fixed on the way: the Electron set came back with no run in orbit (the
orbit is now read at the end of the mission too); the loss's reason read `evt.vehicleLost`, which
follows every loss (now the first failure). 

