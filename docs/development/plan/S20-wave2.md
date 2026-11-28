# S20 wave 2 — the rest of the new base, and the groundwork beside it: implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

## สรุปสำหรับเจ้าของ

แผนลงมือชุดที่สองของ S20 ครอบคลุมหกแพ็กเกจที่พร้อมเปิดงาน และหนึ่งแพ็กเกจที่ยังไม่พร้อม:

- **พร้อมเปิดงาน:** PF-13 (สนามโน้มถ่วง EGM2008 ถึงดีกรี 20), PF-14 (ดวงอาทิตย์และดวงจันทร์), PF-15 (Kepler สำหรับ e ≥ 1 และเทสต์ของตัวอินทิเกรต), PF-16 (วิถีอ้างอิงจาก Orekit), PF-03 (แก้เอกสารให้ตรงโค้ด), PF-04 (วินิจฉัยคำตอบผิดเงียบสองจุด) ขอบเขตที่ตรวจได้ก่อนมีโค้ดถูกตรวจล่วงหน้าด้วยเครื่องมืออ้างอิงแล้ว (ที่ตรวจล่วงหน้าไม่ได้มีสามกลุ่ม ระบุไว้ในบรรทัด Status) และยังไม่มีแพ็กเกจใดถูกเปิด
- **ยังไม่พร้อม: T-1 (ลดขนาด)** วัดจริงแล้วพบว่าการตั้ง worker เป็น ES module อย่างเดียวไม่ลดขนาดเลย (15,200.4 kB เทียบ 15,198.5 kB) และ runner ร่วมของ FX-4 ยังไม่มีในโค้ด T-1 จึงต้องมีแผนของตัวเองก่อน (Task 7 บอกว่าต้องตอบอะไร) ถ้าแผนนั้นพบว่าไม่ต้องใช้ runner ของ FX-4 การตัดออกเป็นการเปลี่ยนขอบเขตที่เจ้าของอนุมัติไว้ จึงเป็นของเจ้าของ
- **สิ่งที่พบระหว่างตรวจล่วงหน้า ซึ่งแอปวันนี้เป็นอยู่** (ยังไม่มีการแก้ ทุกข้อไปอยู่ในรายงานที่ประตูหลังเฟส 0 และ 1): เส้นทางวงรีของ `propagateKepler` ผิดมากขึ้นเมื่อ e เข้าใกล้ 1 (29 m ที่ 1 − e = 1e-6, 23 km ที่ 1e-8); ทางสำรองสำหรับ e ≥ 1 ผิด 5.8 km ในสิบนาที; ตารางก้าวเวลาของ point mass ลู่เข้าประมาณอันดับหนึ่ง (ครึ่งก้าวแล้วตำแหน่งที่ T+500 s ขยับ 1.3 km); แผนนัดพบแบบ Lambert ในหน้า Orbit เมื่อเปิด J2 ไปถึงห่างเป้า 15 ถึง 60 km (ยืนยันตัวเลขของ audit ด้วยโค้ดของแอปเอง); ส่วนทางสำรองของการถ่ายโอนไปสถานีไม่ถูกใช้ในเที่ยวบินปกติ 16 เที่ยวที่ลอง
- **การตัดสินใจของผู้เขียนที่เปิดให้แก้:** PF-14 ใช้อนุกรมของ ERFA ทั้งชุดแทน "อนุกรมที่สั้นที่สุด"; PF-15 ตั้งขอบเขตแน่นกว่าแผน (1 mm แทน 1 m) เหตุผลอยู่ใน S20 amendment 14

**Goal:** Finish Phase 1 of plan S20 (the gravity field, the Sun and Moon, Kepler propagation for every conic with the integrator tests, and the reference trajectories) and the two document and diagnosis packages of Phase 0, each held to an independent reference, none of the new modules called by the app yet.

**Architecture:** As wave 1: modules under `src/astro/base/` that import nothing from the rest of `src/` and hold no state, each with a reference fixture written by a committed generator beside it and one test file. The `astro` rule of the change map keeps these packages on their own tests. Tasks 1, 3 and 6 have tests that read today's `src/physics` or `src/orbit` code without editing it; a new test file under `tests/` selects only itself.

**Tech stack:** TypeScript 7 (strict), vitest 5. For fixtures only: the Python environment of `tests/fixtures/astro/requirements.txt`; Task 4 adds Orekit 13.1.9 through `orekit_jpype` and a Java runtime.

**Spec:** [S20-physics-foundation.md](S20-physics-foundation.md) (packages PF-03, PF-04, PF-13 to PF-16, T-1; §7 verification; §8 roles; amendment 14 for what this plan settled).

