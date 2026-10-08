# fx8-context-loss: the in-flight Launch case compared two moments of the flight

Date: 2026-10-08. Main at the time: `3e15303`. Branch: `claude/t-fx8-picture-moment-s1`, not merged.

| | |
|---|---|
| Finding | **A test bug, not an app bug.** Confidence about 0.88. |
| How it was reached | An evidence sweep over 13 Pages runs, three independent investigators, a local experiment, and two skeptics who tried to refute it. Neither could. |
| Owner decision needed | Whether comparing against a picture replayed at the same moment counts as a "changed assertion" under SESSION-PROTOCOL §1 step 3. |
| CI evidence needed | A Pages-mode run: PR CI runs only the smoke journeys, so it never runs this one. |
| Paths below | Paths under `/tmp/claude-0/…` and `scratchpad/…` were the session's scratch area, and it no longer exists. The test and the fix are this branch's two commits: `50f9362` (failing first) and `d73f576` (the fix). Every CI log named here can be fetched again by its job id. |

## Finding

This is a test bug, not an app bug. The renderer restore works correctly.

In the in-flight Launch case of tests/browser/journeys/fx8-context-loss.mjs, the "before" and "after" pictures show two different moments of a flight that keeps playing:
- The before picture is taken while paused, at the loss time a (fx8-context-loss.mjs:84-85).
- go() then resumes play (:87). The flight runs at warp 1 through the 4 s loss, the restore and the settle (:100-109, :206-213).
- The after picture is taken at the new head (:110-111), about 5 s of flight later. I measured 4.8-6.0 s in 16 local loss runs, not the 13-15 s the brief assumed. After a restore each frame takes about 2 s, and each frame advances the flight by at most 0.5 s (src/main.ts:2099).

The fixed limit of p75 < 12 (:133) only holds when those ~5 s fall in a slow part of the ascent. This mission is falcon9/cape/leo, six-DOF, with no explicit guidance:
- The load relief holds the command toward the relative wind only while q > 500 Pa (src/physics/simulation.ts:1109).
- Without PEG/IGM the command is not rate-limited above 100 Pa (simulation.ts:1022), so the relief lets go all at once. src/i18n/en.ts:4140 documents this.
- q crosses 500 Pa at about T+134.9. The stack then pitches over from 20.2 to 6.0 degrees above the horizon by T+139.
- The exterior camera keeps a fixed local-horizontal offset and aims along the body axis (src/render/cameras.ts:281-288). So the stack and the horizon swing across the frame. The luminance spread drops from about 35 to about 26, and the no-loss p75 over 5 s jumps from 4-6 to 11-16.

Nothing controls where that window falls:
- a is set by the first 500 ms poll that reads a cursor past T+120 at warp 10 (:17, :24, :163-166). The test switches to warp 1 only after that.
- Warp-10 worker steps of up to 5 s each, with up to two outstanding (src/session/session.ts:124, :195; src/main.ts:2099), are still delivered after warp 1 is set. So a lands 4 to 14.5 s past 120.

All five CI failures have a = 131.8-134.5: the before picture is taken before the pitch-over and the after picture during or after it. Every pass has a ≤ 131.5. When the restored context is shown the before picture's flight time, it draws the same picture (p75 0-1). A flight with no context loss at all fails the same comparison (p75 15-20). The comments at :83 and :165, which claim the two pictures "do not drift apart" and are "nearly the same", are wrong for this mission.

## Evidence: the first Launch case in Pages runs on main

The "lost from" column is the flight time at which the first, in-flight Launch loss began.

| Run | Commit | Result | Lost from | Pixel change | Luminance before → after |
|---|---|---|---|---|---|
| 37570915922 | `4de951f` | FAIL | T+134.5 → T+139.0 s | median 4, 75th percentile 19, 90th 57 | before 30.0 ± 35.0, after 28.3 ± 26.0 |
| 37748125764 | `04a1188` | FAIL | T+133.9 → T+138.3 s | median 4, 75th percentile 18, 90th 59 | before 30.4 ± 35.6, after 28.2 ± 26.2 |
| 37536297987 | `6fea83f` | FAIL | T+131.8 → T+136.3 s | median 3, 75th percentile 13, 90th 31 | before 30.5 ± 35.7, after 30.0 ± 33.5 |
| 37548907257 | `23ede7f` | FAIL | T+131.9 → T+136.4 s | median 2, 75th percentile 13, 90th 28 | before 30.3 ± 34.9, after 31.8 ± 38.7 |
| 37745862803 | `a74494f` | FAIL | T+132.6 → T+137.1 s | median 3, 75th percentile 13, 90th 43 | before 30.8 ± 36.5, after 28.4 ± 28.5 |
| 37518627155 | `339b80e` | pass | T+131.5 → T+135.9 s | median 2, 75th percentile 9, 90th 25 | before 30.4 ± 35.1, after 32.6 ± 41.9 |
| 37840550384 | `3e15303` | pass | T+130.9 → T+135.4 s | median 2, 75th percentile 9, 90th 25 | before 29.9 ± 34.2, after 32.8 ± 42.2 |
| 37694922108 | `5055370` | pass | T+126.6 → T+131.1 s | median 3, 75th percentile 4, 90th 10 | before 29.7 ± 33.2, after 30.5 ± 36.0 |
| 37640751239 | `5055370` | pass | T+125.4 → T+129.8 s | median 2, 75th percentile 5, 90th 17 | before 28.5 ± 30.0, after 30.8 ± 36.8 |
| 37540561970 | `1a7960e` | pass | T+124.0 → T+128.2 s | median 3, 75th percentile 5, 90th 11 | before 29.2 ± 31.3, after 29.7 ± 34.0 |
| 37532033437 | `bdbfeff` | pass | T+123.7 → T+128.1 s | median 2, 75th percentile 5, 90th 9 | before 29.2 ± 31.4, after 29.3 ± 32.4 |
| 37569236232 | `600a2c3` | pass | T+124.7 → T+129.2 s | median 3, 75th percentile 5, 90th 12 | before 29.1 ± 31.6, after 30.7 ± 36.6 |
| 37743416628 | `90afb21` | pass | T+124.5 → T+129.0 s | median 2, 75th percentile 5, 90th 11 | before 29.8 ± 32.8, after 30.2 ± 35.0 |

