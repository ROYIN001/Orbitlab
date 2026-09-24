# Six-degree-of-freedom acceptance gates

Scope: the approved educational model for Falcon 9 and Soyuz-2.1a, with automatic and manual rate control, extended to all eighteen vehicles (roadmap P01, last section). This is an implementation-verification matrix, not a claim of flight validation. The controlling design is [the Thai proposal](../../implementation-planning/six-dof-design-proposal-th.md); parameter provenance and uncertainty are in [the vehicle dossier](SIXDOF-VEHICLE-DATA.md).

**Where the evidence lives.** Paths below that start `../audit-2026-09-19/` or
`../../implementation-planning/` are the owner's local evidence and planning folders, kept
outside this repository; they are cited as the record of what was run at the time and cannot
be opened from a checkout. What *can* be re-run from a checkout: the delivered-orbit matrix
(`npm run test:heavy`, tests/heavy/), the six-DOF fleet matrix (`npm run test:sixdof-fleet`,
tests/sixdof-fleet/), the mission convergence gate
(tests/rigid-mission-convergence.test.ts), the recovery acceptance (tests/rigid-recovery.test.ts)
and the component sensitivity study (tests/rigid-sensitivity.test.ts). The current state of the
whole project is in [IMPLEMENTATION-STATUS.md](IMPLEMENTATION-STATUS.md).

## Resume checkpoint — 2026-09-20

**Final local acceptance:** 762 tests in 54 files passed in 1225.00 s on
2026-09-20, including both delivered-mission convergence cases, recovery
numerical checks and the 390-case component sensitivity study. TypeScript and
the production build passed. Local browser results and their performance
limits are in `SIXDOF-BROWSER-QA.md`. The agreed orbital scope is accepted;
Falcon recovery remains experimental. This supersedes pending-suite statements
in earlier checkpoint text below. Deployment is a separate verification step.

### Completed orbital gates

Both complete reference missions passed `rigid-mission-convergence.test.ts`
after payload separation. The 0.01/0.005 s plant comparison retains the same
0.01 s guidance/control clock and all original tolerances. Both runs per
vehicle have finite states, actual target events, separated payloads, no
independent raw-orbit misses and no discontinuous checkpoints.

| Reference | Maximum position difference (m) | Velocity (m/s) | Attitude (degrees) | Event time (s) |
|---|---:|---:|---:|---:|
| Falcon LEO | 0.000044174 | 5.700e-8 | 8.386e-9 | 1.152e-11 |
| Soyuz ISS-plane orbit | 0.002984539 | 3.415e-6 | 5.712e-8 | 1.371e-8 |

Nine common-time checkpoints and respectively 19/21 main events were compared.
These numerical results verify the implemented model, not real-flight accuracy.

The additional delivered-orbit matrix also passed 7/7:

| Vehicle / flow / wind | Delivered apogee / perigee (km) |
|---|---:|
| Falcon / quasi-steady / fixed 5 m/s | 505.653 / 499.969 |
| Falcon / quasi-steady / fixed 10 m/s | 504.224 / 500.654 |
| Falcon / quasi-steady / shear | 505.352 / 501.278 |
| Soyuz / quasi-steady / crosswind | 427.049 / 420.263 |
| Soyuz / quasi-steady / shear | 427.054 / 420.268 |
| Falcon / reduced flux / calm | 504.436 / 501.272 |
| Soyuz / reduced flux / calm | 427.057 / 420.268 |

Each final record independently re-derives the orbit from raw position/velocity,
confirms payload separation and has no orbit misses. All 40 physics/data/harness
hashes match across the seven runs and before/after each run. Four parallel SSR
workers reported a Vite websocket-port collision; they nevertheless produced
complete verified final records. Those warnings are retained in stderr logs.

Evidence: `../audit-2026-09-19/validation/resume-final-suite.log`,
`resume-final-suite-summary.json`, `resume-final-delivered-matrix-summary.json`
and individual `resume-final-*.jsonl` records in that directory. Complete-suite
status is recorded separately once the remaining regression tests finish.

This dated section supersedes the corresponding open-item statements below; historical results remain intact. The owner selected **orbital acceptance for the two reference vehicles, with Falcon recovery remaining experimental**. Orbital gates above and local browser checks in `SIXDOF-BROWSER-QA.md` are complete. The complete regression suite is still running; publication has not occurred.

Recorded provenance now includes the actual vehicle `dataRevision`, deep-copied runtime wind profile/seed, effective maximum RK step and maximum inertia-derivative offset. CSV schema 3 exports these values plus sampled ECI wind; older recordings leave unknown provenance blank. Both frame interpolation and the independent attitude track reject transitions across data revisions. Metadata/CSV/attitude-track checks passed 15/15, including runtime overrides, nested copy isolation and export from recorded values rather than current settings.

Scheduled actions commit at their accepted clock, including actions already due before integration. The recorder's transition callback captures that post-action pose at the same time. Held-pad ignition and in-flight engine-out/thrust-loss/range-safety now expose actual chamber availability immediately, with no extra motion, fuel charge or gimbal advance. Seven new failure-boundary checks passed, including upper-stage ignition, the unchanged orbital alignment gate, and stopping later queued actions after destruction. Earlier focused pad/staging/replay checks also passed; these bounded fixtures do not replace full-mission evidence. TypeScript passed after the boundary changes.

The reduced-flow derivative study uses a synthetic smooth burn with `Ixx=10 exp(-0.7t)`, one exit on the spin axis and an independent analytic spin solution. All runs use 0.01 s control, 0.0025 s RK and 2 s duration. Only the derivative maximum changes:

| Derivative maximum (s) | Maximum endpoint relative error | Maximum central relative error | Final spin error (rad/s) |
|---:|---:|---:|---:|
| 0.001 | 3.50082e-4 | 8.16669e-8 | 4.63635e-9 |
| 0.0005 | 1.75020e-4 | 2.04171e-8 | 1.15908e-9 |
| 0.00025 | 8.75051e-5 | 5.10554e-9 | 2.89777e-10 |

The bounded one-sided endpoints exhibit first-order derivative convergence and central samples second order; no global RK-order claim follows. Maximum final attitude error is 8.39e-8 degrees. The actual offset is `min(derivativeStepS, outerDt/4)`; default 0.001 s is unchanged. This verifies the numerical derivative in that declared reduced model, not real tank dynamics.

Terminal-restart stress checks covered delay 0.2/0.5/1.0 s × thrust rise 0.1/0.3/0.5 s for both previously described descent fixtures: 18 trajectories, **14 landed and 4 impacted**. At delay 0.2 s the 74 m fixture impacted for rise 0.1 s; the 255.9 m fixture impacted at all three rises. Those four runs exhausted their fuel and contacted at approximately 105–125 m/s downward. The tests passed because finite state/fuel, restart limits and honest physical contact classification were preserved; the separate nominal landing assertions remain strict. These failures are retained, and **the timing range is not a robust recovery envelope**.

Evidence for the derivative and restart studies: [resume-timing-and-derivative.log](../../audit-2026-09-19/validation/resume-timing-and-derivative.log), 28 checks across `rigid-flow-derivative.test.ts` and `rigid-debris.test.ts`, all passed in 24.43 s. Their success does not mean that every stress trajectory landed.

