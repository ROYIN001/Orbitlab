# FX-2 step 2b: a placement test records the bank revision it was drawn from (M-LEARNING-027, the writer)

> **สรุปสำหรับเจ้าของ (ภาษาไทย)**
>
> - ขั้น 2a (ตัวอ่าน, #176) ทำให้แบบทดสอบแต่ละครั้งคิดคะแนนด้วยคลังของ revision ของตัวเอง แต่ยังไม่มีแบบทดสอบใดบันทึก revision ไว้ แบบทดสอบใหม่จึงถูกอ่านเป็น revision 1 เสมอ
> - ที่แก้ใน PR นี้ (ตัวเขียน): แบบทดสอบที่เริ่มใหม่บันทึก `revision: BANK_REVISION` (ตอนนี้คือ 1) ไว้ตั้งแต่เริ่ม
> - ผลต่อข้อมูล: แบบทดสอบที่เริ่มบนบิลด์นี้มี revision 1 บิลด์ 2a อ่านได้ บิลด์ก่อน 2a เก็บช่องนี้ไว้ตามเดิม (โค้ดอ้างอิงอยู่ด้านล่าง) และคิดคะแนนเท่ากัน เพราะการให้คะแนนของ revision 1 คือคลังเดิม
> - เทสต์ที่ล้มก่อนแก้: เมื่อคลังเลื่อนเป็น revision 2 แบบทดสอบที่เริ่มใหม่และตอบถูกตามคลังใหม่
>   - ก่อนแก้: ไม่มี revision จึงถูกอ่านเป็น revision 1 และคำตอบที่ถูกกลายเป็นผิด
>   - หลังแก้: บันทึก revision 2 และยังถูก
> - journey `learner-profiles` เริ่มแบบทดสอบด้วยปุ่มในหน้าเว็บ แล้วตรวจว่าแบบทดสอบที่เก็บมี revision ตรงกับ `BANK_REVISION` ถ้า `begin()` กลับไปเป็นแบบเดิม journey นี้ล้ม
> - ทำตามคำตอบของคุณ (2026-10-26) ทั้งสี่ข้อเดิม ไม่มีคำถามใหม่
> - 2a เผยแพร่แล้ว (Pages 40340692641 ที่ c5da5bb, 2026-10-26 15:10Z) branch นี้ rebase ลง main แล้ว
> - รอคุณอนุมัติใน Merge Desk: เพราะ `BANK_REVISION` ยังเป็น 1 ไม่มีผลสอบที่เก็บไว้หรือที่เริ่มใหม่ได้คะแนนผิดวันนี้ จึงไม่เข้าเงื่อนไข "ผิด → ถูก" ของการอนุมัติล่วงหน้า

```yaml
envelope: v2
package: FX-2
step: s2b
branch: claude/happy-hawking-m71bk1-learning-027b
family: FX
wave: K1
lane: L-UI (+ L-C: revision.ts, types.ts)
items: [M-LEARNING-027]
priority: {M-LEARNING-027: P2}
change_kind: bug-fix (S10 §10.5)
merge: waits for the owner (Merge Desk); with BANK_REVISION = 1 no stored or new result is graded wrong today, so the standing approval's "wrong → right" does not apply. 2a was published by Pages 40340692641 on c5da5bb (deploy step finished 2026-10-26T15:10:22Z)
or_ids: [OR-2]
oracle: []
execution_authorized: true
owner_authorization: {decision: "K1 authorized; FX-2 K1 part", date: 2026-10-24, quote: "ทำต่อตามลำดับตามที่คุณเห็นสมควรครับ"}
owner_answers: {date: 2026-10-26, via: chat question, answers: ["ช่อง revision ต่อแบบทดสอบ (แนะนำ)", "เฉพาะการให้คะแนน (แนะนำ)", "บันทึกในรายงานเท่านั้น (แนะนำ)", "ไม่แสดง และเก็บไบต์ไว้ (แนะนำ)"]}
base_sha: c5da5bb (#176, 2a, merged 2026-10-26T14:33:27Z)
base_sha_verified_on: {sha: c5da5bb, date: 2026-10-26}
commits: {failing_test: e07840a, fix: 5554ea5, journey_check: ad64115}
app_code_changed: [src/lessons/assessment/revision.ts, src/lessons/assessment/types.ts, src/ui/lessons/assessment-view.ts]
new_strings: none
rollback: {method: revert, data_compat: "a test begun on this build carries revision 1; every build reads or keeps it", verified_by: "tests/assessment-revision.test.ts: storage, project archive and results file round trips (readers unchanged since 408ad16)"}
failing_before_fix: [tests/assessment-revision-writer.test.ts (1 of 1 fails at e07840a, both assertions), tests/browser/journeys/learner-profiles.mjs (fails at its revision check with begin() put back to the old literal)]
```

## What failed

Step 2a grades each stored test with the bank of its own revision, and reads a test with no revision as revision 1. Nothing wrote a revision. The view's `begin()` built a new test as a literal with no `revision` (`30b6995:src/ui/lessons/assessment-view.ts:193`). So once the bank moves to revision 2, a test begun after that would be read as revision 1 and graded against the old key.

## Failing before the fix

`tests/assessment-revision-writer.test.ts` mocks the real bank at revision 2, with `b-karman`'s right answer moved to another option; the history keeps revision 1's question. It builds a test with `newAttempt`, which the view's `begin()` calls (before the fix, with a copy of the view's old literal), and answers with revision 2's right answer. On `e07840a`, which adds only the test:

