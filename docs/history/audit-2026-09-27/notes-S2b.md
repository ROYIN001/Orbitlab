# บันทึกเซสชัน S2b — Orbit results provenance

28 กันยายน 2026 · สาขา `claude/audit0927-s2b-orbit-results` จาก `main` ที่ `dba7b0a` · รายการ A4, A5, A14, A15, A16

## สิ่งที่ทำ

| Commit | เรื่อง |
|---|---|
| `Add ResultSlot…` | `src/ui/result-slot.ts` (ใหม่, DOM-free): `ResultSlot<I, R>` เก็บ inputs เป็นสำเนา deep-freeze, generation, state `idle/running/done/stopped/failed`, result; `start()` เพิ่ม generation, `accept()/stop()/fail()/report()` ทิ้งผลของ generation เก่า, `status(current)` คืน `fresh/stale/none` ด้วย deep-equal, `changed()` บอกว่า input ใดต่าง, `describe()` สำหรับบรรทัด "คำนวณจาก", `requestStop()` สำหรับปุ่ม Stop; และ `positiveNumber()`, `Latest` |
| `Real satellites: results keep the inputs…` | A4, A14, A15 ใน `sky-panel.ts` |
| `Real satellites: readouts say when SGP4…` | A16 ใน `sky-panel.ts` และ `ground-track.ts` (option `nowLabel` บรรทัดเดียว) |
| `Orbit lifetime: show the result…` | A5 ใน `lifetime.ts` |

### แพตเทิร์นกลาง

ทุกผลมีบรรทัด "คำนวณจาก: …" (key `result.from`) ใต้ปุ่มคำนวณ เมื่อ `status()` เป็น `stale` จะมีแถบเตือน (`result.stale`; ถ้าต่างแค่ข้อมูลใช้ `result.staleData`; ถ้ายังรันอยู่ใช้ `result.staleRunning`) และส่วนผลถูกหรี่ด้วย `opacity: 0.55` พร้อม `data-fresh="stale"` ให้ test/automation อ่านได้ ใช้ inline style เพราะ `src/style.css` อยู่ในรายการห้ามแก้ — ถ้าต้องการคลาส CSS จริงให้ย้ายไปใน wave ถัดไป

| ผล | inputs ที่ผูกไว้ | เมื่อไม่ตรง |
|---|---|---|
| passes (R03) | วัตถุ, epoch ของชุดค่า, lat/lon, มุมเงยต่ำสุด, ข้อมูล | คำนวณใหม่อัตโนมัติ (งานเบา) |
| overflights (M02) | กลุ่ม, สถานี + lat/lon, มุมเงย, ช่วงเวลา, ข้อมูล | แสดงผลเดิมแบบ stale; บรรทัดสถานะระบุเมืองของผล (`over.foundAt`) |
| screening (M01) | วัตถุ, epoch, ระยะ, ช่วงเวลา, รัศมี, ข้อมูลแคตตาล็อก, ไฟล์ที่นำเข้า | stale; ของดาวเทียมอื่นไม่แสดง (เหมือนเดิม) |
| re-entry (M03) | วัตถุ, epoch, มวล, พื้นที่, C_D, ข้อมูล, โหมดข้อมูล | stale; ของดาวเทียมอื่นไม่แสดง |
| case study CZ-5B | โหมดข้อมูล (space weather) | stale พร้อมปุ่มคำนวณใหม่ |
| lifetime | start (jd), แรง 6 ตัว, activity, method, horizon, มวล, พื้นที่, C_D, C_R | stale โดยไม่วาดฟอร์มใหม่ |

"ข้อมูล" คือ `{from, asOf, fetched}` ของชุด satellites ที่โหลด (หรือชื่อไฟล์ + ลำดับการนำเข้า) ดังนั้นเมื่อสลับ provider แล้วได้ชุดใหม่ ผลจากชุดเก่าจะ stale (A14) แต่ถ้า Online ล้มแล้วใช้ snapshot เดิม ข้อมูลเหมือนเดิม ผลยังเป็น fresh ซึ่งถูกต้อง

### A14 — provider race

`load()` จับ token จาก `Latest` และ callback ทั้ง resolve/reject ตรวจ `isLatest(token)` ก่อน assign; `reset()` เลื่อน token, ล้าง `lastGood`, ตั้ง `stale = true` แก้ภายใน `RealSky` ทั้งหมด ไม่แตะ `playground.ts` / `main.ts`

### A15 — re-entry

`runReentry()` สร้าง inputs และ snapshot ก่อน `await sun()` แล้วคำนวณจาก `slot.inputs` (frozen) ไม่อ่าน `this.reentry` หลัง await อีก `sun()` คืนที่มาของ space weather (`asOf`, `from`, `source`, `fetched`, `fallback`) และแสดงใต้ผลในรูปแบบเดียวกับแคตตาล็อก ("Space weather as of … · bundled with …" และคำเตือน `data.fallback`) ช่องมวล/พื้นที่/C_D ใช้ event `input` + `positiveNumber()` ค่าผิดแสดง `result.invalid` และ disable ปุ่ม