Status recorded 2026-09-19 while integration is in progress. A test present in source is **coverage**, not evidence that the entire gate passed. Executed by this document's author: 23 actuator/control/aero, 21 runtime, 8 wind-guidance and 12 finite-inventory tests passed. The sensitivity suite has 27 original authority/uncertainty tests and 40 additional component-distribution tests; executed results and a subsequently corrected active-upper-stage fixture are recorded below. Full missions, recovery, rendering and browser performance are separate gates; these segment results do not establish those gates. No NASA check case has yet been run merely by citing its publication.

| Gate | Required independent check and acceptance | Existing coverage / remaining evidence |
|---|---|---|
| Frames and units | Hamilton scalar-first Body→ECI, +X nose; right-hand +90° checks on all axes; proper render rotation; round trips within 1e-10. Position and velocity refer to CG. | `rigid-core.test.ts`, `rigid-mass.test.ts`; live renderer, pad Earth rotation and ENU/ECI integration still need checking. |
| Fixed-mass equations | Inertial straight line; constant force and principal-axis torque against analytic answers (10 s, relative target 1e-8). Constant sphere spin angle error ≤1e-6 rad in 100 s. | `rigid-core.test.ts`; record executed results. |
| Torque-free rotation | Fixed mass/tensor: inertial angular-momentum **vector** and rotational energy relative drift ≤1e-6 over 600 s; compare independent solver. | `rigid-core.test.ts`; record actual drift and independent comparison. This conservation criterion does not apply to the burning baseline. |
| Quaternion | Accepted norm error ≤1e-10; record raw pre-normalization drift; q/−q equivalence, including rounded 180° ties and >180° paths. | Core tests plus executed control tests; live roll/render/replay still open. |
| Mass/CG/tensor | Independent asymmetric components and parallel-axis fixtures; full/partial/empty fuel, fairing/stage/payload ownership, SPD and mass closure. Finite RCS inventory must already be inside dry mass. | `rigid-mass.test.ts`; runtime mass subtraction and structural-datum pose continuity still open. |
| Axial burn | No aero/gravity, constant Isp/thrust: Δv = Isp g0 ln(m0/m1), relative error ≤1e-5; no second exhaust-momentum acceleration. | Executed runtime fixture passes <1e-8 relative over 10 s at negligible gravity (r=1e12 m), with trial-step mass variation. |
| Variable mass | Baseline and reduced flux model meet the distinct contract below; instantaneous m/CG/I evaluated at RK substages, no hidden attitude edits. | Executed: pure RK trial snapshots/finite gas commit, hand-computed tensor/multiple exits, zero cases, frame covariance, analytic point-exit pitch damping and varying-I axial spin. Paired 10 s trajectories pass the same response band. Full mission comparisons and derivative-interval study remain open. |
| Control signs and authority | Actual r×F for every engine; gimbal angle/vector slew/lag limits; no roll from a single centred TVC; physical positive-force jets, depletion and residual telemetry. | Executed: all signs, asymmetric engine loss, underactuation, travel/rate/lag, fuel and slender ring roll allocation. Runtime pressure/throttle/failure mapping still open. |
| Perturbation recovery | Feasible, specified fixture: 1° attitude and 0.1°/s disturbance on each axis reaches <0.1° and <0.05°/s in 10 s, using actuator forces. | Executed on all three axes with finite paired jets and RK4, plus the full-stack segment matrix below. Three weak-actuator 60° maneuvers pass <0.1°/<0.05°/s by 120 s, peak rate <2°/s and excursion <62°. Controller has no integral state; stopping-distance commands use physical torque/inertia and lag/slew allowance. This does **not** prove full mission performance. |
| Aero and wind | Vacuum/zero relative speed: zero loads; translational drag power ≤0; CP sign around CG; rotational damping removes energy; deterministic ENU seed/profile, high-angle extrapolation flagged. | Executed component checks. Integrated Earth-relative airflow, configuration changes and high-angle recovery need checking. |
| Separation | All bodies together conserve linear and orbital+spin angular momentum within 1e-8 relative with an absolute near-zero floor. Include ω×offset and paired interface impulses; no missing/duplicate mass. | `rigid-core.test.ts` mathematical partition fixtures; actual Falcon stage/fairing and Soyuz four-booster/hot-stage events still open. Energetic separation need not conserve kinetic energy. |
| Step/event accuracy | Smooth coupled RK4: 0.02/0.01/0.005 s near order 4 against an independent answer. Split ignition/cutoff/failure/depletion/separation boundaries; never interpolate a discontinuous body identity. | Core convergence fixture exists. Runtime event and fuel boundaries still open. Sample-held controller/actuator error must be measured separately; do not claim global fourth order from the plant fixture alone. |
| Mission convergence | Same checkpoint at dt 0.01/0.005 s: attitude <0.1°, speed <0.1 m/s, position <10 m, event time <0.02 s, identical terminal classification. | Requires both reference vehicles and separate first-stage recovery. Do not widen tolerances to fit results. |
| Recovery/contact | Detached controlled Falcon stage uses the same 6DOF state/finite forces. Landing predicate declares vertical and lateral speed, tilt and rate limits; excessive conditions fail visibly. | Integration and browser evidence required. Decorative debris is labelled separately; no contact/leg dynamics claim. |
| Replay/export | Immutable frames store full quaternion/rates, actual actuator state, identity/configuration, mass properties and model/data/wind revisions. SLERP; q-sign equivalence; seeking cannot expose later state. | Live/replay comparison, recorded-schema migration and CSV unit tests/browser checks required. |
| Warp/manual/UI | Fixed simulation ticks across 30/60/120 FPS and warp; same seed gives same tick state. Manual commands body rates/throttle through the same actuator plant. Reset/pause/seek/export and three languages work. | Integrated tests/browser matrix and observed achievable warp required. Physics/controller sampling cannot be render-driven. |
| Reference fleet | Each named vehicle: nominal, max-Q, coast/restart, separation, off-axis engine loss, nonzero roll, calm/crosswind/shear, parameter sweeps; explain failures beyond authority. | Scenario results pending. Two supported reference models do not establish all 18 vehicles. |

## Variable-mass acceptance contract

Baseline metadata must say `quasi-steady`: use current inertia in `I ωdot = M − ω×(Iω)` with mass-flow correction zero. This is an approximation for an open system. Constant-I torque-free energy/angular-momentum tests remain mandatory, but requiring the vehicle alone to conserve angular momentum during propellant loss would test the wrong model. Never add `−Idot ω` alone and call the result general open-system dynamics. Net engine thrust already includes exhaust/pressure momentum.

The sensitivity comparison described in the dossier is a **reduced** model with negligible/symmetric internal relative motion:

`Mflow = −Idot ω − Σ mdotOut [(rExit·rExit)1 − rExit rExitᵀ + JexitDisk] ω`.

