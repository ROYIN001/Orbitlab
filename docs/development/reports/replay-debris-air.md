# Replay: spent stages falling through the air on their path between frames / ชิ้นส่วนที่ตกผ่านบรรยากาศอยู่บนเส้นทางจริงระหว่างเฟรม

> **สรุปสำหรับเจ้าของ (ภาษาไทย)**
>
> - ปัญหา: ตอนดูย้อนหลังหรือเลื่อนเวลา ชิ้นส่วนที่ตกผ่านบรรยากาศ (ต่ำกว่า 140 km) ระหว่างที่ยานอยู่ในวงโคจร ถูกวาดเป็นเส้นตรงระหว่างเฟรมที่บันทึกไว้ ซึ่งห่างกัน 10–30 s แรงต้านอากาศทำให้ทางของมันโค้งและช้าลงหลาย km/s ภายในช่วงเดียว เส้นตรงจึงคลาดมาก วัดเทียบกับตำแหน่งจริงของการจำลองทุก 1 วินาที (six-DOF): Blok A ของ Soyuz-2.1a คลาด 4.5 km, ท่อนแรกของ H-IIA 6.8 km, booster ของ Sputnik 10.5 km
> - แก้: ชิ้นส่วนที่ยังอยู่ทั้งสองเฟรม ไม่จุดเครื่องยนต์ทั้งสองเฟรม และอยู่ในบรรยากาศที่เฟรมใดเฟรมหนึ่ง ใช้ cubic (`hermite`) ผ่านตำแหน่งและความเร็วของทั้งสองเฟรม ส่วนอื่นเหมือนเดิมทั้งหมด:
>   - ชิ้นส่วนที่ลอยอยู่เหนือบรรยากาศใช้ทางเดียวกับยาน
>   - ชิ้นส่วนที่จุดเครื่องยนต์ (boostback, entry burn, landing burn) ใช้เส้นตรง
>   - ชิ้นส่วนที่ตกถึงพื้นหรือไหม้หมดระหว่างเฟรมค้างไว้ที่เฟรมแรก
>   - ชิ้นส่วนที่อยู่บนพื้นหมุนไปกับโลก
> - ผล (six-DOF):
>   - Blok A 4.5 km → 0.39 km
>   - H-IIA 6.8 km → 0.70 km
>   - Sputnik 10.5 km → 2.3 km
>   - ระยะห่างจาก "เส้นทาง" ที่บินจริง เหลือ 0.3–0.7 km (เส้นตรงห่าง 2.6–5.5 km) ที่เหลือส่วนใหญ่เป็นเวลา คือวาดเร็วหรือช้ากว่าจริงไปตามเส้นทางเดียวกัน ในช่วงที่ booster ชะลอจาก 2.3 เหลือ 0.3 km/s ภายในเฟรมเดียว
> - แบบ point-mass วัดครบ 20 ภารกิจ ชิ้นส่วนที่ตก 62 ชิ้น cubic ไม่เคยแย่กว่าเส้นตรง ไม่เคยวิ่งย้อนกลับ และไม่เคยลงต่ำกว่าเฟรมที่ต่ำกว่า ยกเว้นตรงที่ชิ้นส่วนเองลงต่ำกว่าจริง เช่น ท่อนแรกของ H-IIA ที่เชิดขึ้นจาก 43 เป็น 51 km
> - การบันทึกที่ยาวจนถูก thin หนัก (บังคับด้วยงบเฟรม 800): ทั้งสองแบบคลาดมาก แต่ cubic ใกล้ความจริงกว่าเส้นตรงเสมอ มีครั้งเดียวที่ cubic วิ่งเลยแล้วย้อนกลับ 1.4 km ในช่วง 140 s (Blok A ที่ 18 km เทียบกับเส้นตรงที่ 69 km)
> - เทสต์: 6 เทสต์ใหม่ (5 อันล้มบน main) และเปลี่ยน assertion เดิม 1 ข้อ: ชิ้นส่วนในบรรยากาศที่ "ต้องเป็นเส้นตรง" เปลี่ยนเป็นชิ้นส่วนที่จุดเครื่องยนต์ในบรรยากาศ เพราะพฤติกรรมเดิมคือสิ่งที่งานนี้แก้ จึงไม่เข้าเงื่อนไขอนุมัติถาวรสำหรับบั๊ก (ห้ามเปลี่ยน assertion) ต้องให้เจ้าของกดเอง
> - ขนาด: +19 B และ +20 B ต่อ chunk ไม่ได้ขึ้นเพดาน precache code เหลือ 59 B ถ้า merge #187 ด้วยจะเหลือ 9 B
> - การ merge กับ #187: ขัดกัน (conflict) แค่ที่ข้อความ doc comment และเทสต์ของ #187 ข้อหนึ่ง (`tests/rigid-replay-arc.test.ts`) ต้องเปลี่ยนแบบเดียวกัน (ใส่ `burning: true`) ใครที่ merge ทีหลังต้องแก้
> - การตรวจโดย agent ตัวที่สอง: ดูหัวข้อ "Second-agent review"

