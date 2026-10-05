# G2 hold, finding F5: the launch scene keeps a minimum size / ฉากปล่อยไม่ยุบ

```yaml
envelope: v2
package: G2 hold fix (F5) — R2.1r short-viewport case (M-LAUNCH-002), pulled forward by the owner's G2 note
step: 1
wave: K1
lane: U (+Q for the journeys)
items: [M-LAUNCH-002 (short-viewport case), M-LAUNCH-018 (G2 evidence)]
change_kind: bug-fix (layout); tests added first
owner_authorization: {date: 2026-10-05, quote: "เมื่อทำการ merge แล้วตรวจสอบว่าทุกอย่างเรียบร้อยแล้วในระยะ K0 ให้เริ่มทำระยะ K1 ในเซสชั่นใหม่ต่อได้เลยครับ ใช้ model opus5.5 high", scope: "wave K1 (D-65)"}
owner_instruction: {date: 2026-10-05T14:49Z, where: "Merge Desk G2 page (HOLD)", quote: "ให้ฉากแสดงการปล่อยได้ตามมาตรฐานขั้นต่ำในทั้งโหมด ทดลองและวิศวกร พวกเครื่องมืออื่นๆให้ย้ายออไปข้างหรือไม่ก็ไว้ข้างล่างแบบเลื่อนลงไปดูเอง ต้องไม่มาบังพื้นที่หน้าจอหลักและแถบtimeline สถานการณ์สำคัญ"}
base_sha_verified_on: {sha: 06abb1f, date: 2026-10-05}
depends_on: "#95 (D-38 offset: built index.html without comments, −2.65 kB) — merge it first"
```

## Drift recorded

The plan puts the short-viewport case of M-LAUNCH-002 in R2.1r, in wave K2,
and that package is not yet authorized. The owner's G2 hold note makes the
minimum scene size a condition of G2, and the K1 brief names F5 as K1's first
item. This PR does **only** that case: the scene's floor, and tools beside or
below the scene. The rest of R2.1r stays in K2: the compact command band, the
Analysis-stage layout, telemetry summary-first, M-PLAN-009 and M-PLAN-015.

## What was wrong (CO-3 report §3–§4, re-measured here)

The `#viewport` panel at the Launch flight, paused, TH (guide open → closed),
in CSS px, on `06abb1f`:

| Size | Explore | Engineer |
|---|---|---|
| 1100×650 | 790×54 → 790×181 | **1072×2 → 1072×95** |
| 1280×720 | 638×325 → 638×438 | 940×320 → 940×353 |
| 861 / 1180×800 | 551×163 → 551×290 | 833×78 → 833×205 |
| zoom 125 % on 1280×800 (1024×640) | 714×46 → 714×173 | 996×2 → 996×88 |
| zoom 125 % on 1366×768 (1093×614) | 783×27 → 783×154 | 1065×2 → 1065×69 |
| zoom 150 % on 1366×768 (911×512) | **601×2 → 601×80** | **883×2 → 883×2** |

**Cause.** In the flight column, the scene was the only flexible child. At
861–1180 px it had no floor (`flex: 1 1 0; min-height: 0`), and it gave up its
height to five things:

- the first-use guide (103–117 px);
- the playback row (150–174 px);
- the six-DOF panel and the TORU panel;
- the telemetry strip (up to 27 vh).

Above 1180 px it had a 320 px floor, but the column did not contain the panels
under it. They hung out of the column under the footer, which is finding F1.
In the stacked layout (up to 860 px) the phone's flight bar, fixed to the
bottom of the window, covered the bottom of the scene with the guide open.
This PR's new check S2 found that case: at 860×800 and 853×533 in Explore.

## What changed (`src/style.css`, `index.html`, `src/ui/help.css`, `src/main.ts`)

1. **`.flight-stage`.** The scene and the playback row, which holds the
   key-events timeline, are one block. On a desktop (wider than 860 px):
   - the scene is never shorter than `--scene-min`;
   - the stage is never shorter than the scene plus its controls;
   - the panels after it in the column (six-DOF, TORU, result tables) take
     what is left. When nothing is left, the column scrolls to them.

   A tall screen looks as before: at 1920×1080 the six-DOF panel still shows
   under the playback row, and the scene keeps the same size. The scene uses
   `contain: size`, so the canvas's own pixel size never feeds the layout.
2. **The workspace's first row is at least the stage** (`--stage-min` =
   `--scene-min` + 186 px). Between 861 and 1180 px the telemetry strip gets
   what is left. When there is nothing left, the workspace scrolls down to it.
