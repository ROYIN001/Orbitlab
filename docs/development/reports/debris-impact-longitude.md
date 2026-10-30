# Debris: a spent body's impact longitude at its contact time / ลองจิจูดจุดตกของชิ้นส่วนที่เวลาสัมผัสพื้น

> **สรุปสำหรับเจ้าของ (ภาษาไทย)**
>
> - ปัญหา: ลองจิจูดของจุดตกที่รายการชิ้นส่วนที่ทิ้งแล้ว (แผง telemetry) และแผนที่ 2 มิติแสดง รวมทั้ง `lat`/`lon` ของเหตุการณ์ `evt.stageImpact` คลาดไปตามการหมุนของโลกระหว่างเวลาที่ชิ้นส่วนแตะพื้นกับเวลาที่ใช้คำนวณ
>   - ชิ้นส่วนแบบ point-mass ใช้มุมของโลกตอนต้น step
>   - ชิ้นส่วนแบบ six-DOF ใช้มุมตอนท้าย step
>   - ขณะยานลอยตัวหรืออยู่ในวงโคจร step ยาว 10–30 s จึงคลาดได้ถึง 0.125°
> - วัดจริงบน 20 ภารกิจในหน้าดูการปล่อย:
>   - คลาดมากสุด 0.072° (5.2 km ที่ละติจูด 50° N) คือฝาครอบ (fairing) ของ Vostok-1 แบบ point-mass
>   - six-DOF คลาดมากสุด 0.037° (3.7 km) คือฝาครอบของ Falcon Heavy และท่อนแรกของ H-IIA
>   - เห็นได้ในทศนิยมตำแหน่งที่สองของรายการ
> - แก้: ทั้งสองจุดใช้มุมของโลก ณ เวลาที่แตะพื้น (`restT`) เหมือนจุดอื่นในไฟล์เดียวกันที่ถูกอยู่แล้ว (`finishCatch`, `touchdown`, `comeDown` ใน fall.ts) แก้ 2 บรรทัดใน src/physics/sim/debris.ts การบินไม่เปลี่ยน เปลี่ยนเฉพาะค่าลองจิจูดที่บันทึกไว้
> - ผล: ทุกชิ้นที่ตกตรงกับลองจิจูด ณ เวลาแตะพื้นพอดี (คลาด 0) ทั้ง 90 ชิ้น point-mass และ 17 ชิ้น six-DOF ที่เคยคลาด
> - เหตุการณ์ที่ค่าเปลี่ยน: `lon` ที่ปัดเป็นทศนิยม 2 ตำแหน่งเปลี่ยนใน 16 จาก 71 เหตุการณ์แบบ point-mass และ 4 เหตุการณ์แบบ six-DOF ส่วนฝาครอบไม่มีเหตุการณ์
> - Fingerprint และ golden:
>   - D01 fleet fingerprint และ golden ของ Apollo 11 (EO-PHY-6) ผ่านโดยไม่ต้องบันทึกใหม่ เพราะ fingerprint เก็บแค่ key และเวลาของเหตุการณ์ และ golden ของ Apollo 11 เริ่มหลังชิ้นส่วนทุกชิ้นตกแล้ว
>   - ไม่มี golden ใดต้องบันทึกใหม่ จึงไม่ต้องขออนุมัติจากเจ้าของในเรื่องนี้
> - เทสต์ใหม่ `tests/debris-impact-longitude.test.ts` 2 ข้อ fail ก่อนแก้ทั้งสองข้อ (คลาด 0.0166° และ 0.0241°) และผ่านหลังแก้
>   - ข้อ six-DOF บิน Soyuz ไปสถานีจริงทั้งเที่ยวถึง T+1,076 s จึงใช้เวลาราว 75 s ในชุดเทสต์ปกติ
> - ขนาด: precache code +27 B (เหลือ 21 B ใต้เพดาน) ไม่ได้ขึ้นเพดาน
> - การ merge: เป็นการแก้บั๊ก (ผิด → ถูก) มีเทสต์ที่ fail ก่อนแก้ ไม่ได้ขึ้นเพดาน และไม่ได้เปลี่ยน assertion เดิม จึงเข้าเงื่อนไขอนุมัติถาวรสำหรับการแก้บั๊ก เมื่อ agent ตัวที่สองตรวจแล้วไม่มีข้อค้าง และ CI ผ่าน
> - ลำดับ merge กับ #195: #195 แก้ไฟล์เดียวกันคนละช่วง (ท้าย `stepDebris`) จึงไม่ชนกัน เมื่อ merge ทั้งคู่แล้ว ขนาดรวมยังอยู่ใต้เพดานใหม่ที่ #195 ขอ

