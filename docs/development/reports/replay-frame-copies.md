# Replay: a seek's frame is its own copy, Apollo and recoveries included / เฟรมที่ seek ได้เป็นสำเนาของตัวเองทั้งหมด รวมถึง Apollo และจุดลงจอด

> **สรุปสำหรับเจ้าของ (ภาษาไทย)**
>
> - ปัญหา: `cloneFrame` สัญญาว่าเฟรมที่ seek ได้เป็นสำเนาลึกทุกชั้นที่โค้ดอื่นเขียนทับได้ เพราะเฟรมนั้นถูกส่งต่อไปยังแผนที่และหน้าจอ onboard แต่มีสามส่วนที่ยังใช้วัตถุเดียวกับเฟรมที่บันทึกไว้: ชิ้นส่วนที่ทิ้งระหว่างขึ้น (`jettisoned`), สถานะของ Apollo ทั้งก้อน (`apollo`) และจุดที่บูสเตอร์บินกลับไปลง (`debris[].recovery.target`) ถ้าโค้ดใดเขียนทับ ข้อมูลที่บันทึกไว้จะเปลี่ยนไปด้วย และสำหรับจุดลงจอด ค่าที่ simulation ใช้นำทางบูสเตอร์ก็เปลี่ยนด้วย ตอนนี้ยังไม่มีโค้ดไหนเขียนทับ แต่สัญญาไม่เป็นจริง
> - ตัดสินทีละส่วน:
>   - `jettisoned` เปลี่ยนระหว่างเที่ยวบิน (แต่ละตัวพลิกจาก false เป็น true หนึ่งครั้ง) จึงไม่ใช่ข้อมูลคงที่ → คัดลอก
>   - `apollo` เปลี่ยนทุกเฟรม (ความสูงและความเร็วเทียบดวงจันทร์ เหตุการณ์ถัดไป ตำแหน่ง CSM/LM) และแผนเปลี่ยนตอนจุดเครื่อง → คัดลอกทั้งก้อน ข้อความใน #187 ที่ว่า "ตัวเลขของดวงจันทร์คงที่ทั้งภารกิจ" ไม่ถูก
>   - `recovery.target` ตั้งครั้งเดียวตอนแยกตัวและ simulation ไม่เคยเขียนทับ (ถ้าต้องย้ายเรือ จะสร้างวัตถุใหม่) จึงเป็นข้อมูลคงที่แบบเดียวกับ `visual` แต่มีแค่ 6–7 ตัวเลข คัดลอกตอน seek ได้ถูก → คัดลอกตอน seek; ส่วนเฟรมที่บันทึกไว้ยังใช้ร่วมกับ simulation ตามเดิม เพราะการคัดลอกลงทุกเฟรมจะเพิ่มหน่วยความจำ 120–144 B ต่อบูสเตอร์ต่อเฟรม
> - ค่าทุกค่าที่ seek ได้เหมือนเดิมทุกบิต เปลี่ยนเฉพาะว่าเป็นวัตถุใหม่ (ตรวจกับ main ทุกภารกิจ watch ทั้ง 20 ภารกิจ)
> - ขนาด: เล็กลง 274 B ต่อไฟล์ (`index-*.js` และ `flight.worker-*.js`) เพราะเขียนการ blend ของ CSM, ascent stage และ service module เป็น loop แทนสามชุดซ้ำ ที่ว่างของ precache code เพิ่มจาก 98 B เป็น 646 B #187 ใช้ได้พอทั้งสองลำดับการ merge
> - หน่วยความจำของการบันทึก (`FRAME_BYTES`) ไม่เปลี่ยน เพราะ `captureFrame` ไม่เปลี่ยน
> - การ merge: แก้จากผิดเป็นถูก มีเทสต์ที่ fail ก่อนแก้ ไม่ได้ขึ้นเพดาน ไม่ได้เปลี่ยน assertion เดิม (รอผลตรวจของ agent ตัวที่สองและ CI) ถ้า #187 merge หลัง PR นี้ ต้องลบประโยคใน docstring ของ `interpolateFrames` ที่ #187 เพิ่มว่า "ข้อมูลเหล่านี้ใช้ร่วมกัน" ออก เพราะจะไม่จริงแล้ว

```yaml
item: replay frame copies (aliasing on main, PR #187's "Not changed, for later")
change_kind: bug fix (the deep copy cloneFrame promises); values unchanged, no assertion changed, no ceiling raised
owner_authorization: 'owner in chat to this session, 2026-10-30: "Task: decide per field whether it is immutable mission data (then document it as deliberately shared, as `debris[].visual` already is) or could be written by a consumer (then deep-copy it in `cloneFrame` and in `interpolateFrames`, e.g. a `cloneApollo`, `jettisoned: { ...f.jettisoned }`, and a copy of `recovery.target`)."'
app_code: src/physics/frame.ts
tests: tests/replay-copies.test.ts (new)
base_sha_verified_on: {sha: 1842a86, date: 2026-10-30}
branch: claude/great-mayer-6kapau
pr: 188
second_agent_review: in progress
```