WHAT SEPARATES FAILS FROM PASSES: only the flight time at which the first (in-flight) Launch loss happens. That is the "while lost" start value a, and the before and after pictures are taken around it. The 13 runs fall into two clusters with nothing in between (no run has a between 126.6 and 130.9):
- Early cluster, 6 runs, all passing: a = 123.7, 124.0, 124.5, 124.7, 125.4, 126.6. Pixel change 75th percentile (p75) is 4 or 5, 90th percentile 9–17.
- Late cluster, 7 runs: a = 130.9 (p75 9, pass), 131.5 (9, pass), 131.8 (13, FAIL), 131.9 (13, FAIL), 132.6 (13, FAIL), 133.9 (18, FAIL), 134.5 (19, FAIL). 90th percentile 25–59.
p75 rises steadily with a. The test limit is p75 < 12 (tests/browser/journeys/fx8-context-loss.mjs:133), so the pass/fail line falls between a = 131.5 and a = 131.8. The before picture also differs between the clusters: its luminance spread is 30.0–33.2 in the early cluster and 34.2–36.5 in the late one. In the three worst fails the after spread drops to 26.0–28.5, so the after picture loses contrast.

WHAT DOES NOT SEPARATE THEM (every factor below appears in both groups):
- Shard: fails in shards 1, 2 and 3; passes in shards 1, 2 and 3.
- Preceding journeys: classroom-preparation came before 3 fails and 4 passes. build-unsaved-open + experiment-notebook came before the 4de951f fail and the 5055370×2 and 90afb21 passes. build-legacy-ratings + case-worksheet-exports + fx2-design-check-focus came before the 04a1188 fail and the 3e15303 pass.
- Wall-clock timing: from ▶ fx8 to the loss took 59.9–95.1 s in fails and 58.5–89.3 s in passes. Restore-to-after-picture took 6.7–10.9 s in fails and 7.4–9.7 s in passes. Total journey time was 149–239 s in fails and 151–224 s in passes.
- Runner image (20260927.320.1 and 20261004.327.1) and Azure region (westus and centralus host both).
- Commit: the journey code has not changed since eee4dec (git diff eee4dec..3e15303 is empty). 5055370 passed twice after 4de951f failed, and 3e15303 passes.
- In every run, "shadow map drawn each frame" is false for the in-flight case. The second "launch" case is not a second flight: it is the Launch scene behind the Home page, paused on the pad (home(), fx8-context-loss.mjs:251). It always shows 127.8 ± 29.5 with zero change. Orbit and home pass in every run.

MECHANISM IN THE TEST, read from code at 3e15303:
- The loss point is "first poll where cursorTimeS > 120", polled every 500 ms of wall time at warp 10 (fx8-context-loss.mjs:17, 24, 163). Only then is warp set to 1 (line 166).
- The flight then plays again after the before picture (go(), line 87). It keeps running through the 4 s loss and through the restore and settle. It is paused again only for the after picture (lines 109–111).
- So the two compared pictures are roughly 13–15 s of flight apart: 4.4 s lost, plus 6.7–10.9 s of wall time from the lost log to the after picture.
- How far past 120 s the flight gets before warp 1 takes effect is bimodal: about 4–7 s in the early cluster, about 11–14.5 s in the late one. The poll alone allows at most about 5 s. One way to get the extra ~8 s, NOT proven from these logs: in the worker, a long main-thread frame advances the flight by min(0.5 s, elapsed wall) × warp (src/main.ts:2099), up to 5 s of flight per slow frame at warp 10.
- When the overshoot is large, the before/after window moves from about T+122→138 to about T+130→147. In that later part of the ascent the picture changes more over the same span of flight time, so p75 crosses the limit.

CORRECTIONS TO THE BRIEF:
(1) PR CI never runs fx8, so "passed in many PR runs" is not evidence. CI plans smoke journeys only (scripts/verification/create-plan.mjs:26, scripts/verification/lib.mjs:74), and fx8 has no `export const smoke`. I confirmed this with the journey lists of the FX-8 PR's own CI run 37501254074 (claude/c-fx8-s1): fx8 is in neither smoke shard.
(2) There are 5 FX-8 failures on main, not 2:
- 6fea83f, run 37536297987, shard 3, p75 13
- 23ede7f, run 37548907257, shard 3, p75 13
- a74494f, run 37745862803 (later cancelled), shard 3, p75 13
- 4de951f, run 37570915922
- 04a1188, run 37748125764
That is 5 of the 13 Pages executions since FX-8 merged (eee4dec), with 2 more passing at p75 9.

