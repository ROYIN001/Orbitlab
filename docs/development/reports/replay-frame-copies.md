# Replay: a seek's frame is its own copy, Apollo, recoveries and fault records included / เฟรมที่ seek ได้เป็นสำเนาของตัวเองทั้งหมด รวมถึง Apollo จุดลงจอด และบันทึกความขัดข้อง

> **สรุปสำหรับเจ้าของ (ภาษาไทย)**
>
> - ปัญหา: `cloneFrame` สัญญาว่าเฟรมที่ seek ได้เป็นสำเนาลึกทุกชั้นที่โค้ดอื่นเขียนทับได้ เพราะเฟรมนั้นถูกส่งต่อไปยังแผนที่และหน้าจอ onboard แต่มีสี่ส่วนที่ยังใช้วัตถุเดียวกับเฟรมที่บันทึกไว้: ชิ้นส่วนที่ทิ้งระหว่างขึ้น (`jettisoned`), สถานะของ Apollo ทั้งก้อน (`apollo`), จุดที่บูสเตอร์บินกลับไปลง (`debris[].recovery.target`) และบันทึกความขัดข้องของระบบควบคุมในเที่ยวบิน six-DOF (`rigid.controlFaults`, agent ตัวที่สองพบ) ถ้าโค้ดใดเขียนทับ ข้อมูลที่บันทึกไว้จะเปลี่ยนไปด้วย และสำหรับจุดลงจอด ค่าที่ simulation ใช้นำทางบูสเตอร์ก็เปลี่ยนด้วย ตอนนี้ยังไม่มีโค้ดไหนเขียนทับ แต่สัญญาไม่เป็นจริง
> - ตัดสินทีละส่วน:
>   - `jettisoned` เปลี่ยนระหว่างเที่ยวบิน (แต่ละตัวพลิกจาก false เป็น true หนึ่งครั้ง) จึงไม่ใช่ข้อมูลคงที่ → คัดลอก
>   - `apollo` เปลี่ยนทุกเฟรม (ความสูงและความเร็วเทียบดวงจันทร์ เหตุการณ์ถัดไป ตำแหน่ง CSM/LM) และแผนเปลี่ยนตอนจุดเครื่อง → คัดลอกทั้งก้อน ข้อความใน #187 ที่ว่า "ตัวเลขของดวงจันทร์คงที่ทั้งภารกิจ" ไม่ถูก
>   - `rigid.controlFaults`: simulation สร้างใหม่ทุก step และไม่เคยเขียนทับ → คัดลอกตอน seek เหมือน `target` (ทำต่อตามที่คุณสั่ง "ทำต่อ" เมื่อ 2026-10-31)
>   - `recovery.target` ตั้งครั้งเดียวตอนแยกตัวและ simulation ไม่เคยเขียนทับ (ถ้าต้องย้ายเรือ จะสร้างวัตถุใหม่) จึงเป็นข้อมูลคงที่แบบเดียวกับ `visual` แต่มีแค่ 6–7 ตัวเลข คัดลอกตอน seek ได้ถูก → คัดลอกตอน seek; ส่วนเฟรมที่บันทึกไว้ยังใช้ร่วมกับ simulation ตามเดิม เพราะการคัดลอกลงทุกเฟรมจะเพิ่มหน่วยความจำ 120–144 B ต่อบูสเตอร์ต่อเฟรม
> - ค่าทุกค่าที่ seek ได้เหมือนเดิมทุกบิต เปลี่ยนเฉพาะว่าเป็นวัตถุใหม่ (ตรวจกับ main ทุกภารกิจ watch ทั้ง 20 ภารกิจ)
> - ขนาด: ยังเล็กกว่า main ปัจจุบัน (f68faab) 57–59 B ต่อไฟล์ (`index-*.js` และ `flight.worker-*.js`) เพราะเขียนการ blend ของ CSM, ascent stage และ service module เป็น loop แทนสามชุดซ้ำ ที่ว่างของ precache code เพิ่มจาก 1,067 B เป็น 1,183 B
> - ความเร็ว: การคัดลอกทำให้การ seek แต่ละครั้งช้าลง 1–2 µs (เช่น Falcon Heavy 4.76 → 5.93 µs) รุ่นแรกใช้ `structuredClone` ซึ่งช้ากว่ามาก (15.5 µs) และเสียงของการปล่อยจรวด seek หลายสิบครั้งต่อเฟรมภาพ agent ตัวที่สองพบจุดนี้ จึงเปลี่ยนเป็นฟังก์ชันคัดลอกที่เร็วกว่า
> - หน่วยความจำของการบันทึก (`FRAME_BYTES`) ไม่เปลี่ยน เพราะ `captureFrame` ไม่เปลี่ยน
> - agent ตัวที่สองตรวจแล้ว ยืนยัน 14 จาก 14 ข้อ ไม่มีข้อที่ต้องแก้ก่อน merge พบสองข้อที่ไม่บล็อก: ความเร็ว และ `rigid.controlFaults` ทั้งสองข้อแก้แล้วใน PR นี้
> - #187 merge ก่อน PR นี้แล้ว ผม merge main (f68faab) เข้า branch นี้โดยไม่ชนกัน และแก้ประโยคใน docstring ของ `interpolateFrames` ที่ #187 เขียนว่าผลลัพธ์ใช้ `jettisoned`, Apollo และ `target` ร่วมกับเฟรมที่บันทึก ให้เหลือแค่ `visual`
> - การ merge: แก้จากผิดเป็นถูก มีเทสต์ที่ fail ก่อนแก้ ไม่ได้ขึ้นเพดาน ไม่ได้เปลี่ยน assertion เดิม agent ตัวที่สองตรวจการแก้ `controlFaults` ซ้ำแล้ว ยืนยัน 4 จาก 4 ข้อ ผลเทียบกับ main ปัจจุบันทั้ง 20 ภารกิจ ไม่ต่างเลย และ heavy Vostok-1 ผ่านบนโค้ดสุดท้าย

