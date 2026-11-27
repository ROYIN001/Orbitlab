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

The remaining cases (fixtures whole, the matrix helpers, rotations, orbit frames, azimuth/elevation/range, non-finite input, and the three cases the fix round added: `sidereal time at the wrap`, TEME with a nonzero pole, `the tables are ERFA's`) are pass or fail and pass. The test file has 17 cases. The table above was measured on the first version; after the fix round the same measurement gives the same figures, and at the fixture's six `wrap` instants both functions return 0 where ERFA returns 2π.

## The deliberate breaks

The counts below were recorded against the first, 14-case version of the test file and were not re-run against the 17-case file. Each made once, the test file run, then restored; both files were byte-identical after each restore (SHA-256 `a33db168…` for `frames.ts`, `f7e1625e…` for `nutation-2000b.ts`, checked with `sha256sum -c`).

- The fixed planetary offsets of the nutation dropped: 3 failed, 11 passed. Failed: `bias-precession-nutation equals ERFA`, `sidereal times equal ERFA`, `GCRF to ITRF equals ERFA's equinox-based chain`.
- TT fed in place of UT1 to the Earth rotation angle (`framesAt` computing GST from TT): 5 failed, 9 passed. Failed: `sidereal times equal ERFA` (framesAt gst off by 4.2e-3 rad at 1990-01-01), `GCRF to ITRF equals ERFA's equinox-based chain` (4.1e-3 per element), `GCRF to ITRF is within 2 mas of the full IAU 2006/2000A chain` (4.2e-3 rad), `TEME to GCRF agrees with Skyfield` (35 km), `velocity carries the Earth's rotation` (436 m/s at the first instant).

## Size

`frames.ts` 361 lines, 16,386 bytes after the fix round (356 lines, 15,977 bytes before it); `nutation-2000b.ts` 140 lines, 7,565 bytes; 501 lines together. That passes the plan's near-400 lines: 140 of them are the copied coefficient tables (the stated reason), and `frames.ts` alone is the port of some 30 ERFA routines with its header. Minified with rolldown, `frames.ts` with what it uses of `time.ts`, `geodesy.ts` and the tables is 11,056 bytes (4,649 gzip). Nothing outside `src/astro` imports either file (a search shows none), so the app's bundle cannot change.

## Runs (once each)

First version:

- `npm run -s typecheck`: clean.
- `npx vitest run` on `tests/architecture.test.ts`, `tests/astro-frames.test.ts`, `tests/astro-geodesy.test.ts`, `tests/astro-time.test.ts`, `tests/bundle-budget.test.ts`, `tests/privacy-inventory.test.ts`, `tests/repo-hygiene.test.ts` (the selection `select-checks.mjs` gives for the three files): 69 of 69 pass (7 files; 14 cases in the frames test).
- `npx vite build && node scripts/bundle-budget.mjs`: `bundle budget: ok`.

After the fix round (no build: the change is inside a module nothing imports):

- the same seven unit files, the selection `select-checks.mjs` gives for the changed files: 72 of 72 pass (17 cases in the frames test).
- `npm run -s typecheck`: clean.

## The fix round

The independent review passed the port (all 1,189 table numbers equal to the C sources; results bit-identical to ERFA or within 2.2e-16 at 28 instants), with fixes. It found two Important points: the sidereal times reached exactly 2π, which ERFA's `anp` returns for a tiny negative argument and the port, faithful to it, shared (found at 13 of 400 days searched; for example `greenwichSiderealTime({ a: 2451545.5, b: 0.7176188233457006 })` gave 6.283185307179586), so the promise of [0, 2π) did not hold; and `gcrfToTeme` was untested with a nonzero pole, shown by a break that still passed 14 of 14. It also noted that the small table terms are invisible at 1e-11, so the matrix cases alone cannot show a wrong small coefficient. One Minor point: the header said the module imports only `./time` and `./geodesy`.

