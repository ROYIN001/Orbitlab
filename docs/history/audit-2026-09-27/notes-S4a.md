# บันทึกเซสชัน S4a — Placement test (A7, A13)

สาขา `claude/audit0927-s4a-placement` จาก `origin/main` ที่ `dba7b0a`

## สิ่งที่ทำ

| รหัส | commit | สรุป |
|---|---|---|
| A7 | `Placement test: keep an unsent answer through a change of language` | draft model แบบ DOM-free ที่ `src/lessons/assessment/draft.ts`; `renderQuestion()` วาดทุกปุ่ม/ช่องจาก draft และเขียนกลับทุกครั้งที่ผู้ใช้เปลี่ยน; attempt ถูกเขียนเฉพาะตอนกดถัดไปหรือข้าม แล้วล้าง draft |
| A13 | `Placement test: require and explain confidence, show the count behind the score` | ข้อ understanding ต้องเลือก confidence ก่อนกดถัดไป (ข้ามยังได้); อธิบายผลต่อคะแนนใน intro และใต้ปุ่ม; หน้าผลแสดง "ถูก x จาก y ข้อ" และจำนวน misconception ทั้งรวมและรายด้าน |

### A7 — draft model

- `QuestionDraft` เก็บต่อ question id: `picked` (choice index / vehicle id), `chosen` (multi), `put` (ลำดับของ order), `typed` (ข้อความตัวเลขตามที่พิมพ์ รวมที่ยังไม่เสร็จ เช่น `12,`), `dontKnow`, `confidence`, `focus` (key ของช่องที่โฟกัสล่าสุด) และ `caret` ของช่องตัวเลข
- เก็บแต่ index/id/ข้อความที่พิมพ์ ไม่เก็บ label จึงไม่ขึ้นกับภาษา
- `draftValue` / `canSubmit` / `draftAnswer` เป็นจุดเดียวที่แปลง draft เป็น `Answer`
- **โฟกัส:** จำช่องที่ใช้ล่าสุดผ่าน `focusin` และคืนโฟกัส (รวม caret) หลังวาดใหม่ **เฉพาะเมื่อโฟกัสอยู่ในแบบทดสอบหรือไม่อยู่ที่ใดเลย** ตอนเปลี่ยนภาษา — ถ้าผู้ใช้เปลี่ยนผ่านเมนูภาษา (`#lang-select`) โฟกัสจะคงอยู่ที่เมนู ไม่ถูกดึงกลับ เพื่อไม่ทำให้ผู้ใช้คีย์บอร์ดหลงตำแหน่ง
- พฤติกรรมเล็กที่เปลี่ยนตามมา: กด "ไม่ทราบ" ในข้อตัวเลขตอนนี้ล้างช่องที่พิมพ์ไว้ด้วย (เดิมข้อความค้างอยู่ในช่องแต่คำตอบเป็น null)

### A13 — นโยบาย D2 (ไม่เปลี่ยน `score.ts`)

- คง `LEVEL_WEIGHT` และ `GUESS_CREDIT = 0.5`
- ข้อ understanding ที่ตอบแล้วต้องมี confidence ที่ผู้ใช้เลือกเอง จึงไม่มีคำตอบใหม่ที่บันทึกเป็น `'unsure'` โดยอัตโนมัติอีก → คำตอบเดียวกันจะไม่ได้คะแนนต่างกันเพราะ "ไม่เลือก"
- ข้ามข้อ → `value: null, skipped: true` ไม่มี confidence (เหมือนเดิม)
- attempt จากรุ่นเก่าที่ answer ไม่มี `confidence` ยังคิดคะแนนเหมือนเดิม (ได้เต็มเหมือน `'unsure'`) — มี test ตรึงไว้
- key ใหม่ `assess.confidenceNote`, `assess.correctOf`, `assess.misconceptionCount`, `assess.summary`, `assess.scoreNote` และเพิ่มประโยคท้าย `assess.intro` ครบ en/ru/th
- หน้าผลบอกด้วยว่าเปอร์เซ็นต์ถ่วงน้ำหนักตามระดับความยากและนับข้อ "เดา" ครึ่งคะแนน จึงอาจไม่ตรงกับจำนวนข้อที่ถูก

### ไฟล์นอกรายการเจ้าของ

- `src/ui/lessons/lessons.css`: เพิ่ม 4 กฎ (`.assess-conf-note`, `.assess-bar-name`, `.assess-count`, `.assess-summary`) ในส่วน placement test เพื่อจัดข้อความใหม่ ไม่ได้แตะ `src/style.css` ถ้าเจ้าของรวมต้องการ ย้ายไปที่อื่นได้โดยไม่กระทบตรรกะ

## Test

