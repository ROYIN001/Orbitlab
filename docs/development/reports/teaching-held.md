# Teaching tools held back (owner, 2026-10-17)

> **สรุปสำหรับเจ้าของ (ภาษาไทย)**
>
> - หน้าเว็บเหลือเฉพาะบทเรียนแบบเรียนเองและแบบทดสอบวัดพื้นฐาน
> - ส่วนครูทั้งหมดซ่อนไว้ด้วยสวิตช์ตัวเดียว `TEACHER_TOOLS` ในไฟล์ `src/ui/held.ts` โดยไม่ลบโค้ด ถ้าเปลี่ยนเป็น `true` ทุกอย่างกลับมา
> - สิ่งที่ซ่อน:
>   - หน้าใบงาน เขียนสถานการณ์ และตรวจผล รวมทั้งที่อยู่ลิงก์ของหน้าเหล่านั้น
>   - ชุดบทเรียนตามหลักสูตร
>   - ปุ่มเปิดไฟล์บทเรียน ส่งออกผลการเรียน และคัดลอกลิงก์
>   - ลิงก์สถานการณ์จากครู (`?scenario=`)
>   - "เตรียมห้องเรียน" ในงานของฉัน
>   - ใบงานกรณีจริงในส่วน Orbit
> - เทสต์ในเบราว์เซอร์ 6 ตัวที่ทดสอบหน้าครูถูกพักไว้ตามที่คุณเลือก ตัวรันเทสต์จะพิมพ์บอกทุกครั้งว่าตัวไหนพักไว้ จึงไม่หายไปเงียบ ๆ
> - เพิ่มเทสต์ใหม่หนึ่งตัวที่ยืนยันว่าส่วนที่ซ่อนไม่โผล่ และบทเรียนกับแบบทดสอบยังใช้ได้
> - ขนาดแอปหลักเล็กลง 626 B ไม่ได้ขึ้นเพดานใด

- **Request:** owner, chat, 2026-10-17: "merge เข้าไปก่อนแล้ว ในส่วนที่เป็นการสอนให้เก็บไว้ก่อนได้มั้ย ให้เหลือแค่ตัวบทเรียนแบบเรียนเองไว้ก่อน ส่วนอื่นยังไม่โชว์ในหน้าเว็บ". The follow-up choices are recorded in [DECISIONS.md](../../DECISIONS.md) under "Decided 2026-10-17".
- **Base:** `main` at `5394003` (#147). Branch `claude/lc-inst1-s1`.
- **Change type:** UI (a choice of what is shown), with tests and docs. It waits for the owner's merge approval.

## What is hidden, and how

`src/ui/held.ts` exports `TEACHER_TOOLS = false as boolean`. Each guard reads it:

| Part | Where |
|---|---|
| Worksheets, Write a scenario and Check results tabs, and their addresses (an address now closes the lessons page) | `lesson-mode.ts`: `PAGE_HASHES` and the tab list, cut to the first two |
| Lesson packs | `lesson-mode.ts` `renderCatalog` (`packsSection`) |
| "Open a lesson file…", "Export results", and the name field that only labels the results file | `lesson-mode.ts` `renderCatalog` |
| "Export results" on the placement-test result | `assessment-view.ts` |
| "Copy link" and "Worksheet" on the lesson strips (flight, case and design lessons) | `lesson-mode.ts` |
| `?scenario=` links: the parameter is cleared, no lesson opens | `lesson-mode.ts` `openFromLink` |
| "Prepare a class" in My work | `workspace-content.ts` `TABS` |
| Case worksheets in the Orbit section | `sky-panel.ts` |

Kept: the self-study lesson catalogue (tracks 1–6, case lessons included), the placement test, lessons a learner imported earlier (the "custom" group), `?lesson=` links that someone received earlier, learner profiles and their resets, and the WebMCP lesson tools (they are not visible UI).

The teacher pages' code still builds: their routes stay in `route()`, so `author-view`, `check-view` and the `recheck` worker are still emitted. The bundle budget has a ceiling for each of them and still finds a file for each. The minifier drops the guarded branches, so the index chunk shrinks.

## Budget

`npx vite build && node scripts/bundle-budget.mjs`: ok. Against `main` `5394003`:
- `index-*.js`: 2,644,722 → 2,644,096 B (−626 B);
- `i18n-*.js`: unchanged;
- CSS: unchanged;
- precache code: −0.7 kB.

No ceiling was changed.

## Tests

- **Parked, as the owner chose ("ซ่อนสนิท พักเทสต์ไว้").**
  - `tests/browser/held.mjs` reads the switch from the source. A journey that exports `held` (its reason) is printed as `⏸ <name>: held, not run: …` and is not run (`tests/browser/run.mjs`).
  - The CI inventory leaves held journeys out the same way (`scripts/verification/lib.mjs` `browserInventory`), so the planned and the executed lists still match.
  - Held: `case-worksheet-exports`, `classroom-preparation`, `instructor-loading`, `lesson-packs`, `recheck`, `fx2-design-check-focus`. The last one opens a teacher's design-lesson file to reach the focus bug it guards (FX-2), so that guard is off while the tools are held.
- **Teacher steps skipped while held; the rest of each journey still runs:**
  - `mobile-smoke`: the check and author rows;
  - `profile-session-safety`: the author and worksheets visits;
  - `workspace-navigation`: the packs on `#/lessons`, the "Prepare a class" loop, and the tab count (4, or 3 while held). That count is an existing assertion, changed here on the owner's instruction to park the teacher tests; it returns to 4 with the switch.
- **New:** `teaching-held` (smoke) checks the hidden state:
  - two tabs on the lessons page;
  - the three instructor addresses open nothing;
  - no packs, no lesson-file input, no export or open buttons;
  - a self-study lesson still opens, and its strip has no "Copy link";
  - the placement test still opens;
  - My work has 3 tabs and no "Prepare a class";
  - `?scenario=` is cleared and starts no lesson.
  - It is itself held when the switch is `true`.
- **Run locally (Chromium 1194):** `teaching-held`, `mobile-smoke`, `profile-session-safety`, `workspace-navigation` ✓. Earlier on this branch, `learner-profiles`, `legacy-media-migration`, `gesture-ownership`, `project-backups` and `stage2-preflight` ✓.
- **Unit:** the lesson, assessment, teacher-lesson, scenario-link, instructor, case, classroom, pack, worksheet, privacy, architecture and i18n files pass: 24 files, 298 tests. The full `npx vitest run` result is in the PR.
- `node --test tests/verification/*.test.mjs tests/browser/shard.test.mjs`: 93/93. The change map has a new `teaching-held` rule.

## To show the tools again

1. Set `TEACHER_TOOLS` to `true` in `src/ui/held.ts`.
2. The held journeys run again, and `teaching-held` becomes held.
3. Remove the notes in README (lessons paragraph) and USER-GUIDE §18, and the privacy page needs no change.
