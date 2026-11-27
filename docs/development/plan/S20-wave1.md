# S20 wave 1 — geodesy, time scales and frames of the new base: implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first three modules of the new physics base under `src/astro/base/` (WGS-84 geodesy, time scales, reference frames), each held to an independent reference, none of them called by the app yet.

**Architecture:** A new core area, `src/astro/`, that imports nothing from the rest of `src/` and holds no state. Each module has a reference fixture written by a committed Python script beside it, and one test file. A change-map rule keeps these packages on their own tests, so the heavy and fleet suites are not selected.

**Tech stack:** TypeScript 7 (strict), vitest 5. For fixtures only: Python 3.13 in a virtual environment with pyerfa, Skyfield, jplephem and mpmath.

**Spec:** [S20-physics-foundation.md](S20-physics-foundation.md) (packages PF-02, PF-10, PF-11, PF-12; §7 verification; §8 roles).

**Status, 2026-11-26:** Task 1 is done and merged ([PR #251](https://github.com/ROYIN001/Orbitlab/pull/251)). Tasks 2 and 3 have not been dispatched. Their text below was corrected after Task 1 and before any of their work existed (S20 amendment 8; [HANDOVER-S20](../HANDOVER-S20.md) §5 says why). Start at [HANDOVER-S20](../HANDOVER-S20.md) §3.

## Global constraints

- A task writes only under `src/astro/base/`, `tests/astro-*.test.ts`, `tests/fixtures/astro/**`, its report `docs/development/reports/<package>.md` and its fragment `changes/<branch>.md`. Task 1 also edits the two rule files it names; Tasks 2 and 3 add an ERFA entry to `NOTICE.md`. Nothing under `src/physics`, `src/orbit` or `src/data` is edited: those paths select every heavy and fleet test.
- `src/astro` imports nothing from another `src` folder, uses no DOM or browser global, and has no module-level mutable state.
- Units: radians, metres, seconds; Julian dates where named. A vector is `{ x, y, z }`.
- A non-finite number in any input (NaN, +∞ or −∞ as an argument, a part of a date or a component) gives NaN in every number the function returns, and nothing throws. Two exceptions are named where they occur: `eopAt` of Task 2, which is today's function for every instant, and the three matrix helpers of Task 3, which are plain arithmetic. Each task pins this with one case that walks every argument position of every function, as `tests/astro-geodesy.test.ts` does.
- Two dates in two parts are compared part by part, `((x.a − y.a) + (x.b − y.b))·86400` s, never from their sums: a Julian date in one number has a step of 40 µs.
- The ERFA C sources are read from the pyerfa 2.0.1.5 source archive on PyPI's file host, fetched with curl. `pip download --no-binary` builds the package and does not return.
- Bounds are the spec's. A bound that cannot be met is sent back (spec §8); it is never loosened.
- A fixture is written by its generator script only. The implementer does not edit a fixture or a generator.
- One deliberate break per reference test, made once and undone, recorded in the report with the failure it produced.
- Runs: while developing, the task's own test file. Before hand-off, once: `npm run typecheck`; `npx vitest run` on the unit files that `node scripts/verification/select-checks.mjs --files <the task's files>` lists (the task's test file, `tests/architecture.test.ts` and the three repository-wide files the map adds for any source file); `npx vite build && node scripts/bundle-budget.mjs`, which must print `bundle budget: ok`. Nothing outside `src/astro` imports the new modules, which a search shows, so the bundle cannot change. Task 1 also runs `node --test tests/verification/*.test.mjs`.
- One task, one branch from `origin/main`, one pull request: `claude/p-pf12-s1`, `claude/p-pf10-s1`, `claude/p-pf11-s1`, in that order, each merged before the next is opened. Near 400 changed source lines; a coefficient table is a stated reason to pass it.
- Roles per task (spec §8): a reference author writes the generator, the fixture and the failing test and never sees the implementation; an implementer makes the test pass; a reviewer that wrote neither checks the result. Tasks 1 and 2: middle tier writes, large tier reviews. Task 3: large tier throughout.

## Review focus

Inputs the spec does not spell out and a user of these modules will meet. Each is pinned by a test in the task named.

1. A position at the Earth's centre, on the spin axis, or very far away: the geodetic conversion ends and returns numbers, never hangs or throws (Task 1).
2. NaN or infinite input: NaN comes out in every number returned, nothing throws (Tasks 1, 2, 3; the two exceptions are in "Global constraints").
3. An instant beside a leap second, before 1972, before 1960, or after the last leap second in the table: each has a stated result (Task 2).
4. No Earth-orientation table, or an instant outside its span: values are held or zero and the result says which (Task 2).
5. Angles at their wrap: longitude comes back in (−π, π], sidereal time in [0, 2π) (Tasks 1, 3).

---

### Task 1: WGS-84 geodesy, and the new area's rules (PF-12, PF-02)

> **Done and merged** ([PR #251](https://github.com/ROYIN001/Orbitlab/pull/251); report [PF-12-geodesy.md](../reports/PF-12-geodesy.md)). The text below is kept as it was run. Its Step 6 names two unit files; the change map selects five for these paths, and the corrected "Global constraints" above hold for Tasks 2 and 3.

**Files:**
- Create: `src/astro/base/geodesy.ts`
- Create: `tests/astro-geodesy.test.ts`
- Create: `tests/fixtures/astro/requirements.txt`, `tests/fixtures/astro/README.md`
- Create: `tests/fixtures/astro/geodesy/make_geodesy_fixture.py`, `tests/fixtures/astro/geodesy/erfa-geodesy.json`
- Modify: `scripts/verification/change-map.json` (one rule added, one exclusion)
- Modify: `tests/architecture.test.ts:43` (`CORE_DIRS`) and one new case

**Interfaces:**
- Consumes: nothing.
- Produces:

```ts
export interface V3 { x: number; y: number; z: number }
export const WGS84_A = 6378137;               // m
export const WGS84_F = 1 / 298.257223563;
export const WGS84_B: number;                 // A (1 − F)
export const WGS84_E2: number;                // F (2 − F)
export interface Geodetic { lat: number; lon: number; h: number }  // rad; rad in (−π, π]; m
export function geodeticFromEcef(r: V3): Geodetic;
export function ecefFromGeodetic(lat: number, lon: number, h: number): V3;
export function ellipsoidNormal(lat: number, lon: number): V3;     // unit, outward
export function enuBasis(lat: number, lon: number): { east: V3; north: V3; up: V3 };
export function normalGravity(lat: number): number;               // m/s², on the ellipsoid
```

The functions work in any Earth-centred frame whose z axis is the spin axis; "longitude" is measured in that frame.

- [ ] **Step 1 (reference author): the oracle environment.** `tests/fixtures/astro/requirements.txt` pins what is installed (`pyerfa==2.0.1.5`, `numpy`, `skyfield==1.55`, `sgp4==2.27`, `jplephem==2.24`, `mpmath`, each with the version pip resolves). `README.md` says in ten lines how to make the virtual environment and run a generator, and that JPL kernels are downloaded, not committed.

- [ ] **Step 2 (reference author): the generator and the fixture.** `make_geodesy_fixture.py` writes `erfa-geodesy.json`:

```json
{ "generator": "pyerfa <version>: gd2gc, gc2gd, ellipsoid n=1 (WGS84); mpmath <version>",
  "script": "make_geodesy_fixture.py",
  "points":  [ { "lat": 0, "lon": 0, "h": 0, "x": 0, "y": 0, "z": 0, "latBack": 0, "lonBack": 0, "hBack": 0 } ],
  "gravity": [ { "lat": 0, "gamma": 0 } ] }
```

  - `points`: 200 from the Halton sequence (bases 2, 3, 5; no random numbers): `lat = asin(2u₁ − 1)`, `lon = π(2u₂ − 1)`, `h = −10e3 + (40e6 + 10e3)·u₃²`. Then 13 by hand: both poles at h = 0 and at 40e6; the equator at lon 0, at π and at −π + 1e-12; lat 0.7, lon 2 at h = −10e3 and at 40e6; lat ±(π/2 − 1e-9), lon 0.5, h = 500e3; lat ±1e-12, lon 0.3, h = 0. `x, y, z` from `erfa.gd2gc(1, lon, lat, h)`; the `Back` values from `erfa.gc2gd(1, xyz)`. The forward transform is a closed form, so its inputs are the truth for the inverse; ERFA's own inverse is one pass of Halley's method and is a second witness for height and longitude only (S20 amendment 7).
  - `gravity`: latitudes 0°, 15°, 30°, 45°, 60°, 75°, 90°, from Moritz's closed forms in mpmath at 50 digits with a = 6378137, 1/f = 298.257223563, GM = 3.986004418e14, ω = 7.292115e-5: `m = ω²a²b/GM`, `e′ = √(a² − b²)/b`, `q₀ = ½[(1 + 3/e′²)·atan e′ − 3/e′]`, `q₀′ = 3(1 + 1/e′²)(1 − atan(e′)/e′) − 1`, `γₑ = GM/(ab)·(1 − m − m e′ q₀′/(6 q₀))`, `γₚ = GM/a²·(1 + m e′ q₀′/(3 q₀))`, `γ(φ) = (a γₑ cos²φ + b γₚ sin²φ)/√(a² cos²φ + b² sin²φ)`. The script asserts that γₑ and γₚ equal the published 9.7803253359 and 9.8321849378 to ten figures before it writes anything.
  - Floats are written with 17 significant digits.

- [ ] **Step 3 (reference author): the failing test**, `tests/astro-geodesy.test.ts`, with these cases:

| Case | Assertion |
|---|---|
| `matches ERFA: geodetic to Earth-fixed` | for every point, distance between `ecefFromGeodetic(lat, lon, h)` and `(x, y, z)` ≤ 1e-6 m |
| `matches ERFA: Earth-fixed to geodetic` | for every point, `geodeticFromEcef(x, y, z)` gives `lat` within 1e-11 rad and `h` within 1e-6 m of the inputs ERFA's forward transform took, and `lon` within 1e-11 rad of that input modulo 2π, except at the exact poles; `h` is also within 1e-6 m of `hBack` and `lon` within 1e-11 rad of `lonBack`. `latBack` is recorded, not asserted (S20 amendment 7) |
| `round trip` | `ecefFromGeodetic(geodeticFromEcef(r))` within 1e-6 m of `r` for every point |
| `the normal is the direction height grows in` | at 20 points, a step of 1,000 m along `ellipsoidNormal` raises `h` by 1000 ± 1e-6 m and leaves `lat` and `lon` within 1e-11 rad; `enuBasis` vectors are unit and mutually perpendicular within 1e-15, and east × north = up; `up` equals `ellipsoidNormal(lat, lon)` and `east` equals (−sin lon, cos lon, 0), each within 1e-15, which fixes the frame's orientation |
| `agrees with the app's present geodesy below 2,000 km` | for points with h ≤ 2e6, `geodetic()` of `src/physics/geodesy.ts` differs by ≤ 1e-9 rad and ≤ 1e-3 m |
| `normal gravity matches the closed forms` | relative difference ≤ 5e-10 at the seven latitudes |
| `longitude stays in (−π, π]` | for every point and for lon = ±π inputs |
| `degenerate inputs end` | `{0,0,0}`, the spin axis exactly (`{0, 0, ±7e6}`) and `{x: 1e12, y: 0, z: 1e12}` each return within 50 ms without throwing, with three finite numbers and \|lat\| ≤ π/2; on the axis `lat` is ±π/2 within 1e-15 and `h` is \|z\| − a(1 − f) within 1e-6 m |
| `a non-finite input gives NaN in every number returned` | for NaN, +∞ and −∞ in each component or argument of `geodeticFromEcef`, `ecefFromGeodetic`, `ellipsoidNormal`, `enuBasis` and `normalGravity`: nothing throws, and every number returned is NaN |

  Run `npx vitest run tests/astro-geodesy.test.ts`. Expected: it fails because `src/astro/base/geodesy.ts` does not exist.

- [ ] **Step 4 (implementer): the rules.** In `scripts/verification/change-map.json` add `"tests/fixtures/astro/**"` to the `exclude` of rule `test-harnesses`, and add this rule after `structure`:

```json
{
  "id": "astro",
  "why": "S20: the new physics base, not yet called by the app, with its reference fixtures. Its own tests only; the pull request that switches a caller widens this rule (S20 §5.3).",
  "paths": ["src/astro/**", "tests/fixtures/astro/**"],
  "checks": { "commands": ["@app-build"], "unit": ["tests/astro-*.test.ts", "tests/architecture.test.ts"] }
}
```

  In `tests/architecture.test.ts` add `'astro'` to `CORE_DIRS`, and one case, `keeps src/astro free of imports from the rest of src`, that fails if a file under `src/astro/` imports a path outside it (the file already resolves relative imports; reuse that).

  Run `node --test tests/verification/*.test.mjs` (expected: all pass) and `node scripts/verification/select-checks.mjs --files src/astro/base/geodesy.ts tests/fixtures/astro/geodesy/erfa-geodesy.json` (expected: `heavy (0/34)`, `sixdof-fleet (0/6)`, and the unit list holds `tests/astro-geodesy.test.ts` and `tests/architecture.test.ts`).

- [ ] **Step 5 (implementer): `src/astro/base/geodesy.ts`** to the interface above. The inverse must hold its bounds from −10 km to 40,000 km, which today's two-pass Bowring does not promise above 2,000 km; iterate to convergence with a fixed cap on passes, or use a closed form. `normalGravity` is Somigliana's formula with the published constants γₑ = 9.7803253359, k = 0.00193185265241, e² = 0.00669437999014.

- [ ] **Step 6 (implementer): run.** `npx vitest run tests/astro-geodesy.test.ts tests/architecture.test.ts`: all pass. Then the hand-off runs of "Global constraints".

- [ ] **Step 7 (implementer): one deliberate break.** Set `WGS84_F` to 0, run the test file, record which cases fail, restore.

- [ ] **Step 8 (implementer): report, fragment, commit.** `docs/development/reports/PF-12-geodesy.md` (what was built, the measured worst differences per case, the break and its failures, the runs with counts, what was not checked) and `changes/claude-p-pf12-s1.md`. Commit as `Astro (PF-12): WGS-84 geodesy held to ERFA; the new area's rules`.

---

### Task 2: time scales (PF-10)

**Files:**
- Create: `src/astro/base/time.ts`
- Create: `tests/astro-time.test.ts`
- Create: `tests/fixtures/astro/time/make_time_fixture.py`, `tests/fixtures/astro/time/erfa-time.json`
- Modify: `NOTICE.md` (ERFA, BSD-3-Clause: the leap-second and drift tables come from its `dat.c`)

**Interfaces:**
- Consumes: nothing.
- Produces:

```ts
/** A Julian date in two parts whose sum is the date (ERFA's convention). */
export interface Jd2 { a: number; b: number }
export const JD_J2000 = 2451545.0;
export const TT_MINUS_TAI = 32.184;                          // s
export function jd2(jd: number): Jd2;                        // a = the half-integer day at or before jd, b = the rest
export function taiMinusUtc(utc: Jd2): number;               // s
export function utcToTai(utc: Jd2): Jd2;   export function taiToUtc(tai: Jd2): Jd2;
export function taiToTt(tai: Jd2): Jd2;    export function ttToTai(tt: Jd2): Jd2;
export function utcToTt(utc: Jd2): Jd2;    export function ttToUtc(tt: Jd2): Jd2;
export function tdbMinusTt(tt: Jd2): number;                 // s
export function utcToUt1(utc: Jd2, dut1: number): Jd2;       // dut1 = UT1 − UTC, s
export function julianCenturies(t: Jd2): number;             // (t − J2000) / 36525
export interface EopTable { from: string; dut1: number[]; xp: number[]; yp: number[] }   // daily at 0 h UTC from `from` (YYYY-MM-DD); s, arcseconds, arcseconds
export interface Eop { dut1: number; xp: number; yp: number; quality: 'data' | 'held' | 'none' }   // s, rad, rad
export function eopAt(table: EopTable | null, utc: Jd2): Eop;
```

**Behaviour the signatures do not settle:**
- A `Jd2` may be split in any way on input. A conversion leaves `a` as it was given and moves the offset into `b`, which is ERFA's practice; nothing is carried between the parts.
- UTC here is the app's: every day has 86,400 s, and the instant 23:59:60 has no value of its own. `taiMinusUtc` steps at 0 h UTC of the day after a leap second.
- The UTC day of a date is `Math.floor((a − 2400000.5) + b)`, a Modified Julian day number; with the split `jd2` makes, this is exact. From 1972 on `taiMinusUtc` is constant through a UTC day. `b` may leave [0, 1) after a conversion; nothing is renormalized.
- 1960 to 1971: ERFA's drift table (from `dat.c` in the pyerfa 2.0.1.5 source distribution), evaluated as `dat.c` does: the entry is the last one that begins on or before the UTC day (every entry begins on the first of a month), and its line is taken at the instant, fraction of day included. Before 1960-01-01: the value at 1960-01-01 0 h UTC, 0.943482 s (ERFA itself returns 0 there, with a warning; this base holds the first value). After the last leap second in the table: the last value, 37 s.
- `utcToTai(utc)` adds `taiMinusUtc(utc)`, as days, to `b`. `taiToUtc(tai)` makes one correction pass: `u₀ = tai − taiMinusUtc(tai read as UTC)`, then the result is `tai − taiMinusUtc(u₀)`. `taiToUtc(utcToTai(u))` returns `u` within 1e-9 s for every UTC instant from 1960 on that is not within eleven seconds of a step of the drift table (its fourteen steps, from 1961-01-01 to 1972-01-01); from 1972-07-01 on it does so for every instant. Before a step of the drift table, closer than TAI − UTC itself (at most 10 s), the one pass leaves up to 3.3e-9 s, the old line's rate times the size of the step; within one second of such a step UTC repeats or skips up to 0.108 s and the round trip is not defined (S20 amendment 10). A TAI instant inside a leap second has no UTC of this kind: `taiToUtc` gives it the first second of the new day, and going back to TAI from there lands one second later.
- `tdbMinusTt` is `0.001657 sin g + 0.000014 sin 2g`, `g = 357.53° + 0.98560028°·(JD_TT − 2451545.0)`. If that misses the bound, add the next-largest terms of ERFA's `dtdb.c` until it holds, and say so in the report.
- `eopAt` returns, for `utc.a + utc.b`, exactly the numbers that `eopAt` of `src/orbit/earth-orientation.ts` returns today: linear between days, the nearest held beyond the ends, a leap-second day keeping its own UT1 − UTC. `src/astro` may not import that function, so its arithmetic is copied operation for operation, which is what makes `toBe` hold: the first day is `Date.parse(`${from}T00:00:00Z`) / 86400000 + 2440587.5`, and arcseconds become radians by `Math.PI / (180 * 3600)`. A `from` that does not parse gives NaN values, as today. `quality` is `'data'` from the first to the last day inclusive, `'held'` outside, `'none'` when the table is null (all zeros, whatever the instant). It is today's function for a non-finite instant too: NaN gives NaN values, +∞ and −∞ hold the end values; `quality` is then `'held'`.

- [ ] **Step 1 (reference author): the generator and the fixture.** `erfa-time.json` holds:
  - UTC is stored as a half-integer day and a fraction in [0, 1). ERFA warns of a "dubious year" after 2028; the value it returns there, 37 s, is the one wanted, and the script silences that warning by name.
  - Layout: `{ generator, script, first: { utc, dat }, leap: [{ before: { utc, dat }, at: { utc, dat } }], drift: [{ utc, dat }], scales: [{ utc, tai, tt }], tdb: [{ tt, dtdb }] }`, every date a pair `[a, b]`, every `dat` and `dtdb` in seconds.
  - `first`: `erfa.dat(1960, 1, 1, 0.0)` with its date: the value held before 1960.
  - `leap`: for each change of TAI − UTC from 1972-07-01 on, the value one second before 0 h (`[the day before at 0 h, 86399/86400]`) and at 0 h (`[the day at 0 h, 0]`), from `erfa.dat`;
  - `drift`: 159 instants at 12 h UTC with `erfa.dat`: the first day of each of the fifteen entries of `dat.c` from 1960-01-01 to 1972-01-01, then the fifteenth of every month from 1960-01 to 1971-12. Every entry of the drift table is sampled on its first day and inside it (S20 amendment 11);
  - `scales`: 40 Halton instants (base 2, index from 1) between 1972-01-01 and 2060-01-01, `jd = lo + (hi − lo)·u`; an instant within one day of a leap-second step is skipped and the next index taken; with TAI and TT in two parts from `erfa.utctai` and `erfa.taitt`;
  - `tdb`: 200 Halton instants (base 3, index from 1) between 1960-01-01 and 2060-01-01 on TT, with `erfa.dtdb(tt1, tt2, 0, 0, 0, 0)`.

- [ ] **Step 2 (reference author): the failing test**, `tests/astro-time.test.ts`:

| Case | Assertion |
|---|---|
| `TAI − UTC at every leap second since 1972` | `toBe` the ERFA value one second before and at 0 h |
| `TAI − UTC in the drift years` | within 1e-9 s of ERFA at the 159 instants |
| `holds outside the table` | 1957-10-04 gives the fixture's `first` value within 1e-9 s, and `toBe` what the function gives at 1960-01-01 0 h; 2040-01-01 gives 37 exactly |
| `UTC to TAI at the leap seconds and in the drift years` | at every `leap` and `drift` instant, `utcToTai` moves the date by the ERFA value within 1e-9 s with `a` unchanged, and `taiToUtc` brings it back within 1e-9 s |
| `a TAI instant inside a leap second` | TAI 2017-01-01 00:00:36.5 (`{ a: 2457754.5, b: 36.5 / 86400 }`): `taiToUtc` gives UTC 2017-01-01 00:00:00.5 within 1e-9 s, and `utcToTai` of that result is 1 s later than the instant given, within 1e-9 s. One second earlier and one second later in TAI, the round trip TAI→UTC→TAI returns the instant within 1e-9 s |
| `a date splits and adds back` | for six dates from 1960 to 2060, `jd2(jd)` has `a` a half-integer day at or before `jd`, 0 ≤ `b` < 1, and `a + b` `toBe` `jd` |
| `UT1 from UTC` | `utcToUt1(utc, 0.3)` is 0.3 s later than `utc` and `utcToUt1(utc, −0.3)` is 0.3 s earlier, within 1e-9 s, with `a` unchanged |
| `Julian centuries` | 0 at `{ a: 2451545.0, b: 0 }`, 1 at `{ a: 2451545.0, b: 36525 }`, −0.5 at `{ a: 2433282.5, b: 0 }`, each within 1e-15 |
| `TT − TAI is 32.184 s` | `taiToTt` then `ttToTai` returns the same instant within 1e-9 s with `a` unchanged, and TT − TAI is 32.184 s within 1e-9 s |
| `UTC to TT and back` | within 1e-6 s at the 40 instants, and `utcToTt` within 1e-6 s of ERFA |
| `TDB − TT` | within 50e-6 s of ERFA at the 200 instants |
| `Earth orientation equals today's` | a 30-day table with a 1 s jump on day 12 (it also carries `predictedFrom`, which the old function's type requires): at 200 instants from 5 days before to 5 days after it, `dut1`, `xp`, `yp` are `toBe` those of `eopAt(jd, table)` from `src/orbit/earth-orientation.ts`, and the same at NaN, +∞ and −∞; `quality` is `'held'` outside and `'data'` inside |
| `no table` | zeros and `'none'` |
| `a non-finite input gives NaN in every number returned` | for NaN, +∞ and −∞ in each argument or part of every function except `eopAt`: nothing throws, and every number returned is NaN |

  Run it. Expected: it fails because `src/astro/base/time.ts` does not exist.

- [ ] **Step 3 (implementer): `src/astro/base/time.ts`** to the interface and the behaviour above. Keep the two parts apart through every conversion: adding an offset in seconds goes into `b` as days, never into the sum.

- [ ] **Step 4 (implementer): run**, then the hand-off runs.

- [ ] **Step 5 (implementer): two deliberate breaks.** Remove the 2017-01-01 entry; change the sign of the first TDB term. Record the failing cases; restore.

- [ ] **Step 6 (implementer): report, fragment, NOTICE, commit.** `docs/development/reports/PF-10-time.md`, `changes/claude-p-pf10-s1.md`. The `NOTICE.md` entry, in the form of the third-party entries already there: ERFA 2.0.1.5 (liberfa, read from the pyerfa source archive), which file of `src/astro/base` follows which of its sources, and the copyright line and the three conditions of `liberfa/erfa/LICENSE` from that archive. Commit as `Astro (PF-10): time scales on two-part Julian dates, held to ERFA`.

---

### Task 3: reference frames (PF-11)

**Files:**
- Create: `src/astro/base/frames.ts`, and `src/astro/base/nutation-2000b.ts` for the series tables
- Create: `tests/astro-frames.test.ts`
- Create: `tests/fixtures/astro/frames/make_frames_fixture.py`, `tests/fixtures/astro/frames/erfa-frames.json`
- Create: `tests/fixtures/astro/frames/make_teme_fixture.py`, `tests/fixtures/astro/frames/skyfield-teme.json`
- Modify: `NOTICE.md` (the same ERFA entry names these files)

**Interfaces:**
- Consumes: `Jd2`, `utcToTt`, `utcToUt1`, `julianCenturies` from `./time`; `V3`, `enuBasis` from `./geodesy`.
- Produces:

```ts
export type Mat3 = readonly number[];                        // nine numbers, row-major
export function matMul(a: Mat3, b: Mat3): Mat3;
export function matT(a: Mat3): Mat3;
export function matVec(m: Mat3, v: V3): V3;
export const EARTH_ROTATION_RATE = 7.292115146706979e-5;     // rad/s
export const FRAME_BIAS: Mat3;                               // GCRF → mean equator and equinox of J2000 (EME2000)
export function biasPrecessionNutation(tt: Jd2): Mat3;       // GCRF → true equator and equinox of date, IAU 2000B
export function greenwichSiderealTime(ut1: Jd2): number;     // IAU 2000B, rad in [0, 2π)
export function gmst1982(ut1: Jd2): number;                  // rad in [0, 2π)
export function polarMotion(xp: number, yp: number): Mat3;   // Earth-fixed of date → ITRF; rad
export interface Frames {
  gcrfToItrf: Mat3; temeToItrf: Mat3; gcrfToTeme: Mat3; gcrfToEme2000: Mat3;
  /** GCRF → Earth-fixed of date, before polar motion */
  gcrfToPef: Mat3; pole: Mat3;
  gst: number; gmst82: number;
}
export function framesAt(utc: Jd2, eop: { dut1: number; xp: number; yp: number }): Frames;
export interface State { r: V3; v: V3 }
export function gcrfToItrfState(f: Frames, s: State): State;
export function itrfToGcrfState(f: Frames, s: State): State;
export function rswBasis(s: State): { r: V3; s: V3; w: V3 };  // radial; along-track, perpendicular to r in the orbit plane; cross-track = r × v
export function lvlhBasis(s: State): { x: V3; y: V3; z: V3 }; // z to the Earth's centre, y opposite the orbit normal, x = y × z
export function azElRange(siteItrf: V3, lat: number, lon: number, targetItrf: V3): { az: number; el: number; range: number };  // az from north through east, [0, 2π)
```

**Definitions the signatures do not settle** (each is ERFA's, so the fixture can hold it to 1e-11):
- R₃(θ) is ERFA's `rz`: it turns the frame, so a vector's components become (x cos θ + y sin θ, −x sin θ + y cos θ, z).
- `biasPrecessionNutation` = ERFA `pnm00b`. `greenwichSiderealTime` = `gst00b`. `gmst1982` = `gmst82`. `polarMotion(xp, yp)` = `pom00(xp, yp, 0)`. `FRAME_BIAS` = the `rb` of `bp00`.
- `gcrfToPef` = R₃(gst)·`biasPrecessionNutation(tt)`. `gcrfToItrf` = `pole`·`gcrfToPef`, which is `c2teqx`.
- `temeToItrf` = `pole`·R₃(gmst82). `gcrfToTeme` = `temeToItrf`ᵀ·`gcrfToItrf`.
- Velocity: with ω = (0, 0, `EARTH_ROTATION_RATE`), `v_pef = gcrfToPef·v − ω × r_pef`, then both through `pole`. The inverse undoes it.
- The series are ported from the ERFA sources in the pyerfa 2.0.1.5 source distribution (`pnm00b.c`, `pn00b.c`, `pn00.c`, `nut00b.c`, `pr00.c`, `obl80.c`, `bp00.c`, `bi00.c`, `numat.c`, `gst00b.c`, `gmst00.c`, `era00.c`, `ee00b.c`, `ee00.c`, `eect00.c`, the eight fundamental-argument files `eect00.c` calls (`fal03.c`, `falp03.c`, `faf03.c`, `fad03.c`, `faom03.c`, `fave03.c`, `fae03.c`, `fapa03.c`), `gmst82.c`, `pom00.c`, and the small rotation helpers), every term kept.
- `azElRange` takes the site's geodetic `lat` and `lon` as well as its position, so that it does not invert them. A target exactly at the zenith has no azimuth; the function returns whatever atan2 gives there, and no test reads it.
- `rswBasis` and `lvlhBasis` of a state with r ∥ v, or with a zero r, return NaN in every number (the normalization divides zero by zero).

- [ ] **Step 1 (reference author): the ERFA fixture.** At 25 instants (the first of January and July of 1990, 1995, … 2040, which is 22, plus 1969-07-16, 1961-04-12 and 2059-12-31; the k-th of them, k from 0, at k·3,456 s after 0 h UTC, so that every time of day occurs), with dut1, xp, yp taken as (−0.1 s, 0.1″, 0.3″): `pnm00b`, `gst00b`, `gmst82`, `pom00`, `c2teqx` of those, the `rb` of `bp00`, and `c2t06a` for the same instant and pole. The instants are stored as UTC in two parts with the TT and UT1 the script used.

- [ ] **Step 2 (reference author): the Skyfield fixture.** At 20 instants (Halton base 2, index from 1, between 2020-01-01 and 2030-01-01 UTC): the three directions (1, 0, 0), (0.3, −0.8, 0.52) and (−0.5, 0.5, 0.7071), each scaled to 7,000 km, in TEME, and the same in GCRS by Skyfield's `TEME` frame (`skyfield.sgp4lib.TEME`). The timescale is `load.timescale(builtin=True)`; its `t.dut1` is stored as the UT1 − UTC of each instant, and it applies no polar motion unless it is given a table. The generator names the Skyfield version.

- [ ] **Step 3 (reference author): the failing test**, `tests/astro-frames.test.ts`:

| Case | Assertion |
|---|---|
| `bias-precession-nutation equals ERFA` | every element within 1e-11 at the 25 instants |
| `sidereal times equal ERFA` | `greenwichSiderealTime` and `gmst1982` within 1e-11 rad, both in [0, 2π) |
| `polar motion and frame bias equal ERFA` | within 1e-15 per element |
| `GCRF to ITRF equals ERFA's equinox-based chain` | within 1e-11 per element |
| `GCRF to ITRF is within 2 mas of the full IAU 2006/2000A chain` | the rotation between the two matrices ≤ 9.7e-9 rad at the instants from 1990 to 2040 |
| `TEME to ITRF agrees with the app's present one` | for a 7,000 km vector at each instant, within 3e-2 m of `temeToItrf(r, jd, table)` from `src/orbit/earth-orientation.ts`, for the three directions of Step 2. `table` holds the same constant values (−0.1 s, 0.1″, 0.3″) on two days, with the `predictedFrom` its type requires; the new function is given `jd2(jd)` for the same one-number `jd`, so both see the same instant. The present function is the looser side, by 2.1 cm at most over these years (S20 amendment 8) |
| `TEME to GCRF agrees with Skyfield` | within 0.2 m for the 60 vectors |
| `velocity carries the Earth's rotation` | a point fixed in GCRF at 7,000 km: its ITRF velocity from `gcrfToItrfState` equals the centred difference of its ITRF position over 1 s within 2e-4 m/s; `itrfToGcrfState(gcrfToItrfState(s))` returns `s` within 1e-8 m and 1e-11 m/s |
| `matrices are rotations` | M·Mᵀ = I within 1e-14, determinant 1 |
| `orbit frames` | `rswBasis` and `lvlhBasis` are orthonormal and right-handed; `rsw.r` ∥ r, `rsw.w` ∥ r × v, `lvlh.z` = −r̂, `lvlh.y` = −ŵ; for r ∥ v, and for a zero r, every number returned is NaN |
| `azimuth, elevation, range` | a target 1,000 km along `up` gives el = π/2 and range 1e6; along `north` gives az = 0, el = 0; along `east` gives az = π/2. Angles within 1e-12 rad, azimuth compared modulo 2π; range within 1e-6 m. Elevation is the arctangent of the up component over the horizontal distance: an arcsine loses 1.5e-8 rad at the zenith |
| `a non-finite input gives NaN in every number returned` | for NaN, +∞ and −∞ in each argument, part or component of every function except `matMul`, `matT` and `matVec`: nothing throws, and every number returned is NaN |

  Run it. Expected: it fails because `src/astro/base/frames.ts` does not exist.

- [ ] **Step 4 (implementer): the tables and `frames.ts`.** Port function by function, checking each against its fixture row before going on: `biasPrecessionNutation`, then the sidereal times, then the products.

- [ ] **Step 5 (implementer): run**, then the hand-off runs.

- [ ] **Step 6 (implementer): two deliberate breaks.** Drop the fixed planetary offsets of the nutation; feed TT in place of UT1 to the Earth rotation angle. Record the failing cases; restore.

- [ ] **Step 7 (implementer): report, fragment, NOTICE, commit.** `docs/development/reports/PF-11-frames.md` gives the measured worst difference against each reference, and the written reason for passing 400 lines (the tables). `changes/claude-p-pf11-s1.md`. Commit as `Astro (PF-11): GCRF, ITRF, TEME and EME2000 by the IAU 2000B chain, held to ERFA and Skyfield`.
