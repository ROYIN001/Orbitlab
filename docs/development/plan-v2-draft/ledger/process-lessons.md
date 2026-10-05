# Process lessons the master plan's working rules should keep

These lessons come from the documents outside PLAN/PROGRESS/VERIFICATION/ROADMAP/DEVELOPMENT-PLAN/REMAINING-WORK.

Each lesson is tagged:
- **[in PLAN]**: PLAN.md v1.2 §6, §9 or §10 already states it. Keep it.
- **[add]**: PLAN.md does not state it yet.

## A. Ownership and parallel agents

1. **One writer per hotspot file per wave.** `main.ts`, shared CSS, i18n dictionaries, `data/vehicles.ts` and the physics runtime each have one owner per wave. Other agents hand their changes off; they do not edit those files themselves. [in PLAN §6]
   - Sources: ARCHITECTURE-PLAN; PLAN-2026-09-28 §4 "files owned / forbidden" per session; HANDOFFS.
   - What went wrong: parallel agents broke each other's gates (HANDOFFS Report 1 and Report 6 "FOREIGN, blocks the green gate").
2. **Scratch probes must never break the build, and agents must not delete each other's scratch.** `tests/probe/` is gitignored but `tsconfig` includes it, so one agent's probe broke `npm run build` for everyone. Each agent deleted another agent's probes. Keep a per-agent scratch directory outside the TypeScript project. [add]
   - Source: HANDOFFS Report 2, Report 4 and Report 9.
3. **Each session is one branch and one PR, with a session note.** The note records what was done, decisions made inside the scope, browser evidence and a "handed off / out of scope" list. Sessions do not edit the shared status file; the integrator updates it. [in PLAN §12, partly]
   - Sources: PLAN-2026-09-28 rules; notes-S*.
   - The handed-off lists were never swept, and several items stayed open for a week (S2a `thaiId`, S7 regex/CSS). [add] **Every handoff list gets an owner and is re-checked at the next gate.**
4. **When a scope decision is needed, ask it as options with a recommendation.** Do not widen the scope yourself. Record the answer with its date, so a later prompt cites it instead of asking again (ADR-lite). [add a pointer to the single decision register]
   - Sources: PLAN-2026-09-28 rules; LESSONS-2026-09 and PARALLEL-GNC decision tables; DECISIONS.md header.
