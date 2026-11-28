# EQ-8: the worker entries join the main build and share their code (T-1, Task B)

The evidence of EQ-8's first pull request (M-PLATFORM-033), made as plan
[S20-T1](../plan/S20-T1.md) Task B asks: route 1, a build-only plugin in `vite.config.ts`, checked
with the reference author's scripts of Task A (`tests/browser/t1/`, how each is run in its
[README](../../../tests/browser/t1/README.md)). No file under `src` changed. The budget fails at this
point, as the plan says it does (Step 6); its new groups and ceilings are Task C's.

## What was changed

`vite.config.ts` only: one plugin, placed first in `plugins`; nothing else in the file changes.

```ts
function sharedWorkersPlugin(): Plugin {
  const re = /new URL\(\s*'(\.\/[\w.-]+\.worker\.ts)'\s*,\s*import\.meta\.url\s*\)/g;
  const left = /new URL\([^)]*\.worker\.ts/;
  return {
    name: 'orbitlab-shared-workers',
    apply: 'build',
    enforce: 'pre',
    async transform(code, id) {
      if (!/\.[cm]?[jt]sx?$/.test(id) || !code.includes('.worker.ts')) return null;
      let out = code;
      for (const m of [...code.matchAll(re)]) {
        const resolved = await this.resolve(m[1], id);
        if (!resolved) continue;
        const ref = this.emitFile({ type: 'chunk', id: resolved.id, name: m[1].slice(2, -3), preserveSignature: false });
        // the call's own line breaks are kept, so the rewrite never changes a line count
        out = out.replace(m[0], `import.meta.ROLLUP_FILE_URL_${ref}${'\n'.repeat(m[0].split('\n').length - 1)}`);
      }
      if (left.test(out)) this.error(`orbitlab-shared-workers: ${relative(root, id)} has a new URL( with .worker.ts that was not made an entry of the build; write it as new URL('./name.worker.ts', import.meta.url)`);
      if (out === code) return null;
      // The file as written, mapped one segment per line: exact at line level since the
      // line count is unchanged, and the build's module comparison then sees the file as written.
      const mappings = ['AAAA', ...Array<string>(out.split('\n').length - 1).fill('AACA')].join(';');
      return { code: out, map: { version: 3, sources: [id], sourcesContent: [code], names: [], mappings } };
    },
  };
}
// plugins: [sharedWorkersPlugin(), htmlCommentsPlugin(), pwaPlugin()]
```

Its comment in the file says what it does and why Vite's `worker` options cannot do it: Vite bundles
each worker by a build of its own, so `worker.format` and a worker's chunking options split a worker
only inside its own bundle (plan §1).

How it differs from the patch of the plan's appendix:

- **The build fails on a worker site it did not rewrite** (Task B, Step 1). A module that still holds
  `new URL(` with `.worker.ts` in it after the rewrite stops the build with the message above, naming
  the file from the checkout's root. Tried in a throwaway project: the single-quoted form builds;
  double quotes, a sub-folder (`'./sub/b.worker.ts'`) and a trailing comma after `import.meta.url`
  each fail the build naming `src/main.ts`; a call split over four lines without a trailing comma
  builds, and its source map holds the file as written.
- **The file filter** is `/\.[cm]?[jt]sx?$/` instead of `/\.ts$/`, so that a worker site in a `.js`
  or `.tsx` file is checked too.
- **A source map.** The appendix's patch returned no map (`map: null`). With it, the module
  comparison (Step 3) gave `sets: DIFFER` for exactly the twelve files that start a worker
  (`src/session/session.ts` and the eleven `*-job.ts`), because the content recorded for them was the
  rewritten code (`new Worker(import.meta.ROLLUP_FILE_URL_…` where the file has
  `new Worker(new URL('./flight.worker.ts', import.meta.url)`). The plugin now returns a line-level
  map whose content is the file as written, and the comparison is equal. The shipped build has no
  source maps (`sourcemap: false`); its `dist` was byte-identical before and after this change, apart
  from `build-info.json` (`SHA256SUMS` compared). In a build with source maps, column detail for
  those twelve files is lost: each line maps to its first column. Leaving the map out instead gives
  rolldown's `SOURCEMAP_BROKEN` warning and no content; no dependency was added for a finer map.

## The baseline and the head

| | Commit | How it was built |
|---|---|---|
| Baseline | `efd6fd731e60193069c13878a4aae069cca25a97` (`efd6fd7`), the commit of main the branch is cut from | by the reference author, as the README's "Measured on the baseline" says: `npx vite build` in a `git worktree` of it at `$T1/base`; source maps into `$T1/base-maps` |
| Head | `7dc7ccb` (the reference author's checks) with the change above, built from the working tree before it was committed | `npx vite build` in the package's checkout; `npx vite build --sourcemap --outDir $T1/head-maps --emptyOutDir 2>&1 \| tee $T1/head-maps.log` |

The head's build stamp therefore reads `7dc7ccb`; the commit that holds the change differs from the
built tree only in this report and the change fragment. Vite 8.3.0, Node 22.23.5, Chromium
158.0.8127.36, 2026-11-28. Neither build's log has `INEFFECTIVE_DYNAMIC_IMPORT` or
`SOURCEMAP_BROKEN`. The baseline's figures below are copied from the README unless a step said to
measure it again.

## Step 2: the same answers

`node tests/browser/t1/worker-digests.mjs dist $T1/out/head-3.json` on the head: `worker digests: ok`.
`--compare` of the baseline's output (`base-2.json`) with it: **the two outputs agree**.

| Worker | Baseline digest (README) | Head digest | Messages, both | Seconds, head |
|---|---|---|---|---|
| flight | `c6f4d2b7a2b20e28abf1747c7d27694484af81a05071f7d947871de250675656` | the same | delta 61 | 22.0 |
| tune | `54cfc885534f53a5f18da54e1a773ba198ecae244ced9c30d6fcf33c6979c2b8` | the same | progress 30, result 1 | 2.8 |
| attitude-tune | `1b4fb520e6c62ba41c854bb3c815d21c933777e86971f20e3dcd06e0278b8f5e` | the same | progress 1, result 1 | 0.0 |
| monte-carlo | `2fc624fa4eb2dbd4c9868f1686b4339984ef048e9be3b90805ffdd9e72988bd3` | the same | run 2 | 57.1 |
| ratings | `69d6d93ebb25f41c072c9ed838a26993b3f54c64beec483a3db93e42e91f8afd` | the same | progress 12, result 1 | 0.4 |
| readiness | `4cd51a8ac671ac1c704883a6377c4828f0e3eb89892d9f9a9106243bd770bf5c` | the same | result 1 | 0.2 |
| reentry | `2e9d0cefaa852323e5b81db60e11900235e56ba189ca3c1315b7a07ad7eeda53` | the same | progress 5, result 1 | 0.6 |
| screening | `081cfe82d932d34a59451b79be1a6b40943c99b626c85b04aab793951769d348` | the same | progress 1, result 1 | 0.0 |
| lifetime | `cfecb3372a0575384bdddd1706cdda62e4aab9f2f845f4f4758b682ee50a3eac` | the same | progress 3, result 1 | 0.2 |
| lifetime-altitude | `5e524edff576d7eb9158659391d5a349a1682e3a2a0c3105f27d21dd24f51314` | the same | progress 1736, result 1 | 5.0 |
| requirement-trades | `2a1f1031da63dd0cacf741b9f1bad884e83420139f7033066f11a359c4562d02` | the same | progress 94, result 1 | 1.0 |
| recheck | `036fe826f59c472676b1db9f86e1ad8ee3f6710838e0ada1a72f34cac73f0072` | the same | files 1, record 6, result 1 | 1.5 |

The three checks on the head:

- `cancel: pass: lifetime-altitude ended with terminate() at its first progress (1 message(s) before); 0 message(s) in the 2 s after` (the baseline's line is the same).
- `precache: pass: 114 file(s) loaded at start by the 12 worker entries (entries and their static imports), 0 not in the precache manifest` (baseline: 12 files, 0 missing).
- `failed load: pass:` and **`error`** for each of the twelve, as on the baseline. On the head the file aborted is the first the entry imports: flight `simulation-*.js`, tune `autotune-*.js`, attitude-tune `attitude-tune-job-*.js`, monte-carlo and readiness `mission-*.js`, ratings `ratings-budget-*.js`, reentry `reentry-job-*.js`, screening `screening-job-*.js`, lifetime `propagate-*.js`, lifetime-altitude `lifetime-altitude-*.js`, requirement-trades `requirement-trades-*.js`, recheck `recheck-*.js`. No worker posted an answer.

Before the source map was added, the same run on that build (`head-2.json`) gave the same twelve
digests and the same three lines, and agreed with the baseline too.

## Step 3: the same modules, and what each worker now loads

`node tests/browser/t1/bundle-modules.mjs $T1/base-maps $T1/head-maps $T1/out/head-modules-3.json $T1/head-maps.log`:
baseline 36 maps and 589 (source, content) pairs, head 62 maps and 589 pairs; **sets: equal**; no
`INEFFECTIVE_DYNAMIC_IMPORT`; `bundle modules: ok`.

| Entry | Baseline: modules in files | Head: modules in files | New on the head |
|---|---|---|---|
| page | 489 in 6 | 489 in 31 | 0 |
| flight | 100 in 1 | 100 in 8 | 0 |
| tune | 98 in 1 | 98 in 8 | 0 |
| attitude-tune | 5 in 1 | 6 in 4 | 1 |
| monte-carlo | 98 in 1 | 99 in 9 | 1 |
| ratings | 102 in 1 | 102 in 11 | 0 |
| readiness | 102 in 1 | 102 in 11 | 0 |
| reentry | 18 in 1 | 18 in 8 | 0 |
| screening | 13 in 1 | 13 in 7 | 0 |
| lifetime | 11 in 1 | 12 in 5 | 1 |
| lifetime-altitude | 24 in 1 | 28 in 10 | 4 |
| requirement-trades | 42 in 1 | 51 in 15 | 9 |
| recheck | 162 in 1 | 178 in 18 | 16 |

No entry loses a module. The modules a worker loads on the head that it did not load on the baseline
are below; they arrive because a shared chunk holds them beside a module the worker needs. Each was
read at its top level, which counts when it reads `document`, `window`, `localStorage` or
`navigator`, registers a listener, starts a timer or posts a message. None does.

**attitude-tune**
- `src/physics/rigid/math.ts`: no top-level effect (quaternion and matrix functions)

**monte-carlo**
- `src/csv-text.ts`: no top-level effect (functions only)

**lifetime**
- `src/physics/vec3.ts`: no top-level effect (vector functions)

**lifetime-altitude**
- `src/data/satellites.ts`: no top-level effect (the `SATELLITES` array and two functions)
- `src/orbit/budget.ts`: no top-level effect (functions and the `CRAFT_LIMITS` object)
- `src/physics/propagator/spacecraft.ts`: no top-level effect (an `AREA` table and functions)
- `src/physics/vehicle.ts`: no top-level effect (constants, `const solidTailCache = new Map()`, the `VehicleModel` class, whose static members are methods)

**requirement-trades**
- `src/data/satellites.ts`: no top-level effect
- `src/design/design-ref.ts`: no top-level effect (a date pattern and functions)
- `src/design/satellite-handoff.ts`: no top-level effect (functions only)
- `src/orbit/ballistic-range.ts`: no top-level effect (a constant pair and functions)
- `src/orbit/handoff.ts`: no top-level effect (constants and functions)
- `src/orbit/mean-state.ts`: no top-level effect (functions only)
- `src/orbit/real-sky.ts`: no top-level effect (two scratch arrays and functions)
- `src/physics/propagator/spacecraft.ts`: no top-level effect
- `src/physics/vehicle.ts`: no top-level effect

**recheck**
- `src/csv-text.ts`: no top-level effect
- `src/i18n/index.ts`: no top-level effect (`DICTS = { en }`, `new Set()`, `let current = 'en'`, an empty listener list, constants; nothing reads the browser's language or storage at load)
- `src/i18n/en.ts`: no top-level effect (a pure function, called once, that spreads the six English feature dictionaries and its own strings into one object)
- `src/i18n/classroom.en.ts`, `src/i18n/experiments.en.ts`, `src/i18n/projects.en.ts`, `src/i18n/review.en.ts`, `src/i18n/validation.en.ts`, `src/i18n/workspace.en.ts`: no top-level effect (one object of strings each)
- `src/lessons/assessment/diagrams.ts`: no top-level effect (constants, functions and the `DIAGRAMS` table of functions)
- `src/lessons/assessment/expression.ts`: no top-level effect (two tables of constants and functions)
- `src/lessons/assessment/figures.ts`: no top-level effect (functions and a colour list)
- `src/orbit/mean-state.ts`, `src/orbit/real-sky.ts`, `src/physics/propagator/spacecraft.ts`: no top-level effect
- `src/workspace/storage.ts`: no top-level effect (`let` bindings left unset, an `unavailable` stand-in object whose methods run only when called, `new WeakMap()`)

The recheck worker was already the one whose imports reach `src/i18n` on the source
(`tests/i18n-worker-path.test.ts`, `tests/worker-language-boundary.test.ts`); on the head it also
evaluates the English dictionaries at start. No other worker loads a module of `src/i18n`.

## Step 4: the first load

`node tests/browser/t1/first-load.mjs <dist> <out.json>`, service workers blocked, a new context each
run; both `first load: ok`, no console error on either.

| Run | Baseline (README) | Baseline, `$T1/base/dist`, measured again here | Head |
|---|---|---|---|
| 1 | 2.70 s; 24 requests, 9,497.2 kB | 2.45 s; 24 requests, 9,497.2 kB | 2.60 s; 49 requests, 9,515.6 kB |
| 2 | 3.19 s; 24, 9,497.2 kB | 3.36 s; 24, 9,497.2 kB | 3.36 s; 49, 9,515.6 kB |
| 3 | 3.49 s; 24, 9,497.2 kB | 3.02 s; 24, 9,497.2 kB | 3.34 s; 49, 9,515.6 kB |
| Once settled, each run | 24 requests, 9,497.2 kB | 24 requests, 9,497.2 kB | 56 requests, 10,092.4 kB |

Time to ready, requests and bytes are counted to ready. On the head the page asks for 25 more files
before it is ready (the shared chunks its `index.html` now preloads) and 18.4 kB more. Once
settled the head has made 7 more requests and 576.8 kB more than when it was ready; the baseline
none. The script does not name those 7. They match in number the 7 chunks the flight worker imports
(Step 3: flight loads 8 files), which the page has already fetched and the worker asks for again in
contexts with no cache; this is a reading, not a measurement. No bound is set (plan §2, the fourth
point).

## Step 5: the development server

`npx vite --port 5179 --strictPort` in the package's checkout, then
`node tests/browser/t1/first-load.mjs http://localhost:5179/ $T1/out/head-dev-first-load.json`:

| Run | Time to ready | Requests to ready | Transferred to ready | Once settled | Console errors |
|---|---|---|---|---|---|
| 1 | 3.85 s | 539 | 34,670.3 kB | 640 requests, 34,716.0 kB | none |
| 2 | 3.36 s | 539 | 34,670.3 kB | 640 requests, 34,716.0 kB | none |
| 3 | 3.47 s | 539 | 34,670.3 kB | 640 requests, 34,716.0 kB | none |

`ok   the lifetime worker from its source: result, digest cfecb3372a05 equals the baseline's cfecb3372a05`;
`first load: ok`. The server was stopped afterwards.

## Step 6: the sizes

`node scripts/bundle-budget.mjs` in the package's checkout after its build (exit 1,
`bundle budget: FAILED. A ceiling is raised only with the reason written in budgets.json _notes.`),
and in `$T1/base` after the baseline's build (exit 0, `bundle budget: ok`). It fails where the plan
says it does: `other chunks` and the four names that no longer exist. Sizes in kB of 1,000 bytes.

**The ceilings** (`budgets.json` unchanged)

| Group | Ceiling | Baseline | Baseline verdict | Head | Head overrun | Head verdict |
|---|---|---|---|---|---|---|
| index-*.js | 2669.5 | 2669.3 | ok | 2109.1 | -560.4 | ok |
| index-*.css | 182.5 | 182.0 | ok | 182.0 | -0.5 | ok |
| flight.worker-*.js | 589.0 | 570.7 | ok | 4.5 | -584.5 | ok |
| tune.worker-*.js | 561.0 | 542.8 | ok | 0.3 | -560.7 | ok |
| monte-carlo.worker-*.js | 559.0 | 541.0 | ok | 0.3 | -558.7 | ok |
| ratings.worker-*.js | 569.0 | 550.2 | ok | 0.3 | -568.7 | ok |
| readiness.worker-*.js | 583.0 | 564.3 | ok | 0.3 | -582.7 | ok |
| reentry.worker-*.js | 60.0 | 57.9 | ok | 0.2 | -59.8 | ok |
| lifetime.worker-*.js | 40.0 | 39.1 | ok | 0.3 | -39.7 | ok |
| screening.worker-*.js | 31.0 | 30.1 | ok | 0.3 | -30.7 | ok |
| attitude-tune.worker-*.js | 12.0 | 11.4 | ok | 0.3 | -11.7 | ok |
| recheck.worker-*.js | 902.0 | 879.2 | ok | 0.3 | -901.7 | ok |
| lifetime-altitude.worker-*.js | 122.0 | 122.0 | ok | 0.3 | -121.7 | ok |
| requirement-trades.worker-*.js | 136.0 | 135.8 | ok | 0.3 | -135.7 | ok |
| other chunks | 772.0 | 771.5 | ok | 2240.0 | +1468.0 | **FAIL** |
| precache | 16598.0 | 16317.3 | ok | 12294.8 | -4303.2 | ok |
| precache code | 15199.0 | 15198.5 | ok | 11176.1 | -4022.9 | ok |
| precache data/ | 1399.0 | 1118.8 | ok | 1118.8 | -280.2 | ok |
| catalog-*.js | 180.0 | 172.8 | ok | absent | | **FAIL: no such file; rename or remove the budget** |
| author-view-*.js | 26.5 | 26.4 | ok | 26.4 | -0.1 | ok |
| check-view-*.js | 12.0 | 11.5 | ok | 11.5 | -0.5 | ok |
| workspace-content-*.js | 35.0 | 33.9 | ok | 33.9 | -1.1 | ok |
| workspace-content-*.css | 5.0 | 4.8 | ok | 4.8 | -0.2 | ok |
| i18n-*.js | 1738.5 | 376.5 | ok | absent | | **FAIL: no such file; rename or remove the budget** |
| lesson-file-*.js | 347.0 | 345.5 | ok | absent | | **FAIL: no such file; rename or remove the budget** |
| structure-*.js | 293.0 | 292.9 | ok | 292.9 | -0.1 | ok |
| structure-*.css | 27.0 | 27.0 | ok | 27.0 | -0.0 | ok |
| structure-en-*.js | 67.0 | 66.5 | ok | 66.5 | -0.5 | ok |
| structure-ru-*.js | 107.0 | 106.2 | ok | 106.2 | -0.8 | ok |
| ru-*.js | 599.0 | 598.0 | ok | 598.0 | -1.0 | ok |
| th-*.js | 764.0 | 764.0 | ok | 764.0 | -0.0 | ok |
| preload-helper-*.js | 2.0 | 1.2 | ok | absent | | **FAIL: no such file; rename or remove the budget** |

Baseline: 75 files precached, manifest `0e9de8c03fa90d`; 15198.5 kB code + 1118.8 kB under data/.
Head: 100 files precached, manifest `16b7cfc6c9a714`; 11176.1 kB code + 1118.8 kB under data/. Data
baseline 1126.9 kB in both. **Precache code: 15,198.5 → 11,176.1 kB, 4,022.4 kB less.**

**Report only, no ceilings** (raw kB / gzip kB / brotli kB; files)

| Group | Baseline | Head |
|---|---|---|
| index-*.js | 1 file: 2669.3 / 824.0 / 663.9 | 1 file: 2109.1 / 627.8 / 507.2 |
| index-*.css | 1: 182.0 / 35.5 / 30.1 | 1: 182.0 / 35.5 / 30.1 |
| flight.worker-*.js | 1: 570.7 / 182.7 / 153.6 | 1: 4.5 / 1.7 / 1.6 |
| tune.worker-*.js | 1: 542.8 / 173.7 / 146.4 | 1: 0.3 / 0.2 / 0.2 |
| monte-carlo.worker-*.js | 1: 541.0 / 173.1 / 145.8 | 1: 0.3 / 0.2 / 0.2 |
| ratings.worker-*.js | 1: 550.2 / 175.8 / 148.2 | 1: 0.3 / 0.2 / 0.2 |
| readiness.worker-*.js | 1: 564.3 / 180.0 / 151.9 | 1: 0.3 / 0.2 / 0.2 |
| reentry.worker-*.js | 1: 57.9 / 24.0 / 20.6 | 1: 0.2 / 0.2 / 0.2 |
| lifetime.worker-*.js | 1: 39.1 / 15.2 / 13.0 | 1: 0.3 / 0.2 / 0.2 |
| screening.worker-*.js | 1: 30.1 / 13.9 / 12.3 | 1: 0.3 / 0.2 / 0.2 |
| attitude-tune.worker-*.js | 1: 11.4 / 4.6 / 4.2 | 1: 0.3 / 0.2 / 0.2 |
| recheck.worker-*.js | 1: 879.2 / 279.0 / 231.7 | 1: 0.3 / 0.2 / 0.2 |
| lifetime-altitude.worker-*.js | 1: 122.0 / 37.6 / 32.1 | 1: 0.3 / 0.2 / 0.2 |
| requirement-trades.worker-*.js | 1: 135.8 / 43.4 / 37.0 | 1: 0.3 / 0.2 / 0.2 |
| other chunks | 13: 771.5 / 232.1 / 191.3 | 42: 2240.0 / 717.3 / 601.7 |
| precache | 75: 16317.3 / 7760.1 / 7150.1 | 100: 12294.8 / 6471.6 / 6077.3 |
| precache code | 72: 15198.5 / 7582.6 / 7017.2 | 97: 11176.1 / 6294.1 / 5944.4 |
| precache data/ | 3: 1118.8 / 177.5 / 132.9 | 3: 1118.8 / 177.5 / 132.9 |
| catalog-*.js | 1: 172.8 / 48.8 / 39.9 | absent |
| author-view-*.js | 1: 26.4 / 7.2 / 6.5 | 1: 26.4 / 7.3 / 6.5 |
| check-view-*.js | 1: 11.5 / 4.0 / 3.6 | 1: 11.5 / 3.9 / 3.6 |
| workspace-content-*.js | 1: 33.9 / 10.7 / 9.6 | 1: 33.9 / 10.7 / 9.5 |
| workspace-content-*.css | 1: 4.8 / 1.4 / 1.2 | 1: 4.8 / 1.4 / 1.2 |
| i18n-*.js | 1: 376.5 / 119.1 / 99.5 | absent |
| lesson-file-*.js | 1: 345.5 / 110.5 / 93.7 | absent |
| structure-*.js | 1: 292.9 / 81.3 / 69.6 | 1: 292.9 / 81.3 / 69.6 |
| structure-*.css | 1: 27.0 / 5.9 / 5.3 | 1: 27.0 / 5.9 / 5.3 |
| structure-en-*.js | 1: 66.5 / 20.7 / 17.8 | 1: 66.5 / 20.7 / 17.8 |
| structure-ru-*.js | 1: 106.2 / 26.5 / 22.3 | 1: 106.2 / 26.5 / 22.3 |
| ru-*.js | 1: 598.0 / 153.2 / 118.0 | 1: 598.0 / 153.2 / 118.0 |
| th-*.js | 1: 764.0 / 146.6 / 112.3 | 1: 764.0 / 146.6 / 112.3 |
| preload-helper-*.js | 1: 1.2 / 0.7 / 0.6 | absent |
| initial load | 8: 3766.2 / 1144.3 / 932.5 | 33: 3779.6 / 1154.1 / 952.5 |
| textures | 6: 3789.4 / 3789.4 / 3789.4 | 6: 3789.4 / 3789.4 / 3789.4 |

Initial load, baseline: index.html, `index-BZbxrmBo.js`, `i18n-Cn_TJ0_E.js`,
`preload-helper-uBIymjUX.js`, `lesson-file-C61-AsHj.js`, `download-CkLdfcCm.js`,
`catalog-BN9zN3fq.js`, `index-AVUtvM6b.css`. Head: index.html, `index-D5tsagkb.js`, 30 shared chunks
(`vec3`, `orbital`, `geodesy`, `propagate`, `mission`, `linear`, `simulation`, `orbits`, `kepler`,
`disposal`, `sgp4`, `reentry`, `real-sky`, `coverage`, `vehicle-spec`, `csv-text`, `recheck`,
`download`, `verdict-core`, `lifetime-altitude`, `autotune`, `attitude-tune-job`, `monte-carlo`,
`readiness-core`, `ratings-budget`, `requirement-trades`, `screening-job`, `reentry-job`, `text`,
`recorder`), `index-AVUtvM6b.css`.

## Not run

- The `recheck` journey: it is held back, and the runner skips a held journey even when named (plan §4, EO-XENG-1).
- A second browser: only Chromium was tried; Firefox 114, the oldest supported and the first Firefox with module workers, was not (no Firefox on this machine or in CI's journeys). Browsers below D-40 lose the workers after this change (plan §2, the third decision).
- The Monte Carlo CSV is not compared between the builds; the Monte Carlo worker's answers are (Step 2).
- The default, heavy and fleet suites, and `npm run test:browser`, at this point: the default suite and the journeys run once in Task C, the heavy and fleet suites at the gate.
- Run at the end of this task: `npm run typecheck` (clean) and
  `npx vitest run tests/pwa.test.ts tests/bundle-budget.test.ts tests/repo-hygiene.test.ts tests/i18n-worker-path.test.ts tests/worker-language-boundary.test.ts` (5 files, 59 tests, all pass; the first builds the app with this plugin).

## The budget, old against new

Filled in Task C, from the tables of Step 6, once the owner has signed it.
