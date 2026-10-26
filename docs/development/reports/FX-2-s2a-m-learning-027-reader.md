# FX-2 step 2a: a placement test keeps the score it was given (M-LEARNING-027, the reader)

> **สรุปสำหรับเจ้าของ (ภาษาไทย)**
>
> - ปัญหา: คะแนนของแบบทดสอบวัดระดับทุกครั้งที่เคยทำ ถูกคิดใหม่จากคลังข้อสอบปัจจุบันทุกครั้งที่แสดง ถ้าแก้คำตอบของข้อใดในคลัง ผลสอบเก่าจะเปลี่ยนตาม
> - ที่แก้ใน PR นี้ (ตัวอ่าน):
>   - คลังมี revision แล้ว (ตอนนี้คือ 1)
>   - แบบทดสอบแต่ละครั้งแสดงและคิดคะแนนด้วยคลังของ revision ของตัวเอง แบบทดสอบที่ไม่มี revision (ทุกครั้งที่เก็บไว้ตอนนี้) คือ revision 1
>   - แบบทดสอบจากบิลด์ที่ใหม่กว่า ไม่ถูกทำต่อ ไม่ถูกคิดคะแนน ไม่แสดง และไม่อยู่ในสรุปผลตอน export ไบต์เดิมถูกเก็บไว้ทั้งในเครื่องและในไฟล์ที่ export
>   - ถ้าในอนาคตการให้คะแนนของข้อใดเปลี่ยน ต้องเพิ่ม revision และเก็บข้อเดิมทั้งข้อไว้ใน history เทสต์จะล้มจนกว่าจะทำ
> - ผลตรวจประวัติคลัง: ตั้งแต่เปิดใช้ (#22, 2026-09-26) การให้คะแนนไม่เคยเปลี่ยน hash ของสิ่งที่กำหนดคะแนนเท่ากันทุก commit (#22, #23, #41, #63, #135) แบบทดสอบทุกครั้งที่เก็บไว้จึงได้คะแนนเท่าเดิม
>   - #135 แก้ศัพท์ภาษาไทยอย่างเดียว 15 ข้อความ (ตอบการ์ด q11)
>   - #41 เขียนโจทย์ 6 ข้อและตัวลวง 2 ข้อใหม่โดยคำตอบเดิม บันทึกไว้ในรายงานนี้ตามที่คุณตอบ หน้าทบทวนแสดงถ้อยคำปัจจุบัน
> - คำตอบของคุณ (2026-10-26) ทั้งสี่ข้อเป็นตัวเลือกที่แนะนำ PR นี้ทำตามนั้น
> - เทสต์ที่ล้มก่อนแก้: แก้คำตอบของข้อ b-karman ในคลัง แล้วแบบทดสอบเก่าที่ตอบถูกกลายเป็นผิด (ก่อนแก้) / ยังถูก (หลังแก้)
> - ขั้นต่อไป 2b (ตัวเขียน) เริ่มบันทึก revision ในแบบทดสอบใหม่ ทำได้หลัง PR นี้ merge และเผยแพร่แล้ว
> - รอคุณอนุมัติใน Merge Desk ตามลำดับงานในหน้าความพร้อม GK1 (ข้อ 3): ตอนนี้ไม่มีผลสอบที่เก็บไว้ผิดอยู่ จึงไม่เข้าเงื่อนไข "ผิด → ถูก" ของการอนุมัติล่วงหน้า

```yaml
envelope: v2
package: FX-2
step: s2a
branch: claude/happy-hawking-m71bk1-learning-027a
family: FX
wave: K1
lane: L-UI (+ L-C for the bank: bank.ts, revision.ts, types.ts)
items: [M-LEARNING-027]
priority: {M-LEARNING-027: P2}
change_kind: bug-fix (S10 §10.5)
merge: waits for the owner (Merge Desk), as the GK1 readiness doc's work order (item 3) says; no stored result is wrong today, so the standing approval's "wrong → right" does not apply
or_ids: [OR-2]
oracle: []
execution_authorized: true
owner_authorization: {decision: "K1 authorized; FX-2 K1 part", date: 2026-10-24, quote: "ทำต่อตามลำดับตามที่คุณเห็นสมควรครับ"}
owner_answers: {date: 2026-10-26, via: chat question, answers: ["ช่อง revision ต่อแบบทดสอบ (แนะนำ)", "เฉพาะการให้คะแนน (แนะนำ)", "บันทึกในรายงานเท่านั้น (แนะนำ)", "ไม่แสดง และเก็บไบต์ไว้ (แนะนำ)"]}
base_sha: 408ad16
base_sha_verified_on: {sha: 408ad16, date: 2026-10-26}
commits: {failing_test: 31836d1, fix: e3f530a}
app_code_changed: [src/lessons/assessment/bank.ts, src/lessons/assessment/revision.ts, src/lessons/assessment/types.ts, src/ui/lessons/assessment-view.ts]
new_strings: none
rollback: {method: revert, data_compat: "reader only; stored bytes unchanged", verified_by: "tests/assessment-revision.test.ts: storage, project archive and results file round trips"}
failing_before_fix: [tests/assessment-revision-edit.test.ts (1 of 3 fails at 31836d1)]
```

## What failed

A placement test stores its questions (ids, the option order shown, the numbers drawn) and the answers (an option index, a vehicle id, a number, an index list), but no score and nothing that names the bank (`src/lessons/assessment/types.ts:130-137`). Every place that shows a result graded the test again with the bank as it is now:

- `latestResult` (`src/ui/lessons/assessment-view.ts`), which feeds the catalogue card and the lessons' advice, the results file's `summary` at export, and WebMCP `get_assessment_result`;
- the result page, for the last test and for the earlier pre-test it is compared with;
- the review page;
- a test left unfinished, which went on with today's questions and skipped any it could not find.

So an edit to a question's answer key changed every stored result that asked it. That breaks S02 §02.7 (a stored result is never graded again).

## Failing before the fix

`tests/assessment-revision-edit.test.ts` takes the real bank and moves `b-karman`'s right answer to another option, as a later revision 2 would; the bank's history keeps the question as revision 1 had it. On `31836d1`, which adds only the test:

```
 FAIL  tests/assessment-revision-edit.test.ts > M-LEARNING-027: an edited question does not change an earlier result > a test taken before the edit keeps its score
AssertionError: expected [ [ 'b-karman', false ] ] to deeply equal [ [ 'b-karman', true ] ]
      Tests  1 failed | 2 passed (3)
```

The test taken before the edit answered the right option of its day and is graded wrong. After the fix all 3 pass: the earlier test keeps its score, and a test taken on revision 2 is graded by revision 2.

## The owner's answers (2026-10-26)

Asked in chat with a recommendation each; the owner chose the recommended option every time:

| Question | Answer | What this PR does |
|---|---|---|
| How is the revision stored? | "ช่อง revision ต่อแบบทดสอบ (แนะนำ)" | An optional `revision` on each test. No format version changes. Every current reader keeps an unknown field on a test (`loadProgress`, `validProgress`, the workspace guard, the results file and its checksum), so builds before this one, an old PWA tab included, keep it too. The owner confirms S18 §18.3.5's exception for this field. |
| What does a revision cover? | "เฉพาะการให้คะแนน (แนะนำ)" | What decides a score: an answer's correctness and credit, and the area and level it is weighed in. The wording of a question, its explanation, figures and the lessons it points to stay current. A question whose grading changes later is kept whole (wording too) in `BANK_HISTORY`. |
| #41's rewording with the same keys | "บันทึกในรายงานเท่านั้น (แนะนำ)" | Recorded below. A test from before #41 is revision 1 and its review shows today's wording. |
| A test from a newer build | "ไม่แสดง และเก็บไบต์ไว้ (แนะนำ)" | It is not resumed, graded or shown, and it is left out of the result, the catalogue card, the advice, an export's summary and WebMCP. Nothing is written into it, and storage, archives and results files keep it byte for byte. No new string. |

## Fix

- `src/lessons/assessment/bank.ts`: `BANK_REVISION = 1` and `BANK_HISTORY = []`. The comments say when the revision goes up (a grading change) and what the history keeps (each changed question as it was, in the bank's own format).
- `src/lessons/assessment/revision.ts` (new):
  - `attemptRevision(test)`: no revision → 1; a whole number this build knows → itself; anything else (a newer revision, or a value it cannot read) → null.
  - `readableAttempt(test)`: a test this build can show and grade.
  - `bankAt(revision, custom)`: today's questions with the history applied back to that revision, newest change first so the oldest one at or after it stays; a teacher's questions added as `questionBank` adds them. A history entry is read through `readQuestion`, as the bank reads its own.
  - `bankFor(test, custom)`: the bank a test is shown and graded with.
- `src/lessons/assessment/types.ts`: `AssessmentAttempt.revision?: number`. Nothing writes it in this step.
- `src/ui/lessons/assessment-view.ts`:
  - `latestResult`, the result page (both tests), the review page and a resumed test use the test's own revision's bank, for grading and for the questions shown.
  - Finished tests from a newer build are left out of the result, the comparison, the catalogue card, the advice, the export summary and WebMCP; an unfinished one is not resumed.
  - `nextTestKind(progress)` offers the placement test or the one after from the same readable tests, so a learner whose only test came from a newer build is offered the placement test here, not a test "to compare with" a result this build cannot show.
  - New tests are still drawn from today's bank.
- Reading writes nothing: a test with no revision is revision 1 when read; nothing is stamped on it (rule R1.1). `tests/assessment-revision.test.ts` checks a load and save gives the same bytes and no recovery copy.

## The bank's history since launch

The placement test reached users with PR #22 (merge `b74679e`, 2026-09-26 20:23Z; Pages finished 20:38Z). The bank changed after that in four PRs: #23, #41, #63 and #135. Nothing has changed it since `042c1a1`.

**What decides a score has not changed.** The test's `grading()` lists, for each of the 157 questions, the fields grading reads: type, area, level, kind; for choice and multi the number of options and the right ones; for order the number of items; for numeric the answer expression, unit, tolerance and the answer's value at the numbers' ends (so a constant behind it counts). The lines are in id order, since grading looks a question up by id. Its SHA-256 is the same at every point (computed on each commit's own bank):

| Commit | What | SHA-256 of `grading()` |
|---|---|---|
| `b74679e` | #22, launch | `98900066…1014d52` |
| `8ef1b2d` | #23 | same |
| `b674ccb` | #41 | same |
| `29a9c0f` | #63 | same |
| `042c1a1` | #135 | same |
| `408ad16` | main today | same (pinned in the test as revision 1) |

So every test stored so far, read as revision 1, gets the score, area levels and misconceptions it had when it was taken. The audit's results file of 2026-09-29 (exported from #41's branch build) still scores 19 %, with the same six areas as its frozen summary; the test checks this.

