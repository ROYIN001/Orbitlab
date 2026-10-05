# CO-3 step 1 — G2 viewport matrix: presets, class A checks, class H screenshots

| Field | Value |
|---|---|
| Package | CO-3 step 1 (PR1), wave K0 |
| Items | M-LAUNCH-019 (evidence for M-LAUNCH-018 and M-LAUNCH-017) |
| change_kind | quality-improving (tests and docs only; no app code, no `budgets.json`) |
| owner_authorization | 2026-10-05 "D-65 (ก): wave K0 authorized" |
| Base | `5f9aa2e` (origin/main); `src/` and `index.html` are identical to the live Pages build `09cc2f5` |
| Browser | Chromium 141.0.7390.37 (Playwright, software WebGL: ANGLE on SwiftShader), 4-core container |
| Status | In PR; not merged; not published. The owner's answers below are blank: CO-3 does not decide anything. |

This report gives the owner what G2 needs: named viewport presets in the browser
harness, automated class A layout checks at every size in the plan's matrix,
the scene sizes measured at each size (for the minimum-scene-size decision),
the open findings those checks turned up, and class H contact sheets (kept
outside the repository; see *Screenshots*).

## 1. Viewport presets (`tests/browser/harness.mjs`)

Added to `VIEWPORTS` (the existing `desktop` and `mobile` presets and every
default are unchanged; a size object passed as `viewport` still works). Sizes
are the page's CSS viewport — the area under the browser's own toolbars, so a
real 1366×768 laptop shows less than the 1366×768 preset.

| Preset | CSS viewport | Note |
|---|---|---|
| `laptop-1280x800` | 1280×800 | |
| `laptop-1366x768` | 1366×768 | |
| `desktop-1920x1080` | 1920×1080 | |
| `laptop-1100x650` | 1100×650 | |
| `projector-1280x720` | 1280×720 | |
| `tablet-768x1024` | 768×1024 | |
| `phone-390x844` | 390×844 | |
| `phone-320x740` | 320×740 | |
| `edge-860x800`, `edge-861x800` | 860/861×800 | either side of `max-width: 860px` |
| `edge-1180x800`, `edge-1181x800` | 1180/1181×800 | either side of `max-width: 1180px` |
| `zoom125-1280x800` | 1024×640, zoom 1.25 | 125 % browser zoom on a 1280×800 screen |
| `zoom150-1280x800` | 853×533, zoom 1.5 | 150 % on 1280×800 |
| `zoom125-1366x768` | 1093×614, zoom 1.25 | 125 % on 1366×768 |
| `zoom150-1366x768` | 911×512, zoom 1.5 | 150 % on 1366×768 |

**How zoom is emulated.** At browser zoom *z* a page lays out in a CSS viewport
of the screen size divided by *z* (to the nearest pixel) and draws *z* device
pixels per CSS pixel. A zoom preset therefore gives that CSS size and a `zoom`
field; `t.open` multiplies the context's `deviceScaleFactor` by it
(`RENDER_SCALE × zoom`, so 0.625 or 0.75 by default). A new exported helper,
`viewportSize(preset)`, returns `{ width, height, zoom }`. The app's layout
depends on the CSS width only (its media queries are all `max-width`/`min-width`;
none on pointer or resolution), so the class A journey, which resizes one page
through the sizes, measures zoom presets at their CSS size and keeps the
context's scale factor. Real zoom on real hardware stays with HU-6.

## 2. Class A journey `tests/browser/journeys/r2-viewport-matrix.mjs`

Not a smoke journey; `timeoutMs` 720 s (it takes about 417 s here).

**How it runs.** Four fresh contexts: desktop (no touch, booted in Thai) for
the 14 sizes from the tablet up, and phone (touch, mobile viewport, booted in
Russian) for 390×844 and 320×740; in each group one context flies the default
mission (six-DOF, with an escape system, so Abort is offered) and one flies a
Soyuz MS to the ISS on the two-orbit profile to its Kurs approach (warp 1000,
then 50 after T+6000 s; the TORU panel shows from about T+9800 s). Each flight
is paused, then the page is resized through its group's sizes in TH, EN and RU
(the language selector's change handler) with the first-use guide open (as on
a first visit) and then closed (its Skip button). That is 48 size × language ×
guide combinations per flight, 96 measurements per flight kind.

**Assertions** (every one at every size, language and guide state):

