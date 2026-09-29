# สถานะ Orbitlab ณ 30 กันยายน 2026 — บัญชีสิ่งที่เสร็จและสิ่งที่ค้าง

ตรวจจาก `origin/main` ที่ `404eb0c` (PR #42 รวมแล้ว) เว็บสาธารณะ https://royin001.github.io/Orbitlab/ และ PR ที่เปิดอยู่สามรายการ (#36, #38, #41)
เอกสารนี้เป็นบัญชีข้อเท็จจริง อ่านคู่กับ [PR41-CODEX-REVIEW-TH.md](PR41-CODEX-REVIEW-TH.md) (ผลตรวจ PR ของ Codex),
[REMAINING-WORK-TH.md](REMAINING-WORK-TH.md) (ข้อค้นพบและงานคงเหลือ) และ [DEVELOPMENT-PLAN-TH.md](DEVELOPMENT-PLAN-TH.md) (แผนพัฒนา)

## 1. ขนาดและสภาพของโค้ด

| หัวข้อ | ค่าที่วัดได้วันนี้ |
|---|---|
| โค้ด TypeScript ใน `src/` | 103,475 บรรทัด, 392 โมดูล |
| ชุดทดสอบปกติ (`npm test`) | 175 ไฟล์, 2,532 tests (ใช้เวลา 20–30 นาทีบน 4 คอร์) |
| ชุดทดสอบเพิ่มเติม | `test:heavy` (~25 นาที), `test:sixdof-fleet` (161 กรณี ~2 ชม. 40 นาที), browser journeys 4 เส้นทาง |
| `npm run typecheck` / `vite build` บน main | ผ่านทั้งคู่ (ตรวจซ้ำในเซสชันนี้) |
| ขนาด build (`dist/`) | 17 MB รวม texture และ snapshot; JS หลัก 2.48 MB, i18n 1.15 MB (สามภาษาโหลดพร้อมกัน), worker ratings/readiness 1.56 MB ต่อไฟล์ |
| ไฟล์ใหญ่สุด | `src/ui/panel.ts` 2,352 บรรทัด, `src/main.ts` 1,987, `src/ui/orbit/sky-panel.ts` 1,761, `src/mcp.ts` 1,433, `src/physics/simulation.ts` 1,399 |
| Dependency runtime | three.js เพียงตัวเดียว (ตามหลักการข้อ 8 ของ roadmap) |
| Dev tooling | Vite 8, Vitest 5, TypeScript 7, Playwright 1.63; ไม่มี eslint/prettier, ไม่มี LICENSE, version 0.1.0 |

## 2. Roadmap ส่วน Launch (แผน 2026-09-22, 27 รายการ)

ทำเสร็จแล้วทั้ง 27 รายการ: F01–F07, P01–P03, P05, P07, P08, G01–G08, E01–E04, V01–V05, U01–U03, U06, U07, C01 (ยานประวัติศาสตร์ 3 รุ่นบน main; ภารกิจ Apollo/Crew Dragon/Mercury เพิ่มเติมอยู่ใน PR #38), C04 (ฐานปล่อยเพิ่ม 4 แห่ง ยังไม่มียานใช้)
ตาราง roadmap ใน `docs/IMPLEMENTATION-STATUS.md` ยังเว้นช่อง "done" ของ G01–G05, G03/E02/E04/G08 ไว้ว่าง ทั้งที่ PR #16/#19 รวมแล้ว (ดู `docs/history/PARALLEL-GNC-2026-09.md`) — เป็นเอกสารล้าสมัย
"อีก 20 รายการที่เก็บไว้ทำภายหลัง" ไม่มีรายชื่ออยู่ในเอกสารใดของ repo (มีเพียงประโยคเดียวใน IMPLEMENTATION-STATUS.md)

## 3. Roadmap ส่วน Orbit และ Build (`docs/ROADMAP-PART2-3.md`)

| ระยะ | รายการ | สถานะ |
|---|---|---|
| 0 โครงสร้าง | S01–S05 | เสร็จ |
| 1 Orbit core | O01–O04 | เสร็จ (validated ใน VALIDATION.md §5) |
| 2 ดาวเทียมจริงและสายทหาร | R01–R05, M01–M03 | เสร็จ (§6–7) |
| 2.5 ฟิสิกส์ละเอียดขึ้น | NRLMSISE-00, IERS, refraction, CDM, screening worker, instrument geometry, drag fit, worksheets, browser checks | เสร็จ |
| 3 Rocket builder | D01–D05 | เสร็จ (§8) ยกเว้น "ออกแบบจากชิ้นส่วนที่ระดับ Engineer" (D03 ส่วนของ Engineer) ที่ยังลิงก์ไป Explore |
| 4 Satellite builder และ instructor | D06, D07, T01, T02, T03 | **ยังไม่เริ่ม** |
| 5 ดวงจันทร์ | L01–L05 | **ยังไม่เริ่ม** ใน main (PR #38 มีโมเดลดวงจันทร์และ Apollo 11 ไป-กลับ ซึ่งซ้อนทับ L01/L03/L05 บางส่วน) |
| 6 Game layer | X01, X02 | **ยังไม่เริ่ม** |
| สายทหาร | GNSS resilience/DOP (แนวคิด), debris ASAT 2007/2021 | **ยังไม่ทำ** (M01–M03 และ Thai assets ทำแล้ว) |

## 4. แผนแก้หลังการตรวจ 27 ก.ย. (`docs/history/audit-2026-09-27/PLAN-2026-09-28.md`)

| เซสชัน | เรื่อง | สถานะ |
|---|---|---|
| S1 | สถานะภารกิจ workspace (A1, A10, A8 badge) | รวมแล้ว PR #33 |
| S2a | งบเชื้อเพลิงและ hand-off ของ Orbit (A2, A3, A6) | รวมแล้ว PR #32 |
| S2b | ผลของ Orbit ผูกกับอินพุต (A4, A5, A14–A16) | รวมแล้ว PR #30 |
| S3 | จบ Watch ที่วงโคจรสุดท้าย (A9) | รวมแล้ว PR #31 |
| S4a | Placement test (A7, A13) | รวมแล้ว PR #28 |
| S4b | หลักฐานและเกณฑ์บทเรียน (A11, A12 บท 4.3, A19 สถานะ) | รวมแล้ว PR #27 |
| S6 | Browser harness และ CI | รวมแล้ว PR #34, #39 |
| S5 | ข้อความล้าสมัย 3 จุด, glossary ไทย, build stamp | **ยังไม่ทำ** (ข้อความ model limits ถูกแก้ใน PR #41 แล้ว; glossary/build stamp/ข้อความดาวเทียมไทย/`eq.none.noAir` ยังค้าง) |
| S7 | Auto Tune ของ inspector ลง worker (A17), Monte Carlo worker leak (A18) | **A17 ยังค้าง**; A18 แก้ใน PR #41 |
| S8 | ป้ายโหมดบนมือถือ, เมนูเสียงของ Watch | **ยังไม่ทำ** |
| S4c | หลักฐานบท 2.4 จากชุด Monte Carlo | **ยังไม่ทำ** (`TODO(audit 2026-09-27 S4c)` ใน `src/lessons/hooks.ts`) |
| S9 | โปรโตคอลทดสอบผู้ใช้ `docs/USER-TEST-2026-10.md` | **ยังไม่ทำ** (ไฟล์ไม่มี) |
| S10 | Regression journeys 10 ข้อ | **ยังไม่ทำ** (มี 4 journey: watch-controls, mobile-smoke, launch-explore, pwa-offline) |
| ทดสอบผู้ใช้จริง 5–6 คน | ก่อน wave 3 | **ยังไม่ทำ** |
| S11 | Debrief บอกเหตุและขั้นถัดไป (I3, I6) | **ยังไม่ทำ** |
| S12 | สมุดการทดลอง (I1) | **ยังไม่ทำ** |
| S13 | Challenges บริบทไทย (X01, I4) | **ยังไม่ทำ** |
| S14 | Build remix | ไม่จำเป็นแล้ว — D02/D03 ฉบับเต็มรวมใน PR #40 |
| S15 | นำเข้าผลฝั่งครู, backup/restore ความก้าวหน้า (I9, A19, T02 ย่อ) | **ยังไม่ทำ** (PR #41 เพิ่มการกู้ข้อมูล progress ที่เสีย แต่ยังไม่มี restore จากไฟล์) |
| S16 | เส้นทางเริ่มต้น, glossary ณ จุดใช้งาน, แท็บงานมือถือ (I2, I5, I7) | **ยังไม่ทำ** (รอผลทดสอบผู้ใช้) |

รายการที่ session notes ส่งต่อไว้และยังไม่มีใครรับ: S2a — `apps.thaiId` ค้างเมื่อเปลี่ยน preset (`eoReport` ใช้ cycle ของดาวเทียมไทยกับวงโคจรที่ไม่ใช่ของมันแล้ว); S3 — ย้าย inline style ของการ์ด parking note เข้า `.watch-milestone`, freeze เฟรมที่การ์ดจบ (ต้องแก้ `main.ts`), หมายเหตุ parking ไม่แสดงถ้า burn ห่างน้อยกว่า 20 s; S4a — draft คำตอบไม่บันทึกลง storage (ปิดแท็บแล้วหาย); S4b — ชื่อนักเรียนใน localStorage กลืน error เงียบ, label เกณฑ์ที่ fail ไม่บอกเหตุ (รอ S11); S2b — การหรี่ผล stale ใช้ inline style, ควรย้ายเข้า `style.css`

## 5. PR ที่เปิดอยู่ (30 ก.ย. 2026)

| PR | สาขา | เนื้อหา | สถานะ |
|---|---|---|---|
| #41 | `codex/audit-acceptance` (Codex) | แก้บั๊ก 20+ จุดใน lessons/progress/exports/Kepler/Lambert/render + หลักฐานตรวจรับ 447 ไฟล์ (19 MB) + workflow ใหม่ 3 ไฟล์ | เปิด, "Able to merge", CI ของ head `bd3d6e3` กำลังรัน; ล้าหลัง main 2 commit (docs) — ดูรายงานตรวจแยก |
| #38 | `claude/c01-historical-missions` | Apollo 11 ไป-กลับดวงจันทร์ (โมเดลดวงจันทร์, LOI, ลงจอด, TEI, entry), Crew Dragon Demo-2, Mercury-Redstone 3, "flown" view | เปิด, **conflict กับ main** (dirty), ล้าหลัง 46 commit, ไม่มี body |
| #36 | `claude/flight-data-validation` | F14 กฎทิ้ง fairing ของ Proton-M/Angara, มวลเชื้อเพลิง Proton ตามเอกสาร, insertion floor ระหว่าง ascent, six-DOF burn ทันทีเมื่อ coast ไม่ถึง apex | **draft**, conflict กับ main, ล้าหลัง 54 commit; ผู้เขียนระบุว่าจะ merge เมื่อ heavy/sixdof-fleet ผ่าน |

ไม่มี GitHub issue เปิดอยู่เลย (0) — งานทั้งหมดติดตามผ่านเอกสารและ PR

## 6. เว็บสาธารณะ

- Deploy ล่าสุดที่เสร็จก่อนการตรวจนี้: 29 ก.ย. 21:55 UTC (`last-modified`), data snapshot บนเว็บ: space weather asOf 2026-09-29 20:00 UTC, CelesTrak asOf 2026-09-29 12:25 UTC, IERS asOf 2026-09-24 — ระบบ refresh รายวันทำงาน
- Deploy ของ `404eb0c` (PR #42) เริ่ม 23:05 UTC ระหว่างการตรวจ
- Header ตอบกลับไม่มี Content-Security-Policy (GitHub Pages ไม่ให้ตั้ง header เอง ต้องใช้ `<meta http-equiv>` ถ้าต้องการ)
- `index.html` ประกาศ `lang="en"` ตายตัว แม้ UI จะเป็นไทย/รัสเซีย (ตรวจต่อในรายงานข้อค้นพบ)
