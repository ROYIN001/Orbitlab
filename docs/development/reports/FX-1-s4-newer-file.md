# FX-1 s4 — a newer design file's message matches what happens to it / ข้อความของไฟล์แบบจากเวอร์ชันใหม่กว่าตรงกับสิ่งที่เกิดจริง (M-BUILD-008)

```yaml
envelope: v2
package: FX-1 (Build data safety)
step: s4
wave: K1
lane: B
items: [M-BUILD-008]
priority: {M-BUILD-008: P2}
change_kind: bug-fix; failing regressions committed first
owner_authorization: {date: 2026-10-05, quote: "เมื่อทำการ merge แล้วตรวจสอบว่าทุกอย่างเรียบร้อยแล้วในระยะ K0 ให้เริ่มทำระยะ K1 ในเซสชั่นใหม่ต่อได้เลยครับ ใช้ model opus5.5 high", scope: "wave K1 (D-65)"}
decisions_used: [D-22 ("A design file from a newer app version is refused, and the message is corrected." — "(ข) ปฏิเสธไฟล์ และแก้ข้อความให้ถูก")]
plan: plan v2.0 S10 §10.4 (FX-1), row M-BUILD-008; S10 §10.1 rules 2 (named refusal) and 6 (a message says why, and the way on)
base_sha: {branch_base: 9a20560 (claude/b-fx1-s3, FX-1 s3), origin_main: 23ede7f, merge_tree_with_main: clean}
branch: claude/b-fx1-s4
files: [src/design/design-store.ts, src/config/vehicle-spec.ts, src/config/satellite-design.ts, src/ui/build/explore-store.ts, src/i18n/en.ts, src/i18n/th.ts, src/i18n/ru.ts, tests/build-newer-file.test.ts, tests/browser/journeys/build-newer-file.mjs]
not_touched: [what is refused or kept (behaviour), stored formats, the design file format and version, mission/lesson/archive files, CSS, budgets.json, existing tests]
failing_before_fix: [unit tests/build-newer-file.test.ts 9 of 10 on 9a20560 (commit 1a13b4f), journey build-newer-file on 9a20560]
size: {this_step: "precache code +1.3 kB, index-*.js +0.3 kB, i18n-*.js +1.0 kB, CSS 0 (9a20560 → this branch)", merged_onto_main_23ede7f: "precache code 14723.3 → 14728.9 kB (ceiling 14724; FX-1 s3 +4.3 of it)", budget: "fails: precache code, index-*.js, i18n-*.js; owner to decide"}
```

## What was wrong (on `9a20560`)

A design file (`*.orbitlab.json`) carries a format version. `parseDesignDocument` (`src/design/design-store.ts`) noted a version newer than this one (`newerVersion`), then held the design to the same check the store applies, and that check refuses every field it does not know (`Checker.known` in `src/config/vehicle-spec.ts` and `src/config/satellite-design.ts`: "… is not a field of this version"). So a newer file is either read whole or refused whole; nothing is ever left out of a design. The messages said otherwise:

- **A newer file this version reads whole** was kept and opened with "It was saved by a newer version of Orbitlab: anything this version does not know was left out." (th "…สิ่งที่เวอร์ชันนี้ไม่รู้จักจึงถูกข้ามไป", ru "…всё, чего эта версия не знает, пропущено."). Nothing had been left out.
- **A newer file with a field this version does not know** was refused, with "The rocket in this file is not one this version can fly, so nothing was imported." Not that it came from a newer version, nor which field; the field was named only in English, under "Technical detail".

The parser's own comment said "A newer file is read as far as this version understands it", which was not what it did.

## The fix (D-22 (b): refuse the file, correct the message)

What is refused and what is kept are unchanged. The messages now match it:

| The file | Kept? | The message (en; th and ru the same) |
|---|---|---|
| newer, every field of its design known | yes, opened | "Imported "…" and opened it. It was saved by a newer version of Orbitlab, and this version read every part of its design." |
| newer, a field of its design not known | no | "This file was saved by a newer version of Orbitlab, and its design has parts this version does not know (hull, stages[1].engine.cooling), so nothing was imported. Open it in a newer Orbitlab." The English technical detail stays under it. |
| newer, a known field with a value this version refuses | no | as before: "The rocket in this file is not one this version can fly, so nothing was imported." with the detail |
| this version, a field it does not know (not written by Orbitlab) | no | as before |

- `parseDesignDocument` adds `fields` to the `invalid` issue of a **newer** file refused for fields of its design this version does not know: their paths, as the kind's check names them. A shared constant `NOT_A_FIELD` in each check (`vehicle-spec.ts`, `satellite-design.ts`) is the message the parser matches, so the two cannot drift apart. Nothing else in the parsed result changes: the existing tests' outputs are the same.
- `ExploreStore.importFile` shows `build.ex.store.fileNewerFields` with the fields when they are there. It is the same for a rocket file and a satellite file, in either designer.
- `build.ex.store.fileNewer` (the file taken whole) is corrected in place in all three languages; `build.ex.store.fileNewerFields` is new in en, th and ru.
- The parser's comment states the D-22 rule.

About 26 source lines added (half of them comments), 12 changed.

### Where the code and the plan text differ

- **The other files in S10's row.** S10 asks for "the same rule for design, mission, satellite and archive files". Satellite design files are design files (same parser), covered here and in the tests. The project archive (`src/projects/archive.ts`) already refuses a newer backup with "This backup uses a newer project format. Open it with a newer Orbitlab. Nothing was imported." That is true, so it is unchanged. Mission files are read differently by design (`src/config/mission-file.ts`, S02): a newer mission file is read as far as this version understands it. Unknown keys are not read, and settings it cannot use go back to their defaults and are listed. Its notice ("…anything this version does not know is left out") matches that behaviour. D-22 as recorded speaks of design files, so mission files are unchanged here. Lesson files (a newer one warns) are not in this item either.
- **Keys outside the design.** Beside `design`, the parser reads a file's `format`, `version`, `kind` and `name`, as before; any other key of the document (`created`, `updated`, or a future build stamp, M-PLAN-028, R3.1r, reader-before-writer) is not read, also as before. The message for a file taken whole speaks of "every part of its design", which is true. Refusing such document keys would be a behaviour change under R3.1r's rule (S12 §12.3, S18), not this message fix.
- **The registry title is cut off** ("…record the for"); the notes column is empty. The rule (D-22) is recorded in `docs/DECISIONS.md` and now in the parser's comment. The format version number is not put in the message: nothing asks for it, and the student's way on is a newer Orbitlab, whatever its number.

## Tests

### Failing first

Commit `1a13b4f` (test-only): `tests/build-newer-file.test.ts`, run against `9a20560`'s `src/`:

```
× is kept and opened, and says it is newer without claiming anything was left out (en)
× is kept and opened, and says it is newer without claiming anything was left out (th)
× is kept and opened, and says it is newer without claiming anything was left out (ru)
× says the same when it holds the other kind of design, handed to its own designer
× is refused whole, its unknown fields named by the parser
× keeps nothing, and says so in the reader's language, naming the fields (en)
× keeps nothing, and says so in the reader's language, naming the fields (th)
× keeps nothing, and says so in the reader's language, naming the fields (ru)
× names a satellite's, in its own designer and in the rocket designer
AssertionError: expected 'Imported "From the future" and opened…' not to match /left out/
AssertionError: expected 'นำเข้าและเปิด "From the future" แล้ว …' not to match /ข้ามไป/
AssertionError: expected 'Проект «From the future» импортирован…' not to match /пропущен/
AssertionError: expected 'ไฟล์นี้เป็นดาวเทียม "Future NAPA" จึง…' not to match /ข้ามไป/
AssertionError: expected { code: 'invalid', …(1) } to match object { fields: [ 'hull', …(1) ] }
AssertionError: expected 'The rocket in this file is not one th…' to contain 'hull'
AssertionError: expected 'จรวดในไฟล์นี้ไม่ใช่แบบที่เวอร์ชันนี้บ…' to contain 'hull'
AssertionError: expected 'Ракету из этого файла эта версия запу…' to contain 'hull'
AssertionError: expected 'Спутник из этого файла эта версия рас…' to contain 'power.tracking'
      Tests  9 failed | 1 passed (10)
```