Logs are saved as scratchpad/fx8/mcp/job-<jobid>.log under /tmp/claude-0/-home-user-Orbitlab/f85185d5-f797-55c3-9547-d6ec255e7662/. The table builder is scratchpad/fx8-scripts/table.py.

## Local experiment

All runs were on local SwiftShader, at `3e15303`.

- **E1: replay sweep with no context loss at 3e15303. Flew MISSION to T+152 at warp 10, paused, then seeked to each second from T+118 to T+150 and took the FX-8 look() at each. Logged nose elevation (asin(dir·r̂)), q and luminance. Log: scratchpad/fx8/exp/sweep1.log, data in s1-sweep.json.**
  - Result: Nose elevation fell slowly at about 0.65°/s up to T+135: 26.98° (124), 21.34° (133), 20.75° (134, q 536 Pa), 20.15° (135, q 494 Pa). It then pitched over: 17.94° (136), 13.29° (137), 8.57° (138), 6.04° (139), then about 5.5° flat. Throttle stayed 1.0 until about T+143. Luminance was 30.2–30.4 ± 35.1–35.8 for T+130–135, 31.5 ± 39.3 at 136, 32.7 ± 39.9 at 137, 28.3 ± 27.9 at 138 and 28.3 ± 26.4 at 139. No-loss p75 for pairs (T, T+5): 4–6 for T = 118–131, then 11 (132), 13 (133), 16 (134), 16 (135), 15 (136), 13 (137), 5 (138) and 8 (139–145). For (T, T+4): 133→10, 134→12, 135→16.
- **E2: loss point pinned (warp 10 to X−8, then warp 1 to the first cursor ≥ X). X = 124 and 133, with a real loss/restore and with a no-loss control. Each case logged the flight time of the before and after pictures and added a 'seek-back' picture: after the after picture, the cursor was seeked to the before picture's flight time in the restored context. 3 repeats (p1–p3), 12 cases. Script: summ.py; logs pinned1.log, pinned-p2.log, pinned-p3.log.**
  - Result: loss@124: before T+124.58 / 124.44 / 126.27, after picture +5.00 / +5.97 / +4.85 s later. before-vs-after p75 5 / 7 / 4 (pass). before-vs-seekback p75 0 / 1 / 0.
noloss@124: p75 7 (gap 7.9 s) / 6 / 5.
loss@133: before T+133.27 / 133.97 / 133.18, after T+138.25 / 139.79 / 138.10. p75 15 / 18 / 12, all FAIL (limit < 12). Luminance 30.0±34.5→27.9±26.5, 30.0±34.9→28.4±26.7 and 30.2±34.9→28.3±28.0, the CI fail signature. before-vs-seekback p75 0 / 1 / 1, p90 1.
noloss@133 (no context loss at all): before T+133.99 / 134.28 / 133.62, after T+141.91 / 139.23 / 138.57. p75 20 / 16 / 15, all FAIL. Luminance 30.6±36.7→28.0±25.4.
A live picture against a replay picture at the same time gave p75 0 (one case 1).
The gap between the two pictures was 4.8–6.0 s in every loss case, not the brief's 13–15 s. The flight moved only 0.56–1.5 s between the end of the loss (b) and the after picture, because frames after the restore take 1.9–2.4 s and each one advances the flight by at most 0.5 s (src/main.ts:2099).
PNGs p1-loss133-{before,after,back}.png: the stack goes from about 20° nose-up to nearly level and the horizon rises. 'back' is visually identical to 'before'.
- **E3: the journey's own trigger (first 500 ms poll with cursor > 120 at warp 10, then warp 1), instrumented. Logged the poll values, the worker's pendingAdvance size and the cursor every 250 ms after the warp-1 call. 4 runs unthrottled and 3 with CDP CPU throttle ×4. Logs orig-o1.log and orig-o2-throttle4.log. The 3 s of extra reads put each before picture about 3 s later than the real journey would.**
  - Result: The cursor seen by the polls jumped in steps of 3–9 s at warp 10. The poll that crossed 120 read 126.19, 120.87, 120.99, 122.53, 122.55, 121.44 and 122.39. When warp 1 was set, the worker had 0–2 advance requests outstanding (MAX_OUTSTANDING = 2, src/session/session.ts:124, 195). Those warp-10 steps were still delivered 1.0–1.5 s after the warp-1 call, adding +5.17, +2.33, +3.75, +4.67, +5.30, +3.07 and +4.50 s (one run had a second jump of +3.6 s). In one run the shell sim was at T+127.85 while the cursor showed 122.55. Before pictures: T+137.01 (p75 13, FAIL), 126.19 (5), 127.57 (4), 130.45 (5), 131.17 (5), 127.60 (4), 133.15 (12, FAIL). So the unmodified trigger reproduced the CI failure locally 2 times in 7. Seek-back p75 was 0 in all 7.
- **E4a: failing-first, first attempt. 3e15303's journey and the seek-back fix (v1), with an env pin at 133 and a lead of only 8 s. 3 repeats each. Logs ff-pin133-{1,2,3}.log.**
  - Result: Original: FAIL p75 18 (a = 135.1), FAIL p75 18 (a = 135.3), pass p75 5 (a = 138.7). The warp-10 overshoot carried the cursor from 125 to 138.7, past the whole pitch-over. Fix v1: PASS with p75 2, 0, 1. The recording comparison passed (330 rows).