```
 FAIL  tests/assessment-revision-writer.test.ts > M-LEARNING-027 step 2b: a test begun now records its revision > is graded by the revision it was drawn from
AssertionError: expected [ [ 'b-karman', false ] ] to deeply equal [ [ 'b-karman', true ] ]
AssertionError: expected undefined to be 2 // Object.is equality
 Test Files  1 failed (1)
      Tests  1 failed (1)
```

The right answer of its day is graded wrong, and the test has no revision. On `5554ea5`: 1 of 1 passes.

The unit test does not call the view's `begin()` (the unit suite has no DOM), so it would stay green if `begin()` went back to its old literal. `tests/browser/journeys/learner-profiles.mjs` already starts a placement test with the page's own "Start the test" button; it now checks that the stored test's `revision` equals `BANK_REVISION`, read from `bank.ts` (`ad64115`). With `begin()` put back to the old literal on a throwaway build it fails at that line:

```
  [learner-profiles] FAIL: threw: AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:

undefined !== 1

    at Module.learnerProfiles (…/tests/browser/journeys/learner-profiles.mjs:90:10)
✗ learner-profiles (39.3 s)
```

With the fix it passes (346.5 s, CI font).

## The owner's answers (2026-10-26)

2b follows the same four answers as 2a. No new question.

| Question | Answer | What 2b does |
|---|---|---|
| How is the revision stored? | "ช่อง revision ต่อแบบทดสอบ (แนะนำ)" | Writes the optional `revision` on each new test. No format version changes. |
| What does a revision cover? | "เฉพาะการให้คะแนน (แนะนำ)" | Nothing new: the value written is `BANK_REVISION`, which counts grading changes. |
| #41's rewording with the same keys | "บันทึกในรายงานเท่านั้น (แนะนำ)" | Nothing new; recorded in 2a's report. |
| A test from a newer build | "ไม่แสดง และเก็บไบต์ไว้ (แนะนำ)" | Nothing new: 2a's reader handles it. A test begun on this build is revision 1, which 2a reads. |

## Fix

- `src/lessons/assessment/revision.ts`: `newAttempt(kind, seed, questions, startedAt)` returns a test with `revision: BANK_REVISION` and no answers.
- `src/ui/lessons/assessment-view.ts`: `begin()` uses `newAttempt`. It is the only place a test is created (`grep -rn "answers: \[\]" src`: `revision.ts:53` only). The questions are still drawn from today's bank (`questionBank`, line 142), so the revision written matches the bank drawn from.
- `src/lessons/assessment/types.ts`: the comment on `revision` says an absent value means a test begun before tests recorded it.
- Nothing already stored is changed. A test with no revision stays without one.

## Data compatibility

A test begun on this build carries `"revision": 1`. Today that is the only value written, because `BANK_REVISION` is 1.

- **2a builds (`c5da5bb` and later)** read it as revision 1 (`attemptRevision`), the same as a test with none.
- **Builds before 2a** (`408ad16` and earlier, an old PWA tab included) have no `revision` in their types. They grade the test with their own bank, whose grading is revision 1's, and every reader keeps the unknown field:
  - `loadProgress` keeps each test object as parsed (`408ad16:src/lessons/progress.ts:303`) and makes no recovery copy when the bytes round-trip (`:307`); `saveProgress` writes the same objects back (`:335`).
  - `validProgress` checks only the fields it names on a test and rejects none it does not (`408ad16:src/projects/validation.ts:216-222`). The project archive (`src/projects/archive.ts:50`) and the workspace guard (`src/workspace/archive.ts:22`) both use it.
  - The results file copies the tests as they are (`408ad16:src/lessons/progress.ts:404`) and its checksum covers them (`:398`).
  - A resumed test is the stored object itself (`408ad16:src/ui/lessons/assessment-view.ts:138-139`), so answers added on an older build keep the field.
