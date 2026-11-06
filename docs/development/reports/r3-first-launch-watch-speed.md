# r3-first-launch: why Watch's end card missed the wait / ทำไมการ์ดจบของ Watch มาไม่ทันใน r3-first-launch

> **สรุปสำหรับเจ้าของ (ภาษาไทย)**
>
> - ปัญหา: journey `r3-first-launch` ล้มเป็นครั้งคราวใน Pages ด้วยข้อความ "the Watch end card has no "Try this launch yourself"" สามครั้งที่มีบันทึก: 40962284621 (2026-10-29), 41731265523 (2026-11-03) และ 42064589225 attempt 1 (2026-11-05) ทุกครั้ง journey อื่นใน shard ผ่าน แต่ `verify` ล้มและ `publish` ถูกข้าม
> - สาเหตุ: journey เร่งเที่ยวบิน Soyuz T-10 ด้วย WebMCP `control_playback` warp 100 ทันทีหลังกดเลือก launch แต่ Watch ไม่เก็บ warp ที่ตั้งด้วยวิธีนี้ไว้ ขณะที่ความเร็วของ Watch เป็น "อัตโนมัติ" (Auto) Watch จะตั้ง warp ตามจังหวะของตัวเองในการอัปเดตครั้งแรกหลัง launch และทุกครั้งที่จังหวะเปลี่ยน คำสั่งของ journey จึงแข่งกับการอัปเดตครั้งแรกนั้น และวัดในหน้าเว็บได้ว่าห่างกันเพียง 12–63 ms
>   - ถ้าการอัปเดตมาก่อน warp 100 คงอยู่จนร่มหลักกาง แล้วเที่ยวบินไปต่อด้วยจังหวะอัตโนมัติ (20×, 5×, 1×) การ์ดจบขึ้น 42–51 วินาทีหลังคลิกในเครื่องนี้ และ 58–63 วินาทีเมื่อมีงานอื่นแย่ง CPU
>   - ถ้าคำสั่งมาก่อน การอัปเดตครั้งแรกแทน 100 ด้วย 1 เหลือเฟรมเดียวที่บินที่ 100× (ขอเที่ยวบิน 50 วินาทีโดยให้ worker ฟิสิกส์มีเวลา 450 ms) ส่วนที่ worker บินไม่ทันในเฟรมนั้นจนถึงร่มหลักจะเล่นที่ 1× เมื่อมีงานแย่ง CPU การ์ดขึ้น 75–83 วินาทีหลังคลิก
>   - กรณีแย่ที่สุดคือทั้งเที่ยวบินเล่นด้วยจังหวะอัตโนมัติ: การ์ดขึ้น 95 วินาทีหลังคลิกในเครื่องนี้ และ 141 วินาทีเมื่อมีงานแย่ง CPU ซึ่งเกิน 120 วินาทีที่ journey รอ บน CI GPU แบบ software ใช้ CPU เกือบหมดทั้ง 4 core ในทั้งสองครั้งที่ล้ม
>   - การ์ดจบจึงไม่ได้หายไป แต่มาไม่ทัน
> - ไม่ใช่สาเหตุ:
>   - เวลา launch ที่เปลี่ยนตามวันและชั่วโมง: บินแบบไม่มีหน้าจอ 52 เวลา launch เที่ยวบินเหมือนกันทุกครั้ง ลูกเรือลงพื้นที่ T+210.2 วินาที และการ์ดพร้อมที่ T+221.0 วินาที attempt 1 ที่ล้มกับ attempt 3 ที่ผ่านของ 42064589225 ก็ใช้เวลา launch เดียวกัน (2026-12-17T11:24:05Z)
>   - ตรรกะการจบของ pad abort: ไม่มีสถานะชั่วคราวให้ข้าม สถานะ landed และ 10 วินาทีหลังลงพื้นคงอยู่ตลอด
>   - ตัวเลข CPU ของ renderer ที่ต่ำใน diagnostics ของ CI ไม่ได้แปลว่าหน้าเว็บหยุด ในเครื่องนี้ตอนเที่ยวบินเดินปกติ ตัวเลขก็ต่ำแบบเดียวกัน
> - การแก้อยู่ใน main แล้ว: #209 (`fa3c486`) จาก session อื่น merge ตามคำตอบของคุณ (2026-11-05T14:33:34Z, "แก้ให้ทนเครื่องช้า (แนะนำ)") journey กดปุ่ม 100× ของ Watch เอง ซึ่ง Watch เก็บไว้ตลอดเที่ยวบิน Pages 42087327369 บน `fa3c486` ผ่านทุก job และเผยแพร่แล้ว การ์ดจบขึ้น 5.9 วินาทีหลังเริ่มรอ และ journey ใช้ 58.6 วินาที (เดิม 142–200 วินาที) session นี้หาสาเหตุและได้วิธีแก้เดียวกันแยกกัน จึงทิ้งการแก้ journey ของตัวเองแล้วใช้ของ main
> - PR นี้มี:
>   - รายงานนี้ คือสาเหตุและหลักฐานที่วัดแยกจาก #209 (#209 มีแต่ fragment ไม่มีรายงาน)
>   - เทสต์หน่วยหนึ่งไฟล์ `tests/watch-picked-speed.test.ts` บินเที่ยวบินเดียวกันผ่าน Watch ที่ 100× ของ Watch จนถึงการ์ดจบ และตรวจว่ามีปุ่ม "Try this launch yourself" เทสต์นี้รันใน unit shards ของทุก PR ส่วน `r3-first-launch` รันเฉพาะใน Pages ถ้าปล่อยให้จังหวะอัตโนมัติทับความเร็วที่เลือก เทสต์จะล้ม
>   - ไม่ได้แก้โค้ดแอป ไม่ได้แก้ journey ไม่ได้เปลี่ยน assertion เดิม และไม่ได้เพิ่มเพดาน
> - แก้ไขภายหลัง (ดูหัวข้อ "Corrected: r2-flight-shell"): รายงานฉบับแรกเขียนว่า `r2-flight-shell` "ไม่เสี่ยง" โดยไม่ได้รันจริง ซึ่งผิด Pages รัน 42124771467 ล้มที่ขั้นตอน Watch ของ journey นี้ ("the Watch flight did not fly on") วัดแล้วที่โหลด busy loop 8 ตัว การตั้ง warp 25 ผ่าน WebMCP ถูกทับเป็น 1× ภายใน 1.2 วินาที และใช้ 167.3 และ 160.9 วินาทีถึง T+150 (เกิน 120) ส่วนการกดปุ่ม 25× ของ Watch ใช้ 28.3 วินาที การแก้อยู่ใน PR ถัดมา
> - คำถามสำหรับคุณ (PR นี้ไม่ต้องรอคำตอบ): ใน Watch warp ที่ตั้งจากนอก Watch (WebMCP `control_playback`, ปุ่ม `.` และ `,`) ยังอยู่ได้แค่จนจังหวะอัตโนมัติเปลี่ยนครั้งถัดไป และปุ่ม Auto ยังติดอยู่ ส่วน `control_playback` ตอบ `ok: true` พร้อม warp ใหม่ ตัวเลือกอยู่ท้ายรายงาน ข้อเสนอคือ B: ให้ warp จากนอก Watch นับเป็นการเลือกความเร็วใน Watch เหมือนปุ่มของ Watch
> - พบระหว่างทาง (ยังไม่แก้): ข้อความบนการ์ด "The crew is safe" บอกว่าลูกเรือลงพื้น "{time} after the abort" แต่เวลานั้นมาจากเฟรมที่การ์ดขึ้น ไม่ใช่เวลาลงพื้น เที่ยวบินจริง 3:36 แต่การ์ดเขียน 3:46 ที่ 1× และราว 4:13 ที่ 100× แยกเป็นงานต่างหาก

