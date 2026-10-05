# CO-4 — R2 correctness fixes / ชุดแก้ความถูกต้องของ R2

Package CO-4 of the master plan v2.0 (wave K0 for step 1; steps 2–10 belong to K1–K2 and are **not** started). One PR per step; this report gains a section per step.

## Step 1 — LUI-01 (M-LAUNCH-027): a paused flight lost by "Use for the next launch"

```yaml
envelope: v2
package: CO-4
step: 1
family: CO
wave: K0
lane: I
items: [M-LAUNCH-027]
sources: [RW:LUI-01, DP:LUI-01, RW:§12:LUI-01]
change_kind: bug-fix
or_ids: [OR-2]
execution_authorized: true
owner_authorization: {date: 2026-10-05, quote: "D-65 (ก): wave K0 authorized; D-63 (ก): P0/P1 bugs that lose data or show false results go before identical-output work in the same files", scope: "wave K0 (answer sheet A-1)"}
base_sha_verified_on: {sha: 5f9aa2e, date: 2026-10-05, recheck: "src/main.ts:560 onChange: (cfg) => { if (!this.playing) this.preview(cfg); } — present"}
allowed_write_paths: [src/main.ts, src/ui/flight-lifecycle.ts, src/ui/panel.ts, tests/flight-lifecycle.test.ts, tests/panel-held-edit.test.ts, tests/browser/journeys/lui01-held-tuning.mjs]
oracle: []
failing_before_fix: [unit previewsChange, unit panel change kind, journey lui01-held-tuning (new file: tests/browser/journeys/lui01-held-tuning.mjs; added to r2-flight-shell first, it pushed that journey past its 420 s limit, so it got its own file and timeout)]
perf_evidence: none
kpi_targets: {KPI-14: "M-LAUNCH-027 closed"}
rollback: {method: revert, data_compat: "no stored-data, recorder or mission-file format change", verified_by: second-agent}
reviewers: [second-agent, owner]
report: docs/development/reports/CO-4-r2-fixes.md
```

### The bug, reproduced on `5f9aa2e`

Launch Engineer, a six-DOF flight, paused at T+34.8 s → 6-DOF flight controls → Loop inspector → Tuning → **Use for the next launch**. The loop inspector writes the tuning into the setup (`panel.applyControl`, `src/ui/panel.ts`), whose `changed()` calls the app's `onChange`; the app's guard only checked `!this.playing`, and a paused flight is not playing, so `preview()` built a new pad simulation. Measured by the new journey on the `5f9aa2e` build:

```
paused at T+34.8 s, recorded to T+34.8 s
FAIL: the paused flight left the flight stage
FAIL: the flight's clock moved: T+34.83 s → T+-10 s
FAIL: the recording changed: T-10…T+34.81 s → T-10…T+-10 s
FAIL: the HUD changed under the paused flight
FAIL: the setup is not the flown one any more (running false)
```

The message shown at the same time said "Set in the mission setup: flown from the next launch." (`tune.applied`) — the flight it said would continue had been thrown away.

### The fix

- `src/ui/flight-lifecycle.ts`: `SetupChange = 'edit' | 'replace'` and `previewsChange(stage, playing, change)` — the contract, with its docstring (input for the FlightLifecycle ADR of R0.2r): nothing previews over a running clock; while setting up every change previews (U01, as before); once launched (flight — flying, paused, replaying — or analysis) an **edit** is held in the setup for Relaunch / New mission; a mission **replaced** on purpose previews in any stage.
- `src/ui/panel.ts`: `onChange(cfg, change)`. `changed()` (every own field, and `applyControl`) and the auto-tune result report `'edit'`; `loadMission` and `restoreMission` report `'replace'`.
- `src/main.ts`: the `onChange` guard computes the stage from the same flags as `syncLifecycle` (`panel.isRunning()`, `sim.done`) at the moment of the change, not the per-frame cached `this.stage`.

**Why not the simpler stage-only guard the plan sketched:** `loadMission`/`restoreMission` are called *during* a flight by the explicit replace paths (#77's `openTemplate` → `loadViewerMission`, Watch's launches, Monte Carlo's run, a restored mission file, Home's continue), after `goLive(); this.playing = false` but while the panel still reports running. A guard on the stage alone would have stopped those from previewing — a new regression. The change kind keeps them exactly as they were. `applySuggestion` (#77) goes through `backToSetup()` → `reset()` and never through `onChange`'s edit path, so it is unchanged too. The plan's sketched name `shouldPreview(stage)` became `previewsChange(stage, playing, change)` for this reason (code wins over the plan text; recorded here as drift).

**What is identical:** every change while no flight exists (running false) previews exactly as before; every change while the clock runs is ignored exactly as before; every replace path previews exactly as before. Setup inputs are disabled while a flight exists (`disabled = this.running` on fields, buttons and window rows), so in practice the only edit that reaches the new branch is the loop inspector's "Use for the next launch". No physics, recorder, storage key or mission-file format changes.

**Known limit (not new data loss):** a held tuning lives in the setup state until the next preview stores it (`saveStoredMission` in `preview()`). A reload before Relaunch / New mission loses the held tuning, not the flight. Writing it to storage at once would add a storage write, which D-63 / S18 §18.6 leave to R1.6.

### Tests actually run

| Command | Base `5f9aa2e` | This branch |
|---|---|---|
| `npx vitest run tests/flight-lifecycle.test.ts tests/panel-held-edit.test.ts` | 4 failed, 2 passed (`previewsChange is not a function`; onChange called without a change kind) | 6/6 passed |
| `npx vitest run tests/flight-lifecycle.test.ts tests/panel-held-edit.test.ts tests/dynamics-panel.test.ts` | — | 16/16 passed |
| `npx vitest run` on the 11 panel / mcp / lifecycle / loop / i18n test files | — | 169/169 passed |
| `npm run typecheck` | — | clean |
| `node tests/browser/run.mjs lui01-held-tuning` (Chromium 141, SwiftShader, `npx vite build`) | ✗ 5 failures (above) | ✓ 36 s |
| regression journeys `r2-flight-shell r3-first-launch r3-result-setting launch-explore workspace-navigation` | — | 5/5 passed (87.7 s, 196.4 s, 125.7 s, 49.1 s, 98.0 s) |
| `node scripts/bundle-budget.mjs` | ok | ok (index 2620.5 kB, +0.2; precache 15822.9 kB) |

The new journey is not a smoke journey, so PR CI does not run it; Pages runs every journey before publishing. Putting R2 journeys into the PR smoke slice is CO-5.

### Handoff

- Contract `previewsChange` → R0.2r FlightLifecycle ADR (M-PLAN-013), owner S, recheck at GK1.
- Held-tuning persistence across reload → R1.6 (storage), if the owner wants it.
- CO-4 steps 2–10 → K1–K2, not authorized yet.
