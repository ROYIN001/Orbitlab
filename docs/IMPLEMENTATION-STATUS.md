# Orbitlab improvement checkpoint

## Latest status — 2026-09-20

**Local acceptance completed:** full regression passed 762 tests in 54 files
in 1225.00 s, including numerical mission/recovery and component sensitivity.
TypeScript, production build and documented browser checks passed. The approved
phase-6 orbital scope is ready for main; recovery remains experimental.
Verify GitHub Pages for the release commit separately before claiming it live.
This result supersedes the pending-suite wording retained below.

This section supersedes historical paused/in-progress statements below.
Phases 1–2 are already live at main `ce741ad`. Phase 6 was resumed with a
requirement to pause below 20 actual credits; phases 5/3/4 remain deferred.

Both Falcon and Soyuz complete delivered-orbit convergence gates passed at
0.01/0.005 s RK with the same 0.01 s control clock. All seven additional wind
and rotational-flow delivered-orbit cases passed independent raw-state grading.
Metadata, CSV, pad/failure/replay event boundaries and preview setup locking
are corrected. TypeScript/build and local browser interactions passed; see
`SIXDOF-ACCEPTANCE.md` and `SIXDOF-BROWSER-QA.md` for scope and exact evidence.

Recovery remains experimental by the owner's explicit choice, including two
impacts in 18 terminal-restart stress trajectories (four before the terminal burn
was planned mid-throttle; see `SIXDOF-ACCEPTANCE.md`). Full regression is still
running in `../audit-2026-09-19/validation/resume-final-suite.log`; its completed
result is required before release. Phase 6 is not yet merged or published.

User-selected order: **1 → 2 → 6 → 5 → 3 → 4**.
Latest scope update: **phases 5, 3 and 4 are deferred at the user's request**.
Finish phase 6 only in the current work. The user subsequently authorized merging
the accepted phase into **main** and publishing the website for their review.
Do this after phase-6 acceptance; verify the resulting GitHub Pages deployment.

## Decisions agreed on 2026-09-19

- Warn about infeasible missions, allow experiments, and grade every requested target constraint.
- Keep Simulator as the first page, add quick starts and optional guidance.
- Full 6DOF: Falcon 9 and Soyuz-2.1a first; autopilot and manual body-rate/throttle commands; disclosed estimates, sensitivity studies and repeatable winds. Agree model/acceptance before implementation; proposal recorded in the parent `implementation-planning/six-dof-design-proposal-th.md`.
- Once accepted, six-DOF becomes the default for those two vehicles with a legacy toggle.
- Approved public About identity: **Royin Chunhakit**. Approved bio verbatim: **Royal Thai Air Force scholarships Cadet in Russia**. No contact link or additional biography was supplied.
- No public deployment has been performed.

## Phases 1–2 checkpoint

Implemented strict final RAAN grading and preflight warning, shared UI/API validation, chronological replay/event views, telemetry-compaction invalidation, cancellable worker tuning with full-mission verification, quickstart LEO/ISS/GTO, learning/advanced setup, optional first-use guide, Help/glossary, accessible chart descriptions, mobile section links and frame-based mission results.

Validation: 447 tests in 22 files pass; TypeScript and production build pass. Browser checks on local dev/production builds include invalid-number launch gating, tuning completion/cancellation/config edit cancellation, chronological max-Q/engine-out replay, ISS quickstart completion and displayed-time result table, Thai/Russian/English content, 390 px layout without horizontal page overflow, Help Skip/Escape/focus restoration. Not a real mobile-device or screen-reader certification.

Final-orbit capability fixtures now launch in the correct window. Dedicated off-window regression verifies a stable orbit is reported off target. Acceptance bands were not relaxed.

The result table explicitly reports the displayed instant, separately from the original outcome time: post-insertion orbital drift can therefore exceed the band later. Review-event navigation returns to the original outcome.

## Current work

**Paused at the user's request to conserve usage.** Publish only the accepted
phase1–2 commit `ce741ad`; retain phase6 on its own branch. Resume from
[CONTINUE-PHASE-6.md](CONTINUE-PHASE-6.md), which supersedes the in-progress
paragraphs below. Final post-payload-fix acceptance has not run.

Phase 6 core equations, finite actuators/control, vehicle data dossiers and integration. No 6DOF acceptance or completion claim yet. Phases 5, 3 and 4 are deferred and must not begin without a later user instruction.

Integration findings: numerical refinement holds guidance/control at 10 ms and refines only the plant. The bounded nominal Falcon recovery passes the original convergence thresholds with finite terminal restart guidance. Falcon now reaches the actual 500 km target using J2-consistent coast planning. One common Soyuz programme reaches ISS under calm/crosswind/shear and has been wired into both the panel and simulation defaults. Full-mission numerical convergence is running. Recovery flow assumptions retain material quantitative differences despite both contact classifications passing; its confidence remains limited. Final sensitivity, browser and integration checks remain before acceptance and the authorized main/Pages publication.