```yaml
item: debris impact longitude at the contact time (bug fix)
change_kind: bug fix (wrong → right); no existing assertion changed, no ceiling raised, no fingerprint or golden re-recorded
owner_authorization: 'owner in chat to this session, 2026-10-30, the task as given (quoted under Authorization): "Fix both sites to use the contact time."'
app_code: src/physics/sim/debris.ts
tests: tests/debris-impact-longitude.test.ts (new)
base_sha_verified_on: {sha: ef9d3f6, date: 2026-10-30}
branch: claude/lucid-darwin-tcwfxj
pr: (draft, number on the PR)
budget: 'unchanged ceilings: precache code 14,653,979 B (+27 B on main ef9d3f6, 21 B under 14,654 kB); index-*.js +3 B; flight, tune, monte-carlo, ratings, readiness and recheck workers +4 B each'
second_agent_review: (running; result added here)
```

## Authorization

Recorded verbatim, as SESSION-PROTOCOL §2 (D-65) asks. The owner gave this task in chat to this session on 2026-10-30. Its opening and its task list, quoted as given:

> Orbitlab (Vite + TypeScript + three.js), repository ROYIN001/Orbitlab. Before starting, follow docs/development/SESSION-PROTOCOL.md: record the owner's authorization for this task verbatim (D-65), and add a `changes/<branch>.md` fragment and a report under docs/development/reports/.
>
> ## Task
> 1. Write a failing-first vitest test: a body that comes down mid-step, whose `impact.lon` should equal `eciToLatLon(contact r, gmst0 + OMEGA_EARTH * restT)` within about 1e-6°. Fly a point-mass watch mission whose fairing or Blok A comes down during a 10–30 s orbit step, and a six-DOF one whose core comes down during a held-coast step.
> 2. Fix both sites to use the contact time.
> 3. The change alters event params (`evt.stageImpact` lat/lon, rounded to 2 decimals) and therefore possibly the flights' event logs. Check the fleet fingerprints (tests/d01-fleet-fingerprint.test.ts, tests/heavy/sixdof-fingerprint.test.ts) and any golden that includes event params. If any must be re-recorded, that needs the owner's approval: say so rather than re-recording silently.
> 4. Run `npx tsc --noEmit -p .`, the related test files, and `npx vite build` followed by `node scripts/bundle-budget.mjs` (budgets.json; a raise needs the four D-38 parts, including the owner's approval). A second agent reviews it (physics work, D-25).

The bug was found in PR #195 and listed in its report (docs/development/reports/replay-debris-touchdown.md, on its branch) under "Not changed, for later".

## Cause

`Debris.impact` (latitude and longitude, degrees) is where the telemetry panel's spent-stage list (src/ui/telemetry.ts) and the 2-D map (src/ui/map.ts, for a dead body) say a body came down. `evt.stageImpact` and the landing events carry the same place rounded to 2 decimals. The longitude is the body's inertial position at contact, turned by Greenwich's sidereal angle at the contact time.

`stepDebris` (src/physics/sim/debris.ts) finds two kinds of contact part-way through a step, and both took the angle of another instant:
- **A passive point mass** (the sub-step loop): `eciToLatLon(d.r, this.sim.state.theta)`. `Simulation.step` updates `s.theta` only after `stepDebris` returns (`this.debrisTracker.stepDebris(dt); s.theta = this.plan.gmst0 + OMEGA_EARTH * s.t;`, src/physics/simulation.ts), so this was the angle at the step's start. The contact is at `restT = t − dt + (k + 1)·h`, the end of the sub-step that went below the ground.
- **A six-DOF body** (`if (result.contact)`): `this.sim.plan.gmst0 + OMEGA_EARTH * this.sim.state.t`, the angle at the step's end. The rigid runtime finds the contact in its own 0.01 s sub-steps and returns its time as `contactTime` (src/physics/rigid/debris-runtime.ts, `finish` and `catchAt`), which the line above already keeps in `restT`.

The error is OMEGA_EARTH × (restT − step start) for the first and OMEGA_EARTH × (step end − contactTime) for the second. While the vehicle coasts or orbits, a point-mass step is 10–30 s (`suggestedDt`: 10 s in a coast above 140 km, period/300 up to 30 s in orbit), and a six-DOF held-coast step is as long (`heldCoastWindow`). So the error is up to 7.29 × 10⁻⁵ rad/s × 30 s = 0.125°. In a step of 0.01–0.5 s it is 0.00004–0.002°.

### Sites checked and found right

- `finishCatch` and `touchdown` (a targeted return, `stepReturning`): they take `t`, the sub-step's own clock, which is the contact time; `d.r` is at that time.
- `comeDown` and `placeOf` (src/physics/sim/fall.ts): every caller passes its flight's own clock after stepping to the contact (`FallingBody.step`, `ModuleEntry` twice in src/physics/sim/module-entry.ts, `CrewDescent.land` in src/physics/sim/crew-descent.ts), and `d.r` is the contact state.
- `planReturn`: the drone ship's place is the prediction's `p.r` at the prediction's `p.t`.
- The rigid runtime's own miss distances (`distanceFromTarget(contact.r, …, contactTime)`) use the contact time.
- `DebrisTracker.rest` turns a landed body with the Earth from `restT` to the step's end. With the contact's angle, its drawn place and `impact` now agree.

## Change

Both sites take `this.environment.theta(d.restT)`, the tracker's own `DebrisEnvironment.theta` (`gmst0 + OMEGA_EARTH * t`, the same expression). In the six-DOF branch `d.restT` is the runtime's `contactTime`, set on the line above; the runtime returns a contact only with its time, so the non-null assertion holds. This form was chosen for its size: it costs 4 B a chunk, against 10 B for `result.contactTime ?? this.sim.state.t`, which did not fit (below).

Nothing in the flight reads `Debris.impact`. Its readers are the UI (src/ui/telemetry.ts, src/ui/map.ts), frame capture and replay (src/physics/frame.ts, src/replay/simview.ts) and the events' params. The flight itself is unchanged; only the recorded longitude and the events' `lon` (and `lat` never) change.

## Measured

Probe (gitignored `tests/probe/impact-theta.test.ts` and `impact-round.test.ts`): all 20 watch missions, built with `watchMissionSettings(id, 2026-09-22T03:00Z)` and flown as tests/watch-missions-flights.ts flies them, one `step(suggestedDt())` at a time:
- point-mass (calm, seed 1) to T+3,000 s, or until the mission is done and every body is down or in orbit;
- six-DOF (`defaultDynamics`, as the app flies them) to T+2,000 s, or the same.

For every body that came down it records the step and the contact: for a point mass `d.r` and `restT`, for a six-DOF body the runtime's `contact.r` and `contactTime`. "Off" is `impact.lon` against the longitude at the contact time.

| | bodies down | in a step ≥ 10 s | on main | worst on main | with the fix |
|---|---|---|---|---|---|
| point mass, passive (`stepDebris` sub-steps) | 90 | 35 | all 90 on the step's start's angle | 0.0724° (5.17 km): Vostok-1's fairing halves, 17.8 s orbit step | 0 (bit for bit) |
| point mass, targeted return (`touchdown`, `finishCatch`) | 7 | 1 | right | 0 | 0 |
| six-DOF rigid bodies | 88 | 17 | the 17 on the step's end's angle; the other 71 came down in 0.01 s steps, where the contact is the step's end | 0.0366° (3.59 km): Falcon Heavy's fairing, 30 s orbit step | 0 (bit for bit) |
| point masses in six-DOF launch aborts | 9 | 0 | step's start, 0.01 s steps | 0.00004° | 0 |

The largest on main, by mission (point mass unless marked):

| Body | Step | Off | Distance |
|---|---|---|---|
| Vostok-1 fairing halves | 17.8 s, orbit | 0.0724° | 5.2 km at 50.05° N |
| Falcon 9 (Bandwagon) fairing halves | 10 s, coast | 0.0397° | 3.8 km |
| Soyuz MS docking, MS-25: Blok A | 10 s, rendezvous | 0.0376° | 2.7 km |
| Sputnik-1 boosters | 19.2 s, orbit | 0.033–0.037° | 2.4–2.7 km |
| Falcon Heavy fairing halves, six-DOF | 30 s, orbit | 0.0327–0.0366° | 3.2–3.6 km |
| H-IIA first stage, six-DOF | 10 s, held coast | 0.0364° | 3.7 km |
| Soyuz to the station: Blok A, six-DOF | 10 s, held coast | 0.0241° | 1.7 km |
| Vostok-1 Blok A | 17.8 s, orbit | 0.0166° | 0.9 km |

The task's figure, "up to 0.07°, about 5 km at 50° N", is Vostok-1's fairing.

### What changes in the events

- **Point mass:** of 71 impact and landing events, 16 change their `lon` at 2 decimals. These are Blok A on Soyuz to the station, Soyuz MS docking, MS-16 and MS-25; Sputnik-1's four boosters; Vostok-1's Blok A; Apollo 11's S-II; H-IIA's first stage; and a few strap-ons in 0.25 s steps whose value sat on a rounding edge (two on MS-16, two on Angara-A5, one on H-IIA). No `lat` changes.
- **Six-DOF:** 4 events change: Blok A on Soyuz to the station, Angara-A5's URM-1 core, Ariane 6's core and H-IIA's first stage.
- **Fairings** raise no event, so theirs change only in the list and on the map.
- The events' `lat`/`lon` appear only in their text (`evt.stageImpact`: "{name} impact at {lat}°, {lon}°").

### Fingerprints and goldens

- **tests/d01-fleet-fingerprint.test.ts** (27 point-mass fleet flights) hashes the state each second, the telemetry and the event log as `[key, t]`: no params, and no debris state. Passes with the fix, not re-recorded.
- **tests/heavy/sixdof-fingerprint.test.ts** (21 six-DOF flights of 160 s) hashes the vehicle's state and rigid telemetry each second, the telemetry and the events' `[key, t]` through `missionFingerprint` (tests/flex-golden-harness.ts). Nothing it hashes reads `Debris.impact`. Run result below.
- **tests/eo-phy-6/apollo11.test.ts** hashes every event's params in hex from the TLI ignition to the entry interface. Every Earth impact (S-IC at T+494 s, S-II at T+1,174 s point-mass) comes before the TLI. Passes with the fix, not re-recorded.
- **src/lessons/assessment/flights.json** (`toMatchFileSnapshot`) holds events, but no impact events within its flights. Passes.
- No other stored file holds an impact event: searched `tests/fixtures`, `tests/eo-phy-6/ref`, `src/data`, `public`, and every `*.json` outside node_modules (the one hit is an audit evidence file under docs/, not a test input).

Nothing needs re-recording, so nothing waits for the owner's approval on this point.

## Tests

- **`tests/debris-impact-longitude.test.ts`** (new), 2 tests:
  - **Point mass, Vostok-1** (`watchMissionSettings('vostok1')`, calm, seed 1): Blok A and both fairing halves come down in 17.8 s orbit steps. The test checks the case it pins: status `orbit`, a step of at least 10 s, the contact more than 1 s after the step's start and more than 0.1 s before its end. Then `impact.lon` equals `eciToLatLon(d.r, gmst0 + OMEGA_EARTH · restT)` within 1e-6°, `impact.lat` the geocentric latitude, and Blok A's `evt.stageImpact` carries both at 2 decimals. 1 s.
  - **Six-DOF, Soyuz to the station** (`defaultDynamics`, as the app flies it): Blok A comes down 4.2 s into a 10 s held-coast step at T+1,075.6 s. A spy on `RigidDebrisRuntime.prototype.step` keeps the runtime's `contact.r` and `contactTime`. The test checks that the rigid runtime brought it down, in a coast or orbit step of at least 10 s (in six-DOF only a held-coast step is longer than a control tick), with the contact more than 1 s inside. Then the same longitude, latitude and event checks. About 75 s locally, nearly all of it the 0.01 s-step ascent. It is the fastest six-DOF watch mission with a core down in a held-coast step; the other three (Angara-A5's URM-1 core, Ariane 6's core, H-IIA's first stage) took 130–165 s to T+2,000 s in the probe, against 76–80 s for this one.
