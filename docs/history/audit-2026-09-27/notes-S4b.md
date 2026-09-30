# S4b — Lessons evidence & grading: บันทึกเซสชัน

สาขา `claude/audit0927-s4b-lessons` จาก `origin/main` ที่ `dba7b0a` รายการ: A11, A12 (บท 4.3 และข้อความบท 2.4), A19 (สถานะการบันทึก)
ไม่ได้แตะไฟล์ที่ห้ามแก้ และไม่ได้แตะ `src/lessons/grader.ts`, `src/lessons/lesson-file.ts`, `src/lessons/config.ts`, `src/config/mission-file.ts`, `src/main.ts`

| Commit | รายการ |
|---|---|
| `56663a8` | A11 บันทึกภารกิจตามที่บินจริง |
| `994d229` | A12 บท 4.3 ให้คะแนนเฉพาะ step ในหน้าต่างหลัง max-Q |
| `8442b6e` | A12 บท 2.4 ข้อความแยกขั้นที่แนะนำกับขั้นที่ให้คะแนน |
| `e8d7d3a` | A19 บอกสถานะการบันทึกความก้าวหน้า |

## A11 — ผลบทเรียนเก็บภารกิจที่บินจริง

- ฟังก์ชันใหม่ `flownMission(cfg)` ใน `src/lessons/progress.ts` (DOM-free) สร้าง `MissionDocument` จาก `sim.cfg` โดยตรง `LessonMode.record()` เรียกใช้แทนการประกอบ state เอง (ซึ่งเคยเขียน `guidanceOverrides: {}` และไม่ใส่ rendezvous/padId)
- **การตัดสินใจ:** คัดลอก `cfg.guidance` ทั้งก้อนเป็น `guidanceOverrides` ตามที่แผนแนะนำ ไม่คำนวณส่วนต่าง เอกสารจึงบินด้วย guidance เดิมแม้ Orbitlab รุ่นหลังจะเปลี่ยนค่า default ของจรวด นอกจากนี้ยังเก็บ `rendezvous`, `padId`, `vehicleSpec` (ถ้ามี), `recoveryPlan`, `dynamics` (รวม `dispersion`) และมวลบรรทุก
- มวลบรรทุกใช้ `cfg.payloadMassOverride` และถ้าไม่มีจะใช้มวลของดาวเทียมเอง ตามที่ simulation บิน (เดิมใช้มวลของบทเรียนเป็นค่าสำรอง แต่หน้าเว็บตั้ง override ทุกครั้ง ผลจึงเท่าเดิม)
- ไม่ต้องเพิ่ม helper ใน `main.ts` หรือ `mission-file.ts` เพราะ `missionDocument()` ที่มีอยู่คัดลอกทุก field ที่ต้องการแล้ว
- ผลข้างเคียงที่ควรรู้ (สำหรับ S15 restore): ถ้าเปิดเอกสารจากผลบทเรียนกลับเข้าแผงตั้งค่า guidance ทุกค่าจะนับเป็น override และแผงจะแสดงหมายเหตุ "ปรับแล้ว" แม้ค่าจะเท่ากับ default การบินไม่ต่าง ตอนนี้ยังไม่มีทางนำเข้าผลบทเรียน จึงยังไม่เกิดกับผู้ใช้
- การทดสอบ:
  - `tests/lessons-round2.test.ts` ใส่ `expectRecordedAsFlown()` ในเทสต์ 2.1 (เฉลย `maxAccel` 18) และ 5.2 (เฉลย profile `twoOrbit`) ซึ่งบินอยู่แล้ว จึงไม่เพิ่มเที่ยวบิน ลำดับคือ record → บันทึกลง store → อ่านกลับ → `parseMissionDocument` (ต้องไม่มี issue) → `missionConfigFromState` ต้องเท่ากับ `sim.cfg` ที่บิน
  - `tests/lessons-ui-core.test.ts`: ทุกบทเรียน built-in (ทั้ง point-mass และ six-DOF) ตั้ง `maxAccel` 21 และ profile `twoOrbit` แล้วอ่านกลับ ต้องไม่มี issue และได้ cfg เดิม เทสต์นี้ยืนยันว่าการคัดลอก guidance ทั้งก้อนไม่ชนขอบเขตของ validation แม้ใน six-DOF
- เบราว์เซอร์: บินบท 2.1 ที่ 1000× โดยตั้ง `maxAccelMs2: 18` ผ่าน WebMCP ผลผ่าน และ `localStorage['orbitlab.lessons'].lessons['guid-maxq'].last.mission.mission.guidanceOverrides.maxAccel` = 18

## A12 (4.3) — step test ต้องอยู่ในหน้าต่างหลัง max-Q

