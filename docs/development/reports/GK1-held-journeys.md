# GK1 decision 7: the six held journeys on a teaching-tools build of candidate 1842a86 / journey ที่พักไว้ 6 ตัว บนบิลด์ที่เปิดเครื่องมือครู

> **Update 2026-10-31: no GK1 candidate until the HU-6 session is scheduled.** After this file was brought to `1842a86` (2026-10-30), four more PRs merged to main on the owner's answers in other sessions' chats: #187 (`ef9d3f6`, 2026-10-30T19:39:11Z) and #193 (`dcfa065`, 20:23:22Z), then #184 (`f68faab`, 2026-10-31T00:01:33Z) and #189 (`089b34e`, 06:44:12Z). Each changes files under `src/physics`, and #184 also raises size ceilings. The owner then answered "ตรึงตอนนัด HU-6 (แนะนำ)": no candidate is frozen now, and bug-fix PRs may still merge; when the owner sets the HU-6 date, main at that time is frozen as the candidate, the evidence is made again on it, and nothing merges until the HU-6 session ends ([DECISIONS](../../DECISIONS.md), "Decided 2026-10-31 (the GK1 candidate after #187 and #193; chat)"). So "the candidate" and the stamp `v0.1.0 · 1842a86` in this file describe 2026-10-30; they are kept as a dated record, not as the current state.
>
> **อัปเดต 2026-10-31: ยังไม่มี candidate จนกว่าจะนัด HU-6** หลังไฟล์นี้แก้ให้ตรงกับ `1842a86` (30 ต.ค.) มี PR merge เข้า main อีกสี่ตัวตามที่คุณอนุมัติในแชตของเซสชันอื่น คือ #187 และ #193 (30 ต.ค.) แล้ว #184 และ #189 (31 ต.ค.) คุณตอบว่า "ตรึงตอนนัด HU-6 (แนะนำ)" ตอนนี้จึงยังไม่ตรึง candidate และ PR แก้บั๊กยัง merge ได้ เมื่อคุณนัดวัน HU-6 จะตรึง main ณ ตอนนั้นเป็น candidate ทำหลักฐานใหม่บนนั้น แล้วห้าม merge จน HU-6 จบ ข้อความเรื่อง candidate และรหัสรุ่น `v0.1.0 · 1842a86` ในไฟล์นี้จึงเป็นสภาพของวันที่ 30 ต.ค. ไม่ใช่ของปัจจุบัน

> **สรุปสำหรับเจ้าของ (ภาษาไทย)**
>
> - รันใหม่บน candidate `1842a86`: #185 merge เป็น `1842a86` เมื่อ 2026-10-29 คุณตอบว่า "HU-6 ยังไม่ได้ทำ ใช้ 1842a86 เป็น candidate ใหม่ครับ" แล้วเลือก "Redo all (Recommended)" (2026-10-29) ให้ทำหลักฐานที่ตัวเลือกนั้นระบุใหม่บน `1842a86` (heavy, six-DOF fleet, held journeys, KPI baselines และ revert drill) หลักฐานข้อ 7 ในไฟล์นี้จึงรันใหม่บน `1842a86` `1842a86` ต่างจาก `7263004` แค่ #185: `src/physics/frame.ts` test ใหม่หนึ่งไฟล์ รายงานหนึ่งไฟล์ และ fragment หนึ่งไฟล์
> - ทำตามข้อ 7 ของคุณ (ก "ยอมรับเป็นข้อจำกัด") (`DECISIONS.md:357`): รัน 6 journey ที่พักไว้พร้อมเครื่องมือครูตั้งแต่ #156 หนึ่งครั้ง บนบิลด์ของ candidate `1842a86` ที่เปิด `TEACHER_TOOLS` เมื่อ 2026-10-29 บิลด์นี้ไม่ได้ commit และไม่ได้เผยแพร่ ผลนี้เป็นหลักฐานของข้อจำกัด ไม่ใช่การผ่านใน Pages
> - **ผล: ผ่าน 6 จาก 6** ในรอบแรก รันทีละตัว ไม่มีการรันซ้ำ รวม 319.2 วินาที: `case-worksheet-exports`, `classroom-preparation`, `fx2-design-check-focus`, `instructor-loading`, `lesson-packs`, `recheck`
> - หลักฐานเพิ่ม (ข้อ 7 ไม่ได้ขอ): อีก 4 journey ที่ข้ามขั้นของครูเมื่อพักเครื่องมือ ผ่านทั้งตัว 4 จาก 4 บนบิลด์เดียวกัน รวม 844.1 วินาที แต่ `r7-cross-system` ไม่มีขั้นของครูเพิ่ม เพราะยังไม่มีโค้ดสำหรับการตรวจผลและ worksheet DOCX
> - งบขนาด: บิลด์ตามที่ commit (ปิดสวิตช์) ผ่าน precache code 14 653.9 จากเพดาน 14 654 kB ส่วนบิลด์ที่เปิดเครื่องมือครู**เกินงบ** `index-*.js` เกิน 0.5 kB และ precache code เกิน 0.6 kB บิลด์นี้ไม่ได้เผยแพร่ จึงไม่กระทบข้อ 7 แต่ถ้าจะเปิดเครื่องมือครูภายหลัง ต้องขอเพดานเพิ่มราว 1 kB ในสองช่องนี้ (D-38)
> - ข้อบกพร่อง Escape บนมือถือที่พบในรอบแรกยังอยู่ที่ `1842a86`: ตรวจซ้ำบนบิลด์ปิดสวิตช์ ได้ผลเหมือนเดิมทั้ง 3 แถว (ในหน้าบทเรียนที่เปิดรายการส่วนไว้ กด Escape ครั้งเดียว รายการปิด และหน้าบทเรียนปิดไปด้วย) ไม่ได้แก้ตอนนี้ (P4 ก: ไม่เพิ่ม PR โค้ดก่อนตรึง) เสนอเป็นงานติดตามหลังตรึง
> - GK ข้อ 2 ยังเป็น "บางส่วน" เพราะใน Pages ของ `1842a86` (40957726247) 6 journey นี้ก็ไม่อยู่ในการผ่านเช่นกัน เรื่องเครื่องมือครูใน K2 คุณตอบ S4 เมื่อ 2026-10-28T02:59:22Z ว่า "ข พักต่อ ตรวจ G0 บนบิลด์ครู (แนะนำ)"
> - รอบแรกบน `7263004` (2026-10-26) เก็บไว้ท้ายไฟล์ตามที่เขียนไว้เดิม
> - ไม่มีคำถามใหม่ในไฟล์นี้

```yaml
envelope: v2
package: GK1 record (decision 7 evidence)
item: GK checklist item 2 (S05:112), the six journeys held with the teaching tools since #156
wave: K1 (GK1 record)
lane: I (integration session)
change_kind: docs (evidence only; no app code, test or build change committed)
owner_authorization:
  - {date: 2026-10-26, via: chat, question: "GK1 decision 7", answer: "ก ยอมรับเป็นข้อจำกัด (แนะนำ)", where: "DECISIONS.md:357"}
  - {date: 2026-10-29, via: chat, question: "the GK1 candidate after #185", answer: "HU-6 ยังไม่ได้ทำ ใช้ 1842a86 เป็น candidate ใหม่ครับ", when: "before 22:19Z", where: "DECISIONS.md, 'Decided 2026-10-29'"}
  - {date: 2026-10-29, via: chat, question: "what to redo on 1842a86", answer: "Redo all (Recommended)", when: "between 22:19:01Z and 22:26:15Z", meaning: "the evidence the option names redone on 1842a86, this run among it", where: "DECISIONS.md, 'Decided 2026-10-29'"}
candidate: {label: candidate 1842a86, sha: 1842a86cee5a1dc4fd40d536d2bc882d31750021, pr: "#185", published: "Pages 40957726247, deploy-pages 2026-10-29T21:49:41Z"}
previous_candidate: {sha: 72630046fc5eb56f1797e5363b6f9ad293ff9d38, pr: "#179", published: "Pages 40385448079, deploy-pages 2026-10-26T19:41:58Z", run: "2026-10-26, the last section of this file"}
build: {switch: "src/ui/held.ts:9 set to TEACHER_TOOLS = true, local only, never staged or committed", command: "npm run build (as deploy.yml:156)", stamp_seen: "0.1.0+1842a86 (recheck)", published: never}
run: {date: 2026-10-29, start: "22:28:38Z (scratch worktree made)", journeys: "22:35:09Z to 22:55:42Z", end: "22:59:21Z (scratch worktree removed)", held_six: "6 of 6 pass", extra: "4 of 4 pass", reruns: 0}
result: pass (evidence for a limitation; not a Pages pass)
evidence: local run, not committed (builds, logs, screenshots, exported files)
```

