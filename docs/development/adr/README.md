# Architecture decision records (domain contracts)

These ADRs record contracts **as they are built** on `main`. They do not add decisions. Where the code does not settle a question, the ADR lists it as an open point. Code references are `file:line` on `origin/main` at `bdbfeff`.

The folder and this index come from the D-59 move table in [DECISIONS.md](../../DECISIONS.md). The residual ADRs were written by plan package R0.2r (M-PLAN-013, wave K1).

**Format.** Each ADR has: Status, Context, Decision (as built), Consequences, Open points, Code references.

| ADR | Contract | Status | Text |
|---|---|---|---|
| [ADR-FlightLifecycle](flight-lifecycle.md) | setup → flight → analysis; when a setup change previews | Written (R0.2r) | this folder |
| [ADR-CameraPolicy](camera-policy.md) | cinematic/manual ownership of the Launch and Watch camera | Written (R0.2r) | this folder |
| [ADR-Handoff](handoff.md) | Orbit hand-off v1 with the optional DesignRef | Written (R0.2r) | this folder |
| [ADR-DesignPreview](design-preview.md) | design drawings read the design the numbers read | Written (R0.2r) | this folder |
| [ADR-ResultAction](result-action.md) | typed cause → setup field; readiness item → part | Written (R0.2r) | this folder |
| ADR-CraftState (physical state) | attitude, angular velocity, subsystem state and the rest of PLAN's CraftState | **Not in R0.2r.** Moved to R5.2 PR1 (docs), counted in R5.2, before R5.2's realism PRs (S18 M-PLAN-013 row) | — |
| LearnerRepository / ProfileWorkspace | storage and profiles | Done (R1.1/R1.2); existing text | [R1.1 report](../reports/R1.1-storage.md), [R1.2 report](../reports/R1.2-profiles-ui.md) |
| GestureOwnership | each canvas owns its gestures | Done (R1.3); existing text | [R1.3 report](../reports/R1.3-gestures.md); `src/render/gestures.ts` |
| VerificationManifest | evidence manifest | Done (R1.5); existing text | [VERIFICATION.md](../VERIFICATION.md); [R1.5 report](../reports/R1.5-workflows.md) |
