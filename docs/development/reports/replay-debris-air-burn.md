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
> - การตรวจโดย agent ตัวที่สอง: ดูหัวข้อ "Second-agent review"

```yaml
item: replay debris blend of a recovery burn in the air (bug fix)
change_kind: bug fix (wrong → right) on the owner's answer; two existing assertions changed (see Tests); no ceiling raised
owner_authorization: 'owner in chat to this session, 2026-10-31, the form question "Recovery burn" (the Deferred question replay-burn-cubic of DECISIONS): "ใช้ cubic ด้วย" (the cubic too); before it, "ดำเนินการส่วนที่ค้างอยู่ให้เรียบร้อย" (carry out what is left)'
app_code: src/physics/frame.ts
tests: tests/debris-replay.test.ts, tests/rigid-replay-arc.test.ts
base_sha_verified_on: {sha: e8cc482, date: 2026-10-31}
branch: claude/peaceful-planck-uyne6i
second_agent_review: (below)
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
| comes down inside the span (#195) | cubic to the contact | unchanged |
| in the air, span of 4,000 s or more (#194) | straight line | unchanged |

The code drops `quiet &&` from the cubic's condition and the `quiet` local with it: `(span < 4e3 || s < span) && !out ? hermite(…) : path(…, out && !d.burning && !other.burning)`. The function's doc comment and the inline comment say so.

**Overshoot.** The cubic meets both ends' positions and velocities. It runs past a sample only where an end's speed exceeds three times the mean speed over the span.
- A burn that slows a stage evenly keeps that ratio under two. The simulation flies its landing burns as a constant deceleration to the ground:
  - the untargeted point-mass burn tracks `vRef = sqrt(2 aRef h) + 2`, down to about 2 m/s (sim/debris.ts);
  - the six-DOF one's `landingCommand` is "a constant deceleration to the ground" (rigid/debris-runtime.ts);
  - the targeted point-mass return lights at a braking height (sim/return-guidance.ts).
- A stage that lands inside the span is #195's case: the cubic to its contact point, then on the ground. That is unchanged.
- A stage's burn could stop it mid-air and leave it hovering there for the rest of a span. That would push the ratio past three, but no recovery profile in the simulation flies it.

## Measured

Probe (gitignored `tests/probe/air-debris.test.ts`, as in [replay-debris-air](replay-debris-air.md)), on this branch. After every `advance(1)` it takes the simulation's debris positions as the truth: every second six-DOF, at step boundaries point-mass. It checks that the shipped `interpolateFrames` returns the cubic on every in-air span of a body alive at both ends, burning or not, and stops otherwise.
- **Six-DOF, the flights that fly stages home:**
  - Starship Flight 5's booster under its landing burn: 145.1 m on the line → 3.0 m on the cubic. Off its path: 144.7 → 2.9 m. 18.4 s span from 1 to 0 km, ratio 1.01.
  - Falcon 9 (Bandwagon-1, Orbcomm-2, Demo-2) and Falcon Heavy's burning spans are 0.1–1.2 s long: ≤ 0.8 m → 0.0 m.
  - Orbcomm-2's fairings fall in 13.4 s spans now that #198 records a falling stage every 5 s: 18 m → 0.1 m.
- **Point-mass, all 20 watch missions:** 61 bodies in the air. The cubic is never further off than the line and never runs back along its chord; the largest ratio is 1.14. The only burning span with any error is Falcon Heavy's centre core: 1.6 m → 0.0 m.
- **Synthetic** (the tests below), a Falcon 9 first stage flown tail first (2,400 kg/m²):
  - an entry burn from 65 km at 2 km/s, 30° down, 30 m/s² retrograde, over 20 s: the cubic 1.4 m off at mid-span, the line 1,325 m;
  - a landing burn from 3 km at 250 m/s, 70° down, 18 m/s², over 10 s: 2.0 m against 180 m.
  - With a ballistic coefficient of 400 kg/m², which a stage flown tail first does not have, a landing burn stops the stage mid-air inside 10 s. There the ratio is 3.18 and the cubic runs past its sample.

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

`npx vite build`, `node scripts/bundle-budget.mjs`: ok, no ceiling raised. Against main `e8cc482` built the same way:
- `index-*.js` 2,654,031 B (−7 B on 2,654,038 B), `flight.worker-*.js` 570,741 B (−7 B on 570,748 B);
- precache code 14,678,611 of 14,679,000 B (−14 B; 389 B left).

## DECISIONS

The Deferred row `replay-burn-cubic` moves to the "Decided 2026-10-30 and 2026-10-31" section of #191, as a row with the question, the options and the answer "ใช้ cubic ด้วย".

## Second-agent review

(pending)

## Not changed, for later

- **A burn that stops a stage mid-air** for part of a span would make the cubic run past its sample (the 400 kg/m² case above). No recovery profile in the simulation flies it.
- **A boostback above 140 km** keeps the line. On the watch missions those spans are under a second (Falcon Heavy's side boosters at 123–124 km are in the air by this definition and take the cubic: 0.1 m → 0.0 m).