- `step.overshoot` (`src/lessons/measures.ts`) อ่านจาก `gradedPitchStep()` step ที่ให้คะแนนคือ step แกนพิตช์ครั้งล่าสุดที่จบก่อนเวลาให้คะแนน (MECO) และต้อง **เริ่มระหว่าง max-Q ของเที่ยวบินนั้นถึง max-Q + 30 s** โดยค้างไว้ **≥ 5 s** (`GRADED_STEP`) ถ้าไม่มี step ในหน้าต่าง ค่าที่วัดได้คือ `null` และเกณฑ์ fail ส่วนคำตอบตัวเลข (`overshoot-read`) อ่านจาก step เดียวกัน
- **การตัดสินใจ:** ผูกหน้าต่างกับ max-Q ของเที่ยวบิน ไม่ใช้ T+55–80 s แบบตายตัว เพราะ measure นี้ใช้ได้ในไฟล์บทเรียนของครูกับจรวดลำอื่นด้วย ค่าที่วัดจริง: max-Q ของภารกิจบท 4.3 (six-DOF) อยู่ที่ T+53.3 s ด้วยเกนเร็ว 4/1.5 และ T+53.1 s ด้วยเกน 1.5/3 หน้าต่างจึงเป็นราว T+53–83 s ครอบ T+65 s ในโจทย์ และตรงกับตัวอย่าง T+55–80 s ในแผน
- ไม่ตรวจ amplitude เพราะ overshoot เป็นร้อยละของ amplitude อยู่แล้ว (ตามแผน)
- คำใบ้ข้อ 1 และ label ของเกณฑ์ `overshoot` ระบุหน้าต่างครบ 3 ภาษา (หลัง max-Q ราว T+53 s ไม่เกิน 30 s และค้าง ≥ 5 s) ส่วน brief เดิมบอก "ราว T+65 s หลังผ่าน max-Q" อยู่แล้ว จึงไม่แก้
- การทดสอบ (`tests/lessons-round2.test.ts` ใช้ record สังเคราะห์ ไม่ต้องบิน six-DOF):
  - step ที่ T+20 s และ overshoot 1% ไม่ผ่าน ค่าเป็น null
  - step ที่ T+65 s และ 4% ผ่านเหมือนเดิม ส่วน 12% ไม่ผ่าน
  - step ที่ทำหลังหน้าต่างไม่แทน step ในหน้าต่าง
  - ทดสอบขอบหน้าต่าง และ hold 3 s ต้องไม่นับ
  - sabotage: ปิดเงื่อนไขหน้าต่างชั่วคราวแล้วเทสต์ล้มจริง (`expected 1.0000000000000009 to be null`) จากนั้นคืนโค้ดเดิม
- เที่ยวบินเฉลย six-DOF: รัน `npx vitest run --config vitest.heavy.config.ts tests/heavy/lessons-sixdof.test.ts -t "4.3"` เฉพาะเทสต์ 4.3 ผ่านใน **39 s** (step ที่ T+65 s อยู่ในหน้าต่าง) ไม่ได้แก้ไฟล์ heavy

## A12 (2.4) — ข้อความบท Monte Carlo

- brief ทั้ง 3 ภาษาแยกเป็น "การทดลอง (แนะนำ)" ได้แก่ บิน 20 รอบ seed 1 ดูวงรี 3σ และคลิกรอบที่ไกลที่สุด กับ "สิ่งที่ให้คะแนน" ได้แก่ รอบหนึ่งของชุด seed 1 ที่บินเดี่ยวจนจบภารกิจ พร้อมจุดใกล้โลกและระยะห่างจากเป้าที่พิมพ์ และบอกตรง ๆ ว่าการให้คะแนนไม่ตรวจ 20 รอบหรือรอบที่เลือก
- คำใบ้ข้อ 2 บอกว่าการให้คะแนนรับทุกรอบของชุด รอบที่ไกลที่สุดคือรอบที่ควรบิน
- `hooks.ts` `dispersedRun`: comment บอกสิ่งที่ไม่ได้ตรวจ พร้อม `TODO(audit 2026-09-27 S4c)`
- ไม่มีเกณฑ์ใดเปลี่ยน เฉลยใน `tests/heavy/lessons-sixdof.test.ts` (run 5 ของ set 1) จึงให้คะแนนเหมือนเดิม ไม่ได้รัน heavy 2.4 ซ้ำ (30 นาที) เพราะเกณฑ์และการวัดไม่เปลี่ยน ส่วนเทสต์ 2.4 ใน `npm test` ผ่าน

## A19 (สถานะ) — บอกเมื่อบันทึกไม่ได้

- `saveProgress()` คืน `boolean` คือ false เมื่อ `setItem` throw (โควตาเต็ม) หรือเข้าถึง storage ไม่ได้ (SecurityError ในหน้าต่างส่วนตัวบางแบบ)
- `LessonMode` เก็บ `saved` แล้วแสดงบรรทัดเล็ก (class เดิม `lesson-note` / `lesson-note fail` และเพิ่ม `lesson-save` พร้อม `data-saved`; ไม่ต้องแก้ CSS):
  - แถบบทเรียน: แสดงเมื่อบันทึกเกรดของเที่ยวบินนี้แล้ว และแสดงทุกครั้งที่บันทึกไม่ได้
  - หน้ารายการบทเรียน: แสดงข้างปุ่ม Export หลังการบันทึกครั้งแรก
