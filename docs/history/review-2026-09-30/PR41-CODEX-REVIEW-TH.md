# ผลตรวจ PR #41 "Fix audited state, exports, orbital solvers, content and rendering" (Codex)

ตรวจวันที่ 30 กันยายน 2026 · สาขา `codex/audit-acceptance` head `bd3d6e3` · ฐาน `0a6d1a7` (main ตอนนี้ `404eb0c` ล้ำหน้าอยู่ 2 commit ที่แก้เอกสารอย่างเดียว)
วิธีตรวจ: อ่าน diff ส่วน source/tests/workflows ทั้งหมด (76 ไฟล์, +4,168/−402) ด้วยตัวเอง, ตรวจสอบพีชคณิตของ Kepler/Lambert ด้วยมือ, สร้าง worktree ของสาขาแล้วรัน `tsc --noEmit`, `vite build`, ชุด test ใหม่และที่แก้ 23 ไฟล์ (300 รายการ) และ `tests/build-catalogue-matrix.test.ts` แยกต่างหาก จากนั้นให้ผู้ตรวจ 4 ด้าน (บทเรียน/ตัวเลข/UI-โครงสร้าง/สุขอนามัย repo) ตรวจซ้ำ และให้ผู้ยืนยัน 2 คนต่อข้อค้นพบพยายามหักล้าง (ผลส่วนนี้อยู่ในหัวข้อ 5)

## 1. สรุปสำหรับตัดสินใจ

**คำแนะนำ: ควร merge หลังแก้ 4 จุด** (หัวข้อ 3) และ **แยกหลักฐาน 447 ไฟล์ออกจากประวัติ main** เนื้อหาโค้ดของ PR เป็นการแก้บั๊กจริงที่ audit เมื่อ 27–28 ก.ย. ชี้ไว้ และส่วนใหญ่แก้ถูกวิธี ผลตรวจบนเครื่องนี้: typecheck ผ่าน, build ผ่าน, test ใหม่/ที่แก้ 23 ไฟล์ 300 รายการผ่าน, matrix 6,542 รายการผ่านใน 103 s, CI ของ GitHub บน head `bd3d6e3` ผ่าน (run 36643910055)

สิ่งที่ PR ทำได้ดีและควรเก็บไว้ทั้งหมด:

- **Drafts ของคำตอบบทเรียน** (`src/lessons/answer-drafts.ts`, `lesson-mode.ts`): ข้อความดิบที่พิมพ์คงอยู่เมื่อกด Hint/เปลี่ยนภาษา ตรงกับ A7/L1 ของ audit
- **การกู้ progress ที่อ่านไม่ได้** (`src/lessons/progress.ts`): เก็บสำเนา raw ไว้ใต้ `orbitlab.lessons.recovery*` ก่อนเขียนทับ และไม่เขียนทับเมื่ออ่าน storage ไม่ได้เลย — ปิดช่องที่ notes-S4b ส่งต่อไว้
- **Design store ไม่ทิ้ง record ที่อ่านไม่ออก** (`src/design/design-store.ts`): Save/Remove คงข้อมูลดิบไว้และปฏิเสธด้วยรหัส `collection` เมื่อโครงสร้างเสีย/เวอร์ชันใหม่กว่า
- **Monte Carlo pool** (`src/physics/monte-carlo-job.ts`): constructor ล้มเหลวแล้วเก็บกวาด worker ที่สร้างไปแล้ว, replacement worker ที่สร้างไม่ได้จบชุดอย่างสะอาดพร้อมข้อความ — ปิด A18 (แผน S7 ครึ่งหนึ่ง)
- **Kepler ใกล้ e = 1** (`src/orbit/kepler.ts`): กิ่ง near-parabolic ใช้ x − sin x แบบอนุกรมและ bisection บนสมการ Kepler ทั่วไป ตรวจพีชคณิตแล้ว: M = (1−e)E + e(E − sin E) สำหรับวงรี และ (e−1)H + e(sinh H − H) สำหรับไฮเพอร์โบลา; พิกัด (a(δ − 2 sin²(E/2)), a√(δ(1+e)) sin E) และตัวหาร δ + 2e sin²(E/2) = 1 − e cos E ถูกต้อง; a จาก h² ทำให้คู่ a/e สอดคล้องกับโมเมนตัมเชิงมุมที่คำนวณได้ดี
- **Lambert ใกล้ 180°** (`src/orbit/maneuvers.ts`): A = √(r₁r₂(1+cos θ)) เขียนใหม่เป็น |r₁×r₂|/√(r₁r₂(1−cos θ)) เมื่อ cos θ < 0 และคืนความเร็วในองค์ประกอบรัศมี/ตามแนวโคจรแทน (r₂ − f r₁)/g ตรวจพีชคณิตแล้วเท่ากันทุกพจน์ (ใช้ A² = r₁r₂(1+cos θ) และ k = (y − r₁ − r₂)/A); เพิ่ม guard เมื่อ r₁, r₂ อยู่ในแนวเดียวกัน
- **ภาษาของใบงานตรึงกับ sheet** (`tFor(lang)` ใน `src/i18n/index.ts`, `docx.ts`, `html.ts`) และชื่อไฟล์จับก่อน `await` ทำให้ TH→RU ระหว่างรอ export ไม่ปนกัน; DOCX ใช้ keepNext/keepLines เป็นสายจนถึงตัวเลือกสุดท้าย
- **ป้ายเหตุการณ์ในกราฟที่ export** ไม่ทับกัน (`layoutChartMarkerLabels` ใช้เฉพาะตอน export หน้าจอปกติไม่เปลี่ยน)
- **ข้อความ Physics & sources** ไม่บอกว่า 6-DOF "ไม่มี slosh/bending" อีกต่อไป (A8 จุดที่ 1 ของแผน S5) และ **60 strings ในคลังข้อสอบ/บทเรียน** ถูกแก้ให้ถูกต้องขึ้น (เช่น IGM บินครั้งแรก 1965 บน Saturn I, Apollo 13 ราว 56 ชม., ระบุ independent events ในโจทย์ pⁿ, กรอบ misconception ที่เคยตีความคำตอบมีเหตุผลเป็นความเข้าใจผิด)
- **Rubric ประวัติศาสตร์** บท 5.3–5.5 ตรวจมวล Sputnik 83.6 ± 0.1 kg, ความเอียง Vostok 64.95 ± 0.1°, apogee Apollo 370,000 ± 10,000 km และ lock ของ guidance ตรวจ PEG/IGM ด้วย (L4/L5)
- **Star field ใช้โมดูลร่วม** (`src/render/stars.ts`) ขนาดดาวสัมพันธ์ CSS pixel; ดาวใน Orbit อยู่หลังโลกเสมอที่ portrait zoom สูงสุด

