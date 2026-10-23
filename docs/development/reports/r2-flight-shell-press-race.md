# r2-flight-shell press race: an app frame moved ⚙ Setup between the box and the hit test / เฟรมของแอปย้ายปุ่มระหว่างวัดตำแหน่งกับตรวจจุดกด

> **สรุปสำหรับเจ้าของ (ภาษาไทย)**
>
> - เทสต์ `r2-flight-shell` ล้มบน Pages 4 จาก 12 รอบ (18–19 ต.ค.) ทั้งที่ไม่มีโค้ดแอปเปลี่ยน หน้าเว็บจึงไม่เผยแพร่ในรอบเหล่านั้น
> - สาเหตุอยู่ที่เทสต์ ไม่ใช่แอป:
>   - ตัวช่วยกดปุ่มของเทสต์ (`press`) วัดตำแหน่งปุ่ม ตรวจว่าจุดกึ่งกลางตรงปุ่ม แล้วจึงกด ทั้งสามขั้นเป็นคำสั่งแยกกันไปที่หน้าเว็บ
>   - บนเครื่อง CI ที่วาดภาพด้วยซอฟต์แวร์ หนึ่งเฟรมใช้ราว 1 วินาที เฟรมที่นำแผงควบคุม 6-DOF กลับมาหลังกด Launch จึงตกลงระหว่างการวัดกับการตรวจพอดี
>   - แถวปุ่มเลื่อนขึ้น 48 px จุดที่วัดไว้จึงไปตกบนช่องเลือก Warp แทนปุ่ม ⚙ Setup
>   - ความล้มเหลวอีก 8–9 ข้อที่ตามมาเป็นผลต่อเนื่องจากการกดครั้งนี้ครั้งเดียว
> - วิธีแก้: `press` และ `reachable` หยุดเฟรมแอนิเมชันของหน้าเว็บไว้ระหว่างวัด ตรวจ และกด แบบเดียวกับที่การถ่ายภาพหน้าจอทำอยู่แล้ว การกดจึงเกิดบน layout ที่วัดไว้จริง
> - ไม่แก้โค้ดแอป ไม่ลดเกณฑ์ ไม่เพิ่ม timeout และไม่ตัดการตรวจข้อใดออก
> - ทำซ้ำได้แน่นอน: harness เดิมล้มด้วยข้อความเดียวกับ CI 2 จาก 2 ครั้ง และ harness ใหม่ผ่าน 2 จาก 2 ครั้ง
> - มีเรื่องเสนอให้ตัดสินใจหนึ่งข้อ (ไม่ได้ทำในงานนี้): ในแอปเอง แผง 6-DOF หายไปตอนกด Launch แล้วกลับมาในอีกครึ่งวินาที หรือหลายวินาทีบนเครื่องช้า ทำให้ฉากกระตุกหนึ่งครั้ง (ดูหัวข้อ "For the owner")

```yaml
change_kind: bug-fix (tests)
lane: T
items: []            # Pages flake, no plan item
failing_before_fix: [deterministic probe of press() on the r2-flight-shell state, 2/2 on origin/main 11c4a7f]
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

The same commits passed in other runs (`0a7e69f` in 39098068476, `5374b6d` in 39329812882), and nothing between `0a7e69f` and `7c736f5` changes app or test code. 4 of the 12 Pages runs from 39082600280 to 39851735211 failed this way; it was not seen in any Pages run before (logs back to 2026-10-06 checked).

## Root cause

**The press.** `press()` (`tests/browser/harness.mjs`) made three round trips to the page: `locator.boundingBox()`, the `elementFromPoint` hit test at the box's centre, and the mouse click. Nothing stopped the page's animation frames between them. On the runners' software GPU (SwiftShader in `chrome-headless-shell`) one app frame takes about a second, so a frame often runs between two round trips.

**The frame that moved the button.** Launching calls `preview()`, which resets the 6-DOF flight controls and hides `#rigid-controls` (`src/main.ts` `rigidControls.reset()` → `src/ui/rigid-controls.ts`). The panel comes back only on a telemetry tick whose shown frame carries the six-DOF telemetry (`main.ts`: `rigidControls.update(this.shown?.rigid, …)` inside `if (… this.telTimer > 0.5 …)`). The tick comes every 0.5 s of frame time, and `dtReal` is capped at 0.1 s per frame, so on a slow GPU it comes every 5–6 frames. Screenshots hold frames (#160), and the journey takes two of them between Launch and the failing press. On CI the panel can therefore come back several seconds after Launch, in the first frames after the second screenshot releases them, which is when `⚙ Setup again` is measured. On a normal computer it comes back in about half a second.