```yaml
item: replay debris blend through the air between recorded frames (bug fix)
change_kind: bug fix (wrong → right); one existing assertion changed (see Tests); no ceiling raised
owner_authorization: 'owner in chat to this session, 2026-10-30: "Task: draw a debris body falling through the air between two frames close to the path it flew, without overshooting an impact … or a recovery burn"; "ทำต่อ" (continue)'
app_code: src/physics/frame.ts
tests: tests/debris-replay.test.ts
base_sha_verified_on: {sha: 1842a86, date: 2026-10-30}
branch: claude/peaceful-planck-uyne6i
pr: 191
second_agent_review: (below)
```

## Cause

`interpolateFrames` (src/physics/frame.ts) draws each spent body alive at two recorded frames between them:
- a body coasting out of the air (nothing firing at either end, above 140 km at both) the vehicle's way, `path` (#185);
- anything else on the straight line between its two samples.

While the vehicle coasts in orbit the recorder keeps a frame every 10–30 s (`interval()`, src/replay/recorder.ts), 60 s once thinned and more under hard thinning. A stage coming down through the air in that time is slowed by kilometres a second inside one span (a Sputnik booster from 2.3 to 0.3 km/s in 30 s), and its path bends from a shallow dive to a steep fall. The chord between two samples is the wrong shape for that, and is not where the body was at any instant between them.

## Change

In the debris blend (`interpolateFrames`, the `a.debris.map`), with `quiet = !d.burning && !other.burning`:
- **Quiet and in the air at either end** (`norm(r) <= AIRLESS_RADIUS` at either frame): the cubic `hermite(d.r, d.v, other.r, other.v, u, span)` through both frames' positions and velocities.
- **Otherwise** `path(d.r, d.v, other.r, other.v, quiet)`: the vehicle's way for a quiet body above the air at both ends (as before), the straight line for a body firing its engines (as before).

The same blend draws a live point-mass flight between its step boundaries (`FlightRecorder.liveBetween`; steps of up to 30 s in orbit, docs/PHYSICS.md), so a stage falling there while the vehicle coasts is drawn on its path in the live view too.

Not changed: the branches that run first. A body lying on the ground in both frames turns with the Earth (`turnWithEarth`); a body that is missing, not alive at either end, or changed its rigid configuration is held at the earlier frame; the vehicle's own blend.

`AIRLESS_HEIGHT = 140e3`, compared as `norm(r) - R_EARTH > AIRLESS_HEIGHT`, becomes `AIRLESS_RADIUS = R_EARTH + 140e3`, compared as `norm(r) > AIRLESS_RADIUS`. The result is the same for every finite position: for `norm(r)` between R/2 and 2R the subtraction is exact (Sterbenz), and outside that range both are false (below) or true (above) by millions of metres. It saves 16 B in each chunk, which is what lets the change fit beside #187 (see Size).

Comments: the inline comment at the blend, and one sentence of the function's doc comment ("anything else in a straight line" → the cubic for a body falling through the air, the line for one firing its engines).

