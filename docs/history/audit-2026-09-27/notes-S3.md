# S3 — Watch ending (A9): session notes

Branch `claude/audit0927-s3-watch-ending`, from `origin/main` at `dba7b0a`.
Files changed: `src/ui/watch-logic.ts`, `src/ui/watch.ts`, `tests/watch-logic.test.ts`,
and new `watch.parking.*` / `watch.end.*` keys in `src/i18n/{en,ru,th}.ts`. Nothing
under `src/physics/**` was touched, so every built-in flight is unchanged.

## What was wrong

`reachedOrbit()` returned true on `evt.parkingOrbit`, and `flightEnding()` returned
`'orbit'` as soon as `reachedOrbit()` was true and no stage was still flying home.
Bandwagon-1 therefore showed "Mission accomplished" at T+07:59, with its 200 km
height, even though it still had 46 minutes of coast and a burn to fly.

## The rule now

- **`missionOrbit(frame, events)`** is the flight's end in orbit. It is true when
  the frame status is `'orbit'` or the log has `evt.targetOrbit` / `evt.offTargetOrbit`.
  The physics sets those in exactly one place (`reachTargetOrbit` in
  `src/physics/sim/burns.ts`), and every orbital flight that is not a rendezvous
  ends there, whether on target or off it: a burn alignment timeout, not enough Δv,
  or the six-DOF prediction failing.
- **Why "in a parking orbit with no burn pending" was not used.** The plan suggested
  it as a second way in, but it would bring the bug back. After each cut-off the stage
  tails off for about 1.25 s before the next burn is planned (`scheduleNextBurn` →
  `burnPlan`). During that window `nextBurnTime` is −1 and no `evt.burnScheduled`
  exists yet. Bandwagon-1 goes parking at 479.9 s and gets `burnScheduled` at 481.1 s,
  so this rule would still end the flight at the parking orbit. The one real case it
  would add (`failRigidOrbitPrediction` with a periapsis under 120 km) is not an orbit.
  That flight is left to decay rather than get an "in orbit" card.
- **The end card also waits for the payload.** `reachTargetOrbit` releases the payload
  15 s after insertion. Before this change, a card at insertion + 10 s would have
  covered the deployment. The card now waits until the payload is separated, capped
  at `PAYLOAD_WAIT` = 30 s so a payload that never comes free cannot hold it back.
  Then it waits `RETURN_SETTLE` (10 s) after the latest of: final orbit, payload
  separation, or a stage landing. Splashdown, crewSafe and docked are unchanged.
- `reachedOrbit()` keeps its meaning ("in orbit, parking counts"), because
  `tests/watch-missions.test.ts` uses it to say a mission reached orbit at all.

## Decisions taken with the owner (2026-09-28)

1. **Soyuz ISS ends at its final orbit, not "the same as before".** The plan assumed
   Soyuz ISS was a direct insertion. When flown, it parks at 198 × 200 km at T+08:53
   and separates the spacecraft at T+08:54. The spacecraft then flies two burns of its
   own and reaches 413 × 427 km at T+56:42. The old card at T+08:53 was the same A9 bug.
   The owner chose the same rule as Bandwagon-1, so the card now appears about T+56:52.
2. **The parking note gives only the next burn, not "{n} burns left".** The remaining
   burn count exists only in `sim.plan`. Getting it to the viewer would mean changing
   `src/main.ts`, which this session may not edit, and the count changes when burns are
   re-planned. The note reads "…the engine fires again in {tgo}".

## Built-in Watch missions, old vs new end card (headless probe, 2026-09-27)

These were flown exactly as `tests/watch-missions.test.ts` flies them, sampled every
0.25 s of mission time or every simulation step if that is longer. The old
`watch-logic.ts` from `HEAD` was compared with the new one. The probe lived in
`tests/probe/` and has been deleted.

