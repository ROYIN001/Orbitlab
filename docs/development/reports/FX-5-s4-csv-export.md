# FX-5 step 4: CSV text cells and the Monte Carlo download / เซลล์ข้อความใน CSV และการดาวน์โหลด CSV ของ Monte Carlo

```yaml
envelope: v2
package: FX-5 (launch analysis correctness), step 4
step: 4
wave: K2 in the plan (S10 §10.8); done in the K1 overnight run, see "Wave and order" below
lane: U (physics lane reviews the 2-line change in src/physics/monte-carlo.ts)
items: [M-LAUNCH-034]
priority: P2
change_kind: bug-fix that changes bytes only in the cells D-45 names; tests added first
owner_authorization: {date: 2026-10-05, quote: "เมื่อทำการ merge แล้วตรวจสอบว่าทุกอย่างเรียบร้อยแล้วในระยะ K0 ให้เริ่มทำระยะ K1 ในเซสชั่นใหม่ต่อได้เลยครับ ใช้ model opus5.5 high", scope: "wave K1 (D-65)"}
decision_used: {id: D-45, date: 2026-10-05, quote: "(ก) ใส่ ' นำหน้าเฉพาะเซลล์ข้อความที่ขึ้นต้นด้วย = + - @", gloss: "CSV exports prefix ' only to text cells starting with = + - @"}
base_sha: 1a7960e (branch first cut on 6fea83f; rebased, no overlap)
branch: claude/u-fx5-s4
files: [src/csv-text.ts (new), src/physics/monte-carlo.ts, src/ui/csv.ts, src/lessons/recheck.ts, src/ui/monte-carlo.ts, tests/csv-export-cells.test.ts (new)]
not_touched: [physics results, recorder, CSS, i18n, budgets.json, existing tests and assertions, CHANGELOG.md, PROGRESS.md]
```

## What was wrong

1. **Monte Carlo download.** `MonteCarloWindow.downloadCsv` (`src/ui/monte-carlo.ts:370-378` on `origin/main`) made its own anchor and revoked the file's URL after 1000 ms. Every other export in the app goes through `downloadBlob` (`src/ui/download.ts`), which waits 5 s. On Safari and Firefox a large set may be cut off.
2. **Monte Carlo CSV, `\r`.** `csvText` in `src/physics/monte-carlo.ts:349` quoted a cell only for `"`, `,` and `\n`. A reason holding `\r` was written bare. A spreadsheet ends a row at `\r`, so the row split in two.
3. **No formula guard (D-45).** The Monte Carlo CSV's reason cell and the flight-data CSV's text cells (`src/ui/csv.ts`, rigid and flex columns) were written as they were. A text cell starting with `=`, `+`, `-` or `@` opens as a formula in a spreadsheet. The lesson re-check CSV (`src/lessons/recheck.ts`) already had the guard.

The three CSV exports did not share a writer. Each had its own copy of the text-cell code, and only the re-check copy followed D-45.

## The fix

- **`src/csv-text.ts` (new, 19 lines with its comment).** `csvText(v)` is the one writer of a CSV text cell. It is the re-check CSV's function, moved unchanged:
  - a text cell starting with `= + - @` gets a leading `'` (D-45, exact wording: text cells only, these four characters only);
  - the cell is quoted when it holds `,`, `"`, `\r` or `\n`.

  The file is DOM-free and imports nothing, so `src/physics` may use it (`tests/architecture.test.ts` passes). It is at the root of `src/` because `src/physics` may not import from `src/ui`.
- **Monte Carlo CSV** (`src/physics/monte-carlo.ts`): the local `csvText` is removed and the shared one imported. This is 1 import line and 2 removed lines. The reason cell is the only text cell that goes through it. The run index, law, outcome and the number columns are written as before.
- **Flight-data CSV** (`src/ui/csv.ts`): the two text-cell paths, `rigidColumns` and `flexColumns`, call `csvText`. They already quoted `\r`, so the guard is the only new behaviour.
  - Numbers keep their own branch, so `-5` stays `-5`.
  - The other text cells (phase, event keys, guidance law and status, fault kinds, navigation states, loop limiter names) hold identifiers made in code. None of them can start with `= + - @`, and they are not changed.
- **Lesson re-check CSV** (`src/lessons/recheck.ts`): it imports the shared writer instead of its own copy. The function is the same, so the output is byte-identical; `tests/recheck-core.test.ts` and `tests/recheck-design.test.ts` pass unchanged.
- **Monte Carlo download** (`src/ui/monte-carlo.ts`): `downloadBlob(new Blob([job.csv()], { type: 'text/csv' }), <same file name>)`. The URL is now revoked after 5 s. The file name and the type are unchanged.

The WebMCP tools read the same writers. `export_csv` and `run_monte_carlo` with `includeCsv` therefore get the same cells as the downloads.

## Tests: failing before

New file `tests/csv-export-cells.test.ts`, committed alone first (`f229bd7`). The run below is on `1a7960e`'s code (`origin/main`):

```
 FAIL  the Monte Carlo CSV (M-LAUNCH-034, D-45) > keeps a reason starting with = + - or @ as text: a leading ' and nothing else
Expected: "0,peg,lost,'=cmd|' /C calc'!A0,0,,,,,,,,,,,,"
Received: "0,peg,lost,=cmd|' /C calc'!A0,0,,,,,,,,,,,,"
 FAIL  the Monte Carlo CSV (M-LAUNCH-034, D-45) > quotes a reason holding a carriage return, so the row stays one row
AssertionError: expected '4,peg,lost,lost\rhere,0,,,,,,,,,,,,' to be '4,peg,lost,"lost\rhere",0,,,,,,,,,,,,'
 FAIL  the flight-data CSV (M-LAUNCH-034, D-45) > keeps a text cell starting with = + - or @ as text
Expected: "'=cmd"
Received: "=cmd"
 FAIL  the Monte Carlo CSV download (M-LAUNCH-034) > keeps the file's URL for 5 s, as every other download in the app
AssertionError: expected "revokeObjectURL" to not be called at all, but actually been called 1 times
      Tests  4 failed | 2 passed (6)
```

