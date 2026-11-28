# PF-04: two suspected silent wrong answers, diagnosed and pinned

The work package is Task 6 of [S20-wave2.md](../plan/S20-wave2.md); the suspects are §6 of [the physics audit](physics-audit-2026-11-26.md). No source file is changed. Two test files pin what the app does today, under titles that begin `known defect (PF-04)`: [`tests/rendezvous-transfer-fallback.test.ts`](../../../tests/rendezvous-transfer-fallback.test.ts) (the station transfer; the batch that replaces the assertion is W-L) and [`tests/lambert-j2.test.ts`](../../../tests/lambert-j2.test.ts) (the Lambert plan; OE-4). Every number below was measured with the app's own code, by the tests themselves or by a scratch copy of them that was deleted; each pin in the tests holds the measured value within 10 %.

## Summary

| Suspect | Reached on what was swept | Size of the wrong answer | What the user sees | Owner |
|---|---|---|---|---|
| 1. The station transfer keeps its first guess | No: 36 of 36 nominal flights solved, in 2 or 3 passes | When forced: the transfer burn is 30.3 m/s instead of 41.8, the spacecraft is 107 km from the station at the arrival instead of 2.1 km, the propellant runs out and it never docks | Nothing about the solution. The braking burn reads 29.9 m/s, Kurs "takes over from 107296 m", and 1.7 h later "Rendezvous stopped: usable propellant depleted" (level `fail`) | W-L |
| 2. The Lambert plan, two-body, flown with J2 | Yes, on every J2-on plan of the case tried | 59.5 km (i = 0°), 15.3 km (51.6°), 28.4 km (98°) from the target at the arrival; velocity matched to 7.8e-6 m/s | No message or number says so. The only sign is the drawing: the target's marker and the spacecraft's are that far apart at arrival | OE-4 |

## Suspect 1: the station transfer that keeps its first guess

`src/physics/sim/rendezvous.ts:262-267` calls `interceptImpulse(here, plan.tArrive - tc, aim.r, guess, 5)` and flies `shot ? shot.dv : guess`. The tests wrap `interceptImpulse` with `vi.mock` of `src/physics/rendezvous/targeting` (the original function; the arguments and the result of the call with tolerance 5 m are recorded, and the wrapper can be told to answer `null` for that call).

### Step 1: the nominal flights (not reached)

Every profile of `PROFILE_IDS` (`twoOrbit`, `fourOrbit`, `twoDay`) at each of the first twelve windows of `launchWindows(orbitById('iss'), siteById('baikonur'), 2026-09-20T00:00Z, 12)` (2026-09-20T22:01:44Z to 2026-10-01T17:44:57Z), port `rassvet`, the mission otherwise that of `tests/rendezvous.test.ts` (Soyuz-2.1a, crew, 7,150 kg, point mass, calm, seed 1), flown to the transfer burn's solution.

| Profile | Flights | Solver calls each | Solved | Passes | Miss at the arrival | Coast to arrival | Time to reach the burn (each) |
|---|---|---|---|---|---|---|---|
| twoOrbit | 12 | 1 | 12 | 2 | 0.159 to 0.172 m | 2,781.9 s | 57 to 185 ms |
| fourOrbit | 12 | 1 | 12 | 3 | 0.271 to 0.495 m | 2,776.2 s | 67 to 77 ms |
| twoDay | 12 | 1 | 12 | 2 | 0.001 to 0.004 m | 2,780.3 s | 221 to 280 ms |

36 of 36 return a solution, in at most 3 passes. The pre-check's sixteen flights gave 0.28 m or better; with all twelve windows the four-orbit flight reaches 0.495 m, still a tenth of the 5 m tolerance. Pinned: 36 flights, one call each, 36 solved, none over 5 passes.

How different the 36 flights are: not at all, in the geometry that matters. The windows are the times the launch site passes under the ISS orbit's plane, 23 h 36 min 40 s apart. The station the flight meets is not placed from the real one: when the spacecraft separates, `Rendezvous.start` plans the profile from the separation state and places the station (`src/physics/sim/rendezvous.ts:137-151`, the plan at `:141`), and `planRendezvous` builds the station in the spacecraft's own plane, at the aim point's distance ahead of the plan's arrival state (`src/physics/rendezvous/plan.ts:137-144`). So no launch time can change the spacecraft's geometry relative to the station; a later launch only turns the plane. Accordingly the coast to the arrival is the same to 0.1 s on every window, and the flown state at the burn differs from the plan's nominal state by the same amount on every window (two-orbit: 144 m radial, 499 m along-track, 0.41 m cross-track, 0.53 m/s; four-orbit: 19 m, 560 m, 0.55 m, 0.63 m/s; two-day: 4 m, 34 m, 0.01 m, 0.02 m/s). Twelve windows are in effect three flights.