```yaml
item: replay frame copies (aliasing on main, PR #187's "Not changed, for later")
change_kind: bug fix (the deep copy cloneFrame promises); values unchanged, no assertion changed, no ceiling raised
owner_authorization: 'owner in chat to this session, 2026-10-31, after the remaining work was listed (the rigid.controlFaults finding among it): "ทำต่อ"; 2026-10-30: "Task: decide per field whether it is immutable mission data (then document it as deliberately shared, as `debris[].visual` already is) or could be written by a consumer (then deep-copy it in `cloneFrame` and in `interpolateFrames`, e.g. a `cloneApollo`, `jettisoned: { ...f.jettisoned }`, and a copy of `recovery.target`)."'
app_code: src/physics/frame.ts
tests: tests/replay-copies.test.ts (new)
base_sha_verified_on: {sha: f68faab, date: 2026-10-31}  # main merged in at 1360476; first based on 1842a86
branch: claude/great-mayer-6kapau
pr: 188
second_agent_review: 'confirmed 14 of 14 claims checked, no blocking findings (2026-10-30, on f241a06/8a4ba98); two non-blocking: F1 structuredClone cost on a hot path (fixed here, 9080d56), F2 rigid.controlFaults shared (pre-existing; fixed here, f746b8c, after the owner''s "ทำต่อ"); the copyPlain fix re-reviewed on 9080d56: confirmed 3 of 3, no findings; the F2 fix (ownFaults, f746b8c) re-reviewed: confirmed 4 of 4, no findings'
```

## Cause

`cloneFrame` (src/physics/frame.ts) promises a deep copy "down to every sub-object a consumer could write to". A frame a seek returns travels through `replay/simview.ts` into `ui/map.ts` and `ui/onboard.ts`, and the recording must stay as it was flown. `interpolateFrames` builds its result on `{ ...a }`.