| Mission | Old card | New card | Parking note |
|---|---|---|---|
| Falcon 9 Bandwagon-1 | 480 s (parking 200 × 588) | ≈3263 s (payload 3253 + 10) | 481 s, next burn in 45:53 |
| Soyuz ISS | 533 s (parking 198 × 200) | 3412 s (target 3402 + 10) | 535 s, next burn in 0:30 |
| Ariane 6 Amazon LEO | 1089 s (parking 137 × 480) | ≈7492 s (payload 7482 + 10) | 1090 s, next burn in 1:05:07 |
| Electron SSO | 440 s (parking 198 × 200) | ≈9112 s (payload 9102 + 10) | 441 s, next burn in 0:30 |
| Falcon Heavy Arabsat | 645 s | 645 s (unchanged; the core's drone-ship landing governs) | not shown (burn 1 s after parking) |
| Starship Flight 5 | 3540 s splashdown | same | — |
| Soyuz MS-10 / T-10 / 18a aborts | crewSafe 1384 / 170 / 1557 s | same | — |
| Soyuz MS docking | docked 12377 s | same | — |

Ariane 6 and Electron had the same A9 bug. The audit had not reported them.

## Parking-orbit note

- The DOM-free logic is `parkingMilestone()`. It returns a value only while the flight
  is coasting after `evt.parkingOrbit` with a burn scheduled (`nextBurnTime > t`), the
  final orbit is not yet reached, and the flight is not a rendezvous or an abort.
- `watch.ts` shows the note once per flight, at the top of the scene. It does not
  block the view. It has a close button, hides itself after 12 s of real time, and
  also hides when the burn lights, when the flight ends or when the picker opens. The
  countdown updates at 10 Hz. A parking orbit whose burn is under 20 s away gets no
  note (Falcon Heavy's burn is 1 s after parking).
- **Styling:** `src/ui/modes.css` is off-limits to this session, so the note reuses
  the `.watch-card`, `.watch-card-head`, `.eyebrow` and `.watch-close` classes. It moves
  them to the top with inline styles (`top`, `transform`, `width`, `padding`, and the
  paragraph's font). **Follow-up for S8 (owns `modes.css`/`watch.ts` in wave 2):**
  move those inline styles into a `.watch-milestone` rule.

## End card

- `watchSummary()` is DOM-free and reads from the events that closed each part of the
  flight. The final orbit comes from `evt.targetOrbit` / `offTargetOrbit`, using the
  unrounded six-DOF `peAltM` / `apAltM` when present, or else the frame. The payload
  comes from `evt.payloadSep`. Each stage with a recovery target is matched to its own
  touchdown event by name and in order, so Falcon Heavy's two "Side boosters" get LZ-1
  and LZ-2. A docking that was called off is noted.
- The orbit card now adds one line each for the final orbit (or an "outside its limits"
  line for off-target), the payload, and each stage flown home. The docked card gets
  the stage lines. "It took {time}" now counts to the final orbit, not to the card.
  Stage names are localized through `stageNameByLabel`. The payload name comes from the
  viewer mission's `payloadKey`, then `satelliteNameById`, then a generic sentence.

## After the end

- **Time running on after the end card:** fixed in `watch.ts`. When the card appears
  and the live flight is playing, the viewer pauses it through `host.togglePlay()`.
  "Keep watching" hides the card and resumes play, but only if the viewer was the one
  that paused it.
- **Grey ground at the end:** the camera is chosen in `src/main.ts`
  (`steerWatchFocus` / `watchFocusTarget`, `WATCH_CAMERA_PLAN`), which this session
  may not edit. See the browser check below for what the end frame looked like.

## Browser check (npm run dev, Bandwagon-1 at 100×)

Setup: `npx vite` (the same as `npm run dev`) in headless Chromium (swiftshader) at
1280 × 720. Opened `#/launch/watch`, picked Falcon 9 Bandwagon-1, clicked 100×, and
read the viewer once per real second. Ran once in English and once in Thai. The
screenshots are not committed.

| Moment | English run | Thai run |
|---|---|---|
| Booster lands | T+07:43 "Booster landed" | same |
| Parking note appears | T+08:05: "In orbit at 200 × 588 km, but not the final one yet: the engine fires again in 45:48 to get there." At T+10:32 it read 43:21, so it counts down. It sits at the top and does not cover the vehicle. | T+08:04: "เข้าวงโคจรพักแล้ว 200 × 588 กม. แต่ยังไม่ใช่วงโคจรสุดท้าย เครื่องยนต์จะจุดอีกครั้งในอีก 45:49" |
| Note gone | by T+22:12 (12 s of real time) | same |
| End card | first seen T+55:30 (at 100×, one read per second is ~100 s of mission time). "It took 53:58 from liftoff … 586 km … Final orbit: 586 × 595 km, inclined 45.4° … Bandwagon-1 (11 satellites) came free of the rocket 54:13 after liftoff … First stage (9× Merlin 1D) flew back and landed on LZ-1." | first seen T+54:32. "วงโคจรสุดท้าย: 586 × 595 กม. … Bandwagon-1 (ดาวเทียม 11 ดวง) แยกตัวออกจากจรวดแล้ว หลังทะยานขึ้น 54:13 … ท่อนที่ 1 (9× Merlin 1D) บินกลับมาลงจอดที่ LZ-1" |
| After the card | paused (▶, status PAUSED). The clock settled at T+56:08. | paused, settled at T+55:30 |
| "Keep watching" | card hides, play resumes (T+58:43 three seconds later) | same (T+58:04) |
| Console / page errors | none | none |

**The clock runs on a little after the pause.** After the viewer pauses, the clock
still moves about 40–60 s of mission time (under 1 s of real time at 100×) before it
stops. The frame on screen trails the live simulation, and it catches up after the
simulation stops. The card is up throughout. At the automatic pace (10× in orbit) the
overrun is about a tenth as long. Holding the display exactly at the card's frame
would need `src/main.ts`. **Follow-up for whoever owns `main.ts`:** freeze the shown
frame when the viewer pauses at the end card.

**Grey ground:** not reproduced. Both end frames show the spacecraft over the Earth
from space, which is the viewer's orbit camera. The grey ground in the audit probably
comes from a camera left on the landed booster (`WATCH_FOCUS_HOLD` in `main.ts`) or
from another flight. It is not fixable in this session's files; it is left for the
owner of `main.ts` / S8 to check.

## Verification

- `npm run typecheck`: clean. `npm test`: 128 files, 1678 tests passed (1074 s). Each of the four commits was also typechecked and passed `tests/watch-logic.test.ts` and `tests/i18n.test.ts` on its own.
- `tests/watch-logic.test.ts` has 8 new cases. They cover: the Bandwagon-1 event
  sequence from `live-evidence.json` (null at T+500 s, and nothing before
  targetOrbit + `RETURN_SETTLE`, checked every 0.5 s); the tail-off window; the
  milestone countdown; the summary; a burn scheduled and never completed before an
  off-target close; splashdown and crewSafe unchanged; Soyuz ISS; and Falcon Heavy's
  three recoveries.
- `tests/probe/` has been deleted.
