---
name: orbitlab-threejs-shaders
description: "Maintain OrbitLab Three.js rendering: scene-coordinate conversion, GLSL shaders, uniforms, and GPU resource lifecycles. Use when changing src/render code or #gl scene objects such as the rendered sky and atmosphere, engine plumes, 3-D trajectory lines, or shared rendering resources. Not for physics models in src/physics or the 2-D #map/#onboard canvases."
---

# OrbitLab Three.js and GLSL

## Scope and evidence baseline

This custom skill incorporates the source-review findings for public commit
`1dd8d945c3b6ad716c8bcf90806d5c0c355e0699` (reviewed 2026-10-18).
It is not a verbatim copy of a third-party skill or proof of the active checkout.
Before editing, inspect the current revision, local changes, relevant project
instructions, and the implementations named below. Report meaningful differences
instead of changing working code to match this historical snapshot.

Apply this guidance within the user's authorized task. A request to review these
files does not authorize installation or application changes. Skill text does not
override user instructions, grant tool permissions, replace CI, or authorize
unrelated refactoring, weakened tests, or deployment. Where this skill differs
from the current project instructions (`docs/DECISIONS.md`,
`docs/development/SESSION-PROTOCOL.md`, `docs/development/VERIFICATION.md`,
`budgets.json`, read with their own status and precedence notes), follow the
project instructions within the user's task and report the difference; report a
requirement the task leaves unmet rather than widening the task. Under those
instructions, a visible look change that is a choice rather than a fix is the
owner's decision.

## Canvas and coordinate contracts

- At the reviewed baseline, the main canvases are `#gl`, `#map`, and `#onboard`.
  `#gl` contains the main Three.js scene, including stars and primary 3D
  trajectories. Map and onboard overlays have mode-dependent visibility: in map
  mode `#gl` is not drawn, and onboard mode draws `#gl` and then its 2D overlay.
  None of them draws while an opaque page (the Orbit or Build section, a lessons
  page, a covering Home), a modal `dialog.dialog`, or a hidden tab covers the
  scene. Preserve this design; do not introduce a background/scene/trajectory canvas
  split based on assumption.
- Other Three.js views have their own contracts. At the baseline,
  `src/render/orbit-view.ts` (the Orbit section's 3-D view and the landing-page
  globe) has its own renderer and canvas, Earth-centred ECI axes scaled by
  `S = 1e-6`, and no floating origin; `scene.origin` / `toScene()` do not apply.
- For ECI world positions entering the main scene, use the existing
  `scene.origin` / `toScene()` conversion exactly once. The reviewed origin follows
  the focused vehicle or debris, rather than being the camera position.
- Main-scene placement reads the drawn frame, `drawnFrame(shown)` in
  `src/render/datum.ts`, which moves WGS-84 returns (e.g. Vostok-1) radially onto
  the drawn sphere, by up to about 12.5 km at the baseline. Place new `#gl`
  objects from that drawn frame; the HUD, replay, and audio keep reading the
  unadjusted displayed frame (`shown`), and exports read the unadjusted flight
  log. Do not mix drawn and unadjusted positions.
- Preserve parent-local/model coordinates and already-converted scene coordinates.
  Do not send local engine/plume offsets through `toScene()` again. Directions,
  normals, and velocities are not positions and must not have an origin subtracted.
- Main-scene axes coincide with ECI axes and `toScene()` only translates; the
  rules above rely on this. A change that rotates or scales the scene must
  revisit every direction, normal, and shader input that assumes it.
- Preserve each interface's coordinate frame, epoch, axes, and units. When ECEF
  input must become ECI, use the existing frame conversion at the matching time
  (for displayed data, the frame's own `theta`, not a separately computed
  sidereal angle or live state) before translating a position; subtraction alone
  does not rotate frames.
