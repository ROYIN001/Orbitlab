# งานที่ยังเหลือของ Orbitlab — ผลตรวจสอบเว็บและโค้ด ณ 30 กันยายน 2569

เอกสารนี้ตอบคำถาม "ยังมีงานไหนที่ยังเหลือต้องทำ" โดยตรวจโค้ดบน `main` (404eb0c + เอกสาร 3 commit ของ branch นี้) และเว็บที่ deploy อยู่ แยกเป็น 10 พื้นที่ แต่ละพื้นที่มี *ผู้ตรวจอิสระหนึ่งคน* อ่านโค้ด รันเทสต์ที่เกี่ยว และเขียนโพรบเล็ก ๆ เมื่อจำเป็น จากนั้นข้อค้นพบระดับ P1/P2 ทุกข้อถูกส่งให้ *ผู้ยืนยัน* ที่ตั้งต้นให้หักล้าง (ส่วน 12) ตัวเลขทั้งหมดในเอกสารนี้วัดบนเครื่อง 4 core ที่ใช้ตรวจ หรืออ่านจาก GitHub Actions ของ repo เอง

เอกสารพี่น้อง: [STATUS-INVENTORY-TH.md](STATUS-INVENTORY-TH.md) (สิ่งที่เสร็จแล้ว / งาน roadmap ที่ยังไม่เริ่ม / PR ที่เปิดอยู่), [PR41-CODEX-REVIEW-TH.md](PR41-CODEX-REVIEW-TH.md) (รีวิว PR #41 ของ Codex), [DEVELOPMENT-PLAN-TH.md](DEVELOPMENT-PLAN-TH.md) (แผนพัฒนาต่อ)

**วิธีอ่านตาราง**

- **ระดับ**: P1 = ข้อมูลหาย/ใช้งานไม่ได้; P2 = ผลผิดหรือชวนเข้าใจผิดที่ผู้ใช้เห็น หรืองานที่แผนสัญญาไว้แล้วยังไม่ทำ; P3 = คุณภาพ/ประสิทธิภาพ/เอกสาร
- **ชนิด**: ข้อบกพร่อง (โค้ดทำผิดจากที่ตั้งใจ) · ช่องว่าง (สิ่งที่ยังไม่มี) · ความเสี่ยง (ยังไม่ผิดแต่จะผิดเมื่อสภาพเปลี่ยน) · เอกสารล้าสมัย
- **งาน**: S ≈ ครึ่ง session สองสัปดาห์ (หนึ่ง PR เล็ก) · M ≈ หนึ่ง session · L ≈ สอง PR · XL ≈ สาม PR ขึ้นไป
- **อ้างอิงแผน**: รหัส session ของ [PLAN-2026-09-28](../audit-2026-09-27/PLAN-2026-09-28.md) (S1–S16, A17/A18) หรือรหัส roadmap ([ROADMAP-PART2-3](../../ROADMAP-PART2-3.md)) หรือหัวข้อ Known limitations ใน [IMPLEMENTATION-STATUS](../../IMPLEMENTATION-STATUS.md)
- **ไฟล์:บรรทัด** ชี้ไป `main` ณ วันตรวจ; ข้อที่ PR #41 แก้แล้วถูกระบุไว้และไม่นับซ้ำ

## 1. บทสรุปสำหรับผู้ตัดสินใจ

**ภาพรวม** — แกนของเว็บอยู่ในสภาพดี: ฟิสิกส์ผ่าน validation ที่มีวินัยจริง, แกน Build/Orbit/Lessons เป็นโมดูลไม่ใช้ DOM ที่มีเทสต์หนาแน่น, PWA ติดตั้งแบบ atomic และทำงานออฟไลน์ครบ, ไม่มีปัญหาความปลอดภัยหรือความเป็นส่วนตัวเชิงโครงสร้าง งานที่เหลือส่วนใหญ่เป็น (ก) งานที่แผน 28 ก.ย. และ roadmap เขียนไว้แล้วแต่ยังไม่ทำ (S4c, S7/A17, S8–S16, Phase 4–6) (ข) ข้อบกพร่องระดับ P2 ที่กระจุกอยู่ในชั้น UI/สถานะและการนำเสนอผลลัพธ์ ไม่ใช่ในตัวเลขฟิสิกส์ (ค) น้ำหนักบันเดิลและ CI ที่ช้า และ (ง) ช่องว่างเชิงสถาบัน (ไม่มี LICENSE, ไม่มีเวอร์ชัน, ไม่มีเครื่องมือฝั่งครู)

**นับตามระดับ (ครบ 10 พื้นที่; ข้อที่พบซ้ำข้ามพื้นที่ถูกนับในแต่ละพื้นที่และระบุ "=" ไว้ในตาราง)**

| พื้นที่ | P1 | P2 | P3 | รวม |
|---|---|---|---|---|
| 2. Launch UI/สถานะ | 0 | 6 | 7 | 13 |
| 3. Orbit | 0 | 1 | 10 | 11 |
| 4. Build | 1 (แก้ใน #41) | 4 | 14 | 19 |
| 5. Lessons/placement/worksheets | 0 | 7 | 8 | 15 |
| 6. โครงสร้างพื้นฐาน | 0 | 5 | 13 | 18 |
| 7. ฟิสิกส์/validation | 0 | 5 | 18 | 23 |
| 8. i18n/a11y/มือถือ | 0 | 5 | 13 | 18 |
| 9. เอกสาร | 0 | 9 | 14 | 23 |
| 10. ชุดทดสอบ/คุณภาพโค้ด | 0 | 6 | 7 | 13 |
| 11. เว็บสด/CI/PR | 0 | 5 | 6 | 11 |
| **รวม** | **1** | **53** | **110** | **164** |

**สิบอันดับที่ควรทำก่อน (เรียงตามผลต่อผู้ใช้ ÷ ต้นทุน)**

1. **merge PR #41** หลังแก้ R1–R5 — ปิด B-01 (P1 ข้อมูลแบบยานหาย), A18, การกู้ progress, Kepler/Lambert ใกล้เอกฐาน (ดู PR41-CODEX-REVIEW-TH.md)
2. **LUI-01 + LUI-05** (S, S7) — เที่ยวบินถูกทำลายเมื่อกด "Use for the next launch" ขณะหยุดชั่วคราว และ error ของ worker ถูกกลืน: สองบั๊กที่ผู้ใช้ Engineer เจอแล้วไม่รู้ว่าเกิดอะไร
3. **A17 ใน worker** (M, S7) — LUI-02/PHY-06: การคำนวณสุดท้ายที่ล็อกเธรดหลักในเครื่องมือ Engineer แบบแผนมีแล้วใน tune-job.ts
4. **B-03** (S) — rating ที่หมดเวลาถูกแสดงเป็น "nothing" และเขียน 0 kg ลงแบบยาน: ผลผิดที่แท็บเล็ตโรงเรียนจะเจอ
5. **ORB-03** (S) — คาบผิดบนการ์ด Watch tour ขั้น Hohmann: ผู้ชมกลุ่มแรกสุดเห็นตัวเลขขัดกัน
6. **INF-01 + ตัดสินเรื่อง audio ใน precache** (S) — worker เล็กลง 2.2 MB, ติดตั้งครั้งแรกจาก 16 MB สู่ต่ำกว่า 10 MB ด้วยงานสองบรรทัดกับหนึ่ง refactor เล็ก
7. **PHY-05 + INF-11** (S) — workflow รายคืนสำหรับ heavy/six-DOF gate และตัด `npm test` ออกจาก deploy ตามตาราง: จับ regression ของโมเดลเริ่มต้นและคืนเวลา 25 นาทีต่อ deploy
8. **LES-05 + glossary** (M, S5) — ศัพท์ไทย guidance/navigation สามคำสำหรับสองแนวคิด สอนผิดโดยตรงกับผู้ชมหลัก; ต้องมีเทสต์กันคำที่ถูกปฏิเสธ
9. **S11 (LUI-03/04, LES-09)** (L) — debrief วินิจฉัยจากบันทึกจริง + ปุ่มกระโดด: จุดอ่อนที่สุดของการเรียนรู้ตาม audit และ learning-review — แต่ทำ *หลัง* S9 ทดสอบผู้ใช้ตามที่แผน §7 กำหนด
10. **INF-09 LICENSE + INF-08 build stamp + INF-15 PDPA** (S ทั้งสาม) — เงื่อนไขขั้นต่ำก่อนที่โรงเรียนหรือหน่วยงานใดจะติดตั้งได้อย่างถูกต้อง

**สิ่งที่ *ไม่* ต้องทำ (ตรวจแล้วดีอยู่)** — ตัวเลขฟิสิกส์ของเที่ยวบินในตัว, ความทนทานของ kepler/maneuvers, ResultSlot provenance, วงจร worker ของ Orbit, validator ของ Build, grader ของบทเรียน, SW/PWA, ท่อข้อมูล snapshot, สุขอนามัยความปลอดภัย, WebMCP — ทั้งหมดผ่านการตรวจโดยไม่พบข้อบกพร่อง (รายละเอียดใน "จุดแข็งที่ตรวจแล้ว" ของแต่ละส่วน)

**เพิ่มจากพื้นที่ 8–11 ที่ควรเข้า session 1–2 ของแผนเพราะเล็กและเห็นผลทันที** — LS-01 การ์ด `github.sha == origin/main` ใน deploy.yml (เว็บสดเคยถอย 2 ชม. 44 น. จากการ re-run run เก่า); I18N-01/02 สำเนา A8 สองข้อที่ #41 ไม่ได้แก้; I18N-04 ท่อน/ขั้น; MOB-01 (S8); DOC-01/02/03 ตัวเลขใน STATUS/README; DOC-06 เครดิตแหล่งข้อมูล Orbit/Build; TQ-05 ย้ายภารกิจ six-DOF ทั้งเที่ยวออกจากชั้น default; LS-06 ย้าย cron ให้ข้อมูลสดก่อนเวลาเรียนไทย

_การยืนยันอิสระ (ส่วน 12) ครบทั้ง 15 ข้อ P1/P2 ผู้ยืนยัน 2 คนต่อข้อ — ไม่มีข้อใดถูกหักล้าง; INF-01, PHY-02, I18N-04 ลดเป็น P3 และ TQ-05 ลดเป็น P3 หลัง PR #44 merge; ตารางนับด้านบนคงระดับที่ผู้ตรวจพื้นที่ให้ไว้_

## 2. ส่วน Launch — UI และสถานะ (main.ts, panel.ts, explore/watch/hud/telemetry/timeline, result-content, loop inspector, monte-carlo, compare/report)

**จุดแข็งที่ตรวจแล้ว**

- ทุกมุมมอง (HUD, บรรยาย, timeline, แผนที่, telemetry, การ์ดผลลัพธ์, debrief) วาดจาก VisualFrame เฟรมเดียวกัน จึงกรอกลับได้สอดคล้อง และ result-content กรอง event ที่ t > เวลาปัจจุบันออก (15 เทสต์ใน `tests/mission-result.test.ts`)
- หน่วยความจำมีเพดานทุกชั้น: recorder 12,000/6,000 เฟรมพร้อม decimation ที่ไม่ตัดขอบ event, telemetry cap 20,000, กราฟ 600 จุดพร้อม pool ของ array และแถว DOM
- ตัวจูน pitch ของ Launch อยู่ใน worker แล้ว พร้อม AbortController, progress และการทิ้งผลเก่า (`src/physics/tune-job.ts`) ซึ่งเป็นแบบแผนสำเร็จรูปสำหรับ A17
- ตรรกะบรรยาย/จังหวะของ Watch เป็น pure function และมีเทสต์หนาแน่น; คีย์บอร์ดมีโมเดลชัดเจนตรงกับคู่มือ §4; dialog มี focus trap และคืนโฟกัส
- เส้นทางล้มเหลวของ worker ฟิสิกส์สะอาด: WorkerSession.fail() ทิ้ง session และแอปถอยไป InlineSession

**ข้อค้นพบ**

| รหัส | ระดับ | ชนิด | เรื่อง | ไฟล์ | งาน | อ้างอิงแผน |
|---|---|---|---|---|---|---|
| LUI-01 | P2 | ข้อบกพร่อง | กด "Use for the next launch" ใน inspector ขณะเที่ยวบินสด *หยุดชั่วคราว* จะทำลายเที่ยวบินและบันทึกทิ้งเงียบ ๆ | `src/ui/panel.ts:1867` | S | S7 |
| LUI-02 | P2 | ข้อบกพร่อง | A17: Auto Tune ของ attitude loop ยังรันแบบ synchronous บนเธรดหลัก ไม่มียกเลิก ไม่มี progress | `src/ui/loop-tuning.ts:185` | M | S7/A17 |
| LUI-03 | P2 | ช่องว่าง | I3: "สาเหตุ" และ "ก้าวต่อไป" ใน debrief เป็นตารางข้อความคงที่ 17 แบบ ไม่ได้วินิจฉัยจากเที่ยวบินจริง ไม่มีปุ่มดูช่วงนั้น ไม่มีการทดลองคลิกเดียว | `src/ui/explore-debrief.ts:113` | L | S11/I3 |
| LUI-04 | P2 | ช่องว่าง | I6: ไม่มีปุ่มกระโดด "ดู staging / max-Q / ล้มเหลว / ลงจอด" พร้อมเลือกกล้อง มีเพียง chip, prev/next และปุ่มเดียวใน Engineer | `src/ui/timeline.ts:340` | M | S11/I6 |
| LUI-05 | P2 | ข้อบกพร่อง | ความผิดพลาดของฟิสิกส์ถูกกลืนลง console: worker error ระหว่างบินหยุดเที่ยวบินเงียบ ๆ และ preview() ล้มเหลวทิ้งภารกิจเก่าไว้ใต้ค่าใหม่ | `src/main.ts:1338` | S | S7 |
| LUI-06 | P2 | ช่องว่าง | ชั้น UI ไม่มีเทสต์ DOM เลย และมี journey ของ Launch เพียงหนึ่ง (ขับด้วย MCP ไม่ใช่การคลิก) | `tests/browser/journeys/launch-explore.mjs:15` | L | S10 |
| LUI-07 | P3 | ความเสี่ยง | ปุ่มแก้ "ลดน้ำหนักบรรทุก" ใน Explore รัน bisection ของเที่ยวบินทดสอบบนเธรดหลัก (682 ms ในเทสต์) | `src/ui/panel.ts:1084` | M | S7 |
| LUI-08 | P3 | ข้อบกพร่อง | SetupPanel.render() ทำโฟกัสคีย์บอร์ดหลุดทุกครั้งที่กดปุ่ม เพราะคืนโฟกัสด้วย aria-label ที่มีเฉพาะ input/select | `src/ui/panel.ts:626` | S | — |
| LUI-09 | P3 | ข้อบกพร่อง | การ์ด debrief และการ์ดจบของ Watch เป็น role=dialog โดยไม่ย้ายโฟกัส ไม่ประกาศ ไม่มี Escape | `src/ui/explore-debrief.ts:109` | S | S16 |
| LUI-10 | P3 | ข้อบกพร่อง | ตารางเปรียบเทียบอ่านจาก simulation สด คอลัมน์ "ปัจจุบัน" จึงไม่กรอกลับตาม timeline | `src/main.ts:422` | S | — |
| LUI-11 | P3 | ความเสี่ยง | ลิงก์รายงาน, ป้าย reference และ hand-off ไป Orbit ใช้ภารกิจ *ปัจจุบันของแผง* ไม่ใช่ภารกิจที่บินจริง | `src/main.ts:873` | S | — |
| LUI-12 | P3 | ความเสี่ยง | แท็บ Tuning คำนวณ margin ใหม่สำหรับโมเดลเชิงเส้นถึง 120 ตัวทุก 200 ms ขณะเล่น ไม่มี cache | `src/ui/loop-tuning.ts:254` | S | S7 |
| LUI-13 | P3 | ข้อบกพร่อง | โค้ดตาย/คอมเมนต์กำพร้า 3 จุด, export ที่ใช้เฉพาะเทสต์ 2 ตัว, `getElementById('achieved-warp')` ทุกเฟรม | `src/main.ts:1610` | S | — |

**รายละเอียดข้อที่สำคัญ**

- **LUI-01** — `applyControl()` เรียก `changed()` → `cb.onChange` → main.ts:438 `if (!this.playing) this.preview(cfg)`; การหยุดชั่วคราว (Space หรือปุ่มเล่นของ inspector) ทำให้ `playing=false` การ์ดจึงผ่านและ `preview()` ทิ้ง session พร้อมบันทึก ควรข้าม `onChange` เมื่อแผงอยู่ในสถานะ `running` (มีเที่ยวบิน ไม่ว่าจะเล่นหรือหยุด) แล้วเก็บค่าไว้ใช้เที่ยวถัดไป และเพิ่มเทสต์สัญญาของ callback แบบไม่ใช้ DOM
- **LUI-02 (A17)** — `setTimeout(() => autoTune(cases, T, targets, ff, tuneCases(models, planes, Infinity)), 30)` ค้นกริด 36×6 ถึง 4 รอบบนทุกโมเดลของเที่ยวบิน ทางแก้ตามแผน S7: `attitude-tune-job.ts` + `attitude-tune.worker.ts` ตามแบบ `tune-job.ts` มี run id, AbortController, progress, ทิ้งผลเก่าเมื่อแกน/ขอบเขต/เป้าเปลี่ยน, ปุ่ม Cancel, เพิ่ม worker ใน precache และเทสต์ fake-worker
- **LUI-03/04 (S11)** — ปัจจุบัน `RESULT_COPY[cause].detail/next` เป็นข้อความเดียวกันทุกเที่ยวบิน ไม่มีตัวเลข ไม่มีเวลา; ควรมีโมดูลวินิจฉัยแบบไม่ใช้ DOM ที่อ่าน events + telemetry คืน `{cause, atT, figures, undiagnosed?}` ตามกฎที่แผนระบุ (เชื้อเพลิงหมดก่อน circularise พร้อม Δv ที่ขาด, q เกินเพดานที่ T+…, engine-out, range safety, perigee ต่ำจาก pitch program, RAAN ผิดหน้าต่าง) แสดงบนการ์ด Explore และแถบ fail ของบทเรียน พร้อมปุ่ม "ดู T+…" (seek + กล้อง) และปุ่ม "ลองอันนี้" ที่เปลี่ยนค่าเดียว; ส่วนปุ่มกระโดดตาม event เป็นแถวปุ่ม ≥44 px เหนือ timeline ที่เรียก `App.seekTo(time, camera?)` ใหม่ ใช้ซ้ำจากการ์ด Explore และปุ่ม Engineer
- **LUI-05** — ทั้ง `onError` ของ WorkerSession และ `catch` ใน `preview()` เขียนแค่ `console.error`; ควรส่งไปที่ข้อความสถานะของแผงหรือแถบบรรยายเป็นข้อความสามภาษา "เที่ยวบินหยุด: …" พร้อมปุ่ม Retry และแจ้งครั้งเดียวเมื่อฟิสิกส์ย้ายมาเธรดหลัก
- **LUI-06** — `vite.config.ts` ไม่มี jsdom/happy-dom; ไม่มีเทสต์ใด new SetupPanel/ExploreDebrief/Timeline/TelemetryPanel/Hud/WatchView/LoopInspector; ต้องมีสภาพแวดล้อม DOM ต่อไฟล์ (pragma) ก่อน แล้วจึงเขียน S10 journeys ของ Launch (ตั้งค่า 3 ขั้นด้วยการคลิก, ยิง, การ์ด debrief, ลาก timeline, เปิด inspector/ยกเลิก Auto Tune, เริ่ม/หยุด Monte Carlo)

PR #41 แตะพื้นที่นี้เพียง `result-content.ts` (9 บรรทัด) และ `monte-carlo.ts` (2 บรรทัด) จึงไม่ทับซ้อนกับข้อค้นพบข้างต้น

## 3. ส่วน Orbit — playground, maneuvers, applications, Real satellites, providers, lifetime, long-term propagator

**จุดแข็งที่ตรวจแล้ว**

- ความทนทานเชิงตัวเลขของ `kepler.ts`/`maneuvers.ts`: วงโคจรเสื่อม 10 กรณี (e=0 & i=0, i=180°, i=π−1e-9, e=0.95 …) round-trip `orbitFromState(stateAt())` ภายใน 0.008 m ตลอดหนึ่งวัน ทั้งมีและไม่มี J2; ทุก maneuver default ให้ผลจำกัดหรือ PlanError ที่มีชื่อ; porkchop 64×48 ใช้ 28–72 ms
- วงจร worker ใน screening/reentry/lifetime job สะอาด: terminate ทุกทาง, ทิ้งคำตอบล่าช้าด้วย generation ของ ResultSlot; ResultSlot (17 เทสต์) ถูกใช้ครบทั้ง passes, overflights, screening, re-entry, กรณี CZ-5B และ lifetime dialog
- OnlineProvider เรียงคำถามต่อโฮสต์, จำการปฏิเสธ 403/429 สองชั่วโมง, รวมคำตอบบางส่วนของ CelesTrak ทีละกลุ่ม; SW precache snapshot ทั้งสามและ worker ทั้งแปด → Real satellites ใช้ออฟไลน์ได้
- Validation ลึก: SGP4 ตรง AIAA 2006-6753, passes ตรง Skyfield ภายใน 0.35 s, conjunction ตรง Iridium–Cosmos และ CDM ของ NASA CARA, re-entry ตรง 100 กรณีย้อนหลัง
- ข้อจำกัดที่เอกสารระบุ (Kepler+J2 เท่านั้น, impulsive burns, TEME เป็น inertial, ไฟล์นำเข้าอยู่ในหน่วยความจำ) ตรงกับโค้ดทุกข้อ

**ข้อค้นพบ**

| รหัส | ระดับ | ชนิด | เรื่อง | ไฟล์ | งาน | อ้างอิงแผน |
|---|---|---|---|---|---|---|
| ORB-03 | P2 | ข้อบกพร่อง | Watch tour ขั้น Hohmann: สถิติ "คาบ" บนการ์ดไม่ถูกรีเฟรชหลัง burn จึงแสดงคาบของ LEO ที่ระดับ GEO | `src/ui/orbit/playground.ts:1298` | S | O01/O02 |
| ORB-01 | P3 | ข้อบกพร่อง | กรณีศึกษา Long March 5B (4×predictReentry, 1.3 s ใน Node) และ NAPA-2 (0.6 s) รันบนเธรดหลัก ไม่มี worker ไม่มี Stop | `src/ui/orbit/sky-panel.ts:985` | S | M03; S7 |
| ORB-02 | P3 | ข้อบกพร่อง | screening worker ล้มเหลวถูกแสดงเป็น "Screening stopped." และ re-entry worker ล้มเหลวล้างผลเงียบ ๆ (`ResultSlot.fail` มีแต่ไม่ใช้) | `src/ui/orbit/sky-panel.ts:1183` | S | M01/M03; S7 |
| ORB-04 | P3 | ช่องว่าง | ขั้นดาวเทียมจริงใน Watch tour ไม่แสดงอะไรขณะแคตตาล็อกกำลังโหลดหรือล้มเหลว เพราะสถานะอยู่ในแผงที่ซ่อนที่ Watch | `src/ui/orbit/playground.ts:1268` | S | P2.5; S16 |
| ORB-05 | P3 | ช่องว่าง | ไม่มีปุ่ม "ลองอีกครั้ง" หลังโหลดแคตตาล็อกล้มเหลว และไม่มี refresh ในโหมดออนไลน์ (ดึงครั้งเดียวต่อหน้า) | `src/ui/orbit/sky-panel.ts:204` | S | R02 |
| ORB-06 | P3 | ข้อบกพร่อง | เครื่องมือ repeat-ground-track ตอบ "ไม่มีวงโคจรวงกลม…" สำหรับค่าที่ไม่ถูกต้อง (0, NaN, 14.5) และช่องรัศมีกลืนค่าผิดเงียบ ๆ | `src/ui/orbit/playground.ts:1071` | S | A5; O01 |
| ORB-07 | P3 | ข้อบกพร่อง | อัตลักษณ์ดาวเทียมไทยและกริด repeat ค้างอยู่หลังเปลี่ยนวงโคจร; กรณี NAPA-2 ไม่ถูกทำเครื่องหมายเก่าเมื่อเปลี่ยนโหมดข้อมูล | `src/ui/orbit/playground.ts:800` | S | O04 |
| ORB-08 | P3 | ความเสี่ยง | fallback เมื่อไม่มี module worker รัน re-entry/lifetime ทั้งก้อนแบบ synchronous จึงกด Stop ไม่ได้ | `src/orbit/reentry-job.ts:60` | S | M03 |
| ORB-09 | P3 | ช่องว่าง | ไม่มี export ผลด้านการทหาร (overflights, close approaches, passes) เป็น CSV และไฟล์ที่นำเข้าไม่ถูกเก็บข้ามการโหลดหน้า | `src/ui/orbit/sky-panel.ts:1381` | M | M01–M03; S15 |
| ORB-10 | P3 | ช่องว่าง | ไม่มี browser journey ผ่าน workflow ของ Orbit เลย และไม่มี unit test ของเส้นทาง error/stop/worker ของ sky panel | `tests/browser/journeys/mobile-smoke.mjs:18` | M | S10 |
| ORB-11 | P3 | เอกสารล้าสมัย | "Coming next in Orbit" แสดงเฉพาะ L01–L05 ไม่มี X01 challenges ที่ roadmap วางไว้ที่ `src/orbit/challenges.ts` | `src/ui/section-plan.ts:58` | S | X01/X02; S13 |

**รายละเอียดข้อที่สำคัญ**

- **ORB-03** — `renderTour()` คำนวณคาบครั้งเดียวตอนวาดการ์ด; `frame()` เมื่อเปลี่ยน segment เรียกเฉพาะ `renderFacts()` ซึ่ง return ทันทีที่ระดับ Watch; ขั้น hohmann ไป 35,786 km ที่ warp 600 ราว 30 s หลังเริ่ม การ์ดจึงแสดงระดับสูง ≈35,786 km คู่กับคาบ ≈1 ชม. 34 น. แก้โดยให้ segment-change เรียก `renderTour()` ที่ Watch หรือทำให้คาบเป็นค่าที่ `updateLive()` รีเฟรช; ประเด็นเกี่ยวเนื่อง: ขั้น sky วิ่งที่ warp 60–600 แถบเวลาบอก "Not now" ใต้การ์ดที่บอกว่า "ISS อยู่ตรงนี้ *ตอนนี้*"
- **ORB-01/02/08** — ทั้งสามข้อคือความไม่สม่ำเสมอของแบบแผน worker: `runReentry()` ใช้ worker และ Stop ได้ แต่ `runCaseStudy()`/`runNapaCase()` เรียก `predictReentry` ตรง ๆ หลัง `await this.sun()`; และ catch block ของ screening/re-entry ไม่แยก `AbortError` ออกจาก error จริง (lifetime.ts แยกแล้ว) ควรทำให้ทั้งสามเหมือน lifetime.ts
- **ORB-09** — `downloadBlob` ถูกใช้เฉพาะ worksheet กรณีศึกษา; รายการ overflight (จำกัด 40 จาก 242 ที่พบ), approach (20) และ passes ไม่มี export; การ screening ไฟล์ 30,000 วัตถุต้องทำใหม่ทุกครั้ง ควรมี "Export CSV" (รวมบรรทัด input เป็น provenance) และเสนอเก็บไฟล์นำเข้าใน IndexedDB พร้อมชื่อและเวลานำเข้าเป็น DataTag

PR #41 แก้กรณี Kepler ใกล้ e=1, Lambert ใกล้ 180°, รายงานนำเข้า และ race ของภาษาในกรณีศึกษาแล้ว จึงไม่นับซ้ำที่นี่

## 4. ส่วน Build — D01–D05 (src/design/*, src/ui/build/*, parts.ts, ratings/readiness workers) และความพร้อมสำหรับ D06/D07

**จุดแข็งที่ตรวจแล้ว**

- แกนตัดสินใจทั้งหมดอยู่ใน `src/design/*.ts` แบบไม่ใช้ DOM มีเทสต์ 29 ไฟล์ `tests/design-*.test.ts`; assemble() สร้างผ่าน emitter เดียวกับแคตตาล็อก ยานจากชิ้นส่วนของยานแคตตาล็อกจึงเป็นยานนั้น *เป๊ะ* (21 เทสต์)
- validator เข้มงวดและบอก path: ฟิลด์ไม่รู้จัก, NaN, ค่านอกช่วง, การปลอม id แคตตาล็อก ถูกปฏิเสธพร้อมตำแหน่ง; ทุกความล้มเหลวของ store (unavailable/full/invalid/notFound) มีข้อความสามภาษา
- ratings/readiness อยู่ใน worker พร้อม Stop; ตัวเลข validation ทำซ้ำได้วันนี้ (soyuz21a 0.945, falcon9 LEO 0.879/GTO 0.823, vegac 1.312 ตามที่บันทึก, ariane64 1.216/1.159)
- ช่องกรอกตัวเลขรองรับผู้อ่านรัสเซีย (0,08), a11y พื้นฐานครบ (tablist + ลูกศร, aria-pressed, aria-invalid, role=status), bench รอดการโหลดซ้ำ
- แกนล้ำหน้ากว่า UI: `remix.ts` รับ stretch/swapEngine ของกลุ่ม strap-on และ `assemble.ts` รับ CustomBody ของกลุ่มอยู่แล้ว (สองข้อใน Known limitations จึงเป็นงาน UI ราคาถูก)

**ข้อค้นพบ**

| รหัส | ระดับ | ชนิด | เรื่อง | ไฟล์ | งาน | อ้างอิงแผน |
|---|---|---|---|---|---|---|
| B-01 | **P1** | ข้อบกพร่อง | บันทึกหรือลบแบบยานจะ *ลบถาวร* เรกคอร์ดที่เวอร์ชันนี้อ่านไม่ได้ (จากเวอร์ชันใหม่กว่า หรือ kind 'satellite' ในอนาคต) — ทำซ้ำได้; **PR #41 แก้ตรงจุดนี้** (ยังไม่ merge) | `src/design/design-store.ts:148` | S | S05 |
| B-02 | P2 | ข้อบกพร่อง | ไฟล์แบบยานจากเวอร์ชันใหม่ที่มีฟิลด์ใหม่ใด ๆ ถูกปฏิเสธทั้งไฟล์ ขณะที่ข้อความสามภาษาบอกว่า "สิ่งที่เวอร์ชันนี้ไม่รู้จักถูกละไว้" | `src/design/design-store.ts:216` | S | S05 |
| B-03 | P2 | ข้อบกพร่อง | การค้น ratings ที่ถูกตัดด้วยงบเวลา 8 s ถูกแสดงเป็น rating จริง: GTO อ่านว่า "nothing: it did not reach this orbit" และเขียน 0 kg ลงแบบยาน (แท็บเล็ตช้ากว่า 3–4× จะเจอกับ Ariane 64) | `src/ui/build/explore-level.ts:596` | S | D03/D04 |
| B-04 | P2 | ช่องว่าง | ไม่มี browser journey ของ Build และไม่มีเทสต์ของ worker wrapper; รายการ layout บนโทรศัพท์ใน Known limitations ตรวจซ้ำไม่ได้ | `tests/browser/journeys` | M | S10 |
| B-05 | P2 | ช่องว่าง | D06/D07: store, ไฟล์, ภารกิจ และ handoff เป็น vehicle-only ต้องขยาย 5 จุดก่อนสร้างโมเดล subsystem ใด ๆ | `src/design/design-store.ts:22` | XL | D06/D07 |
| B-06 | P3 | เอกสารล้าสมัย | Known limitations บอกว่าตัวถังเบากว่าเครื่องยนต์ไม่มีคำเตือน แต่ builder เตือนแล้ว (`dryBelowEngines`) | `docs/IMPLEMENTATION-STATUS.md:404` | S | D03 |
| B-07 | P3 | ช่องว่าง | ไม่มีการตรวจความสมเหตุสมผลเชิงเรขาคณิต/ความหนาแน่น: kerolox 400 t ในตัวถัง 0.5 m × 1 m กับ Merlin 50 เครื่องผ่าน (`tankLength()` มีอยู่แล้วใน propellant.ts) | `src/design/assemble.ts:194` | S | D03 |
| B-08 | P3 | ช่องว่าง | UI remix ยืด/เปลี่ยนเครื่องยนต์กลุ่ม strap-on ไม่ได้ แม้ `remix.ts` รองรับแล้ว | `src/design/explore-model.ts:94` | S | Known limitations |
| B-09 | P3 | ช่องว่าง | parts builder ให้เลือกตัวถัง strap-on จากแคตตาล็อกเท่านั้น แม้ `assemble()` รับตัวถังของตนเองสำหรับกลุ่ม | `src/design/explore-model.ts:115` | M | Known limitations |
| B-10 | P3 | ช่องว่าง | worker ทั้งสองฝัง dictionary สามภาษาและฟิสิกส์ทั้งก้อน (1.56 MB ต่อไฟล์) และ ratings สร้าง Worker ใหม่ทุกงาน | `src/ui/build/ratings-job.ts:20` | M | S8/perf (= B01 ของส่วน 6) |
| B-11 | P3 | ความเสี่ยง | ratings job ไม่มี fallback บนเธรดหลักเมื่อ worker ล้มเหลวแบบ async ต่างจาก readiness job | `src/ui/build/ratings-job.ts:38` | S | S7 |
| B-12 | P3 | เอกสารล้าสมัย | ต้นทุน rating ที่เอกสารระบุ ("1–2 s", "7–95 ms ต่อเที่ยว") ต่ำไปสำหรับยานมี strap-on (Ariane 64 วัดได้ 2.8 s / 18 เที่ยว) | `docs/IMPLEMENTATION-STATUS.md:384` | S | D03/D04 |
| B-13 | P3 | ช่องว่าง | Vega-C LEO ยังสูง 31 %, Ariane 64 สูง 16–22 %, burn GTO นับเป็น impulsive (ยังเป็นจริงตาม Known limitations) | `src/design/ratings.ts:194` | L | Known limitations |
| B-14 | P3 | ช่องว่าง | sizing ยังต้องบวก +300..+1000 m/s, เฉพาะขั้นของเหลวแบบอนุกรม, เลือก fairing ด้วยเส้นผ่านศูนย์กลางอย่างเดียว | `src/design/sizing.ts:195` | L | Known limitations |
| B-15 | P3 | ช่องว่าง | ratings ที่คำนวณในรีวิว Engineer ไม่ถูกเขียนกลับแบบยานที่บันทึก; Explore ต้องกด Save เอง | `src/ui/build/engineer-level.ts:277` | S | Known limitations |
| B-16 | P3 | ช่องว่าง | "Fly it" ของ Explore เล็ง preset 500 km จากฐานแรกเสมอ พร้อมน้ำหนักบรรทุกชื่อ "CubeSat rideshare dispenser" (Engineer เลือกได้แล้ว) | `src/design/build-handoff.ts:353` | S | Known limitations |
| B-17 | P3 | ช่องว่าง | ตัวเลขไม่ถูก localize บางจุด: tick ของกราฟใช้ ".", เวลาปล่อยในรีวิวเป็น ISO string, รายละเอียดเทคนิคเป็นอังกฤษ | `src/ui/build/staging-panel.ts:407` | S | S5 |
| B-18 | P3 | ช่องว่าง | หน้า Engineer ของ D03 ยังเขียนว่า "to come" พร้อมลิงก์ไป Explore; ไม่มีบท Build บนหน้า landing | `src/ui/section-plan.ts:113` | M | D03; S8/S16 |
| B-19 | P3 | ความเสี่ยง | ratings ที่เสร็จระหว่างการแก้ไขกับ animation frame ถัดไปถูกนับเป็นของยานเก่าแล้วทิ้ง | `src/ui/build/explore-level.ts:649` | S | D03 |

**รายละเอียดข้อที่สำคัญ**

- **B-01 (P1)** — `read()` กรองเรกคอร์ดที่ `designProblems() === null` แล้ว `save()`/`remove()` เขียนรายการที่กรองแล้วกลับไป; ข้อความคลาสสัญญาว่า "left out of the list, not deleted"; โพรบ: seed r1 (อ่านได้), n1 (มีฟิลด์เพิ่ม), s1 (kind satellite) → หลัง save หนึ่งครั้งเหลือ ['r1', id ใหม่] — n1 และ s1 หายไป การแก้คือ merge `design-store.ts` ของ PR #41 (เก็บ raw record, รหัส error 'collection' สามภาษา, เทสต์ใหม่ 3 ข้อ) และ **ต้องลงก่อน** ที่ D06 จะเขียน kind 'satellite' ลงคีย์เดียวกัน
- **B-02** — `parseDesignDocument` บันทึก `newerVersion` แล้วรัน `designProblems()` ซึ่ง `vehicleSpecProblems` ปฏิเสธคีย์ที่ไม่รู้จักทุกตัว ("hull is not a field of this version"); เทสต์ "reads a newer file as far as it can" เพิ่มแค่เลขเวอร์ชันไม่เพิ่มฟิลด์ ต้องตัดสินกฎ forward-compatibility: (ก) สำหรับ version > ปัจจุบัน ตัดคีย์ไม่รู้จักออกก่อน validate และรายงานสิ่งที่ตัด หรือ (ข) ปฏิเสธต่อไปแต่แก้ข้อความ `fileNewer`/`fileInvalid` สามภาษาให้ตรงความจริง แล้วเขียนกฎเดียวกันสำหรับไฟล์ภารกิจและ kind satellite
- **B-03** — `computedRatings` หยุดที่ `timeBudgetMs` 8000 คืน `kg: 0, converged: false, stoppedBy: 'timeBudget'` แต่หน้าจอไม่อ่านสองฟิลด์นั้น; โพรบงบ 400 ms บน Falcon 9: LEO 18,141 kg (ไม่ converge), GTO 0 kg/0 เที่ยว เทียบเต็ม 20,031/6,832 ควรแสดง "ยังไม่ได้คำนวณ (หมดเวลา)" ไม่เขียน 0 ลงแบบยาน และเมื่อหยุดกลาง bracket ให้แสดงช่วง "ระหว่าง X และ Y kg" หรือปุ่ม "ค้นต่อ"
- **B-05 (D06/D07)** — ก่อนสร้างโมเดล subsystem ต้อง: (1) merge #41; (2) เพิ่ม kind 'satellite' พร้อม `satelliteSpecProblems` และทำ `parseDesignDocument` generic; (3) กรอง UI ทั้งสองตาม kind และให้ Orbit เปิดแบบดาวเทียมได้; (4) mission-file v3 มี `satelliteSpec` inline ตามแบบ vehicleSpec และ 'custom' SatelliteKind ใน OrbitHandoff ให้พื้นที่ลาก/มวล/เชื้อเพลิงไหลถึง lifetime dialog และงบ O03; (5) ชนิด `SatelliteDesign` แยกจาก `SatelliteSpec` (บัส + แผง + แบตเตอรี่ + ADCS + ลิงก์ + กล้อง) ที่ emit เป็น SatelliteSpec/Spacecraft ชิ้นที่นำกลับมาใช้ได้: `Spacecraft`/`spacecraftFor`, `budget.ts` Craft/BurnBudget, `applications.ts` linkBudget/groundSampleDistance, `passes.ts` inSunlight, `forces.ts` inShadow

## 5. บทเรียน, placement test, worksheets และเครื่องมือครู (src/lessons/**, src/ui/lessons/**, src/worksheets/**, report.ts)

**จุดแข็งที่ตรวจแล้ว**

- grader ไม่ใช้ DOM และ pure: `gradeLesson`/`regradeAnswers` ตรึงเกรดเมื่อเที่ยวบินจบ การกรอ replay ไม่เปลี่ยนเกรด; ทุกบทเรียนถูกบินทั้งแบบเฉลยและแบบผิดใน CI; `tests/lessons.test.ts` + `tests/assessment.test.ts` ผ่าน 53/53 ใน 13.7 s
- บทเรียนในตัว 24 บท (21 flight + 3 case) และคลังคำถาม 157 ข้ออ่านผ่าน reader เดียวกับไฟล์ของครู; ไฟล์บทเรียน round-trip แบบ byte-for-byte
- ล็อกถูกบังคับสองชั้น (MutationObserver ในแผง + `brokenLocks` ใน grader) การเลี่ยงผ่านลิงก์/WebMCP ทำได้แค่ตก ไม่ผ่าน; #41 ขยายไปถึง explicitGuidance และ padId
- ไฟล์ผลลัพธ์บรรจุภารกิจตามที่บินจริง (guidance ที่ merge แล้ว, dynamics รวม dispersion, rendezvous, pad, ยานกำหนดเอง) พร้อม SHA-256
- placement test: blueprint คงที่, สุ่มซ้ำได้ด้วย seed, post-test ไม่ซ้ำข้อ pre-test, จับ misconception พร้อมระดับความมั่นใจ; worksheets สุ่มเลขต่อนักเรียนจากชื่อ + รหัสห้อง เก็บเฉลยแยกคีย์
- เครื่องมือ WebMCP ของบทเรียนไม่เปิดเผยค่าที่คาดหวัง

**ข้อค้นพบ**

| รหัส | ระดับ | ชนิด | เรื่อง | ไฟล์ | งาน | อ้างอิงแผน |
|---|---|---|---|---|---|---|
| LES-01 | P2 | ช่องว่าง | บท 2.4 ให้เกรดเฉพาะ seed ของ run ไม่มีหลักฐานว่าชุด 20 run บินครบและ run ที่เลือกเป็นตัวสุดขั้ว (S4c ยังไม่ทำ; TODO ในโค้ด) | `src/lessons/hooks.ts:66` | M | S4c/A12 |
| LES-02 | P2 | ช่องว่าง | ฝั่งครูไม่มีนำเข้า/ตรวจ/กู้คืน/รวมผล: `verifyResults` เป็นโค้ดตาย, importer เดียวอ่านแค่ไฟล์บทเรียน, ผลลัพธ์ไม่มีนิยามบทเรียนกำหนดเอง | `src/lessons/progress.ts:183` | L | S15/A19, I9 |
| LES-03 | P2 | ช่องว่าง | T02 บินซ้ำ/ตรวจไฟล์นักเรียนยังไม่มี แม้ไฟล์ผลลัพธ์บรรจุภารกิจตามที่บินแล้ว | `src/ui/lessons/lesson-mode.ts:1089` | L | T02 |
| LES-04 | P2 | ช่องว่าง | "แสดงเฉลย" เป็นล็อกถาวรต่อเบราว์เซอร์ไม่มีทางกู้: บทที่เที่ยวบินคงที่ (1.1) ผ่านอีกไม่ได้ในเบราว์เซอร์นั้น ไม่มี reset (เทสต์ตรึงไว้ = เป็น *นโยบาย* ที่ต้องตัดสิน) | `src/lessons/grader.ts:224` | M | codex L2 |
| LES-05 | P2 | ข้อบกพร่อง | ศัพท์ไทย guidance/navigation ชนกันสามทาง (การนำวิถี / การนำทาง / การนำร่อง) ทั้งใน th.ts และบทเรียน | `src/i18n/th.ts:3067` | M | S5 glossary |
| LES-09 | P2 | ช่องว่าง | ข้อความเมื่อตกเป็นประโยคเดียวทั่วไป; debrief และก้าวต่อไปแสดงเฉพาะเมื่อผ่าน | `src/i18n/en.ts:3175` | M | S11 |
| LES-12 | P2 | ช่องว่าง | ไม่มี browser journey ผ่านบทเรียน, placement test หรือ worksheets แบบ end-to-end (มีแค่เปิด `#/lessons/test` ใน mobile-smoke) | `tests/browser/journeys/mobile-smoke.mjs:16` | M | S10 |
| LES-06 | P3 | ช่องว่าง | ข้อความ RU/TH ยังไม่ผ่านเจ้าของภาษา; ไทยมีศัพท์ลอย (ค่าเมล็ด vs Seed, สัมภาระ vs น้ำหนักบรรทุก, เครื่องหมาย « » รัสเซียใน 9 ข้อความไทย) — RU ≈ 9/10, TH ≈ 7.5/10 | `src/lessons/builtin/track2.ts:122` | M | S5 |
| LES-07 | P3 | ความเสี่ยง | placement test 4 ข้อต่อพื้นที่ตัดสิน Beginner/Basic/Proficient — ข้อเดียวย้ายระดับได้; คำว่า "formative" อยู่แต่ในเอกสาร | `src/lessons/assessment/draw.ts:13` | M | learning-review 6 |
| LES-08 | P3 | ช่องว่าง | T03: ไม่มีการจับคู่กับหลักสูตรไทย (สสวท./ตัวชี้วัด) ที่ใดเลยในโค้ดหรือเอกสาร | `src/lessons/types.ts:88` | M | T03 |
| LES-10 | P3 | ช่องว่าง | หลักฐานต่อความพยายามบาง: เก็บแค่ last และ first-pass; เที่ยวบินที่ไม่พิมพ์คำตอบไม่ถูกบันทึกเลย | `src/lessons/progress.ts:133` | S | S12 |
| LES-11 | P3 | ช่องว่าง | บท six-DOF: measure เฉพาะทางน้อย, hook `stableOrbit` ไม่ถูกใช้/ทดสอบ, บท 4.3 ไม่ให้เกรดแอมพลิจูด 2° และการค้าง 8 s | `src/lessons/measures.ts:79` | M | S10/E03; codex L4 |
| LES-13 | P3 | ความเสี่ยง | T01 แจกงานเป็น JSON ล้วนและตรวจไม่ได้: ไม่มี UI แต่ง, บทเรียนกำหนดเองแก้ได้ใน localStorage, ผลลัพธ์บรรจุค่าเฉลย, ลิงก์ `?lesson=` เงียบเมื่อไม่มีไฟล์ | `src/ui/lessons/lesson-mode.ts:1067` | M | T01 |
| LES-14 | P3 | เอกสารล้าสมัย | USER-GUIDE บอกหน้าบทเรียนมี 2 แท็บ (จริง 3: Worksheets); ตาราง roadmap ใน IMPLEMENTATION-STATUS ไม่มีแถว E03/E05 และช่องสถานะว่างสำหรับงานที่เสร็จแล้ว | `docs/USER-GUIDE.md:1158` | S | S5 |
| LES-15 | P3 | ช่องว่าง | worksheets ไม่รู้จักบทเรียน: บทเรียนแค่ตั้งชื่อแผ่น คำถามไม่สะท้อนภารกิจของบท | `src/worksheets/build.ts:97` | M | E05/T03 |

**รายละเอียดข้อที่สำคัญ**

- **LES-01 (S4c)** — `dispersedRun` ตรวจแค่ `dynamics.dispersion.seed`; `DispersedFlightConfig = {seed, run, settings?}` ไม่มีสรุปชุด; `runMissionState` ใน monte-carlo.ts ส่งเฉพาะ dynamics ทางแก้ตามแผน: แนบ `set: {runs, completed, seed, rankByPerigeeMiss}` ใน `dynamics.dispersion` ตอนเปิด run, ให้ hook รับ `{completedRuns: 20, extreme: 'perigee'}` และตกพร้อมเหตุผลเมื่อ run ถูกเปิดนอกชุดที่ครบหรือไม่ใช่อันดับ 1; เทสต์ run จากชุด 5 และ run ที่ไม่สุดขั้วต้องตก; ให้เฉลยใน tests/heavy ยังผ่านด้วยสรุปสังเคราะห์
- **LES-02/03 (S15, T02)** — สิ่งที่มีแล้ว: ไฟล์ผลลัพธ์พร้อม checksum และภารกิจตามที่บิน; สิ่งที่ขาด: ผู้นำเข้าฝั่งครูที่ตรวจ checksum แสดงต่อบท (attempts/verdict/hints/answers พร้อมค่าคาดหวัง) ตัวเลือก "กู้คืนลงเบราว์เซอร์นี้" (merge โดยไม่ทับ pass) โหมด "ห้องเรียน" อ่านหลายไฟล์และ export CSV ต่อบท/เกณฑ์ และ T02 คือ เลือกเรกคอร์ด → โหลดภารกิจเข้าแผง → บินซ้ำใน worker → `gradeLesson` แล้วเทียบค่าทุกเกณฑ์ภายใน MEASURES digits → "ทำซ้ำได้/ต่างกัน" พร้อมเทสต์ Node-vs-Chromium แบบมี tolerance
- **LES-04** — `regradeAnswers` ตกทุกคำตอบที่ `wasRevealed` ภายใน tolerance; `recordRevealed` เก็บทุกค่าที่เคยแสดงของบทนั้นตลอดไป; บท 1.1 ล็อกทุกอย่างและบินจาก LESSON_LAUNCH คงที่ ค่าจึงเหมือนเดิมทุกครั้ง ทางเลือกนโยบาย: บันทึกเป็น "ผ่านด้วยความช่วยเหลือ" (verdict ใหม่ใน LessonRecord) หรือเสนอ "ฝึกซ้ำ" ที่เปลี่ยนพารามิเตอร์ (payload/seed) จนค่าคาดหวังต่างออกไป และปุ่ม "ล้างเฉลยที่เคยดู" หรือครู reset ผ่าน importer; แสดงต้นทุนบนปุ่ม ไม่ใช่แค่ tooltip
- **LES-05** — นับคำตรง: th.ts การนำวิถี 7 / การนำทาง 12 / การนำร่อง 8; บทเรียน 18 / 10 / 1; `setup.guidance` = "พารามิเตอร์การนำวิถี" แต่ `setup.explicit.title` = "การนำทางขาขึ้น: PEG และ IGM", `loop.tab.guidance` = "การนำทาง", `assess.domain.4` = "การนำวิถีและการนำทาง" แต่ `setup.nav.title` = "การนำร่อง (INS / GNSS)"; บท 2.3 ตั้งชื่อ "การนำทางเฉื่อย…" แต่ hint ชี้ไป "การนำร่อง (INS / GNSS)" ทางแก้: ตัดสิน guidance = การนำวิถี, navigation = การนำร่อง, autopilot = ระบบรักษาท่าทาง/นักบินอัตโนมัติ ลง PHYSICS.md glossary, กวาด th.ts (3067–3109, 2883–2886, 255) และบทเรียน, เพิ่มเทสต์ห้ามคำที่ถูกปฏิเสธในคีย์ guidance
- **LES-07** — BLUEPRINT ให้พื้นที่ 2–6 มี [1,2,2,3] = 4 ข้อ น้ำหนัก 1/1.5/2 รวม 6; เกณฑ์ ≥80 % = strong, ≥50 % = basic; พลาดข้อระดับ 1 → 83 % "Proficient", พลาดข้อระดับ 3 → 67 % "Basic", เดาถูกข้อระดับ 3 → "Proficient" ควรบอกในหัวผลว่า 4 ข้อต่อพื้นที่ให้แค่ตำแหน่งคร่าว ๆ (±1 ข้อ = ±17 %) พิจารณา 6 ข้อต่อพื้นที่หรือรอบสองแบบปรับตัวสำหรับพื้นที่ใกล้เกณฑ์ และเขียนประโยค "formative" ใหม่ในเอกสารทั้งสองให้มีความหมาย

PR #41 แก้ draft คำตอบ, rubric/สำเนาบท 1.5/1.2/5.3/5.4/5.5, ล็อก explicit-guidance/pad, export ข้อมูลกรณี, saveNote บนแถบกรณี และการกู้ progress ที่เสียหายแล้ว จึงไม่นับซ้ำที่นี่

## 6. โครงสร้างพื้นฐาน — build, bundle, PWA, ท่อข้อมูล, CI/CD, ประสิทธิภาพ, ความปลอดภัย, ความเป็นส่วนตัว, เวอร์ชัน, เครื่องมือนักพัฒนา

**จุดแข็งที่ตรวจแล้ว**

- service worker (`sw-core.ts`, `manifest.ts`): manifest แบบ content-hash ต่อไฟล์, ติดตั้งเวอร์ชันใหม่ข้างเวอร์ชันเก่าและคัดลอกไฟล์ที่ไม่เปลี่ยน, ติดตั้งแบบ atomic, ภาพ landing/social โหลดตามต้องการ, ตอบ Range (206) สำหรับเสียง, data cache แบบ network-first พร้อม last-good fallback; 14 unit test + journey ออฟไลน์จริง
- ท่อข้อมูล: snapshot ทุกชุดมี format/version/dataset/asOf/fetched/source; deploy รีเฟรชตอน build โดยไม่ commit, retry 2 ครั้ง, ไม่ซ้ำการปฏิเสธ (กฎของ CelesTrak), รันเทสต์ที่อ่าน snapshot 4 ไฟล์บนข้อมูลสดก่อนส่ง
- ความเป็นส่วนตัวโดยการออกแบบ: ออฟไลน์เป็นค่าเริ่มต้น, ไม่มี fetch อื่นนอกจาก data provider/ฟอนต์ออนไลน์/SW, ไม่มี analytics/beacon, ไม่มีบัญชี ไม่มีเซิร์ฟเวอร์
- สุขอนามัยความปลอดภัย: ไม่มี eval/new Function, innerHTML 9 จุดล้วนเป็น SVG/มาร์กอัปที่แอปสร้างพร้อม esc, ลิงก์นอกใช้ rel=noopener, ทุก JSON.parse อยู่ใน try/catch, นำเข้า element set จำกัด 30 MB และ CDM 2 MB, `npm audit` 0 ช่องโหว่, dependency ปักเวอร์ชันแม่นพร้อม lockfile v3
- WebMCP 17 เครื่องมือ ไม่มีตัวใดลบหรือล้างข้อมูลที่เก็บ, Monte Carlo ถูกจำกัดด้วย MONTE_CARLO_RUNS, ถอนการลงทะเบียนตอน pagehide
- build Vite 8/Rolldown 5 s; CI ตรวจ typecheck + 2,532 เทสต์ + build ทุก push/PR, browser smoke บน PR, deploy รัน journey ครบบน build ที่ส่งจริง; glow governor ทดสอบได้โดยไม่มี GPU

**ข้อค้นพบ**

| รหัส | ระดับ | ชนิด | เรื่อง | ไฟล์ | งาน | อ้างอิงแผน |
|---|---|---|---|---|---|---|
| INF-01 | P2 | ข้อบกพร่อง | `ratings.worker` และ `readiness.worker` แต่ละตัวฝัง dictionary สามภาษา (1,117 KB จาก ~1.5 MB = 73 %) ที่ตัวเองใช้ไม่ได้ เพราะ `design/*.ts → config/verdict.ts → i18n` | `src/config/verdict.ts:26` | S | S8/perf |
| INF-02 | P2 | ช่องว่าง | โหลดสามภาษาทั้งหมดตั้งแต่ first paint (i18n chunk 1,118 KB raw / 282 KB gz; th 44 %, ru 34.5 %, en 21.5 %) | `src/i18n/index.ts:1` | M | S8/perf |
| INF-03 | P2 | ช่องว่าง | index chunk 2.48 MB ไม่มีการแยกตามส่วน; dynamic import 3 จุดใน `report.ts` ไม่มีผล (`INEFFECTIVE_DYNAMIC_IMPORT`) เพราะโมดูลเดียวกันถูก import แบบ static ที่อื่น; `chunkSizeWarningLimit: 1500` ปิดคำเตือน | `src/ui/report.ts:218` | L | S8/perf |
| INF-05 | P2 | ความเสี่ยง | การเข้าครั้งแรก precache 15.35 MB (46 ไฟล์) ให้ทุกคน โดย 3.5 MB เป็นเพลงประกอบ และการดาวน์โหลดล้มเหลวหนึ่งไฟล์ทำให้เริ่มใหม่ทั้งหมด | `src/pwa/sw-core.ts:115` | M | S5 (ค้างตัดสิน) |
| INF-09 | P2 | ช่องว่าง | ไม่มีไฟล์ LICENSE และไม่มีข้อความสิทธิ์: โรงเรียนและ ทอ. ไม่มีสิทธิ์ที่ระบุไว้ในการคัดลอกหรือติดตั้ง | `README.md:1` | S | ตัดสินโดยเจ้าของ |
| INF-04 | P3 | ความเสี่ยง | Web Worker 5 ตัวแต่ละตัวฝังสำเนาแกนฟิสิกส์และแคตตาล็อกชิ้นส่วนของตนเอง (~1.9 MB ซ้ำ) | `vite.config.ts:58` | M | — |
| INF-06 | P3 | ข้อบกพร่อง | deploy ข้อมูลรายวันทุกครั้ง = SW เวอร์ชันใหม่: แท็บที่เปิดอยู่เจอ toast "Reload" ทุกวันสำหรับการเปลี่ยนแค่ข้อมูล | `src/pwa/manifest.ts:44` | S | — |
| INF-07 | P3 | เอกสารล้าสมัย | README บอก Node 20+ แต่สคริปต์ snapshot ต้อง 22.6+ และ CI/deploy ปัก 22; ไม่มี `engines` | `README.md:147` | S | — |
| INF-08 | P3 | ช่องว่าง | ไม่มีเวอร์ชันแอปหรือ build stamp ใน UI: ป้าย "02" เขียนตาย, package.json 0.1.0, ไม่มี CHANGELOG (S5 build stamp ยังไม่ทำ) | `index.html:41` | S | S5 |
| INF-10 | P3 | ช่องว่าง | ช่องว่างเครื่องมือ/CI: ไม่มี lint/format, ไม่มี dependency bot, ไม่มี bundle budget, ไม่มี Lighthouse/axe, actions อ้างด้วย tag, ไม่มี permissions/timeouts | `.github/workflows/ci.yml:1` | M | — |
| INF-11 | P3 | ความเสี่ยง | deploy ใช้ ~33 นาที เพราะ build รายวันรัน unit suite 25 นาทีซ้ำ; CI test job 18–25 นาที | `.github/workflows/deploy.yml:29` | S | — |
| INF-12 | P3 | ความเสี่ยง | cron 03:17 UTC เริ่มจริง 09:55 UTC (ช้า 6.5 ชม.) และแหล่งข้อมูลที่ล้มเหลวต่อเนื่องส่ง baseline ที่เก่าลงเรื่อย ๆ โดยมีแค่ warning | `scripts/refresh-snapshots.ts:104` | S | — |
| INF-13 | P3 | ช่องว่าง | ไม่มี Content-Security-Policy; รูปหน้าเพจเอื้อให้ใส่ CSP เข้มได้ | `index.html:3` | S | — |
| INF-14 | P3 | ความเสี่ยง | การนำเข้าไฟล์ภารกิจ/แบบยาน/เที่ยวบิน/บทเรียนอ่านทุกขนาดเข้าหน่วยความจำก่อน parse (ต่างจาก element set/CDM ที่มีเพดาน) | `src/ui/mission-share.ts:176` | S | — |
| INF-15 | P3 | ช่องว่าง | ข้อมูลส่วนบุคคล (ชื่อนักเรียน, รหัสห้อง, เมือง, ผลลัพธ์) อยู่บนอุปกรณ์แต่ไม่มีปุ่มลบและไม่มีคำชี้แจงความเป็นส่วนตัว (PDPA) | `src/ui/lessons/lesson-mode.ts:957` | S | S15 |
| INF-16 | P3 | ความเสี่ยง | ฉาก three.js (พร้อม bloom) วาดทุก animation frame บนหน้า landing และหน้าจอว่าง ไม่มี idle/30 fps cap (S6 วัด ~1 fps โดยไม่มี GPU) | `src/main.ts:1764` | M | S6/S8 |
| INF-17 | P3 | ช่องว่าง | web app manifest อังกฤษล้วน ไม่มี lang/screenshots/shortcuts; ไม่มี robots.txt/sitemap | `public/manifest.webmanifest:1` | S | — |
| INF-18 | P3 | ความเสี่ยง | breakpoint เป็นความกว้างล้วน; หน้าต่าง 1100×650 (โปรเจกเตอร์/แล็ปท็อปพร้อม chrome) ไม่ถูกทดสอบ | `src/style.css:962` | S | S10 |

**รายละเอียดข้อที่สำคัญ**

- **INF-01/02/03/04/05 (น้ำหนักบันเดิล)** — ผลรวม: precache 16.1 MB; ไฟล์ใหญ่สุด mp3 3,516 KB (23 %), index 2,426 KB, readiness.worker 1,537 KB, ratings.worker 1,528 KB, i18n 1,118 KB, satellites.json 995 KB, textures 1,670 KB ลำดับที่คุ้มที่สุด: (1) ให้ `missionVerdict` คืน `{code, params}` แล้วแปลบนหน้า → worker เล็กลง ~2.2 MB raw / 0.56 MB gz (S); (2) ย้าย `audio/` ไป `ON_DEMAND_PREFIXES` หนึ่งบรรทัด (ต้องตัดสิน); (3) โหลด en เสมอและภาษาที่เลือกแบบ dynamic ก่อน `applyStatic` แรก (M); (4) แก้/ลบ dynamic import ใน report.ts แล้วแยกตาม route (Orbit playground/sky, Build + src/design, lessons, mcp.ts) พร้อมเทสต์งบขนาดบน dist (L); (5) ทดลอง `worker: {format: 'es'}` ให้ worker แบ่ง chunk ฟิสิกส์ร่วมกัน (M, ความมั่นใจต่ำกว่า) เป้า: การติดตั้งครั้งแรกต่ำกว่า 8 MB
- **INF-06** — `precacheManifest()` แฮชทุก revision รวม `data/*.json`; deploy รายวันจึงเปลี่ยน sw.js ทุกวันแม้โค้ดไม่เปลี่ยน ทางแก้: ให้ snapshot วิ่งผ่าน route 'runtime' (stale-while-revalidate) หรือตัดออกจาก version hash แล้วรีเฟรชเงียบตอน activate; เก็บ toast ไว้เฉพาะโค้ดเปลี่ยน
- **INF-09 (LICENSE)** — `ls LICENSE* COPYING*` ว่าง; README ไม่มีคำว่า license; package.json `private: true` ไม่มี `license` มีแค่ CREDITS ของ asset ต้องตัดสินโดยเจ้าของ (ข้อเสนอจากคณะวางแผน: Apache-2.0 สำหรับโค้ด, CC BY 4.0 สำหรับบทเรียน/เอกสาร) พร้อม NOTICE รวมเครดิตข้อมูลและสื่อทั้งหมด
- **INF-11/12 (CI)** — Run 47: npm test 25 น. 27 วิ, snapshots 6 วิ, snapshot tests 8 วิ, build 3 วิ, journeys 6 น. 39 วิ = 32 น. 53 วิ ข้อเสนอ: การรันตามตารางข้าม `npm test` (โค้ดถูกทดสอบตอน merge แล้ว) เหลือ ~8 นาที; แบ่ง vitest เป็น 3 shard; เพิ่มขั้นที่ล้มเหลวเมื่อ `asOf` ของ snapshot เก่ากว่า N วัน (3 สำหรับ satellites/space weather, 14 สำหรับ IERS)
- **INF-15 (PDPA)** — คีย์ที่มีข้อมูลส่วนบุคคล: `orbitlab.student`, `orbitlab.worksheets` {students, classCode}, `orbitlab.homeCity`, `orbitlab.results`; ไม่มี `removeItem`/`clear` ที่ใดนอก SW prune; บนเครื่องห้องเรียนที่ใช้ร่วมกัน นักเรียนถัดไปเห็นชื่อคนก่อนถูกกรอกไว้ ควรมีรายการ "Orbitlab เก็บอะไรบนอุปกรณ์นี้" พร้อมปุ่ม "ลบข้อมูลของฉัน" (แยก progress/student/worksheets/designs/settings) ใน dialog ข้อมูล และย่อหน้าความเป็นส่วนตัวสามภาษาใน USER-GUIDE/README
- **INF-16** — `requestAnimationFrame(frame)` เริ่มโดยไม่มีเงื่อนไข; `updateVisuals` วาดทุกเฟรมเว้นแต่ `sceneCovered` ซึ่งบน Home เป็นจริงเมื่อท้องฟ้าครอบ ≥99 % ของ viewport เท่านั้น ควรวาดเฉพาะเมื่อมีอะไรเปลี่ยน (บิน, กล้อง, scroll, resize) หรือจำกัดตอน idle ที่ 15–30 fps และหยุดลูปเมื่อ `document.hidden`

A18 (pool Monte Carlo เริ่มไม่ติด) แก้แล้วใน PR #41; A17 อยู่ในส่วน 2 (LUI-02)

## 7. ฟิสิกส์, six-DOF และ validation (src/physics/**, vehicles.ts, sites.ts, PHYSICS.md §10, VALIDATION.md, SIXDOF-ACCEPTANCE.md, ข้อยกเว้นของ fleet)

**จุดแข็งที่ตรวจแล้ว**

- วินัย validation เป็นของจริงและถูกบังคับ: tolerance ถูกกำหนดก่อนเปรียบเทียบ, ทุกความไม่ตรงเป็นแถวที่มีชื่อใน DISAGREEMENTS ที่จะล้มหากแถวใด *เริ่ม* หรือ *หยุด* ตรง, มีค่าเดียวที่เคย fit (pitch programme six-DOF ของ Falcon 9 ตรวจบนเที่ยวบิน held-out สองเที่ยว)
- ข้อยกเว้นของ fleet matrix ถูก *วัด* ไม่ใช่ *อ้าง*: SITE_GEOMETRY สร้างจากข้อมูลฐาน, ทุก BEYOND_CAPABILITY ถูกบินซ้ำเทียบกฎ, KNOWN_GUIDANCE_FAILURES ว่างจริงบน main
- six-DOF: convergence ระหว่าง step 0.01 กับ 0.005 s ภายใน 3 mm / 3.4e-6 m/s; ชุดปกติยึดทุกยานกับ mass closure, authority สามแกน, chamber thrust; การลงจอด LZ-1 และ catch ของ Super Heavy อยู่ในชุดปกติ
- บรรยากาศ: US76 ถึง 86 km + ตาราง Vallado ที่แถว 86 km ถูกอนุพัทธ์ใหม่เพื่อความต่อเนื่อง; NRLMSISE-00 ตรงกับกรณีทดสอบของ NRL ภายใน 2e-6; SGP4/SDP4 ตรงทุกบรรทัดของ AIAA 2006-6753
- PEG และ IGM จากแหล่งปฐมภูมิพร้อม J2-integrated prediction; Monte Carlo สุ่มแยกสตรีมต่อปริมาณ (ปิดตัวหนึ่งไม่ขยับตัวอื่น)
- การ pitch-down ช่วงท้ายขั้นแรกของ Soyuz ที่เอกสารระบุ ตรงเป๊ะบน main (61.0° → 32.5° ช่วง T+85–110, peak 3.02 °/s) — บันทึกไม่ได้ถูก tune ทิ้ง

**ข้อค้นพบ**

| รหัส | ระดับ | ชนิด | เรื่อง | ไฟล์ | งาน | อ้างอิงแผน |
|---|---|---|---|---|---|---|
| PHY-01 | P2 | ข้อบกพร่อง | Soyuz-2.1a six-DOF เที่ยวบินอ้างอิง (MS-25): คำสั่ง pitch วิ่งไป 5° ใต้ตัวถัง 29°, α ถึง 11.7° หลังแยก booster และ event `aeroEnvelopeExceeded` ยิงที่ T+124 บนเที่ยวบินมีคน — ไม่มีเทสต์ใดกัน | `src/physics/rigid/guidance-attitude.ts` | M | G01 experimental |
| PHY-02 | P2 | ข้อบกพร่อง | แถว LEO ของ Angara-A5 และ Proton-M ระเบิดจาก q-placard (T+179 / T+1038) ถูกจัดเป็น "beyond capability" เพราะ matrix ให้เกรด stack ที่มี Briz-M เทียบกับ rating ที่ตีพิมพ์แบบไม่มี Briz-M | `tests/fleet-harness.ts:369` | M | fleet exclusions |
| PHY-05 | P2 | ความเสี่ยง | CI ไม่เคยรัน six-DOF validation, Starship Flight 5, six-DOF fingerprints หรือ six-DOF fleet gate — regression ของ *โมเดลเริ่มต้น* ถูกจับเฉพาะบนเครื่องนักพัฒนา | `.github/workflows/ci.yml:19` | S | S10 |
| PHY-06 | P2 | ข้อบกพร่อง | A17 ยังเปิด (= LUI-02) | `src/ui/loop-tuning.ts:185` | M | S7/A17 |
| PHY-18 | P2 | ช่องว่าง | PR #36 (กฎ fairing F14, มวล Proton-M ตามเอกสาร, kick ของ Angara six-DOF, abandon insertion ช่วง ascent, apex coast fix) จะปิด 5 รายการที่บันทึกไว้ แต่ตามหลัง main 54 commit และ golden ที่บันทึกใหม่ไม่ตรงอีกแล้ว | `src/physics/sim/staging.ts:249` | M | F14 |
| PHY-03 | P3 | เอกสารล้าสมัย | จำนวน fleet matrix ในสามเอกสารเก่า: 195/126/69 (33/23/13) และ "161 six-DOF cases" เทียบจริง 222/131/91 (42/24/25) | `docs/IMPLEMENTATION-STATUS.md:188` | S | — |
| PHY-04 | P3 | ช่องว่าง | six-DOF fleet gate ไม่บินแถวที่รับแล้ว 8 แถวของ Saturn V | `tests/sixdof-fleet/cases.ts:9` | S | C01 |
| PHY-07 | P3 | เอกสารล้าสมัย | คอมเมนต์ยาน Vulcan ขัดกับข้อมูลที่ส่งและเที่ยวบินจริง (บอก loft 80 km / "ยังอยู่ใน KNOWN_GUIDANCE_FAILURES" / "238–250 × 497 km" ขณะจริง 150 km / ตารางว่าง / 1016 × 137 km) | `src/data/vehicles.ts:225` | S | G01 |
| PHY-08 | P3 | ช่องว่าง | Vulcan ยังเข้าวงโคจรจอดห่างจากแผนมาก (1016 × 137 km เป้า 250 × 500) ใช้ 2.2 ชม. และอีกสอง burn ถึง 500 km; ไม่มีเทสต์จำกัดวงโคจรจอด | `src/physics/guidance.ts` | M | G01 |
| PHY-09 | P3 | เอกสารล้าสมัย | RIGID_DATA_ASSUMPTIONS ยังบอกว่าละ slosh และ flexibility แม้ P05 เสร็จแล้ว | `src/physics/rigid/vehicle-data.ts:17` | S | P05 |
| PHY-10 | P3 | ความเสี่ยง | point-mass ascent บินด้วยแรงโน้มถ่วงทรงกลม ขณะ six-DOF บิน J2 → ต่างกันเป็นระบบ ~0.5 % ของ g (≈8 m/s ต่อ 500 s) ที่การเปรียบเทียบ F9/U02 แบกไว้โดยไม่ระบุ | `src/physics/simulation.ts:971` | S | Assumptions |
| PHY-11 | P3 | ช่องว่าง | ฝั่ง Launch เป็นทรงกลมรัศมีศูนย์สูตร: ground track, จุดตกของขั้น, ตำแหน่งฐานเป็น geocentric (คลาดถึง ~0.19° ≈ 21 km ที่ Baikonur/Plesetsk) ขณะ Orbit ใช้ WGS-84 | `src/physics/orbital.ts:252` | M | Assumptions |
| PHY-12 | P3 | ช่องว่าง | บรรยากาศสองแบบเหนือ 100 km: Launch ใช้ตาราง Vallado คงที่ ส่วน lifetime/re-entry ใช้ NRLMSISE-00 → นักเรียนเทียบ "อยู่ในวงโคจรต่อ" กับเครื่องมือ lifetime ได้คำตอบต่างกัน | `src/physics/atmosphere.ts:52` | M | R05 |
| PHY-13 | P3 | ช่องว่าง | ลมเป็นสถานการณ์การศึกษาที่ประกาศไว้ (8 m/s ตะวันออก, shear 0–12 km, gust 2/1 m/s) ไม่มีลมเหนือ 12 km และไม่มีเลยใน point-mass นอก Monte Carlo | `src/physics/rigid/runtime.ts:108` | M | Assumptions |
| PHY-14 | P3 | ความเสี่ยง | fallback e ≥ 1 ของ `propagateKepler` เป็น step chain อันดับสอง 10 s ไม่ใช่ RK4 — ไม่มีผลวันนี้ แต่ Phase 5 (ดวงจันทร์) และการกลับของ Apollo ใน PR #38 จะใช้ | `src/physics/orbital.ts:192` | M | L01–L05; C01 |
| PHY-15 | P3 | ความเสี่ยง | D01 fingerprints และ six-DOF goldens แฮชค่า float ดิบ → อัปเกรด Node/V8 อาจล้ม 27 + 21 เทสต์โดยโค้ดไม่เปลี่ยน | `tests/d01-fleet-fingerprint.test.ts:8` | S | Known limitations |
| PHY-16 | P3 | ช่องว่าง | ขั้นสองของ Electron ยังเผาสั้น ~25 %; PUG ปิดได้ที่ throttle เฉลี่ย ~70 % ซึ่งโมเดลข้อมูลไม่มีฟิลด์ | `src/data/parts.ts:457` | S | F7 |
| PHY-17 | P3 | ช่องว่าง | PSLV-XL (11 แถว) และ H3 (5 แถว) ยังไม่ตรงโปรไฟล์ที่ตีพิมพ์เพราะ ascent profile; Falcon Heavy ตัดขั้นแรกเร็ว 11–13 %; ไม่มี pitch programme ต่อยานนอก six-DOF fit ของ Falcon 9 | `tests/validation/timelines.test.ts:18` | L | F11–F13 |
| PHY-19 | P3 | ความเสี่ยง | apsides ของคำตัดสิน six-DOF vs osculating elements ที่แสดง: ใต้ J2 apogee แกว่ง ±10 km → "target" อาจแสดงข้าง metric ที่อ่านว่า "outside" (= R1 ของ PR #41 บน codex; บน main ยังไม่มีปัญหา) | `src/physics/sim/burns.ts:763` | M | S11 |
| PHY-20 | P3 | ช่องว่าง | การกู้ขั้นแรก Falcon 9 ใน six-DOF ยัง experimental: ก๊าซเย็น min(10 % dry, 100 kg) ที่ 200 N / Isp 60 s หมดก่อน T+180 s ผลขึ้นกับสถานะแยกขั้น | `src/physics/rigid/vehicle-data.ts:487` | M | experimental |
| PHY-21 | P3 | ช่องว่าง | ยาน Starship Flight 5 ลงเร็ว ~6 นาทีและสั้น 15–25°; เทสต์ heavy เดียวที่กันมีหน้าต่างกว้างจนจับความผิดพลาดนั้นไม่ได้ | `tests/heavy/starship-flight5.test.ts:23` | L | experimental |
| PHY-22 | P3 | ช่องว่าง | 6 จาก 21 ยาน (LM-2D/3B/5, Vulcan, Soyuz-2.1b, Starship) ยังไม่ถูกเทียบกับ timeline ใด และ PR #38 เพิ่มอีกสามภารกิจโดยไม่มีการเทียบ | `docs/VALIDATION.md:14` | M | Known limitations |
| PHY-23 | P3 | ช่องว่าง | ระนาบเป้าหมาย ISS สำหรับ rendezvous เป็นค่า epoch คงที่ แม้แอปมี element set ของ ISS ในแคตตาล็อกอยู่แล้ว (R02) — ไม่ได้ตรวจในโค้ด preset | `docs/PHYSICS.md:2772` | S | G07/R02 |

**รายละเอียดข้อที่สำคัญ**

- **PHY-01** — โพรบบน main: body pitch 61.0° (T+85) → 32.5° (T+110), peak 3.02 °/s ที่ T+91.8 ตามเอกสาร; แต่ต่อจากนั้น T+120 body 26.3° กับคำสั่ง 7.7°, T+128.5 α = 11.70°, events `121:evt.boosterSep 124:evt.aeroEnvelopeExceeded` (severity warn) — ยังเข้าวงโคจร 200×198 km ที่ T+533 ข้อเสนอ: ให้ Soyuz-2.1a มี pitch programme six-DOF ที่ fit ตามวิธี F5 ของ Falcon 9 หรือ clamp คำสั่ง closed-loop ให้อยู่ภายใน ~10° ของตัวถังขณะ q > 1 kPa; เพิ่มเทสต์ชุดปกติที่บิน MS-25 ถึง T+140 ยืนยัน peak rate < 1.5 °/s, α < 5° ผ่านการแยก booster และไม่มี `aeroEnvelopeExceeded`
- **PHY-02** — `fleet-harness.ts:322-326` เองบอกว่า "Proton-M, Angara-A5, Soyuz-2.1b แบก kick stage 22 t เสมอในโมเดลนี้ … LEO capability จึงเป็นเสี้ยวของที่ตีพิมพ์" ทางเลือก: (ก) เพิ่ม configuration สามขั้นไม่มี Briz-M สำหรับอ้างอิง LEO หรือ (ข) ให้เกรดเทียบ rating ที่วัดสำหรับ stack ที่บินจริงและย้ายแถวไป ARCHITECTURE พร้อมเหตุผลตรงไปตรงมา; แยกต่างหาก รับ `abandonInsertion` ช่วง ascent ของ PR #36 เพื่อให้ขั้นบนอ่อนจบเป็น "ไปไม่ถึง" แทนระเบิด
- **PHY-05** — `vite.config.ts:67` ตัด `tests/heavy/**` และ `tests/sixdof-fleet/**` ออกจาก `npm test`; CI/deploy รันแค่ `npm test` ข้อเสนอ: workflow ตามตาราง (รายคืนหรือรายสัปดาห์) รัน `test:heavy` + sixdof-fleet 4 shard เป็น matrix และ job ที่กรองด้วย path รัน `validation-timelines.test.ts` บน PR ที่แตะ `src/physics/rigid/**` หรือ `src/data/**`
- **PHY-18 (PR #36)** — `git merge-tree` ชนเฉพาะ `docs/PHYSICS.md`; branch เพิ่ม `FairingSpec.sepAfterIgnition` (Proton-M p3 +10 s, Angara-A5 urm2 +9 s อ้าง ILS MPG §2.3.1), มวล Proton-M 428.3/157.3 t เทียบ main 419.4/156.1 t, `guidanceDefaultsSixDof {kickAngle: 8}` ของ Angara, abandon insertion, "burn now" เมื่อ J2 coast prediction ล้มเหลวหลัง apex — แต่บันทึก fingerprint/golden/timeline pin ใหม่ก่อน F11/F12/D03 ต้อง rebase, ทิ้งการบันทึกใหม่ของ branch แล้วบันทึกใหม่บน main, re-pin แถว Proton-M/Angara (fairing/time ควรออกจากรายการ), แก้ conflict PHYSICS.md โดยเก็บ §6b ของ main + ย่อหน้า F14; **merge ก่อนงานข้อมูลยานใด ๆ ต่อไป** และการรับต้องผ่าน `test:heavy` (25 น.) + `test:sixdof-fleet` (2 ชม. 40 น.) บนเครื่อง 4 core — ยังไม่มีใครวางเวลานี้
- **PHY-15** — ข้อเสนอที่ปลอดภัยกว่า "tolerance goldens แทน hash": แฮชค่าที่ปัดเป็น relative 1e-10 (หรือเก็บ state ที่สุ่มแล้วเทียบด้วย 1 mm / 1 µm/s) เพื่อให้เฉพาะการเปลี่ยนฟิสิกส์ขยับ hash และคง exact-hash ไว้หนึ่งตัวเป็น canary — สอดคล้องกับผลตัดสินของคณะวางแผน (ปัก Node 22 ก่อน, hash เป็น gate, tolerance tier เป็น oracle สำหรับ T02)

## 8. i18n, สำเนา, การเข้าถึง (a11y) และมือถือ

**จุดแข็งที่ตรวจแล้ว**

- ท่อภาษา: `setLang`/`initLang` ตั้ง `documentElement.lang`, title และ meta description ตามภาษา; dictionary ~3,560 คีย์ × 3 ภาษาถูกยึด parity ด้วย 16 เทสต์ (เขียวใน 4 s) ครอบ parity, การประกาศเดี่ยว, placeholder, script ครอบ, ไม่มีเลขไทย, call site ทุกคีย์
- dialog ใช้ `<dialog>` native + `showModal()` จำผู้เปิดและคืนโฟกัส; scrubber เป็น `<input type=range>` มี aria-label/aria-valuetext และคีย์บอร์ดครบ; แท็บ Orbit/inspector/Build เป็น role=tablist; กราฟเป็น role=img มีคำบรรยาย localize; canvas ทั้งสี่ของ Orbit มี aria-label
- contrast คู่หลักแข็ง (--text 14–17:1, --muted 6.5–7.6:1, --accent 11–13:1); mobile-smoke ผ่านที่ 390×844 (ไม่มี overflow, ทุก nav มีชื่อในภาษาหน้า); web fonts เป็น progressive enhancement (ออนไลน์เท่านั้น, fallback ระบบ, cache โดย SW)
- ข้อความบทเรียนไทยแทบไม่มีอังกฤษหลงเหลือ (เว้นคำละตินที่ตั้งใจ: max-Q, Isp, Δv); ศัพท์รัสเซียนิ่ง (наведение, апогей, наклонение, ступень)

**ข้อค้นพบ**

| รหัส | ระดับ | ชนิด | เรื่อง | ไฟล์ | งาน | อ้างอิงแผน |
|---|---|---|---|---|---|---|
| I18N-01 | P2 | เอกสารล้าสมัย | ข้อความดาวเทียมไทยยังบอกว่าการติดตามดาวเทียมจริง "จะมาในระยะถัดไป" แม้ R02 มีกลุ่ม Thailand แล้ว — **ไม่อยู่ใน #41** | `src/i18n/en.ts:1152` | S | S5/A8 |
| I18N-02 | P2 | ข้อบกพร่อง | แผงสมการแสดง "No air to act on at this height" บนแท่นปล่อย/หลังลงจอด/เมื่อไม่มีเฟรม (คีย์เดียวสามเงื่อนไข) — **ไม่อยู่ใน #41** | `src/ui/equations-model.ts:84` | S | S5/A8 |
| I18N-03 | P2 | ข้อบกพร่อง | D5 ยังไม่ใช้: การนำทาง ถูกใช้แทน guidance ใน setup.explicit.*, loop.tab.guidance, evt.guidance*, assess.domain.4 (12 คีย์ + 10 ข้อความบทเรียน) ไม่มีเทสต์กัน (= LES-05) | `src/i18n/th.ts:3067` | M | S5/D5 |
| I18N-04 | P2 | ข้อบกพร่อง | "stage" ไทยเป็น **ท่อน** ใน UI (292 ครั้ง) แต่ **ขั้น** ในบทเรียน (117 ครั้ง) — hint ของบทเรียนกับป้ายแผงใช้คำต่างกัน ขัดเกณฑ์ S5 "ตรงตัวอักษร" | `src/lessons/builtin/track2.ts:1` | M | S5 |
| MOB-01 | P2 | ช่องว่าง | S8 ยังไม่ทำ: ที่ความกว้างโทรศัพท์ ปุ่มระดับเป็น glyph เปล่า 3 อันและปุ่มส่วนซ่อนทุกป้ายที่ไม่ใช่ปัจจุบัน — ชื่ออยู่ใน tooltip ที่มองไม่เห็นบนจอสัมผัส (screenshot ยืนยัน: ▷ ◎ ⌬ ไม่มีข้อความ) | `src/ui/modes.css:51` | S | S8/I7 |
| I18N-05 | P3 | ข้อบกพร่อง | ศัพท์ไทยอื่นมี 2–3 การสะกดและหลายคำขัด glossary: fairing (ครอบจมูก 8 / ฝาครอบ 29 / ครอบหัว 27), telemetry (เทเลเมทรี 8 vs โทรมาตร 3), payload (น้ำหนักบรรทุก 60 vs สัมภาระ 15), apogee/perigee (อะโพจี/เพริจี), inclination (มุมเอียง vs ความเอียง), "max-Q"/"max Q"/"Max-Q" | `src/i18n/th.ts:1` | M | S5 |
| I18N-06 | P3 | ข้อบกพร่อง | การจัดรูปตัวเลขไม่รวมศูนย์: `num()` 7 ตัว (5 ตาม locale, 3 ตรึง ".") → จอรัสเซียเห็นทั้ง "1 234,5" และ "1234.5"; คำบรรยายกราฟ localize แต่ tick ไม่ (284 `toFixed` ใน 59 ไฟล์) | `src/ui/charts.ts:288` | M | Known limitations |
| I18N-07 | P3 | ข้อบกพร่อง | วันที่ไทยมีสองปี: พ.ศ. (2569) จาก `toLocaleDateString('th')` และ ค.ศ. (2026) จาก ISO slice บนหน้าเดียวกัน | `src/ui/orbit/sky-panel.ts:1123` | S | — |
| MOB-02 | P3 | ข้อบกพร่อง | แถบแท็บ Orbit engineer รัสเซียตัดแท็บที่สี่ ("Диаг…") ที่ 390 px โดยไม่มีสัญญาณเลื่อน | `src/ui/orbit/playground.css:33` | S | S8/S16 |
| MOB-03 | P3 | ข้อบกพร่อง | toast "พร้อมออฟไลน์" ของ PWA ไม่ปิดเองและทับปุ่มล่างบนโทรศัพท์ (ทั้งสอง screenshot) | `src/pwa/register.ts:41` | S | — |
| MOB-04 | P3 | ช่องว่าง | S16 แท็บงานบนมือถือยังไม่เริ่ม: lead ของ Engineer 8–12 บรรทัด (th 1,017 byte ≈ 2× en) และคอลัมน์ยาวเดียวบนโทรศัพท์ | `src/i18n/en.ts:1689` | L | S16/I7 |
| A11Y-01 | P3 | ความเสี่ยง | `--dim` (#6c7b8e) ต่ำกว่า WCAG AA บนพื้นแผง (4.20 บน --panel, 3.88 บน --panel2) และใช้กับป้าย 9–11.5 px; 28 กฎ font-size ≤10 px | `src/style.css:754` | S | — |
| A11Y-02 | P3 | ความเสี่ยง | เป้าแตะของ scene tools/ปุ่มเล่น/ปุ่มหน้าต่าง HUD 21–34 px (ต่ำกว่า 44 px; `.hud-btn` 21×18 ต่ำกว่า WCAG 2.5.8 24 px) | `src/style.css:580` | S | — |
| A11Y-03 | P3 | ความเสี่ยง | ticker live region ถูกสร้างใหม่ทั้งก้อนทุก event → screen reader อ่านซ้ำถึง 4 แถว; ไม่มีการตรวจ a11y อัตโนมัติเลย | `src/ui/hud.ts:987` | S | — |
| A11Y-04 | P3 | ความเสี่ยง | `prefers-reduced-motion` ถูกเคารพโดย CSS และหน้า landing/Build แต่ไม่ใช่โดยฉาก launch, camera easing, animation ของ Orbit playground (0 การอ้างใน src/render และ src/ui/orbit) | `src/style.css:1185` | M | — |
| FONT-01 | P3 | ความเสี่ยง | ไทยออฟไลน์ใช้ฟอนต์ระบบในกล่อง line-height 1.2–1.25 + overflow hidden โดยไม่มี `:lang(th)` — สระ/วรรณยุกต์ซ้อน (ที่, ปั้น) ถูกตัด | `src/style.css:1138` | S | S8 |
| COPY-01 | P3 | เอกสารล้าสมัย | สำเนา "กำลังสร้าง" ตาย: `plan.orbit.lead` ("Nothing on this page works yet") ไม่เคยถูก render แต่รอด call-site test; `lesson.comingSoon` ฯลฯ เข้าถึงได้ผ่าน COMING ที่ว่าง | `src/i18n/en.ts:1648` | S | — |
| COPY-02 | P3 | ช่องว่าง | glossary ขาดแถวที่ S5 จะเพิ่ม (guidance/navigation/PEG/IGM/margins/notch) และ build stamp; Known limitations "RU/TH ยังไม่ผ่านเจ้าของภาษา" ยังยืน | `docs/PHYSICS.md:2856` | S | S5 |

**รายละเอียดข้อที่สำคัญ**

- **I18N-01/02** — สองข้อ A8 ที่ยังอยู่บน main และ **PR #41 ไม่ได้แก้** (ตรวจใน worktree ของ codex แล้วสตริงเหมือนกัน); I18N-02: `equations-model.ts:78/84/153` ใช้ `eq.none.noAir` ทั้งกรณี rho = 0, กรณีอากาศมีแต่ความเร็วสัมพัทธ์ ~0 (แท่นปล่อย, หลังลงจอด) และกรณีเฟรมไม่ integrated — ควรแยกเป็น `noAir`/`stillAir`/`noRecord` และเพิ่มกรณี pad/กลางอากาศ/อวกาศ/ลงจอดใน `tests/equations.test.ts` ตามที่แผน S5 ระบุ
- **I18N-03/04/05 (ศัพท์ไทย)** — รวมกันคืองาน S5 ที่แผนวางไว้: ใช้ D5 เชิงกล (guidance → การนำวิถี ใน setup.explicit.*, loop.tab.guidance, guide.*, evt.guidance*, assess.domain.4, catalog.ts:40; navigation → การนำร่อง ใน guidance.ts:23, track2.ts:87/107 — ตัดสินชัดว่า GNSS ผู้บริโภคใช้ "ดาวเทียมนำทาง" ได้หรือไม่); แทน ขั้น-ที่หมายถึง-stage ด้วย ท่อน ทั่ว builtin/*.ts และคลังคำถาม (คง ขั้นตอน = step); normalize ตาม glossary (ครอบจมูกจรวด, โทรมาตร, น้ำหนักบรรทุก, จุดไกลโลกที่สุด/จุดใกล้โลกที่สุด, ความเอียงของวงโคจร, "max-Q"); เพิ่มแถว glossary phase/gain margin, attitude control, PEG, IGM, notch; ขยาย `tests/i18n.test.ts` ด้วย deny-list (การนำทาง ในคีย์วิศวกรรม, ฝาครอบ, ครอบหัว, เทเลเมทรี, อะโพจี, เพริจี, สัมภาระ, "max Q", "Max-Q") และเทสต์ว่า hint ไทยของ control ตรงป้าย th.ts ของ control นั้น
- **MOB-01 (S8)** — `modes.css:44` ซ่อน span ของ section ที่ไม่ใช่ปัจจุบัน ≤960 px และ `:51` ซ่อนทุก span ของ level ≤480 px; journey ยืนยันแค่ accessible name (มาจาก title) จึงผ่านทั้งที่ผู้ใช้จอสัมผัสมองไม่เห็นชื่อ ทางแก้: ป้ายสั้นใต้ glyph (ชิปสองแถว) และ mobile-smoke ยืนยันข้อความ *มองเห็น* (computed width > 0)
- **FONT-01 + A11Y-01** — เกี่ยวเนื่อง: `.hud-body` 10 px/1.24 และ 9.5 px/1.2 ใน overflow hidden; `--dim` 3.9–4.5:1 บนป้าย 9–11.5 px ทางแก้ร่วม: `html[lang=th] .hud-body, .pg-mode, .li-block h4 { line-height: 1.4 }`, ยก `--dim` เป็น ≈#8593a6, ยกป้าย 8.5–10 px เป็น ≥11 px (ช่วย glyph ไทยด้วย); ตรวจใน PWA ออฟไลน์บน Android/Windows — และการ self-host subset ของ Noto Sans Thai เป็นการตัดสินใจของเจ้าของ (README:365 อธิบายว่าทำไมไม่ทำ)

## 9. เอกสาร — ความสอดคล้องและความครบ (README, docs/*.md, docs/history, พื้นผิวเอกสารในแอป)

**จุดแข็งที่ตรวจแล้ว** — ตาราง fleet 21 ยานและตารางฐาน 16 แถวใน README ตรง `vehicles.ts`/`sites.ts` ทุกค่า; จำนวนที่สำคัญถูก (24 บท, 157 ข้อ, 175 ไฟล์เทสต์, 16+4 ฐาน, tour 7+8 และ 5 ขั้น, วันที่ snapshot); PHYSICS §10 และ Known limitations บันทึกความไม่ตรงแทนการ tune ทิ้ง และ VALIDATION §9 ให้คำสั่งรันซ้ำที่ไฟล์มีจริงทั้ง 12; docs/README.md ให้ลำดับอ่านและกฎบันทึกลงวันที่; ข้อความอนาคต (D06/D07 Phase 4, Engineer parts builder "to come") ตรง `section-plan.ts`; glossary ประกาศเป็น source of truth และเทสต์บังคับ parity; คำอ้าง CI/deploy ใน README ถูกต้อง

**ข้อค้นพบ**

| รหัส | ระดับ | ชนิด | เรื่อง | ไฟล์ | งาน |
|---|---|---|---|---|---|
| DOC-01 | P2 | เอกสารล้าสมัย | ตาราง roadmap Launch ใน IMPLEMENTATION-STATUS เว้นว่าง 9 รายการที่ merge แล้ว (G01–G05, G08, E02, E04, C01), ไม่มีแถว E03/E05/P08/Q0, และยังชี้ branch ที่ merge นานแล้ว — history records เขียนไว้ตรง ๆ ว่า "ทิ้งตารางไว้ให้เจ้าของ fold in ตอน merge" ซึ่งไม่เคยเกิด | `docs/IMPLEMENTATION-STATUS.md:219` | S |
| DOC-02 | P2 | เอกสารล้าสมัย | README/USER-GUIDE บอก Watch มี 9 เที่ยว โค้ดมี 10 (ขาด "Soyuz MS: at the station in 3 hours") | `README.md:281` | S |
| DOC-03 | P2 | เอกสารล้าสมัย | README บอก WebMCP 9 เครื่องมือ แอปลงทะเบียน 17 (13 ใน mcp.ts + 4 ของบทเรียน) | `README.md:403` | S |
| DOC-06 | P2 | ช่องว่าง | "Sources & credits" ในแอปและ Acknowledgements ใน README ไม่ระบุแหล่งข้อมูล Orbit/Build ใด (CelesTrak, NOAA SWPC, GFZ, IERS, NRLMSISE-00, AIAA 2006-6753, GCAT, eoPortal, ULA/Arianespace/ILS, Skyfield …) ขัด roadmap principle 5 | `src/ui/dialogs.ts:210` | S |
| DOC-07 | P2 | ช่องว่าง | ไม่มี LICENSE/ฟิลด์ license/tag/CHANGELOG สำหรับเว็บสาธารณะที่ตั้งใจให้คัดลอกลง intranet (= INF-09) | `package.json:3` | S |
| DOC-08 | P2 | ช่องว่าง | ไม่มีคำชี้แจงความเป็นส่วนตัว/ข้อมูล แม้ผู้ชมรวมผู้เยาว์ แอปเก็บคำตอบและออนไลน์เรียก 3 โฮสต์ (CelesTrak, NOAA, Google Fonts) — PDPA ปรากฏครั้งเดียวใน ROADMAP:48 (= INF-15) | `docs/ROADMAP-PART2-3.md:48` | S |
| DOC-09 | P2 | ช่องว่าง | ไม่มีคู่มือครูและไม่มีโปรโตคอลทดสอบผู้ใช้ (S9) — "teacher" ปรากฏครั้งเดียวใน USER-GUIDE §18 ทั้งที่โค้ดอ่านไฟล์ครู ให้เกรด export ผล มี worksheets พร้อมเฉลย | `docs/USER-GUIDE.md:1156` | M |
| DOC-10 | P2 | ช่องว่าง | USER-GUIDE (100 kB) เป็นอังกฤษล้วน (0 อักษรไทย) และเข้าไม่ถึงจากแอป; dist/ ไม่มี docs; แอปลิงก์เอกสารเดียวคือ dossier six-DOF | `docs/USER-GUIDE.md:1` | L |
| DOC-11 | P2 | ช่องว่าง | glossary 98 แถว EN/RU/TH อยู่แค่ใน PHYSICS.md; แอปแสดง 4 คำ (= LES-05/COPY-02) | `docs/PHYSICS.md:2856` | M |
| DOC-04 | P3 | เอกสารล้าสมัย | PHYSICS §10 ประโยค max-Q ของ Falcon 9 ("~20 s early เพราะ bucket 22 kPa") ขัด VALIDATION §2 (8–11 s, −13…−18 %) และคอมเมนต์ใน vehicles.ts ว่าเวลาถูกกำหนดโดย ascent profile | `docs/PHYSICS.md:2799` | S |
| DOC-05 | P3 | เอกสารล้าสมัย | Help ในแอปยังบอก ISS preset "not rendezvous or docking" (G07 dock แล้ว); ส่วน slosh/bending ใน Physics dialog แก้ใน #41 | `src/ui/help-content.ts:38` | S |
| DOC-12 | P3 | เอกสารล้าสมัย | docs/README.md: คำบรรยาย USER-GUIDE/VALIDATION เก่า และ history records 3 ไฟล์ (HANDOFF-G02-BURNS, LESSONS-2026-09, PARALLEL-GNC-2026-09) ไม่อยู่ในดัชนี | `docs/README.md:7` | S |
| DOC-13 | P3 | เอกสารล้าสมัย | README Features ขาด 4 failure mode (launchAbort, padFire, boosterCollision, stagingFailure) และ Project layout ขาด 7 โฟลเดอร์ (lessons, config, audio, pwa, session, worksheets, ui/lessons) | `README.md:35` | S |
| DOC-14 | P3 | เอกสารล้าสมัย | คำบรรยาย `test:heavy` ("~15 นาที, delivered-orbit matrix") ต่ำกว่าจริงเป็นสิบเท่า — tests/heavy มี 26 ไฟล์รวม validation-falcon9/timelines, monte-carlo ×5, flex-fleet ×4, starship, reentry-agencies | `README.md:140` | S |
| DOC-15 | P3 | เอกสารล้าสมัย | Node: README "20+", Vite 8 ต้อง ^20.19 \|\| >=22.12, CI 22, ไม่มี engines (= INF-07) | `README.md:147` | S |
| DOC-16 | P3 | เอกสารล้าสมัย | หัว SIXDOF-VEHICLE-DATA บอก scope 2 ยาน (2026-09-19) ทั้งที่ครอบ 21 แล้วและถูก bundle เป็น dossier ในแอป; SIXDOF-BROWSER-QA (2026-09-20) ควรอยู่ใน history/ | `docs/SIXDOF-VEHICLE-DATA.md:3` | S |
| DOC-17 | P3 | เอกสารล้าสมัย | history records (CHECKPOINT-2026-09-20, CONTINUE-PHASE-6, HANDOFF-G02-BURNS) ไม่มีแบนเนอร์ "superseded" ในไฟล์เอง | `docs/history/CHECKPOINT-2026-09-20.md:1` | S |
| DOC-18 | P3 | ช่องว่าง | ไม่มี decision log: "owner" 20 ครั้งกระจายใน 5 เอกสารพร้อมวันที่แต่ไม่มีดัชนี; "Twenty further items are kept for later" ไม่มีรายการที่ใดใน repo | `docs/ROADMAP-PART2-3.md:49` | S |
| DOC-19 | P3 | ช่องว่าง | PHYSICS.md (223 kB, 46 หัวข้อ) และ VALIDATION.md (205 kB, 48 หัวข้อ) ไม่มี TOC และไม่ถูก publish กับเว็บ | `docs/PHYSICS.md:1` | M |
| DOC-20 | P3 | ช่องว่าง | USER-GUIDE ขาด Help/คู่มือภารกิจแรก, การแสดงต้นทุน dogleg, สวิตช์ `?physics=inline` | `docs/USER-GUIDE.md:530` | S |
| DOC-21 | P3 | ช่องว่าง | โฟลเดอร์ audit ไม่มีดัชนีสถานะ: PLAN-2026-09-28 ไม่บอกว่า session ใด merge แล้ว; STATUS/README ไม่อ้าง audit เลย | `docs/history/audit-2026-09-27/PLAN-2026-09-28.md:136` | S |
| DOC-22 | P3 | เอกสารล้าสมัย | STATUS "Updated 2026-09-28" แต่แก้ล่าสุด 09-29; README ไม่กล่าวถึงฐาน C04 4 แห่งที่ไม่มียานบิน | `docs/IMPLEMENTATION-STATUS.md:3` | S |
| DOC-23 | P3 | ความเสี่ยง | PR #41 เพิ่ม ~119k บรรทัดหลักฐานใต้ docs/ นอกธรรมเนียม history/ (= R2 ของรีวิว #41) | `docs/README.md:22` | S |

ประมาณสองในสามของข้อค้นพบด้านเอกสารเป็นการแก้ระดับ S ที่ **หนึ่ง session เคลียร์ได้หมด** — และคณะวางแผนเสนอ *เทสต์ความสอดคล้องของตัวเลขในเอกสาร* (จำนวนเทสต์/เครื่องมือ/ยาน/Node ยึดกับ source แบบ `section-plan.test.ts`) เพื่อไม่ให้ drift กลับมา (ENG-K22)

## 10. กลยุทธ์ทดสอบ, คุณภาพโค้ด และการบำรุงรักษา

**จุดแข็งที่ตรวจแล้ว** — ฐานเทสต์ใหญ่ deterministic และซื่อตรง: 175 ไฟล์ default (172 `tests/*.test.ts` + 3 validation) 2,532 เทสต์, heavy 27 ไฟล์และ six-DOF fleet 6 ไฟล์หลัง config แยกพร้อมต้นทุนที่ระบุ; เทสต์ถูก type-check ใต้ strict; 0 skip/only/todo, 0 @ts-ignore, 1 TODO ใน 103k บรรทัด, 0 console.log ใน src; fleet matrix 195 กรณี 164 เทสต์ใน 71.7 s (worker เดียว) ทุกข้อยกเว้นมีชื่อและเหตุผล; pwa.test.ts ครอบทุก export ของ sw-core รวมเส้นทางล้มเหลว; i18n.test.ts และ assessment.test.ts เป็น QA gate จริง; ไม่มี Date.now()/Math.random() ในเทสต์; fingerprint ทำซ้ำ bit-for-bit บน Node 22.22.2 (32 ผ่านใน 65.6 s); duplication ต่ำนอก dictionary; mcp.test.ts 1,156 บรรทัดครอบพื้นผิว WebMCP

**ข้อค้นพบ**

| รหัส | ระดับ | ชนิด | เรื่อง | ไฟล์ | งาน | อ้างอิง |
|---|---|---|---|---|---|---|
| TQ-01 | P2 | ความเสี่ยง | golden fingerprint แฮช float เต็มความละเอียด → Node/V8 เปลี่ยนล้ม 5 ไฟล์พร้อมกัน (โพรบ Node 24.19 ของ Codex ได้ `a173338e…` เทียบที่บันทึก `deef4d6e…` สำหรับ soyuz21a/leo/50) (= PHY-15) | `tests/flex-golden-harness.ts:43` | M | หลักการ 7 |
| TQ-02 | P2 | ช่องว่าง | journeys มี 4 จาก 10 ที่ S10 ขอ; Build และ Orbit ไม่มีเลย; launch-explore ขับผ่าน WebMCP ไม่ใช่ UI (= LUI-06/ORB-10/B-04/LES-12) | `tests/browser/journeys/launch-explore.mjs:8` | L | S10 |
| TQ-03 | P2 | ช่องว่าง | ไม่มีชั้นเทสต์ DOM: 54 จาก 91 ไฟล์ src/ui (16,458 จาก 27,424 บรรทัด) + main.ts (1,987) ไม่เคยถูก import โดยเทสต์ใด; 13 ไฟล์ stub `g.document = {…}` เอง | `src/ui/panel.ts:620` | L | S16/S8 |
| TQ-04 | P2 | ช่องว่าง | โปรโตคอลข้อความ worker 5 จาก 8 และเส้นทางล้มเหลวไม่มีเทสต์ (lifetime, ratings, readiness, screening, reentry) | `src/ui/build/readiness-job.ts:1` | M | S7 |
| TQ-05 | P2 | ข้อบกพร่อง | suite default ใช้ 25.5 นาที รันสองครั้งต่อการเปลี่ยน (CI + deploy) และบน push ที่แก้แค่ docs; **long pole คือภารกิจ six-DOF ทั้งเที่ยวในชั้น default** (rigid-mission-convergence 4 ภารกิจ timeout 900 s, custom-vehicle-*-sixdof ถึง t=7200 s, rigid-simulation 2 ภารกิจ) ไม่ใช่ fleet matrix (71.7 s) (= INF-11) | `.github/workflows/ci.yml:3` | M | S6 |
| TQ-13 | P2 | ข้อบกพร่อง | Auto Tune ของ inspector บนเธรดหลักแม้ tune worker มีอยู่ — และไม่มีเทสต์สัญญา threading จึงคงอยู่ได้ (= LUI-02/PHY-06) | `src/ui/loop-tuning.ts:185` | S | S7/A17 |
| TQ-06 | P3 | ช่องว่าง | คีย์ i18n ไม่มี type: parity 3 × 3,500 คีย์เป็นแค่ runtime test; เทสต์มองไม่เห็นอังกฤษ hard-coded, glossary drift, overflow | `src/i18n/en.ts:1` | M | S5 |
| TQ-07 | P3 | ช่องว่าง | ไม่มี lint/format/dead-export tooling: 201 export ถูกอ้างเฉพาะในไฟล์ตัวเอง, 16 ไม่ถูกอ้างเลย | `package.json:7` | S | — |
| TQ-08 | P3 | ความเสี่ยง | 19 ฟังก์ชันเกิน 150 บรรทัด (stepFlight 358, SetupPanel.render 306, guidance update 297) ในโมดูลที่ไม่มีเทสต์ → งาน UI ที่วางไว้ (S16, D06/D07) เสี่ยง | `src/physics/simulation.ts:751` | L | — |
| TQ-09 | P3 | ข้อบกพร่อง | เทสต์พิมพ์ JSON หลายกิโลไบต์ลง stdout โดยไม่มีเงื่อนไข ทำให้ log CI ท่วม | `tests/rigid-recovery.test.ts:84` | S | — |
| TQ-10 | P3 | ช่องว่าง | ผลเครื่องมือ WebMCP เป็น `unknown` → เทสต์ใช้ `as any` 64 ครั้ง | `src/mcp.ts:184` | M | — |
| TQ-11 | P3 | ช่องว่าง | vite.config.ts (PWA plugin) และ scripts/*.ts (รีเฟรช snapshot รายวัน) ไม่เคย type-check | `tsconfig.json:17` | S | R02 |
| TQ-12 | P3 | ช่องว่าง | ไดเรกทอรีเทสต์แบน 172 ไฟล์ timeout 20–900 s ไม่มีชุด fast-feedback | `vite.config.ts:62` | M | — |

**รายละเอียดข้อที่สำคัญ**

- **TQ-05** — ทางแก้ที่ผู้ตรวจเสนอและคณะวางแผนรับ (ENG-K03): (1) ย้ายเทสต์ six-DOF ทั้งภารกิจไป tests/heavy โดยคง guard 160 s ในชั้น default ตามที่ rigid-flex-golden ทำอยู่; (2) `paths-ignore: ['docs/**', '**/*.md']` บน CI และ deploy ข้าม `npm test` เมื่อ schedule; (3) `timeout-minutes` บน test job; (4) shard 3 ทาง — เป้า CI ของ PR ≤12 นาที
- **TQ-01** — เสนอ golden สองชั้น: fixture แบบ tolerance ([t, r, v, q] ทุก 10 s + event [key, t] ใน `tests/fixtures/goldens/<case>.json` เทียบ position ≤1e-3 m, velocity ≤1e-6 m/s, event ≤1e-6 s) + hash เดิมเป็น canary ที่ระบุเครื่องที่บันทึก — ตรงกับผลตัดสิน D-4 ของแผน (hash เป็น gate บน Node ที่ปัก, tolerance เป็น oracle ของ T02)
- **TQ-03/TQ-04** — happy-dom เป็น devDependency + ชั้น `tests/ui/` (`// @vitest-environment happy-dom`) + `tests/dom-harness.ts` แทน stub 13 ชุด; เป้าแรกตามความเสี่ยง: SetupPanel.render + applyLanguage, Hud, Timeline, TelemetryPanel, LoopInspector/LoopTuning, lesson-mode; และ fake-Worker harness (MessageChannel, hook ให้ล้มตอนสร้าง/หน่วง/สลับลำดับ/ยืนยัน terminate) สำหรับ job ทั้งห้า — การตัดสิน D-18 ของแผน
- **TQ-07/TQ-11** — `knip` + Biome หรือ typescript-eslint recommended ใน CI ก่อน `npm test`; `tsconfig.node.json` สำหรับ vite.config.ts, scripts/**; smoke test ของ refresh-snapshots กับ fixture response

## 11. เว็บสด, GitHub Actions และ PR ที่เปิดอยู่ (#41, #38, #36)

**ยืนยันแล้ว** — เว็บสดคือ main 404eb0c เป๊ะ: `index.html` ที่ serve (13,889 B, 2026-09-29 23:38:52 GMT) byte-identical กับ `dist/index.html` ที่ build ในเครื่อง และอ้าง chunk เดียวกัน (index 2,484,344 B; i18n 1,145,154 B; css 139,377 B) → build ทำซ้ำได้; snapshot ทั้งสามถูกดึงโดย deploy เองที่ 23:31:26Z; header เป็นค่าเริ่มต้นของ GitHub Pages (max-age=600, HSTS, gzip เท่านั้น, ไม่มี CSP); social preview 1200×630 มี; PWA plumbing ถูก (manifest, sw.js versioned precache 46 entry, Range 206/416, skip-waiting, ตรวจอัปเดตรายชั่วโมง); CI เขียวบน head ของทั้งสาม PR

**ข้อค้นพบ**

| รหัส | ระดับ | ชนิด | เรื่อง | ไฟล์ | งาน |
|---|---|---|---|---|---|
| LS-01 | P2 | ความเสี่ยง | **การ re-run deploy run เก่าจะ publish commit เก่าทับเว็บสด** — เกิดจริง 29 ก.ย.: run 41 attempt 3 (7716799 = merge #33) deploy 20:55Z แล้ว run 44 attempt 2 (f7c7aea = merge #27 ก่อน #40) deploy 21:56Z → เว็บสดถอยไปไม่มีส่วน Build 2 ชม. 44 น. จน run 47 ที่ 23:38Z; deploy.yml ไม่มีการ์ดว่า `github.sha` ยังเป็นปลาย main | `.github/workflows/deploy.yml:65` | S |
| LS-02 | P2 | ช่องว่าง | การเข้าครั้งแรกดาวน์โหลด ~16 MB: หน้า 1.07 MiB gzip + precache 15.35 MiB เริ่มตอนโหลดหน้า ไม่มี data-saver/การเลื่อน (= INF-05) | `src/main.ts:784` | M |
| PR36-01 | P2 | ช่องว่าง | PR #36 ยังเป็น draft, mergeable_state dirty, ตามหลัง 54 commit, ค้างผล heavy/six-DOF-fleet ที่สัญญาไว้ในตัว PR, conflict เฉพาะ PHYSICS.md:2811; commit ก่อนหน้า (6a3fa2d) ล้ม rigid-flex golden ของ angaraa5 แล้วแก้ด้วยการบันทึกใหม่ | `docs/PHYSICS.md:2811` | S |
| PR38-01 | P2 | ช่องว่าง | PR #38 ไม่มีคำบรรยาย ไม่มีรีวิว, conflict กับ main ใน IMPLEMENTATION-STATUS (2 hunk) และหลัง #41 ลงจะ conflict ใน `src/render/scene.ts:366` (#41: `buildStarField(4e8, pixelRatio)`; #38: `buildMoon()` + `buildStarField()`); browser-smoke ไม่เคยรันบน head; bundle delta เทียบ main วัดไม่ได้เพราะ base เก่ากว่า #40 | `src/render/scene.ts:366` | M |
| PR38-02 | P2 | เอกสารล้าสมัย | roadmap Phase 5 (L01–L05) ยังอ่านเป็น greenfield แม้ #38 ทำ ephemeris (DE441 ก.ค. 1969), lunar gravity degree 2, TLI/LOI, powered descent, lunar-return entry สำหรับ Apollo 11 แล้ว (~2,046 บรรทัด apollo*.ts + lunar/*) — ต้อง re-scope Phase 5 เป็น "generalise #38" | `docs/ROADMAP-PART2-3.md:177` | L |
| LS-03 | P3 | ช่องว่าง | ไม่มี `public/404.html`: ลิงก์แบบ path (`/Orbitlab/orbit/engineer`) และคำผิดเจอหน้า 404 ของ GitHub | `public` | S |
| LS-04 | P3 | ช่องว่าง | landmark ของหน้าแอป: ไม่มี h1, ไม่มี skip link, ไม่มี noscript; `lang="en"` จนกว่า JS จะรัน | `index.html:2` | S |
| LS-05 | P3 | ความเสี่ยง | ไม่มี CSP (= INF-13) | `index.html:3` | S |
| LS-06 | P3 | ความเสี่ยง | รีเฟรชข้อมูลรายวันลงจริง ~10:00 UTC (17:00 ไทย) → ระหว่างเวลาเรียนไทย snapshot เก่าได้ถึง ~29 ชม.; cron อยู่ในช่วงแออัด (ช้า 6h38m/6h39m) — ควรย้ายเป็นนาทีคี่ที่เงียบ เช่น `43 17 * * *` UTC (00:43 ไทย) | `.github/workflows/deploy.yml:9` | S |
| CI-01 | P3 | ความเสี่ยง | browser-smoke มี `if: github.event_name == 'pull_request'` จึง "skipped" บน head ของ #36/#38 ที่มีเฉพาะ push run | `.github/workflows/ci.yml:23` | S |
| PR41-01 | P3 | ความเสี่ยง | สรุป #41 ในมุม repo: 526 ไฟล์ +118,908, packet 20 MB (447 ไฟล์) + zip, workflow 3 ไฟล์ผูก branch, IMPLEMENTATION-STATUS:186 ยังบอก 2,532 เทสต์/175 ไฟล์ ขณะ CI ของ #41 พิมพ์ 9,259/191 (รายละเอียดใน PR41-CODEX-REVIEW-TH.md) | `docs/IMPLEMENTATION-STATUS.md:186` | S |

**ลำดับ merge ที่แนะนำ (ยืนยันจากสามแหล่ง: รีวิว #41, ผู้ตรวจ PR สด, คณะวางแผน)**: **#41 → #36 → #38**

1. **#41** หลัง R1–R5 (ดูรีวิว): merge-tree กับ main สะอาด; นำ 17 ไฟล์เทสต์ regression ใหม่ที่มีค่าจริง (kepler-boundary, lambert-boundary, progress-storage-recovery, monte-carlo-job-failures, docx-pagination, worksheet-language, sky-import, render-stars-regression …); แนะนำ squash-merge ถ้า packet ไม่ถูกถอดก่อน เพื่อไม่ให้ blob 447 ไฟล์เข้า history ของ main
2. **#36**: ขอผู้เขียน merge main + แก้ hunk PHYSICS.md (คงถ้อยคำ main + ประโยค `sepAfterIgnition` ของ F14), รัน `test:heavy` และ `test:sixdof-fleet` บน head ที่ merge แล้วและวางผลใน PR, แก้ "68 rows" → 71 ใน VALIDATION §4, แล้ว un-draft; โค้ดแตะแค่ไฟล์ฟิสิกส์และ merge สะอาดกับทั้ง #41 และ #38 — แต่ **ต้องบันทึก golden/fingerprint ใหม่บน main** เพราะของ branch บันทึกก่อน F11/F12/D03 (PHY-18)
3. **#38**: ขอผู้เขียนเขียนคำบรรยาย (6a–6g เพิ่มอะไร, การ reconcile id, จำนวนเทสต์, bundle delta เทียบ main), merge main *หลัง* #41 และแก้ scene.ts (เรียก `buildStarField(4e8, pixelRatio)` และคง `buildMoon`) + 2 hunk ของ status doc, ให้มี pull_request-event run เพื่อ browser-smoke รัน, รัน test:heavy (เทสต์ heavy ใหม่ของมัน) + journeys 4 เส้นทาง, รายงานการโตของ index/i18n เทียบ 2,484/1,145 kB, ยืนยัน parity EN/TH/RU ของคีย์ใหม่; **เพิ่มเทสต์ยึด Apollo 11 (TLI Δv, เวลาถึง perilune, entry peak g) กับ MSC-00171 ก่อน merge** (คณะวางแผน 3)

**สำหรับ roadmap**: หลัง #38 ทำเครื่องหมาย L01–L05 "ทำบางส่วนโดย #38 (Apollo 11 เท่านั้น)" และ re-scope Phase 5: L01 = ขยาย `ephemeris-1969` เป็นอนุกรม Meeus/DE440 ทั่วไปหลัง API `lunar/ephemeris.ts` เดียวกัน; L02 = ย้าย `lunar/gravity.ts` + `cislunar.ts` เข้า Orbit propagator พร้อม SOI switching; L03 = `tli-guidance.ts` เป็น planner ทุกยาน/ทุกวันที่ + free-return + phasing แบบ Chandrayaan; L04/L05 = parametrise `apollo-descent`/`apollo-entry` สำหรับ lander อื่น + skip entry

## 12. ผลการยืนยันแบบโต้แย้งของข้อค้นพบ P1/P2

ข้อค้นพบชนิด defect/risk ระดับ P1/P2 ถูกส่งให้ผู้ยืนยันสองคนต่อข้อ (มุม "ทำซ้ำให้เกิด" และมุม "มีอะไรกันไว้อยู่แล้วหรือไม่ / ความรุนแรงจริงสำหรับผู้ชม") โดยตั้งต้นให้หักล้าง ข้อที่เป็นคำอ้างเดียวกันในสามพื้นที่ (A17: LUI-02 = PHY-06 = TQ-13) ยืนยันครั้งเดียวในชื่อ LUI-02 รวม 15 ข้อ 30 ผู้ยืนยัน **ไม่มีข้อใดถูกหักล้าง**; 3 ข้อถูกลดเป็น P3 โดยผู้ยืนยันทั้งสอง (INF-01, PHY-02, I18N-04), 4 ข้อผู้ยืนยันเห็นต่างเรื่องระดับ (B-01, B-02, PHY-01 และ TQ-05 ซึ่งผู้ยืนยันคนที่สองวัดหลัง PR #44 merge) และ 4 ข้อถูกแก้รายละเอียดหรือขยายให้กว้างกว่าที่ผู้ตรวจรายงาน (I18N-02, LES-05, ORB-03, TQ-05) ตารางนับในส่วน 1 คงระดับที่ผู้ตรวจพื้นที่ให้ไว้

| ข้อ | ผู้ตรวจ | ผู้ยืนยัน 1 | ผู้ยืนยัน 2 | ผลสุดท้าย | สิ่งที่ผู้ยืนยันเพิ่ม/แก้ |
|---|---|---|---|---|---|
| **B-01** design-store ลบเรกคอร์ดที่อ่านไม่ได้ | P1 | ยืน **P1** | ยืน P2 | **P1/P2 — ข้อมูลหายจริง** | ทำซ้ำได้ด้วยโพรบ; store เป็นค่าเริ่มต้นของ UI ทั้งสอง (engineer-level.ts:121, explore-store.ts:57) การ save/delete จริงของผู้ใช้จึงกระตุ้น; main ไม่ตรวจ `version` ที่เก็บ store ที่เขียนโดยเวอร์ชันใหม่ถูกเขียนทับเป็น version 1; ขัดทั้งคอมเมนต์คลาสและสัญญาใน ROADMAP:240-243 ("rejects a save it cannot keep rather than losing someone's work"); ไม่มีการ์ด/คำเตือน/bulk-export ใดกัน — **#41 แก้ตรงจุด** |
| **B-02** ไฟล์เวอร์ชันใหม่ถูกปฏิเสธทั้งไฟล์ | P2 | ยืน P3 | ยืน P2 | **P2/P3 ยืน** | กลไกตรงตามอ้าง: `Checker.known()` (vehicle-spec.ts:67-69) รายงานทุกคีย์นอก FIELDS; ยอมรับเฉพาะคีย์เกินระดับเอกสาร (นอก `design`); ไม่มีอะไรใน main/#41/#36/#38 เปลี่ยน (diff ของ #41 แตะแค่ read/write raw) ผู้ยืนยัน 1 ให้ P3 เพราะยังไม่มีเวอร์ชันใหม่จริงที่จะเขียนไฟล์แบบนั้น = ความเสี่ยงล่วงหน้า |
| **B-03** rating หมดเวลาแสดงเป็น "nothing" | P2 | ยืน P2 | ยืน P2 | **P2 ยืน** | `converged`/`stoppedBy` ไม่ถูกอ่านที่ใดนอก ratings.ts (grep ทั้ง src); worker และ fallback เรียกด้วยค่าเริ่มต้น 8,000 ms/40 เที่ยว; explore-model.ts:442-445 ใส่ 0 เข้า spec เป็น 'computed' |
| **INF-01** worker ออกแบบฝัง i18n สามภาษา | P2 | ยืน **P3** | ยืน **P3** | **ลดเป็น P3** | ตัวเลขตรงถึงกิโลไบต์และ chain import ตรง (`verdict.ts:26` → i18n → en/ru/th); ข้อความที่ worker สร้างใช้ไม่ได้จริง (ไม่เคย setLang); ลดเป็น P3 เพราะเป็นประสิทธิภาพ/น้ำหนัก ไม่ใช่ผลผิด — ยังคุ้มทำ (ENG-K14) |
| **I18N-02** "No air" บนแท่นปล่อย | P2 | ยืน P2 | ยืน P2 | **P2 ยืน — สาเหตุกว้างกว่า** | ทำซ้ำด้วยโพรบ Simulation+captureFrame+equations(): บนแท่น แถว dynamic pressure บอก rho = 1.22 kg/m³ (six-DOF: q = 54 Pa จากลมข้าง 9.4 m/s) ขณะแถว drag บนแผงเดียวกันบอก "No air"; เกิดหลังลงจอดจาก pad-abort ด้วย; **สาเหตุจริงไม่ใช่แค่ถ้อยคำ**: EomRecord ถูกเขียนเฉพาะใน `Simulation.stepFlight` (simulation.ts:1026) ขณะ `step()` ล้าง `s.eom` ทุก step (:673) และ stepPrelaunch/stepLanded/escape ไม่เขียน → แก้ต้องเขียน eom ในเฟสเหล่านั้นหรือแยกคีย์ตามที่แผน S5 ระบุ |
| **LES-05** ศัพท์ไทย guidance/navigation ชน | P2 | ยืน P2 | ยืน P2 | **P2 ยืน — กว้างกว่าที่รายงาน** | cross-tab ทุกคีย์: อังกฤษ "guidance" ถูกแปลด้วยสามก้าน (นำวิถี 9 คีย์, นำร่อง 13, นำทาง 9), "navigation" สองก้าน (นำทาง 9, นำร่อง 9), "autopilot" = นำร่อง (5) → **นำร่อง คำเดียวหมายถึง guidance + navigation + autopilot**; สองระบบศัพท์อยู่ร่วมกัน: A (guidance = การนำวิถี, navigation = การนำทาง) ใน UI หลัก/HUD/help/คลังคำถาม กับ B (guidance = การนำทาง, navigation = การนำร่อง) ใน 12 คีย์ G01/G02 และบท 2.3; กรณีแย่สุด: placement test สอนนักเรียนตรง ๆ ว่า "การนำทาง = ฉันอยู่ไหน, การนำวิถี = ชี้ไปไหน" (bank/guidance.ts:23) ซึ่งขัดกับป้าย Engineer — D5 ต้องเลือกระบบเดียวและกวาดทั้งสองฝั่ง |
| **LUI-01** "Use for the next launch" ขณะหยุดชั่วคราวทำลายเที่ยวบิน | P2 | ยืน P2 | ยืน P2 | **P2 ยืน** | ทั้งสองคน *ทำซ้ำได้จริงบน production build ใน headless Chromium* ผ่าน harness ของ repo; `toggleLiveFlight` ตั้ง `playing=false` แต่คงแผง `running` จึงมีเพียงการ์ด `!this.playing` ที่ผ่าน; `preview()` เรียก `session.dispose()` และรีเซ็ต timeline/บรรยาย/HUD |
| **LUI-02** A17 Auto Tune บนเธรดหลัก (= PHY-06 = TQ-13) | P2 | ยืน P2 | ยืน P2 | **P2 ยืน — วัดต้นทุนแล้ว** | วัดที่ขนาดจริง: Falcon 9 six-DOF ทำ linearise ทุก 0.5 s → 941 โมเดล / 1,874 กรณี pitch-yaw; `autoTune` ที่ loop-tuning.ts:187 ใช้ **1,076–1,161 ms** เย็น (488–506 ms อุ่น) บล็อกเธรดหลัก บนเครื่อง 4 core ที่เร็ว — แท็บเล็ตช้ากว่า 3–4× จะค้าง 3–5 s; ไม่มี AbortController/progress/cancel/run id/worker; `src/physics` ไม่มี attitude-tune-job |
| **LUI-05** error ของ worker/preview ถูกกลืน | P2 | ยืน P2 | ยืน P2 | **P2 ยืน** | handler ทั้งสองตรงตามที่อ้าง ไม่มี i18n key ใดสำหรับ worker error/flight stopped/fallback (grep ทั้งสาม dictionary); ทำซ้ำเส้นทาง in-flight ด้วยโพรบ: ผลที่ผู้ใช้เห็นคือ glyph เล่นกลับด้านและแถบบรรยายบอก "PAUSED" (narration.ts:152) |
| **ORB-03** คาบบนการ์ด Hohmann ไม่รีเฟรช | P2 | ยืน P2 | ยืน P2 | **P2 ยืน — แก้รายละเอียด** | call graph ตรงตามอ้างและโพรบ DOM-free ยืนยัน; **แก้**: ค่าที่ค้างไม่ใช่คาบ LEO (1 ชม. 35 น.) แต่เป็น **คาบของวงรี transfer (10 ชม. 37 น.)** เพราะ `hohmann()` วาง burn แรกที่ t=0 จึง `flownAt(0)` คืน index 1 ตอนวาดการ์ด; หลัง burn ที่สองที่ 19,107 s (31.8 s บนจอที่ 600×) ดาวเทียมอยู่บนวงกลม 35,786 km แต่การ์ดยังบอก 10 ชม. 37 น. — ไม่ทำให้ข้อค้นพบอ่อนลง |
| **PHY-01** Soyuz-2.1a six-DOF ปลด pitch แล้ว α ถึง 11.7° | P2 | ยืน P2 | ยืน **P3** | **P2/P3 — ยืน แต่ระดับแยก** | ทำซ้ำได้ตรงทุกตัวเลขทั้ง standard/IGM/PEG (peak 3.02 °/s ที่ T+91.8, α สูงสุด 11.70° ที่ T+128.5, `aeroEnvelopeExceeded` warn ที่ T+123.5 บน Blok A, insertion 200×198 km ที่ T+533); ผู้ยืนยัน 2 ให้ P3 เพราะ pitch-down ถูกบันทึกเป็น experimental แล้วสามแห่ง (IMPLEMENTATION-STATUS:171-175, PHYSICS, SIXDOF-ACCEPTANCE) และเที่ยวบินยังเข้าวงโคจร — สิ่งที่ *ไม่มี* คือเทสต์กัน (ควรเพิ่มตาม PHY-PH03) |
| **PHY-02** Angara/Proton LEO ระเบิดจาก q-placard ถูกจัดเป็น "beyond capability" | P2 | ยืน **P3** | ยืน **P3** | **ลดเป็น P3 — การ "จัดผิด" ไม่รอด แต่ข้อเท็จจริงรอด** | ตัวเลขทำซ้ำได้ (Angara T+179 s q=46 kPa เหลือ 8,251 m/s; Proton Briz-M จุด T+576 ระเบิด T+1038 เหลือ 2,554 m/s); โพรบไม่มี Briz-M ของผู้ยืนยัน 1 *เสริม* ประเด็นแกน (stack ที่ไม่มี Briz-M ทำได้ตามที่ตีพิมพ์); แต่ผู้ยืนยัน 2 ชี้ว่าแถวเข้ากฎ BEYOND_CAPABILITY ที่โครงการนิยามและบังคับด้วยเทสต์ (ascent-stage margin < +150 m/s: วัด −735 / −548 m/s) ขณะที่ ARCHITECTURE นิยามว่า "ไม่มี restart ไม่มี kick stage" จึงรับ stack ที่มี Briz-M ไม่ได้ และเหตุผลที่ผู้ตรวจอยากให้ระบุ *มีอยู่แล้ว* พร้อมตัวเลขใน fleet-harness.ts:356-358 และ PHYSICS.md → งานที่เหลือคือ **configuration สามขั้นไม่มี Briz-M สำหรับอ้างอิง LEO** (ทางเลือก ก) ไม่ใช่การย้ายแถว |
| **I18N-03** D5 ยังไม่ใช้ (การนำทาง แทน guidance) | P2 | ยืน P2 | ยืน P2 | **P2 ยืน** | D5 มีจริงและเป็นทางการ (PLAN-2026-09-28:60, DECISIONS.md) แต่ *ไม่มี commit ใดใน `git log --all` ใช้มัน*: th.ts 12 คีย์, ไม่มี assertion ศัพท์ไทยใน i18n.test (ผ่าน 16/16 ทั้งที่มีทุกสตริง), glossary มีแค่ 'closed-loop guidance'; #41/#36/#38 เปลี่ยน 0 บรรทัดที่มี การนำทาง; ผู้ยืนยัน 1 เพิ่มว่า "การนำทาง" ยังหมายถึง guidance ในสำเนา… (แผน session 3 = CTX-QW-4) |
| **I18N-04** stage = ท่อน (UI) vs ขั้น (บทเรียน) | P2 | ยืน **P3** | ยืน **P3** | **ลดเป็น P3 — ยืนแต่เป็นงานขัดเกลา** | นับซ้ำได้เป๊ะ (บทเรียน 117 ขั้น vs 15 ท่อน; คลัง 71 vs 4; th.ts ป้ายทุกแผง/event ใช้ ท่อน); **แก้กรอบ**: ไม่ใช่ "UI = ท่อน, บทเรียน = ขั้น" อย่างสะอาด — th.ts เองมี ~48 สตริงที่ใช้ ขั้น ในความหมาย stage (setup.explicit.*, ws.fq.*, phase.detail.rv.separation, watch.say.stagingFailure, vehicle.sputnik8k71ps.notes) การกวาดต้องครอบ th.ts ด้วย; #41 ทำให้คลังผสมกันมากขึ้น (เพิ่มข้อความใหม่ด้วย ท่อน ข้าง ขั้น เดิม); ไม่มีเทสต์ใดกัน; ลดเป็น P3 เพราะเป็นศัพท์ ไม่ใช่ผลผิด |
| **TQ-05** suite 25.5 นาที รันสองครั้งต่อการเปลี่ยน long pole คือภารกิจ six-DOF ทั้งเที่ยว | P2 | ยืน P2 | ยืน **P3** (วัดหลัง #44 merge) | **ยืน — ลดเป็น P3 หลัง #44 merge; แก้รายชื่อไฟล์** | ตัวเลข CI ตรง (25 น. 26 วิ บน commit ที่แก้แค่ docs; deploy 32 น. 53 วิ); **แก้รายชื่อ long pole** จาก log ต่อไฟล์: 13 ไฟล์ ≥60 s = 84 % ของ 4,277 file-seconds และสองอันดับแรก *ไม่อยู่ในรายการของผู้ตรวจ*: `tests/watch-missions.test.ts` **808.8 s** (บิน 20 ภารกิจ viewer ด้วย `defaultDynamics()` = six-DOF ทุกยานที่รองรับ, timeout 900 s) และ `tests/rigid-sensitivity.test.ts` 512.5 s (67 variant), ตามด้วย rigid-mission-convergence 471.5, rigid-recovery 305.5, custom-vehicle-soyuz-sixdof 257.7, ballistic 255.0, rigid-simulation 214.0, rigid-return 183.7, custom-vehicle-falcon9-sixdof 153.8; rigid-fleet ที่ผู้ตรวจอ้างใช้แค่ 46 s; **สถานะหลัง #44 merge** (13:33 UTC): ข้อเสนอ (2)(3)(4) ลงแล้ว — shard 3 ทาง วัดรอบแรก shard 1 = 4 น. 39 วิ, shard 2 = 6 น. 3 วิ, **shard 3 = 13 น. 28 วิ** (watch-missions 621 s + rigid-recovery 298 s + ballistic 280 s + rigid-return 165 s) ยังเบ้และเข้าใกล้ timeout 20 นาที; ที่ยังเปิด: (1) ย้ายไฟล์ six-DOF ทั้งภารกิจไป tests/heavy โดยคง guard 160 s (vite.config.ts `exclude` ยังไม่เปลี่ยน) และ deploy บน push ยังรัน suite เต็มไม่แบ่ง shard; **ผู้ยืนยัน 2 (วัดหลัง #44)**: ทำซ้ำการแบ่ง shard ของ vitest (เรียงตาม sha1) ได้ตรง: shard 3 ของ run 36720144010 ใช้ 806.78 s (watch-missions คนเดียว 620.9 s) เทียบ timeout 20 นาที = ส่วนเผื่อ 1.49× ขณะที่ runner แกว่ง ~2× (suite เดียวกัน 12.4 vs 25.4 นาที; shard 1 ของ sha เดียวกัน 4 น. 39 วิ vs 9 น. 37 วิ) จึงมีโอกาส timeout ปลอมบน runner ช้าแม้ยังไม่เคยเห็น (job shard ทั้ง 6 เขียว); เกณฑ์รับของแผน "CI ของ PR ≤12 นาที 5 PR ติดกัน" ยังก้ำกึ่ง (9.8 และ 13.7 นาที); deploy ของ f4963ca ยังรัน `npm test` เต็มไม่แบ่ง shard บน push ไป main (มี concurrency cancel-in-progress ช่วย); heavy.yml ยังมี 0 run (cron แรกวันอาทิตย์) งบ 60 นาทีของ job heavy ยังไม่เคยทดสอบบน runner ของ GitHub; ลดเป็น P3 เพราะเหลือแต่ต้นทุนรอบพัฒนาของเจ้าของ ไม่กระทบผู้ใช้หรือข้อมูล; งานที่แนะนำ (S, P3): ย้ายเที่ยวบิน six-DOF ของ watch-missions, rigid-sensitivity และไฟล์ six-DOF ทั้งภารกิจ 5 ไฟล์ไป tests/heavy โดยคง guard 160 s แบบ rigid-flex-golden หรืออย่างน้อยแยก watch-missions ตามยานให้ไม่มีไฟล์ใดเกิน ~5 นาที; ข้าม `npm test` ใน deploy เมื่อ sha นั้นผ่าน CI แล้ว; รัน heavy.yml ด้วย workflow_dispatch หนึ่งครั้งเพื่อยืนยันงบ 60 นาที |

หมายเหตุความสอดคล้องข้ามพื้นที่: หลายข้อถูกพบอิสระโดยผู้ตรวจมากกว่าหนึ่งคนซึ่งเป็นการยืนยันแบบอ่อนในตัว — A17 (LUI-02 = PHY-06 = TQ-13), worker ออกแบบฝัง i18n (B-10 = INF-01), CI ช้า (INF-11 = TQ-05), fingerprint เปราะ (PHY-15 = TQ-01), ศัพท์ไทย (LES-05 = I18N-03), LICENSE (INF-09 = DOC-07), PDPA (INF-15 = DOC-08), CSP (INF-13 = LS-05), Node ใน README (INF-07 = DOC-15), journeys (LUI-06 = ORB-10 = B-04 = LES-12 = TQ-02), precache (INF-05 = LS-02)

## 13. งานตามแผนและ roadmap ที่ยังไม่เริ่ม (สรุปจาก STATUS-INVENTORY)

รายการนี้คือ "งานที่ยังเหลือ" ในความหมายของแผนที่เขียนไว้แล้ว ไม่ใช่ข้อบกพร่องใหม่ รายละเอียดอยู่ใน STATUS-INVENTORY-TH.md §3–§4

| กลุ่ม | รายการ | สถานะ | เชื่อมกับข้อค้นพบ |
|---|---|---|---|
| แผน 28 ก.ย. Wave 2 | S7 ส่วนที่เหลือ (A17 attitude Auto Tune ใน worker; A18 แก้ใน #41) | ยังไม่ทำ | LUI-02, PHY-06, LUI-05, LUI-07 |
| แผน 28 ก.ย. Wave 2 | S4c หลักฐาน Monte Carlo ของบท 2.4 | ยังไม่ทำ (TODO ในโค้ด) | LES-01 |
| แผน 28 ก.ย. Wave 2 | S5 ส่วนที่เหลือ: build stamp, glossary/ศัพท์ไทย, สำเนาที่ค้าง (`use.thai.nominal`, apps.thaiId) | ยังไม่ทำ | INF-08, LES-05, LES-06, ORB-07 |
| แผน 28 ก.ย. Wave 2 | S8 มือถือ: ชื่อระดับ/ส่วนที่ซ่อนต่ำกว่า 480 px, ตัวอักษรไทย, แถบแท็บ | ยังไม่ทำ | (ส่วน 8) |
| แผน 28 ก.ย. Wave 3 | S9 ทดสอบผู้ใช้จริง 5–6 คน (ประตูของ S11/S12/S16) | ยังไม่ทำ | — |
| แผน 28 ก.ย. Wave 3 | S10 journeys 10 เส้นทาง (ปัจจุบัน 4) | ยังไม่ทำ | LUI-06, ORB-10, B-04, LES-12, INF-18 |
| แผน 28 ก.ย. Wave 3 | S11 debrief วินิจฉัยสาเหตุ + ปุ่มกระโดด (I3/I6) | ยังไม่ทำ | LUI-03, LUI-04, LES-09 |
| แผน 28 ก.ย. Wave 3 | S12 สมุดทดลอง (notebook) | ยังไม่ทำ | LES-10 |
| แผน 28 ก.ย. Wave 3 | S13 challenges ไทย (X01) | ยังไม่ทำ | ORB-11 |
| แผน 28 ก.ย. Wave 3 | S15 นำเข้า/กู้คืนผลลัพธ์สำหรับห้องเรียน | ยังไม่ทำ | LES-02, INF-15, ORB-09 |
| แผน 28 ก.ย. Wave 3 | S16 เส้นทางแรกเข้าต่อกลุ่มผู้ใช้ | รอผล S9 | LUI-09, ORB-04, B-18 |
| Roadmap Phase 4 | D06 ผู้สร้างดาวเทียม, D07 ระบบย่อย | ยังไม่เริ่ม (ต้องขยาย plumbing 5 จุดก่อน) | B-05 |
| Roadmap Phase 4 | T01 แต่งบทเรียน, T02 บินซ้ำตรวจไฟล์นักเรียน, T03 แพ็กหลักสูตร | ยังไม่เริ่ม | LES-13, LES-03, LES-08 |
| Roadmap Phase 5 | L01–L05 ดวงจันทร์ (PR #38 ทับซ้อน L01/L03/L05 บางส่วน) | ยังไม่เริ่ม | PHY-14, PHY-22 |
| Roadmap Phase 6 | X01 challenges, X02 campaign | ยังไม่เริ่ม | ORB-11 |
| PR ที่เปิด | #41 (Codex) ต้องแก้ R1–R5 ก่อน merge; #36 ต้อง rebase + heavy runs; #38 ต้องตัดสินว่าเป็น C01 content หรือ Phase 5 | เปิดอยู่ | PHY-18, B-01 |
