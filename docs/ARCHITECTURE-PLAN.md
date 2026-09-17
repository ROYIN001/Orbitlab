# Orbitlab improvement plan (branch `fable-improvements`, started 2026-09-16)

Decisions (owner: ROYIN001): this TypeScript/Vite codebase is the main version. The sibling
"Codex version" (buildless, planar physics) is a reference for its visual design language,
phase narration, replay timeline, camera sequence, WebMCP tools and its Vega-C / Long March 2D /
H-IIA data. Playback becomes a recorded, scrubbable flight. Work is committed locally on this
branch; the owner pushes.

## Architecture contract

`src/physics/frame.ts` defines `VisualFrame` and `captureFrame(sim)`. Everything that draws
(3D scene, HUD, map, onboard overlay) consumes frames, never the live `Simulation` object.
The live run captures a frame after every step; the recorder stores frames; seeking produces
an interpolated frame. This is what makes replay possible without a second code path.

Rules for all contributors:

- Physics code (`src/physics`) must stay free of DOM and Three.js imports and free of
  unseeded `Math.random` so that runs are deterministic and replayable.
- Rendering code (`src/render`) takes frames and specs only. `RocketView.update(frame, dt)`,
  `DebrisView.update(frame.debris)`, `LaunchPadView(site, vehicleSpec)`.
- Every vehicle in `src/data/vehicles.ts` must reach its reference orbits with the default
  guidance parameters (no auto-tune) at 25 %, 50 % and 90 % of its rated payload;
  `tests/fleet-defaults.test.ts` enforces this. Exclusions must be measured capability
  limits (out of propellant with the structural placard armed), never a vehicle destroyed
  with delta-v left. Single-shot stacks with no restart (Soyuz-2.1a, Long March 2D) are
  additionally pinned by a dedicated mission test flying their real profile.
- User-visible strings go through `src/i18n` in all three languages.

## Waves

1. Parallel: guidance robustness (physics), graphics pass (render), then fleet data additions.
2. Recorder + scrubbable timeline + event bar (main loop refactor), then the design port
   (Codex look, phase narration, mission clock, camera sequence).
3. Physics dialog, WebMCP tools, translations, docs, final adversarial review, screenshots.

File ownership per wave is listed in the workflow prompts; `src/main.ts` is only edited by one
agent per wave.