## The cubic against the cases the task named

**Drag-dominated entry.** The cubic meets both ends' positions and velocities. Its velocity between them is a quadratic, so it can overshoot, running past the later sample along the chord and back, only when the speed at an end exceeds three times the mean speed over the span: `max(|va|, |vb|)·span > 3·|chord|`.
- In the drag pulse the body loses most of its speed early, so this is the case to check.
- In every watch mission, point-mass and six-DOF, the largest ratio is 2.41 (a six-DOF Sputnik booster: 2,285 → 253 m/s in 30 s). The cubic never runs back.
- Its remaining error there is timing along the path rather than distance from it. In the test's fitted fall of a Sputnik booster, the cubic is 1,083 m behind where the body was at mid-span but 1.6 m off the path (the line: 8.6 km and 527 m).
- Six-DOF bodies fly with their own attitude and aerodynamics, and their paths curve more: the H-IIA first stage pulls up from 43 to 51 km inside one span. There the cubic is 0.3–0.7 km off the path, against the line's 2.6–5.5 km.

**An impact.** A body that lands or burns up between two frames is not alive at the later one, and the blend holds it at the earlier sample, as before. The cubic never sees it. Measured on every span: the cubic never draws a body below the lower of its two samples, except where the flight itself went lower:
- the H-IIA pull-up, 1,471 m against the flight's 1,415 m;
- two Sputnik boosters at 26 km, 52 m against 50 m and 37 m against 14 m.

**A recovery burn.** A body with `burning` at either end keeps the straight line, unchanged. Recovery burns start on events the recorder pins frames to: `evt.boostbackStart`, `evt.entryBurnStart`, `evt.landingBurnStart`. So the spans in and around a burn have `burning` at one end. The longest burning span in the air in the watch missions is Starship's booster at the tower, 18.4 s; the line is 145 m off there, and the cubic would be 3 m (ratio 1.01). It is left on the line, as the task asks; see "Not changed".

**The ground case.** A body on the ground at both frames that moved (carried round with the Earth) takes `turnWithEarth`, which runs before the cubic and is exact. The cubic would be wrong there: a body at rest in tests/vostok-render.test.ts carries zero velocity, and the cubic through zero tangents eases in and out along the chord instead of turning. So it must not reach those bodies, and it does not: it runs only for bodies alive at both ends. A body alive and slow near the ground (Gagarin under his canopies, the Vostok-1 instrument module's pieces, with inertial velocities of 320–400 m/s from the Earth's turn) takes the cubic, which is within 0.1 m of the flight there (the line: up to 4.6 m).

## Measured

Probe (gitignored `tests/probe/air-debris.test.ts`). Each watch mission was built as the app builds it (`watchMissionSettings`, from 2026-09-22) and recorded through `FlightRecorder.advance(1)`, past orbit insertion until the falling bodies were down. Every second it took the simulation's own debris positions as the truth. For every in-air sample of a body alive at both ends of its span, it compared the line and the cubic with the truth. Two measures:
- **from its place:** distance from where the body was at that instant;
- **off its path:** distance from the polyline through the flight's samples in that span.

The probe checks that the shipped `interpolateFrames` returns the cubic for every quiet body and the line for every burning one (otherwise it stops), so the "after" figures are the shipped code's.

Six-DOF (`defaultDynamics`), worst sample per body:

