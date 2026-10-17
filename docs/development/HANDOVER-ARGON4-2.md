# Hand-over: the Argon4 follow-up, second session (paused 2026-10-17 ~20:20Z)

**สรุปภาษาไทย.** เซสชันที่สองทำต่อจาก [HANDOVER-ARGON4.md](https://github.com/ROYIN001/Orbitlab/blob/claude/bold-johnson-haeu8t/docs/development/HANDOVER-ARGON4.md) (บน branch `claude/bold-johnson-haeu8t`) และหยุดไว้ตามที่เจ้าของสั่ง ("approaching session limit pause the work")
- เปิด PR แล้ว 3 อัน: #157 (ไบแอส IMU), #158 (บีบข้อความ shader ผลเหมือนเดิม), #159 (มองโลกผ่านอากาศ ซ้อนบน #158) ทั้งสามมีการ์ดในโต๊ะอนุมัติ merge และหน้ารวมคำถามพร้อมภาพ https://claude.ai/artifact/4FLuYimKC32C7Ht1QabzPp
- รอเจ้าของตอบ 4 ข้อ: ฟ้า 1, ฟ้า 2, IMU 1, IMU 2 คำตอบที่เตรียมไว้อยู่ใน branch `-wip-*`
- งาน Apollo และงานปรับฐาน (J2/WGS-84 + หัวฉีด) ยังไม่จบ เก็บไว้ใน branch `-wip-apollo` และ `-wip-rebaseline`
- หน้าเว็บยังไม่เผยแพร่ #155 และ #156 เพราะ Pages run #169 ล้มที่ journey `teaching-held` (ถ่ายภาพหน้าจอเกินเวลา) ยังไม่พบสาเหตุ

Branch rule for this work: the owner allowed one branch and one PR per part, in chat on 2026-10-17: "แยกเป็น branch แล้ว เปิด PR ในแต่ละส่วนเลยครับ". All branch names start with `claude/charming-archimedes-01p1h5`.

## Open PRs (each has a Merge Desk card: `prs/pr157`, `pr158`, `pr159`)

| PR | Branch (suffix) | Head at pause | State |
|---|---|---|---|
| [#157](https://github.com/ROYIN001/Orbitlab/pull/157) IMU turn-on bias held for the flight | `-imu` | `ccd2d30` | CI re-running. The first run failed only `tests/lesson-review.test.ts`: the regenerated pack's provenance hash was stale. `ccd2d30` fixes it (the test fails before, passes after). Waits for the owner's IMU 1 and IMU 2 answers. Heavy `lesson-packs-sixdof` S2 stays red until IMU 1 is answered. The branch also carries `7f991f9`, the owner's second set of answers of 2026-10-17 (DECISIONS.md) and seven plan items. |
| [#158](https://github.com/ROYIN001/Orbitlab/pull/158) shader text compacted, identical GLSL | `-glsl` | `6502e22` | CI running at pause. Identical output: index 2643.2 → 2638.3 kB. Needs the owner's merge (not a bug fix). Merge before #159. |
| [#159](https://github.com/ROYIN001/Orbitlab/pull/159) the globe and clouds seen through the scattering sky's air | `-sky` (base `-glsl`) | `61c0ace` | CI running at pause. A look change, so it waits for the owner's ฟ้า 1 and ฟ้า 2 answers. Second agent: re-check confirmed 10 of 10. |

The PR subscriptions were removed at the pause so nothing wakes the paused session. **Resubscribe to #157–#159 when resuming**, read their CI, and drive them to green.

## The owner's four questions (decision page: https://claude.ai/artifact/4FLuYimKC32C7Ht1QabzPp)

- **ฟ้า 1, the look from orbit (#159).** (ก) as built; (ข) a brighter limb; (ค) a lighter haze. Proposal (ก). Optionally the clouds can take the sky's light too, which removes their peach tint.
- **ฟ้า 2, the look in the climb (12–72 km).** (ก) as built; (ข) haze at 3.3; (ค) blend E·(1 − T) + 3.3·T. Proposal (ค).
  - (ค) is ready on `-wip-sky-q2c`: `90e5c3a` (code and tests) and `25e79c0` (docs). They are based on the sky branch before its rebase onto #158 (`35dadab`), so cherry-pick them onto `-sky`; expect conflicts only in the report and PHYSICS §12.
  - If chosen, the fragment needs the new counts: 25 aerial tests, 295 render-related tests, index 2643.1 kB.
  - (ค) adds a thin pale-cyan band under the horizon at 12 km (`compare-12km`).
  - From 12–45 km land and sea are not told apart in either (ก) or (ค); this is said on the decision page.
- **IMU 1, lesson 15.2's bound (#157).** (ก) 1 500 m; (ข) keep 1 000 m with the navigation-grade unit as the answer. Proposal (ก).
  - (ก) is on `-wip-imu-q1a`, `bb33986`, rebased onto `ccd2d30`. The agent reported that heavy S2 passed on the same code tree and was re-running the cheap checks when stopped.
  - (ข) is on `-wip-imu-q1b`, `00f24de`, based on `a059c76`. It still needs the `ccd2d30` hash fix and then its own pack hash. Its test status is unknown: re-run S2, `tests/lesson-review.test.ts` and the lesson tests.
- **IMU 2, MEMS + GNSS with the star tracker off.** (ก) leave it, documented; (ข) a filter fix in R4.3; (ค) a setup note. Proposal (ก).

Record each answer verbatim in DECISIONS.md, in the PR it lands in.

## Not finished

**Apollo computed targeting** (`-wip-apollo` = the hand-over's WIP `54c100c`, unchanged).
- The agent was measuring when stopped. Its results are in `handover/2026-10-17b/apollo-probes/`.
- The regenerated DE441 table is consistent: d/dt(r) matches v to 2·10⁻⁴ m/s; the Moon is within 292–382 km of the low-precision series; 4th differences behave the same over the old and the extended span (`table-integrity.txt`, `rows-check.txt`).
- With the WIP, `tests/eo-phy-6/apollo11.test.ts` passes. The flown launch and launches a few minutes into the 16 July window fly to splashdown (`sweep2-a.jsonl`: TLI ok, MCC 4–6 m/s, landing miss 3 km).
- The Moon's offset from the parking plane grows from −0.4° on 16 July to 4° on 23 July. That is ×6.4 ≈ 26° of yaw at TLI (`geometry.txt`), so later days need a plane-change strategy or are not flyable.
- Remaining work, as the first hand-over lists it:
  - the solver's final formulation;
  - the arrival-time choice for other days (the WIP aims every launch at the flown arrival);
  - the LOI/SOI and NaN guards;
  - tests;
  - replacing the one-second rule;
  - the budget;
  - docs;
  - D-11 (the table's span) as an owner question;
  - two reviewers.

**Re-baseline: J2 + WGS-84 + J2 coasts with the nozzle model** (`-wip-rebaseline`, `8e2613e`).
- Workstream 1's 10 commits, with workstream 2's nozzle WIP applied on top. Its three conflicts (`simulation.ts`, `return-guidance.ts`, `debris-runtime.ts`) were resolved by the agent; that resolution is not yet reviewed or tested.
- The point-mass fleet at that state, against the base: 156 of 156 accepted rows still accepted, 0 regressions, mean Δv left −16.5 m/s over the 131 gated rows (`handover/2026-10-17b/rebaseline-probes/compare_fleet.py fleet-base.tsv fleet-branch0.tsv`).
- Remaining:
  - finish and test the nozzle model (`tests/nozzle-law.test.ts` and the design tests), with sourced exit areas;
  - the docs (workstream 1's WIP docs commit `e3a17b6`);
  - list every golden that moves;
  - two reviewers;
  - then rebase onto the merged Apollo work and re-record every fingerprint and golden once, with reasons, old hashes and a VALIDATION §10 note.

**Pages** (main unpublished since #155):
- Run [#169](https://github.com/ROYIN001/Orbitlab/actions/runs/39036978377) failed in browser shard 3: `teaching-held` timed out after 30 s on its last `app.shot('lessons')`, taken 0.5 s after a fresh load of `?scenario=z1#/home`. The GPU process was busy (SwiftShader, 11.4 CPU-s in 3 s).
- It passed in PR #156's CI, and 3 of 3 times locally (about 50 s each).
- The 17:43Z scheduled run did not appear. The cause is not yet found.
- Next: reproduce under CPU load, fix at the cause (never a longer timeout), and give it its own branch `-pages` with the fragment `changes/claude-charming-archimedes-01p1h5-pages.md`.

## How to resume

```bash
git fetch origin
# PR heads: -imu, -glsl, -sky; unfinished: -wip-apollo, -wip-rebaseline, -wip-imu-q1a, -wip-imu-q1b, -wip-sky-q2c
git worktree add ../wt-apollo origin/claude/charming-archimedes-01p1h5-wip-apollo   # and so on, one per workstream
ln -s "$PWD/node_modules" ../wt-apollo/node_modules && echo node_modules >> .git/info/exclude
```

Order: keep #157–#159 green and answer-ready; Apollo (its own PR, `-apollo`); the re-baseline last, on top of Apollo (`-rebaseline`).

## Things learned

- **CPU.** The machine has 4 CPUs and the Workflow tool caps itself at 2 agents. Further agents run through the Agent tool, each in its own worktree. Under load, 5 s vitest defaults time out (`tests/propagator.test.ts` on the base): re-run a timed-out file alone. The full default suite took 51 min under load: 10 453 of 10 454 passed, the one failure a timeout.
- **Browser journeys locally.** Playwright 1.63 looks for a headless shell that is not installed. Use `CHROMIUM=/opt/pw-browsers/chromium node tests/browser/run.mjs <journey>`.
- **Network.** JPL Horizons is blocked from this sandbox; the extended table can only be checked internally.
- **Worktrees.** The `node_modules` symlink is not matched by `.gitignore`'s `node_modules/`, so add it to `.git/info/exclude`.
- **Lesson packs.** Regenerating a pack (`scripts/lesson-packs.ts`) also needs its `contentSha256` updated in `src/lessons/review.ts`, with every review left pending (as #135 did).
- **Probes.** A module-level setting left changed by one test of a probe file (the sky's `ALBEDO`) made whole-file runs disagree with single-test runs. Reset shared state at the end of each probe test.
- **Merge Desk.** This account can read and write the Merge Desk (`ArtifactData`, collection `prs`, order 54–56 used).

## Files kept with this hand-over

`docs/development/handover/2026-10-17b/`:
- `sky-harness/`: the screenshot harness. It renders SceneManager with the real textures in headless Chromium; see its README. Its `node_modules` and outputs are not kept.
- `sky-shots-INDEX.md`: what each screenshot shows. The screenshots themselves were not kept (55 MB); the decision page holds the key ones.
- `apollo-probes/`: the Apollo agent's small results, and the scripts that are not `*.probe.ts` (`fly.ts`, `measure.ts`, `tli1.ts`, `tli2.ts`). Its `*.probe.ts` files are not kept: the hygiene rule B3 (`tests/repo-hygiene.test.ts`) forbids tracking probe files.
- `rebaseline-probes/`: the fleet-table probe, `compare_fleet.py` and the three fleet tables (base, workstream 1 alone, workstream 1 + nozzle).