Three parts of a frame were still the stored frame's own objects:
- **`jettisoned`.** `cloneFrame` never copied it, and `interpolateFrames` passed it through `...a`.
- **`apollo` and everything in it.** `cloneFrame` never copied it. `interpolateFrames` passed it through `...a`, or, when the CSM, the ascent stage or the service module blended, spread it shallowly, so its sub-objects (`moon`, `sequence`, `tli`, `perilune`, `lunar`, `mcc`, …) were still shared.
- **`debris[].recovery.target`.** `{ ...d.recovery }` is shallow. `captureFrame` shares the target with the simulation too, so the stored frames and the live simulation hold the same object.

PR #187's second agent counted about 245,000 such calls on recorded watch missions. #187 narrowed the `interpolateFrames` docstring to call this data mission-long and shared.

This PR's second agent found a fourth: **a six-DOF body's control-fault record** (`rigid.controlFaults`, G08). The rigid runtime puts a new `ControlFaultRecord` on the rigid telemetry every step (rigid/runtime.ts:380), and `cloneRigidTelemetry` passes it through, so every seek of a six-DOF flight with control faults shared it with the stored frame.

## Decision per field

| Field | What it holds | Changes during a flight? | Decision |
|---|---|---|---|
| `jettisoned` | `interstage`, `tower`, `aftSkirt` | yes: each flips from false to true once (the Saturn V's interstage ring and escape tower, a Soyuz's tower) | copied: `{ ...f.jettisoned }` |
| `apollo` | Apollo's state (`ApolloState`) | yes, every frame: the Moon's height and speed (`moon`), the next milestone (`next`), the lunar orbit (`lunar`), the CSM, ascent stage and service module states, the descent, the rendezvous and the entry. At burns: `perilune`, `mcc`, `tli`. Once: `sequence`, `tliTime`, `landed`, `splash`. | copied whole: `copyPlain` |
| `debris[].recovery.target` | the landing zone, drone ship or tower a recovered stage is flown to | no: set at separation (`planReturn`, sim/debris.ts), never written into. A six-DOF drone-ship stage is given a new object when its ship is stationed again (rigid/debris-runtime.ts: "A new object: recorded frames share the old one.") | copied at the seek, with the recovery: `copyPlain`. Still shared between the simulation and the stored frames (below). |
| `rigid.controlFaults` (vehicle and debris) | a six-DOF body's control-fault record: the failures struck, IMU units, engines, jets, sensed and true rates | a new record every step (`ControlFaultTracker.record()`), never written into | copied at the seek: `copyPlain`, by `ownFaults`. Still shared between the simulation's state and the stored frames, as the target is. |
| `debris[].visual` | the drawing spec | no | still shared, as before |

- **Apollo's figures are not mission-long.** `ApolloFlight.frame()` builds a new tree at each capture, so stored frames share nothing with the simulation or with each other. Only what a seek returned was shared.
- **The target is mission data, but a copy is cheap.** By the test the task set (immutable mission data, shared as `visual` is), the target qualifies. `visual` is shared because copying it "would cost more than the rest of the frame put together". A target is six or seven numbers, so a seek copies it.
- **The target stays shared between the simulation and the stored frames.** A copy in `captureFrame` would put one in every stored frame:
  - The cost is 120 B of heap per drone ship or pad target and 144 B per tower target, per recovered stage per frame (node --expose-gc, 200,000 copies).
  - That is about 2.6 % of a 4.7 kB Falcon 9 frame and 7–8 % for Falcon Heavy's three cores, which `FRAME_BYTES` (replay/recorder.ts) was not fitted for.
  - The simulation never writes into a target, so the recording keeps the target it captured.
  - The remaining exposure, the same as `visual`'s: a live capture that `FlightRecorder.recordNow` hands back without storing it shares the target with the simulation and with the stored frames. This is written in `cloneFrame`'s docstring and under "Not changed, for later".

## Change

