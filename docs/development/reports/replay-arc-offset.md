# Replay: one local `arc()` for Apollo's cubic calls (identical output) / รวมการเรียก cubic ของ Apollo เป็นฟังก์ชันเดียว (ผลลัพธ์เหมือนเดิมทุกบิต)

> **สรุปสำหรับเจ้าของ (ภาษาไทย)**
>
> - ทำไม: หลัง #187 merge แล้ว ถ้า merge #191 และ #194 ด้วย ขนาด precache code จะเกินเพดาน 15 B เจ้าของเลือกให้ทำงานลดขนาดแบบผลลัพธ์เหมือนเดิมก่อน ("Offset PR first (Recommended)") แทนการขึ้นเพดาน
> - ทำอะไร: ใน `interpolateFrames` (src/physics/frame.ts) การวาดยานของ Apollo สามลำ (CSM, ascent stage, service module) ระหว่างสองเฟรมเคยเขียนการเรียก `hermite` เต็มๆ สามครั้ง ตอนนี้เรียกผ่านฟังก์ชัน `arc` ตัวเดียว ซึ่งเรียก `hermite` ตัวเดิมด้วยค่าเดิมทุกตัว ภาพที่เห็นไม่เปลี่ยน
> - ผลลัพธ์เหมือนเดิม: บันทึก Apollo 11 ตั้งแต่ปล่อยจนลงน้ำ (T+703,130 s) แล้วเทียบ `interpolateFrames` ของ main กับของงานนี้ทุกคู่เฟรม: point-mass 34,671 ครั้ง ต่างกัน 0 ครั้ง (มีคู่เฟรมที่มี CSM 1,801 คู่, ascent stage 317, service module 27) และ agent ตัวที่สองสุ่มเฟรมที่มียานครบสามลำอีก 30,000 ครั้ง ต่างกัน 0 ครั้ง; six-DOF 14,769 ครั้ง ต่างกัน 0 ครั้ง
> - ขนาด: เล็กลง 120 B ต่อ chunk (index และ flight worker) precache code เหลือ 288 B; เมื่อรวม #191 และ #194 แล้วเหลือ 225 B (วัดจาก trial merge) ไม่ต้องขึ้นเพดาน
> - ลำดับ: งานนี้ merge ก่อน แล้วตามด้วย #191 แล้ว #194 (#194 ต่อจาก #191 และมี commit ของ #191 อยู่ด้วย) #191 อย่างเดียวกับงานนี้ precache code ก็ยังอยู่ใต้เพดาน
> - การตรวจโดย agent ตัวที่สอง: ยืนยัน 12 จาก 14 ข้อ ไม่มีข้อที่ต้องแก้ ข้อสังเกตสองข้อ (ลำดับการ merge และตัวเลขขนาดที่ต่างได้ 1–2 B ตาม build stamp) แก้แล้ว

```yaml
item: replay blend, one local arc() for Apollo's cubic calls (identical output; the D-38 offset named in #194's report)
change_kind: identical output; no assertion changed; no ceiling changed
owner_authorization: 'owner in chat to this session, 2026-10-30, answering the D-38 question for #194 (precache code 15 B over with #187 merged): "Offset PR first (Recommended)", whose option read "I open the identical-output helper as its own small PR on a new branch (you authorize that package and branch now)"'
app_code: src/physics/frame.ts
base_sha_verified_on: {sha: ef9d3f6, date: 2026-10-30}
branch: claude/replay-arc-offset
pr: 196
second_agent_review: 'confirmed 12 of 14, nothing blocking or should-fix (2026-10-30, on c62c318); two notes fixed; the check it left open, the six-DOF run, has since finished: 0 differ'
```

## Why

#187 merged at ef9d3f6. #191 (debris through the air, +19/+20 B) and #194 (the span limit on #191's cubic, +12/+12 B) are still open, and with all three merged precache code is 14,654,015 B, 15 B over its 14,654,000 B ceiling (#194's report, "D-38 raise case"). Every byte in `interpolateFrames` counts twice, since it is in the index chunk and the flight worker. The owner chose this offset over a raise.

## Change

In `interpolateFrames`, after `dt`:

```ts
const arc = (x: { r: Vec3; v: Vec3 }, y: { r: Vec3; v: Vec3 }) => hermite(x.r, x.v, y.r, y.v, u, span);
```

and the three Apollo calls become `arc(a.apollo.csm, b.apollo.csm)`, `arc(a.apollo.ascentStage, b.apollo.ascentStage)` and `arc(a.apollo.serviceModule, b.apollo.serviceModule)`.

