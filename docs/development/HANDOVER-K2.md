# Hand-over: wave K1 close and gate GK1 → wave K2 (GK1 session, 2026-10-26 → 2026-10-28)

> **สรุปสำหรับเจ้าของ (ภาษาไทย)**
>
> ไฟล์นี้ส่งงานจาก session ที่ปิดคลื่น K1 และประตู GK1 ไปให้ session ใหม่ของ K2 ("OrbitLab wave K2") ตามที่คุณบอกในแชตเมื่อ 2026-10-28T03:06:42Z ว่า "ถ้าจะเริ่มงานwaveใหม่ ให้เริ่มทำในเซสชั่นใหม่ได้เลยครับ ใช้ระดับ Extra + ultracode"
>
> **ส่งมอบแล้ว**
> - เว็บที่ใช้อยู่คือ candidate `7263004` (#179) ซึ่ง Pages 40385448079 เผยแพร่เมื่อ 2026-10-26 19:41:58Z ไม่มี commit ใหม่บน main หลังจากนั้น
> - K1 merge เข้า main 85 PR เป็นงานในแผน 45 PR บันทึกผลของ K1 อยู่ใน #182: ค่า KPI, retrospective และการประมาณใหม่, การตรวจคำตัดสิน, งานส่งต่อ, journey ที่พักไว้ และการซ้อม revert
> - คำตอบของคุณเมื่อ 28 ต.ค. (S1–S12) อยู่ใน DECISIONS หัวข้อ "Decided 2026-10-28" บน #182 รวมถึงคำตอบเรื่องแผนและการอนุญาต K2 ว่า "รับรองและอนุญาต K2" (02:54:22Z)
> - เพิ่มใน #182 แล้ว: ผลตรวจค่าค้างตอนเข้า Orbit (KPI-07) ซึ่งวัดสองรุ่นสลับกันบนเครื่องเดียวกัน และขนาดของ 5 PR ตามคำตอบ S9
>
> **ยังค้าง (รอคุณ)**
> - session บนเครื่องจริง (HU-6) บน `7263004` ยังไม่ได้ทำ ระหว่างนี้ไม่ merge อะไรเลย รวมถึงไฟล์ Markdown เพื่อให้เว็บยังเป็น `7263004` ตอนคุณตรวจ
> - session K2 จะถามคุณใน chat ก่อนงานอื่น (หัวข้อ 14 ขั้น 0) ว่าจะทำ HU-6 วันไหน ทำสองเครื่องในวันเดียวกันไหม และจะนับวันไหนเป็นหน้าต่าง EQ-6 เพราะยังไม่มีวันที่บันทึกไว้
> - หลัง HU-6 และ Q check: session K2 ถามข้อ 2 ของ S1 (ลงนาม GK1 โดยบันทึกว่า G0 และ G1+ ไม่ผ่าน) ก่อน แล้วจึงถามข้อ 1 ในคำถามเดียวว่า merge #181 แล้ว #182 หรือไม่ ทั้งสองข้อไม่มีข้อแนะนำ คุณตัดสินเอง (หัวข้อ 14 ขั้น 4–5)
> - เมื่อทำ HU-6 เสร็จ ส่งใบผล ภาพหน้าจอ และไฟล์ CSV ของข้อ 12 (ถ้าสะดวก) ใน chat ของ session K2 ("OrbitLab wave K2") คู่มือเขียนว่า "ส่งใน chat ของ session นี้" แต่ session เดิมปิดพร้อมการส่งมอบนี้
> - branch สองตัวของ q01 ที่คุณตอบ S12 ว่าจะลบเอง ยังอยู่บน GitHub (ตรวจเมื่อ 2026-10-28 03:50Z)
> - วันที่ของประตูในคำถาม S11 (GK6 17 มี.ค. / 24 พ.ค. 2027) คิดจากฐานเก่า บันทึกใช้ฐานตอนตรึง candidate ซึ่งเลื่อนเร็วขึ้น 10 วันทำการเท่ากัน ข้อความถึงคุณเมื่อ 2026-10-28T03:14:14Z แจ้งวันที่ฐานใหม่ของ GK3 (5 ม.ค. / 5 ก.พ. 2027) และ GK6 (15 มี.ค. / 18 พ.ค. 2027) และว่า Day 85 เลื่อนจาก 16 ก.พ. เป็น 2 ก.พ. 2027 แล้ว ส่วน GK2, GK4 และ GK5 บนฐานนี้ยังไม่ได้แจ้ง (หัวข้อ 11)
>
> **งาน K2**
> - รายการงาน: แถว K2 ของ S05 รวมกับงาน K1 ที่ย้ายมา 41.6 PR รวมเป็น 103.7 PR ราว 29.9 วันทำการ เทียบกับกรอบ 15–20 วัน
> - กติกาใหม่ 5 ข้อ เช่น journey ใหม่หรือที่แก้ต้องรันบน CI 20 รอบก่อน merge
> - เครื่องมือครูยังพักไว้ (S4) และหน้าต่าง EQ-6 คง K2 วันที่ 1–2 (S6) แผนเขียนไว้ตรงกับ 26–27 ต.ค. ซึ่งผ่านไปแล้วระหว่างที่ยังไม่ merge อะไร วันที่ใหม่ยังต้องถามคุณ (หัวข้อ 7.2)
> - session K2 ถามการ์ดของคุณแล้ว (HU-1 Q-1…Q-8, K0-13, K1-24, K1-38, K1-62) คุณตอบครบระหว่าง 03:19:14Z ถึง 03:29:17Z คำตอบลง DECISIONS หัวข้อ "Decided 2026-10-28" (ตาราง "The S7 card, asked by the K2 session") และแถว hand-off ทั้งห้าใน GK1-handoffs แล้ว ข้อ Q-1 คุณตอบ "ข ทำครบเจ็ดโจทย์" ซึ่งไม่ใช่ข้อที่แนะนำ
> - session K2 เตรียม docs PR สองฉบับ: ฉบับเดียวตาม S10 (รวมบรรทัดของ S11) และฉบับที่คัดลอกส่วนของแผนที่คุณรับรองเข้า `docs/development/plan/`
>
> **เรื่องที่ผู้รับงานต่อควรรู้ก่อน**
> - ขนาดแอปเต็มเพดาน: precache code เหลือ 174 B ซึ่งจำกัดทุกก้อน และ `i18n-*.js` เหลือ 9 B งานที่ทำให้ขนาดโตต้องมีส่วนลด (offset) หรือให้คุณอนุมัติเพดาน (D-38)
> - branch R4.1 (`claude/pd-r41-s1`) รอหลัง GK1 เพิ่มขนาด precache code ราว 511 B และน่าจะเกินเพดานราว 337 B (เหลือที่ 174 B) เป็นค่าประมาณจาก build เดิม ยังไม่ได้ build จริง rebase ที่ทำไว้อยู่ในเครื่องของ session เดิมและไม่ได้ push session K2 ต้อง rebase ใหม่ (หัวข้อ 15)
> - PR ที่แตะไฟล์ในรายการ D-64 ต้องรัน heavy และ fleet ใหม่
> - ตอนสร้าง session K2 (03:12:16Z) session GK1 ถือ #181, #182, HU-6 และการลงนาม GK1 ส่วน session K2 ถืองาน K2 ทั้งหมด เมื่อ 03:19:45Z คุณเขียนว่า "งานที่ยังค้างอยู่เซสชั่นเก่าจัดการปิดให้เรียบร้อยด้วนนะครับ" session GK1 จึงปิดเมื่อ push ไฟล์นี้ (28 ต.ค.) จากนั้น session K2 ถือ #181, #182, บันทึก HU-6, การลงนาม GK1 (ข้อ 1–2 ของ S1), รายการของ #181 และ #182 ใน Merge Desk และเอกสารความพร้อม GK1 (หัวข้อ 6)
> - ขั้นตอนปิด GK1 หลัง session HU-6 ของคุณอยู่ในหัวข้อ 14 บันทึกผลใช้ไฟล์ชื่อ `HU-6-GK1.md` แม่แบบบันทึก HU-6 อยู่ในภาคผนวก A และคู่มือ HU-6 ภาษาไทยที่คุณได้รับใน chat เมื่อ 26 ต.ค. 20:50:57Z อยู่ในภาคผนวก B ถ้า session HU-6 ทำไม่ได้ ให้บอกใน chat แล้วช่องว่างนั้นจะบันทึกเป็น variance (หัวข้อ 14 ขั้น 8)

This file is the hand-over from the session that integrated wave K1 and prepared gate GK1 (`session_01T45MNvt5Nietq81AceDVPV`) to the session for wave K2 (`session_01TKnZLM4kuUVemsMK4X6em1`, "OrbitLab wave K2", started 2026-10-28T03:12:16Z). Code and GitHub win over this text: check every SHA and status against GitHub before acting.

How to read the sources:
- `file:n` without a commit is the file at `7263004` (main, the GK1 candidate).
- "#182" names the GK1 record on branch `claude/happy-hawking-m71bk1-gk1-record`. Its files are cited by section, because the 2026-10-28 records are still being added to that branch.
- "@5092ac9" is #181's commit (records PR 8). Plan drafts are cited at `c2af8ae` on branch `claude/hopeful-allen-1o0vmh`.
- "Local run, not committed" marks evidence from a build or script in the GK1 session's container. Its numbers are in the repo files named; its files are not. That container's scratchpad is not reachable from the K2 session, and it goes when the GK1 session is archived, so those files cannot be fetched; section 14 and the appendices carry what finishing GK1 needs.

**To finish GK1:** section 14 (the steps), section 4 (where GK1 stands), Appendix A (the HU-6 record template) and Appendix B (the owner's Thai HU-6 guide). R4.1's parked branch: section 15.

## 1. How the work is run (read first)

| Topic | Where | Key rule |
|---|---|---|
| Owner authorization for K2 | DECISIONS (#182), "Decided 2026-10-28", rows S1's items 4–5 and S3 | On S1's items 4–5, adopting the plan sections K2 uses and authorizing K2 (D-65), the owner answered "รับรองและอนุญาต K2" (chat, 2026-10-28T02:54:22Z). On S3, the re-plan row, the owner answered "ก อนุมัติตามที่เขียน (แนะนำ)" (same time). At 03:06:42Z the owner wrote "ถ้าจะเริ่มงานwaveใหม่ ให้เริ่มทำในเซสชั่นใหม่ได้เลยครับ ใช้ระดับ Extra + ultracode" (DECISIONS (#182), the paragraph after the 2026-10-28 table). |
| The merge hold (H2) | kpi-GK1 (#182), "Candidate" and Gates item 1; DECISIONS (#182), the last paragraph of "Decided 2026-10-28" | No merge of any kind, Markdown included, until the owner's HU-6 session ends. The GK1 record is the first merge after it: #181, then #182. Reason: `deploy.yml` publishes only main's tip (`.github/workflows/deploy.yml:42-46`, `:289-296`), and the build stamp is the built commit, so any merge would change the live stamp the owner checks in HU-6 (expected `v0.1.0 · 7263004`, kpi-GK1 "Candidate"). The rule was H2 of the GK1 session's freeze runbook (local, not committed). |
| Merging | `SESSION-PROTOCOL.md` §1 (`:32` the standing approval) | The owner approves on the Merge Desk (https://claude.ai/artifact/77kbiVNddHUixiZ7aXJSxB, `HANDOVER-K1.md:100`) or in chat. The standing approval of 2026-10-06 lets the session merge a PR that only fixes an existing bug, or only records facts in the record files, when all its conditions hold: a regression test that failed first, a second agent's review for P0/P1, physics and storage work, green CI on the current head, no ceiling raised and no assertion changed. Everything else waits for the owner (a ceiling raise, a changed assertion, a feature, a choice of look or wording). |
| Records | `SESSION-PROTOCOL.md:49`, `:51`, `:58`; `changes/README.md` | A work PR adds `changes/<branch>.md` and does not edit CHANGELOG or PROGRESS. A records PR folds fragments within one working day of Pages. The fragment template still says "In PR"; fixing it is K2 work (S8's KPI-31 answer, section 5). |
| WIP | `plan/S18-execution-model.md:206-207` | At most 5 open code PRs, 1 open PR per lane (drafts count), lane P one at a time, 1 I-owned PR, and 2 records PRs. **#181 and #182 fill both records slots** until they merge. S18:207 counts as records only Markdown-only PRs that record (PROGRESS, DECISIONS answers, HU reports); a PR that touches any other file, or Markdown that code reads, uses a code slot, and S18:206 counts lane W's content docs PRs in the code WIP. The re-plan keeps the caps unchanged (PROGRESS (#182), row "Re-plan at GK1", "Unchanged"). |
| The five rules | PROGRESS (#182), row "Re-plan at GK1", "Rules"; K1-retro (#182), "Hard, slow and repeated work" | (1) No PR starts from another open PR's branch. (2) A new or changed journey runs **20 times** on CI before merge (the count in S3's option (ก)). (3) Each records PR re-runs the follow-through and hand-off checks it touches, and a second agent confirms it. (4) When no plan PR is open, I opens the next authorized package in S05 §05.6's order. (5) An owner request gets a placement row when it is accepted. They go into S18 §18.6 or SESSION-PROTOCOL in the one docs PR of S10 (section 7.5). |
| Size budgets | `budgets.json` `_notes`; D-38; section 8 | A ceiling rises only with the measured size, the feature, a named offset and the owner's approval (`HANDOVER-K1.md` §1). There is almost no room left (section 8). |
| Physics reuse | D-64, `DECISIONS.md:60`; section 9 | A heavy or fleet run stands for another commit only while the D-64 list is unchanged. |
| Tests | owner rules (`HANDOVER-K1.md` §1) | Failing test first for every bug. Never relax a tolerance, rewrite a golden, drop a test or change an assertion without the owner. Find the root cause of a flake. |
| Plan | `plan/` on main (S01, S05, S06, S08 set A, S18); drafts at `c2af8ae` | K2's sections (S04, S07, S08 set C, S09, S10, S11, S13, S16, S17) are the drafts at `c2af8ae` (`docs/development/plan-v2-draft/sections/`), adopted by the owner's answer above; a docs PR copies them into `plan/` (section 7.5). kpi-GK1 (#182), "For the owner: K2's plan sections", lists what changed in each since `c2af8ae`. |

## 2. What K1 delivered and where it is recorded

- **Main and the live site.** `main` = `7263004` (#179, Budgets, card `q03-1` B), merged 2026-10-26T19:17:43Z on the owner's Merge Desk answer "merge #179 (แนะนำ)" (chat, 2026-10-26T19:17:23Z; `DECISIONS.md:364` @5092ac9). Pages [40385448079](https://github.com/ROYIN001/Orbitlab/actions/runs/40385448079): 11 of 11 jobs, `deploy-pages` finished 2026-10-26T19:41:58Z, union unit 10 521/10 521 and browser 37/37 (kpi-GK1 (#182), "Candidate"). No commit on main since (`git ls-remote`, 2026-10-28T03:50Z).
- **K1 in numbers.** 85 PRs into main (#95–#180, less #167): 45 plan-package PRs, 16 owner-requested, 12 records, 6 budget, 5 test-cause fixes, 1 process (K1-retro (#182), "What K1 delivered", "By kind"). Median lead 45 min; 3.46 plan PRs per working day (kpi-GK1 (#182), KPI-33).
- **The GK1 record (#182).** `docs/development/reports/`: [kpi-GK1](reports/kpi-GK1.md) (KPI values, gates, the 12 owner questions), [K1-retro](reports/K1-retro.md) (retrospective, re-estimate, re-plan), [GK1-followthrough](reports/GK1-followthrough.md), [GK1-handoffs](reports/GK1-handoffs.md) (153 hand-off rows, 42 with no owner at the freeze), [GK1-held-journeys](reports/GK1-held-journeys.md) (decision 7: the six held journeys, 6 of 6), [revert-drill-GK1](reports/revert-drill-GK1.md) (P2: 48 of 48), the candidate's run added to [R7.1-GK1](reports/R7.1-GK1.md); PROGRESS rows "GK1 (K1 close, records)" and "Re-plan at GK1" and the "Variances for GK1"; DECISIONS "Follow-through at GK1" and "Decided 2026-10-28". Q check, 2026-10-27: confirmed 2 266 of 2 458 claims, 17 corrected, 192 not checkable from primary sources (kpi-GK1, "Gates").
- **Added on 2026-10-28 (#182):**
  - KPI-07, the Orbit-entry freeze (25.3 s against PB's 4.3 s), checked with `5f9aa2e` and `7263004` measured in turns on one host and one binary at a time (local run, not committed). With full Chrome 153 the candidate was faster in 4 of 4 pairs; with chrome-headless-shell 153 it was slower in 5 of 5, about 1.5 times, from #112's Home cue change, not the Orbit code. Where the rest of run 3's time goes is not known (kpi-GK1, KPI-07 row and its note under "Large trend changes").
  - D-38, the five PRs of answer S9 (#153, #155, #157, #162, #176), each with its size measured from Pages at its first parent and merge commit (kpi-GK1, "The five PRs of answer S9").
- **Records PR 8 (#181)** folds #179 and records the #179 Merge Desk answer and the owner's five answers before the freeze, P1–P5 (`DECISIONS.md:364-369` @5092ac9).

## 3. Open pull requests

Read with the GitHub API, 2026-10-28 about 03:50Z: only these two are open.

| PR | Branch, head | Base | What | State | Why it waits |
|---|---|---|---|---|---|
| #181 | `claude/happy-hawking-m71bk1-records-179`, `5092ac9` | `main` | Records PR 8: #179's fold, the #179 Merge Desk answer, P1–P5 | draft, opened 2026-10-26T21:35:56Z | The merge hold (H2): nothing merges until the HU-6 session ends. #179's fold was due by 2026-10-27T19:41:58Z (one working day after Pages); it is late, and kpi-GK1's KPI-31 row (#182) records it as "#179 waiting … carried by #181". The sign-off sheet the owner received put #181's merge inside GK1 item 1, the owner's own decision (section 14, step 5). |
| #182 | `claude/happy-hawking-m71bk1-gk1-record`, `6122a19` before the push that carries the 2026-10-28 records and this file | `claude/happy-hawking-m71bk1-records-179` (stacked on #181) | The GK1 record (section 2) and this file | draft, opened 2026-10-27T21:16:34Z | The merge hold, and the owner's S1 answer: GK1 items 1–2 (merge this record, sign GK1) wait for the HU-6 session. |

## 4. GK1: where it stands

- **GK checklist (12 items, `plan/S05-structure-waves-gates.md:110-122`):** pass 4 (items 1, 3, 4, 8), partial 7 (2, 5, 6, 7, 9, 10, 11), not done 1 (12; the owner's answer of 2026-10-28 is in its last column) (kpi-GK1 (#182), "Gates").
- **G0 and G1+: not passed**, as the owner chose on 2026-10-24 by option (ก) (`DECISIONS.md:344`). G0 lacks 12 of S07's 20 oracles (11 not built, EO-UI-4 unconfirmed; R0.4) and its signature; G1+ lacks KPI-13 at target (R1.6 PR5), some fixtures and its signatures (kpi-GK1, "G0 closure", "G1+"). What they lack moved to K2 in the re-plan row. On S5 the owner answered "ก รับข้อ 1, 2, 4, 5 (แนะนำ)" (2026-10-28T02:59:22Z): re-check and sign in a records PR as soon as the last piece merges, no later than GK2; G1+'s second storage reviewer is a session that did not write the work; R4.4's independent science reviewer is named before R4.4 starts; EO-UI-4 confirmed against the journey list with the held journeys named; R0.2r still gets its JSON examples.
- **G7 item 4 (tag and release): not done.** On S2 the owner answered "ก ไม่ทำที่ GK1, v1.0 สิ้น K4 (แนะนำ)" (2026-10-28T02:54:22Z).
- **Items 1–2 of S1 wait for the HU-6 session.** On S1 the owner answered "ก ตอบสองรอบ (แนะนำ)" (2026-10-28T02:54:22Z): items 3–5 then, items 1 (merge the GK1 record) and 2 (sign GK1, with G0 and G1+ recorded as not passed) after HU-6. Neither is answered yet.
- **The HU-6 session** (decision 6, `DECISIONS.md:356`; device classes low-end Android and iPad, D-56, `DECISIONS.md:51`) has not happened, and no date is recorded: the question on its timing was closed by a restart on 2026-10-26 and not asked again (K1-retro (#182), "KPI-35 owner decisions"). Section 14, step 0, asks it first. What it fills, on the candidate's stamp `v0.1.0 · 7263004` (kpi-GK1, "HU-6 slot"): the date and the stamp seen; device class, browser, network, language; KPI-32 (one full Soyuz or Falcon mission without a reload); the old service worker offering the new version as a reload (G7 item 2); task 12, the Monte Carlo CSV download on Firefox (Android) and Safari (iPad) (P3, `DECISIONS.md:367` @5092ac9); KPI-08 device rows. Android peak memory (hand-off K1-10) stays open (P3).
- **Where the HU-6 slots are** (the phrase "waits for the owner's HU-6 session" in #182): kpi-GK1 (the "HU-6 slot" table, KPI-08, KPI-32, "Live", GK items 6 and 8, G7 items 1–2, "Not verified"), K1-retro ("Item 3": the HU-6 result slot; "Not measured": the live stamp), GK1-handoffs (K1-90, K1-41, K0-40's device part, K1-78's HU-6 link), GK1-followthrough (G5 and the decision rows on HU-6), R7.1-GK1 ("Human evidence: HU-6", which names the report file `HU-6-GK1-devices.md`, written only if the session takes place; section 14 names it `HU-6-GK1.md` and changes that row), revert-drill-GK1 ("Owner checks"), PROGRESS (rows GK1, HU-6 and the variances) and DECISIONS ("Follow-through at GK1"). Fill a slot only from the owner's report; a cell the owner leaves empty stays "not reported". If the session does not take place before the record merges, the gap is a variance (kpi-GK1, "HU-6 slot"; R7.1-GK1, "Human evidence: HU-6"). Section 14, step 3, gives the grep that finds every slot, and a table of them with their lines.

## 5. The owner's answers of 2026-10-28

All are in DECISIONS (#182), "Decided 2026-10-28", one row each, with the question as the form showed it, the owner's words and where each lands. They are not repeated here in full. Times are the session transcript's (UTC).

| Question | Answered | Owner's choice | Where it lands for K2 |
|---|---|---|---|
| S1 (how to give the five owner-only answers) | 02:54:22Z | option (ก), two rounds | Items 3–5 now; items 1–2 after HU-6 (section 4) |
| S1 items 4–5 (adopt K2's plan sections; authorize K2, D-65) | 02:54:22Z | "รับรองและอนุญาต K2" (no recommendation was offered) | Section 1; the plan copy (section 7.5) |
| S2 (G7 item 4 at GK1) | 02:54:22Z | option (ก) | No release at GK1; v1.0 at the end of K4 |
| S3 (the re-plan row) | 02:54:22Z | "ก อนุมัติตามที่เขียน (แนะนำ)" | Section 7; the five rules (section 1), rule 2 at 20 runs |
| S4 (teaching tools in K2) | 02:59:22Z | option (ข), recommended | Still held (section 7.3) |
| S5 (G0 and G1+ details) | 02:59:22Z | option (ก), items 1, 2, 4, 5 | Section 4 |
| S6 (EQ-6 window) | 02:59:22Z | option (ก), recommended | K2 days 1–2 (section 7.2) |
| S7 (hand-off rows with no owner) | 02:59:22Z | option (ก), recommended | The 39 proposed lanes in GK1-handoffs are those rows' owners; cards for the owner's items only (section 7.4) |
| S8 (variances for GK1) | 03:03:21Z | option (ก), recommended | The option: acknowledge them all as recorded, nothing reverted |
| S8, KPI-31 | 03:03:21Z | option (ก), recommended | KPI-31 reported both ways; fix `changes/README.md`'s fragment template in K2 |
| S9 (`q03` B allowance) | 03:03:21Z | option (ก), recommended | All five PRs count; their rows are in kpi-GK1 (section 2) |
| S10 (plan-file edits) | 03:03:21Z | option (ก), recommended | One docs PR with the listed edits only (section 7.5); the rest of R7.5 stays not authorized |
| S11 (calendar) | 03:04:38Z | "ไม่พัก", typed in place of the four options | No year-end break (section 11) |
| S11 follow-up: public holidays | 03:07:38Z | option (ก), recommended | No public holiday skipped from 2026-10-26 on (section 11) |
| S11 follow-up: plan files | 03:07:38Z | option (ก), recommended | The break and gate-date lines go into the same docs PR as S10 (section 7.5) |
| S12 (the two `q01` branches) | 03:04:38Z | option (ก), recommended | The owner deletes them (section 10) |

Also in chat, verbatim, with the transcript's times: 2026-10-27T20:45:25Z, before the first form was shown, "เปิด Agent มากกว่า2ตัวพร้อมกันเลยครับ" (open more than two agents at the same time; DECISIONS (#182), the first paragraph after the 2026-10-28 table); 2026-10-28T03:06:42Z "ถ้าจะเริ่มงานwaveใหม่ ให้เริ่มทำในเซสชั่นใหม่ได้เลยครับ ใช้ระดับ Extra + ultracode" (section 1); 03:19:45Z "งานที่ยังค้างอยู่เซสชั่นเก่าจัดการปิดให้เรียบร้อยด้วนนะครับ" (section 6).

## 6. Which session does what

**At the K2 session's creation** (2026-10-28T03:12:16Z; the K2 session's opening prompt, sent with its creation), the GK1 session (`session_01T45MNvt5Nietq81AceDVPV`) kept #181 and #182 and their branches, the owner's HU-6 session and its record, GK1 items 1–2 (the merge of the GK1 record and the GK1 sign-off), and the KPI-07 write-up, the S9 D-38 rows and this file, all pushed to #182's branch. The K2 session (`session_01TKnZLM4kuUVemsMK4X6em1`, "OrbitLab wave K2") took all K2 work and kept off #181, #182 and their branches.

**The GK1 session closes on 2026-10-28 with the push of this file, at the owner's request.** At 2026-10-28T03:19:45Z the owner wrote to the GK1 session, verbatim: "งานที่ยังค้างอยู่เซสชั่นเก่าจัดการปิดให้เรียบร้อยด้วนนะครับ" (finish off the work still open in the old session). At about 03:29:56Z the GK1 session told the K2 session (`send_message`) that it was closing, that once its last records were pushed it would hand over #181, #182, the HU-6 record, GK1 items 1–2 and the Merge Desk entries, and that until then the K2 session should keep its hands off #181 and #182. The push of this file to #182's branch is that hand-over; the GK1 session then sends the K2 session a message with #182's pushed head SHA. If that message has not arrived, the head of `claude/happy-hawking-m71bk1-gk1-record` on GitHub that carries this file is the hand-over.

**Who owns what now:**

| Session | Owns |
|---|---|
| GK1 session, `session_01T45MNvt5Nietq81AceDVPV` | Nothing, from the push of this file: it closes with that push. Its container, with the scratchpad that holds every "local run, not committed" file, is not reachable from the K2 session and goes when the GK1 session is archived; what it leaves is this file and #181's and #182's branches. |
| K2 session, `session_01TKnZLM4kuUVemsMK4X6em1` ("OrbitLab wave K2") | All K2 work (section 7), and, from the GK1 session: #181 and #182 and their branches (`claude/happy-hawking-m71bk1-records-179`, `claude/happy-hawking-m71bk1-gk1-record`); the owner's HU-6 session and its record (section 14; Appendices A and B); the GK1 sign-off, GK1 items 1–2 (section 14, steps 4–5); the Merge Desk entries for #181 and #182; and the GK1 readiness doc. |

- **Merge Desk** (https://claude.ai/artifact/77kbiVNddHUixiZ7aXJSxB; collections `prs` and `decisions`; the owner presses the buttons there, `SESSION-PROTOCOL.md` §1). Read on 2026-10-28 at about 04:37Z and again at 05:07Z: card `pr182` is `waiting`, at `head` `6122a19`, `updatedAt` 2026-10-27T21:30:00Z, and its fields are stale. `checks` (ผลตรวจ) still has "การลงนาม GK1 และคำตอบ S1–S12: รอคุณ", though the owner answered S1–S12 on 2026-10-28 (section 5); `notes` (สิ่งที่ควรรู้) still say that KPI-07 is being checked and that the Thai S1–S12 sheet is being prepared; `done` still calls the re-plan not approved and counts 42 hand-off rows with no owner. Bring `pr182` to the pushed head first: `head`; `checks`: S1–S12 answered on 2026-10-28, the KPI-07 write-up and the S9 rows added, HU-6 and GK1 items 1–2 still waiting; `notes` and `done` to match. There is no card for #181, nor for the records PRs #178 and #180. Write `pr181` in the shape of `pr174`, a merged records-PR card: `title`, `number`, `url`, `state`, `head`, `meta`, `done` (ทำอะไรไป, a list), `checks` (a list of `{ok, text}`), `notes`, `order` and `updatedAt`, and `mergedSha` once merged. `decisions` has no entry for #181 or #182.
- **GK1 readiness doc** (https://claude.ai/artifact/W7gdsqt2UVFZDYyKExqKcK): the owner's GK1 readiness report, in Thai, a Claude Docs page shared in chat, where GK1 decisions 1–7 were asked. The owner answered them in chat (DECISIONS, "Decided 2026-10-23 and 2026-10-24", `DECISIONS.md:336`, and "Decided 2026-10-26", `:350`). The owner may comment there: the K2 session should watch it for comments and answer there.
- Section 14 has the steps to finish GK1, Appendix A the HU-6 record template and Appendix B the owner's Thai guide. Section 15 has R4.1's branch.

## 7. K2's work

### 7.1 The work list and its order

Build the list from these, in this order of authority (DECISIONS wins over a draft):
1. **S05's K2 row** (`plan/S05-structure-waves-gates.md:76`): R2.1r, R2.2r, R2.3s2 (K2–K3), R2.5, R2.6; EQ-3, EQ-4, EQ-5, EQ-6, EQ-7 (K2–K5), EQ-9 (early K2), EQ-10, EQ-11, EQ-12 (K2–K3); FX-4, FX-6; ED-ASSESS-1; set C (C-K2). 46 PRs start in K2, 66.4 in the wave. Exit: GK2 and "R2 complete", with "D-3/D-4 ตัดสินแล้ว" (D-3/D-4 decided; the owner answered them on 2026-10-05, `DECISIONS.md:66`). Package details: `plan/data/packages.tsv` and `registry.tsv`; item details: `assignment.tsv`.
2. **What moved from K1** (K1-retro (#182), "Item 3"; PROGRESS (#182), row "Re-plan at GK1"): 41.6 plan PRs.
   - Started packages (27.3): R0.4 8 (M-PLATFORM-041, M-PLAN-018, M-BUILD-024, M-PLAN-010, M-PHYSICS-003, M-PLAN-003, M-PHYSICS-060, M-PLAN-002, M-PLAN-004, M-BUILD-025); R1.6 4 (PR5 M-PLATFORM-007, PR8, PR9, PR10); CO-4 4 (steps 2, 4a, 4b, 5); FX-1 3 (M-BUILD-029); R7.1 2.14; FX-2 2 (M-LEARNING-002, 003); ED-LES-1 1.5; FX-5 1 (M-LAUNCH-035); ED-I18N-1 1 (M-LEARNING-030); ED-INST-1 0.67.
   - Unstarted packages (14.3): I-HOOKS 3; EQ-2 2.5; R4.1 2.33 (`claude/pd-r41-s1` first, after GK1, section 10); HU-2 and HU-3 0.67 each; HU-6 0.25; R7.2–R7.5 4.86.
   - Outside `pr_estimate`: the ISS sky-step fix (hand-off K1-33; P4, `DECISIONS.md:368` @5092ac9); the R0.2r and R0.3r follow-ups; the G1+ fixture tests (at least 3 small PRs, an agent count).
   - Already in K2 before GK1: CO-4 steps 6, 9, 10 (card `q05` B, `PROGRESS.md:125`); card `q09` A (decision 5, `DECISIONS.md:355`); FX-7 steps 1–3 (K1-retro, "By package").
   - K2 becomes 103.7 plan PRs (146.0 on the ×1.49 basis): 29.9 working days at 3.46 a day (42.2), against K2's timebox of 15–20 (`plan/S05-structure-waves-gates.md:296`).
3. **The order the re-plan row sets inside K2** (PROGRESS (#182), row "Re-plan at GK1", "Moved to K2, G0" and "G1+"): M-PLATFORM-041 with the 8a server first (K2's opening, lane T's first PR); M-PLAN-018 kits 3a, 3c and 3d at K2's opening, before the EQ-6 window and R1.6 PR5; kit 3b before EQ-2 PR1; M-PLAN-010 before EQ-9; M-PHYSICS-003 before EQ-10; M-PLAN-003 before R3.0 and EQ-2 PR1's memory peak; M-PLAN-002 and M-PLAN-004 before the GK2 KPI row; M-PHYSICS-060 by Day 85 (section 11); M-BUILD-024 and M-BUILD-025 before K3; R1.6 PR5 after M-PLATFORM-041 and kit 3c, before R2.3s2 PR2 and FX-2 M-LEARNING-003 path 1; R1.6 PR8–PR10 by GK2.
4. **When more lanes are ready than slots** (`plan/S05-structure-waves-gates.md:318`): (1) the critical path (CO-4/GCO, the P harness and bisect, R4.2-S before the year-end break; that deadline lapsed with S11, DECISIONS (#182), S11 row); (2) data safety per D-63 (R1.6, FX-2, FX-1, FX-8); (3) oracles and EQ; (4) the rest, with the label and false-result bugs of R3+ (M-PLAN-028, M-BUILD-015, M-BUILD-009) first.

### 7.2 The EQ-6 window (S6)

`plan/S05-structure-waves-gates.md:325`: K2 days 1–2; before it opens, FX-2 (M-LEARNING-027) and ED-I18N-1 merged; during it, no other PR touches `src/i18n/**`; fallback, the first two working days with no i18n PR open. FX-2's part is done (#176, #177). On S6 the owner chose option (ก) (2026-10-28T02:59:22Z): K2 days 1–2 kept, each EQ-6 PR carries its own oracle (draft S09 rule 7), and M-LEARNING-030 does not hold the window, which departs from `S05:325`'s text (DECISIONS (#182), S6 row; PROGRESS (#182), row "Re-plan at GK1", "Windows"). The merge hold (section 1) applies to EQ-6 PRs too.

- **Which days are K2 days 1–2 is open.** `S05:325` puts them at Day 16–17 ("ตัวอย่าง 26–27 ต.ค.", for example 26–27 Oct). Those days passed under the merge hold, before K2 was authorized (2026-10-28T02:54:22Z), and no later date is recorded. `S05:325`'s fallback is "เลื่อนเป็นวันทำการ 2 วันแรกที่ไม่มี PR i18n ค้าง" (the first two working days with no i18n PR open). Proposal, not an owner answer: K2 days 1–2 are the first two working days after the hold ends with no i18n PR open. Section 14, step 0, puts it to the owner.
- **Not asked: EQ-6 PR1.** The re-plan row's text, as written when the owner answered S3, has the window open once "EQ-6 PR1 (the worker path) is merged". S6's option (ข), which the owner did not choose, waited for "kits 3a, 3c and 3d and EQ-6 PR1"; option (ก) does not mention EQ-6 PR1. Whether EQ-6 PR1 must merge before the window was not asked (PROGRESS (#182), row "Re-plan at GK1", "Windows", and the note after it).

### 7.3 The teaching tools stay held (S4)

- `src/ui/held.ts:9`: `export const TEACHER_TOOLS = false as boolean;`. The file quotes the owner's request of 2026-10-17 (`:3`).
- Six journeys are held and not run while it is false (`tests/browser/held.mjs`): `case-worksheet-exports`, `classroom-preparation`, `fx2-design-check-focus`, `instructor-loading`, `lesson-packs`, `recheck`. Four more skip their teacher steps: `mobile-smoke`, `profile-session-safety`, `workspace-navigation`, `r7-cross-system` (GK1-held-journeys (#182)).
- On S4 the owner chose option (ข), "ข พักต่อ ตรวจ G0 บนบิลด์ครู (แนะนำ)" (2026-10-28T02:59:22Z): still held in K2; the G0 oracles that need held journeys (`recheck` for EO-XENG-1's browser half, `case-worksheet-exports` for EO-EXP-1, the journey list for EO-UI-4) run once on a local teaching-tools build that is not committed, as decision 7 did; no ceiling raise.
- A teaching-tools build of `7263004` is over two ceilings: `index-*.js` +0.5 kB and precache code +0.6 kB (GK1-held-journeys (#182), "The size budget"; local run, not committed).

### 7.4 The owner's cards from S7

S7's option (ก) puts on a card only the owner's items: HU-1's Q-1…Q-8 (hand-off K0-31, `reports/HU-1-protocol-prep.md:72-79`), K0-13, K1-24, K1-38 and K1-62. HU-1's Q-1…Q-8 hold back HU-1 step 2, before the November student session (GK1-handoffs (#182), K0-31). The bug-fix, UI and performance questions of K1-08, K1-59, K1-72, K1-76 and K1-96 go to their proposed lanes.

The K2 session has asked them, and the owner has answered. The words below are the labels the owner chose, as the K2 session's form results show them (checked by the GK1 session against that session's transcript events); the times are those of the results:
- 03:19:14Z: Q-1 (seven tasks take about 60 min against a 50-min frame) "ข ทำครบเจ็ดโจทย์" (not the recommended option, which was "ก สลับ T03/T06 (แนะนำ)"); Q-2 (KPI-23's unit) "ก รายโจทย์ (แนะนำ)"; Q-3 (KPI-24's task) "ค รายงานทั้งสอง (แนะนำ)"; Q-4 (the micro-quiz) "ก ข้อเดียวกัน 3–5 ข้อ (แนะนำ)".
- 03:25:02Z: Q-5 "ค คง ≥ 2 คน + ทดสอบเพิ่ม (แนะนำ)"; Q-6 "ก ไม่ใช้ (แนะนำ)"; Q-7 "ก ตอนตรึงโปรโตคอล (แนะนำ)"; Q-8 "ก ชุดเดียวกัน (แนะนำ)".
- 03:28:43Z: K0-13 "ก ไม่ต้อง ปิดแถว (แนะนำ)"; K1-24 "ก คงไว้ (แนะนำ)"; K1-38 "ก ใส่ใน HU-3 (แนะนำ)"; K1-62 "ก คงไว้ (แนะนำ)".
- 03:29:17Z, the K2 session's follow-up on Q-2 after Q-1 (ข) (does "per task, only the tasks everyone does" now mean all seven?): "ก ใช่ ทั้งเจ็ดโจทย์ (แนะนำ)".

They are in DECISIONS (#182), "Decided 2026-10-28", the table "The S7 card, asked by the K2 session", with each question and its options, and at the end of the last column of GK1-handoffs (#182) rows K0-31, K0-13, K1-24, K1-38 and K1-62, as the GK1 session told the K2 session at 03:29:56Z. They reach main with #182.

### 7.5 The two docs PRs the K2 session prepares

Both cite DECISIONS rows that land with #182, so they stay drafts until #182 merges. Neither is a records PR in S18:207's sense (section 1). In its message queued at 2026-10-28T04:34:00Z the K2 session named its branches `claude/i-r75-s1` (R7.5, S10 and S11; its earlier message, about 03:29Z, called it `claude/k2-r75-docs`) and `claude/k2-plan-adopt` (the sections copy), both local, not pushed or opened. It counts both as lane I code PRs, since they touch `.tsv` files, so only one opens at a time. Neither was on origin at 2026-10-28T03:50Z (`git ls-remote`).

1. **The one docs PR of S10, with S11's lines** (DECISIONS (#182), S10 row and the second S11 follow-up row). The S10 edits are the ones listed, and no others. The S11 lines are those in the scope of the follow-up's option, verbatim "แก้เฉพาะบรรทัดเรื่องพักปลายปีและวันประตู" (only the year-end-break and gate-date lines); the S11 item below lists the ones the GK1 session found, and the option's words, not the list, set the scope:
   - `plan/data/packages.tsv`;
   - `plan/S05-structure-waves-gates.md:306` (the mean lead time, 7.87 h, in place of the median) and `:361` (machine times: Pages about 33 min, the fleet about 60 min);
   - the wave column of the moved items in `registry.tsv` and `assignment.tsv`;
   - the re-estimates of R4.1, R4.2, R4.3, R4.4, R4.5, R4.7 and R8 (16 items placed with no `pr_estimate` change; K1-retro, "Item 4");
   - the five rules, into S18 §18.6 or SESSION-PROTOCOL;
   - `plan/S18-execution-model.md:207` and `:264`, which still name `push` (`q02`);
   - from S11: S05's break rows (`:78`, `:328`, `:387`), the Day N text (`:69`, `:359`), the G4-S deadline (`:174`, `:370`), the other lines that tie R4.2-S or G4-S to the break (`:77`, `:318`, `:371`), the gate dates of §05.9's table (`:365`–`:376`) and Day 85's date (`:386`; which date governs is open, section 11), and draft S13's R4.2-S deadline (`S13-r4-vehicle-realism.md:16`, `:289`, `:500` at `c2af8ae`).

   The rest of R7.5 stays not authorized (D-65; DECISIONS (#182), S10 row).
2. **The plan copy.** K2's sections S04, S07, S08 set C, S09, S10, S11, S13, S16 and S17, from `docs/development/plan-v2-draft/sections/` at `c2af8ae` (branch `claude/hopeful-allen-1o0vmh`), into `docs/development/plan/`, as CO-8 step 2 did for K0–K1 (DECISIONS (#182), the S1 items 4–5 row). The question adopted the drafts "with the decisions that changed them since"; kpi-GK1 (#182), "For the owner: K2's plan sections", lists them per section.

## 8. Size budgets on the candidate

From Pages 40385448079's `build` job (121793105792), `node scripts/bundle-budget.mjs`, under the ceilings #179 lowered (kpi-GK1 (#182), "D-38: the K1 allowance used"). Byte room from `reports/GK1-ceilings-q03-1.md:71`, measured on `a05ae70`, whose code equals the candidate's (kpi-GK1, KPI-03).

| Group | Size (kB) | Ceiling | Room |
|---|---|---|---|
| precache code | 14 653.8 | 14 654 | **174 B**. Every JS and CSS file (34) is precached, so this caps every group below |
| `index-*.js` | 2 634.8 | 2 635 | 197 B, capped at 174 B |
| `i18n-*.js` | 1 729.0 | 1 729 | **9 B** |
| other chunks | 771.4 | 772 | 583 B, capped at 174 B |
| `index-*.css` | 176.9 | 177 | 138 B |
| precache (total) | 15 779.3 (`data/` 1 125.5, refreshed) | 16 053 | 273.7 kB |

- Any PR that adds bytes to these groups needs an offset or a D-38 raise from the owner (`GK1-ceilings-q03-1.md:71`).
- The named offsets have not landed: EQ-6 (K2), EQ-7 (K2–K5), EQ-8 (K3) (kpi-GK1, KPI-30).
- Known pending growth: the teaching tools about +1 kB (section 7.3); R4.1's branch about +511 B (sections 10 and 15); D-36.A3 step 1, +7.1 kB of code when last measured (section 10).
- No compressed-size ceilings: P5, "ก ไม่ตั้งตอนนี้ (แนะนำ)" (2026-10-26T19:24:06Z; `DECISIONS.md:369` @5092ac9).

## 9. D-64: when a heavy or fleet run can be reused

- **Rule.** `DECISIONS.md:60`: reuse a green long run when the physics files are unchanged, for heavy and fleet runs only.
- **The list** (`reports/CO-6-physics-baseline.md:42-66`): `src/physics`, `src/data`, `tests/heavy`, `tests/sixdof-fleet`, `package-lock.json`, the 12 worker files `src/design/requirement-trades.worker.ts`, `src/lessons/recheck.worker.ts`, `src/orbit/lifetime-altitude.worker.ts`, `src/orbit/reentry.worker.ts`, `src/orbit/screening.worker.ts`, `src/physics/attitude-tune.worker.ts`, `src/physics/lifetime.worker.ts`, `src/physics/monte-carlo.worker.ts`, `src/physics/tune.worker.ts`, `src/session/flight.worker.ts`, `src/ui/build/ratings.worker.ts`, `src/ui/build/readiness.worker.ts`, and the Node version (22.23.3, pinned in `.github/workflows/heavy.yml` at lines 42, 86, 115 and 145; kpi-GK1, KPI-22).
- **At `7263004`** the list's SHA-256 is `60cd7caa215dbf5931e3530f602655fab5a815e330dea24e0430b82870b06310`, the same as at `408ad16` and `3644749` (kpi-GK1 (#182), KPI-22; recomputed with the command in section 13 on 2026-10-28).
- **Runs that stand for `7263004`:** heavy [40240193599](https://github.com/ROYIN001/Orbitlab/actions/runs/40240193599) at `408ad16` (33/33 jobs, coverage 257/257) and fleet [40144277552](https://github.com/ROYIN001/Orbitlab/actions/runs/40144277552) at `3644749` (6/6 jobs, coverage 164/164).
- **What changes it.** A PR that touches a listed path, or the Node version (M-PHYSICS-060's move to Node 24), needs fresh heavy and fleet runs on the main it lands on. R4.1's branch touches `src/physics` and `src/data` (section 10).

## 10. Branches parked

Checked with `git ls-remote origin`, 2026-10-28T03:50Z.

| Branch, tip | What | State, and what it waits for |
|---|---|---|
| `claude/pd-r41-s1`, `e777aae` | R4.1, M-PHYSICS-041 / M-PLATFORM-070: the stale "slosh and structural flexibility omitted" text in `src/physics/rigid/vehicle-data.ts` and Vulcan's guidance comment in `src/data/vehicles.ts`, with the failing-first test `tests/rigid-data-assumptions.test.ts` (`HANDOVER-K1.md:118`) | The last of R4.1's eight PRs in draft S13 §13.3 (order 040a → 040b → 049a/b → 043a → 043b → 048 → 041, `S13-r4-vehicle-realism.md:280` at `c2af8ae`); no branch or PR exists for the other seven. The second commit is marked WIP and "not ready"; neither commit is reviewed; no PR. **After GK1**: P4, "ก ไม่เพิ่ม (แนะนำ)" (2026-10-26T19:23:19Z; `DECISIONS.md:368` @5092ac9), and card `q10` A; the re-plan lists it first in R4.1's K2 share. It touches D-64 paths (section 9). **Size:** the new text adds about 73 B to each of 7 chunks (`index` and six workers), about +511 B of precache code against 174 B of room, about 337 B over; an estimate from an existing build of `7263004`, not a new build (GK1 session's notes, local, not committed). A rebase onto `7263004` was clean, with the same patch-id, but it was local only and is not pushed: rebase again before a PR (section 15). |
| `claude/i-co4-d36a3-s1`, `f286b8b` | D-36.A3 step 1: in-flight edits with a confirm step (`HANDOVER-K1.md:116`) | Moved to K2 by the owner (card `r16-pr2-budget`, option b, 2026-10-06T17:03:41Z; `DECISIONS.md:153`). When last measured it was CSS +0.2 kB over and code +7.1 kB; not reviewed against current main. |
| `claude/t-fx8-s2`, `071db68`; `claude/t-fx8-picture-moment-s1`, `0ac5ca4` | Card `q01`'s branches; `q01` is cancelled (decision 5, `DECISIONS.md:355`) | The owner deletes them: S12, "ก คุณลบทั้งสอง branch เอง (แนะนำ)" (2026-10-28T03:04:38Z). Both still on origin. Do not touch them. Until they go, 3 follow-through checks keep failing (GK1-followthrough (#182), B1 and G2). |

## 11. The calendar and the gate dates (S11)

- **The owner's calendar.** On S11 the owner typed "ไม่พัก" (2026-10-28T03:04:38Z), and on the follow-up chose "ก ไม่ข้ามวันหยุดด้วย (แนะนำ)" (03:07:38Z). As recorded (DECISIONS (#182), the S11 rows): no year-end break; Day N counts on through 21 Dec 2026 – 1 Jan 2027; merges and publishes go on as usual; every Monday to Friday counts from 2026-10-26 on; 13 and 23 Oct, already past, stay skipped; R4.2-S's "merge before the break" deadline lapses (`S05:174`, `:370`).
- **Gate dates.** Day 1 = 2026-10-05; Day = 13 + ceil(remaining plan PRs up to that gate ÷ 3.46) (K1-retro (#182), "Gate dates recomputed" and "On the owner's calendar (S11, 2026-10-28)"; local run, not committed):

| Gate | Plan basis: Day, date | ×1.49 basis: Day, date | On the freeze calendar (skipped 21 Dec – 1 Jan), plan / ×1.49 |
|---|---|---|---|
| GK1 | D26, 2026-11-11 | D29, 2026-11-16 | same |
| GK2 | D43, 2026-12-04 | D56, 2026-12-23 | 2026-12-04 / 2027-01-06 |
| GK3 | D65, 2027-01-05 | D88, 2027-02-05 | 2027-01-19 / 2027-02-19 |
| GK4 | D91, 2027-02-10 | D127, 2027-04-01 | 2027-02-24 / 2027-04-15 |
| GK5 | D101, 2027-02-24 | D142, 2027-04-22 | 2027-03-10 / 2027-05-06 |
| GK6 | D114, 2027-03-15 | D160, 2027-05-18 | 2027-03-29 / 2027-06-01 |

- **Day 85**, the Node 24 deadline (M-PHYSICS-060): 2027-02-02 on the owner's calendar (2027-02-16 on the freeze calendar).
- **At the post-9-Oct rate** (0.78 plan PRs a day) GK6 would fall in 2028–2029 (K1-retro, "Sensitivity").
- **What the owner was shown.** The S11 follow-up form showed GK6 17 Mar / 24 May 2027, computed on the older `c5da5bb` basis. The record uses the freeze basis (GK6 2027-03-15 / 2027-05-18). The shift, 10 working days, is the same on both, and DECISIONS notes the difference (S11 follow-up row). At 2026-10-28T03:14:14Z the GK1 session's chat message told the owner that the follow-up's dates used an older calculation and that the record uses the newer one, with the freeze-basis dates of GK3 (5 Jan 2027 / 5 Feb 2027) and GK6 (15 Mar 2027 / 18 May 2027), and that Day 85 moves from 16 Feb to 2 Feb 2027. GK2, GK4 and GK5 on the freeze basis were not shown to the owner.
- **Not asked: which governs Day 85.** `S05:386` gives Day 85 as "≈ 2027-02-12" and says "ยึดวันที่ ไม่ใช่ GK" (fix the date, not the gate). The S3 form showed "Day 85 (16 ก.พ. 2027)". The record reads Day 85 on its own calendar, 2027-02-02; whether the fixed date or the Day count governs was never asked (DECISIONS (#182), S3 row). `DECISIONS.md:66` (D-3/D-4) has "by GK2" in its last column (K1-retro, "Item 4").

## 12. Not settled, and known gaps

- **GK1 items 1–2 and HU-6** (sections 4 and 14).
- **Finishing GK1:** the steps are in section 14, the HU-6 record template in Appendix A and the owner's Thai HU-6 guide in Appendix B; the HU-6 report's file name is `HU-6-GK1.md` (section 14, step 2).
- **The package register.** The K2 package rows in PROGRESS (EQ-3…, R2.x, FX-4/6 and others) still read "Not authorized (D-65)", and the intro still says "Adopted for K0–K1". #182 does not change them, and a note above the register (PROGRESS (#182), "K2's authorization (2026-10-28)") says so; a later records PR brings them to the owner's answer "รับรองและอนุญาต K2" (2026-10-28T02:54:22Z). R7.5's row (#182) records the one docs PR of S10 with S11's lines and leaves the rest of R7.5 not authorized.
- **GK item 12** stays "not done (at the freeze)" in kpi-GK1's table, with the owner's answer in its last column; the count 4 / 7 / 1 is unchanged.
- **KPI-07**: where the rest of run 3's time goes, why only chrome-headless-shell shows the Home-cue effect, and what devices see are not known; 1–3 runs per cell. The K2 re-measure stands: M-PLATFORM-041 on main, `5f9aa2e` and the current main on one host and one binary, at least 5 runs each, `measure.mjs --compare` (kpi-GK1, "Large trend changes").
- **KPI-31**: the fragment template fix in `changes/README.md` is K2 work (S8's KPI-31 answer).
- **The follow-through before K1** (D-1…D-28, the 2026-10-05 sheets and the seven historical cases of draft S08 §08.6 item 3) had a quick check only. Proposed: lane I in K2, no later than the GK2 record (kpi-GK1, "Carried into K2"). It is one of the variances of S8, on which the owner answered "ก รับทราบทั้งหมด ไม่ย้อนแก้ (แนะนำ)" (2026-10-28T03:03:21Z).
- **The S11 dates** and **Day 85** (section 11).
- **Hand-offs:** 42 rows had no owner at the freeze; the owner's S7 answer accepts the 39 proposed lanes as those rows' owners. The owner's never-asked items are in section 7.4; the bug, UI and performance questions went to their lanes. K1-52 (`exportAll()`'s double read) goes with R1.6 PR5 in lane L (DECISIONS (#182), S7 row).
- **Two open K2 items from the adopted K2 sections, for the K2 session to own.** The K2 session's checkers found them (its message queued at 2026-10-28T04:34:00Z). They come from the plan sections, not from K0 or K1 reports, and GK1-handoffs tracks report hand-offs only, so they have no row there.
  - (a) Draft S10 §10.3.1 (`S10-r16-fx-data-safety.md:204` at `c2af8ae`, the `MissionDocument.design` row, item 4, "ข้อจำกัดที่รู้แล้ว"): a build before #80 reads a mission document that has `design`, but drops `design` silently when it saves the mission again, and an old PWA tab that has not updated can still do so. S10 asks for the limit to be recorded in the registry and in R0.2r's Handoff ADR. `docs/development/adr/handoff.md` does not name it.
  - (b) Draft S16 §16.8 item 4 (`S16-ed-hu.md:545` at `c2af8ae`) proposes moving ED-INST-2's pilot (056) out of K5, which falls in the second-term exams, to Jan 2027 or May–Jun 2027. `plan/S05-structure-waves-gates.md:80` still puts ED-INST-2 in K5.

## 13. Commands

```
npm ci                                   # once
npm run -s typecheck
npx vitest run <files>                   # the full suite runs on CI
npx vitest run tests/repo-hygiene.test.ts
npx vite build && node scripts/bundle-budget.mjs
node scripts/verification/select-checks.mjs origin/main..HEAD
FONTCONFIG_FILE=<fonts.conf> CHROMIUM=/opt/pw-browsers/chromium node tests/browser/run.mjs <journey>

# D-64 list hash at a commit C (60cd7caa…6310 at 7263004)
C=7263004; { for p in src/physics src/data tests/heavy tests/sixdof-fleet package-lock.json \
  src/design/requirement-trades.worker.ts src/lessons/recheck.worker.ts src/orbit/lifetime-altitude.worker.ts \
  src/orbit/reentry.worker.ts src/orbit/screening.worker.ts src/physics/attitude-tune.worker.ts \
  src/physics/lifetime.worker.ts src/physics/monte-carlo.worker.ts src/physics/tune.worker.ts \
  src/session/flight.worker.ts src/ui/build/ratings.worker.ts src/ui/build/readiness.worker.ts; \
  do echo "$p $(git rev-parse $C:$p)"; done; echo "node 22.23.3"; } | sha256sum
```

## 14. Finishing GK1 after the owner's HU-6 session

The K2 session owns these steps (section 6). They restate the merge hold H1–H5 and steps 7–9 of the GK1 session's freeze runbook (local run, not committed; not reachable from the K2 session), for the new owner, with the steps already done dropped. Each step names its source. Nothing here is decided for the owner (`SESSION-PROTOCOL.md` §2, "Decisions": no agent writes "decided" or "accepted" in the owner's place). Line numbers in #182's files are as pushed with this file; they move as you edit.

**The owner's sign-off sheet**, cited below, is the Thai sheet "แผ่นลงนาม GK1" that the GK1 session sent as a file in its chat on 2026-10-27T22:48:29Z, with the caption "แผ่นลงนาม GK1 (ภาษาไทย): สรุปสถานะ GK1 และคำถาม S1–S12 พร้อมคำแนะนำ บันทึกฉบับเต็มอยู่ใน PR #182 ต่อจากนี้ผมจะถามทีละชุดในแชต". It was last changed at 21:17:23Z, before it was sent (local, not committed). The owner did not fill it in: the owner answered the chat forms that followed it (DECISIONS (#182), "Decided 2026-10-28"), and where the two differ the forms hold the owner's answer. For example, the sheet's S1 (ก) read "การ์ดใบเดียว (เรื่อง 3–5 ตอนนี้ เรื่อง 1–2 หลัง HU-6 และ Q check)", and the form's (ก), which the owner chose, read "ตอบสองรอบ". The steps use what the sheet told the owner and the forms did not: under "ต้องรอหลัง HU-6", "การ merge บันทึก GK1 (และ #181) และการลงนาม GK1 เพราะบันทึกต้องมีผล HU-6 ก่อน และต้องผ่าน Q check ก่อน"; in its answer table, "merge PR บันทึก GK1 (และ #181)" and "ลงนาม GK1: G0 และ G1+ ไม่ผ่าน พร้อมคำตอบ S2 และ S8", each with "ไม่มี (คุณตัดสินเอง)" as the recommendation and "หลัง HU-6 จบ และหลัง Q check" as the time; "แม้คุณอนุญาต K2 ก่อน HU-6 จบ งานของ K2 ก็ยัง merge ไม่ได้จนกว่า HU-6 จบ"; and, on #179's fold, "นับตอน merge เหมือน #180". These are the agent's sheet, not the owner's words.

### 14.1 The hold until the session ends (runbook H1–H5)

- **H2 is in force.** No merge of any kind, Markdown included, until the owner's HU-6 session ends, or until the owner says there will be no session (step 8). Then #181 first and #182 second (step 5). Why: `deploy.yml` publishes only main's tip (`.github/workflows/deploy.yml:42-46`, `:289-296`); a Markdown-only push starts no Pages run (`:8-13`), and the daily refresh (`:14-15`, cron `43 17 * * *`, which can start hours late) then deploys main's tip; the build stamp is `git rev-parse --short HEAD` of the built commit (`vite.config.ts:18-26`). So any merge changes the stamp the owner checks in HU-6 (expected `v0.1.0 · 7263004`). While main stays `7263004`, a refresh rebuilds the same SHA and the stamp stays (Pages 40407713039 did so on 2026-10-26; kpi-GK1 (#182), "Candidate").
- **When the session ends.** The guide has the owner start the results with the line "HU-6 เสร็จ" (Appendix B, "ส่งผลกลับ" step 4). The session ends when the owner's results cover both devices, or when the owner says that a device will not be done (that device's slots then follow step 8). If results come one device at a time, H2 holds until both are in. Ask the owner when it is unclear.
- **H3: if a merge lands anyway** before or during the session (call the new tip `T`). The next refresh deploys `T`. Before the owner starts, wait for that refresh's `deploy-pages`, give the owner `T`'s short SHA as the stamp to expect (the guide's "รอรุ่นทดสอบ" step 2 tells the owner to use the code in the agent's message; Appendix B), and record `git diff --quiet 7263004 T -- . ':!*.md' && echo "T = 7263004 outside *.md"`. Add a variance, and revisit GK item 1, which kpi-GK1 (#182), "GK checklist", rates "pass (holds while main is `7263004`)". If the session has begun, record which stamp each device saw.
- **H1, H4 and H5 are done or overtaken.** H1: #177's fold merged before #179, as #180, on time (kpi-GK1 (#182), KPI-31). H4 did not apply. H5, #179's own fold: it is in #181 (opened 2026-10-26T21:35:56Z), which H2 holds, so the fold is late (step 7).

### 14.2 The steps

0. **Ask the owner about the session, before anything else.** Sources: section 4 (no date recorded; the timing question was closed by a restart on 2026-10-26 and not asked again, K1-retro (#182) `:385`); Appendix B, "ส่งผลกลับ" step 2 (it names the GK1 session's chat); the G7 item 2 slot (kpi-GK1 (#182) `:132`) and the runbook's step 8 checklist ("whether it offered the new version as a reload and showed the new stamp after"), for which the guide's result sheet has no field; section 7.2 (K2 days 1–2).
   - H2 holds every merge, K2's included, until the session ends, and nothing records when that will be. Send the owner a short message in Thai in the K2 session's chat, for example:

     > เรื่อง session HU-6 บนเครื่องจริง (รุ่น `7263004` ที่อยู่บนเว็บตอนนี้)
     > 1. เมื่อทำเสร็จ ส่งผลใน chat นี้ (session "OrbitLab wave K2") ไม่ใช่ใน session เดิมที่คู่มือเขียนไว้ บรรทัดแรกเขียนว่า "HU-6 เสร็จ" พร้อมวันที่และเวลา แล้วตามด้วยใบผล ภาพหน้าจอ และไฟล์ CSV ของข้อ 12 (ถ้าสะดวก)
     > 2. ตั้งใจจะทำวันไหน และทำ Android กับ iPad ในวันเดียวกันไหม
     > 3. ระหว่างนี้ยังไม่ merge อะไรเลย รวมถึงงานของ K2 จนกว่าผลของทั้งสองเครื่องจะมาถึง หรือคุณบอกว่าเครื่องไหนจะไม่ทำ หรือบอกว่าจะไม่มี session HU-6
     > 4. ตอนตรวจรหัสรุ่น ถ้าแถบล่าง "Orbitlab รุ่นใหม่พร้อมใช้งานแล้ว" ขึ้น ช่วยจดว่าขึ้นบนเครื่องไหน และหลังกด "โหลดใหม่" หน้า "เกี่ยวกับ" แสดงรหัสอะไร ใบผลไม่มีช่องนี้ เขียนในส่วน ง ได้
     > 5. หน้าต่าง EQ-6 ("K2 วันที่ 1–2" ตามคำตอบ S6 ของคุณ) แผนเขียนไว้ตรงกับ 26–27 ต.ค. ซึ่งผ่านไปแล้วระหว่างที่ยังไม่ merge อะไร ข้อเสนอคือใช้ 2 วันทำการแรกหลังเริ่ม merge ได้อีกครั้งที่ไม่มี PR ภาษาค้าง ตามทางสำรองที่แผนเขียนไว้ ถ้าต้องการแบบอื่นบอกได้

   - Record the owner's words and times as they come: the answer on K2 days 1–2 in DECISIONS (in #182's new "Decided <date>" section, step 4, if it comes before that is pushed; otherwise in the next records PR); the planned date in the report (step 2).

1. **What the owner sends back, and the privacy check.** Sources: Appendix B, "ส่งผลกลับ" and "ความเป็นส่วนตัว"; Appendix A, its comment block and "Privacy"; draft S16 (`S16:91`, `:93` at `c2af8ae`).
   - Before the session: check that main is still `7263004` (`git ls-remote origin refs/heads/main`); if not, H3. The owner was told on 2026-10-26 that the candidate is live (the caption in Appendix B), so step 0's message is the only one to send unless H3 applies.
   - The owner sends, per the guide: a first line "HU-6 เสร็จ" with the date and time; the result sheet, parts ก (devices and stamps), ข (results by task), ค (problems) and ง (other comments), typed or photographed; screenshots named like `A-4-1` (A Android or I iPad, the task, the picture's number); and, if convenient, task 12's CSV files. The workspace backup of task 7 stays with the owner.
   - **Where.** The guide says to send it "ใน chat ของ session นี้", the GK1 session's chat, which closes with this hand-over. Step 0 asks the owner to send the results in the K2 session's chat. If they arrive in the GK1 session's chat anyway, read the text with `list_events` on `session_01T45MNvt5Nietq81AceDVPV` (as the GK1 session read the K2 session's form results, section 7.4), and ask the owner to send the screenshots and CSV files again.
   - **Times.** The sheet asks for Thai time ("เวลาไทย"), while the GK1 session wrote times to the owner in UTC+3 (the caption in Appendix B). Record each time as the owner wrote it, with the zone the owner names; convert to UTC only when the zone is clear, and otherwise ask.
   - **Privacy, before writing anything.** Look at the sheet and every screenshot for notifications, account names, personal photos, other learners' names, the learner-profile list, and device identifiers such as an IMEI or a phone number. Write none of them. Record the result under the report's "Privacy" ("none found", or what was left out). The sheet, the screenshots and the CSV files stay outside the repo; the report names screenshots by the owner's ids and says where they are kept. For a CSV the owner sends, count its data rows and columns and label the count "agent's count".
   - Ask the owner about anything unclear. Do not guess (the guide, "ส่งผลกลับ" step 5).

2. **Write the HU-6 report.** Sources: Appendix A (whole, with its comment rules); runbook step 8; draft S16 HU-6 step 1 (`S16:189` at `c2af8ae`); draft S04 item 8 (`S04:37`).
   - **File name: `docs/development/reports/HU-6-GK1.md`.** Use this name everywhere. #182 names the file once, in R7.1-GK1 (#182), "Human evidence: HU-6", row "Report" (`R7.1-GK1.md:256`: `HU-6-GK1-devices.md`, the GK1 record spec's name); change that row in the same commit. The Thai guide names no file.
   - Copy Appendix A between its fences, delete its comment block, and fill only what the owner reported. A cell the owner left empty is "not reported"; a task skipped under "if time" is "not run (optional)"; no result is read off a screenshot the owner did not describe.
   - **Times in the YAML.** `reported_by.chat_message_date` is the UTC time of the owner's "HU-6 เสร็จ" message in the K2 session's transcript, written `YYYY-MM-DDTHH:MM:SSZ`, in place of the template's "<YYYY-MM-DD HH:MM> (Thai time)"; `quote` copies the date and time exactly as the owner wrote them, with the zone the owner names (step 1, "Times").
   - Values that are not the owner's and are already known: Pages 40385448079 published `7263004` (`deploy-pages` 2026-10-26T19:41:58Z; kpi-GK1 (#182), "Candidate"); the guide went to the owner on 2026-10-26 (Appendix B).
   - Docs only. It goes on #182's branch, not in a new PR (#182 holds the records slot, S18:207).

3. **Fill the HU-6 slots in #182.** Found with `grep -rn "waits for the owner's HU-6 session" docs CHANGELOG.md` and `grep -rn "HU-6" docs/development/reports docs/development/PROGRESS.md docs/DECISIONS.md` on #182's branch. The first grep's output is the full list of slots; the table below is a guide to it, and the second grep finds the lines that name HU-6 in other words. Sources: Appendix A, "Where this evidence goes"; kpi-GK1 (#182), "HU-6 slot" ("Fill only from the owner's report. A cell the owner leaves empty stays 'not reported'.").

   | File (#182) | Slots |
   |---|---|
   | `reports/kpi-GK1.md` | Thai summary (`:13`); "Candidate", item "Live" (`:50`); the KPI-32 row (`:121`); "HU-6 slot" (`:123-134`; both columns: date and stamp seen; device class, browser, network, language; KPI-32; the old service worker's reload, G7 item 2; task 12; KPI-08 device rows), and its heading; GK items 1 (`:215`, "HU-6 must cite the same stamp"), 5 (`:219`), 6 (`:220`, "Live needs the About stamp") and 8 (`:222`, the HU-6 link); G7 items 1 (`:285`, the old worker's reload on a real device) and 2 (`:286`); "Carried into K2" (`:329`); "Not verified" (`:354`); `signed:` (`:29`) is step 4's |
   | `reports/R7.1-GK1.md` | Thai summary (`:25`, `:34`); "Left for the GK1 record" (`:90`, the HU-6 link); "Human evidence: HU-6" (`:250-265`): every row, the "Report" row's file name, and the paragraph under the table |
   | `reports/K1-retro.md` | Thai summary (`:41`); `hu6:` (`:60`); "By package" (`:193`); "GK1 under the owner's option (ก)" (`:635`, the state at the cutoff); "Item 3", the line "HU-6 result" that ends in `____` (`:665`); "Risk register", row 2 (`:771`, the old service worker's reload on a real device); "Not measured", the live stamp (`:835`) |
   | `reports/GK1-handoffs.md` | Thai summary (`:17`); `hu6:` (`:35`); the `HU-6:` line (`:79`); "Summary" (`:113`); rows K0-40 (`:188`, the device part), K1-41 (`:238`), K1-78 (`:275`, the HU-6 link) and K1-90 (`:287`, whose "the kit is ready (local, not committed)" can now point to this file's Appendix B); "Waits for the owner's HU-6 session" (`:359-368`); "Not verified or not covered" (`:375`). K1-10 stays open (P3); `signed:` (`:36`) is step 4's |
   | `reports/GK1-followthrough.md` | Thai summary (`:15`); `hu6:` (`:34`); "Summary" (`:87`, `:98`); row B7 (`:138`, R7.1's HU-6 link); rows G5 (`:243`; its kit "(local, not committed)" can point to Appendix B) and G20 (`:258`); "Waits for the owner's HU-6 session" (`:293-298`); `signed:` (`:35`) is step 4's |
   | `reports/revert-drill-GK1.md` | "Owner checks" (`:299`): the old worker's reload on the live site |
   | `PROGRESS.md` | "Updated" (`:3`); row "GK1 (K1 close, records)" (`:115`: "HU-6 waits …" and group G's KPI-32); row "Re-plan at GK1" (`:116`, "Still to come: the HU-6 session", the state when the owner answered S3); register rows HU-6 (`:214`) and R7.1 (`:215`, the HU-6 link); "Variances for GK1", the items "GK1 decision KPIs measured in part" (`:247`, "KPI-32 waits …") and "HU-6 on the candidate not held yet" (`:250`) |
   | `DECISIONS.md` | "Follow-through at GK1": its table is "as checked at GK1 and is not edited" (`:426`), so the row ":356 GK1 decision 6, HU-6; :367 P3" (`:436`) keeps its text, and the HU-6 result goes into the paragraph after the table (`:444`), as the 2026-10-28 answers did |
   | `CHANGELOG.md` | The GK1 line (`:9`: "the HU-6 device session and the GK1 sign-off are still to come") |

   - **KPI-32 depends on HU-6 only** (kpi-GK1 (#182) `:121`: "The owner's HU-6 report only"). Per device: pass or fail from task 2 (and task 13, if run), with "reloaded or tab lost"; a screen lock is recorded apart and is not a KPI-32 failure (Appendix A, "Device readings"). It appears in kpi-GK1 `:121` and `:131`, PROGRESS `:115` (group G) and `:247`, K1-retro `:665` and R7.1-GK1 `:261`.
   - **The old service worker's reload (G7 item 2)** (kpi-GK1 `:132`, `:285`, `:286`; R7.1-GK1 `:262`; K1-retro `:771`; revert-drill-GK1 `:299`): fill it only from what the owner reported for step 0's item 4: whether the bar "Orbitlab รุ่นใหม่พร้อมใช้งานแล้ว" appeared, on which device, and the About stamp after "โหลดใหม่". The guide only tells the owner to press "โหลดใหม่" if the bar appears (Appendix B, "ตรวจว่าเครื่องเปิดรุ่นทดสอบอยู่" step 2), and the result sheet has no field for it. If the owner did not report it, write "not asked in the kit"; do not infer it from part ก's "เคยเปิด" and the stamp.
   - Each filled slot links the report. The Thai summaries change with the English text. The YAML and prose that describe the hold or the state at the record's date ("open, held until the owner's HU-6 session ends"; K1-retro `:635`; PROGRESS `:116`) keep their text and get a link to the report after it. The `signed:` lines are step 4's.
   - Plan files (`plan/data/decisions.tsv` row D-56 and the rest) are not edited here; the owner's S10 answer allows only the listed edits (section 7.5).
   - **Q check.** The count in #182, "Q check: confirmed 2 266 of 2 458 (2026-10-27)" (kpi-GK1 `:230`), covers #182 as at `6122a19`. What was added on 2026-10-28 (the "Decided 2026-10-28" section with the S7 card table, the KPI-07 write-up, the S9 D-38 rows, the edits to PROGRESS, kpi-GK1, K1-retro and the hand-off and follow-through files, and this file) was reviewed in the GK1 session by checker agents that did not write it (owner quotes and times against the transcript, facts, consistency; their findings were fixed; local, not committed), but no claim count was kept, so no "confirmed N of M" covers it. This Q check covers everything #182 has changed since `6122a19` (`git diff 6122a19 HEAD`), the HU-6 additions included: a second agent, a session that did not write them, checks each claim against its primary source, and the HU-6 additions against the owner's report (the five rules, rule 3, section 1). Its result, "Q check: confirmed N of M (<date>)", goes beside the 2026-10-27 one in kpi-GK1's "Gates", naming what each covers, and it is the count the PR body gives (step 5). It is the Q check the sign-off sheet put before items 1–2: "หลัง HU-6 จบ และหลัง Q check".

4. **Ask GK1 item 2, and record it in #182.** Sources: DECISIONS (#182), the S1 row (`:383`), the items 4–5 row (`:384`) and the paragraph that closes "Decided 2026-10-28" (`:422`); the sign-off sheet (above); `SESSION-PROTOCOL.md` §1 and §2.
   - **When:** after step 3's report, slots and Q check (or step 8's variance for no session).
   - **How:** in the K2 session's chat, as a question with options and no recommended option, as S1's items 4–5 were asked ("Asked with no recommendation, as the owner's own decision", DECISIONS (#182) `:384`); the owner may answer in their own words.
   - **The item**, as S1's question showed it (DECISIONS (#182) `:383`): "(2) sign GK1, recording that G0 and G1+ do not pass"; as the sign-off sheet put it: "ลงนาม GK1: G0 และ G1+ ไม่ผ่าน พร้อมคำตอบ S2 และ S8", with "ไม่มี (คุณตัดสินเอง)". Show with it: G0 and G1+ not passed, the owner's option (ก) of 2026-10-24 (`DECISIONS.md:344`); S2, "ก ไม่ทำที่ GK1, v1.0 สิ้น K4 (แนะนำ)" (2026-10-28T02:54:22Z); S8, "ก รับทราบทั้งหมด ไม่ย้อนแก้ (แนะนำ)", and S8's KPI-31 question, "ก variance รายงานสองแบบ (แนะนำ)" (both 03:03:21Z); the HU-6 result, or "no session" (step 8); and step 3's Q check count.
   - **Record** the answer word for word with its time: a new "Decided <date>" section in DECISIONS (#182), after "Decided 2026-10-28", with the question as shown, the owner's words and where it lands. Then: the PROGRESS row "GK1 (K1 close, records)" ("not signed"); the `signed:` lines (kpi-GK1 `:29`, GK1-handoffs `:36`, GK1-followthrough `:35`); in "Follow-through at GK1", the paragraph after the table (`:444`), since the table is not edited (`:426`) and its row ":344 how to close K1" (`:434`) still reads "the HU-6 session, the merge of the GK1 record and the owner's sign-off remain"; the Thai summaries; CHANGELOG `:9`. The paragraph that closes "Decided 2026-10-28" (`:422`: "GK1's items 1 and 2 … are not answered here") stays as it was on that date; the new section follows it. Write "on item 2 the owner answered '…'", never "GK1 signed" in the session's own voice.
   - **KPI-35 at sign-off.** #182 says KPI-35 is re-run at sign-off (kpi-GK1 `:63`: "At sign-off: re-run with the GK1 time and add any question asked after 19:42:02Z"; K1-retro `:368`: "`kpi35.py` is run again with the GK1 time at sign-off"; K1-retro `:873`). The script, `kpi35.py`, and its question set exist only in the GK1 session's scratchpad (local, not committed), so do it by hand from the records:
     - List each question put to the owner after 2026-10-26T19:42:02Z, with its kind (form, card, chat), the time shown, the time answered and the wave it was needed by: the five sign-off forms of 2026-10-27 and 2026-10-28 (S1, S3, items 4–5 and S2; S4–S7; S8, S8's KPI-31 question, S9 and S10; S11 and S12; the two S11 follow-ups; shown and answered times in DECISIONS (#182) `:379`); the S7 card's three forms and the Q-2 follow-up (answer times in the S7 table, `:408-420`; the times shown are not in DECISIONS, so take them from the K2 session's own transcript); step 0's question on K2 days 1–2, if answered; item 2 (this step).
     - Recount: asked, answered, later than the needed-by wave (GK1's close being the time of the owner's item-2 answer), and the asked → decided hours where both times are exact (add the new rows to the n = 11 and give n, median and max, as `:63` does). Items asked before the cutoff keep their values.
     - Say in kpi-GK1 `:63`, K1-retro `:368` and K1-retro `:873` that the sign-off update was made by hand from DECISIONS because the script is not in the repo.
     - If it cannot be done, record "KPI-35 not re-run at sign-off: the script is not in the repo" as a variance in PROGRESS, "Variances for GK1", and change those three lines to say so.
     - Item 1 (step 5) is asked after this recording, so its row goes into the next records PR.
   - **If the owner answers item 1 in the same message**, record item 2 as above. The owner's item 1 answer was then given on a head that the recording changes, so ask item 1 again in step 5 on the final head and say that only the recorded answer changed (`SESSION-PROTOCOL.md` §1 step 3: "If the head changed after the owner pressed, ask the owner again and say what changed").
   - **A hold or a no on item 2:** nothing is written as signed; record the owner's words in #182; #182 stays open, and item 1 waits with it unless the owner says otherwise. H2 ended with the HU-6 session, so K2's merges are no longer held by it: the owner was told that K2's merges wait for HU-6 only ("แม้คุณอนุญาต K2 ก่อน HU-6 จบ งานของ K2 ก็ยัง merge ไม่ได้จนกว่า HU-6 จบ", the sign-off sheet). Say so to the owner when you record the answer. Before #181 and #182 are asked again, bring them up to the new main with a normal merge (not step 5's `-s ours`), and record that main has moved past `7263004`: GK item 1 rates "pass (holds while main is `7263004`)", so this is a variance.
   - Push. Docs only.

5. **Ask GK1 item 1, merge #181 then #182.** Sources: runbook H2 and step 9; `SESSION-PROTOCOL.md` §1 steps 1–4 and the standing approval (`:32`; `DECISIONS.md:157`); DECISIONS (#182), the S1 row (`:383`: items 1 and 2 are "the merge of the GK1 record (#182, stacked on records PR 8, #181) and the GK1 sign-off"); the sign-off sheet ("merge PR บันทึก GK1 (และ #181)", "ไม่มี (คุณตัดสินเอง)").
   - **#181 is part of item 1.** #181 (records PR 8: #179's fold, #179's Merge Desk answer, P1–P5) is Markdown only and records facts, so on its own it could merge under the standing approval, as #178 and #180 did (K1-retro (#182) `:85`). But the standing approval leaves to the owner "anything the plan leaves to the owner" (`SESSION-PROTOCOL.md:32`), and the sheet the owner received put #181 inside item 1, the owner's own decision. So #181 does not merge under the standing approval: item 1 is one question, "merge #181, then #182". (On 2026-10-26T21:36:06Z the GK1 session had written to the owner in chat about #181, "I'll merge it after your session, or you can tell me to merge it now"; the sheet of 2026-10-27 came later.) If the owner says that #181 may merge on its own first, record that answer and follow it.
   - **Rule 3 applies to #181.** #181 merges after the owner's S3 answer (2026-10-28T02:54:22Z) brought in the five rules, so before item 1 is asked, a second agent re-runs the follow-through and hand-off checks #181 touches and confirms its facts on its current head (`5092ac9` unless it changed). #181 had two reviewers on 2026-10-26 whose 11 findings were fixed (the GK1 session's chat, 2026-10-26T21:36:06Z); rule 3's check is a new one.
   - **The cards, before asking.** Bring `pr182` to the head pushed in step 4: `head`; `checks` (ผลตรวจ): step 3's Q check count, CI where it runs, repo hygiene; `notes` (สิ่งที่ควรรู้): the order #181 then #182, and the owner's item 2 answer; `done`; `meta`; `state` `ready`. Write `pr181` in `pr174`'s shape (section 6), with `head` `5092ac9` and `state` `ready`. Say on both that one merge answer covers both PRs, in that order.
   - **Ask** in chat, with the Merge Desk link, as a question with no recommended option: merge #181 at `<head>`, then #182 at `<head>`? The owner may answer with the cards' buttons (`decisions/pr181`, `decisions/pr182`) or in chat (§1 step 4: "An approval typed in chat is valid at any time and weighs the same as the button").
   - **On "merge":**
     1. Mark #181 ready for review (GitHub does not merge a draft). Check that its head is the one the answer covers, and that CI is green where CI runs (CI's path filter skips Markdown; kpi-GK1 (#182), "Candidate"). Squash-merge; never an admin override.
     2. Check main: `git fetch origin && git diff --quiet 5092ac9 origin/main && echo "main = #181's tree"` (true when #181 merged at `5092ac9` onto `7263004`).
     3. Change #182's base to `main` with the pull-request API. Do not delete #181's branch to get there: GitHub retargets a stacked PR on its own only when its base branch is deleted, and the session cannot delete branches (S12's question, DECISIONS (#182) `:398`).
     4. In #182's worktree, when step 2's check holds: `git merge -s ours origin/main`. #182 already holds #181's commit `5092ac9`, and main's tree equals it, so this keeps #182's tree exactly, with no conflict to resolve. Check `git diff --quiet <#182's head before the merge> HEAD && echo "tree unchanged"`. If step 2's check fails (something else is on main), do not use `-s ours`: merge normally, keep both sides, and ask item 1 again on the new head.
     5. Run `git diff --check` and `npx vitest run tests/repo-hygiene.test.ts` (runbook step 9). The `node_modules` symlink is untracked (`.gitignore` matches directories, not symlinks): never `git add -A`. Push, and see CI on the new head.
     6. The head changed only because main was merged in, with no conflict resolved and the tree unchanged, so the owner's answer stands under §1 step 3's exemption ("the earlier approval stands — as long as CI is green on the new head, and the new SHA is written on the card"). Write the new SHA on `pr182`.
     7. Mark #182 ready for review and squash-merge, with CI green on that head (runbook step 9: the PR body gives step 3's "confirmed N of M", has the budget line "unchanged" and lists the docs touched; commit trailers as the session requires; no model name in any file).
     8. Set both cards to `merged`, with `mergedSha`. No Pages run starts for Markdown; the next refresh publishes main's tip (deploy.yml `:8-15`). Do step 7 now.
   - **Item 1's answer and the two merges go into the next records PR**, as #181 records #179's Merge Desk answer (`DECISIONS.md:364` @5092ac9): #182 cannot record its own merge answer without moving its head again. #182 therefore merges still saying that #181 is open (step 7's lines); the next records PR corrects them.
   - **A hold or a no on item 1:** neither PR merges. Record the owner's words in #182 (it is not merging, so its head may move). K2's merges are no longer held by H2, as in step 4, "A hold or a no on item 2"; say so to the owner.

6. **After #182 merges: what unblocks.** The hold ended with the session (step 8 for no session), and the GK1 record is the first merge after it (section 1). Sources: section 1; section 7; P4 (`DECISIONS.md:368` @5092ac9).
   - **K2 merges** go on under the merge rules: the owner's Merge Desk button or chat answer (`SESSION-PROTOCOL.md` §1), the standing approval for bug fixes and records-only PRs, the five rules (section 1; rule 2: a new or changed journey runs 20 times on CI first) and the WIP caps (S18:206-207). Both records slots are free; the next records PR carries item 1's answer, the two merges and #179's late fold (step 7). EQ-6's PRs were under the hold too (section 7.2).
   - **R4.1, `claude/pd-r41-s1`:** "after GK1", P4, "ก ไม่เพิ่ม (แนะนำ)" (2026-10-26T19:23:19Z). Section 15.
   - **The two docs PRs that cite #182's DECISIONS rows** (`claude/i-r75-s1`, `claude/k2-plan-adopt`; section 7.5) can leave draft once main carries those rows, one at a time.
   - **The records PR** that brings PROGRESS's K2 package rows to the owner's "รับรองและอนุญาต K2" (2026-10-28T02:54:22Z; section 12).
   - Not changed by #182: the two `q01` branches are the owner's to delete (S12; section 10); heavy and fleet runs stand only while no D-64 path changes (section 9).

7. **#179's late fold, under KPI-31.** Sources: runbook step 7; `S18:137` (a records PR within one working day after Pages); kpi-GK1 (#182), KPI-31.
   - #179 was published at 2026-10-26T19:41:58Z, so its fold was due by 2026-10-27T19:41:58Z. #181 carries it and H2 holds #181, so the fold is late.
   - What #182 says now: the KPI-31 row, step 2: "#179 waiting, due 2026-10-27T19:41:58Z, carried by #181 (open)" (kpi-GK1 `:61`); GK item 7, "#179's fold is due 2026-10-27T19:41:58Z (#181)" (`:221`); "Carried into K2", "Records" (`:330`); PROGRESS, "Variances for GK1", "HU-6 on the candidate not held yet" (`:250`: "it is late if the session ends after that"); K1-retro, "Records fixed in the GK1 record PR" (`:761`: "In #181, not merged").
   - When #181 merges (step 5), the next records PR writes its `merged_at` and the delay in those places. Counted at merge, as #180 was (the sign-off sheet: "นับตอน merge เหมือน #180"), step 2 then reads 40 on time and 30 late of 70 published PRs (the 29 already late, and #179).

8. **If the owner's HU-6 session cannot happen.** Sources: Appendix A's comment ("If the session did not happen, there is no file; the gap is a variance"); runbook H2 and step 8; kpi-GK1 (#182), "HU-6 slot" ("If the session does not happen, this slot says so and the gap is a variance") and "Carried into K2"; R7.1-GK1 (#182), "Human evidence: HU-6".
   - Only the owner can say there will be no session at GK1. That ends H2 as the session's end would. Record the owner's words and time in DECISIONS.
   - No `HU-6-GK1.md`. Each slot of step 3 says that there was no session at GK1, with the owner's words; "not reported" is only for a cell the owner left empty in a report.
   - A variance in PROGRESS, "Variances for GK1": decision 6 said "at GK1 on the candidate"; it carries to GK2 (kpi-GK1, "Carried into K2"). G7 item 2's live part and GK item 6 stay partial; KPI-32 is "no session"; K1-90, K1-41, K0-40's device part and K1-78's link stay open into GK2; K1-10 stays open (P3).
   - The same holds for one device if the owner says it will not be done: its column says so, and the variance names the device.
   - Then step 3's Q check and steps 4–7. Item 2's question shows the gap.

## 15. R4.1's branch, `claude/pd-r41-s1` (`e777aae`), for after GK1

Source: the GK1 session's R4.1 notes of 2026-10-27 (local run, not committed; not reachable from the K2 session), with `HANDOVER-K1.md` §5 and section 10. That work was git, reading and the check selector only: nothing was built, tested, pushed or merged.

**The two commits.** Base `5055370`; made 2026-10-07 and 2026-10-08; neither reviewed; no PR.

| Commit | What it does |
|---|---|
| `c9cb7e5` | Adds the failing-first test `tests/rigid-data-assumptions.test.ts` (55 lines, 4 tests): (1) the model has slosh and a bending mode, and `resolveFlexOptions(undefined)` is off; (2) no clause of `RIGID_DATA_ASSUMPTIONS` calls slosh or flexibility "omitted"; (3) one clause names slosh and bending, says "off by default" and cites a `rigid/<file>.ts` that exists; (4) some clause still names what the model leaves out. |
| `e777aae` | Its message: "WIP … unfinished — interrupted by the usage limit; not reviewed, not ready (handover)". It holds the fix. In `src/physics/rigid/vehicle-data.ts` the 4th assumption, "Quasi-steady variable mass; internal flow, slosh and structural flexibility omitted." (`:17` on main), becomes two: "Quasi-steady variable mass; internal flow omitted." and "Liquids settled; slosh and first bending mode are a runtime option (P05, rigid/flex.ts), off by default.", with a JSDoc; `RIGID_DATA_REVISION` stays `estimated-components-2026-09-19-v1`. In `src/data/vehicles.ts` it rewrites the comment above Vulcan's `guidanceDefaults` (`:471-496` on main): the old one spoke of an 80 km loft and `KNOWN_GUIDANCE_FAILURES`; the new one gives 40° pitch, a 150 km loft and a 3° kick, says all nine Vulcan fleet rows reach orbit and `KNOWN_GUIDANCE_FAILURES` is empty, that `parkingAltitude: 250e3` is planned but not flown, gives cut-off apsides "measured at 5055370", and points to M-PHYSICS-043 (R4.2). No data value changes. |

**The rebase onto `7263004`: re-do it.** It was clean: both commits applied with no conflict. Main's 56 commits from `5055370` to `7263004` touch none of the three files, nor `rigid/slosh.ts`, `bending.ts`, `flex.ts` or `mass.ts`. `git range-diff` showed `=` for both commits, the patch-id was the same before and after (`084478d1e1db6ac0ae84a2a866da8401e8f88426`), and the three blobs were unchanged: test `a8dcf7c3`, `vehicle-data.ts` `37aba5a1`, `vehicles.ts` `01414cdf`. The rebased branch (`claude/happy-hawking-m71bk1-r41-s1`, commits `ec3d356` and `5cbd3c2`) was local only and is not pushed (local run, not committed; not reachable from the K2 session); `origin/claude/pd-r41-s1` is still `e777aae`. Rebase again on the main of the day:

```
git fetch origin claude/pd-r41-s1 main
git switch -c <branch> origin/claude/pd-r41-s1        # e777aae
git rebase origin/main                                 # expect no conflict
git range-diff 5055370..e777aae origin/main..HEAD      # expect "=" for both commits
git rev-parse HEAD:tests/rigid-data-assumptions.test.ts HEAD:src/physics/rigid/vehicle-data.ts HEAD:src/data/vehicles.ts
                                                       # expect a8dcf7c3…, 37aba5a1…, 01414cdf…
```

The branch name sets the fragment's name: `changes/claude-pd-r41-s1.md` if it ships as `claude/pd-r41-s1`.

**Where it sits in the plan.** Draft S13 §13.3 (`S13-r4-vehicle-realism.md:280` at `c2af8ae`) puts R4.1 in 8 PRs: 040a → 040b → 049a/b → 043a → 043b → 048 → 041. This branch is **step 8 only**, "docs: code text (041 = 070, K3)". `packages.tsv`: R4.1 at K1–K3, 21 agent-days, 7 PRs, `execution_authorized: false`. `assignment.tsv`: M-PHYSICS-041 and M-PLATFORM-070 (alias) open, XS, docs, wave K3. Nothing exists for 040, 043, 048 or 049: no branch, no PR. The re-plan row (PROGRESS (#182), "Re-plan at GK1"; the owner's S3 answer, section 1) lists it first in R4.1's K2 share of 2.33 PRs, after GK1 (card `q10` A; P4).

**Checked on paper against the rebased tree.** `RIGID_DATA_ASSUMPTIONS` matches the shipped model: flex is off by default (`src/types.ts`, `FlexConfig`), `RigidRuntimeOptions.flex` is at `runtime.ts:41`, and the Engineer, six-DOF-only panel is at `src/ui/panel.ts:1586`. Vulcan's data reads `pitchMax: 40, loftAltitude: 150e3, kickAngle: 3` (`vehicles.ts:490` rebased); `KNOWN_GUIDANCE_FAILURES = {}` (`tests/fleet-harness.ts:535`); `docs/PHYSICS.md` "Guidance defects" (`:2254`) gives 2 657 and 2 860 m/s, matching the new "2.7–2.9 km/s". The diff is text, comments and the new test only. Nothing reads the assumptions' content: it rides on snapshots (`mass.ts:416`, `:422`, `:462`), and telemetry and CSV carry only `dataRevision` (`src/ui/csv.ts:39`).

**Not done.** A final message for the WIP commit (keep the failing-first commit separate); showing the test fail at the first commit and pass at the second; EO-PHY-1 (`tests/d01-fleet-fingerprint.test.ts`) and EO-PHY-2 (`tests/heavy/sixdof-fingerprint.test.ts`, `tests/rigid-flex-golden.test.ts`) unchanged; CSV bytes unchanged (EO-EXP-1: its oracle, kit 3d, moved to K2, so only the `csv.ts:39` argument exists); the Vulcan cut-off figures (question 3); a real build and the size check; lane review (P-D owns `src/data/vehicles.ts`, P reads the physics text, Q reads the test; a second agent for physics work, D-25); the `changes/` fragment; the PR and its Merge Desk card.

**Checks it needs** (`node scripts/verification/select-checks.mjs --files src/data/vehicles.ts src/physics/rigid/vehicle-data.ts tests/rigid-data-assumptions.test.ts`): `npm run -s typecheck`, `npx vite build`, `node scripts/bundle-budget.mjs`; the whole unit suite (334 files then, with `d01-fleet-fingerprint`, `d01-vehicles-identity`, `rigid-flex-golden` and the new test); 9 browser journeys: `experiment-notebook`, `launch-explore`, `r2-chooser-late-frame`, `r2-flight-shell`, `r2-shell-smoke`, `r3-result-setting`, `recheck` (held while the teaching tools are off, section 7.3), `satellite`, `watch-controls`; heavy 33/33 (with EO-PHY-2) and the six-DOF fleet 6/6 (with `vulcan-soyuz21b-falconheavy-longmarch3be`).

**D-64 paths it touches** (section 9): `src/physics` (`rigid/vehicle-data.ts`; tree `047f94b1` at `7263004`, `0d8106ec` at the rebased tip) and `src/data` (`vehicles.ts`; `5652f1c0` → `a5395e65`). `tests/heavy`, `tests/sixdof-fleet` and `package-lock.json` are unchanged, and no worker file changes, but `vehicle-data.ts` is bundled into six workers. Heavy 40240193599 and fleet 40144277552 stand for `7263004` only: heavy and the six-DOF fleet must run on the main the PR lands on.

**The size problem.** The old string is in 7 chunks of a `7263004` build (`index`, and the `flight`, `tune`, `monte-carlo`, `ratings`, `readiness` and `recheck` workers). The new text adds 73 B to each: about **+511 B** of precache code against about **174 B** of room (`GK1-ceilings-q03-1.md:71`; section 8), so about 337 B over 14 654 kB. Each chunk alone has room (`index` 197 B; each worker 18–23 kB). This is an estimate from the build of 2026-10-26, not a new build; a real build must confirm it before a PR. The ways out the notes list: (a) a D-38 raise from the owner; (b) shorter text, under 24 B of growth per chunk (174 ÷ 7), for example one entry, "Quasi-steady variable mass; internal flow omitted; slosh and bending off by default (rigid/flex.ts).", about +16 B per chunk and 112 B in all, which the notes expect to pass the four tests (not applied, not run); (c) landing after an EQ-6 or EQ-7 offset frees room.

**Open questions** (the notes' list; the first brought up to date):
1. **When.** "After GK1" (P4). Since the notes, the owner authorized K2 ("รับรองและอนุญาต K2", 2026-10-28T02:54:22Z) and answered S3 on the re-plan row that places the branch. It cannot merge before #182 (section 14). Whether "after GK1" also means after the owner's answer on item 2 was not asked; item 2 is asked before item 1 and #182's merge (section 14, steps 4–5).
2. **Size:** (a), (b) or (c) above.
3. **Vulcan figures.** The comment says about 136 × 1 010–1 300 km; the M-PHYSICS-043 registry row says ~137 × 1016–1200 km; neither was checked again. Since `5055370` main changed the point-mass ascent only by recording fields (#151: `ascent.ts`, `burns.ts`, `apJudgedM` and others) and a comment (#155, `explicit-guidance.ts`), and EO-PHY-1's test file has not changed since `d30b5e3` (2026-10-01), so the figures are probably unchanged, but this is not verified. Re-measure with `tests/fleet-harness.ts` `flyCase` on the PR's base, or keep the SHA-dated wording?
4. **File scope.** The new test is not on R4.1's allowed-file list in S13 §13.3 (`tests/sources.test.ts`, `tests/fleet-harness.ts`, `tests/validation/reference-data.ts`). Does lane Q accept it, with a note in the PR body?
5. **Commit 2's message** says "not ready": reword it before any PR.
6. **Reviewers.** Who fills P-D, P and Q?
7. **Other stale text.** `docs/PHYSICS.md:1510` still gives Vulcan a 1.5° kick and a 35° pitch maximum (the data has 3° and 40°). It is not on R4.1's file list: here, or separately?
8. **Stale plan line numbers.** The 041 row cites `ui/csv.ts:38` (now `:39`); its `vehicles.ts:476-494` still falls inside the comment (`:471-496`).

## Appendix A — HU-6 record template

The GK1 session wrote this template on 2026-10-26 (local run, not committed; not reachable from the K2 session). Below is its full text as it stood at the close, with these changes: the paths that pointed into that scratchpad now point to this file or to repo files, and the sources that named the freeze runbook or the scratchpad spec now name kpi-GK1.md ("Candidate", "HU-6 slot") and R7.1-GK1.md ("Human evidence: HU-6"); two placeholders are filled with the known date 2026-10-26 (the `kit:` line and the Candidate row of "The build under test"); and the comment's note on the file name says that R7.1-GK1.md also uses `HU-6-GK1-devices.md` and that section 14 picks `HU-6-GK1.md`. Appendix B, by contrast, is the guide unchanged. Its comment block holds the rules; keep them. To use it: copy everything between the fences into `docs/development/reports/HU-6-GK1.md`, delete the comment block before committing, and fill only what the owner reported (section 14, step 2).

````markdown
<!--
TEMPLATE for docs/development/reports/HU-6-GK1.md. Delete this comment before committing.
- Fill it only from what the owner sent back (the result sheet of the owner's Thai guide, HANDOVER-K2.md Appendix B, and the screenshots).
  Plan S16 §16.2 rule 1 (S16:72 at c2af8ae): an agent may draft the frame but never fills in a human result.
  A cell the owner left empty stays "not reported". Do not infer a result from a screenshot the owner did not describe.
- No learner data, no personal data, no screenshots in the repo (S16 §16.3, S16:93; S04 §04.1 item 8). Name screenshots
  by the owner's ids (A-4-1, I-9-2) and say where they are kept. Before writing, check the sheet and every screenshot
  for personal data (S16:91: Q checks that result files hold none) and record the check under Privacy.
- Device numbers are manual readings from one session. They are not CI trends and are not quoted as such
  (S16 HU-6 quality guard, S16:196; S04 §04.1 items 2 and 8).
- The GK1 record's spec (§6.11; local run, not committed; not reachable from the K2 session) and R7.1-GK1.md
  name this file HU-6-GK1-devices.md; the HU-6 task named HU-6-GK1.md. HANDOVER-K2.md §14 picks HU-6-GK1.md.
  Use one name, and the same name in R7.1-GK1.md, kpi-GK1.md and PROGRESS. The Thai guide names no
  file (it says only "a summary in English"), so it needs no change when the name is chosen.
- If the session did not happen, there is no file; the gap is a variance (the GK1 record's spec §6.11, local run, not committed;
  kpi-GK1.md "HU-6 slot"; R7.1-GK1.md "Human evidence: HU-6").
- Docs only; it goes through the records slot (plan S18:207).
- Candidate 7263004 = 72630046fc5eb56f1797e5363b6f9ad293ff9d38 (#179). Pages builds from a depth-1 checkout
  (deploy.yml: actions/checkout@v4 with no fetch-depth), and the stamp is `git rev-parse --short HEAD` (vite.config.ts:18-26),
  so the live About dialog shows `v0.1.0 · 7263004` and build-info.json `"commit": "7263004"`. A build in a full clone
  shows 8 characters (`72630046`); `git fetch --depth 1` of the candidate gives `7263004`. If the freeze runbook's H3 applied (HANDOVER-K2.md §14; a merge
  landed), the expected stamp is T's short SHA instead; say so under "The build under test".
- Task 12 comes from the owner's answer P3 of 2026-10-26, "ข เพิ่มเฉพาะ CSV (แนะนำ)": handoff K1-41 (FX-5 s4 "Still to do",
  `FX-5-s4-csv-export.md:126`) on iPad Safari and Android Firefox; K1-10 (Android peak memory) stays open. It replaces the
  kit's earlier optional small-file Safari check. To keep each device near 45 minutes the kit moved task 7 (Android) and
  task 4 (iPad) from recommended to "if time".
- Task 12 code facts (src at 7263004 equals a05ae70): runs 20-2000, default 200 (`src/physics/monte-carlo.ts:33`); the CSV
  holds only finished runs, one row each (`monteCarloCsv`, :350); workers = cores - 1, at most 16
  (`src/physics/monte-carlo-job.ts:28-31`); Download CSV is disabled until a run finishes (`src/ui/monte-carlo.ts:396`) and
  saves through `downloadBlob`, which revokes the URL after 5 s (`src/ui/download.ts`; `src/ui/monte-carlo.ts:371-374`).
- Agent's reference for task 12 (a local build of 7263004 in headless Chromium 153 on 4 CPUs with SwiftShader, not a device
  reading; HANDOVER-K2.md Appendix B, "Task 12: the agent's local reference"): 3 workers; first runs finished at 123 s; 9 runs after 6 min;
  the window then estimated "1 h 50 min" left for 200 runs; the CSV was 2 478 bytes, a 498-byte header plus 9 rows of
  220 bytes, 32 columns. So the file is about 0.5 kB + 0.22 kB per run: 200 runs about 45 kB, 2 000 runs about 440 kB.
- Code facts the kit relies on (a05ae70): Watch hides #setup, #controls, #mission-result, #rigid-controls and #footer
  (src/ui/modes.css:128-131), so the warp select, the achieved-speed label and the flight model are not visible in
  task 2; the achieved-speed label shows only for a live six-DOF flight (src/main.ts:2121); lesson 1.1 is point-mass
  (src/lessons/builtin/track1.ts:25); web fonts load only in the online data mode, offline is the default
  (src/ui/web-fonts.ts, src/provider/data-mode.ts:15); src has no wake lock; an import as a new learner opens that
  learner (src/ui/profiles/profile-menu.ts:64-66).
-->
# HU-6 at GK1: a session on real devices, on the candidate / session บนอุปกรณ์จริงที่ GK1

> **สรุปสำหรับเจ้าของ (ภาษาไทย)**
>
> - เจ้าของทดสอบรุ่น `<sha>` บน `<Android รุ่น>` และ `<iPad รุ่น>` วันที่ `<YYYY-MM-DD>` คนเดียว ไม่มีผู้เรียน
> - ภารกิจเต็มโดยไม่โหลดหน้าใหม่: Android `<ผ่าน / ไม่ผ่าน>` · iPad `<ผ่าน / ไม่ผ่าน>`
> - ติดตั้งและใช้ออฟไลน์: Android `<…>` · iPad `<…>`
> - ดาวน์โหลด CSV มอนติคาร์โล (ข้อ 12): Android Firefox `<n รอบ, ขนาด, ได้ไฟล์ครบ / ไม่ครบ>` · iPad Safari `<…>`
> - ปัญหาที่พบ `<n>` ข้อ ความรุนแรง 1 (ใช้ต่อไม่ได้) `<n>` ข้อ
> - สิ่งที่ session นี้ไม่ครอบคลุม: ส่วน "Not covered" ท้ายรายงาน

```yaml
envelope: v2
package: HU-6 (real-device sessions and feedback intake), step 1 only
items: [M-PLAN-011]
wave: K1 (GK1)
lane: H (the owner) + Q (kit and record)
change_kind: docs
owner_authorization: {date: 2026-10-26, quote: "HU-1 ย้ายไป พ.ย. · HU-6 ทำที่ GK1", scope: "GK1 decision 6, option (ก): HU-6 at GK1 on the candidate (DECISIONS.md:356)"}
owner_answer_scope: {date: 2026-10-26, id: P3, quote: "ข เพิ่มเฉพาะ CSV (แนะนำ)", scope: "task 12: handoff K1-41 on iPad Safari and Android Firefox; K1-10 stays open"}
decisions_used:
  - {id: D-56, row: "DECISIONS.md:51", gloss: "six device classes; low-end Android and iPad are the gate"}
  - {id: D-40, row: "DECISIONS.md:50", gloss: "minimum browsers Chrome/Edge 94, Safari 16.4, Firefox 114"}
  - {id: D-27, row: "DECISIONS.md:52", gloss: "six-DOF stays the default on every device that passes the criteria"}
  - {id: D-60, row: "DECISIONS.md:49", gloss: "problem reports: the app prepares the data, the user sends it (step 2, not built)"}
candidate_sha: 72630046fc5eb56f1797e5363b6f9ad293ff9d38   # GK1 candidate 7263004 (#179), as the agent told the owner; T's SHA if H3 applied (HANDOVER-K2.md §14)
pages_run: <run id>           # the Pages run that published <sha>, with its completion time (UTC)
session: {dates: [<YYYY-MM-DD>], observer: "the owner, alone", participants: none}
reported_by: {who: "the owner", chat_message_date: "<YYYY-MM-DD HH:MM> (Thai time)", quote: "HU-6 เสร็จ <date as the owner wrote it>"}   # S16:94: each HU result names its signer and date
kit: "the owner's Thai guide, given to the owner in chat on 2026-10-26; its text is in HANDOVER-K2.md Appendix B"
raw_notes: "the owner's result sheet, <n> screenshots and <0-2> task 12 CSV files, kept outside the repo"
```

## What this records

Plan S16 HU-6 step 1 (`S16:189` at `c2af8ae`) asks for a session on real devices at every GK from GK1 (`S16:212`, `S16:472`). S16 asks for the whole device matrix of S04 §04.4 in Thai, English and Russian, online and installed offline. This session covers the two D-56 gate classes, low-end Android and iPad (`DECISIONS.md:51`). It records the build stamp in a dated report in the S04 §04.1 item 8 format (build stamp, device class, browser, network, language; `S04:37`). It includes a full Soyuz or Falcon mission without a reload for KPI-32 (`S04:136`). The owner chose to run it at GK1 on the candidate (GK1 decision 6, option (ก), `DECISIONS.md:356`).

This report holds only what the owner reported. The agent wrote the kit and this record and ran nothing on the devices.

## The build under test

| | Value | Source |
|---|---|---|
| Candidate | `7263004` (`72630046fc5eb56f1797e5363b6f9ad293ff9d38`, #179) | kpi-GK1.md "Candidate"; agent's message to the owner, 2026-10-26 (HANDOVER-K2.md Appendix B) |
| Expected stamp | About `v0.1.0 · 7263004`; `build-info.json` `"commit": "7263004"` | `package.json` 0.1.0; short SHA of a depth-1 checkout |
| Published by | Pages `<run id>`, <UTC time> | GitHub Actions |
| `build-info.json` `commit` (server) | `<A: …>` · `<I: …>` (optional in the kit) | owner, result sheet part ก |
| About dialog, browser (device) | `<A: v0.1.0 · …>` · `<I: v0.1.0 · …>` | owner, part ก |
| About dialog, installed app (device) | `<A: …>` · `<I: …>` | owner, part ก |
| About dialog, Firefox on A (task 12) | `<A: v0.1.0 · …>` | owner, part ก |
| All equal to the candidate | `<yes / no: which>` | — |

The About tab shows `v<version> · <short commit>` (`src/ui/dialogs.ts`, `aboutPanel`); the physics tab ends with the same commit. The footer shows the version only, and Home and Watch hide the footer. The live site shows `7263004` only after the candidate's Pages run has published it.

## Devices

| Id | D-56 class | Model | OS | Browser | RAM | Meets D-40 | Network | Battery saver | Screen auto-lock: before → during session; restored | Data-mode button | Opened Orbitlab before; site data cleared | Language it opened in | Notice under the top bar |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| A | low-end Android | <…> | Android <…> | Chrome <…>; Firefox <…> (task 12 only) | <… GB> | <yes/no: Chrome ≥ 94; Firefox ≥ 114> | <Wi-Fi / prepaid data / monthly data> | <on/off> | <… → longest; yes/no> | <offline / online> | <yes/no; yes/no> | <th/en/ru> | <none / text> |
| I | school iPad | <…> | iPadOS <…> | Safari <= iPadOS> | not shown | <yes/no: Safari ≥ 16.4> | <…> | <on/off> | <… → Never; yes/no> | <…> | <…> | <…> | <…> |

<If device A has more than 4 GB of RAM, say so: S04 §04.4 defines the class as 3–4 GB (`S04:209`).>
<The data-mode button sets the fonts: offline (the default) uses the device's own fonts, online loads web fonts. Say which mode each device ran in.>

## Results by task

`pass` = worked as expected · `issue #n` = see Issues · `not run` (reason) · `not reported` = the owner left it empty. "Source" says why the task is there: **S16** = HU-6 step 1 asks for it; **P3** = added by the owner's answer P3 (ข) of 2026-10-26; the rest are suggested, with the plan item they serve. "Kit label" is the kit's plan for each device: required, P3 (the owner's answer), recommended, or if time. A task the owner skipped under "if time" is `not run (optional)`, not a gap.

| # | Task | Source | Kit label A / I | A (Android) | I (iPad) |
|---|---|---|---|---|---|
| 1 | First open, language, build stamp, test profile; startup recovery screen seen or not | S16 (build stamp) | required / required | | |
| 2 | Soyuz to the space station, Watch, to the end card, no reload, no app switch, screen kept on | S16 (KPI-32) | required / required | | |
| 3 | Explore copy of the same flight ("ลองปล่อยเที่ยวบินนี้เอง"): flight model shown, achieved-speed label, rotation, touch targets, Thai text, S04 §04.4 viewport criteria | KPI-11, KPI-27; S04 §04.4 | recommended / recommended | | |
| 4 | Build (satellite) → Fly it → Launch → Continue in Orbit | R7.1 steps 2–5 (S17) | if time / if time | | |
| 5 | Lesson 1.1 to its grading bar; leave and come back | R7.1 step 6; S17 row "lesson 1.1 at 390×844" | recommended / if time | | |
| 6 | Placement test, 5 questions; close and resume | HUF-T05; FX-2 step 2b on the candidate | recommended / if time | | |
| 7 | Export this learner's workspace; import as a new learner; switch back | R7.1 step 7 | if time / recommended | | |
| 8 | English and Russian, online (fixed set of screens) | S16 (TH/EN/RU) | required / required | | |
| 9 | Install; offline open, work present, flight, TH/EN/RU, reopen offline | S16 (installed offline; TH/EN/RU) | required / required | | |
| 10 | Switch apps and lock the screen during a flight | KPI-15 (S04 §04.4 iPad row) | if time / recommended | | |
| 11 | Second tab on the same learner (Web Locks) | S17:104 (device rows record Web Locks) | if time / if time | | |
| 12 | Monte Carlo set of 2 000 runs (Soyuz-2.1a to the ISS from Quick start, Engineer), run at least 15 min, stopped; Download CSV; the file opened; a second download confirmed after 10 s. A in **Firefox**, I in **Safari** | P3; handoff K1-41 (FX-5 s4 "Still to do") | P3 / P3 | | |
| 13 | Falcon 9: Bandwagon-1, Watch, to the end card | KPI-32 (Falcon) | if time / if time | | |

Tasks 4 and 7 have the same path in the `r7-cross-system` journey (Thai at 390×844 with touch), which runs in the Pages workflow's browser shards; that is Chromium in CI, not a device.

### Task 12: the Monte Carlo CSV download (handoff K1-41)

Only what the owner reported. The "expected" row is the agent's figure from a local build, not a device reading.

| What | A (Android, Firefox) | I (iPad, Safari) |
|---|---|---|
| Browser and version | Firefox <…> | Safari <= iPadOS> |
| About stamp in that browser | <v0.1.0 · …> | (checked in task 1) |
| Mission line under the window title | <Soyuz-2.1a จาก ท่าอวกาศยานไบโคนูร์ … / other: …> | <…> |
| Workers shown | <n> | <n> |
| Started → stopped (local time); minutes run | <…> | <…> |
| Progress line just before Stop (as written) | <"… / 2000 รอบ · เหลืออีก … · n worker"> | <…> |
| Runs finished | <n> | <n> |
| Download prompt shown | <yes / no> | <yes / no> |
| Seconds from Download CSV to saved | <…> | <…> |
| Where the file went | <…> | <…> |
| File name | <orbitlab_montecarlo_soyuz21a_iss_seed1.csv / …> | <…> |
| Size the device showed | <… kB> | <… kB> |
| Expected size (agent: 0.5 kB + 0.22 kB × runs) | <…> | <…> |
| Opened with; read as a table; last row complete | <…> | <…> |
| Last row number, if the app showed one (expected: runs + 1) | <…> | <…> |
| Second download, confirmed after 10 s | <saved, same size / failed: message / – no prompt> | <…> |
| CSV file sent to the agent; agent's row count | <no / yes: n data rows, header 32 columns> | <…> |
| Device hot | <…> | <…> |

<A file the owner sent: count its data rows and columns and say "agent's count". A file with fewer rows than runs finished, a cut row, or an empty file is an issue. "0 runs in 25 min" is a device-speed finding, not a download result: K1-41 then stays open for that browser.>

## Device readings (manual, one session)

These are hand readings, one per device. They set no budget and are not trends (S16:196; S04 §04.1 items 2 and 8). D-56 sets the device budgets after the HU-6 baseline (`docs/development/plan/data/decisions.tsv` row D-56).

| KPI | What was read | A | I | Note |
|---|---|---|---|---|
| KPI-32 | Soyuz mission (task 2): reached the end card; mission time on the end card ("ใช้เวลา … นับจากทะยานขึ้น"); reloaded or tab lost; wall minutes; fastest Watch speed button; screen locked during the run | <…> | <…> | Paired in the plan with R0.4's memory journey (M-PLAN-003), not on main (see Not covered). The one earlier browser memory sample was at mission time T+799.7 s (`docs/SIXDOF-BROWSER-QA.md:32`). A screen lock is recorded apart from a reload: it is not a KPI-32 failure |
| KPI-32 | Falcon 9 Bandwagon-1 (task 13, if run): the same fields | <…> | <…> | |
| KPI-08 | Cold start, stopwatch (task 1): tap → "Watch a launch" usable (s) | <…> | <…> | A manual proxy, not `measure.mjs`'s definition; cold only if site data was cleared or never existed |
| KPI-08 | Warm start, stopwatch (task 1): browser reload after the offline-ready bar → "Watch a launch" usable (s) | <…> | <…> | S04 defines warm as a reload in the same browser under the service worker (`S04:35`, item 6). S04: on a device, warm must not be slower than cold (`S04:88`) |
| — | Installed app opened offline (task 9), stopwatch (s) | <…> | <…> | A different context (installed, offline). Not compared with cold or warm |
| KPI-11 | Achieved-speed label during the task 3 Explore flight, at 1× and at the highest warp used | <…> | <…> | The label shows only for a live six-DOF flight (`src/main.ts:2121`); Watch hides it. "Not shown" with a six-DOF model in the task 3 row is an issue |
| KPI-15 | 3-D view back after app switch and lock; flight kept; no reload | <…> | <…> | Real devices; FX-8's journey forces the loss in CI |
| KPI-27 | Thai text clipped; controls hard to hit (names) | <…> | <…> | Observed, not probed: no pixel sizes |
| — | Startup recovery screen "เปิดมุมมองสามมิติไม่สำเร็จ" seen or not (task 1) | <…> | <…> | Feeds D-66. "Not seen" means WebGL2 started on that device |
| — | Flight model shown before the task 3 launch (row "แบบจำลองการบิน": six-DOF or point mass); any notice of lower quality | <…> | <…> | Feeds the D-27 follow-through and D-43. Task 2 (Watch) does not show the model, so this row shows the model of an Explore flight, not that six-DOF ran the full mission |
| — | Web Locks (task 11): read-only note / temporary-mode note | <…> | <…> | S17:104; sessionStorage not observable by hand |
| — | Installed app shares the browser's learners | <…> | <…> | On iPadOS a Home Screen web app usually has its own storage. On Android the installed app shares Chrome's storage, so the kit closes the Chrome tab first |
| — | Device hot, battery drop, notices that appeared by themselves | <…> | <…> | See also handoff K1-96 (scene drawn behind opaque pages) |

## Issues found

Severity, from the owner's 1–4 scale: **blocker** (1, cannot go on) · **major** (2, works with great difficulty) · **minor** (3) · **cosmetic** (4). Plan S17 §17.1 step 6: no blocker may remain in the supported scope at a gate; a known limitation must name its case. Triage is per domain lane (S17 step 6); the lane column is a proposal for the owner.

| # | Device | Task | What happened (owner's words, translated; Thai in brackets where it matters) | Repeats | Severity | Screenshot id | Proposed lane / item | Follow-up |
|---|---|---|---|---|---|---|---|---|
| 1 | | | | <yes / no / once> | | | | <issue, PR, or "owner to decide"> |

<If there are none: "The owner reported no issue.">

## Where this evidence goes

| Consumer | What it takes from this report | Where |
|---|---|---|
| KPI-32 row of the GK1 KPI file | Task 2 (and 13) per device | `kpi-GK1.md` |
| R7.1 at GK1 | The link to this report; the device rows | `R7.1-GK1.md` (S17:111, :117) |
| D-56 budgets | The first device baseline; budgets are set after it | decisions.tsv D-56 |
| DEC:D-27 follow-through | The flight model shown for the Explore flight of task 3 on each gate class. Not evidence that six-DOF ran the full mission: task 2 (Watch) does not show the model | followthrough row for D-27/D-56 (`DECISIONS.md:52`) |
| D-66 (no-WebGL path) | Whether the startup recovery screen appeared on each device (task 1) | deferred decision D-66 |
| D-40 | Browser versions that ran the candidate | `DECISIONS.md:50` |
| M-PLAN-011 acceptance | One report per gate class before GK4 (`S16:194`) | this report counts for A and I |
| Register | Row HU-6 | `PROGRESS.md:208` (at `a05ae70`) |
| Handoff K1-41 | Task 12: whether Safari (I) and Firefox (A) saved a complete file, its size and runs; the 10-s confirm | GK1 handoff check; FX-5 s4 "Still to do" |
| Handoff K1-10 | Nothing: not in this session (owner's answer P3 ข); stays open | GK1 handoff check |

## Not covered

Known before the session; keep each line that stays true and add what the session showed.

1. **Four of the six D-56 classes:** iPhone, Chromebook, Windows/Edge, desktop Chrome and Firefox. S16 step 1 names the whole S04 §04.4 matrix; D-56 gates on low-end Android and iPad only. M-PLAN-011 needs one report per gate class before GK4 (`S16:194`).
2. **KPI-32's memory budget:** heap, recording bytes, `renderer.info.memory` and context count come from R0.4's memory journey (M-PLAN-003), which is not merged (`PROGRESS.md:131` at `a05ae70`). This report has only "reached the end without a reload".
3. **The install's peak memory on a low-cost Android phone** that EQ-1 option (ก) asked for before merge (`EQ-1-s1-precache-transfer.md:67`, `:127`; handoff K1-10). The phone shows no memory figure without USB remote debugging from a computer. The owner chose not to add it to this session (P3 ข, 2026-10-26); K1-10 stays open.
4. **KPI-25 (input latency p75):** no hand measure. Only felt lag is noted.
5. **KPI-24 (time to first result on one's own phone):** HU-1's measure with first-time users, moved to November (`DECISIONS.md:356`). The owner is not a first-time user.
6. **KPI-08 and KPI-11 as numbers:** one stopwatch or label reading per device. Not comparable with `measure.mjs` or CI.
7. **sessionStorage** per device row (S17:104): not observable by hand. Web Locks only through task 11.
8. **HU-6 step 2, the problem-report button** (`S16:190`): not built. It is a feature PR of L-UI or T after D-60 (`DECISIONS.md:49`; contact channel `DECISIONS.md:215`). The owner sent results in chat instead.
9. **The teaching tools held back** (`src/ui/held.ts`: `TEACHER_TOOLS = false`; owner, 2026-10-17): worksheets, scenario writer, check results, lesson packs, lesson files, results export, lesson and scenario links, Prepare a class, Orbit case worksheets. They are not on the live site. The six held journeys run them once on a build with the tools on (GK1 decision 7, `DECISIONS.md:357`).
10. **Languages:** the main flow ran in Thai. English and Russian were checked on a fixed set of screens online (task 8) and on Home offline (task 9), not in every task. S04 §04.4 asks every device row for TH/EN/RU online and offline.
11. **Screen reader, real browser zoom, the intranet zip, and a classroom Wi-Fi of 30–40 devices** (`S06:189` on main; S04 §04.4 network table).
12. **A full-size Monte Carlo set** (handoff K1-41). FX-5 names no size. The CSV holds only finished runs, about 0.22 kB each, so the largest set the app allows (2 000 runs) is about 440 kB, and it takes hours on these devices. Task 12 stopped after <minutes> with <n> runs (<size>) on A in Firefox and <…> on I in Safari. Firefox on iPad uses WebKit, so it was not tested. Chrome's download on Android, desktop Safari and desktop Firefox were not tested in this task.
13. **The screen's default auto-lock during a Watch flight:** the app does not keep the screen awake (no wake lock in `src` at `a05ae70`). The owner turned auto-lock off for the session, so this report does not show what a student with the default setting (often 30 s on Android, 2 min on iPad) sees during an 8-minute Watch flight.
14. **Web fonts:** the session ran with the data-mode button as recorded under Devices. In the default offline mode the device's own Thai font is used; the online mode's web fonts were not checked unless the table says online.
15. <Tasks the owner did not run, with the reason given.>

## Privacy

The owner tested alone on <the owner's own devices / a shared device: say which>. No learner took part and no learner data was made. Test profiles were named `HU6-A`, `HU6-I` (and `-copy`, `-app`); Firefox on A kept the default "Learner 1" (task 12). The task 12 CSV holds flight numbers only. The kit told the owner not to photograph the learner list or clear site data on a device holding other people's profiles. The result sheet and screenshots stay with the owner, outside the repo. Before writing this report, Q checked the result sheet and each screenshot the owner sent for personal data (S16:91): <none found / what was left out>. This report holds no device identifier beyond model, OS, browser and RAM, and no learner name other than the test profiles.
````

## Appendix B — the owner's HU-6 guide (Thai)

**How the owner received it.** The GK1 session sent it as a file in its chat on 2026-10-26 at 20:50:57Z (the GK1 session's transcript), with this caption, verbatim: "คู่มือ HU-6 สำหรับ Android และ iPad candidate 7263004 ขึ้นเว็บแล้วตั้งแต่ 22:42 (UTC+3) ก่อนเริ่มให้ตรวจในหน้า "เกี่ยวกับ" ว่าเห็นรหัส 7263004 กรอกผลในตารางท้ายคู่มือแล้วส่งกลับใน chat ได้เลยครับ" (the HU-6 guide for Android and iPad; candidate 7263004 has been on the site since 22:42 UTC+3; before starting, check the "About" dialog for the code 7263004; fill in the tables at the end and send them back in the chat). The caption is the "published" message the guide's "รอรุ่นทดสอบ" step 2 waits for; 22:42 UTC+3 is 19:42Z, after `deploy-pages` finished at 19:41:58Z. The file was last changed at 19:51:19Z, before it was sent, so the text below is what the owner received (SHA-256 of the file `8e0cd0ceab0fb0e3a4995327f3c68c9769487be2b2ca9f9c531133cc87f00f15`). It is not in the repo otherwise.

Two things in it have changed since: the session it names in "ส่งผลกลับ" step 2 ("ใน chat ของ session นี้") closes with this hand-over, so results go to the K2 session (section 14, steps 0 and 1); and "agent" now means the K2 session.

````markdown
# HU-6 ที่ GK1: คู่มือทดสอบบนอุปกรณ์จริง (สำหรับเจ้าของ)

> **สถานะ:** ร่างของ agent ยังไม่มีผลใด ๆ เจ้าของกรอกผลทุกช่องเอง agent ไม่กรอกแทน
>
> **ที่มา:** คำตัดสินของเจ้าของใน chat วันที่ 2026-10-26 ว่า "HU-6 ทำที่ GK1" ที่มาของแต่ละข้ออยู่ในบันทึกภาษาอังกฤษที่ agent จะเขียนจากผลของคุณ

## สรุปสั้น

- ทำบน 2 เครื่อง: **Android ราคาประหยัด (Chrome และ Firefox สำหรับข้อ 12)** และ **iPad (Safari)**
- ใช้เว็บจริง https://royin001.github.io/Orbitlab/ หลัง agent แจ้งว่ารุ่นทดสอบ `7263004` เผยแพร่แล้ว
- ข้อที่ติดป้าย **[ต้องทำ]** ใช้ราว 30 นาทีต่อเครื่อง รวมการเตรียม บน Android ต้องติดตั้ง Firefox ด้วย ทำล่วงหน้าได้
- ข้อ 12 ติดป้าย **[ตามที่คุณตอบ]** เพิ่มตามคำตอบ P3 (ข) ของคุณ ทำทั้งสองเครื่อง ลงมือราว 8–10 นาที แล้วรออีกอย่างน้อย 15 นาทีโดยไม่ต้องเฝ้า
- ข้อ **[แนะนำ]** แบ่งกันทำตามตารางด้านล่าง ข้อ **[เสริม]** ทำเมื่อมีเวลา
- รวมข้อ [ต้องทำ] ข้อ 12 และข้อ [แนะนำ] ราว 45–50 นาทีต่อเครื่อง ไม่นับการเตรียมและเวลารอของข้อ 12
- เวลาไม่พอ: ทำข้อ 1, 2, 8 และ 9 ให้ครบทั้งสองเครื่องก่อน แล้วจึงข้อ 12 ข้อ [แนะนำ] ข้ามได้
- จดผลลงใบผลท้ายเอกสาร แล้วส่งกลับใน chat พร้อมภาพหน้าจอ

| | Android (A) | iPad (I) |
|---|---|---|
| [ต้องทำ] | 1, 2, 8, 9 | 1, 2, 8, 9 |
| [ตามที่คุณตอบ] | 12 (ใน Firefox) | 12 (ใน Safari) |
| [แนะนำ] | 3, 5, 6 | 3, 7, 10 |
| ถ้าเหลือเวลา | 4, 7, 10, 11, 13 | 4, 5, 6, 11, 13 |

ทำตามเลขข้อจากน้อยไปมาก ข้อที่ไม่อยู่ในรายการของเครื่องนั้นให้ข้ามไป เหตุที่แบ่งแบบนี้: บทเรียนและแบบทดสอบเป็นงานที่นักเรียนทำบนโทรศัพท์ ส่วนการสลับแอประหว่างบินเป็นเรื่องที่ iPad ในห้องเรียนเจอบ่อย

ข้อ 12 ทำให้เวลาเกิน จึงย้าย 2 ข้อจาก [แนะนำ] ไปอยู่แถว "ถ้าเหลือเวลา": ข้อ 7 บน Android (ข้อ 7 ยังทำบน iPad) และข้อ 4 บน iPad (ข้อ 4 จึงเป็นข้อเสริมของทั้งสองเครื่อง) สองข้อนี้มี journey ทดสอบอัตโนมัติ (`r7-cross-system`) ตรวจทางเดินเดียวกันบนจอขนาดโทรศัพท์ทุกครั้งที่เผยแพร่ แต่ไม่ได้รันบนเครื่องจริง

แผนขอสี่อย่างในรอบนี้ ข้อ [ต้องทำ] ด้านล่างครอบคลุมทั้งสี่อย่าง:

1. รหัสรุ่นของเว็บที่ทดสอบ (ข้อ 1, 9)
2. ภาษาไทย อังกฤษ และรัสเซีย (ข้อ 8 ออนไลน์, ข้อ 9 ออฟไลน์)
3. ทั้งออนไลน์ และหลังติดตั้งแล้วใช้แบบออฟไลน์ (ข้อ 9)
4. ภารกิจโซยุซหรือ Falcon 9 เต็มโดยไม่โหลดหน้าใหม่ (ข้อ 2)

ข้อ 12 มาจากคำตอบของคุณ ไม่ใช่สิ่งที่แผนของ HU-6 ขอ ส่วนการวัดหน่วยความจำสูงสุดของ Android ตอนติดตั้งแบบออฟไลน์ (K1-10) ไม่อยู่ใน session นี้ตามที่คุณตอบ ยังค้างไว้

---

## ก่อนเริ่ม

### สิ่งที่ต้องมี

- Android ราคาประหยัด ถ้าได้ RAM 3–4 GB ยิ่งดี และ iPad
- ถ้าเป็นไปได้ ใช้เครื่องที่ไม่มีโปรไฟล์ Orbitlab ของคนอื่น (ดูหัวข้อความเป็นส่วนตัว)
- แบตเตอรี่อย่างน้อย 50% และสายชาร์จของทั้งสองเครื่อง (ข้อ 12 ใช้ CPU เต็มที่อย่างน้อย 15 นาที)
- **Firefox บน Android** (ข้อ 12): ติดตั้งจาก Play Store ล่วงหน้า ใช้ Wi-Fi ถ้าได้ ยังไม่ต้องเปิด Orbitlab ใน Firefox จนถึงข้อ 12 Firefox จะได้ไม่จำรุ่นเก่าไว้ ไม่ต้องติดตั้ง Firefox บน iPad
- ปิดโหมดประหยัดแบต บางเครื่องบังคับให้จอดับเร็วเมื่อเปิดโหมดนี้ (ถ้าปิดไม่ได้ ให้จดไว้)
- **ตั้งให้จอไม่ดับเอง** ข้อ 2 ต้องดูจอนาน 8 นาทีโดยไม่แตะ แอปไม่ได้กันจอดับให้ จดค่าเดิมไว้ก่อน แล้วคืนค่าหลังเสร็จ
  - Android: การตั้งค่า → จอแสดงผล (Display) → ระยะหมดเวลาหน้าจอ (Screen timeout) → เลือกค่าที่นานที่สุด
  - iPad: การตั้งค่า → จอภาพและความสว่าง (Display & Brightness) → ล็อกอัตโนมัติ (Auto-Lock) → ไม่ใช้ (Never)
  - ชื่อเมนูอาจต่างกันตามยี่ห้อและรุ่น
- เครือข่ายที่ใช้จริง (Wi-Fi หรือ data เติมเงิน) จดว่าใช้อะไร
- นาฬิกาจับเวลา (เครื่องอื่นหรือนาฬิกาข้อมือ)
- เปิดโหมดห้ามรบกวน ภาพหน้าจอจะได้ไม่มีการแจ้งเตือน
- ใบผลท้ายเอกสารนี้ (พิมพ์ หรือคัดลอกไปกรอกในโน้ต)

### รอรุ่นทดสอบ

1. รุ่นทดสอบคือ `7263004` (#179) เว็บจริงจะแสดงรหัสนี้หลังงาน Pages ของรุ่นนี้เผยแพร่เสร็จแล้วเท่านั้น ก่อนหน้านั้นจะเห็นรหัสของรุ่นก่อน
2. agent จะแจ้งใน chat ว่า "รุ่นทดสอบ = `7263004` เผยแพร่แล้ว" ถ้ามีการ merge อื่นเข้ามาก่อน agent จะแจ้งรหัสใหม่พร้อมเหตุผล ให้ใช้รหัสในข้อความนั้น
3. จดรหัสนั้นลงใบผลส่วน ก
4. ยังไม่ได้รับข้อความนี้ อย่าเพิ่งเริ่ม

### ตรวจว่าเครื่องเปิดรุ่นทดสอบอยู่

ทำบนทุกเครื่อง ทำอีกครั้งเมื่อเปิดแอปที่ติดตั้งแล้วในข้อ 9 และเมื่อเปิดใน Firefox ในข้อ 12

1. เปิด https://royin001.github.io/Orbitlab/
2. ถ้ามีแถบล่างขึ้นว่า "Orbitlab รุ่นใหม่พร้อมใช้งานแล้ว" ให้กด "โหลดใหม่"
3. กดปุ่ม ⓘ บนแถบบน หน้าต่าง "เกี่ยวกับ" จะเปิดขึ้น
4. หน้าต่างนี้มีสองแท็บ ถ้าเปิดมาที่แท็บ "ฟิสิกส์และแหล่งอ้างอิง" ให้กดแท็บ "เกี่ยวกับ"
5. ใต้ชื่อ Orbitlab มีบรรทัด `v0.1.0 · 7263004` เจ็ดตัวหลังจุดคือรหัสรุ่นที่เครื่องกำลังใช้
6. รหัสนี้ต้องตรงกับที่ agent แจ้ง (`7263004` เว้นแต่ agent แจ้งรหัสอื่น)
7. ถ้าไม่ตรง ปิดทุกแท็บของเว็บนี้ รอ 10 นาที แล้วเปิดใหม่ (เครื่องอาจจำหน้าเก่าไว้ได้ถึง 10 นาที) แล้วทำข้อ 2–6 ซ้ำ
8. อีกทางหนึ่ง (ไม่บังคับ): เปิด https://royin001.github.io/Orbitlab/build-info.json ควรเห็น `"commit": "7263004"` ค่านี้คือรุ่นที่เว็บเผยแพร่ ส่วนหน้าต่าง "เกี่ยวกับ" คือรุ่นที่เครื่องใช้อยู่ ทั้งสองต้องตรงกับที่ agent แจ้ง
9. ยังไม่ตรง หยุดก่อนแล้วแจ้ง agent

### จดข้อมูลเครื่อง (ใบผลส่วน ก)

- **Android:** รุ่นเครื่อง, รุ่น Android และ RAM (การตั้งค่า → เกี่ยวกับโทรศัพท์) · รุ่น Chrome (Chrome ⋮ → การตั้งค่า → เกี่ยวกับ Chrome) · รุ่น Firefox (Firefox ⋮ → การตั้งค่า → เกี่ยวกับ Firefox)
- **iPad:** ชื่อรุ่นและรุ่น iPadOS (การตั้งค่า → ทั่วไป → เกี่ยวกับ) Safari มีรุ่นเดียวกับ iPadOS
- แอปรองรับ Safari 16.4 ขึ้นไป, Chrome 94 ขึ้นไป และ Firefox 114 ขึ้นไป ถ้าเครื่องต่ำกว่านี้ จดไว้แล้วทำต่อ
- ค่าล็อกจอเดิม และค่าที่ตั้งไว้สำหรับวันนี้
- ปุ่มรูปเมฆบนแถบบน: มีขีดทับ (ออฟไลน์ เป็นค่าเริ่มต้น) หรือไม่มีขีดและเป็นสีฟ้า (ออนไลน์) จดไว้แล้วปล่อยไว้ตามเดิม
- ไม่ต้องจด IMEI เบอร์โทร หรือชื่อบัญชี

### ความเป็นส่วนตัว

- เจ้าของทดสอบคนเดียว ไม่มีนักเรียน ไม่มีข้อมูลผู้เรียน
- ตั้งชื่อโปรไฟล์ทดสอบเป็น `HU6-A` (Android) และ `HU6-I` (iPad) ห้ามใช้ชื่อจริง ใน Firefox (ข้อ 12) ไม่ต้องตั้งชื่อ ใช้ "Learner 1" ตามเดิม
- ถ้าเครื่องมีโปรไฟล์ของคนอื่นอยู่แล้ว (เช่น iPad ของโรงเรียน):
  - อย่าถ่ายภาพหน้าต่าง "โปรไฟล์ผู้เรียน" ที่เห็นรายชื่อ
  - อย่าล้างข้อมูลเว็บไซต์ เพราะจะลบงานของคนอื่นด้วย
- ภาพหน้าจอต้องไม่มีการแจ้งเตือน ชื่อบัญชี รูปส่วนตัว หรือชื่อผู้เรียนคนอื่น
- ภาพหน้าจอและใบผลไม่เข้าไปในโค้ดของโครงการ agent ตรวจว่าไม่มีข้อมูลส่วนตัวก่อน แล้วเขียนเฉพาะสรุปภาษาอังกฤษ
- ไฟล์สำรองที่ส่งออกในข้อ 7 อยู่กับเจ้าของ ไม่ต้องส่งให้ agent
- ไฟล์ CSV ของข้อ 12 มีแต่ตัวเลขการบิน ไม่มีข้อมูลส่วนตัว ส่งให้ agent ได้

### วิธีจด

| เครื่องหมาย | ความหมาย |
|---|---|
| ✓ | ทำได้ตามที่คาด |
| ✗ | มีปัญหา: เขียน 1 บรรทัดว่าเกิดอะไร ถ่ายภาพ ตั้งชื่อ `A-4-1` (A = Android, I = iPad, เลขข้อ, ลำดับภาพ) |
| – | ไม่ได้ทำ (บอกเหตุถ้ามี) |

ความรุนแรงของปัญหา: **1** ใช้ต่อไม่ได้ · **2** ใช้ได้แต่ติดขัดมาก · **3** เล็กน้อย · **4** แค่หน้าตา

ทุกข้อให้สังเกตด้วยว่ามีข้อความขึ้นมาเองหรือไม่ เช่น เรื่องกราฟิก แสงเรือง หรือหน่วยความจำ ถ้ามี ถ่ายภาพไว้

---

## โจทย์ (ทำตามลำดับบนแต่ละเครื่อง)

- ทำทุกข้อเป็นภาษาไทย ยกเว้นข้อ 8
- ปุ่มรูปเมฆบนแถบบนคือแหล่งข้อมูลของแอป ไม่ใช่การปิดเน็ตของเครื่อง ปล่อยไว้ตามเดิม
- ทั้ง session แอปใช้ฟอนต์ไทยของเครื่อง ซึ่งเป็นแบบที่นักเรียนเห็นตามค่าเริ่มต้น
- บนโทรศัพท์และ iPad แนวตั้ง ปุ่มบนแถบบนเป็นรูปไอคอน ไม่มีคำ เป็นเรื่องปกติ

### ข้อ 1 · เปิดครั้งแรก ภาษา และรหัสรุ่น **[ต้องทำ]** · 5 นาที

1. จดว่าเครื่องนี้เคยเปิด Orbitlab มาก่อนหรือไม่
2. **[แนะนำ]** ถ้าอยากเห็นการเปิดครั้งแรกจริง ให้ล้างข้อมูลเว็บไซต์ก่อน ทำได้เฉพาะเครื่องที่ไม่มีงานของใครต้องเก็บ ห้ามทำบนเครื่องที่ใช้ร่วมกัน
   - Android: Chrome → การตั้งค่า → การตั้งค่าเว็บไซต์ → หา `royin001.github.io` → ล้างข้อมูล (ชื่อเมนูต่างกันได้ตามรุ่น)
   - iPad: การตั้งค่า → Safari → ขั้นสูง → ข้อมูลเว็บไซต์ → `royin001.github.io` → ลบ
   - ไม่ล้างก็ได้ จดว่า "ไม่ล้าง"
3. **[แนะนำ]** จับเวลาเปิดครั้งแรก: เริ่มเมื่อกดเปิดเว็บ หยุดเมื่อเห็นจรวดบนฐานและกดปุ่ม "ชมการปล่อยจรวด" ได้ จดเป็นวินาที
4. จดภาษาที่เว็บเปิดขึ้นมาเอง (เว็บเลือกตามภาษาของเครื่อง: ไทยได้ไทย รัสเซียได้รัสเซีย นอกนั้นได้อังกฤษ)
5. ถ้าไม่ใช่ภาษาไทย เปลี่ยนที่ช่องเลือกทางขวาของแถบบน ช่องนี้เขียนว่า ไทย / English / Русский จดว่าหาเจอง่ายไหมบนจอนี้
6. ถ้าแทนที่จรวดบนฐาน มีหน้า "เปิดมุมมองสามมิติไม่สำเร็จ" ขึ้นมา ให้ถ่ายภาพ จด ✗ ความรุนแรง 1 แล้วแจ้ง agent
7. ตรวจรหัสรุ่นตามหัวข้อ "ตรวจว่าเครื่องเปิดรุ่นทดสอบอยู่"
8. กดปุ่ม "◉ ผู้เรียน: …" บนแถบบน หน้าต่าง "โปรไฟล์ผู้เรียน" จะเปิดขึ้น
   - ถ้ามีแค่ "Learner 1": กด "เปลี่ยนชื่อ" → พิมพ์ `HU6-A` หรือ `HU6-I` → กด "บันทึกชื่อ"
   - ถ้ามีโปรไฟล์อื่นอยู่แล้ว: กด "สร้างโปรไฟล์" → พิมพ์ `HU6-A` หรือ `HU6-I` ในช่อง "ชื่อผู้เรียน" → กด "สร้างโปรไฟล์" อีกครั้ง → กด "ยืนยัน" หน้าจะโหลดใหม่เองและเปิดชื่อนี้ เป็นเรื่องปกติ
9. รอแถบล่าง "Orbitlab พร้อมใช้งานแบบออฟไลน์แล้ว" จดว่าขึ้นหรือไม่ (ข้อ 9 ต้องใช้)
10. **[แนะนำ]** จับเวลาเปิดซ้ำ: ทำหลังแถบในข้อ 9 ขึ้นแล้วเท่านั้น กดโหลดหน้าใหม่ของเบราว์เซอร์ (Chrome: ⋮ → ↻ · Safari: ↻ ในช่องที่อยู่เว็บ) จับเวลาจนกดปุ่ม "ชมการปล่อยจรวด" ได้ จดเป็นวินาที

**จด:** ภาษาที่เปิดเอง · รหัสรุ่นใน "เกี่ยวกับ" · เวลาเปิดครั้งแรกและเปิดซ้ำ (ถ้าจับ) · หน้า "เปิดมุมมองสามมิติไม่สำเร็จ" ขึ้นหรือไม่ · ข้อความใต้แถบบน ถ้ามี เช่น "งานนี้เป็นงานชั่วคราว…" หรือ "…เปิดอยู่ในแท็บอื่น…"

### ข้อ 2 · ภารกิจเต็มโดยไม่โหลดหน้าใหม่ **[ต้องทำ]** · 8 นาที

1. ที่หน้าแรก กด "ชมการปล่อยจรวด" ควรเป็นภารกิจ "โซยุซสู่สถานีอวกาศ"
   - ถ้าเป็นภารกิจอื่น: กดปุ่ม "เลือกการปล่อย" → "โซยุซสู่สถานีอวกาศ"
2. ใช้ปุ่มความเร็วบนภาพ (อัตโนมัติ / 1× / 5× / 25× / 100×) ได้ตามสะดวก จดปุ่มที่เร็วที่สุดที่ใช้
3. ดูจนการ์ดท้ายขึ้น (มีปุ่ม "ลองปล่อยเที่ยวบินนี้เอง")
4. จดเวลาที่การ์ดท้ายเขียนไว้ ("ใช้เวลา … นับจากทะยานขึ้น")
5. ระหว่างข้อนี้ ห้ามกดโหลดหน้าใหม่ และห้ามสลับไปแอปอื่น
6. จอต้องไม่ดับ (ตั้งไว้แล้วตอนเตรียม) ถ้าจอดับเพราะลืมตั้ง ให้จดว่า "จอดับ" แยกไว้ ไม่นับเป็นปัญหาของแอป แล้วตั้งค่าแล้วทำข้อนี้ใหม่
7. อยู่ที่การ์ดท้ายไว้ ข้อ 3 เริ่มจากการ์ดนี้

**จด:** ถึงการ์ดท้ายหรือไม่ · เวลาบนการ์ดท้าย · หน้าโหลดใหม่เอง แท็บดับ หรือมีข้อความ error หรือไม่ (ถ้าใช่ = ✗ ความรุนแรง 1 ถ่ายภาพ) · ภาพ 3 มิติหยุดหรือกระตุก · เวลาที่ใช้จริง (นาที) · ปุ่มความเร็วที่เร็วที่สุด · จอดับหรือไม่ · เครื่องร้อนไหม

### ข้อ 3 · บินเอง หมุนจอ ขนาดปุ่ม และตัวอักษรไทย **[แนะนำ]** · 5 นาที

ภาพในข้อ 2 ไม่มีปุ่มควบคุมการบิน ข้อนี้จึงปล่อยเที่ยวบินเดียวกันเอง

1. ที่การ์ดท้ายของข้อ 2 กด "ลองปล่อยเที่ยวบินนี้เอง"
   - ถ้าการ์ดปิดไปแล้ว: เลือกส่วน "ปล่อยจรวด" → ระดับ "ทดลอง"
2. แผงตั้งค่าภารกิจขึ้นมา (บนโทรศัพท์อยู่ใต้ภาพ ต้องเลื่อนลง) แตะหัวข้อ "การนำวิถี: ระบบคำนวณให้แล้ว" ให้กางออก
3. จดบรรทัด "แบบจำลองการบิน": เป็น "หกองศาอิสระเต็มรูปแบบ (6-DOF)" หรือ "มวลจุด (แบบเดิม)"
4. กด "ปล่อยจรวด"
5. ระหว่างบิน ใต้แถวปุ่มเล่นมีข้อความเล็ก "ความเร็วจำลองที่ทำได้จริง: …×"
   - ตั้งช่อง "เร่งเวลา" เป็น 1× แล้วจดค่า
   - ตั้งเป็นค่าสูงสุดที่ใช้ แล้วจดค่าอีกครั้ง
   - ถ้าไม่เห็นข้อความนี้ จดว่า "ไม่แสดง"
6. หมุนเครื่องเป็นแนวนอน แล้วกลับเป็นแนวตั้ง
7. ไล่ดูตามรายการนี้ทั้งสองแนว
   - หน้าเลื่อนไปซ้ายขวาไม่ได้ ไม่มีอะไรล้นออกด้านข้าง
   - ปุ่มบนแถบบนกดได้ครบ ไม่ล้นหรือซ้อนกัน
   - ปุ่ม "ปล่อยจรวด" หาเจอ
   - ปุ่มเล่น/หยุด นาฬิกา ปุ่ม "สด" และปุ่ม "หนีภัย" (ถ้ามี) ไม่ถูกบัง
   - สระบนล่างและวรรณยุกต์ไทยไม่ถูกตัด ดูหัวข้อ ปุ่ม และการ์ด
   - ปุ่มไหนเล็กจนกดพลาดบ่อย ให้บอกชื่อปุ่ม
8. iPad บางรุ่น (เช่น iPad Air และ iPad รุ่นที่ 10) แนวนอนกว้างพอดีกับจุดที่แอปเปลี่ยนการจัดหน้า ดูให้ดีว่าจัดหน้าแปลกหรือไม่

**จด:** แบบจำลองการบิน · ความเร็วจำลองที่ 1× และที่ค่าสูงสุด · ✓ หรือ ✗ ต่อแนว · ชื่อปุ่มที่กดยาก · ภาพของข้อความที่ถูกตัดหรือถูกบัง · หมุนแล้วเที่ยวบินยังอยู่ไหม

### ข้อ 4 · สร้าง → ปล่อย → วงโคจร **[เสริม]** · 7 นาที

1. เลือกส่วน "สร้าง" → ระดับ "ทดลอง" (บนโทรศัพท์เป็นปุ่มเดียวที่เปิดรายการส่วนและระดับ)
2. สวิตช์ "ดาวเทียม" → "ออกแบบดาวเทียม" ใช้แบบ NAPA-2
3. เปลี่ยนค่าหนึ่งค่า เช่น มวลแห้ง ตั้งชื่อแบบ `HU6-sat` แล้วกด "บันทึก"
4. ที่กล่อง "นำไปบินในส่วนปล่อยจรวด" ถ้าขึ้นว่า "ยังบินไม่ได้ตามที่ตั้งไว้" ให้แตะจรวดที่กล่องเสนอ
5. กด "นำไปบิน" ส่วนปล่อยจรวดควรมีป้าย "แบบของคุณ" และแถบขั้น สร้าง › ตรวจ › ปล่อย › ผล › วงโคจร
6. เลื่อนลง กด "ปล่อยจรวด" ใช้ช่อง "เร่งเวลา" จนการ์ดผลขึ้น
7. กด "บินต่อในวงโคจร" ส่วนวงโคจรควรแสดงดาวเทียมในกลุ่ม "ต่อจากเที่ยวบิน"

**จด:** ติดตรงขั้นไหน · ปุ่มถูกบังหรือหาไม่เจอ · ถึงส่วนวงโคจรหรือไม่

### ข้อ 5 · บทเรียน 1.1 "วงโคจรแรก" **[แนะนำ]** · 5 นาที

1. กดปุ่มสีทองรูป ✎ บนแถบบน (บนจอกว้างมีคำว่า "บทเรียน") → แท็บ "บทเรียน" → 1.1 "วงโคจรแรก"
2. เลื่อนลง กด "ปล่อยจรวด" ใช้ช่อง "เร่งเวลา" ได้ จอต้องไม่ดับระหว่างรอ
3. ถึงวงโคจรแล้ว แถบบทเรียนจะขอคาบและความเร็ว พิมพ์ตัวเลขด้วยแป้นของเครื่อง ลองพิมพ์จุดทศนิยมด้วย
4. กด "ตรวจคำตอบ" ถ้าไม่อยากคิด กด "ดูเฉลย" แล้วพิมพ์ตาม ผลจะเป็นผ่านแบบมีตัวช่วย ไม่เป็นไร
5. ไปส่วนอื่น (เช่น วงโคจร) แล้วกลับมาที่บทเรียน ดูว่าบทเรียน คะแนน และค่าที่ล็อกยังอยู่ไหม

**จด:** แถบให้คะแนนเห็นครบไหม · แป้นพิมพ์จุดทศนิยมได้ไหม · ออกแล้วกลับมาบทเรียนยังอยู่ไหม

### ข้อ 6 · แบบทดสอบวัดพื้นฐาน 5 ข้อ แล้วกลับมาทำต่อ **[แนะนำ]** · 4 นาที

1. ปุ่มสีทองรูป ✎ → แท็บ "แบบทดสอบวัดความรู้" → "เริ่มทำแบบทดสอบ"
2. ตอบ 5 ข้อ ตอบตามจริง ผลไม่สำคัญ แต่ละข้อต้องเลือกคำตอบ และเลือก "มั่นใจแค่ไหน" (เดา / ไม่แน่ใจ / มั่นใจ) ก่อน ปุ่ม "ถัดไป →" จึงกดได้
3. ปิดแท็บหรือปัดแอปเบราว์เซอร์ทิ้ง แล้วเปิดเว็บใหม่
4. กลับไปที่ปุ่ม ✎ → "แบบทดสอบวัดความรู้" ควรทำต่อที่ข้อ 6 ได้

**จด:** ข้อความไทยถูกตัดไหม · ต้องเลื่อนหาตัวเลือกไหม · กราฟหรือรูปเล็กจนอ่านไม่ได้ไหม · คำถามแบบเรียงลำดับใช้นิ้วได้ไหม · กลับมาทำต่อได้ไหม

### ข้อ 7 · ส่งออกและนำเข้าข้อมูลสำรอง **[แนะนำ]** · 6 นาที

1. "◉ ผู้เรียน: HU6-…" → หน้าต่าง "โปรไฟล์ผู้เรียน" → กดปุ่ม "ข้อมูลสำรองโปรไฟล์"
2. กด "ส่งออกพื้นที่ทำงานของผู้เรียนนี้" ได้ไฟล์ `Orbitlab-<วันที่>.orbitlab-workspace.json`
   - Android: ดูในโฟลเดอร์ ดาวน์โหลด
   - iPad: แอป ไฟล์ → ดาวน์โหลด
3. กด "นำเข้าข้อมูลสำรองพื้นที่ทำงาน" เลือกไฟล์เดียวกัน
4. หน้าตรวจไฟล์ขึ้นก่อน ยังไม่มีอะไรเปลี่ยน ที่ "ปลายทางการนำเข้า" เลือก "สร้างผู้เรียนใหม่" ช่อง "ชื่อผู้เรียนใหม่" พิมพ์ `HU6-A-copy` หรือ `HU6-I-copy` แล้วกด "นำเข้าไฟล์ที่ตรวจแล้ว"
5. หน้าโหลดใหม่เอง และแอปเปิดผู้เรียน `HU6-…-copy` ให้ ดูว่าแบบ `HU6-sat` อยู่ในส่วนสร้างไหม (ถ้าทำข้อ 4) และบทเรียน 1.1 มีเครื่องหมายไหม (ถ้าทำข้อ 5)
6. กลับไปใช้ชื่อเดิม: "◉ ผู้เรียน: …" → แถว `HU6-A` หรือ `HU6-I` → "เปิดพื้นที่ทำงานนี้" → "ยืนยัน" หน้าโหลดใหม่เอง ข้อต่อไปใช้ชื่อนี้

**จด:** ไฟล์ไปอยู่ที่ไหน · หน้าเลือกไฟล์เปิดได้ไหม · ข้อมูลกลับมาครบไหม · กลับไปชื่อเดิมได้ไหม

### ข้อ 8 · ภาษาอังกฤษและรัสเซีย ขณะออนไลน์ **[ต้องทำ]** · 4 นาที

1. ที่ช่องเลือกภาษาทางขวาของแถบบน เลือก English
2. ดู: หน้าแรกจอแรก · รายการส่วนและระดับ · หน้าต่าง About (ปุ่ม ⓘ) · รายการบทเรียน (ปุ่ม ✎) · แผงตั้งค่าภารกิจและปุ่ม Launch
3. เปลี่ยนเป็น Русский แล้วดูชุดเดิม ข้อความรัสเซียยาวกว่า มักล้นบนจอแคบ
4. เปลี่ยนกลับเป็นไทย

**จด:** ข้อความที่ยังเป็นภาษาอื่น · ข้อความล้นหรือถูกตัด · ปุ่มซ้อนกัน (ถ่ายภาพ)

### ข้อ 9 · ติดตั้งแล้วใช้แบบออฟไลน์ **[ต้องทำ]** · 8 นาที

**ติดตั้ง (ยังออนไลน์อยู่)**

- Android: Chrome ⋮ → "ติดตั้งแอป" หรือ "เพิ่มลงในหน้าจอหลัก"
- iPad: Safari ปุ่มแชร์ → "เพิ่มไปยังหน้าจอโฮม"

1. Android: ปิดแท็บ Orbitlab ใน Chrome ก่อน แอปที่ติดตั้งใช้ข้อมูลชุดเดียวกับ Chrome ถ้าเปิดพร้อมกัน อันที่สองจะแก้ไขงานไม่ได้
2. เปิดแอปจากไอคอนบนหน้าจอหลัก ขณะยังมีเน็ต
3. ตรวจรหัสรุ่นอีกครั้งในหน้าต่าง "เกี่ยวกับ" (ปุ่ม ⓘ)
4. จดว่าเห็นโปรไฟล์ `HU6-…` หรือขึ้นเป็น "Learner 1" ใหม่ บน iPad แอปบนหน้าจอโฮมมักเก็บข้อมูลแยกจาก Safari ถ้าเป็น "Learner 1" ให้เปลี่ยนชื่อเป็น `HU6-I-app` ("เปลี่ยนชื่อ" → พิมพ์ → "บันทึกชื่อ")
5. รอแถบ "Orbitlab พร้อมใช้งานแบบออฟไลน์แล้ว" ถ้าไม่ขึ้นภายใน 2 นาที จดไว้ แล้วทำต่อ

**ออฟไลน์**

6. เปิดโหมดเครื่องบิน (ปิด Wi-Fi และ data)
7. ปัดแอปทิ้งจากรายการแอปล่าสุด
8. **[แนะนำ]** จับเวลาเปิดแอปขณะออฟไลน์: ตั้งแต่แตะไอคอนจนกดปุ่ม "ชมการปล่อยจรวด" ได้ จดเป็นวินาที
9. ตรวจว่า: หน้าแรกขึ้น · ชื่อผู้เรียนตรงกับก่อนออฟไลน์ (`HU6-A` หรือ `HU6-I-app`) · แบบ `HU6-sat` อยู่ในส่วนสร้าง (ถ้าทำข้อ 4 และแอปใช้ข้อมูลชุดเดียวกับเบราว์เซอร์) · รายการบทเรียนขึ้น
10. ที่หน้าแรก กด "ลองปล่อยจรวดเอง" → "ปล่อยจรวด" ปล่อยให้บินราว 1 นาที
11. ที่หน้าแรก สลับภาษา ไทย → English → Русский → ไทย ดูว่าตัวอักษรขึ้นครบ ไม่เป็นกล่องสี่เหลี่ยม
12. เปิดซ้ำขณะออฟไลน์: ปัดแอปทิ้งแล้วเปิดใหม่อีกครั้ง หน้าต้องขึ้นเหมือนเดิม
13. ปิดโหมดเครื่องบิน
14. ปัดแอปที่ติดตั้งทิ้ง ก่อนกลับไปใช้ Chrome หรือ Safari

**จด:** ติดตั้งได้ไหม · โปรไฟล์ตามมาหรือแยก · แถบพร้อมออฟไลน์ขึ้นไหม · ออฟไลน์เปิดได้ไหม งานอยู่ไหม บินได้ไหม · สามภาษาขึ้นครบไหม · เวลาเปิดขณะออฟไลน์ (ถ้าจับ)

### ข้อ 10 · สลับแอปและล็อกจอระหว่างบิน **[แนะนำ]** · 3 นาที

1. เริ่มเที่ยวบินใดก็ได้ (เช่น หน้าแรก → "ลองปล่อยจรวดเอง" → "ปล่อยจรวด")
2. ระหว่างบิน กลับหน้าจอหลัก เปิดแอปอื่นที่ใช้กราฟิกหนัก (เช่น กล้อง หรือวิดีโอ) ราว 30 วินาที แล้วกลับมา
3. กดปุ่มเปิดปิดของเครื่องให้จอล็อก ราว 30 วินาที แล้วปลดล็อก (จอไม่ดับเองเพราะตั้งไว้ตอนเตรียม จึงต้องกดเอง)

**จด:** ภาพ 3 มิติกลับมาไหม หรือเป็นจอดำ · เที่ยวบินยังอยู่ไหม · หน้าโหลดใหม่เองไหม

### ข้อ 11 · เปิดสองแท็บ **[เสริม]** · 2 นาที

ทำในเบราว์เซอร์ ไม่ใช่แอปที่ติดตั้ง

1. ตรวจก่อนว่าแอปที่ติดตั้งปิดอยู่ (ปัดทิ้งแล้ว) และมี Orbitlab เปิดอยู่แท็บเดียว
2. เปิดเว็บในแท็บที่สองขณะแท็บแรกยังเปิดอยู่
3. แท็บที่สองควรมีข้อความใต้แถบบนว่า "พื้นที่ทำงานของผู้เรียนนี้เปิดอยู่ในแท็บอื่น…" แปลว่าเครื่องนี้กันการแก้งานของผู้เรียนคนเดียวกันจากสองแท็บพร้อมกันได้
4. ถ้าขึ้นว่า "…งานนี้เป็นงานชั่วคราว…" แทน ให้จดไว้ แปลว่าเครื่องนี้กันไม่ได้ หรือเบราว์เซอร์ไม่ให้เก็บข้อมูล
5. ปิดแท็บที่สอง

**จด:** ข้อความที่ขึ้นในแท็บที่สอง (ถ่ายภาพ)

### ข้อ 12 · มอนติคาร์โลชุดใหญ่ แล้วดาวน์โหลด CSV **[ตามที่คุณตอบ]** · ลงมือราว 8 นาที (Android ราว 10) + รออย่างน้อย 15 นาที

ข้อนี้เพิ่มตามคำตอบ P3 (ข) ของคุณ: ดาวน์โหลดไฟล์ CSV ของชุดมอนติคาร์โลชุดใหญ่ด้วยมือ ซึ่งรายงาน FX-5 ยังค้างไว้ (หัวข้อ "Still to do")

- **iPad:** ใช้ Safari ไม่ใช่แอปบนหน้าจอโฮม
- **Android:** ใช้ Firefox ที่ติดตั้งตอนเตรียม ไม่ใช่ Chrome ก่อนเริ่ม ปิดแท็บ Orbitlab ใน Chrome และปัดแอปที่ติดตั้งทิ้ง
- Firefox บน iPad ไม่นับ เพราะข้างในใช้ WebKit ตัวเดียวกับ Safari ไม่ต้องทดสอบ
- การวัดหน่วยความจำสูงสุดของ Android (K1-10) ไม่อยู่ในข้อนี้และไม่อยู่ใน session นี้

**ชุดใหญ่แค่ไหน:** FX-5 ไม่ได้กำหนดจำนวนรอบ สิ่งที่ FX-5 แก้คือเวลาที่แอปเก็บไฟล์ไว้ให้เบราว์เซอร์ จาก 1 วินาทีเป็น 5 วินาที เพราะไฟล์ใหญ่บน Safari และ Firefox อาจได้ไม่ครบ ไฟล์ CSV มีหนึ่งแถวต่อรอบที่บินเสร็จ แถวละราว 0.22 kB ชุด 200 รอบ (ค่าเดิม) ได้ราว 45 kB ชุดใหญ่ที่สุดที่แอปให้ตั้ง (2000 รอบ) ได้ราว 440 kB แต่ต้องรันหลายชั่วโมง บนเครื่องของ agent (4 CPU) 6 นาทีได้ 9 รอบ ข้อนี้จึงตั้ง 2000 รอบ ปล่อยรันอย่างน้อย 15 นาที แล้วกดหยุด ไฟล์จะมีทุกรอบที่บินเสร็จ ถ้ามีเวลาปล่อยนานกว่านั้นได้ ไฟล์จะใหญ่ขึ้น

1. เสียบสายชาร์จถ้าทำได้ จอต้องไม่ดับระหว่างรัน (ตั้งไว้ตอนเตรียม)
2. **Android:** เปิด https://royin001.github.io/Orbitlab/ ใน Firefox ตรวจรหัสรุ่นตามหัวข้อ "ตรวจว่าเครื่องเปิดรุ่นทดสอบอยู่" ถ้าเว็บไม่ได้เปิดเป็นภาษาไทย เลือก ไทย ถ้าแถบ "Orbitlab พร้อมใช้งานแบบออฟไลน์แล้ว" ขึ้นภายใน 2 นาที รอให้ขึ้นก่อน
3. เลือกส่วน "ปล่อยจรวด" → ระดับ "วิศวกร" (บนโทรศัพท์เป็นปุ่มเดียวที่เปิดรายการส่วนและระดับ) ในแผงตั้งค่า (บนโทรศัพท์อยู่ใต้ภาพ) ที่หัวข้อ "เริ่มต้นอย่างรวดเร็ว" กด "วงโคจร ISS · เลือกเวลาปล่อยให้ตรง" สองเครื่องจะได้ภารกิจเดียวกัน
4. เลื่อนลงหาหัวข้อ "มอนติคาร์โล: ความแม่นยำการเข้าวงโคจร (G05)" แตะให้กางออก แล้วกด "เปิดหน้าต่างมอนติคาร์โล" บรรทัดใต้ชื่อหน้าต่างควรขึ้นต้นด้วย "Soyuz-2.1a จาก ท่าอวกาศยานไบโคนูร์" ถ้าไม่ใช่ จดไว้แล้วทำต่อ
5. ช่อง "จำนวนรอบ" (เดิม 200) พิมพ์ `2000` ช่องอื่นไม่ต้องแก้ อย่ากด "ค่าเริ่มต้น" เพราะจะกลับเป็น 200
6. กด "เริ่ม" แล้วจดเวลา บรรทัดข้างปุ่มจะขึ้นว่า "0 / 2000 รอบ · เหลืออีก … · n worker" จดเลข worker
7. รออย่างน้อย 15 นาที ไม่ต้องเฝ้า กรอกใบผลหรือทำข้อของอีกเครื่องได้ แต่บนเครื่องนี้:
   - ห้ามสลับแอปหรือแท็บ ห้ามโหลดหน้าใหม่
   - ห้ามแตะกราฟ (แตะจุดบนกราฟจะเปิดรอบนั้นเป็นเที่ยวบินเดี่ยว)
   - Android: ถ้าค่าปิดหน้าจอที่นานที่สุดสั้นกว่า 15 นาที ให้แตะข้อความคำอธิบายใต้ชื่อหน้าต่างทุก 5 นาที
   - รอบแรกเสร็จเมื่อตัวเลขเปลี่ยนจาก 0 (บนเครื่องของ agent ใช้ราว 2 นาที) เครื่องช้าอาจนานกว่ามาก ถ้า 25 นาทีแล้วยังเป็น 0 ให้กด "หยุด" จด "0 รอบใน 25 นาที" แล้วจบข้อนี้ (ปุ่มดาวน์โหลดกดไม่ได้จนกว่าจะมีรอบที่เสร็จ)
8. ก่อนหยุด จดบรรทัดข้างปุ่มทั้งบรรทัด เช่น "37 / 2000 รอบ · เหลืออีก 15 ชม. 20 นาที · 5 worker" แล้วกด "หยุด" บรรทัดจะลงท้ายว่า "หยุดแล้ว" จดเวลา
9. เลื่อนลงล่างสุดของหน้าต่าง ใต้กราฟ กด "ดาวน์โหลด CSV" แล้วเริ่มจับเวลา
   - iPad: ถ้า Safari ถาม ให้กด "ดาวน์โหลด" (ไม่ใช่ "ดู") ทันที
   - Android: ถ้า Firefox ถาม ให้กดดาวน์โหลดทันที
   - หยุดจับเวลาเมื่อเบราว์เซอร์บอกว่าดาวน์โหลดเสร็จ
10. หาไฟล์ `orbitlab_montecarlo_soyuz21a_iss_seed1.csv` แล้วจดขนาด
    - iPad: ปุ่มลูกศรดาวน์โหลดบนแถบของ Safari หรือแอป ไฟล์ → ดาวน์โหลด
    - Android: Firefox ⋮ → ดาวน์โหลด หรือแอปไฟล์ → ดาวน์โหลด
    - ขนาดที่คาด: ราว 0.5 kB บวก 0.22 kB ต่อรอบ เช่น 40 รอบราว 9 kB
11. แตะเปิดไฟล์ จดชื่อแอปที่เปิด (เช่น แอป ไฟล์, Numbers, Google ชีต) ดูว่าขึ้นเป็นตาราง เลื่อนถึงแถวสุดท้ายแล้วแถวนั้นมีตัวเลขครบ ถ้าแอปแสดงเลขแถว เลขแถวสุดท้ายควรเท่ากับจำนวนรอบที่เสร็จบวก 1 (แถวหัว)
12. **ยืนยันช้า** (ทำเฉพาะเมื่อข้อ 9 มีหน้าต่างถาม ราว 1 นาที): กลับไปที่หน้าต่างมอนติคาร์โล กด "ดาวน์โหลด CSV" อีกครั้ง เมื่อหน้าต่างถามขึ้น นับ 10 วินาทีก่อนกดดาวน์โหลด จดว่าได้ไฟล์ที่สองขนาดเท่าไฟล์แรกไหม หรือขึ้นว่าดาวน์โหลดไม่ได้ (ถ่ายภาพ) ไฟล์ที่สองอาจมีเลขต่อท้ายชื่อ เหตุที่ลอง: แอปเก็บไฟล์ไว้ให้เบราว์เซอร์ 5 วินาที ข้อนี้ดูว่ากดยืนยันช้ากว่านั้นแล้วยังได้ไฟล์ไหม
13. ปิดหน้าต่างมอนติคาร์โล (×) ถ้าทำข้อ 13 ต่อบน Android ให้กลับไปใช้ Chrome

**จด:** เบราว์เซอร์และรุ่น · รหัสรุ่นใน "เกี่ยวกับ" ของ Firefox · บรรทัดใต้ชื่อหน้าต่าง ถ้าไม่ใช่ Soyuz-2.1a · เลข worker · เวลาเริ่มและเวลาหยุด · บรรทัดก่อนหยุด · จำนวนรอบที่เสร็จ · หน้าต่างถามขึ้นไหม · เวลาดาวน์โหลด (วินาที) · ไฟล์ลงที่ไหน · ขนาดไฟล์ · เปิดด้วยแอปอะไร · แถวสุดท้ายครบไหม · ยืนยันช้าแล้วได้ไฟล์ไหม · เครื่องร้อนไหม · ถ้าสะดวก แนบไฟล์ CSV มากับผลด้วย

### ข้อ 13 · ภารกิจ Falcon 9 เต็ม **[เสริม]** · 6 นาที

1. (Android: ใน Chrome) ส่วน "ปล่อยจรวด" → ระดับ "รับชม" → ปุ่ม "เลือกการปล่อย" → "Falcon 9: ภารกิจ Bandwagon-1"
2. ดูจนการ์ดท้ายขึ้น จอต้องไม่ดับ ห้ามโหลดหน้าใหม่ และห้ามสลับแอป
3. จดเหมือนข้อ 2 รวมเวลาบนการ์ดท้าย

### หลังเสร็จ

1. **คืนค่าล็อกจอ** ของทั้งสองเครื่องเป็นค่าเดิมที่จดไว้
2. ไม่บังคับ: ลบโปรไฟล์ทดสอบได้ที่ "◉ ผู้เรียน: …" → แถวชื่อนั้น → "ลบโปรไฟล์" → "ลบผู้เรียนและงานของคนนี้" และลบแอปออกจากหน้าจอหลักได้
3. ไม่บังคับ: ลบไฟล์ CSV ของข้อ 12 และถอนการติดตั้ง Firefox ได้

---

## ส่งผลกลับ

1. กรอกใบผลส่วน ก ข ค ง ด้านล่าง
2. ส่งใน chat ของ session นี้ จะวางข้อความหรือถ่ายรูปใบกระดาษก็ได้
3. แนบภาพหน้าจอ ชื่อตามรูปแบบ `A-4-1` และถ้าสะดวก แนบไฟล์ CSV ของข้อ 12 (agent จะนับแถวในไฟล์ให้ และเขียนแยกว่าเป็นการตรวจของ agent)
4. เขียนบรรทัดแรกว่า "HU-6 เสร็จ" พร้อมวันที่และเวลา
5. agent จะเขียนบันทึกภาษาอังกฤษจากสิ่งที่คุณส่งเท่านั้น ถ้ามีจุดไม่ชัดจะถามกลับ ไม่เดาแทน

---

## ใบผล

### ส่วน ก · ข้อมูล

| รายการ | Android (A) | iPad (I) |
|---|---|---|
| วันที่และเวลาเริ่ม (เวลาไทย) | | |
| รหัสรุ่นที่ agent แจ้ง (ปกติ `7263004`) | | |
| รหัสรุ่นใน "เกี่ยวกับ" ในเบราว์เซอร์ | | |
| รหัสรุ่นใน "เกี่ยวกับ" ในแอปที่ติดตั้ง (ข้อ 9) | | |
| รหัสรุ่นใน "เกี่ยวกับ" ใน Firefox (ข้อ 12) | | (iPad ไม่ใช้) |
| ค่า `commit` ใน build-info.json (ถ้าเปิดดู) | | |
| ยี่ห้อและรุ่นเครื่อง | | |
| รุ่น Android หรือ iPadOS | | |
| RAM (GB) | | (iPad ไม่แสดง เว้นได้) |
| เบราว์เซอร์และรุ่น | Chrome ____ · Firefox ____ | Safari (รุ่นเดียวกับ iPadOS) |
| เครือข่าย: Wi-Fi / data เติมเงิน / data รายเดือน | | |
| โหมดประหยัดแบต: เปิด / ปิด | | |
| ล็อกจอ: ค่าเดิม → ค่าที่ตั้งวันนี้ · คืนค่าแล้ว: ใช่ / ไม่ | | |
| ปุ่มรูปเมฆบนแถบบน: มีขีดทับ / ไม่มีขีด | | |
| เคยเปิด Orbitlab บนเครื่องนี้: เคย / ไม่เคย · ล้างข้อมูล: ล้าง / ไม่ล้าง | | |
| ภาษาที่เว็บเปิดขึ้นมาเอง | | |
| ข้อความใต้แถบบน (ถ้ามี) | | |

### ส่วน ข · ผลรายข้อ

ใส่ ✓, ✗ + 1 บรรทัด + ชื่อภาพ หรือ –

| ข้อ | ป้าย | Android (A) | iPad (I) |
|---|---|---|---|
| 1 เปิดครั้งแรก ภาษา รหัสรุ่น โปรไฟล์ · หน้า "เปิดมุมมองสามมิติไม่สำเร็จ" ขึ้นไหม | ต้องทำ | | |
| 1 เวลาเปิดครั้งแรก (วินาที) | แนะนำ | | |
| 1 เวลาเปิดซ้ำ กดโหลดใหม่ในเบราว์เซอร์ (วินาที) | แนะนำ | | |
| 2 โซยุซเต็ม: ถึงการ์ดท้าย / เวลาบนการ์ดท้าย / โหลดใหม่เองไหม / นาทีจริง / ปุ่มความเร็วที่เร็วที่สุด / จอดับไหม | ต้องทำ | | |
| 3 แบบจำลองการบิน (6-DOF หรือ มวลจุด) | แนะนำ | | |
| 3 ความเร็วจำลองที่ทำได้จริง ที่ 1× และที่ค่าสูงสุด | แนะนำ | | |
| 3 หมุนจอ ปุ่ม ตัวอักษรไทย | แนะนำ | | |
| 4 สร้าง → ปล่อย → วงโคจร | เสริม | | |
| 5 บทเรียน 1.1 | แนะนำ | | |
| 6 แบบทดสอบ 5 ข้อ + กลับมาทำต่อ | แนะนำ | | |
| 7 ส่งออกและนำเข้า · กลับไปชื่อเดิม | แนะนำ (iPad) · เสริม (Android) | | |
| 8 English | ต้องทำ | | |
| 8 Русский | ต้องทำ | | |
| 9 ติดตั้ง · โปรไฟล์ตามมาหรือแยก · แถบพร้อมออฟไลน์ | ต้องทำ | | |
| 9 ออฟไลน์: เปิด / งานอยู่ / บิน / สามภาษา / เปิดซ้ำ | ต้องทำ | | |
| 9 เวลาเปิดแอปขณะออฟไลน์ (วินาที) | แนะนำ | | |
| 10 สลับแอปและล็อกจอ | แนะนำ | | |
| 11 สองแท็บ (ข้อความที่ขึ้น) | เสริม | | |
| 12 ชุด: เบราว์เซอร์ · บรรทัดใต้ชื่อหน้าต่าง (ถ้าไม่ใช่ Soyuz-2.1a) · worker · เวลาเริ่มและหยุด · บรรทัดก่อนหยุด · รอบที่เสร็จ | ตามที่คุณตอบ | Firefox: | Safari: |
| 12 ดาวน์โหลด: หน้าต่างถามขึ้นไหม · เวลา (วินาที) · ไฟล์ลงที่ไหน · ขนาด (kB) | ตามที่คุณตอบ | | |
| 12 เปิดไฟล์: แอปที่เปิด · เป็นตาราง · แถวสุดท้ายครบ · เลขแถวสุดท้าย (ถ้าแอปแสดง) | ตามที่คุณตอบ | | |
| 12 ยืนยันช้า 10 วินาที: ได้ไฟล์ไหม · ขนาด (– ถ้าไม่มีหน้าต่างถาม) | ตามที่คุณตอบ | | |
| 12 แนบไฟล์ CSV มาด้วย: ใช่ / ไม่ | — | | |
| 13 Falcon 9 เต็ม (จดเหมือนข้อ 2) | เสริม | | |
| ตลอด session: เครื่องร้อน แบตลดเร็ว ข้อความที่ขึ้นเอง | — | | |

### ส่วน ค · ปัญหาที่พบ

| # | เครื่อง | ข้อ | เกิดอะไร (1–2 บรรทัด) | ทำซ้ำแล้วเกิดอีกไหม | ความรุนแรง 1–4 | ภาพ |
|---|---|---|---|---|---|---|
| 1 | | | | | | |
| 2 | | | | | | |
| 3 | | | | | | |

### ส่วน ง · ความเห็นอื่น (สั้น ๆ)

-
````

### Task 12: the agent's local reference (not a device reading)

Agent's local reference, not a device reading. From the GK1 session's run of 2026-10-26, 19:29–19:39Z (local run, not committed; not reachable from the K2 session). Appendix A's comment and its task-12 table use these numbers as "expected"; they are never a device result.

- **Build and stamp.** `npx vite build` of `7263004` in a full clone: `build-info.json` `"commit": "72630046"`, 8 characters. Pages checks out at depth 1 (`actions/checkout@v4`, no `fetch-depth`), and a depth-1 fetch of the candidate gives `git rev-parse --short` = `7263004`. So the live About dialog shows `v0.1.0 · 7263004` (`src/ui/dialogs.ts:219`) and `build-info.json` `"commit": "7263004"`.
- **Machine.** 4 CPUs, Linux; Node 22.22.0; Vite 8.3.0; Chrome for Testing 153 (headless) with SwiftShader (`--use-gl=angle --use-angle=swiftshader`).
- **Run.** `#/launch/engineer` at 1024×768 in Thai, "มอนติคาร์โล: ความแม่นยำการเข้าวงโคจร (G05)" → "เปิดหน้าต่างมอนติคาร์โล", the default 200 runs, Stop after 6 min. `hardwareConcurrency` 4, so 3 workers. Mission line: "Soyuz-2.1a จาก ท่าอวกาศยานไบโคนูร์ · วงโคจรเป้าหมาย 420 × 420 กม. ที่ 51.64° · วงโคจรเข้าตามแผน 200 × 242 กม. · 6-DOF · มาตรฐาน". Runs: default 200, min 20, max 2000. Progress: 0 runs up to 108 s; 3 at 123 s ("เหลืออีก 1 ชม. 59 นาที"); 9 at 318 s ("เหลืออีก 1 ชม. 50 นาที"); after Stop "9 / 200 รอบ · หยุดแล้ว". One run took about 110–120 s per worker, so a full 200-run set would take about 2 h on that machine; a low-cost Android is likely slower.
- **CSV.** `orbitlab_montecarlo_soyuz21a_iss_seed1.csv`: 2 478 bytes = a 498-byte header (with its newline) + 9 rows of 220 bytes; 32 columns; runs 0–8, all `standard,inserted`; `final_time_s` of run 0 = 3348.3; SHA-256 `fcee3c10fe392e60df9aad79e69d0053310d06b175510b19ad54076aebdd1e75`. The CSV holds one row per finished run only (`monteCarloCsv`, `src/physics/monte-carlo.ts:350`), so stopping early gives a smaller file, not a cut one.
- **Expected size:** about 0.5 kB + 0.22 kB per finished run: 200 runs ≈ 44.5 kB; 2 000 runs ≈ 440 kB; 2 000 runs with the three-guidance-law box ≈ 1.3 MB.
- **Phone size.** At 390×844 with touch in Thai, Quick start's "วงโคจร ISS · เลือกเวลาปล่อยให้ตรง" reaches the same mission line. The window is 366×760 and scrolls (scrollHeight 1020, clientHeight 758), so "ดาวน์โหลด CSV" is at the bottom, under the charts, and shows only once a run has finished (`src/ui/monte-carlo.ts:244`, `:396`, `:407`).
- **Why the 10-second confirm.** FX-5 names no set size (`FX-5-s4-csv-export.md:22`, `:126`). Its risk is a download cut off when the file's URL is revoked, after 5 s now (1 s before; `src/ui/download.ts`, `src/ui/monte-carlo.ts:371-374`), so the guide asks for a second download confirmed after 10 s where the browser asks first.
