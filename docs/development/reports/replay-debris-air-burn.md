# Replay: recovery burns in the air on the cubic between frames / ชิ้นส่วนที่จุดเครื่องกลับบ้านในบรรยากาศใช้ cubic ระหว่างเฟรม

> **สรุปสำหรับเจ้าของ (ภาษาไทย)**
>
> - ที่มา: คำถามที่ค้างจาก #191 (`replay-burn-cubic`) คุณตอบเมื่อ 31 ต.ค. ว่า "ใช้ cubic ด้วย"
> - ปัญหา: ตอนดูย้อนหลัง booster ที่กำลังจุดเครื่องยนต์กลับบ้านในบรรยากาศ (entry burn หรือ landing burn) ถูกวาดเป็นเส้นตรงระหว่างเฟรม booster ของ Starship ตอนลงที่หอคอยจึงคลาดจากทางจริง 145 m (six-DOF ช่วงยาว 18.4 s)
> - แก้: ชิ้นส่วนที่อยู่ในบรรยากาศที่เฟรมใดเฟรมหนึ่งใช้ cubic ผ่านตำแหน่งและความเร็วของทั้งสองเฟรม ไม่ว่าจะจุดเครื่องหรือไม่ ส่วนที่ไม่เปลี่ยน:
>   - ชิ้นส่วนที่จุดเครื่องเหนือบรรยากาศ (boostback) ยังเป็นเส้นตรง
>   - ชิ้นส่วนที่ไม่จุดเครื่องเหนือบรรยากาศยังใช้ทางของยาน
>   - ชิ้นส่วนที่ลงพื้นระหว่างเฟรม (#195) และช่วงยาวตั้งแต่ 4,000 s (#194) เหมือนเดิม
> - ผล:
>   - Starship จาก 145 m เหลือ 3.0 m
>   - Falcon 9 และ Falcon Heavy ช่วงจุดเครื่องสั้นอยู่แล้ว จากไม่เกิน 0.8 m เหลือ 0.0 m
>   - ครบ 20 ภารกิจ cubic ไม่เคยแย่กว่าเส้นตรง และไม่เคยวิ่งเลยจุดแล้วย้อนกลับ
> - เทสต์: เทสต์ใหม่ 2 ข้อ (entry burn และ landing burn) ล้มบน main และเปลี่ยน assertion เดิม 2 ข้อ (ชิ้นส่วนที่จุดเครื่องในบรรยากาศต้องเป็นเส้นตรง) ตามที่คุณเลือก จึงต้องให้คุณอนุมัติ merge เอง
> - ขนาด: เล็กลง 7 B ต่อ chunk ไม่ได้ขึ้นเพดาน
> - ผลการ merge: คุณอนุมัติ ("Merge เลย (แนะนำ)") merge แล้วเป็น `bc63d8a` (31 ต.ค. 13:34 UTC) และขึ้นเว็บแล้วด้วย Pages run 41206179845 (14:13 UTC) ทุก job ผ่าน 11/11
> - การตรวจโดย agent ตัวที่สอง: ยืนยัน 7 จาก 8 ข้อ ไม่มีข้อที่ขวางการ merge ข้อที่ไม่ยืนยันเป็นเรื่องถ้อยคำ คือมีกรณีขอบหนึ่งที่เปลี่ยนไปด้วย: ชิ้นส่วนที่จุดเครื่องแล้วแตะพื้นตรงเวลาของเฟรมถัดไปพอดี ตอนนี้ใช้ cubic ไปถึงจุดแตะพื้น (ต่างกันไม่เกิน 0.31 m) แก้คำอธิบายแล้ว
> - CI: เทสต์ของ #195 ข้อหนึ่ง (บันทึกเที่ยวบิน Falcon Heavy) ใช้เวลาราว 4–5 วินาที ชิดเพดาน 5 วินาทีของ vitest ทั้งบน main และ branch นี้ รอบแรกจึงหมดเวลา ไม่ได้มาจาก PR นี้ (ดู "CI")

```yaml
item: replay debris blend of a recovery burn in the air (bug fix)
change_kind: bug fix (wrong → right) on the owner's answer; two existing assertions changed (see Tests); no ceiling raised
owner_authorization: 'owner in chat to this session, 2026-10-31, the form question "Recovery burn" (the Deferred question replay-burn-cubic of DECISIONS): "ใช้ cubic ด้วย" (the cubic too); before it, "ดำเนินการส่วนที่ค้างอยู่ให้เรียบร้อย" (carry out what is left)'
app_code: src/physics/frame.ts
tests: tests/debris-replay.test.ts, tests/rigid-replay-arc.test.ts
base_sha_verified_on: {sha: 7cbf802, date: 2026-10-31}
branch: claude/peaceful-planck-uyne6i
pr: 201
merged: {sha: bc63d8a, at: '2026-10-31T13:34:25Z', ci: 41204566209, head: 43d1909, owner_answer: 'Merge เลย (แนะนำ) (2026-10-31, about 13:33Z)'}
published: {pages: 41206179845, at: '2026-10-31T14:13:35Z', sha: bc63d8a}
second_agent_review: 'confirmed 7 of 8 (claim 1 refuted as worded: the s == span boundary, below), no blocking findings (2026-10-31, on 373e10d)'
```

## Cause

#191 put a spent body falling through the air on the cubic `hermite` through both frames' states. It left a body firing its engines (`burning` at either frame) on the straight line, because the task asked not to overshoot a recovery burn and the line cannot. #191's report asked the owner whether to keep that, and the owner chose the cubic.

The line is the wrong shape for a burn as well:
- an entry burn slows a stage by hundreds of metres a second while drag and gravity bend its path;
- a landing burn turns a fast dive into a slow descent onto the pad.

Six-DOF, Starship's booster under its landing burn at the tower was 145 m off its path at the middle of an 18.4 s span.

## Change

In the debris blend of `interpolateFrames` (src/physics/frame.ts):

| case | before | after |
|---|---|---|
| in the air at either end, span under 4,000 s, firing | straight line | the cubic |
| in the air at either end, span under 4,000 s, quiet | the cubic | the cubic |
| above the air at both ends, quiet | vehicle's `path` | vehicle's `path` |
| above the air at both ends, firing (a boostback) | straight line | straight line |
| comes down inside the span (#195) | cubic to the contact | unchanged, except at the boundary below |
| in the air, span of 4,000 s or more (#194) | straight line | unchanged |

**The boundary** (the second agent's finding). A body firing at the earlier frame that comes down exactly at the later frame's instant (`impact.t == b.t`, so `s == span`) misses #195's `s < span` and was on the line; it now takes the cubic to its contact, as #195's "firing or not" says. Six-DOF this is every contact (Super Heavy's catch, the Falcon stages' landings) on 0.01 s spans, a difference of 3.3e-5 m at most; point-mass, untargeted touchdowns on 0.25 s spans, up to 0.31 m.

The code drops `quiet &&` from the cubic's condition and the `quiet` local with it: `(span < 4e3 || s < span) && !out ? hermite(…) : path(…, out && !d.burning && !other.burning)`. The function's doc comment and the inline comment say so.

**Overshoot.** The cubic meets both ends' positions and velocities. It runs past a sample along its chord only where an end's speed exceeds three times the mean speed over the span. That is a sufficient condition when both ends' velocities point forward along the chord. In practice the velocities are inertial, and the Earth's turn (about 380–420 m/s at the launch sites) crosses a landing's vertical velocity, so the ratio stays near 1.
- A burn that slows a stage evenly keeps that ratio under two. The simulation flies its landing burns as a constant deceleration to the ground:
  - the untargeted point-mass burn tracks `vRef = sqrt(2 aRef h) + 2`, down to about 2 m/s (sim/debris.ts);
  - the six-DOF one's `landingCommand` is "a constant deceleration to the ground" (rigid/debris-runtime.ts);
  - the targeted point-mass return lights at a braking height (sim/return-guidance.ts).
- A stage that lands inside the span is #195's case: the cubic to its contact point, then on the ground. That is unchanged.
- A stage's burn could stop it mid-air and leave it hovering there for the rest of a span. That would push the ratio past three, but no recovery profile in the simulation flies it.

## Measured

Probe (gitignored `tests/probe/air-debris.test.ts`, as in [replay-debris-air](replay-debris-air.md)), on this branch. After every `advance(1)` it takes the simulation's debris positions as the truth: every second six-DOF, at step boundaries point-mass. It checks that the shipped `interpolateFrames` returns the cubic on every in-air span of a body alive at both ends, burning or not, and stops otherwise.
- **Six-DOF, the flights that fly stages home:**
  - Starship Flight 5's booster under its landing burn: 145.1 m on the line → 3.0 m on the cubic. Off its path: 144.7 → 2.9 m. 18.4 s span from 626 m to 43 m, ratio 1.01.
  - Falcon 9 (Bandwagon-1, Orbcomm-2, Demo-2) and Falcon Heavy's burning spans are 0.1–1.2 s long: ≤ 0.8 m → 0.0 m.
- **Point-mass, all 20 watch missions:** 61 bodies in the air. The cubic is never further off than the line and never runs back along its chord; the largest ratio is 1.14. Point-mass frames are taken at every step through a burn, so the truth falls inside a burning span only for Falcon Heavy's centre core: 1.6 m → 0.0 m.
- **Synthetic** (the tests below), a Falcon 9 first stage flown tail first (2,400 kg/m²):
  - an entry burn from 65 km at 2 km/s, 30° down, 30 m/s² retrograde, over 20 s: the cubic 1.4 m off at mid-span, the line 1,325 m;
  - a landing burn from 3 km at 250 m/s, 70° down, 18 m/s², over 10 s: 2.0 m against 180 m.
  - With a ballistic coefficient of 400 kg/m², which a stage flown tail first does not have, and 25 m/s² of thrust, a landing burn stops the stage mid-air inside 10 s. There the ratio is 3.18 and the cubic runs past its sample. (With the test's 18 m/s² it is 2.54 over 10 s.)

## Tests

- **New** (tests/debris-replay.test.ts, describe 'a stage under a recovery burn in the air between two recorded frames'): an entry burn and a landing burn, firing at both frames.
  - Each is drawn within 5 m of where it was at mid-span (1.4 m and 2.0 m), and within 5 m of the path flown across the span.
  - It never goes back along the chord or past its end, and never below the later sample's height.
  - On main both fail: 1,325 m and 180 m.
- **Changed**, as the owner's answer asks; both asserted that a firing body in the air keeps the line:
  - tests/debris-replay.test.ts, 'keeps the straight line for a body under its own thrust above the air, and the cubic for one in it' (was '…in the air or out of it'). The in-air firing body is on its arc within 0.01 m (the chord sags 120 m); the one above the air keeps the line.
  - tests/rigid-replay-arc.test.ts, 'leaves a body under its own thrust above the air on the line while the vehicle takes its arc' (was '…in the air or out of it…'). The in-air body is within 1 m of its arc (0.025 m; 1,062 m on main); the one above keeps the line.
- **Related:** every test file that reaches `interpolateFrames`, `FlightRecorder` or the replay player, plus bundle-budget, repo-hygiene, frames-view, rigid-debris, recovery-return, rigid-recovery, recovery-untargeted-events and the files that read the records: 51 files, 844 tests, all pass.
- `node --test tests/verification/change-map.test.mjs tests/verification/workflow-paths.test.mjs`: 20 of 20.
- `npx tsc --noEmit -p .`: clean.

## Size

`npx vite build`, `node scripts/bundle-budget.mjs`: ok, no ceiling raised. On the branch after main `7cbf802` (#196) was merged in, against `7cbf802` built the same way:
- `index-*.js` 2,653,911 B (−7 B on 2,653,918 B), `flight.worker-*.js` 570,621 B (−7 B on 570,628 B);
- precache code 14,678,371 of 14,679,000 B (−14 B; 629 B left).
- The second agent measured the same −7/−7/−14 B on `373e10d` against `e8cc482`.

## CI

- **Run 41202476598 on `373e10d`:** `test (1)` failed on one test, #195's 'draws a recorded Falcon Heavy's centre core and fairings down to where the simulation had them touch, on time', with `Test timed out in 5000ms`; no assertion failed.
  - The test records a whole point-mass Falcon Heavy flight under vitest's default 5 s timeout.
  - Measured locally with the timeout lifted, four runs each, alternating: main `e8cc482` 5,060 / 4,957 / 4,158 / 3,930 ms, this branch 4,453 / 4,673 / 4,124 / 4,319 ms. The second agent measured 3.7 s and 4.2 s, and saw it time out once under load.
  - The same shard passed on main `7cbf802`'s Pages run.
- **The re-run of the failed jobs** stopped before any test ran ("Workflow differs from the verification plan": the repo's verification harness does not take a partial re-run).
- **A merge of main `7cbf802`** (#196) into the branch, `7520dc8`, started a full run.
- **The fix for the test's runtime** (its own timeout, or recording less of the flight) belongs with #195's test and the owner, not this PR. SESSION-PROTOCOL §7 rules out lengthening a timeout as a fix here.

## DECISIONS

The Deferred row `replay-burn-cubic` moves to the "Decided 2026-10-30 and 2026-10-31" section of #191, as a row with the question, the options and the answer "ใช้ cubic ด้วย".

## Second-agent review

Done on `373e10d`, review only (no edits). It ran main's `interpolateFrames` (`e8cc482`) beside the branch's, on deep-frozen frames recorded from five point-mass recovery flights (Falcon 9 ×3, Falcon Heavy, Starship), the same Falcon flights without a recovery plan (untargeted), and six-DOF Starship, Orbcomm-2 and Falcon Heavy.

1. **Only the intended bodies change:** REFUTED as worded, non-blocking. On the five targeted point-mass flights (186,289 calls), nothing changes outside the intended bodies' `r`/`v`. The exception is the `s == span` boundary above: six-DOF at every contact on 0.01 s spans (3.3e-5 m at most), and untargeted point-mass touchdowns on 0.25 s spans (up to 0.31 m). The table row is corrected.
2. **Burning in-air spans get exactly `hermite`,** bit-identical to a verbatim copy (18,630 point-mass and 35,211 six-DOF body-samples), meeting both samples at u = 1: CONFIRMED.
3. **Never further off than the line:** CONFIRMED.
   - Six-DOF Starship: 145.11 → 2.96 m, ratio 1.009, on 816 burning in-air spans.
   - Six-DOF Orbcomm-2: 0.09 → 0.01 m. Six-DOF Falcon Heavy: 0.48 → 0.02 m.
   - Point-mass Falcon Heavy centre core: 1.59 → 0.00 m.
   - Untargeted point-mass: largest ratio 1.089.
   - The cubic never ran back and never dipped below the lower sample.
4. **Landing burns are a constant deceleration:** CONFIRMED by reading the code.
   - Untargeted point-mass: `vRef`, bang-bang with 4 m/s hysteresis.
   - Targeted point-mass: lights at 1.1 × the braking height + 10 m, never more thrust than the demand.
   - Six-DOF `landingCommand`: the same law, down to 2 m/s.
   - With the Earth's turn in the inertial velocity, the ratio stays about 1.3 at most even if a stage stops or hovers. Only a boostback-sized reversal inside one span could pass 3.
5. **Purity and cloning unchanged:** CONFIRMED.
6. **The tests:** CONFIRMED.
   - On main, 4 fail for the right reason: 1,324.84 and 180.20 m against 5 m; 120.21 m against 0.01 m; 1,061.87 m against 1 m.
   - 35 of 35 pass on the branch.
   - Margins: 1.36 and 2.03 m mid-span, 0.88 and 0.40 m off the path, 0.00068 and 0.0253 m on the changed assertions.
7. **Type check and size:** CONFIRMED, −7/−7/−14 B.
8. **The report's numbers:** CONFIRMED, with overstatements, all now corrected:
   - Starship's span runs from 626 m to 43 m, not "1 to 0 km";
   - Orbcomm-2's fairings were quiet and already on the cubic, so the line was removed;
   - the 400 kg/m² ratio of 3.18 needs 25 m/s², not the test's 18 m/s²;
   - "the only burning span with any error" is "the only one where the truth falls inside";
   - the `s == span` row;
   - the ratio rule assumes forward end velocities.

Also non-blocking:
- The new describe had been inserted between #195's comment and its describe; it is moved.
- The pre-existing borderline test is in "CI" above.
- A residual gap: a stop-and-climb inside one span (only a failed landing, for example with an engine out) could make the cubic dip below the lowest point the stage reached. It was 0 on every flight.
- Adversarial cases, all measured:
  - burning at one end only: 0.52 m where the line was 29.35 m;
  - a burning body crossing 140 km is treated as in the air: 0.001 m where the line was 117 m;
  - boostbacks below 140 km: 0.1–0.25 s spans, ratio ≤ 1.016.

**Verdict: confirmed 7 of 8**, the eighth refuted as worded and now corrected.

## Not changed, for later

- **A burn that stops a stage mid-air** for part of a span would make the cubic run past its sample (the 400 kg/m² case above), and a stop-and-climb (a failed landing, for example with an engine out) could make it dip below the lowest point the stage reached. No recovery profile in the simulation flies either on purpose; the dip was 0 on every flight.
- **#195's recorded Falcon Heavy test** runs at the edge of vitest's default 5 s timeout ("CI" above).
- **A boostback above 140 km** keeps the line. On the watch missions those spans are under a second (Falcon Heavy's side boosters at 123–124 km are in the air by this definition and take the cubic: 0.1 m → 0.0 m).