- These four files are byte-identical at `408ad16` and `5554ea5` (`git diff --quiet 408ad16..5554ea5 -- src/lessons/progress.ts src/projects/validation.ts src/workspace/archive.ts src/projects/archive.ts`). So 2a's round-trip tests in `tests/assessment-revision.test.ts` (storage, project archive, import check, results file; lines 138-170) run the same reader code as a build before 2a.

## Tests run

The suite, build and journeys below ran on `2e9a14d`, this branch's fix commit before the rebase onto `c5da5bb`. After the rebase, `src/` and `tests/` at `5554ea5` differ from `2e9a14d` only by #175's `tests/browser/journeys/r7-cross-system.mjs` (`git diff --stat 2e9a14d 5554ea5 -- src tests`: that one file); `ad64115` then adds the `learner-profiles` check. The writer test, 2a's revision tests and `learner-profiles` were rerun after the rebase.

- `tests/assessment-revision-writer.test.ts`: 1 of 1 (fails on `e07840a`, above). With 2a's two revision files: 3 files, 17 tests pass (rerun after the rebase).
- `npm run -s typecheck`: clean.
- `npx vitest run`: 333 files, 10 521 tests pass (2 515 s on 4 CPUs). That is 2a's 332 files and 10 520 tests plus the new file.
- `npx vite build`: ok. `node scripts/bundle-budget.mjs` (with the build log): ok, no `INEFFECTIVE_DYNAMIC_IMPORT`, no ceiling raised. Sizes as it prints them:

  | Group | Size kB | Ceiling kB |
  |---|---|---|
  | `index-*.js` | 2634.8 | 2645.0 |
  | `i18n-*.js` | 1729.0 | 1729.0 |
  | other chunks | 771.4 | 772.0 |
  | `index-*.css` | 176.9 | 178.0 |
  | precache code | 14653.8 | 14724.0 |
  | precache (total, 68 files) | 15773.0 | 16123.0 |

  At their ceiling with 0.0 kB left, as before this change: `i18n-*.js` 1729.0 of 1729.0 and `lifetime-altitude` 122.0 of 122.0.

- `node scripts/verification/select-checks.mjs --files` with the four changed paths selects typecheck, build, budget, 41 unit files, 2 heavy files and 9 journeys. With the CI font (DejaVu Sans), one journey at a time:

  | Journey | Result |
  |---|---|
  | `mobile-smoke` | pass, 40.6 s |
  | `teaching-held` | pass, 76.5 s |
  | `workspace-navigation` | pass, 119.2 s |
  | `learner-profiles` (after the rebase, with its new check) | pass, 346.5 s |
  | `case-worksheet-exports`, `classroom-preparation`, `fx2-design-check-focus`, `instructor-loading`, `lesson-packs`, `recheck` | held with the teaching tools since #156; the runner lists them and does not run them |

- Heavy (`npm run test:heavy` with `tests/heavy/lesson-packs-sixdof.test.ts` and `tests/heavy/lessons-sixdof.test.ts`): 2 files, 10 tests pass (568 s).
- Second-agent review, two lenses (the code; the report and PR text): 12 findings. The code lens confirmed one by a mutation run: the unit test did not pin `begin()`, fixed by the `learner-profiles` check above. The text lens's eleven (the rebase and its commit ids, the merge reason, the missing review line, line numbers, wording) are fixed.

## Size

Source: +8 −4 lines in three files (`revision.ts`, `types.ts`, `assessment-view.ts`), within D-25's ~400. Tests: +58 lines in one new file and +4 in `learner-profiles.mjs`. No ceiling raised.

## Not in this step

- **Order.** 2a (`c5da5bb`, #176) was published by Pages 40340692641 before this branch was rebased onto it, so no build that writes revisions goes live before every live build reads them.
- **The results file's `summary`** still names no revision. A later step can add it.
- **A teacher's questions** have no revision. Their only writer is held with the teaching tools (`TEACHER_TOOLS = false`).
- **Docs:** N/A (USER-GUIDE does not describe how a placement test is stored).

## Rollback

Revert the fix commit. Tests begun while it was live keep `"revision": 1`. Every build reads that as revision 1 or keeps it unread, as above, so nothing needs migrating.
