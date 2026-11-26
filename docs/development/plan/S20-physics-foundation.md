# S20 — ฐานฟิสิกส์ (แทร็ก PF) / Physics foundation

> **Status: draft, proposed 2026-11-26, not yet approved.** Nothing in this section is authorized until the owner answers §9; the answers go into [DECISIONS](../../DECISIONS.md). Written by the session on `claude/tender-tesla-4xh9wa` from the owner's instruction of 2026-11-26 (quoted in §1) and that day's physics audit (§2). Where this text and code or GitHub disagree, code and GitHub are right. Where it and DECISIONS disagree, DECISIONS is right.

## สรุปสำหรับเจ้าของ

**เป้าหมาย (ตามคำสั่งของคุณ 26 พ.ย. 2026):** ปรับฐานฟิสิกส์ของเว็บให้เรียบร้อยก่อนงานอื่น โดยฐานที่ทุกโหมดใช้ร่วมกันต้องถึงระดับ A, ส่วนเสริมอย่างน้อย B, ส่วนที่ติดข้อมูลหรือแก้ไม่ได้จริงอย่างน้อย C, เพิ่มเครื่องมือวิศวกรในโหมด Orbit และตรวจจรวด 4 ตระกูลก่อน (Soyuz, Angara, Falcon 9, Electron)

**วิธีทำ: สร้างฐานใหม่แยก แล้วสลับเข้าใช้งานเป็นชุดเดียว**

1. **เฟส 0 เปิดทาง** — เครื่องมือสร้างค่าอ้างอิงอิสระ, พื้นที่โค้ดใหม่ `src/astro`, แก้เอกสารที่ไม่ตรงโค้ด, และงานที่ทำให้ขนาดแอปมีที่ว่าง (FX-4 ส่วน runner แล้ว EQ-8)
2. **เฟส 1 ฐานใหม่** — มาตราเวลา, กรอบอ้างอิง, รูปทรงโลก WGS-84, สนามโน้มถ่วง, ตำแหน่งดวงอาทิตย์และดวงจันทร์ เขียนเป็นโมดูลแยกที่ยังไม่ถูกเรียกใช้ ตรวจกับค่าอ้างอิงอิสระด้วยเทสต์เล็ก จึงไม่กระทบเว็บจริงและไม่ต้องรันชุดทดสอบหนัก
3. **เฟส 2 สลับเข้าใช้งาน** — สองชุด: ฝั่ง Orbit (ตัวคำนวณวิถีเชิงตัวเลข) และฝั่งปล่อยจรวด (ต่อยอดงานที่คุณสั่งพักไว้เมื่อ 18 ต.ค.: J2, ฐานปล่อยบน WGS-84, กฎแรงขับจากหัวฉีด) ตัวเลขบนเว็บจะเปลี่ยนในเฟสนี้ ผมจะส่งตารางก่อน/หลังให้คุณอนุมัติชุดละครั้ง
4. **เฟส 3 เครื่องมือวิศวกรใน Orbit** — ตามรายการใน §5.4
5. **เฟส 4 จรวด 4 ตระกูล** — ไล่แหล่งข้อมูล แก้ค่าที่ตรวจแล้วว่าผิด ปรับโปรไฟล์โดยเก็บเที่ยวบินส่วนหนึ่งไว้ตรวจ
6. **เฟส 5 ส่วนเสริมที่เหลือ** — ยกส่วนที่ยังต่ำกว่าเกณฑ์ขึ้นถึง B หรือ C

**ใครทำอะไร:** ผมเขียนใบสั่งงาน ตรวจรับ และแก้งานที่ส่งกลับ โมเดลเล็กทำงานกลไก โมเดลกลางทำงานที่ระบุชัดและมีเทสต์อ้างอิงให้แล้ว โมเดลสูงทำงานคำนวณที่ละเอียดอ่อน ผู้ตรวจเป็นคนละตัวกับผู้ทำเสมอ

**การทดสอบแบบประหยัด:** กำหนดค่าอ้างอิงและเกณฑ์ก่อนลงมือ, ใช้กฎอนุรักษ์และกรณีขอบเขตที่รันเป็นมิลลิวินาที, ทำนายก่อนว่าตัวเลขไหนต้องเปลี่ยนเท่าไรแล้ววัดครั้งเดียว, พิสูจน์ว่าเทสต์จับผิดได้ด้วยการจงใจใส่ข้อผิดหนึ่งครั้ง, และรันชุดหนักเพียงครั้งเดียวต่อชุดสลับ (คาดว่าทั้งแทร็กไม่เกิน 4 ครั้ง)

