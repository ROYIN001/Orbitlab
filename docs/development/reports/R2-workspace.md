# R2 — Launch Engineer เห็นภาพชัดและเลือกการแสดงผลได้ (first package)

- วันที่: 2026-10-04
- แผน: R2.1–R2.4 ใน [PLAN.md](../PLAN.md); ความต้องการ U02, U03, U08 (ต่อจาก R1), U09 (ต่อจาก R1), U10, U11, U16 (ส่วน UI), A04, A05
- ฐาน: `main` ที่ `fbefa18b3aa34a1a00332bfb63c432fe11a4777c`; branch `claude/funny-turing-vr4jbm`
- การอนุญาต: ผู้ใช้สั่ง “เริ่มทำในระยะที่ 2” และ “ทำต่อเลย” เมื่อ 2026-10-04 (ไม่รวม R3–R7)
- สถานะ: **verified; merged; published** — [PR #74](https://github.com/ROYIN001/Orbitlab/pull/74) CI 37168554643 ผ่าน, squash-merge ที่ `da6734160a510cd87cc7fdb4df3ec4eba9319313`, [Pages 37169459230](https://github.com/ROYIN001/Orbitlab/actions/runs/37169459230) ผ่านทุก gate และ deploy source นั้นเมื่อ 2026-10-04T02:17:28Z (รายละเอียดใน [PROGRESS.md](../PROGRESS.md)); D08 ยังรอผู้ใช้ตรวจ

## การตัดสินใจที่ยังรอ (D08) และสมมติฐานที่ใช้

D08 (wireframe/layout) ยังไม่ได้รับคำยืนยันจากผู้ใช้ งานนี้ใช้สมมติฐานที่เปลี่ยนกลับได้และส่ง screenshot ให้ตรวจ:

1. ซ่อน setup เฉพาะระดับ **Engineer** หลัง launch; Explore ยังใช้แผงเดิมเป็นสรุปเที่ยวบินตามพฤติกรรมเดิม
2. desktop เมื่อ setup ซ่อนใช้ `scene | telemetry 330 px` (300 px ที่ ≤1400 px); ≤1180 px เป็นคอลัมน์เดียวที่ telemetry เป็นแถบใต้ภาพ; โทรศัพท์คงเป็น stack เดิม
3. ปุ่ม ⚙ Setup แสดง setup แบบอ่านอย่างเดียวระหว่างบิน (มี Relaunch/New mission เดิมอยู่ข้างใน) ไม่ใช่การกลับไป setup; New mission เท่านั้นที่เปิด configuration ให้แก้
4. presets ของ R2.3 เป็นการเลือกการ์ดใน telemetry panel ยังไม่ทำการลาก/จัดหน้าต่างอิสระ (รอ D08)
5. ภารกิจใหม่ใน Watch เริ่มที่ Cinematic เสมอ; ใน workspace ความเป็นเจ้าของกล้องคงอยู่ข้ามการแก้ setup เหมือนสวิตช์ camera sequence เดิม

ถ้าผู้ใช้ไม่เห็นด้วยกับข้อใด ให้ปรับก่อน merge

## สิ่งที่ทำ

### R2.1 — lifecycle, setup ที่ซ่อน, notation, U16, มือถือ (U02/U11/U16/A04)

- `src/ui/flight-lifecycle.ts` (ใหม่, pure): `setup → flight → analysis` แยกจากนาฬิกาจำลองและ cursor; pause/replay อยู่ใน `flight`; `setupCollapsed()` ซ่อนเฉพาะ Engineer
- `src/main.ts` `syncLifecycle()` เขียน `body[data-flight-stage]`/`body[data-setup]` เฉพาะเมื่อเปลี่ยน; ย้าย focus ออกจาก setup ก่อนซ่อน; ปุ่ม `#btn-setup` (aria-expanded/aria-controls) แสดงเฉพาะ Engineer นอก setup; ลิงก์ “Mission” บนมือถือเปิด setup ที่ซ่อนได้
- canvas ถูก resize จริงโดย `ResizeObserver` เดิม (ไม่ยืดด้วย CSS): วัดได้ viewport 638 → 940 px, canvas backing 318 → 469 px ที่ 1280×800 render scale 0.5
- notation (ISO/GOST) ย้ายจาก setup ไป telemetry panel (`.tel-display.notation-section`) เปลี่ยนได้ระหว่างบิน; ค่า implicit ตามภาษาและ override เดิมจาก R1 ไม่เปลี่ยน; class `notation-section` คงไว้ให้ journey `notation-defaults` เดิม
- **U16:** `src/ui/engine-levels.ts` (ใหม่, pure) อ่าน `effectiveThrottle` ของ stage/booster ที่ burning จาก frame ที่แสดงอยู่ แล้ว HUD เพิ่มแถว “Engine level (actual)” เช่น `core 100 % · strap-ons 81 %` ข้างแถว “Throttle command”; live/replay อ่าน frame เดียวกัน ไม่อ่าน manual input
- ช่อง throttle ใน 6-DOF panel เปลี่ยนชื่อเป็น “Manual throttle command (%)” (ค่าที่ใช้เมื่อสลับเป็น manual ไม่ใช่ค่า autopilot สด; ค่าจริงอ่านจากแถว HUD); ร่างแรกที่ทำให้ช่องว่างใต้ autopilot ถูกยกเลิกเพราะขัดกับ `tests/rigid-controls.test.ts` ที่กำหนดให้ replay แสดง command ที่บันทึกไว้ — ไม่ได้แก้ test นั้น; panel นี้ปิด (collapsed) อัตโนมัติขณะ autopilot เพราะช่องถูก disable อยู่แล้ว และเปิดเมื่อเป็น manual หรือผู้ใช้เปิดเอง (จำการเลือกของผู้ใช้)
- **A04:** `#mobile-flight-bar` (≤860 px) แสดงนาฬิกา, LIVE/REPLAY และ play/pause ค้างด้านล่างขณะเลื่อนดูกราฟ ใช้ `togglePlay()` เดิม ไม่เพิ่มเส้นทางคำสั่งใหม่
- คง `Space` (playback) / `Shift+Space` (live), ไม่แตะ recorder/frame/CSV schema

### R2.2 — CameraPolicy (U03; U08 ทำแล้วใน R1)

- `src/render/camera-policy.ts` (ใหม่, pure): owner `cinematic | manual` แยกจาก view และ follow target
- ผู้ใช้เลือก view (แท็บ, ปุ่ม 1–4, WebMCP `set_camera`) → manual และ phase ใหม่ไม่แย่งคืน; ปุ่ม **Cinematic** (`#btn-cinematic`, aria-pressed) คืนกล้องให้โปรแกรมที่ view ของ phase ปัจจุบัน; สวิตช์ “Switch cameras automatically” ใน dialog เดิมเป็น state เดียวกัน
- target ที่ view ปัจจุบันมองไม่ได้ (เช่นตาม booster ขณะอยู่ onboard/map) fallback ไป exterior อย่างชัดเจน และยังเป็น manual
- Watch มีแท็บเลือก view + Cinematic แล้ว (เดิมซ่อน); เปิด launch ใหม่ใน Watch reset เป็น Cinematic; การ frame ยานตอนเปิดภารกิจยังใช้ `cams.reset()` ภายในเดิม; ไม่นำปุ่ม reset camera กลับมา

### R2.3 — เลือกการ์ดและ presets (U10, ขั้นแรก)

- `src/ui/telemetry-layout.ts` (ใหม่, pure): presets All / Flight / Dynamics / Orbit / Custom, versioned JSON (`version: 1`), ข้อมูลเสีย/ใหม่กว่า → กลับเป็นทุกการ์ด, card id ที่ไม่รู้จักถูกตัด
- telemetry panel (Engineer) มี select preset + “Choose cards” checkbox; การติ๊กเปลี่ยนเป็น Custom โดยเริ่มจากการ์ดที่แสดงอยู่; การ์ดที่กลับมาวาดจาก frame ปัจจุบันทันที
- เก็บที่ `orbitlab.telemetryLayout` ผ่าน `workspaceStorage()` และเพิ่มใน `WORKSPACE_KEYS` จึงเป็นข้อมูลของแต่ละโปรไฟล์ (migration/archive/delete ตาม registry ของ R1.1)
- นาฬิกา, live/replay, ปุ่ม playback/abort/flight commands, event log และปุ่ม export ไม่ใช่การ์ดจึงซ่อนไม่ได้
- ยังไม่ทำ dock/resize/reorder และ Docking preset (หลัง R5) ตามลำดับของแผน

### R2.4 — Timeline event chooser (A05)

- `src/ui/timeline-chooser.ts` (ใหม่, pure): เรียงสมาชิกตามเวลาที่บันทึก (เวลาเท่ากันคงลำดับที่ recorder ส่ง), ทำเครื่องหมาย event ที่ cursor อยู่ (`aria-current="time"`), keyboard movement
- chip ที่รวมหลายเหตุการณ์ (`aria-haspopup="menu"`, `aria-expanded`) เปิดรายการชื่อ + T+ แทนการกดวน; เลือกแล้ว seek ไปที่ `event.t` ที่บันทึกตรงตัว
- ลูกศร/Home/End เลื่อนในรายการ, Enter/Space เลือก, Escape/Tab ปิดและคืน focus ให้ chip; keydown ในรายการไม่ส่งต่อไปยัง shortcuts ของแอป (ไม่ seek/สลับกล้อง/ควบคุมยาน)
- รายการอยู่ใต้ `<body>` แบบ fixed เพราะ bar และ playback panel ตัด overflow; ปิดเมื่อคลิกนอก, reset ภารกิจ, chip ถูกยุบ; อัปเดตเมื่อ recording เพิ่ม event ในกลุ่มเดิม
- แสดงเฉพาะ event ที่บันทึกแล้ว (≤ recording head) เหมือน chip บน bar

## หลักฐานที่รันจริง

Local: Node 22.22.0 (แผนระบุ 22.23.3), Chromium **141.0.7390.37** ที่ติดตั้งในเครื่อง (CI ใช้ 153 จึงต้องรันซ้ำใน CI), software WebGL, render scale 0.5

- `npx tsc --noEmit`: ผ่าน
- unit ใหม่: `tests/timeline-chooser.test.ts` (4), `tests/camera-policy.test.ts` (7), `tests/engine-levels.test.ts` (4), `tests/flight-lifecycle.test.ts` (2), `tests/telemetry-layout.test.ts` (5) — ผ่านทั้งหมด
- `tests/i18n.test.ts`, `tests/camera-gestures.test.ts`, `tests/workspace-profiles.test.ts`: ผ่าน (i18n จับ key ที่ไม่มี call site ได้หนึ่งครั้งระหว่างพัฒนาและแก้แล้ว)
- full default unit suite (`npx vitest run`, หนึ่ง process บน 4 cores): **10,095 passed / 1 failed จาก 10,096 (279 files)** — case ที่ล้มคือ `tests/rigid-controls.test.ts` ซึ่งเกิดจากร่างแรกของ R2.1 (ทำช่อง manual throttle ว่างใต้ autopilot); ยกเลิกการเปลี่ยนนั้นแล้วรันไฟล์ซ้ำ **3/3 ผ่าน** ไม่ได้แก้ test
- `tests/repo-hygiene.test.ts` 9/9, `tests/hud-layout.test.ts` 24/24, `tests/bundle-budget.test.ts` + `tests/budget.test.ts` 18/18 ผ่าน
- `npx vite build` + `node scripts/bundle-budget.mjs`: index JS เกิน 12.2 kB (2585.2/2573) และ index CSS เกิน 0.6 kB (169.6/169) จากฟีเจอร์ R2 บนหน้าจอแรกของ Launch; ปรับ ceiling เป็น 2588 / 170 kB พร้อมเหตุผลใน `budgets.json` `_notes` ตามกติกา; worker และ precache ceilings ไม่เปลี่ยน; หลังปรับ budget **ok**
- browser บน production `dist/` (Chromium 141 local): `node tests/browser/run.mjs --dist dist r2-flight-shell notation-defaults gesture-ownership watch-controls mobile-smoke workspace-navigation` → **6/6 journeys ผ่าน, 585.7 s** (r2-flight-shell 232.2 s, watch-controls 145.6 s, workspace-navigation 84.5 s, mobile-smoke 68.2 s, gesture-ownership 29.5 s, notation-defaults 23.8 s); journey เดิมผ่านโดยไม่แก้ selector (`notation-section` ย้ายไป telemetry แล้ว)
- รอบสุดท้าย r2-flight-shell รวม R2.3: preset Orbit ซ่อน q/แสดง apsides, ติ๊ก mass → Custom, reload แล้วคงค่า, All กลับครบ, clock/playback/event log ไม่หาย; จอ 1024×700 EN, 320×740 RU, 390×844 TH ระหว่างบินไม่เลื่อนแนวนอนและปุ่ม play/⚙ Setup/clock อยู่ในจอ; แถว engine อ่านได้ `core 58 % · strap-ons 58 %` ช่วงเครื่องยนต์กำลังเร่งตอน ignition (ค่าจริงต่างจาก command)

ผลรอบก่อนเพิ่ม R2.3 (production build ของ commit `2613159`): **1/1 journey ผ่าน**, 153.4 s — setup ซ่อนและ scene ขยาย, ⚙ Setup แสดง/ซ่อน config ที่ disable, notation เปลี่ยนกลางบิน, HUD แสดง `core 100 % · strap-ons 100 %` (ช่วงต้นของ Soyuz-2.1a ยังไม่ถึง programme step จึงไม่ได้พิสูจน์ค่า 81 %), view `space` อยู่ข้าม T+148 s และ Cinematic คืน `exterior`, chooser เปิด/ลูกศรไม่ seek/Enter seek ไปเวลาที่บันทึกตรงตัว/Escape คืน focus, Watch `onboard` อยู่ข้าม T+150 s, โทรศัพท์ 390 px มี flight bar ที่ play/pause ได้และไม่เลื่อนด้านข้าง

## ข้อจำกัดและงานที่ยังเหลือ

- D08 ยังรอคำยืนยัน; G2 (wireframe/screenshot ตามสภาวะจริง) ยังไม่ผ่านจนกว่าผู้ใช้ตรวจภาพ
- จอ 1280×800 ที่เปิด first-use guide อยู่ ภาพยังเตี้ยเพราะ guide และ playback panel ใช้ความสูง; ไม่ได้ซ่อน guide ระหว่างบินเพราะเป็น onboarding ที่ผู้ใช้ปิดเองได้
- ไม่ได้ตรวจ Edge/Safari/อุปกรณ์จริง, browser zoom 125/150 % และทุก breakpoint 860/861, 1180/1181 px
- U16: แก้เฉพาะ semantics/readout ของ UI; CSV มาตรฐานยังไม่มีคอลัมน์ actual core/booster (ต้องผ่าน contract owner) และโปรแกรมคันเร่ง/Max-Q ราย variant เป็น R4.2/R4.3 ไม่อ้างว่าฟิสิกส์ Max-Q ถูกต้อง
- R2.3 ยังไม่มี dock/resize/reorder, keyboard reorder และ Docking preset
- flight bar มือถืออาจถูก toast “ready to work offline” ทับชั่วคราว (toast เดิมของแอป)
- ไม่ได้รัน heavy/fleet เพราะไม่ได้แตะฟิสิกส์, recorder หรือ worker