- **E4b: precise pin at 133 with a 25 s lead (warp 1 from about T+108–112). 3 repeats each. Logs ff2-pin133-{1,2,3}.log.**
  - Result: 3e15303 comparison: FAIL p75 14 / 15 / 14 at a = 133.4 / 133.3 / 133.4, luminance 30.2±35.0→28.5±27.9 and similar. Fix v1: PASS with p75 1 / 1 / 1, pictures at T+133.24 / 133.32 / 133.35.
- **E4c: fix v1 run on the natural trigger, 2 runs. Logs fixed-natural-{1,2}.log.**
  - Result: Run 1: a = 125.3, p75 1, PASS. Run 2: PASS but with p75 9: 'both pictures at T+127.92' while the loss ran T+132.9→137.4. The cursorTimeS read 1.5 s after pause was stale: warp-10 steps that had not yet arrived or been drawn landed later, so the before picture showed a later moment than the one seeked back to. This is why fix v2 reads the flight time from the frame actually drawn (orbitlab.shown.t, src/main.ts:2374) inside look().
- **E4d: failing-first in its committed form (LOSE_AT_S = 133, LEAD_S = 25, no env), test-only against test plus fix v2. 2 repeats. Logs b3-ff-{1,2}.log.**
  - Result: Test only (3e15303 comparison): FAIL p75 14, 14 at a = 133.4, 133.4. Luminance 30.4±35.1→28.0±26.6 and 30.1±34.9→28.0±26.5. Test plus fix: PASS with p75 1 and 2, 'pictures at T+133.16 and T+133.16 s' and 'T+133.30 and T+133.30 s'. The 330-row recording and the events matched the reference flight. Orbit, Home-page Launch and globe passed in every run.
- **E4e: fix v2 on the natural trigger (LOSE_AT_S = 120), 3 runs, plus a pin at T+136 in the middle of the pitch-over. Logs b3-fixed-natural-{1,2,3}.log and b3-pinfix136.log.**
  - Result: Natural: a = 126.5, 132.2 and 133.1. The last two are late-cluster losses that would fail on 3e15303. p75 1 / 1 / 1, with both pictures at the same time each run (126.50, 132.21, 133.14). Pin at 136: p75 0, pictures at T+136.27 and T+136.27.
- **E5: sabotage check, to show the fix still catches a broken restore. Built with `this.physicalSky?.invalidate()` removed from the restore listener (src/render/scene.ts:333) into dist-sab-sky. Ran the original and fix v1 pinned at 124, and fix v2 on the natural trigger. Logs sab-sky-pin124.log and b3-sab-sky-fixed.log.**
  - Result: Original: in-flight FAIL on the mean check (29.9→20.2, p75 9). The Home-page Launch case FAILED on both the mean check (127.8→55.7) and p75 128. Fix v1 @124: in-flight FAIL (30.0→19.5, p75 1, p90 22), Home-page Launch FAIL (p75 128). Fix v2 natural (a = 133.5): in-flight FAIL (30.1→20.6), Home-page Launch FAIL (p75 128). The fix keeps the test's power to detect a lost sky table.

**Confirmed:** Hypothesis 1 (FLIGHT TIMELINE) is confirmed in full. Hypothesis 3 (TEST MEASUREMENT) is confirmed, with a refinement to its overshoot mechanism. Both say it is a test-design bug, not an app bug.

Decisive data, all from E2 (same build, same restore code, only the flight-time window changes):
- 'loss133 ... before-vs-after p75 15 / 18 / 12' (FAIL), against 'loss124 ... p75 5 / 7 / 4' (pass).
- The no-loss control fails just the same: 'noloss133 ... p75 20 / 16 / 15', luminance '30.6 ± 36.7 → 28.0 ± 25.4'.
- The restored context draws the same picture when it draws the same moment: 'before-vs-seekback p75 0 / 1 / 1' at 133, and 0 in all 7 natural-trigger runs (E3).

The physical event (E1): 'T+134 nose 20.75° q 536 Pa', 'T+135 nose 20.15° q 494 Pa', 'T+136 17.94°', 'T+137 13.29°', 'T+138 8.57° lum 28.3 ± 27.9', 'T+139 6.04° lum 28.3 ± 26.4'. No-loss p75 for (T, T+5) is 4–6 up to T+131, then 11, 13, 16, 16 for T = 132–135. This is the documented six-DOF load-relief release at 500 Pa without explicit guidance:
- The command is held toward the relative wind only while q > 500 (src/physics/simulation.ts:1109).
- The rate limit applies only with PEG/IGM or below 100 Pa (simulation.ts:1022).
- en.ts:4140: 'releases the ascent load relief at 4 °/s instead of all at once at 500 Pa'.

The pictures are about 5 s apart, as H1 and H3 said: gap 4.8–6.0 s in every loss run, and b → after only 0.56–1.5 s.

What decides whether a run passes is the loss time a:
- E3 'warp-1 call returned at T+129.02; then … [19585,134.19]' shows warp-10 worker steps still landing after warp 1.
- Pending count was 0–2 (MAX_OUTSTANDING 2) and the jumps were +2.3 to +5.3 s, 1.0–1.5 s after the call.
- The unmodified trigger reproduced the CI fail locally 2 times in 7: 'T+137.01 … p75 13' and 'T+133.15 … p75 12'.

