# PF-11: GCRF, ITRF, TEME and EME2000 by the IAU 2000B chain, held to ERFA and Skyfield

## Authorization

S20 is adopted and its packages authorized by the owner's answer "1.ก 2.ก 3.ก 4.ก." of 2026-11-26 (DECISIONS,
"Decided 2026-11-26, the plan-review chat"). On 2026-11-27 the owner, asked what follows PF-10, chose
"ทำ PF-11 ต่อเลย" (go straight on to PF-11), and agreed to the round trip's bounds of S20 amendment 12 with
"ขยับตามที่เสนอ".

## What was built

- `src/astro/base/frames.ts`: `matMul`, `matT`, `matVec`, `EARTH_ROTATION_RATE`, `FRAME_BIAS`, `biasPrecessionNutation`, `greenwichSiderealTime`, `gmst1982`, `polarMotion`, `framesAt`, `gcrfToItrfState`, `itrfToGcrfState`, `rswBasis`, `lvlhBasis`, `azElRange`, and the types `Mat3`, `Frames`, `State`. It imports only `./time`, `./geodesy` and `./nutation-2000b`, holds no mutable state (`FRAME_BIAS` is frozen), and each function returns a fresh object or array.
- `src/astro/base/nutation-2000b.ts`: data only, `readonly`: the 77 luni-solar terms of `nut00b.c` and its two fixed offsets in lieu of the planetary terms, and the 33 + 1 complementary terms of `eect00.c`.
- Ported from the ERFA 2.0.1.5 sources of the pyerfa 2.0.1.5 archive (unpacked locally; nothing downloaded), function by function in ERFA's order of operations, every term kept: `pnm00b` → `pn00b` → `nut00b`, `pn00` (`pr00`, `obl80`, `bp00` with `bi00`, `numat`, `rxr`); `gst00b` → `gmst00` (`era00`), `ee00b` → `ee00` (`eect00` with the eight fundamental arguments `fal03` … `fapa03`); `gmst82`; `pom00`; `c2teqx`; the helpers `ir`, `rx`, `ry`, `rz`, `rxr`, `tr`, `rxp`, `anp`. C's `fmod` is JavaScript's `%` (both exact).
- `framesAt` takes TT by `utcToTt` and UT1 by `utcToUt1` and builds `gcrfToPef` = R₃(gst)·BPN, `gcrfToItrf` = pole·`gcrfToPef` (= `c2teqx`), `temeToItrf` = pole·R₃(gmst82), `gcrfToTeme` = `temeToItrf`ᵀ·`gcrfToItrf`, `gcrfToEme2000` = `rb`.
- `rswBasis` is built from the orbit normal (w = unit(r × v), s = unit(w × r), r̂ = s × w), so r ∥ v and a zero r give NaN in every number by the arithmetic (zero over zero); `lvlhBasis` is (s, −w, −r̂). `azElRange` uses elevation = atan2(up, horizontal distance) and folds an azimuth that rounds to 2π to 0.
- A non-finite number in any input gives NaN in every number returned and nothing throws; for the two state functions every number of the `Frames` argument counts, used or not. `matMul`, `matT` and `matVec` are the exception.

## How the tables were copied and checked

A script read `nut00b.c` and `eect00.c` and wrote `nutation-2000b.ts`, copying each number token as written in the C source (for example `2640.96e-6`, `-172064161.0`), so each parses to the same double as in C. A second script then parsed both files independently and compared them: `NUT00B_LS` 77 rows × 11 numbers, `EECT00_T0` 33 × 10, `EECT00_T1` 1 × 10, the planetary offsets 2; every number identical, with equal checksums (sum of absolute values 295599074.0, 195.00274675, 1.00000087, 0.523; equal SHA-256 of the number lists). The polynomial coefficients inside `frames.ts` (fundamental arguments, precession, obliquity, sidereal time) were transcribed from the sources function by function; the results below are bit-identical to ERFA, which checks them.

## Worst measured difference per case

| Case | Bound | Measured worst |
|---|---|---|
| `pnm00b`, 25 instants, per element | 1e-11 | 0 |
| `gst00b` and `gmst82`, 25 instants (direct and through `framesAt`) | 1e-11 rad | 0 |
| `pom00` and `rb`, per element | 1e-15 | 0 |
| `c2teqx`, 25 instants, per element | 1e-11 | 1.1e-16 |
| rotation to `c2t06a` (IAU 2006/2000A), 22 instants 1990 to 2040 | 9.7e-9 rad | 4.14e-9 rad |
| TEME → ITRF against the app's present `temeToItrf`, 75 vectors | 3e-2 m | 1.70e-2 m |
| TEME → GCRF against Skyfield 1.55, 60 vectors | 0.2 m | 2.14e-2 m |
| ITRF velocity against the centred difference, fixed point / moving state | 2e-4 m/s | 3.52e-5 / 3.84e-5 m/s |
| state position against `gcrfToItrf`·r | 1e-7 m | 1.3e-9 m |
| round trip r / v | 1e-7 m / 1e-10 m/s | 4.0e-9 m / 5.6e-12 m/s |

The remaining cases (fixtures whole, the matrix helpers, rotations, orbit frames, azimuth/elevation/range, non-finite input) are pass or fail and pass. The test file has 14 cases.

## The deliberate breaks

Each made once, the test file run, then restored; both files were byte-identical after each restore (SHA-256 `a33db168…` for `frames.ts`, `f7e1625e…` for `nutation-2000b.ts`, checked with `sha256sum -c`).

- The fixed planetary offsets of the nutation dropped: 3 failed, 11 passed. Failed: `bias-precession-nutation equals ERFA`, `sidereal times equal ERFA`, `GCRF to ITRF equals ERFA's equinox-based chain`.
- TT fed in place of UT1 to the Earth rotation angle (`framesAt` computing GST from TT): 5 failed, 9 passed. Failed: `sidereal times equal ERFA` (framesAt gst off by 4.2e-3 rad at 1990-01-01), `GCRF to ITRF equals ERFA's equinox-based chain` (4.1e-3 per element), `GCRF to ITRF is within 2 mas of the full IAU 2006/2000A chain` (4.2e-3 rad), `TEME to GCRF agrees with Skyfield` (35 km), `velocity carries the Earth's rotation` (436 m/s at the first instant).

## Size

`frames.ts` 356 lines, 15,977 bytes; `nutation-2000b.ts` 140 lines, 7,565 bytes; 496 lines together. That passes the plan's near-400 lines: 140 of them are the copied coefficient tables (the stated reason), and `frames.ts` alone is the port of some 30 ERFA routines with its header. Minified with rolldown, `frames.ts` with what it uses of `time.ts`, `geodesy.ts` and the tables is 11,056 bytes (4,649 gzip). Nothing outside `src/astro` imports either file (a search shows none), so the app's bundle cannot change.

## Runs (once each)

- `npm run -s typecheck`: clean.
- `npx vitest run` on `tests/architecture.test.ts`, `tests/astro-frames.test.ts`, `tests/astro-geodesy.test.ts`, `tests/astro-time.test.ts`, `tests/bundle-budget.test.ts`, `tests/privacy-inventory.test.ts`, `tests/repo-hygiene.test.ts` (the selection `select-checks.mjs` gives for the three files): 69 of 69 pass (7 files; 14 cases in the frames test).
- `npx vite build && node scripts/bundle-budget.mjs`: `bundle budget: ok`.

## Not checked

The default, heavy and fleet suites (not selected for this change). No browser run: the app does not call the module. The orchestrating session's held-out set and the independent review follow this report.