Use outward-positive flow, exits relative to current CG, the same Body tensor convention, and a documented finite exit-disk radius when used. The implemented comparison uses **point exits** (`JexitDisk=0`), including fired RCS outlets. `Idot` is a bounded central/one-sided finite difference of the same instantaneous component model, with interval `min(0.001 s, dt/4)`; a separate derivative-interval convergence study remains open. Do not differentiate across staging as if it were a smooth burn. The translation/CG-flow approximation remains disclosed; adding this rotational term does not implement every variable-mass translation term in the reference derivation.

Independent reduced-model fixtures must include: zero flow → baseline; ω=0 → zero correction; constant inertia with one point exit at `r=(L,0,0)` → `Mflow=(0,−mdot L²ωy,−mdot L²ωz)`; arbitrary symmetric `Idot` with explicit hand-computed product; multiple exits sum linearly; rotated tensors/exits transform consistently; and derivative-step convergence during a smooth burn. A closed **variable-inertia, no-outflow** toy can verify `−Idot ω` against constant inertial angular momentum, but must be named as that distinct closed-system fixture, not a rocket-burn validation.

## Sensitivity and release decision

Use identical guidance, controller gains, dt, mission config and wind seed between paired runs. Do not retune gains between baseline and flux cases to hide a disagreement. Run each reference vehicle and relevant attached/separated configuration. Sweep inertia 0.75/1/1.25 with physical SPD tensors, CG ±0.01L, CP ±0.05L (and a stability-boundary case), aero/damping 0.5/1/1.5, and actuator authority/lag ranges in the dossier. Include swapped estimated upper tank distribution, calm, 5/10 m/s crosswind and the recorded shear/gust scenario. These ranges are engineering stress inputs, not confidence intervals or real launch success probabilities.

Record maximum and checkpoint attitude error, angular rates, actuator saturation duration, RCS/main fuel, maximum Q/AoA and time outside the aero envelope, orbital errors, separation/landing state and final classification. Archive parameters, model/data revisions, dt and seed with every row, including failed runs.

Minimum release rule: **any** changed success/failure/contact classification, divergent rotation, sustained loss of control, or newly violated declared operating limit between nominal and a comparison is material. The affected operating envelope cannot be called verified until the physics/data model is improved or its supported range is explicitly restricted. For continuous metrics, report the complete deltas; flag differences exceeding the mission-convergence thresholds above for investigation. Small deltas alone do not validate estimated coefficients. Full sensitivity coverage and review of flagged deltas are prerequisites to claiming robust reference-vehicle behavior; partial component passes must remain labelled partial.

## Performance evidence

Measure warm and cold work separately on the reference browser/hardware. Record per-1000-tick controller/allocation and complete-plant costs, actual UI responsiveness at 1×, and achieved rather than requested warp. A microbenchmark of modules excludes rendering, telemetry, full mass recomputation and browser scheduling; it cannot establish a browser FPS guarantee. Record measured numbers here or link the dated evidence after measurement; no performance gate is claimed passed yet.

Warm Node/Vite SSR measurements after the authority-scheduled controller, 2026-09-19 13:47 UTC, Windows/Node24.19.0 on AMD Ryzen7 7840HS: medians below, milliseconds per1000 ticks at dt=0.01 s (10 s simulated). The host was not isolated from other development work. [Reproducible script](../../audit-2026-09-19/sixdof-runtime-benchmark.mjs) and [raw samples](../../audit-2026-09-19/sixdof-runtime-benchmark.json) remain outside the app bundle.

| Workload | Falcon9 ms | Soyuz-2.1a ms |
|---|---:|---:|
| Standing 1° three-axis demand: unscheduled controller + TVC/RCS allocation/lag/fuel, fixed mass snapshot (five samples) | 920 | 1610 |
| Complete scheduled runtime, RK4, aero/gravity, pure mass factory, telemetry and accepted main fuel; baseline (three samples) | 1484 | 1167 |
| Same complete runtime with reduced flux comparison (three samples) | 1609 | 1483 |

The standing-demand case can be slower than a complete flight segment because it repeatedly asks for a partially saturated command and exercises the iterative fallback. Complete-runtime runs use actual state feedback and the feasible3×3 allocation fast path when available. These numbers exclude mission guidance, recording, rendering, staging and browser scheduling. They support a provisional expectation of1× physics on this machine; they do not establish achieved browser FPS or high warp.

## Executed segment evidence and discovered limits

Commands: `vitest run tests/rigid-actuators-control-aero.test.ts tests/rigid-runtime.test.ts` (40 passed); `vitest run tests/rigid-sensitivity.test.ts` (27 passed, approximately 96 s on the development host). The uncertainty matrix begins at 40 km/1 km/s with first-stage/booster propellant at 65%, upper propellant full, payload 7150 kg, dt=0.01 s. Every feasible variant is run on roll/pitch/yaw under **both** quasi-steady and reduced-flux assumptions. It requires final attitude <0.1°, final rate <0.05°/s, peak attitude error <5°, and paired-model differences <0.1°/<0.05°/s. Limits were retained after the first fixed-gain controller failed the Soyuz cases.

Original covered variations: inertia/gains/gimbal travel ±20%; CP ±10% of length; bounded shear/gust seeds 42/43; Soyuz RD107/108 steering at 10° and 45°; and an actual off-axis Falcon engine failure. The synthetic off-axis Soyuz whole-booster-cluster failure retains the failed booster's fuel/mass, loses all its nozzle flow/thrust, and is correctly classified as outside this recovery band under both mass-flow assumptions. Passing that **failure-detection** check does not mean the failed vehicle recovers.

The additional component matrix passed all 40 tests (240 three-axis/flow-model trajectories) without relaxing the same response limits. It covers inertia ×0.75/1.25; CG ±0.01L via a fixed lower-tank shift and full tensor recomputation; swapped estimated upper-stage fuel/oxidizer tank geometries; uniform rather than aft-settled liquid distribution; 60%/90% dry-shell mass fractions with total dry mass preserved; Cd, normal-force slope and rate damping ×0.5/1.5; actuator lag 0.05/0.20 s; slew 10/40°/s; and generic 3°/8° gimbal estimates. The largest reported final error was 0.005790°, final rate 0.003344°/s and peak attitude error 1.036415°. An initial Soyuz generic-gimbal fixture changed an inactive upper engine; it was corrected to detach the lower configuration and burn the upper stage at 65% propellant. Both corrected 3°/8° cases then passed separately on all three axes and both flow assumptions (12 trajectories), with peak attitude error 1.062823°. The original inactive fixture is not counted as proof of upper-stage authority. Evidence: `../audit-2026-09-19/rigid-extended-sensitivity.log` and `rigid-upperstage-gimbal-sensitivity.log`.

The 12 tests in `rigid-rcs-inventory.test.ts` independently cover finite inventory ×0.5/1/2 on the actual Falcon upper stage and the explicitly synthetic spacecraft model. Gas is redistributed inside fixed initial dry mass and CG/inertia are recomputed; consumed gas still reduces physical mass. Each axis reaches <0.1°/<0.05°/s for two continuous seconds within 60 s from the same 1°/0.1°/s disturbance, with engines off, unchanged main propellant and translation below 1e-7 m. Separate prescribed opposed-jet burns verify the calculated finite impulse through depletion, dry-mass floor and zero subsequent force. These are bounded component checks, not full-mission gas-inventory robustness results. Full-flight comparisons and recovery retain the separate limitations recorded below.