**Refuted:** Hypothesis 2's possible app bug (a faulty renderer restore) is refuted. Its own verdict already said 'not a restore bug', and the data agrees:
- After the restore, a picture at the before picture's flight time matches it: p75 0–1 (p90 ≤ 1) in 16 E2/E3 cases and 8 E4 journey runs.
- The live picture and the replay picture at the same time match (p75 0).
- The late window fails with no loss at all (p75 15–20).
- 'Shadow map drawn each frame: false' is irrelevant. It is false in every pass too, and the shadow is focused on the pad (src/main.ts:2622).

Brief claims refuted:
(1) 'The two compared pictures are roughly 13–15 s of flight apart.' Measured 4.8–6.0 s in all 16 loss cases. After the restore, frames take 1.9–2.4 s, and at warp 1 each advances the flight by at most 0.5 s (src/main.ts:2099).
(2) The idea that a later before picture alone explains the failure. The after picture also has to land past the T+135–139 pitch-over: a run with a = 138.7 (past the swing) passed with p75 5.

Not causes: shard, runner image, region, preceding journeys, commit, the shadow map, the environment probe, and the bloom/sky governors (bloom and the physical sky were on in every picture).

## Proposed fix (on the branch)

Test only, one file: tests/browser/journeys/fx8-context-loss.mjs. Every threshold stays as it is, and the flight still plays through the loss, so the clock, recording and event checks (:211-212, :215-223) are unchanged. The scratch diff is /tmp/claude-0/-home-user-Orbitlab/f85185d5-f797-55c3-9547-d6ec255e7662/scratchpad/fx8/exp/test-and-fix.diff (pin plus fix). fix.diff is the fix alone, at LOSE_AT_S = 120.

1. helpers().look() (:56): also return the flight time of the frame on the canvas, read in the same task as the pixels: `t: window.orbitlab.shown?.t ?? null`. `shown` is set in the same per-frame update as the render, at src/main.ts:2374. Do not use read_flight_state.cursorTimeS after the pause instead: in fix v1 that read was stale because warp-10 steps landed late, and one run reported 'both pictures at T+127.92' while the loss started at T+132.9 (p75 9).

2. loseAndRestore() (:110-111): call `still?.(before.t)` instead of `still?.()`. When `still` is given, log `pictures at T+${before.t} and T+${after.t}`, which also fills a gap in the current logging. Add one check: `before.t !== null && Math.abs(after.t - before.t) < 0.01`, failing with '...the two pictures show different moments of the flight'.

3. launch() (:201-205):
   - `still = async (at) => { pause; if (at != null) await app.mcp('seek', { timeS: at }); await page.waitForTimeout(1500); }`. The WebMCP seek tool is at src/mcp.ts:973. App.seek after a pause enters replay paused (src/main.ts:1781-1788).
   - `go = async () => { await app.mcp('control_playback', { action: 'live' }); await app.mcp('control_playback', { action: 'play' }); }`, so the flight goes back to the head before it plays on. 'live' is at src/mcp.ts:951 and is harmless when already live.

4. Fix the wrong comments at :83 and :165, and the LOSE_AT_S doc comment at :18-23. They should say that from about T+135 the six-DOF load relief lets go at 500 Pa and the stack pitches over from 20 to 6 degrees in about 4 s.

5. The regression pin from the failing-first plan stays: LOSE_AT_S = 133, LEAD_S = 25, then warp 1 and the first cursor at or past LOSE_AT_S at 100 ms polls. It makes the in-flight case land deterministically in the hardest window. I also recommend a new guard check in during() (not run yet): `a.cursorTimeS < LOSE_AT_S + 3`. Without it, a slow runner whose overshoot carried the loss past the pitch-over would let the pinned test pass silently; with LEAD_S = 8 that happened once, at a = 138.7.

This is not part of this fix: pausing or setting warp 1 does not cancel warp-10 advance steps already sent to the worker (src/session/session.ts:124, :195). That is latency by design, not a wrong-to-right bug. It contributes to the uncontrolled loss time, but the fix makes the test independent of it.

## Failing first

Two commits on a new branch from main (3e15303), both in tests/browser/journeys/fx8-context-loss.mjs.

Commit 1, the regression test only:
- Pin the loss at a fixed worst-case moment. LOSE_AT_S = 133 (just before the T+134.9 load-relief release) and LEAD_S = 25.
- In flyTo: warp 10 until cursorTimeS > LOSE_AT_S - LEAD_S (500 ms polls), then warp 1, then t.until(cursorTimeS >= LOSE_AT_S, { intervalMs: 100, timeoutMs: 60_000 }), then midway().
- Add the guard check a.cursorTimeS < LOSE_AT_S + 3 and update the comments.
- Build and run: `npx vite build && CHROMIUM=/opt/pw-browsers/chromium node tests/browser/run.mjs fx8-context-loss`.
- Expected on 3e15303: FAIL 'launch: the restored picture differs from the one before (75th percentile pixel change 14 of 255)', with luminance about 30.2±35→28.0±26.6. Locally this happened in 5 of 5 runs, p75 14/14/14/15/14 at a = 133.3-133.4.
- LEAD_S has to cover the warp-10 overshoot of up to about 15 s. With LEAD_S = 8 one run overshot to a = 138.7, past the whole pitch-over, and passed (p75 5).

Commit 2, the fix: look() returns shown.t, still(at) seeks back to before.t, go() goes live and then plays, and the same-moment check is added.
- Expected: PASS with p75 0-2 and 'pictures at T+133.xx and T+133.xx s'. Locally: p75 1, 2 (b3-ff) and 1, 1, 1 (ff2-pin133).
- The 330-row recording and the events match the reference flight. Orbit, the Home-page Launch case and the globe pass.

