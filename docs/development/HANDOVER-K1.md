# Hand-over: wave K1 (integration session, 2026-10-05 → 2026-10-08)

> **สรุปสำหรับเจ้าของ (ภาษาไทย)**
>
> **ส่งมอบแล้ว (merge แล้ว ตัวแอปขึ้นเว็บที่ `3e15303`)**
> - งานแก้บั๊กและงานกันข้อมูลหายของ K1 ที่ merge แล้ว (ยังเหลือบางส่วน ดูหัวข้อ 7):
>   - R1.6: PR1, PR2, PR2b, PR3, PR6, PR7, PR11 และบรรทัดแจ้งเตือน (PR 2c)
>   - FX-1 ขั้น 1–4 (เหลือ M-BUILD-029), FX-2 ขั้น 1–2 (เหลือ M-LEARNING-002/003/027), FX-3 ขั้น 1–3 (ครบ), FX-5 ขั้น 1–4 (เหลือ M-LAUNCH-035), FX-7 ขั้น 0 (ส่วนของ K1 ครบ), FX-8
>   - EQ-1, CO-4 s2, ED-I18N-1, ED-LES-1
>   - การแก้อาการค้างตอนโหลดหน้า
> - เจ้าของเซ็นผ่าน G2 แล้ว
> - การบีบภาพแบบภาพไม่เปลี่ยน (ลดขนาด 35 kB)
> - ADR ห้าฉบับ (R0.2r) และกติกาไฟล์ย่อย `changes/`
> - งานที่คุณอนุมัติในแชทวันที่ 2026-10-08 ("ส่วนที่ทำเสร็จแล้วให้ทำการ merge ให้เรียบร้อยเลย"):
>   - #120 R0.3r แผนที่เลือกเทสต์
>   - #140 R0.4 รายงานขนาดแบบบีบอัด
>   - #141 R1.6 PR11 เอกสารโปรไฟล์ผู้เรียน
>   - ทั้ง 3 ตัว merge หลัง `3e15303` และเป็นเครื่องมือหรือเอกสาร จึงไม่เปลี่ยนตัวเว็บ
> - PR บันทึกผลที่เพิ่มไฟล์นี้รวมไฟล์ย่อยทั้ง 22 ไฟล์เข้า CHANGELOG และ PROGRESS
>   - ตาราง package ใน PROGRESS ยังไม่ได้ปรับ (หัวข้อ 6)
>
> **ยังค้าง (รอคุณ)**
> - PR #129 ของคุณเอง (CI รันครั้งเดียวต่อ PR)
> - branch ที่พักไว้ 2 ตัว (หัวข้อ 5): D-36.A3 ที่คุณเลื่อนไป K2 และ R4.1 ที่ยังทำไม่เสร็จ
> - เทสต์ `fx8-context-loss` ที่ล้มเป็นบางรอบบน main (6 ใน 14 รอบ ล่าสุดตอน merge #120)
>   - หาสาเหตุได้แล้ว: เป็นบั๊กของเทสต์ ไม่ใช่ของแอป (หัวข้อ 9)
>   - วิธีแก้อยู่บน branch `claude/t-fx8-picture-moment-s1`
>   - รอคุณตัดสินว่าการแก้นี้นับเป็นการเปลี่ยน assertion หรือไม่
>   - ยังไม่มีผลยืนยันจาก CI: PR CI ไม่รันเทสต์นี้ และ Pages รันได้เฉพาะบน main (หัวข้อ 9)
> - คำถามที่ยังไม่มีการ์ดให้คุณตอบ (หัวข้อ 4):
>   - fx8 นับเป็นการเปลี่ยน assertion หรือไม่
>   - บีบภาพเพิ่มแบบ progressive
>   - M-LAUNCH-031 ส่วนที่เหลือ
>
> **ขอบเขต K1 ที่ยังไม่ได้ทำ**
> - ดูตารางในหัวข้อ 7 ส่วนที่ใหญ่ที่สุดคือ R1.6 PR4–5, PR8–10, R0.4 ส่วนที่เหลือ และ EQ-2
> - ยังไม่ได้รันประตู GK1
>
> **เรื่องที่ผู้รับงานต่อควรรู้ก่อน**
> - ขนาดแอปเต็มเกือบทุกเพดาน:
>   - ก้อนหน้าแรกเหลือ 0.6 kB
>   - ข้อความแปลเหลือ 0.6 kB
>   - CSS เหลือ 0 จึงห้ามเพิ่ม CSS
> - เปลี่ยนเพดานขนาดได้เฉพาะเมื่อเจ้าของอนุมัติ (D-38)

This file is the hand-over from the K1 integration session to whoever continues. Code and GitHub win over this text: check every SHA and status against GitHub before acting.

## 1. How the work is run (read first)

| Topic | Where | Key rule |
|---|---|---|
| Owner authorization for K1 | [DECISIONS.md](../DECISIONS.md), D-65 | Quote in every PR: owner, 2026-10-05, "เมื่อทำการ merge แล้วตรวจสอบว่าทุกอย่างเรียบร้อยแล้วในระยะ K0 ให้เริ่มทำระยะ K1 ในเซสชั่นใหม่ต่อได้เลยครับ ใช้ model opus5.5 high". That is the full chat text the PRs quote. DECISIONS.md D-65 (K1) records it without the trailing "ใช้ model opus5.5 high". |
| Merging | [SESSION-PROTOCOL.md](SESSION-PROTOCOL.md) §1 | The owner approves on the Merge Desk (see §4) or in chat. Squash merge, never an admin override. **Standing approval (owner, 2026-10-06):** a PR that only fixes an existing bug (wrong → right), or only records facts, is merged without waiting when all of these hold: a failing-first test, a second-agent review (for P0/P1, physics and storage work), green CI, no ceiling raise and no changed assertion. Anything else (features, tooling, docs, UX, perf, budgets, decisions) waits for the owner. |
| Records | SESSION-PROTOCOL §3–§4, [changes/README.md](../../changes/README.md) | Work PRs do not edit `CHANGELOG.md` or `PROGRESS.md`. Each adds `changes/<branch name with / replaced by ->.md` (for example `changes/claude-u-fx5-s3.md`). A records PR folds the fragments in and deletes them. |
| Size budgets | `budgets.json` `_notes`, D-38 | A ceiling rises only with four things: the measured size, the feature, a named offset, and the owner's approval. |
| WIP | SESSION-PROTOCOL / plan S18 | At most 5 code PRs open, plus 2 records PRs. |
| Tests | owner rules | Write a failing test first for every bug. Never relax a tolerance, rewrite a golden, drop a test or change an existing assertion without the owner's approval. "Flake" is not a cause: find the root cause. |
| Reviews | owner rules | A second agent reviews P0/P1, physics and storage work. |
| Plan | [plan/](plan/) (S01, S05, S06, S08, S18 approved for K0–K1); `plan/data/*.tsv` | Start at `plan/README.md`. It lists the sections approved for K0–K1 (on main) and links the draft sections, which live on branch `claude/hopeful-allen-1o0vmh` (`3e18dbc`) under `docs/development/plan-v2-draft/sections/`. Most remaining K1 packages are planned in those drafts: R0.4 in S07, EQ-2 in S09, R1.6 and FX in S10, R4.1 in S13, ED and HU in S16. Where a draft and DECISIONS disagree, DECISIONS wins. `assignment.tsv` has every item's title, wave and notes; `packages.tsv` has each package's wave and lane; `docs/development/registry.tsv` maps items to packages. |

## 2. State of `main` (verify on GitHub)

- **Last app-code merge**: `3e15303` (#139, R1.6 PR7). After it come:
  - #120 (`0b466c1`) and #140 (`01155f1`): tooling and tests;
  - #141 (`a17add4`): docs;
  - the records PR that adds this file: docs only.
- **Pages**:
  - **Live site.** Run 37840550384 at `3e15303` succeeded at 2026-10-08T21:09:38Z. Its build is the live site, and it matches main's app, because #120, #140 and #141 change no built file.
  - **Runs after it.** 37852660960 at `0b466c1` (#120) failed `fx8-context-loss` in shard 1 (p75 13, see §9); #140's push then cancelled it. #140's run 37854729290 skipped every job as a stale source, and #141 (Markdown only) started no run. Nothing after `3e15303` has been built by Pages yet. The next scheduled run, or a manual dispatch on main, will build main's tip.
  - **Before it.** Run 37748125764 at `04a1188` also failed on `fx8-context-loss`. `3e15303` is the first green publication after `5055370`.
- **Budgets**, measured on `main` with every K1 merge in (`npx vite build` and `node scripts/bundle-budget.mjs`):

  | Group | Size | Ceiling | Room |
  |---|---|---|---|
  | precache code | 14698.0 kB | 14724 | 26.0 kB |
  | `index-*.js` | 2635.4 | 2636 | **0.6** |
  | `i18n-*.js` | 1726.4 | 1727 | **0.6** |
  | `index-*.css` | 177.0 | 177 | **0** (add no CSS) |
  | other chunks | 770.4 | 771 | 0.6 |

  The owner raised `index-*.js` and `i18n-*.js` by 2 kB each in K1's last round, for three named pieces only (card `k1-final-budget` option a, #137; DECISIONS 2026-10-08). The precache code ceiling was not raised. The named offsets are EQ-7 and EQ-6 (K2).
- **Merged in K1 by this session**:
  - Before 2026-10-07 (UTC): #95–#117 and #121, then late on 2026-10-06 #122 R1.6 PR2b, #123 FX-5 s4, #124 R1.6 PR6 and #125 FX-2 s2.
  - On 2026-10-07: #126 texture offset (−35.1 kB), #127 FX-3 s2, #128 FX-1 s3 (index ceiling +2 kB, owner option a) and #133 (journey root-cause fix).
  - On 2026-10-08:
    - On the owner's Merge Desk approval: #130 EQ-1, #131 FX-3 s3, #132 R1.6 PR3.
    - Under the standing bug-fix approval: #134 CO-4 s2, #135 ED-I18N-1, #136 ED-LES-1.
    - Bug fixes inside the owner's budget answer: #137 FX-1 s4 with the ceiling raise, #139 R1.6 PR7, #138 the notice line.
    - On the owner's chat approval of 2026-10-08 ("ส่วนที่ทำเสร็จแล้วให้ทำการ merge ให้เรียบร้อยเลย"), each synced with `3e15303` and re-checked first: #120 R0.3r (`0b466c1`), #140 R0.4 step 1 (`01155f1`), #141 R1.6 PR11 (`a17add4`).
  - The owner merged #118 and #119 directly.

## 3. Open pull requests

| PR | What | State | Needs |
|---|---|---|---|
| #129 | Owner's own: CI runs once per PR | — | Owner |

## 4. Owner pages (claude.ai artifacts)

- **Merge Desk**: https://claude.ai/artifact/77kbiVNddHUixiZ7aXJSxB
  - Collection `prs`: one card per PR, written by the session. Each card has a Thai summary, its checks, `state` and `mergedSha`.
  - Collection `decisions`: the owner's merge or hold buttons, readable with ArtifactData. No card is waiting.
- **K1 decision page**: https://claude.ai/artifact/BFqSxYHUWXcp1JeBVpisZL
  - Collection `items`: question cards.
  - Collection `answers`: the owner's choices.
  - Every card is answered, and every answer is recorded in DECISIONS.md; the last one was `k1-final-budget` (a) on 2026-10-08.
- **Open owner questions with no card yet** (all in §9): the fx8 changed-assertion question, progressive textures, and the M-LAUNCH-031 residual. Write each one as a card on the K1 decision page, with 2–3 options, their effect and a proposal (SESSION-PROTOCOL §2).
- **The pages do not notify the session.** Read `answers` and `decisions` on every wake, or ask the owner to say "กดแล้ว" in chat.

## 5. Finished branches without a PR (pushed to origin)

Before opening a PR from any of these, merge `origin/main` in and re-measure the budget.

| Branch | Item | Kind | Status |
|---|---|---|---|
| `claude/i-co4-d36a3-s1` | D-36.A3 step 1: in-flight edits with a confirm step | feature | **Deferred to K2 by the owner** (card `r16-pr2-budget` b). It was CSS +0.2 kB over and code +7.1 kB. Parked; not reviewed against current main. |
| `claude/t-fx8-picture-moment-s1` | `fx8-context-loss` root cause (test bug; see §9) | test fix | Failing-first commit plus fix, and a report with the full evidence. The fix was run locally only. Needs CI evidence (see §9) and the owner's call on the changed-assertion question before a PR. |
| `claude/pd-r41-s1` | R4.1 M-PHYSICS-041 / M-PLATFORM-070: stale "slosh/flex omitted" text | docs (plan: wave K3; needs the owner's approval, not the standing bug-fix rule) | **Unfinished WIP**, interrupted by a usage limit. It holds a failing test plus an uncommitted fix, committed as WIP. Not reviewed. |

## 6. Records

The records PR that adds this file folds every fragment that was on `main`: 22 files, for #118, #119, #120, #122–#128 and #130–#141. They now live in CHANGELOG.md and in PROGRESS.md's history table. `changes/` holds only its README, and the next work PR starts a fresh fragment.

**Not updated: the package register.** This PR did not touch the "Plan v2.0 package register" further down PROGRESS.md (SESSION-PROTOCOL §3):
- FX-8 still reads "In PR".
- R0.2r, R0.3r, R0.4, EQ-1, FX-1/2/3/5/7, R1.6, CO-4, ED-I18N-1 and ED-LES-1 still read "Planned", with no merge SHA, CI run or Pages run.

Before GK1 (KPI-31), set each row to its real lifecycle, merge SHAs and Pages runs. The history table above it has the facts.

## 7. K1 scope not yet done

The scope comes from plan S05 §05.3 (the K1 row) and `packages.tsv`. The GK1 gate has not been run.

| Package | Remaining in K1 | Notes |
|---|---|---|
| R1.6 | PR4–5 (identical-output perf: M-PLATFORM-003/005/006/007), PR8 (012/013/014), PR9 (015, architecture test), PR10 (018, `persist()`); PR11 is #141 | PR3 (#132, the EO-STO-1 differential harness) is merged, so PR4–5 can start: they must leave `tests/eo-sto/ref/` alone and pass EO-STO-1 unchanged. Plan text: S10 §10.3 (draft), in `docs/development/plan-v2-draft/sections/S10-r16-fx-data-safety.md` on branch `claude/hopeful-allen-1o0vmh` (`3e18dbc`). |
| R0.4 | Oracles and harnesses: M-PHYSICS-002/003/060, M-PLAN-002/003/004/010/018, M-BUILD-024/025, M-PLATFORM-041 (M-PLAN-020 is #140) | Needed to close G0 at GK1 (the oracle catalogue on the CO-6 base). |
| EQ-2 | Render start-up, prewarm, transitions: not started | See the start-up item in §9: Home draws no frame for about 8 s, and shader compiles take 9–18 s on CI's software GPU. EQ-1 is done (#130). |
| CO-4 | M-LAUNCH-004, 006, 008, 022, 025, 026, 032, 066; M-PLATFORM-037 (011 is #134; 027 was done in K0) | M-LAUNCH-066 is a CSS overlap with no CSS room left. |
| FX-1 | M-BUILD-029 (P2): locale decimal comma in number inputs outside Build (the RU repro, `lifetime.ts`, the `ui/orbit/dom.ts` part left out of FX-3 PR1, the `panel.ts` hook) | — |
| FX-2 | M-LEARNING-002, 003 (after R1.6 PR5), 027 | — |
| FX-5 | M-LAUNCH-035 (failed-state style) | Needs CSS, and there is no CSS room. |
| ED-I18N-1 | M-LEARNING-030, the glossary (029 is #135) | — |
| ED-INST-1 | M-LEARNING-045, 046, 047 (privacy/PDPA, P1 docs); M-PLATFORM-073 (Thai user guide) | D-49 and D-60 are answered. |
| ED-LES-1 | M-LEARNING-007, 008, 009, 010, 011 (012 is #136) | — |
| R4.1 | Catalogue and source ledger research: M-PHYSICS-040, with M-ORBIT-043 and M-PHYSICS-048/049 (all K1–K3) | The WIP branch in §5 (M-PHYSICS-041 / M-PLATFORM-070) is K3 docs work done early, not K1 scope. |
| HU-2, HU-3, HU-6 | Human sessions and native-speaker review | These need people, not agents. |
| I-HOOKS | main.ts / index.html hooks | — |

Packages with no K1 item left:
- FX-3 (M-ORBIT-001/002/003/007/008/029).
- FX-7: its K1 part, step 0, is done (#102). Steps 1–3 (M-PLATFORM-022 rest; 023 per D-69 (ก); 025, 026) are K2.

**Order (D-63).** In each lane, P0/P1 bugs that lose data or show false results come first, then identical-output work.
- The open P1 bugs are CO-4's M-LAUNCH-008, 025 and 032 (lane P reviews 032). They can merge under the standing approval only if they stay under the ceilings.
- In lane L, R1.6 PR4–5 come next.
- HU-1 (K0–K2) is also open: its first session waits on the ED-INST-1 privacy statement (M-LEARNING-047).

**K2 and GK1.**
- K2 is not authorized. Under D-65 the owner authorizes it at GK1, after adopting the plan sections K2 uses.
- GK1 is the S05 §05.4 checklist:
  - a frozen candidate SHA;
  - all Pages journeys passing on it;
  - heavy and fleet runs if physics was touched;
  - budgets;
  - KPI rows against `reports/kpi-GK0.md`;
  - R7.1/R7.2;
  - the owner's adoption of K2's sections.
- The integration session prepares GK1 and the owner approves it. GK1 must also report how much of the D-38 K1 allowance was used.

## 8. Wave-2 finish (this session's last step)

The final review covered the four wave-2 branches; each review approved its branch with no open findings.
- CO-4 s2 (M-LAUNCH-011), ED-I18N-1 (M-LEARNING-029) and ED-LES-1 (M-LEARNING-012) are bug fixes. They were merged under the standing approval as #134, #135 and #136.
- R0.4 (M-PLAN-020) is tooling. The owner approved it in chat on 2026-10-08, and it merged as #140.

Before #140, the three branches held by the size ceilings were merged under the owner's `k1-final-budget` option a:
- FX-1 s4 (#137, at 08:10Z, which also carries the raise);
- the notice line (#138) and R1.6 PR7 (#139), both at 20:35Z.

Two points from those merges:
- **#137 and its sizes.** #137 was measured together with the other two before it merged. Each of the other two was then measured again on main after #137.
- **PR7 and EO-STO-1.** PR7 met #132's EO-STO-1 harness and needed one type cast in `tests/eo-sto/harness.ts`; `ref/` is untouched, and a second agent approved it.
  - The D-68 collision path is outside EO-STO-1's sequences. `workspace-media`, `profile-media-notice` and the `legacy-media-migration` journey cover it.
  - On a collision the catalogue now stores `mediaMigrated: true`, where `23ede7f` kept `false`. A later identical-output PR must not "fix" that against `ref/`.

## 9. Known issues and follow-ups

- **`fx8-context-loss` failed in 6 of 14 Pages runs on main: the cause is found, the fix is on a branch.** It is a test bug, not an app bug, with confidence about 0.88. An evidence sweep, three independent investigators and a local experiment reached this, and two skeptics could not refute it. The full report is `docs/development/reports/T-fx8-picture-moment.md` on branch `claude/t-fx8-picture-moment-s1`.
  - **Failing runs.** 37536297987 (`6fea83f`, shard 3), 37548907257 (`23ede7f`, shard 3), 37570915922 (`4de951f`, shard 2), 37745862803 (`a74494f`, shard 3; the run was then cancelled by the next merge), 37748125764 (`04a1188`, shard 1) and 37852660960 (`0b466c1`, #120, shard 1, a = 131.6; then cancelled). The branch report's table has the first 13 runs. Each failed only in the first, in-flight Launch case: "the restored picture differs from the one before" (75th percentile pixel change 13–19 against the limit of 12).
  - **The restore is correct.** Shown the same moment of the flight, the restored context draws the same picture (p75 0–1).
  - **What the test does wrong.** It takes the "before" picture paused at the loss time (`tests/browser/journeys/fx8-context-loss.mjs:84-85` on `3e15303`). It then plays on through the loss (`:87`) and takes the "after" picture about 5 s of flight later (`:110-111`).
  - **Why only some runs fail.** The loss time is not controlled. It comes at the first 500 ms poll past T+120 at warp 10, and warp-10 worker steps still pending when warp 1 is set add another 2–5 s, so the loss lands 4–15 s past T+120. When it lands after about T+131.5, the window crosses the six-DOF load-relief release at 500 Pa near T+135 (`src/physics/simulation.ts:1022`, `:1109`; `src/i18n/en.ts:4140`). The stack then pitches over from 20° to 6° in 4 s, so the picture really changes. A flight with no loss at all fails the same comparison (p75 15–20).
  - **Things that play no part.** Shard, region, runner image, commit and the journeys run before it.
  - **Proposed fix (test only, on the branch).** The case seeks back so the "after" picture is taken at the before picture's flight time (`window.orbitlab.shown.t`), and checks that both pictures show the same moment. No threshold moves, and the clock and recording checks are unchanged.
  - **Failing first** (`50f9362`). The loss is pinned at T+133. It failed 5/5 locally on `3e15303` with CI's signature, and passes at p75 0–2 with the fix (`d73f576`). It still fails a restore that skips the sky tables.
  - **Before merging:**
    - Get CI evidence for fx8. PR CI runs only smoke journeys, and Deploy to GitHub Pages builds only main's tip (`deploy.yml:42-46`), so neither can run fx8 on the branch. The options are:
      - dispatch "Audit browser acceptance" (`workflow_dispatch`) on the branch, which runs every journey in one 35-minute job;
      - or agree with the owner that the local runs, plus the first post-merge Pages run, are the evidence.
    - Get the owner's answer on whether comparing against a picture replayed at the same moment counts as a changed assertion (SESSION-PROTOCOL §1 step 3).
  - **Until it merges.** A Pages run on main can still fail on this journey. Check the first Launch case's "while lost, T+a" value: a ≳ 131.5 is this cause, not a regression; the lowest failure so far was at a = 131.6.
- **Start-up performance on CI's software GPU** (found while fixing #133):
  - `#loading` hides before the first frame, and Home draws no frame for about 8 s afterwards (`src/main.ts:995`).
  - "Continue" then costs 9–18 s of shader compiles (`prewarm`, `src/main.ts:2007` on origin/main).

  This belongs to EQ-2.
- **M-PLAN-028 (R3.1r)** must build on #122 (M-PLAN-031), because both touch the stored-mission restore path. The review of #122 noted that a clean restore still writes once in this version's format.
- **M-LAUNCH-031 residual** (#117 review): the off-target fallback uses unrounded flags from the cursor's orbit. The lasting fix is to put unrounded `inc`/`raan`/`pe`/`ap` on the completion event (`src/physics/sim/burns.ts`). That is physics work and needs the owner's approval.
- **D-68 follow-ups** (R1.6 PR7 report):
  - The "keep both / choose" action for colliding legacy recordings is not built. Today both copies are kept, and the learner's own audio is used.
  - The catalogue does not list the collisions; the unowned records in the media store are the list.
- **Texture follow-up** (#126 report): making the 2048 px baseline textures and the vehicle photos progressive would save about 93 kB more with identical pixels, but decoding gets 1.3–3.2× slower. This is the owner's call.
- **`tests/verification/jpeg-pixels.test.mjs`** (#126 review, minor): it hashes pixels with the jpeg-js bundled in playwright-core. If a Playwright bump changes the decoder, the test fails with a misleading message, so record the decoder version.
- **CI behaviour**:
  - Push and pull_request runs on the same branch cancel each other. A cancelled run shows "verify failed", and GitHub then reports a PR as `unstable` while its pull_request run is green. That is noise; the owner's #129 changes this.
  - `gh run rerun --failed` is rejected by the verification plan ("Workflow differs from the verification plan"). Re-run the whole run instead, or merge `origin/main` in for a fresh run.
  - GitHub GraphQL is blocked from Claude sessions: use REST, for example `gh api repos/royin001/orbitlab/pulls -f …`.
  - Never cancel runs on `main`, because that cancels the Pages deploy.
  - Each code merge cancels the previous Pages run on purpose (concurrency).
  - A run whose commit is no longer main's tip skips every job after `plan` and still shows success, so check the `publish` job, not the run's conclusion.
  - Markdown-only changes run neither CI nor Pages (the `!**/*.md` path filters in ci.yml and deploy.yml). After such a merge, the newest code waits for the daily scheduled Pages run or a manual dispatch on main. A records PR therefore has no CI run (#121 merged with none).
- **Container / limits**:
  - The cloud container restarted once, and the usage limit stopped agents several times.
  - Push every branch as soon as it has commits.
  - Workflows resume from their journal (`resumeFromRunId`).
- **Stale branches**: about 40 old `claude/*` branches on origin are fully merged or superseded, most from before K0, plus every branch merged in K1. The owner may delete them, after checking each one.

## 10. Commands

```
npm ci                                   # once
npm run -s typecheck
npx vitest run <files>                   # full suite ~10 min; CI runs it
node --test tests/verification/*.test.mjs tests/browser/shard.test.mjs
npx vite build && node scripts/bundle-budget.mjs
CHROMIUM=/opt/pw-browsers/chromium node tests/browser/run.mjs <journey>   # journeys in tests/browser/journeys
node scripts/verification/select-checks.mjs origin/main..HEAD            # which checks a change needs (#120)
```
