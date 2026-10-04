# R3 — เห็นแบบจริงและเชื่อมทุกขั้นของการทดลอง (package 1: R3.1–R3.4)

- วันที่: 2026-10-04
- แผน: R3.1–R3.4 ใน [PLAN.md](../PLAN.md); ความต้องการ U04, U05 (บางส่วน), A03
- ฐาน: `main` ที่ `da6734160a510cd87cc7fdb4df3ec4eba9319313` (หลัง R2 merge, [PR #74](https://github.com/ROYIN001/Orbitlab/pull/74))
- การอนุญาต: ผู้ใช้สั่ง “เมื่อระยะ 2 merge เข้า main โดยไม่มีปัญหา ทำระยะที่ 3 ต่อได้เลย” (2026-10-04)
- สถานะ: implementation และ local checks ของ package นี้; R3.5 (journey integration) เป็น package ถัดไป — ไม่อ้างว่า R3/G3 ครบ

## สิ่งที่ทำ

### R3.1 — provenance ของการส่งต่อ (hypothesis, ไม่ใช่ bug ที่พิสูจน์แล้ว)

- โค้ดเดิม: `orbitHandoffNow()` และ `currentAsReference()` ใน `src/main.ts` สร้าง mission document จาก `panel.missionState()` (ร่างใน setup) แทน `sim.cfg` ที่บินจริง
- **reproducer:** ไล่ทุกเส้นทางในแอปที่พบ — Watch launch (`startWatch` โหลด mission เข้า panel แล้วบินจากค่านั้น), กลับเข้า workspace ระหว่างบิน (`restoreWorkspaceMission` ปฏิเสธเมื่อ underway), WebMCP `configure_mission` (preview ใหม่ = reset flight), R2 ทำให้ setup อ่านอย่างเดียวระหว่างบิน — **ไม่พบเส้นทางที่ทำให้ร่างต่างจากที่บิน** จึงติดป้ายเป็น hypothesis ตาม R0.1
- แก้แบบ defensive: ทั้งสองจุดใช้ `flownMission(sim.cfg)` (ฟังก์ชันเดิมที่ My work/record ใช้อยู่) handoff ยังอ่าน state จาก frame ที่แสดง (cursor ใน replay) และ propellant จาก frame ไม่เติมเต็ม; `parseHandoff` เดิมปฏิเสธ version ใหม่กว่า/ค่าไม่ถูกต้องอยู่แล้ว
- ผลข้างเคียงที่ตั้งใจ: origin mission ใช้ `orbitId: 'custom'` + ค่าวงโคจรที่บินจริงแทนชื่อ preset ของร่าง (ความหมายเดียวกัน)

### R3.2 — ภาพจรวดบน Engineer bench (U04)

- `src/design/bench-part.ts` (pure): ref ของภาพ (`stage:i`, `booster:i:g`, `fairing`, `interstage:i`) → ความยาว/เส้นผ่านศูนย์กลาง/มวลแห้ง/เชื้อเพลิง/เครื่องยนต์ จาก `VehicleSpec` ตัวเดียวกับที่ stand/tunnel/review ใช้ และ facility ที่ตรวจ
- `src/ui/build/engineer-level.ts`: แผง “… on the bench” วาด `StackSvg` เดิมตามสัดส่วนจาก spec บน bench (catalogue, Explore design, saved, sized) พร้อม Stacked/Apart; เลือกชิ้นด้วยรูปหรือป้าย (keyboard ได้) → การ์ดตัวเลข + “Fire it on the test stand” (`StandPanel.selectEngine` ใช้ key เดียวกัน) หรือ “Open the wind tunnel”; bench เปลี่ยนแล้ว selection ที่ไม่มีในยานใหม่ถูกล้าง
- ไม่สร้าง WebGL ใหม่ (SVG ตามแผน)

### R3.3 — ภาพดาวเทียมบน satellite bench (U04)

- `src/design/satellite-drawing.ts` (pure): อ่าน `SatelliteDesign` object เดียวกับที่ figures ใช้ — bus size, array area + mount, dish diameter, camera aperture, มี/ไม่มี engine; ส่วนที่แบบไม่ระบุเป็น assumption ที่มีชื่อ (wings สองข้างสูงเท่า bus, cells บนผิว, spinner, ตำแหน่ง dish/camera/engine) และเตือน `bodyCellsExceed` เมื่อพื้นที่เซลล์มากกว่าสองหน้าใหญ่สุดของ bus
- array=0 / ไม่มี engine / ไม่มีกล้อง / ไม่มีจาน → ไม่วาดชิ้นนั้น; tracking/body/spinner วาดต่างกันจริง
- ค่าใช้ไม่ได้ระหว่างพิมพ์ (NaN, ติดลบ) → ข้อความ “drawing waits for usable figures” แทนภาพเก่า
- `src/ui/build/satellite-svg.ts` วาดด้านหน้าตามสัดส่วน + scale bar + ทิศโลก; แท็บที่เปิดอยู่ highlight subsystem; ปุ่มของแต่ละชิ้นเปิดแท็บ (power/propulsion/attitude/radio/camera); assumptions แสดงใต้ภาพ
- ยังไม่มีภาพ deployed/stowed แยก และ diagram sunlight/link/footprint/axes (เหลือใน R3.3 ต่อ) — **ภายหลัง:** stowed และ axes เพิ่มแล้ว (ดูหัวข้อ R3.3 ต่อ)

### R3.4 — readiness พาไปที่ชิ้นต้นเหตุ (A03)

- `readinessTarget()` ใน `src/design/review-model.ts`: ตัดสินจาก `stage`/`booster`/`path`/`code` เท่านั้น (ไม่อ่านข้อความแปล); แถวที่เกี่ยวกับทั้งยาน/ภารกิจ (Δv, plan, verdict) ไม่มี target
- review แสดงปุ่ม “Show the part” → เลือกชิ้นนั้นบนภาพ เลื่อนภาพเข้าจอ และ focus ป้าย; ไม่ auto-tune หรือแก้ค่าแทนผู้ใช้
- การแก้ค่าจริงยังทำที่ Explore parts builder ตามเดิม (การพาไปที่ field ใน builder เป็นงาน R3.5)

## หลักฐานที่รันจริง

Local: Node 22.22.0, Chromium 141.0.7390.37, software WebGL, render scale 0.5

- `npx tsc --noEmit`: ผ่าน
- unit ใหม่: `tests/bench-part.test.ts` 4 (ทุกชิ้นของทุกยานใน catalogue ตรงกับ spec และมี stand key ตรงกัน, แบบที่แก้ค่าแล้วไม่ใช้ค่า catalogue, ref ค้าง/ผิดรูปแบบ → null), `tests/satellite-drawing.test.ts` 6 (ทุก template วาดได้และพื้นที่แผงที่วาด = `arrayArea`), `tests/readiness-target.test.ts` 2 — ผ่าน; `tests/design-review-model.test.ts`, `tests/i18n.test.ts` ผ่าน
- `npx vite build` + bundle budget: index JS 2598.7 kB, CSS 172.3 kB, i18n 1700.7 kB เกิน ceiling เดิม → ปรับเป็น 2600 / 173 / 1702 kB พร้อมเหตุผลใน `budgets.json` `_notes`; precache 15778.7 kB อยู่ใต้ ceiling เดิม; หลังปรับ **ok**
- browser `r3-bench-drawings` (ใหม่) บน production `dist/`: **1/1 ผ่าน** (16.7 s) — Electron บน bench, เลือก Stage 2 → การ์ด ≥4 ตัวเลข → stand tab, Apart ไม่ทำชิ้นหาย, review ของ Electron แสดง “Show the part” ที่ `stage:2` (weakUpperStage ของ Curie) และเลือกชิ้นนั้นบนภาพ, satellite bench วาด NAPA-2 6U, Power tab highlight array, ปุ่มชิ้นเปิดแท็บ, ภาพกับรายการกล้องตรงกัน, มี assumptions
- ระหว่างพัฒนา journey พบ SVG `position:absolute` ทับการ์ดและแท็บ (`.bs-svg` ของ Watch level) จึงแก้ `.be-draw`/`.bsb-draw` เป็น `position: relative` ก่อนผ่าน
- full default unit suite (`npx vitest run`): **10,113 passed / 10,113 (283 files)**
- browser บน production `dist/` ของ source นี้: `r3-bench-drawings gesture-ownership requirements satellite launch-explore workspace-navigation profile-session-safety` → **7/7 ผ่าน, 485.0 s** (satellite 40.3 s ครอบคลุม Send to Orbit/Fly it ที่ใช้ handoff; launch-explore 106.3 s บินถึงวงโคจรและ export CSV; profile-session-safety 158.0 s รวม Build routes)

## การเผยแพร่ครั้งแรกล้ม (precache budget) และการแก้

- R3 merge ผ่าน [PR #75](https://github.com/ROYIN001/Orbitlab/pull/75) (CI 37172156819 เขียวทั้งหมด) ที่ `7ddab75dfac7add18c93f7adf5058133ee3f45f2`
- [Pages 37172926281](https://github.com/ROYIN001/Orbitlab/actions/runs/37172926281) **ล้ม**ที่ bundle budget ของ build: precache **15787.4 kB > 15783 kB (+4.4 kB)** หลัง refresh data snapshots ของวันนั้น ขณะที่ CI ใช้ snapshots ที่ commit ไว้วัดได้ 15778.7 kB (เหลือ 4.3 kB) — unit 3 shards และ typecheck ผ่าน; browser/publish ถูกข้าม เว็บไซต์ยังเป็นรุ่น R2 (`da67341`)
- สาเหตุ: โค้ด R2/R3 (~24 kB) ใช้ headroom ของ precache จนเกือบหมด และ CI ตรวจ budget ด้วย snapshots เก่าจึงไม่เห็น; ไม่ใช่ flake
- แก้: ceiling precache = 15787.4 kB + 2 % (16103 kB) ตามธรรมเนียมเดิมของไฟล์ พร้อมเหตุผลใน `budgets.json` `_notes`; ไม่เปลี่ยน ceiling อื่น
- ข้อสังเกตกระบวนการ: PR CI ไม่สามารถจับ precache ที่โตตาม data refresh ได้ ควรให้ headroom ของ precache ไม่ต่ำกว่าการเติบโตของ snapshots รายวัน (เสนอเป็นงาน T)

## R3.3 ต่อ: ท่าพับเก็บสำหรับการปล่อย และแกนของตัวดาวเทียม

- `satelliteDrawing()` มี `stowed` สำหรับแบบที่มีปีก: แต่ละปีกพับเป็นแผงกว้างเท่าความลึกของ bus จำนวน `ceil(span / depth)` แผง หนา 3 ซม. แนบด้านข้าง (assumption `stowedPanels` ที่แสดงใต้ภาพ เพราะแบบไม่ให้ทั้งสองค่า) พร้อม extent ของท่าพับ; body/spinner cells, จาน, กล้อง และเครื่องยนต์วาดเหมือนเดิมทั้งสองท่า
- satellite bench มีปุ่ม Deployed / Stowed for launch (เฉพาะแบบที่มีปีก); ภาพมีแกน +X (ตามความเร็ว), +Z (ชี้โลก), +Y (ออกจากหน้ากระดาษ) ที่มุม และบอกเป็นธรรมเนียมของภาพใต้ภาพ (ไม่ใช่ assumption ของแบบ — bus เปล่ายังไม่มี assumption ตาม test เดิม)
- หลักฐาน: `tests/satellite-drawing.test.ts` +1 (ทุก template: แผงพอคลุม span, ท่าพับไม่กว้างกว่าท่ากาง, ไม่มี stowed เมื่อไม่มีปีก) ผ่าน; `tests/i18n.test.ts` ผ่าน; `r3-bench-drawings` เปลี่ยน NAPA-2 เป็น tracking wings ที่ Power tab → Stowed พับทุกปีก ไม่มีปีกกางค้าง → Deployed กางกลับ, มีแกน — ผ่าน 15.9 s
- ยังไม่มี: diagram sunlight/eclipse, antenna pointing, camera footprint

## ข้อจำกัดและงานที่เหลือ

- **R3.5 ยังไม่ทำ:** Home “ลองปล่อยครั้งแรก” แบบ editable template, compact mission context (Build→Check→Launch→Result→Orbit), Watch→สำเนาทดลอง, result→typed edit พร้อม before/after, การพาไป field ใน parts builder
- R3.1 ยังไม่มี versioned envelope ใหม่ที่เก็บ design ID/revision ใน handoff; ใช้ `orbitlab.handoff` v1 เดิม
- R3.3 ยังไม่มีภาพ stowed/deployed แยก และ diagram sunlight/eclipse, antenna pointing, camera footprint, attitude axes
- ภาพดาวเทียมเป็น schematic ไม่ใช่แบบโรงงาน; ภาพจรวดใช้ geometry เดิมของ `explodedView` (outline/interstage ที่ derived ตาม D01)
- G3 ยังไม่ผ่านจนกว่า R3.5 เสร็จและผู้ใช้ตรวจภาพ
