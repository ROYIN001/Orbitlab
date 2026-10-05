# Orbitlab performance baseline (headless, reproducible)

`measure.mjs` measures the **production build** of Orbitlab in headless Chromium so that
every performance package in the development plan can show *before/after* numbers
taken the same way. It never edits the repository; it only serves a `dist/` folder
and drives the app.

## What it needs

- A checkout with `node_modules` installed (for `playwright`; `@jridgewell/trace-mapping`
  is used only by `--profile`). Default: `../ol` next to this folder; or `--repo DIR`.
- A built `dist/` of the commit to be measured (`npx vite build` or `npm run build`).
  For `--profile`, build with source maps (`npx vite build --sourcemap --outDir dist-sm`).
- Chromium. Playwright's pinned browser is used if installed; otherwise the script
  falls back to `/opt/pw-browsers/chromium` (or `CHROMIUM=/path` / `--chromium PATH`).
  It never runs `playwright install`.

## Run

```sh
cd perf-baseline
# baseline: 3 runs (about 9–10 minutes on a 4-core machine)
node measure.mjs --repo ../ol --dist ../ol/dist --runs 3 --label before
# … apply a change, rebuild dist …
node measure.mjs --repo ../ol --dist ../ol/dist --runs 3 --label after
# compare the two JSON files (median, min–max, and whether the ranges overlap)
node measure.mjs --compare results/before-*.json results/after-*.json
# attribution (separate pass, ~4 min: profiling perturbs timings; needs source maps)
node measure.mjs --repo ../ol --dist ../ol/dist-sm --runs 1 --profile --only startup,orbit,launch,flight --label before-profile
# re-render the Markdown summary of a results file
node measure.mjs --report results/before-….json
```

Options: `--only startup,home,orbit,launch,flight,warm,storage` (startup always runs),
`--window 5` (steady-state seconds), `--flight-window 8`, `--scale 0.5` (device pixel
ratio, same default as `tests/browser/harness.mjs`), `--viewport 1280x800`, `--out FILE`.

Each run writes `results/<label>-<time>.json` (every raw run + aggregate) and a `.md`
summary with the same tables printed to stdout.

## What one run does

A fresh browser per run (`--use-gl=angle --use-angle=swiftshader`, the harness flags),
desktop 1280×800 at DPR 0.5, English, guided tour marked done, a WebMCP stand-in exactly
like the harness. A private static server serves `dist/` under `/Orbitlab/` with the
same contract as `tests/browser/serve.mjs` and logs every request (page, workers and
service worker), so bytes are counted server-side.

1. **Cold start** (fresh profile, first visit, service worker allowed): navigation timing,
   `#loading.hidden` (scene ready) and *interactive* = the first WebMCP `registerTool`
   call, which `bootstrap()` in `src/main.ts` makes right after `app.init()` resolves
   (mission loaded, `started = true`); first animation frame after that; long tasks and
   TBT; CDP main-thread script/task time; per-process CPU from `/proc`; requests/bytes by
   type (raw and gzip-estimated); images and JSON fetched; WebGL/2D contexts created;
   workers created; texture uploads; time inside WebGL calls (shader compile waits,
   texture uploads); Web Storage traffic; JS heap before/after a forced GC; DOM size.
   Then the requests after interactive (service-worker precache) until the network is
   quiet for 2 s.
2. **Steady state / transitions** (same page): home (5 s); entering Orbit (4 s from the
   route change); Orbit playing (5 s) and paused (5 s, pause confirmed); entering Launch +
   `configure_mission` Falcon 9 / Cape / LEO (4 s); launch pad (5 s); `launch_mission`
   (4 s from the call: ignition and liftoff hitch); flight at 1× (8 s); flight at 100×
   (5 s). Each window reports app frames/s, frame-interval p50/p95/p99/max, the app's
   own rAF callback time per frame, draw calls, which canvases drew, time inside WebGL
   calls, shader programs created, CDP script/task/layout time, CPU by process and by
   thread (renderer main, renderer workers, GPU process), long tasks, long-animation-frame
   blocking time, localStorage traffic and, in flight, simulated seconds per wall second.
3. **Warm start**: reload with the service worker in control (in-memory GPU program cache
   of the same browser is warm too).
