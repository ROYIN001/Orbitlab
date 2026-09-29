# Build review — 2026-09-28

Source: `audit-2026-09-28/source`, commit `0a6d1a709ffbf88e8e36f606d6993bd27e5c25e0`. Read-only product review. This note concerns the newly implemented Build section, not the previous day's roadmap placeholder. No `AGENTS.md` was found in the source tree or the checked parent chain. Source checkout was clean during this review.

## Evidence status

- Static inspection completed for Build Watch, Explore, Engineer, storage, handoff, warnings, readiness, ratings, assembly/remix, optimization and sizing models, and their existing tests.
- Browser ownership is with the parent reviewer. The parent confirmed the saved-source revision issue live and confirmed the wind-tunnel invalid-input behavior described below. Those observations are attributed to the parent, not to a second independent browser run.
- Focused existing Build tests passed: **17 files / 164 tests**, **15.50 s**, `--maxWorkers=2`, using Vitest 5.0.1 and Node 24.19.0 from the shared runtime. Scope: build-screen metadata; Explore model/drafts; handoff; store; review/readiness; static-fire/stand; tunnel/tunnel-view; optimal-staging/staging-model; sizing/sizing-model; remix/assemble.
- Safe executable probes ran real source modules through Vite SSR with a fake `Map` storage. They confirmed unreadable-record deletion and the vehicle-only payload reset. They did not access real browser localStorage. No product edits or new product tests were made.
- An initial bare Node TypeScript-loader probe failed because a type-only `Vec3` import needed the project's transpilation behavior. The Vite-based rerun succeeded; this is a probe-runner limitation, not an application failure. Source `git status --short` remained clean after verification.

## What is now implemented

| Area | Concrete workflow | Boundaries |
|---|---|---|
| Watch | Choose from the 21-vehicle catalogue, grouped current/historical; assembled/exploded scaled SVG; select stage, booster or fairing for a part card; read stage budgets; follow five narrated steps on stack, staging, strap-ons, upper stages and fairing. | This is an educational 2D technical illustration. Ideal figures use vacuum Isp and omit gravity/drag losses. Watch payload is half the published LEO rating. |
| Explore: remix | Start from a real vehicle; stretch individual stages; select a compatible engine and its count; remove/restore or add booster groups; choose a fairing; rename and change payload. Live drawing, masses, ideal Δv, T/W and checks update with edits. | Engine-family compatibility, solid-motor restrictions and lumped-engine counts are enforced. Guidance remains inherited and needs interpretation after changes. Remix cannot freely remove the original fairing in its current controls. |
| Explore: parts | Choose catalogue bodies or define a body's dry mass, propellant, diameter, length and propellant family; fit engines/counts; add/remove serial stages; add catalogue strap-on bodies; choose site/fairing. | UI/validator limits: 1–6 stages, up to four strap-on groups, up to 12 boosters per group. The more detailed Engineer face of D03 remains pending; satellite D06/D07 remain pending. |
| Checks | Distinguish invalid specification, pad vacuum engine, failed hold-down release, low T/W, weak upper stage, acceleration, low ideal Δv, unusual mass fraction and fairing-width problems. Show explicit estimate explanations. | Explore deliberately permits a physically poor but representable experiment to proceed; a no-liftoff warning does not disable Fly. Invalid specifications and ground-lit vacuum engines do. Engineer readiness applies a stronger fail gate. |
| Ratings | Compute LEO/GTO payload estimates in a worker with progress and cancel; tie computed ratings to a signature so geometry/engine edits invalidate them. | Point-mass, calm air, carried guidance programme. Rating LEO is about 200 km or the vehicle-specific rating orbit; Explore's Fly preset is 500 km. Ratings are estimates, not a promise for arbitrary orbit/site/wind/six-DOF. |
| Persistence | Save/update, Save as new, list/open, rename, confirmed delete, export/import versioned `.orbitlab.json`; separate debounced draft preservation and pagehide flush. | Local browser storage, no account/cloud. Explicit saved files are vehicle specifications, not the entire mission or editor session. Payload and some editing provenance are reconstructed on reopening. Draft writes can silently fail; explicit Save reports quota/unavailable errors. |
| Explore → Launch | Fly hands the exact custom specification plus current payload to Launch Explore through its mission parser. Defaults: site's first launch site, 500 km LEO preset, rideshare payload, preserved Launch time, failures off, recovery off, calm air and fixed seed. | Point-mass by default; optional experimental six-DOF. It opens Launch setup rather than immediately igniting. Other orbit/site choices are made there. Zero design payload is raised to Launch's 1 kg minimum and disclosed in the handoff sentence. |
| Engineer source | Select catalogue, current Explore design, saved design, or a launcher supplied by sizing. All facilities share the bench vehicle. | It follows Explore on initial use until the learner explicitly chooses a source. Computed ratings for a saved design are held on the bench, not written back to the saved record. See stale saved-source issue below. |
| Static fire | Test installed or catalogue engines, count, propellant, throttle, optional cutoff, vacuum/sea-level/site pressure; charts for thrust, mass flow, Isp, startup and tailoff; compare model and catalogue values. | Uses the simulator's engine model. Vacuum-engine-in-air and solid cutoff are refused; transients are labeled model estimates. This is not an independently validated engine test. |
| Wind tunnel | Select remaining stages, boosters, fairing, propellant and payload; Mach×angle map of C_N/C_A/C_m/pressure center; 0–10° or 0–90° range; zero-angle drag and static margin; keyboard map and numeric table. | Explicit disclosure: no measured wind-tunnel data; slender-body/crossflow estimates and shared drag curve. Fins/nose shape do not alter this model. Angles above 15° are marked outside the fitted envelope. |
| Readiness | Orbit/site/payload/dynamics setup, automatic debounced worker review; specification/design/planner/probe/verdict/notices checklist; Fly enabled only without failed readiness items; handoff keeps reviewed mission and launch window. | Custom vehicles always get an insertion probe, catalogue vehicles only under the Launch panel's marginal-mission gate. Probe remains point-mass even if subsequent flight is six-DOF; this is disclosed. It establishes initial orbit, not full target-orbit delivery. |
| Optimal staging | Editable 1–5 serial stages, Isp, structural ratio, desired Δv and payload; least-mass ideal split; two-stage split plot; comparison with a catalogue vehicle or bench. | Loss-free closed-form solution; strap-ons and spacecraft are omitted and explained. It does not physically retune or alter the selected vehicle. |
| Sizing | Select target mission and 1–5 liquid stages; engine, structural ratio, diameter, ignition T/W, fairing and extra Δv; produce launcher geometry/masses/counts with estimates; send it to readiness or the Explore builder. | Planner allowance is a lower-end loss estimate. Starts with a deliberately marginal 1 t example; extra Δv and readiness are part of the learning loop. Serial/liquid-only, no solid sizing or parallel strap-on optimization. |

