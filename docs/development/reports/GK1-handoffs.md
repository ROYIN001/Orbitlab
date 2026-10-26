# GK1 hand-off and out-of-scope check per package / ตรวจงานส่งต่อและงานนอกขอบเขตของทุกแพ็กเกจ (GK1)

> **สรุปสำหรับเจ้าของ (ภาษาไทย)**
>
> - ไฟล์นี้คือรายการตรวจ GK ข้อ 10: งานส่งต่อ (hand-off) และงานนอกขอบเขตของทุกแพ็กเกจต้องมีเจ้าของ และถูกตรวจซ้ำ (S05:120) GK0 ไม่ได้ตรวจข้อนี้ ไฟล์นี้จึงครอบ K0 ด้วย
> - ตรวจซ้ำบน candidate `7263004` (Pages 40385448079 เผยแพร่เมื่อ 2026-10-26 19:41:58Z) และบน records PR #181 (`5092ac9`) ซึ่งบันทึกคำตอบ P1–P5 ของคุณ ไฟล์นี้มีแค่ข้อเท็จจริงและข้อเสนอ ไม่มีการลงนามแทนคุณ
> - ทั้งหมด 153 แถว: เสร็จหรือตัดสินแล้ว 42 · กำลังทำ 2 · มีเจ้าของในบันทึกแต่ยังเปิด 66 · ไม่มีเจ้าของ 42 · ไม่มีงาน 1
> - เปลี่ยนจากร่างที่ `a05ae70`:
>   - K1-07 (เพดาน brotli) ตัดสินแล้ว: P5 ก ยังไม่ตั้ง
>   - K1-33 (ข้อความ ISS ในทัวร์ท้องฟ้า) ไม่นับว่า "หาย" แล้ว: P4 ก ย้ายไปแถว re-plan ของ K2 และ #181 แก้แถว FX-3 ใน PROGRESS แต่โค้ดยังไม่ได้แก้
>   - K1-41 (ดาวน์โหลด CSV บน Safari และ Firefox) อยู่ในชุด HU-6 ข้อ 12 ตาม P3 ข ส่วน K1-10 (หน่วยความจำ Android) ยังค้าง
>   - เสร็จตอน freeze: #179 ลดเพดานแล้ว (K1-75, K1-92) · journey ที่พัก 6 ตัวผ่าน 6/6 บน build ที่เปิดเครื่องมือครู ซึ่งรันในเครื่องและไม่ commit (K1-79) · `r7-cross-system` ผ่านบน candidate (K0-42) · KPI-28 และ D-64 ที่ GK1 (K0-17, K0-21)
>   - แถวใหม่ 2 แถวจากงานตอน freeze: K1-110 บนมือถือ กด Escape ครั้งเดียวตอนรายการส่วนเปิดอยู่ แอปออกจากหน้าบทเรียนด้วย (บั๊กเดิมก่อน K1) และ K1-111 สิ่งที่ `measure.mjs` ต้องแก้ก่อนนำเข้า main
> - ไม่มีเจ้าของ 42 แถว (จำนวนเท่าเดิม แต่คนละชุด) 39 แถวมีเลนที่ agent เสนอ ข้อเสนอยังไม่ใช่การมอบงาน (คำถาม S7)
> - ยังไม่เคยมีใครถามคุณ 10 แถว รวม 19 คำถาม (K1-07 ถามแล้วใน P5) และส่งต่อผิดที่ 1 แถว (K1-52 `exportAll()` อ่านข้อมูลซ้ำ)
> - **รอ session HU-6 ของคุณ:** K1-90 (ตัว session), K1-41 (CSV), ส่วนเครื่องจริงของ K0-40 และลิงก์ HU-6 ของ K1-78 ช่องเหล่านี้เว้นไว้ ไม่มีการเดาผล
> - คำถามที่ไฟล์นี้ใช้: S1, S3, S4, S7, S10, S12

```yaml
envelope: v2
package: GK1 record (GK checklist item 10, S05:120; hand-off and out-of-scope check per package)
wave: K1 (records slot)
lane: I
change_kind: docs
owner_authorization:
  - {date: 2026-10-24, quote: "ก: ทำข้อ GK แล้วรัน GK1 (แนะนำ)", where: "DECISIONS:344 (readiness report decision 1)"}
  - {date: 2026-10-26, quote: "ข เพิ่มเฉพาะ CSV (แนะนำ)", where: "DECISIONS:367 @5092ac9 (P3: K1-41 in the HU-6 session; K1-10 stays open)"}
  - {date: 2026-10-26, quote: "ก ไม่เพิ่ม (แนะนำ)", where: "DECISIONS:368 @5092ac9 (P4: K1-33 to the re-plan; pd-r41-s1 after GK1)"}
  - {date: 2026-10-26, quote: "ก ไม่ตั้งตอนนี้ (แนะนำ)", where: "DECISIONS:369 @5092ac9 (P5: K1-07, no compressed ceilings now)"}
candidate_sha: 72630046fc5eb56f1797e5363b6f9ad293ff9d38   # main after #179; published by Pages 40385448079
base_sha: 5092ac9   # records PR #181 (folds #179; the owner's answers for #179 and P1-P5); open, no merge until the owner's HU-6 session ends
base_sha_verified_on: {sha: 7263004, date: 2026-10-26, check: "git ls-remote origin refs/heads/main = 72630046… at 22:45:49Z; PR list read 22:46Z: #181 open, nothing merged after #179"}
line_numbers: "every repo file at 7263004, unless marked @5092ac9; plan drafts at c2af8ae"
hu6: waits for the owner's HU-6 session
signed: none   # owners for the rows with none, the re-plan row and K2 (D-65) wait for the owner
```

**How to read this file.**
- `PROGRESS:n`, `DECISIONS:n` and other `file:n` are the files at the candidate `7263004`, unless marked `@5092ac9`.
  - At `5092ac9`, PROGRESS lines from 114 on sit one line lower. DECISIONS lines up to 357 are the same. The rows for #179's Merge Desk and the answers P1–P5 exist only `@5092ac9` (`DECISIONS:364-369`).
  - `src/`, `tests/` and every report except `GK1-ceilings-q03-1.md` are the same at both commits.
- Plan drafts are cited at `c2af8ae` (plan branch `claude/hopeful-allen-1o0vmh`, `docs/development/plan-v2-draft/sections/`).
- **Local run, not committed** marks evidence from a build or script run in the integration session on 2026-10-26. Its numbers are here; its files are not in the repository.
- **Waits for the owner's HU-6 session** marks a slot that only the owner's session fills.
- Times are UTC on 2026-10-26 unless a date is given.

## Rule

- GK checklist item 10: "รายการ handoff/out-of-scope ของทุกแพ็กเกจมีเจ้าของและถูกตรวจซ้ำ" (`S05:120`).
- Every hand-off or out-of-scope item has an owner, and I re-checks it at the next GK (`S18:233`, process lesson 3).
- Each package report lists its hand-offs with owners (`S18:433`).
- GK0 did not run this item. Its checklist line has no hand-off entry (`kpi-GK0.md:46`). So this is the first check, and it covers K0 too.

## Method

