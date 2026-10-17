# Hand-over: the Argon4 follow-up work (paused 2026-10-17)

**สรุปภาษาไทย.** งานตรวจรีวิว Argon4 รอบแรก merge แล้ว (PR #155, `f626786`) ส่วนงานใหญ่ 5 งานที่เจ้าของสั่งต่อ (17 ต.ค. 2569)
ทำไปได้บางส่วนแล้วหยุดไว้เพราะโควตาใกล้หมด งานทั้งหมดเก็บไว้เป็นไฟล์ patch ใน `docs/development/handover/2026-10-17/`
(ใช้ `git am -3` นำกลับมาได้ทุก commit) คำตัดสินของเจ้าของอยู่ใน `docs/DECISIONS.md` หัวข้อ "Decided 2026-10-17"
ผู้รับงานต่อเริ่มจากหัวข้อ "How to resume" ด้านล่าง งานที่ยังไม่ผ่านเทสต์ติดป้าย WIP ไว้ทุกชิ้น

## Where things stand

- **Merged:** PR [#155](https://github.com/ROYIN001/Orbitlab/pull/155) (`f626786`): the Argon4 review checked claim by claim, six bug fixes, one atmosphere at the limb. Notes: [ARGON4-REVIEW.md](../history/2026-10-17/ARGON4-REVIEW.md). Its fragment `changes/claude-bold-johnson-haeu8t.md` is on main, waiting for the records PR.
- **Published?** Not confirmed. Pages run #168 (for `f626786`) was cancelled when #156 merged; run #169 ([39036978377](https://github.com/ROYIN001/Orbitlab/actions/runs/39036978377), main `b16b09e`, which contains `f626786`) was in progress at 13:53Z. Check it; if green, #155 is published.
- **Branch `claude/bold-johnson-haeu8t`:** restarted from main `f626786` after the merge. It carries `6897c2e` (the owner's second set of answers in DECISIONS.md, and seven plan items, M-PHYSICS-074…078, M-PLAN-032, M-ORBIT-067) and this hand-over. main has since moved (`b16b09e`, #156); merge it before opening a PR.
- **Owner decisions** for everything below: [DECISIONS.md](../DECISIONS.md), "Decided 2026-10-17", both tables (verbatim Thai answers). In short:
  - J2 in the point-mass ascent and WGS-84 sites, now and together, with J2 coasts, as realistic as possible;
  - option (ข) for the throttle and pressure: attached-flow law plus flow separation;
  - option (ก) for the IMU: constant turn-on plus Gauss–Markov in-run bias;
  - real nozzle physics for engines lit in the air;
  - Apollo flies any physically flyable launch, computed for that launch;
  - the sky to look better and more realistic;
  - the bending shader waits.

## The five workstreams (all WIP, none merged)

Each was built by an agent in its own worktree; each worktree's commits are exported as patches. The last commit of each is "WIP (stopped for handover 2026-10-17)": the agent's uncommitted state, **untested**.

| # | Folder (`docs/development/handover/2026-10-17/`) | Base | Patches | State when stopped |
|---|---|---|---|---|
| 1 | `1-rebaseline-j2-wgs84-coasts/` | `23cb4cf` | 10 | Code done in 9 commits: WGS-84 sites and one height datum; J2 in the point-mass ascent; J2 coasts with a J2-aware planner and physical-apsides judging; the drawn Earth as the ellipsoid (datum mapping retired); new tests; Angara-A5's point-mass kick 4° → 3.5° so leo/25 flies. Docs (PHYSICS, VALIDATION, IMPLEMENTATION-STATUS) half-edited in the WIP commit. `notes/fleet-table.md`: every fleet row before/after; `notes/ratings-*.txt`: Build ratings before/after; `notes/DESIGN.md`, `coast-effect.md`, `tune-angara2.txt`. |
| 2 | `2-nozzle-model/` | `95d4ebc` | 1 | One WIP commit across vehicle.ts and every thrust site (rigid/mass, debris, debris-runtime, ship-descent, return-guidance, dispersion, eom, test stand, warnings, i18n). Not yet tested. `notes/engine-table.txt`: the nozzle data it assembled. |
| 3 | `3-apollo-targeting/` | `23cb4cf` | 1 | One WIP commit: new `src/physics/sim/tli-target.ts` (TLI solver), the DE441 Moon/Sun table regenerated from Horizons over a longer span (`docs/data/horizons/*`, `src/data/ephemeris-1969.ts`), changes in cislunar.ts, ephemeris.ts, apollo.ts. The agent was rewriting the solver to a plane-preserving B-plane formulation when stopped. Not yet tested. |
| 4 | `4-sky-aerial-perspective/` | `23cb4cf` | 2 | `c05f9fa` compacted the text of the render shaders (identical GLSL; frees budget). The WIP commit adds aerial perspective over the globe (atmosphere.ts, scene.ts, `tests/render-aerial.test.ts`); the budget check was running when stopped. |
| 5 | `5-imu-bias-model/` | `95d4ebc` | 3 | `c881211` the turn-on bias stays for the flight, in the truth and the filter; `043e066` the navigation lessons' debrief figures; WIP: PHYSICS §2h figures. `notes/heavy-lessons.txt`, `timing-*.txt`. |

Bases `23cb4cf` and `95d4ebc` have the same tree as main's `f626786` for these files (`f626786` is #155 squashed); only #156 (`b16b09e`) differs.

## How to resume

```bash
git fetch origin && git checkout claude/bold-johnson-haeu8t && git merge origin/main
# one workstream at a time, on this branch or a branch the owner allows:
git am -3 docs/development/handover/2026-10-17/5-imu-bias-model/*.patch
# resolve, then: npx tsc --noEmit; the tests the workstream names; the full suite
```

Suggested order and PR split (D-25 caps about 400 changed source lines per PR, or a written reason):
1. **IMU (5):** independent; no pinned fingerprint moves. Check every navigated lesson's verdict; a flipped verdict goes to the owner, never a loosened bound. Its own PR.
2. **Sky (4):** render only.
   - Keep `c05f9fa` (shader text compaction, identical output) as its own commit.
   - Then finish the aerial perspective: `npm run build && npm run budget` (index ceiling 2645 kB, ~2643.8 used before it), frame time under the GlowGovernor.
   - Screenshots with the real Earth textures for the owner: the first set was texture-less and the owner asked for "better and more realistic".
   - Its own PR.
3. **Apollo (3):** finish the TLI solver.
   - The flown launch must stay bit-identical: `tests/eo-phy-6/apollo11.test.ts`, historical-vehicles, watch-missions-flights-z, panel-historical.
   - Gate "physically flyable": the solver converges, there is no tliShort, and the mission stays inside the (extended) table.
   - LOI must never fire outside the Moon's sphere of influence, and no lunar orbit with ap NaN.
   - Replace the one-second rule in `ApolloFlight.begin` and `tests/apollo-own-launch.test.ts` (header: the owner's decision of 2026-10-17).
   - Check the budget for the larger table (lazy-load or coarser step if needed).
   - Its own PR.
4. **Re-baseline (1 + 2 together):** integrate the nozzle model (2) onto the re-baseline (1), then **re-record every fingerprint and golden once**, with the reasons and old hashes beside them and a VALIDATION §10 note.
   - The goldens: d01 fleet, six-DOF fingerprints and whole-mission goldens, flex goldens, the historical harnesses, Build ratings.
   - Every fleet row that passed before must pass after: the notes table is the reference.
   - A second agent reviews it (physics, D-25).
   - Over 400 lines: write the reason (one validated re-baseline instead of drift PR by PR, plan S01).

## Things learned the hard way

- **Timeouts:** 4 CPUs; running several test suites at once turns 5 s vitest defaults into timeouts. Re-run a timed-out file alone before calling it a failure.
- **Budget:** comments and indentation inside `/* glsl */` strings ship verbatim. Moving them to JS comments is the offset `budgets.json` names for the index chunk.
- **Merge Desk:** this session's account could not open the Merge Desk artifact (HTTP 404), so no card was written for #155; the owner approved in chat ("merge"). A session with Editor access writes cards per SESSION-PROTOCOL §1.
- **Docs-only pushes:** a push that changes only Markdown starts no CI run on a PR (path filter), so its head carries no checks. Bundle records with code, or hold them for the next PR.

## Still open for the owner

- The sky's look after the aerial perspective: screenshots with textures.
- Any lesson whose verdict flips under the IMU model.
- Apollo launches outside the 1969 table (owner rule D-11 limits the Moon to that span; extending the table moves that line).
