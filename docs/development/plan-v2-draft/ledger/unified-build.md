# Unified ledger: area group "build" (Build section and R3)

This ledger covers the rocket builder (remix, parts, ratings, sizing, test facilities), the satellite designer and requirements page (UI side), readiness, the Engineer previews, and the PLAN R3 skeleton (R3.1–R3.5, G3).

- **Machine file:** `unified-build.jsonl`, 40 items, `M-BUILD-001`…`040`.
- **Generator:** `../work/gen_unified_build.py`.
- **Inputs:**
  - all 36 ledger rows with `area == "build"`; each one appears in some item's `sources`, which a script checks;
  - the Build rows of other areas that no other unified ledger claims: B-04, B-06, B-10, B-12, B-13, B-17, ENG-K14, TQ-02/TQ-04 (Build part), and the D06/D07 UX rows;
  - the code-review findings D8, D9 and D13, plus NEW-bundle-2 (its Build part);
  - PLAN R3.1–R3.5 and G3.
- **Verification base:** `origin/main` = `da67341`. `git diff fbefa18 origin/main` touches no file under `src/ui/build`, `src/design` or `src/config`, so R2 changed none of the Build code. Every status was re-read on that code. D9 was re-checked in `git show origin/main:src/ui/panel.ts`.
- **Source-id prefixes:**
  - `roadmap-part2-3:`, `devplan-th-part1/2:`, `remaining-th-part1/2:` and `other-docs:` name the ledger file the row came from.
  - `PLAN:` means PLAN.md v1.2; in it, D0x are PLAN decisions and R3.x are PLAN tasks.
  - `DEC:` means DECISIONS.md D-n.
  - `review:` means a code-review finding.
  - `cross:` means an item in another unified ledger.
  - The prefixes keep colliding ids apart. Roadmap **D03** is the parts builder, PLAN **D03** is cockpit-first, DECISIONS **D-3** is the Node line, and review **D3** is the isRecord duplicate.

## Counts

| Status | Items |
|---|---|
| open | 30 |
| partial | 2 (024 Build journey, 030 worker reuse) |
| deferred | 1 (023 `?d=` share links) |
| done | 7 (034–040) |
| superseded | 0 as separate items. S14 is folded into the D02 done item (035). |
| rejected | 0 as items. The "inline main-thread fallback for ratings" direction is rejected inside 010. |

Priorities of the 33 open, partial and deferred items: **P1 = 7**, **P2 = 13**, **P3 = 13**. No item is P0: the P0 work is the R2 close-out, which is owned by the launch ledger.

## Open items, grouped by placement

### Before any R3 code: small Build package (owner B), plus gates

| mid | P | Effort | Item |
|---|---|---|---|
| 006 | P1 | S | A ratings search cut by its time budget is shown and stored as a real rating (0 kg or a lower bound). Launch Explore then says "will not fly". |
| 007 | P1 | S | Opening a saved design or a requirements row overwrites the unsaved bench or lesson design without asking. |
| 024 | P1 | M | No browser journey for the rocket side of Build; no fake-Worker tests for ratings/readiness. |
| 008 | P2 | XS | A newer design file gets a false "left out" message. The forward-compatibility rule (DEC:D-22) is not recorded. |
| 025 | P2 | S | The perf baseline has no Build scenario. It is needed before any R3 speed claim. |
| 021 | P2 | XS | Decision DEC:D-21: the Engineer face of D03. Recommendation: declare it done at Explore. |
| 029 | P2 | M | D9: a decimal comma in RU outside Build (Launch panel, lifetime dialog, Orbit Field). Reproduce first. The panel part goes to the R2 close-out (I/U owner). |
| 033 | P3 | XS | Stale IMPLEMENTATION-STATUS statements: "dry below engines has no warning"; "a rating takes 1–2 s". |

### PLAN R3.1: contract (owner S with P)

| mid | P | Effort | Item |
|---|---|---|---|
| 001 | P1 | L | Versioned envelopes for five intents, with provenance and frozen flown inputs. |
| 011 | P2 | M | A saved design keeps the remix recipe, payload and design date. This rides the same schema bump. |

### PLAN R3.2 / R3.3: previews (B-R and B-S modules)