**ผลต่อรุ่นอื่น:** ฐานใหม่มีผลกับจรวดทุกรุ่น รุ่นนอก 4 ตระกูลจะถูกปรับเท่าที่จำเป็นให้บินได้ตามเกณฑ์เดิม ไม่ได้ยกระดับความสมจริงในรอบนี้

**ข้อที่ขอให้คุณตัดสิน** อยู่ใน §9 (4 ข้อ)

---

## 1. Intent

The owner's instruction, verbatim (chat, 2026-11-26; the session did not record the clock time):

> งานแรกที่จะใส่ในแผนก่อนทำส่วนอื่นๆคือการปรับพื้นฟิสิกส์ของตัวเว็บให้เรียบร้อยก่อนครับ
>
> คุณคือผู้สั่งงานและออกแบบworkflownให้โมเดลอื่นๆไปลงมือทำเอง คุณไม่ต้องลงไปทำเอง ให้คุณมอบหมายงานตามระดับความซับซ้อนของงานและความสามารถของโมเดลนั้นๆ เมื่องานนั้นไม่สามารถแก้ได้จริงๆให้โมเดลอื่นๆส่งงานกลับมาให้คุณคุณลงไปดูและแก้ไขแก้ไขเอง
>
> เป้าหมายตัวงานมีเกณฑ์ดังนี้ครับ
>
> * ส่วนที่เป็นพื้นฐานหลักของเว็บและเป็นฐานในส่วนอื่นๆปรับแก้ไขให้อยู่ในระดับ A
> * ส่วนที่เป็นส่วนเสริมพยายามทำให้ในระดับ B เป็นอย่างน้อย
> * ส่วนที่จำเป็นต้องหาข้อมูลเพิ่มเติมและหรือส่วนที่แก้ไม่ได้จริงๆให้พยายามแก้ให้ขึ้นมาอยู่ในระดับ C เป็นอย่างน้อย
> * ในโหมด Orbit ให้เพิ่มเครื่องมือวิศวกรเข้าไปในระดับวิศวกร ตามที่คุณเสนอได้เลย
> * งานในส่วนโหมดปล่อยจรวด ให้ลองเช็ครุ่นหลักๆดังนี้ก่อน Soyuz angara Falcon9 Electron รุ่นอื่นๆยังไม่ต้องแตะ
>
> การตรวจสอบงานไม่จำเป็นต้องรันซ้ำหลายครั้งเพราะว่าจะเปลืองusage ให้ใช้การออกแแบบการทดสอบที่ครอบคลุมและมีประสิทธิภาพในการหาข้อผิดพลาดโดยใช้ทรัพยากรน้อยที่สุด ค่อยๆทำไม่ต้องรีบแต่ถูกต้อง

**Who it is for** (owner, same day): the owner and junior cadets, for their own use; the teaching tools stay held.

**Goals**

- G1. The shared base every mode stands on reaches class A (§2).
- G2. Every add-on model reaches at least B; every model limited by missing public data reaches at least C. Nothing stays at D.
- G3. The Orbit section's Engineer level gains the engineer's tools of §5.4.
- G4. In Launch, four families are checked first: Soyuz-2.1a and 2.1b, Angara-A5, Falcon 9, Electron.
- G5. Verification finds errors with the fewest runs (§7).

**Non-goals in this track:** the ISS mission (R5), teaching tools and ED packages, cockpit and Moon (R6, R8), the speed refactors EQ-9, EQ-10 and EQ-11 other than the constants part named in §5.3, realism work on the launchers outside the four families (the historical ones included).

**Anti-goals** (the work has failed if any of these happens, whatever the tests say):

- Agreement obtained by fitting is reported as validation.
- A bound or tolerance is loosened after a result is seen.
- A tool returns a wrong number without saying so.
- Two physics bases remain in the code after W-L, the last switch. Between W-O and W-L the Orbit tools are on the new base and Launch on the old one; the modes differ today as well, and that interval ends with W-L.
- A failed run is repeated without a diagnosed cause.

## 2. Classes and the audit this starts from

| Class | Meaning | Evidence required |
|---|---|---|
| A | Engineering-analysis grade | First-principles or standard model, published inputs, agreement with an independent reference to about 1 % or to the reference's own tolerance |
| B | Preliminary-design grade | Right physics with moderate simplifications, key quantities within about 1–5 % of an independent reference |
| C | Educational grade | Right phenomena and magnitudes, within about 5–20 %, some effects absent or tuned |
| D | Illustrative | Scripted, heavily fitted or qualitative |

Two rules apply to every class claim. An **independent reference** is data or a tool that shares no code with Orbitlab and was not used to set the model's inputs. Agreement with a flight the model was fitted to counts for nothing; a fitted model is C at most unless a held-out check supports more.