### A16 — propagation failure

- `facts()` สร้าง `p.pg-sky-state` (role=status) แทนย่อหน้า error ที่สร้างครั้งเดียว; `updateLive()` เขียน `sky.error` + `sky.unavailable` ลงไปทุกเฟรม และเขียน "—" ลง altitude/speed/lat-lon/TEME
- เมื่อสถานะ ok/failed เปลี่ยนจากตอนวาด facts จะเรียก `refreshFacts()` เพื่อให้บล็อกที่ต้องใช้ตำแหน่ง (passes, approaches, re-entry, To playground) หายไปหรือกลับมาตาม
- `drawTrack()` ใช้ `lastGood` เฉพาะวาดเส้นและจุด และส่ง `nowLabel: t('sky.track.lastGood')` ให้ legend แทน "Satellite now"; footprint ไม่วาดเมื่อไม่มีตำแหน่งปัจจุบัน

**แตะไฟล์นอกรายการเจ้าของ 1 ไฟล์:** `src/ui/orbit/ground-track.ts` เพิ่ม field `nowLabel?: string` ใน `TrackOverlay` และใช้ใน legend (2 บรรทัด) เพราะเกณฑ์ A16 กำหนดว่า "ต้องระบุในภาพ" ไฟล์นี้ไม่อยู่ในรายการเจ้าของของเซสชันใดใน wave 1 และไม่อยู่ในรายการห้ามของ S2b ถ้าไม่ต้องการ ให้ revert เฉพาะ 2 บรรทัดนั้น (legend จะกลับไปเขียน "Satellite now")

### A5 — lifetime

`LifetimeDialog` ใช้ `ResultSlot<LifetimeInputs, LifetimeOutput>`; `run()` คำนวณจาก `slot.inputs` (frozen) ไม่ใช่ `this.*`; `markFreshness()` อัปเดตแถบเตือน บรรทัด "คำนวณจาก" การหรี่ผล ปุ่ม Run และข้อความสถานะ โดยไม่วาดฟอร์มใหม่ (จึงไม่เสีย focus) ช่องตัวเลขไม่ถูกต้อง → `result.invalid` ข้างช่อง, `aria-invalid`, Run disabled, สถานะ `result.fixFirst` `activityFor()` คืนค่าแทนการเขียน `this.activityNote` และเก็บ fallback ของ space weather ไว้กับผล `describeLifetime()` export ไว้ทดสอบ

## i18n

key ใหม่ครบ en/ru/th: `result.*` (from, runningFrom, stale, staleData, staleRunning, data, file, epoch, area, radius, sw, invalid, fixFirst), `sky.unavailable`, `sky.track.lastGood`, `over.foundAt`, `over.noneAt` ลบ `over.found` และ `over.none` ที่ไม่มีที่เรียกแล้ว (test call-site บังคับ)

## การทดสอบ

- `tests/result-slot.test.ts` (ใหม่, 17 กรณี): stale หลังเปลี่ยนอินพุต, สำเนา frozen, ผล generation เก่าถูกทิ้ง, stop/fail/clear, describe, `positiveNumber`, `Latest`; ระดับ model ของ `RealSky` ด้วย provider ปลอมที่ resolve ตามสั่ง: Online ค้าง → Offline → สถานะสุดท้ายเป็น Offline แม้ Online ตอบ/ล้มทีหลัง; overflights stale เมื่อเปลี่ยนเมือง/มุมเงย/ช่วงเวลา/ชุดข้อมูล; re-entry เปลี่ยนมวลระหว่างรอ space weather → ผลใช้ 1 000 kg, stale, `changed = ['mass']`, เก็บ fallback ของ space weather; run ที่สองชนะ run แรก; lifetime stale ทุกอินพุตและ describe ครบ
- `npm run typecheck` ผ่าน (ตรวจทั้ง 4 commit แยกกัน); `npm test` ทั้งชุดบน HEAD: **129 files, 1 687 tests ผ่าน** (1 151 s; เดิม 1 670 + ใหม่ 17)
- ไม่ได้แตะ physics/flight ใด ๆ เที่ยวบิน built-in จึงไม่เปลี่ยน
- tests/overflights, reentry, passes ไม่ต้องเพิ่มกรณี (ตรรกะของมันไม่เปลี่ยน)

## ตรวจในเบราว์เซอร์ (npm run dev + Playwright headless, 1400×1000)

สคริปต์อยู่ใน `tests/probe/` ระหว่างทำงานและถูกลบก่อนจบตามกติกา

