# Question 10, option (ข): the guidance in the geodetic frame. Notes (parked)

Parked by the owner on 2026-10-18, about 21:10 UTC ("งานใหญ่ให้เก็บไว้ก่อน"), during the design. The worktree `wt/rb-guide` (branch `rb/guide`) is still at 5d942b4 and clean. **No source change was made, no commit was made, and nothing was measured.** No long run was started. There is no WIP commit because there was nothing to commit.

## What was read

- The report `docs/development/reports/argon4-fu-rebaseline.md` (all of it), `docs/DECISIONS.md` for 2026-10-17/18 (10.ข is in "the re-baseline's further questions"), `docs/development/SESSION-PROTOCOL.md`.
- Commits efe26e9/52a2521 (the level pad; the vertical and the programme flown from n̂), 3c6f083/153832f (both taken back: Progress MS −10.2 km of perigee, S2 at 1 000.09 m), 19eb5da/8b24c6d (the vertical phase alone on n̂, so linear-loop passes).
- `src/physics/guidance.ts` (all), `src/physics/explicit-guidance.ts` (all), the ascent step of `src/physics/simulation.ts` (l. 940–1070), `src/physics/sim/rigid-link.ts`, the R-7 and Saturn V programmes in `src/data/vehicles.ts`, and `tests/linear-loop.test.ts`.

## Findings that shape the design

1. **One guidance serves both models.** `AscentGuidance.update` (guidance.ts) is called only from `Simulation.stepFlight`. The six-DOF runtime takes the same `dirCmd` as its nose command, with `RigidLink.rigidSide()` as its roll reference. A change in guidance.ts therefore reaches the point mass and the six-DOF together. No mirrored copy was found. `sim/apollo-rendezvous.ts` has its own `AscentGuidance`, but that is the LM's, on the spherical Moon, and is out of scope.
2. **Why the programme from n̂ cost Progress 10.2 km (efe26e9).** At Baikonur n̂ leans δ = 0.192° toward the pole from r̂. On the ISS azimuth (about 62°) that lean splits into ε_∥ = δ·cos az ≈ 0.09° down the plane and ε_⊥ = δ·sin az ≈ 0.17° across it. efe26e9 flew `dir = normalize(sin θ·n̂ + cos θ·d̂)`, so the open-loop programme carried an across-plane thrust share of about sin θ·ε_⊥ for its whole ~118 s of high pitch. That is about a·ε_⊥·t ≈ 5–6 m/s of cross-plane velocity, plus a few hundred metres of offset. The target-plane closed loop then has to steer it out, and the Blok I already runs dry: about 6 m/s short is about 10 km of mean altitude (Δa ≈ 2a·Δv/v ≈ 1.7 km per m/s). The ε_∥ part also flattens the programme by about 0.09°. The two effects were not separated; this needs measuring (next steps).
3. **Why holding r̂ from the release broke linear-loop (3c6f083).** The last test of `tests/linear-loop.test.ts` reads the first bending mode's divergence over T+0.5…2.5 s of a six-DOF Falcon 9 from the Cape (`leo`, about due east). The stack stands on n̂ (level pad). Any command off n̂ at release is an attitude step at T+0, and that step's transient drives the mode, so the frequency moved to 5.07 % against the 5 % bound. For an eastward launch from the Cape the whole lean is across the plane (ε_⊥ = δ ≈ 0.166°), so a vertical phase on the in-plane projection would step by nearly as much as 3c6f083 did. **Conclusion: the vertical rise must stay on the full plumb line n̂, and the across-plane lean can only be taken out after the pitch-over begins, smoothly.**
4. **HEAD (19eb5da) still has a step at the pitch-over.** At the kick's start `dir = cos 0·r̂ + …= r̂`, a step of δ from the n̂ the vertical phase flew. At the R-7 programme's first pitched point the step is the same. These are the "change of reference at the pitch-over" that 10.ข removes.
5. **Programme data.** The R-7 (`SOYUZ_21A_PROGRAMME` and the cargo one) is vertical over T+0–5 s, then 89.85° at 6 s and 89.47° at 8.5 s, so about 0.2°/s. Saturn V (`SATURN_V_506_PROGRAMME`) is vertical to T+13.2 s, then 88.53° at 20 s. Saturn V is the only programme with `closedLoopStart` (204.1 s). Soyuz-2.1a's six-DOF defaults carry `closedLoopStart: 140` too, with a kick of 6° over 12 s. That is the R-7 azimuth hold in the gravity turn (`fixedHandover && !this.plane && requireDownrangeKick`), flown when the programme is not.

