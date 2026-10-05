## S12 R3: ส่งมอบแล้ว (G3 2026-10-04) และงานต่อยอด R3+ (R3.0, R3.1r, R3.2r–R3.5r, R3.6)

> **ขอบเขต:** R3 ตามขอบเขตของ PLAN v1.2 (R3.1–R3.5) **ส่งมอบครบ** ผ่าน #75 (เผยแพร่ผ่าน #76), #77, #78 และ #80 และเจ้าของประกาศเมื่อ 2026-10-04 ว่า “เว็บไซต์อัปเดตแล้วครับ งานจาก #80, #81 และ #82 ขึ้นเว็บแล้ว ระยะ3ทำเสร็จหมดแล้ว” G3 จึงบันทึกว่าส่งมอบ (บ้านของบันทึกคือ S05 §05.4; แผนที่ของเกณฑ์อยู่ใน §12.9) ส่วนนี้บันทึกสิ่งที่ส่งมอบ (§12.1) และวางแผน **R3+ ต่อยอด** ซึ่งเป็นงานที่แผน v2.0 เคยเพิ่มไว้ใต้ R3 จากเอกสารและรีวิวอื่น ทุกข้อตรวจกับโค้ดบน `5f9aa2e` แล้ว (`refresh/r3-audit.tsv`, 53 แถว; `refresh/r3-code-review.md`, R3CR-01…18) ไม่มีข้อใดถูกทิ้ง หรือถูกนับว่าเสร็จโดยไม่มีหลักฐาน งานต่อยอด**ไม่ gate ประตูใด** ส่วนนี้เป็นบ้านของ 19 รายการ (alias 1 รายการ: M-LEARNING-038 = M-BUILD-031) M-BUILD-001…005 ย้ายไป DELIVERED (S03 §03.2) และ M-LAUNCH-063/068 ย้ายไป ED-LES-2/ED-I18N-2 (S16)
> **หลักสามข้อของ R3 (ทุกแพ็กเกจต้องผ่าน):**
> 1. ใช้ SVG ก่อน 3 มิติ
> 2. ไม่สร้าง WebGL context ต่อแท็บหรือต่อภาพตัวอย่าง
> 3. ภาพกับตัวเลขอ่าน design revision เดียวกัน (PLAN:§4.2 DesignPreview)
> **การอนุญาต:** เลน R3 ขนานทำงานตามคำสั่งเดิมจนจบ R3 และปิดแล้ว (D-65, S08) คำสั่งเดิมไม่ครอบงานต่อยอดหรือ R4 ทุกแพ็กเกจในส่วนนี้ `execution_authorized: false` จนเจ้าของอนุญาตรายคลื่นหรือรายแพ็กเกจ agent ห้ามอนุมานเอง
> **ประมาณการรวม (`packages.tsv`, refresh 2026-10-04):** 73.5 agent-days, 32 PR (R3.0 3, R3.1r 7, R3.2r 5, R3.3r 3, R3.4r 10, R3.5r 3, R3.6 1) ประมาณใหม่จากรายการ PR ของแต่ละแพ็กเกจด้านล่างหลังหักงานที่ส่งมอบ (เดิม 105 / 35) ตรวจซ้ำที่ GK1 · คลื่น K3 ยกเว้น M-BUILD-023 และ R3.6 ที่อยู่ K4 · ไม่ gate อะไร จึงเป็นงานแรกที่เลื่อนไป K4 ถ้า K3 ล้น (S05 §05.11 ข้อ 6)
> **as-of (ตรงกับ S00 §00.1):** ตรวจแบบอ่านอย่างเดียวถึง **2026-10-04 ~21:10Z** — main บน GitHub = `5f9aa2e` (#83 เอกสาร, merge 20:31:34Z); live = `09cc2f5` (#82; Pages 37230585947 สำเร็จ 20:29:40Z เผยแพร่ #80–#82 พร้อมกัน); ไม่มี PR เปิด; R3 ครบตามคำของเจ้าของ (2026-10-04) การอ้างบรรทัดในโค้ดใช้รูป `<sha>:ไฟล์:บรรทัด` และ re-baseline บน `5f9aa2e` การอ้าง `7662ead` ในส่วนนี้ยังใช้ได้ เพราะโค้ดต่างจาก `5f9aa2e` เฉพาะ `src/main.ts` (+15 บรรทัดจาก #81; บรรทัด `main.ts` ของ `7662ead` ที่ส่วนนี้อ้างอยู่หลัง `:937` ทั้งหมด จึงเลื่อน +2 ตาม shift map ใน S00 §00.1) และ `tests/browser/harness.mjs` ตารางตัวตนของรุ่น #71–#83 อยู่ใน S03 §03.1
> - ทุกขั้นต้องตรวจบรรทัดซ้ำบน SHA ของ Day 0 ก่อนเริ่ม (CO-2 / M-PLAN-017, ดู S06)

### 12.0 รายการที่ส่วนนี้เป็นบ้าน (19 รายการ, `assignment.tsv`) และกติการ่วม

| แพ็กเกจ | รายการ | เลน | คลื่น | หยาบ (agent-days / PR) | การตัดสินที่ต้องรอ | ที่มาของงาน |
|---|---|---|---|---|---|---|
| R3.0 | M-LAUNCH-046 (P2, M, เปิด) | C (+O, I) | K3 | 4 / 3 | — | แผนเพิ่ม (CR:P21); ไม่ใช่เกณฑ์ G3 |
| R3.1r | M-BUILD-011 (P2, M, เปิด), M-LAUNCH-030 (P2, S, บางส่วน), M-PLAN-028 (P2, L, เปิด; ใหม่) | S (+I, L, B) | K3 | 13.5 / 7 | D-22, D-62 (เฉพาะ PR ของ 030), D-75 | ส่วนที่เหลือของ M-BUILD-001 + R3CR-13…16 |
| R3.2r | M-LAUNCH-076 (P2, L, เปิด; รับแถวตรวจรับของ M-BUILD-002) | B-R/B (P-D เขียน `engine-layout.ts`) | K3 | 8 / 5 | — | แถวที่แผนเพิ่มของ M-BUILD-002 |
| R3.3r | M-LAUNCH-081 (P3, L, บางส่วน) | B-S/B (+I/W) | K3 | 8 / 3 | — | ส่วนที่เหลือของ M-BUILD-003: Watch, ภาพใน Explore, บัญชี section × level |
| R3.4r | M-BUILD-015 (P2, M), 009 (P3, S), 012 (P3, S), 031 (P2, M) + M-LEARNING-038 (alias), 032 (P3, S), M-PLAN-027 (P1, XS; ใหม่; a11y ถดถอยที่ส่งแล้ว ทำก่อนใน K1–K2), M-PLAN-030 (P2, M; ใหม่) เปิดทั้งหมด; M-LAUNCH-065 (P3, L, เลื่อน) | B | K3 | 29 / 10 | D-46 (031), D-53 (065) | ส่วนที่เหลือของ M-BUILD-004/005 + R3CR-02/03 |
| R3.5r | M-BUILD-013 (P2, S, เปิด), M-LAUNCH-067 (P2, S, บางส่วน), M-BUILD-023 (P3, M, เลื่อน) | B (+I Home ผ่าน I-train) | K3 (023: K4) | 7 / 3 | D-8, D-54, D-61 | งาน R3.5 ที่ไม่ใช่เกณฑ์ v1.2 |
| R3.6 | M-BUILD-022 (P3, M, เปิด) | B | K4 | 4 / 1 | D-21 | RW:B-08/B-09 |

สรุป: เปิด 14, บางส่วน 3 (030, 081, 067), เลื่อน 2 (065, 023) · P1 1 (M-PLAN-027), P2 10, P3 8 · ย้ายออก: M-BUILD-001…005 → DELIVERED (S03); M-LAUNCH-063 → ED-LES-2, M-LAUNCH-068 → ED-I18N-2 (S16); journey ทั้งเส้นทาง (`r3-g3-loop`) → R7.1 M-PLAN-025 (S17)

**กติการ่วมของ R3** (รายละเอียดเลน, hotspot และ envelope อยู่ใน S18)
1. **SVG ก่อน, ไม่มี context ต่อแท็บ:** ภาพ 3 มิติใด ๆ ต้องรอ EQ-2 (cache การสร้างใหม่, S09) และ R3.0 แผน K3 ไม่มีภาพ 3 มิติ
2. **revision เดียว:** ภาพ ตัวเลข การตรวจ และ rating ระบุ revision ที่ใช้ เมื่อแบบเปลี่ยน ผลเดิมต้องมีป้ายว่า "ล้าสมัย/กำลังคำนวณ" (M-BUILD-015) ห้ามแสดงภาพ revision ใหม่คู่กับตัวเลข revision เก่าโดยไม่มีป้าย
3. **ไม่มีฟิสิกส์ชุดที่สองใน UI:** ทุกตัวเลขในภาพหรือแผนภาพเรียกจาก core เดิม (`src/orbit/*`, `src/design/*`) และ unit test ต้องยืนยันว่าเท่ากับ core ทุกบิต
4. **drawn = flown:** `src/data/engine-layout.ts` ใช้ร่วมกันระหว่าง renderer กับ six-DOF (หัวไฟล์ และ `physics/rigid/vehicle-data.ts:413` `layoutChambers`) การเปลี่ยนภาพที่แตะไฟล์นี้จึงอาจเปลี่ยนฟิสิกส์ (§12.4) ห้ามแก้ข้อมูลฟิสิกส์ให้ตรงภาพ และห้ามวาดต่างจากสิ่งที่บิน
5. **ไม่แก้แทนผู้ใช้:** ResultAction และ readiness พาไปที่ค่าเท่านั้น ห้าม auto-tune ห้าม apply เงียบ และห้ามแก้เที่ยวบินที่บันทึกแล้ว (PLAN:§4.2 ResultAction)
6. **ข้อมูล:** การเปลี่ยนรูปแบบ record ต้องมี migration และ version bump (S02 §02.13 ข้อ 15) ยกเว้น field ไม่บังคับที่ไม่เปลี่ยนความหมายของ field เดิม (เช่น `DesignRef` ของ #80) ซึ่งใช้ migration แบบ identity ที่ลงทะเบียนพร้อมเทสต์ (S10 §10.3.1) และกติกา reader-before-writer (S10 §10.1 ข้อ 9) แทนการขึ้น version (§12.3; ข้อยกเว้นนี้ต้องให้เจ้าของยืนยันพร้อม D-22) record ที่ไม่ถูกแตะต้องคงไบต์เดิม (EO-STO-1/2, S07) งานที่เพิ่มการเขียนต่อโปรไฟล์ต้องรอ R1.6 ขั้น b (S10)
7. **งบขนาด:** ทุก PR รายงาน delta ของ `budgets.json` การขึ้นเพดานต้องมีขนาดที่วัด เหตุผล และแพ็กเกจชดเชยที่ระบุชื่อตาม D-38 (KPI-30, S04 §04.3) วันนี้**ยังไม่มี offset ใดที่ลงแล้ว** สำหรับการขึ้นเพดานของ #75/#77/#80 ข้อเสนอของ D-38 ระบุ offset ไว้ดังนี้: EQ-6 สำหรับ i18n (dictionary ตามภาษา, K2), EQ-8 สำหรับ precache และขนาดติดตั้ง (worker แบบ ES module ที่ใช้ chunk ฟิสิกส์ร่วม, K3) และ EQ-7 สำหรับ index (แพ็กเกจกินช่วง K2–K5 โดยส่วนที่โหลด Build เมื่อใช้ M-PLATFORM-036 รอหลัง R3.4r, R3.5r และ R5.1 ทำ API ให้นิ่ง) ส่วน CSS ต้องได้การอนุมัติชัดแจ้งตาม D-38 จนกว่าแพ็กเกจเหล่านี้ merge จริง KPI-30 ยังนับ #75/#77/#80 เป็นการขึ้นเพดานที่ไม่มี offset และ PR ใดที่ขอขึ้นเพดานต้องระบุแถว offset ของตัวเองตามกติกาชั่วคราวของ D-38 · headroom ที่วัดบน `5f9aa2e`: index 1.7, i18n 1.1, CSS ~1.3 kB (PB@5f9aa2e) PR ฟีเจอร์ถัดไปที่เพิ่มกลุ่มเหล่านี้ต้องมี offset ทุกครั้ง
8. **ข้อความและการเข้าถึง:** key ใหม่ครบ EN/TH/RU ใน PR เดียว ลงในโมดูลของฟีเจอร์หลัง EQ-6 ศัพท์ไทยให้ L-C ตรวจ UI ใหม่ทุกชิ้นใช้กฎของ R2.5 (S11 §11.5: เป้ากด ≥ 24 px, contrast ≥ 4.5:1, `:lang(th)` ไม่ตัดสระ) KPI-26/27 ต้องไม่ถอย
9. **hotspot:** `main.ts`, `index.html`, `style.css` ผ่าน I-train เท่านั้น ส่วน `src/data/**` มี P-D เป็นผู้เขียนคนเดียว
10. **ภาพหน้าจอ:** การเปลี่ยนที่มองเห็นได้ทุกชิ้นต้องได้ภาพตาม matrix ของ CO-3 (S06) ที่เจ้าของอนุมัติ

**การตัดสินใจที่ R3+ ต่อยอดต้องรอ** (เนื้อหา ทางเลือก และข้อเสนออยู่ใน S08 เท่านั้น ถ้ายังไม่มีคำตอบ งานที่ขึ้นกับการตัดสินนั้นรอ และไม่มี agent ตัดสินแทน)

| D-n | ชุด · ต้องได้คำตอบภายใน | งานที่รอ |
|---|---|---|
| D-65 | A · K0 | การอนุญาตรายคลื่นของทุกแพ็กเกจในส่วนนี้ (เลน R3 ปิดแล้ว) |
| D-38 | A · K0 | การขึ้นเพดานใด ๆ ของ R3 (กติกา offset) |
| D-21 | B · GK1 | ขอบเขตของ R3.6 (เงื่อนไข “หลังหลักฐาน G3” ครบแล้ว) |
| D-22 | B · GK1 | การปฏิเสธรุ่นใหม่กว่าใน R3.1r (และ FX-1) และการยืนยันข้อยกเว้น “field ไม่บังคับไม่ขึ้น version” ก่อน R3.1r เพิ่ม field ใด |
| D-46 | B · K1 | formatter ตาม locale ของ M-BUILD-031 |
| D-54 | B · K1 | การ์ดของ M-LAUNCH-067 (เนื้อหา 063 ขั้น 2 อยู่ ED-LES-2) |
| D-62 | C · K2 | PR ของ M-LAUNCH-030 (ถ้ารับ แก้ในโมดูล seam hand-off; ถ้าไม่รับ ผ่าน I-train) — หน้าต่างอยู่ก่อน R5.1 ไม่ผูกกับ R3 แล้ว |
| D-8 | C · GK2 | R3.5r (M-LAUNCH-067) |
| D-53 | C · K3 | M-LAUNCH-065 (เลื่อน) |
| D-61 | C · K4 | R3.5r (M-BUILD-023, เลื่อน) |
| D-75 | C · K3 | แถวยอมรับของ M-PLAN-028: rating เปลี่ยนอย่างเดียวนับเป็นการแก้แบบหรือไม่ |

### 12.1 สิ่งที่ R3 ส่งมอบแล้ว (#75–#80; เผยแพร่ล่าสุดที่ `09cc2f5`)

ตารางแรกเป็นข้อเท็จจริงจาก `R3-design-views.md` บน `7ddab75` ตารางที่สองอ่านจาก `R3-design-views.md`, `R3.5-journey.md` และ diff ของ PR บน `7662ead` (`gh api`) สถานะการปล่อยรุ่นและงบขนาดอยู่ใน S03 §03.1 และ §03.4 **ห้ามวางแผนส่วนนี้ซ้ำ**

| ชิ้นงาน (PLAN เดิม) | สิ่งที่ส่งมอบ (ไฟล์) | หลักฐานที่รันจริงตามรายงาน | รายการที่ได้ประโยชน์ → ส่วนที่เหลือ |
|---|---|---|---|
| R3.2 bench (U04) | วาด `StackSvg` ตามสัดส่วนจาก `VehicleSpec` บน bench (catalogue, Explore, saved, sized) พร้อม Stacked/Apart; เลือกชิ้นด้วยรูปหรือป้าย (keyboard ได้) → part card + "Fire it on the test stand" / "Open the wind tunnel" (`design/bench-part.ts`, `ui/build/engineer-level.ts`); ไม่สร้าง WebGL | `bench-part.test.ts` 4 กรณี (ทุกชิ้นของทุกยานตรงกับ spec); journey `r3-bench-drawings` | M-BUILD-002 → R3.2r (ความเที่ยงตรง, M-LAUNCH-076) |
| R3.3 schematic (U04) | ภาพด้านหน้าจาก `SatelliteDesign` ตัวเดียวกับ figures, scale bar, ทิศโลก, assumption ที่มีชื่อ, คำเตือน `bodyCellsExceed`; array=0/ไม่มี engine/กล้อง/จาน → ไม่วาด; ปุ่มชิ้นเปิดแท็บ (`design/satellite-drawing.ts`, `ui/build/satellite-svg.ts`) | `satellite-drawing.test.ts` 6 กรณี (พื้นที่แผงที่วาด = `arrayArea`) | M-BUILD-003 → R3.3r (แผนภาพ, Watch) |
| R3.4 readiness (A03) | `readinessTarget()` ใน `design/review-model.ts` ตัดสินจาก stage/booster/path/code ไม่อ่านข้อความแปล; ปุ่ม "Show the part" เลือกชิ้นบนภาพและ focus ป้าย ไม่ auto-tune | `readiness-target.test.ts` 2 กรณี | M-BUILD-004 → R3.4r |
| R3.1 provenance | `orbitHandoffNow()` (`7ddab75:src/main.ts:947`, ใช้ที่ `:960`) และ `currentAsReference()` (`:983`, `:992`) ใช้ `flownMission(sim.cfg)` แทน `panel.missionState()` (บน `7662ead` คือ `:969`/`:982` และ `:1009`/`:1018`) **รายงานติดป้ายว่าเป็น hypothesis** เพราะไม่พบเส้นทางที่ร่างต่างจากค่าที่บิน; handoff ยังอ่าน state และ propellant จาก frame ที่แสดง และยังเป็น `orbitlab.handoff` v1 | journey `satellite` (Send to Orbit / Fly it ผ่าน handoff) | M-LAUNCH-030 → R3.1r (ลิงก์รายงาน), M-BUILD-001 → #80 (`DesignRef`) แล้ว R3.1r ส่วนที่เหลือ (§12.3) |
| ชุดหลักฐาน | unit 10,113/10,113 (283 ไฟล์); browser 7/7 ผ่าน (485 s) บน Chromium 141 ในเครื่อง ด้วย Node 22.22.0 ซึ่งต่างจาก VER: ที่กำหนด 22.23.3 หลักฐานที่ผูกกับ SHA จึงเป็น CI 37172156819 | Pages 37172926281 ล้มที่งบ precache แล้วเผยแพร่ผ่าน #76 (Pages 37193082491, 10:07:51Z) | → S03 §03.1; CO-1 (M-PLATFORM-063); R0.4 (M-PHYSICS-060) |

**งานที่เข้ามาหลังฐานแผน (นับเป็นผลงานที่ส่งมอบแล้ว ห้ามวางแผนซ้ำ)**

| PR | สถานะ | สิ่งที่ส่งมอบ | รายการ → ส่วนที่เหลือ |
|---|---|---|---|
| #77 (R3.5 สองส่วน) | merge `09a536e` 10:54:04Z, เผยแพร่ Pages 37196877349 11:20:22Z (live จนถูกแทนโดย #78) | Home "Try a launch yourself" เปิด Explore บน template (Falcon 9 จาก Cape, 1,000 kg) และไม่ทับ mission ที่บันทึก มีปุ่ม "Back to my mission"; Watch → "Try this launch yourself" เป็นสำเนา; eyebrow บอกที่มาของ mission (`ui/mission-source.ts`); ขั้น Build › Check › Launch › Result › Orbit (`ui/mission-steps.ts`); ผลที่มีเหตุแบบ typed มีปุ่ม "Show the setting" (`resultSetting`) และข้อเสนอก่อน → หลังสำหรับ 3 เหตุ ได้แก่ failure ที่ตั้งไว้, เกินพิกัด payload และระนาบผิด (`resultSuggestion`) พร้อมปุ่ม "Apply to a new mission"; Orbit แยก "Continue from a flight" กับ "Place an orbit directly"; ปุ่ม "Show its settings" ใน parts builder (`subjectRef`) | M-BUILD-005, M-LAUNCH-063 (ส่วน ResultAction), M-LAUNCH-067 (ทางเข้าเดียว), M-BUILD-004 (ระดับการ์ด) → §12.6, §12.7 |
| #78 (R3.3 ท่าพับเก็บ) | merge `f30590e` 11:42:51Z (CI 37198590545 ผ่านบน head `f92883f`), เผยแพร่ Pages 37199666485 12:06:51Z (live 12:06Z–20:29Z) | ท่า "Stowed for launch" / "Deployed" โดยปีกพับแนบด้านข้างของ bus เป็นแผงกว้างเท่าความลึกของ bus หนา 3 ซม. (assumption `stowedPanels` แสดงใต้ภาพ); แกนลำตัว +Z ชี้โลก, +X ตามความเร็ว, +Y ออกจากหน้า (`design/satellite-drawing.ts`, `ui/build/satellite-bench.ts`, `ui/build/satellite-svg.ts`; `satellite-drawing.test.ts` +1, journey `r3-bench-drawings`) | M-BUILD-003 (ท่าพับ/กาง และแกน) → ส่วนที่เหลือ §12.5 |
| #80 (R3.3 แผนภาพ + R3.1 DesignRef) | merge `7662ead` 17:08:51Z (CI 37218178884 ผ่านบน head `8226416`); Pages 37219398466 ล้มที่ journey `learner-profiles` และ Pages 37223857005 (#81) ล้มที่จุดเดิม; **เผยแพร่**พร้อม #81/#82 ใน Pages 37230585947 ที่ `09cc2f5` (deploy 20:29:40Z, journey 24/24) | **R3.3:** `src/design/satellite-diagrams.ts` (view model บริสุทธิ์ที่อ่านเฉพาะ `SatelliteFigures` ชุดเดียวกับตาราง ไม่มีฟิสิกส์ของตัวเอง: `eclipseDiagram`, `linkDiagram` เทียบเกณฑ์ 3 dB, `footprintDiagram`) และ `src/ui/build/satellite-diagrams-svg.ts` วาดใต้ตารางของแท็บ Power (เงา/แดด วันนี้และวันที่เงายาวที่สุดของปี), Radio (ดาวเทียมเหนือสถานีภาคพื้นพร้อมลำคลื่นตาม beamwidth และสีผ่าน/ไม่ผ่าน) และ Camera (FOV, swath และ GSD มาตราส่วนเดียวกัน) พร้อม caption 3 ภาษา · **R3.1:** `src/design/design-ref.ts` (`DesignRef` = kind, name, recordId, revision = เวลาบันทึกล่าสุด `updated` ของ record, edited, specId; `designRefFor`, `refFlies`, `parseDesignRef`) พาตัวตนของแบบผ่าน Fly it ทั้ง 4 ทาง, Send to Orbit, stored mission, eyebrow ("saved / changed since saved / not saved") และ hand-off; เก็บใน `MissionDocument.design` (ไม่บังคับ ระดับบนข้าง `mission`; `7662ead:src/config/mission-file.ts:52`, `MISSION_FORMAT_VERSION` ยัง 3) และ `OrbitHandoff.origin.design` (ไม่บังคับ; `7662ead:src/orbit/handoff.ts:69`, hand-off **ยัง v1** `:23` และค่าที่อ่านไม่ได้ทำให้ `parseHandoff` ปฏิเสธทั้ง hand-off `:203`) **ไม่เพิ่ม field ใน design store หรือไฟล์ของแบบ** · หลักฐานตามรายงาน: `satellite-diagrams.test.ts` 2, `design-ref.test.ts` 6, `mission-file.test.ts` +1, journey `r3-bench-drawings` และ `satellite` ผ่านในเครื่อง · นอกขอบเขตตาม PR: ไฟล์ mission ที่ export (Share) ยังไม่มี reference และ Engineer rocket bench ที่บินยานจาก catalogue/record โดยไม่ผ่าน Explore draft ไม่มี reference (ไม่เดา) | M-BUILD-001 และ M-BUILD-003 → **เสร็จ** (ขอบเขต v1.2); ที่เหลือ → M-PLAN-028 (R3.1r), M-LAUNCH-081 (R3.3r), M-BUILD-015 (R3.4r) |
| #81 | merge `77d3c00` 18:17:22Z | start-up marks ในผลวินิจฉัยของ journey ไม่เปลี่ยนพฤติกรรม ไม่แตะ `budgets.json` | M-PLATFORM-061, M-PLAN-001 (จุดวัด) |
| #82 | merge `09cc2f5` 20:02:44Z, เผยแพร่ 20:29:40Z | CPU ของ browser process และสถานะ GPU feature ในผลวินิจฉัย (`harness.mjs` เท่านั้น) | M-PLATFORM-061 |

**เครดิตรายการ (สถานะใน `assignment.tsv` หลัง refresh 2026-10-04)**

| รหัส | สถานะ | หลักฐานบน `5f9aa2e` | ส่วนที่เหลือ → (บ้านใหม่) |
|---|---|---|---|
| M-BUILD-001 | **เสร็จ** | `main.ts:984,:1020`; `handoff.ts:23,:69,:193,:202`; `mission-file.ts:52` | M-PLAN-028 (R3.1r); M-PLAN-025 (cursor/เชื้อเพลิง); M-PHYSICS-028 (LTAN, R4.5) |
| M-BUILD-002 | **เสร็จ** | `engineer-level.ts:366,:409-448`; `bench-part.test.ts` | M-LAUNCH-076 (R3.2r) |
| M-BUILD-003 | **เสร็จ** | `satellite-drawing.ts`, `satellite-diagrams.ts`; `satellite-bench.ts:251` | M-LAUNCH-081 (R3.3r), M-BUILD-015 |
| M-BUILD-004 | **เสร็จ** | `review-model.ts:182,:240`; `explore-level.ts:615-638`; `panel.ts:376` | M-PLAN-030, M-BUILD-015, M-BUILD-031 |
| M-BUILD-005 | **เสร็จ** | `result-actions.ts`, `mission-source.ts`, `mission-steps.ts`; journey `r3-first-launch`, `r3-result-setting` | M-PLAN-025, M-PLAN-030, M-LAUNCH-063 (ED-LES-2) |
| M-LAUNCH-030 | **บางส่วน** | `main.ts:984,:1020` แก้; `:1047` ยังเป็นร่าง | R3.1r |

- **งบขนาด:** #75 ขึ้นเพดาน index +12 / CSS +3 / i18n +12 kB, #77 ขึ้น +12 / +2 / +9 kB (เป็น 2,612 / 175 / 1,711 kB) และ #80 ขึ้น +10 / +2 / +9 kB (เป็น 2,622 / 177 / 1,720 kB) ส่วน #78 ไม่แก้ `budgets.json` precache อยู่ที่ 15,800.4 kB หลัง #77 และ 15,817.5 kB ตามที่ #80 รายงาน (head `8226416`; รายงาน R3 วางตัวเลขนี้ไว้ใต้ขั้น R3.3 diagram ดู S03 §03.1 ข้อ 3) และวัดบน `5f9aa2e` ได้ 15,822.7 kB จากเพดาน 16,103 kB (committed snapshots, headroom 280.3 kB; PB@5f9aa2e) ค่าที่ Pages เห็นหลัง refresh ยังต้องวัดใน CO-1; #81/#82 ไม่แก้ `budgets.json` การขึ้นเพดานทั้งสามครั้ง (#75/#77/#80) ไม่มีแพ็กเกจชดเชย นับเข้า KPI-30 และให้ทบทวนภายใต้ D-38 ใน CO-2 (S06) offset ที่ D-38 เสนออยู่ในกติการ่วมข้อ 7
- **การอนุญาต:** #77/#78/#80–#82 ทำโดย session ขนานตามคำสั่งเดิม (“ทำต่อเลยครับ”) ก่อน v2.0 ได้รับรอง เลนนี้ปิดแล้วเมื่อเจ้าของประกาศ R3 ครบ (D-65) กติกา D-38 ชั่วคราวใช้กับทุก PR ต่อจากนี้
- **ตรวจซ้ำแล้ว** บน `5f9aa2e` (`refresh/r3-audit.tsv` 58 แถว; คอลัมน์ `final_package`/`final_status` ตรงกับ `assignment.tsv` ซึ่งเป็นแหล่งจริง) CO-2 ลงตาราง delta นี้ใน repo จาก `assignment.tsv` (M-PLAN-017)

### 12.2 R3.0 — วงจรชีวิตของ render และงบ WebGL context (M-LAUNCH-046) (R3+ ต่อยอด; ไม่ใช่เกณฑ์ G3)

- **เลน:** C (`src/render/**`) + O (`src/ui/orbit/playground.ts`) + I (`main.ts`, `src/ui/home-stage.ts`, `home-globe.ts` ผ่าน I-train) **คลื่น:** K3 (หลัง EQ-2 และ EQ-4) **ประมาณการ (หยาบ):** 4 agent-days, 3 PR (2 PR โค้ด + 1 PR บันทึกออกแบบ; แก้ค่า 1 PR เดิมใน `packages.tsv`) **OR:** OR-1 (PR1), OR-2, OR-3
- **ขึ้นกับ:**
  - FX-8 (K1, S10): handler `webglcontextlost/restored` และเส้นทางสร้างทรัพยากรใหม่ ซึ่ง R3.0 ใช้ร่วม ไม่เขียนเส้นทางที่สอง
  - EQ-2 (K1–K2, S09): cache การสร้างใหม่ ตาม fold ของ M-LAUNCH-041/042/049 ที่ต้องมาก่อน R3.0
  - EQ-4 (K2, S09): M-ORBIT-010 สร้าง OrbitView เมื่อเปิดหน้า ซึ่งเป็นครึ่งแรกของงบ context
  - R0.4: EO-UI-1/2 และ M-PLAN-003 (GPU memory, forced context loss)
- **ปลดล็อก:** ภาพ 3 มิติใด ๆ ใน R3.2r/R3.3r (ไม่อยู่ในแผน K3), งบ asset ของ R5.4/R6.2 (R4.7, S14), KPI-07 ข้อ “ไม่เกิน 2 context” ที่ GK3 และตรวจซ้ำที่ G5/G6
- **fold (`folds.tsv`):** แถว EQ-2 (041, 042, 049) อยู่ก่อน R3.0 เพื่อให้ภาพตัวอย่างใช้ cache เดียวกัน ไม่สร้างสำเนาที่สาม
- **ชนิดการเปลี่ยนต่อ PR:**
  1. identical-output (C): เพิ่ม `OrbitView.dispose()` โดยยังไม่มีผู้เรียก
  2. quality-improving (C + O + I hook): ตัวจัดการงบ context ไม่เกิน 2 ที่ปล่อยเมื่อมีแรงกดดันเท่านั้น
  3. docs (C): บันทึกการออกแบบ renderer ร่วมระยะยาวพร้อมผลวัด ไม่ใช่ PR โค้ด การลงมือเกิดหลังผลวัดของขั้น 1–2 และต้องผ่านการตัดสินใจ

| รหัส (ที่มาเดิม) | P / ขนาด / สถานะ | เรื่องและเหตุผล | ไฟล์ | เกณฑ์รับ | วิธีพิสูจน์ | ขึ้นกับ |
|---|---|---|---|---|---|---|
| M-LAUNCH-046 (CR:P21, PLAN:§11.1 แถวความเสี่ยง render lifecycle, CR:P4 = CR:NEW-bundle-1 ผ่าน EQ-4) | P2 / M / เปิด | `OrbitView` สร้าง renderer ของตัวเอง (`render/orbit-view.ts:171`) และไม่มี `dispose()` `HomeGlobe` สร้าง OrbitView อีกตัว (`ui/home-globe.ts:48`) และ `home-stage.ts` `leave()` แค่ซ่อน ส่วน playground สร้างอีกตัว (`ui/orbit/playground.ts:583`) เมื่อเปิดลูกโลกหน้าแรกแล้วเข้า Orbit 3 มิติ จึงมี 3 context พร้อมกัน (`#gl` + 2; บน `7662ead` บรรทัดของ playground คือ `:584` ส่วนสองไฟล์แรกไม่เปลี่ยน) แต่ละ context อัปโหลด texture 4096 ของตัวเอง (ledger ประเมินราว 90 MB ต่อ context; ต้องวัดด้วย M-PLAN-003) iPad และโทรศัพท์จึงเสี่ยงถูกเบราว์เซอร์ทิ้ง context (UXR:(b)7) PB วัดได้ 2 context ก่อน interactive และเข้า Orbit ค้าง 4,033 ms (program 7 ตัว + texture 4096 ใน context ที่สอง) ยืนยันบน `5f9aa2e`: `OrbitView` ยังไม่มี `dispose()` (`render/orbit-view.ts:171`, ไฟล์ไม่เปลี่ยนตั้งแต่ `da67341`); PB@5f9aa2e ยังวัดได้ 2 context ก่อนเปิด Orbit (`.pg-canvas` 1,099 ms, `#gl` 2,026 ms) และค้างตอนเข้า Orbit 4,266 ms บนเครื่องที่ช้ากว่า (ช่วงทับกับ 4,033 ms) R3 ไม่เพิ่ม WebGL context ใหม่ (ภาพทั้งหมดเป็น SVG) | `src/render/orbit-view.ts`, `src/render/webgl-renderer.ts` (ตัวนับ context), `src/ui/home-globe.ts`, `src/ui/home-stage.ts` (I), `src/ui/orbit/playground.ts` (O), hook ใน `main.ts` (I) | (ก) PR1: `dispose()` ปล่อย geometry, material, texture ที่ view สร้างเอง และ renderer โดยไม่ปล่อย texture ร่วมของ host (ข) PR2: WebGL context ที่ยังใช้งานได้ ≤ 2 ตลอด journey Home (ลูกโลก) → Orbit 3 มิติ → Launch → Home → Orbit (KPI-07) (ค) ไม่ปล่อย `#gl` ระหว่างมีเที่ยวบิน ปล่อยเฉพาะเมื่อการสร้าง context ใหม่จะเกินงบ ซึ่งเป็นตัวกระตุ้นแบบ deterministic ไม่ปล่อยทุกครั้งที่ออกจากหน้า (S02 §02.13 ข้อ 6) ส่วน context ที่เบราว์เซอร์ทิ้งใช้เส้นทางของ FX-8 (ง) เก็บ texture ที่ decode แล้ว (`host.textures()`) ไว้อัปโหลดใหม่โดยไม่ fetch หรือ decode ซ้ำ (จ) เฟรมแรกหลังสร้างใหม่วาดเมื่อ map ผูกครบแล้วเท่านั้น ไม่มีลูกโลกสีน้ำเงินว่าง (ฉ) เวลาเข้าหน้าซ้ำหลังปล่อยต้องวัด ถ้าช้ากว่าเส้นทางที่ไม่ปล่อยเกินหนึ่งเฟรมบนเครื่องเดียวกัน ให้คงไม่ปล่อย และบันทึกว่างบเกินเพื่อรอขั้น 3 (ช) การจำลองและการบันทึกเที่ยวบินไม่หยุดระหว่างปล่อยหรือสร้างใหม่ | **PR1 (เท่าเดิม):** EO-UI-1/2/3 ไม่เปลี่ยน; EO-BUN-1 แสดงว่าเปลี่ยนเฉพาะ `orbit-view.ts`; unit test ว่า `renderer.info.memory` กลับเป็น 0 หลัง dispose **PR2:** journey นับ context (wrapper ของ `getContext` แบบ PB ลบด้วย context ที่ lost) พร้อม sabotage: ปิดตัวจัดการแล้ว journey ต้องล้มเมื่อถึง context ที่ 3; EO-UI-1 ให้ hash ของเฟรมแรกหลังสร้างใหม่เท่ากับเฟรมแรกตอนสร้างครั้งแรก (กล้องและเวลาจำลองเดียวกัน); probe ยืนยันว่าไม่มี draw ก่อน texture ผูก; EO-PHY-3/5 ไม่เปลี่ยน; `--compare` 3 รอบของการค้างตอนเข้า Orbit และเวลากลับ Home (trend, ต้องวัด); M-PLAN-003 วัด GPU memory ก่อน/หลัง | FX-8, EQ-2, EQ-4, R0.4 |

- **ขั้น 3 (บันทึกออกแบบ หลังผลวัดของขั้น 1–2):** สองทางที่ต้องวัดก่อนเลือก (ก) ใช้ canvas ของ OrbitView ใบเดียวร่วมระหว่างลูกโลก Home กับ Orbit โดยย้าย canvas ใน DOM ซึ่ง context ยังอยู่ จึงไม่ต้องอัปโหลด texture ซ้ำ (ข) วาดลงใน `#gl` ด้วย scissor ทั้งสองทางต้องพิสูจน์ด้วย EO-UI-1 ว่าพิกเซลเท่ากับปัจจุบัน และต้องลดการค้าง 4,033 ms ตอนเข้า Orbit (KPI-07 ส่วน trend) ยังไม่ผูกมัด จนกว่าจะมีผลวัด
- **quality guard (OR-2):** ห้ามลดขนาด texture (4096 คงเดิม), ห้ามจำกัด fps, ห้ามมีภาพกระพริบในเฟรมแรก, ฉาก Launch ไม่เปลี่ยน, FX-8 ยังเป็นเส้นทางกู้ context เพียงเส้นทางเดียว · **หลักฐาน:** `reports/R3.0-context-budget.md` (จำนวน context ต่อขั้นของ journey, hash ของเฟรม, ผลวัด GPU memory) · **execution_authorized:** false

### 12.3 R3.1r — ต่อยอด provenance หลัง G3 (DesignRef ทุกทางส่งต่อ, ผู้เขียนเดียว, field ของ record, ลิงก์รายงาน)

- **เลน:** S (`types.ts`, schema, `orbit/handoff.ts`, `design/design-ref.ts`, validators) ร่วมกับ P (ฟิลด์ provenance ของ flight model, data revision, epoch/frame) · B รับ adapter ฝั่ง Build · L เขียนส่วน `src/design/design-store.ts` เพราะไฟล์นี้อยู่ใน write set ของ L · I รับ call site ใน `main.ts` ผ่าน seam hand-off ของ EQ-15 ถ้า D-62 รับ ถ้าไม่รับ ผ่าน I-train ภายใต้เพดานราว 400 บรรทัดซอร์สต่อ PR (S18 §18.5) **คลื่น:** K3 **ประมาณการ (หยาบ):** 13.5 agent-days, 7 PR (refresh 2026-10-04) **OR:** OR-2, OR-3, OR-4
- **กลไก revision ที่รับ (แทน envelope v2 ที่วางไว้เดิม):**
  - **สิ่งที่ #80 ส่งแล้ว:** `DesignRef` (kind, name, recordId, revision = `updated` ของ record ที่บันทึก, edited, specId) อยู่ใน `OrbitHandoff.origin.design` (ไม่บังคับ; hand-off ยัง `orbitlab.handoff` v1, `7662ead:src/orbit/handoff.ts:22-23`) และ `MissionDocument.design` (ไม่บังคับ ระดับบนข้าง `mission`; `MISSION_FORMAT_VERSION` ยัง 3, `7662ead:src/config/mission-file.ts:41,52`) โดยไม่เพิ่ม field ใน design store
  - **ข้อตัดสินของส่วนนี้:** รับ "handoff v1 + `DesignRef` ที่ไม่บังคับ" เป็นกลไก revision ของ R3.1 และ**ตัด envelope v2 ที่วางไว้เดิมออก** แพ็กเกจนี้ไม่ขึ้น version ของ hand-off ไฟล์ mission หรือไฟล์ของแบบ ข้อนี้เป็นข้อยกเว้นของ S02 §02.13 ข้อ 15 และ S18 §18.3.5 ("ต้องเพิ่ม version และมี migration เสมอ") สำหรับ field ไม่บังคับที่ไม่เปลี่ยนความหมาย จึงต้องให้เจ้าของยืนยันพร้อม D-22 ถ้าเจ้าของไม่รับ PR ที่เพิ่ม field (PR4–PR6) ของแพ็กเกจนี้รอ และใช้กติกา v2 ด้านล่าง
  - **เหตุผลข้อ 1 (ตรงกับกติกาของโค้ด):** store และไฟล์ของแบบขึ้น version เฉพาะเมื่อ field เปลี่ยนความหมาย (`7662ead:src/design/design-store.ts:24-30`, `:196-200`) field ไม่บังคับที่เพิ่มเข้ามาไม่เปลี่ยนความหมายของ field เดิม
  - **เหตุผลข้อ 2 (ไม่ต้องย้ายข้อมูล):** parser ของไฟล์ mission อ่านเฉพาะ `mission` (`7662ead:src/config/mission-file.ts:308`) เอกสารและ hand-off ที่ไม่มี `design` จึงอ่านได้เหมือนเดิม และ build เก่าที่อ่านเอกสารใหม่แค่ไม่เห็น field นี้
  - **เหตุผลข้อ 3 (v2 เสี่ยงโดยไม่ได้อะไรเพิ่ม):** `parseHandoff` ของทุก build วันนี้ปฏิเสธ version อื่นทั้งก้อน (`raw.version !== HANDOFF_FORMAT_VERSION`, `:193`)
  - **ข้อควรระวัง:** field ไม่บังคับที่ build เก่าไม่รู้จักอาจหายเมื่อ build เก่าเขียนเอกสารนั้นซ้ำ ตัวอย่างคือเส้นทางคืน mission ที่เขียน `orbitlab.mission` ใหม่ (S10 §10.3.1 "ต้องตรวจ") และ `save()` ของ design store ที่สร้าง record ใหม่จาก field ที่รู้จัก (`7662ead:src/design/design-store.ts:175-177`) field ใหม่ทุกตัวจึงใช้กติกา reader-before-writer ของ S10 §10.1 ข้อ 9 (reader ที่อ่านได้และคง field ที่ไม่รู้จักเมื่อบันทึกซ้ำต้องอยู่ในรุ่นที่เผยแพร่แล้วก่อน PR ที่เริ่มเขียน) และลงทะเบียน migration แบบ identity พร้อมเทสต์ตาม S10 §10.3.1
  - **ถ้าภายหลังยังต้องมี v2** (เช่น field ที่เปลี่ยนความหมาย หรือเริ่มเขียน hand-off ลงไฟล์หรือลิงก์ตามที่ `handoff.ts:9` เปิดไว้) ต้องเป็นงานแยกที่เจ้าของอนุมัติ (D-22) และลงทะเบียนผ่าน S19 โดยมีสามอย่าง:
    1. **migration v1 → v2 แบบประกาศ** อ่าน v1 ทุกรูปแบบที่เคย ship (ก่อน #80, มี `design`, `design` ที่อ่านไม่ได้)
    2. **oracle:** fixture v1 ทุกรูปแบบอ่านด้วย reader ใหม่แล้ว deep-equal กับผลของ reader บนฐาน และ EO-STO-1 (S07) ยืนยันว่า record ที่ไม่ถูกแตะคงไบต์เดิม
    3. **กติกา reader-before-writer (S10 §10.1 ข้อ 9):** reader ที่อ่าน v2 ได้ (หรือปฏิเสธอย่างซื่อตรงตาม D-22) ต้องอยู่ในรุ่นที่**เผยแพร่แล้ว**อย่างน้อยหนึ่งรุ่นก่อน PR ที่เริ่มเขียน v2 เพราะแท็บเก่าและ PWA ที่ยังไม่อัปเดตจะเจอข้อมูลที่รุ่นใหม่เขียน (merged ≠ published, S18 §18.8)
  - ส่วนนี้ไม่วาง PR ของ v2
- **ขึ้นกับ:**
  - R0.2r: ADR-Handoff และ ADR-FlightLifecycle ใน K1–K2 (S07 §07.2) โดย ADR-Handoff บันทึกสัญญา "v1 + `DesignRef` ไม่บังคับ" ตามที่สร้างแล้ว และ FlightLifecycle กำหนดว่า "frame ที่แสดง" คืออะไร
  - D-22 (ชุด B, needed-by K1) และ FX-1 M-BUILD-008 (ข้อความกรณีไฟล์ใหม่กว่า, S10)
  - R1.6 ขั้น a–b: EO-STO-1 และ fixture ตัวอ่านเก่าของ §10.3.1 (S10) ต้องมีก่อนเพิ่ม field ใด ๆ ใน record
  - M-PLAN-031 (R1.6 PR 2b, S10 §10.3.1) ก่อน PR2 ของแพ็กเกจนี้ (fold ใหม่); D-75 ก่อน PR3
  - PR7: EQ-15 seam 2 ถ้า D-62 รับ ถ้าไม่รับ ใช้ I-train
  - FX-4 M-LAUNCH-028 (ตาม dependency ใน ledger ของ 030)
- **ปลดล็อก:** fixture ทุกรูปแบบที่ ship ให้ R4.5 M-PHYSICS-028 (field LTAN ไม่บังคับ), R5.1 (S15), M-BUILD-023 (R3.5r)
- **fold (`folds.tsv`):** แถว M-PLAN-013 กำหนดว่า ADR ห้าฉบับต้องเขียนใน K1–K2 ก่อน R3.1r ส่วน ADR CraftState physical state เขียนทันเวลาก่อน R5.2 · แถว M-PLAN-028 กำหนดว่า PR ผู้เขียนเดียว (PR2) อยู่หลัง R1.6 ขั้น b และ PR 2b เพราะแตะเส้นทางคืน mission เดียวกัน (`mission-share.ts:71` → `panel.ts:552` → `main.ts:560` → `main.ts:1759`)
- **ชนิดการเปลี่ยนต่อ PR:**
  1. identical-output (S): fixture + contract test ของทุกรูปแบบที่ ship (hand-off/stored mission ก่อน #80, มี `design`, `design` อ่านไม่ได้) ไม่แก้โค้ดที่ ship [M-PLAN-028]
  2. identical-output (I ผ่าน I-train; หลัง M-PLAN-031 = R1.6 PR 2b): ผู้เขียน `orbitlab.mission` คนเดียว Fly it 3→2 และเริ่มแอป 2→1 โดยไบต์สุดท้ายเท่าเดิม [M-PLAN-028, R3CR-13]
  3. bug-fix (B + I hook): จับคู่ DesignRef ด้วย source ของ bench (record id + `savedUpdated` / sized / catalogue) แทน spec id เริ่มจาก journey ที่ล้มก่อนแก้ (สถานการณ์ A/B ของ R3CR-14) และตามคำตอบ D-75 [M-PLAN-028]
  4. feature (S + I/B): DesignRef ในไฟล์/ลิงก์ mission ที่ Share และ Fly it จาก record ของ Engineer พร้อม build stamp ตามกติกา reader-before-writer [M-PLAN-028]
  5. M-BUILD-011 3a identical-output (L + S): ทำให้ `save()` คง field ไม่บังคับที่ไม่รู้จักของ record เดิม (วันนี้ไม่มี record ใดมี field เหล่านี้ ผลจึงเท่าเดิม) และต้องเผยแพร่ก่อน 3b
  6. M-BUILD-011 3b feature (B สำหรับ UI): เขียน recipe, payload และวันที่เป็น field ไม่บังคับ
  7. bug-fix (I): M-LAUNCH-030 ลิงก์รายงานจากค่าที่บิน; reproducer ต้องลอง `applySuggestion` (`5f9aa2e:src/main.ts:1582`) และ `openTemplate` (`:1147`)

**intent ทั้ง 5 ตาม PLAN:§4.2 กับผู้สร้างและผู้ใช้ในโค้ดวันนี้** (บน `5f9aa2e`; ไฟล์อื่นนอก `main.ts` เท่ากับ `7662ead`; ADR-Handoff ของ R0.2r เป็นผู้ตรึงรายละเอียด)

| intent | ผู้สร้างวันนี้ | ผู้ใช้ | มีแล้ว | ที่ยังขาด | กรณี legacy |
|---|---|---|---|---|---|
| แบบ | save/export ของ Build Explore/Engineer และ satellite designer | การเปิดใน Build, Fly it, ลิงก์แชร์ (023 เลื่อน) | id ของ record + revision = `updated` ที่ทุกการบันทึกเขียนอยู่แล้ว (#80) | recipe/payload/วันที่ (011) เป็น field ไม่บังคับ | แบบที่ไม่เคยบันทึกเป็น `unsaved` (ไม่มี revision) และแบบที่แก้หลังบันทึกเป็น `edited` ไม่แอบอ้างเป็นรุ่นที่บันทึก (`designRefState`) |
| แบบ → ตั้งภารกิจ | Fly it (`design/build-handoff.ts`), satellite Fly it | แผง setup ของ Launch | `MissionDocument.design` ใน stored mission และ eyebrow (#80, Fly it ทั้ง 4 ทาง) | ไฟล์ mission ที่ export/Share; Engineer rocket bench ที่ไม่ผ่าน Explore draft (M-PLAN-028); ฐาน/เป้าหมาย/payload ตามแบบ (013, R3.5r) | ไฟล์ mission เดิมอ่านได้ตามเดิม เพราะ parser อ่านเฉพาะ `mission` |
| แบบ → วางในวงโคจรตรง | Send to Orbit (`design/satellite-handoff.ts`) | Orbit "Place an orbit directly" (#77) | `OrbitHandoff.origin.design` (#80) และ elements/epoch จาก r, v, jd ของ hand-off | build stamp (M-PLAN-028) | handoff v1 อยู่ในหน่วยความจำเท่านั้น ไม่มีไฟล์ค้าง (S07) |
| เที่ยวบิน → ต่อจากสถานะที่แสดง | Continue in Orbit (`orbitHandoffNow`) | Orbit "Continue from a flight", lifetime | flown inputs จาก `flownMission(sim.cfg)` (#75), r/v และเชื้อเพลิงจาก frame ที่แสดง, `origin.design` เมื่อ `sim.cfg` บินแบบนั้น (#80) | attitude ถ้า model มี (M-PLAN-028); journey ที่พิสูจน์ cursor และเชื้อเพลิง (M-PLAN-025); แท็ก LTAN (field สงวนใน M-PLAN-028; แปลงค่าใน M-PHYSICS-028) | เหมือนแถวบน |
| ผล → แก้ค่าต้นเหตุ | การ์ดผล (`resultSetting`, `resultSuggestion` ใน #77) | แผง setup, parts builder | รหัสเหตุแบบ typed, destination และค่าก่อน/หลังสำหรับ 3 เหตุ (#77) | ADR-ResultAction ยืนยันว่า destination ครบ {section, stage, field}; เหตุอื่นเป็นของ 063 (ED-LES-2) | ผลเก่าที่ไม่มีรหัสเหตุ แสดงผลได้แต่ไม่มีปุ่ม และไม่เดา (S07) |

| รหัส (ที่มาเดิม) | P / ขนาด / สถานะ | เรื่องและเหตุผล | ไฟล์ | เกณฑ์รับ | วิธีพิสูจน์ | ขึ้นกับ |
|---|---|---|---|---|---|---|
| M-PLAN-028 (ส่วนที่เหลือของ M-BUILD-001 / PLAN:R3.1 และ PR #80 ส่วน "นอกขอบเขต"; R3CR-13, R3CR-14, R3CR-15, R3CR-16) | P2 / L / เปิด (ใหม่) | M-BUILD-001 เสร็จตามขอบเขต v1.2 (§12.1): `DesignRef` อยู่ใน `OrbitHandoff.origin.design` และ `MissionDocument.design` และผู้เรียนเห็นแบบกับ revision ใน eyebrow และกล่อง hand-off (hand-off ยัง v1, `5f9aa2e:src/orbit/handoff.ts:23`) ส่วนที่เหลือที่รับเป็นข้อจำกัดพร้อม G3: (1) ไฟล์/ลิงก์ mission ที่ Share ไม่มี reference และ Fly it จาก record ของ Engineer ที่ไม่ผ่าน Explore draft ไม่มี reference (PR #80 ระบุว่านอกขอบเขต) (2) Fly it เขียน `orbitlab.mission` 3 ครั้ง ครั้งแรกอาจเขียน ref ของ revision เก่าและป้ายแสดง revision เก่าชั่วคราว ส่วนการเริ่มแอปที่มี ref เขียน 2 ครั้ง (R3CR-13: `main.ts:560` → `:1759`, `:598`, `:1093-1097`, `:1101-1110`) (3) `refFlies`/`flownRef` จับคู่ด้วย `VehicleSpec.id` อย่างเดียว ขณะที่ draft ของ Explore กับ record ที่บันทึกจากมันใช้ id เดียวกัน ป้ายจึงอาจชี้ draft แทน record ที่บินจริง หรือคง ref เก่าเมื่อ draft ถูกปฏิเสธ (R3CR-14 สถานการณ์ A/B, PLAUSIBLE; ฟิสิกส์ไม่กระทบ) (4) `edited` นับ rating ของ payload เป็นการแก้แบบ (R3CR-15 → D-75) (5) ยังไม่มี fixture ของทุกรูปแบบที่ ship, build stamp หรือข้อความปฏิเสธรุ่นใหม่กว่าตาม D-22 | `src/main.ts` (I-train), `src/design/design-ref.ts`, `src/ui/build/build-screen.ts`, `src/ui/build/engineer-level.ts`, `src/ui/mission-share.ts`, `src/config/mission-file.ts`, `tests/` | เกณฑ์ของ M-BUILD-001 ที่ยังไม่ส่ง: (ก) ทุก intent ที่ส่งแบบต่อ (แบบ, แบบ → ตั้งภารกิจ รวมไฟล์/ลิงก์ mission ที่ export/Share และ Fly it จาก record ของ Engineer, แบบ → วางในวงโคจรตรง, เที่ยวบิน → ต่อจากสถานะที่แสดง) มี `DesignRef` ที่ถูกต้อง หรือไม่มีเลยเมื่อไม่ใช่แบบของผู้ใช้ (ไม่เดา); build stamp และ attitude (เมื่อ model รองรับ) เป็น field ไม่บังคับ; **ไม่สร้าง envelope v2** (ง) รุ่นใหม่กว่าถูกปฏิเสธอย่างซื่อตรงตาม D-22 ห้าม fallback เป็นยาน default (hand-off ปฏิเสธ version อื่นอยู่แล้วที่ `:193`; ไฟล์ mission และไฟล์ของแบบตามคำตอบ D-22) (จ) เอกสารและ hand-off ที่ไม่มี `design` และไฟล์ mission/design/archive เดิมอ่านได้ค่าเท่าเดิม (ฉ) สงวน field ไม่บังคับสำหรับแท็ก LTAN convention ไว้ให้ M-PHYSICS-028 โดยผู้ผลิตแต่ละรายเขียน convention ที่ใช้อยู่วันนี้ (designer = mean Sun, Launch = true Sun ตาม RA:(a)) โดยไม่แปลงค่า การแปลงเป็นงานของ R4.5 (ช) ทุก field ใหม่ผ่านกติกา reader-before-writer และถ้าภายหลังต้องมี v2 ให้ทำตามกติกา migration ด้านบน ไม่อยู่ในแพ็กเกจนี้ · เพิ่ม: Fly it เขียน 2 ครั้ง เริ่มแอปเขียน 1 ครั้ง ไบต์สุดท้ายเท่าเดิม (EO-STO-1); ป้ายไม่เป็น revision เก่าแม้ใน microtask แรก; ref ทุกตัวที่แอปสร้าง parse ได้ (property test); rating-only ตาม D-75 | round-trip ต่อ intent (serialize → parse แล้ว deep-equal); fixture ของทุกรูปแบบที่ ship (ก่อน #80, มี `design`, `design` อ่านไม่ได้) อ่านได้ค่าในหน่วยความจำเท่ากับ parser บนฐาน (deep-equal); EO-STO-1: record ที่ไม่ถูกแตะคงไบต์เดิม; EO-EXP-1: ไฟล์ mission ที่ export โดยไม่มีแบบของผู้ใช้ได้ไบต์เท่าเดิม; EO-PHY-1…5 ไม่เปลี่ยน (ไม่มีฟิสิกส์); journey Build → Launch → seek ถอยหลัง → Continue in Orbit ยืนยันว่า state และ propellant เท่ากับ frame ที่ cursor ทุกบิต พร้อม sabotage (เติมเชื้อเพลิงเต็มแล้ว journey ต้องล้ม; ใช้ journey เดียวกับ M-PLAN-025 ไม่เขียนเส้นที่สอง); fixture รุ่นใหม่กว่าได้ข้อความปฏิเสธใน TH/EN/RU · เพิ่ม: spy storage นับ `setItem` (3→2, 2→1); journey “Engineer → saved record → Fly it” ขณะ Explore draft ถูกแก้; `measure.mjs --only startup,storage` นับครั้ง (ไม่อ้างเวลา) | R0.2r, D-22, D-75, R1.6 a–b + PR 2b, FX-1 |
| M-BUILD-011 (OD:Build/satellite UX limits ส่วน persistence, OD:IMPLEMENTATION-STATUS D06 "design date") | P2 / M / เปิด (ยืนยันบน `5f9aa2e`: `design-store.ts` ไม่เปลี่ยน) | record ของแบบที่บันทึกเก็บแค่ `VehicleSpec`/`SatelliteDesign` (`7662ead:src/design/design-store.ts:51-61`) remix ที่เปิดใหม่จึงกลับเป็น 100 % ส่วน payload และวันออกแบบดาวเทียมหายไป | `src/design/design-store.ts` (L), `src/design/remix.ts`, `src/ui/build/explore-store.ts`, `src/ui/build/satellite-workspace.ts` (B) | record และไฟล์ของแบบยังเป็น version 1 ตามกติกาของ store (field ไม่บังคับไม่เปลี่ยนความหมาย) โดยมี recipe, payload และวันที่เป็น field ไม่บังคับ; **reader-before-writer:** PR 3a ที่ทำให้ `save()` คง field ไม่บังคับที่ไม่รู้จักของ record เดิมต้องเผยแพร่ก่อน PR 3b ที่เริ่มเขียน; record ที่ไม่มี field เหล่านี้เปิดได้เหมือนวันนี้; remix เปิดกลับมาพร้อมค่ายืด; export/import ไป-กลับได้; แอปรุ่นเก่าอ่านแบบได้โดยไม่เห็นค่ายืด (เท่ากับวันนี้) หรือปฏิเสธตาม D-22; ไบต์ของยานไม่เปลี่ยน | 3a: oracle ไบต์ของ store ก่อน/หลังเท่ากันสำหรับทุก fixture ที่ไม่มี field ใหม่ (EO-STO-1) และ fixture ที่มี field ที่ไม่รู้จักคง field ไว้หลัง `save()`; 3b: deep-equal ของไบต์ `VehicleSpec` ทั้ง record ที่มีและไม่มี recipe; fixture เดิมอ่านได้ค่าเท่าเดิม; เที่ยวบินจาก remix ที่เปิดใหม่ได้ fingerprint เดียวกับก่อนบันทึก (mission เดียวกัน → hash เดียวกัน) | M-PLAN-028 (กลไกเดียวกัน), D-22, R1.6 a–b |
| M-LAUNCH-030 (RW:LUI-11, PLAN:R3.1 code observation) | P2 / S / บางส่วน (#75 แก้ส่วน handoff และ reference แล้ว) | ส่วนที่เหลือ: ลิงก์ในรายงานการบิน `flightReport()` (`7662ead:src/main.ts:1039`) ใช้ `this.panel.share.link()` (`:1045`) (บน `5f9aa2e` `:1041`/`:1047`) ซึ่งสร้างจากร่างในแผง #77 เพิ่ม "Apply to a new mission" ที่แก้ร่างหลังบินจบ จึงเป็นเส้นทางใหม่ที่อาจทำให้ร่างต่างจากค่าที่บิน reproducer ต้องลองเส้นทางนี้ ตามกฎ R0.1 | `src/main.ts` (`flightReport`; ถ้า D-62 รับ แก้ในโมดูล seam hand-off หลังหน้าต่าง EQ-15 ถ้าไม่รับ แก้ใน `main.ts` ผ่าน I-train), helper บริสุทธิ์สำหรับลิงก์จาก `flownMission(cfg)` | ตรวจซ้ำบน main ปัจจุบันว่าจุดใช้ใน `orbitHandoffNow` และ `currentAsReference` (`7662ead:src/main.ts:982`, `:1018`) ใช้ค่าที่บินจริง; reproducer: บิน → Apply to a new mission (`applySuggestion`) หรือเปิด template (`openTemplate`) หรือแก้ร่างขณะที่รายงานของเที่ยวเดิมยัง export ได้ → ลิงก์ต้องเข้ารหัสค่าที่บินจริง; ถ้าไม่มีเส้นทางใดทำให้ร่างต่าง ให้ติดป้าย hypothesis และแก้แบบ defensive แบบเดียวกับ #75; เมื่อร่างเท่ากับค่าที่บิน ลิงก์ต้องเท่าเดิมทุกไบต์ | unit: ลิงก์จากค่าที่บินจริงเท่ากับลิงก์จากแผงทุกไบต์เมื่อร่างเท่ากับค่าที่บิน; journey ของ reproducer (ล้มบนฐานถ้าพบเส้นทาง); EO-EXP-1 ไบต์อื่นของรายงานไม่เปลี่ยน | CO-2 (M-PLAN-017), EQ-15 seam 2 (ถ้า D-62 รับ), FX-4 |

- **quality guard (OR-2):** เป็นงาน schema และ adapter ล้วน ไม่แตะฟิสิกส์ ไม่บันทึก golden ใหม่ ไม่มีค่าเริ่มต้นเงียบ ไม่ขึ้น version ของ hand-off หรือไฟล์ใด และไม่มี field ใหม่ที่ข้ามกติกา reader-before-writer · **หลักฐาน:** `reports/R3.1-provenance.md` (ตาราง intent × field และ fixture ทุกรูปแบบที่ ship) · **execution_authorized:** false

### 12.4 R3.2r — ความเที่ยงตรงของภาพจรวดและแถวตรวจรับของ bench (R3+ ต่อยอด)

- **เลน:** B-R (โมดูลบริสุทธิ์ `src/design/exploded.ts`, `stack-drawing.ts`, `bench-part.ts`, `src/ui/build/stack-svg.ts`) · B ประกอบเข้า `engineer-level.ts` · **P-D เขียน `src/data/engine-layout.ts`** (ผู้เขียนคนเดียว) โดย P ตรวจ **คลื่น:** K3 **ประมาณการ (หยาบ):** 8 agent-days, 5 PR **OR:** OR-2, OR-3, OR-4
- **ขึ้นกับ:** R3.1 ส่งมอบแล้ว (DesignRef); helper ของ M-BUILD-015 (R3.4r PR1) สำหรับสถานะ stale, M-BUILD-024 (journey ของ Build ใน R0.4, S07), CO-6 และ EO-PHY-1/2 ที่บันทึกแล้ว (สำหรับ PR ของ `engine-layout.ts`), EQ-12 M-LAUNCH-037 (helper ของ canvas ถ้ามีกราฟใหม่) · ภาพ 3 มิติต้องรอ R3.0 และ EQ-2 · **ปลดล็อก:** R3.4r (ภาพใน shell ของ Engineer), R3.6 (ภาพของกลุ่ม strap-on ที่เปลี่ยนเครื่อง)
- **ชนิดการเปลี่ยนต่อ PR:**
  1. quality-improving (B-R): วาดกลุ่ม strap-on ที่มุมบนวงแหวนตามที่ฟิสิกส์วาง (`vehicle-data.ts:54`)
  2. **realism-changing (P-D เขียน, P ตรวจ):** จัดตำแหน่งเครื่องยนต์ตามจำนวนเครื่องแทน id ของ stage และให้วงแหวนทั่วไปเกิน 8 bell ได้
  3. quality-improving (B-R): เครื่องที่ถูกเปลี่ยนวาด bell ของตัวเอง
  4. quality-improving (B-R): แสดงความสูงที่เผยแพร่คู่กับความสูงที่บินพร้อมแหล่งอ้างอิง ส่วนเอกสาร (แหล่งอ้างอิงและรายงาน) เป็น commit หนึ่งใน PR เดียวกัน ไม่ใช่ชนิดที่สอง
  5. feature (B): เลือกชิ้นใดก็ได้แล้วพาไปแท็บหรือช่องที่ตรงกัน และแสดงสถานะ invalid/stale

| รหัส (ที่มาเดิม) | P / ขนาด / สถานะ | เรื่องและเหตุผล | ไฟล์ | เกณฑ์รับ | วิธีพิสูจน์ | ขึ้นกับ |
|---|---|---|---|---|---|---|
| M-LAUNCH-076 (รับแถวตรวจรับของ M-BUILD-002 ที่แผนเพิ่ม; OD:Build drawings, RM:S02-octaweb) | P2 / L / เปิด (ไม่ใช่ alias แล้ว; รับแถวตรวจรับของ M-BUILD-002) | IMPLEMENTATION-STATUS (`:540-547` บน `da67341`): ความสูงที่วาดคือ stage + adapter ตามที่บิน ไม่ใช่ความสูงที่เผยแพร่ ได้แก่ Vega-C 41.9 เทียบ 34.8 m, PSLV-XL 52.8 เทียบ 44 m, Atlas V 551 70.5 เทียบ 62.2 m ส่วน Saturn V วาด 90.15 m เทียบ 110.6 m ที่รวมยาน Apollo และหอหนีภัยซึ่งไม่ได้วาด กลุ่ม strap-on วาดเป็นก้อนเดียวต่อข้าง และคู่ air-lit ของ PSLV อยู่นอกกลุ่มแรก Falcon 9 ขั้นแรกที่เปลี่ยนจำนวนเครื่องยังวาดเป็น octaweb วงแหวนทั่วไปวาดได้สูงสุด 8 bell และเครื่องที่ถูกเปลี่ยนยังใช้ภาพเดิม **ข้อควรระวังด้านความสมจริง:** `engine-layout.ts` ป้อนตำแหน่ง chamber ให้ six-DOF (`layoutChambers`, `vehicle-data.ts:413`) ยานใน catalogue ใช้ branch ของตัวเอง (`s1` เมื่อ `count === 9`, `:382`) แต่ stage custom ที่นับเครื่องใหม่จะใช้ตำแหน่งที่วาด การเปลี่ยนตามจำนวนเครื่องจึงเปลี่ยนฟิสิกส์ของ stage custom | `src/data/engine-layout.ts` (P-D), `src/design/exploded.ts`, `src/ui/build/stack-svg.ts` | ความยาวและเส้นผ่านศูนย์กลางที่วาดของทุกชิ้นเท่ากับ `VehicleSpec` แบบตรงตัวทั้ง catalogue, custom, remix และ sized; Apart คงสัดส่วน; เลือกด้วย keyboard/touch ได้ครอบ interstage/fairing แล้วพาไปแท็บหรือช่องที่ตรงกัน; ร่างที่ใช้ไม่ได้แสดงสถานะรอพร้อม revision; ภาพ TH/EN/RU ที่ 320/390/1280 px ได้รับอนุมัติ; **ข้อมูลอ้างอิงและ tolerance ที่ตรึงก่อนรัน:** (ก) ความสูงที่วาด = stack ที่บินแบบตรงตัว (ข) ความสูงที่เผยแพร่มาจากคู่มือผู้ใช้หรือแหล่งที่อ้างได้ และแสดงคู่กัน (Saturn V เทียบแบบไม่รวมยาน Apollo/หอหนีภัย) (ค) ถ้า \|วาด − เผยแพร่\| ≤ 3 % ถือว่าผ่าน ถ้าเกิน ให้ติดป้ายส่วนต่างพร้อมสาเหตุบนภาพ และเพิ่มแถวใน source ledger ของ R4.1 (M-PHYSICS-040, S13) **ห้ามแก้ความยาว stage ใน R3.2r** (ง) มุมของ strap-on ที่วาดเท่ากับมุมของฟิสิกส์แบบตรงตัว (จ) layout ตามจำนวนเครื่อง: ยานใน catalogue ต้องเท่าเดิมทุกบิต ส่วน stage custom (fixture s1 ที่มี 5, 7 และ 12 เครื่อง) ต้องมีตาราง before/after ของตำแหน่ง chamber, torque จาก gimbal สูงสุด, ความคลาดของ attitude และสภาพตอน insertion ที่ P อนุมัติ (ฉ) เครื่องที่ถูกเปลี่ยนวาด bell จาก `EngineSpec` ใหม่ | EO-PHY-1 และ EO-PHY-2 เท่าเดิมทุกบิต (catalogue); รัน `rigid-flex-golden` เพราะ input ของ rigid runtime เปลี่ยนสำหรับ stage custom; ตาราง before/after ทั้ง point-mass และ six-DOF; unit ต่อยานสำหรับความสูงและมุม; ภาพให้เจ้าของ; ขยาย `bench-part.test.ts` ให้ครอบ variant; journey `r3-bench-drawings` พร้อม sabotage | CO-6, R0.4, M-BUILD-015, M-BUILD-024 |

- **quality guard (OR-2):** ห้ามแก้ข้อมูลฟิสิกส์ให้ตรงภาพ และห้ามวาดต่างจากที่บิน; ใช้ SVG และไม่มี WebGL; PR ที่เปลี่ยนความสมจริงต้องแยกจาก PR ภาพ (หนึ่งชนิดต่อ PR) · **หลักฐาน:** `reports/R3.2r-rocket-drawings.md` (ตารางความสูงพร้อมแหล่ง, before/after ของ stage custom) · **execution_authorized:** false

### 12.5 R3.3r — ภาพดาวเทียมใน Watch และ Explore และบัญชี section × level (M-LAUNCH-081)

- **ขอบเขต:** #75/#78/#80 ส่งภาพบน bench ของ Engineer แล้ว (M-BUILD-003 เสร็จ) R3.3r เหลือ (1) ภาพแยกชิ้นดาวเทียมในระดับ Watch (2) ภาพเดียวกันใน satellite designer ของ Explore (`satellite-level.ts`; ข้อความ v1.2 ระบุ Explore/Engineer จึงเป็นข้อจำกัดที่รับพร้อม G3) (3) บัญชี section × level (`section-plan.ts`, ROADMAP รูปแบบเดิม) ให้ตรงกับของที่ ship (4) แบบมีเงื่อนไข ไม่นับ: แผนภาพโหมดการชี้ (ADCS) ถ้ากำหนดขอบเขตที่ GK1 · test ความสดย้ายไปเป็นหลักฐาน sabotage ของ M-BUILD-015 (R3.4r PR1)
- **ผลการตรวจข้อ (4) (ADCS; เดิมข้อ 3) บน `7662ead` (ไฟล์เหล่านี้ไม่เปลี่ยนบน `5f9aa2e`):**
  - รายการแผนภาพของ PLAN:R3.3 ครบแล้ว: sunlight/eclipse/power (#80 แท็บ Power), antenna pointing/link (#80 แท็บ Radio), camera footprint (#80 แท็บ Camera) และ attitude axes (#78)
  - แท็บ Propulsion, Attitude และ Lifetime ของ bench (`7662ead:src/ui/build/satellite-bench.ts:75-76`) ไม่มีแผนภาพ แต่ไม่อยู่ในรายการของ PLAN:R3.3 และ M-BUILD-003 จึงไม่เพิ่มงานเอง
  - ข้อที่ต้องตัดสินใน Day 0 พร้อมการตรวจภาพของเจ้าของ: view model `linkDiagram` ไม่มีข้อมูลโหมดการชี้ (ADCS) แผนภาพ Radio จึงวาดลำคลื่นจากดาวเทียมไปสถานีโดยไม่ผูกกับท่าทาง ถ้าเจ้าของถือว่า "antenna pointing" ยังไม่ครบ หรือต้องการแผนภาพของแท็บอื่น ให้กำหนดขอบเขตที่ GK1 เป็น PR4 แบบมีเงื่อนไข (ไม่นับใน 3 PR)
- **เลน:** B-S (`src/design/satellite-drawing.ts`, `src/design/satellite-diagrams.ts` และ `src/ui/build/satellite-diagrams-svg.ts` ที่ #80 สร้าง และโมดูลภาพแยกชิ้นใหม่ที่เสนอ `src/design/satellite-exploded.ts`) · B ประกอบ Watch ใน `build-screen.ts` และภาพใน satellite designer ของ Explore (`satellite-level.ts`) · I/W แก้ `section-plan.ts` และ ROADMAP **คลื่น:** K3 **ประมาณการ (หยาบ):** 8 agent-days, 3 PR (refresh 2026-10-04; PR4 แบบมีเงื่อนไขไม่นับ) **OR:** OR-2, OR-3
- **ขึ้นกับ:**
  - R3.1 (revision ของแบบ: ส่งแล้วใน #80)
  - **M-BUILD-015 (PR1 ของ R3.4r) ต้อง merge ก่อน PR1 ของ R3.3r**
  - D-21 (สำหรับแถว D03 ของบัญชี)
  - R0.4 M-PLAN-010 (EO-ORB-1 ตรึงผลของ core รวม eclipse/power)
  - EQ-12 M-LAUNCH-037 (ถ้ามี canvas)
- **fold กับ M-ORBIT-018: ตรวจซ้ำแล้วและตัดออกจาก `folds.tsv`:**
  - **เหตุผลของ fold เดิม:** แผนภาพ eclipse/power ของ R3.3r จะใช้ผลของ core คราส ขณะที่ 018 (EQ-5) รวม helper golden-section ที่ `worstEclipse` ใช้ (`7662ead:src/orbit/eclipse.ts:179-220`)
  - **สิ่งที่ตรวจพบ:** แผนภาพนั้นส่งแล้วใน #80 และ `satellite-diagrams.ts` อ่านเฉพาะ `SatelliteFigures` โดยไม่ import `src/orbit/*` ส่วนขอบเขตที่เหลือของ R3.3r (ภาพแยกชิ้นใน Watch และ test ความสด) ไม่แตะ core ของคราสหรือพลังงาน จึงไม่มีไฟล์หรือ oracle ทับกันอีก
  - **ผล:** 018 เดินตามปกติใน EQ-5 ผลของ 018 ต่อแผนภาพมีตัวคุ้มครองสองชั้น คือ oracle M-PLAN-010 (EO-ORB-1) และ `tests/satellite-diagrams.test.ts` ที่ยืนยันว่าค่าในแผนภาพเท่ากับ figures
  - **ถ้าต้องเพิ่มกลับ:** ถ้า PR4 จะเรียก core ของคราสหรือพลังงาน ให้เพิ่ม fold กลับตามหลักเดิม
- **ชนิดการเปลี่ยนต่อ PR:**
  1. feature: ภาพแยกชิ้นใน Watch (SVG)
  2. feature: ภาพใน Explore satellite designer (ใช้ `satelliteDrawing()`/`satellite-svg.ts` เดิม ไม่มี geometry ชุดที่สอง)
  3. feature (I/W): บัญชี section × level
  4. (มีเงื่อนไข ไม่นับ) ADCS

| รหัส (ที่มาเดิม) | P / ขนาด / สถานะ | เรื่องและเหตุผล | ไฟล์ | เกณฑ์รับ | วิธีพิสูจน์ | ขึ้นกับ |
|---|---|---|---|---|---|---|
| M-LAUNCH-081 (RM:idea-2; รับส่วนที่เหลือของ M-BUILD-003: PLAN:R3.3, PLAN:U04, OD:IMPLEMENTATION-STATUS D06 "draws no picture", RM:D06) | P3 / L / บางส่วน | ตาราง section × level ยังมีช่องว่าง: Watch ของ Build ไม่มีภาพแยกชิ้นดาวเทียม (Watch วาดจรวดเท่านั้น); satellite designer ของ Explore (`satellite-level.ts`) ไม่แสดงภาพของดาวเทียม เพราะ `satelliteDrawing()` ถูกเรียกเฉพาะบน bench ของ Engineer (`5f9aa2e:src/ui/build/satellite-bench.ts:245`); Explore ของ Orbit ไม่มี challenge (→ **ED-GAME-1**, X01, S16); หน้า Engineer ของ D03 (→ D-21, R3.6) ส่วนของ R3.3r คือทำภาพสองจุดแรกและทำบัญชีให้ตรงกับของที่ ship | `src/design/satellite-drawing.ts`, `src/design/satellite-diagrams.ts`, `src/ui/build/satellite-diagrams-svg.ts`, `satellite-svg.ts`, `satellite-bench.ts`, `build-screen.ts` (Watch), `satellite-level.ts` (Explore), โมดูลภาพแยกชิ้นที่เสนอ, `src/ui/section-plan.ts` (`BUILD_BUILT_ITEMS`, `BUILD_ITEM_OPEN_AT`), `docs/ROADMAP-PART2-3.md` (รูปแบบเดิมเท่านั้น); core อ่านอย่างเดียว ได้แก่ `src/orbit/eclipse.ts`, `power.ts`, `link.ts`, `imaging.ts`, `attitude.ts`, `satellite-cores.ts`, `src/design/satellite-model.ts`, `satellite-link.ts` | (ก) Watch แสดงภาพแยกชิ้นของ template ทุกตัวใน catalogue โดยใช้ geometry จาก `satelliteDrawing()` เดิม ไม่มี geometry ชุดที่สอง (ค) array=0/ไม่มี engine/กล้อง/จาน และ tracking/body/spinner วาดต่างกันจริงในภาพแยกชิ้นด้วย (ง) assumption อ่านได้ใน TH/EN/RU (จ) ไม่มี WebGL (ฉ) ค่าในแผนภาพของ #80 ยังเท่ากับ figures · เพิ่ม: Explore แสดงภาพเดียวกับ bench ของ revision เดียวกัน (ผ่าน helper ของ 015); รายการ “จะตามมา” ในแอปตรงกับของที่ ship; ROADMAP แก้ใน PR เดียวกันโดยไม่เปลี่ยนรูปแบบ (S02 §02.13 ข้อ 28) | unit ของ view model ภาพแยกชิ้นทุก template; `satellite-diagrams.test.ts` และ EO-ORB-1 ไม่เปลี่ยน (core ไม่ถูกแตะ); journey `r3-bench-drawings` ขยายไป Watch และ Explore; ภาพให้เจ้าของ; `tests/section-plan.test.ts`, `section-nav-model.test.ts`; EO-UI-3 ของหน้าแผนและหน้าจอ Build ที่ไม่ได้แตะ | M-BUILD-015, D-21 |

- **ข้อสังเกตด้านความสมจริง:** แผนภาพของ #80 รับค่าจาก figures ของ core ทั้งหมด เมื่อ R4.3 (M-ORBIT-046 สัญญา model ดาวเทียมเดียว, ค่าคงที่สุริยะ 1361) หรือ R4.5 (M-PHYSICS-020 frame ของดวงอาทิตย์) เปลี่ยน core แผนภาพจะตามโดยไม่ต้องแก้ UI เพราะ `satellite-diagrams.test.ts` เทียบกับ figures ไม่ใช่กับตัวเลขตายตัว (S13, S14)
- **quality guard (OR-2):** ไม่มีฟิสิกส์ชุดที่สองใน UI, ใช้ SVG/2D ก่อน, assumption ทุกข้อมีชื่อ และไม่อ้างว่าเป็นแบบของผู้ผลิต · **หลักฐาน:** `reports/R3.3r-satellite-residuals.md` · **execution_authorized:** false

### 12.6 R3.4r — การรวม Build ต่อยอด (หลัง PR ของ EQ-13)

- **เลน:** B (`engineer-level.ts`, `explore-level.ts`, `satellite-level.ts`, `satellite-bench.ts`, `review-panel.ts`, `stand-panel.ts`, `staging-panel.ts`, `requirements-page.ts`, `satellite-fly.ts`, CSS ของ Build; `style.css` ผ่าน I-train) **คลื่น:** K3 **ประมาณการ (หยาบ):** 29 agent-days, 10 PR **OR:** OR-2, OR-6
- **ขึ้นกับ:**
  - EQ-13 ครบ 4 PR ก่อน (รวม M-PLAN-029) เพราะเขียนไฟล์เดียวกัน (fold) **ยกเว้น M-PLAN-027** (XS, a11y ถดถอยที่ส่งแล้วและ live บน `09cc2f5`) ซึ่งเป็น PR แรกของเลน B ใน K1–K2 ไม่ต้องรอ EQ-13 (OR-2; S05 §05.11 ข้อ 6)
  - FX-1 (M-BUILD-006/007/008/029, K1) ตามกฎ D-63
  - R3.1 (revision; ส่งแล้ว) และ R3.2r/R3.3r (ภาพ)
  - M-BUILD-024/025 (R0.4)
  - D-46 (`ui/format.ts`) สำหรับ 031; D-53 สำหรับ 065
- **ภาระของเลน:** เลน B มี 16 PR ใน K3 (EQ-13 4, R3.4r 10, R3.1r 1, R3.5r 1; S05 §05.6) โดย PR M-PLAN-027 หนึ่ง PR (XS) ทำก่อนใน K1–K2 จึงเหลือใน K3 จริง 15 PR การนับรายคลื่นของ `packages.tsv` ยังนับทั้งแพ็กเกจไว้ที่ K3
- **ทำไมไม่ย้ายไป FX-1:** 009 (P3) และ 015 (P2) ไม่ใช่ P0/P1 จึงไม่เข้าเงื่อนไข D-63 คงไว้ในเลน B หลัง FX-1 ส่วน M-PLAN-027 (P1, a11y ถดถอยที่ส่งแล้ว ไม่ใช่ข้อมูลหาย/ผลเท็จ) ไม่ใช่งานของ FX แต่ทำเป็น PR แรกของเลน B ใน K1–K2
- **ชนิดการเปลี่ยนต่อ PR (ลำดับ):**
  1. bug-fix (ทำก่อนใน K1–K2 ก่อน EQ-13): M-PLAN-027 (a11y: focus หลัง Stacked/Apart และ Deployed/Stowed, reduced motion ของ `showPart`; การเปลี่ยนชื่อ booster ให้ตรง Watch เป็น PR quality-improving แยกหลัง M-PLAN-029)
  2. quality-improving: 015 (+ test ความสดพร้อม sabotage ที่ย้ายมาจาก M-BUILD-003)
  3. bug-fix: 009
  4. feature: 012 (หลัง FX-1 006)
  5–6. feature: M-PLAN-030 (builder จรวด แล้ว satellite typed target/ทางเลือก)
  7–8. quality-improving: 031 + 038 (รวม `metres` ของ R3CR-02 และเวลา ISO ของ #77)
  9. quality-improving: 032
  10. 065 เลื่อน (D-53)

| รหัส (ที่มาเดิม) | P / ขนาด / สถานะ | เรื่องและเหตุผล | ไฟล์ | เกณฑ์รับ | วิธีพิสูจน์ | ขึ้นกับ |
|---|---|---|---|---|---|---|
| M-PLAN-030 (ส่วนที่เหลือของ M-BUILD-004/005: PLAN:R3.4 “targeted edit เข้า field ถูก”, PLAN:A03; R3 report “การพาไปที่ field ใน builder เป็นงาน R3.5”) | P2 / M / เปิด (ใหม่) | ส่วนที่เหลือของข้อความ v1.2 R3.4 “targeted edit เข้า field ถูก” ที่รับเป็นข้อจำกัดพร้อม G3: focus ลงที่ control แรกของการ์ด (`5f9aa2e:src/ui/build/explore-level.ts:635`) ไม่ใช่ช่องต้นเหตุ; แถว readiness ของดาวเทียมไม่มี typed target (`satellite-level.ts` ไม่เปลี่ยน); เหตุกำกวมยังไม่มีทางเลือก | `explore-level.ts`, `satellite-level.ts`, `review-model.ts`, `panel.ts` (focus hook ผ่าน I-train) | ทุกรหัสเหตุ map ไปยัง target ด้วย id ของช่องหรือชิ้น ไม่ใช้ข้อความแปล; กดแล้วเปิดแท็บ/ชิ้น/ช่อง focus และ scroll ไปที่ช่องต้นเหตุ ไม่ apply อัตโนมัติ; เหตุกำกวมแสดงทางเลือกที่มีหลักฐาน; readiness ที่ล้าสมัยไม่ถูกใช้แทนแบบที่แก้ (helper ของ 015); mouse/keyboard/touch และ TH/EN/RU ที่ 320/390/1280 px ไม่ล้น | ผล `readiness-core` ไบต์เท่าเดิมทั้ง fleet; unit ของตาราง target; journey พร้อม sabotage (focus ลง control แรกแล้วต้องล้ม); EO-UI-3 ของหน้าจอที่ไม่ได้แตะ | EQ-13, 015, M-BUILD-024 |
| M-PLAN-027 (R3CR-03 ส่วน a11y parity; `refresh/r3-code-review.md` §6) | P1 / XS / เปิด (ใหม่; K1–K2 ก่อน EQ-13) | การถดถอย a11y เล็ก ๆ ของ bench ที่เพิ่งส่ง: focus หายหลังกด Stacked/Apart (`engineer-level.ts:367`, ไม่มี `data-k`) และ Deployed/Stowed (`satellite-bench.ts:273`, ไม่ได้ครอบด้วย `keepFocus`); `showPart` เลื่อนแบบ smooth โดยไม่สน reduced motion (`:419`; Explore ใช้ `reducedMotion()`); booster ให้ชื่อที่ screen reader อ่านเป็นแค่ role (`:407`) ไม่เท่า Watch/Explore | `src/ui/build/engineer-level.ts`, `src/ui/build/satellite-bench.ts` | focus อยู่ที่ปุ่มเดิมหลังกด; reduced motion = เลื่อนทันที; ชื่อ booster = `${role}: ${stageName}` แบบ Watch; ส่วนอื่นของ DOM เท่าเดิม | เทสต์ที่ล้มก่อนแก้ทั้งสามข้อ; axe ไม่มี serious/critical ใหม่; snapshot DOM อื่นเท่าเดิม | EQ-13 PR1 (`keepFocus` helper ของ M-BUILD-026) |
| M-BUILD-009 (RW:B-19, DP:ENG-K11, PLAN:R3.4) | P3 / S / เปิด | `7662ead:src/ui/build/explore-level.ts:705` เขียน `draft.ratings` ใน `.then()` (`:704-706`; บน `da67341` คือ `:668`) (บน `5f9aa2e:explore-level.ts:705` ไม่เปลี่ยน) ส่วนการยกเลิกเมื่อ signature เปลี่ยนเกิดใน rAF ถัดไป การแก้ A → B → A ในช่วงนั้นทำให้ผลของ B เขียนทับ rating ที่ถูกของ A ภาพบนจอไม่ผิด แต่ผู้ใช้ต้องรอคำนวณใหม่ 1–8 s | `explore-level.ts`, `explore-model.ts`, `review-panel.ts` | เก็บ rating ตาม signature (map เล็ก เช่น 4 ค่าล่าสุด) หรือเขียนเฉพาะเมื่อ signature ยังตรง; review แสดง "ตรวจสำหรับ revision N" ผ่าน helper ของ 015 | unit ของ race A → B → A; ค่า rating เท่าเดิม; migration test ถ้ารูปแบบ draft ที่เก็บเปลี่ยน | 015 |
| M-BUILD-012 (RW:B-15, OD:Build/satellite UX limits ส่วน write-back) | P3 / S / เปิด | rating ที่คำนวณในหน้า review ของ Engineer สำหรับแบบที่บันทึกไว้ไม่ถูกเก็บกลับ (`rated()` ที่ `7662ead:src/ui/build/engineer-level.ts:308-318`; บน `da67341` คือ `:286-296`) จึงหายเมื่อโหลดใหม่ | `engineer-level.ts`, `design-store.ts` (ผ่าน L) | ปุ่ม "Keep these ratings with the design" ที่ผู้ใช้ต้องกดเอง; เก็บเฉพาะ rating ที่ converge (FX-1 006); เขียนผ่าน repository ตามกฎ epoch ของ R1 พร้อมตรวจ revision; ห้ามแก้ record เงียบ | unit + journey โหลดใหม่แล้ว rating ยังอยู่; EO-STO-2 แสดงว่า record อื่นไม่เปลี่ยน | FX-1, 009 |
| M-BUILD-015 (OD:IMPLEMENTATION-STATUS D06 "~180 ms", PLAN:§4.2 DesignPreview, PLAN:R3.4, DP:ENG-K11) | P2 / M / เปิด — เกณฑ์ v1.2 R3.4 “changing design invalidates stale checked revision” ที่รับเป็นข้อจำกัดพร้อม G3 (ไม่ปิด) | บน `5f9aa2e` glance และ figures แสดงสถานะ stale อยู่แล้ว (`satellite-level.ts:267-271`, `:325-340`) แต่ `renderChecks()` (`:274-292`) รัน `satelliteChecks(d, fig)` ด้วยแบบปัจจุบันกับ figures ที่อาจเก่าโดยไม่มีป้าย และ readiness/rating ไม่ระบุ revision ที่ตรวจ (การอ้างเดิม `da67341:satellite-level.ts:71` ชี้ค่าคงที่ ไม่ใช่การตรวจ) ผลการตรวจจึงขัดกับตัวเลขข้างกันได้ราว 180 ms | `src/ui/result-slot.ts` (ใช้ซ้ำ), `satellite-level.ts`, `review-panel.ts`, `explore-level.ts` | helper เดียวให้ทุกผลของ Build มี `{revision, fresh \| computing \| stale}`; การตรวจใช้เฉพาะ figures ของ revision เดียวกัน หรือแสดง "กำลังอัปเดต"; คงผลล่าสุดที่ใช้ได้พร้อมรูปแบบ stale (ไม่กระพริบ); ไม่มีการคำนวณเพิ่ม | unit; ตัวเลขหลังนิ่งเท่าเดิม (EO-UI-3 ของ figures); probe นับการเรียกคำนวณไม่เพิ่ม; journey พิมพ์ระหว่างคำนวณ; test ความสด: แก้แบบระหว่างคำนวณแล้วภาพ แผนภาพ และการตรวจต้องเป็น stale หรือ revision ใหม่คู่กับตัวเลขใหม่ พร้อม sabotage (ป้อน figures ของ revision เก่าแล้วต้องล้ม) | R3.1 (ส่งแล้ว) |
| M-BUILD-031 (RW:B-17, RW:B-18 ส่วน lead/tabs, OD:Build/satellite mobile & i18n limits) + M-LEARNING-038 (= 031, นับครั้งเดียว) | P2 / M / เปิด | ตัวเลขแกนกราฟใช้ "." ทุกภาษา (`7662ead:src/ui/build/stand-panel.ts:495`, `staging-panel.ts:407`); เวลาแสดงแบบ ISO; รายละเอียดของ validator/store/source-note เป็นภาษาอังกฤษ; ชื่อแบบใน pack ไม่ได้แปล; จอ RU 360 px แท็บ 5 ตัวขึ้น 5 แถว; lead ของ Engineer ยาว 8–12 บรรทัดบนโทรศัพท์; แถบบทเรียนการออกแบบกินจอโทรศัพท์ 42 % + `engineer-level.ts:442` `metres` ใช้ `toFixed` (RU “12.50 м” ข้าง “1,5 т”) แก้เป็น `num(v, v < 10 ? 2 : 1)` โดยเริ่มจากเทสต์ RU ที่ล้มก่อน (EN/TH เท่าเดิม); เวลา ISO “UTC” ในคำแนะนำของ #77 ลงบัญชี formatter ของ D-46; preview ใน shell ของ Engineer ไม่ล้นที่ 320/390 px | ไฟล์ของ Build ตามเลน, โมดูล i18n ของฟีเจอร์ | ใช้ formatter ตาม locale (`ui/format.ts` หลัง D-46) ส่วน export ยังใช้ "." ตามสัญญา; ข้อความของ validator/store/pack แปลครบ; ไม่ล้นแนวนอนที่ 320/360/375/390 px ใน TH/EN/RU; lead ≤ 4 บรรทัดบนโทรศัพท์; ความสูงแถบบทเรียนมีขอบเขต | EO-EXP-1: ไบต์ของ CSV/export เท่าเดิม; ค่าตัวเลขเท่าเดิม; probe ใน journey `scrollWidth ≤ clientWidth`; ภาพให้เจ้าของ; native review ข้อความผ่าน HU-3 (S16) | D-46 |
| M-BUILD-032 (OD:IMPLEMENTATION-STATUS D07 UX limits, OD:D06 Fly it) | P3 / S / เปิด | เวลาประมาณการของ requirements สูงไปราว 2.5 เท่า; ตารางหยุดที่ 400 แถว (กรณี THEOS-2 26 วันใช้ 28 s); Fly it เสนอจรวดอื่นเฉพาะเมื่อไม่ผ่าน | `requirements-page.ts`, `satellite-fly.ts` | **ตรึงก่อนรัน:** เวลาประมาณการคลาดไม่เกิน ±30 % บนเครื่อง baseline และโปรไฟล์ CPU 4× (อ้างอิงจาก scenario Build ของ M-BUILD-025 ที่วัดก่อน); กรณีเกิน 400 แถวแนะนำให้ "แคบช่วง"; verdict แบบระวังเสนอจรวดทางเลือก | ผล requirement-trade deep-equal กับฐาน; unit ของตัวประมาณ; `--compare` ของ scenario Build | M-BUILD-025 |
| M-LAUNCH-065 (DP:UX-H3-4/PED-H6-6, OD:§I-2, RW:MOB-04, RW:S16 บางส่วน) | P3 / L / **เลื่อน** | หนึ่งงานต่อหนึ่งหน้าจอบนโทรศัพท์ (แท็บ Setup/View/Results) สำหรับ Engineer ของ Orbit และ Build **เลื่อนจนกว่า D-53 จะตัดสิน** หลัง HU-1 รอบ 1 | — | ถ้ารับ: route-first `?task=` ใน hash เพื่อให้ Back ใช้ได้; desktop เหมือนเดิม; หนึ่ง PR ต่อ section พร้อม journey; ส่วน Orbit เป็นของ O | EO-UI-1/3 ของ desktop เท่าเดิม | D-53, HU-1 |

- **quality guard (OR-2):** ไม่มี auto-tune หรือ apply เงียบ, logic ของ readiness ไม่เปลี่ยน, ไบต์ export เท่าเดิม และไม่มีการเขียน store เงียบ · **หลักฐาน:** `reports/R3.4r-build-integration.md` · **execution_authorized:** false

### 12.7 R3.5r — Fly it ตามแบบ การ์ด Home ตามกลุ่มผู้ใช้ และลิงก์แชร์ (R3+ ต่อยอด)

- **เลน:** B (013, 023) · I รับ hook ของ Home (067) ผ่าน I-train **คลื่น:** K3 (023: K4) **ประมาณการ (หยาบ):** 7 agent-days, 3 PR ไม่ต้องรอ EQ-15 (013 อยู่ในไฟล์ Build; 067 แตะ `home.ts`/`home-logic.ts`) **OR:** OR-2, OR-4, OR-6
- **ขึ้นกับ:** 013: R3.1 (ส่งแล้ว), M-BUILD-024; 067: HU-1, D-8, D-54; 023: D-61, M-PLAN-028 PR4 (DesignRef ใน Share), R1.6 ขั้น b
- **ปลดล็อก:** ไม่มีประตูใด
- **ชี้ไปที่อื่น:** M-PHYSICS-017 อยู่ใน EQ-5 · M-LEARNING-018 และ M-LAUNCH-063 อยู่ใน ED-LES-2 (S16) · M-LAUNCH-068 อยู่ใน ED-I18N-2 (S16)
- **ชนิดการเปลี่ยนต่อ PR:**
  1. quality-improving (B): 013 (mission ค่าเริ่มต้นเท่าเดิมทุกไบต์)
  2. feature (I hook): 067 หลัง HU-1
  3. เลื่อน: 023 (K4, D-61)

**ข้อความ R3.5 ของ v1.2 (คงไว้) พร้อมสถานะหลัง #77/#80**

| bullet ของ PLAN:R3.5 | สถานะ | ส่วนที่เหลือ → รายการ |
|---|---|---|
| Home "ลองปล่อยครั้งแรก" เปิด editable template พร้อมบอกสิ่งที่จะนำมาใช้; ไม่ทับ mission/draft เดิมแค่เพราะเปิด route | ส่งมอบ (G3) | การ์ดตามกลุ่มผู้ใช้พร้อมเวลา → 067 (R3.5r) |
| compact mission context แสดงยาน/เป้าหมาย/source/revision และขั้น Build→Check→Launch→Result→Orbit→Docking ที่รองรับ | ส่งมอบ (G3) | revision ในไฟล์ mission ที่ export → M-PLAN-028; ตรวจทั้งเส้นทาง → M-PLAN-025; ขั้น Docking → R5.1 (S15) |
| Watch→สร้างสำเนาทดลองได้ โดย demo เดิมไม่ถูกแก้; Satellite Engineer save/open/send-to-Orbit ผ่าน shared workspace โดยตรง | ส่งมอบ (G3) | Satellite Engineer save/open/send ตรวจใน M-PLAN-025 |
| result→typed edit เปิด frozen inputs หรือเปรียบเทียบ current draft; suggested changes แสดง before/after และ apply โดยตั้งใจ | ส่งมอบ (G3) | การเทียบร่างปัจจุบันและเหตุอื่น → M-LAUNCH-063 (ED-LES-2) |
| รักษา lesson locks, return position และผลเที่ยวเก่า; "วางวงโคจรโดยตรง" กับ "ต่อจากเที่ยวบิน" ใช้ label ที่ต่างความหมายชัดเจน | ส่งมอบ (G3) | lesson locks/return position ตรวจใน M-PLAN-025 |

| รหัส (ที่มาเดิม) | P / ขนาด / สถานะ | เรื่องและเหตุผล | ไฟล์ | เกณฑ์รับ | วิธีพิสูจน์ | ขึ้นกับ |
|---|---|---|---|---|---|---|
| M-BUILD-013 (RW:B-16, OD:Build UX limits ส่วน Fly it) | P2 / S / เปิด (ยืนยันบน `5f9aa2e:src/ui/build/explore-level.ts:752`) | "Fly it" ของ Explore เล็ง preset 500 km จากฐานแรกเสมอ: `7662ead:src/ui/build/explore-level.ts:752` เรียก `handoffDocument()` โดยไม่ส่ง `where` จึงใช้ค่าเริ่มต้นใน `src/design/build-handoff.ts:64-65` (`spec.sites[0]`) และ payload `cubesats` (`:47`) ซึ่งแสดงเป็น "CubeSat rideshare dispenser" ไม่ว่ามวลเท่าใด (#77–#80 ไม่แก้ส่วนนี้ #80 เพิ่มเพียงชื่อและ revision ของแบบใน eyebrow) เที่ยวบินจึงไม่ตรงกับสิ่งที่ผู้เรียนออกแบบ | `src/ui/build/explore-level.ts` (B), `src/design/build-handoff.ts`, intent "แบบ → ตั้งภารกิจ" ของ R3.1 (ส่งแล้ว) | เลือกฐานจาก `spec.sites` และเป้าหมายจาก preset ที่ถึงได้; ป้าย payload ตามกลุ่มมวลหรือ "payload ของคุณ (X kg)"; ค่าเริ่มต้นยังเป็นแบบวันนี้ (500 km, ฐานแรก) | mission ที่ได้จากการกดค่าเริ่มต้นเท่ากับวันนี้ทุกไบต์ (`missionDocument` JSON); unit ว่า mission ตรงกับที่เลือก; journey | R3.1 (ส่งแล้ว) |
| M-LAUNCH-067 (DP:UX-Q3/PED-H6-6 cards, DP:D-8, OD:§I-1, RW:S16, DP:11-03) | P2 / S / บางส่วน (ทางเข้าเดียวใน #77) | Home มีการ์ด "สำหรับทุกคน / นักเรียน / วิศวกร" แต่ไม่มีเวลาโดยประมาณ S08 (D-8) ระบุว่าทางเข้าเดียวที่ลิงก์ route เดิมทำได้ก่อนรอบ 1 ส่วนการ์ดแยกกลุ่มต้องรอ HU-1 (D-54) | `src/ui/home.ts`, `home-logic.ts` (I), i18n | การ์ดลิงก์เฉพาะ route ที่มีอยู่; แสดงนาทีและคำแนะนำอุปกรณ์ **จากข้อมูลที่วัดใน HU-1 (KPI-24) ไม่ใช่ตัวเลขที่เดา**; 3 ภาษา; จาก Home ถึงการลงมือทำในหนึ่งแตะ; ไม่มี wizard หรือ placement บังคับ | journey จาก Home; EO-UI-3 ของ Home ส่วนอื่นไม่เปลี่ยน; ภาพให้เจ้าของ | D-8, D-54, HU-1 |
| M-BUILD-023 (DP:UX-H6-4) | P3 / M / **เลื่อน** | แชร์แบบและผล challenge เป็นลิงก์ `?d=` **เลื่อนจน D-61 ตัดสิน** และ M-PLAN-028 PR4 (DesignRef ใน Share) | — | ถ้าทำ: codec เดียวกับลิงก์ mission ที่ห่อแบบพร้อม `DesignRef` (hand-off และไฟล์ยังเป็น v1); เกินเพดานแล้วเสนอเป็นไฟล์; เปิดลิงก์แล้วไม่ทับร่างปัจจุบัน (guard ของ FX-1 M-BUILD-007); ไม่มีข้อมูลผู้เรียน; รุ่นใหม่กว่าถูกปฏิเสธ (D-22) | test ของเพดานและ fallback (ข้อมูลไม่หาย) | D-61, M-PLAN-028 PR4, R1.6 ขั้น b |

- **ย้ายออก:** M-LAUNCH-063 → ED-LES-2 และ M-LAUNCH-068 → ED-I18N-2 (S16) เกณฑ์เดิมย้ายไปทั้งชุด
- **quality guard (OR-2):** action ของผลไม่แก้เที่ยวที่บันทึก; ข้อเสนอเฉพาะที่มีตัวเลขในแอปรองรับ; ไม่มี badge, placement บังคับ หรือ analytics (S02 §02.6–02.8); เนื้อหาการสอนที่มีปริมาณมากรอหลักฐานผู้ใช้ (D-54) · **หลักฐาน:** `reports/R3.5-journey.md` (ต่อจากฉบับของ #77) · **execution_authorized:** false

### 12.8 R3.6 — ความลึกของ editor ใน Build (M-BUILD-022)

- **เลน:** B **คลื่น:** K4 หลัง R3.4r **ประมาณการ (หยาบ):** 4 agent-days, 1 PR **OR:** OR-3, OR-4 **ขึ้นกับ:** D-21 (ชุด B, needed-by K1), R3.4r, R3.2r (layout ตามจำนวนเครื่องจาก 076 ทำให้กลุ่มที่เปลี่ยนเครื่องวาดถูก), FX-1 (rating converge) **ชนิดการเปลี่ยน:** feature
- **ทางเลือกของ D-21 ที่กำหนดขอบเขต:**
  - (ก) ประกาศว่าเสร็จที่ Explore พร้อมลิงก์จาก Engineer (ข้อเสนอใน S08): R3.6 = 022 อย่างเดียว และแก้ D03 ใน ROADMAP + `section-plan.ts` + tests ใน PR เดียว โดยคงรูปแบบ
  - (ข) สร้างหน้า Engineer (typed guidance, maxQ/maxAccel, หน่วงเวลาแยกขั้น): ส่วนนี้ไม่สร้าง id ใหม่เอง ให้กำหนดขอบเขตเมื่อ D-21 ได้คำตอบ (เงื่อนไข “หลังหลักฐาน G3” ครบแล้ว) แล้วลงทะเบียนผ่าน S19

| รหัส (ที่มาเดิม) | P / ขนาด / สถานะ | เรื่องและเหตุผล | ไฟล์ | เกณฑ์รับ | วิธีพิสูจน์ | ขึ้นกับ |
|---|---|---|---|---|---|---|
| M-BUILD-022 (RW:B-08, RW:B-09) | P3 / M / เปิด | `remix.ts:82-106` รับเป้าของกลุ่ม strap-on ได้แล้ว แต่ UI ยืดได้เฉพาะ stage (`explore-model.ts:85-87,368`) และ parts builder ใช้ลำตัว strap-on ที่ออกแบบเองไม่ได้ ทั้งที่ `assemble()` รับ `CustomBody` ของกลุ่มได้ ผู้เรียนจึงสำรวจ trade-off ของบูสเตอร์ (เช่น SRB ที่ยืด) ไม่ได้ | `src/design/explore-model.ts`, `src/ui/build/explore-level.ts`, ส่วน builder | ยืดกลุ่มได้ 50–200 % และเปลี่ยนเครื่องด้วยกติกาเดียวกับ stage; มี editor ลำตัว strap-on แบบ custom; remix ที่ไม่ได้แก้บินเหมือนเดิมทุกบิต (invariant ของ D02); มวลและเชื้อเพลิงของกลุ่มที่ยืดใช้กฎเดียวกับ stage และติดป้ายว่าเป็นค่าประมาณของ model; ภาพแสดงกลุ่มที่แก้ (R3.2r) | test เดิมของ D02 (remix ที่ไม่แก้ → fingerprint เดิม); เทสต์ใหม่สำหรับการแก้กลุ่ม; six-DOF ของกลุ่มที่เปลี่ยนเครื่องผ่าน `layoutChambers` ตาม R3.2r; rating converge (KPI-16) | D-21, R3.4r, R3.2r, FX-1 |

- **quality guard (OR-2):** remix ที่ไม่แก้ต้องบินเหมือนเดิม; Monte Carlo ของยาน custom ใช้ dynamics ที่ผู้ใช้เลือก (CO-4 M-LAUNCH-032, S06) · **หลักฐาน:** `reports/R3.6-editor-depth.md` · **execution_authorized:** false

### 12.9 บันทึก G3 และบ้านใหม่ของเกณฑ์ที่แผนเคยเพิ่ม (บันทึกหลักอยู่ใน S05 §05.4)

| เกณฑ์ที่แผนเคยเพิ่มให้ G3 | สถานะ ณ 2026-10-04 | บ้านใหม่ | ตรวจที่ |
|---|---|---|---|
| ข้อความ v1.2 | ส่งมอบ (คำเจ้าของ; PROGRESS แถว 22–26; Pages 37230585947) | — | — |
| ทั้งเส้นทางบน candidate เดียว + cursor/เชื้อเพลิง (sabotage) | ยังไม่มี journey อัตโนมัติเส้นเดียว | R7.1 M-PLAN-025 | ทุก GK |
| ภาพกับตัวเลขไม่ขัดกัน (revision/ความสด) | ค่าแผนภาพเท่ากับ figures (#80); การตรวจดาวเทียมยัง stale ~180 ms | M-BUILD-015 (R3.4r) | GK ของคลื่นที่ merge |
| envelope ไป-กลับ, fixture ทุกรูปแบบ, รุ่นใหม่กว่าถูกปฏิเสธ | DesignRef ที่อ่านไม่ได้ถูกปฏิเสธ (#80); เอกสาร mission รุ่นใหม่กว่ายังถูกอ่านและเขียนทับ → M-PLAN-031 | M-PLAN-028 (R3.1r), M-PLAN-031 (R1.6 PR 2b, GK1), FX-1 M-BUILD-008, D-22 | GK ของคลื่นที่ merge |
| งบ WebGL context (KPI-07) | 2 context ก่อน Orbit (PB@5f9aa2e) | R3.0 + EQ-4 | GK3; ตรวจซ้ำ G5/G6 |
| ภาพหน้าจอ / ด่านร่วม R2.6, EQ-15 | ครอบโดยคำเจ้าของ / ยังไม่เริ่ม | matrix CO-3 ราย PR ของ R3+; R2.6 → “R2 complete”; EQ-15 → ก่อน R5.1 | ราย PR; GK2 |

**เกณฑ์ตรวจรับของ v1.2 (คงไว้ตรงตัว) ส่งมอบแล้ว พร้อมข้อจำกัดที่รับ**
- **R3.1:** "Build→Launch→Orbit รักษาค่าที่เกี่ยวข้อง; replay handoff ใช้ cursor ไม่ใช่ live head; newer unsupported state ปฏิเสธ; old records อ่านได้ตามขอบเขตที่ประกาศ" · ข้อจำกัดที่รับ: `DesignRef` ในไฟล์/ลิงก์ที่ Share และ Fly it จาก record ของ Engineer, fixture ทุกรูปแบบ และข้อความปฏิเสธตาม D-22 → M-PLAN-028; เอกสาร mission ที่ version ใหม่กว่าแอปยังถูกอ่านเป็นใช้ได้และเขียนทับ (ไม่ถูกปฏิเสธ) → M-PLAN-031 (P1, R1.6 PR 2b, S10 §10.3.1); journey ที่พิสูจน์ cursor และเชื้อเพลิง → M-PLAN-025 → ส่งมอบ (G3)
- **R3.2:** "dimensions/parts match `VehicleSpec` ที่ calculations/Launch ใช้; assemble/explode ไม่บิดภาพ; keyboard/touch selection; custom/remixed/sized variants ผ่าน" · ข้อจำกัดที่รับ: unit ที่ครอบ variant custom/remix/sized, การเลือก interstage/fairing ที่พาไปช่อง, ป้ายความสูงที่เผยแพร่ และภาพที่อนุมัติ → M-LAUNCH-076 → ส่งมอบ (G3)
- **R3.3:** "เปลี่ยนค่าแล้วภาพและ figures เป็น revision เดียวกัน; ไม่มีอุปกรณ์ที่แบบระบุว่าไม่มี; assumptions หาอ่านได้; invalid/stale preview แจ้งจริง" · ข้อจำกัดที่รับ: ภาพใน Explore และ Watch → M-LAUNCH-081; การตรวจดาวเทียมที่ยังอ่าน figures เก่าโดยไม่มีป้ายและ test ความสด → M-BUILD-015 → ส่งมอบ (G3)
- **R3.4:** "preview อยู่กับแบบที่ตรวจ; targeted edit เข้า field ถูก; changing design invalidates stale checked revision; mouse/keyboard/touch และสามภาษาไม่ล้น" · ข้อจำกัดที่รับ: focus ลง control แรกของการ์ดแทนช่องต้นเหตุ และ readiness ดาวเทียมไม่มี typed target → M-PLAN-030; revision ที่ตรวจไม่ถูกทำให้เป็นโมฆะ → M-BUILD-015; ตัวเลขตาม locale และการล้นบนโทรศัพท์ → M-BUILD-031 → ส่งมอบ (G3)
- **R3.5:** "custom rocket+satellite ส่งไปบินตรง specs/mass/site/epoch/dynamics; ผลย้อนแก้ไม่แก้ recorded flight; draft เดิมปลอดภัย; ส่ง Orbit ที่ cursor ตรงและ fuel ไม่คืนเต็ม" · ข้อจำกัดที่รับ: journey เส้นเดียวที่พิสูจน์ทั้งเส้นทาง → M-PLAN-025; Fly it ของ Explore ที่เล็งฐานแรกและ preset 500 km → M-BUILD-013 → ส่งมอบ (G3)

### 12.10 ผลต่อผู้ใช้และตัวชี้วัด ลำดับภายใน R3 รายการที่เลื่อนหรือปฏิเสธ และข้อสังเกต

**สิ่งที่ผู้ใช้จะเห็น และสิ่งที่ต้องวัด (OR-6)** ตัวเลขทุกตัวเป็นค่าที่วัดหรืออ้างแล้ว ผลหลัง R3 เป็นเป้า ไม่ใช่ผลที่อ้างว่าได้

| ช่วงเวลาของผู้ใช้ | วันนี้ (`5f9aa2e` = live `09cc2f5` ใน `src/`) | หลัง R3+ ต่อยอด | ตัวชี้วัดและวิธีวัด |
|---|---|---|---|
| เปิด Home ครั้งแรก | มีทางเข้า "Try a launch yourself" (#77); การ์ดกลุ่มผู้ใช้ไม่มีเวลา | การ์ดบอกเวลาที่วัดจริง (067, R3.5r) | KPI-23/24 จาก HU-1 (S16) |
| ดูจรวดใน Engineer | ภาพ bench ตามสัดส่วน แต่สูงกว่าที่เผยแพร่ 13–21 % โดยไม่มีป้าย (Vega-C, PSLV-XL, Atlas V 551) | ป้ายส่วนต่างพร้อมแหล่ง; ภาพ = สิ่งที่บิน (076) | unit ต่อยาน; ภาพที่เจ้าของอนุมัติ |
| ออกแบบดาวเทียม | schematic, ท่าพับและแกน (#78) และแผนภาพพลังงาน/คราส, link และ footprint (#80); Watch ยังไม่มีภาพแยกชิ้นดาวเทียม, satellite designer ของ Explore ไม่มีภาพ และไม่มี test ว่าภาพกับตัวเลขเป็น revision เดียวกัน | ภาพแยกชิ้นใน Watch และภาพใน Explore; ภาพ แผนภาพ และการตรวจบอกสถานะ stale (081, 015) | unit ภาพแยกชิ้น; test ความสด; `satellite-diagrams.test.ts`; EO-ORB-1 |
| แก้แบบแล้วอ่านผลตรวจ | ราว 180 ms ที่ผลตรวจอ่านตัวเลขเก่าโดยไม่มีป้าย | ป้าย "กำลังคำนวณ" และ revision ที่ตรวจ (015) | journey พิมพ์ระหว่างคำนวณ |
| ย้อนแก้หลังบิน | Show the setting และข้อเสนอ 3 เหตุ (#77) | การวินิจฉัยที่บอกเวลา ตัวเลข และปุ่มดูช่วงนั้น (063, ED-LES-2) | unit บน fixture; KPI-23 ใน HU-1/HU-4 |
| ส่งต่อไป Orbit | handoff v1 + `DesignRef` บอกชื่อแบบและ revision (#80); ไฟล์ mission ที่ export ยังไม่มี reference | ทุกทางที่ส่งแบบต่อบอกว่าเป็นแบบใดและ revision ใด หรือบอกว่าไม่มี โดย hand-off ยังเป็น v1 (M-PLAN-028; journey M-PLAN-025) | journey `r3-g3-loop` |
| เข้า Orbit หลังเปิดลูกโลก Home | 3 context พร้อมกันได้; ค้าง 4,033 ms (PB); PB@5f9aa2e: 2 context ก่อนเปิด Orbit; ค้าง 4,266 ms บนเครื่องที่ช้ากว่า (ช่วงทับกัน) | ≤ 2 context (046); การค้าง: ต้องวัด | KPI-07 (journey นับ context, `--compare`) |
| Build บนโทรศัพท์ TH/RU | แท็บ 5 แถวที่ 360 px; lead 8–12 บรรทัด | ไม่ล้น; lead ≤ 4 บรรทัด (031) | KPI-27; probe `scrollWidth` |
| ขนาดดาวน์โหลด | #75 +27 kB, #77 +23 kB และ #80 +21 kB โดยไม่มี offset; precache 15,822.7 kB บน `5f9aa2e` (committed snapshots, headroom 280.3 kB); index/i18n headroom 1.7/1.1 kB | ทุก PR รายงาน delta; ขึ้นเพดานได้เฉพาะเมื่อมี offset ตาม D-38 | KPI-01/03/30; offset ตาม D-38: EQ-6 (i18n), EQ-8 (precache/ขนาดติดตั้ง) และ EQ-7 (index, K2–K5 โดยส่วนของ Build หลัง R5.1); KPI-30 นับ #75/#77/#80 เป็นไม่มี offset จนกว่าแพ็กเกจเหล่านี้ merge |
| ความลื่นใน Build | ยังไม่มีหน้าต่างวัดของ Build ใน PB | ห้ามอ้างความเร็วของ R3 จนกว่า scenario Build (M-BUILD-025) จะบันทึกบนฐาน | scenario Build ของ `measure.mjs` (เพิ่มโดย M-BUILD-025) 3 รอบ (S04 §04.1) |

**ลำดับต่อเลน** (กราฟเต็มอยู่ใน S05 §05.5 สาย B)
```
K1–K2  C : FX-8 ─► EQ-2 (041/042/049/M-PLAN-001) ─┐
       O : EQ-4 (M-ORBIT-010 lazy context) ───────┤
       S : R0.2r ADR (สัญญาที่ส่งแล้ว)              │
       L : R1.6 a–b (PR 2b)                         │
       B : FX-1 ─► (R0.4 Build journey/scenario)    │
K3     C : R3.0 (หลัง EQ-2 + EQ-4) ◄─────────────────┘
       S+I+B: R3.1r (fixture ─► ผู้เขียนเดียว ─► source matching ─► DesignRef ใน Share ─► 011 3a/3b ─► 030)
       B : M-PLAN-027 (K1–K2) ─► … ─► EQ-13 ×4 (+M-PLAN-029) ─► R3.4r (015 ─► 009 ─► 012 ─► M-PLAN-030 ─► 031 ─► 032)
       B-S: R3.3r (หลัง 015: Watch ─► Explore ─► บัญชี)
       B-R: R3.2r (PR2: P-D เขียน engine-layout, P ตรวจ)
       B/I: R3.5r 013 · 067 (หลัง HU-1, D-8)
K4     B : R3.6 (D-21) · R3.5r 023 (D-61)
(ไม่มีประตูความสามารถ; ตรวจที่ GK ของคลื่นที่ merge)
```
EQ-5 (M-ORBIT-018) ไม่อยู่ในสาย R3 เพราะ fold กับ R3.3r ถูกตัด (§12.5)

**เลื่อนหรือปฏิเสธในส่วนนี้** (รายการเลื่อนทั้งหมดอยู่ใน S19 App C2 และข้อห้ามอยู่ใน S02 §02.13)

| เรื่อง | ผล | เหตุผล | ทางที่คงคุณภาพ |
|---|---|---|---|
| M-LAUNCH-065 แท็บงานบนโทรศัพท์ | เลื่อน (D-53) | ต้องดูงานบนโทรศัพท์จริงจาก HU-1 ก่อน | ระหว่างรอ: 031 ทำให้ lead ≤ 4 บรรทัด |
| M-BUILD-023 ลิงก์ `?d=` | เลื่อน (D-61) | `DesignRef` ยังไม่ครบทุกทางส่งต่อ (Share/export, M-PLAN-028 PR4) และขีดจำกัดของ LINE ต้องวัดใน HU-6 | ระหว่างรอใช้ไฟล์ export ที่มีอยู่ |
| การ์ดตามกลุ่มผู้ใช้ (067) | รอ HU-1 (D-54) | เนื้อหามาก | ทางเข้าเดียวของ #77 ใช้ได้ก่อน (063 ย้ายไป ED-LES-2) |
| ปล่อย context ทุกครั้งที่ออกจากหน้า | ปฏิเสธ | ภาพกระพริบ และเข้าหน้าซ้ำช้า (S02 §02.13 ข้อ 6) | ปล่อยเฉพาะเมื่อเกินงบ; renderer ร่วมหลังวัด |
| renderer ต่อแท็บหรือต่อภาพตัวอย่าง / ภาพ 3 มิติก่อน R3.0 และ EQ-2 | ปฏิเสธ | หน่วยความจำ GPU และเสี่ยงเสีย context | SVG ก่อน |
| แก้ความยาว stage ให้ภาพตรงความสูงที่เผยแพร่ / วาดต่างจากที่บิน | ปฏิเสธ | ฟิสิกส์ต้องไม่ตามภาพ และ drawn = flown | ติดป้ายส่วนต่าง แล้วส่งให้ R4.1/R4.2 ตามวิธีของ S13 |
| envelope v2 ของ hand-off ที่วางไว้เดิมใน R3.1 | ตัดออก (§12.3) | v1 + `DesignRef` ที่ไม่บังคับ (#80) ให้ตัวตนและ revision แล้วโดยไม่ต้องย้ายข้อมูล ส่วน v2 จะทำให้ `parseHandoff` ของทุก build วันนี้ปฏิเสธ hand-off ทั้งก้อน | ถ้าจำเป็นภายหลัง: งานแยกที่มี migration v1 → v2 พร้อม oracle และกติกา reader-before-writer |
| apply ข้อเสนออัตโนมัติ / auto-tune | ปฏิเสธ | PLAN:§4.2 ResultAction ห้ามแก้แทนผู้ใช้ | "Apply to a new mission" ที่ผู้ใช้กดเอง (#77) |
| เพิ่ม precache สำหรับภาพ Home โดยไม่มี offset | ปฏิเสธ | D-38, KPI-30 | ใช้ SVG หรือ prefix on-demand `home/` |
| ใช้ key i18n ร่วมกันข้ามบริบท (R3CR-07: 7 key ค่าเหมือนกันทุกไบต์ใน en/ru/th) | ปฏิเสธ | ประหยัดไม่ถึง 1 kB แต่ผูกบริบทของผู้แปล (รัสเซียผันคำ) | key แยกตามบริบท |
| `openTemplate` render panel สองรอบและ parse mission ทั้งก้อน (R3CR-11) | ไม่มีแถวของตัวเอง | ต่ำกว่าเกณฑ์ (หนึ่งครั้งต่อการกด) | แก้เมื่อแตะ `panel.ts`/`main.ts` (CO-4/I-train) |

**ข้อสังเกตที่พบระหว่างเขียน (ข้อเสนอ ยังไม่มี id)**
1. **ฐานแผนเลื่อนระหว่างเขียน:** #77–#83 merge และ #80–#82 เผยแพร่ที่ `09cc2f5` เจ้าของประกาศ R3 ครบ ประมาณการของ R3+ ทำใหม่แล้วใน refresh 2026-10-04 และตรวจซ้ำที่ GK1
2. **076 ไม่ใช่งานภาพล้วน:** การจัด layout ตามจำนวนเครื่องเปลี่ยน chamber ของ six-DOF สำหรับ stage custom จึงต้องเป็น PR ชนิด realism-changing ที่ P-D เขียนและ P ตรวจ (§12.4) ไม่ใช่ PR ของ B-R
3. **KPI-07:** เป้าคือ 1 context ก่อนเปิด Orbit (EQ-4) และไม่เกิน 2 ตลอดการใช้งาน (R3.0) ตาม S04 ส่วนการค้าง 4,033 ms ตอนเข้า Orbit ไม่มีแพ็กเกจใดสัญญาว่าจะลด จนกว่าขั้น 3 ของ R3.0 จะวัด
4. **D-61:** บล็อก R3.5r (M-BUILD-023, เลื่อน) ตรงกันทั้ง `decisions.tsv`, S08 และส่วนนี้
5. **การเปลี่ยนที่ส่วนอื่นต้องตามให้ตรง (รอบรวมเล่ม):** ส่วนนี้ตัด envelope v2 ของ R3.1 (§12.3) และตัด fold M-ORBIT-018 ↔ R3.3r ออกจาก `folds.tsv` (§12.5) ข้อความที่ยังอ้างของเดิมอยู่ที่ S03 §03.4 ("migration ของ envelope v2"), S07 §07.2 (ADR-Handoff "ตรึง v1 + เป้า v2" และ CraftState "รับ handoff v1/v2"), S10 (แถว M-BUILD-001 และ "ปลดล็อก" ของ R1.6 ที่เขียนว่า "handoff v2 ต้องอ่าน v1"), S09 §09.5 EQ-5 (fold ของ 018) และ S18 §18.4 (แถว M-ORBIT-018) ส่วนข้อยกเว้น "field ไม่บังคับไม่ขึ้น version" ต้องเขียนให้ตรงกันใน S02 §02.13 ข้อ 15 และ S18 §18.3.5 (แถว schema และ migration) หลังเจ้าของยืนยันพร้อม D-22 ข้อความเหล่านี้แก้แล้วใน refresh 2026-10-04 (S03 §03.4, S07 §07.2, S09 §09.5, S10, S15, S18 §18.4) ส่วน S02 §02.13 ข้อ 15 / S18 §18.3.5 รอเจ้าของยืนยันพร้อม D-22
6. **G3 กับข้อจำกัดที่รับ:** G3 ส่งมอบตามคำเจ้าของ ข้อจำกัดที่รับ (M-BUILD-015, ภาพใน Explore, focus ช่องต้นเหตุ, DesignRef ใน Share, journey เส้นเดียว) มีบ้านทุกข้อในส่วนนี้หรือใน R7.1
7. **ขนาด bundle หลัง R3 (R3CR-12):** index +35.0 kB (ขึ้นเพดาน 5 ครั้งในวันเดียว), CSS +6.1, i18n ~+30 kB; headroom ของ index/CSS/i18n เหลือ ≤1.8 kB; worker ไม่โต; โค้ดเฉพาะ Build อยู่ใน index เพราะ import แบบ static (มูลค่าของ M-PLATFORM-036 สูงขึ้น) และ ru+th ~24 kB โหลดให้ผู้ใช้ภาษาอังกฤษ (มูลค่าของ M-PLATFORM-031 สูงขึ้น) ขนาดหลัง minify ต้องวัด CO-2 ลงทุกการขึ้นเพดานในตารางทบทวน
