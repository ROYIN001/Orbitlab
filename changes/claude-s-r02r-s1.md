## CHANGELOG

- Docs (R0.2r, M-PLAN-013): domain ADRs for the contracts already shipped — FlightLifecycle (setup → flight → analysis; `previewsChange`, the plan's `shouldPreview`), CameraPolicy (cinematic/manual owner, Watch view tabs), Orbit hand-off v1 with the optional DesignRef (invalid design data refused), DesignPreview and ResultAction (typed cause → setup field; readiness item → part) — in `docs/development/adr/` with an index; ADR-CraftState (physical state) moves to R5.2 PR1; no code change.

## PROGRESS

| R0.2r (M-PLAN-013, wave K1; docs) | In PR; not merged; not published (docs only) | Five ADRs written as built, each citing `file:line` on `bdbfeff`, with open points where the code does not settle a question: `docs/development/adr/flight-lifecycle.md`, `camera-policy.md`, `handoff.md`, `design-preview.md`, `result-action.md`, and the index `README.md` (the CraftState physical-state ADR is not here: R5.2 PR1); DECISIONS.md D-59 move table rows set to written with links; checks: `node --test tests/verification/*.test.mjs tests/browser/shard.test.mjs` and `tests/repo-hygiene.test.ts` (vitest); no code, CSS or physics change | [ADR index](adr/README.md) |