**What did change.**

- **#135 (`042c1a1`), card q11: terms only.** 15 Thai strings in 13 questions, each exactly one D5 term substitution (การนำทาง → การนำร่อง; ระบบนำร่อง(อัตโนมัติ) → ระบบรักษาท่าทาง(อัตโนมัติ); ระดับ/กรอบ/ระบบนำทาง → …นำร่อง). No English or Russian text and nothing structural changed. This answers card q11.
- **#41 (`b674ccb`): wording with the same keys**, recorded here as the owner chose:
  - prompts rescoped or rewritten: `o-two-burns`, `g-gnss-alone`, `g-peg-igm`, `c-rcs`, `f-stuck-gyro`, `f-series-reliability` (an assumption added);
  - distractors rewritten, still wrong: `g-zero-alpha` and `c-maxq-margins` (option 1);
  - right-option text refined, same index: `o-window`, `g-gnss-alone`;
  - `r-liftoff-accel`'s prompt now gives g0 = 9.80665, the value its key always used;
  - explanations corrected in ten questions, and Thai and Russian terms and typos fixed.
  A test from before 2026-09-30 is reviewed with today's wording in these questions.
- **#63 (`29a9c0f`):** two prompt times (`f-fairing-motors` T+115 → 113 s; `r-soyuz-mass` T+120 → 118 s) and the re-recorded Soyuz flight `r-soyuz-mass` charts. Keys unchanged.
- **#23 (`8ef1b2d`):** lessons added to `b-sputnik` and `b-order-history`, which only the advice reads. The advice follows the live lesson catalogue anyway, and these lessons did not exist at launch.
- Before launch, on #22's branch, the bank's meaning did change (areas renumbered, vehicle pools, two chart keys). Those commits never reached Pages.

