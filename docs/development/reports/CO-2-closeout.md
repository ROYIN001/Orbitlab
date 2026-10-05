# CO-2 — บันทึกการส่งมอบ R2/R3 และ G3 ให้ตรงกับ GitHub (close-out)

- วันที่: 2026-10-05
- แพ็กเกจ: CO-2 ของแผน v2.0 (ร่าง, ส่วน S06; คำตอบของเจ้าของบันทึกใน README ของสำเนาร่างแผน `docs/development/plan-v2-draft/`) คลื่น K0
- รายการ: M-PLATFORM-064, M-PLAN-017
- change_kind: docs (Markdown ที่โค้ดหรือเทสต์ไม่ได้อ่านเท่านั้น)
- owner_authorization: 2026-10-05 “D-65 (ก) wave K0; G3 confirmed” — เจ้าของตอบ D-65 (ก) อนุญาตคลื่น K0 และยืนยันว่าคำ “ระยะ3ทำเสร็จหมดแล้ว” (2026-10-04) ครอบคลุมการตรวจภาพของ R3 ที่ PROGRESS รออยู่ (ไม่ใช่ D08/G2); D-38 (ก) ทั้งข้อชั่วคราวและฉบับเต็ม
- ฐาน: `main` ที่ `5f9aa2eeceb2c2706f5821117f76f92ac25ff4ee` (#83); live `09cc2f5` (Pages 37230585947); ไม่มี PR ใด merge หลัง #83 ณ เวลาตรวจ (2026-10-05 ~02:30Z; #84–#86 ยังเปิด) ขอบเขต audit จึงคงที่ #71–#83

คำเต็มของเจ้าของ (2026-10-04): “เว็บไซต์อัปเดตแล้วครับ งานจาก #80, #81 และ #82 ขึ้นเว็บแล้ว ระยะ3ทำเสร็จหมดแล้ว”

## 1. ตาราง audit #71–#83 (merged ≠ published ≠ live)

ทุก id อ่านจาก GitHub API แบบอ่านอย่างเดียว (คำสั่งในหัวข้อ 1.1) “final head CI” คือ run ของ workflow `ci.yml` (event `pull_request`) บน head สุดท้ายของ PR; “Pages” คือ run ของ `deploy.yml` (event `push`) บน merge SHA; deployment คือ record ของ environment `github-pages`

| PR | เนื้อหา | merged (UTC) | merge SHA | final head → CI | Pages run บน merge SHA | deployment | live? |
|---|---|---|---|---|---|---|---|
| #71 | R1: isolate learner workspaces and harden simulation foundations | 2026-10-03 05:44:01 | `5eb18a2` | `0fff61e` → 37099583981 success (head ก่อนหน้า `f2d7e48` → 37096708399 failure) | 37100771200 **failure** (`browser (2)`: `project-backups` navigation wait) | ไม่มี | ไม่ (ถูกแทนโดย #72) |
| #72 | Fix R1 restore navigation waits in browser acceptance | 2026-10-03 06:36:59 | `472645f` | `544a86e` → 37102480388 success | 37103651001 success (06:55:10Z) | 6824494621 | ถูกแทนแล้ว |
| #73 | Document verified R1 delivery (docs) | 2026-10-03 07:04:42 | `fbefa18` | `501ebf0` → ไม่มี run (Markdown ล้วน, path filter ของ `ci.yml`) | ไม่มี push run (filter `!**/*.md`); cron 37150596767 success บน `fbefa18` (20:32Z) | 6832734794 (จาก cron) | ถูกแทนแล้ว |
| #74 | R2: Launch Engineer flight shell, camera ownership, event chooser, card presets | 2026-10-04 01:55:15 | `da67341` | `8114481` → 37168554643 success | 37169459230 success (02:17:31Z) | 6835795900 | ถูกแทนแล้ว (live 02:17Z–10:07Z) |
| #75 | R3 package 1 (R3.1–R3.4) | 2026-10-04 03:03:14 | `7ddab75` | `370f5a1` → 37172156819 success | 37172926281 **failure** (`build`: `bundle-budget.mjs`, precache 15,787.4 > 15,783 kB) | ไม่มี | ไม่ (site คง R2) |
| #76 | Precache ceiling → measured + 2 % (16,103 kB) | 2026-10-04 09:43:43 | `1d5b76b` | `5feea42` → 37190361868 attempt 3 success (attempt 1, 2 failure; ดูหัวข้อ 5) | 37193082491 success (10:07:51Z) — เผยแพร่ R3 package 1 | 6839612890 | ถูกแทนแล้ว (live 10:07Z–11:20Z) |
| #77 | R3.5 (ทั้งสองส่วน) | 2026-10-04 10:54:04 | `09a536e` | `a1eaccb` → 37196002319 success (head แรก `d0f9df9` → 37195309144 cancelled) | 37196877349 success (11:20:22Z) | 6840296637 | ถูกแทนแล้ว (live 11:20Z–12:06Z) |
| #78 | R3.3 stowed pose + body axes | 2026-10-04 11:42:51 | `f30590e` | `f92883f` → 37198590545 success | 37199666485 success (12:06:51Z) | 6840749466 | ถูกแทนแล้ว (live 12:06Z–20:29Z) |
| #79 | Progress: R3.3 stowed pose published (docs) | 2026-10-04 16:28:42 | `80d5076` | `e304ab4` → ไม่มี run (Markdown ล้วน) | ไม่มี (filter) | — | ไม่ rebuild |
| #80 | R3.3 diagrams + R3.1 design ID/revision | 2026-10-04 17:08:51 | `7662ead` | `8226416` → 37218178884 success | 37219398466 **failure** (`browser (1)`: `learner-profiles` reload timeout) | ไม่มี | merge แล้ว; live ผ่าน `09cc2f5` |
| #81 | Diagnostics: start-up marks | 2026-10-04 18:17:22 | `77d3c00` | `72437d8` → 37222509840 success | 37223857005 **failure** (`browser (1)`: `learner-profiles` reload timeout) | ไม่มี | merge แล้ว; live ผ่าน `09cc2f5` |
| #82 | Diagnostics: browser-process CPU + GPU status | 2026-10-04 20:02:44 | `09cc2f5` | `eec3fbe` → 37229312155 success | 37230585947 success (20:29:44Z; ทุก job) | 6846305019 (status success 20:29:43Z) | **ใช่ (live ปัจจุบัน)** |
| #83 | Progress: record publication of #80–#82 (docs) | 2026-10-04 20:31:34 | `5f9aa2e` | `50f1ff9` → ไม่มี run (Markdown ล้วน) | ไม่มี (filter) | — | `src/` = `09cc2f5` |

cron 37231924125 (schedule, `09cc2f5`, 20:23:43Z) success แต่รันเฉพาะ job `plan` (build/test/browser/verify/publish skipped) จึงไม่ได้ deploy ใหม่

**live:** deployment ล่าสุดของ `github-pages` คือ 6846305019 บน `09cc2f5` (status success, environment_url `https://royin001.github.io/Orbitlab/`) และไม่มี deployment หลังจากนั้น — ยืนยันจาก record ของ GitHub เท่านั้น เปิด `build-info.json` ของเว็บจากสภาพแวดล้อมนี้ไม่ได้ (proxy ตอบ 403)

docs-only PR (#73, #79, #83) บันทึกไว้ในตารางนี้แทนการเพิ่มบรรทัด CHANGELOG

### 1.1 คำสั่งที่ใช้ (อ่านอย่างเดียว ผ่าน `gh api`)

```sh
for n in $(seq 71 83); do gh api repos/royin001/orbitlab/pulls/$n \
  --jq '[.number,.title,.merged_at,.merge_commit_sha,.head.sha]|@tsv'; done
for wf in ci.yml deploy.yml; do gh api \
  "repos/royin001/orbitlab/actions/workflows/$wf/runs?per_page=100&created=2026-10-03..2026-10-05" \
  --jq '.workflow_runs[]|[.id,.event,.head_sha[0:7],.head_branch,.run_attempt,.status,.conclusion,.created_at,.updated_at]|@tsv'; done
gh api repos/royin001/orbitlab/actions/runs/37190361868/attempts/{1,2,3}
gh api "repos/royin001/orbitlab/actions/runs/37190361868/attempts/{1,2}/jobs?per_page=50"
gh api "repos/royin001/orbitlab/actions/runs/{37219398466,37223857005,37172926281,37100771200,37231924125}/jobs"
gh api repos/royin001/orbitlab/check-runs/{111401452048,111405725477,111486887112,111499815358}/annotations
gh api "repos/royin001/orbitlab/deployments?environment=github-pages&per_page=20"
gh api repos/royin001/orbitlab/deployments/6846305019/statuses
gh api "repos/royin001/orbitlab/pulls?state=all&per_page=10&sort=created&direction=desc"
gh api repos/royin001/orbitlab/commits/main --jq .sha
```

log ของ job (`/actions/jobs/{id}/logs`) อ่านไม่ได้ (blob storage ตอบ 403) จึงใช้ annotation ของ check run แทน; `/pages/builds/latest` ถูก proxy ปฏิเสธ

## 2. สิ่งที่แก้ใน PR นี้

| ไฟล์ | ก่อน (บน `5f9aa2e`) | หลัง |
|---|---|---|
| `PROGRESS.md` แถว U08/U09/U16 | “remains R2.2 / R2.1 / R2/R4” ทั้งที่ R2 (#74) ส่งมอบแล้ว | ชี้ว่าส่งมอบใน R2 (#74); D08 layout รอเจ้าของ (G2); profile validation ยังเป็น R4 |
| `PROGRESS.md` แถว R3.5 | “design ID/revision (schema change) remains” | ส่งมอบโดย R3.1 (#80, live `09cc2f5`) |
| `PROGRESS.md` แถว R3.3 stowed | “sunlight/link/footprint diagrams remain” | ส่งมอบโดย R3.3 subsystem diagrams (#80) |
| `PROGRESS.md` แถวใหม่ G3 | ไม่มี | “Delivered 2026-10-04 (owner statement, verbatim …; Pages 37230585947)” |
| `PROGRESS.md` บรรทัด Open :77, :86 | ยังเขียนว่า R3.5/R3.1/R3.3 ค้าง และ G3 รอ | “Delivered since …” พร้อม PR/Pages/SHA และสิ่งที่ย้ายไปแพ็กเกจ v2.0 |
| `R3-design-views.md` :7, :84, :88 | “ไม่อ้างว่า R3/G3 ครบ”, “R3.5 ยังไม่ทำ”, “G3 ยังไม่ผ่าน” | merge/เผยแพร่/live แยกกัน; G3 ส่งมอบพร้อมข้อจำกัดที่รับ |
| `R3.5-journey.md` :7, :80, :81 | “ไม่อ้างว่า G3 ผ่าน”, “design revision ยังไม่มี”, “G3 ยังไม่ผ่าน” | G3 ส่งมอบ; revision ทำแล้วใน #80; ข้อจำกัดที่รับและที่ย้าย |
| `IMPLEMENTATION-STATUS.md` | ไม่รู้จัก R2/R3; :573 “the designer draws no picture” | ตาราง R2.1–R2.4, R3.1–R3.5; :573 bench วาด schematic (Explore designer ยังไม่วาด); :578 (~180 ms) คงเป็นข้อจำกัดที่รู้ (M-BUILD-015); วันที่ Updated |
| `CHANGELOG.md` | ไม่มีบรรทัด R1 (#71/#72), #76, #81/#82 | เพิ่มหนึ่งบรรทัดต่อรายการตามรูปแบบเดิม + บรรทัดของ PR นี้ |

ไม่แก้บรรทัด `Updated:` ของ PROGRESS และไม่เพิ่มแถวของ #84–#86 เพื่อให้ merge กับ PR อื่นใน K0 ง่าย

**ข้อจำกัดที่รับพร้อม G3** (จาก `assignment.tsv` ของร่างแผน): checks อ่านแบบใหม่เทียบ figures เก่า ~180 ms (M-BUILD-015 → R3.4r); mission ที่ version ใหม่กว่าถูกอ่านเป็น usable แทนการปฏิเสธ (`5f9aa2e:src/config/mission-file.ts:314`; M-PLAN-031 → R1.6); Explore satellite designer ยังไม่มีภาพ (M-LAUNCH-081 → R3.3r)

## 3. KPI-31: แถว PROGRESS ที่ตรงกับ GitHub

นับแถวของตารางสถานะ (`PROGRESS.md` :9–:27 บน `5f9aa2e`, 19 แถว) บวกแถว G3 ที่ต้องมีตาม GCO = 20 แถวที่ควรมี

| | ตรง | ไม่ตรง / ขาด |
|---|---|---|
| ก่อน (`5f9aa2e`) | **14 / 20** | U08, U09, U16 (“remains R2.x” ทั้งที่ #74 ส่งมอบ), R3.5 (“design ID/revision remains”), R3.3 stowed (“diagrams remain”), G3 (ไม่มีแถว); นอกตาราง: บรรทัด Open :77 และ :86 ค้าง |
| หลัง (PR นี้) | **20 / 20** | — (บรรทัด Open ทั้งสองแก้แล้ว) |

แถว R1.x, R2.x, R3 package 1, R3.3 diagrams, R3.1 design ID/revision, R0, R4–R7 ตรงอยู่แล้วและไม่ถูกเขียนซ้ำ

## 4. ทบทวนการขึ้นเพดานงบ (D-38)

ค่าเพดานอ่านจากประวัติ git ของ `budgets.json` (`git show <sha>:budgets.json` ที่ merge SHA ทุกตัว `523b44e` → `5f9aa2e`) ค่าที่วัดและฟีเจอร์อ่านจาก `_notes.set` บน `7662ead` (= `5f9aa2e`) offset ตามคำตอบ D-38 (ก) ของเจ้าของ 2026-10-05: index → EQ-7 (lazy code loading), i18n → EQ-6 (active-language dictionaries), precache/ขนาดที่ติดตั้ง → EQ-8 (workers as ES modules), CSS อนุมัติโดยตรง; #76 นับเป็นฝั่งข้อมูลภายใต้ CO-1

| PR | กลุ่ม | เพดาน (git) | ค่าวัด (`_notes`) | ฟีเจอร์ | offset ที่ระบุชื่อ |
|---|---|---|---|---|---|
| #71 (R1) | index JS | 2,572 → 2,573 (+1) | 2,572.8 | fixed-owner learner bootstrap, lock/status context, pending-only draft preservation | ไม่มีในคำตอบ D-38 → **KPI-30** (ผู้ทำวางไว้ในกลุ่ม JS รวม ดูแถวถัดไป) |
| #71 (R1) | other chunks / author / catalog split | other 701 → 765 (+64); author 26 → 26.5; catalog 2,245 → i18n 1,690 + lesson-file 347 + catalog 180 (−28); workspace-content 53 → 35 (−18) | other 763.861; author 26.097; i18n 1,685.006 | profile storage/archive/session, whole-workspace UI | offset ในตัวตาม `_notes`: −28 (catalog) −18 (workspace) → JS รวม +19.5 kB (9,773 → 9,792.5) ไม่ใช่แพ็กเกจ identical-output → **KPI-30** |
| #74 (R2) | index JS / CSS | 2,573 → 2,588 (+15); 169 → 170 (+1) | 2,585.2; 169.6 | Engineer lifecycle shell, camera policy, event chooser, card presets, engine-level readout, phone flight bar | ไม่มีในคำตอบ D-38 → **KPI-30** (index: EQ-7 เป็นผู้สมัคร; CSS ไม่ได้รับอนุมัติแยก) |
| #75 (R3 pkg 1) | index / CSS / i18n | 2,588 → 2,600 (+12); 170 → 173 (+3); 1,690 → 1,702 (+12) | 2,598.7; 172.3; 1,700.7 | bench drawing + part card (R3.2), satellite schematic (R3.3), readiness targets (R3.4) | EQ-7 / CSS อนุมัติ / EQ-6 |
| #76 | precache | 15,783 → 16,103 (+320) | 15,787.4 (Pages 37172926281, data refresh) | ไม่มีฟีเจอร์ใหม่ใน #76: ฟีเจอร์ R2/R3 (index JS/CSS และ i18n รวมราว 24 kB) ใช้ headroom จนหมด แล้วข้อมูลที่ refresh ในวันนั้นดันให้เกิน (`budgets.json` `_notes.set.precache`); ตัวเลข 15,787.4 > 15,783 อ้างจาก `_notes` และ PROGRESS เพราะ annotation ของ GitHub แสดงแค่ exit code 1 | ฝั่งข้อมูล (CO-1); ขนาดที่ติดตั้ง → EQ-8 |
| #77 ส่วน 1 (R3.5) | index / CSS / i18n | 2,600 → 2,608 (+8); 173 → 175 (+2); 1,702 → 1,707 (+5) | 2,605.8; 173.9; 1,705.1 | Show the setting, mission source, first-launch template, Watch copy, steps | EQ-7 / CSS อนุมัติ / EQ-6 |
| #77 ส่วน 2 | index / CSS / i18n | 2,608 → 2,612 (+4); 0; 1,707 → 1,711 (+4) | 2,610.0; —; 1,708.9 | suggestion before → after, Orbit grouping, Show its settings | EQ-7 / — / EQ-6 |
| #78 (R3.3 stowed) | — | ไม่แก้ `budgets.json` | — | (รวมอยู่ในโน้ต R3.3 ของ #80) | — |
| #80 R3.3 | index / CSS / i18n | 2,612 → 2,619 (+7); 175 → 177 (+2); 1,711 → 1,720 (+9) | 2,616.6; 175.7; 1,718.2 | stowed pose + axes, sunlight/link/footprint diagrams | EQ-7 / CSS อนุมัติ / EQ-6 |
| #80 R3.1 | index | 2,619 → 2,622 (+3) | 2,620.2 | DesignRef ผ่าน Fly it, Send to Orbit, stored mission, ชื่อ mission, hand-off | EQ-7 |
| #81, #82 | — | ไม่มีการเปลี่ยน | — | diagnostics | — |

รวม: #77 = +12 / +2 / +9 kB, #80 = +10 / +2 / +9 kB ตามแผน (S03 §03.4) git ยืนยันทุกตัวเลข; precache 15,787.4 × 1.02 = 16,103.1 ตรงกับเพดาน 16,103 นับจากหลัง R1 ถึง `5f9aa2e`: index 2,573 → 2,622 (+49), CSS 169 → 177 (+8), i18n 1,690 → 1,720 (+30), precache +320

**แก้แผนตาม git:** แผน (S06 CO-2 และ KPI-30) ระบุ R1 เพียง “index +1” แต่ git ที่ `5eb18a2` แสดงว่า R1 ขึ้น `other chunks` +64 kB และ `author-view` +0.5 kB ด้วย (ชดเชยในตัวด้วยการแบ่ง catalog −28 และ workspace-content −18 สุทธิ +19.5 kB) จึงบันทึกเพิ่มในตารางนี้ ค่าอื่นทุกตัวของแผนตรงกับ git

## 5. learner-profiles timeout (input ของ M-PLATFORM-061, R7.1)

ทั้งสามครั้งล้มที่ reload หลังลบ learner (`learner-profiles.mjs:205` บน `1d5b76b`, `:182` บน `7662ead`/`77d3c00` — บรรทัดเดียวกันในโค้ด) ไม่มีการ relax timeout หรือข้าม test

| run | SHA | job | annotation (อ่านจาก check run) |
|---|---|---|---|
| CI 37190361868 attempt 1 (PR #76) | `5feea42` | `browser-smoke (1)` 111401452048, 08:55–09:13Z | `page.waitForSelector: Timeout 120000ms exceeded` รอ `#loading.hidden` ที่ `harness.mjs:140` ← `reloadDocument` ← `reloadAfter` (`learner-profiles.mjs:205`) |
| CI 37190361868 attempt 2 | `5feea42` | `browser-smoke (1)` 111405725477, 09:21–09:22Z | step `run-browser.mjs browser-1of2` ล้มในราว 1 นาทีโดยไม่มีไฟล์รายงาน (`browser-1of2.report.json` ไม่พบ) — สาเหตุอ่านไม่ได้ (log 403) ไม่ใช่หลักฐานของ stall ตัวเดียวกัน |
| CI 37190361868 attempt 3 | `5feea42` | ทุก job success | ผ่าน (re-run ทั้ง workflow ตามที่เจ้าของเลือก) |
| Pages 37219398466 (#80) | `7662ead` | `browser (1)` 111486887112 | timeout เดียวกัน `harness.mjs:140`, `learner-profiles.mjs:182` |
| Pages 37223857005 (#81) | `77d3c00` | `browser (1)` 111499815358 | timeout เดียวกันที่ `harness.mjs:145` (`ready`), `learner-profiles.mjs:182` |

ข้อสังเกต: PROGRESS (:66) และ S03 บันทึกว่าใน 37223857005 diagnostics ใหม่ของ #81 รันไม่ได้เพราะ `page.evaluate` timeout และ request `flight.worker` ค้าง ข้อนี้มาจาก log ของ job ซึ่งอ่านจากที่นี่ไม่ได้ annotation แสดงเฉพาะ `waitForSelector` timeout จึงยืนยันได้เพียงบางส่วน ยังไม่พบสาเหตุ และไม่เกิดซ้ำตั้งแต่ #82 (Pages 37230585947 ผ่าน 24/24)

## 6. ตาราง delta ของ M-PLAN-017 (บน `5f9aa2e` / live `09cc2f5`)

`refresh/r3-audit.tsv` ที่แผนอ้าง (S06 ว่า 58 แถว, S03 §03.4 ว่า 53 แถว — ตัวเลขในแผนไม่ตรงกันเอง) **ไม่อยู่ในสำเนาของร่างใน repo** และ `data/assignment.tsv` ไม่มีคอลัมน์ `final_package`/`final_status` (มีเพียง `status` และ `package`) ตารางนี้จึง **สร้างใหม่** จาก `assignment.tsv` (แถวที่ title/notes อ้าง #75–#83, `5f9aa2e`, `09cc2f5`, `7662ead`, G3 หรือ R3CR — 33 แถว) รวมกับรายการที่ S03 §03.4 และ S06 CO-2 ระบุชื่อ (เพิ่มอีก 6 แถว) รวม 39 แถว ไม่ใช่ 53/58 แถวของไฟล์ต้นฉบับ ไฟล์:บรรทัดตรวจบน `5f9aa2e` เมื่อระบุ

| รหัส | status → package | การเปลี่ยนจาก #75–#83 | หลักฐาน (`5f9aa2e`) |
|---|---|---|---|
| M-BUILD-001 | done → DELIVERED | R3.1 ขอบเขต v1.2: flown inputs (#75), DesignRef (#80); ที่เหลือ → M-PLAN-028 (R3.1r), M-PLAN-025, M-PHYSICS-028 | `src/main.ts:971`, `:1011`; `src/design/design-ref.ts`; `src/orbit/handoff.ts:23`, `:69`, `:203` |
| M-BUILD-002 | done → DELIVERED | R3.2 bench (#75); ที่เหลือ → M-LAUNCH-076 (R3.2r) | `src/design/bench-part.ts`; `src/ui/build/engineer-level.ts` |
| M-BUILD-003 | done → DELIVERED | R3.3 schematic #75, stowed #78, diagrams #80; ที่เหลือ → M-LAUNCH-081, M-BUILD-015 | `src/design/satellite-drawing.ts`, `satellite-diagrams.ts` |
| M-BUILD-004 | done → DELIVERED | R3.4 readinessTarget #75, Show its settings #77; ที่เหลือ → M-PLAN-030, M-BUILD-015, M-BUILD-031 | `src/design/review-model.ts:182` |
| M-BUILD-005 | done → DELIVERED | R3.5 #77, design name+revision #80; ที่เหลือ → M-PLAN-025, M-PLAN-030, M-LAUNCH-063 | `src/ui/workspace-mission.ts:45` |
| M-LAUNCH-021 | done → DELIVERED | PROGRESS/R2 report บันทึก R2 แล้ว | `PROGRESS.md` :18–:21, :53–:59 |
| M-LAUNCH-030 | partial → R3.1r | #75 แก้ hand-off/reference; ลิงก์รายงานยังอ่านร่าง | `src/main.ts:1047` |
| M-LAUNCH-063 | partial → ED-LES-2 | #77 Show the setting + suggestion 3 cause | R3.5 report |
| M-LAUNCH-067 | partial → R3.5r | #77 first-launch template; การ์ดตามกลุ่มรอ HU-1/D-8 | R3.5 report |
| M-LAUNCH-068 | open → ED-I18N-2 | ไม่มี | — |
| M-LAUNCH-076 | open → R3.2r | + แถว acceptance ที่เหลือของ M-BUILD-002 | — |
| M-LAUNCH-081 | partial → R3.3r | + Explore satellite picture (ข้อจำกัดที่รับพร้อม G3) | `IMPLEMENTATION-STATUS.md` (R3.3 row) |
| M-BUILD-013 | open → R3.5r | ยังเปิด | `src/ui/build/explore-level.ts:752` |
| M-BUILD-015 | open → R3.4r | ~180 ms ข้อจำกัดที่รับพร้อม G3 | `IMPLEMENTATION-STATUS.md` (known limitations, ~180 ms) |
| M-BUILD-026 | open → EQ-13 | + bench/satellite preview rebuild [R3CR-08] | `satellite-bench.ts:245`, `:311`; `engineer-level.ts:275`, `:326` |
| M-BUILD-027 | open → EQ-13 | + `.sd-axes` rules ซ้ำ [R3CR-06] | `satellite.css` |
| M-BUILD-031 | open → R3.4r | + part-card metres, #77 ISO UTC time | — |
| M-LAUNCH-023 | open → EQ-12 | + suggestion DOM rebuild ทุก 0.5 s [R3CR-10] | `mission-result.ts:170-189` |
| M-LAUNCH-024 | open → EQ-3 | + syncSteps poll 4 Hz ของ #77 [R3CR-09] | `src/main.ts:1492-1525` |
| M-LAUNCH-027 | open → CO-4 | reproducer ขั้น 1 ครอบ openTemplate/applySuggestion ของ #77 | `src/main.ts:560`, `:1147`, `:1582` |
| M-LAUNCH-036 | open → EQ-12 | + formatter ของ R3 5 จุด [R3CR-02] | ตาม notes |
| M-LAUNCH-051 | open → R2.5 | + `.mission-steps` contrast/size ของ #77 | — |
| M-LAUNCH-052 | open → R2.5 | + touch target ของ #77 | — |
| M-LAUNCH-056 | open → R2.5 | + focus ของ template-note / focusField (#77) | `panel.ts:376-449` |
| M-LAUNCH-057 | open → R2.5 | + ปุ่ม “Try this launch yourself” ของ Watch end card | — |
| M-LEARNING-034 | open → ED-I18N-2 | + ISO UTC ใน suggestion (#77) | — |
| M-PHYSICS-015 | open → EQ-10 | + DEG/clamp01 ซ้ำใน R3 [R3CR-02] | `satellite-diagrams-svg.ts:13`, `satellite-diagrams.ts:33` |
| M-PLAN-001 | open → EQ-2 | ใช้ start-up marks ของ #81 เป็นจุดวัด | `src/main.ts:2598-2604` |
| M-PLAN-017 | open → CO-2 | **รายงานนี้** | — |
| M-PLAN-027 | open (ใหม่) → R3.4r | a11y regression ของ R3 bench (live บน `09cc2f5`) [R3CR-03] | `engineer-level.ts:367`, `:407`, `:419`; `satellite-bench.ts:273` |
| M-PLAN-028 | open (ใหม่) → R3.1r | DesignRef single writer ฯลฯ | — |
| M-PLAN-029 | open (ใหม่) → EQ-13 | Build drawing helpers ที่เดียว | — |
| M-PLAN-030 | open (ใหม่) → R3.4r | targeted edit หลัง G3 (focus field ไม่ใช่ control แรก) | `explore-level.ts:635` |
| M-PLAN-031 | open (ใหม่) → R1.6 | newer-version mission ถูกอ่านเป็น usable [R3CR-13]; ข้อจำกัดที่รับพร้อม G3 | `src/config/mission-file.ts:314` |
| M-PLATFORM-014 | open → R1.6 | + canonicalJson ซ้ำ [R3CR-05] | `src/design/design-ref.ts:45` |
| M-PLATFORM-054 | open → R7.3 | fitness baseline บน `5f9aa2e` (main.ts 2,635 / panel.ts 2,517 บรรทัด) | — |
| M-PLATFORM-055 | open → EQ-15 | seams re-anchor บน `5f9aa2e` | — |
| M-PLATFORM-061 | open → R7.1 | + learner-profiles stall (หัวข้อ 5); diagnostics #81/#82; ยังไม่พบสาเหตุ | `tests/browser/harness.mjs` |
| M-PLATFORM-064 | partial → CO-2 | **รายงานนี้** (#83 แก้แถวของ #80 แล้ว) | — |

ไม่มี envelope v2: hand-off ยังเป็น version 1 (`src/orbit/handoff.ts:23`) และ `MissionDocument.design` เป็น field แบบ optional (`src/config/mission-file.ts:52`) — fixture ของ R1.6/R0.2r ต้องรวม field เหล่านี้ ตารางนี้ส่งต่อให้ CO-8 (registry) และ S19

## 7. สิ่งที่ตรวจไม่ได้

- log ของ job บน GitHub Actions (403) และ `build-info.json` ของเว็บ (proxy 403): ค่า kB ของ budget ใน Pages และรายละเอียด `page.evaluate`/`flight.worker` ของ 37223857005 ยืนยันจากที่นี่ไม่ได้
- สาเหตุที่ attempt 2 ของ CI 37190361868 ล้ม (ไม่มีรายงาน, annotation ไม่บอก)
- `refresh/r3-audit.tsv` ไม่อยู่ใน repo ตาราง delta จึงสร้างใหม่ (หัวข้อ 6)

## 8. การตรวจของ PR นี้

- แก้เฉพาะ Markdown ที่ไม่มีโค้ดหรือเทสต์อ่าน: `docs/ROADMAP-PART2-3.md`, `docs/SIXDOF-VEHICLE-DATA.md`, `docs/history/phase4-2026-10-01/T03-CURRICULA-RESEARCH.md` ไม่ถูกแตะ (CI และ Pages จึงข้ามตาม path filter)
- `npx vitest run tests/repo-hygiene.test.ts` (vitest 5.0.1, ในเครื่อง): **9/9 ผ่าน** (1 ไฟล์)

## การตรวจของ agent ตัวที่สอง (2026-10-05)

ตรวจครบทุกแถว: ตาราง audit 13/13 แถว (merge SHA, head SHA, CI ทุก run และ attempt, Pages, deployment 7 รายการ) และตารางเพดาน 11/11 แถว ตรงกับ GitHub API และประวัติ git ของ `budgets.json`; การแก้ PROGRESS, รายงาน, IMPLEMENTATION-STATUS และ CHANGELOG เป็นจริง ไม่ปน merged/published/live สิ่งที่แก้ตามผลตรวจ:
- PROGRESS เขียนว่างานที่เหลือ "ย้ายไปแผน v2.0" ซึ่งยังเป็นร่างที่ยังไม่อยู่บน main แก้เป็น "เสนอไว้ในร่างแผน v2.0 (ยังไม่รับรอง; CO-8 รับรอง)" — คำตอบของเจ้าของ (G3, D-65, D-38) จะตามรอยได้จาก repo เมื่อ CO-8 ลง DECISIONS.md
- แถว #76 ในตารางเพดานบอกเหตุทั้งสองอย่าง (ฟีเจอร์ R2/R3 ใช้ headroom หมด แล้วข้อมูลที่ refresh ดันให้เกิน)
- ข้อจำกัดที่คงอยู่: "live" อ้างจาก deployment record 6846305019 เท่านั้น (อ่าน `build-info.json` ของเว็บจากที่นี่ไม่ได้)

