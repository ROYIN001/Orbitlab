# r2-flight-shell press race: an app frame moved ⚙ Setup between the box and the hit test / เฟรมของแอปย้ายปุ่มระหว่างวัดตำแหน่งกับตรวจจุดกด

> **สรุปสำหรับเจ้าของ (ภาษาไทย)**
>
> - เทสต์ `r2-flight-shell` ล้มบน Pages 4 จาก 12 รอบ (18–19 ต.ค.) ทั้งที่ไม่มีโค้ดแอปเปลี่ยน หน้าเว็บจึงไม่เผยแพร่ในรอบเหล่านั้น
> - สาเหตุอยู่ที่เทสต์ ไม่ใช่แอป:
>   - ตัวช่วยกดปุ่มของเทสต์ (`press`) วัดตำแหน่งปุ่ม ตรวจว่าจุดกึ่งกลางตรงปุ่ม แล้วจึงกด ทั้งสามขั้นเป็นคำสั่งแยกกันไปที่หน้าเว็บ
>   - บนเครื่อง CI ที่วาดภาพด้วยซอฟต์แวร์ หนึ่งเฟรมใช้ราวครึ่งวินาทีถึงหนึ่งวินาที (ค่าประมาณ) เฟรมของแอปจึงแทรกเข้ามาระหว่างคำสั่งได้
>   - CI บอกแค่ข้อความว่าจุดกดไปตกบนช่องเลือก Warp การจำลองในเครื่องด้วยฟอนต์เดียวกับ CI ชี้ว่าเป็นเฟรมที่นำแผงควบคุม 6-DOF กลับมาหลังกด Launch ซึ่งดันแถวปุ่มขึ้น 48.5 px
>   - ความล้มเหลวอีก 8–9 ข้อที่ตามมาเป็นผลต่อเนื่องจากการกดครั้งนี้ครั้งเดียว
> - วิธีแก้: `press` วัดตำแหน่งและตรวจจุดกดในคำสั่งเดียวบนหน้าเว็บ และหยุดเฟรมแอนิเมชันของแอปไว้จนกดเสร็จ แบบเดียวกับที่การถ่ายภาพหน้าจอทำอยู่แล้ว จึงไม่มีเฟรมของแอปแทรกระหว่างวัดกับกด จำนวนคำสั่งไปกลับยังเท่าเดิม (`reachable` ลดลงหนึ่ง)
> - ไม่แก้โค้ดแอป ไม่ลดเกณฑ์ ไม่เพิ่ม timeout และไม่ตัดการตรวจข้อใดออก
> - ทำซ้ำได้แน่นอน (เฟรมช้า 2.5 วินาที และบังคับให้เฟรมที่ค้างมาถึงระหว่างการตรวจจุดกด): harness เดิมล้มด้วยข้อความชุดเดียวกับ CI ส่วน harness ใหม่ผ่าน ผลฝั่งหลังแก้เป็นไปตามการออกแบบของการจำลอง ส่วนที่บอกได้มากคือฝั่งก่อนแก้ ที่ได้ลายเซ็นเดียวกับ CI
> - มีเรื่องเสนอให้ตัดสินใจหนึ่งข้อ (ไม่ได้ทำในงานนี้): ในแอปเอง แผง 6-DOF หายไปทุกครั้งที่กด Launch หรือแก้ค่าในหน้าตั้งค่า แล้วกลับมาภายในครึ่งวินาที (หลายวินาทีบนเครื่องช้า) ทำให้ฉากกระตุกหนึ่งครั้ง (ดูหัวข้อ "For the owner")

```yaml
change_kind: bug-fix (tests)
lane: T
items: []            # Pages flake, no plan item
failing_before_fix: [probe running r2-flight-shell engineer() with app frames slowed to 2.5 s and the due frames forced into the hit test: on 11c4a7f 1/1 fails at each press (9 failures at ⚙ Setup again, CI's signature; 11 at ⚙ Setup); this change 1/1 passes at each (0)]
allowed_write_paths: [tests/browser/harness.mjs, changes/claude-happy-hawking-m71bk1-press.md, docs/development/reports/r2-flight-shell-press-race.md]
app_code: none
rollback: {method: revert, data_compat: "no app, manifest or stored-data change"}
base_sha_verified_on: {sha: 11c4a7f, date: 2026-10-23}
```

## The failure, on Pages

