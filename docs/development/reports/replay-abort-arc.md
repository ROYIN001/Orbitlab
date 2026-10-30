# Replay: an escape or a capsule's return on its arc between frames / การหนีภัยและแคปซูลที่กลับสู่โลกอยู่บนวิถีระหว่างเฟรม

> **สรุปสำหรับเจ้าของ (ภาษาไทย)**
>
> - ปัญหา: ตอนดูย้อนหลังหรือเลื่อนเวลา (replay/seek) ยานที่อยู่ในสถานะ 'abort' ถูกวาดเป็นเส้นตรงระหว่างเฟรมที่บันทึกไว้เสมอ สถานะนี้คือการหนีภัยของ Soyuz และแคปซูลที่บินกลับสู่โลก (Mercury ของ MR-3 และ Vostok-1) เหนือบรรยากาศ (สูงกว่า 140 km) เฟรมห่างกัน 10 s เส้นตรงจึงอยู่ต่ำกว่าวิถีจริง gΔt²/8:
>   - MR-3: 117 m และ 128 m ขณะจรวดถอยหลัง (retro-rockets) ทำงาน
>   - Soyuz 18a: 117 m
>   - Vostok-1 (เฟรมห่าง 2 s): 4.7 m
> - คำถามของงาน: ช่วงไหนใช้ cubic (hermite) ได้อย่างปลอดภัย และช่วงไหนต้องคงเส้นตรง
> - ตรวจแล้ว: ความเร็วที่เปลี่ยนแบบกระโดดทุกครั้งในการหนีภัยตรงกับเฟรมของเหตุการณ์ (event) หรือเป็นการเปลี่ยนตัวยาน ซึ่งตรึงเฟรมแรกไว้อยู่แล้ว ยกเว้นหนึ่งกรณี:
>   - ทรงกลมของ Vostok หยุดนิ่งบนพื้น (ความเร็วกลายเป็นความเร็วของพื้นที่หมุนไปกับโลก) หลังเหตุการณ์ลงพื้นหนึ่งก้าว ซึ่งไม่ตรงกับเฟรมใด
>   - สิ่งที่เหลือภายในช่วงระหว่างเฟรม คือจรวดถอยหลังดับ ร่มกาง ร่มหลักคลายจากการรัด (reefing) และแรงต้านอากาศ เปลี่ยนแค่ความเร่ง ไม่ใช่ความเร็ว cubic ตามได้ใกล้กว่าเส้นตรง
> - แก้: เฟรม 'abort' นับเป็นการ coast ระหว่างที่ยังบินอยู่ จึงได้ cubic เหมือนยาน six-DOF ใน #187 ยกเว้นตอนอยู่บนพื้น (phase 'landed') ซึ่งคงเส้นตรง ช่วงแรกบนพื้น cubic จะคลาด 8.2 m ส่วนเส้นตรงคลาด 0.066 m
>   - ร่ม (drogue, main ขณะกางและขณะรัด), มอเตอร์หนีภัย, จรวดถอยหลัง, คู่ยานของ Vostok ที่ยึดกันด้วยสายเคเบิล: ได้ cubic ทั้งหมด วัดแล้วใกล้กว่าเส้นตรงทุกจุด
>   - หอหนีภัยแยกออก (แคปซูลออกจากส่วนหัว): เป็นการเปลี่ยนตัวยาน ตรึงเฟรมแรกไว้เหมือนเดิม
> - ผล: วัด 5 ภารกิจ (MR-3, Soyuz 18a, MS-10, T-10-1, Vostok-1) ทั้ง six-DOF และ point-mass เทียบกับตำแหน่งจริงของการจำลองทุกก้าว:
>   - MR-3 เหนือบรรยากาศ 117 m → 0.001 m และขณะจรวดถอยหลังทำงาน 128 m → 2.3 m
>   - 18a 117 m → 0.000 m และในอากาศ (เฟรมห่าง 0.8 s หลังการ thin) 13 m → 0.19 m
>   - Vostok-1 4.7 m → 0.000 m
>   - ไม่มีจุดใดคลาดมากกว่าเดิมเกิน 1 cm ทั้ง 666,616 จุดของตัวยาน และ 258,450 จุดของชิ้นส่วนที่ลอยอยู่ข้างๆ
> - ตัวเลขในงาน "ในอากาศ 117 m (cubic ราว 8 m)" วัดซ้ำไม่ได้ ที่วัดได้คือช่วงที่ข้ามระดับ 140 km 117 m → 0.001 m และช่วงที่อยู่ในอากาศทั้งช่วง (≤ 2 s) 13 m → 0.34 m
> - ขนาด: +10 B ต่อ chunk (index และ flight.worker) precache code เหลือที่ว่าง 28 B ไม่ได้ขึ้นเพดาน เขียน `coasting` เป็นตารางตามสถานะเพื่อให้พอ
> - การ merge: เป็นการแก้บั๊ก (ผิด → ถูก) มีเทสต์ที่ fail ก่อนแก้ (11 จาก 16) ไม่ได้ขึ้นเพดาน ไม่ได้เปลี่ยน assertion เดิม PR นี้ต่อจาก #187 ซึ่งยังไม่ merge จึงต้อง merge #187 ก่อน
> - ยังไม่แก้ (งานต่อไป): ทรงกลมบนพื้นอาจหมุนไปกับโลกได้ตรง (`turnWithEarth`, คลาด 0.000 m แทน 0.066 m) แต่ไม่มีที่ว่างในงบขนาด; ชิ้นส่วนที่ลอยอยู่ในวงโคจรระหว่างที่ทรงกลมรออยู่บนพื้นยังเป็นเส้นตรงตามตัวยาน (29 m)

