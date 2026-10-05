# Final writer guide: Orbitlab master plan (PLAN.md v2.0, Thai)

This guide supersedes the three architecture guides (arch-continuity/WRITER-CONVENTIONS.md, outcome-arch/WRITER-GUIDE.md, arch-exec/WRITER-GUIDE.md).
- Read `arch-continuity/WRITER-CONVENTIONS.md` §3–§5 for the package template, evidence rules and style. Everything below overrides it.
- `$SP` = /tmp/claude-0/-home-user-Orbitlab/338948be-0d3b-5499-8ebe-dce16ee97d04/scratchpad. `$F` = $SP/master/final.
- Write only your own file, `$F/sections/<filename>`.

## 0. Authoritative inputs (generated; never hand-edit, never contradict)

| File | Contents |
|---|---|
| `$F/assignment.tsv` | Every item: 398 ledger + 31 `M-PLAN-*` = 429 (M-PLAN-027…031 added in the 2026-10-04 refresh; next free id M-PLAN-032). Columns: home_section, package, wave, owner, alias. Produced by `$F/gen_final.py` (0 problems). |
| `$F/packages.tsv` | 98 packages. Columns: section, wave, owner lanes, agent-days, rough PR estimate, `execution_authorized=false`, items. |
| `$F/decisions.tsv` | The decision numbering (D-28…D-66), batches A–D, needed-by wave, recommendation, what each blocks, items. |
| `$F/kpis.tsv` | KPI-01…KPI-35 with baseline, target and gate type. |
| `$F/folds.tsv` | Fold/adjacency rules: which item runs next to which, and in what order. |

Item records are in `$SP/ledger/unified-*.jsonl`. New `M-PLAN-*` items exist only in assignment.tsv; their title is their spec.

Evidence:
- `$SP/ledger/r2-status.md`, doc-map.md, process-lessons.md
- `$SP/perf-baseline/results/baseline-fbefa18.md` and README.md
- `$SP/master/outcome-arch/evidence-{plan-critique,ux-perf,realism,release-drift}.md`
- Repo, read-only: `git -C /home/user/Orbitlab show origin/main:<path>`. For 7ddab75 content: `gh api repos/ROYIN001/Orbitlab/contents/<path>?ref=7ddab75`.

## 1. Home rule (unchanged from continuity)

- Fully specify only items whose home_section is yours.
- Mention any other item by id, a short Thai label and "ดู Sxx / <package>".
- Each "only home" below has exactly one owner section:

| Content | Only home |
|---|---|
| Gate criteria | S05 (other sections give "which package supplies which gate evidence") |
| KPI definitions | S04 |
| Decision content: question, options, recommendation | S08 (others cite D-n) |
| Lanes, file ownership, hotspot protocols, fold table, PR sizing, WIP, envelope, DoR/DoD, review | S18 (S05 cites lane ids only) |
| Equivalence-oracle catalogue | S07 (S09/S10 cite it) |
| Won't-do / exclusion catalogue | S02 (others cite S02 §02.x) |
| Risk register | S05 |

## 2. ID scheme

Continuity §2 still applies, with these final changes.

**Decisions: one register, bare D-n**
- D-1…D-27 are as in DECISIONS.md.
- D-28 is the 2026-10-01 top-bar decision.
- D-29…D-37 are PLAN:D01…D09. Write it as `D-35 (=PLAN:D07)` on first mention in a section.
- D-36.A1…A5 are the R2 layout assumptions.
- D-38…D-66 are new, numbered exactly as in decisions.tsv. Never invent other numbers.
- `DEC:` + D-n is still allowed when quoting the file as text.

**Items**
- New items are `M-PLAN-001…026`.
- In titles, `[=M-GAP-xxx, M-NEW-xxx]` marks ids used by the rejected architectures. Never use M-GAP or M-NEW ids in prose.

**Packages**
- Use the ids from packages.tsv only. New ones:
  - `FX-8`: WebGL context-loss recovery.
  - `EQ-15`: declared refactor window.
  - `R6.1`, `R6.2`, `R6.3`.
- `R4.1` now spans K1–K3: research and source ledger start early in the idle P-D lane; no runtime code.

