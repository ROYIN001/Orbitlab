# Follow-up source regressions — 2026-09-28

Current source: `audit-2026-09-28/source`, commit `0a6d1a709ffbf88e8e36f606d6993bd27e5c25e0`. The earlier `audit-2026-09-27/orbit-review.md` and `code-review.md` were used only to identify regression targets. Every conclusion below was checked against current code. Product files were not edited; source Git status remained clean. Browser verification is owned by the parent reviewer and should be reported separately.

## Outcome

Nine earlier state/mission findings have concrete current-source fixes with passing focused tests. The inspector's synchronous attitude tuner and the partial Monte Carlo worker-startup leak still exist; both were rechecked on current modules. Do not report all old findings as either still open or universally fixed.

ID correction: the old implementation plan labels inspector tuning **A17**, Monte Carlo worker startup **A18**, and provider generation/stale data **A14**. Those three are kept separate here.

Parent browser update after the focused tests: **A6 and A9 are also live-confirmed**. The parent completed the Bandwagon six-DOF mission through payload release and checked the Orbit handoff. This does not certify every mission, and the result-table labeling issue found in that same flight is separate from the corrected completion/handoff behavior; see the addendum below.

| Old target | Current source result | Evidence and practical limit |
|---|---|---|
| A1 Home/reload/workspace mission loss | Fixed in inspected path | `src/ui/workspace-mission.ts:44–105` separates viewer/workspace ownership. Startup defers restoration while a viewer is visible (`src/main.ts:774–782`); entering a workspace calls restoration (`:655–657`, `:936–942`), and preview saves only an owned mission (`:1282`). Home Continue explicitly restores the stored mission. The active viewer flight is deliberately kept when moving into workspace. `workspace-mission.test.ts` passed; actual reload/DOM journey belongs to parent. |
| A2 propellant ≥ total mass, Infinity budget | Fixed in model and UI wiring | `src/orbit/budget.ts:67–104` rejects nonfinite/invalid craft and requires fuel strictly below total mass. `deltaVAvailable`/`budgetFor` reject invalid input instead of emitting Infinity. Dynamic field limit `maxPropellant` is used in `src/ui/orbit/maneuver-panel.ts:207`; error text and budget exclusion are wired at `:176–184` / `:285–286`. `budget.test.ts` includes the prior 100 kg / 1,000 kg case and passed. |
| A3 zero-fuel spacecraft adopts ideal destination | Fixed with explicit alternative | `adoptBlock` in `budget.ts:144–149` rejects fuel-infeasible and invalid craft. The UI marks the shown path as ideal (`maneuver-panel.ts:293–295`) and its action uses the block. The actual callback independently checks it (`playground.ts:730–734`). A separate `adoptReached` action follows only the partial burn and remaining coast (`:749–769`, `budget.ts:159–182`). Ideal Δv-only exploration without a spacecraft remains available by design. Budget tests passed. |
| A4 old-city overflight list | Fixed in inspected result lifecycle | `sky-panel.ts:720–740` snapshots group, observer coordinates, elevation, duration and data tag into `ResultSlot`; current form is compared to those immutable inputs. Results name the original city and start time (`:795–808`) and shared provenance marks stale output (`:1656–1667`). City/elevation/duration edits refresh the display. Relevant `result-slot.test.ts` uses the actual RealSky model and passed. |
| A5 lifetime results under changed settings | Fixed in inspected lifecycle and input validation | `src/ui/lifetime.ts:174–192` refuses invalid positive-number fields. `markFreshness` disables Run for invalid fields and dims/labels previous results with original inputs (`:241–260`). Run takes frozen `slot.inputs` before awaiting activity/worker and uses those values (`:263–295`). `result-slot.test.ts` lifetime-input/freshness checks passed; no long lifetime browser run is claimed here. |
| A6 Launch handoff while Real satellites selected | Fixed in inspected routing | Fresh handoff invokes `handoffEntry`, leaves Sky when required, resets incompatible satellite context, loads and frames the transferred orbit (`src/ui/orbit/playground.ts:320–337`). Actual orbit adoption is unchanged. Three selected `orbit-playground.test.ts` handoff cases passed, along with `orbit-handoff.test.ts`. |
| A9 Watch completion at parking orbit | Fixed in inspected ending rule | `missionOrbit` (`src/ui/watch-logic.ts:367–371`) recognizes actual completed orbital work rather than parking event; `flightEnding` uses it (`:436–445`), waits for payload release/settle, and respects recovered stages. `parkingMilestone` is a separate intermediate notice (`:390–396`). `watch-logic.test.ts` passed, including Bandwagon wait, pending-burn gap, payload settle and other missions. `mission-result.test.ts` also passed. Existing old-recording status fallback remains intentional. |
| A10 Monte Carlo point opens today's mission | Fixed in inspected handoff | `runMissionState` (`src/ui/monte-carlo.ts:49–51`) copies the set's full saved MissionState and applies that run's dispersion. `openRun` passes it whole (`:668`), and the root restores it directly (`src/main.ts:445–447`) instead of merging dynamics into the current panel mission. The three focused A10 tests passed. |
| A14 data-mode late completion and stale analyses | Fixed in inspected RealSky boundary | `sky-panel.ts:209–223` guards both successful/error catalogue completion with a generation token, while reset advances it (`:278`). Results include data source/as-of/fetched values (`:286–290`) and passes/re-entry also include element epoch. New provider answers therefore invalidate old result freshness even with the same selected IDs. Actual overlapping-provider tests in `result-slot.test.ts` and all `data-provider.test.ts` cases passed using controlled data/fetch doubles. No live online-service availability claim is made. |