```yaml
item: r3-first-launch's Watch end card (Pages browser shard 2 failures 40962284621, 41731265523, 42064589225 attempt 1)
change_kind: 'tests and a report: one new unit test (tests/watch-picked-speed.test.ts) and this report. The journey fix itself is #209 (fa3c486, merged from another session). No app code, no journey change, no assertion changed, no ceiling raised'
owner_authorization: 'the task given to this session, 2026-11-05: "Fix the root cause in the app or in the journey, whichever is wrong" (with a changes/ fragment and a report under docs/development/reports/); #209 merged on the owner''s answer in chat, 2026-11-05T14:33:34Z, "แก้ให้ทนเครื่องช้า (แนะนำ)"'
app_code: none
tests: tests/watch-picked-speed.test.ts (new, 1 test)
base_sha_verified_on: {sha: fa3c486, branch: main, date: 2026-11-05}
branch: claude/gifted-gates-00ox9n
second_agent_review: not required (tests and a report only; not P0/P1, physics or storage work)
```

## The failure

Before #209 the journey's last step (tests/browser/journeys/r3-first-launch.mjs at `7af3b93`, lines 77–86) did four things:
- opened `#/launch/watch`;
- picked Soyuz T-10 (`soyuzT10`, src/ui/watch-missions.ts: a pad abort, `failure: { mode: 'padFire', time: -6, stage: 0 }`);
- set the warp to 100 with WebMCP's `control_playback`;
- waited up to 120 s for `.watch-end .watch-btn` "Try this launch yourself".

