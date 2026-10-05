# Unified ledger: area group "orbit"

This covers the Orbit section and playground, satellites, real-sky/TLE/space-weather data, applications, the ISS rendezvous mission (R5), the Moon and Apollo, and the military track.

- **Machine file:** `unified-orbit.jsonl` (66 items, `M-ORBIT-001`…`066`).
- **Generator:** `../work/gen_unified_orbit.py`.
- **Inputs:** 107 ledger rows whose area is orbit, satellite, moon, data or military, plus the owned code-review findings: P4, P5, P16, P20, P30, D16, D21, NEW-UI-1 and NEW-PHYS-1. PLAN R5.1–R5.4 and the PLAN-D07 decision are added because the group owns R5.
- **Verification base:** `origin/main` = `da67341`, which includes R2. R2 touched none of these: `src/ui/orbit/**`, `src/orbit/**`, `src/physics/rendezvous|lunar/**`, `src/provider/**`, `src/render/orbit-view.ts`, `src/ui/home-stage.ts`. Every orbit code-review finding verified on `fbefa18` therefore still holds unchanged. Key lines were re-read on `da67341`.

## Source-id prefixes

Ids collide between documents, so every source id carries a prefix:

| Prefix | Source |
|---|---|
| `RM:` | ROADMAP-PART2-3 (D06/D07 = satellite designer / requirements; R01–R05 = real sky) |
| `DP:` | DEVELOPMENT-PLAN-TH |
| `RW:` | REMAINING-WORK-TH |
| `OD:` | other docs |
| `PLAN:` | PLAN.md v1.2. Here D07 = the ISS realism-target decision, and R5 = ISS. |
| `DEC:` | DECISIONS.md D-n |
| `CR:` | code review |

**Example of a collision.** `PLAN:D07`, `RM:D07`, `DEC:D-7` and `CR:D7` are four different things.

## Counts

| status | n |
|---|---|
| open | 35 |
| partial | 11 |
| deferred | 1 |
| done | 17 |
| superseded | 2 |
| **total** | **66** |

- **Open, partial and deferred by priority (47 items):** P1 = 11, P2 = 20, P3 = 16. No item is P0: nothing in this group threatens data integrity or blocks R2 close-out.
- **By area (all 66):** orbit 33, military 12, moon 9, data 8, satellite 4.

## Open, partial and deferred items by placement

### B: correctness and feedback

These form package **B-ORBIT-1**: `ui/orbit` plus `orbit/*-job`. It has no `main.ts` edits and none of its files are touched by R2–R4.

| mid | P | eff | item |
|---|---|---|---|
| 001 | P1 | XS | Thai satellites copy still says real tracking "comes with the next phase"; add a "Show in Real satellites" link |
| 002 | P1 | S | `apps.thaiId` and the repeat grid go stale after a preset or slider change; the NAPA-2 case is not marked stale when the data mode changes |
| 003 | P1 | S | The Watch tour keeps the first segment's period after a Hohmann burn (wrong number at the beginner level) |
| 004 | P1 | S | Worker failures read as "stopped" or are silently cleared. Needs CR:D1 runner. |
| 005 | P1 | S | The inline fallback cannot stop, and a cancelled run can resolve as a truncated "finished" result. Same fix as CR:D1(B). |
| 007 | P2 | S | Catalogue loading/failure state is blank in the tour, and there is no Retry |
| 008 | P2 | XS | The repeat-track tool answers "no orbit" for invalid input |
| 029 | P2 | XS | D-11 Moon scope label missing in the UI; README:131 is stale (partial) |

### E: identical-output efficiency

- **E-ORBIT-1 (playground):** 010, 011, 012.
- **E-ORBIT-2 (orbit tools):** 013, 014, 015, 016.
- **Alone:** 006.