### Step 2: how far the solver is from failing

The arguments recorded on the two-orbit flight of the first window, the state displaced along its own radial (r̂), along-track (ĥ × r̂) and cross-track (ĥ = r × v normalised) axes, the target, the first guess and the tolerance (5 m, 12 passes) as recorded. The smallest displacement of the task's grid that returns `null`:

| Direction | + | − |
|---|---|---|
| Position, radial (±1, 3, 10, 30, 100, 300 km) | none up to 300 km (11 passes at 300) | none up to 300 km (11 passes) |
| Position, along-track | none up to 300 km (5 passes) | none up to 300 km (6 passes) |
| Position, cross-track | **1 km** (every value tried is `null`) | **1 km** (every value tried is `null`) |
| Velocity, radial (±1, 3, 10, 30, 100 m/s) | none up to 100 m/s | none up to 100 m/s |
| Velocity, along-track | none up to 100 m/s | none up to 100 m/s |
| Velocity, cross-track | none up to 100 m/s | none up to 100 m/s |
| Duration (±10, 30, 100, 300, 1,000 s) | **300 s** (100 s: 10 passes, 531.6 m/s) | **1,000 s** (300 s: 12 passes, 1,141.4 m/s) |

The undisplaced call is solved in 2 passes at 41.8 m/s (the guess is 30.35 m/s).

The cross-track row was taken below the grid as well: +1, 2, 3, 5, 10, 20, 30, 100 m and −1 to −300 m are solved; +300 m returns `null`; with the flight's 12 passes, +100 m is solved in 6 passes at 139.0 m/s and ±200 m in 7 or 8 passes at 233 to 288 m/s; the review found the largest 12-pass cross-track answer, 333.7 m/s, at −300 m (its measurement; −300 m converges in 12 passes here too). The transfer turns about half an orbit (a 2,782 s coast), where an impulse barely moves the arrival out of the plane: a small cross-track offset makes the Jacobian nearly singular, and with 12 passes the solver either gives up or answers with an impulse of 139 to 334 m/s. Answers in the thousands of m/s come only from the duration rows at 12 passes (1,141.4 m/s at −300 s) and from an experiment with 100 passes instead of 12, in which −1, −3, −10 and −300 km and +10 km are solved (15 to 68 passes, 909 to 12,512 m/s) while +1, +3 and +300 km still return `null`; +300 s and +1,000 s of duration also stay `null`. The limit is the geometry, not only the cap on passes.

Is that reachable? On the flights swept, the flown state at the burn is 0.41 to 0.55 m out of the plan's plane (above), so the solver is a few hundred times inside its cross-track margin (100 m solved, 300 m not). The planner puts the station in the spacecraft's own plane at the arrival (`src/physics/rendezvous/plan.ts:137-144`) and the burns before the transfer are posigrade, so in point mass nothing pushes the flight out of that plane. The duration is the plan's own (`plan.tArrive - tc`, equal to the planned coast to 1 ms on every flight), so a duration error of 300 s does not arise from the flight either.

Pinned (case `where the solver gives up`): the whole table above as a state; +300 s `null` and +100 s solved (9 to 11 passes, 531.6 m/s within 10 %); −1,000 s `null` and −300 s solved (at least 11 passes, 1,141.4 m/s within 10 %); cross-track +300 m `null` and +100 m solved (6 passes, 139.0 m/s within 10 %).

### Step 3: what a failed solution does to the flight

The two-orbit flight of the first window, flown to its end, once with the solver left alone and once with the wrapper answering `null` for the transfer call. The distance to the station is taken at the first step that ends at or after the plan's arrival (0.43 s after it with the solver, 0.46 s after without).