Main wiring: `src/ui/build/build-screen.ts:270–316`; `src/main.ts:463–478`. Progress metadata correctly records D01/D02/D04/D05 as built, D03 available at Explore while its full scope remains pending: `src/ui/section-plan.ts:105–137`. The previous claim that Build is merely a roadmap should be removed.

## Principal findings

### B1 — Saved design on the Engineer bench does not refresh after the same record is edited (P2)

Code evidence: `src/ui/build/engineer-level.ts:168–185` rereads only summaries. It updates a current Explore source, and only checks whether a selected saved ID still exists. It never rereads that saved record when its `updated` value changes. A saved record's full specification is loaded only in `pick()` at lines 220–227.

Reproduction: create/save a design in Explore; select that saved entry in Engineer; return to Explore, change stage stretch or engine count and Save the same record; return to Engineer while that saved entry stays selected. **Parent live result:** saved `Audit28 F9` with 9 engines, selected its saved entry in Engineer, changed it to 10 engines in Explore and saved, then returned to Engineer; Engineer still showed 9. Selecting a different source and then the saved one forces the refresh. The bench setter feeds static fire, tunnel and readiness, so the stale revision affects the shared test vehicle.

Impact: a normal design-test-edit-save-test cycle can review and hand off the wrong revision of a design. Recommendation: compare selected summary revision or reload the selected record on entry; refresh all bench panels from one revision and show design revision/name near results. Add a cross-level browser journey for this cycle.

### B2 — Invalid wind-tunnel payload silently leaves valid-looking stale results (P2)

Code evidence: `src/ui/build/tunnel-panel.ts:103–110`, especially the early return at line 107. For negative/nonfinite payload the update exits without clearing the map, marking it stale, or showing a refusal. `numberBox()` in `src/ui/build/explore-level.ts:146–149` marks only nonempty unparsable strings invalid, so an empty box or negative numeric value has no invalid flag. Payload field wiring is `tunnel-panel.ts:198–201`.

