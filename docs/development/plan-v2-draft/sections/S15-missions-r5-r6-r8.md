## S15 ภารกิจ: R5 ISS จนถึง hard dock, R6 นักบินอวกาศ และ R8 ดวงจันทร์

> **ขอบเขต:** ส่วนนี้เป็นบ้านของ 14 รายการใน 8 แพ็กเกจ ได้แก่ R5.1–R5.4, R6.1–R6.3 และ R8 (R8.1–R8.5) ทุกแพ็กเกจเป็น `execution_authorized: false` จนกว่าเจ้าของจะสั่งเป็นรายคลื่นหรือรายแพ็กเกจ (OR-5, D-65)
> **ส่วนอื่นเป็นเจ้าของเรื่องต่อไปนี้ (ส่วนนี้อ้างถึงเท่านั้น):**
> - เกณฑ์ประตู G4-S, G5, G6 และ G8: S05 §05.4
> - KPI: S04
> - เนื้อหาการตัดสินใจ D-n: S08
> - ตาราง PLAN:§8.5 และเกณฑ์ข้ามโมเดล PLAN:§8.3: S13 §13.2.6 และ §13.2.3
> - โปรโตคอล validation: S14 §14.6
> - แคตตาล็อก oracle: S07 §07.5
> - รายการสิ่งที่ไม่ทำ: S02 §02.13
> - เลน, write set และ I-train: S18
> - ทะเบียนความเสี่ยง: S05 §05.13
>
> **as-of (ตรงกับ S00 §00.1):** ตรวจแบบอ่านอย่างเดียวถึง **2026-10-04 ~21:10Z** — main บน GitHub = `5f9aa2e` (#83 เอกสาร, merge 20:31:34Z); live = `09cc2f5` (#82; Pages 37230585947 สำเร็จ 20:29:40Z เผยแพร่ #80–#82 พร้อมกัน); ไม่มี PR เปิด; R3 ครบตามคำของเจ้าของ (2026-10-04) โค้ดของ `7662ead` ต่างจาก `5f9aa2e` เฉพาะ `src/main.ts` (+15 บรรทัดจาก #81; ส่วนนี้ไม่อ้างเลขบรรทัดของ `main.ts`) และ `tests/browser/harness.mjs` การอ้าง `7662ead` ในส่วนนี้จึงยังใช้ได้ ส่วนนี้ไม่เขียนสถานะ main, live หรือ PR ซ้ำ (ผลการตรวจหลัง as-of อยู่ใน S06 และ S08)
> **ฐานข้อเท็จจริงของส่วนนี้:** สถานะทุกรายการตรวจบน `da67341` และการอ้างบรรทัดโค้ดที่ไม่ระบุ SHA ใช้ `da67341` GitHub compare `da67341...7662ead` (อ่านอย่างเดียว, 63 ไฟล์) ไม่แตะ `src/physics/**` (รวม `rendezvous/**`, `lunar/**`, `sim/rendezvous.ts`, `sim/apollo*.ts`, `mission.ts`), `src/data/**`, `src/render/**`, `src/orbit/**` (ยกเว้น `handoff.ts` ที่ #80 เพิ่ม `origin.design`), `src/ui/{help-content,watch-missions,flown,flight-lifecycle,telemetry,telemetry-layout,rendezvous-plot}.ts`, `tests/heavy` หรือ `docs/{PHYSICS,VALIDATION,IMPLEMENTATION-STATUS}.md` บรรทัดที่อ้างในไฟล์เหล่านี้จึงยังตรงกับ `7662ead` ไฟล์ในขอบเขตนี้ที่เปลี่ยน: `src/main.ts` (+218/−6), `src/ui/panel.ts` (+91), `src/ui/orbit/playground.ts` (+21/−5), i18n ทั้งสามภาษา และ `src/ui/mission-steps.ts` (ใหม่ใน #77 `09a536e`; แถบขั้นที่ R5.1 PR2 จะเพิ่ม Docking) ส่วนนี้ไม่อ้างเลขบรรทัดของ `main.ts` หรือ `panel.ts` ทุกแพ็กเกจต้องตรวจซ้ำบน SHA ของ Day 0 หรือ merge-base ของ PR ก่อนเริ่ม แผนนี้ไม่ได้รันอะไรใหม่ ต้นทุนเวลาที่ไม่มีตัวเลขจาก PB เขียนว่า "ต้องวัด"

### 15.0 รายการที่ส่วนนี้เป็นบ้าน (14 รายการ, `assignment.tsv`)

| แพ็กเกจ | รายการ (P / ขนาด / สถานะ / ชนิด) | เลน | คลื่น | ประมาณการหยาบ (agent-days / PR) |
|---|---|---|---|---|
| R5.1 | M-ORBIT-024 (P1 / L / เปิด / feature) | I/P (U, C ผ่าน API) | K5 (เริ่มใน K4 ได้หลัง G4-S; G3 ส่งมอบแล้ว) | 8 / 3 |
| R5.2 | M-ORBIT-025 (P1 / XL / เปิด / realism) | P (+P-D ข้อมูล, S ADR) | K5 (เริ่มใน K4 ได้หลัง G4-S) | 15 / 5 |
| R5.3 | M-ORBIT-026 (P1 / XL / เปิด / realism) | P | K5 (เริ่มใน K4 ได้หลัง G4-S) | 15 / 5 |
| R5.4 | M-ORBIT-027 (P2 / L / เปิด / feature), M-LAUNCH-015 (P3 / S / เลื่อน / feature) | P-R/B + P (I) | K5 | 9.5 / 3 |
| R6.1 | M-PLAN-022 (P2 / L / เปิด / feature) | A (+P ระบบ, S schema) | K6 | 8 / 3 |
| R6.2 | M-PLAN-023 (P2 / XL / เปิด / feature) | A (+C render, I routes) | K6 | 15 / 5 |
| R6.3 | M-PLAN-024 (P2 / L / เปิด / feature) | A/Q/L-C (+H ผู้ใช้) | K6 | 8 / 3 |
| R8 | M-ORBIT-031 (P3/M/บางส่วน/realism), 032 (P3/L/บางส่วน/realism), 033 (P3/XL/บางส่วน/feature), 034 (P3/XL/บางส่วน/feature), 035 (P3/M/เปิด/feature), M-PHYSICS-018 (P3/S/เลื่อน; ledger ระบุ perf แต่จริงเป็น realism-changing) | P + O | K6 | 47.5 / 16 |

รวมทั้งส่วน: R5 47.5 วัน / 16 PR, R6 31 วัน / 11 PR และ R8 47.5 วัน / 16 PR ประมาณ 126 agent-days และ 43 PR ทุกตัวเลขเป็นค่าหยาบจาก `packages.tsv` (ราว 1 PR ต่อ 3 agent-days)

### 15.1 R5 — ภารกิจ ISS: ต่อยอดของที่มีอยู่ ไม่สร้างใหม่ (C14)

#### 15.1.1 สิ่งที่มีอยู่แล้ว (IS:G07, `docs/PHYSICS.md` §9.2)
- **ยานและโปรไฟล์:** Soyuz MS บน Soyuz-2.1a บินต่อถึงสถานีและเชื่อมต่อได้แล้ว มี 3 โปรไฟล์ ได้แก่ two-orbit (MS-28), four-orbit (TMA-19M) และ two-day (MS-01) และมี 4 port ได้แก่ Rassvet, Poisk, Prichal และ Zvezda aft
- **การนัดพบและการเข้าเทียบ:** phasing burn ใช้ค่าที่บินจริง ส่วน transfer และ braking คำนวณบน J2 coast จากนั้น Kurs บินแบบ six-DOF ผ่าน approach, flyaround และ stationkeeping จนถึง contact ส่วน Engineer มีโหมดบังคับด้วยมือที่เรียกว่า "TORU" (`src/physics/sim/rendezvous.ts`, `src/physics/rendezvous/{plan,ports,profiles,station,targeting}.ts`)
- **หลักฐานเดิม:** contact ของแบบจำลองเทียบเที่ยวบินจริง ได้แก่ 3:13:12 เทียบ 3:10:33, 6:22:24 เทียบ 6:20:59 และ 2 d 02:37 เทียบ 2 d 02:35 (`tests/heavy/rendezvous.test.ts`: `FLOWN` ±8/±8/±20 นาที ครบทุก port) นอกจากนี้ MS-16 ได้ 6:29 เทียบ 6:08:15 (±25 นาที) และ MS-25 ได้ 2 d 02:37 เทียบ 2 d 02:26:39 (±20 นาที) (`tests/heavy/historical-docking.test.ts`) ส่วนข้อจำกัดเชื้อเพลิงของ R1.4 อยู่ใน `tests/rendezvous-fuel.test.ts`
- **ข้อสรุปสำหรับ R5:** C14 ไม่ใช่ความขัดแย้งจริง PLAN:U06 ต้องการให้ภารกิจไปถึงการเชื่อมต่อจริง ซึ่ง G07 ทำได้แล้วในระดับหนึ่ง R5 จึงหมายถึง "เปิดให้เข้าถึง ทำให้ต่อเนื่อง และเพิ่มความสมจริง" ห้ามสร้างระบบ Soyuz Docking ชุดที่สอง (PLAN:§2)

#### 15.1.2 ขีดจำกัดความสมจริงวันนี้ (ตรวจบน `da67341`)

| ขีดจำกัด | หลักฐาน | แก้ใน |
|---|---|---|
| ISS เป็นวงกลมอ้างอิง 418 km ที่ phase ให้ตรงแผน (สถานีถูกจัดตำแหน่งย้อนหลังให้แผน dock ได้) | `rendezvous/station.ts:23` `altitude: 418e3` | R5.2 |
| ระนาบ ISS ทั่วไปใช้ `ISS_RAAN0 = 200°` ณ 2026-01-01 แล้วถอยด้วย J2 แบบเชิงเส้น ยกเว้นในช่วง 10 วันรอบ anchor TLE สามจุดของ C01 | `physics/mission.ts:156,165-185` | R5.2 |
| รัศมีอ้างอิงไม่ตรงกันสองค่า: 420 km ใน `ISS_A` และ `data/orbits.ts:7` แต่ 418 km ในตัวสถานี (พบระหว่างเขียน) | `mission.ts:157`, `station.ts:23` | R5.2 (เอา a, e จากสถานะอ้างอิงที่มีแหล่ง) |
| ไม่มีแรงต้านอากาศทั้งสองยาน (ISS จริงลดระดับ 50–100 m/วัน) | คอมเมนต์ใน `station.ts:11` | R5.2 |
| "hooks" เป็นตัวจับเวลา 13 นาทีหลัง capture ไม่ใช่กลไก | `profiles.ts:136` `hooks: 780`; `sim/rendezvous.ts:616` | R5.3 |
| contact เป็นการจับ pose ตาม gate: ไม่มีการแลก momentum, ไม่มี free drift และสถานีถูกล็อก attitude | PLAN:§2 แถว Contact | R5.3 |
| refinement ทั้งภารกิจ <10 m พิสูจน์ capture 0.34 m ไม่ได้ | PLAN:§8.5 (ดู S13 §13.2.6) | R5.3 |
| navigation ไม่มี error และ sensor ไม่มี latency | PLAN:§2 แถว ข้อจำกัด ISS | R5.3 |
| ใช้คำว่า TORU กับการบังคับด้วยมือของลูกเรือ Soyuz ซึ่งไม่ตรงความหมายจริง เพราะ TORU เป็นโหมดที่สถานีควบคุม Progress | `sim/rendezvous.ts:8,55`; PLAN:R5.4 | R5.4 |
| Help ยังเขียนว่า "The ISS preset targets an approximate orbital plane, not rendezvous or docking." | `ui/help-content.ts:38` (เหมือนเดิมบน `7662ead`) | R5.1 (RW:DOC-05) |

#### 15.1.3 กฎของ R5 (ใช้กับทุก PR ในหัวข้อนี้)
1. **R5 ขึ้นกับ G4-S ไม่ใช่ G4 เต็ม (PC:(c)4):** เมื่อชุด Soyuz ผ่าน G4-S แล้ว R5.1–R5.3 เริ่มได้ใน K4 ส่วน family อื่นของ R4 เดินต่อเป็น wave (S13)
2. **E ก่อน F:** EQ-9 และ EQ-10 ต้อง merge ก่อนทุก PR ของ R5.2/R5.3 ที่แตะไฟล์เดียวกัน และ EQ-11 ต้องมาก่อน R5.2 (`folds.tsv`) PR ฟิสิกส์ของ R5 ห้ามเปิดพร้อม PR ของ R4.x ในเลน P (P ทำทีละ PR; PLAN:§7 "shared runtime ไม่ทำพร้อม docking dynamics")
3. **ห้ามรวม RK4:** `rk4Step` ที่ `StationEphemeris` ใช้ กับ RK4 ของ targeting/navigation บวกพจน์ในลำดับต่างกัน (M-PHYSICS-016 ถูกปฏิเสธ, S02 §02.13 ข้อ 35) ถ้าแก้ไฟล์ `rendezvous/targeting.ts` อยู่แล้ว เพิ่มได้เฉพาะคอมเมนต์อธิบายลำดับการบวก
4. **ขอบเขตตรึงก่อนรัน:** ใช้โปรโตคอล S14 §14.6 ได้แก่ held-out, ความต่างที่ระบุชื่อ, รายงานทั้งสองโมเดล (point-mass/six-DOF ascent) และ re-record เฉพาะที่ระบุชื่อและเจ้าของอนุมัติ (KPI-21 = 0 สำหรับการ re-record ที่ไม่ตั้งใจ)
5. **ห้าม:** จัด phase ของสถานีย้อนหลังเพื่อให้ dock ได้ (PLAN:R5.2), ให้ warp/skip ข้าม failure หรือ teleport ไป dock, ทำแอนิเมชันที่แยกจากฟิสิกส์ contact และนับ orbit success แทน docking success
6. **ทุก PR มีชนิดเดียว:** แพ็กเกจหนึ่งเป็นลำดับ PR ได้ และ PR identical-output ห้ามปนกับชนิดอื่น (S18 §18.5)
7. **เอกสาร:** PR ที่เปลี่ยนความสมจริงต้องแก้ `docs/PHYSICS.md` §9.2 และ `VALIDATION.md` ใน PR เดียวกัน ส่วนย่อหน้า G07 ของ IMPLEMENTATION-STATUS แก้ใน PR เดียวกันหรือใน R7.5 (S17)

#### 15.1.4 ผลที่ต้องได้ของ R5 และแพ็กเกจ
**ผลที่ต้องได้ (PLAN:R5 คงไว้):** ผู้ใช้เริ่มจาก mission ที่รองรับ แล้วดูหรือควบคุม ascent→rendezvous→approach→contact→hard dock ได้ ไม่จบแค่ "ถึงระนาบวงโคจร ISS"

#### R5.1 — ทำภารกิจ Soyuz MS ที่มีอยู่ให้เข้าถึงได้และต่อเนื่อง พร้อมคำตัดสินแยกขั้น
- **เลน:** I สำหรับ route และ shell โดยต่อบน seam ของ EQ-15 (route/data-mode, hand-off, frame loop; seam เหล่านี้ถอดก่อน R5.1 และ R6) และผ่าน I-train; P สำหรับ `rendezvousAvailable` และ event; U/C รับ docking card และ camera hook ผ่าน API ส่วน Q/T ดูแล journey **คลื่น:** K5 (เริ่มใน K4 ได้หลัง G4-S: เร็วสุด Day 55 ถ้า R4.2-S merge ก่อนพัก มิฉะนั้น ~65 และ ~85 ในกรณีช้า; S05 §05.9) **ประมาณการ (หยาบ):** 8 agent-days, 3 PR **OR:** OR-2, OR-4, OR-6
- **ขึ้นกับ:** R3.1 ส่งมอบแล้ว (hand-off v1 + DesignRef, #80; field ใหม่สำหรับ docking เพิ่มตามกติกา reader-before-writer และ D-22; fixture จาก R3.1r PR1), EQ-15 เมื่อ D-62 อนุมัติ (S09; seam ก่อน R5.1 และ R6), G4-S, ADR-Handoff/FlightLifecycle (R0.2r) **ปลดล็อก:** R5.4 (UI), R7.1 ช่วง "Orbit→Docking" (M-PLAN-025, S17)
- **ถ้า D-62 ไม่อนุมัติ:** ไม่มี seam ให้ต่อ (ไม่มีหน้าต่าง และ M-PLATFORM-055 ถามใหม่ที่ GK4, S09 EQ-15 ทางสำรอง) การแก้ `src/main.ts` ของ R5.1 ทั้งหมดผ่าน I-train (S18 §18.3) เป็น hook ที่ไม่เกินเพดานราว 400 บรรทัดซอร์สต่อ PR (S18 §18.5) และรอคิวช่อง I ตามลำดับความสำคัญของ S18 §18.3.1 ข้อ 4 ห้ามรวม hook หลายขั้นเป็น PR ใหญ่เพื่อเลี่ยงคิว
- **ไฟล์ที่อนุญาต:**
  - I: controller ที่ EQ-15 แยกออกจาก `src/main.ts` (ถ้า D-62 ไม่อนุมัติ: `src/main.ts` โดยตรง ผ่าน I-train เท่านั้น)
  - U ผ่าน I-train: `src/ui/panel.ts`
  - `src/ui/mission-steps.ts` (ขั้น `docking`; docstring บน `5f9aa2e:src/ui/mission-steps.ts:9-10` (ไม่เปลี่ยนตั้งแต่ `7662ead`) ระบุไว้แล้วว่า "Docking joins the chain when the Orbit section can fly it (R5)" และรายงาน `5f9aa2e:docs/development/reports/R3.5-journey.md:36` บันทึกว่า Docking ยังไม่อยู่ในสายขั้นจนกว่า R5 จะทำได้)
  - `src/ui/help-content.ts`
  - `src/ui/watch-missions.ts`, `src/ui/flown.ts`
  - `src/ui/flight-lifecycle.ts` (ต่อยอดจาก R2)
  - P: `src/physics/rendezvous/profiles.ts` (`rendezvousAvailable`) และ key ของ event ใน `sim/rendezvous.ts` เฉพาะส่วนที่ไม่เปลี่ยนฟิสิกส์
  - journey ใหม่ `tests/browser/journeys/iss-docking.mjs`
  - สตริงใน i18n: ก่อน EQ-6 ใส่ในบล็อกของเลน หลัง EQ-6 ใส่ในโมดูลของฟีเจอร์
- **ชนิดการเปลี่ยนต่อ PR:**
  1. feature: inventory trigger/config ของโปรไฟล์ใน Watch/Explore/Engineer และบทเรียน; ตัวเลือก mission บอกยานและ port ที่รองรับ เวลาโดยประมาณ และ phase; บอกก่อนเริ่มเมื่อ payload/port ไม่รองรับ; ข้อความ Help แยก "ระนาบ ISS" ออกจาก "ภารกิจนัดพบ"
  2. feature: milestone และคำตัดสินแยกสี่ขั้น ได้แก่ insertion, rendezvous, capture และ hooks/hard dock โดย scene/camera/telemetry/live controls เปลี่ยนตาม FlightLifecycle และรักษา recorder กับ craft state ไว้; เพิ่มขั้น "Docking" ในแถบขั้นของ mission ของ R3.5 (บน `5f9aa2e:src/ui/mission-steps.ts:16` แถบนี้แสดง Build›Check›Launch›Result›Orbit; มาจาก #77 `09a536e` และ R3.5 ส่งมอบแล้ว; `R3.5-journey.md:36` บันทึกว่า Docking เพิ่มเมื่อ R5 ทำได้)
  3. quality-improving (PR ที่เพิ่ม test/journey อย่างเดียว, S18 §18.5): journey ไปถึง `docked`, ส่วน smoke ใน PR CI และหลักฐาน sabotage

| รหัส (ที่มาเดิม) | P / ขนาด / สถานะ | เรื่องและเหตุผล | เกณฑ์รับ | วิธีพิสูจน์ | ขึ้นกับ |
|---|---|---|---|---|---|
| M-ORBIT-024 (PLAN:R5.1, PLAN:U06, PLAN:U05 บางส่วน, RW:DOC-05, C14) | P1 / L / เปิด | ระบบ docking มีอยู่แล้วแต่ผู้ใช้ไม่เห็นเส้นทางต่อเนื่อง Help ยังบอกว่าไม่มี docking และ PROGRESS ยังเขียน R5 ว่า Planned เป็นงานที่ owner ให้ความสำคัญ (U06) และส่วนใหญ่คือการเปิดฟิสิกส์ที่สร้างไว้แล้วให้ใช้ได้ | ตามข้อความ v1.2 (§15.1.5) และ: Help/inventory แยก "ระนาบ ISS" กับภารกิจนัดพบ; คำตัดสินสี่ขั้นแยกกัน และก่อนมี R5.3 ขั้น hard dock ติดป้ายว่า "ตัวจับเวลา hooks 13 นาที"; warp/skip ใช้สถานะฟิสิกส์ (ไม่ teleport); abort/retreat/เชื้อเพลิงหมดมีผลจริง; replay ทุก phase ตรง recorded state; ทุก PR ที่แตะ `main.ts` (ผ่าน seam หรือผ่าน I-train ถ้า D-62 ไม่อนุมัติ) ไม่เกินราว 400 บรรทัดซอร์ส | (ก) **R5.1 ไม่เปลี่ยนฟิสิกส์:** event log และเวลา contact ของ `tests/heavy/rendezvous.test.ts` และ `historical-docking.test.ts` ต้องเท่ากับ base ทุกบิต (เทียบ diff ระหว่าง base กับ head) และ EO-PHY-5 (worker/replay parity) ผ่าน (ข) journey `iss-docking` ต้องล้มเมื่อแกล้งให้ verdict ปนกันหรือ replay ล้ำเวลา (sabotage, process lesson 20) (ค) ต้องวัด: เวลา wall ของ journey ถึง `docked` (PB: warp 100× ได้จริง 8.3×) โดย journey เต็มรันใน deploy/heavy gate และ PR CI รันเฉพาะส่วน smoke (S02 §02.13 ข้อ 25) (ง) ต้องวัด: หน่วยความจำของ recording โปรไฟล์ two-day (KPI-32, M-PLAN-003) | R3.1 และ G3 (ส่งมอบแล้ว 2026-10-04), EQ-15 (ถ้า D-62 อนุมัติ; ถ้าไม่ ใช้ I-train), G4-S |

- **quality guard (OR-2):** ต่อยอด G07 ไม่สร้างใหม่; KPI-10 (rAF ขณะบิน) ไม่ถดถอยเมื่อเปิด docking scene; ไม่สร้าง WebGL context ใหม่ (KPI-07); ไม่ใช้ orbit success แทน docking success
- **หลักฐาน:** `docs/development/reports/R5.1-iss-reachable.md` ระบุเทสต์ที่รันจริง · **execution_authorized:** false

#### R5.2 — วงโคจรเป้าหมายและ phasing: จากวงกลมอ้างอิงไปสู่สถานะ ISS ที่ epoch คงที่
- **เลน:** P (ทำทีละ PR; targeting, station, profile และ planner เป็น workstream เดียว); P-D เป็นผู้เขียนเพียงผู้เดียวของ TLE อ้างอิงใน `src/data/**`; S ดูแล ADR **คลื่น:** K5 (เริ่มใน K4 ได้หลัง G4-S) **ประมาณการ (หยาบ):** 15 agent-days, 5 PR **OR:** OR-3, OR-2, OR-4
- **ขึ้นกับ (เกณฑ์เริ่ม):**
  - **ADR CraftState สถานะฟิสิกส์ = PR1 ของแพ็กเกจนี้เอง** ย้ายออกจาก R0.2r มาเขียนแบบทันเวลา และนับใน R5.2 (5 PR ใน `packages.tsv`; S07 §07.2; แถว M-PLAN-013 ใน `folds.tsv`) ต่อยอดจาก ADR-Handoff ของ R0.2r PR2–PR5 เริ่มได้หลัง PR1 merge และ S กับ P ตรวจแล้วเท่านั้น
  - D-35 (=PLAN:D07, ชุด C, ต้องตอบภายใน K2; ข้อเสนอใน S08 คือใช้สถานะ SGP4 ที่ epoch คงที่ก่อน ส่วน snapshot สดเป็นตัวเลือกภายหลัง)
  - EQ-9, EQ-10 และ EQ-11 (`folds.tsv`)
  - CO-6 (ฐาน heavy/fleet) และ G4-S
  - M-ORBIT-020 (กรณีขอบของ Lambert, R4.6, S14) ถ้า solver ของ R5.2 ใช้ Lambert ของ Orbit
- **ปลดล็อก:** R5.3, M-ORBIT-021 (finite burn ใน planner ใช้ solver ของ R5.2, S14)
- **ใช้ร่วม:** datum WGS-84 สำหรับการแสดงผลตัวเดียวกับ M-PHYSICS-024 (R4.2, S13) ห้ามมีการแปลงพิกัดสองชุด
- **ไฟล์ที่อนุญาต:**
  - P: `src/physics/rendezvous/{station,plan,targeting,profiles}.ts`, `src/physics/sim/rendezvous.ts`, `src/physics/mission.ts` (`issRaanAt`)
  - P-D: `src/data/` (TLE อ้างอิงพร้อมแหล่ง)
  - ใช้ซ้ำแบบอ่านอย่างเดียว: `src/orbit/{sgp4,earth-orientation,uncertainty}.ts`
  - เทสต์และเอกสาร: `tests/heavy/{rendezvous,historical-docking}.test.ts`, `tests/rendezvous*.test.ts`, `docs/{PHYSICS,VALIDATION}.md`
  - ADR: `docs/development/adr/CraftState.md` (ชื่อไฟล์เสนอ)
- **fold (`folds.tsv`):**
  - M-PLAN-013 (บ้านยังเป็น R0.2r): ส่วน ADR CraftState สถานะฟิสิกส์ย้ายมาเป็น PR1 ของ R5.2 แบบทันเวลา และนับใน R5.2 (S07 §07.2) ส่วน ADR อีกห้าฉบับอยู่ใน R0.2r ก่อน R3.1
  - M-PHYSICS-011: EQ-11 ต้องมาก่อน
- **ชนิดการเปลี่ยนต่อ PR:**
  1. docs (ย้ายมาจาก R0.2r): ADR CraftState ระบุ version, provenance, epoch/time scale, frame/units, `r/v`, quaternion, ω, mass/fuel, geometry, subsystem, docking port และ destination intent (PLAN:§4.2) ตัวอย่าง valid/invalid/legacy อยู่ที่ S07 §07.2 สัญญา frame กำหนดว่า TEME → ECI-of-date ของ Launch ใช้ `earth-orientation.ts`, แปลง km→m และระบุ UT1/polar motion
  2. realism-changing: ใช้ TLE (NORAD 25544) ที่ epoch ของเที่ยวบินอ้างอิง เข้า SGP4 แล้วแปลงเป็นสถานะสถานีแทน "วงกลม 418 km + phase ตามแผน" ในโปรไฟล์ทั้งสาม แทนที่ `ISS_RAAN0 = 200°` ด้วยระนาบจากสถานะอ้างอิงที่มีแหล่ง และนอกช่วงที่เชื่อถือได้ให้ติดป้ายว่า "ระนาบโดยประมาณ" ส่วน anchor ของ C01 ให้ใช้สถานะ SGP4 ของ epoch เดียวกัน
  3. realism-changing: เพิ่มแรงต้านอากาศให้ทั้งสองยาน โดยใช้แบบบรรยากาศเดียวกับช่วงอยู่ในวงโคจรของเที่ยวบิน และค่า ballistic coefficient ต้องมีแหล่งหรือติดป้ายว่าเป็นค่าประมาณ ส่วนคำถามว่าจะใช้ MSIS ในช่วงนี้หรือไม่เป็นงาน "วัดก่อน" ของ S13 §13.7
  4. realism-changing: แก้ phasing ให้คำนวณ launch window, phasing, finite transfer และ braking จาก insertion ที่บินได้จริงและ ephemeris ของเป้าหมาย; รายงาน feasibility, เชื้อเพลิง, time horizon และความไม่แน่นอน; ภารกิจที่อยู่นอก window ต้องไม่แสร้งว่าสำเร็จ
  5. feature (ทางเลือก หลัง D-35): snapshot สดแสดงอายุข้อมูล, frame, แบบจำลอง และความไม่แน่นอนตาม R04 (`uncertainty.ts`) และ**ไม่ใช้ในบทเรียนที่ให้คะแนน**

| รหัส (ที่มาเดิม) | P / ขนาด / สถานะ | เรื่องและเหตุผล | เกณฑ์รับ | วิธีพิสูจน์ (ข้อมูลอ้างอิงและขอบเขตตรึงก่อนรัน) | ขึ้นกับ |
|---|---|---|---|---|---|
| M-ORBIT-025 (PLAN:R5.2, RW:PHY-23, RM:R01/R02/R04/P2.5-b ใช้ซ้ำ, CR:D15, RA:(c)#6) | P1 / XL / เปิด | ความสมจริงหลักของภารกิจ ISS ต้องใช้ระบบท้องฟ้าจริงที่มีอยู่แล้ว (SGP4, EOP, uncertainty) ไม่สร้างระบบที่สอง และต้องเลิกจัดสถานีให้ตรงแผน | ตามข้อความ v1.2 (§15.1.5) และ: ภารกิจอ้างอิงแบบ deterministic ยังอยู่พร้อมป้าย; ไม่จัด phase ย้อนหลัง; สัญญา frame TEME→ECI-of-date ใช้ UT1/polar motion; เปลี่ยน phase/insertion แล้วแผนเปลี่ยนตามฟิสิกส์ | **ข้อมูลอ้างอิง:** TLE ของ ISS ที่ epoch ของ MS-28 (2025-11-27), TMA-19M (2015-12-15), MS-01 (2016-07-07), MS-16 (2020-04-09) และ MS-25 (2024-03-23) พร้อมแหล่ง (ชุดเดียวกับ anchor เดิมถ้ามี) **ขอบเขต (ห้ามคลาย):** contact ±8 นาที (two/four-orbit) และ ±20 นาที (two-day) ตาม `FLOWN`; MS-16 ±25 และ MS-25 ±20 นาที ตามเทสต์ประวัติ; capture envelope ของ SoyCOM ไม่เปลี่ยน **ขอบเขตที่ต้องตรึงใน PR1 ก่อนรัน (ข้อเสนอ):** phasing burn DV1–DV3 ที่คำนวณได้ต้องอยู่ใกล้ค่าที่บินจริงใน `profiles.ts` ภายใน ±10 % หรือ ±2 m/s (เลือกค่าที่มากกว่า) โดยผู้ตรวจ D-55 ยืนยันตัวเลขก่อน; อัตราลดระดับของสถานีต้องอยู่ในแถบที่ได้จาก TLE ของ epoch นั้น (อ้างอิงกว้าง 50–100 m/วัน); ความต่างของสถานีแบบ numerical กับ SGP4 ที่ +2 วันต้องอยู่ในความไม่แน่นอนที่ `uncertainty.ts` ประมาณ; frame ผ่านเทสต์ TEME→ITRF เดิม (71 mm) **อื่น ๆ:** ตารางก่อน/หลังทั้งสองโมเดลของ ascent; ทุก golden/fingerprint ที่ขยับ (เช่น heavy rendezvous ที่ใช้ window 2026-09-20) ต้องระบุชื่อและให้เจ้าของอนุมัติ; ผู้ตรวจ D-55 รันซ้ำ | ADR CraftState (PR1 ของ R5.2), D-35, EQ-9/10/11, CO-6, G4-S |

- **quality guard (OR-2):** คงภารกิจอ้างอิงที่ทำซ้ำได้ไว้สำหรับบทเรียนและการ verify; ฟิสิกส์ยังเป็นทรงกลม + J2 และ WGS-84 ใช้เฉพาะการแสดงผล (M-PHYSICS-024); ห้ามใช้เวกเตอร์ดวงอาทิตย์/ดวงจันทร์ร่วมกันข้าม frame (S02 §02.13 ข้อ 39); ห้ามขยาย step ของสถานี (`STEP = 5 s`, S02 ข้อ 30); ห้ามคลายขอบเขตเวลา contact
- **OR-3 (ต้นทุน):** RA ประเมินว่าแรงต้านอากาศมีต้นทุน "เล็ก" แต่ยังต้องวัด ให้รายงานเวลา wall ของ heavy rendezvous ก่อน/หลัง (Node, median ของ 5 รอบ) และ KPI-11 ระหว่าง docking ส่วนการแปลง SGP4 ทำครั้งเดียวต่อภารกิจ
- **หลักฐาน:** `reports/R5.2-iss-target.md` · **execution_authorized:** false

#### R5.3 — การเข้าใกล้ เชื้อเพลิง เซนเซอร์ และพลวัตการสัมผัส (soft capture → hooks → hard dock)
- **เลน:** P (ทำทีละ PR) และใช้ render geometry adapter ผ่าน S **คลื่น:** K5 (เริ่มใน K4 ได้หลัง G4-S เมื่อ R5.2 merge แล้ว) **ประมาณการ (หยาบ):** 15 agent-days, 5 PR **OR:** OR-3, OR-2
- **ขึ้นกับ:** R5.2, R1.4 (ข้อจำกัดเชื้อเพลิง, เสร็จแล้ว), ADR CraftState (PR1 ของ R5.2) **ปลดล็อก:** R5.4, การตัดสิน preset ตาม D-58, G5, R6.1
- **ไฟล์ที่อนุญาต:**
  - `src/physics/sim/rendezvous.ts`
  - `src/physics/rendezvous/{profiles,ports}.ts` (ค่า stiffness, damping และ restitution พร้อมแหล่งหรือป้ายว่าเป็นค่าประมาณ)
  - `tests/rendezvous*.test.ts`, `tests/heavy/rendezvous.test.ts`, เทสต์ contact ใหม่
  - `docs/PHYSICS.md` §9.2
- **ชนิดการเปลี่ยนต่อ PR:**
  1. quality-improving (ไม่เปลี่ยนฟิสิกส์ของแอป; S18 §18.5): test เชิงตัวเลขเพื่อยืนยันว่าเกณฑ์ที่เสนอใน PLAN:§8.5 ทำได้จริง แล้วตรึงไว้ก่อน implementation ได้แก่ 0.01 m / 0.001 m/s / 0.01° / 0.01 s และ floor ของการอนุรักษ์ที่คำนึงถึง floating-point และขนาดของ frame ส่วนเอกสาร (เกณฑ์ที่ตรึง, ช่วงกวาดความไว และ `docs/PHYSICS.md` §9.2) เป็น commit หนึ่งใน PR เดียวกัน ไม่ใช่ชนิดที่สอง
  2. realism-changing: sub-step ที่ละเอียดเฉพาะช่วงใกล้ contact และหา root ของ contact ภายใน step เพื่อไม่ให้ทะลุ port; ใช้ข้อจำกัดเชื้อเพลิงของ R1.4 กับ RCS/โหมดมือ; inertia, CG และตำแหน่ง thruster ระบุแหล่ง; เพิ่มความคลาดและ latency ของเซนเซอร์โดยมีแหล่งหรือติดป้ายค่าประมาณ
  3. realism-changing: สถานีลอยอิสระ (free drift) และการตอบสนองแบบสองวัตถุ (momentum, impulse และ constraint) ในแบบที่มีขอบเขต
  4. realism-changing: soft capture → hooks → hard dock ตามเหตุ โดยแต่ละขั้นมีคำตัดสินพร้อมรหัสเหตุ ระยะเวลาของ hooks ใช้ค่าที่มีแหล่ง แต่เดินต่อเมื่อสถานะกายภาพอนุญาตเท่านั้น (ไม่ใช่นับเวลาอย่างเดียว); หลัง hard dock ใช้วัตถุรวม (mass, CG, inertia) และแยกแรง stationkeeping จาก impulse ของ contact
  5. quality-improving (PR ที่เพิ่ม test อย่างเดียว พร้อมหลักฐาน sabotage; S18 §18.5): กรณีล้มเหลวครบ ได้แก่ เชื้อเพลิงหมด, ชน, keep-out, capture ล้มเหลว, retreat และ abort โดย warp ข้ามไม่ได้ พร้อมการวิเคราะห์ความไวต่อค่าประมาณ

| รหัส (ที่มาเดิม) | P / ขนาด / สถานะ | เรื่องและเหตุผล | เกณฑ์รับ | วิธีพิสูจน์ (ขอบเขตตรึงก่อนรัน) | ขึ้นกับ |
|---|---|---|---|---|---|
| M-ORBIT-026 (PLAN:R5.3, PLAN:R1.4, RA:(c)#7, PLAN:§8.5) | P1 / XL / เปิด | ความน่าเชื่อของฉากจบ (U15): docking ต้องสำเร็จหรือล้มเหลวด้วยเหตุทางฟิสิกส์ที่ผู้เรียนเห็นได้ ไม่ใช่เพราะ pose ถูกจับแล้วนับเวลา | ตามข้อความ v1.2 (§15.1.5) และ: คำตัดสิน soft capture, hooks และ hard dock แยกกันพร้อมรหัสเหตุ; หลัง hard dock เป็นวัตถุรวม; ค่า stiffness/damping/restitution ที่ไม่มีข้อมูลเปิดติดป้าย "ค่าประมาณ" พร้อมความไว | (ก) กรณี contact แยกเดี่ยว (ไม่มีแรงภายนอก): momentum เชิงเส้นและเชิงมุมคงที่ภายใน floor ที่ตรึงใน PR1; พลังงานไม่เพิ่ม และส่วนที่หายไปเท่ากับงานของ damping ภายใน floor เดียวกัน (ข) refinement ใกล้ contact ลู่เข้าถึง 0.01 m / 0.001 m/s / 0.01° / 0.01 s (ค) เชื้อเพลิงศูนย์ = ล้มเหลว; ชน ≠ docking success (ง) capture envelope ของ SoyCOM (closing 0.1–0.35 m/s, offset ≤0.34 m, lateral ≤0.1 m/s, pitch/yaw ≤7°, roll ≤10°, rate ≤0.6°/s) ใช้ต่อโดยไม่เปลี่ยน (จ) เวลา contact ยังอยู่ในขอบเขตของ R5.2 (ฉ) ตรวจความไวโดยกวาด stiffness/damping ±50 % ของค่าประมาณ แล้วรายงานกรณีที่คำตัดสินพลิก (ช่วงกวาดเป็นข้อเสนอ ตรึงใน PR1) | R5.2 |

- **quality guard (OR-2):** ห้ามขยาย step นอกช่วง contact และห้ามขยาย control clock 0.01 s (S02 ข้อ 30); ห้ามลดความละเอียดการหาเหตุการณ์ (ข้อ 32); ไม่มีแอนิเมชันที่แยกจากฟิสิกส์
- **OR-3 (ต้นทุน):** sub-step เป็นงานเฉพาะที่ จึงไม่ควรกระทบ warp ช่วงอื่น ต้องวัดเวลา heavy และ achieved warp ระหว่าง final approach และ contact (KPI-11) ก่อน/หลัง และห้ามอ้างว่าเร็วขึ้นถ้าไม่มี `--compare`
- **หลักฐาน:** `reports/R5.3-contact.md` · **execution_authorized:** false

#### R5.4 — ภาพยาน สถานี และ port ที่ตรงกับแบบจำลองการสัมผัส, preset Docking และการขยายไปยานอื่น
- **เลน:** P-R/B + P โดย I รวม UI; ไฟล์ render อยู่ในเลน C (+P-R); `telemetry-layout.ts` และ `rendezvous-plot.ts` อยู่ในเลน U; สตริงผ่านเลนเจ้าของ **คลื่น:** K5 **ประมาณการ (หยาบ):** 9.5 agent-days, 3 PR (บวก PR identical-output ที่ fold มาจาก EQ-14/EQ-2) **OR:** OR-1 (PR แรก), OR-2, OR-3
- **ขึ้นกับ:** R5.3, D-58 (ชุด C, K3), D-50 (ชุด C, K3), R2.3s2 (schema bump ของ layout ต้องมาก่อน, S11), R4.7 (M-PLAN-016, S14), CameraPolicy ของ R2 **ปลดล็อก:** G5, R6.2 (geometry ของห้องนักบิน)
- **ไฟล์ที่อนุญาต:**
  - C/P-R: `src/render/{station,soyuz,apollo-cm,apollo,debris,rocket,pads}.ts`
  - U: `src/ui/telemetry-layout.ts`, `src/ui/rendezvous-plot.ts`, `src/ui/telemetry.ts`
  - P: ชื่อโหมดและแบบจำลองการควบคุมใน `sim/rendezvous.ts`
  - asset ตาม D-50 (ชุด asset แยก)
- **fold (`folds.tsv`) และงานที่พับเข้ามา (CR:P25, P26, D22, D25):**
  - P26 = M-LAUNCH-047 และ D22 = M-LAUNCH-048: เป็น EQ-14 (S09) และเป็น **PR แรกของ R5.4** ภาพต้องเท่าเดิมทุกพิกเซล
  - D25 = M-LAUNCH-049: บ้านอยู่ EQ-2 แต่ส่วนตาราง Apollo ทำเป็น PR identical-output อีกตัวที่ติดกัน
  - P25 = M-LAUNCH-044: บ้านอยู่ EQ-3 ซึ่งกำหนดลงใน K2 ก่อน R5 ส่วน R5.4 แค่ยืนยันด้วย EO-UI-2 ว่าเส้นทางของการเข้าเทียบใช้ dirty flag นั้น
  - **ห้ามสลับร่ม Apollo ไปใช้ Canopy ร่วม** (S02 §02.13 ข้อ 8)
- **ชนิดการเปลี่ยนต่อ PR:**
  - 0a. identical-output (EQ-14): M-LAUNCH-047 รวม gore ตาม material + M-LAUNCH-048 ส่วนที่เหลือ
  - 0b. identical-output (EQ-2): ตาราง Apollo ของ M-LAUNCH-049
  - 1. feature: geometry ของ port, แกนลำตัว, แนวกล้อง TV, แสง และการบังต้องตรงกับแบบจำลองกายภาพ ภาพจาก viewer/manual camera ใช้ CameraPolicy เดียว; telemetry แสดงระยะ, ความเร็วสัมพัทธ์, alignment, เชื้อเพลิง และสถานะ contact จาก frame เดียว; แยกการบังคับด้วยมือของลูกเรือ Soyuz ออกจาก TORU ของ Progress ทั้งคำศัพท์และแบบจำลองการควบคุม
  - 2. feature: preset Docking (M-LAUNCH-015) โดย bump `TELEMETRY_LAYOUT_VERSION` ต่อจาก bump ของ R2.3s2 และมี migration จากทุกเวอร์ชันก่อนหน้า
  - หลัง G5 (แยก PR series ต่อ family ตาม D-30 และ D-58): Progress/Dragon ที่มี propulsion, navigation, กลไก docking และความเข้ากันของ port ของตัวเอง

| รหัส (ที่มาเดิม) | P / ขนาด / สถานะ | เรื่องและเหตุผล | เกณฑ์รับ | วิธีพิสูจน์ | ขึ้นกับ |
|---|---|---|---|---|---|
| M-ORBIT-027 (PLAN:R5.4, PLAN:D02 = D-30, CR:P25/P26/D22/D25) | P2 / L / เปิด | สิ่งที่ผู้เรียนเห็นที่ port ต้องตรงกับที่ฟิสิกส์ตัดสิน และคำว่า TORU ใช้ผิดกับลูกเรือ Soyuz การขยายยานทำหลังภารกิจแรกผ่านการตรวจ (D-30) | ตามข้อความ v1.2 (§15.1.5) และ: ภาพ probe/port ตรง contact geometry; replay ภาพไม่ล้ำเวลาฟิสิกส์; ไม่ใช้ค่า Soyuz กับ Progress/Dragon; asset อยู่ในงบต่อระยะของ D-50 | PR 0a/0b: EO-UI-1 (hash พิกเซลใต้ร่ม drogue/main และฉาก Apollo ทุกเฟส) เท่าเดิม และ EO-UI-2 ยืนยัน draw call ของร่มลดลง (เป็นตัววัด ไม่ใช่ oracle); `renderer.info.memory.textures` ไม่เพิ่ม PR 1: ที่ทุก frame ของ contact ตำแหน่งปลาย probe ที่วาด (หลัง transform) ต้องเท่ากับปลาย probe ทางฟิสิกส์จาก recorded frame และ replay cursor ไม่เกิน head; เจ้าของตรวจภาพหน้าจอ; ไม่มีการเพิ่มเพดาน `budgets.json` ที่ไม่มี offset (KPI-30 = 0) | R5.3, D-50, R4.7 |
| M-LAUNCH-015 (R2S:R2.3/Docking preset, PLAN:R2.3 ข้อ 1) | P3 / S / เลื่อน (เริ่มเมื่อ R5.3 กำหนด schema ของ docking แล้ว, D-58) | นักเรียนที่ทำ docking ต้องเห็นระยะและอัตราการเข้าใกล้พร้อมกัน PLAN v1.2 จึงตั้งใจทำ preset นี้หลัง R5 | preset การ์ดนัดพบ (range, range-rate, offset, มุม, เชื้อเพลิง, สถานะ contact) ต่อยอด `TelemetryLayout` ด้วย version bump; ไฟล์เก่าย้ายรูปแบบได้; ไฟล์ใหม่กว่าหรืออ่านไม่ได้ fallback เป็นการ์ดทั้งหมด | migration test จากทุกเวอร์ชันก่อนหน้า; EO-STO-2 (diff record ของโปรไฟล์) แสดงเฉพาะ key ที่ตั้งใจเปลี่ยน; control สำคัญยังไม่ใช่การ์ด | R5.3, R2.3s2, D-58 |

- **quality guard (OR-2):** asset ใหม่ต้องเข้า D-50 (ชุด asset นอก install เริ่มต้น โหลดเมื่อใช้ และ zip intranet precache ไว้) ห้ามแสดงภาพแทนที่ด้อยกว่าแบบเงียบ; R4.7 ตรวจความเที่ยงตามเกณฑ์ "Rendering fidelity" (S14); ไม่สร้าง WebGL context เพิ่ม (KPI-07)
- **หลักฐาน:** `reports/R5.4-visuals.md` และ `reports/EQ-14-render-helpers.md` · **execution_authorized:** false

#### 15.1.5 เกณฑ์รับของ PLAN v1.2 (คงไว้ตามต้นฉบับ)
- **R5.1 ตรวจรับ:** supported mission launch จน `docked`; aborted/retreat/fuel failure มีผลจริง; unsupported payload/port แจ้งก่อนเริ่ม; replay ทุก phase ตรง recorded state
- **R5.2 ตรวจรับ:** เปลี่ยน phase/insertion แล้วแผนเปลี่ยนตามฟิสิกส์; outside-window mission ไม่แสร้งสำเร็จ; independent mission/reference cases มี epoch/frame/tolerances ตรึงก่อน
- **R5.3 ตรวจรับ:** zero fuel fail ตามจริง; collision ไม่ docking success; momentum/energy response ใน isolated contact case สอดคล้อง tolerance; contact limits เดิมและ failure cases ตรวจครบ
- **R5.4 ตรวจรับ:** ภาพ probe/port ตรง contact geometry; replay ภาพไม่ล้ำเวลาฟิสิกส์; manual/autopilot transfer journal/re-fly ได้; family ใหม่ผ่าน reference/failure scope ของตน
- **ทำขนานได้:** station/ship geometry และ source research ระหว่างที่ P พัฒนา pure targeting; UI ใช้ frozen frame fixtures
- **ต้องรวม:** target propagation/finite burns/approach/contact/ship state มี P คนเดียว; physics integration เสร็จก่อน broad docking run
- **Gate G5 (ข้อความ v1.2; เกณฑ์เต็มอยู่ที่ S05 §05.4):** first spacecraft ภารกิจครบจน hard dock ผ่านอ้างอิงและ failure tests; limitation labels กับ control role ตรงจริง

#### 15.1.6 แพ็กเกจที่ส่งหลักฐานให้ G5 (เกณฑ์อยู่ใน S05 §05.4)

| ข้อของ G5 | แพ็กเกจที่ส่งหลักฐาน | ชนิดหลักฐาน | ใครตรวจ |
|---|---|---|---|
| ยานแรกครบจน hard dock ผ่านอ้างอิง | R5.1 (journey ถึง `docked`), R5.2 (กรณีอ้างอิงห้าเที่ยวบิน), R5.3 | execution + scientific | Q, ผู้ตรวจ D-55 |
| ผ่าน failure tests | R5.3 (เชื้อเพลิงหมด, ชน, keep-out, capture ล้มเหลว, retreat, abort), R5.1 (ผลของ abort/retreat ใน UI) | execution + scientific | P, ผู้ตรวจ D-55 |
| ป้ายข้อจำกัดและบทบาทการควบคุมตรงจริง | R5.1 (ป้ายอ้างอิง/ephemeris, Help), R5.4 (ลูกเรือ vs TORU), R7.5 (ข้อความ G07 ใน IMPLEMENTATION-STATUS, S17) | execution + human (owner อ่าน) | H |
| คำตัดสินแยก insertion, rendezvous, capture และ hard dock | R5.1 (UI และ event), R5.3 (รหัสเหตุ) | execution | Q |
| การอนุรักษ์ momentum/พลังงานใน contact แยกเดี่ยว และเชื้อเพลิงศูนย์ = ล้มเหลว | R5.3 PR1/PR3/PR5 | scientific | ผู้ตรวจ D-55 |
| เวลา contact อยู่ในขอบเขตที่ตรึงไว้ (±8/±8/±20 นาที; MS-16 ±25; MS-25 ±20) | R5.2, รันซ้ำหลัง R5.3 | scientific | ผู้ตรวจ D-55 รันซ้ำ |
| heavy + fleet เขียวบน source ที่ตรึง (KPI-22) | candidate ของ GK5 รวม `tests/heavy/{rendezvous,historical-docking}.test.ts` | execution | Q/T |
| E ก่อน F และสัญญาที่ต้องมีก่อน | EQ-11 (S09), R3.1 ส่งมอบแล้ว (S03 §03.2; ส่วน DesignRef ที่เหลือ R3.1r M-PLAN-028, S12), ADR CraftState (R5.2 PR1) | execution + docs | P, S |
| ภาพตรงกับสถานะกายภาพ | R5.4, R4.7 (S14) | execution + human | H (ภาพหน้าจอ) |

#### 15.1.7 ต้นทุนประสิทธิภาพของ R5 และวิธีวัด (OR-3, OR-6)
- **ไม่มีตัวเลข PB สำหรับฉาก docking:** ทุกค่าด้านล่างเป็น "ต้องวัด" บนฐาน CO-6 ด้วย `measure.mjs` และให้เพิ่ม scenario `docking` ใน R0.4 ก่อน R5.1
- **ฟิสิกส์:**
  - เวลา wall ของ heavy rendezvous ต่อโปรไฟล์ (Node, median 5 รอบ) ก่อน/หลัง R5.2 และ R5.3
  - achieved warp ระหว่างช่วง coast ยาวของ two-day และช่วง contact (KPI-11)
- **ภาพ:** draw call ต่อเฟรมในฉาก docking และ flight rAF p95 (KPI-10) โดยเทียบในเครื่องเดียวกัน
- **หน่วยความจำ:** ขนาด recording ของ two-day (KPI-32 และ M-PLAN-003) เพราะ PB วัดได้ 46.5 MB ที่ T+800 s สำหรับ six-DOF
- **ข้อห้าม:** ห้ามแลกความสมจริงกับความเร็ว (S02 §02.4 ข้อ 2) ถ้าต้นทุนสูงเกิน ให้ลดงานซ้ำแบบ identical-output ก่อน (EQ) ไม่ลด step หรือความละเอียด

### 15.2 R6 — โหมดนักบินอวกาศจากสถานะจริง

**ผลที่ต้องได้ (PLAN:R6 คงไว้):** ประสบการณ์เหมือนควบคุมยานจากที่นั่งนักบิน โดยสิ่งที่เห็น/ได้ยิน/กดสัมพันธ์กับระบบที่จำลอง

**กฎของ R6:**
- **ความเป็นเจ้าของ:** A เป็นเจ้าของ `src/cockpit/**` ระบบไปที่ P, คะแนนและโปรไฟล์ไปที่ L, route ไปที่ I (ต่อบน seam ของ EQ-15 ซึ่งถอดก่อน R5.1 และ R6) และกล้องไปที่ C (CameraPolicy)
- **ถ้า D-62 ไม่อนุมัติ:** route และ hook ของ R6 ใน `src/main.ts` ทั้งหมดผ่าน I-train (S18 §18.3) เป็น hook ที่ไม่เกินเพดานราว 400 บรรทัดซอร์สต่อ PR (S18 §18.5) โมดูลของห้องนักบินอยู่นอกไฟล์ hotspot ใน `src/cockpit/**` และ merge ก่อน hook ที่ต่อเข้า (S18 §18.3.1 ข้อ 1) ห้ามรวม route ของ R6.1–R6.3 เป็น PR ใหญ่เพื่อเลี่ยงคิว
- **ลำดับ:** เริ่มหลัง G5 และ D-37 (=PLAN:D09, ชุด C, ต้องตอบภายใน K4) ซึ่งต่อจาก D-30 และ D-31 (=PLAN:D02/D03 ยืนยันแล้ว: Soyuz ก่อน และห้องนักบินบังคับเองก่อน) ข้อเสนอใน S08 คือห้องนักบินลูกเรือ Soyuz MS
- **ใช้ของเดิมซ้ำ:** CameraPolicy (R2), ADR FlightLifecycle (R0.2r, S07), CraftState (R5.2) และการควบคุม six-DOF/manual/crew abort ที่มีอยู่จริง ห้ามสร้างผู้ถือกล้องหรือ lifecycle ชุดที่สอง
- **ข้อห้าม:** ไม่สร้าง WebGL context ใหม่สำหรับห้องนักบิน (งบ ≤2 ของ R3.0, KPI-07) และไม่เรียก TORU ทุกยานว่าการควบคุมในห้องนักบิน (PLAN:R6.1)
- **EVA, VR และ gamepad:** แยกขอบเขต (EVA อยู่ในชุด D ที่เลื่อนไว้ ใน S08)

#### R6.1 — ขอบเขตยาน ห้องนักบิน และ spec ของระบบ
- **เลน:** A (+P ระบบ, S schema) **คลื่น:** K6 **ประมาณการ (หยาบ):** 8 agent-days, 3 PR **OR:** OR-3, OR-2, OR-4
- **ขึ้นกับ:** G5, D-37 **ปลดล็อก:** R6.2, R6.3 **ไฟล์:** `docs/development/adr/Cockpit-spec.md` (ชื่อเสนอ), `src/cockpit/**` (ใหม่), และถ้าต้องเพิ่มระบบ (power, valve, navigation mode, sensor) ให้ทำใน `src/physics/**` โดย P ก่อนผูกสวิตช์
- **ชนิดการเปลี่ยนต่อ PR:** (1) docs: spec และ source/assumption ledger (2) feature (P): สถานะระบบที่ยังขาดใน domain physics (3) feature (A): โครงของโมดูลห้องนักบินที่อ่านเฉพาะ recorded frame

| รหัส (ที่มาเดิม) | P / ขนาด / สถานะ | เรื่องและเหตุผล | เกณฑ์รับ | วิธีพิสูจน์ | ขึ้นกับ |
|---|---|---|---|---|---|
| M-PLAN-022 (PLAN:R6.1, PLAN:D09 = D-37, PLAN:U14) | P2 / L / เปิด | U14 ต้องการโหมดนักบินที่สมจริง ถ้าไม่มี spec ก่อน สวิตช์จะกลายเป็นของตกแต่ง | spec ระบุว่าสวิตช์แต่ละตัวเปลี่ยน physical/system state อะไร; seat/camera geometry, instruments, การควบคุมการเลื่อน/ท่าทาง, โหมดอัตโนมัติ/มือ, procedure และระดับความละเอียดของ subsystem; ห้องนักบินมี source/assumption ledger | P และ S ตรวจ spec ทีละสวิตช์ (สวิตช์ที่ไม่มีสถานะรองรับต้องถูกตัดออก); มีเทสต์ใน P ว่าสวิตช์ทุกตัวเปลี่ยนสถานะที่ระบุ; spec อ้าง D-37 (ตรวจติดตามผลของ S08) | G5, D-37 |

- **quality guard (OR-2):** ห้ามมีปุ่มที่ไม่เปลี่ยนสถานะ; ห้ามเรียกการควบคุมของสถานีว่าเป็นการควบคุมในห้องนักบิน · **หลักฐาน:** `reports/R6.1-cockpit-spec.md` · **execution_authorized:** false

#### R6.2 — มุมมอง เครื่องมือ เสียง และการรับรู้แรง
- **เลน:** A (+C render, I routes) **คลื่น:** K6 **ประมาณการ (หยาบ):** 15 agent-days, 5 PR **OR:** OR-2, OR-3, OR-6
- **ขึ้นกับ:**
  - R6.1
  - R1.6 ขั้น c: M-PLATFORM-012 รวมที่เก็บเสียงเป็นชุดเดียวก่อนที่เสียงของห้องนักบินจะแตะ `soundtrack.ts` (`folds.tsv`, S10)
  - R2.5: reduced motion M-LAUNCH-054 และ live region (S11)
  - R4.7: M-PLAN-016 และ D-50 งบ asset (S14)
  - CameraPolicy
- **ปลดล็อก:** R6.3 **ไฟล์:** `src/cockpit/**`, `src/audio/**` (ผ่าน API ของที่เก็บเสียงที่รวมแล้ว), hook ของ CameraPolicy (C), route ผ่าน seam ของ EQ-15 (I; ถ้า D-62 ไม่อนุมัติ ผ่าน I-train ตามกฎของ R6 ข้างบน), สตริงผ่าน i18n ของเลน
- **ชนิดการเปลี่ยนต่อ PR:**
  1. feature: viewport ห้องนักบินใช้ renderer และ context เดิม
  2. feature: instruments (DOM/SVG/2D) อ่าน frame เดียวกับภาพภายนอกและ telemetry
  3. feature: เสียงเครื่องยนต์, วาล์ว, alarm และวิทยุ ที่ trigger จาก event/system พร้อม mute, คำบรรยาย (captions) และระดับเสียง
  4. feature: cue ของแรง (vibration/rotation/acceleration) จาก proper acceleration ตามกรอบที่ระบุ และตัวเลือกความสบาย (comfort) แยกจากค่าฟิสิกส์
  5. feature: การควบคุมด้วยมือ, autopilot handover, dead zone และ rate limit ตาม actuator โดยใช้คีย์บอร์ด/เมาส์/สัมผัสเป็นฐาน

| รหัส (ที่มาเดิม) | P / ขนาด / สถานะ | เรื่องและเหตุผล | เกณฑ์รับ | วิธีพิสูจน์ | ขึ้นกับ |
|---|---|---|---|---|---|
| M-PLAN-023 (PLAN:R6.2, PC:(c)9, D-50) | P2 / XL / เปิด | ภาพ เสียง และแรงที่ผู้ใช้รับรู้ต้องมาจากสถานะที่จำลอง และต้องไม่ทำให้ฉาก ความลื่นไหล หรือการเข้าถึงด้อยลง | ข้อความ v1.2: cockpit/exterior/recorded telemetry ตรงเวลา; สั่งแล้วถูก actuator limits และ fuel; pause/warp/replay ไม่เพิ่ม forces; accessibility/comfort controls ใช้ได้ และเพิ่ม: instrument ไม่อ่านข้อมูล live ในอนาคตระหว่าง replay; reduced motion ปิด cue ของการเคลื่อนไหวได้; asset อยู่ในงบ D-50 | (ก) รัน command journal เดียวกันโดยเปิดและปิดห้องนักบิน และสลับตัวเลือกความสบายทุกตัว แล้ว digest ของฟิสิกส์ (แบบ EO-PHY-5) ต้องเท่ากันทุกบิต (ข) เทสต์ frame equality ของเวลาใน cockpit, exterior และ telemetry (ค) ต้องวัด: flight rAF p95 ในห้องนักบินเทียบมุมภายนอก (KPI-10) ห้ามถดถอย และจำนวน context (KPI-07) ห้ามเพิ่ม (ง) axe เป็น 0 serious/critical (KPI-26) และไม่มี Thai clipping (KPI-27) (จ) เจ้าของตรวจภาพหน้าจอ | R6.1, R1.6, R2.5, R4.7 |

- **quality guard (OR-2):** ตัวเลือกความสบายไม่แตะค่าฟิสิกส์; ห้ามลดคุณภาพภาพอัตโนมัติแบบเงียบ (D-43); เสียงต้องมีคำบรรยาย; ไม่ใช้ asset ที่ด้อยกว่าแบบเงียบ · **หลักฐาน:** `reports/R6.2-cockpit-view.md` · **execution_authorized:** false

#### R6.3 — ภารกิจฝึกนักบินและการทดสอบกับผู้ใช้จริง (EVA แยกขอบเขต)
- **เลน:** A/Q/L-C (+H ผู้ใช้ผ่านเลน HU, S16) **คลื่น:** K6 **ประมาณการ (หยาบ):** 8 agent-days, 3 PR + session ของมนุษย์ **OR:** OR-6, OR-2
- **ขึ้นกับ:** R6.2; HU-4 หรือรอบ HU ที่ใช้ protocol เดียวกันของ HU-1 (S16); ED-INST-1 (คำแถลงความเป็นส่วนตัว M-LEARNING-047) ก่อน session ใด ๆ; L สำหรับ record ในโปรไฟล์ **ปลดล็อก:** G6, R7.1 ช่วง "Docking→cockpit" (S17)
- **ไฟล์:** `src/cockpit/scenarios/**`, การให้คะแนนผ่าน API ของ L (ไม่แก้ shared progress โดยตรง), เอกสาร protocol และ FINDINGS ของ HU
- **ชนิดการเปลี่ยนต่อ PR:** (1) feature: ภารกิจฝึก ได้แก่ ทำความรู้จัก instrument, ควบคุมท่าทางและการเลื่อน, เข้าใกล้ด้วยมือ, retreat และ docking จากภารกิจที่ validate แล้ว (2) feature: checklist และ feedback อ้าง recorded state (3) human: user test ที่ตรึงเกณฑ์ไว้ก่อน session

| รหัส (ที่มาเดิม) | P / ขนาด / สถานะ | เรื่องและเหตุผล | เกณฑ์รับ | วิธีพิสูจน์ | ขึ้นกับ |
|---|---|---|---|---|---|
| M-PLAN-024 (PLAN:R6.3, PC:(c)3, D-31) | P2 / L / เปิด | PLAN v1.2 วางการทดสอบกับผู้ใช้ไว้ที่ R6.3 เพียงแห่งเดียว ใน v2.0 HU-1 มาก่อนแล้ว ส่วนนี้วัดความเข้าใจและ motion comfort ของห้องนักบินโดยแยก human feedback ออกจาก physics reference | ข้อความ v1.2: จบ first manual mission ได้ด้วย actual controls และ re-fly command journal; ระบบไม่ช่วยแอบจนแสดง false success; learning record เข้าสู่ profile ที่ถูกต้อง และเพิ่ม: ไม่ให้คะแนนจากการที่แอนิเมชันเล่นจบ | (ก) re-fly จาก command journal ได้ผลตรงกับ recorded state (EO-PHY-5) (ข) sabotage: ปิดแรงขับแล้วภารกิจฝึกต้องไม่ผ่าน (ค) record ไปลงโปรไฟล์ที่ถูกต้อง (EO-STO-2) (ง) user test มีเกณฑ์ (ความสำเร็จโดยไม่ช่วยและ comfort) ตรึงก่อน session ตามแบบ KPI-23 ผลเขียนเป็นไฟล์ FINDINGS ไม่มี analytics | R6.2, HU, ED-INST-1 |

- **quality guard (OR-2):** ห้ามกรอกการอนุมัติหรือผลแทนผู้ใช้ (S02 §02.7); การเดินในยาน/EVA ต้องเขียน scope ใหม่ทั้งหมด (body/suit collision, constraints, RCS/oxygen/thermal และ frame transitions) ห้ามแอบรวมใน cockpit scope · **หลักฐาน:** `reports/R6.3-training.md` และ FINDINGS ของ HU · **execution_authorized:** false

**ข้อความ v1.2 ที่คงไว้:**
- **ทำขนานได้:** cockpit geometry/assets, instrument widgets, sound event mapping และ scenario instructions บน frozen contracts
- **ต้องรวม:** spacecraft systems และ dynamics ผ่าน P; input/camera/route ผ่าน I/C; scoring/profile ผ่าน L
- **Gate G6:** cockpit mission scope ตรวจฟิสิกส์/controls/UX แล้ว และคุณภาพประสบการณ์วัดจากผู้ใช้จริงก่อนขยายอุปกรณ์หรือ EVA

#### 15.2.1 แพ็กเกจที่ส่งหลักฐานให้ G6 (เกณฑ์อยู่ใน S05 §05.4)

| ข้อของ G6 | แพ็กเกจที่ส่งหลักฐาน | ชนิดหลักฐาน | ใครตรวจ |
|---|---|---|---|
| ห้องนักบินขับด้วยสถานะจริง ไม่ให้คะแนนจากการเล่นภาพจบ และ re-fly จาก journal ได้ | R6.1 (spec สวิตช์→สถานะ), R6.2 (instrument อ่าน frame เดียว), R6.3 (คะแนนจาก recorded state, re-fly) | execution + scientific | P, Q |
| comfort แยกจากฟิสิกส์ (สลับแล้ว digest ไม่เปลี่ยน) | R6.2 วิธีพิสูจน์ (ก) | execution | Q |
| pause/warp/replay ไม่เพิ่มแรง และคำสั่งถูกจำกัดด้วย actuator และเชื้อเพลิง | R6.2, ข้อจำกัดของ R1.4 | execution + scientific | P |
| ทดสอบกับผู้ใช้จริงผ่าน HU ก่อนขยายอุปกรณ์หรือ EVA | R6.3 + รอบ HU (S16), ED-INST-1 | human | H |
| การเข้าถึงและภาษาไทย | R2.5 (S11), R6.2 (captions, reduced motion) | execution | Q |
| ความเที่ยงของภาพและงบ asset | R4.7 (S14), D-50 | execution + human | H (ภาพหน้าจอ) |

### 15.3 R8 — ดวงจันทร์: ขยาย C01 (PR #38) ให้เป็นเครื่องมือทั่วไป ภายใต้ D-11 (ประตู G8)

**สิ่งที่มีอยู่แล้ว (RA:(a) แถว Lunar/Apollo; IS:C01 ส่วน 6a–6e):**
- ตาราง DE441 รายชั่วโมงของสัปดาห์ Apollo 11 พร้อม Hermite interpolation, precession IAU 1976 และสนาม GRAIL degree 2 (`src/physics/lunar/{ephemeris,gravity,cislunar,orientation}.ts`, `src/data/ephemeris-1969.ts`)
- ภารกิจ Apollo 11 ครบ ได้แก่ TLI, MCC, LOI, P63/P64/P66, ascent, docking และ lunar-return entry (`src/physics/sim/apollo*.ts`)
- นอกปี 1969 ใช้อนุกรมความแม่นต่ำ (`propagator/ephemeris-series.ts`) เพื่อวาดภาพเท่านั้น
- ช่องว่าง: ไม่มี mascons และไม่มี nutation

**กฎของ R8:**
- **D-11:** ไม่มีเครื่องมือ Orbit ทั่วไปตัวใดชี้ไปที่ดวงจันทร์จนกว่า L01 จะผ่าน Horizons; L01 ต้องใช้ `lunar/ephemeris.ts` ซ้ำ ห้ามมีสำเนาที่สอง; ส่วนป้าย "สัปดาห์ Apollo 11 เท่านั้น (DE441)" เป็นงานของ FX-3 (M-ORBIT-029, S10) ซึ่งต้องลงก่อน R8
- **ผล Apollo C01:** ต้องเหมือนเดิมทุกบิต (EO-PHY-6 Apollo 11 fingerprint, EO-ORB-1 เฟส Apollo) เว้นแต่มี re-record ที่ validate แล้วและเจ้าของอนุมัติ (S02 §02.13 ข้อ 42)
- **ความต้องการก่อนเริ่ม:**
  - EQ-11 (memo ดวงจันทร์, S09)
  - M-PHYSICS-026 (universal-variable Kepler สำหรับ e ≥ 1, R4.5 ใน S14 หลัง tail ของ M-LAUNCH-045 ใน EQ-7)
  - G5
  - เจ้าของเลือกทำ R8 ก่อน R6 ได้ (§15.4)
- **Moon ของ propagator:** การเปลี่ยนดวงจันทร์ที่ใช้คำนวณแรงรบกวนใน propagator ให้ไปใช้ ephemeris ใหม่ของ R8.1 ถือเป็นการเปลี่ยนความสมจริง ต้องรันซ้ำเกณฑ์ของ R4.5 (M-PHYSICS-020, S14 §14.1) ห้ามปนใน PR ของ R8.1
- **ROADMAP:** RM:L01–L05 คงชื่อและรูปแบบใน `docs/ROADMAP-PART2-3.md` เพราะเทสต์ `section-plan` และ `section-nav-model` อ่านไฟล์นี้ แก้ได้เฉพาะ prose ผ่าน R7.5 (M-ORBIT-030, S17) และเมื่องานในรายการนั้นส่งมอบ ให้แก้ในรูปแบบเดิมใน PR เดียวกันพร้อมรันเทสต์ทั้งสอง

#### R8 — ดวงจันทร์ทั่วไป: R8.1–R8.5
- **เลน:** P (ฟิสิกส์ ทำทีละ PR) + O (เครื่องมือ `src/ui/orbit/**` หลัง R8.1); ข้อมูลใน `src/data/**` เขียนโดย P-D; รายการ Watch ผ่านเลนเจ้าของไฟล์และ I-train **คลื่น:** K6 **ประมาณการ (หยาบ):** 47.5 agent-days, 16 PR **OR:** OR-3, OR-2, OR-4
- **ขึ้นกับ:** EQ-11, M-PHYSICS-026 (R4.5), G5, FX-3 (M-ORBIT-029), D-52 (เฉพาะ M-PHYSICS-018), R4.2 dossier ของ PSLV-XL (M-PHYSICS-042, สำหรับ R8.5) **ปลดล็อก:** G8, ED-GAME-1 ส่วน X02 (M-LEARNING-075 ที่เลื่อนไว้, S16)
- **ไฟล์ที่อนุญาต:**
  - P: `src/physics/lunar/**`
  - P: `src/physics/sim/apollo*.ts` ใช้ซ้ำเป็นหลัก แก้ได้เฉพาะ PR ที่ validate แล้ว
  - P-D: `src/data/**`
  - O: `src/ui/orbit/**`
  - เทสต์และเอกสาร: `tests/lunar-ephemeris.test.ts`, `tests/fixtures/horizons-moon-*.json` (ใหม่), `docs/{PHYSICS,VALIDATION}.md`
- **ชนิดการเปลี่ยนต่อ PR (ลำดับ):**
  - R8.1: (1) quality-improving (fixture และ test อย่างเดียว; เอกสารการเลือกแหล่งเป็น commit หนึ่งใน PR เดียวกัน ไม่ใช่ชนิดที่สอง): บันทึก fixture จาก Horizons ช่วงปี 2000–2040 และเลือกระหว่าง Meeus ch.47 กับช่วง Chebyshev ของ DE440 โดยวัดขนาดไบต์ (2) realism-changing: ephemeris ทั่วไปผ่าน API ของ `lunar/ephemeris.ts` ส่วนสัปดาห์ Apollo ยังใช้ DE441
  - R8.2: (3) realism-changing: สลับวัตถุศูนย์กลางที่ sphere of influence และ lunar J2/C22 จนถึง degree 8 (GL0660B) (4) feature: mascons (สนาม degree สูง) เป็นตัวเลือก opt-in ปิดเป็นค่าเริ่มต้น (5) realism-changing (ทางเลือก เฉพาะเมื่อ D-52 อนุมัติ): M-PHYSICS-018
  - R8.3: (6–9) feature: TLI, free return, phasing loop แบบ Chandrayaan, LOI และ NRHO ใน Engineer โดยรับช่วง C05 ของ ROADMAP
  - R8.4: (10–13) เลื่อนไว้จนกว่า R8.1–R8.3 เสร็จและมีความต้องการจาก pilot
  - R8.5: (14–15) feature: Chandrayaan-1 บน PSLV-XL ใน Watch
  - (16) docs: ROADMAP แบบ prose และ VALIDATION

| รหัส (ที่มาเดิม) | P / ขนาด / สถานะ | เรื่องและเหตุผล | ไฟล์หลัก | เกณฑ์รับ | วิธีพิสูจน์ (ข้อมูลอ้างอิงและขอบเขตตรึงก่อนรัน) | ขึ้นกับ |
|---|---|---|---|---|---|---|
| M-ORBIT-031 = R8.1 (RM:L01, DP:PHY-PH08-10, DEC:D-11, RW:L01-L05 บางส่วน, RW:PR38-02 บางส่วน) | P3 / M / บางส่วน | ดวงจันทร์ที่ถูกต้องทุกวันที่ เป็นประตูของเครื่องมือดวงจันทร์ทุกตัวใน Orbit | `lunar/ephemeris.ts`, `src/data/**` | fixture ของ Horizons ช่วง 2000–2040 คลาดไม่เกิน 25 km RMS (Meeus) หรือ 1 km (DE440); ใช้ API เดิม; เทสต์ Apollo 11 เทียบ MSC-00171 ไม่เปลี่ยน; บันทึกขนาด bundle | fixture ของ Horizons (JPL) ที่ตรึงก่อนรัน; EO-PHY-6 และ EO-ORB-1 เท่าเดิม; ถ้าข้อมูล DE440 ทำให้ไบต์ data เพิ่ม ต้องใช้กติกา D-38 (เพดาน data แยก และต้องระบุ offset ด้วยชื่อ) มิฉะนั้นใช้ Meeus | EQ-11, FX-3 |
| M-ORBIT-032 = R8.2 (RM:L02, RA:(c)#9) | P3 / L / บางส่วน | วงโคจรรอบดวงจันทร์ส่วนใหญ่ไม่เสถียรเพราะสนามโน้มถ่วงไม่สม่ำเสมอ ซึ่งสอนไม่ได้ด้วย degree 2 | `lunar/{gravity,cislunar}.ts` | GL0660B ถึง degree 8; frozen orbit ที่ 27°, 50°, 76° และ 86° คง e/ω ได้ 1 ปีภายในขอบเขตที่ระบุก่อนรัน; mascons ปิดเป็นค่าเริ่มต้น; ผล Apollo ไม่เปลี่ยน | ค่าสัมประสิทธิ์ GL0660B; ขอบเขต e/ω ตรึงใน PR (3) ก่อนรัน; ตัวเลือก mascons ตรวจกับวิวัฒนาการวงโคจรรอบดวงจันทร์ของ Apollo 11 (RA:(c)#9); ต้องวัดต้นทุนของ degree 8 และ mascons ก่อนกำหนดค่าเริ่มต้นในเครื่องมือใหม่ | R8.1, M-PHYSICS-026 |
| M-ORBIT-033 = R8.3 (RM:L03, DP:PHY-PH08-10 บางส่วน, RM:IDS-2 (C05)) | P3 / XL / บางส่วน | นักเรียนวางแผนการเดินทางไปดวงจันทร์เองได้ ซึ่งมีคุณค่าการสอนสูง โดยต่อยอดโมดูลของ #38 | `lunar/cislunar.ts`, `src/ui/orbit/**` | ตัววางแผนตรงกับ Apollo 11 ภายใน 1 % และ Chandrayaan-2 ภายใน 5 %; Δv ของ TLI และเวลาเดินทางเทียบตัวเลขที่เผยแพร่; Orbit Engineer เปิดได้หลัง L01 ผ่านเท่านั้น (D-11); ไม่มี lunar propagator ตัวที่สอง | ตัวเลขที่เผยแพร่ของ Apollo 11 (MSC-00171) และ Chandrayaan-2 ตรึงก่อนรัน; Chandrayaan-1 ใช้เป็น held-out ถ้ามีข้อมูล; EO-PHY-6 เท่าเดิม | R8.1, R8.2 |
| M-ORBIT-034 = R8.4 (RM:L04, RM:L05, DP:PHY-PH17/18/19 บางส่วน) | P3 / XL / บางส่วน (มีเฉพาะ Apollo; ส่วนทั่วไปเลื่อนจนมีความต้องการจาก pilot) | ภารกิจโลก–ดวงจันทร์–โลกที่ครบนอกเหนือ Apollo 11 ทำเฉพาะเมื่อมีคนต้องการ | `sim/apollo-{descent,entry}.ts` (ใช้ซ้ำ) | skip entry ตรงตัวเลขที่เผยแพร่ของ Artemis I; descent ใช้ guidance ของ Apollo ซ้ำพร้อมระบุการทำให้ทั่วไป; fingerprint ของ Apollo ไม่เปลี่ยน | ตัวเลขของ Artemis I ตรึงก่อนรัน; EO-PHY-6 เท่าเดิม | R8.3, ความต้องการจาก pilot (ED-INST-2) |
| M-ORBIT-035 = R8.5 (RM:P5-watch) | P3 / M / เปิด | ภารกิจดวงจันทร์ของอินเดียที่บินด้วยยานที่มีอยู่แล้วใน fleet | `src/ui/watch-missions.ts` (ผ่านเลนเจ้าของ), `src/data/**` | เทียบกับ timeline ที่ ISRO เผยแพร่; ติดป้ายตาม quality label ของ R4.4 | timeline ของ ISRO ตรึงก่อนรัน; ทำหลัง dossier ของ PSLV-XL ผ่าน R4.2 เท่านั้น และห้ามยืม programme ที่ fit จากยานอื่น (S02 ข้อ 38) | R8.3, M-PHYSICS-042 |
| M-PHYSICS-018 (CR:NEW-PHYS-3) | P3 / S / เลื่อน (D-52, ชุด D, ต้องตอบภายใน K5) | การค้นแบบ golden-section ของ Apollo ใช้ 0.618 ที่ปัดค่าและประเมินจุดภายในทั้งสองจุดทุกรอบ ถ้าเปลี่ยนเป็น phi ที่แม่นและประเมินรอบละครั้ง จุดที่ค้นจะเปลี่ยนและผล Apollo จะขยับ จึงทำเป็น refactor ไม่ได้ | `lunar/cislunar.ts:96-102`, `sim/apollo-entry.ts:211-216`, `sim/apollo.ts:1131-1135` | ทำเฉพาะใน PR ที่ validate แล้วของ R8.2: เกณฑ์ MSC-00171 (Δv ของ TLI, เวลาถึง perilune และ peak g ตอน entry; D-11) ยังผ่าน; re-record fingerprint ของ Apollo ได้เฉพาะเมื่อเจ้าของอนุมัติพร้อมเหตุผล | ตารางก่อน/หลังของเฟส Apollo (EO-ORB-1); re-record ที่ระบุชื่อ; ถ้าไม่ทำ จะไม่เสียอะไร เพราะ EQ-11 ให้ประโยชน์ส่วนใหญ่แล้ว (สมมติฐาน: จำนวนการคำนวณ ephemeris ลด 40–50 % ต้องวัด) | EQ-11, R8.1, D-52 |

- **quality guard (OR-2):**
  - ห้ามเปิด mascons เป็นค่าเริ่มต้น (S02 ข้อ 41)
  - ห้ามเปลี่ยน `Math.pow(x,1.5)` (ข้อ 36)
  - ห้ามใช้เวกเตอร์ดวงอาทิตย์/ดวงจันทร์ร่วมกันข้าม frame (ข้อ 39)
  - สัปดาห์ Apollo ยังใช้ DE441
  - เครื่องมือใหม่ต้องไม่ทำให้ฉาก Orbit เดิมช้าลง: KPI-09 และ KPI-10 ห้ามถดถอย ต้นทุนของเครื่องมือดวงจันทร์ต้องวัด
- **หลักฐาน:** `reports/R8.<n>-<เรื่อง>.md` ต่อแพ็กเกจย่อย · **execution_authorized:** false

#### 15.3.1 แพ็กเกจที่ส่งหลักฐานให้ G8 (เกณฑ์อยู่ใน S05 §05.4)

| ข้อของ G8 | แพ็กเกจที่ส่งหลักฐาน | ชนิดหลักฐาน | ใครตรวจ |
|---|---|---|---|
| ephemeris ทั่วไปผ่าน Horizons ก่อนเครื่องมือ Orbit ใดจะใช้ดวงจันทร์ (D-11) | R8.1, FX-3 (ป้าย D-11) | scientific | ผู้ตรวจ D-55 |
| mascons เป็น opt-in และปิดเป็นค่าเริ่มต้น | R8.2 PR (4) | execution | Q |
| ผล Apollo C01 เหมือนเดิม เว้นแต่มี re-record ที่ validate แล้วและเจ้าของอนุมัติ | R8 ทุก PR (EO-PHY-6, EO-ORB-1), M-PHYSICS-018 ภายใต้ D-52 | execution + human | H |
| prerequisite ที่ทำให้ผลเท่าเดิมและถูกต้อง | EQ-11 (S09), M-PHYSICS-026 (R4.5, S14) | execution + scientific | P |
| ตัววางแผนตรงกับ Apollo 11 ภายใน 1 % และ Chandrayaan-2 ภายใน 5 % | R8.3 | scientific | ผู้ตรวจ D-55 |

### 15.4 ลำดับ ปฏิทิน และคอขวดของส่วนภารกิจ
- **สายวิกฤต (S05 §05.5 A):** CO-6 → R0.4 → EQ-9/10 → R4.2 ชุด Soyuz → G4-S → R5.2 (ADR CraftState, D-35) → R5.3 (D-58) → R5.4 → G5 → R6.1 (D-37) → R6.2 (D-50) → R6.3 → G6
- **สายย่อย:** EQ-11 → R5.2 และ R8; EQ-7 (M-LAUNCH-045) → R4.5 (M-PHYSICS-026) → R8; EQ-15 (D-62; seam ก่อน R5.1 และ R6) → R5.1 (หลัง G4-S; R3.1 ส่งมอบแล้ว); ถ้า D-62 ไม่อนุมัติ R5.1 และ route ของ R6 แก้ `main.ts` ผ่าน I-train ที่เพดานราว 400 บรรทัดต่อ PR (S18 §18.3, §18.5) และยอมรับคิว I ที่ยาวขึ้น (S05 §05.6)
- **ปฏิทินอ้างอิง (S05 §05.9):**

| ช่วง | กรณีเร็ว | กรณีช้า | สาเหตุที่ช้า |
|---|---|---|---|
| R5 | R5.1–R5.3 เริ่มใน K4 หลัง G4-S (R5.1 เร็วสุด Day 55 ถ้า R4.2-S merge ก่อนพัก มิฉะนั้น ~65 ≈ 15 ม.ค. 2027; ไม่รอ G3 แล้ว); timebox K5 = Day 86–110 (15 ก.พ.–19 มี.ค. 2027) | R5.1 เร็วสุด ~Day 85 (≈ 12 ก.พ. 2027) | G4-S ช้า (bisect heavy, ผู้ตรวจ D-55) |
| G5 (GK5) | Day 130 (≈ 16 เม.ย. 2027) | Day 199 (≈ 22 ก.ค. 2027) | D-35 หน่วง 1–2 สัปดาห์; R5.1 เริ่มเร็วขึ้นไม่ทำให้ G5 เร็วขึ้น เพราะวันที่ของ GK มาจาก PR สะสม |
| G6 (GK6) | Day 147 (≈ 11 พ.ค. 2027) | Day 224 (≈ 26 ส.ค. 2027) | D-37 หน่วง; หาผู้ใช้ทดสอบช้า |
| G8 (GK6) | Day 147 (≈ 11 พ.ค. 2027) | Day 224 (≈ 26 ส.ค. 2027) | ถ้าเจ้าของเลือกทำ R6 ก่อน R8 G8 ช้ากว่า G6 |

- **คอขวด P:**
  - R5.2 + R5.3 เป็น PR ของ P ทำทีละตัวรวม 10 PR ใน K5 (20–25 วันทำการ) และทุก PR ต้องรัน heavy ที่กระทบ (25–61 นาที) และ fleet ของ candidate (~2 ชม. 40 นาที) (S05 §05.6)
  - **ทางลด:** P-D เตรียม TLE อ้างอิงและ fixture ของ Horizons ล่วงหน้าในช่วงที่เลนว่าง; R5.4 ส่วน geometry และ R6.1 ส่วน spec ทำขนานได้บน frozen contract; reuse หลักฐาน heavy/fleet ตาม content hash ถ้า D-64 ได้รับการอนุมัติ
- **R8 ก่อน R6 (ทางเลือกของเจ้าของ):**
  - R8 ใช้เลน P + O และไม่ต้องรอ D-37 ส่วน R6 ใช้เลน A และต้องการ P เฉพาะใน R6.1
  - **ข้อเสนอ:** ถ้า D-37 ยังไม่ตอบเมื่อ G5 ผ่าน ให้เริ่ม R8.1–R8.2 ก่อน (ไม่มีการตัดสินที่ค้าง) แล้วทำ R6 ทันทีที่ตอบ ห้ามเปิด PR ฟิสิกส์ของ R6.1 และ R8 พร้อมกัน เพราะ P ต้องทำทีละ PR

### 15.5 สิ่งที่ปฏิเสธ เลื่อน หรือให้ทำเฉพาะแบบที่รักษาคุณภาพในขอบเขตนี้

| ข้อเสนอ | เหตุที่ไม่ทำในรูปเดิม (คุณภาพที่ปกป้อง) | ทางเลือกที่รักษาคุณภาพ | บันทึกที่ |
|---|---|---|---|
| รวม RK4 ของ station/targeting/navigation เป็นตัวเดียว (CR:D15) | ลำดับการบวกต่างกัน จึงเปลี่ยนผลทีละบิต (bit-identical) | เขียนคอมเมนต์อธิบายเมื่อแก้ไฟล์อยู่แล้ว; memo ของ EQ-11 | M-PHYSICS-016 ปฏิเสธ (S19 App C1); S02 ข้อ 35 |
| ใช้ snapshot ISS สดในบทเรียนที่ให้คะแนน | ผลจะไม่คงที่และต้องใช้เครือข่าย ขัดกับค่าเริ่มต้นออฟไลน์ | ใช้ epoch คงที่ก่อน; snapshot สดเป็นตัวเลือกพร้อมป้ายอายุ/frame/ความไม่แน่นอน | D-35 (S08) |
| จัด phase ของสถานีย้อนหลังให้ dock ได้ | ความสมจริงและความซื่อตรง | แก้ phasing จาก insertion ที่บินได้จริง; ภารกิจที่อยู่นอก window ต้องบอกว่าล้มเหลว | PLAN:R5.2 |
| แอนิเมชัน docking แยกจากฟิสิกส์ หรือให้ warp ข้าม failure | ผลเท็จ (ความเสี่ยงข้อ 9 ใน S05 §05.13) | ภาพตาม recorded frame; sub-step เฉพาะช่วง contact | R5.3, R5.4 |
| Progress/Dragon ไปพร้อม Soyuz ใน R5 | ขอบเขตบวมและ G5 เลื่อน | ทำหลัง G5 โดยใช้ข้อมูลของแต่ละยานเอง | D-58 (ก) |
| สลับร่ม Apollo เป็น Canopy ร่วมเพื่อลด draw call | หน้าตาและความถูกต้องทางประวัติ | รวม gore ตาม material โดยภาพเท่าเดิมทุกพิกเซล (M-LAUNCH-047) | S02 ข้อ 8 |
| ใส่ asset 3 มิติ/เสียงของ R5/R6 ใน precache เริ่มต้น | ไบต์ครั้งแรกเพิ่มและขัดกติกา ratchet | ชุด asset แยกที่โหลดเมื่อใช้ และ zip intranet precache ไว้ | D-50 |
| สร้าง WebGL context ใหม่สำหรับห้องนักบินหรือ preview ของสถานี | context หมดจนจอดำ (KPI-07) | ใช้ renderer เดิม; instrument เป็น DOM/SVG/2D | R3.0 (S12), FX-8 (S10) |
| เปิด mascons เป็นค่าเริ่มต้น | ต้นทุนประสิทธิภาพจริง | opt-in พร้อมป้าย และตรวจกับ Apollo 11 | S02 ข้อ 41 |
| เปลี่ยน golden-section ของ Apollo เป็น refactor | ผล Apollo เปลี่ยน | validated fidelity change ใน R8.2 ภายใต้ D-52 หรือไม่ทำเลย | M-PHYSICS-018 |
| EVA, VR หรือ gamepad ใน R6 | ขอบเขตบวม; ความสบายและความปลอดภัยยังไม่ได้วัด | เขียน scope แยกหลัง G6 | PLAN:R6.3; ชุด D |
| R8.4 (descent และ skip entry ทั่วไป) ตอนนี้ | XL และ Apollo ครอบคลุมกรณีหลักแล้ว | เลื่อนจนมีความต้องการจาก pilot | M-ORBIT-034 |

### 15.6 ช่องว่างและข้อสงสัยที่พบระหว่างเขียน
1. **รัศมี ISS สองค่า:** `ISS_A` ใน `mission.ts:157` และ `data/orbits.ts:7` ใช้ 420 km แต่ `STATION.altitude` ใช้ 418 km R5.2 ต้องเอาค่าจากสถานะอ้างอิงที่มีแหล่งค่าเดียว และระบุใน ADR CraftState
2. **ขอบเขต DV1–DV3:** ไม่มีแหล่งใดตรึงตัวเลขไว้ ข้อเสนอใน R5.2 (±10 % หรือ ±2 m/s) ต้องให้ผู้ตรวจ D-55 ยืนยันก่อนรัน ห้ามเลือกหลังเห็นผล
3. **heavy rendezvous ขึ้นกับ `ISS_RAAN0`:** window ของวันที่ 2026-09-20 ขึ้นกับการ extrapolate จาก `ISS_RAAN0` ดังนั้น R5.2 จะทำให้ผลของเทสต์นี้ขยับ ต้องเป็นการ re-record ที่ระบุชื่อและเจ้าของอนุมัติ ส่วนขอบเขตเวลาห้ามคลาย
4. **journey ถึง `docked`:** ที่ warp จริง 8.3× (PB) ภารกิจ 3 ชั่วโมงอาจใช้เวลา wall หลายสิบนาที จึงต้องวัด และวางไว้ใน deploy/heavy gate ไม่ใช่ PR CI
5. **ไฟล์ข้อมูล DE440 กับเพดาน data:** การเลือก Meeus หรือ DE440 ใน R8.1 ต้องใช้กติกา D-38 ถ้าไบต์ data เพิ่ม
6. **main บน GitHub เดินต่อแล้ว:** ณ as-of main อยู่ที่ `5f9aa2e` (#76–#83; `7662ead...5f9aa2e` แตะเฉพาะ `src/main.ts`, `tests/browser/harness.mjs` และ PROGRESS) ไฟล์ฟิสิกส์ ข้อมูล render และ UI ของ docking ที่ส่วนนี้อ้างไม่ถูกแตะ (ดูฐานข้อเท็จจริงที่หัวส่วน) ที่เปลี่ยนคือ `main.ts`, `panel.ts`, `ui/orbit/playground.ts`, i18n และ `mission-steps.ts` ใหม่ ซึ่ง R5.1 ต้องตรวจซ้ำบน SHA ของ Day 0 และ PROGRESS บน `5f9aa2e` บันทึก R3.1–R3.5 ว่า verified/merged/published แต่ยังเขียน R4–R7 ว่า Planned (`5f9aa2e:docs/development/PROGRESS.md:27`)
