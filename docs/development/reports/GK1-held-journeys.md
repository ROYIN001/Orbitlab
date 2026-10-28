# GK1 decision 7: the six held journeys on a teaching-tools build of candidate 7263004 / journey ที่พักไว้ 6 ตัว บนบิลด์ที่เปิดเครื่องมือครู

> **สรุปสำหรับเจ้าของ (ภาษาไทย)**
>
> - ทำตามข้อ 7 ของคุณ (ก "ยอมรับเป็นข้อจำกัด") (`DECISIONS.md:357`): รัน 6 journey ที่พักไว้พร้อมเครื่องมือครูตั้งแต่ #156 หนึ่งครั้ง บนบิลด์ของ candidate `7263004` ที่เปิด `TEACHER_TOOLS` บิลด์นี้ไม่ได้ commit และไม่ได้เผยแพร่ ผลนี้เป็นหลักฐานของข้อจำกัด ไม่ใช่การผ่านใน Pages
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
candidate: {label: candidate 7263004, sha: 72630046fc5eb56f1797e5363b6f9ad293ff9d38, pr: "#179", published: "Pages 40385448079, deploy-pages 2026-10-26T19:41:58Z"}
build: {switch: "src/ui/held.ts:9 set to TEACHER_TOOLS = true, local only, never staged or committed", command: "npm run build (as deploy.yml:156)", stamp_seen: "0.1.0+72630046 (recheck)", published: never}
run: {date: 2026-10-26, start: "20:55:06Z", end: "21:20:44Z", held_six: "6 of 6 pass", extra: "4 of 4 pass", reruns: 0}
result: pass (evidence for a limitation; not a Pages pass)
evidence: local run, not committed (builds, logs, screenshots, exported files)
```

**How to read this file.** `file:n` is the file at the candidate `7263004`. "Local run, not committed" marks evidence from the integration session's run on 2026-10-26: its numbers are here, its files are not in the repository. Times on this machine are trend-only.

## Why this run

- GK checklist item 2 (`S05:112`, adopted) asks that every journey in Pages mode pass on the candidate.
- Since #156 (`b16b09e`) the teaching tools are held back (owner, 2026-10-17; `src/ui/held.ts:9`, `TEACHER_TOOLS = false`; [teaching-held.md](teaching-held.md)). Six journeys are listed as held and not run while the switch is off (`PROGRESS.md:237`).
- In the candidate's Pages run, [40385448079](https://github.com/ROYIN001/Orbitlab/actions/runs/40385448079), each browser shard logs the six as "held, not run: the teaching tools are held back (owner, 2026-10-17; src/ui/held.ts)". They are not among its 37 journeys.
- GK1 decision 7, option (ก) (`DECISIONS.md:357`): accept this as a GK1 limitation, with the agent running the six once on a build with the teaching tools on, not committed, as evidence.
- This file is that evidence. It is not a Pages pass. GK item 2 stays "partial" in [kpi-GK1.md](kpi-GK1.md) ("Gates").

## Result for candidate 7263004

- **The six held journeys: 6 of 6 passed** on the first run, one at a time, with no reruns. Total 343.4 s by `run.mjs` and 351 s wall clock.
- **Extra evidence, not part of decision 7:** the four journeys that skip teacher steps while the tools are held also passed whole, 4 of 4, on the same build. Total 958.8 s by `run.mjs` and 1 031 s wall clock.
  - One caveat for `r7-cross-system`: with the switch on, it runs no extra teacher step. Its code only drops two "held" log lines. So this run does **not** cover the results check or the worksheet DOCX (see below).
- **No failures.** No journey failed, so no rerun or diagnosis was needed. No log has an error line: a search for `error|warn|fail|✗|⏸|held` matches only `case-worksheet-exports`' own note, "24/24 actual downloads saved … DOCX pagination still needs independent rendering and visual review".
- **The size budget.** The build as committed (switch off) passes: precache code 14 653.8 / 14 654 kB. The teaching-tools build fails: `index-*.js` by +0.5 kB and precache code by +0.6 kB (below). That build is never published, so the result does not gate decision 7. It does mean that turning the tools on later needs about +1 kB on those two ceilings. On S4, the teaching tools in K2, the owner answered "ข พักต่อ ตรวจ G0 บนบิลด์ครู (แนะนำ)" (chat, 2026-10-28T02:59:22Z): they stay held, the G0 oracles that need held journeys run once on an uncommitted teaching-tools build, and no ceiling is raised ([DECISIONS.md](../../DECISIONS.md), "Decided 2026-10-28").

## Journeys (candidate 7263004, teaching-tools build)

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

### What each journey showed (from its log and screenshots)

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

### Extra evidence: the teacher steps the four journeys skip while the tools are held

The four journeys import `TEACHER_TOOLS` from `tests/browser/held.mjs`, which reads `src/ui/held.ts` as text (`tests/browser/held.mjs:9`), so the same edit turns their teacher steps on. Proof that the runner saw the switch as on: `run.mjs --list` printed "⏸ teaching-held: held, not run: the teaching tools are shown: nothing is held back to check".

| Journey | Teacher steps that run only when the switch is on | Evidence they ran here |
|---|---|---|
| `mobile-smoke` | two rows: `#/lessons/check` (the Thai results check, `.recheck-run`) and `#/lessons/author` (the Russian scenario writer, `.author-crit`) at 390×844 touch (`mobile-smoke.mjs:27-35`) | the four `switch` lines in its log (below). Its two screenshots do not show these pages |
| `profile-session-safety` | visits to `#/lessons/author` (`.author`) and `#/lessons/worksheets` (`.ws-page`); the stored draft bytes must stay unchanged (`profile-session-safety.mjs:130-133`) | the pass itself: with the switch on, `:130-133` call `visit()`, which waits for `.author` and `.ws-page` to be visible (`:120-124`). The log line "Actual builder and instructor views plus JSON export preserve untouched opaque/newer draft bytes" is no evidence: it is printed whatever the switch (`:140`), and the switch-off Pages run on the candidate logs it too (40385448079, `browser (2)`) |
| `workspace-navigation` | the curriculum packs on `#/lessons` (`ipst-basic` pack, 5 pending reviews, 5 pack drafts); "Prepare a class" in My work in Thai and Russian, fitting a mobile viewport with no raw `classroom.*` keys; My work has 4 tabs, not 3 (`workspace-navigation.mjs:52-56`, `:69-80`, `:124`) | these are asserts, not log lines. The journey passed with `TEACHER_TOOLS` true, so the asserts for 5/5 and 4 tabs held |
| `r7-cross-system` | **none.** `TEACHER_TOOLS` is imported at `r7-cross-system.mjs:53` and used only at `:426` and `:443`, as `if (!TEACHER_TOOLS) t.log(… held …)`. The header (`:28-34`) says step 6's results check and step 7's worksheet DOCX are "held back". With the switch on, the journey only drops those two log lines | both passes (Thai 390×844 in 257 s, Russian 1280×800 in 322 s) did steps 1–8. The log has no "held with the teaching tools" line. The run shows no results check and no DOCX export, because the journey has no code for them. [R7.1-GK1.md](R7.1-GK1.md) ("Held parts") already says the DOCX "is still to be added to this journey" |