Pages runs 39159723856 (schedule, `0a7e69f`), 39167988970 (`7793f73`), 39171737934 (`5374b6d`) and 39333180682 (`63db68f`) failed in `browser (3)`, journey `r2-flight-shell` only. Each had 9 or 10 failures, and each began:

```
FAIL: ⚙ Setup again: a mouse press at its centre lands on select#warp-select.
```

The same commits passed in other runs (`0a7e69f` in 39098068476, `5374b6d` in 39329812882), and nothing between `0a7e69f` and `7c736f5` changes app or test code. It failed so in 4 of the 12 Pages runs from 39082600280 to 39851735211, all of which ran browser shard 3 to the end. No earlier Pages run in PROGRESS's list records it failing.

## Root cause

**The press.** `press()` (`tests/browser/harness.mjs`) made three round trips to the page: `locator.boundingBox()`, the `elementFromPoint` hit test at the box's centre, and the mouse click. Nothing stopped the page's animation frames between them. On the runners' software GPU (SwiftShader in `chrome-headless-shell`) one app frame takes roughly half a second to a second (an estimate: `RENDER_SCALE`'s comment in the harness gives about one frame a second at full resolution and about twice that at the default 0.5; no frame time was measured on CI for this journey), so an app frame can run between two round trips.

CI's logs give only the message. What follows is the reconstruction that matches it: the code path, and a local run with the runners' font.

**The frame that moved the button.** Launching calls `preview()`, which resets the 6-DOF flight controls and hides `#rigid-controls` (`src/main.ts` `rigidControls.reset()` → `src/ui/rigid-controls.ts`). The panel comes back only on a telemetry tick whose shown frame carries the six-DOF telemetry (`main.ts`: `rigidControls.update(this.shown?.rigid, …)` inside `if (… this.telTimer > 0.5 …)`). The tick comes after 0.5 s of frame time, and `dtReal` is capped at 0.1 s per frame. `preview()` does not reset `telTimer`, so the first tick after Launch comes anywhere from the next frame to about 6 frames later. Screenshots hold frames (#160), and the journey takes two of them between Launch and the failing press. On CI the panel can therefore come back seconds after Launch, in the first frames after the second screenshot releases them, which is when `⚙ Setup again` is measured. On a normal computer it comes back within half a second.

**The geometry.** At 1280×800 with ⚙ Setup shown, the flight column is 638 px and the playback row (`#controls .ctl-row`, `flex-wrap: wrap`) has 600 px of content box. With the runners' system font (DejaVu Sans, inferred: the overlay sizes that `r2-viewport-scene-floor` logs on CI match DejaVu Sans locally, and no other installed font) the row wraps, and the Warp label sits alone on the second line, at the row's left edge. When `#rigid-controls` appears, the stage reaches its 400 px scene floor and `#controls` moves up 48.5 px. The Warp select (x 374–452) then lies under ⚙ Setup's measured centre (374.66, 650.75): `lands on select#warp-select`.

**The cascade.** On a miss `press()` records the failure and does not click, so the setup stays shown. Every later failure follows from that one:
- "⚙ Setup did not hide the setup again", and the `data-setup` reads in "changing the notation reopened the setup", "pausing brought the setup back" and "replaying reopened the setup";
- "⚙ Setup before New mission" then hides the setup instead of showing it, so "New mission: not visible", "New mission did not return to the setup", "⚙ Setup is still offered back in setup" and "the setup is still read-only after New mission";
- in two of the four runs, "cluster chip again: a mouse press at its centre lands on div.flight-stage". This one needs the race a second time; the setup left shown only makes it possible. Its likely mechanism (measured locally, not reproduced as a race): with the setup shown, the seek to Ignition changes the clock's label to REPLAY CURSOR, the row unwraps, and `#controls` drops 32.5 px between the chip's box and its hit test.

## Reproduction (failing first)

A probe, kept out of the repository like #164's, runs `engineer()` of `r2-flight-shell` with every check and the harness's own `press()`. The panel's return and the row's move come from the app's own frame loop and telemetry tick; the probe forces their timing:
1. From just before Launch, every app frame is held for 2.5 s, as `r2-chooser-late-frame` does. The telemetry clock (`window.orbitlab.telTimer`) is set to 0 at the Launch press, so the phase of the tick is known.
2. At the press under test, the frames that are due run inside the hit test's `elementFromPoint`, after the box was read. Each is stamped 2.5 s after the last, until one telemetry tick has run (at most 6 frames). A slow runner fits about one frame between two round trips; the probe runs several back to back so that the frame in the gap is the telemetry tick, which on CI happens only by chance (4 of 12 runs).
3. If the harness holds the frames at that moment, the hook passes them to the harness, and they run after the press. With this change the box and the hit test are read in one synchronous task after the hold is taken, so this is the branch the probe takes: the row for this change is true by construction. It shows that the hold defers the frames; the informative row is the one for `11c4a7f`.

The runners' system font is used (a fontconfig file maps `system-ui` and `sans-serif` to DejaVu Sans; locally `system-ui` is Inter, on which the row does not wrap). Runs were made one at a time, 2026-10-23, against `dist` built from `7c736f5`.

One run per cell:

| Harness | Late frames at the 2nd press (⚙ Setup again) | Late frames at the 1st press (⚙ Setup) |
|---|---|---|
| `origin/main` `11c4a7f` | **9 failures**, CI's signature: "⚙ Setup again: a mouse press at its centre lands on select#warp-select." and the 8 that follow it (4 frames ran in the hit test; the tick in the 4th showed the panel) | **11 failures**: "⚙ Setup: a mouse press at its centre lands on section#rigid-controls.panel.rigid-controls", the collapsed-layout form, and the ones that follow |
| this change | **0 failures**: the frames came while held and ran after the press | **0 failures**, the same |

## The fix

`press()` reads the box and does the hit test in one task on the page (`measure`). That task first holds the page's animation frames (`window.__holdFrames(true)`, the same hold `app.shot` uses). The frames stay held until the press has been sent, and a `finally` releases them (`holdFrames(page, false)`, bounded at 5 s per call; only when this press took the hold, so a failed journey's screenshots keep theirs). So no animation-frame callback runs between the box, the hit test and the press. An app frame whose turn came meanwhile is not dropped: it runs once, in the first frame after the release; the app draws nothing while held, and that frame's time step is capped like any slow frame's, as with the screenshot hold. Only animation-frame callbacks are held: timers, ResizeObserver callbacks, worker messages and the press's own pointer handlers still run, as they did before.

