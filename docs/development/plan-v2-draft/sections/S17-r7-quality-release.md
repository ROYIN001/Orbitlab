## S17 R7 ต่อเนื่อง: การปล่อยรุ่นทุกประตู วิศวกรรมคุณภาพ CI ความทนทาน และเอกสาร

> **ขอบเขต:** R7 ไม่ใช่ระยะท้ายอีกต่อไป (PC:(c)4) R7.1 และ R7.2 รันที่ทุกประตู (ทุก GK และทุกประตูความสามารถ) ส่วน R7.3–R7.5 ทำต่อเนื่องในช่องว่างของเลนภายใต้เพดาน WIP ส่วนนี้เป็นบ้านของ 34 รายการใน 5 แพ็กเกจ (R7.1–R7.5) สิ่งที่อยู่ที่อื่นและส่วนนี้อ้างอย่างเดียว: เกณฑ์ G7 และ GK (S05 §05.4), นิยาม KPI (S04), เนื้อหาการตัดสินใจ D-n (S08), oracle `EO-*` และกฎหยุด (S07 §07.5), แคตตาล็อกสิ่งที่ไม่ทำ (S02 §02.13), เลน, I-train, checklist ของ PR และขั้นตอนพิสูจน์ (S18)
> **ประมาณการ (หยาบ, `packages.tsv`):** R7.1 32 agent-days/~11 PR · R7.2 14/~5 · R7.3 16/~5 · R7.4 10/~3 · R7.5 7.5/~4 รวม 79.5 agent-days, ~28 PR ทุกแพ็กเกจเป็น `execution_authorized: false` จนเจ้าของสั่งรายคลื่นหรือรายแพ็กเกจ (D-65)
> **as-of (ตรงกับ S00 §00.1):** ตรวจแบบอ่านอย่างเดียวถึง **2026-10-04 ~21:10Z** — main บน GitHub = `5f9aa2e` (#83 เอกสาร, merge 20:31:34Z); live = `09cc2f5` (#82; Pages 37230585947 สำเร็จ 20:29:40Z เผยแพร่ #80–#82 พร้อมกัน); ไม่มี PR เปิด; R3 ครบตามคำของเจ้าของ (2026-10-04) ส่วนนี้ไม่เขียนสถานะ main, live หรือ PR ซ้ำ การอ้างบรรทัดในโค้ดระบุ SHA ไว้ ณ จุดอ้าง ตารางตัวตนของรุ่น #71–#83 อยู่ใน S03 §03.1
> **ข้อเท็จจริงของ R7 บน `5f9aa2e`** (`gh api` อ่านอย่างเดียว): **tag 0 รายการ, Release 0 รายการ**; `package.json` 0.1.0; CHANGELOG ยังเขียน "Orbitlab has no tagged release yet"; ไม่มี `.github/workflows/release.yml` (workflow มี 6 ไฟล์: `ci`, `deploy`, `heavy`, `heavy-audit`, `audit-browser-acceptance`, `audit-case-exports`); `deploy.yml` เผยแพร่ main ทุก push ที่ผ่านด่าน และทุกวันด้วย cron `43 17 * * *` (refresh snapshot); CI attempt แรกของ #76 timeout ที่ journey `learner-profiles` แล้วเจ้าของเลือก re-run ทั้ง workflow หนึ่งครั้ง (CI 37190361868 attempt 3 ผ่าน) สถานะใน ledger ตรวจบน `da67341` ทุกรายการต้องตรวจซ้ำบน main ของ Day 0 ก่อนเริ่ม (กฎของ M-PLAN-017)
> **ประวัติการเผยแพร่:** Pages 37219398466 (`7662ead`) และ 37223857005 (`77d3c00`) ล้มที่ journey `learner-profiles` (timeout 120 s รอ `#loading.hidden` หลัง reload) แล้ว Pages 37230585947 (`09cc2f5`) ผ่านทุกด่านและเผยแพร่ #80–#82 (live = `09cc2f5`) ผลต่อส่วนนี้อยู่ที่ M-PLATFORM-061 (§17.1) และกฎ rollback ก่อน v1.0 (§17.2)

### 17.0 ภาพรวมและกฎร่วมของ R7

| แพ็กเกจ | เลน (เจ้าของ) | จังหวะ | รายการ | ชนิด PR หลัก | ส่งหลักฐานให้ |
|---|---|---|---|---|---|
| R7.1 | Q/T (journey เขียนโดยเลนเจ้าของ feature: O, L-UI, U/I, B) | ทุกประตู | M-PLAN-025, M-PLATFORM-051, 061, M-LEARNING-014, M-LAUNCH-071 (เลื่อน) | quality-improving (journey และการแก้ของ 061 ที่แตะเฉพาะเทสต์); bug-fix เฉพาะเมื่อสาเหตุของ 061 อยู่ในโค้ดแอป ทำโดยเลนเจ้าของ | GK (รวม journey ทั้งเส้นทางที่เคยเป็นเกณฑ์ G3), G5, G6, G7 |
| R7.2 | I/T/L/P (+H อนุมัติ tag) | ทุกประตู | M-PLAN-026, M-PLATFORM-047, M-LEARNING-067, 068, M-ORBIT-041 | feature (release), docs (retro, กฎ rollback), human (tag); PR revert ตามกฎ rollback ก่อน v1.0 เป็น bug-fix ของเลนที่ merge PR ต้นเหตุ | GK, G7, v1.0 |
| R7.3 | T (Q เขียนไฟล์เทสต์ล้วนตามตารางเลน S18) | ต่อเนื่อง | M-PLATFORM-045, 050, 053, 054, 056, 057, 058, 059, 060, M-PHYSICS-064 | quality-improving, identical-output (แยก i18n), docs (VER) | KPI-28, EQ-15, ED-GAME-1 |
| R7.4 | T (+I สำหรับ `index.html`, O สำหรับป้ายข้อมูล, L-UI สำหรับรายการแหล่งในแอป) | ต่อเนื่อง | M-PLATFORM-017, 027, 028, 030, M-ORBIT-040, 044, M-LEARNING-066 | quality-improving (รวม 030 ซึ่งแก้เทสต์ล้วน), feature (ป้าย, รายการแหล่ง), docs (`SECURITY.md`) | G7, KPI-29 |
| R7.5 | I (W ร่าง; P ตรวจเอกสารฟิสิกส์) | ต่อเนื่อง | M-PLATFORM-071, 069, 072, 068, M-ORBIT-030, M-BUILD-033, M-PLATFORM-062 | docs, bug-fix (รายการ X01 ในแอป) | G7 (รายการข้อจำกัด), KPI-31 |

**กฎร่วม** (เพิ่มเติมจาก S18):
1. ทุกการเปลี่ยนใน R7 เพิ่มการตรวจเท่านั้น ห้ามตัดเทสต์ ห้ามยืด timeout เป็นการแก้หลัก ห้าม retry แบบไม่รู้สาเหตุ (PLAN:§9.2 "สิ่งที่ไม่ควรทำ", S18 §18.15; S02 §02.13 ข้อ 25–27)
2. journey หรือ guard ใหม่ทุกตัวต้องพิสูจน์ด้วย sabotage run ว่าล้มเมื่อเงื่อนไขเป็นเท็จ และ pattern ต้อง anchor (process lesson 20) sabotage ไม่ถูก commit
3. ด่านราคาถูกไปก่อน: type, build, budget และ journey ส่งออกที่ได้รับผลกระทบ ก่อนชุดฟิสิกส์ราคาแพง (process lesson 21; PLAN:§9.2 ข้อ 1)
4. headless SwiftShader วาดได้ราว 1–2 fps จึงใช้วัดความลื่นไม่ได้ ใช้ตัวเลขที่ไม่ขึ้นกับฮาร์ดแวร์จาก `measure.mjs` เท่านั้น (process lesson 19; S04 §04.1)
5. หนึ่งผลหนึ่ง SHA หนึ่ง runtime; merged ≠ published ≠ live (process lessons 13–14; VER)
6. ทุก PR มีชนิดเดียว PR identical-output ใน R7 (เช่น PR2 ของ M-PLATFORM-056 ที่แยก i18n) ต้องมี oracle `EO-*` ที่ไม่ขยับ (S07 §07.5) ส่วน PR ที่แก้เฉพาะ type หรือ log ของเทสต์เป็น quality-improving และพิสูจน์ด้วย build หรือ assertion ที่เท่าเดิม **กฎการตั้งชนิด:** PR ที่แก้เฉพาะเทสต์ (ไฟล์ใต้ `tests/` รวม harness และ journey) เป็น quality-improving แม้จะแก้ guard ที่ผ่านทั้งที่ผิด (เช่น M-PLATFORM-030) ส่วน bug-fix ใช้เมื่อแก้โค้ดของแอป สคริปต์ หรือ workflow ที่ทำงานผิด
7. ข้อบกพร่องที่ R7 พบไม่ถูกแก้ใน PR ของ R7 ส่งเป็น bug-fix ให้เลนเจ้าของ พร้อมเทสต์ที่ล้มก่อนแก้ (D-63 ถ้าเป็น P0/P1 ด้านข้อมูลหรือผลที่ผิด)

**จัดลำดับในเลนเพื่อไม่ชนช่วงพีคของ T ใน K1–K2** (S05 §05.6) ไฟล์เทสต์ล้วนให้ Q เขียน (ตารางเลน S18) เพื่อแบ่งภาระ เป็นข้อเสนอที่ I ปรับได้ที่ GK ทุกครั้งตามกฎ WIP (เลนละ 1 PR ที่เปิด)

| คลื่น | Q (เทสต์ล้วน) | T (workflow, script, config) | I/W (เอกสาร, hotspot) | P | H |
|---|---|---|---|---|---|
| K0 (GCO) | — | — | — | — | อนุมัติ GCO ตามรายการ §17.6 |
| K1 | M-PLATFORM-030, 054; journey ข้ามระบบรุ่นแรก (M-PLAN-025) | เฉพาะ M-PLATFORM-061 กลุ่ม `learner-profiles`: ใช้ mark ของ #81 และ diagnostics ของ #82 เมื่อเกิดซ้ำ; ถ้าไม่เกิดซ้ำก่อน R1.6 PR1 วัดอัตรา ≥20 รอบ (S10 §10.14 ข้อ 3) งาน T อื่นของ R7 รอ (ช่วงพีค: R0.3r, R0.4, EQ-1, FX-4) | retro ของ GK1 (M-PLAN-026) | — | ชุด B: D-64, D-56, D-44 |
| K2 | M-PLATFORM-028, 058, 060; journey ของ M-PLATFORM-051 ชุดแรก; M-PLATFORM-017 หลัง FX-6 | แก้ VER (หลัง D-64); M-PLATFORM-057; M-PLATFORM-045 ขั้น ก–ค; M-PLATFORM-061 กลุ่มที่เหลือ | M-PLATFORM-071 แล้ว 069 + M-BUILD-033 | — | D-3/D-4 ภายใน GK2 |
| K3 | M-PHYSICS-064 ก่อนโมดูล diagnosis ของ ED-LES-2 (M-LAUNCH-063); M-ORBIT-044/M-LEARNING-066 PR1; M-PLATFORM-027 ขั้น 1 | M-PLATFORM-050 (หลัง CO-8); M-PLATFORM-053 เครื่องมือแรก; M-PLATFORM-045 ขั้น ง–ฉ; M-ORBIT-040 | M-PLATFORM-072 (P), 068, M-ORBIT-030 | comment ใน `propagate.ts` (นอกหน้าต่าง) | D-19/D-20 (ชุด C, GK3) |
| K4 | journey ข้ามระบบขยาย; M-LEARNING-014 PR1 | `release.yml` dry-run แล้ว v1.0; M-PLATFORM-056 (หลัง EQ-6), 059 (หลัง EQ-7) | release PR ของ v1.0; M-PLATFORM-027 ขั้น 2 ผ่าน I-train | tolerance six-DOF ข้าม engine (ก่อนวัด) | อนุมัติ tag v1.0; อนุมัติการย้าย packet (062) |
| K5–K6 | M-LEARNING-014 PR2; journey Docking/cockpit | M-ORBIT-041; เครื่องมือของ M-PLATFORM-053 ที่เหลือ | M-PLATFORM-062; banner ที่เหลือ | — | tag ตาม D-20 |

**สิ่งที่เจ้าของต้องตัดสินหรือทำสำหรับ R7** (เนื้อหาเต็มอยู่ S08; ถ้ายังไม่ตอบ งานที่ขึ้นกับเรื่องนั้นรอ ไม่มี agent ตัดสินแทน)

| เรื่อง | รหัส | งานที่รอ |
|---|---|---|
| ช่องทาง จังหวะ release, mirror และ DOI | D-19/D-20 (ชุด C, needed-by GK3) | `release.yml`, v1.0, M-LEARNING-067/068, M-ORBIT-041 |
| ใช้ผล heavy/fleet ซ้ำด้วย content hash | D-64 (ชุด B) | M-PLATFORM-045 ขั้น ฉ, ข้อ 3 ของการแก้ VER |
| เพิ่ม devDependency ทีละตัว | DEC:D-17 (ตัดสินแล้ว) | M-PLATFORM-053 ทุก PR ต้องมีเหตุผล |
| ชั้นเทสต์ DOM | D-18 (ชุด C) | M-PLATFORM-052 (S08) ถ้ารับ ลงใน R7.3 |
| ชั้นอุปกรณ์ที่เป็นประตู | D-56 (ชุด B) | แถวอุปกรณ์ของเมทริกซ์ R7.1 |
| เส้นทางเบาไม่ใช้ WebGL | D-66 (ชุด D, เลื่อน) | M-LAUNCH-071 |
| เงื่อนไขข้อมูล NRLMSIS 2.1 / Cosmos 1408 | D-10, D-15 | ส่วนเงื่อนไขของ M-ORBIT-044 |
| การกระทำของ H (ไม่ใช่ D ใหม่) | — | อนุมัติ tag, ผูก DOI, เลือก/สร้างบัญชี mirror, อนุมัติรายการย้าย packet, ยืนยันเกณฑ์อายุข้อมูล 3/14 วัน, เลือก re-run ทั้ง workflow เมื่อ flake ยังไม่รู้สาเหตุ, รับกฎ revert ภายในวันทำการเดียวกันก่อน v1.0 (§17.2) และเลือก revert หรือ forward-fix เมื่อกรณีไม่ชัด |

### 17.1 R7.1 ตรวจ journey ข้ามระบบบน candidate ทุกประตู และเมทริกซ์ถาวร (Q/T)

**ข้อความ v1.2 ที่คงไว้ (PLAN:R7.1):**
- learner migration/reset/export→Build→Launch→result→Orbit→Docking→cockpit ตาม scope ที่ส่งมอบ
- สถานะ old/new builds, offline service worker, import recovery, profile switching, async callbacks และ malformed files
- ตรวจ geometry/layout/wheel/keyboard ในทุกระดับและสามภาษา พร้อม readonly/snapshot provenance
- full relevant unit/browser/heavy/fleet/reference gates ตาม change map และ coverage manifest; ไม่รวมผลคนละ source แล้วเรียกทั้งชุดว่าผ่าน
- **เจ้าของ Q/T; feature owners triage เป็น defect domain ไม่แก้ทับกัน**
- **ตรวจรับ:** blockers เป็นศูนย์ใน supported scope; known limitations มี named cases; evidence execution/reference/human แยกชัด

#### R7.1 — journey ข้ามระบบ เมทริกซ์ถาวร journey ที่ขาด และสาเหตุของ flake
- **เลน:** Q/T; ผู้เขียน journey รายเส้นทางคือเลนเจ้าของ feature (O = Orbit, L-UI = บทเรียน/แบบทดสอบจัดระดับ, U/I = Launch Explore, B = Build) ผ่าน T สำหรับ `tests/browser/harness.mjs` **คลื่น:** journey ข้ามระบบรุ่นแรกใน K1 (ก่อน GK1) แล้วรันทุก GK; รายการอื่นกระจาย K1–K4 **ประมาณการ (หยาบ):** 32 agent-days, ~11 PR **OR:** OR-2, OR-6
- **ขึ้นกับ:** CO-5 (journey R2 + smoke slice), CO-3 PR1 (preset viewport ใน harness), M-BUILD-024 (journey Build ฝั่งจรวด, R0.4), FX-6 (สำหรับไฟล์เสีย) **ปลดล็อก:** ทุก GK (รวมทั้งเส้นทาง Build→Check→Launch→Result→Edit→Orbit บน candidate เดียวที่เคยเป็นเกณฑ์ G3, S12 §12.9), G5, G6, G7
- **ไฟล์ที่อนุญาต:** `tests/browser/journeys/*.mjs` (ไฟล์ใหม่ เช่น `r7-cross-system.mjs`), `tests/browser/harness.mjs` (T), `scripts/verification/create-plan.mjs` (เฉพาะ inventory/smoke, T), `docs/development/reports/R7.1-<GK>.md`; ไม่แก้โค้ดแอป ข้อบกพร่องที่พบส่งเป็น bug-fix ให้เลนเจ้าของ
- **ชนิดการเปลี่ยนต่อ PR:** journey 1 PR ต่อเส้นทาง (quality-improving); รายงานสาเหตุ flake (docs); การแก้ที่ได้จาก 061 ถ้าแตะเฉพาะ harness หรือ journey เป็น quality-improving (T/Q) ถ้าสาเหตุอยู่ในโค้ดแอปเป็น bug-fix ของเลนเจ้าของพร้อม test ที่ล้มก่อนแก้ (เช่น สาเหตุในเส้นทาง storage ส่งให้ R1.6 ขั้น a ตาม S10 §10.14 ข้อ 3)

| รหัส | ที่มาเดิม | P·ขนาด | สถานะ | เลน | เรื่องและเหตุผล | ไฟล์ | เกณฑ์รับ | วิธีพิสูจน์ | ขึ้นกับ |
|---|---|---|---|---|---|---|---|---|---|
| M-PLAN-025 | PLAN:R7.1, PC:(c)4 | P2·M | เปิด | Q | ทำ PLAN:R7.1 ให้เป็นงานถาวร: journey ข้ามระบบเส้นเดียวบน candidate ที่ตรึงของทุกประตู เพราะวันนี้แต่ละ journey ตรวจทีละโหมด และรอยต่อ (handoff, ไฟล์ส่งออก, โปรไฟล์หลัง reload) ไม่มีใครถือ | `tests/browser/journeys/r7-cross-system.mjs` (เสนอ) | ตามขั้นด้านล่าง ผ่านใน TH ที่ 390×844 และ RU ที่ 1280×800 (EN ครอบโดย journey ส่วนใหญ่ที่มีอยู่) บน dist ที่จะเผยแพร่จริง; ไม่มี `pageerror` หรือ unhandled rejection; ค่าที่ส่งต่อ (มวล, วงโคจร, provenance) เท่ากันทุกบิตข้ามขั้น; ขยายตาม scope: Docking ที่ G5, cockpit ที่ G6; **ขอบเขตที่รับจาก M-BUILD-001/005 (ส่งมอบแล้ว):** ขั้น “แบบ custom → Check → Launch → Result → แก้ (Show the setting / Apply to a new mission) → Orbit ที่ cursor พร้อมเชื้อเพลิงที่เหลือ” บน candidate เดียว (TH 390×844, RU 1280×800); Satellite Engineer save/open/send-to-Orbit; lesson lock และตำแหน่งกลับคงอยู่; เที่ยวที่บันทึกแล้วไม่ถูกแก้ ร่างเดิมปลอดภัย (EO-STO-2); ชื่อไฟล์ที่เสนอ `r3-g3-loop.mjs` รวมเข้า `r7-cross-system.mjs` (ขนาดคง P2·M; ประมาณใหม่ที่ GK1 ถ้างานโตเกิน) | sabotage 4 แบบต้องทำให้ล้ม: เติมเชื้อเพลิงตอน handoff, ทิ้งฟิลด์หนึ่งในไฟล์ backup, ส่ง request ออกนอกตอนออฟไลน์, ใช้ live head แทน cursor | CO-5, M-BUILD-024 |
| M-PLATFORM-051 | DP:S2-mobile-smoke, DP:ENG-K18/S10, OD:S10, RW:ORB-10, RW:LES-12, RW:TQ-02 (+2) | P2·L | บางส่วน | Q/T + เลนเจ้าของ | journey ที่ยังขาดคือเส้นทางที่ audit เคยพบข้อบกพร่อง ถ้าไม่มี journey ก็ถดถอยเงียบได้ บน `da67341` มี 21 journey (เป้า DP 12 ถึงแล้ว) และ #75/#77 เพิ่ม `r3-*` อีก 3 ไฟล์ (รวม 24 บน `7662ead`) | journey ใหม่ราว 6–8 ไฟล์ | ครบทุกเส้นทางในตารางด้านล่าง ทุกตัวใช้การกดจริง อยู่ใน inventory เต็มของ Pages และส่วนที่ระบุอยู่ใน smoke slice ของ PR CI ภายในงบเวลา KPI-28 | sabotage ต่อ journey ตามตาราง แล้วต้องล้ม; ใส่ผล sabotage ในรายงาน | CO-5; เส้นทางที่ R3.5 (#77) ครอบแล้วให้ตรวจซ้ำก่อนเขียน |
| M-PLATFORM-061 | OD:CI flakes, PLAN:§9.1 แถว WebGL/browser, PLAN:§9.2 ข้อ 7 | P2·M | เปิด (มี diagnostics #81/#82) | T (+Q) | สามกลุ่ม (ชื่อใน ledger ระบุแค่สองกลุ่มแรก แต่รายการนี้ครอบทั้งสาม): timeout ตอนกดส่งออก (Pages 36886828921, 37066834767), "Target crashed" (CI 37073349169) และ **การค้างของ journey `learner-profiles` หลัง reload** ยังไม่รู้สาเหตุ R1 พิสูจน์ได้แค่สาเหตุเรื่องการรอ navigation (`reports/R1-release-navigation.md`) flake ที่ไม่รู้สาเหตุทำให้ต้อง re-run ทั้ง workflow และทำให้คนไม่เชื่อสีแดง `learner-profiles` ล้มแล้วสามครั้ง: CI attempt แรกของ #76, Pages 37219398466 (`7662ead`) และ Pages 37223857005 (`77d3c00`) สองครั้งหลังทำให้ #80/#81 ไม่เผยแพร่จนถึง Pages 37230585947 (ดูหัวส่วน) **ความคืบหน้า (เครื่องมือเท่านั้น ยังไม่พบสาเหตุ สถานะจึงยังเปิด):** #81 (start-up marks: bootstrap/workspace/app/textures/ready) และ #82 (CPU ของ browser process, สถานะ GPU feature) อยู่ใน harness แล้ว; Pages 37230585947 ผ่าน (`learner-profiles` 326 s); การสืบสวนใน PROGRESS บน `5f9aa2e`: main thread รอสถานะ shader program ~11 s ระหว่าง SwiftShader compile, GPU process ~3.6 จาก 4 core เมื่อมี animation (scene loop หรือ CSS `lesson-glow`/`home-cue` แบบไม่สิ้นสุด) และ ~0.3 core เมื่อไม่มี; `compileAsync`/ปิดการตรวจเพียงย้ายจุดรอจึงไม่เก็บไว้; ไม่เกิดซ้ำในเครื่อง (Chromium 141 เทียบ Chrome for Testing 153 ใน CI); **สาเหตุยังไม่ทราบ**; ห้ามยืด timeout ห้าม retry แบบไม่ดูสาเหตุ; กลุ่ม export-click timeout และ “Target crashed” ยังไม่ถูกแตะ | `tests/browser/harness.mjs`, journey ที่เกี่ยว, `docs/development/reports/R7.1-flakes.md` | แต่ละกลุ่ม flake ทำซ้ำได้ หรือถูกติดป้าย hypothesis ตามกฎ R0.1; สาเหตุเขียนในรายงาน; การแก้ใช้การรอสถานะที่ resolve แล้วและติด listener ก่อน action ไม่มี retry และไม่ยืด timeout; ระหว่างที่ยังไม่รู้สาเหตุ การ re-run ทั้ง workflow ทำได้เฉพาะเมื่อเจ้าของเลือก และบันทึกชื่อ journey ใน PROGRESS กับ retro (M-PLAN-026) | อัตรา flake ก่อน/หลังจากการรัน journey เดียวซ้ำ ≥ 20 รอบบน runner แบบ CI (ต้องวัด); สำหรับ "Target crashed" เก็บเหตุจาก CDP และหน่วยความจำของ renderer | — (ทำก่อนเพิ่มภาระ journey ข้ามระบบ) กลุ่ม `learner-profiles` ทำก่อนกลุ่มอื่น: หาสาเหตุจาก mark ของ #81 และ diagnostics ของ #82 เมื่อเกิดซ้ำ (ถ้าไม่เกิดซ้ำ วัดอัตรา ≥ 20 รอบ) ก่อน R1.6 PR1 แตะเส้นทางนี้ และก่อนใช้ journey นี้เป็นหลักฐานของ G1+ (S10 §10.14 ข้อ 3) |
| M-LEARNING-014 | OD:T01/T02 limits (IS) | P3·L | เปิด | Q (+L, P ตรวจ) | ครูตรวจซ้ำได้แค่ record แบบ point-mass และเทียบได้แค่ Node กับ Chromium (≤ 1.4e-12 s) six-DOF กับบทเรียนกรณีศึกษายังไม่ถูกบินซ้ำ และยังไม่มี engine ที่ไม่ใช่ V8 | journey `recheck`, harness (เพิ่ม Firefox ของ Playwright ที่มีอยู่ ไม่ใช่ devDependency ใหม่), recheck worker (PR2) | PR1: ตารางเทียบข้าม engine (Node, Chromium, Firefox) ของ record point-mass และบทเรียนกรณีศึกษา ภายใต้ tolerance ของ T02 (EO-XENG-1: 1.4e-12 s, 1.4e-11 m/s) ห้ามคลาย PR2 (feature): recheck worker บิน record six-DOF ซ้ำได้ ภายใต้ tolerance ที่ P กำหนดจากการศึกษาเชิงตัวเลข**ก่อนวัด**และเจ้าของอนุมัติ; ถ้าเกิน แสดง "differs" พร้อมป้าย ไม่ขยาย tolerance | เลื่อนค่าที่คาดไว้ 2 เท่าของ tolerance บน branch ทิ้งแล้วต้องล้ม; ตาราง tolerance ตรึงใน VALIDATION ก่อนรัน | M-LEARNING-039 (เสร็จ), EO-XENG-1 |
| M-LAUNCH-071 | DP:12-27 | P3·L | บางส่วน (มีหน้าจอกู้คืนเมื่อไม่มี WebGL ใน `webgl-startup.mjs`; ส่วนที่เหลือเลื่อนจน D-66) | — | เส้นทางเบาไม่ใช้ WebGL สำหรับเครื่องในห้องแล็บที่ไม่มี GPU | — | เริ่มเมื่อ D-66 ตัดสินจากหลักฐานอุปกรณ์ของ HU-6/R0.4; ถ้ารับ ต้องเป็นเส้นทาง**เพิ่ม**ที่ใช้ได้ใน journey `--disable-gpu` ห้ามแทนเส้นทาง WebGL (S02 §02.13 ข้อ 11) | — | D-66 (ชุด D), HU-6 |

**journey ที่ขาด (M-PLATFORM-051)** เลนเจ้าของ feature เป็นผู้เขียน Q ตรวจ smoke ที่เสนอต้องวัดเวลาก่อน (KPI-28) และเส้นทางที่ #77 ครอบแล้ว (`r3-first-launch`, `r3-result-setting`) ให้ตรวจซ้ำก่อนเขียน

| เส้นทาง | ที่มา | เลนผู้เขียน | smoke ใน PR (เสนอ) | sabotage ที่ต้องทำให้ล้ม |
|---|---|---|---|---|
| continue-in-orbit จาก replay cursor | OD:S10, RW:S10 | O + I | ใช่ (ส่วนสั้น) | ใช้ live head แทน cursor หรือเติมเชื้อเพลิง |
| overflights เก่าเมื่อเปลี่ยนเมือง | OD:S10 | O | ไม่ | ไม่ล้างผลเดิมเมื่อเปลี่ยนเมือง |
| lifetime เก่าเมื่อเปลี่ยน input | OD:S10 | O | ไม่ | ไม่ล้างผลเดิม |
| เปิด config ของ Monte Carlo ซ้ำ | OD:S10 | U/I | ไม่ | config เดิมหายเมื่อเปิดซ้ำ |
| `guidanceOverrides` ในผลที่ส่งออก | OD:S10 | U (+P ตรวจ) | ไม่ | ทิ้ง override ตอนส่งออก |
| draft เมื่อสลับภาษา | OD:S10 | L-UI | ใช่ | draft หายหลังสลับภาษา |
| race ระหว่าง provider ออนไลน์/ออฟไลน์ | OD:S10 | O + T | ไม่ | สลับลำดับ callback ของ provider |
| Orbit playground, การจุดเครื่อง, คัดกรองชน | RW:ORB-10 | O | ใช่ (playground) | ผลการจุดเครื่องไม่อัปเดต |
| บทเรียน 1.1 ภาษาไทยที่ 390×844 ถึงแถบให้คะแนน | DP:S2-mobile-smoke, RW:LES-12 | L-UI | ใช่ | แถบให้คะแนนไม่แสดง |
| แบบทดสอบจัดระดับเต็มชุด | RW:LES-12 | L-UI | ไม่ | ข้ามคำถามหนึ่งข้อ |
| Launch Explore แบบกดจริง (`launch-explore.mjs` เลิกขับด้วย WebMCP) | RW:TQ-02 | U/I | ใช่ (มีอยู่แล้ว) | ปุ่ม Launch ไม่ทำงาน แต่การเรียกผ่าน WebMCP ยังผ่าน |

**ขั้นของ journey ข้ามระบบ (M-PLAN-025)** ใช้เฉพาะความสามารถที่ส่งมอบแล้ว ณ GK นั้น:
1. สร้างโปรไฟล์ใหม่จาก UI ของ R1.2 และเลือกภาษา
2. Build: เปิดแบบจาก Explore หรือ bench ตรวจ readiness แล้วกด "Fly it"
3. Launch Engineer: ปล่อยจรวด หยุดชั่วคราว (หลัง CO-4 ต้องยืนยันว่าเที่ยวบินไม่ถูกทำลาย = guard ของ LUI-01) เลือกเหตุการณ์จาก chooser และเลื่อน replay cursor
4. ผล: กด "Show the setting" (R3.5) แล้วกลับมา
5. Orbit: continue ที่ replay cursor โดยไม่เติมเชื้อเพลิง ค่าวงโคจรต้องเท่ากับ envelope ของ handoff ทุกบิต
6. บทเรียน: บทเรียน 1.1 ถึงแถบให้คะแนน หรือหน้า recheck ที่บินซ้ำแล้วได้ "match"
7. ส่งออก: CSV, worksheet DOCX และ backup ของโปรไฟล์ แต่ละไฟล์ต้องผ่าน validator แบบ strict แล้ว import backup เข้าโปรไฟล์ใหม่ storage record ต้องเท่าเดิม (ใช้วิธีของ EO-STO-2)
8. reload แบบออฟไลน์ภายใต้ service worker: โปรไฟล์และแบบยังอยู่ ไม่มี request ออกนอก (ใช้ assertion ของ M-PLATFORM-028) และไม่มี CSP violation เมื่อ M-PLATFORM-027 ขั้น 1 มีแล้ว

journey นี้เข้า inventory เต็มของ Pages ทุก run ต้องวัดเวลาที่เพิ่มให้ shard ถ้าเกินงบเวลา ให้ rebalance shard (M-PLATFORM-045) ห้ามตัด journey

**เมทริกซ์ถาวร (ทำให้รายการของ CO-3 เป็นงานประจำ, M-LAUNCH-019 อยู่ที่ S06):** ที่ทุก GK รัน viewport × ภาษา ตาม S04 §04.4 บน candidate โดยใช้ preset ของ harness จาก CO-3 PR1 ภาพเก็บเป็น CI artifact ไม่ commit ใต้ `docs/` (repo hygiene) เจ้าของตรวจเฉพาะภาพของคลื่นที่เปลี่ยนภาพ (S18 §18.13) เมทริกซ์ input และสถานะตาม PLAN:§10.1 (wheel/trackpad/touch/keyboard; setup/live/paused/replay/completed/analysis; overlay; ออฟไลน์, storage ถูกปฏิเสธ, quota, แท็บเก่า, service worker เก่าที่รออยู่) ต้องมี journey ครบทุกช่อง ช่องที่ขาดเพิ่มผ่าน M-PLATFORM-051 รายงานอุปกรณ์จริงแบบ manual ที่ลงวันที่จาก HU-6 (S16) แนบกับแถว GK ทุกแถว ชุดแถวที่เป็นประตูตัดสินด้วย D-56 แถวอุปกรณ์บันทึกด้วยว่ามี Web Locks และ sessionStorage หรือไม่ เพื่อใช้เป็นข้อมูลของ B10 (M-PLATFORM-011, เลื่อน, S08)

**ลำดับงานที่ทุกประตู:**
1. ตรึง candidate SHA หลักฐานทุกชิ้นอ้าง SHA นี้ (VER)
2. รัน PR CI และ inventory เต็มของ Pages รวม journey ข้ามระบบ
3. ถ้าคลื่นแตะฟิสิกส์ ข้อมูล recorder หรือ worker: รัน heavy + fleet (KPI-22) ผลแดงเปิด issue สำหรับ bisect ห้าม re-record
4. ถ้าคลื่นมี schema bump: ซ้อม revert บน candidate ตามกฎ rollback ก่อน v1.0 ข้อ 4 (§17.2)
5. รันเมทริกซ์ viewport × ภาษา และแนบรายงาน HU-6
6. เลนเจ้าของ triage ข้อบกพร่องเป็นรายโดเมน ไม่แก้ทับกัน blocker ใน scope ที่รองรับต้องเป็นศูนย์ ข้อจำกัดที่รู้แล้วต้องมีชื่อกรณี
7. เขียน `R7.1-<GK>.md` แยกหลักฐาน execution, scientific และ human

- **KPI ที่รายงาน:** KPI-15 (ผ่าน journey บังคับ context loss ของ FX-8 ที่อยู่ใน inventory), KPI-21, KPI-22, KPI-26/27 (ผ่านด่านของ R2.5), KPI-32 (รายงานอุปกรณ์)
- **quality guard (OR-2):** เพิ่มความครอบคลุมเท่านั้น; ไม่เปลี่ยนพฤติกรรมแอป; tolerance ข้าม engine ไม่คลาย
- **หลักฐานที่ต้องส่ง:** `R7.1-<GK>.md` (SHA, run id, รายการ journey ที่รันจริง, ผล sabotage, ตารางเมทริกซ์, ลิงก์รายงาน HU-6); แถว PROGRESS
- **execution_authorized:** false

### 17.2 R7.2 PR/merge/release, release ติด tag, rollback และ retrospective ทุกประตู (I/T/L/P)

**ข้อความ v1.2 ที่คงไว้ (PLAN:R7.2):**
- PR เล็กตาม unit ownership/dependencies พร้อม before/after, exact CI และ scientific effect; queue integration changes บน base ปัจจุบัน
- freeze source ก่อน long acceptance; เปลี่ยน source/base/model ที่กระทบหลักฐานแล้วต้อง rerun เฉพาะ affected evidence ไม่ใช้ผลเก่าข้ามอย่างเงียบ
- final release artifact เป็นสิ่งที่ full browser ตรวจจริงพร้อม refreshed snapshot hashes; deploy หลัง gates และ main-tip guard
- ยืนยัน deployed SHA จาก deployment record แยก merged SHA; UI About/build info ช่วยผู้ใช้ตรวจรุ่นและ service worker activation
- migration rollback แยกจาก code rollback; schema ใหม่ที่ app เก่าอ่านไม่ได้ต้องมี export/recovery/read-only compatibility ไม่แก้ด้วย deploy source เก่าอย่างเดียว
- retrospective เทียบ failure categories, queue/run durations, repeated checks และ escaped defects เพื่อแก้ change map ไม่ลด gates แค่เพื่อทำตัวเลขเวลาให้สวย
- **เจ้าของ I/T/L/P ตาม rollback responsibility**
- **ตรวจรับ:** release evidence link ครบ, app/version/storage state สอดคล้อง, ไม่รายงาน "เผยแพร่แล้ว" เมื่อมีเพียง merge และวิธีคืนสภาพผ่านกรณีที่รองรับ

#### R7.2 — retrospective ทุกประตู, release ติด tag สองช่อง, mirror, กฎ rollback และชุดอัปเดตข้อมูลออฟไลน์
- **เลน:** I (retro, CHANGELOG, release PR) + T (`release.yml`, ชุด USB) + L (กฎข้อมูลของ rollback) + P (หลักฐานฟิสิกส์ของ rollback); H อนุมัติ tag และผูก DOI **คลื่น:** retro ตั้งแต่ GCO; กฎ rollback ก่อน v1.0 มีผลเมื่อเจ้าของอนุญาต R7.2 (D-65); `release.yml` หลัง D-19/D-20 (needed-by GK3); **v1.0 ที่ GK แรกหลัง D-19/D-20 ได้คำตอบ; เป้าคือ GK4 (≈ 2027-02-12)** ส่วนกรณีช้าดู S05 §05.9 **ประมาณการ (หยาบ):** 14 agent-days, ~5 PR **OR:** OR-2, OR-4, OR-6
- **ขึ้นกับ:** D-19/D-20 (S08), CO-2 (CHANGELOG ครบ), FX-7 (M-PLATFORM-022 แยกเวอร์ชันข้อมูลออกจากเวอร์ชันแอป), M-ORBIT-040 (สำหรับชุด USB), ED-INST-1 (M-LEARNING-045 คู่มือ intranet ชี้ไปที่ release) **ปลดล็อก:** v1.0, ED-INST-2 (pilot หลัง v1.0), G7
- **ไฟล์ที่อนุญาต:** `.github/workflows/release.yml` (ใหม่, T), `scripts/refresh-snapshots.ts` (ตัวเลือก `--dist`) และ `scripts/restamp-data.mjs` (เสนอ, T), `package.json` เฉพาะ `version` และ `CHANGELOG.md` (I, ใน release PR), `docs/development/RELEASE.md` (กฎ rollback + ช่องทาง, เสนอ), `docs/development/reports/retro-<GK>.md`, `docs/development/reports/revert-drill-<GK>.md`
- **ชนิดการเปลี่ยนต่อ PR:** retro = docs ทุก GK; PR1 feature (`release.yml` + dry-run); PR2 docs (`RELEASE.md`); PR3 feature (ชุด USB); release PR ต่อ tag = docs (version + หมวด CHANGELOG); tag = human (H); PR revert ตามกฎ rollback ก่อน v1.0 = bug-fix ของเลนที่ merge PR ต้นเหตุ (ผ่าน I-train ถ้าแตะไฟล์ hotspot) ไม่ใช่ PR ของ R7.2

| รหัส | ที่มาเดิม | P·ขนาด | สถานะ | เลน | เรื่องและเหตุผล | ไฟล์ | เกณฑ์รับ | วิธีพิสูจน์ | ขึ้นกับ |
|---|---|---|---|---|---|---|---|---|---|
| M-PLAN-026 | PLAN:R7.2, PLAN:U13, PLAN:§11.3, PC:(c)4 | P2·XS | เปิด | I/T (+H) | ทำ PLAN:R7.2 ให้เป็นงานถาวร และเป็นบ้านถาวรของ PLAN:U13 ("ตรวจ workflow งานยาก งานช้า และงานซ้ำเพื่อปรับกระบวนการ" ซึ่ง v1.2 ผูกไว้กับ R0.3, R1.5 และ R7.2): retrospective และประมาณการใหม่ทุก GK จากจำนวน PR ที่ส่งจริง ความเร็วของ R1–R3 มาจาก PR ใหญ่เกิน (#74, #75) จึงใช้เป็นฐานไม่ได้ | `reports/retro-<GK>.md`, แถว PROGRESS | ทุก GK มี: ส่วน PLAN:U13 ที่ระบุงานยาก (rework และ conflict ของ hotspot, KPI-34), งานช้า (lead time, KPI-33; เวลาเครื่องด้านล่าง) และงานซ้ำ (re-run, check ที่รันซ้ำ, การตรวจด้วยมือที่ทำซ้ำ) พร้อมการแก้กระบวนการที่เสนอ; PR ที่ส่งต่อแพ็กเกจเทียบ `packages.tsv`; KPI-33 (lead time), KPI-34 (conflict/rework ของไฟล์ hotspot), KPI-35 (latency ของการตัดสินใจเทียบ needed-by); เวลา CI/Pages/heavy/fleet เป็น median/p90 (≥ 3–5 run ที่เทียบกันได้, VER); การ re-run และกลุ่ม flake (061); defect ที่หลุดพร้อมด่านที่ควรจับ → แก้แผนที่ R0.3r; revert และ forward-fix ของคลื่นพร้อมเวลาตั้งแต่พบบน live จนแก้ (กฎ rollback ก่อน v1.0); handoff ค้าง; ผลการตรวจ follow-through (S08 §08.6) ผลลัพธ์: แผนใหม่ตาม S05 §05.11 และปรับเพดาน WIP (S18 §18.6) ห้ามลด gate เพื่อให้ตัวเลขเวลาดีขึ้น | audit: ทุกตัวเลขมี run id หรือ PR id; H อนุมัติแผนใหม่ก่อนคลื่นถัดไป (D-65) | ทุก GK |
| M-PLATFORM-047 | DP:ENG-K20/CTX-I-3M-1, DP:CTX-QW-2, DP:CTX-I-12M-3, DP:D-19, DP:12-03, DP:13-10 (+1) | P2·M | เปิด | T/I | ยังไม่มี tag, Release, `release.yml` สถาบันจึงติดตั้งรุ่นที่มีเลขกำกับไม่ได้ (เสร็จแล้ว: `build-info.json` + SHA256SUMS ใน dist และ main-tip guard) | `release.yml`, `RELEASE.md` | ตามขั้นของ `release.yml` (1)–(7) ด้านล่าง; กฎ rollback ข้อ 1–4 และกฎ rollback ก่อน v1.0 ถูกเขียนใน `RELEASE.md`; v1.0 ที่ GK แรกหลัง D-19/D-20 ได้คำตอบ; เป้าคือ GK4 | dry-run ผ่าน `workflow_dispatch` ที่ทำ zip เป็น Actions artifact โดยไม่สร้าง Release; sabotage: tag บน SHA ที่ยังไม่เผยแพร่ต้องล้ม; ไบต์ zip เว็บเท่ากับ `pages-dist` | D-19/D-20, CO-2 |
| M-LEARNING-067 | DP:CTX-I-3M-1, DP:8-15, DP:D-20, DP:section-1.4, DP:7.5-P1, RW:INF-08 | P2·M | บางส่วน | I (+H) | รุ่น 1.0 สำหรับสถาบัน: เลขเวอร์ชันแบบ semver, Release พร้อม zip + SHA256SUMS + build-info, CHANGELOG ครบ, DOI ถ้าเลือก (เสร็จแล้ว: build stamp ใน About #45/#67, CHANGELOG #44) | `package.json`, `CHANGELOG.md`, `README.md` (ส่วน "Install offline") | release PR เปลี่ยน `version` เป็น 1.0.0 และเปลี่ยนหัว "Unreleased" เป็นหมวดของรุ่นพร้อมวันที่; README ชี้ไปที่ Release ล่าสุด; รายการข้อจำกัดที่คนอ่านเข้าใจได้ (จาก IS ที่ผ่าน R7.5 แล้ว) แนบใน Release; ตัวชี้วัด DP:8-15 (tag ≥ 1) เป็นจริง; DOI ผ่าน Zenodo เป็นขั้นของ H ถ้า D-19/D-20 เลือก | ตรวจ Release: ไฟล์ครบ, SHA256SUMS ตรงกับไฟล์, build stamp ใน About ตรงกับ SHA ของ tag | M-PLATFORM-047 |
| M-LEARNING-068 | DP:CTX-I-12M-3 | P3·S | บางส่วน | T/L | mirror ที่สองและกฎ rollback ที่เขียนไว้สำหรับสถาบัน (PLAN:§10.3 มีกฎแยกโค้ด/ข้อมูลแล้ว ยังไม่มี mirror) | `RELEASE.md` | ปลายทางของ mirror ตามที่ D-19/D-20 เลือก ต้องเป็น static host ที่เสิร์ฟ dist ได้ตามคู่มือ intranet ไม่มี analytics หรือ cookie (S02 §02.13 ข้อ 23); อัปเดต mirror ที่ทุก tag; ทดสอบ mirror ด้วย journey `pwa-offline` ชี้ไปที่ URL ของ mirror หนึ่งครั้งต่อ tag; กฎ rollback ด้านล่าง | rollback rehearsal (ด้านล่าง) ผ่าน | M-PLATFORM-047 |
| M-ORBIT-041 | DP:CTX-I-3M-2, DP:section-1.4 (USB kit) | P3·M | เปิด | T | โรงเรียนที่ไม่มีอินเทอร์เน็ตต้องอัปเดตข้อมูลดาวเทียมและอวกาศได้โดยไม่เปลี่ยนโค้ด | `scripts/refresh-snapshots.ts`, สคริปต์ restamp, คำอธิบาย TH/EN | `npm run snapshots -- --dist <path>` เขียน snapshot 3 ไฟล์ที่ผ่าน reader ทั้ง 4 ตัวแล้ว (แบบเดียวกับ `snapshot-check` ของ Pages), restamp `revision` ใน precache ของ `sw.js`, สร้าง SHA256SUMS และ build-info ใหม่; journey แสดงวันที่ข้อมูลใหม่แบบออฟไลน์; เปลี่ยนเฉพาะเวอร์ชันข้อมูล จึงไม่ขึ้นข้อความ "รุ่นใหม่ของแอป" (KPI-29, FX-7) | หลัง restamp ตรวจแบบ EO-PWA-1: revision ของทุก entry เท่ากับ SHA-256 ของไบต์; sabotage: แก้ข้อมูลโดยไม่ restamp แล้ว journey ต้องล้ม | M-ORBIT-040, M-PLATFORM-047, FX-7 (M-PLATFORM-022) |

**ขั้นของ `release.yml` (M-PLATFORM-047)** ทำงานเมื่อ push tag `v*` ที่ H อนุมัติ:
1. ตรวจว่า SHA ของ tag เป็น SHA ที่ Pages เผยแพร่แล้ว (มี deployment record) มิฉะนั้นล้ม
2. zip ของเว็บใช้ไบต์ของ artifact `pages-dist` จาก Pages run นั้น และตรวจกับ SHA-256 ของ manifest ใน union ห้าม build ใหม่ เพราะ snapshot ที่ refresh ทำให้ไบต์ต่างจากที่ผ่านด่านแล้ว ต้องติด tag ภายในอายุ artifact ของ repo (ต้องตรวจค่า; ค่าเริ่มของ GitHub คือ 90 วัน)
3. zip ของ intranet คือ build ที่ตั้ง `ORBITLAB_PRECACHE_AUDIO=1` (DEC:D-7) จาก source เดียวกันและ**ไฟล์ snapshot ชุดเดียวกัน**กับ Pages run นั้น แล้วรันด่านครบชุดเหมือน deploy (unit + browser เต็ม + `pwa-offline`) บน dist นั้น ไม่ข้ามด่านใดเพราะเป็น tag ขนาด precache ที่รวมเสียงรายงานเป็น trend (S04 §04.3)
4. ตรวจด้วย diff ของไฟล์ใน zip และวิธีของ EO-BUN-1 ว่า zip ทั้งสองต่างกันเฉพาะส่วนที่ธง `ORBITLAB_PRECACHE_AUDIO` ควบคุม (precache manifest ของ service worker และ build-info) ถ้าต่างมากกว่านั้น release ล้ม
5. แนบ SHA256SUMS ของทั้งสอง zip, `build-info.json` และหมวด CHANGELOG ของรุ่น
6. อัปโหลดจาก GitHub Actions ด้วย `GITHUB_TOKEN` (`contents: write` เฉพาะ job นี้) เท่านั้น เพราะการอัปโหลดจาก session ของ agent เคยได้ HTTP 403/400 (PROG)
7. ช่อง preview = Pages จาก main (เหมือนวันนี้) ช่อง stable = Release ที่ติด tag + mirror ตามที่ D-19/D-20 เลือก

**นโยบายเวอร์ชัน:** `package.json` เปลี่ยนเลขเฉพาะใน release PR (docs) ก่อนติด tag ข้อเสนอที่รอ D-20 (S08): minor ทุก GK หลัง v1.0 และ patch สำหรับ hotfix ที่ผ่านด่านเต็มบน main เลขรุ่นต้องอ่านได้ใน About ผ่าน `build-info.json`

**กฎ rollback ที่ต้องเขียนใน `RELEASE.md`** (แยกโค้ด/ข้อมูล/หลักฐานฟิสิกส์ ตาม PLAN:§10.3):
1. **โค้ด:** revert บน main → ผ่านด่านปกติ → Pages เผยแพร่ tip ใหม่ (guard ไม่ยอมเผยแพร่ SHA เก่าโดยตรง) หลัง v1.0 สถาบันย้อนรุ่นโดยติดตั้ง zip ของ tag ก่อนหน้า ก่อน v1.0 ใช้กฎ rollback ก่อน v1.0 ด้านล่าง
2. **data snapshot:** ย้อนเฉพาะไฟล์ข้อมูลด้วยชุดของ M-ORBIT-041 โดยเวอร์ชันแอปไม่เปลี่ยน
3. **storage/schema:** record ที่ใหม่กว่าแอปต้องอ่านได้แบบ read-only หรือถูก quarantine ห้ามเขียนทับ (กฎ newer-record ของ R1.1) รุ่นที่ bump schema (รูปแบบที่เก็บของ R1.6, telemetry-layout ของ R2.3s2, field ใหม่ของ R3.1r ใน record/handoff, attempt ของ FX-2, CraftState ของ R5) ต้องผ่าน **rollback rehearsal** ก่อนติด tag (หลัง v1.0) หรือการซ้อม revert บน candidate ที่ GK (ก่อน v1.0, ข้อ 4 ของกฎด้านล่าง): ติดตั้ง vN+1 แล้วสร้างข้อมูล → ติดตั้ง vN แล้วต้องเห็นข้อความ read-only และข้อมูลครบ → กลับไป vN+1 แล้วข้อมูลต้องเท่าเดิมทุกไบต์ ถ้าแอปเก่าอ่านไม่ได้เลย ต้องมีทาง export/recovery ก่อนเปิดรุ่น
4. **หลักฐานฟิสิกส์:** ย้อนการเปลี่ยนความสมจริงด้วยการ revert ทั้ง PR เท่านั้น ห้ามแก้ golden ด้วยมือ รายงานอ้างอิงต้องแสดง provenance ทางประวัติ

**กฎ rollback ก่อน v1.0 (ช่องที่ live = Pages รายวันจาก main)** มีผลเมื่อเจ้าของอนุญาต R7.2 (D-65) ใช้จนถึง v1.0 และหลังจากนั้นยังใช้กับช่อง preview กฎนี้อยู่ในแผนตั้งแต่ CO-8 และคัดลอกลง `RELEASE.md` ใน PR2:
1. **ช่องที่ live มีช่องเดียว:** Pages เผยแพร่ main ทุก push ที่ผ่านด่าน และทุกวันด้วย cron `43 17 * * *` ยังไม่มี tag หรือ zip ให้ติดตั้งย้อน การย้อนรุ่นจึงมีทางเดียว คือ revert บน main ตามกฎ rollback ข้อ 1 ผู้ใช้ได้รุ่นที่แก้แล้วผ่านข้อความอัปเดตของ service worker (FX-7)
2. **กฎถาวร: revert ภายในวันทำการเดียวกัน** regression ที่พบบนรุ่นที่ live (ทำซ้ำได้บน SHA ที่ live ตามกฎ R0.1) ต้องถูก revert ที่ PR ต้นเหตุภายในวันทำการเดียวกัน
   - PR revert เป็น bug-fix ที่ย้อน diff ของ PR ต้นเหตุพอดีและไม่มีการแก้อื่นปน หลักฐานคือ reproducer บน SHA ที่ live กับ diff ที่ผกผันพอดี ส่วน test ที่ล้มก่อนแก้ไปอยู่ใน PR ที่นำงานกลับมา
   - ผ่านด่านปกติ (PR CI median ราว 16.7 นาที แล้ว Pages 18–22 นาที) จึงทันภายในวัน ห้ามข้ามด่าน และห้ามเผยแพร่ SHA เก่าโดยตรง (main-tip guard) ถ้า Pages ล้มด้วยเหตุอื่น (เช่น `learner-profiles` ในหัวส่วน: #80 merge แล้วแต่ไม่เผยแพร่จนกว่า Pages 37230585947 (หลัง #81/#82 diagnostics)) live จะยังเป็นรุ่นที่มีปัญหา I แจ้ง H ในวันนั้น และ H เลือกทางตามแนวของ S06 CO-1 ขั้น 4
   - เลนที่ merge PR ต้นเหตุเป็นผู้เตรียม (ผ่าน I-train ถ้าแตะไฟล์ hotspot) และ I แจ้ง H ในวันเดียวกัน การ revert ตามกฎนี้นับว่าได้รับอนุญาตเมื่อเจ้าของอนุญาต R7.2 แล้วเท่านั้น ถ้ายังไม่ได้ ให้ขอ H ในวันนั้น
   - **ข้อยกเว้น: ถ้า revert จะทำให้ข้อมูลที่เก็บแล้วกลายเป็นข้อมูลกำพร้า ให้ forward-fix แทน** ข้อมูลกำพร้าคือข้อมูลที่รุ่นต้นเหตุเขียน แล้วรุ่นหลัง revert อ่านไม่ได้ ทิ้งฟิลด์เมื่อบันทึกซ้ำ หรือเขียนทับ forward-fix เป็น bug-fix พร้อม test ที่ล้มก่อนแก้ จัดลำดับแบบ P0/P1 ตาม D-63 และบันทึกเหตุผลที่ไม่ revert ในแถว PROGRESS ตัวอย่างที่มีอยู่แล้ว: เอกสาร mission ที่มี `design` ของ #80 (live ตั้งแต่ Pages 37230585947) ถูกรุ่นก่อน #80 ทิ้ง `design` เมื่อบันทึกซ้ำ (S10 §10.3.1) ตัว mission ไม่เสีย แต่ป้ายแบบหาย
3. **schema bump: ตัวอ่าน version N+1 ออกก่อนตัวเขียนหนึ่งรุ่น** (S10 §10.1 ข้อ 9) ใช้กับ R1.6 (รูปแบบที่เก็บที่เปลี่ยน, S10), R2.3s2 (`orbitlab.telemetryLayout` v2: PR2a ตัวอ่าน → รุ่นที่เผยแพร่ → PR2b ตัวเขียน, S11 §11.4) และ field ใหม่ของ R3.1r (S12 §12.3; envelope v2 ตัดออกแล้ว ถ้าภายหลังต้องมี v2 ใช้กติกาเดียวกัน) รวมทั้ง FX-2 (M-LEARNING-027 ขั้น 2a/2b) และ CraftState ของ R5 ก่อน v1.0 "รุ่น" คือ Pages ที่เผยแพร่จาก exact source พร้อม deployment record (merge อย่างเดียวไม่นับ) หลัง v1.0 คือ tag กฎนี้ทำให้ข้อ 2 ใช้ได้กับตัวเขียน: revert ตัวเขียนแล้ว รุ่นก่อนหน้ายังอ่านข้อมูล N+1 ได้ จึงไม่มีข้อมูลกำพร้า
4. **ซ้อม revert บน candidate สำหรับทุก schema bump (รายการตรวจ GK):** Pages เผยแพร่ทุก merge ตัวเขียนจึง live ก่อนถึง GK PR ตัวเขียนจึงต้องแนบผลซ้อมบน build ของ PR ก่อน merge และที่ GK ของคลื่นนั้นต้องซ้อมซ้ำบน candidate ที่ตรึง โดยใช้ `dist` ของ candidate และของ SHA ที่เผยแพร่ก่อนหน้า ขั้นแรกติดตั้ง candidate แล้วสร้างข้อมูล N+1 ขั้นที่สองติดตั้งรุ่นก่อนหน้า ข้อมูลต้องอ่านได้หรือเปิดแบบอ่านอย่างเดียว ไม่ถูกเขียนทับ และคงฟิลด์ที่ไม่รู้จัก ขั้นสุดท้ายกลับไป candidate ค่าที่เก็บต้องเท่าเดิมทุกไบต์ (วิธีของ EO-STO-2) L ทำส่วน storage, S ตรวจ schema และ P ยืนยันเมื่อเกี่ยวกับหลักฐานฟิสิกส์ ผลอยู่ใน `revert-drill-<GK>.md` และ `R7.1-<GK>.md` ถ้าซ้อมไม่ผ่าน ใช้ข้อ 2 (revert ตัวเขียน หรือ forward-fix ถ้า revert ทำให้ข้อมูลกำพร้า) และเจ้าของตัดสินก่อนอนุมัติ GK รายการตรวจ GK อยู่ใน S05 §05.4 เท่านั้น ข้อนี้คือสิ่งที่ R7.2 ส่งเข้ารายการนั้น
5. **ช่องใน envelope:** PR ที่เปลี่ยนรูปแบบที่เก็บหรือส่งต่อ ต้องกรอกช่องเรื่อง schema และ rollback ของ envelope v2 (S18 §18.11) ได้แก่ ที่เก็บหรือ key, version N → N+1, บทบาท (ตัวอ่านหรือตัวเขียน), SHA และ Pages run ของรุ่นตัวอ่านที่เผยแพร่แล้ว (เฉพาะ PR ตัวเขียน), ผลซ้อม revert และคำตอบว่า revert จะทำให้ข้อมูลกำพร้าหรือไม่ (ถ้าใช่ ทางย้อนมีเพียง forward-fix) I ตรวจช่องนี้ก่อน merge

**การติด tag:** v1.0 ที่ GK แรกหลัง D-19/D-20 ได้คำตอบ; เป้าคือ GK4 (D-19/D-20 needed-by GK3) หลังจากนั้นติด tag ตามจังหวะที่ D-20 เลือก (ข้อเสนอใน S08: ทุก GK หลัง v1.0) จนกว่าจะมี D-19/D-20 งานที่ทำได้คือ dry-run ซึ่งสร้าง zip เป็น Actions artifact เพื่อให้คู่มือ intranet (ED-INST-1) ทดสอบได้ ไม่สร้าง Release และไม่ติด tag

**ลำดับขั้นของ R7.2:**
1. ทุก GK ตั้งแต่ GCO: retro + ประมาณการใหม่ (M-PLAN-026) เป็นแถว PROGRESS และ `retro-<GK>.md`; ตั้งแต่เจ้าของอนุญาต R7.2 กฎ rollback ก่อน v1.0 มีผล และทุก GK ของคลื่นที่มี schema bump ต้องมี `revert-drill-<GK>.md`
2. หลัง D-19/D-20: PR1 `release.yml` พร้อม dry-run ผ่าน `workflow_dispatch` (ไม่สร้าง Release)
3. PR2 `RELEASE.md`: ช่องทาง, นโยบายเวอร์ชัน, กฎ rollback 1–4, กฎ rollback ก่อน v1.0 (ใช้ต่อกับช่อง preview), ขั้นตอน mirror
4. rollback rehearsal บน candidate ของ v1.0 (L ทำ storage, P ยืนยันหลักฐานฟิสิกส์)
5. release PR (version + หมวด CHANGELOG + README "Install offline") → H อนุมัติ → tag → Release → sync mirror
6. หลัง v1.0: PR3 ชุด USB (M-ORBIT-041) ทันทีที่ M-ORBIT-040 และ FX-7 merge
- **KPI ที่รายงาน:** KPI-29 (ข้อความอัปเดตต่อรุ่นโค้ด, ชุด USB ไม่ทำให้ขึ้น), KPI-31, KPI-33, KPI-34, KPI-35
- **quality guard (OR-2):** artifact ที่แจกต้องเป็นไบต์ที่ผ่านด่านจริง; ไม่มีด่านใดถูกข้ามเพราะเป็น tag หรือเพราะเป็น revert; rollback ไม่ทำให้ข้อมูลโปรไฟล์ที่ใหม่กว่าอ่านไม่ได้หรือหายเงียบ; ก่อน v1.0 regression บน live ถูก revert ภายในวันทำการเดียวกัน หรือ forward-fix เมื่อ revert จะทำให้ข้อมูลกำพร้า
- **หลักฐานที่ต้องส่ง:** `retro-<GK>.md` ทุก GK; `revert-drill-<GK>.md` ทุก GK ที่มี schema bump; รายงานของ dry-run และ rehearsal; URL ของ Release พร้อม digest ของ SHA256SUMS; แถว PROGRESS
- **execution_authorized:** false

### 17.3 R7.3 CI และโครงสร้างการทดสอบ (T)

#### R7.3 — feedback ของ PR เร็วขึ้นโดยความครอบคลุมเท่าเดิม, guard ของสถาปัตยกรรม และเครื่องมือทีละตัว
- **เลน:** T (Q เขียนไฟล์เทสต์ล้วน; P ตรวจเทสต์ฟิสิกส์; I รับ hook ของ i18n ผ่าน I-train) **คลื่น:** ต่อเนื่อง K1–K6 ตามลำดับด้านล่าง **ประมาณการ (หยาบ):** 16 agent-days, ~5 PR (รายการ XS หลายตัวรวมเป็น PR ละหนึ่งชนิด) **OR:** OR-1, OR-2, OR-6
- **ขึ้นกับ:** R0.3r (แผนที่ change-to-check), R0.4 (perf gate), D-64, D-17, CO-8 (tracker) **ปลดล็อก:** EQ-15 (fold: M-PLATFORM-054 ต้อง land ก่อนหน้าต่าง), ED-GAME-1, KPI-28
- **ไฟล์ที่อนุญาต:** `.github/workflows/*.yml`, `scripts/verification/*`, `tsconfig*.json`, `tests/architecture.test.ts`, `tests/module-size.test.ts` (ใหม่), `tests/rigid-recovery.test.ts` (เฉพาะ log), `tests/mcp.test.ts`, `src/mcp.ts` (เฉพาะชนิด), `src/i18n/*` (ผ่าน I-train), `.github/dependabot.yml`, `package.json` (devDependency ทีละตัว), `docs/development/VERIFICATION.md`
- **fold:** M-PLATFORM-054 อยู่ใน R7.3 และต้อง land ก่อน EQ-15 เพื่อตรึงขนาดโมดูลและรายการ guard ที่หน้าต่าง refactor ต้องรักษา (`folds.tsv`)
- **ชนิดการเปลี่ยนต่อ PR:** quality-improving สำหรับเทสต์ guard, workflow และความสะอาดของเทสต์/ชนิด (045, 050, 053, 054, 057, 058, 059, 060, 064, PR1 ของ 056); identical-output เฉพาะ PR2 ของ 056 (แยก i18n, ผ่านประตู oracle ของ EQ ใน S05); docs สำหรับการแก้ VER; XS ชนิดเดียวกันรวมใน PR เดียวได้ถ้าไม่เกินราว 400 บรรทัด (S18 §18.5)

| รหัส | ที่มาเดิม | P·ขนาด | สถานะ | เลน | เรื่องและเหตุผล | เกณฑ์รับ | วิธีพิสูจน์ | ขึ้นกับ |
|---|---|---|---|---|---|---|---|---|
| M-PLATFORM-045 | DP:ENG-K03, DP:8-04, DP:8-19, DP:11-09, RW:TQ-05, RW:TQ-12 (+3) | P2·M | บางส่วน | T | PR CI median ~16.7 นาที (10.8–20.4; #74 17.8, #75 14.6) ยังไม่ถึงเป้า ≤ 12 นาที (KPI-28) เสร็จแล้ว: unit 3 shard + browser 2 shard, typecheck แยก job, ใช้ dist ซ้ำ, Pages ขนานลดจาก 39.4 เหลือ 18.1–22.2 นาที (R1.5) | ดูขั้น (ก)–(ฉ) ด้านล่าง; KPI-28 median ≤ 12 นาทีโดยไม่ตัดเทสต์ | ชุด case ใน `union.json` ก่อน/หลังเท่ากัน (expected/unique เท่ากัน, missing = 0); เวลา median/p90 จาก ≥ 5 run ที่เทียบกันได้ (VER) ห้ามอ้างล่วงหน้า: **ต้องวัด** | M-PLATFORM-043 (S04), R0.3r |
| M-PLATFORM-050 | DP:7.4-M6, RW:PHY-05 (residual) | P3·S | เปิด | T | `heavy.yml` รัน heavy ทุกวันอาทิตย์ 20:07 UTC และ fleet วันที่ 1 ของเดือน แต่ไม่มีขั้นเปิด issue ถ้าล้มจะไม่มีใครถูกแจ้ง (ณ 2026-10-04 ทั้ง workflow มีเพียง 3 run: 36788259097 ยกเลิก, 36804343856, 36942933112); PR ที่แตะ `src/physics/rigid/**` หรือ `src/data/**` ไม่มีด่าน validation แบบเจาะจง | PR1: run ตามกำหนดที่ล้มสร้างหรืออัปเดต issue เดียว (run link + ไฟล์ที่ล้ม) ปิดโดย PR ที่ bisect/แก้เท่านั้น PR2: PR ที่แตะ rigid/data รัน validation timelines และแถว fleet ของยานที่ถูกแตะ ตามที่แผนที่ R0.3r เลือก (ไม่ใช่ heavy เต็ม) ส่วน fleet เต็มรันต่อ candidate ของคลื่น (S05) | sabotage: บังคับให้ไฟล์ heavy หนึ่งไฟล์ล้มบน `workflow_dispatch` แล้วต้องเกิด issue; PR ทดลองที่แตะ `src/data/vehicles.ts` ต้องเลือกแถวของยานนั้น | M-PLATFORM-077 (CO-8), R0.3r |
| M-PLATFORM-053 | RW:INF-10, RW:TQ-07, DP:D-17, RW:LUI-13 (dead code) | P3·M | บางส่วน | T | ไม่มี lint/format, ตรวจ dead export, bot อัปเดต dependency; actions pin ด้วย `@v4` ไม่ใช่ SHA (ตรวจบน `da67341`: `ci.yml`); annotation ของ Pages 37223857005 (ตรวจว่าปรากฏใน run ถัดไปด้วยหรือไม่ เช่น 37230585947) เตือนว่า `actions/checkout@v4`, `setup-node@v4`, `upload-artifact@v4` และ `download-artifact@v4` เป้า Node 20 ซึ่ง deprecated และถูกบังคับให้รันบน Node 24 | หนึ่งเครื่องมือต่อ PR ตามลำดับ: (1) pin actions ด้วย SHA + `dependabot.yml` (npm, github-actions; รวมรายสัปดาห์; **ไม่ auto-merge**; major ของ Node ตาม D-3/D-4) ไม่เพิ่ม devDependency (2) ตรวจ dead export เป็น devDependency ตัวเดียวตาม DEC:D-17 เริ่มแบบรายงาน แล้วเป็น ratchet "ไม่มี export ที่ไม่ได้ใช้เพิ่ม" พร้อม allowlist ที่หดได้อย่างเดียว ส่วนการลบโค้ดตายทำโดยเลนเจ้าของเป็น PR identical-output (EO-BUN-1) เฉพาะในไฟล์ที่กำลังแก้ (EQ-14, M-PLATFORM-038) (3) lint เป็น devDependency ตัวเดียว ใช้เฉพาะกฎด้านความถูกต้อง ไม่จัดรูปแบบทั้ง repo; axe อยู่ที่ R2.5 (M-LAUNCH-050, D-44) ไม่ทำซ้ำที่นี่ | แต่ละ PR แสดงผลก่อน/หลังของเครื่องมือ และ CI เขียว; sabotage: เพิ่ม export ที่ไม่ได้ใช้แล้ว ratchet ต้องล้ม | D-17 (ตัดสินแล้ว) |
| M-PLATFORM-054 | DP:P-6, DP:7.4-P1, DP:7.4-M2 | P2·XS | เปิด | Q (T ตรวจ) | `main.ts` และ `panel.ts` โตทุกระยะ (`da67341`: 2,408/2,426 บรรทัด; `7662ead`: 2,620/2,517 หลัง #77/#80) ไม่มีเทสต์ตรึงขนาด | `tests/module-size.test.ts`: เพดาน = ขนาดที่วัดตอน land (ratchet ลงอย่างเดียว; การขึ้นต้องมีเหตุผลใน PR และ I อนุมัติ) + รายการ guard ที่ต้องมีอยู่ (architecture, repo-hygiene, bundle budget, i18n parity, fingerprint, section-plan) ซึ่งเพิ่มได้อย่างเดียว | sabotage: เพิ่มบรรทัดเกินเพดาน หรือลบไฟล์ guard ใน branch ทิ้ง แล้วต้องล้ม | — (ต้องอยู่ก่อน EQ-15) |
| M-PLATFORM-056 | DP:ENG-K09 | P3·S | เปิด | T (+P, I) | แกนฟิสิกส์/วงโคจร/การออกแบบยังตรวจชนิดด้วย lib DOM; กฎห้าม DOM ใน `architecture.test.ts` ตรวจแค่ข้อความ; `src/i18n/index.ts` เขียน `document.documentElement.lang` | PR1 (quality-improving): `tsconfig.core.json` (lib ES2022 ไม่มี DOM) ครอบโฟลเดอร์แกน + job `typecheck:core` PR2 (identical-output ผ่าน I-train หลัง EQ-6): แยก `i18n/dict.ts` ที่บริสุทธิ์ออกจาก index ที่แตะ DOM | PR2: EO-I18N-1 และ EO-BUN-1 ไม่ขยับ; PR1: sabotage ใช้ `window` ในแกนแล้ว typecheck ต้องล้ม | EQ-6 (M-PLATFORM-031) |
| M-PLATFORM-057 | RW:TQ-11 | P3·XS | เปิด | T | `vite.config.ts` และ `scripts/*.ts` ไม่เคยถูกตรวจชนิด (`tsconfig.json` include แค่ `src`, `tests`) | `tsconfig.node.json` อยู่ใน job typecheck และไม่มี error; error ที่พบซึ่งต้องแก้โค้ดของสคริปต์ให้แยกเป็น PR bug-fix | sabotage: ใส่ชนิดผิดใน `scripts/` แล้ว job ต้องล้ม | — |
| M-PLATFORM-058 | RW:TQ-09 | P3·XS | เปิด | Q (P ตรวจ) | `tests/rigid-recovery.test.ts:23,78,84` พิมพ์ JSON หลาย kB ออก stdout ทุกครั้ง ทำให้ log อ่านยาก | log แสดงเฉพาะเมื่อตั้ง env flag; assertion ไม่เปลี่ยน | รายการ assertion และ raw-result ของ vitest เท่ากันก่อน/หลัง (VER) | — |
| M-PLATFORM-059 | RW:TQ-10 | P3·S | เปิด | T (+I ถ้าแตะ `mcp.ts`) | ผลของเครื่องมือ WebMCP เป็น `unknown` ทำให้ `tests/mcp.test.ts` ใช้ `as any` ราว 63 ครั้ง | map ชนิดผลรายเครื่องมือ; `as any` ในไฟล์นั้นเหลือใกล้ศูนย์ | ชนิดเท่านั้น: EO-BUN-1 ไม่ขยับ (build เท่าเดิม) | EQ-7 (M-PLATFORM-034 แยก `mcp.ts`) |
| M-PLATFORM-060 | DP:ENG-K08, DP:9-03 | P3·S | บางส่วน | Q (T ตรวจ) | `architecture.test.ts` (#45) มีกฎ core ไม่ import UI แล้ว แต่กฎของ session core/mirror ยังแคบ (ตรวจแค่ token DOM) | (1) ใช้กฎ import ของ session core/mirror หรือใส่ใน allowlist พร้อมเหตุผล (2) **ข้อค้นพบใหม่ (ตรวจบน `da67341`):** `src/lessons/assessment/record.ts` import `Simulation`, `flights.ts` import `physics/defaults` และ `physics/mission`, `expression.ts` import ค่าคงที่ เพราะการให้คะแนนต้องบินซ้ำ กฎ "บทเรียน import ได้แค่ type" จึงใช้กับโค้ดเดิมไม่ได้ ให้ allowlist พร้อมเหตุผล แล้วใช้กฎ types-only เฉพาะโมดูลเกม/การสอนใหม่ผ่าน M-PHYSICS-064 (3) เพิ่มกฎที่ S02 §02.14 เสนอ: `src/physics` ห้าม import `three` และห้ามเรียก `Math.random` (ยืนยันว่าวันนี้ไม่มี) | sabotage ต่อกฎ: เพิ่ม import ต้องห้ามใน branch ทิ้งแล้วต้องล้ม | — |
| M-PHYSICS-064 | DP:P-2 | P3·XS | เปิด | Q (P ตรวจ) | โมดูลเกม/การสอน (challenges, campaign, scores, diagnosis) ต้องอยู่ "บน" ฟิสิกส์ ไม่อยู่ "ใน" ฟิสิกส์ (RM:X01) | `architecture.test.ts` ล้มเมื่อไฟล์ในโฟลเดอร์เกม/การสอนมี import ที่ไม่ใช่ `import type` จาก `src/physics`; land เป็น PR แยกทันที**ก่อน**โมดูลแรกของกลุ่มนี้ ไม่ว่าจะเป็น diagnosis ของ ED-LES-2 (M-LAUNCH-063 ย้ายจาก R3.5, S16) หรือ X01 ตัวแรก (ED-GAME-1, S16) (`result-actions.ts` ของ #77 import แค่ type จึงผ่านอยู่แล้ว) | sabotage: import ค่าจาก `src/physics` ในไฟล์ทดลองแล้วต้องล้ม | ED-GAME-1, ED-LES-2 |

**ไฟล์ต่อรายการ:**
- M-PLATFORM-045: `.github/workflows/ci.yml`, `scripts/verification/create-plan.mjs` (การแบ่ง shard), `tsconfig.json` (`tsc -b`), `vitest.config.*` (cache)
- M-PLATFORM-050: `.github/workflows/heavy.yml` (ขั้นเปิด issue, `issues: write` เฉพาะ job นั้น), `ci.yml` (trigger ตาม path)
- M-PLATFORM-053: `.github/workflows/*.yml` (pin ด้วย SHA), `.github/dependabot.yml`, `package.json` + ไฟล์ config ของเครื่องมือที่เลือก
- M-PLATFORM-054: `tests/module-size.test.ts`
- M-PLATFORM-056: `tsconfig.core.json`, `ci.yml` (job `typecheck:core`), `src/i18n/dict.ts` + `src/i18n/index.ts` (ผ่าน I-train)
- M-PLATFORM-057: `tsconfig.node.json`, `package.json` (script `typecheck`)
- M-PLATFORM-058: `tests/rigid-recovery.test.ts`
- M-PLATFORM-059: `src/mcp.ts` (ชนิดเท่านั้น), `tests/mcp.test.ts`
- M-PLATFORM-060 และ M-PHYSICS-064: `tests/architecture.test.ts`

**ขั้นของ M-PLATFORM-045** (ทุกขั้นคงความครอบคลุมของ release และเป็น PR quality-improving แยกกัน):
- (ก) วัดก่อน: median/p90 ของ PR CI และเวลาต่อ job/shard จาก ≥ 5 run ล่าสุดที่เทียบกันได้ บันทึกเป็นฐาน
- (ข) rebalance shard ตามเวลาต่อไฟล์ที่วัดได้ (plan บันทึกไว้แล้ว)
- (ค) cache การแปลงโมดูลของ vitest และ `tsc -b` แบบเพิ่มทีละส่วน (key จาก lockfile + config) ต้องพิสูจน์ว่าได้ diagnostic ชุดเดียวกับ `tsc --noEmit` บน base
- (ง) job เร็วจากแผนที่ R0.3r รันก่อนเพื่อให้แดงเร็ว ด่านเต็มยังรันเหมือนเดิม
- (จ) เทสต์ six-DOF ทั้งภารกิจออกจาก PR CI ได้**เฉพาะ PR ที่แผนที่ R0.3r แสดงว่าไม่กระทบ** six-DOF และต้องยังรันใน deploy gate ก่อน publish ทุกครั้ง; path ที่ไม่รู้ผลกระทบใช้ชุดเต็ม ทั้งนี้เพื่อให้ตรง PLAN:§10.2 ("domain acceptance ที่เกี่ยวข้องต้องผ่านก่อน merge")
- (ฉ) ถ้า D-64 รับ: ใช้ผล heavy/fleet ซ้ำเมื่อ hash ของ tree ที่เกี่ยวกับฟิสิกส์ + lockfile + Node runtime เท่ากัน (hash คำนวณโดย selector ของ R0.3r) ห้ามใช้ซ้ำกับ journey และกับ unit บน Pages (M-PLAN-012 ยังถูกปฏิเสธ)

**แก้ `docs/development/VERIFICATION.md`** (PR docs ของ T และ I merge; ทำหลัง R0.3r และ R0.4 land และหลัง D-64 มีคำตอบ ถ้า D-64 ยังไม่ตอบ ให้ลงข้อ 1, 2, 4, 5 ก่อน):
1. **กฎ oracle ของ EQ:** PR identical-output ต้องระบุ `EO-*` ที่บันทึกบน merge-base และแสดงว่าไม่ขยับ พร้อมกฎหยุด (S07 §07.5) ไม่มีใครบันทึก oracle ใหม่ใน PR ของ EQ
2. **กฎ `--compare`:** ≥ 3 run (≥ 5 สำหรับข้อความต่อสาธารณะ), ช่วงไม่ทับกัน, gate เฉพาะค่าที่ไม่ขึ้นกับฮาร์ดแวร์, เวลาจาก SwiftShader เป็น trend, profile ใหม่ทุก run, provenance JSON, header แบบ Pages ก่อนอ้างการส่งข้อมูล (S04 §04.1)
3. **กฎ D-64 (ถ้ารับ):** นิยาม tree ที่เกี่ยวกับฟิสิกส์ (`src/physics`, `src/data`, worker, `tests/heavy`, `tests/sixdof-fleet`) + lockfile + Node runtime; ใช้ซ้ำได้เฉพาะ heavy/fleet; ห้ามกับ journey และ unit บน Pages
4. ชี้ไปที่แผนที่ R0.3r ที่เครื่องอ่านได้ โดยคงตาราง prose เป็นสรุป; path ที่ไม่มีกฎใช้ชุดเต็ม
5. แถว fleet ตามยานต่อ PR และ fleet เต็มต่อ candidate ของคลื่น (S05 §05.6)
6. Node pin เมื่อ D-3/D-4 ตัดสิน (บ้านของงาน pin คือ R0.4 และ S08)

ถ้า D-18 รับ ชั้นเทสต์ DOM (M-PLATFORM-052, S08) ลงใน R7.3 เป็น devDependency ตัวเดียว และไม่แทน journey จริง
- **KPI ที่รายงาน:** KPI-28 (เป้า median ≤ 12 นาทีโดยไม่ตัดเทสต์), KPI-21 (re-record ที่ไม่ตั้งใจ = 0), KPI-34 (ผลของ module-size test ต่อ rework ของ hotspot)
- **quality guard (OR-1, OR-2):** ความครอบคลุมของ release เท่าเดิม พิสูจน์ด้วย union; PR ที่แก้เฉพาะ type ต้องให้ build เท่าเดิม (EO-BUN-1); ไม่มี auto-merge ของ dependency
- **หลักฐานที่ต้องส่ง:** `reports/R7.3-<step>.md` (median/p90 ก่อน/หลังพร้อม run id, การเทียบ union, ผล sabotage); แถว PROGRESS
- **execution_authorized:** false

### 17.4 R7.4 ความทนทาน ความปลอดภัย และด่านข้อมูล (T, + I สำหรับ `index.html`)

#### R7.4 — fuzz ตัวอ่านไฟล์, CSP, ไม่มี request ออกนอกตอนออฟไลน์, regex ที่ anchor, ด่านข้อมูลเก่า และเครดิต
- **เลน:** T (Q เขียนไฟล์เทสต์ล้วน; I ใส่ meta CSP ใน `index.html` ผ่าน I-train; O ทำป้ายวันที่ข้อมูลใน Orbit; L-UI/I แก้รายการแหล่งใน `src/ui/dialogs.ts`) **คลื่น:** ต่อเนื่อง; M-PLATFORM-030 ใน K1 (guard ที่ผ่านทั้งที่ผิด), M-PLATFORM-017 หลัง FX-6 (K2) **ประมาณการ (หยาบ):** 10 agent-days, ~3 PR หลัก (+ PR เล็กตามชนิด) **OR:** OR-2
- **ขึ้นกับ:** FX-6 (M-PLATFORM-016), M-PLATFORM-050 (กลไก issue), D-10/D-15 (สำหรับเงื่อนไขข้อมูลใหม่) **ปลดล็อก:** G7, M-ORBIT-041, journey ข้ามระบบ ขั้น 8
- **ไฟล์ต่อรายการ:** 030 และ 028: `tests/browser/journeys/pwa-offline.mjs` (หรือ journey ใหม่สำหรับ egress) · 017: `tests/file-fuzz.test.ts` + fixture ใต้ `tests/fixtures/` · 027: `tests/browser/harness.mjs` (ขั้น 1), `index.html` (ขั้น 2, I), `docs/SECURITY.md` · M-ORBIT-040: `scripts/refresh-snapshots.ts`, `.github/workflows/deploy.yml` (ขั้น refresh), ป้ายวันที่ข้อมูลใน UI ของ Orbit (O) + i18n 3 ภาษา (ผ่าน I-train) · M-ORBIT-044/M-LEARNING-066: `tests/credits.test.ts`, `NOTICE.md`, `src/ui/dialogs.ts` (PR2)
- **ชนิดการเปลี่ยนต่อ PR:** quality-improving (030 ซึ่งแก้เทสต์ล้วนตามกฎร่วมข้อ 6, 028, 017, 027 ขั้น 1 และ 2, credits test, ขั้นแดงของ 040), feature (ป้ายวันที่ข้อมูลของ 040, รายการแหล่งในแอปของ 066), docs (`SECURITY.md`); ข้อบกพร่องในโค้ดแอปที่ fuzz พบเป็น bug-fix ของเลนเจ้าของ ไม่ใช่ PR ของ R7.4

| รหัส | ที่มาเดิม | P·ขนาด | สถานะ | เลน | เรื่องและเหตุผล | เกณฑ์รับ | วิธีพิสูจน์ | ขึ้นกับ |
|---|---|---|---|---|---|---|---|---|
| M-PLATFORM-030 | OD:S7 handoff | P2·XS | เปิด | Q | `pwa-offline.mjs:32` ใช้ `/tune\.worker-[^/]+\.js$/` และ `:42` ใช้ `/tune\.worker/` ซึ่งตรงกับ `attitude-tune.worker-…js` ด้วย ถ้า tune worker หายไป journey ก็ยังผ่าน (ตรวจบน `da67341`) | anchor ที่ส่วนของ path: `/(^\|\/)tune\.worker-[^/]+\.js$/` ทั้งสองจุด (ขีดตั้งใน regex ถูก escape เพื่อให้ตารางแสดงได้ ความหมายคือ ต้นสตริงหรือ `/` ตามด้วย `tune.worker-`) | PR ชนิด quality-improving (แก้เทสต์ล้วน): sabotage เอา `tune.worker` ออกจาก manifest แล้ว journey บน base ต้อง**ผ่าน** (ยืนยันว่า guard ผิด) ส่วนบน head ต้อง**ล้ม** | — |
| M-PLATFORM-028 | RM:P2a, RM:P3a | P2·XS | บางส่วน | Q | หลัก static-first/intranet ถืออยู่บน main (`DEFAULT_DATA_MODE` "offline" ที่ `src/provider/data-mode.ts:15`, ฟอนต์เว็บเฉพาะออนไลน์) แต่มีแค่ unit test ไม่มี assertion ระดับเบราว์เซอร์ | journey บันทึกทุก request ในโหมดออฟไลน์ ผ่าน Home/Launch/Orbit/Build/Lessons และล้มเมื่อมี URL ที่ไม่ใช่ same-origin | sabotage: เพิ่มภาพจาก URL ภายนอกแล้วต้องล้ม | — |
| M-PLATFORM-017 | DP:12-09, DP:ENG-K15 (fuzz) | P2·S | เปิด | Q (T ตรวจ) | ตัวอ่านไฟล์ที่นักเรียน/ครู import เข้ามาได้ (mission, design, lesson, results, TLE/OMM, CDM, archive, notebook, lesson pack, backup ของโปรไฟล์, `?scenario=`) ยังไม่เคยถูก fuzz | `tests/file-fuzz.test.ts`: mutation ด้วย seed คงที่ (ตัดท้าย, flip byte, ชนิดผิด, ซ้อนลึก, ตัวเลขใหญ่, สตริง NaN) บน fixture ของทุกรูปแบบ ต้องไม่มี throw ที่ไม่ถูกจับ ไม่ค้างเกิน N ms (ตรึง N ก่อนรัน) และปฏิเสธด้วย error ที่เอกสารของรูปแบบนั้นระบุ; รันใน suite ปกติ < 30 s; ข้อบกพร่องที่พบส่งเป็น bug-fix ให้เลนเจ้าของ | sabotage: ถอด guard ตัวหนึ่งของ validator แล้ว fuzz ต้องเจอภายในงบ seed | FX-6 |
| M-PLATFORM-027 | OD:§6, RW:INF-13, RW:LS-05, DP:ENG-K15 (CSP) | P2·M | เปิด | T + I | `index.html` ไม่มี Content-Security-Policy และไม่มี threat model; Pages ตั้ง header ไม่ได้ จึงใช้ได้แค่ meta CSP (ไม่มีโหมด report-only) | ขั้น 1 (quality-improving): harness ฉีด policy ผู้สมัครเฉพาะในเทสต์ แล้วนับ `securitypolicyviolation` ในทุก journey ขั้น 2: เมื่อ journey ทุกตัวสะอาด (รวมโหมดข้อมูลออนไลน์, ฟอนต์เว็บ, worker, การดาวน์โหลดแบบ blob, WebGL) I ใส่ meta CSP ผ่าน I-train; inline script/style ใช้ hash แทน `'unsafe-inline'` เมื่อทำได้ มิฉะนั้นเขียนเหตุผล; `docs/SECURITY.md` ระบุ input (ไฟล์ import, พารามิเตอร์ URL, การดึงข้อมูลออนไลน์, service worker) และวิธีป้องกัน | ตัวนับ violation = 0 ทุก journey ก่อนขั้น 2; sabotage: ใส่ inline script ที่ไม่มี hash แล้วต้องนับได้ | M-PLATFORM-017 |
| M-ORBIT-040 | DP:INF-12, RW:INF-12, DP:12-25, DP:7.5-M2 | P2·S | บางส่วน | T (+O ป้าย) | cron ย้ายเป็น `43 17 * * *` แล้ว แต่ `scripts/refresh-snapshots.ts` แค่พิมพ์ `::warning::` แล้วเก็บ snapshot เดิม; baseline `public/data/satellites.json` commit ล่าสุด 2026-09-26 | ขั้น refresh ล้ม (แดง) และเปิด/อัปเดต issue เมื่อ `asOf` ของดาวเทียม/สภาพอวกาศเก่ากว่า 3 วัน หรือ IERS เก่ากว่า 14 วัน (ค่าเสนอ เจ้าของยืนยันใน PR) **ขณะที่ deploy โค้ดยังเดินต่อด้วย snapshot ที่เก็บไว้** (S02 §02.13 ข้อ 21); อายุของ baseline ที่ commit ไว้รายงานเป็น annotation ใน PR CI **ไม่เป็น unit test ที่ล้มตามปฏิทิน** เพื่อไม่ให้ PR โค้ดแดงเพราะเวลาผ่านไป; ป้าย "ข้อมูล ณ วันที่" ในแอปเป็นสีเหลืองอำพันเมื่อเกินเกณฑ์ ข้อความ 3 ภาษา และเจ้าของอนุมัติภาพหน้าจอ | sabotage: ตั้ง `asOf` เก่าใน fixture แล้วขั้น refresh ต้องแดงโดยที่ job deploy ยังผ่าน; DOM snapshot ของป้ายที่อายุ 2 และ 4 วัน | M-PLATFORM-050 |
| M-ORBIT-044 + M-LEARNING-066 | DP:13-09, RW:DOC-06 (ส่วน NOTICE เสร็จ) · DP:CTX-QW-1 | P3·S + P3·XS | บางส่วน · เปิด | Q (+L-UI/I) | `NOTICE.md` รวมเงื่อนไขข้อมูลแล้ว (#44) แต่ไม่มีเทสต์เครดิต; รายการ "Physics sources" ในแอป (`src/ui/dialogs.ts:247-262`) มีแค่แหล่งของจรวด | PR1 (quality-improving, ไฟล์เดียวสำหรับทั้งสองรายการ): `tests/credits.test.ts` ทุกไฟล์ใน `public/` (รวม `public/data` และ `public/textures`) ต้องมีแถวใน `NOTICE.md` ชุดข้อมูลใหม่ที่ไม่มีแถวต้องล้ม PR2 (feature, ข้อความ 3 ภาษา): รายการในแอปลิงก์ NOTICE สำหรับข้อมูลของ Orbit/Build เงื่อนไขของ NRLMSIS 2.1 และ Cosmos 1408 บันทึกเมื่อข้อมูลนั้นถูกนำมาใช้ตาม D-10 (R4.5) และ D-15 (ED-MIL-1) เท่านั้น | sabotage: เพิ่มไฟล์ใน `public/` โดยไม่มีแถว NOTICE แล้วต้องล้ม | D-10, D-15 (เฉพาะส่วนเงื่อนไข) |

**ลำดับขั้นของ R7.4:**
1. M-PLATFORM-030 (K1): ทำ sabotage บน base ก่อน เพื่อพิสูจน์ว่า guard ผ่านทั้งที่ผิด แล้วจึง anchor
2. M-PLATFORM-028: assertion เรื่อง egress ซึ่ง journey ข้ามระบบ (ขั้น 8) ใช้ร่วม
3. M-PLATFORM-017 หลัง FX-6: เพิ่ม fixture ต่อรูปแบบไฟล์ ข้อบกพร่องที่พบส่งเป็น bug-fix ให้เลนเจ้าของ (L, B, O, L-UI)
4. M-PLATFORM-027 ขั้น 1: สำรวจ inline script/style ใน `index.html` และทุกจุดที่ใช้ blob, worker, ฟอนต์ และการดึงข้อมูลออนไลน์ แล้วร่าง policy และนับ violation ในทุก journey; ร่าง `SECURITY.md`
5. M-ORBIT-040: ขั้น refresh แดงและเปิด issue (ใช้กลไกเดียวกับ M-PLATFORM-050) ก่อน แล้วจึงทำป้ายในแอปเป็น PR feature แยก พร้อมภาพหน้าจอให้เจ้าของอนุมัติ
6. credits test (PR1) แล้วรายการแหล่งในแอป (PR2)
7. M-PLATFORM-027 ขั้น 2: ใส่ meta CSP ผ่าน I-train เมื่อตัวนับเป็นศูนย์ติดต่อกันใน inventory เต็มของ Pages (จำนวน run ที่ต้องเขียวตรึงใน PR ขั้น 1)
- **KPI ที่รายงาน:** KPI-29 (ป้ายวันที่ข้อมูลและ refresh ไม่ทำให้ขึ้นข้อความอัปเดตแอป), จำนวน CSP violation ต่อ journey (ตัวเลขติดตามในรายงาน ไม่ใช่ KPI)
- **quality guard (OR-2):** CSP ใส่จริงได้เมื่อ violation เป็นศูนย์ในทุก journey เท่านั้น จึงไม่มีฟีเจอร์ใดเสีย (ข้อมูลออนไลน์, ฟอนต์, การส่งออก); ด่านข้อมูลเก่าไม่บล็อกการ deploy โค้ดและไม่ตัด snapshot fallback (RM:P3b); เทสต์ไม่ขึ้นกับวันในปฏิทิน
- **หลักฐานที่ต้องส่ง:** `reports/R7.4-<step>.md` (ผล sabotage, จำนวน violation ต่อ journey, เกณฑ์อายุข้อมูลที่เจ้าของยืนยัน); แถว PROGRESS
- **execution_authorized:** false

### 17.5 R7.5 ความจริงของเอกสาร และความสะอาดของ repo (I/W, + P สำหรับเอกสารฟิสิกส์)

#### R7.5 — เทสต์ตัวเลขและลิงก์ก่อน แล้วจึงแก้เอกสารให้ตรงความจริง
- **เลน:** I (W ร่าง; P ตรวจประโยคฟิสิกส์ใน PHYSICS/VALIDATION; B ตรวจข้อความ Build; O ตรวจ prose ของ Phase 5) **คลื่น:** ต่อเนื่อง; M-PLATFORM-071 → 069 ใน K2–K3; 062 เมื่อเจ้าของอนุมัติการย้าย **ประมาณการ (หยาบ):** 7.5 agent-days, ~4 PR **OR:** OR-4, OR-6
- **ขึ้นกับ:** CO-8 (banner, ดัชนี, กฎลำดับความน่าเชื่อถือ M-PLATFORM-067) **ปลดล็อก:** รายการข้อจำกัดของ G7 และ v1.0 (M-LEARNING-067), KPI-31 (ร่วมกับ CO-2)
- **ไฟล์ต่อรายการ:** 071: `tests/docs-consistency.test.ts`, เครื่องหมายกำกับใน `README.md` และ `docs/IMPLEMENTATION-STATUS.md` · 069 + M-BUILD-033: `docs/IMPLEMENTATION-STATUS.md`, `README.md`, `docs/USER-GUIDE.md`, `docs/PHYSICS.md`, `docs/VALIDATION.md`, `docs/SIXDOF-VEHICLE-DATA.md` (prose เท่านั้น) · 072: `docs/PHYSICS.md`, `docs/VALIDATION.md` · 068: `src/ui/section-plan.ts` + i18n (I) · M-ORBIT-030: `docs/ROADMAP-PART2-3.md` (prose เท่านั้น), `docs/PHYSICS.md`, `src/physics/propagator/propagate.ts` (comment, P) · 062: `docs/audit-2026-09-29/**` → `docs/history/` หรือ Release asset, `.github/workflows/audit-*.yml`, `heavy-audit.yml`, `tests/repo-hygiene.test.ts`, `docs/README.md`
- **ชนิดการเปลี่ยนต่อ PR:** quality-improving (071, เพดานขนาดรวมของ 062), docs (069, M-BUILD-033, 072, prose ของ M-ORBIT-030, การย้าย packet), bug-fix (รายการ X01 ของ 068)
- **ห้ามเด็ดขาด:** ย้าย เปลี่ยนชื่อ หรือจัดรูปแบบ `docs/ROADMAP-PART2-3.md`, `docs/SIXDOF-VEHICLE-DATA.md`, `docs/history/phase4-2026-10-01/T03-CURRICULA-RESEARCH.md` (S02 §02.13 ข้อ 28); แก้ได้เฉพาะ prose ในรูปแบบเดิม พร้อมรันเทสต์ที่อ่านไฟล์นั้น ห้ามเปลี่ยน path ของ `IMPLEMENTATION-STATUS.md` และ `PHYSICS.md` เพราะ comment ใน `src/` อ้างถึง

| รหัส | ที่มาเดิม | P·ขนาด | สถานะ | เลน | เรื่องและเหตุผล | เกณฑ์รับ | วิธีพิสูจน์ | ขึ้นกับ |
|---|---|---|---|---|---|---|---|---|
| M-PLATFORM-071 | DP:ENG-K22, DP:7.5-M4, DP:8-21, RW:ENG-K22, DP:12-06 | P2·S | เปิด | Q (T ตรวจ) | ตัวเลขในเอกสารคลาดซ้ำแล้วซ้ำอีก (เที่ยวบิน Watch 10 → 20, matrix ของ fleet, จำนวนเทสต์) และไม่มีเทสต์ลิงก์ | `tests/docs-consistency.test.ts`: อ่านตัวเลขในเครื่องหมายกำกับใน README/IS แล้วเทียบกับ source (`watch-missions`, เครื่องมือ MCP, harness ของ fleet, Node ใน `package.json`); ลิงก์และ anchor แบบ relative ต้อง resolve ได้; จำนวนที่รู้ได้จาก CI เท่านั้น (จำนวน case) ให้สคริปต์เขียนจาก `union.json` ล่าสุดใน release PR ไม่พิมพ์เอง; ไม่ใส่เครื่องหมายกำกับในไฟล์ที่โค้ด/เทสต์อ่าน; packet `audit-2026-09-29` (ลิงก์ตาย 60 ลิงก์) อยู่ใน allowlist ที่หดได้อย่างเดียวจนกว่าจะถึง 062; ส่วน "ป้ายทดลองในแอปเทียบกับ Known limitations" ส่งมอบโดย M-LAUNCH-072 (R4.4, S13) ที่ใช้ harness นี้ | sabotage: แก้ตัวเลขหนึ่งตัวหรือลิงก์หนึ่งลิงก์แล้วต้องล้ม | — |
| M-PLATFORM-069 | DP:PHY-03, RW:PHY-03, DP:LES-14, RW:DOC-01, RW:DOC-02, RW:DOC-04 (+9) | P2·S | เปิด | I (+P, W) | ข้อความเก่าใน IS, README, USER-GUIDE, PHYSICS (ตรวจบน `da67341`): IS:240 "9 906 tests in 255 files", :245, :276, :293 "G05 … not started", :346 "twenty items", :409 cron 03:17 (จริงคือ 17:43); README:169 heavy "about 15 minutes" (จริง 25–61 นาที), :360 "ten real flights" (มี 20), :575 "scheduled run skips npm test" (`deploy.yml` รันทุก shard); PHYSICS.md:2961 max-Q "~20 s early" ขัดกับ VALIDATION §2; หัว scope ของ SIXDOF-VEHICLE-DATA "2 vehicles"; USER-GUIDE ไม่มีคำว่า dogleg | ทุกข้อแก้จาก source หรือจากตัวเลขที่สคริปต์สร้าง ไม่เปลี่ยนตัวเลขฟิสิกส์ให้ตรงเอกสาร (เอกสารตามโค้ดและ validation); การแก้ SIXDOF-VEHICLE-DATA เป็น prose ในรูปแบบเดิมและรัน CI path ที่ไฟล์นั้น trigger; ข้อขัดแย้งที่แพ็กเกจนี้ปิด: C1, C2, C3 (ส่วน IS/README/USER-GUIDE; CHANGELOG อยู่ CO-2, คู่มือโปรไฟล์อยู่ M-PLATFORM-074 ใน R1.6), C10, C11 (ข้อความ; banner อยู่ CO-8), C13 (เพิ่มป้ายประวัติและ provenance ให้ตาราง VALIDATION:3082 โดยไม่แก้ตัวเลข, P ตรวจ), C16 (ลบคำอ้าง "twenty further items" หรือชี้ไป S19) ข้ออื่นอยู่ใน S19 App D | `docs-consistency` เขียว; P ลงชื่อตรวจประโยคฟิสิกส์ในรายงาน | M-PLATFORM-071 |
| M-BUILD-033 | RW:B-06, RW:B-12 | P3·XS | เปิด | I (+B) | IS:523-524 บอกว่า "dry below engines without a warning" แต่ `explore-model.ts:543-544` เตือนแล้ว; IS:502 และหัว `ratings-job.ts` บอกว่า rating ใช้ "1–2 s" แต่ Ariane 64 ใช้ 2.8 s/18 เที่ยวบิน และงบคือ 8 s | แก้ IS ใน PR ของ 069 พร้อมตัวเลขที่วัดและลิงก์ VALIDATION §8; comment ใน `ratings-job.ts` เขียนใหม่โดย FX-1 (M-BUILD-006, S10) ซึ่งเปลี่ยนสัญญางบของ rating อยู่แล้ว ไม่เปิด PR แยก | review ของ B | M-PLATFORM-069, FX-1 |
| M-PLATFORM-072 | RW:DOC-19, DP:ENG-K22 (chapter split), DP:7.4-W1 | P3·S | เปิด | P (W สร้าง) | PHYSICS.md (223 kB) และ VALIDATION.md (205 kB) เป็นไฟล์เดียวไม่มีสารบัญ | สารบัญที่สร้างอัตโนมัติไว้บนสุดของแต่ละไฟล์; anchor ที่ comment ใน `src/` (40+ ไฟล์) อ้างยัง resolve ได้; ไม่แยกบท (จะทำให้ที่อ้างใน `src/` เสีย) และไม่ทำเว็บเอกสาร (DP:7.4-W1) | ตัวตรวจ anchor ของ 071 เขียว | M-PLATFORM-071 |
| M-PLATFORM-068 | OD:md consumers, RM:ARCH-consumed, RW:ORB-11 | P2·XS | เปิด | I | ROADMAP-PART2-3 ถูก `tests/section-plan.test.ts` และ `section-nav-model.test.ts` parse (หัว `## Phase N` และแถวตารางที่ขึ้นต้นด้วย `**X01**`) และเป็นที่มาของรายการ "กำลังจะมา" ในแอป ส่วน `src/ui/section-plan.ts:63` ของ Orbit มีแค่ L01–L05 ไม่มี X01 | (1) ข้อจำกัดเรื่องรูปแบบอยู่ใน checklist ของ PR เอกสารทุกตัว (S18 §18.10) และแก้ ROADMAP ได้พร้อมกับ parser/เทสต์เท่านั้น (2) PR bug-fix แยก: รายการ "กำลังจะมา" ของ Orbit แสดง X01 ตามแถวของ ROADMAP (phase 6) ข้อความ 3 ภาษา | `section-plan`, `section-nav-model` และ `i18n` เขียวโดยไม่แก้เทสต์; เจ้าของดูภาพหน้าจอรายการ | — |
| M-ORBIT-030 | RW:PR38-02, RM:IDS-2 (C05), RM:L01..L05 | P3·XS | เปิด | I (+O, P) | prose ของ Phase 5 ยังบอกว่าจะแทน Montenbruck & Gill ทั้งที่ D-11 และ #38 เปลี่ยนทิศแล้ว; ชื่อ C05 ยังอยู่ใน `propagate.ts:4` และ PHYSICS.md | prose ของ Phase 5 บอกว่า L01–L05 ขยายงานของ `src/physics/lunar/*` และ `sim/apollo*` (#38) โดยรหัส L01–L05, รูปตาราง และ key `plan.item.*` ไม่เปลี่ยน; comment ใน `propagate.ts:4` แก้โดย P เป็น PR docs แยก ไม่ปนกับ EQ-9 และไม่ทำระหว่างหน้าต่าง re-baseline (S05 §05.7) | เทสต์ที่ parse ROADMAP และรายการในแอปเขียวโดยไม่แก้ | — |
| M-PLATFORM-062 | DP:7.4-P7, DP:ENG-K05, DP:7.4-M5, DP:7.5-M5, DP:9-10, DP:11-18 (+3) | P3·S | เปิด | I (+T workflow) | `docs/audit-2026-09-29` มี 387 ไฟล์ 18 MB (ภาพ 107 ภาพ, ลิงก์ตาย 60, ชื่อซ้ำ C15) ใน docs; workflow `codex/audit-acceptance` สามตัวยังอยู่; เพดานรายไฟล์จับก้อนรวมไม่ได้; `.git` 37 MB | ย้ายเป็นทั้ง packet ไปใต้ `docs/history/` หรือเป็น Release asset หลัง (1) ตรวจผู้ใช้ไฟล์ (grep path ใน `src/`, `tests/`, `docs/`, `.github/`) และ (2) เจ้าของอนุมัติรายการย้าย; ลิงก์เขียนใหม่ใน PR เดียวกัน; **ไม่ rewrite ประวัติ git**; workflow: `audit-browser-acceptance.yml` และ `audit-case-exports.yml` ลบได้หลังยืนยันว่าไม่มี R1.5 พึ่ง ส่วน `heavy-audit.yml` ถูกอ้างใน VER (เรียก `heavy.yml` ตัวเดียวกัน) จึงลบเฉพาะ trigger ของ branch และแก้ VER ในคราวเดียว หรือเก็บไว้ตามที่เจ้าของเลือก; `repo-hygiene.test.ts` เพิ่มเพดานขนาดรวมต่อไดเรกทอรีใหม่ (ค่าเสนอใน PR, เจ้าของอนุมัติ) โดย packet เดิมอยู่ใน allowlist จนกว่าจะย้าย | repo-hygiene และ link test เขียว; sabotage: ไดเรกทอรีใหม่ที่เกินเพดานรวมต้องล้ม | M-PLATFORM-066 (CO-8), owner approval |

**ลำดับขั้น R7.5:**
1. M-PLATFORM-071: เทสต์ตัวเลขและลิงก์ (เขียนก่อน เพื่อให้การแก้ข้อความมีตัวตรวจ และไม่คลาดอีก)
2. M-PLATFORM-069 + ส่วน IS ของ M-BUILD-033 ใน PR docs เดียว ตรวจบรรทัดซ้ำบน main tip ก่อนแก้ เพราะ #77/#78 แก้ USER-GUIDE ไปแล้ว
3. M-PLATFORM-072: สารบัญ (P เป็นเจ้าของเนื้อหา)
4. M-PLATFORM-068: ส่วน bug-fix ของรายการ X01 ผ่าน I-train
5. M-ORBIT-030: prose ของ ROADMAP (I) และ PR docs ของ P สำหรับ comment ใน `propagate.ts`
6. M-PLATFORM-062: เมื่อเจ้าของอนุมัติรายการย้ายแล้วเท่านั้น ย้ายทีละ packet ทั้งก้อน รวมถึงบันทึก session ใน `docs/history` และ `docs/stage1-2026-10-02/` (หลัง re-pin ลิงก์หลักฐานเป็น SHA) ตาม S19 App D
7. ใส่ banner ของ S19 App D ที่ CO-8 ยังไม่ได้ทำ ได้แก่ `docs/USER-TEST-2026-10.md` กับ `docs/stage1-2026-10-02/beginner-study.md` หลัง HU-1 รวม protocol แล้ว และ `T03-OWNER-REVIEW.md` หลัง HU-2 ตรวจเสร็จ ROADMAP ไม่ใส่ banner
8. ทุก GK: ตรวจว่า PR ที่ merge ในคลื่นมีบรรทัด "docs touched or N/A" และบรรทัด CHANGELOG ครบ (process lesson 16) และแก้ PLAN.md เมื่อแผนเปลี่ยนที่ GK (S05 §05.11) เป็น PR docs
- **quality guard (OR-2):** แก้เอกสารเท่านั้น ยกเว้น bug-fix ของรายการ X01; ไม่แก้ตัวเลขฟิสิกส์ให้ตรงเอกสาร; ไม่มีไฟล์ที่โค้ด/เทสต์อ่านถูกย้าย; ไม่ลบไฟล์ใดโดยไม่มีอนุมัติ (S19 App D)
- **หลักฐานที่ต้องส่ง:** `reports/R7.5-<step>.md` (ข้อความก่อน/หลัง พร้อมแหล่งของตัวเลข, รายการผู้ใช้ไฟล์ของ 062, ลายเซ็นตรวจของ P); แถว PROGRESS
- **execution_authorized:** false

### 17.6 หลักฐาน G7 และรายการปล่อยรุ่นต่อประตู

เกณฑ์ G7 และ GK อยู่ใน S05 §05.4 เท่านั้น ตารางนี้บอกเพียงว่าแพ็กเกจใดส่งหลักฐานข้อใด

| ข้อของ G7 / GK (S05) | แพ็กเกจและรายการที่ส่งหลักฐาน |
|---|---|
| gate ที่เกี่ยวข้องครบบน candidate; browser เต็มบน `dist` ที่จะเผยแพร่จริง; snapshot ที่ refresh ผ่านการตรวจ | workflow ของ R1.5 (มีอยู่), R7.1 (M-PLAN-025, M-PLATFORM-051), R7.4 (M-PLATFORM-028, 030), R7.3 (M-PLATFORM-045 ยืนยันว่าชุด case ไม่ลด) |
| storage migration และความเข้ากันได้กับ cache เก่าก่อนเปิดรุ่นที่เปลี่ยน schema | R1.6 และ FX-7 (S10), rollback rehearsal ของ R7.2, เมทริกซ์สถานะของ R7.1 |
| ซ้อม revert บน candidate สำหรับทุก schema bump (รายการตรวจ GK; ตัวอ่าน N+1 อยู่ในรุ่นที่เผยแพร่ก่อนตัวเขียน) | R7.2 (กฎ rollback ก่อน v1.0 ข้อ 3–5; L, S, P) กับแพ็กเกจที่ bump: R1.6 (S10), R2.3s2 (S11), field ใหม่ของ R3.1r (S12), FX-2 (M-LEARNING-027), R5 (CraftState); ช่อง schema/rollback ของ envelope (S18 §18.11) |
| regression บน live ก่อน v1.0 ถูก revert ภายในวันทำการเดียวกัน หรือ forward-fix เมื่อ revert จะทำให้ข้อมูลกำพร้า | R7.2 (กฎ rollback ก่อน v1.0 ข้อ 2), retro (M-PLAN-026), แถว PROGRESS |
| deployment API สำเร็จสำหรับ commit ที่ merge; About/build stamp; flow reload ของ service worker | Pages + main-tip guard (มีอยู่), FX-7 (M-PLATFORM-022/023, S10), แถว PROGRESS (CO-2/CO-8, KPI-31) |
| กฎ rollback แยกโค้ด/ข้อมูล/หลักฐานฟิสิกส์; ไม่รายงาน "เผยแพร่" เมื่อเพียง merge | R7.2 (M-PLATFORM-047 `RELEASE.md`, M-LEARNING-068), lifecycle ของ PROGRESS (CO-8) |
| เมื่อมี D-19/D-20: tag semver, `dist.zip`, SHA256SUMS, หมวด CHANGELOG, รายการข้อจำกัด | R7.2 (M-PLATFORM-047, M-LEARNING-067), R7.5 (M-PLATFORM-069/071 ทำให้รายการข้อจำกัดตรงจริง), M-ORBIT-041 (อัปเดตข้อมูลหลังติดตั้ง) |
| heavy + fleet เขียวเมื่อแตะฟิสิกส์ (KPI-22) | CO-6 แล้ว P ต่อ candidate; R7.3 (M-PLATFORM-050 issue, D-64 ถ้ารับ) |
| แถว KPI, retro และแผนใหม่, handoff, follow-through | S04 §04.5 (`kpi-<GK>.md`), R7.2 (M-PLAN-026), S08 §08.6 |
| ความครอบคลุมด้านความปลอดภัยและความทนทาน | R7.4 (M-PLATFORM-017, 027), ด่านข้อมูล (M-ORBIT-040) |

**รายการปล่อยรุ่นต่อประตู** (วันที่อ้างอิงและกรณีช้าดู S05 §05.9; การติด tag ทุกครั้งต้องได้อนุมัติจาก H) ทุกแถว GK ที่คลื่นมี schema bump บันทึก `revert-drill-<GK>.md` เพิ่ม (กฎ rollback ก่อน v1.0 ข้อ 4) และจนถึง v1.0 ทุกแถวอยู่ภายใต้กฎ revert ภายในวันทำการเดียวกัน (ข้อ 2) คอลัมน์ tag ของ GK1–GK3 เป็นไปตามเป้า: ถ้า D-19/D-20 ได้คำตอบเร็วกว่า needed-by v1.0 จะมาที่ GK แรกหลังคำตอบนั้นตามกฎ "การติด tag" ใน §17.2

| ประตู | เผยแพร่ | tag / Release | สิ่งที่แนบหรือเผยแพร่ | สิ่งที่บันทึก |
|---|---|---|---|---|
| GCO (K0; รวม G2) | Pages จาก exact source ของ main tip ณ วันปิด | ไม่มี (D-19/D-20 ยังเปิด) | — | แถว PROGRESS ของ CO-1…CO-8 พร้อม SHA/CI/Pages/live; แถว G2 ใน DECISIONS; `kpi-GK0.md`; retro แรก (ฐาน KPI-33…35); ผล CO-6 |
| GK1 | Pages | ไม่มี (ตามเป้า) | journey ข้ามระบบรุ่นแรก | แถว KPI + ฐานใหม่บน main; `R7.1-GK1.md`; `retro-GK1.md`; การปิด G0 (D-59); `revert-drill-GK1.md` ถ้า R1.6 หรือ FX-2 เริ่มเขียนรูปแบบใหม่ในคลื่น |
| GK2 ("R2 complete") | Pages | ไม่มี (ตามเป้า) | ภาพหน้าจอเมทริกซ์ชุดใหม่ (CI artifact) | แถว KPI; หลักฐาน "R2 complete" (S11 §11.7); คำตอบ D-3/D-4 (เส้นตาย Node); รายงาน HU-6 รอบแรกถ้ามี; `revert-drill-GK2.md` ถ้ามีตัวเขียน schema ใหม่ (R1.6, FX-2, R2.3s2 PR2b) |
| GK3 | Pages | ไม่มี (ตามเป้า; D-19/D-20 needed-by GK3); ถ้า D-19/D-20 ได้คำตอบแล้ว ทำ dry-run ของ `release.yml` (Actions artifact เท่านั้น) | — | แถว KPI; journey ทั้งเส้นทาง (M-PLAN-025); ผล dry-run; `revert-drill-GK3.md` ถ้ามีตัวเขียน schema ใหม่ (R2.3s2, field ใหม่ของ R3.1r) |
| GK4 (+G4-S ถ้ายังไม่ผ่าน, G4 บางส่วน) — **เป้า v1.0** | Pages | `v1.0.0` + Release | zip เว็บ (ไบต์ของ `pages-dist`), zip intranet ที่มีเสียง, SHA256SUMS, `build-info.json`, หมวด CHANGELOG, รายการข้อจำกัด; sync mirror; DOI ถ้าเลือก | แถว KPI; rollback rehearsal; URL ของ Release + digest; สถานะ Node pin (ย้ายเสร็จภายใน GK4) |
| GK5 (+G5) | Pages | tag ตามจังหวะของ D-20 (ข้อเสนอ: minor ทุก GK) | เหมือน GK4 + ชุด USB (M-ORBIT-041) | rehearsal ถ้า schema เปลี่ยน (CraftState/handoff ของ R5) |
| GK6 (+G6/G8) | Pages | tag ตาม D-20 | เหมือน GK5 | rehearsal ถ้า schema เปลี่ยน; retro รวมทั้งแผน |

### 17.7 ข้อเสนอที่ไม่รับหรือเลื่อน (ส่งต่อ S19 App C)

| ข้อเสนอ | เหตุผล | ทางที่รักษาคุณภาพแทน |
|---|---|---|
| ย้ายเทสต์ six-DOF ทั้งภารกิจออกจาก PR CI โดยไม่มีเงื่อนไข | ขัด PLAN:§10.2 และ S02 §02.13 ข้อ 25 | ออกได้เฉพาะ PR ที่แผนที่ R0.3r ชี้ว่าไม่กระทบ และยังรันใน deploy gate (M-PLATFORM-045 ขั้น จ) |
| retry อัตโนมัติ หรือยืด timeout ให้ flake หาย | กลบ race และบั๊กจริง (PLAN:§9.2 ข้อ 7) | M-PLATFORM-061: หาสาเหตุ แล้วรอสถานะที่ resolve แล้ว |
| ใช้ผล unit ของ PR ซ้ำบน Pages (M-PLAN-012) | Pages refresh snapshot ทำให้ input ต่างกัน | D-64: ใช้ซ้ำเฉพาะ heavy/fleet ด้วย content hash |
| ให้ dependabot auto-merge | อาจมีการเปลี่ยนที่ไม่มีคนตรวจเข้า main | PR ที่คนตรวจ หนึ่ง dependency ต่อครั้ง (D-17) |
| จัดรูปแบบโค้ดทั้ง repo ด้วย formatter | diff ใหญ่ชนไฟล์ hotspot ทุกเลน (KPI-34) โดยไม่ได้คุณภาพเพิ่ม | lint เฉพาะกฎด้านความถูกต้อง |
| unit test อายุข้อมูลที่ล้มตามปฏิทิน | PR โค้ดแดงเพราะเวลาผ่านไป และบล็อกการ deploy (S02 §02.13 ข้อ 21) | annotation ใน PR + ขั้น refresh ที่แดง (M-ORBIT-040) |
| build zip ของเว็บใหม่ตอนติด tag | ไบต์ต่างจากที่ผ่านด่าน เพราะ snapshot ถูก refresh | ใช้ไบต์ของ `pages-dist` ที่ผ่านด่านแล้ว |
| อัปโหลด Release จาก session ของ agent | เคยล้มด้วย HTTP 403/400 (PROG) และไม่มีหลักฐานจากด่าน | `release.yml` บน GitHub Actions |
| rewrite ประวัติ git เพื่อลด `.git` 37 MB | ทำลาย SHA ที่ลิงก์ไว้และหลักฐาน | ย้าย packet ไปข้างหน้าเท่านั้น (M-PLATFORM-062) |
| แยกบท PHYSICS/VALIDATION หรือทำเว็บเอกสาร | ทำให้ที่อ้างใน `src/` เสีย; DP:7.4-W1 ไม่ทำ | สารบัญ (M-PLATFORM-072) |
| ใช้เส้นทางไม่มี WebGL แทนเส้นทาง WebGL | ลดภาพและความสมจริง (S02 §02.13 ข้อ 11) | เลื่อนเป็นเส้นทางเพิ่มภายใต้ D-66 (M-LAUNCH-071) |
| ขยาย tolerance ข้าม engine ให้ Firefox ผ่าน | ทำลาย EO-XENG-1 (RA:(d)8) | รายงาน "differs" พร้อมป้าย; tolerance ของ six-DOF ตรึงก่อนวัด (M-LEARNING-014) |
| ใส่ CSP ก่อนที่ violation จะเป็นศูนย์ | ฟีเจอร์ออนไลน์ ฟอนต์ หรือการส่งออกอาจเสีย | ขั้น 1 นับใน harness ก่อน (M-PLATFORM-027) |