| | Solver left alone | Solver answers `null` |
|---|---|---|
| Transfer burn's event (`evt.rendezvousBurn`, dv3) | 41.8 m/s | 30.3 m/s (the guess, 30.35) |
| Transfer burn done | t = 7,036.1 s | t = 7,009.1 s |
| Distance to the station at the arrival (t = 9,768.4 s) | 2,145 m (the aim point) | 107,195 m |
| Braking burn's event | 5.2 m/s | 29.9 m/s |
| `evt.kursApproach` | from 2,128 m, t = 9,774.9 s | from 107,296 m, t = 9,832.4 s |
| Events after that | `kursFlyaround` (445 m), `kursStationkeeping`, `kursFinal`, `evt.contact` (success), `evt.docked` (success) | `evt.rendezvousFuelDepleted` (fail) at t = 15,995.4 s |
| End | t = 12,320.9 s, status `orbit`, `sim.state.note` `docked`, phase `docked` | t = 15,995.4 s, status `orbit`, `sim.state.note` `rendezvousFuelDepleted`, phase `aborted`, 82.7 km from the station, propellant 0 |
| Run time | 0.30 to 0.35 s | 0.15 to 0.18 s |

Every event from the transfer burn to the end of the failed flight, with its level: `evt.rendezvousBurnDone` info, `evt.rendezvousBurn` (brake, 29.9 m/s) info, `evt.rendezvousBurnDone` info, `evt.kursApproach` (107,296 m) info, `evt.rendezvousFuelDepleted` fail. None names the solver or the transfer's solution; none is `warn`. The one `fail` comes 6,163 s after Kurs takes over, and its text is "Rendezvous stopped: usable propellant depleted" (HUD: "Propellant depleted; docking cannot continue"). So the flight does end in a failure the user is told about, but the message names the propellant, not the transfer that was never solved; the only earlier clue is the Kurs event's range, 107 km where it is normally about 2 km.

Pinned (case `known defect (PF-04): a failed transfer solution is flown as the first guess, and nothing says so`): the transfer event's `dv` equals the recorded guess's length to 0.1 m/s, and that length is 30.35 m/s within 10 %; the five events after it, by key and level, as listed; no event key mentions a solver, intercept, target or guess, and none is `warn`; the braking burn 29.9 m/s and the Kurs range 107,296 m within 10 %; 107,195 m from the station at the arrival within 10 %; `note` `rendezvousFuelDepleted`, phase `aborted`, no `evt.docked`. The solver-left-alone flight is pinned beside it (41.8 m/s, 2,145 m within 10 %, `docked`).

### What the fix's failing test should assert (W-L)

The fallback has two parts to replace. The W-L test should force `interceptImpulse` to return `null` for the transfer (the same `vi.mock` wrapper) and assert that the flight says so at the transfer: an event at level `warn` or `fail`, at the transfer burn's time, naming the unsolved transfer, and either no burn flown on the bare guess or the flight held (stationkeeping, a re-plan, or an abort) rather than an approach from 107 km that ends with the propellant spent. A second assertion worth making: the cross-track case of Step 2 (+300 m, or +1 km) does not end in `null` or in an impulse of hundreds of m/s without a word, since that is the solver's weak direction.

## Suspect 2: the Lambert plan solved for two bodies and flown with J2

`rendezvous(chaser, target, dep, tof, j2)` (`src/orbit/maneuvers.ts:573-584`) takes the chaser at departure and the target at arrival with `stateAt(…, j2)`, joins them with the two-body `lambert`, then flies the first burn with `Builder(chaser, j2)` and sets the second burn to `tg.v − s.v`: the target's velocity, wherever the chaser then is. With J2 on, the flown arc does not end where the two-body arc does, and the second burn gives the chaser the target's velocity at the wrong place.

### Step 4: the six flights (reached)

`chaser = circle(400e3, i, { raan: 0, m0: 0 })`, `target = circle(800e3, i, { raan: 0, m0: −6° })` (the helper of `tests/maneuvers.test.ts`), `plan = rendezvous(chaser, target, 600, 2800, j2)`, the chaser at `stateOnPlan(plan, plan.arrival + 1e-6, j2)` against `stateAt(target, plan.arrival, j2)`; arrival at 3,400 s.

| i | J2 off: position | J2 off: velocity | J2 on: position | J2 on: velocity |
|---|---|---|---|---|
| 0° | 7.41e-3 m | 7.70e-6 m/s | 59,500.6 m | 7.76e-6 m/s |
| 51.6° | 7.41e-3 m | 7.70e-6 m/s | 15,329.3 m | 7.74e-6 m/s |
| 98° | 7.41e-3 m | 7.70e-6 m/s | 28,365.8 m | 7.72e-6 m/s |

