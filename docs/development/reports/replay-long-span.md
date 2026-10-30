# Replay: long spans in a thinned recording / ช่วงยาวในการบันทึกที่ถูก thin

> **สรุปสำหรับเจ้าของ (ภาษาไทย)**
>
> - ปัญหา 1: เมื่อการบันทึกยาวเกินงบเฟรม (six-DOF 6,000 เฟรม, point-mass 12,000 เฟรม) ตัวบันทึก (recorder) จะ thin เฟรม รอบสุดท้ายของช่วง coast ไม่มีเพดานช่องว่าง และลบเฟรม coast ครึ่งหนึ่งทุกครั้งที่ทำงาน เฟรมเก่าจึงห่างกันเป็นชั่วโมงในขณะที่เฟรมใหม่ห่างกันแค่นาทีเดียว
>   - Soyuz MS แบบ six-DOF ที่เชื่อมต่อกับสถานีนาน 12,000 s เหลือช่วงหนึ่งยาว 7,981 s
>   - ในช่วงนั้นยานถูกวาดเป็นเส้นตรง ห่างจากตำแหน่งจริง 9,271 km ส่วนสถานีถูกวาดด้วย cubic ห่าง 23,162 km ยานกับสถานีจึงห่างกัน 14,945 km ทั้งที่เชื่อมต่อกันอยู่
> - ปัญหา 2: แคปซูล Apollo มีสถานะ 'orbit' ตั้งแต่เข้าบรรยากาศจนลงน้ำ จึงถูกบันทึกทุก 30 s และถูก thin ไปพร้อมกับ coast จนห่าง 60 s ขึ้นไป
>   - Apollo ใช้ cubic ทุกช่วง (เจ้าของเลือกไว้)
>   - ใต้ร่มหลัก ร่มทำให้แคปซูลช้าลงใน 10–12 s แรก cubic จึงคลาด 202 m ที่ 60 s และ 1,190 m ที่ 240 s ส่วนเส้นตรงคลาดราว 147 m
> - แก้ (ฝั่งตัวบันทึกเป็นหลัก ไม่ได้ใช้ Kepler สองด้าน):
>   - รอบสุดท้ายของ coast หยุดที่เฟรมละ 10 นาที (`MAX_COAST_GAP`) ช่วงที่เหลือจึงเท่า ๆ กัน ไม่มีช่วงยาวเป็นชั่วโมง 10 นาทีสั้นกว่าหนึ่งในสี่ของคาบวงโคจรใด ๆ ยานจึงได้ cubic เสมอ
>   - สถานีเคลื่อนแบบเดียวกับยาน (`path`) ถ้ายานใช้เส้นตรง สถานีก็ใช้เส้นตรง ทั้งสองจึงไม่แยกกัน
>   - เฟรม 'orbit' ที่อยู่ในบรรยากาศ (ต่ำกว่า 140 km) บันทึกทุก 2 s เหมือน coast ในบรรยากาศ และถูก thin พร้อมกับช่วงบินแบบละเอียด ไม่ใช่พร้อม coast ในภารกิจทั้ง 20 ของหน้าดูการปล่อย มีแค่แคปซูล Apollo ที่เข้าข่ายนี้
>   - Apollo ยังใช้ cubic ทุกช่วงตามที่เจ้าของเลือก แค่ได้เฟรมที่ถี่พอ
> - ผล:
>   - Soyuz MS six-DOF เชื่อมต่อ 12,000 s: ช่วงยาวสุด 7,981 s → 570 s ยาน 9,271 km → 3.0 km สถานี 23,162 km → 3.0 km ยานกับสถานีห่างกัน 18 m เท่าที่บินจริง
>   - Apollo 11 (point-mass ลอยน้ำอีก 4 ชั่วโมงหลังลงน้ำ จนถูก thin): ใต้ร่มหลัก 202 m → 0.8 m ช่วงเข้าบรรยากาศ 2,251 m → 0.3 m
> - ขนาด: เล็กลง index −5 B, flight worker −7 B ไม่ได้ขึ้นเพดาน (precache code เหลือ 60 B)
> - เทสต์: 5 เทสต์ใหม่ fail บน head ของ #187 ทั้ง 5 และผ่านหลังแก้ ไม่ได้เปลี่ยน assertion เดิม
> - ต่อจาก #187: PR นี้สร้างบน branch ของ #187 ควร merge หลัง #187

