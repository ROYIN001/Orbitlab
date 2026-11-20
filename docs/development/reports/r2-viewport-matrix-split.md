# Split of `r2-viewport-matrix`: the desktop sizes and `r2-viewport-matrix-phone`

| Field | Value |
|---|---|
| Package | none: the follow-up "Split `r2-viewport-matrix`" of the R2.6 report (follow-up 10), done on the owner's word in chat |
| Items | none closed; the journey is CO-3's (M-LAUNCH-019) |
| change_kind | quality-improving (tests and the verification map only; no app code, no `budgets.json`) |
| The owner's words | 2026-11-20 at 04:14:36Z, verbatim: "แยก r2-viewport-matrix ต่อได้เลยครับ" (go ahead and split r2-viewport-matrix) |
| Base | main `a15856b3` (the records PR #226) |
| Branch | `claude/friendly-keller-78iuc9`, started again from main `a15856b3` once #226 had merged (it held only #226's merged content) |
| Status | In PR; not merged; not published |

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
old code, unchanged. The open finding F3 (cluster chips overlap on a phone's
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
slowest CI time. `r2-viewport-matrix-phone` exports 720 000 ms, about 2.1 times
its part's. No `timeoutMs` value goes up, but in effect the desktop part's
allowance does: it had what the phone part left of the shared 1200 s, 854.8 to
1039.6 s in those runs, and now has its own 1200 s. The phone part's goes down,
from 587.1–870.2 s to 720 s. Together the two may take 1920 s, where the one
journey had 1200 s.

## What else changes

- **`tests/browser/shard-seconds.json`.** `r2-viewport-matrix` 718 → 600 and a
  new `r2-viewport-matrix-phone` 360: both are estimates by the table's own rule
  for a journey CI has not timed, half its `timeoutMs`, since CI has timed
  neither part alone. The table's notes give the measured medians above, for
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
still holds roughly of the desktop part (537 to 545 s here, below). The CO-3
report and the other reports that name the journey are history.

## Checks

**The split makes exactly the old checks.** A first agent wrote a recorder
outside the checkout: it loads a journey as `tests/browser/run.mjs` does (the
same browser launch, served `dist`, time limit and failure handling) and records
every `t.check` with its message and result, every direct `t.fail` and every
`t.log` line. It ran, one browser at a time, in the CI runners' font (DejaVu
Sans), on one build of this tree: the journey as it is on main, then
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

**A second agent tried to refute the change** and did not run a browser. It
found two things that had to change, a missing fragment and a wrong run count
and date in the shard table's note, and two that should: the change-map rule
above, and saying that the desktop part's allowance grows in effect. All four
are done. It found the code itself the same as before, from the sweep to the
end of the file, with the groups' settings and the order of the flights as
they were.

**Local checks on this tree.** `node --test tests/verification/*.test.mjs
tests/browser/shard.test.mjs`: 98 / 98. `node tests/browser/run.mjs --smoke
--list`: 27 journeys, held ones left out (main lists 26: the one more is
`r2-viewport-matrix-phone`). `git diff --check`: clean.

**Not checked:** either part in the container's other font, Inter; a second run
of the old journey; typecheck, vitest and the budget (no file they read
changes); any other journey.

## Rule 2

Both journeys are new or changed, so each runs 20 times on CI before merge. One
temporary commit, reverted before merge, changes `tests/browser/run.mjs` on CI
only: each of the five smoke shards runs `r2-viewport-matrix` and then
`r2-viewport-matrix-phone`, once each, in place of its own list. One CI run
gives 5 of each, so four runs give 20: this PR's own run, then three
`workflow_dispatch` runs, each started once the one before has ended. A shard's
two journeys took about 490 to 960 s together in the runs above, of a 25-minute
job; two of each a shard could pass 25 minutes on a slow runner. While that
commit is the head, `browser-smoke (1–5)` and `verify` are red by design.

## Who owns this ground

The journey is CO-3's viewport matrix; plan S18 §18.2 names CO-3's screenshots
among lane Q's work, and the shard table and the change map are lane T's. The
R2.6 report left the split for the integration session or the owner to place.
The owner asked this session for it (above).

## Follow-ups

1. **Refresh the two shard-table entries** from the parts' own CI times, once
   rule 2's runs and the runs after it exist (with the R2.6 report's
   follow-up 11). *Owner (proposal):* lane T.
2. **Split the desktop part further** only if a CI run takes it past about two
   thirds of its limit (800 s): its six-DOF leg alone took 230.4–483.0 s.
   *Owner (proposal):* lane Q.
