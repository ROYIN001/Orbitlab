# Orbitlab improvement checkpoint

User-selected order: **1 → 2 → 6 → 5 → 3 → 4**.

## Decisions agreed on 2026-09-19

- Warn about infeasible missions, allow experiments, and grade every requested target constraint.
- Keep Simulator as the first page, add quick starts and optional guidance.
- Full 6DOF: Falcon 9 and Soyuz-2.1a first; autopilot and manual body-rate/throttle commands; disclosed estimates, sensitivity studies and repeatable winds. Agree model/acceptance before implementation; proposal recorded in the parent `implementation-planning/six-dof-design-proposal-th.md`.
- No public deployment has been performed.

## Phases 1–2 checkpoint

Implemented strict final RAAN grading and preflight warning, shared UI/API validation, chronological replay/event views, telemetry-compaction invalidation, cancellable worker tuning with full-mission verification, quickstart LEO/ISS/GTO, learning/advanced setup, optional first-use guide, Help/glossary, accessible chart descriptions, mobile section links and frame-based mission results.

Validation: 447 tests in 22 files pass; TypeScript and production build pass. Browser checks on local dev/production builds include invalid-number launch gating, tuning completion/cancellation/config edit cancellation, chronological max-Q/engine-out replay, ISS quickstart completion and displayed-time result table, Thai/Russian/English content, 390 px layout without horizontal page overflow, Help Skip/Escape/focus restoration. Not a real mobile-device or screen-reader certification.

Final-orbit capability fixtures now launch in the correct window. Dedicated off-window regression verifies a stable orbit is reported off target. Acceptance bands were not relaxed.

The result table explicitly reports the displayed instant, separately from the original outcome time: post-insertion orbital drift can therefore exceed the band later. Review-event navigation returns to the original outcome.

## Current work

Phase 6 core equations, finite actuators/control, vehicle data dossiers and integration. No 6DOF acceptance or completion claim yet. Phases 5, 3 and 4 remain after phase 6 in the requested order.
