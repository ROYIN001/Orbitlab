# rb/instr: notes for whoever resumes (parked by the owner 2026-10-18, ~21:10 UTC)

Worktree `scratchpad/wt/rb-instr`, branch `rb/instr` from b18ce48. Not pushed.

- **d7a6fea** Tests: the instruments built on the sphere measure the same quantity on WGS-84 (3.ก). Finished and run.
- **126efba** WIP (parked by the owner 2026-10-18): H-IIA's trim read on the physical apsides. Written and type-checked, **not run**.

`npx tsc --noEmit` is clean at 126efba, and the worktree is clean. The probes are in `wt/rb-instr/tests/probe/` (gitignored), and their outputs and logs are in this directory.

## Scope as it stood when parked

- **Q3 (ก), the instruments.** This is the main job. The six sphere instruments are done. The osculating-ellipse instruments are not done (one is WIP).
- **Q5 (ก).** The orchestrator deferred lesson 1.4 and the AVUM+ and Electron timeline notes, because Q10 (ข) and Q8 (ข) will move the flights again. Do not change lesson 1.4 or its pack until then. What I would set is below. Lesson S2 is answered (ก), keep 1 000 m, so there is nothing to do there.
- **Q11 (ก).** Retire the 16 "assertions kept as they were". This is now in scope and not started. The steps are below.
- **Q9 (ค).** PSLV-XL's counterfactual at a peak factor that keeps the published peak thrust. In scope, not started.

## Tests run (all `--maxWorkers=2`, default suite)

| Run | Files | Tests | Result |
|---|---|---|---|
| Before, at b18ce48 (`before-default.log`): data-consistency, range-safety, panel-verdict, recovery-return, equations, fx5-031, target-plane, quickstart, lessons | 9 | 120 | 104 pass, 16 fail |
| Before, at b18ce48 (`before-fleet-defaults.log`, 1 m 18 s) | 1 | 164 | 156 pass, 8 fail (listed below) |
| After d7a6fea (`after-sphere.log`): data-consistency, range-safety, panel-verdict, recovery-return, equations, fx5-031 | 6 | 89 | 87 pass, 2 fail |

The 2 failures after d7a6fea are both Q11 kept assertions: data-consistency's "a solid motor contributes the same liftoff thrust as a stage and as a booster" (1.0215 against 1 ± 0.005), and equations' "marks what does not apply on the second stage above the air" (no `eq.note.vacuumOnly`).

No heavy file was run. The i18n bundle was not built, because no text changed.

## Done (d7a6fea): before → now, bound unchanged

| Test | Read before | Reads now | Bound |
|---|---|---|---|
| data-consistency: the declared inclination pair is inside the site azimuth corridor | sweep from the geodetic `site.latitude`; Baikonur 0.190° off `corridorReach` | sweep from `padPlaneLatitude(s)` (geocentric); every site within 0.049° (probe `corridor`) | 0.051°; the declared-pair checks (0.3° slack, 0.2° on max) all pass |
| range-safety: one rule (sweep) | `headings()` and the planner check from the geodetic latitude; 23 disagreements | from `padPlaneLatitude`; 0 disagreements | — |
| range-safety: a site can fly its own minimum inclination | recorded headings 91.93 (Tanegashima), 94.18 (Xichang), the 300 km instrument on the sphere | 94.03 and 95.33, the same instrument from the geocentric latitude (30.232°, 28.086°); the plan gives 94.027 and 95.331 | toBeCloseTo(…, 1), i.e. 0.05° |
| range-safety: F01 | 129.95 / 141.33 / 136.13 / 126.28 / 142.97 | 130.15 / 141.37 / 136.24 / 126.53 / 142.99; the plan gives 130.131 / 141.348 / 136.222 / 126.516 / 142.970 | 0.05° |
| panel-verdict: fails a target above the site corridor | message contains the declared `maxInclination` (31.8, 31.0) | message contains the window's reach from the pad, pinned at '31.7' and '30.8' (corridorReach hi 31.6516° and 30.8282°) | exact `toContain` |
| recovery-return: Super Heavy caught by the tower | \|r\| − 6 378 137 − site alt = −4 067.8 m | `geodeticHeight(r)` − site alt = 12.98 m (probe `tower`) | 8–18 m |
| recovery-return: divert, the first assertion | velocity down the radius: 0.2248 m/s² | velocity down the WGS-84 normal (`geodeticEnu(...).up`): 1.35 × 10⁻¹¹ m/s² (probe `divert`); the radius and the normal are 0.161° apart | 10⁻⁶ |
| equations (E02): Δv book | v₀ = ω(R⊕+h)cos φ = 408.499 m/s; six-DOF 3.18 × 10⁻³ | v₀ = ω·hypot(x, y) of `geodeticToCartesian(φ, 0, h)` = 408.813 m/s; six-DOF 6.0 × 10⁻⁵, point mass 6.1 × 10⁻⁴ (probe `eom-budget2`) | 10⁻³ (six-DOF), 5 × 10⁻³ (point mass) |
| fx5-031: an orbit | `expect(p.apAltM).toBeUndefined()` (point mass judged on the conic) | `apAltM === apJudgedM` and `peAltM === peJudgedM` (501 589.8 m) | exact |

