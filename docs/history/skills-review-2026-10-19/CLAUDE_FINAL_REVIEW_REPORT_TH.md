# รายงานตรวจขั้นสุดท้าย: สกิล Orbitlab สองตัว

- **สกิลที่ตรวจ:** `orbitlab-lesson-design` และ `orbitlab-interactive-lesson` พร้อมตัวช่วย `hohmann_reference.py` และชุดเอกสาร/หลักฐานส่งมอบใน `orbitlab-claude-review-bundle.zip`
- **ผู้ตรวจ:** Claude ผ่าน Claude Code ใน cloud session บนเครื่อง Linux ไม่ใช่ Codex และไม่ได้ใช้เครื่อง Windows ของเจ้าของ
- **วันที่:** 2026-10-19 (UTC) ตรงกับ 2026-10-20 ตามเวลา Europe/Moscow
- **ขอบเขตรอบนี้:** ตรวจและเสนอแก้ตาม `CLAUDE_REVIEW_PROMPT_TH.md` รอบนี้ไม่ได้แก้ไฟล์สกิล ไม่ได้แก้สำเนาที่ติดตั้ง และไม่ได้แก้ซอร์สแอป สกิลที่บันทึกเข้า repo เป็นสำเนาที่ไม่ได้แก้เนื้อหา ดูหัวข้อ 8

**คำขอของเจ้าของ (แชต 2026-10-19 ยกมาคำต่อคำ):** "มีมาเพิ่มอีกสกิลครับ จัดการบันทึกเข้าบัญชีนี้และ repo ของงานด้วยเลยครับ ช่วยแตก ZIP นี้ อ่าน START_HERE_TH.md แล้วตรวจสกิลทั้งสองตาม CLAUDE_REVIEW_PROMPT_TH.md ให้ครบ พร้อมเขียนรายงานภาษาไทย โดยยังไม่แก้สกิลหรือซอร์สแอป หากเปิดไฟล์ใดไม่ได้ ให้ระบุส่วนที่ยังตรวจไม่ได้ตามจริง"