The audit of 2026-11-26 read `docs/PHYSICS.md`, `docs/VALIDATION.md` and the code. It found class A only where a standard has a reference test set (the six-DOF integration, the standard atmosphere to 86 km, SGP4, pass geometry, collision probability from a conjunction message, eclipse geometry). Most of the rest is C, and nine items are D. Its tables are the baseline of §4. It also found that the modes do not share one base:

- Launch places its sites and measures air height on a sphere, while passes, the propagator's density and the Vostok descent use WGS-84 (`src/physics/geodesy.ts`). The difference is about 0.19° or 21 km at Baikonur.
- The point-mass model has no J2 under thrust, about 8 m/s per 500 s.
- The atmosphere above 86 km is one model in Launch and another in the lifetime tools.
- The Sun's position comes from four separate models.

## 3. Approaches considered

1. **Fix in place, one pull request per item** (the order R4.5 and R4.2 were written in). Every change under `src/physics/**` or `src/data/**` selects all 368 unit files, all 34 heavy files and all 6 six-DOF fleet files (`node scripts/verification/select-checks.mjs --files src/physics/gravity.ts`). About twenty such changes would need about twenty heavy and fleet runs, and results would drift one pull request at a time, which S14 §14.6 forbids ("one validated re-baseline").
2. **A new base beside the old one, validated in isolation, then switched in by two batched re-baselines.** New modules live in a new source area with its own change-map rule, so their tests are small and the heavy suites are not selected while nothing calls them. D-64's content hash is untouched until the switch, so the last green heavy and fleet runs keep standing for main. Each switch is one pre-registered re-baseline with one heavy and fleet run, and the same pull request widens the rules (§5.3, "Rules after a switch").
3. **Rewrite the simulator on a new core.** It would discard the behaviour that about 10,900 unit tests pin and is not needed: the audit found no error in the equations of motion.

**Chosen: 2.** It is the cheapest to verify, it keeps the live site unchanged until a result is proven, and it reuses the parked re-baseline branch for the Launch side.

## 4. Targets by model

"Now" is the audit's class. Tier 1 is the shared base (target A), tier 2 the add-ons (target B or better), tier 3 the models limited by missing public data (target C or better). Rows marked "other track" are out of scope here.

### Tier 1 — shared base, target A

| Model | Now | Gap | Package |
|---|---|---|---|
| Time scales | UTC only; UT1 for the Earth's rotation in Orbit | No TAI, TT or TDB | PF-10 |
| Reference frames | One inertial frame, TEME taken as inertial | No J2000/GCRF, no precession or nutation | PF-11 |
| Earth shape and rotation | Sphere in Launch, WGS-84 in passes | One ellipsoid everywhere | PF-12, W-L |
| Gravity | J2; zonals to J4 in the propagator; none under thrust in point mass | J2 in every path, a spherical-harmonic field for the propagator | PF-13, W-O, W-L |
| Sun and Moon | Four separate models; the propagator's is 0.45° from the of-date frame | One series in a stated frame, used everywhere | PF-14, W-O, W-L |
| Atmosphere | US Standard 1976 to 86 km (A); two models above | One model for every long-term answer | W-L (M-PHYSICS-022) |
| Integrators, Kepler propagation | RK4 and Dormand–Prince; crude fallback for e ≥ 1; no step test in point mass | Universal-variable solution, convergence tests | PF-15 |
| SGP4/SDP4 | A | Keep; add TEME to J2000 | PF-11 |
| Numerical propagator | C, never checked at state level | Force model on the new base, checked state by state | PF-16, W-O |
| Thrust law | Exact at full throttle, 14–19 % high when throttled in air | Nozzle law under throttle | W-L (M-PHYSICS-081) |
| Equations of motion | Six-DOF A; point mass B | J2 and a step-convergence test in point mass | W-L (M-PHYSICS-023) |

### Tier 2 — add-ons, target B or better

| Model | Now | Package |
|---|---|---|
| Orbit playground, repeat and sun-synchronous solvers | B | OE-9 (second-order J2) |
| Maneuver planner | B, ideal impulses, Lambert under one revolution | OE-4, OE-5 |
| Lifetime | C, 16 % short on average | W-O, then OE-9; stays C if the bias remains (tier 3) |
| Standard ascent guidance, four families | C, tuned per vehicle | LV-3 |
| Propulsion and stage data, four families | C | LV-1, LV-2 |
| PEG and IGM, navigation | B | keep |
| Budget, optimal staging | B | keep |
| Payload rating, launcher sizing | C | Phase 5 |
| Satellite designer | A to C | Phase 5 for the C rows |
| Booster recovery (Falcon 9), crew escape (Soyuz) | C | Phase 5 |
| Flight to the station | C and D | other track (R5) |

