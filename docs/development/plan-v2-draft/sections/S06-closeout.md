## S06 คลื่น CO: ปิดงาน R2 บันทึกการส่งมอบ R3 และตั้งหลักฐานฐาน

> **ขอบเขต:** คลื่นแรก (K0) ของแผน v2.0 เขียนให้ลงมือได้ทันทีเมื่อเจ้าของอนุญาตตาม D-65 (ดู S08) ส่วนนี้เป็นบ้านของ 22 รายการใน 8 แพ็กเกจ CO-1…CO-8 เกณฑ์ประตู GCO, G2 และ "R2 complete" อยู่ใน S05 §05.4 เท่านั้น ที่นี่บอกเพียงว่าแพ็กเกจใดส่งหลักฐานข้อใด (§06.4) นิยาม KPI อยู่ใน S04 เนื้อหาการตัดสินใจอยู่ใน S08 รายการห้ามทำอยู่ใน S02 §02.13 lane, write set และ I-train อยู่ใน S18
> **ประมาณการรวม (หยาบ, `packages.tsv`):** 26 agent-days, ~21 PR ทุกแพ็กเกจ `execution_authorized: false` ถ้าเจ้าของยังไม่ตอบ งานรอ ไม่มี agent ตัดสินแทน
> **as-of (ตรงกับ S00 §00.1):** ตรวจแบบอ่านอย่างเดียวถึง **2026-10-04 ~21:10Z** — main บน GitHub = `5f9aa2e` (#83 เอกสาร, merge 20:31:34Z); live = `09cc2f5` (#82; Pages 37230585947 สำเร็จ 20:29:40Z เผยแพร่ #80–#82 พร้อมกัน); ไม่มี PR เปิด; R3 ครบตามคำของเจ้าของ (2026-10-04) การอ้างบรรทัดในโค้ดใช้รูป `<sha>:ไฟล์:บรรทัด` การอ้าง `7662ead` ในส่วนนี้ยังใช้ได้ เพราะโค้ดต่างจาก `5f9aa2e` เฉพาะ `src/main.ts` (+15 บรรทัดจาก #81; shift map ใน S00 §00.1) และ `tests/browser/harness.mjs` ค่าในส่วนนี้ re-baseline บน `5f9aa2e` ตารางตัวตนของรุ่น #71–#83 อยู่ใน S03 §03.1
> **ประวัติการเผยแพร่ (สรุป):** Pages 37219398466 (`7662ead`) และ 37223857005 (`77d3c00`) ล้มที่ journey `learner-profiles` (timeout 120 s รอ `#loading.hidden` หลัง reload; budget ผ่าน) แล้ว Pages 37230585947 (`09cc2f5`) ผ่านทุกด่านและเผยแพร่ #80–#82 สาเหตุของ stall ยังไม่ทราบ (R7.1 M-PLATFORM-061) ผลต่อคลื่นนี้อยู่ใน CO-1 (ขั้น 4), CO-2 และ CO-6

### 06.0 รายการที่ส่วนนี้เป็นบ้าน (22 รายการ, `assignment.tsv`)

| แพ็กเกจ | รายการ (P, ชนิดใน ledger) | เลน |
|---|---|---|
| CO-1 | M-PLATFORM-063 (P0, bug) | T + I (H อนุมัติ) |
| CO-2 | M-PLAN-017 (P0, process), M-PLATFORM-064 (P0, process) (M-LAUNCH-021 ปิดแล้วใน refresh 2026-10-04 → DELIVERED, S03 §03.2) | I (W) |
| CO-3 | M-LAUNCH-017 (P2, decision), M-LAUNCH-018 (P0, decision), M-LAUNCH-019 (P1, test) | H + I (Q ถ่ายภาพ) |
| CO-4 | M-LAUNCH-027 (P0, bug), 008 (P1, bug), 011 (P1, bug), 025 (P1, bug), 032 (P1, bug), 004 (P1, feature), 022 (P1, perf-identical), 066 (P2, bug), 006 (P3, ux), 026 (P3, quality); M-PLATFORM-037 (P2, perf) | I/U (P ตรวจ 032) |
| CO-5 | M-LAUNCH-020 (P1, test) | Q + T |
| CO-6 | M-PHYSICS-001 (P0, test) | P + Q |
| CO-7 | M-LEARNING-054 (P0, decision) | H แล้ว L-C |
| CO-8 | M-PLATFORM-075 (P2, docs), M-PLATFORM-077 (P2, process) | I (W ร่าง) |

**Day 0 — ก่อนวันที่ 1 (เมื่อเจ้าของสั่งเริ่ม K0 ซึ่งเป็นคำตอบส่วนแรกของ D-65):**
- บันทึกคำสั่งของเจ้าของตรงตัวพร้อมวันที่ใน envelope ของแต่ละแพ็กเกจ (D-65)
- ตรวจด้วย `gh api` แบบอ่านอย่างเดียว: main tip (`5f9aa2e` ณ as-of), PR ที่เปิดอยู่ (ณ ~21:10Z ไม่มี) และ run ล่าสุด (Pages 37230585947 สำเร็จที่ `09cc2f5`)
- ตรึง SHA ของ CO-6 แล้ว dispatch `heavy.yml` `suite=both` (CO-6) ส่วน perf ใช้ PB@5f9aa2e ที่วัดแล้ว (S04 §04.1 ข้อ 9)
- จัดช่อง WIP ตาม §06.2: I ได้ 1 ช่อง และรวมทั้งโครงการไม่เกิน 5 PR
- งานใดในคลื่นนี้ที่ยังไม่ได้รับอนุญาตให้รอ

### 06.1 ทำไมต้องปิดงานก่อน: เปลี่ยน "R2 ใกล้เสร็จ" ให้เป็นรายการที่ตรวจได้

R2 merge และ live แล้ว (#74 `da67341`, CI 37168554643, Pages 37169459230) แต่ยังมีเจ็ดเงื่อนไขที่ทำให้ยังเรียกว่าเสร็จไม่ได้ ทุกงานในคลื่นถัดไปที่แตะไฟล์เดียวกัน (`main.ts`, `panel.ts`, `telemetry.ts`, i18n) จะต้องทำงานซ้ำถ้าไม่ปิดเรื่องเหล่านี้ก่อน

| # | เงื่อนไขที่ยังเปิด | หลักฐาน ณ 2026-10-04 | ปิดด้วย | ตรวจว่าปิดแล้วอย่างไร |
|---|---|---|---|---|
| 1 | การเผยแพร่ถูกบล็อกโดยข้อมูลที่โตขึ้น | Pages 37172926281 ล้มที่ precache 15,787.4 > 15,783 kB ขณะที่ PR CI วัดได้ 15,778.7 kB; #76 ขึ้นเพดานรวม +320 kB เป็น 16,103 kB โดยไม่มี offset; หลังจากนั้น #77 และ #80 ขึ้นเพดานโค้ดอีก (index/CSS/i18n +12/+2/+9 และ +10/+2/+9 kB) และ precache โตเป็น 15,817.5 kB (PR CI ของ #80 ขั้น R3.3) headroom ที่เหลือ ≈ 285.5 kB ใช้ร่วมกันระหว่างโค้ดกับข้อมูล; วัดบน `5f9aa2e` ได้ 15,822.7 kB headroom 280.3 kB (committed snapshots; Pages ต่ำกว่านี้และยังไม่ได้วัด); budget ผ่านใน Pages 37219398466, 37223857005 และ 37230585947; main tip เผยแพร่แล้วที่ `09cc2f5` | CO-1 | เพดานโค้ดกับข้อมูลแยกกัน; cron ไม่ล้มเมื่อข้อมูลโตภายใน headroom; ไม่มีเพดานโค้ดใดสูงขึ้น; main tip เผยแพร่จาก exact source |
| 2 | G2 ยังไม่ลงนาม | D-36 (=PLAN:D08) และ A1–A5 ยังไม่ได้คำตอบ; มีภาพจาก `r2-flight-shell` แต่ไม่มีบันทึกการอนุมัติ | CO-3 | บันทึก G2 ลงวันที่ใน DECISIONS.md |
| 3 | ข้อมูลหาย P0 (RW:LUI-01) | `7662ead:src/main.ts:560` `onChange: (cfg) => { if (!this.playing) this.preview(cfg); }`: กด "Use for the next launch" (`7662ead:src/ui/loop-tuning.ts:176` → `panel.applyControl` `7662ead:src/ui/panel.ts:2020`) ขณะหยุดบินชั่วคราว จะทำลายเที่ยวบินและบันทึก | CO-4 ขั้น 1 | test ที่ล้มก่อนแก้ผ่านแล้ว; journey ยืนยันว่าบันทึกยังอยู่ |
| 4 | R2 merge โดยที่ PR CI ไม่เคยรัน journey ของตัวเอง | `r2-flight-shell` ไม่มี `export const smoke = true`; PR CI รันเฉพาะ smoke (บน `7662ead`: smoke 18 จาก 24 journey; journey ของ R3 สามตัวก็ไม่ใช่ smoke เช่นกัน ซึ่งอยู่นอกขอบเขต CO-5); รันครั้งแรกใน Pages 37169459230 (ผ่าน) | CO-5 | มี smoke slice เป็น gate ของ PR และพิสูจน์ด้วย sabotage run |
| 5 | ช่องว่างหลักฐานฟิสิกส์ | heavy ผ่านครั้งสุดท้าย 36804343856 (ก่อน #36); fleet ผ่านครั้งสุดท้าย 36942933112 (ก่อน R1.4) | CO-6 | ผล heavy + fleet + fingerprint บน SHA ที่ตรึงใน Day 0 ถูกบันทึกไว้ ถ้าแดงต้องมี issue สำหรับ bisect |
| 6 | สถานะไม่ตรงความจริง | PROGRESS บน `5f9aa2e` (หลัง #83): แถว R3 ทั้งห้าเขียน “Verified; merged; published” แล้ว (#83 แก้แถวของ #80 หลัง merge) แต่ยังค้าง: หมายเหตุ “remains” ของแถว R3.5 และ R3.3 stowed, บรรทัด Open 77 และ 86, ไม่มีแถว G3, `R3-design-views.md:7,:88` และ `R3.5-journey.md:7,:81` ยังเขียนว่า G3 ยังไม่ผ่าน; ทุก PR ของ R3 เข้า main พร้อมแถว “in PR” แล้วรอ PR ถัดไปแก้; `IMPLEMENTATION-STATUS.md` ไม่เปลี่ยนตั้งแต่ `fbefa18`; CHANGELOG ขาด R1 (#71/#72) และ #76 | CO-2, CO-8 | PROGRESS, รายงาน และ CHANGELOG ตรงกับบันทึก GitHub (KPI-31) |
| 7 | การละเมิดเรื่องชื่อ ระดับ P0 | `rtaf-academy.ts:32,34` แสดงชื่อโรงเรียนนายเรืออากาศใน UI ซึ่งขัด DEC:D-2 | CO-7 | D-42 ได้คำตอบ และ pack สร้างใหม่ตามคำตอบนั้น |

**การแมปทุกข้อของ R2S §3** (งานที่ไม่ได้อยู่ในคลื่นนี้มีเพียงตัวชี้ไปยังบ้านของมัน)

| R2S §3 | งาน | M-id | แพ็กเกจ |
|---|---|---|---|
| ข้อ 1 | ตัดสิน D08 + A1–A5 และผ่าน G2 ด้วยการตรวจภาพหน้าจอ | M-LAUNCH-018 | CO-3 (D-36) |
| ข้อ 2 | R2.3 ขั้น 2: dock/resize/reorder, reset layout | M-LAUNCH-014 | ตัวชี้: R2.3s2 (S11) |
| ข้อ 3 | ย่อแถบคำสั่ง/เล่น, layout ของ Analysis, จอเตี้ย 1280×800 ที่เปิด guide | M-LAUNCH-002 | ตัวชี้: R2.1r (S11); ภาพหลักฐานมาจาก CO-3 |
| ข้อ 3 | telemetry แบบสรุปก่อน | M-LAUNCH-003 | ตัวชี้: R2.1r (S11) |
| ข้อ 4 | U16: HUD แบบย่อ + onboard, kN มองเห็น, Soyuz 81 % ทั้ง live/replay | M-LAUNCH-004 | CO-4 ขั้น 9 |
| ข้อ 5 | chooser ที่ 320/390 px ใน TH/EN/RU, touch บนรายการ | M-LAUNCH-020 | CO-5 |
| ข้อ 5 | กติกา replay (รายการหลัง cursor) | M-LAUNCH-017 | CO-3 (D-39) |
| ข้อ 6 | matrix ตาม §10.1 (1366×768 … 1180/1181) | M-LAUNCH-019 | CO-3; อุปกรณ์จริงไป HU-6 (M-PLAN-011, S16) |
| ข้อ 6 | smoke slice ของ R2 ใน PR CI | M-LAUNCH-020 | CO-5 |
| ข้อ 7 | ข้อความ `cam.intro` ที่ล้าสมัย | M-LAUNCH-011 | CO-4 ขั้น 3 |
| ข้อ 7 | ชื่อสำหรับโปรแกรมอ่านหน้าจอของ `mfb-play` | M-LAUNCH-008 | CO-4 ขั้น 2 |
| ข้อ 7 | assertion ว่ายังเข้าถึง TORU และ six-DOF ได้ | M-LAUNCH-020 | CO-5 |
| ข้อ 7 | บันทึก merge/CI/deploy ของ R2 | M-LAUNCH-021 | เสร็จ (ปิดใน refresh 2026-10-04; PROGRESS บน `5f9aa2e`) → DELIVERED |
| เลื่อนตามแผน | Docking preset | M-LAUNCH-015 | ตัวชี้: R5.4 (S15, D-58) |
| เลื่อนตามแผน | คอลัมน์ CSV/recorder ของระดับเครื่องยนต์จริง; ฟิสิกส์ Max-Q ราย variant | M-PHYSICS-052 | ตัวชี้: R4.2 (S13, D-57) |
| เลื่อนตามแผน | heavy/fleet ไม่ได้รันใน R2 | M-PHYSICS-001 | CO-6 (ปิดช่องว่างรวม ไม่ใช่เฉพาะ R2) |
| เลื่อนตามแผน | toast "พร้อมออฟไลน์" ทับแถบโทรศัพท์ | M-LAUNCH-066 | CO-4 ขั้น 6 |
| เลื่อนตามแผน | ซ่อน first-use guide ระหว่างบิน | — (ผู้ใช้ปิดเองได้) | ถ่ายภาพทั้งแบบเปิดและปิด guide ใน CO-3; ตัดสินใน R2.1r |
| R2S §5 (เพิ่ม) | กราฟที่ซ่อนอยู่แต่ยังถูกวาด; งานต่อเฟรมของ `syncLifecycle`/chooser | M-LAUNCH-022; M-LAUNCH-024 | CO-4 ขั้น 10; ตัวชี้: EQ-3 (S09) |
| R2S §5 (เพิ่ม) | การกระจายของ `applyLanguage` (CR:D14), CSS ซ้ำ, ค่า notation ตามภาษาที่ค้าง (CR:B12) | M-LAUNCH-025, M-PLATFORM-037, M-LAUNCH-026, M-LAUNCH-006 | CO-4 ขั้น 4, 7, 5 |
| R2S §2 R2.2 | ไม่มีข้อความแจ้งเมื่อกล้อง fallback | M-LAUNCH-012 | ตัวชี้: R2.2r (S11) |

### 06.2 ลำดับ I-train สำหรับ PR ที่แตะไฟล์ hotspot และเลนที่ทำขนานกัน

กฎที่ใช้ (รายละเอียดอยู่ใน S18):
- I เปิด PR ได้ครั้งละหนึ่ง และหนึ่ง PR มีชนิดการเปลี่ยนเดียว
- ทุกขั้นที่เป็น bug-fix เริ่มจาก test ที่ล้มก่อนแก้
- ทุกขั้นตรวจบรรทัดซ้ำบน main tip ณ วันที่เริ่ม (ค่าในส่วนนี้ตรวจบน `7662ead`) แล้วบันทึกค่า `base_sha_verified_on`
- ขั้นของ CO-4 ที่ GCO ต้องมีคือขั้น 1 เท่านั้น ขั้น 2–10 ทำต่อใน K1–K2 ได้ แต่ต้องเสร็จก่อน "R2 complete" (S05 §05.3)

```
วัน 0 (ก่อนวันที่ 1, หลังเจ้าของสั่ง): H บันทึกคำสั่ง (D-65) · ตรวจ main tip/run แบบอ่านอย่างเดียว · เครื่อง: CO-6 dispatch heavy.yml suite=both บน SHA ที่ตรึง
วัน      1 (จ. 5 ต.ค.)          2                 3                 4                 5 (ศ. 9 ต.ค.)
H     D-38 D-63 D-65 D-42 ── G2: D-36+A1..A5, D-39 (ดูภาพ ~1 ชม.) ── อนุมัติ v2.0 ── ตรวจ GCO/GK0
T     CO-1 (แยกเพดาน) ─► publish exact source ─► CO-5 (smoke slice + sabotage, ร่วมกับ Q)
เครื่อง (ต่อจากวัน 0) heavy 25–61 นาที + fleet ~2 ชม. 40 นาที ─► P/Q รวม union และเขียนรายงาน CO-6 (แดง = bisect)
Q     CO-3 PR1 preset viewport + matrix ภาพ ─► ส่งชุดภาพให้ H ─► CO-3 PR2 (I บันทึก G2)
I     [I1] CO-4.1 027 ─► [I2] CO-2 ─► [I3] CO-4.2 008 ─► [I4] CO-4.3 011 ─► [I5] CO-8 (หลัง H อนุมัติ)
L-C   ─────────────── รอ D-42 ─► CO-7 (XS, pack สร้างใหม่ด้วย --check)
W     ร่าง CO-8 ─────────────────────────────────────────────► ส่งให้ I เปิด PR
K1–K2 (I-train ต่อ): CO-4.4a 037 (identical-output) ► 4.4b 025 ► 4.5 006 ► 4.6 066 ► 4.7 026 (identical-output)
                     ► 4.8 032 (realism-changing, P ตรวจ) ► 4.9 004 ► 4.10 022 (identical-output) ► EQ-3 M-LAUNCH-024
```

ถ้ามี session ขนานใหม่ระหว่าง K0 (D-65) PR ที่แตะ `main.ts`, `panel.ts`, `style.css` หรือ i18n ต้องเข้าคิว I-train เดียวกันนี้ (เปิดได้ครั้งละ 1 PR ที่ I เป็นเจ้าของ) และอยู่ใต้กติกา D-38 ชั่วคราวด้านล่าง (เลน R3 ปิดแล้ว 2026-10-04)

**การตัดสินใจที่คลื่นนี้ต้องการ** (ชุด A; คำถาม ทางเลือก และคำแนะนำอยู่ใน S08; ถ้ายังไม่มีคำตอบ งานที่ขึ้นกับการตัดสินนั้นรอ)

| การตัดสินใจ | ต้องได้ภายใน | ปลดล็อก | ถ้าช้า |
|---|---|---|---|
| D-65 การอนุญาตรายคลื่น และบันทึกการปิดเลน R3 (คำเจ้าของ 2026-10-04 ตรงตัว; คำสั่งเดิมไม่ครอบ R4) | Day 0 / วันที่ 1 | ทุกแพ็กเกจ CO; ช่อง I | ไม่มีงานใดเริ่ม |
| D-38 กติกางบ และคำวินิจฉัยการขึ้นเพดานที่เกิดแล้วของ #75/#76/#77/#80 | วันที่ 1 (ระหว่างรอ ใช้กติกาชั่วคราวด้านล่าง) | CO-1, ตารางเพดานของ CO-2, คำขอขึ้นเพดานครั้งถัดไปทุกคำขอ | การแยกเพดานรอ; การขึ้นเพดานถัดไป merge ไม่ได้ |
| D-63 ข้อยกเว้นลำดับ | วันที่ 1 | ลำดับใน CO-4 (ข้อมูลหายมาก่อนงาน identical-output ในไฟล์เดียวกัน) | ใช้ลำดับใน §06.2 ไม่ได้ |
| D-42 ชื่อสถาบัน | วันที่ 1–2 | CO-7 | pack ยังละเมิด DEC:D-2 อยู่ |
| D-36 + A1–A5, D-39 | วันที่ 2–4 | G2, R2.1r, R2.3s2 | GCO เลื่อน (S05 §05.9: กรณีช้าคือ 23 ต.ค.) |
| D-59 ปิด G0 | ก่อน CO-8 | CO-8 (แถว D-59) | G0 ยังปิดอย่างเป็นทางการไม่ได้ |
| D-33, D-34 (=PLAN:D05, D06) | ถามในรอบ G2 | ยืนยันพฤติกรรมที่ทำไปแล้วใน R1/R2 | ไม่มีงานถูกบล็อก บันทึกว่า "adopted-awaiting-confirmation" |

**กติกา D-38 ชั่วคราว มีผลทันที (ดู S08):** ไม่มีการขึ้นเพดานใด merge อีก ถ้าไม่มีแถวแพ็กเกจ offset ที่ระบุชื่อ กติกานี้ใช้กับทุก PR จากทุกเลน จนกว่า CO-1 จะ merge และเจ้าของตอบ D-38

ความเสี่ยงของคลื่นนี้อยู่ในทะเบียน S05 §05.13 ข้อ 12 (heavy แดง), 13 (ข้อมูลโตจนบล็อกการปล่อย), 14 (การตัดสินใจล่าช้า), 17 (สถานะเก่า), 26 (session ขนานชนกัน: เกิดแล้วและปิดเหตุการณ์ #77–#83, D-65) และ 28 (journey ค้างบล็อกการเผยแพร่)

### 06.3 แพ็กเกจ

#### CO-1 — แยกเพดานโค้ดกับเพดาน data snapshot และลงผลคำวินิจฉัย D-38 ต่อการขึ้นเพดานของ #75/#76/#77/#80
- **เลน:** T (H อนุมัติ D-38) **คลื่น:** K0 วันที่ 1 **ประมาณการ (หยาบ):** 0.5 agent-day, 1 PR **OR:** OR-2, OR-3, OR-6
- **ขึ้นกับ:** D-38 (ชุด A) **ปลดล็อก:** CO-2 (ตารางทบทวนเพดาน), คำขอขึ้นเพดานครั้งถัดไปทุกคำขอ จากทุกเลน, EQ-1/EQ-6/EQ-8 (เป็น offset ที่ระบุชื่อ), KPI-03, KPI-30
- **ไฟล์ที่อนุญาต:** `scripts/bundle-budget.mjs`, `budgets.json` (แก้ได้เฉพาะ T), `tests/bundle-budget.test.ts`, `tests/budget.test.ts`, `.github/workflows/deploy.yml` (แค่ข้อความเตือน) — ไม่แตะไฟล์ hotspot ของ I
- **ชนิดการเปลี่ยนต่อ PR:** PR เดียว ชนิด quality-improving (เครื่องมือ gate) ไม่เปลี่ยน output ของแอป

| รหัส | ที่มาเดิม | P | ขนาด | สถานะ | เรื่องและเหตุผล | เกณฑ์รับ | วิธีพิสูจน์ | ขึ้นกับ |
|---|---|---|---|---|---|---|---|---|
| M-PLATFORM-063 | GH:run-37172926281, GH:#76, CR:NEW-ci-1 | P0 | XS | เปิด (ledger); การเผยแพร่ถูกปลดล็อกชั่วคราวด้วย #76 (budget ผ่านใน Pages 37219398466, 37223857005 และ 37230585947; เพดานไม่เปลี่ยนถึง `5f9aa2e`) | precache เป็นเพดานเดียวที่รวมโค้ดกับ `data/*.json` เข้าด้วยกัน PR CI build ด้วย snapshot ที่ commit ไว้ (3 ไฟล์ ~1,119.2 kB) แต่ Pages รัน `npm run snapshots` ก่อน build ข้อมูลจึงโตขึ้นหลัง PR (+8.7 kB ในวันนั้น) โดยที่ PR CI มองไม่เห็นเลย ส่วนโค้ดก็ค่อย ๆ กิน headroom ของข้อมูลไปเงียบ ๆ (#77 และ #80 ทำให้ precache โตถึง 15,817.5 kB ภายใต้เพดาน 16,103 kB ของ #76) | (1) `bundle-budget.mjs` แยก entry ของ manifest ออกเป็นกลุ่มโค้ดกับกลุ่ม `data/` และ `budgets.json` มีเพดานสองค่า (2) **เพดานโค้ด = ไบต์ของกลุ่มโค้ดที่วัดบน main tip ตอนที่ CO-1 เปิด PR** (บันทึก SHA และค่าที่วัด) และห้ามสูงขึ้นถ้าไม่มี offset ที่ระบุชื่อตาม D-38 (3) เพดานข้อมูล = ขนาดหลัง refresh ที่วัดได้ + headroom ที่เขียนเหตุผลไว้ (เสนอ ≥ 90 วันของอัตราการโตที่วัดได้; ต้องวัดจากขนาด `dist/data` ของ Pages/cron ย้อนหลัง) ค่านี้เป็น**การอนุมัติตาม D-38 อย่างชัดแจ้ง** และนับใน KPI-30 และ KPI-03 (4) ข้อมูลโตเกิน 80 % ของ headroom ให้ขึ้นคำเตือน ไม่ใช่ล้ม; ถ้าเกินเพดานให้ล้มด้วยข้อความ "data ceiling" ที่แยกจาก "code ceiling" (5) PR CI กับ Pages ตรวจกลุ่มโค้ดด้วยกฎเดียวกัน จึงได้ผลเท่ากัน (6) Pages เผยแพร่ main tip จาก exact source และมี deployment record (7) `_notes` บันทึกคำวินิจฉัย D-38 ต่อการขึ้นเพดานของ #75/#76/#77/#80 โดยการโตของ #77/#80 บันทึกภายใต้ D-38 ให้ EQ-8 เป็น offset ด้านขนาดที่ติดตั้ง และเขียนให้ชัดว่า EQ-1 และ EQ-6 ไม่ได้ลดขนาด precache | unit test ของการแบ่งกลุ่ม: fixture ที่ข้อมูลโตภายใน headroom ต้องผ่าน, เกิน headroom ต้องล้มด้วยข้อความ data, โค้ดเกินต้องล้มด้วยข้อความ code; รัน budget บน build ของฐานแล้วต้องได้ผลรวมไบต์เท่ากับวิธีเดิม (การนับไม่เปลี่ยน มีแค่การจัดกลุ่ม); cron หรือ dispatch หนึ่งรอบหลัง merge ต้องผ่าน | D-38 |

**D-38 เป็นคำวินิจฉัยต่อการขึ้นเพดานที่เกิดไปแล้ว** (ทางเลือกและคำแนะนำฉบับเต็มอยู่ใน S08 D-38): #76 merge แล้ว (09:43Z) จึงไม่ใช่ทางเลือกที่เปิดอยู่อีก D-38 คือคำวินิจฉัยของเจ้าของต่อการขึ้นเพดานของ #75 (index/CSS/i18n +12/+3/+12 kB), #76 (precache +320 kB เป็น 16,103 kB), #77 (+12/+2/+9 kB ในสองส่วน) และ #80 (+10/+2/+9 kB) ไม่มีครั้งใดระบุแพ็กเกจชดเชย (precache ตั้งที่ค่าวัด + 2 % ส่วนเพดานกลุ่มอื่นตั้งที่ค่าวัดปัดขึ้น 1–3 kB ตาม `_notes` บน `7662ead`); #81/#82 ไม่ขึ้นเพดานใด CO-1 แปลงผลของคำวินิจฉัยนั้นลงในเพดานสองค่าตามเกณฑ์ (2)–(3) ข้างบน offset ที่ระบุชื่อมีสองด้าน:
- ไบต์ที่ผู้ใช้ดาวน์โหลด: EQ-1 (KPI-02 9,348 → 0 kB) และ EQ-6 (KPI-01) ทั้งสองค่าเป็นสมมติฐาน
- ขนาดที่ติดตั้ง: EQ-8 (ราว −2.75 MB หลัง D-40, สมมติฐาน) เป็น offset ที่ระบุชื่อสำหรับการโตของ #77/#80 ส่วน EQ-1 และ EQ-6 ลดไบต์ที่ดาวน์โหลด แต่ไม่ได้ลดขนาด precache

**ลำดับขั้น:**
1. วัดบน build ของฐาน (main tip): ไบต์ของ precache แยกเป็น entry `data/` กับ entry อื่น โดยใช้ snapshot ที่ commit ไว้ แล้วเทียบกับขนาดหลัง refresh จาก Pages run ล่าสุด
2. เขียน unit test ของการแบ่งกลุ่มก่อน (fixture: ข้อมูลโตภายใน headroom, ข้อมูลโตเกิน headroom, โค้ดเกินเพดาน) test เหล่านี้ล้มบนฐาน เพราะฐานยังไม่มีกลุ่มแยก
3. แยกกลุ่มใน `bundle-budget.mjs` และตั้งเพดานใน `budgets.json` เขียน `_notes` บันทึกขนาดที่วัด คำตัดสิน D-38 และชื่อ offset
4. เปิด PR เมื่อ PR CI ผ่าน merge แล้วให้ Pages ตรวจกลุ่มข้อมูลด้วย snapshot ที่ refresh แล้ว จากนั้นรอดู cron หนึ่งรอบ บันทึก run id ใน report และใน PROGRESS ถ้า Pages ล้มด้วยเหตุที่ไม่ใช่งบ (เช่น journey `learner-profiles` timeout แบบใน Pages 37219398466 และ 37223857005 ซึ่งตอนนี้มี start-up marks ของ #81 และ CPU/GPU ของ browser process จาก #82 ในผลวินิจฉัย) ห้าม retry แบบไม่ดูสาเหตุ ให้บันทึกชื่อ journey ข้อความ และ run id ส่งต่อเป็นข้อมูลเข้า M-PLATFORM-061 (R7.1) แล้วให้เจ้าของเลือกว่าจะ re-run ทั้ง workflow หนึ่งครั้งตามแนวที่ใช้กับ #76 หรือจะรอการแก้ เกณฑ์ (6) ยังไม่ผ่านจนกว่า Pages จะสำเร็จ

**คำแนะนำ:** แยกเพดานในวันที่ 1 เพดานรวม 16,103 kB ที่ merge แล้วไม่ต้องถอยกลับ (การถอยทำให้ cron ล้มอีกโดยไม่ได้คุณภาพเพิ่ม) แต่ CO-1 แปลงเป็นเพดานโค้ดกับเพดานข้อมูลตามเกณฑ์ (2)–(3) ทางที่**ตัดออก**คือการเอา data snapshot ออกจาก install หรือข้ามขั้นตรวจงบ (S02 §02.13 ข้อ 17) และการให้ PR CI ดึง snapshot สดจากเว็บ (ทำให้ PR CI พึ่งเครือข่ายและผลไม่คงที่)
- **quality guard (OR-2):** ออฟไลน์ต้องยังครบ (ทุก snapshot ยังอยู่ใน precache); ไม่มีเพดานใดถูกยกเลิก; KPI-03 ฝั่งโค้ดลดได้ทางเดียว
- **หลักฐานที่ต้องส่ง:** `docs/development/reports/CO-1-budget-split.md` (ตารางกลุ่มก่อน/หลัง, test ที่รันจริง, run id ของ Pages/cron); แถว PROGRESS
- **execution_authorized:** false

#### CO-2 — บันทึกการส่งมอบ R2/R3 และ G3 ให้ตรงความจริง และตรวจรายการที่ #75–#82 แตะซ้ำบน main ปัจจุบัน
- **เลน:** I (W ร่าง) ผ่าน I-train **คลื่น:** K0 วันที่ 2–4 **ประมาณการ (หยาบ):** 1 agent-day, 2 PR **OR:** OR-4, OR-6
- **ขึ้นกับ:** CO-1 publish; คำตอบ D-65 (ขอบเขต audit ตรึงที่ #71–#83 ถ้ามี PR ใหม่ก่อนเริ่ม ให้ขยายตาม) **ปลดล็อก:** CO-8, GCO, KPI-31 baseline
- **ไฟล์ที่อนุญาต:** `docs/development/PROGRESS.md`, `docs/IMPLEMENTATION-STATUS.md` (เฉพาะบรรทัดความสามารถและข้อจำกัดของ R2/R3 และวันที่ ไม่เปลี่ยนชื่อไฟล์เพราะ comment ใน `src/` อ้างอยู่), `CHANGELOG.md`, `docs/development/reports/R3-design-views.md` และ `R3.5-journey.md` (บรรทัดสถานะ), `docs/development/reports/CO-2-closeout.md` (ไฟล์ใหม่)
- **ชนิดการเปลี่ยนต่อ PR:** PR1 docs (PROGRESS + IMPLEMENTATION-STATUS + CHANGELOG); PR2 docs (รายงานทบทวนเพดานและตาราง delta)

| รหัส | ที่มาเดิม | P | ขนาด | สถานะ | เรื่องและเหตุผล | เกณฑ์รับ | วิธีพิสูจน์ | ขึ้นกับ |
|---|---|---|---|---|---|---|---|---|
| M-PLATFORM-064 | R2S:§10.2, R2S:progress docs, GH:run-37169459230, GH:7ddab75 | P0 | XS | บางส่วน (#83 แก้แถวของ #80 แล้ว) | แถว R3 package 1 แก้แล้ว (ใน #77) และแถว R3 ของ #80 ที่ผิดบน `7662ead` แก้แล้วใน #83 แต่ยังไม่มีบันทึก G3, `IMPLEMENTATION-STATUS.md` ไม่รู้จัก R2/R3 และการขึ้นเพดานของ R2/R3 ยังไม่ได้ทบทวนภายใต้กติกาเดียว | **PROGRESS:** เพิ่มแถว “G3 — delivered 2026-10-04 (owner statement, verbatim; Pages 37230585947)”, แก้หมายเหตุ “remains” ของแถว R3.5 และ R3.3 stowed, บรรทัด Open 77/86; แยก merged/published/live ทุกแถว **รายงาน:** `R3-design-views.md:7,:88` และ `R3.5-journey.md:7,:81` บอกว่า G3 ส่งมอบพร้อมข้อจำกัดที่รับ (S05 §05.4) **IMPLEMENTATION-STATUS.md:** เพิ่มความสามารถของ R2 และ R3 (#75–#80) แก้ `:573` (“draws no picture”) และคง `:578` (~180 ms) เป็นข้อจำกัดที่รู้ (M-BUILD-015) ส่วนการไล่แก้ทั้งไฟล์ (C1–C16) อยู่ใน R7.5 (M-PLATFORM-069) **ตารางทบทวนเพดาน:** R1 index +1, R2 index +15/CSS +1, #75 index +12/CSS +3/i18n +12, #76 precache +320, #77 +12/+2/+9 (สองส่วน), #80 +10/+2/+9 (R3.3 แล้ว R3.1; รายละเอียดราย PR อยู่ใน S03 §03.4), #81/#82 ไม่มี ทุกแถวต้องมีขนาดที่วัด ฟีเจอร์ และแพ็กเกจ offset (EQ-6 สำหรับ i18n, EQ-7 สำหรับโค้ดใน index, EQ-8 สำหรับขนาดที่ติดตั้งตาม CO-1) หรือติดธง KPI-30 **CHANGELOG:** ตรวจบน `7662ead` แล้ว (ไฟล์ไม่เปลี่ยนถึง `5f9aa2e`) ยังขาดบรรทัดของ R1 (#71/#72) และ #76 (#74, #75, #77, #78, #80 มีแล้ว) ส่วน #81/#82 (diagnostics) ก็ยังไม่มีบรรทัด; #73, #79 และ #83 เป็น docs ล้วน ให้บันทึกในตาราง audit ส่วนจะเพิ่มบรรทัด CHANGELOG หรือไม่ ให้ทำตามกฎ "หนึ่งบรรทัดต่อ PR" ของ CO-8 | audit KPI-31: ทุก PR #71–#83 มี SHA/CI/Pages/live ครบ; diff ของ PROGRESS, IMPLEMENTATION-STATUS และ CHANGELOG | CO-1 |
| M-PLAN-017 | GH:#75, GH:run-37172926281 | P0 | XS | เปิด | ledger ตรวจบน `da67341` ส่วน #75–#83 เปลี่ยนสถานะของบางรายการ (S03 §03.4) | ตาราง delta บน `5f9aa2e`/`09cc2f5` = `refresh/r3-audit.tsv` (58 แถว; คอลัมน์ `final_package`/`final_status` ตรงกับ `assignment.tsv`): M-BUILD-001…005 → เสร็จ (ขอบเขต v1.2; ส่วนที่แผนเพิ่มย้ายไป M-PLAN-025/028/030, M-LAUNCH-076/081, M-BUILD-015); M-LAUNCH-021 → เสร็จ; M-LAUNCH-030 → บางส่วน (ลิงก์รายงาน → R3.1r); M-PLATFORM-061 ยังเปิด (diagnostics #81/#82, ยังไม่พบสาเหตุ); M-PLAN-027…031 ใหม่; M-LAUNCH-063 → ED-LES-2, 068 → ED-I18N-2; ไม่มี envelope v2 (S12 §12.3) CO-2 ลงตารางนี้ใน repo พร้อมไฟล์:บรรทัด; บันทึก `learner-profiles` timeout ทั้งสามครั้งเข้า M-PLATFORM-061 (R7.1) ห้าม retry แบบไม่ดูสาเหตุ | ตารางไฟล์:บรรทัดบน SHA ที่ระบุ ส่งต่อให้ CO-8 (registry) และ S19 | — |
- **ลำดับขั้น:**
  1. ดึงบันทึก GitHub แบบอ่านอย่างเดียวของ #71–#83 (merge SHA, CI, Pages, deployment) แล้วสร้างตาราง audit
  2. บันทึกการปิด M-LAUNCH-021 (ปิดในแผนแล้ว) และบันทึก G3 ตามคำเจ้าของ (docs-only PR)
  3. ตรวจแถว R3 ที่ #77–#83 เขียนไว้ใน PROGRESS แก้เฉพาะแถวที่ยังผิด ไม่เขียนแถวที่ถูกแล้วซ้ำ
  4. PR1: แก้แถวที่ยังผิดใน PROGRESS, เพิ่มบรรทัด R2/R3 ใน IMPLEMENTATION-STATUS และเพิ่มบรรทัด CHANGELOG ที่ขาด
  5. PR2: เขียน `CO-2-closeout.md` (ตารางเพดานภายใต้ D-38 ของ #75–#82 และตาราง delta ของ M-PLAN-017)
- **quality guard:** แก้เอกสารเท่านั้น ห้ามแก้ไฟล์ Markdown ที่โค้ดหรือเทสต์อ่าน
- **หลักฐานที่ต้องส่ง:** `CO-2-closeout.md` (ตาราง audit #71–#83, ตารางเพดานรวม #77 และ #80, ตาราง delta, คำสั่ง `gh api` ที่ใช้); บรรทัด CHANGELOG ของ PR นี้เอง
- **execution_authorized:** false

#### CO-3 — รายการตรวจ G2 สำหรับเจ้าของ: D-36 + A1–A5, D-39, ขนาดฉากขั้นต่ำ, preset และ matrix ภาพหน้าจอ
- **เลน:** H ตัดสิน; Q ถ่ายภาพและเพิ่ม preset ใน harness; I บันทึกใน DECISIONS.md **คลื่น:** K0 วันที่ 1–4 **ประมาณการ (หยาบ):** 6 agent-days, 2 PR; เวลาเจ้าของราว 1 ชม. **OR:** OR-2, OR-6
- **ขึ้นกับ:** main tip ที่ live (CO-1) **ปลดล็อก:** G2, R2.1r, R2.3s2, ED-CLASS-2 (M-LEARNING-044), CO-5 (preset ของ viewport)
- **ไฟล์ที่อนุญาต:** `tests/browser/harness.mjs` (preset ของ viewport, T/Q), `tests/browser/journeys/r2-flight-shell.mjs` หรือ journey matrix ใหม่ (Q), `docs/DECISIONS.md` (I) — ไม่แก้โค้ดแอป
- **ชนิดการเปลี่ยนต่อ PR:** PR1 quality-improving (preset + matrix + การจับภาพใน harness/journey ไม่แก้โค้ดแอป); การตัดสินของ H เป็นชนิด decision; PR2 docs (บันทึก G2)

| รหัส | ที่มาเดิม | P | ขนาด | สถานะ | เรื่องและเหตุผล | เกณฑ์รับ | วิธีพิสูจน์ | ขึ้นกับ |
|---|---|---|---|---|---|---|---|---|
| M-LAUNCH-018 | R2S:G2, R2S:D08, R2S:R2.2 acceptance (A5), PLAN:D08, PLAN:G2 | P0 | S | เปิด | #74 merge ก่อน D08 ได้คำตอบ สมมติฐาน 5 ข้อจึงกลายเป็นพฤติกรรมที่ live อยู่ | ทุกข้อของ A1–A5 ถูกยืนยันหรือเปลี่ยน ทีละแถว (D-36.A1…A5); ข้อที่เปลี่ยนต้องเปิดงานติดตามพร้อม journey; ห้ามกลับพฤติกรรมเงียบ ๆ | บันทึก G2 ลงวันที่ใน DECISIONS.md อ้าง SHA และ hash ของชุดภาพ | M-LAUNCH-019 |
| M-LAUNCH-017 | R2S:R2.4 replay rule | P2 | XS | บางส่วน | chooser แสดงสมาชิกจนถึง recording head ใน replay จึงเห็นเหตุการณ์หลัง cursor | มีคำตัดสิน D-39 บันทึกไว้; ถ้าเลือก "ซ่อนหลัง cursor" ให้เปิดงานที่ทำทั้ง chip และ list พร้อม unit test (เป็นงานถัดไป ไม่อยู่ใน CO-3) | แถวใน DECISIONS | M-LAUNCH-018 |
| M-LAUNCH-019 | R2S:§10.1, R2S:R2.3 acceptance, RW:INF-18, DP:12-08, DP:12-15, OD:§7.5 README limits, PLAN:§10.1 | P1 | M | เปิด | ที่ตรวจแล้วมีแค่ 1280×800, 1024×700, 320×740 RU และ 390×844 TH บน Chromium 141 | ทุกขนาดในตารางด้านล่างมี preset ใน harness; assertion อัตโนมัติ: ไม่มี overflow แนวนอน, Abort/play/clock/live-replay/TORU/six-DOF อยู่ในจอ, ฉาก ≥ ขนาดขั้นต่ำของ D-36, ข้อความใน chooser ไม่ล้น; แถวที่เป็นอุปกรณ์จริงและ screen reader ไปส่งใน HU-6 (M-PLAN-011) และ R2.5 | journey ผ่านใน Pages mode บน SHA ที่ตรึงไว้; sabotage หนึ่งข้อต่อ assertion | — |

**รายการตรวจของเจ้าของ (ข้อความสมมติฐานอ้างตรงตัวจาก `R2-workspace.md` §"การตัดสินใจที่ยังรอ (D08)" บน origin/main; ทางเลือกและเหตุผลฉบับเต็มอยู่ใน S08 แถว D-36.A1–A5 และ D-39)**

| แถว | สมมติฐาน (อ้างตรงตัว) | ทางเลือก | ข้อเสนอ |
|---|---|---|---|
| D-36.A1 | "ซ่อน setup เฉพาะระดับ **Engineer** หลัง launch; Explore ยังใช้แผงเดิมเป็นสรุปเที่ยวบินตามพฤติกรรมเดิม" | (ก) คงไว้ (ข) ซ่อนใน Explore ด้วย (ค) Explore ซ่อนเฉพาะจอ ≥1181 px | (ก): แผงใน Explore คือสรุปเที่ยวบินของผู้เริ่มต้น ควรรอหลักฐานจาก HU-1 ก่อนเปลี่ยน |
| D-36.A2 | "desktop เมื่อ setup ซ่อนใช้ `scene \| telemetry 330 px` (300 px ที่ ≤1400 px); ≤1180 px เป็นคอลัมน์เดียวที่ telemetry เป็นแถบใต้ภาพ; โทรศัพท์คงเป็น stack เดิม" | (ก) ยืนยัน (ข) ปรับตัวเลขตามภาพ (ค) ให้ปรับความกว้างได้ (= R2.3s2) | (ก) และกำหนดขนาดฉากขั้นต่ำจาก matrix; (ค) อยู่ใน R2.3s2 |
| D-36.A3 | "ปุ่ม ⚙ Setup แสดง setup แบบอ่านอย่างเดียวระหว่างบิน (มี Relaunch/New mission เดิมอยู่ข้างใน) ไม่ใช่การกลับไป setup; New mission เท่านั้นที่เปิด configuration ให้แก้" | (ก) อ่านอย่างเดียว (ข) แก้ได้แบบ "รอใช้ครั้งถัดไป" (ค) ซ่อนปุ่ม | (ก): การแก้ระหว่างบินคือเส้นทางเดียวกับ LUI-01 (CO-4 ขั้น 1) |
| D-36.A4 | "presets ของ R2.3 เป็นการเลือกการ์ดใน telemetry panel ยังไม่ทำการลาก/จัดหน้าต่างอิสระ (รอ D08)" | (ก) presets ตอนนี้ ส่วน dock/resize/reorder ทำใน R2.3s2 เฉพาะจอ >860 px และโทรศัพท์คงใช้ presets (ข) presets ถาวร (ค) ลากได้อิสระทุกจอ | (ก) ตรงกับหลัก "หนึ่งงานต่อหนึ่งหน้าจอโทรศัพท์" (S02 §02.6) |
| D-36.A5 | "ภารกิจใหม่ใน Watch เริ่มที่ Cinematic เสมอ; ใน workspace ความเป็นเจ้าของกล้องคงอยู่ข้ามการแก้ setup เหมือนสวิตช์ camera sequence เดิม" | (ก) ยืนยัน (ข) workspace กลับเป็น Cinematic ทุกครั้งที่กด New mission (ค) ถามผู้ใช้ | (ก) โดยให้ CO-5 ยืนยันว่ากล้องจับยานถูกเมื่อเริ่มภารกิจใหม่ และสถานะเจ้าของกล้อง (`#camera-tabs[data-owner]`) มองเห็นได้ |
| D-39 | chooser ใน replay แสดงเหตุการณ์หลัง cursor (จนถึง head) ได้หรือไม่ | (ก) แสดงถึง head (พฤติกรรมปัจจุบัน เหมือน chip) (ข) ซ่อนหรือทำจางสิ่งที่อยู่หลัง cursor ทั้ง chip และ list | เจ้าของเลือก; เอนไปทาง (ก) เพราะ replay คือการไล่ดูบันทึกที่จบแล้ว และ seek API ของ R2.6 ต้องใช้รายการเต็ม; ไม่ว่าเลือกทางใด ห้ามแก้เหตุการณ์ที่บันทึกไว้ |
| ขนาดฉากขั้นต่ำ | วัดได้แล้ว: viewport 638 → 940 px, ฉาก ≥60 % ของความกว้างที่ 1280×800 (assert อยู่แล้ว) | เจ้าของกำหนดความสูงขั้นต่ำที่ 1100×650 / 1280×720 จากภาพ | ตัวเลขนี้ต้องวัดใน CO-3 และส่งต่อให้ R2.1r (M-LAUNCH-002) |
| รายการ preset | All / Flight / Dynamics / Orbit / Custom | ยืนยัน หรือเพิ่ม/ลด | ยืนยัน; Docking มาหลัง R5 (R5.4, D-58) |

**matrix ภาพหน้าจอ** (ถ่ายบน main tip ที่ live, เก็บ Chromium version, ใช้ preset ที่ PR1 เพิ่ม):

| ชั้น | ขนาด/สภาวะ | ภาษา | first-use guide | สถานะที่ถ่าย | ผู้ตรวจ |
|---|---|---|---|---|---|
| H (เจ้าของดู ~50 ภาพ เป็น contact sheet ต่อขนาด) | 1280×800, 1366×768, 1920×1080, 1100×650, 1280×720 (projector), 768×1024, 390×844, 320×740 | TH ทุกขนาด; EN ที่ 1280×800 และ 1920×1080; RU ที่ 1366×768 และ 320×740 (ข้อความยาวที่สุด) | ปิด; เปิดเพิ่มที่ 1280×800 และ 390×844 | setup, flight (setup พับ), ⚙ peek, chooser เปิด, preset Custom, แท็บของ Watch (desktop), แถบโทรศัพท์ (phone) | H |
| A (เครื่องตรวจอย่างเดียว) | ทุกขนาดข้างบน + zoom 125/150 % ที่ 1280×800 และ 1366×768 (จำลองด้วย CSS viewport/DPR) + ขอบ 860/861 และ 1180/1181 px | TH/EN/RU ทุกขนาด | เปิดและปิด | flight + chooser | Q (assertion ใน PR1) |
| อุปกรณ์จริง | iPhone Safari, iPad, Android ราคาประหยัด, Chromebook, Edge บน Windows, zoom จริง, screen reader | — | — | — | HU-6 (S16), R2.5 (S11) |

- **ลำดับขั้น:**
  1. PR1 (Q/T): เพิ่ม preset ของ viewport ใน harness และ assertion ชั้น A ทำ sabotage ทีละ assertion แล้วรันใน Pages mode บน main tip
  2. Q ทำ contact sheet ชั้น H ระบุ SHA, Chromium version และ hash
  3. H ตอบรายการตรวจข้างบนทีละแถว (ประมาณ 1 ชม.)
  4. PR2 (I, docs): บันทึก G2 ใน DECISIONS.md และเปิดงานติดตามสำหรับทุกข้อที่เปลี่ยน
- **ผลลัพธ์:** บันทึก G2 ใน DECISIONS.md ลงวันที่ ประกอบด้วย SHA ที่ถ่าย, run id หรือ hash SHA-256 ของชุดภาพ (เก็บชุดภาพเป็น artifact นอก `docs/` ต้องตรวจ retention ของ artifact), คำตอบ A1–A5, D-39, ขนาดฉากขั้นต่ำ, รายการ preset และงานติดตามที่เปิด รวมถึงการบันทึก KPI-35 (เวลาที่ใช้ตัดสินเทียบกับ needed_by K0) คำถาม D-33/D-34 ในชุด A ถามในรอบเดียวกันได้ (S08)
- **quality guard:** test และเอกสารเท่านั้น ไม่แตะ `budgets.json` และไม่ผ่อน assertion; PR ใน CO-4 ที่เปลี่ยนภาพ (ขั้น 6, 9) ต้องแนบภาพก่อน/หลังให้เจ้าของอนุมัติ
- **execution_authorized:** false

#### CO-4 — ชุด PR แก้ความถูกต้องและ regression ของ R2 (LUI-01 ก่อน)
- **เลน:** I/U ผ่าน I-train (P ตรวจขั้น 8) **คลื่น:** ขั้น 1 ใน K0, ขั้น 2–10 ใน K0–K2 **ประมาณการ (หยาบ):** 13 agent-days, **11 PR ชนิดเดียว** (ขั้น 1, 2, 3, 4a, 4b, 5–10 ในตารางด้านล่าง ตรงกับ `packages.tsv`) **OR:** OR-1, OR-2, OR-3
- **ขึ้นกับ:** D-63 (ลำดับ), คิว I-train (§06.2), G2 สำหรับขั้นที่เปลี่ยนภาพ **ปลดล็อก:** G2 (ขั้น 1), "R2 complete" (ครบทุกขั้น), EQ-3 (M-LAUNCH-024), R4.2 (M-PHYSICS-052 ใช้ helper ตัวเดียวกัน), R0.2r (ADR ของ FlightLifecycle ได้ข้อมูลจากขั้น 1)
- **ไฟล์ที่อนุญาต:** `src/main.ts`, `index.html`, `src/style.css`, `src/i18n/{en,th,ru}.ts` (บล็อกต่อท้ายของเลน ครบสามภาษาใน PR เดียว), `src/ui/{flight-lifecycle,panel,telemetry,hud,onboard,engine-levels,dialogs}.ts`, `src/i18n/index.ts`, `src/ui/notation.ts`, tests ที่เกี่ยวข้อง
- **fold (`folds.tsv`):** M-PLATFORM-037 ทำติดกับ M-LAUNCH-025 (identical-output ก่อน แล้วตามด้วย bug-fix คนละ PR); M-LAUNCH-022 ตามด้วย M-LAUNCH-024 (EQ-3) ใน train เดียวกัน โดยใช้ oracle ร่วมกัน; M-LAUNCH-004 ใช้ `ui/engine-levels.ts` ซึ่ง M-PHYSICS-052 (R4.2) จะใช้ต่อ
- **กติการ่วม:** ทุกขั้นตรวจบรรทัดซ้ำก่อน (ค่าด้านล่างตรวจบน `7662ead`; ตั้งแต่ `da67341` ถึง `7662ead` session R3 แก้ `main.ts` +218/−6, `panel.ts` +91, `style.css` +25 และ i18n +102/−3 ต่อภาษา); #81 +15 (`markStartup` เท่านั้น) จึงต้องตรวจบน `5f9aa2e` ด้วยกฎเลื่อน: บรรทัดเดิม 925–937 +1, 938–2594 +2; bug-fix ต้องมี test ที่ล้มบนฐาน แนบผลการล้ม; identical-output ใช้ oracle ตาม S07 §07.5 ถ้า kit ของ M-PLAN-018 ยังไม่ merge ให้ใช้ oracle เฉพาะ PR ที่บันทึกบนฐานและพิสูจน์ด้วย sabotage; ห้ามบันทึก oracle ใหม่ใน PR ชนิดนี้; ห้ามอ้างความเร็วจนกว่า `--compare` ของ R0.4 (M-PLATFORM-041) จะมีให้ใช้ ถ้ายังไม่มีให้เขียนว่า "ต้องวัด"

| ขั้น | รหัส (ที่มาเดิม) | P / ขนาด / สถานะ | ชนิด PR | ไฟล์และบรรทัด | test ที่ล้มก่อนแก้ หรือ oracle | เกณฑ์รับ และวิธีพิสูจน์ |
|---|---|---|---|---|---|---|
| 1 | M-LAUNCH-027 (DP:LUI-01, RW:LUI-01, RW:§12:LUI-01) | P0 / S / เปิด | bug-fix | `7662ead:src/main.ts:560` guard `!this.playing`; `flight-lifecycle.ts` (สัญญา) | pure function `shouldPreview(stage)` ใน `flight-lifecycle.ts` ต้องคืน false เมื่อ stage = flight; journey: หยุดกลางบิน → loop inspector → "Use for the next launch" → จำนวน frame ที่บันทึก, timeline และ HUD ต้องไม่เปลี่ยน (บนฐานต้องล้ม); reproducer ต้องลองเส้นทาง reload panel ใหม่ของ #77 ด้วย: `openTemplate` (`5f9aa2e:src/main.ts:1147`) และ `applySuggestion` (`:1582`) ขณะหยุดเที่ยวบินสด (guard ยังอยู่ที่ `:560`) | ขณะ stage = flight (กำลังเล่น หยุด หรือ replay) `onChange` ต้องไม่เรียก `preview()`; ค่าที่ตั้งเก็บเป็น config รอใช้ และมีผลตอน New mission/Relaunch ข้อความ `tune.applied` จึงเป็นจริง; เขียนสัญญาไว้ใน docstring เพื่อใช้เป็นข้อมูลเข้า ADR ของ R0.2r (S07); ไม่เปลี่ยนฟิสิกส์ และ recorder ของเที่ยวบินที่ไม่ได้ใช้ action นี้ต้องได้ไบต์เท่าเดิม |
| 2 | M-LAUNCH-008 (R2S:mfb-play, CR:D14) | P1 / XS / เปิด | bug-fix | `7662ead:index.html:202` (`#mfb-play` ไม่มี `aria-label`); `syncMobileFlightBar` (`7662ead:src/main.ts:1618`) ซึ่งถูกเรียกทุกเฟรมผ่าน `syncLifecycle` (`:1477`, จาก frame loop `:2097`) ตั้งป้ายเฉพาะเมื่อ glyph เปลี่ยน (`:1630-1634`) frame แรกที่หยุดจึงไม่มีชื่อ และเปลี่ยนภาษาแล้วป้ายไม่เปลี่ยน; ทุกเฟรมอ่าน `textContent` ของ DOM และเรียก `t()` (`:1623-1627`) | `phone()` ใน `r2-flight-shell` assert ชื่อ accessible ใน frame แรกที่หยุดอยู่ และหลังเปลี่ยนภาษา; ตัวนับ: นอกจากเฟรมที่ภาษาเปลี่ยน ฟังก์ชันนี้ต้องไม่อ่าน DOM และไม่เรียก `t()` เลย รวมถึงเฟรมที่กด play/pause หรือสลับ live/replay | ปุ่มมีชื่อภาษาท้องถิ่นตรงกับสถานะใน TH/EN/RU ทุก frame; **คงการเรียกทุกเฟรมไว้** แต่เก็บค่าที่เขียนล่าสุดไว้ใน JS (active, replay, สตริง clock/mode, glyph, label, ภาษา) แล้วเขียน DOM เฉพาะเมื่อค่าต่างจากที่เก็บไว้; สตริง clock มาจากค่าเดียวกับที่ timeline เขียน ไม่อ่าน `textContent`; แปลสตริงทั้งสี่ (`tl.live`, `ctl.replay`, `ctl.play`, `ctl.pause`) ครั้งเดียวต่อภาษา และเรียก `t()` ใหม่เมื่อภาษาเปลี่ยนเท่านั้น; ยังเขียน `data-active` ตามเดิม (CSS `7662ead:src/style.css:1388-1403` ขึ้นกับมัน); sync ทันทีเมื่อ `matchMedia('(max-width: 860px)')` เปลี่ยน และจาก handler ของ play/live (`togglePlay` `:1662`, `toggleLiveFlight` `:1676`, `goLive` `:1713`); นอกจาก `aria-label`/`title` ของ `#mfb-play` แล้ว DOM ของแถบต้องเท่ากับฐานทุกเฟรมใน journey; การย้ายออกจาก frame loop ไม่อยู่ในขั้นนี้ (EQ-3, M-LAUNCH-024) |
| 3 | M-LAUNCH-011 (R2S:cam.intro) | P1 / XS / เปิด | bug-fix | `7662ead:src/i18n/en.ts:842`, `th.ts:825`, `ru.ts:823`; แสดงที่ `7662ead:src/ui/dialogs.ts:355` | unit test: `cam.intro` ของทุกภาษาต้องอ้างชื่อปุ่ม Cinematic (`ctl.camera.cinematic`) และต้องไม่มีประโยค "until the next phase" | ข้อความตรงกับ CameraPolicy; test ความครบของ i18n ผ่าน; ผู้อ่านภาษาไทยตรวจถ้อยคำ |
| 4a | M-PLATFORM-037 (CR:NEW-bundle-2 ส่วน `main.ts`) | P2 / S / เปิด | identical-output | `main.ts` constructor → `bindControls` → `applyLanguage()` (`7662ead:src/main.ts:1270`; ตอนเปลี่ยนภาษา `:1257`) | oracle: `body.innerHTML` ต้องเท่ากันทุกไบต์หลัง startup ที่ `#/`, `#/launch/explore`, `#/launch/engineer`, `#/build/watch`, `#/orbit/watch` ในสามภาษา; เปลี่ยนภาษาขณะส่วนนั้นซ่อนแล้วเปิดดู ต้องเท่ากับฐาน; ตัวนับ `render()`/`build()` ตอน startup ต้องลดลง (นับแบบ deterministic) | ก่อนทำต้องตรวจว่า render ไม่มี side effect (`onChange`/`preview`) ซึ่งต้องทำหลังขั้น 1; ใช้ stop rule ของ S07: ถ้า oracle ขยับ PR นี้ไม่ใช่ EQ |
| 4b | M-LAUNCH-025 (R2S:notation fan-out, CR:D14, CR:P29) | P1 / M / เปิด | bug-fix | `telemetry.ts` `notationControl` (`7662ead:src/ui/telemetry.ts:285`), `7662ead:src/ui/notation.ts:105`, `main.ts` `applyLanguage` (`7662ead:src/main.ts:1354`) ที่ `onNotationChange` เรียกซ้ำ (`:2605`), `7662ead:src/i18n/index.ts:20` `onLangChange` | DOM test: เปลี่ยน notation แล้ว focus ต้องอยู่ที่ select ต่อ (บนฐานหลุด); ตัวนับ: เปลี่ยนภาษาแล้ว `applyLanguage` รัน 1 ครั้ง (บนฐาน 2 ครั้ง) | เปลี่ยนป้ายเฉพาะข้อความที่ขึ้นกับ notation; `onLangChange` คืน unsubscribe; journey: เปลี่ยนภาษาในทุกส่วนแล้วไม่เหลือข้อความภาษาเก่า; ค่าที่เก็บไว้ไม่เปลี่ยน |
| 5 | M-LAUNCH-006 (CR:B12) | P3 / XS / เปิด | quality-improving | `telemetry.ts` `notationControl` | journey `notation-defaults`: หลังเลือก ISO/GOST เองแล้วต้องมีปุ่ม "กลับใช้ค่าตามภาษา" (บนฐานไม่มี) | เขียนค่า `auto`; สลับภาษาแล้ว notation ตามภาษา (D-34); vector, เครื่องหมาย และ CSV ไม่เปลี่ยน |
| 6 | M-LAUNCH-066 (RW:MOB-03) | P2 / XS / เปิด | bug-fix | `7662ead:src/style.css:1273` `.pwa-toast`, `#mobile-flight-bar` (`:1388-1403`) | journey ที่ 390×844: กล่อง toast ต้องไม่ทับแถบ (บนฐานทับ) | ข้อความและเวลาแสดงของ toast ไม่เปลี่ยน; แนบภาพก่อน/หลังให้เจ้าของ |
| 7 | M-LAUNCH-026 (R2S:CSS duplication) | P3 / XS / เปิด | identical-output | `7662ead:src/style.css:1084, 1381, 1413` (`@media` ซ้ำสามที่), กฎซ่อนที่ `:1372`/`:1412`; comment ผิดที่ใน `7662ead:src/ui/telemetry.ts:218-224` | oracle: snapshot ของ `getComputedStyle` ทุก element และ pixel hash ที่ 860/861/1180/1181 px (EN/TH) ต้องเท่ากัน; ไบต์ CSS ไม่เพิ่ม | รวมเฉพาะบล็อกที่ซ้ำกันตรงตัว ในตำแหน่งเดิม โดยคงลำดับ cascade |
| 8 | M-LAUNCH-032 (CR:NEW-UI-4, CR:D11) | P1 / XS / เปิด | realism-changing (เฉพาะจรวดที่ผู้ใช้ออกแบบ) | `7662ead:src/ui/panel.ts:1793` `defaultDynamics(this.state.vehicleId)` เทียบกับ `:1596, :1650, :1693, :1760, :1861` ที่ใช้ `missionVehicle(this.state)` | เริ่มจาก reproducer ยืนยันว่า `state.dynamics` เป็น undefined ได้ใน Engineer; test: จรวด custom ที่เปิด dispersion ต้องได้ `defaultDynamics(spec).model` (บนฐานได้ point-mass) | **ข้อมูลอ้างอิงและขอบเขตกำหนดก่อนรัน:** (1) จรวดใน catalogue ต้องได้ผลเท่าเดิมทุกบิต (ไบต์ CSV ของ Monte Carlo ที่ seed คงที่, `tests/d01-fleet-fingerprint.test.ts`, `dynamics-panel`, `dispersed-flight` และ `monte-carlo` test ไม่เปลี่ยน) tolerance = 0 (2) จรวด custom ทุก run ต้องใช้ model เดียวกับการบินเดี่ยวแบบ six-DOF ของจรวดนั้น ตรงตัว (3) P อนุมัติตารางก่อน/หลัง (model ที่ใช้, สัดส่วนสำเร็จ, apsides เฉลี่ย/σ, เวลาที่ใช้ต่อชุด ซึ่งต้องวัด เพราะ six-DOF ช้ากว่าแต่ถูกต้อง และหน้าต่างมี Stop อยู่แล้ว) บันทึกใน report |
| 9 | M-LAUNCH-004 (R2S:U16, PLAN:U16, CR:D24) | P1 / S / บางส่วน | feature (แสดงผลอย่างเดียว) | `7662ead:src/ui/hud.ts:963-965` (การ์ดย่อ), `7662ead:src/ui/onboard.ts:211` "THR CMD", แถว thrust `hud.ts:112`; reuse `ui/engine-levels.ts` | journey Soyuz-2.1a ที่ T+112 s ต้องเห็น "strap-ons 81 %" ใน HUD ย่อและ onboard ทั้ง live และ replay (บนฐานเห็นแค่ command) | ระดับจริงกับ command มาจาก `VisualFrame` เดียวกัน; kN มองเห็นที่ 1100×650 และ 1280×720; unit test ของ engine-levels ไม่เปลี่ยน; ไม่แก้ recorder; ไบต์ CSV ต้องเท่าเดิม (คอลัมน์ CSV อยู่กับ R4.2 / D-57); แนบภาพก่อน/หลัง |
| 10 | M-LAUNCH-022 (CR:P12(a), CR:NEW-UI-2, R2S:hidden cards) | P1 / S / เปิด | identical-output | `telemetry.ts` `update()` (`7662ead:src/ui/telemetry.ts:598`, ลูปวาด `:708-744`), `7662ead:src/ui/charts.ts:120-127`, `.card-off` (`7662ead:src/style.css:1411`) | oracle บันทึกบนฐานหลังขั้น 9 ครั้งเดียว: pixel และ DOM ของกราฟที่มองเห็น, ไบต์ PNG ของ chart export, ไบต์ CSV, output ของรายงาน; ตัวนับ `drawChart` (KPI-12: 3–7 → 0) | ข้ามเฉพาะ `draw(id)` ที่ `!visibleCards(layout).has(id)` หรือถูก `.simple-charts` ซ่อน; ทุกเส้นทางที่ทำให้กราฟกลับมาแสดง (pick, setEquationLevel, setView, setRange, setLayout, flex) ต้องวาดจาก frame ที่แสดงอยู่ก่อน paint ถัดไป ตรวจทีละเส้นทาง; test chart-summary และ chart-marker-export ต้องผ่านโดยไม่แก้ |

- **quality guard (OR-2):** ไม่เปลี่ยนฟิสิกส์ยกเว้นขั้น 8 ซึ่งมีขอบเขตตามข้างบน; ไม่ผ่อน test; ทุกขั้นที่เปลี่ยนภาพต้องให้เจ้าของอนุมัติภาพ; partial re-render ของ SetupPanel ถูกตัดออก (S02 §02.13 ข้อ 10)
- **หลักฐานที่ต้องส่ง:** report ต่อ PR ระบุ test ที่รันจริง, ผลการล้มบนฐาน, oracle ก่อน/หลัง และ `base_sha_verified_on`; ขั้น 8 แนบตาราง P; รายงานรวม `docs/development/reports/CO-4-r2-fixes.md`; แถว PROGRESS อัปเดตใน PR ที่ merge
- **execution_authorized:** false

#### CO-5 — ทำ journey ยอมรับ R2 ให้ครบ และเพิ่ม smoke slice ใน PR CI
- **เลน:** Q (เนื้อหา journey) + T (การเลือก smoke) **คลื่น:** K0 วันที่ 2–4 **ประมาณการ (หยาบ):** 1.5 agent-days, 1 PR **OR:** OR-2, OR-6
- **ขึ้นกับ:** preset ของ viewport จาก CO-3 PR1 **ปลดล็อก:** G2, GCO, เส้นทาง regression สำหรับ CO-4 และ PR ถัดไปที่แตะหน้าจอ Launch
- **ไฟล์ที่อนุญาต:** `tests/browser/journeys/r2-flight-shell.mjs`, journey ใหม่ `tests/browser/journeys/r2-shell-smoke.mjs` (`export const smoke = true`), `tests/browser/harness.mjs`, `scripts/verification/*` ถ้าต้องจัด shard ใหม่ (T)
- **ชนิดการเปลี่ยนต่อ PR:** quality-improving (journey และการเลือก smoke เท่านั้น ไม่แก้โค้ดแอป)

| รหัส | ที่มาเดิม | P | ขนาด | สถานะ | เรื่องและเหตุผล | เกณฑ์รับ | วิธีพิสูจน์ | ขึ้นกับ |
|---|---|---|---|---|---|---|---|---|
| M-LAUNCH-020 | R2S:R2.1–R2.4 acceptance, R2S:R2 journey in PR CI, R2S:R2.2 views per capability | P1 | S | บางส่วน | PR CI (`create-plan.mjs:19`, `browserInventory(mode==='ci')`) ไม่เคยรัน `r2-flight-shell` (timeout 420 s) ตลอด #75–#80 จึงไม่มี gate ป้องกัน regression ของ R2 | **smoke slice ≤60 s** ที่เป็น gate ของ PR: setup พับและฉากกว้างขึ้น, หยุดแล้วยังอยู่ใน flight, `#rigid-controls` และ `#toru-controls` อยู่ในจอ, chooser เปิดที่ 390 TH ได้ **journey เต็ม** (Pages mode) เพิ่ม: TORU/six-DOF เข้าถึงได้; chooser ที่ 320/390 ใน TH/RU (ไม่ล้น, แตะเลือกได้); แตะแท็บ Watch แบบ touch; ปุ่ม 1–4 เปลี่ยน view และตั้งเจ้าของเป็น manual; ภารกิจใหม่จับยานถูก; กล้องคงอยู่ต่อจนถึง Orbit phase (เดิมมีแค่ unit test); ผล Pages ของ `da67341` (37169459230 ผ่าน) อ้างใน CO-2 | sabotage run ต่อ assertion ใหม่ (เช่น ฉีด CSS ซ่อน `#toru-controls`, ทำให้ owner ไม่เปลี่ยน) แล้ว journey ต้องล้ม โดยไม่ commit ตัว sabotage; วัดเวลาที่เพิ่มต่อ shard ของ browser-smoke จาก ≥3 PR run และรายงานต่อ KPI-28 (ห้ามทิ้ง test อื่นเพื่อชดเชย การเร่ง CI อยู่ใน R7.3) | CO-3 PR1 |

- **ลำดับขั้น:**
  1. แยก slice ออกจาก `r2-flight-shell` โดยใช้ helper ร่วมกัน ไม่ copy โค้ด
  2. เพิ่ม assertion ของ journey เต็ม
  3. ทำ sabotage ทีละ assertion แล้วบันทึกผล
  4. รัน slice 3 รอบเพื่อดูเวลาและความเสถียร ถ้ามี flake ให้หาสาเหตุ ห้ามเพิ่ม timeout แบบไม่ดูสาเหตุ
  5. T จัดสมดุล shard ถ้าจำเป็น
- **หมายเหตุลำดับ:** assertion ที่จะผ่านได้หลัง fix เท่านั้น (ชื่อ `mfb-play`, LUI-01, Soyuz 81 %) อยู่ใน PR ของ CO-4 ขั้น 1, 2 และ 9 ในฐานะ test ที่ล้มก่อนแก้ CO-5 จึงไม่ merge journey ที่ล้มเข้าไป
- **execution_authorized:** false

#### CO-6 — ฐานหลักฐานฟิสิกส์บน SHA ที่ตรึงใน Day 0 (heavy เต็มชุด + six-DOF fleet + fingerprint)
- **เลน:** P + Q (เครื่องรัน) **คลื่น:** Day 0 ก่อน K0 วันที่ 1 (dispatch); รายงานในวันที่ 1–2 **ประมาณการ (หยาบ):** 1.5 agent-days, 1 PR (รายงาน) + เวลาเครื่อง heavy 25–61 นาที และ fleet ราว 2 ชม. 40 นาที **OR:** OR-2, OR-3, OR-6
- **ขึ้นกับ:** คำสั่งเริ่ม K0 ของเจ้าของ (D-65) และ main tip ที่ตรึงใน Day 0 (ณ as-of คือ `5f9aa2e`; ตรวจแล้วว่า `da67341…5f9aa2e` ไม่แตะ `src/physics`, `src/data`, worker, `tests/heavy`, `tests/sixdof-fleet` และ inventory heavy ยัง 33 ไฟล์ / 257 case) CO-1 แตะเฉพาะเครื่องมืองบ จึงไม่ต้องรอ CO-1 **ปลดล็อก:** **ทุกแพ็กเกจของเลน P** (harness ของ R0.4, EQ-9/10/11, R4.2/R4.3/R4.5, R5.2/R5.3, R8), ฐาน oracle ของ S07 และ KPI-22
- **ไฟล์ที่อนุญาต:** ไม่แก้โค้ด; `docs/development/reports/CO-6-physics-baseline.md` (ไฟล์ใหม่, merge ผ่าน I-train แบบ docs)
- **ชนิดการเปลี่ยนต่อ PR:** docs (รายงาน); การรันเองไม่ใช่ PR

| รหัส | ที่มาเดิม | P | ขนาด | สถานะ | เรื่องและเหตุผล | เกณฑ์รับ | วิธีพิสูจน์ | ขึ้นกับ |
|---|---|---|---|---|---|---|---|---|
| M-PHYSICS-001 | PROG:R0 row, R1.4-fuel report, DP:W0-2, DP:12-22, DP:13-05, RW:PHY-05, GH:run-36804343856, GH:run-36942933112 | P0 | S | เปิด | #68, #70 และ #71 (R1.4: เชื้อเพลิงจำกัด, basis ของ `targetAttitude` ใน `rigid/runtime.ts`) เปลี่ยนฟิสิกส์ร่วม แต่ยังไม่เคยมี heavy เต็มชุดบน main ที่มี #36 และยังไม่เคยมี fleet บน main ที่มี R1.4 | `heavy.yml` `workflow_dispatch suite=both` ใน Day 0 บน SHA ที่ตรึง ผ่าน heavy 33 ไฟล์ / 257 case (ตรง inventory `scripts/audit-heavy/heavy-expected.json`) + six-DOF fleet; ไฟล์ plan/report/union (R1.5) บันทึก commit, Node 22.23.3, Chromium version และ SHA-256 ของไฟล์ fingerprint/golden ทุกไฟล์; บันทึก hash ของ tree ที่เกี่ยวกับฟิสิกส์ (`src/physics`, `src/data`, workers, `tests/heavy`, `tests/sixdof-fleet`, lockfile, Node) ไว้ใช้ถ้า D-64 ได้รับการยอมรับ | union ไม่มี case หาย ซ้ำ หรือข้าม; **ถ้าแดงให้ bisect ห้าม re-record** (heavy: ระหว่าง `9f9f36a` กับ SHA; fleet: ระหว่าง `91ee372` กับ SHA) แล้วเปิด issue regression ระบุชื่อ case ก่อนเริ่มงานฟิสิกส์ใหม่ใด ๆ | — |

- **ลำดับขั้น:**
  1. Day 0: ตรึง SHA (main tip ณ เวลานั้น) และบันทึก hash ของ tree ที่เกี่ยวกับฟิสิกส์
  2. Day 0 ก่อน K0 วันที่ 1: dispatch `heavy.yml` `suite=both` บน SHA นั้น ยกเว้นกรณีเดียวในหัวข้อ "ประหยัดเวลาเครื่อง" ด้านล่าง ซึ่ง dispatch เฉพาะ `sixdof-fleet`
  3. รวมผลเป็น union แล้วตรวจ inventory 33/257 และ fleet ครบ
  4. ถ้าเขียว เขียนรายงานแล้ว merge เป็น docs ผ่าน I-train ถ้าแดง เปิด issue bisect ตามชื่อ case และแจ้ง H
  5. S07 ใช้ SHA นี้เป็นฐานของ oracle ทุกตัวใน R0.4
- **ประหยัดเวลาเครื่อง:** cron รายสัปดาห์ (`7 20 * * 0`) รันเฉพาะ heavy บน main tip วันอาทิตย์ 2026-10-04 เวลา 20:07Z (GitHub อาจเริ่มช้า) ใช้ผลนั้นแทนครึ่ง heavy ได้**ก็ต่อเมื่อ** `head_sha` ของ run เท่ากับ SHA ที่ตรึงตรงตัว และ union ครบ 33/257 จากนั้น dispatch เฉพาะ `sixdof-fleet` ถ้า SHA ไม่ตรง ห้ามใช้ผลนั้น และ dispatch `suite=both` (การใช้ผลข้าม SHA เป็นเรื่องของ D-64 ซึ่งยังไม่ตัดสิน) fleet ต้อง dispatch เสมอ เพราะ cron รายเดือน (`7 20 1 * *`) รอบถัดไปคือ 2026-11-01
- **quality guard:** รันอย่างเดียว ไม่แก้โค้ด golden หรือ tolerance (KPI-21 = 0); ถ้าแดง เลน P หยุดทั้งเลนจนกว่า bisect จะเสร็จ (S05 §05.13 ข้อ 12) ส่วน R4.1 (P-D วิจัย ไม่มีโค้ด runtime) ทำต่อได้
- **execution_authorized:** false

#### CO-7 — ตัดสินเรื่องชื่อสถาบัน (D-42) และแก้ขนาด XS
- **เลน:** H แล้ว L-C **คลื่น:** K0 วันที่ 1–4 **ประมาณการ (หยาบ):** 0.5 agent-day, 1 PR **OR:** OR-2 (ความซื่อตรงต่อการตัดสินใจ), OR-4
- **ขึ้นกับ:** D-42 (ชุด A) **ปลดล็อก:** GCO, ED-INST-2 (การทดลองใช้กับสถาบันต้องมีชื่อที่ถูกต้อง), HU-2
- **ไฟล์ที่อนุญาต:** `src/lessons/pack-sources/rtaf-academy.ts`, pack JSON ใต้ `public/lessons/` ที่สร้างใหม่ด้วย `scripts/lesson-packs.ts`, test ของ pack
- **ชนิดการเปลี่ยนต่อ PR:** decision (H) แล้ว bug-fix (L-C) — แก้ให้ตรงกับการตัดสินที่บันทึกไว้

| รหัส | ที่มาเดิม | P | ขนาด | สถานะ | เรื่องและเหตุผล | เกณฑ์รับ | วิธีพิสูจน์ | ขึ้นกับ |
|---|---|---|---|---|---|---|---|---|
| M-LEARNING-054 | OD:rtaf-academy naming, DP:13-08, DEC:D-2 | P0 | XS | เปิด | `rtaf-academy.ts:32,34` แสดง "Royal Thai Air Force Academy" และ "โรงเรียนนายเรืออากาศ" ใน UI ขัด DEC:D-2 (ห้ามใช้ชื่อหรือตราหน่วยงาน/สถาบันโดยไม่มีหนังสืออนุญาต) | มีหนังสืออนุญาตที่บันทึกเป็นการแก้ไข D-2 หรือเปลี่ยนชื่อชุดให้เป็นกลางในสามภาษา (เช่น "พลศาสตร์การบินอวกาศและระบบควบคุม — แลบระดับสถาบัน"); id ของ pack (`rtaf-academy`) และ id ของบทเรียนไม่เปลี่ยน; เกณฑ์และความคืบหน้าที่เก็บไว้ไม่เปลี่ยน; `reviewed:false` ไม่เปลี่ยน; ขอบเขตของการอ้างแหล่งข้อมูล (`:42–:50` อ้างเอกสารหลักสูตรสาธารณะของสถาบัน) ให้เจ้าของระบุใน D-42 ข้อเสนอคือคงไว้ในฐานะบรรณานุกรม | `scripts/lesson-packs.ts --check` ผ่าน (JSON ตรงกับต้นฉบับ); test แบบ deny-list ห้ามชื่อสถาบันในชื่อชุดที่แสดง เว้นแต่ DECISIONS บันทึกการอนุญาต (บนฐานต้องล้ม); test ที่ assert `reviewed:false` ผ่าน | D-42 |

- **ลำดับขั้น:**
  1. H ตอบ D-42 (เลือกระหว่างหนังสืออนุญาตกับชื่อกลาง และบอกขอบเขตของการอ้างแหล่ง)
  2. L-C เขียน test แบบ deny-list ก่อน แล้วยืนยันว่า test ล้มบนฐาน
  3. แก้ชื่อในสามภาษา (ผู้อ่านภาษาไทยตรวจถ้อยคำ)
  4. รัน `scripts/lesson-packs.ts` แล้วรัน `--check`
  5. รัน test ของ pack และ i18n แล้วเปิด PR ขนาด XS โดยใส่ diff ของ JSON ที่สร้างใหม่ไว้ในรายงาน
- **NAPA:** ชื่อ NAPA-2 ใน pack `ipst-physics` (`:164`) และใน template ของตัวออกแบบดาวเทียม เป็นชื่อดาวเทียมสาธารณะ ไม่ใช่ชื่อสถาบัน จึงไม่แก้ แต่บันทึกไว้ใน report ว่าตรวจแล้ว
- **execution_authorized:** false

#### CO-8 — รับแผน v2.0 เข้าใช้: ทะเบียนการตัดสินใจ, PROGRESS แบบแถวต่อแพ็กเกจ, ดัชนี, banner และขั้นตอนการทำงานต่อ session
- **เลน:** W ร่าง, I เปิด PR, H อนุมัติก่อน (ทำเป็นลำดับสุดท้ายของ K0) **ประมาณการ (หยาบ):** 2 agent-days, 2 PR **OR:** OR-4, OR-5, OR-6
- **ขึ้นกับ:** เจ้าของอนุมัติ v2.0 (บันทึกวันที่และคำพูด), CO-2 merge แล้ว (PROGRESS ตรงความจริงก่อนปรับรูปแบบ), D-59 **ปลดล็อก:** GCO, การปิด G0, KPI-31/33/35 (มี timestamp ของ lifecycle ให้ใช้)
- **ไฟล์ที่อนุญาต:** `docs/development/PLAN.md`, `docs/DECISIONS.md`, `docs/development/PROGRESS.md`, `docs/README.md`, `docs/development/SESSION-PROTOCOL.md` (ไฟล์ใหม่), เอกสารที่ได้ banner ตาม S19 App D; `.github/pull_request_template.md` แก้โดย T ใน train เดียวกัน; **ห้ามแตะ** `docs/ROADMAP-PART2-3.md`, `docs/SIXDOF-VEHICLE-DATA.md`, `T03-CURRICULA-RESEARCH.md`
- **ชนิดการเปลี่ยนต่อ PR:** PR1 docs (PLAN v2.0, DECISIONS, PROGRESS, README, protocol); PR2 docs (banner)

| รหัส | ที่มาเดิม | P | ขนาด | สถานะ | เรื่องและเหตุผล | เกณฑ์รับ | วิธีพิสูจน์ | ขึ้นกับ |
|---|---|---|---|---|---|---|---|---|
| M-PLATFORM-075 | OD:index, RW:DOC-12 | P2 | XS | เปิด | `docs/README.md` ยังเขียนว่า "the four modes" และไม่มี development/, DECISIONS หรือไฟล์ที่โค้ดอ่าน | รายการแรกคือ PLAN.md v2.0 ตามด้วยกฎลำดับความน่าเชื่อถือ (S00 §00.8), เอกสารอ้างอิงปัจจุบัน, ไฟล์ที่โค้ด/เทสต์อ่าน (รูปแบบห้ามเปลี่ยน) และบันทึกที่มีวันที่ | test ลิงก์และ repo-hygiene ผ่าน | CO-2 |
| M-PLATFORM-077 | DP:W0-5/CTX-QW-6, DP:12-01, DP:8-18, DP:7.4-M4, DP:P-7 | P2 | S | บางส่วน | ไม่มี tracker และไม่มี protocol; สถานะไม่ตรงความจริงทุกครั้งที่ merge (R1, R2, R3) | PROGRESS เขียนใหม่เป็นหนึ่งแถวต่อแพ็กเกจงาน (93 แถว ไม่นับ IDSCHEME/PRINCIPLE/DELIVERED/METRIC/REJECTED) คอลัมน์: แพ็กเกจ, lifecycle, ผู้อนุญาต/วันที่, merge SHA, CI run, Pages run, การยอมรับทางวิทยาศาสตร์ (ประวัติ R1–R3 อยู่ใต้ตาราง); `SESSION-PROTOCOL.md`: หนึ่งแถว (หรือ issue ถ้าเจ้าของต้องการ) ต่อแพ็กเกจ, branch ค้างเกิน 14 วันต้องปิดหรือ rebase, หนึ่งบรรทัด CHANGELOG ต่อ PR, แถวสถานะแก้ใน PR ที่ merge, "docs touched or N/A"; ข้อเสนอ `docs/development/registry.tsv` ที่สร้างจาก assignment (429 แถว) ให้เจ้าของเลือกว่าจะ commit หรือไม่ | audit KPI-31 หลัง merge; ตรวจ R2/R3 (#74–#80) ด้วย protocol นี้ย้อนหลัง | CO-2 |

- **เนื้อหาของ PR1:** PLAN.md v1.2 → v2.0 ที่ path เดิม (ไฟล์ v1.2 ยังอ้างได้ผ่าน SHA); DECISIONS ขยายเป็น D-28…D-66 สถานะ "proposed" หรือ "decided" ตามจริง และมีเพียงแถวที่เจ้าของยืนยันเท่านั้นที่เขียนว่า decided; แถว D-59 ปิด G0 พร้อมตาราง ADR ไปยังตำแหน่งใหม่ (S07 §07.6); ROADMAP-PART2-3 ไม่แตะ (test `section-plan` และ `section-nav-model` ต้องผ่านโดยไม่แก้)
- **ลำดับขั้น:**
  1. W ร่างจากไฟล์ส่วน S00–S19 ที่เจ้าของอนุมัติ
  2. I ตรวจว่าแถว PROGRESS ตรงกับตาราง audit ของ CO-2
  3. PR1 (docs) แล้วตามด้วย PR2 (banner)
  4. หลัง merge ตรวจ KPI-31 อีกครั้ง และบันทึก lifecycle timestamp แรก ซึ่งเป็นฐานของ KPI-33/35
- **banner:** ใช้ข้อความภาษาไทยตรงตัวและรายการเอกสารตาม S19 App D ไม่ย้ายหรือลบไฟล์ใด (การย้ายไปเก็บถาวรอยู่ใน R7.5)
- **ข้อจำกัดขนาดไฟล์ (เพิ่มหลังตรวจรวมเล่ม):** แผนฉบับรวมมีขนาดราว 2.3 MB แต่ `tests/repo-hygiene.test.ts` ไม่ยอมให้ไฟล์ใดนอก `public/` เกิน 1 MB ดังนั้น PR1 ต้องลง `docs/development/PLAN.md` เป็นหน้าดัชนี (S00, S01 และสารบัญ) และแยกส่วน S02–S19 เป็นไฟล์ละส่วนใต้ `docs/development/plan/` (ไฟล์ใหญ่สุดคือ S19 ราว 290 kB) ตาราง `$F` ที่เป็น `.tsv` ลงใต้ `docs/development/plan/data/` ได้เพราะไม่ใช่ evidence packet; ทุกไฟล์ต้องต่ำกว่า 1 MB และห้ามเพิ่มข้อยกเว้นใน `ALLOWED`
- **quality guard:** docs เท่านั้น เปิด PR ได้หลังเจ้าของอนุมัติ (OR-5); ไม่มี `.zip/.log/.docx/.pdf` ใต้ `docs/`
- **execution_authorized:** false

### 06.4 เกณฑ์ GCO กับแพ็กเกจที่ส่งหลักฐาน

เกณฑ์ทุกข้อนิยามไว้ใน S05 §05.4 ตารางนี้บอกเพียงว่าใครส่งหลักฐานอะไร

| เกณฑ์ GCO (S05) | แพ็กเกจ | หลักฐาน | ชนิด | ผู้ลงนาม |
|---|---|---|---|---|
| main tip ณ วันปิด เผยแพร่จาก exact source | CO-1 | Pages run + deployment record ของ SHA ปิดคลื่น | E | I เตรียม, H |
| PROGRESS, รายงาน R2/R3 และ CHANGELOG ตรงกับ GitHub | CO-2 (+ CO-8) | ตาราง audit #71–#83 ใน `CO-2-closeout.md` รวมแถว G3 และคำของเจ้าของตรงตัว; KPI-31; diff ของ IMPLEMENTATION-STATUS | E | I, Q ตรวจ |
| G2 ลงนามและลงวันที่ใน DECISIONS.md | CO-3 (+ CO-5, CO-4 ขั้น 1 ตามเกณฑ์ G2) | แถว D-36.A1…A5, D-39, hash ของชุดภาพ | H | H |
| LUI-01 แก้แล้วพร้อม test ที่ล้มก่อนแก้ | CO-4 ขั้น 1 | ผลล้มบนฐาน + ผลผ่าน; journey | E | Q / agent ที่สอง |
| journey R2 อยู่ใน smoke slice ของ PR CI พิสูจน์ด้วย sabotage | CO-5 | run id ของ PR CI ที่มี slice; บันทึก sabotage | E | Q |
| ผล heavy + fleet บน SHA ที่ตรึงใน Day 0 ถูกบันทึก (แดง → issue bisect) | CO-6 | plan/report/union + run ids | S + E | P, Q |
| D-42 ได้คำตอบและแก้ตามนั้น | CO-7 | แถว D-42; `--check` ผ่าน | H + E | H |
| เจ้าของรับรอง v2.0 และ CO-8 merge แล้ว | CO-8 | วันที่/คำพูดของการอนุมัติ; SHA ที่ merge | H | H |

**KPI ที่คลื่นนี้ส่งค่าแรกให้แถว GK0** (นิยามและเป้าอยู่ใน S04; ส่งเฉพาะค่าที่วัดได้จริง ค่าที่ยังไม่ได้วัดเขียนว่า "ต้องวัด")

| KPI | ค่าที่คลื่นนี้ต้องส่ง | แพ็กเกจ |
|---|---|---|
| KPI-03 | ไบต์ precache ฝั่งโค้ดกับฝั่งข้อมูลแยกกัน ทั้งบน PR CI และหลัง refresh | CO-1 |
| KPI-30 | จำนวนการขึ้นเพดานที่ไม่มี offset (ตารางย้อนหลังตั้งแต่ R1 ถึง #80) | CO-1, CO-2 |
| KPI-31 | สัดส่วนแถว PROGRESS ที่ตรงกับ GitHub | CO-2, CO-8 |
| KPI-14 | M-LAUNCH-027 = 0 ที่ GCO | CO-4 ขั้น 1 |
| KPI-12 | จำนวนกราฟที่ซ่อนแต่ยังถูกวาด (ค่าแรกส่งเมื่อขั้น 10 merge ใน K1–K2) | CO-4 ขั้น 10 |
| KPI-22 | heavy + fleet บน SHA ที่ตรึงใน Day 0 | CO-6 |
| KPI-28 | เวลา PR CI ที่เพิ่มจาก smoke slice | CO-5 |
| KPI-35 | เวลาที่ใช้ตัดสินแต่ละข้อของชุด A เทียบกับ needed_by | CO-3, CO-7 (บันทึกโดย I) |

### 06.5 นอกขอบเขตของคลื่นนี้

| งาน | ทำไมไม่อยู่ใน CO | บ้าน |
|---|---|---|
| R1.6 storage hardening และ FX-1…FX-8 (รวม M-LAUNCH-028/029/031/034) | เป็นความปลอดภัยข้อมูลนอก R2; เริ่ม K1 ตาม D-63 | S10 |
| R2.1r (M-LAUNCH-002/003, M-PLAN-009/015), R2.2r (M-LAUNCH-012/061, M-PLAN-021), R2.3s2 (M-LAUNCH-014), R2.5 (M-LAUNCH-050…059), R2.6 (M-LAUNCH-062) | ต้องรอ G2 (CO-3); เป็นงาน feature/quality ใหม่ | S11 |
| R3+ ต่อยอด (R3.0, R3.1r, R3.2r–R3.5r, R3.6) | ไม่ gate อะไร; อนุญาตรายคลื่นตาม D-65; อยู่ใต้กติกา D-38 และคิว I-train (§06.2) | S12 |
| EQ-3 M-LAUNCH-024 (งานต่อเฟรมของ `syncLifecycle`/chooser) | PR identical-output ถัดจาก CO-4 ขั้น 10 | S09 |
| oracle kit, perf gate และ harness ฟิสิกส์บนฐานของ CO-6 | R0.4 ใช้ SHA ของ CO-6 เป็นฐาน | S07 |
| คอลัมน์ CSV ระดับเครื่องยนต์จริง; Docking preset; อุปกรณ์จริง | D-57 / R4.2; D-58 / R5.4; HU-6 | S13, S15, S16 |
