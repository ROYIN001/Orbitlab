# Hand-over: the Argon4 follow-up, third session (parked 2026-10-18 ~21:30Z)

**สรุปภาษาไทย.** เซสชันนี้ทำต่อจาก [HANDOVER-ARGON4-2.md](HANDOVER-ARGON4-2.md)
- **merge และขึ้นเว็บแล้ว:** IMU (#157), shader (#158), หมอกฟ้า (#159), harness ถ่ายภาพ (#160), Apollo (#162), แก้เทสต์ lui01 (#164) หน้าเว็บเผยแพร่แล้วที่ 0a7e69f
- **#165:** บันทึกคำตอบ 11 ข้อของงานปรับฐานลง DECISIONS.md merge แล้ว (7793f73)
- **งานปรับฐาน (WGS-84, J2 และหัวฉีด):** เจ้าของสั่งเก็บไว้ก่อน ("งานใหญ่ให้เก็บไว้ก่อน") ทุกส่วนอยู่ใน branch ด้านล่าง พร้อมบันทึกว่าทำถึงไหนและขั้นต่อไป คำตอบของเจ้าของครบทุกข้อแล้ว จึงทำต่อได้ทันทีเมื่อเจ้าของสั่ง

Branch rule: one branch and one PR per part, all named `claude/charming-archimedes-01p1h5-*`. The owner allowed this in chat on 2026-10-17: "แยกเป็น branch แล้ว เปิด PR ในแต่ละส่วนเลยครับ". Standing merge approval: "งานส่วนอื่นๆ เมื่อเสร็จเรียบร้อยและ CI เขียวแล้ว ให้ merge ได้เลยเช่นกัน" (DECISIONS, "Decided 2026-10-17 (merging the Argon4 follow-up parts, chat)").

## Merged this session

| PR | What | Merge |
|---|---|---|
| [#157](https://github.com/ROYIN001/Orbitlab/pull/157) | IMU turn-on bias held for the flight | bb33307 |
| [#159](https://github.com/ROYIN001/Orbitlab/pull/159) | the globe and clouds seen through the sky's air (ฟ้า1 ก · ฟ้า2 ค) | 79d2686 |
| [#162](https://github.com/ROYIN001/Orbitlab/pull/162) | Apollo 11: a launch inside the Moon's week (13:32:00–13:40:45 UTC, 16 July) flies to the Moon and home, every burn worked out for it (8.2 ข. 8.1ค 8.3ข; M-ORBIT-068/069 in R8) | 07e9edc |
| [#164](https://github.com/ROYIN001/Orbitlab/pull/164) | LUI-01 journey: settled only across drawn frames (it had failed Pages run 39082600280) | 0a7e69f |

#158 and #160 were merged at the end of the second session. Pages published 07e9edc and 0a7e69f.

[#165](https://github.com/ROYIN001/Orbitlab/pull/165), the records of the owner's answers to the re-baseline's 11 questions (2026-10-18), plan item M-PHYSICS-080 and the parking, merged as 7793f73. No PR is open.

## Parked: the re-baseline (D-51 + the nozzle law)

**Why it is one big piece.** It moves every golden. Its only identical-output part, the unwired nozzle module, is over 700 lines (report, "D-25"). The owner, 2026-10-18 ~21:10Z: "มีส่วนไหนที่งานไม่ใหญ่ทำก่อนได้เลย งานใหญ่ให้เก็บไว้ก่อน".

**Branches:**

| Branch (suffix) | Head | What |
|---|---|---|
| `-wip-rebaseline-snapshot` | 5d942b4 | **The main line.** 29 commits on origin/main 0a7e69f (rebased; the only conflict was in `src/render/scene.ts`, resolved). It carries D-51, the nozzle law, the review fixes and the report `docs/development/reports/argon4-fu-rebaseline.md`. It also carries b18ce48: the haze and the sky pass fitted to the drawn WGS-84 globe. #159 had assumed a sphere, which put the camera underground at Plesetsk and left a gap at the polar limb; the fix is tested. |
| `-wip-rebaseline-prerebase` | 23ef275… (pre-rebase) | The same work on its old base 7f991f9, kept for comparison. |
| `-wip-rb-instr` | 126efba | Q3: the six sphere instruments on WGS-84 (d7a6fea, done and passing). H-IIA's trim on the physical apsides (126efba, WIP, not run). |
| `-wip-rb-guide` | 5d942b4 | Q10: no commits, only a design. See `handover/2026-10-18/guide-NOTES.md`. |
| (rb/hist) | — | Q2: no commits, only measurements and causes. See `handover/2026-10-18/hist-NOTES.md`. |

**The owner's answers** are in DECISIONS: "Decided 2026-10-18 (the re-baseline's questions, chat)" and "(…further questions, chat)". They are on #165 and on the main line. In short:
- **1 ข:** raise the `lesson-file` and precache ceilings by the measured sizes, with D-38's four parts. The owner asked "this is more realistic, isn't it?" and was told the physics is the same under either option.
- **2 ก:** re-derive the historical vehicles from sources.
- **3 ก:** instruments on WGS-84, bounds unchanged.
- **4 ก:** the physical apsides for single burns, trims and the lessons' a.
- **5 ก:** lesson 1.4 re-set; S2's bound kept at 1 000 m.
- **6 ก:** a vacuum engine on the pad is still refused.
- **7:** as proposed.
- **8:** the published nozzle exits where a primary source gives them.
- **9:** (ก) now with (ค); (ข) as M-PHYSICS-080.
- **10 ข:** the whole guidance in the geodetic frame.
- **11 ก:** retire the 16 kept assertions; the fleet gate stays on the physical apsides.

**Order to resume.** Q10 changes every flight after the pitch-over, so do it first:
1. **Q10, guidance** (`guide-NOTES.md`). One `AscentGuidance` serves both models. The proposal:
   - the vertical rise stays on the plumb line;
   - the kick and the stored programme are measured from the geodetic vertical, with the across-plane lean faded out over the first 1° of pitch-over (a new constant);
   - the gravity turn's floor and the R-7 azimuth hold go to the geodetic frame;
   - PEG and IGM stay radial.

   Its open points are the HUD's pitch frame, the fade constant, and whether the in-plane lean alone still costs Progress MS perigee.
2. **Q8, published nozzle exits.** Raptor 2 (FAA), Vulcain 2.1 and the F-1, each with its primary source read. WebFetch is refused from this sandbox and WebSearch returns summaries only, so say which source was read.
3. **Q2, historical vehicles** (`hist-NOTES.md`). The fixes already worked out come first:
   - **MR-3:** its apogee target of 187.5 km is the height above the surface, flown today as radius − 6 378.137 km. On WGS-84 it is 182.9 km.
   - **Sputnik-1:** Zak's 267 t at liftoff against the model's 263.8 t, after 2.5 s on the pad; and the 375 kg of LOX left at T+295.4 s.

   Then Vostok-1's retro pitch (a fit, to re-derive after Q10), Progress MS-19 (a Δv shortfall, with no wrong sourced number found) and VA267.
4. **The rest of Q3, then Q11 and Q9 (ค)** (`instr-NOTES.md`). Run the WIP trim test. Then the osculating instruments: the crew perigee, LM-2D, single-shot, the quickstart starters and six-DOF Vostok-1. Then retire the 16 assertions (`grep "question 11" tests`). Then PSLV-XL's counterfactual at the S139's published peak.
5. **The final measurement:**
   - lesson 1.4: the proposal is every payload figure one 500 kg step down, keeping the 150 m/s reserve; `docs/USER-GUIDE.md` line ~1690 too;
   - the AVUM+ and Electron timeline notes;
   - Q9 (ก): the disagreement rows;
   - the fleet table and ratings, base vs branch.
6. **The budget** (Q1 ข), measured after everything above: `budgets.json` and its `_notes`, D-38's four parts, the offset named (the nozzle table packed tighter). i18n is near its ceiling: shorten strings first, and ask the owner before any i18n raise, because Q1 named only `lesson-file` and precache.
7. **Re-record every golden once.** The list with old and new values is in the report's "Goldens and fingerprints: to re-record at the end". Give the reasons, the old hashes and a VALIDATION §10 note.
8. **Two independent reviewers** (D-25), then fix their findings. Then the PR `-rebaseline`, CI, and merge under the standing approval.

## Things learned

- **Usage limits stop agents mid-run**, three times this session. The agents' worktrees survive. Resume a workflow with `resumeFromRunId` after editing the stopped agent's prompt to describe its state, or resume an Agent with SendMessage. Before resuming, snapshot uncommitted work without touching the worktree: a temp `GIT_INDEX_FILE`, `read-tree HEAD`, `add -A`, `write-tree`, `commit-tree`, then push to a `-wip-*-snapshot` branch.
- **The container restarted four times.** The disk survived each time; background processes did not.
- **`pgrep -f "<text>"` matches its own shell.** A wait loop on it never ends.
- **Pages can fail on a journey that PR CI never runs.** The smoke shards are a subset. Reproduce slow-GPU timing locally by holding the page's frames with the harness's `__holdFrames`.
- **Rebasing a physics branch onto render work:** check what the render work assumes about the Earth's shape. #159's haze and sky pass assumed a sphere.
- **Merge Desk** (`https://claude.ai/artifact/77kbiVNddHUixiZ7aXJSxB`, collection `prs`): cards pr157–pr165, orders 54–60.

## Files kept with this hand-over

`docs/development/handover/2026-10-18/`:
- `guide-NOTES.md`, `instr-NOTES.md`, `hist-NOTES.md`: the three parked agents' notes.
- `hist-probes/`, `instr-probes/`, `rebaseline-probes/`: their probes and small outputs. Every source file carries a `.txt` suffix, so no test runner or hygiene rule picks it up. To use one, copy it back into `tests/probe/` and drop the suffix. The fleet tables (`fleet-*.tsv`) and `compare_fleet.py` are in `rebaseline-probes/`.
- `apollo-on-wgs84.txt`: the Apollo tests on the rebased main line (apollo-own-launch 14/14, computed-guards 5/5, lunar-ephemeris 8/8; eo-phy-6 is a golden that moves).
