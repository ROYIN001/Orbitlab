# Stage 2: loading and the beginner journey

This implements the core-journey stage following the
[Stage 1 baseline](../../stage1-2026-10-02/README.md): loading, navigation,
mobile access and the first-mission guidance.

## Changes

- Explore shows the full preflight explanation, including combined failure,
  launch-window and payload warnings. Launch exposes that explanation as its
  accessible description.
- The independent first-use guide says “Tip 1 of 3” and “Next tip” in English,
  Russian and Thai. Reading tips preserves the current setup step and mission.
- The phone section switch groups routes by section, gives each route its
  description, and scrolls within the viewport. Links have at least 44 px touch
  targets, accessible descriptions and native keyboard navigation. Escape
  restores focus to the switch.
- Teacher authoring and result-checking modules load when their page opens.
  Loading and failure feedback is localized; stale imports cannot replace a
  page after navigation. The service worker precaches both modules for offline
  first use.
- Verdict and readiness calculations return serializable message descriptors.
  Workers no longer load translation dictionaries; the page formats their
  results in the current language. Numerical checks and public localized APIs
  retain their behavior.

## Bundle evidence

Production build with Node 22.23.3, frozen dependencies, default audio caching.
Sizes are raw decimal kB. Before values come from Stage 1 at `91ee372`;
after values are from this change's production build (rounded to 0.1 kB).

| Asset | Before | After |
|---|---:|---:|
| Ratings worker | 2,142.1 | 557.1 |
| Readiness worker | 2,156.4 | 571.4 |
| Initial main JavaScript, including shared preload | 4,665.6 | 4,636.7 |
| Complete offline precache | 18,634.9 | 15,473.3 |

Vite extracts a 2,103.3 kB shared `catalog` chunk that remains preloaded, plus
the 2,533.5 kB entry. Their combined size is used above. The author/check
modules are 25.6 / 11.4 kB; the initial reduction is about 29 kB. Worker sizes
drop about 74%, and the offline cache drops about 17%. These are asset-size
results; no new real-device startup or frame-rate claim is made.

`budgets.json` lowers the worker and precache limits. The four entry/shared/
instructor chunk ceilings total 4,745 kB, below the previous 4,756 kB entry
ceiling. CSS and the remaining chunk ceilings stay unchanged.

## Verification

The build, typecheck and bundle budgets pass. Focused suites cover verdicts,
readiness, ratings, satellite handoff compatibility, worker import boundaries,
three-language localization, help/navigation state, authoring, architecture,
repository hygiene and PWA behavior. No flight fingerprint was re-recorded.

The production browser smoke suite includes:

- `stage2-preflight`: full warnings, accessible descriptions, guide/setup
  independence and keyboard/touch window repair in English, Russian and Thai,
  including a 320 × 568 phone viewport.
- `mobile-smoke`: localized route descriptions, Tab access to every route,
  viewport fit and Escape focus restoration on four existing phone pages.
- `instructor-loading`: deferred requests, stale-navigation protection,
  language switching, draft persistence, load failure and first-use offline
  loading/reload.

Run `npm run build`, `npm run budget`, `npm test`, then
`npm run test:browser:smoke`. The CI workflow runs the default unit suite in
three shards and the production browser smoke suite on the pull request.
Cloud browser checks use the harness's supported system Chromium override
with software WebGL. Physical-device and novice-participant studies remain
separate follow-up work.