**How to read this file.** The run on the candidate `1842a86` (2026-10-29) comes first. The first run, on `7263004` (2026-10-26), is kept as written in the last section. `file:n` is the file at the candidate `1842a86`. Every file cited here is the same at `7263004`: #185 changes only `src/physics/frame.ts`, `tests/debris-replay.test.ts`, `docs/development/reports/replay-debris-arc.md` and `changes/claude-gifted-gauss-ojjpaj.md`. "Local run, not committed" marks evidence from the integration session's runs on 2026-10-29 and 2026-10-26: their numbers are here, their files are not in the repository. Times on this machine are trend-only.

## Why this run

- GK checklist item 2 (`S05:112`, adopted) asks that every journey in Pages mode pass on the candidate.
- Since #156 (`b16b09e`) the teaching tools are held back (owner, 2026-10-17; `src/ui/held.ts:9`, `TEACHER_TOOLS = false`; [teaching-held.md](teaching-held.md)). Six journeys are listed as held and not run while the switch is off (`PROGRESS.md:237`).
- In the candidate's published Pages run, [40957726247](https://github.com/ROYIN001/Orbitlab/actions/runs/40957726247), each of the three browser shards logs the six as held, not run. They are not among its 37 journeys.
- GK1 decision 7, option (ก) (`DECISIONS.md:357`): accept this as a GK1 limitation, with the agent running the six once on a build with the teaching tools on, not committed, as evidence.
- **Why a second run.** The six were first run on 2026-10-26, on `7263004`, the candidate then (last section).
  - #185 merged at 2026-10-29T21:25:44Z as `1842a86`, on the owner's "merge #185 ได้เลยครับ" (21:24:24Z). The GK1 merge hold (H2, [HANDOVER-K2.md](../HANDOVER-K2.md)) was in force, and the session that merged #185 did not know of it.
  - The owner then answered "HU-6 ยังไม่ได้ทำ ใช้ 1842a86 เป็น candidate ใหม่ครับ" (before 22:19Z). To the next question in chat, the owner chose "Redo all (Recommended)": the evidence the option names is redone on `1842a86`, this run among it ([DECISIONS.md](../../DECISIONS.md), "Decided 2026-10-29").
  - Decision 7 asked for one run. This second run rests on the "Redo all (Recommended)" answer.
- **What differs between the two candidates.** `1842a86` differs from `7263004` only by #185: `src/physics/frame.ts`, a new test (`tests/debris-replay.test.ts`), a report (`replay-debris-arc.md`) and a change fragment, 4 files in all (`git diff --stat 7263004 1842a86`). `src/ui/held.ts`, `tests/browser/` (every journey file), `package.json`, `package-lock.json` and `budgets.json` are the same at both.
- This file is that evidence. It is not a Pages pass. GK item 2 stays "partial" in [kpi-GK1.md](kpi-GK1.md) ("Gates").

## Result for candidate 1842a86

- **The six held journeys: 6 of 6 passed** on the first run, one at a time, with no reruns. Total 319.2 s by `run.mjs` and 326.6 s wall clock.
- **Extra evidence, not part of decision 7:** the four journeys that skip teacher steps while the tools are held also passed whole, 4 of 4, on the same build. Total 844.1 s by `run.mjs` and 906.7 s wall clock.
  - One caveat for `r7-cross-system`: with the switch on, it runs no extra teacher step. Its code only drops two "held" log lines. So this run does **not** cover the results check or the worksheet DOCX (see below).
- **No failures.** No journey failed, so no rerun or diagnosis was needed. No log has an error line. A search of the ten logs for `error|warn|fail|✗|⏸|held` matches one line, `case-worksheet-exports`' own note "24/24 actual downloads saved in … DOCX pagination still needs independent rendering and visual review". It matches only through `held` in the local worktree's path.
- **The size budget.** The build as committed (switch off) passes: precache code 14 653.9 / 14 654 kB. The teaching-tools build fails: `index-*.js` by +0.5 kB and precache code by +0.6 kB (below). That build is never published, so the result does not gate decision 7. It does mean that turning the tools on later needs about +1 kB on those two ceilings. On S4, the teaching tools in K2, the owner answered "ข พักต่อ ตรวจ G0 บนบิลด์ครู (แนะนำ)" (chat, 2026-10-28T02:59:22Z): they stay held, the G0 oracles that need held journeys run once on an uncommitted teaching-tools build, and no ceiling is raised ([DECISIONS.md](../../DECISIONS.md), "Decided 2026-10-28").

## Journeys (candidate 1842a86, teaching-tools build)

- "run.mjs s" is the journey's own `✓ <name> (N s)` line.
- "Wall s" is the time from the start to the exit of the journey's `run.mjs` process, to 0.1 s. It includes the browser launch and the static server.
- "Total s" is `run.mjs`'s `1/1 journeys passed in N s` line.
- Every process exited 0. There was no rehearsal on `1842a86`, so the last column gives each journey's start and end.

| # | Journey | Set | Result | run.mjs s | Wall s | Total s | Start → end (UTC) |
|---|---|---|---|---|---|---|---|
| 1 | `case-worksheet-exports` | held six | **pass** | 136.1 | 137.9 | 137.8 | 22:35:09.044Z → 22:37:26.981Z |
| 2 | `classroom-preparation` | held six | **pass** | 64.8 | 66.1 | 66.0 | 22:37:26.989Z → 22:38:33.079Z |
| 3 | `fx2-design-check-focus` | held six | **pass** | 17.1 | 18.3 | 18.2 | 22:38:33.089Z → 22:38:51.402Z |
| 4 | `instructor-loading` | held six | **pass** | 40.6 | 41.5 | 41.3 | 22:38:51.410Z → 22:39:32.869Z |
| 5 | `lesson-packs` | held six | **pass** | 41.5 | 42.7 | 42.6 | 22:39:32.882Z → 22:40:15.599Z |
| 6 | `recheck` | held six | **pass** | 19.1 | 20.1 | 20.0 | 22:40:15.609Z → 22:40:35.751Z |
| | **held six, total** | | **6/6** | **319.2** | **326.6** | 325.9 | |
| 7 | `mobile-smoke` | extra evidence | **pass** | 61.1 | 61.9 | 61.8 | 22:40:35.765Z → 22:41:37.697Z |
| 8 | `profile-session-safety` | extra evidence | **pass** | 155.5 | 176.0 | 175.9 | 22:41:37.705Z → 22:44:33.662Z |
| 9 | `workspace-navigation` | extra evidence | **pass** | 119.5 | 139.0 | 138.9 | 22:44:33.672Z → 22:46:52.653Z |
| 10 | `r7-cross-system` | extra evidence | **pass** | 508.0 | 529.8 | 529.7 | 22:46:52.663Z → 22:55:42.511Z |
| | **extra, total** | | **4/4** | **844.1** | **906.7** | 906.3 | |

The six started at 22:35:09Z, the extras at 22:40:35Z, and the last journey ended at 22:55:42Z. The yaml's start and end (22:28:38Z, 22:59:21Z) are when the scratch worktree was made and removed.

### What each journey showed (from its log and screenshots)

- **`case-worksheet-exports`:** 24 of 24 downloads were saved: HTML and DOCX (12 each), in Thai and Russian (12 each), for the theos2, cz5b and iridium cases and their keys.
  - The journey writes them to the gitignored `tests/browser/artifacts/case-worksheet-exports/`. All 28 files (24 downloads, 3 export-control screenshots and `manifest.json`, dated 22:35:28.771Z to 22:37:25.810Z) were copied out with their times kept, at 22:38:49Z. Their SHA-256 list matches the source folder (local, not committed).
  - `manifest.json` stamps the run: `sourceSha` `1842a86cee5a1dc4fd40d536d2bc882d31750021`, node `v22.22.0`, chromium `153.0.8010.12`, `startedAtUTC` 22:35:09.765Z, `finishedAtUTC` 22:37:25.811Z, `completed: true`.
  - Its `builtIndexSha256` `b17c4a922c9e7746e1a22b7d4bb7b802d7075e0db8714a579278bb636c7c7cf7` is the `index.html` line of the teaching-tools build's `SHA256SUMS`, not the switch-off build's (`c9a33b2e…`). So the journey ran on the teaching-tools build.
  - All 24 files match the manifest's `sha256` and `bytes`. Each of the 3 pages (theos2, cz5b, iridium) has 0 uncaught errors and 0 console errors. The cz5b export-control screenshot shows the Russian Worksheets tab with the case worksheet's two download buttons.
- **`classroom-preparation`:** the service-worker update lifecycle was logged (before-update → updatefound → worker-installed → before-prepare → after-prepare).
- **`fx2-design-check-focus`:** focus was kept while the check ran (`{"kept":true,"tag":"INPUT","value":"123.4","caret":[3,3],"connected":true}`).
- **`instructor-loading`:** passed with no log lines.
- **`lesson-packs`:** ipst-basic had 6 lessons and 11 codes, ipst-earth-space 4 and 8, ipst-physics 6 and 10, rtaf-academy 6 and 20, ru-24-05-06 7 and 10. It was "flown to its grade in 6 s".
- **`recheck`:** `check_results` gave 6 records in 3.2 s; `{"match":4,"borderline":2,"differs":0,"cannotRefly":0}`. The page reported **"the page's build 0.1.0+1842a86"**. The largest gap between Chromium and Node was 7.59e-11 (`flownTo`).
  - Its screenshot shows the five Lessons tabs: Lessons, Placement test, Worksheets, Write a scenario and Check results. So the switch reached the build.

