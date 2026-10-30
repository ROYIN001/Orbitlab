# Replay: a seek's copy of the control system's failures / สำเนาบันทึกความขัดข้องของระบบควบคุมในเฟรมที่ seek ได้

> **สรุปสำหรับเจ้าของ (ภาษาไทย)**
>
> - ปัญหา: ในเที่ยวบิน six-DOF ที่ตั้งความขัดข้องของระบบควบคุมไว้ (G08) เช่นบทเรียน «ไจโรวัดอัตราเสีย» (ru-fdir-dus) ในชุด 24.05.06 เฟรมทุกเฟรมที่ seek ได้ยังใช้บันทึกความขัดข้องและสถานะ FDIR (`rigid.controlFaults`) เป็นวัตถุเดียวกับเฟรมที่บันทึกไว้ เพราะ `cloneRigidTelemetry` ไม่คัดลอกส่วนนี้ ถ้าโค้ดใดเขียนทับ ข้อมูลที่บันทึกไว้จะเปลี่ยนไปด้วย ตอนนี้ยังไม่มีโค้ดไหนเขียนทับ (มีแต่การอ่าน: loop inspector, CSV และ MCP) agent ตัวที่สองของ #188 พบจุดนี้ (F2) และแยกไว้ทำต่อ
> - แก้: คัดลอกบันทึกนี้ตอน seek ใน frame.ts (`ownFaults` ใช้ `copyPlain` ที่ #188 เพิ่มไว้) ไม่ได้แก้ใน rigid/telemetry.ts ตามที่งานเสนอไว้ก่อน เพราะไฟล์นั้นถูกรวมอยู่ใน 7 chunk วัดแล้วทุกทางที่แก้ในไฟล์นั้นไม่ผ่าน:
>   - คัดลอกด้วย `copyPlain`: +1,249 B เกินเพดาน 827 B
>   - คัดลอกด้วย `structuredClone`: +497 B เกินเพดาน 75 B และช้าที่สุด
>   - ใช้ `copyPlain` แทนการคัดลอก flex และ engine maps ที่เขียนเองไว้ด้วย เพื่อชดเชยขนาด: เล็กลง 1,470 B แต่ทุกเที่ยวบิน six-DOF จะ seek ช้าลง (ส่วน flex ช้าลงราว 5 เท่า)
>   - จึงเลือกคัดลอกใน frame.ts ซึ่งอยู่ใน 2 chunk และเฉพาะเที่ยวบินที่มีความขัดข้องเท่านั้นที่จ่ายเวลาเพิ่ม เป็นนโยบายเดียวกับ `recovery.target` ใน #188
> - ค่าทุกค่าที่ seek ได้เหมือนเดิมทุกบิต (60,935 ครั้ง 11 เที่ยวบิน) เปลี่ยนเฉพาะว่าเป็นวัตถุใหม่
> - ขนาด: `index-*.js` +90 B, `flight.worker-*.js` +88 B, chunk อื่นไม่เปลี่ยน ที่ว่างของ precache code ลดจาก 422 B เป็น 244 B
> - ความเร็ว: SEEK_TIME_TH
> - ฟิลด์อื่นของ `RigidTelemetry` ตรวจครบแล้ว: คัดลอกลึกทั้งหมด ยกเว้น `linearModel`, `attitudeTest` และ `navigation` ซึ่งอยู่บน telemetry samples เท่านั้น ไม่เคยอยู่บนเฟรม (ตรวจทั้งในโค้ดและในเที่ยวบินที่มี navigation)
> - ที่ยังไม่แก้: เฟรมที่บันทึกไว้ยังใช้บันทึกนี้ร่วมกับ state ของ simulation และบางครั้งกับ telemetry sample ที่เก็บใน step เดียวกัน (simulation สร้างบันทึกใหม่เกือบทุก step และไม่มีโค้ดไหนเขียนทับ) เหมือน `recovery.target` ใน #188
> - การ merge: PR นี้ซ้อนอยู่บน #188 ต้อง merge หลัง #188 ไม่ชนกับ #187, #190, #191 ส่วน #189 ชนกับ #188 อยู่แล้วที่จุดเดียวกัน PR นี้ไม่ได้เพิ่มจุดชน
> - เงื่อนไขการอนุมัติล่วงหน้าสำหรับงานแก้บั๊ก: แก้จากผิดเป็นถูก มีเทสต์ที่ fail ก่อนแก้ (บน main และบน #188) และผ่านหลังแก้ ไม่ได้ขึ้นเพดาน ไม่ได้เปลี่ยน assertion เดิม (เพิ่มเทสต์ใหม่หนึ่งข้อ) agent ตัวที่สองตรวจแล้ว ยืนยัน 8 จาก 8 ข้อ ไม่มีข้อที่ต้องแก้ก่อน merge (ข้อเล็กห้าข้อเรื่องถ้อยคำใน docstring และ guard ของเทสต์ แก้แล้วใน PR นี้) CI_TH

```yaml
item: replay control-faults copy (PR #188's second-agent finding F2, pre-existing on main)
change_kind: bug fix (the deep copy cloneFrame promises); values unchanged, no assertion changed, no ceiling raised
owner_authorization: 'owner in chat to this session, 2026-10-30: "Task: 1. Write a failing-first vitest test in the style of `tests/replay-copies.test.ts` [...] 2. Copy `controlFaults` in `cloneRigidTelemetry`, and in `interpolateRigidTelemetry` if it passes the record through. [...] 3. Mind the bundle budget [...] If a field-by-field copy is too large, consider reusing a compact plain-data copy (PR #188 added `copyPlain` in frame.ts) or moving the copy to frame.ts''s seek path."'
app_code: src/physics/frame.ts (code); src/physics/rigid/telemetry.ts (comments only)
tests: tests/replay-copies.test.ts (one new test)
base_sha_verified_on: {sha: 1a7ca0c, branch: claude/great-mayer-6kapau (PR #188), main: 1842a86, date: 2026-10-30}
branch: claude/epic-wright-cx214p
pr: #192 (stacked on #188)
second_agent_review: 'confirmed 8 of 8 claims checked, no blocking findings (2026-10-30, on 3eb54e5 and db69b31); six non-blocking: N1–N5 fixed here (docstring wording, the test''s guard, a duplicate import), N6 pre-existing (under "Not changed, for later")'
```

## Cause

`cloneFrame` (src/physics/frame.ts) promises a deep copy of a frame "down to every sub-object a consumer could write to". PR #188 made that true for `jettisoned`, `apollo` and `debris[].recovery.target`. Its second agent found one more shared object, outside that PR (its F2):

- rigid/runtime.ts:380 puts `controlFaults: this.faults.record()` on the vehicle's telemetry, on every flight that sets control-system failures (G08). The record is a `ControlFaultRecord` (rigid/faults.ts:71): the failures struck so far with their targets, each IMU unit's state, the units the computer reads, the computer's state, the failed engines and jets, and three vectors (the sensed and true rates, the sensors' attitude error).
- `cloneRigidTelemetry` (rigid/telemetry.ts) copies telemetry as `{ ...value, ... }` and never copies `controlFaults`. `captureFrame` stores frames through it, and every seek goes through it: `cloneFrame` directly, and `interpolateFrames` through `interpolateRigidTelemetry`, which starts from `cloneRigidTelemetry(a)` (or of `b` at u ≥ 1) and only overwrites numbers and vectors.
- So every seek of such a flight handed out the recording's own record. A consumer that wrote into it would have changed the recording. Nothing does today: the readers are the loop inspector (ui/loop-inspector.ts:338, `markFaults`), the CSV export (ui/csv.ts:138) and MCP's summary (mcp.ts:1212), and none writes.
- Only the flown vehicle carries a record. simulation.ts:231 gives the failures to the vehicle's runtime alone ("on the vehicle only"); a body that separates gets its own `RigidRuntime` (rigid/debris-runtime.ts:157) with no failures.

## Decision: where to copy

The task's first choice was a copy in `cloneRigidTelemetry`. rigid/telemetry.ts is bundled into seven precached chunks: `index-*.js` and the flight, tune, Monte Carlo, ratings, readiness and recheck workers. On #188's head, 1a7ca0c, precache code had 422 B left. frame.ts is in two of them (`index-*.js`, `flight.worker-*.js`), and `copyPlain` with it. Each version was built (`npx vite build`) and measured against 1a7ca0c:

| Version | Precache code | Room left (of 422 B) | Seek time |
|---|---|---|---|
| A. `cloneRigidTelemetry` copies the record with `copyPlain`, moved to a module of its own so both files can import it | +1,249 B (+58 and +66 B in the two chunks with frame.ts, +225 B in each of the five workers, which gain `copyPlain`) | −827 B: over | only flights with failures pay |
| B. As A, with `copyPlain` also replacing `cloneFlexTelemetry` and the two engine maps' hand-written copies, to pay for it | −1,470 B (−331 and −329 B; −162 B in each worker) | 1,892 B | every six-DOF flight is slower: see below |
| C. `cloneRigidTelemetry` copies the record with `structuredClone` | +497 B (+71 B in each of the seven) | −75 B: over | the slowest copy: 9.2 µs a record against 1.8 µs |
| **D. A seek copies it: `ownFaults` in frame.ts (this PR)** | **+178 B (+90 and +88 B; the five workers unchanged)** | **244 B** | **only flights with failures pay** |

- **B's cost in time.** Same values, but `copyPlain` is slower than the hand-written copies it would replace. On a flexible-body record it takes 4.0–5.0 µs against `cloneFlexTelemetry`'s 1.0 µs. A whole `cloneRigidTelemetry` call went from 8.34 to 9.18 µs on a plain six-DOF Falcon 9 frame and from 12.46 to 14.86 µs on a flexible one (medians of 15 alternating runs over ~1,000 recorded frames, Node 22.22.0). That is every six-DOF seek, every stored frame and every telemetry sample, with failures or not, so B was set aside.
- **A spread-and-walk copy in other forms** (arrays by `slice`, `Object.keys` instead of `for…in`) was no faster on a flexible-body record: 4.3–5.6 µs.
- **D is #188's policy for `recovery.target`.** The record is copied where a seek hands a frame out. The stored frames keep sharing it with the simulation: the runtime builds a new record at each step it flies (`ControlFaults.record`, rigid/faults.ts:513), and nothing writes into one. A phase that carries the state over spreads `s.rigid` and keeps its record (Apollo's phases, sim/apollo.ts:512 and five more; a touchdown, simulation.ts:1305). On the lesson's flight no two consecutive stored frames share a record.
- **D also covers the recorder's own hand-outs.** `FlightRecorder.recordNow` and `captureChangedState` hand out `copyOf(stored)`, which is `cloneFrame` (replay/recorder.ts:615–689). The worker session posts that live frame, with the frames stored since its last delta, in one message to the main thread's mirror (session/core.ts:155; session/mirror.ts), where `applyFrameToState` gives it to the shell's state (a six-DOF flight has no `simulationFrame`).
  - Before: the live frame shared its record with the stored head frame. When both went in the same delta, the structured clone kept them one object, so the shell's state shared it with the mirror's stored frame.
  - Now they are separate objects before they are posted.

## Change

- **src/physics/frame.ts**
  - `ownFaults(r)` (new, private): replaces a fresh telemetry copy's `controlFaults` with `copyPlain(controlFaults)` and returns it. It does nothing when there is no record.
  - `cloneFrame`: `rigid: ownFaults(cloneRigidTelemetry(f.rigid))`.
  - `interpolateFrames`: `const rigid = ownFaults(interpolateRigidTelemetry(a.rigid, b.rigid, u))`. Its other returns go through `cloneFrame`. Debris telemetry is not passed through `ownFaults`, since no debris carries a record (above).
  - Docstrings: `cloneFrame` lists the record among what a seek copies and says where it is shared; a comment in `captureFrame`.
- **src/physics/rigid/telemetry.ts**, comments only (no byte in any chunk changed):
  - `RigidTelemetry.controlFaults`: a new record every step; shared by `cloneRigidTelemetry` and `interpolateRigidTelemetry`; copied by a seek.
  - `cloneRigidTelemetry` (new docstring): what it shares, and why.
  - `interpolateRigidTelemetry`: shares what `cloneRigidTelemetry` shares, the left frame's record.

## The rest of `RigidTelemetry`

Every field that holds an object, and what `cloneRigidTelemetry` does with it:

| Field | Copied? | Notes |
|---|---|---|
| `attitudeQ`, `omegaBody`, `cgBody`, `renderOffsetBody`, `windECI`, `commandRatesBody` | yes, spread | |
| `inertiaBody` | yes, array spread | |
| `windProfile` | yes, `cloneWindProfile` | its three vectors and its altitude range |
| `engineDeflections`, `engineDirectionsBody`, `engineThrottles`, `surfaceDeflections` | yes | each angle array and direction vector too |
| `flex` | yes, `cloneFlexTelemetry` | `flex.telemetry()` (rigid/flex.ts:497) builds exactly the keys it copies |
| `attitudeLoop` | yes, `cloneAttitudeLoop` (rigid/loop.ts:67) | every vector, the gains and the load relief |
| **`controlFaults`** | **no: a seek copies it (this PR)** | |
| `linearModel`, `attitudeTest`, `navigation` | no | Only telemetry samples carry them: the sampler sets them on its own copy (simulation.ts:1564–1575). They are never on `SimState.rigid`, so never on a frame. The first two are documented as deliberately shared. `navigation` gets a new record every sample (`NavigationSystem.record`). |

On the frames of a six-DOF flight with navigation and an accelerometer failure (the pack's `ru-bins-astro` with `accelBias` and the FDIR on), the seek-equivalence run below found nothing shared with the recording after the fix. A `navigation` record on a frame would have shown up there.

## Measured

### Failing first

`tests/replay-copies.test.ts` gains a fourth test, written in the style of #188's three, which it reuses (`deepFreeze`, `shared`, `seekAll`, `scribble`):
- It flies the lesson `ru-fdir-dus` from the published pack (public/lessons/packs/ru-24-05-06.orbitlab-lesson.json) through `FlightRecorder.advance`, as the app does: Soyuz-2.1a six-DOF, uncrewed, IMU 1's rate gyros stuck at T+30 s, no FDIR. It breaks up at T+42.0 s; T+60 s bounds the flight should a later change keep it flying.
- Checks that every frame (526) carries a record and that more than 50 (123) carry the stuck unit.
- Deep-freezes the recording, then seeks through `ReplayPlayer.frameAt` on every stored frame and half way to the next (1,051 seeks), and lists by path every frozen object in what came back, `visual` aside.
- Then writes into every field of each frame it was given and checks the recording against a copy taken before the freeze.

| Test | main (1842a86) | #188's head (1a7ca0c) | this branch |
|---|---|---|---|
| Soyuz-2.1a six-DOF, rate gyro stuck | fails: `frame.rigid.controlFaults` | fails: `frame.rigid.controlFaults` | passes |
| #188's three tests | fail (their own fields, as #188 reports) | pass | pass |

The test file takes 21.7 s on its own (the new test about 9–11 s, most of it the six-DOF flight).

### Same values, nothing shared

Probe (gitignored `tests/probe/`): #188's head's frame.ts (1a7ca0c) against this branch's, both on the same rigid/telemetry.ts. For each of 11 flights recorded through `FlightRecorder.advance`, on every stored frame: `cloneFrame`, and `interpolateFrames` at a quarter and half way to the next frame. The two outputs were compared with `util.isDeepStrictEqual` (undefined-valued keys included) and a recursive key-order listing. Each output was then walked for any object of the frames it came from (`visual` aside).

| Flight (six-DOF unless marked) | Stored frames | Calls | Differ | Shared with the recording, before / after |
|---|---|---|---|---|
| `ru-fdir-dus` (gyro stuck, no FDIR), to its breakup at T+42 s | 526 | 1,576 | 0 | 1,576 / 0 |
| `ru-fdir-dus` with the FDIR on, to T+161 s (4 boosters as rigid debris) | 1,725 | 5,173 | 0 | 5,173 / 0 |
| `ru-bins-astro` (navigation) with `accelBias` and the FDIR, to T+141 s | 1,522 | 4,564 | 0 | 4,564 / 0 |
| Falcon 9, preset `falconGimbal` with the FDIR, booster recovery, to T+201 s | 2,121 | 6,361 | 0 | 6,361 / 0 |
| Falcon 9, slosh, bending and notch, RCS stuck-on and failed-off and a stuck gimbal, FDIR, to T+181 s | 1,925 | 5,773 | 0 | 5,773 / 0 |
| Proton-M, preset `proton2013`, to its loss at T+13 s | 234 | 700 | 0 | 700 / 0 |
| Ariane 64, preset `ariane501`, to its loss at T+41 s | 521 | 1,561 | 0 | 1,561 / 0 |
| Falcon 9, no failures, booster recovery, to T+201 s | 2,123 | 6,367 | 0 | 0 / 0 |
| Soyuz-2.1a, no failures, to T+201 s | 2,122 | 6,364 | 0 | 0 / 0 |
| Apollo 11, point-mass, to T+910 s | 4,379 | 13,135 | 0 | 0 / 0 |
| Falcon 9 Demo-2, point-mass, to T+450 s | 3,121 | 9,361 | 0 | 0 / 0 |
| **Total** | | **60,935** | **0** | **25,708 / 0** |

The 25,708 calls that shared something before are exactly the calls on frames that carry a record. The flights without one shared nothing before or after, so #188's copies hold on six-DOF frames too.

### Size

`npx vite build`, then `node scripts/bundle-budget.mjs`: ok, no ceiling raised. Exact bytes from the precache manifest in `dist/sw.js`:

| | #188's head (1a7ca0c) | this branch | change |
|---|---|---|---|
| `index-*.js` | 2,634,681 B | 2,634,771 B | +90 B |
| `flight.worker-*.js` | 570,315 B | 570,403 B | +88 B |
| tune, Monte Carlo, ratings, readiness, recheck workers | | | 0 B each |
| precache code (ceiling 14,654,000 B) | 14,653,578 B (422 B left) | 14,653,756 B (244 B left) | +178 B |

`index-*.js` has its own ceiling, 2,635 kB: 229 B are left under it after this PR (319 B before), less than under precache code.

`ownFaults` minifies to 80 B, and each of its two calls to 4 B.

### Heap and time

- **Stored frames:** `captureFrame` is unchanged, so `FRAME_BYTES` (replay/recorder.ts) is too.
- **Seek time,** µs per span (one `cloneFrame` plus one `interpolateFrames` half way), #188's head against this branch, medians of 11 alternating runs over every span of the recording:

SEEK_TIME_TABLE

### Tests

TESTS_SECTION

## Second-agent review

A second agent reviewed 3eb54e5 (the code) and db69b31 (the test), review only, on 2026-10-30.

**Result: confirmed 8 of 8 claims checked, no blocking findings.**

1. **No path still shares:** every return of `interpolateFrames` goes through `ownFaults`, directly or through `cloneFrame` (the degenerate span, u ≤ 0, rigid u ≥ 1, the configuration hold). The recorder's `copyOf` is `cloneFrame`; the mirror's seeks use the same player path, and the live copy no longer shares the record with the stored frames posted with it. Its own probe, four flights (among them a gyro failure struck live at T+20 s), checked `cloneFrame`, the degenerate span, u < 0, u > 1, u = 0.01, 0.5 and 0.99, a forced configuration hold and `frameAt` at each frame and mid-point: about 61,000 calls, nothing shared with the recording but `visual`.
2. **No debris carries a record:** only the vehicle's runtime gets failures (simulation.ts:231–234), and `injectControlFault` targets that runtime; debris runtimes and the other debris telemetry builders have none. 2,261 debris frames with rigid telemetry carried none.
3. **Nothing writes into the record, and it is plain data:** `record()` builds every array and vector new; the readers (loop-inspector.ts, csv.ts, mcp.ts, loop-view.ts) only read; no Map, class instance or cycle.
4. **Sample-only fields:** on `ru-bins-astro` with an accelerometer failure and a live attitude test, 141, 141 and 18 samples carried `linearModel`, `navigation` and `attitudeTest`; no state, none of 810 frames and no seek did. Every other object field is copied deep.
5. **The test** fails on 1a7ca0c and on main with exactly `['frame.rigid.controlFaults']` (on main the other three fail too) and passes on this branch; deterministic.
6. **Same values:** 0 differences over its ~61,000 calls (`isDeepStrictEqual` and key order).
7. **Docstrings:** accurate, apart from N1–N3.
8. **Bundle:** rebuilt exactly (+90 and +88 B, every other chunk byte-identical, 244 B left); rigid/telemetry.ts is in exactly seven chunks.

**Non-blocking findings:**
- **N1, fixed:** `interpolateRigidTelemetry`'s docstring named the left frame's record; at a fraction of 1 it is the right's.
- **N2, fixed:** "the runtime builds a new one every step" overstated it (Apollo's phases and a touchdown spread `s.rigid` and keep the record), and "only a seek copies it" left out the recorder's hand-outs, which `cloneFrame` copies too.
- **N3, fixed:** stored frames share the record with a telemetry sample only when both are taken at the same step (12 of 526 frames, 172 of 2,121); docstring and report now say "can share".
- **N4, fixed:** without a step guard the test would spin to its timeout if the recorder ever stalled; the guard is back (`guard++ < 1000`).
- **N5, fixed:** two imports from `../src/lessons/config` in the test file, now one.
- **N6, pre-existing:** MCP's summary returns live arrays (under "Not changed, for later"); and `index-*.js` has 229 B left under its own ceiling (under "Size").

## Merge order

- **After #188.** This branch is stacked on #188 (`claude/great-mayer-6kapau` at 1a7ca0c) and its PR targets that branch. It needs #188's `copyPlain` and test file. Once #188 merges into main, this PR's base becomes main.
- **Other open PRs that touch frame.ts,** merged into this branch's head with `git merge-tree`:
  - #187 (`claude/practical-lovelace-2ndbww`), #191 (`claude/peaceful-planck-uyne6i`) and #190 (`claude/gracious-sagan-zvg16a`, on #187): no conflict.
  - #189 (`claude/ecstatic-darwin-wijyuc`, on #187): one conflict in `interpolateFrames`, between #188's Apollo and `jettisoned` lines and #189's rendezvous blend. #189 has the same single conflict with #188's head, so this PR adds none.
- **Bytes:** 244 B are left after this PR. #188 measured #187 at 50 B on top of #188.

## Not changed, for later

- **The stored frames can share the record with the simulation and its telemetry samples.** `captureFrame` stores `cloneRigidTelemetry(s.rigid)`, and the telemetry sampler (simulation.ts:1564) takes another copy of `s.rigid`. When both are taken at the same step they share the runtime's record for it: the second agent counted 12 of 526 frames on `ru-fdir-dus` and 172 of 2,121 on the Falcon 9 flight. A consumer that wrote into a telemetry sample's `rigid.controlFaults` would change the recording too. The loop inspector, the CSV export and MCP only read it. Closing this means a copy in `cloneRigidTelemetry`: versions A to C above.
- **A live capture shares it with the simulation.** When `FlightRecorder.recordNow` hands back a frame it captured without storing it (`return f`, replay/recorder.ts:628), that frame shares the record with the simulation's state, as it does `visual` and a recovery's target (#188's "Not changed, for later").
- **MCP's summary hands out the samples' own arrays** (pre-existing, the second agent's N6). `controlFaultsSummary` (mcp.ts:1212) returns `record.active`, `.engines` and `.jets` as they are, so a tool result shares them with a telemetry sample, and sometimes with a stored frame. It matters only if a tool result were changed in place rather than serialised.
- **No type-level guard,** as #188 notes: nothing marks a frame read-only.