## Still open: A17 inspector attitude Auto Tune remains synchronous (P2)

The current `src/ui/loop-tuning.ts:185–193` still invokes the complete `autoTune(...)` synchronously inside a 30 ms `setTimeout`. The timer gives the initial message a chance to paint; it cannot yield while the numerical search runs. It verifies the full recorded-model set (`tuneCases(..., Infinity)`), and this inspector workflow has no worker/cancel path.

Rechecked current-source microprobe: 16 elementary two-state plants, same shape as `tests/control-tuning.test.ts:90–91`, took **98.8 ms** on the audit Node runtime. A queued zero-delay timer still had not fired when `autoTune` returned. This proves synchronous execution, not a worst-case browser latency measurement; duration depends on hardware and recorded model complexity. The full focused control-tuning suite passed, so numerical correctness does not resolve responsiveness.

Recommendation: move this inspector tuner to a cancellable worker, freeze input/targets at submission, gate late results by run ID, and show progress. Keep this distinct from the main launch-guidance tuner, which already has `src/physics/tune-job.ts` and should not inherit this finding.

## Still open: A18 partly created Monte Carlo pools are not cleaned up (P2)

The current constructor still spawns in a loop (`src/physics/monte-carlo-job.ts:64`), with an unguarded factory at `:70` and `postMessage` at `:92`. A later throw exits before the UI owns the job (`src/ui/monte-carlo.ts:291–297`), leaving earlier workers and attached callbacks alive. Replacement-worker failure follows the same factory path.

Safe current-source executable reproduction used the actual `MonteCarloJob` and mission/dispersion modules, plus a fake worker factory which succeeds once and throws on its second creation. No physics flights or real workers were launched. Result:

```json
{
  "factoriesCalled": 2,
  "posted": 1,
  "terminated": 0,
  "callbackStillAttached": true,
  "error": "injected second factory failure"
}
```

The two existing normal pool/worker-death tests passed but do not cover constructor/factory/postMessage startup failure. Recommendation: catch initialization and dispatch failure, detach handlers and terminate every started worker, then report one failure; cover startup and replacement factory failure with injected tests. This is conditional on a worker allocation/dispatch failure, not a claim that ordinary Monte Carlo sets currently fail.

## Late browser/source addendum — the result table mixes assessed apsides with displayed-frame angles (P2)

**Parent browser observation:** Bandwagon six-DOF completed payload release around T+3253 s. Paused at displayed T+3272.45 s, frame-backed state reported perigee/apogee **586.1219 / 597.1501 km**; rounded telemetry showed **597 × 586 km**, and Orbit handoff showed **586 × 597 km**. The Mission result table, captioned **“Orbit at the displayed time,”** instead showed apogee **594.8 km** and perigee **586.1 km**, with an outcome time around T+3238.2 s. This is not evidence that the handoff was stale.

**Source explanation, inspected without another test run:** `src/main.ts:1588–1593` passes the same frame-backed view to telemetry and the result panel. However, `src/ui/result-content.ts:71–73` explicitly replaces the frame's apsides with `completed.params.apAltM/peAltM`, while retaining the displayed frame's inclination/RAAN. Metrics at `:80–85` therefore combine two meanings. `displayedTime` is still `state.t` (`:121`). The table renders these metrics unchanged (`src/ui/mission-result.ts:103–110`), with the displayed-time caption in all three languages (`result-content.ts:168,196,224`). This explains the discrepancy independently of a half-second UI refresh delay.

The event values are intentional: six-DOF `judgedElements()` uses the next revolution's minimum/maximum altitude under J2 (`src/physics/sim/burns.ts:77–94`), and the outcome event stores those unrounded values so the table matches the verdict (`:755–769`). Suborbital completion also stores assessed apsides (`src/physics/sim/ascent.ts:241–250`). These are not necessarily osculating elements at the displayed instant. The existing displayed-orbit test (`tests/mission-result.test.ts:116–129`) supplies only rounded `ap/pe` event parameters, so it exercises the fallback, not the `apAltM/peAltM` override. No tests were rerun for this addendum.

**Acceptance criterion:** expose separate, accurately labeled concepts—assessed values at the outcome (with predicted next-revolution J2 extrema identified where used), and osculating elements at the displayed time. Avoid combining frozen apsides with current angles under one current-time label. Replaying after completion should preserve the outcome verdict while the current-orbit table agrees with telemetry/Orbit handoff; capture the complete assessment snapshot if showing all assessed metrics. Do not simply discard the J2-based values and make the verdict disagree with its own criteria.

## Previously executed checks (unchanged)

- Eight selected files: `workspace-mission`, `budget`, `orbit-handoff`, `result-slot`, `mission-result`, `watch-logic`, `data-provider`, `control-tuning` — **118 tests passed**, 27.65 s, max two workers.
- A10 selection from `monte-carlo.test.ts` — **3 passed / 15 outside-filter skipped**, 2.31 s.
- Normal Monte Carlo pool and Orbit handoff-entry selections — **5 passed / 33 outside-filter skipped** across `monte-carlo.test.ts` and `orbit-playground.test.ts`, 3.08 s.
- Total distinct selected assertions: **126 tests passed across 10 files**. These include existing model and some physics integration tests; no heavy suite, browser suite, dependency installation, or product modifications were performed by this reviewer.
- Two safe probes: fake-worker partial-start cleanup and synchronous elementary attitude tuner. Vite SSR loaded current source; no external service requests or real browser storage were used.

For a release summary, state “current source and focused tests confirm fixes; these two engineering-tool gaps remain” and add the parent's browser outcomes. Passing Node suites do not by themselves certify reload focus behavior, visual warnings or end-to-end interactions.
