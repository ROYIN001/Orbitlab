# S20 wave 2 — the rest of the new base, and the groundwork beside it: implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

## สรุปสำหรับเจ้าของ

แผนลงมือชุดที่สองของ S20 ครอบคลุมหกแพ็กเกจที่พร้อมเปิดงาน และหนึ่งแพ็กเกจที่ยังไม่พร้อม:

- **พร้อมเปิดงาน:** PF-13 (สนามโน้มถ่วง EGM2008 ถึงดีกรี 20), PF-14 (ดวงอาทิตย์และดวงจันทร์), PF-15 (Kepler สำหรับ e ≥ 1 และเทสต์ของตัวอินทิเกรต), PF-16 (วิถีอ้างอิงจาก Orekit), PF-03 (แก้เอกสารให้ตรงโค้ด), PF-04 (วินิจฉัยคำตอบผิดเงียบสองจุด) ทุกขอบเขตในแผนถูกตรวจล่วงหน้าด้วยเครื่องมืออ้างอิงแล้ว และยังไม่มีแพ็กเกจใดถูกเปิด
- **ยังไม่พร้อม: T-1 (ลดขนาด)** วัดจริงแล้วพบว่าการตั้ง worker เป็น ES module อย่างเดียวไม่ลดขนาดเลย (15,200.4 kB เทียบ 15,198.5 kB) และ runner ร่วมของ FX-4 ยังไม่มีในโค้ด T-1 จึงต้องมีแผนของตัวเองก่อน (Task 7 บอกว่าต้องตอบอะไร)
- **สิ่งที่พบระหว่างตรวจล่วงหน้า ซึ่งแอปวันนี้เป็นอยู่** (ยังไม่มีการแก้ ทุกข้อไปอยู่ในรายงานที่ประตูหลังเฟส 0 และ 1): เส้นทางวงรีของ `propagateKepler` ผิดมากขึ้นเมื่อ e เข้าใกล้ 1 (29 m ที่ 1 − e = 1e-6, 23 km ที่ 1e-8); ทางสำรองสำหรับ e ≥ 1 ผิด 5.8 km ในสิบนาที; ตารางก้าวเวลาของ point mass ลู่เข้าประมาณอันดับหนึ่ง (ครึ่งก้าวแล้วตำแหน่งที่ T+500 s ขยับ 1.3 km)
- **การตัดสินใจของผู้เขียนที่เปิดให้แก้:** PF-14 ใช้อนุกรมของ ERFA ทั้งชุดแทน "อนุกรมที่สั้นที่สุด"; PF-15 ตั้งขอบเขตแน่นกว่าแผน (1 mm แทน 1 m) เหตุผลอยู่ใน S20 amendment 14

**Goal:** Finish Phase 1 of plan S20 (the gravity field, the Sun and Moon, Kepler propagation for every conic with the integrator tests, and the reference trajectories) and the two document and diagnosis packages of Phase 0, each held to an independent reference, none of the new modules called by the app yet.

**Architecture:** As wave 1: modules under `src/astro/base/` that import nothing from the rest of `src/` and hold no state, each with a reference fixture written by a committed generator beside it and one test file. The `astro` rule of the change map keeps these packages on their own tests. Two tasks add test files that read today's `src/physics` code without editing it; a new test file under `tests/` selects only itself.

**Tech stack:** TypeScript 7 (strict), vitest 5. For fixtures only: the Python environment of `tests/fixtures/astro/requirements.txt`; Task 4 adds Orekit 13.1.9 through `orekit_jpype` and a Java runtime.

**Spec:** [S20-physics-foundation.md](S20-physics-foundation.md) (packages PF-03, PF-04, PF-13 to PF-16, T-1; §7 verification; §8 roles; amendment 14 for what this plan settled).

**Status, 2026-11-27:** No task of this plan has been dispatched. Every bound below was checked before any implementation existed, with reference tools only, by the scripts named beside it (`tests/fixtures/astro/evidence/`). How a package is run, seat by seat: [HANDOVER-S20](../HANDOVER-S20.md) §4 and Appendix A.

## Global constraints

- The global constraints of [S20-wave1.md](S20-wave1.md) hold unchanged: the files a task may write (`src/astro/base/`, `tests/astro-*.test.ts`, `tests/fixtures/astro/**`, its report, its fragment), no import from another `src` folder, units (radians, metres, seconds; a vector is `{ x, y, z }`), the non-finite rule, dates in two parts compared part by part, bounds never loosened, fixtures written by generators only, one deliberate break per reference test, and the hand-off runs (`npm run typecheck`; `npx vitest run` on the unit files that `node scripts/verification/select-checks.mjs --files <the task's files>` lists; `npx vite build && node scripts/bundle-budget.mjs`). They are restated here only where a task departs from them.
- Nothing under `src/physics`, `src/orbit` or `src/data` is edited by any task of this plan, comments included: those paths select every heavy and fleet test. Tasks 3 and 6 add test files that import from them, which selects nothing more than the new file.
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
7. A reference whose own numbers are noisy: every trajectory of Task 4 carries the difference between two integration tolerances, and a bound is never set within a hundred times of it.
8. NaN or infinite input: NaN in every number returned, nothing throws (Tasks 1, 2, 3).

---

### Task 1: the gravity field (PF-13)

