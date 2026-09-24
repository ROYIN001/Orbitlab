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

## Progress

| Item | State |
|---|---|
| P05 slosh, bending and notch filter | done 2026-09-24 (see below) |
| U07 ГОСТ 20058-80 notation | |
| G03 attitude-loop inspector | |
| E02 live equations panel | |
| G04 Bode, step response, margins | |
| E04 controller tuning mode | |
| G02 inertial navigation and Kalman filter | |
| G08 control-system failures | |
| G01 PEG and IGM guidance | |
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
P05 commit (723c811): see the note added when it finished.

