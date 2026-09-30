# Assessment audit — 28 September 2026

Read-only review of main `0a6d1a709ffbf88e8e36f606d6993bd27e5c25e0`, under `audit-2026-09-28/source`. References are relative to that source directory. No product code was changed. Audit scripts, extracted inventories and results were written beside the source. No AGENTS.md was found in the source or scoped workspace search. This reviewer did not operate a browser; the parent reviewer owns browser verification.

## Coverage and evidence

This is a full **157-item bank inventory**, not a question sample. Every English prompt, option/distractor, misconception, explanation and ordering was read. Every Thai and Russian prompt and marked answer/ordering was compared with the English meaning. All **926 text triples / 2,778 language strings** were checked programmatically for presence and matching placeholders; every choice/multi item was checked for duplicate option text in each language. Thai/Russian explanations and distractors received targeted semantic checks around the findings below, not an independent editorial certification of every translated sentence. The Russian–Thai translation skill and its user-approved terminology were consulted. No claim of complete translation certification or psychometric validation is made.

| Domain | Items | Levels 1 / 2 / 3 | Choice | Numeric | Multi | Order | Vehicle | Understanding | Has lesson link |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 Space basics | 27 | 10 / 12 / 5 | 20 | 1 | 2 | 2 | 2 | 11 | 10 |
| 2 Orbital mechanics | 26 | 7 / 11 / 8 | 17 | 7 | 1 | 1 | 0 | 10 | 18 |
| 3 Rockets and atmosphere | 26 | 8 / 12 / 6 | 16 | 6 | 2 | 2 | 0 | 10 | 12 |
| 4 Guidance/navigation | 26 | 8 / 10 / 8 | 20 | 2 | 2 | 2 | 0 | 11 | 26 |
| 5 Attitude control | 26 | 7 / 11 / 8 | 16 | 7 | 2 | 1 | 0 | 9 | 21 |
| 6 Failures/safety | 26 | 8 / 12 / 6 | 20 | 2 | 2 | 2 | 0 | 10 | 22 |
| **Total** | **157** | **48 / 68 / 41** | **109** | **25** | **11** | **10** | **2** | **61** | **109** |

There are 19 explicit question figures, two additional predict/observe charts, two generated vehicle-photo questions, and 11 diagram types. The diagram code for all 11 types was read; letter mappings and the formulas used by the numeric plots were checked. The shipped Vulcan photograph was visually inspected; the other vehicle images were checked for availability by the existing test, not visually reidentified in this reviewer’s run.

Fresh checks:

- `tests/assessment.test.ts` + `tests/lessons-ui-core.test.ts`: **44/44 passed**, 2.93 s.
- `tests/assessment-flights.test.ts`: **1/1 passed**, 2.09 s. Its three flights were rerun and matched the committed telemetry file. This verifies agreement with the simulator, not flight-data accuracy.
- Audit-only exhaustive independent numeric calculation: **25 families, 31,639 allowed parameter combinations**. Every answer was finite and positive; every independently computed answer was accepted by the grader; answers beyond the published tolerance were rejected. Twenty-four families agreed at floating-point precision. `r-liftoff-accel` uses 9.80665 while its prompt says 9.81; maximum answer difference is 0.115%, inside its 3% tolerance.
- **1,000** pre/post draw pairs: each pre-test had 25 unique IDs, all 157 bank IDs were reached, and there were **zero** pre/post overlaps. Each item was also prepared for 100 seeds; numeric steps/ranges, vehicle choice uniqueness, unordered starting arrangements and finite diagram output passed.
- No missing text, placeholder mismatch, duplicate question ID or duplicate translated choice text was found. The built-in reader reported no bank issues in the passing existing suite.

Reproducible evidence: [all item data](assessment-bank-inventory.json), [per-item matrix](assessment-question-matrix.md), [numeric/draw results](assessment-systematic-results.json), [recommendation probe](assessment-recommendation-probe.json). The three `assessment-bank-*.txt` files provide readable language inventories. Audit commands use installed Node and the existing dependency junction; no installation or full suite was run.

## Corrections from the 27 September report