**The geometry.** At 1280×800 with ⚙ Setup shown, the flight column is 638 px and the playback row (`#controls .ctl-row`, `flex-wrap: wrap`) has 600 px of content box. With the runners' system font (DejaVu Sans, fingerprinted from the overlay sizes that `r2-viewport-scene-floor` logs) the row wraps, and the Warp label sits alone on the second line, at the row's left edge. When `#rigid-controls` appears, the stage reaches its 400 px scene floor and `#controls` moves up 48.5 px. The Warp select (x 374–452) then lies under ⚙ Setup's measured centre (374.66, 650.75): `lands on select#warp-select`.

**The cascade.** On a miss `press()` records the failure and does not click, so the setup stays shown. Every later failure follows from that one:
- "⚙ Setup did not hide the setup again", and the `data-setup` reads in "changing the notation reopened the setup", "pausing brought the setup back" and "replaying reopened the setup";
- "⚙ Setup before New mission" then hides the setup instead of showing it, so "New mission: not visible", "New mission did not return to the setup", "⚙ Setup is still offered back in setup" and "the setup is still read-only after New mission";
- in two of the four runs, "cluster chip again: a mouse press at its centre lands on div.flight-stage". This is the same race in another place: with the setup left shown, the seek to Ignition changes the clock's label to REPLAY CURSOR, the row unwraps, and `#controls` drops 32.5 px between the chip's box and its hit test.

## Reproduction (failing first)

A probe (kept out of the repository, like #164's) drives the app to CI's state with the harness's own `press()`:
1. Launch with the real button and wait for the 6-DOF controls.
2. Show the setup with ⚙ Setup.
3. Hide `#rigid-controls` again, as it is before its first telemetry tick.
4. Call `press()` with a locator whose `boundingBox()` returns the real box and then waits, up to 8 s, for the panel to come back. That wait is the slow round trip of a loaded runner, during which the app's frames may run.

The DejaVu Sans font is set on the page, as on the runners.

| Harness | Run 1 | Run 2 |
|---|---|---|
| `origin/main` `11c4a7f` | FAIL: "⚙ Setup again: a mouse press at its centre lands on select#warp-select." (an app frame ran after the box; the setup stays shown) | the same |
| this change | PASS (no app frame ran between the box and the press; the setup hid again) | PASS |

## The fix

`press()` holds the page's animation frames (`holdFrames(page, true)`, the same hold `app.shot` uses, bounded at 5 s per call) before the box and releases them after the press, in a `finally`. `reachable()` holds them over its box and hit test. The press is therefore made on the layout that was measured and hit-tested. A frame that comes while frames are held runs right after the release, so the app keeps every frame. The hit test is unchanged: an element that covers the target still fails the press, and nothing is waited out.

Not changed:
- the app;
- every journey's steps and checks;
- every timeout and bound;
- the screenshot hold.

`r2-chooser-late-frame` still tests what it was written for. It runs held frames itself, inside `elementFromPoint` and before the tap, by calling their callbacks directly, so the hold does not stop them. It keeps guarding `pausedFlightSettles`.

## Runs (local, Chromium 153 headless shell, SwiftShader, 4 cores)

See the PR for the full browser run on this change (every journey, Pages mode) and the CI run.

## For the owner (not done here)

In the app, the 6-DOF flight controls disappear when Launch is pressed and come back on the first telemetry tick, about 0.5 s later on a normal computer and several seconds later on a slow one. The flight scene jumps once when they come back, and a press aimed at the playback row at that moment can land on the control beside it, as the test's press did. Options:
- (ก) Show the panel again in the same frame as the launch, by updating the 6-DOF controls when the flight starts rather than on the first telemetry tick. This is an app change with a browser check.
- (ข) Leave it as it is.

Proposal: (ก), as a small bug-fix PR in CO-4's files, if you want it.