Extra checks with the fix:
- (a) A temporary LOSE_AT_S = 120 for 3 runs. Locally a = 126.5, 132.2 and 133.1 all passed at p75 1.
- (b) Sabotage: remove `this.physicalSky?.invalidate()` at src/render/scene.ts:333. The test must still fail, on the in-flight mean check (30.1→20.6) and on the Home-page Launch case at p75 128.
- (c) Not yet run: remove `this.envKey = -1` (scene.ts:331) and `this.shadowPrimed = false` (:332) in turn. The probe and shadow checks at :114 and :121 should fail both with and without the fix.

PR CI runs smoke journeys only and will not run fx8. Attach the local logs to the PR, and get CI evidence from a Pages-mode run on the branch if the workflow allows one; otherwise it comes from the first post-merge Pages run. Repeat commit 2 three times on CI's software GPU before calling it fixed.

## Risks

1. Process: SESSION-PROTOCOL.md:32 lets a fix merge under the standing bug-fix approval only if no existing assertion is changed and CI is green.
   - The thresholds are unchanged and one check is added. But the existing p75 and mean-ratio checks now compare the before picture with a replayed after picture at the same flight time, and a reviewer may count that as a changed assertion. Flag it on the Merge Desk card and let the owner decide.
   - Green PR CI proves nothing here, because fx8 is not a smoke journey (scripts/verification/lib.mjs:74).

2. The after picture now comes from the replay path, the player frame, not from the live recordNow frame. A future restore bug that showed only in live drawing could be missed. Both paths draw through the same scene, and live against replay at the same time measured p75 0.

3. Seeking back clears and rebuilds the trail and may add predicted-line points. three re-uploads those buffers itself after a restore. The effect is negligible at 24×16; the measured p75 was 0-2.

4. The p75 < 12 limit is now loose: the true change at the same moment is p75 0-2. With the sky sabotage, p75 stayed at 1 and only the mean-ratio check caught it, which was also true before the fix (p75 9). Tightening the limit is a changed assertion and a decision for the owner, not part of this fix.

5. Wall time: the pin adds about 15-20 s per run. The journey's longest CI time was 239 s, against its 600 s timeout and the 45-minute shard limit. That fits, but a slow shard gets slower. LEAD_S = 25 assumes the warp-10 overshoot stays under about 15 s (the most observed); the guard check turns a silent pass into a visible failure if that assumption breaks.

6. Size budgets are not affected. The change is test-only and nothing goes into dist, so the index-*.js room of 0.6 kB, the i18n room of 0.6 kB and the CSS room of 0 stay as they are. No src or i18n string changes.

7. The fix was verified only on local SwiftShader Chromium, 1-3 runs per variant.

8. The experiment left an uncommitted copy of the fix in /home/user/Orbitlab/.claude/worktrees/wf_7d72c966-75e-5, inside the checkout declared read-only. Confirm the workflow created it on purpose, and build the PR from a fresh worktree using scratchpad/fx8/exp/test-and-fix.diff, not from that tree.

9. Pausing does not stop worker steps already sent. This is a contributing factor to the uncontrolled loss time, not the cause. Leaving it alone means other journeys that pause at warp 10 can also see the cursor move after the pause.

## Open questions

1. Owner: does taking the after picture at the before picture's flight time (seek back) count as a 'changed assertion' under SESSION-PROTOCOL.md:32? If it does, the fix waits for the owner's button instead of merging under the standing bug-fix approval.

2. CI evidence: can a Pages-mode verification run be started on the fix branch (workflow_dispatch or similar)? If not, the first CI proof is the post-merge Pages run.

3. Should the LOSE_AT_S = 133 pin stay permanently? It makes the case deterministic and covers the worst window, at a cost of about 15-20 s per run. The alternative is to go back to 120 once the regression has been shown. Recommendation: keep it, with the guard check.

4. Should pausing, or a warp change, drop or cancel warp-10 advance steps already sent to the worker (src/session/session.ts:124, :195; src/main.ts:2099)? This is app behaviour by design. Changing it is a decision for the owner or a physics/session task, not part of this fix.

5. The two clusters of loss time seen in CI (no a between 126.6 and 130.9) are explained by pending steps, but that is not proven from CI logs, since local runs gave a spread. This does not affect the root cause.

6. Not yet run: sabotage of the envKey and shadowPrimed resets (src/render/scene.ts:331-332), with and without the fix.

7. Handover §9 currently lists the 23ede7f failure (run 37548907257, shard 3) as unexplained. It was FX-8 with the same cause (p75 13), so that bullet should be replaced by the paragraph below. The new paragraph cites file:line on 3e15303, but HANDOVER-K1.md itself exists only on claude/i-k1-handover-s1 (52d9f87), not on main.

## Skeptic reviews

### Skeptic 1

- **Refuted:** False

I could not refute it. The CI data, the code at 3e15303 and an independent probe I ran all support the conclusion: this is a test-design bug, and the renderer restore is correct. The proposed seek-back fix is sound.

