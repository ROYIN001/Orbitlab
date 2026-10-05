# Unified ledger — area group "platform" (storage/profiles, PWA/offline, bundle/loading/workers, CI/verification/release, docs, process, catch-all)

Built 2026-10-04, read-only. Code verified on `origin/main` = **da67341** (R2 merged). Sources: every `ledger/*.jsonl` row with area storage/pwa/ci/docs/perf or an unlisted area (`other`, `architecture`, `test`) — **247 rows** — plus the code-review findings B1-B5, B9, B10, P1-P3, P7, P8, P27, D1-D4, NEW-storage-1..6, NEW-bundle-1/2, the perf baseline (`perf-baseline/results/baseline-fbefa18.md`) and read-only GitHub API checks. Machine-readable: `unified-platform.jsonl` (82 items, `M-PLATFORM-001`…`082`).

> **Drift after the stated base (must be in the master plan):** `main` has moved on to **7ddab75**. PR #75 (R3 package 1: bench drawings, readiness targets, flown-input provenance) was merged on 2026-10-04 at 03:03Z. Its Pages run 37172926281 **failed at the bundle-budget step**: the precache measured 15,787.4 kB against a 15,783 kB ceiling, because the refreshed data snapshots are larger than the committed ones that PR CI measures. The publish step was skipped, so **the live site still serves R2 (da67341)**. PR #76, still open, raises the precache ceiling to 16,103 kB. On 7ddab75, PROGRESS.md records R2 as published, so M-LAUNCH-021 is effectively done there, but it lists R3 package 1 as "Implemented locally; in PR". See M-PLATFORM-063 and M-PLATFORM-064.

## Counts

- Unified items: **82**. By status: deferred 4, done 9, open 53, partial 13, superseded 3.
- Open, partial and deferred items by priority: P0 3, P1 14, P2 32, P3 21.
- 247 source rows: 219 mapped to platform items; 28 owned by another area group (cross-reference table below); 0 unmapped.
- Review findings owned here: B1, B2, B3, B4, B5, B9, B10, P1, P2, P3, P7, P8, P27, D1, D2, D3, D4, NEW-storage-1/2/3/5, NEW-bundle-2 (main.ts part). Placed in other groups (same work, counted once): B6 -> M-LEARNING-005; NEW-storage-4 -> M-LEARNING-003; NEW-storage-6 -> M-LEARNING-004; NEW-bundle-1 -> M-ORBIT-010; NEW-bundle-2 (Build part) -> M-BUILD-028.
- New findings from this consolidation: **NEW-pwa-1** (the first visit re-downloads about 9.3 MB, M-PLATFORM-021) and **NEW-ci-1** (the PR budget gate cannot see data-snapshot growth, so release is blocked, M-PLATFORM-063).

## Open, partial and deferred items by placement

### A. R2/R3 close-out wave (do first)

| id | P | size | status | item | placement | depends on |
|---|---|---|---|---|---|---|
| M-PLATFORM-063 | P0 | XS | open | Release blocked by data growth: the budget gate in PR CI measures committed snapshots, the Pages build measures refreshed ones — R3 package 1 failed to publish at +4.4 kB | R2/R3 close-out wave (first package; owner T/I) | — |
| M-PLATFORM-064 | P0 | XS | partial | R2 and R3-package-1 close-out evidence: record CI/deploy runs, review the R2 +15 kB index raise under the budget rule, fix the stale R3 status row | R2/R3 close-out wave (integration owner I; with M-LAUNCH-018/021) | M-PLATFORM-063 |
| M-PLATFORM-037 | P2 | S | open | Startup runs applyLanguage() over components already rendered in the same language (SetupPanel, Telemetry, hidden Orbit/Build) (NEW-bundle-2, main.ts part) | R2 close-out wave, inside the I-owned PR of M-LAUNCH-025 (R2.1 lifecycle) | M-LAUNCH-025 |

### B. New R1.6 "Storage hardening" package (owner L, after the close-out)