The two tests that passed before check what must not change:
- negative numbers (`-5.000`, `-2.5`, `-5`, `-0.250000000000`) are not given a `'`;
- plain reasons (`evt.aeroBreakup`) and quoted ones (`"error: a, b"`) keep their bytes;
- ordinary rigid text cells keep their bytes.

## CSV bytes that change on purpose

Only text cells that start with `= + - @`, and Monte Carlo reasons that hold `\r`, change:

| Export | Cell | Before | After |
|---|---|---|---|
| Monte Carlo | reason `=cmd…` | `=cmd…` | `'=cmd…` |
| Monte Carlo | reason `=a,b` | `"=a,b"` | `"'=a,b"` |
| Monte Carlo | reason `lost⏎here` (`\r`) | `lost\rhere` (row breaks) | `"lost\rhere"` |
| Flight data | `body_id` `=cmd`, `configuration_id` `@a\|b`, `rigid_data_revision` `-rev`, `rigid_model_version` `+v` | as is | `'` prefixed |
| Re-check | (none) | | byte-identical |

The app's own data never makes such cells:
- Monte Carlo reasons are event keys (`evt.*`), `timeout` or `error: <message>`;
- rigid identifiers are code ids.

A real flight shows this. The same six-DOF quick-start LEO flight (`rigidMission('leo')`, headless, first 700 s) was exported with the code before and after the change. Both files are 1 916 876 bytes with SHA-256 `611592d1…cd907a1`.

## Checks run

- `npm run -s typecheck`: clean.
- `npx vitest run` on these files: 14 files, 162 tests, all pass.
  - `tests/csv-export-cells.test.ts`, `tests/csv.test.ts`, `tests/monte-carlo.test.ts`;
  - `tests/recheck-core.test.ts`, `tests/recheck-design.test.ts`;
  - `tests/rigid-metadata.test.ts`, `tests/flex-config.test.ts`, `tests/control-faults.test.ts`, `tests/linear-loop.test.ts`, `tests/navigation.test.ts`, `tests/explicit-guidance.test.ts`, `tests/attitude-loop.test.ts`;
  - `tests/notation.test.ts`, `tests/architecture.test.ts`.
- `npx vitest run tests/mcp.test.ts`: 90/90 (`export_csv`, `run_monte_carlo` with `includeCsv`).
- `node --test tests/verification/*.test.mjs tests/browser/shard.test.mjs`: 66/66.
- Browser: `CHROMIUM=/opt/pw-browsers/chromium node tests/browser/run.mjs launch-explore recheck`: 2/2 passed.
  - `launch-explore` exported the whole flight's CSV through `export_csv` (2.42 MB, no ragged rows).
  - `recheck` ran the instructor's re-check: 6 records, counts unchanged.
- The full vitest suite was not run locally (4 shared CPUs); CI runs it on push.

## Size

`npx vite build; node scripts/bundle-budget.mjs`, built from `origin/main` (`1a7960e`) and from this branch:

| Group | main | branch | Δ | ceiling |
|---|---|---|---|---|
| precache code | 14723.3 kB | 14723.0 kB | −0.3 | 14724 |
| `index-*.js` | 2629.4 kB | 2629.1 kB | −0.3 | 2632 |
| `index-*.css` | 177.0 kB | 177.0 kB | 0 | 177 |
| `i18n-*.js` | 1723.4 kB | 1723.4 kB | 0 | 1725 |

The result is `bundle budget: ok`. No CSS and no strings were added, and `budgets.json` is not changed.

## Wave and order (code and GitHub win over plan text)

S10 §10.8, still a draft section, places M-LAUNCH-034 in wave K2. It puts it after M-LEARNING-006 (EQ-14, de-duplicate the export helpers with a byte oracle) and after D-45. The fold rule is "dedupe before the guard".

- D-45 is answered (2026-10-05), so the guard needs no owner question.
- M-LEARNING-006 is still open. This step took only the part of it the guard needs: one text-cell writer, which is the re-check's function moved unchanged, and byte-identical for the re-check CSV.
- The rest of 006 is left for 006: number formats, the BOM helper, download and file-name code.
- When 006 runs, its byte oracle is the output of this branch.

The work was dispatched in the K1 overnight run under the owner's standing instruction for bug fixes (DECISIONS, 2026-10-06, Process (Merge Desk)): "ถ้าจุดไหนที่ไม่ใช่ปัญหาที่ต้องตัดสินใจ เป็นแค่เรื่องแก้จากผิดเป็นถูก(แก้บั๊คที่เคยมีอยู่) ให้ดำเนินการเองต่อเนื่องได้เลยครับ". The integration session should confirm that a plan-K2 item may merge in K1 before merging it.

## Still to do (not in this PR)

- The plan asks for a manual download of a large Monte Carlo CSV on Safari and Firefox (Q or HU-6). That has not been done here: this run has Chromium only.
- Physics-lane review. S10 asks that P write any CSV line still in `src/physics`. The change there is one import line and two removed lines (the local `csvText`), and it needs the physics lane's review.