| Previous issue | Current status | Evidence |
|---|---|---|
| Language switch clears placement answer | **Fixed in source and unit coverage; browser confirmation belongs to parent.** `DraftBook` holds choice, multi/order, raw numeric text, confidence, focus and caret independently of rendered labels. | `assessment/draft.ts:18–150`; `assessment-view.ts:111–128,230–236,303–321,368–375`; passing assessment tests |
| Blank confidence gives full credit while honest guessing gives half | **Fixed for new UI submissions.** Understanding answers require confidence. Older stored answers retain their historical scoring. | `assessment/draft.ts:128–150`; `assessment-view.ts:255–260,334–348,380–388` |
| Confidence weighting hidden; denominator absent | **Fixed.** Intro, each confidence row and results explain weighting; results show actual correct/asked counts. | `i18n/en.ts:3225,3253,3285–3288`; equivalent RU/TH strings; `assessment-view.ts:430–435,488–493` |
| Export loses guidance/docking configuration | **Fixed in source and round-trip test.** Full resolved guidance, pad, rendezvous and custom vehicle are copied from the flown configuration. | `lessons/progress.ts:67–91`; `lesson-mode.ts:415`; passing `lessons-ui-core` test across all flight lessons |
| Storage failure swallowed | **Partly fixed.** `saveProgress` returns success and the catalog/lesson strip shows it. The assessment page still has no status, detailed below. | `lessons/progress.ts:118–130`; `lesson-mode.ts:168–182,646–647,948–949` |
| Results export mistaken for backup | **Copy improved.** Failed-save copy explicitly says the results file cannot restore progress in all three languages. Restore and custom-content export remain absent. | `i18n/en.ts:3143–3144`, `ru.ts:3122–3123`, `th.ts:3123–3124`; `progress.ts:163–185` |

## Findings to correct first

### A28-01 · P2 · A valid answer can be scored as a misconception

`g-zero-alpha` asks why guidance holds angle of attack near zero, but marks “To reduce drag and save propellant” wrong. A learner choosing it with “Sure” is told that they believe angle of attack matters for drag **but not structure**. Their selected answer never said that. All three translations preserve this problem (`bank/guidance.ts:99–108`). Reduced drag is a valid additional benefit; the question needs “Which structural-load reason is most important here?”, an explicitly exclusive distractor, or multiple-answer grading.

`c-maxq-margins` has the same inference pattern: “The engines are throttled down, so there is less control authority” is marked wrong and converted into the belief that margins shrink **only** because thrust falls (`bank/control.ts:145–154`). Lower thrust really can reduce TVC authority; this is an ambiguous secondary reason, not proof the learner denies aerodynamic destabilization. The bank itself teaches moment proportional to thrust in `c-tvc-moment` (`control.ts:230–234`). Fix the wording before using these responses to assign misconception labels and review lessons.

### A28-02 · P2 · One first-flight history question has no correct offered answer

