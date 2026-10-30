# K1 retrospective and re-estimate / ทบทวนหลังคลื่น K1 และประมาณการใหม่

> **สรุปสำหรับเจ้าของ (ภาษาไทย)**
>
> - นี่คือ retrospective ของ K1 และการประมาณการใหม่ (M-PLAN-026) ที่คุณอนุญาตให้ใช้ที่ GK1 (ข้อ 3 ตอบ ก เมื่อ 26 ต.ค.)
> - ตัวเลขทุกตัวรันใหม่บน `7263004` (#179) ซึ่งเป็น candidate ตอนตรึง จุดตัดคือ 2026-10-26T19:42:02Z ซึ่งเป็นเวลาจบของ Pages 40385448079 ที่เผยแพร่ `7263004` (ขั้น deploy-pages เสร็จ 19:41:58Z)
> - **หลังจุดตัด candidate ย้ายจาก `7263004` เป็น `1842a86`** (`7263004` เป็น candidate ตั้งแต่ 2026-10-26 ถึง 2026-10-29):
>   - #185 (replay: ท่อนจรวดที่ใช้แล้วอยู่บนเส้นทางของมันระหว่างเฟรม แก้ `src/physics/frame.ts`) ถูก merge เป็น `1842a86` เมื่อ 2026-10-29T21:25:44Z ตามที่คุณตอบในแชตว่า "merge #185 ได้เลยครับ" (21:24:24Z) ขณะที่ merge hold H2 ยังมีผลอยู่ session ที่ merge ไม่รู้เรื่อง hold นี้ Pages 40957726247 เผยแพร่ `1842a86` เมื่อ 21:49:41Z ผ่านครบ 11 job (journey 37 จาก 37, unit test 10 526 ตัว)
>   - คุณตอบว่า "HU-6 ยังไม่ได้ทำ ใช้ 1842a86 เป็น candidate ใหม่ครับ" และเลือก "Redo all (Recommended)" คือทำหลักฐาน GK1 ใหม่ทั้งหมดบน `1842a86`
>   - ทำใหม่ครบแล้ว: heavy และ six-DOF fleet รันบน `1842a86` เองใน run 40965856304 ผ่าน 257/257 และ 164/164 (ใช้ผลเดิมแทนตาม D-64 ไม่ได้แล้ว เพราะ #185 แก้ `src/physics/frame.ts`) journey ที่พักไว้ 6 ตัวผ่าน 6 จาก 6 ค่าฐาน KPI วัดใหม่แล้ว (จำนวนเท่ากับ `7263004` ทุกค่า ส่วนขนาด `index-*.js` ใหญ่ขึ้น 40 B และ `flight.worker-*.js` 38 B) และการซ้อม revert ผ่าน 56 จาก 56
>   - Pages รอบตามเวลา 40962284621 ที่ `1842a86` ล้มที่ `r3-first-launch` บน runner ที่ใช้เวลานานกว่ารอบ 40957726247 ราว 1.69 เท่า จึงไม่ได้เผยแพร่ เว็บจริงยังเป็น `1842a86` จาก 40957726247 บันทึกไว้ทั้งสองรอบ ยังไม่ได้สรุปว่าหมายถึงอะไร
>   - ผลบน `1842a86` เกิดหลังจุดตัด จึงไม่นับรวมในตัวเลขของ retrospective นี้ ตัวเลขอื่นยังเป็นค่าที่จุดตัดบน `7263004` (การรันสคริปต์ M-PLAN-026 ไม่ได้ทำใหม่)
>   - HU-6 ยังไม่ได้ทำ และต้องเห็น stamp `v0.1.0 · 1842a86` กฎของ H2 ไม่เปลี่ยน: ไม่มีอะไร merge จนกว่า session HU-6 จบ จากนั้นจึง #181, #182 และ #186 (PR บันทึกที่ fold #185) ตามลำดับ
> - เลขบรรทัดของ PROGRESS และ DECISIONS อ้างที่ `7263004` ยกเว้นที่เขียนว่า "at `5092ac9`" (records PR #181 ซึ่งยังไม่ merge เพราะรอ HU-6 ส่วน head ของ #181 ตั้งแต่ 30 ต.ค. คือ `ba41b8b` ซึ่งเลขบรรทัดเหล่านี้เท่าเดิม)
> - K1 merge เข้า main 85 PR (#95–#180 ไม่นับ #167) เป็นงานของแพ็กเกจในแผน 45 PR เทียบกับ 49.9 ที่ S05 ประมาณไว้สำหรับ K1
>   - 38 PR ในจำนวนนี้ merge ระหว่าง 6–9 ต.ค.
>   - หลัง 9 ต.ค. มีงานในแผนเพิ่มแค่ 7 PR ใน 9 วันทำการ ส่วน 14 จาก 29 PR ในช่วงนั้นเป็นงานที่คุณขอนอกแผน
> - แพ็กเกจที่รู้จำนวน PR สุดท้ายแล้วใช้ PR มากกว่าที่ประมาณ 1.49 เท่า เช่น R1.6 ประมาณ 8 ใช้ไปแล้ว 10 และยังเหลือ 4
> - lead time (เปิด PR → merge) มัธยฐาน 45 นาที (K0: 12.6 ชม.)
> - throughput ที่วัดได้คือ 3.46 PR ของแผนต่อวันทำการ ใช้แทนสมมติฐาน 2.6/1.7 ของ S05
>   - PR เปิดพร้อมกันเฉลี่ย 1.33 ตัว และไม่มี PR ของแผนเปิดเลย 41% ของเวลา
>   - ค่าเฉลี่ยมาจากสองช่วงที่ต่างกันมาก: 9.5 PR ต่อวันในช่วง 6–9 ต.ค. และ 0.78 PR ต่อวันหลังจากนั้น
>   - สิ่งที่จำกัดคือมีงานในแผนที่พร้อมและเปิดทำอยู่น้อย ไม่ใช่เพดาน WIP
> - วันที่ของประตูใหม่ (ตัวแรกนับตามจำนวน PR ในแผน ตัวหลังคูณ 1.49) ตามปฏิทินที่คุณตอบใน S11 เมื่อ 28 ต.ค. ("ไม่พัก" เวลา 03:04:38Z และ "ก ไม่ข้ามวันหยุดด้วย (แนะนำ)" เวลา 03:07:38Z: ไม่พักปลายปีและไม่ข้ามวันหยุดราชการ) เลข Day เท่าเดิม แต่ประตูหลัง ๆ เร็วขึ้น 10 วันทำการ ในวงเล็บคือวันที่ตามปฏิทินตอนตรึง candidate ซึ่งข้ามพักปลายปี:
>   - GK2: 4 ธ.ค. – 23 ธ.ค. 2026 (เดิม 4 ธ.ค. 2026 – 6 ม.ค. 2027)
>   - GK3: 5 ม.ค. – 5 ก.พ. 2027 (เดิม 19 ม.ค. – 19 ก.พ.)
>   - GK4: 10 ก.พ. – 1 เม.ย. 2027 (เดิม 24 ก.พ. – 15 เม.ย.)
>   - GK6: 15 มี.ค. – 18 พ.ค. 2027 (เดิม 29 มี.ค. – 1 มิ.ย.)
>   - ถ้าอัตราเท่าช่วงหลัง 9 ต.ค. GK6 จะเลื่อนไปปี 2028–2029
> - conflict:
>   - PR #95–#114 ทั้ง 20 ตัวต้องแก้ conflict ใน CHANGELOG/PROGRESS
>   - หลัง #115 (ไฟล์ fragment) PR ที่เปิดหลังจากนั้นไม่มี conflict ในไฟล์ hotspot เลย
>   - conflict ในโค้ดมี 3 ครั้ง ทุกครั้งมาจาก PR ที่ต่อจาก branch ของ PR อื่นซึ่งยังไม่ merge
> - Pages บน main ล้ม 16 รอบใน K1 ในจำนวนนี้ 14 รอบเป็นปัญหาของ journey (test) ไม่ใช่ของแอป `r2-flight-shell` ใช้เวลาเกือบ 5 วันกว่าจะแก้ Pages 3 รอบที่เผยแพร่ในวันที่ 26 ต.ค. ผ่านครบ รวมรอบของ `7263004` ซึ่งเป็น candidate ตอนตรึง (11 job และ 37 journey)
> - เวลาเครื่อง: Pages มัธยฐาน 33 นาที (S05 สมมติ 18–22 นาที) fleet 60 นาที (S05 สมมติ 2 ชม. 40 นาที)
> - การตัดสินใจ: ใน K1 ถามคุณ 61 ข้อ ตอบครบ ไม่มีข้อใดช้ากว่า needed-by การตรวจซ้ำได้ผ่าน 97 ไม่ผ่าน 3 (ทั้ง 3 คือ branch ของ q01 ที่ยังอยู่บน GitHub) และมีคำตัดสินที่ทำเบี่ยง 2 ข้อ (q11 เรื่องเพดาน PR และ q03 B ที่ #176 ไม่ได้แจ้งขนาด)
> - งานส่งต่อ (hand-off, ไฟล์ GK1-handoffs.md): 42 รายการไม่มีเจ้าของ ไม่มีรายการที่หายตอนตรึง candidate (ข้อความ ISS ในทัวร์ท้องฟ้าเคยหายทั้งที่บันทึกว่าเสร็จ จนคุณให้ย้ายไป K2 ในข้อ P4 และ #181 แก้บันทึกแล้ว แต่โค้ดยังไม่แก้) และ 1 รายการส่งไปให้งานที่ไม่ครอบ (`exportAll()` อ่านข้อมูลซ้ำ)
> - **แถว re-plan ที่เสนอก่อน K2 (คุณตอบ S3 ว่า "ก อนุมัติตามที่เขียน (แนะนำ)" และตอบเรื่องแผนกับการอนุญาต K2 ว่า "รับรองและอนุญาต K2" ทั้งสองข้อเวลา 2026-10-28T02:54:22Z):**
>   - งานในแผนของ GK1 ครบแล้ว: #175, #176 และ #177 merge และเผยแพร่แล้ว ส่วน PR ลดเพดาน #179 เป็น candidate ตอนตรึง
>   - ย้ายงาน K1 ที่เหลือ 41.6 PR ไป K2:
>     - ส่วนที่ G0/G1+ ยังขาด: ตามที่คุณเลือก ก ในข้อ 1
>     - งาน K1 อื่นราว 30 PR: เป็นเรื่องใหม่ที่ถามใน S3
>     - K2 จะเป็น 103.7 PR ราว 29.9 วันทำการที่ 3.46 PR ต่อวัน (คูณ 1.49: 146.0 PR ราว 42.2 วันทำการ) เทียบกับกรอบเวลา 15–20 วัน
>   - เพดาน WIP คงเดิม (ใน K1 เพดานรายเลนและช่อง I ก็เคยเกิน เช่น #172 กับ #173 เปิดพร้อมกัน 27 ชม.)
>   - throughput ใช้ lead time เฉลี่ย (7.87 ชม.) แทนมัธยฐานที่ S05 เขียนไว้ เพราะค่าเฉลี่ยให้ผลตรงกับจำนวน PR ที่ merge จริง
>   - เสนอกติกาใหม่ 5 ข้อ เช่น ไม่เปิด PR ต่อจาก branch ของ PR ที่ยังไม่ merge และ journey ใหม่หรือที่แก้ต้องรันซ้ำบน CI 20 รอบก่อน merge (จำนวนรอบตามตัวเลือก ก ของ S3) (ดูหัวข้อ PLAN:U13)
> - Node 24: บันทึกนี้อ่านว่าการย้ายต้องเสร็จภายใน Day 85 ตาม S05:386 ที่รับรองแล้ว ซึ่งตรงกับ 2 ก.พ. 2027 ตามปฏิทินที่คุณตอบใน S11 (ตามปฏิทินตอนตรึงที่ข้ามพักปลายปีคือ 16 ก.พ. 2027) ส่วนคำว่า "by GK2" ใน DECISIONS:66 เป็นช่องที่ลงของคำตัดสิน คำตอบ S3 ของคุณ ("ก อนุมัติตามที่เขียน (แนะนำ)") ไม่ได้ระบุ GK2
> - ยังไม่เสร็จ: session บนเครื่องจริง (HU-6) **รอ session ของคุณ** ส่วนการลงนาม GK1 และการ merge บันทึกนี้ รอหลัง HU-6 จบ ตามที่คุณตอบ S1 ว่า "ก ตอบสองรอบ (แนะนำ)" (2026-10-28T02:54:22Z) คำตอบของคุณเมื่อ 28 ต.ค. เรื่องแถว re-plan ส่วนของแผนที่ K2 ใช้ และการอนุญาต K2 (D-65) อยู่ใน DECISIONS หัวข้อ "Decided 2026-10-28" ไฟล์นี้เขียนข้อเท็จจริง ข้อเสนอ และคำของคุณตรงตัวเท่านั้น
> - วัดไม่ได้: เวลาที่งาน "พร้อม" ชั่วโมงที่คุณใช้ตรวจ ขนาด PR และงานบน branch ก่อนเปิด PR รายละเอียดในหัวข้อ "Not measured"

```yaml
envelope: v2
package: R7.2 (K1 retrospective and re-estimate, M-PLAN-026)
items: [M-PLAN-026]
wave: K1 (GK1; records slot)
lane: I
change_kind: docs
status: for the GK1 record PR; every number is from the M-PLAN-026 re-run at the freeze, except the results on 1842a86, which are marked as after the cutoff; the re-plan was proposed, and the owner answered S3 with "ก อนุมัติตามที่เขียน (แนะนำ)" (chat, 2026-10-28T02:54:22Z)
owner_authorization: {decision: "GK1 readiness report, decision 3", date: 2026-10-26, via: chat, answer: "ก", option_text: "อนุญาต M-PLAN-026 เพื่อใช้ที่ GK1 แบบที่ q06 อนุญาต M-PLAN-025", chat_words: "ก อนุญาตเพื่อใช้ที่ GK1 (แนะนำ)", recorded_on_main: "DECISIONS:354 at 7263004, since 52dfe03 (#178)"}
# In English: option (ก), authorize M-PLAN-026 for use at GK1.
candidate_sha: 1842a86cee5a1dc4fd40d536d2bc882d31750021   # main after #185 (replay), merged 2026-10-29T21:25:44Z; the candidate by the owner's answer of 2026-10-29
candidate_published: {pages_run: 40957726247, jobs: "11 of 11 success", deploy_pages_end: "2026-10-29T21:49:41Z"}
freeze_candidate_sha: 72630046fc5eb56f1797e5363b6f9ad293ff9d38   # #179 (q03-1 B), merged 2026-10-26T19:17:43Z; the candidate from 2026-10-26 until 2026-10-29, at whose freeze every number here was measured
freeze_candidate_published: {pages_run: 40385448079, jobs: "11 of 11 success", deploy_pages_end: "2026-10-26T19:41:58Z", run_end: "2026-10-26T19:42:02Z"}
measured_at: 7263004       # PROGRESS, DECISIONS, packages.tsv and assignment.tsv read at 7263004, the candidate at the freeze
base_sha: ba41b8b          # records PR #181 (folds #179; the owner's answers for #179 and P1-P5), its head since 2026-10-30 (was 5092ac9, which this file cites as "at 5092ac9"); open, held until the owner's HU-6 session ends
line_numbers: "every repo file at 7263004 (the same at 1842a86, as #185 changes none of the files cited), unless marked 'at 5092ac9' (the same lines at ba41b8b); plan drafts at c2af8ae"
cutoff: "2026-10-26T19:42:02Z for every number (see Scope and cutoffs); the results on 1842a86 (2026-10-29 and 2026-10-30) come after it and are in no count here"
hu6: waits for the owner's HU-6 session (it checks the stamp v0.1.0 · 1842a86)
github_access: read-only (MCP list_pull_requests, pull_request_read, actions_list, actions_get, get_job_logs; and GitHub REST GETs to refresh KPI-34's cache of PR timelines, outside the MCP tools); nothing written
repo_path: docs/development/reports/K1-retro.md
```

Values are in [kpi-GK1.md](kpi-GK1.md). This page says what K1 delivered, what worked, what did not, and what changes for K2, as [K0-retro.md](K0-retro.md) did. It also carries S05 §05.11 items 1–5 (`S05:430-434`):
1. Merged PRs per lane against `pr_estimate`, and KPI-33, KPI-34 and KPI-35.
2. The re-estimate: remaining PRs ÷ measured throughput, and the §05.9 gate dates recomputed. At GK1 the measured values replace 2.6 and 1.7 PRs a day and lane I's bound (`S05:431`, `S05:380`).
3. to 5. The re-plan: what moves, the WIP cap and PR size, facts that changed after the base, and the PROGRESS re-plan row the owner approves before K2.

It also covers what the draft S17 row for M-PLAN-026 asks (`c2af8ae:S17-r7-quality-release.md:140`): the PLAN:U13 part (hard, slow and repeated work), machine times as median and p90, re-runs and flake groups, escaped defects, reverts and forward fixes, the hand-off backlog and the follow-through results. KPI definitions are S04 §04.2 group J (`c2af8ae:S04-metrics-budgets.md:159-161`, draft).

## Scope and cutoffs

**The cutoff, stated once.** Every number in this file is measured at **2026-10-26T19:42:02Z**, the end (`updated_at`) of Pages 40385448079, the run that published `7263004`, the candidate at the freeze. The exceptions are the results on the candidate `1842a86` (2026-10-29 and 2026-10-30; "The candidate moved after the cutoff" below): they come after it, each is marked as after the cutoff, and none is in any count here.
- `retro.py` takes a Pages run's `updated_at` as its publish time. It counts a successful run on main of 5 min or more only when the run ended by the cutoff. 19:42:02Z is the earliest cutoff at which `7263004` counts as published with nothing added by hand.
- `7263004`'s publish time is **19:41:58Z**, when the `actions/deploy-pages` step finished. Deadlines in the records use it.
- Nothing else happened between 19:41:58Z and 19:42:02Z: no PR was opened, merged or closed, no CI run started or ended, and the owner answered nothing. A run at 19:41:58Z gives the same outputs, except that #179 is 4 s short of published (merged → published: 69 PRs, median 2.55 h, instead of 70 and 2.37 h).
- KPI-34 was refreshed to the same cutoff in a separate run (see KPI-34).

**Wave and PRs:**
- **Wave K1** is PRs #95 onward, up to the cutoff. K0 was #84–#93; #94 belongs to neither.
- **Merged at the cutoff:** 85 PRs into main (#95–#180). #167 merged into the plan branch `claude/hopeful-allen-1o0vmh`. It counts only in KPI-34.
- **Merged on 2026-10-26:** #175 (R7.1, M-PLAN-025, `8973e84`), #176 (FX-2 2a, `c5da5bb`), #178 (records, `52dfe03`), #177 (FX-2 2b, `a05ae70`), #180 (records, `46728e5`) and #179 (the ceilings PR, `7263004`, the candidate at the freeze).
  - #175 and #176 published by Pages 40340692641 (`deploy-pages` done 15:10:22Z); #177 by Pages 40357991698 (16:55:51Z); #179 by Pages 40385448079 (19:41:58Z). Every job of the three runs passed.
  - #175, #176, #177 and #179 merged on the owner's answers in chat (the Merge Desk). #178 and #180 merged under the owner's standing approval for records-only PRs (`DECISIONS:157`).
- No PR was open at the cutoff. `git log 7263004..origin/main` was empty at 20:55:12Z.
- **After the cutoff:** records PR #181 (branch `claude/happy-hawking-m71bk1-records-179`, commit `5092ac9`; since 2026-10-30 its head is `ba41b8b`, which brings its rows to the new candidate) folds #179 and records the owner's Merge Desk answer for #179 and the five answers before the freeze (P1–P5; `DECISIONS:364-369` at `5092ac9`, the same lines at `ba41b8b`). It is open and not merged: the merge hold H2 holds it until the owner's HU-6 session ends. It is in no count of this file.
- **The candidate moved after the cutoff.** #185 (replay: spent stages on their arc between frames; `src/physics/frame.ts`, `tests/debris-replay.test.ts`, a report and a change fragment) merged at 2026-10-29T21:25:44Z as `1842a86`, on the owner's chat answer "merge #185 ได้เลยครับ" (21:24:24Z), while H2 was in force; the session that merged it did not know of the hold. It is the one time H2 has been broken. Pages 40957726247 published `1842a86` at 21:49:41Z (the `deploy-pages` step's end): 11 of 11 jobs, 37 of 37 journeys, 10 526 unit tests in 334 files, bundle budget ok. The owner then answered in chat "HU-6 ยังไม่ได้ทำ ใช้ 1842a86 เป็น candidate ใหม่ครับ" (HU-6 has not taken place; 1842a86 is the new candidate), and chose "Redo all (Recommended)" (redo on `1842a86` the evidence the question named: heavy and the six-DOF fleet, the held journeys, the KPI baselines and the revert drill) and "Yes, update both (Recommended)" (update #181 and #182 with new commits) ([DECISIONS.md](../../DECISIONS.md), "Decided 2026-10-29"). So the candidate is `1842a86` (main after #185, published by Pages 40957726247 at 2026-10-29T21:49:41Z); `7263004` was the candidate from 2026-10-26 until 2026-10-29. `git diff 7263004 1842a86` shows only #185's four files, none of them cited by line here.
  - **Redone on `1842a86`,** all after the cutoff and in no count here. Heavy and the six-DOF fleet ran on the candidate itself: `heavy.yml` 40965856304 (`workflow_dispatch`, suite both), 41 of 41 jobs, heavy 257/257 and fleet 164/164; D-64's reuse covered `7263004` only, since #185 changes `src/physics/frame.ts`, and it is no longer needed or claimed. The six held journeys passed 6 of 6 on a local teaching-tools build ([GK1-held-journeys.md](GK1-held-journeys.md)). The KPI baselines (P1) were measured again, alternating with `7263004` on one host: the same counts for both builds, `index-*.js` 40 B and `flight.worker-*.js` 38 B larger at `1842a86` ([kpi-GK1.md](kpi-GK1.md), "New baselines of KPI-01 to KPI-12"). The revert drill (P2) passed 56 of 56 checks ([revert-drill-GK1.md](revert-drill-GK1.md)).
  - **Not redone:** the M-PLAN-026 re-run. "Redo all (Recommended)" named heavy and the fleet, the held journeys, the KPI baselines and the revert drill, so this file's numbers stay those of the cutoff above, on `7263004`.
  - **The schedule run 40962284621** (2026-10-29T21:59Z) at `1842a86` failed browser shard 2 on `r3-first-launch` ("the Watch end card has no "Try this launch yourself""), 11 of 12 journeys, on a job whose journeys took 1.69 times as long in all as in 40957726247's shard 2. Its `verify` and `publish` did not run, so the live site stays 40957726247's `1842a86`. Both runs are recorded; nothing here decides what the failure means.
  - **HU-6** has not taken place; it checks the stamp `v0.1.0 · 1842a86`. H2's rule is unchanged and now protects that stamp: nothing merges until the HU-6 session ends; then #181, then #182, then records PR #186 (which folds #185, stacked on #182).

**Calendar:**
- Day 1 is 2026-10-05.
- Not counted: weekends, 13 and 23 Oct (Thai public holidays named in `S05:359`, as the GK1 readiness report used), and the year-end break 21 Dec 2026 – 1 Jan 2027 (`S05:387`).
- Today, 2026-10-26, is Day 14. K1's timebox ends Day 15, 2026-10-27 (§05.9's "K1 วัน 6–15", `S05:359`; 6–10 working days, `S05:296`).

**Inputs** (read-only, 2026-10-26, about 20:45–21:30Z):
- The PR list (`list_pull_requests`, state all, sort created, perPage 100; page 1 holds #81–#180 with no gaps, so it reaches K0's #84).
- `deploy.yml` runs (143 in all; the newest is 40385448079) and `ci.yml` completed runs (the newest 100; the newest is 40371529487, #179's PR CI). `heavy.yml`: all 8 runs, read again after the freeze (the newest is still 40240193599).
- PROGRESS, DECISIONS, `packages.tsv` and `assignment.tsv` at `7263004`.
- Git history: a full (not shallow) clone with `origin/main` at `7263004`.
- The Merge Desk `decisions` collection, re-read at 21:27Z (unchanged: 33 documents, the last for #132).
- The question and answer times of 2026-10-26 from the session that asked them (the Merge Desk forms for #175–#179 and the five questions before the freeze).

**PR classes:** each PR has one kind, set by hand from the PROGRESS history rows (`PROGRESS:29-113`). Rows for #175–#180 were added at the freeze: #175, #176, #177 package; #178, #180 records; #179 budget. `retro.py` reported no unmapped PR.

**How the numbers were made.** The M-PLAN-026 scripts were re-run once at the cutoff above, with `7263004`, the candidate at the freeze, as the git ref: `retro.py` (twice, the second time with S05's other named holidays), `replan.py`, `auth_lead.py`, `scope_growth.py`, the independent `verify/v_core.py`, `verify/v_wipcap.py` and `verify/v_gates_freeze.py`, `handoff_extract.py` and `kpi35.py`. Every step exited 0. KPI-34's fetch and analysis ran separately at the same cutoff, after its cache of PR timelines was refreshed with GitHub REST GETs (the stale entries for #175 and #176, cached while they were open, were dropped first).
- The scripts and their outputs are a local run, not committed. File names below (`numbers.json`, `gates.tsv` and so on) refer to that run. Every input is a read-only GitHub list or a git command, so a checker can rebuild them.
- `verify/v_gates.py` has the `c5da5bb` rate and remainders written into it, so its exit 0 re-checks the earlier draft. `verify/v_gates_freeze.py` is a copy with the freeze inputs (45 plan PRs over 13 working days; K1 remainder 41.58 / 55.05). It gives the same Days as `retro.py`.
- KPI-35's question set was brought to the cutoff before the run: the Merge Desk answers for #175, #176, #177 and #179 and the five questions before the freeze were added, and nine stale checks were changed to name the merged PRs. The set as it stood before (52 questions) is kept for comparison only.

## What K1 delivered (§05.11 item 1)

### By kind

| Kind | PRs | Which |
|---|---|---|
| Plan package | 45 | see the lane and package tables |
| Owner-requested (outside the plan packages) | 16 | #118, #129, #153–#160, #162, #164–#166, #168, #169 |
| Records | 12 | #96, #116, #121, #142, #143, #150, #161, #163, #170, #174, #178, #180 |
| Test-cause fix | 5 | #100, #107, #112, #133, #171 |
| Budget | 6 | #95, #104, #111, #126, #146, #179 |
| Process | 1 | #115 (change fragments) |
| **Total into main** | **85** | |

Source: `retro.py` PR table; `verify/v_core.py` agrees.

### By date

| UTC date | Plan PRs |
|---|---|
| 6 Oct | 18 |
| 7 Oct | 3 |
| 8 Oct | 12 |
| 9 Oct | 5 |
| 10 Oct (#152) | 1 |
| 17 Oct (#147) | 1 |
| 24 Oct (#172, #173) | 2 |
| 26 Oct (#175, #176, #177) | 3 |

Source: `numbers.json` `plan_merges_by_date`.

In K0 and K1 together, 55 plan PRs merged (10 + 45). S05 §05.6 planned 70.2 by GK1 (`S05:295`).

### By lane

S05's K1 column is recomputed from `packages.tsv` with §05.6's own rule (first lane in `owner`, spread over the wave range, with the exceptions at `S05:270`). It gives the same totals as `S05:294`: K0 20.3, K1 49.9.

The plan lane follows that rule. The actual lane is the one PROGRESS states, or the branch prefix, and otherwise the plan lane. So #172, #173, #175, #176 and #177, on `claude/happy-hawking-m71bk1*` branches, count in their plan lane in both columns.

| Lane | S05 K1 | Merged (plan lane) | Merged (actual lane) |
|---|---|---|---|
| I | 11.3 | 9 | 5 |
| T | 9.1 | 5 | 3 |
| L | 8.0 | 10 | 10 |
| L-C | 6.2 | 3 | 3 |
| L-UI | 3.0 | 4 | 4 |
| C | 2.5 | 1 | 1 |
| P-D | 2.3 | 0 | 0 |
| B | 2.0 | 6 | 6 |
| H | 1.9 | 2 | 0 |
| Q | 1.6 | 1 (#175) | 1 |
| O | 1.0 | 3 | 3 |
| S | 1.0 | 1 | 1 |
| P | 0 | 0 | 2 (#148, #151) |
| U | 0 | 0 | 3 (#113, #117, #123) |
| **Total** | **49.9** | **45** | 42 |

The actual-lane total is 42 because 3 PRs had joint lanes and count in no single row: #101 and #103 were U+Q, and #120 was T+Q.

Source: `lanes.tsv`, `summary.md`.

### By package (K0/K1 packages and early work)

Packages that took more PRs than `pr_estimate`, or that have some merged and some left:

| Package | `pr_estimate` | Merged | PRs | Still needed | Source of "still needed" |
|---|---|---|---|---|---|
| R1.6 | 8 | 10 | #97 #114 #122 #124 #132 #138 #139 #141 #144 #152 | 4 (PR5 M-PLATFORM-007, PR8, PR9, PR10) | written residual (S10 §10.3 PR table) |
| FX-1 | 2 | 5 | #99 #109 #128 #137 #145 | 3 (M-BUILD-029 in three parts) | written residual (S10 §10.4) |
| FX-5 | 2 | 5 | #106 #113 #117 #123 #151 | 1 (M-LAUNCH-035) | written residual |
| FX-2 | 3 | 4 | #110 #125 #176 #177 | 2 (M-LEARNING-002, M-LEARNING-003) | written residual (S10 §10.5) |
| FX-3 | 2 | 3 | #98 #127 #131 | 0 (but see the dropped ISS step under "Hand-offs") | — |
| CO-3 | 2 | 3 | #90 #101 #103 | 0 | — |
| CO-5 | 1 | 2 | #91 #93 | 0 | — |
| CO-4 | 11 | 4 | #86 #134 #172 #173 | 7 (K1: steps 2, 4a, 4b, 5; K2: steps 6, 9, 10 by card `q05` B) | `PROGRESS:125`; `DECISIONS:173` |
| R0.4 | 10 | 2 | #140 #148 | 8 | `pr_estimate` − merged |
| R7.1 | 11 | 1 | #175 (M-PLAN-025, card `q06` A) | 10 over K0–K6 (K1 share 2.14, bookkeeping) | `pr_estimate` − merged |
| R3.4r | 10 | 1 | #149 (M-PLAN-027, early, card `q07` A) | 9 | `pr_estimate` − merged |
| ED-I18N-1 | 2 | 1 | #135 | 1 | `pr_estimate` − merged |
| ED-INST-1 | 5 | 1 | #147 | 4 | `pr_estimate` − merged |
| ED-LES-1 | 5 | 1 | #136 | 4 | `pr_estimate` − merged |
| FX-7 | 3 | 1 | #102 (step 0) | 2 (K2 per §05.6) | `pr_estimate` − merged |

Not started at the cutoff:
- EQ-2 (4), R4.1 (7), I-HOOKS (5), HU-2 (2), HU-3 (2) and HU-6 (1). HU-6's GK1 session on the candidate waits for the owner (decision 6, `DECISIONS:356`).
- R7.2–R7.5. This retrospective is R7.2's GK1 work, authorized for GK1 only (decision 3, `DECISIONS:354`).

R4.1 has unfinished work on branch `claude/pd-r41-s1` (`e777aae`), with no PR (`PROGRESS:250`). The owner confirmed on 2026-10-26 that it waits until after GK1 (P4, option ก; `DECISIONS:368` at `5092ac9`).

**Estimate inflation.** 18 K0/K1 packages have a known final count: they are complete, or their remaining PRs are written down. Across them, the final count is 1.49 times `pr_estimate` (64 against 43; 1.488). Most of the 18 are small bug-fix packages. FX-1 (2 → 8), FX-2 (3 → 6), FX-5 (2 → 6) and R1.6 (8 → 14) carry most of the overrun. Source: `numbers.json` `inflation`.

## How K1 ran

### KPI-33 lead time

S04 defines KPI-33 as ready → merged, from PROGRESS lifecycle times. PROGRESS has no "ready" stage, so PR opened → merged stands in. Sessions opened PRs once the work was done.

| Wave | Set | n | Median | Mean | p75 (exclusive) | Max |
|---|---|---|---|---|---|---|
| K0 | all (all plan) | 10 | 12.61 h | 9.51 h | 13.45 h | 14.57 h (#87) |
| K1 | all | 85 | **0.757 h** (45 min) | 7.87 h | 5.55 h | 181.19 h (#147) |
| K1 | plan package | 45 | 1.343 h | 11.67 h | 13.91 h | 181.19 h |
| K1 | not records | 73 | 1.139 h | 9.04 h | 8.43 h | 181.19 h |
| K1 | owner-requested | 16 | 0.426 h | 6.83 h | 4.09 h | 67.73 h (#129) |
| K1 | records | 12 | 0.006 h | 0.74 h | 0.18 h | 8.16 h (#96) |

Source: PR `created_at` and `merged_at`, via `retro.py` (`summary.md`) and `verify/v_core.py`.

- #175 took 15.49 h, #176 9.11 h, #177 0.26 h (15 min 49 s) and #179 1.55 h. All four waited for the owner's Merge Desk answer.
- `kpi-GK0.md:38` gives K0's median as 12.8 h. Its own per-PR list gives 12.6 h.
- The GK1 readiness report gave 45 min over 75 PRs, up to #170 (its KPI table, KPI-33 row).

**Authorized → merged** (working days). The register's "Authorized by / date" gives only a date (2026-10-05) for every K0/K1 package. Cards with their own date: `q05` B for #172 and #173, `q06` A for #175 and `q07` A for #149 (all 2026-10-09).

| Wave | n | Median | Mean | Max |
|---|---|---|---|---|
| K0 | 10 | 0 | 0 | 0 |
| K1 plan PRs | 45 | 3 | 3.09 | 13 (#176 and #177) |

Source: `auth_lead.py`. #176 and #177 both merged on 2026-10-26 against the date-only authorization of 2026-10-05. #175 counts 9, from card `q06` A.

Where a decision card has a timestamp:
- `q05` B (2026-10-09T22:27:00Z, `DECISIONS:173`) to #172 and #173: 361.4 h, 8 working days.
- `q06` A (2026-10-09T22:27:11Z, `DECISIONS:174`) to #175: 400.1 h.
- `q07` A to #149: 0.93 h.

**Merged → published.** Published means the first successful `deploy.yml` run on main of 5 min or more whose source contains the merge commit, timed at the run's end (`updated_at`). Shorter runs are the plan job's stale-source skip.

| Wave | Set | n | Median | Mean | Max |
|---|---|---|---|---|---|
| K0 | Pages-triggering | 7 | 0.47 h | 0.66 h | 1.13 h |
| K1 | Pages-triggering | 70 | 2.37 h | 6.74 h | 47.03 h (#165) |
| K1 | app-changing | 48 | 2.37 h | 5.23 h | 20.74 h (#153) |
| K1 | app-changing plan PRs | 37 | 1.91 h | 5.09 h | 15.59 h (#123) |

Source: the `deploy.yml` run list and `git merge-base --is-ancestor`, via `retro.py`. No K1 PR is unpublished.

- #175 0.62 h, #176 0.62 h and #177 0.61 h (Pages 40340692641 and 40357991698); #179 0.41 h to the run's end, 0.40 h (24 min 15 s) to the `deploy-pages` step.
- 15 K1 PRs were Markdown only and start no Pages run: #96, #115, #116, #119, #121, #141, #142, #143, #150, #161, #163, #170, #174, #178, #180.
- #165 was held back by `r2-flight-shell` failures on Pages (see "Re-runs and flake groups").

**Records fixed in this PR.** Four PROGRESS rows cited a later Pages run than the one that first published the PR. The `deploy-pages` step of runs 37341257979, 37411480482 and 37469527345 was checked by hand: each succeeded. The four rows were the same at `7263004` and at `5092ac9`; the GK1 record corrects them, and the CO-5 register row (`PROGRESS:126`), which cited 37348596650 for #91 too. Row 36 also called 37348596650 the first three-shard Pages run; that was 37341257979 (browser shards 9m31s, 11m43s, 14m59s).

| PROGRESS line | PR | Cited run | First run that published |
|---|---|---|---|
| 36 | #91 | 37348596650 | 37341257979 |
| 54 | #95 | 37472989857 | 37411480482 |
| 34 | #100 | 37472989857 | 37469527345 |
| 49 | #101 | 37472989857 | 37469527345 |

### KPI-34 conflicts and rework

Refreshed to the freeze cutoff: 86 K1 PRs merged (#95–#180), 85 of them into main; #181 open. Source: the KPI-34 fetch and analysis at 19:42:02Z (local run, not committed; the same values as [kpi-GK1.md](kpi-GK1.md), KPI-34).

S04 counts two things:
- PRs that touched a hotspot (S18 §18.3) and had to resolve a conflict.
- PRs made to fix an earlier PR of the same wave.

In K1, sessions brought branches up to date by merging main into them, not by rebasing. Only #162 was rebased while open. So (a) below counts a merge from main that resolved a conflict on a hotspot.

The hotspots are the primary paths of S18 §18.3.1–18.3.4 (`S18:95-138`): `src/main.ts`, `index.html`, `src/style.css`, `src/ui/modes.css`, `src/i18n/*.ts`, `budgets.json`, `docs/development/PROGRESS.md` and `CHANGELOG.md`.

**Method.** A merge commit counts as a conflict when replaying its two parents with `git merge-tree --write-tree` exits 1. This agrees with git's own "# Conflicts:" block on 94 of 98 merges. The other 4 have hand-written messages: 2f1b45d, 33d5004, 93eeefa and 0eba790. 0eba790's message says in prose that a conflict was resolved.

**#175–#180, the PRs since the earlier draft** (the refresh, and by hand with `pull_request_read` commit lists and `git show --stat` of each squash commit):
- None has a merge from main. #175 has one commit (`07b2ca8`), #176 three (`31836d1`, `e3f530a`, `30b6995`), #177 five (`e07840a` … `56ab44f`), #178 one (`90ba794`), #179 one (`18973db`) and #180 one (`a465cf5`).
- #177 was rebased onto `c5da5bb` before it opened (its commit `56ab44f` says so). #177, #178 and #179 carry commits re-committed more than 10 min after they were written, a sign of a rebase or amend before the PR opened. Whether those met a conflict is not recorded. No branch of #175–#180 was rewritten while its PR was open: the only force push to an open PR in K1 is #162's.
- #175, #176 and #177 touch no primary hotspot. #179 changes `budgets.json`. #178 and #180 are records PRs and write `CHANGELOG.md` and `PROGRESS.md`, as records PRs do.
- So the conflict counts below change only in the PR totals.

#### (a) Hotspot conflicts

| Measure | K1 | K0 (same script) |
|---|---|---|
| PRs into main | 85 | 10 |
| PRs touching a primary hotspot | 47 | 9 |
| PRs that merged main into their branch | 45 (97 merges) | 8 (18 merges) |
| Merges that conflicted (any path) | 70 of 98 | 18 of 18 |
| Of those, on a hotspot | 65 | 18 |
| **PRs that resolved a hotspot conflict (KPI-34 a)** | **20** (#95–#114, all merged 2026-10-06) | 8 |

The 98 K1 merge commits include d0ec4f8, a merge of #101's branch into #103.

Hotspot conflicts by file in K1:

| File | Conflicting merges |
|---|---|
| `CHANGELOG.md` | 64 |
| `PROGRESS.md` | 29 |
| `src/main.ts` and `src/style.css` | 1 (#103, 2bc4299) |
| `budgets.json`, `index.html`, `modes.css`, i18n | 0 |
| §18.3.5 single-writer paths | 0 |

Source: the KPI-34 analysis at the freeze cutoff (local run, not committed); 2bc4299 confirmed with `get_commit`.

**Before and after #115.** #115 moved CHANGELOG and PROGRESS lines into `changes/` fragments. It merged 2026-10-06T18:54:23Z.

| | Merges | Conflicting | On a hotspot |
|---|---|---|---|
| Before #115 | 63 | 63 | 63 |
| After #115 | 35 | 7 | 2 |

- The 2 hotspot conflicts after #115 were #113 (8117793) and #114 (eba3ac1), both at 19:04Z. Both PRs were opened before #115.
- No PR opened after #115 (#116–#180) had a hotspot conflict. 28 of those PRs touched a hotspot: 25 up to #174, and #178, #179 and #180.
- #115's own body counted "78 of 80 catch-up merges since 2026-10-04 conflicted, 2 in code; CHANGELOG 73, PROGRESS 46". The script, for #84–#114 up to #115's creation, finds 81 of 81, 2 in code, CHANGELOG 76 and PROGRESS 46.

**Code conflicts.** All 3 K1 code conflicts came from a PR whose branch started from another PR's unmerged branch. Once that parent PR was squash-merged, merging main brought the same lines back:

| PR | Stacked on | Merge | Paths |
|---|---|---|---|
| #103 | #101 | 2bc4299 | `src/main.ts`, `src/style.css`, `tests/browser/scene-floor.mjs` |
| #109 | #99 | 4a72d1a | `src/ui/build/explore-level.ts`, `ratings-job.ts` |
| #159 | #158 | 09513d4 | `src/render/atmosphere.ts`, `scene.ts` |

Stacking did not always conflict. 7 K1 PRs carry commits of another, then unmerged, PR's branch: #103 (#101), #109 (#99), #114 (#97), #131 (#127), #137 (#128), #139 (#124) and #159 (#158). #114 conflicted only on CHANGELOG/PROGRESS. #131, #137 and #139 merged main without a conflict.

Other conflicts after #115, on non-hotspot paths:
- #117 (d16874e): a report.
- #155 (95d4ebc) and #156 (d200310): `docs/DECISIONS.md`.
- #169 (0eba790): `.gitignore`, the same change #168 made.

**Rebase during an open PR.** One: #162, at 2026-10-18T03:51:23Z (head 7f37a0c → 3571c97, base 1dd8d94 → 8f67eaf). Replaying it shows no textual conflict. Before the PR opened, a rebase put its i18n chunk 299 B over the 1729 kB ceiling, and six strings were shortened to fit (commit 56f7421). That is a budget clash, not a text conflict.

Of the other 9 rewritten pushes in the repo events (visible from 2026-10-08T20:35Z), 8 were branch resets after a squash merge, 5 of them to reuse the branch for the next PR (#149, #156, #163, #171, #172). The ninth rewrote #155's branch before #155 opened.

**I-train.** No `hook_request` or I-train appears in any K1 PR body or comment up to #174 (at `408ad16`; #175–#180's bodies were not searched for it). The train protocol (S18 §18.3.1) was not used, so its queue wait is zero.

#### (b) Rework within the wave

| PR | Fixes | Class | Evidence |
|---|---|---|---|
| #133 | #122 | test fix | body: "test fix (the journey added in #122)" |
| #145 | #128 | residual | body: "Four Build paths still replaced a design … after #128" |
| #151 | #117 | residual | #117's review: "Residual, not blocking … left for a follow-up"; `HANDOVER-K1.md:209` |
| #152 | #114, #97 | residual | body: "follow-up FU-SEL (registered in the R1.6 PR2 report)" |
| #154 | #108 (and the owner's 5 direct commits to main) | test fix | commit 01bc5f8; Pages 38803193779 failed on the direct commits |
| #160 | #156 | test fix | Pages 39036978377 and #158's CI 39065071897 red |
| #153 | #152 | owner direction change | 4 of 7 new tests fail on ceb3fab |
| #162 | #155 (commit 1293372) | owner direction change | `refs/pull/155/head` contains 1293372 |
| #116, #143, #174 | earlier K1 records | records corrections | #174 fixed 53 findings: 45 in the first round and 8 in a second (PR body; squash message of `408ad16`). |
| #180 | #178 | records correction | `46728e5`'s message: "40340692641's entry now says the six held journeys were logged as held in each shard, as its three shard logs show" |

Checked and not counted:
- #107, #149, #164, #171 and #176 fix work from before K1. #176 fixes a placement-test behaviour from #22 (2026-09-26, `FX-2-s2a-m-learning-027-reader.md`).
- #109, #138, #157, #158, #159, #177 and #179 are planned steps (#177 is FX-2 2b; #179 is the `q03-1` B ratchet).
- #155 fixes older code after the outside review.
- #156 is the owner's scope decision.
- #175 adds a new journey and no app code.
- #178 folds #175 and #176 and records the owner's answers; it corrects no earlier row.

The rows for #176–#180 were classified by one agent. The Q check confirmed their facts; the classification stays a judgement.

**KPI-34 for K1:**
- 26 on the strict reading: 20 PRs with hotspot conflicts plus 6 rework PRs.
- 32 if the 2 direction changes and the 4 records corrections count too.
- The baseline in S04 is "not tracked". K0 had 8 PRs with hotspot conflicts. Its rework was not classified.

### KPI-35 owner decisions

Measured at the cutoff with the question set brought to it (see "How the numbers were made"). The GK1 gate has not run, so lateness is against each decision's needed-by wave. `kpi35.py` is run again with the GK1 time at sign-off.

| Measure | Value | Source |
|---|---|---|
| Decisions asked in K1 and answered | 61 of 61 (card 29, chat 24, form 4, readiness doc 4) | `kpi35.py`; `DECISIONS:138-363`; `:364-369` at `5092ac9` |
| Later than the needed-by wave | **0** | `kpi35.py` |
| S08 batch-B rows with needed-by K1 | 13, answered 2026-10-05 01:42–02:33Z, before K1; 0 late | `DECISIONS:48-63` |
| Asked → decided, both times exact | n = 11, median **5.84 h**, min 0.00 h (#175 and #176: answered 14 s after the form was shown), max 27.10 h (`k1-final-budget`, `DECISIONS:160`) | page-1 `updatedAt` and `answers.at`; the 2026-10-26 forms |
| Asked → decided, only bounded | n = 50, upper bounds, median 23.08 h, max 73.66 h | page 2 ≤ 23.1 h; readiness-doc decisions 3, 5, 6, 7: 48.0–73.7 h |
| Raised → decided over 48 h | 13 rows: `q06` 90.0 h; `q15` 75.2; `q08` 73.3; `q03-1` 66.5; `q13` 66.5; `q02` 66.3; ED-INST-1 privacy points 145–169; readiness-doc decisions 3, 5, 6, 7: 54.0–73.7; P1 73.4 (raised by the readiness report); P5 428.8 (raised by #140 on 2026-10-08) | `kpi35.py` evaluation table |
| Merge Desk clicks: PR opened → owner's click | n = 22 (#95–#132), median 3.9 h, max 27.56 h (#130–#132) | Merge Desk `decisions`, re-read 21:27Z |
| Merge Desk in chat, 2026-10-26: asked → answered | #175 and #176 0.00 h; #177 0.02–0.25 h; #179 1.21–1.50 h | the session's question and answer times |
| #172 / #173 waiting for the owner's answer | 29.67 h / 26.94 h | PR list; `DECISIONS:342` |
| Decision checks that can be re-run | 54 of 61 asked rows have one; 97 pass, 3 fail | `kpi35.py` |

- The 3 failing checks are true. `claude/t-fx8-s2` and `claude/t-fx8-picture-moment-s1` are still on origin, although `q01` was cancelled (`DECISIONS:355`). Deleting them is the owner's action; on S12 the owner answered "ก คุณลบทั้งสอง branch เอง (แนะนำ)" (the owner deletes both; chat, 2026-10-28T03:04:38Z).
- #179's first form was shown at 17:47:19Z. A worker restart at 18:02:45Z closed it unanswered, and it was shown again at 18:05:01Z. The owner first answered "ขอดูทีละข้อ" (one at a time) at 19:17:23Z.
- Not added, with reasons: the question on the order of #180 and #179 was never put to the owner (#180 merged under the standing approval for records-only PRs); the HU-6 timing question was closed by the restart and not asked again; "ทำต่อเวลา 2350 UTC+3" (19:33:11Z) is a scheduling instruction, not a decision.
- On the Merge Desk, #103–#106 were merged 0.74–2.56 h before their recorded click (2026-10-06T17:03–17:04Z).
- 8 items raised in reports were never asked (`kpi35.py` "unasked open"). P5 was one of them (`u-compressed`, raised by #140) until it was asked on 2026-10-26.

### Decision follow-through and hand-offs (GK checklist items 10 and 11)

The full tables are in the same PR: [GK1-followthrough.md](GK1-followthrough.md) (file 3) and [GK1-handoffs.md](GK1-handoffs.md) (file 4). Their statuses and counts are the record. This section gives what the retrospective uses from them.

**Follow-through (S08 §08.6).**
- The re-runnable checks of KPI-35 at the cutoff: 97 pass and 3 fail (above).
- **Deviated: 2.** The S08 target is 0 new deviated rows per wave (`S08:451`, draft).
  - `q11`'s "respect the PR cap": 6 code PRs were open for 10 s on 2026-10-09, 23 min after the answer (`PROGRESS:231`).
  - `q03`'s "every PR states its measured size": #176 (2a, data-safety work inside the allowance) gave no size (other chunks 770.8 → 771.4 kB). #153 gave no size and #157 no i18n size (`PROGRESS:233`); whether they fall under the allowance was owner question S9, and the owner answered "ก นับทั้ง 5 PR (แนะนำ)" (chat, 2026-10-28T03:03:21Z): all five, #176 with them, count ([DECISIONS.md](../../DECISIONS.md), "Decided 2026-10-28").
- **Carried out since `c5da5bb`:** `q03-1` by #179 (the ceilings PR, published by Pages 40385448079, the run that published `7263004`); 2b by #177 (published 16:55:51Z); `q06` by #175 (its journey passed on `7263004` in 443.5 s).
- **Not carried out:** `q02`'s S18 text (S18 §18.6 and §18.8 still name `push`). `q10`: `claude/pd-r41-s1` has had a free slot since 2026-10-09T23:00:48Z; on 2026-10-26 the owner confirmed it waits until after GK1 (P4 ก; `DECISIONS:368` at `5092ac9`).
- **Recorded:** the owner's answers of 2026-10-26 are in DECISIONS: decisions 3, 5, 6, 7, the four M-LEARNING-027 answers and the Merge Desk for #175, #176 and #177 at `DECISIONS:354-363` (since #178 and #180); the Merge Desk for #179 and P1–P5 at `DECISIONS:364-369` at `5092ac9` (#181, not merged).

**Hand-offs (S18:233, process lesson 3).** File 4 checks every K0 and K1 package, `HANDOVER-K1.md` §9, the R0.2r ADR open points and the K0 out-of-scope table. GK0 did not run this check (`kpi-GK0.md:46`), so this is the first, and it covers K0 too.
- **Rows with no owner:** 42 in file 4's summary. The owners proposed for them come from the lane write sets (S18 §18.2). They were proposals, not assignments; on S7 the owner answered "ก รับเลน การ์ดเฉพาะข้อของคุณ (แนะนำ)" (accept the proposed lanes, cards only for the owner's items; chat, 2026-10-28T02:59:22Z).
- **Dropped: none at the freeze** (file 4). K1-33 was dropped until 2026-10-26: FX-3 PR1 left the sky step "This is where the ISS is at this moment" to FX-3 PR2 (`FX-3-pr1-orbit-honest-figures.md:129-131`), `src/i18n/en.ts:1299` and `src/orbit/sky-tour.ts:32` (warp 60) are unchanged at `7263004`, and `PROGRESS:151` says FX-3's K1 items are merged. The owner chose on 2026-10-26 not to fix it before the freeze: the fix moves to K2 in the re-plan (P4 ก; `DECISIONS:368` at `5092ac9`), and #181 corrects the register row (`PROGRESS:152` at `5092ac9`). File 4 now counts it as recorded · RE-PLAN. The code is still unchanged on the live site.
- **Sent to an item that does not cover it (1):** R1.6 PR6 left the `exportAll()` double read to M-PLATFORM-005 (`R1.6-pr6-backup-safety.md:102`). M-PLATFORM-005 is about the profile dialog, and `src/workspace/repository.ts:445` is unchanged at `7263004`. No record says it is done.
- **Never asked:** some reports leave questions "for the owner" that no card, chat question or DECISIONS row asked (file 4, flag `NOT ASKED`). P5 of 2026-10-26 asked one of these items (K1-07, ceilings on compressed sizes), so 10 rows with 19 questions are left. P3 put K1-41 (the CSV download on real devices), a row with no owner, into the HU-6 session. On S7 the owner chose a card for the owner's items only (HU-1's Q-1…Q-8 in K0-31, K0-13, K1-24, K1-38 and K1-62); the K2 session asked it, and the owner answered every question on it on 2026-10-28, 03:19:14Z–03:29:17Z ([DECISIONS.md](../../DECISIONS.md), "Decided 2026-10-28", "The S7 card, asked by the K2 session"). The questions of K1-08, K1-59, K1-72, K1-76 and K1-96 went to their proposed lanes.

### Machine time

Wall time is run start → last update of the run, from the Actions API. It is not job time. KPI-28 in [kpi-GK1.md](kpi-GK1.md) uses job time.

| Workflow | Runs (K1 window, success) | Median | p90 | Range | S05 assumption (`S05:361`) |
|---|---|---|---|---|---|
| `ci.yml` runs (pull_request 50 + push 14) | 64 (the newest 100 completed runs, which start 2026-10-07T04:19Z) | 17.6 min | 21.6 min | 12.7–26.8 min | ~16.7 min (10.8–20.4) |
| of which pull_request only | 50 | 17.6 min | 21.9 min | 12.7–26.8 min | — |
| PR CI, last 10 successful (runs 837–846: 39331569862 … 40371529487) | 10 | 17.3 min | 24.7 min | — | — |
| Pages (`deploy.yml` on main, success, runs ≥ 5 min) | 32 | 32.8 min | 36.5 min | 21.9–44.8 min | 18–22 min |
| Heavy (`heavy.yml`, weekly schedule) | 3: 38184785291 (`ceb3fab`), 39171944407 (`5374b6d`), 40240193599 (`408ad16`) | 44.2 min | — (n = 3) | 41.7–46.4 min | 25–61 min |
| Six-DOF fleet (`heavy.yml`, dispatch) | 1: 40144277552 (`3644749`), 60.3 min; K0's 37253259356 (`5f9aa2e`) took 60.6 min | — | — | — | ~2 h 40 min |

- p90 is by linear interpolation. A run counts when it was created in the window and ended by the cutoff. Source: the `ci.yml`, `deploy.yml` and `heavy.yml` run lists (`actions_list`).
- The 14 push runs are on branches, some of which never had a PR (`claude/hopeful-allen-1o0vmh`, the plan branch; `claude/pd-r41-s1`; the two `q01` branches `claude/t-fx8-s2` and `claude/t-fx8-picture-moment-s1`).
- KPI-28 by job time, the readiness report's method: median 17 min 14 s and p90 24 min 25 s (nearest rank) over runs 837–846, all after #156's smoke-slice change (20 → 16 journeys). #179's run 846 took 17 min 18 s. Details in [kpi-GK1.md](kpi-GK1.md).
- **Heavy and fleet on the candidate.** D-64's reuse covered `7263004`: the D-64 file list is byte-identical at `408ad16`, `3644749` and `7263004`, no commit between them touches a D-64 path, and `heavy.yml` pins the same Node 22.23.3, so heavy 40240193599 (257/257) and fleet 40144277552 (164/164) stood for `7263004` with no re-run (no `heavy.yml` run was newer than 40240193599, list of 8 runs, read after the freeze). D-64 does not cover `1842a86`, because #185 changes `src/physics/frame.ts`. Heavy and the fleet ran on `1842a86` itself in `heavy.yml` run 40965856304 (`workflow_dispatch`, suite both, created 2026-10-29T22:26:15Z), after the cutoff and in no count here: 41 of 41 jobs succeeded; `coverage` (23:27:45–23:28:08Z) gave heavy 257/257 and six-DOF fleet 164/164, with no issues; 1 h 1 min 53 s from creation to the end of `coverage`, the last fleet file (`ariane64-h2a202-protonm-starship`) running 22:26:49–23:27:43Z. No `heavy.yml` run came between 40240193599 and 40965856304. The D-64 reuse is no longer needed or claimed.
- The Pages runs of 2026-10-26: 40340692641 at `c5da5bb` 36.9 min, 40357991698 at `a05ae70` 36.5 min, and `7263004`'s 40385448079 24.3 min (created → `deploy-pages` done: 24 min 12 s). `7263004`'s browser shards took 20 min 10 s, 19 min 52 s and 18 min 16 s (main step). After the cutoff, in no count here: the candidate `1842a86`'s Pages 40957726247 took 23 min 54 s (created 21:25:47Z → `deploy-pages` done 21:49:41Z), its browser shards 13, 12 and 12 journeys in 957.3 s, 1 170.1 s and 1 177.8 s.
- `r7-cross-system` took 417.6 s (`c5da5bb`), 407.4 s (`a05ae70`) and 443.5 s (`7263004`), each in browser shard 1; after the cutoff, 343.0 s at `1842a86` (Pages 40957726247, shard 1).
- Pages takes about 1.5 times S05's assumption, and the fleet about 0.4 times. Both feed the §05.9 machine-time line in the R7.5 docs PR.

### Re-runs and flake groups

**Re-runs.** The API keeps only the latest attempt. Visible attempt-2 runs in K1: five Pages runs on 2026-10-15 (38801982558, 38802289064, 38802415061, 38803075985, 38803193779), all during the owner's direct commits, and one CI run (39065071897, #158's branch). The cleanup of 2026-10-06T21:48Z deleted 297 failed or cancelled runs (the readiness report's notes under its KPI table), so earlier re-runs and failures cannot be counted.

**Pages runs on main in K1.** From #95's opening to the cutoff there are 81 `deploy.yml` runs on main: 40 succeeded, 16 failed (11 push, 5 schedule) and 25 were cancelled. Of the four runs of 2026-10-26, 40340655844 (`8973e84`) was cancelled by #176's merge, and 40340692641, 40357991698 and 40385448079 published with every job passed. After the cutoff, the daily refresh 40407713039 rebuilt `7263004` with refreshed data, and every job passed ([kpi-GK1.md](kpi-GK1.md)); it is in no count here. The later runs on main are in no count here either: the schedule runs 40587024272 (2026-10-27) and 40775643293 (2026-10-28) published `7263004` again, every job passed; Pages 40957726247 (push of #185) published `1842a86` on 2026-10-29, every job passed (37 of 37 journeys); the schedule run 40962284621 (2026-10-29T21:59Z) at `1842a86` failed browser shard 2 on `r3-first-launch` and did not publish (see "The candidate moved after the cutoff"; recorded, not classed here). Each failure in K1 is attributed in the records:

| Group (M-PLATFORM-061) | Failed runs | Runs | Cause and fix | Source |
|---|---|---|---|---|
| `fx8-context-loss` | 8 | 37536297987, 37548907257, 37570915922, 37748125764, 37995990537, 38323785663, 38474298383, 38681525161 | Test cause: the "after" picture is taken about 5 s of flight later than the "before" one. Fixed by #154 (merged 2026-10-16T00:38:24Z). Two more runs failed a shard and were then cancelled (37745862803, 37852660960). | `HANDOVER-K1.md:189-194`; `PROGRESS:93`, `:156`, `:373` |
| `r2-flight-shell` | 4 | 39159723856, 39167988970, 39171737934, 39333180682 | Test cause: a press race. Fixed by #171 (merged 2026-10-23T18:02:29Z). PROGRESS counts 4 of the 12 runs in the window that starts at `79d2686`. The first failure was 39159723856 at `0a7e69f` (schedule, 2026-10-18T19:38Z); the same commit had passed every journey in 39098068476. No commit is tied to it. | `PROGRESS:108`, `:387-388`, `:392` |
| `teaching-held` | 1 | 39036978377 | Screenshot timeout in the journey #156 added. Fixed by #160. | `PROGRESS:97-98` |
| `lui01-held-tuning` | 1 | 39082600280 | The journey took a paused flight as settled too early. Fixed by #164. | `PROGRESS:101`, `:103`, `:385` |
| not a flake: the owner's direct commits | 1 | 38803193779 | `index-*.js` 11.0 kB over its ceiling and a failing test. Fixed by #154. | `PROGRESS:94`, `:228` |
| not a flake: stale source | 1 | 39329812882 | Every journey passed; `publish` refused a stale source. | `PROGRESS:390` |

- 14 of the 16 failures were test causes, not app defects.
- `learner-profiles`, K0's flake (risk 28), had no failure on main in K1 after #112. It passed 20 of 20 on `007b039` (#150), and again on `7263004`, the candidate at the freeze (122.9 s, shard 2).
- No timeout was raised to make a journey pass.

### Escaped defects, reverts and forward fixes

**Reverts:** none. No revert commit is on main in K1 (`git log 06abb1f..7263004`), and main's history has no merge commits.

**Escaped defects.** A defect that reached main and was found later, with the check that should have caught it. The last column is a proposal for the R0.3r change-to-check map (`scripts/verification/change-map.json`) or the process; nothing is changed here.

| Defect | Reached main with | Found by | Fixed by | Check that should have caught it |
|---|---|---|---|---|
| `fx8-context-loss` compares pictures at two flight times | #108 (`eee4dec`, added the journey) | Pages 37536297987, 2026-10-06T21:47Z, then 7 more | #154, 9.1 days after the first failure | Repeat runs of a new journey before merge (risk 28 used 20 runs) |
| `stored-mission-newer` intermittent timeout | #122 (`1a7960e`, added the journey) | CI runs | #133, 2026-10-07T14:55Z | Same |
| `teaching-held` screenshot timeout | #156 (`b16b09e`, added the journey) | Pages 39036978377, 2026-10-17T13:32Z | #160, 10.5 h later | Same, in Pages mode |
| `lui01-held-tuning` settles too early | journey from #86 (K0); first failed on main at `79d2686` (#159) | Pages 39082600280, 2026-10-18T00:23Z | #164, 4.3 h later | Unclear. A repeat run of the journeys the change map selects for #159's render files might have shown it (not checked) |
| `r2-flight-shell` press race | journey from #74 (before K0); first failed on main at `0a7e69f` (Pages 39159723856). Intermittent: the same commit passed in 39098068476, and no commit from `0a7e69f` to `7c736f5` changes app or test code (`PROGRESS:388`, `:392`) | Pages 39159723856, 2026-10-18T19:38Z, then 3 more | #171, 4.9 days later | Unclear. No change is tied to it. Repeat runs of existing journeys on main might have shown it earlier (not checked) |
| Index chunk over its ceiling and a failing test | 5 owner commits pushed to main, no PR (2026-10-15T20:26–20:35Z) | Pages 38803193779 | #154, 4.0 h later | PR CI (`bundle-budget`, unit tests); there was no PR |
| Index chunk over its ceiling for 3 min | #144 (`4349137`) merged 2026-10-09T23:00:48Z on top of #145; #146 (`7cd2155`, the K1 allowance) merged at 23:03:51Z | Pages 38002258095 at `4349137`: `bundle-budget` failed, `index-*.js` 2636.2 kB against 2636.0 (+0.2 kB). The run was then cancelled by #146's push. Nothing was published. Pages 38001459163 at `7b2a3cb` (#145 alone) passed `bundle-budget` | #146, 3 min later | Re-run the budget on the merge result before merging: #144's CI (38000330287) was green on its own branch, without #145. Or merge the raise (#146, open since 22:40:12Z) first |
| #128's fix incomplete: four Build paths still replaced a design. Live 2026-10-07T15:26:53Z – 2026-10-10T00:46:03Z (Pages 37640751239 published #128; Pages 38007915256 published #145; `PROGRESS:71`, `:85`) | #128 | #145's own work | #145 | A failing-first test per entry path, not per path fixed |
| Records wrong or stale | records PRs #96–#178 | #143, the readiness report, #174's checkers, #180 | #116, #143, #174 (#174 fixed 53 findings: 45 in the first round, 8 in a second; PR body and `408ad16`), #180 (one entry of #178) | A second agent checks each records PR against GitHub ("confirmed N of M", `S18:238`) |
| Two hand-offs lost: the ISS sky step (dropped) and the `exportAll()` double read (sent to an item that does not cover it). Live now: `src/i18n/en.ts:1299` and `src/workspace/repository.ts:445` are unchanged at `7263004` and at `1842a86`, the live site since Pages 40957726247 (2026-10-29T21:49:41Z) | `c0bc958` (2026-09-27, before K1), handed to FX-3 PR2; `5eb18a2` (2026-10-03, before K1), handed to M-PLATFORM-005 (R1.6 PR4) | this GK1 hand-off check | not fixed; the ISS step moves to K2 (P4 ก) | Hand-off re-check in each records PR, not only at the GK |

**Forward fixes and time to fix.** The test-cause rows and the two over-ceiling rows did not reach the live site. Each failing Pages run stopped publication, so the site stayed on the previous build. The cost was time with main unpublishable. Longest: `r2-flight-shell`, 4.9 days, during which #165 waited 47.0 h to publish. Main was over a ceiling twice: about 4 h 12 min after the owner's direct commits of 2026-10-15 (until #154), and 3 min from #144 to #146 (the readiness report, GK item 4; Pages 38002258095).

Two rows did reach the live site: #128's incomplete fix (about 2.4 days, until #145 was published) and the two lost hand-offs (live now). The records errors are in the repository, not on the site.

## Hard, slow and repeated work (PLAN:U13)

**Hard work:**
- Hotspot conflicts on CHANGELOG and PROGRESS: 20 PRs, all before fragments (#115). None after.
- Code conflicts from stacked branches: 3.
- The D-38 budget: 7 PRs raised 17 ceiling values in K1 (#104, #111, #117, #128, #137, #146, #154). #179 lowered four of them to the measured size (`index-*.js` 2645 → 2635 kB, `index-*.css` 178 → 177, precache 16123 → 16053, precache code 14724 → 14654). On the candidate `1842a86` (Pages 40957726247, `build` job), `index-*.js` has 0.2 kB of room left (2 634.8 against 2 635 kB) and precache code 0.1 kB (14 653.9 against 14 654); `i18n-*.js` has 0.0 kB (1 729.0 against 1 729, in the switch-off build of the held-journeys run on `1842a86`, local). On `7263004` they had 0.2, 0.2 and 0.0 kB (Pages 40385448079, `build` job). #162 shortened six strings to fit 299 B.
- Rework: 6 PRs, plus 2 direction changes and 4 records corrections.

**Slow work:**
- Plan work after 9 Oct: 7 plan PRs in 9 working days.
- Owner waits: #147 181.2 h (privacy points); #172 and #173 27–30 h; #175 15.5 h; #176 9.1 h; #179 1.5 h.
- Merged → published: median 2.37 h over 70 PRs. Pages itself takes a median 32.8 min.
- Flaky journeys held publication: `r2-flight-shell` 4.9 days; `fx8-context-loss` 9.1 days from first failure to fix.

**Repeated work:**
- Records PRs: 12 in K1, four of them corrections (#116, #143, #174, #180). #181, after the cutoff, is the thirteenth.
- Records PRs came within one working day of the publication for 40 of the 70 published K1 PRs, and later for 29, all of them before #170 (KPI-31 timing screen, [kpi-GK1.md](kpi-GK1.md)). #179's fold is due by 2026-10-27T19:41:58Z; #181 carries it.
- The 2026-10-09 answers were re-checked by hand twice (2026-10-18 and 2026-10-25), and five of them were updated again on 2026-10-26 by #178 (`PROGRESS:241`).
- 16 failed Pages runs, each triaged by hand from logs.
- Five Pages re-runs on 2026-10-15.

**Proposed process fixes.** Each needs the owner. They are the five rules of the re-plan (see "Item 3"):
1. No PR starts from another open PR's branch.
2. A new or changed browser journey runs repeatedly on CI before merge. The count is the owner's choice; risk 28 used 20. A long journey such as `r7-cross-system` took 417.6–443.5 s per run in Pages, so 20 runs cost about 2.3–2.5 h of machine time. This covers the three flaky journeys added in K1, not `r2-flight-shell`, whose first failure is tied to no change.
3. Each records PR re-runs the follow-through and hand-off checks for the rows it touches, and a second agent confirms its facts ("confirmed N of M").
4. When no plan PR is open, I opens the next authorized package in the §05.6 order. Plan WIP was zero 41% of the time.
5. An owner request gets a placement row (package or "outside the plan") when it is accepted, so gate dates count it.

## What worked

- **Change fragments (#115).** No PR opened after #115 (#116–#180) had a hotspot conflict. Before it, every catch-up merge from main conflicted.
- **Fast merges (short lead time).** The median time from open to merge was 45 min, against 12.6 h in K0. Three quarters of K1 PRs merged within 5.55 h (exclusive p75 over 85). PR size was not measured.
- **Decisions on time.** No asked decision was late against its needed-by wave (61 of 61). Merge Desk clicks took a median of 3.9 h.
- **Machine evidence reused under D-64.** The six-DOF fleet ran once on main (40144277552, `3644749`, coverage 164/164) and took 60.3 min. Every heavy run in K1 was green. Both stood for `7263004`, the candidate at the freeze, because no D-64 path changed. D-64 does not cover `1842a86`, because #185 changes `src/physics/frame.ts`; heavy and the fleet ran on `1842a86` itself in `heavy.yml` run 40965856304 (suite both, after the cutoff): heavy 257/257 and fleet 164/164, so no reuse is claimed for it.
- **Identical-output and failing-first evidence.** #173: 0 of 486,600 compared style fields differ. #176: its new test fails 1 of 3 before the fix (`31836d1`). #177: its failing test comes first (`e07840a`), and `learner-profiles` fails at its new check when the fix is undone (`ad64115`'s message). #172: its custom-vehicle tests fail on `84da81e` and pass after.
- **A new stored field, reader first.** M-LEARNING-027's reader (#176) was published at 15:10:22Z before the writer (#177) merged at 16:19:19Z. The revert drill passed 48 of 48 checks on `7263004` (2026-10-26) and, redone on the candidate `1842a86`, 56 of 56 (2026-10-29), both times rolling back to `408ad16` and `c5da5bb` ([revert-drill-GK1.md](revert-drill-GK1.md), on the owner's answers P2 and "Redo all (Recommended)").
- **Storage safety.** KPI-14's storage part is 0 open ([kpi-GK1.md](kpi-GK1.md), KPI-14).
- **The candidate's Pages run.** Pages 40957726247 at `1842a86` (after the cutoff): all 11 jobs passed, with 10 526 unit tests in 334 files and 37 of 37 journeys. Pages 40385448079 at `7263004` passed all 11 jobs with 10 521 unit tests and 37 journeys. The six held journeys passed 6 of 6 on a build with the teaching tools on: of `7263004` on 2026-10-26, and again of `1842a86` on 2026-10-29 (decision 7 and the owner's "Redo all (Recommended)"; local runs, not committed; [GK1-held-journeys.md](GK1-held-journeys.md)).

## What did not

- **Plan work stalled after 9 Oct.** In 9 working days, 7 plan PRs merged (0.78 a day). Owner-requested work took 14 of the 29 merges: the Argon4 follow-ups, the render commits and the teaching-tools hold. Plan WIP was zero 41% of the time.
- **Estimates were low.** The packages done so far took 1.49× their `pr_estimate`. R1.6 took 10 PRs against 8, with 4 still to go.
- **Stacked branches.** All 3 code conflicts came from a PR built on another unmerged PR's branch.
- **Flaky journeys held publication.** 14 of 16 failed Pages runs on main were test causes. Two took 4.9 and 9.1 days to fix.
- **Records needed corrections.** Four records PRs (#116, #143, #174, #180) corrected earlier K1 records. Four Pages-run citations were wrong (`PROGRESS:34`, `:36`, `:49`, `:54`); the GK1 record corrects them.
- **Hand-offs.** 42 rows have no owner, and one was sent to an item that does not cover it (file 4). One (K1-33, the ISS sky step) was dropped while the records said done, until the owner's P4 sent it to the re-plan and #181 corrected the record; none is dropped at the freeze.
- **Answers not carried out on time.** `q10` (its slot has been free since 2026-10-09; now after GK1 by the owner's confirmation); `q02`'s S18 text; `q01` was overtaken and then cancelled. `q03-1` waited until the ceilings PR (#179) on 2026-10-26.
- **The WIP cap was exceeded on four days,** all in the 6–9 Oct burst (six windows, `verify/v_wipcap.py`). PROGRESS lists two (`PROGRESS:222`, `:231`).
- **The lane and I-slot caps were exceeded too** (1 open PR per lane, 1 open I-owned PR, `S18:206`): lanes T, L and I in the burst, and the I slot again after card `q11`, with #172 and #173 open together for 26.96 h (see "WIP and throughput").
- **G0 and G1+ did not close** ([kpi-GK1.md](kpi-GK1.md) § Gates):
  - G0: 8 of 20 S07 oracles exist; 11 are not built; EO-UI-4 is unconfirmed.
  - G1+: no record of the R1 contract table run as a whole; EO-STO-2 is missing; R1.6 PR5 is not merged. KPI-13 was measured with the plan's uncommitted script on `7263004` (owner's answer P1 ข) and again on the candidate `1842a86` (the owner's "Redo all (Recommended)"; [kpi-GK1.md](kpi-GK1.md)): on both, 46 profile reads at reload and 50 at a first visit, against a target of at most 2. Not met.
- **The teaching tools cannot come back without a raise.** The build with the teaching tools on fails the budget on the candidate's ceilings (#185 changes no ceiling): on `1842a86`, `index-*.js` 2 635.5 kB against 2 635 and precache code 14 654.6 kB against 14 654, the same as on `7263004` (the builds of the held-journeys runs; local runs, not committed; [GK1-held-journeys.md](GK1-held-journeys.md)).

## K0's "Changes for K1": did they hold?

From `K0-retro.md:65-79`:

| # | Change | Held? | Evidence |
|---|---|---|---|
| 1 | Fix before asking (show the layout after known findings are fixed) | Yes | F5 fixed and asserted by #101 and #103 before the new screenshots; G2 signed 2026-10-06 (`DECISIONS:151`, `PROGRESS:42`) |
| 2 | Budget first (each code PR states its precache-code delta before review) | Partly | Most code PRs stated it. #153 gave no size, #157 no i18n size (`PROGRESS:233`) and #176 no size (other chunks 770.8 → 771.4 kB); `q03` B's size statements are a deviated row in the follow-through table (B3) |
| 3 | Shard balance (new long journeys named so the two longest never share a shard; PR gives its shard estimate) | Yes for #175; not checked for the others | `R7.1-GK1.md:109-112` gives the shard and the shard loads, and `:114` its first CI run (shard 1, pass, 417.6 s). On `7263004`, the candidate at the freeze, it passed in shard 1 in 443.5 s, and the three shards took 18–20 min each (Pages 40385448079); after the cutoff, on `1842a86`, in shard 1 in 343.0 s (Pages 40957726247). The other journeys added in K1 (#108, #122, #156) were not checked |
| 4 | Re-estimate with K1's median lead time at GK1 | Changed (proposed) | K0's change asks for the K1 median lead time (`K0-retro.md:77-79`), and so does S05's capacity row (`S05:306`, "KPI-33 (มัธยฐาน lead time ต่อคลื่น)"). This re-estimate uses the mean lead (7.87 h) in WIP ÷ lead (Little's law). With the median (0.757 h), WIP 1.33 ÷ lead gives about 42 PRs per calendar day, against 4.05 actually merged. The median is reported as KPI-33. The change is part of the re-plan (item 4), on which the owner answered S3 "ก อนุมัติตามที่เขียน (แนะนำ)" (2026-10-28T02:54:22Z) |

## Re-estimate (§05.11 item 2)

### WIP and throughput

The window runs from 2026-10-05T20:12:45Z, when #95 opened, to the cutoff 2026-10-26T19:42:02Z: 20.98 calendar days, or 13 working days.

| Measure | Value |
|---|---|
| Mean WIP, open PRs into main (time-weighted) | **1.33** (max 7 on 2026-10-06; zero 29% of the time) |
| Mean WIP, plan-package PRs | 1.04 (max 6; zero 41% of the time) |
| Mean lead, all PRs | 0.328 calendar days (7.87 h) |
| Throughput, Little's law (WIP ÷ lead) | 4.05 PR per calendar day = 6.54 PR per working day |
| Plan-package share of merges | 45 / 85 = 0.53 |
| **Measured plan-package throughput** | **3.46 PR per working day** |
| Direct count (merges ÷ working days) | 6.54 all PRs; 3.46 plan PRs per working day |
| 6–9 Oct (4 working days) | 56 PRs, 38 plan: 14.0 and **9.5** per working day |
| After 9 Oct (9 working days) | 29 PRs, 7 plan: 3.22 and **0.78** per working day; 14 of the 29 were owner-requested |

Source: `numbers.json` `wip` and `throughput`; `verify/v_core.py` agrees.

No PR was open at the cutoff, and every counted PR opened and merged inside the window. So Little's law and the direct count give the same rate, as they must.

**Against S05's assumption** (`S05:304-305`):
- S05 assumed 2.6 PRs a day: a mean WIP of 3.9 at a lead time of 1.5 working days.
- K1 had about a third of that WIP (1.33 against 3.9) and a much shorter lead (a mean of 7.9 h against 1.5 working days).
- The resulting plan-PR rate (3.46) is above S05's fast case (2.6).
- The cap of 5 open code PRs did not bind on average. It was exceeded on four days, all in the burst (`verify/v_wipcap.py`, max 7):
  - 2026-10-06 13:21:52–14:49:42Z: 6–7 code PRs (#97, #98, #99, #102, #103, #104, #105; then #106 in #102's place).
  - 2026-10-07 11:31:25–14:55:12Z: 6 (#120, #129, #130, #131, #132, #133).
  - 2026-10-08 07:09:22–07:49:11Z, less two gaps of about a minute: 6 (`PROGRESS:222`).
  - 2026-10-09 22:51:27–22:51:37Z: 6 (`PROGRESS:231`).
  - PROGRESS records only the last two. For 2026-10-07 it records lane T's 3 open PRs, not the project cap.
  - #175–#180 add no exceedance of any cap. On 2026-10-26 at most two code PRs were open at a time, in different lanes: #175 (lane Q) and #176 (lane L-UI), together from 05:26:55Z to 14:33:12Z (9.1 h); then #177, with records PR #178 beside it; then #179, with records PR #180.
- S18 §18.6 has two more caps (`S18:206`): at most 1 open code PR per lane (drafts count), and at most 1 open I-owned PR (the I slot). Both were exceeded. Times are PR `created_at` and `merged_at`; lanes are the plan lane, or the branch prefix for non-plan PRs:
  - **I slot:** #105 (CO-8) and #106 (FX-5), 2026-10-06T13:43:44–14:49:42Z; #104 (budget, `claude/i-*` branch) was open with them until 14:30:14Z. Then #172 and #173 (CO-4), 2026-10-23T20:51:20Z – 2026-10-24T23:48:46Z, 26.96 h. This is after card `q11`. The owner allowed #173's new branch (`DECISIONS:340`); that question did not mention the I slot.
  - **Lane T:** #95 and #100, 2026-10-06T00:24:50–03:58:15Z. #120 (R0.3r, T+Q) was open with #126 (2026-10-06T23:52:50Z – 2026-10-07T03:58:35Z), #130 (EQ-1; 2026-10-07T04:14:39Z – 2026-10-08T07:49:29Z, 27.58 h), #133 (2026-10-07T11:31:25–14:55:12Z, 3 open with #130; `PROGRESS:222` records this one) and #140 (R0.4; 2026-10-08T21:57:51–22:18:42Z).
  - **Lane L:** #138 and #139 (both R1.6), 2026-10-08T08:19:05–20:35:06Z, 12.27 h.
  - #157–#160 (owner-requested render work) were open together for up to 4 h on 2026-10-17/18. The records give them no lane, so they are not counted here.
  - Only lane T's 2026-10-07 overlap is in PROGRESS. The others are variances for GK1 in this record (see "Records fixed in the GK1 record PR").

The mean of 3.46 a day hides two regimes: a 4-day burst at 9.5 and nine working days at 0.78. After 9 Oct, few plan PRs were open at all.

### Lane I

S05 sets lane I's bound at ≤ 0.67 PR a day: one slot divided by a 1.5-day lead (`S05:304`). The coordinator's work is counted inside it (`S05:396`).

| Measure | Value |
|---|---|
| WIP-1 bound: 1 slot ÷ mean lane-I code lead | 3.23 PR per working day (mean lead 12.0 h, n = 5: #105, #106, #134, #172, #173) |
| Realized, lane-I code PRs | 0.38 PR per working day (5 PRs) |
| Realized, lane-I records and process PRs (records slot, `S18:207`) | 1.00 PR per working day (13 PRs) |
| All lane-I PRs | 18, which is 1.38 per working day |

Source: `numbers.json` `lane_I`.

The lane I slot was not what limited K1. Its 5 code PRs averaged 12.0 h each. The slot was not held to one PR either: #105 and #106 overlapped on 2026-10-06, and #172 and #173 for 26.96 h on 2026-10-23/24 (see "WIP and throughput"). So the realized rate is not a one-slot rate. The two latest (#172, #173) waited 8 working days from card `q05` B to merge, and 27–30 h of that was waiting for the owner's answer of 2026-10-24. The coordinator's hours were not measured.

S05 §05.6's lane I bottleneck (`S05:309`), recomputed for the work left in K1 plus K2 (28.86 PRs) and in K1 to K3 (41.15 PRs):

| Lane I rate | PR per working day | K1 rest + K2 | K1 rest to K3 |
|---|---|---|---|
| S05 bound | 0.67 | 43.3 working days | 61.7 working days |
| Measured WIP-1 bound | 3.23 | 8.9 working days | 12.8 working days |
| Realized code rate | 0.38 | 75.0 working days | 107.0 working days |

Source: `replan.py` output.

### Remaining PRs

`packages.tsv` (unchanged since `408ad16`) totals 381 PRs: S05's 380, plus 1 for R4.2-RB. Of the delivered plan PRs, 43 count against estimates once each package is capped at its own `pr_estimate`.

- The plan basis is `pr_estimate` minus what was delivered. The written residuals take precedence (FX-2: 2 after #176 and #177). K0 leftovers count in K1.
- The ×1.49 basis multiplies each unwritten remainder by the measured inflation (1.488).

| Basis | K1 | K2 | K3 | K4 | K5 | K6 | K2–K6 | All |
|---|---|---|---|---|---|---|---|---|
| Plan | 41.6 | 62.1 | 75.4 | 89.7 | 35.5 | 42.7 | 305.4 | 347.0 |
| ×1.49 | 55.1 | 90.9 | 112.2 | 133.6 | 52.8 | 63.5 | 453.1 | 508.2 |

Source: `summary.md`.

### Gate dates recomputed (replaces S05 §05.9's 2.6 and 1.7 columns)

Each gate's Day = 13 + ceil(remaining PRs up to that gate ÷ 3.46). Today is Day 14 and still counts. S05's Days are mapped onto the same calendar, so S05's own approximate dates move by 2 days because of 13 and 23 Oct.

| Gate | S05 fast (2.6) | S05 slow (1.7) | Measured 3.46, plan basis | Measured 3.46, ×1.49 basis |
|---|---|---|---|---|
| GK1 (all K1 scope) | D27, 2026-11-12 | D42, 2026-12-03 | D26, 2026-11-11 | D29, 2026-11-16 |
| GK2 | D53, 2026-12-18 | D81, 2027-02-10 | **D43, 2026-12-04** | **D56, 2027-01-06** |
| GK3 | D82, 2027-02-11 | D126, 2027-04-14 | **D65, 2027-01-19** | **D88, 2027-02-19** |
| GK4 | D117, 2027-04-01 | D178, 2027-06-25 | **D91, 2027-02-24** | **D127, 2027-04-15** |
| GK5 | D130, 2027-04-20 | D199, 2027-07-26 | **D101, 2027-03-10** | **D142, 2027-05-06** |
| GK6 | D147, 2027-05-13 | D224, 2027-08-30 | **D114, 2027-03-29** | **D160, 2027-06-01** |

Source: `gates.tsv`; `verify/v_gates_freeze.py` gives the same Days.

**On the owner's calendar (S11, 2026-10-28).** The table above skips 13 and 23 Oct and the year-end break, 21 Dec 2026 – 1 Jan 2027 (the freeze calendar). The owner answered S11 with "ไม่พัก" (typed, chat, 2026-10-28T03:04:38Z) and, on the follow-up about public holidays, "ก ไม่ข้ามวันหยุดด้วย (แนะนำ)" (03:07:38Z): no year-end break and no public holiday skipped, so every Monday to Friday counts and only 13 and 23 Oct, already past, stay skipped ([DECISIONS.md](../../DECISIONS.md), "Decided 2026-10-28"). The Days do not change; the dates do. Measured 3.46, plan basis: GK1 D26 2026-11-11, GK2 D43 2026-12-04, GK3 D65 **2027-01-05**, GK4 D91 **2027-02-10**, GK5 D101 **2027-02-24**, GK6 D114 **2027-03-15**. ×1.49 basis: GK1 D29 2026-11-16, GK2 D56 **2026-12-23**, GK3 D88 **2027-02-05**, GK4 D127 **2027-04-01**, GK5 D142 **2027-04-22**, GK6 D160 **2027-05-18**. Each date after the break moves 10 working days earlier. Day 85 counts to 2027-02-02 (2027-02-16 on the freeze calendar); which date governs the Node move was not asked ("Item 5"). Source: `v_gates_freeze.py`'s method with the break removed (local run, not committed).

- **GK1 under the owner's option (ก).** At the cutoff GK1 needs no plan PR: #175, #176 and #177 are merged and published, and the ceilings PR #179 was the candidate. GK1 still needs the GK1 record PR, the HU-6 session on the candidate (**waits for the owner's HU-6 session**) and the owner's sign-off. The six held journeys ran once (decision 7), the KPI baselines were measured once (P1) and the revert drill ran once (P2), on `7263004`. After #185 merged as `1842a86` (2026-10-29), the owner made it the candidate and chose "Redo all (Recommended)": on `1842a86`, heavy and the fleet ran in `heavy.yml` 40965856304 (257/257 and 164/164), the six held journeys passed 6 of 6, the KPI baselines were measured again and the revert drill passed 56 of 56; HU-6 checks the stamp `v0.1.0 · 1842a86`.
- **GK2–GK6 do not change between the two GK1 cases.** Their dates depend on the cumulative remainder, so moving the rest of K1 into K2 moves no later gate.

**Sensitivity:**

| Assumption | Effect (plan / ×1.49) | Source |
|---|---|---|
| The post-9-Oct rate (0.78 a day) | GK2 2027-05-13 / 2027-07-28; GK6 2028-07-25 / 2029-05-10 | `gates.tsv` `after_burst`; `v_gates_freeze.py` agrees |
| The burst rate (9.5 a day) | GK6 2026-12-15 / 2027-01-21 | `gates.tsv` `burst_phase` |
| Also skipping S05's other named holidays (10 Dec, 6 Apr, 13–15 Apr) | Later gates move 0–5 working days; GK6 2027-03-30 / 2027-06-08 | `retro.py` run with S05's holidays |
| No year-end break and no public holiday skipped (the owner's S11 answers, 2026-10-28) | Later gates move 10 working days earlier; GK6 2027-03-15 / 2027-05-18 | `v_gates_freeze.py`'s method with the break removed (local run, not committed) |

**What the dates mean.** Over K1 as a whole, the plan-PR rate was above S05's fast case. But the plan basis assumes the remaining work arrives ready and authorized, as it did on 6–9 Oct. The ×1.49 basis assumes K2+ packages overrun like K1's bug-fix packages, which is not known for EQ oracle gates or serial lane-P physics. The dates hold only if plan work is open in parallel. In K1, mean plan WIP was 1.04 and was zero 41% of the time. S05 lists its holidays as examples (`S05:389`), so other public holidays would move the dates further; the owner answered S11 on 2026-10-28 with no year-end break and no public holiday skipped (above), which moves the later dates earlier instead.

## Changes for K2 and the re-plan (§05.11 items 3–5)

**Status: proposed on 2026-10-26. It waited for the owner's approval before K2 (D-65, `S05:434`). The owner answered S3, this re-plan, on 2026-10-28: "ก อนุมัติตามที่เขียน (แนะนำ)" (chat, 02:54:22Z); and on S1's items 4–5, K2's plan sections and K2's authorization (D-65): "รับรองและอนุญาต K2" (02:54:22Z).** `packages.tsv`, S05 and `registry.tsv` change in one docs PR: on S10 the owner answered "ก อนุญาต docs PR ฉบับเดียว (แนะนำ)" (03:03:21Z), one docs PR with the listed edits only, while the rest of R7.5 stays not authorized (`PROGRESS:214`); and on the follow-up to S11, "ก เพิ่มใน docs PR ฉบับเดียวกัน (แนะนำ)" (03:07:38Z), which adds the year-end-break and gate-date lines to the same PR ([DECISIONS.md](../../DECISIONS.md), "Decided 2026-10-28").

The basis is the owner's answer to the readiness report's decision 1 on 2026-10-24: "ก: ทำข้อ GK แล้วรัน GK1 (แนะนำ)" (`DECISIONS:344`), option (ก). The form described option (ก) as "ราว 6–7 PR แล้วรัน GK1 พร้อมแถว re-plan ที่ย้ายส่วนที่ขาดของ G0/G1+ ไป K2 (เป็นการเบี่ยงจากแผนที่คุณต้องอนุมัติ)" (same row). The move lists come from `replan.py`, which classes each package by §05.11 rule 3 (`S05:432`):
- **open-pr:** a PR is open, so the work stays. None at the cutoff.
- **unstarted:** the rule allows moving it.
- **started:** PRs merged, none open. Moving the rest departs from rule 3's wording, which names unstarted packages, so the owner approves it.

### Item 3: what moves, the WIP cap and PR size

**Kept for GK1:**
- Merged and published, plan packages: R7.1 M-PLAN-025 (#175, card `q06` A) and FX-2 M-LEARNING-027 2a (#176), by Pages 40340692641 (2026-10-26T15:10:22Z); FX-2 2b (#177), by Pages 40357991698 (16:55:51Z). S10 §10.2 row 18 merges M-LEARNING-027 at GK1, and it is a condition of the EQ-6 window at the start of K2.
- Merged and published, not a plan package: the ceilings PR (#179, `q03-1` B, `DECISIONS:171`), the candidate at the freeze, by Pages 40385448079 (19:41:58Z).
- Done on `7263004`, the candidate at the freeze, as the owner asked: the six held journeys (decision 7, `DECISIONS:357`; 6 of 6, [GK1-held-journeys.md](GK1-held-journeys.md)), the KPI baselines (P1) and the revert drill (P2, 48 of 48, [revert-drill-GK1.md](revert-drill-GK1.md)). Done again on the candidate `1842a86`, on the owner's "Redo all (Recommended)" (2026-10-29; [DECISIONS.md](../../DECISIONS.md), "Decided 2026-10-29"): heavy and the fleet (`heavy.yml` 40965856304: heavy 257/257, fleet 164/164), the six held journeys (6 of 6), the KPI baselines (the same counts as on `7263004`; [kpi-GK1.md](kpi-GK1.md)) and the revert drill (56 of 56).
- Still to come: the GK1 record PR; the HU-6 session on the candidate `1842a86` (decision 6, `DECISIONS:356`; the owner's answer of 2026-10-29, "HU-6 ยังไม่ได้ทำ ใช้ 1842a86 เป็น candidate ใหม่ครับ").
  - HU-6 result: **waits for the owner's HU-6 session.** Slot: device classes, browsers, the About stamp seen (expected `v0.1.0 · 1842a86`), one full Soyuz or Falcon mission without a reload (KPI-32), and the CSV download on Safari and Firefox (P3 ข): ____

**Moved to K2: started packages without an open PR** (a departure from rule 3's wording; 27.3 plan PRs):

| Package | K1 PRs moved | What | Note |
|---|---|---|---|
| R0.4 | 8 | the 8 PRs left of `pr_estimate`, for the 10 unmerged items: M-PLATFORM-041, M-PLAN-018 (the oracle kit), M-BUILD-024, M-PLAN-010, M-PHYSICS-003, M-PLAN-003, M-PHYSICS-060, M-PLAN-002, M-PLAN-004, M-BUILD-025 | G0. Draft S07 lets only order 9–13 spill into K2 (`S07:211`), so moving order 1–5, 7 and 8 departs from S07. Decision 1 (ก) covers it. |
| R1.6 | 4 | PR5 (M-PLATFORM-007), PR8, PR9, PR10 | G1+. Draft S10 lets only PR6–PR11 spill (`S10:222`), so moving PR5 departs from S10. Decision 1 (ก) covers it. |
| CO-4 | 4 | steps 2 (M-LAUNCH-008), 4a (M-PLATFORM-037), 4b (M-LAUNCH-025), 5 (M-LAUNCH-006) | Steps 6, 9 and 10 are already in K2 (card `q05` B). |
| FX-1 | 3 | M-BUILD-029 (lane B part, lane O part, I-train hook) | |
| R7.1 | 2.14 | the K1 share left after #175 | §05.6 spreads R7.x over K0–K6, so this is bookkeeping. |
| FX-2 | 2 | M-LEARNING-002, M-LEARNING-003 | 2a and 2b stayed for GK1 (#176, #177). |
| ED-LES-1 | 1.5 | the K1 share of the remaining 4 PRs | |
| FX-5 | 1 | M-LAUNCH-035 | |
| ED-I18N-1 | 1 | the remaining PR | |
| ED-INST-1 | 0.67 | the K1 share of the remaining 4 PRs | |

Outside `pr_estimate`, also to K2: the ISS sky-step fix (hand-off K1-33; the owner's answer P4 ก), and the follow-ups that G0 and G1+ need beyond the packages above (R0.2r and R0.3r follow-ups, the G1+ fixture tests; at least 3 small PRs, an agent count; [kpi-GK1.md](kpi-GK1.md) § Gates).

**Moved to K2: unstarted packages** (allowed by rule 3; 14.3 plan PRs):

| Package | K1 PRs moved | Note |
|---|---|---|
| I-HOOKS | 3 | No hook request was filed in K1. |
| EQ-2 | 2.5 | |
| R4.1 | 2.33 | Branch `claude/pd-r41-s1` (`e777aae`) is finished first when a slot frees (card `q10` A). It touches D-64 paths; the owner confirmed it waits until after GK1 (P4 ก). |
| HU-2, HU-3 | 0.67 each | |
| HU-6 | 0.25 | The session itself runs at GK1 on the candidate (decision 6). |
| R7.2, R7.3, R7.4, R7.5 | 1.43, 1.43, 0.86, 1.14 | Bookkeeping, as for R7.1. This retrospective is R7.2's GK1 work. |

**Total.** At the cutoff 41.6 plan PRs of K1 scope remain (27.3 started, 14.3 unstarted). None of them stays for GK1, so all 41.6 move to K2 (39.9 without R7.2's and HU-6's K1 shares, whose GK1 work belongs to GK1: R7.2's is this record, and HU-6's session waits for the owner). K2 becomes **103.7 plan PRs** (146.0 on the ×1.49 basis). At 3.46 a working day that is **29.9 working days** (42.2), against K2's timebox of 15–20 (`S05:296`). Source: `replan.py` output.

The plan already expects K1–K3 to overrun their timeboxes (`S05:86`), and gate dates come from throughput, not from the timebox. So no K2 package is proposed to move to K3 now.

The K2 load per lane (K1 rest + K2, plan basis) is highest in I (28.9), T (17.4) and Q (9.7). If K2 opens with more lanes ready than slots, S05 §05.6's priority order decides (`S05:318`).

**Rule 6, next.** At the measured rate, K3's 75.4 plan PRs need 21.8 working days against a 15–20 day timebox (32.4 on the ×1.49 basis). Rule 6 (`S05:435`), which moves unstarted R3+ packages to K4 first, will probably apply at GK2.

**Already decided, recorded with the row** (owner, chat, 2026-10-26; `DECISIONS:355-356`):
- `q09` A (hide the Period row in the full HUD while a lesson asks for it) moves to K2 (decision 5).
- `q01` is cancelled (decision 5). Its branches `claude/t-fx8-s2` and `claude/t-fx8-picture-moment-s1` are still on origin. Deleting them is the owner's action (S12: the owner answered "ก คุณลบทั้งสอง branch เอง (แนะนำ)", 2026-10-28T03:04:38Z).
- HU-1's student sessions move to November, outside school hours. This is a deviation from draft S16's October-break schedule (`S16:105`), chosen by the owner (decision 6; `PROGRESS:236`). S16's own route to November (`S16:107`) is for a privacy statement that is not live in time, and the statement was live since 2026-10-17, so that route does not apply.

**WIP cap:** unchanged: 5 open code PRs plus 2 records PRs for the project, 1 open PR per lane and 1 I-owned PR (`S18:206-207`). There is no evidence for changing them:
- Mean WIP was 1.33.
- The project cap was exceeded on four days, all in the burst, for 10 s to 3.4 h each.
- The lane and I-slot caps were exceeded in the burst and once after card `q11` (#172 and #173, 26.96 h). These are variances, not a reason to change the caps.
- S18 sizes the cap on the owner's review capacity. The measured owner waits (27–30 h for #172 and #173) give no reason to raise it.

**PR size:** not adjusted. PR size in lines was not measured (see "Not measured").

**New rules proposed:** the five process fixes under "Hard, slow and repeated work". Each goes into S18 §18.6 or SESSION-PROTOCOL in the one docs PR of owner question S10; the owner answered S3 "ก อนุมัติตามที่เขียน (แนะนำ)" and S10 "ก อนุญาต docs PR ฉบับเดียว (แนะนำ)" (2026-10-28T02:54:22Z and 03:03:21Z). The evidence for the first three:
1. No PR starts from another open PR's branch: all 3 K1 code conflicts came from stacking, though 4 of the 7 stacked PRs had none.
2. A new or changed journey runs 20 times on CI before merge (the count of S3's option (ก), which the owner chose): three of the five flaky journeys were added in K1 (#108, #122, #156). Of the other two, one first failed at `79d2686` (#159) and one at `0a7e69f` with no code change. The four that failed on Pages failed 14 runs, and each failure held publication.
3. Each records PR re-checks the follow-through and hand-off rows it touches, and a second agent confirms its facts: risks 15 and 17 occurred, and the two lost hand-offs were found only at GK1.

### Item 4: facts that changed after the base

- **Scope grew without new estimates.** `packages.tsv` gained 16 items between the plan import (`221ed1a`) and `7263004` without any `pr_estimate` change:
  - R4.2: +6 (M-PHYSICS-075, 081–085)
  - R4.3: +4 (M-PHYSICS-076, 077, 079, 080)
  - R4.4: +1 (M-PHYSICS-074)
  - R4.5: +1 (M-PHYSICS-078)
  - R4.7: +1 (M-PLAN-032)
  - R8: +3 (M-ORBIT-067–069)

  Separately, R4.2-RB was added with 1 PR. The items came in through #157, #162, #165 and #166 (`PROGRESS:216`). Source: `scope_growth.py` at `7263004`. So the remainder for those packages is understated by an unknown number of PRs. **Proposal:** re-estimate R4.2, R4.3, R4.4, R4.5, R4.7 and R8 in the R7.5 docs PR (the one docs PR of owner question S10). Draft S19 C6 also names R4.1 (8 PRs) and R4.4 (5 PRs) as over estimate.
- **R3+ re-check (rule 4).** `packages.tsv` still gives 32 PRs: R3.0 3, R3.1r 7, R3.2r 5, R3.3r 3, R3.4r 10, R3.5r 3, R3.6 1. That is 30 in K3 and 2 in K4. One merged early: #149, R3.4r M-PLAN-027 (card `q07` A). The content was not re-estimated here.
- **The parked re-baseline.** R4.2-RB was parked by the owner on 2026-10-18 (`DECISIONS:328`). It sits in K4. Its answer 5 (1 000 m) contradicts the 1 500 m on main since #157 (`DECISIONS:322`). It is asked again when R4.2-RB resumes.
- **Teaching tools held back (#156).** Six journeys have been held since then. GK item 2 is met for GK1 only by decision 7 (ก). On whether they return in K2 the owner answered S4 "ข พักต่อ ตรวจ G0 บนบิลด์ครู (แนะนำ)" (chat, 2026-10-28T02:59:22Z): still held, with the G0 oracles that need held journeys run once on an uncommitted teaching-tools build, and no ceiling raised. Turning them on needs about +1 kB on the `index-*.js` and precache-code ceilings (the teaching-tools build of `7263004` is 0.5 and 0.6 kB over; that of `1842a86`, built again on the owner's "Redo all (Recommended)" on 2026-10-29, is over by the same 0.5 and 0.6 kB; local runs, not committed).
- **Work outside the plan.** 16 owner-requested PRs merged in K1. None is in `packages.tsv`, and future owner requests use slots the gate dates assume for plan work.
- **Machine times.** Pages runs about 33 min, not 18–22; the fleet about 60 min, not 2 h 40 min. **Proposal:** update `S05:361` in the R7.5 docs PR (the one docs PR of owner question S10).
- **Throughput uses the mean lead, not the median.** S05's capacity row says the GK1 re-estimate uses KPI-33, the median lead time per wave, with the measured WIP (`S05:306`), and K0's retrospective says the same (`K0-retro.md:77-79`). With K1's median (0.757 h), WIP 1.33 ÷ lead gives about 42 PRs per calendar day, while 85 PRs merged in 20.98 calendar days (4.05 a day). The mean lead (7.87 h) gives the rate that matches the merges, so this re-estimate uses it. **Proposal:** the owner approves this departure from `S05:306`, and the R7.5 docs PR changes the row to "mean lead time". It was part of S3, on which the owner answered "ก อนุมัติตามที่เขียน (แนะนำ)" (2026-10-28T02:54:22Z); the edit is in the one docs PR of owner question S10.
- **The Node 24 deadline.** The owner's decision D-3/D-4 has "by GK2" in its "Where it lands" column (`DECISIONS:66`). The adopted plan fixes the move itself at Day 85, "ยึดวันที่ ไม่ใช่ GK" (`S05:386`). This record reads Day 85 as the deadline for the move: 2027-02-16 on the freeze calendar, and 2027-02-02 on the calendar of the owner's S11 answers (no year-end break, no public holiday skipped; "Gate dates recomputed"). With the dates recomputed here, GK2 is D43–D56 (2026-12-04 – 2027-01-06 on the freeze calendar; 2026-12-04 – 2026-12-23 on the owner's), earlier than Day 85. The re-plan row puts M-PHYSICS-060 by Day 85. If the owner meant GK2, the answer to the re-plan says so; the owner answered "ก อนุมัติตามที่เขียน (แนะนำ)" (S3, 2026-10-28T02:54:22Z), which names no GK2.

### Item 5: the PROGRESS re-plan row

The GK1 record PR adds one row, "Re-plan at GK1 (S05 §05.11 rule 5; R7.2, M-PLAN-026)", to PROGRESS's history table. It goes straight into PROGRESS with no fragment, as records PRs do (#170). It is the only copy of the row; this section lists what it carries, so the two can be checked against each other:
- **Status:** proposed on the date of the GK1 record; it waited for the owner's approval before K2 starts (D-65). The approval field stayed blank until the owner answered; no agent writes "approved" (`S18:455`). The owner answered S3 "ก อนุมัติตามที่เขียน (แนะนำ)" (chat, 2026-10-28T02:54:22Z), and the field holds those words with the date and time.
- **Reason:** the owner chose on 2026-10-24 to close K1 by option (ก) (`DECISIONS:344`). K1 merged 45 plan PRs against S05's 49.9 (K0 + K1: 55 of 70.2); 38 on 6–9 Oct and 7 after; measured plan throughput 3.46 PRs per working day (Little's law and the direct count agree) replaces §05.9's 2.6 and 1.7; packages so far took 1.49× their `pr_estimate`.
- **Kept for GK1, moved to K2, already decided:** as in "Item 3". In all, 41.6 plan PRs move; K2 becomes 103.7 (×1.49: 146.0), 29.9 working days at 3.46 (42.2) against a 15–20 day timebox.
- **Unchanged:** the WIP caps; PR size (not measured).
- **Proposed rules:** the five above; rule 2's count is 20 (S3's option (ก)).
- **Gate Days (Day 1 = 2026-10-05; plan / ×1.49):** GK2 D43–D56, GK3 D65–D88, GK4 D91–D127, GK5 D101–D142, GK6 D114–D160. On the calendar of the owner's S11 answers ("ไม่พัก", 2026-10-28T03:04:38Z; "ก ไม่ข้ามวันหยุดด้วย (แนะนำ)", 03:07:38Z: no year-end break, no public holiday skipped): GK2 2026-12-04 – 2026-12-23, GK3 2027-01-05 – 2027-02-05, GK4 2027-02-10 – 2027-04-01, GK5 2027-02-24 – 2027-04-22, GK6 2027-03-15 – 2027-05-18. On the freeze calendar, which skipped the year-end break 21 Dec 2026 – 1 Jan 2027: GK2 2026-12-04 – 2027-01-06, GK3 2027-01-19 – 2027-02-19, GK4 2027-02-24 – 2027-04-15, GK5 2027-03-10 – 2027-05-06, GK6 2027-03-29 – 2027-06-01. At the post-9-Oct rate (0.78) GK6 would be 2028–2029.
- **To re-estimate in the R7.5 docs PR (the one docs PR of owner question S10):** R4.1, R4.2, R4.3, R4.4, R4.5, R4.7, R8; `S05:361`'s machine times; `S05:306`'s "median lead time".
- **Node 24:** M-PHYSICS-060 by Day 85, per `S05:386`. Day 85 counts to 2027-02-02 on the calendar of the owner's S11 answers, which no longer skips the year-end break (2027-02-16 on the freeze calendar). The S3 form showed "Day 85 (16 ก.พ. 2027)", and `S05:386` gives "≈ 2027-02-12" and fixes the date ("ยึดวันที่ ไม่ใช่ GK"); which of these dates governs the move was not asked.
- **Links:** this file; [kpi-GK1.md](kpi-GK1.md) § Gates for the G0 and G1+ parts and their windows.

### Records fixed in the GK1 record PR

- The 4 Pages-run citations (`PROGRESS:34`, `:36`, `:49`, `:54`; the same at `5092ac9`), and the CO-5 register row's step 0 (`PROGRESS:126`).
- The WIP-cap exceedances of 2026-10-06 and 2026-10-07 (project cap), as variances for GK1.
- The lane and I-slot overlaps (`S18:206`), as variances for GK1: I slot #105/#106 (and #104), 2026-10-06T13:43:44–14:49:42Z; I slot #172/#173, 2026-10-23T20:51:20Z – 2026-10-24T23:48:46Z (after card `q11`); lane T #95/#100 (2026-10-06), #120 with #126, #130 and #140 (2026-10-06 to 2026-10-08); lane L #138/#139, 2026-10-08T08:19:05–20:35:06Z. Lane T's 3 open PRs on 2026-10-07 are already in `PROGRESS:222`.
- The hand-off sent to an item that does not cover it (K1-52), as a variance; the ISS sky step (K1-33), as a variance decided by the owner (P4 ก); and an owner proposed for each row with none (file 4).
- New variances: G7 item 4 not done at GK1; the follow-through rows before K1, checked in part; #176's missing size statement under `q03` B.
- Done already: the 12 answers of 2026-10-26 (#178); #177's fold and its Merge Desk answer (#180, `46728e5`, merged 18:03:55Z, 1 h 8 min after 2b's publication; `DECISIONS:363`).
- In #181, not merged: #179's fold and its Merge Desk answer, P1–P5 (`DECISIONS:364-369` at `5092ac9`), and FX-3's register row (`PROGRESS:151` said every K1 item is merged; #181 says one part of M-ORBIT-003, the ISS sky step K1-33, is not done and moves to K2, `PROGRESS:152` at `5092ac9`). #179's fold is due by 2026-10-27T19:41:58Z, one working day after its publication (`S18:137`). The merge hold H2 holds #181 until the owner's HU-6 session ends (#185 merged during the hold, on 2026-10-29T21:25:44Z, the one time it was broken). The session had not taken place by 2026-10-29 (the owner: "HU-6 ยังไม่ได้ทำ ใช้ 1842a86 เป็น candidate ใหม่ครับ"), so the fold is late; its delay is counted under KPI-31 when #181 merges. After the session, H2's order is #181, #182, then #186, which folds #185.
- The deletion of the two `q01` branches is the owner's action, not a record fix; on S12 the owner answered "ก คุณลบทั้งสอง branch เอง (แนะนำ)" (2026-10-28T03:04:38Z).

## Risk register (S05 §05.13)

`S05:452`: check all 28 rows at every GK; the risks that occurred go in the GK's PROGRESS row. Evidence is from the records at `7263004` (#185 changes none of them) and from the candidate's runs: on `1842a86`, Pages 40957726247 and the runs redone on it (after the cutoff), and, where a row says so, on `7263004`, the candidate at the freeze (Pages 40385448079 and the local runs of 2026-10-26). Each row names the SHA.

| # | Risk (short) | Occurred in K1? | Evidence | Did the mitigation work? | Change proposed |
|---|---|---|---|---|---|
| 1 | Reset or old tab overwrites work; profile switch shows another's work | No new incident recorded | R1.6 fixed known cases (M-PLATFORM-001, 002, 004, M-PLAN-031); KPI-14 storage 0 ([kpi-GK1.md](kpi-GK1.md)); `profile-session-safety` passed on the candidate `1842a86` (Pages 40957726247, 37 of 37 journeys) and, with the teaching tools on, in the held-journeys run on `1842a86` (155.5 s; local run); on `7263004` it passed in both | Partly: R1 contract table not run as a whole; G1+ not passed | R1.6 PR5 and the G1+ gaps move to K2 (re-plan) |
| 2 | Old cached app writes an old schema after a migration | No | #176 reads an optional `revision`; no format version changes. The reader was published (15:10:22Z) before the writer merged (16:19:19Z); the writer was published at 16:55:51Z. On `7263004` the old-record tests passed (`assessment-revision.test.ts` 13/13, `assessment-revision-edit.test.ts` 3/3, `assessment-revision-writer.test.ts` 1/1; Pages 40385448079); on the candidate `1842a86` every unit test passed (Pages 40957726247: 334 files, 10 526 tests; #185 changes none of those three files). The revert drill passed 48 of 48 on `7263004` and 56 of 56 on `1842a86`, rolling back to `408ad16` and `c5da5bb` both times; on `1842a86` it also found that opening lesson 1.1 is itself a save, and the test's stored bytes stayed unchanged ([revert-drill-GK1.md](revert-drill-GK1.md)). An old service worker reloading onto the candidate on a real device: **waits for the owner's HU-6 session** | Yes so far | — |
| 3 | Hiding setup loses live controls | No | CO-5 TORU/six-DOF assertions; #101, #103 | Yes | — |
| 4 | Drag, window, keyboard and wheel conflict | Not tested | R2.3s2 and R2.5 not started | — | — |
| 5 | Satellite picture wrong | No | R3.3r not in K1 | — | — |
| 6 | Hand-off refuels, uses a draft or a future state | No | #175's journey holds the flown state bit for bit; five sabotages fail it (`R7.1-GK1.md`). It passed on the candidate `1842a86` in 343.0 s (shard 1, Pages 40957726247) and on `7263004` in 443.5 s (shard 1) | Yes | — |
| 7 | Shared physics change worsens other vehicles | No | K1 touched `src/physics` in 5 PRs (readiness report, decision 2 row); fleet on the candidate `1842a86` 164/164 (`heavy.yml` 40965856304, after the cutoff); fleet 40144277552 (164/164) stood for `7263004` under D-64, which does not cover `1842a86` (#185, after K1, changes `src/physics/frame.ts`) | Yes | — |
| 8 | Data sources not enough for realism | Not tested | R4.1 not started | — | — |
| 9 | Docking without physical failure | Not tested | R5 not started | — | — |
| 10 | Heavy evidence from mixed sources | **Signal seen (by design)** | The trigger is combining results of several runs (`S05:465`). For `7263004`, KPI-22 combined heavy at `408ad16` (40240193599) with the fleet at `3644749` (40144277552). The scheduled heavy runs skip the fleet job, and the fleet run skipped `heavy` (`PROGRESS:397`). After the cutoff, on `1842a86`, heavy and the fleet ran in one run at the candidate, `heavy.yml` 40965856304 (suite both): 257/257 and 164/164 | Yes for `7263004`: the D-64 file list is byte-identical at both run SHAs and `7263004`. D-64 does not cover `1842a86` (#185 changes `src/physics/frame.ts`); no reuse is claimed for it | — |
| 11 | WebGL contexts exhausted | No user event recorded | FX-8 (#108) recovery shipped; its journey was flaky for test reasons and passed on the candidate `1842a86` (Pages 40957726247, 37 of 37 journeys) and on `7263004` (159.5 s) | Yes for the app | Rule 2 (repeat new journeys) |
| 12 | Heavy red on current main | No | 3 scheduled heavy runs and 1 fleet run in K1, all green. After K1, `heavy.yml` 40965856304 (`workflow_dispatch`, suite both) at `1842a86`, main since #185: 41 of 41 jobs, heavy 257/257, fleet 164/164; no other `heavy.yml` run between 40240193599 and it | Yes | — |
| 13 | Release blocked by growing data | **Yes, once** | Pages 38803193779 failed at the index ceiling on the owner's direct commits (`PROGRESS:94`). Main was also over `index-*.js` for 3 min (#144 → #146; Pages 38002258095, cancelled, nothing published). After #179 lowered the ceilings, on the candidate `1842a86` (Pages 40957726247) `index-*.js` has 0.2 kB left (2 634.8 / 2 635), precache code 0.1 kB (14 653.9 / 14 654) and `i18n-*.js` 0.0 kB (1 729.0 / 1 729, the held-journeys run's switch-off build); on `7263004` they had 0.2, 0.2 and 0.0 kB | Partly: the split ceilings caught it; #179 ratcheted them back | Any growth needs an offset or an owner raise (D-38); no brotli ceilings for now (P5 ก) |
| 14 | D-36, D-35, D-37 decisions late | No | 0 of 61 decisions late against needed-by; G2 signed 2026-10-06 | Yes | — |
| 15 | Decided but not carried out | **Yes** | `q10` (now after GK1 by the owner's confirmation), `q02`'s S18 text; `q01` overtaken, then cancelled; `q03-1` waited until #179 (follow-through table, file 3) | Late: found only by the GK1 table | Rule 3 (re-check in each records PR) |
| 16 | Budget creeps up | **Yes** | 7 PRs raised 17 values; offsets mostly in unstarted EQ-6/7/8 (readiness report, notes under the ceilings table); KPI-30 = 0 unapproved; #179 lowered 4 values | Yes at GK1: every raise was approved and named, and the ratchet is done | Delivered offsets tracked in K2 |
| 17 | Stale status | **Yes** | #116, #143, #174 and #180 corrected K1 records (#174: 53 findings, 45 in the first round and 8 in a second); 4 Pages citations were still wrong at the freeze (corrected in the GK1 record) | Partly: found and fixed, but after merge | Rule 3; second-agent check per records PR |
| 18 | Fleet machine time a bottleneck | No | Fleet 60.3 min (40144277552) | — | Update `S05:361` |
| 19 | i18n and `main.ts` conflicts; long I queue | **Yes, until #115** | 20 PRs with hotspot conflicts (CHANGELOG 64, PROGRESS 29 merges); 1 code-hotspot conflict (#103) | Yes: fragments (#115) ended them; I-train not used | Rule 1 (no stacked branches) |
| 20 | Study participants not found in time | **Signal seen** | The October-break sessions will not happen: HU-1's student sessions move to November (decision 6, `DECISIONS:356`). The main trigger, "HU-1 ไม่ครบภายใน K2" (`S05:475`), can be judged only when K2 ends | A deviation from S16's October schedule (`S16:105`), chosen by the owner. S16's own route (`S16:107`) is for a late privacy statement and does not apply | Record it (variance, `PROGRESS:236`); check at GK2 |
| 21 | No human reviewer | **Signal seen** | HU-2 re-review of ru-24-05-06 queued since 2026-10-09, none recorded (`PROGRESS:205`, `:251`) | Not yet | HU-2 moves to K2 with the re-plan |
| 22 | Node line ends | Not yet | CI pins Node 22.23.3 (`.github/workflows/ci.yml:32`). The move to Node 24 is due by Day 85 (`S05:386`), 2027-02-16 on the freeze calendar and 2027-02-02 on the calendar of the owner's S11 answers; D-3/D-4's "by GK2" (`DECISIONS:66`) is where the decision lands | — | M-PHYSICS-060 by Day 85 in the re-plan row |
| 23 | SwiftShader noise | **Signal seen** | #175: after Build and Orbit, the phone flight ran at 0.56× real time at best under software rendering; the journey uses warp 10 (`R7.1-GK1.md:93`). The KPI baselines (P1) on `7263004` gave comparable counts and bytes, but their times are trend-only (browser, binary and host differ from the plan's baseline). Measured again on the candidate `1842a86` (the owner's "Redo all (Recommended)"), alternating with `7263004` on one host: the same counts for both builds and `7263004`'s values equal to those of 2026-10-26; the times are trend only, and only KPI-10's Home rAF median (10.5 ms at `1842a86` against 15.5 at `7263004`, with its p95 and max) is beyond the run spread by `measure.mjs --compare` ([kpi-GK1.md](kpi-GK1.md)) | No speed claim was made | — |
| 24 | Perf work silently lowers quality | No | #173 identical output (0 of 486,600); #158 identical GLSL | Yes | — |
| 25 | Scope grows | **Yes** | 16 owner-requested PRs; 16 items placed with no new estimate (`PROGRESS:216`) | Partly: placed and recorded, not estimated | Placement row per owner request (rule 5); re-estimate R4.x and R8 |
| 26 | Parallel sessions collide | **Yes, minor** | Owner sessions alongside the K1 sessions: DECISIONS conflicts (#155, #156), `.gitignore` (#169), 5 direct commits to main | Partly | Rule 1; PRs only, no direct commits |
| 27 | Owner bandwidth | **Signal seen** | #172/#173 waited 27–30 h; #147 181 h; 14 of 29 merges after 9 Oct were owner requests | — | Keep the WIP cap; rule 4 (the ready queue) |
| 28 | Release blocked by an unexplained stuck journey | **Yes** | 14 Pages failures from 4 flaky journeys; `r2-flight-shell` 4.9 days, `fx8-context-loss` 9.1 days to a fix. Up to the cutoff no Pages run on main had failed since 39333180682, and `7263004`'s run, 40385448079, passed 37 of 37 journeys. After the cutoff: the three schedule runs at `7263004` passed every job, and so did the candidate's run, Pages 40957726247 at `1842a86` (37 of 37 journeys); the schedule run 40962284621 at `1842a86` failed browser shard 2 on `r3-first-launch` ("the Watch end card has no "Try this launch yourself""; the journey gives the Soyuz T-10 pad-abort Watch flight 120 s at warp 100), on a job whose journeys took 1.69 times as long in all as in 40957726247's shard 2, and did not publish. Both are recorded; what the failure means is not decided here | Yes in method (causes found, no timeout raised); slow | Rule 2; M-PLATFORM-061 stays open |

Occurred (for the GK1 PROGRESS row): 13, 15, 16, 17, 19, 25, 26, 28. Signal seen: 10 (by design), 20, 21, 23, 27. These are K1's, as at the freeze. The runs on `1842a86` after the cutoff (rows 1, 2, 6, 7, 10, 11, 12, 13, 23 and 28) are recorded in their rows and are not classed here.

## For the owner

Nothing in this file is decided for the owner. It needed these answers, asked with the GK1 record. S1–S12 are owner questions, not plan sections; all twelve, with their options and the recommendation, are in [kpi-GK1.md](kpi-GK1.md), "Questions for the owner". The owner answered them in chat on 2026-10-28; each answer is quoted after its question, and all of them, with the questions as shown, are in [DECISIONS.md](../../DECISIONS.md), "Decided 2026-10-28".
- **Owner question S3, the re-plan row:** approve the move of 41.6 plan PRs to K2, including started work (R0.4 orders 1–5, 7, 8 and R1.6 PR5, against rule 3 and drafts `S07:211` and `S10:222`); at least 3 small PRs outside `pr_estimate`; the mean lead in place of `S05:306`'s median; the unchanged WIP caps; the five rules, with the number of repeat runs for rule 2; M-PHYSICS-060 by Day 85. The owner answered: "ก อนุมัติตามที่เขียน (แนะนำ)" (2026-10-28T02:54:22Z); the option gave rule 2 20 runs.
- **Owner question S4:** do the teaching tools come back in K2? Turning them on needs about +1 kB on two ceilings. The owner answered: "ข พักต่อ ตรวจ G0 บนบิลด์ครู (แนะนำ)" (2026-10-28T02:59:22Z).
- **Owner question S7:** accept the proposed owners for the hand-off rows with none. The owner answered: "ก รับเลน การ์ดเฉพาะข้อของคุณ (แนะนำ)" (2026-10-28T02:59:22Z).
- **Owner question S8:** acknowledge the variances recorded as "owner acknowledgement pending", among them the WIP-cap and lane overlaps above. The owner answered: "ก รับทราบทั้งหมด ไม่ย้อนแก้ (แนะนำ)" (2026-10-28T03:03:21Z).
- **Owner question S10:** authorize one R7.5 docs PR for the plan-file edits the re-plan needs. The owner answered: "ก อนุญาต docs PR ฉบับเดียว (แนะนำ)" (2026-10-28T03:03:21Z).
- **Owner question S11:** confirm the year-end break (`S05:387`) and which public holidays the gate dates skip. The owner answered: "ไม่พัก" (typed, 2026-10-28T03:04:38Z); then, on public holidays, "ก ไม่ข้ามวันหยุดด้วย (แนะนำ)", and on where the plan files change, "ก เพิ่มใน docs PR ฉบับเดียวกัน (แนะนำ)" (both 03:07:38Z).
- **Owner question S12:** delete or keep the two `q01` branches. The owner answered: "ก คุณลบทั้งสอง branch เอง (แนะนำ)" (2026-10-28T03:04:38Z).
- **Owner question S1:** how to give the five answers that belong only to the owner: merge of the GK1 record, GK1 sign-off, the re-plan, adoption of K2's plan sections, and K2's authorization (D-65). The owner answered: "ก ตอบสองรอบ (แนะนำ)" (2026-10-28T02:54:22Z), and on adopting K2's plan sections and authorizing K2: "รับรองและอนุญาต K2" (02:54:22Z). The merge of the GK1 record and the GK1 sign-off wait for the owner's HU-6 session.
- **After the cutoff, 2026-10-29:** the owner's answers on the new candidate ("HU-6 ยังไม่ได้ทำ ใช้ 1842a86 เป็น candidate ใหม่ครับ"), on the GK1 evidence ("Redo all (Recommended)") and on #181 and #182 ("Yes, update both (Recommended)") are in [DECISIONS.md](../../DECISIONS.md), "Decided 2026-10-29", and are applied in "The candidate moved after the cutoff" above.

## Not measured

**Lead time and WIP:**
- **Ready → merged (KPI-33 as S04 defines it).** No "ready" time is recorded. PR opened → merged stands in.
- **Authorized → merged, by the hour.** Known only to the day, except for cards `q05`, `q06` and `q07`.
- **Work before a PR opens.** WIP counts open PRs into main only. Branch work before a PR (for example `claude/pd-r41-s1`, `i-co4-d36a3-s1` and `t-fx8-*`) is invisible, so mean WIP understates the work in progress.
- **The owner's direct commits.** Five commits on 2026-10-15 have no PR, so they are outside KPI-33 and throughput.
- **Draft flags.** The PR list keeps only each PR's current draft flag, so the "code cap (not draft)" WIP uses today's flags.

**Hours and size:**
- **Owner and coordinator hours.** KPI-33 and KPI-35 record no hours. S05's 10–20 min per PR and the coordinator's share of lane I stay assumptions (`S05:393-396`).
- **PR size in lines.** Not measured, so §05.11's "PR size" adjustment is not proposed.

**The re-estimate:**
- **Remaining work.** The ×1.49 factor comes from 18 mostly small bug-fix packages. The counts left for R1.6, FX-1, FX-2, FX-5 and CO-4 come from reading the plan's PR tables.
- **Scope growth.** The 16 items placed since the import have no estimate.
- **Not recomputed.** G4-S and the earliest start of R5.1 are not tied to cumulative PRs.
- **The calendar.** The year-end break was S05's assumption, waiting for the owner's confirmation (`S05:387`), and S05's holiday list is examples only (`S05:389`). The owner answered S11 on 2026-10-28: "ไม่พัก" (03:04:38Z) and "ก ไม่ข้ามวันหยุดด้วย (แนะนำ)" (03:07:38Z); "Gate dates recomputed" gives the dates on that calendar. The freeze numbers were computed with the break skipped.
- **Lane attribution has two answers** (plan lane and actual lane).

**Publication and machine time:**
- **The numeric deployment ids** of `7263004` (Pages 40385448079) and of the candidate `1842a86` (Pages 40957726247) were not read; at the freeze, no GitHub tool the record was allowed to use read deployments. The `deploy-pages` step stands in: for `7263004` its log ("Reported success!" at 19:41:58Z; [kpi-GK1.md](kpi-GK1.md)), for `1842a86` the step's end at 2026-10-29T21:49:41Z. Publish times here are the `deploy-pages` step's end and the run's end.
- **The live About stamp** could not be read from here (expected `v0.1.0 · 1842a86`). **Waits for the owner's HU-6 session.**
- **Publication** is the first successful `deploy.yml` run of 5 min or more whose source contains the merge. Job steps were read by hand only for runs 37341257979, 37411480482, 37469527345 and the three runs of 2026-10-26, and, after the cutoff, for the runs listed under "GitHub, read-only, 2026-10-29 and 2026-10-30".
- **Missing runs.** Pages run numbers 102 and 105–118 of 2026-10-06 are not returned by the API (`PROGRESS:234`). The 2026-10-06 cleanup deleted 297 failed or cancelled runs. The CI list reaches back only to 2026-10-07T04:19Z.
- **Run times** are wall time from the run list, not job time.
- **Re-runs** before an attempt was replaced are not visible.

**KPI-34:**
- **Rebases before a PR opened, or before 2026-10-08T20:35Z.** Their SHAs cannot be recovered: GraphQL is refused by the session proxy, and the events API keeps 300 events. Commits re-committed more than 10 min after they were written flag #108, #112, #117, #157, #158, #159, #162, #165, #177, #178 and #179; a conflict in those rewrites cannot be ruled out.
- **A conflict does not mean the PR could not merge.** Main had no branch protection, and `mergeable_state` is not kept.
- **Messages without a "# Conflicts:" block.** 2f1b45d, 33d5004 and 93eeefa rest on `git merge-tree` alone.
- **Rework classification** is a judgement made row by row. K0's rework was not classified. For the rows of #176–#180 the Q check confirmed the facts, not the judgement.
- **I-train queue waits.** No hook request was filed.

**KPI-35:**
- **K1 decision page 2** returns not-found to this account, so its asked times are bounds.
- **Revised page-1 cards.** Seven were revised after posting, so their creation times are not stored.
- **Chat answers** before 2026-10-26 are known only to the day. The times of 2026-10-26 come from the session that asked the questions.
- **Merge Desk asked times.** No card-creation time is stored, so PR `created_at` stands in.
- **At GK1.** Lateness against the GK1 gate itself is computed when the owner signs, and any question asked after the cutoff is added then.

**Hand-offs and follow-through:**
- Triage of hand-off lines is the agent's reading of the reports. The proposed owners need the owner's acceptance.
- The 8 "raised but never asked" items of KPI-35 and file 4's `NOT ASKED` rows were not reconciled with each other.

## How the freeze numbers were made, and what is left

The scripts are not in the repository; their run is local and not committed. Nothing in them writes to GitHub or to the repository. At the freeze, in order:

1. **Inputs refreshed** with read-only calls: the PR list (#81–#180); `deploy.yml` and `ci.yml` runs; PROGRESS, DECISIONS, `packages.tsv` and `assignment.tsv` at `7263004`.
2. **Updated by hand:** a PR-class row for each of #175–#180; FX-2's written residual 3 → 2 (2a and 2b merged); the KPI-35 question set (the 2026-10-26 Merge Desk answers and P1–P5, and nine stale checks brought to the merged PRs).
3. **Run** at cutoff 2026-10-26T19:42:02Z with `7263004`, the candidate at the freeze, as the ref: `retro.py` (twice, the second with S05's holidays), `replan.py` (no GK1 plan PR left), `auth_lead.py`, `scope_growth.py 221ed1a 7263004`, `verify/v_core.py`, `verify/v_wipcap.py`, `verify/v_gates_freeze.py`, `handoff_extract.py` and `kpi35.py`. Every step exited 0; no PR was unmapped.
4. **KPI-34:** the PR-timeline cache refreshed with REST GETs (the stale #175 and #176 entries dropped first), then the analysis at the same cutoff; the new rework candidates classified.
5. **Checked by hand:** the commit lists and files of #175–#180; the `heavy.yml` run list after the freeze.

The Q check (2026-10-27; method and totals in [kpi-GK1.md](kpi-GK1.md), "Gates"):
- **This file:** Q check: confirmed 394 of 435 claims (2026-10-27). A checker that did not write it took the PR list (#82–#181) from its own GitHub call, replayed every K0 and K1 merge with `git merge-tree`, read the runs, jobs and logs, and recomputed the numbers with its own scripts, not the scripts above. Every table row and every owner quote was checked; about 10 prose claims were left out and are not counted. The 2026-10-30 update for the candidate `1842a86` came after this check and is not in its count.
- **Corrected after the check** (3 of the 394): #146's kind (budget, not owner-requested), the line numbers of K0's change 4, and the code PRs open together on 2026-10-26.
- **Not checkable from primary sources** (41): what rests on the local package map, calendar and KPI-35 question set, and the KPI-34 classification.
- **KPI-35 at sign-off:** run `kpi35.py` with the GK1 time, and add any question asked after the cutoff (among them those of 2026-10-29, DECISIONS "Decided 2026-10-29").

## Sources

- **Plan, adopted** (at `7263004`; unchanged since `c5da5bb`):
  - `docs/development/plan/S05-structure-waves-gates.md`: §05.3 `:86`; GK checklist `:110-122`; signers `:94`; §05.6 `:270-296`, capacity `:298-306`, bottleneck `:309`, WIP order `:318`; §05.9 `:357-389`, Day mapping `:359`, machine times `:361`, constraints `:384-389`, Node `:386`, year-end break `:387`, holidays `:389`, owner and coordinator hours `:393-396`; §05.11 `:428-435`; §05.13 `:450-483` (risks 10 `:465`, 20 `:475`, 22 `:477`).
  - `docs/development/plan/S18-execution-model.md`: §18.3 `:95-138`; records step 2 `:137`; §18.6 `:204-210` (caps `:206`, records slot `:207`); process lesson 3 `:233`; second-agent check `:238`; no agent writes "decided" `:455`.
- **Plan drafts at `c2af8ae`:** S04 `:159-161`; S07 `:211`; S08 `:451`; S10 `:222`; S16 `:105-107`; S17 `:140`; S19 C6.
- **Records at `7263004`:**
  - `docs/development/PROGRESS.md`: `:29-113`, `:34`, `:36`, `:42`, `:49`, `:53`, `:54`, `:71`, `:85`, `:93-108`, `:125`, `:151`, `:156`, `:205`, `:214`, `:216`, `:222`, `:228`, `:231`, `:233`, `:234`, `:236`, `:241`, `:250`, `:251`, `:373`, `:385-392`, `:397`.
  - `docs/DECISIONS.md`: `:48-63`, `:66`, `:138-363` (cited rows `:151`, `:157`, `:160`, `:171`, `:173`, `:174`, `:322`, `:328`, `:340`, `:342`, `:344`, `:354-363`).
  - `docs/DECISIONS.md` at `5092ac9` (#181, open; the same lines at `ba41b8b`, its head since 2026-10-30): `:364` (the Merge Desk for #179), `:365-369` (P1–P5; P4 at `:368`).
  - `docs/DECISIONS.md` in this PR (#182), "Decided 2026-10-29": the owner's answers of 2026-10-29 on the candidate and on redoing the GK1 evidence.
  - `docs/development/HANDOVER-K1.md:189-194`, `:209`.
  - `docs/development/reports/K0-retro.md:65-79` (change 4 `:77-79`), `kpi-GK0.md:38`, `:46`, `R7.1-GK1.md:93`, `:109-114`, `FX-2-s2a-m-learning-027-reader.md`, `FX-3-pr1-orbit-honest-figures.md:129-131`, `R1.6-pr6-backup-safety.md:102`.
  - `docs/development/plan/data/packages.tsv`, `assignment.tsv`; `.github/workflows/ci.yml:32`; `src/i18n/en.ts:1299`, `src/orbit/sky-tour.ts:32`, `src/workspace/repository.ts:445`.
- **Files of the GK1 record PR:** [kpi-GK1.md](kpi-GK1.md), [GK1-followthrough.md](GK1-followthrough.md) (file 3), [GK1-handoffs.md](GK1-handoffs.md) (file 4), [R7.1-GK1.md](R7.1-GK1.md), [GK1-held-journeys.md](GK1-held-journeys.md), [revert-drill-GK1.md](revert-drill-GK1.md).
- **Commits:** `1842a86` (#185, the candidate since 2026-10-29), `7263004` (#179, the candidate at the freeze), `46728e5` (#180), `a05ae70` (#177), `52dfe03` (#178), `c5da5bb` (#176), `8973e84` (#175), `408ad16` (#174), `5092ac9` (#181's head until 2026-10-30), `ba41b8b` (#181, open), `4349137` (#144), `7cd2155` (#146), `4de951f` (#128), `7b2a3cb` (#145), `0a7e69f` (#164), `79d2686` (#159), `eee4dec` (#108), `1a7960e` (#122), `b16b09e` (#156), `221ed1a` (#105), `06abb1f` (GK0 candidate).
- **GitHub, read-only, 2026-10-26:**
  - The PR list (#81–#180, created and merged times); the commit lists of #177–#180 (`pull_request_read`).
  - `deploy.yml`: the run list (143 runs; the newest 40385448079); runs 40385448079 (11 jobs, `deploy-pages` done 19:41:58Z, run end 19:42:02Z), 40357991698, 40340692641, 40340655844; the failed runs named above; the jobs and `bundle-budget` log of 38002258095 and the jobs of 38001459163.
  - `ci.yml`: the newest 100 completed runs; runs 837–846 (39331569862 … 40371529487).
  - `heavy.yml`: all 8 runs (40240193599, 40144277552, 39171944407, 38184785291, 37253259356 and three before K0), read after the freeze.
  - PR #174's body (the two rounds of findings).
- **GitHub, read-only, 2026-10-29 and 2026-10-30** (for the move to `1842a86`, after the cutoff):
  - `deploy.yml`: 40957726247 (push of #185, at `1842a86`; 11 jobs and their steps, `deploy-pages` done 21:49:41Z; browser (1)'s log for `r7-cross-system`); the schedule runs 40587024272 and 40775643293 (at `7263004`, published) and 40962284621 (at `1842a86`, failed browser shard 2, not published).
  - `heavy.yml`: 40965856304 (`workflow_dispatch`, suite both, at `1842a86`; 41 jobs and the `coverage` notice); no `heavy.yml` run between 40240193599 and it.
  - Main still `1842a86` at 2026-10-30T03:18Z, with no Deploy or heavy run on main after 40965856304.
- **The GK1 readiness report:** a Claude Docs page shared with the owner in chat. It is not in the repository. It is cited by row: the decision table (rows 1–7, with the owner's answers), GK checklist items 2 and 4, the G0/G1+ table, the ceilings table and its notes, and the KPI table (KPI-28, KPI-33) and its notes.
- **Local runs, not committed:** the M-PLAN-026 re-run at the freeze (`retro.py` summary and `numbers.json`, `gates.tsv`, the `replan.py`, `auth_lead.py`, `scope_growth.py` and `kpi35.py` outputs, `verify/` outputs); the KPI-34 fetch and analysis at the freeze cutoff; the build with the teaching tools on (decision 7). On `1842a86`, after the cutoff and on the owner's "Redo all (Recommended)": the held-journeys run (its two builds, and the journeys 2026-10-29 22:35:09–22:55:42Z), the revert drill (2026-10-29 23:21:02–23:26:44Z) and the KPI baselines (2026-10-30 02:28:41–02:54:20Z).
