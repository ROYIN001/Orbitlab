# Session protocol / วิธีทำงานต่อ session

How every work session on Orbitlab opens, tracks, merges and records its work. It carries package M-PLATFORM-077 of the plan v2.0 draft (CO-8) and the owner's Merge Desk instruction of 2026-10-05 (plan S18 §18.14a).

**Status.** Adopted for waves K0–K1 (usage set S01, S05, S06, S08 set A, S18): owner, 2026-10-05 ~18:04Z, chat answer "รับรอง (แนะนำ)" to the question asking whether to adopt that set; other sections are adopted gate by gate. The adopted text is on the plan branch (`docs/development/plan-v2-draft/`); bringing it into `docs/development/plan/` is CO-8 PR2. This file is in force:

- §1 (Merge Desk) is the owner's own instruction of 2026-10-05 and is in force now ([DECISIONS](../DECISIONS.md), row "working method").
- §2 repeats D-65, D-38, D-63 and D-25 as the owner answered them on 2026-10-05 ([DECISIONS](../DECISIONS.md)).
- §3–§7 are in force from the adoption above (waves K0–K1).

Where this file and code or GitHub disagree, code and GitHub are right. Where it and [DECISIONS.md](../DECISIONS.md) disagree, DECISIONS is right.

## 1. Merge Desk: the owner approves each merge

**Owner's instruction, verbatim (2026-10-05):** "งานแต่ละส่วนเมื่อทำเสร็จแล้วทำสรุปมาว่าทำอะไรบ้าง แล้วทำแบบให้ผมกดเลือกได้เลยว่าให้กด merge มั้ย บันทึกเข้าไปในวิธีทำงานต่อจากนี้ของทั้งงานด้วยครับ"
(When each part of the work is finished, summarize what was done and let me choose with a click whether to merge; record this in the working method for the whole project from now on.)

**The page.** Orbitlab Merge Desk (claude.ai artifact `https://claude.ai/artifact/77kbiVNddHUixiZ7aXJSxB`): one card per PR, with two buttons, "อนุมัติ merge" (approve merge) and "ยังไม่ merge" (don't merge yet), and a text box. Its database has a collection `prs` (written by the integration session; Editors and above can write) and a collection `decisions` (only the artifact's owner can write). Anyone else the owner shares it with can only read it.

**Steps for every PR, every lane, every wave:**

1. When the PR meets its Definition of Done — CI green on the current head; for P0/P1, physics and storage work, a second agent has reviewed it and its findings are fixed; the report and the PROGRESS row are in the PR — the integration session writes a card into `prs`, in plain Thai, with:
   - **ทำอะไรไป (what was done):** what the user sees or what changed, not a list of files;
   - **ผลตรวจ (checks):** the CI run id, the test that failed before the fix and passes after it, and the second agent's result as "confirmed N of M";
   - **สิ่งที่ควรรู้ก่อนตัดสิน (know before deciding):** limitations, merge order, questions for the owner;
   - the status `ready` / `waiting` (waits on something else, such as merge order) / `blocked` / `merged`, with the `head` SHA the summary describes.

   A short Thai summary with the page's link also goes into the chat.
2. The owner presses a button. The integration session reads `decisions` every time it wakes on an event or a check-in, and whenever the owner says so in chat.
3. **Merging.** When `decisions/<pr>` has `choice: "merge"`, the approved head equals the current head, CI is green, the PR merges without conflict and the merge order is met (for example CO-2 after CO-1 is published), the integration session squash-merges as usual — never with an admin override — then records the SHA and follows Pages. If the head changed after the owner pressed, ask the owner again and say what changed.
   **Exemption** (accepted by the owner in chat, 2026-10-05): if the head changed only because main was merged in, and the conflicts resolved touch only the record files `CHANGELOG.md` and `docs/development/PROGRESS.md`, with both sides' text kept, the earlier approval stands — **as long as CI is green on the new head**, and the new SHA is written on the card. Any other change, including a change made to follow the owner's note, needs a new approval.
   **Standing approval for bug fixes** (owner in chat to the K1 integration session, 2026-10-06, verbatim: "ถ้าจุดไหนที่ไม่ใช่ปัญหาที่ต้องตัดสินใจ เป็นแค่เรื่องแก้จากผิดเป็นถูก(แก้บั๊คที่เคยมีอยู่) ให้ดำเนินการเองต่อเนื่องได้เลยครับ จะได้ไม่เสียเวลาทำงาน"; "where something is not a question that needs a decision, only a fix from wrong to right (fixing a bug that already exists), go ahead on your own continuously, so no working time is lost"). The integration session merges without waiting for a button when **all** of these hold: the PR only fixes an existing bug (or only records facts in the record files); a regression test failed before the fix and passes after it; for P0/P1, physics and storage work a second agent has reviewed it with no open blocking finding; CI is green on the current head; no budget ceiling is raised and no existing assertion is changed. It still writes the card (state `merged`, with "merged under the standing bug-fix approval") so the owner can look back. Everything else still waits for the owner: a ceiling raise (D-38), a changed assertion, a new feature, a change of look or wording that is a choice, and anything the plan leaves to the owner.
4. `choice: "hold"`, or text in the box: do not merge; do what the text says, then update the card. An approval typed in chat is valid at any time and weighs the same as the button.
5. After the merge, the card becomes `merged` with the SHA, the Pages run and the publication result. Merged ≠ published ≠ live.

