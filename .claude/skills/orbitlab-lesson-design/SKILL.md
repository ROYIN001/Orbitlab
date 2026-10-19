---
name: orbitlab-lesson-design
description: "Design or review Orbitlab physics and spaceflight lessons with measurable learning goals, guided simulation experiments, diagnostic hints, and transfer assessments. Use for lesson plans and learning specifications; implementation is handled by orbitlab-interactive-lesson when requested."
---

# Orbitlab Lesson Design

Turn a physics idea into a teachable experiment and an implementable lesson brief.
Design for understanding that transfers to a new case, not merely completion of a simulator task.

## Scope and output

- Follow the user's requested topic, language, learner level, and deliverable location.
- Default learner-facing prose to clear Thai when the request is in Thai; retain standard symbols and add English technical terms only when useful.
- Produce a lesson specification. Label proposed features, mathematical predictions, observed software behavior, and learning evidence separately.
- A design request does not authorize implementation or deployment. When implementation is already requested, continue into that work without inserting another approval gate.
- Use the paired `orbitlab-interactive-lesson` skill for requested implementation if available; the brief must remain usable without that skill or a particular tool.
- Adapt [assets/lesson-brief-template.md](assets/lesson-brief-template.md) for a full brief. For a narrow revision, change only the relevant sections and record the effects on assessment.

## Establish the teaching and software context

1. Identify the learner's starting knowledge and the one central concept the lesson should change.
2. Use stated learner data; otherwise record a reasonable assumption and make it easy to revise.
3. Inspect the applicable repository guidance and the relevant lesson, simulation, telemetry, and UI code before claiming a capability exists.
4. Record the actual checkout, relevant paths/symbols, and inspected revision or date. Distinguish source inspection from a running UI check.
5. Reuse existing lesson structure and metrics where they fit. Do not invent engine APIs, event names, metric keys, or accessible controls.
6. If repository access is unavailable, still produce the educational design and mark integration mappings as unverified.

Read [references/design-contract.md](references/design-contract.md) when producing or checking a full handoff. It defines document fields, not a runtime JSON schema.
Read [references/learning-patterns.md](references/learning-patterns.md) when choosing scaffolding, diagnostic hints, or a transfer task.

## Define observable learning

- Write objectives as actions: predict, compare, calculate, explain, diagnose, or justify a choice.
- Give each objective an ID and identify the evidence that would support it.
- Separate conceptual knowledge, calculation skills, and simulator operation; avoid grading interface fluency as physics understanding.
- Describe prerequisite checks and likely misconceptions with a short discriminating question.
- Set the conceptual baseline first; offer optional mathematics and advanced model critique through progressive disclosure.
- Match the experiment and assessment to the declared level. A beginner need not derive an equation to use it meaningfully; an advanced learner should examine assumptions and limiting cases.

## Connect the model, equation, and representation

- State the model assumptions, applicable regime, and deliberately omitted effects before choosing a success metric.
- For each quantity, map symbol, physical meaning, internal/display unit, reference frame or origin, valid range, and visual encoding.
- Distinguish altitude from radius, inertial from rotating quantities, and signed components from vector magnitudes where relevant.
- State what is analytic, simulated, measured from telemetry, or schematic. Do not present an analytic ideal as observed numerical behavior.
- Specify observation time separately from grading time. Verify whether replay is observational only and whether grading uses a live or frozen final state; do not assume a replay cursor changes the assessed state.
- Explain why 2D, 3D, a graph, or a table helps the specific objective. Use 3D only when spatial relationships matter.
- Give equations a verbal reading and map terms to the same labels/colors in the view; never make color the only mapping.
- Choose tolerances from the objective, quantity, units, numerical behavior, and intended difficulty. Do not apply an existing percentage threshold to every lesson.
- Cite authoritative sources for nontrivial claims or equations and verify the exact definitions used. Local implementation is evidence of software behavior, not proof of physical correctness.

## Design the experiment

Use **Predict → Observe → Explain → Transfer** as a useful default, adapting the sequence to the request.

1. **Predict:** ask for a qualitative or quantitative prediction before revealing the result. Capture the reason, not only a number.
2. **Observe:** vary a meaningful control, make a controlled comparison, and show the relevant time/state and graph.
3. **Explain:** reconcile prediction and observation using the model and evidence; expose enough detail to diagnose a mistaken mental model.
4. **Transfer:** change a value, context, or constraint and test the same concept without copying the practiced solution.

Specify the initial conditions, control bounds and units, reset behavior, run/pause/replay actions, and the result each activity needs.
Define which controls change the simulated state and which only change its presentation.
State when data are pending, current, stale, invalid, cancelled, or outside the model, and how the learner sees that state.
Any assessed result must belong to the current scenario and relevant settings; editing an assessed input invalidates or supersedes the old result.
Do not assign completion-dependent results from incomplete runs or use mismatched evidence. Existing history-based criteria may flag a failure during a valid live run; preserve that timing when applicable. A planned activity can use a manual observation or teacher rubric if the runtime lacks a required sensor.

## Plan criteria and useful hints

- Assign stable criterion IDs and link each to an objective, an observable, its source, evaluation timing, and pass or rubric rules.
- Distinguish measured task success from demonstrated explanation. Passing an orbit tolerance alone does not prove conceptual learning.
- Check input validity, model scope, run completion, and data freshness before interpreting a failure as a misconception.
- For each plausible learner error, list the evidence needed and alternative explanations. Do not infer a diagnosis from a single ambiguous metric.
- Design hints in increasing specificity: attention cue → model relationship → guided next experiment → worked example when appropriate.
- Explain what each hint is intended to help the learner notice; avoid giving the target value immediately.
- Support an inconclusive state when evidence cannot distinguish errors. Ask for a prediction/explanation or another observation.
- Current sequential/fixed hint support and a proposed diagnostic branch are separate capabilities. Verify the local implementation before choosing either; mark a new branch as an extension.

## Make the lesson usable

- Keep Thai instructions short, concrete, and consistent; define unfamiliar terminology where it first appears.
- Inspect localization requirements before a built-in lesson handoff; the language of the design document does not determine which locale fields the application requires.
- Pair controls with labels, units, bounds, visible current values, and an accessible way to enter a precise value.
- Provide keyboard and touch paths, text equivalents for essential visuals, and non-color-only cues.
- Avoid hover-only explanations and essential motion. Describe reduced-motion behavior and a static/stepwise alternative when needed.
- Consider screen width, Thai line wrapping, font readability, focus order, and graph legends when specifying the activity.
- Plan recovery from a failed run and a return to a known baseline without losing an explanation unnecessarily.

## Review and hand off

Use the review rubric in `references/design-contract.md` to identify specific omissions, not to manufacture a quality score.
Confirm every objective has an activity and assessment, every assessment has valid evidence, and each proposed interaction has a learning purpose.
Report unresolved integration questions and the checks needed to resolve them; do not present a proposed brief as implemented, runtime-verified, or proven to improve learning.
Hand off the brief, source map, criterion/hint plan, transfer rubric, and acceptance checks together.
When requested to implement, preserve these IDs and semantics through implementation or explain a necessary revision to the brief.
