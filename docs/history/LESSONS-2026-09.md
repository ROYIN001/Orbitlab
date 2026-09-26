# Lessons, worksheets and dispersed flights — September 2026

This session's items, in order: **E03 → E05 → P08** (the rest of it). Branch
`claude/lessons-e03-e05-p08`, from `main` at 022b17e. This file is the record the owner merges
into the roadmap; the roadmap table in IMPLEMENTATION-STATUS.md is left alone.

## E03 — lessons with set tasks and automatic grading

### The owner's decisions (asked 2026-09-25)

| # | Question | Decision |
|---|---|---|
| 1 | Where the lessons live | **A button and a dialog** (not a fifth mode): a gold *Lessons* button in the top bar with a passed/total badge, a fourth card on the landing page, and the lesson's own mode (Explore or Engineer). Made to stand out in gold (asked after a mock-up of both options). |
| 2 | The first set | **All five tracks listed, 19 lessons**; round 1 writes tracks 1 and 3 (8 lessons), tracks 2, 4 and 5 are listed as coming. |
| 3 | Criteria | **Declarative criteria plus hooks in code** where they are not enough. |
| 4 | Settings | **Locked per lesson**, greyed out in the panel, and checked again by the grader. |
| 5 | Hints and scoring | **Pass/fail per criterion** with the measured value; up to **3 hints**, revealed one at a time and counted; no numeric score. |
| 6 | Progress | **Browser storage, and an exported results file** with a checksum. |
| 7 | Teachers' lessons | **Yes**, as a `.orbitlab-lesson.json` file (and a `?lesson=` link for a lesson in the catalogue). |
| 8 | WebMCP | **Add** `list_lessons`, `start_lesson`, `get_lesson_result` (and `get_assessment_result`). |
| 9 | When to grade | **At the end, and at once** for a bound broken in flight; a replay never changes a grade. |
| 10 | Tests | Point-mass lessons in `npm test`; the six-DOF solution in `npm run test:heavy`, its wrong flight in `npm test`. |
| 11 | Reading lessons | **Numeric answers** the student works out from the flight, checked against the flight's own value. |
| 12 | Order | **Every lesson open**, with the recommended order shown. |
| 13 | Rounds | **Round 1**: the framework, tracks 1 and 3, the placement test; round 2: tracks 2, 4, 5. |

The owner added a **placement test**, decided as follows:

| # | Question | Decision |
|---|---|---|
| — | Areas | **Six**: the five tracks' areas and **space basics** (rockets from pictures, the physics of spaceflight). |
| — | Length | **25 questions** (4 per area, 5 for the basics). |
| 14 | Form | A fixed blueprint (level 1-2-2-3 per area; 1-1-2-2-3 for the basics), **drawn from a larger bank** so that every test is different but balanced alike: 104 questions. |
| 15 | Kinds | Choices, calculations, charts of recorded flights, and **predict-then-observe**. |
| 16 | Confidence | Asked **only on questions of understanding**, where a confident wrong answer does harm; questions of knowledge offer **I don't know** instead. |
| 17 | Numbers | **Drawn per student from a seed**. |
| 18 | After the lessons | A **post-test** to the same blueprint with different questions, drawn on the same radar. |
| 19 | Teachers' questions | **Yes**, in the lesson file. |
| 20 | When | **In round 1**, all six areas; advice pointing at lessons not yet written says *coming soon*. |

### What was built

- `src/lessons/` (DOM-free): the lesson format and reader (`lesson-file.ts`, the same reader
  for the built-in lessons and a teacher's file), the measures read from a flight
  (`measures.ts`), the hooks (`hooks.ts`: `crewSafe`, `stableOrbit`, `rangeSafe`), the grader
  (`grader.ts`), the progress and results file (`progress.ts`), the WebMCP tools
  (`mcp-tools.ts`), the lessons (`builtin/`), and the placement test (`assessment/`: the bank of
  104 questions in `bank/`, the seeded balanced draw, the scoring and recommendation, a safe
  arithmetic evaluator for calculations, SVG charts and the radar, and `flights.json` — three
  flights recorded from this simulator).
- `src/ui/lessons/`: the button, the landing-page card, the catalogue, the lesson strip, the
  locks (a MutationObserver on the setup panel, so `panel.ts` is not touched), and the placement
  test's dialog (loaded on demand).
- `public/lessons/vehicles/`: 13 drawings of the vehicles the "which vehicle is this?"
  questions show, rendered by the app's own `RocketView` at its pad state (a throwaway page
  under `probe/`, not committed; 480 × 720, JPEG, 166 kB together).
- Additive edits: `src/main.ts` (the lessons wired in: a field, the constructor, one line in the
  frame loop, one in `applyLanguage`, one in `init`, one guard in `onKey`), `src/mcp.ts` (an
  optional `lessons` host and its four tools), the three dictionaries (`// --- E03 ---`, 148
  keys), `tests/i18n.test.ts` (nine key families).