5. **Track that decisions are followed through.** D-12 (split PR #36) and D-13 (GISTDA Thai-satellite pack first) were decided and then not followed. D-27 (measure phones before choosing the default model) and D-2 (no academy names in the UI) have no check at all. Each decision needs a "where it lands" check and a status. [add]
6. **Add development dependencies one at a time, each with a written reason. three.js stays the only runtime dependency.** [add]
   - Sources: DECISIONS D-17; ARCHITECTURE-PLAN principle.

## B. Evidence honesty

7. **Keep evidence kinds apart: software tests, flight-data comparison, browser checks and human study.** [in PLAN §1]
   - An automated browser run is not observation of learners (Stage 1).
   - A viewport emulation is not a physical phone or a screen reader (SIXDOF-BROWSER-QA, Stage 2).
   - Reading every question is not an editorial board or item statistics (audit 2026-09-29).
8. **Label unverified claims as hypotheses, and keep failed-before-fix evidence.** Do not report pre-fix runs as passes. Do not add re-runs into "unique" totals. [in PLAN §9.2, partly]
   - Sources: Stage 1 evidence boundary; audit-2026-09-29 README ("ผลเก่าเก็บแยก").
9. **Fix acceptance criteria before running.** When a criterion is missed, report the miss; do not loosen it. A tolerance set after seeing the flight must say so in the lesson or document. [in PLAN §9.2 item 8; add the lesson/tolerance disclosure rule]
   - Sources: IMPLEMENTATION-STATUS (M03 re-entry criteria fixed before, then missed and reported; T03 "two tolerances were set after the flight, and say so"); T03-OWNER-REVIEW.
10. **Do not fit acceptance gates to themselves, and do not present fitted constants as sourced.** Reviews caught a fleet gate made self-referential, "measured" constants that did not reproduce, and fitted heat-flux limits documented as operator placards. **An independent reviewer re-runs the headline numbers.** [add]
    - Source: HANDOFFS Review 5 and Review 10.
11. **Count verification coverage.** The 09-30 review verified only 1 of 17 P2 findings when its reviewer's quota ran out, and said so. Plans must state how many findings were independently confirmed. [add]
12. **Never fill in a human approval on someone else's behalf.** Packs stay `reviewed:false` and the review checklist stays blank until a named person reviews. No invented teacher approval or classroom timing. [add]
    - Sources: LESSON-REVIEW-CHECKLIST; STAGE3-4; T03-OWNER-REVIEW.

## C. Provenance and release

13. **One result belongs to one source SHA and one runtime.** Record the commit, Node/Chromium version and snapshot hashes for every run. Do not aggregate mixed-source results. A Node or V8 upgrade can change bit-exact fingerprints with no code change. [in PLAN §9.2 item 2; add the Node pin, which is open decision D-3/D-4]
    - Sources: audit-2026-09-29 source-provenance bridge; runtime-fingerprint-validation; DECISIONS D-3/D-4.
14. **Merged, deployed and live are three different states.** Check the deployment record and the About/build stamp. A local preview or a CI pass is not proof that the site is deployed. Scheduled GitHub runs can start about 6.5 h late. [in PLAN §10.3]
    - Sources: CHECKPOINT/CONTINUE-PHASE-6 ("verify Pages before claiming live"); R1 reports; IMPLEMENTATION-STATUS (cron delay).
15. **Keep evidence packets out of `docs/`.** Logs, Word files and archives go to Release assets or an external store; `repo-hygiene.test.ts` enforces this. Links into removed files must be rewritten when a packet is trimmed; the audit-2026-09-29 README still links to 60 removed files. [add]
16. **Keep the changelog and user docs current with every merged PR.** R1 (#71–#73) shipped without CHANGELOG, README, USER-GUIDE or IMPLEMENTATION-STATUS updates. Make "docs touched or N/A" a PR checklist line. [add]
17. **Markdown read by code or tests is part of the build.** `ROADMAP-PART2-3.md`, `SIXDOF-VEHICLE-DATA.md` and `T03-CURRICULA-RESEARCH.md` are read by tests or the app. CI's Markdown-only exemption must re-include them, and doc reorganisations must not move them silently. [add]
    - Source: R1.5 report.

## D. Browser and CI practice

18. **Await explicit readiness, never inflate timeouts, never retry blind.** [in PLAN §9.2 item 7]
    - Wait for the document and app lifecycle on intentional reloads.
    - Put the failing case and action in CI's first error line.
    - Run each journey in a fresh browser.
    - Sources: R1-release-navigation; WEBGL-STARTUP.
19. **Make software-WebGL runners usable.** Use device scale 0.5 and ANGLE/SwiftShader flags. Headless checks run at about 1–2 fps, so they cannot measure performance. In-app browser checks are unreliable when the pane is not in front, because `requestAnimationFrame` is throttled. [add as a test-harness note]
    - Sources: notes-S6; HANDOFFS Report 6.
20. **A journey must fail when its condition is false.** Prove it with a sabotage run. Anchor patterns, so the unanchored `tune.worker` regex cannot pass on `attitude-tune.worker` alone. [add]
    - Sources: PLAN-2026-09-28 S10 rule; notes-S4b sabotage check; notes-S7.
21. **Cheap gates go first: type, build, budget and the affected export journey before expensive physics sweeps.** Shared physics changes run heavy and six-DOF-fleet before merge, and re-record only the goldens of the vehicles touched, with the reason beside each. [in PLAN §9.2 items 1 and 8]
    - Sources: DECISIONS D-12; PLAN-2026-09-28.

## E. Product and pedagogy method

22. **Measure every lesson threshold on the real flight first, then test in a real browser.** In-browser behaviour differs from headless: a flight continues after insertion, J2 moves the elements, and late grading under time warp changes the result. Grade at the defined end instant. [add to the lesson-authoring rules]
    - Source: LESSONS-2026-09 "Found on the way".
23. **Decide user-facing scope from observed users where a protocol exists.** Fix the criteria before the sessions. If the owner overrides the gate, record the override, as should have happened with S12. [add]
    - Sources: USER-TEST-2026-10 §I; Stage 1.
24. **Follow the flight-profile method for realism.** Close the data against published masses, check propulsion and events before fitting, take the guidance structure from a source, fit as few scalars as there are targets, keep held-out checks, and keep a ledger. Do not borrow one vehicle's fitted values for another. [in PLAN §8]
    - Sources: FLIGHT-PROFILE-METHOD; the #64 neighbouring-branch lesson.
25. **Keep the architecture contract.** [add to working rules]
    - Physics stays free of DOM and Three.js, and deterministic (no unseeded random).
    - Rendering reads recorded frames only.
    - Every catalogue vehicle reaches its reference orbits with default guidance at 25, 50 and 90 % payload. Exclusions must be measured capability limits.
    - Every user-visible string goes through i18n in EN, RU and TH.
    - Source: ARCHITECTURE-PLAN.
26. **Use one precedence rule and one id namespace per document family.** Today four documents each claim to win conflicts, and D, U, R and UX ids collide. Prefix ids by namespace, and let the master plan state which document is authoritative for what: status, decisions, physics reference, or history. [add]
    - Source: doc-map C4/C5.