| body | from its place, line → cubic | off its path, line → cubic | span, heights |
|---|---|---|---|
| Soyuz-2.1a Blok A | 4,473 → 390 m | 2,621 → 316 m | 20 s, 49 → 36 km |
| H-IIA first stage | 6,770 → 704 m | 3,687 → 492 m | 30 s, 72 → 43 → 51 km |
| Sputnik boosters (4) | 8,207–10,458 → 1,102–2,274 m | 3,936–5,524 → 313–679 m | 30 s, 41 → 17–26 km |
| Electron first stage | 869 → 78 m | 701 → 78 m | 10 s, 20 → 16 km |
| Electron fairings | 913–990 → 36–39 m | 749–792 → 32–35 m | 20 s, 38 → 33 km |
| Falcon 9 fairings (Bandwagon, Orbcomm-2) | 126–144 → 3–4 m | 130–132 → 2.2–2.3 m (Orbcomm-2) | 31–33 s, 23 → 20 km |
| H-IIA fairings | 41 → 0.5 m | 40 → 0.4 m | 30 s |
| Soyuz-2.1a boosters, fairings | 8–16 → 0.0–0.3 m | 10–14 → 0.0–0.3 m | 20 s, below 11 km |
| Angara A5 URM-1 core | 28 → 0.1 m | | 30 s, 4 → 2 km |
| Starship booster at the tower, burning | 145 m (line, unchanged; the cubic would be 3 m) | 145 m (the cubic: 2.9 m) | 18.4 s, 1 → 0 km |

Falcon 9's and Falcon Heavy's returning stages come down while the upper stage still burns: dense frames, under 3 m either way.

Point-mass, all 20 watch missions (Vostok-1 flown to T+6,629 s for its return), 62 bodies in the air:
- the cubic is never further from the truth than the line, never runs back, and the largest ratio is 2.14;
- Apollo 11's S-II: 12,615 → 708 m (off its path 948 → 33 m);
- the H-IIA first stage: 10,707 → 496 m (939 → 79 m);
- Sputnik's boosters: 9,237–9,836 → 888–1,318 m (1,577 → 231–290 m), on a 38.5 s span;
- Soyuz 18a's boosters and fairings: 724–728 → 14–19 m (10 s spans);
- Vostok-1's Blok A: 537 → 30 m, and its return's pieces, hatch, seat and pilot: up to 4.6 → 0.1 m;
- with the rendezvous flown (Soyuz MS-16, MS-25, the docking flight), Blok A falls during 30 s rendezvous frames: 11,933 → 1,454 m (off its path 499 → 59 m).

**Hard thinning.** Point-mass recordings stayed under their 12,000-frame budget even over two days (MS-25 with its rendezvous: 9,602 frames, no thinning). A six-DOF recording (6,000 frames) of a long mission does overflow, and its coast frames are then thinned without a limit. To reach that, the probe forced budgets of 3,000, 1,500 and 800 frames on point-mass Soyuz MS-25 (with its rendezvous, to 180,000 s), Sputnik, H-IIA and Apollo 11. The falling bodies' spans grew to 60–470 s.
- Both blends are far off there, and the cubic is closer than the line on every body. Examples: Sputnik's boosters on a 231 s span, 96 km → 48 km; Apollo's S-II on 470 s, 711 km → 331 km; H-IIA on 200 s, 204 km → 68 km.
- It never draws a body below the lower of its two samples.
- Once it runs back along its chord: MS-25's Blok A at the 800-frame budget, a 140 s span from 50 to 1 km and 4,366 to 314 m/s (ratio 3.99). It runs 1.4 km back near the end of the span, while 18 km from the truth against the line's 69 km.
- A guard on the span or the ratio would put such spans back on the line, which is further off, so none was added.

## Tests

