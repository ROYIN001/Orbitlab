# The T-1 checks: the workers' answers and the build's modules

The checks of plan [S20-T1](../../../docs/development/plan/S20-T1.md), Task A: written and run on
today's build first, then run unchanged on the build that makes the twelve workers share their code
(Task B). None of them is a journey (`tests/browser/run.mjs` reads `journeys/` only) and no suite
runs them: each is run by hand, on a build made in place in the checkout of the commit it measures.
Nothing they write is committed; the numbers that matter are below.

| File | What |
|---|---|
| `canonical.mjs` | `canonicalBytes(value)` and `digest(values)`: the canonical bytes the answers are hashed by; tested by `tests/verification/t1-canonical.test.mjs` (`node --test`, CI's `plan` job). It refuses, as having no canonical form, a Map or Set, any object the rule does not name (an Error, a RegExp, a boxed number), a string with a lone surrogate and an array with a hole |
| `../../fixtures/t1/requests.json` | the twelve requests, written by `../../fixtures/t1/build-requests.ts.txt` (its first lines say how to run it) |
| `worker-digests.mjs` | each worker of a build sent its requests in Chromium, its answers hashed; the cancel, precache and failed-load checks; and `--compare` of two outputs |
| `bundle-modules.mjs` | the modules of two builds with source maps, and what each worker and the page load at start |
| `first-load.mjs` | the app's first load three times: time to ready, requests, bytes, console errors; with a URL, also the lifetime worker run from its source |

## How each is run, and what a pass looks like

Builds are made as plan §3 says: a commit's `dist` in its own checkout (`npx vite build`), the
baseline in a `git worktree` of the baseline commit at `$T1/base`, where `$T1` is a folder outside the
repository. The scripts are run from this checkout on either build.

```sh
# the canonical bytes
node --test tests/verification/t1-canonical.test.mjs                        # every case passes

# the twelve workers: one output per build, then the comparison of two outputs
node tests/browser/t1/worker-digests.mjs <dist folder> <out.json>           # ends "worker digests: ok"; exit 0
node tests/browser/t1/worker-digests.mjs --compare <a.json> <b.json>        # ends "the two outputs agree"; exit 0

# the modules, on two builds made with source maps (npx vite build --sourcemap --outDir <folder> --emptyOutDir 2>&1 | tee <folder>.log)
node tests/browser/t1/bundle-modules.mjs <build A> <build B> <out.json> [<build log> …]   # "sets: equal", ends "bundle modules: ok"

# the first load, on a build, or on a server already running (the development server of npx vite)
node tests/browser/t1/first-load.mjs <dist folder> <out.json>               # three "ok" runs, ends "first load: ok"
node tests/browser/t1/first-load.mjs http://localhost:5173/ <out.json>       # the same, and "ok … the lifetime worker from its source … equals the baseline's"
```

**`worker-digests.mjs`** prints one line per worker (the digest's first 12 hex digits, the messages by
type, the seconds, and how many messages came after the end when any did), then the three checks' lines, and writes `out.json` and the canonical bytes of each
worker's compared sequence to `<out.json>.raw/<worker>.bin` (the flight's is about 400 MB). A worker
fails the run on a worker `error` event, a reply of type `error`, no end within 120 s, a console error
on its page, its row's condition (screening: the list is not empty; recheck: 4 match and 2
borderline among its 6 records), or any message or error event in the one second it is still listened
to after its row's end (`afterEnd` in `out.json`; those messages are counted, never hashed). What the comparison leaves out is exactly the plan's table: the
ratings `result.elapsedMs`, the Monte Carlo `run.ms`, the screening `progress` messages (counted, not
hashed), every field named `app` in a recheck reply; nothing of the flight, whose `advance` goes with
`budgetMs: 1e9`. Two outputs **agree** when each passed by itself (its `ok` true, no worker with a
failure; `--compare` names the one that did not), every worker's digest and messages are equal
(screening's `progress` count aside), every worker's `afterEnd` is equal, cancel and precache pass in both, and the failed-load check records the same
for each worker in both; `--compare` says so, and for a digest that differs it reads both raw files back
and names the first differing message and field.

The failed-load check's pass is that the worker posts no answer (`result`; `run` for monte-carlo;
`delta` for flight). What the Worker object did is recorded per worker (`error`, `message <type>`, or
`nothing`) and is what Task B compares; on the baseline each worker is one file, so its entry file is
the one aborted, and on a build where the entry imports other files the first of them is.

