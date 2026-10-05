## S03 สถานะ ณ 4 ต.ค. 2026 และการวิเคราะห์ประสิทธิภาพ คุณภาพ ความสมจริง และประสบการณ์ผู้ใช้

> **ขอบเขต:** ส่วนนี้มีเฉพาะข้อเท็จจริงและการวินิจฉัย ไม่มีแพ็กเกจงานใหม่ ไม่มีเป้า KPI (ดู S04) และไม่มีเกณฑ์ประตู (ดู S05) ทุกข้อค้นพบลงท้ายด้วย `→ <แพ็กเกจ>` ตาม `assignment.tsv` รายการที่มีบ้านอยู่ที่นี่มีเพียง 55 รายการที่ส่งมอบแล้ว (แพ็กเกจ `DELIVERED`)
> **ฐานหลักฐาน:** สถานะใน ledger ตรวจบน `da67341` ข้อเท็จจริงของ R3 (#75–#83) อ่านจาก `5f9aa2e` ผ่าน `gh api` ตัวเลขประสิทธิภาพมาจาก PB@fbefa18 และ PB@5f9aa2e (SwiftShader, ค่าสัมพัทธ์; สองรอบวัดบนเครื่องต่างกัน) แผนนี้ไม่ได้รันอะไรเพิ่ม นอกจาก PB สองรอบและการอ่าน GitHub API
> **as-of (ตรงกับ S00):** ตรวจแบบอ่านอย่างเดียวถึง **2026-10-04 ~21:10Z** — main บน GitHub = `5f9aa2e` (#83 เอกสาร, merge 20:31:34Z); live = `09cc2f5` (#82; Pages 37230585947 สำเร็จ 20:29:40Z เผยแพร่ #80–#82 พร้อมกัน); ไม่มี PR เปิด; R3 ครบตามคำของเจ้าของ (2026-10-04) การอ้างบรรทัดในโค้ดใช้รูป `<sha>:ไฟล์:บรรทัด` ฐานการอ้างยังเป็น `7662ead` ซึ่งโค้ดต่างจาก `5f9aa2e` เฉพาะ `src/main.ts` (+15 บรรทัด; บรรทัดเดิมเลื่อน +1/+2 ตาม shift map ใน S00 §00.1) และ `tests/browser/harness.mjs`
> **คำเตือน:** ข้อเท็จจริงบางข้อเปลี่ยนไปหลังฐานของแผนแล้ว (ดู 03.1 ข้อ 4) ผู้ใช้ส่วนนี้ต้องตรวจ SHA ปัจจุบันก่อนเริ่มงานทุกครั้ง (ดู S00)

### 03.1 ตัวตนของรุ่นที่ส่งมอบ (release identity)

| PR | เนื้อหา | merge SHA | เวลา merge (UTC) | PR CI | Pages run | ผล | live? |
|---|---|---|---|---|---|---|---|
| #71 | R1: workspace ของผู้เรียน + ฐานจำลอง | `5eb18a2` | 10-03 05:44:01 | 37099583981 ผ่าน | 37100771200 ล้มที่ journey `project-backups` (navigation wait) → แก้ใน #72 | ไม่เผยแพร่ (เผยแพร่รวมกับ #72) | ถูกแทนแล้ว |
| #72 | R1: แก้การรอ navigation ของ harness | `472645f` | 10-03 06:36:59 | 37102480388 ผ่าน | 37103651001 สำเร็จ 06:55:10Z | เผยแพร่ R1 จาก exact source | ถูกแทนแล้ว |
| #73 | เอกสารส่งมอบ R1 (docs) | `fbefa18` | 10-03 07:04:42 | — | 37150596767 (schedule) สำเร็จ | — | ถูกแทนแล้ว |
| #74 | R2 (squash จาก `8114481`) | `da67341` | 10-04 01:55:15 | 37168554643 ผ่าน 9 checks (01:37–01:54, smoke เท่านั้น) | 37169459230 สำเร็จ 02:17:31Z (รัน journey ครบ รวม `r2-flight-shell`) | เผยแพร่ | live 02:17Z–10:07Z |
| #75 | R3 package 1 (R3.1–R3.4) | `7ddab75` | 10-04 03:03:14 | 37172156819 ผ่าน (02:48–03:02) | 37172926281 **ล้มที่ bundle budget** 03:17:37Z: precache 15,787.4 > 15,783 kB (PR CI วัดได้ 15,778.7 kB) | ไม่เผยแพร่ | ไม่ (live = R2) |
| #76 | เพดาน precache +320 kB → 16,103 kB | `1d5b76b` | 10-04 09:43:43 | 37190361868 ผ่าน (attempt 3) | 37193082491 สำเร็จ 10:07:51Z | เผยแพร่ R3 package 1 | live 10:07Z–11:20Z |
| #77 | R3.5 ทั้งสองส่วน | `09a536e` | 10-04 10:54:04 | 37196002319 ผ่าน (head `a1eaccb`, 10:38–10:53; run ของ head แรก 37195309144 ถูกยกเลิก) | 37196877349 สำเร็จ 11:20:22Z | merge และเผยแพร่ | live 11:20Z–12:06Z |
| #78 | R3.3 ท่าพับเก็บ + แกนของตัวดาวเทียม | `f30590e` | 10-04 11:42:51 | 37198590545 ผ่าน (11:23–11:42) | 37199666485 สำเร็จ 12:06:51Z | merge และเผยแพร่ | live 12:06Z–20:29Z |
| #79 | docs: PROGRESS บันทึกการเผยแพร่ของ #78 | `80d5076` | 10-04 16:28:42 | ไม่มี (Markdown ล้วน ข้าม CI ตาม path filter) | ไม่มี (`deploy.yml` ข้าม `**/*.md`) | ไม่ rebuild แอป | — |
| #80 | R3.3 diagram + R3.1 DesignRef | `7662ead` | 10-04 17:08:51 | 37218178884 ผ่าน (head `8226416`, 16:49–17:08) | 37219398466 **ล้ม** 17:34:45Z ที่ journey `learner-profiles` (budget ผ่าน) | merge แล้ว; เผยแพร่ภายหลังพร้อม #81/#82 | ผ่าน `09cc2f5` (20:29:40Z) |
| #81 | วินิจฉัย reload ที่ช้า: start-up marks ในผลวินิจฉัยของ journey (`src/main.ts` +15, `harness.mjs` +5) | `77d3c00` | 10-04 18:17:22 | 37222509840 ผ่าน | 37223857005 **ล้ม** 18:43:11Z ที่ `browser (1)` (`learner-profiles`; `page.evaluate` timeout, request `flight.worker` ค้าง) | merge แล้ว; เผยแพร่ภายหลัง | ผ่าน `09cc2f5` |
| #82 | CPU ของ browser process และสถานะ GPU feature ในผลวินิจฉัย (`harness.mjs` +34) | `09cc2f5` | 10-04 20:02:44 | 37229312155 ผ่าน | 37230585947 **สำเร็จ** ทุกด่าน (journey 24/24, `learner-profiles` 326 s) deploy 20:29:40Z | merge และเผยแพร่ (#80–#82 พร้อมกัน) | **ใช่** (live ปัจจุบัน) |
| #83 | docs: PROGRESS บันทึกการเผยแพร่ #80–#82 | `5f9aa2e` | 10-04 20:31:34 | ไม่มี (Markdown ล้วน) | ไม่มี | `src/` เท่ากับ `09cc2f5` | — |

cron 37231924125 (17:43 UTC เริ่มจริง 20:23:43Z) บน `09cc2f5`: job `plan` รัน job อื่นข้าม

**ข้อสังเกต**
1. **merged ≠ published ≠ live** R3 package 1 merge เมื่อ 03:03Z แต่ live จริง 10:07Z ระหว่าง 7 ชั่วโมงนั้นเว็บยังเป็น R2; PROGRESS ต้องบันทึกทั้งสามสถานะแยกกัน → CO-2 (M-PLAN-017), R7.2
2. **สาเหตุเชิงโครงสร้าง** PR CI วัด data snapshot ที่ commit ไว้ แต่ Pages refresh ข้อมูลรายวันก่อนวัด PR CI จึงมองไม่เห็นการเติบโตของข้อมูล (CR:NEW-ci-1) #76 แก้โดยตั้งเพดานใหม่ที่ค่าวัด + 2 % (+320 kB) โดยไม่ระบุแพ็กเกจชดเชย → CO-1 (M-PLATFORM-063), D-38 (ดู S08), KPI-30 (ดู S04)
3. **cron รายวันเจอด่านเดียวกัน** `deploy.yml` cron 17:43 UTC refresh ข้อมูลแล้ววัด budget ซ้ำ รอบ 37150596767 เริ่มจริง 20:10Z (ช้าราว 2.5 ชม.) ถ้า #76 ไม่ merge รอบถัดไปบน `7ddab75` จะล้มแบบเดียวกัน precache โตต่อหลัง #76: 15,791.8 (#77 ส่วนแรก) → 15,800.4 (#77 ส่วนที่สอง) → 15,817.5 kB (ค่าล่าสุดในรายงาน R3 ของ #80 วัดที่ขั้น R3.3 diagram ก่อนขั้น R3.1 ที่เพิ่ม index อีก ~3.6 kB) ตามรายงานของ #80 headroom เหลือราว 285.5 kB (16,103 − 15,817.5) ที่ head `8226416` เมื่อวัดซ้ำบน `5f9aa2e` (PB@5f9aa2e, `npm run budget` บน committed snapshots) precache = 15,822.7 kB headroom **280.3 kB (1.74 %)** budget ผ่านใน Pages 37230585947 บนข้อมูลที่ refresh แล้ว แต่อ่านค่า kB จาก log ไม่ได้ (network policy) และข้อมูลที่ refresh แล้วเคยสูงกว่า PR CI 8.7 kB (10-04) headroom จริงบน Pages จึงต่ำกว่า 280.3 kB และต้องวัดใน CO-1 ถ้าไม่แยกเพดานโค้ดกับข้อมูล การเติบโตของข้อมูลจะกิน headroom นี้จนหมดอีก → CO-1 (M-PLATFORM-063)
4. **การเปลี่ยนแปลงหลังฐานของแผน (ตรวจถึง ~21:10Z)**
   - ฐานแผนบันทึกว่า #76 "เปิดอยู่" ตอนนี้ merge แล้ว → CO-1 ต้องตัดสินการขึ้นเพดานที่เกิดไปแล้วภายใต้ D-38 แทนการตัดสิน PR ที่ยังเปิด
   - ตามคำสั่งเจ้าของ "ทำต่อเลยครับ" (2026-10-04) ก่อน v2.0 ได้รับรอง มี merge ต่ออีก 7 PR: #77 (R3.5 ทั้งสองส่วน), #78 (R3.3 ท่าพับเก็บ), #79 (docs), #80 (R3.3 diagram + R3.1 DesignRef), #81 (start-up marks), #82 (diagnostics ของ browser process) และ #83 (docs) #80–#82 เผยแพร่พร้อมกันที่ `09cc2f5` หลัง Pages สองรอบล้มที่ `learner-profiles` เครดิตอยู่ใน 03.2 และ 03.4 → D-65 (ดู S08), CO-2 (M-PLAN-017)
   - เจ้าของประกาศ 2026-10-04: "เว็บไซต์อัปเดตแล้วครับ งานจาก #80, #81 และ #82 ขึ้นเว็บแล้ว ระยะ3ทำเสร็จหมดแล้ว" → G3 บันทึกว่าส่งมอบ (S05 §05.4) ส่วนรายการที่แผนเพิ่มใต้ R3 ตรวจกับโค้ดบน `5f9aa2e` แล้วย้ายเป็น R3+ ต่อยอด (S12) ไม่ถือว่าเสร็จ
5. **ข้อควรระวังเรื่องสำเนา** clone ในเครื่องอยู่ที่ `fbefa18` และ `origin/main` ใน clone (fetch ล่าสุด) คือ `5f9aa2e` ส่วน `main` บน GitHub คือ `5f9aa2e` (live `09cc2f5`) การอ้าง "main" ในเอกสารนี้ต้องระบุ SHA เสมอ → CO-2 (M-PLAN-017)

### 03.2 สิ่งที่ส่งมอบแล้ว (55 รายการ, แพ็กเกจ `DELIVERED`)

ทุกแถวมีสถานะ **เสร็จ** ช่อง "ส่งมอบโดย" มาจาก `status_evidence` ใน ledger ถ้าไม่ระบุ PR จะเขียนว่า "ก่อน R1" พร้อมไฟล์หลักฐาน รายการเหล่านี้ไม่มีขนาด เลน หรือ execution envelope เพราะเป็นบันทึกผลงาน ไม่ใช่งานที่ต้องทำ วิธีพิสูจน์คือไฟล์และ test ในช่องหลักฐาน ช่องสุดท้ายชี้ส่วนที่ยังค้างไปยังแพ็กเกจที่เป็นบ้าน ตาราง forward ทั้งหมดอยู่ใน S19 App A

**Launch (10)**

| รหัส | เรื่อง | ที่มาเดิม | ส่งมอบโดย | หลักฐาน | ส่วนที่ค้าง → |
|---|---|---|---|---|---|
| M-LAUNCH-001 | วงจร Setup/Flight/Analysis; ซ่อน setup เมื่อปล่อย (U11); ฉากกว้างขึ้น | PLAN:U11, R2S:R2.1 | #74 `da67341` | `7662ead:src/ui/flight-lifecycle.ts:22-32`; `r2-flight-shell` (viewport 638→940 px, ฉาก ≥60 % ที่ 1280×800) | layout ของ Analysis และแถบคำสั่ง → R2.1r (M-LAUNCH-002) |
| M-LAUNCH-005 | ตัวเลือกสัญกรณ์ย้ายไปแผง telemetry; ค่าเริ่มต้นตามภาษา | PLAN:U09, PLAN:D06 | #74 (ค่าเริ่มต้นมาจาก R1) | `telemetry.ts` `notationControl()`; journey `notation-defaults` | ยืนยัน D-34 (=PLAN:D06) → DEC |
| M-LAUNCH-007 | แถบควบคุมการบินบนมือถือ (A04) | PLAN:A04 | #74 | `#mobile-flight-bar`; `r2-flight-shell` phone() ที่ 390×844 | ปุ่มเล่นไม่มีชื่อ → CO-4 (M-LAUNCH-008); toast ทับแถบ → CO-4 (M-LAUNCH-066) |
| M-LAUNCH-009 | คงนาฬิกาสองตัวและ Space/Shift+Space; list ที่โฟกัสอยู่ไม่ส่งคำสั่งการบิน | R2S:R2.1 | #74 | `7662ead:src/ui/timeline.ts:496-516` stopPropagation | — |
| M-LAUNCH-010 | CameraPolicy: ผู้ใช้เลือกมุมแล้วมุมคงอยู่; Cinematic; ไม่มีปุ่ม reset (U03, U08) | PLAN:U03, PLAN:U08 | #74 (U08 ส่งใน R1) | `render/camera-policy.ts`; `tests/camera-policy.test.ts` (7) | A5 → CO-3 (D-36.A5); fallback ไม่แจ้ง → R2.2r (M-LAUNCH-012); `cam.intro` → CO-4 (M-LAUNCH-011) |
| M-LAUNCH-013 | ชุดการ์ด telemetry (R2.3 ขั้น 1), มีเวอร์ชัน, เก็บตามโปรไฟล์ | PLAN:U10 | #74 | `ui/telemetry-layout.ts` v1; tests (5) | dock/resize/reorder → R2.3s2 (M-LAUNCH-014) |
| M-LAUNCH-016 | ตัวเลือกเหตุการณ์ที่ซ้อนกันบนไทม์ไลน์ (A05) | PLAN:A05 | #74 | `ui/timeline-chooser.ts`; tests (4) | 320/390 px ใน TH/RU → CO-5 (M-LAUNCH-020); กติกา replay → CO-3 (D-39) |
| M-LAUNCH-080 | โครงหน้า section × level; จรวดที่ออกแบบเองใช้ในภารกิจได้ | RM:S01, RM:S02 | ก่อน R1 | `app-mode.ts` routeFromHash; mission-file v2; tests custom-vehicle* | Monte Carlo ของจรวดที่ออกแบบเองบินเป็น point-mass → CO-4 (M-LAUNCH-032) |
| M-LAUNCH-083 | Auto-Tune ทำใน worker; Monte Carlo ปิดงานสะอาด | RW:PHY-06, RW:A18 | #53 `5492625` | `attitude-tune-job.ts` + worker, Cancel | ยังไม่มีเปอร์เซ็นต์ความคืบหน้า → FX-5 (M-LAUNCH-035) |
| M-LAUNCH-087 | ชื่อ section/level บนมือถือ (ปุ่มเดียวเปิดตาราง, ลิงก์ 44 px) | RW:MOB-01 | #60 `4fc4988` + D-28 | `ui/section-nav*.ts`; `mobile-smoke` | คำอธิบายระดับบนมือถือ (สมมติฐาน OD:stage1/UX-03) → HU-1 |

**Orbit (16)**

| รหัส | เรื่อง | ที่มาเดิม | ส่งมอบโดย | หลักฐาน | ส่วนที่ค้าง → |
|---|---|---|---|---|---|
| M-ORBIT-048 | Orbit playground: องค์ประกอบวงโคจร 3 มิติ, ground track, กฎของเคปเลอร์, ปืนใหญ่ของนิวตัน, ทัวร์ | RM:O01 | ก่อน R1 | `orbit/kepler.ts`, `playground-model.ts`; VALIDATION §5 | วาดซ้ำขณะหยุด → EQ-4 (M-ORBIT-011); สถานะค้าง → FX-3 (M-ORBIT-002/003) |
| M-ORBIT-049 | ตัววางแผนการเปลี่ยนวงโคจร (Hohmann ถึง Edelbaum, Lambert, porkchop) | RM:O02 | ก่อน R1 | `orbit/maneuvers.ts`, `porkchop-view.ts` | Lambert คืน null 48/120 กรณี → R4.6 (M-ORBIT-020) |
| M-ORBIT-050 | บินต่อในวงโคจรด้วยเชื้อเพลิงที่เหลือจริง; เครื่องมืออายุวงโคจร | RM:O03 | ก่อน R1 | `orbit/budget.ts`; handoff พา propellant ไปด้วย | ไม่มี envelope v2 (S12 §12.3); fixture ของรูปแบบที่ ship → R3.1r (M-PLAN-028) |
| M-ORBIT-051 | การใช้งาน: สื่อสาร GEO, ถ่ายภาพ SSO, ดาวเทียมไทย | RM:O04 | ก่อน R1 | `applications.ts`, `coverage.ts`, `link.ts`; `data/thai-satellites.ts` | ข้อความเก่า "รุ่นถัดไป" → FX-3 (M-ORBIT-001) |
| M-ORBIT-052 | hand-off เข้า Orbit (v1, `parseHandoff` ปฏิเสธข้อมูลไม่สมเหตุผล) | RM:S03 | ก่อน R1 | `orbit/handoff.ts`; `tests/orbit-handoff.test.ts` | `origin.design` ส่งใน #80 (M-BUILD-001); ไม่มี v2 (S12 §12.3) |
| M-ORBIT-053 | SGP4/SDP4 ตรวจกับ AIAA 2006-6753 | RM:R01 | `c1bcd95` (2026-09-26) | `orbit/sgp4.ts`; `tests/sgp4.test.ts` | — |
| M-ORBIT-054 | snapshot ออฟไลน์, refresh ตามเวลา, นำเข้า TLE/OMM | RM:R02, RW:LS-06 | ก่อน R1 | `public/data/satellites.json`; cron `43 17 * * *` | ด่านตรวจข้อมูลเก่า → R7.4 (M-ORBIT-040) |
| M-ORBIT-055 | การผ่านฟ้าพร้อมการหักเหและความสว่าง | RM:R03 | ก่อน R1 | `orbit/passes.ts`; fixture Skyfield | digest ของ 249 เหตุการณ์ → R0.4 (M-PLAN-010) |
| M-ORBIT-056 | ความไม่แน่นอนของตำแหน่งตามอายุ element set | RM:R04 | `c2efebc` (R04) | `orbit/uncertainty.ts` (Flohrer 2008) | — |
| M-ORBIT-057 | ผู้ให้ข้อมูลออนไลน์/ออฟไลน์ (timeout 8 s, CelesTrak ≤ 1 ครั้ง/2 ชม.) | RM:S04 | ก่อน R1 | `7662ead:src/provider/data-provider.ts:61,72`; `7662ead:src/provider/satellites.ts:29` | ปุ่ม Retry ที่เคารพกติกา 2 ชม. → FX-3 (M-ORBIT-007) |
| M-ORBIT-058 | SSA: conjunction, Pc, CDM, คัดกรองทั้งแคตตาล็อกใน worker | RM:M01 | ก่อน R1 | `conjunction.ts`, `cdm.ts`, `screening*.ts` | ความล้มเหลวแสดงเป็น "stopped" → FX-4 (M-ORBIT-004) |
| M-ORBIT-059 | เวลาดาวเทียมถ่ายภาพผ่าน พร้อมเรขาคณิตอุปกรณ์ที่มีแหล่งอ้างอิง | RM:M02 | ก่อน R1 | `orbit/overflights.ts`, `sensors.ts` | `R_MEAN` นิยามซ้ำ → EQ-10 (M-PHYSICS-015) |
| M-ORBIT-060 | ทำนายการกลับเข้าบรรยากาศแบบไม่ควบคุม (CZ-5B) | RM:M03 | ก่อน R1 | `orbit/reentry.ts`, `ballistic.ts`, worker | 79 % เทียบเกณฑ์ 80 % → R4.6 (M-ORBIT-023) |
| M-ORBIT-061 | ผลด้านทหารบนแผนที่ และทัวร์ดาวเทียมจริง (5 จาก 8 หัวข้อ) | RM:P2.5-g, RM:P2.5-h | ก่อน R1 | `sky-panel.ts`, `ui/map.ts`, `sky-tour.ts` | หัวข้อที่เหลือ → ED-MIL-1 |
| M-ORBIT-062 | เครื่องออกแบบดาวเทียมและการออกแบบจากข้อกำหนด (D06/D07) | RM:D06, RM:D07 | #46, #59, #66 | `design/satellite-*.ts`; tests `d06-*`, `d07-*` | สัญญาแบบจำลองเดียว → R4.3 (M-ORBIT-046); template ที่ Δv ไม่พอ → DEC (D-47) |
| M-ORBIT-063 | Apollo 11 (PR #38) เป็น C01 พร้อม test เทียบ MSC-00171 | DP:D-11, RW:PR38-01 | #38 `783976e` | `physics/lunar/*`; Apollo suites | ป้าย Moon → FX-3 (M-ORBIT-029); ขยายเป็นเครื่องมือทั่วไป → R8 |

**Build (7)**

| รหัส | เรื่อง | ที่มาเดิม | ส่งมอบโดย | หลักฐาน | ส่วนที่ค้าง → |
|---|---|---|---|---|---|
| M-BUILD-034 | แคตตาล็อกชิ้นส่วนจากยาน 21 ลำ ประกอบใหม่แล้วบินเหมือนเดิม | RM:D01 | ก่อน R1 | `data/parts.ts`, `design/assemble.ts`; VALIDATION §8 | source ledger → R4.1 (M-PHYSICS-040) |
| M-BUILD-035 | Remix จรวดจริง (ยืด, เปลี่ยนเครื่อง, strap-on, fairing) | RM:D02, DP:S14 | ก่อน R1 | `design/remix.ts`; `tests/design-remix.test.ts` | บันทึก recipe → R3.1r (M-BUILD-011); กฎมวล → R4.3 (M-BUILD-018); strap-on → R3.6 (M-BUILD-022) |
| M-BUILD-036 | parts builder ระดับ Explore (Δv, T/W, คำเตือน, rating, Fly it) | RM:D03 | ก่อน R1 | `explore-model.ts`, `ratings.ts`, `explore-level.ts` | rating ที่ยังไม่ converge → FX-1 (M-BUILD-006); หน้าระดับ Engineer → DEC (D-21) |
| M-BUILD-037 | static fire, อุโมงค์ลม, flight readiness review | RM:D04 | ก่อน R1 | `test-stand.ts`, `tunnel.ts`, `readiness.ts` | typed target ส่งใน #75/#77 (M-BUILD-004); focus ช่องต้นเหตุ → R3.4r (M-PLAN-030) |
| M-BUILD-038 | sizing แบบพารามิเตอร์ และ Lagrange optimal staging | RM:D05 | ก่อน R1 | `optimal-staging.ts`, `sizing*.ts` | ขึ้นถึงวงโคจร 0/3 → R4.3 (M-BUILD-018) |
| M-BUILD-039 | design store ไม่ลบ record ที่อ่านไม่ได้ (B-01) | RW:B-01 | #41 `b674ccb`, #46 | `tests/design-store.test.ts` | — |
| M-BUILD-040 | Auto Tune ของ inspector ย้ายออกจาก main thread | DP:ENG-K06 | #53 `5492625` | `attitude-tune.worker.ts` | — |

**บทเรียนและห้องเรียน (6)**

| รหัส | เรื่อง | ที่มาเดิม | ส่งมอบโดย | หลักฐาน | ส่วนที่ค้าง → |
|---|---|---|---|---|---|
| M-LEARNING-039 | T02 ตรวจผลงาน: ครูบินซ้ำไฟล์ผลภายในเกณฑ์ที่ตั้งไว้ก่อน + CSV | RM:T02, RW:LES-03 | Phase 4 stage 3a | `lessons/check-view.ts`; recheck worker; Node กับ Chromium ต่างกัน ≤ 1.4e-12 s | six-DOF และ engine ที่สอง → R7.1 (M-LEARNING-014) |
| M-LEARNING-040 | T01 ครูเขียนบทเรียน แจกเป็นไฟล์หรือลิงก์ `?scenario=` | RM:T01 | Phase 4 stage 3a; ร่างแยกตามโปรไฟล์ใน R1 | `author-view.ts`; ลิงก์ ≤ 8,000 ตัวอักษร | เกณฑ์ POE → ED-PED-1 (M-LEARNING-019) |
| M-LEARNING-041 | สำรองข้อมูลห้องเรียน (S15) และตรวจความพร้อมออฟไลน์ | RW:S15 | #70 `523b44e` + R1.1 | `7662ead:src/projects/archive.ts:97-102`; `classroom/readiness.ts` | ครูกู้รายคน → ED-CLASS-1 (M-LEARNING-042) |
| M-LEARNING-048 | ใบงานและบทเรียนกรณีศึกษา 6.1–6.3 | RM:P2.5-i | ก่อน R1 | `worksheets/cases.ts`; USER-GUIDE §18 | — |
| M-LEARNING-049 | นโยบายล็อกเฉลย D-6 ("ผ่านโดยมีตัวช่วย") และรีเซ็ตรายบทเรียน | DP:D-6, RW:LES-04 | #47 `7070337` + R1.2 | `grader.ts` passedWithHelp; `progress.ts` clearRevealed | — |
| M-LEARNING-065 | สัญญาอนุญาต (Apache-2.0 / CC BY 4.0) และเครดิต | DP:D-1, RW:INF-09 | #44 `ff2ba55` | LICENSE, NOTICE.md, CITATION.cff | test เครดิต → R7.4 (M-ORBIT-044) |

**Platform (7) และ Physics (3)**

| รหัส | เรื่อง | ที่มาเดิม | ส่งมอบโดย | หลักฐาน | ส่วนที่ค้าง → |
|---|---|---|---|---|---|
| M-PLATFORM-029 | เพลงประกอบไม่อยู่ใน precache ของเว็บสาธารณะ แต่ precache ในรุ่นอินทราเน็ต (D-7) | DP:D-7 | ก่อน R1 | `pwa/manifest.ts` ON_DEMAND_PREFIXES; `ORBITLAB_PRECACHE_AUDIO=1` | — |
| M-PLATFORM-039 | worker ไม่ฝังพจนานุกรม (ratings 2,142→557 kB, readiness 2,156→571 kB) | RW:INF-01 | #68 `f2d2678` | `tests/worker-language-boundary.test.ts` | worker แบบอุ่นไว้ → EQ-8 (M-BUILD-030) |
| M-PLATFORM-040 | dynamic import ที่ได้ผลจริง และด่าน bundle budget ใน CI/deploy | DP:ENG-K04 | `76751b8` (2026-09-30) | `scripts/bundle-budget.mjs` ใน `ci.yml`/`deploy.yml` | แยกเพดาน → CO-1 (M-PLATFORM-063); gzip/กลุ่ม → R0.4 (M-PLAN-020) |
| M-PLATFORM-048 | build stamp ในแอป, `build-info.json`, `SHA256SUMS` | DP:ENG-K02 | ก่อน R1 | `src/build-info.ts`; `vite.config.ts` | — |
| M-PLATFORM-049 | main-tip guard, smoke ทุก push, heavy รายสัปดาห์, fleet รายเดือน | RW:LS-01, RW:CI-01 | `eed336d` + R1.5 | `deploy.yml`, `heavy.yml` | IS ยังเขียน cron 03:17 → R7.5 (M-PLATFORM-069); ช่องว่าง heavy → CO-6 |
| M-PLATFORM-076 | พื้นฐาน repo: PR template, repo-hygiene test, CHANGELOG, README Node 22 | DP:ENG-K05, RW:DOC-03 | #44/#45 | `tests/repo-hygiene.test.ts` | CHANGELOG บน `7662ead` ยังไม่มีบรรทัดของ R1 (#71/#72) และ #76 → CO-2 |
| M-PLATFORM-080 | คิว merge ก.ย.: #38 → #41 → #36 (ไม่ตามลำดับที่แนะนำ) | DP:W0-1, RW:MERGE-ORDER | `783976e` → `b674ccb` → `17bd60f` | git log | การเบี่ยงจาก D-12 → DEC (ดู S08) |
| M-PHYSICS-070 | PR #36 (กฎ fairing F14, มวล Proton) merge ทั้งก้อน | DP:D-12, RW:PR36-01 | #36 `17bd60f` (10-01) | fleet ผ่านบน `91ee372`; heavy ยังไม่เคยรันบน main ที่มี #36 | → CO-6 (M-PHYSICS-001) |
| M-PHYSICS-071 | Soyuz-2.1a six-DOF pitch หลุดหลังแยก booster (แก้แล้ว) | RW:PHY-01 | #63 `c109f98` | `rigid-soyuz-programme.test.ts` (มุม < 1.7°, อัตรา < 1.5°/s) | Max-Q รายรุ่น → R4.2 (M-PHYSICS-052) |
| M-PHYSICS-072 | ฟิสิกส์ Phase 2.5: NRLMSISE-00 + space weather, IERS UT1-UTC | RM:R05, RM:P2.5-a | ก่อน R1 | `propagator/msis.ts`, `density.ts`, `earth-orientation.ts`; VALIDATION §6–7 | ความ deterministic ของ MSIS → R0.4 (M-PHYSICS-002); Sun/MU_MOON → R4.5 (M-PHYSICS-020) |

**R3 ตามขอบเขต PLAN v1.2 และบันทึก R2 (6; ปิดใน refresh 2026-10-04)**

| รหัส | เรื่อง | ที่มาเดิม | ส่งมอบโดย | หลักฐาน | ส่วนที่ค้าง → |
|---|---|---|---|---|---|
| M-BUILD-001 | R3.1 ที่มาของข้อมูลและ revision ของแบบ (hand-off v1 + DesignRef) | PLAN:R3.1, PLAN:U05 | #75, #80 | `5f9aa2e:src/main.ts:984,:1020`; `handoff.ts:23,:69,:193,:202`; `mission-file.ts:52`; `design-ref.test.ts` 6 | DesignRef ใน Share/record ของ Engineer, fixture, build stamp → R3.1r (M-PLAN-028); journey cursor/เชื้อเพลิง → R7.1 (M-PLAN-025); แท็ก LTAN → R4.5 (M-PHYSICS-028) |
| M-BUILD-002 | R3.2 ภาพจรวดบน bench, Stacked/Apart, part card | PLAN:R3.2, PLAN:U04 | #75 | `engineer-level.ts:366,:409-448`; `bench-part.test.ts` 4; journey `r3-bench-drawings` | แถวตรวจรับที่แผนเพิ่ม → R3.2r (M-LAUNCH-076) |
| M-BUILD-003 | R3.3 ภาพดาวเทียม ท่าพับเก็บ แกน และแผนภาพ eclipse/link/footprint | PLAN:R3.3 | #75, #78, #80 | `satellite-drawing.test.ts` 7, `satellite-diagrams.test.ts` 2; `satellite-bench.ts:251` | ภาพใน Explore และ Watch → R3.3r (M-LAUNCH-081); test ความสด → R3.4r (M-BUILD-015) |
| M-BUILD-004 | R3.4 readiness แบบ typed พาไปชิ้นและค่า | PLAN:R3.4, PLAN:A03 | #75, #77 | `review-model.ts:182,:240`; `readiness-target.test.ts` 2, `subject-ref.test.ts` 2; `panel.ts:376` focusField | focus ช่องต้นเหตุ, target ของดาวเทียม → R3.4r (M-PLAN-030); ป้าย stale → M-BUILD-015 |
| M-BUILD-005 | R3.5 รวมเส้นทาง Build→Check→Launch→Result→Edit→Orbit | PLAN:R3.5, PLAN:A01/A02 | #77, #80 | journey `r3-first-launch`, `r3-result-setting`, `satellite`, `launch-explore`; รายงาน `R3.5-journey.md` | journey เส้นเดียว → R7.1 (M-PLAN-025); focus ช่อง → M-PLAN-030; เหตุอื่น → ED-LES-2 (M-LAUNCH-063) |
| M-LAUNCH-021 | บันทึก merge/CI/deploy ของ R2 | R2S:R2 | #74 (บันทึกใน PROGRESS) | PROGRESS บน `5f9aa2e` และ `R2-workspace.md` "verified; merged; published"; Pages 37169459230 | — |

หลักฐานร่วมของทั้งห้ารายการ R3: PROGRESS บน `5f9aa2e` แถว 22–26, Pages 37230585947 ที่ `09cc2f5` (journey 24/24) และคำของเจ้าของ 2026-10-04 (S05 §05.4 G3)

**ภาพรวมความสามารถรายด้าน** (นับจาก `assignment.tsv` หลัง refresh 2026-10-04; "เสร็จ" รวม 4 หลักการใน S02 ด้วย จึงรวมได้ 59 = 55 + 4)

| ด้าน | เสร็จ | บางส่วน | เปิด | เลื่อน | แทน/ปฏิเสธ | รวม | งานเปิดหลัก → |
|---|---|---|---|---|---|---|---|
| Launch | 11 | 15 | 54 | 4 | 3 | 87 | ปิดงาน R2 → CO-4; ประสิทธิภาพ render → EQ-2/EQ-3; a11y → R2.5 |
| Orbit | 17 | 11 | 35 | 1 | 2 | 66 | ความถูกต้อง → FX-3; ภารกิจ ISS → R5.1–R5.4; Moon → R8 |
| Build | 12 | 2 | 25 | 1 | 0 | 40 | ความปลอดภัยข้อมูล → FX-1; งานต่อยอดของภาพ/provenance → R3+ (R3.0–R3.6) |
| บทเรียน | 7 | 17 | 45 | 6 | 1 | 76 | ED-* และ HU-*; ข้อมูลบทเรียน → FX-2 |
| Platform | 9 | 14 | 53 | 3 | 3 | 82 | storage → R1.6; PWA → EQ-1/FX-7; CI → R7.3 |
| Physics | 3 | 5 | 34 | 1 | 4 | 47 | หลักฐานฐาน → CO-6; no-op → EQ-9/10/11; ความสมจริง → R4.1–R4.5 |
| M-PLAN (ใหม่) | 0 | 0 | 29 | 0 | 1 | 30 | R0.4, FX-8, R2.1r, R2.2r, R3.1r/R3.4r (027, 028, 030), EQ-13 (029), R6.x, R7.1/R7.2 |

### 03.3 R2: ส่งมอบแล้วเทียบกับที่เหลือ (R2S §2–§5)

**03.3.1 ความต้องการ R2 (PLAN §3)**

| ความต้องการ | สถานะ | ส่งมอบแล้ว | ที่เหลือ → |
|---|---|---|---|
| PLAN:U02 มุมมอง Engineer กะทัดรัด, ภาพจรวดใหญ่ขึ้น | บางส่วน | คืนพื้นที่ความกว้าง (M-LAUNCH-001) | แถบคำสั่งและ layout ของ Analysis → R2.1r (M-LAUNCH-002) |
| PLAN:U03 Watch เลือกและคุมกล้องเอง | เสร็จ รอยืนยัน A5 | M-LAUNCH-010 | A5 → CO-3 (D-36.A5) |
| PLAN:U08 ไม่มีปุ่ม reset กล้อง | เสร็จ (R1) | M-LAUNCH-010 | — |
| PLAN:U09 สัญกรณ์ตามภาษา | เสร็จ (R1; ย้ายตำแหน่งใน R2) | M-LAUNCH-005 | ยืนยัน D-34 → DEC |
| PLAN:U10 เลือกข้อมูลและจัดหน้า Engineer | บางส่วน | presets และ Custom (M-LAUNCH-013) | dock/resize/reorder → R2.3s2 (M-LAUNCH-014); Docking preset → R5.4 (M-LAUNCH-015) |
| PLAN:U11 ซ่อน setup ระหว่างบิน | เสร็จ (เฉพาะ Engineer, A1) | M-LAUNCH-001 | A1, A3 → CO-3 (D-36.A1/A3) |
| PLAN:U16 คำสั่ง vs ระดับเครื่องจริง vs แรงขับ (ส่วน UI) | บางส่วน | แถว `engines` ใน HUD เต็ม | HUD แบบย่อ/onboard/kN/Soyuz 81 % → CO-4 (M-LAUNCH-004); คอลัมน์ CSV → R4.2 (M-PHYSICS-052, D-57) |
| PLAN:A04 ควบคุมการบินบนมือถือขณะอ่านกราฟ | เสร็จ | M-LAUNCH-007 | ชื่อปุ่ม → CO-4 (M-LAUNCH-008) |
| PLAN:A05 เลือกเหตุการณ์ที่ซ้อนกัน | เสร็จ ยังขาดการตรวจบางส่วน | M-LAUNCH-016 | 320/390 px ใน TH/RU → CO-5 (M-LAUNCH-020); กติกา replay → CO-3 (D-39) |
| G2 ภาพหน้าจอ + D08 | เปิด | ภาพถ่ายจาก `r2-flight-shell` | ลงนาม → CO-3 (M-LAUNCH-017/018/019) |
| journey ของ R2 ใน PR CI | บางส่วน | รันครั้งแรกใน Pages 37169459230 | smoke slice → CO-5 (M-LAUNCH-020) |
| "หยุดชั่วคราวไม่ทำให้การจำลองเริ่มใหม่" | ถูกละเมิด | — | P0 RW:LUI-01: guard `if (!this.playing) this.preview(cfg)` ที่ `7662ead:src/main.ts:560` → CO-4 (M-LAUNCH-027) |

**03.3.2 โมดูลใหม่ที่งานต่อไปต้องต่อยอด (ห้ามสร้างตัวที่สอง)**

| โมดูล | สัญญาที่สร้าง | ข้อจำกัดที่รู้ | งานที่ต่อยอด |
|---|---|---|---|
| FlightLifecycle (UI) `ui/flight-lifecycle.ts` | `missionStage()`, `setupCollapsed()`; `body[data-flight-stage]`, `body[data-setup]` | ครอบเฉพาะขา mission stage ส่วนนาฬิกาจริงและ cursor ยังอยู่ใน `App.player/playing`; `launched` อ่านจาก `panel.isRunning()`; `syncLifecycle()` รันทุก rAF | ADR → R0.2r (M-PLAN-013); R3.1r; R2.1r |
| CameraPolicy `render/camera-policy.ts` | owner `cinematic`/`manual`; `choose`/`resume`/`onPhase`/`onTarget` | `App.autoCamera` ถูกลบแล้ว งานใหม่ต้องใช้ `camPolicy`; fallback ไม่แจ้งผู้ใช้ | R2.2r, R2.5 (reduced motion), R2.6, R6.2 |
| telemetry-layout schema v1 | `orbitlab.telemetryLayout` เก็บตามโปรไฟล์; อยู่ใน `WORKSPACE_KEYS` | การเปลี่ยนใดๆ ต้องขึ้นเวอร์ชันพร้อม migration; ยังไม่มีตำแหน่งหรือปุ่ม reset layout | R2.3s2 (M-LAUNCH-014), R5.4 (Docking preset) |
| engine-levels `ui/engine-levels.ts` | `engineLevels(frame)` อ่าน `effectiveThrottle` ของ stage และ booster | ใช้ในที่เดียว (HUD เต็ม) | CO-4 (M-LAUNCH-004), EQ-12 (M-LAUNCH-038), R4.2 (M-PHYSICS-052) |
| timeline-chooser `ui/timeline-chooser.ts` | `chooserEntries`, `chooserFocusMove`; `Timeline.closeChooser()` | แสดงเหตุการณ์ได้ถึง recording head ซึ่งอาจเลย cursor ขณะ replay | R2.6 (M-LAUNCH-062), CO-3 (D-39) |

**03.3.3 ค่าใช้จ่ายรายเฟรมที่ R2 เพิ่มหรือขยาย (R2S §5 แบบย่อ)**

| รหัสเดิม | ข้อเท็จจริงบน `da67341` | ผล | → |
|---|---|---|---|
| CR:P12 | `telemetry.update()` วาดกราฟทุกกราฟทุก 0.5 s แม้การ์ดถูกซ่อนด้วย `.card-off` (Engineer ซ่อน 3–6 กราฟ, Explore ซ่อน 7 จาก 8) กราฟที่ซ่อนมี `clientWidth` 0 จึงตกไปใช้ขนาด 300×120 | ทำงานโดยไม่มีผลบนจอ | CO-4 (M-LAUNCH-022), KPI-12 |
| CR:P24 + ใหม่ | `syncLifecycle()` ทุก rAF อ่าน `aria-expanded`, `body.dataset`, ข้อความ `#clock`, `mfb-*` และเรียก `t()` 2 ครั้ง; บน desktop แถบมือถือถูก CSS ซ่อนแต่ยังเขียนข้อความ | DOM read/write ต่อเฟรม | EQ-3 (M-LAUNCH-024) |
| timeline | เมื่อ chooser เปิดอยู่ `markChooserCurrent()` คัดลอก เรียง และ `querySelectorAll` ทุก rAF แม้ cursor ไม่ข้ามเหตุการณ์ | ต้นทุนเล็ก แต่เกิดทุกเฟรม | EQ-3 (M-LAUNCH-024) |
| CR:P6 | `updateVisuals` ยังรันขณะฉากถูกบัง (เรียกที่ `7662ead:src/main.ts:2047`, guard ที่ `7662ead:src/main.ts:2580`) | R2 เพิ่มการอ่าน `sceneCovered` แต่ไม่ได้ gate | EQ-3 (M-LAUNCH-040) |
| CR:D14 | เปลี่ยนสัญกรณ์กลางการบินเรียก `applyLanguage()` ทั้งชุด (render panel ที่ซ่อนอยู่ และสร้าง select ที่ผู้ใช้กำลังใช้ใหม่จนเสียโฟกัส); เปลี่ยนภาษาเรียกซ้ำ 2 ครั้ง | เสีย focus, ทำงานซ้ำ | CO-4 (M-PLATFORM-037 แล้วตามด้วย M-LAUNCH-025) |
| CR:D24 | สถานะเครื่องยนต์จัดรูปแบบแยกกัน 5 ที่; HUD แบบย่อ, onboard และ CSV ยังแสดงแค่คำสั่ง | ตัวเลขไม่ตรงกันระหว่างมุมมอง | CO-4 (M-LAUNCH-004), EQ-12 (M-LAUNCH-038) |
| CSS | `@media (max-width:1180px) and (min-width:861px)` ซ้ำ 2 บล็อก; กฎซ่อนแยกเป็น 2 ที่ | ดูแลยาก | CO-4 (M-LAUNCH-026) |
| CR:P29 | `panel.render()` เต็มชุดเมื่อสลับ dynamics | ยังอยู่; partial re-render ถูกปฏิเสธ | REJECTED (M-LAUNCH-033, ดู S19) |
| CR:B11 | `touch-action:none` บน `#gl` | ยังอยู่; แถบ A04 ช่วยบรรเทาอาการ | DEC (M-LAUNCH-039, รอหลักฐานจากอุปกรณ์) |

### 03.4 R3: ส่งมอบครบ (#75–#80; เผยแพร่ล่าสุดที่ `09cc2f5`; G3 2026-10-04)

**ส่งมอบใน package 1** (ตาม `R3-design-views.md`; รายละเอียดอยู่ใน S12 §12.1)
- **R3.1 provenance:** `orbitHandoffNow()` และ `currentAsReference()` (`7662ead:src/main.ts:969`, `:1009`) (บน `5f9aa2e` คือ `:971`, `:1011`) เปลี่ยนไปใช้ `flownMission(sim.cfg)` แทน `panel.missionState()` รายงานติดป้ายว่าเป็น **hypothesis** เพราะไม่พบเส้นทางที่ทำให้ร่างต่างจากค่าที่บินจริง handoff ยังเป็น v1 → DELIVERED (M-BUILD-001); ลิงก์รายงาน → R3.1r (M-LAUNCH-030)
- **R3.2 bench:** วาด `StackSvg` ตามสัดส่วนจาก `VehicleSpec` พร้อม part card ("Fire it on the test stand" / wind tunnel) ใช้ SVG ล้วน ไม่สร้าง WebGL ใหม่ (`design/bench-part.ts`, `ui/build/engineer-level.ts`) → DELIVERED (M-BUILD-002); ต่อยอด R3.2r (M-LAUNCH-076)
- **R3.3 schematic:** ภาพดาวเทียมจาก `SatelliteDesign` พร้อม assumption ที่ระบุชื่อ และคำเตือน `bodyCellsExceed` (`design/satellite-drawing.ts`, `ui/build/satellite-svg.ts`) → DELIVERED (M-BUILD-003); ต่อยอด R3.3r (M-LAUNCH-081)
- **R3.4 "Show the part":** `readinessTarget()` ใน `review-model.ts` ตัดสินจาก stage/booster/path/code ไม่อ่านข้อความแปล → DELIVERED (M-BUILD-004); ต่อยอด R3.4r (M-PLAN-030)
- **หลักฐานที่รันจริงตามรายงาน:** unit 10,113/10,113 (283 ไฟล์); browser 7/7 ผ่าน (485 s) บน Chromium 141 ในเครื่อง; journey ใหม่ `r3-bench-drawings` รันด้วย Node 22.22.0 ในเครื่อง ขณะที่ VER: กำหนด 22.23.3 หลักฐานที่ผูกกับ SHA จึงเป็น CI 37172156819 → R0.4 (M-PHYSICS-060), D-3/D-4

**ส่งมอบต่อหลัง package 1** (ตาม `R3.5-journey.md` และ `R3-design-views.md` บน `7662ead`; ทำตามคำสั่ง "ทำต่อเลยครับ" ก่อน v2.0 ได้รับรอง → D-65)
- **#77 R3.5 ทั้งสองส่วน (`09a536e`):** ผลการบินมี "Show the setting" ที่เลือก field จาก cause แบบ typed โดยไม่แก้ค่า และคำแนะนำ before → after เฉพาะ 3 cause ที่มีตัวเลขรองรับ (ใช้กับ mission ใหม่เท่านั้น); eyebrow บอกที่มาของ mission; ขั้น Build › Check › Launch › Result › Orbit; Home "Try a launch yourself" (first-launch template); Watch → สำเนาไว้ทดลอง; Orbit แยก "ต่อจากเที่ยวบิน" กับ "วางวงโคจรโดยตรง"; Explore builder "Show its settings" รายงานรัน unit 10,123/10,123 และ browser 8/8 ในเครื่อง (Node 22.22.0) หลักฐานที่ผูก SHA คือ CI 37196002319 และ Pages 37196877349
- **#78 R3.3 ท่าพับเก็บ (`f30590e`):** ดาวเทียมที่มีปีกวาดแบบพับเก็บสำหรับการปล่อยได้ (assumption `stowedPanels` แสดงใต้ภาพ) พร้อมแกน +X/+Y/+Z ของตัวดาวเทียม
- **#80 R3.3 diagram + R3.1 DesignRef (`7662ead`):** diagram เงา/แดด, link และ footprint ของกล้องจาก `SatelliteFigures` ชุดเดียวกับตาราง (ไม่มีฟิสิกส์ของตัวเอง); `src/design/design-ref.ts` พา id และ revision (เวลาบันทึกล่าสุด) ของแบบผ่าน Fly it, Send to Orbit, stored mission, ชื่อ mission และ hand-off ไป Orbit แบบ backward-compatible

**เครดิตราย item** (สถานะใน `assignment.tsv` หลัง refresh 2026-10-04 ตรวจบน `5f9aa2e` ตาม `refresh/r3-audit.tsv` 53 แถว; CO-2 ลงตารางนี้ใน repo → M-PLAN-017)

| รหัส | สถานะ | เครดิต | ที่เหลือ → |
|---|---|---|---|
| M-BUILD-001 | **เสร็จ** (v1.2 R3.1) | #75 provenance; #80 DesignRef | → M-PLAN-028 (R3.1r), M-PLAN-025, M-PHYSICS-028 |
| M-BUILD-002 | **เสร็จ** | #75 bench | → M-LAUNCH-076 (R3.2r) |
| M-BUILD-003 | **เสร็จ** | #75/#78/#80 | → M-LAUNCH-081 (R3.3r), M-BUILD-015 |
| M-BUILD-004 | **เสร็จ** | #75/#77 | → M-PLAN-030, M-BUILD-015 |
| M-BUILD-005 | **เสร็จ** | #77/#80 | → M-PLAN-025, M-PLAN-030, M-LAUNCH-063 |
| M-BUILD-013 | เปิด (ยืนยัน `5f9aa2e:src/ui/build/explore-level.ts:752`) | — | → R3.5r |
| M-LAUNCH-063 | บางส่วน | #77 | → ED-LES-2 |
| M-LAUNCH-067 | บางส่วน | #77 | การ์ดตามกลุ่ม (HU-1, D-8) → R3.5r |
| M-LAUNCH-068 | เปิด | — | → ED-I18N-2 |
| M-LAUNCH-076 | เปิด | #75 | → R3.2r |
| M-LAUNCH-030 | **บางส่วน** | #75 | ลิงก์รายงาน `5f9aa2e:src/main.ts:1047` → R3.1r |
| M-LAUNCH-021 | **เสร็จ** | PROGRESS/R2 report | — |

**ผลต่อข้อมูลที่เก็บและส่งต่อ (เข้ามาก่อน R1.6)**
- #77 เพิ่ม origin `template` (`7662ead:src/ui/workspace-mission.ts:45`) ซึ่งเปลี่ยนกติกาว่าเมื่อไร mission ที่เก็บไว้ (`orbitlab.mission`) ถูกเขียนหรือคืนค่า: template ไม่ถูกเก็บจนกว่าจะถูกแก้ และเข้า workspace แล้วไม่สลับกลับ (`:110`)
- #80 เพิ่ม field แบบ optional สองตัว: `MissionDocument.design` (`7662ead:src/config/mission-file.ts:52`) ซึ่งเขียนลง stored mission ที่ `7662ead:src/main.ts:1094` ข้าง `mission` ที่ parser อ่าน; และ `OrbitHandoff.origin.design` (`7662ead:src/orbit/handoff.ts:69`) โดย hand-off ยังเป็น version 1 (`:23`) และค่าที่อ่านไม่ได้ทำให้ `parseHandoff` ปฏิเสธทั้ง hand-off (`:203`)
- ทั้งสองเข้ามาก่อนการเสริมความแข็งแรงของ storage (R1.6) และก่อน ADR ของ Handoff ดังนั้น fixture ของ differential harness และ fixture ตัวอ่านเก่าต้องรวม field เหล่านี้ (ไม่มี envelope v2, S12 §12.3) → R1.6 (ขั้น b), R0.2r (M-PLAN-013), R3.1r (M-PLAN-028), D-22
- R3CR-13 (อ่านโค้ดบน `5f9aa2e`): Fly it เขียน `orbitlab.mission` 3 ครั้ง ครั้งแรกอาจเขียน ref ของ revision เก่า; เริ่มแอปที่มี ref เขียน 2 ครั้ง; เอกสารที่ version ใหม่กว่าถูกถือว่า usable (`mission-file.ts:314`) จึงถูกเขียนทับ → M-PLAN-031 (P1, R1.6 PR 2b, S10 §10.3.1; เกณฑ์ v1.2 R3.1 "newer unsupported state ปฏิเสธ" ที่ยังไม่ถึง รับเป็นข้อจำกัดพร้อม G3), M-PLAN-028 (R3.1r)

**การขึ้นเพดานงบ** (`budgets.json` `_notes` บน `7662ead`; index / CSS / i18n kB)
- #75: +12 / +3 / +12 (2,588 → 2,600, 170 → 173, 1,690 → 1,702); #76: precache 15,783 → 16,103 (+320)
- #77: **+12 / +2 / +9** แบ่งสองส่วน +8 / +2 / +5 แล้ว +4 / 0 / +4 (→ 2,612, 175, 1,711)
- #80: **+10 / +2 / +9** (index +7 แล้ว +3 → 2,622; CSS → 177; i18n → 1,720); #78 ไม่แก้ `budgets.json` (โน้ต R3.3 ของ #80 รวมท่าพับเก็บไว้ด้วย)
- #81/#82 ไม่แก้ `budgets.json` (เพดานบน `5f9aa2e` = `7662ead`)
- นับจากเพดานหลัง R1 ถึง `5f9aa2e`: index 2,573 → 2,622 (+49), CSS 169 → 177 (+8), i18n 1,690 → 1,720 (+30), precache +320 ทุกครั้งเป็น "ค่าวัด + ~2 %" โดยไม่มีแพ็กเกจชดเชย → CO-2 (M-PLATFORM-064), D-38, KPI-30

**PROGRESS บน `5f9aa2e` (หลัง #83):** แถว 22–26 (R3.1–R3.4 package 1, R3.5, R3.3 stowed, R3.3 diagrams, R3.1 design ID/revision) เขียน "Verified; merged; published" ครบ (#83 แก้แถวของ #80 หลัง merge) แต่ยังค้าง: แถว R3.5 ลงท้าย "design ID/revision (schema change) remains", แถว R3.3 stowed ลงท้าย "…diagrams remain", บรรทัด Open 77 และ 86, ไม่มีแถว G3; `R3-design-views.md:7,:88` และ `R3.5-journey.md:81` ยังเขียนว่า G3 ยังไม่ผ่าน (`R3.5-journey.md:80` ยังเขียนว่า design revision ยังไม่มี); `IMPLEMENTATION-STATUS.md` ไม่เปลี่ยนตั้งแต่ `da67341` (`:573` "draws no picture", `:578` ช่วง ~180 ms) → CO-2 (M-PLATFORM-064, M-PLAN-017)

### 03.5 การวิเคราะห์ประสิทธิภาพ (PB บน `fbefa18` และ `5f9aa2e`)

**วิธีวัดและข้อจำกัด**
- **วิธีวัด:** `measure.mjs` วัด 3 รอบ ใช้ Chromium 141 headless + SwiftShader บน 4 CPU ที่ 1280×800, DPR 0.5 เปิด browser profile ใหม่ทุกรอบ server นับ byte เองโดยไม่บีบอัดและส่ง `no-cache`
- **ข้อจำกัด:** SwiftShader ใช้ CPU เกือบหมด fps จึงอยู่ที่ 1–13 และไม่ใช่ fps ของอุปกรณ์จริง; shader disk cache เย็นทุกรอบ; วัดได้แค่ byte ไม่ได้วัดเวลาส่ง; heap นับเฉพาะ main thread; โปรไฟล์ 1.5 MB เป็น padding สังเคราะห์
- `src/render/` ตั้งแต่ `fbefa18` ถึง `5f9aa2e` เพิ่มแค่ `camera-policy.ts` (R2) ส่วน `main.ts` และ UI โตขึ้น (03.8) จึงวัดซ้ำแล้วเป็น PB@5f9aa2e (ด้านล่าง); การย้ายสคริปต์เข้า repo อยู่ใน R0.4 (M-PLATFORM-041)
- **ตัวเลขที่ใช้ได้ข้ามเครื่อง:** byte, จำนวน program, context, draw call, การอ่าน storage, ms ของ JSON

**เริ่มแอป: cold (first visit) เทียบ warm (มี service worker)** (median, ช่วง min–max)

| ตัวชี้ | cold | warm |
|---|---|---|
| interactive | 16,416 ms (15,953–16,748) | 6,582 ms (6,183–6,936) |
| รอ shader compile/link | 13,912 ms, 56 programs, ซ้ำ 0 | 4,509 ms, 49 programs |
| อัปโหลด texture (รวม decode JPEG) | 1,709 ms, 89 ครั้ง, 104 Mpx | — |
| longest task / TBT | 15,449 / 16,028 ms | TBT 6,134 ms |
| request / byte ก่อน interactive | 18 / 9,456 kB raw (gzip ประมาณ 5,511 kB) | 0 request ถึง server |
| WebGL context / canvas 2D | 2 (`.pg-canvas` เมื่อ 928 ms ก่อน `#gl` เมื่อ 1,689 ms) / 37 | 2 |
| การอ่าน profile record | 47 (44 ระหว่าง startup) | — |

**การเปลี่ยนหน้า (อาการกระตุกที่ผู้ใช้รู้สึก)**

| | เข้า Orbit | เข้า Launch + configure | กด Launch (ignition) |
|---|---|---|---|
| ช่วงเว้นระหว่างเฟรมนานสุด | 4,033 ms | 4,800 ms | 2,700 ms |
| shader program ที่สร้าง / ซ้ำกับที่ compile แล้วใน context เดียวกัน | 7 / 0 | 19 / **18** | 19 / **19** |
| รอ shader | 2,879 ms | 2,059 ms | 2,782 ms |

**วัดซ้ำบน main ปัจจุบัน (PB@5f9aa2e, 2026-10-04 21:26Z, 3 รอบ; `results/baseline-5f9aa2e.*`, `compare-fbefa18-5f9aa2e.md`)**
1. เครื่องวัดเปลี่ยน: Xeon 4 คอร์ 2.10 GHz แทน 2.80 GHz ของ fbefa18 (Chromium 141, 1280×800 DPR 0.5, ภาษาอังกฤษเหมือนเดิม) จึงเทียบได้เฉพาะ byte, จำนวน program/context/draw และจำนวนการอ่าน ห้ามอ่านค่า ms ที่ต่างเป็นผลของโค้ด
2. ไม่มี KPI ใดขยับ: program ซ้ำ 18 ตอนเข้า Launch และ 19 ตอน ignition, 2 WebGL context ก่อนเปิด Orbit, Orbit ที่หยุดยังวาด ~13.75 ครั้ง/s ที่ 8 draw ต่อเฟรม, precache ที่ดาวน์โหลดซ้ำ ~60 % ของไบต์หลัง interactive
3. R2/R3 ทำให้โตแบบ deterministic: ไบต์ถึง interactive 9,456 → 9,548 kB (+92: JS +81.3, CSS +9.6, HTML +1.3); precache ที่ดาวน์โหลดหลัง interactive 15,741 → 15,834.2 kB (ซ้ำ 9,438.5); DOM 4,145 → 4,317 node และ listener +21; การอ่าน profile record 47/44 → 49/46; โปรไฟล์ 1.5 MB อ่าน 66 → 69 MB, JSON.parse ใหญ่ +4 และ stringify +2 ครั้ง
4. headroom ของงบ: index 1.7 kB, i18n 1.1 kB, chunk อื่น 0.2 kB, lifetime-altitude 0.2 kB, precache 280.3 kB (committed snapshots)
5. ค่าเวลาทุกแถวทับช่วงของ fbefa18 ยกเว้นบางแถวที่ต่ำหรือสูงกว่า ซึ่งไม่ใช่หลักฐานของโค้ด (warp 100× 7.28× บนเครื่องที่ช้ากว่า โดย `flight.worker` เป็นไบต์เดียวกัน); **ไม่อ้างความเร็วหรือการถดถอยจาก #81/#82**
6. ยังไม่ได้วัด: ไบต์ของ TH/RU (สคริปต์ตั้ง `lang:'en'`), GPU จริง, header ของ Pages และ profile attribution

**หลักฐานจากการสืบสวน `learner-profiles` (PROGRESS บน `5f9aa2e`, ไม่มีรหัสใหม่)** ระหว่าง reload ที่ค้าง main thread รอสถานะ shader program (`getProgramParameter`/`getShaderInfoLog`) ราว 11 s ขณะ SwiftShader compile และ GPU process ใช้ราว 3.6 จาก 4 core เมื่อมีอะไรเคลื่อนไหว (scene loop หรือ CSS animation แบบไม่สิ้นสุด `lesson-glow`/`home-cue`) และราว 0.3 core เมื่อไม่มี ข้อนี้สอดคล้องกับ PB (รอ shader 13.7–13.9 s; GPU process ~3.6 core ในทุกฉากที่วัด) → EQ-2 (M-PLAN-001), EQ-4 (ต้นทุนขณะนิ่ง) แบบ "ต้องวัด"; การหยุด CSS animation เมื่อมองไม่เห็นเป็น identical-output เฉพาะสถานะที่มองไม่เห็นเท่านั้น; สาเหตุของ stall ยังไม่ทราบ → R7.1 (M-PLATFORM-061)

**สถานะคงที่ (ต่อวินาที)** และ **storage**
- **home:** 1.4 fps, rAF 7.7 ms (p95 11.5), 152 draws/frame; **pad:** 109 draws/frame; **Orbit:** เล่นและหยุดได้ค่าเท่ากัน คือ **13 fps, 8 draws, main thread 40 ms/s**
- **บินที่ 1×:** rAF 7.8 ms (p95 13.9), sim/wall 0.99, worker 18 ms/s; **บินที่ 100×:** rAF 8.5 ms (p95 17.2), sim/wall **8.3**, worker 796 ms/s; storage ในหน้าต่างเหล่านี้อ่าน 0 เขียน 0
- **workspace storage:** ตอน startup อ่าน profile record ทั้งก้อน 44 ครั้งไม่ว่าโปรไฟล์ใหญ่เท่าไร ที่ 1.5 MB เท่ากับอ่านข้อความ 66 MB, `JSON.parse` 88 ครั้ง (270 ms) และ `JSON.stringify` 45 ครั้ง (112 ms) `configure_mission` หนึ่งครั้งอ่าน 2 รอบและเขียนใหม่ 1 รอบ (อ่าน 3 MB เขียน 1.5 MB)

**งานซ้ำล้วน (ผลเหมือนเดิม งานน้อยลง)** การลดเวลาที่คาดไว้ทุกข้อยังเป็นสมมติฐาน **ต้องวัด** ด้วย `--compare`
1. **shader compile ซ้ำ** ตอนเข้า Launch และกด Launch สร้าง program ที่เหมือนของเดิม 18/19 ตัว สาเหตุในโค้ดคือ `setupViews` dispose view เก่าก่อนสร้างใหม่ และ `prewarm()` ป้องกันไม่ได้ → EQ-2 (M-LAUNCH-041, M-LAUNCH-042), KPI-05/06
2. **อ่าน profile ซ้ำ** 44 ครั้งต่อ startup ต้นทุนโตตามขนาดโปรไฟล์ (เพดาน 8 MB) → R1.6 (M-PLATFORM-003/006/007), KPI-13
3. **ดาวน์โหลดซ้ำตอนเข้าครั้งแรก** service worker ดึง 9,348 kB ที่หน้าเว็บเพิ่งโหลดไปแล้วซ้ำอีกรอบด้วย `cache:'reload'` (CR:NEW-pwa-1) → EQ-1 (M-PLATFORM-021), KPI-02
4. **Orbit ที่หยุดอยู่ยังวาดใหม่** ราว 13 ครั้งต่อวินาที → EQ-4 (M-ORBIT-011), KPI-09

**ผลเหมือนเดิมแต่ต้องระวัง** (ต้องพิสูจน์ว่า pixel ตรงกันและความหน่วงไม่ย้ายไปที่อื่น)
1. **โหลดสามภาษาตอนเริ่ม** i18n chunk 1.69 MB มีข้อความไทยราว 0.59 MB และซีริลลิกราว 0.40 MB → EQ-6 (M-PLATFORM-031)
2. **texture แผนที่ 2D ที่ยังไม่แสดง** `earth_atmos_2048.jpg` (513 kB) ถูกโหลดเพิ่มจากรุ่น 4096 (`7662ead:src/main.ts:550`) ยังไม่ยืนยันว่าต้องใช้ตอนเริ่ม → EQ-7 (M-LAUNCH-045)
3. **context ที่สองของ Orbit** สร้างตอนเริ่มทั้งที่ซ่อนอยู่ แต่การเข้า Orbit ยังค้าง 4 s (shader 7 ตัว + upload 4096²) การสร้างแบบ lazy อย่างเดียวไม่แก้อาการค้างนี้ → EQ-4 (M-ORBIT-010), R3.0 (M-LAUNCH-046), KPI-07
4. **decode texture บน main thread** (1.7 s) จะย้ายไป ImageBitmap ได้ก็ต่อเมื่อ pixel ตรงกันทุกจุด → EQ-2 (M-PLAN-001)

**ข้อขัดแย้งเรื่อง warm กับ cold ที่ยังไม่มีคำตอบ**
- OD:stage1 (Chromium 151, DPR 1): warm ช้ากว่าใน 6/6 คู่ เช่น first paint desktop 7.28 s เทียบ 0.37 s และ app-ready 29.6 s เทียบ 23.6 s
- PB (Chromium 141, DPR 0.5, profile ใหม่): warm 6.6 s เร็วกว่า cold 16.4 s
- harness ต่างกันจึงยังไม่รู้สาเหตุ ห้ามอ้างทั้งสองแบบจนกว่าจะวัดด้วย harness เดียวที่ใช้ header แบบ Pages และ n ≥ 5 → R0.4 (M-PLAN-002), KPI-08

**JavaScript ตอนเริ่ม ราว 4.8 MB** (วัดได้ 4,778.5 kB raw ก่อน interactive)
- index ≈ 2,573 kB, i18n ≈ 1,690 (วัดใน R1 ได้ 1,685.0), lesson-file ≈ 347 (343.9), catalog ≈ 180 (172.8); นอกจากนี้มี flight worker 578 kB และ CSS 166 kB; บน `7ddab75` index 2,598.7 และ i18n 1,700.7 kB; ค่าวัดล่าสุดในรายงานของ #80 index 2,620.2, i18n 1,718.2, CSS 175.7 kB
- หมายเหตุใน budgets ยอมรับเองว่าการแยก chunk "ไม่ได้เอาออกจากการโหลดตอนเริ่ม"
- budget วัดเฉพาะ raw ไม่มีคอลัมน์ gzip/brotli และไม่มีกลุ่ม initial-load → R0.4 (M-PLAN-020), EQ-6, EQ-7 (M-PLATFORM-034)
- การประหยัดต่อภาษาที่ ledger ประเมินไว้ (EN −1.25, TH −0.61, RU −0.76 MB) เป็นสมมติฐาน **ต้องวัด** → EQ-6

**precache 15.7 MB ซ้ำกับที่โหลดไปแล้ว 9.3 MB**
- หลัง interactive มี 70 request รวม 15,741 kB: JS 21 ไฟล์ 5,621 kB, worker 12 ไฟล์ 4,090 kB, ภาพ 21 ไฟล์ 4,376 kB, JSON 10 ไฟล์ 1,405 kB, CSS 173 kB
- 9,348 kB ในนั้นเป็นไฟล์ path เดียวกับที่หน้าเว็บโหลดไปแล้ว; ห้องเรียน 40 เครื่องที่ติดตั้งผ่าน Wi-Fi เดียวกันใช้ราว 1 GB (UXR b3)
- การประหยัดบน Pages จริงยังไม่ได้พิสูจน์ เพราะ server ใน PB ไม่ส่ง ETag/max-age → EQ-1 (M-PLATFORM-021), FX-7 (M-PLATFORM-023)

**time warp ของ six-DOF**
- ขอ 100× ได้จริง 8.32× (7.8–8.46) เพราะ worker ใช้ราว 0.8 core คิดเป็นราว 10 วินาทีจำลองต่อ 1 วินาที CPU ของ worker ที่ 1× ได้ 0.99×
- OD:SIXDOF-BROWSER-QA: แท็บที่อยู่เบื้องหลังได้ 0.07–0.15×; ยังไม่มี journey วัด perf ตามที่ DEC:D-27 สั่งไว้; ผู้ใช้เห็นป้าย achieved-speed แต่ไม่เห็นเวลาถึงเหตุการณ์ถัดไป
- → R0.4 (M-PHYSICS-003), EQ-10 (M-PHYSICS-012), R2.1r (M-PLAN-009), DEC (D-56, M-PLATFORM-042), KPI-11

**หน่วยความจำ**
- OD:SIXDOF-BROWSER-QA: recording 4,947 เฟรมราว 46.5 MB ที่ T+799.7 s, heap 88/128 MB (เอกสารเองระบุว่า "ไม่ใช่ขอบเขต heap ทั้งระบบ")
- ไม่มีเพดานหน่วยความจำของภารกิจ และไม่ได้ติดตาม GPU memory (ผู้ตรวจประเมินว่า texture 4096×2048 สามภาพกับ 2048 สองภาพรวม mipmap เกิน 150 MB)
- **ไม่มี handler `webglcontextlost` ใน `src/` เลย** context หลุดบน iOS หรือเมื่อหน่วยความจำตึงจะเหลือ canvas ที่ตายแล้วกลางการบิน
- → R0.4 (M-PLAN-003), FX-8 (M-PLAN-019), KPI-15/32

**worker และแกนฟิสิกส์**
- precache มี worker bundle 12 ตัวรวม 4,090 kB; ตัวใหญ่ 6 ตัวมีแกนฟิสิกส์ฝังของตัวเอง (เพดาน budget): recheck 902, flight 589, readiness 583, ratings 569, tune 561, monte-carlo 559 kB
- ทุกการแก้ฟิสิกส์จึงขยับ budget หลายตัวพร้อมกัน ส่วนซ้ำประเมินไว้ราว 2.75 MB (สมมติฐาน **ต้องวัด**)
- งานนี้ต้องรอ D-40 (browser baseline) → EQ-8 (M-PLATFORM-033, M-BUILD-030), KPI-03

### 03.6 คุณภาพและประสบการณ์ผู้ใช้ (UXR a–d)

**ผู้ใช้ อุปกรณ์ และเครือข่าย (UXR a)**
- **ผู้ใช้:** นักเรียนไทย นักเรียนนายเรืออากาศและกำลังพล ครู และผู้เรียนทั่วไป (RM:Principles 1) ผู้ใช้จำนวนมากเป็นผู้เยาว์ จึงไม่มีบัญชีและไม่เก็บข้อมูลส่วนบุคคล pilot แรกตาม DEC:D-13 คือ GISTDA
  - ยังไม่มีคำแถลงความเป็นส่วนตัว/PDPA → ED-INST-1 (M-LEARNING-047)
- **อุปกรณ์:** โปรโตคอลทดสอบสมมติว่าผู้เข้าร่วมใช้โทรศัพท์ของตัวเอง; แท็บเล็ตโรงเรียนช้ากว่า 3–4 เท่า (RW:B-03); มีบันทึกความล้มเหลวของ WebGL บน Edge/Windows จริง; ไม่มีเอกสารไหนพูดถึง Chromebook หรือ iPad → DEC (D-56, M-PLAN-006), HU-6
- **เครือข่าย:** ค่าเริ่มต้นคือออฟไลน์; `dist/` ต้องติดตั้งบนอินทราเน็ตทหารได้ตามสภาพ; ผู้ใช้เน็ตแบบจำกัดปริมาณเป็นข้อกังวลที่ระบุชัด (DEC:D-7 จึงเอาเสียง 3.6 MB ออกจาก install) → ED-INST-1 (M-LEARNING-045), R7.2 (M-PLATFORM-047)
- **สิ่งที่ต้องการมากที่สุด:** ได้ผลแรกเร็วบนโทรศัพท์ของตัวเอง, การจำลองที่ติดป้ายตรงไปตรงมา, ใช้ในห้องเรียนออฟไลน์ได้เสถียร, ภาษาไทยอ่านได้, งานของผู้เรียนไม่หายเงียบๆ → S02 (OR-2)

**จุดเจ็บที่มีหลักฐาน (UXR b)**

| # | จุดเจ็บ | หลักฐาน | → |
|---|---|---|---|
| 1 | เริ่มแอปช้าในห้องทดลอง | OD:stage1 cold desktop 23.6 s, phone viewport 16.7 s; PB รอ shader 13.9 จาก 16.4 s; หน้า loading รอ texture 5 ภาพ (~3.8 MB) ก่อนสร้างฉาก | EQ-2 (M-PLAN-001) |
| 2 | เข้าแบบ warm ช้ากว่า cold (OD:stage1) | ขัดแย้งกับ PB | R0.4 (M-PLAN-002) |
| 3 | ดาวน์โหลดครั้งแรกใหญ่และซ้ำ | 9.3 MB + precache 15.7 MB ซึ่งซ้ำกัน 9.3 MB; RW:LS-02, RW:INF-05 | EQ-1, FX-7 (M-PLATFORM-023) |
| 4 | โหลดสามภาษาตอนเริ่ม | `7662ead:src/i18n/index.ts:1-7` import แบบ static; RW:INF-02 | EQ-6 (M-PLATFORM-031) |
| 5 | texture แผนที่ 2D ตอนเริ่ม | 513 kB, `7662ead:src/main.ts:550` | EQ-7 (M-LAUNCH-045) |
| 6 | ไม่รู้ว่า six-DOF ใช้เวลาเท่าไรจึงได้ผล | DEC:D-27 "หลายนาทีบนเครื่องช้า"; ไม่มี perf journey | R0.4 (M-PHYSICS-003), DEC (M-PLATFORM-042) |
| 7 | หน่วยความจำไม่มีเพดาน และไม่มี context-loss handler | 46.5 MB, heap 88/128 MB | R0.4 (M-PLAN-003), FX-8 |
| 8 | ลดคุณภาพภาพเองโดยไม่บอก | `GlowGovernor` ปิด bloom แล้วปิด physical sky เมื่อต่ำกว่า 24 fps (`render/glow-governor.ts`) ผู้ใช้กดย้อนได้ | DEC (D-43, M-PLAN-005), R2.2r (M-PLAN-021) |
| 9 | rating ของ Build ขึ้นกับความเร็วเครื่อง | งบ 8,000 ms (`7662ead:src/design/ratings.ts:233`); UI ไม่อ่าน `converged`/`stoppedBy` จึงอาจเขียน 0 kg หรือค่าขอบล่างลงแบบ | FX-1 (M-BUILD-006), KPI-16 |
| 10 | มือถือและการเข้าถึง | contrast 3.88–4.20 (RW:A11Y-01); เป้ากด 21–34 px (A11Y-02); ไม่เคารพ reduced motion (A11Y-04); สระและวรรณยุกต์ไทยถูกตัดเมื่อใช้ฟอนต์ระบบออฟไลน์ (FONT-01); แท็บ Build ภาษารัสเซียที่ 360 px; ข้อความนำ Engineer 8–12 บรรทัด (MOB-04); ข้อความ preflight ตัดที่ 4 บรรทัด (OD:stage1/UX-02) | R2.5 (M-LAUNCH-050…059), R3.4r (M-BUILD-031), R3.4r (M-LAUNCH-065, เลื่อน), HU-1 |
| 11 | ขอให้อัปเดตทุกวันทั้งที่โค้ดไม่เปลี่ยน | data refresh เปลี่ยนเวอร์ชันของ SW (RW:INF-06) | FX-7 (M-PLATFORM-022), KPI-29 |
| 12 | ยังไม่เคยสังเกตผู้ใช้จริงสักคน | ไม่มี `docs/history/user-test-2026-10/RESULTS.md` | HU-1 (M-LEARNING-050), KPI-23/24 |

**ประสบการณ์รายโหมด (UXR c)**

| โหมด | สิ่งที่ผู้ใช้เจอวันนี้ | จุดอ่อนหลัก → |
|---|---|---|
| เริ่มแอป | shell ขึ้นทันที แล้วขึ้น "Loading textures…" ราว 17–24 s ในห้องทดลอง; ถ้า WebGL ล้มจะเห็นหน้ากู้คืนที่แปลแล้ว; toast "offline ready"; ตรวจอัปเดตทุกชั่วโมง | EQ-2, EQ-1, FX-7 |
| Launch (six-DOF) | worker ใช้นาฬิกาควบคุม 0.01 s; live กับ replay แยกนาฬิกา; debrief ขึ้นราว 2.5 s หลังผลออก; R2 แก้เรื่องกล้องแย่งมุมแล้ว | LUI-01 → CO-4; ความเร็ว → EQ-10 |
| Orbit | playground คำนวณทันที; บทเรียนกรณีดาวเทียมจริงเปิดครั้งแรกบนจอขนาดโทรศัพท์ 10–12 s; คัดกรอง 30,000 วัตถุ 0.55 s ใน Node และ 2.7–5.3 s ใน Chromium ที่ช้าลง 4× | EQ-4, EQ-5, FX-3 |
| Build | rating อยู่ใน worker มีปุ่ม Stop และงบ 8 s; คำนวณตัวเลขใหม่ราว 180 ms ระหว่างนั้น check อ่านค่าเก่า; probe การเข้าวงโคจรค้างหน้า 0.5 s; ตาราง requirement 112 แถวใช้ราว 28 s | FX-1, EQ-13 (M-BUILD-014), R3.4r (M-BUILD-015, 032) |
| บทเรียน | ตรวจคำตอบในเครื่อง; บทเรียนจาก pack ไม่ขึ้นในรายการจนกว่าจะโหลด pack; strip ของบทเรียนออกแบบสร้างใหม่ราว 100 ครั้งต่อการตรวจหนึ่งครั้ง | FX-2 (M-LEARNING-001), ED-LES-1 |
| มือถือ | ปุ่มเดียวเปิดตาราง section × level; หลักฐานมือถือทั้งหมดมาจากการจำลองขนาด 390×844 บน desktop | HU-6, R2.5 |
| ออฟไลน์ | ไม่มี request ออกนอกหน้า; ใช้ฟอนต์ระบบ; precache ทุกอย่างยกเว้นเสียงและภาพหน้า home | R2.5 (M-LAUNCH-058), R7.4 (M-PLATFORM-028) |

**ช่องทาง feedback ที่ผู้ใช้ได้รับ**
- **ที่มีอยู่:** ข้อความ loading, toast, ป้าย achieved-speed, ไฟ preflight พร้อมปุ่มแก้, การ์ด debrief, ผลแบบ `role=status`, ปุ่ม Stop ของ worker, หน้ากู้คืน WebGL, ป้ายกล้อง `data-owner`

| ช่องทางที่ขาดหรือให้ข้อมูลผิด | ข้อเท็จจริง | → |
|---|---|---|
| ความคืบหน้าของการบินยาว | มีแค่ป้าย achieved-speed ไม่มีเวลาถึงเหตุการณ์ถัดไปที่ความเร็วจริง | R2.1r (M-PLAN-009) |
| ความคืบหน้าของการติดตั้ง ~15 MB | ไม่มีเลย | FX-7 (M-PLATFORM-023) |
| ช่องทางแจ้งปัญหา | ไม่มี; ไม่ส่งข้อมูลออกโดยอัตโนมัติ (ตามหลัก) | HU-6 (M-PLAN-011), D-60 |
| error ของ worker และ preview | ไปที่ `console.error` เท่านั้น | FX-4 (M-LAUNCH-028) |
| การคัดกรอง/re-entry ล้มเหลว | แสดงว่า "stopped" หรือหายไปเฉยๆ | FX-4 (M-ORBIT-004/005) |
| camera fallback | สลับไป exterior โดยไม่แจ้ง | R2.2r (M-LAUNCH-012) |
| GlowGovernor | ลดคุณภาพภาพโดยไม่บอก | R2.2r (M-PLAN-021), D-43 |
| prompt อัปเดตรายวัน | เวอร์ชันข้อมูลผูกกับเวอร์ชันแอป | FX-7 (M-PLATFORM-022) |
| ปุ่มเล่นบนแถบมือถือ | ไม่มีชื่อขณะหยุด และค้างภาษาเดิมหลังเปลี่ยนภาษา | CO-4 (M-LAUNCH-008) |
| ตารางผลภารกิจ | apsides แบบ osculating ถูกติด "outside" ข้างคำตัดสิน "target reached" | FX-5 (M-LAUNCH-031) |
| rating ที่ยังไม่ converge | แสดงเหมือนเป็นผลจริง | FX-1 (M-BUILD-006) |

**สิ่งที่ยังไม่เคยวัด (UXR d)** แต่ละข้อยังไม่มีค่าฐาน จึงเป็น **ต้องวัด** ทั้งหมด
- อุปกรณ์จริงทุกเครื่อง, frame time บน GPU จริง, Safari/iOS/Firefox → HU-6 (M-PLAN-011), D-56
- ขนาดที่ส่งจริงบน Pages (gzip), การเข้าครั้งแรกบนเครือข่ายที่ถูกจำกัด, เวลาในการติดตั้ง SW → R0.4 (M-PLAN-020, M-PLATFORM-041)
- input latency (Event Timing/INP) → R0.4 (M-PLAN-004), KPI-25
- หน่วยความจำสูงสุดตลอดภารกิจ, GPU memory, context loss → R0.4 (M-PLAN-003), FX-8
- แบตเตอรี่และความร้อน; เวลาที่ six-DOF ถึงวงโคจรรายกลุ่มอุปกรณ์ → HU-6, R0.4 (M-PHYSICS-003)
- งานผ่าน screen reader → R2.5 (M-LAUNCH-050)
- **ผู้ใช้จริง:** ยังไม่มีการสังเกตผู้เรียนเลยสักครั้ง การรัน browser อัตโนมัติไม่ใช่การสังเกตผู้เรียน → HU-1 (M-LEARNING-050), HU-4

### 03.7 ความสมจริง (RA a, b)

**ระดับความสมจริงรายโดเมน (RA a)**

| โดเมน | ระดับวันนี้ | ช่องว่างใหญ่สุด (ตัวเลข) | → |
|---|---|---|---|
| Ascent, point-mass | บินเทียบ 12 ลำ; F9 อยู่ในเกณฑ์ 49/66 แถว; ความเร็ว SECO-1 คลาด 1–4 % | F9 burn ขั้น 1 สั้นไป ~6 % (157.9 เทียบ 168 s); max-Q เร็วไป (~50 เทียบ 54–74 s) และต่ำไป ~25 %; PSLV-XL −29 %; Electron ขั้น 2 −25 %; FH −11 ถึง −13 %; tier A มีแค่ 3 ลำ | R4.2 (M-PHYSICS-042…047, 052) |
| Ascent, six-DOF | ทุกลำบินได้; sensitivity 240 trajectories; ลู่เข้าที่ 0.01/0.005 s | aero/inertia/gimbal/RCS เป็นค่าประมาณ ("E"); หลัง max-Q ไต่ชันกว่าจริงใน 4 ลำ; held coast ที่ 1× ภาพค้าง 10 s แล้วกระโดด | R4.2 (M-PHYSICS-044), R4.4 (M-PHYSICS-051), R2.1r (M-PLAN-015) |
| บรรยากาศ | US76 ช่วง 0–86 km; ตาราง Vallado ช่วง 86–1000 km; NRLMSISE-00 ใน lifetime | บรรยากาศชั้นบนสองแบบมาบรรจบที่ handoff; point-mass ไม่มีลม; placard ของ fairing ใช้บรรยากาศ nominal ทำให้ Atlas V/FH ทิ้ง fairing เร็วไป 17–27 % | R4.5 (M-PHYSICS-022, 025), R4.2 (M-PHYSICS-045) |
| ระบบขับเคลื่อน | มี source ledger; จำลอง start-up และ tail-off | ไม่มีแหล่งอ้างอิง 29/55 เครื่องยนต์ และ 25/50 ตัวขั้น; Isp ที่ระดับน้ำทะเลของ 4 เครื่องขัดกับแรงขับ 2.4–6.9 % | R4.1 (M-PHYSICS-040, M-ORBIT-043), KPI-20 |
| guidance (การนำวิถี) | มีกฎแบบ explicit, PEG/IGM, โปรแกรมของ Soyuz | ส่วนใหญ่เป็นแบบทั่วไป; ใช้กฎ load-relief ร่วมกัน; รูปของ throttle bucket ทำให้เกิด F3 | R4.2 (M-PHYSICS-052), R4.3 |
| การแพร่ของวงโคจร | RK4 + J2; Cowell DP5(4) + MSIS; SGP4 ตรง AIAA; passes ต่างจาก Skyfield ≤ 0.34 s | ดวงอาทิตย์ใน propagator คลาด 0.45°; MU_MOON คลาด 0.042 %; LTAN คลาด 2.6°; point-mass ไม่มี J2; เงาเป็นทรงกระบอก | R4.5 (M-PHYSICS-020, 028), R4.2 (M-PHYSICS-023) |
| re-entry (M03) | CZ-5B ทั้ง 4 ตกในหน้าต่าง; ทรงกลมคลาดไม่เกิน 30 % | element set ชุดแรกเข้าเกณฑ์ 33/66; แบบสองชุดได้ 79 % เทียบเกณฑ์ 80 % ที่ตั้งไว้ล่วงหน้า | R4.6 (M-ORBIT-023), DEC (D-10) |
| ดวงจันทร์ / Apollo | DE441 รายชั่วโมง + Hermite; IAU 1976; สนามโน้มถ่วง GRAIL degree 2 | ไม่มี mascon; ไม่มี nutation; นอกปี 1969 ใช้ series แค่สำหรับวาด | R8 (M-ORBIT-031/032), R4.5 (M-PHYSICS-026) |
| rendezvous / docking | สัมผัสที่ 3:13:12 เทียบ 3:10:33 ที่บินจริง (และอีก 2 โปรไฟล์ใกล้เคียง) | ISS เป็นวงกลมอ้างอิง 418 km; ไม่มีแรงต้านอากาศ; "hooks" เป็นตัวจับเวลา 13 นาที; tolerance 10 m พิสูจน์การจับยึดระดับ 0.34 m ไม่ได้ | R5.2 (M-ORBIT-025), R5.3 (M-ORBIT-026), D-35 |
| ออกแบบดาวเทียม | ตรง SMAD ยกเว้นหนึ่งแถว (0.11 kg); eclipse ต่างจาก Skyfield ≤ 2 s | swath 2 จาก 4 คลาด +4.4/+5.4 %; template สื่อสาร อากาศ และวิทยาศาสตร์มี Δv ไม่พอ | R4.3 (M-ORBIT-046), DEC (D-47) |

**ค่าคงที่ทางฟิสิกส์ที่ไม่สอดคล้องกัน (RA b แบบย่อ)** กฎ single-source อยู่ที่ S02 §02.10

| รายการ | ที่อยู่ | ผลวันนี้ | เหมือนเดิม → EQ-10 (M-PHYSICS-015) / เปลี่ยนค่า → R4.5 (M-PHYSICS-020) |
|---|---|---|---|
| `MU_MOON` 4.9048695e12 กับ 4.902800066e12 | `7662ead:src/physics/propagator/forces.ts:31` กับ `7662ead:src/physics/lunar/ephemeris.ts:22` | ×1.000422 ต่อแรงรบกวนระดับ ~1e-6 m/s² (lifetime, ทรงกลม R05, M03, GEO) | **เปลี่ยนค่า** → R4.5 (ยืนยันกับ header ของ DE440) |
| ดวงอาทิตย์สองแบบจำลอง (`sunDirectionEci` of-date กับ `sunPosition` J2000 ไม่มี precession) | `7662ead:src/physics/orbital.ts:270`, `7662ead:src/physics/ephemeris-series.ts:29` | ต่างกัน 0.45°; ขอบเงา SRP เลื่อนได้ถึง 11 s | **เปลี่ยนค่า** → R4.5 |
| solar constant 1361 กับ 1367 W/m² | power กับ SRP ของ propagator | ค่าต่างกันระหว่างโมดูล | **เปลี่ยนค่า** → DEC (D-41, M-PHYSICS-027) แล้วจึง R4.5 (M-PHYSICS-020) |
| `MU_SUN` นิยามซ้ำ | `7662ead:src/physics/propagator/forces.ts:30`, `7662ead:src/physics/lunar/ephemeris.ts:24` | ค่าเท่ากัน | เหมือนเดิม → EQ-10 |
| `G0` นิยามซ้ำ (`R_EARTH_USSA` ต้องอยู่ที่เดิม) | `7662ead:src/physics/atmosphere.ts:14` | ค่าเท่ากัน | เหมือนเดิม → EQ-10 |
| `R_MEAN` = 6371e3 (ทั้งที่มี `R_EARTH_MEAN` แต่ไม่มีใครใช้) | `7662ead:src/orbit/sensors.ts:32`, `7662ead:src/orbit/overflights.ts:53` | ค่าเท่ากัน | เหมือนเดิม → EQ-10 |
| `WGS84` สองชุด | `7662ead:src/orbit/applications.ts:29`, `7662ead:src/physics/geodesy.ts:22` | ค่าและนิพจน์เหมือนกัน | เหมือนเดิม → EQ-10 |
| `DEG = 180/π` (ชื่อกลับทิศกับ `constants.ts`) | `7662ead:src/physics/propagator/density.ts:44`, `7662ead:src/ui/home.ts:57` | ถูกต้องวันนี้ แต่ถ้าสลับ import วันหนึ่งจะคลาด 3283 เท่า | เหมือนเดิม (เปลี่ยนชื่อเป็น RAD) → EQ-10 |
| `AU` ฮาร์ดโค้ด `1.496e11` | `7662ead:src/orbit/passes.ts:81,240` | เป็นจุดไกลเท่านั้น | ตั้งชื่อใหม่แต่ **คงค่า** → EQ-10 |
| `SIGMA` และ `RAD` ซ้ำ | `7662ead:src/physics/sim/entry-heating.ts:25`, `7662ead:src/physics/sim/module-entry.ts:130`, `7662ead:src/ui/lifetime.ts:49` | ไม่มีผล | เหมือนเดิม → EQ-10 |

**ช่องว่างของหลักฐาน**
- heavy ครบชุดที่ผ่านครั้งล่าสุดคือ 36804343856 บน `9f9f36a` ก่อน #36 merge (`17bd60f`)
- six-DOF fleet ที่ผ่านครั้งล่าสุดคือ 36942933112 บน `91ee372` (มี #36 แต่ข้าม heavy) ก่อน R1.4 merge (`5eb18a2`)
- หลังจากนั้น #68, #70, #71 แก้ฟิสิกส์ร่วม และ R1.4 เปลี่ยน finite fuel กับฐาน `targetAttitude` ใน `rigid/runtime.ts` รายงาน R1.4 เองระบุว่า "ไม่ใช่ scientific acceptance แบบ heavy/fleet เต็ม"
- R2 ไม่แตะฟิสิกส์ recorder หรือ worker (R2S §4) และ compare `da67341...7662ead` (#75–#80) ไม่มีไฟล์ใน `src/physics/` เลย (#80 แก้ `src/orbit/handoff.ts` เฉพาะ parser ของ hand-off) เพดานของ worker ทุกตัวไม่เปลี่ยน
- งานในเลน P ทั้งหมดจึงยังไม่มีฐานที่เขียวบน SHA ที่เผยแพร่จริง → CO-6 (M-PHYSICS-001), KPI-22
- ไม่รู้ว่าความล้มเหลวของ G05 Monte Carlo ยังเกิดบน main ปัจจุบัน (`5f9aa2e`; ฟิสิกส์เท่ากับ `7662ead`) หรือไม่ → R4.3 (M-PHYSICS-030)

### 03.8 วิศวกรรมและกระบวนการ

**คำวิจารณ์ PLAN v1.2 (PC c1–c10, d) กับคำตอบของ v2.0**

| # | ข้อวิจารณ์ | คำตอบของ v2.0 → |
|---|---|---|
| c1 | ไม่มีเป้าหรือด่านประสิทธิภาพขณะรัน มีแค่ budget ของ byte | KPI-01…13 → S04; perf gate ใน repo → R0.4 (M-PLATFORM-041) |
| c2 | ไม่มี track "ผลเหมือนเดิม" และไม่มี oracle | EQ-1…15 → S09; แคตตาล็อก oracle → S07 (M-PLAN-018) |
| c3 | ไม่ได้วัด UX; มี user test แค่ใน R6.3 | KPI-23…27 → S04; HU-1 (M-LEARNING-050); ด่าน axe → R2.5 (M-LAUNCH-050); ช่องทางแจ้งปัญหา → HU-6 |
| c4 | ลำดับงาน: G0 ผ่านแค่บางส่วน; D08 ไม่มี wireframe; CSV ของ U16 ไม่อยู่ใน dependency; R3.1 ไม่อ้าง FlightLifecycle; G4 ขวาง R5; R7 อยู่ท้ายสุด | ADR แบบทันเวลา → R0.2r (M-PLAN-013); D-36, D-57, D-59; G4-S; R7 รันทุกประตู (M-PLAN-025/026) → S05 |
| c5 | งานใหญ่เกินจะทำได้ ไม่มีขนาด PR หรือ WIP | PR ≤ ~400 บรรทัด, WIP → S18; ประมาณการใน packages.tsv → S05 |
| c6 | เจ้าของไม่ชัด; ไม่มีแถว P-R; ผู้ตรวจอิสระไม่มีชื่อ | ตารางเลนและบทบาท O/L-C/W/H/P-R → S18; D-55 (M-PLAN-007) |
| c7 | hotspot ชนกัน: 7 งานแตะ `main.ts`; i18n โตทุก feature | I-train → S18; EQ-15 (D-62); EQ-6; EQ-8 |
| c8 | งานซ้ำ: Pages รัน unit ซ้ำ; map เป็นร้อยแก้ว | R0.3r (M-PLAN-014); D-64 (เฉพาะ heavy/fleet); M-PLAN-012 ถูกปฏิเสธ (S19); R7.3 |
| c9 | ความสมจริงของภาพและ asset ไม่มีงบ; ไม่มีนโยบาย quality tier | R4.7 (M-PLAN-016); D-50; D-43 (M-PLAN-005); R2.2r (M-PLAN-021) |
| c10 | ไม่มีทะเบียนงานที่เครื่องอ่านได้ | `registry.tsv` และแถว PROGRESS รายแพ็กเกจ → CO-8 (M-PLATFORM-077) |
| d | D01–D09 และการตัดสินใจโดยนัย (อุปกรณ์เป้าหมาย, quality tier, schema ของ CSV, Docking preset, ผู้ตรวจ, การปิด G0) | D-29…D-37; D-56, D-43, D-57, D-58, D-55, D-59 → S08 |

**ระยะเวลาของ CI** (ค่าที่วัดได้; ตัวเลขรายรันจาก GitHub)

| งาน | ระยะเวลา | หมายเหตุ |
|---|---|---|
| PR CI | median ~16.7 min (10.8–20.4) | #74: 17.8 min; #75: 14.6 min; ยังไม่ถึง ≤ 12 min ตามที่เคยตั้งไว้ → R7.3 (M-PLATFORM-045), KPI-28 |
| Pages | 18–22 min (เดิม 39) | R1 18.1, R2 22.2, #76 24.1 min; #75 ล้มที่นาทีที่ 14 ตรงด่าน budget |
| heavy | 25–61 min | รายสัปดาห์หรือสั่งรันเอง → CO-6 |
| six-DOF fleet | ~2 h 40 min | รายเดือน → CO-6, D-64 |
| PB 3 รอบ | ~9 min | → R0.4 (M-PLATFORM-041) |

**ประวัติการขึ้นเพดาน budget** (`budgets.json` `_notes`)

| เมื่อ | กลุ่ม | จาก → ถึง (kB) | แพ็กเกจชดเชย |
|---|---|---|---|
| 09-30 ถึง 10-01 (#38, Phase 4 stage 2/3a/3b, Vostok) | index | หลายรอบ รอบละ "ค่าวัด + 2 %" | ไม่มี |
| R1 (10-03) | index | 2,572 → 2,573 (+1) | ไม่มี |
| R2 (10-04) | index / CSS | 2,573 → 2,588 (+15) / 169 → 170 (+1) | ไม่มี |
| R3 pkg 1 (10-04) | index / CSS / i18n | 2,588 → 2,600 (+12) / 170 → 173 (+3) / 1,690 → 1,702 (+12) | ไม่มี |
| #76 (10-04) | precache | 15,783 → 16,103 (+320) | ไม่มี |
| #77 R3.5 (10-04) | index / CSS / i18n | 2,600 → 2,612 (+12) / 173 → 175 (+2) / 1,702 → 1,711 (+9); สองส่วน +8/+2/+5 แล้ว +4/0/+4 | ไม่มี |
| #80 R3.3 diagram + R3.1 (10-04) | index / CSS / i18n | 2,612 → 2,622 (+10: +7 แล้ว +3) / 175 → 177 (+2) / 1,711 → 1,720 (+9); #78 ไม่แก้เพดาน | ไม่มี |

นับจากเพดานหลัง R1 ถึง `7662ead` index +49, CSS +8, i18n +30, precache +320 kB เพดานที่ตั้งไว้ "ให้ลดลงเท่านั้น" กลับทำงานเป็นเพดานที่เลื่อนขึ้นตามค่าวัดทุกครั้ง การลดเพดานจริงมีแค่ Stage 2 (#68 เอาพจนานุกรมออกจาก worker) ส่วนการแยก chunk ใน Stage 2 และ R1 เป็นการจัดประเภท ไม่ได้ลดการโหลดตอนเริ่ม → CO-1, CO-2 (M-PLATFORM-064), D-38, KPI-30

**แถวสถานะที่ล้าหลังความจริง**

| ช่วง | สิ่งที่ล้าหลัง | → |
|---|---|---|
| R1 | IS, README, USER-GUIDE, CHANGELOG ไม่พูดถึงโปรไฟล์; #71–#73 ไม่มีใน CHANGELOG (doc-map C3; บน `7662ead` ยังขาด #71/#72 และ #76) | CO-2, R7.5 (M-PLATFORM-069) |
| R2 | PROGRESS บน `da67341` ยังเขียน "Implemented locally; not merged" (R2S §0) | ปิดแล้ว: PROGRESS บน `5f9aa2e` บันทึก R2 merge/CI/deploy (M-LAUNCH-021 → DELIVERED, S03 §03.2) |
| R3 (#75–#80) | PROGRESS บน `7ddab75` และ `1d5b76b` เขียน R3 package 1 ว่า "in PR" ทั้งที่ merge แล้ว; บน `7662ead` แถว package 1, R3.5 และ R3.3 stowed pose เป็น "Verified; merged; published" แล้ว แต่ "R3.3 (subsystem diagrams)" ยังเป็น "Implemented on branch; in PR" และ "R3.1 (design ID/revision)" เป็น "PR after #80" ทั้งที่ #80 merge ทั้งสองแล้ว (03.4); #83 แก้แถวของ #80 หลัง merge และบน `5f9aa2e` ยังค้างตาม 03.4 | CO-2 (M-PLAN-017) |
| ทั่วไป | IS ยังเขียน cron 03:17 (ของจริงคือ 17:43); จำนวน test ไม่ตรงกัน (C2) | R7.5 (M-PLATFORM-069) |

สถานะล้าหลังทุกครั้งที่มีการ merge → CO-8 (แถว PROGRESS แก้ใน merge PR), KPI-31

**จำนวนบรรทัดของไฟล์ hotspot**

| ไฟล์ | `fbefa18` | `da67341` | `7662ead` | หมายเหตุ |
|---|---|---|---|---|
| `src/main.ts` | 2,274 | 2,408 | 2,620 | #75 +2, #77 +178, #80 +32 (สุทธิ) |
| `src/ui/panel.ts` | 2,440 | 2,426 | 2,517 | #77 +91 |
| `src/style.css` | 1,306 | 1,393 | 1,418 | R2 +87, #77 +25 |
| `src/ui/hud.ts` | 990 | 994 | 994 | |
| `src/ui/telemetry.ts` | 825 | 932 | 932 | |
| `src/ui/timeline.ts` | 573 | 750 | 750 | |
| `src/ui/modes.css` | 370 | 370 | 370 | |
| `src/i18n/**` (10 ไฟล์) | — | 15,483 | 15,780 | บน `7662ead` en 5,001 / ru 4,977 / th 4,978 |

งานใน PLAN v1.2 ที่แตะ `main.ts` มี 7 งาน (R2.1, R2.2 hooks, R2.3, R2.4 shell, R3.5, R5.1, R6); R3.5 เข้าไปครบแล้ว (#77 +178 บรรทัด) และ R3.1 DesignRef อีก +32 (#80), #81 +15 marks ทุกงานต้องเข้าคิวผ่าน I → S18 (I-train), EQ-15 (M-PLATFORM-055, D-62)

**บทเรียนกระบวนการและข้อเท็จจริงจาก R1–R3 → กฎ → ใช้ที่ไหน** (ย่อจาก 26 บทเรียนใน process-lessons.md; เลขในวงเล็บคือเลขบทเรียน)

| ข้อเท็จจริง | กฎ | ใช้ที่ |
|---|---|---|
| agent ทำงานขนานกันจนด่านของกันและกันพัง; probe ของ agent หนึ่งทำ build พัง (1, 2) | หนึ่งไฟล์ hotspot มีผู้เขียนคนเดียว; scratch แยกไว้นอก tsconfig | S18 §18.3, §18.7 |
| รายการส่งต่องานไม่มีใครกวาด (3); ขยายขอบเขตเอง (4) | ทุกรายการส่งต่อมีเจ้าของและตรวจซ้ำที่ GK; ถามเป็นตัวเลือกพร้อมคำแนะนำ | S05 GK, R7.2 (M-PLAN-026) |
| D-12, D-13 ไม่ถูกปฏิบัติตาม; D-2 ถูกละเมิด; D-27 ไม่ถูกดำเนินการ (5) | การตัดสินใจทุกข้อมีจุดตรวจว่าลงมือจริงแล้ว | S08 §08.6, CO-7 |
| devDependency เพิ่มทีละหลายตัว (6) | เพิ่มทีละตัวพร้อมเหตุผล (DEC:D-17); three.js เป็น runtime dependency เดียว | S02, R7.3 |
| หลักฐานต่างชนิดถูกปนกัน; run ก่อนแก้ถูกนับว่าผ่าน (7, 8) | แยกหลักฐาน execution / scientific / human; คำอ้างที่ยังไม่พิสูจน์ติดป้าย hypothesis | S18 §18.8 |
| ตั้ง tolerance หลังเห็นผลบิน; gate ที่อ้างอิงตัวเอง; ค่า fit ถูกเรียกว่ามีแหล่งอ้างอิง (9, 10) | ตั้งขอบเขตก่อนรัน; ผู้ตรวจอิสระรันตัวเลขหลักซ้ำ (D-55) | S14 §14.6, R4.4 |
| ตรวจยืนยันได้ 1/17 รายการ; อนุมัติแทนคนอื่น (11, 12) | นับความครอบคลุมของการตรวจ; ห้ามกรอกการอนุมัติแทนมนุษย์ | S16, S18 |
| อัปเกรด Node/V8 อาจเปลี่ยน fingerprint (13) | หนึ่งผลต่อหนึ่ง SHA และหนึ่ง runtime; pin Node (D-3/D-4 ภายใน GK2) | R0.4 (M-PHYSICS-060), S08 |
| R3 pkg 1 merge แล้วแต่ไม่ live 7 ชม.; cron อาจช้า 6.5 ชม. (14) | merged / published / live บันทึกแยก | CO-2, R7.2 |
| R1 ส่งโดยไม่แก้ CHANGELOG/เอกสาร; PROGRESS ล้าหลังทั้ง R1, R2, R3 (15, 16) | "docs touched หรือ N/A" ทุก PR; แถวสถานะแก้ใน merge PR; packet หลักฐานไม่เก็บใน `docs/` | CO-8, S18 §18.10, KPI-31 |
| Markdown ที่ test อ่านถูกย้ายได้ง่าย (17) | ห้ามย้ายหรือจัดรูปแบบใหม่ | S02 §02.13, R7.5 (M-PLATFORM-068) |
| R2 merge โดยที่ journey ของตัวเองไม่อยู่ใน PR CI; regex ที่ไม่ anchor ผ่านได้เอง (18, 20) | journey ต้องพิสูจน์ด้วย sabotage run; มี smoke slice ใน PR CI | CO-5, R7.1 (M-PLATFORM-051) |
| SwiftShader ได้ 1–13 fps (19) | เวลาเป็นแค่แนวโน้ม; gate ใช้ตัวเลขที่ deterministic | S04 §04.1, R0.4 |
| ไม่มี heavy ตั้งแต่ #36 (21); PR CI มองไม่เห็นข้อมูลที่โตขึ้น (ข้อเท็จจริง R3) | ด่านถูกก่อน; heavy/fleet ก่อน merge งานฟิสิกส์; แยกเพดานโค้ดกับข้อมูล | CO-6, CO-1 |
| เกณฑ์บทเรียน, ขอบเขตจากผู้ใช้, วิธี flight-profile, สัญญาสถาปัตยกรรม, รหัสชนกัน (22–26) | วัดบนการบินจริงก่อน; ตั้งเกณฑ์ก่อน session; ทำตาม FLIGHT-PROFILE-METHOD; physics ไม่มี DOM; prefix id | S16, S13, S02 §02.9, S00 |

**ความขัดแย้งระหว่างเอกสาร (doc-map C1–C16)**
- พบ **16 ข้อ** แบ่งเป็น:
  - สถานะไม่ตรงกัน 7 ข้อ (C1, C2, C3, C10, C11, C13, C16)
  - ลำดับความน่าเชื่อถือและ namespace ของรหัส 2 ข้อ (C4, C5)
  - การตัดสินใจที่ไม่ถูกปฏิบัติตาม 5 ข้อ (C6, C7, C8, C9, C12)
  - ขอบเขต 1 ข้อ (C14: R5 ต้อง "ขยาย ไม่สร้างใหม่")
  - ชื่อไฟล์ซ้ำ 1 ข้อ (C15)
- คำตัดสินและแพ็กเกจที่แก้แต่ละข้ออยู่ใน S19 App D; กฎลำดับความน่าเชื่อถืออยู่ใน S00 (M-PLATFORM-067) → R7.5 (M-PLATFORM-069), CO-8

### 03.9 ช่องว่างที่พบระหว่างเขียน (ข้อเสนอ ไม่มีรหัส)
1. **งาน R3 ต่อเนื่องถูก merge ก่อนรับแผน** ตามคำสั่ง "ทำต่อเลยครับ" งาน R3.5 (#77) และ R3.3/R3.1 (#78, #80) merge และเผยแพร่ครบ (ล่าสุด `09cc2f5`) ก่อน v2.0 ได้รับรอง และเจ้าของประกาศ R3 ครบ เครดิตบันทึกใน 03.2/03.4 และคำถามเรื่องเลน R3 ใน D-65 ไม่มีอีก (S08) การขึ้นเพดาน #77 +12/+2/+9 และ #80 +10/+2/+9 kB ไม่มีแพ็กเกจชดเชย ซึ่งเข้าข่าย D-38
2. **headroom ของ precache (280.3 kB บน committed snapshots ของ `5f9aa2e`; ค่าบน Pages ต่ำกว่าและยังไม่ได้วัด)** ควรมีการติดตามรายวัน (ใช้ข้อมูลจาก cron run) จนกว่า CO-1 จะแยกเพดาน เสนอให้ใส่เป็นขั้นหนึ่งของ CO-1
3. **ข้อความใน spec** ที่เขียนว่า "worker 12 ตัวมีแกนฟิสิกส์ทุกตัว" ไม่ตรงกับหลักฐาน หลักฐานแสดงว่ามี worker bundle 12 ตัว แต่มีแค่ 6 ตัวใหญ่ที่ฝังแกนฟิสิกส์ของตัวเอง S09 (EQ-8) ควรใช้ตัวเลขนี้
