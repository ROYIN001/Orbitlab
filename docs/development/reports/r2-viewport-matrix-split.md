# Split of `r2-viewport-matrix`: the desktop sizes and `r2-viewport-matrix-phone`

| Field | Value |
|---|---|
| Package | none: the follow-up "Split `r2-viewport-matrix`" of the R2.6 report (follow-up 10), done on the owner's word in chat |
| Items | none closed; the journey is CO-3's (M-LAUNCH-019) |
| change_kind | quality-improving (tests and the verification map only; no app code, no `budgets.json`) |
| The owner's words | 2026-11-20 at 04:14:36Z, verbatim: "แยก r2-viewport-matrix ต่อได้เลยครับ" (go ahead and split r2-viewport-matrix) |
| Base | main `a15856b3` (the records PR #226) |
| Branch | `claude/friendly-keller-78iuc9`, started again from main `a15856b3` once #226 had merged (it held only #226's merged content) |
| Status | In PR #227; not merged; not published. The owner wrote at 05:33:13Z, verbatim, "Open PR then merge": the session reads it as the order to merge once the PR is ready by the repository's rules (below, "The merge") (2026-11-20: merged on that order at 08:56:27Z as `976731ca`, after CI 44703543068 on the head `69b48f8f`, 12 of 12 jobs; published by Pages 44706531663 at 09:22:27Z, 13 of 13 jobs; the live site gave `976731c` at 15:25:41Z. The records PR after #227 folded this PR's fragment, `changes/claude-friendly-keller-78iuc9.md`, into `CHANGELOG.md` and `docs/development/PROGRESS.md` and deleted it.) |

## Why

`r2-viewport-matrix` flew two missions (the default six-DOF flight, and a Soyuz MS
to the ISS flown to its Kurs approach, the TORU panel) in four fresh contexts:
the desktop sizes and the phone sizes, each with both missions. It is a smoke
journey, so PR CI runs it in one browser shard of a 25-minute job, and its own
limit is 20 minutes (`timeoutMs` 1 200 000).

In 26 runs of it, in 16 CI runs on 2026-11-19 (44522372109, its second attempt,
to 44629661945: #224's first run, its rule 2 runs and the later runs of #224 and
#225), it took 490.2 to 958.1 s, median 706.2 s. The slowest, 958.1 s, left
242 s of its limit. The R2.6 report's follow-up 10 asked for the split; the
session had proposed it as its next work, and then did not start it on the
owner's message of 2026-11-19 at 21:17:43Z, "ทำต่อให้จบแล้วยังไม่ต้องเปิดงานใหม่เพิ่มครับ"
(carry on to the end, and do not open any more new work for now), as it read
that message. The owner then asked for it on 2026-11-20 at 04:14:36Z (above).

## The legs' CI times

From the journey's own log lines in those 26 runs (each leg from the last line
of the leg before it, or the journey's start, to its own last line; the last
leg to the journey's result line):

| Leg | Median (s) | Min (s) | Max (s) |
|---|---|---|---|
| desktop, six-DOF flight | 361.25 | 230.4 | 483.0 |
| desktop, TORU flight | 104.65 | 83.5 | 131.3 |
| phone, six-DOF flight | 98.6 | 69.0 | 134.8 |
| phone, TORU flight | 142.9 | 91.4 | 210.4 |
| **desktop (both flights)** | **469.15** | **329.8** | **612.9** |
| **phone (both flights)** | **237.25** | **160.4** | **345.2** |
| the whole journey | 706.2 | 490.2 | 958.1 |

(The medians of the two parts are of each run's sum, so they do not add to the
whole's median.)

## The split

The journey's four contexts are two groups, desktop and phone, and each group
already had its own presets, touch setting and boot language. The split follows
that seam:

- **`r2-viewport-matrix`** runs the 14 desktop sizes (the tablet up), both
  missions, booted in Thai, without touch.
- **`r2-viewport-matrix-phone`** (new) runs 390×844 and 320×740, both missions,
  in phone contexts (touch, mobile viewport), booted in Russian.

Both run one exported function, `viewportMatrix(t, group)`, which does for one
group what the journey's loop did for each group: the same presets, touch
setting, boot language and first-use guide, both flights in the same order, each
in a fresh context closed in `finally` after `checkErrors`. Every check is the
old code, unchanged; the fix after rule 2's first round adds one wait and one
check (below, "The failure after round 1, and its fix"). The open finding F3 (cluster chips overlap on a phone's
event bar) stays in the one shared list; its pattern starts with `phone`, so only
the phone part meets it. The scene-size log and the open-finding log are now
written per part. `r2-viewport-matrix-phone` imports from
`r2-viewport-matrix.mjs`, as `r2-flight-wall` imports from `r2-event-jump.mjs`.

Other splits were weighed on the same numbers. By mission (six-DOF on both
groups, TORU on both) the longer part would be 461.5 s median and 616.4 s at
most. The desktop six-DOF leg alone against the other three legs balances best
(at most 483.0 s and 476.5 s) but cuts across the groups the code already has.
By group the longer part is 469.15 s median and 612.9 s at most, against
958.1 s for the whole.

**Limits.** `r2-viewport-matrix` keeps 1 200 000 ms, about 2.0 times its part's
slowest time in the whole journey's 26 CI runs (612.9 s).
`r2-viewport-matrix-phone` exports 720 000 ms, about 2.1 times its part's
(345.2 s). Rule 2's runs bring the first to 1.78 (below, "What the runs add to
the limits"). No `timeoutMs` value goes up, but in effect the desktop part's
allowance does: it had what the phone part left of the shared 1200 s, 854.8 to
1039.6 s in those runs, and now has its own 1200 s. The phone part's goes down,
from 587.1–870.2 s to 720 s. Together the two may take 1920 s, where the one
journey had 1200 s.

## What else changes

- **`tests/browser/shard-seconds.json`.** `r2-viewport-matrix` 718 → 600 and a
  new `r2-viewport-matrix-phone` 360: both are estimates by the table's own rule
  for a journey CI has not timed, half its `timeoutMs`, since CI had timed
  neither part alone when the split was made; rule 2's runs (below) are the
  first CI times of each part, for follow-up 1. The table's notes give the measured medians above, for
  the next refresh. The two estimates add to 960 s, more than the old 718, so
  the planned shard totals rise: the five smoke shards come to 837, 840, 824,
  823 and 841 s (before, at most 794 s). Scored with measured CI times instead,
  the worst smoke shard falls, from 987 to 897 s at the journeys' medians and
  from 1077 to 996 s at their maxima (the second agent's count, from 142 saved
  shard logs; it leaves out each job's set-up).
- **`scripts/verification/change-map.json`.** `r2-viewport-matrix-phone` joins
  `layout-journeys` beside `r2-viewport-matrix`. A new additive rule,
  `viewport-matrix-shared`, selects `r2-viewport-matrix-phone` when
  `tests/browser/journeys/r2-viewport-matrix.mjs` changes, since the phone part
  runs that file's code; a journey file otherwise selects only itself.
  `validateMap` holds.
- **Comments.** `tests/browser/scene-floor.mjs` and
  `tests/browser/journeys/r2-shell-smoke.mjs` name both parts where they named
  the journey; `scene-floor.mjs` also gives `r2-viewport-scene-floor` its name,
  for `r2-scene-floor`.

Not changed: `.github/workflows/deploy.yml`'s comment on its 45-minute browser
job, "the G2 matrix journey (CO-3) runs 7-10 min alone on a 4-core machine",
still holds roughly of the desktop part: 533.8 to 544.8 s locally (below), and
348.8 to 673.4 s on CI in rule 2's runs. The CO-3
report and the other reports that name the journey are history.

## Checks

**The split makes exactly the old checks.** A first agent wrote a recorder
outside the checkout: it loads a journey as `tests/browser/run.mjs` does (the
same browser launch, served `dist`, time limit and failure handling) and records
every `t.check` with its message and result, every direct `t.fail` and every
`t.log` line. It ran, one browser at a time, in the CI runners' font (DejaVu
Sans), on one build of the split commit `813658b9`: the journey as it is on
main, then
`r2-viewport-matrix`, then `r2-viewport-matrix-phone`.

| Run (2026-11-20, alone, DejaVu Sans) | Result | Seconds | Checks |
|---|---|---|---|
| the old journey (main's file), by the recorder | passed | 791.7 | 1456, all passed |
| `r2-viewport-matrix`, by the recorder | passed | 544.8 | 1283, all passed |
| `r2-viewport-matrix-phone`, by the recorder | passed | 229.9 | 173, all passed |
| `r2-viewport-matrix`, by `run.mjs` | 1/1 passed | 537.3 | |
| `r2-viewport-matrix-phone`, by `run.mjs` | 1/1 passed | 212.4 | |

1283 + 173 = 1456. Compared message by message, the two sides differ in 6 checks
each way, the same 6 at the same places, each with a value that changes from run
to run: the launch time's milliseconds in the four `launch_mission` results, and
the T+ time at which each TORU flight paused. With those two values masked the
old sequence of checks equals the desktop part's followed by the phone part's,
results included. The log lines match too, timings masked: the 42 desktop
scene-size rows are only in `r2-viewport-matrix`, the 6 phone rows only in
`r2-viewport-matrix-phone`, and the three lines of open finding F3 only in the
phone part, word for word.

These counts are of the split commit, `813658b9`. The fix below adds one check to
the six-DOF flight, which each part flies once, so on the head that merges each
part makes one check more, 1284 and 174, by the code; the recorder did not run
again.

**A second agent tried to refute the change** and did not run a browser. It
found two things that had to change, a missing fragment and a wrong run count
and date in the shard table's note, and two that should: the change-map rule
above, and saying that the desktop part's allowance grows in effect. All four
are done. It found the code itself the same as before, from the sweep to the
end of the file, with the groups' settings and the order of the flights as
they were. That review was of the split commit; a fourth agent reviewed the fix
(below).

**Local checks**, on the split commit and again on the head that merges. `node --test tests/verification/*.test.mjs
tests/browser/shard.test.mjs`: 98 / 98. `node tests/browser/run.mjs --smoke
--list`: 27 journeys, held ones left out (main lists 26: the one more is
`r2-viewport-matrix-phone`). `git diff --check`: clean.

**Not checked:** either part in the container's other font, Inter; a second run
of the old journey; the recorder on the fixed code (the head's 1284 and 174
checks are counted from the code); typecheck, vitest and the budget (no file they read
changes); any other journey.

## Rule 2

Both journeys are new or changed, so each runs 20 times on CI before merge. Rule
2 ran twice on this PR. The first round ran the split commit's code. The fix
that followed it changed the shared six-DOF flight, so the second round ran the
fixed code, and that round is the one the merge rests on (below, "The failure
after round 1, and its fix", and "Round 2: the fixed code").

### Round 1: the split commit

One temporary commit, "TEMPORARY (rule 2 evidence, reverted before merge): CI's
smoke shards run only the two viewport-matrix journeys, 5 of each a run"
(`0bc52d2d`), changed `tests/browser/run.mjs` on CI only: each of the five
smoke shards ran `r2-viewport-matrix` and then `r2-viewport-matrix-phone`, once
each, in place of its own list. One of each a shard, not two: two of each could
pass the 25-minute job on a slow runner. Four CI runs gave 20 of each: this PR's
own run, then three `workflow_dispatch` runs, each queued once the one before
had ended. Each run was read from its six raw job logs (the five shards and
`verify`) by a script that checks each shard's executed list, its passed lines,
its "2/2 journeys passed" line, that its only errors are the two by design, and
that its log names its own gate and run; and in `verify`'s log the jobs'
results, the suites and the issue list.

| Run | Event | Shard 1 | Shard 2 | Shard 3 | Shard 4 | Shard 5 |
|---|---|---|---|---|---|---|
| [44680617625](https://github.com/ROYIN001/Orbitlab/actions/runs/44680617625) | pull_request | 2/2 in 884.1 s | 2/2 in 691.3 s | 2/2 in 689.8 s | 2/2 in 896.4 s | 2/2 in 891.1 s |
| [44682687227](https://github.com/ROYIN001/Orbitlab/actions/runs/44682687227) | workflow_dispatch | 2/2 in 617.8 s | 2/2 in 636.5 s | 2/2 in 680.4 s | 2/2 in 850.8 s | 2/2 in 838.9 s |
| [44684864794](https://github.com/ROYIN001/Orbitlab/actions/runs/44684864794) | workflow_dispatch | 2/2 in 635.4 s | 2/2 in 869.6 s | 2/2 in 696.5 s | 2/2 in 707.0 s | 2/2 in 879.3 s |
| [44687113719](https://github.com/ROYIN001/Orbitlab/actions/runs/44687113719) | workflow_dispatch | 2/2 in 921.5 s | 2/2 in 919.0 s | 2/2 in 864.1 s | 2/2 in 874.1 s | 2/2 in 817.9 s |

Each journey's 20 times, run by run, in shard order (seconds):

| Journey | Run 1 | Run 2 | Run 3 | Run 4 | Passed | Range |
|---|---|---|---|---|---|---|
| `r2-viewport-matrix` | 673.4, 513.1, 517.2, 640.9, 671.3 | 426.3, 446.6, 498.2, 618.5, 590.9 | 440.7, 648.6, 522.2, 513.9, 658.4 | 665.0, 654.6, 650.8, 658.3, 573.0 | 20 of 20 | 426.3–673.4 s |
| `r2-viewport-matrix-phone` | 207.0, 175.3, 168.2, 251.4, 216.0 | 187.6, 185.6, 179.1, 228.8, 244.1 | 189.5, 217.1, 171.4, 190.2, 216.0 | 251.1, 260.8, 208.9, 211.6, 240.6 | 20 of 20 | 168.2–260.8 s |

None of the 40 journey runs failed. In all four runs `plan`, `typecheck`,
`build` and `test` (1) to (3) passed, with 10,885 of 10,885 unit tests, by
`verify`'s own job results; `browser-smoke` (1) to (5) and `verify` were red only
by design: each shard reported "Executed browser journeys differs from the
verification plan" after its "2/2 journeys passed", and `verify` reported
"Coverage mismatch: 25 missing, 0 unexpected, 8 duplicate". One comment on the
PR says so. No job was run again. The temporary commit is reverted: the revert
was pushed alone at 06:40:05Z, and its tree is the split commit's.

### The failure after round 1, and its fix

**The failure.** After round 1 the revert (`c7cb9421`) was followed by the
records (`a80040d4`), whose push cancelled the revert's own run, [44689422044](https://github.com/ROYIN001/Orbitlab/actions/runs/44689422044): CI's concurrency group
keeps one run a branch. The normal CI run on `a80040d4`, [44689626224](https://github.com/ROYIN001/Orbitlab/actions/runs/44689626224),
failed in `browser-smoke (2)`: `r2-viewport-matrix-phone` failed at its first
measurement of the six-DOF panel (390×844, Thai, the guide open), 16 s into the
journey, and passed all its other checks; the shard's other five journeys and
the run's other four shards passed.

> phone phone-390x844 TH guide open: six-DOF controls: not reachable — not rendered (0×0, visible)

**The cause** is in the shared code, and the whole journey had it too.
`sixDofFlight` called `launch_mission`, waited for the flight stage and paused
at once. The launch hides the six-DOF panel (`rigidControls.reset()` in
`src/main.ts`), and only the telemetry block of the frame loop shows it again,
on a 0.5 s cadence (`telTimer`, counted in frame time clamped to 0.1 s a frame,
and not reset at the launch). The flight stage is set in the first frame after
the launch (`syncLifecycle`), so when the cadence's next tick is still ahead,
the stage comes one or more frames before the panel, and a measurement in those
frames finds the panel at 0×0. The cadence keeps running while paused, so the
panel then shows during the pause: only a first measurement made at once can
miss it. In the failed run the next sizes' checks, seconds later, passed.

**Shown locally** by a third agent, with a probe outside the checkout, one fresh
browser per trial, in the phone part's first context (390×844, touch, the guide
open). With the order before the fix the panel was
hidden right after the pause, and still 500 ms into it, in 0 of 10 trials
plainly and in 1 of 10 each with the page's CPU throttled 4× and 6×; each time it
showed by 3 s, still paused. With the fixed order it was hidden after the pause
in 0 of 30 trials (10 plain, 10 at 4×, 10 at 6×). The panel showed at most 3.65 s after
the launch, the fix's wait itself about 3.5 s of its 20 s, in the one trial that
found it hidden at the flight stage (only the 10 trials at 6× looked at the
panel there). On CI the race showed once in the 94 runs of a group's six-DOF
flight on this code that this PR read (both groups in each of the whole
journey's 26 runs, round 1's 40 journey runs and this run's two parts).

**The fix**, `80bed88c` ("Tests (bug fix): the viewport matrix's six-DOF flight
waits for its panel before it pauses"), is test-only: before the pause the
six-DOF flight waits, with the journey's own 20 s, until `#rigid-controls` is
visible, and fails a check if it never is, as `r2-shell-smoke` does before it
measures that panel. No check is removed or loosened. Its code comment gives the
mechanism inexactly: it says the panel comes "only with the first six-DOF frame
on screen", but the frame on screen already carries six-DOF telemetry, even on
the pad, and what the panel waits for is the cadence's tick (follow-up 3). A
fourth agent tried to refute the diagnosis and the fix and could not: it found
no other path that hides the panel between the wait and the first check, and the
TORU flight already waits for its own panel before it pauses. Both parts passed
on the fixed tree locally, by `run.mjs`, in DejaVu Sans: `r2-viewport-matrix-phone`
in 231.0 s and `r2-viewport-matrix` in 533.8 s. A second comment on the PR says
what failed, why, and that rule 2 runs again; its first account of the cause,
the first-frame one, was corrected in place at 08:07Z.

### Round 2: the fixed code

A second temporary commit, `916c30ec` ("TEMPORARY (rule 2 evidence, reverted
before merge): … after the fix"), made the same change to `tests/browser/run.mjs`
on the fix. Four more CI runs, the PR's own and three `workflow_dispatch` runs,
were read in the same way:

| Run | Event | Shard 1 | Shard 2 | Shard 3 | Shard 4 | Shard 5 |
|---|---|---|---|---|---|---|
| [44691861812](https://github.com/ROYIN001/Orbitlab/actions/runs/44691861812) | pull_request | 2/2 in 949.9 s | 2/2 in 512.3 s | 2/2 in 888.0 s | 2/2 in 633.6 s | 2/2 in 618.8 s |
| [44694281404](https://github.com/ROYIN001/Orbitlab/actions/runs/44694281404) | workflow_dispatch | 2/2 in 624.9 s | 2/2 in 704.1 s | 2/2 in 715.9 s | 2/2 in 674.8 s | 2/2 in 879.2 s |
| [44696479009](https://github.com/ROYIN001/Orbitlab/actions/runs/44696479009) | workflow_dispatch | 2/2 in 918.9 s | 2/2 in 888.9 s | 2/2 in 897.0 s | 2/2 in 923.2 s | 2/2 in 707.0 s |
| [44698746207](https://github.com/ROYIN001/Orbitlab/actions/runs/44698746207) | workflow_dispatch | 2/2 in 851.7 s | 2/2 in 695.3 s | 2/2 in 693.2 s | 2/2 in 487.5 s | 2/2 in 610.6 s |

Each journey's 20 times, run by run, in shard order (seconds):

| Journey | Run 1 | Run 2 | Run 3 | Run 4 | Passed | Range |
|---|---|---|---|---|---|---|
| `r2-viewport-matrix` | 667.2, 371.7, 655.9, 442.9, 443.9 | 437.2, 525.3, 515.0, 502.7, 648.0 | 668.7, 660.9, 646.2, 668.8, 511.1 | 605.2, 510.3, 511.0, 348.8, 422.1 | 20 of 20 | 348.8–668.8 s |
| `r2-viewport-matrix-phone` | 278.4, 138.1, 228.4, 185.2, 168.7 | 182.1, 175.3, 198.2, 169.2, 226.7 | 246.3, 224.3, 247.2, 250.5, 192.8 | 243.0, 182.3, 179.8, 136.6, 183.8 | 20 of 20 | 136.6–278.4 s |

None of the 40 journey runs failed. In all four runs `plan`, `typecheck`,
`build` and `test` (1) to (3) passed, with 10,885 of 10,885 unit tests, and
`browser-smoke` (1) to (5) and `verify` were red only by design, as in round 1.
No job was run again. The second temporary commit is reverted (`68301771`), and
the revert's tree is the fix's.

### What the runs add to the limits

In the two rounds the desktop part took at most 673.4 s, slower than any of its
26 earlier times (at most 612.9 s): its 1200 s limit is 1.78 times that, not 2.
The phone part took at most 278.4 s, under its earlier 345.2 s; 720 s is 2.59
times it. A shard's two journeys took 487.5 to 949.9 s of its 25-minute job.

### CI on the head that merges

The revert of the second temporary commit and these records are pushed
together, so the head that merges is their head, and its CI run is the first
normal run of the fixed code, with both journeys in their own shards. Its result
is in the PR's description and the merge commit's message, which come after
these records.

## The merge

The owner's words: 2026-11-20 at 04:14:36Z, "แยก r2-viewport-matrix ต่อได้เลยครับ"
(go ahead and split r2-viewport-matrix), and at 05:33:13Z, after the PR had
opened as a draft, "Open PR then merge". What follows is the session's reading,
not the owner's words. It merges this PR on the second message, without a
second question, once it is ready by the repository's rules: rule 2's runs in
(after the fix, its second round), the temporary commits reverted, these records
in the PR and CI green on the head that merges. It tells the owner that head
before it merges. The head at 05:33Z was the first temporary commit,
`0bc52d2d`, which could not merge: it would have made every later
PR's CI run only these two journeys. The session told the owner so at once, and
that a word from the owner could have it skip rule 2; the owner did not ask for
that.

## Who owns this ground

The journey is CO-3's viewport matrix; plan S18 §18.2 names CO-3's screenshots
among lane Q's work, and the shard table and the change map are lane T's. The
R2.6 report left the split for the integration session or the owner to place.
The owner asked this session for it (above).

## Follow-ups

1. **Refresh the two shard-table entries** from the parts' own CI times: rule
   2's second round (on the fixed code) and the normal runs after the merge (with the R2.6 report's
   follow-up 11). *Owner (proposal):* lane T.
2. **Split the desktop part further** only if a CI run takes it past about two
   thirds of its limit (800 s): its six-DOF leg alone took 230.4–483.0 s in the
   whole journey's runs, and the desktop part reached 673.4 s in rule 2's.
   *Owner (proposal):* lane Q.
3. **Correct the fix's code comment** in `tests/browser/journeys/r2-viewport-matrix.mjs`
   the next time that file changes for another reason: the panel comes back
   with the 0.5 s telemetry tick after the launch hid it, not with a first
   six-DOF frame ("The failure after round 1, and its fix"). A change to the comment alone would have needed rule 2's
   20 runs a third time. *Owner (proposal):* lane Q.
4. **The app could show the panel in the same frame as the flight stage**, by
   setting `telTimer` past its 0.5 s at the launch, as `seek` and a six-DOF
   command already do in `src/main.ts`. Not needed for this tests-only PR, and
   it changes app code. *Owner (proposal):* lane U, if wanted.