### Extra evidence: the teacher steps the four journeys skip while the tools are held

The four journeys import `TEACHER_TOOLS` from `tests/browser/held.mjs`, which reads `src/ui/held.ts` as text (`tests/browser/held.mjs:9`), so the same edit turns their teacher steps on. Proof that the runner saw the switch as on: `run.mjs --list` printed "⏸ teaching-held: held, not run: the teaching tools are shown: nothing is held back to check".

| Journey | Teacher steps that run only when the switch is on | Evidence they ran here |
|---|---|---|
| `mobile-smoke` | two rows: `#/lessons/check` (the Thai results check, `.recheck-run`) and `#/lessons/author` (the Russian scenario writer, `.author-crit`) at 390×844 touch (`mobile-smoke.mjs:27-35`) | the four `switch` lines in its log (below). Its two screenshots of those rows do not show these pages |
| `profile-session-safety` | visits to `#/lessons/author` (`.author`) and `#/lessons/worksheets` (`.ws-page`); the stored draft bytes must stay unchanged (`profile-session-safety.mjs:130-133`) | the pass itself: with the switch on, `:130-133` call `visit()`, which waits for `.author` and `.ws-page` to be visible (`:120-124`). The log line "Actual builder and instructor views plus JSON export preserve untouched opaque/newer draft bytes" is no evidence: it is printed whatever the switch (`:140`), and the switch-off Pages run on the candidate logs it too (40957726247, `browser (2)`) |
| `workspace-navigation` | the curriculum packs on `#/lessons` (`ipst-basic` pack, 5 pending reviews, 5 pack drafts); "Prepare a class" in My work in Thai and Russian, fitting a mobile viewport with no raw `classroom.*` keys; My work has 4 tabs, not 3 (`workspace-navigation.mjs:52-56`, `:69-80`, `:124`) | these are asserts, not log lines. The journey passed with `TEACHER_TOOLS` true, so the asserts for 5/5 and 4 tabs held |
| `r7-cross-system` | **none.** `TEACHER_TOOLS` is imported at `r7-cross-system.mjs:53` and used only at `:426` and `:443`, as `if (!TEACHER_TOOLS) t.log(… held …)`. The header (`:28-34`) says step 6's results check and step 7's worksheet DOCX are "held back". With the switch on, the journey only drops those two log lines | both passes did steps 1–8: the Thai 390×844 pass ended at 240 s and the Russian 1280×800 pass at 268 s, each with `done: cursor T+4140.171 s, 764.321 of 858 kg left`. The log has no "held with the teaching tools" line (0 matches). The run shows no results check and no DOCX export, because the journey has no code for them. [R7.1-GK1.md](R7.1-GK1.md) ("Held parts") already says the DOCX "is still to be added to this journey" |

#### `mobile-smoke`: the log is the proof, not the screenshots

- Its log has four `switch` lines, one per row, in row order:
  1. th "เลือกส่วน" (placement test)
  2. ru "Орбита · Инженер. Выбрать раздел и уровень" (Orbit engineer page)
  3. th "เลือกส่วน" (results check)
  4. ru "Выбрать раздел" (scenario writer)
- With the switch off, the filter at `mobile-smoke.mjs:35` drops rows 3 and 4, so the log would have two such lines.
- A row prints its `switch` line (`:118`) only after `page.waitForFunction(p.isRight)` passed (`:39-40`, `continue` on failure) and the list opened (`:86`). For row 3, `isRight` needs `lessonsPage` `check` and a `.recheck-run`. For row 4 it needs `lessonsPage` `author` and a `.author-crit` (`:27-30`). The log has no FAIL line, and the journey passed.
- **The two screenshots of rows 3 and 4 do not show the teacher pages.** `app.shot` (`:124`) runs after the Escape at `:119`, and that Escape also leaves the lessons page (see "Follow-up for the records"). So both show the Launch landing page, in Thai and in Russian. Row 1's screenshot also shows the Thai landing page. Row 2's shows the Orbit engineer page.
- Row 3's screenshot (SHA-256 `d6a118a10b9cfe519c51a30e88b3ebac150a538a0d239f01bf4649f6ef5aad2a`) is not byte-identical to row 1's (`007ec3ab…`).
  - A pixel comparison (195×422 captures) finds 3 111 of 82 290 pixels different, all inside x 6–188, y 45–61: the section-switch strip.
  - The byte comparison with a switch-off placement-test screenshot, made in the run on `7263004`, was not repeated: there is no switch-off `mobile-smoke` run on `1842a86`.

## Budget: switch off (KPI-03, committed snapshots) against switch on (informational)

