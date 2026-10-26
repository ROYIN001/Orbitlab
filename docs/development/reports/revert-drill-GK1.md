# Revert drill at GK1: FX-2 step 2b on candidate 7263004 / ซ้อม revert ของขั้น 2b บน candidate 7263004

> **สรุปสำหรับเจ้าของ (ภาษาไทย)**
>
> - ทำตามคำตอบข้อ P2 ของคุณ (แชต 2026-10-26) "ข ซ้อมหนึ่งครั้ง": ซ้อม revert ของขั้น 2b (ตัวเขียน `revision`) หนึ่งครั้งบน candidate 7263004
> - **ผล: ผ่านทุกขั้น** (ตรวจ 48 จุด ผ่าน 48) ใช้บิลด์จริงของแอปสามรุ่น เสิร์ฟที่ origin เดียวและ path เดียว (`/Orbitlab/`) และ browser profile เดียวตลอด การเปลี่ยนรุ่นทุกครั้งใช้ข้อความอัปเดตของแอปเอง ("A new version of Orbitlab is ready." แล้วกด Reload) แบบเดียวกับที่ผู้เรียนเห็นบน Pages
> - **ต่างจากถ้อยคำของกฎ (V1):** ร่าง S17 ข้อ 4 ให้ย้อนไป "รุ่นที่เผยแพร่ก่อนหน้า" ซึ่งคือ `a05ae70` (#177 คือ 2b เอง) แต่โค้ดแอปของ `a05ae70` เหมือน candidate ทุกไบต์ (ต่างกันแค่ `budgets.json` และไฟล์ Markdown) การย้อนไปรุ่นนั้นจึงไม่ได้ย้อนรูปแบบข้อมูลเลย การซ้อมจึงย้อนไปสองรุ่นที่เผยแพร่ก่อนตัวเขียนแทน คือ `408ad16` และ `c5da5bb`
>   - ตัวเลือก (ข) ของ P2 ตามที่ DECISIONS บันทึก (`DECISIONS.md:366` ที่ `5092ac9`) ระบุให้เปิดแบบทดสอบด้วยบิลด์ก่อน 2a ซึ่งตรงกับที่ซ้อม (และซ้อมกับ `c5da5bb` เพิ่ม) ส่วนใบคำถามที่เตรียมไว้ก่อน (ในเครื่อง ไม่ commit) เขียนว่า "ย้อนไปรุ่นที่เผยแพร่ก่อนหน้า" V1 จึงเป็นความต่างจากถ้อยคำของกฎ ไม่ใช่จากตัวเลือกที่ DECISIONS บันทึก
> - ขั้น 1 (candidate 7263004): ผู้เรียนทำแบบทดสอบวัดระดับครบ 25 ข้อด้วยปุ่มในหน้าเว็บ แบบทดสอบที่เก็บไว้มี `"revision":1` ตั้งแต่เริ่ม หน้าผลแสดง **23 %** (ถูก 7 จาก 25 ข้อ, misconception 6)
> - ขั้น 2 (ย้อนไป `408ad16` ซึ่งเป็นรุ่นก่อน 2a และไม่รู้จักช่อง `revision`):
>   - เปิดผู้เรียนคนเดิม ผลและคะแนนเหมือนเดิมทุกตัวเลข
>   - การโหลดและการดูผลไม่เขียนอะไรลงที่เก็บ (ค่าที่เก็บเท่าเดิมทุกไบต์ ไม่มีสำเนากู้คืน)
>   - จากนั้นบิลด์เก่าบันทึกความคืบหน้าเอง (เปิดคำใบ้ของบทเรียน 1.1) ไบต์ของแบบทดสอบยังเท่าเดิม และยังมี `"revision":1`
> - ขั้น 3 (ย้อนไป `c5da5bb` ซึ่งมีแค่ 2a ตัวอ่าน): อ่านแบบทดสอบเป็น revision 1 คะแนนเดิม ผลตรวจควบคุม: ถ้าเปลี่ยนค่าเป็น revision 2 บิลด์นี้ไม่แสดงผลสอบเลย แปลว่ามันอ่านช่องนี้จริง ไม่ได้มองข้าม (ตรวจซ้ำหลังซ้อม: อ่านค่าที่เก็บกลับมาแล้วตรงกับที่ใส่ทุกไบต์ และค่าเดียวกันที่เป็น revision 1 แสดง 23 %)
> - ขั้น 4 (กลับไป candidate 7263004): คะแนนเดิม ไบต์ของแบบทดสอบเท่ากับขั้น 1 ทุกไบต์ ค่าทั้งก้อนต่างจากขั้น 1 เฉพาะประวัติคำใบ้ของบทเรียน 1.1 ที่สามบิลด์เขียนเองระหว่างการซ้อม
> - ข้อจำกัด:
>   - ใช้บิลด์ในเครื่องกับข้อมูล snapshot ที่ commit ไว้ เสิร์ฟจาก 127.0.0.1 ไม่ใช่ github.io
>   - ทดสอบบน Chromium (headless) อย่างเดียว อุปกรณ์จริงอยู่ใน HU-6
>   - การ revert จริงบน main จะได้โค้ดแอปเดียวกับรุ่นที่ซ้อม แต่ build stamp ต่างกัน
> - ไม่มีคำถามใหม่ ความต่าง V1 จะอยู่ในรายการ variance ของ PR บันทึก GK1 ไฟล์นี้เข้า PR บันทึก GK1

```yaml
envelope: v2
package: GK1 record (revert drill; draft R7.2 pre-v1.0 rollback rule 4)
item: FX-2 step 2b (M-LEARNING-027, the writer of a test's `revision`)
wave: K1 (GK1 record)
lane: I (the integration session ran the drill; it checks lane L's stored format)
change_kind: docs (evidence only; no app code, test or build change)
owner_authorization: {date: 2026-10-26, via: chat, question: P2, answer: "ข ซ้อมหนึ่งครั้ง", where: "DECISIONS.md:366 at 5092ac9", scope: "one revert drill of 2b on the candidate, written up as revert-drill-GK1.md for the GK1 record PR"}
candidate: {label: candidate 7263004, sha: 72630046fc5eb56f1797e5363b6f9ad293ff9d38, pr: "#179", published: "Pages 40385448079, deploy-pages 2026-10-26T19:41:58Z"}
rolled_back_to:
  - {sha: 408ad16b90fd72b934f947afc2ed13efc4a7584a, what: "before 2a (#174; its app code is 3644749's)", published: "Pages 40228322904 (daily refresh at 408ad16, run end 2026-10-25T20:28:26Z)"}
  - {sha: c5da5bb4b7cd78e45d030b2747020e7e6ac9994e, what: "2a only (#176, the reader)", published: "Pages 40340692641, 2026-10-26T15:10:22Z"}
variance: {id: V1, what: "rolled back to 408ad16 and c5da5bb, not to the previously published build a05ae70 (same app code as the candidate)", against: "draft S17 rule 4 (S17:171 at c2af8ae; GK1 row S17:327); P2's option as DECISIONS.md:366 at 5092ac9 records it names a build before 2a, which the drill used"}
run: {date: 2026-10-26, start: "21:39:20Z", end: "21:44:41Z", checks: "48 of 48 pass", exit: 0}
after_run: {control_recheck: "2026-10-26 22:18:40–22:19:57Z, exit 0", offline_checks: "post-run-checks.json, exit 0"}
result: pass (with variance V1)
evidence: local run, not committed (builds, browser profile, logs, screenshots)
```

**How to read this file.** `file:n` is the file at the candidate `7263004`, unless marked "at `5092ac9`" (#181's commit, which records the owner's answers P1–P5). Plan drafts are at `c2af8ae` (`docs/development/plan-v2-draft/sections/` on the plan branch). The drill's builds, tools, logs and screenshots are local, not committed; their names are given so a rerun can match them.

## Why this drill

- **G7 item 1** (adopted, `S05:192` on main): "storage migration and old-cache compatibility pass before a release that changes the schema". 2b is the first writer of a new stored field in K1 (`revision` on a placement test).
  - This drill is not that before-release pass. The writer `a05ae70` was already published (Pages 40357991698, `deploy-pages` done 2026-10-26T16:55:51Z) almost five hours before the drill ran (21:39Z).
  - G7 item 1's evidence is 2b's pre-merge report (`docs/development/reports/FX-2-s2b-m-learning-027-writer.md`) and 2a's old-record tests passing on the candidate (`tests/assessment-revision*.test.ts`, unit shards 1 and 3 of Pages 40385448079).
  - This drill is the repeat at the wave's GK on the frozen candidate that draft S17 rule 4 describes: "ที่ GK ของคลื่นนั้นต้องซ้อมซ้ำบน candidate ที่ตรึง" (at the wave's GK, the drill is repeated on the frozen candidate).
- **Draft S17 at `c2af8ae`** (`docs/development/plan-v2-draft/sections/S17-r7-quality-release.md`): pre-v1.0 rollback rule 4 (`S17:171`) asks for a revert drill on the frozen candidate for every schema bump, "โดยใช้ `dist` ของ candidate และของ SHA ที่เผยแพร่ก่อนหน้า" (using the `dist` of the candidate and of the previously published SHA).
  - Its steps: install the candidate and make N+1 data; install the previous build, where the data must read (or open read-only), not be overwritten, and keep unknown fields; go back to the candidate, where "ค่าที่เก็บต้องเท่าเดิมทุกไบต์ (วิธีของ EO-STO-2)" (the stored value must be unchanged byte for byte, by EO-STO-2's method).
  - The results go in "`revert-drill-<GK>.md` และ `R7.1-<GK>.md`".
  - Its GK1 row (`S17:327`) names `revert-drill-GK1.md` "if R1.6 or FX-2 starts writing a new format in the wave".
  - The rule applies from when the owner authorizes R7.2 (`S17:163`, `S17:177`), and R7.2 is not authorized. The owner asked for the drill anyway (P2 ข).
- **EO-STO-2 is not built.** S07 defines it as a diff of the storage record after a journey, with a sabotage check that adds whitespace to the record (`S07:310`). `docs/development/reports/R1.6-pr4-read-once.md:48` says it is not built yet, and `R7.1-GK1.md:75` (at `7263004`) says it is not merged.
  - Here a SHA-256 of the raw stored string stands in for it, with a check that the test's bytes appear literally in that string.
  - After the run, the stand-in was tried against EO-STO-2's sabotage on step 1's saved value (`post-run-checks.json`). One space added inside the stored test changes the value's SHA-256 and makes the literal check fail. The test's own SHA-256 alone would not see it, because the drill re-serializes the test before hashing it.
- **`R7.1-GK1.md` gets no line.** The rule is not in force (R7.2 is not authorized), and the owner's answer P2 asks for `revert-drill-GK1.md` only (`DECISIONS.md:366` at `5092ac9`).
- The table under "Result" gives rule 4's three steps in English and maps them to the steps below.

## What was rolled back to, and why these builds

| Build | SHA | What it is | Published |
|---|---|---|---|
| candidate 7263004 | `72630046fc5eb56f1797e5363b6f9ad293ff9d38` | #179 on #180 and #177 (2b) | Pages 40385448079, 2026-10-26T19:41:58Z |
| 2a only | `c5da5bb4b7cd78e45d030b2747020e7e6ac9994e` | #176, the reader | Pages 40340692641, 2026-10-26T15:10:22Z |
| before 2a | `408ad16b90fd72b934f947afc2ed13efc4a7584a` | #174 (Markdown only; app code = `3644749`) | Pages 40228322904 (daily refresh at `408ad16`, run end 2026-10-25T20:28:26Z) |

- **Variance V1 (build choice).** The rule names one build to go back to, and this drill used two others.
  - Draft S17 rule 4 says the `dist` "ของ SHA ที่เผยแพร่ก่อนหน้า" (of the previously published SHA). The question sheet prepared for P2 (local, not committed) says "ใช้ candidate → ย้อนไปรุ่นที่เผยแพร่ก่อนหน้า → กลับมา" (use the candidate → go back to the previously published build → come back).
  - The P2 row in DECISIONS (`DECISIONS.md:366` at `5092ac9`) records option (ข) as "open the new build, take a test, then open it with a build from before 2a", and its effect column says the drill opens the test "with a build from before 2a (2a is #176, `c5da5bb`), not with `a05ae70`".
  - The build published just before the candidate is `a05ae70` (#177, 2b itself; Pages 40357991698, 16:55:51Z). Its app inputs equal the candidate's: `git diff --quiet a05ae70 72630046 -- src public index.html vite.config.ts package.json package-lock.json` exits 0, and only `budgets.json` and Markdown differ. Going back to it is not a schema rollback and would test nothing.
  - So the drill went back to the two published builds before the writer, `408ad16` (before 2a) and `c5da5bb` (2a only). This departs from the rule's wording and from the prepared question's wording. It matches the option as DECISIONS records it, and adds `c5da5bb`. The GK1 record lists it in PROGRESS, "Variances for GK1".
- `git diff --stat c5da5bb 72630046 -- src` is 2b's three files only (`revision.ts`, `types.ts`, `assessment-view.ts`, +8 −4). A revert of 2b on main would therefore publish `c5da5bb`'s app code. A revert of 2a and 2b would publish `408ad16`'s. Only the build stamp would differ.
- Between `408ad16` and the candidate, `src/lessons/progress.ts`, `src/projects/validation.ts`, `src/projects/archive.ts`, `src/workspace/`, `src/pwa/` and `src/ui/lessons/lesson-mode.ts` are byte-identical (`git diff --quiet 408ad16 72630046 -- …`). The storage readers and writers, the service worker and the lesson code that saves in step 2 are the same in all three builds. What differs is the assessment code (2a's reader, 2b's writer) and the stamp.

## Setup

Everything below ran in the integration session on 2026-10-26 (local run, not committed). The repository checkout was used read only (`git worktree add` only).

### Builds

```sh
git worktree add --detach <wt-408ad16> 408ad16b90fd72b934f947afc2ed13efc4a7584a
git worktree add --detach <wt-c5da5bb> c5da5bb4b7cd78e45d030b2747020e7e6ac9994e
git worktree add --detach <wt-cand>    72630046fc5eb56f1797e5363b6f9ad293ff9d38
# each worktree links one shared node_modules: package.json and package-lock.json are the same at all three
cd <wt-each> && npx vite build      # exit 0 for each, 5–6 s each (2026-10-26 21:29:10–21:29:26Z)
```

`package.json`, `package-lock.json`, `vite.config.ts`, `index.html`, `public/` and `src/pwa/` are identical at `408ad16` and `72630046`. Node v22.22.0 (CI pins 22.23.3), Vite 8.3.0.

| Build | Stamp (`build-info.json`, `<html data-build>`) | Files in `dist` | `sw.js` SHA-256 | Precache version (manifest in `sw.js`) |
|---|---|---|---|---|
| candidate 7263004 | `72630046` | 90 | `121b3d27…0a61f19` | `0b9ffbcb4c7564` |
| `c5da5bb` | `c5da5bb4` | 90 | `28c065fc…05ffecc` | `0eed9ed5c1b44e` |
| `408ad16` | `408ad16b` | 90 | `d19a235f…e71b429d` | `0fc2847196867c` |

Each precache lists 68 files. The fresh candidate build equals the candidate `dist` that the freeze's KPI baselines measured (local) in all 88 files other than `build-info.json` and `SHA256SUMS` (`sha256sum` lists compared with `cmp`).

### One origin, one path, a "deploy"

- `server.mjs` (local, not committed; SHA-256 `619d098a…b58321`) serves one build's `dist` under `http://127.0.0.1:4391/Orbitlab/`, with GitHub Pages' caching headers (`Cache-Control: max-age=600`, `ETag`, `Last-Modified`, 304 on `If-None-Match`) and no SPA fallback. Switching the folder it serves is the deploy. It logs every request with the build being served.
- The drill script `drill.mjs` (local, not committed; SHA-256 `b539df0b…5d95b3b`) runs the server in the same Node process and drives Chromium with Playwright.

### Browser

- Playwright 1.63.0 `chromium.launchPersistentContext` on **one user-data folder** for steps 1–4. The browser is closed at the end of each step and opened again on the same folder for the next, as a learner coming back.
- Chrome for Testing 153.0.8010.12, headless shell (`HeadlessChrome/153.0.8010.12`), SwiftShader WebGL (the harness's flags `--use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader --ignore-gpu-blocklist`). Viewport 1280×900, scale 1, locale en-GB, service workers allowed.
- The CI runners' font: a fontconfig file that maps `system-ui` and `sans-serif` to DejaVu Sans and rejects Inter, as in `R7.1-GK1.md`'s local runs. The machine has 4 CPUs.
- An init script installs the harness's WebMCP stand-in (`tests/browser/harness.mjs`), so the app's own read-only tool `get_assessment_result` can be called. On the very first visit only, it sets the guide to dismissed and the language to English. Later visits write nothing to storage.

### How the app moves to a new build

This is the FX-7 flow, unchanged since `408ad16`:

1. A new deploy is a new `sw.js` (a new precache manifest). `src/pwa/register.ts` registers it on every page load. The browser also checks on navigation.
2. The new worker installs beside the running one. `precache()` copies every file whose revision is unchanged from the old cache and fetches the rest, checking each against its revision.
3. The new worker waits. The page shows "A new version of Orbitlab is ready." with a Reload button.
4. Reload posts `orbitlab:skip-waiting`. The worker activates, deletes every other precache and claims the page. `controllerchange` reloads the page.

The drill presses that Reload button. It never calls `skipWaiting` itself and never clears caches or storage.

### What is recorded

- **Stored value:** the active learner's `orbitlab.lessons`. The learner id comes from `sessionStorage['orbitlab.profiles.selected.v1']` and the value from `localStorage['orbitlab.profile.v1.<id>'].values['orbitlab.lessons']`. Each read saves the exact string and its SHA-256. It also saves the test's own bytes (`JSON.stringify(assessments[0])`), checks that those bytes appear literally in the stored string and contain `"revision":1`, and lists any `orbitlab.lessons.recovery*` key.
- **Service worker:** `<html data-build>`, the page's module script, `navigator.serviceWorker.controller`, the registration's active, waiting and installing workers, and `caches.keys()`. It also sends the worker's own `orbitlab:offline-check` message, which returns the controlling worker's precache version, whether all 68 files are cached with their revisions (`complete`), and whether this page's script is in that worker's manifest (`pageMatches`).
- **Result:** the lessons catalogue's test card, the result page (eyebrow, headline, summary, the six area bars, the four cards), WebMCP `get_assessment_result`, and screenshots. The drill's comparison of readings leaves out the four cards (see "The round trip").

### Commands

```sh
# in the drill's tool folder (local, not committed); OUT is a local results folder
OUT=<out>/run-candidate-7263004 PORT=4391 FONTCONFIG_FILE=<fonts.conf> \
  timeout 3000 node drill.mjs > <out>/run-candidate-7263004.out 2>&1    # exit 0, 21:39:20–21:44:41Z
```

## Steps and evidence (candidate 7263004, run of 2026-10-26 21:39–21:44Z)

### Step 1: candidate 7263004, a learner takes the placement test

- The first visit installed the candidate's worker, which took the page: `data-build` `72630046`, worker version `0b9ffbcb4c7564`, complete 68 of 68, `pageMatches` true; caches `orbitlab-precache-0b9ffbcb4c7564`.
- The app opened on a new learner, `legacy-v1` ("Learner 1"), with no `orbitlab.lessons` yet.
- Lessons → "Take the placement test" → "Start the test". As soon as the test began, the stored test carried `"revision":1` with 0 answers (value SHA-256 `bfd36d80…76216ec`, 1 280 bytes).
- All 25 questions were answered with the page's own controls: a spread of options, numbers, orderings and confidences, each question's Next/Finish button.
- The finished value is 2 429 bytes, SHA-256 `c127d875…454660bc2`. The test's bytes are SHA-256 `875246cd…9bff261d` and begin `{"revision":1,"kind":"pre","seed":381309865,…`; `finishedAt` is `2026-10-26T21:39:48.653Z`.
- Result page: "Score 23 % — start with Space basics", "7 of 25 questions right · misconceptions: 6.". The area bars:

  | Area | Right | Misconceptions | Score | Level |
  |---|---|---|---|---|
  | 1 Space basics | 1 of 5 | 2 | 14 % | Beginner |
  | 2 Orbital mechanics | 1 of 4 | 1 | 17 % | Beginner |
  | 3 Rocket performance and the atmosphere | 1 of 4 | 1 | 17 % | Beginner |
  | 4 Guidance and navigation | 2 of 4 | – | 42 % | Beginner |
  | 5 Attitude control | 2 of 4 | 1 | 50 % | Basic |
  | 6 Failures and safety | 0 of 4 | 1 | 0 % | Beginner |

  The catalogue card read "Latest test: 23 %. Recommended start: 1.1 Your first orbit.". WebMCP gave `percent` 23, `start` `orbit-first` and 6 misconceptions.
- A reload left the value byte for byte (`c127d875…`).

The full stored value at the end of step 1:

```json
{"version":1,"lessons":{},"assessments":[{"revision":1,"kind":"pre","seed":381309865,"startedAt":"2026-10-26T21:39:43.639Z","questions":[{"id":"b-vacuum-thrust","order":[1,0,3,2]},{"id":"b-vehicle-distinct","vehicle":"electron","vehicleOptions":["falconheavy","protonm","longmarch5","electron"]},{"id":"b-stages","order":[0,2,3,1]},{"id":"b-multi-leo","order":[0,4,2,1,3]},{"id":"b-higher-slower","order":[0,2,3,1]},{"id":"o-perigee","order":[3,1,0,2]},{"id":"o-plane-burn","order":[0,1,3,2]},{"id":"o-two-burns","order":[2,0,1,3]},{"id":"o-period-height","values":{"T":12}},{"id":"r-tsiolkovsky","order":[1,2,0,3]},{"id":"r-read-meco","values":{}},{"id":"r-multi-solid","order":[1,3,4,0,2]},{"id":"r-hydrogen-first","order":[0,2,1,3]},{"id":"g-turn-early","order":[2,1,0,3]},{"id":"g-peg-igm","order":[1,3,2,0]},{"id":"g-multi-peg","order":[1,3,4,0,2]},{"id":"g-3sigma","order":[2,3,0,1]},{"id":"c-multi-actuators","order":[2,3,0,1,4]},{"id":"c-crossover","order":[3,2,1,0]},{"id":"c-notch","order":[0,1,2,3]},{"id":"c-maxq-margins","order":[2,1,0,3]},{"id":"f-three-imus","order":[1,3,2,0]},{"id":"f-proton2013","order":[1,2,0,3]},{"id":"f-engine-out-thrust","order":[2,3,1,0]},{"id":"f-multi-voting","order":[3,0,2,1,4]}],"answers":[{"id":"b-vacuum-thrust","value":0,"confidence":"sure"},{"id":"b-vehicle-distinct","value":"longmarch5"},{"id":"b-stages","value":1,"confidence":"sure"},{"id":"b-multi-leo","value":"3"},{"id":"b-higher-slower","value":2,"confidence":"sure"},{"id":"o-perigee","value":0},{"id":"o-plane-burn","value":2,"confidence":"sure"},{"id":"o-two-burns","value":2,"confidence":"unsure"},{"id":"o-period-height","value":7.8},{"id":"r-tsiolkovsky","value":0},{"id":"r-read-meco","value":100},{"id":"r-multi-solid","value":"4"},{"id":"r-hydrogen-first","value":2,"confidence":"sure"},{"id":"g-turn-early","value":0,"confidence":"unsure"},{"id":"g-peg-igm","value":0},{"id":"g-multi-peg","value":"3","confidence":"unsure"},{"id":"g-3sigma","value":3},{"id":"c-multi-actuators","value":"1"},{"id":"c-crossover","value":0},{"id":"c-notch","value":0,"confidence":"unsure"},{"id":"c-maxq-margins","value":1,"confidence":"sure"},{"id":"f-three-imus","value":2,"confidence":"unsure"},{"id":"f-proton2013","value":3},{"id":"f-engine-out-thrust","value":2,"confidence":"unsure"},{"id":"f-multi-voting","value":"3","confidence":"sure"}],"finishedAt":"2026-10-26T21:39:48.653Z"}],"customLessons":[],"customQuestions":[]}
```

### Step 2: roll back to `408ad16` (before 2a)

- **Deploy and update.** The server switched to `408ad16`'s `dist` (21:40:07Z), and the browser was opened again on the same profile.
  - The first page still ran the candidate from its precache (`data-build` `72630046`, worker `0b9ffbcb4c7564`). This is the FX-7 behavior: a deploy reaches an installed app only through the update offer.
  - The navigation and `register()` fetched the new `sw.js` (200 at 21:40:28Z). The `408ad16` worker installed and waited (caches `orbitlab-precache-0b9ffbcb4c7564`, `orbitlab-precache-0fc2847196867c`, `orbitlab-runtime`).
  - The install downloaded 15 files besides `sw.js` (21:40:28–29Z): `index.html` and 14 changed scripts. Every other file was copied from the old cache. (Later, at 21:40:52Z, the page fetched one landing picture, `home/orbit.en.webp`, which is never precached.)
  - The page offered "A new version of Orbitlab is ready. Reload". After Reload the page ran `408ad16b`, with worker `0fc2847196867c` complete 68 of 68 and `pageMatches` true. The old precache was deleted (caches: `orbitlab-precache-0fc2847196867c`, `orbitlab-runtime`).
- **Reads, no writes.**
  - The same learner opened (`legacy-v1`, the only one).
  - The stored value on opening, after loading `408ad16` and after showing the result was `c127d875…` every time, step 1's bytes exactly. No recovery copy was made: `408ad16`'s `loadProgress` keeps the test object as parsed and the bytes round-trip.
- **Same result.** The card read "Latest test: 23 %. Recommended start: 1.1 Your first orbit.". The headline, summary, six area bars and the WebMCP result were identical to step 1.
- **The old build saves.**
  - Lessons → 1.1 Your first orbit → "💡 Hint 1/3" (the button then read "💡 Hint 2/3"). This is `lesson-mode`'s `showHint` → `saveProgress`, which writes the whole progress value back.
  - The value became 2 487 bytes, SHA-256 `1ebff792…dacaf330`. `lessons` is now `{"orbit-first":{"attempts":0,"hintsShown":1,"passed":false}}`.
  - The test's bytes are unchanged (`875246cd…`), appear literally in the value and still hold `"revision":1`. No recovery key appeared. This build has no `revision` in its types, so it kept a field it does not know.
- After the save the result page was the same, and after a reload the value was the same (`1ebff792…`).

### Step 3: roll back to `c5da5bb` (2a only)

- **Deploy and update** (21:41:36Z), the same flow as step 2.
  - The first page ran `408ad16b` (worker `0fc2847196867c`).
  - The new `sw.js` was fetched, and the install downloaded 14 files besides `sw.js`.
  - After Reload the page ran `c5da5bb4` with worker `0eed9ed5c1b44e`, complete 68 of 68, `pageMatches` true. Caches: `orbitlab-precache-0eed9ed5c1b44e`, `orbitlab-runtime`.
- **Reads, no writes.** The same learner opened. The value on opening, after loading and after showing the result was `1ebff792…` each time (what `408ad16` left).
- **Same result**: the same headline, summary, bars, card and WebMCP result as step 1. This build's reader (`attemptRevision`) reads `"revision":1` as revision 1 and grades the test with the revision-1 bank. The control below shows that it does read the field.
- **The 2a build saves.** Hint 2/3 (the button then read "💡 Hint 3/3"). The value is SHA-256 `2793b2db…a44229af` with `hintsShown` 2. The test's bytes are unchanged (`875246cd…`) with `"revision":1`, and there is no recovery key. The score was the same after the save, and the value was the same after a reload.

### Step 4: roll forward to candidate 7263004

- **Deploy and update** (21:42:49Z).
  - The first page ran `c5da5bb4` (worker `0eed9ed5c1b44e`).
  - The install downloaded only `sw.js` and `index.html`. The candidate's other changed files were still in the profile's HTTP cache from step 1 and matched their revisions, so `fetchVerified` used them. `index.html` (one URL, different bytes per build) failed the revision check and was downloaded again.
  - After Reload the page ran `72630046` with worker `0b9ffbcb4c7564`, complete 68 of 68, `pageMatches` true. Caches: `orbitlab-precache-0b9ffbcb4c7564`, `orbitlab-runtime`.
- **Reads, no writes.** The same learner opened. The value on opening, after loading and after showing the result was `2793b2db…` each time (what `c5da5bb` left).
- **Same result** as step 1 on every field compared.
- **The candidate saves.** Hint 3/3 (the button then read "No more hints"). The value is SHA-256 `dfc9c763…253abfacd` with `hintsShown` 3. The test's bytes are unchanged (`875246cd…`). The writer stamps new tests only and did not touch this one. The score was the same, and the value was the same after a reload.

### The round trip, end to end

- **Test bytes.** The test's bytes at the end equal step 1's: SHA-256 `875246cd9d6a08e177c7be4eeddfe2a35018854e19eb13528b1dc3b09bff261d` at all 17 reads from the finish to the end.
- **The whole value.** At the end it equals step 1's except `lessons`, which holds the history the three hint saves wrote, one per build. It is not byte-equal to step 1's value.
  - The drill's own check (one of the 48) compares the parsed values with `lessons` set aside (`isDeepStrictEqual` in `drill.mjs`). It does not compare bytes.
  - The byte-level claim was checked after the run, offline, on the saved files (`post-run-checks.json`). Replacing step 1's `"lessons":{}` (it occurs once) with `"lessons":{"orbit-first":{"attempts":0,"hintsShown":3,"passed":false}}` gives the end value byte for byte (2 429 → 2 487 bytes, `c127d875…` → `dfc9c763…`).
- **The result.** All seven readings of the result were identical: step 1, then steps 2, 3 and 4 each before and after that build's own save.
  - The drill's checks (`sameScore` in `drill.mjs`) compared the card, the eyebrow, the headline, the summary, the six bars and the whole WebMCP answer.
  - The four cards (strengths, to work on, misconceptions, recommended path) were recorded in each reading but are not in `sameScore`. They were compared after the run from `drill-log.jsonl` (`post-run-checks.json`): identical in all seven readings, as is every other recorded field. A rerun should add `cards` to `sameScore`.
- **No write on read.** No build wrote `orbitlab.lessons` on loading, on showing the result or on reloading. Every change of value in the table below follows a hint save.
- **Other keys.** The learner record's own `revision` counter rose on page loads as well as on saves (29 at the end of step 1, 63 at the end), because the app saves other keys of the record when a page loads. `orbitlab.lessons` did not change on those loads.

| Read | Build running | `orbitlab.lessons` SHA-256 | Test bytes SHA-256 | `"revision":1` | Recovery key |
|---|---|---|---|---|---|
| step 1, test begun | candidate 7263004 | `bfd36d80…` (1 280 B) | `7879411a…` (no answers) | yes | none |
| step 1, finished | candidate 7263004 | `c127d875…` (2 429 B) | `875246cd…` | yes | none |
| step 1, after reload | candidate 7263004 | `c127d875…` | `875246cd…` | yes | none |
| step 2, opened (before Reload) | candidate 7263004 | `c127d875…` | `875246cd…` | yes | none |
| step 2, loaded | `408ad16` | `c127d875…` | `875246cd…` | yes | none |
| step 2, after showing the result | `408ad16` | `c127d875…` | `875246cd…` | yes | none |
| step 2, after its own save (hint 1) | `408ad16` | `1ebff792…` (2 487 B) | `875246cd…` | yes | none |
| step 2, after reload | `408ad16` | `1ebff792…` | `875246cd…` | yes | none |
| step 3, opened (before Reload) | `408ad16` | `1ebff792…` | `875246cd…` | yes | none |
| step 3, loaded | `c5da5bb` | `1ebff792…` | `875246cd…` | yes | none |
| step 3, after showing the result | `c5da5bb` | `1ebff792…` | `875246cd…` | yes | none |
| step 3, after its own save (hint 2) | `c5da5bb` | `2793b2db…` | `875246cd…` | yes | none |
| step 3, after reload | `c5da5bb` | `2793b2db…` | `875246cd…` | yes | none |
| step 4, opened (before Reload) | `c5da5bb` | `2793b2db…` | `875246cd…` | yes | none |
| step 4, loaded | candidate 7263004 | `2793b2db…` | `875246cd…` | yes | none |
| step 4, after showing the result | candidate 7263004 | `2793b2db…` | `875246cd…` | yes | none |
| step 4, after its own save (hint 3) | candidate 7263004 | `dfc9c763…` | `875246cd…` | yes | none |
| step 4, after reload | candidate 7263004 | `dfc9c763…` | `875246cd…` | yes | none |

### Control: the 2a build reads the field

The control used a separate, throwaway browser context with its own storage and service workers blocked, not the drill's profile. With `c5da5bb` served, it seeded its learner with the drill's final value, changing only the test's `"revision":1` to `"revision":2`.

The `c5da5bb4` page did not show the test:
- the catalogue card offered "Not sure where to start? A 25-question test …" (no result);
- WebMCP gave `{"taken":false}`.

This is 2a's newer-test rule ("ไม่แสดง และเก็บไบต์ไว้"). So step 3's same score comes from `c5da5bb` reading the test as revision 1. It does not come from ignoring the field.

On its own, the drill's control cannot rule out a seed that never landed or was overwritten, which would also give "Not sure where to start?" and `taken:false`: it does not read storage back after its reload, and it has no revision-1 twin. So the control was run again after the drill, with both added.

```sh
# in the drill's tool folder (local, not committed); control-recheck.mjs, SHA-256 abeb7b2b…6c803cd1eb
OUT=<out>/control-recheck PORT=4392 FONTCONFIG_FILE=<fonts.conf> \
  timeout 900 node control-recheck.mjs > <out>/control-recheck/run.out 2>&1    # exit 0, 2026-10-26 22:18:40–22:19:57Z
```

It served the same `c5da5bb` `dist` (`sw.js` `28c065fc…05ffecc`), with the same browser, flags and throwaway context as the drill's control. It seeded the drill's final value twice, once with the test at revision 2 and once left at revision 1, then reloaded and read storage back.

| Seeded revision | Page | Seed landed before the reload | Stored value after the reload | Card | WebMCP |
|---|---|---|---|---|---|
| 2 | `c5da5bb4` | yes | the seed byte for byte (`8c4c6aa5…`, 2 487 B), revision 2, no recovery key | "Not sure where to start? …" | `taken:false` |
| 1 | `c5da5bb4` | yes | the seed byte for byte (`dfc9c763…`, the drill's final value), revision 1, no recovery key | "Latest test: 23 %. Recommended start: 1.1 Your first orbit." | `taken:true`, `percent` 23, `start` `orbit-first` |

Same storage, same seeding, and only the revision differs: the 2a build shows the revision-1 test and hides the revision-2 one while keeping its bytes. No page error in either. The drill's conclusion holds.

## Result

The check column gives draft S17 rule 4's three steps in English (`S17:171`; the Thai is quoted under "Why this drill").

| Step (S17 rule 4) | Check | Build used | Result | Evidence |
|---|---|---|---|---|
| 1 | Install the candidate and create a test that has a revision. | candidate 7263004 | **pass** | test begun and finished with `"revision":1`. Score 23 %, 7 of 25, misconceptions 6 |
| 2 | Install the previously published build. The data must read, or open read-only, not be overwritten, and keep unknown fields. | `408ad16` (before 2a), in place of `a05ae70`: **variance V1** | **pass** on `408ad16` | worker `0fc2847196867c` through the app's update offer. Same learner, same result and score. No write on load or view (`c127d875…`). After its own save the test bytes are unchanged with `"revision":1` (`875246cd…`) |
| 2 | (same item) | `c5da5bb` (2a only), in place of `a05ae70`: **variance V1** | **pass** on `c5da5bb` | worker `0eed9ed5c1b44e`. Same result and score, read as revision 1. Control: a revision-2 test is hidden, and its re-check with read-back and a revision-1 twin shows the seed landed and the field is read. After its own save the test bytes are unchanged |
| 3 | Go back to the candidate. The stored bytes must be equal. | candidate 7263004 | **pass** for what was shown: no build wrote on load or view, and the test's bytes are equal. The whole value is not byte-equal to step 1's, because the drill's own hint saves changed `lessons` | worker `0b9ffbcb4c7564`. Value on opening = what `c5da5bb` left (`2793b2db…`), unchanged after loading and showing the result. Test bytes = step 1's (`875246cd…`) at all 17 reads from the finish. Whole value = step 1's plus the drill's own hint history: shown byte for byte after the run by replacing `lessons` (`post-run-checks.json`); the drill's own check compares parsed values |

48 of 48 checks passed, with no page error and no console error or warning. An earlier full run of the same drill (21:33–21:38Z, without the candidate's own save in step 4) passed 45 of 45 with another test (16 %, 4 of 25). The control re-check and the offline post-run checks came after the run and are not among the 48.

2b's rollback line holds as written in its report (`FX-2-s2b-m-learning-027-writer.md:150`): "Revert the fix commit. Tests begun while it was live keep `"revision": 1`. Every build reads that as revision 1 or keeps it unread … so nothing needs migrating." There is no orphaned data, so a revert stays possible and a forward-fix is not the only path (draft S17 rules 2 and 5).

## Limits

- **Local builds, not the Pages bytes.**
  - The three builds were made here from the committed data snapshots. Pages runs `npm run snapshots` before building, which rewrites `public/data/`, so its `dist` (candidate `distSha256` `e4f37fce…b72f`) differs in the data files.
  - The app source built from each SHA is the same, but the JavaScript bytes are not. The build stamp is compiled into the code (`define: { __ORBITLAB_BUILD__ … }`, `vite.config.ts:111`). The local stamps have 8 characters (`72630046`, `408ad16b`, `c5da5bb4`); Pages checks out at depth 1 and its stamp has 7 (`7263004`).
  - So the content-hashed chunk names differ too. The local candidate has `index-BU-tJaNU.js` and `assessment-view-C8YvzY2e.js`; the Pages build has `index-DuQmqZnL.js` and `assessment-view-CVOvnaFe.js` (the `build` job log of Pages 40385448079, job 121793105792). The precache manifest and the worker version differ with them.
- **Not github.io.**
  - The builds were served from `127.0.0.1:4391` by a local server that copies Pages' caching headers. The live site cannot be reached from here (the proxy refuses `royin001.github.io`).
  - A real rollback reaches users through a revert on main and a Pages run. The `deploy.yml` tip guard never publishes an old SHA directly (draft S17 rollback rule 1), and the reverted build would carry a new stamp.
  - The drill swapped the served folder instead. The pipeline was not part of it.
- **One browser.**
  - Chromium 153 headless shell only, one learner, English. Safari, Firefox, iPad and Android are HU-6's.
  - The learner closed the browser and came back for each step. A tab left open would get the same offer from the hourly `registration.update()` in `register.ts`; that timer was not waited for.
- **One kind of old-build save.**
  - The old builds saved through `lesson-mode` (a hint), which rewrites the whole `orbitlab.lessons` value.
  - Other writers that carry tests were not exercised in the browser here: resuming on an old build a test begun but not finished on the candidate, starting a follow-up test on an old build, a project archive, a profile backup and the results file. 2a's round-trip tests cover the last four (`tests/assessment-revision.test.ts`, storage, archive, import check and results file), and those readers are unchanged since `408ad16`.
  - Resuming is the most direct of these, because it rewrites the test object itself. At `408ad16`, `src/ui/lessons/assessment-view.ts:139` resumes the parsed test in place (`this.attempt = open`), `:382` sets `a.answers[this.index] = answer` on it and `:402` sets `finishedAt`, each followed by a save. So `revision` is expected to survive, but the drill used only a finished test and hint saves.
- **Revision 1 only.**
  - `BANK_REVISION` is 1 at `c5da5bb` and at the candidate (`src/lessons/assessment/bank.ts:35`). `408ad16` has no revision concept (`git grep BANK_REVISION 408ad16` finds nothing) and writes none. So no build here writes a revision another cannot read.
  - The read-only path for a newer record (draft S17 rule 3's "read-only message") does not arise for revision 1. The control shows only that the 2a build hides a revision-2 test.
- **Pattern answers.** The answers followed a fixed pattern through the page's controls, not a real learner. The score is low (23 %) but has every area, a "Basic" level and six misconceptions to compare.
- **Owner checks.** Not a gate decision. G7 item 2's old-worker reload on the live site stays the owner's to check: it waits for the owner's HU-6 session.

## Files (local, not committed)

In the drill's local results folder:

- `run-candidate-7263004.out`: the console of the run, with every check line;
- `run-candidate-7263004/drill-log.jsonl`: each record with its time: builds, service-worker states, stored reads, results, the update offer;
- `run-candidate-7263004/steps.json`: everything above, with the 48 checks;
- `run-candidate-7263004/stored/`: the exact `orbitlab.lessons` string and the test's bytes at each of the 18 reads (`<step>-<moment>.json`, `.test.json`);
- `run-candidate-7263004/shots/`: 22 screenshots, including the update offer of each roll, each result page before and after the save, the hint saves and the control;
- `run-candidate-7263004/server.log`: every request with the build served, the deploys and the `sw.js` fetches;
- `run-candidate-7263004/profile/`: the browser profile;
- `builds/`: the build logs, times and file lists (`cand-files.sha256` = `wtcand-files.sha256`);
- `trial1/`: the earlier full run (45 of 45);
- `tools.sha256`: the hashes of `drill.mjs` and `server.mjs` (in the drill's local tool folder);
- `control-recheck/`: the control re-check after the run (`control-recheck.json`, `run.out`, `server.log`, two screenshots, `start`/`end`/`exit`);
- `post-run-checks/`: `post-run-checks.json` (whole value by byte replacement, the cards of all seven readings, the whitespace sabotage) from `node post-run-checks.mjs <out>/run-candidate-7263004 > <out>/post-run-checks/post-run-checks.json`, run in the drill's tool folder (exit 0), and `tools.sha256` with the hashes of `control-recheck.mjs` (`abeb7b2b…6c803cd1eb`) and `post-run-checks.mjs` (`caa06a0d…fb26397990`).