- ข้อความ (key ใหม่ `lesson.save.saved`, `lesson.save.failed` ครบ en/ru/th): "บันทึกความก้าวหน้าในเบราว์เซอร์นี้แล้ว" หรือ "บันทึกความก้าวหน้าไม่ได้ … (หน้าต่างส่วนตัว หรือพื้นที่เต็ม) ส่งออกผลการเรียนก่อนปิดหน้า ไฟล์นี้เป็นบันทึกผลการเรียน ใช้กู้คืนความก้าวหน้าไม่ได้" ข้อความไม่อ้างว่าไฟล์ export เป็น backup (restore เป็นงาน S15) ส่วนป้ายปุ่ม Export เดิมไม่ได้อ้างเรื่อง backup จึงไม่แก้
- การทดสอบ `tests/lessons-ui-core.test.ts`: store ปลอมที่ throw ตอนเขียน (QuotaExceededError) และที่ throw ทุกการเข้าถึง (SecurityError) ต้องคืน false ส่วน store ปกติคืน true ผู้ช่วย A11 ใน round2 ก็ยืนยันว่าคืน true
- เบราว์เซอร์ (`npm run dev` ด้วย Chromium ของ Playwright และสคริปต์ชั่วคราวใน scratchpad ที่ไม่ได้ commit): บินบท 2.1 จนผ่านใน 3 รอบ
  - English, storage ปกติ: แถบแสดง "Progress saved in this browser." หลังเกรดถูกบันทึก หน้ารายการแสดงข้อความเดียวกันข้างปุ่ม Export
  - Thai และ Russian โดย `setItem('orbitlab.lessons')` ถูกบังคับให้ throw: ข้อความ "บันทึกไม่ได้" แสดงในแถบตั้งแต่เปิดบทเรียน และแสดงในหน้ารายการด้วย ข้อความยาวตัดบรรทัดใต้ปุ่มได้เรียบร้อยที่ 1280×800 ไม่มี page error
  - ความก้าวหน้าในแท็บยังนับต่อ ("Зачтено 1 из 21") แม้ storage ไม่รับ

## พบระหว่างทาง ยังไม่แก้ (อยู่นอกขอบเขต)

- `loadProgress()` ยังคืนความก้าวหน้าว่างโดยไม่บอกเมื่ออ่านไม่ได้ ถ้าข้อมูลใน storage เสีย (JSON พัง หรือ version ไม่ตรง) การบันทึกครั้งถัดไปจะเขียนทับของเดิม ควรทำใน S15 พร้อม restore เช่น แจ้งว่าอ่านไม่ได้และเก็บสำเนาของเดิมไว้ก่อน
- ชื่อนักเรียน (`orbitlab.student`) ใช้ localStorage แยกและยังกลืน error เงียบ ๆ ผลกระทบต่ำ (แค่ต้องพิมพ์ชื่อใหม่)
- ถ้าจะให้ label ของเกณฑ์ที่เป็น hook/measure อธิบายเหตุที่ fail (เช่น "ไม่มี step ในหน้าต่าง") ต้องแก้ `grader.ts`/UI ซึ่งตรงกับงาน S11 (ผลสรุปที่บอกเหตุ)

## ผลรวม

- `npm run typecheck`: ผ่าน
- `npm test` ที่ `e8d7d3a`: 128 ไฟล์ 1 673 เทสต์ ผ่านทั้งหมด (16 นาที)
- `tests/heavy/lessons-sixdof.test.ts` เฉพาะ 4.3: ผ่าน 39 s
- `tests/probe/` ใช้ชั่วคราวเพื่อวัดเวลา max-Q แล้วลบแล้ว

## วิธีตรวจรับ

1. `npm ci && npm run typecheck && npm test`
2. เจาะจง: `npx vitest run tests/lessons-round2.test.ts tests/lessons-ui-core.test.ts`
3. six-DOF 4.3: `npx vitest run --config vitest.heavy.config.ts tests/heavy/lessons-sixdof.test.ts -t "4.3"` (ราว 40 s)
4. เบราว์เซอร์: `npm run dev` แล้วเปิด `?lesson=guid-maxq` ตั้ง Guidance → acceleration limit 18 บินจนจบ พิมพ์ q แล้วดูว่ามี "บันทึกความก้าวหน้าในเบราว์เซอร์นี้แล้ว" ใต้ผลในแถบ จากนั้นกด Export results แล้วดู `lessons["guid-maxq"].last.mission.mission.guidanceOverrides.maxAccel` = 18 ในไฟล์ ทำซ้ำในหน้าต่างส่วนตัวของเบราว์เซอร์ที่ปิด storage (หรือใน DevTools ให้ `Storage.prototype.setItem` throw) เพื่อดูข้อความ "บันทึกไม่ได้"
5. บท 4.3 (Engineer): กด flight test ขั้น 2° ที่ราว T+20 s เกณฑ์ overshoot ต้องขึ้น ✗ และไม่มีค่า กดที่ราว T+65 s ต้องให้คะแนนตามเดิม