All in src/physics/frame.ts:
- **`copyPlain`** (new, private): a deep copy of plain data. It spreads an object and walks into its object values; arrays are mapped.
- **`cloneFrame`** copies `apollo` with `copyPlain` and `jettisoned` with a spread.
- **Recovery copies.** `cloneDebrisFrame`, and the blended-debris branch of `interpolateFrames`, copy `recovery` with `copyPlain`, which copies its `target`. The copy moved into the one branch that uses it: before, every debris item paid for one even where `cloneDebrisFrame` made it again.
- **`interpolateFrames`** copies `apollo` with `copyPlain` and `jettisoned` with a spread. The CSM, ascent stage and service module blend changed form:
  - Before: three hand-written spreads, each `hermite(a.apollo.X.r, a.apollo.X.v, b.apollo.X.r, b.apollo.X.v, u, span)`, guarded by one compound condition.
  - Now: a loop over the three keys on the copy. The values are the same, and so is the key order, since an assignment keeps a key's place as the spread did.
- **Why `copyPlain`, not a hand-written `cloneApollo`.** Apollo's state has 16 sub-objects, 15 of them optional; written out field by field its copy would cost hundreds of bytes in each of the two precached chunks that carry this file.
- **Why not `structuredClone`.** The first version (f241a06) used it: the fewest bytes, already used in src/. The second agent found it about 50× slower than a spread, on a hot path: with sound on, the launch audio (audio/launch-audio.ts) seeks through `ReplayPlayer.frameAt` tens of times an animation frame, for the retarded times of the vehicle and each live body and for each past cued event. `copyPlain` takes 0.16 µs for a recovery and 0.5–2 µs for Apollo's state, against 2.9 and 3.5–12 µs (Node 22, 200,000 copies each).
- **`ownFaults`** (new, private): gives rigid telemetry a seek hands out its own copy of `controlFaults` (`copyPlain`, written into the copy `cloneRigidTelemetry` or `interpolateRigidTelemetry` just made). It wraps the rigid telemetry in `cloneFrame`, `cloneDebrisFrame` and both `interpolateRigidTelemetry` calls in `interpolateFrames`, so the configuration hold, the end frames and every debris branch are covered.
  - It sits in frame.ts, carried by two chunks, rather than in `cloneRigidTelemetry`, carried by seven, where a copy would have cost about 1 kB of precache room.
  - `linearModel`, `navigation` and `attitudeTest` are added to telemetry samples only (simulation.ts:1564–1574), never to frames.
- **`captureFrame`** is unchanged; a comment there names the shared target.
- **Docstrings.** `cloneFrame`'s docstring, which sat orphaned above `cloneRendezvous`, moved above `cloneFrame` and now gives the per-field decision. `interpolateFrames`' docstring, as #187 left it, said the result shares `jettisoned`, Apollo's sub-objects and a recovery's `target` with the stored frame; it now names only `visual` (f6c3cff).

## Measured

### Failing first

`tests/replay-copies.test.ts`, 4 tests, new. The first three deep-freeze recorded frames and seek through `ReplayPlayer.frameAt` on each stored frame and half way to the next; the fourth deep-freezes frames captured from a simulation whose vehicle and spent stage carry a control-fault record, and seeks by clone, by a mid-span blend, on both end frames, across a change of configuration (the hold) and with the spent stage gone by the later frame. It lists, by path, every object in what the seek returned that is still frozen, which means still shared with the recording (`visual` aside). Then it writes into every field of what it was handed and checks the recording against a copy taken before the freeze.

| Test | On main (1842a86) | This branch |
|---|---|---|
| Apollo 11 to T+900 s, point-mass (2,356 frames with `jettisoned`, 8 with `apollo`) | fails: `frame.apollo`, `frame.jettisoned` | passes |
| Falcon 9 Demo-2 to T+450 s, point-mass (1,563 frames with a drone-ship target) | fails: `frame.debris[].recovery.target` | passes |
| Apollo with every `ApolloState` field, CSM, ascent stage and service module blending or not | fails: clone, no blend and on-`a` share `frame.apollo` and `frame.jettisoned`; the blend shares `frame.jettisoned` and 13 Apollo sub-objects: `moon`, `sequence`, `tli`, `perilune`, `mcc`, `lunar`, `descent`, `landed`, `rendezvous`, `dockAxis`, `entry`, `interfaceAhead`, `splash` | passes |
| A six-DOF vehicle and spent stage carrying a control-fault record | fails on 1a7ca0c (this branch before f746b8c), as on main: `frame.rigid.controlFaults`, `frame.debris[].rigid.controlFaults` | passes |

