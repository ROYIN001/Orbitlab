# R1 release follow-up — explicit navigation waits

Date: 2026-10-03 UTC. Plan: R1.5 release verification, with R1.1/R1.2 browser acceptance. Base: merged PR71 `5eb18a27fbf579159e3351545216c801b26c7df5`. This follow-up changes the browser harness and reports; application source, physics, stored-data contracts, reference goldens and bundle limits remain unchanged.

Status: correction verified, merged through [PR72](https://github.com/ROYIN001/Orbitlab/pull/72), and published through [Pages 37103651001](https://github.com/ROYIN001/Orbitlab/actions/runs/37103651001) at source `472645fd57062c79d50c567028de220145006861`. Read [PROGRESS.md](../PROGRESS.md) and [integration report](R1-integration.md) for current merge/publication status.

## Observed release failure

[Pages 37100771200](https://github.com/ROYIN001/Orbitlab/actions/runs/37100771200) failed exactly one full journey. Its annotation names `project-backups.mjs:135`, control `#btn-project-apply`, text “Restore selected sections and reload.” Playwright recorded visible/enabled/stable, performed the actual click, then timed out at **30,000 ms** while “waiting for scheduled navigations to finish.” This was not a missing/unclickable control. The journey already registered DOMContentLoaded with a **60-second** deadline and followed it with app readiness, but click added a separate earlier navigation barrier.

Installed Playwright **1.63.0** confirms that `noWaitAfter:true` disables that barrier. The implementation waits for navigation commit, so this evidence does not establish a slow image/font/full-window-load cause. The exact reason for delayed navigation in that runner is not independently proved. No blanket action/journey timeout increase or forced click is used.

The failed run had **10,079/10,079 unit cases passing**, **20/20 unique full journeys**, one nonpassing journey and no missing/unexpected/duplicate coverage. Source identity matched PR71. All non-browser prerequisite jobs and the other browser shard passed; final verification failed closed and publisher was skipped. A rerun without a correction is not used as acceptance.

## Correction and retained checks

- `tests/browser/harness.mjs`: `reloadDocument(page, controlLocator, ready)` owns one DOMContentLoaded wait and clicks the locator with `noWaitAfter:true`, then awaits app readiness. Passing the locator makes the helper enforce the policy rather than trust each callback.
- `project-backups`: both restore actions use the helper. Same-URL document sentinel, query cleanup, exact four-section bytes, recovery journal, unrelated storage, progress/notebook/mission/design model reads, defaults/preview and rejected-file assertions are unchanged.
- `learner-profiles`, `profile-session-safety`, `workspace-navigation`: ten existing reload-triggering controls pass locators to the helper. Creation/switch/reset/import/deletion and lazy recovery retain their existing assertions. Download-only, media import and nonactive deletion clicks are unchanged.
- `pwa-offline`: its update click disables the same redundant barrier while retaining the deliberate **full `load` event / 60 seconds**, app readiness and offline/update checks. It had not failed in the observed run; this is the same wait policy at the remaining direct click/reload pair.
- Click visibility/enabled/stability/action deadlines remain unchanged. Document readiness stays **60 seconds**, app readiness **120 seconds**, and every journey's existing overall limit stays unchanged. No journey, inventory item, assertion, numerical tolerance or schema field is removed.

Changed application behavior: none in this follow-up. These checks still fail if the document does not reload, the app does not initialize, restored data/models are wrong, ownership changes incorrectly, offline/update recovery fails, or any preserved assertion fails.

## Validation and handoff

- An initial two-click-only correction passed the actual `project-backups` production journey in **141.0 seconds** before centralizing the helper. This is a focused intermediate result, not final-candidate acceptance.
- Final centralized helper: **4/4 local production journeys passed**, 2026-10-03 06:06:11–06:13:58 UTC, actual launched Chromium **151.0.7922.173**, Node **22.23.3**, render scale **0.5**. `profile-session-safety` **166.719 s**, `project-backups` **139.932 s**, `pwa-offline` **68.458 s**, `workspace-navigation` **84.378 s**. All assertions and real reload/update actions were retained. Evidence: `/tmp/orbitlab-r1-navigation-browser.json` in this execution workspace.
- Node infrastructure/shard checks **59/59 passed**, zero failed/skipped/cancelled/todo, **0.953 s**. All six changed `.mjs` files passed syntax checks; scoped `git diff --check` passed. Existing production application manifest is `0880ee57146283`; source/physics/dependency/workflow/budget diffs are empty, so the existing application build is used for these harness checks.
- Fresh complete current-source PR CI must pass before merge; exact merged-source Pages must pass before publication. `learner-profiles` was reviewed with all eight leaf controls converted; its full lifecycle journey passed in the final full Pages inventory. Focused results do not replace remote union acceptance.
- Root owns Git/PR/release and updates this report with actual outcome. Keep the failed run in the history and do not label its refreshed artifact as deployed.

Lesson for subsequent work: use an explicit awaited document/application lifecycle for intentional reloads, and ensure the triggering click does not secretly impose a different navigation deadline. Keep actionability, real-navigation and domain-data assertions. Full selector/action/stack annotations exposed this issue without unavailable raw artifact downloads.

## Final acceptance

- [PR72 CI 37102480388](https://github.com/ROYIN001/Orbitlab/actions/runs/37102480388): all nine jobs passed, **10,079 unit cases / 18 smoke journeys**, zero missing/unexpected/duplicate/nonpassing. Synthetic checkout `ab8703133b44d5389c61f5f888c5b8888aec37be`, source inventory `5eed56619df39d022bf633db5be253b43308a98864c10a36b12154fbcacfbb47`; normal merge `472645fd57062c79d50c567028de220145006861` at 2026-10-03 06:36:59 UTC.
- [Final Pages 37103651001](https://github.com/ROYIN001/Orbitlab/actions/runs/37103651001): **10,079 unit cases / 20 full journeys passed**, including the complete learner lifecycle, both project restores, PWA/offline/update and lazy recovery. Exact merged source/hash matched; actual remote Chromium **153.0.8010.12**. Refreshed artifact and publisher/main-tip guards passed, followed by successful exact-SHA deployment **6824494621** at 2026-10-03T06:55:10Z. Dist SHA-256 `8b1188bb4564a7f079c0783ae9497933aaafdd2d2a4648b32a96e8e966c4e1d0`. See [integration](R1-integration.md) for full provenance and limits.
- An isolated app-less HTTP diagnostic also passed all three expected outcomes: with synthetic 350 ms navigation delay and the same 100 ms click deadline, old implicit navigation wait failed after the click, the actual new helper waited for a real document/ready marker and succeeded, and a missing ready marker still failed. Actual Chromium 151.0.7922.173 / Node 22.23.3 / Playwright 1.63.0. This proves lifecycle-stage ownership only; it does not establish the actual runner's delay cause or replace production journeys. Evidence: `/tmp/orbitlab-r1-navigation-diagnostic.json`.

Do not repeat this synchronization work in the next phase. Keep its existing deadlines and domain assertions; new failures require their own action/phase evidence. No application/physics changes were introduced by PR72.