| mid | P | Effort | Item |
|---|---|---|---|
| 002 | P1 | L | Engineer rocket preview from the design's own geometry, in SVG first. It absorbs M-LAUNCH-076: published heights, octaweb keyed by stage id, a swapped engine keeping the old drawing. |
| 003 | P1 | L | Satellite picture and subsystem diagrams, plus exploded satellites at the Watch level. |

### PLAN R3.4: Build integration (owner B)

| mid | P | Effort | Item |
|---|---|---|---|
| 004 | P1 | L | Readiness causes become typed targets that focus the field (A03). |
| 015 | P2 | M | One freshness contract for figures, checks, readiness and ratings. Today the satellite checks read new inputs against old figures for about 180 ms. |
| 031 | P2 | M | Build/satellite phone overflow and localisation gaps (ticks, times, English details). |
| 009 | P3 | S | A late ratings result overwrites the valid ratings of the current vehicle (B-19, corrected diagnosis). |
| 012 | P3 | S | Ratings computed in the review are not written back to a saved design. It must be an explicit action. |
| 026 | P3 | S | D8: one keepFocus helper and one coalesced rAF per panel. Identical output. |
| 027 | P3 | S | D13: merge only CSS blocks that are exactly identical; one visually-hidden class, as a deliberate a11y fix. |
| 028 | P3 | S | NEW-bundle-2, Build part: do not render while hidden; render on show. |
| 032 | P3 | S | Requirements time estimate about 2.5× high; 400-row cap; Fly it offers other rockets only on a fail, not on a caution. |

### PLAN R3.5: journey (owner I; Build rows by B)

| mid | P | Effort | Item |
|---|---|---|---|
| 005 | P2 | M | R3.5 and G3, Build acceptance rows. |
| 013 | P2 | S | Explore Fly it is fixed to 500 km and the first site, and names the payload "rideshare dispenser". |
| 023 | P3 | M | Deferred: `?d=` share links. They come after the R3.1 envelope and an owner decision on the size cap. |

### New R sub-task

| mid | P | Effort | Item |
|---|---|---|---|
| 022 | P3 | M | Proposed R3.6 "Build editor depth", after R3.4: stretch and re-engine strap-on groups; custom strap-on bodies. If D-21 decides "build", R3.6 also takes the Engineer parts page. |

### E: identical-output efficiency

| mid | P | Effort | Item |
|---|---|---|---|
| 014 | P2 | M | Satellite Fly it runs its insertion probe on the main thread, up to 0.5 s per vehicle. Move it to a worker; the verdicts stay deep-equal. |
| 030 | P3 | S | Keep the ratings worker warm between runs and terminate it only on Stop. Merge the ratings and readiness workers later, after the bundle group's D1/P2. |
| 026, 028 | — | — | Listed under R3.4 above. |

### B: bug / data safety

| mid | P | Effort | Item |
|---|---|---|---|
| 010 | P3 | S | A ratings worker that fails to load gives a bare error. Give a clear retry/reload message instead of a frozen-page fallback. Part of the bundle group's job runner (D1). |
| 006, 007, 008, 029 | — | — | Listed in the first group above. |

### F: physics fidelity (PLAN R4.3, owner P; intended changes need before/after tables)

| mid | P | Effort | Item |
|---|---|---|---|
| 016 | P2 | L | Kick-stage and GTO ratings should fly the real burns. Vega-C is +31 % and Ariane 64 is +16–22 %. Sixteen matrix designs rate GTO above LEO; the mechanism is now explained. |
| 017 | P2 | M | Each strap-on group at its own Isp and ignition time; core throttle share. This changes event dv values (`sim/ascent.ts` and `sim/burns.ts` use `deltaVRemaining`). |
| 018 | P2 | L | Sizing that reaches orbit at the design Δv, plus decisions DEC:D-9 (fairing rule) and the stretch mass rule. |
| 019 | P3 | M | Own-rocket six-DOF: roll authority, verniers, thruster scaling. |
| 020 | P3 | S | A volume plausibility warning for custom stages. |

## Conflicts resolved

