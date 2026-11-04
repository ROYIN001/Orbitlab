# EQ-6 step 2: the six feature dictionaries move into per-language files (identical output)

This is the split PR of EQ-6 (M-PLATFORM-031, P1), S09's PR2: "ย้ายโมดูลฟีเจอร์ 6 ตัวเป็นไฟล์รายภาษา (ย้ายอย่างเดียว ไม่แก้ข้อความ)" ("move the 6 feature modules into per-language files; move only, no text changes"; `plan/S09-eq-identical-output.md:292`). It moves no string. The dictionary chunk `i18n-*.js` grows by 4 B (below). Every other built file is identical, except for three things: the hashed chunk names that point to the changed chunks; the service worker's precache manifest (the revisions and version of the changed files, and their order by URL); and the generated `SHA256SUMS` and `build-info.json`. The worker-path PR (S09's PR1) and the loader (PR3) come after it, in the order the owner chose for the window.

## Envelope

```yaml
envelope: v2
package: EQ-6
step: 2                          # S09's PR2 (the split); S09's PR1 is the worker path, PR3 the loader, PR4 typed keys
family: EQ
wave: K2
lane: I                          # L-C reviews the text move (S09 :279)
items: [M-PLATFORM-031]
sources: [RW:INF-02, DP:7.4-M1, "DP:UX-H3-5/INF-16(c)", CR:P1]
change_kind: identical-output
fold_of: "M-LEARNING-036 (typed keys) comes after the per-language split (folds.tsv; S09's PR4)"
or_ids: [OR-1, OR-2]
status: in_progress              # a local draft, not opened (S18 :424: review = PR open); set to review in the edit that opens the PR
scientific_acceptance: not-applicable
execution_authorized: true       # wave K2 (D-65)
owner_authorization: {date: 2026-10-28T02:54:22Z, quote: "รับรองและอนุญาต K2", scope: "D-65 wave K2 (S1 items 4–5; DECISIONS.md:386)"}
owner_answers:
  - {date: 2026-10-28T02:59:22Z, question: "S6 (how the EQ-6 window opens)", quote: "ก คง K2 วันที่ 1–2 (แนะนำ)", effect: "each EQ-6 PR carries its own oracle (S09 rule 7); M-LEARNING-030 does not hold the window (DECISIONS.md:391)"}
  - {date: 2026-10-28T13:34:15Z, question: "หน้าต่าง EQ-6 (form question 3 of 4)", quote: "ก 2 วันแรกหลัง merge ได้ แยกไฟล์ก่อน (แนะนำ)", effect: "the first two working days once merging is possible with no i18n PR open; the split PR, then the worker path, then the loader (DECISIONS.md:434)"}
  - {date: "2026-11-04, by 20:38:36Z", question: "when the EQ-6 PRs are prepared and the window opens", quote: "ก เตรียมตอนนี้ เปิดหน้าต่างหลัง HU-6 (แนะนำ)", effect: "prepared as drafts now; the window opens after HU-6 (K2 session's chat; not yet in DECISIONS)"}
base: {branch: origin/main, sha: 8dcc4b2598b4dc831cf497574fb6248df66360f8, date: 2026-11-04}
base_sha_verified_on: {sha: 8dcc4b2, date: 2026-11-05, recheck: "main still 8dcc4b2 at 2026-11-05T00:27Z; src/i18n/{en,ru,th}.ts:1-6 import the six feature modules and spread them in one fixed order; no `// lane:` anchor in src/i18n; 5,165 keys in each language; no worksheet key (ws.*, wsc.*, lesson.strip.caseLoading) in the six modules; only en/ru/th.ts and six tests import the six modules"}
reading_list: ["plan/S09-eq-identical-output.md:278-296 (EQ-6) and rules 1, 7, 9, 10 (:43, :49, :51, :52)", "plan/S07-r0-evidence-oracles.md:320, :322 (EO-I18N-1, EO-BUN-1)", "plan/S05-structure-waves-gates.md:324 (EQ-6 window)", "plan/S18-execution-model.md §18.3.2, §18.9 (:282), §18.11 (:327)", "SESSION-PROTOCOL.md §3-§4"]
dependencies: [FX-2 (M-LEARNING-027, merged #176/#177), "ED-I18N-1 (M-LEARNING-029 merged #135; M-LEARNING-030 does not hold the window, owner S6)"]
decisions_needed: []
allowed_write_paths: ["src/i18n/**", tests/i18n-resolved-snapshot.test.ts, tests/fixtures/i18n/eo-i18n-1.json, docs/development/reports/EQ-6-i18n-split.md, changes/claude-i-eq6-s2.md]
borrowed_paths:
  - "tests/lesson-pack-names.test.ts <- L-C (import lines only; reviewer L-C)"
  - "tests/lesson-review.test.ts <- L-C (import lines only; reviewer L-C)"
  - "tests/experiment-notebook.test.ts <- L-UI (import lines only; reviewer L-UI)"
  - "tests/classroom-pwa.test.ts <- L-UI (import lines only; reviewer L-UI)"
  - "tests/project-archive.test.ts <- L (import lines only; reviewer L)"
  - "tests/validation-read-report.test.ts <- no lane in the S18 §18.2 table for src/validation/**; I names its reviewer (import lines only)"
hook_requests: []
oracle: [EO-PR-EQ-6-s2-1, EO-PR-EQ-6-s2-2]   # per-PR forms of the catalog rows EO-I18N-1 and EO-BUN-1 (S07 :320, :322); kit 3d (M-PLAN-018) has not merged (S18 :282, :327)
pr_oracles:
  - id: EO-PR-EQ-6-s2-1
    catalog: EO-I18N-1
    what: "per language: key count, own-key count, raw SHA-256 (own entries in object order), resolved SHA-256 (tFor with each {name} filled \"<name>\"; tCountFor at 0, 1, 2, 5 and 1.5 for values with \"|\"); one SHA-256 per first key segment (89)"
    files: [tests/i18n-resolved-snapshot.test.ts, tests/fixtures/i18n/eo-i18n-1.json]
    recorded: "commit 1 (fe3ceec), green on 8dcc4b2 before any source change; re-recorded on the window day if main's strings have moved (§ The window)"
    sabotage: "on 8dcc4b2, reverted: delete th 'setup.dynamics.model' -> 4 of 4 fail; swap ...workspaceTh and ...projectsTh -> raw fails (1 of 4); a new key in all three languages -> 4 of 4 fail, and the dump diff shows that key only"
    after_merge: "stays on main until kit 3d's EO-I18N-1 replaces it; a string PR re-records the fixture with its dump diff (lane I's proposal, for Q; § After merge)"
  - id: EO-PR-EQ-6-s2-2
    catalog: EO-BUN-1 (catalog form)
    what: "vite build --sourcemap of base and head into separate outDirs (dist keeps sourcemap: false); the (source, sha256(sourcesContent), chunk groups) rows outside the 27 declared paths equal; per entry raw/gzip bytes and module set; 12 workers byte-identical; no INEFFECTIVE_DYNAMIC_IMPORT"
    recorded: "a D-type build comparison, base and head in one run; no committed file: the script and command lines are in this report (S18 :327 asks for a first commit; a deviation for Q to accept)"
    sabotage: "head + one extra module imported by main.ts -> the inventory differs; head + `import { getLang } from '../i18n'` in reentry.worker.ts -> that worker's row differs (+63 B, +1 module src/i18n/index.ts)"
perf_evidence: none              # no speed claim; sizes below
kpi_targets: {}                  # none claimed (KPI-01 is PR3's, with M-PLATFORM-041)
stop_rule: "S07 §07.5: if an oracle moves, this PR is not EQ"
rollback: {method: revert, data_compat: "no stored data, storage key, export or cache format changes; the built pages hold the same strings", verified_by: "EO-I18N-1 and EO-BUN-1 equal on base and head, so a revert gives the base output back"}
reviewers: [second-agent (P1, D-25), L-C (text move), "owners of the borrowed tests (L-C, L-UI, L, I)", "Q (oracle files)"]
report: docs/development/reports/EQ-6-i18n-split.md
handoff: []
```

## What changed

| Change | Files |
|---|---|
| Deleted (6) | `src/i18n/{workspace,projects,review,experiments,classroom,validation}.ts` |
| Added (18) | `src/i18n/<feature>.{en,ru,th}.ts`. Each holds one exported block (`workspaceEn` …), byte for byte as it was, with its doc comment (the five one-line doc comments sat above the English block and stay there; see "Paths and comments that still describe the old layout"). `workspace.ru.ts` and `workspace.th.ts` add `import type { workspaceEn } from './workspace.en';` so `typeof workspaceEn` still compiles. |
| Edited (3) | `src/i18n/en.ts`, `ru.ts`, `th.ts`, lines 1–6 only: `from './<feature>'` becomes `from './<feature>.<lang>'`. The spread order and every inline key are unchanged. |
| Borrowed (6, import lines only) | `tests/lesson-pack-names.test.ts`, `tests/lesson-review.test.ts`, `tests/experiment-notebook.test.ts`, `tests/classroom-pwa.test.ts`, `tests/project-archive.test.ts`, `tests/validation-read-report.test.ts`: the one import of three names from `../src/i18n/<feature>` becomes three imports from `../src/i18n/<feature>.<lang>`. |
| Oracle (commit 1) | `tests/i18n-resolved-snapshot.test.ts`, `tests/fixtures/i18n/eo-i18n-1.json` |
| Evidence | this report; `changes/claude-i-eq6-s2.md` |
| Not touched | `src/i18n/index.ts`, `vite.config.ts`, `budgets.json` (lane T; S09 rule 9), `src/main.ts`, `src/lessons/text.ts`, `src/pwa/manifest.ts` |

No re-export barrels at the old paths: they would fail `tests/i18n.test.ts:485` ("reads the source tree it is supposed to scan"), which requires every `src/i18n/*.ts` other than `index.ts` to declare a dictionary. So the six test imports are retargeted.

**Line count (D-25).** Commit 2's diff is +748/−744 lines. The six deleted modules held 720 lines. 710 of them come back unchanged in the 18 new files. The other 10 are the blank lines between blocks, which are dropped: `workspace.ts` had none, and each of the other five loses 2. The 18 new files hold 712 lines: the 710 moved lines and the 2 `import type` lines. The lines a reviewer reads as changed are the 18 import lines in `en/ru/th.ts`, the 2 `import type` lines and the 18 test import lines (6 removed). The move is checked by the script below, not by reading.

## How the strings moved

By script (`split.mjs`, scratch, not committed; reproduced at the end of this report). For each feature module it:

1. splits the file at its `export const` boundaries, keeping a one-line `/** … */` comment directly above a block with that block;
2. checks that there are exactly three blocks, in the order En, Ru, Th, each named `<feature>En/Ru/Th`;
3. writes each block to `<feature>.<lang>.ts` with only the trailing blank separator line dropped, plus the `import type` line where the block uses `typeof <feature>En`;
4. checks that the three new files, with the added `import type` line removed and the old separators put back, reassemble into the old file byte for byte;
5. rewrites lines 1–6 of `en/ru/th.ts` and checks that nothing below line 6 changed.

The script's output is also byte-identical to the prototype's 18 files and `en/ru/th.ts` heads (the plan's prototype at `7263004`), so nothing in the six modules changed between `7263004` and `8dcc4b2`.

## Oracles

Kit 3d (M-PLAN-018: EO-EXP-1, EO-I18N-1, EO-BUN-1) has not merged: no test, fixture or script on `8dcc4b2` names EO-I18N-1 or EO-BUN-1. So, by S09 rule 1 and the owner's S6 answer, this PR carries its own oracles, `EO-PR-EQ-6-s2-1` and `-2` in the envelope's `oracle` field (S18 `:282`, `:327`), each the per-PR form of a catalog row.

### EO-I18N-1 (`EO-PR-EQ-6-s2-1`; `tests/i18n-resolved-snapshot.test.ts`, commit 1)

Over the sorted union of the keys of en, th and ru (5,165; each language has all of them):

- **raw**, per language: SHA-256 of `JSON.stringify(Object.entries(dict))`, the dictionary's own entries in the order the object holds them. A changed value or key, a changed spread order, or a duplicate key that overrides another changes it, even when the English fallback would read the same.
- **resolved**, per language: SHA-256 of one line per key, `JSON.stringify([key, tFor(lang, key, params), ...counted])`. Every `{name}` placeholder the key has in any language is filled with the fixed text `<name>`. A key whose value contains `|` in any language (11 keys) also goes through `tCountFor` at 0, 1, 2 and 5 (no decimals) and 1.5 (one decimal); for example `["build.req.n.days","день|дня|дней|дня","0 дней","1 день","2 дня","5 дней","1,5 дня"]`.
- **counts**, per language: the union's size and the dictionary's own key count.
- **segments**: one SHA-256 per first key segment (89, sorted, from `a11y` to `zone`) over the three languages' own value and resolved line, so a failure names the area.

The fixture (8,261 B) holds only these digests. The test reads and compares it and never writes it, so `vitest -u` cannot re-record it. `VITE_ORBITLAB_I18N_DUMP=1` writes the full dump (every raw and resolved line per language, 3.5 MB) to `tests/probe/eo-i18n-1/` (gitignored) for diffing; it is written before the comparisons run, so it is there when they fail. It was not committed.

**Recorded on the base.** Commit 1 (`fe3ceec`) is the test and fixture alone on `8dcc4b2`. `npx vitest run tests/i18n-resolved-snapshot.test.ts` there: 4 passed (4). The fixture equals that run's `snapshot.json` (with `_recorded` removed).

**Sabotage on the base** (each reverted with `git checkout`; nothing committed):

| Sabotage | Result |
|---|---|
| delete the Thai line `'setup.dynamics.model': 'แบบจำลอง',` from `th.ts` (the key falls back to English) | 4 failed (4): `th: expected [ 5165, 5164 ] to deeply equal [ 5165, 5165 ]`; th raw `8c6e929c…` ≠ `83235324…`; th resolved `04b6e1ad…` ≠ `5a1d22ba…`; segments differ in `"setup"` only (`7199ff45…` ≠ `dd56b3c6…`). The dump is still written. |
| swap `...workspaceTh, ...projectsTh` in `th.ts`'s spread (no key overlaps, so no text changes) | 1 failed, 3 passed (4): th raw `e3b2f08b…` ≠ `83235324…`; resolved, counts and segments equal |
| a new key `classroom.zzNew` in all three languages (`classroom.ts`, values `zz En`, `zz Ru`, `zz Th`) | 4 failed (4): `expected 5166 to be 5165`; en raw `c885133d…` ≠ `53b5c360…`; en resolved `3daa9d61…` ≠ `1d07f3f9…`; segments differ. The base-vs-head diff of the three `*.resolved.jsonl` dumps is one added line each (`["classroom.zzNew","zz En"]` …) and nothing else. This is how a later string PR shows that the existing keys did not change (below). |

**After the split** (commit 2, `27422cf`): 4 passed (4), the fixture unchanged. The full dumps of base and head (`snapshot.json` and the six `*.jsonl` files) are byte-identical (`diff -r`: no output).

**After merge: how long this file lives.** This is lane I's proposal; Q, who reviews the oracle files, accepts or changes it before merge. The test's doc comment says the same.
- It stays on main until kit 3d's EO-I18N-1 (M-PLAN-018) replaces it. The PR that brings the kit's form deletes this one (S18 `:327`: a per-PR oracle that is of general use moves into a kit).
- A PR that changes no string leaves it green and does not touch the fixture: the worker-path PR and the loader PR of this window, and PR4 (typed keys).
- A PR that adds or changes strings is not identical-output (S07 `:320`: "การเปลี่ยนคำต้องเป็น PR ชนิดอื่น", "a wording change is a PR of another kind"). It re-records the fixture in the same PR:
  1. it writes the dump on its merge base and on its head and attaches the diff of the two. Only its own keys may appear, which shows that every other key reads as before, as S11 `:37` asks for R2's new keys ("EO-I18N-1 ของ key เดิมไม่เปลี่ยน");
  2. it copies the head's `snapshot.json` into the fixture, with `_recorded` naming the merge base and the PR;
  3. L-C reads the diff, and Q reviews the fixture.

### EO-BUN-1, catalog form (`EO-PR-EQ-6-s2-2`; a build comparison, no committed file)

S09 and the plan for this PR do not add a script under `scripts/verification/`; EO-BUN-1's permanent form is kit 3d's. It is a D-type oracle: base and head are built and compared in one run (S18 `:282`), so there is nothing to record green on the base. S18 `:327` says a per-PR oracle is recorded as the PR's first commit; this one has no committed file. That is a deviation from that wording, for Q to accept, or to ask for the script as a committed file. To make it re-runnable, the script (`eo-bun-1.mjs`), the whole-dist comparison (`dist-compare.mjs`) and the command lines are at the end of this report.

- **Builds.** Both sides are `git archive` copies, of commit 1 (the base's app source; it differs from `8dcc4b2` only in the two test files) and of commit 2, so both carry the build stamp `dev` and the stamp is not part of the difference (see "Build stamp" below). In each copy: `npx vite build --sourcemap --outDir <scratch>/sm-<side> --emptyOutDir > build-sm-<side>.log 2>&1`, and `npx vite build --outDir <scratch>/dd-<side> --emptyOutDir` for the whole-dist comparison. `dist` and `vite.config.ts` keep `sourcemap: false`.
- **Comparison.** `node eo-bun-1.mjs sm-base sm-head build-sm-base.log build-sm-head.log <the 27 declared paths>`. For each emitted `.js` and its map it records: the chunk's group (file name with its hash dropped; the two `archive-*.js` chunks are told apart by their last module); its bytes without the `//# sourceMappingURL=` line; its gzip -9 size; and the set of (source path, SHA-256 of `sourcesContent`). The declared change list is 27 paths: the 6 deleted modules, the 18 added files and `en/ru/th.ts`.

| Check | Base | Head | Result |
|---|---|---|---|
| distinct sources | 535 | 547 | +12 = 18 added − 6 deleted |
| (source, sha256, chunk groups) rows outside the 27 paths | 526 | 526 | equal |
| declared paths, and where they sit | 9 (6 modules, en/ru/th), all in `i18n-*.js` only | 21 (18 files, en/ru/th), all in `i18n-*.js` only | no module missing or duplicated; none in a worker |
| `INEFFECTIVE_DYNAMIC_IMPORT` in the build log | 0 | 0 | — |
| the 12 workers | — | — | byte-identical, same names |

Per entry, stamp `dev` on both sides. The raw bytes are the same on both sides except `i18n-*.js`. "differ" in the last column is the hashed chunk names inside the file, which keep their length. A 3-character stamp makes `index-*.js` and `recheck.worker-*.js` 5 B smaller than in the stamped builds of "Sizes".

| Entry | Kind | Raw B base → head | gzip B base → head | Modules | Module set | Bytes |
|---|---|---:|---:|---:|---|---|
| `index-*.js` | main | 2,653,907 | 817,834 → 817,846 | 400 | equal | differ |
| `archive-*.js` (projects/archive.ts) | lazy | 10,650 | 3,941 → 3,943 | 2 | equal | differ |
| `archive-*.js` (workspace/archive.ts) | lazy | 2,771 | 1,203 → 1,206 | 1 | equal | differ |
| `assessment-view-*.js` | lazy | 17,153 | 5,879 → 5,883 | 3 | equal | differ |
| `author-view-*.js` | lazy | 26,388 | 7,215 → 7,217 | 2 | equal | differ |
| `bank-*.js` | lazy | 414,852 | 117,834 → 117,834 | 9 | equal | differ |
| `catalog-*.js` | lazy | 172,824 | 48,784 → 48,785 | 10 | equal | differ |
| `check-view-*.js` | lazy | 11,511 | 3,975 → 3,977 | 1 | equal | differ |
| `download-*.js` | lazy | 2,646 | 1,177 → 1,177 | 2 | equal | differ |
| `i18n-*.js` | lazy | 1,732,544 → 1,732,548 | 418,583 → 417,243 | 11 → 23 | differs (the declared paths) | differ |
| `lesson-file-*.js` | lazy | 345,485 | 110,451 → 110,450 | 61 | equal | differ |
| `media-archive-*.js` | lazy | 2,404 | 1,087 → 1,087 | 1 | equal | differ |
| `media-ownership-*.js` | lazy | 1,158 | 593 → 594 | 1 | equal | differ |
| `profile-menu-*.js` | lazy | 47,579 | 13,355 → 13,358 | 3 | equal | differ |
| `solar-daily-*.js` | lazy | 206,839 | 65,679 → 65,679 | 1 | equal | identical |
| `standard-magnitudes-*.js` | lazy | 37,452 | 10,385 → 10,385 | 1 | equal | identical |
| `validation-*.js` | lazy | 7,731 | 3,282 → 3,281 | 1 | equal | differ |
| `worksheet-view-*.js` | lazy | 18,312 | 6,896 → 6,903 | 4 | equal | differ |
| `workspace-content-*.js` | lazy | 33,932 | 10,736 → 10,740 | 8 | equal | differ |
| `attitude-tune.worker-*.js` | worker | 11,353 | 4,614 → 4,614 | 5 | equal | identical |
| `flight.worker-*.js` | worker | 570,621 | 182,578 → 182,578 | 100 | equal | identical |
| `lifetime-altitude.worker-*.js` | worker | 121,968 | 37,617 → 37,617 | 24 | equal | identical |
| `lifetime.worker-*.js` | worker | 39,053 | 15,213 → 15,213 | 11 | equal | identical |
| `monte-carlo.worker-*.js` | worker | 541,026 | 173,074 → 173,074 | 98 | equal | identical |
| `ratings.worker-*.js` | worker | 550,223 | 175,776 → 175,776 | 102 | equal | identical |
| `readiness.worker-*.js` | worker | 564,304 | 180,039 → 180,039 | 102 | equal | identical |
| `recheck.worker-*.js` | worker | 879,235 | 279,043 → 279,043 | 162 | equal | identical |
| `reentry.worker-*.js` | worker | 57,856 | 23,995 → 23,995 | 18 | equal | identical |
| `requirement-trades.worker-*.js` | worker | 135,819 | 43,353 → 43,353 | 42 | equal | identical |
| `screening.worker-*.js` | worker | 30,098 | 13,946 → 13,946 | 13 | equal | identical |
| `tune.worker-*.js` | worker | 542,770 | 173,654 → 173,654 | 98 | equal | identical |

**The whole `dist`** (`node dist-compare.mjs dd-base dd-head`; no sourcemaps, stamp `dev` on both sides): 96 files on each side.

| Files | Result |
|---|---|
| 75 | byte-identical at the same path (the 12 workers, the other js/css files whose name does not change, and every non-code file) |
| 17: 16 renamed js chunks and `index.html` | identical once the old hashed chunk names in them are replaced by the new ones |
| `i18n-*.js` | 1,732,544 → 1,732,548 B (the +4 B, below) |
| `sw.js` | the code outside the precache manifest is identical. The manifest has the same 68 entries. 18 of them have a new revision: the 17 files with a new name (the 16 chunks above and `i18n-*.js`) and `index.html`. Its version changes (`0ab53e602b6d9d` → `0e63525d672506`). Three js/css pairs swap places (`index`, `profile-menu`, `workspace-content`), because the manifest is sorted by URL and a js chunk's new hash can sort it past its css. Every revision equals its file's SHA-256 (16 hex) on both sides. |
| `SHA256SUMS`, `build-info.json` | generated: the hashes and names of the changed files; `builtAt` |

So the 33 js/css files other than `i18n-*.js`, and `index.html`, are all identical up to hashed chunk names.

**The workers' import path, before and after.** No worker bundle holds any `src/i18n/*` module or `src/lessons/text.ts`, on either side (the sources of the 12 worker maps). The source chain S09 names (`recheck.worker.ts` → `recheck.ts` → `measures.ts` → `text.ts` → `src/i18n` for `getLang`) is unchanged: this PR does not touch `index.ts` or `text.ts`, and the six moved modules are imported only by `en/ru/th.ts`. The worker leak S09 warns about comes with PR3's `import()`, which is why the worker-path PR comes before PR3.

**Sabotage** (on a scratch copy of the split, deleted after; nothing committed):

| Sabotage | Result |
|---|---|
| a new module `src/eo-bun-sabotage.ts` (`console.debug('eo-bun-1 sabotage');`) imported by `src/main.ts` | rows outside the change list differ: `src/eo-bun-sabotage.ts` new in `index-*.js`, `src/main.ts` with another hash; `index-*.js` 2,653,907 → 2,653,942 B, 400 → 401 modules; workers byte-identical |
| `import { getLang } from '../i18n'; console.debug(getLang());` at the top of `src/orbit/reentry.worker.ts` | `reentry.worker-*.js` row differs: 57,856 → 57,919 B (gzip 23,995 → 24,012), 18 → 19 modules (`src/i18n/index.ts` now also in this worker); "12 workers byte-identical" is false |

**Build stamp.** `__ORBITLAB_BUILD__` (`src/build-info.ts`, `vite.config.ts:18-27`, `:111`) puts `git rev-parse --short HEAD` into `index-*.js` and `recheck.worker-*.js`: `dev` where git cannot answer (the copies above), 8 characters in this clone, and 7 in CI. CI's `actions/checkout@v4` sets no `fetch-depth`, so it gets a depth-1 clone; a depth-1 clone here (about 1,990 objects) gives 7. Each character is 1 B in each of the two files. Between the stamped builds of commit 1 (`fe3ceecf`) and commit 2 (`27422cfe`), the 12 workers differ only in the recheck worker's stamp. With the stamp replaced by a placeholder they are all identical, and with `dev` on both sides they are byte-identical (the table above). The recheck worker's bytes change with every commit; its size changes only with the stamp's length.

## Sizes (every budget line)

`npx vite build && node scripts/bundle-budget.mjs` in this clone, base = commit 1 (stamp `fe3ceecf`), head = commit 2 (stamp `27422cfe`); bytes counted the way `scripts/bundle-budget.mjs` counts them. `bundle budget: ok` on both.

| Budget line | Base (B) | Head (B) | Δ | Ceiling (B) | Room base → head |
|---|---:|---:|---:|---:|---:|
| `index-*.js` | 2,653,912 | 2,653,912 | 0 | 2,655,000 | 1,088 → 1,088 |
| `index-*.css` | 178,321 | 178,321 | 0 | 179,000 | 679 → 679 |
| `flight.worker-*.js` | 570,621 | 570,621 | 0 | 589,000 | 18,379 → 18,379 |
| `tune.worker-*.js` | 542,770 | 542,770 | 0 | 561,000 | 18,230 → 18,230 |
| `monte-carlo.worker-*.js` | 541,026 | 541,026 | 0 | 559,000 | 17,974 → 17,974 |
| `ratings.worker-*.js` | 550,223 | 550,223 | 0 | 569,000 | 18,777 → 18,777 |
| `readiness.worker-*.js` | 564,304 | 564,304 | 0 | 583,000 | 18,696 → 18,696 |
| `reentry.worker-*.js` | 57,856 | 57,856 | 0 | 60,000 | 2,144 → 2,144 |
| `lifetime.worker-*.js` | 39,053 | 39,053 | 0 | 40,000 | 947 → 947 |
| `screening.worker-*.js` | 30,098 | 30,098 | 0 | 31,000 | 902 → 902 |
| `attitude-tune.worker-*.js` | 11,353 | 11,353 | 0 | 12,000 | 647 → 647 |
| `recheck.worker-*.js` | 879,240 | 879,240 | 0 | 902,000 | 22,760 → 22,760 |
| `lifetime-altitude.worker-*.js` | 121,968 | 121,968 | 0 | 122,000 | 32 → 32 |
| `requirement-trades.worker-*.js` | 135,819 | 135,819 | 0 | 136,000 | 181 → 181 |
| `other chunks` | 771,417 | 771,417 | 0 | 772,000 | 583 → 583 |
| `precache` | 15,797,574 | 15,797,578 | +4 | 16,078,000 | 280,426 → 280,422 |
| `precache code` | 14,678,373 | 14,678,377 | +4 | 14,679,000 | 627 → 623 |
| `precache data/` | 1,119,201 | 1,119,201 | 0 | 1,399,000 | 279,799 → 279,799 |
| `catalog-*.js` | 172,824 | 172,824 | 0 | 180,000 | 7,176 → 7,176 |
| `author-view-*.js` | 26,388 | 26,388 | 0 | 26,500 | 112 → 112 |
| `check-view-*.js` | 11,511 | 11,511 | 0 | 12,000 | 489 → 489 |
| `workspace-content-*.js` | 33,932 | 33,932 | 0 | 35,000 | 1,068 → 1,068 |
| `workspace-content-*.css` | 4,758 | 4,758 | 0 | 5,000 | 242 → 242 |
| `i18n-*.js` | 1,732,544 | 1,732,548 | +4 | 1,733,000 | 456 → 452 |
| `lesson-file-*.js` | 345,485 | 345,485 | 0 | 347,000 | 1,515 → 1,515 |

68 precache entries on both sides. The report-only columns (M-PLAN-020) move in gzip and brotli only: `i18n-*.js` gzip 418.6 → 417.2 kB, brotli 302.7 → 301.5 kB; precache code gzip 7,439.2 → 7,437.9 kB; initial load gzip 1,435.2 → 1,433.9 kB. No speed or KPI-01 claim is made from these (S09 rule 3).

**CI's figures (7-character stamp).** The same build and budget in depth-1 clones of `8dcc4b2` (stamp `8dcc4b2`) and of commit 2 (stamp `27422cf`). Four lines differ from the table; every other line is the same, and `bundle budget: ok` on both:

| Budget line | Base (B) | Head (B) | Room base → head |
|---|---:|---:|---:|
| `index-*.js` | 2,653,911 | 2,653,911 | 1,089 → 1,089 |
| `recheck.worker-*.js` | 879,239 | 879,239 | 22,761 → 22,761 |
| `precache` | 15,797,572 | 15,797,576 | 280,428 → 280,424 |
| `precache code` | 14,678,371 | 14,678,375 | 629 → 625 |

CI builds the PR's merge commit, which also has a 7-character stamp. The room CI measures is still to be read from the PR's run.

**Where the +4 B comes from.** The chunk's 18 feature objects are now declared language by language (all English, then the Russian ones, then the Thai) instead of feature by feature, because each language file now imports only its own six. In the base the minifier inlines the Russian and Thai dictionaries into the `{ en, ru, th }` table (`en:O,ru:{…},th:{…}`); in the head the Russian dictionary keeps a variable (`ru:C` with `,C={…}` declared earlier), which is `,C=` plus `C`: 4 bytes. No string byte changes (EO-I18N-1). The same +4 B showed in the plan's prototype on `7263004`.

**Ceilings.** None is exceeded and `budgets.json` is not edited (lane T, S18 §18.3.3; S09 rule 9). No 0-B variant was needed, so none was searched for; the only place a variant could sit within this PR's scope is the import lines, and the spread order is pinned by EO-I18N-1's raw digest. S09's quality guard "ขนาด precache ไม่เปลี่ยน" ("the precache size does not change") is not met to the byte: precache grows by 4 B, stated here and not hidden.

## Tests run

All on commit 2 (`27422cf`) unless marked; repeated on 2026-11-05 after the history was rewritten for the fixes below (the app source is the same tree as before).

| Command | Result |
|---|---|
| `npx vitest run tests/i18n-resolved-snapshot.test.ts` on commit 1 alone (`fe3ceec`, base source) | 4 passed (4) |
| the same with each sabotage (above) | 4 failed (4); 1 failed, 3 passed (4); 4 failed (4) |
| `npm run -s typecheck` (commit 1 and commit 2) | clean |
| `npx vitest run tests/i18n*.test.ts tests/worker-language-boundary.test.ts tests/architecture.test.ts tests/profiles-i18n.test.ts tests/lesson-pack-names.test.ts tests/experiment-notebook.test.ts tests/project-archive.test.ts tests/classroom-pwa.test.ts tests/validation-read-report.test.ts tests/lesson-review.test.ts` | 13 files, 137 passed (137): architecture 6, classroom-pwa 14, experiment-notebook 16, i18n-counts 7, i18n-resolved-snapshot 4, i18n-thai-terms 4, i18n 19, lesson-pack-names 5, lesson-review 5, profiles-i18n 2, project-archive 45, validation-read-report 8, worker-language-boundary 2 |
| `npx vitest run tests/repo-hygiene.test.ts` | 9 passed (9) |
| `node --test tests/verification/*.test.mjs tests/browser/shard.test.mjs` (CI's job, `ci.yml:35`; includes `change-map.test.mjs`, which reads `git ls-files`) | 93 tests, 93 pass, 0 fail |
| `npx vitest run` (the whole unit suite; selected by `select-checks`, below), in a depth-1 clone of commit 2 | 342 files, 10,603 passed (10,603), 928 s |
| `npx vite build && node scripts/bundle-budget.mjs` (base and head; and in depth-1 clones) | ok on all four; tables above |
| EO-BUN-1 and the whole-dist comparison, with their sabotage | as above |
| `FONTCONFIG_FILE=<fonts.conf> node tests/browser/run.mjs` + the 8 selected journeys that are not held, in the depth-1 clone of commit 2 (its `dist`, stamp `27422cf`; Playwright's Chromium headless shell 1243 from `PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers`, the build CI installs) | 8/8 passed in 1,092 s, one run each; `case-worksheet-exports` held, not run |
| `git diff --check 8dcc4b2` | clean |

**`select-checks`.** `node scripts/verification/select-checks.mjs --files <the PR's paths>` selects typecheck, build, budget; every unit file; 9 journeys (`@layout-journeys`, `case-worksheet-exports`, `webgl-startup`); and all of heavy (34) and the six-DOF fleet (6). The `src/i18n/**` paths select rules `i18n`, `app-build`, `privacy-inventory` and `always-repo-hygiene`. The whole unit suite, heavy and the fleet come from rule `test-harnesses` (`tests/fixtures/**`), which the new fixture matches. That fixture is read only by `tests/i18n-resolved-snapshot.test.ts`. Run: typecheck, build, budget, the whole unit suite. The 8 selected journeys that are not held (`mobile-smoke`, `notation-defaults`, `r2-shell-smoke`, `r2-viewport-matrix`, `r2-viewport-scene-floor`, `stage2-preflight`, `webgl-startup`, `workspace-navigation`) ran on the head's `dist`, one run each, no rerun. They used Chromium headless shell from `/opt/pw-browsers` and a `FONTCONFIG_FILE` that maps `system-ui` and `sans-serif` to DejaVu Sans, as on the CI runners. Not run:
- heavy and the six-DOF fleet: no physics, data or worker source changes, the 12 workers are byte-identical, and these are the slow suites (heavy 25–61 min, the fleet ~60 min, S05 `:360`);
- `case-worksheet-exports`: it is held with the teaching tools (`tests/browser/held.mjs:9-11`, `src/ui/held.ts`), so neither CI nor Pages runs it. The owner's S4 answer ("ข พักต่อ ตรวจ G0 บนบิลด์ครู (แนะนำ)") leaves it to EO-I18N-1 here. No `ws.*`, `wsc.*` or other worksheet key sits in the six modules on `8dcc4b2`. The journey only records hashes of `en/th/ru.ts` (`case-worksheet-exports.mjs:31`), which change at lines 1–6, and asserts nothing on them.

## Paths and comments that still describe the old layout

- `tests/verification/change-map-trials.json:280-288` lists `src/i18n/{classroom,experiments,projects,review,validation,workspace}.ts`. It is a historical trial fixture of R0.3r (the paths a past PR changed), not a live list, so it is left as it is (`change-map.test.mjs` passes on it, above).
- `docs/development/plan/S18-execution-model.md:124` and `S16-ed-hu.md:234` name `src/i18n/workspace.ts` and `src/i18n/review.ts`. The plan text is not edited by work PRs; after the window the convention is S18 §18.3.2's (`:126`): keys live in the per-feature, per-language modules, `<feature>.<lang>.ts`, and I adds the spread line.
- **Doc comments moved verbatim** (a follow-up for lane I, not this move-only PR). Each of these one-line comments now sits above the English block only:
  - `experiments.en.ts:1` "Experiment notebook copy, kept together for parity across all three locales" and `classroom.en.ts:1` "Classroom preparation strings stay together so each language covers the same states" describe the layout this PR removes;
  - `projects.en.ts:1` "flat keys are spread into the application's three dictionaries" heads a file that is spread into `en` only;
  - `review.en.ts:1` and `validation.en.ts:1` speak of every language's translations.

  Comments are stripped from the build, so rewording them in a later PR still gives identical output; only the declared paths' `sourcesContent` changes.

## The window and what this PR waits on

- **Window.** S05 `:324` puts EQ-6 on K2 days 1–2. The owner's answers move it. On 2026-10-28 (13:34:15Z): the first two working days once merging is possible with no i18n PR open, with this split first, then the worker path, then the loader. On 2026-11-04: "ก เตรียมตอนนี้ เปิดหน้าต่างหลัง HU-6 (แนะนำ)". So this PR is prepared now, stays a local draft until HU-6 ends, and opens window day 1.
- **Window day 1, before the PR opens** (S09 step 1, `:291`: the baselines are recorded "บน main SHA ณ วันนั้น", on main's SHA on that day):
  1. Fetch main and rebase this branch onto it. If main changed any of the six modules or `en/ru/th.ts` lines 1–6, do not resolve the conflict by hand. Redo commit 2 with `split.mjs` on the new base instead.
  2. Run commit 1 alone on the new merge base: `npx vitest run tests/i18n-resolved-snapshot.test.ts`. If it fails, main's strings have moved (for example a K1-38 wording PR or a K2 string PR). Re-record the fixture there: write the dump, copy `snapshot.json` into the fixture, and set `_recorded.base`. Run the three sabotages again and amend commit 1.
  3. Run commit 2 on top: 4 of 4, and dumps identical to the new base's.
  4. Rebuild EO-BUN-1 (both scripts) and `bundle-budget` on the new base and head. Update the sizes, the room tables and this report: the "456 → 452" and "627 → 623" figures are `8dcc4b2`'s. If the split's +4 B no longer fits a ceiling, look for a 0-B variant or stop. No ceiling is raised (S09 rule 9).
  5. Check the open PRs (next item). Push with `git push -u origin claude/i-eq6-s2`. The local branch has no upstream: it was unset, because the worktree had set `origin/main`. Then open the PR and set `status: review`.
- **No other PR on `src/i18n/**`.** At 2026-11-05T00:27:25Z, three PRs are open (REST `pulls?state=open` and `pulls/<n>/files`): #188, #190 and #192, all replay bug fixes. None touches `src/i18n/**`, the six borrowed tests or the oracle files. Check again when the window opens: `gh api 'repos/ROYIN001/Orbitlab/pulls?state=open'`, then each PR's files.
- **Branches that touch `src/i18n/`** and would need a rebase onto the per-language files if revived: the plan's scan lists 16 (`codex/stage3-stage4-improvements` touches all six deleted modules). It was made on `7263004`; it was not repeated here.
- **Reviews before merge:** a second agent (M-PLATFORM-031 is P1, D-25), with its result as "confirmed N of M"; L-C on the text move; the borrowed tests' owner lanes; Q on the oracle files and on the two proposals above (the oracle's life after merge, and EO-BUN-1 without a committed file). Merge needs the owner's Merge Desk approval: this is identical-output work, not a bug fix.

## Checks by other agents

On 2026-11-04 three agents that did not write this PR checked it: they confirmed 66 of 71 claims and reported 17 problems (15 distinct; two were reported twice). All 17 were real and fixed on 2026-11-05; none was rejected:
- the window-day re-record steps, and the push without an upstream;
- the oracle's life after merge;
- the segment range;
- the `node --test` job;
- CI's 7-character stamp (reported twice; now measured);
- the whole-`dist` wording (`sw.js`, `SHA256SUMS`, `build-info.json`; "33 js/css files, and `index.html`");
- the moved doc comments;
- the `oracle` field (the `EO-PR-…` ids);
- `allowed_write_paths`;
- the window answer's time (13:34:15Z, `DECISIONS.md:434`);
- the PROGRESS row's authorization and scientific-acceptance fields;
- `status`;
- the EO-BUN-1 script;
- the moved-line count (710 of 720).

Commit 1 was amended for the oracle's doc comment, so the three commits have new SHAs. The app source of commit 2 is the same tree as before. One more correction came out of the re-run. The earlier journey run set `CHROMIUM=/opt/pw-browsers/chromium`, which is full Chrome, while its text said headless shell. The re-run sets no `CHROMIUM`, so Playwright uses its headless shell, as CI does.

## Not done, and limits

- CI has not run: nothing is pushed. The fragment's PR number and CI run are placeholders.
- No second-agent review of the code yet (the check above was of the claims).
- EO-BUN-1 has no committed file (above); kit 3d is where it becomes a committed check. Each of its two sabotages was run once.
- The branch scan of the plan (16 branches) was not repeated on `8dcc4b2`.
- Heavy, the six-DOF fleet and `case-worksheet-exports` were not run (reasons above).
- The precache grows by 4 B, against S09's guard "ขนาด precache ไม่เปลี่ยน"; no 0-B variant was looked for, because no ceiling is at risk.
- The five moved doc comments are left as they were (above).

## The split script

```js
// EQ-6 step 2: move each of the six feature modules' three exported blocks
// into src/i18n/<feature>.<lang>.ts byte for byte, and point en/ru/th.ts at
// them. Usage: node split.mjs <repo root>. Verifies the move before writing.
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';

const root = process.argv[2];
const dir = join(root, 'src/i18n');
const FEATURES = ['workspace', 'projects', 'review', 'experiments', 'classroom', 'validation'];
const LANGS = { En: 'en', Ru: 'ru', Th: 'th' };
const out = {};

for (const f of FEATURES) {
  const src = readFileSync(join(dir, `${f}.ts`), 'utf8');
  const starts = [...src.matchAll(/^(?:\/\*\*.*\*\/\n)?export const /gm)].map((m) => m.index);
  if (starts[0] !== 0 || starts.length !== 3) throw new Error(`${f}: expected 3 blocks from offset 0, got ${starts}`);
  const blocks = starts.map((a, i) => src.slice(a, starts[i + 1] ?? src.length));
  const seen = [];
  for (const block of blocks) {
    const m = /export const (\w+?)(En|Ru|Th)\b/.exec(block);
    if (!m || m[1] !== f) throw new Error(`${f}: unexpected block name ${m?.[0]}`);
    const lang = LANGS[m[2]];
    seen.push(lang);
    const body = block.replace(/\n+$/, '\n');
    if (src.indexOf(body) < 0 || block.slice(body.length).replace(/\n/g, '') !== '') throw new Error(`${f}.${lang}: not a verbatim block`);
    const header = lang !== 'en' && body.includes(`typeof ${f}En`) ? `import type { ${f}En } from './${f}.en';\n` : '';
    out[`${f}.${lang}.ts`] = header + body;
  }
  if (seen.join() !== 'en,ru,th') throw new Error(`${f}: block order ${seen}`);
  const rebuilt = ['en', 'ru', 'th'].map((lang, i) => {
    const file = out[`${f}.${lang}.ts`];
    const body = file.startsWith('import type ') ? file.slice(file.indexOf('\n') + 1) : file;
    return body + blocks[i].slice(blocks[i].replace(/\n+$/, '\n').length);
  }).join('');
  if (rebuilt !== src) throw new Error(`${f}: reassembly differs from the original`);
}

const edits = {};
for (const lang of ['en', 'ru', 'th']) {
  const path = join(dir, `${lang}.ts`);
  const before = readFileSync(path, 'utf8');
  const lines = before.split('\n');
  for (let i = 0; i < 6; i++) {
    const m = /^import \{ (\w+) \} from '\.\/(\w+)';$/.exec(lines[i]);
    if (!m || m[2] !== FEATURES[i]) throw new Error(`${lang}.ts:${i + 1}: unexpected line ${lines[i]}`);
    lines[i] = `import { ${m[1]} } from './${m[2]}.${lang}';`;
  }
  const after = lines.join('\n');
  if (after.split('\n').slice(6).join('\n') !== before.split('\n').slice(6).join('\n')) throw new Error(`${lang}.ts changed below line 6`);
  edits[path] = after;
}

for (const [name, text] of Object.entries(out)) writeFileSync(join(dir, name), text);
for (const [path, text] of Object.entries(edits)) writeFileSync(path, text);
for (const f of FEATURES) unlinkSync(join(dir, `${f}.ts`));
```

## The EO-BUN-1 scripts

Run from a scratch folder holding the two outDirs and logs (above). The 27 declared paths, as passed:

```sh
CH="src/i18n/en.ts src/i18n/ru.ts src/i18n/th.ts $(for f in workspace projects review experiments classroom validation; do
  printf 'src/i18n/%s.ts src/i18n/%s.en.ts src/i18n/%s.ru.ts src/i18n/%s.th.ts ' $f $f $f $f; done)"
node eo-bun-1.mjs sm-base sm-head build-sm-base.log build-sm-head.log $CH > bun.json
node dist-compare.mjs dd-base dd-head > dist.json
```

`eo-bun-1.mjs`:

```js
// EO-BUN-1, catalog form (S07 §07.5), for EQ-6 step 2: compare two
// `vite build --sourcemap` outDirs. Usage:
//   node eo-bun-1.mjs <base outDir> <head outDir> <base build log> <head build log> <changed path>...
// Prints JSON: the (source, sha256(sourcesContent), chunk groups) rows outside
// the declared change list, where the declared paths sit, and per entry (main,
// each lazy chunk, each worker) raw/gzip bytes, module count, module-set and
// byte equality.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';

const [baseDir, headDir, baseLog, headLog, ...changed] = process.argv.slice(2);
const CHANGED = new Set(changed);
const sha = (s) => createHash('sha256').update(s).digest('hex');
const group = (file) => { const m = /^(.+)-[\w-]{8}\.(js|css)$/.exec(file); return m ? `${m[1]}-*.${m[2]}` : file; };
// A map's sources are relative paths (the main chunks' and the workers' from
// different bases): drop the leading ../ and the checkout's own path, so two
// checkouts compare. node_modules/… from its last occurrence; else from the
// first path component that is src/, docs/ or public/.
const norm = (p) => {
  const s = p.replace(/^(\.\.\/)+/, '');
  const nm = s.lastIndexOf('node_modules/');
  return nm >= 0 ? s.slice(nm) : s.replace(/^(?:.*?\/)?(?=(?:src|docs|public)\/)/, '');
};

function read(dir) {
  const assets = join(dir, 'assets');
  const files = readdirSync(assets).filter((f) => f.endsWith('.js')).sort();
  const chunks = {};
  for (const file of files) {
    // the `//# sourceMappingURL=` line is not part of dist's bytes
    const bytes = Buffer.from(readFileSync(join(assets, file), 'utf8').replace(/\n?\/\/# sourceMappingURL=\S+\s*$/, ''));
    let map = { sources: [], sourcesContent: [] };
    try { map = JSON.parse(readFileSync(join(assets, `${file}.map`), 'utf8')); } catch { /* no map */ }
    const modules = map.sources.map((s, i) => [norm(s), sha(map.sourcesContent?.[i] ?? '')]);
    // two chunks can share a name (archive-*.js): tell them apart by their last module
    let g = group(file);
    if (files.filter((f) => group(f) === g).length > 1) g = `${g}[${modules.at(-1)?.[0]}]`;
    if (chunks[g]) throw new Error(`two chunks in group ${g}`);
    chunks[g] = { file, raw: bytes.length, gzip: gzipSync(bytes, { level: 9 }).length, sha256: sha(bytes), modules };
  }
  return chunks;
}

function inventory(chunks) {
  const rows = new Map(); // source -> { hash, groups }
  for (const [g, c] of Object.entries(chunks)) for (const [src, h] of c.modules) {
    const row = rows.get(src) ?? { hash: h, groups: [] };
    if (row.hash !== h) throw new Error(`${src}: two different contents in one build`);
    row.groups.push(g);
    rows.set(src, row);
  }
  return rows;
}

const base = read(baseDir), head = read(headDir);
const ib = inventory(base), ih = inventory(head);
const outside = (inv) => [...inv].filter(([s]) => !CHANGED.has(s)).map(([s, r]) => `${s} ${r.hash} ${r.groups.sort().join(',')}`).sort();
const ob = outside(ib), oh = outside(ih);
const declared = (inv) => [...inv].filter(([s]) => CHANGED.has(s)).map(([s, r]) => `${s} ${r.groups.sort().join(',')}`).sort();
const entries = [...new Set([...Object.keys(base), ...Object.keys(head)])].sort().map((g) => {
  const b = base[g], h = head[g];
  const set = (c) => c && sha(c.modules.map(([s, x]) => `${s} ${x}`).sort().join('\n'));
  return {
    group: g, kind: /\.worker-\*\.js$/.test(g) ? 'worker' : g === 'index-*.js' ? 'main' : 'lazy',
    raw: [b?.raw, h?.raw], gzip: [b?.gzip, h?.gzip], modules: [b?.modules.length, h?.modules.length],
    moduleSetEqual: set(b) === set(h), bytesEqual: b?.sha256 === h?.sha256,
  };
});
const count = (p) => (readFileSync(p, 'utf8').match(/INEFFECTIVE_DYNAMIC_IMPORT/g) ?? []).length;
const workers = entries.filter((e) => e.kind === 'worker');
console.log(JSON.stringify({
  declaredChanges: CHANGED.size,
  sources: [ib.size, ih.size],
  outsideRows: [ob.length, oh.length],
  outsideEqual: ob.join('\n') === oh.join('\n'),
  onlyBase: ob.filter((x) => !oh.includes(x)), onlyHead: oh.filter((x) => !ob.includes(x)),
  declaredBase: declared(ib), declaredHead: declared(ih),
  ineffectiveDynamicImport: [count(baseLog), count(headLog)],
  workers: workers.length, workersByteIdentical: workers.every((e) => e.bytesEqual),
  entries,
}, null, 1));
```

`dist-compare.mjs`:

```js
// Every file of two `vite build` dist dirs, base against head. Usage:
//   node dist-compare.mjs <base dist> <head dist>
// A file is "identical" at the same path, "renamed" when only its hashed chunk
// name changed and its bytes match once the old chunk names are replaced by
// the new ones, and otherwise "differs". For sw.js it also compares the code
// outside the precache manifest, the manifest's entries and their revisions.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, basename } from 'node:path';
import { createHash } from 'node:crypto';

const [baseDir, headDir] = process.argv.slice(2);
const walk = (d) => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]));
const load = (d) => Object.fromEntries(walk(d).map((f) => [relative(d, f), readFileSync(f)]));
const A = load(baseDir), B = load(headDir);
const group = (p) => p.replace(/-[\w-]{8}\.(js|css)$/, '-*.$1');
const onlyA = Object.keys(A).filter((p) => !(p in B)).sort();
const onlyB = Object.keys(B).filter((p) => !(p in A)).sort();
const renamed = new Map();
for (const p of onlyA) {
  const c = onlyB.filter((q) => group(q) === group(p) && ![...renamed.values()].includes(q));
  // two chunks share a group (archive-*.js): pair by size, then by content below
  renamed.set(p, c.length === 1 ? c[0] : c.find((q) => B[q].length === A[p].length) ?? c[0]);
}
const subst = (buf) => {
  let s = buf.toString('latin1');
  for (const [o, n] of renamed) s = s.split(basename(o)).join(basename(n));
  return s;
};
const out = { files: [Object.keys(A).length, Object.keys(B).length], identical: 0, renamed: [], differs: [] };
for (const p of Object.keys(A).sort()) {
  const q = renamed.get(p) ?? p;
  if (!(q in B)) { out.differs.push(`${p}: not in head`); continue; }
  if (p === q && A[p].equals(B[q])) { out.identical += 1; continue; }
  if (subst(A[p]) === B[q].toString('latin1')) { out.renamed.push(p === q ? p : `${group(p)}`); continue; }
  out.differs.push(`${p}${p === q ? '' : ` -> ${q}`} (${A[p].length} -> ${B[q].length} B)`);
}
const manifest = (buf) => {
  const s = buf.toString('utf8');
  for (const m of s.matchAll(/JSON\.parse\(("(?:[^"\\]|\\.)*")\)/g)) {
    try { const v = JSON.parse(JSON.parse(m[1])); if (v && Array.isArray(v.entries)) return { s, m, v }; } catch { /* not it */ }
  }
  throw new Error('no precache manifest in sw.js');
};
const a = manifest(A['sw.js']), b = manifest(B['sw.js']);
const outsideA = a.s.slice(0, a.m.index) + a.s.slice(a.m.index + a.m[0].length);
const outsideB = b.s.slice(0, b.m.index) + b.s.slice(b.m.index + b.m[0].length);
const revA = new Set(a.v.entries.map((e) => e.revision));
const sha16 = (buf) => createHash('sha256').update(buf).digest('hex').slice(0, 16);
const orderA = a.v.entries.map((e) => group(e.url)), orderB = b.v.entries.map((e) => group(e.url));
out.sw = {
  codeOutsideManifestEqual: outsideA === outsideB,
  version: [a.v.version, b.v.version],
  entries: [a.v.entries.length, b.v.entries.length],
  entriesWithNewRevision: b.v.entries.filter((e) => !revA.has(e.revision)).map((e) => group(e.url)),
  entriesMovedInOrder: orderA.map((g, i) => (g === orderB[i] ? null : g)).filter(Boolean),
  revisionsMatchFiles: [a.v.entries.every((e) => sha16(A[e.url]) === e.revision), b.v.entries.every((e) => sha16(B[e.url]) === e.revision)],
};
console.log(JSON.stringify(out, null, 1));
```