| Pages run | Commit | Shard 2's `r3-first-launch` |
|---|---|---|
| 40957726247 | `1842a86` | passed, 82.9 s |
| 40962284621 (schedule, 2026-10-29T21:59Z) | `1842a86` | **failed**, 189.9 s; every journey of that shard ran 1.19–2.29× as long as in 40957726247 (westus against centralus; PROGRESS.md) |
| 41731265523 (schedule, 2026-11-03) | `0fa25ad` | **failed**, 192.7 s |
| 42064589225 attempt 1 (push of #188) | `7d12951` | **failed**, 200.3 s |
| 42064589225 attempt 3 (the whole workflow re-run) | `7d12951` | passed, 142.3 s |
| 42087327369 (push of #209) | `fa3c486` | passed, 58.6 s: "the Watch end card after 5.9 s, the flight at T+247.3 s, landed" |

- In the two failures whose logs were read here (41731265523 and 42064589225), the page was still on `#/launch/watch`. The browser diagnostics gave the GPU process 11.43 and 11.38 CPU-s over 3 s (SwiftShader), and the renderer 0.03 and 0.04.
- In the same run, 42064589225 attempt 1, shard 3's `watch-controls` passed. Each of its three passes (mouse, keyboard, touch) flies the same Soyuz T-10 at Watch's own 100× to its end card. Each took 31–37 s from "page ready" to "every control answered".
- The failure screenshots could not be read from this session. The first artifact's download host is refused by the session's network policy, and the second no longer downloads (404).

## Cause

1. **Watch's automatic pace sets its own warp.** While Watch's speed is Auto, `WatchView.update` calls `applyAutoWarp` (src/ui/watch.ts:378). That sets the warp of the beat on screen whenever it differs from the last warp Watch itself set (`lastWarp`, :311–317). `begin` resets `lastWarp` to 0 (:249, :268), so Watch's first update after a launch always sets 1, the count-down's pace. Watch's own speed buttons set its speed instead (`setSpeed`, :295), and the automatic pace then stays off for that flight.
2. **WebMCP's warp does not tell Watch.** `control_playback` sets the app's warp (src/mcp.ts:962, `App.setWarp`, src/main.ts:1430). In Watch, on Auto, such a warp lasts only until the automatic pace next sets its own.
3. **The race.** The journey sent warp 100 right after the click that launched the flight. The click's handler (`startWatch`, main.ts:910) ran for 10–17 s here, building the flight and its scene. The harness holds the page's animation frames over the click and lets them go after it (`press`, tests/browser/harness.mjs). The next thing to run in the page is then either the first frame, which runs Watch's first update (the 10 Hz block, main.ts:2164), or the journey's WebMCP call. Traced in the page (a probe wrapping `setWarp`, `frame`, `WatchView.update` and `__mcp`):
   - **The update first.** The call came 12–63 ms after the update in all 4 runs traced in the journey's own order. Warp 100 then held until the descent under the main parachute, where Watch's pace is 20× (first seen at T+37–64 s, depending on the frames). The card came 42–51 s after the click plain and 58–63 s under load.
   - **The call first** (forced: the call made in the click's own task). The first frame flew at 100×: each frame asks the physics worker for `min(0.5 s, time since the last frame) × warp` of flight, here 50 s, within `min(450, 900 × that time)` ms (main.ts:2133–2134). That frame's update then set 1. Plain, the worker flew all 50 s (T−10 to T+36) and the card came 48 s after the click. Under load it flew 32–35 s (to T+22–25), the rest up to the main parachute played at 1×, and the card came 75–83 s after the click.
   - **No time at 100×.** This is the end of the call-first case when the worker flies little of its 50 s, measured with no warp set at all. The card came 95 s after the click plain and 141 s under load. Under load the page drew 1.3 frames/s, and the app flies at most 0.5 s of wall time per frame, so 1× ran at 0.46× real time: T−10 to T+27 took 80 s.
4. **CI is the slow case.** On the runners the software GPU used 11.4 CPU-s in 3 s, nearly all of a 4-core runner (4.9–5.4 here under load). The worker therefore gets less of its 450 ms, and the frames come later. The race's slow outcomes take longer than here, and on a slow runner they go past 120 s.

So the card did not fail to appear. It came after the wait ran out.

## The leads, checked

- **"The end card never appears, rather than being slow": no.** The card came in every one of the 25 local runs (the journey and the probe, every order and load): 42 to 141 s after the click, depending on the race and the load (the tables below). The passing CI run's 142 s is the warp-100 path; the failures ran out the 120 s on a slower one.
- **"The button is not conditional": confirmed.** `showEnd` adds "Try this launch yourself" to every card that has a mission id and `tryCopy` (watch.ts:516). One way a card could stay hidden for good: `showEnd` returns early while the launch list is open, and `ended` is already set (:437). The list is closed by `begin` in the click, though, and nothing in this journey reopens it.
- **"The launch time changes with the date": it does, but the flight does not.** Flown headless through `FlightRecorder` as the app flies it (six-DOF, calm air, the panel's guidance) from 52 start times, the abort is at T−6.0 s, the crew down (`evt.escapeLanded`) at T+210.2 s, and `flightEnding` gives `crewSafe` at T+221.0 s every time. The start times were the four CI runs' and every three hours from 1 to 6 November 2026. The failing attempt 1 and the passing attempt 3 of 42064589225 even had the same launch time: 2026-12-17T11:24:05Z, from their starts at 16:58Z and 17:51Z.
- **"The ending logic": nothing short-lived to step over.** For an abort, `flightEnding` (src/ui/watch-logic.ts:816–826) needs the status `landed` and 10 s after `evt.escapeLanded`. Both last once reached: the capsule stays at rest and the simulation steps it on a second at a time (`stepLanded`, src/physics/simulation.ts:1314). The new unit test reaches the card at 100×, ten seconds of flight per update.
- **The renderer's 0.03 CPU-s does not show a stopped page.** With the flight running here under load at 1.3 frames/s, CDP's `SystemInfo.getProcessInfo` (the harness's source) gave the renderer 0.10 CPU-s per 3 s, and /proc gave 0.25. The GPU process does the drawing.

## The fix, on main as #209

#209 (`fa3c486`, merged 2026-11-05T18:45:32Z) changes only the journey:
- it presses Watch's own 100× (`.watch-speed[data-speed="100"]`), which sets Watch's speed and keeps the automatic pace off for the flight;
- it checks within 20 s that `read_flight_state` gives warp 100;
- it waits on the flight's clock: a clock that stands still for 30 s fails at once, and 120 s is still the whole wait.

This session found the same cause and the same fix (the same press and check, without the clock wait) before #209 merged. It dropped its own journey edit for main's.

What this PR adds:
- **`tests/watch-picked-speed.test.ts`** flies Soyuz T-10 headless as the app does and drives a `WatchView` on a stub DOM (as tests/fx3-thai-moon-labels.test.ts does). It checks:
  - the count-down sets 1;
  - Watch's 100× button sets 100 and is marked;
  - after that, at ten seconds of flight per update, Watch sets no other warp;
  - the end card shows `crewSafe` with "Try this launch yourself", and the button hands the launch to `tryCopy`.
  `r3-first-launch` runs only in the Pages workflow; this test runs in every PR's unit shards.
- **This report.**

## Measured

Local machine: a 4-core Xeon at 2.1 GHz, Node v22.23.4 (the baseline is 22.23.3), Playwright 1.63.0 with its Chromium (SwiftShader, as on CI), the harness's 0.5 render scale. "Under load" is three busy-loop processes on the four cores (`node -e "for(;;){}"`), standing in for CI's GPU process. "The probe" is a gitignored copy of the journey's steps (`tests/probe/`), with the trace above, the warp, the flight's clock and the frame rate read every 0.5 s. Times are from the end of the click that launched.

### Before (the journey at `7af3b93`)

| Run | Runs | When the card came |
|---|---|---|
| The journey, plain | 1 | passed, 120.8 s in all |
| The journey, under load | 3 | passed, 167.2, 153.6 and 173.5 s in all |
| The probe, the journey's own order, plain | 12 | 41.8–50.6 s in 11; 96.8 s in 1 |
| The probe, the journey's own order, under load | 3 | 58.0, 62.5 and 63.2 s (the update first in all 3, 20–63 ms ahead) |
| Forced: the call before the update, plain | 1 | 47.7 s (the worker flew T−10 to T+36 in the one 100× frame) |
| Forced: the call before the update, under load | 2 | 75.1 and 83.2 s (to T+25.3 and T+22.4 in that frame) |
| Forced: the call a second after the click, plain | 1 | 46.1 s |
| No warp at all (the automatic pace throughout), plain | 1 | 95.4 s |
| No warp at all, under load | 1 | **141.2 s: past the 120 s wait** |

The unchanged journey passed all 4 of its runs here, and in every traced run of its own order the update came first. The one slow probe run of its own order (96.8 s) came before the tracing was added; its time is that of the no-100× case (95.4 s). #209's session did see it fail locally: 2 of 2 at a load average of 4.6–8.5, with CI's message (its fragment, `changes/claude-gifted-gauss-ojjpaj.md`).

Headless, the flight's pace without the frame rate (the Watch beat, `autoWarp` and `flightEnding` at 0.1 s steps of wall time): warp 100 kept until the pace first changes gives the card after 35.5 s; the automatic pace throughout gives 71.3 s.

### After (main's journey, `fa3c486`)

The card's times here are the journey's own log line, measured from the start of its wait, after the 100× press and the warp check.

| Run | Runs | Result |
|---|---|---|
| CI: Pages 42087327369 | 1 | passed, 58.6 s; the card after 5.9 s |
| CI: #209's own runs (42079021421, 42081689511, its rule 2) | 24 | 24 passed; the card after 5.6–10.8 s |
| The journey, plain | 3 | 3 passed, 76.4–78.1 s; the card after 5.8–6.5 s |
| The journey, under load | 2 | 2 passed, 115.5 and 116.6 s; the card after 9.0 and 9.7 s |

### The new unit test

The change map (`scripts/verification/select-checks.mjs --files`) selects `tests/watch-picked-speed.test.ts` and `tests/repo-hygiene.test.ts` for this PR, and no browser journey: 10 of 10 pass. `npx tsc --noEmit -p .` is clean.

| Tree | Result |
|---|---|
| main `fa3c486` | 1 of 1 passes (the test 1.2 s; 4.2 s with the transform) |
| main with the automatic pace run over a picked speed (`if (state.playing) this.applyAutoWarp();` at watch.ts:378) | fails: Watch sets `[1, 100, 1, 20, 5, 1]` where `[1, 100]` is expected, the same pace that slowed the journey |

## Not changed, for the owner

### A warp set from outside Watch

While Watch is on Auto, a warp set from outside it lasts only until the automatic pace next sets its own: at Watch's first update after a launch, or at the next change of pace. This covers WebMCP's `control_playback` (an agent on the page) and the `.` and `,` keys. Meanwhile the Auto button stays marked, and `control_playback` answers `ok: true` with the new warp. The README says Watch plays "at an automatic pace … or at a fixed speed"; its fixed speeds are Watch's own buttons.
- **A. Leave it.** A warp from outside Watch is a nudge the automatic pace may undo. Say so in README's WebMCP table.
- **B. Count it as picking a speed in Watch**, as Watch's buttons do. Watch leaves Auto until Auto is pressed or the next launch, marks the matching button, and marks none for a warp that is not 1, 5, 25 or 100.
- **C. Close only the first-update race.** Watch's first update after a launch would not set again the 1 the launch already started at. A warp set right after a launch would then last until the pace first changes, as one set later does.

Proposal: B. Every way of picking a speed would then do what the README says, and an agent's `control_playback` result would be true. It changes what the keys and WebMCP do in Watch, so it waits for your answer. Nothing here depends on it. `r2-flight-shell` (below) is a second journey that this behaviour made fail on Pages, which counts for B: an agent on the page can meet the same thing.

### Found on the way

- **The crew-safe card's time.** `watch.end.crewSafeText` says the escape system brought the crew down "{time} after the abort". `{time}` is taken from the frame the card is written on (watch.ts:449), which is at least the 10 s settle after the touchdown, and more at a high warp. T-10-1's crew is down 3:36 after the abort; the card reads 3:46 at 1×, and 4:13 at 100× (the card's frame on CI was T+247.3 s). The splashdown card already times its sentence from its event (watch.ts:475–477). This is outside this PR.
- **`r2-flight-shell.mjs` uses the same pattern, and this report first got it wrong.** See "Corrected: r2-flight-shell" below.

## Corrected: r2-flight-shell

**What this report first said, and why it was wrong.** The first version (merged in #210, `4476540`) said that `r2-flight-shell`'s Watch step "is not at risk today", because Watch's pace stays 1× until T+100 and so leaves the 25× alone until then. That was reasoned from the code and never run, and it missed two things: Watch's first update after a launch sets 1 whenever it comes after the journey's call, and after T+100 the pace is 2× and 1×, so the last 50 s of flight to T+150 play slowly. Pages run 42124771467 (schedule, 2026-11-05T22:49Z, at `b195875`) then failed browser shard 3 on that step: `r2-flight-shell`, "the Watch flight did not fly on", 378.8 s; `r3-first-launch` (shard 2) passed in the same run, and so did the other 11 journeys of shard 3. `verify` failed and `publish` was skipped.

**The step.** `watch()` in tests/browser/journeys/r2-flight-shell.mjs opens `#/launch/watch`, picks the first launch (Soyuz to the station), presses the onboard camera, sets warp 25 with WebMCP's `control_playback` and waits up to 120 s for the flight's clock to pass T+150.

**Measured** (the probe is a gitignored copy of the step with the warp, the flight's clock and the frame rate read every second; the machine and the busy loops are those of "Measured" above; time from setting the warp to T+150, limit 120 s):

| Load | Warp set with WebMCP (as the journey did) | Watch's own 25× button (the fix) |
|---|---|---|
| none | 31.7 s | 20.2 s |
| 3 busy loops | 57.8 s and 54.2 s | 30.7 s and 31.5 s |
| 8 busy loops | **167.3 s and 160.9 s: past the 120 s** | 28.3 s |

- With WebMCP's warp, the 25× was replaced by the pace's 2× and 1× after T+100 in every run (the pace changes at T+100; the probe reads once a second, and at 25× a second is 25 s of flight, so it saw the change at T+100–126: T+114.5 → 2×, T+119.3 → 1×, T+130 → 2× at 3 busy loops). With 8 busy loops the 25× was replaced by 1× within 1.2 s of being set (seen at T−9.5 and T−10) in both runs, so the whole flight to T+150 played at 1×, at 1–4 frames/s.
- With Watch's own 25× the warp stayed 25 in all 4 runs that read it each second, and T+150 came after 20–32 s whatever the load.
- 8 busy loops on 4 cores are heavier than the runners' (the GPU process there used 11.4 CPU-s in 3 s; here about 5 with 3 busy loops), so this shows that the step can pass 120 s and why, not that it fails at the CI's own rate. The failure's screenshots could not be read from this session, so the cause on CI is the same mechanism, not shown to be the same instance.
- The first version's reasoning holds for the part before T+100 when Watch's first update comes before the call, as it did at 3 busy loops and below. It does not hold when the call comes first, and it left out the slow flight after T+100.

**The fix** (the PR that carries this section): the step presses Watch's own 25× (`.watch-speed[data-speed="25"]`), checks within 20 s that `read_flight_state` gives warp 25, and keeps the 120 s wait for T+150, now with the flight's clock, warp and whether it plays in the failure message. No other line of the journey changes.

**Checked after the fix** (the journey is `r2-flight-shell` as in this PR; times are the runs' own):

| Where | What | Result |
|---|---|---|
| This machine, no load | the whole journey, once | passed, 204.5 s (the failing run on CI: 378.8 s) |
| This machine, 8 busy loops | the Watch step, 3 runs | 3 of 3 passed, 61.9–65.2 s a run, where the WebMCP warp took 160.9 and 167.3 s to T+150 |
| CI, rule 2 | the Watch step, 20 runs: a temporary commit (`23389f2`, reverted by `ffad733`) exported the step and made the two smoke shards run it 10 times each; CI run 42238486084 | **20 of 20 passed**: shard 1 63.6–67.6 s a run, shard 2 45.0–48.8 s |

Plan S18 §18.6 rule 2 says a changed journey runs 20 times on CI before merge. This is 20 runs of the changed step, not of the whole journey: the whole journey takes about 380 s a run on CI, so 20 runs of it do not fit the 25-minute smoke jobs. Its other steps are untouched; the whole journey runs on Pages after the merge, and ran once here, locally. On the temporary commit CI's `verify` failed, as the commit said it would, because the executed journeys differed from the plan; the last commit of this PR has no such change, and its CI run is the one that counts.

**Other journeys.** No other journey sets a warp over WebMCP while Watch is open: `watch-controls` and (since #209) `r3-first-launch` press Watch's own speed buttons; the others set it in the workspace, where Watch's pace is not running.

## Checking it in CI

- This PR's CI runs typecheck, build, the unit shards (with the new test) and the smoke journeys. `r3-first-launch` is not a smoke journey; it runs only in the Pages workflow, browser shard 2.
- If a Pages browser shard fails, re-run the whole workflow, not the failed jobs. The verification plan records `GITHUB_RUN_ATTEMPT` (`workflow()`, scripts/verification/lib.mjs:49–50), and `baseReport` refuses a later attempt with "Workflow differs from the verification plan" (`same(workflow(), plan.workflow, 'Workflow')`, :89).