The pre-check's figures (7.4e-3 m; 59.5, 15.3, 28.4 km; 7.7e-6 m/s) and the audit's (58, 15, 28 km) are reproduced. Pinned: case `two-body: the plan arrives on the target`, within 0.1 m and 1e-4 m/s at each i; case `known defect (PF-04): with J2 on, the plan arrives tens of kilometres from the target`, within 10 % of 59,500 m, 15,330 m and 28,370 m in that order, and velocities within 1e-4 m/s. Both bounds are the task's, unchanged; both hold.

The size of the wrong answer: the plan reports a rendezvous and its Δv, but the spacecraft ends 15 to 60 km from the target on a matched velocity, and it stays about that far away. How the miss depends on the transfer's length was not measured.

### What the user sees on the Orbit page

Read in `src/ui/orbit`, no browser run:
- The J2 toggle (`src/ui/orbit/playground.ts:1044`) replans with the one flag (`this.replan()`, which calls `makePlan(this.maneuver, this.orbit, this.planStart, this.j2)` at `:642`); its note (`pg.j2.note`) says only that J2 turns the plane and the perigee.
- The plan's panel (`planTable`, `src/ui/orbit/maneuver-panel.ts:283-360`) lists the burns, the total Δv, the duration, "Orbit at the end" (perigee, apogee, inclination), the budget, and warnings for a short budget, an unusable craft and a long burn. Nothing compares the arrival with the target: there is no miss distance, no flag and no message.
- The porkchop plot (`playground.ts:689`, `porkchop` in `maneuvers.ts:587-599`) is computed with the same two-body `lambert` and shows costs only.
- The only sign is in the drawing: the 3-D view draws the target's marker at `stateAt(this.target, this.time, this.j2)` (`playground.ts:548`) and the spacecraft on the plan (`stateNow`, `:628`), so at arrival the two markers are 15 to 60 km apart. Whether that can be seen at the view's scale (the orbit is about 7,000 km across) was not checked.

So the page gives the user no sign that the plan misses, beyond what may be visible in the 3-D view. The rendezvous planner is offered at the Engineer level only (`playground.ts:226-227`).

### What the fix's failing test should assert (OE-4)