| # | Assertion | Scope |
|---|---|---|
| A1 | No sideways scroll: `document.scrollingElement.scrollWidth <= innerWidth` | both flights |
| A2 | Abort (`#btn-abort`), play/pause (`#btn-play`), clock (`#clock`) and Live/replay (`#btn-live`) are rendered, lie inside the page's width, and are reachable: scrolled into the middle of the window, a press at their centre lands on them (`elementFromPoint`) | six-DOF flight |
| A3 | The six-DOF control panel (`#rigid-controls summary`) — same test | six-DOF flight |
| A3 | The TORU panel (`#toru-controls summary`) and its take-over button (`.toru-take`) — same test | Soyuz flight |
| A4 | A cluster chip on the event bar can be pressed at its centre; the chooser it opens lies inside the window, does not scroll sideways, and no row (or its time/name) overflows its row; Escape closes it | Soyuz flight |
| A5 | On a phone, scrolled to the bottom (the charts), the compact flight bar is fully on screen | six-DOF flight, phones |
| — | Setup steps that must hold: the guide is open on a first visit, Skip closes it, each language switch takes (`<html lang>`), the TORU panel shows on the approach, no uncaught page errors | — |

"Reachable" means reachable **by scrolling**, not "on the first screen". Which
controls are on the first screen without scrolling is logged at every step but
not asserted (on a phone the playback row is below the scene by design). From
the logs: with the guide closed, Abort/play/clock/Live are on the first screen at
every desktop size except `zoom150-1280x800` (853×533, the stacked layout);
with the guide open they are also off the first screen at `edge-860x800`; on
phones they are off the first screen with the guide open, and at 320×740 EN/RU
the clock and Abort are off it with the guide closed too (Abort because of F2).
No minimum scene size is asserted; the scene is measured and logged (§3).

**Open findings are explicit, not dropped.** CO-3 does not change app code, so
three app problems the checks found (F1–F3, §4) are listed in the journey's
`OPEN_FINDINGS`: a failure of exactly that kind is logged as
`open finding Fn …` with the place it happened and is not counted; any other
failure fails the journey. The run summary prints how often each finding was
seen. R2.1r removes an entry when it fixes the app.

### Sabotage: every assertion shown failing

The journey was wrapped (not committed) so that every page it opens gets an
injected stylesheet, and run once per set. Failures per run:

| Set | Injected CSS | What failed (count, all sizes × languages × guide states) |
|---|---|---|
| S1 | `body { min-width: calc(100vw + 40px) }` | A1: "the page scrolls sideways (scrollWidth 1320 > innerWidth 1280)" etc. — 168 |
| S1 | `#btn-abort { display: none }` | A2 Abort: "not rendered (0×0)" — 84 |
| S1 | `.mission-clock::after` covering the clock | A2 clock: "covered: a press at its centre lands on div.mission-clock" — 84 |
| S1 | `#toru-controls .toru-take { visibility: hidden }` | A3 TORU button: "not rendered (…, hidden)" — 84 |
| S1 | `.tl-chooser { min-width: 150vw; max-width: none }` | A4: "the list (8,239 1920×145) leaves the 1280×800 window" — 84 |
| S1 | `#mobile-flight-bar { display: none }` | A5: "no compact flight bar on screen while the charts are read" — 12 |
| S2 | `#btn-play { display: none }` | A2 play: "not rendered" — 84 |
| S2 | `#btn-live { visibility: hidden }` | A2 Live: "not rendered (…, hidden)" — 84 |
| S2 | `#btn-abort { position: relative; left: -4000px }` | A2 Abort: "outside the page's width" — 84 |
| S2 | `#rigid-controls { display: none }` | A3 six-DOF: "not rendered" — 84 |
| S2 | `#toru-controls::after` covering the panel | A3 TORU panel and button: "covered: … lands on section#toru-controls" — 84 + 84 |
| S2 | `.tl-chooser-item { grid-template-columns: auto 2000px }` | A4: "the list scrolls sideways (2091 > 338)" — 96 |
| S3 | `#timeline::after` covering the event bar | A4: "a cluster chip is covered — chip 1 … under div.timeline" — 96 |
| S4 | `.tl-chooser-name { white-space: nowrap; padding-right: 600px }` | A4 rows: "\"จุดเครื่องยนต์\" overflows its row (668 > 323); … tl-chooser-name sticks out of its row" — 96 |

Totals: S1 528 failures (724 s), S2 600 (416 s), S3 96 (413 s), S4 96 (566 s);
every journey run under sabotage failed. The setup steps in the last row of the
assertion table were not sabotaged separately (each one stops the journey
outright if it fails).

## 3. Scene sizes for the minimum-scene-size decision