### Lessons written in round 1

| | Lesson | Worked solution | Wrong flight |
|---|---|---|---|
| 1.1 | Your first orbit (Falcon 9, 500 km) | the period and speed from the formulas | a wrong period |
| 1.2 | Into the station's plane (Soyuz-2.1a) | the next launch window | the panel's own time: the node 180° off |
| 1.3 | A Hohmann transfer (2 000 km) | the apogee burn from vis-viva (428 m/s) | a burn from the wrong ellipse |
| 1.4 | Payload and Δv | 16.5 t | 18 t (fails); 15 t (below the 16 t asked) |
| 1.5 | Range safety | Vandenberg | Cape Canaveral: flies the orbit, not licensed |
| 3.1 | One engine out at T+80 s | 16.5 t | 17.5 t; 15 t |
| 3.2 | A stuck gyro and the FDIR (six-DOF) | FDIR on: IMU 1 voted out at T+71.7 s, orbit (heavy test, 75 s) | FDIR off: broken up at T+40.9 s |
| 3.3 | The crew's escape (abort at T+60 s) | crew down, peak load read from the flight | a guess of 5 g |

The numbers the criteria use were measured first: Falcon 9 to 500 km reaches the orbit with
16–17.5 t (188 m/s left at 17 t, 115 m/s at 17.5 t; with the engine lost, 72 m/s at 17 t and an
off-target orbit at 17.5 t).

### Found on the way

- The simulation flies any plane it is given; range safety is only the setup panel's verdict.
  Lesson 1.5 therefore grades the licence with a hook (`rangeSafe`) rather than by the flight.
- In the browser a flight goes on after its insertion: a payload without an engine separates
  and the Δv shown becomes its own, 0 m/s, so lesson 1.4 passed in the tests and failed on the
  page. A measure that changes after the end is now read at the moment the flight ended for
  grading (`gradingEnd`), and the page keeps the grade taken then, re-checking only the answers
  (`regradeAnswers`) — so a node that precesses under J2 while the student watches cannot turn a
  pass into a fail either. Found in the browser run, held by a test.
- A launch escape's peak load is kept in `SimState.abort.maxG`; the telemetry's load factor
  does not follow the escaping head section, so the placement test's charts do not use it.

### Tests

- `tests/lessons.test.ts` (23): the built-in lessons read cleanly in three scripts; each written
  lesson's solution passes and its wrong flight fails; the grader (pad, locks, a peak broken in
  flight, answers); the teacher's file.
- `tests/assessment.test.ts` (21): the bank (104, three scripts, twice the blueprint at every
  area and level, a misconception on every understanding question, every calculation finite at
  its corners, every chart's data, every vehicle's picture); the draw (blueprint, seed, no
  repeated skill, post-test disjoint); the scoring and the recommendation; the expressions; a
  teacher's questions.
- `tests/assessment-flights.test.ts`: `flights.json` is what the simulator flies
  (`-u` rewrites it).
