# Implementation checks by changed behavior

Read only sections relevant to the implementation. These are selection criteria, not a requirement to run every suite or introduce every UI feature.

## Physical model and quantity ownership

For each shown quantity, identify the authoritative calculation and units. Reuse checked constants from the selected source tree. Record which model generated it: ideal two-body impulses, point-mass flight, rigid-body dynamics, or a clearly labeled illustration. A lesson can simplify physics intentionally; describe the simplification where it changes interpretation.

Use one model for the interactive experiment. If the teaching goal explicitly compares models, name both, show their assumptions, and explain differences instead of forcing agreement. Do not feed a display-only animation into a physical acceptance criterion. Do not treat a visually drawn gravity well as a measured potential surface without a mapping and legend.

For orbital lessons, check radius versus altitude and the central body's gravitational parameter. For attitude lessons, inspect the project's quaternion component order, multiplication convention, rotation direction and coordinate frames; do not assume conventions. For control lessons, inspect controller sampling versus integration step and actuator limits. Read frame definitions from source rather than inferring them from a camera view.

## Numerical evidence

Choose one or more checks that can expose the actual error class:

| Change | Useful independent check |
| --- | --- |
| Circular orbit calculation | Derive speed and period from radius and gravitational parameter with separately written reference calculations |
| Hohmann transfer | Compute endpoint transfer speeds by vis-viva and the half-period; compare against the application API with matching assumptions |
| Coast propagation | Inspect energy/angular-momentum drift over a stated interval when the selected physical model should conserve them |
| Integration or event logic | Compare sensible step sizes and event timing without widening acceptance tolerances to hide errors |
| Rotation visualization | Check basis vectors, identity and known axis rotations, with the project's frame and handedness conventions |
| Unit/display change | Compare a known SI value against displayed values and entered values in each supported unit |

Do not apply conservation tests to powered, drag-affected or otherwise nonconservative segments without accounting for the physical work/torque. Do not generalize one passing case to engine acceptance.

Explicitly distinguish numerical comparison tolerances, input resolution, lesson answer allowances and physical mission acceptance tolerances. A legacy answer tolerance of 5% is not a universal default. Handle expected zero with an absolute tolerance; avoid division by zero in relative error. Reject nonfinite values before comparing.

## State and timing

Trace the causal path: learner input -> validated configuration -> model run -> result identity -> view sample -> evaluation. Use the existing revision/session identity if available. A new layer is justified only when it closes a demonstrated gap.

Meaningful scenarios include changing a slider while a job is pending, receiving A after B, switching lessons, cancelling a run, resetting answers, and replaying an older run. The latest relevant result must win; stale evidence must never award a current pass. Recompute/invalidate only dependent data where the existing architecture permits it.

Separate render interpolation from integration and grading. Telemetry decimation may reduce display points; pass/fail must use the quantity and sampling semantics the criterion specifies, not a decimated visual approximation.

## Equations and accessible controls

Bind a visible symbol to a named physical quantity, not a text position that will change after translation. Keep label, unit and numerical value available without hovering. Keyboard focus and tapping should expose the same explanation; retain a dismiss/reset action and visible focus. Use native form controls where they meet the need.

For motion, allow a paused/static way to inspect the concept and respect reduced-motion preferences when animation is optional. Ensure zoomed text and a narrow viewport keep instructions, controls and feedback usable. A readable alternative can be a table or text readout alongside a complex canvas; it need not duplicate every decorative graphic.

Suggested inspection cases are a narrow phone-sized viewport and a desktop viewport, keyboard-only operation and a touch interaction. Record the actual sizes/devices checked instead of claiming universal accessibility from those samples.

## Testing commands

Inspect `package.json`, test configuration and installed tools first. The 2026-10-19 inspected source exposed `typecheck`, `build`, `test`, `test:heavy` and `test:sixdof-fleet`; this is a snapshot, not a stable command contract. Run tests by relevant filenames with the current runner's supported syntax. Preserve the user's worker cap and selected shard boundaries.

For a documentation-only skill or lesson-specification change, do not run the simulation fleet merely to create a test badge. Review traceability, examples, links and any executable helpers instead. For implementation, choose focused schema/evaluator tests, numerical tests and UI/browser checks according to the touched behavior; broaden when a failure or architecture change justifies it.