The `#viewport` panel (scene) in CSS px, Launch Engineer, flight with the setup
collapsed, paused, first-use guide **open → closed**. TH and EN are identical
except where shown; RU differs in two rows. While a live flight plays, a
one-line "achieved speed" note under the playback row takes about 24 px more
(the class H flight shots: 940×409 at 1280×800, 1072×72 at 1100×650).

| Preset (CSS viewport) | TH | EN | RU |
|---|---|---|---|
| `laptop-1280x800` | 940×320 → 940×433 | same | same |
| `laptop-1366x768` | 1026×320 → 1026×401 | same | same |
| `desktop-1920x1080` | 1540×596 → 1540×709 | same | 1540×555 → 1540×709 |
| `laptop-1100x650` | **1072×2 → 1072×95** | same | same |
| `projector-1280x720` | 940×320 → 940×353 | same | same |
| `tablet-768x1024` | 744×431 → 744×431 | same | same |
| `edge-860x800` (stacked) | 836×482 → 836×482 | same | same |
| `edge-861x800` | **833×78 → 833×205** | 833×57 → 833×205 | 833×36 → 833×190 |
| `edge-1180x800` | **1152×78 → 1152×205** | same | 1152×51 → 1152×205 |
| `edge-1181x800` | 841×320 → 841×433 | same | same |
| `zoom125-1280x800` (1024×640) | **996×2 → 996×88** | same | same |
| `zoom150-1280x800` (853×533, stacked) | 829×320 → 829×320 | same | same |
| `zoom125-1366x768` (1093×614) | **1065×2 → 1065×69** | same | same |
| `zoom150-1366x768` (911×512) | **883×2 → 883×2** | same | same |
| `phone-390x844` | 366×320 → 366×396 | 366×396 → 366×396 | 366×396 → 366×396 |
| `phone-320x740` | 296×320 → 296×320 | same | same |

Reading the table: between 861 and 1180 px wide, and at every height of about
650 px or less, the scene is what is left after the header, the guide, the
playback row, the six-DOF panel and the telemetry strip — it shrinks to 2 px
(the canvas is still there; nothing scrolls it back). In the stacked layout
(≤860 px) the scene keeps a fixed height of 320–482 px and the page scrolls.
The 390×844 TH "guide open" figure was the first measurement after launch;
the scene grew to 396 px once the renderer settled, as in EN and RU. Both
journey runs produced exactly this table.

## 4. Open findings (for the owner and R2.1r; not fixed here — no app code in CO-3)

| Id | Size, language, guide | What | Evidence |
|---|---|---|---|
| F1 | 1366×768 RU guide open (six-DOF panel, TORU panel); 1280×800 TH guide open (TORU take-over button) | The footer is drawn over the bottom of the flight column: a press on the six-DOF panel's heading or the TORU panel lands on `footer#footer`, and scrolling it to the middle of the window does not uncover it. Seen in both journey runs. | journey log; `findings/F1-laptop-1366x768-ru-guideopen-footer-over-sixdof.png` (heading at y 724–748 under the footer) |
| F2 | 320×740 EN and RU, guide open and closed | Abort is cut off at the right edge: x 254…330 (EN) and 275…363 (RU) of 320. The page does not scroll sideways (the row clips it), so A1 passes while Abort is partly unreachable. TH fits. | journey log; `findings/F2-phone-320x740-en-abort-cut-off.png` |
| F3 | 390×844 RU, guide open and closed (Soyuz flight) | Two cluster chips overlap on the event bar: "Сброс башни САС" (x 76, 130 px wide) lies under "Опорная орбита" (x 110, 120 px wide); the first cannot be pressed at its centre. TH and EN fit. | journey log; `findings/F3-phone-390x844-ru-cluster-chips-overlap.png` |
| F4 | `zoom150-1366x768` (911×512) RU | The Help button (`#btn-help`) is covered by the top bar's navigation (`span.nav-tab-name`): a press lands on the nav tab. Found by the first draft of the journey (which reopened the guide through Help); not a committed assertion. | `findings/F4-zoom150-1366x768-ru-help-covered.png` |
| F5 | 1100×650 and zoom 125 % (guide open); zoom 150 % on 1366×768 (guide closed too); 861–1180 px at 800 px high | The scene collapses to 2 px (or under 100 px); see §3. Not asserted — this is the owner's minimum-size decision — but the measured state is unusable as a flight view. | §3; `findings/F5-*.png`; contact sheet 1100×650 |
| F6 | 390×844 (all languages), ⚙ Setup open in flight | The setup's sticky launch area (Relaunch / New mission) sits under the phone's compact flight bar: a press at New mission's centre lands on `#mobile-flight-bar` (only its top 12 px are free). Found while building the journey; not a committed assertion. | `findings/F6-phone-390x844-th-new-mission-under-flight-bar.png`; `png/phone-390x844-th-guideclosed-03-peek.png` |
| F7 (harness) | all journeys | `t.open({ guide: false })` (the default) does **not** hide the first-use guide: the init script stores `orbitlab.guide.v1 = 'done'`, but `GuideProgress` (`src/ui/help-state.ts`) hides it only for `'dismissed'` (and in a booted page the raw key read back as null: `orbitlab.guide.v1` is a workspace key, `src/workspace/registry.ts`). Every journey and every R2 screenshot so far ran with the guide open (1244×103 px at the top at 1280×800). Not changed here (the harness change is presets only); this journey passes `guide: true` and closes the guide with Skip. For the T lane. | exploration log; any journey screenshot |

