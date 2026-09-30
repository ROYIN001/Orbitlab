# ตรวจ integration ครั้งสุดท้าย — source review

เวลาบันทึก: 30 กันยายน 2026 เวลา 00:12 น. Europe/Moscow (29 กันยายน 21:12 UTC)

ตรวจ `source-integrated` ที่ commit `0b844f77f5f0ffdeb7274642ddf74a57c2ee230b` เทียบจุดส่งต่องาน `64757b` โดยอ่าน diff ของ production source ครบ **44 ไฟล์** และบริบทของ caller/state ที่เกี่ยวข้อง ไม่ได้อ่านซอร์สทั้ง repository ทุกบรรทัด

**ผล: ไม่พบ severe regression หรือ integration blocker เพิ่มเติมที่ยืนยันได้จาก diff นี้** ผลนี้เป็นการทบทวนซอร์สแบบ read-only ไม่ใช่การรับรองว่าไม่มีบั๊กทุกกรณี ไม่ได้รันชุดทดสอบหรือ browser ใหม่ และไม่ได้แก้ production source ในการตรวจรอบนี้ `git diff --check 64757b..HEAD -- src` ผ่าน

## จุดที่ตรวจเชิงลึก

| เส้นทาง | สิ่งที่ตรวจและผล |
|---|---|
| เสียง / IndexedDB | `src/audio/soundtrack.ts:83` รอ transaction complete ก่อนรายงานสำเร็จ ปิด database เมื่อสำเร็จ/ล้มเหลว และจัดการ synchronous throw; `src/ui/soundtrack-panel.ts` เรียงการอ่าน/เปลี่ยน offset/upload/remove ต่อแถวและแสดง save failure ไม่พบช่องทางใหม่ที่ offset save เก่าคืนไฟล์หลัง Remove |
| Build / ข้อมูลที่บันทึก | `src/design/design-store.ts:108` เก็บสมาชิกที่อ่านไม่ออกไว้เมื่อเปลี่ยนสมาชิกอื่น ปฏิเสธการเขียน collection เสียหายหรือ version ไม่รองรับ; `src/ui/build/engineer-level.ts:187` โหลด revision ใหม่โดยมี load sequence guard; error code `collection` มีข้อความครบ EN/TH/RU |
| บทเรียน / persistence | `src/lessons/progress.ts:170,196` สำรองข้อมูลเดิมก่อนบันทึกข้อมูลที่ซ่อม ถ้าสำรองไม่ได้ไม่เขียนทับ active record; `frozenCaseData` คัดลอก worksheet/source; `lesson-mode.ts` เก็บ raw drafts แยกจากคำตอบที่ส่งและส่งสถานะบันทึกขึ้น UI |
| Export / async state | `src/ui/lessons/worksheet-view.ts:125` ตรึงชื่อไฟล์ก่อน decode ภาพ; HTML/DOCX ใช้ภาษาของ worksheet ผ่าน `tFor` แทนภาษาหน้าจอที่อาจเปลี่ยนระหว่างรอ; Orbit case export ตรึง case id ก่อน await |
| Orbit import | `src/ui/orbit/sky-panel.ts:125,562` แยก diagnostics ของความพยายามล่าสุดจากไฟล์ที่ยอมรับล่าสุด จึงไม่เปลี่ยน provenance ของ element sets เก่าเมื่อไฟล์ใหม่ถูกปฏิเสธ |
| Monte Carlo worker | `src/physics/monte-carlo-job.ts:78,131` จัดการ failure ระหว่างสร้าง/dispatch/replacement และหยุด worker พร้อมล้าง queue/current; อีก agent ตรวจส่วนนี้อย่างอิสระแล้วไม่พบ severe regression เช่นกัน การเก็บ array ของ worker ที่ terminate แล้วเป็นพฤติกรรมเดิมสำหรับ workerCount ไม่ใช่ worker ใหม่ที่ยังทำงาน |
| Physics / handoff | `src/orbit/kepler.ts:53,161,198` จำกัด branch ใหม่ไว้ที่ `0 < |e−1| < 10⁻⁴` และคง ordinary branch; `orbitFromState` ส่ง signed mean anomaly และคู่ a/e ที่สอดคล้องกัน; Lambert คง short/long-way และปฏิเสธ exact collinear ที่ไม่มีระนาบเฉพาะ ส่วน `sim/ascent.ts` และ `sim/burns.ts` ใน diff นี้เปลี่ยน comments เท่านั้น |
| Render / displayed state | ตรวจ DPR update, camera-relative stars ที่ far depth, sector material disposal และการใช้ metrics จาก replay cursor แยกจาก verdict event; ไม่พบ lifetime/state regression เพิ่มเติม |

ขอบเขตอีกส่วนที่อ่านครบ: assessment scoring/review/figure labels, content และ locale edits, chart export label layout, wind-tunnel invalid input, flight-file finite-number validation และ DOCX paragraph grouping

รายการ 44 ไฟล์ที่อ่าน diff:

```text
src/audio/soundtrack.ts
src/design/design-store.ts
src/design/tunnel-view.ts
src/i18n/en.ts
src/i18n/index.ts
src/i18n/ru.ts
src/i18n/th.ts
src/lessons/answer-drafts.ts
src/lessons/assessment/bank/basics.ts
src/lessons/assessment/bank/control.ts
src/lessons/assessment/bank/failures.ts
src/lessons/assessment/bank/guidance.ts
src/lessons/assessment/bank/orbits.ts
src/lessons/assessment/bank/rockets.ts
src/lessons/assessment/score.ts
src/lessons/builtin/track1.ts
src/lessons/builtin/track2.ts
src/lessons/builtin/track5.ts
src/lessons/builtin/track6.ts
src/lessons/grader.ts
src/lessons/progress.ts
src/orbit/kepler.ts
src/orbit/maneuvers.ts
src/physics/monte-carlo-job.ts
src/physics/sim/ascent.ts
src/physics/sim/burns.ts
src/render/orbit-view.ts
src/render/scene.ts
src/render/stars.ts
src/replay/reference.ts
src/ui/build/engineer-level.ts
src/ui/build/explore-store.ts
src/ui/build/tunnel-panel.ts
src/ui/chart-export.ts
src/ui/charts.ts
src/ui/lessons/assessment-view.ts
src/ui/lessons/lesson-mode.ts
src/ui/lessons/worksheet-view.ts
src/ui/monte-carlo.ts
src/ui/orbit/sky-panel.ts
src/ui/result-content.ts
src/ui/soundtrack-panel.ts
src/worksheets/docx.ts
src/worksheets/html.ts
```

## บท 4.3: คำสั่งทดลองกับขอบเขตที่ให้คะแนนอัตโนมัติ

ตรวจเพิ่มเฉพาะซอร์สปัจจุบันเพื่อจำแนกรายการใน `learning-followup-review-TH.md` ไม่ได้บินกรณีนอกโจทย์ใหม่ และ `src/lessons/builtin/track4.ts` ไม่อยู่ใน diff 44 ไฟล์ข้างต้น จึงไม่จัดรายการนี้เป็น regression ใหม่จาก integration

- `track4.ts:80–82` ให้ทำการทดลอง pitch step **2° ค้าง 8 s ที่ประมาณ T+65 s** ก่อนและหลังปรับเกน เป็นคำสั่งขั้นตอนทดลองอย่างชัดเจน ไม่ได้ระบุว่าตัว grader ตรวจตัวเลข 2°/8 s แบบเท่ากันพอดี
- Hint ที่ `track4.ts:105` ระบุเกณฑ์เลือกผลอยู่แล้ว: เริ่มหลัง max-Q ภายใน 30 s และ hold ≥5 s เลือกครั้งสุดท้ายที่เข้าเงื่อนไขก่อน MECO
- `src/lessons/measures.ts:79–91` ตรวจ step/pitch, finished/not-aborted, time window และ hold ≥5 s จริง ไม่ตรวจ amplitude=2°, hold=8 s หรือว่ามีการบิน baseline คู่กับ retuned
- `track4.ts:94–101` ใช้ overshoot ≤6%, survived และคำตอบที่อ่านได้ tolerance 3 percentage points; `src/physics/rigid/attitude-test.ts:89–97` คำนวณ overshoot เทียบ amplitude ที่สั่งจริง
- Heavy test เดิมที่ `tests/heavy/lessons-sixdof.test.ts:69–86` ใช้ 2°/8 s สำหรับ baseline และ retuned พร้อม no-step negative case; การอ่านเทสต์รอบนี้ไม่ใช่การรันใหม่

**จำแนก:** การทำให้คำอธิบายแยก “ขั้นตอนทดลองที่ให้ทำ” จาก “สิ่งที่ระบบตรวจอัตโนมัติ” เป็น factual wording clarification ที่แก้ได้โดยไม่เปลี่ยน rubric ส่วนการบังคับ amplitude=2°, hold=8 s หรือต้องมีคู่ baseline/retuned เป็นการเปลี่ยนเกณฑ์/เพิ่มการติดตามหลักฐาน ต้องคงไว้เป็นงานพัฒนาที่แยกต่างหาก

**คำแนะนำขั้นต่ำ (ยังไม่แก้ source):** คงคำสั่ง 2°/8 s และการเปรียบเทียบก่อน–หลังไว้ แล้วเพิ่มข้อความสั้นท้าย brief เช่น “ใช้การตั้งค่า 2°/8 วินาทีเดียวกันในการทดลองทั้งสองครั้งเพื่อเปรียบเทียบผล ระบบให้คะแนนผล pitch step ที่เสร็จสมบูรณ์ครั้งสุดท้ายก่อน MECO ซึ่งเริ่มภายใน 30 วินาทีหลัง max-Q และค้างอย่างน้อย 5 วินาที โดยยังไม่ตรวจแอมพลิจูด 2° ระยะเวลา 8 วินาทีแบบพอดี หรือการมีผลก่อน–หลังเป็นคู่” การเปลี่ยนเป็นคำว่า “แนะนำ” อย่างเดียวโดยไม่บอกขอบเขต grader อาจทำให้หน้าที่การทดลองเดิมดูอ่อนลง จึงไม่ใช่ตัวเลือกที่ควรทำเงียบ ๆ

หลักฐานเชิงตัวเลขที่ทำเสร็จก่อนการ review นี้อยู่ใน `solver-boundary-validation-TH.md`, `solver-boundary-results.json` และ `solver-boundary-summary.json`; หลักฐานกราฟิก extreme portrait อยู่ใน `orbit-background-followup-TH.md` และ `orbit-background-depth-results.json` ให้ใช้อ้างตามขอบเขตของแต่ละรายงาน ไม่รวมเป็นการทดสอบใหม่ของเอกสารนี้
