# The Argon4 review, checked claim by claim (2026-10-17)

An outside AI reviewer, "Argon4", sent the owner a review of the physics, the realism and the 3-D
drawing. The owner asked (in Thai): understand it in detail; say what is really wrong and what is
not; fix what is agreed; ask about what is uncertain; only report where the code is right.

**Method.** Seven investigators, one per group of claims (A gravity and geodesy, B six-DOF structure,
C cislunar and shadow, D atmosphere, wind and thrust, E surfaces and heating, F navigation and jets,
G the drawing), each reading the code and the documents and measuring where a number was in doubt.
Then a second, independent agent for each group, told to refute the first's verdicts. Every fix
below has a test that failed before it and passes after.

**สรุปภาษาไทย.** จาก 24 ข้อ ข้อเท็จจริงในโค้ดส่วนใหญ่ถูก แต่การประเมินผลกระทบมักเกินจริง ข้อที่ผิดจริงคือ
J2 และ WGS-84 ซึ่งเจ้าของตัดสินแล้ว (D-51) แต่ยังไม่อนุมัติให้เริ่ม (R4.2/R4.5) ส่วนข้อที่ไม่จริงได้แก่ ข้อ 4
(jet damping มีอยู่แล้ว) ข้อ 7 (RK4 ปรับก้าวตามสถานะทุกก้าว) และข้อ 18 (โลกทรงกลมในภาพไม่ใช่ปัญหา) ส่วนที่แก้แล้วคือ
วงแหวนบรรยากาศซ้อน เปลวไอเสียของท่อนที่บินกลับ รวมถึงบั๊กที่ Argon4 ไม่เห็น 5 จุด ได้แก่ ค่าประมาณไบแอสใน EKF
Apollo 11 ที่บินไปดวงจันทร์ได้ทุกวันที่ แพนควบคุมที่ชนจุดหยุดในสุญญากาศ เปลวไฟของท่อนที่ลงจอดแล้ว
และเปลวของบูสเตอร์เชื้อเพลิงแข็ง

## Verdicts

FP = moves the pinned fingerprints (tests/d01-fleet-fingerprint.test.ts, tests/heavy/sixdof-fingerprint.test.ts).

### Physics

| # | Claim | Verdict | Why | Action |
|---|---|---|---|---|
| 1 | Point-mass ascent has no J2; orbit phase and six-DOF do | True; "high" overstated | As PHYSICS §2 states. J2 is a small share of the point-mass/six-DOF gap (Falcon 9 at SECO: 24,238 kg, 24,218 with J2, 25,777 six-DOF). D-51 decided it for R4.2, not authorized | Owner; FP 27/27 |
| 2 | Kepler coasts above 140 km have no J2 | True, documented (PHYSICS §10) | A 45-min LEO coast: node ≤0.25°, apsides ±5–18 km; GTO apogee −180 km from the J2 energy, not precession. The coast alone breaks 12 of 21 rows (the planner is Kepler); D-51's wording covers the ascent only | Owner; FP 21/27 |
| 3 | Spherical Earth: pads 11–17 km too high, gravity and centrifugal wrong | Numbers right; centrifugal wrong | Pad g 0.16–0.31 % low; centrifugal 2–4·10⁻⁵ m/s². Consistent sphere. The larger effect is the pad's potential energy, up to ~21 m/s at Plesetsk. D-51 (WGS-84) → R4.5 | PHYSICS §13.6 wording fixed; owner |
| 4 | Jet damping (internal Coriolis) missing from `reducedFlux` | **False** | −İω − Σṁ r×(ω×r) with the settled-column mass model is −ṁ[(x_e−x_c)² − (x_t−x_c)²]ω, the classical jet damping, tank side included. `quasiSteady` is the approved baseline (SIXDOF-VEHICLE-DATA, SIXDOF-ACCEPTANCE) | None |
| 5 | Bending mode dropped at 16 Hz, η̇ zeroed: IMU jump | Facts true, impact nil | The deflection becomes Q/K, not zero; 3 of 17 flex flights cross once each; IMU step ≤1.6·10⁻⁴ °/s. Documented (PHYSICS §2b). Modes 2–3 and Timoshenko are scope | None |
| 6 | Slosh cleared in one frame below 1 m/s² | True, documented | Mass and inertia kept; the relative momentum lost is ≤3 cm/s, ≤0.1 °/s equivalent; no force step (stiffness ∝ acceleration) | None |
| 7 | Cislunar RK4 at a heuristic fixed step instead of DOPRI | **False** ("fixed") | The step is recomputed from the state every step (1–120 s); perilune error ~1 m over 73 h against validation tolerances of 1–300 n mi. DOPRI is private to the propagator's forces; a change rewrites tests/eo-phy-6/ref/apollo11.json | None |
| 8 | TDB−UTC fixed at 1969; DE441 only Apollo's week; 120 s central difference | Facts true, impact nil in scope | D-11 limits the Moon to that week; 39.75 s feeds only the table; the difference costs 4·10⁻⁶ m/s. General ephemeris: M-ORBIT-031 (R8). The one way out of the week was a bug (below) | Fixed the bug |

