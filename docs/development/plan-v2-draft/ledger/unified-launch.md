# Unified ledger — group "launch" (Launch/Watch/Engineer flight, 3-D rendering, cameras, HUD, telemetry, timeline, general UX and accessibility)

Built 2026-10-04 from the ledgers (`*.jsonl` items with area launch/render/ux), `r2-status.md`, `doc-map.md`, the classified code-review findings assigned to this group, and the perf baseline (`perf-baseline/results/baseline-fbefa18.md`). Statuses re-verified read-only against **origin/main = da67341** (R2, PR #74, squash-merged 2026-10-04 01:55 UTC). R2 touched only main.ts, index.html, style.css, modes.css, panel.ts, hud.ts, telemetry.ts, timeline.ts, rigid-controls.ts, i18n and 5 new modules; every `src/render/**` finding except camera-policy is therefore unchanged from fbefa18.

Machine-readable: `unified-launch.jsonl` (one item per line; ids `M-LAUNCH-001..087`). Every source item with area launch/render/ux in the input ledgers is referenced by at least one unified item (checked by script), and all 31 assigned review findings are covered.

## 1. Counts

| status | n |
|---|---|
| done | 10 |
| partial | 14 |
| open | 56 |
| deferred | 4 |
| superseded | 2 |
| rejected | 1 |
| **total** | 87 |

Open + partial by priority: P0 3, P1 14, P2 36, P3 17.

Sources merged: 114 ledger rows (area launch/render/ux) + 31 review findings + 1 new measured finding → 87 unified items.

## 2. Open and partial items grouped by placement

### 1. R2 close-out (R2.1-R2.4, gate G2)

| id | P | effort | status | title | placement | depends on |
|---|---|---|---|---|---|---|
| M-LAUNCH-018 | P0 | S | open | Gate G2 and decision D08: owner confirms layout wireframe, presets, minimum scene size and assumptions A1-A5; screenshot sign-off | R2 gate G2 (first item of the master plan) | M-LAUNCH-019(screenshots at matrix sizes), M-LAUNCH-021 |
| M-LAUNCH-021 | P0 | XS | open | Record R2 merge, CI and deploy runs in PROGRESS.md and the R2 report (status still says "not merged") | R2 close-out | - |
| M-LAUNCH-027 | P0 | S | open | "Use for the next launch" in the loop inspector while a live flight is paused destroys the flight and its recording | R2.1 (R2 close-out wave; FlightLifecycle contract) | - |
| M-LAUNCH-002 | P1 | M | partial | R2.1 remainder: compact command/playback band, Analysis-stage layout, short-viewport case (U02, 1100x650 squeeze) | R2.1 (R2 close-out wave) | M-LAUNCH-018 |
| M-LAUNCH-004 | P1 | S | partial | U16 UI completion: actual engine level in compact HUD and onboard overlay, thrust kN kept visible, live/replay check at the Soyuz 81 % step | R2.1 (R2 close-out wave) | - |
| M-LAUNCH-008 | P1 | XS | open | Phone flight bar play button has no accessible name while paused and is not relabelled on language change | R2.1 (R2 close-out wave) | - |
| M-LAUNCH-011 | P1 | XS | open | Stale camera-dialog copy contradicts R2.2 ownership ("a manual choice lasts until the next phase") | R2.2 (R2 close-out wave) | - |
| M-LAUNCH-019 | P1 | M | open | Device/viewport/browser matrix for the Launch shell: 1366x768, 1920x1080, 768x1024, 1100x650, 1280x720 projector, zoom 125/150 %, 860/861 and 1180/1181 boundaries, portrait/landscape, DPR 2, Edge/Safari/real phones; untested dimensions (multi-GPU, audio sync, screen reader) | R2 close-out -> R7.1 (matrix becomes standing) | M-LAUNCH-018 |
| M-LAUNCH-020 | P1 | S | partial | R2 acceptance journey completion and a PR-CI smoke slice: TORU/6-DOF reachability, chooser at 320/390 px in TH/RU, touch tabs and keys 1-4, new-mission framing, Orbit-phase camera persistence, Soyuz 81 % step live/replay | R2 close-out (journeys)  | - |
| M-LAUNCH-022 | P1 | S | open | Do not paint, describe or snapshot telemetry charts that are hidden (Engineer card presets and Explore non-picked charts) | E (R2 close-out wave; telemetry package) | - |
| M-LAUNCH-025 | P1 | M | open | Language/notation change fan-out: mid-flight notation change runs full applyLanguage (rebuilds hidden setup, telemetry incl. the select in use -> focus lost), double applyLanguage on language change, onLangChange has no unsubscribe | R2.1 (R2 close-out wave) | - |
| M-LAUNCH-017 | P2 | XS | partial | R2.4 replay rule: may the chooser list events after the replay cursor? (owner ruling) | R2.4 (decision for R2 close-out) | M-LAUNCH-018 |
| M-LAUNCH-066 | P2 | XS | open | PWA "ready offline" toast overlaps the phone flight bar and bottom controls | R2.1 close-out (style.css, I owner; PWA group consulted) | - |
| M-LAUNCH-006 | P3 | XS | open | Notation: visible "use language default" reset after an explicit ISO/GOST choice | R2.1 (R2 close-out wave, small) | M-LAUNCH-025 |
| M-LAUNCH-026 | P3 | XS | open | Merge R2 duplicate CSS media blocks and split hide rules; fix orphan notation doc comment | Q (with R2.1 close-out) | - |
| M-LAUNCH-038 | P3 | S | open | Single CHART_DEFS table for live telemetry, report charts and reference series (becomes the R2.3 card registry); share engine-level formatting | Q (inside R2.1/R2.3 close-out) | - |

### 2. R2 follow-ups (after G2)

| id | P | effort | status | title | placement | depends on |
|---|---|---|---|---|---|---|
| M-LAUNCH-028 | P1 | S | open | Physics worker and preview failures are swallowed to console: show a localized "flight stopped / could not prepare" status with Retry and a one-time notice on main-thread fallback | R2.1 (lifecycle error state) - new sub-step | review:D1 (bundle group job-runner contract) |
| M-LAUNCH-003 | P2 | M | partial | Telemetry grouped summary-first with details on demand | R2.1 (after D08) | M-LAUNCH-018, M-LAUNCH-014, M-LAUNCH-038 |
| M-LAUNCH-014 | P2 | L | open | R2.3 step 2: dock/resize/reorder by extending hudlayout.ts, keyboard alternatives, clamping on resize/zoom, explicit "reset layout" (incl. shared floating-window behaviour) | R2.3 | M-LAUNCH-018, M-LAUNCH-013 |
| M-LAUNCH-029 | P2 | S | open | Compare table "current" column reads the live simulation, not the displayed (cursor) frame | R2.1 (displayed-frame contract) | - |
| M-LAUNCH-062 | P2 | M | open | Event jump row (Liftoff, Max-Q, staging, fairing, insertion, landing, failure) with camera choice, also on Watch; "show me" for failed lesson criteria | R2.4 follow-up (new sub-step R2.4b) | M-LAUNCH-016, M-LAUNCH-010 |
| M-LAUNCH-012 | P3 | XS | open | Camera fallback is silent: no on-screen notice when the chosen view cannot show the target | R2.2 (follow-up) | - |
| M-LAUNCH-061 | P3 | XS | open | Watch soundtrack/import options always open: fold into a closed "advanced sound options" block | R2.2 (Watch picker) | - |

### 3. New R2.5 accessibility & Thai typography baseline

| id | P | effort | status | title | placement | depends on |
|---|---|---|---|---|---|---|
| M-LAUNCH-050 | P1 | S | open | Automated accessibility checks (axe-core, owner-approved devDependency) on main routes in EN/TH; fix serious/critical | new R sub-task R2.5 "accessibility & Thai typography baseline" (Q gate) | decision D-17 (one devDependency with reason) |
| M-LAUNCH-058 | P1 | M | open | Thai typography and narrow-screen fit: :lang(th) line-height/letter-spacing/line-break rules on system fonts, no clipped vowels/tones, tab-strip overflow affordance | R2.5 | M-LAUNCH-050 |
| M-LAUNCH-051 | P2 | S | open | Text contrast (--dim 4.2/3.9:1) and labels <=10 px fail WCAG AA | R2.5 | M-LAUNCH-050 |
| M-LAUNCH-052 | P2 | S | open | Touch targets below 24 px (.hud-btn 21x18, scene tools, play) on coarse pointers | R2.5 (with R2.1 mobile acceptance) | M-LAUNCH-019 |
| M-LAUNCH-053 | P2 | S | open | Event ticker live region rebuilt wholesale on every event (screen readers repeat rows) | R2.5 | - |
| M-LAUNCH-054 | P2 | S | open | prefers-reduced-motion ignored by launch scene camera easing, shake and Orbit animation | R2.5 (camera part via CameraPolicy/cameras owner) | - |
| M-LAUNCH-055 | P2 | XS | open | App page landmarks: no h1, no skip link, no noscript, html lang="en" until JS runs | R2.5 (index.html, I owner) | - |
| M-LAUNCH-056 | P2 | S | open | SetupPanel.render() restores focus only for elements with aria-label, so buttons lose keyboard focus | R2.5 (panel.ts, I owner) | - |
| M-LAUNCH-057 | P2 | S | open | Debrief and Watch end cards are role=dialog without focus move, announcement or Escape | R2.5 | - |
| M-LAUNCH-059 | P3 | S | partial | Numeric entry on touch: inputmode=decimal everywhere and coarse/fine steppers on orbit sliders | R2.5 (panel part in R2.1; orbit part by Orbit owner) | cross:D9 |

### 4. E track (identical-output efficiency)

| id | P | effort | status | title | placement | depends on |
|---|---|---|---|---|---|---|
| M-LAUNCH-041 | P1 | M | open | Launch/preview rebuild: keep immutable heavy inputs (livery canvases, pad terrain geometry, recovery scenery, keyed materials, trail buffers) so a Launch click or a launch-time edit does not repaint, regenerate and recompile identical resources | E (first render package; before R3.2 so the Engineer preview reuses the cache) | - |
| M-LAUNCH-023 | P2 | M | open | Telemetry pass memo when paused/unchanged, layout-read batching, binary-search window and cached first-flex index | E (after R2.3 step 2 freezes show/hide API) | M-LAUNCH-014, M-LAUNCH-022 |
| M-LAUNCH-024 | P2 | S | open | Per-frame DOM and allocation hygiene in frame()/updateVisuals and the R2 shell/chooser | E (inside R2.1 integration, I owner) | - |
| M-LAUNCH-036 | P2 | S | open | Shared ui/format.ts: cached Intl formatters keyed by language+options, and explicit-mode time formatters; decide one clock-rounding contract | E (module first) + R2.1/R2.2 call-site migration | - |
| M-LAUNCH-040 | P2 | M | open | While Orbit/Build/lesson pages cover a running flight, skip only frame-pure visual writes (keep every integrator, timer, audio and camera damping running) | E (inside R2.1 lifecycle, I owner) | M-LAUNCH-010, M-LAUNCH-043 |
| M-LAUNCH-042 | P2 | S | open | Prewarm the light-set shader variants a flight can reach (pad floodlights hidden after 55 km, engine light gone after abort/Apollo CM) so compiles happen on the pad, not mid-ascent | E (after M-LAUNCH-041) | M-LAUNCH-041 |
| M-LAUNCH-043 | P2 | S | open | Exhaust trails: scalar wind fast path (windy 6-DOF) and skip recompute/upload when inputs are exactly unchanged (paused) | E (render package; aero.ts helper via physics owner or render-side copy pinned by a bitwise test) | - |
| M-LAUNCH-045 | P2 | S | open | Map view: compute orbital elements once per draw, memo predicted orbit on exact state, cache static layers at device-pixel size; lazy shared 2048 Earth image (idle preload) | E (map package; propagateKepler shared tail with physics owner; main.ts part by I owner) | - |
| M-LAUNCH-084 | P2 | S | open | Explore "reduce payload" fix runs a bisection of test flights on the main thread | E (worker job; reuse bundle group's job runner D1) | cross:review D1 job runner |
| M-LAUNCH-086 | P2 | M | partial | Idle and low-end rendering: draw only when something changed on static scenes; opt-in low-graphics mode offered on sustained slow frames | E (needsDraw for provably static frames) + new opt-in setting (R2.5/R7) | M-LAUNCH-040 |
| M-LAUNCH-044 | P3 | S | open | TrailLine/OrbitLine: skip buffer rewrite when points and origin are unchanged (dirty flag, write in onBeforeRender) | E (with M-LAUNCH-040, before R5) | M-LAUNCH-040 |
| M-LAUNCH-085 | P3 | S | open | Tuning tab recomputes margins for up to 120 linear models every 200 ms | E | - |

### 5. New R3.0 render lifecycle & context budget

| id | P | effort | status | title | placement | depends on |
|---|---|---|---|---|---|---|
| M-LAUNCH-046 | P2 | M | open | WebGL context budget: OrbitView.dispose(), release HomeGlobe/Orbit 3-D contexts under pressure keeping decoded textures, longer term one shared renderer | new R sub-task R3.0 "render lifecycle & context budget" (before R3.2/R3.3 previews) | cross:orbit group lazy OrbitView (P4/NEW-bundle-1) |

### 6. B track (bugs / data correctness)

| id | P | effort | status | title | placement | depends on |
|---|---|---|---|---|---|---|
| M-LAUNCH-032 | P1 | XS | open | Dispersed-flight toggle creates point-mass dynamics for custom vehicles (defaultDynamics(vehicleId) vs missionVehicle) - and optional shared setDynamicsPart helper | B (with R2.1 panel work, I owner) | - |
| M-LAUNCH-034 | P2 | XS | open | Monte Carlo CSV: use shared downloadBlob (5 s revoke), quote \r, decide formula-injection guard | B (export contract owner approval) | decision: CSV formula guard (DECISIONS) |
| M-LAUNCH-060 | P2 | S | open | Equations panel says "No air to act on at this height" on the pad, after landing and when no step is recorded | B (Launch Engineer explanation) | - |
| M-LAUNCH-035 | P3 | S | open | Monte Carlo "failed" state has no style; attitude auto-tune progress has no percentage | B (small UI) | - |

### 7. F track (fidelity) and R4 physics

| id | P | effort | status | title | placement | depends on |
|---|---|---|---|---|---|---|
| M-LAUNCH-031 | P1 | S | open | Mission result table shows osculating apsides flagged "outside" beside a "target reached" verdict judged on J2 physical apsides | F (UI part now) + R4.3 (physics part) | - |
| M-LAUNCH-072 | P2 | M | partial | Honest labels at the number (experimental, estimate, planned vs flown, not graded, model tolerance) tied by test to Known limitations | R4.4 (quality labels) | R4.4 |
| M-LAUNCH-077 | P2 | M | open | PSLV-XL and H3 loft profiles fitted on multiple flights (one vehicle per PR) | R4.2 (physics group) | R4.1 |
| M-LAUNCH-078 | P2 | S | partial | Soyuz-2.1a 6-DOF pitch release (done) and Vulcan parking orbit 250x500 km | R4.2/R4.3 (physics group) | R4.1 |
| M-LAUNCH-079 | P2 | M | open | Falcon 9 6-DOF booster recovery via a coast attitude-control mode (not more gas) | R4.2/R4.4 (physics group) | R4.1 |

### 8. Q track (quality / metrics)

| id | P | effort | status | title | placement | depends on |
|---|---|---|---|---|---|---|
| M-LAUNCH-073 | P2 | S | open | UX and performance metrics for Launch/Home: time-to-first-result, unaided completion, 0 overflow at listed viewports, precache and first-load budgets, launch hitch | Q (master-plan metrics section; perf-baseline as the standing method) | - |
| M-LAUNCH-037 | P3 | S | open | Shared canvas sizing helper (per-site fallback, DPR cap 3) and named colour tokens for charts; do not merge tick algorithms | Q (before R3.2/R3.3 new plots) | - |
| M-LAUNCH-048 | P3 | S | open | Render helper dedupe: share gridFinTexture (identical), parameterised strut segments, canopyStripes cache with ownership, cacheOnce helper | Q (gridFin anytime; rest in R5.4) | - |
| M-LAUNCH-049 | P3 | S | open | Scene construction helpers: targetOrbitState(plan), replaceView(old, make) keeping add order, table-driven Apollo blocks | Q (setupViews part with M-LAUNCH-041; Apollo table at start of R5.4) | M-LAUNCH-041 |

### 9. T track (teaching / classroom)

| id | P | effort | status | title | placement | depends on |
|---|---|---|---|---|---|---|
| M-LAUNCH-070 | P2 | S | open | Thai-first, phone-first 3-step help checked by a Thai reader | T (native review W7) | - |
| M-LAUNCH-069 | P3 | S | open | Share files from phones with the Web Share API (feature-detected) beside download/link | T (classroom delivery) | - |

### 10. R3 placements

| id | P | effort | status | title | placement | depends on |
|---|---|---|---|---|---|---|
| M-LAUNCH-030 | P2 | S | open | Report link, reference label and Continue-in-Orbit hand-off read the panel draft instead of the flown configuration (sim.cfg) | R3.1 | M-LAUNCH-028 |
| M-LAUNCH-063 | P2 | L | partial | Debrief that diagnoses the cause from the flight (time + number), "view that moment", one next experiment; lesson fail strip too | R3.5 (A02 ResultAction) + T (pedagogy evidence) | M-LAUNCH-062, decision: user-test gate (S9) or owner override, R3.5 |
| M-LAUNCH-067 | P2 | S | partial | First-visit path: Home start cards per audience with time estimates linking existing routes; decision D-8 | R3.5 (A01) | decision D-8 |
| M-LAUNCH-076 | P2 | M | open | Rocket drawings fidelity: published heights (Vega-C, PSLV-XL, Atlas V 551), strap-on groups, octaweb drawn for a re-counted s1, swapped engine keeps old drawing | R3.2 (Engineer preview from design geometry) | R3.2, M-LAUNCH-041 |
| M-LAUNCH-068 | P3 | M | open | Home Build chapter with pictures and localized (TH/RU) share previews; decision D-26 | R3.5 (after D-26) | decision D-26 |
| M-LAUNCH-081 | P3 | L | partial | Per-level content gaps in the section matrix: Orbit Explore challenges, Build Watch satellite exploded views | R3.2/R3.3 + game track X01 (other groups) | - |

### 11. R5 placements

| id | P | effort | status | title | placement | depends on |
|---|---|---|---|---|---|---|
| M-LAUNCH-047 | P3 | S | open | Apollo CM parachutes: merge same-material gores per canopy (84 -> ~10 meshes); do not switch to the shared Canopy (different look) | R5.4 (spacecraft visual consolidation) | - |

### 12. Other / deferred

| id | P | effort | status | title | placement | depends on |
|---|---|---|---|---|---|---|
| M-LAUNCH-074 | P2 | XS | partial | Product principles and won't-do list for Launch/UX (task-first, phone one-task, offline/weak devices first, honest data, no accounts/analytics/badges/forced placement) | Master plan principles section | - |
| M-LAUNCH-071 | P3 | L | partial | Lean no-WebGL path: Explore and lessons usable on lab machines without WebGL/GPU | deferred to R7 (needs scope decision) | M-LAUNCH-019 |

## 3. Proposed execution order inside this group

1. **R2 close-out wave (one I-owned PR series, before anything else):** M-LAUNCH-021 (PROGRESS/report record), M-LAUNCH-018 (D08 + G2 sign-off, uses screenshots from M-LAUNCH-019), M-LAUNCH-027 (LUI-01 flight destroyed on paused tuning), M-LAUNCH-008 and M-LAUNCH-011 (XS copy/a11y regressions), M-LAUNCH-025 (notation mid-flight rebuild + focus loss), M-LAUNCH-022 (hidden charts drawn — identical), M-LAUNCH-004 (U16 compact HUD/onboard), M-LAUNCH-020 (journey completion + PR smoke slice), M-LAUNCH-066 (toast over phone bar), then M-LAUNCH-002 once D08 fixes the minimum scene size.
2. **First identical-output render package:** M-LAUNCH-041 (rebuild cache; measured 18–19 duplicate shader programs per Launch/configure), then M-LAUNCH-042 (light-variant prewarm), M-LAUNCH-024 (per-frame hygiene), M-LAUNCH-043 (trails), M-LAUNCH-040 (covered-scene split), M-LAUNCH-045 (map). Each reports perf-baseline before/after.
3. **Correctness/realism small fixes:** M-LAUNCH-028 (worker/preview errors), M-LAUNCH-031 (result apsides contradiction), M-LAUNCH-032 (dispersion model for custom vehicles), M-LAUNCH-060 (equations "no air"), M-LAUNCH-029/030 (displayed vs flown data).
4. **R2.5 accessibility & Thai typography baseline:** M-LAUNCH-050 (axe gate) first, then 058 (Thai), 051–057.
5. **R3.0 context budget** (M-LAUNCH-046) before R3.2/R3.3 previews; M-LAUNCH-037 (canvas helper) before new R3 plots.
6. **After G2/D08:** M-LAUNCH-014 (R2.3 step 2), M-LAUNCH-003, M-LAUNCH-023, M-LAUNCH-062 (jump row).

## 4. Conflicts resolved (with verdict from code on da67341)

- **LUI-01 "probably fixed by R2.1 FlightLifecycle" vs audits "open"** — Open. main.ts:543 still `if (!this.playing) this.preview(cfg)`; toggleLiveFlight leaves the panel running; flight-lifecycle.ts does not guard onChange. → M-LAUNCH-027, P0.
- **LUI-04 / UX-Q2 "covered by R2.4"** — Partial only. R2.4 gives an exact-seek list for clustered chips; there is no jump row, no camera pairing, no Watch row. → M-LAUNCH-062.
- **UX-Q1/S8 phone navigation labels "planned" vs MOB-01 "done"** — Nav-label part done by a different design (#60 + 2026-10-01 top bar) → M-LAUNCH-087; only the Watch sound options part remains → M-LAUNCH-061.
- **User-test gate before any UX redesign (9-05, 11-03, §I-x) vs PLAN R2/R3** — Superseded by owner direction (R2 merged). Evidence now gates only the specific items whose source criteria require it (predict chip, phone task tabs, per-audience paths, diagnosis debrief). → M-LAUNCH-075 superseded; 063/064/065/067 carry the gate.
- **R2.3 free dragging vs "one task per phone screen, nothing behind drawers"** — Free arrangement only above 860 px; phones keep presets + one column; D08 confirms. → M-LAUNCH-014.
- **PHY-19 filed as physics (R4.3) vs UI contradiction locked by a test** — Split: UI labeling/flag fix now (F track, owner-approved contract change, no golden rewrite), physics question stays in R4.3. → M-LAUNCH-031.
- **S5-3 / I18N-02 "equations says no air on the pad" — partly addressed by eq.none.noStep/prelaunch?** — Still open: newton() now says noStep, but drag() (equations-model.ts:84) and aeroAngles (:153) still return eq.none.noAir for still air/no record. → M-LAUNCH-060.
- **P12 "skip hidden charts" safe?** — Yes after R2.3: setLayout() redraws from the displayed frame (telemetry.ts setLayout → update(view, cursor)); R2 widened the waste (Engineer presets hide 3–6 charts that are still painted). → M-LAUNCH-022.
- **B12 notation reset location** — Moved from panel.ts to telemetry.ts notationControl by R2; residual (no way back to "auto") still present. → M-LAUNCH-006.
- **D14 "listener leak"** — Not a leak today (singletons); real R2-induced problems are the mid-flight full applyLanguage and double call on language change. → M-LAUNCH-025.
- **P11/NEW-render-1 "estimated, unmeasured"** — Now measured: perf-baseline launchEnter 19 programs (18 duplicates), flightStart 19/19 duplicates, 2.0–2.8 s compile wait under SwiftShader; root cause in code: setupViews disposes old views before building new ones. → M-LAUNCH-041, P1.
- **A04 "done" vs MOB-03 toast overlap** — A04 done; the toast overlap with the new phone bar is a separate small bug. → M-LAUNCH-066.
- **LUI-11 "draft vs flown" still reachable after R2 hides setup?** — Yes: report/reference paths read panel.missionState() (main.ts:959, :990); the divergence arises when preview fails (LUI-05) or via MCP configure. → M-LAUNCH-030 depends on M-LAUNCH-028.
- **P29 partial panel re-render** — Rejected (risk > benefit); only an optional launchWindows memo with evidence. → M-LAUNCH-033.
- **B11 touch-action on #gl** — Kept (documented R1.3 decision, WCAG zoom); re-evaluate only with device evidence. → M-LAUNCH-039 deferred.

## 5. Superseded, rejected and deferred items and why

- **M-LAUNCH-015** (deferred) Docking telemetry preset — R5 (after R5.2/R5.3 docking schema). origin/main da67341: not implemented, per plan order (needs R5 schema).
- **M-LAUNCH-033** (rejected) Partial re-render of SetupPanel on toggles — none (keep full render); optional memo of launchWindows only with profiling evidence inside R2.1. origin/main da67341: panel.ts render() rebuilds everything; review classifies partial updates as high risk for focus/validation/locks with small benefit.
- **M-LAUNCH-039** (deferred) touch-action:none on #gl (pinch on scene cannot zoom/scroll the page); keep, re-evaluate with device evidence — R2.1 mobile acceptance (device matrix M-LAUNCH-019). origin/main da67341: style.css:409 #gl touch-action:none (R1.3 decision, reports/R1.3-gestures.md:25,56-59); A04 phone bar mitigates the scroll symptom.
- **M-LAUNCH-064** (deferred) Optional "predict" chip on Explore before Launch, compared with the outcome — T (after user-test round 1). origin/main da67341: notebook entries have free-text prediction (experiments/notebook.ts:58); no Explore chip.
- **M-LAUNCH-065** (deferred) One task per phone screen (Setup/View/Results tabs) for Orbit and Build Engineer; Build Engineer lead too long on phones — R3.4 (Build) / Orbit owner, gated by §I-2 decision. Belongs mainly to Build/Orbit groups.
- **M-LAUNCH-075** (superseded) Gate all UX redesign on user-test round 1 (no Home/mobile redesign before it) — superseded by PLAN R2/R3 owner direction; evidence now gates only specific items (M-LAUNCH-063/064/065/067). Keep human evidence as validation (G2 screenshots, later study), not as a blanket gate.
- **M-LAUNCH-082** (superseded) Orbit/Build "in development" screens listing roadmap items — superseded (keep ROADMAP-PART2-3.md format: tests parse it). origin/main da67341: both sections built; mechanism survives as "still to come" lists (section-plan.ts:46-90, section-nav-model.ts:22-50) fed by ROADMAP-PART2-3.md (test-parsed).

## 6. Done (verified on da67341)

- M-LAUNCH-001 R2.1 Setup/Flight/Analysis lifecycle state; setup collapses on launch (U11); scene widens; renderer resize kept — sources: r2-status:R2.1 / three-state lifecycle(state part), r2-status:R2.1 / hide setup on launch (U11), r2-status:U11, r2-status:R2.1 / renderer resize, r2-status:R2 / §10.1 60% scene target, PLAN:U11
- M-LAUNCH-005 Notation control moved into in-flight telemetry; per-language default (U09/D06); stored auto/invalid migrated — sources: r2-status:R2.1 / notation placement (U09/D06), r2-status:R2.1 / notation migration, PLAN:U09, PLAN:D06
- M-LAUNCH-007 A04 phone flight bar keeps clock, live/replay and play/pause on screen while reading charts — sources: r2-status:R2.1 / A04 mobile flight bar, r2-status:A04, PLAN:A04, devplan-th-part1:UX-H3-4/PED-H6-6(tabs)(Launch Engineer part)
- M-LAUNCH-009 Two clocks, Space/Shift+Space kept; focused lists and native controls do not send flight commands — sources: r2-status:R2.1 / clocks and keyboard
- M-LAUNCH-010 CameraPolicy: Watch/Launch pick and keep a view; Cinematic restores automation; fallback for unseeable target; no visible camera reset (U03, U08) — sources: r2-status:R2.2 / CameraPolicy ownership, r2-status:R2.2 / Cinematic and fallback, r2-status:R2.2 / views per capability(tabs), r2-status:R2.2 / remove camera reset (U08), r2-status:U03, PLAN:U03, PLAN:U08
- M-LAUNCH-013 R2.3 step 1: telemetry card presets Flight/Dynamics/Orbit/All/Custom, profile-owned, versioned; controls never hideable — sources: r2-status:R2.3 / presets step 1 (U10), r2-status:R2.3 / mandatory controls and refresh, r2-status:U10(presets part), PLAN:U10
- M-LAUNCH-016 R2.4 timeline event chooser for clustered events: names + exact T+, keyboard, focus, Escape, live growth (A05) — sources: r2-status:R2.4 / chooser list (A05), r2-status:R2.4 / identity, keyboard, recording, r2-status:A05, PLAN:A05
- M-LAUNCH-080 Section x level shell and routes (#/<section>/<level>), custom vehicles in missions with one resolver and id-keyed rules — sources: roadmap-part2-3:S01, roadmap-part2-3:idea-3, roadmap-part2-3:ARCH-routing, roadmap-part2-3:S02, roadmap-part2-3:S02-keys, roadmap-part2-3:ARCH-resolver
- M-LAUNCH-083 Attitude Auto-Tune in a worker with cancel; Monte Carlo pool ends cleanly — sources: remaining-th-part2:PHY-06, remaining-th-part2:TQ-13, remaining-th-part2:S7, remaining-th-part1:A18, cross:remaining-th-part1:LUI-02
- M-LAUNCH-087 Phone section/level names visible (one button opening a named sections x levels sheet, 44 px links) — sources: remaining-th-part2:MOB-01, devplan-th-part1:UX-Q1/S8(nav label part), remaining-th-part2:S8(level/section names part)

## 7. Items that belong to (or must be coordinated with) other area groups

- **Physics group:** M-LAUNCH-077/078/079 (PSLV/H3 loft, Vulcan parking orbit, F9 recovery) are realism tasks placed in R4.2–R4.4; M-LAUNCH-031 physics half (R4.3); M-LAUNCH-043 needs a physics-owner-approved scalar wind helper in aero.ts or a render-side copy pinned by a bitwise test; M-LAUNCH-045 needs the shared propagateKepler tail in orbital.ts.
- **Bundle/startup group:** D1 job runner (dependency of M-LAUNCH-028 and M-LAUNCH-084); NEW-bundle-2 startup duplicate applyLanguage must ship with M-LAUNCH-025 (same I-owned code); P4/NEW-bundle-1 lazy OrbitView is the first half of M-LAUNCH-046.
- **Orbit group:** MOB-02 tab-strip affordance (implemented in ui/orbit under M-LAUNCH-058 rules); orbit steppers (M-LAUNCH-059); reduced motion in ui/orbit (M-LAUNCH-054); NEW-UI-1/P5 excluded from this group by assignment.
- **Build group:** M-LAUNCH-076 drawings fidelity (R3.2); M-LAUNCH-065 phone task tabs (R3.4); M-LAUNCH-081 section-matrix content gaps.
- **Lessons / pedagogy group:** Lesson fail-strip half of M-LAUNCH-063 (LES-09, PED-H3-1); PED-Q3 "show me" must reuse the M-LAUNCH-062 API; predict chip M-LAUNCH-064 and user-test rounds (gates).
- **CI / test group:** create-plan smoke inventory for M-LAUNCH-020; harness viewport presets for M-LAUNCH-019; LUI-06 DOM test environment (not ledgered here).
- **i18n group:** I18N-06 number/tick formatting should reuse ui/format.ts (M-LAUNCH-036); Thai terminology (I18N-03/04/05) applies to the R2 new keys; native review M-LAUNCH-070.
- **PWA group:** MOB-03 toast (M-LAUNCH-066) touches pwa/register.ts styling; precache budget for M-LAUNCH-068.
- **Storage group:** R2 added the profile-owned key orbitlab.telemetryLayout; R2.3 step 2 (M-LAUNCH-014) will write more per-profile data — benefits from the storage P7 parse cache landing first.
- **Export-contract owner (PLAN 8.6):** U16 actual-level CSV columns (deferred part of M-LAUNCH-004); Monte Carlo CSV guard (M-LAUNCH-034).

## 8. Requirement guard summary

- Identical-output items (kind perf-identical) carry the exact conditions from the verified review; none uses tolerances, early returns that skip integrators, or golden rewrites.
- Trade-off items (M-LAUNCH-046 context release, M-LAUNCH-086 idle/low-graphics) are admitted only in their quality-preserving form: release under budget pressure with no first-frame pop; skip draws only for provably static frames; low-graphics strictly opt-in.
- Visual changes (contrast, Thai typography, touch targets, drawings) require owner screenshot approval and keep desktop fine-pointer rendering identical where stated.
- Excluded: shared Canopy swap for Apollo (visual change), merging tick algorithms, partial SetupPanel re-render, any idle fps cap on animated scenes, debounced storage writes.
