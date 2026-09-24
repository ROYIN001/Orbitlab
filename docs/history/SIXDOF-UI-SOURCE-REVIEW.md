# Six-DOF controls: source and interaction review

Date: 2026-09-19. Scope: the local improvements worktree, not the published site.

## Evidence boundary

This review does not establish browser rendering or physics acceptance. The
review agent's CUA inventory returned no browsers or apps, and creating an
in-app browser tab returned `Browser is not available: iab`. No browser tab or
viewport was changed. The root agent owns the separate browser smoke run.

The interaction tests run the production control class against a small
event-capable DOM surface. They cover command state and callbacks, not native
input validity, accessibility-tree output, keyboard focus, or responsive layout.

## Confirmed defect and correction

The first manual-mode change sent a valid command, then immediately restored
the old automatic selection. `RigidControls.refresh()` read the previous stored
frame before the next telemetry update, overwriting the newly accepted local
command. The regression reproduced `expected manual / received auto`.

The controls now copy accepted command mode/rates/throttle into a local copy of
the displayed telemetry after the command callback succeeds. The correction
keeps the selection and editable fields consistent while the next frame is
pending. Replay still displays the recorded command with every control disabled;
returning to live restores current live command values.

Regression: `tests/rigid-controls.test.ts` (2 tests).

## Configuration hardening

Dynamics validation now attributes errors to the model selector, wind selector,
or seed field as appropriate. Seeds report finite-number, integer, minimum,
and maximum violations rather than a generic model-selection error.

Switching to the legacy model preserves valid wind and seed values, including
both uint32 seed endpoints. Invalid externally supplied weather values are
repaired before their controls disappear. Ordinary invalid UI drafts already
remain outside committed configuration and are cleared when the field is removed
by a model change; the source review did not confirm a hidden-draft launch trap.

Regression: `tests/config-validation.test.ts`, `tests/dynamics-panel.test.ts`.
The latter invokes the production model-selection callback independently of
mission preview and browser layout.

## Verification recorded here

`npx vitest run tests/rigid-controls.test.ts tests/config-validation.test.ts tests/dynamics-panel.test.ts tests/mcp.test.ts`

Result: **107 tests passed across 4 files**. `npm run typecheck` passed.

## Browser smoke still required separately

- New configuration: Falcon 9 and Soyuz default to six-DOF; unsupported vehicles
  display the legacy model and explanation. Toggle supported models and verify
  a valid custom wind and seed survive both directions.
- Launch a short segment at 1× and 5×. Choose manual mode, set a small roll rate
  and throttle, then verify the selected mode remains manual immediately and
  measured rotation responds over time.
- Record another command, pause, and seek before and exactly onto each command.
  Verify recorded mode/rates/throttle and read-only controls; return to live.
- Repeat the visible controls in English, Russian, and Thai at 390 px width;
  inspect wrapping, overflow, labels, keyboard operation, and focus. Restore the
  viewport after inspection.

Full-mission trajectory and six-DOF physical acceptance are separate checks.
