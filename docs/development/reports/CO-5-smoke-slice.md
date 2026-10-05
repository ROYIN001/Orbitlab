# CO-5 step 1 — the R2 smoke slice in PR CI

```yaml
envelope: v2
package: CO-5
step: 1
lane: Q+T
wave: K0
change_kind: quality-improving
```

```yaml
family: CO
items: [M-LAUNCH-020]
priority: P1
base_sha_verified_on: {sha: 2275e0d, date: 2026-10-05}
allowed_write_paths: [tests/browser/journeys/r2-flight-shell.mjs, tests/browser/journeys/r2-shell-smoke.mjs, tests/browser/harness.mjs, docs/development/reports/CO-5-smoke-slice.md, docs/development/PROGRESS.md (one row), CHANGELOG.md (one line)]
app_code_changed: false
kpi_targets: {KPI-28: "added PR CI time, to be measured over ≥3 PR runs (not measured here)"}
report: docs/development/reports/CO-5-smoke-slice.md
```

## Why

PR CI runs only the browser journeys that export `smoke = true` (`scripts/verification/create-plan.mjs`, `browserInventory(mode === 'ci')`). `r2-flight-shell` is not one of them (420 s limit), so no pull request was ever gated on the R2 Launch Engineer shell. Pages runs it, but only after merge.

## What changes

- **New smoke journey `tests/browser/journeys/r2-shell-smoke.mjs`** (`smoke = true`, `timeoutMs` 90 s as a hang-guard; measured runs are 39–40 s, below).
- **`tests/browser/journeys/r2-flight-shell.mjs`**: three steps move out of `engineer()` and `chooser()` into exported helpers. The smoke journey imports them, so no code is copied:
  - `launchFolds(t, app)`: the real Launch button, then the setup folds, the setup panel is hidden, the scene and canvas grow by more than 200 px, and the scene has at least 60 % of the workspace width. These are the same checks as before.
  - `pauseStaysInFlight(t, app)`: pause, then two animation frames, then check the flight stage, that the setup is still folded, and that the flight is not playing. The two frames are needed (see the sabotage table). The last two checks are new to the full journey too.
  - `openChooser(t, app, { how, label })`: find a cluster chip, scroll it to the middle of the window on touch only (on desktop it is not scrolled, so `r2-flight-shell` at 1280×800 still fails when the event bar is off screen, as before; second-agent review), press it (mouse or touch), and check that the chooser opens with at least 2 events and that the chip is marked expanded. Screenshots are skipped when `label` is null; that saves the smoke slice about 7 s of software-rendered captures (measured 3.7 s + 3.1 s). The full journey still takes them.
- **`tests/browser/harness.mjs`**: a new `reachable(t, app, locator, what)` scrolls an element into view and checks that it lies inside the viewport and that a press at its centre would land on it, without pressing. `press` now shares the hit test (`hitAt`) with it, and its behaviour is unchanged.

No app code, no other journey, and no verification script changed. The CI shard count stays at 2 (below).

## What the slice checks

| # | Check | How |
|---|---|---|
| 1 | After launch the setup is folded and the scene is wider | 1280×800 EN: real Launch button → `launchFolds` (scene 638 → 940 px, canvas 318 → 469 px in every run) |
| 2 | After pausing, the app is still in flight | `pauseStaysInFlight`: `data-flight-stage` = `flight`, `data-setup` = `collapsed`, `read_flight_state.playing` false |
| 3a | `#rigid-controls` is reachable | The default Engineer flight is six-DOF: its panel shows, and its heading is reachable (`reachable`) |
| 3b | `#toru-controls` is reachable | A live Kurs approach is too slow for the slice: launch to the TORU panel took 85.4 s, 100.3 s (1280×800) and 111.7 s (1024×700) in three local probes. So the panel is shown the way the app shows it at the approach (its `hidden` attribute dropped), measured, and hidden again, all in one synchronous task. Its take-over button must be laid out, inside the window after scrolling, and hit at its centre |
| 4 | The chooser opens at 390 px in Thai | 390×844, `lang` `th`, touch: launch, warp 10 to T+1 s (ignition and liftoff form a cluster at 390 px from T+0), pause and wait until the cursor and recording head hold still, then `openChooser` by touch. The list must lie inside the window, its heading must be in Thai script, and the page must not scroll sideways with it open |

"Mission chooser" in the spec is read here as R2.4's event chooser, the chooser that `r2-flight-shell` tests. Watch's mission picker ("Choose a launch") is not part of this slice.

Not asserted (as the spec requires): the `mfb-play` name and the Soyuz 81 % engine level. LUI-01 keeps its own journey (`lui01-held-tuning`).

