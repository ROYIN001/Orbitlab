## S07 R0 ต่อเนื่อง: หลักฐานฐาน แคตตาล็อก oracle ความเท่าเดิม perf gate และสัญญาโดเมน

> **ขอบเขต:** ส่วนนี้วางหลักฐานก่อนการเปลี่ยนแปลง (OR-1, OR-6) เป็นบ้านของแพ็กเกจ R0.2r, R0.3r และ R0.4 รวม 14 รายการ และเป็น**บ้านเดียว**ของแคตตาล็อก oracle ความเท่าเดิม (§07.5) ส่วนอื่นอ้าง oracle ด้วยรหัส `EO-*` เท่านั้น สิ่งที่อยู่ที่อื่นและส่วนนี้ไม่เขียนซ้ำ: เกณฑ์ประตูรวมทั้งการปิด G0 (S05 §05.4), นิยาม KPI (S04), เนื้อหาการตัดสินใจ (S08), รายการสิ่งที่ไม่ทำ (S02 §02.13) และขั้นตอนพิสูจน์ของ PR (S18 §18.9)
> **การอนุญาต:** ทุกแพ็กเกจเป็น `execution_authorized: false` จนกว่าเจ้าของจะสั่ง (D-65) เอกสารนี้เป็นแผนอย่างเดียว ไม่มีการรันอะไรเพิ่ม นอกจาก PB ที่วัดแบบอ่านอย่างเดียวบน `fbefa18` และ `5f9aa2e`
> **as-of (ตรงกับ S00 §00.1):** ตรวจแบบอ่านอย่างเดียวถึง **2026-10-04 ~21:10Z** — main บน GitHub = `5f9aa2e` (#83 เอกสาร, merge 20:31:34Z); live = `09cc2f5` (#82; Pages 37230585947 สำเร็จ 20:29:40Z เผยแพร่ #80–#82 พร้อมกัน); ไม่มี PR เปิด; R3 ครบตามคำของเจ้าของ (2026-10-04) ส่วนนี้ไม่เขียนสถานะ main, live หรือ PR ซ้ำ ผลต่อส่วนนี้มีสามข้อ:
> 1. PB วัดซ้ำแล้วบน `5f9aa2e` (PB@5f9aa2e; เครื่องต่างจาก `fbefa18` จึงเทียบได้เฉพาะ byte/จำนวน; S04 §04.1 ข้อ 9)
> 2. **"CO-6 base"** ในส่วนนี้คือ SHA ที่ตรึงใน Day 0 (S05 §05.0 ข้อ a; `5f9aa2e` ถ้า main ไม่ขยับ; `src/` เท่ากับ live `09cc2f5`) ซึ่ง CO-6 ใช้รัน heavy + fleet (S06 CO-6 ขั้น 5) reference ของ oracle และ harness ทุกตัวบันทึกบน SHA นี้ ห้ามใช้ `fbefa18` หรือ `da67341` เป็นฐาน
> 3. การอ้างบรรทัดโค้ดระบุ SHA ไว้ ณ จุดนั้น ส่วนใหญ่เป็น `da67341` ซึ่ง `src/physics`, `src/render`, `src/session`, `src/pwa` และ worker ทั้ง 12 ตัวไม่เปลี่ยนถึง `5f9aa2e` ส่วนที่ #77–#81 เปลี่ยน (#81 แตะ `main.ts` เฉพาะ marks) ส่วนที่เป็นสัญญา (handoff, ResultAction, DesignPreview) อยู่ใน §07.2

### 07.0 ภาพรวมแพ็กเกจ และกฎร่วมของ R0

| แพ็กเกจ | เลน | คลื่น | agent-days / PR (หยาบ) | รายการ | ชนิด PR | ส่งต่อให้ |
|---|---|---|---|---|---|---|
| R0.2r | S (+P, C, U) | K1 (`packages.tsv`) | 4 / ~1 | M-PLAN-013 | docs | อ้างโดย CO-4 ขั้น 1; บันทึกสัญญาที่ส่งแล้ว (hand-off v1 + DesignRef, ResultAction, DesignPreview) ใช้โดย R3.1r, R3.2r–R3.4r, R2.6, EQ-15, R5.1; ADR CraftState เป็น PR1 ของ R5.2 (S15) ซึ่งต่อยอดจาก ADR-Handoff |
| R0.3r | T + Q (P กำหนดแถวฟิสิกส์, L แถว storage) | K1 | 1.5 / ~1 | M-PLAN-014 | quality-improving (เครื่องมือ) | R7.3 (M-PLATFORM-045), D-64 |
| R0.4 | T + Q; เจ้าของ scenario คือ P, B, L, O และ C (probe render) | K0–K1 | 30.5 / ~10 | 12 รายการ (§07.4) | quality-improving (เพิ่มเครื่องตรวจหรือเครื่องวัดเท่านั้น) | EQ-1…EQ-15 (เฉพาะ oracle ที่แต่ละ PR ระบุ, §07.4), FX-1, R4, D-56, HU-6, แถว KPI ที่ GK1; ขั้น 9 ขยาย journey ของ FX-8 (ไม่ใช่สิ่งที่ FX-8 ต้องรอ) |

**กฎร่วมของ R0 ทุกขั้น**

1. **R0 ไม่เปลี่ยนพฤติกรรมของแอป** ทุก PR ต้องไม่มี diff ใน `src/` ตรวจด้วย `git diff --stat <base> -- src/` ซึ่งต้องว่าง
   - probe ใช้ handle ดีบักที่มีอยู่แล้ว ได้แก่ `window.orbitlab.scene.renderer.getContext()` (วิธีเดียวกับ journey `gesture-ownership`) และ `getPerformance()` (`main.ts:844` บน `da67341`)
   - ถ้าจำเป็นต้องมี hook ใหม่ใน `src/` ให้แยกเป็น PR ของเลนเจ้าของไฟล์ (I สำหรับ `main.ts`) และ PR นั้นต้องเป็น identical-output เอง
2. **ไม่แตะเทสต์เดิม** ไม่แก้ ไม่ย้ายออกจาก gate และไม่เพิ่ม timeout (S02 §02.13 ข้อ 25, 27) เทสต์ใหม่ที่เกินงบเวลาของชุด default ให้ไปอยู่ชั้น heavy (PLAN:§9.2) ส่วนผลต่อเวลา PR CI ต้องวัดแล้วรายงานใน KPI-28
3. **oracle ใหม่ใช้ได้เมื่อผ่านสองด่าน** และหลักฐานทั้งสองด่านต้องอยู่ในรายงาน: (ก) ความเสถียร: รันบน base สองครั้ง ได้ผลเท่ากันทุกบิต (ข) sabotage: ใส่การรบกวนเล็กที่สุดตามที่ระบุใน §07.5 แล้ว oracle ต้องล้ม (process lesson 20) การรบกวนทำบน branch ทิ้งที่ไม่ merge
4. **หนึ่งหลักฐานต่อหนึ่ง source** บันทึก SHA, Node 22.23.3, รุ่น Chromium ที่เปิดจริง และ hash ของ snapshot ตาม VER:"Evidence contract" ห้ามเทียบผลข้ามเครื่องหรือข้ามรุ่น browser: PB ใช้ Chromium 141 ในเครื่อง ขณะที่ CI ใช้ 153 จึงต้องวัดฐานใหม่ใน repo (ขั้น 1) แม้จะวัดซ้ำเป็น PB@5f9aa2e แล้ว (Chromium 141 คนละเครื่อง)
5. **รายงาน** ได้แก่ `docs/development/reports/R0.2r-contracts.md`, `R0.3r-change-map.md` และ `R0.4-evidence.md` แต่ละฉบับระบุเทสต์ที่รันจริง ไฟล์ผลดิบ (JSON, trace, ภาพ) ห้ามอยู่ใต้ `docs/` (repo hygiene)

### 07.1 R0.1 ทำต่อ: กฎ reproducer และงานที่ย้ายบ้าน

R0.1 ไม่เป็นแพ็กเกจแยก กฎของ PLAN:R0.1 ใช้ต่อเป็นกฎถาวร มีเจ้าของคือ Q และใช้กับทุกรายงานปัญหา ทุกบั๊กใน CO-4 และ FX และทุกข้ออ้างใน S03 reproducer ต้องมีครบทุกช่อง:

| ช่อง | รายละเอียด |
|---|---|
| source commit | SHA เต็ม พร้อม build stamp จากหน้า About (สถานะ merged, published และ live เป็นสามสถานะต่างกัน) |
| route | เช่น `#/launch/engineer`, `#/lessons/check` |
| ภาษา | TH, EN หรือ RU รวม notation ถ้าผู้ใช้ override |
| viewport และ zoom | ขนาดจอ, browser zoom และ DPR สำหรับเครื่องจริงเพิ่มอุปกรณ์ เบราว์เซอร์ และ device class (D-56) |
| inputs | ไฟล์ mission/design/results หรือขั้นตอนการกดที่ทำซ้ำได้ |
| flight model | point-mass หรือ six-DOF |
| launch epoch | เวลา UTC ของการปล่อย |
| seed | wind, dispersion และ Monte Carlo |
| screenshot | หรือ DOM excerpt ที่แสดงอาการ |

- ปัญหาที่ยังทำซ้ำไม่ได้ต้องติดป้าย "reported" หรือ "hypothesis" ห้ามอ้างว่ามี screenshot หรือ flight แล้วก่อนรันจริง (PLAN:R0.1)
- reproducer ของบั๊กที่รันได้คือ failing-before-fix test (VER) ซึ่งต้องมาก่อน fix ใน PR เดียวกัน
- ข้อมูล "report a problem" ของ HU-6 (M-PLAN-011, D-60) ใช้ช่องชุดเดียวกัน ได้แก่ build stamp, route, ภาษา, device class และ last error รายงานจากผู้ใช้จริงจึงแปลงเป็น reproducer ได้ทันที (ดู S16)
- ข้ออ้างด้านประสิทธิภาพต้องมีช่องเพิ่ม: เครื่อง, รุ่น Chromium, flag (SwiftShader) และจำนวนรอบ ค่าจาก PB เป็นค่าสัมพัทธ์เท่านั้น (S04 §04.1)

**งานของ PLAN:R0.1 เดิมที่ย้ายบ้าน**

| งานเดิม | สถานะ ณ `da67341` | บ้านใหม่ |
|---|---|---|
| ตรวจ wheel/scroll ทุก surface | เสร็จใน R1.3 (`reports/R1.3-gestures.md`; journey `gesture-ownership` นับ draw 612 → 0 → 612) | — |
| inventory ยาน 21 + 4 ID โดยแยก variant | ยังไม่ทำ | R4.1 (M-PHYSICS-040), S13 |
| audit fleet และโปรแกรมฟิสิกส์; อ่าน before/after ของ #63/#64; ตรวจว่าข้อเสนอใน audit ลงโค้ดจริงหรือไม่ | ยังไม่ทำ (PROG: แถว R0 เขียนว่า "future work") | R4.1 (M-PHYSICS-040) รวม recheck audit วันที่ 1 ต.ค. รายข้อ เริ่มวิจัยใน K1 ในเลน P-D |
| ภาพ Engineer (setup/flight/paused/replay/analysis), Watch และแท็บ Engineer ของ Build | ยังไม่ครบ | screenshot matrix ของ CO-3 (M-LAUNCH-019, S06) + journey ฝั่งจรวดของ Build (M-BUILD-024, §07.4) |
| หลักฐานฟิสิกส์บน main ปัจจุบัน | ขาด: heavy ผ่านล่าสุดคือ 36804343856 ก่อน #36; fleet ผ่านล่าสุดคือ 36942933112 ก่อน R1.4 | CO-6 (M-PHYSICS-001), S06 |

### 07.2 R0.2r สัญญาโดเมนที่เหลือ เขียนแบบทันเวลาใช้ (M-PLAN-013)

#### R0.2r ADR ของสัญญาโดเมนที่ยังขาด

- **เจ้าของ:** S เป็นเจ้าของสัญญาข้อมูล ร่วมกับ P (สถานะฟิสิกส์), C (กล้อง) และ U (lifecycle UI) ไม่ต้องผ่าน I-train เพราะ PR เป็นเอกสารล้วน
- **คลื่น / ขนาด / OR:** K1 (`packages.tsv`) / M / OR-1, OR-2, OR-4
- **รายการ:** M-PLAN-013 (P1, M, เปิด) ที่มา: PLAN:R0.2, PLAN:§4.2, PC:(c)4 และ PROG: แถว R0 ("Required R1 contracts adopted")
- **ขึ้นกับ:** ไม่มี hard dependency เพราะเขียนจากโค้ดบน CO-6 base ข้อความของ FlightLifecycle ต้องตรงกับ fix ใน CO-4 ขั้น 1 (M-LAUNCH-027) ซึ่ง D-63 ให้ทำก่อน
- **ปลดล็อก:** R3.1r, R3.2r–R3.4r, M-BUILD-015, seek API ของ R2.6, seam ของ EQ-15, R6; ADR-Handoff เป็นฐานของ ADR CraftState ใน R5.2 PR1
- **ไฟล์ที่อนุญาต:** `docs/development/adr/*.md` และ `docs/development/adr/examples/*.json` (ตำแหน่งที่เสนอ ตำแหน่งจริงให้ D-59 บันทึก) ห้ามแตะ `src/` และ `tests/`
- **ชนิดการเปลี่ยนต่อ PR:**
  - PR1 เป็น docs: ADR 5 ฉบับ + ดัชนี
  - ADR CraftState physical state ไม่ใช่งานของ R0.2r: เป็น PR1 (docs) ของ R5.2 ใน S15 และนับในแพ็กเกจนั้น
- **ประมาณการ (หยาบ):** 4 agent-days, ~1 PR (packages.tsv)
- **fold:** แถว M-PLAN-013 ใน folds.tsv ให้ ADR ห้าฉบับมาก่อน R3.1r/R5.1 (บันทึกสัญญาที่ส่งแล้วของ R3.1/R3.5) ("K1-K2") และ ADR CraftState physical state เขียนทันเวลาก่อน R5.2 แผนนี้ใช้คลื่น K1 ตาม `packages.tsv` ซึ่งเข้มกว่าและยังอยู่ก่อน R3.1r/R5.1 หลักคือเขียน ADR เมื่อผู้ใช้ถัดไปใกล้มาถึง ไม่เขียนทั้งหมดล่วงหน้า

**สถานะของสัญญาตาม PLAN:§4.2** (โค้ดอ้างจาก `da67341`; ข้อมูล R3 package 1 อ้างจาก `7ddab75`; ส่วนต่างถึง `7662ead` อยู่ใต้ตาราง)

| สัญญา | สิ่งที่สร้างแล้ว (หลักฐาน) | สิ่งที่ยังขาด | ผลของ R0.2r |
|---|---|---|---|
| LearnerRepository / ProfileWorkspace | **เสร็จใน R1.1/R1.2 (G1)**: profile+epoch, Web Locks, แท็บที่สองอ่านอย่างเดียว, flush → seal → reload, quarantine, เพดาน 40 โปรไฟล์ / 8 MB / 128 MB (PROG: บรรทัด "Storage ADR"; `reports/R1.1-storage.md`) | ไม่ใช่ช่องว่างของสัญญา แต่เป็นงาน hardening B1–B9 ใน R1.6 (S10) | ไม่เขียน ADR ใหม่ ดัชนีชี้ไปข้อความเดิม |
| FlightLifecycle | **มีเฉพาะขา (1) mission stage**: `src/ui/flight-lifecycle.ts` (`missionStage`, `setupCollapsed`) ขับโดย `App.syncLifecycle()` ทุก rAF (`main.ts:1368`, `:1885`) input `launched` ยังมาจาก `panel.isRunning()` | ขา (2) นาฬิกาจำลอง live (`App.playing`, `recorder.clock`) และขา (3) cursor ที่แสดง, live/replay และ playback clock (`App.player` = `ReplayPlayer`, `player.live`, `player.cursor`, `replayWarp`) ยังอยู่ใน `main.ts` โดยไม่มีสัญญา หลักฐานคือ M-LAUNCH-027 (RW:LUI-01): `main.ts:543` เรียก `preview(cfg)` เมื่อ `!this.playing` ดังนั้นเมื่อเที่ยวบินพักอยู่ การกด "Use for the next launch" จะทำลายเที่ยวบินและ recording | ADR-FlightLifecycle: สามขาเป็นอิสระ มีตารางการเปลี่ยนสถานะที่อนุญาต และจัดประเภททุก call site ที่ตั้ง `playing = false` แล้วเรียก `restoreMission` (`main.ts:551`, `:573`, `:642`, `:702`) ว่าเป็น "explicit return to setup" หรือไม่ |
| CameraPolicy | **สร้างแล้วใน R2.2**: `src/render/camera-policy.ts` (`owner` cinematic/manual, `choose`, `resume`, `onPhase`, `onTarget`) ลบ `App.autoCamera` แล้ว และมี `tests/camera-policy.test.ts` 7 กรณี | ข้อความ `cam.intro` ขัดกับพฤติกรรมใหม่ (M-LAUNCH-011, CO-4); A5 รอ D-36; reduced motion รอ M-LAUNCH-054 (R2.5) | ADR-CameraPolicy เขียน "ตามที่สร้าง" ไม่ออกแบบใหม่ |
| GestureOwnership | **เสร็จใน R1.3**: `render/gestures.ts` และ journey `gesture-ownership` | `touch-action` รอหลักฐานจากอุปกรณ์ (M-LAUNCH-039 เลื่อนไว้) | ไม่เขียน ADR ใหม่ |
| CraftState/Handoff | **`orbitlab.handoff` v1** (`src/orbit/handoff.ts:21–22`): r, v, jd, spacecraft, label, origin; `parseHandoff` ไม่ไว้ใจ input; perigee ≥ 100 km; R3 package 1 เปลี่ยน origin เป็น `flownMission(sim.cfg)` และรายงานติดป้ายว่าเป็น hypothesis | design ID/revision, flown inputs ที่แก้ไม่ได้, provenance ของ build/model, intent 5 แบบ, attitude, ω, mass/fuel, geometry, subsystem และ docking port | ADR-Handoff ตรึงความหมายของ v1 + `origin.design` ที่ส่งแล้ว (#80) ไม่มีเป้า v2 (ตัดใน S12 §12.3) งานต่อยอดอยู่ใน R3.1r (M-PLAN-028) ส่วนสถานะฟิสิกส์แยกไปที่ ADR-CraftState ก่อน R5.2 |
| DesignPreview | **บางส่วนจาก R3 package 1**: `StackSvg` บน bench + part card จาก `VehicleSpec`; satellite schematic พร้อม assumption ที่ระบุชื่อ | กฎ "ภาพกับตัวเลขอ่าน snapshot เดียวกัน" ยังไม่มีเทสต์; ภาพ last-valid ที่ล้าสมัยยังไม่มีป้าย (M-BUILD-015); ภาพ stowed/deployed (R3.3r) | ADR-DesignPreview พร้อม freshness contract ที่ M-BUILD-015 จะ implement |
| ResultAction | **บางส่วน**: `readinessTarget()` ใน `review-model.ts` ตัดสินจาก stage/booster/path/code ไม่อ่านข้อความแปล | การพาไปที่ field ใน parts builder (R3.4r, M-PLAN-030; M-BUILD-004 ส่งแล้ว); ข้อเสนอก่อน/หลังที่สร้าง draft ใหม่โดยผู้ใช้ตั้งใจ; เส้นทางผล → แก้ ใน ED-LES-2 (M-LAUNCH-063) | ADR-ResultAction: รหัสเหตุ, typed destination และข้อห้าม parse ข้อความแปล |
| VerificationManifest | **เสร็จใน R1.5**: `plan.json`, `report.json`, `union.json` (VER:"Evidence contract") | การเลือกเทสต์จากแผนที่ (R0.3r) และ hash ของ tree สำหรับ D-64 | ไม่เขียน ADR ใหม่ R0.3r และ R7.3 ต่อยอด |

**ส่วนต่างหลัง `da67341` ที่ ADR ต้องเขียน "ตามที่สร้าง"** (#77–#80 บน `7662ead`; สถานะรายการยืนยันใน Day 0 ตาม S05 §05.0 ข้อ b และ S03 §03.4)
- **Handoff:** #80 เพิ่ม `origin.design` (id + revision ของแบบ) แบบ optional โดย `HANDOFF_FORMAT_VERSION` ยังเป็น 1 (`7662ead:src/orbit/handoff.ts:23`, `:69`) และเพิ่ม `MissionDocument.design` ใน stored mission (`7662ead:src/config/mission-file.ts:52`) ADR-Handoff จึงตรึง v1 พร้อมสองฟิลด์นี้ ส่วน design ID/revision ในช่อง "ยังขาด" ข้างบนเหลือเฉพาะ intent อีก 4 แบบและไฟล์ที่ export (S03 §03.4, M-BUILD-001)
- **ResultAction:** #77 เพิ่ม `src/ui/result-actions.ts` ที่แมป `ResultCause` แบบ typed ไปยัง key ของ field ใน setup โดยไม่อ่านข้อความแปลและไม่แก้ค่า ADR-ResultAction เขียนจากโค้ดนี้ ไม่ออกแบบใหม่
- **DesignPreview:** #78 เพิ่มท่าพับเก็บและแกนของดาวเทียม ส่วน #80 เพิ่ม diagram แดด/เงา, link และ footprint จาก `SatelliteFigures` ชุดเดียวกับตาราง กฎ freshness (M-BUILD-015) ยังไม่มี

**ตัวอย่างที่ ADR ต้องมี** (ผู้ใช้ถัดไปแปลงเป็นเทสต์ได้ทันที ตาม PLAN:R0.2 "สร้าง against contract ได้โดยไม่แตะไฟล์ร่วม")

| ADR | valid | invalid (ต้องปฏิเสธ หรือต้องไม่เกิด) | legacy (ต้องอ่านได้) |
|---|---|---|---|
| FlightLifecycle | stage = flight, นาฬิกา live พักอยู่, cursor อยู่ใน replay ที่ T+100 s ขณะ live head อยู่ที่ T+300 s → setup อ่านอย่างเดียวและไม่มี preview | setup ถูกแก้ หรือ preview รันขณะเที่ยวบินยังไม่จบ โดยผู้ใช้ไม่ได้กด New mission (กรณี LUI-01) | mission document (U01) ที่บันทึกก่อน R2 เปิดเข้า setup โดยไม่สร้าง recording |
| CameraPolicy | ผู้ใช้เลือกมุม → owner = manual; phase เปลี่ยนแล้วมุมไม่เปลี่ยนจนกว่าจะกด Cinematic | เส้นทางอัตโนมัติเรียก `setCamera()` ซึ่งเป็นเส้นทางของผู้ใช้ แทน `showCamera()` | โค้ดและข้อความที่ยังอ้าง `App.autoCamera` หรือ `cam.intro` แบบเดิม |
| Handoff | v1 ที่ perigee ≥ 100 km และ kind อยู่ใน 8 ชนิดที่รู้จัก | version ที่ใหม่กว่าที่รู้จักต้องถูกปฏิเสธอย่างซื่อตรง (D-22); perigee ต่ำกว่า `HANDOFF_MIN_PERIGEE`; `origin.design` ที่อ่านไม่ได้ต้องถูกปฏิเสธทั้งก้อน (`5f9aa2e:src/orbit/handoff.ts:202-203`); ใช้สถานะในอนาคตที่เลย cursor ไปแล้วขณะ replay | ไม่มีไฟล์ v1 ค้างในเครื่องผู้ใช้ (หัวไฟล์ `handoff.ts` ระบุว่า hand-off อยู่ในหน่วยความจำ) legacy จึงหมายถึง v1 ที่ไม่มี `origin.design` (รูปก่อน #80) ซึ่งผู้อ่าน v1 ปัจจุบัน (lifetime, playground) ต้องรับเหมือนเดิม; แผนไม่มี v2 ถ้าภายหลังจำเป็นเป็นงานแยกตาม S12 §12.3 |
| DesignPreview | ภาพและตัวเลขมี design revision เดียวกัน; assumption ที่ไม่มีพารามิเตอร์จริงแสดงชื่อ | ภาพจาก revision ใหม่คู่กับตัวเลขจาก revision เก่าโดยไม่มีป้าย (ช่วงประมาณ 180 ms ที่ checks อ่านค่าเก่า; UXR:c) | ADR ต้องกำหนดว่าแบบที่บันทึกก่อนมี revision id แสดงอย่างไร |
| ResultAction | รหัสเหตุ → destination ที่มีชนิด {section, stage, field} | หาช่องแก้ด้วยการ parse ข้อความที่แปลแล้ว | ไฟล์ผลที่บันทึกก่อนมีรหัสเหตุ แสดงผลได้แต่ไม่มีปุ่มพาไปแก้ และไม่เดา |
| CraftState physical state (เขียนใน R5.2 PR1, S15) | state ระบุ frame, units และ epoch ชัด; quaternion normalize แล้ว; mass ≥ dry mass | ไม่ระบุ frame หรือปน TEME กับ ECI-of-date (RA:(d)6) | รับ handoff v1 (มีหรือไม่มี `origin.design`) ที่ไม่มี attitude โดยใช้ค่า default ที่ติดป้ายว่าเป็น assumption |

- **เกณฑ์รับ:**
  - ADR 5 ฉบับ (FlightLifecycle, CameraPolicy, Handoff, DesignPreview, ResultAction) + ดัชนีที่ชี้ไปสัญญาที่เสร็จแล้ว merge ก่อน R3.1r/R5.1 (บันทึกสัญญาที่ส่งแล้วของ R3.1/R3.5) เริ่ม
  - ทุกกฎมีตัวอย่าง valid/invalid/legacy ในรูป JSON
  - ทุกฟิลด์ใน handoff และ preview ระบุชนิดว่าเป็น input, derived, estimated, fitted หรือ reference ส่วนข้อมูลยานไปอยู่ที่ ledger ของ R4.1 (M-PHYSICS-040)
  - ส่วนที่โค้ดขัดกับ PLAN:§4.2 ต้องบันทึกเป็นช่องว่างพร้อมรหัสรายการ ห้ามเขียนว่าเป็นไปตามสัญญา
- **วิธีพิสูจน์:** diff มีเฉพาะใต้ `docs/development/adr/` agent ที่สองเทียบข้ออ้าง "สร้างแล้ว" ทุกข้อกับ file:line บน base SHA และรายงานจำนวนข้อที่ยืนยันได้ (process lesson 11)
- **quality guard (OR-2):** ADR ต้องไม่ลดสัญญาของ R1 (S10 §10.1) และต้องไม่เปิดทางให้ทางลัดใดใน S02 §02.13

**กำหนดเขียนแบบทันเวลาใช้**

| ADR | เขียนเมื่อ | ผู้ใช้ถัดไป | ถ้าล่าช้า |
|---|---|---|---|
| FlightLifecycle | K1 สัปดาห์แรก | R3.1r, seek API ของ R2.6 (M-LAUNCH-062), seam "frame loop" ของ EQ-15 | R3.1r และ EQ-15 รอ |
| CameraPolicy | K1 | R2.5 (M-LAUNCH-054), D-36.A5, R6 | ใช้โค้ดและเทสต์ 7 กรณีเป็นสัญญาชั่วคราว |
| Handoff | K1 ก่อน R3.1r/R5.1 (บันทึกสัญญาที่ส่งแล้วของ R3.1/R3.5) | R3.1r (M-PLAN-028), R5.1, แท็ก LTAN ของ M-PHYSICS-028, ADR CraftState | R3.1r และ R5.1 รอ |
| DesignPreview | K1 | R3.2r, R3.3r, M-BUILD-015 | R3.3r รอ |
| ResultAction | K1 | R3.4r (M-PLAN-030), ED-LES-2 (M-LAUNCH-063) | R3.4r รอ |
| CraftState physical state | ไม่อยู่ใน R0.2r: PR1 ของ R5.2 (S15) | R5.2, R5.3, R6 | R5.2 รอ |

### 07.3 R0.3r แผนที่ change-to-check ที่เครื่องอ่านได้ (M-PLAN-014)

#### R0.3r แผนที่ change-to-check พร้อมการทดลอง

- **เจ้าของ:** T + Q โดย P กำหนดแถว heavy/fleet และ L กำหนดแถว storage
- **คลื่น / ขนาด / OR:** K1 / S / OR-1, OR-6
- **รายการ:** M-PLAN-014 (P2, S, เปิด) ที่มา: PLAN:R0.3, PLAN:U13 ("ตรวจ workflow งานยาก งานช้า และงานซ้ำเพื่อปรับกระบวนการ" ซึ่ง v1.2 แมปไป R0.3, R1.5, R7.2), PLAN:§9.2 ข้อ 1 และ 9, PC:(c)8 และ VER:"Change-to-check map" ซึ่งปัจจุบันเป็นตาราง prose ที่เครื่องรันไม่ได้
- **ขึ้นกับ:** CO-5 (journey ของ R2 อยู่ในชุด smoke ของ PR แล้ว จึงเลือกได้) และ R0.4 ขั้น 1 (scenario ของ perf ที่จะแมป)
- **ปลดล็อก:** R7.3 (M-PLATFORM-045), การเลือกแถว fleet ต่อยานในแต่ละ PR (S05 §05.6), D-64
- **ไฟล์:** ชื่อที่เสนอ: `scripts/verification/change-map.json` (กฎ glob → ชุดตรวจ), `scripts/verification/select-checks.mjs` และ `tests/verification/change-map.test.mjs` ไม่แตะ gate ใดใน workflow
- **ชนิด PR:** quality-improving 1 PR ส่วนการแก้ข้อความใน VER ให้ชี้มาที่แผนที่เป็น docs ใน R7.3 ไม่ปนใน PR เดียวกัน
- **ประมาณการ (หยาบ):** 1.5 agent-days, ~1 PR

**ทำอะไรและทำไม**

แผนที่นี้คือส่วนของ PLAN:U13 ที่ตัดงานช้าและงานซ้ำออกจาก feedback ของ PR โดยไม่ลดความครอบคลุมของ gate (ส่วนอื่นของ U13 อยู่ที่ R1.5 ซึ่งเสร็จแล้ว และ R7.2/R7.3 ใน S17) แต่ละกฎแมป path glob ไปเป็นชุดตรวจ ได้แก่ unit file, journey (smoke หรือ full), heavy file, แถว fleet ต่อยาน, perf window และ oracle `EO-*`

- selector รับรายการไฟล์ที่เปลี่ยน (`git diff base..head`) แล้วคืนชุดที่เลือก พร้อมรายการ path ที่ไม่มีกฎ
- **path ใดไม่มีกฎ ให้ใช้ชุด relevant เต็ม** (PLAN:R0.3)
- ผลการเลือกบันทึกลง `plan.json` เป็นข้อมูลประกอบเท่านั้น gate ครบชุดของ PR และ release ยังรันเหมือนเดิม (VER) แผนที่จึงใช้เพื่อ feedback เร็วและเพื่อเลือกชุดย่อยของ heavy/fleet ไม่ได้ลดความครอบคลุมของ release

**การทดลอง:** ใช้เฉพาะรายการไฟล์จาก merge commit ของแต่ละกรณี แผนที่ต้องเลือกด่านที่จับปัญหาได้

| กรณี | สิ่งที่เกิด (หลักฐาน) | ด่านที่จับได้ | แผนที่ต้องเลือก |
|---|---|---|---|
| #63 `c109f98` | CI 36884215504 ล้มที่ build/budget; Pages 36886828921 ล้มหลัง 50:05 ด้วย worksheet click timeout (PLAN:§9.1) | `bundle-budget.mjs`; journey ส่งออก worksheet (ปัจจุบันคือ `case-worksheet-exports`) | budget + journey export ในโหมด Pages |
| #64 `717a1ef` | fleet ต้องรันซ้ำก่อนและหลังรวม hot staging เพราะสอง branch ฟิสิกส์ใช้ base ร่วม (PLAN:§9.1) | แถว `tests/sixdof-fleet` และเทสต์ six-DOF ของ Soyuz-2.1b | แถว heavy/fleet ของยานที่ถูกแตะ + `rigid-flex-golden` เมื่อแตะ rigid runtime |
| #68 `f2d2678` | PR CI 37063706462 ผ่าน แต่ Pages ตามกำหนด 37066834767 ล้มด้วย export timeout | journey export บน dist ที่ refresh แล้ว | journey export ในโหมด Pages ไม่ใช่แค่ smoke ของ PR |
| #70 `523b44e` (Stage 3–4 ตาม PLAN:§9.1) | CI 37080233899: RU ที่ 320 px ล้นจอ และ assertion ที่รอ worker ล้ม | ตรวจ layout 320 px ภาษา RU; เทสต์ worker | layout 320 px ทุกภาษา + เทสต์ worker |
| R2 #74 `da67341` | `r2-flight-shell` ไม่เคยรันใน PR CI ก่อน merge; regression M-LAUNCH-008/011/025; LUI-01 ยังอยู่ | `r2-flight-shell` (ขยายใน CO-5), `notation-defaults`, i18n parity | journey R2 + notation + i18n เมื่อแตะ `main.ts`, `telemetry*`, `timeline*` หรือ i18n |
| R3 package 1 #75 `7ddab75` | Pages 37172926281 ล้มที่ precache 15,787.4 > 15,783 kB หลัง refresh ข้อมูล ขณะที่ PR CI วัดได้ 15,778.7 kB | budget ในโหมด Pages ที่ใช้ snapshot ที่ refresh แล้ว | budget แบบข้อมูล refresh (เพดานแยกของ CO-1) เมื่อ PR เพิ่มไบต์ precache |

- **เกณฑ์รับ:** การทดลองเลือกถูกครบ 6/6 กรณี; รายงานขนาดชุดที่เลือกเทียบกับชุดเต็ม (ค่าที่ต้องวัด ห้ามอ้างล่วงหน้า)
  - ทุก path ที่ git track ภายใต้ `src/`, `public/`, `scripts/`, `tests/` และ `.github/` รวม consumed Markdown 3 ไฟล์ (VER) ต้องจับคู่กับกฎได้ หรือถูกนับเป็น unknown อย่างชัดเจน และ consumed Markdown แต่ละไฟล์แมปไปยังเทสต์ที่อ่านไฟล์นั้น
- **D-64:** selector คำนวณ hash ของ tree ที่เกี่ยวกับฟิสิกส์ตามนิยามใน D-64 (S08) แล้วบันทึกไว้เท่านั้น การใช้ผลซ้ำจริงทำใน R7.3 เฉพาะเมื่อ D-64 ผ่าน และใช้ได้เฉพาะ heavy/fleet ห้ามใช้กับ journey และ unit บน Pages เพราะ M-PLAN-012 ยังถูกปฏิเสธ (S19 App C)
- **วิธีพิสูจน์:** ตารางการทดลองในรายงาน + sabotage โดยลบกฎหนึ่งข้อ กรณีที่เกี่ยวต้องตกไปใช้ "ชุดเต็ม" ไม่ใช่ "ไม่เลือกอะไรเลย"
- **quality guard:** ห้ามถอด gate ใด (S02 §02.13 ข้อ 25) การเร่ง CI ตัวจริง (cache, shard, typecheck แบบเพิ่มทีละส่วน) อยู่ใน R7.3 (M-PLATFORM-045, S17)

### 07.4 R0.4 oracle, harness แบบ bitwise และ perf gate ถาวร

#### R0.4 แพ็กเกจหลักฐานฐาน

- **เจ้าของ:** T + Q เจ้าของ scenario ได้แก่ P (ฟิสิกส์), B (Build), L (storage), O (เครื่องมือ Orbit ใน M-PLAN-010) และ C (probe render)
- **คลื่น / ขนาด / OR:** K0–K1 / 5 รายการขนาด M + 7 รายการขนาด S / OR-1, OR-2, OR-3, OR-6
- **ขึ้นกับ:** CO-6 (M-PHYSICS-001) ต้องเขียวบน base หรือ regression ที่พบต้องถูกแยกเป็น issue ที่ bisect แล้ว (S06); CO-1 (แตะไฟล์ budget เดียวกับขั้น 2); D-3/D-4 (ขั้น 7); D-56 (แถวอุปกรณ์ของขั้น 9–10); DEC:D-17 (ถ้าต้องเพิ่ม devDependency)
- **ปลดล็อก:**
  - **EQ-1…EQ-15 ไม่รอ R0.4 ทั้งแพ็กเกจ** PR ของ EQ ต้องมีเพียง (1) oracle ในแคตตาล็อก §07.5 ที่ envelope ของ PR นั้นระบุ แต่ละตัวบันทึกบนฐานแล้วและพิสูจน์ด้วย sabotage แล้ว จะมาจาก kit (ขั้น 3) หรือเป็น oracle เฉพาะ PR ก็ได้ และ (2) perf gate ของขั้น 1 (M-PLATFORM-041, `--compare`) **เฉพาะเมื่อ PR อ้างว่า KPI เปลี่ยน** ลำดับขั้นจึงจัดตามผู้ใช้คนแรกของแต่ละ oracle (ตาราง "ลำดับลงมือ" ด้านล่าง)
  - FX-1 (ต้องมี M-BUILD-024 ก่อน); M-PLAN-009 (ข้อมูล warp ที่ได้จริง); D-56 และ follow-through ของ DEC:D-27, HU-6, แถว KPI ที่ GK1
  - **FX-8 ไม่รอ R0.4:** FX-8 เขียน journey บังคับ context หลุด (`WEBGL_lose_context`) ของตัวเองเป็น failing-before-fix test (S10 §10.11) ส่วนขั้น 9 (M-PLAN-003) นำ journey นั้นไปขยายเป็น probe ทั้งภารกิจภายหลัง จึงไม่ใช่ hard dependency ของ FX-8
- **ไฟล์ที่อนุญาต:** `scripts/perf/**` และ `scripts/bundle-budget.mjs` (T); `.github/workflows/perf.yml` ไฟล์ใหม่ (T); `tests/**` และ `tests/fixtures/**` เฉพาะไฟล์ใหม่; `budgets.json` เฉพาะการ seed กลุ่มใหม่ (T; กฎใน S04 §04.3) ห้ามแตะ `src/**` และห้ามแก้เทสต์เดิม
- **ชนิดการเปลี่ยนต่อ PR:** ทุก PR เป็น quality-improving
- **ประมาณการ (หยาบ):** 30.5 agent-days, ~10 PR (packages.tsv) จัดกลุ่ม PR ตามตาราง "ลำดับลงมือ" การแยก kit ตามผู้ใช้อาจเพิ่ม PR เล็ก 1–2 ตัว นับเป็นส่วนต่างที่ GK1 (S05 §05.11)

| รหัส | P | ขนาด | สถานะ | เรื่อง (สั้น) | ที่มา (รหัสเดิม) |
|---|---|---|---|---|---|
| M-PLATFORM-041 | P1 | M | บางส่วน | perf gate ถาวรใน repo | DP:ENG-K19, OD:PERF-01, RM:P2.5-j, PB:measure.mjs |
| M-PLAN-020 | P2 | S | เปิด | คอลัมน์บีบอัด และกลุ่ม initial-load/texture ใน budget | UXR:E3, PB |
| M-PLAN-018 | P1 | M | เปิด | ชุด oracle สำหรับ UI/render/export/storage | PC:(c)2, UXR:E1 ข้อ 5, R1.3 |
| M-PHYSICS-002 | P1 | S | เปิด | harness แบบ bitwise ของ propagator, Apollo และ MSIS | CR:P14, P15, P18, P19, D15, D20, NEW-PHYS-4 |
| M-PLAN-010 | P1 | S | เปิด | digest ของเครื่องมือ Orbit ที่ยังไม่มี fingerprint | RA:Phase 0 |
| M-PHYSICS-003 | P1 | S | เปิด | profile CPU ของ flight worker | CR:P17, PB:flight100x, DEC:D-27 |
| M-PHYSICS-060 | P1 | M | เปิด | tolerance fixtures และ Node pin | DP:D-3/D-4, DP:11-01, DP:ENG-K17, DP:P-3, RW:PHY-15, RW:TQ-01 |
| M-PLAN-002 | P2 | S | เปิด | ข้อขัดแย้งระหว่าง warm กับ cold | OD:stage1 (warm ช้ากว่าใน 6/6 คู่), PB (warm 6.6 s, cold 16.4 s) |
| M-PLAN-003 | P1 | M | เปิด | หน่วยความจำตลอดภารกิจ และ context loss | UXR:b7, OD:SIXDOF-BROWSER-QA |
| M-PLAN-004 | P2 | S | เปิด | input latency | UXR:E3, PC:(c)3 |
| M-BUILD-025 | P2 | S | เปิด | scenario Build ใน perf | PB (ยังไม่มี window ของ Build), PLAN:§11.1 |
| M-BUILD-024 | P1 | M | บางส่วน | journey ฝั่งจรวดของ Build + เทสต์ fake-Worker | RW:B-04, RW:TQ-02 (ส่วน Build), RW:TQ-04 |

**ลำดับลงมือ: แต่ละ oracle มาก่อนผู้ใช้คนแรกของมัน** (เลขขั้นด้านล่างเป็นรหัสคงที่ที่ S09/S10 อ้าง ไม่ใช่ลำดับ; ผู้ใช้คนแรกมาจากคอลัมน์ "ใช้กับ" ใน §07.5 และ S05 §05.10; เลนต่างกันทำขนานกันได้ภายใต้ WIP ใน S18)

| ลำดับ | ขั้น (oracle หรือรายการ) | เลน | ต้อง merge ก่อน (ผู้ใช้คนแรก) | ช่วง |
|---|---|---|---|---|
| 0 | วัดฐาน perf 3 รอบบน `5f9aa2e` ด้วย `measure.mjs` ของ scratchpad (ไม่ใช่ PR, ไม่แก้ repo): ทำแล้วเป็น PB@5f9aa2e; Day 0 วัดซ้ำเฉพาะเมื่อ main ขยับเกิน docs | Q/T | แถว KPI ของ GK0 และค่าตั้งต้นของทุกขั้น | Day 0 (S05 §05.0 ข้อ c) |
| 1 | ขั้น 1 M-PLATFORM-041 + server แบบ Pages (ส่วน 8a ของขั้น 8) | T | ทุก PR ที่อ้าง KPI รวมข้ออ้าง KPI-02 ของ EQ-1 | K1 วันที่ 6 งานแรกของเลน T |
| 2 | ขั้น 3a EO-PWA-1 | Q (+T) | EQ-1 (เลน T: ขั้น 1 → FX-7 ขั้น 0 → EQ-1) | K1 |
| 3 | ขั้น 12 M-BUILD-024 | B + Q | FX-1 แล้ว EQ-13, R3.4r | K1 งานแรกของเลน B |
| 4 | ขั้น 3b EO-UI-1, EO-UI-2, EO-UI-5 | Q (+C probe) | EQ-2 PR1 (หลัง FX-8 ในเลน C) และ EQ-4 (K2) | K1 |
| 5 | ขั้น 3c EO-UI-3, EO-STO-2 | Q | PR identical-output แรกของ R1.6 (M-PLATFORM-003/005/006), FX-2 (M-LEARNING-002), CO-4 ขั้น 4 | K1 |
| 6 | ขั้น 4 M-PHYSICS-002 | P | EQ-9 แล้ว EQ-11 | K1 งานแรกของเลน P หลัง CO-6 หรือ bisect |
| 7 | ขั้น 5 M-PLAN-010 | Q (+O, P) | EQ-5 และ EQ-9 | K1 |
| 8 | ขั้น 2 M-PLAN-020 + ขั้น 3d EO-EXP-1, EO-I18N-1, EO-BUN-1 (ราย worker) และยืนยัน EO-UI-4 | T / Q | หน้าต่าง EQ-6 (K2 วันที่ 1–2), EQ-5, EQ-12; R1.6 ขั้น c (EO-BUN-1) | ปลาย K1 |
| 9 | ขั้น 6 M-PHYSICS-003 | P (+T) | EQ-10 (M-PHYSICS-012) | ก่อน EQ-10 |
| 10 | ขั้น 9 M-PLAN-003 | T + Q (+C) | หลัง FX-8; R3.0, D-56; ค่าสูงสุดหน่วยความจำของ EQ-2 PR1 (ถ้ายังไม่ merge EQ-2 วัดเองด้วย probe เดียวกันในรายงาน) | K1–K2 |
| 11 | ขั้น 8b M-PLAN-002 + ขั้น 10 M-PLAN-004 | T + Q | ข้ออ้าง KPI-08 หรือ KPI-25 ใด ๆ; แถว KPI ที่ GK1 | K1–K2 |
| 12 | ขั้น 11 M-BUILD-025 | T (+B) | EQ-13 (K3) และโค้ด Build ของ R3+ ต่อยอด (R3.2r–R3.5r) | K1–K2 |
| 13 | ขั้น 7 M-PHYSICS-060 | P + T | ไม่มีผู้ใช้ใน EQ (EQ ใช้ hash); การย้าย Node | หลัง D-3/D-4 (ภายใน Day 35, S05) |

- ถ้า oracle ยังไม่ merge เมื่อ PR ผู้ใช้พร้อม PR นั้นใช้ oracle เฉพาะ PR ได้ตามกฎใน §07.5 ไม่ต้องรอ kit
- ลำดับ 9–13 มีผู้ใช้คนแรกหลัง K1 จึงล้นเข้า K2 ได้โดยไม่บล็อก EQ ใด และบันทึกเป็นส่วนต่างที่ GK1
- oracle แบบ R ที่มีอยู่แล้ว (EO-PHY-1…5, EO-XENG-1) ไม่ต้องสร้าง แค่ยืนยันว่าเขียวบน CO-6 base (CO-6) ส่วน EO-STO-1 สร้างใน R1.6 ขั้น b (S10)

**ขั้นตอน** (เลขขั้นเป็นรหัสคงที่ ลำดับลงมือดูตารางด้านบน; ทุกขั้นพิสูจน์ตามกฎร่วมข้อ 1–3 คือไม่มี diff ใน `src/`, oracle เสถียร และ sabotage ล้ม เว้นแต่ระบุเพิ่ม)

1. **M-PLATFORM-041: perf gate ใน repo** (T + Q)
   - ย้าย `measure.mjs` และ README ข้อจำกัดของมันเข้า `scripts/perf/` ใช้สัญญาเดียวกับ `tests/browser/serve.mjs`
   - workflow `perf.yml` รันตามกำหนดและสั่งรันเองได้ ไม่เป็น gate ของ PR เก็บ JSON เป็น artifact และเก็บสรุปขนาดเล็กใน `scripts/perf/baselines/` (ข้อเสนอ ไม่อยู่ใต้ `docs/`)
   - เพดาน (ratchet ลงอย่างเดียว) ใช้กับค่าที่ไม่ขึ้นกับฮาร์ดแวร์: ไบต์และ request, WebGL context, shader program ทั้งหมดและที่ซ้ำ, draw call ต่อเฟรม, Mpx ของ texture และจำนวนครั้งที่อ่าน storage
   - ค่าที่เป็นเวลา (rAF ms, big-JSON ms, shader wait) เป็น trend บนเครื่องเดียวกันเท่านั้น (S04 §04.1)
   - window ของ scenario: startup, home, orbit (เข้า, เล่น, หยุด), launch + configure, ignition, flight 1× และ 100×, warm, storage (ค่าเริ่มต้นและ 1.5 MB) และ window ของขั้น 8–11 เพิ่ม scenario หน้าจอโทรศัพท์ 390×844 ที่ CPU ช้าลง 4 เท่า ซึ่งเป็นส่วนการวัดที่ DEC:D-27 ต้องการ การตัดสินใจยังเป็นของ D-56
   - `--compare` ต้องระบุว่าช่วงค่าทับกันหรือไม่ ทุกผลต้องมี provenance JSON (SHA, Node, Chromium, flag, เครื่อง)
   - `--profile` พึ่ง `@jridgewell/trace-mapping` ซึ่งอยู่ใน lockfile เป็น transitive dependency เท่านั้น ให้คงเป็นโหมดเสริมที่โหลดแบบ dynamic และแจ้งข้อผิดพลาดชัดเจน หรือเพิ่มเป็น devDependency หนึ่งตัวพร้อมเหตุผลตาม DEC:D-17
   - **ฐานแรกไม่รอขั้นนี้:** วัดแล้ว 3 รอบบน `5f9aa2e` (PB@5f9aa2e) ด้วยสคริปต์ของ scratchpad และ Chromium 141 เดียวกับ PB แต่ต่างเครื่อง (S05 §05.0 ข้อ c; S04 §04.1 ข้อ 9) ค่าที่ไม่ขึ้นกับฮาร์ดแวร์ (ไบต์และจำนวน) แทนค่า `PB@fbefa18` ในแถว KPI ของ GK0 ส่วนค่าเวลาเทียบข้ามเครื่องไม่ได้ Day 0 วัดซ้ำเฉพาะเมื่อ main ขยับเกิน docs หลัง `5f9aa2e`
   - **เกณฑ์รับ:** วัดซ้ำ 3 รอบด้วยสคริปต์ revision ที่อยู่ใน repo บน CO-6 base เดียวกับ Day 0 และเก็บเป็นฐานของ `--compare` ระดับ PR (ผลจากสคริปต์คนละ revision เทียบตรงกันไม่ได้, S04 §04.1 ข้อ 7) ทุกค่าของ PB มีค่าคู่บนฐานใหม่
   - **พิสูจน์:** รันซ้ำบน base เดียวกัน ค่าที่เป็นจำนวน (ไบต์, context, program, draw, การอ่าน storage) ต้องเท่ากันทุกรอบ ค่าเวลาต้องมีช่วงทับกัน และ `--compare` ระหว่าง base กับ base ต้องไม่รายงานความต่าง
2. **M-PLAN-020: เครื่องมือ budget** (T; ต่อจาก CO-1 ในเลนเดียวกัน)
   - เพิ่มคอลัมน์ gzip/brotli ด้วย `node:zlib` (คงหลัก "Plain Node, no dependencies" ของสคริปต์)
   - เพิ่มกลุ่ม initial-load (index + i18n + lesson-file + catalog + css) และกลุ่ม texture
   - **เกณฑ์รับ:** seed กลุ่มใหม่ด้วยค่าที่วัดบน base ตาม S04 §04.3 ห้ามขยายเพดานเดิม ตารางพิมพ์ทั้ง raw และค่าบีบอัด
   - **พิสูจน์:** ผลรวม raw ของกลุ่มเดิมเท่ากับผลของสคริปต์เดิมทุกไบต์บน base เดียวกัน และ sabotage ด้วยการเพิ่มไฟล์ภาพ 1 ไฟล์ต้องทำให้กลุ่ม texture เกินเพดาน
3. **M-PLAN-018: ชุด oracle** (Q; T ทำ harness, C ทำ probe render)
   - สร้าง EO-UI-1…5, EO-EXP-1, EO-STO-2, EO-I18N-1, EO-PWA-1 และ EO-BUN-1 ตาม §07.5 เป็น 4 ชุดตามผู้ใช้คนแรก: 3a EO-PWA-1; 3b EO-UI-1/2/5; 3c EO-UI-3, EO-STO-2; 3d EO-EXP-1, EO-I18N-1, EO-BUN-1 + ยืนยัน EO-UI-4 (ตาราง "ลำดับลงมือ")
   - **เกณฑ์รับ:** oracle ทุกตัวผ่านด่านความเสถียรและ sabotage ตามกฎร่วมข้อ 3
   - แต่ละชุดเป็น PR quality-improving แยกที่ merge ก่อนผู้ใช้คนแรกของมัน ห้ามอยู่ใน PR ของ EQ
4. **M-PHYSICS-002: harness แบบ bitwise** (P เขียนเทสต์เท่านั้น ร่วมกับ Q)
   - (a) `propagate()` ประมาณ 8 กรณีที่ serialise เป็น Float64 hex: LEO 400 km ทุกแรง 30 วัน, GTO ที่มี sun/moon/srp, untilDown แบบ eccentric, บังคับ rejection ด้วย tol = 1e-12, onProgress abort และอีกสองกรณีต่อไปนี้
     - **วงโคจรเอียง 0°** ที่ z = 0 และ vz = 0 ตรงตัว (input ทั้ง +0 และ −0; แรงโน้มถ่วง + J2 + drag ไม่มี sun/moon เพื่อให้อยู่ในระนาบ): ส่วนประกอบ z ของ k ทุก stage เป็น ±0 ผลรวมเดิม `reduce(…, 0)` เริ่มจาก +0 (`da67341:src/physics/propagator/propagate.ts:169`, `:172-173`) ถ้า accumulator ที่จัดสรรล่วงหน้าของ EQ-9 เริ่มจากพจน์แรกหรือจาก −0 เครื่องหมายของศูนย์จะต่างได้ harness จึง serialise เป็น hex ซึ่งแยก +0/−0 (เท่ากับ `Object.is`) ทั้ง samples ทุกฟิลด์และค่าที่ `acceleration()` คืนที่ z = ±0 กรณีนี้ผ่านกิ่ง `nn ≤ 1e-12` ของ `elementsOf` (`:101-103`) ด้วย ความต่างของเครื่องหมายศูนย์ที่ไม่ปรากฏในผลที่สังเกตได้ถือว่าเท่าเดิม (OR-1) กรณีนี้มีไว้ให้ความต่างที่ปรากฏถูกจับได้
     - **แรงที่ไม่จำกัด (non-finite):** spacecraft ที่ `mass = 0` (area/mass เป็น ∞ ใน drag และ SRP, `da67341:src/physics/propagator/forces.ts:117`, `:132`) และ input ที่เป็น NaN วันนี้ err ที่เป็น NaN ทำให้ `err > tol` เป็นเท็จ ขั้นจึงถูกรับ แล้ว h และ t กลายเป็น NaN จนลูปหยุดเอง (`propagate.ts:165`, `:175-180`) harness ตรึงผลทั้งชุด (samples, `steps`, `lifetime`) โดยเทียบ NaN ด้วยตำแหน่ง (`Number.isNaN`) ไม่ใช่ bit pattern เพราะ payload ของ NaN ไม่ถูกกำหนด การตรึงนี้ไม่ได้รับรองว่าพฤติกรรมถูก การเปลี่ยนเป็น error ที่ชัดเจนเป็น PR ชนิด bug-fix แยก ไม่ใช่ EQ
   - (b) Apollo 11 ตั้งแต่ TLI ถึง entry: SHA-256 ของ [t, r, v] ทุกวินาที + event log และ `Object.is` ของผล targeting (ถ้าเกินงบเวลาของชุด default อยู่ชั้น heavy)
   - (c) ตัวนับการเรียก `deriv` ซึ่งเป็นตัววัด ไม่ใช่ oracle ความเท่า (KPI-11)
   - (d) MSIS: ป้อน input เดียวกันหลังลำดับการเรียกที่ต่างกัน ต้องได้ density ที่ `Object.is` เท่ากัน
   - **ถ้า (d) ไม่ผ่าน** FSAL และการใช้ stage แรกซ้ำหลัง rejected step จะถูกตัดออกจาก EQ-9 เพราะทั้งสองข้ามการเรียก `deriv` ส่วนที่เหลือของ EQ-9 คือการตัด allocation โดยคงลำดับการบวก ข้อค้นพบนี้ส่งให้ P พิจารณาใน R4.5 และไม่ถือเป็นบั๊ก เพราะลำดับการเรียกเดิมยัง deterministic
5. **M-PLAN-010: digest ของเครื่องมือ Orbit** (Q บันทึก, O กำหนดกรณี, P ตรวจส่วน Apollo และ M03)
   - เก็บ SHA-256 ของ pass/overflight (ต้องพบครบ 249 เหตุการณ์ของ Skyfield; fixture เดิม `tests/fixtures/passes/` คงเป็นเทสต์แบบ tolerance), eclipse/power, applications, job re-entry ของ M03 และตารางเฟสของ Apollo
   - **fold:** ตารางเฟสของ Apollo ใช้ run เดียวกับขั้น 4(b) ไม่บินซ้ำ
6. **M-PHYSICS-003: profile ของ worker ที่ 100×** (P; T ทำ trace ในเบราว์เซอร์)
   - `node --cpu-prof` ของการขึ้นสู่วงโคจรแบบ six-DOF ของ Soyuz-2.1a และ Falcon 9 + trace ของ worker ในเบราว์เซอร์ 1 ชุดที่ขอ warp 100× จำนวน 5 รอบ
   - รายงาน self time ต่อฟังก์ชันและไฟล์, เวลา GC และไบต์ที่ allocate ต่อวินาทีจำลอง
   - จัดอันดับต้นทุนของ integrator, aero, engine, flex และ navigation แล้วตั้งเป้าที่วัดได้ให้ M-PHYSICS-012 (EQ-10)
   - ส่งข้อมูลให้ D-56/DEC:D-27 และข้อความ warp ที่ซื่อตรงของ M-PLAN-009 ห้าม "แก้" ด้วยการตั้ง point-mass เป็นค่าเริ่มต้น (S02 §02.13 ข้อ 1)
7. **M-PHYSICS-060: tolerance fixtures + Node pin** (P + T; หลัง D-3/D-4)
   - fixture [t, r, v] + events แบบ decimate ที่ tolerance 1 m / 1 mm/s / 1 step ทำ 27 แถว point-mass ก่อน แล้วจึงทำ 21 แถว six-DOF และ cross-engine journey
   - job ของ Node 24 รันเฉพาะชั้นนี้ โดย hash ยังเป็น gate (S02 §02.13 ข้อ 24)
   - **เส้นตาย:** D-3/D-4 ตัดสินภายใน Day 35 (≈ 2026-11-20) และย้ายหรือ pin ให้เสร็จภายใน Day 85 (≈ 2027-02-12) ยึดวันที่ ไม่ใช่ GK เพราะ Node 22 หมด maintenance 2027-04-30 (S05 §05.9)
   - ถ้ายังไม่มีคำตอบ ขั้นนี้รอ ขั้นนี้ไม่อยู่บน critical path ของ EQ เพราะ EQ ใช้ hash
8. **M-PLAN-002: warm กับ cold** (T + Q)
   - **8a server แบบ Pages:** โหมด serve ที่ส่ง ETag, max-age และ gzip เหมือน Pages ทำใน PR เดียวกับขั้น 1 เพราะข้ออ้าง KPI-02 ของ EQ-1 ต้องวัดกับ header แบบนี้ (S04 §04.1 ข้อ 5)
   - **8b การวัด:** ใช้ harness เดียวกับขั้น 1 และ server ของ 8a, n ≥ 5; cold ใช้ user-data-dir ใหม่ warm มีสองแบบ: เปิดเบราว์เซอร์ใหม่บน profile เดิม และ reload ในเบราว์เซอร์เดิม (แบบเดียวกับ PB)
   - **เกณฑ์รับ:** อธิบายได้ว่าทำไม OD:stage1 (first paint ของ warm 7.28 s เทียบ cold 0.37 s) ขัดกับ PB และยืนยันนิยามของ KPI-08 สาเหตุถือว่ายังไม่ทราบจนกว่าจะวัด
9. **M-PLAN-003: หน่วยความจำและ context loss** (T + Q; C ทำ probe `renderer.info`)
   - ใช้ภารกิจ Soyuz MS และ Falcon 9 เต็มภารกิจ เก็บตัวอย่าง JS heap, ไบต์ของ recording (`getPerformance()`), `renderer.info.memory`, จำนวน program, จำนวน WebGL context และประมาณไบต์ของ texture
   - context loss: ทำหลัง FX-8 โดยเริ่มจาก journey บังคับหลุด (`WEBGL_lose_context`) ที่ FX-8 เขียนเป็น failing test ของตัวเอง (S10 §10.11) แล้วขยายเป็น probe ทั้งภารกิจที่วัดหน่วยความจำ program และ context ก่อนและหลังกู้บน Launch, Orbit และ Home ขั้นนี้เป็น probe ที่รายงานผล ไม่ใช่ gate และ FX-8 ไม่ต้องรอขั้นนี้ (M-PLAN-019, KPI-15)
   - รับงานด้าน perf และ memory ที่ยังเปิดใน OD:SIXDOF-BROWSER-QA
   - แถวอุปกรณ์มาจาก HU-6 (KPI-32) ส่วน device class มาจาก D-56
10. **M-PLAN-004: input latency** (T + Q)
    - ใช้ `PerformanceObserver('event')` กับการแก้ setup, play/pause, scrub และหมุนล้อกล้อง ที่ CPU ช้าลง 4 เท่า (CDP `Emulation.setCPUThrottlingRate`)
    - รายงาน p75 ต่อ action จาก n ≥ 5 เป็น trend จนกว่าจะมีฐานจากอุปกรณ์ (KPI-25)
11. **M-BUILD-025: scenario ของ Build** (T; B กำหนด scenario)
    - `--only build`: เข้า Build, แก้ค่าใน Explore, คำนวณ rating, พิมพ์ในหน้าดาวเทียม และสลับแท็บ Engineer
    - วัด long task, rAF ms, WebGL/2D context (กฎ R3: ห้ามสร้าง WebGL ต่อแท็บ), CPU ของ worker และจำนวนครั้งที่เขียน storage ต่อการกดแป้น
    - **เกณฑ์รับ:** วัดฐาน 3 รอบก่อนโค้ด Build ของ R3+ ต่อยอด (R3.2r–R3.4r, R3.5r) R3.1–R3.5 ของ v1.2 merge และเผยแพร่แล้ว (`09cc2f5`) ฐานจึงต้องเป็น CO-6 base
12. **M-BUILD-024: journey ฝั่งจรวดของ Build + fake-Worker** (B + Q; T ดูแล runner และ manifest)
    - ลำดับใน journey: Explore → remix Falcon 9 stretch 120 % → rate โดยกด Stop หนึ่งครั้งแล้วรันจนจบ → save → reopen → Engineer review + แท่นทดสอบ → Fly it ทั้ง TH และ EN บนโทรศัพท์และ desktop
    - ตรวจ readiness จากรหัสชนิด (`readinessTarget`) ไม่อ่านข้อความแปล; อยู่ใน inventory ของ Pages และพิสูจน์ด้วย sabotage; fake-Worker ครอบ progress, result, error และ abort ของ ratings และ readiness
    - **ห้ามยืนยันพฤติกรรมที่เป็นบั๊ก:** ขั้น Stop ตรวจเพียงว่าหยุดได้และหน้าไม่ค้าง ค่าที่เก็บหลัง Stop เป็นหน้าที่ของ failing-before-fix test ใน FX-1 (M-BUILD-006)
    - ต้องตรวจทับซ้อนกับ journey `r3-bench-drawings` ของ #75 แล้วขยายต่อจากของเดิม ไม่ทำซ้ำ และต้องเสร็จก่อน FX-1, EQ-13 และ R3.4r

- **การบันทึก:** reference ที่ commit (fingerprint, digest, fixture) คำนวณบน CO-6 base และต้องเขียวบน merge-base ของ PR ที่ commit มันด้วย ถ้าสองค่านี้ต่างกัน แสดงว่ามี commit ระหว่างนั้นที่เปลี่ยนผล ให้หยุดและ bisect ห้ามบันทึกค่าใหม่ทับ
  - หลังจากนั้นทุก commit บน main ต้องรักษา reference ให้เขียว เพราะเป็นเทสต์ในชุดของ CI ส่วน oracle แบบ differential รันบน merge-base ของแต่ละ PR เสมอ
  - ฐาน perf: Day 0 บน SHA ของ Day 0 (ลำดับ 0) แล้ววัดซ้ำด้วยสคริปต์ใน repo ที่ขั้น 1 บน SHA เดียวกัน หลังจากนั้นวัดใหม่ที่ candidate ของทุก GK (S04 §04.1 ข้อ 9)
  - SHA ฐานมาจากบรรทัด as-of ของ S00 (§00.1; main = `5f9aa2e`, `src/` เท่ากับ live `09cc2f5`) และตรึงใน Day 0 (S05 §05.0 ข้อ a) ถ้า main ขยับก่อน Day 0 หรือ CO-6 ต้องรันซ้ำบน SHA ที่ CO-1 เผยแพร่ (S05 §05.0) ให้ใช้ SHA ใหม่นั้นเป็นฐานทั้งชุด ห้ามบันทึกบางตัวบน SHA เก่า
- **quality guard (OR-2):** การวัดห้ามใช้เป็นเหตุผลในการลดคุณภาพ (S02 §02.13 ข้อ 1–4) fps จาก SwiftShader ห้ามเป็น hard gate (S04 §04.1) และ tolerance tier ห้ามแทน hash (ข้อ 24)
- **หลักฐานที่ต้องส่ง:** `R0.4-evidence.md` สำหรับ oracle ทุกตัวต้องมีผลรันซ้ำสองครั้งบน base, branch sabotage พร้อมผลที่ล้ม, SHA, Node และ Chromium, ตารางฐาน 3 รอบ และค่าตั้งต้นสำหรับแถว KPI ที่ GK1
- **execution_authorized:** false (รอเจ้าของสั่ง)

### 07.5 แคตตาล็อก oracle ความเท่าเดิม (normative)

**หลักการ**

- **นิยาม:** oracle คือสิ่งที่สังเกตได้ ซึ่งก่อนและหลัง PR ชนิด identical-output ต้องเท่ากันทุกบิต ทุกไบต์ หรือทุกพิกเซล ความหมายของ "เท่ากัน" ในแต่ละโดเมนอยู่ใน S02 §02.3 (OR-1)
- **oracle มีสองแบบ:**
  - **R (reference ที่ commit):** fingerprint, digest หรือ fixture ที่บันทึกครั้งเดียวและตรวจในทุก CI
  - **D (differential):** รัน base และ head ใน harness เดียว บนเครื่องเดียว ในรอบเดียวกัน แล้วเทียบผล ไม่ commit ภาพหรือผลเป็น golden
- **การใช้ (กฎของ PR ชนิด EQ):** ทุก PR ชนิด identical-output ระบุ `oracle: [EO-…]` ใน envelope (S18 §18.11) อย่างน้อยหนึ่งตัวต่อโดเมนที่แตะ PR นั้นต้องการ**เฉพาะ** oracle ที่ระบุ แต่ละตัวต้องบันทึกบนฐานแล้วและพิสูจน์ด้วย sabotage แล้ว จะมาจาก kit (R0.4 ขั้น 3) หรือเป็น oracle เฉพาะ PR ก็ได้ และต้องมี M-PLATFORM-041 (`--compare` ≥3 รอบ, S04 §04.1) **เฉพาะเมื่อ PR อ้างว่า KPI เปลี่ยน** PR ที่ไม่อ้าง KPI เขียน "ไม่อ้าง KPI" และยังต้องผ่าน gate แบบ hard ของ CI (budget, เทสต์) ตามปกติ ส่วนการถอยหลังของ KPI ถูกจับที่ KPI compare ของทุก GK (S04 §04.5)
- **oracle เฉพาะ PR:** เป็น commit แรกของ PR ที่รันเขียวบน merge-base ก่อนมีโค้ดเปลี่ยน และแนบหลักฐาน sabotage ในรายงาน (แบบเดียวกับ CO-4) ถ้าใช้ได้ทั่วไป ให้ย้ายเข้า kit ใน PR quality-improving ถัดไป
- **ไม่มีใครบันทึกซ้ำ (re-record) หรือแก้ oracle ที่มีอยู่ภายใน PR ของ EQ**

| รหัส | โดเมน | oracle | แบบ / บันทึกที่ | บันทึกเมื่อ | ใครบันทึกใหม่ได้ (นอก EQ เท่านั้น) | การพิสูจน์ด้วย sabotage | ใช้กับ |
|---|---|---|---|---|---|---|---|
| EO-PHY-1 | ฟิสิกส์ point-mass | `tests/d01-fleet-fingerprint.test.ts`: 27 เที่ยวบิน (แถว leo 50 % ของยานทั้ง 21 ลำ + 6 แถว kick-stage/restart/break-up) SHA-256 ของ [t, r, v] ทุกวินาทีตั้งแต่ T−10 s + telemetry + event log คู่กับ `d01-vehicles-identity.test.ts` | R / ไฟล์เทสต์ | บันทึกแล้ว (`eedd035`; re-record แต่ละครั้งมีเหตุผลกำกับในหัวไฟล์) ยืนยันว่าเขียวบน CO-6 base | P เท่านั้น ใน PR realism-changing ที่ระบุชื่อแถว พร้อมเหตุผล, ตาราง before/after และการอนุมัติของเจ้าของ (S14 §14.6) หรือการย้าย Node ครั้งเดียวตาม D-3/D-4 | คูณแรงหนึ่งพจน์ด้วย (1 + `Number.EPSILON`) แล้วแถวที่เกี่ยวต้องล้ม | EQ-3 (M-LAUNCH-043), EQ-7, EQ-8, EQ-10 |
| EO-PHY-2 | ฟิสิกส์ six-DOF | `tests/heavy/sixdof-fingerprint.test.ts` (21 ยาน, 160 s แรก, crosswind) + `tests/rigid-flex-golden.test.ts` (flex ปิดต้องเท่าเดิมทุกบิต) + `tests/heavy/flex-golden.test.ts` รวมกับ EO-PHY-1 เป็น 48 hash ต้องรันทุกครั้งที่แตะ rigid runtime หรือ `targetAttitude` (VER) | R / ไฟล์เทสต์ | เหมือน EO-PHY-1 | เหมือน EO-PHY-1 | เหมือน EO-PHY-1 บน `rigid/runtime.ts` | EQ-8, EQ-10 |
| EO-PHY-3 | live = headless | `tests/live-stepping.test.ts`: เที่ยวบิน point-mass แบบ live เท่ากับแบบ headless ทุกบิต ที่ทุก frame rate และทุก warp | R | บันทึกแล้ว | ห้ามทุกกรณี เพราะเป็นข้อกำหนดของ T02 | ตัด step ตามเวลาเฟรม (สิ่งที่เคยทำ) แล้วเทสต์ต้องล้ม | EQ-3, EQ-7, EQ-10, EQ-12, EQ-15 |
| EO-PHY-4 | ข้อมูลดาวเทียม | `tests/d06-satellites-identity.test.ts` + `tests/fixtures/satellites-pre-d06.json` (`c5e2437`) | R | บันทึกแล้ว | P-D ใน PR realism-changing ที่เจ้าของอนุมัติ | แก้ค่า `size` ของ class หนึ่ง 1 ulp แล้วต้องล้ม | EQ-10, EQ-14 |
| EO-PHY-5 | worker และ replay | `tests/session.test.ts` (SimCore ใน worker เทียบกับ InlineSession ทุก frame, event และ sample) + `replay.test.ts`, `rigid-replay.test.ts`, `vostok-replay.test.ts` | R | บันทึกแล้ว | ห้ามทุกกรณี | ทำให้ structured clone ทิ้งฟิลด์หนึ่งฟิลด์ แล้วต้องล้ม | EQ-8, EQ-10, EQ-12, EQ-15 |
| EO-PHY-6 | harness ฟิสิกส์ใหม่ | M-PHYSICS-002 (a)(b)(d) ส่วนตัวนับ (c) เป็นตัววัด; (a) รวมกรณีวงโคจรเอียง 0° (z = 0 และ vz = 0 ตรงตัว, input +0/−0: จับ accumulator ที่เริ่มจาก −0 หรือพจน์แรก) และกรณีแรงไม่จำกัด (mass = 0, input NaN: ตรึงผลเดิมทั้งชุด เทียบ NaN ตามตำแหน่ง) ตาม R0.4 ขั้น 4 | R / `tests/` ไฟล์ใหม่ (Apollo อยู่ในชั้น heavy ถ้าช้า) | R0.4 ขั้น 4 บน CO-6 base, Node 22.23.3 | เหมือน EO-PHY-1 (R4.5 เป็น re-baseline ที่ validate แล้วครั้งเดียว) | (a)(b) เปลี่ยนลำดับการบวกหนึ่งจุดแล้วต้องล้ม; กรณีเอียง 0°: กลับเครื่องหมายของศูนย์ในส่วนประกอบ z ของ `acceleration()` แล้ว hex ต้องต่าง; กรณีไม่จำกัด: นับ `steps` เฉพาะขั้นที่ err จำกัด แล้วต้องล้ม; (d) ใส่ state รั่วใน test double แล้วต้องล้ม | EQ-9, EQ-10, EQ-11 |
| EO-PHY-7 | tolerance tier (เสริม) | fixture ของ M-PHYSICS-060 (1 m / 1 mm/s / 1 step) | R | R0.4 ขั้น 7 หลัง D-3/D-4 | เหมือน EO-PHY-1 | เลื่อนค่าหนึ่งค่าไป 2 เท่าของ tolerance แล้วต้องล้ม | **ห้ามเป็น gate ของ EQ** ใช้เพื่อย้าย Node และ T02 |
| EO-ORB-1 | เครื่องมือ Orbit | digest ของ M-PLAN-010: pass/overflight (249 เหตุการณ์ครบ), eclipse/power, applications, M03, เฟส Apollo | R / `tests/fixtures/` ไฟล์ใหม่ | R0.4 ขั้น 5 บน CO-6 base | O + P ใน R4.6/R8 ที่ validate แล้วและเจ้าของอนุมัติ ส่วน Apollo C01 ต้องคงเดิม เว้นแต่มี re-record ที่ validate แล้ว | รบกวน input หนึ่งตัว 1 ulp แล้ว digest ต้องต่าง; ทิ้ง 1 เหตุการณ์แล้วตัวนับต้องล้ม | EQ-5, EQ-9, EQ-10, EQ-11 |
| EO-STO-1 | storage (ระดับ repository) | differential harness ของ M-PLATFORM-007: ลำดับการทำงานตามสคริปต์ รวมการเขียนข้ามแท็บ และ record ที่เสียหรือใหม่กว่า ต้องให้ storage map เท่ากันทุกไบต์ ค่าที่คืนเท่ากัน และ error code เท่ากัน เมื่อเทียบกับ repository เดิม | D (มีสำเนาอ้างอิงของ implementation เดิมในเทสต์) | PR แรกของ R1.6 ขั้น b (S10) ก่อน PR identical-output ของ storage | ไม่มี golden การเปลี่ยนรูปแบบไม่ใช่ EQ แต่เป็น feature ที่ต้องมี version bump + migration (S02 §02.13 ข้อ 15) | สลับลำดับ key ใน `JSON.stringify` แล้วต้องเจอ byte diff | R1.6 (M-PLATFORM-003/006/007/012/013/014) |
| EO-STO-2 | storage (ระดับเบราว์เซอร์) | diff ของ storage record หลังจบ journey (M-PLAN-018) | D | ราย PR บน merge-base | — | เติม whitespace ใน record แล้วต้องเจอ diff | R1.6, FX-2 (M-LEARNING-002), EQ-15 |
| EO-UI-1 | พิกเซล | `readPixels` hash ที่ seed, เวลาจำลอง และกล้องคงที่, DPR 0.5, SwiftShader และ binary เดียวกัน ฉากที่ใช้: home, pad, เฟรมจาก replay cursor, Orbit ที่หยุด, Watch และ canvas ของกราฟที่มองเห็น เวลาที่บันทึกจาก replay cursor ไม่ใช่แค่ T+0…5 s ต่อ site แต่รวม staging (แยกขั้นและฝาครอบ), abort (G06, `render/escape.ts`), booster landing (grid fin และขาของ stage ที่กู้คืน, `render/debris.ts`) และ debris re-entry (เฟส entry และ stage ที่ตก) เพราะ state ต่อเที่ยวบินที่ cache ของ EQ-2 ต้องสร้างใหม่ทุกครั้งแสดงผลที่ช่วงเหล่านี้ ฉากที่ทำ deterministic ไม่ได้ใช้เป็น oracle ไม่ได้ | D | ราย PR บน merge-base | ไม่มี การเปลี่ยนภาพไม่ใช่ EQ (ต้องให้เจ้าของอนุมัติภาพหน้าจอ) | เปลี่ยนสี material หนึ่งชิ้น 1/255 แล้ว hash ต้องต่าง; เลื่อนจังหวะกางขาใน `updateRecovery` ของ `render/debris.ts` ให้ช้าลงเล็กน้อยแล้วภาพ ณ เวลา landing ต้องต่าง | EQ-2, EQ-3, EQ-4, EQ-7, EQ-10, EQ-12, EQ-13, EQ-14, EQ-15, CO-4 ขั้น 10; FX-8 ใช้เทียบภาพหลังกู้ |
| EO-UI-2 | draw และ program | probe นับ draw ต่อเฟรมต่อ canvas (เทคนิคของ R1.3) + shader program ที่สร้างและที่ซ้ำ เป็น oracle เมื่อ PR อ้างว่าการวาดไม่เปลี่ยน แต่เป็นตัววัดผลเมื่อ PR ตั้งใจตัดการวาดที่ซ้ำ (เช่น KPI-09) | D | ราย PR | ไม่มี | เพิ่ม mesh ที่ซ่อนอยู่หนึ่งชิ้น แล้วจำนวน draw ต้องต่าง | EQ-2, EQ-3, EQ-4, EQ-14, EQ-15 |
| EO-UI-3 | DOM | snapshot ของ root ที่ระบุชื่อ (ข้อความ, attribute, aria, เป้าหมาย focus) หลังขั้นตอนตามสคริปต์ ใน TH/EN/RU และ viewport ของ S04 โดยค่าที่เปลี่ยนตามเวลาถูกตรึงด้วยเวลาจำลองคงที่ | D | ราย PR | ไม่มี | แก้ `aria-label` หนึ่งตัว แล้วต้องเจอ diff | EQ-3, EQ-4, EQ-5, EQ-6, EQ-7, EQ-12, EQ-13, EQ-14, EQ-15, R1.6, FX-2 (M-LEARNING-002), CO-4 ขั้น 4 และ 10 |
| EO-UI-4 | journey ทั้งชุด | inventory ของ journey ใน Pages ผ่านทั้งหมด ไม่มีกรณีหาย ซ้ำ หรือข้าม (VER union) | D | ราย PR | — | journey ทุกตัวต้องมีหลักฐาน sabotage (process lesson 20) | EQ-7, EQ-8, EQ-13 (ร่วมกับ M-BUILD-024), EQ-15 |
| EO-UI-5 | การตัดสินของ GlowGovernor | log การตัดสินของ governor สำหรับ trace เวลาเฟรมที่ตายตัว: init script แทน `requestAnimationFrame` ด้วยตัวขับที่ส่ง timestamp ตามสคริปต์ (warmup 240 เฟรม, ช่วงช้ากว่า 1/24 s ที่เปิดการทดลอง, ช่วงที่ปิด glow แล้วไม่เร็วขึ้นและเร็วขึ้น, เฟรม ≥ 0.1 s, แท็บซ่อน และช่วง fast-forward ที่สั่งผ่าน UI ได้ซ้ำ) แล้วบันทึก `scene.bloomEnabled` และ `scene.physicalSkyEnabled` ทุกเฟรมผ่าน `window.orbitlab` log คือรายการ (เลขเฟรม, glow on/off, sky on/off) ต้องเท่ากันทุกแถว ครอบทั้งตัว governor (`src/render/glow-governor.ts`) และการต่อสายใน `autoGlow` (`da67341:src/main.ts:1766-1776`: เงื่อนไข measuring และ sky รอจน glow ตัดสินเสร็จ) ใช้ profile ใหม่ทุกรอบเพราะ `orbitlab.glow` เก็บค่าที่ผู้ใช้เลือก ส่วนใน scenario ของ perf จริง จำนวนครั้งที่ glow/sky ถูกปิดเป็นตัววัด ห้ามเพิ่ม (OR-2, D-43) | D | ราย PR บน merge-base | ไม่มี การเปลี่ยนนโยบาย governor (M-PLAN-021 ภายใต้ D-43, R2.2r) เป็น PR ชนิดอื่นที่ใช้ log เดียวกันเป็นตาราง before/after | ลบเงื่อนไข `this.glow.settled` ที่ทำให้ sky รอ glow แล้ว log ต้องต่าง | EQ-2, EQ-3, EQ-15; FX-8 (log ต้องเท่าเดิมเมื่อไม่มีการหลุด) |
| EO-EXP-1 | ไฟล์ส่งออก | ไบต์เท่ากันของ CSV (`ui/csv.ts`, CSV ของ Monte Carlo), DOCX (`worksheets/docx.ts`; `zip.ts` ใช้วันที่คงที่ ส่วน `generatedAt` ต้องตรึงใน harness), HTML (journey `case-worksheet-exports`) และไฟล์ results | D | ราย PR | ไม่มี การ sweep ข้อความโดยตั้งใจ (ED-I18N-1) ให้ L-C ตรวจ diff ทีละไฟล์ ห้าม re-record เป็นก้อน (S16) | เปลี่ยนรูปแบบตัวเลขหนึ่งช่อง แล้วต้องเจอ byte diff | EQ-5, EQ-6, EQ-8, EQ-10, EQ-12, EQ-14 (M-LEARNING-006), CO-4 ขั้น 10 |
| EO-I18N-1 | i18n | dump ของทุก key × {en, th, ru} หลัง resolve แล้ว (รวม fallback ไปภาษาอังกฤษ และพารามิเตอร์ชุดคงที่) เป็น JSON + SHA-256 ใช้ร่วมกับ `i18n.test.ts` และ `i18n-counts.test.ts` | D | ราย PR | ไม่มี การเปลี่ยนคำต้องเป็น PR ชนิดอื่น | ลบ key ภาษาไทยหนึ่งตัวจน fallback เป็นอังกฤษ แล้วต้องเจอ diff | EQ-6 (ทั้งสองขั้น), EQ-12, EQ-14 |
| EO-PWA-1 | PWA | หลังติดตั้ง (journey `pwa-offline`) ทุก entry ใน manifest ต้องอยู่ใน cache, SHA-256 (16 hex) ของ body ต้องเท่ากับ `revision`, ไบต์เต็มต้องเท่ากับไฟล์ใน dist, ชุด URL ต้องเท่ากับ manifest และ cold start แบบ offline ต้องผ่าน | D (manifest จาก dist เดียวกัน) | ราย PR | ไม่มี | ส่งไบต์เสียหนึ่งไบต์ระหว่างติดตั้ง แล้วต้องตรวจเจอ | EQ-1, EQ-6, EQ-7, EQ-8 |
| EO-BUN-1 | bundle | build ทั้ง base และ head ด้วย `--sourcemap` ไปที่ outDir แยก (dist จริงยังคง `sourcemap: false`) ชุดของ (source path, SHA-256 ของ sourcesContent) ที่ไม่อยู่ในรายการแก้ที่ PR ประกาศต้องเท่าเดิม เปลี่ยนได้เฉพาะการจัดลง chunk และไม่มี module หายหรือซ้ำ log ต้องไม่มี `INEFFECTIVE_DYNAMIC_IMPORT` รายงานแยกราย entry: main, chunk แบบ lazy และ **worker ทั้ง 12 ตัวแยกกัน** (ไบต์ raw/gzip + ชุด module ของแต่ละ worker) เพื่อให้ PR ของ EQ-6 แสดงได้ว่าไม่มี worker ใด โดยเฉพาะ `recheck.worker` ที่ import แคตตาล็อกบทเรียน ลาก `src/i18n` เข้ามาหรือโตขึ้น และให้ EQ-8 แสดงไบต์ที่ลดราย worker | D | ราย PR | ไม่มี | เพิ่ม module ที่ไม่ได้ใช้หนึ่งตัว แล้ว inventory ต้องต่าง; import `src/i18n` ใน worker หนึ่งตัวแล้วแถวของ worker นั้นต้องต่าง | EQ-6, EQ-7, EQ-8, EQ-10, EQ-14, R1.6 ขั้น c |
| EO-XENG-1 | ข้าม engine | T02: Node กับ Chromium ต่างกันไม่เกิน 1.4e-12 s ของเวลาให้คะแนน และ 1.4e-11 m/s บนเที่ยวบิน และ 5.4e-15 แบบสัมพัทธ์บนแบบ (VALIDATION §9) ทดสอบใน `tests/recheck.test.ts` + journey `recheck` โดย fixture เขียนครั้งเดียว | R (ตารางตรึงเมื่อ 2026-09-30) | บันทึกแล้ว | **ห้ามทุกกรณี และห้ามขยาย tolerance** (RA:(d)8) | เลื่อนค่าที่คาดไว้ 2 เท่าของ tolerance บน branch ทิ้ง แล้วทั้งสองฝั่งต้องล้ม | EQ-8, EQ-9, EQ-10 และทุก PR ที่แตะ worker |

**กฎหยุด (normative):** ถ้า oracle ใดขยับใน PR ชนิด identical-output **PR นั้นไม่ใช่ EQ อีกต่อไป** ห้ามแก้ oracle ห้าม re-record และห้ามเพิ่ม tolerance ขั้นตอนที่ต้องทำ:

1. หยุดงาน แล้วรันซ้ำบน base สองครั้ง
2. ถ้า base ไม่เสถียร แสดงว่า oracle เองมีปัญหา ให้แก้ oracle ใน PR quality-improving แยกต่างหาก แล้วจึงกลับมาทำงานเดิม
3. ถ้า base เสถียรแต่ head ต่าง PR นั้นต้องถูกปฏิเสธ หรือวางแผนใหม่เป็นชนิดอื่น (bug-fix, quality-improving หรือ realism-changing) โดยเจ้าของอนุมัติ และต้องใช้หลักฐานตามชนิดนั้น (S18 §18.9; S14 §14.6 สำหรับความสมจริง)

การ re-record ที่ไม่ได้ตั้งใจนับใน KPI-21 (เป้า 0)

**การ re-record นอก EQ:** ทำได้เฉพาะ PR realism-changing หรือ feature ที่มีครบทุกข้อ: ระบุชื่อแถวพร้อมเหตุผลในหัวไฟล์เทสต์ (แบบเดียวกับหัวไฟล์ `d01-fleet-fingerprint`), มีตาราง before/after ของทั้งสองแบบจำลองการบิน, เจ้าของอนุมัติก่อน merge และรันซ้ำบน SHA ที่ merge

### 07.6 อินพุตสำหรับการปิด G0

เกณฑ์การปิด G0 อยู่ใน S05 §05.4 ("การปิด G0") เจ้าของอนุมัติผ่าน D-59 (ชุด A, K0) และตรวจครบที่ GK1 ส่วนนี้ให้ตารางที่ D-59 ใช้บันทึกว่างาน R0 เดิมแต่ละชิ้นอยู่ที่ใด G1 ผ่านแล้วใน R1 ไม่มีการเปลี่ยนแปลง

| สัญญาหรืองาน R0 เดิม | สถานะ | ข้อความอยู่ที่ (ปัจจุบัน) | ADR หรือบ้านใหม่ | กำหนด |
|---|---|---|---|---|
| LearnerRepository / ProfileWorkspace | เสร็จ (R1.1/R1.2) | PROG: บรรทัด "Storage ADR"; `reports/R1.1-storage.md`, `R1.2-profiles-ui.md` | ดัชนี `docs/development/adr/README.md` ชี้ไปที่ข้อความเดิม | K1 |
| FlightLifecycle | บางส่วน (มีขา 1) | `src/ui/flight-lifecycle.ts`; `reports/R2-workspace.md` §R2.1 | ADR-FlightLifecycle | K1 ก่อน R3.1r/R5.1 (บันทึกสัญญาที่ส่งแล้วของ R3.1/R3.5) |
| CameraPolicy | สร้างแล้ว (R2.2) | `src/render/camera-policy.ts`; R2 report §R2.2; `tests/camera-policy.test.ts` | ADR-CameraPolicy (ตามที่สร้าง) | K1 |
| GestureOwnership | เสร็จ (R1.3) | `reports/R1.3-gestures.md`; `render/gestures.ts` | ดัชนีชี้ไปที่ข้อความเดิม | K1 |
| CraftState/Handoff (envelope) | v1 (+ `origin.design` แบบ optional จาก #80) | `7662ead:src/orbit/handoff.ts` | ADR-Handoff (ตรึง v1 + DesignRef ตามที่ส่ง) | K1 ก่อน R3.1r และ R5.1 |
| CraftState (สถานะฟิสิกส์) | ยังไม่มี | — | ADR-CraftState ใน PR1 ของ R5.2 (S15; ไม่อยู่ใน R0.2r) | ตาม R5.2 |
| DesignPreview | บางส่วน (R3 package 1, #78, #80) | `R3-design-views.md` บน `7662ead` | ADR-DesignPreview | K1 |
| ResultAction | บางส่วน (#75, #77) | `readinessTarget()` ใน `review-model.ts`; `src/ui/result-actions.ts` (`7662ead`) | ADR-ResultAction | K1 |
| VerificationManifest | เสร็จ (R1.5) | VER; `reports/R1.5-workflows.md` | ดัชนี; R7.3 เพิ่มกฎ EQ, กฎ `--compare` และ D-64 ลงใน VER | — |
| แยก input/derived/estimated/fitted/reference (PLAN:R0.2) | ยังไม่มีเป็นตาราง | — | ADR ระบุชนิดของทุกฟิลด์; ข้อมูลยานอยู่ใน ledger ของ R4.1 (M-PHYSICS-040) | K1–K3 |
| ผลของ PLAN:R0.1 | ดู §07.1 | — | R1.3 (เสร็จ), R4.1, CO-3, M-BUILD-024, CO-6 | K0–K3 |
| PLAN:R0.3: change-to-check map | prose ใน VER | VER:"Change-to-check map" | R0.3r (M-PLAN-014) | K1 |
| PLAN:R0.3: เจ้าของไฟล์ร่วม และประวัติ workflow | อยู่ใน PLAN:§6 และ §9.1 | PLAN v1.2 | S18 (เลนและ hotspot; §18.16 ประวัติ) | CO-8 |
| oracle ของ R0 | ยังไม่มี | — | แคตตาล็อก §07.5 บันทึกบน CO-6 base (R0.4) | K1 แต่ละตัวก่อนผู้ใช้คนแรก (§07.4) |

**สิ่งที่ส่วนนี้ไม่ทำ และเหตุผล** (บ้านของรายการปฏิเสธหรือเลื่อนคือ S19 App C)

| เรื่อง | เหตุผล | ทางที่รักษาคุณภาพแทน |
|---|---|---|
| ใช้ผล unit ของ PR ซ้ำบน Pages (M-PLAN-012) | Pages refresh snapshot ข้อมูล input จึงไม่เหมือนกัน | D-64 ใช้ซ้ำได้เฉพาะ heavy/fleet ด้วย content hash |
| tolerance tier เป็น gate แทน hash | เสียการตรวจแบบ bit-identical (S02 §02.13 ข้อ 24) | EO-PHY-7 เป็น oracle เสริมเท่านั้น |
| hard gate บนเวลาจาก SwiftShader | ค่ามี noise สูง (ช่วง 23–33 s) | gate เฉพาะค่าที่ไม่ขึ้นกับฮาร์ดแวร์; เวลาเป็น trend; อุปกรณ์จริงผ่าน HU-6 |
| commit ภาพ golden ไว้ใต้ `docs/` | ผิดกฎ repo hygiene และภาพ golden เปลี่ยนตามรุ่นของ SwiftShader | EO-UI-1 แบบ differential บนเครื่องเดียวกัน |