## Cause

`cloneFrame` (src/physics/frame.ts) promises a deep copy "down to every sub-object a consumer could write to". A frame a seek returns travels through `replay/simview.ts` into `ui/map.ts` and `ui/onboard.ts`, and the recording must stay as it was flown. `interpolateFrames` builds its result on `{ ...a }`.

Three parts of a frame were still the stored frame's own objects:
- **`jettisoned`.** `cloneFrame` never copied it, and `interpolateFrames` passed it through `...a`.
- **`apollo` and everything in it.** `cloneFrame` never copied it. `interpolateFrames` passed it through `...a`, or, when the CSM, the ascent stage or the service module blended, spread it shallowly, so its sub-objects (`moon`, `sequence`, `tli`, `perilune`, `lunar`, `mcc`, …) were still shared.
- **`debris[].recovery.target`.** `{ ...d.recovery }` is shallow. `captureFrame` shares the target with the simulation too, so the stored frames and the live simulation hold the same object.

PR #187's second agent counted about 245,000 such calls on recorded watch missions. #187 narrowed the `interpolateFrames` docstring to call this data mission-long and shared.

## Decision per field

| Field | What it holds | Changes during a flight? | Decision |
|---|---|---|---|
| `jettisoned` | `interstage`, `tower`, `aftSkirt` | yes: each flips from false to true once (the Saturn V's interstage ring and escape tower, a Soyuz's tower) | copied: `{ ...f.jettisoned }` |
| `apollo` | Apollo's state (`ApolloState`) | yes, every frame: the Moon's height and speed (`moon`), the next milestone (`next`), the lunar orbit (`lunar`), the CSM, ascent stage and service module states, the descent, the rendezvous and the entry. At burns: `perilune`, `mcc`, `tli`. Once: `sequence`, `tliTime`, `landed`, `splash`. | copied whole: `structuredClone` |
| `debris[].recovery.target` | the landing zone, drone ship or tower a recovered stage is flown to | no: set at separation (`planReturn`, sim/debris.ts), never written into. A six-DOF drone-ship stage is given a new object when its ship is stationed again (rigid/debris-runtime.ts: "A new object: recorded frames share the old one.") | copied at the seek, with the recovery: `structuredClone`. Still shared between the simulation and the stored frames (below). |
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
- **`cloneFrame`** copies `apollo` with `structuredClone` and `jettisoned` with a spread.
- **Recovery copies.** `cloneDebrisFrame`, and the blended-debris branch of `interpolateFrames`, copy `recovery` with `structuredClone`, which copies its `target`. The copy moved into the one branch that uses it: before, every debris item paid for one even where `cloneDebrisFrame` made it again.
- **`interpolateFrames`** copies `apollo` with `structuredClone` and `jettisoned` with a spread. The CSM, ascent stage and service module blend changed form:
  - Before: three hand-written spreads, each `hermite(a.apollo.X.r, a.apollo.X.v, b.apollo.X.r, b.apollo.X.v, u, span)`, guarded by one compound condition.
  - Now: a loop over the three keys on the copy. The values are the same, and so is the key order, since an assignment keeps a key's place as the spread did.
- **Why `structuredClone`.** It is a platform global, already used in src/ (lessons/config.ts, lessons/progress.ts, mcp.ts) and available in the flight worker. It copies these plain-data trees whole in the fewest bytes, which matters because this file is bundled into two precached chunks.
- **`captureFrame`** is unchanged; a comment there names the shared target.
- **Docstrings.** `cloneFrame`'s docstring, which sat orphaned above `cloneRendezvous`, moved above `cloneFrame` and now gives the per-field decision. `interpolateFrames`' docstring on main already says "The result is a fresh frame; the inputs are never mutated", which is now true, so it is not edited.

## Measured

### Failing first

`tests/replay-copies.test.ts`, 3 tests, new. Each deep-freezes recorded frames and seeks through `ReplayPlayer.frameAt` on each stored frame and half way to the next. It lists, by path, every object in what the seek returned that is still frozen, which means still shared with the recording (`visual` aside). Then it writes into every field of what it was handed and checks the recording against a copy taken before the freeze.

