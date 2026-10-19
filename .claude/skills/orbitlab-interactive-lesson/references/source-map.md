# Orbitlab source map

Navigation snapshot: 2026-10-19, inspected local `Claude code version` source. Paths below are relative to that checkout. No browser execution, deployment verification or Git-currentness claim accompanies this map. Other Orbitlab copies can differ. Re-find symbols and read their callers before changing them; do not rely on saved line numbers or counts as permanent facts.

## Locate the actual target

Use the user's chosen source root. Verify `package.json` and `src/lessons` exist there, read applicable project instructions, inspect local changes if Git works, and preserve unrelated work. A parent named Orbitlab is not necessarily a Git repository. If Git is unavailable, record that limit and inspect the files directly; do not repair repository metadata as part of a lesson task.

## Design to runtime mapping

The lesson brief is a planning artifact, not an accepted application JSON schema. Map it deliberately:

| Learning specification | Existing entry point to inspect |
| --- | --- |
| Lesson ID, languages, order, briefing and debrief | `src/lessons/types.ts`: `Lesson`, `LocalText`; `src/lessons/builtin/track*.ts` |
| Repeatable mission and controlled variables | `builtin/common.ts`: `missionDoc`; `config.ts`: `lessonConfig`; `types.ts`: `LockKey`/`LOCK_KEYS` |
| Quantitative or event success evidence | `types.ts`: `Criterion`, `MeasureId`; `measures.ts`: `MEASURES`; `grader.ts`: `gradeLesson` |
| Registered specialized validation | `hooks.ts`: `LESSON_HOOKS`, `hookExists`; no imported executable code |
| Predict-before-observe assessment | `assessment/types.ts`: `ChoiceQuestion.observe`, `Figure`; inspect its UI renderer |
| Independent transfer assessment | `assessment/bank.ts`, `draw.ts`, `score.ts`; add or select a suitable question type |
| Existing fixed hint ladder | `Lesson.hints: LocalText[]`; `src/ui/lessons/lesson-mode.ts` |
| New diagnostic hint or linked equation behavior | New implementation work across the affected schema/parser/evaluator/UI, not a pre-existing field |

## Schema, import and catalogue

- `types.ts` defines criterion kinds `measure`, `outcome`, `event`, `answer`, `hook`. A `measure` uses a known measure and bounds or target/tolerance; `answer` accepts a typed answer with declared tolerance. Read the union before constructing a lesson.
- `LocalText` requires English. Import parsing warns about missing Thai/Russian, while the inspected built-in tests require all three languages. Follow the selected content path's contract rather than assuming the parser and built-ins have identical acceptance.
- `RevealKey` currently supports only `setup.guidance`; it is not a general mechanism for arbitrary collapsible lesson sections.
- `catalog.ts` builds `BUILTIN_LESSONS` through `readLesson`; `allLessons(custom)` prevents custom lessons replacing built-in IDs.
- `lesson-file.ts` uses format `orbitlab.lessons`, version `1`, extension `.orbitlab-lesson.json`. Relevant functions: `readLesson`, `readQuestion`, `parseLessonFile`, `lessonFileText`.
- The parser reconstructs supported objects. Adding an arbitrary property to a JSON example does not make the UI consume it. Schema extensions need an explicit compatibility/version strategy and round-trip verification. Partial import can retain valid entries while returning `FileIssue[]`; do not suppress those issues.

## Grading and hints

- `gradeLesson(lesson, flight, answers, finalOverride?)` consumes a `LessonFlight` containing configuration, plan, state, events, telemetry, debris and site. `brokenLocks` checks the flight configuration; disabled controls alone do not enforce a lesson lock.
- `answerMatches` uses the greater of absolute and relative allowance when both apply. Preserve this meaning unless the user requests a deliberate change. Match the measure's grading unit.
- `flightEnded` includes failure/end-event/result/tail-off semantics. Cutoff alone is not always a final result. History measures can detect a failure earlier than final-state measures.
- `LessonMode` freezes final grades and uses `regradeAnswers` afterward. The host's `sim()` points to the live simulation or its worker mirror. A replay cursor or later coast must not rewrite a completed flight grade.
- Existing hints are sequential: the UI increments `hintsShown` and displays `lesson.hints[i]`. New feedback selection by failed criterion needs implementation and behavioral tests.
- `progress.ts` includes `loadProgress`, `saveProgress`, `recordGrade`, `resultsFile`, `verifyResults`. Inspect persisted compatibility if adding per-attempt diagnostic state. Preserve historical earned progress while ensuring it is not displayed as a pass for a new, unevaluated attempt.

## Assessment is a separate subsystem