**วิธีอ้างพาธในรายงาน:**
- `skills/...`, `review/...`, `README_TH.md` เป็นพาธภายในแพ็กเกจ `orbitlab-learning-v1/`
- พาธซอร์สแอปอ้างตาม repo โดยติดป้ายรุ่น ดังนี้
  - **[snapshot]** คือ commit `dba7b0a` (2026-09-28) ซึ่งตรงกับโฟลเดอร์ `source-reference/Claude code version` ทุกไฟล์เมื่อไม่นับ CRLF
  - **[main]** คือ `5374b6d` (2026-10-19) ซึ่งเป็น main ตอนตรวจและตอนทดลองชุดแรก หลังจากนั้น main เลื่อนไปที่ `63db68f` (#168) ซึ่งเพิ่มเฉพาะสกิลโครงการอีก 3 ตัวใน `.claude/skills/` แก้ `.gitignore` และเพิ่ม fragment ส่วน `src/`, `tests/` และ `package.json` เหมือน `5374b6d` ทุกไฟล์ ข้อเท็จจริงของแอปในรายงานนี้จึงใช้กับ main ปัจจุบันได้ สกิลทั้งสองของรายงานนี้อยู่บน branch ของ PR #169 และยังไม่อยู่ใน main
- เลขบรรทัดเป็นของรุ่นที่ระบุ

**ศัพท์ในรายงาน:**
- "แบบบทเรียน" และ "brief" คือ lesson brief ที่สกิลออกแบบส่งต่อ ส่วน "source-map" คือ `references/source-map.md` ของสกิล interactive
- ผู้ตรวจหลัก = ผู้เขียนรายงานนี้, ผู้ตรวจรายมิติ = agent ย่อยที่ตรวจทีละมิติ A–K, ผู้ตรวจซ้ำ = agent ที่พยายามหักล้างแต่ละ finding, ผู้วิจารณ์ = agent ที่ตรวจความรุนแรงและความครบถ้วน, ผู้ตัดสิน = agent ที่ตรวจผลการทดลองกับซอร์ส
- รหัสการทดลอง (T1a, T2e, T3a-o ฯลฯ) อธิบายไว้ในหัวข้อ 4.1

---

## สรุปสั้น

| ส่วน | คำตัดสิน | เหตุผลหลัก |
|---|---|---|
| `orbitlab-lesson-design` | **พร้อมใช้โดยมีข้อจำกัด** | หลักการสอนครบและใช้ได้จริง การทดลองแสดงว่าสกิลช่วยได้ชัดเมื่อเทียบกับรอบที่ไม่มีสกิล แต่ยังไม่บอกข้อจำกัดของ runtime หลายข้อ เช่น คำใบ้ร่วม 3 ข้อ การเปิดเฉลย และเกณฑ์ที่เครื่องตรวจได้ |
| `orbitlab-interactive-lesson` | **ต้องแก้ก่อนใช้** กับ main ปัจจุบัน (ถ้าใช้กับ snapshot `dba7b0a` จะเป็น "พร้อมใช้โดยมีข้อจำกัด") | `source-map.md` มาจาก commit 2026-09-28 แต่ติดป้ายว่า "2026-10-19" และเมื่อเทียบกับ main มีหลายข้อที่ผิดหรือชี้ไปผิดทาง การทดลองจริงพบว่าสกิลทำให้ผลแย่กว่าไม่มีสกิล 1 กรณี และพาให้เสนอสิ่งที่ขัดกับ lifecycle ของแอปอีก 1 กรณี (M-01) |
| Hohmann reference helper | **พร้อมใช้** ภายในขอบเขตที่ประกาศ | ตรงกับการอินทิเกรตเชิงตัวเลขแบบอิสระ (คลาด ~1e-14) และตรงกับค่าตัวอย่าง 6-1 ของ Vallado ทุกหลัก (ค่าคาดหมายจากเทสต์ของ repo ที่อ้างหนังสือ ไม่ได้เปิดหนังสือเอง) ข้อเสนอที่เหลือเป็นเรื่องการกันค่าผิดหน่วยและ convention ที่รัศมีเท่ากัน (P-23, P-24) |
| เอกสารและชุดหลักฐานส่งมอบ | **พร้อมใช้โดยมีข้อจำกัด** | hash ของไฟล์ตรงกับ manifest ครบ แต่มีข้ออ้างเกินหลักฐานบางข้อ: ลิงก์ตรวจได้แค่บนเครื่องเจ้าของ, forward test ทำกับรุ่นก่อนแก้, README บอกว่าตัวอย่าง "ครบ", และ CRLF/LF ปนกันทำให้ hash ข้ามแพลตฟอร์มไม่ตรง |

- **จำนวนประเด็น:** ต้องแก้ก่อนใช้ 1 ข้อ (รวบจาก 8 finding), ควรแก้ 15 ข้อ, ข้อเสนอเสริม 36 ข้อ ทุกข้อมีพาธจริง และมีเลขบรรทัดเมื่อปัญหาอยู่ที่ตำแหน่งเฉพาะ ข้อจากผู้ตรวจรายมิติและข้อเพิ่มเติม X1–X9 ผ่านการตรวจซ้ำแบบหาข้อโต้แย้งแล้ว ไม่มีข้อที่รายงานไว้ถูกหักล้าง (มีเพียงข้อสงสัยเรื่อง `SKILL.md:12` ที่ถูกตัดออก) ยกเว้น P-06 และระดับ "ควรแก้" ของ S-10 ซึ่งมาจากผู้ตัดสินรอบสุดท้ายและยังไม่ได้ตรวจซ้ำ ส่วนข้อที่รายงานนี้จัดระดับต่างจากผู้ตรวจซ้ำ (M-01, S-10, P-13) ให้เหตุผลไว้ในข้อนั้น
- **งานลำดับแรก:** อัปเดต `references/source-map.md` และ `SKILL.md` บรรทัด 35–36 และ 56 ของสกิล interactive ให้ตรงกับ main เป็นงานแก้เอกสารล้วน จากนั้นทดลองกรณี 2 และ 3 ซ้ำ (หัวข้อ 7)

---

## 1. คำตัดสินแยก 4 ส่วน

### 1.1 `orbitlab-lesson-design` — พร้อมใช้โดยมีข้อจำกัด

- **ครอบคลุม:** ไฟล์ทั้ง 5 ของสกิล (`SKILL.md`, `references/design-contract.md`, `references/learning-patterns.md`, `assets/lesson-brief-template.md`, `agents/openai.yaml`) ใช้ได้ทั้งกับ main และ snapshot เพราะเนื้อหาเป็นหลักการแบบ "ตรวจก่อนอ้าง" ไม่ได้ผูกกับชื่อไฟล์หรือเวอร์ชันเฉพาะ
- **จุดแข็ง (ยืนยันแล้ว):**
  - เป้าหมายเป็นพฤติกรรมที่วัดได้ มี ID
  - วงจร Predict → Observe → Explain → Transfer ต้องเก็บเหตุผล ไม่ใช่แค่ตัวเลข
  - ควบคุมตัวแปร
  - แยก "ภารกิจผ่าน" ออกจาก "เข้าใจ"
  - แยกคำตอบผิด ข้อมูลไม่พอ และนอกขอบเขตแบบจำลอง
  - คำใบ้เป็นลำดับ และมีรูบริกที่มีระดับ "ยังประเมินไม่ได้"
  - คำขอออกแบบไม่ถือเป็นการอนุญาตให้ลงมือ (`SKILL.md:16`)
- **หลักฐานพฤติกรรม:**
  - ทั้งสองโมเดลเลือกสกิลนี้เองจากพรอมป์ธรรมดา
  - ทุกรอบที่ใช้สกิลตรวจ repo ก่อนออกแบบ และส่งเอกสารที่มี OBJ/ACT/CRIT/HINT
  - รอบที่ไม่มีสกิลไม่อ่าน repo เลย และไปเริ่มเขียนหน้า HTML (ข้อ 4.2 กรณี 1)
- **ข้อจำกัด:** ควรแก้ S-04 ถึง S-07 และ S-11 รวมถึงข้อเสนอเสริมที่เกี่ยวกับสกิลนี้ ได้แก่ P-01, P-03, P-06 ถึง P-11, P-33 และ P-34 ถึง P-36 ทุกข้อเป็นการขาดข้อมูล runtime หรือขาดข้อกำหนด ไม่มีข้อใดเป็นคำสั่งผิดที่ทำให้แบบบทเรียนใช้ไม่ได้ เพราะแบบบทเรียนเป็นเอกสาร ไม่ใช่ schema
- **ยังไม่ได้พิสูจน์:** ผลกับผู้เรียนจริง และการทดลองบน snapshot (ทุกการทดลองรันบน main)

### 1.2 `orbitlab-interactive-lesson` — ต้องแก้ก่อนใช้ (กับ main ปัจจุบัน)

**ครอบคลุม:** ไฟล์ทั้ง 7 ของสกิล เมื่อใช้กับซอร์สที่ main ของ repo `ROYIN001/Orbitlab` (รอบนี้บันทึกสกิลไว้ใน PR #169 ซึ่งจะเข้า main เมื่อ merge)

**เหตุผล (รายละเอียดใน M-01):**
- `references/source-map.md:3` เขียนว่า "Navigation snapshot: 2026-10-19" แต่เนื้อหาตรงกับ `dba7b0a` (2026-09-28) ซึ่งห่างจาก main 707 commit และไฟล์ซอร์ส 43 จาก 66 ไฟล์ต่างกันแล้ว
- คำเตือน "verify locally" จึงอ่อนลง เพราะวันที่ทำให้ดูเหมือนข้อมูลเป็นปัจจุบัน
- ความล้าสมัยอยู่ตรงแกนคุณค่าของสกิลพอดี:
  - (ก) สกิลบอกว่าไม่มี browser test ทั้งที่ main มี `test:browser` และ Playwright journeys
  - (ข) สกิลสั่งให้ invalidate และ suspend ทันที ซึ่งขัดกับ held-edit lifecycle ที่ main แก้ไว้แล้ว (LUI-01)
  - (ค) สกิลอ้าง "existing revision/run mechanism" แต่ไม่ชี้กลไกจริง เช่น `ResultSlot`
- **การทดลองจริงยืนยันผลเสียที่เกิดได้ (เกิดใน 2 จาก 10 รอบที่เกี่ยวข้องกับกรณี 2 และ 3 และรอบซ้ำไม่เกิดซ้ำ):**
  - กรณี 2 รอบที่โมเดลเลือกโหลดสกิลเองเสนอสร้าง `runId` ใหม่ และอ้างผิดว่า `telemetry.revision` ใช้แยก run ได้ ขณะที่รอบที่ไม่มีสกิลหา `ResultSlot` เจอเอง
  - กรณี 3 รอบที่โหลดสกิลเสนอให้หยุดผลตรวจของเที่ยวบินที่บินแล้ว ซึ่งขัดกับ ADR ของแอป

**ถ้าใช้กับ snapshot `dba7b0a`:**
- ข้อเท็จจริงใน source-map ถูกต้องเกือบทั้งหมด ยืนยันโดยผู้ตรวจซ้ำ
- คำตัดสินจะเป็น "พร้อมใช้โดยมีข้อจำกัด" (ยังมี S-09 ตารางเทสต์ผิด และข้อควรแก้อื่นของสกิลนี้)

**ข้อโต้แย้งที่แข็งที่สุดต่อคำตัดสินนี้ (บันทึกไว้ตามจริง):**
- ผู้ตรวจรายมิติและผู้ตรวจซ้ำทุกคนจัดแต่ละข้อไว้ไม่เกิน "ควรแก้" เพราะสกิลสั่งให้ตรวจในเครื่องก่อน
- รอบที่เรียกสกิลแบบระบุชื่อ (T2e, T3e) และรอบของโมเดล 2 (T2a-o) ผ่านทั้งหมด
- รอบซ้ำหลัง #168 (T2a5, T2a5-o) หา `ResultSlot` เจอ และ T3a5, T3a5-o ไม่ได้ทำผิดแบบ T3a ความผิดพลาดจึงเกิดเป็นบางครั้ง ไม่ใช่ทุกครั้ง
- ผู้ตรวจหลักและผู้วิจารณ์ด้านความรุนแรงตัดสินแบบรวมเป็น "ต้องแก้ก่อนใช้" เพราะ:
  - สกิลถูกติดตั้งใน repo นี้แล้ว และถูกเลือกโหลดเองจริง
  - ป้ายวันที่ทำให้ข้อบรรเทาใช้ไม่ได้
  - มีหลักฐานพฤติกรรมว่าสกิลพาไปผิดทาง
- การแก้เป็นงานเอกสารล้วนและทำได้เร็ว

### 1.3 Hohmann reference helper — พร้อมใช้ (ภายในขอบเขตที่ประกาศ)

**ครอบคลุม:** `skills/orbitlab-interactive-lesson/scripts/hohmann_reference.py` สำหรับวงโคจรวงกลมสองวง ระนาบเดียว แรงดลทันที และสองวัตถุ โดยป้อนหน่วย SI

**หลักฐานอิสระ:**
- RK4 สองวัตถุที่เขียนแยก (เริ่มจากวงกลม บวก Δv1 แล้วอินทิเกรตครึ่งคาบ) ได้รัศมี r2 คลาดสัมพัทธ์ระดับ 1e-14 ทั้งขาขึ้นและขาลง และ Δv2 ทำให้วงโคจรกลม (ช่วงรัศมีต่างกัน < 1e-4 m)
- กรณี 300 กม. → GEO ได้ 3,892.56 m/s และ 5.275 ชม.
- ตัวอย่าง 6-1 ของ Vallado ได้ 2.457038 / 1.478187 / 3.935224 km/s และ 5.256713 ชม. ตรงทุกหลัก ค่าคาดหมายนำมาจากคอมเมนต์หัวไฟล์ `tests/maneuvers.test.ts:4-6` และ assertion ที่ `:59-65` ของ repo ซึ่งอ้างหนังสือ แต่ไม่ได้เปิดหนังสือตรวจเอง

**พฤติกรรมอื่นที่ยืนยันแล้ว:**
- ค่า 0, ค่าลบ, NaN และ ±inf ถูกปฏิเสธ
- CLI ไม่พิมพ์ JSON เมื่อ input ผิด
- แยก signed impulse กับผลรวมขนาดชัดเจน
- convention เมื่อรัศมีเท่ากันถูกบันทึกไว้แล้ว
- คำเตือนใน `SKILL.md:63` ว่าอย่าเทียบ convention นี้กับ API ที่คืนครึ่งคาบนั้นถูกต้อง เพราะ `hohmannDv` คืนครึ่งคาบเมื่อรัศมีเท่ากันจริง (`src/orbit/maneuvers.ts:385-390` [snapshot] = [main])

**ข้อเสนอเสริม (ไม่กระทบคำตัดสิน):** P-23 ไม่เตือนเมื่อป้อนรัศมีเป็น กม. หรือค่าสุดขั้ว และ P-24 ผลไม่ต่อเนื่องที่รัศมีเท่ากันพอดี

### 1.4 เอกสารและชุดหลักฐานส่งมอบ — พร้อมใช้โดยมีข้อจำกัด

**ครอบคลุม:** `README_TH.md`, `CLAUDE_FINAL_REVIEW_TH.md`, `MANIFEST.json` และไฟล์ใน `review/` ทั้งหมด รวมถึงเอกสารระดับ bundle

**สิ่งที่ยืนยันได้ (ตรวจซ้ำเองทั้งหมด):**
- bundle MANIFEST ตรง 96/96 รายการ และ package MANIFEST ตรง 23/23
- hash ใน `installation-status.json` ตรงกับไฟล์ที่แพ็ก
- snapshot ตรงกับ `dba7b0a`
- `check_reference.py` ผ่าน 10/10
- เอกสารส่วนใหญ่แยกระดับหลักฐานอย่างซื่อตรง

**ข้อจำกัด:**
- S-13 ตัวอย่าง `review/HOHMANN_PILOT_TH.md` ไม่ทำตามสัญญาของสกิล แต่ README บอกว่า "ครบ"
- S-14 ผลตรวจลิงก์ใช้ได้เฉพาะบนเครื่องเจ้าของ
- S-15 forward test ของสกิล interactive ทำกับรุ่นก่อนแก้
- S-12 CRLF/LF ปนกัน
- P-30 ถึง P-32 เรื่องอื่น ๆ

ใช้ชุดนี้เป็นบันทึกการส่งมอบและหลักฐานตัวตนไฟล์ได้ แต่ไม่ควรอ้าง README หรือ QA_SUMMARY เป็นหลักฐานความพร้อมของสกิล จนกว่าจะติดหมายเหตุแก้ไข

---

## 2. Findings

แต่ละข้อมี ID รวมของรายงานนี้ (M-, S-, P-) และ ID ต้นทางของผู้ตรวจในวงเล็บ หลักฐานฉบับเต็มของ ID ต้นทางอยู่นอก repo และจะหายเมื่อ session ถูกเก็บ (หัวข้อ 5.2)

- **ระดับ:** ต้องแก้ก่อนใช้ / ควรแก้ / ข้อเสนอเสริม
- **ชนิด:**
  - **ข้อผิดที่ยืนยันแล้ว**: ผิดจริงในรุ่นที่ระบุ
  - **ความเสี่ยง**: จริง แต่เกิดผลเฉพาะบางสถานการณ์
  - **รสนิยม**: ไม่ผิด แต่ปรับแล้วอ่านหรือดูแลง่ายขึ้น

### 2.1 ต้องแก้ก่อนใช้

#### M-01 `source-map.md` ของสกิล interactive มาจาก commit 2026-09-28 แต่ติดป้ายว่า 2026-10-19 และเมื่อใช้กับ main สกิลมีคำสั่งที่ผิดหรือชี้ไปผิดทาง

(AJ-01, F-01, F-02, K-03, I-F3, G-01, G-03, F-03 รวมกัน)

**ชนิด:** ความเสี่ยงที่มีข้อผิดที่ยืนยันแล้วอยู่ด้วย ข้อเท็จจริงเรื่อง browser test (`source-map.md:75`, `implementation-checks.md:48`) และรุ่นไฟล์บทเรียน/`readLesson` (`source-map.md:29-30`) ผิดใน main ส่วนคำสั่ง invalidate และ identity นำไปสู่งานผิดในการทดลองจริง

**ไฟล์และบรรทัด (แพ็กเกจ):**
- `skills/orbitlab-interactive-lesson/references/source-map.md:3` ป้ายวันที่
- `source-map.md:15-31` ตาราง schema/catalogue
- `source-map.md:52-57` sessions และ guards
- `source-map.md:75` "does not establish … a browser-test script"
- `source-map.md:77-85` ตารางเทสต์
- `references/implementation-checks.md:32` "Use the existing revision/session identity if available"
- `references/implementation-checks.md:48` "The 2026-10-19 inspected source exposed `typecheck`, `build`, `test`, `test:heavy` and `test:sixdof-fleet`"
- `SKILL.md:35` "Invalidate dependent results and evaluation immediately. Ignore stale or out-of-order worker completions using the existing revision/run mechanism or a narrowly added identity"
- `SKILL.md:36` "Suspend affected current-attempt evaluation during that interval"
- `SKILL.md:56` "Do not invent a `test:browser` script"

**หลักฐานในซอร์ส:**
- `source-reference/SNAPSHOT_PROVENANCE.json` บันทึก `git rev-parse HEAD = dba7b0a2d5994f90552e3eca36a91cd32252ce12` ผู้ตรวจยืนยันว่าทั้ง 66 ไฟล์ตรงกับ commit นี้เมื่อไม่นับ CRLF
- main `5374b6d` อยู่ถัดไป 707 commit และไฟล์ต่างกัน 43 จาก 66
- **browser test:** [main] `package.json:15` `"test:browser": "npm run build && node tests/browser/run.mjs"`, `:16` `test:browser:smoke`, `:30-31` `playwright 1.63.0` และมี journey 42 ไฟล์ใน `tests/browser/journeys/` ส่วน [snapshot] `package.json` ไม่มีสิ่งเหล่านี้ สคริปต์ทั้งสองและ `playwright` เพิ่มใน `0f196f9` (พร้อม harness และ journey แรก `pwa-offline`) ส่วน `playwright-core` เพิ่มใน `c648e08` และ journey อื่นเพิ่มภายหลัง ทุก commit เหล่านี้ไม่อยู่ใน snapshot
- **held edits:** [main] `src/ui/flight-lifecycle.ts:44-55` ระบุว่า การแก้ setup หลังปล่อยจรวด "is held in the setup as the configuration of the next launch … the flight and its recording are not touched" และ `src/main.ts:614-616` เรียก `previewsChange` (แก้บั๊ก LUI-01 ใน `d7ee6fb` หลัง snapshot)
- **identity ที่มีจริง (ทั้งสองรุ่น):**
  - เลข session ต่อภารกิจ: `src/main.ts:1894` [main] `++this.sessionCount` และ `src/session/session.ts:158` [main] `data.session !== this.session`
  - identity ของวัตถุ sim ใน LessonMode: `src/ui/lessons/lesson-mode.ts:729` [main] `if (sim !== a.sim)`
- **identity ที่มีเฉพาะ main:** `ResultSlot`/`Latest` (`src/ui/result-slot.ts`), `AttitudeTuneRunner` (`src/physics/attitude-tune-job.ts:100-147`) และ `checkDesign`/`designStale` (`lesson-mode.ts:451-536`)
- **ตัวหลอก:** `telemetryRevision` (`src/physics/simulation.ts:122-124` [main]) เป็นรุ่นของการบีบอัด telemetry และเริ่มที่ 0 ทุกภารกิจ ส่วน `ack` เป็น id ของ backpressure ทั้งสองไม่ใช่ตัวตนของ run
- **schema:** [main] `src/lessons/lesson-file.ts:69` `LESSON_FORMAT_VERSION = 3` (สกิลบอก 1), `src/lessons/catalog.ts:22` `readAnyLesson` (สกิลบอก `readLesson`) และ `src/lessons/types.ts:191, 258, 297` มี `CaseLesson`, `DesignLesson` และ `CatalogLesson` ซึ่งสกิลไม่กล่าวถึง

**หลักฐานจากการทดลอง (ข้อ 4):**
- T2a (โมเดล 1 เลือกโหลดสกิลเอง) เขียนว่า `RecordingDelta.telemetry.revision` "ใช้ผูกกราฟกับ run ได้" และเสนอสร้าง `runId`/`configSignature` ใหม่ ขณะที่ T2b ซึ่งไม่มีสกิลหา `ResultSlot` เจอเอง ผู้ตัดสินกรณี 2 ระบุว่า T2a ด้อยกว่า baseline ในการหากลไกเดิม และผู้วิจารณ์ด้านความรุนแรงระบุว่าเป็นกรณีเดียวในชุดที่สกิลทำให้ผลแย่กว่าไม่มีสกิล
- T3a (โหลดสกิลเอง) เสนอว่า "ผลตรวจรอบปัจจุบันต้องหยุดตั้งแต่ตอนพิมพ์ … ต้องไม่รับผลจาก run เก่า" ซึ่งขัดกับ held-edit lifecycle ข้อเสนอนี้มาจาก `SKILL.md:35-36` และ T3e แปล `SKILL.md:36` เกือบคำต่อคำไปเป็น gap
- T2a, T2e และ T2a-o ต้องชี้เองว่า source-map ขัดกับ `package.json` เรื่อง `test:browser`
- ในการทดลองส่งต่อ T8h อ้าง "ไฟล์บทเรียน v1" และ T8h-o อ้าง `readLesson` ตาม `source-map.md:29-30` ซึ่งที่ main เป็น v3 และ `readAnyLesson` แล้ว

**สถานการณ์:** Claude Code ใน repo นี้โหลดสกิลเองเมื่อมีคำขอทำบทเรียนโต้ตอบ แล้วเชื่อ source-map ซึ่งดูเป็นปัจจุบัน ผลที่ตามมา:
- ข้ามการตรวจในเบราว์เซอร์ที่ทำได้จริง
- สร้างกลไก identity ซ้ำ หรือใช้ตัวหลอก
- หรือเพิ่ม hook ที่ล้างเกรดของเที่ยวบินที่บินแล้ว ซึ่งเป็นการถอย LUI-01

**ผลกระทบ:** เสี่ยงบั๊กกลับมา (regression) ใน lifecycle ที่แก้แล้ว หลักฐาน UI อ่อนลง และเกิดโค้ดซ้ำซ้อน ผู้ใช้เชื่อถือสกิลน้อยลง

**วิธีแก้ขั้นต่ำ (แก้เอกสารล้วน):**
1. `source-map.md:3` เปลี่ยนเป็น: "Source revision: commit `dba7b0a` (2026-09-28), inspected 2026-10-19. `main` has moved on (2026-10-19: `5374b6d`, 707 commits later). Before relying on a row, run `git log --oneline dba7b0a..HEAD -- <path>` and re-read the symbol." แล้วแก้ `implementation-checks.md:48` ในทำนองเดียวกัน
2. เพิ่มหัวข้อสั้น "Known drift at main (verify)" ใน source-map:
   - `test:browser`/`test:browser:smoke` (Playwright, `tests/browser/journeys/`)
   - `CatalogLesson = Lesson | CaseLesson | DesignLesson`, `LESSON_FORMAT_VERSION = 3`, `readAnyLesson` และ `TEACHER_TOOLS = false` ใน `src/ui/held.ts`
   - `gradeShown`/`gradingEndEvent` และ verdict `passedWithHelp` (D-6)
   - held edits หลังปล่อยจรวด (`flight-lifecycle.ts` `previewsChange`)
   - identity ที่มีอยู่: session number, sim identity, `ResultSlot`/`Latest`, `AttitudeTuneRunner`, `checkDesign`/`designStale` และคำเตือนว่า `telemetryRevision` และ `ack` ไม่ใช่ run identity
3. `SKILL.md:35` เปลี่ยนเป็น: "Treat a parameter edit as a new configuration for the run it feeds. A result stays tied to the configuration and run that produced it (e.g. `sim.cfg`); invalidate only results whose own inputs changed. An edit that only prepares the next run must not erase a flown flight's frozen evidence. Reject stale or out-of-order completions with an identity that already exists (session number, simulation object, result slot or job id plus input signature) before adding one."
4. `SKILL.md:36` เติม: "Find whether a draft interval actually reaches evaluation in the selected checkout before adding a suspend mechanism (in Orbitlab flight lessons, inputs are disabled while flying)."
5. `SKILL.md:56` เปลี่ยนเป็น: "Use the checkout's existing scripts, including a browser script if `package.json` defines one; never invent a script that is absent."

**วิธีตรวจยืนยันหลังแก้:**
- `grep -n "dba7b0a" references/*.md` ต้องพบ
- `grep -n "test:browser" SKILL.md references/*.md` ต้องไม่มีประโยคที่สื่อว่าไม่มีหรือห้ามใช้
- รันการทดลองกรณี 2 และ 3 ซ้ำแบบเดียวกับข้อ 4 บน main ทั้งรอบที่โมเดลเลือกเองและรอบที่ระบุชื่อสกิล ผลต้องอ้าง session/sim identity หรือ `ResultSlot` และไม่เสนอให้ล้างเกรดที่ตรึงแล้วเพราะ held edit
- แผนงานที่แก้ UI ต้องเสนอ `test:browser:smoke` หรือ journey ที่เกี่ยวข้อง หรือให้เหตุผลว่าทำไมไม่รัน

### 2.2 ควรแก้

**S-01 สกิลไม่ชี้กติกาโครงการที่ใช้จริง และบางข้อเข้มกว่าสกิล** (AJ-02) — ความเสี่ยง
- **ไฟล์:** `skills/orbitlab-interactive-lesson/SKILL.md:12, 20`; `references/source-map.md:7`; `assets/implementation-report-template.md`
- **หลักฐาน:**
  - [main] ไม่มี `CLAUDE.md` หรือ `AGENTS.md` ในทุกระดับ กติกาอยู่ใน `docs/DECISIONS.md:3` ("When this file and an older document disagree, this file is right") และ `:19` D-17 "Runtime dependencies stay at three.js only"
  - `docs/development/SESSION-PROTOCOL.md:40` (D-65 บันทึกคำอนุญาตคำต่อคำ), `:43` (D-25 ราว 400 บรรทัดต่อ PR และรายงานใน `docs/development/reports/<package>.md`) และ `:57` (ห้ามแก้ CHANGELOG/PROGRESS ให้ใช้ `changes/<branch>.md`)
  - ส่วน `SKILL.md:20` บอกเพียง "Add a library only for a demonstrated gap"
- **สถานการณ์:** ผู้ใช้ขอสมการที่อ่านง่าย agent เพิ่ม runtime library สำหรับแสดงสมการ ซึ่งขัด D-17 และอาจเกิน budget แก้ CHANGELOG โดยตรง และไม่บันทึกคำอนุญาต
- **ผลกระทบ:** PR ถูกตีกลับหรือต้องทำซ้ำ (PR template และ CI จับได้บางส่วน)
- **วิธีแก้:** เพิ่มหัวข้อ "Project rules" ใน source-map ที่ชี้ `docs/DECISIONS.md` และ `SESSION-PROTOCOL.md` พร้อมสรุป D-17, D-25, D-38, D-65 และกติกา fragment แล้วแก้ `SKILL.md:20` เป็น "…and only if the project's dependency policy allows it"
- **ตรวจยืนยัน:** `grep -n DECISIONS.md` ในสกิล แล้วทดลองคำขอที่ล่อให้เพิ่ม library

**S-02 ข้อความ "Claude-reviewed" ผูกบทบาทผู้ตรวจไว้กับชื่อผลิตภัณฑ์** (AJ-03, K-10) — ความเสี่ยง
- **ไฟล์:** `skills/orbitlab-interactive-lesson/SKILL.md:61` "Do not mark work Claude-reviewed unless that review actually occurred." และ `assets/implementation-report-template.md:36` "สถานะการตรวจของ Claude: ยังไม่ตรวจ / ตรวจแล้วพร้อมหลักฐานอ้างอิง"
- **สถานการณ์:** เมื่อ Claude Code เป็นผู้ลงมือเอง อาจกรอกว่า "ตรวจแล้ว" จากการตรวจตัวเอง ขณะที่ D-25 กำหนดให้มีผู้ตรวจคนที่สองสำหรับงาน P0/P1 ฟิสิกส์ และการเก็บข้อมูล
- **ผลกระทบ:** รายงานอ้างการตรวจอิสระเกินจริง
- **วิธีแก้:** เปลี่ยนเป็น "independently reviewed (by someone other than the implementer)" และในแม่แบบเปลี่ยนเป็น "การตรวจอิสระ: ผู้ตรวจ/วันที่/หลักฐาน หรือ ยังไม่มี"
- **ตรวจยืนยัน:** `grep -n Claude` ในโฟลเดอร์สกิลต้องไม่พบบทบาทที่ผูกกับผลิตภัณฑ์

**S-03 คำสั่ง "Preserve the learner's prediction" ไม่บอกว่า LessonMode ล้างคำตอบเมื่อมีเที่ยวบินใหม่** (G-02) — ความเสี่ยง
- **ไฟล์:** `skills/orbitlab-interactive-lesson/SKILL.md:34`; `references/source-map.md:38`
- **หลักฐาน:**
  - [snapshot] `lesson-mode.ts:247-253` ล้าง `a.answers = {}` และ `a.frozen = null` เมื่อ `sim !== a.sim`
  - [main] `:729-738` ล้าง drafts, seen และ frozenAt เพิ่มด้วย
  - ช่องคำตอบแสดงหลังผลสุดท้ายเท่านั้น ([snapshot] `:395`, [main] `:999`)
  - เกณฑ์ `answer` ปัจจุบันเป็น "ค่าที่อ่านจากเที่ยวบินที่บินแล้ว" (`src/i18n/en.ts:4357` [main] "Work out these numbers for your flight") ไม่ใช่คำทำนาย
- **การทดลอง:** T3a โหลดสกิลแล้วเรียกการล้างนี้ว่าข้อบกพร่องที่ควรแก้ ผู้ตัดสินตัดสินว่าผิด
- **สถานการณ์:** agent ทำบทเรียนแบบทำนาย → บิน → สังเกต โดยเก็บคำทำนายไว้ใน `Active.answers` หรือเกณฑ์ `answer` เมื่อผู้เรียนเปลี่ยนค่าและได้เที่ยวบินใหม่ แอปจะล้างคำทำนายทิ้ง
- **ผลกระทบ:** ผู้พัฒนาอาจเก็บคำทำนายไว้ในที่ที่ถูกล้าง หรือไป "แก้" พฤติกรรมที่ตั้งใจไว้
- **วิธีแก้:** เติมใน source-map: "`LessonMode.update` treats any new `host.sim()` as a new flight and clears answers/frozen grade; existing `answer` criteria are post-flight readings. Store a prediction as separate attempt state."
- **ตรวจยืนยัน:** ทดลองกรณี 3 ซ้ำ ผลต้องไม่เสนอให้เก็บ answer เป็นคำทำนาย

**S-04 การเปิดเฉลยและการผ่านโดยมีตัวช่วยไม่ถูกบอก ทั้งที่มีผลต่อคำใบ้และ worked example** (BC-03, H-F2, I-F1, F-05) — ความเสี่ยง
- **ไฟล์:** `skills/orbitlab-interactive-lesson/references/diagnostic-feedback.md:34` "Keep help available without penalty…"; `references/source-map.md:39-40`; `skills/orbitlab-lesson-design/SKILL.md:75`; `references/learning-patterns.md:54`
- **หลักฐาน:**
  - [snapshot] `lesson-mode.ts:408-409` แสดง `✗ … expected <value>` ทันทีเมื่อตอบผิด ผู้เรียนคัดลอกแล้วได้ pass
  - [main] `lesson-mode.ts:1013` "the value is shown only when asked for, and then passes only with help", `grader.ts:144` และ `types.ts:345` verdict `'pass' | 'passedWithHelp' | 'fail' | 'open'`
  - `docs/DECISIONS.md:14` (D-6) "a revealed answer still cannot count as an unaided pass"
  - grep ทั้งสองสกิลไม่พบ `revealed`/`passedWithHelp`
- **สถานการณ์:** agent เพิ่ม worked example ที่เผยค่าคำตอบไว้ใน `lesson.hints` คงที่ ผู้เรียนพิมพ์ตามแล้วได้ pass แบบ "ไม่ได้รับความช่วยเหลือ" หรือ agent ลบ passedWithHelp เพราะเห็นว่าเป็น "penalty"
- **ผลกระทบ:** บันทึกผลเป็นเท็จ และขัดการตัดสินใจของเจ้าของ (D-6)
- **วิธีแก้:** เพิ่มย่อหน้าใน source-map และ diagnostic-feedback: "Answer disclosure: at `dba7b0a` a wrong typed answer prints the expected value; at main values are revealed only via 'Show the answers' (`revealAnswers` → `recordRevealed`) and yield `passedWithHelp` (D-6). Any hint or worked example that discloses an expected value for the same flight must go through that path or use different numbers; handle all four verdicts."
- **ตรวจยืนยัน:** `grep passedWithHelp` แล้วทดลองคำขอเพิ่ม worked-example hint

**S-05 สกิลออกแบบไม่แยกเกณฑ์ที่ runtime ตรวจได้ออกจากเกณฑ์ที่ต้องใช้คน** (BC-01) — ความเสี่ยง
- **ไฟล์:** `skills/orbitlab-lesson-design/references/design-contract.md:58-60, 82`; `assets/lesson-brief-template.md:64-66`; `skills/orbitlab-interactive-lesson/references/source-map.md:26`
- **หลักฐาน:**
  - [snapshot] `src/lessons/types.ts:62` "checked against the one this flight measured"
  - `grader.ts:118` `const expected = MEASURES[c.measure].read(flight, end)`
  - verdict คิดจากเกณฑ์ใน runtime เท่านั้น (`grader.ts:192-195`) แล้วแสดง pass พร้อม debrief
  - ไม่มี criterion สำหรับข้อความอิสระหรือคำทำนาย
- **สถานการณ์:** brief มีเกณฑ์คำอธิบายที่ต้องให้ผู้สอนตรวจ แต่แอปขึ้น "ผ่าน" ทันทีที่เกณฑ์ตัวเลขผ่าน หรือผู้พัฒนาพยายามใช้ `answer` กับค่าวิเคราะห์ที่ไม่มี MeasureId รองรับ
- **ผลกระทบ:** "ภารกิจผ่าน" ถูกแสดงเหมือน "เรียนผ่าน"
- **วิธีแก้:** เพิ่มคอลัมน์ "ตรวจโดย: runtime (kind) / ผู้สอน / ตนเอง" ใน contract และ template และอธิบายใน source-map ว่า `answer` = ค่าที่วัดจากเที่ยวบิน และ verdict/progress ครอบคลุมเฉพาะเกณฑ์ใน runtime
- **ตรวจยืนยัน:** แปลง brief ตัวอย่างเป็นแผน implementation แล้วดูว่าแยกสองกลุ่มได้

**S-06 บันไดคำใบ้ไม่ตรงกันระหว่างสองสกิล และไม่ตรงกับ runtime ที่มีคำใบ้ร่วม 3 ข้อ** (BC-02, F-08) — ความเสี่ยง
- **ไฟล์:** `skills/orbitlab-lesson-design/SKILL.md:74` (4 ขั้น: attention cue → model relationship → guided next experiment → worked example); `skills/orbitlab-interactive-lesson/references/diagnostic-feedback.md:30-32` (3 ขั้น นิยามต่างกัน); `source-map.md:21, 39`
- **หลักฐาน:**
  - `tests/lessons.test.ts:73` [snapshot] / `:75` [main] `expect(l.hints.length, l.id).toBe(3)`
  - hints เป็นรายการเดียวที่ใช้ร่วมกันทุกเกณฑ์ และ `hintsShown` สะสมต่อบทเรียนข้ามทุก attempt ([snapshot] `lesson-mode.ts:306`)
  - [main] `progress.ts:280` clamp ไว้ที่ 3
- **สถานการณ์:** ผู้ออกแบบทำคำใบ้ 4 ขั้นต่อเกณฑ์ เมื่อผู้พัฒนาใส่เป็น built-in เทสต์จะล้ม หรือต้องตัดเนื้อหาเอง
- **ผลกระทบ:** เจตนาของคำใบ้หายไปตอนส่งต่อ
- **วิธีแก้:**
  - ระบุใน source-map ว่า built-in ต้องมี 3 ข้อพอดี เป็นรายการเดียวร่วมกัน และนับสะสม
  - ปรับนิยามขั้นของทั้งสองสกิลให้ตรงกัน
  - ระบุให้วาง worked example นอก `hints` หรือทำเป็นส่วนขยาย
- **ตรวจยืนยัน:** grep นิยามบันไดทั้งสองสกิลให้ตรงกัน

**S-07 ไม่มีกรณีตรวจรับเชิงลบ** (BC-04) — ความเสี่ยง

กรณีที่ขาด: ค่าเริ่มต้น ค่าที่ไม่เกี่ยว หรือการปัดเศษ ต้องไม่ทำให้ผ่าน
- **ไฟล์:** `skills/orbitlab-lesson-design/SKILL.md:68-77`; `references/design-contract.md:92`; `assets/lesson-brief-template.md:102-106`
- **หลักฐาน:** contract ครอบกรณีปกติ ผลเก่า และหน่วย แต่ไม่ครอบกรณี "เริ่มมาก็ผ่านแล้ว" ส่วน [main] `docs/LESSON-REVIEW-CHECKLIST.md:44-45` ของโครงการเองกำหนดว่า "cannot pass through rounding, an unrelated setting or an already-satisfied start"
- **สถานการณ์:** ผู้ออกแบบตั้งเกณฑ์ที่ภารกิจตั้งต้นผ่านอยู่แล้ว หรือผ่านได้ด้วยการเปลี่ยนค่าที่ไม่เกี่ยวกับแนวคิด
- **ผลกระทบ:** ผู้เรียนเลื่อน slider หรือกดบินแล้วผ่านโดยไม่ต้องคิด ซึ่งตรงกับข้อกังวลในมิติ B
- **วิธีแก้:** เพิ่มข้อกำหนด negative acceptance ใน SKILL.md, contract §7 และ template §9 แล้วชี้ไปที่ `docs/LESSON-REVIEW-CHECKLIST.md`
- **ตรวจยืนยัน:** ออกแบบบทเรียนใหม่ด้วยสกิล แผนตรวจรับต้องมีกรณีค่าเริ่มต้นต้องไม่ผ่าน

**S-08 เช็กลิสต์การเพิ่ม field ใหม่ไม่มี persistence** (F-07) — ความเสี่ยง
- **ไฟล์:** `skills/orbitlab-interactive-lesson/SKILL.md:46` ระบุเพียง "validation, types, import/export, UI and tests"
- **หลักฐาน:** `src/lessons/progress.ts:65` [snapshot] / `:304` [main] โหลด `customLessons` กลับด้วยการ cast (`as Lesson[]` / `as CatalogLesson[]`) โดยไม่ parse ซ้ำ
- **สถานการณ์:** ผู้พัฒนาเพิ่ม field บังคับใหม่ และแก้ parser, UI และ tests ครบตาม `SKILL.md:46` แต่บทเรียนที่ผู้เรียนนำเข้าไว้ใน localStorage ไม่มี field นั้น และถูกโหลดกลับมาโดยไม่ตรวจ
- **ผลกระทบ:** field บังคับใหม่ทำให้บทเรียนที่ผู้เรียนนำเข้าไว้ก่อนหน้าพังแบบเงียบ
- **วิธีแก้:** เพิ่มคำว่า "persisted copies (progress `customLessons`, records)" ใน SKILL.md:46 และระบุเรื่อง cast ใน source-map:40
- **ตรวจยืนยัน:** grep และทดลองงานเพิ่ม field แล้วดูว่ามีแผนทดสอบข้อมูล localStorage เก่า

**S-09 ตารางเลือกเทสต์จัดหมวดผิด** (H-F3) — ข้อผิดที่ยืนยันแล้ว
- **ไฟล์:** `skills/orbitlab-interactive-lesson/references/source-map.md:80` "Lesson UI logic and history | `tests/lessons-ui-core.test.ts`, `lessons-history.test.ts`, `lessons-round2.test.ts`"
- **หลักฐาน:**
  - `lessons-history.test.ts:29` [snapshot] คือ "track 5, historical missions" ตั้ง timeout 120–180 วินาที
  - `lessons-round2.test.ts` เป็นการบินบทเรียน track 2/4/5
  - เทสต์ freeze/regrade จริงอยู่ที่ `tests/lessons.test.ts:220` "keeps the grade taken at the end, checking only the answers again"
  - ตารางยังขาด `tests/equations.test.ts` และ `tests/tune-job.test.ts` (P-12)
- **สถานการณ์:** ผู้พัฒนาแก้ตรรกะ freeze/regrade แล้วเลือกเทสต์ตามตาราง จึงรันชุดบินที่ใช้เวลานาน แต่ข้าม `lessons.test.ts` ('the grader')
- **ผลกระทบ:** แก้ตรรกะ regrade แล้วเลือกเทสต์ผิดชุด ทำให้ regression หลุด และเปลืองเวลาทดสอบ
- **วิธีแก้:** แยกแถว "Grader, freeze, regrade: `lessons.test.ts` ('the grader')" ออกจาก "Built-in lesson flights (long, normal suite): `lessons-history`, `lessons-round2`" และ main มี `tests/lesson-grading-end.test.ts` เพิ่ม
- **ตรวจยืนยัน:** เทียบชื่อ `describe` ของแต่ละไฟล์กับแถว

**S-10 สกิล interactive ไม่สั่งให้รักษาความหมายของเกณฑ์และรหัสตามแบบบทเรียน และไม่สั่งให้รายงานเมื่อแก้** (BC-05, ผู้ตัดสินการส่งต่อ) — ความเสี่ยง (ผู้ตรวจซ้ำลด BC-05 เป็นข้อเสนอเสริม เพราะ `SKILL.md:44` ให้บันทึก stable ID และแม่แบบรายงานมีตารางเชื่อมเกณฑ์อยู่แล้ว รายงานนี้ยกกลับเป็นควรแก้ตามหลักฐานการทดลอง T8h-o ซึ่งผู้ตัดสินการส่งต่อให้ระดับควรแก้ แต่ส่วนนี้ยังไม่ได้ตรวจซ้ำ)
- **ไฟล์:** `skills/orbitlab-interactive-lesson/SKILL.md:14` "Read the requested lesson brief." และ `:44` "For each criterion, record its stable ID…"; `assets/implementation-report-template.md:12-15`; `references/diagnostic-feedback.md:26` ("rule ID" ไม่ได้แมปกับ HINT-xx) เทียบกับ `skills/orbitlab-lesson-design/SKILL.md:95` "preserve these IDs and semantics through implementation or explain a necessary revision to the brief"
- **หลักฐาน:** ข้อกำหนดเรื่องรักษา semantics อยู่ในสกิลออกแบบ ซึ่งไม่ได้ถูกโหลดตอนวางแผนสร้าง ใน T8h-o (โหลดเฉพาะสกิล interactive) มีการเปลี่ยน CRIT-02 จาก "ตรวจแนวโน้มเท่านั้น ไม่ตรวจตัวเลขเป๊ะ" (แบบบทเรียน T1e) เป็น "874 ± 10 กม." และย้ายจุดกลางของ CRIT-05 โดยไม่รายงาน ส่วน T8h ไม่ได้จับคู่ HINT-01..03 ทีละข้อ
- **สถานการณ์:** ผู้พัฒนาโหลดเฉพาะสกิล interactive แล้วนำแบบบทเรียนไปทำ จึงปรับ tolerance หรือเปลี่ยนเกณฑ์ให้ตรวจอัตโนมัติได้โดยไม่รายงาน (เกิดจริงใน T8h-o)
- **ผลกระทบ:** เจตนาทางการศึกษาเปลี่ยนไประหว่างส่งต่อ โดยผู้ตรวจไม่รู้ตัว
- **วิธีแก้:** เติมใน `SKILL.md:14`: "When a lesson design brief exists, keep its IDs (OBJ/ACT/CRIT/HINT) and each criterion's meaning, tolerance and timing; `CRIT-xx` can be used verbatim as `Criterion.id`. Report every item not implemented or changed, with the reason." เพิ่มตาราง "รหัสใน brief → สิ่งที่สร้าง / ไม่ได้สร้าง / ต่างเพราะ" ในแม่แบบรายงาน และระบุว่า rule ID ตรงกับ HINT-xx
- **ตรวจยืนยัน:** ทดลองส่งต่อซ้ำ (T8h, T8h-o) แผนต้องมีตารางแมปรหัสครบ และไม่เปลี่ยนความหมายเกณฑ์โดยไม่รายงาน

**S-11 ศัพท์และหน่วยภาษาไทยไม่ผูกกับ glossary ของโครงการ** (I-F2) — ความเสี่ยง
- **ไฟล์:** `skills/orbitlab-lesson-design/references/learning-patterns.md:58-60`; `SKILL.md:14, 81-82`; `skills/orbitlab-interactive-lesson/SKILL.md:32`
- **หลักฐาน:** `docs/PHYSICS.md:2846-2852` [snapshot] (เนื้อหาเดียวกันที่ [main] ราวบรรทัด 4382) ประกาศว่า glossary EN/RU/TH เป็น source of truth ของ `src/i18n/th.ts` แบบ "one Thai word per English term" มี `tests/i18n.test.ts` และที่ [main] มี `tests/i18n-thai-terms.test.ts` แต่ grep ทั้งสองสกิลไม่พบ glossary หรือ i18n
- **สถานการณ์:** agent เขียนบทเรียนไทยใหม่ด้วยศัพท์ที่ตั้งเอง เช่น "การย้ายวงโคจร" หรือ "impulse" แทนคำใน glossary
- **ผลกระทบ:** ศัพท์ในบทเรียนใหม่ไม่ตรงกับแอป ตัวอย่างในแพ็กเกจเองใช้คำว่า "impulse" 16 ครั้ง
- **วิธีแก้:** ชี้ glossary ใน `docs/PHYSICS.md`, `unitText` ใน `src/lessons/text.ts` และสัญญา en/ru/th ของ `src/i18n` และระบุว่าเมื่อแอปเองใช้ศัพท์ไม่ตรงกัน ให้ยึด glossary แล้วแจ้งความต่าง (ดู A-04)
- **ตรวจยืนยัน:** grep `PHYSICS.md` ในสกิล

**S-12 ไฟล์ CRLF และ LF ปนกัน ทำให้ SHA-256 ใช้แยกรุ่นข้ามแพลตฟอร์มไม่ได้** (K-05) — ความเสี่ยง
- **ไฟล์ที่เป็น CRLF:** ทั้งสอง `SKILL.md`, ทั้งสอง `agents/openai.yaml`, package `MANIFEST.json`, `review/installation-status.json`, `review/validation-results.json` และ snapshot 65 จาก 66 ไฟล์ รวมถึงไฟล์ระดับ bundle คือ `MANIFEST.json`, `BUNDLE_VALIDATION.json` และ `background/GEMINI_ORIGINAL_PROPOSAL_TH.txt` ไฟล์อื่นเป็น LF
- **หลักฐาน:** repo มี `.gitattributes:2` `* text=auto` เมื่อ commit สกิลเข้า repo (`cac9e95`) blob ของ 4 ไฟล์ถูกเก็บเป็น LF จึงไม่ตรงกับ MANIFEST เช่น lesson-design `SKILL.md`: blob `ca8b9365…` เทียบกับ MANIFEST `e43ab23e…` ส่วนอีก 8 ไฟล์ตรงกัน
- **สถานการณ์:** ผู้ดูแล clone repo บน Linux/macOS แล้วเทียบ `.claude/skills` กับ MANIFEST จะเห็น 4 ไฟล์ไม่ตรง ส่วนบน Windows ที่ตั้ง `core.autocrlf=true` ไฟล์ LF จะไม่ตรงแทน
- **ผลกระทบ:** การยืนยันว่า "ติดตั้งตรงกัน" ด้วย hash ล้มทั้งที่เนื้อหาเหมือนกัน ตรงข้ามกับที่ README_TH.md:165 ตั้งใจไว้
- **วิธีแก้:** แปลงทุกไฟล์ข้อความเป็น LF แล้วสร้าง MANIFEST ใหม่ หรือกำหนดให้คิด hash หลังตัด `\r` ถ้าต้องการ byte ตรงใน repo ให้เพิ่ม `.claude/skills/** text eol=lf` หลังแปลงต้นฉบับแล้ว
- **ตรวจยืนยัน:** `git ls-files --eol .claude/skills` และเทียบ hash กับ MANIFEST ใหม่

**S-13 ตัวอย่าง `review/HOHMANN_PILOT_TH.md` ไม่ทำตามสัญญาของสกิล แต่ README บอกว่า "กรอกครบ"** (BC-06, I-F8, BC-07, F-DE-01, BC-08) — ข้อผิดที่ยืนยันแล้ว (ส่วนข้ออ้างใน README)
- **ไฟล์:** `README_TH.md:13` ("เพื่อเห็นงานปลายทางที่ต้องการ") และ `:119` ("…ครบ"); `review/HOHMANN_PILOT_TH.md:9, 13-16, 33-42, 68-77, 87`
- **หลักฐาน:**
  - ไม่มีคำถามตรวจพื้นฐาน ไม่มีรายการความเข้าใจผิด
  - O2 พูดถึง "พลังงาน" แต่ไม่มีกิจกรรมหรือเกณฑ์รองรับ
  - ตารางเกณฑ์ไม่ผูกกับเป้าหมายและไม่มีเวลาประเมิน มีแค่คำใบ้ขั้นแรก
  - ใช้ O1/C1 แทน OBJ-01/CRIT-01
  - rubric ไม่มีระดับ "ยังประเมินไม่ได้"
  - ช่วงยอมรับ ±1 m/s และ ±5 s ไม่มีเหตุผลเชิงความไว: ผู้ตรวจคำนวณว่าถ้าปัดความเร็วเหลือ 3 หลักนัยสำคัญ Δv2 คลาด +2.44 m/s และตก C2 ทั้งที่เข้าใจถูก
  - slider คุมผล (ความสูงเป้าหมาย) แทนเหตุ (Δv)
  - ตัวเลขทุกค่าใน pilot ถูกต้อง (คำนวณอิสระแล้ว)
  - ส่วน `review/forward-test-design.md` ทำตามสัญญาได้ดีกว่า
- **สถานการณ์:** ผู้ใช้หรือ agent อ่าน README แล้วใช้ pilot เป็นแม่แบบ จึงได้ brief ที่ไม่มีคำถามพื้นฐาน ไม่มีความเข้าใจผิด และเกณฑ์ไม่ผูกกับเป้าหมาย
- **ผลกระทบ:** ตัวอย่างหลักของแพ็กเกจสอนสิ่งที่ขัดกับสัญญา และข้ออ้างใน README เกินหลักฐาน ทั้งนี้ pilot อยู่ใน `review/` ไม่ได้ติดตั้งไปกับสกิล จึงนับในคำตัดสินของชุดหลักฐาน
- **วิธีแก้:** แก้ README:13 และ :119 ให้ไม่อ้างว่า "ครบ" หรือชี้ไปที่ forward-test-design แทน แล้วปรับ pilot ตามสัญญา (เติมระดับ "ยังประเมินไม่ได้", ID, คำถามพื้นฐาน, เหตุผลของ tolerance หรือขยายเป็นประมาณ ±3 m/s ให้ตรงกับข้อสอบเดิม `o-hohmann-first` ที่ใช้ tolPct 3)
- **ตรวจยืนยัน:** ไล่ pilot ตาม design-contract §1–§8

**S-14 ผลตรวจลิงก์ "ไม่มีลิงก์เสีย" ใช้ได้เฉพาะบนเครื่องเจ้าของ** (K-01) — ข้อผิดที่ยืนยันแล้ว
- **ไฟล์:** `review/forward-test-implementation.md:13-18` มี 9 ลิงก์เป็นพาธ Windows แบบสัมบูรณ์ เช่น `</C:/Users/Royin/OneDrive/Desktop/Royin/Orbitlab/Claude code version/src/ui/panel.ts:776>`; `review/validation-results.json` (`broken_links: []`, 25 ลิงก์); `BUNDLE_VALIDATION.json` (34 ลิงก์); `review/validate_package.py:57-58` ตรวจพาธ `C:` บนเครื่องที่รัน
- **หลักฐาน:** รันตัวนับลิงก์ด้วย regex เดียวกันบน Linux พบว่า 9 จาก 25 ลิงก์เสีย
- **สถานการณ์:** ผู้ตรวจที่ได้รับเพียง ZIP กดลิงก์หลักฐานแล้วไม่พบไฟล์ หรือรัน `validate_package.py` บน Linux/macOS แล้วจะได้ `passed=false`
- **ผลกระทบ:** ผลตรวจลิงก์ถูกนำเสนอว่าใช้ได้ทั่วไป ทั้งที่ทำซ้ำได้เฉพาะบนเครื่องเจ้าของ
- **วิธีแก้:** เปลี่ยนเป็นพาธสัมพัทธ์ไปยัง snapshot ที่แนบ หรือเขียนเป็นข้อความโค้ด `src/ui/panel.ts:776 (commit dba7b0a)` และให้ validate_package รายงานพาธสัมบูรณ์ว่าย้ายเครื่องไม่ได้
- **ตรวจยืนยัน:** รันตัวตรวจลิงก์บนเครื่องอื่นแล้วต้องได้ 0 ลิงก์เสีย

**S-15 forward test ของสกิล interactive ทำกับรุ่นก่อนแก้ และไม่ได้ทดลองซ้ำกับรุ่นส่งมอบ** (K-02, K-06) — ความเสี่ยง
- **ไฟล์:** `review/forward-test-implementation.md:74-76`; `README_TH.md:156`
- **หลักฐาน:**
  - mtime ใน ZIP: forward-test-implementation.md เป็น 2026-10-19 01:10 ส่วน interactive `SKILL.md`, `source-map.md` และ `diagnostic-feedback.md` เป็น 2026-10-20 00:30 (เวลามอสโก)
  - วลีที่รายงานอ้างถึง ("planning without implementation", "invalidate immediately on parameter edit") ไม่พบในสกิลรุ่นสุดท้ายเลย
  - `QA_SUMMARY_TH.md:25` ยอมรับเรื่องนี้ แต่ README:156 ไม่ได้บอก
  - รายงานทดลองไม่บันทึกพรอมป์จริง ไม่บันทึก agent หรือรุ่น และไม่บันทึก hash
- **สถานการณ์:** ผู้อ่าน README เข้าใจว่าสกิล interactive รุ่นที่ส่งมอบผ่านการทดลองใช้แล้ว จึงยอมรับโดยไม่ทดลองซ้ำ
- **ผลกระทบ:** ชุดหลักฐานเดิมไม่มีหลักฐานเชิงพฤติกรรมของรุ่นที่ส่งมอบ น้ำหนักหลักฐานจึงต่ำกว่าที่ README ทำให้เข้าใจ
- **วิธีแก้:** ติดหมายเหตุใน README:156 ระบุว่าทำกับรุ่นก่อนแก้ (ไม่รวม `CLAUDE_FINAL_REVIEW_TH.md:11` เพราะไฟล์นั้นเขียนก่อนรายงานทดลอง ผู้ตรวจซ้ำตัดออกจากข้อนี้แล้ว) แล้วให้รายงานทดลองฉบับต่อไปบันทึกพรอมป์ วิธีเรียกใช้ และ hash ของไฟล์ (การทดลองในรายงานนี้ ข้อ 4 ทำกับรุ่นส่งมอบแล้ว)
- **ตรวจยืนยัน:** grep วลีในรายงานเทียบกับสกิลรุ่นปัจจุบัน

### 2.3 ข้อเสนอเสริม

ชนิด: P-04, P-05, P-09, P-11, P-24 และ P-33 เป็นรสนิยม ข้ออื่นเป็นความเสี่ยงตามผลตรวจซ้ำ คอลัมน์ "เรื่อง" ย่อหลักฐานและสถานการณ์ไว้แล้ว ข้อที่ไม่ได้ระบุวิธีตรวจ ให้ grep ข้อความที่เติมในสกิล แล้วทดลองกรณีที่เกี่ยวข้องซ้ำ

| ID | เรื่อง (ID ต้นทาง) | ไฟล์และบรรทัด | วิธีแก้ขั้นต่ำ / วิธีตรวจ |
|---|---|---|---|
| P-01 | description ไม่มีขอบเขตเชิงลบ คำว่า review/plan ทับซ้อนกัน และ "lesson plans" ไม่ได้จำกัดว่าเป็น Orbitlab (AJ-04, ผู้ตัดสินกรณี 4) | `skills/*/SKILL.md:3`; interactive `SKILL.md:24` | เติม "Not for standalone videos (e.g. Manim), general code review, physics-engine changes, or non-Orbitlab courses" / ทดลองพรอมป์เชิงลบซ้ำ |
| P-02 | description ของ interactive ไม่มีคำว่า replay, grading, progress และ stale results ทำให้โมเดล 2 ไม่โหลดสกิลกับคำถามกรณี 3 (T3a-o, n=1) (X8) | interactive `SKILL.md:3` | เติมคำเหล่านี้ใน description / ทดลองกรณี 3 ซ้ำ |
| P-03 | การส่งต่องานแบบ "curriculum" และคลังข้อสอบไม่ตรงกับขอบเขตที่ description ประกาศ (AJ-05) | interactive `SKILL.md:3`; lesson-design `SKILL.md:3, 22` | ระบุว่าใครรับงานชุดหลายบทและงานข้อสอบ |
| P-04 | กฎหลักซ้ำ 4–5 แห่ง และมีบรรทัดยาว 47–70 คำ (AJ-06) | interactive `SKILL.md:12, 36, 63`; `implementation-checks.md:34` | ให้กฎหลักมีที่เดียว แยกเป็น bullet และเติม "for replaceable results" ใน implementation-checks:34 |
| P-05 | บริบทเฉพาะเครื่องเจ้าของปนอยู่ในสกิล ได้แก่ หลายสำเนา, "Claude code version", worker cap และสกิล `anatomy`/`visualize` ซึ่งไม่มีในบัญชีนี้ (AJ-07) | interactive `SKILL.md:12, 22, 56`; `source-map.md:3, 87` | แทนชื่อโฟลเดอร์ด้วย commit และย้าย anatomy/visualize ไป README (ข้อสงสัยว่า SKILL.md:12 ทำให้ถามยืนยันเกินจำเป็นถูกผู้ตรวจซ้ำตัดออก เพราะมีเงื่อนไข "if ambiguous" อยู่แล้ว) |
| P-06 | แนวทาง Manim ไม่กำหนดให้จังหวะภาพเคลื่อนไหวสอดคล้องกับแบบจำลอง: T4e และ T4e-d ได้ภาพที่ขัดกฎของเคปเลอร์ วงนอกเร็วกว่าที่ควร และตำแหน่งกระโดด (ผู้ตัดสินรอบสุดท้าย) | interactive `SKILL.md:24`; lesson-design `SKILL.md:46` | "ถ้าภาพแสดงการเคลื่อนที่ตามเวลา ให้ได้เวลาจากแบบจำลอง หรือติดป้ายว่าเวลาเป็นแผนผัง และตรวจความต่อเนื่องของตำแหน่ง" |
| P-07 | แม่แบบ brief ขาด field ที่ runtime ต้องใช้ ได้แก่ ข้อความโจทย์ที่ผู้เรียนเห็น, debrief, mode และ domains และชื่อ "brief" ชนกับ `Lesson.brief` (BC-09) | `lesson-brief-template.md:5-12`; `src/lessons/types.ts:68-105` [snapshot] | เพิ่มช่องเหล่านี้ และเรียกเอกสารว่า "lesson design brief" |
| P-08 | ศัพท์สถานะ 6 ชุดไม่ได้แมปกันหรือแมปกับ `CriterionState`/verdict (BC-10) | `design-contract.md:11, 77-80, 86, 96`; `diagnostic-feedback.md:9-22` | เพิ่มตารางแมปสั้น ๆ |
| P-09 | quantity map ซ้ำสองชุด และสกิล interactive ไม่ให้เริ่มจากตารางใน brief (BC-11) | lesson-design `SKILL.md:44`; interactive `SKILL.md:28` | "extend the brief's quantity table" |
| P-10 | ไม่มีแนวทางเมื่อเปิดแหล่งอ้างอิงไม่ได้ (BC-13) | lesson-design `SKILL.md:51` | แยก "แนะนำ แต่ยังไม่ได้ตรวจ" ออกจากแหล่งที่ตรวจแล้ว |
| P-11 | หน่วยไทยในตัวอย่างไม่ตรงกับ `unitText` และ "Thai by default" กำกวมเทียบกับแอปที่ใช้ en เป็นภาษาฐานและ fallback (BC-14, I-F7) | `learning-patterns.md:60`; interactive `SKILL.md:32`; `src/lessons/text.ts:12-17` | ใช้ "ม./วินาที, กม./วินาที" ตามแอป และเขียนสัญญา en/ru/th ให้ชัด |
| P-12 | ตารางเทสต์ใน source-map ไม่มี `tests/equations.test.ts` และ `tests/tune-job.test.ts` (X7) | `source-map.md:77-85` | เพิ่มสองแถว |
| P-13 | "grades the live flight head" ไม่ตรงกับรายละเอียดของ main ซึ่งใช้ `gradeShown` และอ่าน state ที่ end event ส่วนที่ snapshot เกรดอาจถูกตรึงช้าเมื่อเร่งเวลา (H-F1, F-04) | interactive `SKILL.md:37`; `source-map.md:35, 38`; `src/lessons/grader.ts:12-17, 86-91` [main] | แก้ถ้อยคำให้ไม่ผูกกับรุ่น และระบุว่า measure ใหม่ต้องอ่านค่าที่จุดสิ้นสุดการให้คะแนน (ผู้ตรวจซ้ำคง H-F1 ไว้ที่ควรแก้ เพราะป้ายวันที่ใน source-map ทำให้ไม่ตรวจซ้ำ ส่วน F-04 ถูกลดเป็นข้อเสนอเสริม รายงานนี้จัดทั้งคู่เป็นข้อเสนอเสริม เพราะเรื่องป้ายวันที่แก้ใน M-01 แล้ว และคอมเมนต์หัวไฟล์ `grader.ts:3-4` [main] เองยังเขียนว่า "at its recording's head") |
| P-14 | เครื่องมือครูถูกซ่อนด้วย `TEACHER_TOOLS = false` ที่ main และ schema ล้าสมัยด้านอื่น (F-06, BC-12) | `source-map.md:24-31, 40`; `src/ui/held.ts:9` [main] | รวมไว้ในหัวข้อ "Known drift" ของ M-01 และบอกให้ตรวจ flag ก่อนเสนอส่งบทเรียนเป็นไฟล์ |
| P-15 | runtime fallback ของ `localText` เป็น en และ UI นำเข้าแสดงเฉพาะ issue ระดับ error (F-09) | `source-map.md:27, 31`; `src/lessons/text.ts:7` | เติมหนึ่งประโยค |
| P-16 | "selected Earth radius" กำกวม (โค้ดใช้ `R_EARTH` 6378137 ตายตัว และ `R_EARTH_MEAN` ไม่มีที่ใช้) และ `hohmannDv` ล็อกไว้ที่ `MU_EARTH` (F-DE-02, F-10) | `source-map.md:65, 67`; `src/physics/orbital.ts:84, 88`; `constants.ts:9-11` | แก้ถ้อยคำ |
| P-17 | ตารางหน่วยขาดกับดักบางข้อ: `hohmann()` รับความสูง, `visViva` clamp เป็น 0, `ResolvedTarget` เป็นเรเดียน, มี rad/s และ h (F-DE-05, F-11) | `source-map.md:64-68`; `src/orbit/maneuvers.ts:208-212`; `src/lessons/measures.ts` | เพิ่มแถว |
| P-18 | NumericQuestion มีเฉพาะ `tolPct` (ค่าคาดหมาย 0 ต้องตอบตรงเป๊ะ) และชื่อพารามิเตอร์ใน expression บัง `mu`/`R` ได้ (F-DE-04) | `source-map.md:44, 48`; `assessment/score.ts:95`; `expression.ts:108-109` | เติมคำเตือน |
| P-19 | ประโยค "measures convert nonfinite to unavailable" ครอบคลุมเกินจริง เพราะ `withinBound` ให้ NaN ผ่าน และบาง measure ไม่ห่อ `finite()` (H-F4) | `source-map.md:71`; `grader.ts:71-79` [snapshot] | แก้ประโยค และให้ measure ใหม่ห่อ `finite()` พร้อมทดสอบกรณี NaN |
| P-20 | telemetry ของ simulation ที่ grader อ่านเป็นข้อมูลที่สุ่มเก็บและ thin เอง ไม่ใช่แค่ display decimation (H-F5) | `implementation-checks.md:36`; `src/physics/simulation.ts:1336-1358` [snapshot] | เติมหนึ่งประโยค |
| P-21 | `FrameSimView` ยังมีบางฟิลด์การเผาไหม้ที่เป็นค่า live (H-F6) และ source-map ไม่กล่าวถึงพื้นผิวที่ทำงานตามเวลาที่แสดงซึ่งมีอยู่แล้ว เช่น การ์ดผลภารกิจและป้าย LIVE/REPLAY (X5) | `source-map.md:54`; `src/replay/simview.ts:38-42` | เติมคำเตือนและตัวชี้ |
| P-22 | "Suspend … during that interval" ไม่มี hook รองรับ ส่วนบทเรียนเที่ยวบินมีช่วง draft เฉพาะก่อนปล่อยจรวด (G-04) | interactive `SKILL.md:36`; `src/ui/panel.ts:628-644` [main] | รวมไว้ในวิธีแก้ขั้นต่ำข้อ 4 ของ M-01 |
| P-23 | helper รับค่าผิดหน่วยหรือค่าสุดขั้วโดยไม่เตือน เช่น `--r1-m 6778` exit 0 และ `reference(1e-300, …)` คืน NaN โดยไม่ raise (F-DE-06) | `scripts/hohmann_reference.py:14-16, 37` | raise เมื่อผลไม่ finite และเตือนเมื่อ r < 6378137 ขณะใช้ μ ของโลก |
| P-24 | convention เวลาเป็น 0 เมื่อรัศมีเท่ากันพอดีทำให้ผลไม่ต่อเนื่อง (r2 = r1(1+1e-15) ได้ 2,776.8 s) (F-DE-09) | `hohmann_reference.py:32` | คงไว้และบอกว่าเทียบด้วยความเท่ากันแบบ exact หรือคืนครึ่งคาบเสมอพร้อม `maneuver_required` |
| P-25 | สคริปต์ Hohmann เป็นเครื่องมืออ้างอิงตัวเดียวในสกิล จึงดึงแผนวิศวกรรมไปเลือก "Hohmann ใน worker" ซึ่งเป็นสูตรปิดที่เสร็จทันที จนไม่เกิดสถานการณ์ผลเก่ามาช้าจริง และ T2a ต้องใส่ความล่าช้าเทียม (T2a, T2e; ผู้ตรวจซ้ำเห็นว่าการบอกว่าขัดกับ `SKILL.md:24` แรงเกินไป เพราะพรอมป์กำหนด worker มาเอง) (X3) | interactive `SKILL.md:63` | เขียนกำกับว่า helper มีไว้ตรวจตัวเลขเท่านั้น |
| P-26 | ฮิวริสติก "ผิด 1,000 เท่า → ตรวจหน่วย" ไม่ครอบแบบอื่น เช่น km/m ปนใน r ทำให้ผิด ×31.6 หรือใช้ความสูงแทนรัศมี (F-DE-07) | `diagnostic-feedback.md:38` | เติมตัวอย่าง |
| P-27 | แนวทาง accessibility ทั่วไปเกินไป: ไม่มีเรื่อง live region และโฟกัสหลุดเมื่อ strip สร้างใหม่ (I-F4) | `implementation-checks.md:38-44`; `lesson-mode.ts:443` [snapshot] / `:1062` [main] | เติมย่อหน้าและชี้ pattern ที่มีอยู่ เช่น `registerField` และ `chartDescription` |
| P-28 | ไม่ระบุ path ที่ null evidence กลายเป็น fail และข้อความ UI ที่โทษผู้เรียน (I-F5) | `diagnostic-feedback.md:22`; `grader.ts:97, 100, 121, 126` [snapshot] | เติมรายการ path |
| P-29 | source-map ชี้ `formatMeasure` แต่ main ใช้ `measureText`/`keepUnits` แสดงผลแล้ว (I-F6) | `source-map.md:69`; `src/ui/lessons/measure-text.ts` [main] | เติมหนึ่งประโยค |
| P-30 | เอกสารในแพ็กเกจยังชี้ไปที่ `CLAUDE_FINAL_REVIEW_TH.md` ซึ่งให้สิทธิ์แก้ไฟล์ โดยไม่มีป้ายว่าถูกแทนที่แล้ว (K-04) | `CLAUDE_FINAL_REVIEW_TH.md:3, 55`; `README_TH.md:14, 144`; `review/QA_SUMMARY_TH.md:38` | ติดป้าย "เอกสารเก่า" |
| P-31 | ตัวสร้างหลักฐานทำซ้ำได้ไม่เต็มที่ (K-07, K-09) | `review/check_reference.py:15-17`, `validate_package.py:65, 79`, `build_archives.py:23, 45` | ตั้ง `sys.dont_write_bytecode`, ใช้ `-B` ทุกที่, ไม่เขียนทับ, ใช้ zip date คงที่ และเก็บ hash ของสำเนาที่ติดตั้งแทน boolean |
| P-32 | check_reference ไม่มีค่าคาดหมายจากภายนอก (check พลังงานเป็น identity ทางพีชคณิต) และ README เรียกว่า "ความคงที่ช่วง coast" (F-DE-08, K-08) | `review/check_reference.py:29-65`; `README_TH.md:117` | เพิ่ม check Vallado 6-1 และแก้ถ้อยคำ |
| P-33 | `openai.yaml` เป็น metadata ของ Codex ที่ Claude ไม่ใช้ ไม่เสียหาย แต่ควรบอกใน README ว่าส่วนใดใช้ร่วมกันได้ (ผู้ตรวจมิติ A ข้อ 2) | `skills/*/agents/openai.yaml:1-4` | ไม่ต้องแก้ แค่ระบุ |
| P-34 | สกิลออกแบบไม่ให้ตรวจว่าพื้นผิวจำลองที่เลือก (เที่ยวบิน หรือตัววางแผน/playground) มีชนิดบทเรียนใดให้คะแนนได้ และ source-map ไม่มีตัววางแผนการปรับวงโคจร ทำให้ T1a สมมติว่าให้คะแนนอัตโนมัติได้ (ผู้ตัดสินกรณี 1, X1) | lesson-design `SKILL.md:24-26`; `source-map.md:13-22`; `src/lessons/types.ts:297` [main] | "Confirm which lesson kind can grade the chosen simulation surface; otherwise plan a worksheet/teacher rubric or mark automatic grading as new work." / ทดลองกรณี 1 ซ้ำ |
| P-35 | สกิลออกแบบไม่ชี้ระบบ assessment ที่มีอยู่ (`ChoiceQuestion.observe` สำหรับทำนายแล้วสังเกต และข้อในคลังที่ตรงกับความเข้าใจผิด เช่น `o-two-burns`) (ผู้ตัดสินกรณี 1, X2) | lesson-design `SKILL.md:26, 57`; `src/lessons/assessment/types.ts:54-63`; `bank/orbits.ts:81-91` | เพิ่มตัวชี้ในขั้น "Establish the teaching and software context" |
| P-36 | สกิลออกแบบไม่ให้ใช้ค่าคงที่ของโครงการ: forward-test-design ใช้ R = 6,371 กม. ทำให้ v ที่ 800 กม. เป็น 7.46 แทน 7.45 ส่วนโค้ดใช้ `R_EARTH = 6378137` และ `MU_EARTH = 3.986004418e14` (F-DE-03) | lesson-design `SKILL.md:41-51`; `review/forward-test-design.md:24`; `src/physics/constants.ts:7, 9` | "Use the project's constants (Orbitlab: MU_EARTH, R_EARTH = 6378137 m, altitudes above R_EARTH); state rounded values and their effect." |

### 2.4 ข้อสังเกตเกี่ยวกับแอป (ไม่ใช่ข้อบกพร่องของสกิล)

ไม่ได้แก้ในรอบนี้ ใช้ประกอบเมื่อแก้สกิลหรือวางงานต่อ:

- **A-01** คอมเมนต์หัวไฟล์ `src/ui/lessons/lesson-mode.ts:7-8` และ `src/lessons/grader.ts:3-4` [main] ยังเขียนว่าให้คะแนน "at its recording's head" ทั้งที่การอ่านค่าเปลี่ยนเป็นที่ end event แล้ว
- **A-02** `withinBound` ([snapshot] `grader.ts:71-79`, [main] `:147-155`) คืน true เมื่อค่าเป็น NaN measure ที่ไม่ห่อ `finite()` จึงอาจผ่านได้
- **A-03** คำใบ้คงที่ของบทเรียนในแอปเอง (`src/lessons/builtin/track1.ts:103`) ชี้ไปยัง event log ที่แสดงค่า Δv ของการจุด ซึ่งเป็นค่าเดียวกับที่ measure `burnDv` ใช้ตัดสินคำตอบ โดยไม่ผ่าน `revealAnswers` ยืนยันแล้ว ใช้ประกอบ S-04
- **A-04** ศัพท์ไทยของแอปไม่คงที่: `src/i18n/th.ts:948` [snapshot] (และ `:1300, 1773` [main]) ใช้ "การโอนวงโคจรแบบโฮมันน์" ส่วน `track1.ts:72` ใช้ "การถ่ายโอนวงโคจรแบบโฮมันน์" และ glossary ใช้ "จุดใกล้โลกที่สุด" ส่วนบทเรียนใช้ "จุดใกล้โลก" ถ้าแก้ S-11 ควรกำหนดให้ glossary มีน้ำหนักกว่า และให้รายงานเมื่อพบคำที่ไม่ตรงกัน
- **A-05** `R_EARTH_MEAN` ประกาศไว้แต่ไม่มีที่ใช้ (บันทึกไว้แล้วใน `docs/history/AUDIT-2026-09-16.md:426`) แต่ข้อความผู้เรียนใน `src/worksheets/cases.ts:293` [main] มีทั้ง 6371 และ 6378.137
- **A-06** เมื่อ worker ล้มกลางเที่ยวบิน (`src/main.ts:1232-1235` [snapshot] / `:1894-1896` [main] มีเพียง `console.error` และหยุดเล่น) ผู้เรียนไม่ได้รับข้อความอธิบาย และ strip ค้างที่ "กำลังบิน"

---

## 3. ตารางความครอบคลุม A–K

| มิติ | สถานะ | เหตุผลและหลักฐานหลัก |
|---|---|---|
| A โครงสร้างและการเลือกใช้ | **พบปัญหา** | frontmatter ถูกต้อง (quick_validate ผ่าน) ลิงก์ภายในสกิลเปิดได้ครบ 8+1 รายการ และพาธซอร์ส 41 รายการใน source-map มีอยู่ทั้งสองรุ่น ไม่มีวงวนหรือ gate ที่ขัดกัน ส่วน openai.yaml เป็นของ Codex เท่านั้น ปัญหาที่พบ: S-02, P-01, P-02, P-04, P-05 ส่วนการเลือกสกิลเองทดลองจริงแล้ว (ข้อ 4) แต่ n=1 จึงไม่ใช่ค่าความแม่นยำ |
| B คุณภาพการออกแบบบทเรียน | **พบปัญหา** | คำสั่งด้านการสอนดีครบ ช่องว่างที่พบ: S-05, S-06, S-07, P-34, P-35 ส่วนตัวอย่าง pilot ไม่ทำตามสัญญา (S-13) |
| C การส่งต่องานระหว่างสองสกิล | **พบปัญหา** | template มีหัวข้อที่ต้องส่งต่อครบ และแยกจาก runtime schema ชัด (`Criterion.id` รับ CRIT-xx ได้ตรง ๆ) การทดลองส่งต่อจริง (T8h, T8h-o) รักษาขอบเขตและแยกเกณฑ์ runtime กับรูบริกได้ ปัญหาที่พบ: สกิล interactive ไม่สั่งให้รักษาความหมายของเกณฑ์ (S-10) ซึ่ง T8h-o เปลี่ยน CRIT-02 จริง, นิยามบันไดคำใบ้ขัดกัน (S-06) และศัพท์สถานะไม่แมปกัน (P-08) |
| D ฟิสิกส์และหน่วย | **ผ่าน** (มีข้อเสนอเสริม) | สมการ เครื่องหมาย และหน่วยถูกต้อง ข้ออ้างว่าฟังก์ชันตรีโกณใน expression ใช้องศา และ mu/R เป็น SI ตรงกับ `expression.ts:10-27` ทั้งสองรุ่น `orbital.ts` ใช้เรเดียน ค่า mu และ R ของตัวอย่างตรงกับโครงการ ยกเว้น forward-test-design ที่ใช้ 6371 (P-36) ช่วงยอมรับของ pilot ไม่มีเหตุผลรองรับ (S-13) และสกิลไม่ตีความแบบจำลองอุดมคติเป็นการรับรองภารกิจ |
| E Hohmann helper และตัวอย่าง | **ผ่าน** (มีข้อเสนอเสริม) | ยืนยันอิสระด้วย RK4 และ Vallado 6-1 กรณีขึ้น ลง และรัศมีเท่ากันถูกต้อง ค่า 0/ลบ/NaN/inf ถูกปฏิเสธ ความต่างจาก `hohmannDv` ถูกเตือนไว้ถูกต้อง ข้อเสนอที่เหลือ: P-23, P-24, P-32 |
| F ความตรงกับ API/schema | **พบปัญหา** | ตรวจ identifier 52 รายการแล้วมีอยู่จริงและความหมายตรงกับ snapshot แต่ที่ main ล้าสมัยหลายจุด (M-01, P-14) ปัญหาอื่น: S-08 persistence, P-15 localization fallback ส่วนข้อห้ามใช้ eval หรือโค้ดที่นำเข้าในการให้คะแนนถูกต้องตาม hook registry และ expression parser |
| G วงจรสถานะและผลล้าสมัย | **พบปัญหา** | หลัก draft/commit, recording delta (ไม่ใช้ latest-wins) และ mirror (`WorkerSession.sim` "read it, never step it") ถูกต้อง ปัญหาที่พบ: identity ที่ชี้ไม่ได้และกฎ invalidate ที่ขัดกับ LUI-01 (M-01), S-03 |
| H Replay, grading, progress | **พบปัญหา** | แยก live, replay และ frozen ถูกต้อง: replay ไม่เปลี่ยนเกรด `regradeAnswers` ตรวจกับหลักฐานที่ตรึงไว้ และ `passed` ไม่ถูกถอน ปัญหาที่พบ: S-04, S-09, P-13, P-19, P-20, P-21 |
| I Feedback, UX, accessibility | **พบปัญหา** | ไม่สรุป misconception จากคำตอบผิดครั้งเดียว แยกข้อมูลไม่พร้อมออกจากความล้มเหลวของผู้เรียน ไม่ใช้สีอย่างเดียว และมีแนวทาง reduced motion ปัญหาที่พบ: S-04, S-11, P-27, P-28 ส่วนการใช้งานจริงด้วย keyboard/touch ยังไม่ได้ทดสอบ (ไม่ได้รันเบราว์เซอร์) |
| J ขนาดงานและเครื่องมือ | **พบปัญหา** | ไม่บังคับ React/D3/Manim/Wasm และแยกงานวิดีโอออกจากงานบทเรียน (ทดลองแล้ว: T4e/T4e-d อยู่ในขอบเขต) ไม่มี gate ที่ทำให้งานหยุด ปัญหาที่พบ: S-01 กติกา D-17, P-25 และ P-06 |
| K ความน่าเชื่อถือของหลักฐาน | **พบปัญหา** | เอกสารแยกระดับหลักฐานได้ดี และไม่อ้างว่า Claude ตรวจแล้ว (`claude_reviewed: false`) ปัญหาที่พบ: S-12, S-13, S-14, S-15, P-30, P-31, P-32 |

ข้อเสนอเสริมที่ยังไม่ได้ระบุในตาราง: A: P-03, P-33 · B: P-10 · C: P-07, P-09 · D: P-16, P-17, P-18, P-26 · G: P-22 · H: P-12 · I: P-11, P-29

---

## 4. ผลการทดลองเชิงพฤติกรรมและคำสั่งที่รันจริง

### 4.1 วิธีทดลอง

**การเรียกใช้:** ทุกรอบเป็น process ใหม่ของ Claude Code แบบ headless (`claude -p … --output-format stream-json`) ที่เริ่มด้วย context ว่าง ชุดแรก (24 รอบ) รันใน**สำเนา repo ที่ main `5374b6d`** ซึ่งมีเฉพาะสองสกิลนี้ใน `.claude/skills/` ชุดที่สอง (14 รอบ) รันหลัง #168 ในสำเนา branch นี้ที่ merge main `63db68f` แล้ว ซึ่งมีสกิลโครงการครบ 5 ตัว (ข้อ 4.3) สกิลจึงถูก**โหลดจริงโดย Claude Code** ไม่ใช่การให้ agent อ่านไฟล์เอง
- ก่อนทดลอง session ใหม่แสดงรายชื่อและ description ของสกิลทั้งสองได้ตรง ยืนยันการค้นพบสกิลจาก `.claude/skills`
- การเรียกแบบ `/ชื่อสกิล` ฉีด SKILL.md เข้าไปจริง: session ยกหัวข้อแรกและประโยคแรกของ SKILL.md ได้ตรงทุกคำโดยไม่ใช้เครื่องมือ ดังนั้นรอบ "e" และ T4e/T4e-d มีสกิลอยู่ใน context จริง

**สภาพแวดล้อม:**
- `--allowedTools` อนุมัติ Read/Grep/Glob/Skill ล่วงหน้า และ `--disallowedTools` ปิด Edit/Write/Bash/WebFetch/WebSearch/Agent
- รายการเครื่องมือใน init มีทั้งหมด 34 ตัว คือ Read/Grep/Glob/Skill และเครื่องมืออื่นของ harness อีก 30 ตัว เช่น Artifact, SendUserFile และ Workflow ส่วนรายการสกิลมี 55 ตัว รวมสกิลของบัญชีและปลั๊กอิน รอบ T1b เรียก Artifact แบบ `quickstart` ซึ่งเป็นการอ่านอย่างเดียว ไม่มีรอบใดเผยแพร่หรือเขียนไฟล์ และไม่มีรอบใดอ่านไฟล์นอกสำเนา repo

**ชนิดรอบ:**
- "a" = พรอมป์ธรรมดา ให้โมเดลเลือกสกิลเอง
- "e" = ขึ้นต้นด้วย `/ชื่อสกิล`
- "b" = baseline ในสำเนา repo ที่ไม่มีสกิล
- "-o" = โมเดลที่ 2

**โมเดล:** "โมเดล 1" คือโมเดลค่าเริ่มต้นของ CLI ในสภาพแวดล้อมนี้ ส่วน "โมเดล 2" เป็นอีกรุ่นหนึ่ง ชื่อรุ่นบันทึกไว้ใน transcript ดิบนอก repo

**ผู้ตัดสิน:** agent อิสระที่ตรวจผลกับซอร์สจริงที่ main ทีละข้ออ้าง

**ข้อจำกัด:**
- n=1 ต่อช่อง ไม่ใช่การวัดความแม่นยำของการเลือกสกิล
- การทดลองทั้งหมดรันบน main ไม่ได้รันบน snapshot
- ห้ามเขียนไฟล์และรันคำสั่ง จึงไม่มีการ implement หรือเรนเดอร์จริง
- thinking ของโมเดลถูกปิดบัง จึงไม่เห็นเหตุผลการเลือกสกิล
- ชุดแรกมีสกิล Orbitlab เพียงสองตัวนี้ ส่วนการเลือกสกิลเมื่อมีสกิลโครงการอื่นแข่ง ทดสอบในชุดที่สองเฉพาะพรอมป์แบบเลือกเอง (ไม่ได้ตัดสินเนื้อหาคำตอบของชุดที่สอง ยกเว้นการตรวจเฉพาะจุดในข้อ 4.3)

### 4.2 ผลรายกรณี

**กรณี 1 ออกแบบบทเรียน**
- **พรอมป์:** "ออกแบบบทเรียนภาษาไทยสำหรับผู้เริ่มต้น เรื่องการเปลี่ยนวงโคจร โดยไม่ใช้แคลคูลัส ให้มีการคาดการณ์ การทดลอง การอธิบายผล และโจทย์ถ่ายโอนความรู้"
- **ไฟล์ที่ใช้:** SKILL.md ร่วมกับ `design-contract.md`, `learning-patterns.md` และ `lesson-brief-template.md`
- **ผล:**

| รอบ | การโหลดสกิล | ผล | ข้อผิดที่พบ |
|---|---|---|---|
| T1a | โมเดล 1 เรียก Skill tool เอง (`orbitlab-lesson-design`) | ผ่านบางส่วน | มี OBJ/ACT/CRIT/HINT, คำถามพื้นฐาน, ความเข้าใจผิด, POE, โจทย์ถ่ายโอน และรูบริก 4 ระดับครบ แต่ไม่มีตารางปริมาณ และสมมติว่าตัววางแผนให้คะแนนอัตโนมัติได้ (P-34) เลขบรรทัดที่อ้างถูกทุกจุด |
| T1e | `/orbitlab-lesson-design` | ผ่าน | ครบเกือบทุกข้อของ contract พบเองว่าไม่มีชนิดบทเรียนใดอ่านตัววางแผนได้ จึงใช้ใบงานและรูบริก และชี้กับดักหน่วย ม./วินาที กับ กม./วินาที มีข้อผิดย่อย 7 ข้อ เช่น ชื่อคีย์ `mv.burns` ที่แต่งขึ้น และเฉลยถ่ายโอนที่ตอบคนละคำถาม |
| T1a-o | โมเดล 2 เรียก Skill tool เอง | ผ่าน | ยึดป้ายจริงใน `th.ts` ได้ดี ผิดย่อย 3 ข้อ เช่น ช่วงของ slider และหน่วยแสดงผล Δv |
| T1b | baseline ไม่มีสกิล | ไม่ผ่าน | ไม่อ่าน repo เลย ใช้หน่วยไร้มิติ และพยายามเขียนหน้า HTML ฟิสิกส์ถูก |

- **ข้อสรุป:**
  - สกิลทำให้ตรวจ repo ก่อน และได้องค์ประกอบของสัญญาที่ baseline ไม่มีเกือบทั้งหมด
  - สกิลไม่ได้ช่วยเรื่องความถูกต้องทางฟิสิกส์ เพราะ baseline ก็ถูก
  - สกิลยังไม่ได้ทำให้ใช้ระบบ assessment ที่มีอยู่ (P-35)
  - ข้อควรระวังของการเทียบ: baseline ถูก harness ชักนำไปทางสร้าง artifact ด้วย

**กรณี 2 วางแผน worker และผลเก่า**
- **พรอมป์:** "วางแผนเพิ่มบทเรียนโต้ตอบใน Orbitlab โดยผู้เรียนสามารถเปลี่ยนพารามิเตอร์ระหว่าง worker คำนวณ และผลจาก run เก่าอาจกลับมาช้ากว่า run ใหม่"
- **ไฟล์ที่ใช้:** T2a, T2e และ T2a-o ใช้ SKILL.md ร่วมกับ `source-map.md` และ `implementation-checks.md` ส่วน T2b ไม่มีสกิล
- **ผล:**

| รอบ | การโหลดสกิล | ผล | ข้อผิดที่พบ |
|---|---|---|---|
| T2a | โมเดล 1 เรียก Skill tool เอง (`orbitlab-interactive-lesson`) | ผ่านบางส่วน | ประกาศว่าเป็นแผนอย่างเดียว และแยก replaceable ออกจาก `RecordingDelta` ถูก แต่ใช้ `telemetry.revision` เป็น run identity (ผิด) พลาด `ResultSlot` เสนอ `runId` ใหม่ และตีความโจทย์เป็นการสอนเรื่องผลเก่า (M-01) |
| T2e | `/orbitlab-interactive-lesson` | ผ่าน | ใช้ `ResultSlot` และแยก draft/commit/invalid ถูก แต่เลือก Hohmann ใน worker โดยไม่มีคอขวด (P-25) |
| T2a-o | โมเดล 2 เรียก Skill tool เอง | ผ่าน | ยึดซอร์สดีที่สุด พบเส้นทาง `checkDesign`/`designStale` ใน LessonMode และระบุเจ้าของสถานะถูก |
| T2b | baseline | ผ่านบางส่วน | หา `ResultSlot` เจอเอง แต่ไม่ระบุเจ้าของการให้คะแนน และไม่แยก draft/commit |

- **ข้อสรุป:** T2e และ T2a-o ดีกว่า baseline อย่างมีนัย แต่ T2a แย่กว่า baseline ในการหากลไกเดิม เป็นหลักฐานหลักของ M-01

**กรณี 3 Replay และคะแนน**
- **พรอมป์:** "ผู้เรียนจบบทเรียนแล้วเลื่อน replay กลับไปก่อนการเผาไหม้ จากนั้นแก้คำตอบและเริ่ม run ใหม่ กราฟ สมการ คำอธิบาย คะแนน และประวัติความก้าวหน้าควรเปลี่ยนอย่างไร"
- **ไฟล์ที่ใช้:** T3a ใช้ SKILL.md และ `source-map.md`, T3e ใช้ SKILL.md, `source-map.md` และ `implementation-checks.md` ส่วน T3a-o และ T3b ไม่ได้ใช้ไฟล์สกิล
- **ผล:**

| รอบ | การโหลดสกิล | ผล | ข้อผิดที่พบ |
|---|---|---|---|
| T3a | โมเดล 1 เรียก Skill tool เอง | ผ่านบางส่วน | แยก scrub (ดู), เกรดที่ตรึง (หลักฐาน) และ run ใหม่ (สถานะใหม่) ถูก แต่เสนอให้หยุดผลตรวจรอบปัจจุบันซึ่งขัด lifecycle (M-01) และเสนอเก็บ answer เป็นคำทำนาย (S-03) |
| T3e | `/orbitlab-interactive-lesson` | ผ่าน | เลขบรรทัดถูกทุกจุด บอกได้ว่า Check ใหม่เขียน `last` ทับ และ `hintsShown` ไม่รีเซ็ต แต่คัดลอกข้อความ SKILL.md:36 ไปเป็น gap |
| T3a-o | โมเดล 2 **ไม่ได้โหลดสกิล** | ผ่าน | อิงหลักฐานมากที่สุด บอกได้ว่า run ใหม่เริ่มจากฐานปล่อยและการแก้ setup ถูกพักไว้ |
| T3b | baseline | ผ่านบางส่วน | ไม่อ่านโค้ด และเสนอ fork, best attempt และ XP ซึ่งไม่มีในแอป |

- **ข้อสรุป:** ทุกรอบแยกเวลาที่แสดง สถานะ live และหลักฐานสุดท้ายได้ แต่มีเพียงรอบที่อ่านโค้ด (T3a, T3e, T3a-o) ที่ยึดกับกลไกจริงของแอป ส่วนสกิลพาข้อแนะนำทั่วไปเรื่อง stale และ suspend เข้ามา (M-01) และ description ไม่ดึงโมเดล 2 ให้โหลดสกิล (P-02)

**กรณี 4 ขอเพียงวิดีโอ Manim**
- **พรอมป์:** "ต้องการเพียงวิดีโอ Manim สั้น ๆ อธิบาย Hohmann transfer ไม่ต้องสร้างบทเรียนหรือแก้ Orbitlab"
- **ไฟล์ที่ใช้:** T4a และ T4a-o ไม่ใช้ไฟล์สกิล, T4e ใช้ SKILL.md ของ interactive และ `scripts/hohmann_reference.py`, T4e-d ใช้เฉพาะ SKILL.md ของ lesson-design
- **ผล:**

| รอบ | การโหลดสกิล | ผล | ข้อผิดที่พบ |
|---|---|---|---|
| T4a / T4a-o | ไม่โหลดสกิล (ถูกต้อง) | ผ่าน | ให้สคริปต์ Manim อย่างเดียว ผู้ตัดสินพบจุดภาพย่อย เช่น T4a ใช้จังหวะ `smooth` บนวงรีซึ่งขัดกฎข้อ 2 ของเคปเลอร์ และทั้งสองรอบวาดวงนอกให้ดูเร็วกว่าวงใน (ข้อผิดแบบเดียวกับ T4e-d แม้ไม่ได้โหลดสกิล) |
| T4e | บังคับโหลด `/orbitlab-interactive-lesson` | ผ่านบางส่วน | ขอบเขตผ่าน: อ่านเฉพาะ `scripts/hohmann_reference.py` ของสกิล ไม่แตะ `src` และไม่เสนอระบบบทเรียน เรขาคณิตถูก (โลกอยู่ที่โฟกัส) แต่ Δv บนจอ 2.43/1.47 กม./วินาที เป็นค่าของ r₁ = 6,678 กม. ไม่ใช่ 6,778 กม. ที่ประกาศ (ค่าที่ถูกคือ 2.40/1.46) ความเร็วบนวงรีคงที่ ซึ่งขัดกฎข้อ 2 ของเคปเลอร์ และไม่แสดงทิศการจุด |
| T4e-d | บังคับโหลด `/orbitlab-lesson-design` | ผ่านบางส่วน | ขอบเขตผ่าน: ไม่แตะ Orbitlab และไม่สร้างบทเรียน เรขาคณิตและลูกศรทิศการจุดถูก แต่ดาวเทียมกระโดดข้ามจอตอนเข้าวงนอก จังหวะ `smooth` ขัดกฎข้อ 2 ของเคปเลอร์ และวาดวงนอกให้เร็วกว่าวงใน ซึ่งสอนความเข้าใจผิด (P-06) |

- **ข้อสรุป:** แม้สกิลถูกโหลด ก็ไม่ขยายงานไปสร้างบทเรียนหรือแตะ Orbitlab ตรงตามเกณฑ์ของกรณีนี้ ส่วนความถูกต้องของภาพเคลื่อนไหวเป็นจุดที่สกิลยังไม่ได้กำกับ (P-06)

**กรณีเชิงลบ (n=1 ต่อโมเดล ไม่มีรอบใดอ่านไฟล์สกิล)**

| พรอมป์ | ผล |
|---|---|
| "ช่วยออกแบบแผนการสอนวิชาเคมีเรื่องสมดุลกรด-เบส สำหรับนักเรียน ม.5 ความยาว 2 คาบ" | ไม่โหลดทั้งสองโมเดล |
| "ช่วยเขียนฟังก์ชัน TypeScript ที่แปลงสตริงวันที่ ISO 8601 เป็น Unix timestamp พร้อมตัวอย่างการใช้งาน" | ไม่โหลด |
| "ช่วยอธิบายว่า src/physics/orbital.ts คำนวณความสูง apoapsis และ periapsis อย่างไร" (งาน Orbitlab ที่ไม่ใช่บทเรียน) | ไม่โหลด ทุกรอบตอบในขอบเขต |

**การส่งต่องาน (มิติ C)**
- **พรอมป์:** "/orbitlab-interactive-lesson วางแผนการพัฒนา (แผนอย่างเดียว ยังไม่ต้องแก้โค้ด) เพื่อนำแบบบทเรียนด้านล่างไปทำใน Orbitlab โดยรักษาเจตนาทางการศึกษาของแบบบทเรียน" ตามด้วยแบบบทเรียนทั้งฉบับที่ได้จาก T1e
- **ไฟล์ที่ใช้:** T8h ใช้ SKILL.md ของ interactive และ `source-map.md` ส่วน T8h-o ใช้ SKILL.md, `source-map.md`, `implementation-checks.md`, `diagnostic-feedback.md` และ `implementation-report-template.md` ทั้งสองรอบไม่ได้โหลดสกิลออกแบบ
- **ผล:**

| รอบ | ผล | หมายเหตุ |
|---|---|---|
| T8h (โมเดล 1) | ผ่าน | แผนอย่างเดียว ใช้รหัส OBJ/ACT/CRIT ตามเดิม ยืนยันจากโค้ดว่าไม่มีชนิดบทเรียนใดอ่านตัววางแผน จึงให้ CRIT-01–07 เป็นใบงานและรูบริก ส่วนชนิดบทเรียนใหม่และคำใบ้ตามข้อผิดพลาดเป็นงานใหม่ รายงานจุดที่ต่างจากแบบบทเรียน และพบข้อผิดในแบบบทเรียนเองว่าเฉลยถ่ายโอนไม่ใช่วงต่ำสุด (ประมาณ 520 กม.) ข้ออ้างที่ผิดมีดังนี้: อ้างว่าข้อในคลังมี `observe` ทั้งที่ไม่มี, ตำหนิแบบบทเรียนว่าปัด Δv 800 → 400 กม. ผิด (216.4 แทน 217) ทั้งที่แบบบทเรียนถูก และอ้างว่าไฟล์บทเรียนเป็น v1 (มาจาก source-map ที่ล้าสมัย) นอกจากนี้ไม่ได้จับคู่ HINT-01..03 ทีละข้อ |
| T8h-o (โมเดล 2) | ผ่านบางส่วน | ละเอียดที่สุด มีตารางรายเกณฑ์ว่าข้อใดอัตโนมัติได้ผ่านชนิดบทเรียนใหม่ (ต้องขออนุญาตก่อน) และข้อใดยังเป็นรูบริก ตัวเลขถูกทุกตัว แต่เปลี่ยน CRIT-02 จาก "ตรวจแนวโน้มเท่านั้น" เป็นตรวจตัวเลข 874 ± 10 กม. และย้ายจุดกลางของ CRIT-05 โดยไม่รายงานว่าเป็นการแก้แบบบทเรียน (S-10) ยังอ้าง `readLesson` แทน `readAnyLesson` และอ้างว่า `BUILTIN_LESSONS` นับบทใหม่ ซึ่งมาจาก source-map ที่ล้าสมัย (M-01) |

**ข้อสรุปการส่งต่อ:**
- ทำได้ดี:
  - รักษาขอบเขต "แผนอย่างเดียว" และไม่รายงานการตรวจที่วางแผนไว้ว่าทำแล้ว
  - แยกเกณฑ์ที่ runtime ทำได้ออกจากรูบริกตามโค้ดจริง
  - รายงานจุดที่ต่างจากแบบบทเรียนจากโค้ด เช่น วงเริ่มต้นเป็น ISS 420 กม. และกับดักหน่วย
- ส่วนที่อ่อน:
  - ความหมายของเกณฑ์ เมื่อแผนพยายามทำให้เป็นอัตโนมัติ (S-10)
  - การพึ่ง source-map ที่ล้าสมัย (M-01)
- ข้อสรุปมิติ C จึงมีทั้งหลักฐานจากการอ่านไฟล์และหลักฐานพฤติกรรม 2 รอบ

### 4.3 ข้อสังเกตการเลือกสกิลเอง

n=1 ต่อช่อง ใช้เป็นข้อสังเกต ไม่ใช่อัตราความแม่นยำ

| พรอมป์ | โมเดล 1 | โมเดล 2 |
|---|---|---|
| กรณี 1 ออกแบบบทเรียน (ไม่มีคำว่า Orbitlab แต่อยู่ใน repo) | โหลด lesson-design | โหลด lesson-design |
| กรณี 2 วางแผนผลเก่า | โหลด interactive | โหลด interactive |
| กรณี 3 replay และคะแนน | โหลด interactive | **ไม่โหลด** |
| กรณี 4 Manim อย่างเดียว | ไม่โหลด (ถูกต้อง) | ไม่โหลด (ถูกต้อง) |
| เชิงลบ 3 แบบ | ไม่โหลดทั้ง 3 | ไม่โหลดทั้ง 3 |

**ผลรวมชุดแรก:** กรณีที่ควรโหลด โหลด 5 จาก 6 ช่อง ส่วนกรณีที่ไม่ควรโหลด ไม่โหลดครบ 8 จาก 8 ช่อง และทุกครั้งที่โหลดเลือกสกิลถูกตัว

**ชุดที่สอง (หลัง #168 มีสกิลโครงการครบ 5 ตัว: สองตัวนี้ และ `orbitlab-frontend-hud`, `orbitlab-threejs-shaders`, `orbitlab-webapp-testing`):**

| พรอมป์ | โมเดล 1 | โมเดล 2 |
|---|---|---|
| กรณี 1 | โหลด lesson-design | โหลด lesson-design |
| กรณี 2 | โหลด interactive | โหลด interactive |
| กรณี 3 | โหลด interactive | โหลด interactive |
| กรณี 4 | ไม่โหลดสกิลใด | ไม่โหลดสกิลใด |
| เชิงลบ 3 แบบ | ไม่โหลดสกิลใด | ไม่โหลดสกิลใด |

- ควรโหลด 6 จาก 6 ช่อง ไม่ควรโหลดก็ไม่โหลดครบ 8 จาก 8 ช่อง และสกิล 3 ตัวจาก #168 ไม่ถูกเลือกแทนสกิลบทเรียนในพรอมป์ชุดนี้เลย
- กรณี 3 ของโมเดล 2 ให้ผลต่างจากชุดแรก (ชุดแรกไม่โหลด) แสดงว่าการเลือกสกิลแปรผันได้ระหว่างรอบ
- ตรวจเฉพาะจุดในชุดที่สอง: รอบซ้ำของกรณี 2 (T2a5, T2a5-o) อ้าง `ResultSlot` และไม่ใช้ `telemetryRevision` เป็น run identity ส่วนกรณี 3 (T3a5, T3a5-o) ไม่ได้เสนอให้หยุดผลตรวจของเที่ยวบินที่บินแล้ว ความผิดพลาดของ T2a และ T3a จึงไม่ได้เกิดทุกรอบ (ดู M-01)

### 4.4 คำสั่งตรวจที่รันจริง

ทุกคำสั่งรันบน Linux ด้วย Python 3.13.16 และ Python รันแบบ `-I -B` จากโฟลเดอร์นอก bundle:

| คำสั่ง/การตรวจ | exit | ผล |
|---|---|---|
| แตก ZIP ลงโฟลเดอร์ใหม่ | 0 | 97 ไฟล์ |
| ตรวจ SHA-256 กับ bundle `MANIFEST.json` / package `MANIFEST.json` | 0 | 96/96 และ 23/23 ตรง ไม่มีไฟล์เกิน |
| เทียบ hash ใน `validation-results.json` (`input_hashes`) และ `installation-status.json` กับไฟล์สกิล | 0 | 12/12 ตรงทั้งสองชุด (สำเนาที่ติดตั้งบน Windows เข้าถึงไม่ได้) |
| เทียบ snapshot 66 ไฟล์กับ `git show dba7b0a:<path>` และ `5374b6d:<path>` | 0 | `dba7b0a`: ตรงทั้ง 66 ไฟล์ (65 ตรงเมื่อไม่นับ CRLF, 1 ตรงทุกไบต์); main: ต่าง 43, เหมือน 23 |
| `python3 -I -B review/check_reference.py` | 0 | 10/10 (ไม่มี `__pycache__` เกิดขึ้น) |
| `quick_validate.py` ของ Anthropic skill-creator (SHA-256 `f6531597…01892`, PyYAML 6.0.1) กับสกิลในแพ็กเกจ 2 ตัว และใน repo 2 ตัว | 0 ×4 | "Skill is valid!" ส่วน `quick_validate.py` ของ Codex ไม่มีในสภาพแวดล้อมนี้ จึงไม่ได้รัน |
| สคริปต์ตรวจ Hohmann แบบอิสระ (RK4 และกรณีขอบ) | 0 | ดูข้อ 1.3 |
| `hohmann_reference.py --r1-m 6569481.11 --r2-m 42159485.57` (Vallado 6-1) | 0 | 2.457038 / 1.478187 / 3.935224 km/s, 5.256713 ชม. |
| `claude -p` แสดงรายชื่อสกิล และทดสอบ `/สกิล` ให้ยก SKILL.md | 0 | ค้นพบทั้งสองสกิล และยืนยันการฉีดคำสั่ง |
| การทดลอง headless 24 รอบ (ข้อ 4.2), ชุดเลือกสกิลแบบมีสกิล 5 ตัว 14 รอบ (ข้อ 4.3) และ probe 3 รอบ | 0 ทุกรอบ | ดูตาราง |
| `git ls-files --eol .claude/skills` หลัง commit | 0 | 4 ไฟล์ `i/lf w/crlf` (S-12) |

ไม่ได้รัน `validate_package.py` และ `build_archives.py` เพราะสองสคริปต์นี้เขียนทับหลักฐานเดิม ไม่ได้รัน npm, vitest หรือ build ของแอป เพราะไม่มี `node_modules` และขอบเขตห้ามติดตั้ง dependency

---

## 5. ไฟล์ที่อ่าน และส่วนที่เข้าถึงไม่ได้

### 5.1 อ่านครบ

- **แพ็กเกจ:** ทั้ง 23 ไฟล์ (+ MANIFEST) ได้แก่ ไฟล์ทุกไฟล์ในสกิลทั้งสอง, README_TH, CLAUDE_FINAL_REVIEW_TH, review/ ทั้งหมด (รวมสคริปต์ 3 ตัวซึ่งอ่านก่อนรัน)
- **ระดับ bundle:** START_HERE_TH, CLAUDE_REVIEW_PROMPT_TH, SKILL_COVERAGE_TH, BUNDLE_VALIDATION, MANIFEST, SNAPSHOT_PROVENANCE และไฟล์ข้อเสนอต้นทางใน `background/`
- **ซอร์สที่พรอมป์ระบุ:** ทุกไฟล์ในรายการข้อ 3 ทั้งรุ่น snapshot และ main
  - `src/lessons/`: types, catalog, lesson-file, builtin/common, track1, grader, measures, hooks, progress, text, config
  - `src/lessons/assessment/`: types, expression, draw, score, bank (และ bank/orbits, helpers)
  - `src/ui/lessons/lesson-mode.ts`
  - `src/session/`: session, flight.worker (และ core, mirror, protocol ที่ไม่อยู่ใน snapshot แต่อ่านจาก git)
  - `src/replay/simview.ts`
  - `src/ui/`: telemetry, telemetry-charts, equations, equations-model, panel
  - `src/main.ts`
  - `src/physics/`: constants, orbital, tune-job
  - `src/orbit/maneuvers.ts`
  - `package.json`
  - tests: lessons, lessons-ui-core, lessons-history, lessons-round2, assessment, session, replay, timeaxis, chart-summary, tune-job, equations (`equations.test.ts` เปิดโดยผู้วิจารณ์ความครบถ้วน)
- **ไฟล์ใน repo นอก snapshot ที่ใช้ยืนยันข้อเท็จจริงที่ main:**
  - `docs/`: DECISIONS.md, development/SESSION-PROTOCOL.md, LESSON-REVIEW-CHECKLIST.md, PHYSICS.md (glossary), development/reports/teaching-held.md, IMPLEMENTATION-STATUS.md
  - `src/ui/`: held.ts, flight-lifecycle.ts, result-slot.ts, lessons/measure-text.ts, keep-units.ts, charts.ts
  - `src/physics/attitude-tune-job.ts`, `src/physics/lifetime-job.ts`, `src/projects/validation.ts`, `src/i18n/*`
  - tests: `tests/browser/` (run.mjs, journeys), `tests/lesson-grading-end.test.ts`, `tests/i18n*.test.ts`, `tests/maneuvers.test.ts`
- **ไฟล์ snapshot ที่ไม่มีใครเปิดอ่านละเอียด** (ไม่อยู่ในรายการบังคับ): `assessment/` (record, figures, diagrams, photos, flights), `bank/` (basics, control, failures, guidance, rockets), `builtin/` (track3, track4, coming), `mcp-tools.ts`, `tests/heavy/lessons-sixdof.test.ts`, `tests/assessment-flights.test.ts`
- **AGENTS.md / CLAUDE.md:** ไม่มีทั้งใน snapshot (`dba7b0a`) และ main กติกาของโครงการอยู่ใน `docs/DECISIONS.md` และ `docs/development/SESSION-PROTOCOL.md` (S-01)

### 5.2 เข้าถึงไม่ได้ (ไม่อ้างผลในส่วนเหล่านี้)

- สำเนาที่ติดตั้งบนเครื่องเจ้าของ: `C:\Users\Royin\.codex\skills\orbitlab-lesson-design` และ `…\orbitlab-interactive-lesson` ยืนยันได้เพียงว่าไฟล์ในแพ็กเกจตรงกับ hash ที่ `installation-status.json` บันทึกไว้ แต่ไม่ได้ยืนยันสำเนาจริงบนเครื่อง
- โฟลเดอร์ต้นทาง `C:\…\Claude code version` บนเครื่องเจ้าของ และสถานะ `git status` ของโฟลเดอร์นั้น (ใน provenance ล้มด้วย `mmap failed`) ใช้ snapshot และ git ของ repo แทน
- `quick_validate.py` ของ Codex (`C:\Users\Royin\.codex\skills\.system\skill-creator\scripts\quick_validate.py`) ใช้ตัวตรวจของ Anthropic แทน ซึ่งมีเกณฑ์ต่างกัน
- URL ภายนอกใน README_TH.md:146, :169 และ HOHMANN_PILOT_TH.md:103 ไม่ได้ตรวจ รวมถึงหนังสืออ้างอิง (Vallado, Bate–Mueller–White, NASA Basics of Space Flight)
- การรันแอป (Vite/vitest/Playwright) ไม่ได้ทำ เพราะไม่มี `node_modules` และขอบเขตห้ามติดตั้ง
- transcript ดิบของการทดลองและ JSON ผลของผู้ตรวจย่อยเก็บไว้ใน scratchpad ของ session นี้เท่านั้น ไม่ได้ commit เพราะเป็นหลักฐานขนาดใหญ่และมีชื่อรุ่นโมเดล จึงหายไปเมื่อ session ถูกเก็บ

---

## 6. สิ่งที่ยังไม่ถูกพิสูจน์

- **การเลือกสกิลอัตโนมัติ:** มีเพียงข้อสังเกต n=1 ต่อช่องใน Claude Code (ข้อ 4.3) ยังไม่มีอัตราความแม่นยำ ยังไม่ได้ทดสอบใน claude.ai หลังอัปโหลด และไม่ได้ทดสอบใน Codex
- **การทำงานกับแอปจริงในเบราว์เซอร์:** ไม่มีการ implement หรือรัน UI ข้อสรุปเรื่องพฤติกรรม UI มาจากการอ่านซอร์ส
- **ประสิทธิภาพ:** ไม่ได้วัด FPS, ภาระ worker หรือขนาด bundle
- **ผลการเรียนรู้กับผู้เรียนจริง:** ไม่มีข้อมูลผู้เรียน เวลาเรียนและความยากเป็นการประมาณ
- **deployment:** ไม่ได้ตรวจว่าเว็บที่เผยแพร่ตรงกับ main
- **สำเนาที่ติดตั้งบนเครื่องเจ้าของ:** ตรงกับแพ็กเกจหรือไม่ยังไม่ได้ยืนยัน (ข้อ 5.2)
- **พฤติกรรมของสกิลบน snapshot `dba7b0a`:** ยืนยันจากการอ่านซอร์สเท่านั้น ไม่ได้ทดลอง

---

## 7. รายการแก้ไขที่แนะนำตามลำดับ และเงื่อนไขปิด

| ลำดับ | งาน | ครอบคลุม | เงื่อนไขปิด |
|---|---|---|---|
| 1 | re-baseline source-map และ implementation-checks กับ main (ระบุ commit, หัวข้อ "Known drift", กติกาโครงการ) และแก้ interactive `SKILL.md:35-36, 56` | M-01, S-01, P-13, P-14, P-22 | grep ตาม M-01 ผ่าน และทดลองกรณี 2 และ 3 ซ้ำทั้งรอบเลือกเองและรอบระบุชื่อสกิล ผลไม่พลาด `ResultSlot`/session identity ไม่เสนอล้างเกรดที่ตรึงเพราะ held edit และเสนอ `test:browser:smoke` เมื่อแก้ UI |
| 2 | เติมข้อเท็จจริง runtime ที่ทั้งสองสกิลต้องรู้: การเปิดเฉลยและ D-6, คำใบ้ร่วม 3 ข้อ, `answer` = ค่าวัดจากเที่ยวบิน, การล้างคำตอบเมื่อมีเที่ยวบินใหม่ และ persistence รวมถึงให้สกิล interactive รักษาความหมายของเกณฑ์ตามแบบบทเรียน | S-03, S-04, S-05, S-06, S-08, S-10 | grep `passedWithHelp`, "exactly 3", `customLessons` ทดลองคำขอ worked-example hint และทดลองส่งต่อซ้ำ (T8h) |
| 3 | เพิ่มข้อกำหนดในสกิลออกแบบ: negative acceptance และ glossary รวมถึงข้อเสนอเรื่องพื้นผิวจำลอง ระบบ assessment และค่าคงที่ | S-07, S-11, P-34, P-35, P-36 | ทดลองกรณี 1 ซ้ำ ต้องมีกรณีค่าเริ่มต้นต้องไม่ผ่าน ไม่สมมติการให้คะแนนอัตโนมัติจากตัววางแผน และใช้ R_EARTH หรือระบุค่าที่ปัด |
| 4 | แก้ตารางเทสต์และศัพท์บทบาทผู้ตรวจ | S-09, S-02, P-12 | เทียบ `describe` กับแถว และ grep ว่าไม่มี "Claude-reviewed" |
| 5 | แก้ชุดหลักฐาน: README ไม่อ้างว่าตัวอย่าง "ครบ", ลิงก์พกพาได้, หมายเหตุ forward test, ป้ายเอกสารเก่า และทดลองซ้ำพร้อม metadata | S-13, S-14, S-15, P-30 | ตรวจลิงก์บนเครื่องอื่นได้ 0 ลิงก์เสีย และรายงานทดลองฉบับใหม่บันทึกพรอมป์ วิธีเรียก และ hash |
| 6 | ตัดสินใจเรื่อง line ending แล้วสร้าง manifest ใหม่ | S-12, P-31 | hash ใน MANIFEST ตรงกับ blob ใน git และสำเนาที่ติดตั้ง |
| 7 | ข้อเสนอเสริมที่เหลือ (description, helper guard, ตารางหน่วย, ภาพเคลื่อนไหว ฯลฯ) | P- ที่ไม่อยู่ในลำดับ 1–6 | ตามคอลัมน์วิธีตรวจในตาราง 2.3 ถ้าไม่มี ให้ grep ข้อความที่เติมแล้วทดลองกรณีที่เกี่ยวข้องซ้ำ |

---

## 8. การบันทึกสกิลเข้า repo และบัญชี

### Repo `ROYIN001/Orbitlab`

- branch `claude/gifted-cannon-fh0e1o` และ draft PR [ROYIN001/Orbitlab#169](https://github.com/ROYIN001/Orbitlab/pull/169)
- `.claude/skills/orbitlab-lesson-design/` และ `.claude/skills/orbitlab-interactive-lesson/` คัดลอกจากแพ็กเกจแบบไม่แก้เนื้อหา ทั้ง 12 ไฟล์ตรงกับ MANIFEST เมื่อไม่นับ CRLF (S-12)
- `.gitignore`: commit `cac9e95` เปลี่ยน `.claude/` เป็น `.claude/*` + `!.claude/skills/` แต่ main (#168, `63db68f`) เปลี่ยนแบบเดียวกันแล้ว หลัง merge main เข้า branch (`0eba790`) branch นี้จึงไม่แก้ `.gitignore` อีก และ `.claude/skills/` ใน branch มีสกิล 5 ตัว (สองตัวนี้กับสกิลโครงการ 3 ตัวจาก #168)
- session ใหม่ของ Claude Code ใน repo นี้ค้นพบสกิลทั้งสองได้ (ข้อ 4.1)
- รายงานนี้อยู่ที่ `docs/history/skills-review-2026-10-19/CLAUDE_FINAL_REVIEW_REPORT_TH.md` และมีสำเนาชื่อเดียวกันที่รากของ bundle ที่แตกแล้ว (ข้าง `START_HERE_TH.md`) ใน scratchpad ของ session นี้

### บัญชี claude.ai

- session นี้ไม่มีเครื่องมืออัปโหลดสกิลเข้าบัญชี จึง**ยังไม่ได้บันทึกเข้าบัญชี**
- เตรียม ZIP สำหรับอัปโหลดไว้แล้ว 2 ไฟล์ (`orbitlab-lesson-design.zip` 5 ไฟล์ และ `orbitlab-interactive-lesson.zip` 7 ไฟล์) โครงสร้างเป็น `<ชื่อสกิล>/SKILL.md` ตามเอกสาร "Create custom skills" ของ Anthropic และเนื้อหาตรงกับแพ็กเกจทุกไบต์
- **วิธีอัปโหลด:** claude.ai → Customize → Skills แล้วเปิดใช้งาน
- description ยาว 287 และ 322 ตัวอักษร อยู่ในขีดจำกัด "Up to 1,024 characters" ของเอกสาร Anthropic "Create custom skills" (`https://claude.com/docs/skills/how-to.md` เปิดอ่านเมื่อ 2026-10-19) และผ่านตัวตรวจ `quick_validate.py` ซึ่งใช้เพดานเดียวกัน ผลค้นเว็บบางแหล่งอ้างเพดาน 200 ตัวอักษร แต่ไม่ตรงกับเอกสารฉบับนี้ จึงควรยืนยันอีกครั้งตอนอัปโหลดว่า description ไม่ถูกปฏิเสธหรือตัด
- **คำแนะนำ:** ถ้าจะใช้สกิล interactive ใน claude.ai กับงานจริงของ repo ควรแก้ M-01 ก่อน

---

## 9. หากแก้สกิลภายหลัง ต้องตรวจซ้ำและอัปเดตอะไรบ้าง

รอบนี้**ยังไม่ได้แก้สกิลและยังไม่ได้จัดแพ็กเกจใหม่** (ZIP อัปโหลด 2 ไฟล์ในหัวข้อ 8 บรรจุไฟล์เดิมโดยไม่แก้เนื้อหา) เมื่อแก้แล้วต้องทำดังนี้:

1. **ต้นฉบับ:** `orbitlab-learning-v1/skills/<ชื่อ>/` ตัดสินเรื่อง CRLF/LF ให้เสร็จก่อนคำนวณ hash ใหม่ (S-12)
2. **สำเนาทุกที่:**
   - Codex บน Windows: `C:\Users\Royin\.codex\skills\<ชื่อ>`
   - repo: `.claude/skills/<ชื่อ>` บน branch ที่แก้ (PR ใหม่หรือ #169 ถ้ายังไม่ merge)
   - บัญชี claude.ai: อัปโหลด ZIP ใหม่
3. **หลักฐาน:**
   - package `MANIFEST.json`
   - `review/validation-results.json` (รันใหม่หลังแก้สคริปต์ตาม P-31)
   - `review/installation-status.json` เก็บ hash ของสำเนาจริง
   - forward test ใหม่ที่บันทึกพรอมป์และ hash
   - ถ้าแก้ตัวอย่าง: `review/HOHMANN_PILOT_TH.md`, `README_TH.md`, `review/QA_SUMMARY_TH.md`
4. **ระดับ bundle:** `BUNDLE_VALIDATION.json`, bundle `MANIFEST.json`, `SNAPSHOT_PROVENANCE.json` (ถ้า re-baseline กับ main ให้บันทึก commit ใหม่)
5. **ZIP:** `orbitlab-learning-v1.zip`, ZIP รายสกิล, `orbitlab-learning-v1-archives.json` และ `orbitlab-claude-review-bundle.zip`
6. **ตรวจซ้ำ:**
   - quick_validate ทั้งของ Codex และ Anthropic
   - `check_reference.py`
   - การทดลองกรณี 1–4, กรณีเชิงลบ และการส่งต่อ บน main ตามวิธีในข้อ 4
   - ตรวจทานรายงานนี้ใหม่ทุกข้อที่ถูกแก้