- `tests/lessons-ui-core.test.ts` (8): progress, the results file's checksum, the WebMCP tools
  (an answer's expected value is never given), the SVG figures, units.
- `tests/heavy/lessons-sixdof.test.ts`: lesson 3.2's solution, six-DOF.

### Results

- `npm test` at d629fef: 1 325 tests, all passed (18 min). After it, the grading-at-the-end fix
  and the vehicle picture in the test dialog: the lesson, assessment, i18n, WebMCP and PWA suites
  pass (161 tests); `npm run typecheck` and `npm run build` clean — the placement test is its own
  chunk (284 kB with the bank and the recorded flights), loaded when opened.
- `tests/heavy/lessons-sixdof.test.ts`: passed (75 s).
- In the browser (worker physics, Thai and Russian): lessons 1.1 and 1.4 flown to a pass
  through WebMCP at 1000×, 1.4 failed at 18 t, the locks greyed out, the placement test taken to
  its result.

### Round 2 (asked 2026-09-26, after the owner saw round 1)

The owner's feedback on round 1, and what was done about it:

| Feedback | Done |
|---|---|
| Number the areas from the basics: 1 space basics, then 2–6 | Area 1 the basics, 2 orbits, 3 rockets, 4 guidance, 5 control, 6 failures, in the bank, the lessons' `domains`, the blueprint, the prerequisites and the dictionaries. |
| At least 25 questions per area, with more kinds of question | 157 (26–27 per area). New kinds: several answers (`multi`), put in order (`order`), values read off a chart of a recorded flight, and diagrams drawn for the question (`diagrams.ts`: an orbit's apsides, a Hohmann transfer, the orbital plane and its nodes, the forces on a rocket, a ground track, step responses, a Bode plot, 3σ ellipses of dispersed flights, three IMUs voting, ascent trajectories) — a numeric diagram is drawn with the student's own numbers. |
| The lessons as a page of their own, like a mode, not a window over the simulator | `#/lessons` and `#/lessons/test`: the whole window below the top bar, with tabs, *Back to the simulator*, Esc and the browser's Back; the language can be changed on it (the test's screen is redrawn). `main.ts`: the start address is kept, and the page owns the keyboard (two lines). |
| The drawn rockets are not clear: use real photographs | 11 photographs from Wikimedia Commons, free licences only (public domain, CC0, CC BY, CC BY-SA), resized to 560 × 720 at most; the author and licence are shown in the answers (not beside the question: "SpaceX" or "CALT" would give it away) and listed in `public/lessons/vehicles/CREDITS.txt` and `src/lessons/assessment/photos.ts`. Ariane 6, H3 and PSLV had no good free photograph and left the question; Proton-M joined it. |
| The test in all three languages | It always was (every text is checked in three scripts); the language could not be changed while the test's dialog was open. On the page it can, and the screenshots show it in English too. |
| 2.ก: write tracks 2, 4, 5 now | See below. |
| 3.ข: the recommended start must be a written lesson | The start is the nearest written lesson: chiefly about the area, then touching it, then touching what the area rests on. Tested over 40 seeds. |

### Lessons written in round 2

Every threshold was measured first (the probes are not kept): what the default does, what the
worked solution does, and where the answer turns.

| | Lesson | Worked solution | Wrong flights |
|---|---|---|---|
| 2.1 | Aerodynamic loads (Soyuz-2.1a, point-mass) | acceleration limit 18 m/s²: q 23.6 kPa, orbit | as it is: 34.2 kPa; 15 m/s²: so slow that it is still low when fast — structural failure at T+142 s (q 46 kPa) |
| 2.2 | PEG and IGM (Falcon 9, 17.8 t, engine out at T+80 s) | PEG: target, 42 m/s left; IGM: target, 39 m/s | the standard steering: off target, 2 m/s left |
| 2.3 | Inertial navigation without GNSS (six-DOF) | tactical grade: 324 m at MECO | MEMS: 1.7 km at MECO (fails the moment it passes 500 m); GNSS back on breaks the lesson's check |
| 4.1 | Reading the control loop (six-DOF) | the crossover (3.07 rad/s) and phase margin (46°) read at max-Q | 30 % off the crossover, 10° off the margin |
| 4.2 | Gains with margins (six-DOF) | K_θ 1.5, K_ω 3: 46°, 36 dB | the lesson's 4 / 1.5: 17.8° (3 / 3 gives 29.7°, just short) |
| 4.3 | A step test in flight (six-DOF) | K_ω 6, a 2° step at T+90 s: 30 % | the default gains: 38 %; no step flown |
| 4.4 | Bending and the notch filter (six-DOF) | the filter on: through max-Q | no filter: bending breakup at T+6 s; the bending switched off breaks the lesson's check |
| 5.1 | Bringing the booster home (point-mass) | 10 t: target, the stage on LZ-1 | 12 t: the stage lands but the orbit falls short; 9 t: under the 10 t asked |
| 5.2 | Rendezvous and docking (point-mass) | two-orbit profile: docked in 3.44 h | the two-day profile: docked after two days |

New measures (`measures.ts`): the navigation's position error (its peak so far), the pitch
loop's phase margin, gain margin and crossover at max-Q (from the autopilot's own linear model,
as the loop inspector shows it), the overshoot of the last pitch step flown (as the flight test
measures it), and the time to docking. New hooks: `gnssOff`, `bendingOn`. Nothing in the physics
was changed.

Found on the way: in point-mass, the pitch kick, the pitch-over altitude and the loft move
Soyuz's max-Q by 1 kPa at most — only the acceleration limit shapes it, which is why lesson 2.1
uses it. The launch time of a flight to the station is resolved to the window by the setup
itself, so lesson 5.2 asks for the profile rather than the time. In the browser (worker physics)
2.2 was flown to a pass, 4.1's answers graded against the six-DOF linear model, and 2.3 failed at
1.7 km with the MEMS unit, as in the tests.

Tests: `tests/lessons-round2.test.ts` (8: every point-mass solution and wrong flight, every
six-DOF wrong flight) and `tests/heavy/lessons-sixdof.test.ts` (the five six-DOF solutions).

## E05 — worksheets

### The owner's decisions (asked 2026-09-26)

| # | Question | Decision |
|---|---|---|
| 1 | Format | **Both**: HTML laid out for A4 (Print → Save as PDF) and a Word document (.docx). |
| 2 | Questions | **Both**: worked from the flight's own recorded data, and drawn from the placement test's bank. |
| 3 | Answer key | **A separate file**, so the sheets can be handed out without it. |
| 4 | Numbers | **Drawn per student from a seed** (the name and the class code). |
| 5 | Link to E03 | **Both**: a worksheet for the open lesson (a button on its strip), and one for any mission the teacher flies. |