**`bundle-modules.mjs`** fails when the two sets of (source path, SHA-256 of its `sourcesContent`)
differ, when a source has no content, or when a log given has `INEFFECTIVE_DYNAMIC_IMPORT`. For the
page's entry and each worker it lists the files loaded at start and the modules in them
(`entries.<name>.a.sources`, `.b.sources`, and what one has that the other has not). A source path is
written from the checkout's root (see the file's header), so builds made in different folders compare.
Checked here: the baseline's map build against one of this checkout (the same sources, built from
another folder into another) gave equal sets; one source's content changed by one byte in a copy of a
build gave `sets: DIFFER` and exit 1.

**`first-load.mjs`** passes when the app is ready three times with no console error; there is no bound
on the time. With a URL it also passes only when the lifetime worker started from its source answers
with the baseline's digest (below; a third argument can name another digest, or an output of
`worker-digests.mjs` to take it from).

## Measured on the baseline

Baseline: `efd6fd731e60193069c13878a4aae069cca25a97` (`efd6fd7`, the commit of main that this
package's branch is cut from), built in a `git worktree` of it at `$T1/base`. Its dependencies were
not installed with `npm ci`: its `package-lock.json` is identical to this checkout's (`cmp`), so
`$T1/base/node_modules` is a symbolic link to this checkout's `node_modules`. Vite 8.3.0, Node
22.23.5, Chromium 158.0.8127.36 (the browser the journeys launch), on a 4-core machine; 2026-11-28.

What was run, in this order:

1. `npx vite build` in `$T1/base`, `dist` copied to `$T1/base-dist-1`, `npx vite build` again. The
   two `dist` folders differ only in `build-info.json`'s `builtAt` (and its line of `SHA256SUMS`).
2. `worker-digests.mjs` on `$T1/base-dist-1` and on `$T1/base/dist`: both `worker digests: ok`;
   `--compare` of the two: **the two outputs agree**.
3. `npx vite build --sourcemap` into `$T1/base-maps` and `$T1/base-maps-2`, logs beside them;
   `bundle-modules.mjs` on the pair with both logs: **sets equal**, 36 maps and 589 (source, content)
   pairs each, no source with two contents, no `INEFFECTIVE_DYNAMIC_IMPORT`, `bundle modules: ok`.
4. `first-load.mjs` on `$T1/base/dist`: `first load: ok`.
5. After the review round (an output that failed cannot agree; a second after the end; the three
   values `canonicalBytes` now refuses), `worker-digests.mjs` once more on `$T1/base/dist`: `worker
   digests: ok`, the twelve digests and messages as below, `afterEnd` 0 for every worker, the three
   checks' lines as below. Its `--compare` with the second run's output says they do **not** agree,
   only because that older output has no `afterEnd` ("not recorded"); every other line agrees and both
   outputs passed by themselves.

### The twelve workers

The same digest and the same messages in all three runs (the third, after the review round, also with
no message in the second after each end). Seconds are from the first post to the end, for information
only (first run / second run; the third run's: flight 19.3 s, monte-carlo 52.5 s, every other within
0.1 s of the second's).

| Worker | Digest (SHA-256 of the compared sequence) | Messages | Seconds |
|---|---|---|---|
| flight | `c6f4d2b7a2b20e28abf1747c7d27694484af81a05071f7d947871de250675656` | delta 61 | 23.6 / 20.0 |
| tune | `54cfc885534f53a5f18da54e1a773ba198ecae244ced9c30d6fcf33c6979c2b8` | progress 30, result 1 | 2.9 / 2.7 |
| attitude-tune | `1b4fb520e6c62ba41c854bb3c815d21c933777e86971f20e3dcd06e0278b8f5e` | progress 1, result 1 | 0.0 / 0.0 |
| monte-carlo | `2fc624fa4eb2dbd4c9868f1686b4339984ef048e9be3b90805ffdd9e72988bd3` | run 2 | 58.5 / 56.6 |
| ratings | `69d6d93ebb25f41c072c9ed838a26993b3f54c64beec483a3db93e42e91f8afd` | progress 12, result 1 | 0.4 / 0.4 |
| readiness | `4cd51a8ac671ac1c704883a6377c4828f0e3eb89892d9f9a9106243bd770bf5c` | result 1 | 0.1 / 0.1 |
| reentry | `2e9d0cefaa852323e5b81db60e11900235e56ba189ca3c1315b7a07ad7eeda53` | progress 5, result 1 | 0.5 / 0.5 |
| screening | `081cfe82d932d34a59451b79be1a6b40943c99b626c85b04aab793951769d348` | progress 1, result 1 | 0.0 / 0.0 |
| lifetime | `cfecb3372a0575384bdddd1706cdda62e4aab9f2f845f4f4758b682ee50a3eac` | progress 3, result 1 | 0.2 / 0.2 |
| lifetime-altitude | `5e524edff576d7eb9158659391d5a349a1682e3a2a0c3105f27d21dd24f51314` | progress 1736, result 1 | 4.8 / 4.8 |
| requirement-trades | `2a1f1031da63dd0cacf741b9f1bad884e83420139f7033066f11a359c4562d02` | progress 94, result 1 | 0.9 / 1.0 |
| recheck | `036fe826f59c472676b1db9f86e1ad8ee3f6710838e0ada1a72f34cac73f0072` | files 1, record 6, result 1 | 1.3 / 1.3 |

The rows' conditions held: the screening list has 7 approaches; the recheck records are 4 match and 2
borderline. The reentry request's B, fitted from its two sets, is not null (checked by the builder).
The Monte Carlo row, two runs to one worker, is the slowest: 56.6 to 58.5 s here, close to the minute
in which the plan asks every request to end on the baseline (the script itself waits 120 s).

### The three checks (the same lines in both runs)

- `cancel: pass: lifetime-altitude ended with terminate() at its first progress (1 message(s) before); 0 message(s) in the 2 s after`
- `precache: pass: 12 file(s) loaded at start by the 12 worker entries (entries and their static imports), 0 not in the precache manifest`
- `failed load: pass:` for each of the twelve workers, its own entry file aborted (no worker entry imports
  another file on the baseline): **`error`**. `page.route` saw every worker's own request (so the
  fallback of a copy without the file was not needed), and Chromium fired one `error` event on the
  Worker object, with an empty `message`, and no message, within the five seconds.

### The first load

`first-load.mjs` on `$T1/base/dist`; service workers blocked, a new context each run.

| Run | Time to ready | Requests to ready | Transferred to ready | Once settled | Console errors |
|---|---|---|---|---|---|
| 1 | 2.70 s | 24 | 9,497.2 kB | 24 requests, 9,497.2 kB | none |
| 2 | 3.19 s | 24 | 9,497.2 kB | 24 requests, 9,497.2 kB | none |
| 3 | 3.49 s | 24 | 9,497.2 kB | 24 requests, 9,497.2 kB | none |

The 24 requests are the page, 11 files of `assets` (among them `flight.worker-*.js`, which the page
starts before it is ready), 6 Earth textures, 5 pictures of the home page and one file of `anatomy/`.

Not one of Step 6's runs, but a trial of the script: pointed at the baseline's development server
(`npx vite --port 5179` in `$T1/base`), `first-load.mjs` passed three times (539 requests to ready),
and the lifetime worker started from `src/physics/lifetime.worker.ts` answered with the digest above.

### What each loads at start (from `bundle-modules.mjs`)

On the baseline every worker is one file: flight 100 modules, tune 98, attitude-tune 5, monte-carlo
98, ratings 102, readiness 102, reentry 18, screening 13, lifetime 11, lifetime-altitude 24,
requirement-trades 42, recheck 162. The page's entry loads 489 modules in 6 files.