## 5. Screenshots (class H) — not committed

Location (scratch, this session's container):
`/tmp/claude-0/-home-user-Orbitlab/a6353d48-4ca0-57d5-8f84-2c2116139152/scratchpad/co3-shots/`

- `png/` — 62 shots, named `<preset>-<lang>-guide<open|closed>-<nn>-<state>.png`
- `contact/` — 8 contact sheets, one per size (`contact-<preset>.png`), labelled
  with state, language, guide and the scene size in each shot
- `findings/` — 8 shots for F1–F6
- `manifest.json` — every file with its SHA-256 and size, the source SHA
  (`5f9aa2e`; `src/` = live `09cc2f5`), Chromium 141.0.7390.37, device scale
  factor 1 (`BROWSER_SCALE=1`), the per-shot records and notes; `SHA256SUMS`
- **Overall hash: `008351bffb2225f46cf2c45f8d1f84d3490f2e00f7950aa4163b781efe48c90c`**
  = SHA-256 of `SHA256SUMS` (one line `<sha256>  <path>` per file, 78 files, sorted by path)

The set needs a durable home outside `docs/` before the G2 record cites it (the
plan asks for an artifact with checked retention); the scratch path does not
outlive this session.

Coverage: TH at all 8 sizes — setup, flight (setup collapsed, live, a few
seconds after the real Launch button), ⚙ Setup peek, chooser open (default
mission, paused at T+7…39 s), telemetry preset Custom (Orbit + mass, scrolled to
the cards), then Watch's camera tabs (desktop sizes, a fresh page on
`#/launch/watch`) or the compact flight bar (phones, scrolled to the charts);
EN at 1280×800 and 1920×1080 (setup, flight); RU at 1366×768 and 320×740 (setup,
flight, chooser); guide open at 1280×800 and 390×844 (setup, flight). Guide
"closed" means closed with its Skip button (see F7). The Watch viewer hides
the guide in any case. The phone peek is scrolled to the setup panel, which on
a phone opens in the page rather than beside the scene.

