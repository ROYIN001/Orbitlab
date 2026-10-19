---
name: orbitlab-interactive-lesson
description: "Plan, build, or improve interactive Orbitlab lesson implementations connecting equations, controls, simulation views, telemetry, and criterion-based feedback. Use for engineering plans and implementation of learning labs or lesson UI. For educational lesson or curriculum design, use orbitlab-lesson-design when available."
---

# Orbitlab Interactive Lesson

Implement a teachable experiment in the existing application, with observable learning outcomes and traceable physical quantities. A working control must change the model it claims to control; a successful animation alone does not demonstrate learning or numerical correctness.

## Establish the target and scope

- Locate the user-selected checkout and its applicable instructions. Inspect `package.json`, nearby lesson code and tests before choosing APIs. A parent folder can contain several Orbitlab copies; do not infer the active checkout from a folder name or modification date. If the target is ambiguous, inspect read-only while asking which copy to change.
- Use [source-map.md](references/source-map.md) as a dated navigation aid, then verify symbols locally. If source is unavailable, deliver an explicit prototype or integration plan only; never claim application integration.
- Read the requested lesson brief. If missing, create the small specification needed to implement the authorized request: audience, observable goal, model, interactions, criteria and transfer task. `orbitlab-lesson-design` can help when available; it is not a required dependency or an extra approval gate.
- Preserve user scope. Lesson implementation does not imply publishing, replacing the engine, modifying unrelated lessons, or running an expensive fleet suite. Conversely, do not stop after a plan when implementation is authorized.
- For an engineering-plan-only request, deliver verified integration points, proposed changes and checks to run; do not edit the application or report planned checks as completed.

## Choose the smallest useful implementation

Prefer existing TypeScript, DOM/SVG/Canvas, Three.js, lesson schema, orbit functions, session and telemetry interfaces. Reuse lessons and fixtures before inventing a parallel framework. Add a library only for a demonstrated gap; explain its actual use and maintenance cost.

Use 2D for coplanar orbit geometry and scalar relationships; use 3D when orientation, reference frames, plane changes or attitude are the learning target. An available `anatomy` or `visualize` skill may help prototype a figure, but a chat visualization is not an integrated Orbitlab component. Neither is required to execute this skill.

Use Manim for a requested rendered explanation, shaders for a relevant visual phenomenon, and workers/Wasm for measured computational bottlenecks. Do not introduce these as automatic prerequisites or promise 60 FPS from the choice of technology.

## Bind the experiment coherently

Define a small quantity map before wiring the view: symbol, physical meaning, internal unit, display unit, reference frame, data owner, valid range and time basis. Read [implementation-checks.md](references/implementation-checks.md) for the numerical and UI checks relevant to the change.

- Share one authoritative model/state for each experiment. Equation values, arrows, plots, readouts and grading must identify the same configuration and run. An ideal analytical overlay can coexist with a numerical simulation only when its assumptions and data source are labeled separately.
- Distinguish altitude from radius, degrees from radians, elapsed time from epoch, velocity from delta-v, vector components from magnitudes, and world coordinates from camera coordinates. Convert display units at the UI boundary.
- Keep educational labels readable in the user's language (Thai by default in this project context). Preserve the selected checkout's localization contract; do not add fake translations or bypass required language keys.
- Link equation terms to their corresponding labels, arrows or traces. Color is supplemental: provide text/symbol identification and equivalent focus, click/tap and keyboard behavior instead of hover-only meaning.
- Support reset, pause/step where pedagogically useful, and a way to compare predictions with observations. Preserve the learner's prediction until they deliberately revise it.
- Treat a parameter edit as a new configuration. Invalidate dependent results and evaluation immediately. Ignore stale or out-of-order worker completions using the existing revision/run mechanism or a narrowly added identity; do not guess that an old result belongs to the new input.
- Inspect both draft input and committed change events: a learner can edit before blur or before a replacement run exists. Suspend affected current-attempt evaluation during that interval and handle failed run creation. Preserve historical earned progress. Apply latest-result filtering to replaceable results, not blindly to incremental recording deltas whose predecessors may be required.
- Keep simulation time independent of rendering frame rate. Scrubbing replay updates observation, not flight acceptance: the inspected lesson system grades the live flight head, freezes the final grade, and then regrades only typed answers. Preserve that boundary. Label a past replay frame distinctly from the final-flight evaluation.
- Dispose subscriptions, workers owned by the component, listeners and animation loops when leaving the lesson. Do not terminate shared sessions owned elsewhere.

## Assess the learning action

Prefer the existing declarative criteria and evaluator. Do not add arbitrary executable strings, `eval`, or an LLM call to imported lesson documents for grading.

For each criterion, record its stable ID, expected evidence, source quantity, units, tolerance and rationale. Distinguish a calculation tolerance from a learning allowance. Avoid rounding before comparison. Test a boundary case when that boundary affects pass/fail.

Implement deterministic feedback from observed evidence using [diagnostic-feedback.md](references/diagnostic-feedback.md). Current support for a fixed sequence of hints must not be described as diagnostic adaptation. If new metadata is needed, extend validation, types, import/export, UI and tests together, while keeping old lesson files readable where compatibility is intended.

Missing input, a pending run, a stale result, a failed worker and an unsupported physical model are not student misconceptions. Keep them out of a conceptual failure verdict. Do not claim to know a misconception from one wrong number: describe the evidence and suggest a check.

Include a new-value or changed-context transfer task if the learning goal calls for independent understanding. A completion click or matching a worked answer is insufficient evidence for that goal. If explanation quality needs human review, label it as self-assessed/reviewer-assessed; do not claim automatic understanding detection.

## Verify and hand off

Select checks proportional to the code changed, not a mandatory full-project ritual:

1. Inspect actual scripts and runtime requirements in the selected checkout. Run relevant type checks, focused tests and build checks when warranted by an implementation change. Do not invent a `test:browser` script or restart already completed bounded test shards.
2. Compare quantitative outputs with an independently derived analytical case, dimensional invariant or trusted reference. A test that calls the same function to generate both expected and actual values is not independent verification.
3. Exercise changed UI behavior when a browser is available: valid and invalid inputs, reset, hint selection, stale-result prevention, keyboard/touch operation, layout and replay if affected. Save the observed evidence. If unavailable, explicitly leave browser verification unperformed.
4. Measure performance only if the task or changed hot path warrants it. Record workload, device/browser, sample window and metric; separate solver cost, transport and rendering. Do not equate a passing build with usability or performance.

Use [implementation-report-template.md](assets/implementation-report-template.md) for substantial handoffs; shorten for a small fix. Report what changed, checks actually run with results, unverified areas and next concrete action. Separate local source/test/browser evidence from deployment and learner-validation evidence. Do not mark work Claude-reviewed unless that review actually occurred.

For an ideal coplanar circular-to-circular Hohmann case, [hohmann_reference.py](scripts/hohmann_reference.py) is a standard-library reference calculation using endpoint vis-viva speeds. Pass radii in meters and the matching gravitational parameter. Its JSON declares assumptions and signed impulses; it does not validate the application, surface clearance, finite burns or rendezvous. Equal radii are reported as no maneuver with zero elapsed transfer time; do not silently compare that convention with an API returning a half-orbit period.
