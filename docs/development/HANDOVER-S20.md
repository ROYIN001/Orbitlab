# Hand-over of the physics-foundation track (plan S20)

> **What this is.** The record that lets someone who was not in the chat continue the physics work at once. Written on 2026-11-26 by the session that orchestrated the track (`claude/tender-tesla-4xh9wa`, `session_01JPSDqC2YnTUhAaDr2T2c9J`) on the owner's instruction of that day: "merge งานปัจจุบันเสร็จแล้วยังไม่ต้องเปิดงานต่อไปให้ทำการบันทึกแผนการแก้ไขงานส่วนฟิสิกส์ทั้งหมดที่เราได้คุยและคุณได้วางแผนลงใน repo ได้เลยครับเพื่อให้คนอื่นสามารถเข้ามาอ่าแล้วทำต่อได้เลย" (once the current work is merged, do not open the next work yet; record the whole plan for correcting the physics in the repository, so that others can read it and continue at once; [DECISIONS](../DECISIONS.md), "Decided 2026-11-26, the plan-review chat, later"). State: main at `40218ecc`, after [PR #251](https://github.com/ROYIN001/Orbitlab/pull/251). It was tested on a reader with no context before it was merged, and corrected from what that reader could not do (§5, rule 6). Where this file and code or GitHub disagree, code and GitHub are right. Where it and DECISIONS disagree, DECISIONS is right.

## สรุปสำหรับเจ้าของและผู้รับช่วง