### Realism

| # | Claim | Verdict | Why | Action |
|---|---|---|---|---|
| 9 | Launch and entry ignore NRLMSISE-00 | Mostly true | MSIS is a climatology, not weather; M03 and lifetime already use it. Max-Q density ±5–16 % by site and season. Above 86 km planned (M-PHYSICS-022, R4.5); D-10 | Owner (planned) |
| 10 | Point-mass has no wind; six-DOF wind is shear and one sine | True for ascents | Missed: Vostok-1's measured Saratov wind and Monte Carlo's dispersed wind. Dryden/von Kármán are aircraft standards. Planned (M-PHYSICS-025, R4.5) | Owner (planned) |
| 11 | No nozzle separation; constant Isp through start-up and tail-off | Not an issue | F_SL is the published figure, exact for full flow; Summerfield predicts separation for engines qualified to run full at sea level; start-up is on the pad; ≤1–2 m/s. Documented. Found instead: the throttle scales the pressure term (below) | Documented |
| 12 | Grid fins and flaps the same at every Mach number | True, small | Fins move ≤0.4° at Mach 0.8–1.5; the larger missing effect is the supersonic fall and the passive fins' stability | SIXDOF-VEHICLE-DATA updated; owner |
| 13 | No retro-plume drag reduction | True, ~nil | Entry-burn drag ≤0.2 % of thrust; the landing burn is subsonic (~29 m/s, 10 % of braking); guidance and plant would have to change together | Owner |
| 14 | No radiative heating at 11 km/s | Not relevant | Only Vostok uses the heating (7.6 km/s, below Tauber–Sutton's 9 km/s); Apollo's entry computes none | None |
| 15 | EKF without the Joseph form loses positive definiteness under star-tracker fixes | Form true, risk false | Needs P/R > 4.5·10¹⁵: impossible for the tracker (σφ > 32 rad); only a MEMS unit after 10⁵ s without GNSS and a 1 cm fix, where Joseph fails too (tried). Found instead: frozen bias estimates (below) | Fixed the real bug |
| 16 | GNSS not cut in blackout or above the constellation; tracker without exclusion angles | True (gap) | A hard cut above the constellation is wrong (GNSS works at GEO and HEO, degraded); no built-in flight flies the navigation through entry or that high | Owner, low |
| 17 | RCS continuous, no PWM or minimum impulse | True, documented | A 0.02 s pulse exceeds the 0.01 s step, so it needs latched state; on by default it moves every six-DOF fingerprint | Owner |

### Drawing

| # | Claim | Verdict | Why | Action |
|---|---|---|---|---|
| 18 | The Earth mesh is not flattened | **Not an issue** | render/datum.ts already puts Vostok's WGS-84 bodies on the drawn sphere; a flattened globe would leave pads 0.2–17 km in the air. With R4.5 | None |
| 19 | Two atmospheres overlap with the physical sky | **True** | A second ring at 60–110 km, faceted edge, brown band at the terminator | Fixed (disc-only shell) |
| 20 | Cylindrical shadow, no penumbra, no Moon shadow | True, deliberate | Documented and validated (D06); the edge sits at mid-penumbra; cislunar flight has no SRP. The render's soft edge is deliberate. The visible gap: the craft is drawn lit through the Moon's shadow, 46 of 119 min per lunar orbit | Owner |
| 21 | Plume not tilted with the gimbals | True, tiny | The resultant exceeds 2° in under 0.3 % of samples; flips and landings are drawn by debris.ts. R4.7 | None |
| 22 | Bending shader leaves the normals straight | **True** (cosmetic) | 2.9° Falcon 9, 6.5° Starship, ~37° in lesson 4.4's whip; the shadow is of a straight rocket too. A correct fix is larger than it looks: the barrels are single-segment (the bend is drawn as a kinked polyline), the GLSL proposed first broke the MeshBasic glow materials, and the shadow needs the bent world position as well | Owner (a look change of ~100+ lines) |
| 23 | Debris tumble about a fixed axis; booster plume on/off | Partly | The point-mass tumble is decorative (no attitude recorded) and its return records no throttle. Six-DOF throttle is recorded and was ignored | Fixed |
| 24 | Moon craters painted with fixed shadows | **Not an issue** | The date is fixed; the Sun stands at azimuth 88.6–88.9° (east) for the whole mission; documented (PHYSICS §13.12) | None |

## Fixed in this branch

| Commit | What | Test (fails before) |
|---|---|---|
| bab08b8 | Navigation: the bias estimates relax as the biases do (they were held, so after an outage the error was 6× its σ: (err/σ)² 40.7 → 0.64) | tests/navigation.test.ts |
| 1293372 | Apollo 11 flies to the Moon from its own launch only (on another date it logged a lunar orbit insertion 40,000 km from the Moon and never ended) | tests/apollo-own-launch.test.ts |
| 635c5b4 | Six-DOF control surfaces rest below 10 Pa of effective dynamic pressure (Starship's flaps sat at ±34° for the whole coast) | tests/recovery-return.test.ts, tests/ship-descent.test.ts |
| aa88406 | Plumes follow the recorded throttle (solid strap-ons, six-DOF returns); a landed stage is not lit | tests/plume-throttle.test.ts |
| f47c4f2 | One atmosphere at the limb under the scattering sky (the old shell kept over the disc only); the gradient sky's colour no longer encoded to sRGB into the linear target (space was (95,104,128) for (10,14,27)) | tests/render-atmo-shell.test.ts |
| d8fe18f | The shader notes of scene.ts out of the GLSL strings: index chunk 2643.7 kB, under its 2645 kB ceiling (2644.6 before the branch); no ceiling raised | bundle budget |
| 2b6cca5, e805cb1, b651c22 | Docs and comments that disagreed with the code (throttle and pressure, the sphere convention, grid fins, entry glow, PEG, navigation figures, return misses) | — |

## For the owner

1. R4.2 (J2, D-51) and R4.5 (WGS-84, D-51): bring forward? Together (J2 alone makes pad gravity worse above ~35° latitude)? Coasts too?
2. Throttle scales the ambient-pressure term (documented now, PHYSICS §4): change, fold into R4.2/R4.5, or keep?
3. IMU turn-on bias: one Gauss–Markov process today; the documented model is a constant plus a wandering part (moves lesson numbers).
4. Build accepts a vacuum-only engine on an air-lit strap-on group (pinned by tests/design-warnings.test.ts): refuse?
5. Apollo 11: should an orbit edit on the flown date also drop the lunar profile? The panel's 13:35:56 window now stays in the parking orbit; widen the one-second rule?
6. Which feature gaps go on the roadmap: grid-fin Mach table, plume drag, GNSS/tracker gating, RCS pulses, the Moon's shadow in the drawing.
7. The bending shader (claim 22): fix it now as a visual change (subdivided barrels, a smooth drawn bend, bent normals and shadow), or leave it with R4.7?
8. The sky change (claim 19) changes every exterior view from orbit; screenshots before and after are with the session's report.