## Tests run

- `tests/assessment-revision-edit.test.ts`: 3 of 3 (1 fails on the base, above).
- `tests/assessment-revision.test.ts`: 13 of 13. The pinned grading per revision; today's bank at the current revision, a teacher's questions included; the revision of a test with and without one; the test offered next when the only one came from a newer build; a newer test left out and left as it was; the audit's results file; the shapes tests were stored in (unsure by default, skipped, unanswered, unfinished); storage, a project archive (exported and read back) and the results file keeping each test's revision byte for byte, and the import check of an archive or a profile backup accepting it.
- `npm run -s typecheck`: clean. `npx vite build`: ok. `node scripts/bundle-budget.mjs`: ok, no ceiling raised.
- `npx vitest run`: 332 files, 10 520 tests pass.
- `node tests/browser/run.mjs` with the change map's journeys (CI font): `mobile-smoke` and `workspace-navigation` pass; the other six are held with the teaching tools. `teaching-held` passed on the first run; on the final code, run straight after the unit suite, it failed once at a screenshot (`page.screenshot: Timeout 30000ms exceeded`, the page ready), then passed twice on its own (73.0 s, 76.7 s). It does not open the placement test.
- Second agent: three lenses (data safety, test strength, plan compliance), each finding checked by two skeptics: 23 findings, 12 confirmed (none blocking), all fixed here: the fingerprint is in id order (a deleted or moved question no longer breaks an earlier revision's pin), `bank.ts` names exactly the pinned fields, the offer of the next test counts only readable tests, the export wording, a real archive round trip, and the envelope.

## Size

Source: +100 −17 lines in four files (`src/lessons/assessment/bank.ts`, `revision.ts`, `types.ts`, `src/ui/lessons/assessment-view.ts`), within D-25's ~400. Tests: +239 lines in two new files. No ceiling raised (`bundle-budget`: ok).

## Not in this step

- **2b, the writer.** A new test records `revision: BANK_REVISION`. It waits until this PR is merged and published by Pages, so no build that writes revisions exists before every build reads them.
- **A teacher's questions** have no revision. Their only writer is held with the teaching tools (`TEACHER_TOOLS = false`).
- **The review's charts and vehicles** come from live data (`FLIGHT_DATA`, the vehicle catalogue). A test's score does not depend on them.
- **The results file's `summary`** names no test or revision; 2b can add the revision there.
- **Docs:** N/A (USER-GUIDE does not describe how a placement test is stored).
