# ADR-ResultAction: from a typed cause to the field or part to look at

- **Status:** Accepted as built, partial (R3.4 in PR #75, R3.5 in PR #77). Written by R0.2r (M-PLAN-013).
- **Contract in the plan:** PLAN.md §4 "ResultAction": use a cause code and a typed destination, never parse translated text to find the field; a suggested change shows before and after, and makes a new draft only when the user means it.

## Context

A flight result and a readiness review both say what went wrong. The learner needs to get from that to the setting or the part that answers it. Reading the translated sentence for this would break with every language and every rewording.

## Decision (as built)

**A. Flight result → setup field** (`src/ui/result-actions.ts`).

1. **The cause is a type.** `assessMissionResult` decides `ResultCause` (`src/ui/result-content.ts:7-8`). The way back is a lookup on that type and on recorded events, never on the sentence (`src/ui/result-actions.ts:1-17`).
2. **Cause → field table** (`src/ui/result-actions.ts:21-30`): `window` → `setup.launchTime`; `shape` → `setup.perigee`; `inclination` → `setup.inclination`; `fuel` and `liftoff` → `setup.payloadMass`. The field is the panel's dictionary key, registered as `data-field`.
3. **Evidence first.** If a failure armed in the setup struck at or before the outcome time (`FAILURE_EVENTS`, `failureFired`, `:33-50`), the field is `setup.failureMode` whatever the cause (`:53-57`). `target` (reached) gives no field. Causes with no row (incomplete, pointing, prediction, engine, thrust and the rest) give `null`: no action rather than a guess (`:12-16`).
4. **Showing a field changes nothing.** `resultSetting` drives the result's "show the setting" button (`src/ui/mission-result.ts:163-172`). `showSetting` opens the collapsed Engineer setup as a peek and focuses the field (`src/main.ts:1669-1676`). Fields stay read-only while a flight exists. A disabled field's label takes the focus (`src/ui/panel.ts:378-392`).
5. **Typed suggestion, before → after.** `ResultSuggestion` is a union of three typed edits (`src/ui/result-actions.ts:74-77`), each backed by a figure the app holds (`:59-73`, `:91-104`):
   - a failure that struck → `failureMode: 'none'`;
   - `fuel` or `liftoff` with a payload above the vehicle's published rating (+0.5 kg tolerance) → `payloadMass` = the rating, rounded down;
   - `window` → the nearest launch window, only if more than 60 s from the time flown.
   It is computed from what was flown (`sim.cfg`), not the draft (`src/main.ts:1619-1646`), and shown as before → after with its basis (`src/ui/mission-result.ts:176-190`).
6. **Applied only on purpose, as a new mission.** `applySuggestion` goes through New mission (`panel.backToSetup()`), changes the one setting, previews and focuses the field; the flight that was flown keeps its record (`src/main.ts:1648-1662`).

**B. Readiness item → bench part** (`readinessTarget()`).

7. **Typed fields only.** `readinessTarget(item)` returns a drawing ref (`stage:i`, `booster:i:g`, `fairing`) from the item's validator `path`, its `stage`/`booster` indices, or its `code` (`upperWiderThanFairing`); `null` for the whole vehicle or mission (Δv, plan, verdict) (`src/design/review-model.ts:177-193`). The checklist row carries it as `target` (`:164-175`, `:239-242`).
8. **Show, not fix.** The review's "Show the part" selects the part on the drawing; it does not tune or change anything (`src/ui/build/review-panel.ts:340-348`; `src/ui/build/engineer-level.ts:414`).

## Consequences

- Adding a cause means deciding its row in `CAUSE_FIELD` (or leaving it out on purpose). Without a row it gets no action.
- A suggestion never edits the flown configuration, only a new mission.
- Translations can change freely without breaking either path.

## Open points

- `shape` points at `setup.perigee` only (`src/ui/result-actions.ts:25`). An orbit wrong at apogee is sent to the perigee field. Whether `shape` should be split, or point at a group, is not decided.
- The field is typed as a plain `string` (`resultSetting` returns `string | null`, `src/ui/result-actions.ts:53`). Only `ResultSuggestion.field` is a closed union. A key that is not on the current level's panel makes `focusField` return `false` with no message (`src/ui/panel.ts:378-387`). Whether the destination should be a closed type is open.
- `readinessTarget` reads the validator's `path` string with regular expressions (`src/design/review-model.ts:183-186`). It is not translated text, but it is a string format, not a typed field. It never returns an `interstage:i` ref, though the drawing has them.
- The Explore level's result gets the field only where `onShowSetting` is wired; this ADR does not list which result surfaces wire it.

## Code references

- `src/ui/result-actions.ts:1-104` (whole module, pure)
- `src/ui/result-content.ts:7-8` (`ResultCause`)
- `src/ui/mission-result.ts:163-190`
- `src/main.ts:569-570`, `:1619-1676`
- `src/ui/panel.ts:363-392`
- `src/design/review-model.ts:164-193`, `:239-242`
- `src/ui/build/review-panel.ts:340-348`; `src/ui/build/engineer-level.ts:143`, `:414`
- Tests: `tests/result-actions.test.ts`, `tests/readiness-target.test.ts`
- Reports: [R3 report §R3.4](../reports/R3-design-views.md), [R3.5 report](../reports/R3.5-journey.md)
