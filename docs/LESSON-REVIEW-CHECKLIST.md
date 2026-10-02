# Teacher and native-language review record

This is a blank review template, not a completed review. All five shipped packs
currently have pending owner, teacher/curriculum and English/Russian/Thai language
reviews. No classroom durations have been measured. The catalogue states those
limits separately from automated test coverage.

Copy this document into a new review record and complete it with the actual
reviewer. Use one record per pack and application revision. Keep an unresolved
review pending; a successful test run or source download is not a human sign-off.

## Record to complete

| Field | Actual review information |
|---|---|
| Pack ID | |
| Application commit (40-character Git hash) | |
| Public lesson JSON SHA-256 | |
| Reviewed languages | |
| Intended school year, audience and prior knowledge | |
| Teacher/curriculum reviewer and relevant experience | |
| Native-language reviewer and language | |
| Owner reviewer | |
| Review dates | |
| Outcome per role: pending / changes required / accepted | |
| Evidence attachment or committed review record | |

Do not fill in names, dates, acceptance or measured times on another person's
behalf without their actual recorded review. The application commit identifies
the built-in lessons reused by the pack as well as its own lessons.

## Teacher and curriculum checklist

- [ ] Read every lesson, including reused built-in lessons, in the target language.
- [ ] Check the stated learning goal against the actual task and required prior knowledge.
- [ ] Open each curriculum source from the catalogue; record publisher, edition,
      page/section and access date. Record unavailable sources without assuming
      they are invalid or current.
- [ ] For each lesson, verify the exact indicator, outcome, course or competence
      code and explain the alignment in the table below.
- [ ] Confirm that the cited curriculum edition applies to the intended cohort.
- [ ] Work each task without hints, then with hints; check the brief, solution,
      feedback, units, significant figures and scientific limitations.
- [ ] Check that a plausible wrong answer receives useful feedback and cannot
      pass through rounding, an unrelated setting or an already-satisfied start.
- [ ] Check classroom accessibility, required internet access, available devices,
      reading load and teacher support for this audience.
- [ ] Review the pack-specific questions in the existing
      [T03 owner review](history/phase4-2026-10-01/T03-OWNER-REVIEW.md), including
      later T03b additions. Mark resolved, still applicable or superseded with evidence.
- [ ] Record unresolved issues and the precise scope of any acceptance.

| Lesson ID | Objective and curriculum code | Source edition and page | Evidence from the task | Finding / action |
|---|---|---|---|---|
| | | | | |

## Native-language checklist

- [ ] Review the title, learning goal, brief, hints, debrief, prompts, unit labels,
      curriculum names and new review-status labels in context.
- [ ] Check scientific terminology against the source curriculum and the
      [physics glossary](PHYSICS.md), including Russian notation and Thai grade names.
- [ ] Confirm the text is natural and understandable for the stated age group.
- [ ] Check every numerical value, inequality, sign, unit and decimal convention
      against the English task; translation must not change the required answer.
- [ ] Open the catalogue and lesson at a narrow screen size; check truncation and wrapping.
- [ ] Record proposed corrections and review the corrected version before acceptance.

| Language | Text / lesson | Finding | Correction | Reviewer outcome |
|---|---|---|---|---|
| | | | | |

## Classroom duration, when evidence exists

Current metadata deliberately has no duration. Record a timed classroom trial or
an explicit estimation method before adding one. Include setup, instruction,
reading, task execution and reflection; simulation time is not classroom time.

| Lesson / pack | Learner count and prior knowledge | Device / support | Observed range or estimate (minutes) | Method, date and limitations |
|---|---|---|---|---|
| | | | | |

An estimate must remain labelled as an estimate with its method visible. No
timing field should imply a user study was run when it was not.

## Current source provenance and limitations

The URLs and page references shown in the catalogue are taken from the existing
[curriculum research](history/phase4-2026-10-01/T03-CURRICULA-RESEARCH.md), not from a
new teacher review. On 2026-10-02 at 23:13:49 UTC, 16 source GET requests were
attempted. Every request stopped at the environment proxy with
`Tunnel connection failed: 403 Forbidden`. No upstream response was obtained;
this establishes neither current source availability nor curriculum accuracy.
The checks included the full IPST curriculum, its force/energy extracts, physics
groups 1 and 3, its comparison table, the Earth/space guide at flippingbook page
36, the NKRAFA index and four programme documents, the two Russian standard
copies and MAI/Bauman programme pages. The catalogue links the Earth/space guide's
document landing page from the research; that landing page was not separately fetched.

Preserve these scope limits in the review:

- IPST references the 2017 revision; applicability to the current cohort needs confirmation.
- NKRAFA combines Aeronautical Engineering 2025/2020, Electrical Engineering
  2025 and Mechanical Engineering 2020. Public course descriptions and outcomes
  do not establish alignment with unpublished weekly course specifications.
- `fgosvo.ru` and `legalacts.ru` host public copies of standards. MAI and Bauman
  describe civilian programmes; they do not establish the Mozhaisky academy's
  unpublished curriculum. The standard's military-competence clause is §3.4.

## Recording a real completed review

Keep the actual completed record in the repository, reference its path in
`src/lessons/review.ts`, and supply each completed role's reviewer, date, evidence
and application revision. Unfinished language reviews remain pending. The
catalogue's overall review state changes only after every role has evidence.
Update the exact public JSON digest when the released file changes, and revisit
affected sign-offs when the lessons or cited mapping change. Do not carry a
review to new content automatically.

The older owner-review document's boolean-only instructions predate this
registry. The `reviewed` pack flag must agree with the evidence-based overall
status, rather than replacing it. Regenerate pack JSON with the existing pack
script if the pack flag changes, then run metadata, pack, design and applicable
six-DOF tests. Automated checks validate mechanics; preserve the human record
as separate evidence.
