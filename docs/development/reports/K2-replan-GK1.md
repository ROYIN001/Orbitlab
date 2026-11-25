# K2 count and the GK2 re-estimate at GK1 / นับงาน K2 และประมาณการ GK2 ใหม่ที่ GK1

> **สรุปสำหรับเจ้าของ (ภาษาไทย) — ร่าง ต้องตรวจก่อนใช้ (agent เขียน ยังไม่มี Q check)**
>
> - นี่คือการทำ M-PLAN-026 ซ้ำบน candidate C (`9b224ec`) ตาม HANDOVER-K2 §16.4 ข้อ 10 ทำด้วยมือ เพราะสคริปต์ของ K1 (`retro.py`, `replan.py`) ไม่อยู่ใน repo
> - จุดตัด: จบ Pages 45615392290 ของ C (ขั้น deploy-pages จบ 2026-11-25T13:04:34Z; run จบ 13:04:37Z) ช่วง K2 เริ่มหลังจุดตัดของ K1 (2026-10-26T19:42:02Z, `7263004`) ตัวเลขของ K1 (#95–#180) ไม่เปลี่ยน
> - ใน K2 ถึงจุดตัด merge เข้า main **52 PR** (#181–#235 ยกเว้น #192 ที่ปิดไม่ merge และ #206 ที่ยังเปิด; #233 merge 13:11:12Z หลังจุดตัด จึงไม่นับ) ตรงกับ 52 commit ของ `git log --first-parent 7263004..9b224ece`
>   - PR โค้ด 34 ตัว (1 ตัวเป็นงานในแผน: #224 R2.6) PR บันทึก 16 ตัว PR แผนที่เป็นเอกสาร 2 ตัว (#183, #203) รวม PR ของแผน 3 ตัว (#183, #203, #224)
>   - PR โค้ดที่คุณขอหรือเลือกเองในแชต 27 จาก 34 (79%): ขอเอง 22 เลือกตัวเลือกที่ session เสนอ 5; อีก 6 เป็นการแก้บั๊กตามอนุมัติถาวรหรืองานต่อเนื่อง; 1 เป็นงานในแผน
> - **วันทำการ**: นับแบบ K1-retro (วันจันทร์–ศุกร์หลังวันเริ่มช่วงจนถึงวันจุดตัด ตามปฏิทินที่คุณตอบ S11) ได้ **22 วัน** (27 ต.ค.–25 พ.ย.) ส่วน "20 วัน" ที่ session ใช้คือกรอบ K2 ของ S05 (Day 16–35, 28 ต.ค.–24 พ.ย.)
>   - ใน 20 วันนั้นมี PR โค้ด 33 ตัว = 1.65 ต่อวัน ตรงกับตัวเลขของ session (#234 merge วัน Day 36 จึงอยู่นอก 20 วัน); แบบ K1-retro ได้ 34 ÷ 22 = **1.55 ต่อวัน**
>   - PR ของแผน: 3 ÷ 22 = **0.14 ต่อวันทำการ** (K1: 3.46)
> - งานแผนที่เหลือใน K2 (วิธีเดียวกับ K1-retro): **103.3 PR** (ฐาน ×1.49: 145.0) ต่างจาก "ราว 101" ของ session เพราะ R4.1 +0.67 จาก #203 และ R2.6 ยังเหลือแถว Watch 1 PR
> - **GK2** (ขอบเขตหลัก 49 PR = นิยาม "R2 complete" + R2.1r/R2.2r + ปิด G0/G1+ + FX ทั้งหมด + งาน R7 ของ GK2; คือ 48 ของ session บวก R2.6 ที่เหลือ 1):
>   - ที่ 1.65 ต่อวัน: ฐานแผน Day 65 = **5 ม.ค. 2027**; ฐาน ×1.49 แบบ K1-retro (คูณเฉพาะส่วนที่ยังไม่มีรายการ PR) 64.1 PR → Day 74 = 18 ม.ค. 2027; คูณทั้งหมดแบบ session 73.0 PR → Day 80 = 26 ม.ค. 2027
>   - ที่ 1.55 ต่อวัน: 7 ม.ค. / 21 ม.ค. / 29 ม.ค. 2027
>   - **วันที่ 3 ก.พ. 2027 ของ session หาที่มาไม่ได้** (เป็น Day 86 = 51 วันทำการหลังจุดตัด = 84 PR ที่ 1.65 ต่อวัน ไม่ตรงกับ 48 หรือ 72)
>   - ถ้าใช้อัตรา PR ของแผนที่วัดได้จริงใน K2 (0.14 ต่อวัน) ตามตัวอักษรของ §05.11 ข้อ 2 GK2 จะเลื่อนไปปี 2028 อัตรา 1.55–1.65 จึงเป็นสมมติฐานว่ากำลังที่เคยใช้กับงานนอกแผนจะมาทำงานแผนทั้งหมด ตามคำตอบ "งานแผนอย่างเดียว (แนะนำ)" (2026-11-25T07:21:22Z) ซึ่งยังไม่ได้วัด
> - สิ่งที่หาไม่ได้หรือไม่ได้วัด อยู่ในหัวข้อ "Not determined" ท้ายไฟล์ ขอบเขตและวันที่ของ GK2 เป็นคำถามสำหรับคุณ (HANDOVER-K2 §16.4 ข้อ 17) ไฟล์นี้ไม่ได้ตัดสิน

```yaml
# Draft made by hand, 2026-11-25, from read-only GitHub REST GETs and git; committed by the GK1 close-out records PR as a draft for its Q check (HANDOVER-K2 §16.4, step 16); not Q-checked yet
candidate_sha: 9b224ece67e8d9167ce67230cd5f4d4d7581bbf0   # C: main after #234, merged 2026-11-25T12:36:30Z
candidate_published: {pages_run: 45615392290, event: push, conclusion: success, deploy_pages_end: "2026-11-25T13:04:34Z", run_end: "2026-11-25T13:04:37Z"}
k1_cutoff: "2026-10-26T19:42:02Z"   # K1-retro "Scope and cutoffs"; end of Pages 40385448079 at 7263004
cutoff: "2026-11-25T13:04:37Z"      # run end (updated_at), as K1-retro used; the same counts at 13:04:34Z
wave: "K2 = PRs merged into main after the K1 cutoff and by the cutoff: #181-#235 less #192 (closed, base not main) and #206 (open)"
github_access: read-only REST GETs (gh api); GraphQL not used; nothing written
tools: "k2count.py and k2replan.py (written for this draft; standard library only; local, not committed)"
```

This file is GK item 9 on C: the M-PLAN-026 re-run, which is the K2/GK2 re-plan (HANDOVER-K2 §16.4 step 10; S05 §05.11, `plan/S05-structure-waves-gates.md:442-449`). It counts what K2 merged up to the cutoff (§05.11 item 1, in part) and re-estimates GK2 by item 2, the way [K1-retro.md](K1-retro.md) did ("Re-estimate", `K1-retro.md:571`). Items 3 to 5 (what moves, the WIP cap, the PROGRESS row) are the owner's, after this count; the facts they need are in "For items 3 to 5".

K1's scripts (`retro.py`, `replan.py`, `verify/*.py`) were a local run and are gone. Every number here was made again by hand from GitHub and git, with two short local scripts. Each number names its source as **[Sn]**; the commands are under "Sources".

## Scope and cutoffs

**The cutoff.** Every count is at **2026-11-25T13:04:37Z**, the end (`updated_at`) of Pages 45615392290, the push run that published C (`9b224ece`). Its `publish` job's step "Run actions/deploy-pages@v4" finished at 13:04:34Z **[S4]**. Between 13:04:34Z and 13:04:37Z no PR was opened, merged or closed, and no `deploy.yml`, `ci.yml` or `heavy.yml` run started or ended **[S1]**, **[S3]**.

**The start.** K2 starts at K1's cutoff, 2026-10-26T19:42:02Z (`K1-retro.md:103`). Nothing was open then (`K1-retro.md:113`). The first K2 PR, #181, opened at 21:35:56Z **[S1]**.

**Wave and PRs** **[S1]**, **[S5]**:
- **Merged into main in the window:** 52 PRs, #181 to #235 except #192 and #206. `git log --first-parent 7263004..9b224ece` has 52 commits, one per PR **[S5]**.
- **Not counted:** #192 (draft, base `claude/great-mayer-6kapau`, closed unmerged 2026-11-05T16:43:44Z); #206 (EQ-6 step 2, draft, open since 2026-11-05T01:04:56Z); #233 (FX-4 step 1, merged 2026-11-25T13:11:12Z as `3dd334c7`, 6 min 35 s after the cutoff); #236 onwards.
- **Open at the cutoff:** #206, #233 and #236 **[S7]**.
- **Published:** all 52 were on a successful `deploy.yml` run by the cutoff; the last two, #235 and #234, by C's own run 45615392290 **[S7]**.

**Calendar** (S05 §05.3, `S05:69`; the owner's S11 answers, 2026-10-28T03:04:38Z and 03:07:38Z): Day 1 = 2026-10-05; Monday to Friday count; 13 and 23 Oct are skipped; from 2026-10-26 every Monday to Friday counts. Day 14 = 2026-10-26, Day 35 = 2026-11-24, **the cutoff day 2026-11-25 is Day 36**, Day 85 = 2027-02-02 **[S8]**.

### What a working day is here

K1-retro counts **the Monday-to-Friday dates after the window's start date, up to and including the cutoff date** (13 and 23 Oct skipped): its window is "13 working days" (`K1-retro.md:575`). The count script reproduces 13 for that window before it counts K2's **[S7]**.

| Definition | K2 working days | Dates |
|---|---|---|
| **K1-retro's rule** (used here) | **22** | 2026-10-27 to 2026-11-25 |
| S05's K2 timebox, Day 16–35 (`S05:76`, `S05:357`) — the session's "K2's 20 working days" | 20 | 2026-10-28 to 2026-11-24 |
| Day 16 to the cutoff day (Day 36) | 21 | 2026-10-28 to 2026-11-25 |

No PR merged on 2026-10-27; two merged on Day 36, #235 (12:06:34Z) and #234 (12:36:30Z) **[S7]**.

## What K2 delivered (§05.11 item 1)

### By kind

Kinds are set by hand, one per PR, from each PR's changed files **[S2]** and PROGRESS's history rows at C **[S9]**: **code** changes a file that is not Markdown; **records** is a Markdown-only records PR; **plan** is a PR of a plan package or the plan adoption itself (#224, R2.6, is both code and plan).

| Kind | PRs | Which |
|---|---|---|
| Code, not a plan package | 33 | see the PR list |
| Code, plan package | 1 | #224 (R2.6, M-LAUNCH-062; Redesign A S4) |
| Plan, docs only | 2 | #183 (K2 plan sections, GK1 item 12, D-65; no `packages.tsv` row), #203 (R7.5 docs PR, the GK1 re-plan) |
| Records | 16 | #181, #182, #186, #199, #200, #202, #205, #207, #211, #215, #216, #226, #228, #229, #232, #235 |
| **Total into main** | **52** | |

So **34 code PRs, 3 plan PRs (#183, #203, #224) and 16 records PRs** **[S7]**. The ceiling raises came inside code PRs (#184, #195, #217, #223, #224 and #225 change `budgets.json`, **[S2]**).

### Who asked for the code PRs

Basis, set by hand from PROGRESS's history rows **[S9]** and the PR bodies **[S1]**: **request** (the owner asked in chat), **choice** (the owner picked an offered option), **standing** (the standing bug-fix approval, or a follow-up fix with no owner request), **plan**.

| Basis | Code PRs | Which |
|---|---|---|
| request | 22 | #184, #185, #187, #188, #189, #190, #191, #193, #194, #195, #197, #198, #210, #212, #217, #221, #222, #223, #225, #227, #230, #231 |
| choice | 5 | #196 ("Offset PR first (Recommended)"), #201 (answer to `replay-burn-cubic`), #208 ("yes, open a test-only PR with the comment fix"), #209 ("แก้ให้ทนเครื่องช้า (แนะนำ)"), #213 (choice B of the r3-first-launch report) |
| standing | 6 | #204, #214, #218, #219, #220, #234 (#234's changed assertion was approved by the owner, "เอาตามที่คุณแนะนำครับ", 11:56:29Z, for a follow-up PR) |
| plan | 1 | #224 |

**Owner-requested share: 27 of 34 code PRs (79%)** when "request" and "choice" both count; 22 of 34 (65%) for "request" alone **[S7]**.

### Rates

| Measure | K1-retro's 22 days | S05's Day 16–35 (20 days) | Day 16–36 (21 days) |
|---|---|---|---|
| Code PRs | 34 → **1.55** a day | 33 → **1.65** a day (#234 is on Day 36) | 34 → 1.62 |
| Code PRs, not plan | 33 → 1.50 | 32 → 1.60 | 33 → 1.57 |
| Plan PRs | 3 → **0.14** | 3 → 0.15 | 3 → 0.14 |
| All PRs | 52 → 2.36 | 50 → 2.50 | 52 → 2.48 |

K1 for comparison: 6.54 all PRs and 3.46 plan PRs per working day (`K1-retro.md:582-585`).

### Against the session's leads (HANDOVER-K2 §16.4 step 10)

| Lead (REST PR list, 2026-11-25) | Recount at the cutoff | Why they differ |
|---|---|---|
| 33 code PRs | 34 code PRs; 33 in Day 16–35 | #234 merged on Day 36; the lead matches the 20-day timebox exactly |
| K2's 20 working days | 22 by K1-retro's rule | the lead used S05's timebox (Day 16–35) |
| 1.65 a day | 1.55 (34 ÷ 22); 1.65 (33 ÷ 20) | the two rows above |
| 25 owner-requested | 27 (request 22 + choice 5) of 34 | not determined: the lead's list is not recorded |
| 3 plan PRs | 3: #183, #203, #224 | the same, if the lead counted #183 as plan |
| about 101 plan PRs left in K2 | 103.3 (plan basis), 145.0 (×1.49) | R4.1 +0.67 from #203 (`S05:393`); −1 for #203 against R7.5; R2.6 −1 and +1 (Watch row still to do); #183 against no package |

### By date

| UTC date (Day) | Code | Plan | Records |
|---|---|---|---|
| 29 Oct (17) | 1 (#185) | | |
| 30 Oct (18) | 2 (#187, #193) | | |
| 31 Oct – 1 Nov (weekend after Day 18) | 9 (#184, #189, #191, #194–#198, #201) | | 3 (#199, #200, #202) |
| 4 Nov (21) | 1 (#204) | 2 (#183, #203) | 4 (#181, #182, #186, #205) |
| 5 Nov (22) | 4 (#188, #190, #208, #209) | | 2 (#207, #211) |
| 6–7 Nov (23 and the weekend) | 4 (#210, #212, #213, #214) | | 2 (#215, #216) |
| 14 Nov (weekend after Day 28) | 6 (#217–#222) | | |
| 18 Nov (31) | 1 (#223) | | |
| 19 Nov (32) | 1 (#225) | 1 (#224, code) | |
| 20–22 Nov (33 and the weekend) | 3 (#227, #230, #231) | | 4 (#226, #228, #229, #232) |
| 25 Nov (36) | 1 (#234) | | 1 (#235) |

18 of the 34 code PRs merged on a Saturday or Sunday (UTC). No PR merged from 2026-11-08 to 2026-11-13 or on 2026-11-23 and 2026-11-24 **[S7]**.

### By package (§05.11 item 1: merged against `pr_estimate`)

| Package | Lane (S05 §05.6) | `pr_estimate` | Merged in K2 | Note |
|---|---|---|---|---|
| R2.6 | V | 1 | 1 (#224) | M-LAUNCH-062 not complete: Watch has no menu yet |
| R7.5 | I | 4 (K0–K6) | 1 (#203) | step 2 is #236, open at the cutoff |
| — (#183) | I | — | 1 | GK1 item 12 (D-65); no `packages.tsv` row |
| EQ-6 | I | 3 | 0 | #206 open (draft) |
| FX-4 | T+P | 3 | 0 | #233 merged after the cutoff |

Every other K2 package merged nothing by the cutoff **[S1]**, **[S9]**.

### Every PR in the window

Day is the S05 Day of the UTC merge date ("weekend" = after that Day). Lead = `created_at` → `merged_at`. "Published by" = the first successful `deploy.yml` run whose head is at or after the PR's merge commit on main's first-parent line and which ended after the merge.

| PR | Title (shortened) | Merged (UTC) | Day | Kind | Basis | Merge commit | Lead (h) | Published by Pages |
|---|---|---|---|---|---|---|---|---|
| #181 | Records (K1): fold #179, published at 7263004; the Merge Desk for #… | 2026-11-04 13:15 | 21 | records | records | `3a0e3b98` | 207.66 | 41908317604 |
| #182 | Records (GK1): the K1 close — KPIs, retrospective, follow-through,… | 2026-11-04 13:16 | 21 | records | records | `a5b9afee` | 184.0 | 41908317604 |
| #183 | Plan: the K2 sections into docs/development/plan (S04, S07, S08 set… | 2026-11-04 17:17 | 21 | plan | plan | `9e627060` | 170.76 | 41908317604 |
| #184 | Soyuz Anatomy: the owner's 3-D Soyuz models in Build and in flight | 2026-10-31 00:01 | 18 (weekend) | code | request | `f68faabe` | 53.14 | 41147854738 |
| #185 | Replay: a spent stage coasting in orbit stays on its arc between fr… | 2026-10-29 21:25 | 17 | code | request | `1842a86c` | 24.09 | 40957726247 |
| #186 | Records: fold #185, published at 1842a86; the owner's request and M… | 2026-11-04 13:17 | 21 | records | records | `ebddc7e6` | 135.28 | 41908317604 |
| #187 | Replay (bug fix): a six-DOF vehicle coasting between two frames is… | 2026-10-30 19:39 | 18 | code | request | `ef9d3f61` | 21.14 | 41116997002 |
| #188 | Replay (bug fix): a seek's frame shares nothing a consumer could wr… | 2026-11-05 16:27 | 22 | code | request | `7d12951f` | 156.1 | 42064589225 |
| #189 | Replay (bug fix): no coast span of hours in a thinned recording; th… | 2026-10-31 06:44 | 18 (weekend) | code | request | `089b34e6` | 22.79 | 41177810784 |
| #190 | Replay (bug fix): an escape or a capsule's return between two frame… | 2026-11-05 10:14 | 22 | code | request | `5588be18` | 146.26 | 42009007666 |
| #191 | Replay (bug fix): a spent stage falling through the air stays close… | 2026-10-31 07:29 | 18 (weekend) | code | request | `cbf16144` | 23.43 | 41180772086 |
| #193 | Replay (bug fix): an untargeted recovery's entry and landing burns… | 2026-10-30 20:23 | 18 | code | request | `dcfa0651` | 1.46 | 41122790689 |
| #194 | Replay (bug fix): a body in the air between frames 4,000 s or more… | 2026-10-31 12:28 | 18 (weekend) | code | request | `e8cc4829` | 17.49 | 41201507001 |
| #195 | Replay (bug fix): a spent body that comes down between two frames f… | 2026-10-31 12:00 | 18 (weekend) | code | request | `6953369f` | 16.39 | 41201507001 |
| #196 | Replay (identical output): one local arc() for Apollo's cubic calls… | 2026-10-31 12:31 | 18 (weekend) | code | choice | `7cbf8022` | 16.48 | 41201507001 |
| #197 | Debris (bug fix): a spent body's impact longitude is taken at its c… | 2026-10-31 12:28 | 18 (weekend) | code | request | `aab0689e` | 16.26 | 41201507001 |
| #198 | Replay (bug fix): a spent stage falling through the air is recorded… | 2026-10-31 12:13 | 18 (weekend) | code | request | `1d5ea19b` | 15.92 | 41201507001 |
| #199 | Records: fold #193, published at dcfa065; the owner's request, §5 a… | 2026-10-31 13:26 | 18 (weekend) | records | records | `1562df57` | 6.88 | 41206179845 |
| #200 | Records: fold #191, published at cbf1614; the owner's request, foll… | 2026-10-31 12:12 | 18 (weekend) | records | records | `7bf22b93` | 0.01 | 41201507001 |
| #201 | Replay (bug fix): a stage under a recovery burn in the air is drawn… | 2026-10-31 13:34 | 18 (weekend) | code | choice | `bc63d8a9` | 0.82 | 41206179845 |
| #202 | Records: fold #201, published at bc63d8a; the owner's merge answer… | 2026-11-01 00:06 | 18 (weekend) | records | records | `0fa25ad7` | 0.01 | 41908317604 |
| #203 | Plan (R7.5, GK1 re-plan): moved K1 work in the wave columns, R4.x a… | 2026-11-04 20:37 | 21 | plan | plan | `8dcc4b25` | 2.17 | 41908317604 |
| #204 | Tests (bug fix): the Falcon Heavy debris-replay case gets a 30 s ti… | 2026-11-04 20:21 | 21 | code | standing | `bab39fc4` | 1.6 | 41908317604 |
| #205 | Records: fold #183; the GK1 merges of 2026-11-04 and the owner's an… | 2026-11-04 20:23 | 21 | records | records | `1770d931` | 0.29 | 41908317604 |
| #207 | Records: fold #184, #187, #189, #194–#198, #203 and #204; the owner… | 2026-11-05 09:56 | 22 | records | records | `9ca2ffe0` | 0.01 | 42009007666 |
| #208 | Tests (replay): the lesson ru-fdir-dus flown through the recorder,… | 2026-11-05 18:37 | 22 | code | choice | `7af3b93f` | 1.0 | 42087327369 |
| #209 | Tests (bug fix): r3-first-launch holds the viewer's 100× and waits… | 2026-11-05 18:45 | 22 | code | choice | `fa3c486d` | 0.88 | 42087327369 |
| #210 | Tests (Watch's picked speed) and the report of r3-first-launch's cause | 2026-11-06 05:28 | 23 | code | request | `4476540b` | 7.7 | 42168605010 |
| #211 | Records: fold #190, #188, #208 and #209; the owner's answers of 202… | 2026-11-05 22:47 | 22 | records | records | `b195875a` | 0.04 | 42168605010 |
| #212 | Tests (bug fix): r2-flight-shell presses Watch's own 25×; the repor… | 2026-11-06 20:12 | 23 | code | request | `4b7b66cb` | 5.33 | 42286344470 |
| #213 | Watch: a warp set from outside the viewer is a speed picked there | 2026-11-06 21:58 | 23 | code | choice | `d01019a4` | 1.61 | 42304106516 |
| #214 | Watch: the crew-safe end card times the escape system's flight to t… | 2026-11-07 04:13 | 23 (weekend) | code | standing | `cec4b572` | 5.89 | 42337488870 |
| #215 | Records: fold #210, #212 and #213; the owner's answers of 2026-11-06 | 2026-11-06 22:51 | 23 | records | records | `56887bac` | 0.0 | 42337488870 |
| #216 | Records: fold #214; the owner's requests of 2026-11-07 | 2026-11-07 08:07 | 23 (weekend) | records | records | `3e1b48a9` | 0.0 | 42354764901 |
| #217 | Structure & Assembly: a fourth section, Soyuz-2.1b/Fregat ST31 and… | 2026-11-14 03:58 | 28 (weekend) | code | request | `1ddf187b` | 56.13 | 43571092221 |
| #218 | Home (bug fix): the Thai picture of the Structure chapter shows the… | 2026-11-14 04:22 | 28 (weekend) | code | standing | `6f2e1d5a` | 0.3 | 43571092221 |
| #219 | Top bar (bug fix): the current level as its glyph before the tabs t… | 2026-11-14 05:59 | 28 (weekend) | code | standing | `db9f4dee` | 0.26 | 43571092221 |
| #220 | Tests (bug fix): structure-assembly brings a control into sight wit… | 2026-11-14 07:26 | 28 (weekend) | code | standing | `03b0d981` | 0.31 | 43571092221 |
| #221 | Anatomy and verification: the Soyuz-2.1a pages in the Thai words of… | 2026-11-14 11:54 | 28 (weekend) | code | request | `d59c1205` | 0.37 | 43592230460 |
| #222 | Thai: the app's dictionary in the words of Thai sources — stage, co… | 2026-11-14 12:48 | 28 (weekend) | code | request | `8a9a108d` | 0.36 | 43596583695 |
| #223 | Redesign A (S0–S3): IBM Plex and line icons in the top bar, Watch s… | 2026-11-18 22:07 | 31 | code | request | `2eb9f0d3` | 100.0 | 44408512731 |
| #224 | Redesign A (S4): R2.6 event-jump menu in Explore and Engineer, with… | 2026-11-19 18:59 | 32 | code | plan | `0f33d9fc` | 6.72 | 44593597570 |
| #225 | Redesign A (S5): the Engineer flight wall, with system status and a… | 2026-11-19 22:56 | 32 | code | request | `359cf6be` | 3.79 | 44633189245 |
| #226 | Records: fold #223, #224 and #225; the owner's words on Redesign A,… | 2026-11-20 04:10 | 33 | records | records | `a15856b3` | 3.47 | 44706531663 |
| #227 | Tests: split r2-viewport-matrix into its desktop and phone sizes, a… | 2026-11-20 08:56 | 33 | code | request | `976731ca` | 3.56 | 44706531663 |
| #228 | Records: fold #227; the owner's words of 2026-11-20 (#226's merge,… | 2026-11-20 15:54 | 33 | records | records | `6c63626e` | 0.37 | 44835908257 |
| #229 | Records: fold #217 to #222 (Structure & Assembly); their Pages runs… | 2026-11-20 19:10 | 33 | records | records | `23ce38a5` | 0.57 | 44835908257 |
| #230 | Onboard view (bug fix): the latest callout writes the event as the… | 2026-11-21 00:33 | 33 (weekend) | code | request | `ffe3734d` | 0.56 | 44844566221 |
| #231 | Home: the landing page's eighteen pictures taken again (npm run shots) | 2026-11-22 00:34 | 33 (weekend) | code | request | `5be3b7d0` | 0.6 | 44967260071 |
| #232 | Records: fold #230 and #231; their Pages runs; the owner's words of… | 2026-11-22 01:23 | 33 (weekend) | records | records | `844319e2` | 0.11 | 45079560718 |
| #234 | Satellite data (bug fix): the daily refresh keeps only the group wh… | 2026-11-25 12:36 | 36 | code | standing | `9b224ece` | 2.94 | 45615392290 |
| #235 | Records: the owner's answers of 2026-11-25 (HU-6 moves to GK2 and t… | 2026-11-25 12:06 | 36 | records | records | `8d617bb5` | 0.01 | 45615392290 |

## How K2 ran (WIP and lead)

| Measure | K2 | K1 (`K1-retro.md:577-587`) |
|---|---|---|
| Window | 29.72 calendar days, 22 working days | 20.98 calendar days, 13 working days |
| Mean WIP, open PRs into main (time-weighted) | **2.72** | 1.33 |
| Mean WIP, code PRs (with #206, #233, #236) | 1.72 | — |
| Mean WIP, plan PRs | 0.95, of which #206 alone 0.69 (open 20.5 of 29.7 days) | 1.04 |
| Lead, all merged PRs | mean 27.76 h, median 3.20 h | mean 7.87 h, median 45 min |
| Lead, code PRs | mean 21.52 h | — |
| Little's law (WIP ÷ mean lead) | 2.35 PRs per calendar day | 4.05 |
| Direct count | 52 ÷ 29.72 = 1.75 per calendar day | 4.05 |

**Little's law does not give K2's rate.** In K1 nothing was open at either end of the window, so WIP ÷ lead equalled the direct count (`K1-retro.md:591`). In K2 three PRs were open at the cutoff, #206 for 20.5 days, and six PRs opened before 2026-10-31 were open 5.6–8.7 days each under the merge hold H2. So the rates here are direct counts, not S05 §05.11 rule 2's "WIP ÷ lead time" (`S05:445`).

## Re-estimate (§05.11 item 2)

### Remaining plan PRs in K2

The method is K1-retro's (`K1-retro.md:640-647`, `:730`): K2's share of each package by S05 §05.6's rule, plus the K1 remainder moved to K2 at GK1 (41.6 PRs), less what has merged; written residuals take precedence over `pr_estimate`; ×1.49 basis multiplies each unwritten remainder by 1.488 and leaves written residuals as they are (this reproduces K1-retro's 146.0 from 103.7). Four K2-range rows have nothing left and are not listed: R0.2r, R0.3r, FX-3 and DEC.

| Package | Wave at C | pr_estimate | K2 before K2 work | Merged in K2 | K2 left (plan) | Written list | K2 left (×1.49) | How |
|---|---|---|---|---|---|---|---|---|
| I-HOOKS | K2 | 5 | 5 |  | 5 |  | 7.44 | K1 3 moved + K2 2 (S05:270 exception) |
| CO-4 | K0-K2 | 11 | 7 |  | 7 | yes | 7 | 11 - 4 merged (#86 #134 #172 #173): K1 steps 2,4a,4b,5 + K2 steps 6,9,10 |
| R0.4 | K0-K2 | 10 | 8 |  | 8 |  | 11.9 | 10 - 2 merged (#140 #148); all moved to K2 |
| EQ-2 | K2 | 4 | 4 |  | 4 |  | 5.95 | K1 2.5 moved + K2 1.5 |
| EQ-3 | K2 | 4 | 4 |  | 4 |  | 5.95 | K2 only |
| EQ-4 | K2 | 2 | 2 |  | 2 |  | 2.98 | K2 only |
| EQ-5 | K2 | 3 | 3 |  | 3 |  | 4.46 | K2 only |
| EQ-6 | K2 | 3 | 3 |  | 3 |  | 4.46 | K2 only; draft #206 open, none merged |
| EQ-7 | K2-K5 | 4 | 2 |  | 2 |  | 2.98 | K2 2 of K2-K5 (S05:270 exception) |
| EQ-9 | K2 | 1 | 1 |  | 1 |  | 1.49 | K2 only |
| EQ-10 | K2 | 3 | 3 |  | 3 |  | 4.46 | K2 only |
| EQ-11 | K2 | 1 | 1 |  | 1 |  | 1.49 | K2 only |
| EQ-12 | K2-K3 | 4 | 2 |  | 2 |  | 2.98 | 4 over K2-K3 |
| EQ-14 | K3-K5 | 5 | 1 |  | 1 |  | 1.49 | K2 1, M-LEARNING-006 (S05:270 exception) |
| FX-1 | K1-K2 | 2 | 3 |  | 3 | yes | 3 | written residual M-BUILD-029 x3 (K1-retro "By package") |
| FX-2 | K1-K2 | 3 | 2 |  | 2 | yes | 2 | written residual M-LEARNING-002, -003 |
| FX-4 | K2 | 3 | 3 |  | 3 |  | 4.46 | K2 only; step 1 #233 merged 13:11:12Z, after the cutoff |
| FX-5 | K1-K2 | 2 | 1 |  | 1 | yes | 1 | written residual M-LAUNCH-035 |
| FX-6 | K2 | 1 | 1 |  | 1 |  | 1.49 | K2 only |
| FX-7 | K1-K2 | 3 | 2 |  | 2 |  | 2.98 | K2 2 (S05:270 exception) |
| R1.6 | K1-K2 | 8 | 4 |  | 4 | yes | 4 | written residual PR5, PR8, PR9, PR10 |
| R2.1r | K2 | 4 | 4 |  | 4 |  | 5.95 | K2 only |
| R2.2r | K2 | 2 | 2 |  | 2 |  | 2.98 | K2 only |
| R2.3s2 | K2-K3 | 3 | 1.5 |  | 1.5 |  | 2.23 | 3 over K2-K3 |
| R2.5 | K2 | 6 | 6 |  | 6 |  | 8.93 | K2 only |
| R2.6 | K2 | 1 | 1 | 1 (+1 residual) | 1 | yes | 1 | K2 only; #224 delivered 1, but M-LAUNCH-062 is not complete (Watch has no menu; owner row 5 ข, PROGRESS register R2.6): written residual 1 |
| R4.1 | K2-K3 | 8 | 5.33 |  | 5.33 |  | 7.94 | 8 over K1-K3 by the freeze method: K1 share moved + K2 share (2.67 x 2); 7 -> 8 in #203 (S05:393: +0.67 in K2) |
| ED-ASSESS-1 | K2 | 1 | 1 |  | 1 |  | 1.49 | K2 only |
| ED-I18N-1 | K1-K2 | 2 | 1 |  | 1 |  | 1.49 | K1 remainder moved |
| ED-INST-1 | K1-K3 | 5 | 2.33 |  | 2.33 |  | 3.47 | K1 share 0.67 moved + K2 1.67 (5 over K1-K3, 1 merged) |
| ED-LES-1 | K1-K2 | 5 | 4 |  | 4 |  | 5.95 | K1 1.5 moved + K2 2.5 (5 over K1-K2, 1 merged) |
| HU-1 | K0-K2 | 1 | 0 |  | 0 |  | 0.0 | 1 merged before K2 (step 1, the protocol draft; PROGRESS register row HU-1); the round-1 session itself moved after GK2 (owner, 2026-11-25T07:21:22Z) |
| HU-2 | K2-K3 | 2 | 1.33 |  | 1.33 |  | 1.98 | K1 0.67 moved + K2 0.67 |
| HU-3 | K2-K3 | 2 | 1.33 |  | 1.33 |  | 1.98 | K1 0.67 moved + K2 0.67 |
| HU-6 | K1-K4 | 1 | 0.5 |  | 0.5 |  | 0.74 | K1 0.25 moved + K2 0.25 (1 over K1-K4) |
| R7.1 | each gate | 11 | 3.71 |  | 3.71 |  | 5.53 | 11 over K0-K6, K0-K2 shares less #175 |
| R7.2 | each gate | 5 | 2.14 |  | 2.14 |  | 3.19 | 5 over K0-K6, K0-K2 shares |
| R7.3 | continuous | 5 | 2.14 |  | 2.14 |  | 3.19 | idem |
| R7.4 | continuous | 3 | 1.29 |  | 1.29 |  | 1.91 | 3 over K0-K6, K0-K2 shares |
| R7.5 | continuous | 4 | 1.71 | 1 | 0.71 |  | 1.06 | 4 over K0-K6, K0-K2 shares |

| Total | Plan basis | ×1.49 basis |
|---|---|---|
| K2 at GK1 (K1-retro, `:730`) | 103.7 | 146.0 |
| K2 at C before K2's merges (R4.1 7 → 8 in #203: +0.67 in K2, `S05:393`) | 104.3 | — |
| **K2 left at the cutoff** | **103.3** | **145.0** |

- If #183 is counted against R7.5, K2 left is 102.3; with #233 (after the cutoff) as well, 101.3. The session's "about 101" is within this range.
- R2.6 stays at 1: #224 delivered the Events menu in Explore and Engineer; the owner's answer of 2026-11-16 puts a Watch row in a later step **[S9]**.

### Which packages count for GK2 ("core scope")

The repo does not define "core scope"; the phrase is from the session's draft. Here it is the plan work that a GK2 exit condition names.

| Part | Source | Packages (K2 left, plan basis) | PRs |
|---|---|---|---|
| "R2 complete" | `S05:148` | CO-4 7, R2.3s2 3, R2.5 6, R2.6 1 | 17 |
| G0 closed | `S05:95` | R0.4 8 | 8 |
| G1+ | `S05:96` | R1.6 4 | 4 |
| All FX merged within K2 | `S05:53` | FX-1 3, FX-2 2, FX-4 3, FX-5 1, FX-6 1, FX-7 2 | 12 |
| GK2's own R7 items | `S05:109-121` | R7.1 1, R7.2 1 (assumed) | 2 |
| **Core A** | | | **43** |
| The rest of S05's K2 "R2" row | `S05:76` | R2.1r 4, R2.2r 2 | 6 |
| **Core B** | | | **49** |

Core B is the session's 48 with R2.6's Watch row added; the session's list is not recorded, so that match is a reading, not a check.

| Core | Plan basis | ×1.49, unwritten only (K1-retro's method) | ×1.49 on all of it |
|---|---|---|---|
| A | 43 | 55.2 | 64.1 |
| B | 49 | 64.1 | 73.0 |

### Rate

S05 §05.11 rule 2 says "remaining PRs ÷ measured throughput". K1 measured 3.46 plan PRs a day. K2's measured plan rate is **0.14** (3 ÷ 22). That rate is not a capacity: K2's code capacity went to work outside the plan. On 2026-11-25 the owner answered "งานแผนอย่างเดียว (แนะนำ)" (07:21:22Z): plan work only until GK2. So the dates below use four rates; the K2 code rate stands for "K2's code capacity, all on plan work", which has not been measured.

| Rate | PRs per working day | Source |
|---|---|---|
| K2 plan PRs | 0.136 | 3 ÷ 22 **[S7]** |
| **K2 code PRs** | **1.545** | 34 ÷ 22 **[S7]** |
| The session's lead | 1.65 | 33 ÷ 20 (Day 16–35) **[S7]** |
| K1 plan PRs | 3.46 | `K1-retro.md:584` |

### GK2 dates

Day = 35 + ceil(PRs ÷ rate). Dates on the owner's calendar.

| Scope | PRs | 1.545 (K2 code) | 1.65 (lead) | 3.46 (K1 plan) | 0.136 (K2 plan) |
|---|---|---|---|---|---|
| Core A, plan basis | 43 | D63, 2027-01-01 | D62, 2026-12-31 | D48, 2026-12-11 | D351, 2028-02-09 |
| Core A, ×1.49 (unwritten) | 55.2 | D71, 2027-01-13 | D69, 2027-01-11 | D51, 2026-12-16 | D440, 2028-06-13 |
| **Core B, plan basis** | **49** | **D67, 2027-01-07** | **D65, 2027-01-05** | D50, 2026-12-15 | D395, 2028-04-11 |
| **Core B, ×1.49 (unwritten)** | **64.1** | **D77, 2027-01-21** | **D74, 2027-01-18** | D54, 2026-12-21 | D506, 2028-09-13 |
| Core B, ×1.49 (all) | 73.0 | D83, 2027-01-29 | D80, 2027-01-26 | D57, 2026-12-24 | D571, 2028-12-13 |
| All of K2, plan basis | 103.3 | D102, 2027-02-25 | D98, 2027-02-19 | D65, 2027-01-05 | D793, 2029-10-19 |
| All of K2, ×1.49 | 145.0 | D129, 2027-04-05 | D123, 2027-03-26 | D77, 2027-01-21 | D1099, 2030-12-23 |

**The session's draft, "GK2 on 2027-02-03 at 1.65 a day", is not reproduced.** 2027-02-03 is Day 86: 51 working days after the cutoff, or 84 PRs at 1.65 a day. 48 PRs at 1.65 a day give Day 65 (2027-01-05) and 72 give Day 79 (2027-01-25). How the draft got its date is not recorded.

The GK2 dates of the GK1 re-plan, Day 43 (2026-12-04) and Day 56 (2026-12-23) (`S05:385`), assumed 3.46 plan PRs a day; with 3 plan PRs merged by Day 36, neither can hold for all of K2 at any rate measured in K2.

**A Friday check**: core B, plan basis, at 1.65 a day, expects these plan PRs merged from the cutoff on.

| Friday | Day | Working days | Plan PRs expected | Of 49 |
|---|---|---|---|---|
| 2026-11-27 | 38 | 3 | 5.0 | 10% |
| 2026-12-04 | 43 | 8 | 13.2 | 27% |
| 2026-12-11 | 48 | 13 | 21.5 | 44% |
| 2026-12-18 | 53 | 18 | 29.7 | 61% |
| 2026-12-25 | 58 | 23 | 38.0 | 78% |
| 2027-01-01 | 63 | 28 | 46.2 | 94% |
| 2027-01-05 (Tue) | 65 | 30 | 49.5 | done |

**What the dates mean.** They assume what K1-retro assumed (`K1-retro.md:681`): the plan work arrives ready and authorized, and lanes open it in parallel. K2 did not show that: plan WIP was 0.95, two thirds of it one draft (#206) waiting for a window. The 1.55–1.65 rate was reached with owner-requested work, often opened and merged within hours; the plan packages left include EQ oracle work, storage work with a second reviewer (R1.6) and serial physics (R0.4), which K2 did not sample.

## For items 3 to 5 (facts only)

By S05 §05.11 rule 3 (`S05:446`), only unstarted packages move to the next wave. At the cutoff **[S1]**, **[S9]**:
- **Open PR:** EQ-6 (#206), FX-4 (#233; merged 6 min after the cutoff), R7.5 (#236).
- **Started, no open PR:** CO-4, R0.4, R1.6, FX-1, FX-2, FX-5, FX-7, ED-I18N-1, ED-INST-1, ED-LES-1, R2.6, R7.1, R7.2.
- **Unstarted:** I-HOOKS, EQ-2, EQ-3, EQ-4, EQ-5, EQ-7, EQ-9, EQ-10, EQ-11, EQ-12, EQ-14 (K2 part), FX-6, R2.1r, R2.2r, R2.3s2, R2.5, ED-ASSESS-1, R4.1, HU-2, HU-3, R7.3, R7.4.
- K2's timebox (Day 16–35) ended on 2026-11-24. At the K2 code rate the rest of K2 needs 67 working days (plan basis) or 94 (×1.49) from the cutoff; core B needs 32 or 42 **[S8]**.

## Not determined

- **The session's leads, in part.** Its list of 25 owner-requested PRs, its "core scope" list and how it got GK2 on 2027-02-03 are not recorded in the repo.
- **Owner-requested basis.** Read from PROGRESS's history rows and the PR bodies, not from the chats; #234, #209 and #196 are the closest calls.
- **#183's package.** It has no `packages.tsv` row.
- **The rest of M-PLAN-026 for K2:** KPI-33 by lane, KPI-34, machine times, re-runs and flake groups, escaped defects and reverts. KPI-31 and KPI-35 are in kpi-GK1.
- **KPI-31 for K2, as a trend** ([kpi-GK1.md](kpi-GK1.md), "KPI values on the GK1 candidate `9b224ec`"; HANDOVER-K2 §16.4, step 9): the first whole-row check of the package register, as at C: 91 of 93 rows correct by the register's own convention, 71 of 93 strictly on the column's scale; R7.5 and R7.2 wrong at C (R7.5 fixed by #241, R7.2 by the GK1 close-out records PR). A new baseline, not comparable with K1's screen (73 of 73, 0 of 73). Not yet confirmed by a second agent.
- **Lane I's rate** and the WIP-cap exceedances in K2 were not checked.
- **"Published by"** checks only that the `deploy.yml` run concluded success.
- **The ×1.49 factor** is K1's measured inflation (1.488, `K1-retro.md:232`); K2's was not measured.

## Sources

Read 2026-11-25 between about 18:33Z and 18:45Z; GitHub REST only.

- **[S1]** `gh api 'repos/ROYIN001/Orbitlab/pulls?state=all&per_page=100&sort=created&direction=desc&page=N'` for N = 1, 2, 3 (241 PRs).
- **[S2]** `gh api --paginate 'repos/ROYIN001/Orbitlab/pulls/<n>/files?per_page=100'` for #181–#236.
- **[S3]** `gh api --paginate 'repos/ROYIN001/Orbitlab/actions/workflows/<w>/runs?per_page=100&created=>=2026-10-26'` for `deploy.yml` (73 runs), `ci.yml` (191) and `heavy.yml` (10).
- **[S4]** `gh api repos/ROYIN001/Orbitlab/actions/runs/45615392290` and its jobs.
- **[S5]** `git log --first-parent --format='%H%x09%cI%x09%s' 7263004..9b224ece` (52 commits).
- **[S6]** `git show 9b224ece:docs/development/plan/data/packages.tsv`; `git diff 7263004 9b224ece -- docs/development/plan/data/packages.tsv`.
- **[S7]** the local count script over [S1]–[S5] (kinds and bases are a hand table inside it, each with its note).
- **[S8]** the local re-plan script over [S6] and [S7].
- **[S9]** `git show 9b224ece:docs/development/PROGRESS.md` (history rows and register); `git show 9b224ece:docs/development/plan/S05-structure-waves-gates.md`.