The provisional blanket 5° Soyuz steering limit failed an actual ascent before T50: at T40 the model required approximately 292 kN m to trim/turn against air loads but could supply approximately 240 kN m. Identical diagnostic runs at 10°/20°/45° remained stable through T60. These probes did not establish the true hardware limit. The revised RD107/108 profile is an explicit ±20° estimate informed by the manufacturer's engineers' 45° travel statement, whose sign/range ambiguity is preserved in the [dossier](SIXDOF-VEHICLE-DATA.md). RD0110 remains a separate 5° estimate. The max-Q regression independently uses q=25 kPa, 250 m/s, 0.3° flow angle and 0.005 rad/s turning rate and distinguishes insufficient 5° travel from feasible 10° travel using actual force/moment.

Larger later guidance changes exposed a second limit: a fixed attitude-to-rate gain commanded rates too high for the available braking torque. The implementation now schedules acceleration with a conservative 35% bidirectional torque reserve, shapes rates from stopping distance plus response/slew allowance, and supplies an **ascent-only command cone** for the simulation caller. That cone modifies guidance direction around relative airflow; it never clips aerodynamic forces or overwrites attitude/rates. The full-mission gate must still demonstrate that guidance, fuel and staging complete correctly with these constraints.

The reproducible bounded wind profile uses ENU east 8/north 0/up 0 m/s, shear east 0.001/north 0.0005 m/s per metre with altitude clamped to 0–12 km, and sinusoidal gust amplitudes east 2/north 1/up 0 m/s, period 12 s and an explicit seed. A calm scenario returns zero. This is a scenario definition, not measured weather.

## Fixed control cadence and initial physical accelerations

The runtime now accepts `integrationStepS` for internal RK refinement while holding one outer interval's guidance target, actuator command and finite RCS impulse. All trial mass/CG/inertia/actuator evaluations retain elapsed time from the start of that outer interval; fuel and actuator state commit once. Simulation control cadence is 0.01 s. A requested internal 0.02 s is capped at the outer 0.01 s, so it is **not** an independent coarse-step convergence sample. Use actual 0.01/0.005/0.0025 s plant steps at the same control period, and separately evaluate control-period sensitivity.

`tests/rigid-runtime.test.ts` passed all 21 tests after this change. New coverage checks identical outer actuator endpoints, RCS consumption and initial loads under refinement, correct intermediate mass/fuel times, and angular integration error reduction greater than eight between 0.01 and 0.005 s relative to 0.0025 s in a smooth coupled fixture. This is a component result; integrated mission/recovery convergence remains a separate gate. The returned `accelerationsStart` splits actual engine plus RCS, aerodynamic and gravity acceleration from the first RK load evaluation. Independent rotated-engine/drag and unbalanced-RCS fixtures check the decomposition. Legacy axial thrust/Cd projections cannot substitute for these forces in a 6DOF speed-loss budget.

## Soyuz full-ascent diagnosis before guidance calibration

The exact default Soyuz-2.1a ISS quickstart, 7150 kg payload, calm wind and fixed 0.01 s nominal plant, reaches a terminal propellant failure at T539.874 s. The point-mass version of the same mission config reaches a 200.12 × 197.62 km parking orbit at T535.77 s. Direct kinematics distinguish the problem from missing thrust: near T120 s both versions have approximately 921.9 kN thrust, 106.2 t mass and 1.95 km/s speed, but the 6DOF vertical speed is 1554 m/s versus 942 m/s. At core separation, 6DOF is at 210.47 km/3729.7 m/s versus 166.89 km/4151.5 m/s in the point-mass run. Following the large transition near T120, the new physical controller tracks the later core/upper-stage guidance closely; the overly vertical trajectory arrives with insufficient useful velocity.

Increasing kick alone to 4° or 5° improves the trajectory but still fails orbital insertion; 6° loses control near max-Q and fails at T75.9 s. These are failed diagnostic runs, not accepted presets. Earlier pitch-over and a flyable gravity-turn program are being evaluated without changing thrust, mass, aerodynamic coefficients, actuator limits or orbit bands. Old speed-loss totals in the diagnostic files used legacy axial projections and are excluded from this conclusion. Evidence: `../audit-2026-09-19/sixdof-soyuz-guidance-probe.jsonl` and the detailed frozen-controller `sixdof-soyuz-fullflight-probe.jsonl` outside the app bundle.

## Bounded Soyuz nominal target result and wind-guidance defect

The proposed 50 m pitch-over, 4° kick over 12 s and 0.5°/s gravity-turn limit completed the actual ISS 420 km target with all physical thrust, fuel, actuator and orbit thresholds unchanged. With the nose-only orbital pointing update loaded (simulation SHA prefix `8e4d2eb5`, runtime `94bd1fdc`), the terminal event was `evt.targetOrbit` at T3397.381575 s: apogee 427.047046 km, perigee 420.270209 km, inclination error −0.000350°, RAAN error +0.186557°, and `orbitResiduals.onTarget=true`. Main propellant was 552.722 kg and RCS gas 6.348 kg. This establishes one calm, seed-42 educational-model result, not a rendezvous with ISS or a robust preset. The complete resolved configuration and source hashes are in `../audit-2026-09-19/sixdof-soyuz-target-current-probe.jsonl`.

The same candidate under the declared crosswind-42 and shear-43 scenarios failed, respectively by structural failure at T505.131424 s and ground impact at T188.661304 s. Investigation identified an early guidance error independently of actuator tracking: at T18 s the crosswind run had already entered gravity turn while its signed air-relative angle in the planned downrange direction was **−2.652°**. The previous transition used total tilt, so sideways/upwind wind velocity could falsely complete the 4° kick. The optional physical-model `requireDownrangeKick` input now requires positive upward velocity and the signed planned-downrange angle. Six independent guidance tests pass, including legacy behavior when the flag is absent.

That gate alone did not solve the wind trajectory: the original conservative command cone could still redirect the early kick upwind even when the actual requested trim torque was feasible. Six-degree-of-freedom kick/gravity-turn trajectory guidance now uses ground-relative velocity in the intended launch direction, while aerodynamic force, dynamic pressure and the angle-budget calculation still use actual air-relative velocity. The optional input leaves legacy point-mass behavior unchanged; all eight guidance tests pass. A 50% command-trim trial passed calm/crosswind but failed the shear full mission, so it was not selected as the production Soyuz profile. Earlier raw out-of-envelope duration counts also include negligible-density flight; they are not a measure of significant aerodynamic exposure.

## Common Soyuz command profile and completed bounded wind cases

The production Soyuz reference profile uses pitch-over at 50 m, a 4° kick over 12 s, a 0.5°/s gravity-turn limit, and permits aerodynamic command trim up to 65% of the existing conservative torque radius. The same 65% fraction applies to calm, crosswind and shear, independent of seed; the already verified Falcon program retains its 35% fraction. The Soyuz trim limit leaves 35% of that radius before actual disturbance/coupling is evaluated. This is distinct from the rate controller, which separately limits requested angular acceleration to 35% of the remaining bidirectional torque margin. Neither rule changes physical TVC travel, thrust, aero coefficients or the integrated attitude/rates. Explicit user guidance overrides remain authoritative.