`tests/debris-replay.test.ts`, 11 tests (5 existing, 6 new). New:
- **Three falls at mid-span:** Blok A, the H-IIA first stage, and a Sputnik booster in its drag pulse. Each is flown with gravity and drag (exponential atmosphere; ballistic coefficient and dive angle fitted to the six-DOF spans' end states, within 0.3 km and 50 m/s) beside the spacecraft coasting in orbit. At mid-span the drawn stage must be within **30 m of the path it flew** (8.3, 23.2 and 1.6 m), and within 25 m, 800 m and 1,300 m of where it was (9, 659 and 1,083 m). The line is 464, 1,046 and 527 m off the path and 3.2, 2.8 and 8.6 km from the place. The vehicle stays on its Kepler arc.
- **The drag pulse, every second:** within 30 m of the path (12.5 m at most). The drawn body never goes back along the chord or past its end, nor below the later sample's height. Both ends are met in position and velocity. The inputs are untouched.
- **A body that comes down between two frames** is held at its earlier sample (a guard; passes on main too).
- **A recorded point-mass H-IIA:** the first stage, every second of its fall through the air (120 samples), within 600 m of where the simulation had it (496 m). The line was 10.7 km.

**Failing first:** on main's frame.ts, 5 of the 6 new tests fail: 464, 1,046 and 527 m off the path at mid-span, 46 m off it in the drag pulse, and 10,707 m on the recorded H-IIA. With the fix 11 of 11 pass.

**One existing assertion changed.** 'keeps the straight line for a body in the air or under its own thrust' asserted that a quiet body at 60 km stays on the line, which is the behaviour this task changes. The body is now `burning: true`, and the test is 'keeps the straight line for a body under its own thrust, in the air or out of it'. It still asserts the line for a firing body, in the air (an entry or landing burn) and above it (a boostback). Because an assertion changed, this PR is not covered by the standing bug-fix approval (SESSION-PROTOCOL §1) and waits for the owner.

**Related files:** every test file that reaches `interpolateFrames`, `FlightRecorder` or the replay player, plus bundle-budget, repo-hygiene, frames-view, rigid-debris and recovery-return. 43 files, 772 tests, all pass. `npx tsc --noEmit -p .` is clean.

## Merging with #187

#187 (a six-DOF vehicle on its arc, open) changes the same function. A trial merge of #187 into this branch (main + both):
- **Conflict:** the doc comment only. #187 moves it from above `blendAbort` to the function, and this branch edits one sentence of it. Resolve by taking #187's moved comment and applying the sentence. The code merges cleanly.
- **One #187 test fails:** `tests/rigid-replay-arc.test.ts` 'leaves a body in the air, or under its own thrust, on the line while the vehicle takes its arc' asserts the old in-air line, like the assertion changed here. Whichever PR merges second sets its in-air body (`LOW`) to `burning: true`, as here. Every other test in both files passes.
- **Size:** precache code 14,653,991 of 14,654,000 B with both (9 B left).

## Size

`npx vite build`, `node scripts/bundle-budget.mjs`: ok, no ceiling raised.
- `index-*.js` 2,634,861 B (+19 B on main's 2,634,842 B), `flight.worker-*.js` 570,498 B (+20 B on 570,478 B).
- Precache code 14,653,941 of 14,654,000 B (+39 B; 59 B left). With #187 too: 14,653,991 B (9 B left).
- The first version, which kept the height comparison, was +33 B per chunk (66 B, 32 B left on main) and would have been 18 B over the ceiling with #187. The distance comparison brought it to +19/+20 B.

## Second-agent review

(pending)

## Not changed, for later

- **A body firing its engines in the air keeps the line.** Starship's booster under its landing burn at the tower is 145 m off on an 18.4 s span; the cubic would be 3 m (ratio 1.01). The task asked not to overshoot a recovery burn, and the line cannot, so it was kept. The fleet's burning spans in the air are all short (18.4 s at most) and never near the overshoot ratio. This is a question for the owner:
  1. **Keep the line (as now).** Safe by construction; 145 m at Starship's catch.
  2. **The cubic for burning bodies too.** 3 m there; it overshoots only past a ratio of 3, which the sim's burns (constant-deceleration landing burns, a ratio of 2 at most) do not reach.
- **A body landing between frames is held at its earlier sample** for the whole span, then appears on the ground: up to 30 s hanging in the air when the vehicle's frames are sparse. Unchanged here ("the blend already handles" it). Blending to the impact point would need the impact time.
- **The drag pulse's timing:** the cubic draws a Sputnik booster up to about 1 km (point-mass) to 2 km (six-DOF) ahead of or behind its place along its path. A frame or two kept around a falling body's peak deceleration, or the debris's acceleration recorded at each frame (a quintic), would close it. Both cost bytes or frames.
- **Hard-thinned recordings:** spans of minutes leave both blends kilometres off and can make the cubic run back along its chord (1.4 km in one forced case). Keeping falling bodies' frames from being thinned, as event frames are, would fix both.