4. **Storage**: two fresh contexts (service worker blocked): the default profile, and the
   same profile with a ~1.5 MB value in its record (written like
   `tests/browser/workspace-storage.mjs` fixtures). Reload, then count profile-record reads/
   writes, MB read, and time in `JSON.parse`/`JSON.stringify` of strings ≥ 64 k chars during
   startup and around one `configure_mission` (+1 s for deferred saves).

## How to read the numbers (limits)

- **Relative only.** Software WebGL (SwiftShader) runs on the CPU: on a 4-core machine the
  GPU process alone takes ~2 cores and frame rates are 1–13 fps. Frame-interval
  percentiles are dominated by rasterisation, not by the app's JavaScript. Use them for
  before/after on the same machine, never as user-facing fps.
- Hardware-independent proxies are the most transferable: bytes/requests, WebGL contexts,
  shader programs, draw calls per frame, texture megapixels, rAF callback ms per frame,
  storage reads/bytes, big-JSON ms, worker CPU per simulated second.
- Startup wall time is dominated by shader compile/link waits under SwiftShader and
  varies by several seconds; compare its components (shader wait ms, texture upload ms,
  JSON ms, bytes) rather than the total.
- Each Playwright launch has a fresh user-data-dir, so the GPU shader disk cache is always
  cold on the cold start; a returning real user usually has it warm.
- The server sends `no-cache` and no validators (as the journey server does); GitHub Pages
  sends ETag/max-age and gzip. `gzkB` is a gzip-6 estimate of transfer size.
- CPU from `/proc` has 10 ms resolution; the CDP metrics cover the page's main thread only;
  the JS heap figure excludes workers.
- Instrumentation (rAF, WebGL, Storage wrappers) costs a little in every run; it is the same
  before and after. `--profile` costs more; never mix profiled and unprofiled results.
- Long-animation-frame entries are kept in the JSON only: Chromium delivers them late and their
  start times straddle windows, so they are not reported; use long tasks, the longest frame
  interval and the longest rAF callback.
- Treat a change as real only when the before/after ranges do not overlap (`--compare`
  marks this) or after more runs.

## Results in this folder (commit fbefa18 = main)

- `results/baseline-fbefa18.{json,md}` — the 3-run baseline (final script).
- `results/profile-fbefa18.{json,md}` — 1-run CPU-profile attribution on `dist-sm` (same build plus
  source maps), taken with the previous script revision, which lacked only the duplicate-shader-program
  and late-long-task counters; its timings are perturbed by the profiler and are not a baseline.
- `results/superseded/v1`, `v2` — earlier 3-run baselines of the same build taken while the script
  gained counters (v1: no duplicate-program / late-entry counters; v2: the program tracker kept shader
  text alive, which added ~4 MB to the JS heap). Kept only as a repeatability check; do not compare
  against them.

## Results for commit 5f9aa2e (main, live site = 09cc2f5; 5f9aa2e differs only in PROGRESS.md)

- `results/baseline-5f9aa2e.{json,md,log,stdout}` — 3-run baseline, same script (unchanged), same Chromium
  141.0.7390.37 + SwiftShader, same flags/viewport/DPR. Source: `git archive origin/main` into `../ol2`,
  `node_modules` symlinked from `../ol` (package.json/lock unchanged since fbefa18), `npx vite build`.
  `npm run budget` on that dist: ok, precache 15822.7 / 16103 kB.
- `results/compare-fbefa18-5f9aa2e.md` — `--compare` output.
- **Host caveat:** the fbefa18 baseline ran on a 4×Xeon @ 2.80 GHz host; 5f9aa2e ran on a 4×Xeon @ 2.10 GHz
  host (same core count). Wall-time and CPU-time rows are therefore cross-host; only counts/bytes/programs/
  contexts/reads are strictly comparable. `flight.worker` is byte-identical in both builds (same md5), so the
  lower 100× warp (7.28 vs 8.32 sim s/s) is attributed to the host, not to code.
- Only English is measured (the script hard-codes `lang: 'en'`); `src/i18n/index.ts` imports en/ru/th statically
  into one chunk, so JS bytes to interactive should not depend on language (not measured for TH/RU).
