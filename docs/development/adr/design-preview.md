# ADR-DesignPreview: the drawing reads the design the numbers read

- **Status:** Accepted as built, partial (R3.2-R3.3, PRs #75, #78, #80). Written by R0.2r (M-PLAN-013).
- **Contract in the plan:** PLAN.md §4 "DesignPreview": the picture and the numbers read the same design snapshot; geometry the design does not give is a stated assumption; an invalid draft shows the problem, and a last-valid picture must be marked stale.

## Context

R3 put a drawing of the design on the Build benches: the rocket on the Engineer bench (R3.2) and the satellite on the satellite bench (R3.3), with subsystem diagrams. A drawing that disagreed with the figures beside it, or that showed an old design as if it were the current one, would mislead the learner.

## Decision (as built)

1. **One source per bench.**
   - Satellite: `satelliteDrawing(d)` reads the same `SatelliteDesign` object the figures are worked out from (`src/design/satellite-drawing.ts:1-5`, `:73`). The bench calls it on the workspace's current design for the preview and the SVG (`src/ui/build/satellite-bench.ts:244-245`, `:309-311`).
   - Subsystem diagrams (eclipse, link, footprint) are view models of the figures (`designFigures`) and have no physics of their own (`src/design/satellite-diagrams.ts:2-5`).
   - Rocket: the Engineer bench draws `this.bench.spec`, the same `VehicleSpec` the stand, the tunnel and the review use, not the catalogue entry it started from (`src/ui/build/engineer-level.ts:385-394`; `src/design/bench-part.ts:1-12`). Part facts come from that spec (`benchPart`, `src/design/bench-part.ts:37-38`). A part pick that no longer exists on a changed bench is cleared (`src/ui/build/engineer-level.ts:274`).
2. **Assumptions are named.** What the design does not give is a `DrawingAssumption`, never presented as the factory drawing: wings, body cells, spinner, dish, camera and engine faces, stowed panels, and the warning `bodyCellsExceed` (`src/design/satellite-drawing.ts:6-14`, `:24-32`). The bench lists them under the picture (`src/ui/build/satellite-bench.ts:280-281`). Nothing is drawn that the design says is absent (`src/design/satellite-drawing.ts:12-14`). On the rocket, interstages are D01's derived, massless display parts (`src/design/exploded.ts:12`, `:77`).
3. **An invalid draft is not drawn.** `satelliteDrawing` returns `{ ok: false, invalid: [field paths] }` when a size, area, diameter, aperture or thrust is not a usable number (`src/design/satellite-drawing.ts:64-67`, `:73-83`). The preview then shows "The drawing waits for usable figures" as a `role="status"` message and removes the picture (`src/ui/build/satellite-bench.ts:249-255`). The SVG is not redrawn (`:311-313`). As built, the satellite bench **never shows a last-valid picture**, so no stale picture state is needed.
4. **Stale figures are marked.** Figures are worked out `SETTLE_MS` = 180 ms after the last change (`src/ui/build/satellite-workspace.ts:15-18`, `:40`). Until then, or while the checker refuses the design, the last figures stay and `worked()` reports `stale` (`:236-239`, `:251-266`). The bench and the level mark the results stale (`src/ui/build/satellite-bench.ts:435-440`; `src/ui/build/satellite-level.ts:267-271`, `:340`).

## Consequences

- The satellite picture is always the design on screen, or nothing. The figures beside it can lag for up to `SETTLE_MS`, and are marked stale while they do.
- Every new geometry the design does not give needs a named assumption and a dictionary entry.

## Open points

- For up to 180 ms the drawing (current design) and the figures (last design) differ. The figures are marked stale, so the contract holds on the screen, but the checks read the new design against the old figures (M-BUILD-015, R3.4r, K3).
- The rocket bench has no invalid-draft path in `renderDrawing` (`src/ui/build/engineer-level.ts:385-394`). It draws whatever `VehicleSpec` the bench holds. Whether a bench can hold an invalid spec, and what the drawing should then say, is not recorded.
- The Explore satellite designer has no drawing (M-LAUNCH-081).
- The plan asks for a last-valid picture marked stale. The satellite bench chose to show none. Whether that is the final form or an interim one is not stated.
- The drawings are schematic and await user review ([R3 report](../reports/R3-design-views.md), limits section).

## Code references

- `src/design/satellite-drawing.ts:1-32`, `:64-83`, `:125`
- `src/design/satellite-diagrams.ts:2-5`
- `src/design/bench-part.ts:1-12`, `:37-38`; `src/design/exploded.ts:12`, `:77`, `:227`
- `src/ui/build/satellite-bench.ts:244-255`, `:280-281`, `:309-318`, `:435-440`
- `src/ui/build/satellite-workspace.ts:15-18`, `:40`, `:236-266`; `src/ui/build/satellite-level.ts:267-271`, `:340`
- `src/ui/build/engineer-level.ts:274`, `:385-394`
- Tests: `tests/satellite-drawing.test.ts`, `tests/satellite-diagrams.test.ts`, `tests/bench-part.test.ts`
- Report: [R3 report](../reports/R3-design-views.md) §R3.2, §R3.3 and "R3.3 ต่อ"
