# PF-14: the Sun and the Moon by ERFA's series, held to ERFA and to DE421

The work package is Task 2 of [S20-wave2.md](../plan/S20-wave2.md). The reference author's commit `2bcf56c` holds the
two fixture generators, the two fixtures and the test `tests/astro-sun-moon.test.ts`; this report covers the
implementation on top of it.

## What was built

- `src/astro/base/sun-moon.ts`: `AU` (149,597,870,700 m), `EARTH_MOON_MASS_RATIO` (81.30056), `moonState`, `earthMoonBarycentreState` and `sunState`, each taking TT as a two-part Julian date and returning a `State` in metres and metres per second. It imports `Jd2` from `./time`, `V3` from `./geodesy`, `State`, `FRAME_BIAS`, `matT` and `matVec` from `./frames` (the last three for `sunState` only) and the tables from `./sun-moon-tables`. It holds no mutable state; each function returns a fresh object.
- `moonState` is ERFA `moon98`; `earthMoonBarycentreState` is `plan94` for the third body. Astronomical units and days become metres and seconds as x·AU and x·AU / 86,400. `sunState` is −(Bᵀ·r_emb − r_moon / (1 + μ)) with B = `FRAME_BIAS` and μ = `EARTH_MOON_MASS_RATIO`, the same for the velocity.
- Ported from the ERFA 2.0.1.5 sources of the pyerfa 2.0.1.5 archive (unpacked locally), function by function in the C code's order of operations, every term kept, the C constants as written (`ERFA_DPI`, `ERFA_D2PI`, `ERFA_DD2R`, `ERFA_DAS2R`, `ERFA_DJC`, `ERFA_DJM`, `ERFA_DJ00`, `ERFA_DAU` from `erfam.h`): `moon98` (with its `da1 = DD2R·al1` as written), `plan94` for `np = 3` (the trigonometric terms in the C loop order, `fmod` of the longitude, and the iteration of Kepler's equation with `KMAX = 10` and the 1e-12 test), and the helpers `s2pv`, `pfw06`, `obl06`, `ir`, `rz`, `rx`, `rxpv`, `rxp`, `anpm`, all private to the module. C's `fmod` is JavaScript's `%`; the `int` multipliers of the C tables are whole numbers in the tables, and `abs(i)` of the Sun's anomaly multiplier selects the E factor as in C. `plan94`'s status (`jstat`) is not kept: outside 1000 to 3000 the same numbers are returned and nothing is reported.
- `src/astro/base/sun-moon-tables.ts`: data only, `readonly`. `MOON98_LR` (the 60 rows of `tlr`, six numbers a row), `MOON98_B` (the 60 rows of `tb`, five numbers a row) and `PLAN94_EMB` (the third entry of `amas` and the third row of `a`, `dlm`, `e`, `pi`, `dinc`, `omega`, `kp`, `ca`, `sa`, `kq`, `cl`, `sl`, under the C names). A throwaway script, not committed, read `moon98.c` and `plan94.c` and wrote the tables, copying each number token as written in the C source.
- A non-finite number in either part of the date gives NaN in every number returned and nothing throws (a guard at the entry of each exported function).

## Worst measured difference per case

Measured by a throwaway script over the same fixture rows the test reads.

| Case | Bound | Measured worst |
|---|---|---|
| the Moon equals ERFA, 60 instants | 1e-3 m, 1e-8 m/s | 6.7e-8 m, 2.3e-13 m/s |
| the Earth–Moon barycentre equals ERFA, 60 instants | 1e-1 m, 1e-6 m/s | 1.4e-4 m, 2.7e-11 m/s |
| the Sun equals ERFA's two series combined, 60 instants | 1e-1 m, 1e-6 m/s | 1.4e-4 m, 2.7e-11 m/s |
| the Moon against DE421, 400 instants | 0.01°, 0.05 %, 0.5 m/s | 0.00286°, 0.00243 %, 0.120 m/s |
| the Sun against DE421, 400 instants | 0.01°, 0.1 %, 6 m/s | 0.00200°, 0.00076 %, 1.917 m/s |

