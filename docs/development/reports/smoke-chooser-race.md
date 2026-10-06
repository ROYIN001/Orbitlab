# Smoke chooser race — the phone step pressed a chip the next frame moved / ปุ่มกลุ่มเหตุการณ์ถูกเฟรมถัดไปย้ายออกก่อนแตะ

The phone step of the PR smoke check (`tests/browser/journeys/r2-shell-smoke.mjs`) failed intermittently in CI and never locally (8/8 local runs passed), even after the earlier fix that waits for a paused flight to settle (`pausedFlightSettles`). This report gives the root cause, a deterministic reproduction and the fix. Tests only; no app code.

```yaml
change_kind: bug-fix (tests)
lane: T
items: []            # CI flake, no plan item
failing_before_fix: [browser journey r2-chooser-late-frame (3/3 on origin/main 0355055)]
allowed_write_paths: [tests/browser/journeys/r2-flight-shell.mjs, tests/browser/journeys/r2-chooser-late-frame.mjs, CHANGELOG.md, docs/development/PROGRESS.md, docs/development/reports/smoke-chooser-race.md]
app_code: none
rollback: {method: revert, data_compat: "no app, manifest or stored-data change"}
```

## The failure, on CI

CI run 37473120257 (PR #106), job `browser-smoke (1)`, 390×844 Thai phone, touch:

```
FAIL: the cluster chip did not open the chooser (chip now {"connected":true,"classes":"tl-chip sev-major cluster","expanded":"false", …};
cursor T+2.731187789351651 s, head T+6.109999999999745 s, playing false)
```

## Root cause

**The cursor value proves that the tap seeked.** The player leaves live mode only through `seek()` (`src/replay/player.ts`); a paused live flight keeps its cursor on the head in every frame (`player.syncLive`). Cursor T+2.731… behind head T+6.11 in replay mode means something called `seek(2.731…)`. Only one input came after the pause: the tap. 2.731… is not an event time (the cluster is ignition T-2 s and liftoff T+0 s), so the chooser's rows did not cause the seek. It is a pixel's time: the `.tl-bar` pointerdown handler (`src/ui/timeline.ts`) seeks to the time under the finger when the target is not a chip. **The tap landed on the bar beside the chip**, although the harness's `press()` had just checked with `elementFromPoint` that the chip was under that point.

**What moved the chip.** The physics worker's replies move the recording's head in `worker.onmessage` (`src/session/session.ts`, `recorder.apply`), between animation frames. The live cursor and the event bar follow the head only in a frame (`src/main.ts` `updateVisuals` → `timeline.update` → `layout`). On CI's software GPU (SwiftShader) one frame can take longer than a second. With frames that slow:

1. At warp 10 the worker is asked for up to 0.5 s of wall time per frame, that is 5 s of flight, so after the pause it delivers several seconds of frames it already had in flight.
2. `pausedFlightSettles` read `cursorTimeS` and `headTimeS` twice, a second apart. Both reads fell between two frames: the head had stopped (the worker was done) and the cursor had not moved (no frame yet), so the reads matched and the step went on, while the bar on screen was still laid out for an older, shorter head.
3. The harness found the chip under its centre, and before the tap arrived the next frame drew the new head: the axis got longer, the chip (anchored at T-2 s) moved left, and the tap landed on the bar at the place where the chip had been.

The numbers fit. The bar is 324 px wide starting at x = 33 on this phone. A chip laid out for a head near T+2.3 s has its centre near x = 289. With the head at T+6.11 s, x = 289 maps to about T+2.7 s, the cursor CI reported. The app behaved correctly: it drew a flight that was still arriving and answered a press on the bar by seeking. The race was in the test, which treated "the model stopped changing" as "the screen shows it".

The first fix (two equal reads a second apart) covered frames that arrive while the head is still moving. It could not cover a frame that is still to come after the head has stopped.

## Reproduction (failing first)

New smoke journey `tests/browser/journeys/r2-chooser-late-frame.mjs`. It runs the smoke's phone step with every `requestAnimationFrame` held for 2.5 s (CI's slow frames, made deterministic), and it runs the next held frame inside the harness's `elementFromPoint` check, after the check has its answer and before the tap is sent. If `pausedFlightSettles` returns before a frame has drawn the settled flight, the chip moves and the chooser does not open. The journey also checks that a held frame really ran at the press, so it cannot pass vacuously.