The three bounded complete ISS-plane orbit runs below used identical Soyuz guidance and trim values, the existing hardware/force model, 0.01 s control/RK steps and unchanged orbit bands. Each emitted the actual target-orbit event and had no residual misses; none establishes rendezvous with the ISS. These diagnostic records set the trim explicitly in memory before the identical production profile was installed. An exact-production full-mission convergence run remains a separate gate.

| Wind scenario | Target event time (s) | Apogee / perigee (km) | Remaining main fuel / RCS gas (kg) |
|---|---:|---:|---:|
| Calm, seed 42 | 3409.991170 | 427.052942 / 420.258445 | 554.112 / 7.221870 |
| Declared 8 m/s crosswind plus gust, seed 42 | 3399.469613 | 427.060825 / 420.256497 | 553.609 / 6.993453 |
| Declared bounded shear/gust, seed 43 | 3403.035813 | 427.050706 / 420.263009 | 552.881 / 7.448800 |

The crosswind case's RAAN error was +0.849592°, inside the unchanged target band but closer to its boundary than calm (+0.156536°). All runs remain educational-model examples using estimated aerodynamics and inertia; three successes do not define a probability of launch success or a general wind envelope. Evidence: `../audit-2026-09-19/validation/soyuz-target-calm-ground065.json`, `validation/soyuz-target-shear43-ground065.json`, and `sixdof-soyuz-target-ground065-crosswind-probe.jsonl` under the same audit directory. The Falcon fixed 5/10 m/s and shear cases, alternate rotational-flow assumptions, and post-deployment raw-orbit checks are tracked separately; a target event before payload deployment alone cannot establish the delivered orbit.

## Executed bounded Falcon recovery evidence

The `rigid-harness.ts` LEO configuration with `boosterRecovery:true`, calm wind, seed 20260919, quasi-steady mass-flow model and 0.01 s rigid timestep was run through the returning stage's contact in `tests/rigid-recovery.test.ts`. This test uses the real Simulation stage separation and detached-body runtime. The repeated run completed in 55.83 s on the development host (the first concurrent run took 98.46 s); this excludes browser rendering and is not a browser performance guarantee.

The returning first stage passed the unchanged contact gate atT 538.736911 s: vertical contact speed−2.342164 m/s, horizontal 0.082498 m/s, total 2.343616 m/s, tilt 0.130906°, remaining main propellant 8668.260881 kg. Maximum applied gimbal magnitude was 5°, maximum raw quaternion norm error 1.71e−14, and all sampled states were finite with monotonically nonincreasing main/RCS fuel. No recovery-guidance change was required for this result. Separation occurred atT 135.946911 s near 73 km; entry burn beganT 408.956911 s near 69.98 km and endedT 433.276911 s near 44.34 km. The upper mission was still coasting when the recovery test stopped; this is not a complete orbital-mission result.

Limitations are material: the first returning checkpoint had 42.0022 kg RCS gas and it was exhausted beforeT 180 s. Later recovery therefore relied on the actual entry/landing engine forces, bounded TVC and the estimated body aerodynamics. Every logged return checkpoint was outside the 15° small-angle aerodynamic confidence envelope, including the base-first descent. The landed classification verifies the implemented contact and force model for this single nominal configuration; it does not establish robustness to alternate wind, gas, inertia or aerodynamic estimates, and it is not real-flight validation. The terminal state retains its physical nonzero contact velocity rather than being snapped to zero.

Durable evidence outside the shipped worktree: `../audit-2026-09-19/validation/rigid-recovery-checkpoints.log` and extracted `rigid-recovery-result.json`. To expose all checkpoint logs with Vitest's agent environment, run the dedicated test with `--reporter=verbose --silent=false --disableConsoleIntercept`; default passing-test output may suppress console logs.

Final repeat after terminal-propulsion telemetry fix: the explicit landed/contact assertions passed in 40.19 s, with identical T 538.736911 s contact trajectory and contact speeds. The terminal engine 8 telemetry now reads 0; recovery thrust and mass-flow fields are 0, while physical r/v/quaternion/rates and remaining fuel are unchanged. Final evidence: `../audit-2026-09-19/validation/rigid-recovery-final.log` and `rigid-recovery-final-result.json`. A separate powered-touchdown unit test verifies cutoff without snapping contact velocity; all 11 debris and 9 staging tests passed, and typecheck passed.

## Historical recovery study with changing control cadence: numerical gate not met

A single compiled run of the unchanged loaded controller/guidance compared outer rigid timesteps of 0.005, 0.01 and 0.02 s for the same bounded Falcon LEO recovery. All three met the physical landing/contact and finite-fuel assertions, but **the declared mission-convergence gate failed**. The detached-body helper caps its own substeps at 0.01 s, so the 0.02 s case is a 0.02 s attached ascent followed by two 0.01 s detached updates per outer tick; it is not a uniform 0.02 s detached-plant test.

| Outer dt (s) | Contact time (s) | Classification | Contact-time difference from 0.005 s |
|---|---:|---|---:|
| 0.005 | 537.311911 | Landed | Reference |
| 0.01 | 538.736911 | Landed | +1.425000 s |
| 0.02 | 540.069411 | Landed | +2.757500 s |

Returning-body states were interpolated to common absolute times; attitudes use quaternion interpolation rather than Euler-angle interpolation. Differences below are vector position/velocity norms and quaternion angular distance against dt 0.005 s.

| Compared dt | Common time (s) | Position difference (m) | Velocity difference (m/s) | Attitude difference (degrees) |
|---|---:|---:|---:|---:|
| 0.01 | 300 | 31.5147 | 0.153534 | 1.13981 |
| 0.01 | 400 | 46.5766 | 0.148842 | 1.98029 |
| 0.01 | 500 | 2674.9653 | 7.608343 | 0.79358 |
| 0.02 | 300 | 221.7130 | 1.116549 | 2.23686 |
| 0.02 | 400 | 332.0945 | 1.104878 | 3.86360 |
| 0.02 | 500 | 5052.3639 | 15.841391 | 1.95473 |

These differences exceed the existing 10 m, 0.1 m/s, 0.1 degree and 0.02 s gates; tolerances were not widened. The three passing test cases only establish classification/invariant coverage, not the convergence release gate. The run took 195.14 s on the development host.

A plausible amplification mechanism, not yet an isolated proof: timestep-dependent control/gas consumption leaves 41.8679 versus 42.0022 kg of first-stage RCS at the first separated checkpoint. Both exhaust their gas before T180 s, after which small differences in angular rates accumulate during the long passive coast; entry thrust then acts along different orientations. This study changes sampled controller updates together with the integration timestep, so it does not isolate smooth RK4 order. Next checks should hold the controller update period fixed while subdividing only the plant, and replay identical separation state and finite RCS inventory into the detached plant. Do not fix this by enlarging gas inventories, changing coefficients to fit the results, or overwriting angular state.