| mid | P | eff | item | evidence |
|---|---|---|---|---|
| 010 | P1 | S | Create the playground OrbitView lazily (CR:P4 = CR:NEW-bundle-1) | **Measured:** a webgl2 context on `.pg-canvas` is created at t≈0.93 s, before the launch `#gl` (t≈1.69 s); 2 contexts before interactive |
| 011 | P2 | M | Dirty-flag redraw for the porkchop, the paused ground track and (optionally) paused 3-D (CR:P5) | **Measured:** paused Orbit costs the same as playing (≈13 fps redraw, ≈40 ms/s on the renderer main thread) |
| 012 | P2 | S | Update application results in place (CR:NEW-UI-1); also fixes the selection reset 5×/s | code |
| 013 | P2 | S | Remove duplicate station/Sun/EOP work in passes (CR:P20) | code; home-page hitch (see NEW-PHYS-2) |
| 014 | P2 | XS | Per-call memo in `findPasses` (CR:NEW-PHYS-1) | code |
| 015 | P3 | XS | Trig tables in `collisionProbability` (CR:P16) | code |
| 016 | P3 | XS | Screening cache covers grid times only; add a phone timing (CR:P30) | code |
| 006 | P2 | S | CZ-5B/NAPA-2 case studies run on the main thread (1.3 s / 0.6 s freezes); move them to the worker | code |

### F: physics fidelity

| mid | P | eff | item |
|---|---|---|---|
| 019 | P2 | M | Second-order J2 in the repeat/SSO solver: Landsat 8 / Sentinel-2 within 0.01°; `orbital.ts` untouched |
| 020 | P2 | M | Lambert: 48 of 120 boundary cases return null without proof; classify or solve each, with honest UI text |
| 023 | P2 | L | Re-entry/lifetime misses and the NRLMSISE-00 bias. Blocked on **DEC:D-10**; one validation run with CR:D18/D19 |
| 021 | P3 | L | Finite-burn option and out-of-plane rendezvous in the planner. After R5.2, reusing its solver. |
| 022 | P3 | L | Opt-in Cowell propagation in Orbit Engineer. After CR:P14 and D18. |

### Q: engineering quality and data gates

| mid | P | eff | item |
|---|---|---|---|
| 040 | P2 | S | Snapshot staleness gate. The refresh step goes red and opens an issue, the deploy still ships code, and the app shows an amber "data as of" badge. Plus a baseline-age test. (partial: the cron move is done) |
| 017 | P3 | S | Shared encounter-plane basis helper (CR:D16) |
| 018 | P3 | S | Shared golden-section helper (CR:D21), not in parallel with R3.3 |
| 030 | P3 | XS | Re-scope the ROADMAP Phase 5 prose as "generalise #38"; retire C05 in comments. **Prose only:** the file is parsed by tests. |
| 044 | P3 | S | NOTICE/credits test (partial) |

### T: teaching, institutional and military track

| mid | P | eff | item |
|---|---|---|---|
| 036 | P1 | XS | Military content principle (restate it; PLAN has none). The `rtaf-academy` pack names the RTAF Academy against **DEC:D-2**, so the owner must give permission or the pack is renamed. (partial) |
| 009 | P2 | M | CSV export of SSA results with provenance; profile-owned persistence of imported TLE/CDM files |
| 037 | P2 | L | GNSS DOP, geometry only: `src/orbit/dop.ts` validated against Skyfield (military track 3/6 → 4/6) |
| 039 | P2 | M | HADR flood-revisit scenario over Thai provinces, composed from validated tools (partial: ingredients exist) |
| 045 | P2 | S | Re-check pack and academy sources from a reachable network (owner) |
| 047 | P2 | S | Decision: are satellite templates feasible starters or trade-off cases (comms −668 m/s, weather −632, science −26)? |
| 038 | P3 | L | ASAT debris cases: FY-1C half now, Cosmos 1408 half after **DEC:D-15** (partial) |
| 041 | P3 | M | USB offline data-refresh kit (restamp `sw.js` revisions, SHA256SUMS) |

### Existing PLAN R-tasks