On `origin/main` `0355055` (committed alone, `d8079ed`), 3 runs out of 3 failed with CI's signature:

```
FAIL: the cluster chip did not open the chooser (chip now {"connected":true,"classes":"tl-chip sev-major cluster","expanded":"false", …}
settled at cursor T+1.33 s, head T+6.31 s; 1 late frame(s) at the press; chooser shut, cursor now T+3.02 s (replay)
settled at cursor T+1.33 s, head T+6.31 s; 1 late frame(s) at the press; chooser shut, cursor now T+3.02 s (replay)
settled at cursor T+1.16 s, head T+5.61 s; 1 late frame(s) at the press; chooser shut, cursor now T+2.62 s (replay)
```

"Settled" with the cursor 4–5 s behind the head is the stale screen that the old check accepted.

Before the deterministic version, CPU contention alone did not reproduce the failure: 0 failures in 8 runs at `Emulation.setCPUThrottlingRate` 6, 0 in 8 with 5 busy-loop processes plus rate 4, and 0 in 3 with frames delayed 1.5–2.5 s but no late frame at the press. The window is the few milliseconds between the hit check and the tap, so it takes a slow frame landing exactly there. That is why it showed up only on CI.

## The fix

`pausedFlightSettles` (`tests/browser/journeys/r2-flight-shell.mjs`) takes each read inside an animation frame: `requestAnimationFrame(() => done(__mcp('read_flight_state')))`. Callbacks run in the order they were requested, and the app requests its next frame at the end of the current one, so the read runs right after the app's own frame has laid out the bar for the state it returns. Two equal reads a second apart now mean that the flight stopped and the screen shows it. There is no timeout change and no check was loosened; the condition is the specific one the press needs. The `r2-shell-smoke` and `r2-flight-shell` steps themselves are unchanged.

After the fix, `r2-chooser-late-frame` passed 3/3 alone (`settled at cursor T+6.16 s, head T+6.11 s; 1 late frame(s) at the press; chooser open, cursor now T+6.16 s (live)`).

## Runs (local, Chromium 153 headless, 4 cores)

| Run | Without load | With 4 busy-loop processes |
|---|---|---|
| `r2-chooser-late-frame`, before the fix | 3/3 fail | — |
| `r2-chooser-late-frame`, after | 3 + 5 = 8/8 pass (29–32 s) | 5/5 pass (34–39 s) |
| `r2-shell-smoke`, after | 5/5 pass (42 s) | 5/5 pass (58–61 s) |
| `r2-flight-shell`, after | 2/2 pass (231–236 s) | 1/1 pass (335 s) |

Also: `node --test tests/verification/*.test.mjs tests/browser/shard.test.mjs` 66/66; `vitest run tests/repo-hygiene.test.ts` 9/9; `npm run typecheck` clean. `npm run build && node scripts/bundle-budget.mjs`: ok, precache code 14703.0 kB (ceiling 14704 kB), +0.0 kB against `0355055` (no app code; the journeys are not built), data 1119.2 kB.

## Notes

- The new journey is `smoke = true`, so PR CI guards the helper that the smoke depends on. It adds about 30 s locally to one of the two smoke shards.
- The desktop chooser step of the full journey (`r2-flight-shell`, `engineer`) still presses right after `pauseStaysInFlight` without waiting for the flight to settle. It runs more than 140 s into the flight, where the ignition/liftoff cluster no longer moves; no failure of it is known. It is left unchanged to keep this change minimal.
