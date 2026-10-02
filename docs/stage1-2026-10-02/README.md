# Stage 1: establish improvement priorities

Baseline source: `91ee372e222e3c0496c57f6590e1ccece03a9079` (Orbitlab `main`). Audit date: 2 October 2026. Evidence timestamps and simulated mission dates retain their explicit UTC offsets; dates are not silently converted between conventions.

This stage measures the existing product and proposes a backlog. Application behavior, dependency declarations, existing tests, scientific tolerances, and reference data are unchanged. The new scripts collect repeatable evidence and are outside the default test suite.

**Evidence boundary:** automated browser interaction is not observation of beginners. No participant sessions have been conducted. The five-learner protocol in [beginner-study.md](beginner-study.md) is ready; user recruitment, sessions, and observed task-completion results remain pending. User difficulty and frequency claims below are hypotheses unless explicitly marked as browser facts.

## Deliverables and evidence

- [performance.json](performance.json): production desktop/phone-viewport startup samples, cold and service-worker-controlled visits, asset sizes, browser/runtime details, and measurement limitations.
- [translation-inclusion.json](translation-inclusion.json): literal homepage translations found inside both sizing workers and the main bundle.
- [rocket-evidence.json](rocket-evidence.json): input specifications, insertion outcomes, fairing timeline, full target-delivery result, and Vega-C search brackets.
- [satellite-evidence.json](satellite-evidence.json): complete template inputs, subsystem budgets, launch results, and mean/true Sun comparisons.
- [ux-evidence.json](ux-evidence.json): guide/menu interactions and actual localized preflight text geometry. Screenshots are local generated artifacts, reproducible with the browser script.
- [validation-summary.json](validation-summary.json): existing runner counts and reference comparisons; regression success and scientific acceptance are separate fields.

## Startup and download baseline

Measurements use the production build under `/Orbitlab/`, Chromium 151, Node 22.23.3, a four-CPU quota, and SwiftShader software rendering. Desktop is 1280 × 800; the phone viewport is 390 × 844 with touch/mobile layout. Both use device pixel ratio 1. These are **not physical-device measurements**.

There are three cold-context visits and three installed-PWA reloads per viewport. A cold context has no page cache, local storage, or service worker, but browser-process/OS caches can persist. Warm visits must have a service-worker controller. The server uses uncompressed loopback HTTP with no network or CPU throttling. Other audit computations were stopped during collection.

Readiness is the first 10 ms timer observation of `window.orbitlab.started`, after the initial mission preview. First contentful paint and sampled LCP are separate. Frame measurements count `requestAnimationFrame` callbacks over at least ten seconds after readiness; they are not proof of GPU-presented frames or field INP. Resource Timing totals omit the worker's own precache requests. Heap figures, when available, are approximate browser diagnostics.


| Viewport / visit | Samples | Median first content (s) | Median app ready (s) | App-ready range (s) | Median rAF callbacks/s |
|---|---:|---:|---:|---:|---:|
| desktop / cold | 3 | 0.37 | 23.60 | 22.97–32.70 | 0.46 |
| desktop / warm | 3 | 7.28 | 29.56 | 29.04–35.18 | 0.39 |
| phone-viewport / cold | 3 | 0.33 | 16.68 | 16.30–18.20 | 0.91 |
| phone-viewport / warm | 3 | 3.66 | 21.09 | 19.44–23.54 | 0.87 |

All twelve samples completed with zero uncaught page errors. These medians describe this cloud renderer only. Warm cache visits still initialize and render the application; the small sample does not establish that caching causes slower startup. All twelve `flight.worker` Resource Timing entries contain negative duration values from the browser. The raw values are retained and flagged invalid; they are excluded from interpretation and are not used by this table.

The main JavaScript is **4,665,593 raw bytes / 1,332,624 bytes using the audit’s gzip settings**. The ratings and readiness workers are approximately **2.142 MB / 2.156 MB raw**. The existing precache budget covers **53 files / 18.635 MB raw** and passes. Gzip sizes are locally computed compression estimates; this audit's static server does not transmit gzip.

