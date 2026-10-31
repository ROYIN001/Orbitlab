# Replay: a spent body that comes down between two frames falls to where it touched / ชิ้นส่วนที่ตกถึงพื้นระหว่างเฟรม ตกไปถึงจุดที่แตะพื้นตรงเวลา

> **สรุปสำหรับเจ้าของ (ภาษาไทย)**
>
> - ปัญหา: ตอนดูย้อนหลังหรือเลื่อนเวลา ชิ้นส่วน (ท่อนจรวด booster ฝาครอบ) ที่ตกถึงพื้นหรือทะเลระหว่างสองเฟรมที่บันทึกไว้ ถูกค้างไว้ที่ตำแหน่งของเฟรมแรกตลอดช่วง แล้วค่อยหายไป (ตกกระแทก) หรือไปโผล่บนพื้น (ลงจอด) ที่เฟรมถัดไป ระหว่างที่ยานอยู่ในวงโคจร เฟรมห่างกัน 10–30 วินาที วัดครบ 20 ภารกิจ:
>   - แบบ point-mass: ฝาครอบค้างกลางอากาศนานสุด 36 วินาที สูง 770 m ห่างจุดตกจริง 10.5 km, Blok A ของ Soyuz ค้าง 10 วินาที ห่าง 2.8 km, ท่อนกลางของ Falcon Heavy ค้างเหนือดาดฟ้าเรือโดรน 149 m นาน 10 วินาที
>   - แบบ six-DOF: ท่อนแรกของ Angara A5 และ Ariane 6 ค้าง 10 วินาที ห่าง 1.1–1.5 km, ฝาครอบค้าง 30 วินาที ห่างสูงสุด 10.8 km
> - แก้:
>   - เฟรมเก็บ "เวลาที่แตะพื้น" ของชิ้นส่วนไว้ด้วย (`impact.t`)
>   - ชิ้นส่วนจึงถูกวาดตกจากตำแหน่งเฟรมแรกไปถึงจุดที่แตะพื้นพอดีเวลาที่แตะ ด้วยเส้นโค้ง cubic แบบเดียวกับ #191
>   - หลังจากแตะแล้วใช้สภาพตามเฟรมถัดไป: ชิ้นที่ตกกระแทกหายไปตั้งแต่วินาทีที่แตะ ชิ้นที่ลงจอดยืนอยู่บนพื้นและหมุนไปกับโลก
> - การจำลอง: ต้องเพิ่มบรรทัดเดียวใน `debris.ts` เพื่อเก็บเวลาแตะพื้นไว้ เพราะของที่ลงจอดแล้วถูกหมุนไปกับโลกทุก step และค่าเวลาเดิม (`restT`) ถูกเขียนทับ การบินของยานและชิ้นส่วนไม่เปลี่ยน
> - ผล: วัดเทียบกับเส้นทางจริงของการจำลอง 210 ช่วงที่ชิ้นส่วนแตะพื้น
>   - แต่ก่อนคลาดสูงสุด 10.5 km (point-mass) และ 10.8 km (six-DOF)
>   - ตอนนี้ชิ้นที่ตกกระแทกคลาดไม่เกิน 0.05 m, ท่อนกลาง Falcon Heavy ที่กำลังจุดเครื่องลงจอด 2.4 m, ชิ้นส่วนของโมดูลอุปกรณ์ Vostok-1 สูงสุด 12.4 m (การจำลองเก็บแค่ความเร็วของพื้นหลังแตะ)
>   - ทุกชิ้นถึงจุดแตะพื้นตรงเวลา ไม่ลงต่ำกว่าจุดแตะก่อนเวลา
> - เทสต์: เพิ่ม 3 เทสต์ ล้มทั้ง 3 บนฐานเดิม ผ่าน 14 จาก 14 ไม่ได้เปลี่ยน assertion เดิม ไฟล์เทสต์ที่เกี่ยวข้อง 95 ไฟล์ 1,528 เทสต์ผ่านทั้งหมด
> - ขนาด: +598 B เจ้าของอนุมัติให้ขึ้นเพดานในแชตวันที่ 30 ("Raise +1 kB each (Recommended)")
>   - ตอนถามมีที่ว่างเหลือแค่ 9 B ต่อมา #184 ขึ้นเพดาน precache code และ #193 ลดขนาดลง 392 B หลัง merge main เข้ามาแล้ว precache code ไม่ต้องขึ้นแล้ว (14,678,570 จาก 14,679,000 B)
>   - เหลือขึ้นแค่ index-*.js 2,654 → 2,655 kB เพราะเกิน 4 B (ส่วนของงานนี้ +215 B) อยู่ในวงที่อนุมัติไว้ offset ที่ระบุ: EQ-7 (K2)
>   - PR นี้จึงยังต้องรอเจ้าของกด merge (ขึ้นเพดาน จึงไม่เข้าเงื่อนไขอนุมัติถาวรของการแก้บั๊ก)
> - เทสต์ heavy: ชุดเต็มรันนานเกิน 2 ชั่วโมงจนเครื่องหยุดให้โดยไม่ได้ผล จึงรัน 6 ไฟล์ที่ไปถึง debris และ replay แทน ผ่าน 27 จาก 27 (fingerprint six-DOF ทั้งกองยาน, Falcon Heavy ลงจอด 3 ลำ, Starship จับ booster, MR-3, Vostok-1 กลับโลกและการบันทึก) และ agent ตัวที่สองบินเทียบทีละ step แล้วว่าการบินไม่เปลี่ยน
> - ฐาน: main + #187 + #191 ตามที่เจ้าของเลือก #187 merge เข้า main แล้ว และ merge main (รวม #193, #184) เข้ามาแล้ว เหลือรอ #191 PR นี้จะแสดง commit ของ #191 ด้วยจนกว่าจะ merge แล้วจะ rebase ลง main
> - เรื่องที่ควรรู้: ชิ้นที่กำลังจุดเครื่องลงจอดใช้เส้นโค้งด้วย (#191 ยังให้ชิ้นที่จุดเครื่องในอากาศใช้เส้นตรง และรอเจ้าของตัดสิน) เพราะเส้นตรงคลาด 40 m ส่วนเส้นโค้งคลาด 2.4 m
> - การตรวจโดย agent ตัวที่สอง: ยืนยัน 6 จาก 9 ข้อ ไม่มีข้อที่ต้องแก้ก่อน merge
>   - บินเทียบฐานเดิมกับ branch ทีละ step รวม 649,560 step ไม่ต่างกันเลยแม้แต่บิต ยกเว้นค่า `impact.t` ที่เพิ่มเข้ามา
>   - ข้อที่ควรแก้ 2 ข้อเป็นคำอธิบายในโค้ด แก้แล้ว
>   - ตัวเลขบางตัวในรายงานมาจากการวัดก่อนแก้โค้ดรอบสุดท้าย วัดใหม่แล้ว: ท่อนกลาง Falcon Heavy 2.35 m
> - CI: ผ่านทั้งหมดบน a095323 (run 41116791446)

```yaml
item: replay debris blend for a body that comes down between two recorded frames (bug fix)
change_kind: bug fix (wrong → right); no existing assertion changed; two ceilings raised with the owner's approval (D-38)
owner_authorization: 'owner in chat on 2026-10-30, asking for the follow-ups listed in docs/development/reports/replay-debris-air.md under "Not changed, for later" to be opened: "เปิดงานต่อยอดในอีกเซสชั่นครับ" ("open the follow-up work in another session"); this task is one of them'
owner_answers: 'in chat to this session, 2026-10-30: base "main + #191 + #187 (Recommended)"; budget "Raise +1 kB each (Recommended)"'
app_code: src/physics/frame.ts, src/physics/sim/debris.ts, src/physics/sim/types.ts
tests: tests/debris-replay.test.ts
base_sha_verified_on: {sha: 79b3bd7 (main 1842a86 + #187 f7f7577 + #191 eec8352), date: 2026-10-30}
branch: claude/wizardly-johnson-49mycc
second_agent_review: 'confirmed 6 of 9, no blocking finding; 2 should-fix comment findings fixed (2026-10-30, on cf5ff7c)'
budget: 'raised (D-38): index-*.js 2654→2655 kB (measured 2,654,004 B on main f68faab + #191 + this fix, 4 B over); precache code not raised (14,678,570 of 14,679,000 B); named offset EQ-7 (K2)'
```

## Authorization

Recorded verbatim, as SESSION-PROTOCOL §2 (D-65) asks. The owner, in chat on 2026-10-30, asked for the follow-ups listed in docs/development/reports/replay-debris-air.md under "Not changed, for later" to be opened: "เปิดงานต่อยอดในอีกเซสชั่นครับ" ("open the follow-up work in another session"). This task is one of them: "A body landing between frames is held at its earlier sample for the whole span, then appears on the ground".

Two questions went to the owner in this session's chat on 2026-10-30, and the answers are quoted as given:
- **Base.** #191 and #187 were open and both change `interpolateFrames`. Answer: "main + #191 + #187 (Recommended)".
- **Budget (D-38).** The fix needs 598 B, and the base had 9 B left. Answer: "Raise +1 kB each (Recommended)".

## Base

#191 (`claude/peaceful-planck-uyne6i`, eec8352) and #187 (`claude/practical-lovelace-2ndbww`, f7f7577) were open. Both diffs were read before asking. The branch merges them into main 1842a86: #187 first (b3de50b), then #191 (79b3bd7).

The conflict was resolved as #191's report says. The doc comment keeps #187's moved version with #191's sentence. #187's in-air test body is set `burning: true` and its test renamed to match #191's. `npx tsc` was clean on the merged base, and tests/debris-replay, rigid-replay-arc and vostok-render passed there, 45 of 45. Once both PRs are merged, this branch is rebased onto main and its diff shrinks to its own commit.

Since then:
- **#187 merged** into main as ef9d3f6, whose tree equals f7f7577. Main was merged in at cacc4be, keeping this branch's side of two history-only conflicts, so the tree did not change.
- **#193 and #184 merged** into main (dcfa065, f68faab). Main was merged in at c77286c:
  - `debris.ts` and `types.ts` merged cleanly with #193's events for an untargeted recovery's burns;
  - `budgets.json` takes main's ceilings, and this fix's raise is re-measured (Size).
  - Typecheck clean; debris-replay, vostok-render, rigid-replay-arc, bundle-budget, budget, recovery-untargeted-events (#193's), rigid-recovery, recovery-return and replay: 130 of 130.

#191 is still open.

## Cause

- **The hold.** In the debris blend, `if (!other || !other.alive || !d.alive || …) return cloneDebrisFrame(d)` draws a body that is alive at frame a and down at frame b at its frame-a sample for the whole span. At b it is gone (src/render/debris.ts draws a dead body only if it `landed`, or Vostok-1's hatch and seat), or it appears standing on the ground.
- **Why the frames are sparse.** While the vehicle coasts in orbit, the recorder keeps a frame every 10 s, or 30 s with no burn within two minutes (`interval()`, src/replay/recorder.ts). The simulation also steps that coarsely:
  - a point-mass orbit takes up to 30 s per step (`suggestedDt`);
  - a six-DOF held coast takes up to 30 s too (`heldCoastWindow`).
- **Why event frames don't help.** The recorder keeps the frames on both sides of a step that logs an event. But a contact event is stamped with the time the step ends (`Simulation.event`), and the simulation has no state between its step boundaries. So the frame "at" a touchdown event is frame b, with the body already down.
  - Pinning a frame at the touchdown event (the task's second option) therefore cannot give a frame with the body still in the air. In a long step there is no such state to capture.
  - Fairings raise no event at all.
- **What the simulation knows.** It knows when each body touched:
  - `Debris.restT` is set at every contact (`finishCatch`, `touchdown`, the point-mass sub-step in `stepDebris`, the rigid runtime's `contactTime`, `comeDown` in sim/fall.ts).
  - For a body the tracker carries round with the Earth (a landed stage, Vostok-1's self-flown pieces), `DebrisTracker.rest` overwrites `restT` with the current time every step. Its contact time was lost before any frame was captured.
  - A crash that is not carried round keeps its contact state, in inertial space, and its `restT`.

## Measured

Probe (gitignored `tests/probe/touchdown-record.test.ts`, `touchdown-eval.test.ts`):
- **Setup.** Each watch mission was built from `watchMissionSettings(id, 2026-09-22T03:00Z)` as the flight tests build it. It was recorded through `FlightRecorder.advance` as the app does, point-mass and six-DOF, to the later of T+1,500 s or the last falling body down (Vostok-1 to T+8,000 s).
- **Truth.** The simulation's own path of each body:
  - six-DOF: the rigid debris runtime's own 0.01 s sub-steps (`sync`, kept every 0.05 s);
  - point-mass: `stepDebris`'s own RK4 sub-steps (at most 0.5 s when the step starts below 60 km, 2 s above), flown again from the step's start. In all 90 re-flown falls they land on the simulation's contact state to 0 m.
  - Falcon Heavy's returning centre core: the flight was re-run with that stage stepped in 0.05 s pieces.
  - Vostok-1's self-flown pieces: the simulation's step boundaries, 0.1–0.25 s apart there.
- **Evaluation.** Frames recorded on the base, with the later frame given the contact time as the new `captureFrame` writes it, were drawn by the shipped `interpolateFrames` at every truth sample before the contact and at 400 instants across each span.

210 bodies come down between two frames with a contact time:
- **131 spans are under 0.3 s.** These are event frames in dense flight. They were held at most 118 m before, and are now within 0.01 m.
- **63 spans are 5 s or longer.** Worst sample per body:

| model | body | span | in the air before / after the contact | held at, over the ground | held → new, off the path before the contact |
|---|---|---|---|---|---|
| point-mass | fairings (Angara A5, Ariane 6, Falcon 9 ×2, Falcon Heavy, H-IIA, Soyuz ×4, Vostok-1) | 30–36 s | up to 35 s / up to 27 s | 53–766 m | 1,389–10,532 m → 0.00 m |
| point-mass | Blok A (Soyuz-2.1a ×4), the S-II, the H-IIA first stage | 10 s | 1.5–9 s / 1–8.5 s | 102–932 m | 642–2,815 m → 0.00 m |
| point-mass | Sputnik's boosters (4), Vostok-1's Blok A | 18–19 s | 4–9 s / 10–14 s | 380–675 m | 983–2,760 m → 0.01 m |
| point-mass | Falcon Heavy's centre core, landing burn lit at frame a (re-run in 0.05 s pieces; the app's own recording: 149 m, down 4.6 s in) | 10 s | 4.8 s / 5.2 s | 164 m | 2,008 m → 2.35 m |
| point-mass | Vostok-1's instrument-module pieces, seat, hatch | 1–5 s | up to 2.8 s / up to 2.7 s | — | up to 859 m → 12.4 m |
| six-DOF | fairings (Electron, Falcon 9 ×2, Falcon Heavy, H-IIA, Soyuz ×4, Vostok-1) | 30 s | up to 27 s / up to 29 s | 43–722 m | 691–10,833 m → 0.00 m |
| six-DOF | Angara A5 URM-1 core, Ariane 6 core, H-IIA first stage, Soyuz Blok A and a strap-on | 10 s | 1.3–9.8 s / 0.2–8.7 s | 67–441 m | 592–3,459 m → 0.00 m |
| six-DOF | Vostok-1's instrument-module pieces, seat, hatch | 1–5 s | up to 1.4 s / up to 3.8 s | — | up to 446 m → 6.7 m |

On every one of the 210 spans:
- the drawing is at the contact point at the contact time (0 m to the probe's precision);
- before the contact it never goes below the contact point's height;
- from the contact on, the item is down, as the later frame has it, at its contact point turned with the Earth (or, for a crash, where the simulation keeps it);
- the largest end-speed-to-mean ratio is 1.03. Near the ground every falling body is at its terminal speed and close to a straight line, and the cubic overshoots only past 3.

**The contact point itself:**
- **Point-mass:** below the surface by up to one sub-step's fall. The sub-step that finds the contact is where the simulation stops it; the H-IIA first stage stops 49 m under the sea. The drawing reaches it at the contact instant, and the crash is then gone.
- **Six-DOF:** for a body that comes down in the sea, the centre of mass is 0.5–5.3 m above it at the contact, because it is the tail that touches.

## Change

**Simulation** (src/physics/sim/debris.ts, end of `stepDebris`): `if (d.impact) d.impact.t ??= d.restT;` for every dead body, before `rest` runs.
- Every contact path sets `impact` and `restT` together in the same step, so `impact.t` is the contact time, kept after `rest` moves `restT` on.
- Nothing reads it in the simulation. The flight, the events, every body's state and `restT` are unchanged.
- `Debris.impact` gains `t?` (src/physics/sim/types.ts).

**Frame** (`captureFrame`, src/physics/frame.ts):
- `impact: d.impact && { ...d.impact }` copies the contact time with the place.
- `restT: d.restT` is the instant the body's stored `r`/`v` are for: its contact for a crash, or the frame's own for a body carried round with the Earth.
- `DebrisFrame` gains `impact.t?` and `restT?`.
- `cloneDebrisFrame` is unchanged: it already spreads `impact`, and `restT` is a number.

**Blend** (`interpolateFrames`, the debris map), for a body alive at a whose later item has `impact.t` (`tc`) with `tc >= a.t`:
- **Before the contact:** it is drawn from its frame-a sample to the contact state over `[a.t, tc]`, with the blend's own fraction `w = (t − a.t)/(tc − a.t)` and span `tc − a.t`, on the existing per-body rule. Its end is in the air, so that rule gives #191's cubic `hermite`.
  - The contact position is the later frame's `r` turned back about the Earth's axis by `OMEGA_EARTH · (restT − tc)`, so a crash's own state is used as it is.
  - Its velocity is the later frame's `v`: the contact's for a crash, and the ground's for a landed stage (within its touchdown speed, under 12 m/s).
  - Attitude, pressure and the crew and entry extras blend with `w` too.
- **From the contact on:** `{ ...cloneDebrisFrame(later), r: turned back to the instant drawn }`. The later frame's discrete state (down, outcome, recovery) is taken from the contact instant on.
  - A crash is no longer drawn from then, a landed stage stands where it touched down, and the telemetry list and map show it down from then.
  - "Everything discrete comes from the earlier frame" is the rule for a change whose instant the frames do not know. This one's instant is now known.
- **Unchanged:**
  - a later frame without `impact.t` (a recording made before this change) keeps the hold;
  - a body down at both frames keeps `turnWithEarth`;
  - a body alive at both keeps #191's and #187's blends.

Choices measured before taking them (same probe, same spans):
- **The end tangent.**
  - The straight line to the contact point needs no velocity. It was 39.7 m off for the centre core under its landing burn and up to 5.7 m elsewhere.
  - Constant acceleration from frame a to the contact point needs none either. It was 2.8 m worst, but it dips under the contact height once the body's descent at frame a is over twice its mean rate, where the cubic tolerates three times.
  - The cubic through the frame's own contact state was kept: 0.00 m for a crash, 2.35 m for the landing burn, up to 12.4 m for Vostok-1's pieces (below).
- **A body under its own thrust.** #191 keeps the straight line for a body firing its engines in the air, and asks the owner whether it should. A body landing inside the span takes the cubic whether it fires or not: 2.35 m against the line's 39.7 m (`quiet || s < span`). The only such span in the watch missions is Falcon Heavy's centre core, point-mass. #191's question about bodies alive at both frames is unchanged.
- **Turning every body on the ground with the Earth** (crashes too) would have made the frame uniform with one time. It was not done: it changes the simulation's stored state for crashed bodies, and it loses a crash's contact velocity, which the cubic uses.

## Tests

`tests/debris-replay.test.ts`, describe 'a spent body that comes down between two recorded frames', 3 new tests:
- **A crash mid-span.** A Blok A-like fall, 1.5 km up at 320 m/s, 70° below the horizon, in the sea 5.62 s into a 10 s span while the vehicle coasts in orbit, flown with gravity and drag.
  - Half way it is below its frame-a height by more than 500 m.
  - Every 0.1 s it is within 1 m of the path it flew (0.32 m at most), and never below its contact height.
  - At the contact time it is within 0.01 m of the contact point; from then it is down at it.
  - The function stays pure.
- **A landing mid-span, turned with the Earth.** A centre core under its landing burn, 160 m up, at rest 4.8 s later on a deck at 30° N. The later frame has it where the deck is 5.2 s after the contact.
  - It is within 0.5 m of its path (0.11 m) and on the deck at its contact time.
  - From then it is `landed`, at the deck turning with the Earth, within 1 mm.
- **A recorded point-mass Falcon Heavy** (watch-mission settings), with its centre core on the drone ship (10 s span) and both fairing halves in the sea (30 s spans).
  - The later frame carries the simulation's contact time inside the span. For a crash it equals the simulation's own `restT`; for the landed core, `restT` has moved on with the Earth's turn.
  - Each body is drawn below its earlier sample half way down: the core 37 m against 149 m, the fairings 155 m against 312 m.
  - Each is at its contact point at its contact time (0.4 mm), down from then, and continuous at the later frame.

**Failing first:** with src/ as on the base, all 3 new tests fail; the 11 existing tests in the file pass.
- The crash is drawn at 1,500 m half way, against the test's 1,000 m.
- The landing is 81.6 m off at its first sample.
- The recorded flight's frame has no contact time.

With the change, 14 of 14 pass. No existing assertion changed. The existing 'holds a body that comes down between two frames at its earlier sample' builds a later frame without a contact time, as an older recording has, and passes unchanged. A comment above it says so.

**CI:** green on a095323 (run 41116791446): plan, typecheck, build, test 1–3, browser-smoke 1–2, verify.

**Related files:** every test file that reaches `interpolateFrames`, `captureFrame`, the recorder, the replay view or the debris simulation — 95 files, 1,528 tests, all pass. They include tests/vostok-render.test.ts's 'a body at rest between two recorded frames', tests/rigid-replay-arc.test.ts, recovery-return, crew-descent, entry-heating and live-stepping. Also:
- tests/bundle-budget.test.ts and tests/budget.test.ts: 24 of 24;
- `npx tsc --noEmit -p .`: clean;
- heavy suite (`npm run test:heavy`, shared physics work, SESSION-PROTOCOL §7): see "Heavy".

## Size (D-38)

`npx vite build`, `node scripts/bundle-budget.mjs`: ok with the raised ceiling. Against the base this branch started from (main 1842a86 + #187 + #191):

| chunk | base | branch | change |
|---|---|---|---|
| index-*.js | 2,634,886 B | 2,635,101 B | +215 B |
| flight.worker-*.js | 570,523 B | 570,736 B | +213 B |
| monte-carlo, ratings, readiness, recheck and tune workers | | | +34 B each |
| precache code | 14,653,991 B | 14,654,589 B | +598 B |

- **Where the bytes are.**
  - The blend and the capture are in index and the flight worker.
  - The five other workers carry the debris simulation, so its one line counts in all seven chunks.
  - The base had 9 B left under 'precache code' and 114 B under 'index-*.js'.
- **What it was over.** The change was 589 B over 'precache code' and 101 B over 'index-*.js' after trimming the blend's code: two redundant tests, a copy, and turning the velocity. It cannot fit in 9 B.
- **The four D-38 parts**, written in budgets.json beside each group:
  1. the measured sizes above;
  2. the feature and package: this bug fix, the follow-up of #191;
  3. the named offset: EQ-7 (split the first-view code, K2);
  4. the owner's approval in chat on 2026-10-30: "Raise +1 kB each (Recommended)".
- **First raised, at a095323:** 'index-*.js' 2635→2636 kB, 'precache code' 14654→14655 kB, and the total 'precache' 16053→16054 kB, which follows its two groups as every code raise has (tests/bundle-budget.test.ts requires the two to add up to no more than it).
- **Re-measured after merging main (c77286c).** #184 raised 'index-*.js' to 2654 kB and 'precache code' to 14679 kB with the owner's approval for its 3-D Soyuz models, and #193 took 392 B off. Against main f68faab built alone, the merged tree is +637 B: #191's 39 B plus this fix's same 598 B, chunk for chunk.

  | group | main f68faab | + #191 + this fix | ceiling |
  |---|---|---|---|
  | index-*.js | 2,653,770 B | 2,654,004 B | 2654 kB: 4 B over |
  | precache code | 14,677,933 B | 14,678,570 B | 14679 kB: 430 B left |

  So only 'index-*.js' is raised now, 2654→2655 kB, within the owner's approval. 'precache code' and the total keep main's ceilings, and budgets.json's note says so.
- **Merge.** A raised ceiling takes this PR out of the standing bug-fix approval, so it waits for the owner's button.

## Heavy

- **The full suite** (`npm run test:heavy`, 37 files) was started on cf5ff7c. It was still running after two hours on this 4-core machine, alongside the probes and the second agent, and was stopped at the session's two-hour limit before it reported. Its log was lost with the session's scratch folder.
- **The six heavy files that reach the changed code** were then run on cacc4be (the same `src` as cf5ff7c, with comments changed): `--reporter=verbose`, 6 files, 27 of 27, 357 s.
  - sixdof-fingerprint: every catalogue vehicle's first 160 s in six-DOF exactly as recorded, 21 vehicles;
  - falcon-heavy-returns: both side boosters on LZ-1 and LZ-2 and the core on the drone ship;
  - starship-flight5: the booster caught and the ship splashed down;
  - mercury-redstone;
  - vostok1-return and vostok1-recording: the self-flown bodies, the recorder and the blend.
- **The flight itself:** the second agent's lockstep comparison (claim 1 below) flew the base and the branch step for step, 649,560 steps, and found them bit-identical but for `impact.t`.
- The other 31 heavy files fly six-DOF flights through code this change does not touch; they were not re-run after the stop.

## Second-agent review

Done on cf5ff7c, review only (no edits); a095323 adds only records and test comments, so its results hold for both. **Verdict: confirmed 6 of 9, no blocking finding.** Its probes ran the base and the branch side by side.

1. **The flight is unchanged: confirmed.** The base and the branch were flown in lockstep, one `sim.step` each, comparing `sim.state`, every event and the whole debris list with `Object.is` after every step: all 20 watch missions point-mass (291,662 steps) and six-DOF Soyuz T-10, MR-3 and Falcon 9 Bandwagon (357,898 steps). 0 differences, with the same `dt` at every step; the only new field is `impact.t`.
2. **`impact.t` is the contact time: confirmed** on all 113 contacts of those 23 flights. It was checked against the passive point-mass sub-step (re-flown bit for bit), `touchdown` (Falcon 9s, Falcon Heavy core and side boosters), `finishCatch` (Starship), the six-DOF `contactTime` (MR-3's Redstone, Falcon 9's landed stage and fairings) and `comeDown` (Vostok-1's seat, hatch, six pieces and the pilot, against each flight's own clock). `restT === impact.t` for every crash, and `restT` is the frame's instant for every landed or grounded body. Not exercised: the module's own `comeDown` (it breaks up first) and the six-DOF tower catch, which pass through lines covered above.
3. **Old frames blend as before: confirmed.** Recorded branch frames were frozen and blended by both commits' `interpolateFrames` on every pair: 253,790 point-mass and 34,619 six-DOF calls. Without `impact.t`, every field is deep-equal to the base. With it, only items alive at the earlier frame whose later item has `impact.t >= a.t` differ (849).
4. **Pure, copying rules kept: confirmed.** Frozen inputs never threw (strict mode), repeated calls are deep-equal, and no output sub-object is shared with a stored frame except `visual` and a recovery's `target`.
5. **Arrival and odd input: partly.** On 112 recorded landing spans the body is at its contact point at its contact time (≤ 0.1 mm), never below it before, never dead before it or alive after it, and continuous at both frames. The live point-mass view (`liveBetween`) across Falcon Heavy's landing is 2.12 m off at worst. A backward seek is consistent. No throw for a missing or null `restT`, `tc` at either end or past `b.t`, a NaN `tc`, a rigid configuration change at contact, or `hasRigid && u >= 1`. **But** a NaN `restT` throws (`quatFromAxisAngle`), where the base did not, and `tc = Infinity` gives NaN positions. `captureFrame` never writes either, and JSON stores NaN as null, which falls back safely, so only a hand-built frame reaches them. Not changed.
6. **Failing first: confirmed.** Against the base `src`, exactly the 3 new tests fail; on the branch debris-replay, vostok-render and rigid-replay-arc pass, 48 of 48.
7. **Figures: partly.** 102 of 104 point-mass rows matched its own denser truth within 0.12 m, and the six-DOF rows it checked matched. But the committed `eval.json` predated the final trim of the blend (the contact velocity no longer turned back): re-run, Falcon Heavy's core is 2.35 m (was 2.42) and Vostok-1's pieces move by 0.01–0.02 m. This report now gives the re-run figures. On the flight as the app records it (no 0.05 s pieces), the reviewer finds the core 2.12 m off (held: 1,921 m). Of the spans of 0.3 s or more, 72 have 0.3 s or more before the contact.
8. **Size: confirmed.** +598 B; the four D-38 parts are in budgets.json.
9. **Other findings: two should-fix, fixed in the next commit.**
   - The new branch's comment said a landed body's velocity in the later frame is "a few centimetres a second" off its contact velocity. It is off by the touchdown speed: 2.6–4.6 m/s for landed stages, 13–76 m/s for Vostok-1's pieces. That is what puts the drawing 2–12 m off. The comment now says so.
   - `interpolateFrames`' doc comment still said every debris state comes from the earlier frame and a firing body takes the line. It now describes the contact.

   Notes, not changed:
   - A body that comes down inside a six-DOF span that changes the vehicle's configuration (held whole) still hangs; none of the 219 landing spans of the 40 recorded flights falls in one.
   - After the contact the body's axis and rigid attitude are the later frame's, at that frame's instant: 0.13° at most over 30 s.
   - Test 2's descent comes to rest relative to the deck, so the ground's velocity is its exact end tangent there; the recorded test covers the real 3–5 m/s touchdown only loosely.

## Not changed, for later

- **Burn-ups.** A body that burns up in the air (Vostok-1's instrument module and its frame) has no contact time, so it keeps the hold. These happen during the return's 0.25–1 s frames.
- **The callout trails the picture.** An impact or landing event is stamped with the time its step ends, so its callout can come up to a step (30 s) after the drawing shows the contact. Stamping it with the contact time (`Simulation.event`'s `at`) would change the event log and the flights' fingerprints.
- **The impact longitude is off by up to 0.07°.** The longitude the telemetry list and the map show for a crashed body is taken with the sidereal angle of the wrong instant:
  - point-mass: at its step's start (`s.theta` is updated after `stepDebris`);
  - six-DOF: at its step's end;
  - measured on the watch missions: up to 0.07°, about 5 km at 50° N, visible in the list's second decimal.

  The drawing does not use it. A fix takes the angle at `restT`.
- **Vostok-1's pieces.** Once down, a self-flown piece is carried round with the Earth, and the simulation keeps only the ground's velocity for it. The cubic's end tangent is then the ground's rather than the impact's: 12.4 m off at worst, against 859 m held. Keeping the contact velocity would close it, at more bytes in every physics chunk.
- **The point-mass contact is under the surface.** It lies up to one sub-step's fall under (49 m for the H-IIA first stage), and the drawing ends there at the contact instant. A finer touchdown search belongs to the simulation, not to the replay.
- **Hard-thinned recordings.** A landing span of minutes, which only a recording thinned past its budget leaves, could put the cubic past its overshoot ratio, as for #191's in-air cubic. The watch missions reach 1.03, against 3.
- **Older recordings.** A recording made before this change has no contact time and keeps the hold.
