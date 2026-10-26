# GK1 — KPI values at the close of wave K1 / ค่า KPI ปิดคลื่น K1

> **สรุปสำหรับเจ้าของ (ภาษาไทย)**
>
> - ไฟล์นี้บันทึกค่า KPI ของ K1 และสถานะของประตู GK1 บน candidate `7263004` (main หลัง #179) ซึ่ง Pages [40385448079](https://github.com/ROYIN001/Orbitlab/actions/runs/40385448079) เผยแพร่เมื่อ 2026-10-26 19:41:58Z ผ่านครบ 11 job เป็นข้อเท็จจริงและข้อเสนอเท่านั้น **ยังไม่มีการลงนามใด ๆ แทนคุณ** (การลงนาม GK1, แถว re-plan, การรับรองส่วนของแผนที่ K2 ใช้ และการอนุญาต K2 รอคุณ)
> - KPI ที่ใช้ตัดสิน GK1:
>   - KPI-13 (การอ่านโปรไฟล์ตอนเปิดแอป) **ไม่ถึงเป้า**: วัดครั้งเดียวตามคำตอบ P1 ข ได้ 50 ครั้งตอนเปิดครั้งแรก 46 ครั้งตอน reload (เป้า ≤ 2) งานที่แก้คือ R1.6 PR5 ซึ่งยังไม่ merge
>   - KPI-14 = 0 ในขอบเขต GK1 (เหลือ 2 ข้อของ FX-4 ที่ปิดที่ GK2) · KPI-15 และ 16 ผ่านเฉพาะครึ่งที่วัดได้ · KPI-22 ผ่านตาม D-64 (heavy และ fleet ใช้แทน candidate ได้) · KPI-30 = 0
>   - KPI-31 ขึ้นกับวิธีอ่าน: ทุก PR ของ K1 มีแถวหรือ fragment ของตัวเอง (73/73) แต่ไม่มีแถวไหนเขียนว่า "merged" ตอน merge ตามที่ SESSION-PROTOCOL §3 เขียน (0/73) เพราะแม่แบบ fragment ให้เขียน "In PR" ส่วน records PR หลัง Pages มาช้ากว่า 1 วันทำการ 29 ครั้ง (ทุกตัวเป็น PR ที่เผยแพร่ก่อน #170)
> - ค่าฐานใหม่ของ KPI-01, 02, 04–11 และ 13 (P1 ข): ไบต์และจำนวนเทียบกับฐานเดิมได้ ส่วนเวลาเป็นแนวโน้มเท่านั้น เพราะ browser, binary และเครื่องต่างจากฐานเดิม มีค่าเวลาที่ต่างมาก เช่น ค้างตอนเข้า Orbit 25.3 วินาที (ฐานเดิม 4.3) บันทึกเป็นความเสี่ยงให้วัดใหม่ใน K2 **ไม่ใช่ข้อสรุปว่าแอปช้าลง**
> - ประตู: รายการ GK 12 ข้อ ผ่าน 4 บางส่วน 7 ยังไม่ทำ 1 (ข้อ 12 รอคุณ) · G0 และ G1+ ไม่ผ่าน ตามที่คุณเลือก ก ในข้อ 1 · G7 ข้อ 4 (tag) ไม่ได้ทำ
> - **รอ session HU-6 ของคุณ:** KPI-32, stamp ที่เห็นบนเว็บจริง, การ reload ของ service worker เก่าบนเครื่องจริง, การดาวน์โหลด CSV บน Safari (iPad) และ Firefox (Android) ตามคำตอบ P3 และเวลาเปิดแอปบนเครื่องจริง (KPI-08) ช่องเหล่านี้เว้นไว้ ไม่มีการเดาผล
> - ท้ายไฟล์มีคำถามทั้ง 12 ข้อ (S1–S12) ที่คุณจะตอบตอนอ่านบันทึก GK1 พร้อมตัวเลือกและข้อแนะนำ ไฟล์นี้ใช้ S1–S9 และ S12 และเสนอเพิ่มเรื่อง KPI-31 ใน S8
> - Q check ทำแล้ว (2026-10-27): agent ห้าตัวที่ไม่ได้เขียนบันทึกนี้ตรวจข้อความที่ตรวจได้ 2 458 ข้อของบันทึก GK1 กับ git และ GitHub โดยตรง ยืนยันได้ 2 266 ข้อ ในจำนวนนี้มี 17 ข้อที่พบว่าผิดและแก้ในบันทึกนี้แล้ว (ผิดเล็กน้อยทั้งหมด ไม่มีข้อไหนเปลี่ยนสถานะของประตู) อีก 192 ข้อตรวจจากแหล่งต้นทางไม่ได้ เพราะมาจากการรันในเครื่องที่ไม่ได้ commit หรือเป็นการตัดสินของ agent รายละเอียดอยู่ในหัวข้อ Gates

```yaml
envelope: v2
package: GK1 record (R7.2 M-PLAN-026 for K1; integration session)
wave: K1 (records slot)
lane: I
change_kind: docs
owner_authorization:
  - {date: 2026-10-24, quote: "ก: ทำข้อ GK แล้วรัน GK1 (แนะนำ)", where: "DECISIONS.md:344 (readiness report decision 1)"}
  - {date: 2026-10-26, quote: "ก อนุญาตเพื่อใช้ที่ GK1 (แนะนำ)", where: "DECISIONS.md:354 (readiness report decision 3: M-PLAN-026)"}
  - {date: 2026-10-26, quote: "ข วัดครั้งเดียวบน candidate", where: "DECISIONS.md:365 at 5092ac9 (P1: the KPI baselines, measured once)"}
candidate_sha: 72630046fc5eb56f1797e5363b6f9ad293ff9d38   # main after #179; published by Pages 40385448079
base_sha_verified_on: {sha: 7263004, date: 2026-10-26, check: "git ls-remote origin refs/heads/main = 72630046… at 22:32:50Z"}
signed: none   # GK1 sign-off, the re-plan, K2's plan sections and K2 (D-65) wait for the owner
```

**How to read this file.**
- `PROGRESS:n`, `DECISIONS.md:n` and other `file:n` are the files at the candidate `7263004`, unless marked `@5092ac9` (#181's commit, which records the #179 Merge Desk and the answers P1–P5).
- Plan drafts are cited by section at `c2af8ae` (`docs/development/plan-v2-draft/sections/` on the plan branch), not by line.
- **Comparable** and **trend-only** follow the baseline measurement exactly: bytes and counts compare with the plan's baseline; times do not (see "New baselines").
- **Waits for the owner's HU-6 session** marks a slot only the owner's report fills.
- **Local run, not committed** marks evidence from a build or script run in the integration session; its numbers are here, its files are not in the repo.
- Definitions are draft S04 §04.2. The GK1 decision KPIs are 13, 14, 15, 16, 22, 30 and 31; the trend set is new baselines of 01–13 and 33–35 (draft S04 §04.5, GK1 row). §04.5 asks for all 35 values here.

## Candidate

- **SHA `7263004`** (`72630046fc5eb56f1797e5363b6f9ad293ff9d38`): #179 (Budgets, card `q03-1` B) merged at 2026-10-26T19:17:43Z on the owner's Merge Desk answer "merge #179 (แนะนำ)" (`DECISIONS.md:364` @5092ac9). It sits on `46728e5` (#180, records) and `a05ae70` (#177, FX-2 step 2b).
- **PR CI:** [40371529487](https://github.com/ROYIN001/Orbitlab/actions/runs/40371529487) (run 846) on #179's head `18973db`: success, 9 of 9 jobs. `git diff 18973db 7263004` changes only #180's six Markdown files, which CI's path filter skips.
- **Pages:** [40385448079](https://github.com/ROYIN001/Orbitlab/actions/runs/40385448079) (push, run 195): all 11 jobs `success`; the `plan` job did not skip; the tip guard passed; `actions/deploy-pages` finished at **19:41:58Z**. Merged → published: 24 min 15 s.
- **Deployment record:** the publish job 121804381081's `actions/deploy-pages@v4` log says "Created deployment for 72630046fc5eb56f1797e5363b6f9ad293ff9d38" (19:41:16Z) and "Reported success!" (19:41:58Z). The numeric deployment id and its status list were not read: no GitHub tool this record was allowed to use reads deployments.
- **Union** (verify job 121804252720): unit 10 521/10 521, browser 37/37, 0 missing, 0 non-passing; `distSha256` `e4f37fce…b72f`.
- **A second build of the same SHA.** The daily refresh, Pages [40407713039](https://github.com/ROYIN001/Orbitlab/actions/runs/40407713039) (schedule, run 196, created 21:50:34Z), built `7263004` again with refreshed data. All 11 jobs passed. Its publish job (121881371696) ran `actions/deploy-pages@v4` with success, 22:15:44–22:15:52Z. The code is the same; only `data/` differs (below, KPI-03). The live stamp stays `7263004`.
- **After the candidate:** no commit on main (`git ls-remote`, 22:32:50Z). One PR is open: #181 (records, Markdown only, opened 21:35:56Z), held until the HU-6 session ends (merge hold, see Gates item 1).
- **Earth orientation** in 40385448079's `data/` is the committed snapshot: the build log warns that IERS answered 400. Space weather and satellites were refreshed.
- **Live:** waits for the owner's HU-6 session. The agent cannot reach the Pages site (proxy refuses `royin001.github.io`). Expected About stamp: `v0.1.0 · 7263004`.

## KPI rows carried from kpi-GK0.md (same order)

| KPI | Role at GK1 | Value at GK0 | Value at GK1 (candidate `7263004`) | Source and check |
|---|---|---|---|---|
| KPI-03 precache, code vs data | Trend: new baseline. Budgets under the ceilings is GK item 4 (`S05:114`). | code 14 703.8 / 14 704 kB; data/ 1 119.2 / 1 399; total 15 823.0 / 16 103 (committed snapshots, `kpi-GK0.md:32`) | **Committed snapshots (comparable with GK0): code 14 653.8 / 14 654 kB (−50.0 kB); data/ 1 119.2 / 1 399; total 15 773.0 / 16 053 (−50.0).** Pages build (refreshed data): code 14 653.8 / 14 654; data/ 1 125.5 / 1 399; total 15 779.3 / 16 053; "bundle budget: ok". The refresh run 40407713039: data/ 1 125.6, total 15 779.4, ok. Ceilings are #179's lowered values. No compressed-size ceilings: answer P5 "ก ไม่ตั้งตอนนี้ (แนะนำ)" (`DECISIONS.md:369` @5092ac9); brotli stays report only (precache code 6 860.9 kB in 40385448079). | Pages 40385448079 job `build` (121793105792), `node scripts/bundle-budget.mjs`. Committed snapshots: `npx vite build` + `node scripts/bundle-budget.mjs` on `7263004` (local run, not committed; exit 0, manifest `0b9ffbcb4c7564`, 68 files), as GK0 did. Refresh: job 121870244226. Code equals #179's measurement on `a05ae70` (`GK1-ceilings-q03-1.md:61`). |
| KPI-14 open P0/P1 data-safety items | **Decision.** 0, except FX-4's M-ORBIT-005 and M-PLATFORM-035, which close at GK2 (draft S04 §04.5; draft S10 §10.2 items 9, 10). | **11** (`kpi-GK0.md:33`) | **2 open, 0 in GK1 scope.** K1 closed 9 of the 11: items 2–3 #97 (`PROGRESS:46`), 4 #114 (`:59`), 5 #99 and #109 (`:45`, `:52`), 6 #128 and #145 (`:71`, `:85`), 7 #110 (`:44`), 8 #98 (`:47`), 11 #108 (`:51`), 20 #122 (`:64`). Item 15 (P2, due at GK1): #97 (`:46`). Item 18 (M-LEARNING-027, P2, due at GK1) closed: 2a #176 published 15:10:22Z (Pages 40340692641) before 2b #177 merged (16:19:19Z); 2b published 16:55:51Z (Pages 40357991698). On the candidate: 2b's failing-first test `tests/assessment-revision-writer.test.ts` 1/1 ✓; old-record tests `assessment-revision.test.ts` 13/13 ✓ and `assessment-revision-edit.test.ts` 3/3 ✓. G1+ storage part: 0. | Pages 40385448079 `test (1)` 121793106010 and `test (3)` 121793106001 logs; union 10 521/10 521. Count rule: failing-first regressions, not claims (draft S10 §10.2). Not re-checked here: the failing-first test of each earlier closed item in this run. |
| KPI-22 heavy + six-DOF fleet green on the pinned source | **Decision** (K1 touched `src/physics`; `S05:113`) | heavy 257/257 ([37242073733](https://github.com/ROYIN001/Orbitlab/actions/runs/37242073733)) and fleet 164/164 ([37253259356](https://github.com/ROYIN001/Orbitlab/actions/runs/37253259356)) at `5f9aa2e` | **Pass under D-64 (decision 2, `DECISIONS.md:343`).** Heavy [40240193599](https://github.com/ROYIN001/Orbitlab/actions/runs/40240193599) at `408ad16`: success, 33/33 heavy jobs, coverage 257/257. Fleet [40144277552](https://github.com/ROYIN001/Orbitlab/actions/runs/40144277552) at `3644749`: success, 6/6 fleet jobs, coverage 164/164. Both stand for `7263004`. | D-64 (`DECISIONS.md:60`): the CO-6 list (`CO-6-physics-baseline.md:42-66`: `src/physics`, `src/data`, `tests/heavy`, `tests/sixdof-fleet`, `package-lock.json`, 12 workers, Node). List SHA-256 `60cd7caa…6310` at `408ad16`, `3644749` and `7263004`; `git diff --name-only <run sha> 7263004 -- <list>` empty for both. `heavy.yml` is the same blob at all three SHAs and pins `node-version: 22.23.3` at lines 42, 86, 115 and 145; both runs' coverage jobs printed `node: v22.23.3` (121320197160, 121033939668). This corrects the draft's "lines 42, 86, 115; Node not read". Extra, not D-64: the only changed file the heavy and fleet tests import is `src/lessons/assessment/types.ts` (#176 added an optional field to an interface and #177 changed its comment: no emitted code); no `src/replay` file changed. |
| KPI-28 PR CI time | Carried from GK0 (`kpi-GK0.md:52`). Ratchet at GK, target ≤ 12 min (draft S04 §04.3). | One point: #93's CI [37356862761](https://github.com/ROYIN001/Orbitlab/actions/runs/37356862761), 22 min 14 s | **Median 17 min 14 s, p90 24 min 25 s** (nearest rank, the 9th of 10; linear p90 24.65 min). n = 10: the newest successful `pull_request` runs of `ci.yml`, run numbers 837–846. Range 12 min 38 s – 26 min 46 s. Each ran 9 of 9 jobs. #179's run 846: 17 min 18 s. All ran after #156 (2026-10-17), so they compare with each other. None compares with GK0's one point: the smoke slice went from 20 to 16 journeys at #156. Not met: target ≤ 12 min. | GitHub `ci.yml` runs (event `pull_request`, conclusion success) and each run's job list; earliest job start to latest job end. GK0's carry "at least 3 more PR runs with the smoke slice": the #111 row gives three (36.5, 45.5 and 51.0 s, `PROGRESS:58`), and 10 full runs are above. Closed. |
| KPI-30 ceiling raises without a named offset | **Decision** | **0 in K0** (`kpi-GK0.md:36`) | **0.** K1 raised 17 values in 7 PRs; each has an owner approval row and a named offset (table "KPI-30" below). #179 raised nothing and lowered 4 values. Most named offsets have not landed: EQ-6 is K2, EQ-7 K2–K5 and EQ-8 K3 (`packages.tsv`; `PROGRESS:145-147`); `q03` B names EQ-6 and EQ-7 in K2 (`DECISIONS.md:170`). Delivered offsets: the shader text compaction (#158) and #173's CSS dedupe. | `budgets.json` `_notes` at `7263004`; `git log 06abb1f..7263004 -- budgets.json` (8 commits: the 7 raises and #179). Adopted rule: KPI-30 = 0 for raises with neither an offset nor an approval (`plan/S08-decisions-set-A.md:42`). Draft S04 §04.3 item 3 would also turn a GK's row red when an offset has not landed by then; that clause is a draft. |
| KPI-31 PROGRESS rows true at merge | **Decision** | **10 of 10** K0 PRs "carried their own row in the merging diff" (`kpi-GK0.md:37`) | **Step 1 (screen of each K1 PR's own record at merge):** 85 K1 PRs into main (#95–#180, less #167): 12 records PRs and 73 others. **73 of 73** carried their own record in the merging diff: 17 as a PROGRESS row (#95, #97–#112) and 56 as a `changes/` fragment (#113 on). The state each wrote at merge: "In PR; not merged…" 71, "Committed locally; no PR" 1 (#109), "In branch; not merged" 1 (#153). **0 of 73** said "merged, waiting for publish", which `SESSION-PROTOCOL.md:50` (§3 step 1) and `S18:136` ask; the fragment template in `changes/README.md` asks for "In PR; not merged; not published". So by GK0's method the value is 73 of 73; by the adopted wording it is 0 of 73. Not checked: whether the rest of each row (text, CI run) was true. Later corrections of K1 records: #116, #143, #174 (the records the GK1 readiness report found untrue), #180 (one wording in #178's row). Four rows cited a later Pages run than the one that first published the PR: `PROGRESS:36` (#91), `:54` (#95), `:34` (#100), `:49` (#101); this PR corrects them, and the CO-5 register row (`:126`) with them. The 5 owner commits pushed to main on 2026-10-15 had no PR and no CI; #154 fixed them (`PROGRESS:228`). **Step 2 (records PR within one working day of Pages, `S18:137`):** 70 K1 PRs published; on time for **40**, later for **29** (all 29 published before #170; their folds came in #142, #161 and #170); #177 → #180 on time (1 h 8 min); **#179 waiting**, due 2026-10-27T19:41:58Z, carried by #181 (open). | Step 1: `git log --first-parent 06abb1f..7263004`, each commit's `diff-tree` and the PROGRESS row or fragment it added (local script, not committed). Step 2: M-PLAN-026 PR table at the freeze cutoff (local run, not committed). See owner question S8 (proposed addition). |
| KPI-33 throughput and lead time | Trend (execution) | **10 PRs** (#84–#93); median **12.8 h** open → merge (`kpi-GK0.md:38`; its per-PR list gives 12.6 h) | **85 K1 PRs** (#95–#180 less #167), open → merged **median 0.757 h (45 min)**, mean 7.87 h, max 181.19 h (#147). Plan-package PRs n = 45, median 1.343 h. Records n = 12, median 0.006 h. Merged → published (K1, n = 70): median 2.37 h. Throughput **3.46 plan PRs per working day** (45 in 13 working days); mean WIP 1.329 (plan 1.043). K0 recomputed by the same script: 12.606 h. | Cutoff 2026-10-26T19:42:02Z, the end of Pages 40385448079. M-PLAN-026 re-run at that cutoff (local run, not committed); every step exit 0, "unmapped PRs []". S04 defines ready → merged; no ready time is recorded, so opened → merged stands in. Re-estimate and gate Days: [K1-retro.md](K1-retro.md). |
| KPI-35 owner decision latency | Trend (execution) | **All 80** set A/B/C items answered 2026-10-05; Merge Desk 0–2 h (`kpi-GK0.md:39`) | **61 asked in K1, 61 decided, 0 later than their needed-by wave.** By kind: card 29, chat 24, form 4, doc 4. Asked → decided with both times exact: n = 11, median 5.84 h (max 27.1 h). Asked time only bounded: n = 50, upper-bound median 23.08 h. Merge Desk clicks: 22, median opened → click 3.9 h. Follow-through checks: 54 of 61 rows have one; **97 pass, 3 fail, all 3 true**: `claude/t-fx8-s2` (`071db68`) and `claude/t-fx8-picture-moment-s1` (`0ac5ca4`) are still on origin although `q01` was cancelled (rows `q01` ×2 and decision 5; `git ls-remote`, 22:32Z). Hand-off checks: 53 pass, 0 fail, over the hand-off set as it stood at #176. | M-PLAN-026 re-run (local, not committed); the question set brought to the cutoff (Merge Desk for #175–#177 and #179, P1–P5 added from the session's question and answer times). DECISIONS rows hold no time asked, so most hours are bounds. At sign-off: re-run with the GK1 time and add any question asked after 19:42:02Z. |

## KPI rows the plan adds at GK1

| KPI | Role at GK1 | Value at GK0 | Value at GK1 | Source and check |
|---|---|---|---|---|
| KPI-13 profile reads at start | **Decision**; also G1+ (`S05:142`) | Not in kpi-GK0. Baseline PB@`5f9aa2e`: 49 reads at first visit, 46 at reload | **Measured once (P1): first visit 50 reads, 2 writes; reload 46 reads, 1 write. 1.5 MB profile: 46 reads, 69.01 MB read, 250.1 ms in big parse and stringify calls. Target (≤ 2 reads, < 30 ms) not met.** Reads, writes and MB are comparable (first visit +1; reload unchanged); ms is trend-only (PB 367.1 ms). The change that reaches the target is R1.6 PR5 (M-PLATFORM-007), not merged (`PROGRESS:157`). "Stored bytes unchanged" was not measured (needs M-PLATFORM-007's harness). | The plan branch's `measure.mjs` (`c2af8ae`, blob `8dd69696`), unmodified, 3 runs on a `7263004` build (local run, not committed; `measure.mjs` is not on main: M-PLATFORM-041). Owner answer P1 (`DECISIONS.md:365` @5092ac9). |
| KPI-15 unrecovered context loss | **Decision** | Not in kpi-GK0. Baseline: no `webglcontextlost` handler | **Partial. Journey half: pass,** `✓ fx8-context-loss (159.5 s)` in browser shard 2. Before #154 fixed the test, it failed 8 Pages runs on main, and 2 more failed a shard and were cancelled ([K1-retro.md](K1-retro.md), "Re-runs and flake groups"; `PROGRESS:156`). `HANDOVER-K1.md:189` counts 6 of 14 as of the hand-over (2026-10-08). Memory half not measured (the memory journey M-PLAN-003, R0.4). | Pages 40385448079 `browser (2)` 121793499914. |
| KPI-16 unconverged rating shown or stored | **Decision** | Not in kpi-GK0. Baseline: possible (8 000 ms budget) | **Partial. Unit half: pass.** `tests/build-ratings-unfinished.test.ts:22` forces `timeBudgetMs: 10` (FX-1 PR1, #99): 5/5 ✓ in unit shard 3; `tests/design-ratings.test.ts:104` ✓ in shard 1; union 0 non-passing. Journey half: M-BUILD-024 (R0.4 step 12) not merged; FX-1 merged without it (`PROGRESS:232`). | `git grep -n timeBudgetMs 7263004 -- tests` (3 lines, also `build-catalogue-matrix.test.ts:25`); Pages 40385448079 `test (1)`, `test (3)`. The per-file line is from the shard logs; the `union.json` artifact was not downloaded. |
| KPI-34 hotspot conflicts and rework | Trend (execution) | Not in kpi-GK0. K0 by the same script: 8 PRs resolved a hotspot conflict | **Refreshed to the freeze cutoff: K1 #95–#180, 86 merged (85 into main). Strict 26: 20 PRs resolved a hotspot conflict (#95–#114, all merged 2026-10-06) plus 6 fixes of an earlier K1 PR (#133, #145, #151, #152, #154, #160). Broad 32: plus 2 owner direction changes (#153, #162) and 4 records corrections (#116, #143, #174, #180).** No PR opened after #115 had a hotspot conflict. The 3 code conflicts all came from stacked PRs (#103, #109, #159). No revert commits. New since the draft: #180 classified as a records correction (its body states one fix of #178's row); #176, #177 and #179 are planned steps and #178 a fold, so they do not count. | GitHub REST GETs only, by the M-PLAN-026 KPI-34 scripts: cache refreshed after dropping the stale #175 and #176 entries; PR heads from the freeze re-run; analysis at cutoff 19:42:02Z with split 2026-10-06T18:54:23Z (local run, not committed). The five new rework rows were classified by one agent; the Q check confirmed their facts, not the classification. |

## New baselines of KPI-01 to KPI-12 (`S04` §04.5: "new baselines on main of 01–13")

Owner answer P1: "ข วัดครั้งเดียวบน candidate" (`DECISIONS.md:365` @5092ac9). Measured once: the plan branch's `measure.mjs` (`c2af8ae`), 3 runs, on a `7263004` build with committed data snapshots, 2026-10-26 19:41:37–19:54:17Z, with no other browser or build process running (local run, not committed). Values are the median (min–max) of 3 runs. The baseline is PB@`5f9aa2e` (the plan's `perf-baseline/results/baseline-5f9aa2e.md` at `c2af8ae`, same script, 3 runs). GK0 has no row for these KPIs.

**What compares.** Bytes and counts compare with PB. Times are **trend-only**: the browser version (Chromium 153 here, 141 in PB), the binary (chrome-headless-shell here, the full `chrome` binary in PB) and the host (Xeon 2.80 GHz here, 2.10 GHz in PB) all differ. No time here says the code is faster or slower. A later run compares with these times only on the same host and binary.

| KPI | Candidate `7263004` | PB@`5f9aa2e` | Comparable? |
|---|---|---|---|
| KPI-01 bytes to interactive | 9 742.6 kB raw, 20 requests (all 3 runs equal). Without the lazy Home cards: **9 437.7 kB** | 9 548 kB, 18 requests. Without the cards: 9 456.1 kB | **Comparable without the lazy Home cards: −18.4 kB.** The total depends on the binary: chrome-headless-shell fetched 5 card images before interactive, full Chrome 153 fetched 2 (one cold load of the same build: 9 529.6 kB), as PB did. A baseline from this run must name its binary. |
| KPI-02 precache bytes downloaded twice | **0 kB** of 6 362.5 kB after interactive | 9 438.5 of 15 834.2 kB | **Comparable** (same server and rule). EQ-1 (#130) is the change. Not checked with Pages-style headers (no such server: M-PLAN-002). |
| KPI-04 shader programs at start | **55 programs, 0 duplicates**; shader wait 3 791 ms | 56, 0; wait 13 719.4 ms | Programs **comparable** (target ≤ 56 met). Wait **trend-only**. |
| KPI-05 duplicate programs at Launch entry / launch | **16 of 20 / 20 of 20** | 18 of 19 / 19 of 19 | **Comparable.** Target 0 / 0 not met (EQ-2 did not run in K1). |
| KPI-06 longest frame gap at liftoff | gap 4 583.1 ms (4 416.5–5 116.5); **20** programs created in the window | 2 433.3 ms; 19 programs | Gap **trend-only**; programs **comparable**. Target < 500 ms and 0 programs not met. Liftoff fell after the measured window on this run. |
| KPI-07 WebGL contexts before Orbit; freeze entering Orbit | **2 contexts**; freeze 25 332.3 ms (22 499.1–25 399) | 2 contexts; freeze 4 266.4 ms | Contexts **comparable** (target 1 not met: EQ-4, R3.0). Freeze **trend-only**. |
| KPI-08 time to interactive, cold / warm | 7 763.2 / 12 067.9 ms | 16 309 / 6 471.9 ms | **Trend-only.** Warm was slower than cold here; in PB warm was faster. S04 asks ≥ 5 runs, Pages-style headers and device rows: 3 runs, plain server, device rows wait for the owner's HU-6 session. |
| KPI-09 frames drawn while Orbit is paused | 12.54 frames/s; **8 draws per frame**; only `.pg-canvas` drew | 13.75 frames/s; 8 draws per frame | Draws per frame and "still draws while paused": **comparable**. Frames/s **trend-only**. Target 0 not met (EQ-4 not started). |
| KPI-10 rAF in flight; rAF on Home; draws while covered | flight 1× p95 23.6 ms; Home median 13.1 ms. **Hard part: 0 draws while covered: pass** | 13.9 ms; 6.7 ms | rAF **trend-only**; the "flight 1×" window was the pad countdown here, not flight. Hard part: `gesture-ownership` asserts it (`tests/browser/journeys/gesture-ownership.mjs:136`) and passed in Pages 40385448079 `browser (3)`, 20.9 s. |
| KPI-11 physics work and warp | 100×: 5.56 sim s per wall s, worker CPU 683 ms/s; 1×: 0.41 | 100×: 7.28, worker CPU 792.5 ms/s; 1×: 1.01 | **Trend-only.** The 1× window was the countdown at about 1.2 frames/s, and the main thread asks the worker for at most 0.5 s of wall time per frame (`src/main.ts:2099`). `src/physics` changed in 11 files since `5f9aa2e`. Deriv counts and the worker profile not measured (M-PHYSICS-003 not merged). |
| KPI-12 hidden graphs still drawn | Not re-measured; expected unchanged | 3–7 graphs (S04) | The counter is CO-4 step 10 (M-LAUNCH-022), moved to K2 by card `q05` B (`PROGRESS:125`). Not a `measure.mjs` value. |

KPI-03 is in the first table; KPI-13 in the second.

### Large trend changes: risks to re-measure in K2, not verdicts

These times moved far from PB. Each could come from the browser version, the binary, the host or K1's code (`git diff --shortstat 5f9aa2e 7263004 -- src/render src/orbit src/ui/orbit`: 21 files, +2 370/−996). One run cannot separate them.
- **KPI-07, Orbit-entry freeze: 25.3 s against 4.3 s.** One long task in every run. In 2 of 3 runs nearly all of it was shader compile (24.3 and 24.8 s); in run 3 shader wait was 2.25 s and the cause of the other 20 s was not identified.
- **KPI-06, liftoff frame gap: 4.6 s against 2.4 s.** The `launch_mission` call took 5.8 s (PB 2.4 s) while it compiled 20 programs.
- **KPI-11, warp 100×: 5.56 against 7.28 sim s per wall s**, with less worker CPU per second (683 against 792.5 ms/s).
- **KPI-08: warm start 12.1 s, slower than cold 7.8 s** (PB: warm faster). Warm DOMContentLoaded 5.9 s (PB 1.0 s). S04 says warm must not be slower than cold on devices: a device check, not a finding.
- **KPI-10: Home rAF median 13.1 ms against 6.7 ms**, wide spread (8.2–15.5).

Proposed for K2 (needs M-PLATFORM-041 on main): measure `5f9aa2e` and the current main on one host with one binary (full Chrome, `--chromium`), at least 5 runs each, with `measure.mjs --compare`. Then decide whether any change is the code's.

## The other KPIs (S04 §04.5 asks for all 35)

| KPI | Gate type | Value at GK0 | Value at GK1 | Source and check |
|---|---|---|---|---|
| KPI-17 to KPI-20 (G4 realism) | Hard at G4; KPI-17 reported every GK | Not in kpi-GK0 | **Not re-counted. R4 has no merged PR** (`PROGRESS:170`). Owner answer P1 chose (ข), the `measure.mjs` baselines; option (ค), counting KPI-18/19 from tests, was not chosen. R4.1's branch `claude/pd-r41-s1` is still at `e777aae` with no PR; owner answer P4 (ก) keeps it after GK1 (`DECISIONS.md:368` @5092ac9). KPI-17's and KPI-20's count tests (R4.1/R4.2, M-ORBIT-043) are not built. | `git ls-remote`, 22:32Z. |
| KPI-21 unintended golden or snapshot re-records | Hard, PR + GK | Not in kpi-GK0 | **0 unintended found.** Two intended changes to pinned expectations in K1: #157 (`bb33307`, lesson 15.2's bound 1 500 m, heavy S2 and `heavy-expected.json`), approved before merge ("IMU1 ก", `DECISIONS.md:277`); #135 (`042c1a1`, pack ru-24-05-06's review hash, D5 terms only), acknowledged after merge by card `q11` A (`DECISIONS.md:179`). New references, not re-records: EO-STO-1 (#132) and EO-PHY-6 (#148). Nothing after `007b039` touches `tests/eo-sto/ref/`. | `git log 06abb1f..7263004` over the golden and fingerprint paths (#132, #148 only), over `src/lessons/review.ts tests/heavy` (#135, #157), over `scripts/audit-heavy/heavy-expected.json` (#157). Not checked: the S14 §14.6 before/after tables of #135 and #157. |
| KPI-23 unaided task success; KPI-24 time to first result | Human (HU-1) | Not measured | **Not measured.** HU-1's student session moved to November, a deviation (decision 6, `DECISIONS.md:356`; `PROGRESS:204`, `:236`). | — |
| KPI-25 input latency | Trend | Not measured | **Not measurable at GK1:** the Event Timing script (M-PLAN-004, R0.4) is not merged (`PROGRESS:132`). | — |
| KPI-26 axe serious/critical; KPI-27 Thai clipping, contrast, target size | Hard | Not measured | **Not measurable at GK1:** R2.5 is K2, not authorized (`PROGRESS:161`). | — |
| KPI-29 update prompts per code release | Hard (FX-7) | Not measured | **Not measurable at GK1:** no check counts update prompts; FX-7 steps 1–3 are K2 (`PROGRESS:155`). Related: `pwa-offline` logged "reloaded onto the new version true" in Pages 40385448079 `browser (1)`. | — |
| KPI-32 full mission without reload on devices | Human (GK device row) | Not measured | **Waits for the owner's HU-6 session** (decision 6, `DECISIONS.md:356`; gate classes low-end Android and iPad, D-56 `DECISIONS.md:51`). The HU-6 register row says none recorded (`PROGRESS:209`). Slot below. | The owner's HU-6 report only. |

### HU-6 slot (waits for the owner's HU-6 session)

Fill only from the owner's report. A cell the owner leaves empty stays "not reported". If the session does not happen, this slot says so and the gap is a variance.

| Item | Low-end Android | iPad |
|---|---|---|
| Date; build stamp seen (expected `v0.1.0 · 7263004`) | waits for the owner's HU-6 session | waits for the owner's HU-6 session |
| Device class; browser and version; network; language | waits for the owner's HU-6 session | waits for the owner's HU-6 session |
| KPI-32: one full Soyuz or Falcon mission without a reload (pass/fail) | waits for the owner's HU-6 session | waits for the owner's HU-6 session |
| Old service worker: new version offered as a reload, new stamp after (G7 item 2) | waits for the owner's HU-6 session | waits for the owner's HU-6 session |
| Task 12, Monte Carlo CSV download (answer P3, `DECISIONS.md:367` @5092ac9): Firefox on Android, Safari on iPad | waits for the owner's HU-6 session | waits for the owner's HU-6 session |
| KPI-08 device rows (cold and warm start) | waits for the owner's HU-6 session | waits for the owner's HU-6 session |

Android peak memory during the offline install (hand-off K1-10) stays open by answer P3.

## KPI-30: the 17 raises of K1, and #179's lowering

Ceilings from `budgets.json` history (`06abb1f`→`7263004`). Named offsets from `budgets.json` `_notes.set`. Sizes in kB.

| PR | Commit | Change | Approved by | Named offset |
|---|---|---|---|---|
| #104 | `cc0ad7d` | `index-*.js` 2622→2632; `i18n-*.js` 1720→1725; precache code 14704→14714; precache 16103→16113 | `DECISIONS.md:144` (D-38 K1 allowance) | EQ-7 (index, code); EQ-6 (i18n); the total follows code |
| #111 | `03d7353` | other chunks 765→771; precache code 14714→14721; precache 16113→16120 | `DECISIONS.md:153` | other chunks EQ-8; code EQ-7 and EQ-8 |
| #117 | `bdbfeff` | precache code 14721→14724; precache 16120→16123 | `DECISIONS.md:156` | EQ-7 |
| #128 | `4de951f` | `index-*.js` 2632→2634 | `DECISIONS.md:158` | EQ-7 |
| #137 | `04a1188` | `index-*.js` 2634→2636; `i18n-*.js` 1725→1727 | `DECISIONS.md:160` | EQ-7, EQ-6 |
| #146 | `7cd2155` | `index-*.js` 2636→2638; `i18n-*.js` 1727→1729; `index-*.css` 177→178; other chunks 771→772 | `DECISIONS.md:170` (card `q03` B) | index EQ-7; i18n EQ-6; other chunks EQ-7; CSS the CO-4 dedupe (landed in #173) |
| #154 | `a667cf4` | `index-*.js` 2638→2645 | `DECISIONS.md:206` | EQ-7; the shader text compaction (landed in #158) |
| **#179** | `7263004` | **lowers** `index-*.js` 2645→2635; `index-*.css` 178→177; precache code 14724→14654; precache 16123→16053. `i18n-*.js` 1729 and other chunks 772 stay: already the measured size rounded up | `DECISIONS.md:171` (card `q03-1` B); Merge Desk `DECISIONS.md:364` @5092ac9 | — |

4 + 3 + 2 + 1 + 2 + 4 + 1 = 17 raised values. Each has an approval row and a named offset. `index-*.js` was raised five times with EQ-7 named each time; EQ-7 has not landed.

## D-38: the K1 allowance used

`DECISIONS.md:144`: "GK1 reports the amount used and the ceilings ratchet back". #179 is the ratchet, in one PR (card `q03-1` B, `DECISIONS.md:171`). Sizes in kB, from Pages 40385448079's `build` job.

| Group | GK0 ceiling | Highest ceiling in K1 | K1 raise (approvals) | Highest size in K1 | Size on `7263004` | Used of the allowance | Ceiling at `7263004` | Room left |
|---|---|---|---|---|---|---|---|---|
| `index-*.js` | 2 622 | 2 645 | +23 (`:144` +10, `:158` +2, `:160` +2, `:170` +2, `:206` +7) | 2 644.6 at #154 (2 649.0, over the ceiling, at `6b9d560`) | 2 634.8 | 12.8 | **2 635** | 0.2 |
| `i18n-*.js` | 1 720 | 1 729 | +9 (`:144` +5, `:160` +2, `:170` +2) | 1 729.0 | 1 729.0 | 9.0 | **1 729** | 0.0 |
| other chunks | 765 | 772 | +7 (`:153` +6, `:170` +1) | at least 771.4 | 771.4 | 6.4 | **772** | 0.6 |
| `index-*.css` | 177 | 178 | +1 (`:170`) | 177.0 | 176.9 | 0 | **177** | 0.1 |
| precache code | 14 704 | 14 724 | +20 (`:144` +10, `:153` +7, `:156` +3) | 14 723.3 at `23ede7f` | 14 653.8 | 0 | **14 654** | 0.2 |
| precache (total) | 16 103 | 16 123 | +20 (follows code) | — | 15 779.3 (data/ 1 125.5, refreshed) | — | **16 053** | 273.7 |

- "Used" = size on the candidate − GK0 ceiling, where positive. It depends on owner question S9 (do #153, #155, #157, #162 and #176 count against `q03` B?).
- "Highest" values come from the GK1 readiness report's ceilings table (`DECISIONS.md:344` names the report) and `budgets.json` history.
- Other chunks: #176 took them from 770.8 to 771.4 kB, above the 771 ceiling that stood before `q03` B, and its body gave no measured size, which `q03` B asks of every PR (`DECISIONS.md:170`). That is why the ceiling stays 772.
- Very little room is left: 0.2 kB on `index-*.js` and precache code, 0.0 on `i18n-*.js`. Any PR that grows them needs an offset or an owner raise (risk 13).
- The teaching-tools build (decision 7's run, local, not committed) is over two ceilings: `index-*.js` 2 635.5 / 2 635 (+0.5) and precache code 14 654.6 / 14 654 (+0.6). That build is never published, so it gates nothing now. Showing the teaching tools again needs about +1 kB on those two ceilings or an offset (owner question S4).

## Platform tracking numbers (draft S04 §04.5; not KPIs, not a gate)

| Number | Plan baseline (S04) | At GK1 | Source |
|---|---|---|---|
| 12 worker bundles, raw total | 4 090 kB (PB) | 4 044.1 kB; a different tool, not compared | Pages 40385448079 `build` |
| `index` / `i18n` raw | 2 620.2 / 1 718.2 kB (`5f9aa2e`) | 2 634.8 / 1 729.0 kB | same |
| `initial load` group (report only, not KPI-01) | — | 5 076.7 kB raw / 1 426.6 gzip / 1 122.4 brotli, 7 files; textures 3 789.4 kB | same |
| Journeys in the Pages run | 24 on `5f9aa2e` | 37 run and passed (13 / 12 / 12); 6 held | Pages 40385448079 browser jobs and union |
| Pages wall time | 18–22 min | 32 runs in K1: median 32.8 min, p90 36.5 (success, ≥ 5 min). The candidate's run: 24 min 12 s to publish | Pages run list; M-PLAN-026 machine-time table (local run, not committed) |
| PR CI wall time (`ci.yml`, success) | — | 64 runs: median 17.6 min, p90 21.6 | same |
| Heavy / fleet wall time | 25–61 min / about 2 h 40 min | one run each: heavy 40240193599 44 min 11 s; fleet 40144277552 1 h 0 min 15 s | run created → updated |
| Open PRs / stale PRs | ≤ 5 open, 0 stale | 1 open (#181, records), read 22:32Z | GitHub PR list |
| Repository size | `.git` 37 MB (M-PLATFORM-043) | GitHub `size` 43 193 kB (read about 23:45Z); a different method, not compared | GitHub repository search (`search_repositories`, `repo:ROYIN001/Orbitlab`) |
| Owner hours per package; CHANGELOG lines per PR | not recorded | not recorded; not counted | — |

## Gates

States on the candidate `7263004`: **pass** · **partial** · **not done** · **not passed**. Rules: `S05:110-122` (GK checklist), `S05:135-142` (G0, G1+), `S05:191-195` (G7). Who signs: I prepares, Q checks the list, the owner approves publication and the re-plan (`S05:94`). Nothing below is signed.

### GK checklist (12 items)

| # | Item (`S05`) | State | Evidence on the candidate | Gap, and where it goes |
|---|---|---|---|---|
| 1 | One candidate SHA; all evidence cites it (`:111`) | **pass** (holds while main is `7263004`) | `7263004`; Pages 40385448079; D-64 check; the held-journeys run, the baselines and the revert drill all built `7263004` (local runs). No commit on main after it (22:32:50Z). The merge hold keeps #181 and this PR unmerged until the HU-6 session ends. | HU-6 must cite the same stamp. A merge before then moves the live stamp. |
| 2 | PR CI passes; every journey in Pages mode passes on the candidate (`:112`) | **partial** | CI 40371529487 success 9/9 on `18973db`, which differs from `7263004` only in #180's six Markdown files. Pages 40385448079: 37/37 journeys, unit 10 521/10 521. | The six journeys held with the teaching tools since #156 are not in the Pages pass. Decision 7 (ก) accepts this as a GK1 limitation (`DECISIONS.md:357`; `PROGRESS:237`). Its run on a teaching-tools build of `7263004` (local, not committed): **6 of 6 passed**; four more journeys that skip teacher steps while held also passed whole, 4 of 4. That build fails the budget by +0.5 kB (index) and +0.6 kB (precache code). Teaching tools in K2: owner question S4. |
| 3 | Heavy + fleet green on the candidate when physics, recorder data or workers changed (`:113`; KPI-22) | **pass** (D-64 reuse) | Heavy 40240193599 (257/257) and fleet 40144277552 (164/164) stand for `7263004` (KPI-22 row). | Holds only while no D-64 path changes. `pd-r41-s1` touches D-64 paths: after GK1 (P4). |
| 4 | `budgets.json` under its ceilings; every raise has a named offset (`:114`; KPI-30, D-38) | **pass** | "bundle budget: ok" under #179's lowered ceilings in Pages 40385448079 and 40407713039; KPI-30 = 0. | Most named offsets have not landed: EQ-6 (K2), EQ-7 (K2–K5) and EQ-8 (K3) (`packages.tsv`; `q03` B names EQ-6 and EQ-7 in K2). |
| 5 | KPI rows compared with the previous GK (`:115`) | **partial** | This file: every GK0 row carried and compared; the GK1 decision KPIs and the trend set written. | KPI-13 measured only with an uncommitted script (P1) and not at target; KPI-15 and 16 half measured; KPI-31 depends on the reading; KPI-32 waits for the owner's HU-6 session. The PROGRESS GK1 row is in this PR. |
| 6 | Pages from the exact source with a deployment record; merged ≠ published ≠ live (`:116`) | **partial** | Published: `deploy-pages` "Created deployment for 72630046…" and "Reported success!" (19:41:58Z, publish job 121804381081); the tip guard passed. A refresh rebuilt the same SHA (Pages 40407713039, `deploy-pages` success 22:15:52Z). The numeric deployment ids were not read. | **Live** needs the About stamp: waits for the owner's HU-6 session. |
| 7 | Every package's PROGRESS row true (`:117`; KPI-31) | **partial** | KPI-31 row: step 1 screen 73/73 carried a record, 0/73 said "merged"; step 2 on time 40, late 29 (all before #170). | #179's fold is due 2026-10-27T19:41:58Z (#181). The four rows that cited a later Pages run (`PROGRESS:34`, `:36`, `:49`, `:54`) and the CO-5 register row (`:126`) are corrected in this PR. Template fix: "Carried into K2". |
| 8 | R7.1 cross-system journey on the candidate (`:118`; M-PLAN-025) | **pass** | `✓ r7-cross-system (443.5 s)`, Pages 40385448079 `browser (1)`. [R7.1-GK1.md](R7.1-GK1.md) gets the candidate's run and matrix in this PR. | Its step 6 results check and step 7 worksheet DOCX are held with the teaching tools; the journey has no code for them yet (`R7.1-GK1.md:70`). The HU-6 link waits for the owner's HU-6 session. |
| 9 | R7.2 retrospective and re-estimate (`:119`; M-PLAN-026, KPI-33) | **partial** | [K1-retro.md](K1-retro.md), re-run at the freeze cutoff; KPI-33 above. Authorized for GK1 by decision 3 (`DECISIONS.md:354`). | The Q check re-derived the numbers from primary sources (below); what rests on the local M-PLAN-026 inputs could not be checked. The re-plan row is a proposal: owner question S3. |
| 10 | Every package's hand-off and out-of-scope list has an owner and was re-checked (`:120`) | **partial** | [GK1-handoffs.md](GK1-handoffs.md): every K0 and K1 package re-checked; hand-off machine checks 53 pass, 0 fail over the set at #176. | Items without an owner have a proposed lane, not an assignment: owner question S7. GK0 had no hand-off item (`kpi-GK0.md:46`). |
| 11 | Follow-through of every decision row (`:121`; S08 §08.6) | **partial** | [GK1-followthrough.md](GK1-followthrough.md); machine checks 97 pass, 3 fail, all 3 true (the two `q01` branches on origin). | Deviated rows: 2 (`q11` A (d); `q03` B's size statements, #176), each with an owner and a wave. Deleting the two branches is the owner's action (owner question S12). Rows without a re-runnable check are "not provable". **Scope gap:** the table covers K1's 119 rows; D-1…D-28, the 2026-10-05 sheets and the seven historical cases of draft S08 §08.6 item 3 had a quick check only. Proposed: lane I runs the full check in K2, no later than the GK2 record ("Carried into K2"; a variance for GK1, owner question S8). |
| 12 | The owner adopts the v2.0 sections the next wave uses, before it is authorized (`:122`; D-65) | **not done** | — | Owner questions S1 and the list "For the owner: K2's plan sections" below. K2 is not authorized. |

Count: pass 4 (items 1, 3, 4, 8), partial 7 (2, 5, 6, 7, 9, 10, 11), not done 1 (12).

**Q check** (`S05:94`: Q checks the list before the owner approves; draft S08 §08.6 item 2 for the follow-through): **done, 2026-10-27.** Result: Q check: confirmed 2 266 of 2 458 (2026-10-27). 17 of the 2 266 were refuted first, re-verified and corrected in this PR; 192 claims could not be checked from primary sources. None of the 17 changed a state in the tables above, and nothing is signed.

Method: five independent checkers, agent sessions that did not write the record, one per part. Each listed every checkable claim in its part (numbers, counts, ids, SHAs, times, statuses, verdicts, owner quotes, `file:line` citations) and checked it against primary sources only: git at `7263004`, `5092ac9`, `c2af8ae` and earlier commits, read-only GitHub (PRs, runs, jobs, job logs) and the repository's own files. The local evidence folder was used only for raw logs and outputs, never for a write-up. The checkers re-derived the numbers with their own scripts, not the M-PLAN-026 scripts. Sampling, as each reported: every claim in the tables of KPIs, gates and statuses and every owner quote, in all parts; the rest in full for the follow-through, the hand-offs, the held journeys, the revert drill and R7.1; nearly in full for K1-retro (about 10 prose claims left out and not counted); and for this file's prose sections a judgement sample of 26 claims, at least two per section. HU-6 slots are not counted.

| Part | Claims | Confirmed (corrected after the check) | Not checkable from primary sources |
|---|---|---|---|
| This file | 504 | 464 (4) | 40 |
| [K1-retro.md](K1-retro.md) | 435 | 394 (3) | 41 |
| [GK1-followthrough.md](GK1-followthrough.md) and DECISIONS "Follow-through at GK1" | 703 | 676 (3) | 27 |
| [GK1-handoffs.md](GK1-handoffs.md) and this PR's PROGRESS changes | 409 | 352 (4) | 57 |
| [GK1-held-journeys.md](GK1-held-journeys.md), [revert-drill-GK1.md](revert-drill-GK1.md) and this PR's [R7.1-GK1.md](R7.1-GK1.md) changes | 407 | 380 (3) | 27 |
| **Total** | **2 458** | **2 266 (17)** | **192** |

Not checkable means the claim rests on the uncommitted local runs (the M-PLAN-026 package map, calendar, KPI-35 question set and Merge Desk data; the held-journey, baseline, budget and revert-drill runs), on another file of this same PR, or on a judgement (rework classification, interpretations, absence claims).

Corrected after the Q check (each refutation re-verified against the same sources before the fix):
- This file: KPI-22, `types.ts`'s optional field was added by #176, and #177 changed only its comment. KPI-30, the shader text compaction is #158 only (#155 is the Argon4 review). KPI-30 and GK item 4, EQ-7 is K2–K5, not within K2–K3 (`packages.tsv`; also hand-off K0-04). The Thai summary's list of owner questions used (S5, S6, S7 and S12 were missing).
- K1-retro: #146 is a budget PR by the file's own rule (`PROGRESS:87`), so Budget 6 and owner-requested 16, with the KPI-33 owner-requested row recomputed. K0's change 4 is at `K0-retro.md:77-79`, not `:76-78`. On 2026-10-26 two code PRs were open together (#175 and #176, 9.1 h, different lanes), not one.
- Follow-through: A4's `scene-floor.mjs` is +121 −1. F5's quote is now verbatim (`K1-retro.md:648`). The Scope's range is `:138–367`.
- Hand-offs and PROGRESS: Pages 37469527345 and 37411480482 are dated by their `deploy-pages` step (13:38:27Z and 04:22:40Z), as the other corrected rows are. K1-80, `TEACHER_TOOLS` is also imported at `r7-cross-system.mjs:53`. #115 changes Markdown only and moves to the docs-only list. The review's eight questions are at `ARGON4-REVIEW.md:75-84`.
- Held journeys and R7.1: the same `TEACHER_TOOLS` import. `profile-session-safety`'s log line is printed with the switch off too (`:140`), so the evidence is the pass itself (`visit()` waits for `.author` and `.ws-page`, `:120-124`). R7.1's Thai summary: the journey file is unchanged since #175 (`8973e84`); it did not exist at `3644749`.

### G0 closure (`S05:135-139`; signer: the owner through D-59, `S05:96`)

**Not passed**, as decision 1 (ก) records (`DECISIONS.md:344`). Nothing that G0 checks changed between `a05ae70` and `7263004` (#179 changed `budgets.json` only; #180 Markdown only).

| Criterion | State | Evidence | Gap → where it goes |
|---|---|---|---|
| ADR table (R0.2r) (`:136`) | pass by file, with gaps | #119 (`999c3be`): 5 ADRs and an index; the D-59 move table `DECISIONS.md:119-136` | No JSON examples per rule; open points without item ids → proposed re-plan row (S3) |
| Change-to-check map tried (R0.3r) (`:137`) | pass by file, with gaps | #120 (`0b466c1`): 33 rules, 7 trial cases, sabotage of 8 rules | No selected-set size against the full set; no D-64 tree hash in the selector → re-plan (S3) |
| S07 oracles recorded on the CO-6 base (R0.4) (`:138`) | **not passed** | 8 of 20 exist: EO-PHY-1…5 and EO-XENG-1 (before K1), EO-PHY-6 (#148), EO-STO-1 (#132). R0.4 has 2 items merged (#140, #148; `PROGRESS:132`) | 11 not built, EO-UI-4 unconfirmed; R0.4 order 1–5, 7, 8 to K2 against draft S07 §07.4 (only 9–13 may spill) → re-plan (S3), G0 re-check (S5) |
| G1, record only (`:139`) | pass | #71, #72, Pages 37103651001 | — |
| Signature (D-59) | **not signed** | — | M-PLAN-007 (the formal closure) open; S5 proposes signing at the re-check, no later than GK2 |

### G1+ (`S05:141-142`; signers: Q and a second storage reviewer, then the owner, `S05:97`)

**Not passed**, as decision 1 (ก) records.

| Criterion | State | Evidence or gap |
|---|---|---|
| Fixtures pass: two tabs, quota, newer format | no record | Tests exist (EO-STO-1's two-tab and full-disk steps, version 99 rows, `profile-session-safety`). No record that each fixture passed initialize, list, export and import with unchanged bytes. |
| Broken profile: truncated JSON, wrong type, missing key | partial | Truncated JSON covered (EO-STO-1). No test builds a profile with a wrong type or a missing key. |
| Differential harness keeps stored bytes | partial | EO-STO-1 passes (#132; `tests/eo-sto/ref/` unchanged since `007b039`). EO-STO-2 not built; R1.6 PR5 not merged. |
| Legacy readers and migration | pass | #132's legacy-reader fixtures; M-PLAN-031 (#122). |
| Every R1 contract holds (draft S10 §10.1) | no record | The contract table has not been run as a whole. |
| KPI-13 meets S04 (≤ 2 reads, < 30 ms) | **not met** | Measured once (P1): 50 / 46 reads; 250.1 ms (trend-only) for a 1.5 MB profile. Needs R1.6 PR5 (M-PLATFORM-007). |
| KPI-14 storage part = 0 | pass | KPI-14 row. |
| Signatures | **not signed** | No second storage reviewer is named for the gate (owner question S5, item 2). |

Gaps go to K2 in the proposed re-plan row (owner question S3), which waits for the owner's approval before K2 (`S05:434`).

### G7 at GK1 (`S05:191-195`)

| Item | State | Evidence | Gap |
|---|---|---|---|
| 1. Gates on the candidate; full browser on the `dist` that is published; refreshed snapshot checked; storage migration and old-cache compatibility before a schema-changing release (`:192`) | **pass, with limits** | Union of Pages 40385448079: browser 37/37 on the published `dist` (`distSha256` `e4f37fce…b72f`); the snapshot check passed (4 files, 58 tests), with the committed Earth-orientation snapshot kept (IERS 400). 2b is K1's first writer of a new stored field: 2a (the reader) was published at 15:10:22Z before 2b merged (`FX-2-s2a-m-learning-027-reader.md:142`); 2b's data compatibility is in `FX-2-s2b-m-learning-027-writer.md:92-103`; the old-record tests pass on the candidate. The revert drill the owner asked for (P2, `DECISIONS.md:366` @5092ac9): **pass, 48 of 48 checks**, rolling back to `408ad16` and `c5da5bb` instead of `a05ae70`, whose app code equals the candidate's (variance V1) ([revert-drill-GK1.md](revert-drill-GK1.md), local build, headless Chromium). | The old worker's reload on a real device waits for the owner's HU-6 session. |
| 2. Deployment API succeeded for the merged commit; About/build stamp checkable; the old service worker's reload flow right (`:193`) | **partial** | `deploy-pages` "Reported success!" for `7263004` (19:41:58Z; the numeric deployment id was not read); `pwa-offline` "reloaded onto the new version true" (Pages 40385448079 `browser (1)`); the teaching-tools build reported "0.1.0+72630046" in `recheck` (local). | The live stamp and the device reload wait for the owner's HU-6 session. |
| 3. Rollback rules split code, data and physics evidence; never "published" when only merged (`:194`) | **partial** | This record keeps code (Pages run), data (refreshed snapshots) and physics (D-64 runs) apart, and says "published" only with a Pages run and deployment. | The rollback rules themselves are draft S17 (R7.2 beyond M-PLAN-026 is not authorized). |
| 4. When D-19/D-20 exist: semver tag, `dist.zip`, SHA256SUMS, CHANGELOG section, limits list (`:195`) | **not done** | D-19 and D-20 were answered (`DECISIONS.md:103-105`); `S05:234` says the first tag when they are answered. No `release.yml`, no tag (`CHANGELOG.md:5`: "no tagged release yet"). | R7.2's release work is not authorized. Owner question S2. |

### GK0's "Carried into K1", closed

- **G2:** signed 2026-10-06 (`DECISIONS.md:151`). Closed.
- **R0.4:** steps 1 and 4 merged (#140, #148); the rest not merged (`PROGRESS:132`). Carried into K2 by the proposed re-plan row (S3).
- **KPI-28:** the #111 row's three smoke runs (`PROGRESS:58`) and the 10 PR runs above. Closed.
- **R7.1:** #175 merged; `r7-cross-system` passed on the candidate (Pages 40385448079). Closed; the HU-6 link waits.

## For the owner: K2's plan sections (GK item 12; D-65)

The adopted set is S01, S05, S06, S08 set A and S18 (`plan/README.md`). K2's work cites the sections below, all drafts at `c2af8ae` on the plan branch. The agent adopts nothing. After the owner adopts, a separate docs PR copies them into `docs/development/plan/`, as CO-8 step 2 did.

| Section | What K2 uses it for | Changed since `c2af8ae` by an owner answer or a K1 fact |
|---|---|---|
| S04 metrics and budgets | every GK's KPI row; GK2's decision KPIs | P1's one-off baselines (this file); draft S19 C6 proposes a KPI-13 counting change (not in this PR) |
| S07 R0 evidence and oracles | R0.4 order 1–5, 7, 8 if the re-plan moves them; the G0 re-check | the re-plan row (S3) departs from §07.4's spill rule |
| S08 set C | the K2 decision queue (C-K2) | — |
| S09 EQ track | EQ-3 to EQ-12 in K2; the EQ-6 window | the window's preconditions: owner question S6 |
| S10 R1.6 and FX | R1.6 PR5–PR10, FX-4, FX-6 and the FX rest; G1+ | decision 5 (`q09` to K2, `DECISIONS.md:355`) |
| S11 R2 continuation | R2.1r, R2.2r, R2.3s2, R2.5, R2.6 | — |
| S13 R4 (1) | R4.1, if the re-plan moves its K1 part | P4: `pd-r41-s1` after GK1 (`DECISIONS.md:368` @5092ac9) |
| S16 ED and HU | ED-ASSESS-1; HU-1 (November), HU-2, HU-3, HU-6 | decision 6 (`DECISIONS.md:356`); decision 7 and S4 (teaching tools) |
| S17 R7 | R7.1 and R7.2 at GK2; release work | file names: S17 says `retro-GK1.md`, the repo keeps `K1-retro.md` (GK0 precedent) |

## Carried into K2

"Re-plan row" means the PROGRESS row "Re-plan at GK1" that this PR proposes; it waits for the owner's approval before K2 (decision 1, `DECISIONS.md:344`; `S05:434`).

- **KPI-13** (G1+): the target needs R1.6 PR5 (M-PLATFORM-007); a repeatable measure needs `measure.mjs` on main (M-PLATFORM-041, R0.4). Re-plan row.
- **KPI-01, 02, 04–11:** re-measure with M-PLATFORM-041 on main, on one host and one binary, with `--compare` against `5f9aa2e`. The trend risks above (KPI-07, 06, 11, 08, 10) are the first to check. Re-plan row (R0.4).
- **KPI-12:** CO-4 step 10 (M-LAUNCH-022), K2 by card `q05` B (`PROGRESS:125`).
- **KPI-14:** draft S10 §10.2 items 9 and 10 (FX-4), due GK2. Not a re-plan item.
- **KPI-15, memory half:** M-PLAN-003 (R0.4). **KPI-16, journey half:** M-BUILD-024 (R0.4 step 12). Re-plan row.
- **KPI-17 to 20:** R4.1's count tests; `pd-r41-s1` after GK1 (P4).
- **KPI-23, 24:** HU-1 in November (decision 6).
- **KPI-25:** M-PLAN-004 (R0.4). **KPI-26, 27:** R2.5 (K2). **KPI-29:** FX-7 steps 1–3 (K2).
- **KPI-28:** target ≤ 12 min; median now 17 min 14 s.
- **KPI-30:** the named offsets EQ-6 (K2), EQ-7 (K2–K5) and EQ-8 (K3). Under draft S04 §04.3 item 3 an offset not landed by GK2 would turn GK2's row red.
- **KPI-31:** the fragment template (`changes/README.md`) asks for "In PR; not merged; not published", while `SESSION-PROTOCOL.md:50` asks for "merged, waiting for publish". Proposed: a one-line docs fix of the template in K2, so step 1 can be true at merge.
- **Size room:** 0.2 kB on `index-*.js` and precache code, 0.0 on `i18n-*.js`; teaching tools need about +1 kB (S4).
- **HU-6:** if the session does not happen at GK1, it is a variance and carries to GK2. Android peak memory (K1-10) stays open (P3).
- **Records:** #179's fold (due 2026-10-27T19:41:58Z, #181). The four PROGRESS rows that cited a later Pages run are corrected in this PR.
- **Follow-through before K1 (GK item 11):** the full check of D-1…D-28, the 2026-10-05 sheets and the seven historical cases of draft S08 §08.6 item 3. Proposed owner: lane I; wave: K2, no later than the GK2 record. A variance for GK1 (owner question S8).

## Questions for the owner

These are the twelve owner questions of the GK1 sign-off (S1–S12; "S" here is an owner question, not a plan section). They are the only place in the GK1 record where all twelve are written. The owner answers them on the sign-off card or in chat, and the integration session copies the owner's words verbatim into DECISIONS; until then nothing here is "decided" (`S18:455`). Each line gives the question, the options and the recommendation; the other files of the record name the question they feed.

- **S1, how to give the five answers that only the owner gives:** merge the GK1 record, sign GK1 (G0 and G1+ recorded as not passed, with S2's answer), approve the re-plan row, adopt K2's plan sections, authorize K2 (D-65). (ก) all five on one card, the words copied verbatim into DECISIONS; (ข) sign GK1 and merge first, the rest later (K2 cannot start meanwhile); (ค) one by one in chat. Recommended: (ก).
- **S2, G7 item 4 at GK1** (tag, `dist.zip`, SHA256SUMS, CHANGELOG section, limits list; D-19 and D-20 are answered, `S05:195`, `:234`). (ก) not at GK1, recorded as a variance, v1.0 at the end of K4 as `S01:145` targets; (ข) not at GK1, and the v1.0 date asked again at GK2; (ค) authorize R7.2's release work for v1.0 at GK1 (the candidate moves); (ง) the owner names the GK. Recommended: (ก).
- **S3, the re-plan row:** move about 41.6 plan PRs of K1 to K2, started work included (R0.4 orders 1–5, 7 and 8, R1.6 PR5: against S05 §05.11 rule 3, draft S07 §07.4 and draft S10 §10.3); at least 3 small PRs outside `pr_estimate`; the mean lead time in place of `S05:306`'s median; the WIP caps unchanged; the five new rules; M-PHYSICS-060 by Day 85. Decision 1 (ก) covers only the G0 and G1+ gaps; the other moves, the mean lead and the rules are new. (ก) approve as written, with 20 repeat runs for rule 2; (ข) approve the move with fewer runs or a changed rule (name it); (ค) do not approve: K1 stays open until G0 and G1+ pass. Recommended: (ก).
- **S4, the teaching tools in K2.** The G0 re-check needs held journeys (`recheck` for EO-XENG-1's browser half, `case-worksheet-exports` for EO-EXP-1, the whole journey list for EO-UI-4), and turning the tools on needs about +1 kB on `index-*.js` and precache code. (ก) back in K2, before the G0 and G1+ re-check (a re-plan item); (ข) still held, and the G0 re-check runs those oracles once on an uncommitted teaching-tools build, as decision 7 did; (ค) still held, and G0 may not close by GK2. Recommended: (ข).
- **S5, the G0 and G1+ details in K2:** (1) re-check and sign in a records PR as soon as the last item merges, no later than GK2; (2) G1+'s second storage reviewer is an agent session that did not write the work, and R4.4's independent science reviewer is named before R4.4 starts; (3) EO-ORB-1 and EO-PHY-7 use the CO-6 base `5f9aa2e`; (4) EO-UI-4 is confirmed against the journey list with the held journeys named, and again if the teaching tools return (S4); (5) R0.2r still gets its JSON examples. (ก) accept all five; (ข) accept some (name those not accepted); (ค) ask again when K2 opens. Recommended: (ก).
- **S6, the EQ-6 window** (K2 days 1–2, `S05:325`). FX-2's part is done (#176, #177), but EQ-6's oracles are in kits 3a, 3c and 3d, which move to K2, and M-LEARNING-030 is not merged. (ก) keep K2 days 1–2: EQ-6 PRs carry per-PR oracles (draft S09 rule 7) and M-LEARNING-030 does not block; (ข) wait for kits 3a, 3c and 3d and EQ-6 PR1; (ค) wait for the kits and M-LEARNING-030. Recommended: (ก).
- **S7, hand-off rows with no owner:** 42 rows, 39 with a proposed lane (S18 §18.2); 10 rows hold 19 questions that were never asked ([GK1-handoffs.md](GK1-handoffs.md)). (ก) accept the proposed lanes; the questions that need the owner (HU-1's Q-1…Q-8 in K0-31, K0-13, K1-24, K1-38, K1-62) go on a card, and the bug-fix, UI and performance questions (K1-08, K1-59, K1-72, K1-76, K1-96) go to their proposed lanes; (ข) accept the lanes and put all 19 questions on a card; (ค) the owner names the owners. Recommended: (ก).
- **S8, acknowledge the variances for GK1 marked "owner acknowledgement pending"** (PROGRESS, "Variances for GK1"): among them R0.4 orders 9–13 in K2; three first users merged before their oracle (EQ-1, R1.6 PR4, FX-8); KPI-15 and KPI-16 measured in part; the project WIP cap on 2026-10-06 (13:21:52–14:49:42Z) and 2026-10-07 (11:31:25–14:55:12Z) and the six code PRs open for 10 s after card `q11` (B15); the lane and I-slot overlaps; K1-52, sent to an item that does not cover it; GK0's missing hand-off check; #176's missing size statement (B3); the follow-through rows before K1; and #110 (A11), recorded as a transition case, not a deviation. (ก) acknowledge them as recorded, nothing reverted, as card `q11` A did; (ข) acknowledge all but some (name them). Recommended: (ก). **Proposed addition:** KPI-31 step 1. Every K1 PR carried its own row or fragment (73 of 73, GK0's method), but none said "merged, waiting for publish" at merge (0 of 73, the wording of `SESSION-PROTOCOL.md:50` and `S18:136`), because the fragment template asks for "In PR". Options: (ก) record it as a variance, report KPI-31 step 1 both ways, and fix the template in K2 (recommended: it already happened, and the records PRs corrected every row); (ข) count GK1's KPI-31 by GK0's method only.
- **S9, the `q03` B allowance:** do #153, #155, #157 and #162 (owner requests) and #176 (2a) count against it? (ก) all five count, and their sizes measured from Pages go in a new row; (ข) only #176 counts, the four owner requests are outside it; (ค) none count. It changes the record and the D-38 "used" column only, not the build. Recommended: (ก).
- **S10, the plan-file edits after the re-plan:** they need an R7.5 docs PR, and R7.5 is not authorized (D-65). (ก) authorize one docs PR only: `packages.tsv`; S05 (`:306` mean lead, `:361` machine times); the wave column of the moved items in `registry.tsv` and `assignment.tsv`; the re-estimates of R4.1, R4.2, R4.3, R4.4, R4.5, R4.7 and R8; the new rules in S18 §18.6 or SESSION-PROTOCOL; and the two S18 lines that still name `push` (`q02`); (ข) authorize all of R7.5; (ค) no docs PR yet: DECISIONS and the re-plan row stand in. Recommended: (ก).
- **S11, the calendar for the gate dates.** The year-end break (21 Dec 2026 – 1 Jan 2027) is S05's assumption (`S05:387`), and S05's Thai public holidays are examples only (`S05:389`); this record skips 13 and 23 Oct. Skipping also 10 Dec, 6 Apr and 13–15 Apr moves later gates 0–5 working days (GK6 2027-03-30 / 2027-06-08, [K1-retro.md](K1-retro.md), "Sensitivity"); the official calendar has more days (for example a substitution day for 5 Dec 2026, a Saturday). (ก) confirm the break and skip every Thai official holiday of 2026–2027, substitution days included, and the agent recomputes the dates; (ข) confirm the break and skip only S05's examples; (ค) confirm the break and work on public holidays; (ง) the owner lists the days. Recommended: (ก).
- **S12, the two `q01` branches:** `q01` is cancelled, but `claude/t-fx8-s2` (`071db68`) and `claude/t-fx8-picture-moment-s1` (`0ac5ca4`) are still on origin, and the session cannot delete them. (ก) the owner deletes both (their SHAs are recorded); (ข) keep them. Recommended: (ก).

Answered before this file and no longer open: the KPI baselines (P1 ข), the revert drill (P2 ข), HU-6 extras (P3 ข), no code PR before the freeze (P4 ก), no brotli ceilings (P5 ก); KPI-30 shown as 0 under the adopted S08 rule; KPI-21 and #135 (`q11` A).

## Not verified, or only in part

- **Everything that needs HU-6:** KPI-32, the live stamp, the old service worker's reload on devices, KPI-08 device rows. Waits for the owner's HU-6 session.
- **KPI-31 step 1** checks only that each PR carried a record and the state it wrote, not whether the rest of each row was true.
- **KPI-14:** the failing-first tests of the items closed before 2b were not re-read in the candidate's run.
- **KPI-16:** per-file results come from the shard logs; `union.json` (artifact 12681698535) was not downloaded.
- **KPI-21:** the S14 §14.6 before/after tables of #135 and #157 were not checked.
- **KPI-34:** the five new rework rows (#176–#180) were classified by one agent. The Q check confirmed their facts; which kind each is stays a judgement.
- **The Q check** (under "Gates") could not check 192 of 2 458 claims from primary sources: mainly the local M-PLAN-026 inputs (package map, calendar, KPI-35 question set, Merge Desk data) and the local runs.
- **The refresh run 40407713039:** its jobs, deployment and budget table were read; its Earth-orientation status and journey logs were not.
- **The baselines** are one measurement with an uncommitted script on one machine; they cannot be re-run on main until M-PLATFORM-041 merges.

## Sources

- Repository at `7263004` (candidate): `docs/DECISIONS.md` (lines 51, 60, 103–105, 119–136, 144, 151, 153, 156, 158, 160, 170, 171, 179, 206, 277, 343, 344, 354–357); `docs/development/PROGRESS.md` (lines 34, 36, 44–47, 49, 51, 52, 54, 58, 59, 64, 71, 85, 125, 132, 155–157, 161, 170, 204, 209, 228, 232, 236, 237); `docs/development/plan/S05-structure-waves-gates.md` (lines 94, 96, 97, 111–122, 135–142, 191–195, 234, 434); `S08-decisions-set-A.md:42`; `S18-execution-model.md` (lines 136, 137, 455); `docs/development/SESSION-PROTOCOL.md:50`; `changes/README.md`; `docs/development/HANDOVER-K1.md:189`; reports `kpi-GK0.md` (lines 32–39, 46, 52), `CO-6-physics-baseline.md:42-66`, `GK1-ceilings-q03-1.md:61`, `FX-2-s2a-m-learning-027-reader.md:142`, `FX-2-s2b-m-learning-027-writer.md:92-103`, `R7.1-GK1.md:70`; `budgets.json`; `.github/workflows/heavy.yml` (lines 42, 86, 115, 145); `src/main.ts:2099`; `tests/build-ratings-unfinished.test.ts:22`; `tests/design-ratings.test.ts:104`; `tests/build-catalogue-matrix.test.ts:25`; `tests/browser/journeys/gesture-ownership.mjs:136`; `CHANGELOG.md:5`.
- Repository at `5092ac9` (#181): `docs/DECISIONS.md` lines 364–369 (#179's Merge Desk; P1–P5).
- Plan drafts at `c2af8ae` (plan branch): S04 §04.2, §04.3, §04.5; S07 §07.4; S10 §10.1, §10.2; S16 (HU-6); S17; S19 C6; `perf-baseline/measure.mjs` and `results/baseline-5f9aa2e.md`.
- GitHub, read only, 2026-10-26: Pages [40385448079](https://github.com/ROYIN001/Orbitlab/actions/runs/40385448079) (jobs, `build`, `test`, `browser`, `verify` and `publish` logs) and [40407713039](https://github.com/ROYIN001/Orbitlab/actions/runs/40407713039) (jobs, `build` log); the `publish` job logs of both runs (`deploy-pages`; the numeric deployment ids were not read); PR CI [40371529487](https://github.com/ROYIN001/Orbitlab/actions/runs/40371529487) and `ci.yml` runs 837–846 with their jobs; heavy [40240193599](https://github.com/ROYIN001/Orbitlab/actions/runs/40240193599) and fleet [40144277552](https://github.com/ROYIN001/Orbitlab/actions/runs/40144277552) (runs, jobs, coverage logs); the PR list and PR bodies #176–#180; `git ls-remote` of main, `claude/t-fx8-s2`, `claude/t-fx8-picture-moment-s1` and `claude/pd-r41-s1` (22:32Z); the repository's `size` (repository search, about 23:45Z).
- Local runs, not committed (integration session, 2026-10-26): the committed-snapshot build and budget of `7263004`; the D-64 list hashes; the six held journeys and four extra journeys on a teaching-tools build; the `measure.mjs` baselines; the revert drill; the M-PLAN-026 re-run at cutoff 19:42:02Z (KPI-31 step 2, KPI-33, KPI-35); the KPI-34 refresh; the KPI-31 step 1 screen.
- The GK1 readiness report (a Claude Docs page shared in chat, named at `DECISIONS.md:344`): the ceilings table ("highest in K1").
