# T-stored-mission-flake: Home's "continue" click in `stored-mission-newer`

- Package: T-stored-mission-flake, step 1. Change type: test-only, with no app change.
- Branch: `claude/t-stored-mission-flake-s1`, based on `999c3be` (`origin/main`, 2026-10-07).
- Journey: `tests/browser/journeys/stored-mission-newer.mjs`, added by PR #122 (M-PLAN-031).
- Authorization: this was requested in the session's task brief on 2026-10-07. No owner quote is recorded here.
- Local setup: Chromium 141.0.7390.37 (`CHROMIUM=/opt/pw-browsers/chromium`), Playwright 1.63.0, 4 CPUs, software WebGL (SwiftShader).

## Symptom

About 1 run in 3 (the reported rate) fails at `resume.click()` (line 49 on main), the step where the journey takes Home's "continue" card after reloading on `#/home`.

## Reproduction

**Stock journey on main, 13 runs** (`node tests/browser/run.mjs stored-mission-newer`, one at a time): **13/13 passed, 0 failures.** No failure was reproduced on this machine, so there is no failing Playwright log of my own to quote. Each run took 134–151 s.

**Instrumented copy (same steps) on main, 7 runs.** This copy logged the page state just before the click, Playwright's `pw:api` timings, Long Animation Frame entries and a CPU profile. The click passed every time, but close to its limit:

| run | whole click | "visible, enabled and stable" wait | "performing click" → done |
|---|---|---|---|
| diag | 27.4 s | – | – |
| diag2-1 | 24.2 s | 7.3 s | 16.9 s |
| diag2-2 | 21.3 s | 6.7 s | 14.6 s |
| diag2-3 | 23.3 s | 7.6 s | 15.7 s |
| diag2-4 | 26.2 s | 7.8 s | 18.4 s |
| diag3 | 23.8 s | – | – |
| diag4 | 24.9 s | – | – |

The journey sets no timeout on `resume.click()`, so Playwright's library default of **30 s** applies. A runner 10–40 % slower than this one goes over it.

One near-miss call log (diag2-1):

```
21.732 => locator.click started
21.746   waiting for element to be visible, enabled and stable
29.044   element is visible, enabled and stable        <- 7.3 s with no animation frame
29.055   performing click action
36.317   navigated to ".../#/launch/engineer"          <- click handler (continueMission) 7.2 s
44.712   click action done                             <- first Engineer frame 8.3 s
45.973 <= locator.click succeeded                      (24.2 s of 30 s)
```

**Ruled out.** Just before every click, the instrumented copy recorded the following:
- the card was visible at (64, 543, 397×60);
- `elementFromPoint` at its centre was the card itself, so nothing was over it;
- no `dialog[open]` was on the page;
- there was no `#pwa-toast`;
- the profile status was `durable`;
- `orbitlab.started` was true.

This rules out these causes:
- the card not yet rendered or enabled;
- an overlay or toast intercepting the pointer;
- a race with the newer-version notice, which Home does not show because start-up opens Home on the demo mission;
- the profile lock or the service worker. The worker was `activated` and controlled every reloaded page.

## Cause

**The journey clicks while the app is still finishing start-up. The click's own 30 s then has to cover that time.**

1. `init()` sets `#loading.hidden` at `src/main.ts:995`. That is before the start-up mission is loaded (`:1006`, `loadViewerMission('demo', …)`) and before the frame loop starts (`:1010`).
2. On Home, once Playwright sees `#loading.hidden`, **no frame is drawn for about 8 s**. The page's renderer is idle in that time and the GPU process is busy. Measured once a second after the class appeared:
   - renderer: 0.00–0.02 CPU-s;
   - GPU: 1.2–3.5 CPU-s;
   - `renderer.info.render.frame` stays at 103 for 7 s, then the frames resume at 1–2 s each.

   The Long Animation Frame entry for that gap is 6.7–7.6 s long, with no script and a blocking duration of 0. The GPU process is finishing start-up's texture uploads and shader programs.
3. The journey's `reload()` (lines 29–34 on main) waited for `#loading.hidden` plus a blind `waitForTimeout(1000)`. It then called `resume.click()`. Playwright's "stable" check needs two animation frames, so it **spent the 7–8 s stall inside the click's 30 s.**
4. The click itself then costs 15–18 s on a software GPU, and this is legitimate app work. A CPU profile of the click:
   - `continueMission` → `applyStoredMission` → `preview` → `setupViews` → `scene.prewarm()` (`src/main.ts:2006`) compiles the restored rocket's shaders: 7.0 s, mostly in `getShaderInfoLog`/`getProgramInfoLog`.
   - The first Engineer frame links the remaining programs (`getUniforms`): 7.1 s. Playwright's post-click hit-target check waits for that frame.

Start-up stall + the click's own work = 21–27 s here. That is under 30 s, but not by much.

## Fix

The fix is in `tests/browser/journeys/stored-mission-newer.mjs`. The `reload()` helper no longer sleeps a blind second. It waits for the real condition, which is that start-up is over and the scene is drawing again. That is two increments of `window.orbitlab.scene.renderer.info.render.frame`, read the same way the `render-idle` and `fx8-context-loss` journeys read it. It waits for two because the first may be start-up's own frame, drawn before the stall. If the frames do not come within 60 s, the helper records `the scene did not draw after reloading on <hash>`.

What did not change:
- every assertion;
- every timeout (the click keeps Playwright's default);
- no retry was added;
- no app code changed.

The 1 s wait after the click stays as it was. It comes before a negative check (the stored bytes are unchanged), and removing it would weaken that check.

## Results

**After the fix, the real runner, 16 consecutive runs (one check run, then a 15-run loop): 16/16 passed, 0 failures.**

| | whole click | stable wait | "performing click" → done |
|---|---|---|---|
| before (n=4–7) | 21.3–27.4 s | 6.7–7.8 s | 14.6–18.4 s |
| after (n=16) | 15.7–20.9 s | 2.0–2.8 s | 13.7–18.5 s |

On the real runner the whole journey took 125.7–149.5 s per run.

**Sabotage.** The container restarted during the work. The runs below were made afterwards, on a faster host, with another session's browser sometimes running, so they are paired with each other only.

| run | whole click | stable wait | result |
|---|---|---|---|
| new wait removed | 13.4 s | 4.9 s | passed |
| fixed (paired) | 10.0 s | 1.3 s | passed |
| stock (pair 1) | 12.6 s | 3.7 s | passed |
| fixed (pair 1) | 12.9 s | 2.1 s | passed |
| stock (pair 2, under load) | 18.2 s | 4.8 s | passed |
| fixed (pair 2, under load) | 16.5 s | 2.5 s | passed |
| modal open over the scene (`#about-dialog.showModal()` after each reload) | – | – | **the new wait failed** with `the scene did not draw after reloading on #/launch/engineer` (and `#/home`) |

So the wait is not vacuous: it fails when the scene cannot draw.

**Checks:**
- `npm run -s typecheck` passed;
- `node --test tests/verification/*.test.mjs tests/browser/shard.test.mjs` passed 73/73.

## Limits

- The reported 1-in-3 rate was not reproduced here: 0/13 on main. The cause rests on the measured near-misses and the timing breakdown above, not on a failing log.
- The fix removes the start-up stall from the click; it does not make the click cheap. On a software GPU the click's own work (shader compiles for the restored rocket, then the first Engineer frame) still takes 9–18 s of its 30 s. On a much slower or heavily shared runner, that part alone could still approach 30 s.
- Making `prewarm` also finish linking programs (so the first frame after it does not wait) would be an app change to rendering. That is a separate task, not this one.