**Gates**
- G0 is formally closed by D-59.
- G1 passed in R1.
- Then: GCO, G2, "R2 complete", G3, G4-S, G4, G5, G6, G7 (applied per gate), G8.
- A wave-gate checklist GK applies at the end of every wave K0–K6. S05 defines it.

**KPIs**
- KPI-01…KPI-35, exactly as in kpis.tsv.
- KPI-33…35 measure execution: lead time, hotspot conflicts/rework, decision latency.

**Change kinds**
- Every PR has exactly one kind: identical-output, bug-fix, quality-improving, realism-changing, feature, docs, human, decision.
- A package may be a sequence of PRs of different kinds.
- An identical-output PR is never combined with any other kind.

## 3. Package template additions

Add these lines to the continuity template:
- **เลน (lane):** one owning lane, plus "ผ่าน I-train" for hotspot hooks.
- **ชนิดการเปลี่ยนต่อ PR:** an ordered list of PR steps, each with its kind.
- **ประมาณการ:** agent-days and PR estimate from packages.tsv, marked as rough.
- **fold:** any folds.tsv row involving this package.

## 4. Fixed facts every section must use consistently

**R1**
- Published at 472645f, Pages 37103651001.

**R2**
- PR #74 squash-merged as da67341.
- CI 37168554643; Pages 37169459230 succeeded at 02:17Z. Live.
- PROGRESS on 7ddab75 records R2 as merged/published.
- G2 is not signed. LUI-01 (M-LAUNCH-027) is still open.

**R3 package 1**
- PR #75 merged as 7ddab75 at 03:03Z; CI 37172156819 green.
- Pages 37172926281 failed at the bundle budget: precache 15,787.4 > 15,783 kB, versus 15,778.7 kB measured in PR CI on the committed snapshots. Not live.
- PR #76 is open: +320 kB, to 16,103 kB.

**Physics evidence**
- The last full heavy pass, 36804343856, predates #36.
- The last fleet pass, 36942933112, predates R1.4.

**PB (measured on fbefa18, SwiftShader, relative only)**

| Measure | Value |
|---|---|
| Interactive cold / warm | 16,416 / 6,582 ms |
| Shader wait | 13,912 ms for 56 programs |
| Duplicate programs, Launch entry / ignition | 18 / 19 |
| Liftoff gap | 2.7 s |
| Orbit-entry freeze | 4.0 s |
| Bytes to interactive | 9,456 kB |
| Precache | 15,741 kB, of which 9,348 kB re-fetched |
| WebGL contexts before interactive | 2 |
| Profile reads at startup | 44 (47 counting all reads) |
| JSON work at 1.5 MB | 382 ms |
| Paused Orbit | 13 fps, 40 ms/s |
| Requested 100× gives | 8.3× (worker about 0.8 core) |

**CI**
- PR CI median about 16.7 min (10.8–20.4).
- Pages 18–22 min.
- Heavy 25–61 min.
- Fleet about 2 h 40 min.

**Hotspot line counts on da67341**
- main.ts 2,408; panel.ts 2,426; style.css 1,393; hud.ts 994; telemetry.ts 932; timeline.ts 750; modes.css 370.
- i18n about 15.4k.

**External deadline**
- Node 22 maintenance ends April 2027. D-3/D-4 must be decided by the end of K2 and executed by the end of K4.

## 5. Conflict resolutions writers must not re-litigate

See the architecture rationale. In short:
- **Backbone.** The continuity id scheme and sections are the backbone.
- **Decision numbering.** The exec decision numbering is used.
- **KPIs.** The outcome KPI list plus the exec execution KPIs.
- **Refactor window.** EQ-15 runs as a declared K3 window before R3.5, under D-62. The fallback is after G3.
- **Context loss.** The context-loss handler comes early, as FX-8 in K1. R3.0 keeps the context budget.
- **R3 authorization.** It is held, not cancelled (D-65).
- **Ordering exception.** D-63: P0/P1 data-loss or false-result bugs go before identical-output work in the same files.
- **Evidence reuse.** D-64: evidence reuse by content hash is allowed for heavy/fleet only. M-PLAN-012 stays rejected.
- **PR size.** At most about 400 changed source lines, excluding tests, fixtures and generated files, until D-23/D-25 sets the cap.
- **WIP.** At most 1 open PR per lane. P is strictly serial. At most 1 open I-owned PR. At most 5 open PRs project-wide.