`reachable()` reads its box and hit test in one task as well; it does not press, so it holds nothing.

Round trips: on the success path `press` makes the same number as before (measure, the click, the release, where it used to be the box, the hit test, the click); a press that fails its check now also sends the release. `reachable` makes one fewer.

The box is the element's `getBoundingClientRect()`, in viewport CSS px, which for every element the journeys press (HTML buttons and one SVG group, all in the main frame) is the box `boundingBox()` gave; an element with no layout box (`display: none`) still gives "not visible". The hit test is unchanged: an element that covers the target still fails the press, and nothing is waited out.

Not changed:
- the app;
- every journey's steps and checks;
- every timeout and bound;
- the screenshot hold.

`r2-chooser-late-frame` still tests what it was written for. It runs held frames itself, inside `elementFromPoint` and before the tap, by calling their callbacks directly, so the hold does not stop them. It keeps guarding `pausedFlightSettles`.

## Runs (local, Chromium 153 headless shell, SwiftShader, 4 cores)

- The probe above, one run per cell, one browser at a time.
- Every browser journey in Pages mode (`node tests/browser/run.mjs`, 36 run, 6 held): RUNS_PLACEHOLDER
- `node --test tests/verification/*.test.mjs tests/browser/shard.test.mjs` and `npx vitest run tests/repo-hygiene.test.ts`: see the PR.
- A second agent reviewed the change in three lenses (equivalence of `measure` with the old box and hit test at every call site, 57 in `tests/browser`; the frame hold; the written claims), each finding then checked by a refuting agent: no blocking finding; the should-fix findings were all wording in this report, the fragment and the comments, and are fixed here; one nit taken in the code (the release only after a hold this press took).

## For the owner (not done here)

In the app, the 6-DOF flight controls disappear whenever the mission is previewed again (on Launch, and on every edit of the setup before launch) and come back on the next telemetry tick, within half a second on a normal computer and seconds later on a slow one. The flight scene jumps once when they come back, and a press aimed at the playback row at that moment can land on the control beside it, as the test's press did. Options:
- (ก) Show the panel again in the same frame, for example by running the telemetry tick on the frame after a preview (`this.telTimer = 1`, as `seek()` already does). This is an app change; it adds one telemetry tick after each preview and needs a browser check.
- (ข) Leave it as it is.

Proposal: (ก), as a small bug-fix PR in CO-4's files, if you want it.