## The design (not implemented)

Frame at the vehicle: r̂ = r/|r|. d̂ is the downrange direction on the rotating azimuth, ⊥ r̂ (as now). ĉ = r̂ × d̂ is the flight plane's normal, so ĉ × r̂ = d̂. n̂ = `geodeticUp(r)` is the plumb line.

    ε_∥ = n̂·d̂,  ε_⊥ = n̂·ĉ                       (the lean down and across the plane)
    n̂_p = normalize(n̂ − ε_⊥ ĉ)                    (the geodetic vertical in the plane)
    ĥ_p = ĉ × n̂_p                                 (the geodetic horizontal in the plane, downrange)

The vertical with a fraction λ ∈ [0, 1] of the across lean left:

    v̂(λ) = normalize(n̂_p·√(1 − ε_⊥²) + λ ε_⊥ ĉ)   (λ = 1 gives n̂; λ = 0 gives n̂_p)
    ĥ(λ) = normalize(ĉ × v̂(λ))

Mode by mode:

| Mode | Now (19eb5da) | Proposed |
|---|---|---|
| Vertical rise (also a programme's 90° part) | n̂ | n̂, unchanged: the stack stands on it, and linear-loop needs no step at release |
| Kick (progress f = (t − t_kick)/kickDuration, θ = f·kickAngle) | cos θ r̂ + sin θ d̂ (a δ step at f = 0) | cos θ v̂(1 − f) + sin θ ĥ(1 − f): it starts on n̂ and ends in the plane, with the pitch from the geodetic vertical. The end test measures the velocity's angle from v̂(1 − f) and ĥ(1 − f), which are n̂_p and ĥ_p at f = 1 |
| Stored programme | sin θ r̂ + cos θ d̂ (a δ step at its first pitched point) | sin θ v̂(λ) + cos θ ĥ(λ), with λ = max(0, 1 − (90° − θ)/Θ_f): θ from the geodetic vertical, the across lean faded out over the first Θ_f of pitch-over. Proposed Θ_f = 1°: R-7 T+5…≈10.4 s, Saturn V T+13.2…≈18 s; leftover cross-plane Δv ≈ a·ε_⊥·7 s ≈ 0.3 m/s; turn rate ≈ 0.03°/s. Not the kick angle: a programme flies none of `PROGRAMME_FIELDS` (defaults.ts) |
| Gravity turn | follows the velocity; its pitch-rate floor and the R-7 azimuth hold measured from r̂ | still follows the velocity (no frame); the floor's pitch (`pitchNow`, `pitchMinRad`, the re-composed vDir) and the azimuth hold's split (climb along n̂_p, rest along ĥ_p) measured in the geodetic plane frame; the reported pitch from n̂_p |
| Closed loop (linear tangent) | r̂ | **r̂, kept.** Its θ is the thrust share along the radius from the radial equation r̈ = a_T sin θ − μ/r² + v_h²/r, and its targets (insertion radius, zero radial speed, a plane through the centre) are geocentric. Measured from n̂ it would fly a_T cos θ·ε_∥ ≈ 0.06 m/s² of radial acceleration off its own law. Its θ is computed afresh, so it has no continuity to keep with the programme. Open: whether its *reported* pitch should be geodetic (see below) |
| PEG / IGM | r̂ / orbital frame | **Kept.** They solve for an orbital state (radius, speed, γ = 0, plane `iy`), and their gravity is J2's. `record.pitchDeg` is reported from r̂ (as with the closed loop) |
| The attitude holds (the cut-off overrun, tail-off and hot-stage holds, `s.dir` in orbit) | inertial directions | no frame, nothing to change. `rigidSide()` (the launch-plane roll reference) is ĉ at the pad, the same plane, so it is kept |
| q·α placard | slerp toward the air velocity | no frame; only the reported `pitchDeg` follows the mode's frame |

Code sketch: in `update()`, after `enuFrame`, compute ĉ, ε_⊥, n̂_p and ĥ_p once (`inp.plumb ?? up`, so a caller without `plumb` keeps today's flight bit for bit), plus a small `leaned(λ)` helper. Touch only the `kick`, `pitchProgram` and `gravityTurn` cases and the kick-end test. `closedLoopDir` stays as it is.

## Open points to settle when resuming

- **The reported pitch (`pitchDeg` → `s.pitchCmd` → HUD `pitch`, telemetry, the CSV).** The proposal is the geodetic pitch in the geodetic modes and the radius pitch in the closed loop and PEG/IGM, so each mode reports the pitch it flies. The alternative is to report every mode against r̂, as `burns.ts:955` does for orbital burns. Before choosing, check what the HUD compares `pitchCmd` with (frame.ts/hud.ts), and grep the tests that read `pitchCmd` or `pitch` against a programme value.
- **Θ_f.** 1° is a new modelling constant, and the report must say so. The other option is a time constant. Either way the measurement decides whether it matters (Progress MS and the S1/S2 navigation).
- **ε_∥ alone.** It is not known how much of efe26e9's 10.2 km came from ε_∥ (in plane, which the decision keeps) and how much from ε_⊥ (which the decision removes). If the in-plane part alone still costs Progress several km, that is the decision's physics. Re-fitting the R-7 programme belongs to the historical-vehicle data step (owner answer 2.ก, Progress MS-19). Report it; do not change data here.

## Exact next steps for whoever resumes

1. Implement the table above in `src/physics/guidance.ts` (and only there, plus its tests and PHYSICS.md's guidance section). Commit in the repo's style, with the two trailer lines.
2. Add a unit test in a guidance test file: with `plumb` given, the kick's command at f = 0 equals n̂ and at f = 1 lies in the plane (·ĉ = 0) at kickAngle from n̂_p; the programme at θ = 90° − Θ_f has no ĉ component; without `plumb` the commands are unchanged.
3. Measure, each against the base (wt/base, 7f991f9) and 5d942b4. The probes are in `wt/rebaseline/tests/probe/` and `probes/rebaseline/`; copy them into this worktree's `tests/probe/` (gitignored). Use `--maxWorkers=1` or `2`, long runs in the background with output to a file:
   - `fleet-table.test.ts`, then `compare_fleet.py` against `fleet-base3.tsv` and `final/fleet-head.tsv`. Any base-passing row that fails is a guidance finding, never a bound change.
   - `ratings.test.ts` against `final/ratings-head.tsv`.
   - `sixdof-sites3.test.ts`, one flight per site latitude, against `sixdof-sites3-base.tsv` and `fix/final-sixdof-sites.tsv`.
   - `fix-progress6.test.ts`, the six-DOF Progress MS (HEAD: physical 186.2 × 219.7 km, osculating 182.3 × 211.4; base 192.8 × 247.1). Also run a variant with ε_∥ forced to 0, to separate the two parts of the lean.
   - `tests/linear-loop.test.ts`: it must pass, and print the measured ω ratio (HEAD under 5 %; 3c6f083 5.07 %).
   - `npx vitest run --config vitest.heavy.config.ts tests/heavy/lesson-packs-sixdof.test.ts --maxWorkers=1`, plus `fix-s2.test.ts` and `fix-s2nav.test.ts` (S2's star-tracker flight at HEAD is 997.01 m against 1 000 m: watch it).
   - `tests/apollo-own-launch.test.ts`, `tests/apollo-computed-guards.test.ts`, `tests/eo-phy-6/apollo11.test.ts` (a golden: record old → new, do not update).
   - `historical.test.ts`, `hist6dof.test.ts` (Vostok-1, Sputnik-1 move with the R-7's kick and programme).
4. List the moved goldens (d01-fleet-fingerprint 27 rows, heavy sixdof-fingerprint 21 rows, rigid-flex-golden, heavy flex-golden, apollo11) as old → new from the vitest output. Do not re-record.
5. Run `npm run build` > log, `node scripts/bundle-budget.mjs <log>` (the change is a few hundred bytes in index and each flight worker; the Monte Carlo worker was 62 B under its ceiling at 19eb5da, so watch it), and `npx tsc --noEmit`. Leave the tree clean.