## 2. ข้อค้นพบที่ต้องตัดสินใจก่อน merge

| # | เรื่อง | รายละเอียด | ข้อเสนอ |
|---|---|---|---|
| R1 | **ตาราง Mission result เปลี่ยนความหมาย** (`src/ui/result-content.ts`) | เดิมตารางใช้ apsides ที่ verdict ตัดสิน (six-DOF: ค่าต่ำสุด/สูงสุดของรอบถัดไปภายใต้ J2 ที่ event บันทึก) เพื่อให้ตัวเลขตรงกับคำตัดสิน; PR เปลี่ยนไปใช้ osculating elements ของเฟรมที่กำลังดู และ test ใหม่ **ยืนยันโดยตั้งใจ** ว่า outcome = `target` พร้อมแถว perigee/apogee `outside: true` ได้ (ดู `tests/mission-result.test.ts` กรณี 488/511 km กับเป้า 500 km) ผลคือผู้เรียนอาจเห็นแถวสีแดง "นอกเกณฑ์" ใต้หัวข้อ "ภารกิจสำเร็จ" ซึ่งเป็นสิ่งที่รายงาน addendum ของ Codex เองเตือนไว้ว่า "ห้ามทิ้งค่า J2 แล้วให้ verdict ขัดกับเกณฑ์ของตัวเอง" | ให้ตารางแสดง **สองชุด**: "ค่าที่ใช้ตัดสิน ณ เวลาที่ถึงวงโคจร" (จาก event, ระบุว่าเป็นค่า J2 รอบถัดไปเมื่อเป็น six-DOF) และ "วงโคจร ณ เวลาที่กำลังดู" (osculating) โดยธง `outside` มาจากชุดแรกเท่านั้น; แก้ caption สามภาษาให้ตรง |
| R2 | **หลักฐาน 447 ไฟล์ (19 MB) ใน `docs/audit-2026-09-29/`** | ไม่ตามธรรมเนียม repo ที่เก็บบันทึกไว้ใต้ `docs/history/<วันที่>/` เฉพาะรายงาน; มีโฟลเดอร์ซ้อน `audit-2026-09-29/audit-2026-09-28/` และ `audit-2026-09-29/audit-2026-09-29/`, ไฟล์ PNG/CSV/log/`.exit`, สคริปต์ Python/PowerShell ที่อ้าง `../source-integrated`, ลิงก์ path Windows `C:/Users/Royin/...` ใน markdown, `.gitattributes` ในเอกสาร, `SHA256SUMS`; README ของชุดเองบอกว่า "ไม่ใช่แพ็กเกจ standalone" ทุก clone ในอนาคตจะดึง 19 MB นี้ตลอดไป | ย้ายรายงาน markdown หลัก (README-TH, Orbitlab-acceptance-TH, executive-findings, source-regressions, learning/lessons/build/assessment reviews) ไป `docs/history/audit-2026-09-29/`; เก็บ evidence packet เป็น GitHub Release asset (zip + SHA256SUMS) หรือสาขา `evidence/2026-09-29` ที่ไม่ merge; แก้ลิงก์ Windows path ให้เป็น relative |
| R3 | **workflow ใหม่ 3 ไฟล์ตายหลัง merge** (`.github/workflows/audit-browser-acceptance.yml`, `audit-case-exports.yml`, `heavy-audit.yml`) | trigger เฉพาะ `push` ไปสาขา `codex/audit-acceptance` + `workflow_dispatch`; หลัง merge จะไม่รันเองอีก; `heavy-audit` เป็น matrix 6 ตัวขนาน timeout 360 นาที (ค่าใช้จ่าย runner สูงถ้ากด dispatch); ซ้อนกับ `ci.yml`/`deploy.yml` ที่มีอยู่ | เลือกอย่างใดอย่างหนึ่ง: (ก) ลบทั้งสาม แล้วเก็บ `scripts/audit-heavy/` ไว้เป็นเครื่องมือรันมือ; หรือ (ข) แปลงเป็น workflow เดียว `workflow_dispatch` ที่มี input เลือกชุด (browser-full / case-exports / heavy) และเอกสารวิธีใช้ใน README |
| R4 | **ตัวเลข "9,259 tests"** | มาจาก `tests/build-catalogue-matrix.test.ts` ไฟล์เดียวที่ generate 6,542 กรณี (ผ่านใน 103 s บนเครื่องนี้ ไม่เขียนไฟล์) บวก test ใหม่ ~185; coverage ที่เพิ่มจริงคือ 23 ไฟล์ ไม่ใช่ 3.7 เท่า | ยอมรับ matrix ไว้ในชุดปกติได้ (เวลาเพิ่ม ~1.7 นาที) แต่ในเอกสารสถานะให้รายงานเป็น "2,717 tests + matrix 6,542 กรณี" เพื่อไม่ให้ตัวเลขชี้นำ; อัปเดต `docs/IMPLEMENTATION-STATUS.md` ที่ยังบอก 2,532 |

