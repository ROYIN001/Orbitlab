# Replay: a six-DOF vehicle on its arc between frames / ยานแบบ six-DOF อยู่บนวงโคจรระหว่างเฟรม

> **สรุปสำหรับเจ้าของ (ภาษาไทย)**
>
> - ปัญหา: ตอนดูย้อนหลังหรือเลื่อนเวลา (replay/seek) ยานที่บินแบบ six-DOF ถูกวาดเป็นเส้นตรงระหว่างเฟรมที่บันทึกไว้ six-DOF เป็นค่าเริ่มต้นของจรวดทุกลำในแคตตาล็อก เฟรมในวงโคจรห่างกัน 10–30 s และห่าง 60 s เมื่อการบันทึกยาวจนถูก thin เส้นตรงจึงอยู่ต่ำกว่าวงโคจรจริง:
>   - สูงสุด 1.2 km ที่ 30 s และ 4.1 km ที่ 60 s
>   - Starship Flight 5 ช่วง coast ก่อนกลับเข้าบรรยากาศ 1.7 km
>   - Apollo 11 ในวงโคจรจอด 1.0 km
>   - ยาน Soyuz ที่เชื่อมต่อกับสถานีแล้วอยู่ห่างจากพอร์ตของสถานีถึง 1.5 km และเป็นทั้งแบบ point-mass และ six-DOF
> - สาเหตุ: `interpolateFrames` วาดยานบนวงโคจร (Kepler) เฉพาะยานที่ไม่มี rigid telemetry ยาน six-DOF และยานที่เชื่อมต่อแล้ว ซึ่งได้ rigid telemetry จาก rendezvous จึงได้เส้นตรง
> - แก้: ยานที่มี rigid telemetry และ coast ทั้งสองเฟรมใช้ cubic (hermite) ผ่านตำแหน่งและความเร็วของทั้งสองเฟรม แบบเดียวกับที่ rendezvous และ Apollo แบบ point-mass ใช้อยู่แล้ว
>   - cubic ผ่านทั้งสองปลาย จึงไม่ต้องดูว่าเครื่องยนต์ที่เฟรมแรกดับแล้วหรือยัง ช่วงท้ายของการดับเครื่องจึงได้ cubic ด้วย
>   - ใช้ cubic เฉพาะช่วงที่สั้นกว่าหนึ่งในสี่ของคาบวงโคจร ช่วงที่ยาวกว่านั้นเกิดได้เฉพาะเมื่อการบันทึกถูก thin หนักมาก (เช่น ยานที่เชื่อมต่ออยู่หลายชั่วโมง มีช่วงหนึ่งยาว 7,981 s) ในช่วงแบบนั้น cubic จะเหวี่ยงออกไกลกว่าเส้นตรง จึงใช้เส้นตรงเหมือนเดิม agent ตัวที่สองเป็นผู้พบกรณีนี้
>   - Apollo ใช้ cubic ทั้ง six-DOF และ point-mass ตามที่เจ้าของเลือก (2026-10-29: "Include Apollo")
>   - ยานแบบ point-mass ที่ไม่มี rigid telemetry ไม่เปลี่ยน ยานที่เชื่อมต่อกับสถานีแล้ว (หรือยกเลิกการเชื่อมต่อ) ตอนนี้อยู่ที่พอร์ตทั้งตอนดูย้อนหลังและตอนบินจริง
> - ผล: วัดทั้ง 20 ภารกิจในหน้าดูการปล่อย (six-DOF) โดยเทียบกับตำแหน่งจริงของการจำลองทุก 1 วินาที
>   - ช่วง coast และในวงโคจร คลาดสูงสุด 4.1 km → 0.46 m (1.3 m ในวงโคจรถ่ายโอนของ Falcon Heavy)
>   - Starship 1.7 km → 0.075 m และช่วงท้ายการดับเครื่อง 394 m → 25 m
>   - Apollo 1.0 km → 0.03 m
>   - ยานที่เชื่อมต่อแล้ว 3.9 km → 0.38 m
>   - ไม่มีจุดใดที่ยานถูกวาดแย่ลงกว่าเดิมเกิน 1 cm ทั้ง 39,077 จุดที่เปลี่ยน และ 11,972 จุดของยานที่เชื่อมต่ออยู่ 12,000 s
> - ข้อแลกเปลี่ยนที่เจ้าของเลือกไว้: Apollo ที่บันทึกยาวจนเฟรมห่าง 60 s ขึ้นไป ช่วงใต้ร่มหลักจะคลาดมากกว่าเดิม คือราว 200 m ที่ 60 s และ 1.2 km ที่ 240 s เทียบกับราว 150 m เดิม Apollo แบบ point-mass เป็นแบบนี้อยู่แล้ว เสนอให้แก้เป็นงานต่อไปสำหรับทั้งสองแบบ
> - สิ่งที่ยังไม่แก้: ชิ้นส่วนที่ตกผ่านบรรยากาศยังเป็นเส้นตรงเหมือนเดิม คลาดเท่าเดิม แต่เมื่อเทียบกับตัวยานซึ่งไม่ยุบตามแล้ว จะคลาดได้ถึงราว 1 km ชิ้นส่วนเหล่านี้อยู่ห่างจากยานอย่างน้อย 123 km จึงมองไม่เห็นความต่าง (รายการ "for later" ของ #185) นอกจากนี้ยังมีวิถีของระบบหนีภัย (escape) และสถานีในช่วงที่ยาวมาก
> - ขนาด: +25 B ต่อ chunk ไม่ได้ขึ้นเพดาน (precache code เหลือที่ว่าง 48 B)
> - การตรวจโดย agent ตัวที่สอง: ยืนยันการเปลี่ยนแปลงตรงตามที่ตั้งใจ 14 จาก 16 ข้อ (อีก 2 ข้อเป็นถ้อยคำในรายงาน แก้แล้ว) การล่า regression ยืนยัน 9 จาก 12 ข้อ พบปัญหา 1 ข้อ คือช่วงที่ยาวเกินหนึ่งรอบวงโคจร ซึ่งแก้แล้ว อีก 2 ข้อเป็นถ้อยคำ แก้แล้ว อีกสองมุม (ตรวจตัวเลขในรายงาน และตรวจเทสต์กับเอกสาร) จะรันซ้ำบน head ล่าสุด
> - การ merge: เป็นการแก้บั๊ก (ผิด → ถูก) มีเทสต์ที่ fail ก่อนแก้ (11 จาก 16) ไม่ได้ขึ้นเพดาน และไม่ได้เปลี่ยน assertion เดิม แต่มีข้อแลกเปลี่ยนของ Apollo ที่เจ้าของเลือกไว้ จึงควรให้เจ้าของกดอนุมัติเอง

```yaml
item: replay six-DOF vehicle blend between recorded frames (bug fix)
change_kind: bug fix (wrong → right); no existing assertion changed, no ceiling raised
owner_authorization: 'owner in chat to this session, 2026-10-29: "yes, take on the six-DOF vehicle sag as a separate task"; "go ahead with the fix"; on six-DOF Apollo, the answer "Include Apollo (Recommended)" to the session''s question; 2026-10-30: "ทำต่อ" (continue)'
app_code: src/physics/frame.ts (src/replay/recorder.ts: a comment only)
tests: tests/rigid-replay-arc.test.ts (new); tests/debris-replay.test.ts (header comment only)
base_sha_verified_on: {sha: 1842a86, date: 2026-10-30}
branch: claude/practical-lovelace-2ndbww
pr: 187
second_agent_review: 'equivalence lens confirmed 14 of 16; regression-hunt lens confirmed 9 of 12, its one blocking finding fixed (c7aac24); claims-audit and tests-docs lenses: re-run on the final head (see "Second-agent review")'
```

## Cause

`interpolateFrames` (src/physics/frame.ts) draws the vehicle between two recorded frames in one of three ways:
- with `propagateKepler` from the earlier frame when `ballistic`;
- with the cubic `hermite` through both ends in a rendezvous, or in a point-mass Apollo;
- on the straight line otherwise.

`ballistic` required `!a.rigid`, and the Apollo clause required `!a.rigid` too. A frame carries `rigid` telemetry whenever one of these holds:
- **The flight is six-DOF.** That is every catalogue vehicle by default (`supportsRigid`, `defaultDynamics` in src/physics/rigid/config.ts).
- **A rendezvous has run.** `rendezvous.sync()` writes `s.rigid` in point-mass flights too, so a docked or docking-aborted spacecraft, in status 'orbit', carries it.
- **An escape or a return from orbit is flying.** `abort.ts` `sync()` writes it too. Its status is 'abort', which never coasts, so it keeps the line before and after this change.

So all of these were drawn on the straight line:
- every six-DOF coast and orbit;
- Starship's descent coast;
- six-DOF Apollo;
- a docked or docking-aborted spacecraft.

The recorder keeps an orbit frame every 10 s (30 s far from a burn), and every 60 s once a long recording is thinned (`MAX_THINNED_GAP`). The straight line sags v²Δt²/8R under the arc: about 1 km half way through a 30 s span and 4 km through a 60 s span.

Kepler from the earlier frame does not fit a six-DOF coast either. It is flown with J2 (`heldCoastStep`, `rigidRuntime.step`), and Kepler from one frame misses the next by 3.6–6 m, so the drawing would jump at every frame.

A six-DOF flight's live view draws the simulation's own state (`lookahead = !sim.rigidRuntime`, src/replay/recorder.ts), so only its replay and seeks (`ReplayPlayer.frameAt`) were affected. A point-mass flight draws its live view through the same blend, so its docked spacecraft was off the port live as well. A docked step is 10 s, so that was about 108 m at mid-step.

### What a user saw

From the pre-fix investigation (code reading of every consumer of an interpolated frame's `r`, `v` and `debris[].r`):
- **Docked spacecraft:** it pulled away from the station's port and snapped back at every recorded frame. The station is drawn at `rendezvous.station.r`, which already took the cubic (`blendRendezvous`).
- **Watch view speed** (`groundSpeed`, from `r` and `v`): it dipped about 4 km/h half way through each span.
- **Engineer vis-viva card** (`visViva`, from `r` and `v`): half way through a 30 s span it read r 1 km low and the periapsis 7 km low, and its check against the blended elements turned '!' until the next frame.
- **Spent-stage heights in the telemetry list:** they flickered by 1 km.
- **Not affected:** altitude, the HUD, the onboard overlay, the map marker and the camera all read scalars blended on their own (`altitude`, `lat`, `lon`, `elements`), or directions only. The 3-D scene's origin is `frame.r`, so the Earth moved radially by 0.5 % between frames, which is too little to see.

## Change

`vehicleCoasts = !a.apollo && coasting(a) && coasting(b)` (the engine condition is gone from it), and `path` becomes:
- **Kepler:** `coasts && vehicleCoasts && !a.rigid && a.thrust <= 0` takes Kepler from the earlier frame, as on main.
- **Cubic:** `coasts && ((vehicleCoasts && a.rigid && 4 * span < a.elements.period) || rendezvous pair || (a.apollo && b.apollo))` takes the cubic through both ends.
- **Straight line:** everything else.

What that means:
- **A rigid vehicle coasting at both frames takes the cubic, whatever the earlier frame's thrust read.** The `a.thrust <= 0` gate exists for Kepler, which runs from one end. The cubic meets both ends' positions and velocities, so the tail of a cut-off needs no gate. Those spans were still on the line: 394 m off over Starship's 18.4 s span.
- **Only on a span under a quarter of the orbit's period** (`a.elements.period`, `Infinity` when unbound). The second agent found the case that needs this: a six-DOF Soyuz MS docked for 12,000 s overflows the six-DOF frame budget (`RIGID_MAX_FRAMES`, 6,000), and the recorder's last thinning pass leaves one docked span of 7,981 s, more than a whole orbit. There the cubic went up to 23,162 km off (9,577 km above the orbit) where the line was 9,271 km off.
  - A two-body check (scratchpad) shows the bound. From any starting point, the cubic is never worse than the line on a span shorter than a whole period of a circular orbit, or about a third of the period of a GTO or Molniya orbit (e = 0.73–0.74).
  - Longer spans keep main's line.
  - Every span in the fleet probe below is 60 s or shorter, under a quarter of any orbit's period, so its figures are the same with or without the bound.
- **Apollo takes the cubic six-DOF or not, whatever its thrust and status,** as point-mass Apollo already did on main. This was the owner's choice, 2026-10-29: the session asked whether to include six-DOF Apollo, with the parachute trade-off below, and the owner answered "Include Apollo (Recommended)". The quarter-period bound does not apply to Apollo, which matches point-mass Apollo.
- **A point mass without rigid telemetry is unchanged:** Kepler with the engine off at the earlier frame, the line otherwise, the cubic in a rendezvous or Apollo. A docked or docking-aborted point-mass spacecraft carries the rendezvous's telemetry and takes the cubic.
- **The configuration hold runs first, unchanged.** It holds frame a across a stage, payload, fairing or rigid-identity change, so past it `a.rigid` and `b.rigid` are the same body.
- **Debris:** a body coasting beside the vehicle (not burning, above 140 km at both ends) takes the vehicle's `path`, as in #185, so it keeps its place. A body in the air, or under its own thrust, keeps the line.

Comments:
- The `interpolateFrames` doc comment moves from above `blendAbort` to the function and says when each blend applies. Its "fresh frame" now names the mission-long data that is shared, as `cloneFrame` shares it: the jettisoned parts, Apollo's plan and Moon figures, and a recovery's target. This is as on main.
- The comment in src/replay/recorder.ts no longer says rigid frames are blended in straight lines.
- tests/debris-replay.test.ts no longer counts six-DOF among the vehicles drawn on the line.

The cubic follows both ends' velocities. It relies on every velocity change inside a coast being pinned to a frame: an event's frames, a change of configuration (held), or a change of status. The pre-fix investigation found no unpinned velocity change in a coast in any shipped mission (see "Pre-fix investigation" below).

## Measured

Probe (gitignored `tests/probe/sag.test.ts`), all 20 watch missions (`watchMissionSettings`, `defaultDynamics`: six-DOF), recorded through `FlightRecorder.advance(1)`. After every second it captures the simulation's own state, the truth. For every truth sample inside a recorded span it compares two drawings with the truth, on the same frames:
- main's `interpolateFrames` (1842a86, copied into the probe);
- this branch's (03f894a). The bound added in c7aac24 does not act on any of these spans (all ≤ 60 s).

Flights ran to the mission's end or T+4,000 s, with three exceptions:
- Vostok-1 to T+6,600 s.
- Apollo 11 to T+1,200 s, which is 500 s of its parking orbit. Six-DOF Apollo steps at 0.01 s there.
- Soyuz MS docking and Soyuz MS-16 were flown a second time with their rendezvous passed in, which the first runs left out.
  - The docking mission to T+14,000 s. It docked at T+12,318 s.
  - MS-16, a four-orbit rendezvous, to T+24,000 s, still before docking.
  - Soyuz MS-25's two-day rendezvous was not flown six-DOF.

The vehicle, worst sample, metres from the flown position:

| Span (six-DOF) | Missions | Spans | Longest | main | this PR |
|---|---|---|---|---|---|
| coast above 140 km, engine off at the earlier frame | 11 | 950 | 60 s | 4,119 | 0.46 |
| orbit, engine off at the earlier frame | 11 | 786 | 60 s | 4,036 | 1.29 (Falcon Heavy's transfer orbit) |
| coast below 140 km (Ariane 6) | 1 | 75 | 30.4 s | 979 | 0.026 |
| Starship's descent coast, above 140 km | 1 | 58 | 38.7 s | 1,741 | 0.075 |
| Starship's descent coast, below 140 km | 1 | 152 | 4.4 s | 21.5 | 0.000 |
| a cut-off's tail at the earlier frame: Starship's descent coast | 1 | 1 | 18.4 s | 394 | 25.3 |
| a cut-off's tail at the earlier frame: Sputnik's and Vostok's orbit | 2 | 2 | 14.0 s | 223 | 0.50 |
| thrust at both frames, coast or orbit | 12 | 31 | 1.2 s | 2.3 | 0.62 |
| Apollo 11's parking orbit, the S-IVB vent on or off | 1 | 18 | 30 s | 1,042 | 0.035 |
| docked to the station (Soyuz MS docking, rendezvous flown) | 1 | 30 | 60 s | 3,894 | 0.38 |
| every other span: ascent, burn, prelaunch, escape, entry, landing, the span a burn begins in | 20 | 16,866 | — | unchanged, bit for bit | |

- **Never worse:** of 57,029 samples, 39,077 changed. None has the vehicle drawn more than 1 cm further from the flown position than main draws it.
- **What is left:** the 25.3 m is Starship's cut-off span itself, where the engine runs into the span. The 1.29 m is the middle of a 60 s thinned span on Falcon Heavy's transfer orbit. The cubic's error grows as span⁴: about 0.4 m at 60 s in a low orbit, 6 m at 120 s, 96 m at 240 s. The line's at those spans is 4 km, 16 km and 62 km.
- **A docked spacecraft for hours** (the second agent's case, re-measured on c7aac24): six-DOF Soyuz MS docking flown to T+24,320 s, 12,000 s past docking (5,983 frames, 19 decimations).

  | Docked span | main | this PR |
  |---|---|---|
  | ≤ 61 s | 3,898 m | 0.38 m |
  | ≤ 250 s | 62 km | 95 m |
  | ≤ 1,000 s | 646 km | 10.4 km |
  | 7,981 s (over a quarter of the period) | 9,271 km | 9,271 km, main's line |

  0 of 11,972 docked samples is worse than main, and nothing within 20 km of the vehicle is worse. Without the bound, 965 samples were worse, by up to 14,945 km.
- **Docked spacecraft, point mass** (second agent, this branch's frame.ts):
  - Soyuz MS docking, docked at T+12,320.6 s and flown 3,000 s past it, 80 spans up to 37.2 s: 1,496.7 m → 0.000 m from its place at the port, 0.056 m from the flown state. 0 of 1,486 samples worse.
  - Soyuz MS-25's two-day rendezvous, docked at T+182,981 s, 538 docked spans: 1,496.6 m → 0.000 m off the port. 0 of 4,998 samples worse.
  - A docking aborted at the approach, with the propellant drained: 1,495.9 m → 0.055 m from the flown state.
- **The test:** 'stays on the station's port while docked' pins the docked case. It is 331 m off on main, 3 s into a 30 s span.
- **The rendezvous itself** already took the cubic and is unchanged: 7,175 spans in the two missions, bit for bit.
- **Apollo past the parking orbit** (second agent, point-mass Apollo 11 with every frame given six-DOF-style rigid telemetry, flown to T+16,030 s): 0 samples worse.

  | Phase | main | this PR |
  |---|---|---|
  | TLI burn, 1.1 s spans | 2.193 m | 0.001 m |
  | parking orbit | 963 m | 0.089 m |
  | translunar coast | 915 m | 0.236 m |
  | transposition and docked | 200 m | 0.004 m |
- **Spent bodies beside the vehicle:**
  - **Coasting:** a coasting body takes the vehicle's way. In the pre-fix investigation's recorded six-DOF Soyuz, Blok I, which has its own rigid telemetry, was 0.028 m from its flown position and 0.0009 m from its place relative to the spacecraft. In the six-DOF docking run, Blok I, thousands of kilometres from the station, went from 4,122 m to 0.43 m off.
  - **In the air:** a body in the air keeps the line, so its absolute error is the same as on main (Blok A 4.8 km, the H-IIA first stage 6.8 km). Its error relative to the vehicle, which no longer sags with it, can grow by up to about 1 km: the Apollo S-II went from 21 m to 1,054 m.
  - **Nothing visible changes.** The second agent measured how far these bodies are in the runs it made (Soyuz to the station, H-IIA, Sputnik, Apollo): at least 123 km from the vehicle, so 7.5 mrad as seen from it at most. No body within 20 km of the vehicle got worse in any run. This is #185's item "for later".

## Tests

- `tests/rigid-replay-arc.test.ts`, 16 tests. Synthetic frames carry a real six-DOF capture's `rigid`, one configuration at both ends, and their orbit's period. Each test case:
  - the frames reach the blend;
  - a 30 s orbit span stays on the orbit, not the chord 1 km inside it;
  - a span over a quarter of the orbit (0.3 and 1.44 periods) keeps the line, and one of 0.2 takes the cubic (42 km off where the line is 1,260 km);
  - a 60 s thinned span stays on the orbit;
  - a J2-flown span stays on its J2 arc, which Kepler from the earlier frame misses by more than 1 m, and meets the later frame;
  - a coasting body beside the vehicle keeps its place, one with its own rigid telemetry too;
  - a docked spacecraft stays 20 m out on the station's port;
  - a returning ship's descent coast;
  - Apollo, vent on and under full thrust, is drawn as point-mass Apollo is;
  - a cut-off's tail takes the cubic, while a point mass there keeps the line;
  - the straight line is kept where a burn begins and on the ascent;
  - a body in the air, or burning, keeps the line;
  - a change of configuration holds frame a (5 kinds of change);
  - a point mass stays on Kepler bit for bit;
  - purity on deep-frozen inputs;
  - a recorder-and-player pass over a six-DOF coast. Its `sim.step` flies Kepler arcs, because the integrator is not under test and the ascent takes a minute.
- **Failing first:**
  - On main 11 of 16 fail: 4.1 m, 4,126 m, 4.1 m, 67.5 m, 331 m, 1,030 m four times, 772 m, and the quarter-period test's cubic half (1,260 km).
  - With the fix 16 of 16 pass.
  - The five that pass on both are the guards: the frames reach the blend, the straight line is kept where it should be, the configuration hold, the point mass bit for bit, and purity.
  - On 03f894a, before the bound, the quarter-period test fails on its line half.
  - The first commit (54abdd3) carried the first 7 of these tests alone, 4 failing on main.
- **Related files:** debris-replay, rigid-replay-arc, rigid-replay, rigid-event-boundary, rigid-failure-boundary, replay, vostok-replay, vostok-render, launch-abort, equations, session, rendezvous, rendezvous-fuel, live-stepping, orbit-handoff, apollo-own-launch, bundle-budget, audio, rigid-debris, eo-phy-6/apollo11, repo-hygiene, rigid-render and frames-view. 23 files, 294 tests, all pass on c7aac24.
- **CI:** green on 03f894a (run 40969743239) and on f433505 (run 40973167407). Each ran plan, typecheck, build, test 1–3, browser-smoke 1–2 and verify. The run on 317d185 (40972796233) was cancelled by the push of f433505, and its verify job then failed on the cancelled jobs.
- **Browser journeys** the change map selects (`node tests/browser/run.mjs …`, local build of 317d185, the same code as 03f894a):
  - 7 of 8 passed, and recheck is held by design (teaching tools, owner 2026-10-17).
  - r2-flight-shell failed on its 420 s journey budget (435 s), while six-DOF probes ran on the same 4 cores. It had passed the replay seek and was in its later phone and language steps.
  - Run alone on the same build, idle machine (load 0.08), it passed in 308 s.
- **Heavy:**
  - `tests/heavy/vostok1-recording.test.ts`: 1 of 1 pass, 166 s, Node 22.22.0, which is not the CI runtime.
  - It is the only heavy or six-DOF fleet file that reaches `interpolateFrames`. The function's only callers are `FlightRecorder.liveBetween` and `ReplayPlayer.frameAt`, and no other heavy or fleet file builds a recorder or a player, directly or through src/lessons or src/session.
  - The six-DOF fleet and the other heavy files fly simulations whose state this change cannot touch, since it only changes a drawing. They were not run.

## Pre-fix investigation

Before the fix, a workflow of four agents and a critic looked at the edge cases, the branch design, the bundle bytes and the tests. The critic then read the committed fix.

- **Edge cases:** none blocking.
  - Every velocity change in a shipped coast is pinned to a frame, or changes the configuration or the status: burns (status 'burn' with `evt.burnStart`), ignitions, separations, docking, Vostok's deorbit, Starship's entry, impacts.
  - RCS gives no net force.
  - The held coast and the full six-DOF step both use J2, so switching between them leaves no kink.
  - A hidden velocity jump Δv would cost the cubic at most 0.148·Δv·T, against the line's 0.25·Δv·T.
  - Six-DOF Apollo's parachute case is the trade-off above.
- **Branch design:**
  - Apollo's `!a.rigid` had no physical reason: it was copied from `ballistic`'s guard, which predates the cubic.
  - The docked spacecraft was found here (1,496.7 m on the point-mass probe).
- **Bundle bytes:**
  - Every byte in `interpolateFrames` counts twice, in `index-*.js` and in `flight.worker-*.js`, since both are precached.
  - Comments are stripped and cost nothing.
- **Test design:** the tests above, and the user-visible symptoms listed under "What a user saw".
- **Critic:**
  - It recommended dropping the engine gate for a rigid vehicle, which became 03f894a.
  - It corrected two claims: Kepler is how a point-mass coast above the air is flown, but not a point mass in orbit (J2); and a point-mass live view changes for a docked spacecraft.

## Second-agent review

Four lenses on the branch (code 03f894a), each serious finding then put to a skeptic.

- **Equivalence and purity: confirmed 14 of 16.**
  - The decision changes in exactly the predicted set, line → cubic, and never touches Kepler. It was checked over 21,632 input combinations symbolically, and over 10,816 synthetic frame pairs through main's and the branch's real functions with 0 mismatches.
  - Nine point-mass watch missions were checked on deep-frozen frames, 7 instants per pair: 55,380 pairs, 387,660 calls. They are bit-identical to main except the 45 docked pairs, plus 40 more in a forced docking abort.
  - The early returns are byte-identical to main.
  - The two claims not confirmed were wording, and both are fixed here: "a point mass is unchanged", and the list of rigid sources. Its note on the docstring's "fresh frame" (aliasing on main) and its readability note (`coast` beside `coasts`; now `vehicleCoasts`) are taken too.
- **Regression hunt: confirmed 9 of 12.**
  - **Blocking:** the docked span of more than an orbit, above. Its skeptic did not run, because the session hit a usage limit. The session checked it itself: it reproduced the finding with the two-body check and the agent's probe, fixed it with the quarter-period bound (c7aac24), and re-measured 0 samples worse on the same flight.
  - The other two not confirmed were wording, both fixed here: the docking time, and "Blok I near the station".
  - Also checked: debris that got worse relative to the vehicle are 123 km or more away; unpinned throttle steps in a six-DOF coast are worse only in a contrived radial case (≤ 30 m); and MS-25 and Apollo, above.
- **Claims audit, and tests and documentation:** these two lenses did not run (usage limit). They are re-run on the final head; the result is recorded on the PR.

## Size

`npx vite build`, `node scripts/bundle-budget.mjs`: ok, no ceiling raised.
- `index-*.js` 2,634,867 B and `flight.worker-*.js` 570,503 B: +25 B each on main's 2,634,842 and 570,478. The quarter-period bound is 23 B of each.
- Precache code 14,653,952 of 14,654,000 B (+50 B; 48 B left).

## Not changed, for later

- **Bodies in the air between 10–30 s frames** stay on the line: Blok A 4.8 km off, the H-IIA first stage 6.8 km. This is #185's item, unchanged here, except that their error relative to the vehicle can now grow (above).
- **Escapes and returns from orbit** (status 'abort') stay on the line. Mercury-Redstone's capsule above the air is 128 m off on 10 s spans (the cubic would be 2.2 m); Soyuz 18a's arc is similar. These spans have parachutes, tower jettison and retro-rockets in them, so they need their own look.
- **Thinned six-DOF Apollo:** the span under the main parachutes is drawn worse by the cubic than by the line once frames are 60 s or more apart. This is the owner's trade-off above, already true of point-mass Apollo. A fix for both could keep a frame about 12 s after `evt.mains`, or stop thinning the entry.
- **The station over a span of more than a quarter of an orbit:** `blendRendezvous` gives the station the cubic at any span, as on main. Over the 7,981 s docked span the station is 14,945 km from the spacecraft on main and on this branch: the spacecraft keeps main's line there. The same quarter-period bound in `blendRendezvous` would keep the two together.
- **A long thinned span keeps the line** (over a quarter of the period). A two-sided Kepler blend would fit there: 12.5 km off at 8,000 s against the line's 9,271 km (the second agent's J2 probe). By an estimate, not a build, it needs about 160 B per chunk, more than the 48 B the budget has left.
- **A point mass in orbit** keeps Kepler from the earlier frame. It is flown with J2, so its drawing jumps about 6 m at each 30 s frame. The cubic would fit there too.
- **A point mass's cut-off tail** (1–2 m) stays on the line.
- **The configuration hold** holds frame a for the whole span before a change: 13.9 km over Vostok's 2 s span from its orbit to its return, and 920 m over a 0.2 s span of the H-IIA's at T+392 s, where its configuration changes. Both are as on main.
- **Aliasing on main:** `cloneFrame` and `interpolateFrames` share `jettisoned`, Apollo's sub-objects and a recovery's `target` with the stored frame. The docstring now says so. Deep copies would close it.
- **Change map:** `scripts/verification/change-map.json`'s replay rule (src/replay/**) lists neither tests/debris-replay.test.ts nor tests/rigid-replay-arc.test.ts. A change to frame.ts already selects every unit test.
