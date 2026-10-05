# Document map: plan, status, audit and roadmap documents under `docs/`

Read-only survey of `main` at `fbefa18` (2026-10-03), made 2026-10-04. It covers every `.md` under `docs/` (103 files). The rows marked **[other ledger]** are being ledgered by other agents and are listed here only so the map is complete.

**Recommendation key:**
- **ABSORB:** move the live content into the master plan or the decision register.
- **REF:** keep the file and cite it as evidence or as a normative reference.
- **ARCHIVE:** historical. Move it under `history/`, or leave it in place with a banner. Do not cite it for current status.
- **KEEP-IN-PLACE:** code, tests or CI read this file. Do not move or rename it.

## 0. Constraints found while mapping (read before reorganising)

| Constraint | Evidence |
|---|---|
| `docs/ROADMAP-PART2-3.md` is read by tests | `tests/section-nav-model.test.ts:18` and `tests/section-plan.test.ts:16` load it with `import.meta.glob(...?raw)` |
| `docs/history/phase4-2026-10-01/T03-CURRICULA-RESEARCH.md` is read by tests | `tests/lesson-review.test.ts:8` |
| `docs/SIXDOF-VEHICLE-DATA.md` ships inside the app | `src/ui/dialogs.ts:18` imports it with `?url` |
| CI's "Markdown-only" exemption re-includes those three files | `docs/development/reports/R1.5-workflows.md`, final section |
| Source comments cite `docs/PHYSICS.md` (40+ files) and `docs/IMPLEMENTATION-STATUS.md` (`src/render/pads.ts`, `trails.ts`) | grep `docs/…md` in `src/` and `tests/` |
| `tests/repo-hygiene.test.ts` forbids `.zip/.log/.docx/.pdf` under `docs/`, and images over 200 kB | Any archive move must keep this |

## 1. Map

