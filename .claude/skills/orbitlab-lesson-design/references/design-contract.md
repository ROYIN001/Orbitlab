# Orbitlab lesson brief contract

This is a reusable **document format** for a lesson author, implementer, and reviewer. Its field names are not existing Orbitlab types, APIs, telemetry keys, or a file that the application can load. Keep stable IDs across revisions; map them to verified software separately. A concise lesson may combine sections if all applicable information remains clear.

## 1. Identity and audience

- `lesson_id`, title, version/date, language, intended duration, and scope.
- Audience level, prior knowledge, prerequisite check, likely misconceptions, and the assumption used when learner evidence is absent.
- Objectives with stable IDs such as `OBJ-01`: action, conditions, expected evidence, and the depth expected at this level.
- Explicit separation of conceptual understanding, calculation, and simulator operation.
- Requested deliverable and current status: proposed design, implemented, source-reviewed, runtime-checked, or learner-evaluated. Use only statuses supported by evidence.

## 2. Physical model and quantities

List assumptions, applicable regime, exclusions, and source citations. Explain which conclusions depend on each important simplification.

| Quantity/symbol | Meaning | Internal unit | Display unit/conversion | Frame/origin | Bounds or applicability | Visual encoding | Source/status |
|---|---|---|---|---|---|---|---|
| Fill with actual quantity | Include signed/magnitude distinction | Verify implementation | Make conversion explicit | State where needed | Physical and UI limits may differ | Label plus non-color cue | Analytic, source-verified, runtime-observed, or proposed |

For equations, include definitions, dimensional sanity checks, and at least one limiting case where useful. Identify model, numerical, display-rounding, and measurement errors separately. Record the reason for each assessment tolerance, with unit and absolute/relative interpretation; specify handling near zero if using relative error.

## 3. Activity flow

For each activity, give an `ACT-xx` ID and linked objective IDs:

- Prompt and expected reasoning; a misconception it can distinguish.
- Initial conditions and what the learner predicts before the answer is exposed.
- Controls allowed to change and variables held constant; bounds, steps, units, and reset conditions.
- Required observation or graph, when to read it, and how to compare cases fairly.
- Explanation prompt and feedback; what remains hidden until requested or completed.
- Approximate duration and optional support/extension for the chosen learner level.

The order need not be rigid, but the learner must have an opportunity to reason before an explanatory answer removes that opportunity.

## 4. Interaction, result freshness, and plots

Describe the relevant state transitions in prose or a small table. The implementation may use different names.

| Situation | Required learner-facing behavior | Assessment behavior |
|---|---|---|
| Ready with valid inputs | Show initial state and allowed actions | No run-dependent grade yet |
| Running/pending | Indicate progress; permit supported pause/cancel actions | Wait for the defined evidence boundary |
| Completed/current | Identify the scenario/settings represented | Evaluate only criteria with complete valid evidence |
| Assessed setting changed | Mark result stale or clear it; explain rerun need | Invalidate/supersede affected criteria |
| Invalid input or numerical failure | Explain a recoverable problem and reset path | Do not label as a physics misconception |
| Cancelled or incomplete | Show that evidence is partial | Do not assign a completion-dependent grade |
| Outside model applicability | State which assumption fails | Do not judge the learner using an inapplicable model |

Specify how a result is tied to its scenario, input configuration, and run. Use real implementation mechanisms once inspected; do not invent a required new API. Presentation-only changes need not invalidate physical evidence unless they alter the assessment context.

For each plot: objective, x/y quantities and units, frame if relevant, time basis, sampling/aggregation, scale, legend, comparison baseline, and text equivalent. Specify whether axes are fixed or automatic and how that affects comparisons. Keep analytic reference curves visibly distinct from simulated samples. State which information a 2D/3D view communicates beyond the plot.

Separate observation time (including a replay cursor) from the state used to evaluate criteria. Verify whether the actual runtime uses the live head, a frozen final state, or another documented boundary. Viewing an earlier state must not silently regrade a completed task. Likewise, distinguish the physics engine's units from lesson metric units and displayed units; do not assume they are identical.

## 5. Criteria, evidence, and hints

| Criterion ID | Objective | Observable/evidence | Verified source or proposed capture | Evaluation timing | Rule/tolerance/rubric | Missing/stale behavior |
|---|---|---|---|---|---|---|
| `CRIT-01` | `OBJ-01` | Include reasoning when needed | Actual symbol/path or unresolved mapping | Completed/current result or explanation submitted | Include unit and justification | Pending/inconclusive, not false diagnosis |

For each diagnostic branch, record:

- `HINT-xx`, linked criterion(s), learner error hypothesis, and the evidence needed to distinguish it from alternatives.
- Preconditions: valid input, model applicability, correct scenario, complete/current evidence.
- Hint sequence: attention cue, relevant relationship, next experiment, and optional worked example.
- A conservative fallback for ambiguous evidence or multiple simultaneous failures.
- Whether the current application supports this branch. A sequential text hint list is not adaptive diagnosis.
- Any recording/storage proposal, with the minimum data actually needed; do not silently add accounts or learner tracking.

## 6. Transfer task and assessment rubric

Use a new parameter set, context, or constraint that preserves the target principle. State how it differs from the practice task, what supports remain, and why the change is meaningful. Keep the transfer answer separate from the learner prompt.

Use explicit rubric anchors, for example:

- **Demonstrated:** correct conclusion and model-based explanation supported by the requested evidence.
- **Developing:** partly correct prediction or method, but a stated missing link or inconsistent explanation remains.
- **Needs support:** response reveals the specified misconception or lacks required reasoning.
- **Not assessable:** evidence is missing, stale, invalid, or inaccessible; this is not a learning score.

Adapt anchors to the objective. A numerical pass can coexist with an explanation that needs support. State who or what assesses free text and do not imply the current runtime can grade it automatically.

## 7. Acceptance checks and source map

Each acceptance check identifies the layer, concrete action/input, expected evidence, and result status. Relevant layers include model calculation, lesson logic, integration, accessible UI, and learning evaluation. Keep `planned`, `passed`, `failed`, and `not run` distinct.

| Claim or integration point | Evidence source | What was actually checked | Remaining uncertainty |
|---|---|---|---|
| Existing capability or equation | Actual repository path/symbol/revision or authoritative citation | Source reading, numerical example, UI observation, etc. | Limit the claim to the evidence |

Include at least one ordinary path and relevant failure/recovery paths. For interactive assessment, cover stale results and a changed scenario; for units, cover a value that would expose a conversion error. Prefer targeted tests over unrelated full regression for a design-only deliverable.

## 8. Reviewer rubric

Use **ready**, **revise**, or **unverified** with a reason and affected IDs. Do not collapse these into an unsupported numerical quality score.

| Dimension | Ready means |
|---|---|
| Alignment | Every objective has a purposeful activity and adequate assessment evidence |
| Physics | Definitions, units, frames, assumptions, and tolerances are explicit and defensible |
| Reasoning | Prediction and explanation expose a mental model; transfer tests it in a new case |
| Diagnosis | Hints use discriminating evidence and separate technical problems from misconceptions |
| Interaction | Controls and visuals serve learning; result freshness and reset behavior are clear |
| Accessibility | Essential content and actions are usable beyond color, hover, pointer precision, and motion |
| Feasibility | Existing capabilities are verified; proposed extensions and unresolved mappings are marked |
| Claims | Design quality, runtime checks, and actual learner outcomes are reported separately |