## Not done: the osculating-ellipse instruments

Each of these reads `sim.state.elements` or an event's conic. The probe numbers are from the earlier step at 19eb5da (`../fix/final-*.txt`). Re-measure them on rb/instr before relying on them.

1. **fleet-defaults, the H-IIA / Atlas V / Vulcan trim (WIP 126efba, not run).**
   - Before, the test read each event's `params.ap/pe` conic. H-IIA's last burn took it from 412 × 422 to 412 × 430 km, a residual of 10 → 18 km: "burn 2 left the residual at 18 km".
   - Now, `flyCase`'s onStep collects `evt.parkingOrbit` and `evt.burnComplete`. It reads `physicalApsides({r, v})` once `TAILOFF_SPAN × max(LIQUID, SOLID)` = 5 s has passed after each event, and steps the done sim on to read the last one. It asserts the list of read events matches, and that no ignition comes before a read.
   - Expected from fix-trim's "+30 s" and end rows:
     - H-IIA: 644 → 369 → 17.8 → 8.2 km.
     - Atlas V: parking 142.2 × 808.6, b1 413.4 × 808.6, end 410.9 × 415.4.
     - Vulcan: parking 140.6 × 1292.3, b1 416.9 × 1292.2, end 414.5 × 419.2.
   - Every step improves by more than 1 km.
   - **Why after the tail-off:** at the event instant itself, H-IIA's b3 reads 410.7 × 415.8, worse than b2's 412.0 × 422.6, and would fail. The engine is still tailing off at the event.
   - **To check:**
     - Run it.
     - Confirm the 5 s wait after b2 (6432 → 6437) falls before b3's ignition at 6463.
     - Confirm that stepping a done `Simulation` works. tests/lessons.test.ts does this already.
     - Bound: improvement > 1e3 m, unchanged.