`g-peg-igm` says IGM first flew on Saturn V and dates its use from 1967 (`bank/guidance.ts:89–97`). NASA’s contemporary SA-9 report documents IGM on the **Saturn I S-IV stage** and a successful flight on **16 February 1965**, before Saturn V. Thus the marked pairing is wrong in EN/RU/TH; all other choices are wrong too. Replace “first flown” with a supported association (“PEG is associated with the Shuttle and IGM with the Saturn family”), or correct the first-use question after checking both halves. [NASA TM X-53253, SA-9 analysis](https://ntrs.nasa.gov/api/citations/19650014966/downloads/19650014966.pdf).

### A28-03 · P2 · Recommendation says nothing needs work despite a specific review assignment

Reproduced in the audit probe using draw seed **11**, actual metadata from all 24 catalog lessons, 24 correct answers and a wrong `b-launch-east` answer marked “Not sure”: overall 97%; basics 86%/strong; every other domain 100%/strong; `orbit-range-safety: review`; **`start: null`**. The result UI consequently selects “strong in every area” and an empty “To work on” list while lesson 1.5 remains a red review chip.

The flagging logic deliberately reviews a lesson linked to a wrong level-1 answer (`score.ts:148–154`), but start selection considers only nonstrong domains (`score.ts:166–178`). The UI also filters weaknesses only by domain level (`assessment-view.ts:450–451,487`). Make explicit lesson-review flags part of start/weakness selection, even when aggregate domain performance is high. This is a deterministic logic inconsistency, separate from any argument about scoring design.

### A28-04 · P2 · The series-reliability exercise omits a necessary assumption

`f-series-reliability` gives the same marginal probability for each event and grades only `p^n`, without stating that the events are independent (`bank/failures.ts:246–250`). Its explanation says events that must all work multiply, which is not generally true for marginal probabilities. Eight perfectly correlated events each with 99% reliability yield 99% overall; eight independent events yield about 92.27%. Add “Assume independent events” to all prompts and explanations. The separate voting exercise already states independence correctly (`failures.ts:150–157`). The numeric implementation is correct for the independent case.

### A28-05 · P2 · A reversed burn direction in the English explanation teaches the wrong maneuver

`o-catch-up` correctly says the chaser first brakes into a lower phasing orbit, then the English explanation says it “later brakes back up” (`bank/orbits.ts:146`). A prograde burn is needed to raise the orbit back. Russian and Thai say “raises back” without the wrong braking direction (`:147–148`). Correct the English and add the prograde step explicitly in all languages. The existing Hohmann explanation already explains why raising the opposite apsis uses a forward burn (`:195–205`).

### A28-06 · P2 · Storage warnings remain invisible during the placement test

Saving now returns false when storage refuses a write, but `LessonMode.save()` repaints only the catalog when the status changes (`lesson-mode.ts:168–173`). `saveNote` is rendered in the catalog and active lesson strip, not the assessment page (`:646–647,948–949`). The shared page header contains title, tabs and back button only (`:888–906`); the assessment host has no saved-status channel (`assessment-view.ts:29–37`). A placement-only user can complete all 25 answers while writes fail without seeing the new warning. Put the status in the shared lesson/assessment header and update it after every save. This is source-confirmed; a browser quota/refused-storage scenario was not executed by this reviewer.

### A28-07 · P2 · Visual questions lose their evidence in answer review

`renderReview()` prints prompt, selected answer, correct answer and explanation but never calls the figure renderer (`assessment-view.ts:496–528`). Consequently an item about A/B/C points or reading a graph has no diagram/graph/photo alongside its explanation; vehicle questions show only the generic prompt plus the vehicle name and photo credit. Render the original prepared figure and any observed comparison in review, using the saved parameters. Make related lesson names actual links; they are currently plain text (`:522–524`).

The SVG helpers also supply `role="img"` without an accessible name or equivalent data representation (`assessment/diagrams.ts:26–27`; `figures.ts:73,98`). A graph-reading task requires a carefully designed equivalent interaction, not alternative text that merely reveals the answer. Parent browser/accessibility results should determine the user-facing severity of that second part.

## Smaller content and interpretation corrections

- **P3 — Vulcan photo explanation contradicts its photograph.** `b-vehicle-similar` calls Atlas V **and Vulcan** orange-brown (`basics.ts:16–20`) in all languages. Shipped `public/lessons/vehicles/vulcan.jpg` is silver/white with large red graphics. Describe the actual illustrated vehicle or focus on geometry. This was visually verified, not inferred from another launch image.
- **P3 — Apollo 13 explanation mixes up the damage mechanism and ignition circuit.** EN/RU/TH say a damaged heater wire started the fire (`failures.ts:269–271`). NASA’s review board traces heater overheating during ground servicing to damaged insulation and the later short circuit in **fan wiring** when the tank was stirred. The broad keyed answer about oxygen-tank failure and the LM lifeboat is correct. [NASA’s review-board account](https://www.nasa.gov/history/50-years-ago-apollo-13-review-board-report/), [original board report, §5 findings 24–25](https://www.nasa.gov/wp-content/uploads/static/history/afj/ap13fj/pdf/report-of-a13-review-board-19700615-19700076776.pdf).
- **P3 — Qualify the Hohmann minimum claim.** `o-two-burns` asks for minimum propellant between arbitrary coplanar circular orbits and requires two burns (`orbits.ts:81–90`). Restrict it to Hohmann/two-impulse transfers or the LEO examples used here. At sufficiently large radius ratios, a bi-elliptic transfer can use less Δv. [Arizona State spacecraft-dynamics lecture 9](https://control.asu.edu/Classes/MAE462/462Lecture09.pdf).
- **P3 — Fix an internal plane-motion contradiction.** `o-window` calls the ISS plane fixed (`orbits.ts:70–79`); `o-nodal-regression` correctly teaches its roughly 5°/day westward motion (`:242–251`). Say “approximately fixed over the launch window” and refer to the target plane at launch. The key remains the best offered answer.
- **P3 — Do not equate every stuck gyro with a false nonzero rate.** `f-stuck-gyro` specifies only a constant reading (`failures.ts:66–75`). Its prescribed behavior assumes that reading disagrees with the actual/required rate. Add a concrete nonzero frozen value and flight situation; a sensor stuck at zero with zero true rate is not immediately the described runaway.
- **P3 — The Kármán explanation overstates a convention as a sharp universal aerodynamic threshold.** Its answer is correctly the FAI convention of 100 km (`basics.ts:21–29`). Keep “conventional”; avoid the absolute claim that above exactly 100 km no wing can sustain any suborbital speed for every vehicle. FAI itself discusses the physical/model dependence of the boundary. [FAI statement](https://www.fai.org/news/statement-about-karman-line), [FAI technical discussion](https://www.fai.org/sites/default/files/documents/fai_icare_plenary_meeting-annex_3-karman_line-n._berend-v1.2.pdf).
- **P3 — Translation editing is still useful.** Russian `o-hohmann-burns` uses the ungrammatical “по штриховой полуэллипсу” (`orbits.ts:196`) and `o-ground-track` has “две витка” instead of “два витка” (`:218`). Thai terminology changes within the same domain: `c-phase-margin`/`c-read-pm` use ค่าเผื่อเฟส / เฟสมาร์จิน; `c-step-terms`/`c-read-overshoot` use ค่าพุ่งเกิน / โอเวอร์ชูต (`control.ts:55–65,108–116,166–178`). Rocket stage is repeatedly ขั้น, whereas the user-approved study glossary prefers ท่อน. These are consistency/editorial issues, not evidence that all Thai or Russian content is incorrect.
- **Low impact numeric rounding:** `r-liftoff-accel` says 9.81 but evaluates `g0=9.80665` (`rockets.ts:248–253`; `expression.ts:13`). No correct response within the stated approximation was rejected over any of its 546 parameter pairs. Align the constant for clarity; do not report this as a grading failure.

## Assessment design and continuity recommendations

The 25-question blueprint balances six domains and difficulty labels, not statistical difficulty, knowledge/understanding mix or evidence strength (`draw.ts:13–20`). It is a useful placement heuristic, with all lessons remaining open. Current disclosure resolves the old hidden-weight problem, but confidence still changes reported proficiency. In 100 deterministic audit draws, answering **every question correctly** and selecting “Guessing” on every understanding question yielded scores from **68% (seed 29)** to **89% (seed 8)**. Both students followed exactly the same answer/confidence behavior; the difference is the number and weight of understanding questions drawn. Knowledge items never ask confidence. Separate correctness from confidence, or balance their mix and explain that pre/post changes combine knowledge, confidence and item variation. Show domain evidence as “4 questions; preliminary recommendation” rather than treating a percentage as a calibrated mastery estimate. The report found no validation study in the reviewed material.

Current results are recalculated against the **current** bank (`assessment-view.ts:48–54,412–414`; `lesson-mode.ts:908–919`); stored attempts contain prepared IDs/values/option indices but no bank version or question snapshot (`assessment/types.ts:129–137`). Editing a question’s options/key later can silently reinterpret an old response, including the baseline in a pre/post chart. Results exports exclude custom question/lesson definitions and keep only the latest score summary (`progress.ts:163–185`; `lesson-mode.ts:1088–1100`). Before correcting/reordering bank items, add a stable bank revision and immutable item/key snapshot or migration strategy. Preserve old scores as originally graded. A separate versioned progress backup/restore should include custom content; the current results file is correctly described as a record, not a restorable backup.

Coverage is broad, but many areas mix introductory facts with advanced interpretation. Preserve the strongest items: free fall versus gravity; two-step orbital reasoning; units and radius versus altitude; specific force versus gravity; 1D 3σ versus a 2D 3σ ellipse; voting versus common-mode faults; Bode/step interpretation; and predict–observe comparison. The 48 items with no related-lesson link could offer a short optional explanation/experiment path. The new case lessons are recommended from domain scores but have no question-specific links in this bank, so “skip” should stay advisory rather than certify those applied skills.

Suggested order: fix misleading keys/distractors and English burn direction; reconcile explicit review flags with result headlines; expose save status on the assessment page; retain visual evidence in answer review; then stabilize historical scoring/backup and standardize terminology. No product changes were made in this audit.