### Limits of 3b

The TORU check is a guard against the panel being removed, hidden by CSS or pushed off screen in the flight column. It does not prove reach at the real approach:

- At the approach, the six-DOF panel is hidden. In the slice it is still shown.
- With the six-DOF panel also hidden (the `hide-rigid` sabotage, and a probe that hid it on purpose), the take-over button's centre lands on a `span` in `footer#footer`. This is CO-3's open finding F1 (footer drawn over the bottom of the flight column, `docs/development/reports/CO-3-g2-matrix.md`).
- For context only: in a live approach at 1280×800 and at 1024×700 (EN, guide closed), a local probe (not committed) found the button reachable after `scrollIntoViewIfNeeded`; that is not a test result.

Real reach at the approach is covered on Pages by `r2-viewport-matrix` (CO-3, A3).

## Timed runs (this branch, rebased on `2275e0d`)

Machine: 4 cores, Chromium 141 (`/opt/pw-browsers/chromium`, SwiftShader), `npm run build`, then `node tests/browser/run.mjs r2-shell-smoke`.

| Run | Journey time (runner) | Process wall time | Result |
|---|---|---|---|
| 1 | 39.1 s | 39.8 s | ✓ |
| 2 | 39.8 s | 40.6 s | ✓ |
| 3 | 39.2 s | 40.0 s | ✓ |

On the earlier base `75c8cf4`, the same code gave 39.8 / 40.2 / 40.8 s. The draft before the two-frame wait in the pause step (below) gave 39.3 / 39.4 / 39.2 s and 42.7 / 40.7 / 39.0 / 39.0 / 39.9 s. The ≤ 60 s budget is met on this machine. CI runners have been measured at up to 2× slower on flight journeys (CO-5 step 0), so the 90 s `timeoutMs` is a hang-guard and not the budget. The PR CI time is the next step.

### A flaky version, and its cause

An earlier draft pressed the cluster chip while the phone flight was still recording at 10× warp. It failed 1 of 3 timed runs ("the cluster chip did not open the chooser"). A probe that pressed the chip during recording, 3 times, left the chooser open in only 1 of 3. In the other 2 the chooser was closed, and the cursor moved about 2 s over 10 s instead of following the live head. While recording, each new event re-lays out the bar: the chip moves, or another chip takes over the cluster, and `src/ui/timeline.ts` closes an open chooser when its chip stops leading. The fix pauses the flight and waits until the cursor and recording head hold still for two reads 500 ms apart (the frames the worker still had in flight, as in CO-4) before the press. No timeout was raised. After the fix, all 14 unsabotaged runs of the slice passed: 8 of the draft, then 3 on `75c8cf4` and 3 on `2275e0d` with the final code.

## Sabotage runs (one per new assertion)

Each sabotage was applied to the source, rebuilt with `npm run build`, run once, and then reverted with `git checkout`. At the end the build was redone from clean source, and `git status` showed only this branch's files. All were run on `2275e0d`.