`assessment/types.ts` supports choice, numeric, vehicle, order and multi questions; `PreparedQuestion` holds seeded values/order. `draw.ts` supplies `prepareQuestion` and `drawTest`; `score.ts` supplies `isCorrect`, `gradeQuestion`, `scoreAttempt`.

The inspected assessment identifies a misconception from an incorrect understanding answer with confidence `sure`. Do not redefine that existing score flag to mean every wrong answer when adding diagnostic help. New hints may describe an observable discrepancy without asserting a psychological diagnosis.

`assessment/expression.ts` is a restricted expression evaluator, not JavaScript `eval`. Its trigonometric inputs and inverse outputs use **degrees**, whereas many physical orbit APIs use **radians**. Constants `mu` and `R` in that evaluator remain SI. Verify the expression grammar and units before generating a numeric question.

## Sessions, rendering and replay

- `src/session/session.ts`: `FlightSession`, `InlineSession`, `WorkerSession`, `createPhysicsWorker`. Advance/control the flight through the session interface. `WorkerSession.sim` is a read-only main-thread mirror; never call simulation stepping directly on it.
- `src/main.ts`: session selection has worker creation with inline fallback. Inspect actual handling of asynchronous errors before assuming every failure falls back automatically.
- `src/replay/simview.ts`: `FrameSimView`, `createFrameSimView` provide displayed-frame data. The main update loop supplies frame/cursor data to the telemetry panel and separately calls lesson updates against live state.
- `src/ui/telemetry.ts` and `telemetry-charts.ts`: existing chart IDs include altitude, velocity, q, g, apsides, dv, pitch and mass. Charts can be decimated and sampled from replay. Use the established chart/session route before creating a second clock or telemetry engine.
- `src/ui/equations.ts`: `EquationsPanel`; `equations-model.ts`: `equations` supplies frame-based explanations. Inspect current chart/equation mode selection before proposing a new equation renderer or assuming both are visible together.
- `src/ui/panel.ts`: numeric input handling, `autotune` and mission/configuration signatures; `src/physics/tune-job.ts`: `runTuneJob` owns cancellation and worker cleanup. Existing guards are useful starting points, but do not prove that lesson evaluation becomes stale at the first draft keystroke.

## Units and useful orbital APIs

| Layer | Convention/pitfall |
| --- | --- |
| `src/physics/constants.ts` | SI constants, including `MU_EARTH = 3.986004418e14` m^3/s^2 and `R_EARTH = 6378137` m in the inspected version |
| Mission/data specifications (`src/types.ts`) | kg/m/N/Isp seconds; angles are degrees unless stated otherwise |
| `src/physics/orbital.ts` elements | meters, radians, seconds; periapsis/apoapsis fields represent altitude above the selected Earth radius |
| `circularSpeed`, `visViva` | Accept radius from the center, not surface altitude |
| `src/orbit/maneuvers.ts`: `hohmannDv(r1,r2)` | Input radii in meters; returns impulse magnitudes in m/s and transfer time in seconds; magnitude does not encode prograde/retrograde direction |
| `src/lessons/measures.ts`: `MEASURES` | Some grading values are converted: km, degrees, minutes, km/s, kPa; payload kg and dvLeft m/s |
| `formatMeasure`, `src/lessons/text.ts`: `unitText` | Reuse formatting and translated unit conventions where appropriate |

Unbound orbit values can be nonfinite. Measures convert unsupported/nonfinite evidence to unavailable values; do not grade a rendered `Infinity` or `NaN` as success.

## Focused verification navigation

The inspected `package.json` uses TypeScript/Vite/Vitest and runtime dependency Three.js. It does not establish a React application or a browser-test script. Recheck runtime/tool versions locally before executing commands.

| Changed area | Candidate tests to inspect, then select |
| --- | --- |
| Schema/catalogue/import | `tests/lessons.test.ts` (built-in/schema/round-trip cases) |
| Lesson UI logic and history | `tests/lessons-ui-core.test.ts`, `lessons-history.test.ts`, `lessons-round2.test.ts` |
| Assessment/drawing/scoring | `tests/assessment.test.ts` and neighboring assessment tests |
| Session/replay/time/chart behavior | `tests/session.test.ts`, `replay.test.ts`, `timeaxis.test.ts`, `chart-summary.test.ts` |
| Specific six-DOF lesson changes | Relevant cases in `tests/heavy/lessons-sixdof.test.ts` only when needed |

At inspection, catalogue tests asserted 21 lessons and assessment tests 157 questions. Intentional additions may require changing these assertions; preserve uniqueness, language and coverage checks instead of deleting them. These counts are historical navigation facts, not requirements for new content.

Worker tests with a fake transport do not prove browser module loading, frame rate or responsiveness. Tests may include long-running flights; select relevant cases and honor the user's test budget and worker cap. A documentation-only skill change does not require these application suites.