The same six flights with J2 on, planned and flown with the one flag, arriving on the target to the J2-off bound: within 0.1 m (or the bound OE-4 states) and 1e-4 m/s, at each of i = 0°, 51.6°, 98°. A plan that corrects its first burn by shooting on the trajectory the page itself flies, `stateOnPlan` with the J2 flag (the page's J2 is secular rates on the elements, `stateAt` in `src/orbit/kepler.ts:207-208`, not the integrated J2 coast of `src/physics/rendezvous/targeting.ts`), passes it; today's plan misses by 15 to 60 km. If OE-4 keeps a two-body plan, the test should instead assert that the page states the miss.

## What was swept and what was not

- Swept for suspect 1: three profiles × twelve nominal windows from 2026-09-20, one port (`rassvet`; it does not enter the transfer's aim), point mass, calm air, seed 1, default guidance and failures. "Not reached" is a statement about these 36 flights, which are in effect three geometries.
- Settled by reading the code, without a run: manual or TORU input before the transfer is impossible, because `command()` returns false unless the flight is in the approach (`src/physics/sim/rendezvous.ts:155`, `inApproach` at `:180-182`); and time warp cannot shift the transfer's coast, because `stepOnce` clamps every step to `suggestedDt()` (`src/physics/simulation.ts:827`) and the coast's step is clamped to the next burn's start (`src/physics/sim/rendezvous.ts:187-192`).
- What could and could not reach the fallback (the review's reading, checked against the same lines): after separation both flight models fly the same `rendezvous.step`; the station is placed in the spacecraft's own plane from the separation state; a late launch moves only that plane. So the ascent, the launch time and the flight model reach the transfer only through the state at separation.
- Not swept for suspect 1, and still needing a run: the six-DOF ascent and off-nominal settings (wind, failures, guidance changes), that is, separation states other than the nominal point-mass one; whether the ±20 m/s clamp on the correction burn's secant (`src/physics/sim/rendezvous.ts:309`) can leave a phase error the transfer then has to absorb; other ports and other payload masses.
- Swept for suspect 2: the one transfer of the task (400 to 800 km, about 165°, 600 s departure, 2,800 s flight) at three inclinations. Other transfers, the porkchop's grid and longer flights were not tried.
- Step 2 displaced one direction at a time; combined displacements were not tried.

## Also seen, not examined

- The planner has a second silent fallback of the same kind: `src/physics/rendezvous/plan.ts:125`, `const dv = apsisImpulse(s, tArrive - tb, rAim, guess) ?? guess`. Not reached: the review wrapped `apsisImpulse` and it returned non-null on all 36 flights, one call each (the review's measurement, not repeated here). That the plan's arrival is at the aim point proves nothing, because the station is built from the arrival state. If it were reached, the plan would coast the `raiseImpulse` guess to `tArrive` (`:127`) and place the station around wherever that guess arrives (`:137-144`, at the arrival's radius plus the aim point's offset): a station at another height than intended and a transfer that does not arrive level, not a miss. The flight would then target that station, and nothing would say so.
- In the solver's weak direction (Step 2, cross-track), with the flight's 12 passes the solver can return a solution of 139 to 334 m/s for an offset of 100 to 300 m; the flight would then fly it, or run out of propellant trying, without a warning. Not reached on the flights swept.

## Runs (once each before hand-off)

- `npx vitest run tests/rendezvous-transfer-fallback.test.ts tests/lambert-j2.test.ts tests/rendezvous.test.ts tests/maneuvers.test.ts`: 48 of 48 pass (4 files: 4 cases, 2, 22, 20). `tests/rendezvous.test.ts` and `tests/maneuvers.test.ts` are unchanged. Time, over the runs made: the 36-flight case 4.5 to 5.2 s, the Step 2 case 0.42 to 0.56 s, the two Step 3 flights 0.15 and 0.30 to 0.38 s; the transfer file about 5.5 to 6 s in all, the Lambert file under 10 ms. Neither is near 30 s.
- `npm run typecheck`: clean.
- `node scripts/verification/select-checks.mjs --files tests/rendezvous-transfer-fallback.test.ts tests/lambert-j2.test.ts` lists 3 unit files (`tests/lambert-j2.test.ts`, `tests/rendezvous-transfer-fallback.test.ts`, `tests/repo-hygiene.test.ts`), commands 0 of 4, browser 0 of 54, heavy 0 of 34, fleet 0 of 6. Run on exactly those: 15 of 15 pass (3 files: 2, 4, 9 cases). Review round: see below.
- `npx vite build && node scripts/bundle-budget.mjs`: `bundle budget: ok`. No source file changed, so the bundle cannot change.

## Not checked

The default, heavy and fleet suites (not selected). No browser run: what the 3-D view shows at arrival is read from the code, not seen. Whether any lesson or case drives the Orbit page's rendezvous with J2 on was not searched.

## Review round

An independent review gave the verdict "pass with fixes": both diagnoses right, every pinned number reproduced exactly. The orchestrating session's rulings, and what changed:

1. The `known defect (PF-04)` case of the station transfer inspected the events from the transfer burn's own event on, so a warning logged inside `startBurn` before that event would have fallen outside it and the case would have stayed green after a fix. It now records the event count before the step that calls the solver and asserts that this step logs exactly `evt.rendezvousBurn` at `info`; and it asserts over the whole flight that the events at `warn` or `fail` are exactly `evt.rendezvousFuelDepleted` at `fail`. Measured first: the failed flight logs 30 events, 17 `info`, 5 `major` (ignitions, liftoff, MECO, SECO), 7 `success` (separations, jettisons, the parking orbit) and that one `fail`. The earlier assertions are kept; the case count is unchanged.
2. Step 1: the reason the 36 flights are in effect three is now the station's construction from the separation state (above), not the windows' phasing. The windows are 23 h 36 min 40 s apart as measured (2026-09-20T22:01:44Z, 2026-09-21T21:38:24Z, …), not the 23 h 23 min of the ruling.
3. The planner's fallback at `plan.ts:125`: the reviewer's measurement is cited as such, and what the fallback would do if reached is said.
4. Each m/s figure of the cross-track direction now carries its pass count; thousands occur only in the duration rows at 12 passes and in the 100-pass experiment. The fragment says "+300 m and ±1 km".
5. "What was swept" now says which items are settled by the code (no manual input before the approach; time warp clamped) and gives the reading of what could reach the fallback and what still needs a run.
6. The OE-4 section no longer proposes the station flight's integrated-J2 shooting for the Orbit page, whose J2 is secular rates on the elements; the proposed failing test is unchanged.

Runs after the round: `npx vitest run tests/rendezvous-transfer-fallback.test.ts tests/lambert-j2.test.ts tests/repo-hygiene.test.ts`, 15 of 15 (3 files: 4, 2, 9 cases); `npm run typecheck`, clean.