Reproduction: Engineer → Wind tunnel → change a valid payload to `-1` or clear it. The update path preserves the earlier calculation without a visible problem state. **Parent live result:** `-1` had no invalid flag. Clearing payload and selecting the 0–90° range changed the center-of-mass readout from 43.0 m to 43.7 m while the input remained empty; outputs stayed finite. The stage and angle handlers call `sweep()` directly (`tunnel-panel.ts:150`, `245–250`) and bypass the payload guard. Thus the same empty input can leave old output or recalculate output depending on the next control. No NaN UI output was observed or is claimed.

Impact: apparent results do not describe the entered configuration. Recommendation: one validated input path for every control; visibly mark old results as stale or clear them; show a short field-level error and require a valid nonnegative payload before sweep.

### B3 — An unrelated Save can erase records this version cannot read (P2, executable model reproduction)

Code evidence: `src/design/design-store.ts:105–113` filters unreadable records from `read()`. `save()` rereads this filtered list and rewrites it at `140–148`; `remove()` does the same at `153–157`. Consequently an invalid/unknown record retained in storage is dropped by a later unrelated successful write. The module promises it is left out rather than deleted; the existing test `tests/design-store.test.ts:88–99` checks listing but never follows it with a save.

Scenario: a record is unreadable because of damage or a newer schema. It is absent from the list, then saving any healthy design replaces storage with only valid records, removing the recoverable original. **Fake-storage probe result:** raw IDs before `[d1, unreadable]`; list returned `[d1]`; after saving another healthy design raw IDs were `[d1, d2]`, so `unreadableLost: true`. No evidence of actual user data loss was observed in this audit.

Recommendation: retain unknown raw records alongside validated records, or block writes with a recoverable backup/export path when the store cannot be completely parsed. Validate store version as well. Test list → unrelated save → inspect raw record preservation.

## Product recommendations, separate from correctness bugs

1. Make the Build learning path visible: take apart → remix/build → test → review → fly → return with outcome. A compact next-step action would connect existing strong modules; today a learner has to infer how five Engineer tabs relate.
2. Label Save's scope and keep the exercise context. `ExploreStoreHost.current()` and `DesignRecord` keep a vehicle only; reopening rebuilds payload through `loadedPayload()` (`explore-model.ts:678–694`). **Executable model probe:** a Falcon remix with a 123 kg exercise payload reopens at 11,400 kg. This follows the current vehicle-only contract, so it is separated from defects. Either save payload/editor metadata too or explicitly label it “Save vehicle” with a separate mission save. Preserving the exercise payload is preferable for a design course.
3. Provide undo or draft switching for Start over and changing the remix base. Both immediately replace the current draft and queue persistence (`explore-level.ts:357–385`). This is a product risk during exploration, even with explicit saved records available.
4. Bring model scope next to the main readiness badge: “point-mass insertion check” plus the selected eventual flight model. Detailed disclosure is already present; the prominent “Ready” badge could better communicate its narrower meaning.
5. Add a small baseline/changed comparison for mass, Δv and T/W so learners see the effect of one change without memorizing previous values. Existing computed figures and vehicle source already support this conceptually.
6. Preserve or offer export of Engineer experiment inputs/results (static fire, tunnel, staging, sizing). Only the finalized vehicle can currently be sent into the durable design store; the experimental settings are transient.

## Tests and verification targets

Existing focused suites cover models for parts, assembly/remix, budgets, warnings, number entry, draft/store round-trips, handoff, static fire, tunnel, readiness, staging and sizing. `tests/build-screen.test.ts` verifies readiness metadata, not DOM workflows. The shipped browser journeys cover Launch, Watch, mobile smoke and PWA; no Build journey was found in `tests/browser/journeys`.

Parent live positives: all five Build Watch tour steps worked, and static-fire vacuum/sea-level behavior was consistent with its controls. Other browser evidence belongs in the parent report.

Recommended minimum browser coverage: Watch part keyboard selection; Explore edit → Save → reload/open → export/import; invalid input/refusal; current Explore vs saved source in Engineer; stale saved revision refresh; payload ratings cancellation; sizing → review → Explore; readiness → Launch preserving payload/site/orbit/model/time. The new cross-level state transitions need DOM coverage beyond the strong model test set.
