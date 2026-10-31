# Replay: the frames a falling stage needs / เฟรมที่ชิ้นส่วนที่กำลังตกผ่านบรรยากาศต้องใช้

> **สรุปสำหรับเจ้าของ (ภาษาไทย)**
>
> - ปัญหา (ต่อจาก #191): ตอนยานลอยอยู่ในวงโคจร ตัวบันทึกเก็บเฟรมทุก 10–30 s ชิ้นส่วนที่กำลังตกผ่านบรรยากาศชะลอความเร็วลงหลาย km/s ภายในช่วงเดียว cubic ของ #191 วาดมันใกล้ "เส้นทาง" แต่ผิด "เวลา" (วาดเร็วหรือช้ากว่าจริงไปตามเส้นทาง) วัดทุก 1 วินาทีเทียบกับการจำลอง six-DOF: ท่อน S-II ของ Apollo 11 คลาด 3.4 km, booster ของ Sputnik 2.3 km, Blok A ของ Soyuz MS-16 0.8 km, ท่อนแรกของ H-IIA 0.7 km
> - และเมื่อบันทึกยาวจนเกินงบเฟรม การ thin ทำให้ช่วงห่างของเฟรมกลายเป็นนาที: ที่งบ 800 เฟรม ท่อนแรกของ H-IIA คลาด 67.8 km, S-II ของ Apollo 36 km; Soyuz MS-25 ที่บินไปถึงสถานีอวกาศ 2 วัน คลาด 33 km
> - แก้ (src/replay/recorder.ts ไฟล์เดียว ไม่แตะการจำลอง):
>   1. ขณะมีชิ้นส่วนที่ยังไม่ตกถึงพื้นอยู่ที่ความสูง 10–100 km ตัวบันทึกเก็บเฟรมอย่างน้อยทุก 5 s ไม่ว่ายานกำลังทำอะไร
>   2. การ thin จะไม่เปิดช่องว่างกว้างกว่า 5 s ตรงที่มีชิ้นส่วนกำลังตก ในทุกขั้น (ช่วงที่บินขึ้นยังถูก thin เหลือเฟรมละวินาทีได้เหมือนเดิม และเพดานจำนวนเฟรมยังเป็นเพดานจริง)
> - ผล six-DOF (ค่าเริ่มต้นของแอป) ครบ 20 ภารกิจ: ชิ้นส่วนที่ตกทุกชิ้นคลาดไม่เกิน 24 m (S-II 3,394 → 6 m, Sputnik 2,274 → 21 m, Blok A 577–823 → 11–14 m, H-IIA 704 → 24 m) เฟรมเพิ่ม 0–78 เฟรมต่อภารกิจ รวม 511 เฟรม (10.5 MB)
> - point-mass: การจำลองให้ตำแหน่งชิ้นส่วนเฉพาะตอนจบแต่ละ step (ในวงโคจร 10–19 s) ตอนนี้เก็บทุก step แทนที่จะเก็บ step เว้น step: Sputnik 1,596 → 388 m, H-IIA 620 → 51 m, S-II 874 → 13 m, Blok A ของ Soyuz MS 1.2–1.6 km → 27–34 m เฟรมเพิ่มรวม 137 เฟรม (0.8 MB) ต่ำกว่า 388 m ต้องให้การจำลองก้าวสั้นลงตอนชิ้นส่วนตก ซึ่งเปลี่ยนการบิน (fingerprint) จึงไม่ได้ทำ
> - งบเฟรมที่บังคับให้เล็ก: H-IIA 67.8 km → 51 m, Apollo 36 km → 129 m, MS-25 32.9 km → 33 m, Soyuz MS docking six-DOF ถึง T+14,000 s 577 → 14 m
> - Vostok-1 six-DOF: 4,726 → 4,804 เฟรม, 98.8 → 100.7 MB ยังอยู่ใต้ 101 MB ที่เทสต์ heavy กำหนด แก้ตัวเลขใน docs/PHYSICS.md แล้ว
> - ทางเลือกที่วัดแล้วไม่ใช้: ทุก 2 s; ทุกอย่างที่ต่ำกว่า 100 km (Vostok-1 ได้ 102.7 MB เกินเพดาน 101 MB เพราะ fairing และเปลือกโมดูลที่ตกช้าๆ ใกล้พื้น); ความเร็วเทียบอากาศ (เกินเพดาน bundle); อัตราการตกในแนวดิ่ง (พลาดช่วงที่ชิ้นส่วนบินเกือบราบขณะชะลอแรงที่สุด)
> - เทสต์: ใหม่ 4 ข้อ (tests/falling-frames.test.ts) ล้มบนโค้ดเดิมทั้ง 4 ข้อ (1,596 m, 4,708 m, 10,671 m) และใหม่ 1 ข้อใน heavy (six-DOF Sputnik, เดิม 2,274 m) เปลี่ยน assertion เดิม 2 ข้อ: ข้อแรก เทสต์ H-IIA ของ #191 เคยวัดที่ step ที่ตัวบันทึกไม่ได้เก็บ ตอนนี้เก็บครบทุก step จึงเปลี่ยนไปวัดระหว่าง step ด้วยการบินซ้ำแบบละเอียด (เกณฑ์ 600 m เท่าเดิม วัดได้ 51 m) ข้อสอง เทสต์ของ #187 จากการ merge main (บรรทัดล่าง) ดังนั้นไม่เข้าเงื่อนไขอนุมัติถาวรสำหรับบั๊ก ต้องให้เจ้าของกด
> - ขนาด: บน main ล่าสุด (merge แล้ว) precache code +10 B เหลือ 1,018 B ใต้เพดาน (#184 ขึ้นเพดานไปแล้ว) ไม่ได้ขึ้นเพดานเอง ตอนเริ่มงาน (บน #191) +4 B เหลือ 55 B โค้ดเดิมสองจุดที่เขียนสั้นลงโดยผลเท่าเดิมตอนนั้นจำเป็นเพื่อให้พอดี ตอนนี้ไม่จำเป็นแล้วแต่ยังช่วยประหยัด เจ้าของเลือกให้แยกเป็น PR ต่างหากได้ (ดูหัวข้อ Size)
> - ซ้อนอยู่บน #191 (เจ้าของเลือก "Stack on #191") ต้อง merge #191 ก่อน main ขยับไป (#187, #193, #184) จน #191 และ PR นี้ชนกับ main และ CI ไม่รัน จึง merge main เข้ามาแล้ว (commit 4ed2c86): ชนแค่ doc comment ใน frame.ts และแก้เทสต์ของ #187 หนึ่งข้อตามที่รายงานของ #191 ระบุไว้ (ชิ้นส่วนในอากาศในเทสต์นั้นต้องจุดเครื่องยนต์ `burning: true` เพราะชิ้นที่ไม่จุดเครื่องยนต์ใช้ cubic ของ #191 แล้ว) ตัวเลข point-mass วัดใหม่บนโค้ดที่ merge แล้ว ไม่เปลี่ยน
> - การบันทึกอยู่ในหน่วยความจำเท่านั้น ไม่มีการเก็บลงเครื่องหรือส่งออก ไม่มี golden หรือ fingerprint ที่ครอบคลุมจำนวนเฟรม
> - การตรวจโดย agent ตัวที่สอง: ดูหัวข้อ "Second-agent review"

```yaml
item: replay frames for spent bodies falling through the air (the drag pulse's timing; hard-thinned recordings)
change_kind: replay bug fix (drawn position wrong between frames); one existing assertion changed (see Tests); no ceiling raised
owner_authorization: 'owner in chat, 2026-10-30, asking for the follow-ups under "Not changed, for later" in docs/development/reports/replay-debris-air.md to be opened: "เปิดงานต่อยอดในอีกเซสชั่นครับ" ("open the follow-up work in another session"); this task covers two of them, the drag pulse''s timing and hard-thinned recordings. In this session, 2026-10-30, asked whether to start from main or stack on the unmerged #191: "Stack on #191 (Recommended)".'
app_code: src/replay/recorder.ts
docs: docs/PHYSICS.md (Vostok-1's recording sizes)
tests: tests/falling-frames.test.ts, tests/heavy/falling-frames-sixdof.test.ts, tests/dense-fall.ts, tests/debris-replay.test.ts (one test re-sampled)
base_sha_verified_on: {sha: eec8352, date: 2026-10-30, note: 'head of #191 (claude/peaceful-planck-uyne6i), itself on main 1842a86'}
branch: claude/zen-dijkstra-f9qa9u
pr: 198
second_agent_review: pending
```

## Cause

While the vehicle coasts, the recorder keeps a frame every 10–30 s (`interval()`, src/replay/recorder.ts): 30 s in orbit, 10 s when a burn is near, 30 s on the rendezvous's phasing orbits. A spent stage coming down through the air in that time loses kilometres a second inside one span: a six-DOF Sputnik booster goes from 2.3 to 0.3 km/s in 30 s. Since #191, a replay draws it between the two frames on the cubic `hermite` through both frames' positions and velocities (`interpolateFrames`, src/physics/frame.ts). The cubic meets both ends and stays near the path, but its timing between them follows a cubic in time, not the drag pulse: it draws the body ahead of or behind where it was along that path. That is most of what #191 left: 0.3–0.7 km off the path, but up to 3.4 km from the body's place.

Hard thinning made it worse. Once a recording overflows its frame budget (`DEFAULT_MAX_FRAMES` 12,000 point-mass, `RIGID_MAX_FRAMES` 6,000 six-DOF), `decimate()` thins the coast and the orbit to a frame a minute, then the dense flight to a frame a second, then the coast without a limit, then anything to a minute, then anything. A falling body's frames went with the rest: spans of one to eight minutes, and both blends tens of km off.

## Change

src/replay/recorder.ts only. The simulation is not touched: the recorder only reads it.

- **`falling(debris)`**: some spent body is alive between 10 and 100 km up (`Math.abs(norm(r) - FALLING_MID) < FALLING_HALF`, `FALLING_MID = R_EARTH + 55e3`, `FALLING_HALF = 45e3`). It reads only `alive` and `r`, which a simulation `Debris` and a frame's `DebrisFrame` both carry.
- **Cadence**: `intervalOf` returns `Math.min(interval(...), falling(sim.debris) ? FALLING_INTERVAL : Infinity)` with `FALLING_INTERVAL = 5` s. It is asked at every step (before it, from the pre-step frame; after it, from the state), so a span that starts with no body in the band is cut at the step where one enters it. The bodies are the simulation's: at every call they are the state's (the frame was just captured from it, or the step from it is still to be flown).
- **Thinning** (`thin`): a frame with a falling body is dropped only while the gap between its kept neighbours stays within `min(gap, FALLING_INTERVAL)`, in every pass. The dense flight still thins to a frame a second around it (`DENSE_THINNED_GAP` 1 s is below 5 s); no pass, the last one included, opens a gap wider than 5 s where a body falls. The ceiling stays a bound: once thinned, a fall keeps at most two frames in any 5 s, and only for as long as it lasts.
- **Unchanged**: every other cadence; the blend itself (#191's cubic, #185's path, the line under thrust, the hold for a body that comes down between frames); event frames.

Two identical-output edits pay for the bytes (see Size):
- `flyStep`'s `dueAfter` asked `this.interval(...)` with the seven fields spelled out from the state; it now calls `this.intervalOf(s)`. A `VisualFrame` and a `SimState` carry the same seven fields (`Cadence`), so the values are the same, and the falling bodies now count after the step as well as before it.
- In `thin`, `kept[kept.length - 1]` is `kept.at(-1)!` (ES2022, the build's target).

## Choosing the rule

Every variant below was measured with the same probe (next section).

| rule | worst falling body, six-DOF | frames added, six-DOF | why not |
|---|---|---|---|
| alive below 100 km, every 2 s | (point-mass only) | Vostok-1 point-mass +309 | Gagarin under his canopy and the sphere waiting for him (`vostokInterval`'s 5 s) went to 2 s |
| alive below 100 km, every 5 s | 24 m | 0 to +155 a mission | six-DOF Vostok-1 4,881 frames, 102.7 MB: past the 101 MB its heavy test holds it to. Two fairings and the instrument module's shell drifting down below 10 km (105 frames in orbit, 50 after the landing) |
| the same, not after the vehicle has landed | – | Vostok-1 +105 | 101.33 MB, still past 101 MB |
| airspeed over 150 m/s | not run in full | – | +39 B and +55 B in the two chunks: 94 B of precache code against the 59 B left |
| descent rate over 100 or 150 m/s | Sputnik 134–281 m, H-IIA 237 m (30 s spans) | +11 to +34 | misses the drag pulse where the body flies almost level: Sputnik's boosters at 26 km, 470 → 219 m/s; the H-IIA stage pulling up from 43 to 51 km at 4.7 km/s |
| **alive between 10 and 100 km, every 5 s** | **24 m** | **0 to +78** | chosen |

Why 10 and 100 km: in the base probe, every span drawn more than 10 m off has its higher end above 10.9 km, every one over 20 m above 13.1 km, and the highest one starting above the air starts at 102.5 km (the H-IIA, which crosses 100 km inside the span and so is cut there). Below 10 km a body is close to its terminal speed and the cubic is within 10 m on 30 s spans; that is where a fairing or the module's shell spends most of its fall. Why 5 s: the worst falling body is 24 m at 5 s, and Vostok-1's return is never sparser than 5 s, so its cadence is untouched.

The thinning protection was first written as "a frame with a falling body is not coast" (out of the coast passes, thinned with the dense flight). It fixed Sputnik, H-IIA and Apollo under small budgets, but not Soyuz MS-25: its Blok A and fairings fall during the rendezvous, whose frames are not coast, and a long flight to the station leaves the coast nothing to give, so the last two passes took them (4.9 km at 800 frames to T+30,000 s, against 10.7 km before and 33 m with the floor in every pass).

## Measured

Probe (gitignored `tests/probe/`, its own vitest config). Each of the 20 watch missions is built as the app builds it (`watchMissionSettings` from 2026-09-22, the rendezvous flown where the mission has one) and recorded through `FlightRecorder.advance(1)` with the recorder's own frame budget, until past the ascent with nothing left falling (Vostok-1 to its landing). The truth:
- **six-DOF** (`defaultDynamics`): the simulation's own debris states every second;
- **point-mass** (`dynamics.model: 'pointMass'`): the simulation holds a body's state between its steps, so each passive body (no recovery, no crew, no entry heating) is re-flown densely between consecutive steps with the simulation's own `pointMassAcceleration` (RK4, 0.02 s), landing within 50 m of the next step's state (0 rejections), and sampled every second. This is #191's second agent's method; it reproduces its figures (Sputnik 1,223–1,596 m, H-IIA 620 m).

For every sample inside a span with the body alive at both frames, not firing, and below 140 km at either end, it takes the distance from the shipped `interpolateFrames`'s drawn position to the truth. Spans where the whole frame is held (the vehicle's rigid configuration changes, `drawn === sample`) are left out: a second at the start of a rendezvous, unchanged here. The "before" figures are the base (#191's head, eec8352); the "after" figures are this branch's shipped code.

### Six-DOF, the app's default for these vehicles

| mission | frames | MB (frames) | thinnings | worst falling body | drawn from its place | span |
|---|---|---|---|---|---|---|
| soyuzIss | 3,503 → 3,526 (+23) | 80.1 → 80.6 | 2 → 1 | Blok A (core) | 390 → 14 m | 20 → 5 s |
| falcon9Bandwagon | 4,936 → 4,949 (+13) | 65.5 → 65.7 | 0 → 0 | fairing | 3 → 0.0 m | 31.4 → – s |
| starshipFlight5 | 4,899 → 4,899 (+0) | 75.9 → 75.9 | 0 → 0 | – | – | – |
| falconHeavyArabsat | 5,974 → 5,974 (+0) | 123.7 → 123.7 | 0 → 0 | – | – | – |
| ariane6AmazonLeo | 5,356 → 5,378 (+22) | 117.8 → 118.3 | 2 → 2 | Core (Vulcain 2.1) | 26 → 0.7 m | 30 → 30 s |
| electronSso | 4,852 → 4,858 (+6) | 72.0 → 72.1 | 2 → 1 | First stage (9× Rutherford) | 78 → 6.3 m | 20 → 5 s |
| soyuzMs10 | 4,311 → 4,311 (+0) | 61.5 → 61.5 | 1 → 1 | – | – | – |
| soyuzT10 | 2,235 → 2,235 (+0) | 12.6 → 12.6 | 0 → 0 | – | – | – |
| soyuz18a | 3,797 → 3,826 (+29) | 77.4 → 78.0 | 2 → 2 | Blok B/V/G/D boosters | 32 → 8.0 m | 10 → 5 s |
| soyuzMsDocking | 5,394 → 5,460 (+66) | 118.4 → 119.9 | 0 → 0 | Blok A (core) | 577 → 14 m | 30 → 5 s |
| soyuzMs16 | 5,403 → 5,469 (+66) | 118.6 → 120.1 | 0 → 0 | Blok A (core) | 823 → 11 m | 30 → 5 s |
| soyuzMs25 | 5,394 → 5,460 (+66) | 118.4 → 119.9 | 0 → 0 | Blok A (core) | 583 → 14 m | 30 → 5 s |
| falcon9Orbcomm2 | 4,980 → 4,993 (+13) | 66.2 → 66.4 | 0 → 0 | fairing | 4 → 0.1 m | 33.4 → 13.4 s |
| angaraA5Flight1 | 4,178 → 4,178 (+0) | 102.7 → 102.7 | 3 → 3 | – | – | – |
| h2aHayabusa2 | 4,015 → 4,077 (+62) | 64.8 → 66.0 | 1 → 1 | First stage (LE-7A) | 704 → 24 m | 30 → 5 s |
| falcon9Demo2 | 5,273 → 5,273 (+0) | 55.6 → 55.6 | 0 → 0 | – | – | – |
| sputnik1 | 3,173 → 3,212 (+39) | 49.4 → 50.1 | 0 → 0 | Blok B/V/G/D boosters | 2,274 → 21 m | 30 → 5 s |
| vostok1 | 4,726 → 4,804 (+78) | 98.8 → 100.7 | 0 → 0 | Blok A (core) | 83 → 1.0 m | 30 → 30 s |
| mr3 | 5,070 → 5,070 (+0) | 30.5 → 30.5 | 0 → 0 | – | – | – |
| apollo11 | 4,310 → 4,338 (+28) | 47.3 → 47.6 | 1 → 1 | S-II | 3,394 → 6.1 m | 30 → 5 s |

All 20: +511 frames, +10.5 MB of frames by the recorder's estimate. A "–" is a mission whose spent bodies come down while the vehicle still flies densely (under thrust, an abort, a return), under 0.5 m either way. "MB" is the recorder's estimate of the frames at the end of the recording (`stats().bytes` without rotation tracks). The six-DOF recordings that are thinned overflow during the ascent; the count changes by one in two of them (Soyuz-2.1a, Electron).

### Point-mass

| mission | frames | MB (frames) | worst falling body | drawn from its place | span |
|---|---|---|---|---|---|
| soyuzIss | 3,576 → 3,576 (+0) | 19.8 → 19.8 | Blok A (core) | 44 → 44 m | 10 → 10 s |
| falcon9Bandwagon | 3,283 → 3,303 (+20) | 13.1 → 13.2 | fairing | 1 → 0.0 m | 30 → – s |
| falconHeavyArabsat | 3,341 → 3,362 (+21) | 16.1 → 16.2 | fairing | 2 → 0.1 m | 30 → 10 s |
| electronSso | 3,546 → 3,557 (+11) | 15.6 → 15.7 | fairing | 3 → 3.3 m | 10 → 10 s |
| soyuz18a | 7,480 → 7,494 (+14) | 50.6 → 50.7 | Blok B/V/G/D boosters | 19 → 1.1 m | 10 → 5 s |
| soyuzMsDocking | 3,369 → 3,376 (+7) | 18.3 → 18.4 | Blok A (core) | 1,201 → 34 m | 30 → 10 s |
| soyuzMs16 | 3,373 → 3,380 (+7) | 18.3 → 18.4 | Blok A (core) | 1,583 → 27 m | 30 → 10 s |
| soyuzMs25 | 3,370 → 3,377 (+7) | 18.3 → 18.4 | Blok A (core) | 1,213 → 33 m | 30 → 10 s |
| falcon9Orbcomm2 | 3,309 → 3,329 (+20) | 13.2 → 13.3 | fairing | 1 → 0.0 m | 30 → – s |
| h2aHayabusa2 | 3,704 → 3,716 (+12) | 18.2 → 18.2 | First stage (LE-7A) | 620 → 51 m | 30 → 10 s |
| sputnik1 | 2,223 → 2,227 (+4) | 9.1 → 9.1 | Blok B/V/G/D boosters | 1,596 → 388 m | 38.5 → 19.2 s |
| vostok1 | 4,637 → 4,637 (+0) | 34.3 → 34.3 | Blok A (core) | 30 → 17 m | 35.7 → 35.7 s |
| apollo11 | 4,389 → 4,403 (+14) | 17.6 → 17.7 | S-II | 874 → 13 m | 30 → 10 s |

The other seven (starshipFlight5, ariane6AmazonLeo, soyuzMs10, soyuzT10, angaraA5Flight1, falcon9Demo2, mr3) are unchanged, +0 frames, no body falling while the vehicle coasts. All 20: +137 frames, +0.8 MB; none is thinned.

A point-mass recording can only keep the simulation's step boundaries, so the floor here is one step: Sputnik's orbit steps are 19.25 s (`suggestedDt`, period/300), where the recorder kept every other one (38.5 s). Soyuz-2.1a's Blok A in a coast already had every 10 s step (44 m, unchanged).

### Hard thinning

Point-mass recordings never overflow 12,000 frames in the watch missions, so the probe forced budgets, as #191's did, and flew long enough for the coast passes to reach the falls (Sputnik, H-IIA, Apollo to T+20,000 s; MS-25 with its rendezvous to T+180,000 s). "Widest falling span" is the widest span a falling body is drawn across anywhere in the air, the band's edges and below 10 km included.

| mission, budget | frames | thinnings | worst falling body | drawn from its place | widest falling span |
|---|---|---|---|---|---|
| apollo11 3,000 | 2,340 → 2,374 | 7 → 6 | S-II | 2,725 → 33 m | 60 → 60 s |
| apollo11 1,500 | 1,413 → 1,453 | 14 → 14 | S-II | 2,725 → 33 m | 60 → 60 s |
| apollo11 800 | 664 → 688 | 118 → 65 | S-II | 35,987 → 129 m | 120 → 110 s |
| h2aHayabusa2 3,000 | 2,831 → 2,843 | 1 → 1 | First stage (LE-7A) | 620 → 51 m | 30 → 30 s |
| h2aHayabusa2 1,500 | 1,329 → 1,347 | 7 → 7 | First stage (LE-7A) | 7,708 → 51 m | 60 → 60 s |
| h2aHayabusa2 800 | 732 → 766 | 41 → 40 | First stage (LE-7A) | 67,791 → 51 m | 200 → 120 s |
| soyuzMs25 3,000 | 1,786 → 2,078 | 22 → 19 | Blok A (core) | 11,036 → 33 m | 120 → 120 s |
| soyuzMs25 1,500 | 1,171 → 1,344 | 39 → 39 | fairing | 32,887 → 33 m | 178.8 → 30 s |
| soyuzMs25 800 | 645 → 788 | 84 → 93 | fairing | 32,887 → 33 m | 178.8 → 30 s |
| sputnik1 3,000 | 2,724 → 2,728 | 0 → 0 | Blok B/V/G/D boosters | 1,596 → 388 m | 38.5 → 38.5 s |
| sputnik1 1,500 | 1,445 → 1,449 | 2 → 2 | Blok B/V/G/D boosters | 1,596 → 388 m | 38.5 → 38.5 s |
| sputnik1 800 | 664 → 671 | 10 → 11 | Blok B/V/G/D boosters | 4,708 → 388 m | 76.9 → 57.7 s |

Every recording stays within its budget (`frames ≤ frameLimit`, no ceiling raised). #191's run-back case (MS-25's Blok A at 800 frames, a 140 s span on which the cubic ran 1.4 km back along its chord) is gone: Blok A's spans through the band are now one step, where #191 measured the largest end-speed-to-mean ratio at 2.41, short of the 3 a run-back needs.

**Six-DOF, overflowing for real**: the Soyuz MS docking flight recorded to T+14,000 s (6,000-frame budget, 6 thinnings either way): Blok A 577 → 13.9 m (30 → 5 s spans), peak 132.0 → 131.6 MB by the estimate. It ends at 3,242 frames rather than 5,978 because its sixth thinning falls later in the flight; both are inside the ceiling.

### Vostok-1, and the hold before an impact

Recorded as tests/vostok1-recording-harness.ts records it (5 s packets): six-DOF 4,726 → 4,804 frames, 98.80 → 100.68 MB of frames at the peak, 7.59 MB of rotation tracks either way, no thinning, under the 101 MB tests/heavy/vostok1-recording.test.ts holds it to (passes). Point-mass 4,638 frames, 34.31 MB, unchanged. docs/PHYSICS.md's Vostok-1 paragraph is updated: its point-mass figure (4,666 frames, 34.5 MB) was already 4,638 and 34.3 MB on the base.

A side effect: a body that comes down between two frames is held at its earlier sample until the next (unchanged in frame.ts). With frames every 5 s down to 10 km, the longest such hold in six-DOF went from 30 s to 5–10 s on H-IIA, Soyuz-2.1a, the three Soyuz MS flights and Vostok-1; Falcon Heavy's (30 s, a body landing below 10 km) and the point-mass holds (one step) are unchanged.

## Stored and exported recordings; goldens

- Recordings live in memory only. There is no `src/storage`; `src/projects/archive.ts`, `src/workspace/*`, mission files (`src/config/mission-file.ts`, setup only) and lesson records carry no frames (`orbitlab.frames` in src/workspace/registry.ts is a UI setting's key). The main-thread mirror of a worker recording (src/session/mirror.ts) takes the worker's kept frame times (`keepTimes`) and has no thinning of its own. No storage review is needed.
- No golden or fingerprint covers frame counts. The fleet fingerprints (tests/d01-fleet-fingerprint.test.ts, tests/fleet-harness.ts) and the flex goldens fly `sim.step` loops with no recorder, and the recorder only reads the simulation, so they are unchanged.
- Frame counts that tests do assert: tests/replay.test.ts (a full ascent under 12,000; the 400-frame thinning test's limit ≤ 600; the toy flight's 4,000 and 400), tests/vostok1-recording-harness.ts (no thinning, under the frame limit, the orbit's gaps under 40 s, the memory), tests/session.test.ts (one frame after a restart), tests/live-stepping.test.ts (a live and a headless recording equal). All pass.

## Tests

**New, failing first** (`tests/falling-frames.test.ts`, point-mass, about 2 s):
1. *keeps a frame at every step of a booster's fall while the core coasts in orbit* (Sputnik): before, every other step of the drag pulse is missing (376 s and two more).
2. *draws it close to where it was between those frames*: dense truth (tests/dense-fall.ts), under 450 m: 388 m; before 1,596 m.
3. *keeps those frames, and draws it as close, when a long recording is thinned to its budget* (800 frames to T+18,000 s): 388 m; before 4,708 m on 77 s spans.
4. *keeps them through a long flight to the station, where thinning takes the rendezvous's frames too* (Soyuz MS-25 with its rendezvous, 800 frames to T+30,000 s, more than 10 thinnings): under 100 m, 33 m; before 10,671 m (Blok A, 60 s span).

**New, heavy** (`tests/heavy/falling-frames-sixdof.test.ts`, six-DOF Sputnik, about 40 s): drawn within 30 m every second of the boosters' fall while the core is in orbit (21 m), and no span wider than 5 s where a booster is in the band at both frames. Before: 2,274 m. tests/heavy/vostok1-recording.test.ts passes (above).

**Each half pinned** (mutations of the shipped code, point-mass tests): without the cadence, tests 1–4 fail (1,596 m, 1,596 m, the missing steps); without the floor in `thin`, tests 3 and 4 fail (8,592 m and 4,914 m). The heavy test was run against the base and fails there (2,274 m).

**One existing assertion changed.** #191's *draws a recorded H-IIA's first stage falling through the air close to where the simulation had it* (tests/debris-replay.test.ts) sampled the stage at the simulation's step boundaries the recorder had not kept, and required at least 10 of them. The recorder now keeps every one of them, so none falls between frames and the test found 0. It now samples between the steps with the stage re-flown densely (tests/dense-fall.ts, #191's second agent's method), at least 100 samples (268), the cubic under the same 600 m (51 m), and the line between the same frames over 2 km (2.2 km; the 10 km bound it had was the line across 30 s spans). On the base it fails at 620 m. Because an assertion changed, this PR is not covered by the standing bug-fix approval and waits for the owner.

**And one of #187's, from the merge with main.** tests/rigid-replay-arc.test.ts's *leaves a body in the air, or under its own thrust, on the line while the vehicle takes its arc* asserted that a quiet body in the air stays on the line; with #191 in this branch it takes the cubic. Its in-air body now fires its engines (`burning: true`) and the title reads *leaves a body under its own thrust, in the air or out of it, on the line …*, the change #191's report prescribes for whichever of #191 and #187 merges second.

**Related files**: every test file that reaches `FlightRecorder`, `interpolateFrames`, the replay player, the session or its mirror, plus bundle-budget, repo-hygiene, frames-view, rigid-debris and recovery-return: 26 files, 392 tests, all pass. The full normal suite: see the PR. `npx tsc --noEmit -p .` is clean.

## Size

`npx vite build`, `node scripts/bundle-budget.mjs`: ok, no ceiling raised.

- **On the merge with main** (4ed2c86: #187, #193 and #184 merged since this branch began; #184 raised the ceilings), against the same tree with main's recorder: `flight.worker-*.js` 570,534 → 570,526 B (−8), `index-*.js` 2,653,789 → 2,653,807 B (+18). Precache code 14,677,972 → 14,677,982 B (+10), 1,018 B under its 14,679 kB ceiling; `index-*.js` 193 B under its 2,654 kB.
- **On #191's head**, where it was first measured: `flight.worker-*.js` 570,498 → 570,490 B (−8), `index-*.js` 2,634,861 → 2,634,873 B (+12); precache code 14,653,941 → 14,653,945 B (+4), 55 B under the 14,654 kB ceiling of then. A trial merge with #187 (before #184 raised the ceilings) was 14,653,995 B, 5 B under.
- The two identical-output edits, measured on #191's head by building with each undone: the change alone is +152 B (flight.worker) and +173 B (index); the `dueAfter` call through `intervalOf` takes 155 and 156 B out (the seven fields were spelled out twice), and `kept.at(-1)` 5 B in each. They are inside the lines this change touches. Under the ceilings of then the change did not fit without them (325 B of precache code against 59 B left, and `index-*.js` 34 B over its own ceiling). Since #184 raised the ceilings it would fit without them, with `index-*.js` about 37 B under; they stay as a saving that leaves room for the next change. SESSION-PROTOCOL §5 asks for one change type per PR, so the owner can ask for them as a separate identical-output PR first, or for this change without them.
- Measured alternatives: the airspeed rule was +39/+55 B net (94 B of precache code more than the base, against 59 B left); keeping falling frames out of the coast passes only (instead of the floor in every pass) was 17–19 B a chunk smaller, and left MS-25 4.9 km off.

## Stacked on #191; merged with main

- This branch is #191's four commits plus this change (the owner's answer above). #191 merges first; this PR's diff then shrinks to its own commits.
- Main moved on 2026-10-30 (#187, #193, #184), and #191 and this PR both conflicted with it, so CI could not run. Commit 4ed2c86 merges main into this branch (a merge commit; #191's commits are not rewritten):
  - src/physics/frame.ts: the only conflict, the doc comment #187 moved to `interpolateFrames` and #191 edited. #187's comment is taken with #191's sentence in it, as #191's report says. The code merged cleanly: #191's in-air cubic beside #187's new `path`.
  - tests/rigid-replay-arc.test.ts (#187): its in-air body now fires its engines (`burning: true`), the change #191's report names for whichever merges second, and its title says so. This changes an assertion of #187's, as a consequence of #191; if #191 makes the same change when it merges, the two agree.
  - src/replay/recorder.ts: #187's and #193's change there is a comment. #193 pins frames to an untargeted recovery's burns through its new events, which the recorder already pins.
- #184 changed how a point-mass piece let go of mid-step is flown (only the rest of the step). Re-measured on the merge, every point-mass figure in this report is unchanged except one base figure (MS-25's fairing at 1,500 frames, 32,887 → 32,896 m). Six-DOF debris and the in-air blend are untouched by the merge.

## Second-agent review

Pending.

## Not changed, for later

- **Point-mass steps.** A point-mass flight's debris states exist only at its steps (Sputnik's orbit: 19.25 s), so the recorder cannot do better than every step: Sputnik's boosters are still 388 m off in point-mass (21 m in six-DOF). Shortening the simulation's own step while a body falls would change the flown flight, every point-mass fingerprint and the live/headless identity (T02), so it is a physics change for the owner to decide, not a recorder one.
- **Below 10 km**: a body there keeps the vehicle's cadence. The cubic is within 10 m on 30 s spans, but a body that lands is still held at its last sample until the next frame: up to 30 s in six-DOF (Falcon Heavy), a step in point-mass, and a whole thinned span under hard thinning (an MS-25 fairing held 480 s at 1,500 frames). Blending to the impact point needs the impact time (#191's "for later").
- **Above 100 km**: not in the band. A body falling from higher (a stage from a high apogee) gets frames from 100 km down; the span that crosses 100 km is cut at the crossing step.
- **Bodies under thrust** (recovery burns) are in the band like any other and get the 5 s; #191's question (the line or the cubic for them) is unchanged.
- **The 101 MB figure.** Six-DOF Vostok-1 is at 100.68 MB of the 101 MB its heavy test holds it to, 0.32 MB of room; several six-DOF watch missions are already above 101 MB (Falcon Heavy 123.7 MB, the Soyuz MS flights 120 MB) without thinning, because 101 MB is a reference shape's size, not a bound (`RIGID_MAX_FRAMES`).