Evidence: `../audit-2026-09-19/validation/rigid-recovery-convergence.log` and `rigid-recovery-convergence.json`; the JSON explicitly records `declaredConvergencePass:false`. Full upper-stage mission acceptance remains separate and was not established by these recovery runs.

## Fixed-control recovery refinement: bounded numerical gate passed

The corrected experiment holds guidance, controller allocation, actuator commands and finite RCS duty at the same 0.01 s outer cadence in all runs, and refines only the internal RK plant to maximum steps of 0.01, 0.005 and 0.0025 s. A requested 0.02 s maximum remains capped at the 0.01 s control interval and is not counted as a distinct refinement. The historical experiment above changed the sampled controller as well as the plant; its failure is retained as control-cadence sensitivity evidence, rather than presented as a failed same-system RK comparison.

All three complete returning-stage trajectories passed the unchanged strict landing, finite-state, finite-fuel and gimbal assertions. Each contacted at T538.7369113442371 s with the same landed classification. The release comparison is the nominal 0.01 s plant against 0.005 s, at identical interpolated absolute times:

| Common time (s) | Position difference (m) | Velocity difference (m/s) | Attitude difference (degrees) |
|---:|---:|---:|---:|
| 300 | 0.00002138 | 0.0000001085 | 0.0000008584 |
| 400 | 0.00003282 | 0.0000001148 | 0.0000014923 |
| 500 | 0.00205740 | 0.0000072982 | 0.0000006557 |

The contact-time difference is 0 s. The original thresholds remain 10 m, 0.1 m/s, 0.1 degree and 0.02 s; no tolerance was relaxed. Against the additional 0.0025 s reference, the nominal run's largest checkpoint differences were 0.00259446 m, 0.0000097781 m/s and 0.0000019676 degree. Raw quaternion norm error was at most 1.71e-14 across all three runs. This establishes the bounded recovery numerical gate for the fixed control clock, not convergence under arbitrary controller periods or every mission.

Command: `node node_modules/vitest/vitest.mjs run tests/rigid-recovery.test.ts --reporter=verbose --silent=false --disableConsoleIntercept`. Result: 3 tests passed, including the suite's explicit unchanged convergence assertions, in 176.96 s. Durable evidence is `../audit-2026-09-19/validation/rigid-recovery-fixed-clock.log` and `rigid-recovery-fixed-clock.json`; the JSON records `declaredConvergencePass:true` and the full raw checkpoint/state comparison. The clock/staging checks additionally verify that requested RK refinement reaches the actual detached runtime while both attached and detached control calls remain at 0.01 s.

All previous physical-model limits still apply: returning-stage RCS is exhausted before T180, sampled return states are outside the 15-degree small-angle aerodynamic confidence envelope, and the upper mission is still coasting when this bounded test stops. This does not validate real Falcon recovery or establish full parameter robustness. The subsequently added orbital gas-budget helper applies only to runtime body id `vehicle`, automatic control, engine-off flight and altitude above 140 km. Detached recovery uses its own body id and guidance and is excluded; the shared first-stage ascent separates below that altitude. This scope preserves the detached trajectory in this study while upper-stage orbital pointing is evaluated separately.

## Recovery mass-flow comparison and finite terminal restart

The first full reduced-flux recovery comparison exposed a real guidance defect: clamping a request below minimum engine thrust upward could hold a lightly fuelled stage above the ground until it exhausted the tank. That run impacted at T590.156911 s with vertical speed -33.1344 m/s. An intermediate on/off correction landed, but instrumentation showed 52 starts with intervals as short as 0.01 s. That result was **rejected** as finite-engine evidence. A later constant-minimum final burn also failed after its ignition delay consumed braking distance; the failed runs are retained in the audit logs.

The final guidance uses one latched terminal coast and at most one additional terminal restart. A short longitudinal prediction includes declining mass, axial drag, a disclosed estimated 0.5 s ignition delay and 0.3 s thrust rise. After the rise it commands a continuous feasible minimum-or-higher braking burn until contact or fuel exhaustion; no further pulse restarts are allowed. The prediction changes commands only. Actual 6DOF forces, attitude, fuel and the contact predicate remain authoritative. Near-ground targets use surface-relative vertical/lateral velocity, while aerodynamic loads still use wind-relative velocity. The short prediction holds atmosphere and attitude approximately constant and is not a landing-leg, engine ignition chemistry or certified Falcon restart model.

Two integrated low-mass descent fixtures verify one finite final restart and actual contact: 74 m CG altitude / 0.05 m/s descent / 2500 kg fuel, and 255.9 m / 24.2 m/s / 5296 kg. Analytic constant-mass stopping distance, decreasing-mass response, fuel exhaustion and ignition delay are checked separately. There are now 17 detached-body tests, 19 mass/data tests, 10 actual-Simulation staging tests and 1 control-clock test in this part of the matrix. The upstream chamber throttle is retained separately for telemetry; multiplying this fraction into already-budgeted forces again would be incorrect.

The full calm paired runs used identical source hashes, mission config, controller gains, 0.01 s control/RK steps and seed 20260919. Both passed the original contact, finite-state, finite-fuel and gimbal gates:

| Rotational flow assumption | Contact time (s) | Vertical / horizontal speed (m/s) | Tilt (degrees) | Remaining main fuel (kg) | Burn starts after separation |
|---|---:|---:|---:|---:|---:|
| Quasi-steady | 536.386911 | -2.354752 / 0.083000 | 0.129826 | 8946.241118 | 2 |
| Reduced flux | 550.016911 | -1.862828 / 0.085328 | 0.136903 | 3524.557113 | 3 |

The reduced-flux case had 16.62 s between entry cutoff and the landing burn, then 0.51 s from terminal cutoff to the first positive startup thrust. This is a single additional final restart, followed by the finite rise, not repeated 10 ms pulses. The quasi-steady case did not require that extra restart.

**Classification stability does not mean quantitative agreement.** Reduced flux minus quasi-steady differs by 13.63 s contact time and -5421.68 kg remaining propellant. At T300 / 400 / 500, position differences were 655.44 / 1009.52 / 20818.35 m, velocity differences 3.5170 / 3.5861 / 32.7665 m/s, and attitude differences 14.9098 / 24.4210 / 9.3549 degrees. These exceed the declared sensitivity investigation thresholds. Gas depletion before T180 and the out-of-envelope return aerodynamics remain material limits. This comparison supports the same landed classification in these two runs; it does not verify quantitative recovery predictions or a robust envelope across flow assumptions, wind, gas inventory, CG/inertia and aerodynamic estimates. Evidence: `../audit-2026-09-19/validation/falcon-recovery-massflow-comparison.json`, with individual `*-finite-restart.log` and JSON records including source hashes and every engine transition.

After the final guidance change, the complete 0.0025 / 0.005 / 0.01 s fixed-control recovery experiment was repeated: all 3 tests and unchanged numerical assertions passed in 155.77 s, with identical T536.386911 s contact classification/time. The nominal 0.01-versus-0.005 s maximum matched-checkpoint differences were 0.002788 m, 0.000011642 m/s and 0.000002428 degrees; the contact-time difference was zero. This supersedes the earlier numerical checkpoint for the current guidance, without changing any thresholds. Evidence: `rigid-recovery-final-finite-convergence.log` and `rigid-recovery-final-finite-convergence.json` in the same validation directory. The later throttle-telemetry correction changes recorded/displayed fractions only, not forces or trajectory.