| id | P | size | status | item | placement | depends on |
|---|---|---|---|---|---|---|
| M-PLATFORM-001 | P1 | XS | open | Selected profile that cannot be read keeps its owner lock until the page closes (B1) | new R sub-task R1.6 "Storage hardening" (owner L; dialog strings L-UI; no main.ts) — scheduled right after the R2 close-out, before R3.5/R5/R6 add write traffic | — |
| M-PLATFORM-002 | P1 | S | open | One failing startup housekeeping step (tombstone media delete, catalog quota, unreadable legacy record) sends every startup into visit-only mode (B2) | new R sub-task R1.6 "Storage hardening" (owner L; dialog strings L-UI; no main.ts) — scheduled right after the R2 close-out, before R3.5/R5/R6 add write traffic | M-PLATFORM-001 |
| M-PLATFORM-003 | P1 | XS | open | Startup re-reads and deep-clones the whole legacy profile on every launch although migration cleanup is finished (NEW-storage-2) | new R sub-task R1.6 "Storage hardening" (owner L; dialog strings L-UI; no main.ts) — scheduled right after the R2 close-out, before R3.5/R5/R6 add write traffic (track E, identical output) | M-PLATFORM-002 |
| M-PLATFORM-004 | P1 | S | open | One damaged or newer-format profile empties the profile chooser ("No learner profiles yet") and breaks Export all and audio export (B3) | new R sub-task R1.6 "Storage hardening" (owner L; dialog strings L-UI; no main.ts) — scheduled right after the R2 close-out, before R3.5/R5/R6 add write traffic; strings in src/ui/profiles/text.ts (L-UI, TH/EN/RU) | M-PLATFORM-001 |
| M-PLATFORM-006 | P1 | XS | open | Showing the profile name parses the learner’s whole lessons/designs/experiments JSON (NEW-storage-1) | new R sub-task R1.6 "Storage hardening" (owner L; dialog strings L-UI; no main.ts) — scheduled right after the R2 close-out, before R3.5/R5/R6 add write traffic (track E) | — |
| M-PLATFORM-007 | P1 | M | open | Repository re-parses, validates and deep-clones the whole profile on every getItem/setItem (per keystroke) — parse cache keyed on the exact raw string (P7) | new R sub-task R1.6 "Storage hardening" (owner L; dialog strings L-UI; no main.ts) — scheduled right after the R2 close-out, before R3.5/R5/R6 add write traffic (track E; differential harness first) | M-PLATFORM-002, M-PLATFORM-006 |
| M-PLATFORM-074 | P1 | S | open | Document R1 learner profiles, reset, archives and backups in README, USER-GUIDE and IMPLEMENTATION-STATUS | Docs (owner L with I) — with the R1.6 storage package | — |
| M-PLATFORM-005 | P2 | S | open | Profile dialog re-parses every profile about four times per render (P8) | new R sub-task R1.6 "Storage hardening" (owner L; dialog strings L-UI; no main.ts) — scheduled right after the R2 close-out, before R3.5/R5/R6 add write traffic (track E; same PR as M-PLATFORM-004 because both reshape list()) | M-PLATFORM-004 |
| M-PLATFORM-008 | P2 | XS | open | Export checks the size of compact JSON but downloads pretty JSON: an export near 8 MB can be a backup that cannot be restored; export also does redundant stringify/clone passes (B9 + NEW-storage-3) | new R sub-task R1.6 "Storage hardening" (owner L; dialog strings L-UI; no main.ts) — scheduled right after the R2 close-out, before R3.5/R5/R6 add write traffic | — |
| M-PLATFORM-010 | P2 | M | open | Legacy media migration aborts entirely on one colliding recording: non-colliding recordings stay invisible, "reload to retry" can never succeed, and every startup re-walks IndexedDB under the catalog lock (B5 + NEW-storage-5) | new R sub-task R1.6 "Storage hardening" (owner L; dialog strings L-UI; no main.ts) — scheduled right after the R2 close-out, before R3.5/R5/R6 add write traffic (follow-up step after B1-B3) | M-PLATFORM-002 |
| M-PLATFORM-012 | P2 | XS | open | Two copies of the soundtrack IndexedDB open/transaction code (soundtrack.ts vs workspace/media.ts) (D2) | new R sub-task R1.6 "Storage hardening" (owner L; dialog strings L-UI; no main.ts) — scheduled right after the R2 close-out, before R3.5/R5/R6 add write traffic (track E; before R6.2 cockpit audio touches soundtrack.ts) | — |
| M-PLATFORM-009 | P3 | XS | open | Latent hazard: repository.delete() in visit-only mode would delete the real profile’s IndexedDB media (UI blocks it today) (B4) | new R sub-task R1.6 "Storage hardening" (owner L; dialog strings L-UI; no main.ts) — scheduled right after the R2 close-out, before R3.5/R5/R6 add write traffic (optional hardening step) | — |
| M-PLATFORM-013 | P3 | XS | open | Media export reads every profile’s track metadata instead of a key range (P27) | new R sub-task R1.6 "Storage hardening" (owner L; dialog strings L-UI; no main.ts) — scheduled right after the R2 close-out, before R3.5/R5/R6 add write traffic (only while touching media.ts with M-PLATFORM-012) | M-PLATFORM-012 |
| M-PLATFORM-014 | P3 | S | open | Duplicate isRecord/validId/clone helpers across workspace and ~12 other modules (D3) | new R sub-task R1.6 "Storage hardening" (owner L; dialog strings L-UI; no main.ts) — scheduled right after the R2 close-out, before R3.5/R5/R6 add write traffic for the workspace-local part; cross-tree copies only opportunistically by each owner | — |
| M-PLATFORM-015 | P3 | S | partial | Storage registry residuals: localStorage still referenced outside the workspace adapters with no test confining it; no per-key owner/schema/size metadata | Q (fitness test, after R1.6) | M-PLATFORM-007 |

