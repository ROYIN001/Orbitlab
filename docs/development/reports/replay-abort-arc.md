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
>   - ชิ้นส่วนข้างยานที่ไม่ได้จุดเครื่อง (เช่น Redstone ที่แยกออก โมดูลเครื่องมือของ Vostok) ได้ทางเดียวกับยานทุกระดับความสูงระหว่างการหนีภัย agent ตัวที่สองพบว่าถ้าใช้เฉพาะเหนือ 140 km ชิ้นส่วนที่อยู่ในอากาศจะแยกจากยาน: Redstone ห่างแคปซูล 25 m ถูกวาดคลาดตำแหน่ง 117 m และโมดูลของ Vostok ขยับ 4.7 m ทุก 2 s แก้แล้ว
> - ผล: วัด 5 ภารกิจ (MR-3, Soyuz 18a, MS-10, T-10-1, Vostok-1) ทั้ง six-DOF และ point-mass เทียบกับตำแหน่งจริงของการจำลองทุกก้าว:
>   - MR-3 เหนือบรรยากาศ 117 m → 0.001 m และขณะจรวดถอยหลังทำงาน 128 m → 2.3 m
>   - 18a 117 m → 0.000 m และในอากาศ (เฟรมห่าง 0.8 s หลังการ thin) 13 m → 0.19 m
>   - Vostok-1 4.7 m → 0.000 m
>   - ไม่มีจุดใดของตัวยานคลาดมากกว่าเดิมเกิน 1 cm ทั้ง 666,616 จุด และชิ้นส่วนทุกชิ้นทุกระดับความสูง 1,751,467 จุด ก็ไม่มีจุดใดคลาดจากตำแหน่งจริงมากกว่าเดิม
>   - ระยะของชิ้นส่วนที่อยู่ห่างยานไม่เกิน 5 km จากตัวยาน: ดีขึ้นทุกเที่ยวบิน (เช่น MR-3 64 m → 1.35 m) มีเพียง 182 จาก 325,643 จุดที่แย่ลงไม่เกิน 0.13 m ที่ระยะห่าง 156 m ถึง 3 km
> - ตัวเลขในงาน "ในอากาศ 117 m (cubic ราว 8 m)" วัดซ้ำไม่ได้ ที่วัดได้คือช่วงที่ข้ามระดับ 140 km 117 m → 0.001 m และช่วงที่อยู่ในอากาศทั้งช่วง (≤ 2 s) 13 m → 0.34 m
> - ขนาด: +13 B ต่อ chunk (index และ flight.worker) precache code เหลือที่ว่าง 2 B ไม่ได้ขึ้นเพดาน เขียน `coasting` เป็นตารางตามสถานะเพื่อให้พอ
> - การตรวจโดย agent ตัวที่สอง: ยืนยัน 5 จาก 6 (ความเท่ากันและความบริสุทธิ์ของฟังก์ชัน), 7 จาก 9 (ล่า regression), 5 จาก 6 (เทสต์) ข้อที่ต้องแก้คือชิ้นส่วนในอากาศข้างยาน (แก้แล้ว มีเทสต์ที่ fail ก่อนแก้ 3 ข้อ) ข้ออื่นเป็นหมายเหตุ: การพิมพ์ชนิด (แก้แล้ว) และการบันทึกที่ถูก thin หนักมาก (ด้านล่าง)
> - การ merge: เป็นการแก้บั๊ก (ผิด → ถูก) มีเทสต์ที่ fail ก่อนแก้ (11 จาก 16 และอีก 3 ข้อสำหรับชิ้นส่วน) ไม่ได้ขึ้นเพดาน ไม่ได้เปลี่ยน assertion เดิม PR นี้ต่อจาก #187 ซึ่งยังไม่ merge จึงต้อง merge #187 ก่อน
> - ยังไม่แก้ (งานต่อไป): ทรงกลมบนพื้นอาจหมุนไปกับโลกได้ตรง (`turnWithEarth`, คลาด 0.000 m แทน 0.066 m) แต่ไม่มีที่ว่างในงบขนาด; ชิ้นส่วนที่ลอยอยู่ในวงโคจรระหว่างที่ทรงกลมรออยู่บนพื้นยังเป็นเส้นตรงตามตัวยาน (29 m); การบันทึกที่ถูก thin จนช่วงยาวเป็นสิบวินาที (เกิดได้เฉพาะเมื่อบันทึกนานมาก) ช่วงหลังร่มหลักกางอาจวาดแย่กว่าเส้นตรง: agent ตัวที่สองวัดได้ 269 m เทียบกับ 192 m ในช่วง 42 s เมื่อบังคับให้เหลือ 300 เฟรม