**Status, 2026-11-27:** No task of this plan has been dispatched. Every bound below that can be checked before an implementation exists was checked, with reference tools only or, where the bound is about today's code, with that code, by the scripts named beside it (`tests/fixtures/astro/evidence/`). Three groups could not be: what a port of ERFA's series leaves against ERFA itself (Task 2, set from the size of one rounding step), the 32 bounds of Task 4's budget (written by a rule fixed here, for a propagator that W-O builds), and the pins of Task 6's Steps 2 and 3 (set from the engineer's own measurement). Three readers with no context then tried the plan, task by task, and what they could not act on was corrected. How a package is run, seat by seat: [HANDOVER-S20](../HANDOVER-S20.md) §4 and Appendix A.

## Global constraints

- The global constraints of [S20-wave1.md](S20-wave1.md) hold unchanged: the files a task may write (`src/astro/base/`, `tests/astro-*.test.ts`, `tests/fixtures/astro/**`, its report, its fragment), no import from another `src` folder, units (radians, metres, seconds; a vector is `{ x, y, z }`), the non-finite rule, dates in two parts compared part by part, bounds never loosened, fixtures written by generators only, one deliberate break per reference test, and the hand-off runs (`npm run typecheck`; `npx vitest run` on the unit files that `node scripts/verification/select-checks.mjs --files <the task's files>` lists; `npx vite build && node scripts/bundle-budget.mjs`). They are restated here only where a task departs from them.
- Nothing under `src/physics`, `src/orbit` or `src/data` is edited by any task of this plan, comments included: those paths select every heavy and fleet test. The tests of Tasks 1, 3 and 6 import from them, which selects nothing more than the test file itself.
- Tasks 1 and 2 also edit `NOTICE.md`, each for the source it copies from. Tasks 5 and 6 write the files their own lists name instead of the astro paths.
- A task has two deliberate breaks where its list names two, as PF-11 had: the spec's rule is one per reference test, and these tasks hold more than one.
- H_b(i) is the Halton value of index i in base b: write i in base b and mirror its digits about the point (H₂(1) = 0.5, H₂(2) = 0.25, H₂(3) = 0.75, H₃(1) = 1/3). Where a rule names several bases, one index i gives one sample: all its quantities are taken at that same i. The index starts at 1.
- "Within x m" of a vector is the length of the difference, not a bound per component.
- An angle between two vectors is `atan2(|a × b|, a · b)`, and the small rotation between two matrices is half the antisymmetric part of M·Eᵀ. An arccosine of a dot product or of a trace cannot resolve below 1.5e-8 rad, which is 3 milliarcseconds: the pre-check of Task 4 first read 14 mas where the truth was 0.5.
- One task, one branch from `origin/main`, one pull request, each merged before the next is opened: `claude/p-pf13-s1`, `claude/p-pf14-s1`, `claude/p-pf15-s1`, `claude/p-pf16-s1`, `claude/p-pf03-s1`, `claude/p-pf04-s1`. Tasks 1, 2, 3, 5 and 6 depend on nothing in this plan and may run in any order. Task 4 needs Tasks 1, 2 and 3 merged. Task 7 is not dispatched from this plan.
- Roles per task as in wave 1 (spec §8): a reference author who never sees the implementation, an implementer, a reviewer that wrote neither, one fix round, then the orchestrating session's gate with a held-out set of its own. Levels: Tasks 1, 2 and 4 large tier throughout; Task 3 middle tier writes and large tier reviews; Task 5 small tier writes and middle tier reviews; Task 6 large tier.
- Evidence scripts are reference-side code. A reference author may read and reuse them; an implementer does not open them.

## Review focus

Inputs and claims the spec does not spell out. Each is pinned by a test in the task named.

1. A position on the spin axis, at the Earth's centre, or below the surface, given to the gravity field (Task 1).
2. A truncation that the field does not hold: a degree above 20, an order above the degree, a fraction (Task 1).
3. A coefficient that is slightly wrong. At 300 km one coefficient 1 % off moves the acceleration by 4e-10 to 5e-9 of itself, and a smaller slip is invisible to a bound of 1e-10; at 35,786 km the whole twentieth degree is worth 9.5e-23. A checksum against the source holds the table (Task 1).
4. The Sun without the Moon's pull on the Earth. Leaving the Earth at the Earth–Moon barycentre moves the Sun by 0.0039°, inside the 0.01° bound, so the accuracy rows cannot see that term; the rows against ERFA can (Task 2).
5. An orbit at, just below and just above e = 1, a time step of zero, a negative one, and a very long one (Task 3).
6. What today's elliptic path returns near e = 1 (Task 3 records it; it is not changed).
7. A reference whose own numbers are noisy: every trajectory of Task 4 carries the difference between two integration tolerances, and a budget row whose bound is within a hundred times of it is marked as not usable.
8. NaN or infinite input: NaN in every number returned, nothing throws (Tasks 1, 2, 3).

---

### Task 1: the gravity field (PF-13)

**The model, settled here** (the spec said "the published coefficients"): EGM2008, tide-free, truncated at degree and order 20, with the model's own constants GM = 3.986004415e14 m³/s² and reference radius 6,378,136.3 m. These are not the app's `MU_EARTH` (3.986004418e14) and `R_EARTH` (6,378,137): a field is evaluated with the pair it was fitted with. The source is the ICGEM file `EGM2008.gfc` (<https://icgem.gfz.de>, static models, EGM2008; header: `earth_gravity_constant 0.3986004415E+15`, `radius 0.63781363E+07`, `norm fully_normalized`, `tide_system tide_free`; the model is by Pavlis, Holmes, Kenyon and Factor for the U.S. National Geospatial-Intelligence Agency). The excerpt this task commits is every line of that file up to and including `end_of_head`, then every `gfc` line of degree 20 or less, unchanged: 250 lines, 24,845 bytes, SHA-256 `a11a7dcc6fb9760783819655d195e5459522f7b1f96438ff2550754399b18621`. It holds 229 coefficient lines (degree 0, then degrees 2 to 20; the file has no degree-1 line). The first 60 kB of the file are enough: `curl -r 0-60000 -o head.gfc https://icgem.gfz.de/getmodel/gfc/c50128797a9cb62e936337c890e4425f03f0461d7329b09a8cc8561504465340/EGM2008.gfc`; if the address has moved, the hash decides.

**Files:**
- Create: `src/astro/base/gravity.ts`, and `src/astro/base/egm2008-20.ts` for the coefficients
- Create: `tests/astro-gravity.test.ts`
- Create: `tests/fixtures/astro/gravity/EGM2008-to-20.gfc` (the excerpt above), `tests/fixtures/astro/gravity/make_gravity_fixture.py`, `tests/fixtures/astro/gravity/mpmath-gravity.json`
- Modify: `NOTICE.md` (an EGM2008 entry, written by the reference author in the commit that adds the excerpt: the two places the model is published, ICGEM's page for it and the agency's own page that the file's header names; the files that hold the copy; and the terms as those two pages state them. If either states a restriction on redistribution, the reference author stops and reports. The implementer adds the names of the two source modules to the entry)

**Interfaces:**
- Consumes: `V3` from `./geodesy`.
- Produces:

```ts
// gravity.ts declares the type and the three functions; egm2008-20.ts imports the type (type only) and exports the table.
// The test imports EGM2008_20 from '../src/astro/base/egm2008-20'; gravity.ts does not re-export it.
export interface GravityField {
  readonly gm: number;        // m³/s²
  readonly radius: number;    // m, the model's reference radius
  readonly degree: number;    // the largest degree held
  /** Fully normalized, at index n(n+1)/2 + m for 0 ≤ m ≤ n ≤ degree. c[0] = 1; s is 0 wherever m = 0. */
  readonly c: readonly number[];
  readonly s: readonly number[];
}
export const EGM2008_20: GravityField;                                   // in egm2008-20.ts
/** A field of zonal terms only: j[0] is J2, j[1] is J3, and so on. C̄(n,0) = −Jn / √(2n + 1). */
export function zonalField(gm: number, radius: number, j: readonly number[]): GravityField;
/** m/s², in the Earth-fixed frame r is given in. */
export function fieldAcceleration(f: GravityField, r: V3, degree?: number, order?: number): V3;
/** m²/s², positive: GM/r·(1 + …). The acceleration is its gradient. */
export function fieldPotential(f: GravityField, r: V3, degree?: number, order?: number): number;
```

**Behaviour the signatures do not settle:**
- `r` is Earth-fixed (ITRF) and so is the result; the module knows nothing of time or frames. A caller turns the result to an inertial frame with PF-11's matrices.
- `degree` defaults to `f.degree` and `order` to `degree`. The sum runs over n from 2 to `degree` and m from 0 to min(n, `order`), on top of the central term. Degrees 0 and 1 give the central term alone. `degree` above `f.degree`, `order` above `degree`, a negative or a fractional value of either: NaN in every number returned.
- The numbers of `egm2008-20.ts` are the source's digits with `d` exponents written as `e`. Entries of degree 1 are 0. C̄(2,1) and S̄(2,1) are the source's, not zero. The tide system is the source's; no permanent tide is added (the zero-tide C̄(2,0) differs by 4.2e-9, a choice for the pull request that first calls this module).
- The recursion works in Cartesian coordinates (Cunningham's V and W, or Pines'), so that the spin axis is an ordinary point. A gradient taken in spherical coordinates divides by cos φ and cannot stand on the axis; it is the reference's route, at 40 digits and a hair off the axis.
- At r = 0 every number returned is NaN. Below the reference sphere the series is still summed and finite; nothing checks the height.
- The field object is trusted. `zonalField` is plain construction and checks nothing, and the two evaluating functions do not inspect a field's numbers: the non-finite rule covers `r`, `degree` and `order`. This is the task's one named exception to that rule.

- [ ] **Step 1 (reference author): the excerpt, the generator, the fixture.** Fetch the head of the source file, cut the excerpt by the rule above, check its SHA-256, commit it. `make_gravity_fixture.py` reads the excerpt and writes `mpmath-gravity.json` with mpmath at 40 digits by fully normalized associated Legendre functions and the gradient in spherical coordinates (`accel_reference` and `potential_reference` of `tests/fixtures/astro/evidence/pf13_gravity_precheck.py` are that route, with the cut in degree and in order as arguments, and may be reused):
  - `source`: the excerpt's file name and SHA-256, `gm`, `radius`, the tide system.
  - `table`: the count of entries (231), and two checksums in doubles, `sumC` = Σ n·(m + 1)·C̄(n,m) and `sumS` the same over S̄, taken for n from 2 to 20 and, inside each n, m from 0 to n, in that order: a running sum from 0, each term formed as `(n * (m + 1)) * c`, the integer product first, so that Python and JavaScript round alike.
  - `points` (16): ten from the Halton sequence, index i from 1, `lat = asin(2·H₂(i) − 1)`, `lon = π(2·H₃(i) − 1)`, `h = 300e3 + 35.7e6·H₅(i)²`, placed at distance `radius + h` from the centre in the direction (lat, lon) taken as geocentric; then six by hand as (lat, lon, h): (89.99°, 0.3 rad, 300e3), (−89.99°, 2.0 rad, 800e3), (0°, −14.7°, 35,786e3), (51.6°, 100°, 420e3), (−30°, −170°, 300e3), (10°, 45°, 1,000e3). Each with the position, the acceleration and the potential at full degree and order.
  - `axis` (2): the points (0, 0, ±(radius + 500e3)), stored exactly so; the reference is evaluated 1e-12 rad off the axis, at azimuth 0.7 rad, which moves the true acceleration by 1.0e-12 of itself.
  - `cuts`: at four low points, (0.3, 0.5, 300e3), (−1.1, 2.5, 300e3), (0.9, −2.0, 350e3), (−0.2, −0.6, 400e3) in radians and metres, the acceleration for each `degree` n from 2 to 20 with `order` n, and for (`degree`, `order`) = (20, 0), (20, 5), (8, 3).
  - Floats are written with 17 significant digits.

- [ ] **Step 2 (reference author): the failing test**, `tests/astro-gravity.test.ts`. "Relative" is |Δa| / |a| for a vector and |ΔU / U| for the potential.

| Case | Assertion |
|---|---|
| `the table is the source's` | `EGM2008_20.gm`, `.radius`, `.degree` `toBe` 3.986004415e14, 6378136.3, 20; `c` and `s` have 231 entries; `c[0]` is 1; the entries of degree 1 are 0 in both; `s` is 0 at every m = 0; the two checksums, summed in the fixture's order, `toBe` the fixture's |
| `acceleration equals the 40-digit evaluation` | relative ≤ 1e-10 at the 16 points |
| `potential equals the 40-digit evaluation` | relative ≤ 1e-12 at the 16 points |
| `on the spin axis` | at the two axis points: three finite numbers, relative ≤ 1e-10 against the fixture |
| `each degree, and a cut in order` | relative ≤ 1e-10 for every entry of `cuts` |
| `the acceleration is the gradient of the potential and has no divergence` | at the 16 points, with fourth-order central differences of step 1,000 m, `(−f(x + 2h) + 8f(x + h) − 8f(x − h) + f(x − 2h)) / 12h`: the gradient of `fieldPotential` is within 1e-9 relative of `fieldAcceleration`, and the divergence of `fieldAcceleration` is at most 1e-9·GM/r³ in size |
| `J2 alone equals the app's closed form` | at 2,000 Halton points (direction as above from H₂ and H₃, distance `R_EARTH + 150e3 + 39.85e6·H₅(i)`), `fieldAcceleration(zonalField(MU_EARTH, R_EARTH, [J2_EARTH]), r)` is within 1e-13 relative of `gravityJ2(r)` of `src/physics/gravity.ts`, the constants from `src/physics/constants.ts` |
| `J2, J3 and J4 equal the propagator's zonal terms` | at the same 2,000 points, `zonalField(MU_EARTH, R_EARTH, [J2_EARTH, J3_EARTH, J4_EARTH])` is within 1e-13 relative of `gravityAcceleration([x, y, z], true, true)` of `src/physics/propagator/forces.ts`, which also exports the two constants |
| `zonalField` | for `zonalField(MU_EARTH, R_EARTH, [J2_EARTH, J3_EARTH, J4_EARTH])`: `gm` and `radius` are the arguments, `toBe`; `degree` is 4; C̄(2,0), C̄(3,0), C̄(4,0) are −J2/√5, −J3/√7, −J4/3 within 1e-15 relative; every other entry of degree 1 or more is 0; `c[0]` is 1 |
| `truncation` | `degree` 0 and `degree` 1 each give −GM·r/r³ within 1e-15 relative; `degree` 21, `order` above `degree`, −1 and 2.5 for either give NaN in every number |
| `a non-finite input gives NaN in every number returned` | for NaN, +∞ and −∞ in each component of `r` and in `degree` and `order`, for `fieldAcceleration` and `fieldPotential`; and for r = (0, 0, 0) |

  Run it. Expected: it fails because `src/astro/base/gravity.ts` does not exist.

- [ ] **Step 3 (implementer): `egm2008-20.ts` and `gravity.ts`.** The table first, checked by the first case alone; then the acceleration against `points`; then the potential and the cuts.
- [ ] **Step 4 (implementer): run**, then the hand-off runs.
- [ ] **Step 5 (implementer): two deliberate breaks.** Set the field's radius to 6,378,137; flip the sign of every S̄ term in the sum. Record the failing cases; restore.
- [ ] **Step 6 (implementer): report, fragment, NOTICE, commit.** `docs/development/reports/PF-13-gravity.md` gives the measured worst difference per case, the minified size of the two modules, and the written reason if the diff passes 400 lines (the table). `changes/claude-p-pf13-s1.md`. Commit as `Astro (PF-13): the EGM2008 field to degree and order 20, held to a 40-digit evaluation`.

**Pre-checked** (`pf13_gravity_precheck.py`; a Cunningham recursion in doubles against the 40-digit route, on this task's own points): acceleration 1.1e-15 at the 16 points and 9.0e-16 over the cuts, those in order included; potential 9.8e-16; on the axis 1.0e-12, all of it the 1e-12 rad offset; gradient 2.4e-11 and divergence 1.7e-11 at a 1,000 m step (1.4e-10 and 2.4e-10 at 100 m, so the step is not shortened); J2 against `gravityJ2` 5.8e-16; J2 to J4 against the propagator's terms 5.0e-16. The 437 numbers are about 10.5 kB as text, under the 30 kB at which a table becomes a data file.

---

### Task 2: the Sun and the Moon (PF-14)

**The series, settled here** (the spec said "the shortest series that meets the bounds"): ERFA's two, whole. The Moon is `moon98` (Meeus 1998, from ELP2000-82), which returns the geocentric position and velocity on GCRS axes. The Sun comes from `plan94` (Simon et al. 1994) for the Earth–Moon barycentre, with the Earth taken off the barycentre by the Moon of `moon98`. A whole published series can be held to its own reference implementation term by term, to a millimetre; a series cut short for this app could only be held to the 0.01° accuracy bound. The two C files are 24 kB and 22 kB of source, and of `plan94` only the third body's rows are needed (S20 amendment 14).

**Files:**
- Create: `src/astro/base/sun-moon.ts`, and `src/astro/base/sun-moon-tables.ts` for the tables: `MOON98_LR` (the 60 rows of `tlr` in `moon98.c`, six numbers a row), `MOON98_B` (the 60 rows of `tb`, five numbers a row), and `PLAN94_EMB`, an object holding the third entry of `amas` and the third row of each other table of `plan94.c`, under the C names (`amas`, `a`, `dlm`, `e`, `pi`, `dinc`, `omega`, `kp`, `ca`, `sa`, `kq`, `cl`, `sl`)
- Create: `tests/astro-sun-moon.test.ts`
- Create: `tests/fixtures/astro/sun-moon/make_erfa_fixture.py`, `tests/fixtures/astro/sun-moon/erfa-sun-moon.json`
- Create: `tests/fixtures/astro/sun-moon/make_de421_fixture.py`, `tests/fixtures/astro/sun-moon/de421-sun-moon.json`
- Modify: `NOTICE.md` (the ERFA entry names the two new files and every C file they are ported from, listed under "Behaviour" below)

**Interfaces:**
- Consumes: `Jd2` from `./time`; `V3` from `./geodesy`; `State`, `FRAME_BIAS`, `matT`, `matVec` from `./frames` (the last three for `sunState` only).
- Produces:

```ts
export const AU = 149597870700;                       // m
export const EARTH_MOON_MASS_RATIO = 81.30056;        // Earth / Moon
export function moonState(tt: Jd2): State;                 // geocentric, GCRF, m and m/s
export function earthMoonBarycentreState(tt: Jd2): State;  // heliocentric, mean equator and equinox of J2000, m and m/s
export function sunState(tt: Jd2): State;                  // geocentric, GCRF, m and m/s
```

**Behaviour the signatures do not settle:**
- `moonState` = ERFA `moon98`, its astronomical units and days turned to metres and seconds with `AU` and 86,400. `earthMoonBarycentreState` = `plan94` with `np = 3`, turned the same way. Both are ported from the pyerfa 2.0.1.5 sources with every term and with the C code's order of operations, the iteration of Kepler's equation in `plan94.c` included.
- The port goes beyond the two files. `moon98.c` turns its result from the ecliptic of date to GCRS with `s2pv.c`, `pfw06.c` (which calls `obl06.c`), `ir.c`, `rz.c`, `rx.c` and `rxpv.c` (which calls `rxp.c`); `plan94.c` calls `anpm.c`. All of these are ported into `sun-moon.ts` as functions private to it. `frames.ts` has rotations of its own that it does not export, and it is not edited: its obliquity is the IAU 1980 one, not `obl06`.
- `sunState`: with B = `FRAME_BIAS` and μ = `EARTH_MOON_MASS_RATIO`, r = −(Bᵀ·r_emb − r_moon / (1 + μ)), and the same for the velocity.
- The time argument is TT for all three. `plan94` is defined on TDB; TT is within 1.7 ms of it, in which the Earth moves 50 m, and the fixture is formed the same way.
- Positions are geometric: where the body is at the instant, with no light time and no aberration. That is what a force model takes. The direction the Sun is seen in differs by 0.0057° (aberration); nothing in this base applies it.
- `plan94` is fitted to 1000–3000 and ERFA returns a warning status outside; these functions return the same numbers as ERFA there and report nothing.
- Stated accuracy, from the pre-check: over 1950–2050 the Moon is within 0.0051° and 0.0034 % in distance of JPL DE421, the Sun within 0.0022° and 0.0008 %.

- [ ] **Step 1 (reference author): the ERFA fixture.** `make_erfa_fixture.py` writes, at 60 TT instants in two parts, `moon98`, `plan94` for body 3, and the Sun formed from them as above with the `rb` of `erfa.bp00(2451545.0, 0.0)`, all in metres and metres per second. The instants: for i from 1 to 50, `jd = 2415020.5 + 73,049·H₂(i)` (1900 to 2100), stored as `a = floor(jd − 0.5) + 0.5`, `b = jd − a`; then ten by hand: {2451545.0, 0}; {2451545.0, 0.5}; {2400000.5, 51544.5}; and seven calendar instants, each split as `erfa.dtf2d('TT', year, month, day, hour, minute, 0)` returns it: 1950-01-01 0 h; 2050-01-01 0 h; 1969-07-20 20:17; 2026-09-15 12:00; 2024-03-20 12:00; and the years 999 and 3001 on January 1 at 0 h, which are outside the years `plan94` is fitted to (its status is 1 there). No checksum of the tables is needed, because the bounds of Step 3 see nearly every entry (726 of 735 by the review's count; the node's three numbers are held by a case of their own, spec amendment 16): the smallest non-zero coefficients of `moon98.c` are 0.000294° in longitude, 0.000107° in latitude and 1,117 m in distance, each 700 m or more at the Moon, and one unit of a series column of `plan94.c` is 15 km. One number is the exception: `amas`, the mass ratio of the Sun to the Earth–Moon system, enters only the speed, and a change of 1 in it moves the speed by 1.4e-7 m/s, under the bound; the test therefore holds its value directly. The script asserts the three smallest values and `amas` from the C sources when the environment variable `ERFA_SRC` names their folder.

- [ ] **Step 2 (reference author): the DE421 fixture.** `make_de421_fixture.py` loads `de421.bsp` with Skyfield (`load('de421.bsp')` downloads it; 16,788,480 bytes, SHA-256 `a20a7139da04cbc462454634918e9a9ca69127044e2cc9d4f9c16e238d2deedc`, which the script checks and the fixture carries) and writes, at 400 TT instants, `jd = 2433282.5 + 36,525·H₂(i)` for i from 1 to 400 (1950 to 2050), split as above, the geometric geocentric position and velocity of the Moon and of the Sun: `eph[body].at(t).position.m − eph['earth'].at(t).position.m` with `t = ts.tt_jd(jd)`, and the same for `.velocity.m_per_s`. The kernel is not committed.

- [ ] **Step 3 (reference author): the failing test**, `tests/astro-sun-moon.test.ts`:

| Case | Assertion |
|---|---|
| `the Moon equals ERFA` | at the 60 instants and the five added from the review ({2451545.0, 0.1}; {2460000.5, 0.123456789}; {2400000.5, 60310.3371}; {2440423.5, 0.7}; {2469807.5, 0.31415926}; spec amendment 16), position within 1e-3 m and velocity within 1e-8 m/s |
| `the Earth–Moon barycentre equals ERFA` | position within 1e-1 m, velocity within 1e-6 m/s |
| `the Sun equals ERFA's two series combined` | position within 1e-1 m, velocity within 1e-6 m/s. The Moon's term is 4,600 km of this, so a Sun taken from the barycentre alone fails here |
| `the node of the barycentre's orbit is the source's` (added from the review; spec amendment 16) | `PLAN94_EMB.omega` `toEqual` the third row of `omega` in `plan94.c`: 174.87317577, −8679.27034, 15.34191 |
| `the tables have the source's shape` | `MOON98_LR` 60 rows of 6, `MOON98_B` 60 rows of 5; in `PLAN94_EMB`, `amas` `toBe` 328900.5, `a`, `dlm`, `e`, `pi`, `dinc`, `omega` have 3 numbers each, `kp`, `ca`, `sa` have 9, `kq`, `cl`, `sl` have 10 |
| `the Moon against DE421` | at the 400 instants: direction within 0.01°, distance within 0.05 %, velocity within 0.5 m/s |
| `the Sun against DE421` | direction within 0.01°, distance within 0.1 %, velocity within 6 m/s |
| `constants` | `AU` `toBe` 149597870700; `EARTH_MOON_MASS_RATIO` `toBe` 81.30056 |
| `a non-finite input gives NaN in every number returned` | NaN, +∞ and −∞ in each part of the date, for the three functions |

  Run it. Expected: it fails because `src/astro/base/sun-moon.ts` does not exist.

- [ ] **Step 4 (implementer): the tables and `sun-moon.ts`.** The Moon first against its fixture rows, then the barycentre, then the Sun.
- [ ] **Step 5 (implementer): run**, then the hand-off runs.
- [ ] **Step 6 (implementer): two deliberate breaks.** Leave the Moon's term out of `sunState`; drop the factor that carries the Earth's orbital eccentricity in the Moon's terms (the `en` of `moon98.c`). Record the failing cases; restore.
- [ ] **Step 7 (implementer): report, fragment, NOTICE, commit.** `docs/development/reports/PF-14-sun-moon.md`, with the measured worst differences and the minified size. `changes/claude-p-pf14-s1.md`. Commit as `Astro (PF-14): the Sun and the Moon by ERFA's series, held to ERFA and to DE421`.

**Pre-checked** (`pf14_sun_moon_precheck.py`; ERFA itself against DE421): at the fixture's 400 instants the Moon is off by 0.00286°, 0.0024 % and 0.12 m/s, the Sun by 0.00200°, 0.0008 % and 1.92 m/s; over 20,001 instants of the same century 0.00504°, 0.0034 %, 0.17 m/s and 0.00215°, 0.0008 %, 2.10 m/s; from 1900 to 1950, 0.0040° and 0.0022°. The Sun without the Moon's term is 0.0039° off. DE421 ends in 2053. What a port leaves against ERFA itself cannot be measured before one exists; the four bounds of the first three cases stand a thousand times above one rounding step of a sum of this size (4e-8 m at the Moon's distance, 2e-5 m at the Sun's) and far below any term.

---

### Task 3: Kepler propagation for every conic, and the integrator tests (PF-15)

**Files:**
- Create: `src/astro/base/kepler.ts`
- Create: `tests/astro-kepler.test.ts`, and `tests/kepler-elliptic-pin.test.ts` for the pin of today's elliptic path (a file of its own, because it must pass before the new module exists, and a test file whose import is missing does not run any of its cases)
- Create: `tests/fixtures/astro/kepler/make_kepler_fixture.py`, `tests/fixtures/astro/kepler/mpmath-kepler.json`
- Create: `tests/fixtures/astro/kepler/make_elliptic_pin.mjs`, `tests/fixtures/astro/kepler/today-elliptic.json`
- Create: `tests/integrator-convergence.test.ts` (no fixture; it reads `src/physics` and edits nothing there)

**Interfaces:**
- Consumes: `State` from `./frames` (the type only).
- Produces:

```ts
/** The state dt seconds later on the two-body orbit through s, for any conic. mu in m³/s². */
export function keplerUniversal(s: State, dt: number, mu: number): State;
```

**Behaviour the signatures do not settle:**
- One formulation for ellipse, parabola and hyperbola: the universal variable with the Stumpff functions c₂ and c₃, solved by Newton's method inside a bracket (the time is monotonic in the variable), with a fixed cap on iterations, so that it always ends.
- The Stumpff functions must not lose digits near zero. The textbook forms, (1 − cos √ψ)/ψ and (√ψ − sin √ψ)/√ψ³ with a series only below |ψ| = 1e-6, lose six digits just above that switch: up to 5.1e-2 m and 7.4e-7 m/s on a near-parabolic orbit, which fails this task's bounds. A half-angle form for c₂ and the series for both wherever |ψ| < 1 hold 1.0e-5 m (S20 amendment 14).
- `dt = 0` returns the input state, number for number, when the input is valid. `dt` may be negative.
- `mu` has no default: the base holds no Earth constant of its own beside the gravity field's.
- A state with r = 0, or `mu` ≤ 0, or any non-finite input: NaN in every number, whatever `dt` is, zero included. A state with r ∥ v (straight-line motion) is outside the contract; no test reads it.
- The cap on iterations is the implementer's choice and is stated in the report. Every fixture case must converge well inside it, which the bound of the first case shows.
- When the callers switch (W-O), this function replaces only the e ≥ 1 fallback inside `propagateKepler` (`src/physics/orbital.ts`); the elliptic path of that function is kept as it is, which the pin of Step 2 guards.

- [ ] **Step 1 (reference author): the mpmath fixture.** `make_kepler_fixture.py` solves each case at 80 digits by the classical route, which shares nothing with the universal variable: elements from the state; then the hyperbolic anomaly from e·sinh H − H = M, or the eccentric anomaly from E − e·sin E = M, by Newton's method to 1e-60; the state rebuilt in the perifocal frame. Eighty digits because that route loses as many digits as 1 − e has zeros. (`kepler_reference` of `tests/fixtures/astro/evidence/pf15_kepler_precheck.py` is that route and may be reused.) The cases, with μ = 3.986004418e14: every combination of
  - e in {0, 0.001, 0.1, 0.6, 0.9, 0.99, 0.999, 1 − 1e-6, 1 − 1e-9, 1 − 1e-12, 1, 1 + 1e-12, 1 + 1e-9, 1 + 1e-6, 1.001, 1.04, 1.5, 3, 10};
  - perigee radius in {6.578e6, 2.0e7} m;
  - true anomaly at the start in {−2, −0.3, 0, 0.8} rad, leaving out, for e ≥ 1, any within 0.2 rad of the asymptote (|ν| ≥ acos(−1/e) − 0.2);
  - dt in {600, 3600, 21600, 86400, 259200, −3600} s;

  the state built in doubles from p = r_p(1 + e), r = p/(1 + e cos ν), position (r cos ν, r sin ν) and velocity √(μ/p)·(−sin ν, e + cos ν) in the orbit's own plane, x towards the perigee, then placed in space by Ω = 0.4, i = 0.9, ω = 1.1 rad in the usual way: with P = (cos Ω cos ω − sin Ω sin ω cos i, sin Ω cos ω + cos Ω sin ω cos i, sin ω sin i) and Q = (−cos Ω sin ω − sin Ω cos ω cos i, −sin Ω sin ω + cos Ω cos ω cos i, cos ω sin i), a plane vector (x, y) becomes x·P + y·Q (`from_perifocal` of the evidence script). For e = 1 the speed is then scaled to √(2μ/r), which is as parabolic as doubles allow; the reference takes the state as stored, whatever its exact eccentricity. Each case stores the nominal e of the list above, r_p, ν, the two input vectors, dt and the two output vectors, 17 significant digits, in the order of the loops as listed (e outermost, dt innermost). 888 cases.

- [ ] **Step 2 (reference author): the pin of today's elliptic path.** `make_elliptic_pin.mjs` takes the path of a bundle of `src/physics/orbital.ts` (made with `node_modules/.bin/rolldown src/physics/orbital.ts --format esm --file <scratch>/orbital.mjs`; Node cannot import the source file itself) and writes `today-elliptic.json`: 200 states, i from 1 to 200, built with the bundle's own `stateFromElements(a, e, i, raan, argp, nu)` with its last argument left out, so that the function's own default GM is used (the bundle does not export the constant): r_p = 6.5e6 + 3.55e7·H₂(i) m, e = 0.95·H₃(i), a = r_p/(1 − e), inclination π·H₅(i), Ω = 2π·H₇(i), ω = 2π·H₁₁(i), ν = 2π·H₁₃(i), and dt = 86,400·(2·H₁₇(i) − 1) s; then four by hand with r_p = 2.0e7 m, ν = 0.8, inclination 0.9, Ω = 0.4, ω = 1.1, dt = 3,600 s: e = 0.99, 0.999, 1 − 1e-6, 1 − 1e-9. For each, the input state, dt, and what `propagateKepler(r, v, dt)` returns today, its last argument left out too. The script asserts that no stored number is zero (a JSON zero loses its sign) and that every case took the elliptic path.

- [ ] **Step 3 (reference author): the failing test**, `tests/astro-kepler.test.ts`:

| Case | Assertion |
|---|---|
| `equals the 80-digit solution, every conic` | every case of the fixture: position within 1e-3 m, velocity within 1e-7 m/s. The 1 m the spec's first text asked for e ≥ 1 is inside this |
| `a step of zero returns the state` | `keplerUniversal(s, 0, mu)` equals `s`, `toBe` per number, for the first fixture case of each of the 19 values of e |
| `there and back` | for the cases with dt = 3,600 and 86,400: `keplerUniversal(keplerUniversal(s, dt, mu), −dt, mu)` is within 1e-2 m and 1e-5 m/s of `s` |
| `keeps angular momentum and energy` | for the cases with dt = 3,600 and 86,400: \|r × v\| changes by ≤ 1e-11 relative; v²/2 − μ/r changes by ≤ 1e-11·μ/\|r₀\| |
| `ends on extreme inputs` | dt = 1e12 s from the fixture's state with e = 10, r_p = 6.578e6, ν = 0, and dt = ±1e9 s from the one with e = 0.001, r_p = 6.578e6, ν = 0: each returns six finite numbers within 200 ms |
| `agrees with the app's present elliptic path where that is sound` | for the fixture's cases with e ≤ 0.99 and dt other than 259,200: within 0.5 m and 5e-4 m/s of `propagateKepler(r, v, dt)` of `src/physics/orbital.ts`. The present function is the looser side: against the 80-digit solution it is off by up to 9.0e-2 m and 7.1e-5 m/s there |
| `bad input` | r = 0, `mu` = 0 and `mu` < 0 give NaN in every number, each tried with dt = 0 and with dt = 600; NaN, +∞ and −∞ in each component, in `dt` and in `mu` give NaN in every number; nothing throws |

  And in `tests/kepler-elliptic-pin.test.ts`, one case, `today's elliptic results, pinned`: for every case of `today-elliptic.json`, `propagateKepler(r, v, dt)` returns the stored numbers, `toBe` per number. It is what "elliptic results bit-identical to today's" is checked against when the fallback is replaced. The comparison is bit for bit; the sines and cosines are V8's own, the same on every machine for one Node version, and the repository's flight fingerprints already rest on that.

  Run both. Expected: `tests/astro-kepler.test.ts` fails to load because `src/astro/base/kepler.ts` does not exist; `tests/kepler-elliptic-pin.test.ts` passes.

- [ ] **Step 4 (reference author): the integrator tests**, `tests/integrator-convergence.test.ts`. These read today's code and pass from the start; they are measurements frozen as bounds, each with the measured value beside it. `tests/fixtures/astro/evidence/pf15_integrator_precheck.ts.txt` is the scratch test that made the measurements and shows every call; the whole of it runs in under two seconds. Throughout, v_c = √(`MU_EARTH`/7.0e6) and n = √(`MU_EARTH`/7.0e6³).

| Case | Assertion |
|---|---|
| `rk4Step is fourth order, circular orbit` | `rk4Step` of `src/physics/integrator.ts` with a point-mass acceleration (−`MU_EARTH`·r/r³), from r = (7.0e6, 0, 0), v = v_c·(0, cos 0.9, sin 0.9), for 1,200 s with steps h = 40, 20, 10 and 5 s; the error is the distance from the exact position on the circle, 7.0e6·(cos θ, sin θ cos 0.9, sin θ sin 0.9) with θ = 1,200·n. Each of the three ratios err(h)/err(h/2) is in [15, 17] (measured 16.46, 16.23, 16.12), and err(10 s) ≤ 5e-3 m (measured 1.09e-3) |
| `rk4Step is fourth order, through a perigee` | e = 0.6, perigee radius 6.678e6 m, in the plane z = 0 with the perigee on +x and the motion towards +y, from 600 s before perigee to 600 s after, the same four steps. With a = r_p/(1 − e), the eccentric anomaly E at a time t from perigee solves E − e sin E = √(μ/a³)·t (Newton's method, 80 passes); the position is a(cos E − e, √(1 − e²) sin E) and the velocity √(μa)/r·(−sin E, √(1 − e²) cos E) with r = a(1 − e cos E). The start state is that at t = −600 and the exact end that at t = +600. The three ratios are in [15, 17] (measured 16.02, 16.01, 16.01) |
| `Dormand–Prince answers to its tolerance` | `propagate([7.0e6, 0, 0], [0, v_c cos 0.9, v_c sin 0.9], 2461310.5, { method: 'cowell', duration: 43200, forces, spacecraft: { mass: 1, area: 0, cd: 0, cr: 0 }, samples: 4, tolerance })` of `src/physics/propagator/propagate.ts`, with `forces = { j2: false, j3j4: false, drag: false, sun: false, moon: false, srp: false, activity: ECSS_LEVELS.moderate }` (`src/physics/propagator/activity.ts`). `tolerance` is passed each time. The error is \|a − 7.0e6\| of the last sample, which two-body motion keeps at zero. At 1e-10, which is also the function's default: ≤ 0.1 m (measured 1.26e-2). Each ratio of the errors at 1e-6, 1e-8, 1e-10 and 1e-12 to the next is in [30, 300] (measured 107, 75, 96) |
| `the point-mass step schedule: halving the step` | a headless `Simulation` (`src/physics/simulation.ts`) of `{ vehicleId: 'falcon9', satelliteId: 'starlink', siteId: 'cape', orbit: orbitById('iss'), launchTime: new Date(Date.UTC(2026, 8, 15, 12, 0, 0)), guidance: { ...DEFAULT_GUIDANCE }, failure: { ...DEFAULT_FAILURE }, boosterRecovery: false }`, built as `new Simulation(cfg, { headless: true })` (cast the literal `as MissionConfig` if it does not typecheck alone) and stepped by `while (!sim.done && sim.state.t < until - 1e-9 && guard++ < 4_000_000) sim.step(Math.min(sim.suggestedDt() / k, until - sim.state.t));` for k = 1, 2 and 4. The distance between the k = 1 and k = 2 states, in position and in velocity, is at most: at 60 s, 30 m and 2 m/s (measured 11.9 and 0.77); at 150 s, 800 m and 10 m/s (335 and 4.17); at 300 s, 2,500 m and 12 m/s (1,098 and 5.00); at 500 s, 3,000 m and 16 m/s (1,267 and 6.78). At each of the four times the k = 2 to k = 4 distance in position is smaller than the k = 1 to k = 2 one (measured 7.3, 162, 460, 896 m) |

  The last case measures the flight as it is today. Its numbers belong to the flight's own outputs: the batch that re-records the Launch fingerprints (W-L) lists this file among what it re-measures.

- [ ] **Step 5 (implementer): `kepler.ts`.** Hyperbolic cases first, then e = 1 and its two neighbours, then the ellipses.
- [ ] **Step 6 (implementer): run** `tests/astro-kepler.test.ts`, `tests/kepler-elliptic-pin.test.ts` and `tests/integrator-convergence.test.ts`, then the hand-off runs.
- [ ] **Step 7 (implementer): two deliberate breaks** (two, as PF-11 had, because the first is the finding this task's bound rests on). Replace the Stumpff functions by the textbook forms with a series below |ψ| = 1e-6 only: the pre-check's worst cases for that form are inside the fixture (2.4e-2 m at e = 1 + 1e-6, r_p = 2.0e7, ν = −0.3, dt = 86,400; 7.4e-7 m/s at r_p = 6.578e6, ν = −2, dt = 3,600), so the first case must fail. Then halve the leading term of c₃, the 1/6. Record the failing cases; restore.
- [ ] **Step 8 (implementer): report, fragment, commit.** `docs/development/reports/PF-15-kepler.md`: the measured worst differences per case; the breaks; and, as findings about today's code that this task does not change, the table of "Pre-checked" below. `changes/claude-p-pf15-s1.md`. Commit as `Astro (PF-15): Kepler propagation for every conic, held to an 80-digit solution; convergence tests for the integrators`.

**Pre-checked** (`pf15_kepler_precheck.py`, `pf15_today_kepler_probe.ts.txt`, `pf15_integrator_precheck.ts.txt`):
- A universal-variable step in doubles with careful Stumpff functions against the 80-digit route, 1,776 cases (the fixture's set and two more perigee radii, 4.2e7 and 1.0e8 m): worst 1.0e-5 m and 3.1e-9 m/s; the textbook forms give 5.1e-2 m and 7.4e-7 m/s. Angular momentum kept to 9.8e-14, energy to 4.0e-14 of μ/r₀; there and back leaves 7.9e-5 m and 9.4e-8 m/s.
- Today's e ≥ 1 fallback, transcribed: 5.78 km off after 600 s and 61.3 km after an hour, for e = 1.04 from a 200 km perigee.
- Today's elliptic path against the 80-digit solution, worst over 40 cases for each eccentricity: e ≤ 0.1, 8.1e-7 m; e = 0.6, 9.0e-2 m; e = 0.9, 8.8e-7 m; 1 − e = 1e-2, 4.9e-5 m; 1e-3 and 1e-4, 0.43 m; 1e-6, 29 m; 1e-8, 23 km; 1e-10, 13,000 km. An orbit that close to escape is rare in this app, and the path is not changed by this task; where the switch at e = 1 should sit is a question for W-O's plan, because moving it changes elliptic outputs.
- The point-mass step schedule converges at about first order, not fourth: halving the step again divides the difference by 1.4 to 2.4. The integrator itself is fourth order (the first two cases); the rest comes from what happens between steps. It is a finding for the gate's report, not a defect this task repairs.

---

### Task 4: reference trajectories (PF-16)

**The reference, settled here:** Orekit runs in the cloud environment. Version 13.1.9 through the Python package `orekit_jpype` 13.1.9.0 with `jpype1` 1.7.1 on Java 21, with the data set of <https://gitlab.orekit.org/orekit/orekit-data> at commit `2d6edc9118983d95c51303df05db16ada90b7ee2` (the archive `orekit-data-main.zip` of that commit: 21,153,768 bytes, SHA-256 `a61e1384911b049ff1a7b2e054dcdb61dbed199077fdd0d5113eb3b0daa5b046`). The spec's fallback, a Python integrator anchored by a real orbit arc, is not needed.

**What this task delivers, and what it does not.** The base has no propagator yet: the numerical propagator moves onto it at W-O. So this task delivers (a) an error budget with a bound for every orbit and every level, written by a rule that is fixed here and committed before any reference number exists; (b) the reference trajectories; (c) a test that ties the reference to the base's own modules, one ingredient at a time, so that a miss at W-O can be traced to a term. The comparison of a propagator with the trajectories is W-O's, and so is any measurement of today's propagator against them.

**Files:**
- Create: `docs/development/reports/PF-16-trajectories.md`, `changes/claude-p-pf16-s1.md`
- Create: `tests/fixtures/astro/trajectories/requirements-orekit.txt`, `tests/fixtures/astro/trajectories/README.md` (how to make the environment, fetch the data set, check it)
- Create: `tests/fixtures/astro/trajectories/make_trajectories.py`, and its output: `orekit-ties.json` and one `orekit-<name>.json` for each of the six orbits
- Create: `tests/astro-trajectories.test.ts`

No source file is edited. If a tie of Step 3 fails, the reference or one of the three modules it reads is suspected: the package stops and goes back to the orchestrating session with the numbers (spec §8).

**Interfaces:**
- Consumes: `keplerUniversal` (Task 3), `EGM2008_20` and `fieldAcceleration` (Task 1), `moonState` and `sunState` (Task 2), `framesAt`, `jd2` and the time functions (wave 1). The gravity excerpt `tests/fixtures/astro/gravity/EGM2008-to-20.gfc` of Task 1. Task 3's fixture reaches three days and Task 1's bound against the 40-digit evaluation is the one the field tie uses, so no tie asks a module for more than its own test did, except in the size of the orbit, which the pre-check covered (below).
- Produces: no source module.

**The orbits.** Epoch 2024-03-20 12:00:00 UTC: the Earth-orientation data are final there, and it is the equinox, so the geostationary orbit crosses the Earth's shadow. Osculating elements in GCRF, with the field's GM, the anomaly a true anomaly:

| Name | a (m) | e | i | Ω (node) | ω (perigee) | ν | Span |
|---|---|---|---|---|---|---|---|
| `station` | 6,778,137 | 0.001 | 51.6° | 20° | 60° | 0° | 1 day |
| `sun-synchronous` | 7,078,137 | 0.001 | 98.19° | 80° | 90° | 0° | 1 day |
| `gps` | 26,559,800 | 0.01 | 55° | 120° | 30° | 0° | 3 days |
| `geostationary` | 42,164,170 | 0.0003 | 0.05° | 0° | 0° | 200° | 3 days |
| `transfer` | 24,396,137 | 0.728312 | 27° | 10° | 178° | 0° | 2 days |
| `molniya` | 26,554,000 | 0.72 | 63.4° | 250° | 270° | 180° | 2 days |

Orekit's `KeplerianOrbit(a, e, i, pa, raan, anomaly, PositionAngleType.TRUE, frame, date, mu)` takes the perigee argument before the node; the table lists the node first. The spacecraft: 1,000 kg, 10 m² for radiation with coefficient 1.5, 10 m² for drag with coefficient 2.2.

**The levels.** A level is a whole force model; each adds one term to the one before, and "what a level adds" is the difference of its end state from the previous level's.

| Level | Force model in Orekit | The term it adds |
|---|---|---|
| A | two-body, GM 3.986004415e14 | — |
| B | A and J2: `HolmesFeatherstoneAttractionModel` on the provider of degree 2, order 0 | J2 |
| C | the whole field to degree and order 20, in place of B's | the rest of the field |
| D | C, with `ThirdBodyAttraction` of the Sun and of the Moon (`CelestialBodyFactory`; the data set's DE-440 file) | Sun and Moon |
| E | D, with `SolarRadiationPressure(sun, earth, IsotropicRadiationSingleCoefficient(10, 1.5))`, the Earth a `OneAxisEllipsoid(6378137, 1/298.257223563, itrf)` | radiation pressure |
| F | E, with `DragForce(SimpleExponentialAtmosphere(earth, 3.0e-12, 400e3, 60e3), IsotropicDrag(10, 2.2))`; `station` and `transfer` only | drag |

That is 32 trajectories: five levels for each orbit and a sixth for two.

The field is loaded explicitly, never Orekit's default (which is EIGEN-6S, radius 6,378,136.46): the generator copies Task 1's excerpt to a scratch folder with `max_degree` rewritten to 20, registers the folder with a `DirectoryCrawler`, clears the potential readers, adds `ICGEMFormatReader('<name>', False)`, and asserts that the provider reports GM 398600441500000.0, radius 6378136.3 and `TIDE_FREE`. Frames: `FramesFactory.getGCRF()` and `getITRF(IERSConventions.IERS_2010, True)`. Drag is checked with an exponential atmosphere on both sides so that the mechanics of the term are tested apart from any density model; the density models themselves are plan S20's tier 3.

**Integration:** `DormandPrince853Integrator(1e-3, 300, …)` with `NumericalPropagator.tolerances(1e-9, orbit, OrbitType.CARTESIAN)`, Cartesian orbit type, the propagator's `mu` set to the field's GM. Each trajectory is run a second time at 1e-7 m; the difference of the two end states, in position and in velocity, is stored as that trajectory's `noise`.

**The size of each term and the reference's noise, measured before the work** (`tests/fixtures/astro/evidence/pf16_orekit_trial.py`, section 5; position and velocity at the end of the span). These describe the physics and the reference, not a comparison with any propagator of the app, and the budget of Step 1 is built on them:

| Orbit | J2 | rest of the field | Sun and Moon | radiation | drag | noise, levels A to D | noise, E and F |
|---|---|---|---|---|---|---|---|
| `station` | 307.7 km, 618 m/s | 13.42 km, 14.6 m/s | 100.1 m, 0.110 m/s | 5.13 m, 5.8e-3 m/s | 17.39 km, 19.6 m/s | ≤ 3.2e-5 m | 0.14 m (E), 0.047 m (F) |
| `sun-synchronous` | 2,066 km, 2,180 m/s | 15.30 km, 15.6 m/s | 67.2 m, 0.066 m/s | 1.93 m, 2.5e-3 m/s | — | ≤ 1.2e-5 m | 1.3e-5 m |
| `gps` | 59.95 km, 8.14 m/s | 1,701 m, 0.236 m/s | 8,541 m, 1.32 m/s | 505 m, 0.056 m/s | — | ≤ 4.6e-6 m | 4.7e-6 m |
| `geostationary` | 59.04 km, 4.31 m/s | 5,599 m, 0.407 m/s | 20.84 km, 1.58 m/s | 1,382 m, 0.077 m/s | — | ≤ 4.6e-6 m | 7.0e-5 m |
| `transfer` | 2,075 km, 238 m/s | 10.89 km, 1.46 m/s | 6,284 m, 0.944 m/s | 91.8 m, 0.022 m/s | 13.08 km, 1.65 m/s | ≤ 3.6e-5 m | 0.053 m (E), 0.067 m (F) |
| `molniya` | 100.6 km, 7.53 m/s | 1,393 m, 0.0154 m/s | 2,600 m, 0.335 m/s | 77.4 m, 7.2e-3 m/s | — | ≤ 1.4e-5 m | 9.1e-6 m |

Level A is within 7.5e-6 m and 8.5e-9 m/s of a Kepler orbit on all six. The noise in velocity is about a thousandth of the noise in position per second on the low orbits (1.6e-4 m/s for 0.14 m) and less on the high ones. The two low-perigee orbits are noisy once radiation pressure is on, because the force switches at the edge of the Earth's shadow.

- [ ] **Step 1 (budget author, middle tier; a different seat from the reference author): the budget, before any reference number.** In `docs/development/reports/PF-16-trajectories.md`, one table of 32 rows, a row for each orbit and level, giving the bound in position and the bound in velocity that a propagator on the new base must meet against the reference at the end of the span. The rule is fixed here; the author applies it and shows the arithmetic of every row.

  bound = 3 × ( allowance for the two integrations + the sum, over the terms the level holds, of [relative error of the term × size of the term on that orbit] )

  with the sizes from the table above (position sizes for the position bound, velocity sizes for the velocity bound), and:
  - *Allowance for the two integrations:* 1e-3 m and 1e-6 m/s at levels A to D. At levels E and F it is the larger of that and three times the trajectory's stored `noise`; this one figure is filled in at Step 5, and it is the only part of any bound that waits for the reference. The propagator's own step error is W-O's to keep inside the allowance, shown by halving its tolerance.
  - *J2 and the rest of the field:* 9.7e-9, the rotation by which the base's IAU 2000B chain may differ from the reference's Earth-fixed frame (2 mas, PF-11's bound; the pre-check measured 0.52). It applies to both sizes from level B on. The constants and coefficients are the same on both sides and add nothing.
  - *Sun and Moon:* 2.0e-4, the error of the Moon's direction in radians plus three times its relative error in distance (a tide-like term goes as 1/d³), from Task 2's measured accuracy over the century (0.0051°, 0.0034 %); the Sun's is smaller.
  - *Radiation pressure:* the author derives it and writes the derivation out. The Sun's distance error adds twice its relative size (1.7e-5). The rest is the shadow: for each orbit, whether it is eclipsed at this epoch and for how long in each revolution it crosses the penumbra, from the Sun's angular radius of 0.267° and the orbit's geometry; a shadow model that differs from the reference's may misplace half of each crossing, so the relative error is half the fraction of the span spent in penumbra, and zero for an orbit that is not eclipsed.
  - *Drag:* 1e-5, an allowance for the height above the ellipsoid and the atmosphere's rotation, both the same construction on the two sides.
  - *Assumed of the propagator, and stated in the report:* it is given the reference's own GM of the Sun and of the Moon and its radiation pressure at one astronomical unit, which the fixture carries. Where W-O chooses another constant for the app (D-41), the difference is a known offset that W-O computes; it is not part of this budget.

  This step is committed alone, as the branch's first commit, before Step 2 starts.

- [ ] **Step 2 (reference author): the environment and the generator.** `requirements-orekit.txt` pins `orekit_jpype==13.1.9.0` and `jpype1==1.7.1`, beside the pins of `../requirements.txt`. The data set is fetched as the archive of the commit named above (`https://gitlab.orekit.org/orekit/orekit-data/-/archive/<commit>/orekit-data-<commit>.zip`); the commit id stands in the archive's comment (`unzip -z`), which the generator checks. The archive's own hash is recorded in the fixtures but is not required to reproduce, because the host builds archives on request. `make_trajectories.py <orekit-data zip> <a scratch folder>` writes:
  - `orekit-<name>.json`: the versions, the data set's commit, the six elements under the names `a`, `e`, `i`, `raan`, `argp`, `nu` in metres and degrees as the table gives them, the spacecraft, and for each level the state (GCRF position and velocity, m and m/s) at the epoch and every 3,600 s to the end of the span, and the level's `noise` in position and in velocity;
  - `orekit-ties.json`: (i) 200 Earth-fixed positions (Halton, index from 1: direction as in Task 1, distance `radius + 200e3 + 35.8e6·H₅(i)²`) and at each the acceleration of the level-C field, the central term plus `HolmesFeatherstoneAttractionModel.gradient(date, position, mu)`; (ii) at the epoch and every hour for 72 hours, the UTC date in two parts, Orekit's UT1 − UTC and pole (`FramesFactory.getEOPHistory(IERS_2010, True)`: `getUT1MinusUTC`, `getPoleCorrection`) and its GCRF→ITRF rotation matrix, row-major, such that it turns GCRF components into ITRF components; (iii) at the same instants, the TT date in two parts and Orekit's geocentric Sun and Moon positions in GCRF; (iv) the GM Orekit uses for the Sun and for the Moon, and the reference pressure and the shadow model of its radiation term, read from the objects or quoted from the documentation of the pinned version, with which of the two said.

- [ ] **Step 3 (reference author): the test**, `tests/astro-trajectories.test.ts`. The astro tests import their fixtures as modules, so this file exists only once Step 2 has written them, and with Tasks 1 to 3 merged it passes on its first run; that is expected here, since no implementation follows it. The breaks of Step 4 show that it can fail.

| Case | Assertion |
|---|---|
| `two-body: the reference is a Kepler orbit` | for each orbit, level A at every stored time is within 1e-3 m and 1e-6 m/s of `keplerUniversal(state at the epoch, t, 3.986004415e14)` |
| `the field: Orekit's acceleration equals the base's` | at the 200 stored positions, `fieldAcceleration(EGM2008_20, r)` is within 1e-10 relative, the bound Task 1 holds the module to |
| `the frames: Orekit's Earth-fixed frame against the base's` | at the 73 instants, the rotation between Orekit's matrix and `framesAt(utc, { dut1, xp, yp }).gcrfToItrf` with Orekit's three values is ≤ 9.7e-9 rad (2 mas) |
| `the Sun and the Moon: Orekit's against the base's` | at the 73 instants: direction within 0.01° for both, distance within 0.1 % for the Sun and 0.05 % for the Moon |
| `the reference is steady` | every stored `noise` in position is ≤ 1e-3 m at levels A to D, and ≤ 0.5 m at levels E and F |
| `the node moves as J2 says` | for `station`, the right ascension of the node at the end of level B, from the state (h = r × v, n = ẑ × h, Ω = atan2(n_y, n_x)), has moved from 20° by within 1 % of −1.5·n·J2·(R/p)²·cos i times 86,400 s, with n = √(GM/a³), p = a(1 − e²), a, e, i the table's, R and GM the field's, J2 = −√5·C̄(2,0) |
| `the files are whole` | each trajectory file holds the versions, the data set's commit and the six elements of the table above, `toBe`; each level holds span/3,600 + 1 states of six finite numbers |

- [ ] **Step 4 (reference author): two deliberate breaks of the test's own inputs.** Feed the frames tie UT1 − UTC = 0; give the field tie a field whose radius is the app's `R_EARTH`. Record the failing cases; restore.
- [ ] **Step 5 (reference author): report, fragment, commit.** The report already holds Step 1. Add: the ties' measured values; the noise per trajectory; the integration allowance of the E and F rows, now filled in by Step 1's rule; and, for each row, whether the stored noise is under a hundredth of the row's bound. A row where it is not is marked "not usable as it stands", with the numbers. Commit as `Astro (PF-16): reference trajectories from Orekit for six orbits, tied to the base term by term; the error budget written first`.
- [ ] **Review (large tier):** the budget's arithmetic row by row against the rule; that Step 1's commit precedes any fixture; the generator against this text; one regeneration of one orbit's file.

**Pre-checked** (`pf16_orekit_trial.py`): the field loaded as described reports GM 398600441500000.0, radius 6378136.3, TIDE_FREE, and its acceleration is within 2.0e-15 relative of a Cunningham recursion in doubles at 200 points. Orekit's GCRF→ITRF is within 0.52 mas of ERFA's IAU 2000B chain fed Orekit's own UT1 − UTC and pole, over 73 hours from the epoch (0.37 mas of the full IAU 2006/2000A chain; the remainder is the celestial-pole corrections of the data). Orekit's Sun and Moon are within 216 m and 3.2 m of DE421, and ERFA's series within 3,323 km and 5.1 km of Orekit's, which is 0.0013° and 0.0008°. The `station` node under J2 alone moves −5.0140° in the day against −5.0023° by the secular rate (+0.23 %). All 32 trajectories, each at both tolerances, ran in 9 s; the table above is their output. A universal-variable Kepler step holds 1.0e-5 m over three days and at a perigee radius of 4.2e7 m (Task 3's pre-check).

---

### Task 5: documents brought to the code (PF-03)

**The work order** is §5 of [the audit record](../reports/physics-audit-2026-11-26.md): 28 rows, each a place in a document, what it says, what the code does and where. That section's own rule governs the work and is repeated in the brief word for word.

**Files:**
- Modify: Markdown files only, those the rows name (`docs/PHYSICS.md`, `docs/VALIDATION.md`, `docs/IMPLEMENTATION-STATUS.md`, `docs/ROADMAP-PART2-3.md`)
- Create: `docs/development/reports/PF-03-documents.md`, `changes/claude-p-pf03-s1.md`

**What the rule and this plan settle:**
- Every row is checked against today's code before its document is changed: the audit read, it did not run, and line numbers have moved (find the sentence by its words, not by its line). A row whose claim no longer holds is recorded as "no longer true" and its document is left alone.
- This package is Markdown only. A comment edited under `src/physics`, `src/orbit` or `src/data` selects every heavy and fleet test. Where a row names a comment in a source file (rows 5, 7, 8, 11 and 12), that comment is not edited; the report lists it with the wording it should get, for the batch that next edits the file (W-O for rows 11 and 12).
- A figure written into a document comes from the code, from a test's assertion, from a sum of the code's own constants that the report shows term by term, or from the other document a row names as the holder of the fact. A figure the audit marked "by hand", or one with none of those sources, is not written into a document: the sentence is reworded so that it no longer states it.
- Where no test holds a claim, the sentence keeps what it says and gains the words that no test in the repository holds it, and the missing test is listed in the report as a gap for the package that owns the model. No test is written.
- Counts that only a run can give are not recounted by reading.

**The disposition of each row.** This is the plan's reading of the audit's table; if today's code contradicts a row, "no longer true" wins. A row may get more than one verdict.

| Row | What the writer does |
|---|---|
| 1 | Add the scope to the sentence: it is true of the app's default; a `Simulation` without `dynamics`, and a Build hand-over without six-DOF ticked, fly point mass |
| 2 | Keep the values; replace "adaptive" by what the code does: a step chosen by flight regime, with no error control |
| 3 | Correct: the tables are built for every vehicle |
| 4 | Correct the 86 km density to the value in `src/physics/atmosphere.ts` |
| 5 | Reword to what `tests/physics-core.test.ts` asserts (the bound, and the engines it pins above 2 %); the counts and percentages the audit worked by hand are not written. The comment in `src/physics/vehicle.ts` is carried |
| 6 | Correct the two rows from `src/data/vehicles.ts`, and add the six-DOF kicks the default flight uses, from the same file |
| 7 | Correct the counts to those `tests/parts.test.ts` asserts; a count no test asserts is not written. The comment in `src/data/parts.ts` is carried |
| 8 | Reword to the test's bound and the engines it names; the by-hand figures are not written. The comment in `src/design/static-fire.ts` is carried |
| 9 | Correct IMPLEMENTATION-STATUS to the figures VALIDATION holds |
| 10 | Correct the description of the data to what `src/data/solar-daily.json` holds (daily, from its first date). The "early" percentage is taken from VALIDATION if it is stated there for the current model; otherwise it is not written |
| 11, 12 | Source comments only: nothing is edited; both are carried |
| 13, 27 | No test holds the claim: say so in the sentence; gap recorded |
| 14 | Say what `tests/heavy/screening-filter.test.ts` asserts, and that the count of approaches is not pinned; gap recorded |
| 15 | The roadmap states a plan, which is still true: no edit; gap recorded |
| 16 | Correct: the station's circle lies in the spacecraft's own plane at arrival |
| 17 | Narrow the sentence to what `tests/heavy/rendezvous.test.ts` flies |
| 18 | Say what `tests/watch-missions.test.ts` checks (the 180 s window), and that no test holds the 0.4° |
| 19 | Say what the table's own rows sum to, shown in the report, and what `tests/rendezvous.test.ts` bounds; the figure that neither supports is not written |
| 20 | Correct to the sum of the code's parts, shown term by term in the report |
| 21 | Correct: the simulation steps whole steps; the statement about the recorder's packet goes |
| 22, 23, 24 | Left as they stand; listed as waiting for the track's first heavy and fleet run (row 24 contradicts itself, and which of its two sets is right is what that run tells) |
| 25 | Narrow the sentence to what the register covers, and name what it lacks |
| 26 | Not edited: the document's published figure and the code's `payloadLEO` differ, and which is right is a data question. Recorded as open, for the launcher-data packages |
| 28 | Not touched: it is package LV-2's |

- [ ] **Step 1 (writer, small tier): verify the 27 rows**, one at a time, and fill the report's table: row, the document's sentence today, the code's fact today with file and line, and the verdicts that apply, from "corrected", "reworded", "gap recorded", "waits for a run", "source comment, carried", "open question, recorded", "no edit", "no longer true".
- [ ] **Step 2 (writer): make the edits**, one commit. Each edit changes the sentence the row names and nothing around it.
- [ ] **Step 3 (writer): run** `npx vitest run tests/repo-hygiene.test.ts`, which the change map selects for Markdown, and check that every relative link in the changed files resolves.
- [ ] **Step 4 (reviewer, middle tier):** every edit against the code it cites, and every row's verdict; the diff holds no file that is not Markdown.
- [ ] **Step 5: fragment, pull request.** A pull request of Markdown only does not start CI in this repository; the evidence is the reviewer's row-by-row check and Step 3. Commit as `Docs (PF-03): the documents brought to the code, from the audit's list`.

---

### Task 6: two suspected silent wrong answers, diagnosed (PF-04)

**The suspects** are §6 of [the audit record](../reports/physics-audit-2026-11-26.md). Neither had been seen in a running app; the pre-check for this plan has now measured both with the app's own code (`tests/fixtures/astro/evidence/pf04_precheck.ts.txt`).

1. *The station transfer that keeps its first guess.* `src/physics/sim/rendezvous.ts:262-267`: when `interceptImpulse` (`src/physics/rendezvous/targeting.ts`) does not converge it returns `null`, and the burn is flown with the first guess from `raiseImpulse`, with no flag, event or message. Measured: on sixteen nominal flights (the two-orbit profile at twelve launch windows, the other two profiles at two each) the solver converged every time, in 2 or 3 passes, to 0.28 m or better. The fallback was not reached.
2. *The Lambert plan solved for two bodies and flown with J2.* `rendezvous()` in `src/orbit/maneuvers.ts` places the two ends with `stateAt(…, j2)` and joins them with the two-body `lambert`; the Orbit playground (`src/ui/orbit/playground.ts`) plans and flies with one J2 flag. Measured for the transfer of `tests/maneuvers.test.ts` (400 km to 800 km, about 165°), planned and flown with that one flag: with J2 off the chaser arrives 7.4e-3 m from the target; with J2 on, 59.5 km at i = 0°, 15.3 km at 51.6°, 28.4 km at 98°, the velocities matching to 7.7e-6 m/s in every case. The audit's figures (58, 15, 28 km) are confirmed.

**What this task delivers:** for each suspect the diagnosis finished, and tests that pin what the app does today. No source file is edited: a fix touches `src/physics` or `src/orbit` and lands in the batch that owns the seam (the station transfer in W-L, the Lambert plan in OE-4), with that batch's own failing test.

**Files:**
- Create: `tests/rendezvous-transfer-fallback.test.ts`, `tests/lambert-j2.test.ts`
- Create: `docs/development/reports/PF-04-silent-answers.md`, `changes/claude-p-pf04-s1.md`

**The form of the tests.** The suite must stay green and the right behaviour after a fix is the fixing batch's design, so each test pins what the app does today, under a title that begins `known defect (PF-04)`, and its file's header says which batch replaces the assertion. A pin asserts a number or a state, never only that something ran. A pinned number is held within 10 % of the value measured, which is tight enough that a change to the planner or to the flight moves it out. One engineer of the large tier writes both files and the report; the reviewer is a second seat of the large tier.

- [ ] **Step 1: the station transfer, the nominal flights.** In `tests/rendezvous-transfer-fallback.test.ts`, wrap `interceptImpulse` with `vi.mock` of `src/physics/rendezvous/targeting` as the pre-check does (the original function, with its arguments and result recorded for the call that passes a tolerance of 5 m), and fly in point mass to the transfer burn: every profile of `PROFILE_IDS`, at each of the first twelve windows of `launchWindows(orbitById('iss'), siteById('baikonur'), new Date('2026-09-20T00:00:00Z'), 12)`, port `rassvet` (the port does not enter the transfer's aim), the mission otherwise that of `tests/rendezvous.test.ts`. A flight stops when the solver has been called; each takes 0.1 to 0.3 s. Case `the transfer is solved on every nominal flight`: 36 of 36 return a solution, in at most 5 passes (measured 2 or 3 on the sixteen of the pre-check).
- [ ] **Step 2: how far the solver is from failing.** With the arguments recorded on the two-orbit flight of the first window, call the real `interceptImpulse` on the state displaced along each axis of its own radial, along-track and cross-track frame: in position by ±1, 3, 10, 30, 100, 300 km; in velocity by ±1, 3, 10, 30, 100 m/s; and with the duration changed by ±10, 30, 100, 300, 1,000 s; the target, the first guess and the tolerance as recorded. The report tabulates, for each of the seven directions, the smallest displacement that returns `null`, or "none up to the largest tried". Case `where the solver gives up`: one displaced input that returns `null` and the next smaller one that does not, if any direction fails; if none does, the case asserts that every displaced input is solved, and the report says so.
- [ ] **Step 3: what a failed solution does to the flight.** Fly the two-orbit flight of the first window to its end with the wrapper returning `null` for the transfer call. Case `known defect (PF-04): a failed transfer solution is flown as the first guess, and nothing says so`: the `evt.rendezvousBurn` event of the transfer burn carries the size of the first guess (the recorded guess's length, to the 0.1 m/s the event rounds to); no event between that burn and the end of the flight names the solver or carries the level `fail` or `warn` because of it; and the flight's end is pinned as measured: `sim.state.note`, whether `evt.docked` occurred, and the distance to the station at the plan's arrival time. The report gives the same flight with the solver left alone beside it.
- [ ] **Step 4: the Lambert plan.** In `tests/lambert-j2.test.ts`, the six flights of the pre-check: `chaser = circle(400e3, i, { raan: 0, m0: 0 })`, `target = circle(800e3, i, { raan: 0, m0: −6° })` with the `circle` helper of `tests/maneuvers.test.ts` copied, `plan = rendezvous(chaser, target, 600, 2800, j2)`, the chaser at `stateOnPlan(plan, plan.arrival + 1e-6, j2)` against the target at `stateAt(target, plan.arrival, j2)`, for i = 0°, 51.6°, 98° and `j2` false and true, the same flag in all three calls. Case `two-body: the plan arrives on the target`: with `j2` false, within 0.1 m and 1e-4 m/s (measured 7.4e-3 m, 7.7e-6 m/s). Case `known defect (PF-04): with J2 on, the plan arrives tens of kilometres from the target`: with `j2` true, the distance is within 10 % of 59,500 m, 15,330 m and 28,370 m in that order of i, and the velocities agree within 1e-4 m/s. The report adds, by reading `src/ui/orbit`, whether the page gives the user any sign that the plan does not meet the target; no journey is added.
- [ ] **Step 5: run** the two new files, and `tests/rendezvous.test.ts` and `tests/maneuvers.test.ts` once to show they are untouched; then the hand-off runs for the changed files.
- [ ] **Step 6 (reviewer, large tier):** reads the two diagnoses against the code; judges whether "not reached" is supported by what was swept (the six-DOF ascent and off-nominal settings are not swept, and the report must say so); checks that no source file changed.
- [ ] **Step 7: report, fragment, commit.** The report gives, for each suspect: reached or not, with the numbers; the size of the wrong answer; what the user sees; which batch owns the fix and what its failing test should assert. Commit as `Tests (PF-04): the station-transfer fallback and the two-body Lambert plan under J2, diagnosed and pinned`.

**Pre-checked** (`pf04_precheck.ts.txt`, 4 s): the figures quoted under "The suspects". Not measured before the work: Step 2's table and Step 3's flight; their pins are set from the engineer's own measurement, which the reviewer repeats.

---

### Task 7: size headroom (T-1) is not dispatched from this plan

The spec describes T-1 as FX-4's shared runner, then EQ-8, "workers as ES modules sharing the physics chunk", with an estimate of −2.75 MB. Two measurements made for this plan on main at `26d6565` say it needs a work plan of its own first.

- **The setting alone frees nothing.** With `worker: { format: 'es' }` added to `vite.config.ts` and nothing else changed, `npx vite build` and `node scripts/bundle-budget.mjs` give a precache code of 15,200.4 kB against 15,198.5 kB without it: the twelve worker bundles together are 1.9 kB larger, not smaller (`flight` 571.0, `tune` 543.0, `monte-carlo` 541.3, `ratings` 550.5, `readiness` 564.6, `recheck` 879.7 kB with the setting). Each worker is still built as a bundle of its own; the format does not make two workers share a chunk. The workers are already created with `{ type: 'module' }` in the source.
- **The shared runner is not in the code.** FX-4 ([S10 §10.7](S10-r16-fx-data-safety.md)) has four steps; the only part merged is #233, which changed one job wrapper (`src/physics/lifetime-job.ts`: a stopped lifetime run no longer gives an answer). `serveJob` appears nowhere under `src`, and the eleven job wrappers still each create their own worker. Steps 2 to 4 change messages the user reads, in three languages, which are the owner's to see before they merge.

What T-1's own plan has to settle, in this order:

1. How workers come to share code under this build tool. The candidates that keep S09's acceptance for EQ-8 ("still one Worker per job") are worker entries built as entries of the main graph, and a manual chunk for the physics core. One scratch build of each, measured with `bundle-budget.mjs`, answers it; none is merged. A single worker that dispatches every job would also share the code, but S09 allows it only as the fallback for a browser without module workers.
2. Whether that route needs FX-4's runner at all, or only EQ-8's first pull request (M-PLATFORM-033). The owner's answer "4.ก" authorized T-1 as "EQ-8 and the rest of FX-4". Doing less of FX-4 inside this track would change that scope, so the plan puts the finding to the owner; it does not decide it.
3. The identical-output evidence S09 lists for EQ-8 (fingerprints across the old and the new build, the serialized deltas byte for byte, a seeded Monte Carlo CSV), and the one heavy and fleet run this track budgets for T-1.
4. The size it must free: the spec's size rule allows the new base 40 kB in the flight core and 60 kB in the Orbit workers, paid once per worker that embeds the core, which is six today.

T-1 must land before W-O or W-L merges (spec §6). Nothing in Tasks 1 to 6 waits for it: no new module is called by the app, so no bundle changes.

---

## After this plan

When Tasks 1 to 6 have merged, the gate of [HANDOVER-S20](../HANDOVER-S20.md) §3.4 follows: the report to the owner, with each model's class and its evidence, the findings listed under "Pre-checked" in Tasks 3 and 4 and in Task 6's report, and the decisions waiting; the change fragments folded; then the detailed plans of W-O and W-L, and T-1's.