### Tier 3 — limited by public data, target C or better

| Model | Now | Package |
|---|---|---|
| Wind | D, invented scenarios | Phase 5 (M-PHYSICS-025, a sourced climatological profile) |
| Failures and break-up | D | Phase 5 |
| Position uncertainty from element-set age; collision probability from element sets | D | OE-7 (covariance) |
| Monte Carlo as vehicle statistics | D | Phase 5 |
| Six-DOF for a rocket of one's own; five satellite class templates | D | Phase 5 |
| Six-DOF aerodynamics, mass properties, flexible modes | C | keep, with the estimate labelled |
| Re-entry prediction | C | keep; a 20 % window is the state of the art |
| The other seventeen launchers | C or D | untouched beyond §6's rule |

## 5. Packages

Levels: L1 mechanical, L2 specified implementation, L3 delicate numerics or cross-cutting change (§8). Sizes are counts of pull requests, estimated by the author and not yet broken down.

### 5.1 Phase 0 — groundwork

| Id | What | Level |
|---|---|---|
| PF-01 | Oracle toolchain: `tests/fixtures/astro/<domain>/make_*.py` beside each fixture, as `tests/fixtures/passes/` does it; a pinned requirements file for a Python virtual environment (pyerfa 2.0.1.5, astropy 8.0.3, Skyfield 1.55, sgp4 2.27, jplephem 2.24, JPL DE421); each JSON fixture names its generator, versions and kernel hash. Installing these and downloading DE421 worked on this machine on 2026-11-26; Orekit installed but was not run | L2 |
| PF-02 | New source area `src/astro/` in two folders, `base/` (time, frames, geodesy, gravity, Sun and Moon) and `propagate/` (the numerical propagator, from W-O on): added to `CORE_DIRS` in `tests/architecture.test.ts`; a change-map rule `astro` selecting only `tests/astro-*.test.ts` plus typecheck, build and budget. Nothing in `src/astro` holds global state: Earth-orientation data and options come in as arguments | L1 |
| PF-03 | Documents brought to the code: the mismatches the audit listed (about twelve), Markdown only | L1 |
| PF-04 | Two suspected silent wrong answers, diagnosed first: the station transfer that falls back to its first guess (`src/physics/sim/rendezvous.ts:266`) and the Lambert plan solved two-body but flown with J2. Each ends as a failing test and a fix, or as a recorded "not reachable" | L3 |
| T-1 | Size headroom: FX-4's shared runner, then EQ-8 (workers as ES modules sharing the physics chunk; the plan's estimate is −2.75 MB of 15.2 MB). Without it physics code is paid about seven times in the precache: on the parked branch about 10 kB of nozzle code added 69.1 kB. Identical output, with its own heavy and fleet run | L3 |
| T-2 | EQ-6's loader, which closes the i18n window; needed before Phase 3 adds interface text | L3 |

### 5.2 Phase 1 — the new base, not yet wired in

Bounds are frozen here, before any run. A bound that cannot be met stops the package (§8, sending work back); it is not loosened. "Supersedes" names what exists on main today and is deleted when its last caller has switched.