## 3. ข้อค้นพบระดับรองที่ควรแก้ใน PR นี้หรือ follow-up ทันที

_(เติมจากผลผู้ตรวจ 4 ด้านและผู้ยืนยัน — หัวข้อ 5)_

## 4. สิ่งที่ตรวจแล้วไม่พบปัญหา (เพื่อไม่ต้องตรวจซ้ำ)

- `src/audio/soundtrack.ts`: `open()` เปิด connection ใหม่ทุกครั้ง การ `db.close()` หลัง transaction complete จึงปลอดภัย; callers ทั้งหมดอยู่ใน `soundtrack-panel.ts` และมี `.catch` ผ่านคิว `enqueue`
- `src/lessons/grader.ts`: `same()` มีอยู่แล้ว (บรรทัด 149); การเทียบ `explicitGuidance` ใช้ `JSON.stringify(a ?? null)` จึงรับ `undefined` ทั้งสองฝั่งได้
- Lesson 2.2 (`guid-peg`): เกณฑ์ `dvLeft ≥ 20` มีอยู่แล้วใน criteria; PR แค่ทำให้ brief ตรงกับเกณฑ์
- Lesson 5.4 (Vostok): mission doc ตั้ง `padId: 'site1'` และเกณฑ์ inclination 64.85–65.05 ตรงกับวงโคจรจริง 64.95°
- `tests/propagator.test.ts`: import guard เปลี่ยนจาก regex เป็น AST (vite `parseSync`) เพื่อไม่นับ `import type` เป็น runtime dependency — จำเป็นเพราะ `progress.ts` import type จาก propagator; มี 11 กรณีตรวจ classifier เอง
- `package.json`, `vite.config.ts`, `index.html`, `public/` ไม่ถูกแก้ — precache manifest ของ PWA ไม่เปลี่ยนนอกจาก hash ของ bundle

## 5. ผลผู้ตรวจ 4 ด้านและการยืนยันแบบโต้แย้ง

_(เติมเมื่อผลมาถึง)_

## 6. ลำดับ merge ที่เสนอสำหรับ PR ที่เปิดอยู่

1. **#41** หลังแก้ R1–R3 (R4 เป็นเรื่องเอกสาร) — เพราะแก้บั๊กที่กระทบผู้เรียนโดยตรงและไม่แตะฟิสิกส์การบิน
2. **#36** (F14) — ต้อง rebase/merge main ก่อน (ล้าหลัง 54 commit, conflict) และรัน `test:heavy` + `test:sixdof-fleet` ตามที่ผู้เขียนตั้งเงื่อนไขไว้ เพราะเปลี่ยนมวล Proton และกฎ fairing ที่กระทบ fingerprints
3. **#38** (C01 ดวงจันทร์) — ใหญ่ที่สุด (88 ไฟล์, +10,284) และ conflict; ควรตัดสินก่อนว่าจะรับเป็น "ก้าวแรกของ Phase 5" หรือให้รอ L01 (ephemeris ที่ตรวจกับ JPL Horizons) เพราะ PR นี้มี `src/render/moon.ts` และ `tests/lunar-ephemeris.test.ts` ของตัวเองแล้ว