- `tests/assessment.test.ts` เพิ่ม describe `a draft answer` 6 ข้อ:
  1. แปลง draft ทุกชนิด (choice, multi, order, numeric รวมข้อความที่พิมพ์ไม่เสร็จ) เป็นค่า answer และคืน undefined ขณะยังไม่ครบ
  2. ข้อ understanding ต้องมี confidence ก่อน `canSubmit`; ข้อ knowledge ไม่ต้อง; skip ไม่บันทึก confidence
  3. ทุกข้อใน 3 draw: ข้อ understanding บันทึก confidence ที่เลือกเสมอ และเครดิตเป็นไปตาม `GUESS_CREDIT`
  4. draft ทุกข้อคงเดิมผ่าน `setLang` EN → TH → RU และ `attempt.answers` ว่างจนกว่าจะกดถัดไป (ระดับ model — ตัว `applyLanguage()` ต้องมี DOM จึงตรวจในเบราว์เซอร์ ดูด้านล่าง)
  5. `DraftBook.clear` หลังบันทึก
  6. attempt ที่ไม่มี confidence ได้ผลเท่ากับ `'unsure'` ทุกประการ
- test เดิมทุกข้อไม่ถูกแก้ คะแนนของ attempt เดิมไม่เปลี่ยน
- `npm run typecheck && npm test`: ผ่าน — 128 ไฟล์, 1675 test

## ตรวจในเบราว์เซอร์ (`npm run dev`, `#/lessons/test`, Chromium ผ่าน Playwright)

ใช้ attempt ที่ตั้งไว้ใน localStorage ให้มีข้อแต่ละชนิด แล้วเปลี่ยนภาษาผ่าน `#lang-select` จริง

**1280×860** (b-float choice/understanding, b-multi-leo, b-order-altitude, b-gravity-altitude numeric, b-vehicle-distinct):

- ข้อ 1 เลือกตัวเลือกแล้วยังไม่เลือก confidence → ปุ่มถัดไป disabled; เลือก Sure → enabled; EN → TH → RU คงตัวเลือก + Sure และปุ่มยัง enabled; ข้อความใต้ปุ่มเปลี่ยนภาษา; `answers` ใน storage ยังเป็น 0 จนกดถัดไป แล้วบันทึก `{value:1, confidence:"sure"}`
- ข้อ multi เลือก 2 ข้อ → คงผ่าน TH, RU
- ข้อ order ใส่ 2 จาก 5 (`2·1··`) → คงผ่าน TH, RU และปุ่มยัง disabled จนใส่ครบ
- ข้อตัวเลขพิมพ์ `12,` → ช่องยังแสดง `12,` ใน TH, RU
- เปลี่ยนภาษาขณะโฟกัสอยู่ในช่องตัวเลข (เรียก `setLang` ตรง) → โฟกัสกลับมาที่ช่อง caret ตำแหน่งเดิม
- ข้ามข้อ vehicle → บันทึก `{value:null, skipped:true}`
- หน้าผล EN/TH/RU แสดงบรรทัดสรุป "ถูก x จาก y ข้อ · ความเข้าใจคลาดเคลื่อน n ข้อ" และหมายเหตุเรื่องน้ำหนัก, แต่ละแถบมี "ถูก x จาก y ข้อ" (+ จำนวน misconception ถ้ามี); ไม่มี horizontal overflow

**390×844 (mobile, touch)** (b-multi-freefall multi/understanding — ข้อ understanding ในคลังมีแค่ชนิด choice และ multi):

- เลือก 2 ข้อ + Guessing → EN → TH → RU คงทั้งหมด ปุ่มถัดไป enabled; โฟกัสคงอยู่ที่ `#lang-select` หลังเปลี่ยนภาษาผ่านเมนู
- บันทึก `{value:"1,2", confidence:"guess"}`
- หน้าผลและหน้า intro ภาษาไทย (มีประโยคใหม่) ไม่ล้นจอ; ปุ่ม confidence ขึ้นบรรทัดใหม่ได้เรียบร้อย ข้อความอธิบายอ่านได้

หมายเหตุ: รอบแรกที่ 390×844 ในสคริปต์ยาวหมดเวลาเพราะ dev server ในคอนเทนเนอร์ช้า (โหลดหน้าแรก ~25 วินาที) จึงรันสคริปต์สั้นแยกสำหรับ mobile สคริปต์ probe อยู่นอก repo (ไม่มี `tests/probe/`)

## สิ่งที่ไม่ได้ทำ / ข้อเสนอ

- ไม่ได้เพิ่ม DOM test environment (happy-dom/jsdom) เพื่อทดสอบ `applyLanguage()` ใน unit test เพราะเป็นการเพิ่ม dependency ใหม่ — ถ้าต้องการ ควรทำพร้อม S6 (browser harness) โดยเพิ่ม journey: เลือกคำตอบ → เปลี่ยนภาษา 3 ภาษา → ตรวจว่ายังเลือกอยู่และ storage ไม่เปลี่ยน
- ข้อความภาษาอังกฤษ "0 of 1 questions right" ไม่ได้จัดรูปเอกพจน์ เพราะแบบทดสอบจริงมี 25 ข้อเสมอ และ `t()` ไม่รองรับ plural
- draft ไม่ถูกบันทึกลง storage (ปิดแท็บแล้วคำตอบที่ยังไม่ส่งหาย เหมือนเดิม) — อยู่นอกขอบเขต A7