```yaml
item: replay blend of an escape or a capsule's return between recorded frames (bug fix)
change_kind: bug fix (wrong → right); no existing assertion changed, no ceiling raised
owner_authorization: 'owner to this session, 2026-10-30: "Task: decide which ''abort'' spans can safely take the cubic (or another arc) and which must keep the line"; later the same day: "ทำต่อ" (continue)'
app_code: src/physics/frame.ts
tests: tests/abort-replay-arc.test.ts (new, 18 tests)
base_sha_verified_on: {sha: f7f7577, date: 2026-10-30, note: 'the head of PR #187, which this branch is stacked on and has merged (310e79b, and again for f7f7577); its three later commits change comments, its test, report and fragment, and the bundle is byte-identical; #187 is on main 1842a86'}
branch: claude/gracious-sagan-zvg16a
pr: 190 (draft, stacked on #187)
second_agent_review: 'equivalence and purity confirmed 5 of 6, regression hunt 7 of 9, tests 5 of 6 (2026-10-30, on 52fae07); its one should-fix finding (bodies under 140 km beside the escape) fixed in 05fe391 with failing-first tests (d798764), its typing note taken; its thinning note recorded under "Not changed"'
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
- **A body beside the escape that fires nothing goes the escape's way, at any height** (the second agent's finding): on the line beside an escape on the cubic, a body in the air parts from it.

## Change

`coasting` in `interpolateFrames` becomes a lookup by status:

```ts
const coasting = (f: VisualFrame) => ({ coast: true, orbit: true, descent: f.descentPhase === 'coast',
  abort: f.abort?.phase !== 'landed' } as Partial<Record<SimStatus, boolean>>)[f.status];