### What was built

- `src/worksheets/` (DOM-free): the model (`types.ts`); the questions worked from the flight
  (`flight-questions.ts`: a chart read at a drawn time, the peak q and its time, the peak load, the
  first stage's burn time, T/W at lift-off, the first stage's ideal Δv and its losses — only where
  the first stage burns alone, not with strap-ons — the period and perigee speed of the orbit
  reached; each left out when the flight did not do it); bank items (`bank-items.ts`: one per skill,
  spread over the areas asked, predict-then-observe left out, diagrams drawn with the student's
  numbers); the builder (`build.ts`: FNV-1a seed from name, class code and source); HTML
  (`html.ts`) and Word (`docx.ts`, WordprocessingML written directly, stored in a zip by `zip.ts`
  — no dependency) renderers; `print-svg.ts` recolours the dark-page charts and diagrams for paper.
- `src/ui/lessons/worksheet-view.ts`: the third tab of the lessons page; the SVGs become PNG and the
  photographs bytes for the Word file, and data URLs for the HTML file, so both are self-contained.
- `resampleTelemetry` moved into `flights.ts`, shared by the recorded flights and the sheets'
  charts (`flights.json` unchanged, its test passes).
- The dictionaries: a `// --- E05 ---` block (52 keys); `tests/i18n.test.ts`: the `ws.format.*` family.

### Found on the way

- The lift-off telemetry sample falls a rounding error before T+0 (−2·10⁻¹⁴ s); reading "the mass
  at lift-off" from samples with t ≥ 0 took the next one, 1.3 t lighter. The sheets read from
  t ≥ −10⁻⁶.
- The event table printed max-Q's value and the lift-off T/W, the answers to two questions: both
  events are left out of the sheet.
- LibreOffice in this container has no Writer module, so the .docx could not be opened here. The
  test reads the package with its own unzip and a bit-by-bit CRC, checks every part is well-formed
  XML, the schema's element order in borders, paragraph and run properties, a paragraph in every
  table cell, and a picture for every figure; Python's `zipfile` and `xml.dom` read the files the
  browser saved.

### Tests

`tests/worksheets.test.ts` (6): every flight answer against the telemetry and events it comes from
(and the formulas the student is asked to use); no period or MECO question for a flight that did
not get there; the same names and code make the same sheets, other names or codes other numbers;
no answer on a sheet, every answer in the key, no script or network in the file; prompts in
Russian and Thai; the Word package's structure.

## Main merged in: G05 and Falcon 9's published masses (2026-09-26)

Main moved on while this branch was open: G05 (Monte Carlo, with `DEFAULT_DISPERSIONS`, which P08
builds on) and PR #18's flight-data validation, with Falcon 9's published first-stage masses. The
merge kept both sides of every conflict (the dictionaries' blocks, `mcp.ts`, the i18n test, the
guide — whose Monte Carlo section is §17, the lessons §18). Falcon 9 now lifts about 1.5 t more, and
main's autopilot work damps the default loop much more; every lesson and recorded flight was
measured again:

| | Was | Now |
|---|---|---|
| 1.4 payload and Δv | at least 16 t, panel at 18 t | at least 17.5 t, panel at 19.5 t (18 t leaves 173 m/s, 18.5 t 93) |
| 3.1 one engine out | at least 16 t, panel at 17.5 t | at least 17.5 t, panel at 19 t (18 t: target with 62 m/s; 19 t off target) |
| 2.2 PEG and IGM | 17.8 t | 18.8 t (standard: off target; PEG 46 m/s left, IGM 44) |
| 5.1 the booster home | at least 10 t | at least 9 t (9.5 t: target, the stage on LZ-1) |
| 4.3 a step test | default gains 38 % at T+90 s, pass at 35 % with K_ω 6 | starts with K_θ 4 / K_ω 1.5: 12 % at T+65 s; pass at 6 % (the default gains: 0 %) |
| `flights.json` | MECO T+151.7 s, max-Q 22.8 kPa | MECO T+157.1 s, max-Q 22.4 kPa (regenerated; the bank's explanations quoting them updated) |

Found, not changed (physics is not this branch's to change): in point-mass, Falcon 9's first
stage flown back to LZ-1 lands with 8–9.5 t and with 11.5 t on top, but comes down 42–216 m off the
pad with 10–11 t (`evt.stageImpact`). Lesson 5.1 asks for at least 9 t and its hints do not promise
that heavier always fails. At T+90 s the six-DOF pitch loop is now dominated by a ±2° oscillation
that is not the step, so the step test moved to T+65 s.