**The model, settled here** (the spec said "the published coefficients"): EGM2008, tide-free, truncated at degree and order 20, with the model's own constants GM = 3.986004415e14 m³/s² and reference radius 6,378,136.3 m. These are not the app's `MU_EARTH` (3.986004418e14) and `R_EARTH` (6,378,137): a field is evaluated with the pair it was fitted with. The source is the ICGEM file `EGM2008.gfc` (<https://icgem.gfz.de>, static models, EGM2008; header: `earth_gravity_constant 0.3986004415E+15`, `radius 0.63781363E+07`, `norm fully_normalized`, `tide_system tide_free`; the model is by Pavlis, Holmes, Kenyon and Factor for the U.S. National Geospatial-Intelligence Agency). The excerpt this task commits is every line of that file up to and including `end_of_head`, then every `gfc` line of degree 20 or less, unchanged: 250 lines, 24,845 bytes, SHA-256 `a11a7dcc6fb9760783819655d195e5459522f7b1f96438ff2550754399b18621`. It holds 229 coefficient lines (degree 0, then degrees 2 to 20; the file has no degree-1 line). The first 60 kB of the file are enough: `curl -r 0-60000 -o head.gfc https://icgem.gfz.de/getmodel/gfc/c50128797a9cb62e936337c890e4425f03f0461d7329b09a8cc8561504465340/EGM2008.gfc`; if the address has moved, the hash decides.

**Files:**
- Create: `src/astro/base/gravity.ts`, and `src/astro/base/egm2008-20.ts` for the coefficients
- Create: `tests/astro-gravity.test.ts`
- Create: `tests/fixtures/astro/gravity/EGM2008-to-20.gfc` (the excerpt above), `tests/fixtures/astro/gravity/make_gravity_fixture.py`, `tests/fixtures/astro/gravity/mpmath-gravity.json`
- Modify: `NOTICE.md` (an EGM2008 entry: the two sources, the files that hold the copy, and the terms as the sources state them; if either source states a restriction on redistribution, the reference author stops and reports)

**Interfaces:**
- Consumes: `V3` from `./geodesy`.
- Produces:

```ts
export interface GravityField {
  readonly gm: number;        // m³/s²
  readonly radius: number;    // m, the model's reference radius
  readonly degree: number;    // the largest degree held
  /** Fully normalized, at index n(n+1)/2 + m for 0 ≤ m ≤ n ≤ degree. c[0] = 1; s is 0 wherever m = 0. */
  readonly c: readonly number[];
  readonly s: readonly number[];
}
export const EGM2008_20: GravityField;                                   // from egm2008-20.ts
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

- [ ] **Step 1 (reference author): the excerpt, the generator, the fixture.** Fetch the head of the source file, cut the excerpt by the rule above, check its SHA-256, commit it. `make_gravity_fixture.py` reads the excerpt and writes `mpmath-gravity.json` with mpmath at 40 digits by fully normalized associated Legendre functions and the gradient in spherical coordinates (`accel_reference` and `potential_reference` of `tests/fixtures/astro/evidence/pf13_gravity_precheck.py` are that route and may be reused):
  - `source`: the excerpt's file name and SHA-256, `gm`, `radius`, the tide system.
  - `table`: the count of entries (231), and two checksums in doubles, `sumC` = Σ n·(m + 1)·C̄(n,m) and `sumS` the same over S̄, taken for n from 2 to 20 and, inside each n, m from 0 to n, in that order.
  - `points` (16): ten from the Halton sequence, index i from 1, `lat = asin(2·H₂(i) − 1)`, `lon = π(2·H₃(i) − 1)`, `h = 300e3 + 35.7e6·H₅(i)²`, placed at distance `radius + h` from the centre in the direction (lat, lon) taken as geocentric; then six by hand as (lat, lon, h): (89.99°, 0.3 rad, 300e3), (−89.99°, 2.0 rad, 800e3), (0°, −14.7°, 35,786e3), (51.6°, 100°, 420e3), (−30°, −170°, 300e3), (10°, 45°, 1,000e3). Each with the position, the acceleration and the potential at full degree and order.
  - `axis` (2): the points (0, 0, ±(radius + 500e3)); the reference is evaluated 1e-12 rad off the axis, at azimuth 0.7 rad, which moves the true acceleration by 1.0e-12 of itself.
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
| `zonalField` | for `zonalField(gm, R, [a, b, c])`: `degree` is 4; C̄(2,0), C̄(3,0), C̄(4,0) are −a/√5, −b/√7, −c/3 within 1e-18; every other entry of degree 2 or more is 0; `c[0]` is 1 |
| `truncation` | `degree` 0 and `degree` 1 each give −GM·r/r³ within 1e-15 relative; `degree` 21, `order` above `degree`, −1 and 2.5 for either give NaN in every number |
| `a non-finite input gives NaN in every number returned` | for NaN, +∞ and −∞ in each component of `r` and in `degree` and `order`, for both functions; and for r = (0, 0, 0) |

  Run it. Expected: it fails because `src/astro/base/gravity.ts` does not exist.

- [ ] **Step 3 (implementer): `egm2008-20.ts` and `gravity.ts`.** The table first, checked by the first case alone; then the acceleration against `points`; then the potential and the cuts.
- [ ] **Step 4 (implementer): run**, then the hand-off runs.
- [ ] **Step 5 (implementer): two deliberate breaks.** Set the field's radius to 6,378,137; flip the sign of every S̄ term in the sum. Record the failing cases; restore.
- [ ] **Step 6 (implementer): report, fragment, NOTICE, commit.** `docs/development/reports/PF-13-gravity.md` gives the measured worst difference per case, the minified size of the two modules, and the written reason if the diff passes 400 lines (the table). `changes/claude-p-pf13-s1.md`. Commit as `Astro (PF-13): the EGM2008 field to degree and order 20, held to a 40-digit evaluation`.

**Pre-checked** (`pf13_gravity_precheck.py`; a Cunningham recursion in doubles against the 40-digit route): acceleration 1.1e-15 at 16 points and 9.0e-16 over the cuts; potential 1.4e-15; on the axis 1.0e-12, all of it the 1e-12 rad offset; gradient 2.4e-11 and divergence 1.7e-11 at a 1,000 m step (1.4e-10 and 2.4e-10 at 100 m, so the step is not shortened); J2 against `gravityJ2` 5.1e-16; J2 to J4 against the propagator's terms 6.5e-16. The 437 numbers are about 10.5 kB as text, under the 30 kB at which a table becomes a data file.

---

### Task 2: the Sun and the Moon (PF-14)

**The series, settled here** (the spec said "the shortest series that meets the bounds"): ERFA's two, whole. The Moon is `moon98` (Meeus 1998, from ELP2000-82), which returns the geocentric position and velocity on GCRS axes. The Sun comes from `plan94` (Simon et al. 1994) for the Earth–Moon barycentre, with the Earth taken off the barycentre by the Moon of `moon98`. A whole published series can be held to its own reference implementation term by term, to a millimetre; a series cut short for this app could only be held to the 0.01° accuracy bound. The two C files are 24 kB and 22 kB of source, and of `plan94` only the third body's rows are needed (S20 amendment 14).

**Files:**
- Create: `src/astro/base/sun-moon.ts`, and `src/astro/base/sun-moon-tables.ts` for the tables: `MOON98_LR` (the 60 rows of `tlr` in `moon98.c`, six numbers a row), `MOON98_B` (the 60 rows of `tb`, five numbers a row), and `PLAN94_EMB`, an object holding the third entry of `amas` and the third row of each other table of `plan94.c`, under the C names (`amas`, `a`, `dlm`, `e`, `pi`, `dinc`, `omega`, `kp`, `ca`, `sa`, `kq`, `cl`, `sl`)
- Create: `tests/astro-sun-moon.test.ts`
- Create: `tests/fixtures/astro/sun-moon/make_erfa_fixture.py`, `tests/fixtures/astro/sun-moon/erfa-sun-moon.json`
- Create: `tests/fixtures/astro/sun-moon/make_de421_fixture.py`, `tests/fixtures/astro/sun-moon/de421-sun-moon.json`
- Modify: `NOTICE.md` (the ERFA entry names `moon98.c`, `plan94.c` and the two new files)

**Interfaces:**
- Consumes: `Jd2` from `./time`; `V3` from `./geodesy`; `State`, `FRAME_BIAS`, `matT`, `matVec` from `./frames`.
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
- `sunState`: with B = `FRAME_BIAS` and μ = `EARTH_MOON_MASS_RATIO`, r = −(Bᵀ·r_emb − r_moon / (1 + μ)), and the same for the velocity.
- The time argument is TT for all three. `plan94` is defined on TDB; TT is within 1.7 ms of it, in which the Earth moves 50 m, and the fixture is formed the same way.
- Positions are geometric: where the body is at the instant, with no light time and no aberration. That is what a force model takes. The direction the Sun is seen in differs by 0.0057° (aberration); nothing in this base applies it.
- `plan94` is fitted to 1000–3000 and ERFA returns a warning status outside; these functions return the same numbers as ERFA there and report nothing.
- Stated accuracy, from the pre-check: over 1950–2050 the Moon is within 0.0051° and 0.0035 % in distance of JPL DE421, the Sun within 0.0022° and 0.0009 %.

- [ ] **Step 1 (reference author): the ERFA fixture.** `make_erfa_fixture.py` writes, at 60 TT instants in two parts, `moon98`, `plan94` for body 3, and the Sun formed from them as above with the `rb` of `erfa.bp00(2451545.0, 0.0)`, all in metres and metres per second. The instants: for i from 1 to 50, `jd = 2415020.5 + 73,049·H₂(i)` (1900 to 2100), stored as `a = floor(jd − 0.5) + 0.5`, `b = jd − a`; then ten by hand: {2451545.0, 0}; {2451545.0, 0.5}; {2400000.5, 51544.5}; 1950-01-01 0 h; 2050-01-01 0 h; 1969-07-20 20:17; 2026-09-15 12:00; 2024-03-20 12:00; and the years 999 and 3001 on January 1, which are outside the years `plan94` is fitted to (its status is 1 there). No checksum of the tables is needed, because the bounds of Step 3 see every entry: the smallest non-zero coefficients of `moon98.c` are 0.000294° in longitude, 0.000107° in latitude and 1,117 m in distance, each 700 m or more at the Moon, and one unit of the smallest column of `plan94.c` is 15 km. The script asserts those three smallest values from the C sources when the environment variable `ERFA_SRC` names their folder.

- [ ] **Step 2 (reference author): the DE421 fixture.** `make_de421_fixture.py` loads `de421.bsp` with Skyfield (`load('de421.bsp')` downloads it; 16,788,480 bytes, SHA-256 `a20a7139da04cbc462454634918e9a9ca69127044e2cc9d4f9c16e238d2deedc`, which the script checks and the fixture carries) and writes, at 400 TT instants, `jd = 2433282.5 + 36,525·H₂(i)` for i from 1 to 400 (1950 to 2050), split as above, the geometric geocentric position and velocity of the Moon and of the Sun: `eph[body].at(t).position.m − eph['earth'].at(t).position.m` with `t = ts.tt_jd(jd)`, and the same for `.velocity.m_per_s`. The kernel is not committed.

- [ ] **Step 3 (reference author): the failing test**, `tests/astro-sun-moon.test.ts`:

| Case | Assertion |
|---|---|
| `the Moon equals ERFA` | at the 60 instants, position within 1e-3 m and velocity within 1e-8 m/s |
| `the Earth–Moon barycentre equals ERFA` | position within 1e-1 m, velocity within 1e-6 m/s |
| `the Sun equals ERFA's two series combined` | position within 1e-1 m, velocity within 1e-6 m/s. The Moon's term is 4,600 km of this, so a Sun taken from the barycentre alone fails here |
| `the tables have the source's shape` | `MOON98_LR` 60 rows of 6, `MOON98_B` 60 rows of 5; in `PLAN94_EMB`, `amas` is one number, `a`, `dlm`, `e`, `pi`, `dinc`, `omega` have 3 numbers each, `kp`, `ca`, `sa` have 9, `kq`, `cl`, `sl` have 10 |
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
- Create: `tests/astro-kepler.test.ts`
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
- The Stumpff functions must not lose digits near zero. The textbook forms, (1 − cos √ψ)/ψ and (√ψ − sin √ψ)/√ψ³ with a series only below |ψ| = 1e-6, lose six digits just above that switch: 2.4e-2 m and 7.4e-7 m/s on a near-parabolic orbit, which fails this task's bounds. A half-angle form for c₂ and the series for both wherever |ψ| < 1 hold 3.2e-6 m (S20 amendment 14).
- `dt = 0` returns the input state, number for number. `dt` may be negative.
- `mu` has no default: the base holds no Earth constant of its own beside the gravity field's.
- A state with r = 0, or `mu` ≤ 0: NaN in every number. A state with r ∥ v (straight-line motion) is outside the contract; no test reads it.
- When the callers switch (W-O), this function replaces only the e ≥ 1 fallback inside `propagateKepler` (`src/physics/orbital.ts`); the elliptic path of that function is kept as it is, which the pin of Step 2 guards.

- [ ] **Step 1 (reference author): the mpmath fixture.** `make_kepler_fixture.py` solves each case at 80 digits by the classical route, which shares nothing with the universal variable: elements from the state; then the hyperbolic anomaly from e·sinh H − H = M, or the eccentric anomaly from E − e·sin E = M, by Newton's method to 1e-60; the state rebuilt in the perifocal frame. Eighty digits because that route loses as many digits as 1 − e has zeros. (`kepler_reference` of `tests/fixtures/astro/evidence/pf15_kepler_precheck.py` is that route and may be reused.) The cases, with μ = 3.986004418e14: every combination of
  - e in {0, 0.001, 0.1, 0.6, 0.9, 0.99, 0.999, 1 − 1e-6, 1 − 1e-9, 1 − 1e-12, 1, 1 + 1e-12, 1 + 1e-9, 1 + 1e-6, 1.001, 1.04, 1.5, 3, 10};
  - perigee radius in {6.578e6, 2.0e7} m;
  - true anomaly at the start in {−2, −0.3, 0, 0.8} rad, leaving out, for e ≥ 1, any within 0.2 rad of the asymptote (|ν| ≥ acos(−1/e) − 0.2);
  - dt in {600, 3600, 21600, 86400, −3600} s;

  the state built in doubles from p = r_p(1 + e), r = p/(1 + e cos ν), v = √(μ/p)·(−sin ν, e + cos ν, 0), turned by Ω = 0.4, i = 0.9, ω = 1.1 rad. For e = 1 the speed is then scaled to √(2μ/r), which is as parabolic as doubles allow; the reference takes the state as stored, whatever its exact eccentricity. Each case stores e, the two input vectors, dt and the two output vectors, 17 significant digits. About 740 cases.

- [ ] **Step 2 (reference author): the pin of today's elliptic path.** `make_elliptic_pin.mjs` takes the path of a bundle of `src/physics/orbital.ts` (made with `node_modules/.bin/rolldown src/physics/orbital.ts --format esm --file <scratch>/orbital.mjs`; Node cannot import the source file itself) and writes `today-elliptic.json`: 200 states from the Halton sequence, index from 1, built with the bundle's own `stateFromElements(a, e, i, raan, argp, nu, mu)` with `MU_EARTH`: perigee radius 6.5e6 + 3.55e7·H₂ m, e = 0.95·H₃, i = π·H₅, Ω = 2π·H₇, ω = 2π·H₁₁, ν = 2π·H₁₃, and dt = 86,400·(2·H₁₇ − 1) s; then four by hand at perigee radius 2.0e7 m, ν = 0.8, the same angles as Step 1, dt = 3,600 s: e = 0.99, 0.999, 1 − 1e-6, 1 − 1e-9. For each, the input state, dt, and what `propagateKepler(r, v, dt)` returns today. The script asserts that no stored number is zero (a JSON zero loses its sign) and that every case took the elliptic path.

- [ ] **Step 3 (reference author): the failing test**, `tests/astro-kepler.test.ts`:

| Case | Assertion |
|---|---|
| `equals the 80-digit solution, every conic` | every case of the fixture: position within 1e-3 m, velocity within 1e-7 m/s. The spec's bound of 1 m for e ≥ 1 is inside this |
| `a step of zero returns the state` | `keplerUniversal(s, 0, mu)` equals `s`, `toBe` per number, for one case of each e |
| `there and back` | for the cases with dt = 3,600 and 86,400: `keplerUniversal(keplerUniversal(s, dt, mu), −dt, mu)` is within 1e-2 m and 1e-5 m/s of `s` |
| `keeps angular momentum and energy` | for every case: \|r × v\| changes by ≤ 1e-11 relative; v²/2 − μ/r changes by ≤ 1e-11·μ/\|r₀\| |
| `ends on extreme inputs` | dt = 1e12 s on the e = 10 orbit, and dt = ±1e9 s on the e = 0.001 orbit, each return six finite numbers within 50 ms |
| `agrees with the app's present elliptic path where that is sound` | for the fixture's cases with e ≤ 0.99: within 0.5 m and 5e-4 m/s of `propagateKepler(r, v, dt)` of `src/physics/orbital.ts`. The present function is the looser side: against the 80-digit solution it is off by up to 9.0e-2 m and 7.1e-5 m/s there |
| `today's elliptic results, pinned` | for every case of `today-elliptic.json`: `propagateKepler` returns the stored numbers, `toBe` per number. This case passes from the start; it is what "elliptic results bit-identical to today's" is checked against when the fallback is replaced |
| `bad input` | r = 0, `mu` = 0 and `mu` < 0 give NaN in every number; NaN, +∞ and −∞ in each component, in `dt` and in `mu` give NaN in every number; nothing throws |

  Run it. Expected: the pinned case passes, the others fail because `src/astro/base/kepler.ts` does not exist.

- [ ] **Step 4 (reference author): the integrator tests**, `tests/integrator-convergence.test.ts`. These read today's code and pass from the start; they are measurements frozen as bounds, each with the measured value beside it.

| Case | Assertion |
|---|---|
| `rk4Step is fourth order, circular orbit` | `rk4Step` of `src/physics/integrator.ts` with a point-mass acceleration (−`MU_EARTH`·r/r³), from r = (7.0e6, 0, 0), v = v_c·(0, cos 0.9, sin 0.9), for 1,200 s with steps h = 40, 20, 10 and 5 s; the error is the distance from the exact position on the circle. Each of the three ratios err(h)/err(h/2) is in [15, 17] (measured 16.46, 16.23, 16.12), and err(10 s) ≤ 5e-3 m (measured 1.09e-3) |
| `rk4Step is fourth order, through a perigee` | e = 0.6, perigee radius 6.678e6 m, in the plane z = 0, from 600 s before perigee to 600 s after, the same four steps; the exact end from Kepler's equation solved to convergence. The three ratios are in [15, 17] (measured 16.02, 16.01, 16.01) |
| `Dormand–Prince answers to its tolerance` | `propagate([7.0e6, 0, 0], [0, v_c cos 0.9, v_c sin 0.9], 2461310.5, { method: 'cowell', duration: 43200, forces, spacecraft: { mass: 1, area: 0, cd: 0, cr: 0 }, samples: 4, tolerance })` of `src/physics/propagator/propagate.ts`, with `forces = { j2: false, j3j4: false, drag: false, sun: false, moon: false, srp: false, activity: ECSS_LEVELS.moderate }` (`src/physics/propagator/activity.ts`). The error is \|a − 7.0e6\| of the last sample, which two-body motion keeps at zero. At the default tolerance, 1e-10: ≤ 0.1 m (measured 1.26e-2). Each ratio of the errors at 1e-6, 1e-8, 1e-10 and 1e-12 to the next is in [30, 300] (measured 107, 75, 96) |
| `the point-mass step schedule: halving the step` | a headless `Simulation` (`src/physics/simulation.ts`) of `{ vehicleId: 'falcon9', satelliteId: 'starlink', siteId: 'cape', orbit: orbitById('iss'), launchTime: new Date(Date.UTC(2026, 8, 15, 12, 0, 0)), guidance: { ...DEFAULT_GUIDANCE }, failure: { ...DEFAULT_FAILURE }, boosterRecovery: false }`, stepped as `sim.step(Math.min(sim.suggestedDt() / k, until − sim.state.t))` until `sim.state.t` reaches `until`, for k = 1, 2 and 4. The distance between the k = 1 and k = 2 states, in position and in velocity, is at most: at 60 s, 30 m and 2 m/s (measured 11.9 and 0.77); at 150 s, 800 m and 10 m/s (335 and 4.17); at 300 s, 2,500 m and 12 m/s (1,098 and 5.00); at 500 s, 3,000 m and 16 m/s (1,267 and 6.78). At each of the four times the k = 2 to k = 4 distance in position is smaller than the k = 1 to k = 2 one (measured 7.3, 162, 460, 896 m) |

  The last case measures the flight as it is today. Its numbers belong to the flight's own outputs: the batch that re-records the Launch fingerprints (W-L) lists this file among what it re-measures.

- [ ] **Step 5 (implementer): `kepler.ts`.** Hyperbolic cases first, then e = 1 and its two neighbours, then the ellipses.
- [ ] **Step 6 (implementer): run** `tests/astro-kepler.test.ts` and `tests/integrator-convergence.test.ts`, then the hand-off runs.
- [ ] **Step 7 (implementer): two deliberate breaks.** Replace the Stumpff functions by the textbook forms with a series below |ψ| = 1e-6 only; change one coefficient of the c₃ series. Record the failing cases; restore.
- [ ] **Step 8 (implementer): report, fragment, commit.** `docs/development/reports/PF-15-kepler.md`: the measured worst differences per case; the breaks; and, as findings about today's code that this task does not change, the table of "Pre-checked" below. `changes/claude-p-pf15-s1.md`. Commit as `Astro (PF-15): Kepler propagation for every conic, held to an 80-digit solution; convergence tests for the integrators`.

**Pre-checked** (`pf15_kepler_precheck.py`, `pf15_today_kepler_probe.ts.txt`, `pf15_integrator_precheck.ts.txt`):
- A universal-variable step in doubles with careful Stumpff functions against the 80-digit route, 1,110 cases (the fixture's set and a third perigee radius, 1.0e8 m): worst 3.2e-6 m and 4.6e-10 m/s; the textbook forms give 2.4e-2 m and 7.4e-7 m/s. Angular momentum kept to 9.8e-14, energy to 4.0e-14 of μ/r₀; there and back leaves 7.9e-5 m and 9.4e-8 m/s.
- Today's e ≥ 1 fallback, transcribed: 5.78 km off after 600 s and 61.3 km after an hour, for e = 1.04 from a 200 km perigee.
- Today's elliptic path against the 80-digit solution, worst over 40 cases for each eccentricity: e ≤ 0.1, 8.1e-7 m; e = 0.6, 9.0e-2 m; e = 0.9, 8.8e-7 m; 1 − e = 1e-2, 4.9e-5 m; 1e-3 and 1e-4, 0.43 m; 1e-6, 29 m; 1e-8, 23 km; 1e-10, 13,000 km. An orbit that close to escape is rare in this app, and the path is not changed by this task; where the switch at e = 1 should sit is a question for W-O's plan, because moving it changes elliptic outputs.
- The point-mass step schedule converges at about first order, not fourth: halving the step again divides the difference by 1.4 to 2.4. The integrator itself is fourth order (the first two cases); the rest comes from what happens between steps. It is a finding for the gate's report, not a defect this task repairs.

---

### Task 4: reference trajectories (PF-16)

**The reference, settled here:** Orekit runs in the cloud environment. Version 13.1.9 through the Python package `orekit_jpype` 13.1.9.0 with `jpype1` 1.7.1 on Java 21, with the data set of <https://gitlab.orekit.org/orekit/orekit-data> at commit `2d6edc9118983d95c51303df05db16ada90b7ee2` (the archive `orekit-data-main.zip` of that commit: 21,153,768 bytes, SHA-256 `a61e1384911b049ff1a7b2e054dcdb61dbed199077fdd0d5113eb3b0daa5b046`). The spec's fallback, a Python integrator anchored by a real orbit arc, is not needed.

**What this task delivers, and what it does not.** The base has no propagator yet: the numerical propagator moves onto it at W-O. So this task delivers (a) an error budget with a bound for every orbit and every term, committed before any reference number exists; (b) the reference trajectories; (c) a test that ties the reference to the base's own modules, one ingredient at a time, so that a miss at W-O can be traced to a term. The comparison of a propagator with the trajectories is W-O's.

**Files:**
- Create: `docs/development/reports/PF-16-trajectories.md`
- Create: `tests/fixtures/astro/trajectories/requirements-orekit.txt`, `tests/fixtures/astro/trajectories/README.md` (how to make the environment, fetch the data set, check its hash)
- Create: `tests/fixtures/astro/trajectories/make_trajectories.py`, and its output: `orekit-ties.json` and one `orekit-<orbit>.json` for each of the six orbits
- Create: `tests/astro-trajectories.test.ts`

**Interfaces:**
- Consumes: `keplerUniversal` (Task 3), `EGM2008_20` and `fieldAcceleration` (Task 1), `moonState` and `sunState` (Task 2), `framesAt`, `jd2` and the time functions (wave 1). The gravity excerpt `tests/fixtures/astro/gravity/EGM2008-to-20.gfc` of Task 1.
- Produces: no source module.

**The orbits.** Epoch 2024-03-20 12:00:00 UTC: the Earth-orientation data are final there, and it is the equinox, so the geostationary orbit crosses the Earth's shadow. Osculating elements in GCRF, with the field's GM:

| Name | a (m) | e | i | Ω | ω | ν | Span |
|---|---|---|---|---|---|---|---|
| `station` | 6,778,137 | 0.001 | 51.6° | 20° | 60° | 0° | 1 day |
| `sun-synchronous` | 7,078,137 | 0.001 | 98.19° | 80° | 90° | 0° | 1 day |
| `gps` | 26,559,800 | 0.01 | 55° | 120° | 30° | 0° | 3 days |
| `geostationary` | 42,164,170 | 0.0003 | 0.05° | 0° | 0° | 200° | 3 days |
| `transfer` | 24,396,137 | 0.728312 | 27° | 10° | 178° | 0° | 2 days |
| `molniya` | 26,554,000 | 0.72 | 63.4° | 250° | 270° | 180° | 2 days |

The spacecraft: 1,000 kg, 10 m² for radiation with coefficient 1.5, 10 m² for drag with coefficient 2.2.

**The levels,** each adding one term to the one before:

| Level | Force model in Orekit |
|---|---|
| A | two-body, GM 3.986004415e14 |
| B | A and J2: `HolmesFeatherstoneAttractionModel` on the provider of degree 2, order 0 |
| C | the whole field to degree and order 20, in place of B's |
| D | C, with `ThirdBodyAttraction` of the Sun and of the Moon (`CelestialBodyFactory`; the data set's DE-440 file) |
| E | D, with `SolarRadiationPressure(sun, earth, IsotropicRadiationSingleCoefficient(10, 1.5))`, the Earth a `OneAxisEllipsoid(6378137, 1/298.257223563, itrf)` |
| F | E, with `DragForce(SimpleExponentialAtmosphere(earth, 3.0e-12, 400e3, 60e3), IsotropicDrag(10, 2.2))`; `station` and `transfer` only |

The field is loaded explicitly, never Orekit's default (which is EIGEN-6S, radius 6,378,136.46): the generator copies Task 1's excerpt to a scratch folder with `max_degree` rewritten to 20, registers the folder with a `DirectoryCrawler`, clears the potential readers, adds `ICGEMFormatReader('<name>', False)`, and asserts that the provider reports GM 398600441500000.0, radius 6378136.3 and `TIDE_FREE`. Frames: `FramesFactory.getGCRF()` and `getITRF(IERSConventions.IERS_2010, True)`. Drag is checked with an exponential atmosphere on both sides so that the mechanics of the term are tested apart from any density model; the density models themselves are plan S20's tier 3.

**Integration:** `DormandPrince853Integrator(1e-3, 300, …)` with `NumericalPropagator.tolerances(1e-9, orbit, OrbitType.CARTESIAN)`, Cartesian orbit type, the propagator's `mu` set to the field's GM. Each trajectory is run a second time at 1e-7 m; the largest position difference between the two runs is stored as that trajectory's `noise`.

- [ ] **Step 1 (budget author): the error budget and the bounds, before any reference number.** In `docs/development/reports/PF-16-trajectories.md`, one table: a row for each orbit and level (26 rows), and for each the bound, in position and in velocity at the end of the span, that the propagator on the new base must meet against the reference at W-O. Each bound is the sum of its causes times a margin of at least 3, with the causes written out. The causes and where their sizes come from, none of them a trajectory:
  - the frames: the base's IAU 2000B chain against Orekit's IERS 2010 chain with the celestial-pole corrections of the data, a rotation of at most 2 mas (PF-11's bound; the pre-check measured 0.52), acting on the non-central field;
  - the Sun and the Moon: the base's series against DE-440, at most 0.01° in direction and 0.05 % or 0.1 % in distance (Task 2's bounds; measured 0.0013° and 0.0008° at this epoch), acting on the third-body term;
  - radiation pressure: the solar constant each side uses and the shadow model, Orekit's taken from its documentation for the version pinned;
  - the two integrations: the reference's noise is bounded by 1e-2 m here, and a row whose bound would be within a hundred times of the noise found in Step 2 is marked as not usable;
  - nothing for the field's constants and coefficients, which are the same on both sides.

  The size of a term over each span is needed to turn a relative error into metres. Use the pre-check's figures below; they describe the physics, not the comparison. This step is committed alone, as the branch's first commit, before Step 2 starts. The budget author is a different seat from the reference author.

- [ ] **Step 2 (reference author): the environment and the generator.** `requirements-orekit.txt` pins `orekit_jpype==13.1.9.0` and `jpype1==1.7.1`, beside the pins of `../requirements.txt`. `make_trajectories.py <orekit-data zip> <a scratch folder>` checks the archive's hash and writes:
  - `orekit-<orbit>.json`: the versions, the data set's commit and hash, the elements, the spacecraft, and for each level the state (GCRF position and velocity, m and m/s) at the epoch and every 3,600 s to the end of the span, and the level's `noise`;
  - `orekit-ties.json`: (i) at 200 Earth-fixed points (Halton as Task 1, distance `radius + 200e3 + 35.8e6·H₅(i)²`), the acceleration of the level-C field, the central term plus `HolmesFeatherstoneAttractionModel.gradient(date, position, mu)`; (ii) at the epoch and every hour for 72 hours, the UTC date in two parts, Orekit's UT1 − UTC and pole (`FramesFactory.getEOPHistory(IERS_2010, True)`: `getUT1MinusUTC`, `getPoleCorrection`) and its GCRF→ITRF rotation matrix; (iii) at the same instants, the TT date in two parts and Orekit's geocentric Sun and Moon positions in GCRF; (iv) the GM Orekit uses for the Sun and for the Moon, and the reference pressure and shadow model of its radiation term, read from the objects, not from memory.

- [ ] **Step 3 (reference author): the failing test**, `tests/astro-trajectories.test.ts`:

| Case | Assertion |
|---|---|
| `two-body: the reference is a Kepler orbit` | for each orbit, level A at every stored time is within 1e-3 m and 1e-6 m/s of `keplerUniversal(state at the epoch, t, 3.986004415e14)` |
| `the field: Orekit's acceleration equals the base's` | at the 200 points, `fieldAcceleration(EGM2008_20, r)` is within 1e-12 relative |
| `the frames: Orekit's Earth-fixed frame against the base's` | at the 73 instants, the rotation between Orekit's matrix and `framesAt(utc, { dut1, xp, yp }).gcrfToItrf` with Orekit's three values is ≤ 9.7e-9 rad (2 mas) |
| `the Sun and the Moon: Orekit's against the base's` | at the 73 instants: direction within 0.01° for both, distance within 0.1 % for the Sun and 0.05 % for the Moon |
| `the reference is steady` | every stored `noise` is ≤ 1e-2 m at levels A to E, and ≤ 0.5 m at level F |
| `the node moves as J2 says` | for `station`, the right ascension of the node at the end of level B, from the state by the usual formulas (h = r × v, n = ẑ × h, Ω = atan2(n_y, n_x)), has moved from 20° by within 1 % of the first-order secular rate, −1.5·n·J2·(R/p)²·cos i, over the day, with J2 = −√5·C̄(2,0) of the field |
| `the files are whole` | each trajectory file names the versions, the data set's hash and the six elements of the table above, `toBe`; each level holds span/3,600 + 1 states of six finite numbers |

  Run it. Expected: the cases fail until the generator has written the files; with the files present and Tasks 1 to 3 merged, they pass. There is no source module in this task, so the "implementer" of the seats is the reference author's second half, and the reviewer checks both the budget's arithmetic and that Step 1's commit precedes any fixture.

- [ ] **Step 4 (reference author): a measurement, recorded and not asserted.** Today's propagator (`propagate` with `method: 'cowell'`) returns elements at its samples, not states. For the six orbits at levels A to E, with today's nearest force switches, record in the report the differences in a, e, i, Ω at the end of the span against the reference's elements there. This is the "never checked at state level" class of the spec's §4 given a number; it is replaced at W-O.
- [ ] **Step 5: one deliberate break of the test's own.** Feed the frames tie UT1 − UTC = 0; give the field tie the app's `R_EARTH` as the radius. Record the failing cases; restore.
- [ ] **Step 6: report, fragment, commit.** The report already holds Step 1; add the ties' measured values, the noise per trajectory, Step 4's table, and which budget rows the noise leaves usable. `changes/claude-p-pf16-s1.md`. Commit as `Astro (PF-16): reference trajectories from Orekit for six orbits, tied to the base term by term; the error budget written first`.

**Pre-checked** (`pf16_orekit_trial.py`): the field loaded as described reports GM 398600441500000.0, radius 6378136.3, TIDE_FREE, and its acceleration is within 2.0e-15 relative of a Cunningham recursion in doubles at 200 points. Orekit's GCRF→ITRF is within 0.52 mas of ERFA's IAU 2000B chain fed Orekit's own UT1 − UTC and pole, over 73 hours from the epoch (0.37 mas of the full IAU 2006/2000A chain; the remainder is the celestial-pole corrections of the data). Orekit's Sun and Moon are within 216 m and 3.2 m of DE421, and ERFA's series within 3,323 km and 5.1 km of Orekit's, which is 0.0013° and 0.0008°. Levels A to F ran for all six orbits in 6 s:

| Orbit | Level A against Kepler | 1e-6 m against 1e-9 m, all terms | J2 adds | rest of the field | Sun and Moon | radiation | drag |
|---|---|---|---|---|---|---|---|
| `station`, 1 d | 7.5e-6 m | 8.1e-2 m | 307.7 km | 13.4 km | 100 m | 5.1 m | 17.4 km |
| `sun-synchronous`, 1 d | 4.1e-7 m | 1.4e-4 m | 2,066 km | 15.3 km | 67 m | 1.9 m | — |
| `gps`, 3 d | 1.8e-6 m | 1.7e-6 m | 59.9 km | 1.70 km | 8.54 km | 505 m | — |
| `geostationary`, 3 d | 6.3e-6 m | 1.7e-4 m | 59.0 km | 5.60 km | 20.8 km | 1.38 km | — |
| `transfer`, 2 d | 1.1e-6 m | 8.3e-3 m | 2,075 km | 10.9 km | 6.28 km | 92 m | 13.1 km |
| `molniya`, 2 d | 2.1e-6 m | 9.9e-5 m | 100.6 km | 1.39 km | 2.60 km | 77 m | — |

The `station` node under J2 alone moves −5.0140° in the day against −5.0023° by the secular rate (+0.23 %). The noise column compares 1e-6 m with 1e-9 m; the plan's pair, 1e-7 m with 1e-9 m, was not run, and the `reference is steady` bound for level F (0.5 m) is set from the 8.1e-2 m measured with the coarser pair.

---

### Task 5: documents brought to the code (PF-03)

**The work order** is §5 of [the audit record](../reports/physics-audit-2026-11-26.md): 28 rows, each a place in a document, what it says, what the code does and where. That section's own rule governs the work and is repeated in the brief word for word.

**Files:**
- Modify: Markdown files only, those the rows name (`docs/PHYSICS.md`, `docs/VALIDATION.md`, `docs/IMPLEMENTATION-STATUS.md`, `docs/ROADMAP-PART2-3.md`)
- Create: `docs/development/reports/PF-03-documents.md`, `changes/claude-p-pf03-s1.md`

**What the rule and this plan settle:**
- Every row is checked against today's code before its document is changed: the audit read, it did not run, and line numbers have moved. A row whose claim no longer holds is recorded as "no longer true" and its document is left alone.
- Rows 13, 14, 15, 18 and 27 cite a test that does not exist: the sentence is reworded to what a test does show, and the missing test is listed in the report as a gap for the package that owns the model. No test is written.
- Rows 22, 23 and 24 are counts only a run can give. They are not recounted by reading. They are left as they stand and listed in the report as waiting for the track's first heavy and fleet run.
- Row 28 is package LV-2's and is not touched.
- Four rows also name a comment in a source file: row 7 (`src/data/parts.ts:4-5`), row 8 (`src/design/static-fire.ts:31-32`), row 11 (`src/orbit/sgp4.ts`, its header) and row 12 (`src/physics/propagator/propagate.ts`, its header). This package is Markdown only, and a comment edited under `src/physics`, `src/orbit` or `src/data` selects every heavy and fleet test. Those four comments are not edited; the report lists each with the wording it should get, for the batch that next edits the file (W-O for rows 11 and 12).
- A corrected figure is taken from the code or from a test's assertion, with the file and line in the report. A figure the audit marked "by hand" is not copied into a document: the sentence is reworded so that it no longer states a number the code does not hold.

- [ ] **Step 1 (writer, small tier): verify the 27 rows**, one at a time, and fill the report's table: row, the document's sentence today, the code's fact today with file and line, and one of "corrected", "reworded, gap recorded", "waits for a run", "source comment, carried", "no longer true".
- [ ] **Step 2 (writer): make the edits**, one commit. Each edit changes the sentence the row names and nothing around it.
- [ ] **Step 3 (writer): run** `npx vitest run tests/repo-hygiene.test.ts`, which the change map selects for Markdown, and check that every relative link in the changed files resolves.
- [ ] **Step 4 (reviewer, middle tier):** every edit against the code it cites, and every row's verdict; the diff holds no file that is not Markdown.
- [ ] **Step 5: fragment, pull request.** A pull request of Markdown only does not start CI in this repository; the evidence is the reviewer's row-by-row check and Step 3. Commit as `Docs (PF-03): the documents brought to the code, from the audit's list`.

---

### Task 6: two suspected silent wrong answers, diagnosed (PF-04)

**The suspects** are §6 of [the audit record](../reports/physics-audit-2026-11-26.md). Neither was seen in a running app.

1. *The station transfer that keeps its first guess.* `src/physics/sim/rendezvous.ts:262-267`: when `interceptImpulse` (`src/physics/rendezvous/targeting.ts`) does not converge it returns `null`, and the burn is flown with the first guess from `raiseImpulse`, with no flag, event or message.
2. *The Lambert plan solved for two bodies and flown with J2.* `lambert` in `src/orbit/maneuvers.ts` is a two-body solver; the plan it makes (`src/orbit/maneuver-setup.ts`) is flown with the J2 toggle. The audit computed a miss of 15 to 58 km with a script that was not kept; `tests/maneuvers.test.ts:296` flies the plan with J2 off only.

**What this task delivers:** for each suspect a diagnosis made with the app's own code, and either a test that pins the defect or a recorded "not reached". No source file is edited: a fix touches `src/physics` or `src/orbit` and lands in the batch that owns the seam (the station transfer in W-L, the Lambert plan in OE-4), with that batch's own failing test.

**Files:**
- Create: `tests/rendezvous-transfer-fallback.test.ts`, `tests/lambert-j2.test.ts`
- Create: `docs/development/reports/PF-04-silent-answers.md`, `changes/claude-p-pf04-s1.md`

**The form of the tests.** The suite must stay green and the right behaviour after a fix is the fixing batch's design, so each test pins what the app does today, under a title that says it is a known defect and names this package, and its file's header says which batch replaces the assertion. A test that only shows a function was called is not a pin: it asserts a number or a state.

- [ ] **Step 1 (diagnosis): the station transfer.**
  - *Is the fallback reached?* Wrap `interceptImpulse` with `vi.mock` of `src/physics/rendezvous/targeting` (the original function, counted, with its arguments and whether it returned `null`), and fly to the station in point mass over a sweep: every profile and every port the app offers, at twelve launch times spread over a day. `tests/rendezvous.test.ts` shows how such a flight is set up and runs 22 cases in 4 s, so the sweep costs minutes. Record how many transfer burns were solved and how many returned `null`.
  - *How far is the solver from failing?* Call `interceptImpulse` directly on the transfer states the sweep recorded, displaced in position, in velocity and in time of flight by growing amounts, and record the smallest displacement at which it returns `null`, beside the largest spread the sweep itself showed between flights.
  - *What does a fallen-back burn cost?* For one recorded state, compare the guess with the solved impulse and fly both to arrival.
- [ ] **Step 2 (the test for suspect 1).** If a flight of the sweep reached the fallback: `tests/rendezvous-transfer-fallback.test.ts` flies that one case and pins the miss at arrival and the absence of any event that says the solver failed. If none did: the test pins the margin instead, the solver converging on the nominal transfer and returning `null` at the displacement found, and the report says "not reached in N flights; margin ×M over the spread seen".
- [ ] **Step 3 (diagnosis and test for suspect 2).** Reproduce the audit's case with the app's own functions: the plan of `rendezvous()` / `makePlan` for a 400 km to 800 km transfer over 165°, flown as `tests/maneuvers.test.ts:296` flies it, once with J2 off and once on, at i = 51.6°, 98° and 0°. `tests/lambert-j2.test.ts` pins the arrival miss in each of the six flights inside a window around the measured value (the window stated beside the number, a factor of two each way), and the report says whether the planner's code path gives the user any sign that the plan is two-body (by reading `src/ui`; no journey is added).
- [ ] **Step 4: run** the two new files, and `tests/rendezvous.test.ts` and `tests/maneuvers.test.ts` once to show they are untouched; then the hand-off runs for the changed files.
- [ ] **Step 5 (reviewer, large tier):** reads the two diagnoses against the code; judges whether "not reached" is supported by the sweep's breadth; checks that no source file changed.
- [ ] **Step 6: report, fragment, commit.** The report gives, for each suspect: reached or not, with the numbers; the size of the wrong answer; what the user sees; which batch owns the fix and what its failing test should assert. Commit as `Tests (PF-04): the station-transfer fallback and the two-body Lambert plan under J2, diagnosed and pinned`.

---

### Task 7: size headroom (T-1) is not dispatched from this plan

The spec describes T-1 as FX-4's shared runner, then EQ-8, "workers as ES modules sharing the physics chunk", with an estimate of −2.75 MB. Two measurements made for this plan on main at `26d6565` say it needs a work plan of its own first.

- **The setting alone frees nothing.** With `worker: { format: 'es' }` added to `vite.config.ts` and nothing else changed, `npx vite build` and `node scripts/bundle-budget.mjs` give a precache code of 15,200.4 kB against 15,198.5 kB without it: the twelve worker bundles together are 1.9 kB larger, not smaller (`flight` 571.0, `tune` 543.0, `monte-carlo` 541.3, `ratings` 550.5, `readiness` 564.6, `recheck` 879.7 kB with the setting). Each worker is still built as a bundle of its own; the format does not make two workers share a chunk. The workers are already created with `{ type: 'module' }` in the source.
- **The shared runner is not in the code.** FX-4 ([S10 §10.7](S10-r16-fx-data-safety.md)) has four steps; the only part merged is #233, which changed one job wrapper (`src/physics/lifetime-job.ts`: a stopped lifetime run no longer gives an answer). `serveJob` appears nowhere under `src`, and the eleven job wrappers still each create their own worker. Steps 2 to 4 change messages the user reads, in three languages, which are the owner's to see before they merge.

What T-1's own plan has to settle, in this order:

1. How workers come to share code under this build tool: the candidates are worker entries built as entries of the main graph, one worker that dispatches every job (S09's quality guard names it), or a manual chunk for the physics core. One scratch build of each, measured with `bundle-budget.mjs`, answers it; none is merged.
2. Whether that route needs FX-4's runner at all, or only EQ-8's first pull request (M-PLATFORM-033). If it does not, T-1 shrinks to the size work and FX-4's message changes stay in their own lane.
3. The identical-output evidence S09 lists for EQ-8 (fingerprints across the old and the new build, the serialized deltas byte for byte, a seeded Monte Carlo CSV), and the one heavy and fleet run this track budgets for T-1.
4. The size it must free: the spec's size rule allows the new base 40 kB in the flight core and 60 kB in the Orbit workers, paid once per worker that embeds the core, which is six today.

T-1 must land before W-O or W-L merges (spec §6). Nothing in Tasks 1 to 6 waits for it: no new module is called by the app, so no bundle changes.

---

## After this plan

When Tasks 1 to 6 have merged, the gate of [HANDOVER-S20](../HANDOVER-S20.md) §3.4 follows: the report to the owner, with each model's class and its evidence, the findings listed under "Pre-checked" in Tasks 3 and 4 and in Task 6's report, and the decisions waiting; the change fragments folded; then the detailed plans of W-O and W-L, and T-1's.