```

- For every other status it gives what the old expression gave (checked over 539 combinations of status, descent phase and abort phase: only 'abort' changes, and 'abort' on the ground stays false).
- An abort frame always carries rigid telemetry (`LaunchEscape.sync` writes `s.rigid`, in point-mass flights too). So two abort frames in flight reach #187's cubic branch, `vehicleCoasts && a.rigid && 4 * span < a.elements.period`, never Kepler. The quarter-period bound still applies (a suborbital arc's period is over an hour).
- **Bodies beside the escape take its way at any height** when nothing on them fires (`!!a.abort || <above 140 km at both ends>` in the debris blend). Elsewhere a body takes the vehicle's way only out of the air, as #185 made it. The second agent found why an abort needs more: with the escape on the cubic, a body in the air beside it on the line parted from it. The spent Redstone 25 m from Freedom 7 was drawn 117 m off its place on the span that crosses 140 km, Vostok's instrument module bobbed 4.7 m against the sphere every 2 s after its cables parted, and 18a's Blok I, 0.7 km away, was drawn 79 m off. `a.abort` is set from the abort's first frame to the end of the recording; where the escape keeps the line (on the ground, or once the status is 'landed'), its way is the line, so the bodies keep it too.
- **A point-mass flight's live view** draws an abort through the same blend, between step boundaries (`FlightRecorder.liveBetween`). Those spans are one step, 0.2 s at most above the air, where the line sags about 5 cm; that much changes live. A six-DOF flight's live view draws the simulation's own state and does not change.
- The table is checked with `satisfies`, so a misspelt status does not compile (the second agent's note; no bytes). The comment above `coasting` gives the reasons, short. **Why a lookup:** the obvious form, `|| f.status === 'abort' && f.abort.phase !== 'landed'`, is 46 B a chunk, 92 B in all, and 'precache code' had 48 B left. The lookup costs 10 B a chunk, the bodies' rule 3 B more.

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
- **The vehicle is unchanged by the bodies' rule** (05fe391): the same figures, sample for sample.
- **The ground:** the cubic would be 8.2 m off on the first span after Vostok's landing (T+6,106.4–6,111.4 s six-DOF), for 49 samples; that is why the ground keeps the line. Turning the sphere with the Earth (`turnWithEarth`, as a body at rest already is) would be 0.000 m off. The 3-D view already stands a resting sphere on the drawn ground (`drawnFrame`, src/render/datum.ts).
- **The retro-rockets' 2.33 m** is the span from Freedom 7's third retro-rocket's firing, in which the first two burn out. That is the Δa·T²/62 above: an acceleration step that is no event.
- **The task's figures:** "above the air 128 m, the cubic about 2.2 m" is reproduced (127.9 m and 2.33 m six-DOF). "In the air, 117 m, the cubic about 8 m" is not: the spans that cross 140 km are 117.2 m off on the line and 0.001 m on the cubic, and the spans wholly in the air (≤ 2 s) are at most 13.0 m and 0.34 m.
- **Point-mass live view:** its spans are single steps, so the change there is the 0.2 s and shorter spans above, a few centimetres at most.

**The bodies beside the escape**, measured on 05fe391. This covers every body alive at both ends of an abort span, at any height, against its own flown position, and, for a body within 5 km of the escape, its offset from the escape against the flown offset. #187 drew them all on the line, as it drew the escape. (A first count, on 52fae07, took only the bodies above 140 km at both ends, and so missed the second agent's finding.)

| Flight | Body samples | Own miss, #187 → now | Worse | Within 5 km (closest) | Offset, #187 → now | Worse |
|---|---|---|---|---|---|---|
| MR-3 six-DOF | 53,282 | 117.2 → 0.001 m | 0 | 22,124 (15.6 m) | 67.3 → 2.33 m | 0 |
| MR-3 point mass | 11,297 | 117.1 → 0.001 m | 0 | 1,878 (0.002 m) | 64.3 → 1.35 m | 20, by ≤ 0.054 m |
| Soyuz 18a six-DOF | 367,577 | 926.1 → 33.0 m | 0 | 60,880 (3.6 m) | 5.55 → 0.189 m | 46, by ≤ 0.128 m |
| Soyuz 18a point mass | 98,933 | 729.8 → 19.0 m | 0 | 11,232 (4.1 m) | 0.340 → 0.005 m | 0 |
| Soyuz MS-10 six-DOF | 285,356 | 6.42 → 0.064 m | 0 | 62,498 (0.007 m) | 2.49 → 0.336 m | 116, by ≤ 0.087 m |
| Soyuz MS-10 point mass | 101,497 | 0.345 → 0.000 m | 0 | 23,111 (0.012 m) | 0.133 → 0.008 m | 0 |
| Soyuz T-10-1, both | 2,480–3,245 | 0.014 → 0.000 m | 0 | all (0.04 m) | 0.189 → 0.005 m | 0 |
| Vostok-1 six-DOF | 530,771 | 29.1 m, kept | 0 | 97,667 (1.5 m) | 3.79 → 0.092 m | 0 |
| Vostok-1 point mass | 297,029 | 29.1 m, kept | 0 | 40,528 (1.5 m) | 3.79 → 0.092 m | 0 |

- **Own position:** of 1,751,467 samples, none is drawn more than 1 cm further from where the body flew than #187 draws it. The worst left (18a's 33 m) is a spent stage deep in the air hundreds of kilometres off; Vostok-1's 29.1 m is a stage in orbit while the sphere waits on the ground, kept on the line (below).
- **Place beside the escape:** the worst offset falls in every flight. What is left at MR-3's 1.35 and 2.33 m is the capsule's own miss while its retro-rockets fire, with the Redstone itself 0.001 m from where it flew.
- **Slightly worse:** 182 of 325,643 samples, by at most 0.13 m, in 5 spans:
  - MR-3's span after the third retro-rocket's firing, the Redstone 156 m away: 0.095 → 0.132 m;
  - three of MS-10's and one of 18a's 0.8 s thinned spans in the air at 21–27 km, with bodies 2.5–3 km away: up to 0.33 m.
  
  On the line both sagged alike there; now each carries its own small miss of the cubic. At those distances it is under a milliradian as seen from the escape.

## Tests

`tests/abort-replay-arc.test.ts`, 18 tests. The frames are built on a real abort frame: point-mass MR-3 flown to its capsule's separation, with the escape's own rigid telemetry. The truth arcs are flown in the test (central gravity and J2, in 0.01 s RK4 steps, with the thrust or the drag a case needs).

**The spans that take the cubic:**
- above the air: Freedom 7 over the top of its arc, 18a's spacecraft coasting after its separation, 18a's descent module falling free, and Vostok's pair on its cables over its 2 s frames: within 0.05 m of the arc, where the chord is 80–117 m off over 10 s (4.7 m over 2 s);
- the retro-rockets firing, two burning out inside the span (Freedom 7's sequence from the third's firing): within 3 m, and within a tenth of the chord's miss;
- a coasting body beside the capsule (the spent Redstone) keeps its place: within 0.05 m of its arc and of its offset from the capsule;
- a body beside the escape under 140 km keeps its place (the second agent's finding): the Redstone 25 m from Freedom 7 on a 10 s span from 145 to 135 km, and Vostok's instrument module 50 m behind the sphere 100 km up over a 2 s span, each within 0.05 m of its arc and of its offset;
- in the air over 0.8 s thinned spans: the entry at 10 g, the drogue filling, the main out of its reefing, and the fairing's motors pulling the head section clear: within a tenth of the chord's miss;
- a recorder-and-player pass over Freedom 7, point-mass, from its separation to the water:
  - within 3 m of the flown state on its spans above the air (126.5 m on #187), and never more than 1 cm further off than the chord anywhere in the abort;
  - every body within 5 km of the capsule within 0.05 m of where it flew, and its offset from the capsule within 1.5 m: what is left is the capsule's own miss while its retro-rockets fire (1.35 m), 0.13 m elsewhere. It was 117 m.

**The spans that keep the line:**
- the sphere on the ground, its first frame there carrying the landing's velocity: on the line, within 0.1 m of the ground's turning (the cubic would be 8 m off);
- the sphere at rest at both frames;
- the touchdown's span, and Freedom 7's span into the water (status 'landed');
- the capsule leaving the head section (the tower's jettison): the earlier frame held across the change of body.

Purity: frozen inputs, the same frame twice.

**Failing first:** the test was committed alone (fb9ab21). The final test file run against #187's frame.ts fails 11 of 16, each on the line's miss: 86.9 m and 3.5 m above the air, 26.7 m with the retro-rockets, 115.8 m for the Redstone beside the capsule, 5.35, 0.52, 0.35 and 0.94 m in the air, and 126.5 m through the recorder and player. The 5 that pass are the spans that keep the line, and purity. With the fix (52fae07), 16 of 16 pass. The retro-rockets' case was first written with one burn-out at a chosen time and a 3 m bound, which the cubic missed by 4.3 m; it now follows Freedom 7's own sequence, and the bound comes from the worst case above.

**Failing first, the bodies' rule:** the two new cases and the replay's new bounds were committed alone (d798764). On 214db06 they fail 3 of 18: 88.1 m (the Redstone crossing 140 km), 3.57 m (Vostok's module) and 117.1 m (the Redstone's place through the recorder and player). With the fix (05fe391), 18 of 18 pass.

**Related files:** 31 files, all pass with the fix (478 tests on 52fae07; 480 on 05fe391, with the bodies' two new cases; after merging #187's head, the eight replay files, 117 tests):
- the files the task names: launch-abort, vostok-replay, vostok-render, replay;
- #187's list: rigid-replay-arc, debris-replay, rigid-replay, rigid-event-boundary, rigid-failure-boundary, live-stepping, equations, session, rendezvous, rendezvous-fuel, orbit-handoff, apollo-own-launch, bundle-budget, audio, rigid-debris, repo-hygiene, rigid-render, frames-view, eo-phy-6/apollo11;
- every other unit file that builds a recorder, a player or a session: custom-vehicle, d06-custom-satellite, d06-satellite-launch, instructor-mode, lesson-grading-end, mcp, recheck-core.

**Heavy:** `tests/heavy/vostok1-recording.test.ts` 1 of 1 (159 s on 52fae07, 170 s on 05fe391 at low priority; Node 22.22.0, not the CI runtime). It is the only heavy or six-DOF fleet file that records a flight: tests/heavy/mercury-redstone.test.ts flies MR-3 without a recorder.

**Typecheck:** `npx tsc --noEmit -p .` clean.

## Size

`npx vite build`, `node scripts/bundle-budget.mjs`: ok, no ceiling raised.
- `index-*.js` 2,634,890 B and `flight.worker-*.js` 570,526 B: +13 B each on #187's 2,634,867 and 570,503 (the `coasting` table 10 B, the bodies' rule 3 B).
- Precache code 14,653,998 of 14,654,000 B (+46 B; 2 B left), the same after merging #187's head.

**Browser journeys** the change map selects (`node tests/browser/run.mjs …`, local build): on 52fae07, 8 of 8 passed in 14 min 52 s (experiment-notebook, launch-explore, r2-chooser-late-frame, r2-flight-shell 351 s, r2-shell-smoke, r3-result-setting, satellite, watch-controls). On 05fe391, 8 of 8 again in 14 min 50 s (r2-flight-shell 345 s). recheck is held by design (teaching tools, owner 2026-10-17).

**Checks:** `node --test tests/verification/*.test.mjs tests/browser/shard.test.mjs` 93 of 93; repo-hygiene and watch-missions 35 of 35.

## Second-agent review

One agent, three lenses, on 52fae07, in a worktree of its own.

- **Equivalence and purity: confirmed 5 of 6.**
  - Over 490 cases of status, descent phase and abort phase, the shipped table gives what the old expression gave, for every status but 'abort'.
  - 'abort' coasts exactly when its phase is not 'landed'. `coasting` is read only through `vehicleCoasts`, and that only for its truth.
  - Pure: frozen inputs, deep-equal output on repeat, over 1,068 recorded abort spans with bodies (MR-3 and Vostok-1).
  - The typecheck is clean.
  - Not confirmed: the `as` cast let a misspelt key compile. It is now `satisfies … as …`, which costs no bytes and rejects one (TS2561).
- **Regression hunt: confirmed 7 of 9.**
  - Every jump of the escape's velocity or position inside a step is at an event frame or changes its rigid `configurationId`, which holds the earlier frame. The one exception is `rest()` (src/physics/sim/abort.ts), which only Vostok reaches with the status still 'abort', and those spans keep the line. Nothing else in src/physics/simulation.ts writes `s.v` during an abort.
  - A span into the abort is always held (`sameRigidConfiguration(undefined, x)` is false); a span out of it ends 'landed' or 'failed', on the line.
  - The point-mass live view's spans are single steps.
  - Bodies above 140 km on the cubic are never worse.
  - `elements.period` on abort frames is finite, 1,789–5,368 s. An abort frame without `abort` or `rigid` cannot occur.
  - **Not confirmed, should-fix (A):** a body under 140 km beside the escape kept the line while the escape took the cubic: the Redstone 117 m off its place, Vostok's module 4.7 m, 18a's Blok I 79 m, 18a's modules 13 m. **Fixed** in 05fe391, failing first in d798764. Its measured remedy tested `a.status === 'abort'`, 23 B a chunk where 28 B were left in all; the shipped one tests `a.abort`, 3 B a chunk, and gives the same drawing (above).
  - **Not confirmed, note (B):** a hard-thinned recording; see "Not changed".
- **Tests: confirmed 5 of 6.**
  - Failing first reproduced: 11 of 16 on #187's frame.ts, 16 of 16 with the fix.
  - Mutations: dropping the ground's exception fails 3 tests; sending abort spans back to the line fails 11.
  - No assertion is vacuous or flaky. The existing files pass (115 of 115 in its worktree).
  - Not confirmed: the Redstone case covered only bodies above 140 km, so it could not catch A. The cases above now do.
- **Notes taken without a change:**
  - The synthetic frames reuse Freedom 7's rigid telemetry for the Soyuz and Vostok cases. They test the rule; the probe is the evidence for those flights.
  - "The sphere at rest at both frames" pins the rule, the line, which is 0.066 m off where `turnWithEarth` would be exact.

## Not changed, for later

- **The sphere on the ground** keeps the line, 0.066 m off. `turnWithEarth`, which a body at rest in the debris list already takes, is exact there (0.000 m in both Vostok-1 runs). It needs more bytes than 'precache code' has left.
- **Bodies in orbit while the sphere waits on the ground** take the vehicle's way, as #185 made them, so they keep the line too: the stages Vostok-K left in orbit, 29.1 m off over the sphere's 5 s frames (as on #187). Thousands of kilometres from the sphere, they have no place beside it to keep; the cubic would be 0.000 m off.
- **The step into Vostok's return** (orbit → abort, 2 s) holds the last orbit frame across the change of body, 15.5 km off at its end, as on main. It is #187's "configuration hold" item.
- **A hard-thinned recording.** An abort's frames are thinned as dense flight, to a frame a second first. Only after the coast has nothing left to give can they go to a minute or beyond, and then a parachute's opening could fall inside a span of several seconds. The cubic stays monotone while both frames' speeds are within three times the span's mean speed (Fritsch and Carlson, 1980); a canopy opening inside a span of several seconds can break that, and the cubic would overshoot. No recording at its default budget came near it: the longest span in the air is 2 s, and 1 s with a canopy. The second agent squeezed the budget (`FlightRecorder(maxFrames)`) to reach it:
  - **MR-3 point-mass at 300 frames** (533 thinnings, abort spans up to 52 s): one 42.1 s span right after the main opens (T+603.9–646.0, from 3.2 to 2.5 km) is drawn 268.8 m off on the cubic and 192.4 m on the line. The main's pull is nearly a velocity step near the span's start. For a step at a fraction τ of a span, the cubic misses by up to 4/27·Δv·T and the line by τ(1−τ)·Δv·T, so the cubic loses for τ under about 0.08 or over 0.92.
  - **Over that whole recording** the cubic is still the better: 3.7 km at worst against the line's 15.7 km.
  - **No overshoot:** in 11 squeezed runs, no drawn point went past either end of its span's chord.
  - **Larger budgets:** at 1,000 frames (MR-3), 500 (18a, MS-10), 300 (T-10-1) and 600 (Vostok-1), no span was worse.
  - **Reaching it in the app** takes thinning that has nothing gentler left: a six-DOF MR-3 recording left running for about 14 h of 30 s 'landed' frames after its splashdown, for example.
  - A fix could keep the line across a canopy's opening, or keep the abort's frames out of the last thinning passes.