- **Scope:** every package with wave K0 or K1 in `docs/development/plan/data/packages.tsv`; their PROGRESS register rows (`PROGRESS:122-214`); `HANDOVER-K1.md` §5, §6, §7 and §9; the R0.2r ADR "Open points"; S06 §06.5 (the K0 plan's out-of-scope table); GK0's "Carried into K1"; lane work outside the packages (the T lane's offsets and test fixes, the owner's requests); and the hand-offs of #175, #176, #177 (2b) and #179 (the ceilings PR).
- **Sources read:** each report's hand-off, limits, not-done, left-open and owner sections, for every report under `docs/development/reports/` from #84 on, and #155's review `docs/history/2026-10-17/ARGON4-REVIEW.md` ("For the owner", `:75-84`).
  - Merged PRs from #84 on that add no report and change more than docs: #100, #104, #108, #111, #112, #118, #129, #138, #146, #153, #154, #158, #160, #164, #168. Their PR bodies were read, except #168's (see "Not verified").
  - The records-only and docs-only PRs (#94, #115, #116, #119, #121, #142, #143, #150, #161, #163, #165, #166, #170, #178, #180, #181) are the records this check reads. #119's ADRs are K1-01.
- **Three passes.**
  1. Triage on `c5da5bb` (#176), about 14:40–15:30Z, starting from an earlier M-PLAN-026 triage of 85 items (local, not committed).
  2. Brought to `a05ae70` (#177) at about 16:45Z.
  3. Re-checked at the freeze, about 22:30–22:50Z, on the candidate `7263004` and on #181's `5092ac9`. Between `a05ae70` and the candidate only #180 (records) and #179 (`budgets.json`, its report and its fragment) merged. `git diff --stat a05ae70 7263004 -- src tests` is empty, so every code and test line cited is unchanged since the `a05ae70` pass. #181 changes Markdown only.
- **Read again at the freeze:** #179's report (whole); 2b's "Not in this step" (`FX-2-s2b-m-learning-027-writer.md:141-146`); `DECISIONS:364-369 @5092ac9` (#179's Merge Desk and P1–P5); register rows FX-3 and HU-6 `@5092ac9`; the candidate's Pages run 40385448079 (all 11 jobs and the journey lines of its three browser shards); and five local evidence write-ups, not committed: the D-64 check, KPI-28, the decision-7 run of the held journeys, the P1 baselines and the P2 revert drill.
- **Machine check:** the M-PLAN-026 hand-off extractor, re-run at the freeze cutoff 2026-10-26T19:42:02Z, read 58 K1 reports and found 579 candidate lines, #177's and #179's reports among them (local run, not committed). The hand-off checks of KPI-35 gave 53 pass and 0 fail over the hand-off set as it stood at #176 ([kpi-GK1.md](kpi-GK1.md), KPI-35). The rows for #177 and #179 were checked by hand.
- **"Owner now"** is the owner the records name: a lane, package, plan item (M-id), card or DECISIONS row. "none" means no record outside the report names one.
- **"propose"** is a proposal from the lane write sets (`S18` §18.2). It is not an assignment. A new M-id needs the owner's acceptance at a GK.
- **Evidence** is a file and line, a commit, a PR or a run id. `git ls-remote origin` was read at 2026-10-26T22:45:49Z: 61 heads, no tags.

Status values: **done** (on main, with evidence) · **in progress** · **recorded** (an owner and a plan item, card or record name it; still open) · **report-only** (no owner or record outside the report) · **dropped** (an owner was named, the work is not done, and a later record says it is done) · **decided** (closed by an owner's answer).

Flags:
- `NO OWNER`: no owner outside the report.
- `NOT ASKED`: the report leaves it "for the owner", but no card, chat question or DECISIONS row ever asked it.
- `DROPPED`: as above. No row has it at the freeze (see K1-33).
- `DONE`: done on the candidate.
- `RE-PLAN`: remaining K1 scope. The re-plan row of decision 1 (ก) moves it to K2. That row is a proposal; the owner approves it before K2 (`S05:434`; owner question S3).
- `HU-6`: waits for the owner's HU-6 session.
- The draft's `AT FREEZE` flag is retired: every such row was re-checked on the candidate.

## Summary

| Wave | Rows | done or decided | in progress | recorded, owner named, open | no owner | dropped | no items |
|---|---|---|---|---|---|---|---|
| K0 | 42 | 17 | 0 | 20 | 5 | 0 | 0 |
| K1 | 111 | 25 | 2 | 46 | 37 | 0 | 1 |
| Total | 153 | 42 | 2 | 66 | 42 | 0 | 1 |

Each row is counted once, in one column:
- K0, done or decided (17): K0-03, 06, 07, 10, 11, 12, 16, 17, 20, 21, 23, 26, 27, 29, 32, 41, 42.
- K0, recorded (20): K0-01, 02, 04, 05, 08, 14, 15, 22, 24, 25, 28, 30, 31, 33, 35, 36, 37, 38, 39, 40.
- K0, no owner (5): K0-09, 13, 18, 19, 34.
- K1, done or decided (25): K1-07, 12, 18, 19, 23, 29, 30, 37, 39, 42, 43, 46, 47, 50, 70, 75, 79, 84, 92, 93, 97, 98, 99, 103, 107.
- K1, in progress (2): K1-78, 85.
- K1, recorded (46): K1-02, 04, 05, 06, 09, 10, 13, 14, 15, 17, 22, 25, 26, 27, 28, 33, 40, 41, 45, 48, 51, 56, 57, 58, 60, 61, 63, 64, 65, 68, 69, 71, 77, 82, 83, 86, 87, 88, 89, 90, 101, 102, 104, 105, 106, 108.
- K1, no owner (37): K1-01, 03, 08, 11, 16, 20, 21, 24, 31, 32, 34, 35, 36, 38, 44, 49, 52, 53, 54, 55, 59, 62, 66, 67, 72, 73, 74, 76, 80, 81, 94, 95, 96, 100, 109, 110, 111.
- K1, no items (1): K1-91.

"Recorded" includes the `RE-PLAN` rows (remaining K1 scope with a named package), the rows that rest on an owner's answer and name an owner, and the `HU-6` rows.

The 21 ADR open points are in Appendix A and count as one row (K1-01): 3 tied to plan items, 1 partly tied, 1 settled, 16 with no owner.

- **No owner: 42 rows.** The same number as on `a05ae70`, but not the same rows.
  - Left: K1-07 (decided by P5) and K1-41 (P3 put it in the HU-6 session).
  - Joined at the freeze: K1-110 (the Escape bug on the lessons page) and K1-111 (`measure.mjs` fixes).
  - K1-01 holds the 16 ADR points. K1-52 is a hand-off routed to a plan item that does not cover it. K1-31 joined at `a05ae70`.
  - 39 rows carry a proposed lane. K0-13, K1-24 and K1-62 carry none, because each is a question for the owner.
- **Never asked: 10 rows hold 19 questions** (`NOT ASKED`): K0-13, K0-31, K1-08, K1-24, K1-38, K1-59, K1-62, K1-72, K1-76, K1-96. K0-31 alone holds HU-1's Q-1…Q-8. K1-07 was the eleventh; P5 asked and answered it.
- **Dropped: none at the freeze.** K1-33, FX-3's ISS sky step, was dropped until 2026-10-26: `PROGRESS:151` said every FX-3 K1 item was merged, and the code was never changed. P4 (ก) sent it to the re-plan, and #181 corrects the register row (`PROGRESS:152 @5092ac9`). The code is still unchanged on the live site (`src/i18n/en.ts:1299`, `src/orbit/sky-tour.ts:32`, both from `c0bc958`, 2026-09-27).
- **Misrouted (no record says done, no owner covers it):** K1-52, R1.6's `exportAll()` double read. PR6's report left it to M-PLATFORM-005 (PR4), but M-PLATFORM-005 is the profile dialog's re-parsing (`registry.tsv`, `assignment.tsv`). `src/workspace/repository.ts:445` is from `5eb18a2` (2026-10-03; `git blame` at the candidate).
- **Done at the freeze:** #179 lowered the ceilings (K1-75, K1-92); 2b is published (K1-30); `r7-cross-system` passed on the candidate (K0-42); KPI-28 and the D-64 check at GK1 are recorded (K0-17, K0-21); the six held journeys ran on a teaching-tools build (K1-79, local run, not committed); the hand-offs of 2b and #179 were read (K1-107).
- **Waits for the owner's HU-6 session:** K1-90 (the session), K1-41 (the CSV download), the real-device part of K0-40, and the HU-6 link of K1-78. K1-10 is not in this session (P3).
- **Counts differ from the earlier M-PLAN-026 triage** (85 items: 23 picked up, 4 in progress, 29 recorded, 29 report-only):
  - This check adds K0 (42 rows), HANDOVER §9, S06 §06.5, the report-less PR bodies and the two freeze rows.
  - It merges a few triage rows and splits others.
  - On the ADR points it finds 3 tied to plan items, not 2. Handoff open point 3 matches M-PLAN-028.

### Changed at the freeze (against the `a05ae70` pass)

| Row | On `a05ae70` | On `7263004` / `@5092ac9` | Why |
|---|---|---|---|
| K0-04 | recorded; re-check at freeze | recorded · GK2 | #179 lowered every K1 ceiling; KPI-30 is 0; the named offsets are K2 work |
| K0-17 | done; KPI-28 at GK1 at freeze | done | KPI-28 measured on the newest 10 PR CI runs |
| K0-21 | done; GK1 at freeze | done | D-64: heavy 40240193599 and fleet 40144277552 stand for the candidate |
| K0-40 | recorded; HU-6 at freeze | recorded · `HU-6` | the session is not done |
| K0-42 | in progress | done | `r7-cross-system` passed in Pages 40385448079 |
| K1-07 | `NO OWNER`, `NOT ASKED` | decided | P5 (ก): no compressed ceilings now |
| K1-10 | recorded; HU-6 at freeze | recorded · GK2 | P3 (ข): not in the GK1 session; stays open |
| K1-30 | done (merged); publication at freeze | done | Pages 40357991698 published `a05ae70`; the revert drill passed 48/48 |
| K1-33 | `DROPPED` | recorded · `RE-PLAN` | P4 (ก); #181 corrects the FX-3 row; code unchanged |
| K1-41 | `NO OWNER` | recorded · `HU-6` | P3 (ข): task 12 of the HU-6 session |
| K1-60 | after GK1 | after GK1 (confirmed) | P4 (ก) |
| K1-75, K1-92 | not done; at freeze | done | #179 |
| K1-78 | recorded; at freeze | in progress | the candidate's run is done; the HU-6 link waits |
| K1-79 | not done; at freeze | done | 6/6 on a teaching-tools build (local run, not committed) |
| K1-85 | in progress; at freeze | in progress | `K1-retro.md` is in this record PR, re-run at the freeze cutoff |
| K1-90 | not done; at freeze | not done · `HU-6` | the session is not done |
| K1-106 | open | open | new fact: the teaching-tools build is over two ceilings |
| K1-107 | 2b read; ceilings PR not opened | done | #179's report read |
| K1-108 | recorded; at freeze | recorded · GK2 | the candidate's shard times are recorded |
| K1-109 | `NO OWNER` | `NO OWNER` | `classroom-preparation` passed in the decision-7 run |
| K1-110, K1-111 | — | new · `NO OWNER` | found by the decision-7 run and the P1 baselines |

## Wave K0 (packages CO-1…CO-8, HU-1, and the K0 parts of R0.4 and DEC)

| # | Package (lane) | Item | Source | Owner now | Status on `7263004` | Evidence | Flag · next re-check |
|---|---|---|---|---|---|---|---|
| K0-01 | CO-1 (T+I) | Record the first Pages run that passes the split budget (criterion 6): its run id, the `precache code` and `precache data/` lines, the deployment record, and one cron or dispatch run | `CO-1-budget-split.md:132` | CO-1; I records | partly done (run id only) | `PROGRESS:39` (criterion (6): Pages 37333861041 at `d7ee6fb` passed) gives the run id only. No precache lines, deployment record or cron/dispatch run are recorded. The report's only commit is #84, so `:132` still says "stays open" | records fix for I (the missing values) · GK2 |
| K0-02 | CO-1, CO-2, K0 retro | `learner-profiles` reload stall: record each failure for M-PLATFORM-061, and do not re-run blindly | `CO-1-budget-split.md:133`; `CO-2-closeout.md:109-121`; `K0-retro.md:56-58` | R7.1 M-PLATFORM-061 (Q/T) | recorded; cause not found | `assignment.tsv` M-PLATFORM-061 is open, and its notes name the stall. 20/20 on `007b039` (#150). `R7.1-GK1.md:79` routes new stalls there. On the candidate it passed in 122.9 s (Pages 40385448079, browser (2), job 121793499914) | GK2 |
| K0-03 | CO-1 | CO-2's ceiling review uses the D-38 `_notes` entry | `CO-1:134` | CO-2 | done | `CO-2-closeout.md:87-107` (#88) | `DONE` |
| K0-04 | CO-1 | The offsets named for the K0 raises (EQ-1, EQ-6, EQ-7, EQ-8) are plan estimates, not measured | `CO-1:127` | EQ-6, EQ-7, EQ-8 (K2, K2–K5 and K3, not authorized, `PROGRESS:145-147`); D-38 (`DECISIONS:33`) | recorded; offsets not delivered | #179 lowered every ceiling raised in K1 to the size measured on `a05ae70` (`GK1-ceilings-q03-1.md`). KPI-30 is 0 at the freeze: every one of K1's 17 raises names an offset and an approval ([kpi-GK1.md](kpi-GK1.md) § KPI-30). EQ-1 (#130) cuts download bytes, not the precache (`CO-1:127`). Of the named offsets only the GLSL compaction (#155, #158) is delivered (GK1 readiness report, notes under its ceilings table) | GK2 (the EQ-6/EQ-7 offsets are K2 work by `q03` B, `DECISIONS:170`) |
| K0-05 | CO-2 (I) | Fixtures must include the v1 hand-off and the optional `MissionDocument.design` | `CO-2-closeout.md:169` | R1.6 (L), R0.2r (S) | picked up for storage | EO-STO-1 pins a mission from before #77, with no `design` (`tests/eo-sto/harness.ts:208`, #132). No record shows each fixture through initialize, list, export and import ([kpi-GK1.md](kpi-GK1.md) § G1+) | `RE-PLAN` (G1+) |
| K0-06 | CO-2 | The M-PLAN-017 delta table goes to CO-8 (registry) and S19 | `CO-2:169` | CO-8 (I); S19 (draft) | done for the registry | `docs/development/registry.tsv` added by #105 (`221ed1a`). S19 is a draft at `c2af8ae`; not checked | `DONE` (S19 at adoption) |
| K0-07 | CO-3 (H+I, Q) | F1: the footer covers the bottom of the flight column | `CO-3-g2-matrix.md:205` | — | done | #101: `G2-F5-scene-floor.md:186-187`. `OPEN_FINDINGS` lists only F2 and F3 (`r2-viewport-matrix.mjs:64`, `:66`) | `DONE` |
| K0-08 | CO-3 | F2: Abort cut off on a 320 px phone. F3: RU cluster chips overlap at 390 px | `CO-3:206-207` | "the owner and R2.1r" (heading, `CO-3:201`) | recorded as known findings in a journey; no plan item | `r2-viewport-matrix.mjs:64` (F2), `:66` (F3). The journey passed on the candidate in 450.2 s (Pages 40385448079, browser (2)) | owner by heading only · GK2 |
| K0-09 | CO-3 | F4: the nav covers Help at zoom 150 % (RU). F6: New mission sits under the phone flight bar | `CO-3:208`, `:210`; "out of scope" in `G2-F5-scene-floor.md:188` | none | report-only | No `id: 'F4'` or `'F6'` in `r2-viewport-matrix.mjs`. No plan item, card or DECISIONS row | `NO OWNER` (propose U, R2.1r) |
| K0-10 | CO-3 | F5: the scene collapses. F7: the harness does not hide the guide | `CO-3:209`, `:211` | — | done | F5: #101; G2 signed 2026-10-06 (`DECISIONS:151`, `PROGRESS:124`). F7: #100 (`fb5cd1f`) | `DONE` |
| K0-11 | CO-3 | G2 owner checklist: D-36.A1–A5, D-39, minimum scene size, presets | `CO-3:279-288` | H | done | G2 signed (`DECISIONS:151`). The minimum is 50 % of the window height (`G2-F5-scene-floor.md:194-200`). D-36.A3 step 1 moved to K2 (`DECISIONS:153`; see K1-77) | `DONE` |
| K0-12 | CO-4 (I/U) | The `previewsChange` contract goes into the FlightLifecycle ADR | `CO-4-r2-fixes.md:82` | R0.2r (S) | done | `adr/flight-lifecycle.md:33` (#119) | `DONE` |
| K0-13 | CO-4 | Held-tuning persistence across a reload, "if the owner wants it" | `CO-4:83` | none (R1.6 named only on that condition) | report-only | No card, DECISIONS row or plan item | `NO OWNER`, `NOT ASKED` |
| K0-14 | CO-4 | The flight report link is built from the setup, not from the flown config | `CO-4:78`, `:84` | R3.1r M-LAUNCH-030 (I, K3) | recorded | `assignment.tsv` M-LAUNCH-030: "Report link … read the panel draft instead of the flown configuration" | GK3 |
| K0-15 | CO-4 | Steps 2–10 go to K1–K2 | `CO-4:85` | CO-4 (I/U); card `q05` B (`DECISIONS:173`) | partly done | Merged: s2 #134, s8 #172, s7 #173. Steps 6, 9 and 10 go to K2 (`q05` B). Not merged: M-LAUNCH-006, 008, 025 and M-PLATFORM-037 (`PROGRESS:125`) | `RE-PLAN` |
| K0-16 | CO-5 (Q+T) | Record the real shard times of the first three-shard Pages run; merge #91 before #90 | `CO-5-browser-shards.md:51-52` | — | done | `PROGRESS:36` (corrected by the GK1 record): the first three-shard Pages run was 37341257979 (9m31s, 11m43s, 14m59s), not 37348596650, which was the first with #90's matrix journey (18m54s, 9m09s, 19m22s); "merged before #90" | `DONE` |
| K0-17 | CO-5 | KPI-28: the added PR CI time over at least 3 runs | `CO-5-smoke-slice.md:121`; `kpi-GK0.md:52` | I (GK record) | done | GK0's carried item: `PROGRESS:32` (three runs in the #111 row). At GK1: median 17 min 14 s, p90 24 min 25 s (nearest rank) over the newest 10 successful PR CI runs, numbers 837–846, all after #156; #179's run 40371529487 took 17 min 18 s ([kpi-GK1.md](kpi-GK1.md), KPI-28) | `DONE` |
| K0-18 | CO-5 | No journey taps the Watch camera tabs by touch | `CO-5-smoke-slice.md:125` | none | report-only | `r2-flight-shell.mjs:283` checks only that `#camera-tabs` is visible. No journey taps it by touch | `NO OWNER` (propose Q, R2.5) |
| K0-19 | CO-5 | No journey checks that keys 1–4 give the manual camera ownership | `CO-5-smoke-slice.md:126` | none | report-only | Only `webgl-startup.mjs:138` presses `2`, after a WebGL failure | `NO OWNER` (propose C/Q, R2.2r) |
| K0-20 | CO-5 | TORU and six-DOF reach at the live approach | `CO-5-smoke-slice.md:123`, `:127` | CO-3's journey | done | `r2-viewport-matrix` covers it (CO-3 A2/A3). F1 fixed by #101 | `DONE` |
| K0-21 | CO-6 (P+Q) | Reuse the baseline runs only if the D-64 list is unchanged; check at each GK | `CO-6-physics-baseline.md:86` | I (GK record) | done at GK0 and at GK1 | GK0: `kpi-GK0.md:46`. GK1: the D-64 list is byte-identical at heavy 40240193599 (`408ad16`, 257/257), at fleet 40144277552 (`3644749`, 164/164) and at the candidate; no commit between them touches a D-64 path, and `heavy.yml` pins Node 22.23.3 at all three (local check, not committed; [kpi-GK1.md](kpi-GK1.md), KPI-22). Rule: `DECISIONS:60`, decision 2 `DECISIONS:343` | `DONE` |
| K0-22 | CO-6 | Scientific acceptance stays with the D-55 reviewer | `CO-6:91` | H (D-55, `DECISIONS:87`); M-PLAN-007 (DEC) names the reviewer | recorded; open | M-PLAN-007 is open (`assignment.tsv`) | GK2 |
| K0-23 | CO-7 (L-C) | D-42 (ก) reaches DECISIONS through CO-8 | `CO-7-institution-name.md:161` | CO-8 | done | `DECISIONS:34` | `DONE` |
| K0-24 | CO-7 | The rest of the pack's Thai wording goes to HU-3 | `CO-7:161` | HU-3 (H + RU reader) | named in the report only; HU-3 not started | `PROGRESS:206`: HU-3 is "Planned" and does not mention it | owner named, no HU-3 record · GK2 |
| K0-25 | CO-7 | Restore the institution name when written permission exists | `DECISIONS:34` (D-42 ก) | H | open (a condition) | No permission is recorded | GK2 |
| K0-26 | CO-8 (I) | The owner: D-23 "when", the D-16 note, `registry.tsv` | `CO-8-adoption.md:105` | H | done | `DECISIONS:113-114`; `registry.tsv` (#105) | `DONE` |
| K0-27 | CO-8 | CI run ids of the K0 merges | `CO-8:106` | I | done | #143 | `DONE` |
| K0-28 | CO-8 | PR2: the plan text, the PLAN.md v2.0 index and the banners | `CO-8:84`, `:92`, `:106` | CO-8; H for the banners | text and index done; banners held | #105. The banners wait for approval of the whole plan (`DECISIONS:149`) | recorded (H) |
| K0-29 | CO-8 | K1 starts with the F5 fix, then G2 again | `CO-8:107` | K1 | done | #101, #103; G2 signed (`DECISIONS:151`) | `DONE` |
| K0-30 | CO-8 | Spec items not done: D-28…D-32 record rows, answer sheet D, the KPI-31 re-check, the PR template | `CO-8:85`, `:91`, `:93` | DEC (H; I records); I | partly done | #143 reset the register to the true lifecycle. The PR template has existed since `09f6d69` (2026-09-30). Sheet D is not asked (`DECISIONS:377`) | sheet D: recorded (DEC) · GK2 |
| K0-31 | HU-1 (H, Q supports) | Q-1…Q-8 for the owner: session length, KPI-23/24 units, micro-quiz, "≥ 2 people", the ease scale, when to add banners, teacher tasks | `HU-1-protocol-prep.md:72-79` | H | not answered | Only Q-9 is answered (`DECISIONS:117`). No card or DECISIONS row covers Q-1…Q-8 | `NOT ASKED`; needed before HU-1 step 2 (owner question S7) |
| K0-32 | HU-1 | Before session 1: the privacy statement live; D-49 and D-60 recorded | `HU-1:85-86` | ED-INST-1; CO-8 | done | #147, published by Pages 39030728958 (`PROGRESS:193`); `DECISIONS:48-49` | `DONE` |
| K0-33 | HU-1 | Before session 1: freeze section K (step 2), recruit 5–6 people, parental consent, print the forms | `HU-1:89-92` | HU-1 (H; Q supports) | not done; moved | `docs/USER-STUDY-HUF.md` was last changed by #85 (`8b37d92`). The owner moved the student sessions to November (decision 6, `DECISIONS:356`; register row HU-1, `PROGRESS:204`; variance `PROGRESS:236`) | decision 6 (`DECISIONS:356`) |
| K0-34 | HU-1 | "Superseded" banners on the source protocols; a `docs/README.md` row for HUF | `HU-1:94-105`, `:110` | HU-1 step 2 (banners, Q-7); "I or W" (README row) | not done | No banner in `docs/USER-TEST-2026-10.md:1-8`. `git grep USER-STUDY-HUF 7263004 -- docs/README.md` finds nothing | README row: `NO OWNER` (propose I) |
| K0-35 | S06 §06.5 | R1.6 and FX-1…FX-8 are out of K0; they go to K1 (S10) | `S06-closeout.md:337` | the K1 packages | started; partly merged | `PROGRESS:149-157`. FX-4 and FX-6 are wave K2 by plan (`packages.tsv`; `PROGRESS:152`, `:154`: "Not authorized (D-65)"). FX-7's steps 1–3 are K2 by plan (`PROGRESS:155`). FX-8 has no unmerged K1 item; `q01` is cancelled (K1-17) | `RE-PLAN` for the unmerged K1 items of R1.6, FX-1, FX-2 and FX-5 (K1-25, 27, 28, 45, 51, 56, 57) and for FX-3's K1-33 (P4 ก) |
| K0-36 | S06 §06.5 | R2.1r, R2.2r, R2.3s2, R2.5 and R2.6 wait for G2; they go to K2 | `S06:338` | the K2 packages | G2 signed; the packages are planned, not authorized | `PROGRESS:158-162` | the owner: K2's plan sections and K2 authorization (GK item 12; D-65; owner question S1) |
| K0-37 | S06 §06.5 | The R3+ follow-on goes to K3 | `S06:339` | the R3.x packages | only M-PLAN-027 done (#149, card `q07` A, `DECISIONS:175`); the rest planned | `PROGRESS:163-169` | GK3 |
| K0-38 | S06 §06.5 | EQ-3's M-LAUNCH-024 comes after CO-4 step 10 | `S06:340` | EQ-3 (K2) | planned; step 10 moved to K2 by `q05` B | `DECISIONS:173`; `PROGRESS:142` | GK2 |
| K0-39 | S06 §06.5; GK0 carried | The oracle kit, the perf gate and the physics harness on the CO-6 base go to R0.4; R0.4 was not started in K0 | `S06:341`; `kpi-GK0.md:51` | R0.4 (T+Q) | 2 of 12 items merged (#140, #148) | `PROGRESS:132`. 8 of 20 oracles exist ([kpi-GK1.md](kpi-GK1.md) § G0 closure) | `RE-PLAN` (G0 not passed) |
| K0-40 | S06 §06.5 | Engine-level CSV columns (D-57), the Docking preset (D-58), real devices | `S06:342` | R4.2, R5.4, HU-6 | planned. The owner runs the HU-6 session at GK1 on the candidate (decision 6) | `PROGRESS:171`, `:180`, `:209`; `DECISIONS:356` | `HU-6` (real devices: waits for the owner's HU-6 session) · R4.2/R5.4 at K4/K5 |
| K0-41 | GK0 carried | G2: the F5 fix, a new screenshot set, a new review page | `kpi-GK0.md:50` | CO-3 | done | `DECISIONS:151` | `DONE` |
| K0-42 | GK0 carried | The R7.1 cross-system journey at GK1 | `kpi-GK0.md:53` | R7.1 M-PLAN-025 (`q06` A, `DECISIONS:174`) | done | #175 (`8973e84`). On the candidate, `r7-cross-system` passed in 443.5 s (Pages 40385448079, browser (1), job 121793499922; 13/13 journeys in that shard). Earlier: 417.6 s at `c5da5bb` (40340692641) and 407.4 s at `a05ae70` (40357991698) | `DONE` |

K0's four "Changes for K1" (`K0-retro.md:65-79`) are process commitments, not hand-offs. [K1-retro.md](K1-retro.md) says whether each one held.

## Wave K1 (K1 packages, the K1 steps of K0 packages, lane work and the owner's requests)

| # | Package (lane) | Item | Source | Owner now | Status on `7263004` | Evidence | Flag · next re-check |
|---|---|---|---|---|---|---|---|
| K1-01 | R0.2r (S) | 21 ADR "Open points" | `adr/camera-policy.md:29-31`; `design-preview.md:27-31`; `flight-lifecycle.md:30-33`; `handoff.md:31-35`; `result-action.md:38-41` | 3 tied to plan items (M-BUILD-015, M-LAUNCH-081, M-PLAN-028), 1 partly (M-PLAN-028), 1 settled (`previewsChange`), 16 none | 16 report-only | Appendix A | `NO OWNER` ×16 · GK2 |
| K1-02 | R0.2r | G0 gaps: no JSON examples (S07 §07.2), no `R0.2r-contracts.md`, open points without item ids, 3 D-59 rows still pre-K1, M-PLAN-007 open | GK1 readiness report, G0 row for R0.2r | the re-plan row (decision 1); M-PLAN-007 (DEC, H) | open | M-PLAN-007 is open; `DECISIONS:119-136`; [kpi-GK1.md](kpi-GK1.md) § G0 closure | `RE-PLAN` |
| K1-03 | R0.3r (T+Q) | Selection by import graph, "not part of this package" | `R0.3r-change-map.md:81` | none | report-only | — | `NO OWNER` (propose T, R7.3) |
| K1-04 | R0.3r | Wire the selection into CI | `R0.3r:82` | R7.3 (T) | recorded; R7.3 not authorized | `PROGRESS:212` | GK2 |
| K1-05 | R0.3r | G0 gaps: no size of the selected set against the full set, no D-64 tree hash, LUI-01 used in place of #74 | GK1 readiness report, G0 row for R0.3r | the re-plan row | open | [kpi-GK1.md](kpi-GK1.md) § G0 closure | `RE-PLAN` |
| K1-06 | R0.4 (T+Q) | Remaining K1 items: M-PHYSICS-003/060, M-PLAN-002/003/004/010/018, M-BUILD-024/025, M-PLATFORM-041. They include EO-STO-2, EO-UI-3, `measure.mjs` and step 8a's Pages-header server | `PROGRESS:132`; `HANDOVER-K1.md:137`; `R1.6-pr4-read-once.md:48`; `EQ-1-s1-precache-transfer.md:128` | R0.4; the re-plan moves orders 1–5, 7 and 8 to K2, against draft `S07:211` (`c2af8ae`) | not merged | 2 of 12 merged (#140, #148). `measure.mjs` is still not in the repository at the candidate; P1's one-off baselines used the plan branch's copy, not committed (`DECISIONS:365 @5092ac9`). See K1-111 | `RE-PLAN` (owner question S3) |
| K1-07 | R0.4 | Ceilings on the gzip/brotli columns need about 1 kB of slack or a fixed-SHA build: "owner decision, not made here" | `R0.4-s1-budget-report.md:83-91` | H (D-38) | decided: not now | P5 (ก) "ก ไม่ตั้งตอนนี้ (แนะนำ)", answered 19:24:06Z (`DECISIONS:369 @5092ac9`). #179 lowered only the raw ceilings. `budgets.json` has no compressed ceiling (its only "gzip" is in the units note, `:4`), and `scripts/bundle-budget.mjs:234` prints the compressed sizes as "report only, no ceilings". The option text says that, if wanted later, it becomes a K2 task | `DONE` (decided) · was `NO OWNER`, `NOT ASKED` |
| K1-08 | R0.4 | Non-finite input stops silently with `lifetime: null`. A candidate bug fix; "needs the owner's call" | `R0.4-s4-physics-harness.md:165` | none | report-only | — | `NO OWNER`, `NOT ASKED` (propose P) |
| K1-09 | R0.4 | `R0.4-evidence.md`, the package's evidence file | `R0.4-s4:164` | R0.4 | not written | Not in `docs/development/reports/` | `RE-PLAN` |
| K1-10 | EQ-1 (T) | The HU-6 Android peak-memory measurement was asked for before merge. EQ-1 merged without it | `EQ-1-s1-precache-transfer.md:67`, `:127` | HU-6 (H+Q) | open; left out of the GK1 session by the owner | P3 (ข) added only the CSV download to the GK1 session; "Android's peak memory (K1-10) stays open" (`DECISIONS:367 @5092ac9`; register row HU-6, `PROGRESS:210 @5092ac9`) | GK2 (HU-6 at the next GK) |
| K1-11 | EQ-1 | The `prepareOffline()` repair path still uses `reload`, "outside this item" | `EQ-1:129` | none | report-only | `src/pwa/sw-core.ts:181`: `cache: 'reload'` | `NO OWNER` (propose T, FX-7) |
| K1-12 | FX-7 (T) | Install peak memory: EQ-1 is to bound the download concurrency | `FX-7-s0-precache-revision.md:83` | EQ-1 | done | Six downloads at a time (`EQ-1-s1:67`, #130) | `DONE` |
| K1-13 | FX-7 | Steps 1–3: M-PLATFORM-022 (the rest), 023, 025, 026 | `PROGRESS:155`; `HANDOVER-K1.md:152` | FX-7 (T), K2 | recorded | planned | GK2 |
| K1-14 | EQ-2 (C+I) | Start-up on CI's software GPU: Home draws no frame for about 8 s; Continue costs 9–18 s of shader compiles | `HANDOVER-K1.md:203-207` | EQ-2 (M-PLAN-001) | recorded; EQ-2 not started | `PROGRESS:141`: "Planned". P1's baselines at the candidate: 55 programs at start; 16 of 20 duplicates at Launch entry and 20 of 20 at launch (KPI-05); 20 programs compiled in the liftoff window (KPI-06) (local run, not committed; [kpi-GK1.md](kpi-GK1.md) § New baselines) | `RE-PLAN` |
| K1-15 | EQ-2 | `prewarm` should also finish linking the programs | `T-stored-mission-flake.md:120` | EQ-2 (`HANDOVER-K1.md:207`) | recorded; not started | — | `RE-PLAN` |
| K1-16 | FX-8 (C) → EQ-2 | Nothing re-runs the shader prewarm after a context restore, so a loss before liftoff brings back the ignition hitch once | PR #108 body, "What reviewers should look at" (no report file) | none | report-only | — | `NO OWNER` (propose C, EQ-2) |
| K1-17 | FX-8 | Branches `claude/t-fx8-s2` and `claude/t-fx8-picture-moment-s1` (card `q01`) | `PROGRESS:156`, `:243`; `HANDOVER-K1.md:117` | H. `q01` was cancelled on 2026-10-26 (decision 5, `DECISIONS:355`). Deleting the branches is the owner's action | cancelled; both branches still on origin | `git ls-remote` at 22:45:49Z: `071db68`, `0ac5ca4`. The KPI-35 decision checks fail only on these two branches ([kpi-GK1.md](kpi-GK1.md), KPI-35) | owner question S12 |
| K1-18 | FX-1 (B) | Legacy ratings: the label and the recompute need the owner | `FX-1-pr1-payload-rating.md:108-112` | — | done | #109; `DECISIONS:150` | `DONE` |
| K1-19 | FX-1 | `index-*.js` 1.3 kB over; the s4 ceilings; 70 B left | `FX-1-s2-legacy-ratings.md:124-127`; `FX-1-s4-newer-file.md:20`; `FX-1-s5-replace-paths.md:117` | — | done | #128 (`DECISIONS:158`), #137 (`DECISIONS:160`), #146 (`q03` B, `DECISIONS:170`) | `DONE` |
| K1-20 | FX-1 | Ratings in kept drafts are not searched again | `FX-1-s2:128-132` | none | report-only | — | `NO OWNER` (propose B) |
| K1-21 | FX-1 | The Engineer bench takes a kept design as it is | `FX-1-s2:133-134` | none | report-only | — | `NO OWNER` (propose B) |
| K1-22 | FX-1 | `designRefFor` counts any rating difference as an edit (D-75) | `FX-1-s2:135-138` | R3.1r M-PLAN-028 | recorded | The `assignment.tsv` M-PLAN-028 row includes "does a rating-only change count as an edit" | GK3 |
| K1-23 | FX-1 | Other Build paths still replace a design without asking | `FX-1-s3-unsaved-open.md:64-66` | — | done | #145 | `DONE` |
| K1-24 | FX-1 | Two choices made for the owner: "Start again" asks; the question shows in "Your designs" (about +1.2 kB to move it next to the control) | `FX-1-s5:49-52` | none | report-only; FYI, never asked | — | `NO OWNER`, `NOT ASKED` |
| K1-25 | FX-1 | M-BUILD-029 (decimal comma), including the `ui/orbit/dom.ts` part that FX-3 PR1 left | `HANDOVER-K1.md:140`; `FX-3-pr1-orbit-honest-figures.md:136` | FX-1 (B) | recorded; not merged | `assignment.tsv` M-BUILD-029 is open | `RE-PLAN` |
| K1-26 | FX-1 | The plan's M-BUILD-024 journey does not exist; FX-1 merged without it | `FX-1-s3:62`; `PROGRESS:232` | R0.4, order 3 | recorded (a variance) | No commit names M-BUILD-024 | `RE-PLAN` (in K1-06) |
| K1-27 | FX-2 (L-UI) | Restore focus and caret after the result rebuild | `FX-2-pr1-lesson-typing.md:131-133` | M-LEARNING-002 | recorded, weakly | M-LEARNING-002's title is the shared answer form. It does not mention focus | `RE-PLAN`; add focus to its acceptance |
| K1-28 | FX-2 | M-LEARNING-003 stays a separate step | `FX-2-s2-reopened-views.md:97` | FX-2 | recorded; not merged | `assignment.tsv` open; `HANDOVER-K1.md:141` | `RE-PLAN` |
| K1-29 | FX-2 | `q11` part 1: check that #135 changed only terms in the bank | `DECISIONS:179`; `PROGRESS:251` | FX-2 M-LEARNING-027 | done | `FX-2-s2a-m-learning-027-reader.md:11-12`, `:96-126` (#176, `c5da5bb`); `PROGRESS:251`: "the M-LEARNING-027 check is done (#176)" | `DONE` |
| K1-30 | FX-2 | 2b, the writer, after 2a is merged and published | `FX-2-s2a:142` | FX-2 (L-UI) | done: merged and published | #177 merged 16:19:19Z as `a05ae70` on the owner's Merge Desk answer (`DECISIONS:363`). Pages 40357991698 published it (`deploy-pages` done 16:55:51Z). #180 (`46728e5`) folded it (`PROGRESS:150`). On the candidate its failing-first test passes (`assessment-revision-writer.test.ts` 1/1, Pages 40385448079, test (3), job 121793106001). P2's revert drill on the candidate passed 48 of 48 checks ([revert-drill-GK1.md](revert-drill-GK1.md); local run, not committed) | `DONE` |
| K1-31 | FX-2 | The results file's `summary` names no revision; 2b can add it | `FX-2-s2a:145`; `FX-2-s2b-m-learning-027-writer.md:144` | none: 2b merged without it, and its report leaves it to "a later step" | report-only | 2b's report: the `summary` "still names no revision. A later step can add it." #177's source change (`revision.ts`, `types.ts`, `assessment-view.ts`) does not touch the results file. No plan item names it | `NO OWNER` (propose L-UI, FX-2) |
| K1-32 | FX-2 | A teacher's questions have no revision. Their only writer is held with the teaching tools | `FX-2-s2a:143`; `FX-2-s2b:145` | none | report-only | `TEACHER_TOOLS = false` (`src/ui/held.ts:9`) | `NO OWNER` (propose L-UI, when the tools return) |
| K1-33 | FX-3 (O) | The sky step "This is where the ISS is at this moment" while the tour runs at warp 60 (part of M-ORBIT-003). It was left to FX-3 PR2 | `FX-3-pr1-orbit-honest-figures.md:129-131` | FX-3 (O), M-ORBIT-003 (wave K1–K2, `assignment.tsv`); the owner sent it to the re-plan for K2 (P4 ก) | not done; moved to the re-plan row, which is a proposal until the owner approves it | `src/i18n/en.ts:1299` (and `th.ts:1276`) and `src/orbit/sky-tour.ts:32` (`warp: 60`) are from `c0bc958` (2026-09-27; `git blame` at the candidate). #127 and #131 did not touch them. P4 (ก) "ก ไม่เพิ่ม (แนะนำ)" (`DECISIONS:368 @5092ac9`). At the candidate `PROGRESS:151` still reads "K1 items all merged"; #181 corrects it (`PROGRESS:152 @5092ac9`). `HANDOVER-K1.md:150-151` (the K1 hand-over as of 2026-10-08) is left as it is | `RE-PLAN` (owner question S3) · was `DROPPED` until 2026-10-26 |
| K1-34 | FX-3 | A manoeuvre planned from a Thai satellite's orbit: the EO repeat covers only the start segment, and adopting the plan forgets the satellite | `FX-3-pr1:132-135` | none | report-only | No plan item mentions it | `NO OWNER` (propose O) |
| K1-35 | FX-3 | The `watch.moonScope` line in the workspace HUD while `frame.apollo` is set (lane I) | `FX-3-s2-thai-copy-moon-label.md:91-95` | none | report-only | `moonScope` is used only at `src/ui/watch.ts:640` | `NO OWNER` (propose I) |
| K1-36 | FX-3 | Count unanswered CelesTrak requests before any online refresh | `FX-3-s3-catalogue-retry.md:78-80` | none (a condition) | report-only | — | `NO OWNER` (propose O, the data provider) |
| K1-37 | FX-5 (I/U) | M-LAUNCH-031: four more assertions and `result-content.ts` | `FX-5-pr2-result-basis.md:178-183` | — | done | #117; `DECISIONS:155` | `DONE` |
| K1-38 | FX-5 | A native reviewer should read the TH/RU wording of `eq.none.stillAir` / `noRecord` (item 3 of "Open questions for the owner") | `FX-5-pr2:176-186` | none (the report says "a native reviewer" and names no package) | report-only | Card `fx5-031-more` answered items 1 and 2 only (`DECISIONS:155`). No card, chat question or DECISIONS row asks item 3 | `NO OWNER`, `NOT ASKED` (propose HU-3) |
| K1-39 | FX-5 | M-LAUNCH-031 residual: unrounded values on the completion event | `HANDOVER-K1.md:209` | — | done | #151 (`q08` A, `DECISIONS:176`) | `DONE` |
| K1-40 | FX-5 | The rest of M-LEARNING-006: number formats, BOM, download, file names | `FX-5-s4-csv-export.md:119-120` | EQ-14, M-LEARNING-006 | recorded | `assignment.tsv` M-LEARNING-006 | GK3 |
| K1-41 | FX-5 | Download a large Monte Carlo CSV by hand on Safari and Firefox ("Q or HU-6") | `FX-5-s4:126` | HU-6 (H): task 12 of the GK1 session, on iPad Safari and Android Firefox (P3 ข) | in the session kit; not run | P3 (ข) "ข เพิ่มเฉพาะ CSV (แนะนำ)" (`DECISIONS:367 @5092ac9`); register row HU-6 (`PROGRESS:210 @5092ac9`). The kit is local, not committed | `HU-6` (waits for the owner's HU-6 session) · was `NO OWNER` |
| K1-42 | FX-5 | A physics-lane review of the `src/physics` line | `FX-5-s4:127` | P | done | #150 | `DONE` |
| K1-43 | FX-5 | M-LAUNCH-034 (plan wave K2) merged in K1; the integration session is to confirm it | `FX-5-s4:122` | H | done | Acknowledged by card `q11` A (`PROGRESS:223`) | `DONE` |
| K1-44 | FX-5 | The suborbital verdict judges with `checkRaan = raanWasReachable()`, while the result table uses `true`. "Follow-up for lane P: a separate ticket" | `FX-5-031r-judged-params.md:102` | none | report-only | No plan item mentions `checkRaan` | `NO OWNER` (propose P) |
| K1-45 | FX-5 | M-LAUNCH-035, the failed-state style (needs CSS) | `PROGRESS:153`; `HANDOVER-K1.md:142` | FX-5 | not merged | — | `RE-PLAN` |
| K1-46 | R1.6 (L) | The `learner-profiles` ≥20-run rate; journeys not run in PR1 and PR2 | `R1.6-pr1-storage-safety.md:116`; `R1.6-pr2-unreadable-rows.md:79` | — | done | 20/20 on `007b039` (#150); Pages 37518627155. On the candidate: 122.9 s, pass (Pages 40385448079, browser (2)) | `DONE` |
| K1-47 | R1.6 | R1.6-FU-SEL; the "kept until you change it" line | `R1.6-pr2:80`; `R1.6-pr2b-newer-mission.md:96` | — | done, then changed by the owner's request | #152 (card `q15`, `DECISIONS:193`); #138 (`DECISIONS:159`). #153 (`095eb14`, owner's request of 2026-10-14) replaced FU-SEL's start-up chooser for an unreadable selection: the tab now binds the readable learner saved last, or a new "Learner 1". It re-edited the assertions that pinned the chooser, `q15`'s among them. The bad row's bytes, copy and delete stay (PR #153 body). Recorded late at `DECISIONS:195-197` | `DONE` (behaviour as of #153) |
| K1-48 | R1.6 | A clean restore writes the stored mission again and drops unknown keys | `R1.6-pr3-eo-sto-1.md:182`; `HANDOVER-K1.md:208` | R3.1r M-PLAN-028 (single writer) | recorded | `assignment.tsv` M-PLAN-028 ("startup 2->1") | GK3 |
| K1-49 | R1.6 | The restored design's bytes depend on the field order in `designRefFor` and `parseDesignRef` | `R1.6-pr3:183` | none | report-only | M-PLAN-028 adds DesignRef fields. Its text does not mention the order | `NO OWNER` (propose S, M-PLAN-028) |
| K1-50 | R1.6 | When a PR may copy the EO-STO-1 reference files | `R1.6-pr3:184` | — | done | Card `q04` B (`DECISIONS:172`) | `DONE` |
| K1-51 | R1.6 | The name still copies the record once in `read()` | `R1.6-pr4-read-once.md:60` | M-PLATFORM-007 (PR5) | recorded | `assignment.tsv` open | `RE-PLAN` (PR5, against draft `S10:222`, `c2af8ae`) |
| K1-52 | R1.6 | `exportAll()` reads each record twice; left to M-PLATFORM-005 (PR4) | `R1.6-pr6-backup-safety.md:102` | none: misrouted. M-PLATFORM-005 is "Profile dialog re-parses every profile about four times per render (P8)" (`registry.tsv`, `assignment.tsv`) | report-only; not done | `src/workspace/repository.ts:445` (`this.list().map((p) => { const r = this.read(p.id); …`) is from `5eb18a2` (2026-10-03; `git blame` at the candidate). PR4's report scopes M-PLATFORM-005 to the profile list (`R1.6-pr4-read-once.md:34`) and names `exportAll()` only as compared for identical output (`:92`). No record says the double read is fixed; `PROGRESS:157` says only that PR4 merged | `NO OWNER` (propose L, R1.6 PR5 with M-PLATFORM-007, see K1-51; owner question S7) |
| K1-53 | R1.6 | If `WORKSPACE_MAX_BYTES` and `PROJECT_MAX_BYTES` ever differ, the export should check the smaller | `R1.6-pr6:101` | none | report-only; latent | Both are 8_000_000 (`repository.ts:35`, `archive.ts:10`) | `NO OWNER` (propose L) |
| K1-54 | R1.6 | D-68: no "keep both / choose" for colliding recordings; the catalogue does not list collisions | `R1.6-pr7-media-migration.md:146`; `HANDOVER-K1.md:210-212` | none | recorded in HANDOVER only | No plan item. M-PLATFORM-010 is the merged fix | `NO OWNER` (propose L, L-UI) |
| K1-55 | R1.6 | The name limit is 80 in the window but 100 in the repository and in archives | `R1.6-pr11-profile-docs.md:112` | none | report-only | `repository.ts:41` (100); `profile-dialog.ts:236` (80) | `NO OWNER` (propose L) |
| K1-56 | R1.6 | The in-app iPad warning and `persist()` | `R1.6-pr11:113` | M-PLATFORM-018 (PR10) | recorded; not merged | — | `RE-PLAN` |
| K1-57 | R1.6 | PR5, PR8, PR9 and PR10 not merged | `PROGRESS:157`; `HANDOVER-K1.md:136` | R1.6 | not merged | — | `RE-PLAN` |
| K1-58 | R1.6 | A later identical-output PR must not "fix" `mediaMigrated: true` against `ref/` | `HANDOVER-K1.md:185` | R1.6's identical-output PRs (L) | a standing note | — | GK2 |
| K1-59 | R3.4r (B) | The part card's heading for a strap-on group still names only the role, "left for the owner" | `R3.4r-m-plan-027-bench-a11y.md:97` | none | report-only | — | `NO OWNER`, `NOT ASKED` (propose B, R3.4r) |
| K1-60 | R4.1 (P-D) | Finish `claude/pd-r41-s1` (M-PHYSICS-041 / M-PLATFORM-070) when a PR slot frees | `DECISIONS:178` (`q10` A); `HANDOVER-K1.md:118` | R4.1 (P-D) | not carried out; after GK1, because it touches D-64 paths. The owner confirmed "after GK1" (P4 ก) | `DECISIONS:368 @5092ac9`; `PROGRESS:250`. Branch at `e777aae` on origin (22:45:49Z), with no PR | after GK1 |
| K1-61 | R4.1 | K1 research: M-PHYSICS-040, M-ORBIT-043, M-PHYSICS-048/049 | `HANDOVER-K1.md:146` | R4.1 | not started | `PROGRESS:170` | `RE-PLAN` |
| K1-62 | ED-I18N-1 (L-C) | Keep ดาวเทียมนำทาง? "A question for the owner, not blocking" | `ED-I18N-1-s1-thai-gnc-terms.md:181-193` | none | report-only | Only `PROGRESS:74` mentions it | `NO OWNER`, `NOT ASKED` |
| K1-63 | ED-I18N-1 | M-LEARNING-030, the glossary | `ED-I18N-1:221-222` | ED-I18N-1 | not merged | `PROGRESS:190` | `RE-PLAN` |
| K1-64 | ED-INST-1 (L-C+T) | M-LEARNING-045, 046 and M-PLATFORM-073 | `ED-INST-1-s1-privacy.md:128` | ED-INST-1 | not merged | `PROGRESS:193` | `RE-PLAN` |
| K1-65 | ED-INST-1 | The HU-1 information sheet and consent forms | `ED-INST-1:129` | HU-1 | recorded; sessions moved to November (decision 6) | `DECISIONS:356`; register row HU-1 (`PROGRESS:204`) | decision 6 (`DECISIONS:356`) |
| K1-66 | ED-INST-1 | When `persist()` (R1.6 PR10) or a report tool (M-PLAN-011) lands, the privacy page must change in the same PR | `ED-INST-1:130` | none in the plan text | report-only | The M-PLATFORM-018 and M-PLAN-011 rows do not mention the page | `NO OWNER` (propose: add it to both items' acceptance) |
| K1-67 | ED-INST-1 | Test gap: a new `img`, `link` or `script` from an outside host would pass | `ED-INST-1:124` | none | report-only | — | `NO OWNER` (propose T, R7.4) |
| K1-68 | ED-INST-1 | The host-log sentence is hidden, so M-LEARNING-047's acceptance is not met | `DECISIONS:222` | H | recorded | — | GK2 |
| K1-69 | ED-LES-1 (L-C) | The full HUD's Period row (and inclination) shows the answer | `ED-LES-1-s1.md:91`; card `q09` A (`DECISIONS:177`) | ED-LES-1 / U | not carried out. The owner moved it to K2 on 2026-10-26 (decision 5) | `src/ui/hud.ts:948` still sets `period`. `hud.ts` was last changed by #74 (`da67341`). Moved: `DECISIONS:355`; `PROGRESS:195`, `:249` | decision 5 (`DECISIONS:355`) · GK2 |
| K1-70 | ED-LES-1 | WebMCP `get_events` returns the raw period | `ED-LES-1:92` | — | decided | `q09`: WebMCP stays (`DECISIONS:177`) | `DONE` (decided) |
| K1-71 | ED-LES-1 | M-LEARNING-007–011 | `PROGRESS:195` | ED-LES-1 | not merged | — | `RE-PLAN` |
| K1-72 | CO-3 (#103) | In a short scene: should `H` open the folded card; tool buttons in a row or a column | `G2-compact-overlay.md:140-144` | none | report-only | — | `NO OWNER`, `NOT ASKED` (propose U, R2.1r) |
| K1-73 | CO-4 (#172) | The optional shared `setDynamicsPart` helper: identical output, its own PR; `src/mcp.ts` is outside CO-4's files | `CO-4-s8-m-launch-032.md:131` | none | report-only | — | `NO OWNER` (propose U) |
| K1-74 | CO-4 (#172) | `pickVehicle`, `faultPresetVehicle` and MCP's edits turn a dispersed flight back into a nominal one. "Not settled here" | `CO-4-s8:132` | none | report-only | No commit after #172 touches `src/ui/panel.ts` or `src/mcp.ts` (`git log aaf787e..7263004` on those paths is empty) | `NO OWNER` (propose U with P review, CO-4) |
| K1-75 | CO-4 (#173) | The GK1 lowering would set the CSS ceiling to 177 | `CO-4-s7-m-launch-026.md:115` | T, the ceilings PR (`q03-1` B, `DECISIONS:171`) | done | #179 lowered `index-*.css` 178 → 177, its GK0 ceiling (`budgets.json:39`; `GK1-ceilings-q03-1.md`). It merged 19:17:43Z on the owner's Merge Desk answer (`DECISIONS:364 @5092ac9`); Pages 40385448079 built it with "bundle budget: ok" | `DONE` |
| K1-76 | T/Q test fix (#171); CO-4 proposed | The 6-DOF controls vanish after every preview. Proposal (ก): run the telemetry tick on the next frame | `r2-flight-shell-press-race.md:95-99` | none; the report proposes "a small bug-fix PR in CO-4's files" (`:99`) | report-only | `this.telTimer = 1` is set only at `src/main.ts:579` (a rigid command) and `:1785` (`seek`), not after a preview | `NO OWNER`, `NOT ASKED` (propose U, CO-4) |
| K1-77 | CO-4 | D-36.A3 step 1, in-flight edits with a confirm step (branch `claude/i-co4-d36a3-s1`) | `HANDOVER-K1.md:116` | K2 (card `r16-pr2-budget` b, `DECISIONS:153`) | deferred; branch kept | `f286b8b` on origin (22:45:49Z) | GK2 |
| K1-78 | R7.1 (Q/T) | The candidate's Pages run, the viewport × language matrix, the HU-6 link | `R7.1-GK1.md:80` | the GK1 record PR (I) | in progress: the candidate's run is done, and its matrix is in `R7.1-GK1.md` (this record PR); the HU-6 link waits | Pages 40385448079: all 11 jobs passed; 37/37 journeys (13/12/12); `r7-cross-system` 443.5 s, `r2-viewport-matrix` 450.2 s; the verify union has browser 37/37 and unit 10 521/10 521 (job 121804252720) | `HU-6` (the HU-6 link) |
| K1-79 | R7.1 | Run the six held journeys once on a teaching-tools build (decision 7) | `DECISIONS:357` | I (the GK1 record) | done | 6 of 6 passed on a build of the candidate with `TEACHER_TOOLS = true`, first run, one at a time, 20:57–21:03Z: `case-worksheet-exports`, `classroom-preparation`, `fx2-design-check-focus`, `instructor-loading`, `lesson-packs`, `recheck` (343.4 s in all). Four journeys that skip teacher steps while the tools are held also passed on that build (4/4). The build was not committed (local run, not committed; [kpi-GK1.md](kpi-GK1.md) § Gates, item 2). Variance: `PROGRESS:237` | `DONE` (decision 7) |
| K1-80 | R7.1 | Add the worksheet DOCX export to the journey when the teaching tools return | `R7.1-GK1.md:70` | none (a condition) | report-only | On the decision-7 build `r7-cross-system` passed but ran no teacher step: `TEACHER_TOOLS` is imported at `r7-cross-system.mjs:53` and used only at `:426` and `:443`, in log lines | `NO OWNER` (propose Q, R7.1) |
| K1-81 | R7.1 | No strict validator for the backup or the CSV; `parseWorkspaceArchive` accepts a missing `createdAt` | `R7.1-GK1.md:75` | EO-STO-2 / M-PLAN-018 (R0.4) for the storage diff; none for the validator | report-only | — | `NO OWNER` for the validator (propose S/L) |
| K1-82 | R7.1 | No CSP (M-PLATFORM-027); the outbound check is unit tests only (M-PLATFORM-028) | `R7.1-GK1.md:76-77` | R7.4 (T) | recorded; R7.4 not authorized | `assignment.tsv`: 027 open, 028 partial | GK2 |
| K1-83 | R7.1 | A stall on CI goes to M-PLATFORM-061, not a retry | `R7.1-GK1.md:79` | R7.1 M-PLATFORM-061 | recorded | See K0-02 | GK2 |
| K1-84 | R7.1 | At 1280×800 with the first-use guide open, ⏯ sits under the footer: "nothing is broken and no decision is needed … Changing it would change the G2 rule" | `R7.1-GK1.md:118` | H (the G2 rule) | decided; a note for the owner (FYI) | Within the owner's G2 rule: the 50 % scene minimum (`DECISIONS:145`; `G2-F5-scene-floor.md:194-200`), G2 signed (`DECISIONS:151`). `r2-viewport-matrix` checks it and passed on the candidate (450.2 s, Pages 40385448079, browser (2)) | `DONE` (decided under G2); a change would reopen G2 |
| K1-85 | R7.2 (I/T) | M-PLAN-026: the retrospective, the re-estimate and this check | `S05:119-120`; decision 3 (`DECISIONS:354`) | R7.2 M-PLAN-026 | in progress: [K1-retro.md](K1-retro.md) and this file are in the GK1 record PR, every number re-run at the freeze cutoff 2026-10-26T19:42:02Z; not merged | Authorized at `DECISIONS:354`; register row R7.2 (`PROGRESS:211`) | merges with the GK1 record PR, after the owner's HU-6 session |
| K1-86 | R7.3 (T) | R0.3r's CI wiring; the M-PLATFORM-054 fitness baseline | `R0.3r:82`; `CO-2-closeout.md:164` | R7.3 | recorded; not authorized | `PROGRESS:212` | GK2 |
| K1-87 | R7.5 (I) | The re-plan's edits to `packages.tsv` and S05 (a docs PR, R7.5) | `S05:434` (§05.11 item 5). It does not name `registry.tsv`; that file and `assignment.tsv` carry each item's wave (`plan/README.md:53`), so whether the re-plan edits them too is a proposal | R7.5, after the owner approves | not authorized | `PROGRESS:214` | owner question S10 |
| K1-88 | DEC (H) | Answer sheet D is not asked (D-52, D-66, four unnumbered). M-PLAN-007 (the science reviewer, the formal G0 closure) is open | `DECISIONS:377`; `assignment.tsv` M-PLAN-007 | DEC (H; I records) | open | — | GK2 |
| K1-89 | HU-2 (H) | Re-review pack ru-24-05-06, which #135 and then #157 changed (`q11` A) | `DECISIONS:179`; `PROGRESS:205`, `:251` | HU-2 (H) | queued; no re-review recorded | `reviewed: false` (`src/lessons/pack-sources/ru-24-05-06.ts:71`); last changed by #157 (`bb33307`) | GK2 |
| K1-90 | HU-6 (H+Q) | A device session on the candidate at GK1 (D-56 gate classes) | decision 6 (`DECISIONS:356`); draft `S16:472` (`c2af8ae`) | H (the owner) | not done; the kit is ready (local, not committed) | `PROGRESS:209`: "none recorded on 2026-10-26". The session also checks the live About stamp and the old service worker's reload ([kpi-GK1.md](kpi-GK1.md) § G7 at GK1, item 2) | `HU-6` (waits for the owner's HU-6 session) |
| K1-91 | I-HOOKS (I); HU-3 (H) | No hand-off of their own; nothing merged | `PROGRESS:206`; `HANDOVER-K1.md:147-148` | — | — | Items routed to HU-3 by a report: K0-24 (`CO-7:161`). Proposed for HU-3 here: K1-38 | — |
| K1-92 | T (#95) | "The T lane lowers ceilings in its next ratchet PR" (the 2.7 kB F5 offset) | `F5-offset-html-comments.md:57-59` | T, the ceilings PR (`q03-1` B) | done | #179 is that ratchet: `index-*.js` 2645 → 2635, precache code 14724 → 14654, precache 16123 → 16053 kB (`budgets.json:38`, `:53`, `:54`; `GK1-ceilings-q03-1.md`) | `DONE` |
| K1-93 | T (#126) | Progressive textures and photos (+92.9 kB saved, slower decode) | `T-offset-s1.md:199-206`; `HANDOVER-K1.md:213` | — | decided: not done (`q13` B, `DECISIONS:181`) | — | `DONE` (decided) |
| K1-94 | T (#126) | Record the jpeg-js decoder version in `jpeg-pixels.test.mjs` | `HANDOVER-K1.md:214` | none | recorded in HANDOVER only | `tests/verification/jpeg-pixels.test.mjs` has no version line | `NO OWNER` (propose T, R7.3) |
| K1-95 | T (#107) | The desktop chooser step of `r2-flight-shell` presses without waiting for the flight to settle | `smoke-chooser-race.md:75` | none | report-only; no failure known | `r2-flight-shell` passed on the candidate (263.6 s, Pages 40385448079, browser (3)) | `NO OWNER` (propose Q) |
| K1-96 | T (#160) | The scene keeps drawing behind opaque pages on weak devices, and the governors skip frames over 100 ms: "a possible performance item for the owner, not done here" | PR #160 body (no report file) | none | report-only | `PROGRESS:98` repeats it as "proposal to the owner, not done". No card, chat question or DECISIONS row asks it | `NO OWNER`, `NOT ASKED` (propose C, EQ-3) |
| K1-97 | I (#129) | Push and pull_request runs cancel each other | `HANDOVER-K1.md:216` | — | done | #129 (`3da8350`; `q02` A, `DECISIONS:169`) | `DONE` |
| K1-98 | I | Stale `claude/*` branches | `HANDOVER-K1.md:227` | — | done | `q14`: 101 branches deleted 2026-10-18 (`PROGRESS:253`) | `DONE` |
| K1-99 | I | Register rows not updated; owner questions with no card (fx8, progressive textures, the 031 residual) | `HANDOVER-K1.md:107`, `:124-128` | — | done | #143; `q01`, `q13`, `q08` (`DECISIONS:168`, `:181`, `:176`) | `DONE` |
| K1-100 | owner's request (#154) | Left open: the jellyfish ignores the slow-GPU governor; Starlink arrays sweep through the satellite above while they open; RD-0109's generator mixture is assumed fuel-rich. Not changed: a 0.5 m gap between Blok I and the Soyuz MS after fairing jettison, from `rocket.ts`'s payload stand-off | PR #154 body, "Left open" and "Visual behaviour changes" (no report file) | none | report-only | — | `NO OWNER` (propose C; P-D for RD-0109; C for the Blok I gap) |
| K1-101 | owner's request (#155) | From the review's eight "For the owner" questions, the answered work still open: the throttle and the ambient-pressure term (`DECISIONS:251`), the bending shader (`:241`, R4.7), the feature gaps' plan items (`:254`) | `docs/history/2026-10-17/ARGON4-REVIEW.md:75-84` (the questions); `DECISIONS:239-254` (all eight answered 2026-10-17) | R4.2-RB (parked), R4.7, plan items | recorded | `packages.tsv:58` (R4.2-RB) | when the owner resumes the re-baseline |
| K1-102 | owner's request (#157) | IMU2's filter change | `argon4-fu-imu.md:515` | R4.3 M-PHYSICS-079 | recorded | `assignment.tsv` | GK4 |
| K1-103 | owner's request (#159) | The clouds keep a faint peach tint under a middle sun (the sky-light option was not chosen) | `argon4-fu-sky.md:346` | H (ฟ้า1 ก) | decided; a known limit | — | `DONE` (decided) |
| K1-104 | owner's request (#162) | 8.1: the real alternate landings. 8.3: the parking plane through the Moon | `argon4-fu-apollo.md:271-272` | R8 M-ORBIT-068, M-ORBIT-069 | recorded | `assignment.tsv` | K6 |
| K1-105 | owner's request (#165, #166) | The parked re-baseline | `DECISIONS:299-333`; `packages.tsv:58` | R4.2-RB; the owner resumes it | recorded | Branch `claude/charming-archimedes-01p1h5-wip-rebaseline-snapshot` at `5d942b4` on origin (22:45:49Z) | the owner |
| K1-106 | owner's request (#156) | Showing the teaching tools again: set `TEACHER_TOOLS`, run the held journeys, remove the notes | `teaching-held.md:74-78` | H | open | `held.ts:9` is `false` at the candidate. On a teaching-tools build of the candidate two ceilings fail: `index-*.js` 2 635.5 / 2 635 kB (+0.5) and precache code 14 654.6 / 14 654 kB (+0.6) (local run, not committed; [kpi-GK1.md](kpi-GK1.md) § D-38). So showing the tools again needs a D-38 raise of about +1 kB on those two ceilings, or an offset | owner question S4 |
| K1-107 | FX-2 2b; the ceilings PR | Their own hand-offs | — | the GK1 record | done: both reports read | 2b's "Not in this step" (`FX-2-s2b-m-learning-027-writer.md:141-146`): the order (2a published first; met), the results file's `summary` (K1-31), a teacher's questions (K1-32), docs N/A. #179's report: after it, precache code has 174 B of room, which caps every chunk group, so any PR that adds bytes needs a D-38 raise (`GK1-ceilings-q03-1.md:71`); the 18 groups not raised in K1 keep their ceilings (`:104`); heavy, fleet and the six held journeys were left to the freeze (`:124-125`) and are done there (K0-21, K1-79). Nothing else is handed on | `DONE` |
| K1-108 | R7.1 (#175) | Shard rebalancing: "No shard is rebalanced here; that needs `deploy.yml` (M-PLATFORM-045)" | `R7.1-GK1.md:112` | R7.3 M-PLATFORM-045 (T; `assignment.tsv`: partial, wave "continuous"; its title includes rebalancing) | recorded; R7.3 not authorized (`PROGRESS:212`) | On the candidate the three browser steps took 20 min 10 s, 19 min 52 s and 18 min 16 s (journeys 1 209.3 s, 1 191.1 s and 1 095.3 s; Pages 40385448079), against `timeout-minutes: 45` (`R7.1-GK1.md:112`). At `c5da5bb` shard 2 had taken 1 865.3 s (40340692641) | GK2 |
| K1-109 | T (#100) | `classroom-preparation` fails locally on main ("failed disconnected repair was falsely reported ready"): "worth a separate look; it is not touched here" | PR #100 body; also `EQ-1-s1-precache-transfer.md:119`, `FX-7-s0-precache-revision.md:78` | none | report-only | It passes on CI (Pages 37387979381, per #100). PR #154's body puts the local failure down to "this sandbox's network proxy, not the code"; nothing confirms that. In the decision-7 run it passed in 67.6 s on a teaching-tools build of the candidate (local run, not committed), so the failure did not show there. It is one of the six held since #156 (`PROGRESS:97`), so CI runs it again only when the tools return (K1-106) | `NO OWNER` (propose Q) |
| K1-110 | found at the freeze (decision-7 run) | On a phone, on a lessons page with the section list open, one Escape closes the list and also leaves the lessons page (to `#/home` when the page was opened by its address). One Escape should only close the list | the decision-7 run's screenshots, then a direct check on a build of the candidate with the switch off, 22:12–22:14Z (local run, not committed) | none | report-only; present before K1 | `src/ui/section-nav.ts:41` closes the list on Escape and does not call `preventDefault()`. `src/ui/lessons/lesson-mode.ts:269` then sees an Escape not yet handled and calls `closePage()`. The two lines date from `4fc4988` (2026-10-01) and `931956f` (2026-09-26). `mobile-smoke.mjs:119-122` checks only that the list is hidden and the switch has focus, not the route. No code PR before the freeze (P4 ก) | `NO OWNER` (propose I for `section-nav.ts`, the shared shell, `S18:31`, as a bug-fix PR; Q for a route check in `mobile-smoke`) |
| K1-111 | found at the freeze (P1 baselines) | Before M-PLATFORM-041 brings `measure.mjs` to main: (a) it writes `orbitlab.guide.v1 = 'done'`, but the app hides the first-use guide only on `'dismissed'`, so the plan's baseline and the GK1 baselines both ran with the guide showing; (b) its "flight 1×" window covered the pad countdown on this host, so KPI-06's liftoff, KPI-10's flight rAF and KPI-11's 1× were not in flight; (c) a byte baseline must name the browser binary | P1's baselines (local run, not committed); [kpi-GK1.md](kpi-GK1.md) § New baselines and § Carried into K2 | none for these fixes; M-PLATFORM-041 (R0.4, T+Q; `assignment.tsv:107`) brings the script to main | report-only | (a) `measure.mjs:241` at `c2af8ae`; `src/ui/help-state.ts:16`. (b) the three runs' "flight 1×" windows were T−8.9 → T−5.6, T−8.8 → T−5.2 and T−8.6 → T−5.8 s. (c) one cold load of the same build: chrome-headless-shell fetched 5 Home card images before interactive (9 742.6 kB), full Chrome 2 (9 529.6 kB) | `NO OWNER` (propose T, in M-PLATFORM-041's PR; part of K1-06's `RE-PLAN`) |

Checked with nothing to add:
- #138 (R1.6 PR2c; its body has no hand-off). #158 and #164 (keyword scan of their bodies). #112 (one UX change shown to the owner as FYI). #176's report beyond K1-29…K1-32. #177's report beyond K1-31 and K1-32. #178, #180 and #181 (records).
- #153: its policy reversal is in K1-47's evidence. Its body leaves nothing open.
- #104, #111 and #146: their one hand-off is that GK1 reports the allowance used and ratchets the ceilings back. #179 did that (K0-04, K1-75, K1-92), and [kpi-GK1.md](kpi-GK1.md) § D-38 reports the allowance used.
- #115, #118 and #129 (process and CI changes): their bodies leave nothing open.
- [revert-drill-GK1.md](revert-drill-GK1.md) (P2): its limits hand no item on. Its one owner check, the old service worker's reload on the live site, is the HU-6 session's (K1-90).
- The candidate's Pages build kept the committed Earth-orientation snapshot because IERS answered 400 ([kpi-GK1.md](kpi-GK1.md) § Candidate). That is a fact of this publish, not a hand-off.

## Appendix A: the 21 open points of the R0.2r ADRs (K1-01)

| # | ADR:line | Open point (short) | Owner now | Proposed owner |
|---|---|---|---|---|
| A1 | `camera-policy.md:29` | A workspace New mission does not call `reset()`; which behaviour is meant | none | C (R2.2r) |
| A2 | `camera-policy.md:30` | One `CameraPolicy` serves both the workspace and Watch; whether a manual choice carries over | none | C (R2.2r) |
| A3 | `camera-policy.md:31` | Editing the programme while manual has no visible effect | none | C (R2.2r) |
| A4 | `design-preview.md:27` | For up to 180 ms the checks read the new design against old figures | M-BUILD-015 (R3.4r, K3) | — |
| A5 | `design-preview.md:28` | The rocket bench has no invalid-draft path | none | B (R3.4r) |
| A6 | `design-preview.md:29` | The Explore satellite designer has no drawing | M-LAUNCH-081 (R3.3r) | — |
| A7 | `design-preview.md:30` | The satellite bench shows no last-valid picture; final form or interim? | none | B-S (R3.3r) |
| A8 | `design-preview.md:31` | The drawings are schematic and wait for user review | none | HU-1 / H |
| A9 | `flight-lifecycle.md:30` | No separate completed or aborted stage | none | U (R2.1r) |
| A10 | `flight-lifecycle.md:31` | No single owner of the stage; does R5.1 need a stored lifecycle owner? | none | I (R5.1) |
| A11 | `flight-lifecycle.md:32` | Where "finishing at the live head does not pull the cursor out of replay" is held | none | V (R2.6) |
| A12 | `flight-lifecycle.md:33` | `previewsChange` against the plan's `shouldPreview` | settled in the ADR | — |
| A13 | `handoff.md:31` | `parseHandoff` returns the raw `design` object; extra keys pass | none | S (R3.1r) |
| A14 | `handoff.md:32` | In-memory hand-offs are not parsed; no file or link reader yet | none | S (R3.1r) |
| A15 | `handoff.md:33` | The Share file and catalogue-flown Engineer rockets carry no DesignRef | M-PLAN-028 ("DesignRef on Share link/file and Engineer record Fly it") | — |
| A16 | `handoff.md:34` | The DesignRef holds identity and revision only; no immutable flown inputs or model provenance | partly M-PLAN-028 (build stamp) | S (R3.1r) |
| A17 | `handoff.md:35` | The stored mission drops the ref, the hand-off drops the whole thing: intended as a pair? | none | S (R3.1r) |
| A18 | `result-action.md:38` | `shape` points only at `setup.perigee` | none | U |
| A19 | `result-action.md:39` | The destination field is a plain `string` | none | S/U |
| A20 | `result-action.md:40` | `readinessTarget` parses the validator's `path` string with regular expressions | none | B (R3.4r) |
| A21 | `result-action.md:41` | Which result surfaces wire `onShowSetting` is not listed | none | I/U |

## Questions for the owner (proposals, not decisions)

The numbers are those of the GK1 card's questions for sign-off (S1–S12). Nothing here is decided until the owner answers.

1. **S7: owners for the 42 rows with no owner** (K1-01 holds 16 ADR points). Accept the proposed lanes (from `S18` §18.2), or name others. 39 rows carry a proposal; K0-13, K1-24 and K1-62 carry none, because each is a question for the owner. K1-110 and K1-111 joined at the freeze; K1-07 and K1-41 left. An item that needs a new M-id waits for the owner's acceptance at a GK.
2. **S7: the 10 rows never asked** (`NOT ASKED`), holding 19 questions. Put them on one card at GK1, or close each as "no change". HU-1's Q-1…Q-8 (K0-31) block HU-1 step 2 before the November sessions.
3. **S7: the misrouted row.** K1-52, the `exportAll()` double read. No record is wrong: `PROGRESS:157` says only that PR4 merged. Proposal: L, in R1.6 PR5 beside M-PLATFORM-007 (K1-51), or a new item.
4. **S3: the re-plan row.** It carries every `RE-PLAN` row here, K1-33 included. P4 (ก) sent K1-33 there; the row as a whole still waits for approval before K2 (`S05:434`).
5. **S10: R7.5.** The re-plan's edits to `packages.tsv` and S05 need R7.5 authorized, or a one-off approval for that docs PR (`S05:434`; K1-87). `S05:434` does not name `registry.tsv` or `assignment.tsv`, which also carry each item's wave (`plan/README.md:53`). Proposal: the same docs PR updates their wave column for the moved items.
6. **S4: the teaching tools in K2** (K1-106). New facts from the freeze: the teaching-tools build is +0.5 kB over `index-*.js` and +0.6 kB over precache code (K1-106); the six held journeys passed there (K1-79); `classroom-preparation`'s local failure did not show (K1-109).
7. **S12: the `q01` branches** (`claude/t-fx8-s2` at `071db68`, `claude/t-fx8-picture-moment-s1` at `0ac5ca4`; K1-17). Deleting them is the owner's action. Session pushes were refused before.
8. **S1: K2's plan sections and K2 authorization** (D-65). The K2 packages that S06 §06.5 held for G2 (K0-36) are planned and not authorized. Nothing here starts them.

Answered since the `a05ae70` pass, and recorded here: K1-07 (P5 ก), K1-33 (P4 ก), the HU-6 extras K1-41 and K1-10 (P3 ข), and `pd-r41-s1` after GK1 (P4 ก; K1-60).

## Waits for the owner's HU-6 session

Nothing here is a result. The owner's session report fills these slots.

| Row | What the session fills | Result |
|---|---|---|
| K1-90 | The session on a low-cost Android and an iPad: the live About stamp, one full mission without a reload, the old service worker's reload | _waits for the owner's HU-6 session_ |
| K1-41 | Task 12: a large Monte Carlo run, then "Download CSV" by hand on iPad Safari and Android Firefox: file size, rows, last row complete, a late confirm | _waits for the owner's HU-6 session_ |
| K0-40 | The real-device part of S06 §06.5's last row | _waits for the owner's HU-6 session_ |
| K1-78 | The HU-6 link in `R7.1-GK1.md` | _waits for the owner's HU-6 session_ |

K1-10 (Android peak memory) is not in this session by the owner's answer P3. It stays open for a later GK.

## Not verified or not covered

- The owner's answers P1–P5 and #179's Merge Desk are cited at `5092ac9` (#181), which is open. If #181 changes before it merges, those citations move.
- No HU-6 result exists. Every HU-6 slot above is empty on purpose.
- The decision-7 run, the P1 baselines, the P2 revert drill, the D-64 check and the KPI-28 count are local runs or reads from the integration session. I read their write-ups and checked the code lines they cite at the candidate. I did not run them again.
- The other files of this record PR ([kpi-GK1.md](kpi-GK1.md), [K1-retro.md](K1-retro.md), [revert-drill-GK1.md](revert-drill-GK1.md), `R7.1-GK1.md`) are cited by section, as they stood at about 22:45Z while they were still being edited. At integration the sections cited were checked against the final files: `R7.1-GK1.md` carries the candidate's viewport × language matrix ("The viewport × language matrix": `r2-viewport-matrix`, 96 cells, Pages 40385448079 `browser (2)`, 450.2 s).
- **Q check** (`S05:94`; proposed rule 3 of the re-plan): done on 2026-10-27 by a checker that did not write this table, against primary sources only. Every one of the 153 rows (status, flag, owner and the evidence git or GitHub can reach), the Summary counts, the "Changed at the freeze" table, Appendix A and this PR's PROGRESS changes were checked; no row's status was refuted. Q check: confirmed 352 of 409 claims (2026-10-27), 4 of them corrected after the check (the deploy times of Pages 37469527345 and 37411480482 in PROGRESS, K1-80's `TEACHER_TOOLS` lines, #115 in the docs-only list, the review's question lines); 57 not checkable from primary sources (local runs, or judgements). Method and totals: [kpi-GK1.md](kpi-GK1.md), "Gates".
- The bodies of #168 and #169 (tooling) were not read, nor #169's review report `docs/history/skills-review-2026-10-19/CLAUDE_FINAL_REVIEW_REPORT_TH.md`. #158 and #164 were scanned by keyword only.
- The candidate's browser shard logs were read as their journey lines and summaries, not step by step.
- The draft plan sections' own lists of items passed to other sections were not checked: S10 §10.3.1, S16 §16.8, S17 §17.7 at `c2af8ae`. They are plan text, so they belong to the adoption step (GK item 12). The same holds for the S19 side of K0-06.
- HU-1's Q-1…Q-8 may have been answered in a chat that was never recorded. Nothing on main shows an answer.
- The "propose" owners are my reading of `S18` §18.2. The triage of report lines into items is my reading of the reports.
- `assignment.tsv`'s `status` column is not updated after merges, so it was not used as evidence of done.

## Sources

- `origin/main` at the candidate `7263004`, and #181's `5092ac9` for the files it changes (`git show`, `git grep`, `git blame`, `git log`, `git diff`; 2026-10-26, about 22:30–22:50Z):
  - `docs/development/plan/S05-structure-waves-gates.md` (`:110-122`, `:428-434`), `S06-closeout.md` (`:333-342`), `S18-execution-model.md` (`:26-80`, `:233`, `:433`);
  - `docs/development/plan/data/packages.tsv`, `assignment.tsv`;
  - `docs/development/PROGRESS.md` (register `:122-214`, variances `:218-237`, answers not carried out `:239-253`; FX-3 and HU-6 rows `@5092ac9`), `docs/DECISIONS.md` (`:354-357`, `:363`; `:364-369 @5092ac9`), `docs/development/HANDOVER-K1.md` (§5–§9, `:110-227`);
  - every report under `docs/development/reports/` from #84 on, including `FX-2-s2b-m-learning-027-writer.md` and `GK1-ceilings-q03-1.md`, and `docs/development/adr/*.md`;
  - code checked at the candidate: `src/i18n/en.ts`, `src/i18n/th.ts`, `src/orbit/sky-tour.ts`, `src/workspace/repository.ts`, `src/projects/archive.ts`, `src/ui/profiles/profile-dialog.ts`, `src/ui/hud.ts`, `src/ui/watch.ts`, `src/ui/held.ts`, `src/ui/help-state.ts`, `src/ui/section-nav.ts`, `src/ui/lessons/lesson-mode.ts`, `src/main.ts`, `src/pwa/sw-core.ts`, `src/lessons/pack-sources/ru-24-05-06.ts`, `budgets.json`, `scripts/bundle-budget.mjs`, `tests/eo-sto/harness.ts`, `tests/browser/journeys/{r2-viewport-matrix,r2-flight-shell,webgl-startup,mobile-smoke,r7-cross-system}.mjs`, `tests/verification/jpeg-pixels.test.mjs`, `docs/USER-TEST-2026-10.md`, `docs/README.md`, `docs/USER-STUDY-HUF.md`;
  - `git diff --stat a05ae70 7263004 -- src tests` (empty); `git diff 7263004 5092ac9` (Markdown only).
- `git ls-remote --heads origin`, 2026-10-26T22:45:49Z: 61 heads; main at `7263004`; `claude/t-fx8-s2` `071db68`, `claude/t-fx8-picture-moment-s1` `0ac5ca4`, `claude/pd-r41-s1` `e777aae`, `claude/i-co4-d36a3-s1` `f286b8b`, `claude/charming-archimedes-01p1h5-wip-rebaseline-snapshot` `5d942b4`. No tags.
- GitHub (read only), 2026-10-26:
  - PR list at about 22:46Z: #181 open (head `5092ac9`, opened 21:35:56Z); #180 merged 18:03:55Z; #179 merged 19:17:43Z; #178 merged 16:13:13Z; #177 merged 16:19:19Z; #176 merged 14:33:27Z.
  - Pages 40385448079 (`deploy.yml`, push of #179) at `7263004`: all 11 jobs passed; `actions/deploy-pages` done 19:41:58Z; browser (1) job 121793499922, 13/13 in 1 209.3 s; browser (2) job 121793499914, 12/12 in 1 191.1 s; browser (3) job 121793500417, 12/12 in 1 095.3 s; verify job 121804252720.
  - Pages 40357991698 at `a05ae70` (`deploy-pages` done 16:55:51Z) and 40340692641 at `c5da5bb` (15:10:22Z): all jobs passed.
  - PR CI 40371529487 (#179, on `18973db`): success.
  - PR bodies of #100, #104, #108, #111, #112, #115, #118, #129, #138, #146, #153, #154, #155, #158, #160 and #164.
- `docs/history/2026-10-17/ARGON4-REVIEW.md` (#155's review, `:75-84`).
- Plan drafts at `c2af8ae` (branch `claude/hopeful-allen-1o0vmh`): `S07:211`, `S10:222`, `S16:472`, `S16` §16.8 (read, not checked item by item); `docs/development/plan-v2-draft/perf-baseline/measure.mjs:241`.
- The GK1 readiness report (a Claude Docs page shared in chat; DECISIONS calls it "the GK1 readiness report"): its G0 and G1+ table and the notes under its ceilings table.
- Local evidence, not committed (integration session, 2026-10-26): the M-PLAN-026 hand-off triage and its re-run at the cutoff 19:42:02Z; the D-64 check; KPI-28; the six held and four extra journeys on a teaching-tools build of the candidate and the Escape check; the P1 baselines; the P2 revert drill; the HU-6 session kit.