`r7-cross-system` took 578.9 s here, against 443.5 s in Pages shard 1 on the candidate (switch off). These are different machines and builds, so this is no finding about the code.

#### `mobile-smoke`: the log is the proof, not the screenshots

- Its log has four `switch` lines, one per row, in row order:
  1. th "เลือกส่วน" (placement test)
  2. ru "Орбита · Инженер. Выбрать раздел и уровень" (Orbit engineer page)
  3. th "เลือกส่วน" (results check)
  4. ru "Выбрать раздел" (scenario writer)
- With the switch off, the filter at `mobile-smoke.mjs:35` drops rows 3 and 4, so the log would have two such lines.
- A row prints its `switch` line (`:118`) only after `page.waitForFunction(p.isRight)` passed (`:39-40`, `continue` on failure) and the list opened (`:86`). For row 3, `isRight` needs `lessonsPage` `check` and a `.recheck-run`. For row 4 it needs `lessonsPage` `author` and a `.author-crit` (`:27-30`). The log has no FAIL line, and the journey passed.
- **The two screenshots do not show the teacher pages.** Rows 3 and 4 took them. But `app.shot` (`:124`) runs after the Escape at `:119`, and that Escape also leaves the lessons page (see "Follow-up for the records"). So both show the Launch landing page, in Thai and in Russian. Row 1's screenshot shows the landing page for the same reason. Row 2's (Orbit) shows the Orbit engineer page.
- Row 3's screenshot is byte-identical (SHA-256 `bc622b801d41026e30e8b22941a4656700f155b0b7fecf3522d4832df08dec05`) to a switch-off placement-test screenshot taken in an earlier local run that day (05:18:19Z, not committed).

