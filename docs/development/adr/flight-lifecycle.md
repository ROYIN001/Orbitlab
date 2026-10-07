# ADR-FlightLifecycle: setup → flight → analysis

- **Status:** Accepted as built (R2.1, PR #74; preview rule from CO-4, M-LAUNCH-027). Written by R0.2r (M-PLAN-013).
- **Contract in the plan:** PLAN.md §4 "FlightLifecycle".

## Context

Before R2.1, one flag (the setup panel's `running`) stood for three things: the mission lifecycle, the live simulation clock and the displayed cursor (live or replay). Pausing or replaying could reopen the setup. LUI-01 (M-LAUNCH-027) then found that an edit made after launch could rebuild the pad preview over the flight.

## Decision (as built)

1. **Three stages.** `MissionStage = 'setup' | 'flight' | 'analysis'` (`src/ui/flight-lifecycle.ts:22`). It is derived, not stored: `missionStage({ launched, done })` gives `setup` when nothing is launched, `analysis` when the simulation is done, else `flight` (`src/ui/flight-lifecycle.ts:24-27`). The app reads `launched` from `panel.isRunning()` and `done` from `sim.done` (`src/main.ts:1529`).
2. **The clock and the cursor are not the stage.** Pausing the live clock, scrubbing into a replay or changing the layout stays in `flight` (`src/ui/flight-lifecycle.ts:12-13`).
3. **The way back to setup is explicit.** Only New mission (`SetupPanel.backToSetup()`, `src/ui/panel.ts:363-370`) sets `running = false`. A result's suggestion uses the same path (`src/main.ts:1653-1654`; the Explore debrief's "fly again" too, `src/main.ts:684`).
4. **The setup column.** `setupCollapsed(mode, stage, peek)` is true only at the Engineer level, outside `setup`, when the user has not asked to see the setup (`src/ui/flight-lifecycle.ts:30-32`). The Explore level never collapses it. `syncLifecycle()` writes `body[data-flight-stage]` and `body[data-setup]` only on change, and moves focus out of a column about to be hidden (`src/main.ts:1528-1546`). A peek does not change the stage. A stage change into or out of `setup` closes the peek (`src/main.ts:1532`). `toggleSetupPeek()` does nothing at the Explore level or in `setup` (`src/main.ts:1679-1684`).
5. **When a setup change previews (the `shouldPreview` contract).** The plan sketched a pure `shouldPreview(stage)` that returns false in `flight` (`docs/development/plan/S06-closeout.md:209`; `docs/development/plan/S18-execution-model.md:366`, `:375`). It shipped as `previewsChange(stage, playing, change)` (`src/ui/flight-lifecycle.ts:52-55`). The CO-4 report records why: the replace paths (template, viewer launch, Monte Carlo run, restored file) load a mission while the panel still reports running, so a stage-only guard would stop them previewing ([CO-4 report](../reports/CO-4-r2-fixes.md) "Why not the simpler stage-only guard"). The rule:
   - nothing previews while the clock runs (`playing` → false);
   - `change === 'replace'` (a whole mission replaced on purpose) previews in any stage;
   - `change === 'edit'` previews only in `setup`. In `flight` or `analysis` the edit is held in the setup as the next launch's configuration; the flight and its recording are not touched.
   So `shouldPreview('flight')` is false for an edit, as the plan asked. The call site is `src/main.ts:613-617`. `SetupChange` is defined at `src/ui/flight-lifecycle.ts:40`.

## Consequences

- Replay, pause and layout changes cannot reopen or rebuild the setup.
- The flown configuration stays frozen while a flight exists. The setup can be shown read-only, with Relaunch and New mission.
- Every caller of the panel's `onChange` must say whether its change is an `edit` or a `replace`. A wrong label either previews over a flight or fails to preview a new mission.

## Open points

- The plan's lifecycle is `setup → running → completed/aborted → analysis → setup`. The code has no separate `completed` or `aborted` stage: any end of the simulation (`sim.done`) is `analysis`. Whether an abort needs its own stage is not decided.
- The stage is derived from a UI flag (`panel.isRunning()`) and a simulation flag. No single owner holds it. Whether R5.1 needs a stored lifecycle owner is open.
- The plan's "finishing at the live head does not silently pull the cursor out of replay" is not part of this module. Where it is held is not recorded here.
- The function name differs from the plan (`previewsChange`, not `shouldPreview`). This ADR treats the code as the contract.

## Code references

- `src/ui/flight-lifecycle.ts:1-55` (whole module, pure)
- `src/main.ts:613-617` (onChange → `previewsChange`), `:1528-1546` (`syncLifecycle`), `:1669-1684` (`showSetting`, `toggleSetupPeek`)
- `src/ui/panel.ts:363-370` (`backToSetup`)
- Tests: `tests/flight-lifecycle.test.ts`
- Reports: [R2 report §R2.1](../reports/R2-workspace.md), [CO-4 report](../reports/CO-4-r2-fixes.md)