**Limitation.** The page does not notify the session when the owner presses. The session sees it when it wakes on a GitHub event, at a scheduled check-in, or from a chat message. To have a PR merged at once, the owner says "กดแล้ว" (pressed) in chat.

## 2. Rules the owner has decided (2026-10-05)

- **Authorization (D-65).** No package starts without the owner's authorization for its wave or for the package, recorded verbatim with its date in the package's envelope and report. It is never inferred from an earlier package or instruction: the earlier "ทำต่อเลยครับ" does not cover R4 or any v2.0 package. Wave K0 is authorized; K1 is authorized once K0 is merged and verified complete, in a new session (owner in chat, 2026-10-05). Each later wave is authorized separately at its gate.
- **Budgets (D-38).** A ceiling rises only with four things in the same PR: the measured size, the feature and package that grew it, a named identical-output offset package, and the owner's approval. A note approving one PR is not a standing raise.
- **Order (D-63).** In each lane identical-output work goes first, except P0/P1 bugs that lose data or show false results in the same files, which go before it.
- **AI-written code (D-25).** About 400 changed source lines per PR at most, or a written reason the second reviewer agrees with; a second agent reviews P0/P1, physics and storage work; one report per task (`docs/development/reports/<package>.md`); the owner reads the summary with the actual physics and data changes.
- **Decisions.** Questions found during work are written as 2–3 options with their effect and a proposal; only the steps that depend on the answer wait. No agent decides for the owner or writes "decided" or "accepted" in the owner's place. Answers go into [DECISIONS.md](../DECISIONS.md) with the date and the owner's words.

## 3. One row per package (PROGRESS)

- [PROGRESS.md](PROGRESS.md) holds one row per work package (or one issue per package, if the owner prefers issues) with: package, lifecycle, authorized by / date, merge SHA, CI run, Pages run, scientific acceptance. The R1–R3 history stays under the table.
- A package's PR does **not** edit PROGRESS.md (owner, 2026-10-06; see §4). It writes its row in its own fragment file under `changes/`, and the integration session's records PR moves it into the table. The file belongs to the integration session.
- **Step 1, in the merging PR's fragment:** the row says what is true the moment it merges — "merged, waiting for publish" — with the PR number and CI run. If the PR is not merged, the fragment never reaches main.
- **Step 2, within one working day after Pages:** one Markdown-only records PR for everything published that day: squash SHA, Pages run, deployment and "published". If Pages fails, the row stays "merged, waiting for publish" with the failed run's number.

## 4. One fragment file per PR (CHANGELOG line and PROGRESS row)

Owner's choice, 2026-10-06 (decision card option "ใช้ไฟล์ย่อย", confirmed in chat: "ยืนยันครับ ใช้ไฟล์ย่อยได้เลย"). Measured that day: 78 of 80 catch-up merges of main into `claude/*` branches since 2026-10-04 conflicted, and only 2 of them in code; `CHANGELOG.md` conflicted 73 times and `PROGRESS.md` 46 times, because every PR wrote at the top of both.

- A work PR does **not** edit `CHANGELOG.md` or `docs/development/PROGRESS.md`. It adds one new file, `changes/<branch-name with / replaced by ->.md`, in the format of [changes/README.md](../../changes/README.md): its one CHANGELOG line and its PROGRESS row. A new file per branch cannot conflict.
- The integration session's records PR (lane I) folds every fragment on main into `CHANGELOG.md` (newest first, under Unreleased) and `PROGRESS.md`, adds the merge SHA and Pages run, and deletes the fragments it folded, in the same diff.
- Open PRs move to a fragment the next time they need a sync with main.
- `budgets.json` may follow the same pattern later if it starts conflicting; not yet.
- §1's exemption still covers a sync whose only conflicts are in `CHANGELOG.md` or `PROGRESS.md` (an older branch), with both sides kept.

## 5. Branches

- One step, one branch, one PR, named `<agent>/<lane>-<package>-s<step>`. One change type per PR (identical-output never mixes with another type).
- Rebase at least every two working days, and before asking for review or merging.
- A branch that has not moved for **14 days** is closed, with its notes moved into a report or hand-off, or rebased and continued.
- No new PR in a lane whose latest PR, or main on the lane's files, is red: fix or revert first.

## 6. Every PR says

- **docs touched, or N/A** (README, IMPLEMENTATION-STATUS, USER-GUIDE);
- the package, step and change type, and the owner's authorization with its date;
- the tests actually run, with counts; the failing-before result or the before/after table;
- the budget line: unchanged / lowered / raise with the four D-38 parts;
- its fragment file under `changes/` (its CHANGELOG line and PROGRESS row);
- reviewers: second agent (P0/P1, physics, storage), owner (anything visual), science reviewer (realism), as "confirmed N of M".

## 7. Never

Drop test cases, lengthen a timeout as the fix, re-run without knowing the cause, skip heavy for shared physics work, skip browser tests for migration or PWA work, mix results of an old and a new source, or raise a budget without a cause and a named offset (plan S18 §18.15).

## Open question for the owner

The plan proposes a `docs/development/registry.tsv` generated from the plan's item assignment (429 items → package), so each item's package and state can be looked up. It is **not** committed; the owner chooses whether it should be.