```yaml
item: replay long spans in a thinned recording (bug fix): the last coast thinning pass, the station's blend, Apollo's entry frames
change_kind: bug fix (wrong → right); no existing assertion changed, no ceiling raised; recordings change (cadence of an orbit in the air, thinning), the simulation does not
owner_authorization: 'owner in chat to this session, 2026-10-30: the task "the flight recorder ... thins stored frames ... Two things were left as they are on main ... Done when: failing-first vitest tests pin the long-span cases ..."; then "ทำต่อ" (continue)'
app_code: src/replay/recorder.ts, src/physics/frame.ts
tests: tests/replay-long-span.test.ts (new); tests/replay.test.ts (+2); tests/rigid-replay-arc.test.ts (+1, the docked-frame builder moved to module level)
base_sha_verified_on: {sha: fa92cf6, date: 2026-10-30, note: 'the head of #187 (claude/practical-lovelace-2ndbww), itself on main 1842a86'}
branch: claude/ecstatic-darwin-wijyuc
pr: (stacked on #187)
second_agent_review: see "Second-agent review"
```

## Cause

### The last coast pass had no gap limit

`FlightRecorder.decimate` (src/replay/recorder.ts) runs one pass each time the recording goes over its frame budget, the first pass that drops anything:

1. coast and orbit frames, to a frame a minute (`MAX_THINNED_GAP`);
2. the dense flight, to a frame a second (`DENSE_THINNED_GAP`);
3. coast and orbit frames again, **with no gap limit**;
4. any frame, to a frame a minute;
5. any frame, with no limit.

Pass 3 drops every other coast frame older than 30 s each time it runs. New frames keep arriving at the orbit's 30 s, so the oldest coast frames are halved on every run while the newest have been halved once or twice. The coast ends up with spans that double going back in time.

A six-DOF Soyuz MS docked for 12,000 s shows it. Its rendezvous (status 'rendezvous', so dense flight to the recorder) keeps 5,250 of the 6,000 frames, and the docked part (status 'orbit') is left with 36. The longest docked span is 7,981 s, 1.5 orbits, while the last ones are a minute.