### Terminal burn planned mid-throttle (engine transients, roadmap P02)

Engine start-up and tail-off transients (PHYSICS.md §4) changed the returning stage's
separation state slightly, and the recovery above stopped landing: the stage came to a stop
145 m above the pad at 4 m/s, climbed on the minimum thrust it cannot go below, emptied its
tanks and fell back. The cause was in the terminal guidance, not the transients. Its restart
was timed for the *minimum* throttle; the constant-deceleration law then asked for a little
more than the minimum at ignition, braked early, and as the burn emptied the tanks (about ten
per cent of the stage's mass) the same law asked for less than the minimum, which a stage
that cannot hover cannot give. The restart is now timed for a throttle half-way between the
minimum and full thrust (`TERMINAL_PLANNED_THROTTLE_FRACTION`), leaving room to throttle down
as well as up once lit — which is how real landing burns are planned. Two further changes
that belong to the transients: while a shut-down engine is tailing off the attitude loop holds
the attitude it was shut down in (following a guidance command with the thrust fading had
swung the stack to 1.3 °/s between MECO and separation, more than the returning stage's gas
could take out), and a flight is not `done` until its last tail-off is over.

With those changes the 0.0025 / 0.005 / 0.01 s recovery acceptance passes again, all three
landed, with the unchanged convergence assertions. The 18 terminal-restart stress trajectories
land 16 times (they landed 14 times before), and the two impacts still terminate honestly as
impacts. The recovery remains experimental in the sense stated above: the RCS gas is still
exhausted before T+180 s and the outcome still depends on the separation state.

## Post-deployment acceptance and bounded payload release

The full mission convergence gate continues beyond the target-orbit event until actual payload separation. It independently recomputes orbital elements from raw position/velocity and applies the pre-existing fleet tolerances; a cached success flag cannot pass this check. The first frozen 0.01/0.005 s pair found Falcon at approximately 654.426 km apogee after deployment, although it had reached 502.476 × 500.584 km at the earlier target event. Both numerical trajectories agreed closely; both failed the actual delivered-orbit criterion. Soyuz passed that first complete pair. This failed Falcon evidence is retained as `../audit-2026-09-19/validation/mission-convergence-before-payload-fix-*`, with identical pre/post source manifests.

The defect was an overly large payload recoil from applying the generic ascent stage ejection impulse to a light satellite. The payload-specific correction uses an estimated additional relative axial speed of 0.5 m/s and the reduced mass of the exact two component partitions: `J = 0.5 * mStage * mRetained / mTotal`. Both equal/opposite impulses act at one interface; there is no unilateral velocity overwrite. Ordinary ascent-stage impulses remain unchanged. A physical boundary fixture with 14,283 kg upper stage (including 17 kg gas already spent) and 1,000 kg payload previously produced 30.60238 m/s relative release speed. The corrected fixture produces 0.5 m/s, retains the expected finite recoil of each body and conserves combined mass, linear momentum and angular momentum. Staging/partition/debris tests passed34/34 and TypeScript passed. This separation speed is disclosed as an estimate; a real adapter spring/clearance model is outside the scope.

Final complete mission convergence after this correction is recorded separately below when executed; no orbit or numerical tolerance was relaxed to accommodate the defect.

## Per-vehicle aerodynamic tables (roadmap P03, 2026-09-23)

The single normal-force slope at a fixed centre of pressure was replaced by a table per
configuration (docs/SIXDOF-VEHICLE-DATA.md, "RCS, fins and aerodynamics"): slender-body lift
where the cross-section grows, viscous crossflow on the planform, a centre of pressure that
moves with angle and Mach, base-first coefficients for a stage flying engines first, grid-fin
lift on the returning Falcon stage, and a blunt body for a released payload. The ascent command
cone now finds its angle by bisection on the tabulated moment instead of assuming a moment
proportional to sin α.

The change moves both reference vehicles' static stability. Falcon 9's lift is all at its
fairing (centre of pressure 71 m up a 72 m stack subsonic, 62 m supersonic), so its moment at
small angles is close to the old estimate and grows faster at large ones. Soyuz-2.1a's strap-on
noses put its centre of pressure at 21.5 m, about 8 m above the centre of gravity at lift-off
instead of 17 m, so it needs half the trim moment per degree it did.

Result on the 28 six-DOF test files: 274 of 276 passed at the first run, including both
reference missions, their 0.01 / 0.005 s convergence, the three recovery landings and the 67
sensitivity cases. The terminal-restart stress set still lands 16 of 18. Two failed:

- **Soyuz max-Q authority boundary.** Its fixture takes the flow angle the calm ISS mission
  flies at T+40 s, 4.4 km, 25 kPa. With the old estimate that was 0.3°; with the tables the
  mission flies 0.61° there (the command cone allows the less unstable vehicle more angle), and
  at 0.3° the 5° vernier case only just saturated. The fixture now uses the re-measured 0.6°;
  its assertions are unchanged — 5° travel leaves about 18 % of the moment unmet, 10° trims it.
- **Released payload drag.** A payload flying alone was given the table of the launcher stack
  it had left, because the table did not check which stages were still attached. It now gets a
  blunt-body table with the point-mass model's Cd of 2.2; so does a spacecraft stage flying
  without its launcher.

The Soyuz late first-stage pitch-down is unchanged in character — the command cone releases a
closed-loop pitch command that has run far below the vehicle as the dynamic pressure falls — but
begins earlier, at about T+89 s instead of at booster separation, because the less unstable
vehicle is released sooner. It stays a guidance item (G01).

## Every vehicle in six-DOF (roadmap P01, 2026-09-23)

The other sixteen vehicles were given six-DOF data — chambers where their bells are drawn,
per-stage steering, thrusters, tanks and grains ([SIXDOF-VEHICLE-DATA.md](SIXDOF-VEHICLE-DATA.md),
"The other sixteen vehicles") — and six-DOF became the default for all eighteen.

**The gate.** `npm run test:sixdof-fleet` (tests/sixdof-fleet/) flies, as rigid bodies with
each vehicle's own actuators:

- every accepted row of the regular fleet matrix — 126 vehicle × orbit × payload cases of
  sixteen vehicles — judged by the same `acceptanceFailures` as tests/fleet-defaults.test.ts
  (the target-orbit event, the orbit re-derived from the raw state, the insertion clock);
- each of those vehicles' first accepted case again in the two declared wind scenarios,
  crosswind and shear (32 cases);
- Long March 2D's real mission, its satellite to the 600 km sun-synchronous orbit at 25/50/90 %
  of the rating (3 cases). Long March 2D and Soyuz-2.1a have no accepted matrix row; Soyuz-2.1a's
  real mission, the crewed spacecraft to the station orbit, is the reference mission of
  tests/rigid-simulation.test.ts.

Result at commit 68ace10: **161 of 161 passed** in 2 h 39 min on four cores; the
slowest cases are the Proton-M and Angara A5 transfers (about 7 minutes each), the median about
2 minutes. An earlier run of the 158 matrix and wind cases at e504089 passed 158 of 158.

**How the orbit is judged.** A six-DOF coast is flown under J2, where the osculating apsides of
one instant swing several kilometres round a revolution. Judged on them, cases passed or failed
by where on the orbit their last burn ended (Vulcan in wind shear: "511 × 489 km" on an orbit its
last burn had put at 500 km). Six-DOF missions — in the simulation, on the result panel and in
this gate — are now judged on the lowest and highest altitude of the next revolution
(`physicalApsides`), and the planner aims at that orbit ([PHYSICS.md](PHYSICS.md) §2a). The
point-mass matrix is unchanged: its coasts are Kepler, where the two are the same.

**What flying the fleet found.** Eleven model changes, each listed with its measured cause in
SIXDOF-VEHICLE-DATA.md: negligible allocator rows, per-group booster levels, held coast,
the terminal steering freeze, the vacuum command-rate limit and alignment allowance, separation
speed per body, burn retries that re-check the stage, the 1° ignition gate, the two-sided
physical apex, the step-independent cut-off, and the judged orbit. Two data changes came out of
it as well: Atlas V and Soyuz-2.1a fly six-DOF-specific kick programmes, and a spacecraft with its
own engine steers on that engine's propellant (Long March 2D's satellite spent 10 kg of the cold
gas assumed before by its sixth orbit-raising pass).