| Id | What | Acceptance | Reference | Supersedes | Level |
|---|---|---|---|---|---|
| PF-10 | Time scales: UTC, TAI, TT, TDB by the two-term series, and UT1 from the Earth-orientation data the app already loads (`public/data/earth-orientation.json`, 2019 onward) | UTC↔TAI↔TT exact at every leap second since 1972; TDB − TT within 50 µs over 1960–2060; UT1 equal to the data at its nodes; round trips within 1 µs. Outside the data's span UT1 = UTC and the pole is zero, as today, and the result carries a flag: the Earth's angle is then good to 0.9 s of time, about 420 m on the ground | ERFA `dat`, `dtdb`, 200 epochs | — | L2 |
| PF-11 | Frames: J2000 ↔ mean of date ↔ true of date ↔ pseudo Earth-fixed ↔ ITRF by IAU-1976 precession, IAU-1980 nutation, GMST-82 with the equation of the equinoxes, polar motion; TEME ↔ J2000; topocentric; radial/along/cross and LVLH | Rotation matrices within 1e-11 of ERFA at 24 epochs 1990–2040; Vallado's worked reduction to its printed digits; TEME→J2000 within 1 m at 7,000 km of Skyfield, with the frame bias stated; round trips within 1e-9 m | ERFA `pmat76`, `nut80`, `gmst82`, `eqeq94`; Vallado; Skyfield | `earthAngle` and `temeToItrf` in `src/orbit/earth-orientation.ts`; `gmst` in `src/physics/orbital.ts`. SGP4's own `gstime` stays | L3 |
| PF-12 | Geodesy on WGS-84: geodetic ↔ Earth-fixed, the plumb line, normal gravity | Within 1e-6 m and 1e-11 rad over 200 low-discrepancy points from −10 km to 40,000 km, poles and equator included | ERFA `gd2gc`, `gc2gd`; Somigliana's formula | `src/physics/geodesy.ts`; the spherical site and height code in `src/physics/orbital.ts` | L2 |
| PF-13 | Gravity field: fully normalized spherical harmonics, degree and order 20 in the code; a larger set, if a tool needs one, is a data file under `public/data/` fetched on demand | Acceleration within 1e-10 relative at 16 points from 300 km to 36,000 km; J2-only term equal to `gravityJ2` within 1e-13 relative; the potential satisfies Laplace's equation numerically; coefficient checksum equal to the source's | An independent evaluation in Python by a different recursion, from the published coefficients | The zonal terms in `src/physics/propagator/forces.ts`. `src/physics/gravity.ts` is replaced at W-L | L3 |
| PF-14 | Sun and Moon in J2000 on TT: the shortest series that meets the bounds | Sun within 0.01° and 0.1 % in distance (S14 §14.1.1's bounds); Moon within 0.01° and 0.05 % in distance; 400 epochs 1950–2050 | Skyfield with JPL DE421 | `src/physics/ephemeris-series.ts`; `sunDirectionEci` in `src/physics/orbital.ts`; the series fallback in `src/physics/lunar/ephemeris.ts`. The mean Sun of `src/orbit/kepler.ts` stays as a named convention; the DE441 table of the Apollo week stays | L3 |
| PF-15 | Kepler propagation by universal variables for e ≥ 1, replacing only that fallback (M-PHYSICS-026): today's elliptic code path is kept unchanged. Order and convergence tests for RK4, Dormand–Prince and the point-mass step schedule | Hyperbolic and near-parabolic cases within 1 m of a 50-digit solution over hours; elliptic results bit-identical to today's; RK4 error ratio 15–17 when the step halves | mpmath | The e ≥ 1 branch of `propagateKepler` | L2 |
| PF-16 | Reference trajectories for the numerical propagator: six orbits (station orbit, sun-synchronous, GPS, geostationary, transfer, Molniya), one to three days, force model built up term by term | The error budget and the bounds per orbit and per term are written into the package report before the reference is opened | Orekit if it runs here; otherwise an independent Python integrator on ERFA, DE421 and the published coefficients, anchored by one real orbit arc | — | L3 |

**Size rule for the new base.** Target: no more than 40 kB minified added to the flight core and 60 kB to the Orbit workers, measured in the switching pull request. A table larger than 30 kB is a data file fetched on demand, outside the precache-code ceiling. If the measured size passes the target, or T-1 frees less than the switch needs, the switch waits and the owner is asked with the numbers (D-38).

### 5.3 Phase 2 — switching in, two re-baselines

Both follow the re-baseline protocol of S14 §14.6, restated in Appendix A because S14 is still a draft on the plan branch (`c2af8ae`) and not on main: pre-registration (base commit, reference and its hash, bounds, lists of what must move and what must not), one evidence set, before-and-after in both flight models, a held-out run made once, misses pinned by name, a re-record table for the owner.

| Id | What | Carries |
|---|---|---|
| W-O | Orbit side. The numerical propagator moves into `src/astro` onto PF-10 to PF-14, so later work on it no longer selects the flight suites; one value each for the Moon's GM and the solar constant (D-41); the Orbit section's readouts become geodetic. Must not move: every flight fingerprint, the Apollo run, passes, eclipses. Anything that would move a flight belongs to W-L | R4.5's propagator items (M-PHYSICS-020), plus the new base |
| W-L | Launch side. Resumes the parked re-baseline (R4.2-RB) and moves every Launch seam onto the new base in the same batch: J2 in point-mass ascent and coasts, the pad and air heights on WGS-84, guidance in the geodetic frame, the nozzle thrust law, published exit areas, sidereal time and the Sun's direction from PF-11 and PF-14, one LTAN convention (M-PHYSICS-028), long-term answers on the lifetime model (M-PHYSICS-022), the close-out. Every fingerprint is re-recorded once | M-PHYSICS-022, -023, -024, -028, -081 to -083, -085, the datum part of -084; the two commits of `claude/pd-r41-s1` |

The owner's earlier answers that W-L rests on are in DECISIONS, "Decided 2026-10-16 and 2026-10-17" and "Decided 2026-10-18": J2 and WGS-84 "ทำพร้อมกัน" (`docs/DECISIONS.md:239`); coasts too, "ใส่เข้าไปด้วยเอาให้สมจริงที่สุด" (`:250`); the thrust law with flow separation, "ข" (`:251`).

M-PHYSICS-084 is split. Its datum part stays in W-L: the historical flights' checks were measured against a sphere and have to be measured on WGS-84. Its re-derivation of historical vehicles' loads and cut-offs from sources is realism work on launchers outside the four families and waits with them.

The constants part of EQ-10 (M-PHYSICS-015: one definition per constant, bit-identical, with a literal guard) goes first inside each batch, as the plan's fold rule requires. Today power sizing uses a solar constant of 1361 W/m² (`src/orbit/power.ts:59`) while the propagator's radiation pressure, 4.56e-6 N/m² (`src/physics/propagator/forces.ts:33`), corresponds to 1367; the station's height has two values (418 and 420 km).

**Rules after a switch.** The narrow `astro` rule holds only while nothing calls the area. The pull request that switches a caller widens it in the same diff:

- W-O: `src/astro/propagate/**` and the `base/` files it uses select the Orbit checks (the `orbit` rule's unit files and its three heavy files).
- W-L: every `src/astro/base/**` file the flight simulation imports selects what `physics-shared` selects, and `src/astro` joins the list of trees whose content hash D-64 compares. This makes D-64 stricter, never looser.

**Where W-L stands** (branch `claude/charming-archimedes-01p1h5-wip-rebaseline-snapshot`, head `5d942b45`, 30 commits on `0a7e69f6`; main has moved 82 commits since; read 2026-11-26):

- Done there: the nozzle law at every thrust site (`src/physics/nozzle.ts`, `src/data/nozzles.ts`, `tests/nozzle-law.test.ts`), the pad and air heights on WGS-84, J2 in point-mass ascent and coasts. 84 files, +3,910/−736.
- Recorded there, not re-recorded: old and new values for the 27 point-mass fleet hashes, the 21 six-DOF hashes, the flexible-vehicle goldens, the Apollo reference, `flights.json`, the re-check fixtures and the lesson packs. 81 default-suite files and 29 heavy tests fail on the branch, by design, until the re-record.
- Not done: guidance in the geodetic frame (M-PHYSICS-082, the owner's answer "10.ข"), the published exit areas (-083), the historical vehicles (-084), the close-out (-085), the Monte Carlo heavy files.
- Against today's main: seven files conflict (`src/physics/frame.ts`, `src/physics/sim/debris.ts`, `src/i18n/th.ts`, DECISIONS and three plan tables). The documents and plan tables are redone on main instead of merged.
- Its own geodesy additions are replaced by PF-12, so one geodesy module remains.

**Pinned values a re-baseline has to re-record, each by name:** the point-mass fleet hashes (`tests/d01-fleet-fingerprint.test.ts`), the six-DOF hashes (`tests/heavy/sixdof-fingerprint.test.ts`), the flexible goldens (`tests/flex-golden-harness.ts`), the bitwise references under `tests/eo-phy-6/ref/`, `src/lessons/assessment/flights.json`, `tests/fixtures/recheck/`, the five lesson packs, and the recorded validation rows. Most of what moves is bounds on recorded values, not hashes.

### 5.4 Phase 3 — engineer's tools in Orbit (Engineer level)

| Id | Tool | From the plan |
|---|---|---|
| OE-1 | Numerical propagation the user can run: force model and tolerance chosen, state history out, set beside Kepler and SGP4 | M-ORBIT-022 |
| OE-2 | Frames and time: states shown and converted between J2000, TEME, ITRF and geodetic; UTC, UT1, TT | new |
| OE-3 | Export and import: CCSDS OEM and OPM, CSV with inputs and sources | M-ORBIT-009, extended |
| OE-4 | Finite burns and targeting by differential correction; the Lambert plan corrected for J2 | M-ORBIT-021 |
| OE-5 | Lambert: several revolutions, retrograde, the 48 unresolved boundary cases, a target out of plane | M-ORBIT-020 |
| OE-6 | Relative motion: Clohessy–Wiltshire and its eccentric form, radial/along/cross plots | new |
| OE-7 | Covariance propagation by the state transition matrix; uncertainty of one object, not of its class | new |
| OE-8 | Orbit determination: batch least squares from observations or an ephemeris, with drag and radiation coefficients | new |
| OE-9 | Second-order J2 and J4 in the repeat and sun-synchronous solvers; lifetime and re-entry re-run on the new base under their original criteria | M-ORBIT-019, -023 |

Acceptance for M-ORBIT-019 to -023 is S14's, unchanged. Each new tool gets its bounds in its brief before work starts, each against an independent reference.

### 5.5 Phase 4 — four launcher families

| Id | What |
|---|---|
| LV-1 | Source ledger for Soyuz-2.1a, Soyuz-2.1b, Angara-A5, Falcon 9 and Electron: every number with its source or an estimate flag (R4.1, M-PHYSICS-040, for these families only) |
| LV-2 | The sourced corrections the audit of 2026-10-01 accepted and that were never applied (Falcon 9 second-stage masses and ignition delay; Electron engine thrust, kick-stage and fairing masses, separation times), and Soyuz-2.1b's first comparison with a flight (M-PHYSICS-049) |
| LV-3 | Flight profiles by `docs/FLIGHT-PROFILE-METHOD.md`: fitted on some flights, checked once on held-out flights, both flight models. Class B needs held-out rows within 5 %; where no second source exists the row is labelled and stays C |
| LV-4 | Angara-A5 without its upper stage as a reference configuration (M-PHYSICS-048) |

Phase 4 starts after W-L, so nothing is tuned twice.

### 5.6 Phase 5 — the remaining add-ons

Listed in §4. Planned at the gate after Phase 3, from what the first phases teach.

## 6. Order, gates and the rule for the other launchers

Phase 0 and Phase 1 run together. T-1 must land before W-O or W-L merges. W-O and W-L may be prepared together; each merges on its own pre-registration, W-O first. Phase 3 needs W-O and T-2. Phase 4 needs W-L.

A gate closes each phase: the author reports to the owner what changed on the site, each model's class with its evidence, what was not reached and why, and the decisions waiting. The next phase is planned in detail at that gate.

**The launchers outside the four families.** The new base changes every flight. Such a launcher is adjusted only as far as needed to meet the acceptance rows it meets today; a row it can no longer meet is pinned by name as a known miss and reported at the gate. No realism work is done on it in this track.

## 7. Verification design

1. **Reference first.** For each package the reference values and the bounds exist, committed, before the implementation is written. The generator script sits beside the fixture. An implementer never edits a fixture.
2. **Invariants before cases.** Conservation of energy and angular momentum where the scenario conserves them, symmetry and round trips, limits (a field with only J2 equals the closed form; zero drag equals the vacuum result), convergence order. Each runs in milliseconds and catches a class of error.
3. **Coverage by design, not by volume.** Inputs come from a seeded low-discrepancy sequence over the stated domain, with the boundaries added by hand (poles, equator, e = 0 and 1, a leap second, the date line).
4. **Cross-checks between the app's own paths.** The numerical propagator against the secular J2 rates and against SGP4's mean motion; point mass against six-DOF at zero angle of attack; Launch's and Orbit's density at the same state. These find one mode disagreeing with another, which is what the audit found.
5. **Predict, then measure once.** Before a re-baseline run, the report states which numbers will move and by about how much, and which must not move at all. One run follows. An unpredicted change stops the batch.
6. **One sabotage per reference test.** When a test is written, its author breaks the implementation once on purpose (a sign, a 1 % factor) and records that the test fails. This shows the test can catch an error without running it many times.
7. **Runs are budgeted.** While developing, an implementer runs only its package's test files. Before hand-off it runs the checks `select-checks.mjs` names for its changed files, once. The reviewer runs the acceptance test once and the sabotage once. CI runs once per pull request. Heavy and fleet run four times in the whole track: T-1, W-O, W-L and Phase 4. Inside a batch, the cheap sharp checks come first (the point-mass fleet hashes in the default suite, the six-DOF hash file run alone), so the full run is made only on a batch already believed correct. A failure is diagnosed before anything is run again.

Measured on this machine, 2026-11-26: typecheck 3 s, four physics test files 9 s, one eighth of the default suite 152 s, so about 20 minutes for all of it. The fleet suite is documented as about two hours on four cores.

Local runs are early feedback (this machine has Node 22.23.5; the reference is 22.23.3). CI and the dispatched heavy and fleet runs are the evidence.

## 8. Who does what

| Level | Model | Work |
|---|---|---|
| L1 | the small model tier | Fully specified mechanical work: document corrections, rules and plumbing, probes |
| L2 | the middle tier | Implementation to a brief with reference tests supplied; test authoring; exporters; interface wiring |
| L3 | the large tier | Delicate numerics, cross-cutting changes, reference trajectories, the re-baselines, review of physics |
| L4 | the orchestrating session | Briefs, gates, integration, anything sent back |

**One package, one pass through four roles.**

1. *Reference author* writes the fixture generator, the fixture and the failing acceptance test from the brief. It does not see the implementation.
2. *Implementer* makes the test pass inside the files the brief allows, runs the selected checks once, and writes the report (`docs/development/reports/<package>.md`) and the change fragment.
3. *Reviewer*, a different model instance that wrote neither, checks the diff against the brief, re-derives three to five expected values from the reference and not from the code, runs the acceptance test and one sabotage, and returns pass, a fix list, or "send back". One further look at the fixes is allowed, no more.
4. *The orchestrating session* reads the three outputs, checks scope, size and bounds, and integrates.

**Sending work back.** An implementer or reviewer stops and returns the package when any of these holds: the acceptance test still fails after two attempts that each had a diagnosed cause; the reference itself is suspected; a file outside the brief is needed; a value on a must-not-move list moves; a bound would have to be loosened. The return states what was tried, the numbers seen, and the suspected causes in order. The orchestrating session then works on it directly.

Physics, storage and data changes keep D-25's second reviewer; a re-baseline batch gets two reviewers. A pull request stays near 400 changed source lines, or carries a written reason the reviewer accepts (a coefficient table is such a reason).

## 9. Decisions for the owner

The detailed plan is written on the proposed answers. What a different answer changes is named with each.

1. **The plan and its order** (§5, §6), which replace "plan work only until GK2" (2026-11-25). GK2's date and scope are set again at the first gate.
2. **How the work is merged.** Proposed: one branch and one pull request per package, named as SESSION-PROTOCOL §5 says; the orchestrating session merges when CI is green, the reviewer has passed it and the gate check is done; the owner gets one summary per phase. Still the owner's each time: a re-record table, a size ceiling, anything that changes the look or the wording, a change of scope. Records are folded once per phase. *If the owner keeps a button per pull request, each package waits for it and the phases take longer; nothing else changes.*
3. **The independent science review (D-55).** D-55 asks for a named person and a second agent; no person has been named. It bears on the re-baselines, not on every package. Proposed for this track: the second agent and the orchestrating session review each package, and the owner signs each re-baseline (W-O, W-L, Phase 4) from a one-page before-and-after table. *If a named person is required, each re-baseline waits for that person; Phase 1 is not affected.*
4. **Size.** Authorize EQ-8 and the rest of FX-4 as this track's groundwork (T-1). Until T-1 lands no ceiling is raised, because the new modules are not yet called by the app. *Without T-1 the switches need ceiling raises of several hundred kilobytes, each the owner's under D-38.*

## 10. Calls made by the author, open to correction

- The frame chain is IAU-1976/1980 (FK5), the one SGP4, TEME and the bundled Earth-orientation data already assume; its accuracy, about a metre in low orbit, is stated in the interface. The IAU-2006 chain is not built.
- NRLMSISE-00 stays. D-10's choice of NRLMSIS 2.1 waits on its licence terms (`docs/VALIDATION.md:2538-2547`), which is the owner's question at the Phase 3 gate.
- The ascent atmosphere stays US Standard 1976, as S14 decided; only long-term answers move to the lifetime model.
- EQ-9, EQ-10 and EQ-11 are not done first, except M-PHYSICS-015. They change speed, not results, and each would cost a heavy and fleet run.
- The old modules that the new base replaces are deleted in the batch that switches their last caller.
- Sputnik's and Vostok's launchers count as outside the four families, although they are ancestors of Soyuz.
- Earth-orientation data is not extended before 2019. Historical flights keep today's behaviour (UT1 = UTC), stated as a limit, since their paths are flown from the pad and do not depend on it.

## Appendix A — the re-baseline protocol (restated from the draft S14 §14.6)

1. **Pre-register** in the package report before any run: the base commit with its green heavy and fleet run; each reference with its hash, generator script and source; the quantities and bounds, taken from the source's uncertainty; which flights are fitted and which are held out, the held-out ones unopened until the fit is frozen; the lists of what is expected to move and what must not; both flight models; the reviewer, who is not the fitter.
2. **One evidence set per commit.** No identical-output physics pull request is open during the window.
3. **Before and after** in both flight models. The cross-engine tolerance (1.4e-12 s, 1.4e-11 m/s) is not relaxed.
4. **The held-out run is made once.** A miss is a finding. Nothing is refitted to pass, and no setting changes after the held-out result is seen.
5. **Remaining misses are pinned by name** with a test. The list may shrink; it grows only with the owner's approval.
6. **The re-record table**: test, case, old value, new value, reason, and the owner's approval with its date and words. No bulk re-record. `rigid-flex-golden` runs whenever the rigid runtime or the target attitude changes.
7. **An independent re-run** of the headline numbers, reported as "confirmed N of M" (§9, item 3).
8. **No loss of speed** bought by a larger step.
9. **Labels and documents** name the model and its known bias; `docs/PHYSICS.md` and `docs/VALIDATION.md` change in the same pull request.

Stop rules: a missed bound means no merge; a value on the must-not-move list that moves stops the batch until the cause is found.