The one that passes is the guard the fix must keep: a newer file refused for a value, not a field, keeps its message.

Journey `build-newer-file` (commit `57e832d`, after the fix) against a build of `9a20560`:

```
[build-newer-file] FAIL: en: the message does not name the unknown fields: The rocket in this file is not one this version can fly, so nothing was imported.
[build-newer-file] FAIL: a newer file taken whole: Imported "From the future, whole" and opened it. It was saved by a newer version of Orbitlab: anything this version does not know was left out.
[build-newer-file] FAIL: th: the message does not name the unknown fields: จรวดในไฟล์นี้ไม่ใช่แบบที่เวอร์ชันนี้บินได้ จึงไม่ได้นำเข้าอะไร
[build-newer-file] FAIL: ru: the message does not name the unknown fields: Ракету из этого файла эта версия запустить не может, поэтому ничего не импортировано.
✗ build-newer-file (35.6 s)   7 failure(s)
```

Vitest runs in `node` (no DOM), so the unit tests run the store's own `importFile` on an object made from its prototype, its drawing stubbed, over the real `LocalDesignStore` (in memory) and parser, as `build-unsaved-open` does. The journey drives the page: it saves an Electron remix, writes its design back as the next format version's file, and imports it with and without two unknown fields.

### After the fix

- `npx vitest run tests/build-newer-file.test.ts`: 10/10.
- Related files (11 files, 194 tests, all pass): `build-newer-file`, `design-store`, `d06-satellite-design`, `custom-vehicle`, `i18n`, `build-unsaved-open`, `build-legacy-ratings`, `project-archive`, `design-explore-model`, `d06-satellite-launch`, `parts`. The full suite was not run locally (shared 4-CPU machine); CI runs it.
- `npm run -s typecheck`: clean.
- `node --test tests/verification/*.test.mjs tests/browser/shard.test.mjs`: 66/66.
- Journeys (`CHROMIUM=/opt/pw-browsers/chromium node tests/browser/run.mjs …`), against this branch merged onto `origin/main` `23ede7f`: `build-newer-file` (44 s), `build-unsaved-open`, `satellite`: 3/3 pass.
- The journey's screenshots for the owner, written with `--shots` (not committed): `build-newer-file-refused-{en,th,ru}.png` (the refusal naming `hull` and `stages[1].engine.cooling`) and `build-newer-file-taken-en.png` (the file taken whole).

## Size

`npx vite build; node scripts/bundle-budget.mjs`, on the same machine:

| Group | `origin/main` 23ede7f | FX-1 s3 `9a20560` | this branch | merged onto main | ceiling |
|---|---|---|---|---|---|
| precache code | 14723.3 kB | 14727.3 kB | 14728.6 kB | 14728.9 kB | 14724 (over by 4.9 merged) |
| `index-*.js` | 2629.2 kB | 2632.5 kB | 2632.8 kB | 2632.9 kB | 2632 (over by 0.9 merged) |
| `i18n-*.js` | 1723.6 kB | 1724.3 kB | 1725.3 kB | 1725.5 kB | 1725 (over by 0.5 merged) |
| `index-*.css` | 177.0 kB | 177.0 kB | 177.0 kB | 177.0 kB | 177 |

This step adds +1.3 kB of precache code: +0.3 kB of code and +1.0 kB of strings. The new sentence is in three languages, Thai 3 bytes a letter. The rest of the overrun is FX-1 s3's (+4.0 to +4.3 kB, its report). `i18n-*.js` crosses its ceiling with this step's strings. `budgets.json` is not edited: the owner decides, as for s3. The strings could be cut by about 0.2 kB by dropping "Open it in a newer Orbitlab." That is the message's way on (S10 §10.1 rule 6), so it is kept.
