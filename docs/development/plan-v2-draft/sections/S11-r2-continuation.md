## S11 R2 ต่อ: workspace การเข้าถึง ตัวอักษรไทย และข้อมูลป้อนกลับบนเครื่องช้า (R2.1r, R2.2r, R2.3s2, R2.5, R2.6)

> **ขอบเขต:** งาน R2 ที่เหลือหลังผ่าน G2 (CO-3, ดู S06) ทุกแพ็กเกจในส่วนนี้เริ่มได้หลัง G2 เท่านั้น และต้องต่อยอดโมดูลที่ R2 สร้างไว้ (§11.1) ห้ามสร้าง window manager ตัวที่สอง และห้ามมีเจ้าของกล้องตัวที่สอง การเปลี่ยนที่มองเห็นได้ทุกชิ้นต้องได้ภาพหน้าจอที่เจ้าของอนุมัติ โดยใช้ matrix เดียวกับ CO-3 ส่วนนี้เป็นบ้านของ 19 รายการใน 5 แพ็กเกจ เกณฑ์ของ G2 และ "R2 complete" อยู่ใน S05 §05.4 เท่านั้น ส่วนนี้บอกเพียงว่าแพ็กเกจใดส่งหลักฐานข้อใด (§11.7) งานปิด R2 ในคลื่น K0 (LUI-01, U16 ใน HUD ย่อ, กราฟที่ซ่อน, journey) อยู่ใน CO-4/CO-5 (S06) ไม่ทำซ้ำที่นี่
> **ประมาณการรวม (หยาบ, `packages.tsv`):** 44.5 agent-days, ~16 PR เมื่อแตกตามเลนจริงจะได้ PR เล็กราว 22 PR และมี PR เพิ่มที่ `packages.tsv` ยังไม่นับ 1 PR คือ PR1 docs ของ M-PLAN-015 ที่ P ทำ (§11.2) รวมราว 23 PR นอกจากนี้กฎ schema ทำให้การแยก PR ตัวอ่านกับตัวเขียนของ R2.3s2 เป็นข้อบังคับ และต้องรอรุ่นที่เผยแพร่คั่นกลาง (§11.4) ตัวเลขทั้งหมดจะนับใหม่ที่ GK2 คลื่น K2 (R2.3s2 ล้นถึง K3) ทุกแพ็กเกจ `execution_authorized: false` ถ้าเจ้าของยังไม่ตอบ งานรอ ไม่มี agent ตัดสินแทน (D-65)
> **as-of (ตรงกับ S00 §00.1):** ตรวจแบบอ่านอย่างเดียวถึง **2026-10-04 ~21:10Z** — main บน GitHub = `5f9aa2e` (#83 เอกสาร, merge 20:31:34Z); live = `09cc2f5` (#82; Pages 37230585947 สำเร็จ 20:29:40Z เผยแพร่ #80–#82 พร้อมกัน); ไม่มี PR เปิด; R3 ครบตามคำของเจ้าของ (2026-10-04) ส่วนนี้ไม่เขียนสถานะ main, live หรือ PR ซ้ำ การอ้างบรรทัดในโค้ดใช้รูป `<sha>:ไฟล์:บรรทัด` การอ้าง `7662ead` ในส่วนนี้ยังใช้ได้ เพราะโค้ดต่างจาก `5f9aa2e` เฉพาะ `src/main.ts` (+15 บรรทัดจาก #81: บรรทัด `main.ts` บน `7662ead` ที่ส่วนนี้อ้างขยับ +1 (`:928`) หรือ +2 (`:1478` ขึ้นไป) ตาม shift map ใน S00 §00.1 ให้ตรวจซ้ำใน Day 0) และ `tests/browser/harness.mjs` ผลต่อส่วนนี้มีสามข้อ:
> 1. สถานะใน ledger ตรวจบน `da67341` ไฟล์ที่ #75–#80 แตะ ผู้เขียนตรวจซ้ำแบบอ่านอย่างเดียวบน `7662ead` (`gh api`) ผลคือทุกรายการในส่วนนี้ยังเปิดหรือบางส่วนเหมือนเดิม ในขอบเขตของส่วนนี้ มีไฟล์ที่เปลี่ยนเพียง `index.html`, `src/main.ts`, `src/style.css`, `src/ui/panel.ts`, `src/ui/watch.ts`, `src/ui/orbit/playground.css`, i18n และ `docs/USER-GUIDE.md` ไฟล์ต่อไปนี้ไม่เปลี่ยนเลยจาก `da67341` ถึง `7662ead`: `telemetry.ts`, `telemetry-layout.ts`, `timeline.ts`, `hud.ts`, `hudlayout.ts`, `flight-lifecycle.ts`, `engine-levels.ts`, `monte-carlo.ts`, `loop-inspector.ts`, `explore-debrief.ts`, `soundtrack-panel.ts`, `modes.css`, `workspace/registry.ts`, `src/render/**` (รวม `camera-policy.ts`, `glow-governor.ts`), `src/physics/**` และ `src/replay/**` บรรทัดที่อ้างโดยไม่ระบุ SHA มาจาก `da67341` (`status_evidence` ใน ledger) ส่วนไฟล์ที่เปลี่ยนแล้ว ให้ระบุบรรทัดบน `7662ead` ไว้คู่กัน ทุกขั้นต้องตรวจบรรทัดซ้ำบน main ของ Day 0 ก่อนเริ่ม
> 2. #77 (`09a536e`) เพิ่มสามจุดที่อยู่ในขอบเขตของ R2.5 จุดแรกคือข้อความเล็ก `.mission-steps` ที่ `font: 10.5px/1` (line-height 1) และ 9.5 px บนจอแคบ (`7662ead:src/style.css:471-472,1144`) อยู่ในขอบเขตของ 051 และ probe ของ 058 จุดที่สองคือปุ่มในแถบเดียวกันที่ padding 2px 3px (`:477-478`) อยู่ในขอบเขตของ 052 จุดที่สามคือ key คงที่ `data-field` ของช่อง select/input ใน `panel.ts` (`7662ead:src/ui/panel.ts:589,610`) ซึ่ง 056 ใช้ต่อได้ นอกจากนี้ `syncLifecycle` เรียก `syncSteps` ทุกครั้ง (`7662ead:src/main.ts:1478,1490-1522`) แต่เขียน DOM เฉพาะเมื่อ key เปลี่ยน (§11.1)
> 3. การบันทึกข้อเท็จจริงที่เกิดหลังฐานของแผนเป็นหน้าที่ของ CO-2 (M-PLAN-017)

### 11.0 รายการที่ส่วนนี้เป็นบ้าน (19 รายการ, `assignment.tsv`)

| แพ็กเกจ | รายการ (P, ขนาด, สถานะ) | เลน | คลื่น | หยาบ (agent-days / PR) | การตัดสินที่ต้องรอ |
|---|---|---|---|---|---|
| R2.1r | M-LAUNCH-002 (P1, M, บางส่วน), M-LAUNCH-003 (P2, M, บางส่วน), M-PLAN-009 (P3, S, เปิด), M-PLAN-015 (P2, M, เปิด) | U + I; P ทำ 015 (C/I เฉพาะ hook ถ้าต้อง) | K2 | 13.5 / 4 | D-36 (=PLAN:D08) + ความสูงฉากขั้นต่ำ; D-70 เฉพาะถ้าจะใช้ทาง (ก) ของ 015 |
| R2.2r | M-LAUNCH-012 (P3, XS, เปิด), M-LAUNCH-061 (P3, XS, เปิด), M-PLAN-021 (P2, S, เปิด) | C + I (L-UI ข้อความ) | K2 | 2.5 / 2 | D-43 |
| R2.3s2 | M-LAUNCH-014 (P2, L, เปิด) | U (+I สำหรับ CSS กลาง) | K2–K3 | 8 / 3 | D-36.A2, D-36.A4 |
| R2.5 | M-LAUNCH-050 (P1, S), 058 (P1, M), 051, 052, 053, 054, 056, 057 (P2, S), 055 (P2, XS), 059 (P3, S, บางส่วน) | Q เป็น gate; I/U/C/O แก้ตามไฟล์ที่ตนเป็นเจ้าของ | K2 | 16.5 / 6 | D-44 (ตามกติกา DEC:D-17) |
| R2.6 | M-LAUNCH-062 (P2, M, เปิด) | V (+C, I) | K2 | 4 / 1 | D-39 |

สรุป: เปิด 16, บางส่วน 3 (002, 003, 059) · P1 3 รายการ (002, 050, 058), P2 12, P3 4 · ชนิดใน ledger (ux, a11y, quality, feature, bug, realism) เป็นข้อมูลเดิม ส่วนชนิดของ PR กำหนดทีละขั้นในแต่ละแพ็กเกจ

### 11.1 สัญญาที่ R2 สร้างไว้และงานต่อจากนี้ต้องรักษา

| สัญญา | ที่อยู่ (`da67341`, R2S §4) | กฎสำหรับงานในส่วนนี้ | ตรวจด้วย |
|---|---|---|---|
| FlightLifecycle (UI) | `src/ui/flight-lifecycle.ts`: `missionStage()`, `setupCollapsed()`; ขับโดย `App.syncLifecycle()` และเขียน `body[data-flight-stage]`, `body[data-setup]` | layout ใหม่ทุกแบบ (แถบคำสั่ง, ช่วง Analysis, จอเตี้ย) อ่าน stage จากที่นี่ และ key CSS จาก attribute เดิม ห้ามสร้าง state ซ้ำ ขา live clock และ display cursor ยังอยู่ใน `App.player`/`playing` การขยายสัญญาเป็นงานของ ADR ใน R0.2r (S07) guard ของ LUI-01 (CO-4 ขั้น 1) ต้องคงอยู่ | `tests/flight-lifecycle.test.ts`, journey `r2-flight-shell` |
| CameraPolicy | `src/render/camera-policy.ts`, `App.camPolicy`; ทางผู้ใช้คือ `setCamera()` ทางอัตโนมัติคือ `showCamera()`; `App.autoCamera` ถูกลบแล้ว | ฟีเจอร์ใหม่ (แถวกระโดดของ R2.6, reduced motion ของ R2.5, ประกาศ fallback ของ R2.2r) เปลี่ยนกล้องผ่าน `camPolicy.choose()` ในฐานะการเลือกของผู้ใช้เท่านั้น ห้ามเพิ่มเส้นทางอัตโนมัติ และห้ามฟื้น boolean เดิม | `tests/camera-policy.test.ts` (7 กรณี) ผ่านโดยไม่แก้ |
| telemetry-layout schema v1 | `src/ui/telemetry-layout.ts`: `TELEMETRY_LAYOUT_VERSION = 1`; `parseTelemetryLayout` (`:61`) ไม่รับเวอร์ชันอื่นและ fallback เป็นการ์ดทั้งหมด เมื่อผู้ใช้เปลี่ยน preset หรือการ์ด `telemetry.ts:272` จะเขียนรูปแบบ v1 กลับลงไป ตัวอ่านที่ live วันนี้จึงเขียน v1 ทับข้อมูล v2 ได้ (S05 ความเสี่ยงข้อ 2) | การเปลี่ยนรูปแบบใดก็ตามต้องมีสี่อย่าง: (1) bump เวอร์ชัน (2) migration จาก v1 ที่ไม่เสียข้อมูล (3) **กฎ schema bump**: ตัวอ่าน v2 ต้องออกในรุ่นที่เผยแพร่แล้วก่อนตัวเขียนหนึ่งรุ่น (S10 §10.1 ข้อ 9) ตัวอ่านต้องคงฟิลด์ที่ไม่รู้จักไว้ และไม่เขียนทับ record ที่ใหม่กว่า (4) ซ้อม revert ที่ GK ของคลื่นที่ตัวเขียน merge (G7 ใน S05 §05.4; ขั้นตอน rollback rehearsal ใน S17 §17.2 กฎข้อ 3) R2.3s2 กับ M-LAUNCH-003 ใช้การ bump ครั้งเดียวร่วมกัน ตัวอ่าน v2 จึงต้องรู้จักช่องสถานะกลุ่มของ 003 ตั้งแต่แรก | `tests/telemetry-layout.test.ts` + fixture ตัวอ่าน (v1, v2, รุ่นใหม่กว่า, ข้อมูลเสีย) + ผลซ้อม revert ใน report |
| engine-levels helper | `src/ui/engine-levels.ts`: `engineLevels()`, `formatEngineLevels()` | การแสดงระดับเครื่องยนต์จริงทุกที่ใช้ helper นี้ (CO-4 ขั้น 9, M-PHYSICS-052 ใน R4.2) ห้ามมี formatter ตัวใหม่ | `tests/engine-levels.test.ts` |
| นาฬิกาสองตัว | `Space` = playback, `Shift+Space` = live flight; รายการที่มี focus ไม่ส่งคำสั่ง (`timeline.ts:496-516`) | แถวกระโดด, ปุ่มคีย์บอร์ดของ dock/resize และ dialog ใหม่ ต้อง `stopPropagation` แบบเดียวกับ chooser และห้ามชนกับ `onKey` | journey: ลูกศรในรายการไม่ seek |
| ResizeObserver | renderer resize และ camera aspect จริง ไม่ยืด `#gl` ด้วย CSS | layout ใหม่ทุกแบบต้องเปลี่ยนขนาด canvas ด้วยการ resize จริง | journey ตรวจว่า backing store โตขึ้น (`r2-flight-shell.mjs:53-59`) |
| `orbitlab.telemetryLayout` เป็นของโปรไฟล์ | `WORKSPACE_KEYS` (`workspace/registry.ts:10`) คู่กับ `orbitlab.hudLayout` และ `orbitlab.glow` | key ใหม่ (เช่น การจัดหน้าต่าง, ทางเลือกท้องฟ้า) ต้องลงทะเบียนผ่าน L งานที่เพิ่มการเขียนต่อโปรไฟล์ต้องรอ R1.6 ขั้น b (parse cache M-PLATFORM-007, ดู S10) | เทสต์ registry ของ R1; KPI-13 ไม่ถอย |
| ไม่เพิ่มงาน DOM ต่อ rAF | บทเรียนจาก R2S §5: `syncLifecycle` และ `markChooserCurrent` ทำงานทุก rAF ซึ่ง CO-4 (M-LAUNCH-022) และ EQ-3 (M-LAUNCH-024) ตามแก้ บน `7662ead` `syncLifecycle` เรียก `syncSteps` ของ #77 ด้วย ฟังก์ชันนี้สร้าง key และเรียก `handoffAvailable` ทุก rAF แต่เขียน DOM เฉพาะเมื่อ key เปลี่ยน (`main.ts:1490-1522`) EQ-3 จึงต้องย้ายไปพร้อมกัน | UI ใหม่ในส่วนนี้อัปเดตใน block 10 Hz หรือเมื่อเกิดเหตุการณ์เท่านั้น | KPI-10 ไม่ถอย; probe นับการเรียก DOM ใน `frame()` ต้องไม่เพิ่ม (EO-UI-2, S07) |
| ข้อความใหม่ | key ใหม่ 13 ตัวของ R2 เป็นรูปแบบเดิม | key ใหม่ทุกตัวครบ EN/TH/RU ใน PR เดียว ถ้า EQ-6 (หน้าต่าง K2 วันที่ 1–2) merge แล้ว ให้ลงโมดูลของฟีเจอร์ ศัพท์ไทยให้ L-C ตรวจ (การนำวิถี/การนำร่อง) | parity test ของ i18n; EO-I18N-1 ของ key เดิมไม่เปลี่ยน |

### 11.2 R2.1r — แถบคำสั่งกะทัดรัด ช่วง Analysis จอเตี้ย telemetry แบบสรุปก่อน และข้อมูลป้อนกลับที่ซื่อตรงบนเครื่องช้า

#### R2.1r — ส่วนที่เหลือของ R2.1 หลัง D-36
- **เลน:** U (`telemetry*`) + I (`main.ts`, `index.html`, `style.css`, `modes.css` ผ่าน I-train); P ทำ M-PLAN-015 (ข้อมูลใน `VisualFrame`, ฟังก์ชัน interpolate และ live stepping ใน recorder ซึ่งเป็นไฟล์ของ P ตาม S18 §18.3.5) ส่วน C/I ทำเฉพาะ hook ของทางวาดถ้าต้องมี **คลื่น:** K2 **ประมาณการ (หยาบ):** 13.5 agent-days, 4 PR (ลำดับด้านล่างเป็น 6 PR) **OR:** OR-2, OR-3, OR-6
- **ขึ้นกับ:** G2 และ D-36 พร้อมความสูงฉากขั้นต่ำ (CO-3); CO-4 ครบ 10 ขั้น (ขั้น 9 ทำให้ kN และระดับจริงอยู่ใน HUD ย่อแล้ว); CO-5 (smoke slice ป้องกัน regression); M-PLAN-015 ขึ้นกับ CO-6 และ R0.4 และขึ้นกับ D-70 (S08) เฉพาะถ้าจะใช้ทาง (ก) **ปลดล็อก:** ED-CLASS-2 (M-LEARNING-044 โหมดนำเสนอ), การตรวจรับ R2.1 ตาม §11.7 (R3.5 ส่งมอบแล้วกับ G3 จึงไม่รอ R2.1r อีก)
- **fold:** ไม่มีแถวใน `folds.tsv` เสนอให้วางติดกันสองจุด (1) 003 อยู่ในเลน U ระหว่าง R2.3s2 PR2b กับ PR3 เพื่อให้ memo ของ M-LAUNCH-023 ทำกับ API สุดท้ายเพียงครั้งเดียว (2) M-PLAN-009 ตามหลัง EQ-3 PR1 ในเลน I เพราะแก้บรรทัดป้ายเดียวกัน
- **ชนิดการเปลี่ยนต่อ PR:** (1) quality-improving: 002 แถบคำสั่งและจอเตี้ย (I) (2) quality-improving: 002 layout ของ Analysis หรือ docs: บันทึกว่า "ไม่ต้องมี" พร้อมภาพ (3) feature: 003 (U) (4) quality-improving: M-PLAN-009 (I) (5) docs: M-PLAN-015 PR1 บันทึกการออกแบบ (P) (6) quality-improving ด้านภาพ โดยฟิสิกส์ไม่เปลี่ยน: M-PLAN-015 PR2 (P; ภาพ live และ replay เปลี่ยนพร้อมกันผ่านฟังก์ชันเดียว)

##### M-LAUNCH-002 — แถบคำสั่งและเล่นซ้ำกะทัดรัด, layout ช่วง Analysis และจอเตี้ย
- **ที่มาเดิม:** R2S:R2.1 band, R2S:R2.1 analysis layout, R2S:U02, RW:INF-18, PLAN:U02 · **สถานะ:** บางส่วน · **P / ขนาด:** P1 / M · **เลน:** I (+U)
- **เรื่องและเหตุผล:** R2 คืนความกว้างให้ฉากแล้ว (viewport 638 → 940 px) แต่แถบ `#controls` (`index.html:168-190`; `7662ead:169-190`) ยังไม่ถูกย่อ มีเพียงปุ่ม ⚙ ที่เพิ่มเข้ามา `body[data-flight-stage=analysis]` ยังไม่มี CSS ของตัวเอง ที่ 1280×800 เมื่อเปิด first-use guide ฉากยังเตี้ย (รายงาน R2) และขนาด 1100×650 ยังไม่เคยทดสอบ (IMPLEMENTATION-STATUS:641) ผู้ใช้แล็ปท็อปและโปรเจกเตอร์ในห้องเรียนจึงเห็นฉากเล็กกว่าที่ควร
- **ไฟล์:** `index.html:168-190` (`7662ead:169-190`), `src/style.css` (บล็อก `body[data-setup]`/`data-flight-stage` ราว `:1342-1391`; `7662ead:1364-1413`), `src/ui/modes.css`, `src/main.ts` (`syncLifecycle`)
- **เกณฑ์รับ:**
  - ที่ 1280×800 (เปิด guide), 1100×650, 1366×768 และ 1280×720 ความสูงฉากในช่วง Flight ≥ ค่าขั้นต่ำของ D-36
  - Abort, play/pause, นาฬิกา, live/replay, `#rigid-controls` และ `#toru-controls` อยู่ในจอและกดได้ทุกขนาด ไม่ซ่อนและไม่ย้ายเข้าเมนู
  - เป้ากด ≥24 px (44 px บน coarse pointer) และป้าย TH/RU ไม่ถูกตัด
  - ช่วง Analysis มีลำดับ (ฉาก, ผลและตัวเลขหลัก, เวลา, ข้อมูลรอง) หรือมีบันทึกว่า "ไม่ต้องมี" พร้อมภาพที่เจ้าของอนุมัติ
  - first-use guide ไม่ถูกซ่อนเอง (ผู้ใช้ปิดเอง ตามรายงาน R2)
- **วิธีพิสูจน์:** `r2-flight-shell` วัดความสูงแถบและฉากก่อน/หลัง และต้องล้มบนฐานที่ค่าขั้นต่ำ · assertion "มองเห็นและกดได้" ด้วย `elementFromPoint` ทุก control สำคัญในทุก viewport · EO-UI-3 ยืนยันว่าไม่มี control หาย · ภาพตาม matrix ของ CO-3 ให้เจ้าของอนุมัติ
- **ขึ้นกับ:** D-36, CO-4, CO-5

##### M-LAUNCH-003 — telemetry แบบสรุปก่อน รายละเอียดเมื่อขอ
- **ที่มาเดิม:** R2S:R2.1 telemetry grouping, PLAN:R2.1 · **สถานะ:** บางส่วน · **P / ขนาด:** P2 / M · **เลน:** U
- **เรื่องและเหตุผล:** preset ของ R2.3 เลือกการ์ดได้ แต่ยังไม่มีแถวสรุปหรือการขยายรายละเอียด (`telemetry-layout.ts:1-17`) นักเรียนจึงเห็นตัวเลขทุกตัวด้วยน้ำหนักเท่ากัน และหาตัวเลขสำคัญไม่เจอ
- **ไฟล์:** `src/ui/telemetry.ts`, `src/ui/telemetry-layout.ts` (registry กลุ่มที่สร้างจาก `CHART_DEFS`), `src/style.css` (I-train), i18n
- **เกณฑ์รับ:**
  - แถวสรุป (ความสูง, ความเร็ว, apsides, stage, Δv) อยู่บนสุดเสมอ
  - กลุ่มรายละเอียดขยายในที่ และเมื่อเปิดกลับวาดจาก displayed frame (กฎเดียวกับ `setLayout`)
  - control สำคัญไม่อยู่ในกลุ่มที่พับได้ ข้อมูลไม่หาย ทุกกราฟเข้าถึงได้ในหนึ่งคลิก
  - TH/EN/RU ที่ 320/390 px ไม่ล้น
  - ถ้าจำสถานะกลุ่ม ให้ใช้ schema v2 เดียวกับ R2.3s2 (bump ครั้งเดียว) และเขียนสถานะกลุ่มได้หลังรุ่นที่มีตัวอ่าน v2 เผยแพร่แล้วเท่านั้น (กฎ schema bump ใน §11.1, §11.4)
- **วิธีพิสูจน์:** unit test ของ registry กลุ่ม · journey: พับและเปิดกลุ่มระหว่าง replay แล้วกราฟต้องตรงกับ cursor · EO-UI-1 ของกราฟที่มองเห็นเท่าเดิมเมื่อเปิดทุกกลุ่ม · ภาพให้เจ้าของ
- **ขึ้นกับ:** D-36, M-LAUNCH-038 (EQ-12 PR1), R2.3s2 PR2

##### M-PLAN-009 — ข้อมูลป้อนกลับที่ซื่อตรงระหว่างบิน six-DOF นาน
- **ที่มาเดิม:** UXR:(b)6, UXR:(c), PB:steady state, DEC:D-27 · **สถานะ:** เปิด · **P / ขนาด:** P3 / S · **เลน:** I (+L-UI ข้อความ)
- **เรื่องและเหตุผล:** ป้าย `#achieved-warp` บอกแค่ "ความเร็วจำลองที่ทำได้จริง: {rate}× · ใช้ขั้นเวลาฟิสิกส์คงที่" (`th.ts:227`) ไม่บอกความเร็วที่ขอ สาเหตุ หรือเวลาที่ต้องรอ PB วัดว่าขอ 100× ได้จริง 8.3× (worker ใช้ราว 0.8 core) และ UXR (c) พบว่าไม่มีข้อมูลความคืบหน้าระหว่างบิน six-DOF นาน ผู้ใช้บนเครื่องช้าจึงไม่รู้ว่าต้องรอนานเท่าใด
- **ไฟล์:** `src/main.ts` (การวัด rate และป้าย `:1815-1831`; บน `7662ead` อยู่ที่ `:2027-2043`), `index.html:188` (`7662ead:index.html:189`), pure function ใหม่ `warpFeedback()` ใน `src/ui/`, i18n
- **เกณฑ์รับ:**
  - แสดง "ขอ N× · ได้จริง M×" พร้อมสาเหตุหนึ่งข้อจากข้อมูลที่มีอยู่แล้ว (`session.kind`, งบต่อเฟรมที่ส่งให้ worker, `document.visibilityState`): worker คำนวณเต็มกำลัง / คำนวณบนเธรดหลักซึ่งจำกัด 8 ms ต่อเฟรม / แท็บอยู่เบื้องหลัง ถ้าแยกไม่ได้ให้เขียนว่า "จำกัดโดยความเร็วเครื่อง"
  - "ถึง <เหตุการณ์ที่วางแผนไว้ถัดไป> ในราว X นาทีที่ความเร็วนี้" แสดงเฉพาะเมื่อรู้เวลาล่วงหน้า (เช่น `nextBurnTime` ของ coast) ถ้าไม่รู้ไม่แสดง
  - ใช้ค่า `achievedWarp` ตัวเดียวกับ `getPerformance()` และอัปเดตตามหน้าต่างวัดเดิม (0.5 s / 2 s) ไม่ใช่ทุก rAF
  - ไม่มีการเร่งปลอม ไม่ข้าม step และไม่สลับ flight model
- **วิธีพิสูจน์:** unit test แบบตารางของ `warpFeedback()` · journey six-DOF Falcon 9 ค่าเริ่มต้นที่ 100×: ป้ายมีทั้งค่าขอและค่าได้จริง, ค่าได้จริง ≤ ค่าขอ และเท่ากับ `getPerformance().achievedWarp` · EO-PHY-3/EO-PHY-5 ไม่เปลี่ยน · ถ้าต้องให้ worker รายงานเวลา CPU ของตน ถือเป็นการเปลี่ยน protocol ของ worker ต้องแยก PR และ EO-PHY-5 ต้องไม่เปลี่ยน
- **ขึ้นกับ:** EQ-3 PR1 (M-LAUNCH-024 cache ป้ายเดียวกัน)

##### M-PLAN-015 — ภาพระหว่าง held coast ของ six-DOF ไม่นิ่งแล้วกระโดด ทั้ง live และ replay (ฟิสิกส์ไม่เปลี่ยน)
- **ที่มาเดิม:** RA:(c)#8, RA:(a) six-DOF, `docs/PHYSICS.md` §2n · **สถานะ:** เปิด · **P / ขนาด:** P2 / M · **เลน:** P (ข้อมูล held coast ใน `VisualFrame`, ฟังก์ชัน interpolate และ live stepping ของ recorder ซึ่งเป็นไฟล์ของ P ตาม S18 §18.3.5 จึงเข้าคิว P ทีละ PR) + C/I เฉพาะถ้าทางวาดใน `main.ts` ต้องเปลี่ยน (hook ผ่าน I-train)
- **เรื่องและเหตุผล:**
  - **ฟิสิกส์ของ held coast:** six-DOF เดิน held coast ทีละ step 10 s ด้วยแรงโน้มถ่วง J2 (`propagateJ2Coast` ใน `heldCoastStep`, `src/physics/sim/rigid-link.ts:171-173`) และหมุนท่าทางตามการหมุนของทิศความเร็ว โดยคง lag ที่ autopilot ถือไว้ (`rigid-link.ts:24-37`)
  - **live:** ที่ 1× live รอให้ครบ step ภาพจึงนิ่ง 10 s แล้วกระโดด (วัดแล้ว: 599 เฟรมที่ 60 fps ไม่เปลี่ยน บน LEO quick start ที่ 200 km)
  - **point-mass แก้เรื่องนี้ไปแล้ว:** live เดินล่วงหน้าไม่เกินหนึ่ง step และ `recordNow` วาดเวลาบนจอด้วย `interpolateFrames` ตัวเดียวกับ replay seek (`player.frameAt`) แต่ recorder เปิดทางนี้ให้ point-mass เท่านั้น (`lookahead = !sim.rigidRuntime`, `src/replay/recorder.ts:400`)
  - **replay:** `interpolateFrames` ใช้ Kepler กับเฟรมที่ไม่ใช่ rigid เท่านั้น (`src/physics/frame.ts:761`) ระหว่าง coast เฟรม six-DOF จึงได้ตำแหน่งจากเส้นตรง (lerp) ผลประมาณจากเรขาคณิต (L²/8R) คือเส้นตรงตัดโค้งราว 115 m กลางช่วง 10 s และราว 1 km กลางช่วง 30 s ใน LEO ยังไม่ได้วัด ให้ PR1 วัด replay จึงมีปัญหาคุณภาพภาพในตระกูลเดียวกัน
  - ไฟล์ทั้งหมดข้างบนไม่เปลี่ยนจาก `da67341` ถึง `7662ead`
- **การออกแบบที่เลือก = ทาง (ข) (ค่าเริ่มต้น):**
  - P บันทึกข้อมูลของ held coast ลงใน `VisualFrame` ที่บันทึกไว้ (`captureFrame`, `frame.ts:417`) ข้อมูลนี้คือ conic หรือข้อมูล interpolate ของ step เช่น state ปลาย step ที่ `heldCoastStep` คำนวณอยู่แล้ว พร้อมช่วงเวลาที่ใช้ได้ PR1 เลือกรูปแบบโดยวัดกับขอบเขตด้านล่าง
  - P ขยายฟังก์ชันเดียว `interpolateFrames` ให้ใช้ข้อมูลนี้กับเฟรม rigid ระหว่าง held coast ทั้งตำแหน่งและท่าทาง
  - live ใช้ทางเดียวกับ point-mass คือเดินล่วงหน้าไม่เกินหนึ่ง held step แล้ว `recordNow` วาดผ่านฟังก์ชันนี้ ส่วน replay เรียกฟังก์ชันเดียวกัน
  - ผลคือไม่มีทางวาดที่สอง (S02 §02.9 ข้อ 2) และ replay ของ coast six-DOF ได้ภาพบนโค้งด้วย
  - ข้อมูลใหม่เป็นข้อมูลภาพในเฟรม ไม่ใช่ state ของฟิสิกส์ เงื่อนไขที่ held coast ใช้ได้ไม่เปลี่ยน (S02 §02.13 ข้อ 33) เหตุการณ์ของ step ที่เดินล่วงหน้ายังถูกกั้นไว้จนนาฬิกาถึงตามกลไกเดิมของ recorder
- **ทาง (ก) วาดด้วย Kepler ในส่วนวาด — ไม่รับเป็นค่าเริ่มต้น:**
  - **ทาง (ก) คือ:** ส่วนวาดคำนวณ Kepler จาก state ล่าสุดและหมุนท่าทางตามทิศความเร็วเอง แล้วแทนที่ด้วยผลจริงเมื่อ step ใหม่มา
  - **เหตุผลที่ไม่รับ (1):** เป็นทางวาดที่สองที่ replay ไม่ใช้ ภาพ live กับ replay ที่ t เดียวกันจึงต่างกันได้
  - **เหตุผลที่ไม่รับ (2):** ใช้ Kepler ทั้งที่ฟิสิกส์เดินด้วย J2
  - **เหตุผลที่ไม่รับ (3):** ใช้ท่าทางจาก heuristic ของส่วนวาดแทนท่าทางที่ฟิสิกส์ถือ
  - **เงื่อนไขที่ใช้ได้:** ต้องมีข้อยกเว้นต่อ S02 §02.9 ข้อ 2 ที่เจ้าของบันทึกไว้แล้ว (D-70 ใน S08; ค่าเริ่มต้นคือ "ไม่")
  - **ขอบเขตของข้อยกเว้น:** แถวข้อยกเว้นต้องระบุว่ายกเว้นเกณฑ์ข้อใด (pixel live = replay) เกณฑ์อื่นทุกข้อด้านล่างยังใช้
- **ไฟล์:** `src/physics/frame.ts` (`VisualFrame`, `captureFrame`, `interpolateFrames`), `src/replay/recorder.ts` (live stepping, `FRAME_BYTES`), `src/physics/sim/rigid-link.ts` (อ่านอย่างเดียว; ห้ามแก้กฎ held coast), `src/main.ts` เฉพาะถ้าต้องมี hook (I-train)
- **เกณฑ์รับ (ขอบเขตกำหนดก่อนรัน ห้ามปรับหลังเห็นผล):**
  - จำนวนเฟรมที่ภาพไม่เปลี่ยนระหว่าง held coast ที่ 1×: 599 → 0
  - pixel hash ของ live ที่เวลา t เท่ากับของ replay ที่ t เดียวกัน (EO-UI-1: seed, กล้อง, DPR และ binary เดียวกัน) วัดที่กลาง held step อย่างน้อย 3 จุด และที่ขอบ step
  - ท่าทางที่วาดตามท่าทางที่ฟิสิกส์ถือ เทียบกับท่าทางจากกฎของ `heldCoastStep` เมื่อแบ่ง step เดียวกันเป็น 10 ส่วน ต้องต่าง ≤ 0.1° และ lag ของ autopilot ต้องคงอยู่ ส่วนวาดไม่มีกฎท่าทางของตัวเอง
  - ตำแหน่งที่วาดกลาง step เทียบกับ step เดียวกันที่แบ่ง 10 ส่วน ≤ 1 m
  - ภาพกระโดดที่ขอบ step ≤ 1 m และ ≤ 0.1° (เทียบกรณี point-mass ใน §2n: ≤ 8 cm บน coast และ ≤ 5.9 m ที่ปลาย step 30 s)
  - digest ฟิสิกส์ EO-PHY-1/2/5 เท่าเดิมทุกบิต
  - EO-PHY-3 (live = headless ทุกบิต) ขยายให้ครอบ six-DOF ที่มี held coast และต้องผ่าน
  - คำสั่งของผู้ใช้ที่มากลาง held step มีผลไม่ช้ากว่าวันนี้
  - ค่าของเฟรมที่บันทึก ณ เวลาของเฟรมเองเท่าเดิม ค่ากลางช่วงของ replay six-DOF เปลี่ยนโดยตั้งใจ ถ้ามี test ที่ pin ค่านี้ ต้อง re-record แบบระบุชื่อและให้เจ้าของอนุมัติ (S18 §18.9)
  - วัดหน่วยความจำต่อเฟรมของ recording ก่อนและหลัง (`FRAME_BYTES`, M-PLAN-003) แล้วรายงาน
- **วิธีพิสูจน์:**
  - **PR1 (docs, P):** บันทึกการออกแบบ ครอบคลุมรูปแบบข้อมูลใน `VisualFrame`, การเดินล่วงหน้าของ six-DOF, เวลาที่คำสั่งผู้ใช้มีผล, ผลต่อหน่วยความจำ และค่าวัดของ lerp ใน replay ปัจจุบัน
  - **PR2 (P):** ข้อมูลในเฟรม + `interpolateFrames` + live stepping พร้อม unit test ของฟังก์ชัน, parity test แบบ `live-stepping` สำหรับ six-DOF และ journey ที่เทียบ pixel live กับ replay (ต้องล้มบนฐาน) PR นี้แตะ recorder จึงต้องรัน heavy + fleet ตาม GK
  - **ถ้าทาง (ข) ผ่านขอบเขตไม่ได้:** หยุดและรายงาน ห้ามผ่อนขอบเขต ทาง (ก) ถามใหม่ได้ผ่าน D-70 เท่านั้น
  - ตารางวัดลงใน report
- **ขึ้นกับ:** CO-6 (ฐาน physics), R0.4 (EO-PHY-6 และชุด oracle พิกเซลของ M-PLAN-018), D-70 เฉพาะถ้าจะใช้ทาง (ก)

- **quality guard (OR-2):** ไม่ซ่อนหรือย้าย control สำคัญเพื่อให้ฉากใหญ่ขึ้น; ไม่เปลี่ยน step size หรือ control clock 0.01 s (S02 §02.13 ข้อ 30); ไม่แสดงค่าที่ขอแทนค่าที่ได้จริง; ภาพที่ interpolate ห้ามแสดงเหตุการณ์ก่อนบันทึก; ทุกการเปลี่ยนภาพต้องผ่านภาพหน้าจอของเจ้าของ
- **หลักฐานที่ต้องส่ง:** `docs/development/reports/R2.1r-shell.md` ประกอบด้วยความสูงแถบและฉากก่อน/หลังทุก viewport, ตารางวัดของ M-PLAN-015 เทียบขอบเขต, test ที่รันจริง และแถว PROGRESS ใน PR ที่ merge · **execution_authorized:** false

### 11.3 R2.2r — กล้อง เสียง และนโยบายลดคุณภาพที่ต้องประกาศ

#### R2.2r — งานตามหลังของ R2.2
- **เลน:** C (`src/render/**`) + I (`main.ts`, `index.html`, CSS กลาง ผ่าน I-train); L-UI เขียนข้อความ **คลื่น:** K2 **ประมาณการ (หยาบ):** 2.5 agent-days, 2 PR **OR:** OR-2, OR-6
- **ขึ้นกับ:** G2; D-43 (ชุด B, K1) สำหรับ M-PLAN-021 **ปลดล็อก:** ส่วน low-graphics แบบ opt-in ของ M-LAUNCH-086 (บ้านอยู่ EQ-3; S09 ย้ายส่วนที่ไม่ใช่ EQ มาเป็นขั้นในแพ็กเกจนี้)
- **ไฟล์ที่อนุญาต:** `src/render/camera-policy.ts` (เพิ่มสัญญาณ fallback เท่านั้น การตัดสินเหมือนเดิม), `src/main.ts` (`updateCameraOwner`, `autoGlow`, `setGlow`, `restoreGlow`), `index.html` (ช่องประกาศ), `src/ui/soundtrack-panel.ts`, `src/ui/modes.css`, i18n · `src/render/glow-governor.ts` ไม่แก้ตรรกะ
- **ชนิดการเปลี่ยนต่อ PR:** (1) quality-improving: 012 + 061 (XS ทั้งคู่ รวมได้ถ้าไม่เกิน ~400 บรรทัด) (2) quality-improving: M-PLAN-021 ประกาศและปุ่มย้อน (3) feature: ตัวเลือกกราฟิกต่ำแบบ opt-in (ส่วนที่ไม่ใช่ EQ ของ M-LAUNCH-086)

| รหัส (ที่มาเดิม) | P / ขนาด / สถานะ | เรื่องและเหตุผล | เกณฑ์รับ | วิธีพิสูจน์ | ขึ้นกับ |
|---|---|---|---|---|---|
| M-LAUNCH-012 (R2S:R2.2 fallback, R2S:R2.2 reset semantics) | P3 / XS / เปิด | เมื่อมุมที่ผู้ใช้เลือกมองเป้าหมายไม่ได้ `camera-policy.ts:83-87` สลับไป exterior และคงเป็น manual แต่ `updateCameraOwner` อัปเดตเพียง `aria-pressed`/`data-owner` ผู้ใช้จึงไม่รู้ว่ามุมเปลี่ยนเพราะอะไร | ข้อความสถานะสั้นแบบ polite (ไม่ใช่ modal) บอกชื่อมุมสำรอง หนึ่งครั้งต่อหนึ่ง fallback ครบสามภาษา · ไม่ขโมย focus ไม่ขยับกล้อง ไม่เปลี่ยนการตัดสินของ policy | `camera-policy.test.ts` ผ่านโดยไม่แก้ + unit test ว่าสัญญาณ fallback ออกครั้งเดียว · journey: เลือก onboard แล้วเปลี่ยนเป้าหมาย ต้องเห็นประกาศครั้งเดียว (ล้มบนฐาน) · ภาพให้เจ้าของ | — |
| M-LAUNCH-061 (OD:S8-2, DP:UX-Q1/S8 ส่วนเสียงของ Watch) | P3 / XS / เปิด | ตัวเลือกเสียงและการนำเข้าเพลงในหน้า Watch เปิดอยู่ตลอด (`soundtrack-panel.ts` ไม่มี `<details>`; แสดงเป็น `pickerFooter` ใน `main.ts`) ผู้ใช้ต้องเลื่อนก่อนเริ่มบิน | ตัวเลือกอยู่ใน `<details>` ที่ปิดไว้ · summary ยังบอกสถานะเพลงที่นำเข้า · ไม่มีฟีเจอร์หาย พฤติกรรมเสียงค่าเริ่มต้นไม่เปลี่ยน | journey `watch-controls` ผ่าน · EO-UI-3 ของ picker เท่าเดิมเมื่อเปิด `<details>` · ภาพให้เจ้าของ | — |

##### M-PLAN-021 — ใช้นโยบาย D-43 กับ GlowGovernor: ประกาศพร้อมปุ่มย้อน หรือ opt-in ไม่ลดแบบเงียบ
- **ที่มาเดิม:** UXR:(b)8, UXR:E2, PC:(c)9; รายการคำตัดสิน M-PLAN-005 อยู่ใน S08 · **สถานะ:** เปิด · **P / ขนาด:** P2 / S · **เลน:** C (+I hook, L-UI ข้อความ)
- **เรื่องและเหตุผล:** `GlowGovernor` (`src/render/glow-governor.ts`) ทดลองปิด bloom เมื่อเฟรมเฉลี่ยช้ากว่า 24 fps หลัง 240 เฟรมแรก และปิดต่อเฉพาะเมื่อเร็วขึ้น ≥15 % จากนั้น `skyGovernor` เปลี่ยนท้องฟ้าเชิงฟิสิกส์เป็นแบบไล่สี (`main.ts` `autoGlow`) bloom มีปุ่ม `#btn-glow` แต่ไม่มีประกาศเมื่อถูกปิดเอง ส่วนท้องฟ้าไม่มีปุ่มเลย ย้อนได้ทาง URL `?sky=gradient` เท่านั้น (`main.ts:906`; `7662ead:928`) จึงเป็นการลดคุณภาพแบบเงียบที่ขัด OR-2
- **ไฟล์:** `src/main.ts` (`autoGlow`, `setGlow`, `restoreGlow`), `index.html` (ช่องประกาศ), i18n, `WORKSPACE_KEYS` ถ้ามี key ใหม่ของท้องฟ้า (L ตรวจ) · ตรรกะใน `glow-governor.ts` ไม่เปลี่ยน
- **เกณฑ์รับ (ตามคำตอบของ D-43):**
  - ทางเลือก (ก): ทุกการลดอัตโนมัติแสดงประกาศแบบ polite ที่ไม่ใช่ modal บอกว่าลดอะไรและเพราะอะไร พร้อมปุ่ม "เปิดคืน" ที่แตะครั้งเดียวแล้วคืนค่า, settle governor (การเลือกของผู้ใช้ชนะ heuristic เหมือนปุ่มเดิม) และบันทึกลงโปรไฟล์ ท้องฟ้าได้ประกาศและปุ่มย้อนแบบเดียวกัน
  - ทางเลือก (ข): governor ไม่ทำงานจนกว่าผู้ใช้เปิด "ปรับคุณภาพอัตโนมัติ"
  - ทั้งสองทาง: ตรรกะการตัดสินของ governor ไม่เปลี่ยน ไม่มีเส้นทางลดคุณภาพอัตโนมัติใหม่ และโหมดกราฟิกต่ำเปิดได้โดยผู้ใช้เท่านั้น (เสนอในประกาศได้ แต่ไม่เปิดเอง)
  - ประกาศไม่บังแถบโทรศัพท์ (บทเรียนจาก M-LAUNCH-066)
- **วิธีพิสูจน์:** journey บังคับเฟรมช้า (hook ทดสอบที่ป้อน `sample()` หรือ CPU throttle): ต้องเห็นประกาศและปุ่มย้อน และหลังกดย้อน bloom กับท้องฟ้ากลับมาและคงอยู่ (ล้มบนฐาน) · `tests/glow-governor.test.ts` ผ่านโดยไม่แก้ · บนเส้นทางที่เฟรมเร็ว EO-UI-1 และ EO-UI-3 เท่าเดิม (ไม่มีประกาศ ไม่มีอะไรเปลี่ยน)
- **ขึ้นกับ:** D-43

- **quality guard (OR-2):** ความลื่นบนเครื่องอ่อนไม่แย่ลง เพราะ governor ยังตัดสินเหมือนเดิม; ห้ามลดคุณภาพแบบเงียบ และห้ามขยาย GlowGovernor ก่อนมี D-43 (S02 §02.13 ข้อ 2)
- **หลักฐานที่ต้องส่ง:** `docs/development/reports/R2.2r-camera-sound-quality.md` · **execution_authorized:** false

### 11.4 R2.3s2 — จัดวาง ปรับขนาด และเรียงแผงด้วยตัวควบคุมเดิม

#### R2.3s2 — dock/resize/reorder บน `hudlayout.ts`
- **เลน:** U (+I สำหรับ CSS กลาง; W ปรับ USER-GUIDE) **คลื่น:** K2–K3 **ประมาณการ (หยาบ):** 8 agent-days, 3 PR ของแพ็กเกจนี้ใน `packages.tsv` ลำดับจริงเป็น 4 PR เพราะกฎ schema bump แยก PR ตัวอ่าน (PR2a) ออกจาก PR ตัวเขียน (PR2b) และมีรุ่นที่เผยแพร่คั่นกลาง PR2b แตกเป็น 2b/2c ได้ถ้าเกิน ~400 บรรทัด **OR:** OR-1 (PR1, PR3), OR-2, OR-6
- **ขึ้นกับ:** G2 + D-36.A2/A4; R1.6 ขั้น b (parse cache M-PLATFORM-007, ดู S10) เพราะแพ็กเกจนี้เพิ่มการเขียนต่อโปรไฟล์; EQ-12 PR1; CO-5 **ปลดล็อก:** M-LAUNCH-003 (R2.1r), M-LAUNCH-023 (EQ-12), ช่อง Docking preset ของ R5.4 (M-LAUNCH-015, D-58), "R2 complete"
- **fold (`folds.tsv`):** M-LAUNCH-038 เป็น PR1 ของชุดนี้ (registry ของการ์ด); M-LAUNCH-023 เป็น PR หลัง PR feature เมื่อ API show/hide นิ่งแล้ว (ทั้งสองรายการมีบ้านอยู่ EQ-12, ดู S09)
- **กฎ schema bump (telemetry-layout v2, ใช้บังคับ):**
  - **ตัวอ่านก่อนตัวเขียนหนึ่งรุ่น (S10 §10.1 ข้อ 9):** PR ที่เริ่มเขียน `orbitlab.telemetryLayout` v2 (PR2b และส่วนจำสถานะกลุ่มของ M-LAUNCH-003) merge ได้เมื่อมีรุ่นที่เผยแพร่แล้วอย่างน้อยหนึ่งรุ่นซึ่งมีตัวอ่าน v2 ของ PR2a อยู่ก่อน "รุ่น" คือ Pages จาก exact source และหลัง v1.0 คือ tag การ merge อย่างเดียวไม่นับเป็นรุ่น
  - **เหตุผล:** ตัวอ่าน v1 ที่ live วันนี้ fallback เป็นการ์ดทั้งหมด และเขียน v1 ทับเมื่อผู้ใช้เปลี่ยน (§11.1) ถ้าย้อนรุ่นหรือมีแท็บเก่าเปิดค้าง การจัดหน้าต่างที่ผู้ใช้ทำไว้จะหาย
  - **ซ้อม revert ที่ GK:** ที่ GK ของคลื่นที่ PR2b merge ให้ซ้อมตาม G7 (S05 §05.4) และขั้นตอน rollback rehearsal ของ S17 §17.2 กฎข้อ 3 ขั้นแรกติดตั้งรุ่นที่มีตัวเขียน แล้วสร้าง layout v2 ขั้นที่สองติดตั้งรุ่นก่อนหน้าซึ่งมีตัวอ่าน v2 แล้ว layout ต้องอ่านได้หรือเป็นอ่านอย่างเดียว และไม่ถูกเขียนทับ ขั้นสุดท้ายกลับไปรุ่นใหม่ แล้วค่าที่เก็บต้องเท่าเดิมทุกไบต์ ก่อน v1.0 ใช้ `dist` ของสอง SHA แทน tag
  - ถ้า `orbitlab.hudLayout` เปลี่ยนรูปแบบ ใช้กฎเดียวกัน ข้อยกเว้นต้องมีคำอนุมัติของเจ้าของบันทึกในแถวของแพ็กเกจ

| PR | รายการ | ชนิด | เนื้อหา | oracle / หลักฐาน |
|---|---|---|---|---|
| PR1 | M-LAUNCH-038 (บ้าน EQ-12) | identical-output | ตาราง `CHART_DEFS` เดียว ใช้เป็น registry ของการ์ด | EO-UI-1, EO-EXP-1 ตาม S09 |
| PR2a | M-LAUNCH-014 | feature (ตัวอ่าน; สิ่งที่เขียนยังเป็น v1) | ขยาย `hudlayout.ts` (pure, ไม่มี DOM) ให้รองรับ dock/resize/reorder ของการ์ด telemetry ด้วย `clampRect`, `clampPos`, `resizeRect` ที่มีอยู่ · ตัวอ่าน schema `orbitlab.telemetryLayout` v2 ซึ่งรวมช่องสถานะกลุ่มของ 003 ตั้งแต่แรก, migration จาก v1 ในหน่วยความจำ, คงฟิลด์ที่ไม่รู้จักเมื่อบันทึกซ้ำ และไม่เขียนทับ record ที่ใหม่กว่า (อ่านอย่างเดียวตามกฎ newer-record ของ R1.1) · ยังเขียน v1 เหมือนเดิม · ถ้ารูปแบบที่เก็บของ `orbitlab.hudLayout` เปลี่ยน ให้เพิ่มเวอร์ชันและตัวอ่านใน PR นี้ด้วย (วันนี้ยังไม่มีเวอร์ชัน) | unit test เรขาคณิตและ migration (fixture v1, v2, รุ่นใหม่กว่า, ข้อมูลเสีย); เทสต์ว่าตัวอ่านคงฟิลด์ที่ไม่รู้จักและไม่เขียนทับ v2 ที่ผู้ใช้ยังไม่เปลี่ยน; ข้อมูล v1 ให้ค่าที่อ่านและที่เขียนเท่าเดิมทุกไบต์ (unit test + EO-STO-2 ตาม S07) |
| — | (รุ่นที่เผยแพร่) | — | Pages จาก exact source ที่มี PR2a อย่างน้อยหนึ่งรุ่น บันทึก SHA และ Pages run ในแถว PROGRESS ก่อน merge PR2b ระหว่างรอ เลน U ทำ R2.5 053/056/057 ได้ (§11.9) | Pages run + deployment record |
| PR2b | M-LAUNCH-014 | feature (ตัวเขียน) | เริ่มเขียน v2; ที่จับสำหรับ pointer, touch และคีย์บอร์ด; ปุ่ม "Reset layout"; หน้าต่าง Monte Carlo และ loop inspector ใช้ตัวควบคุมเดียวกัน | journey + ภาพหน้าจอให้เจ้าของ; fixture ซ้อม revert (เขียนด้วยรุ่นใหม่ แล้วอ่านด้วยรุ่นของ PR2a) และผลซ้อมจริงที่ GK |
| (คั่น) | M-LAUNCH-003 | feature | summary-first ของ R2.1r (§11.2) | ตาม §11.2 |
| PR3 | M-LAUNCH-023 (บ้าน EQ-12) | identical-output | memo ของ telemetry pass บน API สุดท้าย | EO-UI-1, EO-PHY-3 ตาม S09 |

##### M-LAUNCH-014 — R2.3 ขั้น 2: dock/resize/reorder, ทางเลือกคีย์บอร์ด, clamp และปุ่ม Reset layout
- **ที่มาเดิม:** R2S:R2.3 step 2, R2S:R2.3 layout persistence, R2S:R2.2 reset semantics (ส่วน reset layout), R2S:U10 (ส่วนจัดวาง), CR:D7, DP:§7.2 หลักการ · **สถานะ:** เปิด · **P / ขนาด:** P2 / L · **เลน:** U
- **เรื่องและเหตุผล:** R2.3 ขั้น 1 ส่งเฉพาะ preset ส่วน `hudlayout.ts` ยังไม่ถูกแก้ ไม่มีปุ่ม reset layout ("All cards" ทำหน้าที่แทน) และ Monte Carlo กับ loop inspector มีโค้ดลากของตัวเอง (CR:D7; `monte-carlo.ts:217-251`) ผู้ใช้ระดับ Engineer จัดพื้นที่ทำงานเองไม่ได้ และหน้าต่างลอยแต่ละแบบทำงานไม่เหมือนกัน
- **ไฟล์:** `src/ui/hudlayout.ts`, `src/ui/telemetry-layout.ts`, `src/ui/telemetry.ts`, `src/ui/hud.ts`, `src/ui/monte-carlo.ts`, `src/ui/loop-inspector.ts`, `src/style.css` (I-train), i18n, `docs/USER-GUIDE.md`
- **เกณฑ์รับ:**
  - ลาก ปรับขนาด และเรียงแผงได้ด้วยเมาส์ สัมผัส และคีย์บอร์ด (ลูกศร + modifier เขียนไว้ใน USER-GUIDE)
  - clamp เมื่อ resize, zoom 125/150 % และที่ขอบ 860/861, 1180/1181
  - "Reset layout" แยกจาก reset กล้องและเริ่มภารกิจใหม่ และคืนค่าเฉพาะ key ของ layout
  - จัดอิสระได้เฉพาะจอกว้างกว่า 860 px (`HUD_PHONE_MAX_WIDTH = 860` มีอยู่แล้ว) โทรศัพท์ใช้ preset และคอลัมน์เดียว (D-36.A4)
  - ค่าเริ่มต้นเหมือนวันนี้ทุกประการจนกว่าผู้ใช้จะจัดเอง; การจัดแผงไม่เปลี่ยน input นาฬิกา หรือฟิสิกส์
  - เขียนลงโปรไฟล์ครั้งเดียวเมื่อจบท่าทาง (pointerup หรือ commit ด้วยคีย์บอร์ด) ไม่เขียนทุก pointermove
  - Monte Carlo และ loop inspector คงข้อยกเว้นและ clamp เดิม
  - เป็นไปตามกฎ schema bump: ตัวอ่าน v2 อยู่ในรุ่นที่เผยแพร่ก่อนรุ่นที่เริ่มเขียน v2 และผลซ้อม revert ที่ GK ต้องไม่เสียข้อมูล layout
- **วิธีพิสูจน์:** EO-UI-1 + EO-UI-3 เมื่อไม่มีการจัดที่บันทึกไว้ต้องเท่าฐาน (ค่าเริ่มต้นไม่เปลี่ยน) · journey: ลาก, resize, คีย์บอร์ด และ reset ที่ 1280×800 และ zoom 150 %; pause/replay และนาฬิกาเท่าเดิม (EO-PHY-3) · journey `gesture-ownership` ผ่าน (ไม่แย่ง gesture กับฉาก, S05 ความเสี่ยงข้อ 4) · KPI-13 ไม่ถอย · ภาพให้เจ้าของ · PR2b merge หลังรุ่นตัวอ่านเผยแพร่แล้ว (SHA และ Pages run ใน report) · ผลซ้อม revert ที่ GK ลงใน report
- **ขึ้นกับ:** D-36, R1.6 ขั้น b, EQ-12 PR1; PR2b ขึ้นกับรุ่นที่เผยแพร่ซึ่งมี PR2a

- **quality guard (OR-2):** ห้ามมี window manager ตัวที่สอง (PLAN:R2.3); control สำคัญ เวลา และสถานะ live ไม่ใช่การ์ด จึงซ่อนหรือย้ายออกจากจอไม่ได้; ห้ามเปลี่ยน storage โดยไม่มี migration และ version bump (S02 §02.13 ข้อ 15) และตัวเขียนต้องออกหลังตัวอ่านหนึ่งรุ่น (S10 §10.1 ข้อ 9)
- **หลักฐานที่ต้องส่ง:** `docs/development/reports/R2.3s2-workspace.md` · **execution_authorized:** false

### 11.5 R2.5 — ฐานการเข้าถึงและตัวอักษรไทย (ประตู Q; ผู้แก้คือเลนที่เป็นเจ้าของไฟล์ ผ่าน I-train)

#### R2.5 — accessibility and Thai typography baseline
- **เลน:** Q ทำ gate และ baseline (T จัดเข้า CI) แล้วแต่ละเลนแก้ไฟล์ของตน: I (`index.html`, `style.css`, `modes.css`), U (`hud.ts`, `panel.ts`, `explore-debrief.ts`, `watch.ts`), C (`cameras.ts` ผ่าน CameraPolicy), O (`src/ui/orbit/**`), B (ถ้า axe พบปัญหาในหน้า Build) **คลื่น:** K2 **ประมาณการ (หยาบ):** 16.5 agent-days, 6 PR ใน `packages.tsv` (ลำดับจริงราว 10 PR เล็ก เพราะคนละเลน) **OR:** OR-2, OR-6
- **ขึ้นกับ:** D-44 (ชุด B, K1) สำหรับ 050; G2; matrix ของ CO-3 สำหรับ 052; M-BUILD-029 (FX-1, CR:D9 ทศนิยมแบบจุลภาคของรัสเซีย, ดู S10) สำหรับ 059 **ปลดล็อก:** "R2 complete" (ส่วน baseline), reduced motion ที่ R6.2 ใช้ (G6, ดู S15), ED-CLASS-2
- **ลำดับขั้น:** (1) Q: 050 ติดตั้ง gate และบันทึก baseline (KPI-26) ก่อนแก้อะไร (2) I: 055 (3) I: 058 แล้ว O: MOB-02 แยก PR (4) I: 051 (5) I: 052 (ขั้น 3–5 อยู่ใน `style.css` ชุดเดียวกัน จึงทำติดกันในเลน I ไม่ให้แก้ซ้ำ) (6) U: 053 (7) C: 054 ส่วนกล้อง และ O: 054 ส่วน Orbit (8) U: 056 (9) U: 057 (10) U/O: 059
- **ชนิดการเปลี่ยนต่อ PR:** ขั้น 1 เป็น quality-improving (เพิ่ม gate และ baseline ในเครื่องมือทดสอบ ไม่เปลี่ยนแอป); ขั้น 8–9 เป็น bug-fix; ขั้น 2 และ 6 เป็น quality-improving ที่ภาพไม่เปลี่ยน; ขั้นอื่นเป็น quality-improving ที่ต้องอนุมัติภาพ · การแสดงผลบน desktop fine pointer คงเดิมทุกพิกเซลในทุกข้อที่ระบุไว้

##### M-LAUNCH-050 — ประตูตรวจการเข้าถึงอัตโนมัติ (axe-core) บนหน้าหลัก EN/TH
- **ที่มาเดิม:** DP:UX-H6-6, RW:A11Y-03 (ส่วนเครื่องมือ), DP:12-28 · **สถานะ:** เปิด · **P / ขนาด:** P1 / S · **เลน:** Q (+T)
- **เรื่องและเหตุผล:** ไม่มี axe-core ใน devDependencies และไม่มี journey ด้านการเข้าถึง (`aria-live` 26 จุดใน 22 ไฟล์ของ `src/` และ `index.html` ไม่เคยถูกตรวจ) การแก้ 051–059 จึงวัดผลไม่ได้ถ้าไม่มี baseline ก่อน
- **ไฟล์:** journey ใหม่ใน `tests/browser/journeys/`, `package.json` (devDependency หนึ่งตัว), การเลือก smoke ใน `scripts/verification/*` (T), CHANGELOG
- **เกณฑ์รับ:**
  - journey รัน axe บน `#/home`, `#/launch/explore`, `#/launch/engineer` (ระหว่างบิน), `#/orbit/explore` และ `#/build/explore` ใน EN และ TH
  - PR แรกบันทึก baseline แล้วตั้ง gate ว่าห้ามมีปัญหาระดับ serious/critical เพิ่ม; เป้าคือ 0 หรือ waiver รายข้อที่เจ้าของอนุมัติ (KPI-26)
  - Pages รันครบ ส่วน PR CI รันเฉพาะ smoke subset ที่ไม่ทำให้ KPI-28 ถอย
  - devDependency หนึ่งตัวพร้อมเหตุผลใน CHANGELOG และไม่เข้า bundle
- **วิธีพิสูจน์:** sabotage: ใส่ปุ่มที่ไม่มีชื่อแล้ว gate ต้องล้ม · บันทึกเวลาที่เพิ่มใน PR CI · axe ไม่แทนผู้ใช้จริง งานกับ screen reader บนอุปกรณ์อยู่ใน HU-6 (S16)
- **ขึ้นกับ:** D-44

##### M-LAUNCH-058 — ตัวอักษรไทยไม่ถูกตัด และแถบแท็บบอกว่าเลื่อนได้
- **ที่มาเดิม:** DP:UX-Q5, RW:FONT-01, RW:MOB-02, DP:12-28 (ส่วนตัวอักษร), RW:S8 · **สถานะ:** เปิด · **P / ขนาด:** P1 / M · **เลน:** I (CSS กลาง) + O (`playground.css`)
- **เรื่องและเหตุผล:** ไม่มีกฎ `:lang(th)` ใน CSS ใดเลย ใช้ line-height 1.2–1.25 ร่วมกับ overflow hidden จึงตัดสระและวรรณยุกต์บนฟอนต์ระบบแบบออฟไลน์ ซึ่งเป็นค่าเริ่มต้นของผู้ใช้ไทย (UXR (b)10) และ `.pg-tabs` (`playground.css:33`) เลื่อนแนวนอนได้แต่ไม่มีสัญลักษณ์บอก
- **ไฟล์:** `src/style.css`, `src/ui/modes.css` (I), `src/ui/orbit/playground.css` (O), CSS ของ Build ถ้า probe พบ (B)
- **เกณฑ์รับ:**
  - `:lang(th)` line-height ≥1.6 ในที่ที่ข้อความตัดบรรทัดได้ ไม่มี letter-spacing และ line-break normal
  - กล่อง overflow hidden สูงพอสำหรับเครื่องหมายซ้อน; KPI-27: clipping = 0
  - แถบแท็บที่เลื่อนได้มี fade หรือลูกศร รวม MOB-02 ใน `ui/orbit` ที่ O ทำตามกฎชุดเดียวกัน
  - EN/RU ไม่เปลี่ยน ยกเว้นจุดที่ระบุ; ใช้ฟอนต์ระบบเท่านั้น
- **วิธีพิสูจน์:** probe `scrollHeight ≤ clientHeight` ทุกกล่อง overflow hidden ที่ 390×844 และ 1280×720 ใน TH/RU/EN (ล้มบนฐาน) · offline journey ไม่มี request ฟอนต์ · EO-UI-1 ของ EN/RU · ภาพให้เจ้าของ · HU-3 ตรวจการอ่าน (S16)
- **ขึ้นกับ:** 050

| รหัส (ที่มาเดิม) | P / ขนาด / สถานะ · เลน | เรื่องและหลักฐาน (`da67341`) | เกณฑ์รับ | วิธีพิสูจน์ | ขึ้นกับ |
|---|---|---|---|---|---|
| M-LAUNCH-051 (RW:A11Y-01) | P2 / S / เปิด · I | `--dim: #6c7b8e` (`style.css:28`) มี contrast 3.88–4.20:1; มีกฎขนาด ≤10 px มากกว่า 16 กฎ (`.hud-title` 9 px); #77 เพิ่ม `.mission-steps` 10.5/9.5 px และสีของขั้น ‘off’ `#4d6273` ที่ contrast ~2.9:1 (≈3.1:1 บน `--bg`; ต่ำกว่า 4.5:1 ทั้งคู่) (`5f9aa2e:src/style.css:471-472,482,1144`) | contrast ≥4.5:1 สำหรับข้อความปกติ และ ≥3:1 สำหรับตัวใหญ่ · ตัวอักษรเล็กสุด ≥11 px (ไทย ≥12 px) · คงโทนธีมมืด · ไม่มี reflow ที่ซ่อน control · KPI-27 | สคริปต์คำนวณ contrast จาก computed style ของทุก token · probe ขนาดตัวอักษร · ภาพ TH/EN/RU · CSS อยู่ใต้เพดาน ถ้าต้องขึ้นเพดานต้องมี offset ตาม D-38 (KPI-30) | 050, 058 |
| M-LAUNCH-052 (RW:A11Y-02) | P2 / S / เปิด · I (+C เครื่องมือฉาก) | `.hud-btn` 21×18 px (`style.css:592-595`; `7662ead:613-616`), ปุ่มเครื่องมือฉาก และ play มีเป้าเล็ก; #77 เพิ่มปุ่มใน `.mission-steps` ที่ padding 2px 3px (chip สูง ~14.5 px) และ `.bd-say-show` (~20 px) ของ Build (`5f9aa2e:src/ui/build/engineer.css:244`; B แก้ไฟล์ของตน) ทั้งสองต้อง ≥24 px หรือเข้าข้อยกเว้น spacing ของ WCAG 2.5.8 | ใน `@media (pointer: coarse)` เป้า ≥44 px และ ≥24 px ทุกที่ (WCAG 2.5.8) · บน desktop fine pointer เหมือนเดิมทุกพิกเซล · KPI-27 | journey 390×844 วัดกล่อง (ล้มบนฐาน) · EO-UI-1 ที่ desktop fine pointer เท่าเดิม | CO-3 (M-LAUNCH-019) |
| M-LAUNCH-053 (RW:A11Y-03 ส่วน live region) | P2 / S / เปิด · U | `hud.ts:975-992` `updateTicker` เรียก `replaceChildren(...rows)` บน `#ticker` ที่เป็น `aria-live=polite` (`index.html:140`; `7662ead:141`) โปรแกรมอ่านหน้าจอจึงอ่านแถวเดิมซ้ำทุกเหตุการณ์ | เพิ่มเฉพาะแถวใหม่ (`aria-relevant=additions`) · ภาพเหมือนเดิม | MutationObserver นับ node ที่เพิ่มต่อเหตุการณ์ต้องเท่ากับ 1 (ฐานคือทุกแถว) · EO-UI-1 และข้อความที่มองเห็น (EO-UI-3) เท่าเดิม | — |
| M-LAUNCH-054 (RW:A11Y-04) | P2 / S / เปิด · C + O | ไม่มีจุดใดใน `src/render`, `src/ui/orbit` และ `main.ts` ที่อ่าน `prefers-reduced-motion` มีแค่กฎ transition กลาง (`style.css:1226`; `7662ead:1248`) ส่วน helper `reducedMotion()` มีอยู่แล้วใน `ui/home-stage.ts:49` และหน้า Build ให้ใช้ซ้ำ ไม่เขียนใหม่ | เมื่อระบบขอลดการเคลื่อนไหว: Cinematic ตัดภาพแทนการ ease, ไม่มี camera shake, tour ของ Orbit สั้นลง · ผู้ใช้ที่ไม่ได้ตั้งค่าเห็นเหมือนเดิม · ฟิสิกส์และเวลาไม่เปลี่ยน · ตัวเลือก comfort ของ R6.2 แยกต่างหาก | unit test ของธงนโยบาย · EO-UI-1 เมื่อไม่มีค่า preference เท่าเดิม · EO-PHY-3 เท่าเดิม | — |
| M-LAUNCH-055 (RW:LS-04) | P2 / XS / เปิด · I | `index.html:2` เป็น `lang="en"` จนกว่า JS จะรัน ไม่มี `h1`, skip link และ `noscript` | `h1` ที่ซ่อนจากสายตาต่อ route, ลิงก์ข้ามไปเนื้อหาหลัก, `noscript` สามภาษา, ตั้ง `lang` เร็วที่สุดโดยไม่เพิ่มการอ่าน storage (KPI-13 ไม่ถอย) | กฎ landmark ของ axe ผ่าน · EO-UI-1 เท่าเดิม (ภาพไม่เปลี่ยน) | 050 |
| M-LAUNCH-056 (RW:LUI-08) | P2 / S / เปิด · U (`panel.ts` เป็น hotspot ผ่าน I-train) | `panel.ts:672` เก็บ `activeElement` แล้ว `:974` คืน focus ด้วย `[aria-label=…]` เท่านั้น (บน `7662ead` อยู่ที่ `:760`/`:1065`) ปุ่มจึงเสีย focus หลัง render · #77 เพิ่ม `data-field` เป็น key คงที่ของ select/input แล้ว (`7662ead:panel.ts:589,610`) · + #77 เพิ่มปุ่มของ template note ที่ `SetupPanel.render` สร้างใหม่ (`5f9aa2e:src/ui/panel.ts:403-449`) และเส้นทาง re-render ของ `focusField` (`:376-395`) เทสต์คืน focus ต้องครอบทั้งสอง | คืน focus ด้วย key คงที่ โดยขยาย `data-field` ที่มีอยู่ไปยังปุ่มและ toggle (ledger เรียกว่า `data-k` ไม่สร้าง attribute ที่สอง) รวมถึงปุ่ม · ห้ามใช้ partial re-render (S02 §02.13 ข้อ 10) | DOM test ต่อชนิด toggle (ล้มบนฐาน) · EO-UI-1 เท่าเดิม | — |
| M-LAUNCH-057 (RW:LUI-09, OD:stage1 UX-02 สมมติฐาน) | P2 / S / เปิด · U | `explore-debrief.ts:109` ตั้ง `role=dialog` แต่ไม่ย้าย focus และไม่ปิดด้วย Escape · การ์ดจบของ Watch (`watch.ts`, endCard) มี `aria-labelledby` แต่ไม่ประกาศ · + ปุ่ม “Try this launch yourself” ใน end card ของ Watch (#77, `5f9aa2e:src/ui/watch.ts:507`) อยู่ในเทสต์ focus/Escape ของ end card | เลือกแบบใดแบบหนึ่งต่อการ์ด: region ที่ไม่ใช่ modal พร้อมประกาศ polite หรือ dialog ที่ย้าย focus ไปหัวข้อ ปิดด้วย Escape และคืน focus · ไม่ขัดผู้ใช้ที่มองเห็น และไม่ขโมย focus ระหว่างบิน | journey ใช้คีย์บอร์ดอย่างเดียว (ล้มบนฐาน) · axe | 050 |
| M-LAUNCH-059 (DP:12-14, CR:D9) | P3 / S / บางส่วน · U + O | `inputMode=decimal` มีแล้วใน lessons, author, assessment, `ui/orbit/dom.ts`, explore-level แต่ไม่มีใน `panel.ts` `number()` และไม่มี stepper | ทุกช่องตัวเลขเปิดแป้นทศนิยม โดยใช้ `src/design/number-entry.ts` ซ้ำ · stepper ละเอียด/หยาบเคารพ min/max/step · journey RU ทศนิยมจุลภาคของ M-BUILD-029 (CR:D9) ผ่าน · คงข้อความ validation · spinner บน desktop คงไว้ จนกว่าผลของ M-BUILD-029 จะสรุปว่ายอมเสีย spin-button (ขั้น 0 ทำซ้ำใน locale RU ก่อน, S10) | journey 390×844 ตรวจ `inputmode` · EO-UI-1 บน desktop เท่าเดิม | M-BUILD-029 (FX-1) |

- **quality guard (OR-2):** ใช้ฟอนต์ระบบเท่านั้น ห้าม self-host เพราะ precache เพิ่มราว 900 kB (KPI-03) ขัดกฎเพดานของ D-38 (S02 §02.13 ข้อ 20); ห้ามมี request ออกเมื่อออฟไลน์ ซึ่งเป็นกฎแยก (S02 §02.8, M-PLATFORM-028); ทุกการเปลี่ยนภาพต้องได้ภาพที่เจ้าของอนุมัติ; รวมภาพเป็นชุดเดียวต่อ PR ตาม matrix ของ CO-3 เพื่อลดเวลาเจ้าของ (KPI-35)
- **หลักฐานที่ต้องส่ง:** `docs/development/reports/R2.5-a11y-thai.md` ประกอบด้วย baseline ของ axe, ผล probe ของ KPI-27 ก่อน/หลัง, ภาพ และ test ที่รันจริง · **execution_authorized:** false

### 11.6 R2.6 — แถวกระโดดไปเหตุการณ์ และ API seek-to-event ที่ใช้ร่วมกัน

#### R2.6 — event jump row
- **เลน:** V (`timeline*`) + C (เลือกกล้องผ่าน CameraPolicy) + I (`main.ts`, `index.html`) **คลื่น:** K2 **ประมาณการ (หยาบ):** 4 agent-days, 1 PR (แตกเป็น API + แถว และแถวบน Watch ได้ถ้าเกิน ~400 บรรทัด) **OR:** OR-2, OR-6
- **ขึ้นกับ:** D-39 (กติกา replay, CO-3); M-LAUNCH-016 และ M-LAUNCH-010 (เสร็จแล้ว); ส่วน chooser ของ M-LAUNCH-024 (EQ-3) ในเลน V ทำก่อน เพราะแก้ `timeline.ts` ชุดเดียวกัน; CO-5 **ปลดล็อก:** ED-LES-2 (M-LEARNING-017 ปุ่ม "ให้ดูช่วงนั้น" ของบทเรียน และ M-LAUNCH-063 diagnosis debrief ที่ย้ายจาก R3.5 มาอยู่ ED-LES-2, ดู S16), journey ของ M-PLAN-025 (R7.1, S17), “R2 complete” และ R5.1 (G3 ส่งมอบแล้ว)
- **ชนิดการเปลี่ยนต่อ PR:** feature

##### M-LAUNCH-062 — ปุ่มกระโดดไปเหตุการณ์สำคัญพร้อมมุมกล้อง รวมหน้า Watch
- **ที่มาเดิม:** DP:UX-Q2/LUI-04, RW:LUI-04, RW:S11 (ส่วนกระโดด), DP:PED-Q3 · **สถานะ:** เปิด · **P / ขนาด:** P2 / M · **เลน:** V (+C, I)
- **เรื่องและเหตุผล:** chooser ของ R2.4 seek ได้ตรงเวลาในกลุ่มเหตุการณ์ แต่ยังไม่มีแถวกดเร็วไปยังช่วงสำคัญ และไม่มีแถวบน Watch ทั้งที่ `App.seek()` (`main.ts:1490`; `7662ead:1702`) และ `camPolicy` มีอยู่แล้ว นักเรียนจึงต้องลากหรือเดาเวลาเพื่อดู Max-Q หรือการแยกขั้น
- **ไฟล์:** `src/ui/event-jump.ts` (ไฟล์ใหม่ เป็น pure), `src/ui/timeline.ts`, `src/ui/watch.ts` (แถวบน Watch โดย U ตรวจ), hook ใน `src/main.ts` และ `index.html` (I-train), i18n
- **เกณฑ์รับ:**
  - `quickEvents(events)` เลือกจาก 7 ชนิดที่มีจริงในเที่ยวบิน: liftoff (`evt.liftoff`), Max-Q (`evt.maxQ`), การแยกขั้น, ฝาครอบ (`evt.fairingSep`), การเข้าวงโคจร, การลงจอด และความล้มเหลว บนโทรศัพท์แสดงไม่เกิน 5 ปุ่ม ที่เหลือเข้าถึงผ่าน chooser
  - ปุ่ม ≥44 px seek ไปที่ t − 5 s (ไม่ต่ำกว่าเวลาเริ่ม) แถวเดียวกันบน Watch และ TH/EN/RU ที่ 320/390 px ไม่ล้น
  - ผู้ใช้เลือกมุมกล้องคู่กับเหตุการณ์ได้ ค่าเริ่มต้นคงมุมเดิม การเปลี่ยนกล้องเป็นการเลือกของผู้ใช้ผ่าน `camPolicy.choose()`
  - ใน replay เคารพกติกาของ D-39; แถวอัปเดตเมื่อมีเหตุการณ์ใหม่ ไม่ใช่ทุก rAF
  - API เดียว `seekToEvent(ref, { leadS = 5, view })` ให้ ED-LES-2 (M-LEARNING-017 และ M-LAUNCH-063) และ journey ของ M-PLAN-025 ใช้ ห้ามเขียนทางลัดใหม่
- **วิธีพิสูจน์:** unit test บนเที่ยวบิน Bandwagon-1, Soyuz T-10-1 และ Starship F5 · journey แตะ Max-Q แล้ว cursor และมุมกล้องถูก (sabotage ให้ล้มเมื่อ seek ผิด) · `camera-policy.test.ts` ไม่เปลี่ยน · EO-UI-3 ของส่วนอื่นเท่าเดิม · ภาพให้เจ้าของ
- **ขึ้นกับ:** D-39, EQ-3 (ส่วน V)

- **quality guard (OR-2):** ไม่มีเส้นทางกล้องอัตโนมัติใหม่; ไม่เปิดเผยเหตุการณ์หลัง cursor ถ้า D-39 ตัดสินเช่นนั้น; ไม่แก้เหตุการณ์ที่บันทึกไว้ · **หลักฐาน:** `docs/development/reports/R2.6-event-jump.md` · **execution_authorized:** false

### 11.7 การตรวจรับ

**ข้อความตรวจรับของ v1.2 ที่ยังเปิด** (อ้างตรงตัวจาก PLAN:R2.1–R2.4 บน `da67341`; สถานะตาม R2S §2):

| ข้อ v1.2 | ข้อความตรงตัว | ส่วนที่ยังเปิด | ปิดด้วย |
|---|---|---|---|
| R2.1 | "หลังปล่อย setup หายและ scene ขยาย; config ของเที่ยวบินคงเป็น frozen input; pause/replay/layout ไม่ restart simulation; command manual/abort/TORU ที่เหมาะกับยานยังเข้าถึงได้; notation migration และสามภาษาไม่ผิด sign; ค่า command/actual/thrust ตรงกับ frame เดียวกันทั้ง live/replay และไม่ใช้ manual input แทน telemetry สด" | assertion ว่า TORU/six-DOF เข้าถึงได้; actual และ kN ใน HUD ย่อและ onboard ทั้ง live และ replay; การเข้าถึงได้ที่จอเตี้ย | CO-5, CO-4 ขั้น 9 (S06), R2.1r (002) |
| R2.1 (bullet) | "telemetry จัดเป็นกลุ่ม สรุปสำคัญก่อน รายละเอียดเปิดเพิ่มได้; ไม่ซ่อนสถานะที่สำคัญต่อการควบคุมใต้หน้าต่าง optional" และ "command/playback band กระชับ" | กลุ่มแบบสรุปก่อน; แถบกะทัดรัด; layout ของ Analysis | R2.1r (003, 002) |
| R2.2 | "manual view อยู่ข้าม liftoff/staging/orbit; mouse/touch/keyboard เลือกมุมได้; Cinematic คืน automation; ไม่มี visible camera reset; เปิดภารกิจใหม่ frame ยานได้ถูกสัดส่วน" | ยัง assert ไม่ครบเรื่อง touch, ปุ่ม 1–4, การคงมุมในช่วง orbit บนเบราว์เซอร์ และการจับยานเมื่อเริ่มภารกิจใหม่ | CO-5 (S06); ประกาศ fallback ("target ที่หายไปมี fallback ที่ชัดเจน") → R2.2r (012) |
| R2.3 | "presets ใช้ได้ก่อน custom layout; save/reload/resize/mobile ไม่ทำ control หลุดจอ; การจัด panel ไม่เปลี่ยน inputs/clock/physics" | custom layout ทั้งหมด, การ clamp และ reset layout ("ไม่สับสน reset camera, reset mission และ reset layout") | R2.3s2 |
| R2.4 | "ทุก member เลือกได้จริงและ seek ถูกเวลา; TH/EN/RU ที่จอ 320/390 px ไม่ล้น; Event list และ controls ไม่แย่ง gesture" | chooser ที่ 320/390 px ใน TH/RU; gesture บนรายการ; กติกา "ไม่ทำให้ replay เห็นผล/เหตุการณ์ในอนาคตก่อน cursor" | CO-5, D-39 (CO-3); R2.6 ใช้กติกาเดียวกัน |

**แพ็กเกจใดส่งหลักฐาน "R2 complete"** (เกณฑ์อยู่ใน S05 §05.4 เท่านั้น):

| ส่วนของนิยาม (S05) | แพ็กเกจที่ส่ง | หลักฐาน | ชนิดหลักฐาน | ผู้ลงนาม |
|---|---|---|---|---|
| G2 | CO-3 (+CO-4 ขั้น 1, CO-5) | บันทึก G2 ลงวันที่ใน DECISIONS.md, hash ของชุดภาพ, คำตอบ D-36.A1…A5 | human + execution | H |
| CO-4 ครบ 10 ขั้น | CO-4 (S06) | report ต่อ PR พร้อม test ที่ล้มก่อนแก้ และ oracle ของขั้น identical-output | execution | Q (+P สำหรับขั้น 8) |
| CO-5 | CO-5 (S06) | smoke slice ใน PR CI และผล sabotage run | execution | Q |
| R2.3s2 | R2.3s2 (+EQ-12 PR1/PR3 ที่อยู่ติดกัน) | journey dock/resize/reset, เทสต์ migration และ fixture ตัวอ่าน, SHA และ Pages run ของรุ่นตัวอ่านที่เผยแพร่ก่อนตัวเขียน, ผลซ้อม revert ที่ GK, oracle ของค่าเริ่มต้น, ภาพที่อนุมัติ | execution + human | Q + H (L ตรวจผลซ้อม revert) |
| R2.5 baseline | R2.5 ขั้น 1 (M-LAUNCH-050) | gate ของ axe ติดตั้งแล้ว และ baseline ของ KPI-26 บันทึกบน SHA ที่ตรึง | execution | Q |
| R2.6 | R2.6 | unit test ของ `quickEvents`, journey Max-Q, ภาพที่อนุมัติ | execution + human | Q + H |
| (นอกนิยาม ตรวจรับตาม §11.2–11.3) | R2.1r, R2.2r | report ของแต่ละแพ็กเกจ | execution + human | Q + H |

ขั้นที่ 2–10 ของ R2.5 ไม่อยู่ในนิยาม "R2 complete" แต่ส่วน reduced motion ต้องเสร็จก่อน G6 (S05) และต้องรายงาน KPI-26/27 ที่ทุก GK ตาม S04

### 11.8 สิ่งที่ผู้ใช้จะรับรู้ และวัดอย่างไร (OR-6)

ค่าหลังงานเป็นเกณฑ์รับ ไม่ใช่ผลที่วัดแล้ว ส่วนที่ต้องดูผู้ใช้จริงทำผ่าน HU-1 และ HU-6 (S16) โดยไม่มี analytics

| ช่วงที่ผู้ใช้เจอ | วันนี้ (หลักฐาน) | หลังงานในส่วนนี้ | วัดด้วย | รายการ |
|---|---|---|---|---|
| บินบนแล็ปท็อปหรือโปรเจกเตอร์ 1280×720 | ฉากเตี้ยเมื่อเปิด guide (รายงาน R2); 1100×650 ไม่เคยทดสอบ | ฉากสูง ≥ ค่าขั้นต่ำของ D-36 และ control ครบ | journey วัดความสูง + ภาพ CO-3 | 002 |
| บิน six-DOF ที่ 100× บนเครื่องช้า | ป้ายบอกแค่ค่าได้จริง (PB: 8.3×) | บอกค่าขอ สาเหตุ และเวลาถึงเหตุการณ์ถัดไป | journey + KPI-11 (การวัดไม่เปลี่ยน) | M-PLAN-009 |
| ดู coast ที่ 1× (live และ replay) | live: ภาพนิ่ง 10 s แล้วกระโดด (599 เฟรม); replay: ตำแหน่งกลางช่วงมาจากเส้นตรง (ประมาณ ~115 m ที่ช่วง 10 s, ยังไม่วัด) | ไม่มีเฟรมนิ่ง ภาพบนโค้ง และ live กับ replay ที่ t เดียวกันเหมือนกันทุกพิกเซล | ตารางขอบเขตของ M-PLAN-015 + EO-UI-1 | M-PLAN-015 |
| เครื่องอ่อน | bloom และท้องฟ้าหายไปเงียบ ๆ (UXR (b)8) | ประกาศพร้อมปุ่มย้อน หรือ opt-in | journey บังคับเฟรมช้า | M-PLAN-021 |
| นักเรียนไทยแบบออฟไลน์ | สระและวรรณยุกต์ถูกตัด (UXR (b)10) | clipping = 0 | KPI-27 (probe) | 058 |
| ผู้ใช้คีย์บอร์ดและ screen reader | ticker อ่านซ้ำ, debrief ไม่ประกาศ, ปุ่มเสีย focus | อ่านเฉพาะแถวใหม่, focus คืนที่เดิม, การ์ดจบประกาศ | KPI-26 + journey คีย์บอร์ด | 050, 053, 055–057 |
| โทรศัพท์ | เป้ากด 21–34 px; แผงตั้งค่าไม่มีแป้นทศนิยม | ≥44 px บน coarse pointer; `inputmode` ทุกช่อง | KPI-27 + journey 390×844 | 052, 059 |
| ทบทวนเที่ยวบินในชั้นเรียน | ต้องลากหา Max-Q หรือการแยกขั้น | แตะครั้งเดียวทั้งใน Engineer และ Watch | journey Max-Q | 062 |
| Engineer จัดพื้นที่ทำงาน | เลือกได้แค่ preset | dock/resize/reorder และ Reset layout | journey + ภาพ | 014, 003 |

### 11.9 ลำดับใน K2 และจุดที่ต้องรอ

**การตัดสินที่ต้องได้ก่อน** (เนื้อหาอยู่ใน S08): D-36 + A1–A5 และ D-39 (ชุด A, K0, ผ่าน CO-3) · D-43 และ D-44 (ชุด B, K1) · D-70 (ชุด C, K2) เฉพาะถ้าจะใช้ทาง (ก) ของ M-PLAN-015 ค่าเริ่มต้นคือ "ไม่" และทาง (ข) ไม่ต้องรอข้อนี้ · ถ้ายังไม่ตอบ งานที่ขึ้นกับเรื่องนั้นรอ ส่วนงานอื่นในตารางเดินต่อได้

| เลน | ลำดับในคลื่น K2 (หลัง G2 และหลังหน้าต่าง EQ-6 ในวันที่ 1–2 สำหรับงานที่เพิ่ม key) | ข้อจำกัด |
|---|---|---|
| Q (+T) | R2.5 ขั้น 1 (050) ทันทีที่ D-44 ได้คำตอบ | baseline ต้องมาก่อนทุก fix ของ R2.5 |
| I | R2.1r 002 → R2.5 055 → 058 → 051 → 052 → EQ-3 PR1 (S09) → R2.1r M-PLAN-009 → hook ของ R2.2r และ R2.6 | I มี PR เปิดได้ครั้งละ 1; คิว hook ของ I-train ไม่เกิน 3 คำขอ (S18) |
| U | EQ-12 PR1 (038) → R2.3s2 PR2a (ตัวอ่าน v2) → R2.5 053 → 056 → 057 (ทำระหว่างรอรุ่นตัวอ่านเผยแพร่) → R2.3s2 PR2b (ตัวเขียน) → R2.1r 003 → EQ-12 PR3 (023) → R2.5 059 | U เป็นคอขวด; PR2b และส่วนจำสถานะกลุ่มของ 003 merge ได้หลังรุ่นตัวอ่านเผยแพร่แล้วเท่านั้น (§11.4); R2.3s2 ล้นเข้า K3 ได้ (S05 ประมาณการแบบระวัง "R2 complete" = 2026-12-11) |
| C | R2.2r PR1 (012 + 061, ส่วน I ผ่าน train) → R2.2r PR2 (M-PLAN-021 หลัง D-43) → R2.5 054 ส่วนกล้อง → hook ทางวาดของ M-PLAN-015 ถ้า PR1 ของ P บอกว่าต้องมี | C ยังมี EQ-2/EQ-3 และ FX-8 ในคลื่นใกล้กัน (S09, S10) |
| P | R2.1r M-PLAN-015 PR1 (docs) → PR2 (ข้อมูลใน `VisualFrame` + `interpolateFrames` + live stepping) | ทำหลัง CO-6 และ R0.4; P เปิด PR ได้ทีละ 1 (S18 §18.6) ลำดับในคิว P เป็นไปตาม S05 PR2 แตะ recorder จึงต้องมี heavy + fleet ที่ GK |
| V | ส่วน chooser ของ EQ-3 → R2.6 | — |
| O | R2.5 MOB-02 (กฎของ 058) → 054 ส่วน Orbit → 059 slider | — |
| H | ภาพหน้าจอชุดละครั้งต่อแพ็กเกจ | ใช้ matrix เดิมของ CO-3 |

ทั้งโครงการเปิด PR พร้อมกันได้ไม่เกิน 5 PR (S18) ในคลื่นนี้ R2 จึงเรียงงาน P1 ก่อน (050, 058, 002) แล้วจึงทำ P2/P3

### 11.10 ข้อเสนอที่ไม่รับหรือเลื่อนในขอบเขตนี้ (trade-off; รายการรวมอยู่ใน S02 §02.13 และ S19)

| ข้อเสนอ | เหตุผลที่ไม่รับหรือเลื่อน | ทางเลือกที่ไม่ลดคุณภาพ |
|---|---|---|
| ลดคุณภาพอัตโนมัติแบบเงียบ หรือขยาย GlowGovernor ก่อนมี D-43 | ลดคุณภาพภาพโดยผู้ใช้ไม่รู้ (S02 §02.13 ข้อ 2) | M-PLAN-021: ประกาศพร้อมปุ่มย้อน หรือ opt-in |
| โหมดกราฟิกต่ำที่เปิดเองเมื่อเฟรมช้า | เหมือนข้อบน | ตัวเลือกที่ผู้ใช้เปิดเอง (R2.2r PR3) |
| ทำให้ "ดูเร็วขึ้น" ด้วยการขยาย step, แสดงค่าขอเป็นค่าที่ได้ หรือสลับเป็น point-mass เองเมื่อเครื่องช้า | ลดความสมจริงและความซื่อตรง (S02 §02.13 ข้อ 1 และ 30) | M-PLAN-009 บอกความจริง; ความเร็วจริงมาจาก EQ-9/EQ-10 (S09); point-mass เป็นทางเลือกที่มีป้ายตาม D-56 |
| self-host ฟอนต์ไทย | precache เพิ่มราว 900 kB (KPI-03) ขัดกฎเพดานของ D-38 (S02 §02.13 ข้อ 20) | กฎ `:lang(th)` บนฟอนต์ระบบ (058) |
| จัดหน้าต่างอิสระบนโทรศัพท์ | ขัดหลัก "หนึ่งงานต่อหนึ่งหน้าจอโทรศัพท์" (S02 §02.6, D-36.A4 ทางเลือก ค) | preset และคอลัมน์เดียวที่ ≤860 px |
| ซ่อน control สำคัญไว้ในเมนู หรือซ่อน first-use guide เองเพื่อให้ฉากใหญ่ขึ้น | control ต้องเข้าถึงได้ (PLAN:R2.1); การปิด guide เป็นของผู้ใช้ (รายงาน R2) | ย่อแถบและจัดลำดับใหม่ (002) |
| re-render SetupPanel บางส่วนเพื่อรักษา focus | ปฏิเสธแล้ว (M-LAUNCH-033, S02 §02.13 ข้อ 10) | key คงที่ `data-field` ที่ขยายไปยังปุ่ม (056) |
| Docking preset ตอนนี้ | ต้องรอ schema ของ R5 | เลื่อนไป R5.4 (M-LAUNCH-015, D-58, S15) โดยใช้ schema bump ตาม §11.1 |
| `touch-action` บน `#gl` | ต้องมีหลักฐานจากอุปกรณ์จริง | เลื่อน (M-LAUNCH-039, S08); HU-6 เก็บหลักฐาน |
| คอลัมน์ระดับเครื่องยนต์จริงใน CSV/recorder | เปลี่ยนสัญญา export | R4.2 (M-PHYSICS-052, D-57, S13) ใช้ `engine-levels.ts` |
| วาด held coast ด้วย Kepler ในส่วนวาด (ทาง (ก) ของ M-PLAN-015) | เป็นทางวาดที่สองที่ replay ไม่ใช้ (S02 §02.9 ข้อ 2) live กับ replay จึงต่างกันได้ อีกทั้งใช้ Kepler ทั้งที่ฟิสิกส์ใช้ J2 และใช้ท่าทางจาก heuristic ไม่ใช่ท่าทางที่ฟิสิกส์ถือ | ทาง (ข): ข้อมูล held coast ใน `VisualFrame` ที่ P เป็นเจ้าของ และฟังก์ชัน interpolate เดียวสำหรับ live และ replay (§11.2) ทาง (ก) ใช้ได้เฉพาะเมื่อเจ้าของบันทึกข้อยกเว้น D-70 ไว้แล้ว (S08) |
| เอา spinner บน desktop ออก | ยังไม่มีผลของ M-BUILD-029 (CR:D9: ทำซ้ำใน locale RU ก่อน แล้วจึงสรุปว่ายอมเสีย spin-button หรือใช้ทางเลือก `beforeinput`) | รอผลของ M-BUILD-029 (FX-1, S10) |