All three homepage titles (English, Russian, Thai) are present in each of the main, ratings, and readiness bundles. The code path `config/verdict.ts → i18n/index.ts → all dictionaries` explains the inclusion. This proves unwanted coupling, not the exact number of bytes a refactor will save. Measure the output before committing to a reduction target.

The cloud startup/callback figures are a regression baseline for this environment. Repeat profiling on named real hardware and a representative connection before declaring a user-facing load-time/FPS budget or attributing the measured delay to download, JavaScript, or shader compilation alone.

## Reproduced scientific findings

### Sizing: insertion and delivery are different requirements

All three representative zero-extra-Δv requests (1 t to 500 km, 8 t to ISS, 3 t to SSO) fail insertion. The basic 1 t case computes **9,049.49 m/s** of design Δv and ends out of propellant, with a best osculating trajectory of **−1,239.98 × 250.40 km**. A negative perigee is Earth-intersecting, not delivered orbit.

Adding 500 m/s to the same request achieves insertion but a full mission ends at **171.78 × 457.93 km**, with `onTarget: false`, versus the requested **500 × 500 km**. Adding a blanket margin is therefore not an established fix.

Sizing charges the chosen 800 kg fairing to the first stage; runtime keeps it attached through first separation at **182.90 s / 73.99 km**, until **273.40 s / 116.67 km**. That is **90.5 seconds of second-stage carriage** absent from that sizing assumption. Removing the fairing changes the required margin, but also changes vehicle sizing and engine counts; this experiment does not isolate a fairing-only Δv penalty.

Future acceptance should check delivery to the requested target, with explicit physical assumptions, rather than only positive perigee or an insertion predicate. Sources: `src/design/sizing.ts`, `src/physics/vehicle.ts`, and `tests/design-sizing.test.ts`.

### Vega-C: the published-rating discrepancy persists

Computed LEO capability is **4,330 kg versus 3,300 kg**, or **+31.21%**, outside the existing ±25% criterion. Across the eight existing rating comparisons, **seven meet the reference criterion and one misses it**.

For the documented 700 × 700 km, 98.2° SSO target, a finer integer-kilogram search brackets the current delivery predicate at **2,915 kg accepted / 2,916 kg rejected**, versus the repository's **2,300 kg** reference (+26.74%). This is a predicate result, not an independently validated full finite-burn delivery. It must not silently replace the production search's coarser 2,906 kg result.

The post-insertion predicate uses an ideal burn budget. Finite-burn losses, stage modeling and guidance are investigation candidates; their individual contributions to the discrepancy are not established. Keep the existing criterion and compare matching reference missions before changing coefficients.

### Satellite templates: known deficits, with warnings already present

| Template | Available Δv (m/s) | Required Δv (m/s) | Margin (m/s) |
|---|---:|---:|---:|
| Communications | 1,881.95 | 2,549.77 | **−667.82** |
| Weather | 1,682.71 | 2,315.14 | **−632.42** |
| Science | 183.98 | 209.61 | **−25.63** |

These use unchanged templates at JD 2461314.5 (1 October 2026 UTC), moderate activity, and their configured insertion, lifetime and disposal assumptions. All already emit a Δv warning. Weather cannot cover even its listed insertion; science is short for its disposal assumption. This is not evidence of a broken rocket equation. Decide which templates should be feasible starters and which intentionally teach design tradeoffs, then align their labels, mission assumptions, and source-backed inputs.

### Build-to-Launch node conventions differ

NAPA-2 and THEOS-2 launches reach their intended apsides within 3 km and preserve payload masses. Their unadjusted node errors relative to the designs are **−2.768° / −2.830°**. Existing tests pass after shifting the design node by the equation-of-time offset; remaining residuals are **−0.147° / −0.197°**.