### C. Owner decisions (decision register)

| id | P | size | status | item | placement | depends on |
|---|---|---|---|---|---|---|
| M-PLATFORM-065 | P0 | XS | open | Unambiguous id scheme for the master plan (document prefixes: PLAN-R/U/D/A, DEC-, RM-, DP-, RW-, CR-, M-…) | Master plan section 0 (this consolidation) | — |
| M-PLATFORM-032 | P1 | XS | open | Decide the supported browser baseline (module workers, class static blocks): Chrome/Edge ≥94, Safari ≥16.4, Firefox ≥114 | Decision register (owner) — before M-PLATFORM-033 | — |
| M-PLATFORM-024 | P2 | XS | partial | One budget rule and the size targets: ceilings ratchet down; any raise needs a measured reason and an offset plan; precache, index and i18n targets | Q (decision register + budgets.json notes; owner I/T) | M-PLATFORM-063 |
| M-PLATFORM-042 | P2 | S | open | Measure on real phones and decide the default flight model for narrow devices (D-27) without silently lowering realism | Decision register after M-PLATFORM-041 + device rows in the user test (M-LEARNING-050) | M-PLATFORM-041, M-LEARNING-050 |
| M-PLATFORM-044 | P2 | S | open | Node line decision (D-3/D-4), runtime-pin test and fingerprint failures that name the runtime — keep exact hashes as the gate | Decision register + Q (owner T; physics owner for goldens) | — |
| M-PLATFORM-078 | P2 | XS | open | AI-code governance and second maintainer (D-23/D-25): PR size cap, independent second-agent review, owner reads physics/data diffs | Decision register (owner) | M-PLATFORM-066 |
| M-PLATFORM-052 | P3 | S | open | DOM unit-test layer decision (D-18): happy-dom/jsdom vs browser-only (54 of 91 ui files never imported by tests) | Decision register (after the module-size fitness test; D-17 one devDependency at a time) | M-PLATFORM-054 |

### D. Track E — identical-output efficiency

| id | P | size | status | item | placement | depends on |
|---|---|---|---|---|---|---|
| M-PLATFORM-021 | P1 | S | open | First visit downloads ~9.3 MB twice: the service-worker precache fetches every file with cache:"reload", bypassing the copies the page just downloaded (NEW, measured) | E (track E, identical output; owner T/PWA; package "precache transfer") | — |
| M-PLATFORM-031 | P1 | M | open | Load only the active language’s dictionary (plus English fallback): split each feature dictionary per language (P1) | E (standalone I-owned infra package at a quiet merge point; before R3.5/R4 add many keys) | M-PLATFORM-041 (perf gate to prove the gain), coordinate M-LEARNING-029 terminology sweep |
| M-PLATFORM-033 | P2 | M | open | Twelve worker bundles each embed their own copy of the physics core: build workers as ES modules with shared chunks (P2) | E (owner I/T; vite.config.ts, worker entries, budgets.json) — before R4 grows the shared physics core | M-PLATFORM-032, M-PLATFORM-035 |
| M-PLATFORM-034 | P2 | S | open | Load WebMCP tools, Monte Carlo window, lifetime dialog and report code on demand (P3, safe part) | E (I-owned; next integration PR after the R2 close-out) | — |
| M-PLATFORM-038 | P3 | S | open | About 28 local el() DOM helpers in src/ui (D4) — migrate only when a file is already being edited | E opportunistic (each R-task migrates the files it already edits; no sweep) | — |

### E. Track B — bugs and data safety

| id | P | size | status | item | placement | depends on |
|---|---|---|---|---|---|---|
| M-PLATFORM-035 | P1 | M | open | One worker-job contract: shared runner for all 12 jobs, pre-aborted signals honoured, inline fallbacks never resolve a truncated result as finished (D1) | B + Q (owner T with P for physics jobs; before R3.4 completes and before R5 live-state work); session.ts/main.ts flight fallback out of scope | — |
| M-PLATFORM-016 | P2 | S | open | Importers of mission/design/flight/lesson/results/validation files read any size into memory (shared bounded reader) | B (small package; each importer’s owner reviews its message) | — |
| M-PLATFORM-022 | P2 | S | open | Daily data-only deploys change the service-worker version and show the "update ready — Reload" toast every day, also mid-lesson | B (PWA owner T; strings by L-UI) — with the release work M-PLATFORM-047 | — |