- **แผนทั้งหมดอยู่ใน repo แล้ว** อ่านตามลำดับใน §1: ไฟล์นี้ → แผน S20 → ผลตรวจความสมจริง → แผนลงมือชุดแรก → รายงานงานนำร่อง
- **สถานะ:** แผนได้รับอนุมัติแล้ว ("1.ก 2.ก 3.ก 4.ก.") งานนำร่อง PF-12 (รูปทรงโลก WGS-84 และกฎของพื้นที่โค้ดใหม่ `src/astro`) merge แล้วใน PR #251 ยังไม่มีโค้ดใดของเว็บเรียกใช้ฐานใหม่ เว็บจริงจึงยังไม่เปลี่ยน
- **อัปเดต 2026-11-27:** PF-10 (มาตราเวลา, PR #254) และ PF-11 (กรอบอ้างอิง, PR #256) เสร็จและ merge แล้วโดย session ที่รับช่วง ชุดงานแรก (S20-wave1) จึงครบสามงาน ยังไม่มีโค้ดใดของเว็บเรียกใช้ฐานใหม่ งานถัดไปยังไม่เปิด: ต้องเขียนแผนลงมือชุดที่สอง (§3.3) และรอคำสั่งของเจ้าของ
- **อัปเดต 2026-11-27 (ครั้งที่สอง):** แผนลงมือชุดที่สองเขียนแล้ว ([S20-wave2](plan/S20-wave2.md)) ครอบคลุม PF-13, PF-14, PF-15, PF-16, PF-03 และ PF-04 ขอบเขตที่ตรวจได้ก่อนมีโค้ดตรวจล่วงหน้าแล้ว และผู้อ่านที่ไม่มีบริบทสามคนลองใช้แผนแล้ว ยังไม่มีแพ็กเกจใดถูกเปิด ส่วน T-1 (ลดขนาด) ยังไม่พร้อม: วัดแล้วพบว่าการตั้ง worker เป็น ES module อย่างเดียวไม่ลดขนาด จึงต้องมีแผนของตัวเองก่อน (S20 amendment 14)
- **อัปเดต 2026-11-27 (ครั้งที่สาม):** แผนลงมือชุดที่สอง merge แล้ว (PR #259) session ใหม่รับบทผู้สั่งงานต่อ และเจ้าของตอบ "ก.ทุกข้อ" ต่อห้าคำถาม: รับบทและ merge เองตาม "2.ก", merge #259, เปิดงานตามลำดับ PF-13, PF-14, PF-15, PF-16, PF-03, PF-04 บน branch ตามแผน, คงการตัดสินใจของผู้เขียนสองข้อ (PF-14 และ PF-15), และให้เขียนแผนของ T-1 ตอนนี้คู่ขนานกัน PF-13 เปิดงานแล้วบน `claude/p-pf13-s1` และผ่านการตรวจกับการตรวจรับแล้ว แต่ยังไม่ push: เงื่อนไขการเผยแพร่ไฟล์ EGM2008 ของหน่วยงานเจ้าของยังอ่านไม่ได้ (หน้าเว็บเข้าไม่ได้) เจ้าของจึงให้พักไว้และเปิด PF-14 ต่อบน `claude/p-pf14-s1`
- **อัปเดต 2026-11-28:** ชุดงานที่สองเสร็จสี่ในหกงาน: PF-14 (ดวงอาทิตย์และดวงจันทร์, PR #262), PF-15 (Kepler ทุกชนิดวงโคจรและเทสต์ของตัวอินทิเกรต, PR #263), PF-03 (เอกสารให้ตรงกับโค้ด, PR #264) และ PF-04 (คำตอบผิดเงียบสองจุด วินิจฉัยและตรึงด้วยเทสต์, PR #265) merge แล้ว PF-13 (สนามโน้มถ่วง) ทำเสร็จและผ่านการตรวจรับ แต่ยังพักไว้ในเครื่องของ session โดยไม่ push เพราะยังอ่านเงื่อนไขการเผยแพร่ EGM2008 ไม่ได้ PF-16 จึงยังเปิดไม่ได้เพราะต้องใช้สนามโน้มถ่วงของ PF-13 แผนของ T-1 เขียนเป็นร่างแล้ว (PR #261) รอคำตอบของเจ้าของสามข้อ ยังไม่มีโค้ดใดของเว็บเรียกใช้ฐานใหม่ เว็บจริงจึงยังไม่เปลี่ยน สิ่งที่รอเจ้าของอยู่ใน §7
- **วิธีทำงาน:** ผู้สั่งงานหนึ่งคนเขียนใบสั่งงาน ตรวจรับ และแก้งานที่ถูกส่งกลับ ผู้ลงมือสามบทบาทแยกกัน (ผู้เขียนค่าอ้างอิง ผู้ลงมือทำ ผู้ตรวจ) รายละเอียดใน §4
- **บทเรียนสำคัญจากงานนำร่อง:** ขอบของเทสต์ต้องตรวจด้วยเครื่องมืออ้างอิงก่อนสั่งงาน แผนตั้งขอบผิดสามจุดในชุดแรก (แก้เป็น amendment 6, 7, 8 โดยไม่คลายขอบ) รายละเอียดใน §5
- **สิ่งที่ยังเป็นของเจ้าของทุกครั้ง:** ตารางบันทึกค่าใหม่ตอนสลับฐาน (W-O, W-L, เฟส 4), เพดานขนาด (D-38), การเปลี่ยนหน้าตาหรือถ้อยคำ และการเปลี่ยนขอบเขต
- **ผู้รับช่วงที่เป็น session ใหม่** ควรยืนยันกับเจ้าของหนึ่งครั้งว่ารับบทผู้สั่งงานของแทร็กนี้ก่อน merge เอง (§7)

The English text below says everything this summary says. Three older plan sections that this track leans on are written in Thai ([S09](plan/S09-eq-identical-output.md), [S10](plan/S10-r16-fx-data-safety.md), and the owner's words in DECISIONS); what a reader needs from them is restated in English where it is used (§3.3, T-1).

---

## 1. Read these, in this order

| # | File | What it gives |
|---|---|---|
| 1 | this file | where the track stands, the next steps, how a package is run, what the first package taught |
| 2 | [plan/S20-physics-foundation.md](plan/S20-physics-foundation.md) | the plan: the owner's instruction, classes A to D, the target of every model, every package of every phase, the verification design, the roles, the owner's four answers, amendments 1 to 14 |
| 3 | [reports/physics-audit-2026-11-26.md](reports/physics-audit-2026-11-26.md) | what the audit found, model by model and vehicle by vehicle, with code locations; the list of documents that disagree with the code (PF-03's work order); the suspected silent wrong answers (PF-04) |
| 4 | [plan/S20-wave1.md](plan/S20-wave1.md) | the work plan of the first three packages, task by task, with interfaces, fixtures, test tables and bounds. All three tasks are done |
| 4a | [plan/S20-wave2.md](plan/S20-wave2.md) | the work plan of the rest of Phase 0 and Phase 1: six tasks ready to dispatch, and why T-1 is not |
| 4b | [plan/S20-T1.md](plan/S20-T1.md) | T-1's own work plan, a draft: what the scratch builds measured, three decisions waiting for the owner, the tasks for the recommended answers |
| 5 | [reports/PF-12-geodesy.md](reports/PF-12-geodesy.md) | the first package's report: the worked example of a finished package |
| 6 | [DECISIONS](../DECISIONS.md), "Decided 2026-11-26, the plan-review chat" and "…, later" | the owner's words, verbatim, each with an English gloss |
| 7 | [SESSION-PROTOCOL.md](SESSION-PROTOCOL.md) §1 (the S20 paragraph), [VERIFICATION.md](VERIFICATION.md), [../../changes/README.md](../../changes/README.md) | the merge rule of this track, the verification contract, the change fragment |

**Words used in this track**

| Word | Meaning |
|---|---|
| the owner | the repository's owner. Questions are put and answered in chat with the session at work, and every answer is recorded verbatim in DECISIONS |
| orchestrating session | the one session (or person) that runs the track: it writes each task's text, starts the seats, rules on what they send back, makes the gate check and merges. On 2026-11-26 it was the session named above |
| seat | one role in a package, held by a separate model instance (or person) that sees only its brief: reference author, implementer, reviewer, re-reviewer. S20 §8 calls them roles |
| brief | what a seat is given: one task of the work plan, plus the lines of Appendix A |
| level, tier | S20 §8's levels of difficulty. L1, L2 and L3 go to the smallest, the middle and the largest of the three model sizes the tool offers; L4 is the orchestrating session. No model is named in the repository, on purpose. A team of people would read them as junior, mid-level and senior. S20 §4's "Tier 1 to 3" is a different thing: three groups of models by target class |
| pilot | the first package, PF-12, run to test this way of working |
| pre-check | a measurement with reference tools only, before anyone is dispatched, of whether a correct implementation can meet a bound |
| hand-off runs | the checks an implementer runs once before it reports |
| held-out set | reference points the writers never see, made by the orchestrating session for its own check |
| gate | the orchestrating session's check of a package before it merges; also the report to the owner that closes a phase (S20 §6) |
| class A to D | how close a model is to reality; defined in S20 §2 |
| re-baseline; W-O, W-L | a change that moves recorded results once, under S20 Appendix A. W-O and W-L are the two of Phase 2: the Orbit side and the Launch side |
| T-1, T-2 | groundwork taken from the older plan. T-1: FX-4's shared worker runner, then EQ-8 (workers built as ES modules that share the physics code). T-2: EQ-6's language loader |
| heavy, fleet | the two expensive suites (34 heavy files; 6 six-degree-of-freedom fleet files, about two hours). They run by dispatch (`.github/workflows/heavy.yml`), not on every pull request |
| CI | `.github/workflows/ci.yml`, on every pull request: plan, typecheck, three unit shards, build and size budget, five browser smoke shards, verify |
| Pages run | `.github/workflows/deploy.yml`, which publishes main to the live site after a merge |
| fragment | `changes/<branch>.md`, the one file a work pull request adds for the changelog and the progress table |
| D-25, D-38, D-40, D-55, D-64, D-65 | numbered decisions of the owner in DECISIONS. D-25: a pull request stays near 400 changed lines and has a second reviewer. D-38: only the owner raises a size ceiling, against a named offset. D-40: the oldest browsers supported. D-55: an independent science review. D-64: a green heavy or fleet run may be reused while the physics tree's content hash is unchanged. D-65: work needs the owner's authorization |
| GK1, GK2 | gates of the older plan's waves. S20 replaced "plan work only until GK2" |

## 2. Where the track stands

Nothing of the new base is called by the app. The live site is unchanged by this track so far.

| Package | What | State on 2026-11-28 |
|---|---|---|
| S20 itself | the plan | approved by the owner, "1.ก 2.ก 3.ก 4.ก." ([PR #250](https://github.com/ROYIN001/Orbitlab/pull/250)) |
| PF-01 | oracle toolchain | started inside PF-12: `tests/fixtures/astro/requirements.txt`, its `README.md`, the first generator. The JPL kernel (DE421) is needed first by PF-14; it is downloaded, never committed |
| PF-02 | the area `src/astro`, its change-map rule and import boundary | **done** ([PR #251](https://github.com/ROYIN001/Orbitlab/pull/251)) |
| PF-12 | WGS-84 geodesy | **done** ([PR #251](https://github.com/ROYIN001/Orbitlab/pull/251)); report [PF-12-geodesy.md](reports/PF-12-geodesy.md) |
| PF-10 | time scales | **done** ([PR #254](https://github.com/ROYIN001/Orbitlab/pull/254), 2026-11-27, `b372c474`); report [PF-10-time.md](reports/PF-10-time.md) |
| PF-11 | reference frames | **done** ([PR #256](https://github.com/ROYIN001/Orbitlab/pull/256), 2026-11-27, `8aaadc9a`); report [PF-11-frames.md](reports/PF-11-frames.md) |
| PF-13 | gravity field: EGM2008 to degree and order 20 | **finished, not published.** It passed its review and the gate on `claude/p-pf13-s1` (six commits, head `a5a5adb`) and is held on that branch in the orchestrating session's machine, not pushed, until the terms under which EGM2008 may be copied are read (S20 amendment 15 c, which arrives with the package; DECISIONS, "Decided 2026-11-27, later", the last row). A session that finds no such branch on the remote and no pull request for PF-13 must assume that work was lost with the machine and run S20-wave2 Task 1 again. When it lands: merge main into its branch first; its amendment 15 meets amendments 16 to 18 in the spec's list and in the paragraph above the list, and its held-out set (`heldout_gravity.py`, `check_gravity.mjs`) goes into the evidence folder after the merge |
| PF-14 | the Sun and the Moon by ERFA's series | **done** ([PR #262](https://github.com/ROYIN001/Orbitlab/pull/262), 2026-11-28, `b75edcb8`); report [PF-14-sun-moon.md](reports/PF-14-sun-moon.md); S20 amendment 16 |
| PF-15 | Kepler for every conic; tests of today's integrators | **done** ([PR #263](https://github.com/ROYIN001/Orbitlab/pull/263), 2026-11-28, `1ab87939`); report [PF-15-kepler.md](reports/PF-15-kepler.md); S20 amendment 17. The fallback inside `propagateKepler` is replaced when its callers switch at W-O, not before |
| PF-16 | reference trajectories from Orekit | not started: S20-wave2 Task 4 uses PF-13's field, so it waits for PF-13 to merge. Branch `claude/p-pf16-s1` when it opens |
| PF-03 | documents brought to the code | **done** ([PR #264](https://github.com/ROYIN001/Orbitlab/pull/264), 2026-11-28, `0bcef972`); report [PF-03-documents.md](reports/PF-03-documents.md). One row is undecided and nothing was edited for it: which density Vallado's table prints at 86 km (row 4; the document says 6.6e-6 kg/m³, a comment in `src/physics/atmosphere.ts` says 6.958e-6). It is put to the owner |
| PF-04 | two suspected silent wrong answers | **done** ([PR #265](https://github.com/ROYIN001/Orbitlab/pull/265), 2026-11-28, `8facce5d`); report [PF-04-silent-answers.md](reports/PF-04-silent-answers.md); S20 amendment 18. No source changed: two test files pin today's behaviour under `known defect (PF-04)` titles. The fixes are W-L's (the station transfer's fallback, and a second one of the same kind in the planner) and OE-4's (the Lambert plan under J2) |
| T-1 | size headroom: FX-4's shared runner, then EQ-8 | a draft work plan is written ([S20-T1](plan/S20-T1.md), [PR #261](https://github.com/ROYIN001/Orbitlab/pull/261), a draft): scratch builds show that worker entries built as entries of the main graph take the precache code from 15,198.5 kB to 11,176.1 kB. Not dispatched: three decisions wait for the owner (the budget file changed in the same pull request, how much of FX-4 stays in T-1, no fallback for browsers below D-40), and after them a reader with no context tries the plan. It belongs to this track: the session that did T-2 said it will not take FX-4. Tell that session before touching worker entries or `vite.config.ts` |
| T-2 | EQ-6's loader | **done by another session**: [PR #249](https://github.com/ROYIN001/Orbitlab/pull/249), merged on 2026-11-26 as `c0e2ca75` on the owner's approval |
| W-O, W-L | the two switches (re-baselines) | not started. W-L resumes the parked branch described in S20 §5.3 |
| OE-1 to OE-9, LV-1 to LV-4, Phase 5 | Orbit engineer's tools, four launcher families, the rest | not started; each phase is planned in detail at the gate before it |

## 3. The next steps, in order

### 3.1 PF-10, time scales (S20-wave1 Task 2) — done on 2026-11-27

Kept as it was written, for the record of how the package was set up. What it found is in §5, rules 8 to 12.

1. Branch `claude/p-pf10-s1` from `origin/main`.
2. Run the seats of §4 on Task 2 as written. The plan's levels: reference author and implementer on the middle tier, reviewer on the large tier.
3. Already checked, with reference tools only (`tests/fixtures/astro/evidence/pf10_pf11_prechecks.py`, last block): the two-term TDB − TT formula of the plan is within 37.5 µs of ERFA `dtdb` at 200,001 instants from 1960 to 2060, against a bound of 50 µs. ERFA `dat` behaves as the plan says: 0.943482 s on 1960-01-01, 0 with a warning before 1960, 37 s with a "dubious year" warning after 2028; `utctai` leaves the first part of a date as given and moves the offset into the second.
4. The task adds an ERFA entry to `NOTICE.md` (the leap-second and drift tables come from its `dat.c`); Task 2's Step 6 says what the entry holds.

### 3.2 PF-11, reference frames (S20-wave1 Task 3) — done on 2026-11-27

Kept as it was written. The next step is §3.3.

1. Branch `claude/p-pf11-s1` from `origin/main` after PF-10 has merged. Large tier for all three seats.
2. Already checked the same way: the velocity formula of the plan is within 5.8e-5 m/s of the centred difference of the full chain (bound 2e-4); the bound against the app's present `temeToItrf` was ill-posed and is corrected (S20 amendment 8).
3. Why this chain, measured by `tests/fixtures/astro/evidence/pf11_chain_choice.py`: the IAU 2000B chain is within 1.1 mas of the full IAU 2006/2000A chain for GCRF→ITRF from 1990 to 2055 (bound 2 mas); the planned definition of TEME is within 0.6 mas of Skyfield's from 2020 to 2030 (bound 0.2 m at 7,000 km, which is 5.9 mas).
4. The ERFA C sources come from the pyerfa 2.0.1.5 source archive; `tests/fixtures/astro/README.md` has the command.

### 3.3 The rest of Phase 0 and Phase 1: write a second work plan first

> **Written on 2026-11-27:** [plan/S20-wave2.md](plan/S20-wave2.md), with S20 amendment 14. It settles every "open" entry of the table below for PF-13 to PF-16, PF-03 and PF-04; its bounds were pre-checked where a bound can be before an implementation exists (rule 1; amendment 14 h names the three groups that cannot), and three readers with no context tried it task by task (rule 6); what they could not act on was corrected. T-1 is the exception: two measurements showed it needs a work plan of its own (wave 2, Task 7). The table is kept as it was written. The next step is to dispatch wave 2's tasks on the owner's word, one at a time (§4); Task 4 after Tasks 1 to 3.

> **State on 2026-11-28:** four of the six packages have merged (PF-14, PF-15, PF-03, PF-04; the table of §2 has the pull requests). What is left of this step, in order: (1) PF-13, finished and held for the terms of its source: when the owner sends the terms or rules, correct `NOTICE.md` if the terms ask for it, merge main into `claude/p-pf13-s1`, resolve amendment 15 against 16 to 18, push, open the pull request and take it through CI as §4 says; (2) PF-16 on `claude/p-pf16-s1`, S20-wave2 Task 4, large tier; (3) T-1, after the owner's three answers and a reader with no context. The gate of §3.4 follows when PF-13 and PF-16 have merged.

PF-13 to PF-16, PF-03, PF-04 and T-1 have acceptance rows in S20 §5 but no task-level plan. Write `plan/S20-wave2.md` in the form of S20-wave1 before dispatching any of them, pre-check its bounds (§5, rule 1), and have a reader with no context try to use it (§5, rule 6). What is known and what is still open:

| Package | Known | Open, to settle in the work plan |
|---|---|---|
| PF-13 gravity field | Degree and order 20 in code; acceptance 1e-10 relative at 16 points from 300 km to 36,000 km; the J2-only term equal to `gravityJ2` within 1e-13; Laplace's equation holds numerically. The module takes an Earth-fixed position and returns an Earth-fixed acceleration, so it needs nothing from PF-11 | Which published model. The plan says "the published coefficients" without naming one. A model comes with its own GM, reference radius and tide system, which are not the app's `MU_EARTH` and `R_EARTH`; the work plan has to name the model, its source and licence, those three, the 16 points and the second recursion the reference uses. The author's suggestion, not yet checked: EGM2008 truncated to degree and order 20 |
| PF-14 Sun and Moon | Bounds: Sun 0.01° and 0.1 % in distance, Moon 0.01° and 0.05 %; reference Skyfield with DE421, 400 epochs 1950 to 2050. Skyfield's `load('de421.bsp')` downloads the kernel; that worked in the cloud environment on 2026-11-26. The four Sun models it replaces or keeps are named in S20 §5.2's row: `src/physics/ephemeris-series.ts`, `sunDirectionEci` in `src/physics/orbital.ts`, the series fallback in `src/physics/lunar/ephemeris.ts`, and the mean Sun of `src/orbit/kepler.ts`, which stays as a named convention | Which series. The shortest that meets the Moon's bound has to be found against the reference; the size rule of S20 §5.2 applies (a table over 30 kB becomes a data file). The fixture has to carry the kernel's hash |
| PF-15 Kepler for e ≥ 1, integrator tests | Written in `src/astro`; the fallback inside `propagateKepler` (`src/physics/orbital.ts`) is replaced only when its callers switch at W-O, because any change under `src/physics` selects every heavy and fleet file (S20 amendment 9). Reference mpmath at 50 digits | "Elliptic results bit-identical to today's" needs a capture of today's outputs, which is a TypeScript generator, not a Python one. The Dormand–Prince and step-schedule tests have no bounds yet |
| PF-16 reference trajectories | Six orbits, force model built up term by term; bounds written into the report before the reference is opened | Orekit installed with pip on 2026-11-26 but was never run. Try it once; if it does not run, the reference is an independent Python integrator on ERFA, DE421 and the published coefficients, anchored by one real orbit arc, and the work plan has to say how that arc is chosen |
| PF-03 documents | Markdown only, small tier. Work order and its rule: the audit record's §5 (28 rows; five cite a test that does not exist; three need a run for the true count; one is LV-2's) | none |
| PF-04 silent wrong answers | The audit record's §6. `src/physics/sim/rendezvous.ts:262-267` keeps its first guess when the solver fails, with no flag. The Lambert plan is solved for two bodies and flown with J2; the audit computed a miss of 15 to 58 km with a script that was not kept | Whether either is reachable in real use: Phase 0 does the diagnosis and writes the test with the app's own code. A fix touches `src/physics` or `src/orbit`, so it lands in the batch that owns the seam (S20 amendment 9) |
| T-1 size headroom | Each worker embeds the physics core, so physics code is paid about seven times in the precache. After #249 the precache code measures 15,198,503 B against a ceiling of 15,199 kB (`budgets.json`). EQ-8's estimate is −2.75 MB. From [S09](plan/S09-eq-identical-output.md) (EQ-8) and [S10](plan/S10-r16-fx-data-safety.md) (FX-4), in English: EQ-8 depends on FX-4's shared runner (M-PLATFORM-035) and on D-40, which is answered (Chrome and Edge 94, Safari 16.4, Firefox 114); its files are `vite.config.ts`, the worker entries `src/**/*.worker.ts` and `src/ui/build/ratings-job.ts`; it is two pull requests, both identical-output; a pull request that shrinks a chunk does not edit `budgets.json` (the ceiling is lowered later, in a ratchet pull request); if a supported browser lacked module workers the fallback would be feature detection, never a blanket move to the main thread | Identical output, with its own heavy and fleet run (one of the four budgeted in S20 §7). S09 marks EQ-8 "execution_authorized: false"; the owner's answer "4.ก" of 2026-11-26 authorizes it as this track's groundwork |

### 3.4 The gate after Phase 0 and Phase 1

Report to the owner (S20 §6): what changed on the site (nothing, until a switch), each model's class with its evidence, what was not reached and why, the decisions waiting. Fold the change fragments once per phase. Then plan W-O and W-L in detail. Both follow the re-baseline protocol of S20 Appendix A; the owner signs each from a one-page before-and-after table.

### 3.5 After the switches

Phase 3 (Orbit engineer's tools, S20 §5.4) needs W-O and T-2. Phase 4 (four launcher families, S20 §5.5) needs W-L. Phase 5 is planned at the gate after Phase 3.

## 4. How a package is run

The owner's rule (S20 §1): the orchestrating session designs the work and hands it to other models by difficulty; it does the work itself only when a package is sent back as unsolvable. S20 §7 and §8 define the verification design, the levels and the roles. This is how the first package applied them.

**In practice.** In a coding-agent session each seat is a subagent started with the tool's agent call, with its model size stated in the call, a prompt made of the task's text and the lines of Appendix A, and nothing of the session's own history. A seat is resumed, not replaced, when it has to come back to its own work. A team of people would run the same sequence with three people and a lead.

**The seats, in order, never two at once on one checkout**

| Seat | Level in the first package | Does | Never does |
|---|---|---|---|
| Reference author | middle tier | the fixture generator, the fixture, the failing test, from the task's text | sees or reads the implementation; changes an assertion because it fails |
| Implementer | middle tier | the module, the rule files the task names, the hand-off runs once, one deliberate break, the package report, the change fragment, one commit | edits the test, the fixture or the generator; loosens a bound; runs the default, heavy or fleet suites |
| Reviewer | large tier | reads the whole package against the task's text; judges whether a wrong implementation could pass the tests; regenerates the fixture or re-derives values from the reference; may run the task's test file once and one break of its own | writes code; re-runs whole suites to confirm a report |
| Re-reviewer (after a fix) | middle tier | verdicts each finding as addressed or not; looks for breakage in the fix diff only | re-reviews untouched code |
| Orchestrating session | L4 | the task text and its pre-check; rulings; anything sent back; the gate; the pull request and the merge | hands-on work that a seat can do |

**The sequence for one package**

1. Pre-check every bound of the task with reference tools only (§5, rule 1). Correct the plan before anyone is dispatched.
2. Reference author: generator, fixture, failing test. The test fails because the module does not exist.
3. Implementer: makes it pass. A status of "blocked" with evidence is a good outcome, not a failure (§5, rule 4).
4. Reviewer: one full review. A finding that contradicts the plan's own text is the orchestrating session's to rule on, in writing.
5. One fix round and one further look, as S20 §8 allows: test changes by the reference author (told not to open the implementation), code changes by the implementer, then one re-review of the fix. A package that needs more than that goes back to the orchestrating session.
6. The orchestrating session's gate:
   - a held-out set of its own, seeded, from a different sampler than the fixture's, with hard points added by hand; all inside the same bounds (`tests/fixtures/astro/evidence/` has the first package's);
   - the module read line by line;
   - the unit files that `node scripts/verification/select-checks.mjs --files <changed files>` lists, and `npm run typecheck`, run once;
   - the changed files are all inside the task's list; no model name in any committed file (the trailers a session's tool adds to its commit messages are the one exception);
   - the report and the fragment say only what the diff and the runs support;
   - across a fix round, every number the module returns on the held-out set is compared with the version before the fix, so a fix that claims to change nothing is shown to change nothing.
7. Pull request with the template's headings (`.github/pull_request_template.md`). CI runs. Then the fragment gets the pull request number and the CI run "on the last head tested before the fragment's own update" ([changes/README](../../changes/README.md)), and CI runs once more on that head.
8. If main has moved meanwhile, main is merged into the branch and CI runs on that head ([HANDOVER-K2](HANDOVER-K2.md) §16.6: up to date before review or merge). Merge by squash when CI is green on the head and no Pages run is in progress (the Actions tab, workflow "Deploy to GitHub Pages"). The next branch starts from the new `origin/main`.

**What the second and third packages cost** (2026-11-27, as the tool reported subagent tokens). PF-10: reference author 109 thousand, implementer 119, reviewer 125, re-reviewer 86; two CI rounds, then a third after an unrelated journey failed (§5, traps 7 and 8). PF-11, large tier throughout: reference author 192 thousand, implementer 173, reviewer 151, re-reviewer 108; two CI rounds. The fix of the journey, outside the track: one reviewer of 101 thousand and three CI rounds, one of them the twenty-run round.

**What the first package cost.** The tool reported, as subagent tokens: reference author 96 thousand, implementer 117 thousand, reviewer 120 thousand, re-reviewer 88 thousand. Three CI rounds of about fourteen minutes each (the package, the fragment, and main merged in after another pull request landed). No heavy or fleet run: the `astro` rule does not select them while nothing calls the area.

**Sending work back** is in S20 §8. Every brief repeats it: two diagnosed attempts without success, a suspected reference, a file outside the brief, a must-not-move value that moves, or a bound that would have to be loosened, each stops the seat and returns the package with what was tried and the numbers seen.

Appendix A has the skeleton of each seat's brief.

## 5. What the first package taught

The first package (PF-12) found defects in the plan, not in the approach. Each is now a rule.

1. **Pre-check every bound before dispatch, with reference tools only.** Three kinds of ill-posed bound were found in the first work plan:
   - *Below what a double can carry.* "Height +1 m ± 1e-8 m" at 46,000 km from the Earth's centre, where one step of a double is 7e-9 m (S20 amendment 6).
   - *Tighter than the reference itself.* ERFA's inverse geodetic transform is one pass of Halley's method and is off by up to 2.6e-11 rad near 20,000 km; the bound against it was 1e-11 rad (amendment 7). A forward transform in closed form gives the truth for an inverse by construction: use its inputs.
   - *Tighter than the present code it is compared with.* Today's `temeToItrf` is off by up to 2.1 cm at 7,000 km through a rounded rate and a Julian date in one number; the bound against it was 1e-4 m (amendment 8).

   For each bound ask: what is the size of the quantity, and what is one step of a double there; how accurate is the reference, measured against something better (40-digit arithmetic, a closed form); when the comparison is with the app's present code, what is that code's own error budget. Scripts that answer these for PF-12, PF-10 and PF-11 are in `tests/fixtures/astro/evidence/`.
2. **The table of test cases must cover the plan's own review focus, and every function.** The reviewer found that the focus asked for NaN on infinite input while the table did not, and that nothing fixed the orientation of the local frame: a frame turned about "up" passed every case, and the next task's azimuth test would have built its targets from that same frame. The reader of rule 6 then found three functions of Task 2 with no test at all. Cases a wrong implementation cannot fail (`toBeDefined` on a result) are defects.
3. **One rule for bad input in the whole base:** a non-finite number in any input gives NaN in every number returned, and nothing throws. The exceptions are named in the plan (`eopAt`, the three matrix helpers). Each module pins it with one case that walks every argument position of every function.
4. **A seat that stops is doing its job.** The implementer met a bound it could not reach, measured which side was wrong, and returned the package instead of loosening the bound or copying the reference's error. The orchestrating session then measured the reference without any app code before ruling. Keep "blocked is acceptable, loosening is not" in every brief.
5. **The hand-off unit list comes from the change map, not from the plan.** The map selects five unit files for a file under `src/astro` (the task's test, the architecture test, and three repository-wide ones); the plan had named two.
6. **A plan is ready when a reader with no context can act on it.** Before this record was merged, a fresh reader was asked to start PF-10 from the repository alone and to list every point where it had to guess. It found the value held before 1960 unstated, `taiToUtc` at a leap second undefined, the generators' sampling unspecified, three functions untested, a check that could not be called as written, and several places where this file disagreed with S20. All are corrected (S20 amendment 9). A second reader compared the audit record with its five sources, claim by claim. Do both for the next work plan: they cost less than one fix round.
7. **A figure is re-measured before it is repeated.** Writing the evidence script for the frame chain showed that the "2.4 m" of amendment 1 was the error of the inertial frame's orientation, not of the complete GCRF→ITRF chain (1.6 m). The conclusion stood; the sentence was wrong.

8. **A sampling rule is checked against the table it is meant to cover, entry by entry.** PF-10's work plan sampled the drift years at 48 instants that left five of the table's fourteen entries untouched; a wrong number in such a row passed every case (S20 amendment 11). The same question for a series: which terms can the bound see at all? PF-11's 1e-11 cannot see most of the smallest terms, so a checksum against the source holds the copy (amendment 13).
9. **Every prose claim of a work plan is a bound, and is pre-checked like one.** PF-10's text said a round trip was good to 1e-9 s everywhere; with the one correction pass it prescribed, 3.2e-9 s is left in the seconds before nine steps of the 1961–1972 table (amendment 10).
10. **The reference's convention is pinned where it differs from the base's.** ERFA's `utcut1` and `utctai` treat a day that ends in a leap second, and a day of the drift years, by stretching its seconds; this base's UTC has 86,400 s in every day. A fixture must form UT1 and TT as the base does or say why not (amendment 12, point a). ERFA's `anp` returns exactly 2π at some instants; a range the plan promises is checked at the wrap (amendment 13, point a).
11. **A case that reads a function only where one of its inputs is zero does not test that input.** `gcrfToTeme` was compared only with Skyfield, which has no polar motion; the velocity case used only a point at rest in GCRF. Both hid a whole term (amendments 12 c and 13 b). For each case ask which argument it leaves at zero or at identity.
12. **A bound that would be met or missed by rounding is moved before the work, with the owner's word if it is the spec's.** Measure what the reference's own numbers leave (ERFA's matrices are rotations to 1.2e-15, which is 8.5e-9 m at 7,000 km) and set the bound clear of it (amendment 12, point b).
13. **A reviewer breaks the module on purpose, one input and one table number at a time.** PF-15's cases all used the Earth's gravitational parameter, and a copy of the module that ignored its `mu` argument passed every one; PF-14's bounds let three of 735 table numbers move unseen (amendments 16 and 17). Ask the reviewer for these breaks by name in the brief, and pre-check the bounds of the cases the review adds before the reference author writes them.
14. **A sweep is counted by what it varies, not by how many runs it makes.** PF-04 flew 36 nominal flights; the plan places the station in the spacecraft's own plane, so they were three geometries. "Not reached" is then a statement about three (amendment 18 b).
15. **A pin of a known defect covers the place where the fix will speak.** PF-04's first pin started at the burn's event; a warning logged just before it, in the same step, would have left the pin green after a fix (amendment 18 a).
16. **The terms of a source are read before its numbers are copied.** PF-13's reference author could not reach the agency's page for EGM2008; the package was finished locally and held, and PF-16 waits behind it. Put "where may this be copied from, and under what terms" in the pre-check of any package that commits someone else's data.
17. **A figure of the plan made with one tool is the plan's tool's figure.** The loss from textbook Stumpff forms was 2.4e-2 m with the pre-check's solver and 1.99e-3 m with the module's (amendment 17 e). Quote such a figure with what made it, and hold the test to the bound, not to the figure.

**Traps met**

1. `pip download --no-binary` of pyerfa builds the package and does not return. Fetch the source archive with curl (`tests/fixtures/astro/README.md`); the C sources are under `liberfa/erfa/src/`.
2. Node 22 runs a TypeScript module that has only erasable syntax directly (`node script.mjs` importing `…/geodesy.ts`), which is enough for a probe of `src/astro`. Modules of the app proper need vitest.
3. A review package that includes a large generated fixture costs the reviewer its context for nothing. Leave the fixture out of the diff file and say how to inspect it.
4. A fixture's first Halton points can sit exactly on a boundary (latitude 0). That is useful, and it is why the hand-added points are not the only boundary cases.
5. The cloud machine has Node 22.23.5; the project's reference is 22.23.3. Local runs are early feedback; CI is the evidence.
6. A push to a pull request cancels the CI run in progress on the earlier head, and the aggregate `verify` job of that run then shows red. It is not a failure of the change; the run on the new head is the evidence.
7. Re-running the failed jobs of a CI run cannot pass in this repository: the verification plan belongs to attempt 1 and `scripts/verification/run-browser.mjs` refuses a different attempt ("Workflow differs from the verification plan"; [VERIFICATION.md](VERIFICATION.md): never combine artifacts from different attempts). A red shard is diagnosed from its log and fixed at its cause.
8. A browser journey that fails on a pull request whose diff cannot reach it is still a failure to diagnose. PF-10's second CI round failed in `launch-explore`, a race between the journey's click and Explore's end card; the fix was a pull request of its own (#255), with rule 2's twenty runs on CI, and the owner ordered its merge ([smoke-launch-explore-race.md](reports/smoke-launch-explore-race.md)).
9. Node cannot import a module of `src/astro` that imports a neighbour without a file extension (`./time`). A probe or a checker bundles it first with rolldown, which is installed with vite (`node_modules/.bin/rolldown <file> --format esm --file <scratch>`); esbuild is not installed.
10. A held-out point can itself be ill-posed: a date split as `{ 2400000.5, 51544.5 }` cannot carry a nanosecond in its second part. Judge an "out of bound" of the gate's own set by what a double carries there before ruling on the module.
11. A pull request that changes only Markdown does start CI in this repository (seen on #264), so the fragment's second push cancels a run like any other (trap 6).
12. A file added under `tests/fixtures/astro/` widens the hand-off list: the change map then selects typecheck, build, budget and every `tests/astro-*.test.ts`, even when the package's own files select three unit files. Run the list for the final set of files.

## 6. Evidence and tools in the repository

| Path | What |
|---|---|
| `tests/fixtures/astro/requirements.txt`, `README.md` | the pinned Python packages that write fixtures, how to make the virtual environment, how to fetch the ERFA sources and the JPL kernel. Run by hand, never by CI |
| `tests/fixtures/astro/geodesy/` | the first package's generator and fixture |
| `tests/fixtures/astro/time/`, `tests/fixtures/astro/frames/` | the generators and fixtures of PF-10 (ERFA) and PF-11 (ERFA and Skyfield) |
| `tests/fixtures/astro/evidence/` | the orchestrating session's own measurements, with a README of commands: ERFA's inverse against 40-digit arithmetic (amendment 7), the held-out geodesy set and its checker (the gate of PF-12), the pre-checks of PF-10 and PF-11 (amendment 8, the velocity bound, TDB − TT), the choice of the frame chain (amendments 1 and 2), and the pre-checks of the second work plan (amendment 14: the gravity field, the Sun and Moon, Kepler and the integrators, the Orekit trial, the two suspects of PF-04) |
| `scripts/verification/change-map.json`, rule `astro` | the new area runs its own tests only. The pull request that switches a caller widens the rule in the same diff (S20 §5.3, "Rules after a switch") |
| `tests/architecture.test.ts` | `src/astro` imports nothing from another `src` folder |

## 7. Rules to keep, and what waits for the owner

- **Merging.** By the owner's answer "2.ก" the session that orchestrates S20 merges this track's pull requests itself when CI is green on the head, a reviewer that did not write the work has passed it, and its own gate is done (SESSION-PROTOCOL §1). That answer was given to the session that held the role on 2026-11-26, and confirmed for the two sessions that took the role over on 2026-11-27. A session that takes the role over should say so to the owner once and have it confirmed before its first merge.
- **No merge of any kind during a Pages run** ([HANDOVER-K2](HANDOVER-K2.md) §16.6): a code push cancels the release in progress, and a Markdown merge makes its publish step refuse a source that is no longer main's tip.
- **Always the owner's:** a re-record table (W-O, W-L, Phase 4), a size ceiling (D-38), a change of look or wording, a change of scope.
- **Never:** a bound loosened after a result is seen; a failed run repeated without a diagnosed cause; agreement obtained by fitting reported as validation.
- **Runs are budgeted** (S20 §7): heavy and fleet four times in the whole track, at T-1, W-O, W-L and Phase 4.
- **Waiting for the owner now** (2026-11-28, after PF-04; [DECISIONS](../DECISIONS.md), "Decided 2026-11-27, later"): three things, none of which stops the others. (a) The terms under which EGM2008 may be copied, which hold PF-13 and, behind it, PF-16: the owner may read the agency's page in a browser and send the terms, or rule that the package be published on what `NOTICE.md` states. On 2026-11-28 the agency's main site was reached, though not the model's own page: its "Privacy Policy" page says that information on the site "is considered public information and may be distributed or copied unless otherwise specified", with credit requested; the held branch's `NOTICE.md` quotes it. ICGEM's imprint, which has a copyright paragraph about its website and formatted the file's header, is the other half of the question. (b) PF-03's row 4: which density Vallado's table prints at 86 km. (c) T-1's three decisions, in [S20-T1](plan/S20-T1.md). With these open, no package of the second work plan can be dispatched: PF-14, PF-15, PF-03 and PF-04 have merged, PF-13 is held and PF-16 needs it.
- **Waiting for the owner later, none of it blocking wave 2:** the licence question of NRLMSIS 2.1 at the Phase 3 gate (S20 §10); the size of each switch if T-1 frees too little (S20 §5.2); GK2's date and scope, to be set again at the first gate (S20 §9, item 1).
- **Another session's planned documents pull request "on GK2's answer"** may be overtaken by S20. The owner was told on 2026-11-26; it is the owner's call.

## Appendix A — the skeleton of each seat's brief

Each brief is one task of the work plan, extracted to a file the seat reads first, plus the lines below. A seat gets its task, the interfaces it touches and the binding constraints, and nothing of the session's history.

**Reference author**

- Scope: the steps of the task marked "reference author", and nothing else. Files it may write: the generator, the fixture, the test (and, for the first task of an area, the requirements file and its README).
- The Python environment to use, and that a fixture is written by its generator only, with 17 significant digits and no random numbers without a fixed seed.
- It never opens the implementation. In a fix round it is told which assertions to add, taken from definitions, and that a new assertion failing is the wanted result.
- Run the test once; the expected failure is "module not found" (or, in a fix round, the new case only).
- One commit, not pushed. Reply: status, commit, what failed and why.

**Implementer**

- Scope: the steps marked "implementer". The files it may write, by name. It never edits the test, the fixture or the generator.
- The binding constraints of the work plan, verbatim.
- The orchestrating session's resolution of anything the task leaves open.
- While iterating, the task's own test file only. Before hand-off, once: typecheck, the unit files the change map selects, the build and the budget. Never the default, heavy or fleet suites.
- One deliberate break, recorded with the cases that failed, then undone.
- The package report `docs/development/reports/<package>.md` (what was built, the worst measured difference per case, the break, the runs with counts, what was not checked) and the change fragment.
- "Blocked" with evidence is the right answer when a bound cannot be met, the reference is suspected, or a file outside the list is needed.
- One commit with the subject the task names, not pushed. Reply under fifteen lines: status, commit, one line of test counts, concerns.

**Reviewer**

- The task's text, the binding constraints verbatim, the plan's review focus.
- Who wrote which commit, as facts. No instruction to overlook anything.
- The diff as one file (a large generated fixture left out, with a note). Read-only on the checkout.
- Verdict on the requirements first (missing, extra, misunderstood), then on quality: could a wrong implementation pass these tests; is each bound meaningful; do the rules select what they should; do the documents say only what the runs support.
- Findings with file and line, sorted Critical, Important, Minor.

**Re-reviewer**

- The findings verbatim, the fix diff as one file, the fix report.
- A verdict per finding, "addressed" or "not addressed", and any breakage the fix itself introduced. Nothing outside the fix diff.
