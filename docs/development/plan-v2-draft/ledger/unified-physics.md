# Unified physics ledger (area group "physics")

Built 2026-10-04 from every `area == "physics"` row of the ledger files (devplan-th-part1/2, remaining-th-part1/2, roadmap-part2-3, other-docs; r2-status has none) plus the code-review findings P14, P15, P17, P18, P19, D15, D17, D18, D19, D20, NEW-PHYS-2, NEW-PHYS-3 and NEW-PHYS-4 (NEW-PHYS-1 is under src/orbit and lives in the orbit ledger). Every status was checked against `origin/main` = `da67341`. R2 (#74) changed no file under `src/physics`, `src/data`, `src/orbit`, `src/design`, `tests/heavy`, `tests/sixdof-fleet` or the physics docs, so the findings verified on `fbefa18` still hold. Machine data: `unified-physics.jsonl` (generator `gen_unified_physics.py`).

Source-id prefixes: ledger file name, then `:` and the id in that document (`devplan-th-part1:PHY-QW3`). `CR:` marks a code-review finding, `PLAN:` marks PLAN.md v1.2, `PROGRESS:` marks PROGRESS.md, `GH:` marks GitHub Actions evidence, and `XREF:` marks a unified item owned by another group. Master ids are `M-PHYSICS-NNN`. They are numbered in blocks: 00x evidence, 01x identical-output, 02x model consistency and decisions, 04x vehicle families, 06x validation and rules, 07x delivered.

## Counts

| status | n |
|---|---|
| open | 34 |
| partial | 5 |
| done | 3 |
| superseded | 3 |
| deferred | 1 |
| rejected | 1 |
| **total** | **47** |

These items unify 62 physics rows from the source ledgers and 13 code-review findings. Two of the three superseded items were merged into the Build group (M-BUILD-016 and M-BUILD-018); do not count them twice.

Open plus partial items by priority: P0 1, P1 8, P2 17, P3 13.

## Key new evidence (checked in this pass)

- **No full heavy run has passed on a `main` that contains #36. No six-DOF fleet run has passed on a `main` that contains R1.4.**
  - Heavy suite: the last full pass was run 36804343856 on `9f9f36a`. That commit predates `17bd60f`, the #36 merge.
  - Six-DOF fleet: the last pass was run 36942933112 on `91ee372`. That run skipped the heavy job.
  - Since then, #68, #70 and #71 changed shared physics. R1.4 changed finite fuel and the `targetAttitude` basis in `rigid/runtime.ts`. The R1.4 report itself says it is "not full heavy/fleet scientific acceptance".
  - This gap becomes **M-PHYSICS-001 (P0)**.
- **The flight worker limits time warp.** In the measured baseline, a requested 100x warp gives 8.32 simulated seconds per wall second while the worker uses about 790 ms CPU per second (Falcon 9 default model). This raises the priority of profiling (M-PHYSICS-003) and of the identical six-DOF runtime package (M-PHYSICS-012).
- **MSIS keeps module-level state.** `msis.ts` holds COMMON-block style variables such as `apdf`, `dfa`, `tzOut` and `plg`. The FSAL step of P14 is therefore identical only if a new call-history determinism test passes (M-PHYSICS-002). If that test fails, FSAL is dropped.
- **G02 is half done.** `Simulation.knownState()` exists, but no `src` file calls it, so in-orbit burns still fly on the true state. With navigation off, `knownState()` returns the true state itself, so the change is identical when navigation is off.

## Open and partial items, grouped by placement

### 0. R2 close-out / R0.1 physics evidence (do first)

| mid | pri | effort | status | title | depends on |
|---|---|---|---|---|---|
| 001 | P0 | S | open | Physics evidence baseline on current main: full heavy suite + six-DOF fleet + fingerprints on exact da67341, before any physics package | - |
| 002 | P1 | S | open | Record bitwise characterisation harnesses at base (Cowell propagator cases, Apollo 11 point-mass fingerprint, deriv-call counter, MSIS call-history determinism) as new tests, before any E package | 001 |
| 003 | P1 | S | open | Flight-worker cost baseline: CPU profile of a six-DOF flight in the worker (requested 100x warp achieves only ~8.3x), feeding D-27 and the P17 package | 001 |
| 041 | P2 | XS | open | Physics honesty quick fixes in code text: RIGID_DATA_ASSUMPTIONS still says slosh and flexibility are omitted (P05 shipped them); Vulcan guidance comment contradicts shipped data (80 km loft, KNOWN_GUIDANCE_FAILURES, 238-250 x 497 km) | - |

### 1. Owner decisions (cheap, unblock F work)

| mid | pri | effort | status | title | depends on |
|---|---|---|---|---|---|
| 021 | P1 | XS | open | Owner decision D-10: thermosphere model (port NRLMSIS 2.1 under NRL terms, or keep NRLMSISE-00 and show the measured early bias at the number; DTM2020 excluded) | - |
| 060 | P1 | M | open | Decision D-3/D-4 and tolerance-tier goldens: pin Node 22 (hash stays the gate), decimated [t,r,v]+events tolerance fixtures (1 m / 1 mm/s / 1 step) as the oracle for T02 and any Node move; 27 point-mass rows first, then 21 six-DOF rows + cross-engine journey | 001 |
| 027 | P3 | XS | open | Owner call: solar constant 1361 W/m2 (power, IAU 2015) vs 1367 W/m2 (propagator SRP P_SUN=4.56e-6) | - |

### 2. E-PHYS-1 propagator (identical output)

| mid | pri | effort | status | title | depends on |
|---|---|---|---|---|---|
| 010 | P1 | S | open | Cowell propagator: FSAL reuse of the 7th Dormand-Prince stage, preallocated stage sums in the same order, msisInput year cache, exact-jd memo of Sun/Moon/GMST and hoisted cos/sin(EPS) | 002 |

### 3. E-PHYS-2 lunar (identical output)

| mid | pri | effort | status | title | depends on |
|---|---|---|---|---|---|
| 011 | P2 | S | open | Lunar/Apollo: small exact-jd memo for moonState, sunState, precessionFromJ2000 and moonBodyToEci (frozen results), position-only lunisolar variant | 002 |

### 4. E-PHYS-3 pre-R4 no-op runtime (identical output)

| mid | pri | effort | status | title | depends on |
|---|---|---|---|---|---|
| 012 | P1 | M | open | Six-DOF integrator/runtime: remove temporaries and duplicate pure calls under exact expression order (finiteness checks as && chains, cached specs()/windAt per evaluation, Cholesky factor by inertia identity), guided by the M-PHYSICS-003 profile | 001, 003 |
| 013 | P2 | S | open | Point-mass forces: inline v - Omega x r as the literal expansion, keep addScaled/rk4Step forms, density() computes rho without the full atmosphere object | 001, 002 |
| 014 | P3 | S | open | simulation.ts derived state: skip elementsFromState in updateDerived only when s.r/s.v are the same object references, one-entry atmosphere memo, cached site sin/cos(lat0) | 001, 002 |
| 015 | P3 | S | open | Identical-value constants/helpers de-duplication: TWO_PI, DEG, the six same-form clamps, lerpVec -> vec3.lerp, density.ts DEG -> import RAD, MU_SUN/G0/R_MEAN/WGS84 imports, same-form no-wind air-velocity helper | 001 |

### 5. E outside physics files (I owner)

| mid | pri | effort | status | title | depends on |
|---|---|---|---|---|---|
| 017 | P2 | S | open | Home page: compute the ISS next-pass list off the render frame (idle callback or existing worker), with `now` captured at request time | XREF:M-ORBIT-013, XREF:M-ORBIT-014 |

### 6. PLAN R4 (R4.1-R4.4) and master-plan rules

| mid | pri | effort | status | title | depends on |
|---|---|---|---|---|---|
| 040 | P1 | L | open | R4 entry: catalogue and source ledger for all 25 ids plus the R0 physics-programme audit and an item-by-item recheck of the 1 October flight-profile audit | 001 |
| 063 | P1 | XS | partial | Physics rules carried into the master plan: validate before build, game/pedagogy layers import only types from src/physics, named sources, mismatches recorded never tuned away, single-flight fit = calibration, intentional re-records only with reason, plus the explicit not-to-do list | - |
| 023 | P2 | S | open | Point-mass ascent flies spherical gravity while six-DOF uses J2 (~0.5 % g, ~8 m/s per 500 s): state the offset in every two-model comparison now; J2 in point-mass only as an owner-approved R4.2 change | 001 |
| 024 | P2 | M | open | Launch uses a spherical equatorial-radius Earth for ground track, impact points and sites; Orbit uses WGS-84 (~0.19 deg / 21 km at Baikonur/Plesetsk): display-side geodetic conversion with a label | XREF:M-ORBIT-025 (R5.2 frame contract) |
| 029 | P2 | M | open | G02: in-orbit burn planning and steering fly on the navigation estimate (Simulation.knownState) as the owner decided on 2026-09-24 | 001, 012 |
| 030 | P2 | L | open | Unexplained Monte Carlo (G05) failures: Falcon 9 q-placard break-ups with east wind, Soyuz-2.1b q-alpha break-ups and propellant exhaustion on a 6400 km-apogee path, Falcon 9 wrong plane 29.1-29.3 deg, Electron burnPredictionUnavailable | 001 |
| 042 | P2 | L | open | PSLV-XL (29 % slow at separation) and H3 (far flatter) ascent profiles: sourced loft/programme fitted on multiple flights with held-out checks, one vehicle per PR | 040, 001 |
| 044 | P2 | M | open | Falcon 9 six-DOF first-stage recovery: cold gas exhausted before T+180 s, outcome depends on separation state - solve with a coast attitude-control mode, not more gas | 040, 001 |
| 049 | P2 | M | partial | Timeline comparison for the six never-compared vehicles (LM-2D, LM-3B/E, LM-5, Vulcan, Soyuz-2.1b, Starship Flight 5): data-only TimelineReference rows; 12/21 -> 18/21 | 040 |
| 050 | P2 | S | open | Six-DOF fleet gate does not fly Saturn V's accepted rows (and lists no soyuz21a rows) | 001 |
| 052 | P2 | M | open | U16 physics part: per-variant Max-Q/throttle evidence (configured q threshold vs measured peak q vs structural limit) and recorder/CSV actual core/booster level columns via the contract owner | XREF:M-LAUNCH-004, 040, 001 |
| 061 | P2 | M | partial | Validation manifest and citable report generated from tests: per-module entries (reference, tolerance, result, date, source digest), shown in Physics & sources in 3 languages, missing row fails a test | 001, 040 |
| 062 | P2 | XS | partial | Physics exit metrics for the master plan (R4 waves): vehicles timelined 12->18/21, ratings within +-25 % 7->8/8 (>=6 within 15 %), sized launchers 0->3/3, unsourced parts only fall, every experimental label tied to a Known-limitations bullet, unintended re-records = 0 | - |
| 043 | P3 | M | open | Vulcan ascent inserts ~137 x 1016-1200 km against a planned 250 x 500 km parking orbit; nothing bounds the parking orbit in tests | 040, 041 |
| 045 | P3 | M | open | Falcon Heavy cores cut off 11-13 % early (core throttle depth unpublished); Atlas V and Falcon Heavy fairings come off 17-27 % early | 040 |
| 046 | P3 | M | open | Electron second stage burns ~25 % short; PUG throttle (~70 % mean) cannot be expressed in the data model | 040 |
| 047 | P3 | L | open | Starship Flight 5 ship lands ~6 min early and 15-25 deg short; the single heavy test window is too wide to catch it | 040 |
| 048 | P3 | M | partial | Proton-M / Angara-A5 (and Soyuz-2.1b) LEO rows always carry the 22 t kick stage: add a sourced Briz-less LEO reference configuration | 040 |
| 051 | P3 | M | open | Six-DOF aerodynamic coefficients compared with NACA TR 1048 / NASA TR R-474 cone-cylinder data at M=2-4, alpha <= 20 deg (no fitting); mismatches and confidence envelopes recorded | 040 |
| 064 | P3 | XS | open | Architecture test: pedagogy/game modules (challenges, campaign, scores, diagnosis) may import only types from src/physics | XREF:unified-learning X01/X02 challenge items |

### 7. PLAN R3.1 contract (physics owner co-signs)

| mid | pri | effort | status | title | depends on |
|---|---|---|---|---|---|
| 028 | P2 | M | open | LTAN convention: satellite designer aims the node at the mean Sun, Launch at the true Sun (flown node errors -2.77/-2.83 deg for NAPA-2/THEOS-2, up to ~16 min/4 deg) | XREF:M-BUILD-001 (R3.1 envelope) |

### 8. F track (fidelity, validated, after E)

| mid | pri | effort | status | title | depends on |
|---|---|---|---|---|---|
| 020 | P2 | L | open | Long-term propagator realism: Sun (and Moon) on one of-date ephemeris (removes the 0.45 deg / up to 11 s SRP shadow-edge offset), MU_MOON = DE441 value, run as ONE validated package with D-10 and the solar-constant decision | 010, 021, 027, 001 |
| 022 | P3 | M | open | Atmosphere above ~86-100 km differs between Launch (Vallado exponential table) and lifetime/re-entry (NRLMSISE-00): make answers consistent without switching the ascent default | 021 |
| 025 | P3 | M | open | Wind model limited to 0-12 km (8 m/s east, shear, gusts) and absent from point-mass outside Monte Carlo: sourced opt-in upper-wind profile | 012 |
| 026 | P3 | S | open | propagateKepler hyperbolic/parabolic fallback is a crude 2nd-order 10 s chain: replace with an analytic universal-variable solution before any general Moon/escape use | XREF:M-LAUNCH-045 (P10 shares the propagateKepler tail - land P10 factoring first) |

## Recommended execution order (physics owner P unless noted)

1. **R2 close-out wave (physics part).**
   - Run 001 (baseline on `da67341`) and 002 (bitwise harnesses recorded at that base).
   - Run 003 (worker profile).
   - Ship 041 (text fixes only).
   - Ask the owner to decide 021 (D-10), 060 (D-3/D-4) and 027 (solar constant).
2. **E-PHYS-1 (010).** Start right after 002, because it is independent of R3 and R4.
3. **E-PHYS-3 (012, 013, 014, 015).** Run it as one serialized no-op package before any R4.2 or R4.3 branch touches `rigid/runtime.ts`, `simulation.ts` or `sim/forces.ts`.
4. **E-PHYS-2 (011).** Run it before the R8 Moon tasks and before R5.2 reuses the lunar or propagator code.
5. **R4.1 (040, 048, 049).** Then run the R4.2 and R4.3 family waves (042-047, 052, 023, 024, 029, 030) and R4.4 (050, 051, 061, 062).
6. **F track.** Run 020 together with D-10 and the solar-constant decision as one validation run, shared with M-ORBIT-023. Then run 022, 025 and 026.
7. **Elsewhere.**
   - 017 goes to the integration owner (I) inside R3.5.
   - 028 is co-signed in R3.1.
   - 064 is added together with the first X01 or X02 module.

## Conflicts resolved

- **Tolerance tier before guidance refits** (devplan 11-02 and ENG-K17, against PLAN R4.2/8.1). PLAN wins: held-out checks are required, and the tier is not a precondition. Soyuz refits #63 and #64 already shipped that way. The tier is still recommended as a protective oracle (060). It never replaces the hash gate, and the two are never used as gates together.
- **"Built-in flights stay bit-for-bit"** (roadmap P7) against PLAN R4, which moves goldens when there is evidence. The rule is restated in a narrower form (063): Orbit, Build and teaching work never moves Launch goldens. Launch changes only through R4, with before/after evidence and a reason beside each re-record.
- **One atmosphere above 100 km** (PHY-12) against the devplan not-to-do rule "no default switch of the ascent atmosphere". The ascent table stays. Long-term questions go to the lifetime model and carry a label (022).
- **WGS-84 datum** (PHY-11) against the not-to-do rule "no ellipsoidal Earth default". The conversion is display-only, and the dynamics are unchanged (024).
- **J2 in point-mass ascent** (PHY-10). This would move 27 fingerprints. The offset is documented now. A code change happens only as an owner-approved R4.2 decision (023).
- **D15 claim that cislunar RK4 is "identical to rk4Step"** is false at the bit level. Consolidation is rejected (016).
- **NEW-PHYS-3 golden-section search** is not identical. It is deferred to the validated lunar task. The identical P15 memo (011) is taken first.
- **D18, D19 and D17.** Only the same-value constants are identical and go to 015. MU_MOON, the Sun frame and the solar constant are realism changes and go to 020 and 027, inside one validation run.
- **D-27 phone default.** Do not lower realism by making point-mass the silent default. Make six-DOF cheaper first (003 and 012). If phones still miss the budget, offer point-mass as a labelled choice (003 quality guard).
- **PR #36 and D-12.** #36 was merged whole, not split as D-12 asked. The decision is superseded. The missing heavy evidence is carried by 001.
- **Vega-C ratings and sized-launcher misses** appear in both the physics and the Build ledgers. M-BUILD-016 and M-BUILD-018 are canonical; 053 and 054 here are pointers.
- **Launch ledger items M-LAUNCH-077, 078 and 079 say "physics group owns".** The canonical items are 042 (PSLV/H3), 043 and 071 (Vulcan; Soyuz done) and 044 (Falcon 9 recovery). The master plan should drop the Launch copies.

## Superseded, rejected, deferred and done (and why)

- **M-PHYSICS-016** (rejected): RK4 variants (rk4Step, cislunar, navigation, explicit guidance, return guidance, J2 coasts): do NOT consolidate; optional comment documenting the four association orders. Verified on fbefa18 and unchanged on da67341: rk4Step uses s+(dt/6)*(((k1+2k2)+2k3)+k4), cislunar/return-guidance s+((k1+2k2)+(2k3+k4))*(dt/6), navigation/explicit guidance s+((k1+2(k2+k3))+k4)*(h/6); merging would move Apollo and rendezvous results by ulps compounding over days.
- **M-PHYSICS-018** (deferred): Apollo golden-section searches (coastToPerilune, coastToPerigee, loiPitch) with exact phi and one evaluation per iteration. origin/main cislunar.ts:96-102, apollo-entry.ts:211-216, apollo.ts:1131-1135 use rounded 0.618 and evaluate both interior points; changing it changes visited points and Apollo results (fidelity change).
- **M-PHYSICS-053** (superseded): Kick-stage/upper-stage ratings (Vega-C LEO 31 % high, Ariane 64 16-22 % high, GTO post-insertion burns impulsive) - merged into the Build group item. Merged into XREF:M-BUILD-016 (canonical; owner P with B, PLAN R4.3). Status there: open (IMPLEMENTATION-STATUS:494-502 unchanged on origin/main).
- **M-PHYSICS-054** (superseded): Sized launchers reach orbit at design dv + <= 100 m/s (0/3 today), fairing rule D-9 - merged into the Build group item. Merged into XREF:M-BUILD-018 (canonical, PLAN R4.3; D-9 open in DECISIONS).
- **M-PHYSICS-070** (done): PR #36 (F14 fairing rule for Proton-M/Angara-A5, Proton published stage masses, abandonInsertion) merged; D-12 split decision superseded. Merged as 17bd60f on 2026-10-01 (merged whole, not split as D-12 asked). Six-DOF fleet passed on 91ee372 (contains #36); the heavy suite has not run in CI on any main containing #36 -> carried by M-PHYSICS-001.
- **M-PHYSICS-071** (done): Soyuz-2.1a six-DOF pitch runaway after booster separation (alpha 11.7 deg, aeroEnvelopeExceeded at T+124 on a crewed flight) fixed with a stored pitch programme and a regular-suite test. PR #63 (c109f98): SOYUZ_21A_PROGRAMME; tests/rigid-soyuz-programme.test.ts (max angle <1.7 deg in dense air, peak rate <1.5 deg/s, envelope event only at q<10 Pa).
- **M-PHYSICS-072** (done): Phase 2.5 physics delivered: space weather feeds lifetime density, full NRLMSISE-00 with daily indices, IERS UT1-UTC and polar motion, ballistic coefficient fitted to tracking, Sun/Moon in transfer-orbit propagation. origin/main src/physics/propagator/activity.ts, density.ts, msis.ts; src/orbit/earth-orientation.ts; src/orbit/reentry.ts, ballistic.ts; public/data/space-weather.json, earth-orientation.json; VALIDATION 6-7.
- **M-PHYSICS-073** (superseded): Conflict "guidance refits only after the tolerance tier" (PSLV/H3 loft, Soyuz pitch, Vulcan parking). Soyuz-2.1a/2.1b refits shipped (#63, #64) with docs/FLIGHT-PROFILE-METHOD.md before any tier; PLAN R4.2/8.1 govern refits (held-out checks, one shared-runtime owner).

## Items that belong to other area groups (referenced, not owned here)

- **Build:**
  - M-BUILD-016: kick-stage ratings (B-13, PHY-QW4, 8-09).
  - M-BUILD-017: per-strap-on Isp (PHY-QW6).
  - M-BUILD-018: sizing and D-9 (8-10, B-14).
  - M-BUILD-019: six-DOF gaps for user-built rockets.
  - M-BUILD-001: R3.1 envelope (needed by 028).
- **Launch:**
  - M-LAUNCH-031: PHY-19, osculating vs J2 result table (UI now, physics in R4.3).
  - M-LAUNCH-004: U16 UI part (prerequisite of 052).
  - M-LAUNCH-043: P9 wind fast path in `aero.ts`, which needs physics-owner approval and a bitwise pin.
  - M-LAUNCH-045: P10 shared `propagateKepler` tail; land it before 026.
  - M-LAUNCH-072: labels tied to Known limitations.
  - M-LAUNCH-083: PHY-06, done.
  - LUI-05: silent physics-worker errors.
- **Orbit:**
  - M-ORBIT-013/014/015/016/017/018: P20, NEW-PHYS-1, P16, P30, D16, D21.
  - M-ORBIT-019: second-order J2.
  - M-ORBIT-021: finite-burn planner.
  - M-ORBIT-022: opt-in Cowell.
  - M-ORBIT-023: re-entry accuracy; it depends on 021, 022 and 020 here.
  - M-ORBIT-025: R5.2 frames; shares a decision with 024.
  - M-ORBIT-031..034: the Moon; these depend on 026 and 011.
  - M-ORBIT-043: sources page and unsourced count.
  - M-ORBIT-046/047: satellite model contract and templates.
- **CI and perf groups:**
  - PHY-15 and TQ-01: the CI side of 060, including ENG-K01 (`.nvmrc`/`engines`).
  - PHY-05: heavy CI, done.
  - D-27: the perf journey that 003 feeds.
  - INF-04 and CR:P2: workers duplicate the physics core. Doing this before R4 grows the core stops paying six times for each addition.
  - CR:D1: the job-runner contract.
- **UI:** NEW-UI-4. With the default dynamics, dispersed runs of a custom vehicle fly point-mass instead of six-DOF. This is a realism bug that belongs to R2.1/UI, but the physics owner must review the result change.
- **Docs:** PHY-03, stale fleet counts. The IMPLEMENTATION-STATUS roadmap table still says "G05 not started" (doc-map C1).

## What the master plan must not miss

- 001 must come before every physics package, because the R1.4 runtime change has never had a full heavy or fleet run. A red case found there is a regression to bisect. It is never a golden to re-record.
- Every E package needs the harness from 002 recorded **at base**, before the change. Tolerance tests alone cannot prove identical output.
- The order is E before F. Never mix a no-op refactor with a realism change in one PR. In particular, run 010 before 020, D-10 and 027, and run 012 before R4.2/R4.3 touch `rigid/runtime.ts`.
- Exclusions to keep:
  - Do not remove `quatNormalize` inside `quatRotate`.
  - Do not merge the hypot-based and sqrt-based vector helpers.
  - Do not merge the RK4 variants.
  - Do not merge the wrapPi variants or the ENU builders.
  - Do not change `Math.pow(x,1.5)`.
  - Do not bump `RIGID_DATA_REVISION` for a text fix.
- The not-to-do list (063) must appear verbatim in the master plan.
- Three owner decisions block physics realism work and cost almost nothing to take: D-10, D-3/D-4 and the solar constant. Put them at the top of the decision register, with the recommended options.
- `docs/ROADMAP-PART2-3.md`, `SIXDOF-VEHICLE-DATA.md` and `T03-CURRICULA-RESEARCH.md` are read by code or tests. The master plan absorbs their content but must not move or reformat them.