The designer uses a mean-Sun LTAN convention; Launch uses true solar right ascension. At the probes' launch windows the offset is about **10.49 / 10.53 minutes**. A future correction needs one explicit convention and a reviewed migration of affected launch windows, recordings and lesson expectations. Changing expected outputs alone would not resolve the mismatch.

### Validation reporting needs provenance

The existing six selected files contain **67 passing regression assertions**. Some explicitly require a known shortfall or compensate for a documented discrepancy. Green runner output is not equivalent to every reference requirement passing. The separate diagnostic collectors likewise succeed when observations are collected; they do not introduce new scientific acceptance thresholds.

The documentation's old Soyuz-2.1a computed LEO payload is 7,021 kg; the current existing test reports **8,140 kg** (still within ±25% of 7,430 kg). The sized launcher's height is **22.173 m**, previously 22.25 m. Preserve the historical results and attach current commit provenance rather than silently presenting the old table as current.

## Beginner journey: browser facts and research questions

The browser diagnostic completed **four contexts / twelve configured mission cases**, with zero execution failures or uncaught page errors. It uses the existing journey harness's DPR 0.5; these UI checks are separate from the DPR 1 performance measurements. Guide/menu actions use real clicks or taps. Mission inputs are configured through WebMCP to create repeatable warnings, so this is not an unaided novice task trial.

In every context, clicking the guide's Next changes its text from step 1 to step 2 while mission setup remains on step 1. Clicking setup's Next then changes setup to step 2. This is intentional independent state in the implementation; whether learners confuse the controls remains a research question.

Desktop's Launch menu exposes three level links with descriptions. Each tested phone menu exposes nine visible section/level links without those descriptions. Localized accessible names remain present. The collector opens the menu and records its links; it does not navigate each destination. The missing descriptions are an observed presentation difference, not evidence of an accessibility failure or a measured navigation failure rate.

For the repeatable combined-warning case (30 t on Falcon 9 from Cape Canaveral, 90° inclination, fixed RAAN, engine-out armed), text is visibly clipped while the full string is stored in the `title` attribute:

| Viewport / language | Visible text height (px) | Full text height (px) | Clipped? |
|---|---:|---:|---|
| desktop / en | 72 | 144 | Yes |
| mobile / en | 72 | 108 | Yes |
| mobile / ru | 72 | 144 | Yes |
| mobile / th | 72 | 90 | Yes |

The shorter over-capacity and corridor-only cases fit. Existing corrective buttons are recorded in the evidence; the finding is about access to the complete explanation, not an absence of preflight help. A visible disclosure is a targeted candidate for Stage 2. Physical touch-browser tooltip behavior and screen-reader announcements were not measured.

The remaining seven source-grounded hypotheses and neutral task prompts are in [beginner-study.md](beginner-study.md). Use [study-results-template.csv](study-results-template.csv) to record actual sessions; it deliberately contains no participant rows.

## Prioritized backlog

This ranking uses task consequence, likely reach, evidence strength and implementation scope. Reach and learner confusion are provisional until the participant study; no survey frequency or numerical user-success score is invented. Effort sizes describe scope, not calendar commitments.

