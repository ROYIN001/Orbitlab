# Replay: spent stages on their arc between frames / ชิ้นส่วนที่ทิ้งแล้วอยู่บนวงโคจรระหว่างเฟรม

> **สรุปสำหรับเจ้าของ (ภาษาไทย)**
>
> - ปัญหา: ตอนดูย้อนหลังเที่ยวบิน Soyuz-2.1a ทั้งเที่ยวมีลูกเรือและ Progress ระหว่างเฟรมที่บันทึกไว้ Blok I ถูกวาดต่ำกว่ายาน 1.4 m ที่ 0.03 s หลังแยกตัว, 22 m ที่ 0.5 s, 59 m ที่ 1.5 s และ 115 m ที่ 5 s แล้วกลับเป็น 0 ที่ 10 s ดูเหมือนตกออกจากยานด้วยความเร็ว 45 m/s
> - สาเหตุ: `interpolateFrames` วาดตัวยานบนวงโคจร (Kepler) แต่วาด debris ทุกชิ้นเป็นเส้นตรงระหว่างสองเฟรม เฟรมในวงโคจรห่างกัน 10 s เส้นตรงจึงยุบต่ำกว่าวงโคจร v²Δt²/8R ≈ 115 m ที่กลางช่วง
> - แก้: debris ที่ลอยตัวอยู่นอกบรรยากาศ (ไม่ติดเครื่องทั้งสองเฟรม และสูงกว่า 140 km ทั้งสองเฟรม) เคลื่อนแบบเดียวกับยาน (`path`) ถ้ายานใช้วงโคจร debris ก็ใช้วงโคจร ถ้ายานใช้เส้นตรง (six-DOF หรือขณะจุดเครื่อง) debris ก็ใช้เส้นตรงด้วย ทั้งสองจึงไม่แยกกัน ตัวยานเองไม่เปลี่ยน
> - ทำไมไม่ให้ debris ใช้วงโคจรเสมอ: ในโหมด six-DOF ซึ่งเป็นค่าเริ่มต้นของจรวดในแคตตาล็อก ตัวยานเองถูกวาดเป็นเส้นตรง (คลาดได้ถึง 460 m เมื่อเฟรมห่าง 20 s) และ Blok I ยุบไปพร้อมกัน จึงห่างกันแค่ 0.45 m ถ้าย้ายเฉพาะ debris ไปบนวงโคจร จะกลายเป็น Blok I ลอยเหนือยาน 115–460 m แทน ปัญหายานเป็นเส้นตรงใน six-DOF เป็นเรื่องที่มีอยู่เดิมและไม่ได้แก้ใน PR นี้
> - ผล: point-mass คลาดจากตำแหน่งจริง 0.00 m (ละเอียดถึงเซนติเมตร) ส่วน six-DOF วัดได้เท่าเดิมทุกค่า
> - ขนาด: อยู่ใต้เพดานทุกกลุ่ม ไม่ได้ขึ้นเพดาน
> - การ merge: เป็นการแก้บั๊ก (ผิด → ถูก) และมีเทสต์ที่ fail ก่อนแก้ แต่เป็นงาน physics จึงต้องให้ agent ตัวที่สองตรวจก่อน ตอนนี้ยังรอการตรวจ

```yaml
item: replay debris blend between recorded frames (bug fix)
change_kind: bug fix (wrong → right); no assertion changed, no ceiling raised
owner_authorization: 'owner in chat to this session, 2026-10-28: "Task: blend coasting debris the way the vehicle is blended"'
app_code: src/physics/frame.ts
tests: tests/debris-replay.test.ts (new)
base_sha_verified_on: {sha: 7263004, date: 2026-10-28}
branch: claude/gifted-gauss-ojjpaj
pr: 185
second_agent_review: pending
```

## Cause

`interpolateFrames` (src/physics/frame.ts) draws the vehicle between two recorded frames:
- with `propagateKepler` from the earlier frame when both frames coast;
- with the cubic `hermite` through both ends in a rendezvous or Apollo;
- on the straight line otherwise.

Every debris item was drawn on the straight line. In orbit the recorder keeps a frame every 10 s (30 s far from a burn). A 10 s chord of a 7.79 km/s orbit sags v²Δt²/8R ≈ 115 m under the arc at mid-span, and u(1−u)·4·115 m elsewhere in the span.