| mid | placement | P | eff | item |
|---|---|---|---|---|
| 028 | R0.2 gate | P1 | XS | Owner decision **PLAN-D07**: ISS realism target (fixed reference vs live snapshot). Blocks R5.2. |
| 024 | R5.1 | P1 | L | Make the existing G07 Soyuz MS docking reachable; give each stage its own verdict; fix the Help text "ISS preset … not rendezvous or docking" (RW:DOC-05) |
| 025 | R5.2 | P1 | XL | Fixed-epoch reference ISS state replacing `ISS_RAAN0 = 200°` (RW:PHY-23); reuse SGP4/EOP/uncertainty; TEME frame contract |
| 026 | R5.3 | P1 | XL | Approach, fuel, sensing and contact dynamics |
| 027 | R5.4 | P2 | L | Visuals and spacecraft expansion; fold in CR:P25/P26/D22/D25 (render group) |
| 043 | R4.1 | P2 | M | Sources page plus a test that the count of unsourced values can only fall (partial) |
| 046 | R4.3 | P2 | L | One satellite model contract; D06/D07 disagreements; TM-113111; Sun 0.45°; record solar constant 1361 (the code already uses 1361 consistently) |

### New R sub-tasks: proposed R8 "Moon, generalise C01"

These come after Gate G5. They are partial because Apollo-only versions exist.

| mid | proposed id | P | eff | item |
|---|---|---|---|---|
| 031 | R8.1 | P3 | M | L01: general ephemeris held to Horizons; the gate for any Orbit Moon tool (D-11) |
| 032 | R8.2 | P3 | L | L02: central body, lunar harmonics, frozen orbits |
| 033 | R8.3 | P3 | XL | L03: TLI, free return, phasing, LOI, NRHO (takes over C05) |
| 034 | R8.4 | P3 | XL | L04/L05: descent, skip entry (Artemis I) |
| 035 | R8.5 | P3 | M | Chandrayaan-1 Watch mission (needs the PSLV-XL dossier from R4.2) |

### Deferred

**042 Launch Library 2.** It has no plan home, adds an online host, and needs the privacy statement (RW:DOC-08) first.

## Conflicts resolved, with the code verdict

1. **Thai-satellite stale state (ORB-07 / CTX-QW-5 / thaiId).**
   - The sources disagreed: one says "cleared on hand-off", another says "stale after preset change".
   - Code on `da67341`: only `handoffEntry` clears it (`playground-model.ts:117`); `choosePreset` and `setOrbit` do not.
   - Verdict: the bug is open. The copy fix (001) is split from the state fix (002).
2. **ORB-03, duplicated across three documents with different details** ("LEO period at GEO" vs "transfer period 10 h 37 min").
   - Both are true: the card shows whichever segment was current when `renderTour` ran.
   - The cause is the `renderFacts` early return at Watch level (`:1157`).
3. **Code-review "not reachable" claims vs ledger claims about the no-module-worker fallback (ORB-08 vs D1 notes).**
   - Production workers are IIFE, so browsers without module workers still run them.
   - The inline `setTimeout` path in `reentry-job.ts:59-63` is reached only when `new Worker` throws. When it runs it still resolves partial results on abort.
   - Verdict: a real but rare bug. It is fixed in the D1 package.
4. **P4 and NEW-bundle-1 are the same change**, found by two review areas. Merged into 010.
   - The startup measurement confirms the cause: the playground context is created before the launch context.
   - P4 does **not** remove the ~4 s first-open long task (SwiftShader: 7 shader programs and a 4096² texture upload into a second context). That needs the shared renderer and context budget (CR:P21, render group).
5. **D-11 "Moon labelled" marked done in DP but noted "not verified".**
   - Code: no label string anywhere; README:131 still says the Moon is not modelled.
   - The constraint itself holds: no Orbit tool uses `moonState`.
   - Verdict: partial (029).
6. **Solar constant "owner's call" (RM:D06-misses).** The code uses `SOLAR_FLUX_1AU = 1361` (IAU) everywhere; 1367 appears only in a citation comment. This reduces to recording the decision, inside 046.
7. **D06 timing conflict (DP 9-07 / 11-07 "D06a only, after outcomes") vs shipped Phase 4.** Superseded (065). The learning-outcomes document itself stays a pedagogy item.
8. **L01–L05: "planned" (ROADMAP) vs "partial" (Apollo-specific modules exist).** Recorded as partial with placement R8, as a generalisation of #38 (D-11), not greenfield.
9. **R5 "ISS docking missing" vs G07 "Soyuz docks" (doc-map C14).** Not a real conflict. R5.1 means "extend and expose", not rebuild.
10. **INF-12, partial vs open.** The cron move is done (`deploy.yml 43 17 * * *`); the age gate is absent (`refresh-snapshots.ts:99` only warns). Recorded as partial (040).