| Test | On main (1842a86) | This branch |
|---|---|---|
| Apollo 11 to T+900 s, point-mass (2,356 frames with `jettisoned`, 8 with `apollo`) | fails: `frame.apollo`, `frame.jettisoned` | passes |
| Falcon 9 Demo-2 to T+450 s, point-mass (1,563 frames with a drone-ship target) | fails: `frame.debris[].recovery.target` | passes |
| Apollo with every `ApolloState` field, CSM, ascent stage and service module blending or not | fails: clone, no blend and on-`a` share `frame.apollo` and `frame.jettisoned`; the blend shares `frame.jettisoned` and 13 Apollo sub-objects: `moon`, `sequence`, `tli`, `perilune`, `mcc`, `lunar`, `descent`, `landed`, `rendezvous`, `dockAxis`, `entry`, `interfaceAhead`, `splash` | passes |

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

The run above loaded `frame.ts` before the last edit to it (the recovery copy moved into the branch that uses it); a re-run on the committed head, 8a4ba98, is in progress.

### Size

`npx vite build`, `node scripts/bundle-budget.mjs`: ok, no ceiling raised. This file is bundled into `index-*.js` and `flight.worker-*.js` only, so each byte here counts twice in precache code.

| | main (1842a86) | this branch | change |
|---|---|---|---|
| `index-*.js` | 2,634,842 B | 2,634,568 B | −274 B |
| `flight.worker-*.js` | 570,478 B | 570,204 B | −274 B |
| precache code (ceiling 14,654,000 B) | 14,653,902 B (98 B left) | 14,653,354 B (646 B left) | −548 B |

- **Copies alone:** the copies with the old blend measured +50 B a chunk, 2 B over the ceiling. The loop is what made room.
- **Merged with #187** (`claude/practical-lovelace-2ndbww` at fa92cf6): no conflict, typecheck clean. Budget ok: precache code 14,653,396 B, 604 B left. On the merge, `tests/replay-copies`, `rigid-replay-arc`, `debris-replay`, `replay` and `rigid-replay` pass: 5 files, 71 tests.

### Heap and time

- **Stored frames:** `FRAME_BYTES` is unchanged, since `captureFrame` and the stored frames are unchanged. A seek's copies are not kept by the recording; the recorder's one cached copy (`copyOf`) and its live-instant cache hold one frame each, as before.
- **Seek time:** measurement pending.

### Tests

- **Typecheck:** `npx tsc --noEmit -p .` clean.
- **Unit suite, local:** `npx vitest run`, 335 files, 10,529 tests, all pass (Node 22.22.0, not CI's 22.23.3).
- **CI:** run 41002400552 green on 8a4ba98: typecheck, build, test ×3, browser-smoke ×2, verify.
- **Heavy:** `tests/heavy/vostok1-recording.test.ts`, the only heavy or six-DOF fleet file that builds a recorder or player: run in progress.
- **Not run:**
  - The other 32 heavy files and the 6 six-DOF fleet files the change map selects for any `src/physics/**` path. None builds a `FlightRecorder` or `ReplayPlayer` or calls `cloneFrame` or `interpolateFrames` (grep of tests/heavy and tests/sixdof-fleet), so this change cannot reach them. They run on the weekly heavy workflow, and D-64 reuse does not apply because frame.ts is in the physics tree.
  - The browser journeys beyond CI's smoke shards. There is no UI change, and what a seek shows is the same to the bit.

## Second-agent review

In progress on f241a06 (the code and test as in this head).

## Merge order with #187

#187 (six-DOF arc) narrows the last paragraph of the `interpolateFrames` docstring to: "a fresh frame, apart from data that stays as it was for the whole mission and is shared as `cloneFrame` shares it (the jettisoned parts, Apollo's plan and Moon figures, a recovery's target)".

This PR leaves main's sentence as it was, so the two merge without a conflict in either order. If #187 merges second, though, its sentence comes in and is no longer true, and should go back to main's "The result is a fresh frame; the inputs are never mutated." Bytes are not a constraint in either order: 604 B are left with both merged.

## Not changed, for later

- **A live capture shares the target and `visual`.** The frame `FlightRecorder.recordNow` hands back without storing it, which is most frames in flight, shares `debris[].visual` and `debris[].recovery.target` with the simulation and with the stored frames. A consumer that wrote into either would change the recording and, for the target, the live guidance.
  - Nothing writes into them today.
  - Closing it for the target means a copy per stored frame (120–144 B per recovered stage, and a re-fit of `FRAME_BYTES`), or freezing targets where the simulation makes them (sim/debris.ts, rigid/debris-runtime.ts). By estimate, not a build, that is about 14 B a site in each of the seven chunks that carry the physics core.
- **No type-level guard.** Nothing in the types marks a frame read-only. A `DeepReadonly<VisualFrame>` on what a seek returns would catch a write at compile time. It would touch simview, map, onboard and the HUD, so it is a separate change.