## Change

The vehicle's three branches become one closure, `path(ar, av, br, bv, coasts = true)`, and the vehicle's call is unchanged. A debris item alive in both frames (with the same rigid configuration, as before) is blended with `path(…, coasts)`. Here `coasts` means:
- nothing on it is firing at either end: `burning`, which is the recovery engines; a stage flown home starts its boostback, entry and landing burns on events, which the recorder pins frames to;
- it is above `AIRLESS_HEIGHT` = 140 km at both ends. That is the height above which the simulation flies the vehicle's coast on a Kepler arc (`useKepler`) and counts a spent stage as in orbit.

A body that does not coast keeps the straight line, as does every body while the vehicle takes the line (six-DOF, under thrust, the frame a burn begins on). Both blends are pure functions of the two frames.

## Measured

Probe (gitignored `tests/probe/`), Soyuz-2.1a to the ISS orbit from Baikonur, recorded through `FlightRecorder.advance`. The figure is Blok I's drawn position relative to the spacecraft, minus its Kepler-flown position relative to the spacecraft, both from the earlier frame:

| after separation | +0.03 s | +0.5 s | +1.5 s | +5 s | +10 s | +15 s | +20 s | +25 s |
|---|---|---|---|---|---|---|---|---|
| point-mass crewed, before | 1.38 m | 21.88 | 58.72 | 115.14 | 0.00 | 115.14 | 0.00 | 0.00 |
| point-mass Progress, before | 1.38 | 21.92 | 58.85 | 115.39 | 0.00 | 115.38 | 0.00 | 0.00 |
| point-mass, both, after | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 |
| six-DOF crewed, before = after | 0.00 | 0.04 | 0.13 | 0.45 | 0.00 | 0.90 | 1.79 | 2.69 |

- **+25 s:** the span from the last coast frame to the frame the spacecraft's burn begins on, where its status is already `burn`. The vehicle is drawn on the line there (115 m off its arc), and Blok I stays beside it: 0.00 m before and after.
- **Six-DOF:** the vehicle is drawn on the line between orbit frames (up to 460 m off its arc on the 20 s span from +10 s), and Blok I sags with it. The 0.45–2.7 m left there is the J2 that the six-DOF vehicle is flown with and that the Kepler reference here leaves out. Neither is changed here.

Tests:
- `tests/debris-replay.test.ts`, 5 tests: an orbiting body 10 s apart stays on its 220 km circle at mid-span within 1 m (the chord is 114.4 m inside); Blok I keeps its place beside the spacecraft at the measured instants; the straight line is kept beside a vehicle drawn on the line, and for a body in the air or firing its engines; the blend is pure; a recorded point-mass Progress flight (0.5 s to record).
- On main's frame.ts, 2 of 5 fail (114.4 m, 1.38 m). With the fix, 5 of 5 pass.
- Related files: replay, rigid-replay, vostok-replay, vostok-render, launch-abort, equations, live-stepping, orbit-handoff, rendezvous, rendezvous-fuel, rigid-debris, apollo-own-launch, bundle-budget, 10 more that record or seek frames, and debris-replay itself: 24 files, 384 tests, all pass.

## Size

`npx vite build`, `node scripts/bundle-budget.mjs`: ok, no ceiling raised.
- `index-*.js` is 2,634,842 B: +39 B on #179's measured 2,634,803 B, of a 2,635,000 B ceiling.
- Precache code is 14,653.9 of 14,654 kB.
- `interpolateFrames` is bundled into `index-*.js` and `flight.worker-*.js` only.
- The first version of this change was 0.1 kB over the precache code ceiling (CI run 40771121247). It was cut down to fit: the lasting-orbit clause was dropped, so a body in an orbit whose perigee is 120–140 km is drawn on the line while it is below 140 km, as before.

## Not changed, for later

- In a six-DOF flight the vehicle itself is drawn on the straight line between orbit frames, up to 460 m off its arc (`ballistic` requires `!a.rigid`). Moving it onto its arc would need its debris to follow; that is a separate change.
- A body falling through the air while the vehicle coasts in orbit (10–30 s frames) is still drawn on the line.
