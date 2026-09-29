# Orbitlab: continue the authorized audit, definite bug fixes and graphics quality work in Codex Cloud

The user explicitly asked to move this work from their Windows computer to a new Codex Cloud session so the computer can shut down. This is the same work, not a fresh audit that discards pending changes. Communicate and produce the final audit in Thai.

## User-authorized outcome

Read the attached `audit-2026-09-28/Orbitlab-audit-TH.md` and all supporting reviews. Thoroughly test the gaps listed in its limitations table. Correct definitely erroneous content, reproducible bugs, broken menus, and improve existing simulation graphics across Launch/Orbit/Build. Do NOT implement new feature/development proposals: record those separately for later approval. Distinguish document proposals from user authorization. Do not publish/deploy or merge automatically. The final result must be reviewable code changes, test evidence and an updated Thai report, with remaining limitations stated honestly.

Website: https://royin001.github.io/Orbitlab/
Repository: https://github.com/ROYIN001/Orbitlab
Local starting source commit: `0a6d1a709ffbf88e8e36f606d6993bd27e5c25e0`.

## Attached archive: restore before doing more work

`Orbitlab-cloud-handoff-2026-09-29.zip` contains:

- `source.patch`: `git diff --binary HEAD` for tracked changes.
- `overlay/`: complete current contents of every changed/new source/test file. Use the patch for tracked changes, then copy only new files (listed in manifest) from overlay; do not blindly overwrite a newer upstream version.
- `manifest.json`: base SHA, changed/new file lists and SHA-256 for every archive payload.
- `audit-2026-09-28/`: original user-named report, detailed reviews, probes and screenshot evidence.
- `audit-2026-09-29/`: progress reports, inventories, partial logs, focused test results and resumable checkpoint.

Verify archive checksums. Inspect current cloud checkout HEAD against the base. Apply tracked patch with `git apply --check` then `git apply` if on the same base; if upstream has moved, inspect/reconcile changes without dropping either side. Copy new files from overlay, and retain audit folders in the workspace for the final report. These edits are intentionally incomplete; use tests and browser verification before claiming them fixed. Never include node_modules, credentials or local agent config in a PR.

## Work already saved, validation and unresolved issues

1. Existing dirty changes at start of local session: lesson draft preservation, lesson rubric/locks and case input persistence; assessment recommendation/review figure; Build bench refresh by saved timestamp, invalid tunnel payload handling, raw unreadable design preservation; Monte Carlo worker failure cleanup. Review their completeness and finish missing regression/browser tests.
2. Learning agent corrected definite EN/RU/TH bank content while preserving all question IDs, choice order, correct flags, numeric formulas and tolerances. **157/157 scoring structures unchanged**, **926 text triples** have no missing entries/placeholder mismatch. This is structural verification, not complete independent editorial/statistical certification. Focused suite **63/63 passed**; latest tsc passed. `typecheck-20260929.log` records an EARLIER error subsequently corrected with the choice-type guard. Read `learning-validation-TH.md` for remaining work.
3. Graphics: new `src/render/stars.ts`, updated `scene.ts` and `orbit-view.ts`; soft deterministic shared stars, correct device pixel sizing, Orbit DPR refresh and disposal of sector materials. Existing render regressions **22/22 passed**, tsc passed. No visual/performance browser acceptance yet; Build graphics unchanged. Read `graphics-validation-TH.md`.
4. New `tests/monte-carlo-job-failures.test.ts`: **5/5 passed**, verifies existing failure-cleanup changes.
5. Heavy/fleet tests were already running locally when this continuation started. Their logs are PARTIAL, not successful suite results. Inventory: **246 heavy cases**, **163 sixdof fleet cases**. At saved physics checkpoint: heavy 128 passed, 21 fingerprint mismatches; fleet 19 passed, 0 failures reported. Logs may include more at packaging. **21 numeric-state JSON fingerprint mismatches remain unexplained: do not dismiss as raw fixture CRLF, and do not regenerate goldens just to pass.** Rerun/reproduce in Linux and compare meaningful state tolerances; inspect changed physics vs platform determinism.
6. Existing current-date JSON records **7/7 heavy sixdof lesson solutions passed**, but repeat affected solutions/counterexamples when rubric/source changes; inspect provenance. Do not count partial/repeated overlapping runs as a unique total.
7. Root found an incomplete fix before migration: `src/ui/build/tunnel-panel.ts` calls `t('build.eng.tunnel.invalidPayload')` but `rg` found no translation definition anywhere in src. Add the proper localized user-facing error and verify UI; do not leave a key string visible.
8. Root has NOT run complete standard suite/build/browser workflows. Main user report NOT yet updated. Mission-result orbit-at-cursor vs assessed-outcome labels not yet corrected (report item 11). No Git push/deployment/PR made.

## Required test/acceptance work remaining

- Run `npm ci` as appropriate, `npm run typecheck`, `npm test`, `npm run build`, `npm run test:heavy`, `npm run test:sixdof-fleet`. Choose sensible worker limits; heavy flights take significant CPU. Persist machine-readable results and continue long work where environment allows. A timeout is incomplete, not pass.
- Test all 21 launch vehicles, supported recovery plan categories, lesson solutions all 24 including the 7 sixdof lessons, negative rubric counterexamples; enumerate vehicle/site/orbit/payload/wind/fault axes. Continuous Cartesian input space cannot be literally exhausted; give exact generated coverage plus boundary/pairwise/risk coverage, not vague 'everything tested'.
- Orbit numeric solvers against independent analytical/reference fixtures; catalogue/TLE/OMM, custom uploaded synthetic fixtures, maneuver/lifetime/reentry workflows; distinguish regression from real-world tracking validation.
- Build parts/engine compatibility matrix, invalid boundaries, saved design refresh across Explore/Engineer, storage refusal/raw-record preservation, import/export round trips through browser with synthetic files, all 5 engineering benches and Build-to-Launch.
- Browser journeys for Watch/Explore/Engineer across Launch/Orbit/Build, dialogs/menus, lessons drafts/hints/language/focus, assessment review figures/storage errors, replay and outcome time semantics. Use available supported browser testing environment. Test responsive viewports/keyboards/accessibility semantics and report that emulation is not real-device or full screen-reader validation.
- Complete source-grounded editorial review (EN/TH/RU) of remaining content. Validate corrections against primary sources; detailed references are in reports. Do not change reveal/restart grading policy or add a new assessment architecture without authorization; record development proposals.
- Accept graphics only after before/after screenshots and practical performance/readability checks in Launch, Orbit, Build. Improve existing graphics as authorized, do not redesign physical models under cover of aesthetics.
- Update `audit-2026-09-28/Orbitlab-audit-TH.md` with dated status/cross-reference and create a detailed `audit-2026-09-29/Orbitlab-audit-TH.md` (date actual cloud completion if later), test matrix, bug/change table, clear deferred-development list, evidence links and any unresolved findings. No false claim of complete validation when device/data/tools/time are unavailable.

## Scope and safe resumption

Do not use the old September 13 buildless Orbit Lab handoff/commits as current source facts. Keep original evidence and distinguish live Pages (old deployed build) from locally changed preview. The user wants sustained autonomous testing and fixes; do not stop at a plan or ask repeated permission for authorized reversible fixes. If a consequential publication is later proposed, finish and validate the reviewable result before requesting it. Keep all work resumable if compute/runtime/usage ends.