**A six-DOF flight with a control fault** (probe, gitignored): a Soyuz-2.1a to the ISS flown six-DOF, with the G08 lesson's fault (gyro 1 stuck at T+30 s, FDIR off), recorded through `FlightRecorder.advance` to T+90 s and deep-frozen.
- 1,010 frames, 549 of them with a record.
- `cloneFrame` on every frame and `interpolateFrames` at u = 0, 0.5 and 1: 4,037 calls against main's `frame.ts` (f68faab), 0 differences.
- Main shared `frame.rigid.controlFaults`; this branch shares nothing.

### Same values as main, on all 20 watch missions

Probe (gitignored `tests/probe/`): main's `frame.ts` (1842a86) against this branch's. Each watch mission was flown point-mass to its end through `FlightRecorder.advance` and the recording deep-frozen. For every stored frame the probe called `cloneFrame`, and `interpolateFrames` at u = 0, 0.25, 0.5, 0.75 and 1 to the next frame. It compared the two outputs with `util.isDeepStrictEqual` (undefined-valued keys included) and `JSON.stringify` (key order).

- **709,100 calls, 0 differences.**
- **Main:** 399,444 of those calls returned an object shared with the recording. The paths were `frame.jettisoned`, `frame.apollo` with 11 of its sub-objects, and `frame.debris[].recovery.target`.
- **This branch:** none.
- **Inputs never written:** no write into a frozen input threw on either side.
- **Coverage:**
  - Apollo 11's recording (11,946 frames) carries the CSM in 38 frames, the ascent stage in 4 and the service module in 3, so the loop's three keys were each compared.
  - `jettisoned` is in 7 missions' recordings: Apollo 11 and six Soyuz crewed flights.
  - A recovery target is in 5: Falcon 9 ×3, Falcon Heavy, Starship.

That run compared main against the first version (`structuredClone`, before the recovery copy moved into the branch that uses it). Re-run against the final code (`copyPlain`, 9080d56): again 709,100 calls, 0 differences; nothing returned shared with the recording; main's 399,444 sharing calls and paths as above (878 s, 718 s of it Apollo 11).