### F. Track Q — quality, CI, perf and release gates

| id | P | size | status | item | placement | depends on |
|---|---|---|---|---|---|---|
| M-PLATFORM-041 | P1 | M | partial | Standing performance gate in the repo: perf-baseline script as scripts/perf, hardware-independent budgets (bytes, contexts, shader programs, draw calls, rAF ms, storage reads, big-JSON ms) and a 4x-CPU phone-viewport journey | Q (owner T; scenario owners L/B/S add windows) — first package after the R2 close-out | — |
| M-PLATFORM-017 | P2 | S | open | Fuzz test for every student/teacher file parser (mission, design, lesson, results, TLE/OMM, CDM, archives) | Q (with M-PLATFORM-016; before R7.1) | M-PLATFORM-016 |
| M-PLATFORM-027 | P2 | M | open | Content-Security-Policy meta tag, written threat model, and CSP-violation counting in browser journeys | Q (owner T/I; index.html is integration-owned) | M-PLATFORM-017 |
| M-PLATFORM-028 | P2 | XS | partial | Offline mode sends no outside request — assert it in a browser journey (static-first/intranet principle) | Q (journey; owner T) | — |
| M-PLATFORM-030 | P2 | XS | open | pwa-offline journey’s tune.worker check also matches attitude-tune.worker, so a missing tune worker still passes | Q (XS test fix, owner T) | — |
| M-PLATFORM-043 | P2 | S | partial | Platform metrics table for the master plan (precache, index, i18n, worker bytes, PR CI and release minutes, .git growth, owner time, open/stale PRs) | Q (master-plan metrics section; one row per release in PROGRESS.md) | M-PLATFORM-041 |
| M-PLATFORM-045 | P2 | M | partial | Faster PR feedback with identical coverage: measure median/p90, fast change-to-check subset, test-module cache, incremental typecheck, rebalance shards — no dropped tests | Q (owner T; PLAN §9.2 items 1, 9, 10) | M-PLATFORM-043 |
| M-PLATFORM-047 | P2 | M | open | Tagged releases: release.yml with dist.zip (intranet build with audio) + SHA256SUMS + CHANGELOG section; stable channel, rollback rule and a mirror (D-19/D-20) | R7.2 (+ decision register D-19/D-20; owner T/I) | DEC D-19/D-20 owner decision |
| M-PLATFORM-051 | P2 | L | partial | Remaining regression journeys (S10 audit routes, Orbit playground/maneuvers/screening, lesson 1.1 in Thai on a phone to the graded strip, full placement test, real-control Launch Explore) | R7.1 (owner Q/T; journeys written by the feature owners; each sabotage-proven) | — |
| M-PLATFORM-054 | P2 | XS | open | Fitness test pinning module sizes (main.ts, panel.ts) and listing the guards that must exist as tests | Q (owner T; XS, any time) | — |
| M-PLATFORM-061 | P2 | M | open | Root causes of intermittent export-click timeouts and "Target crashed" in browser CI | Q (owner T; R7.1 prerequisite) | — |
| M-PLATFORM-071 | P2 | S | open | Doc-number and link consistency tests (test/tool/vehicle/flight/Node counts tied to source; links checked; in-app experimental labels vs Known limitations) | Q (owner T; like section-plan.test.ts) | — |
| M-PLATFORM-050 | P3 | S | open | A failing scheduled heavy/fleet run opens an issue automatically; path-filtered validation trigger for src/physics/rigid/** and src/data/** PRs | Q (owner T; R1.5 follow-up) | M-PLATFORM-077 (issue tracker adopted) |
| M-PLATFORM-053 | P3 | M | partial | Tooling gaps: lint/format, dead-export check, dependency update bot, SHA-pinned actions, axe accessibility checks | Q (owner T; one devDependency per PR with a reason, D-17) | — |
| M-PLATFORM-056 | P3 | S | open | Physics/orbit/design cores type-check without the DOM lib; i18n split into a pure dictionary module and a DOM-touching index | Q (owner T with P; after M-PLATFORM-031 reshapes i18n) | M-PLATFORM-031 |
| M-PLATFORM-057 | P3 | XS | open | vite.config.ts and scripts/*.ts are never type-checked | Q (XS) | — |
| M-PLATFORM-058 | P3 | XS | open | Tests print kilobytes of JSON to stdout unconditionally (rigid-recovery) | Q (XS) | — |
| M-PLATFORM-059 | P3 | S | open | WebMCP tool results typed unknown; tests use "as any" ~63 times | Q (with M-PLATFORM-034 when mcp.ts is split out) | M-PLATFORM-034 |
| M-PLATFORM-060 | P3 | S | partial | Architecture-test residuals: session core|mirror import rule still narrowed; lessons/game import only physics types | Q (owner T) | — |
| M-PLATFORM-062 | P3 | S | open | Move the PR #41 evidence packet (docs/audit-2026-09-29: 387 files, 18 MB) out of the docs tree, retire the three codex/audit-acceptance workflows, and add an aggregate-size hygiene rule | Docs/Q (owner T; doc consumers checked first) | M-PLATFORM-066 |

### G. Deferred (trigger stated)

| id | P | size | status | item | placement | depends on |
|---|---|---|---|---|---|---|
| M-PLATFORM-036 | P2 | L | deferred | Load the Build and Orbit sections on first use (proxy with queued calls, idle preload) (P3 heavy part, ENG-K12) | Deferred: start after R3.4/R3.5 settle the Build API and R5.1 the Orbit entry (I-owned, B/S review) | M-PLATFORM-034, R3.4/R3.5 merged, R5.1 |
| M-PLATFORM-011 | P3 | M | deferred | Visit-only mode when Web Locks or sessionStorage are unavailable (older Safari/WebViews) — keep the ADR; measure before refining (B10) | Decision register (DEC-…) + R7.1 device/browser matrix (Safari/iPad prevalence) | cross:M-LAUNCH-019 (device/browser matrix, standing in R7.1) |
| M-PLATFORM-020 | P3 | L | deferred | Optional online backend for scores or shared designs (behind DesignStore, PDPA-safe) — decide later | Decision register (deferred; revisit after R7) | M-PLATFORM-019 |
| M-PLATFORM-055 | P3 | XL | deferred | Declared refactor window: extract route/data-mode/hand-off controllers from main.ts and sub-panels from panel.ts; SectionModule lifecycle (identical behaviour) | Deferred: a declared 2-week window after R3.5 and before R5/R6 (no open feature branches), owner I | M-PLATFORM-054, R3.5 merged |

### H. Track T — teaching/institutional delivery

| id | P | size | status | item | placement | depends on |
|---|---|---|---|---|---|---|
| M-PLATFORM-018 | P2 | S | open | Ask the browser to keep learner data (navigator.storage.persist) and warn iPad/iPhone users about 7-day eviction unless installed — with a backup reminder | T/B (profile menu, L-UI; strings TH/EN/RU) | M-PLATFORM-004 |
| M-PLATFORM-023 | P2 | S | partial | Download-size transparency on first visit: say how big the offline install is, respect Data Saver, and let the install wait until the page is idle | T/UX (PWA owner T; copy L-UI) after M-PLATFORM-021 | M-PLATFORM-021 |
| M-PLATFORM-073 | P2 | L | open | USER-GUIDE is English-only and unreachable from the app: Thai guide and an in-app link | T (docs/i18n owner; native-speaker review with M-LEARNING-033) | M-LEARNING-033 |
| M-PLATFORM-025 | P3 | XS | open | Web app manifest has no lang, Thai name, screenshots or shortcuts; no robots.txt/sitemap | T (PWA owner) | — |
| M-PLATFORM-026 | P3 | XS | open | No public/404.html: path-style links (/Orbitlab/orbit/engineer) land on GitHub’s 404 | T (PWA/deploy owner) | — |

### I. Docs and process (master-plan adoption)

| id | P | size | status | item | placement | depends on |
|---|---|---|---|---|---|---|
| M-PLATFORM-066 | P1 | S | partial | One decision register: merge PLAN §4.1 D01-D09 and DECISIONS D-1..D-27 under one DEC- namespace; list open, deferred and deviated decisions (D-12 deviation, "twenty further items") | Docs (owner I; owner confirms entries) — with the master plan | M-PLATFORM-065 |
| M-PLATFORM-067 | P1 | S | open | One status source per kind and one precedence rule: PROGRESS.md for plan tasks, IMPLEMENTATION-STATUS for app capabilities, master plan for what is planned; superseded banners on old plans and records | Docs (owner I) — adoption step of the master plan | M-PLATFORM-065, M-PLATFORM-066 |
| M-PLATFORM-068 | P2 | XS | open | ROADMAP-PART2-3.md is parsed by tests and drives the in-app "coming next" lists — keep its format; fix the Orbit list missing X01 challenges | Docs constraint for every documentation PR + small in-app copy fix (owner I) | — |
| M-PLATFORM-069 | P2 | S | open | Docs truth pass: stale facts in IMPLEMENTATION-STATUS, README, USER-GUIDE, PHYSICS (fleet counts, test counts, G05, Watch flights, max-Q sentence, heavy-suite duration, scheduled-deploy skip, cron, failure modes, folders, dossier scope, dogleg) | Docs (owner I; physics sentences reviewed by P) — after the doc-number test exists | M-PLATFORM-071 |
| M-PLATFORM-075 | P2 | XS | open | Rebuild docs/README.md index around the master plan (development/, DECISIONS, history records, consumed files) | Docs (owner I) — after the master plan is published | M-PLATFORM-067 |
| M-PLATFORM-077 | P2 | S | partial | Backlog tracker and session protocol: one GitHub Issue (or master-plan row) per open item, SESSION-PROTOCOL.md, 14-day stale-branch rule, CHANGELOG line per PR | Process (owner I) — adopted with the master plan | M-PLATFORM-067 |
| M-PLATFORM-070 | P3 | XS | open | Stale code comments: Vulcan guidance comment (vehicles.ts) and RIGID_DATA_ASSUMPTIONS "slosh and structural flexibility omitted" | R4.1 (catalogue/source ledger; physics owner P) | — |
| M-PLATFORM-072 | P3 | S | open | PHYSICS.md and VALIDATION.md: add a table of contents (no docs site; chapter split only if needed) | Docs (owner P for content) | — |

## Suggested execution order (platform part of the master plan)

1. **Close-out wave (P0, XS each):** M-PLATFORM-063 (budget gate split code/data, review PR #76 under the budget rule) -> M-PLATFORM-064 (PROGRESS/R2/R3 evidence) and M-PLATFORM-065 (id scheme, needed to write the master plan). Run them with M-LAUNCH-018/021 (G2/D08) and M-PLATFORM-037 (startup duplicate applyLanguage, inside the I-owned PR of M-LAUNCH-025).
2. **Master-plan adoption (P1, docs):** M-PLATFORM-066 (one decision register), M-PLATFORM-067 (one status source and precedence, banners), M-PLATFORM-079/019 (principles), then M-PLATFORM-075 (docs index) and M-PLATFORM-077 (backlog tracker).
3. **Measurement before speed work (P1):** M-PLATFORM-041 moves the perf-baseline script into the repo as a standing gate. Every E-track claim below cites its before/after numbers.
4. **R1.6 storage hardening (P1, owner L, no main.ts):** B1 (001), then B2 (002), NEW-storage-2 (003), B3 with P8 (004/005), NEW-storage-1 (006), the differential harness and P7 (007), B9 (008), D2 (012), plus M-LEARNING-005 (B6). Follow-ups: B5 (010), B4 (009), P27 (013), D3 (014), docs (074), persist (018). Land this before R3.5/R5/R6 add more profile writes.
5. **Identical-output delivery and loading (E):** M-PLATFORM-021 (precache re-download, Pages-header measurement first). M-PLATFORM-031 (per-language dictionaries) at a quiet merge point before R3.5/R4 add many keys. M-PLATFORM-034 (lazy MCP/MonteCarlo/Lifetime). M-PLATFORM-035 (job runner, a bug and contract package; Orbit and Build fixes wait on it), then the browser-baseline decision M-PLATFORM-032, then M-PLATFORM-033 (ES workers, before R4 grows the physics core).
6. **Gates and safety (Q/B, P2):** importers 016/017, CSP 027, egress 028, regex 030, data-only toast 022, size transparency 023, module-size test 054, doc tests 071 then truth pass 069, journeys 051, CI speed 045, flakes 061, Node decision 044, release channel 047.
7. **Deferred with triggers:** lazy Build/Orbit sections 036 (after R3.4/R3.5/R5.1), refactor window 055 (after R3.5, no open feature branches), B10 refinement 011 (after measurement), backend 020 (after R7).

## Conflicts resolved

- **Budget rule: "ceilings only ratchet down" (budgets.json _notes, DEVPLAN 7.4-P5) vs PLAN §6 rule 5 (raises allowed with written reason); R2 raised index +15 kB, open PR #76 raises precache +320 kB.** — One rule (M-PLATFORM-024): a raise needs the measured size, the responsible features and a named identical-output reduction that pays it back (021/031/033/034). Data-snapshot growth gets its own ceiling (063), so code ceilings can keep ratcheting down.
- **Scheduled deploy should skip `npm test` (INF-11, CTX-QW-6) vs R1.5/PLAN §9.2 #9 (never inherit an old pass).** — PLAN wins: M-PLATFORM-046 is superseded. Release time already fell from 39 to about 20 min through parallel gates. The README sentence still describes the skip and is fixed in 069.
- **Tolerance-tier goldens (TQ-01/PHY-15) vs the project rule "no tolerance relaxation, no golden rewrites".** — Exact hashes stay the gate (M-PLATFORM-044). A tolerance tier may only be an extra oracle. A Node move is a single re-record approved by the owner.
- **One session = one PR (DEVPLAN P-7) vs PLAN’s integrated multi-package PRs (R1 #71, R2 #74, R3 #75).** — Keep PLAN’s integration-owner model. Each package still writes its own report, and its PROGRESS row is updated in the merge PR (M-PLATFORM-077).
- **Two status trackers: PROGRESS.md (R-tasks) and IMPLEMENTATION-STATUS.md (app items). ROADMAP "status lives in IMPLEMENTATION-STATUS" (DOC-status) is superseded.** — One source per kind (M-PLATFORM-067): PROGRESS for plan tasks, IMPLEMENTATION-STATUS for capabilities and limits, the master plan for what is planned. Old plans get banners.
- **Decision namespaces: PLAN D01-D09 vs DECISIONS D-1..D-27 vs ROADMAP D01-D07; U/R id collisions.** — DEC- register and a prefix table (065/066). ROADMAP ids are not renamed, because tests and in-app lists parse them.
- **Moving whole-mission six-DOF tests out of the default suite to speed CI (TQ-05) vs "no test dropping".** — Allowed only if they still run in the deploy gate before publish, so release coverage is unchanged (M-PLATFORM-045). Otherwise excluded.
- **D-27 "school path defaults to point-mass on narrow devices" vs owner requirement 2 (never lower realism).** — Measure first (041). Make six-DOF fast through identical-output packages. Point-mass may only be a visible, labelled choice, never a silent default (042).
- **Persistent-storage request: automatic on load (would show a permission prompt in Firefox) vs UX.** — The user starts it from the profile menu; iOS users get a note and an Export action (018).
- **Code review: B1–B3 "do before R2" (suggested R1.6) vs reality: R2 merged first.** — R1.6 is scheduled right after the R2/R3 close-out wave. Verified on da67341 that R2 changed only registry.ts in src/workspace, so every storage finding still holds.
- **INF-15 "Delete my data" listed in both the storage and learning ledgers.** — Deletion is done (R1.1/R1.2 profile delete and scoped reset). The privacy statement is M-LEARNING-047. It is not duplicated here.
- **LUI-13 is split between per-frame getElementById (Launch) and dead code (platform); TQ-02 between the Build journey (Build) and Orbit/launch-explore (platform).** — Recorded as split rows. Each part is counted once.

## Superseded or done-by-history items and why

- M-PLATFORM-046 Scheduled deploys skip npm test because code was tested at merge (INF-11 proposal) — Superseded by R1.5: deploy.yml runs all default shards on schedule "rather than inheriting an old pass" (PLAN §9.2 item 9); time cut by parallel gates instead (Pages ~20 min). README Deployment still describes the old skip (fixed under M-PLATFORM-069).
- M-PLATFORM-081 Triage of REMAINING-WORK findings (1 P1, 53 P2, 110 P3) — Superseded by this consolidation: every REMAINING-WORK row is mapped to a unified master item in the area-group ledgers.
- M-PLATFORM-082 Machine cost of accepting PR #36 (heavy 25 min + fleet 2 h 40 min) before merge — #36 merged 2026-10-01 (17bd60f); PLAN R7.2 now requires frozen sources before long acceptance.
- Partly superseded clauses kept inside live items: DEVPLAN 9-15 "sessions don’t edit IMPLEMENTATION-STATUS/flight data" (PLAN authorises agents within allowed paths; M-PLATFORM-067/079); E05 takeover by T01/T03 (E05 shipped independently; M-PLATFORM-065); ROADMAP "S05 localStorage under one key" (now profile-scoped storage; M-PLATFORM-019).

## Rows owned by other area groups (cross-reference, counted there)

| row | source id | -> master item |
|---|---|---|
| 21 | devplan-th-part1:ENG-K06/LUI-02/PHY-06/TQ-13/A17 | M-LAUNCH-083 |
| 25 | devplan-th-part1:B-06/B-12 | M-BUILD-033 |
| 29 | devplan-th-part1:INF-15/DOC-08 | M-LEARNING-047 |
| 34 | devplan-th-part1:ENG-K11 | M-BUILD-009 |
| 35 | devplan-th-part1:ENG-K14/INF-01 | M-BUILD-030 |
| 57 | devplan-th-part2:ENG-K14 | M-BUILD-030 |
| 77 | devplan-th-part2:7.5-P6 | M-LEARNING-050 |
| 102 | devplan-th-part2:D-22 | M-BUILD-008 |
| 134 | other-docs:D-22 | M-BUILD-008 |
| 149 | r2-status:R2 / R2 journey in PR CI | M-LAUNCH-020 |
| 150 | r2-status:R2 / progress docs | M-LAUNCH-021 |
| 151 | r2-status:R2 / NEW per-frame syncLifecycle | M-LAUNCH-024 |
| 152 | r2-status:R2 / NEW hidden cards still drawn | M-LAUNCH-022 |
| 153 | r2-status:R2 / NEW chooser per-frame refresh | M-LAUNCH-024 |
| 154 | r2-status:R2 / NEW notation change mid-flight cost | M-LAUNCH-025 |
| 155 | r2-status:R2 / NEW CSS duplication | M-LAUNCH-026 |
| 157 | remaining-th-part1:LUI-02 | M-LAUNCH-083 |
| 159 | remaining-th-part1:LUI-07 | M-LAUNCH-084 |
| 160 | remaining-th-part1:LUI-12 | M-LAUNCH-085 |
| 164 | remaining-th-part1:B-04 | M-BUILD-024 |
| 165 | remaining-th-part1:B-06 | M-BUILD-033 |
| 166 | remaining-th-part1:B-10 | M-BUILD-030 |
| 167 | remaining-th-part1:B-12 | M-BUILD-033 |
| 181 | remaining-th-part1:INF-16 | M-LAUNCH-086 |
| 186 | remaining-th-part2:MOB-03 | M-LAUNCH-066 |
| 192 | remaining-th-part2:DOC-05 | M-ORBIT-024 |
| 224 | remaining-th-part2:§12:B-01 | M-BUILD-039 |
| 228 | roadmap-part2-3:idea-1 | M-BUILD-001 / M-BUILD-005 |

Split rows (part here, part elsewhere): devplan-th-part1:UX-H3-5/INF-16 — parts a,b -> M-LAUNCH-086; part c -> platform i18n split; parts d,e done; remaining-th-part1:LUI-13 — per-frame getElementById -> M-LAUNCH-024; dead code/test-only exports -> platform lint item; remaining-th-part2:TQ-04 — ratings/readiness fake-worker tests -> M-BUILD-010/024; other jobs -> platform job runner; devplan-th-part2:12-24 — README 'Moon not modelled' -> M-ORBIT-029; other stale claims -> platform docs truth pass; remaining-th-part2:TQ-02 — Build part -> M-BUILD-024; Orbit/launch-explore parts -> platform journeys; devplan-th-part1:section-3.1 — superseded by this consolidation.

## Cross-area dependencies

- **M-PLATFORM-035 job runner**: blocks M-ORBIT-004/005 (screening/re-entry error and inline-fallback fixes) and M-BUILD-010/030 (ratings worker errors, warm worker, worker merge).
- **M-PLATFORM-032 browser decision + 033 ES workers**: govern M-BUILD-030 (merging the ratings and readiness workers); do before R4 grows the physics core.
- **M-PLATFORM-031 per-language dictionaries**: precedes M-LEARNING-036 (typed keys); coordinate with M-LEARNING-029 (terminology sweep); fixes the file layout before R3.5/R4/R5 add keys.
- **M-PLATFORM-037 startup duplicate applyLanguage**: same I-owned PR as M-LAUNCH-025; Build part is M-BUILD-028.
- **R1.6 storage package (001-014)**: includes M-LEARNING-005 (B6); P7 should precede M-LEARNING-003 option 1 (commit on input), which raises write frequency.
- **M-PLATFORM-041 perf gate**: hosts M-LAUNCH-073 (Launch/Home metrics) and M-BUILD-025 (Build scenario); needed by every render-group E item (M-LAUNCH-040/041/046/086) and physics no-op packages to claim gains.
- **M-PLATFORM-042 D-27**: needs device rows from the user test M-LEARNING-050.
- **M-PLATFORM-047 release channel**: consumed by M-LEARNING-045 (intranet install guide) and M-ORBIT-041 (offline data refresh kit).
- **M-PLATFORM-073 Thai guide**: needs native-speaker review M-LEARNING-033.
- **M-PLATFORM-011 B10**: measured through the device/browser matrix M-LAUNCH-019 / R7.1.
- **NEW-bundle-1 (lazy OrbitView)**: is M-ORBIT-010; its main.ts early-texture kick-off line is I-owned (same integration queue as 037).
- **M-PLATFORM-063/064**: run together with M-LAUNCH-018 (G2/D08 sign-off) and M-LAUNCH-021 (PROGRESS R2) as the first master-plan wave.

## Owner’s-requirement check (summary)

- Identical-output (E) items carry an equivalence proof: a differential harness for storage, byte or DOM equality for UI, bitwise worker output for P2, and revision-verified bytes for the precache.
- Excluded as quality trade-offs: debouncing per-keystroke writes (P7 alternative), dropping data snapshots from the precache, silent point-mass default on phones, tolerance-tier goldens replacing hashes, moving tests out of every gate, automatic persist() prompts, and a blanket main-thread fallback for jobs (D1).
- Speed claims are only allowed with perf-baseline before/after runs whose ranges do not overlap (M-PLATFORM-041). The baseline runs on SwiftShader; use hardware-independent proxies.