- **A4** Orbit → Explore → Real satellites → Overflights (Space stations, Bangkok, ≥60°, 24 ชม.): พบ 20 รายการ (วันนี้; รายงานเดิมได้ 26 ในเวลาอื่น) บรรทัด "Calculated from: Bangkok · Space stations · ≥ 60° · 24 hours · element sets as of Sep 26, 2026." → เลือก Moscow: หัวข้อ "Overflights of Moscow", แถบเตือน stale, ผลหรี่ (`data-fresh=stale`), สถานะ "20 overflights of Bangkok from …" → กลับ Bangkok: fresh; มุมเงย 45°: stale; 3 วัน: stale
- **A5** Orbit → Engineer → Orbit lifetime: 101 kg, 2 m², Run → "Re-enters the atmosphere after 5.0 months." พร้อมบรรทัดอินพุตครบ (มวล พื้นที่ C_D C_R แรง วิธี horizon activity) และ space weather ในบรรทัด activity → มวล 10001: stale + เตือน → −5 หรือว่าง: ข้อความข้างช่อง, Run disabled, "Correct the values marked to run." → 101: Run เปิด, fresh
- **A15** หน่วง `space-weather.json` 3 วินาที, ISS, Predict → ระหว่างรอพิมพ์มวล 50000: ผลออกมา "Calculated from: ISS (ZARYA) · 1,000 kg · 5.00 m² · C_D 2.20 · …" พร้อม stale และ "Space weather as of Sep 26, 2026, 8:00 PM UTC · bundled with this version of Orbitlab"; มวล 0 → ปุ่ม disabled
- **A16** นำเข้า OMM JSON วงโคจร ~170 km, BSTAR 0.01, เปิด Ground track, warp 86 400×: หลังราว 9 ชม. จำลอง altitude/speed/under the satellite เป็น "—", แถบ "SGP4 cannot place it at this moment: its mean eccentricity has left the range 0–1. Its height, speed and position at this moment are not available." อายุชุดค่ายังเดินต่อ, legend แผนที่เป็น "Last position SGP4 could give", บล็อก re-entry/passes หายไป
- **A14** หน่วง CelesTrak 4 วินาทีแล้ว abort, เริ่ม Offline, หา overflights, เลือก Online แล้ว Offline ภายใน 0.5 วินาที: หลัง Online ล้ม/ตอบช้า สถานะยังเป็น "bundled with this version of Orbitlab" ไม่มีคำเตือน fallback, ผล overflights ยัง fresh (ชุดข้อมูลเดิม)
- ไม่มี page error ในทุกสคริปต์

## ข้อสังเกต / งานต่อ

- การหรี่ผลใช้ inline style (ห้ามแก้ `style.css`) — ถ้าเจ้าของต้องการ ให้เพิ่ม `.pg-result[data-fresh="stale"], .life-result[data-fresh="stale"] { opacity: .55 }` ใน wave 2 แล้วเอา inline ออก
- `lastGood` ยังถูกอัปเดตจากจุดบนเส้น track ที่คำนวณได้ (พฤติกรรมเดิม) จึงเป็น "ตำแหน่งล่าสุดที่คำนวณได้" ตามลำดับการวาด ไม่ใช่ตามเวลาเสมอไป
- ปัญหาเดียวกันในที่อื่นที่รายงานเอ่ยถึง (Monte Carlo, tuning) อยู่นอกขอบเขต S2b; `ResultSlot` ใช้ซ้ำได้

## Merge กับ main (28 ก.ย.)

main เปลี่ยน `sky-panel.ts` ไปมากจาก P2.5 (screening ใน worker, re-entry เป็น job พร้อม drag fit, overlay บนแผนที่, case lessons) จึงยึดไฟล์ของ main เป็นฐาน แล้วนำการแก้ S2b ไปใส่ใหม่:

- `load()` ยังใช้ token ล่าสุด ครอบการรอ Earth orientation ที่เพิ่มเข้ามา
- screening/re-entry ใช้ `AbortController` ของ main สำหรับปุ่ม Stop และเก็บผลใน `ResultSlot`; inputs ของ re-entry มีแหล่ง drag (`history`/`decay`/`size`) และนับมวล/พื้นที่/C_D เฉพาะเมื่อเลือก `size`
- แผนที่วาดพื้นที่ตกของ re-entry เฉพาะเมื่อผลยัง fresh
- progress ของ job อัปเดตผ่าน element ที่เก็บไว้แทน `document.querySelector` (ทำให้ model test รันใน node ได้)
- `lifetime.ts` ใช้ `loadSolarDaily()` ตาม main
- ตรวจในเบราว์เซอร์ซ้ำบนโค้ดที่ merge แล้ว: A4, A5, A15 (ต้องเลือก "a mass and size you give" ก่อนจึงมีช่องมวล), A16 ผ่านเหมือนเดิม