- **Failing first:** on the fix's parent (bcd6fe3, the test alone on main) both fail: 0.016552° (Blok A, point mass) and 0.024149° (Blok A, six-DOF). With the fix both pass.
- **Related files** (run on the fix): see "Checks run".

## Checks run

- `npx tsc --noEmit -p .`: clean.
- Related test files: (result added here).
- `npx vite build` then `node scripts/bundle-budget.mjs`: ok. Built side by side with main (ef9d3f6) in a worktree:

  | | main | this PR |
  |---|---|---|
  | precache code | 14,653,952 B | 14,653,979 B (+27; ceiling 14,654,000) |
  | index-*.js | 2,634,867 B | 2,634,870 B (+3) |
  | flight, tune, monte-carlo, ratings, readiness, recheck workers | | +4 B each |

  The first form of the fix (`gmst0 + OMEGA_EARTH * (result.contactTime ?? state.t)` and `gmst0 + OMEGA_EARTH * restT`) was 69 B, 21 B over the ceiling. `OMEGA_EARTH` minifies to one letter, so the six-DOF site's old expression was already long and the point-mass site's `state.theta` short. Reading `restT` through `environment.theta` at both sites brought it to 27 B. No ceiling is raised.
- Heavy (shared physics work): (result added here).

## Merge order with #195

#195 (replay touchdown blend, open, built on #187 and #191) changes the end of `stepDebris` (it keeps the contact time in `impact.t`) and nothing on the two lines changed here, so the two diffs do not overlap. #195 raises 'precache code' to 14,655 kB with the owner's approval and measured 14,654,589 B; with this PR's 27 B the sum is 14,654,616 B, under that ceiling. If this PR merges first, #195 rebases onto it as planned and its own measurement grows by 27 B.

## Not changed, for later

- **The callout's time.** An impact event is stamped with the time its step ends (`Simulation.event`), up to 30 s after the contact. Stamping it with the contact time would change the event log's times, which every fingerprint hashes. This is #195's item "The callout trails the picture".
- **The point-mass contact is under the surface.** It is the end of the sub-step that crossed the ground, up to one sub-step's fall under it, and the longitude is taken there. #195 lists this too.