## Superseded or merged

- **065**: DP:9-07 and DP:11-07 ordering constraints on D06/D07. Superseded by the delivered designer (062).
- **066**: the umbrella rows OD:"Orbit limits", OD:"§3 military" and DP:CTX-I-3M-4/5. Split into 019/021/022 and 037/038.
- **Done items with nothing left to build:** 048–064. Their limitations are carried by open items.

## Items that belong to other area groups

These are dependencies, not owned here.

| other item | owner | needed by |
|---|---|---|
| CR:D1 shared worker-job runner (plus P2 module-worker decision) | bundle/infra | 004, 005, 006 |
| CR:P21 OrbitView dispose / shared renderer / context budget | render | 010 (first-open hitch); before R3.2/R3.3 |
| CR:P22 shared 2048 map image; CR:P10 map maths | render | 011 (ground-track image), 022 |
| CR:P23 Intl formatter cache; CR:D6 `sizeCanvas`; CR:D9 locale decimals in `orbit/dom.ts` | UI | 011, 008 |
| CR:NEW-PHYS-2 move `workOutPasses` off the home frame | I owner, R3.5 | 013, 014 user-visible gain |
| CR:P14 / NEW-PHYS-4 propagator; CR:P15 lunar memo; CR:NEW-PHYS-3 (fidelity change, owner) | physics | 022, 023, 025, 031, 033 |
| CR:D18 / D19 Sun/Moon frame and MU_MOON validated realism task; DEC:D-10; RW:PHY-12; RW:PHY-14 | physics | 023, 031, 032, 046 |
| CR:D15 (do not merge RK4 variants) | physics, R5.2 | 025 |
| CR:P25, P26, D22, D25 | render, R5.4 | 027 |
| R2.3 Docking preset slot (R2 close-out) | R2 | 024, 027 |
| PLAN R3.1 hand-off contract; RW:LUI-11 (`sim.cfg` origin) | launch/integration | 024, 052 |
| PLAN R3.3 satellite picture; OD:SCI-02 LTAN convention | build/physics | 046 |
| RW:ORB-10, TQ-02, S10 Orbit browser journey | CI/Q | acceptance of 001–012 |
| RW:MOB-02 `.pg-tabs` scroll cue (Russian at 390 px) | UX | Orbit UI quality |
| X01 Orbit challenges, X02 campaign, RW:ORB-11 "coming next" list | game/docs | 030 (ROADMAP is parsed by tests) |
| `rtaf-academy` naming (doc-map C6), DEC:D-13 Thai-satellites pack, CTX-I-12M-2 cadet course | institutional/pedagogy | 036, 037–039 |
| RW:DOC-08 privacy statement | institutional | 042 |
| DP:PED-H12-1 D06 learning outcomes | pedagogy | 047 |
| R4.1 parts provenance | launch/build | 043 |

## Must not miss

1. **PLAN.md has no Orbit-section task apart from R5.** Of the 46 open or partial items, 39 have no PLAN home: everything except 024–028, 043 and 046. The master plan needs the tracks B-ORBIT-1, E-ORBIT-1/2, F-ORBIT-1..3, T-MIL-1 and R8. Otherwise these stay unowned again.
2. **Owner decisions gate the work:**
   - PLAN-D07 (before R5.2);
   - DEC:D-10 (re-entry realism);
   - DEC:D-15 (Cosmos 1408);
   - DEC:D-2 permission or rename (`rtaf-academy` pack);
   - CONTENT-01 (templates);
   - NEW-PHYS-3 (Apollo golden-section, fidelity).
3. **Speed claims need measurement.** The re-runnable perf baseline (`perf-baseline/measure.mjs`) already measures startup contexts and orbitPlaying/orbitPaused. Use `--compare` for 010 and 011. Passes, screening and case studies need their own timers (home-page long task, 4× throttle).
4. **Quality guards:**
   - The impulsive planner, the Kepler default and the Apollo C01 paths stay byte-identical unless an owner-approved validated re-record is made.
   - Data gates must never block an app-fix deploy.
   - Retry and refresh must respect the CelesTrak at-most-once-per-2-hours rule.