```yaml
item: replay blend of an escape or a capsule's return between recorded frames (bug fix)
change_kind: bug fix (wrong → right); no existing assertion changed, no ceiling raised
owner_authorization: 'owner to this session, 2026-10-30: "Task: decide which ''abort'' spans can safely take the cubic (or another arc) and which must keep the line"; later the same day: "ทำต่อ" (continue)'
app_code: src/physics/frame.ts
tests: tests/abort-replay-arc.test.ts (new)
base_sha_verified_on: {sha: fa92cf6, date: 2026-10-30, note: 'the head of PR #187, which this branch is stacked on; #187 is on main 1842a86'}
branch: claude/gracious-sagan-zvg16a
pr: to be opened (stacked on #187)
second_agent_review: 'see "Second-agent review"'
```

## The question

The task: frames with status 'abort' never count as coasting in `interpolateFrames` (src/physics/frame.ts), so every abort span is drawn on the straight line between its two frames. That status covers a launch escape (Soyuz's, `LaunchEscape.begin`) and a capsule's flight home (Mercury's on MR-3, Vostok-1's from orbit, `beginReturn`), both flown by `EscapeFlight` (src/physics/rigid/escape.ts). The recorder keeps an escape's frame every 0.1 s in the air and every 10 s above 140 km (`interval()`, src/replay/recorder.ts). Vostok's return has its own cadence (`vostokInterval`): 1 s through the retro-fire, 2 s above 100 km, 0.25–0.5 s lower, 1 s under the open main, and 5 s on the ground.

Which abort spans can take the cubic `hermite` through both frames' states, which PR #187 gave a six-DOF coast, and which must keep the line? The candidates named in the task:
- a parachute deploying (drogue, main, reefed stages);
- the escape tower's jettison;
- the retro-rockets firing (`abort.motors`);
- the cables between Vostok's sphere and its instrument module;
- a landing.

The cubic meets both frames' positions and velocities. It follows any acceleration that is smooth across the span. What it cannot follow is a velocity that jumps inside the span: that costs it up to 0.148·Δv·T, and more than the line where the jump is near an end. So the question is whether every velocity change in an abort is pinned to a frame. The recorder stores the frames on both sides of any step that emits an event, so an event's span is one step long.

## What changes an escape's velocity, and whether a frame is there

Read from `EscapeFlight` (`step`, `sequence`, `tduSequence`, `freeCapsule`, `touchdown`, `observe`, `loads`, `throughHatch`) and `LaunchEscape` (`begin`, `beginReturn`, `step`, `sync`, `rest`).

**Jumps of the velocity or the position:**

| What | Where | At a frame? |
|---|---|---|
| The springs' 1 m/s when the spacecraft leaves the rocket (18a) | `EscapeFlight` constructor | Before the first abort frame. The span into the abort changes status, which keeps its old blend. |
| The descent module leaving the head section, with the tower in a tower abort, or the other modules: its CG, a 2 m/s drop, the flip | `freeCapsule` | `evt.escapeCapsule`, and the body changes (`configurationId` `escape.head(.fins)` or `escape.spacecraft` → `escape.capsule`), so the span holds the earlier frame |
| The fins opening (the head's configuration) | `sequence` | `evt.escapeFins`, and the `configurationId` changes: held |
| Coming to rest on the ground: the velocity becomes the ground's turning, ω×r | `LaunchEscape.step` → `rest()` | **No.** It happens a step after the step that emits the landing event. |

Vostok's instrument module leaving (`evt.vostokSeparation`), its hatch (`evt.hatchOff`) and Gagarin's seat (`evt.ejection`), and Mercury's retropack (`evt.retroPackOff`) change the mass and the configuration, not the state: `throughHatch` leaves the seat's push on the sphere out, and the module goes at its own state.

**Changes of the acceleration only:**

| What | At a frame? |
|---|---|
| Each retro-rocket's firing, the TDU-1's | Yes: `evt.retroFire`, `evt.tduFire` |
| Each of Mercury's retro-rockets burning out (10 s each, the three 4.7 and 4.8 s apart); the TDU-1's rise, run-out and tail-off | No (the TDU-1's cut-off is `evt.retroCutoff`) |
| The tower's and the fairing's motors: their start, their thrust curves, their burn-out | The start is the abort's own frame, the burn-out ends phase 'escape' (`evt.escapeBurnout`); the curve in between is not |
| The drogue, the main and Vostok's pilot chute opening | Yes: `evt.escapeDrogue`, `evt.escapeMain`/`evt.escapeMainLow`, `evt.pilotChute` |
| A canopy filling, the main coming out of its reefing (`reefS`, 3–4 s after it opens) | No: `canopy()` ramps the drag |
| The heat shield going, the soft-landing motors firing | Yes: `evt.escapeHeatShield`, `evt.escapeSoftLanding`; the motors' 0.25 s burn ends on no event |
| The touchdown | Yes: `evt.escapeLanded`, `evt.capsuleSplashdown`, `evt.capsuleLanding` |
| The air, the wind, J2 | Continuous |

**Vostok's pair on its cables.** Once the straps go (`evt.vostokStraps`) the pair is flown as one body until the cables part (`evt.vostokSeparation`). The frame's `r` and `v` are that body's CG, which moves smoothly; the cables' ends (`abort.tether`) are offsets from it, blended by `blendAbort` as before.

A change of the acceleration of Δa inside a span costs the cubic at most Δa·T²/62, wherever in the span it falls (computed: the worst miss of the cubic through both ends for a unit step of acceleration is 0.0162 T², at 77 % of the span). For one of Mercury's 4,448 N rockets on the 1,295 kg capsule over a 10 s span that is 5.6 m. Gravity alone puts the chord gT²/8 = 119 m under the arc.

## Decision

- **In flight, every abort span takes the cubic**: the escape's motors, the coast, the fall, each parachute and its reefing, the retro-rockets, Vostok's pair on its cables, the soft-landing motors. Each jump of the velocity is at a frame, and every other change inside a span is a change of the acceleration, which the cubic follows more closely than the line does in every span measured below. Kepler from the earlier frame, the other arc available, would be 319 m off with the retro-rockets firing and misses the later frame, so it is not used.
- **The escape tower's jettison keeps what it had**: the descent module leaving the head section changes the body, and the configuration hold (as on main) draws the earlier frame across that one step.
- **On the ground the escape keeps the line.** Vostok's sphere lies on the steppe with its status still 'abort' while Gagarin comes down (`resting`, `crewAloft`). Its first frame there carries the landing's velocity, 10 m/s down and the wind's drift, which `rest()` replaces with the ground's turning one step later, inside a 5 s span. The cubic through that velocity swings 8.2 m off, and the line is 0.066 m off.
- **A span into or out of the abort keeps its old blend** (a change of status): the line, or the hold across a change of body.

## Change

`coasting` in `interpolateFrames` becomes a lookup by status:

```ts
const coasting = (f: VisualFrame) => ({ coast: true, orbit: true, descent: f.descentPhase === 'coast',
  abort: f.abort?.phase !== 'landed' } as Partial<Record<SimStatus, boolean>>)[f.status];
```

- For every other status it gives what the old expression gave (checked over 539 combinations of status, descent phase and abort phase: only 'abort' changes, and 'abort' on the ground stays false).
- An abort frame always carries rigid telemetry (`LaunchEscape.sync` writes `s.rigid`, in point-mass flights too). So two abort frames in flight reach #187's cubic branch, `vehicleCoasts && a.rigid && 4 * span < a.elements.period`, never Kepler. The quarter-period bound still applies (a suborbital arc's period is over an hour).
- **Coasting bodies beside the escape** (above 140 km at both ends, not burning) take the vehicle's way, as in #185 and #187, so they take the cubic too: the spent Redstone beside Freedom 7, 18a's modules, the stages Vostok-K left in orbit.
- **A point-mass flight's live view** draws an abort through the same blend, between step boundaries (`FlightRecorder.liveBetween`). Those spans are one step, 0.2 s at most above the air, where the line sags about 5 cm; that much changes live. A six-DOF flight's live view draws the simulation's own state and does not change.
- The comment above `coasting` gives the reasons, short. **Why a lookup:** the obvious form, `|| f.status === 'abort' && f.abort.phase !== 'landed'`, is 46 B a chunk, 92 B in all, and 'precache code' had 48 B left. The lookup costs 10 B a chunk.

## Measured

Probe (gitignored `tests/probe/abort-arc.test.ts`): each flight is the watch mission's own settings (`watchMissionSettings`, `defaultDynamics`: six-DOF), and the same flight point-mass. It is recorded through `FlightRecorder.advance(1)`, as the app records it, to the landing (Vostok-1: until Gagarin is down). The truth is the simulation's own state after every step. For every step inside a recorded span with an abort at either end it compares with the truth:
- PR #187's head (fa92cf6), the line on every abort pair;
- this branch;
- and, for the record, the cubic, the line and Kepler from the earlier frame.

The flights: MR-3, Soyuz 18a, Soyuz MS-10, Soyuz T-10-1 and Vostok-1, each six-DOF and point-mass. Between them they fly every kind of abort: the tower (T-10-1), the fairing (MS-10), a separation above the air (18a), Mercury's capsule and Vostok's. Only the Soyuz carries an escape system, and only Mercury and Vostok fly a capsule home. 666,616 samples of the vehicle; the recordings were thinned 0–3 times, which widens the air's 0.1 s spans to 0.8 s in six-DOF 18a and MS-10.

The vehicle, worst sample, metres from the flown position:

| Span | Flights | Spans | Longest | #187 | This PR | Samples worse than #187 |
|---|---|---|---|---|---|---|
| retro-rockets firing, above 140 km | 4 | 88 | 10 s | 127.9 | 2.33 | 0 of 8,086 |
| no motor or canopy, above 140 km | 6 | 674 | 10 s | 117.2 | 0.001 | 0 of 97,757 |
| crossing 140 km | 6 | 8 | 10 s | 117.2 | 0.001 | 0 of 2,181 |
| in the air, no motor or canopy | 10 | 8,478 | 2 s | 13.0 | 0.336 | 0 of 168,312 |
| Vostok's pair on its cables | 2 | 4 | 2 s | 4.70 | 0.000 | 0 of 414 |
| drogue | 8 | 828 | 0.8 s | 3.57 | 0.017 | 0 of 16,926 |
| the escape's motors (tower, fairing) | 4 | 65 | 0.8 s | 1.64 | 0.093 | 0 of 2,103 |
| main filling or reefed | 10 | 397 | 1 s | 1.30 | 0.018 | 0 of 7,374 |
| Vostok's pilot chute | 2 | 76 | 0.5 s | 0.192 | 0.000 | 0 of 3,626 |
| under the open main | 10 | 29,049 | 1 s | 0.093 | 0.006 | 0 of 349,016 |
| soft-landing motors | 6 | 18 | 0.1 s | 0.041 | 0.003 | 0 of 342 |
| on the ground (Vostok's sphere): kept on the line | 2 | 210 | 5 s | 0.066 | 0.066 | 0 of 10,266 |
| into the return (orbit → abort): held, unchanged | 2 | 2 | 2 s | 15,499 | 15,499 | 0 of 213 |

By flight, #187 → this PR:

| Flight | Frames, thinnings | Above 140 km | Retro-rockets firing | In the air | On the ground |
|---|---|---|---|---|---|
| MR-3 six-DOF | 4,295, 1 | 117.2 → 0.001 m (10 s) | 127.9 → 2.33 m (10 s) | 0.509 → 0.006 m (0.2 s) | — |
| MR-3 point mass | 6,913, 0 | 117.2 → 0.001 m | 126.5 → 1.35 m | 0.132 → 0.001 m | — |
| Soyuz 18a six-DOF | 5,581, 3 | 116.9 → 0.000 m (10 s) | — | 13.0 → 0.189 m (0.8 s) | — |
| Soyuz 18a point mass | 7,417, 1 | 116.9 → 0.000 m | — | 0.806 → 0.005 m | — |
| Soyuz MS-10 six-DOF | 4,814, 3 | — | — | 5.31 → 0.336 m (0.8 s) | — |
| Soyuz MS-10 point mass | 7,416, 1 | — | — | 0.342 → 0.008 m | — |
| Soyuz T-10-1, both | 2,219, 0 | — | — | 0.177 → 0.005 m (0.1 s) | — |
| Vostok-1 six-DOF | 4,714, 0 | 4.70 → 0.000 m (2 s) | 1.22 → 0.012 m (1 s) | 4.76 → 0.012 m (2 s) | 0.066 m, kept |
| Vostok-1 point mass | 4,626, 0 | 5.24 → 0.000 m (2.2 s) | 1.30 → 0.013 m | 4.76 → 0.012 m | 0.066 m, kept |

- **Never worse:** 656,137 of the 666,616 samples are in spans now drawn differently, and none is drawn more than 1 cm further from the flown position than #187 draws it. The spans whose blend did not change were checked equal, sample for sample, to #187's drawing.
- **Coasting bodies beside the escape:** 258,450 samples, none worse than #187. Above the air they went from up to 117.2 m off to 0.001 m.
- **The ground:** the cubic would be 8.2 m off on the first span after Vostok's landing (T+6,106.4–6,111.4 s six-DOF), for 49 samples; that is why the ground keeps the line. Turning the sphere with the Earth (`turnWithEarth`, as a body at rest already is) would be 0.000 m off. The 3-D view already stands a resting sphere on the drawn ground (`drawnFrame`, src/render/datum.ts).
- **The retro-rockets' 2.33 m** is the span from Freedom 7's third retro-rocket's firing, in which the first two burn out. That is the Δa·T²/62 above: an acceleration step that is no event.
- **The task's figures:** "above the air 128 m, the cubic about 2.2 m" is reproduced (127.9 m and 2.33 m six-DOF). "In the air, 117 m, the cubic about 8 m" is not: the spans that cross 140 km are 117.2 m off on the line and 0.001 m on the cubic, and the spans wholly in the air (≤ 2 s) are at most 13.0 m and 0.34 m.
- **Point-mass live view:** its spans are single steps, so the change there is the 0.2 s and shorter spans above, a few centimetres at most.

## Tests

`tests/abort-replay-arc.test.ts`, 16 tests. The frames are built on a real abort frame: point-mass MR-3 flown to its capsule's separation, with the escape's own rigid telemetry. The truth arcs are flown in the test (central gravity and J2, in 0.01 s RK4 steps, with the thrust or the drag a case needs).

**The spans that take the cubic:**
- above the air: Freedom 7 over the top of its arc, 18a's spacecraft coasting after its separation, 18a's descent module falling free, and Vostok's pair on its cables over its 2 s frames: within 0.05 m of the arc, where the chord is 80–117 m off over 10 s (4.7 m over 2 s);
- the retro-rockets firing, two burning out inside the span (Freedom 7's sequence from the third's firing): within 3 m, and within a tenth of the chord's miss;
- a coasting body beside the capsule (the spent Redstone) keeps its place: within 0.05 m of its arc and of its offset from the capsule;
- in the air over 0.8 s thinned spans: the entry at 10 g, the drogue filling, the main out of its reefing, and the fairing's motors pulling the head section clear: within a tenth of the chord's miss;
- a recorder-and-player pass over Freedom 7, point-mass, from its separation to the water: within 3 m of the flown state on its spans above the air (126.5 m on #187), and never more than 1 cm further off than the chord anywhere in the abort.

**The spans that keep the line:**
- the sphere on the ground, its first frame there carrying the landing's velocity: on the line, within 0.1 m of the ground's turning (the cubic would be 8 m off);
- the sphere at rest at both frames;
- the touchdown's span, and Freedom 7's span into the water (status 'landed');
- the capsule leaving the head section (the tower's jettison): the earlier frame held across the change of body.

Purity: frozen inputs, the same frame twice.

**Failing first:** the test was committed alone (fb9ab21). The final test file run against #187's frame.ts fails 11 of 16, each on the line's miss: 86.9 m and 3.5 m above the air, 26.7 m with the retro-rockets, 115.8 m for the Redstone beside the capsule, 5.35, 0.52, 0.35 and 0.94 m in the air, and 126.5 m through the recorder and player. The 5 that pass are the spans that keep the line, and purity. With the fix (52fae07), 16 of 16 pass. The retro-rockets' case was first written with one burn-out at a chosen time and a 3 m bound, which the cubic missed by 4.3 m; it now follows Freedom 7's own sequence, and the bound comes from the worst case above.

**Related files:** 31 files, 478 tests, all pass with the fix:
- the files the task names: launch-abort, vostok-replay, vostok-render, replay;
- #187's list: rigid-replay-arc, debris-replay, rigid-replay, rigid-event-boundary, rigid-failure-boundary, live-stepping, equations, session, rendezvous, rendezvous-fuel, orbit-handoff, apollo-own-launch, bundle-budget, audio, rigid-debris, repo-hygiene, rigid-render, frames-view, eo-phy-6/apollo11;
- every other unit file that builds a recorder, a player or a session: custom-vehicle, d06-custom-satellite, d06-satellite-launch, instructor-mode, lesson-grading-end, mcp, recheck-core.

**Heavy:** `tests/heavy/vostok1-recording.test.ts` 1 of 1 (159 s, Node 22.22.0, not the CI runtime). It is the only heavy or six-DOF fleet file that records a flight: tests/heavy/mercury-redstone.test.ts flies MR-3 without a recorder.

**Typecheck:** `npx tsc --noEmit -p .` clean.

## Size

`npx vite build`, `node scripts/bundle-budget.mjs`: ok, no ceiling raised.
- `index-*.js` 2,634,877 B and `flight.worker-*.js` 570,513 B: +10 B each on #187's 2,634,867 and 570,503.
- Precache code 14,653,972 of 14,654,000 B (+20 B; 28 B left).

## Second-agent review

To be added.

## Not changed, for later

- **The sphere on the ground** keeps the line, 0.066 m off. `turnWithEarth`, which a body at rest in the debris list already takes, is exact there (0.000 m in both Vostok-1 runs). It needs more bytes than 'precache code' has left.
- **Bodies in orbit while the sphere waits on the ground** take the vehicle's way, as #185 made them, so they keep the line too: the stages Vostok-K left in orbit, 29.1 m off over the sphere's 5 s frames (as on #187). Thousands of kilometres from the sphere, they have no place beside it to keep; the cubic would be 0.000 m off.
- **Bodies in the air beside the escape** keep the line, as before, while the escape now takes the cubic. Where the air's spans are 0.1 s they are a few centimetres apart either way; over 18a's 0.8 s thinned spans the escape no longer sags by up to 13 m with them.
- **The step into Vostok's return** (orbit → abort, 2 s) holds the last orbit frame across the change of body, 15.5 km off at its end, as on main. It is #187's "configuration hold" item.
- **A hard-thinned recording.** An abort's frames are thinned as dense flight, to a frame a second first. Only after the coast has nothing left to give can they go to a minute or beyond, and then a parachute's opening could fall inside a span of several seconds. The cubic stays monotone while both frames' speeds are within three times the span's mean speed (Fritsch and Carlson, 1980); a canopy opening inside a span of several seconds can break that, and the cubic would overshoot. No recording measured here came near it: the longest span in the air is 2 s, and 1 s with a canopy.