3. **`--scene-min: clamp(200px, 40vh, 320px)`.** That is 40 % of the window's
   height, at least 200 px, and never more than the 320 px floor the scene
   already had above 1180 px and on phones. **This number is a proposal for
   the owner** (D-36: the minimum height is set from 1100×650 and 1280×720).
   The journeys use the same formula, so changing it means changing both
   places.
4. **Guide layout.** Between 641 and 860 px the first-use guide keeps its
   buttons beside its text instead of under it. At 853×533 the stacked guide
   was 208 px tall and left only 205 px of the scene on the first screen.
5. **Phone flight bar** (`main.ts`, `watchBarStrip`). An IntersectionObserver
   on the scene tracks the bottom 72 px strip of the window. The bar waits
   while the scene is in that strip. Scrolled down to the charts, the bar
   shows as before (A5 in the matrix, and `r2-flight-shell`'s phone step).

Phones and the lean modes (Home, Watch) keep their layouts. There
`.flight-stage` is `display: contents`.

## After (same runs, `06abb1f` + this PR)

| Size | Explore | Engineer | Minimum |
|---|---|---|---|
| 1100×650 | 790×284 → 790×284 | 1072×260 → 1072×260 | 260 |
| 1280×720 | 638×325 → 638×438 | 940×288 → 940×353 | 288 |
| 1280×800 | 638×405 → 638×518 | 940×320 → 940×433 | 320 |
| 861 / 1180×800 | 551×344 / 870×344 | 833×320 / 1152×320 | 320 |
| 1024×640 (zoom 125 %) | 714×280 | 996×256 | 256 |
| 1093×614 (zoom 125 %) | 783×270 | 1065×246 | 246 |
| 911×512 (zoom 150 %) | 601×229 | 883×205 | 205 |
| 853×533 (zoom 150 %, stacked) | 829×324 | 829×320 | 213 |

In every one of these, with the guide closed, the timeline, play/pause and the
clock are wholly on the first screen and nothing covers them. Engineer sits at
the minimum between 861 and 1180 px because the telemetry strip (event log
first) takes the rest. Moving the strip below the fold at those widths would
give the scene about 340–480 px instead. That is a choice for the owner on the
G2 page.

## Tests (failing first)

New checks S1–S4 (`tests/browser/scene-floor.mjs`):

- **S1:** the scene is at least `--scene-min` tall, and that much of it is on
  the first screen.
- **S2:** a press at five points inside the visible scene lands on the scene.
- **S3:** wider than 860 px with the guide closed, the timeline, play/pause and
  the clock are wholly on the first screen, unclipped, and pressable.
- **S4:** otherwise, the timeline is reachable by scrolling.

They run in:

- `r2-viewport-matrix`: the Engineer six-DOF flight, all 16 sizes × TH/EN/RU ×
  guide open/closed;
- the new `r2-viewport-scene-floor`: the Explore flight, all 14 desktop sizes
  × TH/EN/RU × guide open/closed.

| Run | Result |
|---|---|
| S1–S4 on `06abb1f` (Explore + Engineer, first version of the journey) | **162 failures**: 150 S1 (scene under the minimum), 12 S2 (phone bar over the scene at 860×800 and 853×533 in Explore) |
| after the layout change, before the guide change | 6 failures: S1 at 853×533 with the guide open (205 px visible against 213), Explore and Engineer × 3 languages |
| this PR | 0 failures (511.7 s, both levels in one journey) |

The matrix and the Explore journey runs on the final split are listed under
*Tests run*.

## Budget line

Precache code +1.0 kB (CSS +0.6 kB, JS +0.3 kB, HTML +0.1 kB). With #95 merged
first, 14 701.1 → about 14 702.1 kB, under the **unchanged** 14 704 kB ceiling.
That is no raise. #95 is the named offset, and D-38 needs no approval because
nothing is raised. Without #95, this PR is 0.8 kB over and fails
`npm run budget`. Merge order: #95, then this PR.

## Pages shard estimate

Pages shards are split by journey index, so `r2-viewport-scene-floor` sorts
after `r2-viewport-matrix` and lands in shard 3. Estimate from Pages
37359895259's journey times:

| Shard | Seconds |
|---|---|
| 1 | about 690 |
| 2 | about 1110, plus the matrix's extra checks |
| 3 | about 865 plus this journey (about 250 s here, 1.5–2× in CI) |

So shard 3 should take about 21–23 min, against the 45-min job limit (CO-5).
`r2-flight-shell` and `r2-viewport-matrix` stay in different shards.

## Tests run

See the PR body for the final list with counts.

## Open findings after this PR

- **F1** (the footer over the flight column): fixed if the matrix sees it no
  more. The `OPEN_FINDINGS` entry is removed only when that is shown.
- F2, F3, F4, F6 and F7 are unchanged and out of scope.

Docs touched: N/A (USER-GUIDE does not describe the flight layout's sizes).