The first pass took the Watch shots by changing the hash inside the Engineer
page; the launch picker did not appear within 60 s, so those six shots were
retaken in fresh pages (recorded in the manifest's `problems`).

## 6. Tests run (this machine, Chromium 141, other agents' browser tests running concurrently)

| Command | Result |
|---|---|
| `npx vite build` then `node tests/browser/run.mjs --dist dist --shots … r2-viewport-matrix` (run 1) | 1/1 passed, 417.8 s; open findings F1 3×, F2 4×, F3 2× |
| same (run 2) | 1/1 passed, 416.4 s; identical findings and scene table |
| `node tests/browser/run.mjs … r2-flight-shell` (harness change) | 1/1 passed, 177.9 s |
| `node --test tests/browser/shard.test.mjs tests/verification/*.test.mjs` | 59/59 passed |
| `npx vitest run tests/repo-hygiene.test.ts` | 9/9 passed |
| Sabotage runs S1–S4 (§2) | each failed as intended |

**Shard planning.** Journeys are split by index (`index % 2`) in sorted order.
`r2-viewport-matrix` sorts 15th, joins shard 1 of 2, and moves the ten
journeys after it (`r3-bench-drawings` … `workspace-navigation`) to the other
shard. On Pages run 37230585947 (`09cc2f5`) the browser steps took 18.8 min
(shard 1) and 23.4 min (shard 2) against a 30-minute job timeout. This journey
adds about 7 minutes on a 4-core machine; per-journey CI times were not
available here (the run's logs and artifacts are not downloadable from this
container), so whether either shard comes close to 30 minutes is unverified.
It must be checked on this PR's CI/Pages run before merge; if a shard gets too
close, the remedy (e.g. three browser shards) is a workflow change outside
CO-3's allowed files.

## 7. Owner checklist (G2) — answers left blank

The assumptions are quoted verbatim from `R2-workspace.md` §"การตัดสินใจที่ยังรอ (D08)"
on origin/main; options and proposals are the plan's (S06 CO-3, S08 D-36/D-39).
CO-3 proposes nothing of its own; the evidence for each row is in §3–§5.

| Row | Question (assumption quoted) | Options | Plan's proposal | Owner's answer |
|---|---|---|---|---|
| D-36.A1 | Keep this? "ซ่อน setup เฉพาะระดับ **Engineer** หลัง launch; Explore ยังใช้แผงเดิมเป็นสรุปเที่ยวบินตามพฤติกรรมเดิม" (hide the setup after launch only at the Engineer level; Explore keeps its panel as the flight summary) | (ก) keep · (ข) hide in Explore too · (ค) Explore hides it only on screens ≥1181 px | (ก): Explore's panel is the beginner's flight summary; wait for HU-1 evidence before changing it | |
| D-36.A2 | Confirm? "desktop เมื่อ setup ซ่อนใช้ `scene \| telemetry 330 px` (300 px ที่ ≤1400 px); ≤1180 px เป็นคอลัมน์เดียวที่ telemetry เป็นแถบใต้ภาพ; โทรศัพท์คงเป็น stack เดิม" (desktop: scene beside a 330 px telemetry column, 300 px at ≤1400 px; ≤1180 px one column with telemetry as a strip under the scene; phones keep the stack) | (ก) confirm · (ข) adjust the numbers from the screenshots · (ค) resizable (= R2.3s2) | (ก), and set the minimum scene size from the matrix; (ค) belongs to R2.3s2 | |
| D-36.A3 | Confirm? "ปุ่ม ⚙ Setup แสดง setup แบบอ่านอย่างเดียวระหว่างบิน (มี Relaunch/New mission เดิมอยู่ข้างใน) ไม่ใช่การกลับไป setup; New mission เท่านั้นที่เปิด configuration ให้แก้" (⚙ Setup shows the setup read-only in flight, with Relaunch/New mission inside; only New mission makes it editable) | (ก) read-only · (ข) editable "for the next launch" · (ค) hide the button | (ก): editing in flight is the LUI-01 path (CO-4 step 1) | |
| D-36.A4 | Confirm? "presets ของ R2.3 เป็นการเลือกการ์ดใน telemetry panel ยังไม่ทำการลาก/จัดหน้าต่างอิสระ (รอ D08)" (R2.3 presets choose cards in the telemetry panel; no free dragging/arranging yet) | (ก) presets now; dock/resize/reorder in R2.3s2 on screens >860 px only, phones keep presets · (ข) presets permanently · (ค) free dragging on every screen | (ก), matching "one task per phone screen" (S02 §02.6) | |
| D-36.A5 | Confirm? "ภารกิจใหม่ใน Watch เริ่มที่ Cinematic เสมอ; ใน workspace ความเป็นเจ้าของกล้องคงอยู่ข้ามการแก้ setup เหมือนสวิตช์ camera sequence เดิม" (a new Watch mission always starts in Cinematic; in the workspace the camera owner persists across setup edits) | (ก) confirm · (ข) workspace returns to Cinematic on every New mission · (ค) ask the user | (ก), with CO-5 confirming the camera frames the vehicle on a new mission and the camera owner (`#camera-tabs[data-owner]`) is visible | |
| D-39 | In replay, may the chooser list events after the cursor (up to the recording head)? | (ก) show up to the head (current behaviour, same as the chip) · (ข) hide or dim what is after the cursor, in both chip and list | Owner's choice; the plan leans to (ก) (replay browses a finished record; R2.6's seek API needs the full list). Either way recorded events are never altered. | |
| Minimum scene size | The plan: "measured: viewport 638 → 940 px, scene ≥60 % of the width at 1280×800 (already asserted)"; the owner sets the minimum **height** at 1100×650 / 1280×720 from the screenshots | Set a minimum height (and say whether it applies with the first-use guide open), or adjust | Measured here (§3): 1100×650 gives 95 px with the guide closed and 2 px with it open; 1280×720 gives 353 px closed and 320 px open (329 px while playing, guide closed); 861–1180 px wide at 800 px high gives 190–205 px closed. The number goes to R2.1r (M-LAUNCH-002). | |
| Preset list | All / Flight / Dynamics / Orbit / Custom | Confirm, or add/remove | Confirm; Docking comes after R5 (R5.4, D-58) | |

Open findings F1–F6 are not owner decisions but bear on A2 and the minimum
size; F7 is for the T lane.