| Sabotage (not committed) | Assertion it targets | Result | Failure reported |
|---|---|---|---|
| `body[data-setup='collapsed'] #setup { display: block !important }` | 1 setup folds, scene wider | ✗ (60.4 s) | "the setup panel is still on screen in flight"; "the scene did not take the setup's width (viewport 638 px, canvas 318 px before)" |
| `syncLifecycle`: the stage is `setup` whenever the flight is paused | 2 pause stays in flight | ✗ (42.7 s) | "pausing left the flight stage"; "pausing brought the setup back" |
| `control_playback` `pause` does nothing | 2 the flight is paused | ✗ (56.2 s) | "the flight is not paused (mission true, playing true)" |
| `#rigid-controls { display: none !important }` | 3a six-DOF panel | ✗ (61.3 s) | "no 6-DOF flight controls in the six-DOF flight" (and the TORU check then lands on F1's footer `span`) |
| `#rigid-controls summary { pointer-events: none !important }` | 3a reachable, not only visible | ✗ (43.5 s) | "6-DOF flight controls (#rigid-controls): a press at its centre would land on details." |
| `#toru-controls { display: none !important }` | 3b TORU panel | ✗ (42.9 s) | "the TORU panel is not laid out when shown (display none, …)"; "a press on TORU's take-over button would land on header#topbar." |
| `.tl-chooser { display: none !important }` | 4 chooser opens | ✗ (49.4 s) | "the cluster chip did not open the chooser" |
| `.tl-chooser { min-width: 600px !important }` | 4 chooser fits 390 px | ✗ (43.7 s) | "the chooser does not fit the 390 px screen ({left 8, right 608, …, vw 390})" |
| Thai `tl.chooser.label` replaced by the English text | 4 chooser in Thai | ✗ (43.6 s) | "the chooser is not labelled in Thai" |
| `body:has(.tl-chooser)::after { width: 700px }` | 4 no sideways scroll with the chooser open | ✗ (43.3 s) | "with the chooser open the page scrolls sideways by 310 px" |

Two lessons from the sabotage runs:

- The first pause check read the stage right after the pause. That read came before the app's next frame (`syncLifecycle` runs once a frame), so a sabotaged stage passed. `pauseStaysInFlight` now waits two animation frames before reading. The first pause sabotage also edited the wrong `missionStage(...)` call: `src/main.ts` has two, at :563 and :1463. The sabotage that counts targets `syncLifecycle` alone, and it fails the journey in 3 of 3 runs (2 on `75c8cf4`, 1 on `2275e0d`).
- An unconditional `body::after { width: 700px }` made the page overflow before the chooser was opened. The chip press then failed first ("lands on nav.mobile-workspace-nav"). The `:has(.tl-chooser)` form isolates the overflow check.

## Tests run

| Command | Result |
|---|---|
| `node --test tests/verification/*.test.mjs tests/browser/shard.test.mjs` | 64/64 pass |
| `npm run typecheck` | clean |
| `npx vitest run tests/repo-hygiene.test.ts` | 9/9 pass |
| `node tests/browser/run.mjs r2-flight-shell` after the refactor | ✓ 222.5 s on `2275e0d`; ✓ 222.0 s and ✓ 214.9 s on `75c8cf4` (before the refactor, on `75c8cf4`: ✓ 225.2 s) |
| `node scripts/verification/create-plan.mjs ci` | smoke inventory 18 → 19 journeys (with `r2-shell-smoke`); still 2 browser gates, `browser-1of2` / `browser-2of2`; `r2-shell-smoke` lands in shard 1 (details below) |

### CI plan

- Before, on `2275e0d` (clean `origin/main`, plan written to a scratch directory): `ci: 7 gates; unit 10154 cases, browser 18 cases; collection 93.0 s`.
- After, on this branch at its commit: `ci: 7 gates; unit 10154 cases, browser 19 cases; collection 93.0 s`. `suites.browser.names` includes `r2-shell-smoke`, and `smoke` is true.
- Shards (`--smoke --shard=N/2 --list`, assigned by index modulo 2 over the sorted names):
  - Before: shard 1 had 9 journeys (case-worksheet-exports, experiment-notebook, instructor-loading, learner-profiles, mobile-smoke, profile-session-safety, recheck, stage2-preflight, webgl-startup). Shard 2 had 9.
  - After: shard 1 has 10 (the same first six, then r2-shell-smoke, satellite, watch-controls, workspace-navigation). Shard 2 has 9 (classroom-preparation, gesture-ownership, launch-explore, lesson-packs, notation-defaults, project-backups, recheck, stage2-preflight, webgl-startup).
  - Inserting the name moves six journeys across shards. `scripts/verification/*` is not changed: no per-journey PR-shard times were at hand to rebalance against, and the first PR runs give them (KPI-28 step below).

## Left for the next step

- **KPI-28: added PR CI time.** Measure the smoke shards' wall time on at least 3 PR runs with this journey against the runs before it. Nothing here is a CI-time claim; the local cost is about 40 s of one shard.
- **Full-journey additions** were not added to `r2-flight-shell`. That journey takes 215–225 s here against a 420 s limit, with up to 2× on CI, and a live approach adds 85–112 s. Each one is now covered as listed:
  - **TORU and six-DOF reach in the live flight**: covered on Pages by `r2-viewport-matrix` (CO-3 A2/A3, with F1 open). If R2 should gate this on PRs, the cost is one approach of about 85–112 s locally.
  - **Chooser at 320/390 px in TH/RU**: TH 390 is in the slice. RU 390 and 320 px are in `r2-viewport-matrix` (F3: overlapping RU cluster chips at 390 px, open).
  - **Touch on the Watch view's camera tabs**: no journey taps them by touch. `watch()` in `r2-flight-shell` uses the mouse.
  - **Keys 1–4 give the manual camera ownership**: no journey checks this. `webgl-startup` presses `2` only after a WebGL failure; `r2-flight-shell` picks the view by mouse.
- **The live TORU approach in the layout seen at the approach** (six-DOF panel hidden) is where F1 appears. The smoke's synthetic check does not cover that layout.
