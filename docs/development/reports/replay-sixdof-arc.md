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
>   - Apollo ใช้ cubic ทั้ง six-DOF และ point-mass ตามที่เจ้าของเลือก (2026-10-29: "Include Apollo")
>   - ยานแบบ point-mass ไม่เปลี่ยน ยกเว้นยานที่เชื่อมต่อกับสถานีแล้ว ซึ่งตอนนี้อยู่ที่พอร์ตทั้งตอนดูย้อนหลังและตอนบินจริง
> - ผล: วัดทั้ง 20 ภารกิจในหน้าดูการปล่อย (six-DOF) โดยเทียบกับตำแหน่งจริงของการจำลองทุก 1 วินาที
>   - ช่วง coast และในวงโคจร คลาดสูงสุด 4.1 km → 0.46 m (1.3 m ในวงโคจรถ่ายโอนของ Falcon Heavy)
>   - Starship 1.7 km → 0.075 m และช่วงท้ายการดับเครื่อง 394 m → 25 m
>   - Apollo 1.0 km → 0.03 m
>   - ไม่มีจุดใดใน 39,077 จุดที่เปลี่ยน ที่ยานถูกวาดแย่ลงกว่าเดิมเกิน 1 cm
> - ข้อแลกเปลี่ยนที่เจ้าของเลือกไว้: Apollo ที่บันทึกยาวจนเฟรมห่าง 60 s ขึ้นไป ช่วงใต้ร่มหลักจะคลาดมากกว่าเดิม คือราว 200 m ที่ 60 s และ 1.2 km ที่ 240 s เทียบกับราว 150 m เดิม Apollo แบบ point-mass เป็นแบบนี้อยู่แล้ว เสนอให้แก้เป็นงานต่อไปสำหรับทั้งสองแบบ
> - สิ่งที่ยังไม่แก้: ชิ้นส่วนที่ตกผ่านบรรยากาศยังเป็นเส้นตรงเหมือนเดิม คลาดเท่าเดิม แต่เมื่อเทียบกับตัวยานซึ่งไม่ยุบตามแล้ว จะคลาดได้ถึงราว 1 km ชิ้นส่วนเหล่านี้อยู่ห่างจากยานหลายร้อย km จึงมองไม่เห็นความต่าง (รายการ "for later" ของ #185) นอกจากนี้ยังมีวิถีของระบบหนีภัย (escape) ด้วย
> - ขนาด: +2 B ต่อ chunk ไม่ได้ขึ้นเพดาน
> - การ merge: เป็นการแก้บั๊ก (ผิด → ถูก) มีเทสต์ที่ fail ก่อนแก้ (10 จาก 15) ไม่ได้ขึ้นเพดาน และไม่ได้เปลี่ยน assertion เดิม แต่มีข้อแลกเปลี่ยนของ Apollo ที่เจ้าของเลือกไว้ จึงควรให้เจ้าของกดอนุมัติเอง

```yaml
item: replay six-DOF vehicle blend between recorded frames (bug fix)
change_kind: bug fix (wrong → right); no existing assertion changed, no ceiling raised
owner_authorization: 'owner in chat to this session, 2026-10-29: "yes, take on the six-DOF vehicle sag as a separate task"; "go ahead with the fix"; on six-DOF Apollo, the answer "Include Apollo (Recommended)" to the session''s question'
app_code: src/physics/frame.ts (src/replay/recorder.ts: a comment only)
tests: tests/rigid-replay-arc.test.ts (new); tests/debris-replay.test.ts (header comment only)
base_sha_verified_on: {sha: 1842a86, date: 2026-10-29}
branch: claude/practical-lovelace-2ndbww
pr: 187
second_agent_review: pending
```

## Cause

`interpolateFrames` (src/physics/frame.ts) draws the vehicle between two recorded frames in one of three ways:
- with `propagateKepler` from the earlier frame when `ballistic`;
- with the cubic `hermite` through both ends in a rendezvous, or in a point-mass Apollo;
- on the straight line otherwise.

`ballistic` required `!a.rigid`, and the Apollo clause required `!a.rigid` too. A frame carries `rigid` telemetry whenever:
- the flight is six-DOF. That is every catalogue vehicle by default (`supportsRigid`, `defaultDynamics` in src/physics/rigid/config.ts);
- or a rendezvous has run. `rendezvous.sync()` writes `s.rigid` in point-mass flights too, so a docked or docking-aborted spacecraft, in status 'orbit', carries it.

So all of these were drawn on the straight line:
- every six-DOF coast and orbit;
- Starship's descent coast;
- six-DOF Apollo;
- a docked spacecraft.

The recorder keeps an orbit frame every 10 s (30 s far from a burn), and every 60 s once a long recording is thinned (`MAX_THINNED_GAP`). The straight line sags v²Δt²/8R under the arc: about 1 km half way through a 30 s span and 4 km through a 60 s span.

Kepler from the earlier frame does not fit a six-DOF coast either. It is flown with J2 (`heldCoastStep`, `rigidRuntime.step`), and Kepler from one frame misses the next by 3.6–6 m, so the drawing would jump at every frame.

A six-DOF flight's live view draws the simulation's own state (`lookahead = !sim.rigidRuntime`, src/replay/recorder.ts), so only its replay and seeks (`ReplayPlayer.frameAt`) were affected. A point-mass flight draws its live view through the same blend, so its docked spacecraft was off the port live as well. A docked step is 10 s, so that was about 108 m at mid-step.

### What a user saw

From the second investigation (code reading of every consumer of an interpolated frame's `r`, `v` and `debris[].r`):
- **Docked spacecraft:** it pulled away from the station's port and snapped back at every recorded frame. The station is drawn at `rendezvous.station.r`, which already took the cubic (`blendRendezvous`).
- **Watch view speed** (`groundSpeed`, from `r` and `v`): it dipped about 4 km/h half way through each span.
- **Engineer vis-viva card** (`visViva`, from `r` and `v`): half way through a 30 s span it read r 1 km low and the periapsis 7 km low, and its check against the blended elements turned '!' until the next frame.
- **Spent-stage heights in the telemetry list:** they flickered by 1 km.
- **Not affected:** altitude, the HUD, the onboard overlay, the map marker and the camera all read scalars blended on their own (`altitude`, `lat`, `lon`, `elements`), or directions only. The 3-D scene's origin is `frame.r`, so the Earth moved radially by 0.5 % between frames, which is too little to see.

## Change

`coast = !a.apollo && coasting(a) && coasting(b)` (the engine condition is gone from it), and `path` becomes:
- **Kepler:** `coasts && coast && !a.rigid && a.thrust <= 0` takes Kepler from the earlier frame. The point mass is as on main.
- **Cubic:** `coasts && ((coast && a.rigid) || rendezvous pair || (a.apollo && b.apollo))` takes the cubic through both ends.
- **Straight line:** everything else.

What that means:
- **A rigid vehicle coasting at both frames takes the cubic, whatever the earlier frame's thrust read.** The `a.thrust <= 0` gate exists for Kepler, which runs from one end. The cubic meets both ends' positions and velocities, so the tail of a cut-off needs no gate. Those spans were still on the line: 394 m off over Starship's 18.4 s span.
- **Apollo takes the cubic six-DOF or not, whatever its thrust,** as point-mass Apollo already did. This was the owner's choice, 2026-10-29: the session asked whether to include six-DOF Apollo, with the parachute trade-off below, and the owner answered "Include Apollo (Recommended)".
- **A point mass is unchanged:** Kepler with the engine off at the earlier frame, the line otherwise, the cubic in a rendezvous or Apollo.
- **The configuration hold runs first, unchanged.** It holds frame a across a stage, payload, fairing or rigid-identity change, so past it `a.rigid` and `b.rigid` are the same body.
- **Debris:** a body coasting beside the vehicle (not burning, above 140 km at both ends) takes the vehicle's `path`, as in #185, so it keeps its place. A body in the air, or under its own thrust, keeps the line.

Comments:
- The `interpolateFrames` doc comment moves from above `blendAbort` to the function, and now says when each blend applies.
- The comment in src/replay/recorder.ts no longer says rigid frames are blended in straight lines.
- tests/debris-replay.test.ts no longer counts six-DOF among the vehicles drawn on the line.

The cubic follows both ends' velocities. It relies on every velocity change inside a coast being pinned to a frame: an event's frames, a change of configuration (held), or a change of status. The second investigation found no unpinned velocity change in a coast in any shipped mission (see "Second investigation" below).

## Measured

Probe (gitignored `tests/probe/sag.test.ts`), all 20 watch missions (`watchMissionSettings`, `defaultDynamics`: six-DOF), recorded through `FlightRecorder.advance(1)`. After every second it captures the simulation's own state, the truth. For every truth sample inside a recorded span it compares two drawings with the truth, on the same frames:
- main's `interpolateFrames` (1842a86, copied into the probe);
- this branch's (03f894a).

Flights ran to the mission's end or T+4,000 s:
- Vostok-1 to T+6,600 s;
- Soyuz MS docking to T+13,500 s, which reached no rendezvous in six-DOF;
- Apollo 11 to T+1,200 s, 500 s of its parking orbit, since six-DOF Apollo steps at 0.01 s there.

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
| every other span: ascent, burn, prelaunch, escape, entry, landing, the span a burn begins in | 20 | 16,866 | — | unchanged, bit for bit | |

- **Never worse:** of 57,029 samples, 39,077 changed. None has the vehicle drawn more than 1 cm further from the flown position than main draws it.
- **What is left:** the 25.3 m is Starship's cut-off span itself, where the engine runs into the span. The 1.29 m is a 60 s thinned span near the transfer orbit's perigee. The cubic's error grows as span⁴: about 0.4 m at 60 s in a low orbit, 6 m at 120 s, 96 m at 240 s. The line's at those spans is 4 km, 16 km and 62 km.
- **Docked spacecraft:** measured with the second investigation's point-mass probe on Soyuz MS docking, docked at T+12,320.6 s and flown 600 s past it (16 spans, up to 37.2 s). The spacecraft was 1,496.7 m from its place at the port on main, and 0.000 m with the fix (0.056 m from the flown state). It is pinned by the test 'stays on the station's port while docked' (331 m off on main, 3 s into a 30 s span).
- **Spent bodies beside the vehicle:**
  - A coasting body takes the vehicle's way. In the second investigation's recorded six-DOF Soyuz, Blok I, which has its own rigid telemetry, was 0.028 m from its flown position and 0.0009 m from its place relative to the spacecraft.
  - A body in the air keeps the line, so its absolute error is the same as on main (Blok A 4.8 km, the H-IIA first stage 6.8 km). Its error relative to the vehicle, which no longer sags with it, can grow by up to about 1 km: the Apollo S-II went from 21 m to 1,054 m. These bodies are the stages coming down hundreds of kilometres behind the vehicle, so on screen nothing changes. This is #185's item "for later".

## Tests

- `tests/rigid-replay-arc.test.ts`, 15 tests. Synthetic frames carry a real six-DOF capture's `rigid`, one configuration at both ends. Each test case:
  - the frames reach the blend;
  - a 30 s orbit span stays on the orbit, not the chord 1 km inside it;
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
  - On main 10 of 15 fail: 4.1 m, 4,126 m, 4.1 m, 67.5 m, 331 m, 1,030 m four times, and 772 m.
  - With the fix 15 of 15 pass.
  - The five that pass on both are the guards: the frames reach the blend, the straight line is kept where it should be, the configuration hold, the point mass bit for bit, and purity.
  - The first commit (54abdd3) carried the first 7 of these tests alone, 4 failing on main.
- **Related files:** debris-replay, rigid-replay-arc, rigid-replay, rigid-event-boundary, rigid-failure-boundary, replay, vostok-replay, vostok-render, launch-abort, equations, session, rendezvous, rendezvous-fuel, live-stepping, orbit-handoff, apollo-own-launch, bundle-budget, audio, rigid-debris, eo-phy-6/apollo11, repo-hygiene, rigid-render and frames-view. 23 files, 293 tests, all pass.
- **CI:** run 40969743239 is green on 03f894a: plan, typecheck, build, test 1–3, browser-smoke 1–2 and verify.
- **Heavy:**
  - `tests/heavy/vostok1-recording.test.ts`: 1 of 1 pass, 166 s, Node 22.22.0, which is not the CI runtime.
  - It is the only heavy or six-DOF fleet file that reaches `interpolateFrames`. The function's only callers are `FlightRecorder.liveBetween` and `ReplayPlayer.frameAt`, and no other heavy or fleet file builds a recorder or a player, directly or through src/lessons or src/session.
  - The six-DOF fleet and the other heavy files fly simulations whose state this change cannot touch, since it only changes a drawing. They were not run.

## Second investigation

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
- **Test design:** the 15 tests above, and the user-visible symptoms listed under "What a user saw".
- **Critic:**
  - It recommended dropping the engine gate for a rigid vehicle, which became 03f894a.
  - It corrected two claims: Kepler is how a point-mass coast above the air is flown, but not a point mass in orbit (J2); and a point-mass live view changes for a docked spacecraft.

The second-agent review of the finished branch: pending.

## Size

`npx vite build`, `node scripts/bundle-budget.mjs`: ok, no ceiling raised.
- `index-*.js` 2,634,844 B and `flight.worker-*.js` 570,480 B: +2 B each on main's 2,634,842 and 570,478.
- Precache code 14,653,906 of 14,654,000 B (+4 B).

## Not changed, for later

- **Bodies in the air between 10–30 s frames** stay on the line: Blok A 4.8 km off, the H-IIA first stage 6.8 km. This is #185's item, unchanged here, except that their error relative to the vehicle can now grow (above).
- **Escapes and returns from orbit** (status 'abort') stay on the line. Mercury-Redstone's capsule above the air is 128 m off on 10 s spans (the cubic would be 2.2 m); Soyuz 18a's arc is similar. These spans have parachutes, tower jettison and retro-rockets in them, so they need their own look.
- **Thinned six-DOF Apollo:** the span under the main parachutes is drawn worse by the cubic than by the line once frames are 60 s or more apart. This is the owner's trade-off above, already true of point-mass Apollo. A fix for both could keep a frame about 12 s after `evt.mains`, or stop thinning the entry.
- **A point mass in orbit** keeps Kepler from the earlier frame. It is flown with J2, so its drawing jumps about 6 m at each 30 s frame. The cubic would fit there too.
- **A point mass's cut-off tail** (1–2 m) stays on the line.
- **The configuration hold** holds frame a for the whole span before a change: 13.9 km over Vostok's 2 s span from its orbit to its return, and 920 m over a 0.2 s span of the H-IIA's at T+392 s, where its configuration changes. Both are as on main.
- **Change map:** `scripts/verification/change-map.json`'s replay rule (src/replay/**) lists neither tests/debris-replay.test.ts nor tests/rigid-replay-arc.test.ts. A change to frame.ts already selects every unit test.