Ceilings are `budgets.json` at the candidate, the same file as at `7263004` (lowered by #179). kB = 1 000 bytes, raw. Both builds used the committed data snapshots (no refresh).

| Group | Off: size / ceiling (overrun) | On: size / ceiling (overrun) |
|---|---|---|
| `index-*.js` | 2 634.8 / 2 635.0 (−0.2) ok | **2 635.5 / 2 635.0 (+0.5) FAIL** |
| `index-*.css` | 176.9 / 177.0 (−0.1) ok | same |
| other chunks | 771.4 / 772.0 (−0.6) ok | 771.5 / 772.0 (−0.5) ok |
| `i18n-*.js` | 1 729.0 / 1 729.0 (−0.0) ok | same |
| precache | 15 773.1 / 16 053.0 (−279.9) ok | 15 773.8 / 16 053.0 (−279.2) ok |
| **precache code** | **14 653.9 / 14 654.0 (−0.1) ok** | **14 654.6 / 14 654.0 (+0.6) FAIL: code ceiling** |
| precache data/ | 1 119.2 / 1 399.0 (−279.8) ok | same |
| `author-view-*.js`, `check-view-*.js` | 26.4 / 26.5; 11.5 / 12.0 ok | same |
| workers, catalog, lesson-file, workspace-content | all ok, the same in both | same |
| initial load (report only) | 5 076.7 kB raw, 1 426.6 gzip, 1 122.6 brotli | 5 077.4, 1 426.8, 1 122.4 |
| textures (report only) | 3 789.4 kB | 3 789.4 kB |

- KPI-03 at the candidate (committed snapshots): code **14 653.9 / 14 654 kB**, data/ 1 119.2 / 1 399 kB, total 15 773.1 / 16 053 kB.
  - The candidate's Pages run, [40957726247](https://github.com/ROYIN001/Orbitlab/actions/runs/40957726247), gives the same two code figures in its bundle check: `index-*.js` 2 634.8 of 2 635.0 and precache code 14 653.9 of 14 654.0 kB.
  - The Pages build uses refreshed data/, so its data/ and total differ. They are in [kpi-GK1.md](kpi-GK1.md) (KPI-03).
- Only four rows differ between the two builds: `index-*.js`, other chunks, precache and precache code.

## Build stamps (candidate 1842a86)

| | Switch off (KPI-03) | Switch on (the journeys) |
|---|---|---|
| `src/ui/held.ts` line 9 | `export const TEACHER_TOOLS = false as boolean;` (blob `0c83a229`, as committed) | `export const TEACHER_TOOLS = true as boolean;` (blob `a098d760`, local only) |
| Command | `npx vite build` (as `ci.yml:114`) | `npm run build` = `tsc --noEmit && vite build` (as `deploy.yml:156`) |
| Exit | 0 | 0 (tsc passed) |
| Start → end (UTC) | 22:32:14.182Z → 22:32:22.009Z (7.8 s) | 22:33:32.029Z → 22:33:46.390Z (14.4 s, with tsc) |
| Vite's own time (build log) | "✓ built in 6.13s" | "✓ built in 5.18s" |
| Build log last written (UTC) | 22:32:21.950Z | 22:33:46.334Z |
| `dist/build-info.json` `commit` | `1842a86` | `1842a86` |
| `builtAt` | 2026-10-29T22:32:21.748Z | 2026-10-29T22:33:46.258Z |
| Data snapshots (`asOf`, committed, not refreshed) | spaceWeather 2026-09-26T20:00:00.000Z; satellites 2026-09-26T16:10:54.609Z; earthOrientation 2026-09-24T00:00:00Z | same |
| `sha256(dist/SHA256SUMS)` (89 files) | `8347783c3ce4bfc1d3eaba54a82526b532e2d9714e268fd1c7bc811e0a287094` | `b360fd559594af55470698a3284ee22f38a6e2e6ecd0c7f20147cfec99031d81` |
| `dist/index.html` SHA-256 | `c9a33b2e97d3273b7c7c30265dd56219d092cb4c989693637ca5a000fe34d95c` | `b17c4a922c9e7746e1a22b7d4bb7b802d7075e0db8714a579278bb636c7c7cf7` |
| Precache manifest | `1b6c3265aaea76` (68 files) | `05be29e7681ae5` (68 files) |
| `index-*.js` | `index-ByQ1zpgu.js`, 2 634 842 B | `index-CmLRVNy_.js`, 2 635 512 B |
| `node scripts/bundle-budget.mjs` | exit 0, "bundle budget: ok". Also exit 0 with the build log as argument: no `INEFFECTIVE_DYNAMIC_IMPORT` | exit 1, "bundle budget: FAILED". Also exit 1 with the build log as argument: no `INEFFECTIVE_DYNAMIC_IMPORT` |
| Stamp the page reports | — | "0.1.0+1842a86" (`recheck` log) |

- The local stamp has 7 characters (`1842a86`). The stamp is `git rev-parse --short HEAD` (`vite.config.ts:22`), and in this clone that gives 7 characters for both `1842a86` and `7263004`. So the first run's sentence "A local build stamps 8 characters" does not hold here (see its "Build stamps", last section).
- The two builds have the same file set once hashes are dropped. Content differs in 15 of 89 files: `index.html`, `sw.js`, `build-info.json` and 12 chunks. The chunks are `index`, `archive` ×2, `assessment-view`, `author-view`, `check-view`, `media-archive`, `media-ownership`, `profile-menu`, `validation`, `worksheet-view` and `workspace-content`.

## Follow-up for the records (separate from decision 7)

The first run's screenshots exposed an app bug (last section). It is still present at `1842a86`. It does not change any result above, and it is not part of decision 7. Under P4 (ก) ("no code PR before the freeze", `DECISIONS.md:368` at `5092ac9`), nothing is changed now. It goes to the records as a follow-up item.

- **What happens:** on a lessons page on a phone, with the section list open, the user presses Escape once. The list closes, and the app also leaves the lessons page (to `#/home` when the page was opened by its address, as in the journey). One Escape should only close the list.
- **Why:** both handlers listen for `keydown` on `document`.
  - `src/ui/section-nav.ts:41`: `if (e.key === 'Escape' && this.open) this.close(true);`. It does not call `preventDefault()`.
  - `src/ui/lessons/lesson-mode.ts:269`: `if (e.key === 'Escape' && this.pageView && !e.defaultPrevented) { e.preventDefault(); this.closePage(); }`. `closePage()` (`:1391-1394`) leaves the page.
  - `git diff --stat 7263004 1842a86 -- src/ui/section-nav.ts src/ui/lessons/lesson-mode.ts tests/browser/journeys/mobile-smoke.mjs` is empty.
- **Why `mobile-smoke` passes:** its header says Escape "closes the list and restores the switch's focus" (`mobile-smoke.mjs:10-11`). The check at `:120-122` tests only that the list is hidden and the switch has focus. Both stay true after the page is left. It never checks that the route stayed the same.
- **Checked directly on the build as committed (switch off), 22:56Z to 22:58Z** (local run, not committed).
  - The build used `npx vite build`, exit 0. Its `dist/index.html` SHA-256 is `c9a33b2e…`, the same as the KPI-03 switch-off build.
  - A short probe, using the repository's own harness and server at 390×844 touch, printed the route before and after one Escape. No page errors.

  | Route, language | List open before Escape | Hash after | Lessons page after | List hidden, switch focused after |
  |---|---|---|---|---|
  | `#/lessons/test`, th | yes | `#/home` | hidden (left) | yes, yes |
  | `#/orbit/engineer`, ru | yes | `#/orbit/engineer` | (not a lessons page) | yes, yes |
  | `#/lessons/test`, th | no | `#/home` | hidden (left) | yes, no (the switch was not focused before either) |

  The third row is the intended behaviour: with no list open, Escape closes the lessons page. The first row is the bug. The three rows are the same as on `7263004`.
- **Suggested record text:** "Lessons page, phone: one Escape with the section list open also closes the lessons page (`section-nav.ts:41` does not `preventDefault`; `lesson-mode.ts:269`). Already present before the first GK1 candidate `7263004`, and unchanged at the candidate `1842a86`. `mobile-smoke` does not check the route after Escape. After the freeze: make section-nav mark the Escape as handled, and have `mobile-smoke` assert the hash is unchanged."

## Procedure as run

Local run, not committed. `<wt>` is a scratch worktree of the repository; `<out>` is a local results folder. The repository's own checkout was not edited.

```sh
CAND=1842a86cee5a1dc4fd40d536d2bc882d31750021

# a fresh scratch worktree at the candidate (2026-10-29 22:28:38Z)
git -C <repo> worktree add --detach <wt> $CAND                 # exit 0
ln -s <repo>/node_modules <wt>/node_modules
git diff --quiet 7263004 $CAND -- package.json package-lock.json   # exit 0
#   installed packages: 51 match package-lock.json at the candidate, 0 mismatched, 0 missing
#   src/ui/held.ts (0c83a229) and tests/browser/held.mjs (cf9d0b45): the same blobs at 7263004 and the candidate

# switch off: KPI-03
cd <wt> && rm -rf dist && npx vite build > <out>/build-off.log 2>&1           # exit 0
node scripts/bundle-budget.mjs > <out>/budget-off.log 2>&1                     # exit 0
node scripts/bundle-budget.mjs <out>/build-off.log > <out>/budget-off-withlog.log 2>&1   # exit 0

# switch on, local only (the diff below)
git -C <wt> apply <held-teacher-tools-on.diff>                                 # exit 0
grep -c '^export const TEACHER_TOOLS = true as boolean;$' <wt>/src/ui/held.ts   # 1
git -C <wt> diff --stat                                                       # src/ui/held.ts | 2 +-
git -C <wt> diff --cached --quiet && echo "nothing staged"                     # nothing staged
node tests/browser/run.mjs --list case-worksheet-exports classroom-preparation \
  fx2-design-check-focus instructor-loading lesson-packs recheck teaching-held   # ⏸ teaching-held …, then the six
node tests/browser/run.mjs --list mobile-smoke profile-session-safety workspace-navigation r7-cross-system   # all four listed

# build as Pages does, then the journeys, one at a time
cd <wt> && rm -rf dist && npm run build > <out>/build-on.log 2>&1              # exit 0
node scripts/bundle-budget.mjs > <out>/budget-on.log 2>&1                      # exit 1 (the two ceilings above)
node scripts/bundle-budget.mjs <out>/build-on.log > <out>/budget-on-withlog.log 2>&1     # exit 1
#   per journey, with the CI runners' font (FONTCONFIG_FILE: system-ui and sans-serif → DejaVu Sans; Inter rejected):
#   node tests/browser/run.mjs --shots <out>/<set>/shots-<j> <j> > <out>/<set>/<j>.log 2>&1
#   the six first, then the four extra journeys (runner script: 22:35:09Z to 22:55:42Z, exit 0)

# leave nothing staged or committed; restore
git -C <wt> diff --cached --quiet               # nothing staged
git -C <wt> checkout -- src/ui/held.ts          # exit 0, blob 0c83a229
git -C <wt> status --short                      # only the untracked node_modules link
git -C <wt> log --oneline -1                    # 1842a86 Replay (bug fix): … (#185)
rm -rf <wt>/dist                                # the teaching-tools build removed

# Escape check: one switch-off build, the probe, then removed
cd <wt> && rm -rf dist && npx vite build        # exit 0
node <escape-probe.mjs> dist                    # exit 0
rm -rf <wt>/dist
rm <wt>/node_modules && git -C <repo> worktree remove --force <wt>    # exit 0
#   the repository's own checkout: see item 11 below
```

### Where this differs from the method of the `7263004` run (local, not committed)

As in that run, `dist` was removed before each build, the four extra journeys ran after the six on the same build, and at the end `held.ts` was restored and `dist/` removed. The differences:

1. **A fresh worktree at the candidate**, made with `git worktree add --detach`, instead of moving an existing scratch worktree (`git checkout -- src/ui/held.ts; git checkout --detach $CAND`). `node_modules` is a link to the repository checkout's, not a separate install: the package files are the same as at `7263004`, and the 51 installed packages match the lockfile.
2. **The CI-font fontconfig file was written again from the description**, because the earlier file was not committed.
   - Under it, `fc-match` maps `system-ui` and `sans-serif` to DejaVu Sans and lists 0 Inter faces. Chromium draws `system-ui` text in DejaVu Sans, and in Inter without the file.
   - CSS `sans-serif` draws in Liberation Sans in Chromium with or without the file (Chromium's own default).
   - The app's `--sans` stack lands on `system-ui`, so it draws in DejaVu Sans, because DM Sans, Noto Sans Thai, Roboto and Segoe UI are not installed.
   - Whether the earlier file treated `sans-serif` the same way is unknown.
3. **Build start times were recorded** (7.8 s off, 14.4 s on). The `7263004` run did not record them.
4. **Wall times are to 0.1 s**, measured by the runner script (`date +%s.%N` around each `run.mjs` process). The method gives whole seconds.
5. **The budget call with the build log as argument was also made for the switch-on build.** The method made it for the switch-off build only. It exited 1 for the same two ceilings, and the log has no `INEFFECTIVE_DYNAMIC_IMPORT`.
6. **The `case-worksheet-exports` files were copied out during the run**, at 22:38:49Z, as soon as that journey had finished, not after review. No other journey writes that folder (checked with grep). The source and copy SHA-256 lists are identical.
7. **No rehearsal column, and no comparisons with numbers from other runs.** There was no rehearsal for `1842a86`. GK0's KPI-03, #179's figure on `a05ae70`, the Pages shard time of `r7-cross-system` and the Pages 7-character stamp are left out. For reference only: the `7263004` run had precache code 14 653.8 off and 14 654.6 on; this run has 14 653.9 off and 14 654.6 on.
8. **`mobile-smoke` row 3 was compared pixel by pixel with row 1 of the same run**, not byte by byte with a switch-off placement-test screenshot, because there is no switch-off `mobile-smoke` run on `1842a86`.
9. **The Escape check** used a probe script written again from the description, because the first was not committed. It uses the repository's harness and server at 390×844 touch. It ran on a fresh switch-off build right after the restore (22:56Z to 22:58Z), not in a later after-review session. The build was then removed.
10. **The local build stamp has 7 characters** (`1842a86`), not 8. `git rev-parse --short` gives 7 characters for both SHAs in this clone, so the method's sentence about 8-character local stamps does not apply here.
11. **The repository's own checkout changed during the run, by its own task.** At 22:27:56Z its `git status --short` showed 3 modified files (`docs/DECISIONS.md`, `docs/development/PROGRESS.md`, `docs/development/reports/replay-debris-arc.md`), HEAD `19ebde8`. At the end it was empty, HEAD `d674248`. The reflog shows two commits by that checkout's own task: `8eca7a8` at 22:28:23Z ("Records: the owner's answer of 2026-10-29, the GK1 candidate is now 1842a86") and `d674248` at 22:49:26Z. This run made no edit, stage or commit there; it ran only read-only git commands and `worktree add`/`remove`.
12. **Another process before the run.** At 22:28:22Z a `node --test tests/verification/…` process was running. It had exited by 22:28:30Z, before any build or journey. During the journeys only this run's processes were seen.
13. **Two small local tools** started a short Chromium process each: a font probe (CDP) and the PNG diff of item 8. They are not in the method, and both ran outside the timed journeys.
14. **The same differences from Pages as before:** no `npm run snapshots` (committed data), no `run-browser.mjs` provenance gate, and named journeys rather than shards.

## Environment

- Machine: 4 CPUs (Intel Xeon @ 2.80GHz, KVM, 1 thread per core), 15 GB RAM, no swap. Load1 0.83 at 22:35:09Z, when the journeys started. A spot check at about 22:38Z showed only this run's node and Chromium processes.
- Linux 6.18.44; Node v22.22.0; Vite 8.3.0; Playwright 1.63.0; TypeScript 7.0.2.
- Chromium 153.0.8010.12: the default `chromium.launch()` runs the headless shell (`chromium_headless_shell-1243`). WebGL is SwiftShader, from the harness's `CHROMIUM_ARGS`.
- The CI runners' font: a fontconfig file that maps `system-ui` and `sans-serif` to DejaVu Sans and rejects Inter (item 2 above).
- Journeys ran against `dist/` under `/Orbitlab/` from `run.mjs`'s own static server on 127.0.0.1, one process per journey, one after another.

## The diff (applied locally, never staged or committed)

`src/ui/held.ts` is blob `0c83a229` at both candidates, so the diff is the one used on `7263004`.

```diff
diff --git a/src/ui/held.ts b/src/ui/held.ts
index 0c83a229..a098d760 100644
--- a/src/ui/held.ts
+++ b/src/ui/held.ts
@@ -6,4 +6,4 @@
  * addresses), the curriculum packs, opening a lesson file, exporting results, lesson links and
  * scenario links, "Prepare a class" in My work, and the Orbit section's case worksheets.
  */
-export const TEACHER_TOOLS = false as boolean;
+export const TEACHER_TOOLS = true as boolean;
```

## Files (local, not committed)

- The git and `--list` output of the setup, the switch and the restore.
- The build and budget logs of both builds; `build-info.json`, `SHA256SUMS`, its SHA-256 and a SHA-256 list of every dist file, for both builds.
- The runner script, the fontconfig file and the probes, with their SHA-256; the runner's progress times and per-journey table.
- The six logs and the four extra logs, each set with its screenshots.
- The 28 `case-worksheet-exports` files and their SHA-256 lists.
- The Escape probe, its build log and its output.

For the GK1 record: keep this apart from the Pages evidence. Decision 7 is a limitation. GK item 2 stays "partial": the six held journeys are not in the Pages pass. The local run on a teaching-tools build of the candidate `1842a86` (2026-10-29) is what decision 7 asked for. The first run, on `7263004` (2026-10-26, below), was redone there on the owner's "Redo all (Recommended)" answer of 2026-10-29.

## The earlier run on 7263004 (2026-10-26)

This was the decision 7 evidence until the candidate moved to `1842a86` on 2026-10-29. It is kept as written, under its title then, "GK1 decision 7: the six held journeys on a teaching-tools build of candidate 7263004". Its headings moved down one level, notes dated 2026-10-29 mark what the run on `1842a86` changed, and "the candidate" in it means `7263004`.

> **สรุปสำหรับเจ้าของ (ภาษาไทย)**
>
> - ทำตามข้อ 7 ของคุณ (ก "ยอมรับเป็นข้อจำกัด") (`DECISIONS.md:357`): รัน 6 journey ที่พักไว้พร้อมเครื่องมือครูตั้งแต่ #156 หนึ่งครั้ง บนบิลด์ของ candidate `7263004` (candidate จนถึง 2026-10-29) ที่เปิด `TEACHER_TOOLS` บิลด์นี้ไม่ได้ commit และไม่ได้เผยแพร่ ผลนี้เป็นหลักฐานของข้อจำกัด ไม่ใช่การผ่านใน Pages
> - **ผล: ผ่าน 6 จาก 6** ในรอบแรก รันทีละตัว ไม่มีการรันซ้ำ รวม 343.4 วินาที: `case-worksheet-exports`, `classroom-preparation`, `fx2-design-check-focus`, `instructor-loading`, `lesson-packs`, `recheck`
> - หลักฐานเพิ่ม (ข้อ 7 ไม่ได้ขอ): อีก 4 journey ที่ข้ามขั้นของครูเมื่อพักเครื่องมือ ผ่านทั้งตัว 4 จาก 4 บนบิลด์เดียวกัน แต่ `r7-cross-system` ไม่มีขั้นของครูเพิ่ม เพราะยังไม่มีโค้ดสำหรับการตรวจผลและ worksheet DOCX
> - งบขนาด: บิลด์ตามที่ commit (ปิดสวิตช์) ผ่าน precache code 14 653.8 จากเพดาน 14 654 kB ส่วนบิลด์ที่เปิดเครื่องมือครู**เกินงบ** `index-*.js` เกิน 0.5 kB และ precache code เกิน 0.6 kB บิลด์นี้ไม่ได้เผยแพร่ จึงไม่กระทบข้อ 7 แต่ถ้าจะเปิดเครื่องมือครูภายหลัง ต้องขอเพดานเพิ่มราว 1 kB ในสองช่องนี้ (D-38)
> - พบข้อบกพร่องหนึ่งข้อจากภาพหน้าจอ ซึ่งมีอยู่แล้วก่อน candidate: บนมือถือ ในหน้าบทเรียนที่เปิดรายการส่วนไว้ กด Escape ครั้งเดียว รายการปิด และหน้าบทเรียนปิดไปด้วย ไม่ได้แก้ตอนนี้ (P4 ก: ไม่เพิ่ม PR โค้ดก่อนตรึง) เสนอเป็นงานติดตามหลังตรึง
> - GK ข้อ 2 ยังเป็น "บางส่วน" เพราะ 6 journey นี้ไม่อยู่ในการผ่านของ Pages เครื่องมือครูจะกลับมาใน K2 หรือไม่ คือคำถาม S4 ตอนอ่านบันทึก GK1 ซึ่งคุณตอบเมื่อ 2026-10-28T02:59:22Z ว่า "ข พักต่อ ตรวจ G0 บนบิลด์ครู (แนะนำ)" (พักต่อใน K2 และ oracle ของ G0 ที่ต้องใช้ journey ที่พักรันครั้งเดียวบนบิลด์เครื่องมือครูในเครื่องที่ไม่ commit ไม่ขอเพดานเพิ่ม)
> - ไม่มีคำถามใหม่ในไฟล์นี้

```yaml
envelope: v2
package: GK1 record (decision 7 evidence)
item: GK checklist item 2 (S05:112), the six journeys held with the teaching tools since #156
wave: K1 (GK1 record)
lane: I (integration session)
change_kind: docs (evidence only; no app code, test or build change committed)
owner_authorization: {date: 2026-10-26, via: chat, question: "GK1 decision 7", answer: "ก ยอมรับเป็นข้อจำกัด (แนะนำ)", where: "DECISIONS.md:357"}
candidate: {label: candidate 7263004, sha: 72630046fc5eb56f1797e5363b6f9ad293ff9d38, pr: "#179", published: "Pages 40385448079, deploy-pages 2026-10-26T19:41:58Z"}   # the candidate until 2026-10-29; then 1842a86 (above)
build: {switch: "src/ui/held.ts:9 set to TEACHER_TOOLS = true, local only, never staged or committed", command: "npm run build (as deploy.yml:156)", stamp_seen: "0.1.0+72630046 (recheck)", published: never}
run: {date: 2026-10-26, start: "20:55:06Z", end: "21:20:44Z", held_six: "6 of 6 pass", extra: "4 of 4 pass", reruns: 0}
result: pass (evidence for a limitation; not a Pages pass)
evidence: local run, not committed (builds, logs, screenshots, exported files)
```

**How to read this file.** `file:n` is the file at the candidate `7263004` (the candidate until 2026-10-29). "Local run, not committed" marks evidence from the integration session's run on 2026-10-26: its numbers are here, its files are not in the repository. Times on this machine are trend-only.

### Why this run

- GK checklist item 2 (`S05:112`, adopted) asks that every journey in Pages mode pass on the candidate.
- Since #156 (`b16b09e`) the teaching tools are held back (owner, 2026-10-17; `src/ui/held.ts:9`, `TEACHER_TOOLS = false`; [teaching-held.md](teaching-held.md)). Six journeys are listed as held and not run while the switch is off (`PROGRESS.md:237`).
- In the candidate's Pages run, [40385448079](https://github.com/ROYIN001/Orbitlab/actions/runs/40385448079), each browser shard logs the six as "held, not run: the teaching tools are held back (owner, 2026-10-17; src/ui/held.ts)". They are not among its 37 journeys.
- GK1 decision 7, option (ก) (`DECISIONS.md:357`): accept this as a GK1 limitation, with the agent running the six once on a build with the teaching tools on, not committed, as evidence.
- This file is that evidence (until 2026-10-29; then the run on `1842a86`, above). It is not a Pages pass. GK item 2 stays "partial" in [kpi-GK1.md](kpi-GK1.md) ("Gates").

### Result for candidate 7263004

- **The six held journeys: 6 of 6 passed** on the first run, one at a time, with no reruns. Total 343.4 s by `run.mjs` and 351 s wall clock.
- **Extra evidence, not part of decision 7:** the four journeys that skip teacher steps while the tools are held also passed whole, 4 of 4, on the same build. Total 958.8 s by `run.mjs` and 1 031 s wall clock.
  - One caveat for `r7-cross-system`: with the switch on, it runs no extra teacher step. Its code only drops two "held" log lines. So this run does **not** cover the results check or the worksheet DOCX (see below).
- **No failures.** No journey failed, so no rerun or diagnosis was needed. No log has an error line: a search for `error|warn|fail|✗|⏸|held` matches only `case-worksheet-exports`' own note, "24/24 actual downloads saved … DOCX pagination still needs independent rendering and visual review".
- **The size budget.** The build as committed (switch off) passes: precache code 14 653.8 / 14 654 kB. The teaching-tools build fails: `index-*.js` by +0.5 kB and precache code by +0.6 kB (below). That build is never published, so the result does not gate decision 7. It does mean that turning the tools on later needs about +1 kB on those two ceilings. On S4, the teaching tools in K2, the owner answered "ข พักต่อ ตรวจ G0 บนบิลด์ครู (แนะนำ)" (chat, 2026-10-28T02:59:22Z): they stay held, the G0 oracles that need held journeys run once on an uncommitted teaching-tools build, and no ceiling is raised ([DECISIONS.md](../../DECISIONS.md), "Decided 2026-10-28").

### Journeys (candidate 7263004, teaching-tools build)

"run.mjs s" is the journey's own `✓ <name> (N s)` line. "Wall s" includes the browser launch and the static server. "Total s" is `run.mjs`'s `1/1 journeys passed in N s` line. The rehearsal column is an earlier local run at `c5da5bb` on the same machine type (local, not committed), for scale only.

| # | Journey | Set | Result | run.mjs s | Wall s | Total s | Rehearsal at `c5da5bb` (run.mjs / wall) |
|---|---|---|---|---|---|---|---|
| 1 | `case-worksheet-exports` | held six | **pass** | 147.2 | 149 | 149.4 | 173.5 / 176 |
| 2 | `classroom-preparation` | held six | **pass** | 67.6 | 69 | 69.0 | 86.7 / 88 |
| 3 | `fx2-design-check-focus` | held six | **pass** | 18.7 | 20 | 19.7 | 23.2 / 25 |
| 4 | `instructor-loading` | held six | **pass** | 43.7 | 45 | 44.5 | 47.8 / 55 |
| 5 | `lesson-packs` | held six | **pass** | 45.5 | 46 | 46.6 | 54.5 / 56 |
| 6 | `recheck` | held six | **pass** | 20.7 | 22 | 21.7 | 21.9 / 24 |
| | **held six, total** | | **6/6** | **343.4** | **351** | 350.9 | 407.6 / 424 |
| 7 | `mobile-smoke` | extra evidence | **pass** | 65.4 | 67 | 66.7 | not run |
| 8 | `profile-session-safety` | extra evidence | **pass** | 184.9 | 209 | 209.0 | not run |
| 9 | `workspace-navigation` | extra evidence | **pass** | 129.6 | 153 | 152.7 | not run |
| 10 | `r7-cross-system` | extra evidence | **pass** | 578.9 | 602 | 602.3 | not run |
| | **extra, total** | | **4/4** | **958.8** | **1 031** | 1 030.7 | |

The six started at 20:57:13Z, the extras at 21:03:04Z, and the run ended at 21:20:15Z.

#### What each journey showed (from its log and screenshots)

- **`case-worksheet-exports`:** 24 of 24 downloads were saved, as HTML and DOCX in Thai and Russian, for the theos2, cz5b and iridium cases and their keys.
  - The journey writes them to the gitignored `tests/browser/artifacts/case-worksheet-exports/`, which the next run would overwrite. All 28 files (24 downloads, 3 export-control screenshots and `manifest.json`, dated 20:57:25Z to 20:59:41Z) were copied out with their times kept, and their SHA-256 list matches the source folder (local, not committed).
  - `manifest.json` stamps the run: `sourceSha` `72630046fc5eb56f1797e5363b6f9ad293ff9d38`, node `v22.22.0`, chromium `153.0.8010.12`, `startedAtUTC` 20:57:14.288Z, `finishedAtUTC` 20:59:41.466Z, `completed: true`.
  - Its `builtIndexSha256` `d6d266bf4f45d0ab0625bc0b9b23caf0a8a0b20f828018a1b2ad765a63cc8185` is the `index.html` line of the teaching-tools build's `SHA256SUMS`, not the switch-off build's (`6bbd83b1…`). So the journey ran on the teaching-tools build.
  - All 24 files match the manifest's `sha256` and `bytes`. Each of the 3 pages (theos2, cz5b, iridium) has 0 uncaught errors and 0 console errors. The cz5b export-control screenshot shows the Russian Worksheets tab with the case worksheet's two download buttons.
- **`classroom-preparation`:** the service-worker update lifecycle was logged (before-update → updatefound → worker-installed → before-prepare → after-prepare).
- **`fx2-design-check-focus`:** focus was kept while the check ran (`{"kept":true,"tag":"INPUT","value":"123.4","caret":[3,3]}`).
- **`instructor-loading`:** passed with no log lines.
- **`lesson-packs`:** ipst-basic had 6 lessons and 11 codes, ipst-earth-space 4 and 8, ipst-physics 6 and 10, rtaf-academy 6 and 20, ru-24-05-06 7 and 10. It was "flown to its grade in 8 s".
- **`recheck`:** `check_results` gave 6 records in 3.4 s; `{"match":4,"borderline":2,"differs":0,"cannotRefly":0}`. The page reported **"the page's build 0.1.0+72630046"**. The largest gap between Chromium and Node was 7.59e-11 (`flownTo`).
  - Its screenshot shows the five Lessons tabs: Lessons, Placement test, Worksheets, Write a scenario and Check results. So the switch reached the build.

#### Extra evidence: the teacher steps the four journeys skip while the tools are held

The four journeys import `TEACHER_TOOLS` from `tests/browser/held.mjs`, which reads `src/ui/held.ts` as text (`tests/browser/held.mjs:9`), so the same edit turns their teacher steps on. Proof that the runner saw the switch as on: `run.mjs --list` printed "⏸ teaching-held: held, not run: the teaching tools are shown: nothing is held back to check".

| Journey | Teacher steps that run only when the switch is on | Evidence they ran here |
|---|---|---|
| `mobile-smoke` | two rows: `#/lessons/check` (the Thai results check, `.recheck-run`) and `#/lessons/author` (the Russian scenario writer, `.author-crit`) at 390×844 touch (`mobile-smoke.mjs:27-35`) | the four `switch` lines in its log (below). Its two screenshots do not show these pages |
| `profile-session-safety` | visits to `#/lessons/author` (`.author`) and `#/lessons/worksheets` (`.ws-page`); the stored draft bytes must stay unchanged (`profile-session-safety.mjs:130-133`) | the pass itself: with the switch on, `:130-133` call `visit()`, which waits for `.author` and `.ws-page` to be visible (`:120-124`). The log line "Actual builder and instructor views plus JSON export preserve untouched opaque/newer draft bytes" is no evidence: it is printed whatever the switch (`:140`), and the switch-off Pages run on the candidate logs it too (40385448079, `browser (2)`) |
| `workspace-navigation` | the curriculum packs on `#/lessons` (`ipst-basic` pack, 5 pending reviews, 5 pack drafts); "Prepare a class" in My work in Thai and Russian, fitting a mobile viewport with no raw `classroom.*` keys; My work has 4 tabs, not 3 (`workspace-navigation.mjs:52-56`, `:69-80`, `:124`) | these are asserts, not log lines. The journey passed with `TEACHER_TOOLS` true, so the asserts for 5/5 and 4 tabs held |
| `r7-cross-system` | **none.** `TEACHER_TOOLS` is imported at `r7-cross-system.mjs:53` and used only at `:426` and `:443`, as `if (!TEACHER_TOOLS) t.log(… held …)`. The header (`:28-34`) says step 6's results check and step 7's worksheet DOCX are "held back". With the switch on, the journey only drops those two log lines | both passes (Thai 390×844 in 257 s, Russian 1280×800 in 322 s) did steps 1–8. The log has no "held with the teaching tools" line. The run shows no results check and no DOCX export, because the journey has no code for them. [R7.1-GK1.md](R7.1-GK1.md) ("Held parts") already says the DOCX "is still to be added to this journey" |

`r7-cross-system` took 578.9 s here, against 443.5 s in Pages shard 1 on the candidate (switch off). These are different machines and builds, so this is no finding about the code.

##### `mobile-smoke`: the log is the proof, not the screenshots

- Its log has four `switch` lines, one per row, in row order:
  1. th "เลือกส่วน" (placement test)
  2. ru "Орбита · Инженер. Выбрать раздел и уровень" (Orbit engineer page)
  3. th "เลือกส่วน" (results check)
  4. ru "Выбрать раздел" (scenario writer)
- With the switch off, the filter at `mobile-smoke.mjs:35` drops rows 3 and 4, so the log would have two such lines.
- A row prints its `switch` line (`:118`) only after `page.waitForFunction(p.isRight)` passed (`:39-40`, `continue` on failure) and the list opened (`:86`). For row 3, `isRight` needs `lessonsPage` `check` and a `.recheck-run`. For row 4 it needs `lessonsPage` `author` and a `.author-crit` (`:27-30`). The log has no FAIL line, and the journey passed.
- **The two screenshots do not show the teacher pages.** Rows 3 and 4 took them. But `app.shot` (`:124`) runs after the Escape at `:119`, and that Escape also leaves the lessons page (see "Follow-up for the records"). So both show the Launch landing page, in Thai and in Russian. Row 1's screenshot shows the landing page for the same reason. Row 2's (Orbit) shows the Orbit engineer page.
- Row 3's screenshot is byte-identical (SHA-256 `bc622b801d41026e30e8b22941a4656700f155b0b7fecf3522d4832df08dec05`) to a switch-off placement-test screenshot taken in an earlier local run that day (05:18:19Z, not committed).

### Budget: switch off (KPI-03, committed snapshots) against switch on (informational)

Ceilings are `budgets.json` at the candidate (lowered by #179). kB = 1 000 bytes, raw. Both builds used the committed data snapshots (no refresh).

| Group | Off: size / ceiling (overrun) | On: size / ceiling (overrun) |
|---|---|---|
| `index-*.js` | 2 634.8 / 2 635.0 (−0.2) ok | **2 635.5 / 2 635.0 (+0.5) FAIL** |
| `index-*.css` | 176.9 / 177.0 (−0.1) ok | same |
| other chunks | 771.4 / 772.0 (−0.6) ok | 771.5 / 772.0 (−0.5) ok |
| `i18n-*.js` | 1 729.0 / 1 729.0 (−0.0) ok | same |
| precache | 15 773.0 / 16 053.0 (−280.0) ok | 15 773.8 / 16 053.0 (−279.2) ok |
| **precache code** | **14 653.8 / 14 654.0 (−0.2) ok** | **14 654.6 / 14 654.0 (+0.6) FAIL: code ceiling** |
| precache data/ | 1 119.2 / 1 399.0 (−279.8) ok | same |
| `author-view-*.js`, `check-view-*.js` | 26.4 / 26.5; 11.5 / 12.0 ok | same |
| workers, catalog, lesson-file, workspace-content | all ok, the same in both | same |
| initial load (report only) | 5 076.7 kB raw, 1 426.6 gzip, 1 122.3 brotli | 5 077.4, 1 426.8, 1 122.0 |
| textures (report only) | 3 789.4 kB | 3 789.4 kB |

- KPI-03 at the candidate (committed snapshots): code **14 653.8 / 14 654 kB**, data/ 1 119.2 / 1 399 kB, total 15 773.0 / 16 053 kB.
  - GK0 (`kpi-GK0.md:32`, `06abb1f`) had code 14 703.8 / 14 704, data/ 1 119.2 / 1 399, total 15 823.0 / 16 103. So code is 50.0 kB smaller.
  - Code equals the 14 653.8 kB that #179's report measured on `a05ae70` (`GK1-ceilings-q03-1.md:61`).
  - The Pages build of the candidate uses refreshed data/, so its data/ and total differ. They are in [kpi-GK1.md](kpi-GK1.md) (KPI-03).
- In the rehearsal at `c5da5bb` (local), the switch-on build was index 2 635.5 and precache code 14 654.5. At the candidate, precache code is 14 654.6 (+0.1 kB, from #177's code).

### Build stamps (candidate 7263004)

| | Switch off (KPI-03) | Switch on (the journeys) |
|---|---|---|
| `src/ui/held.ts` line 9 | `export const TEACHER_TOOLS = false as boolean;` (blob `0c83a229`, as committed) | `export const TEACHER_TOOLS = true as boolean;` (blob `a098d760`, local only) |
| Command | `npx vite build` (as `ci.yml:114`) | `npm run build` = `tsc --noEmit && vite build` (as `deploy.yml:156`) |
| Exit | 0 | 0 (tsc passed) |
| Vite's own time (build log) | "✓ built in 6.40s" | "✓ built in 4.96s" (tsc's time is not recorded) |
| Build log last written (UTC) | 20:55:42.902Z | 20:56:42.310Z |
| `dist/build-info.json` `commit` | `72630046` | `72630046` |
| `builtAt` | 2026-10-26T20:55:42.817Z | 2026-10-26T20:56:42.177Z |
| Data snapshots (`asOf`, committed, not refreshed) | spaceWeather 2026-09-26T20:00:00.000Z; satellites 2026-09-26T16:10:54.609Z; earthOrientation 2026-09-24T00:00:00Z | same |
| `sha256(dist/SHA256SUMS)` (89 files) | `ab3833bc807a4febbd64c17afda867e9697c1d6c10ad507097213f3ed22b6539` | `12c3844d173bb7a24d5ffb381d5e4d880eb45c54acc702fe64687a7b87d72c45` |
| Precache manifest | `0b9ffbcb4c7564` (68 files) | `09bd6d3c1b4267` (68 files) |
| `index-*.js` | `index-BU-tJaNU.js`, 2 634.8 kB | `index-g0H7Cgdq.js`, 2 635 473 B |
| `node scripts/bundle-budget.mjs` | exit 0, "bundle budget: ok" (also exit 0 with the build log as argument: no `INEFFECTIVE_DYNAMIC_IMPORT`) | exit 1, "bundle budget: FAILED" |
| Stamp the page reports | — | "0.1.0+72630046" (`recheck` log) |

- Build start times were not recorded, so the table gives none. The only bound: the switch-on build started after the switch was turned on (its record was last written at 20:56:21.182Z), and its log ended at 20:56:42.310Z, so it took at most 21 s with tsc.
- A local build stamps 8 characters (`72630046`); Pages checks out at depth 1 and its stamp has 7 (`7263004`). (2026-10-29: 8 is not a fixed rule. The stamp is `git rev-parse --short HEAD` (`vite.config.ts:22`). In the run on `1842a86` it had 7 characters, and in the same clone `git rev-parse --short` now gives 7 for `7263004` too; see "Build stamps (candidate 1842a86)" above.)
- The two builds have the same file set once hashes are dropped. Content differs in `index.html`, `sw.js`, `build-info.json` and 12 chunks: `index`, `archive` ×2, `assessment-view`, `author-view`, `check-view`, `media-archive`, `media-ownership`, `profile-menu`, `validation`, `worksheet-view` and `workspace-content`.

### Follow-up for the records (separate from decision 7)

The run's screenshots exposed an app bug. It was already there before the candidate. It does not change any result above, and it is not part of decision 7. Under P4 (ก) ("no code PR before the freeze", `DECISIONS.md:368` at `5092ac9`), nothing is changed now. It goes to the records as a follow-up item.

- **What happens:** on a lessons page on a phone, with the section list open, the user presses Escape once. The list closes, and the app also leaves the lessons page (to `#/home` when the page was opened by its address, as in the journey). One Escape should only close the list.
- **Why:** both handlers listen for `keydown` on `document`.
  - `src/ui/section-nav.ts:41`: `if (e.key === 'Escape' && this.open) this.close(true);`. It does not call `preventDefault()`.
  - `src/ui/lessons/lesson-mode.ts:269`: `if (e.key === 'Escape' && this.pageView && !e.defaultPrevented) { e.preventDefault(); this.closePage(); }`. `closePage()` (`:1391-1394`) leaves the page.
  - Neither file changed between `a05ae70` and the candidate (`git diff --stat a05ae70 7263004 -- src/ui/section-nav.ts src/ui/lessons/lesson-mode.ts` is empty). Blame dates the two lines to commits `4fc49883` (2026-10-01) and `931956fd` (2026-09-26).
- **Why `mobile-smoke` passes:** its header says Escape "closes the list and restores the switch's focus" (`mobile-smoke.mjs:10-11`). The check at `:120-122` tests only that the list is hidden and the switch has focus. Both stay true after the page is left. It never checks that the route stayed the same.
- **Checked directly on the build as committed (switch off), 22:12Z to 22:14Z** (local run, not committed). The candidate was built with `npx vite build`; its `dist/index.html` SHA-256 is `6bbd83b1…`, the switch-off build's. A short probe, using the repository's own harness and server at 390×844 touch, printed the route before and after one Escape:

  | Route, language | List open before Escape | Hash after | Lessons page after | List hidden, switch focused after |
  |---|---|---|---|---|
  | `#/lessons/test`, th | yes | `#/home` | hidden (left) | yes, yes |
  | `#/orbit/engineer`, ru | yes | `#/orbit/engineer` | (not a lessons page) | yes, yes |
  | `#/lessons/test`, th | no | `#/home` | hidden (left) | yes, no (the switch was not focused before either) |

  The third row is the intended behaviour: with no list open, Escape closes the lessons page. The first row is the bug.
- **Suggested record text:** "Lessons page, phone: one Escape with the section list open also closes the lessons page (`section-nav.ts:41` does not `preventDefault`; `lesson-mode.ts:269`). Already present before GK1 candidate `7263004`. `mobile-smoke` does not check the route after Escape. After the freeze: make section-nav mark the Escape as handled, and have `mobile-smoke` assert the hash is unchanged." (2026-10-29: the text for the candidate `1842a86` is in "Follow-up for the records" above.)

### Procedure as run

Local run, not committed. `<wt>` is a scratch worktree of the repository; `<out>` is a local results folder. The repository's own checkout was not edited.

```sh
CAND=72630046fc5eb56f1797e5363b6f9ad293ff9d38

# move the scratch worktree to the candidate
git -C <wt> checkout -- src/ui/held.ts          # exit 0 (it held the c5da5bb rehearsal's switch)
git -C <wt> checkout --detach $CAND             # HEAD is now at 72630046
git diff --quiet c5da5bb $CAND -- package-lock.json && echo "lockfile unchanged"   # printed
#   also checked: src/ui/held.ts (0c83a229) and tests/browser/held.mjs (cf9d0b45) are the same blobs
#   at c5da5bb and the candidate; node_modules matches the candidate's package-lock.json

# switch off: KPI-03
cd <wt> && rm -rf dist && npx vite build > <out>/build-off.log 2>&1           # exit 0
node scripts/bundle-budget.mjs > <out>/budget-off.log 2>&1                     # exit 0
node scripts/bundle-budget.mjs <out>/build-off.log > <out>/budget-off-withlog.log 2>&1   # exit 0

# switch on, local only (the diff below)
git -C <wt> apply <held-teacher-tools-on.diff>                                 # exit 0
grep -c '^export const TEACHER_TOOLS = true as boolean;$' <wt>/src/ui/held.ts   # 1
git -C <wt> diff --stat                                                       # src/ui/held.ts | 2 +-
git -C <wt> diff --cached --quiet && echo "nothing staged"                     # nothing staged
node tests/browser/run.mjs --list case-worksheet-exports classroom-preparation \
  fx2-design-check-focus instructor-loading lesson-packs recheck teaching-held   # ⏸ teaching-held …, then the six
node tests/browser/run.mjs --list mobile-smoke profile-session-safety workspace-navigation r7-cross-system   # all four listed

# build as Pages does, then the journeys, one at a time
cd <wt> && rm -rf dist && npm run build > <out>/build-on.log 2>&1              # exit 0
node scripts/bundle-budget.mjs > <out>/budget-on.log 2>&1                      # exit 1 (expected)
#   per journey, with the CI runners' font (system-ui and sans-serif → DejaVu Sans; Inter rejected):
#   node tests/browser/run.mjs --shots <out>/<set>/shots-<j> <j> > <out>/<set>/<j>.log 2>&1
#   the six first, then the four extra journeys

# leave nothing staged or committed; restore
git -C <wt> diff --cached --quiet               # nothing staged
git -C <wt> checkout -- src/ui/held.ts
git -C <wt> status --short                      # only the untracked node_modules link
git -C <wt> log --oneline -1                    # 72630046 Budgets (GK1, q03-1 B) … (#179)
rm -rf <wt>/dist                                # the teaching-tools build removed, so nobody serves it by mistake
#   the repository's own checkout: `git status --short` empty, HEAD unchanged since 2026-10-23 (reflog)
```

After review (22:11Z to 22:14Z), the `case-worksheet-exports` files were copied out of the worktree, and one switch-off build was made for the Escape check, then removed. No journey was rerun, and no result above changed.

#### Where this differs from the freeze runbook (local, not committed)

1. **`rm -rf dist` before each build**, so no file of an earlier build was left over.
2. **A second budget call with the build log as argument** (switch off only) checked for `INEFFECTIVE_DYNAMIC_IMPORT`. The result was ok.
3. **Four extra journeys** ran whole after the six, on the same build, with the same script. Decision 7 does not need them.
4. **At the end, `held.ts` was restored and `dist/` removed.** The runbook left the edit in place.
5. **The same differences from Pages as the earlier rehearsal:** no `npm run snapshots` (committed data), no `run-browser.mjs` provenance gate, and named journeys rather than shards.
6. **After review:** the export files were copied out, and one switch-off build was made for the Escape check, then removed.

### Environment

- Machine: 4 CPUs, 15 GB RAM. No other build or browser process was running at the start (load 1.78 at 20:57:06Z).
- Node v22.22.0 (CI pins 22.23.3); Vite 8.3.0; Playwright 1.63.0.
- Chrome for Testing 153.0.8010.12, headless shell. WebGL is SwiftShader.
- The CI runners' font: a fontconfig file that maps `system-ui` and `sans-serif` to DejaVu Sans and rejects Inter. (2026-10-29: with a file written again from this description, Chromium draws CSS `sans-serif` in Liberation Sans with or without it; whether this run's file did the same is unknown. See the run on `1842a86`, "Where this differs", item 2.)
- Journeys ran against `dist/` under `/Orbitlab/` from `run.mjs`'s own static server on 127.0.0.1, one process per journey, one after another.

### The diff (applied locally, never staged or committed)

```diff
diff --git a/src/ui/held.ts b/src/ui/held.ts
index 0c83a229..a098d760 100644
--- a/src/ui/held.ts
+++ b/src/ui/held.ts
@@ -6,4 +6,4 @@
  * addresses), the curriculum packs, opening a lesson file, exporting results, lesson links and
  * scenario links, "Prepare a class" in My work, and the Orbit section's case worksheets.
  */
-export const TEACHER_TOOLS = false as boolean;
+export const TEACHER_TOOLS = true as boolean;
```

### Files (local, not committed)

- The git and `--list` output of the move, the switch and the restore.
- The build and budget logs of both builds; `build-info.json`, `SHA256SUMS` and its SHA-256 for both builds.
- The runner script and its SHA-256, its console output and progress times.
- The six logs and the four extra logs, each set with its summary and screenshots.
- The 28 `case-worksheet-exports` files and their SHA-256 list.
- The Escape probe, its build log and its output.

For the GK1 record: keep this apart from the Pages evidence. Decision 7 is a limitation. GK item 2 stays "partial": the six held journeys are not in the Pages pass, and this one local run on a teaching-tools build is what decision 7 asked for (until 2026-10-29: it was redone on `1842a86`, above, on the owner's "Redo all (Recommended)").