**The rest of the six-DOF suite.** The 30 rigid-body test files (352 tests: mechanics,
actuators, staging, replay, both reference missions, their 0.01 / 0.005 s convergence, the three
Falcon recovery landings, the sensitivity study) pass, as do the watch missions flown in
six-DOF (tests/watch-missions.test.ts) and the delivered-orbit matrix (`npm run test:heavy`).

**In the browser** (Chromium with software WebGL, physics in the worker): Starship (39
chambers), Falcon Heavy and Proton-M keep real time at 1× (0.98, 0.99 and 0.96 of it) and reach
6.0×, 4.7× and 9.8× of a requested 10× during the ascent, using 53–61 MB of JavaScript heap. The
10× figures were taken with other test processes loading the CPU.

## The flexible vehicle (roadmap P05, 2026-09-24)

Slosh, the first bending mode with its shell loads, and the bending filter (PHYSICS.md §2b) are
options, all off by default.

**Off, nothing moves.** tests/rigid-flex-golden.test.ts hashes every second of state and six-DOF
telemetry, the recorded telemetry and the event log of Falcon 9, Soyuz-2.1a and Angara A5 in
crosswind over their first 160 s — flown with the options absent and, for Falcon 9, given and
all off — against the hashes recorded at 7834edd before any of it was written;
tests/heavy/flex-golden.test.ts does the same for the three whole missions to orbit. All match
bit for bit.

**The model's own checks** (tests/rigid-flex.test.ts): the slosh analogue against its closed
forms and the potential-flow tilt moment (the first mode carries 98.74 % of it); a free half-full
Falcon 9 stage whose two tanks slosh for 10 s holds its momentum to 10⁻⁹, angular momentum to
10⁻⁷ and energy to 10⁻⁷, and a slosh mass accelerates against the free stage at the
reduced-mass rate to nine digits; a uniform free-free beam gives 22.373/(2πL²)·√(EI/μ) within
0.1 % with its nodes at 22.4 % from each end; a real stack's mode is orthogonal to its rigid
translation and rotation to 10⁻⁹; the IMU reads rate and attitude shifted by the local slope;
the notch is unity at zero and Nyquist frequency and ζ_z/ζ_p deep at its centre; the shell
stress above the engines at liftoff is the thrust over the wall area.

**In closed loop** (tests/rigid-flex-flight.test.ts, Falcon 9 in crosswind): with bending and
no filter the first mode diverges and the stack breaks up in the first 15 s (at T+7 s, over
30 cm of modal deflection); with the filter it flies through max-q (to T+90 s) with under
10 cm and under 50 % of the shells' allowable; with slosh alone its four tanks slosh by
millimetres to decimetres.

**Every vehicle, flexible** (`npm run test:heavy`, tests/heavy/flex-fleet-*.test.ts): each
vehicle's reference case — the first accepted fleet row, Soyuz-2.1a's crew mission to the
station orbit and Long March 2D's 650 kg to the 600 km sun-synchronous orbit — flown in
crosswind with slosh, bending and the filter all on, judged by the fleet's acceptance
(target orbit, re-derived orbit, insertion clock) with no shell past 80 % of its allowable:

| Vehicle | shell load, % | bending, cm | slosh, cm |
|---|---|---|---|
| Soyuz-2.1a (crew, ISS) | 13 | 1.1 | 6 |
| Soyuz-2.1b | 14 | 0.7 | 6 |
| Proton-M | 23 | 3.4 | 25 |
| Angara-A5 | 9 | 1.2 | 13 |
| Falcon 9 | 28 | 5.8 | 15 |
| Falcon Heavy | 35 | 7.7 | 22 |
| Atlas V 551 | 17 | 5.7 | 12 |
| Vulcan | 11 | 2.6 | 27 |
| Ariane 64 | 9 | 1.5 | 25 |
| Vega-C | 7 | 0.6 | 7 |
| Long March 2D (SSO) | 15 | 0.5 | 7 |
| Long March 3B/E | 20 | 3.0 | 9 |
| Long March 5 | 9 | 0.8 | 26 |
| H-IIA 202 | 13 | 2.0 | 17 |
| H3 | 13 | 0.6 | 18 |
| PSLV-XL | 8 | 1.1 | 4 |
| Electron | 5 | 0.1 | 4 |
| Starship | 44 | 14.0 | 50 |

All eighteen reach their target. Peak loads come near max-q or at the heaviest thrust, peak
bending mostly in the liftoff transient. Falcon 9's reference mission flown at 0.01 s and
0.005 s delivers the same orbit within 2 km and the same peak bending, load and slosh to the
digits above (27 %, 6.1 cm, 13 cm).

**What it cost to get there**, each found by flying the fleet: the notch alone did not
stabilise Falcon 9 (the autopilot's gain near the mode was the problem, hence the bandwidth
limit); the follower thrust without the axial compression's geometric stiffness put the notch
6 % off the mode (Beal's cancellation fixed it); the 45–75 Hz upper stacks broke RK4 at 0.01 s
until modes faster than 1/h went quasi-static; and Ariane 64 at 1 % slosh damping lost its
upper stage to its own liquid oxygen (§2b, "What the baffles are for") — the default is 3 %.

**Cost.** With all three options on, a flight takes 50–55 % more CPU than the rigid one on the
most tanked vehicle (Proton-M: eight sloshing tanks), mostly the coupled solve at each
integrator evaluation and the shell-load sweep at each control step.

**The rigid fleet with P05 off.** `npm run test:sixdof-fleet` re-run at the P05 commit 723c811
(options absent, as every default mission flies): **161 of 161 passed** in 2 h 9 min on four
cores, the same result as at 68ace10 — P05 leaves the rigid vehicle untouched.