1. **B-03, "open" vs "partial".** Part 2 called it partial only because `src/validation/report.ts` now reads `converged`/`stoppedBy`. The code shows that `src/ui` still ignores both. `explore-level.ts:668` stores the kg as computed, and the Engineer review prints it and hands it on. Verdict: **open**. It is worse than described: after the empty-stack flight a timeout stores a *lower bound*, not 0.
2. **B-02 vs PLAN R3.1.** The code already refuses a newer file that has unknown fields: the `Checker` in `vehicle-spec.ts:68` and `satellite-design.ts:150`. That matches PLAN R3.1. The false part is the text: "left out" is appended only to files that were accepted whole. Verdict: keep refusal, pending DEC:D-22, and fix the message now.
3. **B-19.** REMAINING said "a result is dropped as stale". The display is correct, because results are keyed by signature. The real defect is different: the single ratings slot is **overwritten**. An A→B→A edit inside one frame loses A's valid ratings. Verdict: open, P3, inside R3.4.
4. **Build matrix GTO > LEO.** This was "unknown" before. The documentation explains the mechanism: LEO needs a direct insertion, while GTO counts post-insertion burns as instantaneous. It is merged into the F item 016. It was not re-run.
5. **B-11 vs review D1.** REMAINING asks for a main-thread fallback. D1 shows that ratings take 1–8 s, so a fallback would freeze the page. Verdict: show the reload/retry text and add the pre-abort check; **no** inline fallback.
6. **D-21 / D03-eng / B-18.** The in-app "to come" list comes from the test-parsed `ROADMAP-PART2-3.md`. Any decision must edit that file inside its existing format, together with `section-plan.ts` and its tests.
7. **R3.2 ownership.** The launch ledger placed the drawing-fidelity item (M-LAUNCH-076) in R3.2 and said Build owns it. This ledger absorbs it into 002 as acceptance rows. The master plan should keep one id.

## Superseded and done

- **S14** (Build remix lite, PLAN-2026-09-28) is superseded by the full D02 remix (#40) and recorded in 035.
- **Done (7):**
  - D01 catalogue
  - D02 remix
  - D03 builder at Explore
  - D04 test facilities
  - D05 sizing / optimal staging
  - B-01 (the design store kept unreadable records; #41/#46)
  - ENG-K06 / A17 (Auto Tune in a worker)
- D06/D07 delivery, the 9-07/11-07 ordering rows and B-05 are recorded by the orbit ledger (M-ORBIT-062).

## Items that belong to another area group (referenced, not duplicated)

| Item | Owner |
|---|---|
| M-LAUNCH-046: R3.0 render lifecycle / WebGL context budget (P21) | launch. It must land before any 3-D preview in 002/003. |
| M-LAUNCH-041: P11 size-1 render cache | launch. Before any 3-D rocket preview. |
| M-LAUNCH-037: D6 canvas/colour helper | launch. Use it for new R3 plots. |
| M-LAUNCH-030: `sim.cfg` vs panel draft | launch. Placed in R3.1. |
| M-LAUNCH-063/067/068: debrief diagnosis, Home cards, Home Build chapter (D-26) | launch / I. Placed in R3.5. |
| M-LAUNCH-065: phone task tabs for Build Engineer | launch. Deferred. |
| M-ORBIT-046: one satellite model contract (D06/D07 misses, solar constant, LTAN) | orbit. Placed in R4.3. |
| M-ORBIT-018: golden-section helper | orbit. Not in parallel with R3.3. |
| D1: shared job runner and pre-abort checks | bundle group |
| P2: ES workers and a browser-baseline decision | bundle group |
| P3: lazy Build/Orbit sections, only after R3.4/R3.5 settle the API | bundle group |
| NEW-bundle-2: `main.ts` part | bundle group |
| B6: the numeric-drafts limit throws, which silently drops edits in Build numeric fields | storage group. It is a dependency of 007/031. |
| D4: `el()` helpers | Migrate Build files only while R3.4 edits them. |
| D22: rocket.ts helpers | launch |
| PED-H12-1: D06/D07 learning-outcomes document | teaching group |
| Native-speaker review of Build TH/RU texts | i18n / teaching group |
| devplan 8-09: published ratings ±25 % | physics. It is the same work as 016. |