Re-run against main as it is now (f68faab, with #187's blend), on this branch's code with the fault-record copy (f746b8c): again 709,100 calls, 0 differences; nothing returned shared with the recording; main shared in 399,444 calls, on the same paths (1,074 s). The watch missions are point-mass, so `ownFaults` has nothing to copy there; the six-DOF fault flight above covers it.

### Size

`npx vite build`, `node scripts/bundle-budget.mjs`: ok, no ceiling raised. This file is bundled into `index-*.js` and `flight.worker-*.js` only, so each byte here counts twice in precache code.

Against main as it is now (f68faab; #184 raised the ceilings for its own feature), with the fault-record copy (f746b8c):

| | main (f68faab) | this branch | change |
|---|---|---|---|
| `index-*.js` | 2,653,770 B | 2,653,713 B | −57 B |
| `flight.worker-*.js` | 570,514 B | 570,455 B | −59 B |
| precache code (ceiling 14,679,000 B) | 14,677,933 B (1,067 B left) | 14,677,817 B (1,183 B left) | −116 B |

- `ownFaults` costs about 100 B a chunk; without it (f6c3cff, main merged in) the chunks were −155 and −163 B.

Against main as this branch was first based (1842a86), before the merge with main and the fault-record copy (9080d56):

| | main (1842a86) | this branch | change |
|---|---|---|---|
| `index-*.js` | 2,634,842 B | 2,634,681 B | −161 B |
| `flight.worker-*.js` | 570,478 B | 570,315 B | −163 B |
| precache code (ceiling 14,654,000 B) | 14,653,902 B (98 B left) | 14,653,578 B (422 B left) | −324 B |

- **Copies alone:** the copies with the old blend measured +50 B a chunk (with `structuredClone`), 2 B over the ceiling. The loop is what made room. With `structuredClone` and the loop the chunks were −274 B each; `copyPlain` costs 111–113 B of that back.
- The second agent's own build of 8a4ba98 measured −278 B for each chunk, against the −274 B measured here; the 4 B difference is likely the build stamp.
- **Before #187 merged**, a trial merge with it (4ec5251 and f7f7577) had no conflict and left 372 B of precache room under the old ceiling; both PRs' replay tests passed on it (5 files, 71 tests).

### Heap and time

- **Stored frames:** `FRAME_BYTES` is unchanged, since `captureFrame` and the stored frames are unchanged (the fault record too). A seek's copies are not kept by the recording; the recorder's one cached copy (`copyOf`) and its live-instant cache hold one frame each, as before.
- **Seek time:** µs per call, the average of a `cloneFrame` and a mid-span `interpolateFrames`, over the spans that carry the copied fields. Same recorded point-mass frames for all three versions; median of 5 runs × 5 passes.

| Mission (spans) | main | first version (`structuredClone`) | this branch (`copyPlain`) |
|---|---|---|---|
| Apollo 11 to T+700,000 s (9,255; CSM in 1,802 frames) | 4.38 | 14.20 | 6.70 |
| Falcon 9 Demo-2 (1,878; 1 recovery) | 3.47 | 7.14 | 4.34 |
| Falcon Heavy Arabsat (1,869; up to 3 recoveries) | 4.76 | 15.49 | 5.93 |
| Soyuz to the ISS (2,328; `jettisoned` only) | 6.64 | 6.03 | 6.51 |

  - **Per animation frame with sound on:** the launch audio's ~60 seeks a frame on a Falcon Heavy (the second agent's count) cost about 70 µs more than main. The first version cost about 640 µs more.
  - **The Soyuz row** is within run-to-run noise: copying three booleans costs nothing measurable.
  - **`ownFaults`** does nothing on a frame without a fault record, which is every point-mass frame and every six-DOF frame without control faults configured.

### Tests

- **Typecheck:** `npx tsc --noEmit -p .` clean.
- **After merging main and the fault-record copy:** the full unit suite runs in CI on 30b8d0f (below); locally, the 10 replay files on the merged branch (99 tests) and `tests/replay-copies.test.ts` (4 tests). The local full-suite runs listed below are of the earlier code.
- **Unit suite, local:** 335 files, 10,529 tests, all pass on 9080d56, the final code (1,876 s), and earlier on 8a4ba98 (Node 22.22.0, not CI's 22.23.3).
- **CI:**
  - On the final code: the PR's checks on its head (the docs-only commits after 30b8d0f change no code).
  - Run 41022766246 green on 1be5052 and run 41020718499 green on f2fe2db, both with the final code (Node 22.23.3): typecheck, build, test ×3, browser-smoke ×2, verify.
  - Run 41002400552 green on 8a4ba98, the first version.
  - Runs 41019830551 (147b232) and 41022389542 (5605a97) show `verify` red only because their test and browser jobs were cancelled by the next push.
- **Heavy:** `tests/heavy/vostok1-recording.test.ts`, the only heavy or six-DOF fleet file that builds a recorder or player: 1 of 1 passed on 8a4ba98 (161 s) and on f2fe2db (168 s; src/ and tests/ as in 9080d56), Node 22.22.0. On the final code, 30b8d0f: 1 of 1 (208 s).
- **Not run:**
  - The other 32 heavy files and the 6 six-DOF fleet files the change map selects for any `src/physics/**` path. None builds a `FlightRecorder` or `ReplayPlayer` or calls `cloneFrame` or `interpolateFrames` (grep of tests/heavy and tests/sixdof-fleet), so this change cannot reach them. They run on the weekly heavy workflow, and D-64 reuse does not apply because frame.ts is in the physics tree.
  - The browser journeys beyond CI's smoke shards. There is no UI change, and what a seek shows is the same to the bit.

## Second-agent review

A second agent reviewed f241a06 (built on 8a4ba98, the same src/), review only, on 2026-10-30.

**Result: confirmed 14 of 14 claims checked, no blocking findings.**

1. **Classification:**
   - `jettisoned` flips once each (simulation.ts:327, 474, 478, 482).
   - `ApolloFlight.frame()` builds a fresh tree at every capture; `sequence` comes from a getter that returns a new object.
   - Targets are made only in `planReturn` (sim/debris.ts:339, 351) and replaced only at rigid/debris-runtime.ts:429. A grep of src/ for writes into a target's fields, `Object.assign` and local aliases found none.
2. **Equivalence:** 8,748 synthetic cases, 0 differences under a strict comparator (key order, key set, `Object.is`, prototype).
   - Cases: `a.apollo` and `b.apollo` each absent or carrying any subset of the three bodies; blended, unmatched, ground-turning and dead debris; crew, entry, `fragmentOf`; target undefined; u ∈ {0, 0.37, 1}; coast and burn.
   - Edge: a `recovery: null` input would now give `null` where main gave `undefined`. `captureFrame` never makes one.
3. **Remaining aliasing:** every return path walked (degenerate span, u ≤ 0, rigid u ≥ 1, configuration hold, ground-turning, unmatched and blended debris, abort and rendezvous blends, eom, rigid telemetry). An identity walk over every case found nothing shared with `a` or `b` but `visual`, apart from F2 below.
4. **Plain data:** `ApolloState` and `ReturnTarget` hold no functions, class instances, Maps or getters.
5. **The test:** with main's functions swapped in by `vi.mock`, all 3 tests fail for the right reasons, and on the branch 3 of 3 pass.
   - The comment in the third test left out `jettisoned`; fixed.
   - It also noted the walker's limits: point-mass only, and only sharing with the frozen recording is detected. The final `toEqual(before)` cannot fail while the recording is frozen; it stays as the check the task names.
   - Freezing the recorder's stored frames is safe: after recording, `publish` and `decimate` only rearrange arrays, and `applyAttitudeTracks` writes into the copy.
6. **Regressions:** replay, debris-replay and session pass (47 tests). Nothing in src/ compares these objects by identity or keys a map on them.
7. **Performance: finding F1.**
8. **Bundle:** confirmed to within 4 B.

**Non-blocking findings, both fixed here:**
- **F1, fixed in 9080d56:** `structuredClone` cost about 3 µs a recovery and 9 µs an Apollo state, on the launch audio's hot path. Replaced by `copyPlain`; see "Seek time".
- **F2, pre-existing, fixed in f746b8c** (after the owner's "ทำต่อ" of 2026-10-31): `rigid.controlFaults` was shared with the recording.
  - rigid/runtime.ts:380 puts a `ControlFaultRecord` on `s.rigid`, and `cloneRigidTelemetry` copies it by reference, so every seek of a six-DOF flight with control faults (e.g. the lesson ru-24-05-06) shared it.
  - The first three tests are point-mass and could not see it; the fourth and the six-DOF probe above do.

**Re-review of the control-fault fix (`ownFaults`, f746b8c) and the merge-resolved docstring, review only: confirmed 4 of 4, no findings.**
1. **Every path** that returns a frame gives rigid telemetry, the vehicle's and each debris item's, its own `controlFaults`: the degenerate span, u ≤ 0, rigid u ≥ 1, the configuration hold, ground-turning, unmatched and dead debris go through `cloneFrame` or `cloneDebrisFrame`, and both blends through `ownFaults(interpolateRigidTelemetry(…))`. `record()` builds a fresh, plain-data object on every call. Nothing else on `RigidTelemetry` or `DebrisFrame` is shared; `linearModel`, `navigation` and `attitudeTest` are on telemetry samples only.
2. **The in-place write is safe:** `ownFaults` only ever receives an object `cloneRigidTelemetry` or `interpolateRigidTelemetry` has just made.
3. **Nothing untrue:** the docstring matches main's except the narrowed sentence, which is true at f746b8c (at f6c3cff alone it ran one commit ahead of the fix). The `path` code is main's.
4. **The figures:** the fourth test fails against 1a7ca0c's `frame.ts` with `frame.debris[].rigid.controlFaults` and `frame.rigid.controlFaults`, and passes; its build gave exactly 2,653,713 / 570,455 / 14,677,817 B.

It noted the configuration hold and the gone-debris path were covered only through `cloneFrame` and `cloneDebrisFrame`; the fourth test now seeks across both.

**Re-review of the `copyPlain` change (9080d56), review only: confirmed 3 of 3, no findings.**
1. **`copyPlain` is a correct deep copy** of every input it is given. It was fed deep-frozen inputs: an `ApolloState` with every field, nested vectors, undefined-valued keys, `null`, `-0`, `NaN` and an array of objects, and recoveries with a tower target and with none.
   - Each output equals `structuredClone`'s (`isDeepStrictEqual`), with the same key order recursively.
   - No output object is an input object or frozen.
   - A synthetic main-against-branch run on 9080d56 gave 8,748 cases and 0 differences, with nothing shared but `visual`.
   - Where it differs from `structuredClone` (none of which frames contain): an object reached twice becomes two copies; Dates, Maps and typed arrays become plain objects; functions are shared; a cycle overflows the stack; and `for…in` would also walk an enumerable key added to `Object.prototype`. Apollo's state and a recovery are built from object literals, so none applies; the function's docstring limits it to plain data.
2. **The rest of the diff** (docstring, test comment) is right; the comment matches what main shares.
3. **The figures** were rebuilt exactly (`index-*.js` 2,634,681 B, `flight.worker-*.js` 570,315 B, precache code 14,653,578 B). Its own seek benchmark agrees in ratio with "Seek time": 3 recovered boosters 6.27 µs on main, 7.39 with `copyPlain`, 16.5 with `structuredClone`.

## Merge with #187

#187 (six-DOF arc) merged first, as ef9d3f6, followed on main by #193 and #184 (f68faab). Main was merged into this branch at 1360476 without a conflict.

#187 had rewritten the last paragraph of the `interpolateFrames` docstring to say the result shares `jettisoned`, Apollo's state below its top level, a recovery's `target` and a body's `visual` with the stored frame. With this branch only `visual` is shared, so f6c3cff narrows it to: "The result is a fresh frame, apart from each body's `visual`, which it shares with the stored frame as `cloneFrame` does and which a caller must not write to."

On the merged branch: typecheck clean; `tests/replay-copies`, `rigid-replay-arc`, `debris-replay`, `replay`, `rigid-replay`, `debris-release`, `recovery-untargeted-events`, `vostok-replay`, `live-stepping` and `rigid-recovery` pass (10 files, 99 tests); budget ok.

## Not changed, for later

- **A live capture shares the target, the fault record and `visual`.** The frame `FlightRecorder.recordNow` hands back without storing it, which is most frames in flight, shares `debris[].visual`, `debris[].recovery.target` and `rigid.controlFaults` with the simulation and with the stored frames. A consumer that wrote into any of them would change the recording and, for the target, the live guidance.
  - Nothing writes into them today.
  - Closing it for the target means a copy per stored frame (120–144 B per recovered stage, and a re-fit of `FRAME_BYTES`), or freezing targets where the simulation makes them (sim/debris.ts, rigid/debris-runtime.ts). By estimate, not a build, that is about 14 B a site in each of the seven chunks that carry the physics core.
- **`cloneRigidTelemetry`'s other callers.** Telemetry samples (simulation.ts:1564), the MCP read (mcp.ts) and the frame-backed view (replay/simview.ts, which copies a frame a seek has already copied) still pass the fault record through. A sample's record is the same object as the stored frame's captured at that step, so a write into a sample's record would change the frame. Copying it in `cloneRigidTelemetry` itself would close all of them, at about 1 kB of precache room across its seven chunks.
- **No type-level guard.** Nothing in the types marks a frame read-only. A `DeepReadonly<VisualFrame>` on what a seek returns would catch a write at compile time. It would touch simview, map, onboard and the HUD, so it is a separate change.