1. **The restore draws correctly after the pitch-over.** This was the remaining gap. The experiment's seek-back compared frames inside the same restored context, and only at the before time, before the pitch-over. My probe compares two separate browser contexts across the pitch-over.
   - Journey: /tmp/claude-0/-home-user-Orbitlab/f85185d5-f797-55c3-9547-d6ec255e7662/scratchpad/skeptic1/tree/tests/browser/journeys/zz-skeptic.mjs. Log: scratchpad/skeptic1/sk134.log.
   - Build: dist of a tree I checked file for file against 3e15303 (src, harness, fx8 journey). Renderer: local SwiftShader Vulkan ANGLE, the same device string as CI's 4de951f log.
   - Case L: loss at T+134.25, lost until T+138.85, after picture at T+139.43. Luminance went 30.5±36.5 → 28.0±25.8, p75 16, p90 56. That is the CI fail signature (4de951f: 30.0±35.0 → 28.3±26.0, p75 19).
   - Restored context against a fresh context that never lost anything, at T+134.25, 136, 137, 138, 139 and 139.43: p75 0, maximum change 3 or less.
   - The live restored after picture against the never-lost replay at the same T+139.43: p75 0, maximum 1.
   - No context loss at all, never-lost T+134.25 against T+139.43: p75 16, p90 55. This is the same number as the failing comparison.
   - My rows for T+140 and later are invalid: the cursor could not seek past the paused head.

2. **The confounders do not separate passes from fails.**
   - Commit: the app code did not change between 339b80e and 3e15303 (git diff touches only main.ts and a CSV helper in monte-carlo.ts).
   - CI GPU: the same SwiftShader as my local runs.
   - Shard, preceding journeys and region appear on both sides.
   - The second launch case is the paused pad scene, so its two pictures are of one moment: p75 0.
   - The 5055370 passes are early-cluster runs.

3. **The data I re-checked matches the claim.** I re-grepped all 13 CI logs. Every fail has a ≥ 131.8, and p75 rises with a.
   - The after luminances match the no-loss sweep. The three worst fails (28.2–28.4 ± 26.0–28.5) match about T+138–141. 23ede7f (31.8 ± 38.7) and 6fea83f (30.0 ± 33.5) fall inside the T+136–138 jump.
   - So the after picture lands about b + 0.5–2 s, not 13–15 s later as the brief said.

4. **The cited code matches the description.**
   - The loss point is the 500 ms poll past T+120 at warp 10, then warp 1 (tests/browser/journeys/fx8-context-loss.mjs:163-166).
   - The flight plays on between the two pictures (fx8-context-loss.mjs:87, 110-111).
   - The pass limit is p75 < 12 (fx8-context-loss.mjs:133).
   - Without PEG/IGM the command rate limit applies only below 100 Pa (src/physics/simulation.ts:1022), and the command is held toward the relative wind only while q > 500 (simulation.ts:1109).
   - Each frame asks the worker for up to 0.5 s × warp (src/main.ts:2099), with at most 2 advance requests outstanding (src/session/session.ts:124, 195).
   - The camera phase stays 'ascent' through the window, so there is no camera cut (src/main.ts:150-158).
   - PR CI runs smoke journeys only, and fx8 has no `export const smoke` (scripts/verification/lib.mjs:74).

5. **The fix checks out.**
   - `shown` is set each tick to the frame the views draw (src/main.ts:2374), so `shown.t` names the drawn frame.
   - Seeking behind the head enters replay paused (main.ts:1781-1788).
   - `goLive` when already live is harmless (src/replay/player.ts:78-81).
   - The sabotage run (sky tables not rebuilt on restore) still fails the mean check.

**Gaps:**

1. **Clustering in CI is inferred, not proven.** The two clusters with nothing between them come from the pending warp-10 steps; local runs (E3) gave a spread of loss times instead. This does not affect the root cause: any loss time that puts the window across T+135–139 fails.
2. **CI does not log when its pictures are taken.** Their flight times are inferred from luminance against the sweep. They fit within about ±1 s, and the p75 values within about ±3 of the no-loss pairs; for example, 3e15303's p75 of 9 is a little below the sweep's interpolated value.
3. **The fix compares replay frames, not live ones.** A future restore bug that showed only in live drawing could be missed. My probe and E2 found live and replay pictures at the same time identical (p75 0).
4. **LEAD_S = 25 assumes a bounded overshoot.** The observed overshoot is at most about 15 s; a much slower runner might go further. With the seek-back fix this affects only the failing-first demonstration, not whether the fix is correct.
5. **The fix's experiments ran locally only.** Each variant ran 1–3 times on local SwiftShader; none ran on CI runners.
6. **Pausing does not stop warp-10 steps already sent to the worker.** It is not the cause of this failure, but it is an app quirk that should be considered separately.

### Skeptic 2

- **Refuted:** False

I could not refute the root cause or the proposed fix. I read the code at 3e15303 and the experiment logs myself.

**Root cause: confirmed.** The test compares pictures of two different moments of a flight that keeps moving. The flight plays on between them: go() at tests/browser/journeys/fx8-context-loss.mjs:87, and the next pause only at :110. Where that window falls is not controlled: it is set by the warp-10 poll at :163-166, plus up to two outstanding 5 s worker advances (src/session/session.ts:124,195; src/main.ts:2099).
- The six-DOF load relief is held only while q > 500 Pa (src/physics/simulation.ts:1109). Without explicit guidance it lets go all at once, as src/i18n/en.ts:4140 states (simulation.ts:1022). The stack then pitches over at about T+135-139.
- The no-loss controls fail the same way: noloss133 gives p75 20/16/15, with 30.6±36.7 → 28.0±25.4.
- Same-moment comparisons across the restore show no difference. Before against the restored context at the same flight time (beforeVsBack) gives p75 0-1. Live against replay at the same time (afterVsReplayAfter) gives p75 0-1. I checked both in pinned1.log, pinned-p2.log and pinned-p3.log.
- So the restore draws correctly. There is no app bug here.

