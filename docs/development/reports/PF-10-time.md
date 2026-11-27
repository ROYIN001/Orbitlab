# PF-10: time scales on two-part Julian dates, held to ERFA

## Authorization

S20 is adopted and its packages authorized by the owner's answer "1.ก 2.ก 3.ก 4.ก." of 2026-11-26 (DECISIONS,
"Decided 2026-11-26, the plan-review chat"). After "ยังไม่ต้องเปิดงานต่อไป" of the same day, the owner opened this
package in chat on 2026-11-27: "เริ่ม PF-10 จาก repo อย่างเดียวได้ แต่ต้องถามก่อนหลายข้อ".

Before the package started the orchestrating session put four questions to the owner, each with options, and the owner chose (chat, 2026-11-27; the option's text is verbatim): how to handle pull request #252, which held the corrected text of this task and was still open: "ผม merge #252 ก่อน (แนะนำ)" (merged as `d7abc2a0` before this branch was made); whether this session takes the orchestrating role of the S20 track and merges under the answer "2.ก", which HANDOVER-S20 §7 asks a session taking over to confirm once: "รับบท และ merge เองตาม 2.ก (แนะนำ)"; the branch: "claude/p-pf10-s1 ตามแผน (แนะนำ)"; and what follows this package: "ทำ PF-11 ต่อเลย".

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

## The gate (the orchestrating session)

- **Pre-check before dispatch, reference tools only.** The plan's earlier pre-check was re-run (two-term TDB − TT against ERFA `dtdb` at 200,001 instants: 37.5 µs). A new one found the task's sentence on the round trip wrong beside a step of the drift table: up to 3.2e-9 s where 1e-9 s was stated. The sentence was corrected before anyone was dispatched (S20 amendment 10; `tests/fixtures/astro/evidence/pf10_roundtrip_precheck.py`).
- **Held-out set.** Made by the orchestrating session from pyerfa alone with a seeded pseudo-random sampler (not the fixture's Halton sequence), never shown to the writers: 4,377 instants for TAI − UTC from 1900 to 2200 (4,000 random from 1950 to 2075, nine around each of the 41 steps, eight by hand with unusual splits), 3,962 round trips, 378 round trips inside the window of amendment 10, 2,000 instants for UTC→TAI→TT against `utctai` and `taitt`, 4,000 for TDB − TT, and 8,078 Earth-orientation instants against today's arithmetic on the app's own data file and on a table with two leap-second jumps. All inside the bounds:

| Check | Bound | Measured worst |
|---|---|---|
| TAI − UTC from 1972 on | exact | exact |
| TAI − UTC in the drift years and held before 1960 | 1e-9 s | 0 |
| UTC→TAI moves the date by TAI − UTC | 1e-9 s | within the bound; 6.3e-8 s at the one instant split as `{ 2400000.5, 51544.5 }`, where one step of `b` is 9.9e-7 s |
| UTC→TAI→UTC, outside eleven seconds of a drift-table step | 1e-9 s | 9.6e-12 s |
| UTC→TAI→UTC, in the window before a drift-table step | 3.3e-9 s | 3.2e-9 s |
| UTC→TAI and UTC→TT against ERFA | 1e-6 s | 0 |
| UTC→TT→UTC | 1e-6 s | 2.4e-12 s |
| TDB − TT against ERFA `dtdb` | 50e-6 s | 3.75e-5 s |
| Earth orientation against today's arithmetic, values and `quality` | exact | exact |
| non-finite input, 66 calls | NaN in every number | holds |

  The held-out bound for the third row first read 1e-9 s at every instant; a part `b` of 51,544 days cannot carry that, so the check, not the module, was corrected to one step of `b` there. It is a property of the two-part form: the split `jd2` makes carries 1e-11 s.
- **Across the fix round** every one of the 64,045 numbers the module returns on the held-out set is identical before (`72e4d3f`) and after (`1e20e29`), and the diff of `time.ts` between the two holds comment lines only.
- **Review.** Independent reviewer on `72e4d3f`: pass with fixes, no Critical finding, one Important (the sampling of the drift years, a defect of the plan), three Minor. Re-review on `1e20e29`: all four addressed; with the reviewer's break (two wrong rows of the drift table) the 14-case file now fails 2 cases where the 13-case file passed.
- **The module read line by line** by the orchestrating session; its table compared with `dat.c`.
- **Runs, once, on `1e20e29`:** the six unit files `select-checks.mjs` lists for the changed files, 55 of 55; `npm run -s typecheck` clean. The same selection gives browser 0 of 54, heavy 0 of 34, fleet 0 of 6.

## Not checked

The printed source of the two-term formula was not looked up: its numbers are the work plan's, and it is held to ERFA.

The default, heavy and fleet suites (not selected for this change). Behaviour of the round trip within eleven seconds of a step of the drift table beyond what the plan's amendment 10 states. No browser run: the app does not call the module.
