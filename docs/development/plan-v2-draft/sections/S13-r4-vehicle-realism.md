## S13 R4 (1): ความสมจริงของยานและมาตรฐานฟิสิกส์ (R4.1–R4.4, เดิม PLAN §8)

> **ขอบเขต:** ส่วนนี้เป็นบ้านของ 30 รายการใน 4 แพ็กเกจ (R4.1–R4.4) กับ pseudo-package R4.2-S (ชุด Soyuz สำหรับ G4-S) และของมาตรฐานฟิสิกส์ที่รับมาจาก PLAN:§8.1–8.6 แทบคำต่อคำ (§13.2) R4 เป็น**แทร็กถาวร**: ทำต่อเนื่องเป็น wave ไม่บล็อกการปล่อยรุ่นที่ไม่เกี่ยวข้อง
> **ส่วนอื่นเป็นเจ้าของ (ส่วนนี้อ้างถึงเท่านั้น):** R4.5–R4.7 และโปรโตคอล validation ฉบับเต็ม (S14 §14.6) · เกณฑ์ประตู G4-S/G4 และความเสี่ยง (S05 §05.4, §05.13) · นิยาม KPI-17…22 (S04) · เนื้อหาการตัดสินใจ D-n (S08) · แคตตาล็อก oracle `EO-*` (S07 §07.5) · กฎฟิสิกส์และรายการไม่ทำ (S02 §02.10, §02.13) · เลน, fold, DoR/DoD และขั้นตอนพิสูจน์ (S18 §18.3, §18.4, §18.9, §18.12)
> **as-of (ตรงกับ S00 §00.1):** ตรวจแบบอ่านอย่างเดียวถึง **2026-10-04 ~21:10Z** — main บน GitHub = `5f9aa2e` (#83 เอกสาร, merge 20:31:34Z); live = `09cc2f5` (#82; Pages 37230585947 สำเร็จ 20:29:40Z เผยแพร่ #80–#82 พร้อมกัน); ไม่มี PR เปิด; R3 ครบตามคำของเจ้าของ (2026-10-04) โค้ดของ `7662ead` ต่างจาก `5f9aa2e` เฉพาะ `src/main.ts` (+15 บรรทัดจาก #81) และ `tests/browser/harness.mjs` ซึ่งอยู่นอกขอบเขตของส่วนนี้ การอ้างบรรทัดในส่วนนี้จึงยังใช้ได้ ส่วนนี้ไม่เขียนสถานะ main, live หรือ PR ซ้ำ (ผลการตรวจหลัง as-of อยู่ใน S06 และ S08)
> **ฐานข้อเท็จจริงของส่วนนี้:** สถานะทุกรายการตรวจบน `da67341` และการอ้างบรรทัดโค้ดใช้ `da67341` GitHub compare `da67341...7662ead` (อ่านอย่างเดียว, 63 ไฟล์) ไม่แตะ `src/physics/**`, `src/data/**`, `src/replay/**`, `src/ui/{csv,engine-levels,hud,onboard}.ts`, `tests/heavy`, `tests/sixdof-fleet`, `tests/validation`, `tests/fleet-harness.ts`, `.github/workflows/**` หรือ VALIDATION/PHYSICS/FLIGHT-PROFILE-METHOD/IMPLEMENTATION-STATUS บรรทัดที่อ้างจึงยังตรงกับ `7662ead` ในขอบเขตนี้มีเพียงไฟล์ R3 ใน `src/design/` ที่เปลี่ยน (`bench-part.ts`, `design-ref.ts`, `satellite-diagrams.ts`, `satellite-drawing.ts` ใหม่; `review-model.ts`, `warning-text.ts` แก้) ซึ่งไม่ใช่ไฟล์ที่ R4.3 แก้ แต่มีผลกับ M-BUILD-020 และ M-ORBIT-046 (ดูแถวของรายการนั้น) ทุกแพ็กเกจต้องตรวจซ้ำบน SHA ของ Day 0 หรือ merge-base ของ PR ก่อนเริ่ม แผนนี้**ไม่ได้รันการบินใดเลย**
> **ประมาณการรวม (หยาบ, `packages.tsv`):** 131 agent-days และราว 43 PR (R4.1 21/7, R4.2-S 9/3, R4.2 42/14, R4.3 45.5/15, R4.4 13.5/4) P/P-D เป็นคอขวดของ K4 (S05 §05.6) ทุกแพ็กเกจ `execution_authorized: false` (D-65)
> **ที่มาใน PLAN v1.2:** PLAN:U12 "ใช้บทเรียน Soyuz พัฒนาท่าทาง/เส้นทางและจรวดอื่น" (PLAN:§3, `da67341:docs/development/PLAN.md:87` → R0.1, R4.1–R4.4) มาลงที่ส่วนนี้: วิธีของ Soyuz ที่ใช้ซ้ำกับ family อื่นคือ R4.1–R4.4 (§13.1 ข้อ 1, §13.2.1) ส่วน R0.1 ของ U12 (audit programme ของ fleet) ย้ายมาเป็น M-PHYSICS-040 ใน R4.1 (S07 §07.1)

### 13.0 รายการที่ส่วนนี้เป็นบ้าน (30 รายการ, `assignment.tsv`)

| แพ็กเกจ | รายการ (P / ขนาด / สถานะ) | เลน | คลื่น | agent-days / PR | ส่งหลักฐานให้ประตู |
|---|---|---|---|---|---|
| R4.1 | M-PHYSICS-040 (P1/L/เปิด), M-PHYSICS-041 (P2/XS/เปิด) [= M-PLATFORM-070, P3/XS/เปิด], M-PHYSICS-048 (P3/M/บางส่วน), M-PHYSICS-049 (P2/M/บางส่วน), M-ORBIT-043 (P2/M/บางส่วน) | P-D (+P, Q) | K1–K3 (041 ใน K3) | 21 / 7 | G4-S, G4 |
| R4.2-S (ชุด Soyuz; pseudo-package ใน `packages.tsv` รายการยังอยู่ใน R4.2) | ขั้น Soyuz ของ M-PHYSICS-052 (P2/M/เปิด; คลื่นของรายการ = K3) | P-D แล้ว P (คอลัมน์ CSV: S/U เป็นเจ้าของสัญญา) | K3 (ต้อง merge ก่อนพักปลายปี 21 ธ.ค. มิฉะนั้น G4-S เลื่อนไปต้น K4, S05 §05.4) | 9 / 3 | G4-S |
| R4.2 (ที่เหลือ) | M-PHYSICS-052 ขั้น `falcon9`, 042 [= M-LAUNCH-077], 044 [= M-LAUNCH-079], 023, 024 (P2, เปิด), 043 [= M-LAUNCH-078, บางส่วน], 045, 046, 047 (P3, เปิด) | P-D (ข้อมูล) / P (runtime) | K4 | 42 / 14 | G4 |
| R4.3 | M-BUILD-016, 017, 018, M-ORBIT-046, M-PHYSICS-029, 030 (P2), M-BUILD-019, 020 (P3) ทั้งหมดเปิด | P (B สำหรับ `src/design/**`) | K4 | 45.5 / 15 | G4 |
| R4.4 | M-PHYSICS-050 (P2/S/เปิด), M-LAUNCH-072 (P2/M/บางส่วน), M-PHYSICS-061 (P2/M/บางส่วน), M-PHYSICS-051 (P3/M/เปิด) | P/Q/T + ผู้ตรวจอิสระ (D-55) | K4 (ส่วน `soyuz21a` ของ 050 ดึงมาก่อน G4-S) | 13.5 / 4 | G4-S, G4 |

- **สรุป:** เปิด 24, บางส่วน 6 · P1 1, P2 20, P3 9
- **alias 4 รายการ** (นับครั้งเดียว เป็นแถวเกณฑ์รับของรายการหลัก ไม่เปิด PR แยก): M-PLATFORM-070 → M-PHYSICS-041, M-LAUNCH-077 → 042, M-LAUNCH-078 → 043 (ส่วน Soyuz เสร็จแล้วเป็น M-PHYSICS-071, #63), M-LAUNCH-079 → 044
  - สี่แถวนี้คือ**เฉพาะส่วนของ R4** ในแถว alias ทั้ง 5 แถวของ `assignment.tsv` อีกหนึ่งแถวอยู่ใน S12: M-LEARNING-038 → M-BUILD-031 (R3.4r) (M-LAUNCH-076 ไม่เป็น alias แล้ว, S00 §00.6) จำนวน alias รวมของแผนดูที่ S00 §00.6 และ S19 App A
- **อ้างถึงแต่ไม่ใช่บ้าน:**
  - M-PHYSICS-001 (CO-6, S06) · M-PHYSICS-002/003 (R0.4, S07) · M-PHYSICS-012–015 (EQ-10, S09) · M-PHYSICS-020/022/025/026/028 (R4.5, S14) · M-PLAN-016 (R4.7, S14)
  - M-PHYSICS-062 (KPI, S04) · M-PHYSICS-063 (S02) · M-LAUNCH-004 (CO-4, S06) · M-LAUNCH-031 (FX-5, S10; ส่วนฟิสิกส์ทำใน R4.3) · M-BUILD-006 (FX-1, S10)
  - M-ORBIT-047 (D-47, S08) · M-PLAN-007 (D-55, S08)

### 13.1 กฎของแทร็ก R4 (ใช้กับทุก PR ในส่วนนี้)

1. **วิธีมาก่อน (FLIGHT-PROFILE-METHOD ขั้น 1–8, §13.2.1):**
   - นี่คือ PLAN:U12 → R4.1–R4.4: วิธีที่ใช้กับ Soyuz ถูกนำไปใช้กับ family อื่นทีละลำ (R4.1 ทะเบียนแหล่ง → R4.2 ขั้น data → propulsion → events → frames → guidance → R4.3 ส่วนร่วม → R4.4 การยอมรับ)
   - ลำดับขั้นมีความหมาย: ขั้นหลังตัดสินได้เมื่อขั้นก่อนนิ่งแล้ว เพราะการ fit บนข้อมูลแรงขับที่ผิดจะซ่อนความผิดของข้อมูลไว้ในค่าที่ fit
   - ข้อมูลมาจากแหล่ง ไม่ใช่จากนาฬิกา · ตัวเลขทุกตัวมีบทบาทเดียว · ห้ามบินท่าที่ยานจริงบินไม่ได้ · กลไกใหม่ปิดเป็นค่าเริ่มต้น · ความต่างระบุชื่อ ไม่ tune ทิ้ง
   - **บทเรียน #64:** การแก้ภารกิจหนึ่งอาจทำให้ branch ข้างเคียงแย่ลง กฎแรกทำให้ perigee 3σ เป็น 9.1 km เกินกรอบ 8 km จึงต้องแยก apex ใน/นอก judged band
   - ดังนั้นการเปลี่ยนร่วมทุกชิ้นต้องรันกรณีข้างเคียงและแถบ Monte Carlo เดิมก่อนขยายผล และ "ถึงวงโคจรแล้ว" ไม่ใช่เกณฑ์เดียว
2. **CO-6 ก่อน:**
   - ไม่มี PR ของ R4.2-S/R4.2/R4.3/R4.4 ที่เปลี่ยนผลการบินก่อนรายงาน CO-6 บน SHA ที่เผยแพร่จะเขียว
   - ถ้าแดงให้ bisect ห้าม re-record และเลน P หยุดทั้งเลน (S06 CO-6)
   - R4.1 ส่วนวิจัยของ P-D ทำต่อได้ เพราะไม่มีโค้ด runtime
3. **E ก่อน F:**
   - EQ-10 (M-PHYSICS-012–015) ต้อง merge ก่อน PR ใดของ R4.2-S/R4.2/R4.3 ที่แตะ `rigid/runtime.ts`, `simulation.ts` หรือ `sim/forces.ts` (`folds.tsv`)
   - D-40 → EQ-8 ควรลงก่อน R4.2 ทำให้ physics core โตขึ้น (S05 §05.5 D)
   - ห้ามเปิด PR identical-output ของฟิสิกส์พร้อมกับ PR ความสมจริง (หน้าต่าง re-baseline, S05 §05.7)
4. **เจ้าของ runtime คนเดียว:**
   - P ทำทีละ PR อย่างเคร่งครัด (เปิดได้ไม่เกิน 1)
   - P-D เป็นผู้เขียน `src/data/**` คนเดียว (`parts.ts`, `vehicles.ts`, `satellite-templates.ts` ฯลฯ)
   - PR ข้อมูลของ P-D แยกจาก PR runtime ของ P และ**หนึ่งยานต่อหนึ่ง PR**
   - การแก้ฮาร์ดแวร์ร่วม (Merlin/MVac, Briz-M, P120C, RL10, GEM, ขั้น R-7) ต้องวัดผลกับทุกยานที่ใช้ร่วม
5. **ไม่ผ่อน tolerance:**
   - ไม่ rewrite golden/snapshot ยกเว้น**การบันทึกใหม่ที่ระบุชื่อ** ซึ่งต้องมีครบ: แถวที่ขยับพร้อมเหตุผลในหัวไฟล์เทสต์, ตารางก่อน/หลัง และคำอนุมัติของเจ้าของ (อ้างคำพูดและวันที่)
   - การบันทึกใหม่ที่ไม่ตั้งใจนับใน KPI-21 (เป้า 0)
   - ทำให้เทสต์เข้มขึ้นได้ แต่ห้ามคลายทีหลังเพื่อให้ผ่าน
6. **rigid-flex-golden:**
   - EO-PHY-2 (`heavy/sixdof-fingerprint` + `rigid-flex-golden` + `heavy/flex-golden`) ต้องรันในทุก PR ที่แตะ rigid runtime หรือ `targetAttitude`
   - `tests/rigid-soyuz-programme.test.ts` และ `tests/r7-sequence.test.ts` อยู่ในทุก gate ที่แตะ R-7 (คุ้มครอง M-PHYSICS-071 ที่เสร็จแล้ว)
7. **ขอบเขตตรึงก่อนรัน:**
   - commit แรกของ PR ความสมจริงเพิ่มแถวอ้างอิงทั้งหมด: แหล่ง, บทบาท, datum, frame, tolerance และรายการ held-out
   - tolerance มาจากความไม่แน่นอนของแหล่งรวมกับการศึกษาความคลาดเชิงตัวเลข ไม่ใช้เปอร์เซ็นต์เดียวกับทุกยาน
   - commit ที่รันผลตามมาทีหลัง ผู้ตรวจดูลำดับใน history
   - ไม่ fit ใหม่เพื่อให้ผ่าน held-out และการ fit กับเที่ยวบินเดียวนับเป็น calibration ไม่ใช่ validation
8. **รายงานทั้งสองโมเดล:** ตารางก่อน/หลังของ point-mass และ six-DOF รวมแถบ Monte Carlo เมื่อแตะส่วนร่วม พร้อมขอบเขตของลม, payload และฐานปล่อย
9. **ปริมาณหลักฐาน:**
   - ทุก PR: แถว fleet ของยานนั้น + heavy ที่กระทบ (เลือกตามแผนที่ R0.3r)
   - ทุก candidate ของคลื่น (GK): heavy + fleet เต็มชุด
   - D-64 ใช้ไม่ได้กับ PR R4 ที่เปลี่ยน tree ฟิสิกส์
10. **การรันซ้ำโดยอิสระ (D-55):**
    - หลักฐาน G4-S และ G4 ต้องมีผู้ตรวจที่ไม่ใช่ผู้ fit รันตัวเลขหลักซ้ำบน SHA ที่ตรึง จากไฟล์ plan/report/union แล้วลงชื่อ
    - ถ้ายังไม่ได้ตอบ D-55 ลงนาม G4-S ไม่ได้ (ค่าเริ่มต้นคือ "งานรอ")
11. **ความซื่อตรง:**
    - ทุก family มีสถานะเดียวจากสี่: verified in scope / modelled with estimates / known miss / data insufficient
    - known miss ไม่นับเป็น scientific acceptance และมีป้ายที่ตัวเลข (M-LAUNCH-072)
12. **ไม่ทำ (S02 §02.10, §02.13 ข้อ 24, 27, 30–38):**
    - ไม่เพิ่มก๊าซเพื่อให้ลงจอดได้
    - ไม่ใช้ throttle ไร้แหล่ง และไม่ยืมค่าที่ fit ข้ามยาน (ยกเว้นฮาร์ดแวร์ร่วม)
    - ไม่ bump `RIGID_DATA_REVISION` เพื่อแก้ข้อความ
    - ไม่เปลี่ยนบรรยากาศหรือรูปโลกที่เป็นค่าเริ่มต้น
    - tolerance tier เป็นได้แค่ oracle เสริม
13. **ชนิดของ PR:**
    - PR ที่ทำให้ผลการบินหรือค่าเปลี่ยน = realism-changing
    - PR ที่เพิ่มการเปรียบเทียบหรือเทสต์ล้วน = quality-improving
    - เอกสารล้วน = docs (ทั้งสองชนิดหลังยังต้องตรึงขอบเขตก่อนรัน)
    - ห้ามรวมกับ identical-output
    - รายงานอยู่ที่ `docs/development/reports/R4.x-<เรื่อง>.md` ระบุเทสต์ที่รันจริง (realism DoD, S18 §18.12)

### 13.2 มาตรฐานฟิสิกส์ (รับจาก PLAN:§8.1–8.6 พร้อมปรับหลักฐาน)

#### 13.2.1 วิธีจาก Soyuz ที่ต้องใช้ซ้ำ (PLAN:§8.1 + `docs/FLIGHT-PROFILE-METHOD.md`)
ข้อเสนอของเจ้าของ PLAN:U12 ("ใช้บทเรียน Soyuz พัฒนาท่าทาง/เส้นทางและจรวดอื่น") ทำผ่าน R4.1–R4.4 ตามแปดขั้นนี้ ทุก family ใช้ลำดับเดียวกับที่ Soyuz-2.1a ผ่านมาแล้ว และไม่ยืมค่าที่ fit ของ Soyuz ไปใช้กับฮาร์ดแวร์อื่น (§13.1 ข้อ 12)
1. **Mass closure:** แยก payload section, dry/usable/residual, pressurant/propellant และ prelaunch burn ให้ถูก (Soyuz: strap-on 44,413 kg, core 99,765 kg ตาม CSG Fig. 1.5.1a; ถ้าอ่านแหล่งได้สองแบบ ใช้แหล่งที่สามตัดสิน แล้วบันทึกแบบที่แพ้ไว้เป็น sensitivity)
2. **Propulsion:** ตรวจ thrust/flow/Isp และ throttle/startup/tail-off ก่อนจะ fit trajectory (เทียบ acceleration trace เป็นอัตราส่วน); cutoff เป็นคำสั่งหรือ depletion; ตรวจ drag กับ trace ก่อน fit ความสูง (drag ไม่ใช่ปุ่มปรับ)
3. **Events:** cutoff ตามคำสั่ง/depletion, hot/cold staging, delays และ jettison ตาม mission variant; ระบุช่องว่างเชิงโครงสร้างไว้ ไม่ซ่อน; ไม่เฉลี่ยสองภารกิจเป็นโปรไฟล์เดียว; gate ที่ตัดสินเหตุการณ์ต้องไม่ขึ้นกับค่าที่ fit
4. **Frames:** ประกาศ ECI/ECEF/body/local horizon, datum/epoch และนิยามความเร็วก่อนเทียบกราฟ (ไม่ให้เกรดความเร็วที่แหล่งไม่ระบุ frame)
5. **Guidance structure:** programme/generic turn/closed loop ตามแหล่ง ยานที่ไม่มีแหล่งใช้ generic ที่ติดป้าย
6. **Fitting:** จำนวนพารามิเตอร์จำกัดตามข้อมูล (หนึ่ง scalar ต่อหนึ่งเป้า) แยก targets ออกจาก held-out checks และไม่ฝืน flyability bounds (max Q, มุมใน q สูง, q·α, body rate, ตาราง aero) บันทึก residual ของ fit ที่รันด้วย script
7. **Validation:** ใช้ independent state points และตรวจ event/attitude/path/load/fuel ทั้งสองโมเดลการบินภายใต้ disturbance; ตรึง checks ก่อน fit แล้วตัดสินหลัง fit โดยไม่ fit ใหม่
8. **Record:** ledger, before/after, fingerprints/goldens ที่เปลี่ยน, ความเสถียรของแหล่ง และความต่างที่ระบุชื่อ; เช็กของวิธีอยู่ในเทสต์เร็ว (`r7-sequence`, `rigid-soyuz-programme`); การ fit ใหม่คือ fit ใหม่ที่ต้องลงทะเบียน

**ชั้นของยาน (FLIGHT-PROFILE-METHOD "Which vehicles"):**
- **Tier A (fit ได้):** Falcon 9, Soyuz-2.1a (เสร็จ), Saturn V (เสร็จ 2026-10-01: tilt programme เป็น input ไม่มีอะไร fit) ส่วน PSLV-XL, H3 และ Ariane 64 ต้องได้ข้อมูลเที่ยวบินที่สองก่อน
- **Tier B (มีแค่เวลา; ทำขั้น 1–3 ไม่ fit trajectory):** Atlas V, H-IIA, Vega-C, Proton-M, Falcon Heavy, Angara-A5, Electron
- **Tier C (generic ที่ติดป้าย):** Long March 2D/3B/5, Vulcan, Starship ส่วน Soyuz-2.1b เป็นกรณีถ่ายทอด (ใช้ programme ของขั้นร่วมของ 2.1a; CSG Fig. 2.3.1c เป็นตัวตรวจ ไม่ใช่เป้า)
- เมื่อมียานผ่านวิธีนี้ ≥3 ลำ กฎระดับ fleet ที่ cross-validate แบบเว้นทีละลำให้แถบความคลาดกับยานที่ไม่มีโปรไฟล์ได้ (วัดก่อนตัดสิน, §13.7)

#### 13.2.2 กลุ่มยานและลำดับความลึก (PLAN:§8.2)
ตารางนี้เป็นลำดับที่เสนอจากหลักฐานใน repository ไม่ใช่การรับรองแหล่งใหม่ tier ต้องตรวจอีกครั้งเมื่อเริ่มงาน (R4.1)

| กลุ่ม | จุดเริ่มตรวจและเป้าหมาย | ข้อจำกัด/จุดร่วม | อัปเดต v2.0 → แพ็กเกจ |
|---|---|---|---|
| Soyuz-2.1a / 2.1b / Fregat | รักษา programme/hot staging/profile ที่แก้แล้ว; crew/cargo/SSO, RCS coast efficiency และ held-out path | shared R-7 hardware; การที่ 2.1b ใช้โปรแกรมของ 2.1a ได้ ไม่ได้แปลว่าทุก mission ใช้ได้โดยไม่มีขอบเขต | 2.1a ผ่านวิธีครบ (29a9c0f, 275656f) แต่ไม่อยู่ใน six-DOF fleet gate → R4.2-S + 050 → G4-S |
| Saturn V / AS-506 | ตรวจ generic vs mission-specific IDs, published loads/tilt/event/insertion/TLI ตาม scope | correction AS-506 มีแล้ว ห้ามเสนอว่าเริ่มจากศูนย์; input programme แยกจาก fit | tilt programme + loads ของ FER ลงแล้ว (1890d7d, 5a81e6d); fleet gate ไม่บิน → 050 |
| Falcon 9 / Falcon Heavy | data/throttle/maxQ/accel/reserve/recovery/programme และ loads รายรุ่น | Falcon 9 มี trace มากกว่า; Falcon Heavy ไม่มี independent trajectory evidence เท่ากัน | F1/F3 ยังค้าง; droneShipReserve (C01) แทน reserve คงที่แล้ว → R4.2 (bucket, 044, 045) |
| Vega-C / Electron | rating miss และความสอดคล้องของ stage load/engine/motor/event ก่อน guidance | Vega-C 4,330 vs 3,300 kg จาก report เดิม; ข้อเสนอ stage-load ของ Electron ใน audit ต้องตรวจแหล่ง/variant ก่อนใช้ | Vega-C → M-BUILD-016 (R4.3); Electron → 046 |
| Atlas V / H-IIA / Proton / Angara | data, cutoff, boosters, fairing, upper-stage burns และ uncertainty | หลายกรณีมีแค่เวลา ไม่พอให้ fit trajectory; ไฟล์ boosters/Briz ที่ใช้ร่วมรวมเจ้าของคนเดียว | Proton ลงบางส่วน (6afab49 แล้ว ffb6f46 ใช้ F14 ของ main); Atlas/H-IIA → ตรวจใน 040; Briz-less → 048 |
| Ariane 64 / H3 / PSLV | ข้อมูลแหล่งและ events ก่อน; หาข้อมูลเที่ยวบินที่สองหรือ trajectory อิสระเพื่อยก tier | audit มีข้อเสนอที่ยังไม่ลง; ห้ามถือว่า engine/load/event timeline ของต่างเที่ยวบินเหมือนกัน | PSLV/H3 → 042; Ariane 64 วัดก่อน (§13.7) |
| Long March 2D/3B/5 / Vulcan / Starship | ปิดข้อมูลพื้นฐาน/กลไกและ published bounds; ใช้ generic guidance ที่ติดป้ายเมื่อข้อมูลไม่พอ | configuration/รุ่น/ภารกิจเปลี่ยนเร็ว; ห้ามทำภาพ path ที่อ้างว่าเป็นการบินจริงโดยไม่มีข้อมูล | ยังไม่เคยเทียบ timeline → 049; Vulcan → 043; Starship → 047 |
| R-7 historical / Vostok / Mercury | reconcile IDs ของ family ที่ซ้ำ, engines/events/abort/reentry ในประวัติศาสตร์ และขอบเขตแหล่ง | physics เฉพาะภารกิจประวัติศาสตร์มีแล้วบางส่วน; ห้ามลบ legacy ID หรืออ้างว่าทุก profile validated | Vostok ลงแล้ว (1084ffe, c1628c2, 89d0b73); `R7_TRIM_SHARE_VEHICLES`: `vostokk` แก้แล้วใน 1084ffe เหลือ `r7sputnik` ที่ยังใช้ 35 % → 040 (บันทึก) + 030 (กรณี "R-7 trim share", วัดก่อน §13.7) |

#### 13.2.3 เกณฑ์ทางฟิสิกส์ข้ามโมเดล (PLAN:§8.3)
- **Fuel/actuation:** mass และ fuel ไม่ติดลบ, zero fuel ไม่มีแรงขับ, actuator saturation/lag/geometry สอดคล้องกับ impulse และ consumption
- **Dynamics:** gravity/drag/non-grav acceleration/frame transformations, angular momentum/quaternion normalization และ mass/CG/inertia transitions ตามระบบที่รองรับ
- **Numerics:** timestep convergence, coast และ event roots ที่นิ่ง, contact/capture ไม่ข้าม gate เพราะ time warp หยาบ, ตรวจ invariants ในกรณีไม่มี external force/torque ตามสมมติฐาน
- **Guidance:** command/actual attitude/rates, ขอบเขตตาราง q/α/qα/mach, thrust pointing, fuel-aware coast และ finite burns ที่ทำได้จริง
- **Lifecycle/state:** onboard/exterior/telemetry/replay/worker ใช้ state เดียว และ command journal ตรงขอบ step
- **Reference acceptance:** ตรึง source configuration/datum/tolerance ก่อน fitting; แหล่งขาดหรือขัดกันให้เป็น "inconclusive/data insufficient" ไม่ใช่ pass
- **Rendering fidelity:** orientation/scales/staging/port contact/ground datum ตรง physical state; การเคลื่อนกล้องไม่ใช้ปลอมท่าทางยาน (บ้านคือ R4.7, S14)
- **Satellite systems:** แบบจำลอง geometry/power/ADCS/link/thermal/lifetime ใช้ inputs/provenance เดียว; ภาพอธิบาย subsystem ไม่เป็น calculation engine อีกตัว (M-ORBIT-046)

ค่าตัวเลขของ tolerance ใหม่ต้องได้จากความไม่แน่นอนของแหล่งรวมกับการศึกษาความคลาดเชิงตัวเลข ไม่ตั้งเปอร์เซ็นต์เดียวใช้กับทุกจรวดหรือทุกผลลัพธ์

#### 13.2.4 Dossier 25 ID: จุดตรวจแรกและแหล่งใน repository (PLAN:§8.4 + คอลัมน์แพ็กเกจ)
แหล่งที่ระบุคือแหล่งที่เอกสารหรือโค้ดเดิมอ้าง ก่อนนำตัวเลขมาแก้ต้องเปิดตรวจ version/หน้า/configuration อีกครั้ง แผนนี้ไม่ได้อ่านสิ่งพิมพ์ภายนอกใหม่

| ID | จุดตรวจและหลักฐานที่ต้องใช้ | งานร่วมที่ต้องระวัง | แพ็กเกจ v2.0 |
|---|---|---|---|
| `soyuz21a` | MS-25/Progress MS-19 cyclograms, crew/cargo load/programme/hot staging, insertion/drop zones และความสูง/ความเร็วที่บินจริง | ขั้น R-7 ร่วม, fairing/escape/recorder | R4.2-S (052), R4.4 (050) → G4-S |
| `soyuz21b` | acceleration/profile ของ Arianespace CSG เป็นตัวตรวจการถ่ายทอด; SSO 4 t จาก Plesetsk; J2 apsides/RCS margin | Fregat planner/pointing; programme จากฮาร์ดแวร์ร่วมมีขอบเขต | 049, R4.3 (030, Fregat) |
| `falcon9` | webcast traces; fit set CRS-16/Iridium-8/GPS III แยก holdouts SSO-A/Bangabandhu-1; throttle/maxQ/reserve/recovery | ข้อมูล Merlin/MVac/Falcon ร่วม | R4.2 (bucket, 044), R4.3 (030) |
| `falconheavy` | timeline ของ Arabsat-6A และ Falcon guide ที่ระบุรุ่น; ไม่สร้าง throttle schedule ที่ไม่มีแหล่ง | Falcon 9/Heavy และ booster recovery | R4.2 (045) |
| `atlasv551` | Juno กับเที่ยวบินยุค GEM-63; แยก AJ-60A/GEM-63 และ RL10 variants ก่อนเทียบ | boosters/engines ร่วม; ข้อเสนอ audit ต้องตรวจ variant | 040 (audit ขั้น 3), R4.2 (045) |
| `vulcan` | หลักฐาน stage/engine/GEM-63XL ของ ULA; generic guidance จนกว่าจะมี flight trace อิสระ | Centaur/RL10/ชิ้นส่วน solid | 041, 049, R4.2 (043) |
| `ariane64` | launch kit VA267/VA268 เป็น timeline ตามแผน; loads ของ core/Vulcain ก่อน fit guidance | P120C ที่ใช้ร่วมกับ Vega-C | 040 (audit ขั้น 8), §13.7, R4.3 (M-BUILD-016) |
| `vegac` | VV25/Avio/ESA motor curves และ rating miss; ลำดับ stage-event/solid profile | บทบาทแหล่งของ P120C และ P80/P120 | R4.3 (M-BUILD-016) |
| `protonm` | ILS/Telstar-14R, loads/thrust/Isp/vernier/hot-stage/cutoff | Briz-M ที่ใช้ร่วมกับ Angara | 040 (audit ขั้น 1), 048 |
| `angaraa5` | timeline ของ Flight-2/ข้อมูลผู้ผลิต, upper composite และ cutoff | Briz-M ร่วมกับ Proton; ป้าย generic guidance | 048 |
| `h2a202` | JAXA/MHI/F50; แยก SRB configuration แบบ high-pressure/long-burn | ห้ามใช้ F50 ตรวจ motor variant ที่ไม่ตรง | 040 (audit ขั้น 4) → PR ข้อมูลของ R4.2 ถ้ายอมรับ |
| `h3` | state points ของ JAXA F3/ALOS-4 และหาเที่ยวบินที่สองก่อน fit; ตรึงข้อค้นพบว่า trajectory แบนเกิน | ความไม่แน่นอนของแหล่ง/LE-9/SRB configuration | R4.2 (042) |
| `pslvxl` | ตาราง event/state ของ ISRO C52 ที่ระบุ inertial speeds; หาเที่ยวบินที่สอง; ข้อค้นพบว่าขั้นแรกชัน/ช้า | air-lit boosters/solid thrust curve | R4.2 (042), R4.3 (M-BUILD-017) |
| `electron` | PUG/No Time Toulouse ของ Rocket Lab; แก้ความขัดกันระหว่าง load S2 ที่เผยแพร่กับการเผาที่ยาว | ห้ามแก้ด้วย throttle curve ไร้แหล่ง | R4.2 (046), R4.3 (030) |
| `longmarch2d` | engine/mass/capability/flight architecture; generic guidance ที่ระบุ | direct-insertion exclusions และเส้นทางของแบบที่ผู้ใช้สร้าง | 049 |
| `longmarch3be` | loads/events/fairing/site corridor ตามรุ่น | การเปลี่ยน upper stage ที่จุดซ้ำได้/engine ร่วม | 049 |
| `longmarch5` | ขอบเขต stage/engine/mission ตาม configuration ก่อนอ้าง profile | ห้ามยืม programme ที่ fit จาก launcher อื่น | 049 |
| `starship` | ระบุ flight/hardware block/engine configuration ก่อนใช้ telemetry | prototype ที่เปลี่ยนเร็วไม่ใช่ profile เดียวตลอดกาล | 049, R4.2 (047) |
| `sputnik8k71ps` | configuration R-7 ทั่วไปของ fleet/ภารกิจอ้างอิง | เทียบกับ `r7sputnik` โดยไม่รวม ID เงียบ ๆ | 040 |
| `r7sputnik` | engines/events/หลักฐานวงโคจรของภารกิจ Sputnik | record ประวัติศาสตร์ vs generic และ legacy IDs | 040 (บันทึก trim share), R4.3 030 (กรณี "R-7 trim share": ยังบินด้วย 35 %) |
| `vostok8k72k` | configuration ทั่วไปของ fleet และวงโคจร/มวลที่เผยแพร่ | เทียบกับ `vostokk`; datum/engine versions | 040 |
| `vostokk` | timing/วงโคจร/descent ของ FAI/TASS; ไม่ให้เกรด speed frame ที่กำกวมจนกว่าจะแก้ได้ | abort/reentry/crew recording ประวัติศาสตร์ | 040 (ยืนยันว่า trim share 65 % ลงแล้วใน 1084ffe; `rigid/runtime.ts:137`) |
| `saturnv` | configuration ทั่วไปและขอบเขต payload/ภารกิจที่เลือก | ห้ามใช้เวลา input ของ AS-506 เป็นการทำนายอิสระ | 040 (ใช้ตัวเลข FER หรือคง generic) |
| `saturnv506` | FER/postflight states/maxQ/later cutoff/orbit/tilt programme ของ AS-506 ที่มีแล้ว | F-1/J-2 ร่วม; บทบาท fit vs held-out | R4.4 (050), §13.7 |
| `mercuryredstone` | trajectory/recovery/landing ของ MR-3 และที่มาของ pitch-floor ที่ fit | ขอบเขต suborbital ไม่อ้าง orbital capability | 040 |

#### 13.2.5 ตาราง dossier รายยานพร้อมความคลาดปัจจุบัน (ใหม่ใน v2.0)
ตัวเลขทั้งหมดมาจาก VALIDATION (`da67341`) และ RA:(a) ไม่ได้รันใหม่ ช่อง held-out ต้องถูกตรึงใน commit แรกของ PR (§13.1 ข้อ 7)

| ยาน | ความคลาดปัจจุบัน (ตัวเลข, ที่มา) | tier แหล่ง | แพ็กเกจ / ขั้น | held-out check |
|---|---|---|---|---|
| Falcon 9 F1 | MECO แบบ expended 157.9 s เทียบ 168 s (−6 %; เดิม 7–12 %) เป็นความคลาดอย่างเป็นระบบ หลังใส่มวลที่เผยแพร่แล้ว (VALIDATION F1) | A | R4.2 Falcon 9 PR1 (ขั้น `falcon9` ของ M-PHYSICS-052): ความลึกของ bucket ต้องมีแหล่ง ถ้าไม่มีให้คงเป็น known miss | SSO-A, Bangabandhu-1 |
| Falcon 9 F3 | max-Q ~50 s เทียบ 54–74 s และ peak ต่ำ ~25 % เพราะ bucket เริ่มที่ 22 kPa (RA:(a)); การ sweep 15–22 kPa / 50–75 % ไม่ดีกว่าเดิม (VALIDATION "nothing to apply") | A | R4.2 Falcon 9 PR1 (M-PHYSICS-052; RA:(c)#2 bucket ที่เริ่มตาม q ต่อรุ่น) | q สูงสุดภายใน ±10 % และเวลาภายใน ±3 s บน held-out; ไม่มีแถว T+60 ที่แย่ลง ทั้งสองโมเดล |
| Falcon 9 F4/F6 | reserve คงที่ถูกแทนด้วย `droneShipReserve` (C01; point mass 49 → 49 แถว) และ parking คงที่ 200/250 km เทียบ 164–207 km ที่บินจริง | A | F4 recovery → R4.2 PR2 (044: ก๊าซหมดก่อน T+180 s, ลงได้ 16/18); F6 คงเป็นสมมติฐานที่ประกาศ บันทึกเป็นแถวในทะเบียนของ M-PHYSICS-040 (`falcon9` และ `pslvxl` ตาม F12; §13.9) | burn ช่วง entry/landing ±10 % ของ webcast; stress 18/18 ลงได้โดยเหลือก๊าซ ≥10 % |
| Electron | S2 เผา 298 s เทียบ 387 s (−25 %, F7); PUG v7 บอก ~2,000 kg และ ~5 นาที ซึ่งจะสอดคล้องกันได้ก็ต่อเมื่อ throttle เฉลี่ย ~70 % | B | R4.2 (046) | มีแค่ timeline ตามแผน → แหล่งที่สอง หรือติดป้าย known miss |
| Falcon Heavy | side cutoff 134.0 s เทียบ 150 s และ core 184.2 s เทียบ 211 s (−11 ถึง −13 %, F11); fairing 205/165 s เทียบ 247 s (F14) | B (Block 5 มีเที่ยวเดียว) | R4.2 (045): ติดป้าย "data insufficient" ให้ core throttle; fairing ใช้ placard 3σ (RA:(c)#4) | เวลา jettison ที่เผยแพร่ (ไม่ใช้ใน fit) |
| PSLV-XL | ที่แยกขั้นแรกเร็ว 1,512 เทียบ 2,143 m/s (−29 %) และสูงกว่า 14 km (F12) | A เมื่อได้เที่ยวที่สอง | R4.2 (042a) | fit กับ C52/C53 แล้วตรวจด้วย C56 |
| H3 | MECO ที่ 157 km / 5.9 km/s เทียบ 278 km / 3.6 km/s และ S2 เผา 364 s เทียบ 661 s (F13 เป็นเรื่อง guidance) | A เมื่อได้เที่ยวที่สอง | R4.2 (042b) | fit กับ F2 แล้วตรวจด้วย F3 หรือติดป้าย data insufficient |
| Vega-C | S2/S3 แยกเร็ว 15–17 % (231 เทียบ 272 s, 357 เทียบ 428 s; F15) และ LEO rating 4,330 เทียบ 3,300 kg (+31 %) | B | R4.3 (M-BUILD-016) สำหรับ rating; timeline เป็นแบบมีแค่เวลา | rating SSO 700 km ของ Arianespace; rating อีกเจ็ดตัวยังอยู่ใน ±25 % |
| H-IIA 202 | SRB-A แยกที่ T+107 เทียบ 124 s (−14 %) และ SECO 760 เทียบ 916 s (−17 %); MECO ต่างไม่เกิน 2 % (F16) | B | 040 ตรวจข้อเสนอ audit ขั้น 4 (SRB-A3 แบบ high-pressure, separation 8 s, fairing 245 s, LE-5B-2) → PR ข้อมูลของ R4.2 | ไม่ใช้ F50 ตรวจ motor ต่างรุ่น |
| Atlas V 551 | fairing 157/151 s เทียบ 205 s (F14); staging ต่างไม่เกิน 7 %; max-Q อยู่ใน tolerance | B | 040 (audit ขั้น 3: CCB 23,848 kg, GEM 63) + R4.2 (045 placard) | เวลา jettison ที่เผยแพร่ (RA:(c)#4) และเที่ยวบินตรวจยุค GEM-63 |
| Vulcan | เข้าวงโคจร ~137 × 1,016–1,200 km เทียบแผน 250 × 500 km โดยไม่มีเทสต์คุม; GEM 63XL ในแบบจำลองคือ 5,177 + 47,853 kg เผา 89.7 s เทียบ 53,400/48,000 kg และ 87.3 s ใน datasheet (audit "missed" #4) | C | 041 (คอมเมนต์), 049, R4.2 (043) | เทสต์ parking orbit บันทึกเป็น known miss; ไม่ fit จนกว่าจะมี trace อิสระ |
| Starship Flight 5 | ship ลงเร็ว ~6 นาที และสั้นไป 15–25° โดยหน้าต่าง heavy กว้างเกินจะจับได้ | C | R4.2 (047): ระบุ hardware block แล้วทำ assertion ให้เข้มขึ้นเป็น known miss | — (ทำให้เข้มขึ้นเท่านั้น) |
| Proton-M / Angara-A5 | Angara ทุกเวลาภายใน 3 %; Proton staging ภายใน 7 % แต่ max-Q เร็ว 19 %; แถว LEO/ISS/SSO อยู่ใน `BEYOND_CAPABILITY` เพราะพก Briz-M 22 t เสมอ | B | 040 (audit ขั้น 1) + 048 (Briz-less variant) | แถวของ variant ใหม่ตัดสินตามเกณฑ์ fleet; แถวเดิมไม่เปลี่ยน |
| Soyuz-2.1a | held-out ใน FLIGHT-PROFILE-METHOD §7 ผ่านทุกข้อ; ความต่างที่ระบุชื่อ: core ตกที่ 1,376 เทียบ ~1,550 km, Blok I เชิดหัว 35° เทียบ 12°, abort apogee MS-10 108 เทียบ 93 km และ 18a 167 เทียบ 192 km; ไม่มี q-bucket มีแต่ step 81 % ที่ T+112 s; ไม่อยู่ใน six-DOF fleet gate | A (เสร็จ) | R4.2-S (052; รายงานระบุ offset J2 ของ point-mass ตาม 023 สำหรับ Soyuz) + R4.4 (050 แถว `soyuz21a`) → G4-S | ตาราง §7 เดิม (ตรึงแล้ว) + บันทึก q/throttle ของ 052 ทั้งสองโมเดล |
| Soyuz-2.1b | ยังไม่เคยเทียบ timeline; G05 มี q-α break-up และเชื้อเพลิงหมดบนเส้นทาง apogee 6,400 km; LEO พก Fregat | กรณีถ่ายทอด | 049, R4.3 (030 และ Fregat ตาม PLAN:R4.3) | CSG Fig. 2.3.1c เป็นตัวตรวจ ไม่ใช่เป้า; SSO 4 t จาก Plesetsk |
| Saturn V (AS-506) | max-Q 33.2 kPa ที่ 75.7 s เทียบ 35.2 kPa ที่ 83.0 s (สาเหตุคือบรรยากาศของวันนั้น); flight-path angle ต่ำ 0.6–1.4° (อยู่ในความไม่แน่นอนจากการ digitise); S-II cutoff 183.7 เทียบ 187.3 km; ยังไม่เคยบิน programme นี้ใน six-DOF | A (เสร็จ) | R4.4 (050) + §13.7 (flyability ใน six-DOF) | D5-15560-6 Table B-III; FER Table 4-1/4-2 |
| ยานที่ยังไม่เคยเทียบ 6 ลำ: LM-2D, LM-3B/E, LM-5, Vulcan, Soyuz-2.1b, Starship Flight 5 | ความแม่นยังไม่รู้ (เทียบแล้ว 12/21) | C / ถ่ายทอด | R4.1 (049) แถว TimelineReference แบบข้อมูลล้วน → KPI-17 18/21 | tolerance ตรึงก่อนเทียบ; ความต่างระบุสาเหตุที่น่าจะเป็น |

ภาพรวมจาก RA:(a): GTO perigee คลาด −13 ถึง +11 km; direct insertion ถูกจำกัดที่ 300 km (B17 ปิดได้บางส่วน); tier A มี 3 ลำ, มีแค่เวลา 7 ลำ และ generic 5 ลำ

#### 13.2.6 เกณฑ์ที่มีอยู่และเกณฑ์ใหม่ที่ต้องตรึง (PLAN:§8.5)
เกณฑ์เดิมในเทสต์เป็น baseline ทางการศึกษาและการถดถอย ไม่ใช่ความแม่นของฮาร์ดแวร์ทุกภารกิจ

| เกณฑ์เดิม | ค่าใน repository | ความหมาย |
|---|---|---|
| Published event time | `max(3 s, 10% × reference time)` | การเทียบแบบกว้าง; คำสั่งที่ตั้งเวลาไว้ไม่ถือเป็นเวลาที่ทำนาย |
| Published speed | `10% × reference + 5 m/s` | ใช้เมื่อรู้ speed frame |
| Published altitude | `15% × reference + 1 km` | ใช้เมื่อรู้ datum |
| Fleet apsides | `max(10 km, 2% × target altitude)` | capability verification |
| Transfer perigee | `max(15 km, 5% × target)` | capability verification |
| Inclination / constrained RAAN | `0.3° / 1.5°` | RAAN ยังต้องตรวจในภารกิจที่บังคับระนาบ |
| Full-mission refinement | position <10 m, velocity <0.1 m/s, attitude <0.1°, event time <0.02 s | ความตรงกันเชิงตัวเลข; กรอบ 10 m ไม่พอพิสูจน์ docking capture 0.34 m |
| Soyuz capture envelope | closing 0.1–0.35 m/s; lateral speed ≤0.1 m/s; offset ≤0.34 m; pitch/yaw ≤7°; roll ≤10°; rate ≤0.6°/s | repository อ้าง SoyCOM; ต้องตรวจ variant/แหล่งก่อนขยายไปยานอื่น |
| Profile contact timing | two/four-orbit ±8 min; two-day ±20 min | ความสอดคล้องกับแหล่งโปรไฟล์ ไม่ใช่การรับรองทุก port/ทุก ascent |

**เกณฑ์ที่เสนอสำหรับ R5 (คงจาก v1.2):** การศึกษาเชิงตัวเลขใช้ target refinement ใกล้ contact ประมาณ 0.01 m / 0.001 m/s / 0.01° / 0.01 s พร้อม conservation/error floors ที่คำนึงถึง floating-point และขนาดของ frame ต้องยืนยันว่าทำได้จริงแล้วตรึงก่อน implementation ค่านี้เป็น **proposed engineering criteria** ไม่ใช่ความแม่นของฮาร์ดแวร์หรือผลที่ทำได้แล้ว ค่าที่ตรึงจริงอยู่ใน S15 (R5.3) และเกณฑ์ G5 อยู่ใน S05
แหล่งของ baseline: `tests/validation/reference-data.ts`, `tests/fleet-harness.ts`, `tests/rigid-mission-convergence.test.ts`, `src/physics/rendezvous/profiles.ts`, `tests/heavy/historical-docking.test.ts` จำนวน case ต้องอ่านจาก test inventory จริง ห้ามอ้างว่าครอบทุก combination

#### 13.2.7 Max-Q และความหมายของค่าแรงขับ: ข้อสังเกต Soyuz (U16, PLAN:§8.6)
- **สิ่งที่ผู้ใช้รายงาน:** ใช้ Soyuz แล้วเห็นค่า 100 % ตลอดเที่ยวบิน ขณะที่คาดว่าจะผ่อนเครื่องใกล้ Max-Q รายงานยังไม่ระบุ variant, โหมด, ตำแหน่งที่เห็น หรือเวลา T+
- **หลักฟิสิกส์:**
  - Max-Q คือค่าสูงสุดของ `q = ½ρv_air²` ซึ่งต้องใช้ความเร็วสัมพัทธ์อากาศ
  - การจัดการโหลดขึ้นกับฮาร์ดแวร์ เส้นทาง และการควบคุมของแต่ละยาน บางยานมี throttle bucket แต่ห้ามสรุปว่า Soyuz ทุก variant ทำแบบ Falcon 9
  - คันเร่ง 100 % ไม่ได้แปลว่าแรงขับคงที่ เพราะแรงขับยังขึ้นกับความดันบรรยากาศและเครื่องยนต์ที่ทำงาน
- **หลักฐานบนฐานปัจจุบัน (`da67341`):**
  - `soyuz21a`/`soyuz21b` ไม่มี `maxQThrottle` ส่วนยานอื่นมี: 22 kPa/75 % (Falcon 9, Falcon Heavy), 22 kPa/60 % (Atlas V 551), 25 kPa/70 % (Vulcan) และ 25 kPa/80 % (Starship) (`vehicles.ts:382, 421, 442, 470, 733`)
  - Soyuz ใช้ load relief/acceleration limiting ร่วม ซึ่งต้องตรวจว่าเหมาะกับฮาร์ดแวร์
  - บูสเตอร์ Soyuz-2 มี programme step ลงเหลือ 81 % ที่ T+112.0 s จาก CSG trace นี่เป็น event ตามเวลา ไม่ใช่ bucket ตาม q
  - `SimState.throttle` คือคำสั่ง; `coreThrottle`/`boosterThrottle` คือระดับหลัง clamp/programme/fuel; `thrust` คือแรงขับรวม
  - CSV มาตรฐาน (`ui/csv.ts:164`) มี `throttle` (คำสั่ง) และ `thrust_n` แต่ไม่มีระดับจริงของ core/booster ส่วน CSV ของ six-DOF มี `engine_throttles_json`
- **อัปเดต R2 (ส่วน UI ทำแล้วบางส่วน, R2S §2):**
  - `src/ui/engine-levels.ts` ป้อนแถว HUD `engines` ข้าง "Throttle command" มีเทสต์ใน `tests/engine-levels.test.ts` (strap-on 81 % ขณะคำสั่งยังเป็น 100 %, core clamp, hot staging, coast)
  - ช่อง six-DOF เปลี่ยนชื่อเป็น "Manual throttle command (%)" ในสามภาษา และพับเองเมื่อใช้ autopilot
  - ช่องว่างที่เหลือ: HUD แบบย่อ (`hud.ts:962-964`), onboard (`onboard.ts:211` "THR CMD"), แถว kN ที่หายก่อนในจอเตี้ย, ยังไม่มีการตรวจขั้น 81 % ในเบราว์เซอร์ และยังไม่มีคอลัมน์ CSV
  - งาน UI ไปที่ CO-4 ขั้น 9 (M-LAUNCH-004, S06) คอลัมน์ CSV/recorder ไปที่ M-PHYSICS-052 ภายใต้ D-57 ใน R4.2 ฟิสิกส์ราย variant อยู่ใน R4.2 และ guidance/actuation ร่วมอยู่ใน R4.3 โดย P คนเดียว ไม่เปิด branch ฟิสิกส์ Max-Q ชุดที่สองบนไฟล์ร่วม
- **เกณฑ์รับที่ต้องตรึงก่อนพัฒนา (คำต่อคำจาก v1.2):**
  1. เก็บกรณีรายงานให้ครบ variant/mission/payload/site/model/autopilot หรือ manual และตำแหน่ง UI; บันทึก `t`, `q`, command, actual core/booster, thrust N และ propellant flow ก่อน–ระหว่าง–หลัง Max-Q รวม programme steps/cutoff ทั้ง point-mass และ 6-DOF
  2. แยก configured q threshold, measured peak q และ structural/load limit ไม่เรียกทั้งสามว่า Max-Q ตัวเดียว; ตรวจ limiter กับ source uncertainty, engine minimum/throttle authority, solid profiles, startup/tail-off และ pressure dependence; ไม่บังคับ bucket ให้ยานที่ฮาร์ดแวร์ไม่รองรับ
  3. HUD/onboard/CSV/recording อ่าน accepted frame และ engine state เดียวกัน; replay แสดงค่าประวัติ ไม่อ่าน manual input หรือ live head มาทับ; ต้องดู programme step ของบูสเตอร์และกรณี core clamp ได้โดยไม่กำกวม แม้ command ยังเป็น 100 %
  4. ตรวจ profile ที่มีแหล่งรองรับและ held-out trajectory/load checks หลังปรับ ภายใต้ขอบเขต payload/wind/site ที่ประกาศ; การลด q ต้องไม่แลกกับแรงขับ เชื้อเพลิง acceleration หรือ insertion ที่ผิดข้อจำกัด; shared changes ต้องผ่านทุก family ที่กระทบ; ไม่ขยับ tolerance เพื่อซ่อน known miss
  5. รายงานแยก UI semantic issue, programme ที่มีอยู่, physics discrepancy ที่พิสูจน์ได้ และ evidence gap; ค่า 100 % ที่ผู้ใช้เห็นเพียงอย่างเดียวยังไม่พิสูจน์ว่าไม่มีการผ่อนเครื่องหรือว่าฟิสิกส์ถูกต้อง
- **หลักฐานโค้ด:** `src/ui/{hud,onboard,rigid-controls,csv,engine-levels}.ts`, `src/data/vehicles.ts`, `src/physics/{guidance,simulation,vehicle,frame}.ts`, `src/physics/sim/types.ts`, `src/replay/recorder.ts`, `tests/r7-sequence.test.ts`

#### 13.2.8 หลักฐานที่เปลี่ยนตั้งแต่ v1.2 (ข้อเท็จจริงที่แพ็กเกจต้องใช้)
- **ช่องว่าง heavy/fleet:**
  - heavy เต็มชุดผ่านครั้งสุดท้ายคือ run 36804343856 บน `9f9f36a` (ก่อน #36)
  - fleet ผ่านครั้งสุดท้ายคือ run 36942933112 บน `91ee372` (ก่อน R1.4 และข้าม heavy job)
  - หลังจากนั้น #68, #70 และ #71 (R1.4: เชื้อเพลิงจำกัด และ basis ของ `targetAttitude`) แก้ฟิสิกส์ร่วม → CO-6 (S06)
- **fleet gate ไม่ครบ:** `git grep` ไม่พบ `saturnv` หรือ `soyuz21a` ใน `tests/sixdof-fleet/*.ts` (7 ไฟล์) → M-PHYSICS-050
- **U16:** ส่วน UI ทำแล้วบางส่วนใน R2 และจะเสร็จใน CO-4 (§13.2.7)
- **audit 1 ต.ค.:**
  - ลงแล้ว: Saturn V (`1890d7d`, `5a81e6d`), Proton-M (`6afab49` แล้ว `ffb6f46` เลือก F14 ของ main), Vostok (`1084ffe`, `c1628c2`, `89d0b73`, บทเรียน `49769e8`), Soyuz-2 (`29a9c0f`, `275656f`)
  - ไม่พบใน history ของ `vehicles.ts`/`parts.ts`: Atlas V, H-IIA, Electron, มวลขั้นสองของ Falcon 9/Heavy, Ariane 64 และกลไกใหม่ในขั้น 9–10 ของ critic
  - "what the auditors missed" มี 9 ข้อ บางข้อเปลี่ยนไปแล้วบน `da67341` (ตรวจแบบอ่านอย่างเดียว):
    - #5 `R7_TRIM_SHARE_VEHICLES`: audit อ้าง `rigid/runtime.ts:130` ว่าชุดนี้มีแต่ id ของ fleet ทำให้ `vostokk`/`r7sputnik` บินด้วย trim share 35 % บน `da67341` (`:137`, ใช้ที่ `:313`) `vostokk` ถูกเพิ่มแล้วใน `1084ffe` (2026-10-01) เหลือ `r7sputnik` ที่คอมเมนต์บอกว่าคง 35 % "for now" เพราะ kick ของ six-DOF เลือกไว้ที่ 35 % (ยังไม่ได้วัด) → บันทึกใน M-PHYSICS-040 และกรณีที่ระบุชื่อ "R-7 trim share" ใน M-PHYSICS-030 (R4.3, วัดก่อน §13.7)
    - #7 หัวไฟล์ `vehicles.ts`: ส่วน Soyuz ("157 s") แก้แล้วใน `275656f` (ตอนนี้ crewed 153.3 s, cargo 183.2 s, 2.1b 208.4 s) เหลือ "H-IIA 202 250 s" ซึ่งผูกกับข้อเสนอ audit ขั้น 4 (fairing 245 s) จึงเป็นเรื่องข้อมูลของ M-PHYSICS-040 ไม่ใช่การแก้ข้อความ
    - #6 หมายเหตุ `srb3` ของ H3 จะผิดเมื่อ SRB-A3 เปลี่ยน และข้ออื่นทุกข้อ → M-PHYSICS-040
- **ค่าที่ไม่มีแหล่ง (KPI-20):** มีตัวเลขสองชุดที่ไม่ตรงกัน: 29/55 และ 25/50 ใน `kpis.tsv` (RA:(a)) กับ engine 27/55 (+5 solid ที่อ้างแค่อัตรา peak/mean), stage body 25/49, strap-on 5/14 และ fairing 13/17 ใน VALIDATION §8 บน `da67341` (ไม่เปลี่ยนถึง `7662ead`) **ฐานของ KPI-20 คือผลนับใหม่บน main ของ M-ORBIT-043** (R4.1, ตรึงใน `tests/sources.test.ts`) ไม่ใช่ชุดใดในสองชุดนี้ ตามแถว KPI-20 ของ S04
- **ตารางประวัติศาสตร์ใน VALIDATION ไม่มี provenance ปัจจุบัน:** เช่น Soyuz-2.1a LEO 7,021 เทียบค่าปัจจุบัน 8,140 kg → M-PHYSICS-061

### 13.3 R4.1 — Catalogue และ source ledger (วิจัยตั้งแต่ K1 ไม่มีโค้ด runtime)

#### R4.1 — ทะเบียนแหล่งข้อมูล 25 ID, ตรวจ audit, เปรียบเทียบ timeline และหน้า Sources
- **เลน:** P-D เป็นเจ้าของ (ผู้เขียน `src/data/**` คนเดียว); P ตรวจข้อความใน `src/physics/rigid/**`; Q ดูเทสต์; สตริง UI ผ่าน I-train/โมดูลภาษาของเลน (S18 §18.3)
- **คลื่น:** K1–K3 (041/070 ใน K3) **ประมาณการ (หยาบ):** 21 agent-days, 7 PR ใน `packages.tsv` (ลำดับขั้นด้านล่างมี 8 PR หลังแยก 043 เป็นสอง PR; ปรับตัวเลขที่ GK1 ตามกฎ re-plan ของ S05 §05.11) **OR:** OR-2, OR-3, OR-4, OR-6
- **ขึ้นกับ:** ส่วนวิจัยเริ่มได้ใน K1 ทันที; PR ที่อ้างผลการบิน (049, 048) รอ CO-6
- **ปลดล็อก:** ทุก PR ยานของ R4.2 (ต้องมีแถว ledger ก่อน); R4.3 (M-BUILD-016 ต้องใช้แหล่งของ Vega-C/AVUM และ Ariane 64); R4.4 (061); KPI-17, KPI-20; G4-S
- **ไฟล์ที่อนุญาต:**
  - `docs/VALIDATION.md` (§1 ทะเบียน และตารางสถานะ)
  - `src/data/{parts,vehicles}.ts` (เฉพาะ source string/คอมเมนต์ และ variant ใหม่ของ 048)
  - `src/physics/rigid/vehicle-data.ts` (ข้อความ, ทำโดย P)
  - `tests/validation/reference-data.ts`, `tests/fleet-harness.ts` (แถวใหม่), `tests/sources.test.ts` (ใหม่)
  - `NOTICE.md`
  - โมดูล Sources ที่โหลดเมื่อใช้ ในแท็บ "Physics & sources" ของกล่อง About (`src/ui/dialogs.ts` เป็น hook ผ่าน I-train) ไม่เพิ่ม route ใน `main.ts`
- **ชนิดการเปลี่ยนต่อ PR:**
  1. docs: ledger + R0 programme audit (040a)
  2. docs: ตรวจ audit 1 ต.ค. รายข้อ (040b)
  3. quality-improving: timeline 3 ลำ (049a)
  4. quality-improving: timeline อีก 3 ลำ (049b)
  5. quality-improving: `tests/sources.test.ts` นับ record ตัวเลขที่ไม่มีแหล่งบน main แล้วตรึงเป็นฐานของ KPI-20 (043a; ไม่มีโค้ดแอป, ไม่มีสตริง)
  6. feature: หน้า Sources แบบ lazy ในแท็บ "Physics & sources" + เครดิตใน `NOTICE.md` + สตริงสามภาษา (043b; merge ต่อจาก 043a ทันที ใช้รายการแหล่งชุดเดียวกับที่เทสต์ตรวจ)
  7. realism-changing: Briz-less variant ใหม่ (048)
  8. docs: ข้อความในโค้ด (041 = 070, K3)

| รหัส (ที่มาเดิม) | P / ขนาด / สถานะ | เรื่องและเหตุผล | ไฟล์ | เกณฑ์รับ | วิธีพิสูจน์ (ขอบเขตตรึงก่อน) | ขึ้นกับ |
|---|---|---|---|---|---|---|
| M-PHYSICS-040 (PLAN:R4.1, PROG:R0 row, DP:§1.5, OD:audit-2026-10-01-flight-profile) | P1 / L / เปิด | ประตูของงานความสมจริงยานทั้งหมด: ทะเบียน 25 ID (`VEHICLES` 21 + `HISTORICAL_VEHICLES` 4) แยก generic/historical/mission-specific ของ R-7/Vostok/Saturn; ทำ R0 programme audit ที่ค้างจาก PLAN:R0.1 (inventory + อ่านก่อน/หลังของ #63/#64); ตรวจ audit 1 ต.ค. รายข้อ (ข้อเสนอทุกแถว, ลำดับ 10 ขั้นของ critic และ 9 ข้อที่ auditor พลาด); ป้องกันการ fit ไร้แหล่งและการรายงานข้อเสนอที่ยังไม่ลงโค้ดว่าแก้แล้ว; **พับเข้ารายการนี้ (v2.0):** การตรวจ audit missed #5 `R7_TRIM_SHARE_VEHICLES` และ VALIDATION F6 (§13.9) | `docs/VALIDATION.md` §1 | ทุก ID มี owner, evidence tier, supported variants, site/epoch/target และสถานะเดียวจากสี่; ทุกข้อเสนอ audit มีสถานะ applied/not applied พร้อม commit; legacy ID คงความหมาย; ข้อที่ auditor พลาดมีเจ้าของ: trim share (`vostokk` ยืนยันว่าลงแล้วใน `1084ffe`; `r7sputnik` ที่ยังใช้ 35 % → กรณีที่ระบุชื่อ "R-7 trim share" ของ M-PHYSICS-030 ใน R4.3), GEM 63XL → 043, หัวไฟล์ `vehicles.ts` (ส่วน Soyuz ลงแล้วใน `275656f`; H-IIA 250 s ตัดสินพร้อมข้อเสนอ audit ขั้น 4); F6 (parking คงที่ 200/250 km ของ Falcon 9 เทียบ 164–207 km ที่บิน; PSLV-XL F12 ใช้สมมติฐานเดียวกัน) เป็นแถว "สมมติฐานที่ประกาศของ guidance" ในทะเบียน `falcon9`/`pslvxl` ไม่มีงานโค้ด | script เทียบ ID ในทะเบียนกับ `VEHICLES`/`HISTORICAL_VEHICLES` (ต้องครบ 25 ไม่ซ้ำ); `git log` ต่อข้อเสนอ; ไม่รันการบิน; ผู้ตรวจ Q สุ่มเทียบ 5 แถวกับแหล่ง | M-PHYSICS-001 เฉพาะแถวที่อ้างผลการบิน |
| M-PHYSICS-049 (DP:PHY-QW3, RW:PHY-22, DP:8-08, DP:§7.3-metrics) | P2 / M / บางส่วน | แถว `TimelineReference` ของยาน 6 ลำที่ไม่เคยเทียบ (LM-2D, LM-3B/E, LM-5, Vulcan, Soyuz-2.1b, Starship Flight 5) เปลี่ยนความแม่นที่ไม่รู้ให้เป็นค่าที่วัดได้ | `tests/validation/reference-data.ts`, VALIDATION §4, IMPLEMENTATION-STATUS (บรรทัด 12/21) | แถวมีแหล่งและ tolerance ตรึงก่อนเทียบ; ความต่างตรึงพร้อมสาเหตุที่น่าจะเป็น ไม่ tune ทิ้ง; สถานะเป็น 18/21 (KPI-17) | commit แรกเพิ่มแถวอ้างอิงและ tolerance แล้วจึงรัน; ผลทั้งสองโมเดล; ไม่มีการแก้ guidance ใน PR เดียวกัน; EO-PHY-1/2 ไม่เปลี่ยน | 040, CO-6 |
| M-ORBIT-043 (DP:PHY-PH05, DP:CTX-I-6M-3, DP:7.5-P5, DP:8-11) | P2 / M / บางส่วน | ทำให้ความน่าเชื่อถือทางฟิสิกส์ตรวจได้ (RM:P4): ครูชี้ได้ว่าตัวเลขทุกตัวมาจากไหน รวมข้อมูล Orbit (sensors, ดาวเทียมไทย, แม่แบบ) | `tests/sources.test.ts`, โมดูล Sources (lazy), `src/ui/dialogs.ts` (hook), `NOTICE.md`, i18n 3 ภาษา | ทุก record ตัวเลขใน `src/data` มี URL หรือธง estimate; จำนวนที่ไม่มีแหล่งถูกตรึงและลดได้อย่างเดียว (KPI-20 นับใหม่บน main); แท็บ Physics & sources แสดงแหล่งรายโมดูลใน EN/TH/RU; publisher ทุกรายในหน้ามีชื่อใน `NOTICE.md` | สอง PR ต่อกัน: 043a (quality-improving) sabotage ลบ source หนึ่งแถวแล้วเทสต์ต้องล้ม และผลนับครั้งแรกบนฐานของ PR เป็นฐานของ KPI-20 (S04); 043b (feature) หน้า Sources อ่านรายการเดียวกับเทสต์ ไม่มีรายการแหล่งชุดที่สอง; ทั้งสอง PR ค่าข้อมูลไม่เปลี่ยน (EO-PHY-1/2/4 เท่าเดิม); ขนาด chunk ของ 043b อยู่ใต้เพดาน ถ้าเกินต้องผ่าน D-38 พร้อม offset (S04 §04.3) | 040 |
| M-PHYSICS-048 (RW:PHY-02) | P3 / M / บางส่วน | แถว LEO/ISS/SSO ของ Proton-M/Angara-A5 อยู่ใน `BEYOND_CAPABILITY` (`fleet-harness.ts:368-377`) เพราะพก Briz-M เสมอ ทั้งที่มี configuration LEO สามขั้นจริง | `src/data/vehicles.ts` (variant/id ใหม่), `tests/fleet-harness.ts`, i18n ชื่อยาน | variant ใหม่มีมวลจากแหล่ง; id เดิมคงความหมาย; แถว LEO ของ variant ใหม่บินแล้วผ่าน หรือบันทึกเป็นขีดจำกัดที่วัดได้ | 27 + 21 hash เดิมไม่เปลี่ยน (EO-PHY-1/2) และ `d01-vehicles-identity` ของ 21 ลำเดิมไม่เปลี่ยน; แถวใหม่ตัดสินตามเกณฑ์ fleet ที่ตรึงไว้ (§13.2.6); ไม่เปลี่ยนตัวหาร 21 ของ KPI-17 | 040, CO-6 |
| M-PHYSICS-041 [= M-PLATFORM-070] (RW:PHY-09, RW:PHY-07; DP:PHY-07/PHY-09) | P2 / XS / เปิด | ข้อความในโค้ดไม่ตรงความจริง: `RIGID_DATA_ASSUMPTIONS` (`rigid/vehicle-data.ts:17`) ยังบอกว่าไม่มี slosh/flex ทั้งที่ P05 ส่งแล้ว; คอมเมนต์ Vulcan (`vehicles.ts:476-494`) อ้าง loft 80 km และ `KNOWN_GUIDANCE_FAILURES` ทั้งที่ข้อมูลคือ loft 150 km / parking 250 km และ `fleet-harness.ts:535` เป็น `{}`; หัวไฟล์ `vehicles.ts` (audit missed #7) ส่วน Soyuz แก้แล้วใน `275656f` บน `da67341` ส่วน "H-IIA 202 250 s" เป็นค่าที่ข้อเสนอ audit ขั้น 4 ต้องตัดสิน (040) จึงไม่รวมใน PR ข้อความนี้ | `src/physics/rigid/vehicle-data.ts` (P), `src/data/vehicles.ts` (P-D) | ข้อความตรงกับโมเดลที่ส่ง และระบุสิ่งที่ยังละเว้น; `RIGID_DATA_REVISION` ไม่เปลี่ยน; fingerprint ไม่เปลี่ยน | diff เป็นข้อความ/คอมเมนต์ล้วน; EO-PHY-1/2 และ CSV ไบต์เท่าเดิม (EO-EXP-1; ข้อความ assumptions ไม่เข้า CSV มีแต่ `dataRevision` ที่ `ui/csv.ts:38`) | — (K3 ตาม assignment) |

- **ลำดับขั้น:** 040a → 040b (K1–K2, วิจัยในเลน P-D ที่ว่าง) → 049a/b (หลัง CO-6) → 043a → 043b → 048 → 041 (K3 คนละ PR กับ EQ-10)
- **quality guard (OR-2):** ไม่แก้ค่าข้อมูลที่มีอยู่ใน R4.1 (มีแค่ variant ใหม่ที่ opt-in); ห้ามรายงานข้อเสนอที่ยังไม่ลงว่าแก้แล้ว; หน้า Sources เป็น metadata อ่านอย่างเดียว · **หลักฐาน:** `reports/R4.1-ledger.md` · **execution_authorized:** false

### 13.4 R4.2 — Pipeline ราย family: data → propulsion → events → frames → guidance (หนึ่งยานต่อ PR)

#### R4.2-S — ชุด Soyuz (input ของ G4-S; แยกออกจาก R4.2)
- **คืออะไร:** pseudo-package ใน `packages.tsv` (กำหนดใน `final/overrides_s05.py`) สำหรับขั้น Soyuz ของ M-PHYSICS-052 รายการยังเป็นของ R4.2 แต่ตารางเวลา งบ PR และประตูแยกออกมา เพื่อให้ G4-S และ R5 ไม่ต้องรอ R4.2 ทั้งชุดใน K4 (PC:(c)4)
- **เลน:** P-D แล้ว P: P-D ล็อกแถว `soyuz21a`/`soyuz21b` ในทะเบียนของ 040 ก่อน (ไม่แก้ค่า) แล้ว P รันและบันทึกหลักฐาน (ทีละ PR); คอลัมน์ CSV/recorder ใช้ S เป็นเจ้าของสัญญา + U สำหรับ `ui/csv.ts` (ผ่าน I-train ถ้าแตะ hotspot); ข้อมูล Soyuz ที่ต้องแก้ใน PR3 เขียนโดย P-D
- **คลื่น:** K3 **ประมาณการ (หยาบ):** 9 agent-days, 3 PR **OR:** OR-2, OR-3, OR-6
- **เส้นตาย:** ต้อง merge ก่อนพักปลายปี (21 ธ.ค. 2026) มิฉะนั้น G4-S เลื่อนไปต้น K4 (เร็วสุด Day ~65 ≈ 15 ม.ค. 2027; S05 §05.4, §05.9) R4.2-S อยู่ในช่อง WIP ลำดับ 1 ของ S05 (critical path)
- **ขึ้นกับ:** CO-6 เขียว, EQ-10 (fold), แถว `soyuz21a`/`soyuz21b` ของ 040 (040a, K1–K2), D-57 (ก่อน PR2), CO-4 ขั้น 9 M-LAUNCH-004 (`engine-levels.ts`)
- **ปลดล็อก:** G4-S (ร่วมกับแถว `soyuz21a` ของ M-PHYSICS-050 และการรันซ้ำของ D-55 ใน R4.4) → R5.1–R5.3
- **ไฟล์ที่อนุญาต:** P: เทสต์ Soyuz ใน `tests/{validation,heavy}/**`, `docs/VALIDATION.md` §3; S/U: `src/replay/recorder.ts`, `src/ui/csv.ts` (ใช้ `src/ui/engine-levels.ts` ซ้ำ); P-D: `src/data/{vehicles,parts}.ts` เฉพาะ `soyuz21a`/`soyuz21b` และเฉพาะ PR3
- **ชนิดการเปลี่ยนต่อ PR (ลำดับ):**
  1. quality-improving: 052 บันทึกหลักฐาน Max-Q ของ Soyuz-2.1a/2.1b ทั้งสองโมเดล (เกณฑ์ 1–5 ของ §13.2.7) ผลการบินไม่เปลี่ยน; รายงานระบุ offset J2 ของ point-mass (023) เป็นตัวเลขในตารางสองโมเดลของ Soyuz
  2. feature: 052 คอลัมน์ระดับจริงของ core/booster ใน CSV/recorder แบบมี version (หลัง D-57) ไฟล์เก่ายังอ่านได้
  3. realism-changing: แก้ข้อมูล Soyuz เฉพาะเมื่อ PR1 พิสูจน์ความคลาดได้ ถ้าไม่พบ ให้บันทึก "nothing to apply" แบบ VALIDATION F1/F2 ในรายงานแทน และไม่เปิด PR นี้
- **หลักฐาน:** `reports/R4.2-S-soyuz.md` (ชุดหลักฐาน G4-S รวมผลรันซ้ำของ D-55) · **execution_authorized:** false

#### R4.2 — ส่วนที่เหลือ: Falcon 9, PSLV-XL/H3, Vulcan, fairings, Electron, Starship และ datum
- **เลน:** P-D (PR ข้อมูล) / P (PR runtime; ทำทีละ PR); ถ้าต้องแตะ CSV อีกให้ใช้ schema ที่ R4.2-S เพิ่ม (S เป็นเจ้าของสัญญา)
- **คลื่น:** K4 **ประมาณการ (หยาบ):** 42 agent-days, 14 PR **OR:** OR-2, OR-3, OR-6
- **ขึ้นกับ:** CO-6, EQ-10 (fold), แถว ledger ของยานนั้น (R4.1), R4.2-S (schema ของ CSV), D-51 (โค้ดของ 023; ทาง (ข) ของ 024 ไม่อยู่ใน R4.2 แต่อยู่ใน R4.5)
- **ปลดล็อก:** G4; R8.5 (Chandrayaan หลัง dossier ของ PSLV-XL, S15); R5.2 ใช้ mapping ของ datum เดียวกับ 024
- **ไฟล์ที่อนุญาต:**
  - P-D: `src/data/{vehicles,parts}.ts`
  - P: `src/physics/{guidance,simulation,vehicle,frame,orbital}.ts`, `src/physics/sim/**`, `src/physics/rigid/{runtime,recovery-guidance,guidance-attitude}.ts`
  - S/U: `src/replay/recorder.ts`, `src/ui/csv.ts` (เฉพาะเมื่อจำเป็น; ใช้ `src/ui/engine-levels.ts` ซ้ำ)
  - เทสต์และเอกสาร: `tests/{validation,heavy,sixdof-fleet}/**`, `tests/fleet-harness.ts`, `docs/{VALIDATION,PHYSICS}.md`
- **fold (`folds.tsv`):** M-PHYSICS-052 ใช้ `ui/engine-levels.ts` จาก R2/CO-4 (helper ระดับเครื่องยนต์มีตัวเดียว); M-PHYSICS-012–014 ต้อง merge ก่อนทุก PR ที่แตะ `rigid/runtime.ts`, `simulation.ts`, `sim/forces.ts`
- **ชนิดการเปลี่ยนต่อ PR (ลำดับ):**
  1. docs: 023 ส่วนเอกสาร (offset ในการเทียบสองโมเดลของทุกยาน)
  2. realism: Falcon 9 bucket ตาม q (ขั้น `falcon9` ของ M-PHYSICS-052, RA:(c)#2)
  3. realism: 044
  4. realism: 042a PSLV-XL
  5. realism: 042b H3
  6. quality-improving แล้วจึง realism: 043 Vulcan (สอง PR)
  7. realism: 045 placard 3σ ของ Atlas V/Falcon Heavy
  8. realism/ป้าย: 046 Electron
  9. quality-improving: 047 Starship
  10. quality-improving: 024 ทาง (ก) ป้าย datum และเทสต์ mapping ผกผัน (ฟิสิกส์ไม่เปลี่ยน) ทาง (ข) ไม่ทำใน R4.2 แต่ทำใน re-baseline ของ R4.5 (S14)
  11. realism: โค้ดของ 023 เฉพาะเมื่อ D-51 บอกให้ทำ (ถ้า D-51 ให้ทำทั้ง 023 และ 024 ทาง (ข) ควรรวมใน re-record ที่ระบุชื่อครั้งเดียวของ R4.5 ไม่ re-record fingerprint 27 ตัวสองครั้ง)
  - งบ 14 PR รวม PR ข้อมูลจากข้อเสนอ audit ที่ 040 ยอมรับ (เช่น H-IIA, Atlas V) และกลไกของ critic ขั้น 10 หนึ่งกลไกต่อ PR (§13.7)

ตารางรายการด้านล่างครอบทั้ง R4.2-S และ R4.2 (รายการทั้งหมดเป็นของ R4.2 ใน `assignment.tsv`)

| รหัส (ที่มาเดิม) | P / ขนาด / สถานะ | เรื่องและเหตุผล | ไฟล์ | เกณฑ์รับ | วิธีพิสูจน์ (ขอบเขตตรึงก่อน) | ขึ้นกับ |
|---|---|---|---|---|---|---|
| M-PHYSICS-052 (PLAN:§8.6, PLAN:R4.2, PLAN:R4.3, R2S:U16 residual) | P2 / M / เปิด | ขั้น Soyuz อยู่ใน R4.2-S (K3) ขั้น `falcon9` (bucket ตาม q, RA:(c)#2) อยู่ใน R4.2 (K4) · คำถาม "Soyuz 100 % ตลอด" ของเจ้าของ: หลัง UI แสดงระดับจริงได้แล้ว ฟิสิกส์ราย variant ต้องถูกด้วย และ CSV ต้องมีระดับจริงของ core/booster | ดูไฟล์ของแพ็กเกจ; `ui/csv.ts:164`, recorder | เกณฑ์ 1–5 ของ §13.2.7; HUD/onboard/CSV/replay อ่าน frame เดียวกัน; CSV เพิ่มคอลัมน์แบบมี version ตาม D-57 และไฟล์เก่ายังอ่านได้ | ขั้นบันทึกหลักฐานไม่เปลี่ยนผลการบิน (EO-PHY-1/2 เท่าเดิม); ไบต์ CSV ขยับเฉพาะคอลัมน์ที่เพิ่ม เป็นการเปลี่ยนสัญญาที่ระบุชื่อและเจ้าของอนุมัติ; มี reader test กับไฟล์รุ่นเก่า; ตรวจขั้น 81 % ที่ T+112 s ทั้ง live และ replay | CO-6, EQ-10, D-57, M-LAUNCH-004, 040 |
| M-PHYSICS-023 (RW:PHY-10) | P2 / S / เปิด | point-mass ใช้แรงโน้มถ่วงทรงกลม (`simulation.ts:1144` `useJ2=false`) ขณะที่ six-DOF ใช้ J2 ต่างกัน ~0.5 % ของ g หรือ ~8 m/s ต่อ 500 s ถ้าไม่บอก นักเรียนจะเห็นเป็นความผิดของโมเดล | `docs/{PHYSICS,VALIDATION}.md`, ป้ายการเทียบสองโมเดล (สตริงผ่านเลนเจ้าของ) | ส่วนเอกสาร (XS): ระบุ offset เป็นตัวเลขในทุกการเทียบสองโมเดล ส่วนโค้ดทำเฉพาะภายใต้ D-51 โดย re-record fingerprint ทั้ง 27 ตัวแบบระบุชื่อพร้อมตารางก่อน/หลัง | ส่วนเอกสาร: EO-PHY-1 ไม่เปลี่ยน; ส่วนโค้ดเป็น realism-changing ห้ามรวมกับ EQ | 001, D-51 |
| M-PHYSICS-044 [= M-LAUNCH-079] (RW:PHY-20, DP:PHY-PH15, OD:Experimental) | P2 / M / เปิด | การกู้ขั้นแรก Falcon 9 แบบ six-DOF: ก๊าซเย็นหมดก่อน T+180 s และผลขึ้นกับสถานะตอนแยก (ลงได้ 16/18) แก้ด้วยโหมดควบคุมท่าทางระหว่าง coast ไม่ใช่เพิ่มก๊าซ | `rigid/recovery-guidance.ts`, `rigid/runtime.ts` (P) | burn ช่วง entry/landing อยู่ใน ±10 % ของ webcast; stress 18/18 ลงได้โดยเหลือก๊าซ ≥10 %; heavy `falcon-heavy-returns` เขียว | ตรึงเวลา burn ของ webcast ก่อนรัน; fingerprint ของ ascent ไม่เปลี่ยน (หรือ re-record แบบระบุชื่อ); รัน rigid-flex-golden; ห้ามเพิ่มก๊าซ (S02 §02.10) | 040, Falcon 9 PR1 |
| M-PHYSICS-042 [= M-LAUNCH-077] (RW:PHY-17, DP:PHY-PH02, DP:11-02) | P2 / L / เปิด | PSLV-XL ช้าไป 29 % ตอนแยก และ H3 แบนเกินไป (F12/F13) ซึ่งเป็นปัญหาของ guidance ไม่ใช่ propulsion; ยานเอเชียสำคัญกับผู้ใช้ไทย | `src/data/vehicles.ts` (loft/programme), `tests/validation/*` | PSLV: fit กับ C52/C53 แล้วตรวจด้วย C56; H3: fit กับ F2 แล้วตรวจด้วย F3 หรือติดป้าย "data insufficient"; ตารางก่อน/หลังทั้งสองโมเดล; golden ที่ขยับมีเหตุผลอยู่ข้างแถวและใน VALIDATION | หนึ่งยานต่อ PR; ไม่ fit จากเที่ยวเดียว; tier เป็นแค่ oracle เสริม ไม่ใช่เงื่อนไขก่อน | 040, CO-6, EQ-10 |
| M-PHYSICS-043 [= M-LAUNCH-078] (RW:PHY-08, DP:PHY-PH03, OD:Experimental) | P3 / M / เปิด (ส่วน Soyuz ของ 078 เสร็จแล้ว = M-PHYSICS-071) | Vulcan เข้าวงโคจร ~137 × 1,200 km เทียบแผน 250 × 500 km และไม่มีเทสต์คุม | `tests/fleet-harness.ts`, `src/data/{vehicles,parts}.ts` (GEM 63XL ถ้ามีแหล่ง) | มีเทสต์ขอบเขต parking orbit (บันทึกเป็น known miss จนกว่าจะแก้); ถ้ามีวิธีแก้ที่มีแหล่ง ต้องถึง 250 × 500 km ภายในแถบ published altitude และแถว fleet อื่นไม่เปลี่ยน มิฉะนั้นติดป้าย "generic guidance"; `insertionAltitudeFor` รับ `VehicleSpec` | ไม่ fit โดยไม่มี trace อิสระ; ไม่เลือก tolerance เพื่อให้ผ่าน | 040, 041 |
| M-PHYSICS-045 (RW:PHY-17, IS:648-653) | P3 / M / เปิด | core ของ Falcon Heavy ดับเครื่องเร็ว 11–13 % (ไม่มีข้อมูลความลึก throttle ที่เผยแพร่) และ fairing ของ Atlas V/Falcon Heavy หลุดเร็ว 17–27 % | `src/data/vehicles.ts`, placard ใน `src/physics/sim/**` | core throttle: ติดป้าย "data insufficient" ทั้งใน ledger และในแอป; fairing: ใช้ density factor 3σ ที่มีแหล่งแทนบรรยากาศ nominal (RA:(c)#4) หรือกฎของผู้ให้บริการแบบเดียวกับ F14 | เวลา jettison ที่เผยแพร่ของ Atlas V และ Falcon Heavy เป็น held-out; วัดยาน placard ทุกลำ (H3, Electron, PSLV-XL) ต้องไม่แย่ลง; ไม่มี schedule ไร้แหล่ง | 040 |
| M-PHYSICS-046 (RW:PHY-16) | P3 / M / เปิด | S2 ของ Electron เผาสั้นไป ~25 % และ throttle เฉลี่ย ~70 % ตาม PUG แสดงในโมเดลข้อมูลไม่ได้ | `src/data/parts.ts` (body `e2`) | แก้ความขัดกันระหว่าง load กับ burn จากแหล่งของ Rocket Lab; ถ้าเพิ่มช่อง throttle ต้องมีแหล่งและมี version มิฉะนั้นติดป้าย known miss | ไม่ใช้ throttle curve ไร้แหล่ง; ตรึงแถวอ้างอิงก่อน | 040 |
| M-PHYSICS-047 (RW:PHY-21, OD:Experimental) | P3 / L / เปิด | ship ของ Starship Flight 5 ลงเร็ว ~6 นาที และสั้นไป 15–25° โดยหน้าต่าง heavy กว้างเกินจะจับได้ | `tests/heavy/starship-flight5.test.ts`, `src/data/vehicles.ts` | ระบุ hardware block; เพิ่ม assertion splashdown ที่เข้มขึ้นเป็น known miss ที่บันทึก ไม่ซ่อน แล้วปรับด้วยข้อมูลที่มีแหล่งหรือติดป้าย | ทำให้เข้มขึ้นได้ แต่ห้ามคลายทีหลัง | 040 |
| M-PHYSICS-024 (RW:PHY-11) | P2 / M / เปิด | **ข้อเท็จจริง (ตรวจบน `da67341`):** ฟิสิกส์วางฐานปล่อยโดยใช้ latitude ของแคตตาล็อกเป็น latitude แบบทรงกลมบน `R_EARTH` = 6,378,137 m (`orbital.ts:239-243` `groundPositionEci` เรียกจาก `simulation.ts:288, 874` และ `sim/rigid-link.ts:61, 74`) และ Launch อ่านกลับด้วย `eciToLatLon` (`orbital.ts:252-256`: lat = asin(z/r), alt = \|r\| − `R_EARTH`) ซึ่งเป็นตัวผกผันพอดี วันนี้ฐานปล่อยจึงแสดง lat/lon ตามแคตตาล็อกและ `altitudeAGL` 0 m ที่ T-0 (`simulation.ts:1513-1514`) แต่ datum ไม่ตรงกับ Orbit (WGS-84) และกับ return ของ Vostok-1 ที่อ่าน WGS-84 อยู่แล้ว (`sim/fall.ts:65`) **ห้ามเพิ่มการแปลง geodetic เฉพาะการแสดงผล:** จุดที่วางแบบทรงกลมเมื่ออ่านเป็น WGS-84 จะเลื่อน ~0.19° (~21 km) ที่ Baikonur และ ~0.16° (~17 km) ที่ Plesetsk และสูงขึ้น +11 / +17 km ที่ T-0 (คำนวณในแผนนี้ด้วยสูตร WGS-84) คือแสดงฐานปล่อยผิดที่ทั้งที่ฟิสิกส์ไม่เปลี่ยน | ทาง (ก): ฟังก์ชันแสดงผลพิกัดของ Launch และป้าย datum (สตริงผ่านเลนเจ้าของ), `docs/PHYSICS.md`; ทาง (ข): `src/physics/orbital.ts` (P) และ fleet ทั้งชุด | เลือกหนึ่งในสองทาง: **(ก)** นิยาม mapping การแสดงผลเป็นตัวผกผันของ mapping ที่ใช้วาง (คงทรงกลม) พร้อมป้าย datum ที่ซื่อตรง ("ทรงกลมรัศมี 6,378.137 km ไม่ใช่ WGS-84") บน Launch และในจุดที่เทียบกับ Orbit หรือ **(ข)** เปลี่ยนการวางเป็น WGS-84 (geodetic → ECEF ของฐานปล่อย แล้วแสดงแบบ geodetic) เป็นขั้น realism-changing ภายใน re-baseline ครั้งเดียวของ R4.5 (S14) ภายใต้ D-51 พร้อม re-record fleet ที่ระบุชื่อ ทาง (ข) ต้องเปลี่ยนความสูง (`altitude` ที่บรรยากาศใช้) และ `groundElevation` เป็นแบบ geodetic พร้อมกัน แบบที่ `updateDerived` ทำให้ return ของ Vostok-1 อยู่แล้ว (`simulation.ts:1511-1513`, `escape.geodetic`) มิฉะนั้นฐานปล่อยจะอยู่ต่ำกว่าทรงกลม `R_EARTH` 11–17 km **เกณฑ์รับร่วมของทั้งสองทาง:** ที่ T-0 ฐานปล่อยแสดง lat/lon ตามแคตตาล็อกและความสูงเหนือพื้น 0 m สำหรับ Baikonur, Plesetsk, Kourou และ Cape (เทสต์ตรึงสี่ฐาน) และป้ายบอก datum ที่ใช้จริง | ทาง (ก): EO-PHY-1/2 ไม่เปลี่ยน เปลี่ยนเฉพาะป้ายและเทสต์ mapping (quality-improving) ทาง (ข): ขอบเขตตรึงก่อนรัน, ตาราง fleet ก่อน/หลังทั้งสองโมเดล, re-record ที่ระบุชื่อและเจ้าของอนุมัติ, ห้ามรวมกับ EQ; ไม่เปลี่ยนรูปโลกที่เป็นค่าเริ่มต้นนอก R4.5 (S02 §02.10); R5.2 ใช้ mapping เดียวกัน | D-51 (ทาง ข), R4.5 (ทาง ข), M-ORBIT-025 (สัญญา frame, S15) |

- **PR ของ Falcon 9 bucket (ขั้น `falcon9` ของ M-PHYSICS-052, RA:(c)#2):**
  - การเปลี่ยน: bucket ที่**เริ่มตาม q** ราย variant โดยระดับและช่วงเวลามีแหล่งรองรับ ช่วงลดของจริงคือ T+43–78 s ตาม events files แทน q-limiter ที่ตรึง q ไว้
  - ความลึกต้องมาจากแหล่ง เช่น acceleration ที่อนุมาน (derived) จาก telemetry ของชุด fit ถ้าไม่มีแหล่ง ให้ปิด PR และคง F1/F3 เป็น known miss
  - fit กับ CRS-16, Iridium-8 และ GPS III SV01 แล้ว held out SSO-A และ Bangabandhu-1 บนทั้งสองโมเดล
  - q อ้างอิงต้องคำนวณจาก telemetry ด้วยบรรยากาศที่ประกาศ ไม่ใช้ callout "Max Q"
  - Falcon Heavy ใช้ bucket ของ Falcon 9 (F11) จึงต้องวัดแถวของ Falcon Heavy ด้วย
- **quality guard (OR-2):** กลไกใหม่ปิดเป็นค่าเริ่มต้นกับยานอื่น; ไม่ยืม programme ของ Soyuz ให้ฮาร์ดแวร์อื่น; ไม่สร้างภาพ path ที่อ้างว่าเป็นการบินจริงโดยไม่มีข้อมูล; การลด q ต้องไม่แลกกับ insertion
- **หลักฐาน:** `reports/R4.2-<ยาน>.md` ต่อ PR (รายงานชุด Soyuz อยู่ใน R4.2-S) · **execution_authorized:** false

### 13.5 R4.3 — Shared attitude/upper-stage/control และ known misses

#### R4.3 — rating และ sizing ที่บินจริง, G02/G05, สัญญาแบบจำลองดาวเทียมเดียว
- **เลน:** P (ทำทีละ PR; การแก้ planner ร่วมเรียงต่อกัน); B ร่วมเฉพาะ `src/design/{ratings,budget,sizing,sizing-model,warnings}.ts` และ `src/ui/build/ratings*`; O ตรวจ `src/orbit/satellite-cores.ts` และ `power.ts`
- **คลื่น:** K4 **ประมาณการ (หยาบ):** 45.5 agent-days, 15 PR **OR:** OR-2, OR-3
- **ขึ้นกับ:** CO-6, EQ-10, R4.1 (แหล่งของ rating), R4.2 (family ของ PSLV/FH/Angara สำหรับ 017), D-9 + D-48 (018), D-47 (046), M-BUILD-006 (FX-1: rating ที่ยังไม่ลู่เข้าห้ามเก็บเป็นผล เพราะ 016 ทำให้ต้นทุนต่อ rating สูงขึ้น), M-PHYSICS-012 (029)
- **ปลดล็อก:** G4 (KPI-18, KPI-19), R3.3r/R3.6 ได้ตัวเลขดาวเทียมชุดเดียว
- **ไฟล์ที่อนุญาต:**
  - P: `src/physics/sim/{burns,ascent}.ts`, `src/physics/{simulation,guidance,explicit-guidance}.ts`
  - B: `src/design/**` ตามรายการด้านบน
  - O: `src/orbit/{satellite-cores,power}.ts`, `src/design/satellite-*.ts`, `src/data/satellite-templates.ts` (P-D)
  - เทสต์: `tests/design-ratings.test.ts`, `tests/design-sizing.test.ts`, d06/d07 tests
- **ชนิดการเปลี่ยนต่อ PR (ลำดับ):**
  1. quality-improving: 030 reproduce ทุกกรณีด้วย seed และจัดประเภท
  2. realism-changing: 029 (ผลเท่าเดิมเมื่อปิด navigation)
  3. realism-changing: 030 แก้ทีละกรณี
  4. realism-changing: ส่วนฟิสิกส์ของ M-LAUNCH-031 (บ้าน FX-5, S10): judged set (`sim/burns.ts:103` `judgedElements`) ใช้ physical apsides ตรงกันทั้งสองโมเดลและทุกเส้นทาง verdict; วัดช่องว่าง osculating/physical ต่อยานแล้วส่งให้ FX-5; verdict ไม่เปลี่ยนถ้าไม่มีหลักฐาน และ `mission-result.test.ts` เปลี่ยนได้เฉพาะผ่านการเปลี่ยนสัญญาที่เจ้าของอนุมัติ
  5. realism-changing: M-BUILD-016
  6. realism-changing: M-BUILD-017
  7. realism-changing: M-BUILD-018 (หลัง D-9/D-48)
  8. realism-changing: M-BUILD-019
  9. quality-improving: M-BUILD-020
  10. realism-changing: M-ORBIT-046 (หลัง D-47)

| รหัส (ที่มาเดิม) | P / ขนาด / สถานะ | เรื่องและเหตุผล | ไฟล์ | เกณฑ์รับ | วิธีพิสูจน์ (ขอบเขตตรึงก่อน) | ขึ้นกับ |
|---|---|---|---|---|---|---|
| M-PHYSICS-030 (OD:G05 known issues 1–4,6; OD:audit-0929 heavy MC 142/170) | P2 / L / เปิด | ความล้มเหลวของ Monte Carlo ที่ยังอธิบายไม่ได้: F9 แตกจาก q-placard ในลมตะวันออก, Soyuz-2.1b แตกจาก q-α และเชื้อเพลิงหมดบน apogee 6,400 km, F9 ระนาบผิด 29.1–29.3°, Electron `burnPredictionUnavailable` (สถานะบน `da67341` ยังไม่ได้ตรวจ) | `src/physics/sim/**`, `guidance.ts`, MC tests | reproduce ทุกกรณีด้วย seed บนฐาน CO-6 แล้วจัดเป็น design shortfall / model or guidance defect / data gap จากนั้นแก้พร้อมแถบ MC ก่อน/หลัง หรือบันทึกเป็น known miss ที่มีชื่อและเจ้าของ; รวมงานของ PLAN:R4.3: Fregat (scheduled acceleration vs `allocateRcs`, gain scheduling, overshoot/settling, ต้นทุนก๊าซ), load relief เทียบ engine clamp (รวม solid ที่ผ่อนเครื่องไม่ได้) และกฎ in/out-of-band ของ #64; **กรณีที่ระบุชื่อ "R-7 trim share" (พับจาก audit missed #5):** `r7sputnik` ยังบินด้วย trim share 35 % ขณะที่ R-7 ในชุด (`soyuz21a`, `sputnik8k71ps`, `vostok8k72k`, `vostokk`) ใช้ 65 % (`rigid/runtime.ts:137`, `:313`; `soyuz21b` คง 35 % ตามผลที่วัดไว้ของมันเอง) วัด six-DOF ทั้งสองค่าก่อน แล้วเปลี่ยนเฉพาะเมื่อดีกว่าบนแถวที่ตรึงไว้ (§13.7) พร้อม re-record ที่ระบุชื่อ และรัน rigid-flex-golden | ไม่ขยายแถบใด; ไม่ "เพิ่มก๊าซ"; การแก้ที่ทำให้ fingerprint ขยับต้องมีหลักฐานและเหตุผล (PLAN:§6 ข้อ 5); รันกรณีข้างเคียงก่อน | 001 |
| M-PHYSICS-029 (OD:G02 burns, OD:PARALLEL-GNC-2026-09:432, OD:HANDOFF-G02-BURNS) | P2 / M / เปิด | ทำการตัดสินใจของเจ้าของ (2026-09-24) ให้ครบ: burn ในวงโคจรต้องวางแผนและบังคับทิศจากค่าประมาณของการนำร่อง (`knownState()`, `simulation.ts:400`) ปัจจุบันไม่มีผู้เรียก และ `sim/burns.ts` ยังอ่านค่าจริง | `src/physics/sim/burns.ts`, `simulation.ts` | ย้ายการอ่านทุกจุดตาม HANDOFF-G02-BURNS ไปใช้ `knownState()`; ถ้าปิด navigation ทุก fingerprint และ golden ต้องเท่าเดิมทุกบิต; ถ้าเปิด navigation เทสต์ของ handoff ผ่าน และรายงานเทสต์ heavy navigation-burns ก่อน/หลัง | ปิด navigation (ค่าเริ่มต้น): EO-PHY-1/2/5 เป็น oracle เพราะ `knownState()` คืน object ของค่าจริงเอง; ไม่ย้าย air data (load relief) | 001, M-PHYSICS-012 |
| M-LAUNCH-031 (อ้างอิงข้าม ไม่ใช่บ้าน) | — | ส่วนฟิสิกส์ → R4.3 (PR ลำดับ 4); บ้านคือ FX-5 (S10) | — | — | — | — |
| M-BUILD-016 (DP:PHY-QW4, RW:B-13, OD:ACCEPT0929, DP:8-09, PLAN:R4.3) | P2 / L / เปิด | rating ของยานที่มี kick stage: Vega-C LEO สูงไป 31 %, Ariane 64 สูงไป 16–22 %, burn หลังเข้า GTO นับเป็นทันที และ 16 แบบได้ GTO > LEO ซึ่งเป็นไปไม่ได้ทางกายภาพ | `src/design/ratings.ts` (B), sequencer (P) | ขั้นสุดท้ายที่จุดซ้ำได้ถูก rate จาก parking orbit ผ่าน burn ตามแผนด้วย sequencer จริง; Vega-C LEO และ SSO 700 km อยู่ใน ±25 % ของ Arianespace; rating อีกเจ็ดตัวยังอยู่ในแถบ; burn ของ GTO เป็นแบบ finite; build-catalogue-matrix ไม่มีกรณี GTO>LEO ที่อธิบายไม่ได้; KPI-18 | ตารางก่อน/หลังในรายงาน; fingerprint การบินของยานในแคตตาล็อกไม่ขยับ (เปลี่ยนเฉพาะเส้นทาง rating); ถ้าเกินงบเวลาให้แสดง "ยังไม่เสร็จ" (M-BUILD-006) | 040, M-BUILD-006 |
| M-BUILD-017 (DP:PHY-QW6, OD:Build physics limits) | P2 / M / เปิด | งบ Δv: strap-on ทุกกลุ่มใช้ Isp ของกลุ่มแรก และกลุ่มที่จุดกลางอากาศถูกนับตั้งแต่ liftoff (`budget.ts:98-100`); `deltaVRemaining` ยังป้อนค่า dv ของ event (`sim/ascent.ts:386,478`, `sim/burns.ts:721,832`) | `src/design/budget.ts`, `VehicleModel` (P) | Δv ของแต่ละกลุ่ม strap-on ใช้ Isp และเวลาจุดของกลุ่มนั้น; core flow ใช้ `throttleWithBoosters`; ideal Δv ของ PSLV-XL/FH/Angara ต่างจากโมเดลการบินไม่เกิน 1 % | ค่า dv ของ event ที่เปลี่ยนแสดงในตารางก่อน/หลังเป็น re-record ที่ระบุชื่อ; trajectory ไม่เปลี่ยน (assert fingerprint ของ fleet) | R4.2 (PSLV/FH/Angara) |
| M-BUILD-018 (DP:PHY-PH04, RW:B-14, DP:D-9, OD:D-9, OD:IS D02 stretch rule, RM:D05/D02 notes) | P2 / L / เปิด | launcher ที่ size แล้วไม่ถึงวงโคจรที่ Δv ที่ออกแบบ (1 t ต้อง +500 m/s, 10 t ต้อง +300 m/s); fairing เลือกตามเส้นผ่านศูนย์กลาง | `src/design/{sizing,sizing-model}.ts` | launcher ทดสอบ 3 แบบถึงวงโคจรแบบ point-mass ที่ Δv ออกแบบ + ≤100 m/s; มวล fairing ถูกพาไปจนถึงความสูงที่ทิ้ง; loss allowance มาจากค่ามัธยฐานของ fleet ที่วัดพร้อมแหล่ง; KPI-19 | ห้ามเพิ่ม margin Δv ตามอำเภอใจเพื่อซ่อน miss (PLAN:R4.3); ตารางก่อน/หลัง; ยานในแคตตาล็อกไม่กระทบ | D-9, D-48, M-BUILD-016 |
| M-BUILD-019 (OD:Build physics limits own-rocket, RM:D03 note) | P3 / M / เปิด | six-DOF ของจรวดที่ผู้ใช้ออกแบบ: ขั้นเครื่องเดียวที่มี id ของตัวเองไม่มี roll control (PSLV ที่เปลี่ยนชื่อหมุน 2.2°/s เทียบ 0.075°/s), vernier ของ R-7 ไม่ให้แรงขับ และ thruster ไม่ปรับตามขนาด | `rigid/*` (P), สะพานเชื่อม design → rigid | roll authority มาจาก actuator จริงของขั้น; vernier ให้แรงขับ; thruster ปรับตาม inertia ภายในขอบเขตที่มีแหล่ง; มีเทสต์ six-DOF ของยานที่ผู้ใช้สร้าง | fingerprint six-DOF ของแคตตาล็อกไม่เปลี่ยน (EO-PHY-2) เปลี่ยนเฉพาะ id ที่ผู้ใช้สร้าง; รัน rigid-flex-golden | R4.3 PR 1–4 |
| M-BUILD-020 (RW:B-07) | P3 / S / เปิด | ถัง 400 t ในลำตัว 0.5 m × 1 m ผ่านได้วันนี้; คำเตือนที่ใช้ความหนาแน่นช่วยสอนนักเรียน | `src/design/warnings.ts` (B), `src/design/warning-text.ts` (map รหัสคำเตือน → key; `tests/design-warning-text.test.ts` บังคับให้ทุกรหัสมี key ในสามภาษา), i18n 3 ภาษา | คำเตือนระดับ warn เมื่อปริมาตรเชื้อเพลิงเกินปริมาตรลำตัว (fill factor มีแหล่ง); ไม่มียานในแคตตาล็อกหรือ remix ใดเตือน; มี typed target ให้ R3.4r | เป็นคำเตือนเท่านั้น ไม่ปฏิเสธ; ผลของแคตตาล็อกเท่าเดิม (เทสต์ความสอดคล้องของข้อมูล) | — |
| M-ORBIT-046 (OD:D06 limits, OD:D07 limits, RM:D06-misses) | P2 / L / เปิด | หน้า requirements กับ bench ให้คำตอบต่างกันสำหรับดาวเทียมดวงเดียว (THEOS-2: array +18.9 %, battery +60.2 %, กฎ lifetime ต่างกัน); แถว arcjet ของ TM-113111 ต่าง 0.11 kg | `src/design/{requirements,satellite-model}.ts`, `src/orbit/{satellite-cores,power}.ts`, `src/data/satellite-templates.ts` (P-D) | D07 เรียก core ของ D06 ชุดเดียวกัน (กฎ array/battery/lifetime เดียว) หรือแสดงความต่างพร้อมคำอธิบาย; TM-113111 แก้หรือติดป้าย; บันทึกค่าคงที่สุริยะ 1361 (IAU) ซึ่งใช้อยู่แล้วที่ `power.ts:46` และใน torque ของ attitude (`satellite-model.ts:565` ส่ง `SOLAR_FLUX_1AU` เข้า `solarTorque`) คอมเมนต์ 1367 ใน `attitude.ts:78` เป็นค่าของตำราที่อ้าง ให้เขียนกำกับว่าค่าที่ใช้จริงคือ 1361; แม่แบบตาม D-47 | เทสต์ d06/d07 เปลี่ยนได้เฉพาะด้วยตารางก่อน/หลังที่เจ้าของอนุมัติ; ป้าย sourced/estimate คงอยู่; ดวงอาทิตย์ของ propagator (0.45°) และ SRP ไปที่ R4.5 (S14, D-41); #80 (`7662ead`) เพิ่ม `src/design/satellite-diagrams.ts` ที่อ่าน `designFigures` ชุดเดียวกับตาราง bench ภาพ diagram จึงเปลี่ยนตามค่าที่แก้ ต้องรวมไว้ในตารางก่อน/หลังและรัน journey `r3-bench-drawings` | D-47, R3.3r (ภาพ), M-PHYSICS-028 (S14) |

- **เกณฑ์รับของแพ็กเกจ (PLAN:R4.3):**
  - การควบคุมไม่ใช้แรงเกิน actuator และเชื้อเพลิงไม่หมดเพราะการควบคุมที่เกินจำเป็นตามขอบเขตอ้างอิง
  - ไม่มี branch regression ที่อธิบายไม่ได้
  - ต้องแยก "แบบมีสมรรถนะไม่พอ" ออกจาก "solver/assumptions/model ผิด"
  - miss ที่เหลือระบุชื่อ ไม่ลบด้วย tolerance ใหม่
- **quality guard (OR-2):** ไม่เพิ่ม margin Δv ตามอำเภอใจ; การแก้ planner ร่วมต้องประเมินทุก family ที่ใช้; ค่าที่ตั้งใจเปลี่ยนต้องได้รับอนุมัติชัดแจ้ง
- **หลักฐาน:** `reports/R4.3-<เรื่อง>.md` · **execution_authorized:** false

### 13.6 R4.4 — Fleet acceptance และ quality labels

#### R4.4 — gate ครบ, aero เทียบข้อมูลวัด, manifest ที่อ้างอิงได้, ป้ายผูกเทสต์
- **เลน:** P (แถว fleet, aero) / Q (เทสต์ป้าย) / T (script ของ manifest) + ผู้ตรวจวิทยาศาสตร์อิสระ (D-55) ที่แยกจากผู้ fit; รายงานรวมมีเจ้าของคนเดียว
- **คลื่น:** K4 (ส่วน `soyuz21a` ของ 050 ทำก่อน G4-S) **ประมาณการ (หยาบ):** 13.5 agent-days, 4 PR ใน `packages.tsv` (ลำดับขั้นด้านล่างมี 5 PR หลังแยก 061 ตามกฎหนึ่งชนิดต่อ PR; ปรับที่ GK ตาม S05 §05.11) **OR:** OR-2, OR-3, OR-6
- **ขึ้นกับ:** CO-6, R4.1 (040), D-55 · **ปลดล็อก:** G4-S, G4, ED-EVAL (บทความภายใต้ D-24)
- **ไฟล์ที่อนุญาต:**
  - P: `tests/sixdof-fleet/{cases,*}.ts`, `tests/validation/aero-*.test.ts` (ใหม่)
  - T: `scripts/validation-report.mjs`, `docs/validation-manifest.json` (ใหม่, สร้างจากการรันเท่านั้น)
  - UI: `src/ui/validation/validation-panel.ts`
  - เอกสาร: `docs/SIXDOF-VEHICLE-DATA.md` (แก้เนื้อหาในรูปแบบเดิม เพราะแอปอ่านไฟล์นี้), `docs/IMPLEMENTATION-STATUS.md` (Known limitations)
  - T: `.github/workflows/{ci,deploy}.yml` เฉพาะรายการ path filter ของ Markdown ที่ถูกอ่าน (PR ของ M-LAUNCH-072 เท่านั้น)
  - i18n 3 ภาษา
- **ชนิดการเปลี่ยนต่อ PR (ลำดับ):**
  1. quality-improving: 050 (แถว `soyuz21a` ก่อน แล้ว Saturn V)
  2. quality-improving: 051
  3. feature: 061 script ของ manifest + การแสดงในแอป (`validation-panel.ts`, สามภาษา)
  4. docs: 061 ตารางประวัติศาสตร์ใน VALIDATION สร้างใหม่จาก manifest หรือติดป้าย historical (merge ต่อจากข้อ 3)
  5. quality-improving: M-LAUNCH-072 (รวมการเพิ่ม `docs/IMPLEMENTATION-STATUS.md` ใน path filter ของ CI/deploy, §13.9 ข้อ 4)

| รหัส (ที่มาเดิม) | P / ขนาด / สถานะ | เรื่องและเหตุผล | ไฟล์ | เกณฑ์รับ | วิธีพิสูจน์ (ขอบเขตตรึงก่อน) | ขึ้นกับ |
|---|---|---|---|---|---|---|
| M-PHYSICS-050 (RW:PHY-04) | P2 / S / เปิด | six-DOF fleet gate ไม่บิน Saturn V และไม่มีแถว `soyuz21a` เป็นช่องว่างของการป้องกัน regression สำหรับยานที่ใช้ในบทเรียนประวัติศาสตร์และยานของ G4-S | `tests/sixdof-fleet/*.ts` | เพิ่มแถวที่ยอมรับแล้วของ Saturn V และแถว `soyuz21a` (หรือพิสูจน์ว่าการละไว้ตั้งใจเพราะเทสต์ programme/Watch ครอบแล้ว ซึ่งต้องตัดสินก่อน G4-S); fleet ต้องจบภายใน timeout ของ `heavy.yml` ถ้าเกินให้แยกไฟล์หรือ shard ห้ามตัด case | เพิ่ม case อย่างเดียว (PLAN:§9.2 ห้ามลด); ถ้าแถวใหม่ล้ม ถือเป็นข้อค้นพบที่ระบุชื่อ (bisect หรือ known miss) ห้ามตัดทิ้ง | CO-6 |
| M-PHYSICS-051 (DP:PHY-PH14) | P3 / M / เปิด | ค่าสัมประสิทธิ์ aero ของ six-DOF ใช้ Jorgensen (NASA TR R-474) และ Allen & Perkins (NACA TR 1048) เป็น input (`SIXDOF-VEHICLE-DATA.md:183`) แต่ไม่เคยเทียบผลลัพธ์กับข้อมูล cone-cylinder ที่วัดจริง | `tests/validation/aero-*.test.ts`, `docs/SIXDOF-VEHICLE-DATA.md` | มีเทสต์ validation ที่จุดอ้างอิง digitise ที่ M=2–4, α ≤ 20° และ tolerance ตรึงไว้; ความต่างพร้อมสาเหตุที่น่าจะเป็นและ confidence envelope บันทึกใน SIXDOF-VEHICLE-DATA.md | เทียบเท่านั้น ไม่ปรับค่าสัมประสิทธิ์ให้ผ่าน; การเปลี่ยนโมเดลภายหลังเป็นการตัดสินใจแยกของ R4.2; ห้ามจัดรูปแบบไฟล์ที่แอปอ่านใหม่ | 040 |
| M-PHYSICS-061 (DP:PHY-PH16, DP:CTX-I-6M-5, OD:QA-01) | P2 / M / บางส่วน | `validate:science` (#70) มีอยู่แต่ครอบเฉพาะ sizing/rating/satellite บางส่วน ยังไม่ครบรายโมดูล และตารางประวัติศาสตร์ไม่มี provenance; ครู ผู้ตรวจ และสถาบันต้องอ้างได้ว่าตรวจอะไรเทียบกับอะไร | `scripts/validation-report.mjs`, `docs/validation-manifest.json`, `validation-panel.ts`, i18n | โมดูลฟิสิกส์ทุกตัวมีแถว manifest (reference, tolerance, result, date, source digest) จากการรันเทสต์บน SHA ที่ตรง; ตารางประวัติศาสตร์ถูกสร้างใหม่หรือติดป้าย historical; แสดงในแอป EN/TH/RU; แถวที่หายทำให้เทสต์ล้ม; ส่งออกแบบอ้างอิงได้ | ค่ามาจากการรันเท่านั้น ห้ามพิมพ์เอง; sabotage: ลบแถวหนึ่งแล้วเทสต์ต้องล้ม | 001, 040 |
| M-LAUNCH-072 (DP:P-11) | P2 / M / บางส่วน | มีป้ายหลายจุดแล้ว (sourced/estimate, pack draft, validation panel) แต่ไม่มีเทสต์ผูกป้ายกับ Known limitations ผู้ใช้จึงไม่รู้ว่าตัวเลขไหนเชื่อได้ | registry ป้ายใน `src/validation/` (ใหม่), เทสต์, `IMPLEMENTATION-STATUS.md` | เทสต์ล้มเมื่อ bullet ใน Known limitations ไม่มีป้ายบนจอ หรือป้ายไม่มี bullet | ป้ายเท่านั้น ตัวเลขไม่เปลี่ยน; sabotage สองทาง (ลบป้าย / ลบ bullet); **ผลข้างเคียง:** IMPLEMENTATION-STATUS จะกลายเป็น Markdown ที่เทสต์อ่าน PR นี้จึงต้อง (1) เพิ่ม `docs/IMPLEMENTATION-STATUS.md` ในรายการ Markdown ที่ถูกอ่านของ path filter ใน `ci.yml` (ทั้ง `pull_request` และ `push`) และ `deploy.yml` (บน `da67341` มีแค่ ROADMAP-PART2-3, SIXDOF-VEHICLE-DATA และ T03-CURRICULA-RESEARCH) มิฉะนั้นการแก้ IS แบบ Markdown ล้วนจะข้าม CI และทำให้เทสต์ป้ายบน main ล้มโดยไม่มีใครเห็น; (2) เพิ่มในรายการไฟล์ที่ถูกอ่านของ S18 §18.8 และในรายการห้ามย้าย/ห้ามจัดรูปแบบ (S19 App D, ดัชนี docs/README ของ M-PLATFORM-075); (3) ให้ R7.5 รันเทสต์นี้ทุกครั้งที่แก้ IS | R4.1–R4.3 (ป้ายตามสถานะจริง) |

- **สามชั้นของการยอมรับ (PLAN:R4.4):**
  - (1) physical invariants/numerical convergence (รวม 051)
  - (2) affected mission/held-out reference (รายงาน R4.2/R4.3)
  - (3) broad regression/fleet/Monte Carlo (050, 030)
- **สิ่งที่ flight realism ต้องครอบ:** attitude/rates/path/maxQ/α/qα/events/insertion/fuel/debris/recovery ตามภารกิจ ไม่วัดแค่ "ถึงวงโคจร"
- **ความเสถียรของแหล่ง:** แหล่งต้องนิ่งทั้งก่อนและหลังรัน; runtime/lock/config/snapshots ระบุไว้; coverage union ไม่มี case ที่ข้ามโดยไม่แจ้ง
- **การรันซ้ำโดยอิสระ (D-55):**
  - ผู้ตรวจรันตัวเลขหลักของรายงาน G4-S/G4 ซ้ำบน SHA ที่ตรึง แล้วเทียบแถวต่อแถว
  - ถ้าไม่ตรงกัน ประตูไม่ผ่าน
  - ผู้ fit ห้ามลงนามแทน (กฎห้ามกรอกการอนุมัติแทนคน, S02 §02.7)
- **ทางออกของแพ็กเกจ:** KPI-17 (18/21), KPI-18 (8/8, ≥6 ใน 15 %), KPI-19 (3/3) และ KPI-20 (ลดได้อย่างเดียว) ตาม S04 รวม KPI-21 = 0 และ KPI-22 เขียว
- **การปล่อยรุ่น:** ส่งเป็น wave ได้ ไม่ต้องรอ family ที่ยังหาแหล่งไม่ได้
- **หลักฐาน:** `reports/R4.4-acceptance.md` (ผู้ตรวจลงนาม) · **execution_authorized:** false

### 13.7 รายการ "วัดก่อน แล้วจึงตัดสิน" (RA:(c)#5 และงานที่คล้ายกัน)
วัดบนฐาน CO-6 ตามขอบเขตที่ตรึงก่อนวัด ถ้าไม่ถึงเกณฑ์ ห้ามเปลี่ยนโมเดล ให้เขียนผลลงรายงานและป้ายแทน

| เรื่อง | วัดอะไร | เกณฑ์ตัดสิน (ตรึงก่อนวัด) | ถ้าไม่ถึงเกณฑ์ | ผู้ตัดสิน / แพ็กเกจ |
|---|---|---|---|---|
| ใช้ MSIS คิด drag ในช่วงวงโคจรของการบิน (RA:(c)#5) | อัตราส่วนความหนาแน่นระหว่างตาราง exponential ของ Vallado กับ NRLMSISE-00 ตามเส้นทางช่วงวงโคจรที่บินจริง ที่ 150–400 km ด้วย F10.7/Ap เดียวกัน | ใช้เมื่อ \|Δρ\|/ρ เกิน **15 %** (ความไม่แน่นอนของ ECSS-E-ST-10-04C) บนชุดแถวที่ระบุชื่อ หรือเมื่อพิสูจน์ได้ว่าความคลาดของ GTO perigee/RAAN มาจากเรื่องนี้ | คงตารางเดิม; คำตอบระยะยาวใช้โมเดล lifetime ที่มีป้าย (M-PHYSICS-022, S14) | P; R4.2 → R4.5 ร่วมกับ D-10 |
| J2 ในช่วง coast ของ point-mass (RA:(c)#5) | GTO perigee (−13 ถึง +11 km) และ RAAN ของแถว fleet แบบมีและไม่มี J2 secular rate เชิงวิเคราะห์ | ใช้เมื่อพิสูจน์ได้ว่าความคลาดของ perigee/RAAN มาจากการขาด J2 ไม่ใช่จาก guidance | คง Kepler coast และระบุ offset | P; ต้องตัดสินแบบเดียวกับ D-51 เพราะ fingerprint 27 ตัวจะขยับ |
| J2 ในช่วง ascent ของ point-mass (M-PHYSICS-023) | offset ต่อยาน (~0.5 % ของ g, ~8 m/s ต่อ 500 s) และสัดส่วนของช่องว่างระหว่างสองโมเดล | เปลี่ยนโค้ดเมื่อ R4.2 แสดงว่า offset เป็นสาเหตุที่ระบุชื่อได้ของความต่างระหว่างสองโมเดล | ทำส่วนเอกสารอย่างเดียว | H ผ่าน D-51 |
| Falcon 9 ลดแรงขับตามช่วงเวลา (F1/F2) | แหล่งของความลึก (acceleration ที่อนุมานจาก telemetry ของชุด fit) | ใช้เมื่อมีแหล่งและผ่าน held-out (§13.4) | คง q-limiter; F1/F3 เป็น known miss | P; R4.2 Falcon 9 PR1 |
| Programme ของ Saturn V ใน six-DOF (audit คำถามเปิด) | α, q·α, body rate และการออกนอกตาราง aero เมื่อบิน programme ของ FER ใน six-DOF | ใช้เมื่อขอบเขตทุกข้อของ FLIGHT-PROFILE-METHOD §6 ผ่าน | คง kick ที่ fit ไว้ของ six-DOF พร้อมป้าย | P; R4.4 (050) |
| ข้อเสนอ audit ของ Ariane 64 (critic ขั้น 8) | fleet matrix, rating, GTO reference และ six-DOF ก่อน | ใช้ตามลำดับ VA268 ก่อน, fairing 2.6 t, core 23/154 t พร้อม cutoff 457 s, คู่ Vulcain แต่ไม่ใช้หัว P120C; fit guidance แบบ tier A โดย held out VA268 | ไม่ลง | P-D/P; R4.1 → R4.2 |
| มวลขั้นสอง/ignition delay/minimum throttle ของ Falcon 9/FH (critic ขั้น 7) | การลงจอดของ FH และ six-DOF หลัง 044/045 | ใช้หลังวัดแล้วว่าไม่ทำให้แถว recovery แย่ลง | ไม่ลง | P-D; R4.2 |
| กลไกใหม่ของ critic ขั้น 10 (H-IIA long-burn F50, Atlas timed throttle/2.5 g hold, กลุ่ม GEM jettison, ตารางแรงขับ SRB-A3, F9 stage-1 acceleration hold, Proton verniers/hot staging, solid profile ที่ขึ้นแล้วลง) | วัดทีละกลไกโดยปิดเป็นค่าเริ่มต้น | ใช้เมื่อแถวที่ระบุชื่อเข้าใกล้ค่าอ้างอิงและยานอื่นไม่ขยับ | ไม่ลง | P; R4.2 หนึ่งกลไกต่อ PR |
| แถบความคลาดของ fleet แบบเว้นทีละลำ (FLIGHT-PROFILE-METHOD) | residual แบบ cross-validated หลังมียาน tier A ≥3 ลำ | เผยแพร่เป็นแถบความคลาดเมื่อแถบครอบค่าจริงของทุกยานที่ถูกเว้น | คงป้าย "data insufficient" | P + ผู้ตรวจอิสระ; R4.4 |
| ความล้มเหลวของ G05 (M-PHYSICS-030) | reproduce ด้วย seed แล้วจัดประเภท | แก้เฉพาะกรณีที่เป็น "model or guidance defect" | known miss ที่มีชื่อและเจ้าของ | P; R4.3 |
| trim share ของ `r7sputnik` (audit missed #5; กรณีที่ระบุชื่อ "R-7 trim share" ใน M-PHYSICS-030) | six-DOF ของ `r7sputnik` ที่ trim share 35 % เทียบ 65 % บนแถวอ้างอิงของ Sputnik (insertion, events, α/q·α, เชื้อเพลิง) รวมผลต่อ kick ที่เลือกไว้ที่ 35 % | ใช้ 65 % เมื่อแถวที่ตรึงไว้ดีขึ้นหรือเท่าเดิมทุกแถว และขอบเขตของ FLIGHT-PROFILE-METHOD §6 ผ่าน | คง 35 % พร้อมเหตุผลในคอมเมนต์และ ledger ของ 040 | P; R4.3 (030) |

ส่วนที่ไม่อยู่ในส่วนนี้: mascons (RA:(c)#9 → R8.2, S15) และลมชั้นบน (M-PHYSICS-025 → R4.5, S14)

### 13.8 แพ็กเกจที่ส่งหลักฐานให้ G4-S และ G4 (เกณฑ์อยู่ใน S05 §05.4) และความขัดแย้งที่แก้แล้ว

| ประตู | เกณฑ์ (ย่อ, ดู S05) | แพ็กเกจที่ส่งหลักฐาน | ชนิดหลักฐาน | ผู้ลงนาม |
|---|---|---|---|---|
| G4-S | หลักฐาน Soyuz-2.1a / Soyuz MS ครบตาม FLIGHT-PROFILE-METHOD ขั้น 1–8 | ทะเบียนแถว `soyuz21a` (R4.1 040); R4.2-S (052; offset J2 ของ 023 ระบุในรายงาน); บันทึกเดิมใน VALIDATION §3 | scientific | ผู้ตรวจ D-55 แล้ว H |
| G4-S | heavy + fleet เขียวบน source ที่ตรึง | CO-6 (ฐาน), R4.4 050 (แถว `soyuz21a` ใน fleet), การรันของ candidate GK | execution | Q/T |
| G4-S | EQ-10 merge ก่อน PR แรกของ R4.2-S | EQ-10 (S09) | execution | P |
| G4-S | held-out ผ่านตามขอบเขตที่ตรึงไว้ก่อนรัน และความต่างระบุชื่อ | รายงาน R4.2-S (ตาราง §7 + บันทึก q/throttle) | scientific | ผู้ตรวจ D-55 |
| G4-S | ผู้ตรวจอิสระรันตัวเลขหลักซ้ำ | ขั้นรันซ้ำของ R4.4 | scientific + human | ผู้ตรวจ D-55 แล้ว H |
| G4-S | เวลา (S05 §05.4) | R4.2-S (3 PR, K3) merge ก่อนพักปลายปี 21 ธ.ค. 2026 → G4-S ปลาย K3; ถ้าไม่ทัน G4-S ต้น K4 (เร็วสุด ≈ 15 ม.ค. 2027) | execution | H |
| G4 | หลักฐานสามชั้นของ fleet | R4.4 (050, 051), รายงาน R4.2/R4.3, 030 (MC) | execution + scientific | ผู้ตรวจ D-55 แล้ว H |
| G4 | KPI-17…20 ตามเป้า | 049 (KPI-17), M-BUILD-016 (KPI-18), M-BUILD-018 (KPI-19), M-ORBIT-043 (KPI-20) | scientific | P/Q |
| G4 | KPI-21 = 0 และ known misses มีชื่อกรณีและเจ้าของ | รายงานทุก PR (re-record ที่ระบุชื่อ), ledger 040, manifest 061, ป้าย 072 | execution + docs | Q |
| G4 | ไม่บล็อกการปล่อยรุ่นที่ไม่เกี่ยวข้อง | family ที่เหลือเดินเป็น wave พร้อมป้าย (072) | — | H |

**ความขัดแย้งที่แก้แล้ว (ย่อจาก unified-physics.md และ unified-build.md; ห้ามรื้อใหม่):**
- **tier tolerance ก่อน refit (DP:11-02, ENG-K17) vs PLAN:R4.2/§8.1:** PLAN ชนะ held-out check เป็นเงื่อนไขบังคับ ส่วน tier เป็น oracle เสริมเท่านั้น ไม่ใช้แทน hash และไม่ใช้เป็น gate พร้อมกัน (042)
- **"เที่ยวบินในตัวเท่าเดิมทุกบิตตลอดไป" (RM:P7) vs PLAN:R4:** ใช้ฉบับแคบ: งาน Orbit/Build/การสอนไม่ขยับ golden ของ Launch ส่วน Launch เปลี่ยนได้ผ่าน R4 เท่านั้น พร้อมหลักฐานก่อน/หลังและเหตุผลข้างการบันทึกใหม่ทุกครั้ง (S02 §02.10)
- **WGS-84 (PHY-11) vs "ไม่ใช้โลกทรงรีเป็นค่าเริ่มต้น":** ข้อเสนอเดิม "แปลงเป็น geodetic เฉพาะการแสดงผล" ถูกตัดทิ้ง เพราะฟิสิกส์วางฐานปล่อยด้วย latitude ทรงกลมบน `R_EARTH` การแปลงด้านแสดงผลอย่างเดียวจะแสดงฐานปล่อยคลาด ~0.16–0.19° และสูงขึ้น 11–17 km ที่ T-0 แทนที่ด้วยทาง (ก) mapping ผกผัน + ป้าย datum ใน R4.2 หรือทาง (ข) วางด้วย WGS-84 ใน re-baseline ของ R4.5 ภายใต้ D-51 (024)
- **J2 ใน ascent ของ point-mass (PHY-10):** ระบุ offset ตอนนี้ ส่วนโค้ดทำเฉพาะเมื่อเจ้าของตัดสินผ่าน D-51 (023)
- **rating ของ Vega-C และ launcher ที่ size แล้ว:** มีทั้งใน ledger ฟิสิกส์และ Build ให้ M-BUILD-016 และ M-BUILD-018 เป็นรายการหลัก ส่วน M-PHYSICS-053 (→ M-BUILD-016) และ M-PHYSICS-054 (→ M-BUILD-018) เป็นตัวชี้ (superseded, S19 App C)
- **M-LAUNCH-077/078/079:** เป็น alias ของ 042/043/044 ส่วน Soyuz ของ 078 เสร็จแล้วเป็น M-PHYSICS-071
- **B-03 vs D1 (Build):** ไม่ทำ fallback บน main thread ให้ rating เพราะ 1–8 s จะทำให้หน้าค้าง ให้แสดง retry/reload แทน ส่วน rating ที่ยังไม่ลู่เข้าไม่ถูกเก็บ (FX-1)
- **G02:** การแก้นี้เท่าเดิมทุกบิตเมื่อปิด navigation จึงไม่ต้องรอการตัดสินใหม่ เจ้าของตัดสินแล้วเมื่อ 2026-09-24 (029)
- **ค่าคงที่สุริยะ:** โค้ดกำลังไฟและ attitude ของดาวเทียมใช้ 1361 W/m² แล้ว (`orbit/power.ts:46`; torque ของ attitude ได้ `SOLAR_FLUX_1AU` ผ่าน `design/satellite-model.ts:565` ส่วน 1367 ใน `orbit/attitude.ts:78` เป็นค่าของตำราที่อ้างในคอมเมนต์) งานของ 046 คือบันทึก ส่วน SRP ของ propagator `P_SUN` = 4.56e-6 N/m² (= 1367/c, `physics/propagator/forces.ts:33`) ยังใช้ค่าเดิมและอยู่ภายใต้ D-41 / R4.5 (S14)
- **ข้อความในโค้ด (041):** แก้ข้อความได้โดยไม่ bump `RIGID_DATA_REVISION` เพราะ replay/attitude-track/CSV ใช้ค่านี้เป็น key
- **G4 vs R5:** G4-S (ชุด Soyuz, หลักฐานจาก R4.2-S) ปลดล็อก R5.1–R5.3 ได้โดยไม่ต้องรอ G4 เต็ม (PC:(c)4)

### 13.9 สิ่งที่เลื่อนหรือไม่ทำในขอบเขตนี้ และช่องว่างที่พบระหว่างเขียน
- **เลื่อน (มีเงื่อนไขเริ่ม):** โค้ด J2 ของ point-mass (D-51); การวางฐานปล่อยด้วย WGS-84 (024 ทาง ข, D-51, R4.5); MSIS/J2 ใน coast ของการบิน (§13.7); throttle ของ core Falcon Heavy (รอเที่ยวบิน Block 5 สาธารณะเที่ยวที่สอง)
- **ไม่ทำ (บ้านคือ S02 §02.13 / S19 App C):** เพิ่มก๊าซให้ลงจอด; fit ใหม่ให้ผ่าน held-out; tolerance tier เป็น gate; bump `RIGID_DATA_REVISION` เพื่อแก้ข้อความ; throttle schedule ไร้แหล่ง; ยืม programme ที่ fit ข้ามฮาร์ดแวร์
- **ช่องว่างที่พบระหว่างเขียน และบ้านของแต่ละข้อ (ทุกข้อมี M-id แล้ว; ไม่ออก M-PLAN ใหม่):**
  1. **F6 → M-PHYSICS-040 (พับเข้า):** parking คงที่ 200 km (GTO 250 km) ของ Falcon 9 เทียบ 164–207 km ที่บิน (VALIDATION F6; PSLV-XL F12 ใช้สมมติฐานเดียวกัน) เป็นทางเลือกของ guidance ไม่ใช่ความผิดของฟิสิกส์ (สรุปของ VALIDATION §2) บันทึกเป็นแถว "สมมติฐานที่ประกาศ" ในทะเบียน `falcon9`/`pslvxl` ไม่มีงานโค้ดในแผนนี้ ถ้าจะทำ parking ต่อภารกิจภายหลัง ต้องวัดก่อนตาม §13.7 และออกรายการใหม่ผ่านการ re-plan ที่ GK
  2. **`R7_TRIM_SHARE_VEHICLES` (audit missed #5) → M-PHYSICS-040 + M-PHYSICS-030 (พับเข้า):** 040 บันทึกว่า `vostokk` ลงแล้วใน `1084ffe` (`rigid/runtime.ts:137` บน `da67341`) ส่วน `r7sputnik` ที่ยังบินด้วย 35 % เป็นกรณีที่ระบุชื่อ "R-7 trim share" ของ 030 ใน R4.3 วัดก่อนตาม §13.7
  3. **ฐานของ KPI-20:** ผลนับใหม่บน main ของ M-ORBIT-043 (PR 043a) เป็นฐาน ตามแถว KPI-20 ของ S04 ตัวเลข 29/55 และ 25/50 (`kpis.tsv`, RA:(a)) กับ 27/55 และ 25/49 (VALIDATION §8) เป็นแค่บริบท
  4. **M-LAUNCH-072 ทำให้ `docs/IMPLEMENTATION-STATUS.md` เป็นไฟล์ที่เทสต์อ่าน:** PR ของ 072 ต้องเพิ่มไฟล์นี้ใน path filter ของ Markdown ที่ถูกอ่านใน `.github/workflows/ci.yml` (`pull_request` และ `push`) และ `deploy.yml` ในตัว PR เอง และต้องเพิ่มในรายการไฟล์ที่ถูกอ่านของ S18 §18.8 (รวมรายการห้ามเปลี่ยนชื่อของ S00 §00.6, S19 App D และดัชนี docs/README ของ M-PLATFORM-075) ผู้แก้ S18/S19 ต้องเพิ่มแถวนี้ให้ตรงกัน
  5. **R4.2 K3/K4:** แก้แล้วด้วย pseudo-package R4.2-S (`packages.tsv`, `final/overrides_s05.py`; §13.4) รายการยังอยู่ใน R4.2
  6. **M-PHYSICS-024 ทาง (ข) ผูกกับ D-51:** คำถามของ D-51 ใน `decisions.tsv`/S08 ตอนนี้ครอบแค่ J2 ใน ascent ของ point-mass ผู้แก้ S08 ควรเพิ่มตัวเลือก "วางฐานปล่อยด้วย WGS-84 ใน re-baseline ของ R4.5" และ S14 §14.1 ควรระบุเป็นขั้นที่เลือกได้ของ R4.5 (ลงแล้ว: S08 §08.4 คำถามข้อ 2 ของ D-51 และขั้นที่เลือกได้ใน S14 §14.1) ทาง (ก) ไม่ต้องรอ D-51 (ฟิสิกส์ไม่เปลี่ยน) ส่วนทาง (ข) รอตามค่าเริ่มต้นของ D-51 ("งานรอ ไม่มี agent ตัดสินเอง") ถ้าภายหลังเลือกทาง (ข) ป้ายของทาง (ก) เปลี่ยนเป็น WGS-84 ใน R4.5 และเทสต์สี่ฐานคงอยู่
  7. **M-LAUNCH-031 แยกสองแพ็กเกจ:** บ้านคือ FX-5 (S10, ส่วน UI) ส่วนฟิสิกส์อยู่ใน R4.3 (PR ลำดับ 4) บันทึกไว้ในคอลัมน์ `notes` ของ `final/assignment.tsv` (สร้างโดย `final/overrides_s13.py` ที่ `gen_final.py` เรียก) เพื่อให้ S19 App A แสดงทั้งสองแพ็กเกจ
  8. **จำนวน PR:** R4.1 (8 PR) และ R4.4 (5 PR) มากกว่าประมาณการหยาบใน `packages.tsv` (7 และ 4) แพ็กเกจละหนึ่ง PR หลังแยกตามกฎหนึ่งชนิดต่อ PR ปรับที่ GK ตาม S05 §05.11 ไม่แก้ตารางตอนนี้
