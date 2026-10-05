# Unified ledger - group "learning" (lessons, assessment, worksheets, instructor mode, classroom, pedagogy, Thai/RTAF institutional context, translation, game layer)

Built 2026-10-04 from every ledger row with area lessons/classroom/pedagogy/i18n/institutional/game (187 rows from devplan-th parts 1-2, remaining-th parts 1-2, roadmap-part2-3, other-docs; r2-status has none in these areas), the summaries, `r2-status.md`, `doc-map.md`, `process-lessons.md`, and the code-review findings assigned to this group (P28, D10, D12, B6, B7, B8, plus NEW-storage-4 and NEW-storage-6, which sit in `src/ui/lessons/worksheet-view.ts`; no NEW-UI-* finding is under `src/ui/lessons`).

Statuses re-verified read-only on **origin/main = da67341** (R2, PR #74). R2 changed none of `src/ui/lessons/**`, `src/lessons/**`, `src/worksheets/**`, `src/classroom/**`, `src/experiments/**`; in this area it only added 17 keys per language to `src/i18n/{en,th,ru}.ts`, touched `index.html` and `src/workspace/registry.ts`. All review findings above therefore hold on main at the same lines.

Machine-readable: `unified-learning.jsonl` (ids `M-LEARNING-001..076`). Coverage was checked by script: every one of the 187 source rows is referenced by a unified item or routed to another group's item (section 6).

## 1. Counts

| status | n |
|---|---|
| done | 7 |
| partial | 17 |
| open | 45 |
| deferred | 6 |
| superseded | 1 |
| rejected | 0 |
| **total** | 76 |

Open + partial + deferred by priority: P0 1, P1 7, P2 27, P3 33.

Kinds of open work: about one third is owner/human work (decisions, reviews, the user study, the teacher guide), which no code PR can close. The master plan needs a separate human lane for it.

## 2. Open, partial and deferred items grouped by placement

### 1. B track - bugs and data safety (lessons UI package B-LES-1, storage package)

| id | P | effort | status | title | placement | depends on |
|---|---|---|---|---|---|---|
| M-LEARNING-001 | P1 | S | open | Design-lesson strip: progress ticks rebuild the whole strip and destroy the input/button the student is using (P28) | B (package B-LES-1 "lessons UI bugfixes", owner L-UI; no main.ts change) | - |
| M-LEARNING-003 | P2 | XS | open | Worksheet count fields: the number shown can differ from the number used to generate sheets (B7 + NEW-storage-4) | B (package B-LES-1, owner L-UI) | - |
| M-LEARNING-004 | P2 | S | open | Worksheet/author views: one flusher and retained view per tab open; an older failed save can overwrite newer edits; random class code changes on every open (B8 + NEW-storage-6) | B (package B-LES-1; coordinate with R3.5 if it touches lesson-mode page routing) | M-LEARNING-003 |
| M-LEARNING-005 | P2 | XS | open | Numeric drafts: after 1000 remembered fields (or a 1000-character text) typing into any new numeric field silently does nothing (B6) | B (storage-hardening package, with storage group B1-B3/P7; touches only numeric-drafts.ts) | - |
| M-LEARNING-027 | P2 | S | open | Version the placement bank and keep complete attempt history (attempts currently regraded against the current bank) | B (data-safety; before any bank edit) - T-ASSESS | - |
| M-LEARNING-010 | P3 | S | open | Grader never ends a crewed failed flight that ends on escape-system parachutes (lessons without endEvent) | B (T-LES-1) | - |
| M-LEARNING-011 | P3 | S | partial | Pack-lesson listing and id edge cases (WebMCP/check page before packs load; teacher file reusing a pack id) | B (T-LES-1) | - |

### 2. E track - identical-output efficiency/refactor

| id | P | effort | status | title | placement | depends on |
|---|---|---|---|---|---|---|
| M-LEARNING-002 | P3 | S | open | Shared answer-form builder for the flight, design and case lesson strips (D10, identical-output refactor) | E (package B-LES-1, after M-LEARNING-001) | M-LEARNING-001 |
| M-LEARNING-006 | P3 | S | open | Export helpers: de-duplicate CSV/escape/download/file-name code while keeping each variant's options byte-for-byte (D12) | E (identical-output; export contract owner per PLAN 8.6 must approve any harmonisation) | - |
| M-LEARNING-024 | P3 | L | partial | Built-in lessons, worksheets and question banks as data files read through the same parser as teacher files (byte-identical migration) | E (identical-output) / Q | M-LEARNING-025 |

### 3. Q track - guard tests and engineering quality

| id | P | effort | status | title | placement | depends on |
|---|---|---|---|---|---|---|
| M-LEARNING-009 | P2 | M | open | Lesson tolerance and rubric honesty audit: every numeric tolerance >= the model's recorded error; ungraded steps labelled; uncertainty shown beside numbers students read | Q (lesson guard test) + T (brief review) | M-LEARNING-053 |
| M-LEARNING-014 | P3 | L | open | Teacher re-check: re-fly six-DOF flights and case lessons; compare a non-V8 engine; long-coast drift and TORU across engines | Q (R7.1 device/browser matrix adds Firefox/Safari recheck) + T | M-LEARNING-039 |
| M-LEARNING-036 | P3 | M | open | Typed i18n keys (Key type from en.ts; ru/th typed) - per-language dictionary loading is the bundle group's P1 | Q (identical output), after the bundle group's per-language split | M-LEARNING-029 |
| M-LEARNING-066 | P3 | XS | open | Credits completeness: tests/credits.test.ts (everything in public/ has a credit) + in-app Physics sources list includes Orbit/Build sources | Q (small guard) | - |

### 4. Owner decisions and master-plan sections (no code)

| id | P | effort | status | title | placement | depends on |
|---|---|---|---|---|---|---|
| M-LEARNING-054 | P0 | XS | open | RTAF Academy / NKRAFA (and NAPA) naming in the shipped rtaf-academy pack conflicts with D-2 - obtain written permission or neutralise the title | T (owner decision, immediate); code change XS | - |
| M-LEARNING-053 | P1 | M | open | T03 lesson packs: owner review and confirmations (code format, numbering, progress exclusion, per-lesson tolerances/payloads/named cases), then reviewed:true | T (owner decision lane; code change only to flip flags and regenerate JSON) | M-LEARNING-054 |
| M-LEARNING-055 | P1 | M | open | Reconfirm D-13/D-14 (first pilot GISTDA/Thai Space Consortium; first pack = Thai satellites on Orbit) and build that phone-safe first pack with Thai teacher notes | T (owner decision now; pack content T-PACK-2) | - |
| M-LEARNING-063 | P1 | XS | partial | Pedagogy principles and not-to-do list for the master plan (POE, cause from the record, formative default, one variable per experiment, curriculum first; no badges/LMS/forced placement/AI tutor; never weaken grading) | Master plan principles section (applies to every track) | - |
| M-LEARNING-064 | P2 | XS | open | Learning metrics measurable without analytics (time to first result on own phone, unaided task completion, explaining a failure cause, POE files, re-fly pass rate, learning gain) | Master plan metrics section; measured by M-LEARNING-050/051/062 | M-LEARNING-050 |
| M-LEARNING-072 | P2 | XS | open | Decision D-16: challenge scoring (recommended: pass/fail + margin in app, lesson-style progress, nothing beyond local storage, paper judge keys; scores never read physics internals) | T (owner decision register) | - |
| M-LEARNING-013 | P3 | XS | open | Formative vs summative use: answer keys live on the device; results checksum detects accidents, not forgery - decide scope before classroom pilots | T (decision register, owner) before M-LEARNING-056 pilot | - |

### 5. T track - human-evidence lane (owner-run, no code)

| id | P | effort | status | title | placement | depends on |
|---|---|---|---|---|---|---|
| M-LEARNING-050 | P1 | M | partial | Human-evidence track H1: merge the two study protocols and run user-study round 1 (5-6 people: Thai students + cadets, own phones), with stop-list, hardware question and FINDINGS | T (new human-evidence lane, owner-run; runs in parallel with R2 close-out, no code) | M-LEARNING-047 |
| M-LEARNING-033 | P2 | M | open | Native-speaker review of Thai and Russian texts (24 lessons, 157 questions, packs, cases, Build) + fix Thai guillemets | T (human lane; owner + one RU reader) | M-LEARNING-030 |
| M-LEARNING-028 | P3 | M | open | Question-bank item statistics (difficulty/discrimination) and human editorial sign-off of the 157-question bank | T (human evidence lane) | M-LEARNING-050, M-LEARNING-062 |
| M-LEARNING-051 | P3 | M | open | User-study round 2 (5-6 new people on own phones) + native RU/TH copy PR | T (human lane) after round 1 changes ship | M-LEARNING-050 |

### 6. Existing PLAN R-tasks (R3.4, R3.5, R7.2)

| id | P | effort | status | title | placement | depends on |
|---|---|---|---|---|---|---|
| M-LEARNING-018 | P2 | M | partial | Lesson fail strip explains itself: value vs bound vs moment per failed criterion, debrief also after a fail, diagnosed cause from the shared diagnosis module | R3.5 (lesson half of A02/S11), T-LES-2; content gated on user-study round 1 | M-LAUNCH-063, M-LEARNING-050, M-LEARNING-002 |
| M-LEARNING-067 | P2 | M | partial | Release 1.0 for institutions: semver tag, GitHub Release with dist zip + SHA256SUMS + build-info, CHANGELOG catch-up (#71-#74), optional Zenodo DOI; release cadence decision D-20 | R7.2 (extend from "verified Pages deploy" to a versioned distributable) | - |
| M-LEARNING-038 | P3 | M | open | Build/satellite phone layout and localisation gaps (validator/store details English-only, pack design names untranslated, RU 360 px tab rows, Fly-it menu cut, design-lesson strip 42 % of screen) | R3.4 (Build owner B) - counted once with the Build group | - |
| M-LEARNING-068 | P3 | S | partial | Second hosting mirror + written rollback rule for institutions | R7.2 | M-LEARNING-067 |

### 7. T track - Thai/Russian language and i18n (T-I18N)

| id | P | effort | status | title | placement | depends on |
|---|---|---|---|---|---|---|
| M-LEARNING-029 | P1 | S | open | Apply decided Thai terms D5 (guidance = การนำวิถี, navigation = การนำร่อง) everywhere + deny-list test | T (T-I18N-1; i18n dictionary owner per PLAN §6 rule 3; one PR) | M-LEARNING-027 |
| M-LEARNING-030 | P2 | S | open | docs/GLOSSARY.md as the single EN/TH/RU source (moved from PHYSICS.md) with GNC rows (guidance, navigation, PEG, IGM, margins, notch) | T (T-I18N-1) | M-LEARNING-029 |
| M-LEARNING-032 | P2 | M | open | Glossary at point of use: term chips/abbr with tap-to-define one-sentence Thai definitions, generated from GLOSSARY.md | T (T-I18N-3), after user-study round 1 seeds the terms | M-LEARNING-030, M-LEARNING-050 |
| M-LEARNING-031 | P3 | M | open | Other Thai term spellings: stage (ท่อน vs ขั้น), fairing, telemetry, payload, apogee/perigee, max-Q | T (T-I18N-2; owner decides each term, then one sweep PR) | M-LEARNING-030, M-LEARNING-033 |
| M-LEARNING-034 | P3 | S | open | Number and date localisation in learning/Build/Orbit text: chart ticks with locale decimal, Buddhist-era vs Gregorian years mixed on one page, ISO times in Build review | T (T-I18N-2) on top of the shared formatter (M-LAUNCH-036) | M-LAUNCH-036 |
| M-LEARNING-035 | P3 | XS | partial | Static <html lang="en"> and English-only social previews for a Thai audience | T (T-I18N-2; index.html is integration-owner territory) | - |
| M-LEARNING-037 | P3 | XS | open | Dead "under construction" copy: plan.orbit.lead ("Nothing on this page works yet") and lesson.comingSoon | T (T-I18N-2) | - |

### 8. T track - lesson integrity, lesson UX, assessment (T-LES, T-ASSESS)

| id | P | effort | status | title | placement | depends on |
|---|---|---|---|---|---|---|
| M-LEARNING-007 | P2 | M | open | Lesson 2.4: grade the Monte Carlo choice from recorded set evidence (complete 20-run set, chosen run is the extreme-perigee one) | T (T-LES-1 lesson-integrity package; Monte Carlo window provenance by the launch/UI owner, physics untouched) | - |
| M-LEARNING-008 | P2 | S | partial | Lesson 4.3 and six-DOF lessons: brief must state the graded window; decide whether to grade the 2 deg amplitude and 8 s hold; use or drop the unused stableOrbit hook | T (T-LES-1); step 2 rubric needs the owner | - |
| M-LEARNING-012 | P2 | S | open | Event log "Target orbit achieved ... period N min" gives away answers in pack lessons 11.2, 12.2, 13.1, 13.2 | T (T-LES-1) | - |
| M-LEARNING-016 | P2 | M | open | Lesson metadata (minutes, prerequisite, device, audience) on cards + "<= 10 min" filter; grey out desktop-only lessons on phones; phone lesson journey in Thai | T (T-LES-2 lesson UX) + R7.1 journey | M-LEARNING-050 |
| M-LEARNING-017 | P2 | S | open | "Show me" on a failed timed criterion: seek the timeline to the moment (max-Q, max-g, abort, insertion) and switch to the exterior camera | T (T-LES-2), after M-LAUNCH-062 provides the shared seek-to-event API | M-LAUNCH-062, M-LEARNING-002 |
| M-LEARNING-026 | P2 | S | partial | Placement test report: show denominators, call it placement not a grade, soften level words; then decide on more items or an adaptive second round | T (T-ASSESS) | M-LEARNING-027 |
| M-LEARNING-015 | P3 | S | open | Per-attempt evidence: keep a bounded attempt history (not only last + first pass); record flights without typed answers | T (T-LES-3), after storage parse cache P7 and M-LEARNING-027 | M-LEARNING-027 |
| M-LEARNING-021 | P3 | L | open | Lesson variants (seeded payload/altitude/time variants) with per-variant reveal lock and practice vs submit; new-variant retry after "show answers" | T (T-LES-3) | M-LEARNING-009 |
| M-LEARNING-022 | P3 | M | open | Worksheets tied to the lesson's mission (questions reflect the lesson, not a generic flight) | T (T-LES-3) | - |

### 9. T track - teacher/classroom and institutional (T-CLASS, T-INST)

| id | P | effort | status | title | placement | depends on |
|---|---|---|---|---|---|---|
| M-LEARNING-047 | P1 | S | partial | Privacy / PDPA statement and "what Orbitlab keeps on this device" inventory in three languages | T (T-INST-1; dialog copy by i18n owner) | - |
| M-LEARNING-042 | P2 | M | partial | Teacher-side restore and class view: merge a student archive per pass (not whole-collection replace), class aggregate table, iOS storage-eviction / Web Share note | T (T-CLASS-1) | M-LEARNING-027 |
| M-LEARNING-043 | P2 | M | open | Thai teacher guide (~10 pages) + Russian lab manual skeleton + anonymised lecturer feedback form | T (T-CLASS-2; owner writes, AI drafts structure) | M-LEARNING-029, M-LEARNING-047 |
| M-LEARNING-045 | P2 | S | open | Closed-network install guide EN/TH + serve:dist script + intranet-subpath offline journey | T (T-INST-1) + R7.1 journey | - |
| M-LEARNING-046 | P2 | M | partial | Intranet classroom kit + offline rehearsal on actual school devices (dist + chosen packs + teacher guide; USB/shared-folder result collection) | T (T-INST-1) + R7.1 device matrix | M-LEARNING-045, M-LEARNING-067, M-LEARNING-043 |
| M-LEARNING-056 | P2 | L | deferred | Pilot deployment at one institution from the release zip (install <= 30 min by a non-owner; data refresh once; log in docs/history/pilot-<site>.md) | T (T-INST-2), after release, guide, privacy, pack review | M-LEARNING-067, M-LEARNING-045, M-LEARNING-043, M-LEARNING-047, M-LEARNING-053, M-LEARNING-054, M-LEARNING-055 |
| M-LEARNING-069 | P2 | M | open | Maintainer guide + second maintainer (bus factor two before month 12; D-23) | T (T-INST-2; owner) | - |
| M-LEARNING-044 | P3 | M | open | Presentation mode for projectors (?present=1): hide panels, large text (>= 22 px at 1280x720), one chart + full viewport | T (T-CLASS-2), after D08/G2 freezes the R2 layout | M-LAUNCH-018 |

### 10. T track - curriculum, packs, pedagogy features (T-PACK, T-PED)

| id | P | effort | status | title | placement | depends on |
|---|---|---|---|---|---|---|
| M-LEARNING-019 | P2 | L | open | Predict-observe-explain (POE) criteria: kind:predict (answered before Launch, frozen) and kind:explain (free text, not auto-graded) | T (T-PED-1), after user-study round 1 | M-LEARNING-050, M-LEARNING-002 |
| M-LEARNING-052 | P2 | M | partial | Curriculum map (docs/CURRICULUM-MAP.md: IPST M.4-6 + academy syllabi) anchored to the catalogue by a test; >= 2 lessons per mapped outcome | T (T-PACK-1) | M-LEARNING-055, M-LEARNING-053 |
| M-LEARNING-020 | P3 | M | open | Misconception bank surfaced after a failed lesson or wrong prediction | T (T-PED-1) | M-LEARNING-019, M-LEARNING-018 |
| M-LEARNING-023 | P3 | M | partial | Experiment notebook: finish D-5 (checksummed .orbitlab-notebook.json file, attach to a lesson, embed in the HTML report, reject a two-change trial) | T (T-PED-2) | M-LEARNING-050 |
| M-LEARNING-025 | P3 | M | partial | Content pipeline: general lesson lint (npm run check:lesson), CONTRIBUTING-CONTENT, pack-submission issue template, account-free submission | T (T-PACK) | M-LEARNING-052 |
| M-LEARNING-057 | P3 | L | partial | Cadet control-system labs (G01-G08: Bode at max-Q, margins, notch, INS/Kalman, PEG/IGM, Monte Carlo) Russian-first with a lab-report section | T (T-PED-3; with the military/cadet group) | M-LEARNING-053, M-LEARNING-054, M-LEARNING-043 |
| M-LEARNING-059 | P3 | M | open | Write the remaining research lessons A5 (ISS passes over Bangkok, new frozen case), P4 (six-DOF thrust off CoM), R4 (state feedback, heavy calibration) | T (T-PACK-2) after pack review | M-LEARNING-053, M-LEARNING-009 |
| M-LEARNING-060 | P3 | S | open | D06/D07 learning outcomes document (eclipse/DoD, station-keeping, GSD, link margin, drag/lifetime, requirements->trade) with POE lesson skeletons | T (T-PED-2) | - |

### 11. T track - game layer (T-GAME)

| id | P | effort | status | title | placement | depends on |
|---|---|---|---|---|---|---|
| M-LEARNING-073 | P2 | L | open | X01 challenges: Thai-context Orbit challenges (THEOS-2 pass over Bangkok, GEO slot over Thailand, flood-mapping swath, repeat track) + school "Orbitlab Challenge" set with printable rules | T (new game track T-GAME-1), after D-16 and user-study round 1 | M-LEARNING-072, M-LEARNING-050, M-LEARNING-016 |
| M-LEARNING-074 | P3 | M | open | Launch challenges (heaviest payload from Sriharikota, ISS plane window, engine-out survival, droneship landing, Electron SSO) + "Highlights" on Watch | T (T-GAME-1) after X01 framework | M-LEARNING-073 |

### 12. Deferred / other

| id | P | effort | status | title | placement | depends on |
|---|---|---|---|---|---|---|
| M-LEARNING-058 | P3 | XL | deferred | Cadet course "Space domain awareness basics" (8 chapters: conjunction, overflight, re-entry, DOP, debris, HADR, NAPA-2 lifetime, capstone) | T (deferred; military group prerequisites) | M-LEARNING-057 |
| M-LEARNING-061 | P3 | L | deferred | Capstone path "From Sputnik to the Moon" with notebook portfolio export and flown-missions timeline on Home | T (deferred; overlaps X02 campaign) | M-LEARNING-023, M-LEARNING-073 |
| M-LEARNING-062 | P3 | L | deferred | Evaluation study from results files (scripts/analyse-results.ts: checksum verify, pre/post gain, item statistics; EVALUATION report) | T (deferred until a pilot) | M-LEARNING-056 |
| M-LEARNING-070 | P3 | L | deferred | Validation paper (venue D-24) based on the citable validation report | T (deferred; owner) | M-LEARNING-067 |
| M-LEARNING-075 | P3 | XL | deferred | X02 campaign from the first orbit (1957) to the Moon | T (deferred; after X01 and Moon L01-L03) | M-LEARNING-073, M-LEARNING-061 |

## 3. Proposed execution order inside this group

Owner requirement 1 (identical output first) and 2 (never lower quality) shape the order. Owner/human work runs in parallel with code and with the R2 close-out, because it changes no code.

- **L0, now (owner, no code, parallel with R2 close-out):** M-LEARNING-054 (RTAF naming vs D-2, **P0**), M-LEARNING-055 (reconfirm D-13/D-14), M-LEARNING-072 (D-16), M-LEARNING-053 (start pack review), M-LEARNING-050 (merge protocols, recruit, run round 1), M-LEARNING-047 (owner approves privacy text), M-LEARNING-063/064 (principles and metrics written into the master plan), M-LEARNING-013 (formative vs summative statement).
- **L1, first code wave (small, L-UI and i18n owners, after R2 close-out frees the integration owner):** package B-LES-1 = M-LEARNING-001 (P28) + 002 (D10, identical) + 003 (B7/NEW-storage-4) + 004 (B8/NEW-storage-6); M-LEARNING-005 (B6) in the storage-hardening package; M-LEARNING-027 (bank version) then M-LEARNING-029 (D5 sweep + deny-list) and 030 (GLOSSARY.md); M-LEARNING-008 step 1 (4.3 brief), 012 (period redaction in lessons), 037 (dead copy), 054 code part (rename if no permission), 047 code part (privacy section), 006 (D12, identical).
- **L2, lesson integrity and teacher readiness:** M-LEARNING-007 (lesson 2.4 evidence), 009 (tolerance guard test), 010, 011, 026 step 1, 016 (lesson metadata + phone path), 045 (intranet guide), 043 (teacher guide), 066, 067 (release, R7.2), 042.
- **L3, after user-study round 1 and R3.5/R2.4b primitives:** M-LEARNING-018 (fail strip; needs M-LAUNCH-063), 017 (show-me; needs M-LAUNCH-062), 019 (POE), 032 (glossary at point of use), 052 (curriculum map), 055 content (Thai-satellites pack), 073 (X01 after D-16), 046 (real-device rehearsal), 023, 015, 022, 024/025, 036 (after the bundle group's per-language split).
- **L4, deferred/gated:** 020, 021, 014, 028, 031, 033 (owner hours, can start any time), 034, 035, 038 (R3.4), 044 (after D08/G2), 051, 056-062, 068-070, 074, 075.

## 4. Conflicts resolved (verdict from code on da67341)

| # | Conflict | Verdict |
|---|---|---|
| CL1 | Thai D5 terms: DECISIONS lists D5 as decided (2026-09-28); DEVPLAN/REMAINING say "not applied"; counts differ (12 vs 9/12/8) | Not applied. th.ts has การนำวิถี 9 / การนำทาง 12 / การนำร่อง 8; การนำทาง also in review.ts (1), bank/guidance.ts (4), track2.ts (3), catalog.ts (1), ru-24-05-06 pack (2). No deny-list. -> M-LEARNING-029, P1. |
| CL2 | D-2 (no academy/service names without written permission) vs shipped rtaf-academy pack | Breach is live: rtaf-academy.ts:32,34 show "Royal Thai Air Force Academy"/"โรงเรียนนายเรืออากาศ" in the UI. -> M-LEARNING-054, P0 owner decision. |
| CL3 | D-13 (first pack = Thai satellites for GISTDA, CURRICULUM-MAP, docs/th) vs T03 delivery (five IPST/RTAF/RU packs) | Delivery diverged; none of the D-13 artefacts exist. The owner must reconfirm or revise D-13 and close D-14. -> M-LEARNING-055. |
| CL4 | User-study gate (S9 gates S11/S12/S16; "no redesign before users") vs shipped S12 notebook, top-bar redesign and R2 | Gate was bypassed for S12, navigation and R2. Verdict: keep the gate only for what is still unbuilt and content-heavy (diagnosis content in R3.5/S11, POE, glossary seeding, X01/X02). Run round 1 now; it costs no code. -> M-LEARNING-050. |
| CL5 | STATUS-INVENTORY/REMAINING: T01-T03, S12, S15, LES-03, LES-04 "not done" vs IMPLEMENTATION-STATUS "done" | Code confirms done: #/lessons/author, #/lessons/check + recheck worker, packs as files, src/experiments/notebook.ts, archives, passedWithHelp/clearRevealed. -> M-LEARNING-039/040/041/049 (done), remainders in 014/023/042/053. |
| CL6 | D-5 notebook format (standalone checksummed .orbitlab-notebook.json, model in src/lessons/notebook.ts) vs shipped store | Partial: shipped as profile-owned orbitlab.experiments.v1 with plain JSON download (notebook.ts:155), no checksum/attachment/report embedding; D-5 cites the wrong path. -> M-LEARNING-023 (additive format, correct the decision text). |
| CL7 | Panel 11-08 (keep permanent reveal lock) vs owner D-6 | D-6 wins and is implemented. -> M-LEARNING-076 superseded, M-LEARNING-049 done. |
| CL8 | 11-11 per-language dictionaries order (copy/glossary first, typed keys solo, dynamic import last "only if a perf journey needs it") vs review P1 (split before new keys arrive; measured EN -1.25 MB, TH -0.61 MB) | Both hold with one order: D5 sweep (string-only, small) first, then the bundle group's P1 split at a quiet merge point right after the R2 close-out and before R3 adds many keys, then typed keys (M-LEARNING-036) on the final layout. |
| CL9 | IMPLEMENTATION-STATUS "pack-lesson listing/id edge cases" (unknown status) | Partly fixed: built-in id collision reported (catalog.ts:84 takeLessons), count text reworded (en.ts:4425), writer refuses pack ids. Open: WebMCP tools never load packs; a hand-written file can still shadow a pack id. -> M-LEARNING-011 partial. |
| CL10 | Grader "never ends crewed failed flight on escape parachutes" (open problem) vs hooks.ts crewSafe accepting evt.abortCrewSafe | Still open for lessons without endEvent: COMPLETION_KEYS (grader.ts:79) lack escape events; track3 works only because it sets endEvent; pack 15.3 was made uncrewed. -> M-LEARNING-010. |
| CL11 | 9-14 "no IPST codes in UI before owner check" vs draft packs showing code chips | Breach mitigated only by the "Draft awaiting review" label. No code change before the owner review; resolve in M-LEARNING-053/052. |
| CL12 | CTX-QW-1 credits "quick win partial" vs DOC-06 "done" | Done except tests/credits.test.ts and the in-app Physics sources list (dialogs.ts:247-262). -> M-LEARNING-065 done + 066 open. |
| CL13 | INF-15/DOC-08 privacy: "partial" vs "open" | Deletion/reset done in R1; no privacy statement anywhere (README, USER-GUIDE, About). -> M-LEARNING-047 partial, P1. |
| CL14 | LES-11 says stableOrbit "unused/untested" | It now has a test (lesson-grading-end.test.ts:142) but no lesson uses it. -> M-LEARNING-008. |
| CL15 | Thai guillemets: REMAINING counts 20 « | origin/main th.ts has 25. Fold into the native-review mechanical fix (M-LEARNING-033). |
| CL16 | PED-H12-1 "learning outcomes before D06/D07 UI" | Ordering superseded (UI shipped in #46/#59); the outcomes document is still useful. -> M-LEARNING-060. |

## 5. Superseded or absorbed source items and why

- **11-08** (keep permanent reveal lock): superseded by owner decision D-6 (M-LEARNING-076).
- **PED-H12-1 ordering**, **P-1 / 9-06 gating as applied to S12, navigation and R2**: overtaken by delivery; the gate is kept only for unbuilt content (M-LEARNING-050, 063).
- **Vision rows section-1.2/1.3/1.4** (cadet labs, teacher toolkit, institution-ready releases): decomposed into M-LEARNING-057, 043/039/052/044, and 067/045/069/070; not kept as separate items.
- **LES-03, LES-04, S12, S15, T01-T03 "not done"** (STATUS-INVENTORY-era claims): superseded by delivery (#47, #59/#66, #70, R1).
- **INF-08, INF-09, DOC-07, DOC-06**: done by #44/#45/#56/#67; only the git tag/release (M-LEARNING-067) and the credits test (066) remain.
- **CTX-I-3M-8 / PED-H3-4 "teacher checker + backup"**: checker and backups done; only per-pass merge and class view remain (M-LEARNING-042).
- **LES-13 "no authoring UI"**: superseded by T01; its integrity half is M-LEARNING-013.

## 6. Items that belong to another area group

Learning-area rows routed to an item another group already owns (not duplicated here):

| source row | owned by |
|---|---|
| other-docs:S5-2 / A8 | M-ORBIT-001 (Thai satellites stale copy) |
| remaining-th-part2:I18N-01 | M-ORBIT-001 (Thai satellites stale copy) |
| remaining-th-part2:I18N-02 | M-LAUNCH-060 (equations "no air" on pad) |
| remaining-th-part2:FONT-01 | M-LAUNCH-058 (Thai typography / clipping) |
| remaining-th-part1:LUI-03 | M-LAUNCH-063 (diagnosis module; lesson half = M-LEARNING-018) |

Learning items here that are shared with another group (count once in the master plan):

- M-LEARNING-005 (B6 numeric drafts): storage-hardening package with the storage group (B1-B3, P7).
- M-LEARNING-006 (D12): the byte-changing follow-up NEW-UI-5 (CSV formula guard, \r quoting, 5 s revoke) is the UI/launch group's.
- M-LEARNING-018: lesson-strip half of the diagnosis debrief; the core module is M-LAUNCH-063 (R3.5).
- M-LEARNING-017: needs M-LAUNCH-062 (R2.4b event jump row) for seek-to-moment.
- M-LEARNING-034: needs M-LAUNCH-036 (shared ui/format.ts).
- M-LEARNING-036: per-language dictionary loading is review P1 (bundle/perf group); only typed keys are here.
- M-LEARNING-038: Build phone/localisation gaps are Build-group R3.4 acceptance.
- M-LEARNING-057/058: cadet labs and SDA course depend on the military group (DOP, debris, HADR tools).
- M-LEARNING-073/075: X01 builds on the Orbit playground (orbit group); X02 needs Moon L01-L03.
- M-LEARNING-067/068: release and mirror extend PLAN R7.2 (CI/docs group).

## 7. Things the master plan must not miss

1. **PLAN.md v1.2 has no pedagogy, teacher, Thai-language or institutional lens.** About 60 open learning items have no R-task. A T track (T-LES, T-ASSESS, T-I18N, T-CLASS, T-INST, T-PACK, T-PED, T-GAME) and a separate **human lane** (owner decisions, reviews, user study, teacher guide) are needed.
2. **One live P0:** the shipped rtaf-academy pack names the academy in the UI against D-2.
3. **Files read by tests:** `docs/ROADMAP-PART2-3.md` (drives the Campaign "coming" list with X01/X02; parsed by section-plan/section-nav-model tests) and `docs/history/phase4-2026-10-01/T03-CURRICULA-RESEARCH.md` (tests/lesson-review.test.ts). Game-layer and pack work must update them consistently, not move or reformat them.
4. **Pack JSON is generated** from `src/lessons/pack-sources/*.ts` by `scripts/lesson-packs.ts --check`; tests assert `reviewed:false`. Only a named human review may flip it (never fill an approval on someone else's behalf).
5. **Text-only language sweeps change bytes** in worksheets, DOCX and possibly snapshots. Treat these as intended copy changes reviewed line by line. Do not re-record snapshots in bulk (project rule: no snapshot/golden rewrites).
6. **Grading changes must not regrade stored passes** (passedRecord). Version the lesson file, and version the question bank (M-LEARNING-027) before any bank edit, including the D5 sweep of bank/guidance.ts.
7. **No analytics, ever:** every learning metric comes from study sessions and results files (M-LEARNING-064, 071).
8. **Privacy statement before any pilot.** It is more pressing since R1 added named learner profiles on shared devices.
9. **P28 is the most user-visible lesson bug** (about 100 strip rebuilds per design check steal focus). Its fix is small, but announce live-region progress at a throttled rate so screen-reader users get no noisier output.
10. **Storage cost of learning features:** per-keystroke worksheet/author writes (B7 option 1) and attempt history (M-LEARNING-015) add write traffic. Land the storage parse cache (review P7, storage group) first, or choose the write-light option.
11. **Sequencing with the bundle group:** D5 sweep first, then the per-language split (P1) before R3 adds keys, then typed keys.
12. **Two study protocols exist with clashing ids** (UX-01/UX-02). The merged protocol needs new ids (for example H1-xx).
