# PF-10: time scales on two-part Julian dates, held to ERFA

## Authorization

S20 is adopted and its packages authorized by the owner's answer "1.ก 2.ก 3.ก 4.ก." of 2026-11-26 (DECISIONS,
"Decided 2026-11-26, the plan-review chat"). After "ยังไม่ต้องเปิดงานต่อไป" of the same day, the owner opened this
package in chat on 2026-11-27: "เริ่ม PF-10 จาก repo อย่างเดียวได้ แต่ต้องถามก่อนหลายข้อ".

## What was built

- `src/astro/base/time.ts`: `jd2`, `taiMinusUtc`, `utcToTai`, `taiToUtc`, `taiToTt`, `ttToTai`, `utcToTt`, `ttToUtc`, `tdbMinusTt`, `utcToUt1`, `julianCenturies`, `eopAt`, the types `Jd2`, `EopTable`, `Eop` and the constants `JD_J2000`, `TT_MINUS_TAI`. It imports nothing and holds no mutable state; each function returns a fresh object.
- TAI − UTC is ERFA 2.0.1.5's `dat.c` table (43 entries from 1960-01-01 to 2017-01-01) with its fourteen drift lines, copied from the source archive. The entry is the last one beginning on or before the UTC day; before 1972 its line is evaluated at the instant, fraction of day included. From 1972 on the value is the table's integer itself. Before 1960 the value at 1960-01-01 0 h (0.943482 s) is held; after 2017-01-01, 37 s.
- Conversions keep the two parts apart: an offset goes into `b` as days, `a` is left as given, nothing is renormalized. `taiToUtc` makes one correction pass.
- `tdbMinusTt` is the two-term series, `0.001657 sin g + 0.000014 sin 2g`. It is the classical two-term form in the Earth's mean anomaly with the work plan's numbers, held to ERFA `dtdb` (it corresponds to the largest term of `dtdb.c` and its first harmonic). It meets the bound, so no term of `dtdb.c` was added.
- `eopAt` copies the arithmetic of `src/orbit/earth-orientation.ts` operation for operation (`quality` is `'data'` from the first to the last day inclusive, `'held'` outside and for a non-finite instant, `'none'` without a table).
- A non-finite number in any input (an argument or a part of a date) gives NaN in every number returned and nothing throws; `eopAt` is the exception.

## Worst measured difference per case

| Case | Bound | Measured worst |
|---|---|---|
| TDB − TT against ERFA, 200 instants | 50e-6 s | 3.40e-5 s (37.5e-6 s at 200,001 instants over 1960 to 2060, the orchestrating session's measurement, confirmed by the reviewer at 400,001) |
| UTC to TT against ERFA, 40 instants | 1e-6 s | 0 |
| UTC to TT to UTC, 40 instants | 1e-6 s | 2.4e-12 s |
| TAI − UTC in the drift years, 159 instants | 1e-9 s | 0 |
| TAI − UTC at the leap seconds | exact (`toBe`) | exact |
| Earth orientation against today's function | exact (`toBe`) | exact |

The remaining cases (split, UT1, centuries, TT − TAI, no table, non-finite, and `a TAI instant inside a leap second`) are pass or fail and pass. The test file now has 14 cases.

## The deliberate breaks

Each made once against the first version of the test file (13 cases, before the review's extension; not re-run since), the file run, then restored; the file was byte-identical after each restore (checksum).

- The 2017-01-01 entry removed: 4 failed, 9 passed. Failed: `TAI − UTC at every leap second since 1972`, `holds outside the table` (2040 gives 36, not 37), `UTC to TAI at the leap seconds and in the drift years`, `UTC to TT and back`.
- The sign of the first TDB term changed: 1 failed, 12 passed. Failed: `TDB − TT`.

## Runs (once each)

- `npm run -s typecheck`: clean.
- `npx vitest run` on `tests/astro-time.test.ts`, `tests/architecture.test.ts`, `tests/astro-geodesy.test.ts`, `tests/bundle-budget.test.ts`, `tests/privacy-inventory.test.ts`, `tests/repo-hygiene.test.ts`: 55 of 55 pass (14 cases in the time test; first run of the original package: 54 of 54 with 13 cases).
- `npx vite build && node scripts/bundle-budget.mjs`: `bundle budget: ok`. Nothing outside `src/astro` imports the module, so the bundle cannot have changed.

## The fix round

The independent review passed the module's behaviour. Its one Important finding was a coverage gap in the plan's sampling of the drift years; it was closed by S20 amendment 11 and the reference author's commit 99ec481 (159 drift instants, entry by entry, and a 14th case, `a TAI instant inside a leap second`). Three wording points were corrected: the comments in `time.ts` wrongly named ERFA's `dtdb.c` as the source of the two-term TDB − TT numbers (it is the classical form with the work plan's numbers, held to ERFA `dtdb`); the NOTICE row now says the same; the change fragment says its 34 µs holds at the fixture's 200 instants (37.5 µs over 1960 to 2060). No executable code changed.

## Not checked

The printed source of the two-term formula was not looked up: its numbers are the work plan's, and it is held to ERFA.

The default, heavy and fleet suites (not selected for this change). Behaviour of the round trip within eleven seconds of a step of the drift table beyond what the plan's amendment 10 states. No browser run: the app does not call the module.