Why the output is the same: `hermite` gets the same six arguments, read from the same objects, in the same order; `u` and `span` are the function's own, fixed before `arc` is made; reading `x.r` inside `arc` rather than at the call site reads plain data properties with no getters. `hermite` itself, `path`'s call and the rendezvous's calls are untouched.

## Measured: identical output

Probe (gitignored `tests/probe/arc-same.test.ts`): Apollo 11, the watch mission, built as the app builds it (`watchMissionSettings` from 2026-09-22) and recorded through `FlightRecorder.advance` to splashdown. On every pair of consecutive stored frames, main's `interpolateFrames` (a copy of its frame.ts at ef9d3f6) and this branch's were compared at u = 0.13, 0.5 and 0.87, the whole frame, recursively with `Object.is`.

- **Point-mass:** T+703,130 s, 11,558 frames (thinned 12 times), 34,671 blends, 0 differ. 1,801 pairs carry the CSM at both frames, 317 the ascent stage, 27 the service module.
- **Six-DOF** (`defaultDynamics`): T+703,130 s, 4,924 frames (thinned 36 times), 14,769 blends, 0 differ. 1,110 pairs carry the CSM, 316 the ascent stage, 30 the service module.
- **Synthetic** (the second agent's `review-arc.test.ts`): 3,000 frame pairs with random states, spans from 1 µs to 1.3 days, statuses orbit, coast, burn and descent, half with all three craft at both frames and half with random subsets, at 10 values of u including 0, 1, 1.5 and −0.2: 30,000 blends, 0 differ (12,164 with all three craft blended), the inputs unchanged. Scaling `span` by 1 + 1e-15 inside `arc` gave 10,492 differences, so the check sees a change of one ulp.

No existing test exercises the blend of Apollo's craft directly; the probe covers every pair of a whole mission.

**Tests:** 38 test files that reach `interpolateFrames`, `captureFrame`, `FlightRecorder`, the replay player or the session, with #187's `tests/rigid-replay-arc.test.ts`: 584 tests, all pass. `npx tsc --noEmit -p .` is clean.

## Size

`npx vite build`, `node scripts/bundle-budget.mjs`: ok.

| | main (ef9d3f6) | this branch | with #191 and #194 too |
|---|---|---|---|
| `index-*.js` | 2,634,867 B | 2,634,747 B (−120) | 2,634,778 B |
| `flight.worker-*.js` | 570,503 B | 570,383 B (−120) | 570,415 B |
| precache code (ceiling 14,654,000 B) | 14,653,952 B | 14,653,712 B (288 B left) | 14,653,775 B (225 B left) |

The last column is a trial merge of this branch into #194's head (main + #191 + #194); bundle-budget passes, and `tests/debris-replay.test.ts` with `tests/rigid-replay-arc.test.ts` pass, 29 of 29. #191 alone with this PR gives 14,653,751 B (the second agent). #191's in-air debris call could use `arc` as well (17 B more per chunk in #194's first measurement); it is left to #191, so this PR stays on main's code.

The figures are for a build stamped with a 7-character commit hash (`__ORBITLAB_BUILD__`, from `git rev-parse --short HEAD` in vite.config.ts). The second agent's checkout abbreviates to 8 characters and its builds were 1 B larger in index and 2 B in precache code; every difference above is the same, and CI's build may differ by a byte or two in the same way.

**Merge order:** this PR first, then #191, then #194, which is stacked on #191 and carries its commits.

## Second-agent review

Done on c62c318, review only. **Confirmed 12 of 14 checks, nothing blocking or should-fix.**
- **Identical output, by reading:** the diff is only the `arc` line and the three call sites; `hermite` gets the same six arguments in the same order; `u` and `span` are constants set before `arc`; the craft are plain `{ r; v }` objects (sim/apollo.ts), with no getters; `arc` shadows nothing; `hermite`, `path` and the rendezvous calls are untouched.
- **The probe's copy of main** equals ef9d3f6's frame.ts apart from import paths. **Apollo 11 point-mass**, re-run in its own worktree: the same output line, 0 differ.
- **Synthetic check** (above): 30,000 blends, 0 differ; its mutant shows it would catch a one-ulp change.
- **Sizes:** reproduced, with a 1–2 B build-stamp difference that changes no delta; the trial merge with #194's head merges cleanly, bundle-budget ok, 29 of 29.
- `npx tsc --noEmit -p .` clean on the branch and the trial merge; 6 replay test files, 89 tests, pass.
- **Not yet checked then:** the six-DOF run, which has since finished with 0 differences (above).
- **Notes, fixed:** the merge order (#191 before #194, not any order); the build-stamp caveat.