What changed: the plan was amended (S20 amendment 13), and the reference author added three cases with their fixture data (commit 6f03750): `sidereal time at the wrap` (a `wrap` set of UT1 instants where ERFA returns exactly 2π), TEME with a nonzero pole (ERFA's R₃(gmst82)ᵀ·R₃(gst)·`pnm00b` per instant), and `the tables are ERFA's` (row counts and checksums derived from the C sources). In `frames.ts` the value returned by `greenwichSiderealTime` and `gmst1982` is folded, 2π becoming 0, through a two-line helper; `anp`, `era00`, `gmst00` and the rest of the chain are unchanged, so every result away from a wrap instant is what it was. `framesAt` takes the folded GST, so at a wrap instant its matrices differ from ERFA's `c2teqx` by what R₃(0) and R₃(2π) differ, at most 2.5e-16. The header now names `./nutation-2000b` among the imports and states the fold. `nutation-2000b.ts` is untouched; `the tables are ERFA's` passed without a change.

## The gate (the orchestrating session)

- **Pre-check before dispatch, reference tools only** (S20 amendment 12; `tests/fixtures/astro/evidence/pf11_ut1_precheck.py`, `pf11_roundtrip_precheck.py`): the fixture's UT1 had to be formed as this base forms it (ERFA's `utcut1` differs by up to 2.3 ms at the two drift-year instants); the round trip's bounds sat at what ERFA's own matrices leave (8.5e-9 m, 1.0e-11 m/s) and were moved to 1e-7 m and 1e-10 m/s with the owner's agreement; the velocity case gained a moving state. A fourth point came from the reference author before any implementation existed: no case reached `matMul`.
- **Held-out set.** Made by the orchestrating session from pyerfa and Skyfield with a seeded pseudo-random sampler, never shown to the writers: 405 instants from 1960 to 2060, each with its own UT1 − UTC (±0.9 s) and pole (±0.5″); 200 TEME vectors from 2020 to 2030; three states at each instant (fixed in GCRF, 7.5 km/s, 11 km/s); 300 topocentric targets. All inside the bounds:

| Check | Bound | Measured worst |
|---|---|---|
| bias-precession-nutation against `pnm00b` | 1e-11 | 2.2e-16 |
| the two sidereal times, polar motion, frame bias against ERFA | 1e-11, 1e-15 | 0 |
| `framesAt`: GCRF→ITRF against `c2teqx` | 1e-11 | 3.4e-12 |
| `framesAt`: TEME→ITRF against `pom00`·R₃(`gmst82`) | 1e-11 | 1.1e-16 |
| GCRF→ITRF against the full IAU 2006/2000A chain, 1990 to 2040 | 9.7e-9 rad | 4.5e-9 rad |
| TEME→GCRF against Skyfield | 0.2 m | 3.0e-2 m |
| every matrix a rotation (M·Mᵀ − I, determinant) | 1e-14 | 1.2e-15 |
| velocity against the centred difference, the three states | 2e-4 m/s | 9.9e-5 m/s |
| round trip, position | 1e-7 m | 6.5e-9 m |
| round trip, velocity (fixed; 7.5 km/s; 11 km/s) | 1e-10 m/s | 2.3e-13; 6.5e-12; 1.1e-11 m/s |
| RSW and LVLH against their definitions | 1e-14 | 6.3e-16 |
| azimuth, elevation, range (relative) | 1e-9 rad, 1e-9 rad, 1e-12 | 0, 1.1e-15, 2.3e-15 |
| non-finite input, degenerate orbit frames, fresh results | pass or fail | pass |

  The 3.4e-12 against `c2teqx` is at 1978-12-31, a day that ends in a leap second. ERFA's `utctai` stretches that day's seconds and this base's UTC has 86,400 s in every day, as the plan states, so the two TT differ by 0.29 s there; at the other instants the two agree to 2e-11 s and the matrices to 2.2e-16. It is a difference of convention inside the bound, not of the port.
- **Across the fix round** every one of the 39,570 numbers the modules return on the held-out set is identical before (`933af96`) and after (`fd69c1c`); the diff of `frames.ts` between the two holds the header's lines, the two-line fold and the two return lines, and `nutation-2000b.ts` is unchanged.
- **Review.** Independent reviewer on `933af96`: pass with fixes, no Critical finding, two Important, three Minor; all 1,189 table numbers equal to the C sources by script. Re-review on `fd69c1c`: all five addressed. With the reviewer's pole break the 17-case file fails `GCRF to TEME with a pole` where the 14-case file passed; with one `eect00` coefficient changed in its last digit it fails `the tables are ERFA's`; ERFA returns exactly 2π at all six `wrap` instants and the two functions return 0 there.
- **The module read line by line** by the orchestrating session against the ERFA sources (`pr00`, `obl80`, `bp00`, `bi00`, `numat`, `nut00b`, `pn00`, `era00`, `gmst00`, `eect00` and its fundamental arguments, `ee00b`, `gst00b`, `gmst82`, `pom00`, `c2teqx`): no difference found.
- **Runs, once, on `fd69c1c`:** the seven unit files `select-checks.mjs` lists for the changed files, 72 of 72; `npm run -s typecheck` clean. The same selection gives browser 0 of 54, heavy 0 of 34, fleet 0 of 6.

## Not checked

The default, heavy and fleet suites (not selected for this change). No browser run: the app does not call the module. The deliberate breaks were not repeated against the 17-case file, and no break was made for the three new cases (the reviewer's pole break is the evidence for the TEME case; the re-reviewer repeated it against the 17-case file and broke one small table number, see "The gate"). The wrap was checked only at the fixture's six instants and the reviewer's search, not over every instant; `framesAt` near the wrap passes GST 0 where ERFA's `c2teqx` would use 2π, a difference of a rounding error that no case reads. The small table terms are held by the checksum case, not by any result at 1e-11.
