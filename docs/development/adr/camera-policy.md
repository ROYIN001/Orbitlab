# ADR-CameraPolicy: who directs the Launch and Watch camera

- **Status:** Accepted as built (R2.2, PR #74). Written by R0.2r (M-PLAN-013).
- **Contract in the plan:** PLAN.md §4 "CameraPolicy" (selected view, follow target and direction owner are separate values; a manual choice is not taken back by a new phase until the user picks cinematic).

## Context

Before R2.2, the view on screen, the follow target and the owner of the choice were one thing. Every new flight phase re-applied the camera programme, so a view the user picked lasted only until the next staging. The Watch viewer had no view buttons (`src/render/camera-policy.ts:1-24`).

## Decision (as built)

1. **Owner is its own value.** `CameraOwner = 'cinematic' | 'manual'` (`src/render/camera-policy.ts:27`), held by one `CameraPolicy` (`:35-88`). It is pure state: no DOM, no Three.js. The app has one instance for both the workspace and Watch (`src/main.ts:399`).
2. **Cinematic is the default.** `owner` starts as `'cinematic'` (`src/render/camera-policy.ts:36`).
3. **A user choice makes it manual.** `choose(view)` sets `manual` and returns the view (`:48-51`). Every user path goes through `App.setCamera()` (`src/main.ts:1492-1495`): the view tabs (`:1291-1293`), keys 1-4 (`:1387-1390`) and WebMCP `set_camera` (`src/mcp.ts:995`).
4. **Phase changes respect the owner.** `onPhase(planned)` returns the programme's view while cinematic and `null` (no change) while manual (`src/render/camera-policy.ts:69-71`). The caller is `followCameraPlan()` (`src/main.ts:2339-2351`). The programme is the workspace's per-phase `cameraPlan`, or `WATCH_CAMERA_PLAN` in Watch and Home (`src/main.ts:199`, `:2349`).
5. **Back to the programme only on request.** The Cinematic button (`#btn-cinematic`, `index.html:132`; handler `src/main.ts:1294`) calls `resume(planned, current)`, which sets `cinematic` and returns the programme's view for this instant, or the current view when there is no phase to go by (`src/render/camera-policy.ts:58-61`; `src/main.ts:1498-1501`). The camera-sequence dialog's switch is the same state (`setCinematic`, `src/render/camera-policy.ts:64-66`; `src/main.ts:736-737`).
6. **Follow target is decided elsewhere.** `watchFocusTarget()` picks it (`src/main.ts:2312`). The policy only answers which view to show when the target changes (`onTarget`, `src/render/camera-policy.ts:83-87`): cinematic shows `exterior` for another object and the programme's view for the vehicle; manual keeps the chosen view unless it cannot show the target (`onboard`, `map`), and then falls back to `exterior` while the owner **stays manual** (`SHOWS_OTHER`, `:33`). Caller: `steerWatchFocus()` (`src/main.ts:2288-2297`).
7. **Watch view tabs.** The tabs (`exterior`, `onboard`, `space`, `map`) and Cinematic share one group, `#camera-tabs` (`index.html:126-133`). Since R2.2 they are shown in Watch too. `updateCameraOwner()` writes `aria-pressed` on the Cinematic button and `data-owner` on the tab group (`src/main.ts:1514-1521`).
8. **Reset.** A new launch in the viewer (Watch or Home, `lean`, `src/main.ts:843-845`) resets to cinematic (`src/main.ts:1866`). The workspace keeps the owner across previews (comment at `src/main.ts:1864-1865`).

## Consequences

- A view the user picks lasts across staging, insertion and the rest of the flight.
- Following a stage flown home can change the view without the user's say, but only to `exterior` and only when the chosen view cannot show it. The owner is not handed back.
- The rules are unit-tested without a browser (`tests/camera-policy.test.ts`).

## Open points

- `src/render/camera-policy.ts:12-14` says cinematic is "what a new mission starts with", and `reset()` is documented as "A new mission" (`:42`). In the workspace, a new mission (New mission, a template) does not call `reset()`; only a viewer launch does (`src/main.ts:1866`). Which one is meant for a workspace New mission is not settled.
- One `CameraPolicy` instance serves both the workspace and Watch. Whether a manual choice made in Watch should carry into the workspace (it does until something resets it) is not recorded.
- The dialog's `onChange` applies a phase's new view at once only while cinematic (`src/main.ts:742`). Editing the programme while manual has no visible effect until Cinematic is chosen. This is as built; it is not discussed elsewhere.

## Code references

- `src/render/camera-policy.ts:1-88` (whole module, pure)
- `src/main.ts:199`, `:399`, `:736-742`, `:843-845`, `:1291-1294`, `:1387-1390`, `:1492-1521`, `:1864-1866`, `:2288-2297`, `:2312`, `:2339-2351`
- `src/mcp.ts:995` (`set_camera`)
- `index.html:126-133` (`#camera-tabs`, `#btn-cinematic`)
- Tests: `tests/camera-policy.test.ts`
- Report: [R2 report §R2.2](../reports/R2-workspace.md)
