# Learning patterns for Orbitlab

Choose a pattern because it addresses the objective or a learner difficulty. These are design options, not a requirement to use every pattern in every lesson.

## Match the depth to the learner

| Learner | Useful starting task | Reveal progressively | Evidence worth collecting |
|---|---|---|---|
| Beginner | Predict increase/decrease, compare two cases, identify a direction | Plain-language relationship → labeled diagram → optional equation | Prediction plus a short causal explanation |
| Intermediate | Calculate or estimate, vary one parameter, reconcile a graph with a formula | Units and terms → calculation → parameter sensitivity | Method, units, numerical result, and explanation of discrepancy |
| Advanced | Test a limiting case, compare models, optimize under constraints | Assumptions → error sources → competing explanations | Justified model choice, sensitivity/error reasoning, defensible tradeoff |

Do not equate age with proficiency. A brief prerequisite question is better than assuming a level from the topic name. Let a learner reveal more mathematics without making a beginner complete an irrelevant derivation.

## Predict, observe, explain, transfer

**Prediction:** ask for a direction or approximate magnitude and a reason. A confidence choice can help reflection but is optional and does not require persistence or a user profile.

**Observation:** make the comparison controlled enough to interpret. When several variables change together, explicitly ask for multivariable reasoning or supply a comparison that isolates the relationship.

**Explanation:** ask which observation supports the conclusion and which model relationship accounts for it. Prompt revision of the original prediction without treating revision as failure.

**Transfer:** change the task enough to prevent copying a stored answer while preserving the underlying concept. A second arbitrary number is weak transfer if the interface reveals the result before reasoning; a new constraint or a qualitative explanation can be stronger.

## Use representations deliberately

- **2D orbital plane:** useful for apsides, tangential burns, and geometric comparisons within the same plane.
- **3D scene:** useful when inclination, plane change, attitude, or a reference-frame relationship is the objective. Provide orientation cues and a reset view.
- **Time plot:** useful for causal order, transients, and the timing of an action. Label event markers and the time origin.
- **State/parameter plot:** useful for relationships that a time animation obscures. Explain what moves along the curve.
- **Equation:** useful when terms are physically interpretable and linked to manipulable quantities. A decorative formula adds little.

Synchronize scene, cursor, and graph only when the learner must relate them. Specify a text summary of the important relation; 3D motion alone is not an accessible explanation.

## Diagnose conservatively

A wrong outcome can result from a misconception, an incorrect control action, a unit mismatch, an unfinished run, a stale result, or model limitations. Check those possibilities before writing targeted feedback.

Use a diagnosis table:

| Error hypothesis | Discriminating evidence | Alternative explanation to rule out | Helpful next prompt |
|---|---|---|---|
| Learner confuses radius with altitude | Their written interpretation or entered conversion, not merely a wrong orbit | UI conversion bug or ambiguous label | Ask what point the displayed distance is measured from |
| Learner predicts the wrong qualitative effect | Prediction captured before the result and a valid controlled observation | Several parameters changed together | Ask which observation conflicts with the prediction and hold other variables fixed |
| Learner reaches a target without understanding why | Numerical pass with an unsupported or contradictory explanation | Missing opportunity to explain | Ask for a new-case prediction before running it |

These are candidate patterns, not prevalidated Orbitlab diagnoses or telemetry fields. If the evidence cannot distinguish two causes, give a neutral observation cue or ask another question.

## Construct a useful hint ladder

1. **Attention:** direct attention to the relevant quantity or event without stating the answer.
2. **Relationship:** connect the observation to a physical relationship or assumption.
3. **Experiment:** suggest a specific comparison that distinguishes the competing explanations.
4. **Worked example:** show a reasoned example when requested or when the lesson design calls for it, followed by a different transfer task.

A fixed ladder can still teach well. Adaptive selection is useful only if the evidence and runtime support it; otherwise provide a proposed extension or a teacher-selected variant. Avoid feedback that announces a misconception with unwarranted certainty.

## Thai learning UX

Use one stable Thai term for each concept and introduce an English equivalent in parentheses where it aids further reading. Keep equations in conventional symbols and provide a Thai verbal interpretation. Check that labels remain readable at mobile widths and that units stay attached to values.

Prefer an action and its purpose, such as “ปรับค่า… แล้วสังเกต… เพื่อเปรียบเทียบ…”. Do not overload a screen with the full derivation, all hints, and the answer at once. Make important instructions available without hover, color recognition, or memorizing an animation.

## Evaluate learning claims

A well-aligned brief is a reviewed design. A working activity is runtime evidence. A correct answer is evidence for that task. Improved understanding or retention requires learner evidence that matches the claim, such as pre/post explanations and a new-case assessment. Record the sample, conditions, and limits before claiming an educational improvement.