| Path | Date | Purpose | Status / superseded by | Overlaps | Recommendation |
|---|---|---|---|---|---|
| docs/README.md | 2026-10-01 | Reading-order index of 9 docs and a "Records" table | **Stale index.** It omits development/, DECISIONS, LESSON-REVIEW-CHECKLIST, stage1/, audit-2026-09-29/, history/2026-10-0x, phase4/, LESSONS-2026-09, PARALLEL-GNC and HANDOFF-G02. It lists USER-TEST (a top-level file) as a history Record, and SIXDOF-BROWSER-QA as current. | — | Rewrite it as the index. Entry 1 is the master plan. Add one precedence rule. |
| docs/DECISIONS.md | 2026-09-30 → 10-01 | Owner decision log: D-1…D-27 (11 decided, 1 deferred, 15 open), the 2026-10-01 top-bar decision, and earlier decisions | **Authoritative for owner decisions.** It claims precedence over older docs. PLAN.md never cites it, and its ids clash with PLAN D01–D09. | PLAN §4.1, DEVELOPMENT-PLAN-TH §10 [other ledger], PLAN-2026-09-28 §2, LESSONS-2026-09 and PARALLEL-GNC decision tables | ABSORB into one decision register: either this file with namespaced ids, or a master-plan section. Fold PLAN D01–D09 in. |
| docs/FLIGHT-PROFILE-METHOD.md | 2026-10-01 | The 8-step method and Tier A/B/C vehicle list | Authoritative normative method | PLAN §8.1–8.2, audit-2026-10-01 | REF (normative for R4) |
| docs/IMPLEMENTATION-STATUS.md | 2026-10-03 | "Where Orbitlab stands": features, experimental items, tests, roadmap tables, ~120 known limitations | **Claims authority, but stale in places.** No R1 profiles. G05 shown as "not started". Gives 9 906 tests. "Twenty further items" has no list. | PROGRESS.md, STATUS-INVENTORY, README Features, ROADMAP | ABSORB the roadmap tables as done-history. Keep the capability and known-limitations parts as REF; they are the main source of this ledger. Do not rename (cited by src comments). |
| docs/LESSON-REVIEW-CHECKLIST.md | 2026-10-03 | Blank human-review record template for lesson packs | Operational template; no review has been recorded | T03-OWNER-REVIEW | REF from the pack-review task |
| docs/PHYSICS.md | 2026-10-01 | Model reference, assumptions, glossary | Authoritative reference, cited by code | VALIDATION | REF / KEEP-IN-PLACE |
| docs/ROADMAP-PART2-3.md | 2026-09-26 / 10-01 | Orbit, Build, Moon and Campaign roadmap | [other ledger]; read by tests | IMPL-STATUS parts 2–3, STATUS-INV §3 | KEEP-IN-PLACE; the master plan absorbs its remaining phases |
| docs/SIXDOF-ACCEPTANCE.md | 2026-09-20 → 10-01 | Six-DOF gates and results | Evidence | SIXDOF-BROWSER-QA, CHECKPOINT | REF |
| docs/SIXDOF-BROWSER-QA.md | 2026-09-19/20 | Manual browser QA of six-DOF; memory calibration; open checks | **Historical and stale.** "Falcon Heavy unsupported → legacy" is no longer true. Its open checks were never closed in any later record. | SIXDOF-ACCEPTANCE, CHECKPOINT-2026-09-20 | ARCHIVE. Its open perf/memory checks are in the ledger. |
| docs/SIXDOF-VEHICLE-DATA.md | 2026-10-01 | Rigid-body data dossier | Authoritative; shipped in the app | — | KEEP-IN-PLACE |
| docs/USER-GUIDE.md | 2026-10-03 | User manual | Authoritative, but does not cover R1 learner profiles or reset | README | REF; docs task in ledger |
| docs/USER-TEST-2026-10.md | 2026-10-01 | Thai protocol: 5 tasks, forms, PDPA, the 5 wave-3 decisions | **Never run** (no RESULTS.md). The wave-3 gating was bypassed: the S12 notebook shipped in #70. | stage1 beginner-study.md (a second protocol), PLAN-2026-09-28 §7–8 | ABSORB its decisions into a "human evidence" track. Keep the protocol, merged with beginner-study, as the instrument. |
| docs/VALIDATION.md | 2026-10-01 | Simulator compared with flight data and published figures | Evidence. Some tables are historical without current provenance (Soyuz-2.1a LEO 7 021 kg against 8 140 kg today, per Stage 1). | stage1 validation-summary.json | REF |
| docs/development/PLAN.md | 2026-10-03 | Master plan v1.2 (Thai), R0–R7 | [other ledger] Base of the master plan | everything | — |
| docs/development/PROGRESS.md | 2026-10-03 | Progress index (R1 done) | [other ledger] | IMPL-STATUS | — |
| docs/development/VERIFICATION.md | 2026-10-03 | Verification rules | [other ledger] | PLAN §10 | — |
| docs/development/reports/R1-integration.md | 2026-10-03 | R1 integration and CI/Pages identities | Evidence for R1 | PROGRESS | REF |
| docs/development/reports/R1-release-navigation.md | 2026-10-03 | PR72 fix for navigation waits; a process lesson | Evidence | WEBGL-STARTUP | REF |
| docs/development/reports/R1-small-ui.md | 2026-10-03 | U08/U09/U16 small subsets; handoff naming the remaining R2.1/R2.2/R4 work | Evidence | PLAN R2 | REF |
| docs/development/reports/R1.1-storage.md | 2026-10-03 | Storage ADR outcome; limits (no auth, quotas, no flight resume) | Evidence; limits still true | PLAN R1.1 | REF |
| docs/development/reports/R1.2-profiles-ui.md | 2026-10-03 | Profile UI; follow-on (live-flight resume, online sync out of scope) | Evidence | PLAN R1.2 | REF |
| docs/development/reports/R1.3-gestures.md | 2026-10-03 | Gestures; handoff to R2.1/R2.2 | Evidence | PLAN R2 | REF |
| docs/development/reports/R1.4-fuel.md | 2026-10-03 | Finite-fuel invariants | Evidence | PLAN R5.3 | REF |
| docs/development/reports/R1.5-workflows.md | 2026-10-03 | CI/Pages changes; Markdown-consumer rule | Evidence; defines the KEEP-IN-PLACE constraint | PLAN §9 | REF |
| docs/stage1-2026-10-02/README.md | 2026-10-02 | Stage 1 baseline (perf, science, UX) and backlog SCI-01…QA-01 | **Historical baseline, partly done:** Stage 2 did UX-01 and part of PERF-01; Stage 3–4 did part of QA-01. SCI-01/03 and CONTENT-01 are in PLAN R4.3. SCI-02 (LTAN), UX-02 and CONTENT-02 are not in PLAN. | IMPL-STATUS limits, PLAN R4.3 | REF for the evidence JSON; ARCHIVE under history/ (PLAN links are SHA-pinned) |
| docs/stage1-2026-10-02/beginner-study.md | 2026-10-02 | Novice-study protocol and hypotheses UX-01…07 | **Never run.** Its ids clash with the README backlog's UX-01/UX-02. | USER-TEST-2026-10 | ABSORB: merge with USER-TEST into one protocol |
| docs/audit-2026-09-29/README-TH.md | 2026-09-30 | Index of the PR #41 acceptance packet (Codex) | Historical. Links to 60 `.log/.docx` files removed before merge. | — | ARCHIVE (move the whole packet under history/) and use as REF |
| docs/audit-2026-09-29/LOCAL-EVIDENCE-INDEX.md | 2026-09-30 | Index of raw evidence kept on a local PC | Historical | — | ARCHIVE |
| docs/audit-2026-09-29/audit-2026-09-28/Orbitlab-audit-TH.md | 2026-09-28 | Codex re-audit with a 09-30 banner | Superseded by Orbitlab-acceptance-TH. **Same file name as a different doc** (history/audit-2026-09-27/Orbitlab-audit-TH.md). | 09-27 audit | ARCHIVE, renamed |
| docs/audit-2026-09-29/audit-2026-09-28/executive-findings-TH.md | 2026-09-28 | 8 priority issues (L1, B1, B3, A28-01…) | Mostly fixed by #41. Residual: assessment bank version/history. | assessment-review | ARCHIVE; residual in ledger |
| docs/audit-2026-09-29/audit-2026-09-28/assessment-review.md | 2026-09-28 | Assessment audit | Fixed by #41 except versioning and item statistics | — | ARCHIVE |
| docs/audit-2026-09-29/audit-2026-09-28/assessment-question-matrix.md | 2026-09-28 | Matrix of 157 questions | Evidence | — | ARCHIVE |
| docs/audit-2026-09-29/audit-2026-09-28/build-review.md | 2026-09-28 | Build audit (B1–B3) | Fixed by #41 (design-store, engineer refresh) | — | ARCHIVE |
| docs/audit-2026-09-29/audit-2026-09-28/lessons-review.md | 2026-09-28 | Lesson/content audit | Fixed by #41; 4.3 deferral remains | — | ARCHIVE |
| docs/audit-2026-09-29/audit-2026-09-28/source-regressions.md | 2026-09-28 | Nine regressions re-checked | Done | — | ARCHIVE |
| docs/audit-2026-09-29/audit-2026-09-29/Orbitlab-acceptance-TH.md | 2026-09-30 | #41 acceptance report: §7 untested dimensions, §8 proposals not implemented | Historical; residual items in ledger | README-TH | REF / ARCHIVE |
| docs/audit-2026-09-29/audit-2026-09-29/RESUME-CHECKPOINT-TH.md | 2026-09-29 | Mid-run checkpoint | Superseded by the acceptance report (which says so) | — | ARCHIVE |
| docs/audit-2026-09-29/audit-2026-09-29/final-integration-review-TH.md | 2026-09-30 | Read-only diff review of 44 files; lesson 4.3 classification | Historical; 4.3 wording fix still partial | learning-followup-review | ARCHIVE; residual in ledger |
| docs/audit-2026-09-29/audit-2026-09-29/learning-followup-review-TH.md | 2026-09-29 | Snapshot size, copy errors, case definitions | Mostly fixed (case snapshot trimmed in `src/lessons/progress.ts`) | — | ARCHIVE |
| docs/audit-2026-09-29/audit-2026-09-29/coordination-focused-review-findings.md | 2026-09-29 | Independent P2/P3 findings | Fixed (RU heating text verified) | — | ARCHIVE |
| docs/audit-2026-09-29/audit-2026-09-29/final-coverage-draft-TH.md | 2026-09-29 | Draft coverage table | Draft, superseded | — | ARCHIVE |
| docs/audit-2026-09-29/audit-2026-09-29/physics-validation-TH.md | 2026-09-29 | Physics run checkpoint ("not yet complete") | Superseded by final-heavy-acceptance | — | ARCHIVE |
| docs/audit-2026-09-29/audit-2026-09-29/graphics-validation-TH.md | 2026-09-29 | Graphics handoff: no multi-GPU benchmark | Historical; GPU coverage gap remains | — | ARCHIVE |
| docs/audit-2026-09-29/audit-2026-09-29/runtime-fingerprint-validation-TH.md | 2026-09-29 | Node-runtime fingerprint cause | Evidence for DECISIONS D-3/D-4 | — | REF |
| docs/audit-2026-09-29/audit-2026-09-29/solver-boundary-validation-TH.md | 2026-09-29 | Kepler/Lambert boundaries; 48 Lambert nulls unproven | Evidence; residual in ledger | — | REF |
| docs/audit-2026-09-29/audit-2026-09-29/build-catalogue-matrix-TH.md | 2026-09-29 | 6 542-pair Build matrix | Evidence (16 GTO>LEO anomalies) | — | REF |
| docs/audit-2026-09-29/audit-2026-09-29/build-visual-42-validation-TH.md | 2026-09-29 | 42 Build images checked | Evidence (desktop EN only) | — | ARCHIVE |
| docs/audit-2026-09-29/audit-2026-09-29/import-export-checklist-TH.md | 2026-09-29 | C01–C34 import/export journeys | Evidence | — | ARCHIVE |
| docs/audit-2026-09-29/audit-2026-09-29/{browser-flight-draft-final, docx-pagination-validation, ui-case-export-validation, worksheet-case-editorial, worksheet-case-export-layout, worksheet-language-validation, soundtrack-offset-fix, progress-storage-recovery, orbit-background-followup}-TH.md | 2026-09-29/30 | Focused fix and validation records | Done | — | ARCHIVE |
| docs/audit-2026-09-29/audit-2026-09-29/editorial-audit/{bank-editorial-review, lesson-editorial-review, basics-failures-editorial-review}-TH.md, and editorial-basics-failures-TH.md | 2026-09-29 | Editorial reads of the bank, lessons and cases | Evidence. The last two are near-duplicates (same title, differ from byte 89). Not a human editorial sign-off. | — | ARCHIVE; deduplicate |
| docs/audit-2026-09-29/audit-2026-09-29/actions-heavy-fallback/{README, ci-architecture-diagnosis-TH}.md, actions-heavy-results/36631307401/final-heavy-acceptance-TH.md, …/browser-36634805813/…/summary.md, browser-export-artifacts/README-TH.md | 2026-09-29/30 | CI, heavy and browser evidence | Evidence | — | ARCHIVE |
| docs/history/2026-10-01-soyuz21b-sso-burn-order.md | 2026-10-01 | #64 notes. Left open: Fregat coast-turn gas; six-DOF cut-off on osculating apoapsis. | Evidence; residual is in PLAN R4.3 | PLAN §8 | REF |
| docs/history/2026-10-02/STAGE2.md | 2026-10-02 | Stage 2 record (bundle, phone nav, preflight) | Done | stage1 | REF / ARCHIVE |
| docs/history/2026-10-03/STAGE3-4.md | 2026-10-03 | Stage 3–4 record. Limits: offline classroom rehearsal, pack review, source fetch. | Done, with residuals | PLAN refs | REF |
| docs/history/2026-10-03/WEBGL-STARTUP.md | 2026-10-03 | WebGL recovery and CI timeout investigation | Done; root causes unproven | PLAN §9.1 | REF |
| docs/history/ARCHITECTURE-PLAN.md | 2026-09-16 | Branch plan and **architecture contract** | Waves done. The contract (frame-driven render, DOM-free deterministic physics, fleet at 25/50/90 %, i18n) is still in force but PLAN.md does not restate it. | PLAN §4.2/§6 | ABSORB the contract into the working rules; ARCHIVE the rest |
| docs/history/AUDIT-2026-09-16.md | 2026-09-16 | Code audit B1–B42 | Historical; B-ids cited in source comments | HANDOFFS | ARCHIVE / KEEP-IN-PLACE (cited) |
| docs/history/CHECKPOINT-2026-09-20.md | 2026-09-19/20 | Six-DOF phase status | Superseded by IMPL-STATUS (docs/README says so) | CONTINUE-PHASE-6 | ARCHIVE |
| docs/history/CONTINUE-PHASE-6.md | 2026-09-19/20 | Thai handover | Superseded | CHECKPOINT | ARCHIVE |
| docs/history/DELIVERY-2026-09-17.md | 2026-09-17 | First delivery summary | Historical | — | ARCHIVE |
| docs/history/HANDOFF-G02-BURNS.md | 2026-09-24 | Move in-orbit burns onto the navigation estimate | **Open.** `knownState()` is defined but `sim/burns.ts` does not use it. | PARALLEL-GNC G02 | ABSORB as a task |
| docs/history/HANDOFFS.md | 2026-09-17 | Wave-2 open items (reports/reviews 1–17) | Mostly superseded. Spot checks show these done: piecewise axis, Line2 lines, Earth normal map, CSV dedupe, crewDragon split, Atlas payloadSSO. | AUDIT-2026-09-16 | ARCHIVE (no carry-over beyond what is in PLAN §8, e.g. F9 max-Q) |
| docs/history/LESSONS-2026-09.md | 2026-09-25/26 | E03/E05/P08 build record and owner decisions for lessons/placement | Historical. Its decisions tables still define lesson product rules. 2.4 grader limit still open. | DECISIONS | REF; copy its decision rows into the register |
| docs/history/PARALLEL-GNC-2026-09.md | 2026-09-24/25 | GNC items record, owner decisions Q0…, G05 known issues | Historical; known Monte Carlo issues "left for the owner" | HANDOFF-G02 | REF; carry known issues |
| docs/history/RELEASE-REVIEW-2.md | 2026-09-17 | Release review 2 | Historical | — | ARCHIVE |
| docs/history/SIXDOF-UI-SOURCE-REVIEW.md | 2026-09-19 | Six-DOF UI source review | Historical | — | ARCHIVE |
| docs/history/audit-2026-09-27/Orbitlab-audit-TH.md | 2026-09-27 | Usage audit A1–A19, ideas I1–I9, 10 regression tests | Historical. A-items fixed (#27–#34, #41, #53); I-ideas went to PLAN-2026-09-28. | 09-28 Codex audit | REF |
| docs/history/audit-2026-09-27/PLAN-2026-09-28.md | 2026-09-28 | Fix plan in waves; sessions S1–S16 with prompts | **Superseded.** Wave 1 done; S7 and S9 done. S12, S14 and S15 superseded by #40/#70/R1. S5 (copy/glossary/terms), S8-2, S4c, S10, S13 and S16 have residuals. | USER-TEST, STATUS-INV §4, DEVELOPMENT-PLAN-TH | ARCHIVE; residuals in ledger |
| docs/history/audit-2026-09-27/{code-review, learning-review, orbit-review}.md | 2026-09-27 | Source reviews behind the A-items | Historical | — | ARCHIVE |
| docs/history/audit-2026-09-27/notes-S1, S2a, S2b, S3, S4a, S4b, S6, S7, S9.md | 2026-09-27 → 10-01 | Session notes | Historical. Residuals: S2a thaiId, S7 regex/CSS, S6 CSV final row (unverified). | — | ARCHIVE |
| docs/history/audit-2026-10-01-flight-profile.md | 2026-10-01 | Steps 1–3 audit of 8 vehicles, implementation order, "what the auditors missed" | Evidence; PLAN R4.1 requires an item-by-item recheck | FLIGHT-PROFILE-METHOD | REF (R4 input) |
| docs/history/phase4-2026-10-01/T03-CURRICULA-RESEARCH.md | 2026-10-01 | Curricula research for T03 | Evidence; read by tests | T03-OWNER-REVIEW | KEEP-IN-PLACE |
| docs/history/phase4-2026-10-01/T03-OWNER-REVIEW.md | 2026-10-01 | What the owner must confirm for the five packs | **Open.** All packs `reviewed:false`. | LESSON-REVIEW-CHECKLIST | ABSORB as a decision/review task |
| docs/history/review-2026-09-30/README.md | 2026-09-30 | Index of the 09-30 review | Historical; precedence sentence truncated | — | ARCHIVE |
| docs/history/review-2026-09-30/STATUS-INVENTORY-TH.md | 2026-09-30 | Status at `404eb0c` | **Superseded.** Phase 4, S7, S9, S12 and S15 have since been done. | IMPL-STATUS | ARCHIVE; residuals in ledger |
| docs/history/review-2026-09-30/PR41-CODEX-REVIEW-TH.md | 2026-09-30 | Review of PR #41 | #41 merged (`b674ccb`) | — | ARCHIVE |
| docs/history/review-2026-09-30/DEVELOPMENT-PLAN-TH.md, REMAINING-WORK-TH.md | 2026-09-30 | Next-level plan; ~130 findings | [other ledger] | — | — |
| CHANGELOG.md (repo root) | — | One line per merged PR | **Incomplete:** no entries for #71–#73 (R1). No tagged release; version 0.1.0. | PROGRESS | Fix, and tie to R7.2 |
| README.md (repo root) | — | Install, features, tests, layout | No roadmap or known-issues section. Does not cover R1 profiles. | IMPL-STATUS | Link to the master plan; docs task |

## 2. Contradictions between documents (status or direction)

| # | Contradiction | Side A | Side B | Code/git check |
|---|---|---|---|---|
| C1 | Status of G05 Monte Carlo | IMPLEMENTATION-STATUS roadmap table: "G05 Monte Carlo insertion accuracy — not started" | PARALLEL-GNC-2026-09.md l.89: "done 2026-09-25"; STATUS-INVENTORY §2: all 27 done | `src/physics/monte-carlo*.ts` and lesson 2.4 exist, so **B is right** |
| C2 | Size of the test suite | IMPLEMENTATION-STATUS: "9 906 tests in 255 files" | PROGRESS.md: "10,079 unit cases" | B is newer |
| C3 | Is R1 part of the product record? | PROGRESS.md: R1.1–R1.5 merged and published | IMPLEMENTATION-STATUS (updated 10-03), README, USER-GUIDE and CHANGELOG ("one line per merged PR") never mention profiles; #71–#73 are missing | git: `5eb18a2` touched none of those docs |
| C4 | Which document wins | docs/README.md: "where they disagree … the documents above are right" | DECISIONS.md: "this file is right"; IMPLEMENTATION-STATUS: "this file is right"; PLAN cites none of them; review-2026-09-30 README's precedence sentence is truncated | Needs one rule in the master plan |
| C5 | Decision-id namespaces | PLAN §4.1 D01–D09 (e.g. D03 = cockpit/manual first, D05 = reset scope) | DECISIONS D-3 = Node line (deferred), D-5 = notebook; roadmap D03 = parts builder; PLAN-2026-09-28 D1–D6. U, R and UX ids collide the same way. | — |
| C6 | Naming the academy in the UI | DECISIONS D-2: no service or academy name in UI, README or CITATION without written permission | The rtaf-academy pack ships the titles "Royal Thai Air Force Academy…" and "โรงเรียนนายเรืออากาศ…"; T03-OWNER-REVIEW still asks for permission | `src/lessons/pack-sources/rtaf-academy.ts:31–48` |
| C7 | First pilot and pack direction | DECISIONS D-13: first pack = Thai satellites on Orbit for GISTDA; `docs/CURRICULUM-MAP.md` and `docs/th/คู่มือครู.md` | T03 delivered five curriculum packs (IPST ×3, RTAF, RU 24.05.06); neither file exists | `ls docs/` |
| C8 | Gating wave 3 on the user test | USER-TEST-2026-10 / PLAN-2026-09-28 §8: S11, S12 and S16 only after user-test results | Notebook (S12) shipped in #70 and D-5 fixed its format; no test was run | `src/experiments/notebook.ts` |
| C9 | How PR #36 landed | DECISIONS D-12: accept #36 split into one-topic PRs | Merged whole as `17bd60f` (2026-10-01) | git log |
| C10 | Six-DOF coverage | SIXDOF-BROWSER-QA (listed as current doc #5): "unsupported Falcon Heavy selected legacy" | IMPLEMENTATION-STATUS: six-DOF for every vehicle (P01 done) | B is current |
| C11 | Phase 4, S12 and S15 status | STATUS-INVENTORY (09-30): Phase 4 "not started"; S12 and S15 "not done" | IMPLEMENTATION-STATUS: Phase 4 done; Stage 3–4 delivered notebook and backups | B is current |
| C12 | Default flight model on phones | DECISIONS D-27: decide after a 4×-throttle measurement | IMPLEMENTATION-STATUS: six-DOF is the default for every vehicle; no perf-budget journey exists | Decision not executed |
| C13 | Soyuz-2.1a computed LEO rating | VALIDATION.md:3082: 7 021 kg | stage1 README: current test gives 8 140 kg | Historical table without provenance |
| C14 | ISS docking "missing" vs "done" | PLAN U06: the ISS mission must continue to real docking | IMPLEMENTATION-STATUS G07: Soyuz MS already docks (3 profiles, 4 ports, Kurs/TORU) | Not a true conflict (PLAN §2 says reuse it), but the master plan must say "extend, don't rebuild" |
| C15 | Duplicate names | history/audit-2026-09-27/Orbitlab-audit-TH.md (27 Sep usage audit) | audit-2026-09-29/audit-2026-09-28/Orbitlab-audit-TH.md (28 Sep Codex re-audit), a different document | `cmp` differs |
| C16 | "Twenty further items kept for later" | IMPLEMENTATION-STATUS asserts they exist | STATUS-INVENTORY §2: no list anywhere in the repo | grep confirms |

## 3. Summary for the master plan

- **Still in force (reference):** DECISIONS (once namespaced), FLIGHT-PROFILE-METHOD, PHYSICS, VALIDATION, SIXDOF-ACCEPTANCE, SIXDOF-VEHICLE-DATA, USER-GUIDE, LESSON-REVIEW-CHECKLIST, the R1 reports, and the known-limitations section of IMPLEMENTATION-STATUS.
- **Absorb live content:**
  - USER-TEST and beginner-study, merged into one protocol.
  - T03-OWNER-REVIEW, as a pending owner/teacher/native review.
  - HANDOFF-G02-BURNS.
  - The architecture contract from ARCHITECTURE-PLAN.
  - The residual sessions of PLAN-2026-09-28.
  - The Stage 1 backlog residuals: SCI-02, UX-02, CONTENT-01/02, PERF-01.
  - The G05 known issues from PARALLEL-GNC.
- **Archive:** the whole `audit-2026-09-29/` packet (move it under `history/`, keep it as one unit, deduplicate), `stage1-2026-10-02/`, SIXDOF-BROWSER-QA, STATUS-INVENTORY, PR41 review, HANDOFFS, CHECKPOINT, CONTINUE-PHASE-6, DELIVERY, RELEASE-REVIEW-2 and SIXDOF-UI-SOURCE-REVIEW.
- **Do not move:** ROADMAP-PART2-3, SIXDOF-VEHICLE-DATA, T03-CURRICULA-RESEARCH. Code and tests read these files.
