## S14 R4 (2): ความสอดคล้องของฐานแบบจำลอง ความเที่ยงตรงเครื่องมือ Orbit และภาพที่ผูกกับสถานะฟิสิกส์ (R4.5–R4.7)

> **ขอบเขต:** ส่วนนี้เป็นบ้านของ 11 รายการใน 3 แพ็กเกจ ได้แก่ R4.5 ความสอดคล้องของฐานแบบจำลอง (P), R4.6 ความเที่ยงตรงของเครื่องมือ Orbit (O + P) และ R4.7 ภาพที่ผูกกับสถานะฟิสิกส์พร้อมงบ asset (C/P-R + P) นอกจากนี้ยังเป็น**บ้านเดียวของโปรโตคอล validation สำหรับงานความสมจริงทุกชิ้น** (§14.6) ซึ่ง S13 และ S15 อ้างถึง
> **ส่วนอื่นเป็นเจ้าของ (ส่วนนี้อ้างถึงเท่านั้น):** กฎค่าคงที่แหล่งเดียว, guard rail RA:(d) และ RM:P7 ฉบับแคบ (S02 §02.10) · รายการไม่ทำ (S02 §02.13) · oracle `EO-*` (S07 §07.5) · EQ-3/7/9/10 (S09) · R4.1–R4.4 และตาราง "วัดก่อนตัดสิน" (S13 §13.7) · R5 และ R8 (S15) · M-PLAN-015 (S11 §11.2) · เกณฑ์ประตูและหน้าต่าง re-baseline (S05 §05.4, §05.7) · KPI (S04) · เนื้อหา D-n (S08) · เลน fold และ DoD (S18)
> **as-of (ตรงกับ S00 §00.1):** ตรวจแบบอ่านอย่างเดียวถึง **2026-10-04 ~21:10Z** — main บน GitHub = `5f9aa2e` (#83 เอกสาร, merge 20:31:34Z); live = `09cc2f5` (#82; Pages 37230585947 สำเร็จ 20:29:40Z เผยแพร่ #80–#82 พร้อมกัน); ไม่มี PR เปิด; R3 ครบตามคำของเจ้าของ (2026-10-04) ส่วนนี้ไม่เขียนสถานะ main, live หรือ PR ซ้ำ (ผลการตรวจหลัง as-of อยู่ใน S06 และ S08)
> **ฐานข้อเท็จจริงของส่วนนี้:** สถานะทุกรายการตรวจบน `da67341` และการอ้างบรรทัดโค้ดที่ไม่ระบุ SHA ใช้ `da67341` GitHub compare `da67341...7662ead` (อ่านอย่างเดียว, 63 ไฟล์; `7662ead...5f9aa2e` แตะเฉพาะ `src/main.ts` (#81 marks), `tests/browser/harness.mjs` และ PROGRESS จึงไม่เปลี่ยนข้อสรุปของส่วนนี้) ไม่แตะ `src/physics/**`, `src/render/**`, `src/data/**`, `src/orbit/**` (ยกเว้น `handoff.ts` ที่ #80 เพิ่ม `origin.design`), `src/design/satellite-launch.ts`, `src/ui/lifetime.ts`, `tests/heavy`, `tests/sixdof-fleet` หรือ `docs/{PHYSICS,VALIDATION}.md` บรรทัดที่อ้างในไฟล์เหล่านี้จึงยังตรงกับ `7662ead` ไฟล์ในขอบเขตนี้ที่เปลี่ยน: `src/ui/orbit/playground.ts` (+21/−5: กลุ่ม preset ของ R3.5 ใน #77 และ design reference ของ R3.1 ใน #80) · `src/main.ts` (`:966` → `7662ead:src/main.ts:993`, `:2106` → `7662ead:src/main.ts:2318`) · `src/ui/home.ts` (`DEG` `:55` → `7662ead:src/ui/home.ts:57`) · `src/ui/result-content.ts` (`:161` ไม่ขยับ) · `budgets.json` (เพดาน precache 16,103 kB ตั้งใน #76 `1d5b76b` และคงเดิมถึง `7662ead`) · `src/design/satellite-diagrams.ts` (ใหม่ใน #80 วาดแสง/เงาจากตัวเลขของ `satellite-model` ไม่มีฟิสิกส์ของตัวเอง R4.5 จึงไม่ต้องแตะ) ทุกแพ็กเกจต้องตรวจซ้ำบน SHA ของ Day 0 หรือ merge-base ของ PR ก่อนเริ่ม แผนนี้**ไม่ได้รันการคำนวณฟิสิกส์ใดเลย**
> **ประมาณการรวม (หยาบ, `packages.tsv`):** 57.5 agent-days และราว 19 PR ทุกแพ็กเกจ `execution_authorized: false` (D-65)

### 14.0 รายการที่ส่วนนี้เป็นบ้าน (11 รายการ, `assignment.tsv`)

| แพ็กเกจ | รายการ (P / ขนาด / สถานะ) | เลน | คลื่น | agent-days / PR | ส่งหลักฐานให้ |
|---|---|---|---|---|---|
| R4.5 | M-PHYSICS-020 (P2/L/เปิด), 028 (P2/M/เปิด), 022 (P3/M/เปิด), 025 (P3/M/เปิด), 026 (P3/S/เปิด) | P | K4 (026 ต้อง merge ก่อน R8 ใน K6) | 21.5 / 7 | G8 (026), GK ที่แตะฟิสิกส์, ข้อมูลให้ R4.6 (023) |
| R4.6 | M-ORBIT-019 (P2/M), 020 (P2/M), 023 (P2/L), 021 (P3/L), 022 (P3/L) ทั้งหมดเปิด | O (+P ตรวจฟิสิกส์) | K4–K5 (M-ORBIT-021 อยู่ K5 ขึ้นไป หลัง R5.2) | 32 / 11 | GK ที่แตะเครื่องมือ Orbit (ไม่ใช่ประตูบล็อก) |
| R4.7 | M-PLAN-016 (P3/M/เปิด) | C/P-R (+P) | K4 | 4 / 1 | G6 (งบ asset), R5.4/R6.2 ผ่าน D-50 |

- **สรุป:** เปิดทั้ง 11 รายการ · P2 5 รายการ, P3 6 รายการ · ไม่มี P0/P1 · ไม่มี alias
- **อ้างถึงแต่ไม่ใช่บ้าน:** M-PHYSICS-010 (EQ-9), M-PHYSICS-012/015 (EQ-10), M-LAUNCH-045 (EQ-7), M-LAUNCH-043 (EQ-3) ใน S09 · M-PHYSICS-021 (D-10), M-PHYSICS-027 (D-41) ใน S08 · M-PHYSICS-001 (CO-6, S06) · M-PHYSICS-002, M-PLAN-010, M-PLAN-018, M-PLAN-020 (R0.4, S07) · M-BUILD-001 (DELIVERED, S03; ส่วนที่เหลือ M-PLAN-028 R3.1r, S12) · M-PHYSICS-023/045/052, M-ORBIT-046 (S13) · M-ORBIT-025/026/027/032 (S15) · M-PLAN-015 (S11) · M-PLATFORM-035 (FX-4, S10)

### 14.1 R4.5 — ความสอดคล้องของฐานแบบจำลอง (เลน P)

#### R4.5 — re-baseline ตัวแพร่กระจายครั้งเดียว แล้วตามด้วยบรรยากาศ ลม Kepler e ≥ 1 และ LTAN
- **เลน:** P (ทำทีละ PR อย่างเคร่งครัด) ร่วมกับ B + S สำหรับ 028 (`src/design/**` และ envelope) และ U/L-C สำหรับข้อความของ 022 (ผ่าน I-train เมื่อแตะ hotspot)
- **คลื่น:** K4 (4 ม.ค.–12 ก.พ. 2027) ภายใน "หน้าต่าง re-baseline ฟิสิกส์" (S05 §05.7) ลำดับในเลน P คือชุด Soyuz ของ R4.2 → G4-S ก่อน (เส้นทางวิกฤต) แล้วจึง R4.5 ตามลำดับ 020 → 028 → 022 → 026 → 025 ถ้าเลน P แน่น 025 เลื่อนไป K5–K6 ได้โดยไม่บล็อกงานใด
- **ประมาณการ (หยาบ):** 21.5 agent-days, 7 PR **OR:** OR-2, OR-3, OR-6
- **ขึ้นกับ:** CO-6 เขียวบน SHA ที่เผยแพร่ · M-PHYSICS-002 (EO-PHY-6) และ M-PLAN-010 (EO-ORB-1) บันทึกบน base · EQ-9 (M-PHYSICS-010) · EQ-10 (M-PHYSICS-015 สำหรับ 020, M-PHYSICS-012 สำหรับ 025) · D-10 และ D-41 (020) · EQ-7 M-LAUNCH-045 (026) · R3.1r M-PLAN-028 (028) · D-55 (ผู้รันซ้ำ)
- **ปลดล็อก:** M-ORBIT-023 และ (แนะนำ) M-ORBIT-022 ใน R4.6 · R8 และ G8 (026) · อัตราเอียงของ GEO ที่คำนวณได้ ใช้เป็นหลักฐานให้ M-ORBIT-046 (R4.3, S13) แทนค่าประมาณ 0.85°/ปี ที่ระบุว่าเป็น estimate (`docs/VALIDATION.md:3608`)
- **ไฟล์ที่อนุญาต:**
  - P: `src/physics/{constants,ephemeris-series,orbital,mission}.ts`, `src/physics/propagator/{forces,ephemeris,density,msis*}.ts`, `src/physics/lunar/ephemeris.ts` (re-export เท่านั้น ค่าไม่เปลี่ยน), โมดูลใหม่ `src/physics/precession.ts` (ถ้ามีขั้น 1), `src/physics/rigid/runtime.ts` และ `src/physics/aero.ts` เฉพาะ scenario ลมแบบ opt-in
  - B/S (028): `src/design/satellite-launch.ts`, ไฟล์ hand-off/mission ของ R3.1 ที่ส่งแล้ว (เพิ่ม field LTAN แบบไม่บังคับตามกติกา reader-before-writer) · O: `src/orbit/kepler.ts` เฉพาะการ import นิยามดวงอาทิตย์เฉลี่ยจากแหล่งเดียว และ `src/orbit/power.ts` เฉพาะการ re-export `SOLAR_FLUX_1AU` จาก `constants.ts` (ค่าเท่าเดิมสำหรับระบบพลังงาน; เฉพาะเมื่อ D-41 = (ก))
  - เทสต์และเอกสาร: `tests/**` (fixture ใหม่ใต้ `tests/fixtures/ephemeris/` พร้อมสคริปต์สร้าง), `docs/{PHYSICS,VALIDATION}.md`, `NOTICE.md` (ถ้า D-10 = port)
- **fold (`folds.tsv`):** M-PHYSICS-015 (EQ-10) ต้อง merge "strictly before the R4.5 re-baseline" · M-PHYSICS-010 (EQ-9) ต้องมาก่อน 020 และก่อน M-ORBIT-022/023 · tail `propagateKepler` ร่วมของ M-LAUNCH-045 (EQ-7) ต้องมาก่อน 026
- **ชนิดการเปลี่ยนต่อ PR (ลำดับ; ขั้น 1 และ 3 มีเงื่อนไข):**
  1. identical-output: ย้าย `precessionFromJ2000` (`lunar/ephemeris.ts:39`) ไปโมดูลที่ไม่ import ข้อมูล โดยคงชื่อเดิมเป็น re-export และตั้งชื่อฟังก์ชัน ephemeris ให้บอก frame (RA:(b) ข้อ 4) ทำเมื่อ EO-BUN-1 แสดงว่าการ import ตรงจะดึง `data/ephemeris-1969.ts` (31.6 kB source) เข้า chunk ของ worker `reentry`/`lifetime`/`lifetime-altitude`
  2. docs: บันทึกขอบเขตที่ตรึงก่อนรันของ 020 (§14.6 ขั้น 1)
  3. feature (ค่าเริ่มต้นเท่าเดิม เฉพาะเมื่อ D-10 = port): โมดูล NRLMSIS 2.1 ที่ยังไม่ถูกเลือกใช้
  4. realism-changing: 020 re-baseline ครั้งเดียว
  5. realism-changing: 028 (หลัง fixture ทุกรูปแบบที่ ship ของ R3.1r PR1 และ D-22)
  6. quality-improving: 022 ป้ายแบบจำลอง และส่งคำถามระยะยาวไปที่แบบจำลองอายุวงโคจร
  7. realism-changing: 026 (เฉพาะสาขา e ≥ 1)
  8. feature: 025 scenario ลมชั้นบนแบบ opt-in
- **ขั้นที่เลือกได้ (รับจาก S13 §13.9 ข้อ 6):** ถ้าเจ้าของตอบคำถามข้อ 2 ของ D-51 เป็น (ข) ทาง (ข) ของ M-PHYSICS-024 (วางฐานปล่อยด้วย WGS-84; บ้าน S13 / R4.2) เข้า re-baseline เดียวกับขั้น 4 เป็น PR realism-changing แยกหลัง 020 โดยใช้ตาราง fleet ก่อน/หลังชุดเดียวกัน ไม่ใช่ re-baseline ครั้งที่สอง ถ้าตอบ (ก) หรือยังไม่ตอบ ไม่มีขั้นนี้ ส่วนทาง (ก) (ป้าย datum) อยู่ใน R4.2 ตาม S13

| รหัส | ที่มาเดิม | P / ขนาด / สถานะ | ชนิด PR | ขึ้นกับ |
|---|---|---|---|---|
| M-PHYSICS-020 | CR:D18, CR:D19 (ส่วน MU_MOON), `docs/VALIDATION.md:3369–3373`, IS:563 | P2 / L (~8 วัน) / เปิด | identical-output (ขั้น 1, มีเงื่อนไข) → docs → feature (มีเงื่อนไข) → realism-changing | CO-6, M-PHYSICS-002, M-PLAN-010, EQ-9, EQ-10 (fold), D-10, D-41, D-55 |
| M-PHYSICS-028 | OD:SCI-02 | P2 / M (~4 วัน) / เปิด | realism-changing | R3.1 ส่งมอบแล้ว (M-BUILD-001); R3.1r PR1 (M-PLAN-028 fixture); D-22; CO-6 |
| M-PHYSICS-022 | RW:PHY-12 | P3 / M (~4 วัน) / เปิด | quality-improving (realism-changing ถ้าตัวเลขที่แสดงเปลี่ยน) | D-10, 020 |
| M-PHYSICS-026 | RW:PHY-14 | P3 / S (~1.5 วัน) / เปิด | realism-changing (เฉพาะสาขา e ≥ 1) | EQ-7 M-LAUNCH-045 (fold), CO-6 |
| M-PHYSICS-025 | RW:PHY-13 | P3 / M (~4 วัน) / เปิด | feature (opt-in, ค่าเริ่มต้นเท่าเดิม) | EQ-10 (M-PHYSICS-012), EQ-3 (M-LAUNCH-043), R4.1 |

##### M-PHYSICS-020 — ดวงอาทิตย์/ดวงจันทร์ of-date, `MU_MOON` ของ DE441, ค่าคงที่สุริยะของ SRP (ตาม D-41) และผล D-10 ใน re-baseline เดียว
- **เรื่องและเหตุผล:** ตัวแพร่กระจายระยะยาว (P07 Cowell และ mean elements) ใช้ `sunPosition`/`moonPosition` ของ Montenbruck & Gill ใน J2000 (`ephemeris-series.ts:29`, re-export ผ่าน `propagator/ephemeris.ts`) ภายใน frame mean-of-date ดวงอาทิตย์จึงห่างจากของเครื่องมือ Orbit 0.4543° (2026-09-26; 0.626° ในปี 2036) ขอบเงา SRP เลื่อนได้ถึง 11 s และดวงจันทร์คลาด frame 0.37° เท่ากัน นอกจากนี้ `MU_MOON` (`forces.ts:31`) สูงกว่า DE441 0.042 % และ SRP ของ propagator `P_SUN = 4.56e-6` (`forces.ts:33`) = 1367/c ขณะที่ระบบพลังงานใช้ 1361 ทุกที่แล้ว (`orbit/power.ts:59`; S13 §13.8) ผลคือ lifetime, eclipse และขอบเงาไม่สอดคล้องกับส่วนอื่นของแอป
- **ไฟล์:** `src/physics/{constants,ephemeris-series}.ts`, `src/physics/propagator/{forces,ephemeris,density,msis*}.ts`, `src/physics/lunar/ephemeris.ts` (re-export เท่านั้น), `src/physics/precession.ts` (ใหม่ ถ้ามีขั้น 1), `src/orbit/power.ts` (re-export `SOLAR_FLUX_1AU` เท่านั้น ถ้า D-41 = (ก); O ตรวจ), `tests/fixtures/ephemeris/**` และสคริปต์สร้าง, เทสต์ propagator/activity/reentry, `docs/{PHYSICS,VALIDATION}.md`, `NOTICE.md` (ถ้า D-10 = port)
- **เกณฑ์รับ:** ผ่านขอบเขตใน §14.1.1 ทุกข้อ · มีตาราง VALIDATION ก่อน/หลังของ R05/P2.5/M03 · ดวงอาทิตย์ของ propagator กับ `sunDirectionEci` ตรงกันภายในขอบเขต (แทนเทสต์เดิมที่ "อธิบายความต่าง 0.45°") · `MU_MOON` มีนิยามเดียวใน `constants.ts` · ค่าคงที่สุริยะเป็นไปตามผล D-41: ถ้า (ก) `SOLAR_FLUX_1AU` มีนิยามเดียวใน `constants.ts` และ `P_SUN` คำนวณจากค่านั้น ถ้า (ข) คง 1367/c ไว้และ PHYSICS/VALIDATION เขียนเหตุผลของสองค่า · literal-guard ของ EQ-10 ครอบคลุมทุกค่าข้างต้น · การ re-record ทุกตัวมีชื่อ เหตุผล และการอนุมัติของเจ้าของ
- **วิธีพิสูจน์:** §14.6 ทั้งชุด · fixture Skyfield/DE421 สร้างด้วยสคริปต์ที่ commit ไว้ (เวอร์ชัน Skyfield, hash ของ DE421) แบบเดียวกับ `tests/fixtures/reentry/make_*.py` · ประกาศชุดที่คาดว่าจะขยับและชุดที่ห้ามขยับก่อนรัน (§14.1.1) · ผู้ตรวจอิสระรันตัวเลขหลักซ้ำ (D-55)

##### M-PHYSICS-028 — LTAN ใช้ convention เดียวระหว่าง designer กับ Launch
- **เรื่องและเหตุผล:** Launch เล็งโหนดที่ดวงอาทิตย์จริง (`raanFromLtan`, `mission.ts:189`, เรียกที่ `:460`) แต่ designer เล็งที่ดวงอาทิตย์เฉลี่ย (`raanForLocalTime`, `kepler.ts:291`) ซึ่ง `satellite-launch.ts:40–56` บันทึกไว้ และ `tests/d06-satellite-launch.test.ts` วัดได้ 10.5 นาทีในวันที่ 1 ต.ค. โหนดที่บินได้จึงคลาด −2.77°/−2.83° สำหรับ NAPA-2/THEOS-2 (สูงสุดราว 16 นาที หรือ 4°) และดาวเทียมไทยเป็นเนื้อหาสอนหลัก แบบที่ไปถึงช้ากว่า LTAN ของตัวเอง 10 นาทีจะดูเหมือนฟิสิกส์ผิด
- **ไฟล์:** `src/physics/mission.ts` (`raanFromLtan`) โดยใช้นิยามดวงอาทิตย์เฉลี่ยจากแหล่งเดียวร่วมกับ `src/orbit/kepler.ts:291` (O), `src/design/satellite-launch.ts` (B), ไฟล์ hand-off/mission ของ R3.1 ที่ส่งแล้ว (S เป็นเจ้าของ schema), `tests/d06-satellite-launch.test.ts` และแถว SSO ของ fleet
- **เกณฑ์รับ:** ใช้ convention เดียว คือดวงอาทิตย์เฉลี่ยตามที่ผู้ปฏิบัติการใช้ (RA:(c)#3) · designer กับ Launch ตรงกันภายใน tolerance เชิงตัวเลขในกรณี NAPA-2/THEOS-2 · มีการย้ายข้อมูลแบบตรวจทานสำหรับ launch window, recording และค่าคาดหวังของบทเรียน · ไฟล์เก่าคงความหมาย "ดวงอาทิตย์จริง" ผ่านแท็ก convention (field LTAN แบบไม่บังคับที่ 028 เพิ่มเอง เพราะ R3.1 ที่ส่งแล้วไม่มี field นี้) โดยไม่เขียนทับ (กฎ R1.1)
- **วิธีพิสูจน์:** ขอบเขตตรึงก่อนรัน: โหนดอยู่ภายใน 0.3° ของแบบโดยไม่มี offset ของ equation of time · LTAN ที่ตีพิมพ์ของ Landsat 8/9 และ Sentinel-2 (แปลง LTDN เป็น LTAN) ใช้ยืนยัน convention · THEOS-2 เป็น held-out ไม่ใช้ตอนเลือก convention แต่ตรวจหลังตัดสินแล้ว (การเทียบ designer กับ Launch เป็นความสอดคล้องภายใน ไม่ใช่การ fit) · วัดทุกแถว SSO ของ fleet ทั้งสองโมเดลการบิน และแถวที่ขยับ re-record ตามชื่อ

##### M-PHYSICS-022 — คำตอบระยะยาวของ Launch สอดคล้องกับแบบจำลองอายุวงโคจร โดยไม่เปลี่ยนค่าเริ่มต้นของ ascent
- **เรื่องและเหตุผล:** เหนือราว 86–100 km Launch ใช้ตาราง exponential ของ Vallado (`atmosphere.ts` ไม่เปลี่ยนตั้งแต่ `404eb0c`) ส่วนเครื่องมืออายุวงโคจรและ re-entry ใช้ NRLMSISE-00 (`propagator/msis.ts`) สองเครื่องมือจึงตอบคำถาม "อยู่ได้นานแค่ไหน" ต่างกัน ข้อขัดแย้งนี้ตัดสินแล้วว่า**จะไม่เปลี่ยนค่าเริ่มต้นของ ascent** (รายการไม่ทำ DP:§7.3) แต่ส่งคำถามระยะยาวไปที่แบบจำลองอายุวงโคจรแล้วติดป้าย
- **ไฟล์:** จุดที่ inventory พบ เช่น `src/ui/result-content.ts` (U; ผ่าน I-train ถ้าแตะ `main.ts`), strings 3 ภาษาในโมดูลของเลน, `docs/{PHYSICS,VALIDATION}.md` · ไม่แตะ `src/physics/atmosphere.ts`
- **เกณฑ์รับ:** เริ่มด้วย inventory ทุกจุดที่ Launch พูดถึงการเสื่อมหรืออายุของวงโคจรที่ได้ เช่นผล `reentry` ที่ `ui/result-content.ts:161` (ส่วนปุ่มอายุวงโคจรที่ `main.ts:966` (= `7662ead:src/main.ts:993`) ใช้ P07 อยู่แล้ว) · แต่ละจุดต้องใช้ฟังก์ชันเดียวกับ Orbit/Build หรือมีป้ายชื่อแบบจำลองครบ 3 ภาษา · PHYSICS/VALIDATION ระบุโดเมนของบรรยากาศแต่ละตัว
- **วิธีพิสูจน์:** EO-PHY-1/2/3 เท่าเดิมทุกบิต (ascent ไม่ขยับ) · เทสต์ยืนยันว่าข้อความอายุหรือการเสื่อมทุกข้อความมีชื่อแบบจำลอง · ถ้าตัวเลขที่แสดงเปลี่ยน ต้องมีตารางก่อน/หลังตาม §14.6

##### M-PHYSICS-026 — `propagateKepler` สาขา e ≥ 1 ใช้ universal variable
- **เรื่องและเหตุผล:** `propagateKepler` (`orbital.ts:190–205`) กรณี e ≥ 1 หรือ a ≤ 0 ใช้โซ่ step อันดับสองทีละ 10 s ซึ่งผิดสำหรับทางหนีและทางกลับจากดวงจันทร์ ปัจจุบันยังไม่กระทบ #38 เพราะ Apollo ใช้ rk4 ของตัวเอง แต่ต้องแก้ก่อนที่งาน R8 จะพึ่งมัน
- **ไฟล์:** `src/physics/orbital.ts` เฉพาะสาขา e ≥ 1 (หลัง tail ร่วมของ M-LAUNCH-045) และเทสต์ขอบใหม่ของ `physics/orbital` (`tests/kepler-boundary.test.ts` ครอบเฉพาะ `src/orbit/kepler`)
- **เกณฑ์รับ:** เทียบ reference RK4 ความแม่นสูงแล้วต่างไม่เกิน 1 m ตลอดหลายชั่วโมง ในกรณี hyperbolic และใกล้ parabolic · สาขาวงรี bit-identical
- **วิธีพิสูจน์:** EO-PHY-1…5 และพิกเซลแผนที่ (EO-UI-1) เท่าเดิม · ใช้ตัวนับสาขา e ≥ 1 ระหว่างรัน fleet บน base ของ CO-6 เพื่อพิสูจน์ว่าไม่มีเที่ยวบินในตัวใช้สาขานี้ ถ้ามี ให้ระบุชื่อพร้อมตารางก่อน/หลัง

##### M-PHYSICS-025 — scenario ลมชั้นบนแบบ opt-in ที่มีแหล่งอ้างอิง
- **เรื่องและเหตุผล:** ลมมีเฉพาะ 0–12 km (`rigid/runtime.ts:116`: 8 m/s ทิศตะวันออก มี shear และ gust) และไม่มีใน point-mass นอก Monte Carlo ขณะที่ลมช่วง jet stream (~10–15 km) มีผลต่อ load ช่วง max-q การเพิ่มแบบ opt-in ทำให้เที่ยวบินแบบกระจายสมจริงขึ้นโดยเที่ยวบินปกติไม่เปลี่ยน
- **ไฟล์:** `src/physics/rigid/runtime.ts` (scenario ลม), `src/physics/aero.ts` (ประสานกับ fast path ของ M-LAUNCH-043), ข้อมูลลมใน `src/data/**` โดย P-D, `tests/wind.test.ts`, กรณีลมใน `tests/sixdof-fleet/**`
- **เกณฑ์รับ:** scenario อ้างแหล่งภูมิอากาศที่ P-D บันทึก tier ไว้ใน ledger ของ R4.1 · ค่าเริ่มต้นและ fingerprint ทั้งหมดไม่เปลี่ยน · ป้ายบอกว่าเป็น "สถานการณ์จากค่าเฉลี่ยภูมิอากาศ ไม่ใช่พยากรณ์"
- **วิธีพิสูจน์:** EO-PHY-1/2/5 เท่าเดิมเมื่อปิด scenario · ขอบเขตตรึงก่อนรัน: profile ที่ interpolate ตรงกับตารางของแหล่งภายในความละเอียดของตาราง · รายงานผลต่อ max-q และ qα ทั้งสองโมเดล โดยไม่อ้างว่า "ตรงเที่ยวบินจริง" เพราะไม่มีข้อมูลลมจริงของเที่ยวบิน · fast path ลมฝั่ง render ยังผูก bitwise กับฟังก์ชันฟิสิกส์

#### 14.1.1 M-PHYSICS-020: re-baseline เดียวที่ตรึงขอบเขตก่อนรัน (RA:(c)#1)

| ปริมาณ | ข้อมูลอ้างอิง | ขอบเขต (ตรึงก่อนรัน ห้ามคลาย) | หมายเหตุ |
|---|---|---|---|
| ทิศดวงอาทิตย์ของ propagator | Skyfield + DE421 บนตารางวันที่ 2000–2050 ที่ตรึงไว้ในขั้นลงทะเบียน | ≤ 0.01° | precession อธิบายได้ 0.37° ส่วนที่เหลือ (~0.08°) มาจาก series ที่ตรึง perihelion ไว้ที่ค่า J2000 (`VALIDATION.md:3369–3373`) การ precess อย่างเดียวจึงอาจไม่พอ |
| ระยะดวงอาทิตย์ | เหมือนข้างบน | ≤ 0.1 % | — |
| ขอบเงาของ `inShadow` (`forces.ts:98`) | ขอบเงาจาก Skyfield ในกรณี LEO ที่ตรึงไว้ | ≤ 2 s | ปัจจุบันคลาดได้ถึง 11 s · eclipse ของระบบพลังงานตรงกับ Skyfield ภายใน 2 s อยู่แล้ว |
| อัตราเพิ่มความเอียงของ GEO (หนึ่งปี) | ช่วงที่ตีพิมพ์ (ตรึงแหล่งไว้ในขั้นลงทะเบียน) | 0.75–0.95 °/ปี | ช่วงนี้แกว่งตามรอบ 18.6 ปีของโหนดดวงจันทร์ |
| วันในวงโคจรของทรงกลม 7 ลูก (R05/P2.5) | GCAT | ทุกลูกภายใน 25 % (เกณฑ์เดิม ปัจจุบันอยู่ที่ +1.5 ถึง −23 %) | VALIDATION §6 |
| ทิศดวงจันทร์ (of-date) | Skyfield + DE421 | ตั้งจากความแม่นที่ series ประกาศเอง และลงทะเบียนก่อนรัน | RA ไม่ได้กำหนดขอบเขตนี้ จึงต้องลงทะเบียนพร้อมขอบเขตอื่นก่อนรัน |
| อายุวงโคจรและ re-entry: M03 (66 stage, Long March 5B 4 ลำ, agencies), disposal ของ D06, D07 lifetime-altitude | GCAT และข้อมูล agency | **รายงานว่าขยับเท่าไร** เป็นตารางก่อน/หลัง เกณฑ์เดิมทุกข้อคงไว้ | ตาม "report how much lifetimes move" ของ RA |
| ต้นทุนการคำนวณ | benchmark Node median-of-5 ของ EQ-9 และเวลา job lifetime/re-entry | **ต้องวัด** · ประมาณการของ RA ("3×3 ต่อการเรียก ถือว่าน้อยเมื่อเทียบกับ MSIS") ยังเป็นสมมติฐาน | §14.6 ขั้น 8 |

- **ขั้นที่ P ทำ:**
  1. ลงทะเบียนขอบเขตก่อนรัน (docs)
  2. วัดผู้สมัคร "ดวงอาทิตย์ of-date ตัวเดียว" แบบ offline โดยไม่ merge: (ก) series ของ M&G + `precessionFromJ2000` (ข) series ของ Astronomical Almanac ใน `sunDirectionEci` (`orbital.ts:270` ซึ่ง eclipse, passes, power และภาพใช้อยู่แล้ว) พร้อมระยะจาก series เดียวกัน เลือกตัวที่ผ่านขอบเขต ถ้าไม่มีตัวใดผ่าน ให้หยุดและรายงาน ห้ามคลายขอบเขต
  3. ถ้า D-10 = port ให้ทำ PR feature ของ NRLMSIS 2.1 ก่อน ใช้มาตรฐานเดียวกับ port เดิม (ภายใน 2×10⁻⁶ ของ test case ของ distribution, VALIDATION §6) ขยายเทสต์ determinism ของ MSIS (M-PHYSICS-002 (d)) และใส่เงื่อนไข NRL ใน `NOTICE.md`
  4. PR re-baseline: ใช้ดวงอาทิตย์/ดวงจันทร์ of-date ที่เลือก, `MU_MOON`, SRP ตามผล D-41 และ thermosphere ตาม D-10 สำหรับ SRP: ถ้า D-41 = (ก) ซึ่ง S08 เสนอ ให้ `P_SUN` = `SOLAR_FLUX_1AU`/c (1361 W/m², SRP ลดลง 0.44 %) ถ้า D-41 = (ข) ให้คง `P_SUN` = 1367/c และไม่มีปัจจัยนี้ในตาราง attribution ห้ามเปลี่ยน `P_SUN` นอก PR นี้ รายงานมีตาราง attribution แยกผลทีละปัจจัยจากการรันแยก (ไม่ merge) แต่ re-record ค่าคาดหวังเพียง**ครั้งเดียว**
  5. รัน heavy ที่กระทบ (propagator, activity, reentry-agencies) และผู้ตรวจอิสระรันตัวเลขหลักซ้ำ
- **`MU_MOON` เทียบ header ของ DE440:** คงค่า 4.902800066e12 ซึ่ง Horizons/DE441 ให้ไว้ (`docs/PHYSICS.md` §13.10 "GM 4,902.800066 km³/s²") และ `lunar/ephemeris.ts:22` ใช้อยู่แล้ว โดยย้ายนิยามไปอยู่ใน `constants.ts` ให้ Apollo ได้ literal เดิมและ EO-PHY-6 เท่าเดิม ให้บันทึกค่าจาก header ของ DE440/441 (GMB และ EMRAT) ไว้ข้างกัน ถ้าต่างกันในระดับราว 10⁻⁸ ให้**บันทึกแต่ไม่ใช้** เพราะการใช้จะต้อง re-record Apollo ทั้งที่ผลน้อยมาก
- **ชุดที่คาดว่าจะขยับ (re-record ตามชื่อและเจ้าของอนุมัติ):** ค่าคาดหวังในเทสต์ propagator, activity และ reentry · digest ส่วน M03/lifetime/D07 ใน EO-ORB-1 · แถว R05/P2.5/M03 ของ VALIDATION · ค่า lifetime ของบทเรียนออกแบบ (`ui/lessons/design-key.ts:9,17` ใช้ `runLifetimeJob`) ต้องตรวจว่าไม่มีคำตอบอ้างอิงของบทเรียนใดข้ามเกณฑ์ และห้าม regrade ผลที่เก็บไว้ (S02 §02.7)
- **ชุดที่ห้ามขยับ:** EO-PHY-1…5 (การบินไม่ใช้ propagator) · EO-PHY-6 Apollo · ส่วน pass/overflight/eclipse/power/applications ของ EO-ORB-1 (ใช้ `sunDirectionEci`) · EO-XENG-1 · ถ้ามีอะไรนอกชุดที่ประกาศขยับ ให้หยุดและ bisect
- **quality guard (OR-2):** ห้ามรวม `elementsOf`/`elementsFromState` หรือสูตรอัตรา J2 (สัญญาต่างกัน) · คง `gstime` ของ SGP4 · คงจุดไกล `1.496e11` ใน `passes.ts:81,240` · ห้ามใช้ bias factor เชิงประจักษ์ · ให้คำนวณ precession ภายใน memo ที่ key ด้วย jd ตรงตัวของ EQ-9 ห้ามประมาณเป็นครั้งเดียวต่อการรัน (RA:(d)3, 6)
- **หลักฐาน:** `docs/development/reports/R4.5-model-base.md` (ขอบเขตที่ลงทะเบียน, ตาราง attribution, ก่อน/หลัง, run id, การรันซ้ำ) · **execution_authorized:** false

### 14.2 กฎค่าคงที่แหล่งเดียวเมื่อนำไปใช้

กฎทั้ง 5 ข้ออยู่ใน S02 §02.10 (RA:(b)) ตารางนี้แบ่งค่าคงที่ที่พบเป็นสองกลุ่ม: กลุ่มที่ค่าเท่ากันทุกบิตอยู่แล้ว (รวมได้ใน EQ-10 แบบ identical-output ภายใต้ M-PHYSICS-015 ทั้งหมด รวมถึงค่าที่อยู่นอกขอบเขตเดิมของ 015 ซึ่งพับเข้ามาตาม §14.7 ข้อ 1) และกลุ่มที่ต้องเปลี่ยนตัวเลข (ทำได้เฉพาะใน re-baseline ของ R4.5) บรรทัดทั้งหมดตรวจบน `da67341` และไม่เปลี่ยนถึง `7662ead` ยกเว้น `ui/home.ts` (`:55` → `:57`)

| ค่าคงที่ / ตำแหน่ง | ผลปัจจุบัน | ค่าอ้างอิง | EQ-10 (เท่าเดิม) / R4.5 (เปลี่ยนค่า) |
|---|---|---|---|
| `MU_SUN` = 1.32712440018e20 ที่ `propagator/forces.ts:30` และ `lunar/ephemeris.ts:24` | ไม่มี (ค่าเดียวกัน) | IAU 2015 B3 1.3271244e20 (ต่าง 1.7×10⁻¹⁰) | EQ-10: นิยามเดียว ใช้ literal เดิม (M-PHYSICS-015) |
| `G0` ที่ `atmosphere.ts:14` | ไม่มี | 9.80665 (ค่าแน่นอน) | EQ-10: import · `R_EARTH_USSA` คงไว้ในโมดูล |
| `R_MEAN` = 6371e3 ที่ `orbit/sensors.ts:32`, `orbit/overflights.ts:53` | ไม่มี | `R_EARTH_MEAN` ใน `constants.ts` (IUGG 6371.0088 km ต่าง 8.8 m ใช้ค่าเดิม) | EQ-10: import |
| `WGS84` ที่ `orbit/applications.ts:29` กับ `physics/geodesy.ts:22` | ไม่มี | NIMA TR8350.2 | EQ-10: re-export โดยคง object `WGS84` |
| `DEG = 180/π` ที่ `propagator/density.ts:44` และ `ui/home.ts:55` (`7662ead:src/ui/home.ts:57`) | ชื่อกลับด้านกับ `constants.ts` (ถ้าสลับ import จะผิด 3283 เท่า) | — | EQ-10 (M-PHYSICS-015): density.ts เปลี่ยนเป็น import `RAD` ใน PR 3 ของ EQ-10 (P) · home.ts พับเข้า 015 เป็น PR identical-output แยกของเลน I (§14.7 ข้อ 1) |
| `SIGMA` = 5.670374e-8 ที่ `physics/sim/entry-heating.ts:25`, `physics/sim/module-entry.ts:130` · `RAD` = 180/π ที่ `ui/lifetime.ts:49` | ไม่มี (`constants.ts` ยังไม่มีค่าคงที่ Stefan–Boltzmann ส่วน `RAD` มีแล้วที่ `constants.ts:28`) | CODATA 5.670374419e-8 (คงค่าปัดเดิม) | EQ-10 (M-PHYSICS-015 พับเข้าตาม §14.7 ข้อ 1): `SIGMA` ไปที่ `constants.ts` ด้วย literal เดิมใน PR 3 (P) · `ui/lifetime.ts` import `RAD` ใน PR แยกของเลนเจ้าของไฟล์ |
| `far = 1.496e11` ที่ `orbit/passes.ts:81,240` | parallax 8.8″ ถ้าใช้ AU แท้จะต่างราว 10⁻⁴″ | AU (IAU 2012) = 1.495978707e11 | EQ-10 (M-PHYSICS-015 พับเข้าตาม §14.7 ข้อ 1): ตั้งชื่อเฉพาะที่ `SUN_FAR_POINT_M` ใน `passes.ts` **โดยค่าคงเดิม** และไม่ย้ายไป `constants.ts` เพื่อไม่ให้ถูกแทนด้วย AU (S02 §02.10 ข้อ 2) · ห้ามเปลี่ยนค่าใน R4.5 |
| `MU_MOON` = 4.9048695e12 (`forces.ts:31`) เทียบ 4.902800066e12 (`lunar/ephemeris.ts:22`) | ค่าเดิมสูงกว่า 0.042 % กระทบ lifetime, ทรงกลม R05, M03, disposal ของ D06 และความเอียงของ GEO | Horizons/DE441 (PHYSICS §13.10) และยืนยันกับ header DE440 | **R4.5** (020) |
| ดวงอาทิตย์สองแบบ: `sunDirectionEci` (`orbital.ts:270`, mean-of-date) และ `sunPosition` (`ephemeris-series.ts:29`, J2000) | ต่าง 0.45°, ขอบเงา SRP ≤ 11 s, ดวงจันทร์คลาด frame 0.37° | Skyfield/DE421 | **R4.5** (020) |
| ค่าคงที่สุริยะ: ระบบพลังงานใช้ `SOLAR_FLUX_1AU = 1361` ทุกที่แล้ว (`orbit/power.ts:59` พร้อมเหตุผลที่ `:46–55`; designer ส่งค่านี้ให้ทั้ง `arrayArea` และ `solarTorque` ที่ `design/satellite-model.ts:523,565`) เทียบ SRP ของ propagator `P_SUN = 4.56e-6` (`forces.ts:33`, = 1367/c) | ระบบพลังงานสอดคล้องกันแล้ว เหลือ SRP ที่สูงกว่า 0.44 % (`VALIDATION.md:3405` "met; recorded, not changed") | IAU 2015 B3 (1361 W/m²) | ระบบพลังงาน: **ไม่ต้องเปลี่ยนค่า** มีเพียงการบันทึกและแก้คอมเมนต์ 1367 ใน `orbit/attitude.ts:78` ใน M-ORBIT-046 (R4.3, S13 §13.5 และ §13.8) · SRP: **R4.5** ตามผล D-41 (ข้อเสนอ S08 = (ก) 1361/c; ถ้า (ข) คง 1367/c พร้อมเหตุผล) ห้ามเปลี่ยนใน EQ-10 หรือนอก R4.5 |
| ค่าเฉพาะทฤษฎี: WGS-72 ใน SGP4, r0/R* ของ US76, ค่าภายใน MSIS, GRAIL 1738.0 km, IAU 1976/1982, ω ของ SGP4 | — | — | **ไม่แทนค่าเลย** (S02 §02.10 ข้อ 2) |

หลัง R4.5 literal-guard test (EQ-10, RA:(b) ข้อ 5) ต้องมีรายการ `MU_MOON` เพิ่ม และ `SOLAR_FLUX_1AU`/`P_SUN` ตามผล D-41 ถ้ามีนิยามที่สองโผล่มา เทสต์ต้องล้ม (พิสูจน์ด้วย sabotage)

### 14.3 RA Phase 2 (#1–#9) กับรายการและบ้าน

RA เดิมวาง #1 และ #3 ไว้ใน R4.3 แต่ v2.0 ย้ายมาไว้ใน R4.5 เพื่อแยก re-baseline ของฐานแบบจำลองออกจากงานรายยาน (S13) ทุกข้อใช้โปรโตคอล §14.6 และไม่ใช้ข้อมูล held-out ในการ fit ตัวเลขต้นทุนในตารางเป็นการประเมินของ RA ซึ่งยัง**ต้องวัด**

| RA:(c) # | การเปลี่ยน | ต้นทุนตาม RA | ขอบเขตที่ตรึงก่อนรัน | รายการ / แพ็กเกจ / ส่วน |
|---|---|---|---|---|
| 1 | ดวงอาทิตย์/ดวงจันทร์ of-date + `MU_MOON` (+ D-41, D-10) ใน re-baseline เดียว | คูณ 3×3 ต่อการเรียก | §14.1.1 | M-PHYSICS-020 / R4.5 / S14 |
| 2 | throttle bucket ที่เริ่มตาม q ราย variant พร้อมแหล่ง | 0 | fit ด้วย CRS-16, Iridium-8, GPS III · held out SSO-A, Bangabandhu-1 · Max-Q ±10 %/3 s · ไม่มีแถว T+60 แย่ลง · สองโมเดล | M-PHYSICS-052 / R4.2 / S13 |
| 3 | LTAN อิงดวงอาทิตย์เฉลี่ย | 0 | ดูแถว 028 ใน §14.1 | M-PHYSICS-028 / R4.5 / S14 |
| 4 | placard ของ fairing ที่ 3σ | 0 | เวลาทิ้ง fairing ที่ตีพิมพ์ของ Atlas V และ Falcon Heavy (held out) | M-PHYSICS-045 / R4.2 / S13 |
| 5 | วัดก่อน: J2 ใน coast ของ point-mass และ MSIS สำหรับ drag ช่วงวงโคจรของการบิน | J2 secular ราคาถูก, MSIS ที่ step 30 s รับได้ | ใช้เมื่อความหนาแน่นต่างเกิน 15 % (ECSS, 150–400 km) หรือพิสูจน์ได้ว่า perigee/RAAN ของ GTO คลาดเพราะเรื่องนี้ | M-PHYSICS-023 (R4.2, D-51, S13 §13.7) และ M-PHYSICS-022 (R4.5: ไม่เปลี่ยนค่าเริ่มต้นของ ascent แต่ติดป้าย) |
| 6 | ISS ที่ epoch คงที่จาก SGP4 แปลง TEME → ECI-of-date + drag ทั้งสองลำ | เล็ก | เวลา contact ±8/±20 นาที · DV1–DV3 ตรงกับโปรไฟล์ที่บินจริง | M-ORBIT-025 / R5.2 / S15 |
| 7 | contact dynamics ด้วย sub-step เฉพาะใกล้จุดสัมผัส | จำกัดเฉพาะที่ | โมเมนตัมและพลังงานอนุรักษ์ในกรณีแยกเดี่ยว · refinement 0.01 m / 0.001 m/s · เชื้อเพลิงศูนย์ = ล้มเหลว | M-ORBIT-026 / R5.3 / S15 |
| 8 | interpolate ภาพระหว่าง held coast ของ six-DOF (เฉพาะภาพ) | 0 | digest ฟิสิกส์ไม่เปลี่ยน | M-PLAN-015 / R2.1r / S11 |
| 9 | สนามโน้มถ่วงดวงจันทร์ดีกรีสูง (mascons) ภายใน SOI | trade-off จริง จึง**ปิดเป็นค่าเริ่มต้น** | วิวัฒนาการวงโคจรดวงจันทร์ของ Apollo 11 | M-ORBIT-032 / R8.2 / S15 |

### 14.4 R4.6 — ความเที่ยงตรงของเครื่องมือ Orbit (เลน O + P)

#### R4.6 — Lambert ที่ซื่อตรง, SSO อันดับสอง, Cowell แบบเลือกได้, ความแม่นของ re-entry และ finite burn
- **เลน:** O (ทำทีละ PR) โดย P ตรวจทุก PR ที่เปลี่ยนตัวเลขฟิสิกส์ · T เป็นเจ้าของ runner ของ FX-4 · strings อยู่ในโมดูลของเลน (หลัง EQ-6) · I-train เมื่อแตะ hotspot
- **คลื่น:** K4–K5 (ช่วงเดียวกับ S05 §05.3 และ `packages.tsv`) ลำดับคือ M-ORBIT-020 → 019 → 023 (หลัง M-PHYSICS-020) → 022 ใน K4 แล้วจึง M-ORBIT-021 ใน **K5 ขึ้นไป** หลัง R5.2 merge (R5.2 อยู่ K5 ในเลน P ซึ่งทำทีละ PR ถ้า R5.2 merge ช่วงปลาย K5 021 จะเลื่อนเข้า K6 ได้โดยไม่บล็อกงานใด และบันทึกในการประเมินใหม่ที่ GK ตาม S05 §05.11) **ประมาณการ (หยาบ):** 32 agent-days, 11 PR (PR 1–8 และ 11 ใน K4, PR 9–10 ของ 021 ใน K5 ขึ้นไป) **OR:** OR-2, OR-3, OR-6
- **ขึ้นกับ:** R0.4 (EO-ORB-1), FX-3 (M-ORBIT-002 แก้ repeat grid ใน `playground-model.ts` ไฟล์เดียวกัน) และ FX-4 (runner) ตาม D-63 · EQ-4 (M-ORBIT-012) และ EQ-5 (sky-panel, reentry job) ต้องมาก่อนงานความสมจริงบนไฟล์เดียวกัน · EQ-9 · R4.5 (020) · D-10 · R5.2 (021)
- **ไฟล์ที่อนุญาต:** O: `src/orbit/{kepler,maneuvers,playground-model,reentry,lifetime-altitude}.ts`, job/worker ใหม่ของตัวเลือก Cowell (ผ่าน runner ของ FX-4), `src/ui/orbit/**` (`playground.ts` เปลี่ยนแล้วใน #77 และ #80 ต้องตรวจบรรทัดซ้ำบน SHA ของ Day 0) · เทสต์: `tests/orbit/**` · เอกสาร: `docs/VALIDATION.md` (P เป็นผู้เขียน)
- **fold (`folds.tsv`):** M-PHYSICS-010 (EQ-9) ต้องมาก่อน M-ORBIT-022/023
- **ชนิดการเปลี่ยนต่อ PR (ลำดับ):** (1) quality-improving: นำ harness Lambert 120 กรณีเข้า `tests/` (2) realism-changing: 020 แก้หรือจัดประเภท (3) quality-improving: ข้อความ UI ของ 020 (4) docs: ลงทะเบียนขอบเขตของ 019 (5) realism-changing: ตัวหาของ 019 (6) quality-improving: ป้ายแบบจำลองใน playground (7) realism-changing: รายงานและป้ายของ 023 (8) feature: 022 (9–10) feature: 021 finite burn และเป้านอกระนาบ (11) สำรองไว้สำหรับผล D-10 = port

| รหัส | ที่มาเดิม | P / ขนาด / สถานะ | ชนิด PR | ขึ้นกับ |
|---|---|---|---|---|
| M-ORBIT-020 | OD:§7.4 / AUDIT0929 proposals | P2 / M (~4 วัน) / เปิด | quality-improving (เทสต์) → realism-changing → quality-improving (ข้อความ) | ลำดับในเลน O หลัง FX-3 |
| M-ORBIT-019 | DP:PHY-QW5, DP:section-1.5 (ส่วน J2 อันดับสอง), OD:Orbit limits (ส่วน J2 อันดับหนึ่ง) | P2 / M (~4 วัน) / เปิด | docs → realism-changing → quality-improving (ป้าย) | FX-3 (M-ORBIT-002), EQ-4 (M-ORBIT-012) |
| M-ORBIT-022 | DP:PHY-PH17/18/19 (ส่วน PH19) | P3 / L (~8 วัน) / เปิด | feature (opt-in) | EQ-9 (fold), FX-4; แนะนำหลัง 020 และ D-10 |
| M-ORBIT-023 | OD:M03/R05 limits, RM:M03 (note), DP:13-09 (ส่วนใบอนุญาต NRLMSIS) | P2 / L (~8 วัน) / เปิด | realism-changing (รายงาน + ป้าย) | D-10, M-PHYSICS-020, EQ-9 (fold), FX-4/EQ-5 |
| M-ORBIT-021 | DP:PHY-PH06, OD:Orbit limits (ส่วน impulsive), RM:O02 (note) | P3 / L (~8 วัน) / เปิด | feature (opt-in) ×2 | R5.2 (M-ORBIT-025, S15), M-ORBIT-020 |

##### M-ORBIT-020 — Lambert: ทุกกรณีขอบได้คำตอบที่ตรวจแล้ว หรือได้เหตุผลว่าทำไมไม่มี
- **เรื่องและเหตุผล:** `lambert` (`maneuvers.ts:516`) มีกรณีขอบ 120 กรณี คืนค่าและตรวจแล้ว 72 กรณี (สูงสุด 0.26 m / 0.2 mm/s) แต่อีก 48 กรณีคืน null โดยไม่มีหลักฐานว่าไม่มีคำตอบ (`docs/audit-2026-09-29/audit-2026-09-29/solver-boundary-summary.json`) ผู้ใช้จึงอาจเข้าใจว่าการโอนวงโคจรที่ทำได้เป็นไปไม่ได้
- **ไฟล์:** `src/orbit/maneuvers.ts`, ข้อความใน `src/ui/orbit/**` (3 ภาษา), harness ใหม่ใน `tests/orbit/**` ที่**คัดลอก**จาก packet audit (packet ห้ามย้าย ตาม S19 App D)
- **เกณฑ์รับ:** ทั้ง 120 กรณีได้คำตอบที่ตรวจด้วยการ propagate (1 m / 1 mm/s เท่าเดิม) หรือได้รับการจัดประเภทพร้อมเหตุผล เช่นต่ำกว่าเวลาพลังงานต่ำสุด หรือระนาบ 180° ที่ singular · ข้อความ UI แยก "วิธีนี้หาคำตอบไม่พบ" ออกจาก "เป็นไปไม่ได้"
- **วิธีพิสูจน์:** 72 คำตอบเดิมเท่าเดิมด้วย `Object.is` ในเส้นทางโค้ดที่ไม่เปลี่ยน และอยู่ใน tolerance เดิม · ห้ามคลาย tolerance · harness ล้มเมื่อ sabotage

##### M-ORBIT-019 — J2 อันดับสองในตัวหา repeat/SSO ของ playground เท่านั้น
- **เรื่องและเหตุผล:** `src/orbit/kepler.ts` ใช้ mean ของ Brouwer/Kozai อันดับหนึ่งเท่านั้น และ IS รายงานว่าความเอียง SSO ที่ออกแบบต่ำไป 0.02–0.08°
- **ไฟล์:** ฟังก์ชันใหม่ใน `src/orbit/` ที่ `repeatOrbit` (`kepler.ts`) และ `repeatGroundTrack` (`playground-model.ts:159`) เรียกใช้, ป้ายใน `src/ui/orbit/playground.ts` (ไฟล์นี้เปลี่ยนแล้วใน #77 และ #80 ต้องตรวจบรรทัดซ้ำบน SHA ของ Day 0) · **ไม่แตะ** `src/physics/orbital.ts` เพราะ `sunSyncInclination` (`:334`) ถูกใช้โดย Launch (`mission.ts:443`), designer (`satellite-model.ts:232`, `satellite-handoff.ts:53`), `presets.ts:25` และ `lifetime-altitude.ts:99`
- **เกณฑ์รับ:** Landsat 8 และ Sentinel-2 ต่างจากความเอียงที่ตีพิมพ์ไม่เกิน 0.01° · ทำซ้ำ Vallado Example 11-2 ได้ · อัตราโหนด 30 วันต่างจาก Cowell ไม่เกิน 0.5 % · UI ระบุชื่อแบบจำลอง · บันทึกค่าที่แสดงเปลี่ยนใน validation note
- **วิธีพิสูจน์:** ขอบเขตข้างบนลงทะเบียนก่อนรัน · เทสต์ playground เดิมผ่านโดยไม่คลาย ค่าที่ต้องเปลี่ยนมีตารางก่อน/หลังและเจ้าของอนุมัติ · EO-PHY-1…5 และ EO-PHY-4 เท่าเดิม

##### M-ORBIT-022 — Cowell แบบเลือกได้ใน Orbit Engineer
- **เรื่องและเหตุผล:** playground มีเพียง Kepler + J2 อันดับหนึ่ง ทั้งที่ Cowell มีอยู่แล้วสำหรับงานอายุวงโคจร ผู้เรียนระดับ Engineer จึงไม่เห็นผลของ drag, J2–J4, ดวงอาทิตย์, ดวงจันทร์ และ SRP บนวงโคจรของตัวเอง
- **ไฟล์:** job/worker ใหม่ใน `src/orbit/` ผ่าน runner ของ FX-4 (T เป็นเจ้าของ runner), สวิตช์ใน `src/ui/orbit/**` · propagator ใช้ตัวเดิม ไม่ทำสำเนา
- **เกณฑ์รับ:** สวิตช์ "เชิงตัวเลข (drag, J2–J4, ดวงอาทิตย์, ดวงจันทร์, SRP)" รันใน worker พร้อมความคืบหน้าและปุ่ม Stop · แสดงความต่างจาก Kepler พร้อมชื่อแบบจำลอง · ค่าเริ่มต้นไม่เปลี่ยน
- **วิธีพิสูจน์:** ผ่านเทสต์ของ propagator (ฟังก์ชันเดียวกัน) · มุมมองเริ่มต้นเท่าเดิมตาม EO-UI-1/EO-UI-3 · ไม่มี main-thread stall (long task ต้องวัด) · ควร merge หลังขั้น re-baseline ของ 020 และ D-10 เพื่อไม่เปิดหน้าใหม่ที่ยังใช้ดวงอาทิตย์ J2000

##### M-ORBIT-023 — ความแม่นของ re-entry และอายุวงโคจร ในการรันร่วมกับ 020
- **เรื่องและเหตุผล:** ยังไม่ผ่านเกณฑ์ที่ตั้งไว้: จาก element set แรกอยู่ในหน้าต่าง 33/66 · แบบ B สองชุดได้ 79 % ที่ 5 วัน เทียบเกณฑ์ 80 % (ที่ 10 และ 30 วันผ่าน: 85 %, 81 %) · ทรงกลม 6 ใน 7 ลงเร็วไป 8–23 % (เฉลี่ย −16 %) ผู้ใช้จึงควรเห็นว่าวันกลับเข้าบรรยากาศคลาดได้เท่าไร
- **ไฟล์:** `src/orbit/{reentry,lifetime-altitude}.ts`, ป้ายใน `src/ui/orbit/sky-panel.ts` และ `src/ui/lifetime.ts`, `docs/VALIDATION.md` (P), `NOTICE.md` (ถ้า port)
- **เกณฑ์รับ:** เจ้าของบันทึก D-10 · รัน VALIDATION R05/M03 ใหม่**ด้วยเกณฑ์เดิม** โดยใช้การรันเดียวกับ 020 และรายงานก่อน/หลัง · ถ้าเลือก "คงโมเดล" ให้แสดง bias −16 % ที่ตัวเลข ถ้าเลือก "port" ให้ใส่เงื่อนไข NRL ใน NOTICE · เขียนอธิบายการจัดการ Kp ราย 3 ชั่วโมงช่วงพายุ
- **วิธีพิสูจน์:** เกณฑ์ 80 % ตรึงไว้ตั้งแต่ก่อนการรันเดิมและไม่คลาย · ห้ามใช้ bias factor เชิงประจักษ์และห้ามจูนให้ตรงกรณีเดียว · ผลที่พลาดรายงานเป็นข้อค้นพบ

##### M-ORBIT-021 — finite burn และเป้านอกระนาบใน planner
- **เรื่องและเหตุผล:** planner มีแต่ burn แบบ impulsive และเป้านัดพบอยู่ในระนาบเดียวกับ chaser เสมอ (IS, Known limitations) จึงไม่เห็น gravity loss ของเครื่องยนต์แรงขับต่ำ
- **ไฟล์:** `src/orbit/maneuvers.ts` และ `src/ui/orbit/**` โดยใช้ solver finite transfer ของ R5.2 ซ้ำ ไม่เขียนตัวที่สอง
- **เกณฑ์รับ:** constant-thrust arc รอบจุด impulsive พร้อม coast แบบ J2 · แสดง gravity loss ข้างแผน impulsive · งบเชื้อเพลิงของ O03 ใช้ arc เมื่อผู้ใช้เลือก · รองรับเป้านอกระนาบ
- **วิธีพิสูจน์:** ขอบเขตตรึงก่อนรัน: Robbins 1966 ภายใน 10 % และ Curtis §6.10 GTO→GEO ภายใน 1 % ของ Δv · ค่าเริ่มต้น impulsive และบทเรียนที่ให้คะแนนมันต้อง byte-identical (EO-ORB-1 และเทสต์ maneuvers) · เริ่มได้หลัง R5.2 merge เท่านั้น จึงอยู่ K5 ขึ้นไป (ไม่เริ่มใน K4 แม้เลน O จะว่าง)

- **quality guard (OR-2):** planner แบบ impulsive, ค่าเริ่มต้นแบบ Kepler และผลของ Apollo C01 ต้องคงเดิมทุกบิต (EO-PHY-6, EO-ORB-1 ส่วนเฟส Apollo และเทสต์ maneuvers) เว้นแต่มีการ re-record ที่ผ่าน validation และเจ้าของอนุมัติตาม §14.6 · ตัวเลือกใหม่ทุกตัวต้องเป็น opt-in มีป้าย และรันใน worker เท่านั้น · กฎ CelesTrak (ไม่เกินครั้งละ 2 ชั่วโมง) ไม่เปลี่ยน
- **ความสอดคล้อง (ช่องว่างที่ต้องรู้):** หลัง 019 ความเอียง SSO ของ playground (อันดับสอง) จะต่างจากของ designer และ Launch (อันดับหนึ่ง) 0.02–0.08° ป้ายแบบจำลองจึงจำเป็น ส่วนการขยายไปยัง designer/Launch จะทำให้ EO-PHY-4 และแถว SSO ของ fleet ขยับ ไม่อยู่ในแผนนี้ (§14.7)
- **หลักฐาน:** `docs/development/reports/R4.6-orbit-tools.md` · **execution_authorized:** false

### 14.5 R4.7 — ภาพที่ผูกกับสถานะฟิสิกส์ และงบ asset ราย phase (C/P-R + P)

#### R4.7 — ตรวจ render เทียบสถานะทางฟิสิกส์ (M-PLAN-016, ที่มา PC:(c)9)
- **เลน:** C (render) และ P-R (ภาพยาน/สถานี) · P ตรวจว่าค่าที่ภาพอ่านมาจาก frame ที่บันทึกไว้ · T เป็นผู้แก้ `budgets.json` · I สำหรับ hook ใน `main.ts`
- **คลื่น:** K4 **ประมาณการ (หยาบ):** 4 agent-days, 1 PR สำหรับการตรวจ ส่วนการแก้ที่พบจะเป็น PR แยกในแพ็กเกจเจ้าของ **OR:** OR-2, OR-3, OR-6
- **ขึ้นกับ:** EQ-2/EQ-3 (เทียบภาพก่อน/หลังบน base ที่ cache แล้ว) · R3.0 (งบ context) · FX-8 · M-PLAN-018 (EO-UI-1/2) · M-PLAN-020 (กลุ่ม texture/asset) · CO-1 (แยกเพดาน code กับ data) · D-38, D-50 · R4.5 สำหรับข้อแสงและ terminator
- **ปลดล็อก:** งบ asset ของ R5.4 และ R6.2 (S15) · หลักฐานของ G6
- **ไฟล์ที่อนุญาต:** `src/render/**` · `docs/development/reports/R4.7-render-fidelity.md` · `budgets.json` (T) · probe ใน `tests/browser/**` (Q)
- **ชนิดการเปลี่ยนต่อ PR:** (1) docs: รายงานการตรวจและข้อเสนองบ (2) T, quality-improving: กลุ่ม asset ใน budget tooling (ไม่ขึ้นเพดาน) (3+) แต่ละช่องว่างที่พบเป็น PR quality-improving หรือ realism-changing ฝั่งภาพ ในแพ็กเกจเจ้าของ ทุก PR ต้องผ่านการตรวจพิกเซลโดยเจ้าของ (EO-UI-1 ก่อน/หลังที่ตั้งใจให้ต่าง) และวัด `measure.mjs --compare` แล้วไม่ถดถอยใน KPI-04/05/06/10

**เกณฑ์ "Rendering fidelity" ของ PLAN:§8.3 (คำต่อคำ):** "Rendering fidelity: orientation/scales/staging/port contact/ground datum ตรง physical state; camera motion ไม่ใช้ปลอมท่าทางยาน" · v2.0 เพิ่ม plume เทียบความดันบรรยากาศ และแสง/terminator เทียบทิศดวงอาทิตย์ของฟิสิกส์ (บ้านของเกณฑ์ข้ามโมเดลทั้งชุดคือ S13 §13.2.3)

| ด้าน | สถานะฟิสิกส์ที่ภาพต้องตาม | ภาพปัจจุบัน (`da67341`; `src/render/**` ไม่เปลี่ยนถึง `7662ead`) | สิ่งที่ตรวจ | ส่งต่อ |
|---|---|---|---|---|
| plume เทียบความดันบรรยากาศ | `frame.pressure` และระดับเครื่องยนต์ที่เกิดจริง | `plume.ts` คำนวณรูปทรงใน vertex shader จากความดันบรรยากาศ (`:7`, `:207–221`) · `rocket.ts` ใช้ `frame.pressure` และ `sf.effectiveThrottle ?? frame.throttle` (ระดับจริง ไม่ใช่คำสั่ง guidance) · `debris.ts:358` ใช้ความดันของวัตถุเอง · `twilight-plume.ts:65` ให้รัศมีตามความสูง | live, replay และ six-DOF ใช้ frame เดียวกัน · ขั้น 81 % ของ Soyuz ที่ T+112 s มองเห็นได้สอดคล้องกับ HUD · motor แข็ง | CO-4 (M-LAUNCH-004), R4.2 (M-PHYSICS-052) |
| แสงและ terminator | ทิศดวงอาทิตย์ | `main.ts:2106` (= `7662ead:src/main.ts:2318`) (= `5f9aa2e:src/main.ts:2320`) และ `orbit-view.ts:474` ใช้ `sunDirectionEci` (mean-of-date เหมือนเครื่องมือ Orbit) · `sky.ts:108` `sunlitAt` | หลัง R4.5 เวลาเข้า/ออกเงาที่เห็นในภาพต้องตรงกับ `inShadow` และ eclipse ของระบบพลังงาน (เงาแบบทรงกระบอก ไม่มี penumbra เป็นข้อจำกัดที่ต้องมีป้าย) | R4.5 |
| ชิ้นส่วนที่แยกออก | สถานะที่บันทึกของ debris | `debris.ts` ขับด้วย `frame.debris` แต่อัตราหมุนคำนวณจาก hash ของ id (เป็นภาพประมาณ) · `vostok-debris.ts` ใช้การบิน rigid ของตัวเอง | ตำแหน่งและเวลาต้องมาจาก frame และ `SimEvent` ไม่ใช่ animation ที่เขียนตายตัว · ส่วนที่เป็นภาพประมาณต้องระบุไว้ในเอกสาร | — |
| ทิศทาง ขนาด และ datum | quaternion จาก frame, มิติจาก `VehicleSpec`, ความสูงบนพื้น | `rocket.ts` · `datum.ts` วาด Vostok-1 บนความสูง WGS-84 โดย "only the picture moves" | กล้องไม่ปลอมท่าทางยาน (CameraPolicy) · มิติ 3 มิติตรงกับ spec · datum สอดคล้องกับการแสดงผล WGS-84 ของ M-PHYSICS-024 | R3.2r (M-LAUNCH-076), R4.2 (024) |
| การสัมผัสที่ port · held coast | — | — | ไม่ตรวจซ้ำในนี้ | R5.4 (M-ORBIT-027, S15) · M-PLAN-015 (S11) |

**งบ asset ราย phase (ภายใต้ D-50 และกติกา S04 §04.3):** ปัจจุบันยานและสถานีทั้งหมดวาดแบบ procedural (ไม่มี GLTF หรือ `.glb` ใน `src` หรือ `public` และมี `TextureLoader` ตัวเดียวที่ `scene.ts:1021`) เพดาน precache คือ 16,103 kB (ตั้งใน #76 `1d5b76b` และคงเดิมถึง `7662ead`) และ CO-1 จะแยกเพดาน code กับ data

| Phase | สิ่งที่อาจเพิ่ม | อยู่ใน install เริ่มต้นหรือไม่ | กติกา |
|---|---|---|---|
| R3 (preview ของ Build) | SVG ก่อน · 3 มิติหลัง R3.0/EQ-2 | ไม่เพิ่ม texture ใหม่ | 0 ไบต์ใหม่ใน precache เริ่มต้น · ถ้ามีแบบ 3 มิติภายหลังให้เข้าชุดของ D-50 |
| R5 (ISS, port, Progress/Dragon หลัง G5) | แบบจำลองหรือ texture ของสถานีและยาน | ไม่ (ชุดเสริมตาม D-50 (ก)) | กำหนดงบที่ขนาดที่วัดได้เมื่อ asset แรกเข้ามา และหลังจากนั้น ratchet ลงเท่านั้น |
| R6 (ห้องนักบิน, เครื่องวัด, เสียง) | แบบจำลองและเสียง | ไม่ (รูปแบบเดียวกับเพลงของ DEC:D-7 ใช้ที่เก็บเสียงของ R1.6, M-PLATFORM-012) | เหมือน R5 · zip สำหรับ intranet (`ORBITLAB_PRECACHE_AUDIO=1`) ต้อง precache ชุดเสริมไว้ และรายงานขนาดทุก release |

- ต้องมีปุ่ม "ดาวน์โหลดไว้ใช้ออฟไลน์" และสถานะที่มองเห็นได้ · ห้ามแทนด้วยแบบ low-poly อย่างเงียบ ๆ · asset ใดที่เข้า precache เริ่มต้นต้องมี offset ตาม D-38 (KPI-30) · ต้องเคารพงบ context ≤ 2 (KPI-07, R3.0)
- **หลักฐาน:** รายงาน R4.7 (ตารางข้างบนพร้อมคำตัดสิน "ตรง / ช่องว่าง / ไม่ทราบ" ต่อแถว), ภาพก่อน/หลัง และผล `--compare` · **execution_authorized:** false

### 14.6 โปรโตคอล validation สำหรับงานความสมจริงทุกชิ้น (S13, S14 และ S15 ใช้ร่วมกัน)

ใช้กับทุก PR ชนิด realism-changing และทุก PR ชนิด feature ที่เพิ่มแบบจำลองให้เลือก PR ความสมจริงต้องไม่รวมกับ PR identical-output (S18 §18.5) ขั้นตอนพิสูจน์ของ identical-output อยู่ใน S18 §18.9 และ S07

1. **ลงทะเบียนก่อนรัน (pre-registration):** commit ส่วน "ขอบเขตที่ตรึงก่อนรัน" ในรายงานของแพ็กเกจ (`docs/development/reports/<package>.md`) ใน PR docs แรกหรือใน commit แรกก่อนมีผล แล้วอ้าง SHA ของ commit นั้นในผล ฟิลด์ที่ต้องมี:

| ฟิลด์ | เนื้อหา |
|---|---|
| base | SHA ที่ CO-6 (heavy + fleet) เขียว และ oracle `EO-*` ที่บันทึกบน base นั้น |
| ข้อมูลอ้างอิง | แหล่ง, เวอร์ชัน, hash, สคริปต์สร้าง fixture และ tier ของแหล่ง (ledger ของ R4.1) |
| ปริมาณและขอบเขต | tolerance มาจากความไม่แน่นอนของแหล่ง + การศึกษาความคลาดเชิงตัวเลข ไม่ใช้เปอร์เซ็นต์เดียวกับทุกกรณี (PLAN:§8.3) |
| ชุด fit / ชุด held-out | ระบุชื่อทุกกรณี และห้ามเปิดดู held-out จนกว่าการ fit จะตรึงแล้ว |
| ชุดที่คาดว่าจะขยับ / ห้ามขยับ | รายชื่อเทสต์และ oracle |
| โมเดลการบิน | point-mass และ six-DOF เมื่อการเปลี่ยนกระทบการบิน |
| ต้นทุน | KPI หรือ benchmark ที่จะใช้เทียบ (KPI-11 สำหรับการบิน, เวลาของ job สำหรับ propagator) |
| ผู้ตรวจ | ผู้ตรวจวิทยาศาสตร์อิสระตาม D-55 ซึ่งต้องไม่ใช่คนที่ fit |

2. **รันบน source ที่ตรึง:** หนึ่งชุดหลักฐานต่อหนึ่ง SHA (VER:) · heavy ที่กระทบ + แถว fleet รายยานต่อ PR และ fleet เต็มต่อ candidate ของคลื่น (S18 §18.8) · ห้ามมี PR EQ-ฟิสิกส์เปิดพร้อมกันในหน้าต่าง re-baseline (S05 §05.7)
3. **ตารางก่อน/หลัง:** ครบทั้งสองโมเดลการบินเมื่อกระทบการบิน · ข้าม engine ใช้ tolerance ของ T02 (1.4e-12 s, 1.4e-11 m/s; EO-XENG-1) และ**ห้ามคลาย**
4. **held-out:** รันครั้งเดียวหลังการ fit ตรึงแล้ว ถ้าพลาด ให้บันทึกเป็นข้อค้นพบพร้อมป้ายที่ซื่อตรง **ห้าม fit ใหม่เพื่อให้ผ่าน** และห้ามเพิ่มปุ่มจูนหลังเห็นผล held-out (บทเรียน #64, process-lessons ข้อ 9, 10, 24)
5. **ความต่างที่เหลือตรึงด้วยชื่อ:** ทุกกรณีที่ยังพลาดต้องมีชื่อ (ยาน/กรณี/ปริมาณ/ตัวเลข) ใน VALIDATION และมีเทสต์ที่ตรึงรายชื่อนี้ไว้ รายชื่อลดลงได้อย่างเดียว ถ้าจะเพิ่มต้องให้เจ้าของอนุมัติ (แบบเดียวกับ KPI-20 "only falls")
6. **re-record ระบุชื่อ:** ตาราง เทสต์ → กรณี → ค่าเก่า → ค่าใหม่ → เหตุผล → คำอนุมัติของเจ้าของ (วันที่และข้อความ) ห้าม re-record เป็นก้อน (KPI-21 = 0) · รัน `rigid-flex-golden` ทุกครั้งที่ rigid runtime หรือ `targetAttitude` เปลี่ยน
7. **รันซ้ำโดยผู้ตรวจอิสระ (D-55):** ตัวเลขหลักต้องถูกรันซ้ำ และรายงานจำนวนข้อที่ยืนยันอิสระแล้ว (process-lessons ข้อ 11)
8. **ประสิทธิภาพ:** การเปลี่ยนความสมจริงต้องวัดแล้วไม่ถดถอยใน KPI ที่ลงทะเบียน (`--compare` หรือ Node median-of-5) ถ้าพบต้นทุน ให้รายงานเจ้าของพร้อมทางเลือกที่ไม่ลดความแม่น เช่น memo ที่ key ด้วย input ตรงตัว · ห้ามจ่ายต้นทุนด้วยการขยาย step หรือลดความถี่ของการคำนวณ (S02 §02.10 RA:(d))
9. **ป้ายและเอกสาร:** ตัวเลขที่ผู้ใช้เห็นต้องบอกชื่อแบบจำลองและ bias ที่รู้ (S02 §02.4) · แก้ PHYSICS/VALIDATION ใน PR เดียวกัน · Known limitations ของ IS แก้ผ่าน R7.5
- **กฎหยุด:** ขอบเขตใดพลาด → ห้าม merge การเปลี่ยนค่า (บันทึกเป็นข้อค้นพบ หรือวางแผนใหม่โดยเจ้าของอนุมัติ) · มีสิ่งนอกชุดที่ประกาศขยับ → หยุดและ bisect · CO-6 แดง → เลน P หยุดทั้งเลน
- **ผู้ลงนาม:** P (ผู้เขียน) → Q หรือ agent ที่สอง → ผู้ตรวจวิทยาศาสตร์อิสระ (D-55) → H อนุมัติ re-record

### 14.7 หลักฐานต่อประตู สิ่งที่ไม่ทำหรือเลื่อน และช่องว่าง

| ประตู (เกณฑ์อยู่ที่ S05 §05.4) | หลักฐานจากส่วนนี้ |
|---|---|
| GK ทุกคลื่นที่แตะ propagator, เครื่องมือ Orbit หรือ render | KPI-21 = 0, KPI-22 เขียว (เมื่อแตะฟิสิกส์), oracle ในชุด "ห้ามขยับ" เท่าเดิม |
| G6 | R4.7: งบ asset ของ R6, รายงานความเที่ยงของภาพ และ `--compare` ของ render |
| G8 | M-PHYSICS-026 (R4.5) และ R8 ใช้ §14.6 |
| G4 | R4.5–R4.7 ไม่อยู่ในเกณฑ์ G4 (S05) และไม่บล็อกการปล่อยรุ่นที่ไม่เกี่ยวข้อง แต่ใช้ §14.6 เดียวกัน |

**ลำดับดำเนินการ (ภายใต้ WIP: เลน P และ O เปิดได้เลนละ 1 PR, S18 §18.6)** ชุด Soyuz ของ R4.2 และ G4-S มาก่อนทุก PR ของ P ในตารางนี้ เพราะเป็นเส้นทางวิกฤตไปสู่ R5

| ลำดับ | PR | เลน | เริ่มได้เมื่อ | ชนิด | คลื่นที่คาด |
|---|---|---|---|---|---|
| 1 | R4.6: harness Lambert แล้ว 020 แล้วข้อความ (3 PR) | O | FX-3 merge แล้ว | quality → realism → quality | K4 |
| 2 | R4.5 ขั้น 1: ย้าย precession และตั้งชื่อ frame (มีเงื่อนไข) | P | EQ-9 และ EQ-10 merge แล้ว | identical-output | K4 (หรือปลาย K3 ถ้า P ว่าง) |
| 3 | R4.5 ขั้น 2: ลงทะเบียนขอบเขตของ 020 พร้อม fixture | P (docs) | D-41 ตอบแล้ว (GK2) | docs | K4 |
| 4 | R4.5 ขั้น 3: NRLMSIS 2.1 ที่ยังไม่เลือกใช้ | P | D-10 = port (GK3) | feature | K4 |
| 5 | R4.5 ขั้น 4: re-baseline ของ 020 | P | แถว 3–4, CO-6 เขียว, หลัง G4-S, ไม่มี PR EQ-ฟิสิกส์เปิด | realism-changing | K4 |
| 6 | R4.6: 019 (ลงทะเบียน → ตัวหา → ป้าย) | O (+P ตรวจ) | FX-3, EQ-4 | docs → realism → quality | K4 |
| 7 | R4.6: 023 รายงานและป้าย | O + P | แถว 5 (re-baseline) | realism-changing | K4 |
| 8 | R4.6: 022 Cowell แบบเลือกได้ | O | EQ-9, FX-4 และ (แนะนำ) แถว 5 | feature | K4 |
| 9 | R4.5: 028 LTAN | P + B + S | R3.1r PR1 (fixture) merge แล้ว (K3) | realism-changing | K4 |
| 10 | R4.5: 022 ป้ายแบบจำลอง | P + U | แถว 5 | quality-improving | K4 |
| 11 | R4.5: 026 universal variable | P | M-LAUNCH-045 merge แล้ว | realism-changing | K4–K5 (ก่อน R8 ใน K6) |
| 12 | R4.7: การตรวจ + กลุ่ม asset | C/P-R + T | EQ-2/3, R3.0, FX-8, M-PLAN-020, D-50 | docs → quality | K4 |
| 13 | R4.5: 025 ลม opt-in | P | EQ-10, EQ-3, ledger ของ R4.1 | feature | K4–K6 |
| 14 | R4.6: 021 (2 PR) | O + P | R5.2 merge แล้ว | feature | K5 ขึ้นไป |

**KPI ที่ส่วนนี้ต้องเฝ้า (นิยามอยู่ที่ S04):** KPI-21 = 0 และ KPI-22 เขียวในทุก PR ฟิสิกส์ · KPI-11 ต้องไม่ถดถอยเมื่อปิด scenario ของ 025 (R4.5 ส่วนอื่นไม่แตะ worker การบิน) · KPI-03/KPI-30: asset ของ R4.7 ไม่เข้า precache เริ่มต้นถ้าไม่มี offset · KPI-04/05/06/07/10: ทุก PR ภาพของ R4.7 ต้อง `--compare` แล้วไม่ถดถอย · KPI-17…20 เป็นของ R4.1–R4.4 ส่วนนี้ไม่อ้างว่าขยับมัน

- **ไม่ทำ (บ้านคือ S02 §02.13 และ S19 App C):** เปิด mascons เป็นค่าเริ่มต้น (เป็น trade-off ด้านประสิทธิภาพ ให้ใช้แบบ opt-in ใน R8.2 แทน) · bias factor เชิงประจักษ์ใน MSIS · DTM2020 (ใบอนุญาต) · เปลี่ยนบรรยากาศของ ascent เป็น MSIS หรือใช้โลกทรงรีเป็นค่าเริ่มต้นโดยไม่วัดก่อน (S13 §13.7) · เปลี่ยนค่าจุดไกลใน `passes.ts` หรือ `gstime` ของ SGP4 · รวม RK4 (M-PHYSICS-016 ถูกปฏิเสธ) · คลาย tolerance ของ Lambert · คำนวณ precession แบบประมาณครั้งเดียวต่อการรัน · แทน asset ด้วยแบบ low-poly อย่างเงียบ
- **เลื่อน:** J2 อันดับสองใน `physics/orbital.ts` สำหรับ designer และ Launch (fingerprint และ EO-PHY-4 จะขยับ ต้องมีการตัดสินแยก) · M-ORBIT-021 จนกว่า R5.2 จะ merge (K5 ขึ้นไป) · 025 ไป K5–K6 ได้ถ้าเลน P แน่น
- **ช่องว่างและผลการตัดสิน (ข้อ 1 ตัดสินแล้ว ข้อ 2–5 ยังเป็นข้อเสนอ ยังไม่มี id ให้ S19/W ตัดสิน):**
  1. **ตัดสินแล้ว: ค่าที่เท่ากันทุกบิตแต่อยู่นอกขอบเขตของ M-PHYSICS-015 ที่ S09 เขียนไว้ พับเข้า M-PHYSICS-015 (EQ-10, S09)** ไม่ออก id ใหม่ เพราะเป็นงานชนิดเดียวกับ 015 ทุกประการ คือรวมค่าคงที่ที่เท่ากันทุกบิตพร้อม literal-guard (RA:(b) ข้อ 1, 3, 5) ส่วน M-PHYSICS-027 เป็นรายการการตัดสินใจของ D-41 ซึ่งเปลี่ยนค่า จึงไม่ใช่บ้านของงาน identical-output จำนวนรายการของแผนไม่เพิ่มจากข้อนี้ และขนาด S ของ 015 คงเดิม การย้ายค่าทุกขั้นเป็นชนิด identical-output (guard test ยังเป็น PR 4 ชนิด quality-improving ตาม S09) อยู่ใน K2 ตาม EQ-10 และแยก PR ตามเลนเจ้าของไฟล์:
     - `SIGMA = 5.670374e-8` ที่ `physics/sim/entry-heating.ts:25` และ `physics/sim/module-entry.ts:130` → นิยามเดียวใน `constants.ts` ด้วย literal เดิม พร้อมคอมเมนต์แหล่ง (CODATA 2018 5.670374419e-8) และหมายเหตุว่าคงค่าปัดเดิม การเปลี่ยนเป็นค่าเต็มเป็น realism-changing และไม่อยู่ในแผนนี้ · PR: EQ-10 PR 3 (P) · oracle: EO-PHY-1, EO-PHY-5 (`vostok-replay`), `tests/entry-heating.test.ts`
     - `far = 1.496e11` ที่ `orbit/passes.ts:81,240` → ตั้งชื่อเฉพาะที่ `SUN_FAR_POINT_M` พร้อมคอมเมนต์ "จุดไกลของทิศดวงอาทิตย์ ไม่ใช่ AU ห้ามแทนค่า" และไม่ย้ายไป `constants.ts` · PR: EQ-10 PR 3 (P เขียน O ตรวจ เหมือนไฟล์ `src/orbit/**` อื่นของ 015) · oracle: EO-ORB-1 (pass ครบ 249 เหตุการณ์)
     - `DEG = 180/π` ที่ `ui/home.ts:55` (`7662ead:src/ui/home.ts:57`) → import `RAD` · PR: identical-output แยกของเลน I (เจ้าของ `src/ui/home*.ts`, S18 §18.2) ต่อจาก EQ-10 PR 3 รวมกับ PR identical-output อื่นของ I ได้ แต่ไม่รวมกับชนิดอื่น · oracle: EO-UI-3 (ข้อความ ISS ของ Home ใน TH/EN/RU)
     - `RAD = 180/π` ที่ `ui/lifetime.ts:49` → import `RAD` · PR: identical-output แยกของ O (ผู้แก้ไฟล์นี้ใน M-ORBIT-023) ก่อน PR ป้ายของ 023 · oracle: EO-UI-3 และ EO-UI-1 ของกราฟใน lifetime dialog
     - literal-guard ของ EQ-10 (PR 4) ต้องครอบคลุม `5.670374e-8` และนิพจน์ `180 / Math.PI` นอก `constants.ts` และใส่ `SUN_FAR_POINT_M` ใน allowlist ของค่าเฉพาะที่ พิสูจน์ด้วย sabotage
     - **ผลที่ส่วนอื่นต้องรับ:** S09 EQ-10 เพิ่มไฟล์ที่อนุญาต `src/physics/sim/{entry-heating,module-entry}.ts` และ `src/orbit/passes.ts` และ PR ต่อท้ายสองตัวข้างบน · **S19 ต้องลงผลนี้:** App A แถว M-PHYSICS-015 หมายเหตุ "ขอบเขตขยายตาม S14 §14.7 ข้อ 1: SIGMA, SUN_FAR_POINT_M, DEG ของ home.ts, RAD ของ lifetime.ts" และ App B5 แถว "ช่องว่าง S14 §14.7 ข้อ 1 → M-PHYSICS-015 (fold, ไม่มี id ใหม่)" · `assignment.tsv` และ `folds.tsv` ไม่ต้องแก้ (015 อยู่ใน EQ-10 และมีแถว fold แล้ว)
  2. RA:(b) ข้อ 4 (ชื่อฟังก์ชัน ephemeris บอก frame) ไม่มีบ้านใน EQ-10 จึงวางไว้ที่ R4.5 ขั้น 1 (identical-output) ให้ S09/S18 ยืนยัน
  3. ความสอดคล้องของ J2 อันดับสองระหว่าง playground, designer และ Launch ยังไม่มีรายการ
  4. RA ไม่ได้ตั้งขอบเขตทิศดวงจันทร์ จึงให้ลงทะเบียนภายใน R4.5 จากความแม่นที่ series ประกาศ
  5. ช่องว่างที่ R4.7 พบนอกเหนือจาก R5.4, R6.2 และ M-PLAN-015 จะต้องออก id ใหม่
