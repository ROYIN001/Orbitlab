## S19 ภาคผนวก: ตาราง ID coverage แผนที่รหัสเดิมสู่ใหม่ รายการที่ปฏิเสธ/เลื่อน/ถูกแทนที่ และเอกสารที่ถูกแทนที่

> **ส่วนนี้สร้างด้วยสคริปต์ ห้ามแก้ตารางด้วยมือ** ตารางทุกตารางมาจาก `gen_appendix.py` ซึ่งอ่าน `assignment.tsv`, `packages.tsv`, `decisions.tsv` (สร้างโดย `gen_final.py`) และฟิลด์ `sources`, `status_evidence`, `title_th` ของ ledger รวม 6 ฉบับ (`unified-*.jsonl`) รวมถึง ledger ต้นทาง 7 ฉบับสำหรับแผนที่ย้อนกลับ ข้อความที่เป็นบทบรรณาธิการ (คำตัดสินข้อขัดแย้ง เหตุผลของรายการที่ปิด การกระทำต่อเอกสาร) อยู่ในสคริปต์เป็นข้อมูล และทุก id ที่ข้อความนั้นอ้างถูกตรวจกับตารางทุกครั้งที่รัน ถ้าตารางต้นทางเปลี่ยน ให้รัน `python3 gen_final.py && python3 gen_appendix.py` ใหม่ ไม่แก้ไฟล์นี้เอง เมื่อรับเข้า repo (CO-8) ตารางนี้คือแผนที่ถาวร และ `docs/development/registry.tsv` ที่ CO-8 เสนอสร้างจากแหล่งเดียวกัน

**ส่วนนี้มีอะไร**
- **App A** ความครอบคลุม: รายการทั้ง 429 รายการ ไปถึงแพ็กเกจ ส่วน คลื่น และเลนใด พร้อม id เดิมที่มีคำนำหน้า และดัชนีแพ็กเกจ
- **App B** แผนที่รหัสเดิมสู่ใหม่: ส่วนของ PLAN v1.2, รหัส R/U/A/D/W/G, ตระกูลรหัสของ ROADMAP, DEVELOPMENT-PLAN-TH และ REMAINING-WORK-TH, ตารางเปลี่ยนชื่อ และดัชนีย้อนกลับของ id ใน code review (CR:) และ R2 status (R2S:)
- **App C** รายการที่ปิดหรือเลื่อน: 15 รายการที่ส่วนนี้เป็นบ้าน รายการเลื่อนทั้งหมดพร้อมเงื่อนไขเริ่ม ข้อขัดแย้งที่ตัดสินแล้ว ข้อเสนอของรอบตรวจทานที่ไม่รับ และข้อสังเกตที่ยังไม่มี id
- **App D** การเลิกใช้เอกสาร: การกระทำหนึ่งอย่างต่อเอกสาร ข้อความ banner ตรงตัว ข้อขัดแย้ง C1–C16 กฎสุขอนามัย และคำยืนยันว่าไม่ลบไฟล์ใด

**สถานะเป็นสถานะหลัง refresh 2026-10-04** (ledger ตรวจบน `da67341`; รายการที่ #75–#83 แตะตรวจซ้ำบน `5f9aa2e`, `refresh/r3-audit.tsv`); Day 0 ตรวจซ้ำเฉพาะเมื่อ main ขยับเกิน `5f9aa2e` (S05 §05.0 ข้อ b)

### App A — ความครอบคลุมของรหัส (ID coverage)

#### A.1 คำยืนยันความครอบคลุม

- **รายการทั้งหมด 429 รายการ** = 398 รายการจาก ledger รวม 6 ฉบับ + 31 รายการใหม่ `M-PLAN-001…031`
- **สถานะ:** เปิด (open) 277 · บางส่วน (partial) 63 · เสร็จ (done) 59 · เลื่อน (deferred) 16 · ถูกแทนที่ (superseded) 11 · ปฏิเสธ (rejected) 3
- **แพ็กเกจ:** `packages.tsv` มี 100 แถว = 98 แพ็กเกจ + แพ็กเกจเทียม 2 แถว (R4.2-S ชุดย่อย Soyuz ที่รายการยังอยู่ใน R4.2; I-HOOKS hook ของ I-train) ในจำนวนนี้ 94 แถวมีงานที่นับ PR และ 6 แถวไม่ใช่งาน (DEC, DELIVERED, IDSCHEME, METRIC, PRINCIPLE, REJECTED)
- **แถว alias:** 5 แถว (M-LEARNING-038 = M-BUILD-031, M-PLATFORM-070 = M-PHYSICS-041, M-LAUNCH-077 = M-PHYSICS-042, M-LAUNCH-078 = M-PHYSICS-043, M-LAUNCH-079 = M-PHYSICS-044) แต่ละแถวเป็นตัวชี้ไปยังรายการหลัก งานนับครั้งเดียวที่รายการหลัก (สเปกของส่วนนี้เขียนว่า 5 แถว และนับ M-PLATFORM-070 แยกไว้ใต้ M-PHYSICS-041 จำนวนในตารางคือ 6)
- **ไม่มีบ้าน:** 0 รายการ · **มีบ้านซ้ำ:** 0 รายการ · **ประมาณการรวม:** 380 PR และ 1074.5 agent-days (แรงงาน ไม่ใช่ระยะเวลา) ตัวเลข "~360 PR" ของร่างสถาปัตยกรรมคิดก่อนเพิ่ม I-HOOKS, R4.2-S และก่อนนับ CO-4 เป็น 11 PR ห้ามคัดลอกตัวเลขใดจากที่นี่ไปใช้โดยไม่รันใหม่

ผลการรัน `gen_final.py` ครั้งล่าสุด (คัดลอกตรงตัว):

```
rows 429 ledger 398 new 31 {'open': 277, 'partial': 63, 'done': 59, 'deferred': 16, 'rejected': 3, 'superseded': 11}
packages 100 work packages 94 PR estimate 380
by section {'S00': 2, 'S02': 8, 'S03': 55, 'S04': 5, 'S06': 22, 'S07': 14, 'S08': 20, 'S09': 51, 'S10': 49, 'S11': 19, 'S12': 19, 'S13': 30, 'S14': 11, 'S15': 14, 'S16': 61, 'S17': 34, 'S19': 15}
PROBLEMS: 0
```

#### A.2 ตารางนับ

**ส่วน × สถานะ**

| ส่วน | เปิด | บางส่วน | เสร็จ | เลื่อน | ถูกแทนที่ | ปฏิเสธ | รวม |
|---|---|---|---|---|---|---|---|
| S00 | 2 |  |  |  |  |  | 2 |
| S02 |  | 4 | 4 |  |  |  | 8 |
| S03 |  |  | 55 |  |  |  | 55 |
| S04 | 2 | 3 |  |  |  |  | 5 |
| S06 | 17 | 5 |  |  |  |  | 22 |
| S07 | 12 | 2 |  |  |  |  | 14 |
| S08 | 16 | 1 |  | 3 |  |  | 20 |
| S09 | 47 | 3 |  | 1 |  |  | 51 |
| S10 | 46 | 3 |  |  |  |  | 49 |
| S11 | 16 | 3 |  |  |  |  | 19 |
| S12 | 14 | 3 |  | 2 |  |  | 19 |
| S13 | 24 | 6 |  |  |  |  | 30 |
| S14 | 11 |  |  |  |  |  | 11 |
| S15 | 8 | 4 |  | 2 |  |  | 14 |
| S16 | 38 | 16 |  | 7 |  |  | 61 |
| S17 | 24 | 10 |  |  |  |  | 34 |
| S19 |  |  |  | 1 | 11 | 3 | 15 |
| **รวม** | 277 | 63 | 59 | 16 | 11 | 3 | 429 |

**ความสำคัญ × สถานะ** ("-" = รายการที่เสร็จหรือถูกแทนที่และไม่มีลำดับความสำคัญ)

| ความสำคัญ | เปิด | บางส่วน | เสร็จ | เลื่อน | ถูกแทนที่ | ปฏิเสธ | รวม |
|---|---|---|---|---|---|---|---|
| P0 | 8 | 1 | 1 |  |  |  | 10 |
| P1 | 57 | 11 | 4 |  |  |  | 72 |
| P2 | 125 | 30 | 1 | 2 | 2 |  | 160 |
| P3 | 87 | 21 | 3 | 14 | 1 | 3 | 129 |
| - |  |  | 50 |  | 8 |  | 58 |

**กลุ่ม × ส่วน** (จำนวนรายการของแต่ละกลุ่ม M ในแต่ละส่วนที่เป็นบ้าน)

| กลุ่ม | S00 | S02 | S03 | S04 | S06 | S07 | S08 | S09 | S10 | S11 | S12 | S13 | S14 | S15 | S16 | S17 | S19 | รวม |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| LAUNCH |  | 1 | 11 | 1 | 14 |  | 1 | 17 | 6 | 16 | 6 | 4 |  | 1 | 5 | 1 | 3 | 87 |
| ORBIT |  | 2 | 16 |  |  |  | 2 | 10 | 8 |  |  | 2 | 5 | 9 | 5 | 4 | 3 | 66 |
| BUILD |  |  | 12 |  |  | 2 | 1 | 5 | 5 |  | 9 | 5 |  |  |  | 1 |  | 40 |
| LEARNING |  | 2 | 6 | 1 | 1 |  | 2 | 3 | 6 |  | 1 |  |  |  | 49 | 4 | 1 | 76 |
| PHYSICS |  | 1 | 3 | 1 | 1 | 3 | 2 | 7 |  |  |  | 18 | 5 | 1 |  | 1 | 4 | 47 |
| PLATFORM | 2 | 2 | 7 | 2 | 5 | 1 | 8 | 7 | 22 |  |  | 1 |  |  | 1 | 21 | 3 | 82 |
| PLAN |  |  |  |  | 1 | 8 | 4 | 2 | 2 | 3 | 3 |  | 1 | 3 | 1 | 2 | 1 | 31 |

**ชนิดของรายการใน ledger** (ชนิดของ PR กำหนดแยกในส่วนที่เป็นบ้าน ตาม S18 §18.5)

| ชนิด | จำนวน |
|---|---|
| feature | 84 |
| bug | 54 |
| realism | 43 |
| process | 35 |
| decision | 33 |
| perf | 31 |
| test | 31 |
| docs | 23 |
| ux | 21 |
| perf-identical | 16 |
| architecture | 14 |
| principle | 9 |
| quality | 9 |
| refactor | 7 |
| a11y | 6 |
| efficiency | 4 |
| metric | 4 |
| perf-tradeoff | 2 |
| pedagogy | 1 |
| risk | 1 |
| wont-do | 1 |

#### A.3 ตาราง forward ของ 429 รายการ (แยกตามกลุ่ม)

คอลัมน์: **รหัส** · **สถานะ** · **P** ความสำคัญ · **ขนาด** (XS 0.5, S 1.5, M 4, L 8, XL 15 agent-days) · **ชนิด** · **แพ็กเกจ** · **ส่วน** · **คลื่น** · **เลน** · **alias ของ** · **ชื่อย่อ** (จาก `title_th`) · **id เดิม** (มีคำนำหน้าตาม S00 §00.6; แสดงไม่เกิน 6 ตัวแล้ว "+n" รายการเต็มอยู่ในฟิลด์ `sources` และใน App B) · **หมายเหตุ** (การตัดสินใจที่ `decisions.tsv` ผูกกับรายการ; แพ็กเกจที่สองของรายการที่แยก)

##### A.3.1 M-LAUNCH (87 รายการ: เปิด 54, บางส่วน 15, เสร็จ 11, เลื่อน 4, ถูกแทนที่ 2, ปฏิเสธ 1)

| รหัส | สถานะ | P | ขนาด | ชนิด | แพ็กเกจ | ส่วน | คลื่น | เลน | alias ของ | ชื่อย่อ | id เดิม | หมายเหตุ |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| M-LAUNCH-001 | เสร็จ | - | - | feature | DELIVERED | S03 | - | - |  | R2.1 สถานะ Setup/Flight/Analysis; ซ่อนแผงตั้งค่าเมื่อปล่อยจรวด (U11)… | R2S:R2.1, R2S:U11, R2S:R2, PLAN:U11 |  |
| M-LAUNCH-002 | บางส่วน | P1 | M | ux | R2.1r | S11 | K2 | U+I (C render) |  | R2.1 ส่วนที่เหลือ: ย่อแถบคำสั่ง/เล่นซ้ำ, เลย์เอาต์ช่วง Analysis, กรณีจอเตี้ย… | R2S:R2.1, R2S:U02, RW:INF-18, PLAN:U02 |  |
| M-LAUNCH-003 | บางส่วน | P2 | M | ux | R2.1r | S11 | K2 | U+I (C render) |  | จัดกลุ่ม telemetry แบบสรุปก่อน รายละเอียดเมื่อขอ | R2S:R2.1, PLAN:R2.1 |  |
| M-LAUNCH-004 | บางส่วน | P1 | S | feature | CO-4 | S06 | K1-K2 | I/U (P reviews 032) |  | U16 ให้ครบ: แสดงระดับเครื่องยนต์จริงใน HUD แบบย่อและ onboard, แสดงแรงขับ kN… | R2S:R2.1, R2S:U16, PLAN:U16, CR:D24 |  |
| M-LAUNCH-005 | เสร็จ | - | - | feature | DELIVERED | S03 | - | - |  | ย้ายตัวเลือกสัญกรณ์ไปแผง telemetry ระหว่างบิน; ค่าเริ่มต้นตามภาษา (U09/D06) | R2S:R2.1, PLAN:U09, PLAN:D06 |  |
| M-LAUNCH-006 | เปิด | P3 | XS | ux | CO-4 | S06 | K1-K2 | I/U (P reviews 032) |  | สัญกรณ์: ปุ่มกลับไปใช้ค่าเริ่มต้นตามภาษา หลังเลือก ISO/GOST เอง | CR:B12 |  |
| M-LAUNCH-007 | เสร็จ | - | - | feature | DELIVERED | S03 | - | - |  | A04 แถบควบคุมการบินบนมือถือ (นาฬิกา live/replay เล่น/หยุด) ขณะอ่านกราฟ | R2S:R2.1, R2S:A04, PLAN:A04, DP:UX-H3-4/PED-H6-6 |  |
| M-LAUNCH-008 | เปิด | P1 | XS | bug | CO-4 | S06 | K1-K2 | I/U (P reviews 032) |  | ปุ่มเล่นของแถบมือถือไม่มีชื่อสำหรับโปรแกรมอ่านหน้าจอขณะหยุด และไม่เปลี่ยนภาษา | R2S:R2, CR:D14 |  |
| M-LAUNCH-009 | เสร็จ | - | - | feature | DELIVERED | S03 | - | - |  | คงนาฬิกาสองตัวและคีย์ลัด; รายการ/ช่องที่โฟกัสไม่ส่งคำสั่งการบิน | R2S:R2.1 |  |
| M-LAUNCH-010 | เสร็จ | - | - | feature | DELIVERED | S03 | - | - |  | CameraPolicy: เลือกและคงมุมกล้องใน Watch/Launch; Cinematic คืนอัตโนมัติ… | R2S:R2.2, R2S:U03, PLAN:U03, PLAN:U08 |  |
| M-LAUNCH-011 | เปิด | P1 | XS | bug | CO-4 | S06 | K1-K2 | I/U (P reviews 032) |  | ข้อความกล่องเลือกกล้องล้าสมัย ขัดกับพฤติกรรม R2.2 | R2S:R2, R2S:R2.2 |  |
| M-LAUNCH-012 | เปิด | P3 | XS | ux | R2.2r | S11 | K2 | C+I |  | เมื่อกล้องสลับไปมุมสำรอง ไม่มีข้อความแจ้งผู้ใช้ | R2S:R2.2 |  |
| M-LAUNCH-013 | เสร็จ | - | - | feature | DELIVERED | S03 | - | - |  | R2.3 ขั้น 1: ชุดการ์ด telemetry (Flight/Dynamics/Orbit/All/Custom)… | R2S:R2.3, R2S:U10, PLAN:U10 |  |
| M-LAUNCH-014 | เปิด | P2 | L | feature | R2.3s2 | S11 | K2-K3 | U |  | R2.3 ขั้น 2: จัดวาง/ปรับขนาด/เรียงแผงโดยต่อยอด hudlayout.ts พร้อมคีย์บอร์ด… | R2S:R2.3, R2S:R2.2, R2S:U10, CR:D7, DP:section-7.2-principles |  |
| M-LAUNCH-015 | เลื่อน | P3 | S | feature | R5.4 | S15 | K5 | P-R/B+P (I) |  | ชุดการ์ดสำหรับการเทียบท่า | R2S:R2.3, PLAN:R2.3 | D-58 |
| M-LAUNCH-016 | เสร็จ | - | - | feature | DELIVERED | S03 | - | - |  | R2.4 ตัวเลือกเหตุการณ์บนไทม์ไลน์ที่ซ้อนกัน (A05) | R2S:R2.4, R2S:A05, PLAN:A05 |  |
| M-LAUNCH-017 | บางส่วน | P2 | XS | decision | CO-3 | S06 | K0 | H+I (Q screenshots) |  | R2.4 กติกา replay: แสดงเหตุการณ์หลังเคอร์เซอร์ได้หรือไม่ (รอเจ้าของตัดสิน) | R2S:R2.4 | D-39 |
| M-LAUNCH-018 | เปิด | P0 | S | decision | CO-3 | S06 | K0 | H+I (Q screenshots) |  | ด่าน G2 และการตัดสินใจ D08: เจ้าของยืนยันเลย์เอาต์ ชุดการ์ด ขนาดฉากขั้นต่ำ… | R2S:R2, R2S:R2.2, PLAN:D08, PLAN:G2 | D-36 |
| M-LAUNCH-019 | เปิด | P1 | M | test | CO-3 | S06 | K0 | H+I (Q screenshots) |  | เมทริกซ์อุปกรณ์/ขนาดจอ/เบราว์เซอร์สำหรับหน้าปล่อยจรวด รวมโปรเจกเตอร์ 1280x720… | R2S:R2, R2S:R2.3, RW:INF-18, DP:12-08, DP:12-15, OD:§7.5 / README limits +1 |  |
| M-LAUNCH-020 | บางส่วน | P1 | S | test | CO-5 | S06 | K0 | Q+T |  | ทำ journey ยอมรับ R2 ให้ครบ และเพิ่มชุด smoke ใน PR CI | R2S:R2.1, R2S:R2.2, R2S:R2.3, R2S:R2.4, R2S:R2 |  |
| M-LAUNCH-021 | เสร็จ | P0 | XS | docs | DELIVERED | S03 | - | - |  | บันทึกการ merge/CI/deploy ของ R2 ใน PROGRESS.md และรายงาน R2 | R2S:R2 | done 2026-10-04 (PROGRESS on 5f9aa2e lists R2.1-R2.4 verified/merged/published; R2-workspace.md status verified/merged/published; Pages 37169459230) |
| M-LAUNCH-022 | เปิด | P1 | S | perf-identical | CO-4 | S06 | K1-K2 | I/U (P reviews 032) |  | ไม่วาดกราฟ telemetry ที่ถูกซ่อน (การ์ดที่ปิด และกราฟที่ไม่ได้เลือกใน Explore) | CR:P12, CR:NEW-UI-2, R2S:R2 |  |
| M-LAUNCH-023 | เปิด | P2 | M | perf-identical | EQ-12 | S09 | K2-K3 | I/U |  | ข้ามการคำนวณ telemetry เมื่อหยุด/ข้อมูลไม่เปลี่ยน, รวบการอ่าน layout… | CR:P12, CR:NEW-UI-3 | + MissionResult suggestion DOM rebuilt every 0.5 s although the memo returns the same object (mission-result.ts:170-189) [R3CR-10] |
| M-LAUNCH-024 | เปิด | P2 | S | perf-identical | EQ-3 | S09 | K2 | I+C |  | ลดงาน DOM/การจองหน่วยความจำต่อเฟรม ใน frame()/updateVisuals และส่วน R2 | CR:P24, RW:LUI-13, R2S:R2 | + #77 idle work: syncSteps polls panel.isValid() at 4 Hz on setup (main.ts:1492-1525) [R3CR-09]. Replacing the poll with a version counter is NOT identical-output (chip may update sooner; a missed writer leaves it stale): separate quality-improving PR outside the EQ-3 identical-output PR; proof = list every writer of panel state/validity (language change, Build store spec edit, profile switch, MCP configure_mission, applySuggestion, ...) with one test per writer that the version bumps, plus a sabotage test (remove one bump -> a test fails); counter stays 0 over 10 s idle. The 2 Hz result-card suggestion rebuild belongs to M-LAUNCH-023 |
| M-LAUNCH-025 | เปิด | P1 | M | bug | CO-4 | S06 | K1-K2 | I/U (P reviews 032) |  | การเปลี่ยนภาษา/สัญกรณ์กลางการบินสร้าง UI ใหม่ทั้งหมด (โฟกัสหลุด) และเรียกซ้ำ | R2S:R2, CR:D14, CR:P29 |  |
| M-LAUNCH-026 | เปิด | P3 | XS | quality | CO-4 | S06 | K1-K2 | I/U (P reviews 032) |  | รวม CSS media query ที่ซ้ำจาก R2 และคอมเมนต์ที่หลงตำแหน่ง | R2S:R2 |  |
| M-LAUNCH-027 | เปิด | P0 | S | bug | CO-4 | S06 | K0 | I/U (P reviews 032) |  | "ใช้กับการปล่อยครั้งถัดไป" ขณะหยุดการบินชั่วคราว… | DP:LUI-01, RW:LUI-01, RW:§12:LUI-01 | CO-4 step-1 reproducer also drives #77 panel-reload paths openTemplate (5f9aa2e:src/main.ts:1147) and applySuggestion (:1582) with a paused live flight; guard still main.ts:560 |
| M-LAUNCH-028 | เปิด | P1 | S | bug | FX-4 | S10 | K2 | T+P (O,B,I adopt) |  | ข้อผิดพลาดของ physics worker/preview เงียบหาย: แสดงสถานะ 3 ภาษา… | DP:LUI-05, RW:LUI-05, RW:§12:LUI-05 |  |
| M-LAUNCH-029 | เปิด | P2 | S | bug | FX-5 | S10 | K1-K2 | I/U (P reviews) |  | ตารางเปรียบเทียบคอลัมน์ "ปัจจุบัน" อ่านค่าจากการจำลองสด ไม่ใช่เฟรมที่แสดง | RW:LUI-10 |  |
| M-LAUNCH-030 | บางส่วน | P2 | S | bug | R3.1r | S12 | K3 | I (via I-train; seam 2 if D-62) |  | รายงาน/ป้ายอ้างอิง/ส่งต่อไป Orbit ใช้ค่าจากแผงตั้งค่า ไม่ใช่ค่าที่บินจริง | RW:LUI-11, PLAN:R3.1 |  |
| M-LAUNCH-031 | เปิด | P1 | S | bug | FX-5 | S10 | K1-K2 | I/U (P reviews) |  | ตารางผลภารกิจแสดง apsides แบบ osculating เป็น "นอกช่วง" ขณะที่ผลตัดสินว่า… | RW:PHY-19, PLAN:R4.3 | แยกสองแพ็กเกจ: ส่วน UI ที่ FX-5 (บ้าน); ส่วนฟิสิกส์ใน R4.3 PR 4 (S13) |
| M-LAUNCH-032 | เปิด | P1 | XS | bug | CO-4 | S06 | K1-K2 | I/U (P reviews 032) |  | การเปิด dispersed flight ของจรวดที่ออกแบบเอง สร้างโมเดล point-mass ผิด | CR:NEW-UI-4, CR:D11 |  |
| M-LAUNCH-033 | ปฏิเสธ | P3 | S | perf-identical | REJECTED | S19 | - | - |  | การเรนเดอร์แผงตั้งค่าบางส่วน | CR:P29 |  |
| M-LAUNCH-034 | เปิด | P2 | XS | bug | FX-5 | S10 | K2 | I/U (P reviews) |  | CSV ของ Monte Carlo: ใช้ downloadBlob ร่วม, ใส่เครื่องหมายคำพูดให้ \r… | CR:NEW-UI-5 | D-45 |
| M-LAUNCH-035 | เปิด | P3 | S | ux | FX-5 | S10 | K1-K2 | I/U (P reviews) |  | สถานะ "ล้มเหลว" ของ Monte Carlo ไม่มีสไตล์; auto-tune ไม่แสดงเปอร์เซ็นต์ | OD:S7 handoff |  |
| M-LAUNCH-036 | เปิด | P2 | S | perf-identical | EQ-12 | S09 | K2-K3 | I/U |  | โมดูลจัดรูปแบบกลาง: แคช Intl ตามภาษา และตัวจัดรูปเวลาแบบระบุโหมด… | CR:P23, CR:D5, RW:I18N-06 | + 5 R3 local formatters (satellite-diagrams-svg.ts:23, panel.ts:411 not equal to dom.num, mission-result.ts:175, design-ref-text.ts:13, satellite-svg.ts:149) and a second utc() copy [R3CR-02] · D-46 |
| M-LAUNCH-037 | เปิด | P3 | S | quality | EQ-12 | S09 | K2-K3 | I/U |  | ตัวช่วยกำหนดขนาด canvas และโทนสีกราฟร่วมกัน | CR:D6 |  |
| M-LAUNCH-038 | เปิด | P3 | S | quality | EQ-12 | S09 | K2-K3 | I/U |  | ตาราง CHART_DEFS เดียวสำหรับกราฟสด รายงาน และเส้นอ้างอิง | CR:D24, R2S:§5 |  |
| M-LAUNCH-039 | เลื่อน | P3 | XS | decision | DEC | S08 | K0-K4 | H (I records) |  | touch-action:none บนฉาก 3 มิติ: คงไว้ และทบทวนเมื่อมีหลักฐานจากอุปกรณ์จริง | CR:B11, R2S:§5 |  |
| M-LAUNCH-040 | เปิด | P2 | M | perf-identical | EQ-3 | S09 | K2 | I+C |  | เมื่อหน้าอื่นบังฉากบิน ข้ามเฉพาะงานภาพที่คำนวณใหม่ได้ทั้งหมด… | CR:P6, R2S:§5 |  |
| M-LAUNCH-041 | เปิด | P1 | M | perf-identical | EQ-2 | S09 | K1-K2 | C+I |  | การสร้างฉากใหม่เมื่อกดปล่อย/แก้ค่า: เก็บทรัพยากรที่ไม่เปลี่ยน… | CR:P11, CR:NEW-render-1, CR:NEW-render-3, CR:D23, PB:launchEnter/flightStart dupli… |  |
| M-LAUNCH-042 | เปิด | P2 | S | perf-identical | EQ-2 | S09 | K1-K2 | C+I |  | คอมไพล์เชดเดอร์ล่วงหน้าสำหรับชุดแสงที่จะเปลี่ยนระหว่างบิน (ไฟฐานปล่อยหาย… | CR:P13 |  |
| M-LAUNCH-043 | เปิด | P2 | S | perf-identical | EQ-3 | S09 | K2 | I+C |  | ควันไอเสีย: คำนวณลมแบบไม่จองหน่วยความจำ และข้ามการอัปโหลดเมื่ออินพุตไม่เปลี่ยน | CR:P9, CR:NEW-render-2 |  |
| M-LAUNCH-044 | เปิด | P3 | S | perf-identical | EQ-3 | S09 | K2 | I+C |  | เส้นทางบิน/วงโคจร: ไม่เขียนบัฟเฟอร์ใหม่เมื่อข้อมูลไม่เปลี่ยน | CR:P25 |  |
| M-LAUNCH-045 | เปิด | P2 | S | perf-identical | EQ-7 | S09 | K2-K3 | I |  | มุมมองแผนที่: คำนวณวงโคจรครั้งเดียวต่อเฟรม แคชชั้นพื้นหลัง และโหลดภาพโลก 2048… | CR:P10, CR:P22 |  |
| M-LAUNCH-046 | เปิด | P2 | M | perf-tradeoff | R3.0 | S12 | K3 | C (+O, I) |  | งบประมาณ WebGL context: เพิ่ม dispose, ปล่อย context เมื่อจำเป็น, ระยะยาวใช้… | CR:P21, PLAN:§11.1 |  |
| M-LAUNCH-047 | เปิด | P3 | S | perf-identical | EQ-14 | S09 | K3-K5 | owner of each file |  | ร่มชูชีพ Apollo: รวม mesh ตามวัสดุ (84 -> ~10) โดยไม่เปลี่ยนรูปลักษณ์ | CR:P26 |  |
| M-LAUNCH-048 | เปิด | P3 | S | quality | EQ-14 | S09 | K3-K5 | owner of each file |  | รวมตัวช่วยเรนเดอร์ที่ซ้ำ (gridFinTexture ฯลฯ) | CR:D22 |  |
| M-LAUNCH-049 | เปิด | P3 | S | quality | EQ-2 | S09 | K1-K2 | C+I |  | ตัวช่วยสร้างฉาก: targetOrbitState, replaceView, ตาราง Apollo | CR:D25 |  |
| M-LAUNCH-050 | เปิด | P1 | S | quality | R2.5 | S11 | K2 | Q gate; I/U/C/O fixes |  | ตรวจการเข้าถึงอัตโนมัติ (axe-core) บนหน้าหลักทั้ง EN/TH และแก้ระดับร้ายแรง | DP:UX-H6-6, RW:A11Y-03, DP:12-28 | D-44 |
| M-LAUNCH-051 | เปิด | P2 | S | a11y | R2.5 | S11 | K2 | Q gate; I/U/C/O fixes |  | สีตัวอักษรจาง (--dim) และป้ายขนาด <=10 px ไม่ผ่าน WCAG AA | RW:A11Y-01 | + #77 .mission-steps text 10.5/9.5 px and off colour ~2.9:1 |
| M-LAUNCH-052 | เปิด | P2 | S | a11y | R2.5 | S11 | K2 | Q gate; I/U/C/O fixes |  | เป้าสัมผัสเล็กกว่า 24 px บนอุปกรณ์สัมผัส | RW:A11Y-02 | + #77 .mission-steps chips ~14.5 px and .bd-say-show ~20 px: >=24 px or WCAG spacing exception |
| M-LAUNCH-053 | เปิด | P2 | S | a11y | R2.5 | S11 | K2 | Q gate; I/U/C/O fixes |  | แถบข่าวเหตุการณ์ถูกสร้างใหม่ทั้งหมดทุกครั้ง ทำให้โปรแกรมอ่านหน้าจออ่านซ้ำ | RW:A11Y-03 |  |
| M-LAUNCH-054 | เปิด | P2 | S | a11y | R2.5 | S11 | K2 | Q gate; I/U/C/O fixes |  | ไม่เคารพการตั้งค่าลดการเคลื่อนไหวในฉากปล่อยจรวดและ Orbit | RW:A11Y-04 |  |
| M-LAUNCH-055 | เปิด | P2 | XS | a11y | R2.5 | S11 | K2 | Q gate; I/U/C/O fixes |  | หน้าแอปไม่มี h1, skip link, noscript และ lang เริ่มเป็น en | RW:LS-04 |  |
| M-LAUNCH-056 | เปิด | P2 | S | bug | R2.5 | S11 | K2 | Q gate; I/U/C/O fixes |  | แผงตั้งค่าคืนโฟกัสเฉพาะช่องที่มี aria-label ปุ่มจึงเสียโฟกัส | RW:LUI-08 | + #77 template-note buttons (panel.ts:403-449) and focusField re-render (:376-401) |
| M-LAUNCH-057 | เปิด | P2 | S | bug | R2.5 | S11 | K2 | Q gate; I/U/C/O fixes |  | การ์ดสรุปผลเป็น role=dialog แต่ไม่ย้ายโฟกัส ไม่ประกาศ ไม่ปิดด้วย Escape | RW:LUI-09, OD:Stage1 UX-02 hypothesis | + #77 Watch end-card "Try this launch yourself" button |
| M-LAUNCH-058 | เปิด | P1 | M | a11y | R2.5 | S11 | K2 | Q gate; I/U/C/O fixes |  | การแสดงผลภาษาไทย: กฎ :lang(th) ระยะบรรทัด ไม่ตัดสระ/วรรณยุกต์… | DP:UX-Q5, RW:FONT-01, RW:MOB-02, DP:12-28, RW:S8 |  |
| M-LAUNCH-059 | บางส่วน | P3 | S | ux | R2.5 | S11 | K2 | Q gate; I/U/C/O fixes |  | การป้อนตัวเลขบนจอสัมผัส: inputmode=decimal และปุ่ม +/- ละเอียด/หยาบ | DP:12-14 |  |
| M-LAUNCH-060 | เปิด | P2 | S | bug | FX-5 | S10 | K1-K2 | I/U (P reviews) |  | แผงสมการแจ้ง "ไม่มีอากาศ" ขณะอยู่บนฐานปล่อย/หลังลงจอด ซึ่งผิด | OD:S5-3 / A8, RW:I18N-02 |  |
| M-LAUNCH-061 | เปิด | P3 | XS | ux | R2.2r | S11 | K2 | C+I |  | ตัวเลือกเสียงในหน้า Watch เปิดตลอด: รวมไว้ในกล่องที่พับได้ | OD:S8-2, DP:UX-Q1/S8 |  |
| M-LAUNCH-062 | เปิด | P2 | M | feature | R2.6 | S11 | K2 | V (+C, I) |  | ปุ่มกระโดดไปเหตุการณ์สำคัญพร้อมมุมกล้อง (รวมหน้า Watch) และปุ่ม… | DP:UX-Q2/LUI-04, RW:LUI-04, RW:S11, DP:PED-Q3 |  |
| M-LAUNCH-063 | บางส่วน | P2 | L | feature | ED-LES-2 | S16 | K3 | L-UI/L-C (+I/U mission-result.ts) |  | สรุปผลที่วินิจฉัยสาเหตุจากข้อมูลการบิน (เวลา+ตัวเลข) ปุ่มดูช่วงนั้น… | RW:S11, RW:LUI-03, OD:§I-5, DP:section-1.1, DP:PED-H3-1/UX-H3-2/LUI-03/LES-09 |  |
| M-LAUNCH-064 | เลื่อน | P3 | M | pedagogy | ED-PED-1 | S16 | K4 | L-C/L-UI |  | ชิป "ทำนาย" ก่อนปล่อยจรวดใน Explore | DP:UX-H3-3 |  |
| M-LAUNCH-065 | เลื่อน | P3 | L | ux | R3.4r | S12 | K3 | B |  | หนึ่งงานต่อหนึ่งหน้าจอบนมือถือสำหรับ Orbit/Build Engineer | DP:UX-H3-4/PED-H6-6, OD:§I-2, RW:MOB-04, RW:S16 | D-53 |
| M-LAUNCH-066 | เปิด | P2 | XS | bug | CO-4 | S06 | K1-K2 | I/U (P reviews 032) |  | ป้าย "พร้อมใช้ออฟไลน์" บังแถบควบคุมด้านล่างบนมือถือ | RW:MOB-03, R2S:R2.1 |  |
| M-LAUNCH-067 | บางส่วน | P2 | S | feature | R3.5r | S12 | K3 | I (Home via I-train; waits HU-1… |  | เส้นทางผู้มาใหม่: การ์ดเริ่มต้นตามกลุ่มผู้ใช้พร้อมเวลาโดยประมาณ (D-8) | DP:UX-Q3/PED-H6-6, DP:D-8, OD:§I-1, RW:S16, DP:11-03 |  |
| M-LAUNCH-068 | เปิด | P3 | M | feature | ED-I18N-2 | S16 | K3 | L-C (I composes index.html/home) |  | บท Build ในหน้าแรกพร้อมภาพ และภาพตัวอย่างการแชร์ภาษาไทย/รัสเซีย (D-26) | DP:UX-H12-4/D-26, DP:D-26, OD:D-8/D-26, RM:S01-home |  |
| M-LAUNCH-069 | เปิด | P3 | S | feature | ED-CLASS-1 | S16 | K3 | L/L-UI |  | แชร์ไฟล์จากมือถือด้วย Web Share API | DP:12-13 |  |
| M-LAUNCH-070 | เปิด | P2 | S | docs | HU-3 | S16 | K1-K3 | H + RU reader |  | คำแนะนำ 3 ขั้นภาษาไทยที่ผู้อ่านภาษาไทยตรวจแล้ว | DP:12-20 |  |
| M-LAUNCH-071 | บางส่วน | P3 | L | feature | R7.1 | S17 | each gate | Q/T |  | โหมดเบาสำหรับเครื่องที่ไม่มี WebGL: ใช้ Explore และบทเรียนได้ | DP:12-27 | D-66 |
| M-LAUNCH-072 | บางส่วน | P2 | M | principle | R4.4 | S13 | K4 | P/Q/T (independent reviewer) |  | ป้ายบอกความน่าเชื่อถือของตัวเลข ผูกกับรายการข้อจำกัดด้วยเทสต์ | DP:P-11 | PR นี้เพิ่ม IMPLEMENTATION-STATUS.md ใน path filter ของ Markdown ที่ถูกอ่าน (ci.yml, deploy.yml) และใน App D |
| M-LAUNCH-073 | เปิด | P2 | S | metric | METRIC | S04 | - | - |  | ตัวชี้วัด UX และประสิทธิภาพ: เวลาถึงผลแรก, ไม่ล้นจอ, งบ precache… | DP:section-7.2-metrics, PB:baseline-fbefa18 |  |
| M-LAUNCH-074 | บางส่วน | P2 | XS | principle | PRINCIPLE | S02 | - | - |  | หลักการผลิตภัณฑ์และรายการสิ่งที่ไม่ทำ | DP:section-1.1, DP:section-7.2-principles, DP:section-7.2-notdo, DP:9-13 |  |
| M-LAUNCH-075 | ถูกแทนที่ | - | - | decision | REJECTED | S19 | - | - |  | กติกาเดิม: ห้ามออกแบบ UX ใหม่ก่อนทดสอบผู้ใช้รอบแรก | DP:9-05, DP:11-03 |  |
| M-LAUNCH-076 | เปิด | P2 | L | realism | R3.2r | S12 | K3 | B-R/B |  | ความถูกต้องของภาพจรวด: ความสูง กลุ่มบูสเตอร์ octaweb และเครื่องยนต์ที่เปลี่ยน | OD:Build drawings, RM:S02-octaweb | + M-BUILD-002 residual acceptance rows (exact sizes for custom/remix/sized, part->tab/field for interstage/fairing, invalid/stale with revision, CO-3 screenshots) |
| M-LAUNCH-077 | เปิด | P2 | M | realism | R4.2 | S13 | K4 | P-D/P | M-PHYSICS-042 | โปรไฟล์ loft ของ PSLV-XL และ H3 จากหลายเที่ยวบิน | DP:PHY-PH02 |  |
| M-LAUNCH-078 | บางส่วน | P2 | S | realism | R4.2 | S13 | K4 | P-D/P | M-PHYSICS-043 (+071 done) | Soyuz ปล่อย pitch (เสร็จ) และวงโคจรจอดของ Vulcan | DP:PHY-PH03/PHY-01/PHY-08 |  |
| M-LAUNCH-079 | เปิด | P2 | M | realism | R4.2 | S13 | K4 | P-D/P | M-PHYSICS-044 | การกู้บูสเตอร์ Falcon 9 แบบ 6-DOF ด้วยโหมดควบคุมท่าทาง | DP:PHY-PH15 |  |
| M-LAUNCH-080 | เสร็จ | - | - | feature | DELIVERED | S03 | - | - |  | โครงหน้าตามส่วน x ระดับ และจรวดที่ออกแบบเองในภารกิจ | RM:S01, RM:idea-3, RM:ARCH-routing, RM:S02, RM:S02-keys, RM:ARCH-resolver |  |
| M-LAUNCH-081 | บางส่วน | P3 | L | architecture | R3.3r | S12 | K3 | B-S/B (+I/W section-plan.ts… |  | ช่องว่างเนื้อหาในตาราง ส่วน x ระดับ | RM:idea-2 | + Explore satellite designer picture (v1.2 R3.3 names Explore/Engineer; known limit accepted with G3); conditional ADCS pointing PR scoped at GK1, not counted |
| M-LAUNCH-082 | ถูกแทนที่ | - | - | feature | REJECTED | S19 | - | - |  | หน้าจอ "กำลังพัฒนา" ของ Orbit/Build | RM:S01-plan |  |
| M-LAUNCH-083 | เสร็จ | - | - | perf | DELIVERED | S03 | - | - |  | Auto-Tune ใน worker และ Monte Carlo ปิดงานสะอาด | RW:PHY-06, RW:TQ-13, RW:S7, RW:A18, RW:LUI-02 |  |
| M-LAUNCH-084 | เปิด | P2 | S | perf-identical | EQ-12 | S09 | K2-K3 | I/U |  | ปุ่มลดน้ำหนักบรรทุกใน Explore คำนวณบน main thread | RW:LUI-07 |  |
| M-LAUNCH-085 | เปิด | P3 | S | perf-identical | EQ-12 | S09 | K2-K3 | I/U |  | แท็บปรับจูนคำนวณ margin ซ้ำทุก 200 ms | RW:LUI-12 |  |
| M-LAUNCH-086 | บางส่วน | P2 | M | perf-tradeoff | EQ-3 | S09 | K2 | I+C |  | การเรนเดอร์ขณะไม่มีอะไรเปลี่ยน และโหมดกราฟิกต่ำแบบเลือกเอง | DP:UX-H3-5/INF-16, RW:INF-16 |  |
| M-LAUNCH-087 | เสร็จ | - | - | ux | DELIVERED | S03 | - | - |  | ชื่อส่วน/ระดับบนมือถือมองเห็นได้ (ปุ่มเดียวเปิดตารางที่มีชื่อ) | RW:MOB-01, DP:UX-Q1/S8, RW:S8 |  |

##### A.3.2 M-ORBIT (66 รายการ: เปิด 35, บางส่วน 11, เสร็จ 17, เลื่อน 1, ถูกแทนที่ 2)

| รหัส | สถานะ | P | ขนาด | ชนิด | แพ็กเกจ | ส่วน | คลื่น | เลน | alias ของ | ชื่อย่อ | id เดิม | หมายเหตุ |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| M-ORBIT-001 | เปิด | P1 | XS | bug | FX-3 | S10 | K1-K2 | O |  | แผงดาวเทียมไทย: แก้ข้อความล้าสมัย "การติดตามดาวเทียมจริงจะมาในระยะถัดไป"… | DP:CTX-QW-5, RW:I18N-01, OD:S5-2/A8 |  |
| M-ORBIT-002 | เปิด | P1 | S | bug | FX-3 | S10 | K1-K2 | O |  | แผงการใช้งาน: รหัสดาวเทียมไทยและตาราง repeat ค้างหลังเปลี่ยน preset/วงโคจร… | RW:ORB-07, DP:CTX-QW-5/ORB-07, OD:thaiId |  |
| M-ORBIT-003 | เปิด | P1 | S | bug | FX-3 | S10 | K1-K2 | O |  | ทัวร์ระดับ Watch แสดงคาบโคจร LEO ค้างหลังเผาไหม้ Hohmann ไป GEO… | RW:ORB-03, RW:§12:ORB-03, DP:ORB-02/ORB-03 |  |
| M-ORBIT-004 | เปิด | P1 | S | bug | FX-4 | S10 | K2 | T+P (O,B,I adopt) |  | ความล้มเหลวของ worker คัดกรองการเข้าใกล้/การกลับเข้าบรรยากาศ ถูกแสดงเป็น… | RW:ORB-02, DP:ORB-02/ORB-03, RW:TQ-04 |  |
| M-ORBIT-005 | เปิด | P1 | S | bug | FX-4 | S10 | K2 | T+P (O,B,I adopt) |  | เส้นทางสำรองที่ไม่ใช้ worker ของงานกลับเข้าบรรยากาศ/อายุวงโคจร ทำงานแบบ… | RW:ORB-08, CR:D1 |  |
| M-ORBIT-006 | เปิด | P2 | S | perf | EQ-5 | S09 | K2 | O (+I home) |  | กรณีศึกษา Long March 5B และ NAPA-2 คำนวณบน main thread (ค้างราว 1.3 วินาทีและ… | RW:ORB-01 |  |
| M-ORBIT-007 | เปิด | P2 | S | ux | FX-3 | S10 | K1-K2 | O |  | สถานะโหลดแคตตาล็อก: ขั้นทัวร์ดาวเทียมจริงว่างเปล่าระหว่างโหลด/ล้มเหลว… | RW:ORB-04, RW:ORB-05, DP:ORB-05/ORB-06 |  |
| M-ORBIT-008 | เปิด | P2 | XS | bug | FX-3 | S10 | K1-K2 | O |  | เครื่องมือ repeat ground track รับค่าที่ไม่ถูกต้อง (0, ว่าง, 14.5 รอบ)… | RW:ORB-06, DP:ORB-05/ORB-06 |  |
| M-ORBIT-009 | เปิด | P2 | M | feature | ED-MIL-1 | S16 | K4 | O+L-C |  | ผลด้าน SSA/ทหาร: ส่งออก CSV พร้อมแหล่งข้อมูลนำเข้า และเก็บไฟล์ element… | RW:ORB-09, RM:P3g |  |
| M-ORBIT-010 | เปิด | P1 | S | perf | EQ-4 | S09 | K2 | O (+I main.ts line) |  | สร้าง OrbitView (WebGL context ที่สอง) ของหน้า Orbit… | CR:P4, CR:NEW-bundle-1 |  |
| M-ORBIT-011 | เปิด | P2 | M | perf | EQ-4 | S09 | K2 | O (+I main.ts line) |  | วาดใหม่เฉพาะเมื่อข้อมูลเปลี่ยน: porkchop ทุกสถานะ, ground track และมุม 3… | CR:P5 |  |
| M-ORBIT-012 | เปิด | P2 | S | perf | EQ-4 | S09 | K2 | O (+I main.ts line) |  | ผลการใช้งาน (สื่อสาร/ถ่ายภาพ): อัปเดตค่าในที่เดิมแทนการสร้างส่วนใหม่ 5… | CR:NEW-UI-1 |  |
| M-ORBIT-013 | เปิด | P2 | S | perf | EQ-5 | S09 | K2 | O (+I home) |  | การคำนวณดาวเทียมผ่านฟ้า: คำนวณพิกัดสถานีและทิศดวงอาทิตย์ครั้งเดียวต่อจุดตัวอย่… | CR:P20 |  |
| M-ORBIT-014 | เปิด | P2 | XS | perf | EQ-5 | S09 | K2 | O (+I home) |  | findPasses: จำค่าการคำนวณตามเวลาเดียวกันภายในการเรียกครั้งเดียว ลดการเรียก… | CR:NEW-PHYS-1 |  |
| M-ORBIT-015 | เปิด | P3 | XS | perf | EQ-5 | S09 | K2 | O (+I home) |  | ความน่าจะเป็นการชน: ใช้ตาราง cos/sin คำนวณล่วงหน้า ผลเท่าเดิมทุกบิต | CR:P16 |  |
| M-ORBIT-016 | เปิด | P3 | XS | perf | EQ-5 | S09 | K2 | O (+I home) |  | แคชตำแหน่งในการคัดกรอง: เก็บเฉพาะจุดบนกริด ไม่ล้างแคชกลางงาน | CR:P30, RM:P2.5-d |  |
| M-ORBIT-017 | เปิด | P3 | S | refactor | EQ-5 | S09 | K2 | O (+I home) |  | รวมโค้ดสร้างระนาบเผชิญหน้าที่ซ้ำกันเป็นฟังก์ชันเดียว (คงสูตร sigma สองแบบ) | CR:D16 |  |
| M-ORBIT-018 | เปิด | P3 | S | refactor | EQ-5 | S09 | K2 | O (+I home) |  | รวมการค้นหาแบบ golden-section ห้าที่เป็นฟังก์ชันเดียว โดยคงเงื่อนไขของแต่ละที่ | CR:D21 |  |
| M-ORBIT-019 | เปิด | P2 | M | realism | R4.6 | S14 | K4 | O+P |  | เพิ่ม J2 อันดับสอง (J2², J4 แบบ secular) ในตัวหาวงโคจร repeat/SSO ของ… | DP:PHY-QW5, DP:section-1.5, OD:Orbit limits |  |
| M-ORBIT-020 | เปิด | P2 | M | realism | R4.6 | S14 | K4 | O+P |  | ตัวแก้ Lambert: 48 จาก 120 กรณีขอบคืนค่า null โดยไม่มีหลักฐานว่าไม่มีคำตอบ | OD:§7.4 / AUDIT0929 proposals |  |
| M-ORBIT-021 | เปิด | P3 | L | realism | R4.6 | S14 | K5 | O+P |  | ตัวเลือกการเผาไหม้แบบใช้เวลา (finite burn) ในตัววางแผนการเปลี่ยนวงโคจร… | DP:PHY-PH06, OD:Orbit limits, RM:O02 |  |
| M-ORBIT-022 | เปิด | P3 | L | realism | R4.6 | S14 | K4 | O+P |  | ตัวเลือกการคำนวณวงโคจรเชิงตัวเลข (Cowell) ในระดับ Engineer ของ Orbit | DP:PHY-PH17/18/19 |  |
| M-ORBIT-023 | เปิด | P2 | L | realism | R4.6 | S14 | K4 | O+P |  | ความแม่นของการทำนายการกลับเข้าบรรยากาศ/อายุวงโคจร: ไม่ผ่านเกณฑ์ที่ตั้งไว้ และ… | OD:M03/R05 limits, RM:M03, DP:13-09 |  |
| M-ORBIT-024 | เปิด | P1 | L | feature | R5.1 | S15 | K5 | I/P (U,C via APIs) |  | R5.1 ทำภารกิจ Soyuz MS ไป ISS ที่มีอยู่ให้เข้าถึงได้และต่อเนื่องจนเชื่อมต่อ… | PLAN:R5.1, PLAN:U06, PLAN:U05, RW:DOC-05, OD:doc-map/C14 |  |
| M-ORBIT-025 | เปิด | P1 | XL | realism | R5.2 | S15 | K5 | P |  | R5.2 วงโคจรและเฟสของ ISS จากสถานะอ้างอิงที่ระบุแหล่ง แล้วจึงเลือกใช้… | PLAN:R5.2, RW:PHY-23, RM:R01/R02/R04/P2.5-b, CR:D15 |  |
| M-ORBIT-026 | เปิด | P1 | XL | realism | R5.3 | S15 | K5 | P |  | R5.3 การเข้าใกล้ เชื้อเพลิง เซนเซอร์ และพลวัตการสัมผัส (soft capture -> hooks… | PLAN:R5.3, PLAN:R1.4 |  |
| M-ORBIT-027 | เปิด | P2 | L | feature | R5.4 | S15 | K5 | P-R/B+P (I) |  | R5.4 ภาพยาน สถานี และพอร์ตที่ตรงกับแบบจำลองการสัมผัส และขยายไป… | PLAN:R5.4, PLAN:D02, CR:P25 |  |
| M-ORBIT-028 | เปิด | P1 | XS | decision | DEC | S08 | K0-K4 | H (I records) |  | การตัดสินใจ PLAN-D07: เป้าหมายความสมจริงของภารกิจ ISS (ephemeris อ้างอิงคงที่… | PLAN:D07, PLAN:section | D-35 |
| M-ORBIT-029 | บางส่วน | P2 | XS | bug | FX-3 | S10 | K1-K2 | O |  | ทำตาม D-11: ติดป้าย "ดวงจันทร์เฉพาะสัปดาห์ของ Apollo 11 (DE441)" และแก้… | DP:W0-3, DP:D-11, DP:12-24, OD:D-11 |  |
| M-ORBIT-030 | เปิด | P3 | XS | docs | R7.5 | S17 | continuous | I (+P physics docs) |  | ปรับข้อความ Phase 5 ใน ROADMAP เป็น "ขยายงาน #38" และเลิกใช้ชื่อ C05… | RW:PR38-02, RM:IDS-2, RM:L01..L05 |  |
| M-ORBIT-031 | บางส่วน | P3 | M | realism | R8 | S15 | K6 | P+O |  | L01 ตำแหน่งดวงจันทร์ทั่วไปทุกวันที่ (Meeus บทที่ 47 หรือ DE440) ตรวจกับ… | RM:L01, DP:PHY-PH08-10/L01-L03, OD:D-11, RW:L01-L05, RW:PR38-02 |  |
| M-ORBIT-032 | บางส่วน | P3 | L | realism | R8 | S15 | K6 | P+O |  | L02 สลับวัตถุศูนย์กลาง สนามโน้มถ่วงดวงจันทร์ระดับสูง… | RM:L02 |  |
| M-ORBIT-033 | บางส่วน | P3 | XL | feature | R8 | S15 | K6 | P+O |  | L03 การเดินทางไปดวงจันทร์: TLI, free return, วงรอบปรับเฟสแบบ Chandrayaan, LOI… | RM:L03, DP:PHY-PH08-10/L01-L03, RM:IDS-2 |  |
| M-ORBIT-034 | บางส่วน | P3 | XL | feature | R8 | S15 | K6 | P+O |  | L04/L05 การลงจอดบนดวงจันทร์และการกลับโลก (TEI… | RM:L04, RM:L05, DP:PHY-PH17/18/19 |  |
| M-ORBIT-035 | เปิด | P3 | M | feature | R8 | S15 | K6 | P+O |  | ภารกิจ Watch Chandrayaan-1 บน PSLV-XL | RM:P5-watch |  |
| M-ORBIT-036 | บางส่วน | P1 | XS | principle | PRINCIPLE | S02 | - | - |  | หลักเนื้อหาด้านความมั่นคง (แหล่งเปิดที่อ้างอิง ผลกระทบไม่ใช่วิธีปฏิบัติ)… | DP:P-10, DP:7.5-P3, RM:P5, DP:9-12, DP:13-08, OD:doc-map/C6 |  |
| M-ORBIT-037 | เปิด | P2 | L | feature | ED-MIL-1 | S16 | K4 | O+L-C |  | เรขาคณิต GNSS และค่า DOP เหนือสถานที่ (เชิงแนวคิด ไม่จำลองการรบกวนสัญญาณ) | DP:CTX-I-3M-4, DP:CTX-I-3M-4/CTX-I-3M-5, RM:MT-GNSS, OD:§3 military, DP:8-14, DP:section-1.5 |  |
| M-ORBIT-038 | บางส่วน | P3 | L | feature | ED-MIL-1 | S16 | K4 | O+L-C |  | กรณีศึกษาเศษซากจากการทดสอบ ASAT 2007 (FY-1C) และ 2021 (Cosmos 1408)… | DP:CTX-I-3M-5, RM:MT-ASAT, DP:D-15, OD:D-15, OD:§3 military |  |
| M-ORBIT-039 | บางส่วน | P2 | M | feature | ED-MIL-1 | S16 | K4 | O+L-C |  | สถานการณ์ HADR: โอกาสถ่ายภาพซ้ำเหนือจังหวัดไทย (น้ำท่วมปี 2554/2562/2567)… | DP:CTX-I-3M-6, RM:MT-HADR |  |
| M-ORBIT-040 | บางส่วน | P2 | S | process | R7.4 | S17 | continuous | T (+I index.html) |  | ตรวจข้อมูลเก่า: ให้ขั้น refresh แจ้งเตือนเป็นสีแดงเมื่อข้อมูลเก่าเกิน N วัน… | DP:INF-12, RW:INF-12, DP:12-25, DP:7.5-M2 |  |
| M-ORBIT-041 | เปิด | P3 | M | feature | R7.2 | S17 | each gate | I/T/L/P |  | ชุดอัปเดตข้อมูลแบบออฟไลน์ (USB) สำหรับโรงเรียนที่ไม่มีอินเทอร์เน็ต | DP:CTX-I-3M-2, DP:section-1.4 |  |
| M-ORBIT-042 | เลื่อน | P3 | M | feature | REJECTED | S19 | - | - |  | ข้อมูล Launch Library 2 สำหรับการปล่อยจรวดที่กำลังจะมา/ที่ผ่านมา | RM:P3e |  |
| M-ORBIT-043 | บางส่วน | P2 | M | feature | R4.1 | S13 | K1-K3 | P-D (+P, Q) |  | แหล่งที่มาของข้อมูล: หน้า Sources ในแอปที่สร้างจากข้อมูลจริง และ test… | DP:PHY-PH05/CTX-I-6M-3, DP:CTX-I-6M-3, DP:7.5-P5, DP:8-11 |  |
| M-ORBIT-044 | บางส่วน | P3 | S | process | R7.4 | S17 | continuous | T (+I index.html) |  | สัญญาอนุญาตข้อมูล: test ตรวจ NOTICE.md และยืนยันเงื่อนไขก่อนใช้ NRLMSIS 2.1 /… | DP:13-09, RW:DOC-06 |  |
| M-ORBIT-045 | เปิด | P2 | S | process | HU-2 | S16 | K1-K3 | H |  | ตรวจแหล่งอ้างอิงของแพ็กบทเรียนอีกครั้งจากเครือข่ายที่เข้าถึงได้… | OD:Sources to re-check |  |
| M-ORBIT-046 | เปิด | P2 | L | realism | R4.3 | S13 | K4 | P (B for ratings) |  | สัญญาแบบจำลองดาวเทียมเดียว และข้อบกพร่องที่รู้แล้ว: ความต่างระหว่าง D06 กับ… | OD:D06 limits, OD:D07 limits, RM:D06-misses, RM:D06 |  |
| M-ORBIT-047 | เปิด | P2 | S | decision | DEC | S08 | K0-K4 | H (I records) |  | ตัดสินว่าแม่แบบดาวเทียมใดเป็นจุดเริ่มที่ทำได้จริง… | OD:CONTENT-01, RM:D06-misses | D-47 |
| M-ORBIT-048 | เสร็จ | - | - | feature | DELIVERED | S03 | - | - |  | Orbit playground (องค์ประกอบวงโคจร 3 มิติ ground track กฎของเคปเลอร์… | RM:O01 |  |
| M-ORBIT-049 | เสร็จ | - | - | feature | DELIVERED | S03 | - | - |  | ตัววางแผนการเปลี่ยนวงโคจร (Hohmann ถึง Edelbaum, Lambert, porkchop) | RM:O02 |  |
| M-ORBIT-050 | เสร็จ | - | - | feature | DELIVERED | S03 | - | - |  | บินต่อในวงโคจรด้วยเชื้อเพลิงที่เหลือจริง และเครื่องมืออายุวงโคจร | RM:O03 |  |
| M-ORBIT-051 | เสร็จ | - | - | feature | DELIVERED | S03 | - | - |  | การใช้งานดาวเทียม: สื่อสาร GEO ถ่ายภาพ SSO และดาวเทียมไทย | RM:O04 |  |
| M-ORBIT-052 | เสร็จ | - | - | architecture | DELIVERED | S03 | - | - |  | การส่งต่อสถานะเข้า Orbit (มีเวอร์ชันและตรวจข้อมูล) | RM:S03, RM:ARCH-handoff |  |
| M-ORBIT-053 | เสร็จ | - | - | feature | DELIVERED | S03 | - | - |  | SGP4/SDP4 ที่ตรวจกับ AIAA 2006-6753 | RM:R01 |  |
| M-ORBIT-054 | เสร็จ | - | - | feature | DELIVERED | S03 | - | - |  | snapshot ข้อมูลดาวเทียมแบบออฟไลน์ การอัปเดตตามเวลา และการนำเข้า TLE/OMM | RM:R02, RW:LS-06, RW:INF-12 |  |
| M-ORBIT-055 | เสร็จ | - | - | feature | DELIVERED | S03 | - | - |  | การผ่านฟ้าของดาวเทียมเหนือตำแหน่งผู้ใช้ พร้อมการหักเหและความสว่าง | RM:R03, RM:P2.5-c |  |
| M-ORBIT-056 | เสร็จ | - | - | realism | DELIVERED | S03 | - | - |  | ความไม่แน่นอนของตำแหน่งตามอายุของ element set | RM:R04 |  |
| M-ORBIT-057 | เสร็จ | - | - | architecture | DELIVERED | S03 | - | - |  | ระบบข้อมูลออนไลน์/ออฟไลน์ (snapshot ระบุวันที่ fallback ราย dataset… | RM:S04, RM:P3b, RM:P3c, RM:P3d, RM:P3g, RM:ARCH-data |  |
| M-ORBIT-058 | เสร็จ | - | - | feature | DELIVERED | S03 | - | - |  | SSA: การเข้าใกล้กัน ความน่าจะเป็นการชน CDM และการคัดกรองทั้งแคตตาล็อก | RM:M01, RM:P2.5-d |  |
| M-ORBIT-059 | เสร็จ | - | - | feature | DELIVERED | S03 | - | - |  | เวลาที่ดาวเทียมถ่ายภาพผ่านเหนือพื้นที่ พร้อมเรขาคณิตอุปกรณ์จากแหล่งอ้างอิง | RM:M02, RM:P2.5-e |  |
| M-ORBIT-060 | เสร็จ | - | - | feature | DELIVERED | S03 | - | - |  | การทำนายการกลับเข้าบรรยากาศแบบไม่ควบคุม (กรณี Long March 5B) | RM:M03 |  |
| M-ORBIT-061 | เสร็จ | - | - | feature | DELIVERED | S03 | - | - |  | แสดงผลด้านทหารบนแผนที่ และทัวร์ดาวเทียมจริง | RM:P2.5-g, RM:P2.5-h, RM:MT-covered |  |
| M-ORBIT-062 | เสร็จ | - | - | feature | DELIVERED | S03 | - | - |  | เครื่องออกแบบดาวเทียมและการออกแบบจากข้อกำหนด (D06/D07) | RM:D06, RM:D07, RM:D06-v3, RW:B-05, RW:D06-D07, DP:section-3.2 +2 |  |
| M-ORBIT-063 | เสร็จ | - | - | decision | DELIVERED | S03 | - | - |  | รวม PR #38 Apollo 11 เป็นเนื้อหา C01 พร้อม test เทียบรายงานภารกิจ MSC-00171 | DP:W0-3, DP:D-11, DP:11-05, RW:PR38-01, RW:PR38-TEST |  |
| M-ORBIT-064 | เสร็จ | - | - | principle | PRINCIPLE | S02 | - | - |  | หลักขอบเขต: ระบบโลก-ดวงจันทร์ ไม่มีดาวเคราะห์ และดวงจันทร์อยู่ในแผน Orbit | RM:P6, DEC:2026-10-01 |  |
| M-ORBIT-065 | ถูกแทนที่ | - | - | wont-do | REJECTED | S19 | - | - |  | "ห้ามทำ UI D06/D07 ก่อนมีผลการเรียนรู้; ทำเพียง D06a" (ถูกแทนที่แล้ว) | DP:9-07, DP:11-07 |  |
| M-ORBIT-066 | ถูกแทนที่ | - | - | docs | REJECTED | S19 | - | - |  | แถวข้อจำกัดแบบรวมที่ถูกแยกเป็นรายการย่อยแล้ว | OD:Orbit limits, OD:§3 military, DP:CTX-I-3M-4/CTX-I-3M-5 |  |

##### A.3.3 M-BUILD (40 รายการ: เปิด 25, บางส่วน 2, เสร็จ 12, เลื่อน 1)

| รหัส | สถานะ | P | ขนาด | ชนิด | แพ็กเกจ | ส่วน | คลื่น | เลน | alias ของ | ชื่อย่อ | id เดิม | หมายเหตุ |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| M-BUILD-001 | เสร็จ | P1 | L | architecture | DELIVERED | S03 | - | - |  | R3.1 สัญญาส่งต่อข้อมูลแบบมีเวอร์ชันและที่มาของข้อมูล (แบบ, ภารกิจ… | PLAN:R3.1, PLAN:§4.2, PLAN:U05, RM:S03, RM:idea-1 | done 2026-10-04 (v1.2 R3.1: flown inputs, hand-off v1 + optional DesignRef; #75 #80; Pages 37230585947 @09cc2f5; owner: R3 complete); residual -> M-PLAN-028 (R3.1r), M-PLAN-025 (R7.1 cursor/fuel journey), M-PHYSICS-028 (LTAN, R4.5) |
| M-BUILD-002 | เสร็จ | P1 | L | feature | DELIVERED | S03 | - | - |  | R3.2 ภาพจรวดระดับ Engineer จาก geometry ของแบบเอง (SVG ก่อน; ประกอบ/แยกชิ้น… | PLAN:R3.2, PLAN:U04, PLAN:§4.2, RW:B-18, RM:S02-octaweb, OD:Build drawings | done 2026-10-04 (v1.2 R3.2: bench SVG, Stacked/Apart, part cards; #75; journey r3-bench-drawings); residual acceptance rows -> M-LAUNCH-076 (R3.2r) |
| M-BUILD-003 | เสร็จ | P1 | L | feature | DELIVERED | S03 | - | - |  | R3.3 ภาพดาวเทียมและแผนภาพอธิบาย subsystem จาก SatelliteDesign (ระบุสมมติฐาน)… | PLAN:R3.3, PLAN:U04, OD:IMPLEMENTATION-STATUS D06 "th…, RM:D06, RM:idea-2 | done 2026-10-04 (v1.2 R3.3: schematic #75, stowed pose/axes #78, eclipse/link/footprint #80); residual -> M-LAUNCH-081 (R3.3r: Watch exploded view, Explore picture), M-BUILD-015 (freshness test) |
| M-BUILD-004 | เสร็จ | P1 | L | feature | DELIVERED | S03 | - | - |  | R3.4 รวม Build: ใส่ภาพเข้า shell ของ Engineer และให้ปัญหา readiness… | PLAN:R3.4, PLAN:A03, RM:D04, RM:D03 | done 2026-10-04 (v1.2 R3.4: typed readinessTarget, Show the part #75, Show its settings + focusField #77); residual -> M-PLAN-030 (R3.4r), M-BUILD-015, M-BUILD-031 |
| M-BUILD-005 | เสร็จ | P2 | M | feature | DELIVERED | S03 | - | - |  | R3.5 รวมเส้นทางใช้งานและ Gate G3 (Build→ตรวจ→ปล่อย→ผล→แก้→Orbit)… | PLAN:R3.5, PLAN:A01, PLAN:A02, PLAN:Gate, RM:idea-1 | done 2026-10-04 (v1.2 R3.5: template, Watch copy, mission source/steps, result actions #77; design name+revision #80; journeys r3-first-launch, r3-result-setting); residual -> M-PLAN-025 (r3-g3-loop), M-PLAN-030, M-LAUNCH-063 |
| M-BUILD-006 | เปิด | P1 | S | bug | FX-1 | S10 | K1 | B |  | ค่า rating ที่ค้นไม่จบเพราะหมดเวลา 8 วินาที/จำนวนเที่ยวบิน… | RW:B-03, RW:§12:B-03, DP:B-03, OD:IMPLEMENTATION-STATUS "a rati… | D-67 |
| M-BUILD-007 | เปิด | P1 | S | bug | FX-1 | S10 | K1 | B |  | เปิดแบบที่บันทึกไว้หรือแถวในหน้า requirements แล้วแบบที่ยังไม่บันทึกบน… | OD:Build/satellite UX limits, OD:IMPLEMENTATION-STATUS D07 "Op…, OD:IMPLEMENTATION-STATUS T01 "…d… |  |
| M-BUILD-008 | เปิด | P2 | XS | bug | FX-1 | S10 | K1 | B |  | ไฟล์แบบจากเวอร์ชันใหม่: ข้อความบอกว่า "ตัดสิ่งที่ไม่รู้จักออก" แต่จริง ๆ… | RW:B-02, RW:§12:B-02, DP:D-22, OD:D-22, PLAN:R3.1 |  |
| M-BUILD-009 | เปิด | P3 | S | bug | R3.4r | S12 | K3 | B |  | ค่า rating เก็บได้ช่องเดียวต่อ draft: ผลที่มาช้าของแบบที่ไม่ได้แสดงแล้วเขียนทั… | RW:B-19, DP:ENG-K11, PLAN:R3.4 |  |
| M-BUILD-010 | เปิด | P3 | S | bug | FX-4 | S10 | K2 | T+P (O,B,I adopt) |  | เมื่อ worker คำนวณ rating โหลดไม่ได้ ให้ข้อความชัดเจนพร้อมลองใหม่/รีโหลด… | RW:B-11, CR:D1, RW:TQ-04 |  |
| M-BUILD-011 | เปิด | P2 | M | ux | R3.1r | S12 | K3 | S (+L design-store.ts, B UI) |  | แบบที่บันทึกเก็บแค่ยาน ไม่เก็บวิธีสร้าง: ค่ายืด remix กลับเป็น 100 %, ไม่เก็บ… | OD:Build/satellite UX limits, OD:IMPLEMENTATION-STATUS D06 "de… |  |
| M-BUILD-012 | เปิด | P3 | S | ux | R3.4r | S12 | K3 | B |  | ค่า rating ที่คำนวณในหน้า review ระดับ Engineer… | RW:B-15, OD:Build/satellite UX limits |  |
| M-BUILD-013 | เปิด | P2 | S | ux | R3.5r | S12 | K3 | B |  | ปุ่ม "Fly it" ใน Explore เล็งวงโคจร 500 km จากฐานแรกเสมอ และเรียก payload ว่า… | RW:B-16, OD:Build/satellite UX limits |  |
| M-BUILD-014 | เปิด | P2 | M | perf | EQ-13 | S09 | K3 | B |  | การทดลองบินเข้าวงโคจรใน Fly it ของดาวเทียมรันบน main thread (สูงสุด 0.5… | OD:IMPLEMENTATION-STATUS D06 "on… |  |
| M-BUILD-015 | เปิด | P2 | M | architecture | R3.4r | S12 | K3 | B |  | สัญญาความสดของตัวเลข: ระหว่างคำนวณใหม่ (~180 ms)… | OD:IMPLEMENTATION-STATUS D06 "Wh…, PLAN:§4.2, PLAN:R3.4, DP:ENG-K11 | v1.2 R3.4 criterion known limit accepted with G3 (not done); scope narrowed: renderChecks() vs possibly stale figures (glance/figures already show stale); + freshness test with sabotage from M-BUILD-003 |
| M-BUILD-016 | เปิด | P2 | L | realism | R4.3 | S13 | K4 | P (B for ratings) |  | rating ของยานที่มี kick stage/ขั้นบน: บินการจุดเครื่องตามแผนจริง (Vega-C LEO… | DP:PHY-QW4, RW:B-13, OD:ACCEPT0929 Build matrix, DP:8-09, PLAN:R4.3 |  |
| M-BUILD-017 | เปิด | P2 | M | realism | R4.3 | S13 | K4 | P (B for ratings) |  | งบ Δv/แบบจำลองการบิน: strap-on แต่ละกลุ่มใช้ Isp และเวลาจุดของตัวเอง (PSLV… | DP:PHY-QW6, OD:Build physics limits |  |
| M-BUILD-018 | เปิด | P2 | L | realism | R4.3 | S13 | K4 | P (B for ratings) |  | การกำหนดขนาดจรวดที่ถึงวงโคจรได้ที่ Δv ที่ออกแบบ (+≤100 m/s) พร้อมการตัดสินใจ… | DP:PHY-PH04/D-9, RW:B-14, DP:D-9, OD:D-9, OD:IMPLEMENTATION-STATUS D02 own…, RM:D05 +1 | D-48 |
| M-BUILD-019 | เปิด | P3 | M | realism | R4.3 | S13 | K4 | P (B for ratings) |  | ช่องว่าง six-DOF ของจรวดที่ออกแบบเอง: ขั้นเครื่องเดียวที่มี id… | OD:Build physics limits, RM:D03 |  |
| M-BUILD-020 | เปิด | P3 | S | realism | R4.3 | S13 | K4 | P (B for ratings) |  | ตรวจความเป็นไปได้ของขั้นที่ออกแบบเอง: ปริมาตรเชื้อเพลิงเทียบขนาดลำตัว (มี… | RW:B-07 |  |
| M-BUILD-021 | เปิด | P2 | XS | decision | DEC | S08 | K0-K4 | H (I records) |  | หน้าออกแบบจากชิ้นส่วนระดับ Engineer (D03): ตัดสินใจ D-21 — ประกาศว่าเสร็จที่… | RM:D03-eng, DP:D-21, OD:D-21, RW:B-18 |  |
| M-BUILD-022 | เปิด | P3 | M | feature | R3.6 | S12 | K4 | B |  | ความครบของตัวสร้าง: ยืด/เปลี่ยนเครื่อง strap-on ในหน้า remix และให้ parts… | RW:B-08, RW:B-09 |  |
| M-BUILD-023 | เลื่อน | P3 | M | feature | R3.5r | S12 | K4 | B (+S codec) |  | แชร์แบบและผล challenge เป็นลิงก์ ?d= (จำกัด 8 kB, สำรองเป็นไฟล์… | DP:UX-H6-4 | D-61 |
| M-BUILD-024 | บางส่วน | P1 | M | test | R0.4 | S07 | K0-K1 | T+Q (P,B,L scenario owners) |  | browser journey ของ Build ฝั่งจรวด (remix, parts builder, rating… | RW:B-04, RW:TQ-02, RW:TQ-04 |  |
| M-BUILD-025 | เปิด | P2 | S | perf | R0.4 | S07 | K0-K1 | T+Q (P,B,L scenario owners) |  | เพิ่มฉากวัดผลด้านประสิทธิภาพของ Build ใน perf baseline (เข้า Build, แก้ค่าใน… | PB:measure.mjs, PLAN:§11.1, OR-6 |  |
| M-BUILD-026 | เปิด | P3 | S | efficiency | EQ-13 | S09 | K3 | B |  | แผง Build: ใช้ helper keepFocus ร่วมกัน และรวมการวาดกราฟเป็น rAF เดียวต่อแผง… | CR:D8 | + skip bench/satellite preview rebuild when the drawing key is unchanged (satellite-bench.ts:245,:311; engineer-level.ts:275,:326) [R3CR-08] |
| M-BUILD-027 | เปิด | P3 | S | efficiency | EQ-13 | S09 | K3 | B |  | CSS ของ Build: รวมเฉพาะกฎที่เหมือนกันทุกตัวอักษร และใช้ class ซ่อนสำหรับ… | CR:D13 | + .sd-axes path/circle identical rules in satellite.css [R3CR-06] |
| M-BUILD-028 | เปิด | P3 | S | efficiency | EQ-13 | S09 | K3 | B |  | หน้า Build ถูก render ขณะซ่อนอยู่ตอนเริ่มแอปและตอนเปลี่ยนภาษา — ให้ render… | CR:NEW-bundle-2 |  |
| M-BUILD-029 | เปิด | P2 | M | bug | FX-1 | S10 | K1 | B |  | เลขทศนิยมแบบจุลภาค (ภาษารัสเซีย) ในช่องตัวเลขนอก Build (แผง Launch… | CR:D9 |  |
| M-BUILD-030 | บางส่วน | P3 | S | efficiency | EQ-8 | S09 | K3 | T+I (P review) |  | worker ของ rating: ใช้ worker ตัวเดิมระหว่างการคำนวณแต่ละครั้ง… | RW:B-10, DP:ENG-K14, DP:ENG-K14/INF-01, RW:INF-04 |  |
| M-BUILD-031 | เปิด | P2 | M | ux | R3.4r | S12 | K3 | B |  | ช่องว่างด้านจอเล็กและภาษาใน Build/ดาวเทียม: ตัวเลขแกนกราฟใช้ "." ทุกภาษา… | RW:B-17, OD:Build/satellite mobile & i18n…, RW:B-18 | + R3 bench part-card metres toFixed (RU "12.50 м"), #77 ISO UTC suggestion time; previews at 320/390 px |
| M-BUILD-032 | เปิด | P3 | S | ux | R3.4r | S12 | K3 | B |  | ส่วนที่เหลือด้าน UX ของดาวเทียม/requirements: เวลาประมาณการสูงไป ~2.5 เท่า… | OD:IMPLEMENTATION-STATUS D07 lim…, OD:IMPLEMENTATION-STATUS D06 "Fl… |  |
| M-BUILD-033 | เปิด | P3 | XS | docs | R7.5 | S17 | continuous | I (+P physics docs) |  | ข้อความล้าสมัยเกี่ยวกับ Build ในเอกสารสถานะ… | RW:B-06, RW:B-12, DP:B-06/B-12 |  |
| M-BUILD-034 | เสร็จ | - | - | feature | DELIVERED | S03 | - | - |  | แคตตาล็อกชิ้นส่วนจากยานจริง 21 ลำ ประกอบใหม่แล้วบินเหมือนเดิม (D01) | RM:D01 |  |
| M-BUILD-035 | เสร็จ | - | - | feature | DELIVERED | S03 | - | - |  | Remix จรวดจริง: ยืด เปลี่ยน/จำนวนเครื่อง strap-on fairing; remix… | RM:D02, DP:S14 |  |
| M-BUILD-036 | เสร็จ | - | - | feature | DELIVERED | S03 | - | - |  | Parts builder ระดับ Explore พร้อม Δv, T/W, คำเตือน, rating, บันทึก/ส่งออก… | RM:D03 |  |
| M-BUILD-037 | เสร็จ | - | - | feature | DELIVERED | S03 | - | - |  | สิ่งอำนวยการทดสอบ: จุดเครื่องบนแท่น อุโมงค์ลม และ readiness review (D04) | RM:D04 |  |
| M-BUILD-038 | เสร็จ | - | - | feature | DELIVERED | S03 | - | - |  | การกำหนดขนาดแบบพารามิเตอร์และการแบ่ง Δv ที่เหมาะที่สุด (D05) | RM:D05 |  |
| M-BUILD-039 | เสร็จ | - | - | feature | DELIVERED | S03 | - | - |  | ที่เก็บแบบไม่ลบเรคคอร์ดที่อ่านไม่ได้เมื่อบันทึก/ลบ (B-01) | RW:B-01, RW:§12:B-01 |  |
| M-BUILD-040 | เสร็จ | - | - | feature | DELIVERED | S03 | - | - |  | Auto Tune ของ inspector ย้ายออกจาก main thread (A17) | DP:ENG-K06 |  |

##### A.3.4 M-LEARNING (76 รายการ: เปิด 45, บางส่วน 17, เสร็จ 7, เลื่อน 6, ถูกแทนที่ 1)

| รหัส | สถานะ | P | ขนาด | ชนิด | แพ็กเกจ | ส่วน | คลื่น | เลน | alias ของ | ชื่อย่อ | id เดิม | หมายเหตุ |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| M-LEARNING-001 | เปิด | P1 | S | bug | FX-2 | S10 | K1 | L-UI (+L-C bank) |  | แถบบทเรียนออกแบบ: ทุกครั้งที่ความคืบหน้าขยับ แถบถูกสร้างใหม่ทั้งแถบ… | CR:P28 |  |
| M-LEARNING-002 | เปิด | P3 | S | refactor | FX-2 | S10 | K1 | L-UI (+L-C bank) |  | รวมโค้ดฟอร์มคำตอบของแถบบทเรียน 3 แบบเป็นฟังก์ชันเดียว (D10, ผลลัพธ์เหมือนเดิม) | CR:D10 |  |
| M-LEARNING-003 | เปิด | P2 | XS | bug | FX-2 | S10 | K1 | L-UI (+L-C bank) |  | ช่องจำนวนข้อในใบงาน: ตัวเลขที่เห็นอาจไม่ตรงกับจำนวนที่ใช้สร้างใบงาน (B7 +… | CR:B7, CR:NEW-storage-4 |  |
| M-LEARNING-004 | เปิด | P2 | S | bug | FX-2 | S10 | K1 | L-UI (+L-C bank) |  | หน้าใบงาน/หน้าเขียนบทเรียน: เปิดแท็บแต่ละครั้งสร้าง view และตัว flush… | CR:B8, CR:NEW-storage-6 |  |
| M-LEARNING-005 | เปิด | P2 | XS | bug | R1.6 | S10 | K1 | L (L-UI strings; T for persist) |  | ร่างตัวเลข: เมื่อจำครบ 1000 ช่อง (หรือข้อความยาวเกิน 1000 ตัวอักษร)… | CR:B6 |  |
| M-LEARNING-006 | เปิด | P3 | S | refactor | EQ-14 | S09 | K2 | owner of each file |  | รวมโค้ดส่งออก CSV/escape/ดาวน์โหลด/ชื่อไฟล์… | CR:D12 |  |
| M-LEARNING-007 | เปิด | P2 | M | bug | ED-LES-1 | S16 | K1-K2 | L-C (+L-UI) |  | บทเรียน 2.4: ตรวจการเลือกจากหลักฐานชุด Monte Carlo จริง (ครบ 20 รอบ… | DP:LES-01/PED-H3-6/S4c, OD:S4c / A12, RW:LES-01, RW:S4c, OD:§8 |  |
| M-LEARNING-008 | บางส่วน | P2 | S | bug | ED-LES-1 | S16 | K1-K2 | L-C (+L-UI) |  | บทเรียน 4.3 และบทเรียน 6-DOF: ระบุช่วงที่ตรวจในคำสั่ง… | OD:lesson 4.3, RW:LES-11 |  |
| M-LEARNING-009 | เปิด | P2 | M | test | ED-LES-1 | S16 | K1-K2 | L-C (+L-UI) |  | ตรวจความซื่อตรงของเกณฑ์: ค่าคลาดเคลื่อนที่ยอมรับต้องไม่น้อยกว่าความคลาดเคลื่อน… | DP:LES-01/PED-H3-6/S4c, DP:12-21, DP:12-26, OD:process-lessons/#9, OD:process-lessons/#22 |  |
| M-LEARNING-010 | เปิด | P3 | S | bug | ED-LES-1 | S16 | K1-K2 | L-C (+L-UI) |  | ตัวตรวจไม่จบเที่ยวบินที่มีลูกเรือซึ่งล้มเหลวแล้วลงด้วยร่มระบบหนีภัย… | OD:T03 limits |  |
| M-LEARNING-011 | บางส่วน | P3 | S | bug | ED-LES-1 | S16 | K1-K2 | L-C (+L-UI) |  | กรณีขอบของรายการบทเรียนชุด (WebMCP/หน้าตรวจก่อนโหลดชุด; ไฟล์ครูใช้ id… | OD:T03 limits |  |
| M-LEARNING-012 | เปิด | P2 | S | bug | ED-LES-1 | S16 | K1-K2 | L-C (+L-UI) |  | บันทึกเหตุการณ์ "ถึงวงโคจรเป้าหมาย ... คาบ N นาที" เฉลยคำตอบของบทเรียน 11.2… | OD:T03 limits |  |
| M-LEARNING-013 | เปิด | P3 | XS | decision | DEC | S08 | K0-K4 | H (I records) |  | การใช้เพื่อพัฒนา vs เพื่อตัดสินผล: เฉลยอยู่บนเครื่องเดียวกัน checksum… | OD:lessons limits, RW:LES-13 | D-49 |
| M-LEARNING-014 | เปิด | P3 | L | test | R7.1 | S17 | each gate | Q/T |  | การตรวจซ้ำของครู: บินซ้ำแบบ 6-DOF และบทเรียนกรณีศึกษา… | OD:T01/T02 limits |  |
| M-LEARNING-015 | เปิด | P3 | S | feature | ED-LES-3 | S16 | K4 | L-C/L |  | หลักฐานรายครั้ง: เก็บประวัติการทำแบบจำกัดจำนวน… | RW:LES-10 |  |
| M-LEARNING-016 | เปิด | P2 | M | feature | ED-LES-2 | S16 | K3 | L-UI/L-C |  | ข้อมูลบทเรียน (เวลา, บทก่อนหน้า, อุปกรณ์, กลุ่มผู้เรียน) บนการ์ด + ตัวกรอง… | DP:PED-Q2/UX-Q4, DP:PED-H3-8, DP:12-19 |  |
| M-LEARNING-017 | เปิด | P2 | S | feature | ED-LES-2 | S16 | K3 | L-UI/L-C |  | ปุ่ม "ดูช่วงนั้น" สำหรับเกณฑ์ที่ไม่ผ่าน: เลื่อนไทม์ไลน์ไปยังจังหวะนั้นและเปลี่… | DP:PED-Q3 |  |
| M-LEARNING-018 | บางส่วน | P2 | M | feature | ED-LES-2 | S16 | K3 | L-UI/L-C |  | แถบบทเรียนเมื่อไม่ผ่าน: บอกค่าที่ได้ เกณฑ์ และเวลา ของแต่ละเกณฑ์… | RW:LES-09, DP:PED-H3-1/UX-H3-2/LUI-03/LES-09, OD:§I-5 |  |
| M-LEARNING-019 | เปิด | P2 | L | feature | ED-PED-1 | S16 | K4 | L-C/L-UI |  | เกณฑ์แบบ ทำนาย-สังเกต-อธิบาย (POE): ทำนายก่อนปล่อย (ล็อกเมื่อปล่อย)… | DP:PED-H3-2 |  |
| M-LEARNING-020 | เปิด | P3 | M | feature | ED-PED-1 | S16 | K4 | L-C/L-UI |  | คลังความเข้าใจผิดที่แสดงหลังบทเรียนไม่ผ่านหรือทำนายผิด | DP:PED-H6-7 |  |
| M-LEARNING-021 | เปิด | P3 | L | feature | ED-LES-3 | S16 | K4 | L-C/L |  | บทเรียนหลายรูปแบบ (สุ่มค่าน้ำหนักบรรทุก/ความสูง/เวลา) ล็อกเฉลยรายรูปแบบ… | DP:PED-H6-5/D-6, OD:§8 |  |
| M-LEARNING-022 | เปิด | P3 | M | feature | ED-LES-3 | S16 | K4 | L-C/L |  | ใบงานผูกกับภารกิจของบทเรียน (คำถามตรงกับบทเรียน) | RW:LES-15 |  |
| M-LEARNING-023 | บางส่วน | P3 | M | feature | ED-PED-2 | S16 | K4 | L-C |  | สมุดทดลอง: ทำให้ครบตาม D-5 (ไฟล์ .orbitlab-notebook.json มี checksum… | DP:PED-H3-3/UX-H3-6/S12/D-5, DP:D-5, DP:11-04, RW:S12 |  |
| M-LEARNING-024 | บางส่วน | P3 | L | architecture | EQ-14 | S09 | K3-K5 | owner of each file |  | บทเรียนในตัว ใบงาน และคลังข้อสอบเป็นไฟล์ข้อมูล ผ่านตัวอ่านเดียวกับไฟล์ครู… | DP:ENG-K24 |  |
| M-LEARNING-025 | บางส่วน | P3 | M | process | ED-PACK-1 | S16 | K3 | L-C |  | ระบบรับเนื้อหา: ตัวตรวจไฟล์บทเรียน คู่มือผู้ร่วมเขียน แม่แบบส่งชุดบทเรียน… | DP:P-8, DP:CTX-I-6M-4, DP:7.5-P4 |  |
| M-LEARNING-026 | บางส่วน | P2 | S | ux | ED-ASSESS-1 | S16 | K2 | L-C |  | รายงานแบบทดสอบจัดระดับ: แสดงจำนวนข้อ บอกว่าเป็นการจัดระดับไม่ใช่คะแนน… | DP:PED-Q4, RW:LES-07 |  |
| M-LEARNING-027 | เปิด | P2 | S | architecture | FX-2 | S10 | K1 | L-UI (+L-C bank) |  | กำหนดเวอร์ชันคลังข้อสอบและเก็บประวัติการทำครบ (ปัจจุบันตรวจใหม่กับคลังล่าสุด) | OD:assessment bank |  |
| M-LEARNING-028 | เปิด | P3 | M | test | HU-5 | S16 | K4 | H |  | สถิติคุณภาพข้อสอบและการรับรองโดยบรรณาธิการมนุษย์สำหรับคลัง 157 ข้อ | OD:item quality |  |
| M-LEARNING-029 | เปิด | P1 | S | bug | ED-I18N-1 | S16 | K1 | L-C (I composes) |  | ใช้ศัพท์ไทยที่ตัดสินแล้ว D5 (guidance = การนำวิถี, navigation = การนำร่อง)… | DP:P-9, DP:CTX-QW-4/LES-05/I18N-03, DP:CTX-QW-4, OD:S5-4 / TH / D5, RW:LES-05, RW:I18N-03 +2 |  |
| M-LEARNING-030 | เปิด | P2 | S | docs | ED-I18N-1 | S16 | K1 | L-C (I composes) |  | docs/GLOSSARY.md เป็นแหล่งศัพท์เดียว EN/TH/RU (ย้ายจาก PHYSICS.md) พร้อมแถว… | RW:COPY-02, RW:DOC-11, DP:7.5-P2, RW:S5 |  |
| M-LEARNING-031 | เปิด | P3 | M | bug | ED-I18N-2 | S16 | K3 | L-C (I composes) |  | การสะกดศัพท์ไทยอื่น ๆ ที่ไม่สม่ำเสมอ: stage, fairing, telemetry, payload… | RW:I18N-04, RW:I18N-05 | D-71 |
| M-LEARNING-032 | เปิด | P2 | M | feature | ED-I18N-3 | S16 | K4 | L-C/L-UI |  | อภิธานศัพท์ ณ จุดใช้งาน: แตะคำย่อเพื่อดูคำอธิบายหนึ่งประโยค สร้างจาก… | DP:PED-H3-7, OD:§I-4, DP:11-16, RW:DOC-11 |  |
| M-LEARNING-033 | เปิด | P2 | M | process | HU-3 | S16 | K1-K3 | H + RU reader |  | การตรวจภาษาโดยเจ้าของภาษาไทยและรัสเซีย (24 บทเรียน 157 ข้อ ชุดบทเรียน… | DP:PED-Q5, OD:every pack 2 / IMPL known lim…, RW:LES-06, DP:8-13, DP:13-07, RM:P2.5-i | D-74 |
| M-LEARNING-034 | เปิด | P3 | S | bug | ED-I18N-2 | S16 | K3 | L-C (I composes) |  | การจัดรูปแบบตัวเลขและวันที่ตามภาษา: จุดทศนิยมบนแกนกราฟ, ปี พ.ศ./ค.ศ.… | RW:B-17, RW:I18N-06, RW:I18N-07 | + #77 ISO "YYYY-MM-DD HH:MM UTC" in the result suggestion (D-46 inventory) · D-72 |
| M-LEARNING-035 | บางส่วน | P3 | XS | bug | ED-I18N-2 | S16 | K3 | L-C (I composes) |  | `<html lang="en">` คงที่และพรีวิวลิงก์ภาษาอังกฤษเท่านั้น… | DP:12-11 | D-73 |
| M-LEARNING-036 | เปิด | P3 | M | architecture | EQ-6 | S09 | K2 | I (+L-C) |  | คีย์ i18n แบบมีชนิด (Key type จาก en.ts) - การโหลดพจนานุกรมแยกภาษาเป็นงาน P1… | DP:ENG-K13/UX-H3-5c, DP:ENG-K13, RW:TQ-06, DP:11-11 |  |
| M-LEARNING-037 | เปิด | P3 | XS | docs | ED-I18N-2 | S16 | K3 | L-C (I composes) |  | ข้อความ "กำลังสร้าง" ที่ค้างอยู่: plan.orbit.lead และ lesson.comingSoon | RW:COPY-01 |  |
| M-LEARNING-038 | เปิด | P3 | M | ux | R3.4r | S12 | K3 | B | M-BUILD-031 (count once) | ช่องว่างด้านภาษาและหน้าจอมือถือใน Build/ดาวเทียม | OD:Build/satellite mobile & i18n… |  |
| M-LEARNING-039 | เสร็จ | - | - | feature | DELIVERED | S03 | - | - |  | T02 ตรวจผลงาน: ครูบินซ้ำไฟล์ผลของนักเรียนภายในเกณฑ์ที่กำหนดไว้ล่วงหน้า + CSV | RW:LES-03, RM:T02, DP:CTX-I-3M-8 |  |
| M-LEARNING-040 | เสร็จ | - | - | feature | DELIVERED | S03 | - | - |  | T01 เขียนสถานการณ์: ครูเขียนบทเรียน แจกเป็นไฟล์หรือลิงก์ ?scenario=… | RM:T01, DP:PED-H6-3/UX-H12-3/T01-T02, RW:T01-T03 |  |
| M-LEARNING-041 | เสร็จ | - | - | feature | DELIVERED | S03 | - | - |  | การสำรองข้อมูลสำหรับห้องเรียน (S15): ไฟล์เก็บโปรไฟล์/โปรเจกต์รวมความคืบหน้า… | RW:S15 |  |
| M-LEARNING-042 | บางส่วน | P2 | M | feature | ED-CLASS-1 | S16 | K3 | L/L-UI |  | ฝั่งครู: กู้คืนแบบรวมรายการที่ผ่าน (ไม่ใช่แทนทั้งชุด) ตารางสรุปทั้งห้อง… | RW:LES-02, DP:PED-H3-4/S15/LES-02/LES-03/CT… |  |
| M-LEARNING-043 | เปิด | P2 | M | docs | ED-CLASS-2 | S16 | K3-K4 | L-C (+I) |  | คู่มือครูภาษาไทย (~10 หน้า) + โครงคู่มือปฏิบัติการภาษารัสเซีย +… | DP:CTX-I-3M-3, RW:DOC-09, DP:12-10, DP:section-1.3 |  |
| M-LEARNING-044 | เปิด | P3 | M | feature | ED-CLASS-2 | S16 | K3-K4 | L-C (+I) |  | โหมดนำเสนอบนโปรเจกเตอร์ (?present=1) | DP:UX-H6-3 |  |
| M-LEARNING-045 | เปิด | P2 | S | docs | ED-INST-1 | S16 | K1-K3 | L-C+T |  | คู่มือติดตั้งในเครือข่ายปิด EN/TH + สคริปต์ serve:dist +… | DP:CTX-QW-3 |  |
| M-LEARNING-046 | บางส่วน | P2 | M | process | ED-INST-1 | S16 | K1-K3 | L-C+T |  | ชุดห้องเรียนอินทราเน็ต + ซ้อมใช้ออฟไลน์บนอุปกรณ์จริงของโรงเรียน | DP:PED-H12-5, OD:classroom, DP:7.5-M1 |  |
| M-LEARNING-047 | บางส่วน | P1 | S | docs | ED-INST-1 | S16 | K1-K3 | L-C+T |  | คำชี้แจงความเป็นส่วนตัว / PDPA และรายการข้อมูลที่เก็บบนเครื่อง ในสามภาษา | RW:INF-15, RW:DOC-08 |  |
| M-LEARNING-048 | เสร็จ | - | - | feature | DELIVERED | S03 | - | - |  | ใบงานและบทเรียนกรณีศึกษา 6.1-6.3 | RM:P2.5-i |  |
| M-LEARNING-049 | เสร็จ | - | - | decision | DELIVERED | S03 | - | - |  | นโยบายล็อกเฉลย D-6: "ผ่านโดยมีตัวช่วย" + ล้างคำตอบที่เปิดดู; รีเซ็ตรายบทเรียน | DP:D-6, RW:LES-04 |  |
| M-LEARNING-050 | บางส่วน | P1 | M | process | HU-1 | S16 | K0-K2 | H (Q supports) |  | งานหลักฐานจากผู้ใช้จริง H1: รวมโปรโตคอลสองฉบับ และทำการทดสอบผู้ใช้รอบแรก (5-6… | OD:S9/§7, OD:Stage1 UX-02/§Five-novice, DP:PED-Q1/UX-H3-1, DP:PED-H3-5/UX-H3-1/UX-H6-5, DP:CTX-I-3M-7, RW:S9 +5 | D-54 |
| M-LEARNING-051 | เปิด | P3 | M | process | HU-4 | S16 | K4 | H |  | การทดสอบผู้ใช้รอบที่ 2 + PR ปรับภาษาโดยเจ้าของภาษา | DP:UX-H6-5 |  |
| M-LEARNING-052 | บางส่วน | P2 | M | docs | ED-PACK-1 | S16 | K3 | L-C |  | แผนที่หลักสูตร (สสวท. ม.4-6 + หลักสูตรสถาบัน) ผูกกับแคตตาล็อกด้วยเทสต์… | DP:PED-Q6, DP:D-14, DP:11-14, DP:PED-H12-4, RW:LES-08, DP:7.5-M3 |  |
| M-LEARNING-053 | เปิด | P1 | M | decision | HU-2 | S16 | K1-K3 | H |  | ชุดบทเรียน T03: เจ้าของโครงการตรวจและยืนยัน (รูปแบบรหัส เลขลำดับ… | OD:every pack 1–4, OD:per-lesson confirmations, RM:T03, DP:CTX-I-6M-1, DP:11-12 |  |
| M-LEARNING-054 | เปิด | P0 | XS | decision | CO-7 | S06 | K0 | H then L-C |  | ชื่อโรงเรียนนายเรืออากาศ/NKRAFA ในชุด rtaf-academy ขัดกับ D-2 -… | OD:rtaf-academy Naming, DP:13-08, DP:D-2 | D-42 |
| M-LEARNING-055 | เปิด | P1 | M | decision | ED-PACK-2 | S16 | K3-K4 | L-C (H confirms) |  | ยืนยัน D-13/D-14 อีกครั้ง (นำร่องแรก GISTDA; ชุดแรก = ดาวเทียมไทยใน Orbit)… | OD:D-13, DP:D-13, DP:PED-H6-1/CTX-I-6M-1/UX-H12-2 |  |
| M-LEARNING-056 | เลื่อน | P2 | L | process | ED-INST-2 | S16 | K5 | H+L-C |  | นำร่องใช้งานจริงที่สถาบันหนึ่งแห่งจากไฟล์ zip รุ่นทางการ | DP:CTX-I-6M-6/D-13, DP:CTX-I-6M-6, DP:8-16 |  |
| M-LEARNING-057 | บางส่วน | P3 | L | feature | ED-PED-3 | S16 | K4-K6 | L-C (+O military tools) |  | ปฏิบัติการระบบควบคุมสำหรับนักเรียนนายร้อย (G01-G08) เน้นภาษารัสเซีย… | DP:section-1.2, DP:PED-H6-2/CTX-I-6M-2, DP:CTX-I-6M-2 |  |
| M-LEARNING-058 | เลื่อน | P3 | XL | feature | ED-PED-3 | S16 | K4-K6 | L-C (+O military tools) |  | หลักสูตร "พื้นฐานการรับรู้สถานการณ์อวกาศ" สำหรับนักเรียนนายร้อย (8 บท) | DP:CTX-I-12M-2, DP:CTX-I-12M-1/CTX-I-12M-2 |  |
| M-LEARNING-059 | เปิด | P3 | M | feature | ED-PACK-2 | S16 | K3-K4 | L-C (H confirms) |  | เขียนบทเรียนวิจัยที่เหลือ A5, P4, R4 | OD:A5, P4, R4 |  |
| M-LEARNING-060 | เปิด | P3 | S | docs | ED-PED-2 | S16 | K4 | L-C |  | เอกสารผลการเรียนรู้ D06/D07 พร้อมโครงบทเรียนแบบ POE | DP:PED-H12-1 |  |
| M-LEARNING-061 | เลื่อน | P3 | L | feature | ED-GAME-1 | S16 | K4-K6 | L-C/L-UI |  | เส้นทางบทสรุป "จากสปุตนิกถึงดวงจันทร์" พร้อมพอร์ตโฟลิโอและไทม์ไลน์ภารกิจบนหน้า… | DP:PED-H12-2 |  |
| M-LEARNING-062 | เลื่อน | P3 | L | metric | ED-EVAL | S16 | K6 | H |  | การประเมินผลจากไฟล์ผลลัพธ์ (สคริปต์วิเคราะห์ คะแนนก่อน/หลัง สถิติข้อสอบ) | DP:PED-H12-3 |  |
| M-LEARNING-063 | บางส่วน | P1 | XS | principle | PRINCIPLE | S02 | - | - |  | หลักการสอนและรายการสิ่งที่ไม่ทำ สำหรับแผนหลัก | DP:section-7.1-principles, DP:section-7.1-notdo, DP:9-06, DP:9-14 |  |
| M-LEARNING-064 | เปิด | P2 | XS | metric | METRIC | S04 | - | - |  | ตัวชี้วัดการเรียนรู้ที่วัดได้โดยไม่ใช้ analytics | DP:section-7.1-metrics, DP:8-01, DP:8-02, DP:8-03 |  |
| M-LEARNING-065 | เสร็จ | - | - | decision | DELIVERED | S03 | - | - |  | สัญญาอนุญาตและเครดิต | DP:D-1, RW:INF-09, RW:DOC-07, RW:DOC-06 |  |
| M-LEARNING-066 | เปิด | P3 | XS | test | R7.4 | S17 | continuous | T (+I index.html) |  | ความครบถ้วนของเครดิต: เทสต์เครดิต + รายการแหล่งข้อมูลในแอปรวม Orbit/Build | DP:CTX-QW-1 |  |
| M-LEARNING-067 | บางส่วน | P2 | M | process | R7.2 | S17 | each gate | I/T/L/P |  | รุ่นทางการสำหรับสถาบัน: แท็กเวอร์ชัน, Release พร้อม zip + SHA256SUMS, ปรับ… | DP:CTX-I-3M-1, DP:8-15, DP:D-20, DP:section-1.4, DP:7.5-P1, RW:INF-08 |  |
| M-LEARNING-068 | บางส่วน | P3 | S | process | R7.2 | S17 | each gate | I/T/L/P |  | มิเรอร์สำรอง + กฎการย้อนรุ่น | DP:CTX-I-12M-3 |  |
| M-LEARNING-069 | เปิด | P2 | M | process | ED-INST-2 | S16 | K5 | H+L-C |  | คู่มือผู้ดูแล + ผู้ดูแลคนที่สอง (D-23) | DP:CTX-I-12M-4/D-23, DP:CTX-I-12M-4, DP:D-23, DP:7.5-P8 |  |
| M-LEARNING-070 | เลื่อน | P3 | L | docs | ED-EVAL | S16 | K6 | H |  | บทความวิชาการด้านการตรวจสอบความถูกต้อง (D-24) | DP:CTX-I-12M-5/D-24, DP:CTX-I-12M-5, DP:D-24 |  |
| M-LEARNING-071 | เสร็จ | - | - | principle | PRINCIPLE | S02 | - | - |  | ข้อห้ามที่ยังรักษาไว้: ไม่มีบัญชี เซิร์ฟเวอร์ analytics… | DP:7.5-P7, DP:9-01, DP:9-11 |  |
| M-LEARNING-072 | เปิด | P2 | XS | decision | DEC | S08 | K0-K4 | H (I records) |  | การตัดสินใจ D-16: วิธีให้คะแนนชาเลนจ์ | DP:D-16, OD:D-16, DP:11-13 |  |
| M-LEARNING-073 | เปิด | P2 | L | feature | ED-GAME-1 | S16 | K4-K6 | L-C/L-UI |  | X01 ชาเลนจ์: ภารกิจบริบทไทยใน Orbit + ชุด "Orbitlab Challenge" สำหรับโรงเรียน | RM:X01, OD:S13 / X01, RW:S13, RW:X01-X02, DP:PED-H6-4/UX-H6-1/S13/X01, DP:CTX-I-12M-1 +1 |  |
| M-LEARNING-074 | เปิด | P3 | M | feature | ED-GAME-1 | S16 | K4-K6 | L-C/L-UI |  | ชาเลนจ์การปล่อยจรวด + "ไฮไลต์" ในโหมดชม | DP:UX-H6-2 |  |
| M-LEARNING-075 | เลื่อน | P3 | XL | feature | ED-GAME-1 | S16 | K4-K6 | L-C/L-UI |  | X02 แคมเปญจากวงโคจรแรก (1957) ถึงดวงจันทร์ | RM:X02, DP:UX-H12-1/X02, RW:X01-X02 |  |
| M-LEARNING-076 | ถูกแทนที่ | - | - | decision | REJECTED | S19 | - | - |  | ข้อเสนอ 11-08 ให้คงการล็อกเฉลยถาวรไว้ก่อน | DP:11-08 |  |

##### A.3.5 M-PHYSICS (47 รายการ: เปิด 34, บางส่วน 5, เสร็จ 3, เลื่อน 1, ถูกแทนที่ 3, ปฏิเสธ 1)

| รหัส | สถานะ | P | ขนาด | ชนิด | แพ็กเกจ | ส่วน | คลื่น | เลน | alias ของ | ชื่อย่อ | id เดิม | หมายเหตุ |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| M-PHYSICS-001 | เปิด | P0 | S | test | CO-6 | S06 | K0 | P+Q |  | บันทึกฐานหลักฐานฟิสิกส์บน main ปัจจุบัน: รัน heavy ทั้งชุด + six-DOF fleet +… | PROG:R0, OD:reports/R1.4-fuel, DP:W0-2, DP:12-22, DP:13-05, RW:PHY-05 +1 |  |
| M-PHYSICS-002 | เปิด | P1 | S | test | R0.4 | S07 | K0-K1 | T+Q (P,B,L scenario owners) |  | สร้างชุดทดสอบเทียบผลแบบ bitwise ที่ฐานปัจจุบัน (กรณี Cowell, fingerprint… | CR:P14, CR:P15, CR:P18, CR:P19, CR:D15, CR:D20 +1 |  |
| M-PHYSICS-003 | เปิด | P1 | S | perf | R0.4 | S07 | K0-K1 | T+Q (P,B,L scenario owners) |  | วัดต้นทุน flight worker: profile CPU ของเที่ยวบิน six-DOF (ขอเร่ง 100x… | CR:P17, PB:baseline-fbefa18 flight100x w…, OD:D-27 / devplan-th-part2:D-27 |  |
| M-PHYSICS-010 | เปิด | P1 | S | perf | EQ-9 | S09 | K2 | P |  | ตัวแพร่กระจายวงโคจร Cowell: ใช้ stage ที่ 7 ซ้ำ (FSAL), จองหน่วยความจำ stage… | CR:P14, CR:NEW-PHYS-4 |  |
| M-PHYSICS-011 | เปิด | P2 | S | perf | EQ-11 | S09 | K2 | P |  | Apollo/ดวงจันทร์: memo ตาม jd แบบตรงทุกบิตสำหรับ moonState, sunState… | CR:P15, CR:D20 |  |
| M-PHYSICS-012 | เปิด | P1 | M | perf | EQ-10 | S09 | K2 | P |  | Integrator/runtime six-DOF: ลดออบเจ็กต์ชั่วคราวและการเรียกฟังก์ชันซ้ำ… | CR:P17 |  |
| M-PHYSICS-013 | เปิด | P2 | S | perf | EQ-10 | S09 | K2 | P |  | แรงในโมเดล point-mass: ลดออบเจ็กต์ชั่วคราว คงรูปการคำนวณเดิม และให้ density()… | CR:P18 |  |
| M-PHYSICS-014 | เปิด | P3 | S | perf | EQ-10 | S09 | K2 | P |  | สถานะอนุพัทธ์ใน simulation.ts: ข้ามการคำนวณ elements ซ้ำเมื่อ r/v… | CR:P19 |  |
| M-PHYSICS-015 | เปิด | P3 | S | quality | EQ-10 | S09 | K2 | P |  | รวมค่าคงที่/ฟังก์ชันช่วยที่เหมือนกันทุกบิต (TWO_PI, DEG, clamp, lerpVec… | CR:D17, CR:D19, CR:D20 | ขอบเขตขยายตาม S14 §14.7 ข้อ 1: SIGMA, SUN_FAR_POINT_M, DEG ของ home.ts, RAD ของ lifetime.ts (ไม่มี id ใหม่) |
| M-PHYSICS-016 | ปฏิเสธ | P3 | XS | quality | REJECTED | S19 | - | - |  | RK4 หลายรูปแบบ: ไม่รวมเป็นตัวเดียว (ลำดับการบวกต่างกันทำให้ผลต่างบิต)… | CR:D15 |  |
| M-PHYSICS-017 | เปิด | P2 | S | perf | EQ-5 | S09 | K2 | O (+I home) |  | หน้าแรก: ย้ายการคำนวณรอบผ่านของ ISS ออกจากเฟรมเรนเดอร์ โดยใช้เวลา now ณ… | CR:NEW-PHYS-2 |  |
| M-PHYSICS-018 | เลื่อน | P3 | S | perf | R8 | S15 | K6 | P+O |  | การค้นหาแบบ golden-section ของ Apollo ใช้ค่า phi… | CR:NEW-PHYS-3 | D-52 |
| M-PHYSICS-020 | เปิด | P2 | L | realism | R4.5 | S14 | K4 | P |  | ความสมจริงของตัวแพร่กระจายระยะยาว: ใช้ ephemeris ดวงอาทิตย์/ดวงจันทร์แบบ… | CR:D18, CR:D19, OD:VALIDATION/3369-3373, IS:563 |  |
| M-PHYSICS-021 | เปิด | P1 | XS | decision | DEC | S08 | K0-K4 | H (I records) |  | การตัดสินใจ D-10: แบบจำลองบรรยากาศชั้นบน (NRLMSIS 2.1 หรือคง NRLMSISE-00… | DP:PHY-PH21/D-10, DP:D-10, DP:11-06, OD:D-10, RM:P2.5-a |  |
| M-PHYSICS-022 | เปิด | P3 | M | realism | R4.5 | S14 | K4 | P |  | บรรยากาศเหนือ ~86-100 กม. ต่างกันระหว่าง Launch กับเครื่องมืออายุวงโคจร… | RW:PHY-12 |  |
| M-PHYSICS-023 | เปิด | P2 | S | realism | R4.2 | S13 | K4 | P-D/P |  | Point-mass ใช้แรงโน้มถ่วงทรงกลม ขณะ six-DOF ใช้ J2 (~0.5 % ของ g)… | RW:PHY-10 | D-51 |
| M-PHYSICS-024 | เปิด | P2 | M | realism | R4.2 | S13 | K4 | P-D/P |  | Launch ใช้โลกทรงกลมสำหรับแนวพื้นดิน จุดตก และฐานปล่อย ขณะ Orbit ใช้ WGS-84… | RW:PHY-11 | ทาง (ก) R4.2: แปลงเพื่อแสดงผล + ป้าย datum ฟิสิกส์ไม่เปลี่ยน; ทาง (ข) ใน R4.5 ภายใต้ D-51 พร้อม re-record ที่ระบุชื่อ |
| M-PHYSICS-025 | เปิด | P3 | M | realism | R4.5 | S14 | K4 | P |  | แบบจำลองลมมีเฉพาะ 0-12 กม. และไม่มีใน point-mass นอก Monte Carlo… | RW:PHY-13 |  |
| M-PHYSICS-026 | เปิด | P3 | S | realism | R4.5 | S14 | K4 | P |  | propagateKepler กรณี e>=1 ใช้วิธีเชิงตัวเลขหยาบ: เปลี่ยนเป็นสูตรวิเคราะห์… | RW:PHY-14 |  |
| M-PHYSICS-027 | เปิด | P3 | XS | decision | DEC | S08 | K0-K4 | H (I records) |  | การตัดสินใจ: ค่าคงที่สุริยะ 1361 (กำลังไฟฟ้า) กับ 1367 W/m2… | OD:D06 owner call | D-41 |
| M-PHYSICS-028 | เปิด | P2 | M | realism | R4.5 | S14 | K4 | P |  | นิยามเวลาท้องถิ่นของโหนด (LTAN): ฝั่งออกแบบใช้ดวงอาทิตย์เฉลี่ย ฝั่ง Launch… | OD:SCI-02 |  |
| M-PHYSICS-029 | เปิด | P2 | M | realism | R4.3 | S13 | K4 | P (B for ratings) |  | G02: การวางแผนและบังคับทิศการจุดเครื่องในวงโคจรใช้ค่าประมาณจากระบบนำร่อง… | OD:G02 burns, OD:PARALLEL-GNC/432, OD:HANDOFF-G02-BURNS |  |
| M-PHYSICS-030 | เปิด | P2 | L | realism | R4.3 | S13 | K4 | P (B for ratings) |  | ความล้มเหลวใน Monte Carlo (G05) ที่ยังอธิบายไม่ได้: F9 แตกจาก q ในลมตะวันออก… | OD:G05 known issues 1–4,6, OD:audit-2026-09-29heavy MC | พับเข้า: กรณี "R-7 trim share" (r7sputnik 35 % เทียบ 65 %) วัดก่อน (S13 §13.7) |
| M-PHYSICS-040 | เปิด | P1 | L | process | R4.1 | S13 | K1-K3 | P-D (+P, Q) |  | จุดเริ่ม R4: ทะเบียนแหล่งข้อมูลของยานทั้ง 25 ID พร้อมตรวจ audit 1 ต.ค. รายข้อ | PLAN:R4.1, PROG:R0, DP:section-1.5, OD:audit-2026-10-01-flight-profile | พับเข้า: VALIDATION F6/F12 (parking คงที่) เป็นแถว ledger ไม่แก้โค้ด; audit missed #5 (vostokk ลงแล้ว, r7sputnik → M-PHYSICS-030) |
| M-PHYSICS-041 | เปิด | P2 | XS | docs | R4.1 | S13 | K3 | P-D (+P, Q) |  | แก้ข้อความในโค้ดที่ไม่ตรงความจริง: สมมติฐาน six-DOF ยังบอกว่าไม่มี slosh/flex… | RW:PHY-09, RW:PHY-07 |  |
| M-PHYSICS-042 | เปิด | P2 | L | realism | R4.2 | S13 | K4 | P-D/P |  | โปรไฟล์ขึ้นสู่วงโคจรของ PSLV-XL และ H3 จากหลายเที่ยวบิน… | RW:PHY-17, DP:PHY-PH02, DP:11-02 |  |
| M-PHYSICS-043 | เปิด | P3 | M | realism | R4.2 | S13 | K4 | P-D/P |  | Vulcan เข้าวงโคจรจอดผิดจากแผน (~137 x 1,200 กม. เทียบ 250 x 500 กม.)… | RW:PHY-08, DP:PHY-PH03, OD:Experimental |  |
| M-PHYSICS-044 | เปิด | P2 | M | realism | R4.2 | S13 | K4 | P-D/P |  | การกู้บูสเตอร์ Falcon 9 แบบ six-DOF: ก๊าซเย็นหมดก่อน T+180 วินาที… | RW:PHY-20, DP:PHY-PH15, OD:Experimental |  |
| M-PHYSICS-045 | เปิด | P3 | M | realism | R4.2 | S13 | K4 | P-D/P |  | แกน Falcon Heavy ดับเครื่องเร็ว 11-13 % และฝาครอบของ Atlas V/Falcon Heavy… | RW:PHY-17, IS:648-653 |  |
| M-PHYSICS-046 | เปิด | P3 | M | realism | R4.2 | S13 | K4 | P-D/P |  | ขั้นที่สองของ Electron เผาไหม้สั้นไป ~25 % | RW:PHY-16 |  |
| M-PHYSICS-047 | เปิด | P3 | L | realism | R4.2 | S13 | K4 | P-D/P |  | ยาน Starship Flight 5 ลงเร็ว ~6 นาที และสั้นไป 15-25 องศา… | RW:PHY-21, OD:Experimental |  |
| M-PHYSICS-048 | บางส่วน | P3 | M | realism | R4.1 | S13 | K1-K3 | P-D (+P, Q) |  | Proton-M/Angara-A5 บิน LEO พร้อม Briz-M เสมอ: เพิ่มรูปแบบอ้างอิงที่ไม่มี Briz | RW:PHY-02 |  |
| M-PHYSICS-049 | บางส่วน | P2 | M | test | R4.1 | S13 | K1-K3 | P-D (+P, Q) |  | เปรียบเทียบไทม์ไลน์กับข้อมูลจริงสำหรับยาน 6 ลำที่ยังไม่เคยเทียบ (12/21 ->… | DP:PHY-QW3, RW:PHY-22, DP:8-08, DP:section-7.3-metrics |  |
| M-PHYSICS-050 | เปิด | P2 | S | test | R4.4 | S13 | K4 | P/Q/T (independent reviewer) |  | six-DOF fleet ยังไม่ทดสอบ Saturn V (และ Soyuz-2.1a) | RW:PHY-04 |  |
| M-PHYSICS-051 | เปิด | P3 | M | test | R4.4 | S13 | K4 | P/Q/T (independent reviewer) |  | ตรวจค่าสัมประสิทธิ์อากาศพลศาสตร์ six-DOF กับข้อมูล NACA/NASA (ไม่ fit) | DP:PHY-PH14 |  |
| M-PHYSICS-052 | เปิด | P2 | M | realism | R4.2 | S13 | K3 | P-D/P |  | U16 ส่วนฟิสิกส์: หลักฐาน Max-Q/คันเร่งรายรุ่นยาน… | PLAN:8.6, PLAN:R4.2, PLAN:R4.3, R2S:U16 | ขั้น Soyuz อยู่ใน R4.2-S (K3, หลักฐาน G4-S; CSV ระดับเครื่องจริงตาม D-57); bucket Falcon 9 อยู่ใน R4.2 (K4) · D-57 |
| M-PHYSICS-053 | ถูกแทนที่ | P2 | L | realism | REJECTED | S19 | - | - |  | ค่า rating ของยานที่มี kick stage - รวมไว้ที่รายการของกลุ่ม Build | RW:B-13, DP:8-09, RM:P3-misses |  |
| M-PHYSICS-054 | ถูกแทนที่ | P2 | L | realism | REJECTED | S19 | - | - |  | จรวดที่ออกแบบด้วย sizing ถึงวงโคจรตาม dv ที่ออกแบบ - รวมไว้ที่รายการของกลุ่ม… | DP:8-10, RM:P3-misses |  |
| M-PHYSICS-060 | เปิด | P1 | M | test | R0.4 | S07 | K0-K1 | T+Q (P,B,L scenario owners) |  | D-3/D-4 และ golden แบบมีค่าคลาดเคลื่อน: ตรึง Node 22 ให้ hash เป็นด่านหลัก… | DP:D-3/D-4, DP:D-4, DP:11-01, DP:ENG-K17/PHY-QW1, DP:ENG-K17, DP:P-3 +1 |  |
| M-PHYSICS-061 | บางส่วน | P2 | M | docs | R4.4 | S13 | K4 | P/Q/T (independent reviewer) |  | รายงานการตรวจสอบความถูกต้องที่สร้างจากเทสต์ แสดงในหน้า Physics & sources… | DP:PHY-PH16/CTX-I-6M-5, DP:CTX-I-6M-5, OD:QA-01 |  |
| M-PHYSICS-062 | บางส่วน | P2 | XS | process | METRIC | S04 | - | - |  | ตัวชี้วัดปลายทางด้านฟิสิกส์ของแผนแม่บท | DP:section-7.3-metrics, DP:section-1.5, DP:8-08, DP:8-17 |  |
| M-PHYSICS-063 | บางส่วน | P1 | XS | principle | PRINCIPLE | S02 | - | - |  | กฎด้านฟิสิกส์ที่ต้องอยู่ในแผนแม่บท รวมรายการสิ่งที่ห้ามทำ | DP:P-2, DP:P-3, DP:section-7.3-principles, DP:section-7.3-notdo, DP:9-04, RM:P4 +1 |  |
| M-PHYSICS-064 | เปิด | P3 | XS | test | R7.3 | S17 | continuous | T |  | เทสต์สถาปัตยกรรม: โมดูลเกม/การสอนนำเข้าเฉพาะ type จาก src/physics | DP:P-2 |  |
| M-PHYSICS-070 | เสร็จ | P3 | XS | process | DELIVERED | S03 | - | - |  | PR #36 รวมเข้า main แล้ว | DP:W0-2, RW:PHY-18, RW:PR36-01, DP:D-12, DP:12-22, DP:13-05 |  |
| M-PHYSICS-071 | เสร็จ | P3 | XS | realism | DELIVERED | S03 | - | - |  | Soyuz-2.1a six-DOF pitch หลุดหลังแยกบูสเตอร์ - แก้แล้ว | RW:PHY-01, DP:PHY-PH03 |  |
| M-PHYSICS-072 | เสร็จ | P3 | XS | realism | DELIVERED | S03 | - | - |  | งานฟิสิกส์ Phase 2.5 เสร็จแล้ว | RM:R05, RM:P2.5-a, RM:P2.5-b, RM:P2.5-f |  |
| M-PHYSICS-073 | ถูกแทนที่ | P3 | XS | decision | REJECTED | S19 | - | - |  | ข้อขัดแย้ง "ปรับ guidance ได้หลังมี tolerance tier เท่านั้น" | DP:11-02 |  |

##### A.3.6 M-PLATFORM (82 รายการ: เปิด 54, บางส่วน 13, เสร็จ 9, เลื่อน 3, ถูกแทนที่ 3)

| รหัส | สถานะ | P | ขนาด | ชนิด | แพ็กเกจ | ส่วน | คลื่น | เลน | alias ของ | ชื่อย่อ | id เดิม | หมายเหตุ |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| M-PLATFORM-001 | เปิด | P1 | XS | bug | R1.6 | S10 | K1 | L (L-UI strings; T for persist) |  | โปรไฟล์ที่อ่านไม่ได้ยังถือ lock เจ้าของไว้จนปิดหน้า ทำให้แท็บอื่น (รุ่นใหม่)… | CR:B1 |  |
| M-PLATFORM-002 | เปิด | P1 | S | bug | R1.6 | S10 | K1 | L (L-UI strings; T for persist) |  | งานเก็บกวาดตอนเริ่มแอปล้มขั้นเดียว (ลบสื่อของโปรไฟล์ที่ลบแล้ว/โควตา/โปรไฟล์เดิ… | CR:B2 |  |
| M-PLATFORM-003 | เปิด | P1 | XS | perf | R1.6 | S10 | K1 | L (L-UI strings; T for persist) |  | ทุกครั้งที่เริ่มแอปยังอ่านและคัดลอกโปรไฟล์เดิมทั้งก้อนซ้ำ… | CR:NEW-storage-2, PB:storage largeProfile |  |
| M-PLATFORM-004 | เปิด | P1 | S | bug | R1.6 | S10 | K1 | L (L-UI strings; T for persist) |  | โปรไฟล์เสียหรือรุ่นใหม่กว่าเพียงหนึ่งอัน ทำให้รายการโปรไฟล์ว่างเปล่า… | CR:B3 |  |
| M-PLATFORM-005 | เปิด | P2 | S | perf | R1.6 | S10 | K1 | L (L-UI strings; T for persist) |  | หน้าต่างโปรไฟล์อ่านและแปลงข้อมูลทุกโปรไฟล์ซ้ำราว 4 รอบต่อการวาด (P8) | CR:P8 |  |
| M-PLATFORM-006 | เปิด | P1 | XS | perf | R1.6 | S10 | K1 | L (L-UI strings; T for persist) |  | การแสดงชื่อโปรไฟล์ต้องแปลงข้อมูลบทเรียน/แบบ/การทดลองทั้งหมดของผู้เรียน… | CR:NEW-storage-1 |  |
| M-PLATFORM-007 | เปิด | P1 | M | perf | R1.6 | S10 | K1 | L (L-UI strings; T for persist) |  | คลังข้อมูลแปลง/ตรวจ/คัดลอกโปรไฟล์ทั้งก้อนทุกครั้งที่อ่านหรือเขียนค่า… | CR:P7, PB:storage largeProfile, R2S:R2.3 |  |
| M-PLATFORM-008 | เปิด | P2 | XS | bug | R1.6 | S10 | K1 | L (L-UI strings; T for persist) |  | การส่งออกตรวจขนาดจาก JSON แบบย่อ แต่ดาวน์โหลดแบบจัดรูป ไฟล์ใกล้ 8 MB… | CR:B9, CR:NEW-storage-3 |  |
| M-PLATFORM-009 | เปิด | P3 | XS | bug | R1.6 | S10 | K1 | L (L-UI strings; T for persist) |  | จุดเสี่ยงแฝง: ถ้าเรียกลบโปรไฟล์ในโหมดชั่วคราว จะลบสื่อจริงใน IndexedDB… | CR:B4 |  |
| M-PLATFORM-010 | เปิด | P2 | M | bug | R1.6 | S10 | K1 | L (L-UI strings; T for persist) |  | การย้ายไฟล์เสียงเดิมล้มทั้งชุดเมื่อมีไฟล์ชนกันหนึ่งไฟล์… | CR:B5, CR:NEW-storage-5 | D-68 |
| M-PLATFORM-011 | เลื่อน | P3 | M | decision | DEC | S08 | K0-K4 | H (I records) |  | โหมดชั่วคราวเมื่อเบราว์เซอร์ไม่มี Web Locks หรือ sessionStorage ใช้ไม่ได้ —… | CR:B10 |  |
| M-PLATFORM-012 | เปิด | P2 | XS | refactor | R1.6 | S10 | K1 | L (L-UI strings; T for persist) |  | โค้ดเปิดฐานข้อมูลเสียง IndexedDB ซ้ำสองชุด (D2) | CR:D2 |  |
| M-PLATFORM-013 | เปิด | P3 | XS | perf | R1.6 | S10 | K1 | L (L-UI strings; T for persist) |  | ส่งออกเสียงอ่านข้อมูลเพลงของทุกโปรไฟล์แทนการอ่านเฉพาะช่วงคีย์ของโปรไฟล์ (P27) | CR:P27 |  |
| M-PLATFORM-014 | เปิด | P3 | S | refactor | R1.6 | S10 | K1 | L (L-UI strings; T for persist) |  | ฟังก์ชันตรวจชนิดข้อมูล isRecord/validId/clone ซ้ำกันหลายไฟล์ (D3) | CR:D3 | + canonicalJson (design-ref.ts:45-52) = sortKeys/sameSpec (explore-model.ts:388-391), isObj copy [R3CR-05] |
| M-PLATFORM-015 | บางส่วน | P3 | S | architecture | R1.6 | S10 | K1 | L (L-UI strings; T for persist) |  | งานค้างของทะเบียนคีย์จัดเก็บ: ยังมีการเรียก localStorage นอกตัวกลาง… | DP:ENG-K21 |  |
| M-PLATFORM-016 | เปิด | P2 | S | bug | FX-6 | S10 | K2 | T (+importer owners) |  | การนำเข้าไฟล์ภารกิจ/แบบ/เที่ยวบิน/บทเรียน/ผลตรวจ… | DP:INF-14, RW:INF-14 |  |
| M-PLATFORM-017 | เปิด | P2 | S | test | R7.4 | S17 | continuous | T (+I index.html) |  | ทดสอบแบบสุ่มรบกวน (fuzz) ตัวแปลงไฟล์ทุกชนิดที่นักเรียน/ครูนำเข้า | DP:12-09, DP:ENG-K15 |  |
| M-PLATFORM-018 | เปิด | P2 | S | feature | R1.6 | S10 | K1 | L (L-UI strings; T for persist) |  | ขอให้เบราว์เซอร์เก็บข้อมูลผู้เรียนถาวร และเตือนผู้ใช้ iPad/iPhone… | DP:12-12 |  |
| M-PLATFORM-019 | เสร็จ | - | XS | principle | PRINCIPLE | S02 | - | - |  | หลักข้อมูลแบบ local-first: ทุกอย่างที่ผู้ใช้สร้างเป็นไฟล์มีรุ่น… | DP:P-4, RM:P2b, RM:P2c, RM:ARCH-files, RM:S05, RM:ARCH-designs +1 |  |
| M-PLATFORM-020 | เลื่อน | P3 | L | decision | DEC | S08 | K0-K4 | H (I records) |  | บริการออนไลน์เสริมสำหรับคะแนน/แบ่งปันแบบ (ผ่าน DesignStore และปลอดภัยตาม… | RM:X-backend |  |
| M-PLATFORM-021 | เปิด | P1 | S | perf | EQ-1 | S09 | K1 | T |  | การเข้าใช้ครั้งแรกดาวน์โหลดไฟล์ราว 9.3 MB ซ้ำสองรอบ เพราะ service worker… | CR:NEW-pwa-1, PB:startup "bytes after interact… |  |
| M-PLATFORM-022 | เปิด | P2 | S | bug | FX-7 | S10 | K2 | T (L-UI strings) |  | การอัปเดตข้อมูลรายวันอย่างเดียวทำให้ service worker เปลี่ยนรุ่นและขึ้นข้อความ… | DP:INF-06, RW:INF-06, DP:12-17 |  |
| M-PLATFORM-023 | บางส่วน | P2 | S | ux | FX-7 | S10 | K2 | T (L-UI strings) |  | บอกขนาดการติดตั้งออฟไลน์ตั้งแต่ครั้งแรก เคารพโหมดประหยัดข้อมูล… | DP:12-18, RW:LS-02, RW:INF-05 | D-69 |
| M-PLATFORM-024 | บางส่วน | P2 | XS | decision | METRIC | S04 | - | - |  | กติกางบขนาดไฟล์เดียว: เพดานลดได้อย่างเดียว ถ้าจะเพิ่มต้องมีเหตุผลที่วัดได้และแ… | DP:P-5, DP:7.4-P3, DP:7.4-P5, DP:8-05, DP:8-06, GH:PR #76 +1 | D-38 |
| M-PLATFORM-025 | เปิด | P3 | XS | ux | FX-7 | S10 | K2 | T (L-UI strings) |  | manifest ของแอปไม่มีภาษา ชื่อไทย ภาพหน้าจอ หรือทางลัด และไม่มี… | RW:INF-17 |  |
| M-PLATFORM-026 | เปิด | P3 | XS | ux | FX-7 | S10 | K2 | T (L-UI strings) |  | ไม่มีหน้า 404 ของแอป ลิงก์แบบ path ไปตกหน้า 404 ของ GitHub | RW:LS-03 |  |
| M-PLATFORM-027 | เปิด | P2 | M | architecture | R7.4 | S17 | continuous | T (+I index.html) |  | ตั้ง Content-Security-Policy ในหน้าเว็บ เขียน threat model และนับการละเมิด… | OD:§6, RW:INF-13, RW:LS-05, DP:ENG-K15 |  |
| M-PLATFORM-028 | บางส่วน | P2 | XS | test | R7.4 | S17 | continuous | T (+I index.html) |  | โหมดออฟไลน์ต้องไม่ส่งคำขอออกนอกเลย — ตรวจในการทดสอบเบราว์เซอร์ (หลัก… | RM:P2a, RM:P3a |  |
| M-PLATFORM-029 | เสร็จ | - | XS | decision | DELIVERED | S03 | - | - |  | ย้ายเพลงประกอบออกจาก precache ของเว็บสาธารณะ และ precache ในรุ่นอินทราเน็ต… | DP:ENG-K07/D-7, DP:ENG-K07, DP:D-7, DP:11-15 |  |
| M-PLATFORM-030 | เปิด | P2 | XS | test | R7.4 | S17 | continuous | T (+I index.html) |  | การทดสอบออฟไลน์ตรวจไฟล์ tune.worker ด้วย regex ที่ไปตรงกับ… | OD:S7 handoff |  |
| M-PLATFORM-031 | เปิด | P1 | M | perf | EQ-6 | S09 | K2 | I (+L-C) |  | โหลดพจนานุกรมเฉพาะภาษาที่ใช้ (บวกภาษาอังกฤษสำรอง)… | RW:INF-02, DP:7.4-M1, DP:UX-H3-5/INF-16, CR:P1 |  |
| M-PLATFORM-032 | เปิด | P1 | XS | decision | DEC | S08 | K0-K4 | H (I records) |  | ตัดสินใจขั้นต่ำของเบราว์เซอร์ที่รองรับ (module workers ฯลฯ) | CR:P2 | D-40 |
| M-PLATFORM-033 | เปิด | P2 | M | perf | EQ-8 | S09 | K3 | T+I (P review) |  | worker 12 ชุดต่างฝังแกนฟิสิกส์ของตัวเอง — สร้าง worker แบบ ES module ใช้… | RW:INF-04, CR:P2 |  |
| M-PLATFORM-034 | เปิด | P2 | S | perf | EQ-7 | S09 | K2 | I |  | โหลดเครื่องมือ WebMCP, หน้าต่าง Monte Carlo, หน้าต่างอายุวงโคจร และรายงาน… | CR:P3 |  |
| M-PLATFORM-035 | เปิด | P1 | M | bug | FX-4 | S10 | K2 | T+P (O,B,I adopt) |  | สัญญางาน worker เดียว: ตัวรันร่วมทุกงาน 12 แบบ เคารพการยกเลิกก่อนเริ่ม… | DP:ENG-K10, DP:7.4-M3, DP:7.4-P4, RW:TQ-04, CR:D1 |  |
| M-PLATFORM-036 | เลื่อน | P2 | L | perf | EQ-7 | S09 | K4-K5 | I |  | โหลดส่วน Build และ Orbit เมื่อเข้าใช้ครั้งแรก (P3 ส่วนใหญ่, ENG-K12) | DP:ENG-K12, RW:INF-03, DP:ENG-K16/ENG-K12, CR:P3 |  |
| M-PLATFORM-037 | เปิด | P2 | S | perf | CO-4 | S06 | K1-K2 | I/U (P reviews 032) |  | ตอนเริ่มแอปเรียก applyLanguage() ซ้ำกับส่วนที่เพิ่งวาดด้วยภาษาเดียวกัน… | CR:NEW-bundle-2 |  |
| M-PLATFORM-038 | เปิด | P3 | S | refactor | EQ-14 | S09 | K3-K5 | owner of each file |  | ฟังก์ชันสร้าง DOM el() ซ้ำราว 28 ชุด — ย้ายเฉพาะไฟล์ที่กำลังแก้อยู่แล้ว (D4) | CR:D4 | svg() copies handled in M-PLAN-029 (EQ-13), not here |
| M-PLATFORM-039 | เสร็จ | - | S | perf | DELIVERED | S03 | - | - |  | worker ไม่ฝังพจนานุกรมแปลภาษาแล้ว (Stage 2) | RW:INF-01, RW:§12:INF-01 |  |
| M-PLATFORM-040 | เสร็จ | - | S | process | DELIVERED | S03 | - | - |  | การ import แบบ dynamic ที่ได้ผลจริงและด่านตรวจงบขนาดไฟล์ใน CI/deploy | DP:ENG-K04 |  |
| M-PLATFORM-041 | บางส่วน | P1 | M | test | R0.4 | S07 | K0-K1 | T+Q (P,B,L scenario owners) |  | ด่านตรวจประสิทธิภาพถาวรใน repo: สคริปต์วัดฐาน… | DP:ENG-K19, OD:PERF-01 + device follow-ups, RM:P2.5-j, PB:measure.mjs + results/baselin… |  |
| M-PLATFORM-042 | เปิด | P2 | S | decision | DEC | S08 | K0-K4 | H (I records) |  | วัดบนโทรศัพท์จริงแล้วตัดสินใจแบบจำลองการบินเริ่มต้นบนจอแคบ (D-27)… | DP:ENG-K19/D-27, DP:D-27, DP:12-02, DP:13-06, OD:D-27, OD:Open checks | D-56 |
| M-PLATFORM-043 | บางส่วน | P2 | S | metric | METRIC | S04 | - | - |  | ตารางตัวชี้วัดฝั่งแพลตฟอร์มในแผนหลัก | DP:section-1.6, DP:section-5.outcome, DP:7.4-M7, DP:8-20, DP:8-07 |  |
| M-PLATFORM-044 | เปิด | P2 | S | decision | DEC | S08 | K0-K4 | H (I records) |  | ตัดสินใจรุ่น Node (D-3/D-4) เพิ่มการทดสอบตรึงรุ่น และให้ fingerprint… | DP:ENG-K01, DP:7.4-P6, DP:D-3, DP:13-04, OD:D-3/D-4, RW:PHY-15 +3 |  |
| M-PLATFORM-045 | บางส่วน | P2 | M | process | R7.3 | S17 | continuous | T |  | ผลตรวจ PR เร็วขึ้นโดยความครอบคลุมเท่าเดิม: วัด median/p90… | DP:ENG-K03/PHY-QW2, DP:ENG-K03, DP:8-04, DP:8-19, DP:11-09, DP:11-17 +4 |  |
| M-PLATFORM-046 | ถูกแทนที่ | - | XS | process | REJECTED | S19 | - | - |  | ให้ deploy ตามเวลาข้าม npm test เพราะโค้ดผ่านตอน merge แล้ว (ข้อเสนอ INF-11) | RW:INF-11 |  |
| M-PLATFORM-047 | เปิด | P2 | M | process | R7.2 | S17 | each gate | I/T/L/P |  | ออกรุ่นแบบติดแท็ก: release.yml แนบ dist.zip (รุ่นอินทราเน็ตมีเสียง) +… | DP:ENG-K20/CTX-I-3M-1, DP:ENG-K20, DP:CTX-QW-2, DP:CTX-I-12M-3, DP:D-19, DP:12-03 +2 |  |
| M-PLATFORM-048 | เสร็จ | - | S | feature | DELIVERED | S03 | - | - |  | ตราประจำรุ่นในแอป build-info.json และ SHA256SUMS | DP:ENG-K02/CTX-QW-2, DP:ENG-K02 |  |
| M-PLATFORM-049 | เสร็จ | - | M | process | DELIVERED | S03 | - | - |  | ด่านกันการ deploy และการรันวิทยาศาสตร์ตามเวลา | RW:LS-01, RW:CI-01, DP:PHY-05, RW:PHY-05, RM:P3f |  |
| M-PLATFORM-050 | เปิด | P3 | S | process | R7.3 | S17 | continuous | T |  | เมื่อการรัน heavy/fleet ตามเวลาล้ม ให้เปิด issue อัตโนมัติ และเพิ่มการตรวจ… | DP:7.4-M6, RW:PHY-05 |  |
| M-PLATFORM-051 | บางส่วน | P2 | L | test | R7.1 | S17 | each gate | Q/T |  | journey ทดสอบถดถอยที่ยังขาด (เส้นทางตรวจ S10, Orbit… | DP:S2-mobile-smoke, DP:ENG-K18/S10, DP:ENG-K18, OD:S10, RW:ORB-10, RW:LES-12 +2 |  |
| M-PLATFORM-052 | เปิด | P3 | S | decision | DEC | S08 | K0-K4 | H (I records) |  | ตัดสินใจชั้นทดสอบ DOM (D-18) | DP:D-18, OD:D-18, RW:LUI-06, RW:TQ-03 |  |
| M-PLATFORM-053 | บางส่วน | P3 | M | process | R7.3 | S17 | continuous | T |  | เครื่องมือที่ขาด: lint/format, ตรวจ export ที่ไม่ได้ใช้, bot อัปเดต… | RW:INF-10, RW:TQ-07, DP:D-17, RW:LUI-13 |  |
| M-PLATFORM-054 | เปิด | P2 | XS | test | R7.3 | S17 | continuous | T |  | การทดสอบตรึงขนาดไฟล์ (main.ts, panel.ts) และรายการกติกาที่ต้องเป็นการทดสอบ | DP:P-6, DP:7.4-P1, DP:7.4-M2 | fitness baseline on the Day-0 SHA (main.ts 2,635 / panel.ts 2,517 lines on 5f9aa2e) |
| M-PLATFORM-055 | เปิด | P3 | XL | architecture | EQ-15 | S09 | K3 | I (+U panel.ts; Q oracles) |  | ช่วงเวลารีแฟกเตอร์ที่ประกาศล่วงหน้า: แยกตัวควบคุมออกจาก main.ts/panel.ts… | DP:P-12, DP:ENG-K16/ENG-K12, DP:ENG-K23, DP:7.4-P2, DP:ENG-K16, DP:11-10 +3 | fold re-anchored: seams before R5.1/R6 (D-62 re-asked on 5f9aa2e, main.ts 2,635 lines) · D-62 |
| M-PLATFORM-056 | เปิด | P3 | S | architecture | R7.3 | S17 | continuous | T |  | แกนฟิสิกส์/วงโคจร/การออกแบบตรวจชนิดได้โดยไม่มี DOM lib | DP:ENG-K09 |  |
| M-PLATFORM-057 | เปิด | P3 | XS | test | R7.3 | S17 | continuous | T |  | vite.config.ts และ scripts ไม่เคยถูกตรวจชนิด | RW:TQ-11 |  |
| M-PLATFORM-058 | เปิด | P3 | XS | test | R7.3 | S17 | continuous | T |  | การทดสอบพิมพ์ JSON หลายกิโลไบต์ออกหน้าจอทุกครั้ง | RW:TQ-09 |  |
| M-PLATFORM-059 | เปิด | P3 | S | test | R7.3 | S17 | continuous | T |  | ผลลัพธ์เครื่องมือ WebMCP เป็น unknown ทำให้การทดสอบใช้ as any จำนวนมาก | RW:TQ-10 |  |
| M-PLATFORM-060 | บางส่วน | P3 | S | architecture | R7.3 | S17 | continuous | T |  | งานค้างของการทดสอบสถาปัตยกรรม | DP:ENG-K08, DP:9-03 |  |
| M-PLATFORM-061 | เปิด | P2 | M | test | R7.1 | S17 | each gate | Q/T |  | หาสาเหตุจริงของการค้างตอนกดส่งออกและ "Target crashed" ใน CI | OD:CI flakes | + learner-profiles reload stall (Pages 37219398466, 37223857005); #81 start-up marks + #82 browser-process CPU diagnostics in place; cause not established |
| M-PLATFORM-062 | เปิด | P3 | S | process | R7.5 | S17 | continuous | I (+P physics docs) |  | ย้ายชุดหลักฐาน PR #41 (387 ไฟล์ 18 MB) ออกจาก docs ปลดเวิร์กโฟลว์ codex… | DP:7.4-P7, DP:ENG-K05, DP:7.4-M5, DP:7.5-M5, DP:9-10, DP:11-18 +3 |  |
| M-PLATFORM-063 | เปิด | P0 | XS | bug | CO-1 | S06 | K0 | T+I (H approves) |  | การปล่อยรุ่นติดเพราะข้อมูลโตขึ้น: PR CI วัดงบด้วยข้อมูลที่ commit ไว้ แต่… | GH:Pages run 37172926281, GH:PR #76, CR:NEW-ci-1 | D-38 |
| M-PLATFORM-064 | บางส่วน | P0 | XS | process | CO-2 | S06 | K0 | I |  | ปิดงาน R2 และ R3 ชุดแรกด้วยหลักฐาน: บันทึก CI/deploy ทบทวนการเพิ่มงบ index 15… | R2S:R2, GH:Pages run 37169459230 success, GH:7ddab75 PROGRESS.md | still stale on 5f9aa2e: PROGRESS R3.5 and R3.3-stowed rows, Open lines 77/86, no G3 row; R3-design-views.md:7,:88; R3.5-journey.md:7,:81; IMPLEMENTATION-STATUS (:573, :578); record owner statement and G3 |
| M-PLATFORM-065 | เปิด | P0 | XS | decision | IDSCHEME | S00 | - | - |  | ระบบรหัสที่ไม่ชนกันสำหรับแผนหลัก (ใส่คำนำหน้าตามเอกสาร) | OD:id namespaces, RM:IDS-1, RM:IDS-2 |  |
| M-PLATFORM-066 | บางส่วน | P1 | S | docs | DEC | S08 | K0-K4 | H (I records) |  | ทะเบียนการตัดสินใจเดียว: รวม D01-D09 ของ PLAN กับ D-1..D-27 ของ DECISIONS | DP:W0-4, DP:12-23, RW:DOC-18, OD:D-12, OD:D-24, RM:D06-src |  |
| M-PLATFORM-067 | เปิด | P1 | S | process | IDSCHEME | S00 | - | - |  | แหล่งสถานะเดียวต่อประเภทและกติกาลำดับความถูกต้องเดียว… | RM:DOC-status, OD:precedence, RW:DOC-17, RW:DOC-21, DP:9-15 |  |
| M-PLATFORM-068 | เปิด | P2 | XS | risk | R7.5 | S17 | continuous | I (+P physics docs) |  | ROADMAP-PART2-3.md ถูกทดสอบและหน้าจอแอปอ่าน — ห้ามเปลี่ยนรูปแบบ และแก้รายการ… | OD:md consumers, RM:ARCH-consumed, RW:ORB-11 |  |
| M-PLATFORM-069 | เปิด | P2 | S | docs | R7.5 | S17 | continuous | I (+P physics docs) |  | ปรับเอกสารให้ตรงความจริง: ตัวเลขและข้อความล้าสมัยใน IMPLEMENTATION-STATUS… | DP:PHY-03, RW:PHY-03, DP:LES-14, RW:LES-14, OD:stale facts, RW:DOC-01 +8 |  |
| M-PLATFORM-070 | เปิด | P3 | XS | docs | R4.1 | S13 | K3 | P-D (+P, Q) | M-PHYSICS-041 | คอมเมนต์ในโค้ดที่ล้าสมัย (Vulcan, สมมติฐาน rigid) | DP:PHY-07/PHY-09 |  |
| M-PLATFORM-071 | เปิด | P2 | S | test | R7.5 | S17 | continuous | I (+P physics docs) |  | การทดสอบความสอดคล้องของตัวเลขและลิงก์ในเอกสาร | DP:ENG-K22, DP:7.5-M4, DP:8-21, RW:ENG-K22, DP:12-06 |  |
| M-PLATFORM-072 | เปิด | P3 | S | docs | R7.5 | S17 | continuous | I (+P physics docs) |  | เพิ่มสารบัญใน PHYSICS.md และ VALIDATION.md (ไม่ทำเว็บเอกสาร) | RW:DOC-19, DP:ENG-K22, DP:7.4-W1 |  |
| M-PLATFORM-073 | เปิด | P2 | L | docs | ED-INST-1 | S16 | K1-K3 | L-C+T |  | คู่มือผู้ใช้มีแต่ภาษาอังกฤษและเปิดจากแอปไม่ได้: ทำฉบับไทยและลิงก์ในแอป | RW:DOC-10 |  |
| M-PLATFORM-074 | เปิด | P1 | S | docs | R1.6 | S10 | K1 | L (L-UI strings; T for persist) |  | บันทึกเรื่องโปรไฟล์ผู้เรียน การรีเซ็ต และการสำรองข้อมูล (R1) ใน README… | OD:R1 docs |  |
| M-PLATFORM-075 | เปิด | P2 | XS | docs | CO-8 | S06 | K0 | I |  | สร้างสารบัญ docs/README.md ใหม่ตามแผนหลัก | OD:index, RW:DOC-12 |  |
| M-PLATFORM-076 | เสร็จ | - | S | docs | DELIVERED | S03 | - | - |  | พื้นฐาน repository และข้อเท็จจริงสาธารณะที่แก้แล้ว | DP:ENG-K05/CTX-QW-1, DP:INF-07/DOC-15, RW:DOC-03 |  |
| M-PLATFORM-077 | บางส่วน | P2 | S | process | CO-8 | S06 | K0 | I |  | ระบบติดตามงานค้างและขั้นตอนการทำงานต่อเซสชัน | DP:W0-5/CTX-QW-6, DP:CTX-QW-6, DP:12-01, DP:8-18, DP:7.4-M4, DP:P-7 |  |
| M-PLATFORM-078 | เปิด | P2 | XS | decision | DEC | S08 | K0-K4 | H (I records) |  | การกำกับโค้ดที่เขียนโดย AI และผู้ดูแลคนที่สอง (D-23/D-25) | DP:D-25, OD:D-23/D-25, DP:13-01, DP:P-7 |  |
| M-PLATFORM-079 | เสร็จ | - | XS | principle | PRINCIPLE | S02 | - | - |  | หลักวิศวกรรมและรายการ "จะไม่ทำ" ของแผนหลัก | DP:9-02, DP:9-15, RM:P8, RM:S02-mcp, RM:ARCH-domfree, RM:P1 +1 |  |
| M-PLATFORM-080 | เสร็จ | - | S | process | DELIVERED | S03 | - | - |  | คิว merge เดือนกันยายน (#41, #36, #38) | DP:W0-1, RW:section-1#top1, RW:MERGE-ORDER, RW:OPEN-PRS |  |
| M-PLATFORM-081 | ถูกแทนที่ | - | XS | process | REJECTED | S19 | - | - |  | การคัดแยกข้อค้นพบใน REMAINING-WORK | DP:section-3.1 |  |
| M-PLATFORM-082 | ถูกแทนที่ | - | XS | process | REJECTED | S19 | - | - |  | ต้นทุนเครื่องในการรับ PR #36 | DP:12-04 |  |

##### A.3.7 M-PLAN (31 รายการ: เปิด 30, ปฏิเสธ 1)

| รหัส | สถานะ | P | ขนาด | ชนิด | แพ็กเกจ | ส่วน | คลื่น | เลน | alias ของ | ชื่อย่อ | id เดิม | หมายเหตุ |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| M-PLAN-001 | เปิด | P1 | M | perf-identical | EQ-2 | S09 | K1-K2 | C+I |  | เส้นทางวิกฤตตอนเริ่มแอปโดยภาพเท่าเดิมทุกพิกเซล: compile shader ขนาน ซ้อน… | PB:startup, UXR:E1 | use #81 start-up marks (orbitlab:bootstrap/workspace/app/textures/ready) as measurement points; no speed-up claimed |
| M-PLAN-002 | เปิด | P2 | S | test | R0.4 | S07 | K0-K1 | T+Q (P,B,L scenario owners) |  | ไขข้อขัดแย้ง warm กับ cold start ด้วย harness เดียว header แบบ Pages และ n≥5 | PB:warm/cold, OD:stage1/PERF-01 |  |
| M-PLAN-003 | เปิด | P1 | M | test | R0.4 | S07 | K0-K1 | T+Q (P,B,L scenario owners) |  | งบหน่วยความจำตลอดภารกิจ: JS heap, recording, GPU, จำนวน context และ journey… | PB:recording 46.5 MB, UXR:(d), CR:P7 |  |
| M-PLAN-004 | เปิด | P2 | S | test | R0.4 | S07 | K0-K1 | T+Q (P,B,L scenario owners) |  | KPI ความหน่วงของ input (Event Timing/INP) ที่ CPU throttle 4× | UXR:(d) |  |
| M-PLAN-005 | เปิด | P1 | XS | decision | DEC | S08 | K0-K4 | H (I records) |  | นโยบายลดคุณภาพอัตโนมัติ (GlowGovernor เงียบ, กราฟิกต่ำแบบ opt-in, ค่าเริ่ม… | PC:(c)9, UXR:(b)8, UXR:E2 | D-43 |
| M-PLAN-006 | เปิด | P1 | XS | decision | DEC | S08 | K0-K4 | H (I records) |  | กลุ่มอุปกรณ์เป้าหมายและงบต่อกลุ่ม แยก gating กับ reported → D-56 | UXR:E4, PC:(d) | D-56 |
| M-PLAN-007 | เปิด | P1 | XS | decision | DEC | S08 | K0-K4 | H (I records) |  | ระบุผู้ตรวจวิทยาศาสตร์อิสระและผู้ตรวจ agent ที่สอง และปิด G0 → D-55, D-59 | PC:(d), PLAN:R4.4, PLAN:G0 | D-55, D-59 |
| M-PLAN-008 | เปิด | P0 | XS | decision | DEC | S08 | K0-K4 | H (I records) |  | การอนุญาตลงมือภายใต้ v2.0: เลน R3 จบงานตามคำสั่งเดิมและเจ้าของประกาศ R3 ครบ… | PROG:R3.5, OR-5 | R3 lane closed 2026-10-04 (owner: R3 complete); earlier instructions do not authorize R4 or any v2.0 package (PROGRESS row 27); per-package authorization still required · D-65 |
| M-PLAN-009 | เปิด | P3 | S | ux | R2.1r | S11 | K2 | U+I (C render) |  | บอกความจริงเมื่อบินยาวใน six-DOF: warp ที่ได้จริงและเวลาถึงเหตุการณ์ถัดไป… | PB:100×→8.3×, UXR:(b) |  |
| M-PLAN-010 | เปิด | P1 | S | test | R0.4 | S07 | K0-K1 | T+Q (P,B,L scenario owners) |  | digest SHA-256 ที่ base ของตัวเลขที่ไม่มี fingerprint (pass 249 เหตุการณ์… | CR:P14, CR:NEW-PHYS-4 |  |
| M-PLAN-011 | เปิด | P3 | S | process | HU-6 | S16 | K1-K4 | H+Q |  | ทาง "รายงานปัญหา" แบบออฟไลน์ ไม่มี telemetry และไม่ส่งเอง | UXR:(c) | D-60 |
| M-PLAN-012 | ปฏิเสธ | P3 | S | process | REJECTED | S19 | - | - |  | ใช้ผล unit ของ PR ซ้ำบน Pages (ปฏิเสธ) | PLAN:§9.2, OD:reports/R1.5-workflows | D-64 |
| M-PLAN-013 | เปิด | P1 | M | architecture | R0.2r | S07 | K1 | S (+P,C,U) |  | ADR ที่เหลือของ R0.2: FlightLifecycle, CameraPolicy, Handoff, DesignPreview… | PLAN:R0.2, PLAN:§4.2, PC:(c)4 | ADRs record as-built contracts (handoff v1 + optional DesignRef, typed cause -> field) before R3.1r and R5.1 |
| M-PLAN-014 | เปิด | P2 | S | process | R0.3r | S07 | K1 | T+Q |  | แผนที่ change-to-check ที่เครื่องอ่านได้ พร้อม trial กับ #63/#64/#68/#70 | PLAN:R0.3, PLAN:U13 |  |
| M-PLAN-015 | เปิด | P2 | M | realism | R2.1r | S11 | K2 | U+I (C render) |  | ภาพช่วง held coast ของ six-DOF แบบ interpolate (ภาพเท่านั้น digest… | RA:(c)#8 | D-70 |
| M-PLAN-016 | เปิด | P3 | M | realism | R4.7 | S14 | K4 | C/P-R+P |  | ตรวจภาพเทียบสถานะฟิสิกส์ (plume, แสง, เศษชิ้นส่วน, ขนาด) และงบ asset ราย phase | PC:(c)9, PLAN:§8.3 | D-50 |
| M-PLAN-017 | เปิด | P0 | XS | process | CO-2 | S06 | K0 | I (W) |  | ฐานแผนเลื่อนหลัง ledger (ณ `da67341`: Pages ของ #75 ล้มที่งบ precache, แก้ใน… | GH:#75, GH:run-37172926281 | delta table re-based on 5f9aa2e/09cc2f5 = refresh/r3-audit.tsv (58 rows; column final_package/final_status = assignment.tsv, provisional_package = audit-time label only) |
| M-PLAN-018 | เปิด | P1 | M | test | R0.4 | S07 | K1 | Q (+T harness, C render probe) |  | ชุด oracle ความเท่าเดิม (pixel hash, draw-count, DOM snapshot, byte diff)… | PC:(c)1, UXR:E1 |  |
| M-PLAN-019 | เปิด | P1 | S | bug | FX-8 | S10 | K1 | C (+I main.ts hook, O orbit-view) |  | กู้ WebGL context ที่หลุด โดยการจำลองและการบันทึกเดินต่อ (KPI-15) | UXR:(b)7, UXR:E3 |  |
| M-PLAN-020 | เปิด | P2 | S | test | R0.4 | S07 | K1 | T |  | เครื่องมืองบขนาด: คอลัมน์ gzip/brotli กลุ่ม initial-load และกลุ่ม texture | UXR:E3 |  |
| M-PLAN-021 | เปิด | P2 | S | quality | R2.2r | S11 | K2 | C (+I hook, L-UI strings) |  | ใช้นโยบาย D-43 กับ GlowGovernor: ประกาศพร้อม undo หรือ opt-in ไม่ลดแบบเงียบ | UXR:(b)8, UXR:E2 | D-43 |
| M-PLAN-022 | เปิด | P2 | L | feature | R6.1 | S15 | K6 | A (+P systems, S schema) |  | R6.1 ขอบเขตยานและสเปกระบบของห้องนักบิน (หลัง D-37) | PLAN:R6.1, PLAN:D09, PLAN:U14 |  |
| M-PLAN-023 | เปิด | P2 | XL | feature | R6.2 | S15 | K6 | A (+C render, I routes) |  | R6.2 มุมมอง เครื่องมือ เสียง และการรับรู้แรงของห้องนักบิน | PLAN:R6.2, PC:(c) |  |
| M-PLAN-024 | เปิด | P2 | L | feature | R6.3 | S15 | K6 | A/Q/L-C (+H users) |  | R6.3 ภารกิจฝึกนักบินและการทดสอบกับผู้ใช้ (EVA แยกขอบเขต) | PLAN:R6.3, PC:(c) |  |
| M-PLAN-025 | เปิด | P2 | M | process | R7.1 | S17 | each gate | Q/T |  | R7.1 แบบถาวร: journey ข้ามระบบบน candidate ทุกประตู | PLAN:R7.1, PC:(c)4 | + r3-g3-loop scope from M-BUILD-001/005 residuals (one candidate, cursor + remaining propellant with sabotage, Satellite Engineer save/open/send-to-Orbit, lesson lock/return position) |
| M-PLAN-026 | เปิด | P2 | XS | process | R7.2 | S17 | each gate | I/T (+H) |  | R7.2 แบบถาวร: retrospective ประมาณการใหม่ ตรวจรายการส่งต่อ และแถว KPI | PLAN:R7.2, PLAN:U13, PLAN:§11.3, PC:(c)4 |  |
| M-PLAN-027 | เปิด | P1 | XS | bug | R3.4r | S12 | K1-K2 | B |  | a11y ถดถอยที่ส่งแล้ว (live บน `09cc2f5`; P1, PR แรกของเลน B ใน K1–K2… | GH:#75, GH:#78 |  |
| M-PLAN-028 | เปิด | P2 | L | bug | R3.1r | S12 | K3 | I (+B bench source, S… |  | DesignRef ต่อยอด: ผู้เขียน orbitlab.mission ทางเดียว (Fly it 3→2 ครั้ง… | PLAN:R3.1, GH:#75, GH:#80 | D-75 |
| M-PLAN-029 | เปิด | P3 | S | perf-identical | EQ-13 | S09 | K3 | B |  | helper วาดภาพของ Build อยู่ที่เดียว ผลเหมือนเดิมทุกไบต์ (svg/NS/f1… | GH:#75, GH:#78, GH:#80 |  |
| M-PLAN-030 | เปิด | P2 | M | feature | R3.4r | S12 | K3 | B (+I panel.ts focus via I-train) |  | targeted edit ต่อยอดหลัง G3: focus ลงช่องต้นเหตุ ไม่ใช่ control แรกของการ์ด… | PLAN:R3.4, GH:#75, GH:#77 |  |
| M-PLAN-031 | เปิด | P1 | S | bug | R1.6 | S10 | K1 | S+I |  | เอกสาร mission ที่ version > MISSION_FORMAT_VERSION (เก็บไว้หรือนำเข้า)… | PLAN:R3.1, GH:#77, GH:#80 |  |

#### A.4 ดัชนีแพ็กเกจ → รายการ (ทิศย้อนของ A.3)

ทุกแถวของ `packages.tsv` ปรากฏครั้งเดียว ทุกแพ็กเกจมี `execution_authorized=false` (D-65) ค่า agent-days และ PR เป็นประมาณการหยาบจาก `packages.tsv` (ปรับที่ GK ตาม S05 §05.11) คอลัมน์ "รายการ" สร้างจาก `assignment.tsv` จึงตรงกับ A.3 เสมอ

| แพ็กเกจ | ส่วน | คลื่น | เลน | agent-days | PR | จำนวน | สถานะของรายการ | รายการ |
|---|---|---|---|---|---|---|---|---|
| IDSCHEME | S00 | - | - | 2 | 0 | 2 | เปิด 2 | M-PLATFORM-065, M-PLATFORM-067 |
| PRINCIPLE | S02 | - | - | 2 | 0 | 8 | บางส่วน 4 เสร็จ 4 | M-LAUNCH-074, M-LEARNING-063, M-LEARNING-071, M-ORBIT-036, M-ORBIT-064, M-PHYSICS-063, M-PLATFORM-019, M-PLATFORM-079 |
| DELIVERED | S03 | - | - | 0 | 0 | 55 | เสร็จ 55 | M-BUILD-001, M-BUILD-002, M-BUILD-003, M-BUILD-004, M-BUILD-005, M-BUILD-034, M-BUILD-035, M-BUILD-036, M-BUILD-037, M-BUILD-038, M-BUILD-039, M-BUILD-040, M-LAUNCH-001, M-LAUNCH-005, M-LAUNCH-007, M-LAUNCH-009, M-LAUNCH-010, M-LAUNCH-013, M-LAUNCH-016, M-LAUNCH-021, M-LAUNCH-080, M-LAUNCH-083, M-LAUNCH-087, M-LEARNING-039, M-LEARNING-040, M-LEARNING-041, M-LEARNING-048, M-LEARNING-049, M-LEARNING-065, M-ORBIT-048, M-ORBIT-049, M-ORBIT-050, M-ORBIT-051, M-ORBIT-052, M-ORBIT-053, M-ORBIT-054, M-ORBIT-055, M-ORBIT-056, M-ORBIT-057, M-ORBIT-058, M-ORBIT-059, M-ORBIT-060, M-ORBIT-061, M-ORBIT-062, M-ORBIT-063, M-PHYSICS-070, M-PHYSICS-071, M-PHYSICS-072, M-PLATFORM-029, M-PLATFORM-039, M-PLATFORM-040, M-PLATFORM-048, M-PLATFORM-049, M-PLATFORM-076, M-PLATFORM-080 |
| METRIC | S04 | - | - | 4.5 | 0 | 5 | เปิด 2 บางส่วน 3 | M-LAUNCH-073, M-LEARNING-064, M-PHYSICS-062, M-PLATFORM-024, M-PLATFORM-043 |
| I-HOOKS | S05 | K1-K2 | I | 2.5 | 5 | 0 | — | — (แพ็กเกจเทียม: hook ของ I-train) |
| CO-1 | S06 | K0 | T+I (H approves) | 0.5 | 1 | 1 | เปิด 1 | M-PLATFORM-063 |
| CO-2 | S06 | K0 | I | 1 | 2 | 2 | เปิด 1 บางส่วน 1 | M-PLAN-017, M-PLATFORM-064 |
| CO-3 | S06 | K0 | H+I (Q screenshots) | 6 | 2 | 3 | เปิด 2 บางส่วน 1 | M-LAUNCH-017, M-LAUNCH-018, M-LAUNCH-019 |
| CO-4 | S06 | K0-K2 | I/U (P reviews 032) | 13 | 11 | 11 | เปิด 10 บางส่วน 1 | M-LAUNCH-004, M-LAUNCH-006, M-LAUNCH-008, M-LAUNCH-011, M-LAUNCH-022, M-LAUNCH-025, M-LAUNCH-026, M-LAUNCH-027, M-LAUNCH-032, M-LAUNCH-066, M-PLATFORM-037 |
| CO-5 | S06 | K0 | Q+T | 1.5 | 1 | 1 | บางส่วน 1 | M-LAUNCH-020 |
| CO-6 | S06 | K0 | P+Q | 1.5 | 1 | 1 | เปิด 1 | M-PHYSICS-001 |
| CO-7 | S06 | K0 | H then L-C | 0.5 | 1 | 1 | เปิด 1 | M-LEARNING-054 |
| CO-8 | S06 | K0 | I | 2 | 2 | 2 | เปิด 1 บางส่วน 1 | M-PLATFORM-075, M-PLATFORM-077 |
| R0.2r | S07 | K1 | S (+P,C,U) | 4 | 1 | 1 | เปิด 1 | M-PLAN-013 |
| R0.3r | S07 | K1 | T+Q | 1.5 | 1 | 1 | เปิด 1 | M-PLAN-014 |
| R0.4 | S07 | K0-K1 | T+Q (P,B,L scenario owners) | 30.5 | 10 | 12 | เปิด 10 บางส่วน 2 | M-BUILD-024, M-BUILD-025, M-PHYSICS-002, M-PHYSICS-003, M-PHYSICS-060, M-PLAN-002, M-PLAN-003, M-PLAN-004, M-PLAN-010, M-PLAN-018, M-PLAN-020, M-PLATFORM-041 |
| DEC | S08 | K0-K4 | H (I records) | 26 | 0 | 20 | เปิด 16 บางส่วน 1 เลื่อน 3 | M-BUILD-021, M-LAUNCH-039, M-LEARNING-013, M-LEARNING-072, M-ORBIT-028, M-ORBIT-047, M-PHYSICS-021, M-PHYSICS-027, M-PLAN-005, M-PLAN-006, M-PLAN-007, M-PLAN-008, M-PLATFORM-011, M-PLATFORM-020, M-PLATFORM-032, M-PLATFORM-042, M-PLATFORM-044, M-PLATFORM-052, M-PLATFORM-066, M-PLATFORM-078 |
| EQ-1 | S09 | K1 | T | 1.5 | 1 | 1 | เปิด 1 | M-PLATFORM-021 |
| EQ-10 | S09 | K2 | P | 8.5 | 3 | 4 | เปิด 4 | M-PHYSICS-012, M-PHYSICS-013, M-PHYSICS-014, M-PHYSICS-015 |
| EQ-11 | S09 | K2 | P | 1.5 | 1 | 1 | เปิด 1 | M-PHYSICS-011 |
| EQ-12 | S09 | K2-K3 | I/U | 11.5 | 4 | 6 | เปิด 6 | M-LAUNCH-023, M-LAUNCH-036, M-LAUNCH-037, M-LAUNCH-038, M-LAUNCH-084, M-LAUNCH-085 |
| EQ-13 | S09 | K3 | B | 10 | 4 | 5 | เปิด 5 | M-BUILD-014, M-BUILD-026, M-BUILD-027, M-BUILD-028, M-PLAN-029 |
| EQ-14 | S09 | K3-K5 | owner of each file | 14 | 5 | 5 | เปิด 4 บางส่วน 1 | M-LAUNCH-047, M-LAUNCH-048, M-LEARNING-006, M-LEARNING-024, M-PLATFORM-038 |
| EQ-15 | S09 | K3 | I (+U, Q) | 15 | 5 | 1 | เปิด 1 | M-PLATFORM-055 |
| EQ-2 | S09 | K1-K2 | C+I | 11 | 4 | 4 | เปิด 4 | M-LAUNCH-041, M-LAUNCH-042, M-LAUNCH-049, M-PLAN-001 |
| EQ-3 | S09 | K2 | I+C | 12.5 | 4 | 5 | เปิด 4 บางส่วน 1 | M-LAUNCH-024, M-LAUNCH-040, M-LAUNCH-043, M-LAUNCH-044, M-LAUNCH-086 |
| EQ-4 | S09 | K2 | O (+I main.ts line) | 7 | 2 | 3 | เปิด 3 | M-ORBIT-010, M-ORBIT-011, M-ORBIT-012 |
| EQ-5 | S09 | K2 | O (+I home) | 9 | 3 | 8 | เปิด 8 | M-ORBIT-006, M-ORBIT-013, M-ORBIT-014, M-ORBIT-015, M-ORBIT-016, M-ORBIT-017, M-ORBIT-018, M-PHYSICS-017 |
| EQ-6 | S09 | K2 | I (+L-C) | 8 | 3 | 2 | เปิด 2 | M-LEARNING-036, M-PLATFORM-031 |
| EQ-7 | S09 | K2-K5 | I | 11 | 4 | 3 | เปิด 2 เลื่อน 1 | M-LAUNCH-045, M-PLATFORM-034, M-PLATFORM-036 |
| EQ-8 | S09 | K3 | T+I (P review) | 5.5 | 2 | 2 | เปิด 1 บางส่วน 1 | M-BUILD-030, M-PLATFORM-033 |
| EQ-9 | S09 | K2 | P | 1.5 | 1 | 1 | เปิด 1 | M-PHYSICS-010 |
| FX-1 | S10 | K1 | B | 7.5 | 2 | 4 | เปิด 4 | M-BUILD-006, M-BUILD-007, M-BUILD-008, M-BUILD-029 |
| FX-2 | S10 | K1 | L-UI (+L-C bank) | 6.5 | 3 | 5 | เปิด 5 | M-LEARNING-001, M-LEARNING-002, M-LEARNING-003, M-LEARNING-004, M-LEARNING-027 |
| FX-3 | S10 | K1-K2 | O | 6 | 2 | 6 | เปิด 5 บางส่วน 1 | M-ORBIT-001, M-ORBIT-002, M-ORBIT-003, M-ORBIT-007, M-ORBIT-008, M-ORBIT-029 |
| FX-4 | S10 | K2 | T+P (O,B,I adopt) | 10 | 3 | 5 | เปิด 5 | M-BUILD-010, M-LAUNCH-028, M-ORBIT-004, M-ORBIT-005, M-PLATFORM-035 |
| FX-5 | S10 | K1-K2 | I/U (P reviews) | 6.5 | 2 | 5 | เปิด 5 | M-LAUNCH-029, M-LAUNCH-031, M-LAUNCH-034, M-LAUNCH-035, M-LAUNCH-060 |
| FX-6 | S10 | K2 | T (+importer owners) | 1.5 | 1 | 1 | เปิด 1 | M-PLATFORM-016 |
| FX-7 | S10 | K1-K2 | T (L-UI strings) | 4 | 3 | 4 | เปิด 3 บางส่วน 1 | M-PLATFORM-022, M-PLATFORM-023, M-PLATFORM-025, M-PLATFORM-026 |
| FX-8 | S10 | K1 | C (+I, O) | 1.5 | 1 | 1 | เปิด 1 | M-PLAN-019 |
| R1.6 | S10 | K1 | L (L-UI strings; T for… | 24 | 8 | 18 | เปิด 17 บางส่วน 1 | M-LEARNING-005, M-PLAN-031, M-PLATFORM-001, M-PLATFORM-002, M-PLATFORM-003, M-PLATFORM-004, M-PLATFORM-005, M-PLATFORM-006, M-PLATFORM-007, M-PLATFORM-008, M-PLATFORM-009, M-PLATFORM-010, M-PLATFORM-012, M-PLATFORM-013, M-PLATFORM-014, M-PLATFORM-015, M-PLATFORM-018, M-PLATFORM-074 |
| R2.1r | S11 | K2 | U+I (C render) | 13.5 | 4 | 4 | เปิด 2 บางส่วน 2 | M-LAUNCH-002, M-LAUNCH-003, M-PLAN-009, M-PLAN-015 |
| R2.2r | S11 | K2 | C+I | 2.5 | 2 | 3 | เปิด 3 | M-LAUNCH-012, M-LAUNCH-061, M-PLAN-021 |
| R2.3s2 | S11 | K2-K3 | U | 8 | 3 | 1 | เปิด 1 | M-LAUNCH-014 |
| R2.5 | S11 | K2 | Q gate; I/U/C/O fixes | 16.5 | 6 | 10 | เปิด 9 บางส่วน 1 | M-LAUNCH-050, M-LAUNCH-051, M-LAUNCH-052, M-LAUNCH-053, M-LAUNCH-054, M-LAUNCH-055, M-LAUNCH-056, M-LAUNCH-057, M-LAUNCH-058, M-LAUNCH-059 |
| R2.6 | S11 | K2 | V (+C, I) | 4 | 1 | 1 | เปิด 1 | M-LAUNCH-062 |
| R3.0 | S12 | K3 | C (+O, I) | 4 | 3 | 1 | เปิด 1 | M-LAUNCH-046 |
| R3.1r | S12 | K3 | S (+I, L, B) | 13.5 | 7 | 3 | เปิด 2 บางส่วน 1 | M-BUILD-011, M-LAUNCH-030, M-PLAN-028 |
| R3.2r | S12 | K3 | B-R/B (P-D engine-layout) | 8 | 5 | 1 | เปิด 1 | M-LAUNCH-076 |
| R3.3r | S12 | K3 | B-S/B | 8 | 3 | 1 | บางส่วน 1 | M-LAUNCH-081 |
| R3.4r | S12 | K3 | B | 29 | 10 | 9 | เปิด 8 เลื่อน 1 | M-BUILD-009, M-BUILD-012, M-BUILD-015, M-BUILD-031, M-BUILD-032, M-LAUNCH-065, M-LEARNING-038, M-PLAN-027, M-PLAN-030 |
| R3.5r | S12 | K3-K4 | B (+I Home via I-train) | 7 | 3 | 3 | เปิด 1 บางส่วน 1 เลื่อน 1 | M-BUILD-013, M-BUILD-023, M-LAUNCH-067 |
| R3.6 | S12 | K4 | B | 4 | 1 | 1 | เปิด 1 | M-BUILD-022 |
| R4.1 | S13 | K1-K3 | P-D (+P, Q) | 21 | 7 | 6 | เปิด 3 บางส่วน 3 | M-ORBIT-043, M-PHYSICS-040, M-PHYSICS-041, M-PHYSICS-048, M-PHYSICS-049, M-PLATFORM-070 |
| R4.2 | S13 | K4 | P-D/P | 42 | 14 | 12 | เปิด 11 บางส่วน 1 | M-LAUNCH-077, M-LAUNCH-078, M-LAUNCH-079, M-PHYSICS-023, M-PHYSICS-024, M-PHYSICS-042, M-PHYSICS-043, M-PHYSICS-044, M-PHYSICS-045, M-PHYSICS-046, M-PHYSICS-047, M-PHYSICS-052 |
| R4.2-S | S13 | K3 | P-D then P | 9 | 3 | 0 | — | — (แพ็กเกจเทียม: รายการอยู่ใน R4.2) |
| R4.3 | S13 | K4 | P (B for ratings) | 45.5 | 15 | 8 | เปิด 8 | M-BUILD-016, M-BUILD-017, M-BUILD-018, M-BUILD-019, M-BUILD-020, M-ORBIT-046, M-PHYSICS-029, M-PHYSICS-030 |
| R4.4 | S13 | K4 | P/Q/T (independent reviewer) | 13.5 | 4 | 4 | เปิด 2 บางส่วน 2 | M-LAUNCH-072, M-PHYSICS-050, M-PHYSICS-051, M-PHYSICS-061 |
| R4.5 | S14 | K4 | P | 21.5 | 7 | 5 | เปิด 5 | M-PHYSICS-020, M-PHYSICS-022, M-PHYSICS-025, M-PHYSICS-026, M-PHYSICS-028 |
| R4.6 | S14 | K4-K5 | O+P | 32 | 11 | 5 | เปิด 5 | M-ORBIT-019, M-ORBIT-020, M-ORBIT-021, M-ORBIT-022, M-ORBIT-023 |
| R4.7 | S14 | K4 | C/P-R+P | 4 | 1 | 1 | เปิด 1 | M-PLAN-016 |
| R5.1 | S15 | K5 | I/P (U,C via APIs) | 8 | 3 | 1 | เปิด 1 | M-ORBIT-024 |
| R5.2 | S15 | K5 | P | 15 | 5 | 1 | เปิด 1 | M-ORBIT-025 |
| R5.3 | S15 | K5 | P | 15 | 5 | 1 | เปิด 1 | M-ORBIT-026 |
| R5.4 | S15 | K5 | P-R/B+P (I) | 9.5 | 3 | 2 | เปิด 1 เลื่อน 1 | M-LAUNCH-015, M-ORBIT-027 |
| R6.1 | S15 | K6 | A (+P,S) | 8 | 3 | 1 | เปิด 1 | M-PLAN-022 |
| R6.2 | S15 | K6 | A (+C,I) | 15 | 5 | 1 | เปิด 1 | M-PLAN-023 |
| R6.3 | S15 | K6 | A/Q/L-C | 8 | 3 | 1 | เปิด 1 | M-PLAN-024 |
| R8 | S15 | K6 | P+O | 47.5 | 16 | 6 | เปิด 1 บางส่วน 4 เลื่อน 1 | M-ORBIT-031, M-ORBIT-032, M-ORBIT-033, M-ORBIT-034, M-ORBIT-035, M-PHYSICS-018 |
| ED-ASSESS-1 | S16 | K2 | L-C | 1.5 | 1 | 1 | บางส่วน 1 | M-LEARNING-026 |
| ED-CLASS-1 | S16 | K3 | L/L-UI | 5.5 | 2 | 2 | เปิด 1 บางส่วน 1 | M-LAUNCH-069, M-LEARNING-042 |
| ED-CLASS-2 | S16 | K3-K4 | L-C (+I) | 8 | 3 | 2 | เปิด 2 | M-LEARNING-043, M-LEARNING-044 |
| ED-EVAL | S16 | K6 | H | 16 | 5 | 2 | เลื่อน 2 | M-LEARNING-062, M-LEARNING-070 |
| ED-GAME-1 | S16 | K4-K6 | L-C/L-UI | 35 | 12 | 4 | เปิด 2 เลื่อน 2 | M-LEARNING-061, M-LEARNING-073, M-LEARNING-074, M-LEARNING-075 |
| ED-I18N-1 | S16 | K1 | L-C (I composes) | 3 | 2 | 2 | เปิด 2 | M-LEARNING-029, M-LEARNING-030 |
| ED-I18N-2 | S16 | K3 | L-C (I composes) | 10.5 | 4 | 5 | เปิด 4 บางส่วน 1 | M-LAUNCH-068, M-LEARNING-031, M-LEARNING-034, M-LEARNING-035, M-LEARNING-037 |
| ED-I18N-3 | S16 | K4 | L-C/L-UI | 4 | 1 | 1 | เปิด 1 | M-LEARNING-032 |
| ED-INST-1 | S16 | K1-K3 | L-C+T | 15 | 5 | 4 | เปิด 2 บางส่วน 2 | M-LEARNING-045, M-LEARNING-046, M-LEARNING-047, M-PLATFORM-073 |
| ED-INST-2 | S16 | K5 | H+L-C | 12 | 4 | 2 | เปิด 1 เลื่อน 1 | M-LEARNING-056, M-LEARNING-069 |
| ED-LES-1 | S16 | K1-K2 | L-C (+L-UI) | 14 | 5 | 6 | เปิด 4 บางส่วน 2 | M-LEARNING-007, M-LEARNING-008, M-LEARNING-009, M-LEARNING-010, M-LEARNING-011, M-LEARNING-012 |
| ED-LES-2 | S16 | K3 | L-UI/L-C | 17.5 | 5 | 4 | เปิด 2 บางส่วน 2 | M-LAUNCH-063, M-LEARNING-016, M-LEARNING-017, M-LEARNING-018 |
| ED-LES-3 | S16 | K4 | L-C/L | 13.5 | 4 | 3 | เปิด 3 | M-LEARNING-015, M-LEARNING-021, M-LEARNING-022 |
| ED-MIL-1 | S16 | K4 | O+L-C | 24 | 8 | 4 | เปิด 2 บางส่วน 2 | M-ORBIT-009, M-ORBIT-037, M-ORBIT-038, M-ORBIT-039 |
| ED-PACK-1 | S16 | K3 | L-C | 8 | 3 | 2 | บางส่วน 2 | M-LEARNING-025, M-LEARNING-052 |
| ED-PACK-2 | S16 | K3-K4 | L-C (H confirms) | 8 | 3 | 2 | เปิด 2 | M-LEARNING-055, M-LEARNING-059 |
| ED-PED-1 | S16 | K4 | L-C/L-UI | 16 | 5 | 3 | เปิด 2 เลื่อน 1 | M-LAUNCH-064, M-LEARNING-019, M-LEARNING-020 |
| ED-PED-2 | S16 | K4 | L-C | 5.5 | 2 | 2 | เปิด 1 บางส่วน 1 | M-LEARNING-023, M-LEARNING-060 |
| ED-PED-3 | S16 | K4-K6 | L-C (+O military tools) | 23 | 8 | 2 | บางส่วน 1 เลื่อน 1 | M-LEARNING-057, M-LEARNING-058 |
| HU-1 | S16 | K0-K2 | H (Q supports) | 4 | 1 | 1 | บางส่วน 1 | M-LEARNING-050 |
| HU-2 | S16 | K1-K3 | H | 5.5 | 2 | 2 | เปิด 2 | M-LEARNING-053, M-ORBIT-045 |
| HU-3 | S16 | K1-K3 | H + RU reader | 5.5 | 2 | 2 | เปิด 2 | M-LAUNCH-070, M-LEARNING-033 |
| HU-4 | S16 | K4 | H | 4 | 1 | 1 | เปิด 1 | M-LEARNING-051 |
| HU-5 | S16 | K4 | H | 4 | 1 | 1 | เปิด 1 | M-LEARNING-028 |
| HU-6 | S16 | K1-K4 | H+Q | 1.5 | 1 | 1 | เปิด 1 | M-PLAN-011 |
| R7.1 | S17 | each gate | Q/T | 32 | 11 | 5 | เปิด 3 บางส่วน 2 | M-LAUNCH-071, M-LEARNING-014, M-PLAN-025, M-PLATFORM-051, M-PLATFORM-061 |
| R7.2 | S17 | each gate | I/T/L/P | 14 | 5 | 5 | เปิด 3 บางส่วน 2 | M-LEARNING-067, M-LEARNING-068, M-ORBIT-041, M-PLAN-026, M-PLATFORM-047 |
| R7.3 | S17 | continuous | T | 16 | 5 | 10 | เปิด 7 บางส่วน 3 | M-PHYSICS-064, M-PLATFORM-045, M-PLATFORM-050, M-PLATFORM-053, M-PLATFORM-054, M-PLATFORM-056, M-PLATFORM-057, M-PLATFORM-058, M-PLATFORM-059, M-PLATFORM-060 |
| R7.4 | S17 | continuous | T (+I index.html) | 10 | 3 | 7 | เปิด 4 บางส่วน 3 | M-LEARNING-066, M-ORBIT-040, M-ORBIT-044, M-PLATFORM-017, M-PLATFORM-027, M-PLATFORM-028, M-PLATFORM-030 |
| R7.5 | S17 | continuous | I (+P physics docs) | 7.5 | 4 | 7 | เปิด 7 | M-BUILD-033, M-ORBIT-030, M-PLATFORM-062, M-PLATFORM-068, M-PLATFORM-069, M-PLATFORM-071, M-PLATFORM-072 |
| REJECTED | S19 | - | - | 4 | 0 | 15 | เลื่อน 1 ถูกแทนที่ 11 ปฏิเสธ 3 | M-LAUNCH-033, M-LAUNCH-075, M-LAUNCH-082, M-LEARNING-076, M-ORBIT-042, M-ORBIT-065, M-ORBIT-066, M-PHYSICS-016, M-PHYSICS-053, M-PHYSICS-054, M-PHYSICS-073, M-PLAN-012, M-PLATFORM-046, M-PLATFORM-081, M-PLATFORM-082 |
| **รวม** |  |  |  | 1074.5 | 380 | 429 |  |  |

### App B — แผนที่รหัสเดิมสู่รหัสใหม่

ลำดับการไล่ทุกกรณี: `คำนำหน้า:id` → M-id (ฟิลด์ `sources` ของ ledger) → แพ็กเกจ → ส่วน (S00 §00.6.9) แถวต้นทางที่ถูกแยกระบุปลายทางทุกตัว รหัสในเอกสารต้นทางไม่ถูกเปลี่ยนชื่อ

#### B1 ส่วนของ PLAN v1.2 → ส่วนของ v2.0

| PLAN v1.2 | v2.0 | หมายเหตุ |
|---|---|---|
| §1 เป้าหมาย ลำดับความสำคัญ และขอบเขตหลักฐาน | S02 | ลำดับผลส่งมอบใหม่ใน S02 §02.2; OR-1…OR-6 |
| §2 สิ่งที่มีอยู่แล้วและปัญหาที่ต้องพิสูจน์ | S03 | ข้อเท็จจริงและการวินิจฉัย ณ 4 ต.ค. 2026 |
| §3 ตารางติดตามข้อเสนอ (U01–U16, A01–A05) | S02/S03 | ตารางรายรหัสอยู่ใน B2 |
| §4.1 เรื่องที่ต้องยืนยัน (D01–D09) | S08 | = D-29…D-37 ในทะเบียนเดียว |
| §4.2 สัญญาที่ต้องใช้ร่วมกัน | S07 | R0.2r (M-PLAN-013); แคตตาล็อก oracle §07.5 |
| §5 ระยะ R0–R7 | S06, S07, S10–S17 | R0→S07; R1.6→S10; R2→S06/S11; R3→S12; R4→S13/S14; R5/R6/R8→S15; ED/HU→S16; R7→S17 |
| §6 การแบ่งเจ้าของงาน | S18 | เลน write set และ hotspot protocol |
| §7 เส้นทางรอกันและแผนขนาน (W0–W7) | S05 | คลื่น K0–K6 และกราฟการพึ่งพา; W เลิกใช้ |
| §8 มาตรฐานฟิสิกส์และแผนตรวจจรวด | S13/S14 | §8.1–8.6 แทบตรงตัวใน S13 §13.2; protocol การ validate ใน S14 §14.6 |
| §9 วิเคราะห์ workflow และการปรับวิธีทำงาน | S18/S17 | §9.1 → S18 §18.16; §9.2 → S18 §18.15 และ R7.3 |
| §10 เกณฑ์ตรวจรับ เผยแพร่ ย้อนกลับ | S04/S17/S18 | §10.1 → S04 §04.4; §10.2 → S18 §18.10; §10.3 → S17 (R7.2) และ G7 ใน S05 |
| §11 ความเสี่ยง คำถามรอคำตอบ การประมาณงาน | S05/S08 | §11.1 → S05 §05.13; §11.2 → S08; §11.3 → S05 §05.11 |
| §12 รูปแบบส่งต่องานสำหรับ AI | S18/S00 | §12.1–12.2 → S18 §18.11–18.12; §12.3–12.4 → S00 และส่วนที่เป็นบ้าน |
| บันทึกสถานะเอกสาร (บรรทัด 869–875) | S00 | คัดลอกตรงตัวใน S00 §00.9 |

#### B2 รหัสของ PLAN v1.2 → แพ็กเกจ การตัดสินใจ หรือประตู

คอลัมน์ "สถานะรายการ" นับจาก `assignment.tsv` ของ M-id ที่ระบุ (ณ ฐานแผน) คอลัมน์ "สถานะ v1.2" มาจาก PROGRESS และรายงานที่ส่งมอบ

**งาน R** (รหัสใหม่ R0.4, R1.6, R2.5, R2.6, R3.0, R3.6, R4.5–R4.7, R7.3–R7.5, R8 ไม่มีในตารางนี้ เพราะไม่มีใน v1.2; ดู S05 §05.1)

| PLAN | สถานะ v1.2 | v2.0 | M-id | สถานะรายการ |
|---|---|---|---|---|
| PLAN:R0.1 | ทำต่อ (กฎ reproducer) | R0.1 (S07 §07.1); audit โปรแกรมฟิสิกส์ย้ายไป R4.1 | M-PHYSICS-040 | เปิด 1 |
| PLAN:R0.2 | สัญญาที่ R1/R2 ต้องใช้ทำแล้ว | R0.2r (S07 §07.2) ADR ทันเวลาใช้; CraftState ก่อน R5.2; G0 ปิดด้วย D-59 | M-PLAN-013, M-PLAN-007 | เปิด 2 |
| PLAN:R0.3 | อยู่ใน PLAN §6/§9.1 เป็นร้อยแก้ว | R0.3r (S07 §07.3); ความเร็ว CI อยู่ R7.3 | M-PLAN-014, M-PLATFORM-045 | เปิด 1 · บางส่วน 1 |
| PLAN:R1.1 | ส่งมอบ (R1, `472645f`) | เสร็จ; ต่อด้วย R1.6 (S10) | M-PLATFORM-001, M-PLATFORM-002, M-PLATFORM-004 | เปิด 3 |
| PLAN:R1.2 | ส่งมอบ (R1) | เสร็จ; คู่มือโปรไฟล์ M-PLATFORM-074 (R1.6) | M-PLATFORM-074 | เปิด 1 |
| PLAN:R1.3 | ส่งมอบ (R1) | เสร็จ; touch-action เลื่อน (S08) | M-LAUNCH-039 | เลื่อน 1 |
| PLAN:R1.4 | ส่งมอบ (R1) | เสร็จ; ใช้ต่อใน R5.3 (contact, เชื้อเพลิงจำกัด) | M-ORBIT-026 | เปิด 1 |
| PLAN:R1.5 | ส่งมอบ (R1) | เสร็จ; ต่อด้วย R7.3 | M-PLATFORM-049, M-PLATFORM-046 | เสร็จ 1 · ถูกแทนที่ 1 |
| PLAN:R2.1 | ส่งมอบใน #74 (บางส่วน) | CO-4, R2.1r (S06, S11) | M-LAUNCH-001, M-LAUNCH-005, M-LAUNCH-007, M-LAUNCH-009, M-LAUNCH-002, M-LAUNCH-003, M-LAUNCH-004, M-LAUNCH-006, M-LAUNCH-008, M-LAUNCH-066, M-PLAN-009, M-PLAN-015 | เปิด 5 · บางส่วน 3 · เสร็จ 4 |
| PLAN:R2.2 | ส่งมอบใน #74 (บางส่วน) | CO-4 (cam.intro), R2.2r | M-LAUNCH-010, M-LAUNCH-011, M-LAUNCH-012, M-LAUNCH-061, M-PLAN-021 | เปิด 4 · เสร็จ 1 |
| PLAN:R2.3 | ขั้น 1 ส่งมอบใน #74 | R2.3s2; EQ-12; Docking preset → R5.4 | M-LAUNCH-013, M-LAUNCH-014, M-LAUNCH-038, M-LAUNCH-023, M-LAUNCH-015 | เปิด 3 · เสร็จ 1 · เลื่อน 1 |
| PLAN:R2.4 | ส่งมอบใน #74 | R2.6 (แถวกระโดดไปเหตุการณ์ + seek API) | M-LAUNCH-016, M-LAUNCH-017, M-LAUNCH-062 | เปิด 1 · บางส่วน 1 · เสร็จ 1 |
| PLAN:R3.1 | ส่งมอบ: #75 provenance + #80 DesignRef (G3 2026-10-04) | DELIVERED (S03 §03.2); ต่อยอด R3.1r (S12 §12.3) | M-BUILD-001, M-BUILD-011, M-LAUNCH-030, M-PLAN-028 | เปิด 2 · บางส่วน 1 · เสร็จ 1 |
| PLAN:R3.2 | ส่งมอบ: bench SVG (#75) | DELIVERED; ต่อยอด R3.2r | M-BUILD-002, M-LAUNCH-076 | เปิด 1 · เสร็จ 1 |
| PLAN:R3.3 | ส่งมอบ: schematic (#75), ท่าพับเก็บ (#78), diagram (#80) | DELIVERED; ต่อยอด R3.3r | M-BUILD-003, M-LAUNCH-081 | บางส่วน 1 · เสร็จ 1 |
| PLAN:R3.4 | ส่งมอบ: readinessTarget, Show the part (#75), Show its settings (#77) | DELIVERED; ต่อยอด R3.4r | M-BUILD-004, M-BUILD-009, M-BUILD-012, M-BUILD-015, M-BUILD-031, M-BUILD-032, M-LAUNCH-065, M-PLAN-027, M-PLAN-030 | เปิด 7 · เสร็จ 1 · เลื่อน 1 |
| PLAN:R3.5 | ส่งมอบ: #77 + revision ใน eyebrow (#80) | DELIVERED; ต่อยอด R3.5r; 063 → ED-LES-2; 068 → ED-I18N-2; journey → R7.1 | M-BUILD-005, M-BUILD-013, M-BUILD-023, M-LAUNCH-063, M-LAUNCH-067, M-LAUNCH-068, M-PLAN-025 | เปิด 3 · บางส่วน 2 · เสร็จ 1 · เลื่อน 1 |
| PLAN:R4.1 | ยังไม่เริ่ม | R4.1 (K1–K3 วิจัย) | M-PHYSICS-040, M-PHYSICS-041, M-PHYSICS-048, M-PHYSICS-049, M-ORBIT-043 | เปิด 2 · บางส่วน 3 |
| PLAN:R4.2 | Soyuz refit #63/#64 ก่อนแผน | R4.2-S (K3, G4-S) + R4.2 (K4) | M-PHYSICS-042, M-PHYSICS-043, M-PHYSICS-044, M-PHYSICS-045, M-PHYSICS-046, M-PHYSICS-047, M-PHYSICS-052, M-PHYSICS-023, M-PHYSICS-024 | เปิด 9 |
| PLAN:R4.3 | ยังไม่เริ่ม | R4.3 | M-BUILD-016, M-BUILD-017, M-BUILD-018, M-BUILD-019, M-BUILD-020, M-PHYSICS-029, M-PHYSICS-030, M-ORBIT-046, M-LAUNCH-031 | เปิด 9 |
| PLAN:R4.4 | ยังไม่เริ่ม | R4.4 → G4 | M-PHYSICS-050, M-PHYSICS-051, M-PHYSICS-061, M-LAUNCH-072 | เปิด 2 · บางส่วน 2 |
| PLAN:R5.1 | Soyuz MS docking มีแล้ว (IS:G07) | R5.1 ต่อยอด ไม่สร้างใหม่ | M-ORBIT-024 | เปิด 1 |
| PLAN:R5.2 | ยังไม่เริ่ม | R5.2 (D-35) | M-ORBIT-025 | เปิด 1 |
| PLAN:R5.3 | ยังไม่เริ่ม | R5.3 | M-ORBIT-026 | เปิด 1 |
| PLAN:R5.4 | ยังไม่เริ่ม | R5.4 | M-ORBIT-027, M-LAUNCH-015 | เปิด 1 · เลื่อน 1 |
| PLAN:R6.1 | ยังไม่เริ่ม | R6.1 (D-37) | M-PLAN-022 | เปิด 1 |
| PLAN:R6.2 | ยังไม่เริ่ม | R6.2 | M-PLAN-023 | เปิด 1 |
| PLAN:R6.3 | ยังไม่เริ่ม | R6.3 | M-PLAN-024 | เปิด 1 |
| PLAN:R7.1 | ยังไม่เริ่ม (ตาม PROGRESS; M-PLATFORM-061 มี diagnostics จาก #81/#82 แต่ยังเปิด) | R7.1 ถาวร ทุกประตู | M-PLAN-025, M-PLATFORM-051, M-PLATFORM-061, M-LEARNING-014, M-LAUNCH-071 | เปิด 3 · บางส่วน 2 |
| PLAN:R7.2 | ยังไม่เริ่ม | R7.2 ถาวร ทุกประตู | M-PLAN-026, M-PLATFORM-047, M-LEARNING-067, M-LEARNING-068, M-ORBIT-041 | เปิด 3 · บางส่วน 2 |

**ข้อเสนอ U01–U16 และ A01–A05** (`PLAN:U01` ไม่ใช่ `RM:U01`; ดู S00 §00.6.3)

| PLAN | เรื่อง | v2.0 | M-id | สถานะรายการ |
|---|---|---|---|---|
| PLAN:U01 | รีเซ็ตและโปรไฟล์ | R1.1–R1.2 เสร็จ (G1); R1.6; D-33 | M-PLATFORM-001, M-PLATFORM-074 | เปิด 2 |
| PLAN:U02 | Engineer กระชับ ภาพใหญ่ขึ้น | R2.1 (#74) → CO-3 (G2), R2.1r | M-LAUNCH-002, M-LAUNCH-018 | เปิด 1 · บางส่วน 1 |
| PLAN:U03 | Watch เลือกกล้องเอง | R2.2 เสร็จ; CO-4; R2.2r | M-LAUNCH-010, M-LAUNCH-011, M-LAUNCH-012 | เปิด 2 · เสร็จ 1 |
| PLAN:U04 | Build มีภาพช่วยเข้าใจ | ส่งมอบ (G3); ต่อยอด R3.2r–R3.4r | M-BUILD-002, M-BUILD-003, M-BUILD-004 | เสร็จ 3 |
| PLAN:U05 | โหมดเชื่อมกัน | ส่งมอบ (G3); ต่อยอด R3.1r; R5.1 | M-BUILD-001, M-BUILD-005, M-ORBIT-024 | เปิด 1 · เสร็จ 2 |
| PLAN:U06 | ISS จน docking จริง | R5.1–R5.4 (D-30, D-35) | M-ORBIT-024, M-ORBIT-025, M-ORBIT-026, M-ORBIT-027 | เปิด 4 |
| PLAN:U07 | wheel เลื่อนหน้าต่าง | R1.3 เสร็จ; touch-action เลื่อน | M-LAUNCH-039 | เลื่อน 1 |
| PLAN:U08 | เอาปุ่มรีเซ็ตกล้องออก | R2.2 เสร็จ | M-LAUNCH-010 | เสร็จ 1 |
| PLAN:U09 | notation ตามภาษา | R2.1 เสร็จ (D-34) | M-LAUNCH-005 | เสร็จ 1 |
| PLAN:U10 | เลือกและจัดหน้าจอ Engineer เอง | R2.3 ขั้น 1 เสร็จ; R2.3s2 | M-LAUNCH-013, M-LAUNCH-014 | เปิด 1 · เสร็จ 1 |
| PLAN:U11 | ซ่อน setup เมื่อบิน | R2.1 เสร็จ (D-36.A1) | M-LAUNCH-001 | เสร็จ 1 |
| PLAN:U12 | วิธี Soyuz กับจรวดอื่น | R0.1, R4.1–R4.4 (S13) | M-PHYSICS-040, M-PHYSICS-042, M-PHYSICS-061 | เปิด 2 · บางส่วน 1 |
| PLAN:U13 | ตรวจ workflow | R0.3r, R7.2, R7.3, S18 | M-PLAN-014, M-PLAN-026, M-PLATFORM-045 | เปิด 2 · บางส่วน 1 |
| PLAN:U14 | โหมดนักบินอวกาศ | R6.1–R6.3 (D-37) | M-PLAN-022, M-PLAN-023, M-PLAN-024 | เปิด 3 |
| PLAN:U15 | ฟิสิกส์เป็นรากฐาน | S02 §02.10; แทร็ก R4; G4-S/G5/G6 | M-PHYSICS-063 | บางส่วน 1 |
| PLAN:U16 | Max-Q และความหมายของแรงขับ | CO-4 ขั้น 9; R4.2-S (D-57); S13 §13.2.7 | M-LAUNCH-004, M-PHYSICS-052 | เปิด 1 · บางส่วน 1 |
| PLAN:A01 | เริ่มทดลองจากหน้าแรก | ส่งมอบ #77; การ์ด → R3.5r | M-BUILD-005, M-LAUNCH-067 | บางส่วน 1 · เสร็จ 1 |
| PLAN:A02 | คำแนะนำหลังบินพาไปแก้ค่า | ส่งมอบ #77; diagnosis → ED-LES-2 | M-BUILD-005, M-LAUNCH-063 | บางส่วน 1 · เสร็จ 1 |
| PLAN:A03 | readiness พาไปชิ้นต้นเหตุ | ส่งมอบ #75/#77; focus ช่อง → R3.4r (M-PLAN-030) | M-BUILD-004 | เสร็จ 1 |
| PLAN:A04 | ควบคุมบนมือถือขณะอ่านกราฟ | R2.1 เสร็จ; CO-4 (toast ทับ) | M-LAUNCH-007, M-LAUNCH-066 | เปิด 1 · เสร็จ 1 |
| PLAN:A05 | เลือกเหตุการณ์ซ้อนบน timeline | R2.4 เสร็จ; R2.6 | M-LAUNCH-016, M-LAUNCH-062 | เปิด 1 · เสร็จ 1 |

**การตัดสินใจ D01–D09** (เนื้อหาเต็มอยู่ที่ S08 §08.3; `PLAN:D07` ≠ `RM:D07` ≠ `DEC:D-7` ≠ `CR:D7`)

| PLAN | ทะเบียน | เรื่อง | สถานะ | ลงที่ |
|---|---|---|---|---|
| PLAN:D01 | D-29 | โปรไฟล์ในเครื่อง ออฟไลน์ | ตัดสินแล้ว (2026-10-03) | R1.1/R1.2 |
| PLAN:D02 | D-30 | ISS เริ่มด้วย Soyuz | ตัดสินแล้ว | R5, G4-S |
| PLAN:D03 | D-31 | ห้องนักบินก่อน EVA | ตัดสินแล้ว | R6 |
| PLAN:D04 | D-32 | แยกงานทุกชนิดตามผู้เรียน | ตัดสินแล้ว | R1.1 |
| PLAN:D05 | D-33 | ขอบเขตการรีเซ็ต | ใช้แล้ว รอยืนยัน (ชุด A) | R1 |
| PLAN:D06 | D-34 | notation เมื่อเปลี่ยนภาษา | ใช้แล้ว รอยืนยัน (ชุด A) | R1/R2 (M-LAUNCH-005) |
| PLAN:D07 | D-35 | เป้าความสมจริงของ ISS | เปิด (ชุด C, K2) | R5.2 (M-ORBIT-028) |
| PLAN:D08 | D-36 (+A1–A5) | layout, preset, ขนาดฉากขั้นต่ำ | เปิด; A1–A5 ใช้แล้ว รอยืนยัน (ชุด A) | CO-3 → G2 (M-LAUNCH-018) |
| PLAN:D09 | D-37 | ห้องนักบิน: ยาน ระบบ อุปกรณ์ | เปิด (ชุด C, K4) | R6.1 (M-PLAN-022) |

**คลื่น W0–W7 → K0–K6** (ย่อจาก S05 §05.12 ซึ่งเป็นบ้าน)

| PLAN | เนื้อหาเดิม | v2.0 |
|---|---|---|
| PLAN:W0 | baseline, inventory, วิจัยแหล่ง, audit workflow; G0 | Day 0 + K0 (CO, R0.4) + K1 (R0.2r, R0.3r, R4.1); G0 ปิดด้วย D-59 |
| PLAN:W1 | profiles/storage, gesture, fuel, CI; G1 | ส่งมอบใน R1 (G1 ผ่าน); R1.6 ใน K1 (G1+) |
| PLAN:W2 | layout, CameraPolicy, timeline chooser; G2 | #74; K0 (CO-3/4/5 → G2, GCO); K1–K2 → "R2 complete" |
| PLAN:W3 | ภาพจรวด/ดาวเทียม, readiness; G3 | #75–#80 ส่งมอบครบ → G3 (2026-10-04, คำเจ้าของ); R3+ ต่อยอด R3.0, R3.1r–R3.5r ใน K3 (ไม่ gate), R3.6 และ M-BUILD-023 ใน K4 |
| PLAN:W4 | ความสมจริงราย family; G4 | R4 ถาวร: K1–K3 R4.1; K3 R4.2-S → G4-S; K4 R4.2–R4.7 → G4 |
| PLAN:W5 | ISS; G5 | K5 (เริ่มได้ใน K4 หลัง G4-S) → G5 |
| PLAN:W6 | cockpit; G6 | K6 (R6.1–R6.3) → G6; R8 ใน K6 → G8 |
| PLAN:W7 | release aggregate; G7 | R7 ถาวร; G7 ใช้ที่ทุก GK |

**ประตู G0–G7** (เกณฑ์ทุกประตูอยู่ใน S05 §05.4 เท่านั้น; ประตูใหม่ GCO, G1+, G4-S, G8, GK0–GK6)

| PLAN | เดิม | v2.0 | สถานะ |
|---|---|---|---|
| PLAN:G0 | ตรึง product/schema/acceptance/ownership | ปิดอย่างเป็นทางการด้วย D-59 (M-PLAN-007); เกณฑ์ปิดใน S05 §05.4 | เปิด → ปิดที่ CO-8 |
| PLAN:G1 | โปรไฟล์และ storage | ผ่านใน R1; เพิ่ม G1+ (R1.6) | ผ่าน |
| PLAN:G2 | workspace ของ R2 | CO-3 (D-36 + A1–A5, ภาพ) → G2; "R2 complete" = G2 + CO-4 + CO-5 + R2.3s2 + R2.5 baseline + R2.6 | ยังไม่ลงนาม |
| PLAN:G3 | journey ที่เชื่อมแบบ | บันทึกส่งมอบใน S05 §05.4; เกณฑ์ที่แผนเพิ่มย้ายไป R7.1/R3.1r/R3.0 (S12 §12.9) | ส่งมอบ 2026-10-04 |
| PLAN:G4 | fleet acceptance | G4-S (ชุด Soyuz ที่ R5 ต้องใช้) + G4 (ไม่บล็อก release อื่น) | เปิด |
| PLAN:G5 | ISS จน hard dock | G5 (คำตัดสินแยก insertion/rendezvous/capture/hard dock) | เปิด |
| PLAN:G6 | cockpit | G6 พร้อมการทดสอบผู้ใช้จริง | เปิด |
| PLAN:G7 | release รวม | G7 ใช้ที่ทุกประตู (R7.2); v1.0 ติด tag ที่ประตูแรกที่มีช่อง release ตาม D-19/D-20 | เปิด |

#### B3 ROADMAP-PART2-3 (`RM:`) → แพ็กเกจ

`docs/ROADMAP-PART2-3.md` **คงรูปแบบและรหัสทุกตัว** (เทสต์ `tests/section-plan.test.ts` และ `tests/section-nav-model.test.ts` parse ไฟล์นี้ และเป็นที่มาของรายการ "coming next" ในแอป) แผนนี้แมปโดยไม่แก้ไฟล์ การแก้ prose ในรูปแบบเดิมทำผ่าน R7.5 เท่านั้น (M-ORBIT-030, M-PLATFORM-068) และงานที่ส่งมอบรายการ ROADMAP แก้ไฟล์ใน PR เดียวกัน คำว่า "status lives in IMPLEMENTATION-STATUS" ในไฟล์ถูกแทนด้วยกฎใน S00 §00.8 โดยไม่แก้ไฟล์

| ส่วนหรือ phase ใน ROADMAP | แถวต้นทาง | แถวที่แมป | M-id | แพ็กเกจ (จำนวนรายการ) | ตัวอย่าง id |
|---|---|---|---|---|---|
| The idea | 3 | 3 | 5 | DELIVERED 4, R3.3r 1 | RM:idea-1, RM:idea-2, RM:idea-3 |
| Principles | 16 | 16 | 10 | PRINCIPLE 5, DELIVERED 2, ED-MIL-1 1, R7.4 1, REJECTED 1 | RM:P1, RM:P2a, RM:P2b, RM:P2c, RM:P3a +11 |
| Item identifiers | 2 | 2 | 3 | IDSCHEME 1, R7.5 1, R8 1 | RM:IDS-1, RM:IDS-2 |
| Phase 0: Structure | 8 | 8 | 8 | DELIVERED 4, PRINCIPLE 2, ED-I18N-2 1, REJECTED 1 | RM:S01, RM:S01-home, RM:S01-plan, RM:S02, RM:S02-mcp +3 |
| S02: what keys off a vehicle id | 2 | 2 | 3 | DELIVERED 2, R3.2r 1 | RM:S02-keys, RM:S02-octaweb |
| Phase 1: Orbit core | 4 | 4 | 5 | DELIVERED 4, R4.6 1 | RM:O01, RM:O02, RM:O03, RM:O04 |
| Phase 2: Real satellites and the military track | 8 | 8 | 10 | DELIVERED 8, R4.6 1, R5.2 1 | RM:R01, RM:R02, RM:R03, RM:R04, RM:R05 +3 |
| Phase 2.5: the physics made finer | 10 | 10 | 11 | DELIVERED 6, DEC 1, EQ-5 1, HU-3 1, R0.4 1, R5.2 1 | RM:P2.5-a, RM:P2.5-b, RM:P2.5-c, RM:P2.5-d, RM:P2.5-e +5 |
| Phase 3: Rocket builder | 7 | 7 | 11 | DELIVERED 6, R4.3 2, REJECTED 2, DEC 1 | RM:D01, RM:D02, RM:D03, RM:D03-eng, RM:D04 +2 |
| Phase 4: Satellite builder and instructor mode | 8 | 8 | 8 | DELIVERED 4, DEC 2, HU-2 1, R4.3 1 | RM:D06, RM:D06-misses, RM:D06-v3, RM:D06-src, RM:D07 +3 |
| Phase 5: The Moon | 6 | 6 | 5 | R8 5 | RM:L01, RM:L02, RM:L03, RM:L04, RM:L05 +1 |
| Phase 6: The game layer | 3 | 3 | 3 | ED-GAME-1 2, DEC 1 | RM:X01, RM:X02, RM:X-backend |
| The military track | 4 | 4 | 4 | ED-MIL-1 3, DELIVERED 1 | RM:MT-covered, RM:MT-GNSS, RM:MT-HADR, RM:MT-ASAT |
| Architecture notes for Phase 0 | 7 | 7 | 5 | DELIVERED 3, PRINCIPLE 2 | RM:ARCH-routing, RM:ARCH-resolver, RM:ARCH-domfree, RM:ARCH-handoff, RM:ARCH-data +2 |
| Document mechanics (implicit) | 1 | 1 | 1 | R7.5 1 | RM:ARCH-consumed |
| Header | 1 | 1 | 1 | IDSCHEME 1 | RM:DOC-status |

ตระกูลรหัสของ ROADMAP → แพ็กเกจหลัก: **ARCH** → DELIVERED 3, PRINCIPLE 2, R7.5 1 · **D** → DELIVERED 8, DEC 3, R4.3 3 · **DOC** → IDSCHEME 1 · **IDS** → IDSCHEME 1, R7.5 1, R8 1 · **L** → R8 4 · **M** → DELIVERED 3, R4.6 1 · **MT** → ED-MIL-1 3, DELIVERED 1 · **O** → DELIVERED 4, R4.6 1 · **P** → DELIVERED 8, PRINCIPLE 5, REJECTED 3 +8 · **R** → DELIVERED 5, R5.2 1 · **S** → DELIVERED 5, PRINCIPLE 2, ED-I18N-2 1 +2 · **T** → DELIVERED 2, HU-2 1 · **X** → ED-GAME-1 2 · **X-** → DEC 1 · **idea** → DELIVERED 4, R3.3r 1

รหัสที่มีชื่อเฉพาะ: `RM:L01–L05` → R8.1–R8.5 (S15 §15.3; ชื่อใน ROADMAP ไม่เปลี่ยน) · `RM:X01/X02` → ED-GAME-1 (S16) · `RM:R01–R05` (ไม่ใช่ PLAN:R1–R5) → รายการ Orbit ที่ส่งมอบแล้วใน S03 · `RM:D01–D07` (ไม่ใช่ PLAN:D01–D07) → Build/Orbit ที่ส่งมอบ (M-BUILD-034…038, M-ORBIT-062) · `RM:P7` (กฎ golden) → S02 §02.10 รูปแคบ

#### B4 DEVELOPMENT-PLAN-TH (`DP:`) และ REMAINING-WORK-TH (`RW:`) → แพ็กเกจ

นับจาก ledger ต้นทาง (แถวละหนึ่งข้อของเอกสาร) แล้วจับคู่กับฟิลด์ `sources` ของ ledger รวม ตระกูลคือส่วนหน้าของ id (`LUI-02` → LUI; `11-02` → §11; `section-3.1` → §3) แถวที่ "ไม่แมป" แสดงรายตัวท้ายตาราง

**DP: DEVELOPMENT-PLAN-TH**

| ตระกูล | ส่วนในเอกสาร (ที่พบมากสุด) | แถว | แมป | M-id | แพ็กเกจ (จำนวนรายการ) |
|---|---|---|---|---|---|
| ENG | 7.4 Engineering quality, architecture and… | 48 | 48 | 28 | DELIVERED 5, R7.3 3, R7.5 3, DEC 2, R0.4 2, R3.4r 2 +10 |
| CTX | 7.5 Thai/RTAF context, institutional value and… | 39 | 39 | 32 | DELIVERED 4, R7.2 4, ED-MIL-1 3, ED-INST-2 2, ED-PED-3 2, FX-3 2 +15 |
| D- | 10 Owner decisions | 28 | 28 | 30 | DEC 7, DELIVERED 5, ED-INST-2 2, R7.2 2, CO-7 1, ED-EVAL 1 +12 |
| §12 | 12 Gaps every source plan missed | 28 | 28 | 28 | R2.5 3, DEC 2, FX-7 2, R7.4 2, R7.5 2, CO-3 1 +16 |
| PED | 7.1 Pedagogy and learning outcomes | 24 | 24 | 23 | ED-LES-2 4, ED-GAME-1 2, ED-PED-1 2, ED-PED-2 2, DELIVERED 1, ED-ASSESS-1 1 +11 |
| §8 | 8 Combined metrics measurable without analytics | 21 | 21 | 17 | METRIC 4, R4.1 2, REJECTED 2, CO-8 1, ED-I18N-1 1, ED-INST-2 1 +6 |
| PHY | 6. Months 7-12 | 19 | 19 | 23 | R4.2 5, R4.1 3, R4.3 3, R4.6 3, R8 3, DELIVERED 2 +3 |
| §11 | 11 Conflicts between plans and the panel's… | 18 | 18 | 19 | REJECTED 4, DEC 2, DELIVERED 2, ED-I18N-3 1, ED-PACK-1 1, ED-PED-2 1 +8 |
| §7.4 | 7.4 Engineering quality, architecture and… | 15 | 15 | 12 | METRIC 2, R7.3 2, R7.5 2, CO-8 1, DEC 1, EQ-15 1 +3 |
| §9 | 9 What not to do (agreed across the five plans) | 15 | 15 | 13 | PRINCIPLE 6, R7.3 2, REJECTED 2, EQ-15 1, IDSCHEME 1, R7.5 1 |
| UX | 6. Months 4-6 (proposed order) | 14 | 14 | 18 | DELIVERED 2, ED-GAME-1 2, R2.5 2, R3.5r 2, ED-CLASS-2 1, ED-I18N-2 1 +8 |
| §7.5 | 7.5 Thai/RTAF context, institutional value and… | 13 | 12 | 12 | ED-PACK-1 2, PRINCIPLE 2, R7.5 2, ED-I18N-1 1, ED-INST-1 1, ED-INST-2 1 +3 |
| P- | 2. Principles every item must pass | 12 | 12 | 14 | PRINCIPLE 3, R7.3 2, CO-8 1, DEC 1, ED-I18N-1 1, ED-PACK-1 1 +5 |
| §13 | 13 Main risks of this plan | 10 | 10 | 13 | DEC 3, CO-6 1, CO-7 1, DELIVERED 1, EQ-15 1, HU-1 1 +5 |
| §7 | 7.1 Pedagogy and learning outcomes | 9 | 9 | 8 | METRIC 3, PRINCIPLE 3, R2.3s2 1, R4.1 1 |
| §1 | 1. Vision (12-month) | 6 | 6 | 11 | METRIC 2, R7.2 2, ED-CLASS-2 1, ED-LES-2 1, ED-MIL-1 1, ED-PED-3 1 +3 |
| INF | 5. Background PRs (any time, no flight change) | 5 | 5 | 5 | DELIVERED 1, ED-INST-1 1, FX-6 1, FX-7 1, R7.4 1 |
| W | 4. Week 0 owner tasks | 5 | 5 | 7 | DELIVERED 3, CO-6 1, CO-8 1, DEC 1, FX-3 1 |
| B- | 5. Background PRs (any time, no flight change) | 2 | 2 | 2 | FX-1 1, R7.5 1 |
| LES | 5. Background PRs (any time, no flight change) | 2 | 2 | 3 | ED-LES-1 2, R7.5 1 |
| LUI | 5. Session 4 (weeks 7-8): Engineer tools… | 2 | 2 | 2 | CO-4 1, FX-4 1 |
| ORB | 5. Background PRs (any time, no flight change) | 2 | 2 | 4 | FX-3 3, FX-4 1 |
| S | 3. Starting point (snapshot 30 Sep) | 2 | 2 | 2 | DELIVERED 1, R7.1 1 |
| §3 | 3. Starting point (snapshot 30 Sep) | 2 | 2 | 2 | DELIVERED 1, REJECTED 1 |
| §5 | 5. Background PRs (any time, no flight change) | 1 | 1 | 1 | METRIC 1 |
| **รวม** |  | 342 | 341 | 179 |  |

**RW: REMAINING-WORK-TH**

| ตระกูล | ส่วนในเอกสาร (ที่พบมากสุด) | แถว | แมป | M-id | แพ็กเกจ (จำนวนรายการ) |
|---|---|---|---|---|---|
| DOC | 9. Documentation consistency and completeness | 23 | 23 | 16 | R7.5 3, DEC 2, DELIVERED 2, ED-INST-1 2, CO-8 1, ED-CLASS-2 1 +5 |
| PHY | 7. Physics, six-DOF and validation | 23 | 23 | 26 | R4.2 8, DELIVERED 4, R4.1 3, R4.5 3, CO-6 1, DEC 1 +6 |
| B- | 4. Build D01-D05 and readiness for D06/D07 | 22 | 22 | 20 | DELIVERED 3, R3.4r 3, R4.3 3, FX-1 2, DEC 1, ED-I18N-2 1 +7 |
| INF | 6. Infrastructure (build, bundle, PWA, data… | 19 | 19 | 21 | DELIVERED 3, FX-7 3, EQ-8 2, R7.4 2, CO-3 1, DEC 1 +9 |
| LES | 5. Lessons, placement test, worksheets, teacher… | 16 | 16 | 15 | DELIVERED 2, ED-LES-1 2, ED-LES-3 2, DEC 1, ED-ASSESS-1 1, ED-CLASS-1 1 +6 |
| LUI | 2. Launch UI and state (main.ts, panel.ts… | 15 | 15 | 14 | EQ-12 2, R2.5 2, CO-4 1, DEC 1, DELIVERED 1, ED-LES-2 1 +6 |
| TQ | 10. Test strategy, code quality and maintenance | 13 | 13 | 16 | R7.3 5, FX-4 3, DEC 2, R0.4 2, DELIVERED 1, EQ-15 1 +2 |
| ORB | 3. Orbit (playground, maneuvers, applications… | 12 | 12 | 10 | FX-3 4, FX-4 2, ED-MIL-1 1, EQ-5 1, R7.1 1, R7.5 1 |
| S | 13. Planned/roadmap work not yet started (from… | 11 | 11 | 14 | DELIVERED 3, ED-GAME-1 1, ED-I18N-1 1, ED-LES-1 1, ED-LES-2 1, ED-PED-2 1 +6 |
| I | 8. i18n, copy, accessibility and mobile | 7 | 7 | 6 | ED-I18N-2 2, ED-I18N-1 1, EQ-12 1, FX-3 1, FX-5 1 |
| LS | 11. Live site, GitHub Actions and open PRs… | 6 | 6 | 6 | DELIVERED 2, FX-7 2, R2.5 1, R7.4 1 |
| A | 8. i18n, copy, accessibility and mobile | 5 | 5 | 6 | R2.5 5, DELIVERED 1 |
| PR | 11. Live site, GitHub Actions and open PRs… | 5 | 5 | 5 | DELIVERED 2, R7.5 2, R8 1 |
| MOB | 8. i18n, copy, accessibility and mobile | 4 | 4 | 4 | CO-4 1, DELIVERED 1, R2.5 1, R3.4r 1 |
| COPY | 8. i18n, copy, accessibility and mobile | 2 | 2 | 2 | ED-I18N-1 1, ED-I18N-2 1 |
| §1 | 1. Executive summary | 2 | 2 | 2 | DELIVERED 1, HU-1 1 |
| CI | 11. Live site, GitHub Actions and open PRs… | 1 | 1 | 1 | DELIVERED 1 |
| D | 13. Planned/roadmap work not yet started (from… | 1 | 1 | 1 | DELIVERED 1 |
| ENG | 9. Documentation consistency and completeness | 1 | 1 | 1 | R7.5 1 |
| FONT | 8. i18n, copy, accessibility and mobile | 1 | 1 | 1 | R2.5 1 |
| L | 13. Planned/roadmap work not yet started (from… | 1 | 1 | 1 | R8 1 |
| MERGE | 11. Live site, GitHub Actions and open PRs… | 1 | 1 | 1 | DELIVERED 1 |
| OPEN | 13. Planned/roadmap work not yet started (from… | 1 | 1 | 1 | DELIVERED 1 |
| T | 13. Planned/roadmap work not yet started (from… | 1 | 1 | 1 | DELIVERED 1 |
| X | 13. Planned/roadmap work not yet started (from… | 1 | 1 | 2 | ED-GAME-1 2 |
| **รวม** |  | 194 | 194 | 147 |  |

**แถวต้นทางที่ไม่แมปไปยัง M-id ใด** (ทุกแถวมีเหตุผล ไม่มีงานตกหล่น)

| เอกสาร | id | เรื่อง | สถานะที่ ledger ต้นทางตรวจ | เหตุผลหรือปลายทาง |
|---|---|---|---|---|
| DP:7.5-P6 | 7.5-P6 | Automate the repeated; stop what is unused (measured by… | open | หลักการทั่วไป ไม่ใช่งานแยก: งานซ้ำที่ทำให้เป็นอัตโนมัติอยู่ใน R0.3r (M-PLAN-014) และ R7.3; การหยุดสิ่งที่ไม่ใช้ต้องมีหลักฐานจากผู้ใช้ (HU, S16) ก่อน |

**เอกสารอื่น (`OD:`):** 79 แถวจาก 23 เอกสาร แมปได้ 79 แถว ครบทุกแถว ดัชนีเต็มอยู่ใน B7

#### B5 ตารางเปลี่ยนชื่อ: ชื่อข้อเสนอใน ledger และรหัสของสถาปัตยกรรมที่ไม่ถูกเลือก → รหัสสุดท้าย

| ชื่อเดิม | รหัสสุดท้าย | บ้าน |
|---|---|---|
| E track | EQ-1…EQ-15 | S09 |
| B track | FX-1…FX-8 หรือ R1.6 | S10 |
| F track | R4.5 / R4.6 | S14 |
| Q track | R0.4 / R7.3 / R7.4 | S07, S17 |
| T track | ED-* / HU-* | S16 |
| B-LES-1 | FX-2 | S10 |
| B-ORBIT-1 | FX-3 | S10 |
| E-ORBIT-1 | EQ-4 | S09 |
| E-ORBIT-2 | EQ-5 | S09 |
| E-PHYS-1 | EQ-9 | S09 |
| E-PHYS-3 | EQ-10 | S09 |
| E-PHYS-2 | EQ-11 | S09 |
| F-PHYS-* | R4.5 | S14 |
| F-ORBIT-* | R4.6 | S14 |
| T-MIL-1 | ED-MIL-1 | S16 |
| T-I18N / T-LES / T-ASSESS / T-CLASS / T-INST / T-PACK / T-PED / T-GAME | ED-I18N-n / ED-LES-n / ED-ASSESS-1 / ED-CLASS-n / ED-INST-n / ED-PACK-n / ED-PED-n / ED-GAME-1 | S16 |
| R2.4b | R2.6 | S11 |
| New R2.5 (launch ledger) | R2.5 | S11 |
| New R3.0 (launch ledger) | R3.0 | S12 |
| R1.6 "Storage hardening" (platform ledger) | R1.6 | S10 |
| R8 "Moon, generalise C01" (orbit ledger) | R8 (R8.1–R8.5), G8 | S15 |
| RM:L01–L05 | R8.1–R8.5 | S15 |
| RM:X01/X02 | ED-GAME-1 | S16 |
| PLAN:W0–W7 | K0–K6 | S05 |
| PLAN:D01–D09 | D-29…D-37 | S08 |
| การตัดสินศัพท์ไทย OD:PLAN-2026-09-28/D5 | ER-6 (ไม่ใช่ DEC:D-5) | S08 §08.2 |
| exec QA-nn / DS-nn / RF-nn / PF-nn | R0.4, R1.6, R4.5–R4.7, R7.3–R7.5, FX-8 (ไม่ใช้เลขชุดที่สอง) | S05 |
| outcome `MP-<TRACK>-nn` / PH0–PH6 / DEC-n | ไม่ใช้ (OR-4); ใช้ R-id, K-คลื่น และ D-n | S00 |
| USER-TEST H1/H2/H3 และ UX-01…07 ของ beginner study | HUF-xx (protocol รวมของ HU-1) | S16 §16.3 |
| ช่องว่าง S14 §14.7 ข้อ 1 (ค่าคงที่ที่เท่ากันทุกบิตนอก 015) | M-PHYSICS-015 (fold, ไม่มี id ใหม่) | S09 EQ-10, S14 |

**alias ของ M-GAP (สถาปัตยกรรม execution-efficiency) และ M-NEW (outcome-driven) → M-PLAN** — ตารางแรกสร้างจากแท็ก `[=…]` ในชื่อของ M-PLAN (alias ทางการ) ตารางที่สองจับคู่จากเนื้อหาของ `arch-exec/gaps.tsv` และ `outcome-arch/wp-map.json` (ไม่ใช่ alias ทางการ ใช้เพื่อไล่หาเท่านั้น) รหัสเหล่านี้ห้ามใช้ในเนื้อความ

| M-PLAN | alias ทางการ (จากชื่อ) |
|---|---|
| M-PLAN-017 | exec M-GAP-001, outcome M-NEW-001 |
| M-PLAN-018 | M-GAP-003, M-NEW-004 |
| M-PLAN-019 | M-GAP-007, M-NEW-008 |
| M-PLAN-020 | M-GAP-002, M-NEW-020 |
| M-PLAN-021 | M-GAP-011 impl, M-NEW-017 |
| M-PLAN-022 | M-GAP-014, M-NEW-013 |
| M-PLAN-023 | M-GAP-015, M-NEW-014 |
| M-PLAN-024 | M-GAP-016, M-NEW-015 |
| M-PLAN-025 | M-GAP-017, M-NEW-018 |
| M-PLAN-026 | M-GAP-018, M-NEW-019 |

| รหัสในสถาปัตยกรรมที่ไม่ถูกเลือก | ปลายทาง | เรื่อง |
|---|---|---|
| M-GAP-004, M-GAP-005, M-NEW-002, M-NEW-003 | M-PLAN-001 | เส้นทางวิกฤตตอนเริ่มแอป (shader, texture) |
| M-GAP-006 | M-LAUNCH-045 | ภาพแผนที่ 2048 โหลดเมื่อใช้ (EQ-7) |
| M-GAP-008, M-NEW-005 | M-PLAN-003 (+ HU-6 M-PLAN-011) | หน่วยความจำตลอดภารกิจและรายงานจากอุปกรณ์จริง |
| M-GAP-009, M-NEW-006 | M-PLAN-002 | warm กับ cold start |
| M-GAP-010, M-NEW-016 | M-PLAN-009 (+ M-PLATFORM-023) | ความเร็วที่ได้จริงและ progress ของการติดตั้ง |
| M-GAP-011, M-NEW-017 | M-PLAN-005 (D-43) + M-PLAN-021 | นโยบายและการลงมือกับ GlowGovernor |
| M-GAP-012, M-NEW-011 | M-PLAN-013 | ADR ของ FlightLifecycle |
| M-GAP-013, M-NEW-012 | M-PLAN-013 (ขั้น CraftState ก่อน R5.2) | ADR ของ CraftState |
| M-GAP-019 | M-PLAN-014 | แผนที่ change-to-check |
| M-GAP-020, M-NEW-010 | M-PLAN-016 | ภาพผูกกับสถานะฟิสิกส์ |
| M-GAP-021, M-NEW-009 | M-PLAN-015 | held coast |
| M-GAP-022, M-NEW-007 | M-PLAN-011 | รายงานปัญหาแบบออฟไลน์ |

ครอบคลุม M-GAP-001…022 และ M-NEW-001…020 ครบ 42/42 รหัส

#### B6 ดัชนีย้อนกลับ: ข้อค้นพบ code review (`CR:`) และ R2 status (`R2S:`) → รายการ → แพ็กเกจ

ข้อค้นพบ code review ตรวจบน `fbefa18`; รายการที่แตะไฟล์ Launch/UI ของ R2 ตรวจซ้ำบน `da67341` ตามที่ ledger บันทึก ทุก id ด้านล่างไปถึงบ้านของตัวเอง

| CR | รายการ | แพ็กเกจ | สถานะ |
|---|---|---|---|
| CR:P1 | M-PLATFORM-031 | EQ-6 | เปิด 1 |
| CR:P2 | M-PLATFORM-032, M-PLATFORM-033 | DEC, EQ-8 | เปิด 2 |
| CR:P3 | M-PLATFORM-034, M-PLATFORM-036 | EQ-7 | เปิด 1 · เลื่อน 1 |
| CR:P4 | M-ORBIT-010 | EQ-4 | เปิด 1 |
| CR:P5 | M-ORBIT-011 | EQ-4 | เปิด 1 |
| CR:P6 | M-LAUNCH-040 | EQ-3 | เปิด 1 |
| CR:P7 | M-PLAN-003, M-PLATFORM-007 | R0.4, R1.6 | เปิด 2 |
| CR:P8 | M-PLATFORM-005 | R1.6 | เปิด 1 |
| CR:P9 | M-LAUNCH-043 | EQ-3 | เปิด 1 |
| CR:P10 | M-LAUNCH-045 | EQ-7 | เปิด 1 |
| CR:P11 | M-LAUNCH-041 | EQ-2 | เปิด 1 |
| CR:P12 | M-LAUNCH-022, M-LAUNCH-023 | CO-4, EQ-12 | เปิด 2 |
| CR:P13 | M-LAUNCH-042 | EQ-2 | เปิด 1 |
| CR:P14 | M-PHYSICS-002, M-PHYSICS-010, M-PLAN-010 | EQ-9, R0.4 | เปิด 3 |
| CR:P15 | M-PHYSICS-002, M-PHYSICS-011 | EQ-11, R0.4 | เปิด 2 |
| CR:P16 | M-ORBIT-015 | EQ-5 | เปิด 1 |
| CR:P17 | M-PHYSICS-003, M-PHYSICS-012 | EQ-10, R0.4 | เปิด 2 |
| CR:P18 | M-PHYSICS-002, M-PHYSICS-013 | EQ-10, R0.4 | เปิด 2 |
| CR:P19 | M-PHYSICS-002, M-PHYSICS-014 | EQ-10, R0.4 | เปิด 2 |
| CR:P20 | M-ORBIT-013 | EQ-5 | เปิด 1 |
| CR:P21 | M-LAUNCH-046 | R3.0 | เปิด 1 |
| CR:P22 | M-LAUNCH-045 | EQ-7 | เปิด 1 |
| CR:P23 | M-LAUNCH-036 | EQ-12 | เปิด 1 |
| CR:P24 | M-LAUNCH-024 | EQ-3 | เปิด 1 |
| CR:P25 | M-LAUNCH-044, M-ORBIT-027 | EQ-3, R5.4 | เปิด 2 |
| CR:P26 | M-LAUNCH-047 | EQ-14 | เปิด 1 |
| CR:P27 | M-PLATFORM-013 | R1.6 | เปิด 1 |
| CR:P28 | M-LEARNING-001 | FX-2 | เปิด 1 |
| CR:P29 | M-LAUNCH-025, M-LAUNCH-033 | CO-4, REJECTED | เปิด 1 · ปฏิเสธ 1 |
| CR:P30 | M-ORBIT-016 | EQ-5 | เปิด 1 |
| CR:D1 | M-BUILD-010, M-ORBIT-005, M-PLATFORM-035 | FX-4 | เปิด 3 |
| CR:D2 | M-PLATFORM-012 | R1.6 | เปิด 1 |
| CR:D3 | M-PLATFORM-014 | R1.6 | เปิด 1 |
| CR:D4 | M-PLATFORM-038 | EQ-14 | เปิด 1 |
| CR:D5 | M-LAUNCH-036 | EQ-12 | เปิด 1 |
| CR:D6 | M-LAUNCH-037 | EQ-12 | เปิด 1 |
| CR:D7 | M-LAUNCH-014 | R2.3s2 | เปิด 1 |
| CR:D8 | M-BUILD-026 | EQ-13 | เปิด 1 |
| CR:D9 | M-BUILD-029 | FX-1 | เปิด 1 |
| CR:D10 | M-LEARNING-002 | FX-2 | เปิด 1 |
| CR:D11 | M-LAUNCH-032 | CO-4 | เปิด 1 |
| CR:D12 | M-LEARNING-006 | EQ-14 | เปิด 1 |
| CR:D13 | M-BUILD-027 | EQ-13 | เปิด 1 |
| CR:D14 | M-LAUNCH-008, M-LAUNCH-025 | CO-4 | เปิด 2 |
| CR:D15 | M-ORBIT-025, M-PHYSICS-002, M-PHYSICS-016 | R0.4, R5.2, REJECTED | เปิด 2 · ปฏิเสธ 1 |
| CR:D16 | M-ORBIT-017 | EQ-5 | เปิด 1 |
| CR:D17 | M-PHYSICS-015 | EQ-10 | เปิด 1 |
| CR:D18 | M-PHYSICS-020 | R4.5 | เปิด 1 |
| CR:D19 | M-PHYSICS-015, M-PHYSICS-020 | EQ-10, R4.5 | เปิด 2 |
| CR:D20 | M-PHYSICS-002, M-PHYSICS-011, M-PHYSICS-015 | EQ-10, EQ-11, R0.4 | เปิด 3 |
| CR:D21 | M-ORBIT-018 | EQ-5 | เปิด 1 |
| CR:D22 | M-LAUNCH-048 | EQ-14 | เปิด 1 |
| CR:D23 | M-LAUNCH-041 | EQ-2 | เปิด 1 |
| CR:D24 | M-LAUNCH-004, M-LAUNCH-038 | CO-4, EQ-12 | เปิด 1 · บางส่วน 1 |
| CR:D25 | M-LAUNCH-049 | EQ-2 | เปิด 1 |
| CR:B1 | M-PLATFORM-001 | R1.6 | เปิด 1 |
| CR:B2 | M-PLATFORM-002 | R1.6 | เปิด 1 |
| CR:B3 | M-PLATFORM-004 | R1.6 | เปิด 1 |
| CR:B4 | M-PLATFORM-009 | R1.6 | เปิด 1 |
| CR:B5 | M-PLATFORM-010 | R1.6 | เปิด 1 |
| CR:B6 | M-LEARNING-005 | R1.6 | เปิด 1 |
| CR:B7 | M-LEARNING-003 | FX-2 | เปิด 1 |
| CR:B8 | M-LEARNING-004 | FX-2 | เปิด 1 |
| CR:B9 | M-PLATFORM-008 | R1.6 | เปิด 1 |
| CR:B10 | M-PLATFORM-011 | DEC | เลื่อน 1 |
| CR:B11 | M-LAUNCH-039 | DEC | เลื่อน 1 |
| CR:B12 | M-LAUNCH-006 | CO-4 | เปิด 1 |
| CR:NEW-PHYS-1 | M-ORBIT-014 | EQ-5 | เปิด 1 |
| CR:NEW-PHYS-2 | M-PHYSICS-017 | EQ-5 | เปิด 1 |
| CR:NEW-PHYS-3 | M-PHYSICS-018 | R8 | เลื่อน 1 |
| CR:NEW-PHYS-4 | M-PHYSICS-002, M-PHYSICS-010, M-PLAN-010 | EQ-9, R0.4 | เปิด 3 |
| CR:NEW-UI-1 | M-ORBIT-012 | EQ-4 | เปิด 1 |
| CR:NEW-UI-2 | M-LAUNCH-022 | CO-4 | เปิด 1 |
| CR:NEW-UI-3 | M-LAUNCH-023 | EQ-12 | เปิด 1 |
| CR:NEW-UI-4 | M-LAUNCH-032 | CO-4 | เปิด 1 |
| CR:NEW-UI-5 | M-LAUNCH-034 | FX-5 | เปิด 1 |
| CR:NEW-bundle-1 | M-ORBIT-010 | EQ-4 | เปิด 1 |
| CR:NEW-bundle-2 | M-BUILD-028, M-PLATFORM-037 | CO-4, EQ-13 | เปิด 2 |
| CR:NEW-ci-1 | M-PLATFORM-063 | CO-1 | เปิด 1 |
| CR:NEW-pwa-1 | M-PLATFORM-021 | EQ-1 | เปิด 1 |
| CR:NEW-render-1 | M-LAUNCH-041 | EQ-2 | เปิด 1 |
| CR:NEW-render-2 | M-LAUNCH-043 | EQ-3 | เปิด 1 |
| CR:NEW-render-3 | M-LAUNCH-041 | EQ-2 | เปิด 1 |
| CR:NEW-storage-1 | M-PLATFORM-006 | R1.6 | เปิด 1 |
| CR:NEW-storage-2 | M-PLATFORM-003 | R1.6 | เปิด 1 |
| CR:NEW-storage-3 | M-PLATFORM-008 | R1.6 | เปิด 1 |
| CR:NEW-storage-4 | M-LEARNING-003 | FX-2 | เปิด 1 |
| CR:NEW-storage-5 | M-PLATFORM-010 | R1.6 | เปิด 1 |
| CR:NEW-storage-6 | M-LEARNING-004 | FX-2 | เปิด 1 |

ครอบคลุม: CR:P1–P30, CR:D1–D25, CR:B1–B12 ครบทุกเลข และ CR:NEW-* 22 รหัส รวม 89 รหัส

| R2S | เรื่อง | สถานะที่ R2S ตรวจ | รายการ | แพ็กเกจ |
|---|---|---|---|---|
| R2S:R2.1 / three-state lifecycle | Setup / Flight / Analysis mission lifecycle | partial | M-LAUNCH-001, M-LAUNCH-002 | DELIVERED, R2.1r |
| R2S:R2.1 / hide setup on launch (U11) | Setup column collapses after launch; scene takes… | done | M-LAUNCH-001 | DELIVERED |
| R2S:R2.1 / notation placement (U09/D06) | Notation moved from setup into the in-flight… | done | M-LAUNCH-005 | DELIVERED |
| R2S:R2.1 / notation migration | Migrate stored auto/invalid notation; relabel… | done | M-LAUNCH-005 | DELIVERED |
| R2S:R2.1 / telemetry grouping | Telemetry grouped, summary first, details on… | partial | M-LAUNCH-003 | R2.1r |
| R2S:R2.1 / U16 actual engine level | Show throttle command vs actual core/booster… | partial | M-LAUNCH-004 | CO-4 |
| R2S:R2.1 / compact command-playback band | Make the command/playback band compact | open | M-LAUNCH-002 | R2.1r |
| R2S:R2.1 / A04 mobile flight bar | Phone keeps compact clock/live-replay/play-pause… | done | M-LAUNCH-007, M-LAUNCH-066 | CO-4, DELIVERED |
| R2S:R2.1 / clocks and keyboard | Keep two clocks, Space/Shift+Space; focused… | done | M-LAUNCH-009 | DELIVERED |
| R2S:R2.1 / renderer resize | Preserve ResizeObserver/renderer resize/camera… | done | M-LAUNCH-001 | DELIVERED |
| R2S:R2.1 / acceptance | Setup gone + scene larger; frozen config… | partial | M-LAUNCH-020 | CO-5 |
| R2S:R2.2 / views per capability | Exterior/onboard/space/map selectable incl.… | partial | M-LAUNCH-010, M-LAUNCH-020 | CO-5, DELIVERED |
| R2S:R2.2 / CameraPolicy ownership | Separate follow target, view and automatic/manual… | done | M-LAUNCH-010 | DELIVERED |
| R2S:R2.2 / Cinematic and fallback | Cinematic returns to automation… | done | M-LAUNCH-010, M-LAUNCH-012 | DELIVERED, R2.2r |
| R2S:R2.2 / remove camera reset (U08) | No visible camera reset; internal framing kept | done | M-LAUNCH-010 | DELIVERED |
| R2S:R2.2 / reset semantics and copy | Don't confuse reset camera/mission/layout… | partial | M-LAUNCH-011, M-LAUNCH-012, M-LAUNCH-014 | CO-4, R2.2r, R2.3s2 |
| R2S:R2.2 / acceptance | Manual view persists across liftoff/staging/orbit… | partial | M-LAUNCH-018, M-LAUNCH-020 | CO-3, CO-5 |
| R2S:R2.3 / presets step 1 (U10) | Choose data sets with presets… | done | M-LAUNCH-013 | DELIVERED |
| R2S:R2.3 / Docking preset | Docking preset after R5 schema | deferred | M-LAUNCH-015 | R5.4 |
| R2S:R2.3 / dock-resize-reorder step 2 | Dock/resize/reorder by extending hudlayout… | open | M-LAUNCH-014 | R2.3s2 |
| R2S:R2.3 / layout persistence | Layout version, clamping on resize/zoom, invalid… | partial | M-LAUNCH-014 | R2.3s2 |
| R2S:R2.3 / mandatory controls and refresh | Mandatory controls/time/live status never hidden… | done | M-LAUNCH-013 | DELIVERED |
| R2S:R2.3 / acceptance | Presets before custom; save/reload/resize/mobile… | partial | M-LAUNCH-019, M-LAUNCH-020 | CO-3, CO-5 |
| R2S:R2.4 / chooser list (A05) | Clustered events open a list of names and exact T+ | done | M-LAUNCH-016 | DELIVERED |
| R2S:R2.4 / identity, keyboard, recording | Event identity, exact recorded time… | done | M-LAUNCH-016 | DELIVERED |
| R2S:R2.4 / replay future-event rule | Replay must not reveal future events before the… | partial | M-LAUNCH-017 | CO-3 |
| R2S:R2.4 / acceptance | Every member selectable and seeks exactly… | partial | M-LAUNCH-020 | CO-5 |
| R2S:R2 / G2 gate | Wireframe and real-condition screenshots… | open | M-LAUNCH-018 | CO-3 |
| R2S:R2 / D08 decision | Owner confirms layout wireframe/presets/minimum… | open | M-LAUNCH-018 | CO-3 |
| R2S:R2 / §10.1 device matrix | 1366x768, 1920x1080, 768x1024, zoom 125/150%… | open | M-LAUNCH-019 | CO-3 |
| R2S:R2 / §10.1 60% scene target | Desktop flight scene >= ~60% of workspace width… | done | M-LAUNCH-001 | DELIVERED |
| R2S:R2 / §10.2 PR gates | Focused checks, tsc, build/budget, i18n parity… | done | M-PLATFORM-064 | CO-2 |
| R2S:R2 / R2 journey in PR CI | r2-flight-shell acceptance journey gated before… | partial | M-LAUNCH-020 | CO-5 |
| R2S:R2 / progress docs | PROGRESS.md and report record PR/CI/merge/deploy | open | M-LAUNCH-021, M-PLATFORM-064 | CO-2, DELIVERED |
| R2S:U02 | Launch Engineer compact and orderly; bigger… | partial | M-LAUNCH-002 | R2.1r |
| R2S:U03 | Watch picks and controls its camera | done | M-LAUNCH-010 | DELIVERED |
| R2S:U10 | User chooses data and arranges Engineer screen | partial | M-LAUNCH-013, M-LAUNCH-014 | DELIVERED, R2.3s2 |
| R2S:U11 | Hide left setup when flight starts | done | M-LAUNCH-001 | DELIVERED |
| R2S:U16 (UI part) | Throttle command vs actual engine level vs thrust… | partial | M-LAUNCH-004 | CO-4 |
| R2S:A04 | Mobile flight control while reading charts | done | M-LAUNCH-007 | DELIVERED |
| R2S:A05 | Choose overlapping timeline events precisely | done | M-LAUNCH-016 | DELIVERED |
| R2S:R2 / NEW stale cam.intro copy | Camera dialog intro contradicts R2.2 ownership | open | M-LAUNCH-011 | CO-4 |
| R2S:R2 / NEW mfb-play accessible name | Phone flight bar play button name missing/stale | open | M-LAUNCH-008 | CO-4 |
| R2S:R2 / NEW per-frame syncLifecycle | Lifecycle/mobile-bar sync runs every rAF | open | M-LAUNCH-024 | EQ-3 |
| R2S:R2 / NEW hidden cards still drawn | Engineer card presets hide charts but update()… | open | M-LAUNCH-022 | CO-4 |
| R2S:R2 / NEW chooser per-frame refresh | markChooserCurrent every rAF while chooser open | open | M-LAUNCH-024 | EQ-3 |
| R2S:R2 / NEW notation change mid-flight cost | In-flight notation select triggers full… | open | M-LAUNCH-025 | CO-4 |
| R2S:R2 / NEW CSS duplication | Duplicate media queries and split hide rules | open | M-LAUNCH-026 | CO-4 |

#### B7 ดัชนีย้อนกลับเต็มของเอกสารต้นทาง (ทุกแถว)

แต่ละบรรทัดคือหนึ่งตระกูล: `id → รายการ` ("—" = ไม่แมป ดูตาราง B4) ใช้ค้นหาด้วย Ctrl+F

<details><summary>DP: 342 แถว</summary>

- **B-**: B-03 → BUILD-006; B-06/B-12 → BUILD-033
- **CTX**: CTX-QW-5/ORB-07 → ORBIT-002; CTX-QW-4/LES-05/I18N-03 → LEARNING-029; CTX-QW-3 → LEARNING-045; CTX-I-3M-2 → ORBIT-041; CTX-I-3M-3 → LEARNING-043; CTX-I-3M-4/CTX-I-3M-5 → ORBIT-037/ORBIT-066; CTX-I-3M-6 → ORBIT-039; CTX-I-6M-6/D-13 → LEARNING-056; CTX-I-6M-4 → LEARNING-025; CTX-I-12M-1/CTX-I-12M-2 → LEARNING-058/LEARNING-073; CTX-I-12M-5/D-24 → LEARNING-070; CTX-I-12M-3 → LEARNING-068/PLATFOR047; CTX-I-12M-4/D-23 → LEARNING-069; CTX-QW-1 → LEARNING-066/PLATFOR076; CTX-QW-2 → PLATFOR047/PLATFOR048; CTX-QW-3 → LEARNING-045; CTX-QW-4 → LEARNING-029; CTX-QW-5 → ORBIT-001/ORBIT-002; CTX-QW-6 → PLATFOR077; CTX-I-3M-1 → LEARNING-067/PLATFOR047; CTX-I-3M-2 → ORBIT-041; CTX-I-3M-3 → LEARNING-043; CTX-I-3M-4 → ORBIT-037/ORBIT-066; CTX-I-3M-5 → ORBIT-037/ORBIT-038/ORBIT-066; CTX-I-3M-6 → ORBIT-039; CTX-I-3M-7 → LEARNING-050; CTX-I-3M-8 → LEARNING-039/LEARNING-042; CTX-I-6M-1 → LEARNING-053/LEARNING-055; CTX-I-6M-2 → LEARNING-057; CTX-I-6M-3 → ORBIT-043; CTX-I-6M-4 → LEARNING-025; CTX-I-6M-5 → PHYSICS-061; CTX-I-6M-6 → LEARNING-056; CTX-I-12M-1 → LEARNING-058/LEARNING-073; CTX-I-12M-2 → LEARNING-058/LEARNING-073; CTX-I-12M-3 → LEARNING-068/PLATFOR047; CTX-I-12M-4 → LEARNING-069; CTX-I-12M-5 → LEARNING-070; CTX-I-12M-6 → ORBIT-062
- **D-**: D-3/D-4 → PHYSICS-060; D-1 → LEARNING-065; D-2 → LEARNING-054; D-3 → PHYSICS-060/PLATFOR044; D-4 → PHYSICS-060; D-5 → LEARNING-023; D-6 → LEARNING-021/LEARNING-049; D-7 → PLATFOR029; D-8 → LAUNCH-067; D-9 → BUILD-018; D-10 → PHYSICS-021; D-11 → ORBIT-029/ORBIT-063; D-12 → PHYSICS-070; D-13 → LEARNING-055/LEARNING-056; D-14 → LEARNING-052; D-15 → ORBIT-038; D-16 → LEARNING-072; D-17 → PLATFOR053; D-18 → PLATFOR052; D-19 → PLATFOR047; D-20 → LEARNING-067; D-21 → BUILD-021; D-22 → BUILD-008; D-23 → LEARNING-069; D-24 → LEARNING-070; D-25 → PLATFOR078; D-26 → LAUNCH-068; D-27 → PLATFOR042
- **ENG**: ENG-K01 → PLATFOR044; ENG-K02/CTX-QW-2 → PLATFOR048; ENG-K03/PHY-QW2 → PLATFOR045; ENG-K04 → PLATFOR040; ENG-K05/CTX-QW-1 → PLATFOR076; ENG-K08 → PLATFOR060; ENG-K07/D-7 → PLATFOR029; ENG-K06/LUI-02/PHY-06/TQ-13/A17 → BUILD-040; ENG-K17/PHY-QW1(half) → PHYSICS-060; ENG-K20/CTX-I-3M-1 → PLATFOR047; ENG-K17(full) → PHYSICS-060; ENG-K18/S10 → PLATFOR051; ENG-K21 → PLATFOR015; ENG-K15 → PLATFOR017/PLATFOR027; ENG-K11 → BUILD-009/BUILD-015; ENG-K14/INF-01 → BUILD-030; ENG-K16/ENG-K12 → PLATFOR036/PLATFOR055; ENG-K09 → PLATFOR056; ENG-K23 → PLATFOR055; ENG-K24 → LEARNING-024; ENG-K13/UX-H3-5c → LEARNING-036; ENG-K22 → PLATFOR071/PLATFOR072; ENG-K19/D-27 → PLATFOR042; ENG-K01 → PLATFOR044; ENG-K02 → PLATFOR048; ENG-K03 → PLATFOR045; ENG-K04 → PLATFOR040; ENG-K05 → PLATFOR062/PLATFOR076; ENG-K06 → BUILD-040; ENG-K07 → PLATFOR029; ENG-K08 → PLATFOR060; ENG-K09 → PLATFOR056; ENG-K11 → BUILD-009/BUILD-015; ENG-K14 → BUILD-030; ENG-K15 → PLATFOR017/PLATFOR027; ENG-K10 → PLATFOR035; ENG-K12 → PLATFOR036/PLATFOR055; ENG-K13 → LEARNING-036; ENG-K16 → PLATFOR036/PLATFOR055; ENG-K17 → PHYSICS-060; ENG-K18 → PLATFOR051; ENG-K19 → PLATFOR041/PLATFOR042; ENG-K20 → PLATFOR047; ENG-K21 → PLATFOR015; ENG-K22 → PLATFOR071/PLATFOR072; ENG-K23 → PLATFOR055; ENG-K24 → LEARNING-024; ENG-K25 → PLATFOR045
- **INF**: INF-07/DOC-15 → PLATFOR076; INF-06 → PLATFOR022; INF-12 → ORBIT-040; INF-14 → PLATFOR016; INF-15/DOC-08 → LEARNING-047
- **LES**: LES-01/PED-H3-6/S4c → LEARNING-007/LEARNING-009; LES-14 → PLATFOR069
- **LUI**: LUI-01 → LAUNCH-027; LUI-05 → LAUNCH-028
- **ORB**: ORB-02/ORB-03 → ORBIT-003/ORBIT-004; ORB-05/ORB-06 → ORBIT-007/ORBIT-008
- **P-**: P-1 → LEARNING-050; P-2 → PHYSICS-063/PHYSICS-064; P-3 → PHYSICS-060/PHYSICS-063; P-4 → PLATFOR019; P-5 → PLATFOR024; P-6 → PLATFOR054; P-7 → PLATFOR077/PLATFOR078; P-8 → LEARNING-025; P-9 → LEARNING-029; P-10 → ORBIT-036; P-11 → LAUNCH-072; P-12 → PLATFOR055
- **PED**: PED-Q2/UX-Q4 → LEARNING-016; PED-Q3 → LAUNCH-062/LEARNING-017; PED-Q4 → LEARNING-026; PED-Q1/UX-H3-1(protocol) → LEARNING-050; PED-Q5 → LEARNING-033; PED-H3-5/UX-H3-1/UX-H6-5(round1) → LEARNING-050; PED-H3-1/UX-H3-2/LUI-03/LES-09 → LAUNCH-063/LEARNING-018; PED-H3-4/S15/LES-02/LES-03/CTX-I-3M-8 → LEARNING-042; PED-H3-3/UX-H3-6/S12/D-5 → LEARNING-023; PED-H3-2 → LEARNING-019; PED-H6-4/UX-H6-1/S13/X01 → LEARNING-073; PED-Q6 → LEARNING-052; PED-H6-1/CTX-I-6M-1/UX-H12-2 → LEARNING-055; PED-H6-5/D-6 → LEARNING-021; PED-H6-3/UX-H12-3/T01-T02 → LEARNING-040; PED-H6-2/CTX-I-6M-2 → LEARNING-057; PED-H12-3 → LEARNING-062; PED-H3-7 → LEARNING-032; PED-H3-8 → LEARNING-016; PED-H6-7 → LEARNING-020; PED-H12-1 → LEARNING-060; PED-H12-2 → LEARNING-061; PED-H12-4 → LEARNING-052; PED-H12-5 → LEARNING-046
- **PHY**: PHY-05 → PLATFOR049; PHY-QW4 → BUILD-016; PHY-QW3 → PHYSICS-049; PHY-QW5 → ORBIT-019; PHY-QW6 → BUILD-017; PHY-03 → PLATFOR069; PHY-07/PHY-09 → PLATFOR070; PHY-PH11/D06a(+D06b/c) → ORBIT-062; PHY-PH04/D-9 → BUILD-018; PHY-PH05/CTX-I-6M-3 → ORBIT-043; PHY-PH06 → ORBIT-021; PHY-PH02 → LAUNCH-077/PHYSICS-042; PHY-PH03/PHY-01/PHY-08 → LAUNCH-078; PHY-PH08-10/L01-L03 → ORBIT-031/ORBIT-033; PHY-PH17/18/19 → ORBIT-022/ORBIT-034; PHY-PH14 → PHYSICS-051; PHY-PH15 → LAUNCH-079/PHYSICS-044; PHY-PH16/CTX-I-6M-5 → PHYSICS-061; PHY-PH21/D-10 → PHYSICS-021
- **S**: S14 → BUILD-035; S2-mobile-smoke → PLATFOR051
- **UX**: UX-Q1/S8 → LAUNCH-061/LAUNCH-087; UX-Q5 → LAUNCH-058; UX-Q2/LUI-04 → LAUNCH-062; UX-Q3/PED-H6-6(cards) → LAUNCH-067; UX-H3-3 → LAUNCH-064; UX-H3-4/PED-H6-6(tabs) → LAUNCH-007/LAUNCH-065; UX-H3-5/INF-16 → LAUNCH-086/PLATFOR031; UX-H6-6 → LAUNCH-050; UX-H6-3(PR2) → LEARNING-044; UX-H6-5 → LEARNING-050/LEARNING-051; UX-H12-1/X02 → LEARNING-075; UX-H6-2 → LEARNING-074; UX-H6-4 → BUILD-023; UX-H12-4/D-26 → LAUNCH-068
- **W**: W0-1 → PLATFOR080; W0-2 → PHYSICS-001/PHYSICS-070; W0-3 → ORBIT-029/ORBIT-063; W0-4 → PLATFOR066; W0-5/CTX-QW-6 → PLATFOR077
- **§1**: section-1.1 → LAUNCH-063/LAUNCH-074; section-1.2 → LEARNING-057; section-1.3 → LEARNING-043; section-1.4 → LEARNING-067/ORBIT-041; section-1.5 → ORBIT-019/ORBIT-037/PHYSICS-040/PHYSICS-062; section-1.6 → PLATFOR043
- **§11**: 11-01 → PHYSICS-060; 11-02 → PHYSICS-042/PHYSICS-073; 11-03 → LAUNCH-067/LAUNCH-075; 11-04 → LEARNING-023; 11-05 → ORBIT-063; 11-06 → PHYSICS-021; 11-07 → ORBIT-065; 11-08 → LEARNING-076; 11-09 → PLATFOR045; 11-10 → PLATFOR055; 11-11 → LEARNING-036; 11-12 → LEARNING-053; 11-13 → LEARNING-072; 11-14 → LEARNING-052; 11-15 → PLATFOR029; 11-16 → LEARNING-032; 11-17 → PLATFOR045; 11-18 → PLATFOR062
- **§12**: 12-01 → PLATFOR077; 12-02 → PLATFOR042; 12-03 → PLATFOR047; 12-04 → PLATFOR082; 12-05 → LEARNING-050; 12-06 → PLATFOR071; 12-07 → LEARNING-050; 12-08 → LAUNCH-019; 12-09 → PLATFOR017; 12-10 → LEARNING-043; 12-11 → LEARNING-035; 12-12 → PLATFOR018; 12-13 → LAUNCH-069; 12-14 → LAUNCH-059; 12-15 → LAUNCH-019; 12-16 → PLATFOR019; 12-17 → PLATFOR022; 12-18 → PLATFOR023; 12-19 → LEARNING-016; 12-20 → LAUNCH-070; 12-21 → LEARNING-009; 12-22 → PHYSICS-001/PHYSICS-070; 12-23 → PLATFOR066; 12-24 → ORBIT-029/PLATFOR069; 12-25 → ORBIT-040; 12-26 → LEARNING-009; 12-27 → LAUNCH-071; 12-28 → LAUNCH-050/LAUNCH-058
- **§13**: 13-01 → PLATFOR078; 13-02 → LEARNING-050; 13-03 → PLATFOR055; 13-04 → PLATFOR044; 13-05 → PHYSICS-001/PHYSICS-070; 13-06 → PLATFOR042; 13-07 → LEARNING-033; 13-08 → LEARNING-054/ORBIT-036; 13-09 → ORBIT-023/ORBIT-044; 13-10 → PLATFOR047
- **§3**: section-3.1 → PLATFOR081; section-3.2 → ORBIT-062
- **§5**: section-5.outcome → PLATFOR043
- **§7**: section-7.1-principles → LEARNING-063; section-7.1-metrics → LEARNING-064; section-7.1-notdo → LEARNING-063; section-7.2-principles → LAUNCH-014/LAUNCH-074; section-7.2-metrics → LAUNCH-073; section-7.2-notdo → LAUNCH-074; section-7.3-principles → PHYSICS-063; section-7.3-metrics → PHYSICS-049/PHYSICS-062; section-7.3-notdo → PHYSICS-063
- **§7.4**: 7.4-P1 → PLATFOR054; 7.4-P2 → PLATFOR055; 7.4-P3 → PLATFOR024; 7.4-P4 → PLATFOR035/PLATFOR079; 7.4-P5 → PLATFOR024; 7.4-P6 → PLATFOR044; 7.4-P7 → PLATFOR062; 7.4-M1 → PLATFOR031; 7.4-M2 → PLATFOR054; 7.4-M3 → PLATFOR035; 7.4-M4 → PLATFOR077; 7.4-M5 → PLATFOR062; 7.4-M6 → PLATFOR050; 7.4-M7 → PLATFOR043; 7.4-W1 → PLATFOR072
- **§7.5**: 7.5-P1 → LEARNING-067; 7.5-P2 → LEARNING-030; 7.5-P3 → ORBIT-036; 7.5-P4 → LEARNING-025; 7.5-P5 → ORBIT-043; 7.5-P6 → —; 7.5-P7 → LEARNING-071; 7.5-P8 → LEARNING-069; 7.5-M1 → LEARNING-046; 7.5-M2 → ORBIT-040; 7.5-M3 → LEARNING-052; 7.5-M4 → PLATFOR071; 7.5-M5 → PLATFOR062
- **§8**: 8-01 → LEARNING-064; 8-02 → LEARNING-064; 8-03 → LEARNING-064; 8-04 → PLATFOR045; 8-05 → PLATFOR024; 8-06 → PLATFOR024; 8-07 → PLATFOR043; 8-08 → PHYSICS-049/PHYSICS-062; 8-09 → BUILD-016/PHYSICS-053; 8-10 → PHYSICS-054; 8-11 → ORBIT-043; 8-12 → LEARNING-029; 8-13 → LEARNING-033; 8-14 → ORBIT-037; 8-15 → LEARNING-067; 8-16 → LEARNING-056; 8-17 → PHYSICS-062; 8-18 → PLATFOR077; 8-19 → PLATFOR045; 8-20 → PLATFOR043; 8-21 → PLATFOR071
- **§9**: 9-01 → LEARNING-071; 9-02 → PLATFOR079; 9-03 → PLATFOR060; 9-04 → PHYSICS-063; 9-05 → LAUNCH-075; 9-06 → LEARNING-063; 9-07 → ORBIT-065; 9-08 → PLATFOR055; 9-09 → PLATFOR045; 9-10 → PLATFOR062; 9-11 → LEARNING-071; 9-12 → ORBIT-036; 9-13 → LAUNCH-074; 9-14 → LEARNING-063; 9-15 → PLATFOR067/PLATFOR079

</details>

<details><summary>RW: 194 แถว</summary>

- **A**: A18 → LAUNCH-083; A11Y-01 → LAUNCH-051; A11Y-02 → LAUNCH-052; A11Y-03 → LAUNCH-050/LAUNCH-053; A11Y-04 → LAUNCH-054
- **B-**: B-01 → BUILD-039; B-02 → BUILD-008; B-03 → BUILD-006; B-04 → BUILD-024; B-05 → ORBIT-062; B-06 → BUILD-033; B-07 → BUILD-020; B-08 → BUILD-022; B-09 → BUILD-022; B-10 → BUILD-030; B-11 → BUILD-010; B-12 → BUILD-033; B-13 → BUILD-016/PHYSICS-053; B-14 → BUILD-018; B-15 → BUILD-012; B-16 → BUILD-013; B-17 → BUILD-031/LEARNING-034; B-18 → BUILD-002/BUILD-021/BUILD-031; B-19 → BUILD-009; §12:B-01 → BUILD-039; §12:B-02 → BUILD-008; §12:B-03 → BUILD-006
- **CI**: CI-01 → PLATFOR049
- **COPY**: COPY-01 → LEARNING-037; COPY-02 → LEARNING-030
- **D**: D06-D07 → ORBIT-062
- **DOC**: DOC-01 → PLATFOR069; DOC-02 → PLATFOR069; DOC-03 → PLATFOR076; DOC-06 → LEARNING-065/ORBIT-044; DOC-07 → LEARNING-065; DOC-08 → LEARNING-047; DOC-09 → LEARNING-043; DOC-10 → PLATFOR073; DOC-11 → LEARNING-030/LEARNING-032; DOC-04 → PLATFOR069; DOC-05 → ORBIT-024; DOC-12 → PLATFOR075; DOC-13 → PLATFOR069; DOC-14 → PLATFOR069; DOC-15 → PLATFOR044; DOC-16 → PLATFOR069; DOC-17 → PLATFOR067; DOC-18 → PLATFOR066; DOC-19 → PLATFOR072; DOC-20 → PLATFOR069; DOC-21 → PLATFOR067; DOC-22 → PLATFOR069; DOC-23 → PLATFOR062
- **ENG**: ENG-K22 → PLATFOR071
- **FONT**: FONT-01 → LAUNCH-058
- **I**: I18N-01 → ORBIT-001; I18N-02 → LAUNCH-060; I18N-03 → LEARNING-029; I18N-04 → LEARNING-031; I18N-05 → LEARNING-031; I18N-06 → LAUNCH-036/LEARNING-034; I18N-07 → LEARNING-034
- **INF**: INF-01 → PLATFOR039; INF-02 → PLATFOR031; INF-03 → PLATFOR036; INF-05 → PLATFOR023; INF-09 → LEARNING-065; INF-04 → BUILD-030/PLATFOR033; INF-06 → PLATFOR022; INF-07 → PLATFOR044; INF-08 → LEARNING-067; INF-10 → PLATFOR053; INF-11 → PLATFOR046; INF-12 → ORBIT-040/ORBIT-054; INF-13 → PLATFOR027; INF-14 → PLATFOR016; INF-15 → LEARNING-047; INF-16 → LAUNCH-086; INF-17 → PLATFOR025; INF-18 → LAUNCH-002/LAUNCH-019; §12:INF-01 → PLATFOR039
- **L**: L01-L05 → ORBIT-031
- **LES**: LES-01 → LEARNING-007; LES-02 → LEARNING-042; LES-03 → LEARNING-039; LES-04 → LEARNING-049; LES-05 → LEARNING-029; LES-09 → LEARNING-018; LES-12 → PLATFOR051; LES-06 → LEARNING-033; LES-07 → LEARNING-026; LES-08 → LEARNING-052; LES-10 → LEARNING-015; LES-11 → LEARNING-008; LES-13 → LEARNING-013; LES-14 → PLATFOR069; LES-15 → LEARNING-022; §12:LES-05 → LEARNING-029
- **LS**: LS-01 → PLATFOR049; LS-02 → PLATFOR023; LS-03 → PLATFOR026; LS-04 → LAUNCH-055; LS-05 → PLATFOR027; LS-06 → ORBIT-054
- **LUI**: LUI-01 → LAUNCH-027; LUI-02 → LAUNCH-083; LUI-03 → LAUNCH-063; LUI-04 → LAUNCH-062; LUI-05 → LAUNCH-028; LUI-06 → PLATFOR052; LUI-07 → LAUNCH-084; LUI-08 → LAUNCH-056; LUI-09 → LAUNCH-057; LUI-10 → LAUNCH-029; LUI-11 → LAUNCH-030; LUI-12 → LAUNCH-085; LUI-13 → LAUNCH-024/PLATFOR053; §12:LUI-01 → LAUNCH-027; §12:LUI-05 → LAUNCH-028
- **MERGE**: MERGE-ORDER → PLATFOR080
- **MOB**: MOB-01 → LAUNCH-087; MOB-02 → LAUNCH-058; MOB-03 → LAUNCH-066; MOB-04 → LAUNCH-065
- **OPEN**: OPEN-PRS → PLATFOR080
- **ORB**: ORB-03 → ORBIT-003; ORB-01 → ORBIT-006; ORB-02 → ORBIT-004; ORB-04 → ORBIT-007; ORB-05 → ORBIT-007; ORB-06 → ORBIT-008; ORB-07 → ORBIT-002; ORB-08 → ORBIT-005; ORB-09 → ORBIT-009; ORB-10 → PLATFOR051; ORB-11 → PLATFOR068; §12:ORB-03 → ORBIT-003
- **PHY**: PHY-01 → PHYSICS-071; PHY-02 → PHYSICS-048; PHY-03 → PLATFOR069; PHY-04 → PHYSICS-050; PHY-05 → PHYSICS-001/PLATFOR049/PLATFOR050; PHY-06 → LAUNCH-083; PHY-07 → PHYSICS-041; PHY-08 → PHYSICS-043; PHY-09 → PHYSICS-041; PHY-10 → PHYSICS-023; PHY-11 → PHYSICS-024; PHY-12 → PHYSICS-022; PHY-13 → PHYSICS-025; PHY-14 → PHYSICS-026; PHY-15 → PHYSICS-060/PLATFOR044; PHY-16 → PHYSICS-046; PHY-17 → PHYSICS-042/PHYSICS-045; PHY-18 → PHYSICS-070; PHY-19 → LAUNCH-031; PHY-20 → PHYSICS-044; PHY-21 → PHYSICS-047; PHY-22 → PHYSICS-049; PHY-23 → ORBIT-025
- **PR**: PR36-01 → PHYSICS-070; PR38-01 → ORBIT-063; PR38-TEST → ORBIT-063; PR38-02 → ORBIT-030/ORBIT-031; PR41-01 → PLATFOR062
- **S**: S7 → LAUNCH-083; S4c → LEARNING-007; S5 → LEARNING-030; S8 → LAUNCH-058/LAUNCH-087; S9 → LEARNING-050; S10 → PLATFOR051; S11 → LAUNCH-062/LAUNCH-063; S12 → LEARNING-023; S13 → LEARNING-073; S15 → LEARNING-041; S16 → LAUNCH-065/LAUNCH-067
- **T**: T01-T03 → LEARNING-040
- **TQ**: TQ-01 → PHYSICS-060/PLATFOR044; TQ-02 → BUILD-024/PLATFOR051; TQ-03 → PLATFOR052; TQ-04 → BUILD-010/BUILD-024/ORBIT-004/PLATFOR035; TQ-05 → PLATFOR045; TQ-13 → LAUNCH-083; TQ-06 → LEARNING-036; TQ-07 → PLATFOR053; TQ-08 → PLATFOR055; TQ-09 → PLATFOR058; TQ-10 → PLATFOR059; TQ-11 → PLATFOR057; TQ-12 → PLATFOR045
- **X**: X01-X02 → LEARNING-073/LEARNING-075
- **§1**: section-1#top1 → PLATFOR080; section-1#top9-seq → LEARNING-050

</details>

<details><summary>RM: 90 แถว</summary>

- **ARCH**: ARCH-routing → LAUNCH-080; ARCH-resolver → LAUNCH-080; ARCH-domfree → PLATFOR079; ARCH-handoff → ORBIT-052; ARCH-data → ORBIT-057; ARCH-designs → PLATFOR019; ARCH-files → PLATFOR019; ARCH-consumed → PLATFOR068
- **D**: D01 → BUILD-034; D02 → BUILD-018/BUILD-035; D03 → BUILD-004/BUILD-019/BUILD-036; D03-eng → BUILD-021; D04 → BUILD-004/BUILD-037; D05 → BUILD-018/BUILD-038; D06 → BUILD-003/ORBIT-046/ORBIT-062; D06-misses → ORBIT-046/ORBIT-047; D06-v3 → ORBIT-062; D06-src → PLATFOR066; D07 → ORBIT-062
- **DOC**: DOC-status → PLATFOR067
- **IDS**: IDS-1 → PLATFOR065; IDS-2 → ORBIT-030/ORBIT-033/PLATFOR065
- **L**: L01 → ORBIT-031; L02 → ORBIT-032; L03 → ORBIT-033; L04 → ORBIT-034; L05 → ORBIT-034
- **M**: M01 → ORBIT-058; M02 → ORBIT-059; M03 → ORBIT-023/ORBIT-060
- **MT**: MT-covered → ORBIT-061; MT-GNSS → ORBIT-037; MT-HADR → ORBIT-039; MT-ASAT → ORBIT-038
- **O**: O01 → ORBIT-048; O02 → ORBIT-021/ORBIT-049; O03 → ORBIT-050; O04 → ORBIT-051
- **P**: P1 → PLATFOR079; P2a → PLATFOR028; P2b → PLATFOR019; P2c → PLATFOR019; P3a → PLATFOR028; P3b → ORBIT-057; P3c → ORBIT-057; P3d → ORBIT-057; P3e → ORBIT-042; P3f → PLATFOR049; P3g → ORBIT-009/ORBIT-057; P4 → PHYSICS-063; P5 → ORBIT-036; P6 → ORBIT-064; P7 → PHYSICS-063; P8 → PLATFOR079; P2.5-a → PHYSICS-021/PHYSICS-072; P2.5-b → ORBIT-025/PHYSICS-072; P2.5-c → ORBIT-055; P2.5-d → ORBIT-016/ORBIT-058; P2.5-e → ORBIT-059; P2.5-f → PHYSICS-072; P2.5-g → ORBIT-061; P2.5-h → ORBIT-061; P2.5-i → LEARNING-033/LEARNING-048; P2.5-j → PLATFOR041; P3-misses → PHYSICS-053/PHYSICS-054; P5-watch → ORBIT-035
- **R**: R01 → ORBIT-025/ORBIT-053; R02 → ORBIT-025/ORBIT-054; R03 → ORBIT-055; R04 → ORBIT-025/ORBIT-056; R05 → PHYSICS-072
- **S**: S01 → LAUNCH-080; S01-home → LAUNCH-068; S01-plan → LAUNCH-082; S02 → LAUNCH-080; S02-mcp → PLATFOR079; S02-keys → LAUNCH-080; S02-octaweb → BUILD-002/LAUNCH-076; S03 → BUILD-001/ORBIT-052; S04 → ORBIT-057; S05 → PLATFOR019
- **T**: T01 → LEARNING-040; T02 → LEARNING-039; T03 → LEARNING-053
- **X**: X01 → LEARNING-073; X02 → LEARNING-075
- **X-**: X-backend → PLATFOR020
- **idea**: idea-1 → BUILD-001/BUILD-005; idea-2 → BUILD-003/LAUNCH-081; idea-3 → LAUNCH-080

</details>

<details><summary>OD: 79 แถว</summary>

- **ACCEPT0929**: §8 → LEARNING-007/LEARNING-021; Build matrix → BUILD-016; §7.4 / AUDIT0929 proposals → ORBIT-020; §7.5 / README limits → LAUNCH-019
- **AUDIT0929-README**: item quality → LEARNING-028; packet location → PLATFOR062
- **BEGINNER-STUDY**: Stage1 UX-02/§Five-novice → LEARNING-050
- **DECISIONS**: D-13 → LEARNING-055; D-27 → PHYSICS-003/PLATFOR042; D-19/D-20 → PLATFOR047; D-3/D-4 → PLATFOR044; D-8/D-26 → LAUNCH-068; D-9 → BUILD-018; D-10 → PHYSICS-021; D-15 → ORBIT-038; D-16 → LEARNING-072; D-18 → PLATFOR052; D-21 → BUILD-021; D-22 → BUILD-008; D-23/D-25 → PLATFOR078; D-24 → PLATFOR066; D-11 → ORBIT-029/ORBIT-031; D-12 → PLATFOR066
- **EXEC-FINDINGS-0928**: assessment bank → LEARNING-027
- **FINAL-INTEGRATION-REVIEW**: lesson 4.3 → LEARNING-008
- **HANDOFF-G02-BURNS**: G02 burns → PHYSICS-029
- **IMPLEMENTATION-STATUS**: T03 limits → LEARNING-010/LEARNING-011/LEARNING-012; T03 limits → LEARNING-010/LEARNING-011/LEARNING-012; T03 limits → LEARNING-010/LEARNING-011/LEARNING-012; lessons limits → LEARNING-013; T01/T02 limits → LEARNING-014; D06 owner call → PHYSICS-027; D02 owner call → BUILD-018; Orbit limits → ORBIT-019/ORBIT-021/ORBIT-066; M03/R05 limits → ORBIT-023; D06 limits → ORBIT-046; D07 limits → ORBIT-046; Build physics limits → BUILD-017/BUILD-019; Experimental → PHYSICS-043/PHYSICS-044/PHYSICS-047; Build/satellite UX limits → BUILD-007/BUILD-011/BUILD-012/BUILD-013; Build/satellite mobile & i18n limits → BUILD-031/LEARNING-038; Build drawings → BUILD-002/LAUNCH-076; stale facts → PLATFOR069
- **NOTES-S2a**: thaiId → ORBIT-002
- **NOTES-S7**: S7 handoff → LAUNCH-035/PLATFOR030; S7 handoff → LAUNCH-035/PLATFOR030
- **PARALLEL-GNC**: G05 known issues 1–4,6 → PHYSICS-030
- **PLAN-2026-09-28**: S4c / A12 → LEARNING-007; S5-2 / A8 → LAUNCH-060/ORBIT-001; S5-3 / A8 → LAUNCH-060; S5-4 / TH / D5 → LEARNING-029; S8-2 → LAUNCH-061; S10 → PLATFOR051; S13 / X01 → LEARNING-073
- **PROGRESS vs docs**: R1 docs → PLATFOR074
- **REVIEW0930-README**: precedence → PLATFOR067
- **SIXDOF-BROWSER-QA**: Open checks → PLATFOR042
- **STAGE1**: PERF-01 + device follow-ups → PLATFOR041; CONTENT-01 → ORBIT-047; SCI-02 → PHYSICS-028; QA-01 → PHYSICS-061
- **STAGE3-4**: classroom → LEARNING-046
- **STATUS-INVENTORY**: §6 → PLATFOR027; §3 military → ORBIT-037/ORBIT-038/ORBIT-066
- **T03-OWNER-REVIEW**: every pack 1–4 → LEARNING-053; every pack 2 / IMPL known limits → LEARNING-033; rtaf-academy Naming → LEARNING-054; per-lesson confirmations → LEARNING-053; A5, P4, R4 → LEARNING-059; Sources to re-check → ORBIT-045
- **USER-TEST-2026-10**: S9/§7 → LEARNING-050; §I-1 → LAUNCH-067; §I-2 → LAUNCH-065; §I-4 → LEARNING-032; §I-5 → LAUNCH-063/LEARNING-018
- **WEBGL-STARTUP**: CI flakes → PLATFOR061
- **docs/README**: index → PLATFOR075
- **multiple**: id namespaces → PLATFOR065; md consumers → PLATFOR068

</details>

### App C — รายการที่ปิด เลื่อน หรือถูกแทนที่

#### C1 รายการที่ส่วนนี้เป็นบ้าน (15 รายการ, แพ็กเกจ `REJECTED`)

รายการเหล่านี้**ไม่มีงานให้ทำ** จึงไม่มีขนาด เลน หรือ envelope (คอลัมน์ขนาดและเลนเป็น "—") วิธีพิสูจน์คือหลักฐานว่าผู้รับแทนครอบคลุมเรื่องนั้นแล้ว หรือหลักฐานว่าการทำจะลดคุณภาพ ถ้าจะทบทวน ต้องเปิดแถวใหม่ในส่วนที่เกี่ยวข้องตามเงื่อนไขในคอลัมน์สุดท้าย ห้ามนำกลับมาเป็นงาน "เก็บกวาด"

| รหัส | id เดิม | สถานะ | P / ขนาด / เลน | เรื่อง | เหตุผล (คุณภาพที่ปกป้อง) | ผู้รับแทน หรือทางที่รักษาคุณภาพ | หลักฐาน | ทบทวนเมื่อ |
|---|---|---|---|---|---|---|---|---|
| M-LAUNCH-033 | CR:P29 | ปฏิเสธ | P3 / — / — | re-render `SetupPanel` บางส่วนเมื่อสลับ toggle | เสี่ยงต่อ focus, draft, validation และ lock มากกว่าประโยชน์ที่ได้ (`panel.ts` `render()` สร้างใหม่ทั้งหมดโดยตั้งใจ); S02 §02.13 | ลดการเรียก render ต้นทาง: M-PLATFORM-037 และ M-LAUNCH-025 (CO-4); key คงที่ `data-field` (M-LAUNCH-056, R2.5); memo ของ launchWindows เฉพาะเมื่อมี profile | review ระบุความเสี่ยงสูง; `da67341:src/ui/panel.ts` render เต็มชุด | มี profile ที่แสดงว่า render เต็มเป็นคอขวดที่ผู้ใช้รู้สึก และมี oracle ของ focus/draft |
| M-LAUNCH-075 | DP:9-05, DP:11-03 | ถูกแทนที่ | - / — / — | ห้ามออกแบบ UX ใหม่ทั้งหมดก่อนทดสอบผู้ใช้รอบแรก | เจ้าของสั่ง R2/R3 แล้ว (แถบบน 2026-10-01, #74) กฎแบบเหมารวมจึงไม่ตรงความจริง | หลักฐานจากผู้ใช้กั้นเฉพาะรายการที่เนื้อหามาก (D-54): M-LAUNCH-063/064/065/067; HU-1 (M-LEARNING-050) | git: แถบบนและ #74 merge โดยไม่มีการทดสอบ; S16 CL4 | ไม่ทบทวน กฎแคบแทนแล้ว |
| M-LAUNCH-082 | RM:S01-plan | ถูกแทนที่ | - / — / — | หน้าจอ "กำลังพัฒนา" ของ Orbit/Build ที่ list รายการ roadmap | ทั้งสองส่วนสร้างแล้ว; กลไกยังอยู่เป็นรายการ "still to come" ที่อ่านจาก ROADMAP (เทสต์ parse) | รายการ "coming next" เดิม; แก้รายการ X01 ใน M-PLATFORM-068 (R7.5) | `section-plan.ts:46-90`, `section-nav-model.ts:22-50` บน `da67341` | ไม่ทบทวน |
| M-LEARNING-076 | DP:11-08 | ถูกแทนที่ | - / — / — | ข้อเสนอ 11-08 ให้คงการล็อกเฉลยถาวร | เจ้าของตัดสิน DEC:D-6 ต่างออกไป และทำแล้ว (passedWithHelp + clearRevealed) | M-LEARNING-049 (เสร็จ) | `src/lessons/grader.ts`, `progress.ts`; S16 CL7 | เจ้าของเปลี่ยน D-6 |
| M-ORBIT-042 | RM:P3e | เลื่อน | P3 / — / — | ชุดข้อมูล Launch Library 2 สำหรับการปล่อยที่กำลังจะมา/ที่ผ่านมา | เพิ่ม host ออนไลน์ใหม่และ API ที่จำกัดอัตรา โดยยังไม่มีคำแถลงความเป็นส่วนตัว และไม่ผูกกับลำดับความสำคัญของเจ้าของ (สถานะ: เลื่อน) | ไม่มีผู้รับแทน; ข้อมูลออฟไลน์เดิมของ Orbit | มีเพียง comment ใน `src/provider/datasets.ts:6-10` | หลัง R7 และหลังคำแถลงความเป็นส่วนตัว (ED-INST-1, M-LEARNING-047) ผ่าน; ต้องมี snapshot ออฟไลน์และ rate limit |
| M-ORBIT-065 | DP:9-07, DP:11-07 | ถูกแทนที่ | - / — / — | ห้ามทำ UI ของ D06/D07 ก่อนมีผลการเรียนรู้ (ทำแค่ D06a) | Phase 4 ส่ง designer เต็มแล้ว (#46/#59/#66) กฎลำดับจึงไม่มีผล | M-ORBIT-062 (เสร็จ); เอกสารผลการเรียนรู้ = M-LEARNING-060 (ED-PED-2) | S16 CL16 | ไม่ทบทวน |
| M-ORBIT-066 | OD:Orbit limits, OD:§3 military, DP:CTX-I-3M-4/CTX-I-3M-5 | ถูกแทนที่ | - / — / — | แถวข้อจำกัดแบบรวม (Orbit limits, §3 military, CTX-I-3M-4/5) | แยกเป็นรายการเฉพาะแล้ว เก็บแถวไว้เพื่อให้ id ต้นทางทุกตัวมีที่ไป | M-ORBIT-019/021/022 (R4.6) และ M-ORBIT-037/038 (ED-MIL-1) | ledger orbit ส่วน Superseded | ไม่ทบทวน |
| M-PHYSICS-016 | CR:D15 | ปฏิเสธ | P3 / — / — | รวม RK4 หลายสำเนาเป็นตัวเดียว | ลำดับการบวกต่างกัน (`rk4Step` กับ cislunar/return-guidance กับ navigation/explicit guidance) การรวมจึงเปลี่ยนผลทีละบิต และสะสมในภารกิจหลายวัน (Apollo, rendezvous) ผิด OR-1 | comment อธิบายลำดับการบวกเมื่อแก้ไฟล์อยู่แล้ว (R5.2); memo ของ EQ-11 เป็นตัวประหยัดงานจริง | ตรวจบน `fbefa18` และไม่เปลี่ยนบน `da67341`; S02 §02.13 | ไม่ทบทวนในฐานะ EQ; ถ้าต้องการรวม ต้องเป็น realism-changing ที่ validate พร้อม re-record ที่เจ้าของอนุมัติ |
| M-PHYSICS-053 | RW:B-13, DP:8-09, RM:P3-misses | ถูกแทนที่ | P2 / — / — | rating ของยานที่มี kick stage (Vega-C, Ariane 64, GTO) | ซ้ำกับรายการของกลุ่ม Build | M-BUILD-016 (R4.3; P ทำส่วน sequencer) | S13 §13.8 | ไม่ทบทวน (นับครั้งเดียว) |
| M-PHYSICS-054 | DP:8-10, RM:P3-misses | ถูกแทนที่ | P2 / — / — | จรวดที่ size แล้วถึงวงโคจรตาม dv ที่ออกแบบ | ซ้ำกับรายการของกลุ่ม Build | M-BUILD-018 (R4.3, D-9/D-48) | S13 §13.8 | ไม่ทบทวน (นับครั้งเดียว) |
| M-PHYSICS-073 | DP:11-02 | ถูกแทนที่ | P3 / — / — | "ปรับ guidance ได้หลังมี tolerance tier เท่านั้น" | Soyuz refit (#63, #64) ส่งด้วย FLIGHT-PROFILE-METHOD โดยไม่ต้องมี tier; PLAN R4.2/§8.1 กำหนด held-out แทน | R4.2 ตาม S13 §13.1; tier เป็น oracle เสริมเท่านั้น (M-PHYSICS-060) | ledger physics ส่วน Conflicts | ไม่ทบทวน; tier ไม่มีวันแทน hash gate |
| M-PLAN-012 | PLAN:§9.2, OD:reports/R1.5-workflows | ปฏิเสธ | P3 / — / — | ใช้ผล unit ของ PR ซ้ำบน Pages เมื่อ tree, lockfile และ runtime เหมือนกัน | Pages refresh data snapshot ทำให้พิสูจน์ไม่ได้ว่า input เหมือนกัน (PLAN:§9.2 ข้อ 9, R1.5) ความเสี่ยงคือปล่อยรุ่นที่ไม่ได้ทดสอบกับข้อมูลจริง | D-64: ใช้ซ้ำด้วย content hash ได้เฉพาะ heavy/fleet; R0.3r เลือกชุดเทสต์; R7.3 (M-PLATFORM-045) | รายงาน R1.5; S07 §07.3, S09 §09.7 | ถ้า Pages เลิก refresh ข้อมูลระหว่าง build (ไม่มีแผน) |
| M-PLATFORM-046 | RW:INF-11 | ถูกแทนที่ | - / — / — | deploy ตามเวลาข้าม `npm test` | ขัดกฎ "ไม่รับผลผ่านเก่า" (PLAN:§9.2 ข้อ 9); R1.5 ลดเวลาเหลือราว 20 นาทีด้วย gate ขนาน | R1.5 (เสร็จ); ประโยคใน README แก้ใน M-PLATFORM-069 | `deploy.yml` รันทุก shard | ไม่ทบทวน |
| M-PLATFORM-081 | DP:section-3.1 | ถูกแทนที่ | - / — / — | คัดแยกข้อค้นพบของ REMAINING-WORK (1 P1, 53 P2, 110 P3) | การรวมแผนครั้งนี้แมปทุกแถวของ REMAINING-WORK แล้ว | App A/B4/B7 ของส่วนนี้ | B4: ทุกแถว RW มีปลายทางหรือเหตุผล | ไม่ทบทวน |
| M-PLATFORM-082 | DP:12-04 | ถูกแทนที่ | - / — / — | ต้นทุนเครื่องของการรับ PR #36 ก่อน merge | #36 merge แล้ว (`17bd60f`, 2026-10-01) และ R7.2 กำหนด source ที่ตรึงก่อนรันยาว | CO-6 (M-PHYSICS-001) รัน heavy/fleet บน SHA ที่เผยแพร่; D-12 บันทึกว่า "เบี่ยง" | git log; S08 §08.2 | ไม่ทบทวน |

#### C2 รายการที่เลื่อน (สถานะ `deferred` ใน `assignment.tsv`) พร้อมเงื่อนไขเริ่ม

รายการเลื่อนไม่ใช่รายการปฏิเสธ: แต่ละรายการมีเงื่อนไขเริ่มที่ตรวจได้ และถูกทบทวนที่ GK ของคลื่นในคอลัมน์ "คลื่น" (S05 §05.11) ไม่มี agent เริ่มเองเมื่อเงื่อนไขครบ ต้องรอเจ้าของอนุญาต (D-65)

| รหัส | P / ขนาด | แพ็กเกจ (ส่วน) | คลื่นที่ทบทวน | การตัดสินใจ | ชื่อย่อ | เงื่อนไขเริ่ม |
|---|---|---|---|---|---|---|
| M-BUILD-023 | P3 / M | R3.5r (S12) | K4 | D-61 | แชร์แบบและผล challenge เป็นลิงก์ ?d= (จำกัด 8 kB… | D-61 (เพดานลิงก์ 8 kB + fallback เป็นไฟล์) และ DesignRef ครบทุกทางส่งต่อ (R3.1r M-PLAN-028 PR4); ขีดจำกัดของ LINE วัดใน HU-6 |
| M-LAUNCH-015 | P3 / S | R5.4 (S15) | K5 | D-58 | ชุดการ์ดสำหรับการเทียบท่า | R5.3 กำหนด schema ของ docking แล้ว (D-58); bump เวอร์ชัน telemetry-layout ตาม S11 §11.1 |
| M-LAUNCH-039 | P3 / XS | DEC (S08) | K0-K4 | — | touch-action:none บนฉาก 3 มิติ: คงไว้… | อุปกรณ์จริง (HU-6) รายงานว่าซูมหรือเลื่อนหน้าบนฉากไม่ได้; ตั้งคำถามชุด D ใหม่ (ไม่มีเลข) |
| M-LAUNCH-064 | P3 / M | ED-PED-1 (S16) | K4 | — | ชิป "ทำนาย" ก่อนปล่อยจรวดใน Explore | FINDINGS ของ HU-1 (HUF-D03) บอกว่าจำเป็น (D-54) |
| M-LAUNCH-065 | P3 / L | R3.4r (S12) | K3 | D-53 | หนึ่งงานต่อหนึ่งหน้าจอบนมือถือสำหรับ Orbit/Build Engineer | D-53 ตัดสินหลังมี FINDINGS ของ HU-1 (งานบนโทรศัพท์ที่สังเกตได้จริง); ระหว่างรอ M-BUILD-031 ทำให้ lead ≤ 4 บรรทัด |
| M-LEARNING-056 | P2 / L | ED-INST-2 (S16) | K5 | — | นำร่องใช้งานจริงที่สถาบันหนึ่งแห่งจากไฟล์ zip รุ่นทางการ | หลัง v1.0 และเมื่อ M-LEARNING-043, 045, 047, 053, 054, 055 เสร็จ; จัดใน ม.ค. 2027 หรือ พ.ค.–มิ.ย. 2027 ไม่ชนช่วงสอบปลายภาค |
| M-LEARNING-058 | P3 / XL | ED-PED-3 (S16) | K4-K6 | — | หลักสูตร "พื้นฐานการรับรู้สถานการณ์อวกาศ"… | หลัง ED-MIL-1 และ M-LEARNING-057 |
| M-LEARNING-061 | P3 / L | ED-GAME-1 (S16) | K4-K6 | — | เส้นทางบทสรุป "จากสปุตนิกถึงดวงจันทร์"… | หลัง M-LEARNING-023 และ M-LEARNING-073 และมีหลักฐานจากผู้ใช้สำหรับไทม์ไลน์บน Home |
| M-LEARNING-062 | P3 / L | ED-EVAL (S16) | K6 | — | การประเมินผลจากไฟล์ผลลัพธ์ (สคริปต์วิเคราะห์ คะแนนก่อน/หลัง… | หลัง pilot ครั้งแรก (ED-INST-2, M-LEARNING-056) และมีไฟล์ผลจริง |
| M-LEARNING-070 | P3 / L | ED-EVAL (S16) | K6 | — | บทความวิชาการด้านการตรวจสอบความถูกต้อง (D-24) | หลัง D-24 (venue), R4.4 (M-PHYSICS-061 รายงาน validation) และ DOI ของรุ่น |
| M-LEARNING-075 | P3 / XL | ED-GAME-1 (S16) | K4-K6 | — | X02 แคมเปญจากวงโคจรแรก (1957) ถึงดวงจันทร์ | หลัง M-LEARNING-073, M-LEARNING-061 และ G8 |
| M-ORBIT-042 | P3 / M | REJECTED (S19) | - | — | ข้อมูล Launch Library 2 สำหรับการปล่อยจรวดที่กำลังจะมา/ที่ผ่… | หลัง R7 และหลังคำแถลงความเป็นส่วนตัว (M-LEARNING-047); ต้องมี snapshot ออฟไลน์และ rate limit (บ้านคือ C1) |
| M-PHYSICS-018 | P3 / S | R8 (S15) | K6 | D-52 | การค้นหาแบบ golden-section ของ Apollo ใช้ค่า phi… | D-52 รับเป็นการเปลี่ยนความเที่ยงตรงที่ validate ใน R8.2 (ผล Apollo เปลี่ยน) หรือไม่ทำเลย |
| M-PLATFORM-011 | P3 / M | DEC (S08) | K0-K4 | — | โหมดชั่วคราวเมื่อเบราว์เซอร์ไม่มี Web Locks หรือ… | วัดก่อนว่าโหมดชั่วคราวเกิดเพราะไม่มี sessionStorage บ่อยแค่ไหน (เมทริกซ์ R7.1, HU-6) แล้วจึงเขียน ADR แก้ไข (คำถาม "B10") |
| M-PLATFORM-020 | P3 / L | DEC (S08) | K0-K4 | — | บริการออนไลน์เสริมสำหรับคะแนน/แบ่งปันแบบ (ผ่าน DesignStore… | หลัง R7 และเจ้าของตัดสินคำถาม "backend"; ทางออฟไลน์ต้องครบและไม่มีข้อมูลส่วนตัวออกจากเครื่องโดยไม่ได้ขอ |
| M-PLATFORM-036 | P2 / L | EQ-7 (S09) | K4-K5 | — | โหลดส่วน Build และ Orbit เมื่อเข้าใช้ครั้งแรก (P3 ส่วนใหญ่… | API ของ R3.4r, R3.5r และ R5.1 นิ่งแล้ว (EQ-7 ขั้น 4; K4–K5) |

#### C3 ข้อขัดแย้งที่ตัดสินแล้ว

ย่อจากหัวข้อ "Conflicts resolved" ของ ledger รวมทั้ง 6 ฉบับ และการตัดสินระดับสถาปัตยกรรม คำตัดสินอิงโค้ดบน `da67341` ตามที่ ledger บันทึก ห้ามเปิดประเด็นใหม่โดยไม่มีหลักฐานใหม่ (WRITER-GUIDE §5)

**สถาปัตยกรรม**

| ประเด็น | คำตัดสิน | รายการหรือที่ลง |
|---|---|---|
| โครงหลักของแผน | continuity (รหัส R เดิม, 20 ส่วน, assignment ที่ตรวจด้วยเครื่อง) ส่วน execution-efficiency และ outcome-driven เป็นกิ่งที่ต่อเข้า (OR-4) | S00 |
| เลขการตัดสินใจ | ทะเบียนเดียว `D-n` เปล่าตามเลขของ execution-efficiency (D-28 แถบบน; D-29…D-37 = PLAN:D01…D09; D-38 ขึ้นไปใหม่); DEC-n ของ outcome ไม่ใช้ | S08 |
| รหัสรายการใหม่ | ใช้ M-PLAN ต่อ; M-GAP/M-NEW เป็น alias ในชื่อเท่านั้น | B5 |
| การอนุญาต R3 | D-65: เลน R3 จบงานตามคำสั่งเดิม เจ้าของประกาศ R3 ครบ 2026-10-04; คำสั่งเดิมไม่ครอบ R4; ทุกแพ็กเกจ execution_authorized=false จนเจ้าของยืนยันรายคลื่น | S08 |
| จังหวะ refactor | D-62: หน้าต่าง EQ-15 (สาม seam จาก main.ts ก่อน R5.1 และ R6, เป้าต้น K3); panel.ts หลัง “R2 complete”; ทางสำรอง: ไม่มีหน้าต่าง ถามใหม่ที่ GK4 | S09 |
| WebGL context หลุด | FX-8 ใน K1 (ข้อมูลและความต่อเนื่อง); M-LAUNCH-046 คงงบ context ใน R3.0 | S10, S12 |
| ลำดับเมื่อของดีชนกัน | D-63: บั๊กข้อมูลหายหรือผลเท็จระดับ P0/P1 มาก่อนงาน identical-output ในไฟล์เดียวกัน | S02 §02.4 |
| ใช้หลักฐานซ้ำ | D-64: ด้วย content hash เฉพาะ heavy/fleet; M-PLAN-012 ยังปฏิเสธ | S07, S17 |
| เลนและ WIP | PR เปิดไม่เกิน 5 ทั้งโครงการ ไม่เกิน 1 ต่อเลน P ทำทีละ PR; ปรับที่ทุก GK จาก KPI-33/35 | S18 |
| ปฏิทิน | ช่วงวันทำการ + วันที่อ้างอิงแบบเร็วและช้า | S05 |
| รายการ KPI | KPI-01…32 ของ outcome + KPI-33…35 ด้านการทำงาน | S04 |

**Build (ledger build)**

| ประเด็น | คำตัดสิน | รายการหรือที่ลง |
|---|---|---|
| B-03 เปิดหรือบางส่วน | เปิด: UI ไม่อ่าน `converged` และ timeout เก็บค่าขอบล่าง | M-BUILD-006 (FX-1, D-67) |
| B-02 กับ R3.1 | คงการปฏิเสธไฟล์ใหม่กว่า (D-22) และแก้ข้อความตอนนี้ | M-BUILD-008 |
| B-19 ผลหลุดเพราะ stale | ภาพถูก แต่ช่อง rating เดียวถูกเขียนทับ | M-BUILD-009 (R3.4r) |
| Build matrix GTO > LEO | กลไกอธิบายได้ (GTO นับ burn หลัง insertion แบบทันที) รวมเข้า rating | M-BUILD-016 |
| B-11 กับ review D1 | ไม่มี fallback บน main thread (rating ใช้ 1–8 s) แสดง reload/retry และตรวจ pre-abort | M-BUILD-010 (FX-4) |
| D-21 / D03-eng / B-18 | ทุกการตัดสินต้องแก้ ROADMAP ในรูปแบบเดิมพร้อม `section-plan.ts` และเทสต์ | M-BUILD-021, M-PLATFORM-068 |
| เจ้าของ R3.2 | M-BUILD-002 ส่งมอบพร้อม G3; ความแม่นของภาพเป็นแถวตรวจรับของ M-LAUNCH-076 (R3.2r) | M-LAUNCH-076 (ไม่เป็น alias แล้ว) |

**Launch (ledger launch)**

| ประเด็น | คำตัดสิน | รายการหรือที่ลง |
|---|---|---|
| LUI-01 "R2.1 น่าจะแก้แล้ว" | ยังเปิด: `main.ts` ยัง preview เมื่อไม่ได้เล่น | M-LAUNCH-027 (P0, CO-4) |
| LUI-04 / UX-Q2 "R2.4 ครอบแล้ว" | บางส่วน: ไม่มีแถวกระโดด กล้อง และแถวใน Watch | M-LAUNCH-062 (R2.6) |
| ป้ายนำทางบนโทรศัพท์ | ส่วนป้ายเสร็จด้วยแถบบน; เหลือตัวเลือกเสียงของ Watch | M-LAUNCH-087, M-LAUNCH-061 |
| กั้น UX ทั้งหมดด้วยการทดสอบผู้ใช้ | ถูกแทนที่; กั้นเฉพาะรายการที่เนื้อหามาก | M-LAUNCH-075 → 063/064/065/067 |
| ลากหน้าต่างอิสระกับ "หนึ่งงานต่อหน้าจอโทรศัพท์" | อิสระเฉพาะ >860 px; โทรศัพท์ใช้ preset | M-LAUNCH-014 (D-36) |
| PHY-19 ฟิสิกส์หรือ UI | แยก: ป้าย UI ตอนนี้ ฟิสิกส์ใน R4.3 | M-LAUNCH-031 |
| สมการบอก "ไม่มีอากาศบนฐาน" | ยังเปิดใน drag/aeroAngles | M-LAUNCH-060 |
| P12 ข้ามกราฟที่ซ่อน | ปลอดภัยหลัง R2.3 (`setLayout` วาดจากเฟรมที่แสดง) | M-LAUNCH-022 (CO-4) |
| B12 ที่รีเซ็ต notation | ย้ายไป telemetry; ยังกลับเป็น "auto" ไม่ได้ | M-LAUNCH-006 |
| D14 listener leak | ไม่รั่ว; ปัญหาจริงคือ applyLanguage เต็มกลางบินและเรียกซ้ำ | M-LAUNCH-025 |
| P11 / NEW-render-1 ยังไม่วัด | วัดแล้ว: 18/19 program ซ้ำ; setupViews ทิ้ง view เก่าก่อนสร้างใหม่ | M-LAUNCH-041 (EQ-2) |
| A04 เสร็จ กับ toast ทับ | A04 เสร็จ; toast ทับเป็นบั๊กเล็กแยก | M-LAUNCH-066 |
| LUI-11 ร่างกับที่บิน | ยังเกิดได้ผ่าน preview ล้มหรือ MCP | M-LAUNCH-030 (หลัง M-LAUNCH-028) |
| P29 re-render บางส่วน | ปฏิเสธ | M-LAUNCH-033 (C1) |
| B11 touch-action | คงไว้ ทบทวนเมื่อมีหลักฐานอุปกรณ์ | M-LAUNCH-039 (C2) |

**Learning (ledger learning; ตารางเต็ม CL1–CL16 อยู่ที่ S16 §16.6)**

| ประเด็น | คำตัดสิน | รายการหรือที่ลง |
|---|---|---|
| CL1 ศัพท์ไทย D5 | ยังไม่ทำ; ใช้ป้าย ER-6 | M-LEARNING-029 (ED-I18N-1) |
| CL2 ชื่อสถาบันกับ D-2 | ละเมิดอยู่ | M-LEARNING-054 (CO-7, D-42) |
| CL3 แพ็กแรกตาม D-13 | การส่งมอบเบี่ยง ต้องยืนยัน D-13/D-14 ใหม่ | M-LEARNING-055 |
| CL4 ประตูการทดสอบผู้ใช้ | คงเฉพาะสิ่งที่ยังไม่สร้างและเนื้อหามาก | M-LEARNING-050 (HU-1, D-54) |
| CL5 T01–T03, S12, S15 "ยังไม่ทำ" | โค้ดยืนยันว่าเสร็จ | M-LEARNING-039/040/041/049 |
| CL6 รูปแบบสมุด D-5 | บางส่วน; path ใน D-5 ผิด | M-LEARNING-023 (ED-PED-2) |
| CL7 ล็อกเฉลยถาวร | D-6 ชนะ | M-LEARNING-076 (C1) |
| CL8 ลำดับพจนานุกรมต่อภาษา | D5 ก่อน → แยกพจนานุกรม → typed keys | ED-I18N-1 → EQ-6 |
| CL9 id ของแพ็ก | บางส่วน | M-LEARNING-011 |
| CL10 grader กับร่มหนีภัย | ยังเปิดสำหรับบทที่ไม่มี endEvent | M-LEARNING-010 |
| CL11 รหัส IPST ใน UI | รอการตรวจของเจ้าของ | M-LEARNING-053/052 |
| CL12 credits | เสร็จ ยกเว้นเทสต์และรายการแหล่งในแอป | M-LEARNING-065/066 |
| CL13 privacy | ลบข้อมูลเสร็จใน R1; ยังไม่มีคำแถลง | M-LEARNING-047 (ED-INST-1) |
| CL14 stableOrbit | มีเทสต์แต่ไม่มีบทใช้ | M-LEARNING-008 |
| CL15 « ในภาษาไทย | มี 25 ตัว รวมใน HU-3 | M-LEARNING-033 (D-74 เสนอ) |
| CL16 ผลการเรียนรู้ก่อน D06/D07 | ลำดับถูกแทนที่; เอกสารยังมีประโยชน์ | M-LEARNING-060 |

**Orbit (ledger orbit)**

| ประเด็น | คำตัดสิน | รายการหรือที่ลง |
|---|---|---|
| สถานะดาวเทียมไทยค้าง | บั๊กเปิด; แยกข้อความ (001) กับสถานะ (002) | M-ORBIT-001, M-ORBIT-002 (FX-3) |
| ORB-03 คาบในการ์ด | จริงทั้งคู่; สาเหตุคือ early return ของ `renderFacts` | M-ORBIT-003 |
| fallback ของ worker แบบ module | บั๊กจริงแต่พบน้อย แก้ในแพ็กเกจ D1 | M-ORBIT-005 (FX-4) |
| P4 กับ NEW-bundle-1 | การเปลี่ยนเดียวกัน; ไม่ลบการค้าง ~4 s ครั้งแรก | M-ORBIT-010 (EQ-4); R3.0 |
| D-11 ป้ายดวงจันทร์ | บางส่วน: ไม่มีป้าย; README:131 ยังผิด | M-ORBIT-029 (FX-3) |
| solar constant | ใช้ 1361 ทุกที่; บันทึกการตัดสินใน 046 | M-ORBIT-046 (D-41, D-47) |
| ลำดับ D06 กับ Phase 4 | ถูกแทนที่ | M-ORBIT-065 (C1) |
| L01–L05 วางแผนหรือบางส่วน | บางส่วน (มีโมดูล Apollo); R8 ขยาย #38 | M-ORBIT-031…035 (R8) |
| ISS docking ขาดหรือมี (C14) | ไม่ขัดจริง: R5.1 = ขยายและเปิดใช้ | M-ORBIT-024 |
| INF-12 | ย้าย cron แล้ว; ยังไม่มี age gate | M-ORBIT-040 (R7.4) |

**Physics (ledger physics)**

| ประเด็น | คำตัดสิน | รายการหรือที่ลง |
|---|---|---|
| tolerance tier ก่อน refit | PLAN ชนะ: held-out บังคับ; tier เป็น oracle เสริม | M-PHYSICS-060, M-PHYSICS-073 (C1) |
| "บินคงที่ทุกบิต" (RM:P7) กับ R4 | กฎแคบ: Orbit/Build/การสอนไม่ขยับ golden ของ Launch | M-PHYSICS-063 (S02 §02.10) |
| บรรยากาศเดียวเหนือ 100 km | คงตาราง ascent; คำถามระยะยาวไปโมเดลอายุพร้อมป้าย | M-PHYSICS-022 |
| WGS-84 | แสดงผลเท่านั้นใน R4.2; ทาง (ข) ใน R4.5 ภายใต้ D-51 | M-PHYSICS-024 |
| J2 ใน point-mass ascent | ขยับ fingerprint 27 ตัว; บันทึก offset ตอนนี้ โค้ดเฉพาะภายใต้ D-51 | M-PHYSICS-023 |
| RK4 cislunar "เท่ากับ rk4Step" | ไม่จริงระดับบิต; ปฏิเสธการรวม | M-PHYSICS-016 (C1) |
| golden-section NEW-PHYS-3 | ไม่ identical; เลื่อนไป R8; memo P15 ทำก่อน | M-PHYSICS-018 (C2), M-PHYSICS-011 |
| D17/D18/D19 ค่าคงที่ | ค่าเท่ากัน → 015 (EQ-10); MU_MOON, frame ดวงอาทิตย์, solar constant → 020/027 ใน validation run เดียว | M-PHYSICS-015, M-PHYSICS-020 |
| ค่าเริ่มบนโทรศัพท์ (DEC:D-27) | ไม่ลดความสมจริงแบบเงียบ; ทำ six-DOF ให้เร็วก่อน; point-mass เป็นทางเลือกที่มีป้าย | M-PHYSICS-003, D-56 |
| PR #36 กับ D-12 | merge ทั้งก้อน; หลักฐาน heavy ที่ขาดอยู่ที่ 001 | M-PHYSICS-001 (CO-6) |
| rating ของ Vega-C และ launcher ที่ size | Build เป็นรายการหลัก | M-BUILD-016/018; M-PHYSICS-053/054 (C1) |
| M-LAUNCH-077/078/079 | เป็น alias ของรายการ physics | M-PHYSICS-042/043/044 |

**Platform (ledger platform)**

| ประเด็น | คำตัดสิน | รายการหรือที่ลง |
|---|---|---|
| กฎงบ: ratchet ลงเท่านั้น กับการขึ้นที่มีเหตุผล | กฎเดียว: ขึ้นได้เมื่อมีขนาดวัด ฟีเจอร์ที่รับผิดชอบ และแพ็กเกจชดเชยที่ระบุชื่อ; ข้อมูลมีเพดานของตัวเอง | M-PLATFORM-024, 063 (D-38) |
| deploy ตามเวลาข้าม npm test | PLAN ชนะ | M-PLATFORM-046 (C1) |
| golden แบบ tolerance tier | hash เป็น gate; tier เป็น oracle เสริม; ย้าย Node = re-record ครั้งเดียวที่เจ้าของอนุมัติ | M-PLATFORM-044 (D-3/D-4) |
| หนึ่ง session หนึ่ง PR กับ PR รวมหลายแพ็กเกจ | คงโมเดลผู้รวมงาน; รายงานและแถว PROGRESS ต่อแพ็กเกจ; v2.0 จำกัดขนาด PR (S18) | M-PLATFORM-077 |
| ไฟล์สถานะสองชุด | หนึ่งแหล่งต่อเรื่อง (S00 §00.8) | M-PLATFORM-067 |
| namespace ของ D/U/R | ตารางคำนำหน้าและทะเบียนเดียว; ROADMAP ไม่เปลี่ยนชื่อ | M-PLATFORM-065, 066 |
| ย้ายเทสต์ six-DOF ทั้งภารกิจออกจากชุดหลัก | ได้เฉพาะเมื่อยังรันใน deploy gate ก่อนเผยแพร่ | M-PLATFORM-045 |
| D-27 point-mass บนเครื่องแคบ | วัดก่อน; ไม่เป็นค่าเริ่มแบบเงียบ | M-PLATFORM-041, 042 |
| persist() อัตโนมัติ | ผู้ใช้เริ่มเองจากเมนูโปรไฟล์ | M-PLATFORM-018 |
| B1–B3 ก่อน R2 | R1.6 ต่อจากคลื่นปิดงาน; R2 แตะเฉพาะ registry.ts | R1.6 |
| INF-15 ซ้ำสองที่ | ลบข้อมูลเสร็จ; คำแถลงอยู่ที่ learning | M-LEARNING-047 |
| LUI-13 และ TQ-02 แยกสองส่วน | บันทึกเป็นแถวแยก นับครั้งเดียว | M-LAUNCH-024/M-PLATFORM-053; M-BUILD-024/M-PLATFORM-051 |

#### C4 ข้อเสนอจากรอบตรวจทานแผนที่ไม่รับ หรือรับบางส่วน

รอบตรวจทานสี่ชุด (coverage, consistency, execution, guard) ผู้แก้ตรวจกับ GitHub แบบอ่านอย่างเดียว ข้อที่ไม่อยู่ในตารางนี้รับทั้งหมด

| ข้อเสนอ | ผล | ที่ลง |
|---|---|---|
| ฐานคือ `80d5076` และ #80 เปิดอยู่ | ไม่รับ: #80 merge เป็น `7662ead`; ต่อมา #81–#83; ฐาน as-of ปัจจุบันคือ `5f9aa2e` (live `09cc2f5`, S00 §00.1) | S00, S05 §05.0 |
| ตัดงานแก้แถว R3 ใน PROGRESS ออกจาก CO-2 (ทำใน #79 แล้ว) | รับบางส่วน: #83 แก้แถว R3.3 diagrams และ R3.1 design ID แล้ว แต่ PROGRESS บน `5f9aa2e` ยังค้าง (แถว R3.5, R3.3 stowed, บรรทัด Open 77/86, ไม่มีแถว G3) CO-2 จึงคงงานแก้ PROGRESS | CO-2 (S06) |
| ถอด R5.1 ออกจากเงื่อนไขของ M-PLATFORM-036 | ไม่รับ: ยังไม่พิสูจน์ว่าการโหลด Orbit แบบหน่วงไม่ขึ้นกับ R5.1; EQ-7 ครอบ K2–K5 และบอกตรง ๆ ว่าการขึ้นเพดาน index ของ R3 ยังไม่มีการชดเชยจนถึงตอนนั้น offset ที่ระบุคือ EQ-6 และ EQ-8 ไม่ใช่ EQ-1 | S09 EQ-7 |
| แยก R0.2r เป็น a/b โดย b อยู่ใน K4 | ไม่รับ: S15 มี ADR ของ CraftState เป็น R5.2 PR1 อยู่แล้ว | S07, S15 |
| ตัวเลขรวมตายตัว (CO-4 = 10, รวม 372) | แก้: CO-4 = 11 PR (1, 2, 3, 4a, 4b, 5–10); ยอดรวมคำนวณใหม่จาก `packages.tsv` ทุกครั้ง | A.1, S05 |
| PR ของ HU นับรวมเพดานโค้ด 5 / PR เอกสารพ้นทุกเพดาน | รวมเป็นกฎเดียว: PR เอกสารล้วนไปช่อง "records" ของ I จำกัด 2 และนับเวลาตรวจของเจ้าของ (ci.yml ข้าม `**/*.md` ยกเว้นไฟล์ที่เทสต์อ่าน) | S18 §18.6 |
| ทางเลือก A/B ของ consistency 6 และ execution 6 | รวม: แพ็กเกจเทียม R4.2-S ใน K3; G4-S ใน K3 ถ้า merge ก่อน freeze 21 ธ.ค. มิฉะนั้นต้น K4; ย้าย EQ-10/EQ-11 ไป K2 เมื่อยืนยัน dependency แล้ว | S05, S13 |
| ออกคำแถลงความเป็นส่วนตัว v1 โดยไม่มีข้อ formative-use และช่องรายงาน | ไม่รับ: ลดคุณภาพด้านความปลอดภัยข้อมูลก่อนมี session กับคนจริง; ย้าย D-49 และ D-60 ไปชุด B ตอบก่อน HU-1 | S08, S16 |
| `syncMobileFlightBar` เขียน DOM ทุกเฟรม | รับบางส่วน: โค้ดเขียนเฉพาะเมื่อค่าเปลี่ยนแล้ว แต่ยังอ่าน textContent และเรียก `t()` ทุกเฟรม จึงคงการ cache ค่า ส่วนข้อเสนอ 10 Hz และ matchMedia ไม่รับเพราะผลไม่เท่าเดิม | S09 EQ-3 |
| ป้าย "D-29…D-37 legacy" สำหรับการตัดสินศัพท์ | ไม่รับ: ใช้เลขในทะเบียนซ้ำ; S08 ให้ป้าย ER-6 แทน | S08 §08.2 |
| พับ M-BUILD-006 และ M-PLATFORM-010 เข้า D-22/D-63 | ไม่รับ: เนื้อหาไม่เกี่ยวกัน; เป็น D-67 และ D-68 ใหม่ | S08 §08.4 |
| R3 ครบ = ทุกรายการที่แผนวางไว้ใต้ R3 เสร็จ | ไม่รับ: คำของเจ้าของครอบขอบเขต R3 ของ PLAN v1.2; งานที่ v2.0 เพิ่มใต้ R3 ตรวจกับโค้ดบน 5f9aa2e แล้วย้ายเป็น R3+ ต่อยอด (refresh/r3-audit.tsv) | S12 §12.9, S05 §05.4 |
| ให้ M-BUILD-001…005 เป็นบางส่วน | ไม่รับ: รายการเหล่านี้คือขอบเขต v1.2 ที่ส่งมอบ ส่วนที่แผนเพิ่มย้ายไป id ที่มีชื่อ (M-PLAN-025/028/030, M-LAUNCH-076/081, M-BUILD-015) จึงไม่มีงานหาย | S03 §03.4, S12 §12.1 |

#### C5 ดัชนีตาราง "ไม่รับหรือเลื่อน" ในแต่ละส่วน

แคตตาล็อกหลักของสิ่งที่จะไม่ทำแม้จะเร็วขึ้นอยู่ที่ S02 §02.13 (บ้านเดียว) ตารางด้านล่างชี้ไปยังตารางท้องถิ่นของแต่ละส่วนซึ่งบอกทางเลือกที่รักษาคุณภาพ ส่วนนี้ไม่คัดลอกเนื้อหาซ้ำ

| ตาราง | หัวข้อที่ไม่รับหรือเลื่อน |
|---|---|
| S02 §02.13 | แคตตาล็อกหลัก (เช่น point-mass เงียบบนโทรศัพท์, ลดกราฟิกอัตโนมัติ, จำกัด fps, debounce การบันทึก, ตัดข้อมูลออกจาก install, tolerance tier แทน hash, รวม RK4, analytics) |
| S07 (ท้ายส่วน) | ใช้ผล unit ซ้ำบน Pages, tier เป็น gate, hard gate บนเวลาของ SwiftShader, commit ภาพ golden ใต้ docs/ |
| S09 §09.7 | M-LAUNCH-033, M-PHYSICS-016, M-PLAN-012 (บ้านคือ C1) |
| S10 §10.13 | debounce, store ต่อ key, persist() อัตโนมัติ, fallback main thread, rating ที่ถูกตัด, ตัดข้อมูลจาก install, ตัดฟิลด์แบบเงียบ, regrade, ปล่อย context ทุกครั้ง, guard สูตรทุกเซลล์ CSV |
| S11 §11.10 | ลดคุณภาพแบบเงียบ, กราฟิกต่ำอัตโนมัติ, "เร็วขึ้น" ด้วยการขยาย step, self-host ฟอนต์ไทย, จัดหน้าต่างอิสระบนโทรศัพท์, วาด held coast ด้วย Kepler |
| S12 §12.10 | ปล่อย context ทุกครั้ง, renderer ต่อแท็บ, แก้ความยาว stage ให้ตรงภาพ, envelope v2 ของ hand-off, apply ข้อเสนออัตโนมัติ, precache ภาพ Home โดยไม่มี offset |
| S13 §13.9 | เพิ่มก๊าซให้ลงจอด, fit ใหม่ให้ผ่าน held-out, bump `RIGID_DATA_REVISION` เพื่อแก้ข้อความ, throttle ไร้แหล่ง, ยืม programme ข้ามฮาร์ดแวร์ |
| S14 §14.7 | mascons เป็นค่าเริ่ม, bias factor ใน MSIS, DTM2020, เปลี่ยนบรรยากาศ ascent, แก้ `passes.ts`/`gstime`, คลาย tolerance ของ Lambert |
| S15 §15.5 | snapshot ISS สดในบทที่ให้คะแนน, จัด phase ย้อนหลัง, แอนิเมชัน docking แยกจากฟิสิกส์, Progress/Dragon พร้อม Soyuz, สลับร่ม Apollo, asset R5/R6 ใน precache, context ใหม่สำหรับห้องนักบิน, EVA/VR ใน R6 |
| S16 §16.7 | ลบคาบจาก event log, ตรวจคำอธิบายอัตโนมัติ, คะแนนดาวหรือแบดจ์, คู่มือไทยใน precache, รวม tick ของ figures.ts, รายงานปัญหาอัตโนมัติ, DOP บน main thread, bundle ข้อมูล Space-Track, re-record เป็นก้อน |
| S17 §17.7 | ย้ายเทสต์ six-DOF ออกโดยไม่มีเงื่อนไข, retry/timeout ให้ flake หาย, dependabot auto-merge, format ทั้ง repo, เทสต์อายุข้อมูลตามปฏิทิน, build zip ใหม่ตอนติด tag, rewrite ประวัติ git, แยกบท PHYSICS, เส้นทางไม่มี WebGL แทน WebGL, ขยาย tolerance ข้าม engine, CSP ก่อน violation เป็นศูนย์ |

#### C6 ข้อสังเกตที่ยังไม่มี M-id ของตัวเอง (จากการเขียนส่วนต่าง ๆ)

ส่วนนี้**ไม่ออก id ใหม่** ข้อที่ต้องเป็นรายการใหม่จะได้เลขถัดไป (ถัดจาก `M-PLAN-031`) เมื่อเจ้าของรับผ่าน CO-2 หรือที่ GK ข้อที่พับเข้ารายการเดิมได้แสดงปลายทางไว้แล้ว

| ข้อสังเกต | ที่มา | ปลายทางหรือบ้าน | สถานะการลงทะเบียน |
|---|---|---|---|
| bug-fix การ sample ของ GlowGovernor ที่นับเฟรมที่ไม่ได้ render | S09 §09.8 ข้อ 5 | EQ-3 ขั้น 0 (เลน I, bug-fix); นโยบายอยู่ที่ M-PLAN-021 | ลงทะเบียนผ่าน CO-2 |
| precache ไม่ตรวจ revision เมื่อ deploy ชนการติดตั้ง | S09 §09.8 ข้อ 1, S10 §10.14 ข้อ 1 | พับเข้า M-PLATFORM-022 เป็น FX-7 ขั้น 0 (ก่อน EQ-1) | มีบ้านแล้ว |
| worker recheck import i18n ผ่าน chain | S09 §09.8 ข้อ 6 | EQ-6 PR แยกเส้นทาง worker (M-PLATFORM-031) | มีบ้านแล้ว |
| journey `learner-profiles` timeout (Pages 37219398466, 37223857005) | S10 §10.14 ข้อ 3 | R7.1 (M-PLATFORM-061, เปิด): diagnostics ของ #81/#82 อยู่แล้ว; ผ่านใน 37230585947; ถ้าเกิดซ้ำใช้ mark/diagnostics หาสาเหตุ ถ้าไม่เกิดซ้ำวัดอัตรา ≥20 รอบก่อน R1.6 PR1; ห้าม retry หรือเพิ่ม timeout | มีบ้านแล้ว |
| rating เก่าที่ไม่มีธง converged | S10 §10.14 ข้อ 4 | ขอบเขตของ M-BUILD-006 (FX-1, D-67) | มีบ้านแล้ว |
| การเขียนเพิ่มของ #77/#80 ก่อน R1.6 | S10 §10.14 ข้อ 6, S03 §03.4 | R1.6 §10.3.1 (fixture ของ differential harness) | มีบ้านแล้ว |
| นิยามการนับของ KPI-13 (parse กับ getItem) | S10 §10.14 ข้อ 2 | S04 ปรับนิยามที่ GK1 | ไม่ใช่รายการ |
| ติดตาม headroom ของ precache รายวันจนกว่าจะแยกเพดาน | S03 §03.9 ข้อ 2 | ขั้นหนึ่งของ CO-1 (M-PLATFORM-063) | มีบ้านแล้ว |
| worker 6 จาก 12 ตัวฝังแกนฟิสิกส์ (ไม่ใช่ 12) | S03 §03.9 ข้อ 3 | ตัวเลขฐานของ EQ-8 (M-PLATFORM-033) | ไม่ใช่รายการ |
| ชื่อฟังก์ชัน ephemeris บอก frame (RA:(b) ข้อ 4) | S14 §14.7 ข้อ 2 | R4.5 ขั้น 1 (identical-output) | รอ S09/S18 ยืนยัน |
| ความสอดคล้องของ J2 อันดับสองระหว่าง playground, designer และ Launch | S14 §14.7 ข้อ 3 | — | ต้องออก id ถ้าเจ้าของรับ |
| ขอบเขตทิศดวงจันทร์ใน R4.5 | S14 §14.7 ข้อ 4 | ลงทะเบียนภายใน R4.5 จากความแม่นของ series | มีบ้านแล้ว |
| ช่องว่างใหม่ที่ R4.7 จะพบ | S14 §14.7 ข้อ 5 | — | ต้องออก id เมื่อพบ |
| รัศมี ISS สองค่า (420/418 km) | S15 §15.6 ข้อ 1 | R5.2 (M-ORBIT-025) และ ADR CraftState | มีบ้านแล้ว |
| ขอบเขต DV1–DV3 ไม่มีแหล่ง | S15 §15.6 ข้อ 2 | ผู้ตรวจ D-55 ยืนยันก่อนรัน R5.2 | มีบ้านแล้ว |
| re-record เทสต์ heavy rendezvous เมื่อ R5.2 แทน ISS_RAAN0 | S15 §15.6 ข้อ 3 | R5.2 re-record ที่ระบุชื่อ เจ้าของอนุมัติ | มีบ้านแล้ว |
| journey ถึงสถานะ docked ใช้เวลานาน | S15 §15.6 ข้อ 4 | deploy/heavy gate ไม่ใช่ PR CI (R5.3) | มีบ้านแล้ว |
| ไฟล์ DE440 กับเพดานข้อมูล | S15 §15.6 ข้อ 5 | R8.1 ใช้กติกา D-38 | มีบ้านแล้ว |
| การตัดสินระดับเนื้อหา D-71…D-74 (คำไทยต่อแนวคิด, พ.ศ./ค.ศ., og preview, « ») | S16 §16.8 ข้อ 3 | ED-I18N-2, HU-3; S08 §08.4 รับเข้าทะเบียนเป็น "เสนอ" (`decisions.tsv` มีถึง D-75 ตั้งแต่ refresh 2026-10-04) | รับแล้ว |
| รหัส HUF- แทน H1/UX-0x ในโปรโตคอลรวม | S16 §16.8 ข้อ 1 | HU-1 (M-LEARNING-050); App D แถว USER-TEST และ beginner-study | มีบ้านแล้ว |
| ลำดับเวลาที่ตึงของ 046/009/062/056 กับปีการศึกษาไทย | S16 §16.8 ข้อ 4 | S05 ปรับช่วงคลื่นที่ GK | ไม่ใช่รายการ |
| หน้า Engineer ของ Build (typed guidance, maxQ/maxAccel) | S12 §12.8 | กำหนดขอบเขตเมื่อ D-21 ได้คำตอบ (เงื่อนไขหลักฐาน G3 ครบแล้ว) | ต้องออก id ถ้าเจ้าของรับ |
| envelope v2 ของ hand-off | S12 §12.3 | ตัดออก; ถ้าจำเป็นภายหลังเป็นงานแยกภายใต้ D-22 | ต้องออก id ถ้าเจ้าของรับ |
| PR ของ R4.1 (8) และ R4.4 (5) มากกว่าประมาณการ | S13 §13.9 ข้อ 8 | ปรับที่ GK (S05 §05.11) | ไม่ใช่รายการ |
| D-51 ควรมีตัวเลือกวางฐานปล่อยด้วย WGS-84 ใน R4.5 | S13 §13.9 ข้อ 6 | S08 เพิ่มเป็นคำถามข้อ 2 ของ D-51 (§08.4, แผ่น C-K3) | รับแล้ว |
| key i18n ที่ค่าซ้ำข้ามบริบท (R3CR-07) | S12 §12.10 | ปฏิเสธ: ผูกบริบทของผู้แปล | ไม่ใช่รายการ |
| openTemplate render สองรอบ (R3CR-11) | S12 §12.10 | ทำเมื่อแตะ panel.ts/main.ts (CO-4/I-train) | ไม่ใช่รายการ |
| main thread รอ shader ~11 s และ GPU ~3.6 core เมื่อมี animation (PROGRESS บน 5f9aa2e) | S03 §03.5 | EQ-2 (M-PLAN-001), EQ-4: ต้องวัด | มีบ้านแล้ว |
| เครื่องวัด PB เปลี่ยน (2.10 กับ 2.80 GHz) | S04 §04.1 ข้อ 9 | วัด fbefa18 ซ้ำบนเครื่องเดียวกันถ้าต้องเทียบเวลา | ไม่ใช่รายการ |
| rating เปลี่ยนอย่างเดียวนับเป็นการแก้แบบหรือไม่ (R3CR-15) | S12 §12.3 | D-75 (เสนอ, S08 §08.4) → M-PLAN-028 | รับแล้ว |
| ค่า precache บน Pages หลัง refresh อ่านจาก log ไม่ได้ | S04 | CO-1 วัด | มีบ้านแล้ว |

### App D — การเลิกใช้เอกสาร

#### D1 หลัก: ไม่ลบไฟล์ใด

- **ไม่มีการลบหรือย้ายเอกสารใดโดยไม่มีคำอนุมัติของเจ้าของที่ชัดเจน** การเลิกใช้ทำด้วย banner และหมายเหตุเท่านั้น ไฟล์ทุกไฟล์ยังอยู่ที่ path เดิมและอ้างได้ผ่าน SHA
- การติด banner ทั้งหมดทำใน PR เอกสารเดียว (CO-8, M-PLATFORM-075/077) หลังเจ้าของอนุมัติ v2.0 เท่านั้น (OR-5) banner ของเครื่องมือที่ยังใช้อยู่ (protocol การทดสอบ, checklist ของการตรวจแพ็ก) ติดภายหลังผ่าน R7.5 เมื่อ HU-1/HU-2 เสร็จ
- การย้ายไปเก็บถาวรทำภายหลังผ่าน R7.5 (M-PLATFORM-062) ทีละ packet ทั้งก้อน หลังตรวจผู้ใช้ไฟล์ และหลังเจ้าของอนุมัติรายการย้าย ไม่ rewrite ประวัติ git
- scratchpad ของรอบวางแผนนี้ (ledger, perf-baseline, ตาราง final) เป็นหลักฐาน ไม่ commit; สคริปต์วัด perf เข้า repo ผ่าน R0.4 (M-PLATFORM-041); ภาคผนวกนี้คือแผนที่ถาวร

#### D2 ข้อความ banner (ตรงตัว)

ใส่เป็นบรรทัดแรกของเอกสารที่ถูกแทนที่ (blockquote) ตามด้วยบรรทัดภาษาอังกฤษได้:

> เอกสารนี้ถูกแทนที่โดย docs/development/PLAN.md v2.0 (<วันที่อนุมัติ>) — เก็บไว้เป็นประวัติ/หลักฐาน ห้ามใช้อ้างเป็นแผนหรือสถานะปัจจุบัน; รายการทั้งหมดแมปไว้ใน PLAN.md ภาคผนวก (S19)

บรรทัดภาษาอังกฤษที่เสนอ (ไม่บังคับ): "Superseded by docs/development/PLAN.md v2.0 (`<approval date>`); kept as history/evidence only — do not cite as the current plan or status; every item is mapped in PLAN.md Appendix S19." สำหรับตาราง Roadmap ใน `docs/IMPLEMENTATION-STATUS.md` ใช้หมายเหตุสั้นเหนือตาราง: "historical; see PLAN.md v2.0" (ไม่ใช่ banner ทั้งไฟล์) **ห้ามใส่ banner ใน `docs/ROADMAP-PART2-3.md`** เว้นแต่เทสต์ parser ทั้งสองผ่านโดยไม่แก้เทสต์

#### D3 การกระทำต่อเอกสาร (หนึ่งการกระทำต่อเอกสาร ย่อจาก doc map §1)

หมวด: **แทนที่ในที่เดิม** · **ถูกแทนที่ (banner)** · **เครื่องมือที่ดูดซับแล้ว** (ใช้ต่อจนมีตัวแทน แล้วจึง banner) · **คงที่เดิม (โค้ด/เทสต์อ่าน)** · **แหล่งจริง** (บทบาทหลัง v2.0) · **อ้างอิง** · **รอเก็บถาวรหลังอนุมัติ**

| เอกสาร | หมวด | การกระทำและบทบาท | ผู้อ่าน (โค้ด/เทสต์) | แพ็กเกจที่ลงมือ |
|---|---|---|---|---|
| docs/development/PLAN.md | แทนที่ในที่เดิม | v1.2 → v2.0 ที่ path เดิม; v1.2 (blob `0001365`) อ้างได้เป็น `PLAN:` ผ่าน SHA; บันทึกสถานะ (บรรทัด 869–875) ยกไป S00 §00.9; ฉบับ Word ถ้าต้องการสร้างนอก repo เป็น Release asset | — | CO-8 |
| docs/history/review-2026-09-30/DEVELOPMENT-PLAN-TH.md | ถูกแทนที่ (banner) | ทุกแถวแมปใน App B4/B7 | — | CO-8 |
| docs/history/review-2026-09-30/REMAINING-WORK-TH.md | ถูกแทนที่ (banner) | ทุกแถวแมปใน App B4/B7 (M-PLATFORM-081 ถูกแทนที่) | — | CO-8 |
| docs/history/review-2026-09-30/STATUS-INVENTORY-TH.md | ถูกแทนที่ (banner) | สถานะ ณ `404eb0c` ล้าสมัย (C11) | — | CO-8 |
| docs/history/review-2026-09-30/README.md | ถูกแทนที่ (banner) | ประโยคลำดับความน่าเชื่อถือถูกตัด (C4) → S00 §00.8 | — | CO-8 |
| docs/history/audit-2026-09-27/PLAN-2026-09-28.md | ถูกแทนที่ (banner) | session ที่เหลือ (S5, S8-2, S4c, S10, S13, S16) แมปใน ledger; รหัส S11/S12/S16 ของไฟล์นี้อ้างเป็น `OD:PLAN-2026-09-28/S11` | — | CO-8 |
| docs/stage1-2026-10-02/README.md (ส่วน backlog) | ถูกแทนที่ (banner) | backlog SCI-01…QA-01 แมปแล้ว; evidence JSON ยังเป็นอ้างอิง | — | CO-8 |
| docs/history/HANDOFF-G02-BURNS.md | ถูกแทนที่ (banner) | งานเปิด → M-PHYSICS-029 (R4.3) | — | CO-8 |
| docs/history/PARALLEL-GNC-2026-09.md (ส่วน known issues) | ถูกแทนที่ (banner) | known issues → M-PHYSICS-030 (R4.3); แถวการตัดสินที่ยังมีผล → ER-* (S08 §08.2) | — | CO-8 |
| docs/history/ARCHITECTURE-PLAN.md | ถูกแทนที่ (banner) | สัญญาสถาปัตยกรรม → S02 §02.9; ส่วนอื่นเป็นประวัติ | — | CO-8 |
| docs/SIXDOF-BROWSER-QA.md | ถูกแทนที่ (banner); รอเก็บถาวร | ล้าสมัย (C10); งานตรวจ perf/หน่วยความจำที่เปิดอยู่ → M-PLAN-003 (R0.4) | — | CO-8; ย้ายด้วย R7.5 |
| docs/IMPLEMENTATION-STATUS.md (ตาราง Roadmap) | ถูกแทนที่ (หมายเหตุ) | หมายเหตุ "historical; see PLAN.md v2.0" เหนือตาราง; ทั้งไฟล์ยังเป็นแหล่งจริงของความสามารถ | — | CO-8 |
| PLAN v1.2 §4.1 (ตารางการตัดสินใจ) | ถูกแทนที่ | แทนด้วยทะเบียน D-29…D-37 ใน DECISIONS.md | — | CO-8 |
| docs/USER-TEST-2026-10.md | เครื่องมือที่ดูดซับแล้ว | ใช้ต่อจน HU-1 รวมเป็น protocol เดียว (`docs/USER-STUDY-HUF.md` ชื่อเสนอ) ด้วยรหัสใหม่ HUF-xx แล้วจึง banner | — | HU-1 → R7.5 |
| docs/stage1-2026-10-02/beginner-study.md | เครื่องมือที่ดูดซับแล้ว | เช่นเดียวกัน (UX-01…07 ชนกับ backlog ของ stage1) → HUF-xx | — | HU-1 → R7.5 |
| docs/history/phase4-2026-10-01/T03-OWNER-REVIEW.md | เครื่องมือที่ดูดซับแล้ว | เป็น checklist ของ HU-2; banner หลังการตรวจเสร็จ | — | HU-2 → R7.5 |
| docs/ROADMAP-PART2-3.md | คงที่เดิม (เทสต์อ่าน) | ไม่ banner ไม่จัดรูปแบบใหม่; prose ในรูปแบบเดิมผ่าน R7.5 (M-ORBIT-030, M-PLATFORM-068) พร้อมรันเทสต์ทั้งสอง | `tests/section-plan.test.ts:16`, `tests/section-nav-model.test.ts:18` (`import.meta.glob ?raw`); รายการ "coming next" ในแอป | R7.5 |
| docs/SIXDOF-VEHICLE-DATA.md | คงที่เดิม (แอปอ่าน) | ส่งไปกับแอป; หัว scope "2 vehicles" แก้เป็น prose ใน M-PLATFORM-069 | `src/ui/dialogs.ts:18` (`?url`) | R7.5 |
| docs/history/phase4-2026-10-01/T03-CURRICULA-RESEARCH.md | คงที่เดิม (เทสต์อ่าน) | ห้ามย้ายแม้อยู่ใต้ history/ | `tests/lesson-review.test.ts:8` | — |
| docs/history/AUDIT-2026-09-16.md | คงที่เดิม (โค้ดอ้าง) | รหัส B1–B42 ถูกอ้างใน comment ของ src; ห้ามย้ายระหว่างที่ยังถูกอ้าง | comment ใน `src/` | — |
| docs/PHYSICS.md | แหล่งจริง (normative R4); คงที่เดิม | สารบัญอัตโนมัติ (M-PLATFORM-072) ไม่แยกบท | comment ใน `src/` มากกว่า 40 ไฟล์ | R7.5 |
| docs/IMPLEMENTATION-STATUS.md | แหล่งจริง (ความสามารถและข้อจำกัด); คงที่เดิม | ไม่เปลี่ยนชื่อ; แก้ความจริงใน M-PLATFORM-069; หลัง M-LAUNCH-072 จะเป็นไฟล์ที่เทสต์อ่าน (เพิ่มใน path filter ของ ci.yml/deploy.yml) | `src/render/pads.ts`, `trails.ts`; เทสต์ป้ายของ M-LAUNCH-072 (R4.4) | R7.5, R4.4 |
| docs/development/PROGRESS.md | แหล่งจริง | แฟ้มสถานะงานแผนเพียงไฟล์เดียว เขียนใหม่เป็นแถวต่อแพ็กเกจ (lifecycle, ผู้อนุญาต/วันที่, SHA, CI, Pages, scientific acceptance) แก้ใน PR ที่ merge | — | CO-8 (M-PLATFORM-077) |
| docs/DECISIONS.md | แหล่งจริง | ทะเบียนเดียว D-1…D-75 (D-71…D-75 สถานะเสนอ); เฉพาะแถวที่เจ้าของยืนยันเขียนว่า "ตัดสินแล้ว" | — | CO-8 (M-PLATFORM-066) |
| docs/development/VERIFICATION.md | แหล่งจริง (กติกาหลักฐาน) | R7.3 เพิ่มกติกา oracle ของ EQ, `--compare` และ D-64 | — | R7.3 |
| docs/VALIDATION.md, docs/FLIGHT-PROFILE-METHOD.md | แหล่งจริง (normative R4) | ตาราง VALIDATION:3082 ได้ป้ายประวัติและ provenance โดยไม่แก้ตัวเลข (C13) | — | R7.5 (M-PLATFORM-069) |
| docs/development/reports/* | แหล่งจริง (หลักฐานการส่งมอบ) | ชื่อไฟล์ของงานที่ส่งมอบห้ามเปลี่ยน; แพ็กเกจใหม่เขียน `reports/<package>.md` | — | ทุกแพ็กเกจ |
| docs/USER-GUIDE.md, docs/LESSON-REVIEW-CHECKLIST.md | อ้างอิง | USER-GUIDE เพิ่มโปรไฟล์ R1 (M-PLATFORM-074) และความจริงอื่น (M-PLATFORM-069); คู่มือไทยคือ M-PLATFORM-073; checklist ใช้ใน HU-2 | — | R1.6, R7.5, ED-INST-1 |
| docs/SIXDOF-ACCEPTANCE.md, history/LESSONS-2026-09.md, history/audit-2026-10-01-flight-profile.md, history/2026-10-01-soyuz21b-sso-burn-order.md, history/2026-10-02/STAGE2.md, history/2026-10-03/{STAGE3-4,WEBGL-STARTUP}.md, history/audit-2026-09-27/Orbitlab-audit-TH.md | อ้างอิง | หลักฐาน; แถวการตัดสินใจของ LESSONS-2026-09 คัดเข้าทะเบียน (ER-*); audit 10-01 เป็น input ของ R4.1 | — | — |
| docs/README.md | แหล่งจริง (ดัชนี) | เขียนใหม่: รายการที่ 1 คือ PLAN.md v2.0, ข้อ 2 คือกฎลำดับความน่าเชื่อถือ, รายการไฟล์ที่ถูกอ่าน | — | CO-8 (M-PLATFORM-075) |
| README.md (root) | อ้างอิง | ลิงก์ไปแผน (CO-8); ตัวเลขเก่า (heavy ~15 นาที, ten flights, scheduled run skips npm test) แก้ใน M-PLATFORM-069 | — | CO-8, R7.5 |
| CHANGELOG.md | แหล่งจริง (บันทึกต่อ PR) | เติม #71–#75 (CO-2) และ PR ที่ merge ภายหลัง; บรรทัด CHANGELOG ต่อ PR ตามกฎ "docs touched or N/A" | — | CO-2, ทุก PR |
| docs/audit-2026-09-29/ (ทั้ง packet: 387 ไฟล์ ~18 MB, ลิงก์ตาย 60, editorial ซ้ำ, Orbitlab-audit-TH.md ชื่อชน) | รอเก็บถาวรหลังอนุมัติ | banner ที่ไฟล์ดัชนีของ packet (README-TH.md) ใน CO-8; ย้ายทั้งก้อนไป `docs/history/` หรือ Release asset; harness ที่ R4.6 ต้องใช้ให้**คัดลอก** ไม่ย้าย (S14 §14.4); ไฟล์อ้างอิงที่ยังใช้: runtime-fingerprint, solver-boundary, build-catalogue-matrix | — | CO-8 (banner); R7.5 M-PLATFORM-062 (ย้าย) |
| docs/history: HANDOFFS, CHECKPOINT-2026-09-20, CONTINUE-PHASE-6, DELIVERY-2026-09-17, RELEASE-REVIEW-2, SIXDOF-UI-SOURCE-REVIEW, review-2026-09-30/PR41-CODEX-REVIEW-TH, audit-2026-09-27/{code,learning,orbit}-review และ notes-S* | รอเก็บถาวรหลังอนุมัติ | บันทึก session ที่ผ่านแล้ว; ไม่มีงานค้างนอก ledger | — | CO-8 (banner); R7.5 (ย้าย) |
| docs/stage1-2026-10-02/ (ทั้งไดเรกทอรี) | รอเก็บถาวรหลังอนุมัติ | ย้ายหลัง re-pin ลิงก์หลักฐานเป็น SHA และหลัง HU-1 รวม beginner-study | — | R7.5 (M-PLATFORM-062) |
| docs/development/registry.tsv (ใหม่, เสนอ) | แหล่งจริง (ทะเบียนที่เครื่องอ่าน) | สร้างจาก `assignment.tsv` ด้วยสคริปต์เดียวกับภาคผนวกนี้ | — | CO-8 |
| docs/development/SESSION-PROTOCOL.md (ใหม่) | แหล่งจริง | protocol ของ session: แถวต่อแพ็กเกจ, branch ค้าง 14 วัน, CHANGELOG ต่อ PR | — | CO-8 |

#### D4 ข้อขัดแย้งระหว่างเอกสาร C1–C16 (doc map §2)

| # | ข้อขัดแย้ง | คำตัดสิน | แพ็กเกจที่แก้ข้อความ |
|---|---|---|---|
| C1 | สถานะ G05 Monte Carlo ("not started" กับ "done") | ฝั่ง B ถูก (มี `src/physics/monte-carlo*.ts`, บทที่ 2.4) | CO-8 (หมายเหตุ historical บนตาราง Roadmap); R7.5 M-PLATFORM-069 |
| C2 | จำนวนเทสต์ (9 906 กับ 10,079) | ตัวเลขใหม่กว่าชนะ; ตัวเลขในเอกสารสร้างจาก CI | R7.5 M-PLATFORM-071 → M-PLATFORM-069 |
| C3 | R1 ไม่อยู่ใน IS, README, USER-GUIDE, CHANGELOG | เติมบันทึก | CO-2 M-PLATFORM-064 (CHANGELOG); R1.6 M-PLATFORM-074 (คู่มือโปรไฟล์); R7.5 M-PLATFORM-069 |
| C4 | เอกสารใดชนะเมื่อขัดกัน | กฎลำดับความน่าเชื่อถือข้อเดียว (S00 §00.8) | S00 M-PLATFORM-067; CO-8 M-PLATFORM-075 (docs/README) |
| C5 | namespace ของ D/U/R/UX ชนกัน | คำนำหน้าตาม S00 §00.6 และทะเบียน D-n เดียว | S00 M-PLATFORM-065; CO-8 M-PLATFORM-066 |
| C6 | ชื่อสถาบันใน UI ขัด D-2 | D-42: ขอหนังสืออนุญาตหรือเปลี่ยนชื่อกลาง โดยคง lesson id | CO-7 M-LEARNING-054 |
| C7 | แพ็กแรกและทิศทาง pilot ขัด D-13 | ยืนยัน D-13/D-14 ใหม่ | HU-2 M-LEARNING-053; ED-PACK-2 M-LEARNING-055 |
| C8 | ประตู user test ของ wave 3 ถูกข้าม | D-54 บันทึกการข้าม และกั้นเฉพาะรายการเนื้อหามาก | HU-1 M-LEARNING-050 |
| C9 | PR #36 merge ทั้งก้อน ขัด D-12 | D-12 บันทึกว่า "เบี่ยง"; หลักฐาน heavy ที่ขาดรันใน CO-6 | CO-8 (ทะเบียน); CO-6 M-PHYSICS-001 |
| C10 | SIXDOF-BROWSER-QA ยังบอกว่า Falcon Heavy ไม่รองรับ | ฝั่ง IS ถูก | CO-8 (banner); R7.5 M-PLATFORM-069, M-PLATFORM-062 |
| C11 | STATUS-INVENTORY บอก Phase 4, S12, S15 ยังไม่ทำ | ฝั่ง IS ถูก | CO-8 (banner); R7.5 M-PLATFORM-069 |
| C12 | DEC:D-27 (วัดก่อนเลือกค่าเริ่มบนโทรศัพท์) ไม่ถูกปฏิบัติ | ติดตามผลผ่าน D-56: วัดก่อน; ไม่มี point-mass เป็นค่าเริ่มแบบเงียบ | S08 (D-56, M-PLAN-006); R0.4 M-PLATFORM-041; DEC M-PLATFORM-042; HU-6 |
| C13 | rating LEO ของ Soyuz-2.1a (7 021 กับ 8 140 kg) | ตาราง VALIDATION:3082 เป็นประวัติที่ไม่มี provenance: เพิ่มป้ายโดยไม่แก้ตัวเลข | R7.5 M-PLATFORM-069 (P ตรวจ); rating ปัจจุบันใน R4.3 M-BUILD-016 |
| C14 | ISS docking "ขาด" กับ "มีแล้ว" | ไม่ขัดจริง: R5 ขยาย ไม่สร้างใหม่ | R5.1 M-ORBIT-024 (S15 §15.1) |
| C15 | ชื่อไฟล์ Orbitlab-audit-TH.md ซ้ำ | อ้างด้วย path เต็มจนกว่าจะย้าย; เปลี่ยนชื่อตอนย้าย packet | R7.5 M-PLATFORM-062 |
| C16 | "Twenty further items" ไม่มีรายการ | ลบคำอ้าง หรือชี้มาที่ S19 | R7.5 M-PLATFORM-069 |

#### D5 กฎสุขอนามัยสำหรับการย้ายทุกครั้ง

- ไม่มีไฟล์ `.zip`, `.log`, `.docx`, `.pdf` ใต้ `docs/` และภาพไม่เกิน 200 kB ต่อไฟล์ (`tests/repo-hygiene.test.ts`); R7.5 เพิ่มเพดานขนาดรวมต่อไดเรกทอรี (M-PLATFORM-062) โดย packet เดิมอยู่ใน allowlist ที่หดได้อย่างเดียว
- ตรวจผู้ใช้ไฟล์ก่อนย้าย: grep path ใน `src/`, `tests/`, `docs/`, `.github/` ไฟล์ที่โค้ดหรือเทสต์อ่าน (D3 หมวด "คงที่เดิม") ห้ามย้ายหรือจัดรูปแบบใหม่ (process lesson 17)
- ย้ายทีละ packet ทั้งก้อน และเขียนลิงก์ใหม่ใน PR เดียวกัน; ลิงก์หลักฐานที่ชี้เข้าไฟล์ที่ย้ายให้ pin เป็น SHA ก่อน
- path filter ของ Markdown ที่ CI ข้ามต้องรวมไฟล์ที่ถูกอ่านกลับเข้าไปเสมอ (ROADMAP-PART2-3, SIXDOF-VEHICLE-DATA, T03-CURRICULA-RESEARCH และ IMPLEMENTATION-STATUS หลัง M-LAUNCH-072)
- หลักฐานดิบ (log, Word, archive) ไปเป็น Release asset หรือที่เก็บภายนอก ไม่อยู่ใน `docs/` (process lesson 15)
- ไม่ rewrite ประวัติ git เพื่อลดขนาด `.git` (ทำลาย SHA ที่ลิงก์ไว้)
- ทุก PR มีบรรทัด "docs touched or N/A" และบรรทัด CHANGELOG (process lesson 16; S18 §18.10)
- PR เอกสารล้วนใช้ช่อง records ของ I (ไม่เกิน 2 PR เปิด, S18 §18.6) และไม่ปนกับการเปลี่ยนชนิดอื่น

#### D6 คำยืนยัน

ภาคผนวกนี้และแผน v2.0 ทั้งฉบับ**ไม่ลบเอกสารใด** ไม่ย้ายไฟล์ใด และไม่แก้ไฟล์ใดใน repository ระหว่างการวางแผน การลงมือทั้งหมด (banner, ดัชนี, ทะเบียน, การย้าย) เกิดหลังเจ้าของอนุมัติเท่านั้น ผ่าน CO-8 และ R7.5 และทุกขั้นยังต้องรอการอนุญาตรายคลื่นตาม D-65

#### ผลการตรวจของสคริปต์

`gen_appendix.py`: 429 รายการใน App A, 100 แถวแพ็กเกจใน A.4, C1 = 15 รายการ, C2 = 16 รายการ, CR 89 รหัส, R2S 48 แถว — ปัญหา: **0**