| Rank / ID | Proposed work | Evidence and confidence | Suggested owner / effort | Acceptance for the next stage |
|---|---|---|---|---|
| 1 — SCI-01 | Make launcher sizing account for carried fairing mass and verify target delivery | Three failed baseline insertions; +500 variant misses target; runtime carriage mismatch. High confidence in behavior, incomplete loss attribution. | Flight physics / L | Reproduce the three requests with consistent assumptions; deliver within declared target tolerances or explicitly explain infeasibility. Preserve independent reference checks. |
| 2 — PERF-01 | Separate worker results from translation; evaluate deferred feature loading and startup rendering | Large measured bundles; all homepage translations found in both workers; controlled cloud startup baseline. High confidence in coupling, unmeasured refactor benefit. | Frontend/performance / M | Measured byte/startup reduction, same verdict semantics in three languages, working offline installation, and representative real-device results. |
| 3 — UX-01 | Make preflight explanations fully available on touch and keyboard | Four-line clamp and tooltip fallback are source facts; actual clipping cases are recorded by the browser collector. High confidence only for reproduced cases. | UI/accessibility / S | Every reproduced explanation can be opened/read without hover; corrective actions remain discoverable in EN/RU/TH. |
| 4 — SCI-02 | Unify the definition of LTAN across Build, Orbit and Launch | Two flown raw node discrepancies and direct convention trace. High confidence. | Orbital physics / M | Preserve the requested mean local time under an agreed convention; explicitly review changed launch windows and historical/lesson baselines. |
| 5 — SCI-03 | Diagnose Vega-C against matched, fully flown reference missions | +31.21% LEO miss; matched SSO predicate still high. High confidence in miss, low confidence in specific cause. | Flight physics / M–L | Isolate losses/guidance effects; meet the unchanged reference criterion or clearly bound the remaining capability estimate. |
| 6 — CONTENT-01 | Review starter-template feasibility and scientific-result labels | Three negative Δv margins, existing warnings, known-outcome regression tests. High confidence. | Physics + curriculum / M | Each template states its intended learning outcome; feasible starters meet stated budgets; intentional failures name the missing capability. |
| 7 — UX-02 | Test connected guidance, mobile navigation, and resume expectations with beginners | Independent help/setup steps and differing menu descriptions; other findings are source-grounded hypotheses. Human impact unmeasured. | Product/education / S research, M implementation | Run the five-person protocol; select changes from observed behavior and compare against that baseline. |
| 8 — QA-01 | Publish commit-specific validation results separately from test status | Current figures differ from historical tables; known accuracy misses coexist with passing tests. High confidence. | Validation/docs / S–M | Automated report shows reference met/missed, assumptions, commit, expected discrepancies, and separate runner outcomes. |
| 9 — CONTENT-02 | Teacher/native-speaker review of draft lessons | Existing implementation documentation records pending curriculum and RU/TH review. Review itself unperformed. | Subject teachers/localization / M | Reviewed objectives, terminology, tolerances, audience, date and reviewer attribution for each released pack. |

Physical-device startup, full screen-reader tasks, broader physics suites, independent reacquisition of primary reference data, security auditing, and real participant observation are not completed by this bounded baseline. They remain explicit follow-up work rather than inferred passes.

## Reproduce

Use Node 22 and the repository's locked dependencies. In this cloud instance, `source /workspace/orbitlab-env/activate.sh` selects the validated tools and system Chromium; elsewhere install the repository-supported Playwright Chromium or set `CHROMIUM` to an appropriate executable.

From the repository root:

```bash
npm ci
npm run build
npm run budget

# Run alone: do not overlap performance collection with tests or another browser.
node scripts/stage1-baseline.mjs --out tests/browser/artifacts/stage1/performance

# Run after the baseline; real input for guide/menu checks, programmatic mission setup.
node scripts/audit-stage1/ux.mjs

# Optional observation collectors, excluded from npm test's normal test list.
npx vitest run --config scripts/audit-stage1/vitest.config.ts --reporter=verbose

# Existing regression coverage selected for these specific findings.
npx vitest run tests/design-sizing.test.ts tests/design-ratings.test.ts tests/d06-satellite-model.test.ts tests/d06-satellite-templates.test.ts tests/d06-satellite-launch.test.ts tests/d06-build-orbit-handoff.test.ts --maxWorkers=1 --reporter=verbose
```

The science/UX collectors accept `ORBITLAB_AUDIT_DIR` for generated outputs; defaults are ignored local artifacts. The rocket collector fixes a 40-flight search budget without an eight-second wall-clock cutoff; inspect `converged`/`stoppedBy` before comparing any search result. The page baseline checks that the built commit matches HEAD. Both portable scientific collectors were executed successfully after the timing run (2 collectors, 9.52 s); the existing 67-test runs preceded it. Sources and all input dates are preserved in the evidence.
