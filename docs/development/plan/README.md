# Plan v2.0 — index / สารบัญแผน v2.0

Version 2.0, index as of 2026-10-06 (CO-8 step 2). This page lists every section of the master plan v2.0 and says which are **approved for waves K0–K1** (copied here) and which are still **draft** (on the plan branch only). It is the v2.0 entry point that [PLAN.md](../PLAN.md) points to; PLAN.md v1.2 stays the record for anything v2.0 has not yet replaced.

**What is approved, and by whom.** The owner adopted the K0–K1 usage set — S01, S05, S06, S08 set A and S18 — on 2026-10-05 ~18:04Z, chat answer "รับรอง (แนะนำ)" ([DECISIONS](../../DECISIONS.md), "Decided 2026-10-05", opening paragraph; the adoption has no D-id of its own). Other sections are adopted gate by gate. Work in each wave still needs its authorization under D-65. On 2026-10-06 (K1 decision page, card `co8-banners`, option a) the owner answered, verbatim: "นำเข้าเฉพาะส่วนที่รับรองแล้ว ป้ายรอไว้ก่อน" — bring in only the approved parts; the "superseded" banners on older documents wait until the whole plan is approved. No banner has been added.

**Source.** Every approved file below is copied from `docs/development/plan-v2-draft/` on branch [`claude/hopeful-allen-1o0vmh`](https://github.com/ROYIN001/Orbitlab/tree/claude/hopeful-allen-1o0vmh/docs/development/plan-v2-draft) at commit `3e18dbc5d8746054bca97598e3703e0e0a967fb7` (the branch head when the owner adopted the set: its last commit, 15:01Z on 2026-10-05, came before the adoption at ~18:04Z). Each file opens with a short note saying so; the plan text under the note is unchanged. The sections are in Thai. Where a section and [DECISIONS](../../DECISIONS.md) disagree — many decisions the text calls proposed have since been answered — DECISIONS is right.

**ภาษาไทยโดยย่อ:** ส่วนที่เจ้าของรับรองแล้ว "ใช้สำหรับ K0–K1" (S01, S05, S06, S08 ชุด A, S18) คัดมาไว้ในโฟลเดอร์นี้ ส่วนอื่นยังเป็นร่างและอยู่บน branch ของแผน ป้าย "ถูกแทนที่" บนเอกสารเก่ารอจนรับรองทั้งฉบับ (คำตอบของเจ้าของ 2026-10-06)

## Sections

| Section | Title (Thai, as in the plan) | Status | Approved by |
|---|---|---|---|
| Header | แผนแม่บทการพัฒนา Orbitlab (Master Plan) — ฉบับรวม | Draft — [on the plan branch](https://github.com/ROYIN001/Orbitlab/blob/claude/hopeful-allen-1o0vmh/docs/development/plan-v2-draft/sections/HEADER.md) | — |
| S00 | หัวเอกสาร วิธีอ่าน ระบบรหัส และลำดับความน่าเชื่อถือของเอกสาร | Draft — [on the plan branch](https://github.com/ROYIN001/Orbitlab/blob/claude/hopeful-allen-1o0vmh/docs/development/plan-v2-draft/sections/S00-header-idscheme.md) | — |
| S01 | บทสรุปผู้บริหาร | **Approved for K0–K1** — [S01-executive-summary.md](S01-executive-summary.md) | Owner, 2026-10-05 (K0–K1 usage set; DECISIONS "Decided 2026-10-05") |
| S02 | เป้าหมาย ข้อกำหนดของเจ้าของ 6 ข้อ หลักการ และสิ่งที่จะไม่ทำ | Draft — [on the plan branch](https://github.com/ROYIN001/Orbitlab/blob/claude/hopeful-allen-1o0vmh/docs/development/plan-v2-draft/sections/S02-goals-principles.md) | — |
| S03 | สถานะ ณ 4 ต.ค. 2026 และการวิเคราะห์ประสิทธิภาพ คุณภาพ ความสมจริง และประสบการณ์ผู้ใช้ | Draft — [on the plan branch](https://github.com/ROYIN001/Orbitlab/blob/claude/hopeful-allen-1o0vmh/docs/development/plan-v2-draft/sections/S03-status-analysis.md) | — |
| S04 | ตัวชี้วัด เป้าหมาย งบประมาณขนาด เมทริกซ์อุปกรณ์ และวิธีวัด | Draft — [on the plan branch](https://github.com/ROYIN001/Orbitlab/blob/claude/hopeful-allen-1o0vmh/docs/development/plan-v2-draft/sections/S04-metrics-budgets.md) | — |
| S05 | โครงสร้างแผน: คลื่นงาน กราฟการพึ่งพา ประตูตรวจ ปฏิทิน และความเสี่ยง | **Approved for K0–K1** — [S05-structure-waves-gates.md](S05-structure-waves-gates.md) | Owner, 2026-10-05 (K0–K1 usage set) |
| S06 | คลื่น CO: ปิดงาน R2 บันทึกการส่งมอบ R3 และตั้งหลักฐานฐาน | **Approved for K0–K1** — [S06-closeout.md](S06-closeout.md) | Owner, 2026-10-05 (K0–K1 usage set) |
| S07 | R0 ต่อเนื่อง: หลักฐานฐาน แคตตาล็อก oracle ความเท่าเดิม perf gate และสัญญาโดเมน | Draft — [on the plan branch](https://github.com/ROYIN001/Orbitlab/blob/claude/hopeful-allen-1o0vmh/docs/development/plan-v2-draft/sections/S07-r0-evidence-oracles.md) (its §07.6 move table is recorded in DECISIONS under D-59) | — |
| S08 | ทะเบียนการตัดสินใจ (D-1…D-75) และคิวคำถามรายคลื่นสำหรับเจ้าของ | **Set A approved for K0–K1** — [S08-decisions-set-A.md](S08-decisions-set-A.md) (D-33, D-34, D-36, D-38, D-39, D-42, D-59, D-63, D-65 and answer sheets A-1, A-2). The rest is draft — [full section on the plan branch](https://github.com/ROYIN001/Orbitlab/blob/claude/hopeful-allen-1o0vmh/docs/development/plan-v2-draft/sections/S08-decisions.md). The owner's answers to all 80 items are in DECISIONS. | Owner, 2026-10-05 (K0–K1 usage set: "S08 set A") |
| S09 | แทร็ก EQ: งานที่ผลลัพธ์เหมือนเดิม ลดงานซ้ำ (OR-1) | Draft — [on the plan branch](https://github.com/ROYIN001/Orbitlab/blob/claude/hopeful-allen-1o0vmh/docs/development/plan-v2-draft/sections/S09-eq-identical-output.md) | — |
| S10 | R1.6 และแทร็ก FX: ความปลอดภัยข้อมูลและผลที่ซื่อตรง | Draft — [on the plan branch](https://github.com/ROYIN001/Orbitlab/blob/claude/hopeful-allen-1o0vmh/docs/development/plan-v2-draft/sections/S10-r16-fx-data-safety.md) | — |
| S11 | R2 ต่อ: workspace การเข้าถึง ตัวอักษรไทย และข้อมูลป้อนกลับบนเครื่องช้า (R2.1r, R2.2r, R2.3s2, R2.5, R2.6) | Draft — [on the plan branch](https://github.com/ROYIN001/Orbitlab/blob/claude/hopeful-allen-1o0vmh/docs/development/plan-v2-draft/sections/S11-r2-continuation.md) | — |
| S12 | R3: ส่งมอบแล้ว (G3 2026-10-04) และงานต่อยอด R3+ (R3.0, R3.1r, R3.2r–R3.5r, R3.6) | Draft — [on the plan branch](https://github.com/ROYIN001/Orbitlab/blob/claude/hopeful-allen-1o0vmh/docs/development/plan-v2-draft/sections/S12-r3-design-journey.md) | — |
| S13 | R4 (1): ความสมจริงของยานและมาตรฐานฟิสิกส์ (R4.1–R4.4, เดิม PLAN §8) | Draft — [on the plan branch](https://github.com/ROYIN001/Orbitlab/blob/claude/hopeful-allen-1o0vmh/docs/development/plan-v2-draft/sections/S13-r4-vehicle-realism.md) | — |
| S14 | R4 (2): ความสอดคล้องของฐานแบบจำลอง ความเที่ยงตรงเครื่องมือ Orbit และภาพที่ผูกกับสถานะฟิสิกส์ (R4.5–R4.7) | Draft — [on the plan branch](https://github.com/ROYIN001/Orbitlab/blob/claude/hopeful-allen-1o0vmh/docs/development/plan-v2-draft/sections/S14-r4-model-fidelity.md) | — |
| S15 | ภารกิจ: R5 ISS จนถึง hard dock, R6 นักบินอวกาศ และ R8 ดวงจันทร์ | Draft — [on the plan branch](https://github.com/ROYIN001/Orbitlab/blob/claude/hopeful-allen-1o0vmh/docs/development/plan-v2-draft/sections/S15-missions-r5-r6-r8.md) | — |
| S16 | แทร็ก ED และเลน HU: การสอน ภาษาไทย ชั้นเรียน สถาบัน ทหาร เกม และหลักฐานจากผู้ใช้จริง | Draft — [on the plan branch](https://github.com/ROYIN001/Orbitlab/blob/claude/hopeful-allen-1o0vmh/docs/development/plan-v2-draft/sections/S16-ed-hu.md) | — |
| S17 | R7 ต่อเนื่อง: การปล่อยรุ่นทุกประตู วิศวกรรมคุณภาพ CI ความทนทาน และเอกสาร | Draft — [on the plan branch](https://github.com/ROYIN001/Orbitlab/blob/claude/hopeful-allen-1o0vmh/docs/development/plan-v2-draft/sections/S17-r7-quality-release.md) | — |
| S18 | รูปแบบการทำงาน: เลนและเจ้าของไฟล์ ไฟล์ hotspot กฎ fold ขนาด PR หลักฐาน task envelope DoR/DoD และการตรวจทาน | **Approved for K0–K1** — [S18-execution-model.md](S18-execution-model.md) (includes §18.14a, the Merge Desk) | Owner, 2026-10-05 (K0–K1 usage set) |
| S19 | ภาคผนวก: ตาราง ID coverage แผนที่รหัสเดิมสู่ใหม่ รายการที่ปฏิเสธ/เลื่อน/ถูกแทนที่ และเอกสารที่ถูกแทนที่ | Draft — [on the plan branch](https://github.com/ROYIN001/Orbitlab/blob/claude/hopeful-allen-1o0vmh/docs/development/plan-v2-draft/sections/S19-appendices.md) | — |

The owner's plain-language timeline (`TIMELINE-TH.md`), the work ledgers (`ledger/`) and the performance tool (`perf-baseline/`) also stay on the plan branch.

## Tables

The approved sections cite the plan's tables as `$F/<file>`; here `$F` is [data/](data/). Copied unchanged from the same commit:

| File | What |
|---|---|
| [data/assignment.tsv](data/assignment.tsv) | The 429 plan items: id, status, priority, effort, kind, home section, package, wave, owner, alias, title, notes. |
| [data/packages.tsv](data/packages.tsv) | The packages: home section, wave, owner, agent-days, PR estimate, `execution_authorized`, title, items. |
| [data/decisions.tsv](data/decisions.tsv) | Decisions D-28…D-75 as proposed: batch, needed-by, question, recommendation, what they block. The answers are in DECISIONS. |
| [data/kpis.tsv](data/kpis.tsv) | The KPIs S01 cites. |
| [data/folds.tsv](data/folds.tsv) | The fold rules S05, S06 and S18 cite. |

The status columns are as of the plan's refresh (2026-10-04, `5f9aa2e`); [PROGRESS.md](../PROGRESS.md) holds the current state of each package.

**Register.** [`../registry.tsv`](../registry.tsv) is the machine-readable register the owner chose to keep ("เก็บ", DECISIONS 2026-10-05, row "registry.tsv"): one row per plan item — `mid`, `package`, `status`, `wave`, `home_section`, `alias_of`, `title` — in the same order as `data/assignment.tsv`, from which it is taken column for column (the plan's generator script was not committed to the plan branch, so the projection was done once for CO-8 step 2). It sits at `docs/development/registry.tsv`, the path the plan (S00 §00.6.9, S19 App D) and the owner's answer name. Its `status` is the plan's item status as of 2026-10-04, not the package lifecycle.