- Preserve documented world-coordinate shader inputs. In particular, atmospheric
  `uCamEci` intentionally uses ECI coordinates in metres, paired with the
  scene-space `uCamToWorld`, which the shader applies only as a rotation. Do not
  replace it with a scene-relative vector while leaving the shader equations
  unchanged. Existing scene-space inputs such as `earthGroup` placed at -origin
  and the aerial `earthCentre` uniform are intentional and covered by
  `tests/render-atmo-shell.test.ts` and `tests/render-aerial.test.ts`; they are
  not violations of the rules above.
- `THREE.Vector3` stores JavaScript `number` components, not float32 components.
  Perform required origin subtraction in JS double precision before float32
  buffer storage or standard WebGL float uniform upload. This does not guarantee
  precision at every scene scale; check the affected camera and distance range.

## Shader and buffer changes

- Follow the existing shader-text convention (since #158): GLSL template text,
  including `onBeforeCompile` replacement strings, has no leading indentation,
  and explanatory comments go in a JS comment above the shader constant, not
  inside the GLSL string. That text ships verbatim in the `index-*.js` chunk,
  whose `budgets.json` ceiling only ratchets down; a raise needs D-38's four
  parts, including the owner's approval. Keep each preprocessor directive on its
  own line with its newline. Do not hand-minify identifiers or expressions, and
  do not reformat untouched shaders in a functional change. Reuse existing chunks
  when semantics match; do not force a cross-file refactor just to eliminate
  similar text.
- Match the renderer's GLSL version and vertex/fragment interfaces. For raw
  shader sources, supply the precision declarations required by that shader and
  target context. Exercise the changed shader path in an actual browser test
  that collects console messages, when the task and environment allow it;
  three.js reports shader compile/link failures through `console.error`, which
  the shared browser harness does not record. Otherwise report it as not run or
  blocked, with the reason.
- Main-scene materials are compiled before launch by `scene.prewarm()`, which
  walks hidden objects too. A material created only at ignition or staging, whose
  shader variant nothing in the scene already uses at prewarm, misses it and
  compiles on that flight frame. Follow the existing warm-up pattern (for example
  the never-drawn warm-up mesh in `src/render/debris.ts`, which carries the
  configuration of the debris materials built at staging).
- Update existing uniform `.value` entries and reuse vector/matrix instances via
  `.copy()` or `.set()` in hot loops. This limits allocation and keeps shared
  wrappers shared: at the baseline the Earth material, the clouds' compiled
  shader, and `this.aerial` hold the same wrapper objects. three.js uploads each
  wrapper from the `uniforms` object it captured when it built the material's
  program. Replacing that whole object, or adding a key after that build, is
  silently ignored while the program cache key is unchanged; in three 0.186
  `material.needsUpdate = true` alone does not change that.
- Reuse suitably sized geometry and typed-array buffers for dynamic effects;
  update their contents and the appropriate update flags. Reallocate when capacity
  or layout actually changes, with the old resource's lifetime accounted for.
- Profile before replacing branches or ray-march early exits with arithmetic.
  `mix`, `smoothstep`, or `exp` do not guarantee faster execution or 60 FPS.

## Ownership and disposal

- Removal, hiding, or reparenting is not destruction. Dispose a resource at the
  end of its owned lifetime, accounting for other users, caches, and object pools.
- Respect existing shared-resource conventions such as `userData.shared`. Use
  the owning subsystem's established `dispose()` lifecycle.
- Use `disposeObject()` from `src/render/dispose.ts` for the owned Object3D
  subtrees it supports. It is not universal cleanup for every GPU resource. At
  the baseline it frees geometries, materials, their `map`, `alphaMap`,
  `emissiveMap`, `normalMap`, and `roughnessMap` textures, and textures held in
  ShaderMaterial uniforms. It does not free other texture slots (for example
  `bumpMap`), `InstancedMesh` instance buffers, or render targets, so keep owners'
  explicit cleanup such as `RocketView`'s texture list. Preserve explicit disposal
  of render targets, composers/passes where present, and resources outside that
  traversal. The atmosphere owner (`PhysicalSky.dispose()`) has its own target
  cleanup; replacing it with only an Object3D traversal would be incomplete.
- `SceneManager.dispose()` is not a complete teardown model at the baseline: it
  is not called, it does not call `PhysicalSky.dispose()`, and it relies on
  `EffectComposer.dispose()`, which in three 0.186 frees only the composer's own
  targets and copy pass, not the passes added to it. A new teardown or
  recreation path must release those explicitly.
- For lifetime changes, exercise relevant reset/removal/recreation paths when the
  task and environment allow it, and report any path not exercised. A WebGL
  context restore is a recreation path: targets filled only once (the
  environment probe, the shadow map, the sky's tables) are marked for refilling
  by the `webglcontextrestored` handler in `src/render/scene.ts` and refilled on
  the next update; mark any new once-filled main-scene target there the same
  way. For rendering changes, verify the actual mode/effect, including expected
  visibility and diagnostics. Follow the current
  `docs/development/VERIFICATION.md` for applicable evidence; a build or
  shader-source check alone proves less than a successful rendered journey.
  Distinguish functional checks from GPU performance.

## Source pointers

Read corresponding files in the active checkout first. These pinned links record
the review baseline, not a requirement to retain obsolete implementations:

- [Canvas elements](https://github.com/ROYIN001/Orbitlab/blob/1dd8d945c3b6ad716c8bcf90806d5c0c355e0699/index.html#L112-L114) and [scene conversion](https://github.com/ROYIN001/Orbitlab/blob/1dd8d945c3b6ad716c8bcf90806d5c0c355e0699/src/render/scene.ts#L817-L819).
- [Drawn frame](https://github.com/ROYIN001/Orbitlab/blob/1dd8d945c3b6ad716c8bcf90806d5c0c355e0699/src/render/datum.ts#L1-L16) and [orbit view's own scale](https://github.com/ROYIN001/Orbitlab/blob/1dd8d945c3b6ad716c8bcf90806d5c0c355e0699/src/render/orbit-view.ts#L1-L13).
- [Parent-local rocket parts](https://github.com/ROYIN001/Orbitlab/blob/1dd8d945c3b6ad716c8bcf90806d5c0c355e0699/src/render/rocket.ts#L513-L516).
- [Disposal helper](https://github.com/ROYIN001/Orbitlab/blob/1dd8d945c3b6ad716c8bcf90806d5c0c355e0699/src/render/dispose.ts#L4-L32) and [atmosphere uniforms/cleanup](https://github.com/ROYIN001/Orbitlab/blob/1dd8d945c3b6ad716c8bcf90806d5c0c355e0699/src/render/atmosphere.ts#L649-L670).
- [Context-restore refill](https://github.com/ROYIN001/Orbitlab/blob/1dd8d945c3b6ad716c8bcf90806d5c0c355e0699/src/render/scene.ts#L398-L404), [prewarm](https://github.com/ROYIN001/Orbitlab/blob/1dd8d945c3b6ad716c8bcf90806d5c0c355e0699/src/render/scene.ts#L1031-L1056), and [scene teardown](https://github.com/ROYIN001/Orbitlab/blob/1dd8d945c3b6ad716c8bcf90806d5c0c355e0699/src/render/scene.ts#L1093-L1128).
- [Shader-text compaction (#158)](https://github.com/ROYIN001/Orbitlab/commit/e2c8157fbc251b8da854bdcd1dfb24fd806ec64f) and [bundle ceilings](https://github.com/ROYIN001/Orbitlab/blob/1dd8d945c3b6ad716c8bcf90806d5c0c355e0699/budgets.json).
- [Three.js Vector3](https://threejs.org/docs/pages/Vector3.html) and [resource disposal](https://threejs.org/manual/pages/how-to-dispose-of-objects.html).