Over that span:
- the spacecraft takes the straight line (#187's quarter-period bound): 9,271 km off where it flew;
- the station takes the cubic in `blendRendezvous` at any span: 23,162 km off, 14,945 km from the spacecraft docked to it.

### Apollo's entry was thinned with the coast

Apollo's command module keeps the status 'orbit' from the entry interface to the water (src/physics/sim/apollo.ts `stepCm`). To the recorder that is an orbit:
- its cadence was the orbit's 30 s;
- passes 1 and 3 thinned it with the coast.

Apollo takes the cubic `hermite` at any span (#187; the owner's choice). The cubic follows both ends' velocities. Under the mains the module slows from about 55 m/s to 9.5 m/s within 10–12 s of their opening (reefed at 10 % for 6 s, 35 % to 10 s, then full), then falls steadily. From the frame after `evt.mains`, over the flown entry of point-mass Apollo 11 (probe, frames every 0.5 s), metres from the flown position:

| Span | cubic | line |
|---|---|---|
| 30 s (the orbit's cadence) | 47 | 120 |
| 60 s (thinned once) | 202 | 147 |
| 120 s | 529 | 155 |
| 240 s | 1,190 | 147 |

The cubic does well wherever the deceleration is spread over the span:
- **From 12 s after the mains:** 0.66, 1.39, 2.71 and 5.88 m at 30, 60, 120 and 240 s, against the line's 2.8–198 m.
- **Under the drogues:** better than the line at every span.
- **Through the hypersonic entry, 30 s spans:** 386 m against the line's 5,955 m.

So the frames, not the cubic, were the problem.

Point-mass Apollo 11 at 12,000 frames and at 6,000 records its entry after its last decimation, so it is not thinned on the way down. It is thinned once the recording goes over its budget after the entry, for example with the module left on the water. Flown four hours past splashdown at 12,000 frames on #187's head:
- the entry's 34 frames go to 20, 60 s apart;
- the module is drawn 2,251 m off in the entry, 195 m under the drogues and 202 m under the mains.

## Change

**src/replay/recorder.ts**
- **The coast ceiling.** `MAX_COAST_GAP = 600`, and pass 3 is `thin(coasting, MAX_COAST_GAP)`. Old coast frames stop at ten minutes and the new ones catch up; only then does pass 4 thin the rest of the flight to a minute, and pass 5 is unchanged, so the budget is still a bound.
  - Ten minutes is under a quarter of any orbit's period. The shortest, at 140 km, is 87 minutes, a quarter of it 1,310 s. So a six-DOF vehicle always takes the cubic between two coast frames.
  - The cubic's error grows as the span's fourth power. In a low orbit it is about 0.4 m at a minute and 2–4 km at 8–10 minutes; the chord sags about 400 km at ten minutes.
  - Spans saturate a little under the ceiling (frames 30 s apart halve to 480 s), 570–595 s in the runs below.
  - Apollo 11's eight days of coast need about 1,200 frames at ten minutes, so neither budget reaches pass 4 (measured below).
- **The air goes with the dense flight.** `coasting` now asks for `altitude >= ATMOSPHERIC_CEILING` (140 km) as well, so a coast or orbit frame in the air is thinned by pass 2 (to a frame a second) and passes 4–5, not by 1 and 3.
- **An orbit in the air every 2 s.** The 'coast' and 'orbit' cases of `interval` are one case now. An orbit frame below 140 km gets the 2 s a coast there already had.
  - About 450 frames for Apollo's entry, about 415 more than at 30 s; the frame budget, a count, is unchanged.
  - Every frame is 2 s apart, so 12 s after the mains there is always a frame.
  - The merge also pays for the rest: it removes a duplicated `return` (see Size).
  - A 'coast' frame now passes the `burning` and Vostok `deorbit` checks first. Both are false for every coast:
    - `burning` is set only for an orbit under more than a kilonewton or a rendezvous burn (`intervalOf`, `flyStep`);
    - only Vostok-1 has `orbit.deorbit`, and it has no coast frame (the fleet probe below).

**src/physics/frame.ts**
- **The station takes the spacecraft's way.** `blendRendezvous` takes `interpolateFrames`'s `path` and gives the station `path(a.station.r, a.station.v, b.station.r, b.station.v)`, where it took `hermite` at any span.
  - In a rendezvous (both frames 'rendezvous') that is the cubic, as before.
  - Docked or after an aborted docking (status 'orbit', with the rendezvous's rigid telemetry): the cubic under a quarter of the orbit, the line on a longer span, as the spacecraft.
  - A frame with a rendezvous always carries rigid telemetry (`RendezvousSim.sync` writes both), so `path`'s Kepler branch, which needs `!a.rigid`, does not reach the station.
  - `rel`, the spacecraft's place in the station's turning axes, keeps the cubic. It is constant while docked.
  - The byte count is the same: `path` takes four arguments where `hermite` took six.
- Comments: `path` says the station shares it; `blendRendezvous` says why.

## Measured

Probes are gitignored (`tests/probe/`), run on #187's head (fa92cf6) and on this branch's code (a22922f), the same flights.

**Six-DOF Soyuz MS docking (two-orbit profile), flown 12,000 s past docking, 6,000 frames** (the second agent's case on #187, reproduced exactly); truth every 10 s docked step:

| | #187's head | this branch |
|---|---|---|
| Frames, decimations | 5,983, 19 | 5,995, 23 |
| Docked frames | 36 | 48 |
| Longest docked span | 7,981 s | 570 s |
| Spacecraft, metres off where it flew | 9,270,840 | 3,021 |
| Station, metres off | 23,161,904 | 3,021 |
| Spacecraft to station | up to 14,945 km | 18.0 m, as flown |
| Ascent's widest gap; rendezvous frames | 1.0 s; 5,250 | 1.0 s; 5,250 |

**Point-mass Soyuz MS docking, 36,000 s past docking, 3,000 frames** (the end-to-end test's flight, 2 s of wall time):

| | #187's head | this branch |
|---|---|---|
| Longest docked span | 20,505 s | 595 s |
| Spacecraft, metres off | 12,411,392 | 3,602 |
| Station, metres off | 36,243,277 | 3,602 |
| Spacecraft-to-station distance, off the flown one | 33,107 km | 0.01 m |
| Ascent's widest gap; rendezvous' widest gap | 1.0 s; 30 s | 1.0 s; 30 s |

**Point-mass Apollo 11, flown four hours past splashdown, 12,000 frames** (the end-to-end test's flight); truth every 0.5 s step from the entry interface to the water:

| | #187's head | this branch |
|---|---|---|
| Entry frames at splashdown, after | 34, 20 | 449, 450 |
| Longest span in the air | 60 s | 2 s |
| Entry interface to drogues, metres off | 2,251 | 0.3 |
| Under the drogues | 195 | 0.3 |
| Under the mains | 202 (the line: 147) | 0.8 (the line: 2.8) |
| Ascent's widest gap | 1.0 s | 1.0 s |

**Apollo 11 at the six-DOF budget** (point mass held to 6,000 frames, flown to the water): 30 decimations; the coast's widest span 480 s, the ascent's 1.0 s, so pass 4 never ran; all 455 frames in the air kept.

**The docking span itself** (point-mass Soyuz MS, the 5 s span from 'rendezvous' to 'orbit' at `evt.docked`): the spacecraft took the line there on #187's head and the station the cubic, so they were drawn up to 41.5 m apart (18.04 m flown). Both take the line now: 18.04 m. The spans either side are unchanged (cubic, both).

**The fleet** (all 20 watch missions, point mass, unthinned, to the end or T+30,000 s, Apollo 11 to the water, MS-25 to T+200,000 s): the only 'orbit' frames below 140 km are Apollo's entry (36 frames, T+702,185 to T+703,079). No mission has a coast frame below 140 km in point mass, and Vostok-1, the one flight with a deorbit time, has no coast frame. So the cadence change touches Apollo's entry only; the thinning changes touch only recordings past their budget.

## Tests

- `tests/rigid-replay-arc.test.ts`, +1: 'keeps the station with the docked spacecraft over a span longer than a quarter of the orbit'.
  - A 7,981 s docked span (synthetic frames, a real six-DOF capture's telemetry): the station on the line, and the spacecraft within the port's 20 m of it.
  - Under a quarter (1,060 s), both still on the cubic.
  - The docked-frame builder moved out of the existing docked test to module level; that test's assertions are unchanged.
- `tests/replay.test.ts`, +2 (toy recordings through the recorder's own step loop, as the existing thinning tests do):
  - 28 hours of orbit in 800 frames: no orbit span over ten minutes, the ascent still a frame a second;
  - an orbit in the air (Apollo's entry), then hours on the ground: every frame in the air 2 s apart and kept, the orbit above giving the frames.
- `tests/replay-long-span.test.ts` (new, 2 tests, about 9 s together): the two point-mass flights above, through the recorder and the player.
  - **Docked:** no docked span over ten minutes; the spacecraft-to-station distance within 0.5 m of the flown one at every sample; the spacecraft within 5 km of where it flew.
  - **Apollo:** thinned after the entry; every span in the air 2 s; under the mains within 5 m, through the entry within 20 m.
- **Failing first:** on fa92cf6 all 5 fail:
  - the station 5,666 km from the docked spacecraft;
  - a 7,590 s orbit span;
  - 8 frames in the air where 449 are expected;
  - a 20,505 s docked span;
  - 60 s spans in Apollo's entry.

  On a22922f all 5 pass.
- **Related files** (every test file that builds a recorder, a player or a session, and #187's list): 30 files, 450 tests, all pass on a22922f.
  - custom-vehicle, d06-custom-satellite, d06-satellite-launch, debris-replay, equations, instructor-mode, launch-abort, lesson-grading-end, live-stepping, mcp, orbit-handoff;
  - rendezvous-fuel, rendezvous, replay-long-span, replay, rigid-event-boundary, rigid-failure-boundary, rigid-replay-arc, rigid-replay, session;
  - vostok-render, vostok-replay, apollo-own-launch, bundle-budget, audio, rigid-debris, eo-phy-6/apollo11, repo-hygiene, rigid-render, frames-view.
- **Full unit suite and heavy:** see the PR (run on a22922f).
- **Typecheck:** `npx tsc --noEmit -p .` clean.

## Size

`npx vite build`, `node scripts/bundle-budget.mjs`: ok, no ceiling raised.
- `index-*.js` 2,634,862 B, −5 B on #187's 2,634,867.
- `flight.worker-*.js` 570,496 B, −7 B on 570,503.
- Precache code 14,653,940 of 14,654,000 B: −12 B, 60 B left (48 B on #187).

## Options weighed

- **A two-sided Kepler blend** (Kepler forward from frame a and back from frame b, mixed with a smoothstep weight): 12.5 km off over 8,000 s where the line is 9,271 km. Not built.
  - By #187's estimate it is about 160 B in each of the two chunks, and precache code had 48 B.
  - Over spans under ten minutes, which the recorder now leaves, the cubic is better than it: Kepler from either end misses a J2 coast by metres.
- **The quarter-period bound in `blendRendezvous` alone** would have kept the pair together but left both on a chord 9,271 km off. Taking `path` does that at no cost, and the recorder change removes the long span.
- **For Apollo:**
  - **Keep a frame about 12 s after `evt.mains`.** It needs the recorder to know about one event, or a new event: new strings in three languages and a changed event log. The 2 s cadence in the air gives that frame anyway.
  - **Stop thinning the entry alone.** It leaves the 30 s spans: 47 m under the mains, 386 m in the entry.
  - **Blend that span differently** (the line under the parachutes). It would be worse than the cubic at 30 s (120 m against 47 m) and changes the owner's choice. Not taken.

## Not changed, for later

- **A recording long enough still gets long spans.** Once every coast span is at ten minutes and everything else at a minute, pass 5 halves everything, as before, so the budget stays a bound.
  - At 6,000 frames that is about 40 days of coast.
  - There the spacecraft and the station keep the line together (the frame.ts change). A two-sided Kepler blend would draw it better.
- **Pass 4 can still thin the entry** to a minute, after the coast is at ten minutes everywhere. Apollo 11 does not reach it at either budget. If it does, the mains trade-off of #187 returns.
- **Apollo's flight near the Moon** (status 'orbit', its altitude counted from the Earth) is thinned with the coast, as on main. It now stops at ten minutes, where it had no limit: the lunar orbit, and the powered descent and ascent at a frame a second.
- **Rendezvous frames** (status 'rendezvous') are dense flight to the recorder; pass 5 can stretch them. The spacecraft and the station both take the cubic there, together, as before.
- The items #187 lists for later (bodies in the air, escapes, a point mass in orbit, the configuration hold, aliasing) are unchanged.

## Second-agent review

Run on a22922f; the result is recorded on the PR.