2. **fleet-defaults, "soyuz21a + crew ship reaches the ISS orbit from baikonur".** Replace `sim.state.elements` for pe and ap with `achievedElements(sim)`, already imported. Keep `el.i`.
   - Osculating 404.3 × 427.2 km (perigee 15.7 km off). Physical 412.6 × 427.2 km: 7.4 km and 7.2 km off, inside the 10 km bound.
   - **To check:** the parking-orbit checks after it (pe 195–205, ap 235–250 on `evt.parkingOrbit`'s conic) were never reached, because the perigee assertion fails first. If they fail, report it; they are not in the 3.ก list.
3. **fleet-defaults, "Long March 2D delivers…".** Use the physical apsides via `achievedElements`; bound 15 km. Probe `fix-instruments`:

   | Payload | Osculating (km) | Physical (km) |
   |---|---|---|
   | 325 kg | 592.6 × 602.2 | 591.9 × 599.9 |
   | 650 kg | 573.6 × 599.9 | 597.2 × 602.9 |
   | 1 170 kg | 598.3 × 598.5 | 591.5 × 598.5 |

   Then check the parking-orbit conic checks (190–210 × 590–615) and the insertion clock.
4. **fleet-defaults, "Soyuz-2.1a with an inert payload cuts off on a 200 km circular orbit".** `el = achievedElements(sim)` for peMiss and apMiss. Probe `single-shot`:

   | Payload | Conic at cut-off (km) | Physical (km) | Margin, physical |
   |---|---|---|---|
   | 1 755 kg | 190.9 × 200.0 (margin 0.9) | 199.0 × 201.6 | 8.4 km |
   | 3 510 kg | — | 199.3 × 203.5 | 6.5 km |
   | 6 318 kg | — | 197.7 × 204.6 | 5.4 km |

   The bounds stay: 10 km band, margin > 5 km. The 6 318 kg margin of 5.4 km is tight. Also update the comment's "197.2-198.7 x 200.1-200.6 km" with the new measurement.
5. **target-plane, both tests.** Use `orbitResiduals(sim.plan.target, { ...sim.state.elements, ...physicalApsides({ r: sim.state.r, v: sim.state.v }) }, true)`.
   - Before, the off-window test's misses were `['perigee', 'raan']` on the conic (perigee 404.3 km); the next-window test's misses were `[{perigee}]`.
   - Physical 412.6 × 427.2 km is expected to give `['raan']` and `[]`.
6. **quickstart: the leo and iss starters (gto also, for consistency).** Replace `elementsFromState` apsides with `physicalApsides({r, v})` and keep i and raan.
   - Before, 10 014.8 m (leo apogee) and 15 674.6 m (iss perigee) off, against 10 000 m.
   - Both reach `evt.targetOrbit`. Expected inside the bounds; re-measure.
7. **heavy/history-sixdof, "Vostok-1 reaches its 181 × 327 km orbit".** Read pe and ap with `MEASURES['orbit.perigee'/'orbit.apogee']` (physical), keeping `toBeCloseTo(181, -1)` and `toBeCloseTo(327, -1)`.
   - Replace "physical apogee > 327", which meant off target, with `evt.targetOrbit` present and `|ap − 327| ≤ apsisTolerance(327e3)/1e3` (10 km). Keep `< 350`.
   - Before (probe `fix-vostok6`): osculating 181.0 × 306.4 km. Physical 181.0 × 324.7 km, on target (f157546: 342.6, off target).
   - Run alone with `--maxWorkers=1 --config vitest.heavy.config.ts`, in the background.
   - Caution: the historical-vehicle agent may change Vostok-1's data. Re-measure after their work lands.
8. **Comments.** Every change carries the comment form used in d7a6fea: what it read before, with the number; why (D-51); "the same quantity …, the same bound: the owner's answer "3.ก" of 2026-10-18".
9. **Docs, optional.** VALIDATION.md and PHYSICS.md §1 lines that name these instruments as failing could be updated. Nothing was edited there yet.

**Not mine:** fleet-defaults' "the grid behind DIRECT_INSERTION_CEILING" is a golden (re-record step), and "a fully excluded vehicle must have a dedicated mission that succeeds" is Sputnik-1 (the historical agent).

## Q11 (ก): retire the 16 kept assertions (not started)

They were restored in bbb191d4 (the report's 1d57e95). `grep -rn "question 11" tests` finds them in 8 files: physics-core, monte-carlo (2), rigid-fleet, equations, data-consistency, design-static-fire (3), design-test-stand (2), vostok-render (5).

- **What to do:** remove each kept assertion or test, and leave the decided-law test beside it unchanged. In a comment beside each decided-law test, name what was retired and why: "retired by the owner's answer 11 (ก) of 2026-10-18; its old statement and numbers are in the re-baseline report".
- **The fleet gate:** `achievedElements` in tests/fleet-harness.ts stays on the physical apsides. No kept fleet-gate line exists in the tests: it was never restored.
- **Expected after:** data-consistency and equations pass fully (they are the 2 failures above).
- **Then run:** the 8 files with `--maxWorkers=2`.

## Q9 (ค): PSLV-XL (not started)

tests/validation/pslv-first-stage flies every PS1 solid at a peak factor of 2. Under the law it breaks up at T+29.4 s; its T+5 s thrust is 9 085 kN against 8 625 kN at the base (probe `fix-pslv` in ../fix).

- **What to do:** fly the counterfactual at a peak factor that keeps the published peak thrust of S139 and the PSOM-XL, from a source, or marked as an estimate if none can be read.
- **The aim:** the test keeps its point, that the profile's shape is not why PS1 is slow.
- **Leave alone:** the other Q9 rows (CRS-16, Atlas V Juno, GPS III, SSO-A) are for the final step.

## Deferred, measured today at b18ce48 (for the final step to set)

### Lesson 1.4 (`orbit-payload`)

Probe `lesson14.test.ts`, `lesson14.txt`: point mass, calm air, the lesson's own mission, Δv left at the end of grading.

| Payload | Δv left | Grade |
|---|---|---|
| 16.0 t | 484.6 m/s | payload fail |
| 16.5 t | 399.2 m/s | payload fail |
| 17.0 t | 313.6 m/s | payload fail |
| 17.5 t | 230.9 m/s | pass |
| 17.75 t | 189.3 m/s | pass |
| 17.9 t | 164.6 m/s | pass |
| 17.95 t | 156.4 m/s | pass |
| 18.0 t | 148.1 m/s | reserve fail |
| 18.5 t | 68.3 m/s | reserve fail |
| 19.0 t | 28.3 m/s | off target |
| 19.5 t | 12.4 m/s | off target |

The 150 m/s boundary is at about 17.98 t, and the cost is about 165 m/s per tonne (17.5 → 18.5 t: 162.6). The debrief says "about 170": keep it, or say 165.

**The lesson's own rule** (docs/history/LESSONS-2026-09.md):
- Round 1 set the numbers from flights measured at 500 kg steps, with a fixed 150 m/s reserve: floor 16 t, panel 18 t, worked 16.5 t.
- When Falcon 9 gained 1.5 t, every payload figure moved by the gain and the reserve stayed: floor 17.5 t, panel 19.5 t, worked 18 t (173 m/s; 18.5 t left 93).

**What I would set:** keep the 150 m/s reserve and move the payload figures one 500 kg step down. That keeps round 2's spacing exactly:

| Figure | Now | Would set |
|---|---|---|
| Worked solution (largest 500 kg step that keeps the reserve) | 18 t | 17.5 t (230.9 m/s) |
| Floor | 17.5 t | 17 t |
| Panel start | 19.5 t | 19 t (off target) |
| "Timid" wrong flight | 17 t | 16.5 t |
| Hint's range | 17.5–18.5 t | 17–18 t |

Text to change, in en, ru and th:
- the brief: 17.5 → 17, 19.5 → 19;
- the hint: the range;
- `mission.payloadMass`: 19500 → 19000;
- `criteria.payload.min`: 17500 → 17000;
- tests/lessons.test.ts: 18 → 17.5, 17 → 16.5, and its title.

docs/USER-GUIDE.md line 1690 quotes "at least 17.5 t …", and that edit was outside this agent's allowed files.

The packs (ipst-basic, ipst-physics) list `orbit-payload` by id only. Their notes quote no figure, so their files and hashes should not change. Check with `node --experimental-strip-types scripts/lesson-packs.ts --check`.

**The alternative:** keep the payload figures and lower the reserve, for example to 125 m/s (18 t: 148.1 − 23, round 2's margin). This breaks the precedent that the reserve is the fixed figure.

**Re-measure after Q10 (ข) and Q8 (ข).** The boundary sits 0.02 t below 18 t, so the choice may flip.

### Vega-C's AVUM+ first ignition

The pin is fleet-defaults "known profile deviations", 2400–3600 s. The first ignition is now at **339.19 s** (probe `timelines.txt`):
- the Zefiro 9 cut-off at 332.19 s leaves a 200 × 499 km conic;
- the planner schedules a 5 m/s `raiseApoapsis` "asap";
- the Z9 separates and the AVUM+ lights at 339.19 s and burns until 346.39 s (conic 200 × 520);
- the `shapeAtApoapsis` circularisation follows at 3023.95 s (the old "first apogee" ignition);
- `evt.targetOrbit` comes at 3132 s, physical 499.8 × 500.0 km.

**Cause:** D-51's planning on the physical apsides. The Z9 solid's cut-off leaves the next revolution's apex short of the target, so a short trim is flown at once.

The published callout is a few minutes after Z9 separation (~T+5 min, about 300 s ± 6 s by `PUBLISHED_POINT_BAND`), so this is still outside it, by 33 s. It is no longer at first apogee.

**Suggested note:** re-pin the test to "the first ignition is the short apex trim right after Z9 separation", with a regression band drawn at the table's ±8 s convention around the measured time (e.g. 331–347 s). That is narrower than the old 1 200 s, not wider. Keep the published callout as text. Update the PHYSICS.md §6a "AVUM+ is deliberately not in this table" paragraph. Re-measure first.

### Electron's fairing jettison

The fairing now jettisons at **184.90 s** (112 km), against the published ~190 s with the point band max(5 s, 2 %) = [185, 195]. It is 0.1 s early. At the base it was 186.2 s.

- **Cause:** D-51 with the law. The fairing is on the physical heating placard, and the new trajectory reaches it about 1.3 s earlier.
- **Status:** inside its regression band [178, 194], but outside the published window. "disagreements with the published callout" now gets 7 against the expected 6.
- **Suggested note:** add 'Electron, 200 kg to sun-synchronous orbit › fairing jettison' to the expected list, with a measured note (184.9 s, cause) in that test's comment. Keep '~190 s' and `PUBLISHED_POINT_BAND` as they are.
- **Also update:** the "six" in the file header and in PHYSICS.md §6a (the paragraph, the table of disagreements and the Electron table's 186.2 s).
- **Re-measure after Q10 and Q8:** at 0.1 s it may flip back.

## Golden hashes

None was re-recorded. d7a6fea changes test instruments only, so no golden hash moves because of it.