## Budget: switch off (KPI-03, committed snapshots) against switch on (informational)

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

## Build stamps (candidate 7263004)

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
- A local build stamps 8 characters (`72630046`); Pages checks out at depth 1 and its stamp has 7 (`7263004`).
- The two builds have the same file set once hashes are dropped. Content differs in `index.html`, `sw.js`, `build-info.json` and 12 chunks: `index`, `archive` ×2, `assessment-view`, `author-view`, `check-view`, `media-archive`, `media-ownership`, `profile-menu`, `validation`, `worksheet-view` and `workspace-content`.

## Follow-up for the records (separate from decision 7)

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
- **Suggested record text:** "Lessons page, phone: one Escape with the section list open also closes the lessons page (`section-nav.ts:41` does not `preventDefault`; `lesson-mode.ts:269`). Already present before GK1 candidate `7263004`. `mobile-smoke` does not check the route after Escape. After the freeze: make section-nav mark the Escape as handled, and have `mobile-smoke` assert the hash is unchanged."

## Procedure as run

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

### Where this differs from the freeze runbook (local, not committed)

1. **`rm -rf dist` before each build**, so no file of an earlier build was left over.
2. **A second budget call with the build log as argument** (switch off only) checked for `INEFFECTIVE_DYNAMIC_IMPORT`. The result was ok.
3. **Four extra journeys** ran whole after the six, on the same build, with the same script. Decision 7 does not need them.
4. **At the end, `held.ts` was restored and `dist/` removed.** The runbook left the edit in place.
5. **The same differences from Pages as the earlier rehearsal:** no `npm run snapshots` (committed data), no `run-browser.mjs` provenance gate, and named journeys rather than shards.
6. **After review:** the export files were copied out, and one switch-off build was made for the Escape check, then removed.

## Environment

- Machine: 4 CPUs, 15 GB RAM. No other build or browser process was running at the start (load 1.78 at 20:57:06Z).
- Node v22.22.0 (CI pins 22.23.3); Vite 8.3.0; Playwright 1.63.0.
- Chrome for Testing 153.0.8010.12, headless shell. WebGL is SwiftShader.
- The CI runners' font: a fontconfig file that maps `system-ui` and `sans-serif` to DejaVu Sans and rejects Inter.
- Journeys ran against `dist/` under `/Orbitlab/` from `run.mjs`'s own static server on 127.0.0.1, one process per journey, one after another.

## The diff (applied locally, never staged or committed)

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

- The git and `--list` output of the move, the switch and the restore.
- The build and budget logs of both builds; `build-info.json`, `SHA256SUMS` and its SHA-256 for both builds.
- The runner script and its SHA-256, its console output and progress times.
- The six logs and the four extra logs, each set with its summary and screenshots.
- The 28 `case-worksheet-exports` files and their SHA-256 list.
- The Escape probe, its build log and its output.

For the GK1 record: keep this apart from the Pages evidence. Decision 7 is a limitation. GK item 2 stays "partial": the six held journeys are not in the Pages pass, and this one local run on a teaching-tools build is what decision 7 asked for.