The figures against DE421 are those the plan's pre-check gave for ERFA itself at the same 400 instants (0.00286°, 0.0024 %, 0.12 m/s; 0.00200°, 0.0008 %, 1.92 m/s). The remaining cases (`the tables have the source's shape`, `constants`, `a non-finite input gives NaN in every number returned`) are pass or fail and pass. The test file has 8 cases.

## The deliberate breaks

Each made once, the test file run, then restored; `sun-moon.ts` was byte-identical to its saved copy after each restore (`cmp`). The size of each miss over all rows was measured by the same throwaway script.

- The Moon's term left out of `sunState` (r = −Bᵀ·r_emb, v = −Bᵀ·v_emb): 2 failed, 6 passed. Failed: `the Sun equals ERFA's two series combined` (first failure 4,889,940 m at H2(1); worst 4.94e6 m and 13.4 m/s over the 60 rows) and `the Sun against DE421` (first failure the velocity, 11.98 m/s at 2451544.5 + 0.5, bound 6; worst 0.00362°, 0.00364 %, 14.38 m/s over the 400 rows). The direction alone stays inside 0.01°, as the plan says; the velocity does not.
- The E factor (`en`, and with it `den`) dropped from the Moon's terms, taken as 1 and 0 for every term: 2 failed, 6 passed. Failed: `the Moon equals ERFA` (first failure the velocity at H2(1), J2000.0, where E = 1 and only its rate is wrong: 1.98e-7 m/s; worst 21.2 km and 0.055 m/s at 3001-01-01) and `the Sun equals ERFA's two series combined` (first failure 1.43 m at H2(2); worst 258 m and 6.7e-4 m/s at 3001-01-01). `the Moon against DE421` still passed (0.00296°, 0.00237 %, 0.120 m/s): over 1950 to 2050 the E factor is too small to see at its bounds.

## Size

`sun-moon.ts` 429 lines, 16,413 bytes; `sun-moon-tables.ts` 163 lines, 5,766 bytes; 592 lines together. Minified with rolldown (ES module, `minify: true`), `sun-moon.ts` with the tables and what it uses of `frames.ts` (the frame bias and the helpers it is built from) is 10,623 bytes (4,555 gzip -9). Nothing outside `src/astro` imports either file (a search shows none), so the app's bundle cannot change.

The pull request's lines by part: the reference author's commit 14,993 (the test 128, the two fixtures 12,011 and 2,660, the two generators 76 and 118); this commit's source 592 (tables 163, port 429), `NOTICE.md` one changed line, this report and the change fragment. The source passes the plan's near-400 lines: 163 of them are the copied coefficient tables (the stated reason), and `sun-moon.ts` is the port of eleven ERFA routines in the C code's layout, its polynomials one coefficient a line as in `pfw06.c`, `obl06.c` and `plan94.c`.

## Runs (once each before hand-off)

- `npx vitest run tests/astro-sun-moon.test.ts` while developing: 8 of 8 pass on the first complete version, and again after the breaks were undone.
- `npm run -s typecheck`: clean.
- `npx vitest run` on `tests/architecture.test.ts`, `tests/astro-frames.test.ts`, `tests/astro-geodesy.test.ts`, `tests/astro-sun-moon.test.ts`, `tests/astro-time.test.ts`, `tests/bundle-budget.test.ts`, `tests/privacy-inventory.test.ts`, `tests/repo-hygiene.test.ts` (the selection `select-checks.mjs` gives for the three files): 80 of 80 pass (8 files). The same selection gives browser 0 of 54, heavy 0 of 34, fleet 0 of 6.
- `npx vite build && node scripts/bundle-budget.mjs`: `bundle budget: ok`.

## Not checked

The default, heavy and fleet suites (not selected for this change). No browser run: the app does not call the module. The tables were not compared to the C sources by a second, independent parse; they are held by the ERFA rows (6.7e-8 m at the Moon, against the smallest coefficient's 700 m or more) and by the shape case. `amas` is held by the shape case only. The years 1000 to 3000 are sampled at the fixture's 60 instants; no instant where the Kepler iteration reaches its ten-step limit was sought. The direction the Sun is seen in (aberration, light time) is not part of this module.
