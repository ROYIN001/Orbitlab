# Diagnostic feedback contract

This is an implementation design pattern, not a claim that Orbitlab already supports the fields or states described here. Inspect the current evaluator, validation and UI before choosing a representation.

## Evidence before explanation

Give each criterion a stable ID. Link a feedback rule to the failed criterion and the evidence it can actually inspect. Prefer deterministic rules over a remote model for numerical grading. A fixed ladder of hints is useful, but it is only diagnostic when rule selection depends on evidence.

Keep these outcomes distinct, adapting names to existing runtime types:

| Meaning | Learner-facing behavior |
| --- | --- |
| Not attempted | Invite a prediction or answer; no failure claim |
| Invalid input | State the required format/range/unit; preserve editable input |
| Awaiting evidence | Explain that the run is pending or a current run is needed |
| Unavailable evidence | State simulation/worker failure or unsupported model; permit retry or an appropriate model |
| Criterion not met | Show the failed criterion and a bounded next experiment |
| Criterion met | Show supporting evidence and the next learning action |

A valid state from an older configuration is still unavailable as evidence for the new configuration. Do not persist a pass for the new attempt just because the old attempt passed.

Inspect current null-evidence handling: some existing grader paths map missing evidence to a failed criterion. Introducing an unavailable state can require coordinated type, aggregation, UI, persistence and other consumer changes. Unavailable must not count toward an all-pass result. A genuine simulated vehicle failure with valid evidence is different from a worker failure; it can legitimately fail an outcome/event criterion.

## Rule anatomy

For each rule document: `rule ID`, `criterion ID`, observable predicate, applicability (model/run/units), precedence when several rules match, learner wording, proposed next action, and evidence that clears the hint. These are specification labels, not prescribed JSON keys.

Use a short progressive ladder when useful:

1. Cue the concept or observable difference.
2. Suggest one measurement or comparison.
3. Show a partial calculation or worked step, leaving the learner an action.

Do not disclose a full solution immediately unless requested or pedagogically appropriate. Keep help available without penalty unless the lesson explicitly needs a recorded independent attempt.

## Examples requiring contextual judgment

- A value near 1,000 times the expected result can suggest a unit check, but does not prove a km/m misconception. Say what was observed and invite checking units.
- In a Hohmann lesson, a correct first impulse does not imply circularization; inspect the second impulse or the final orbit evidence specified by the task.
- A controller overshoot alone does not prove that one gain is too high. Compare the actual gains, saturation and response before offering a narrow experiment.
- If several criteria fail, prioritize missing prerequisites or earlier causal conditions, then provide a stable ordering. Do not randomly change advice between identical attempts.

## Compatibility and tests

If the implementation adds criterion-linked hints to a lesson document, trace changes through parsing/sanitization, version policy, import/export, evaluator-to-view mapping and old lesson fallback. Do not silently ignore new keys while claiming the feature works. Keep persistence limited to the state the product actually needs; adding external student analytics is outside this workflow by default.

Test behavior with: no answer, invalid answer, a valid but wrong answer, a passing answer, missing model evidence, and stale evidence where relevant. Test two distinct failed criteria and a multiple-match case when rules can overlap. These tests should exercise outcomes, not assert that a particular heading or sentence exists.