**Fix: correct, test-only, minimal, and it loosens nothing.** I checked each step against the code:
- `orbitlab.shown` is set in the same updateVisuals that calls scene.render() every frame (main.ts:2370-2374, 2665). look() reads it in the same task as the pixels, so the time and the picture always match.
- seek (mcp.ts:973 → App.seek, main.ts:1781-1788) runs after the pause, so it enters replay paused: player.playing = this.playing = false. Late worker steps then move only the head, not the replay cursor. ReplayPlayer.frameAt interpolates stored 0.1 s frames, and no thinning happens this early, so `shown.t` equals the requested time to within float error.
- go() runs live and then play, which resumes the live flight exactly (goLive, togglePlay → toggleLiveFlight). The 330-row recording and the events still match the reference flight.
- PhysicalSky computes its tables only once, so a seek cannot re-run the sky rebuild and hide a missing one. E5 confirms the fix still catches the sky-invalidate sabotage: in flight on the mean (30.1→20.6), and the Home-page Launch case at p75 128.
- Seeking back does rebuild some frame-driven geometry: the trail is cleared and rebuilt (syncTrail), and the predicted line can get new points (syncPredicted). three re-uploads those buffers itself after a restore, and they are negligible at 24×16. The env-probe and shadow-primed checks have the same strength before and after the fix, because a seek resets neither envKey nor shadowPrimed.
- Thresholds are unchanged. The fix adds one check, that both pictures show the same flight time.
- It does not affect other journeys. webgl-startup, render-idle and launch-explore are separate modules, and the harness and src are unchanged. The K1 size budgets are untouched, since nothing goes into dist.

**Failing-first plan: sound.**
- The test-only version (LOSE_AT_S=133, LEAD_S=25) failed 5 of 5 times on 3e15303, with p75 14/14/14/15/14 and the CI signature.
- With the fix it passed with p75 1-2. Natural-trigger runs (a = 126.5/132.2/133.1) and a run pinned at T+136 passed with p75 0-1.
- Timing is fine: 25 s of warp-1 flight at about 1× (frame p50 about 300 ms) fits the 60 s until() and the 45-min shard limit, at a cost of about +15 s per journey.

**Gaps:**

1. Process risk. SESSION-PROTOCOL §1 step 3 allows a merge under the standing bug-fix approval only when "no existing assertion is changed" and CI is green.
   - The fix changes what the existing p75 < 12 and mean-ratio checks compare: the after picture now comes from replay at before.t. A reviewer could count that as a changed assertion, which would need the owner.
   - PR CI never runs fx8, because it runs smoke journeys only (scripts/verification/create-plan.mjs:26, lib.mjs:74). So "green CI" proves nothing for this change, and the fix has only been checked on local SwiftShader. The first CI evidence will be a post-merge Pages run, unless a Pages-mode run is started on the branch.
2. The proposal is inconsistent about what gets committed.
   - The worktree has only fix.diff, with LOSE_AT_S still 120 (+22/−6 lines, not the stated +28/−6).
   - failingFirst calls LOSE_AT_S=133 with LEAD_S=25 the "committed form".
   - It needs a decision on whether the pin stays. After the fix it only guards against a revert of the seek-back, and it costs about +15-20 s per run.
3. The failing-first pin never checks that the loss actually landed near T+133. A slow runner whose warp-10 overshoot carries the loss past about T+139 would make the test-only commit pass silently; that happened once with LEAD_S=8, at a = 138.7.
4. Sabotage was tested only for physicalSky.invalidate. Removing `envKey = -1` or `shadowPrimed = false` (src/render/scene.ts:331-332) was not tried with and without the fix. Code reading says both versions behave the same, but this was not shown by a run.
5. With pictures of the same moment, the true change is p75 0-2, so the unchanged limit of 12 is now very loose. Under the sky sabotage, p75 was 1 and only the mean-ratio check caught it. The fix does not tighten the check, though it now could.
6. The claim that pausing does not stop warp-10 steps already sent is described as "not the cause". That is too strong: those steps add +2-5 s and are needed for the late cluster. It is latency by design (the worker catches up time that had already passed), not a hidden app bug, but the report should describe it as a contributing factor.
7. The experiment's fix worktree is at /home/user/Orbitlab/.claude/worktrees/wf_7d72c966-75e-5. That is inside the checkout declared read-only. Check whether the workflow created it on purpose.

## Run of the committed branch (2026-10-08)

`npx vite build && CHROMIUM=/opt/pw-browsers/chromium node tests/browser/run.mjs fx8-context-loss` on `d73f576` (the loss pinned at T+133 plus the fix) passed in 149.1 s:

| Case | Lost window | Pictures at | Luminance before → after | Pixel change (p75 / p90) |
|---|---|---|---|---|
| In-flight Launch | T+133.4 → T+137.9 s | T+133.37 and T+133.37 s | 30.2 ± 35.0 → 30.6 ± 37.5 | 2 / 5 |
| Orbit | — | — | — | 3 / 15 |
| Home-page Launch | — | — | — | 0 |
| Home | — | — | — | 0 |

Every in-flight Launch picture matched, and so did the 330 telemetry rows to T+160 s, compared with the reference flight.
