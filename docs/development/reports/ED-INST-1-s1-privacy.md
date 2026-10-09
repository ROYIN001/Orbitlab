# ED-INST-1 step 1: privacy statement and on-device inventory (M-LEARNING-047)

> **สรุปสำหรับเจ้าของ (ภาษาไทย)**
>
> - ทำหน้า "ความเป็นส่วนตัว" สามภาษา (ไทยก่อน แล้วอังกฤษ รัสเซีย) เป็นไฟล์ `public/privacy.html` เปิดจากปุ่ม About ได้ และเปิดได้ตอนออฟไลน์
> - รายการในหน้านี้ไล่จากโค้ดจริง: key ใน localStorage, sessionStorage, IndexedDB, Cache Storage และ host ทุกตัวที่แอปติดต่อ ไม่มี analytics หรือ telemetry ในโค้ดเลย
> - มีเทสต์ที่ล้มทันทีถ้าโค้ดเพิ่ม key, ฐานข้อมูล, cache, host หรือช่องทางส่งข้อมูลใหม่โดยไม่ได้เขียนไว้ในหน้านี้
> - ไม่ได้ขึ้นเพดานขนาดใด ๆ แต่หน้านี้ใช้ที่ใน precache code ไป 19.9 kB (เหลือ 6.1 kB จาก 26.0 kB) มีทางเลือกให้คุณตัดสินในหัวข้อ 6
> - **ห้าม merge จนกว่าคุณอนุมัติข้อความ** จุดที่ต้องยืนยันอยู่ในหัวข้อ 6 (ช่องทางติดต่อ ข้อความเชิงกฎหมาย คำว่า formative ป้ายลิงก์ และการใช้ที่ precache)

- **Package:** ED-INST-1, item M-LEARNING-047 (P1, docs + feature), lane L-C (+T), wave K1.
- **Authorization:** owner, 2026-10-05 (D-65 K1): "เมื่อทำการ merge แล้วตรวจสอบว่าทุกอย่างเรียบร้อยแล้วในระยะ K0 ให้เริ่มทำระยะ K1 ในเซสชั่นใหม่ต่อได้เลยครับ" (as recorded in DECISIONS.md D-65 K1); the owner's instruction of 2026-10-09 to continue K1 in new sessions.
- **Decisions followed:** D-49 (scores formative by default) and D-60 (the app prepares data, the user sends it through GitHub or email; no automatic collection), [DECISIONS.md](../../DECISIONS.md). [USER-STUDY-HUF.md](../../USER-STUDY-HUF.md): no HU-1 session until this statement is merged and live.
- **Base:** `main` at `007b039`. Branch `claude/lc-inst1-s1`.
- **Change type:** feature (a new page, an About link, a service-worker route for static pages) with docs. Not merge-able under the standing bug-fix approval: the owner approves the text.

## 1. Inventory, from the code

Everything below was read from the source on `007b039`, not from earlier documents. `tests/privacy-inventory.test.ts` holds the page to this list.

### 1.1 Stored on the device

| Store | Name | What | Why | How long | How to delete | Code |
|---|---|---|---|---|---|---|
| localStorage | `orbitlab.profile.v1.<id>` | One record per learner: name, and the values of the 30 workspace keys (lessons, tests, designs, missions, notebook, drafts, worksheet student list and class code, settings) | Keep each learner's work apart and across visits | Until deleted, or the browser clears site data | Delete profile (whole record and recordings); Reset records (`learning`, `exams`, `all`, or one lesson; designs and missions kept) | `src/workspace/repository.ts:37`, `:361`, `:379`; keys `src/workspace/registry.ts:2` |
| localStorage | `orbitlab.profiles.catalog.v1` | The list of profiles | Find the profiles | Until site data cleared | A row goes with its profile | `repository.ts:3` |
| sessionStorage | `orbitlab.profiles.selected.v1` | Which profile this tab opened | Per-tab owner | Until the tab closes | Close the tab | `repository.ts:4` |
| localStorage (legacy) | the 30 `orbitlab.*` workspace keys | Work saved by versions before profiles | — | Moved into the first profile at start, then removed if unchanged | Automatic | `repository.ts` initialize (legacy clean-up) |
| IndexedDB | `orbitlab-soundtracks` (store `tracks`) | Launch recordings the user added, owned per profile | Play with a flight | Until deleted | Deleted with the owner's profile | `src/workspace/media.ts:2`, `src/audio/soundtrack.ts:71` |
| Cache Storage | `orbitlab-precache-<version>` | Every file of the build, no personal data | Offline use | Old versions deleted when a new one activates | Clear site data | `src/pwa/sw-core.ts:60` |
| Cache Storage | `orbitlab-runtime` | Google Fonts (online mode), landing pictures, the launch soundtrack, once seen | Offline use | Until site data cleared | Clear site data | `sw-core.ts:61` |
| Cache Storage | `orbitlab-data` | Last answers of NOAA SWPC and CelesTrak (online mode) | Data when the network goes | Until site data cleared | Clear site data | `sw-core.ts:63` |
| Cache Storage | `orbitlab-recent-answers` | The data provider's last answers and refusals, for CelesTrak's minimum interval | Respect the source's rate rule | Until site data cleared | Clear site data | `src/provider/data-provider.ts:148` |

Not storage, and not listed on the page: Web Lock names (`orbitlab-profile-catalog-v1`, `orbitlab-profile-owner-v1:<id>`), DOM event names, service-worker messages, performance marks, file-format names and download file names; each is listed with its reason in the test's `NOT_STORED`. No cookies (`document.cookie` appears nowhere). The app does not call `navigator.storage.persist()` (R1.6 PR10, M-PLATFORM-018, is still open), so the browser may evict site data under storage pressure; the page says only what is sure (private windows, Safari's 7-day rule) and asks for backups.

### 1.2 Sent over the network

| When | To | What | Code |
|---|---|---|---|
| Opening the site | the host (GitHub Pages, `royin001.github.io`) | The page and its files; the browser checks `sw.js` for a new version when online | `src/pwa/register.ts`, `sw-core.ts` |
| Online mode only (off by default, `DEFAULT_DATA_MODE = 'offline'`, `src/provider/data-mode.ts:15`) | `services.swpc.noaa.gov` (4 JSON files), `celestrak.org` (GP queries by group) | Fixed URLs: no user data | `src/provider/datasets.ts`, `space-weather.ts`, `satellites.ts` |
| Online mode only | `fonts.googleapis.com`, `fonts.gstatic.com` | The web-fonts stylesheet and fonts | `src/ui/web-fonts.ts` |
| Lessons, worksheets | the app's own origin | Lesson packs and worksheet pictures | `src/ui/lessons/lesson-mode.ts:310`, `worksheet-view.ts:69` |
| A user copies a mission or lesson link | whoever opens it, then the host | The mission or lesson settings in the query (`?m=`, scenario) | `src/ui/mission-share.ts:65`, `src/lessons/scenario-link.ts:48` |
| A user clicks a source link | that site | A normal visit | `src/ui/dialogs.ts`, `sky-panel.ts`, others |

**Analytics / telemetry: none.** No `sendBeacon`, `WebSocket`, `EventSource`, `XMLHttpRequest` or cookie anywhere in `src/`; `fetch(` appears in four files only (above). The IERS Earth-orientation data are refreshed by the scheduled build (`scripts/refresh-snapshots.ts`), never by the browser. No problem-report tool exists yet (M-PLAN-011 is open); D-60 is stated as the rule.

**One more way data can leave, by the user's own software:** `src/mcp.ts` registers WebMCP tools when the browser offers `navigator.modelContext`. A browser-hosted AI assistant can then read the open profile's lesson progress and test results (`src/lessons/mcp-tools.ts`, `list_lessons`, `get_lesson_result`, `get_assessment_result`). Without such an assistant nothing happens. The page says so.

### 1.3 Files the user exports

Profile backups (`*.orbitlab-workspace.json`, name and all values), recordings (`.orbitlab-audio`), results files (`orbitlab-<name>-<time>…`, the learner's name, progress and scores, with a checksum), worksheets (class code; HTML or DOCX), lesson files, project backups, missions, designs, flights, telemetry and Monte Carlo CSV, chart PNG, reports and case sheets. All go to the downloads folder; deleting a profile does not delete them.

### 1.4 Who can see it

The developer: nothing (no server receives data). Anyone using the same browser on the device: every profile (no password; the profile window says so, `src/ui/profiles/text.ts` "local"). A second tab on the same profile is read-only (Web Locks). On shared school computers the page advises one account or browser profile per learner, or backup-and-delete at the end of a session, and a nickname or code instead of a real name.

## 2. The statement

`public/privacy.html`: one static page, Thai first, then English and Russian, then a technical list of every key. No script, no outside resources, system fonts, light and dark. Each language section has the same parts: summary (no accounts/ads/cookies/analytics; data stays on the device; data leaves only as files or links the user passes on; profiles have no password), a table of what is stored with how long and how to delete it, delete-everything and retention notes, shared computers, AI assistants, Internet, exported files, scores (D-49), problem reports (D-60) and rights under the PDPA.

README ("Privacy" section and the About bullet) and the USER-GUIDE ("Privacy: what Orbitlab keeps on this device") carry a short summary and point to the page, so the full text lives in one place that the test checks.

## 3. Delivery and budget

The page is a file of the build, so it is precached and opens offline. Before this change the service worker answered **every** navigation inside its scope with `index.html`, so a static page would have opened the app. `routeFor` now answers a navigation to a precached `.html` file other than `index.html` with that file (`src/pwa/sw-core.ts`); every other navigation, with any query, still gets the app. `sw.js` is not a counted chunk.

Measured with `npx vite build && node scripts/bundle-budget.mjs` (kB of 1000 B):

| Group | `007b039` | This branch | Ceiling | Room after |
|---|---|---|---|---|
| `index-*.js` | 2635.4 | 2635.5 (+81 B: the About link) | 2636 | 503 B |
| `i18n-*.js` | 1726.4 | 1726.6 (+160 B: three one-word labels) | 1727 | 424 B |
| `index-*.css` | 177.0 | 177.0 (no CSS) | 177 | 0 |
| other chunks | 770.4 | 770.4 | 771 | 0.6 |
| precache code | 14698.0 | 14717.9 (+19.9: the page 19.7, the rest the link and labels) | 14724 | 6.1 |

No ceiling is raised. The page takes 19.9 of the 26.0 kB precache-code room that every K1 code PR shares: this is the owner's call (6, question 3).

## 4. Tests

- `tests/privacy-inventory.test.ts` (new, 7 cases): each language section names every device store and host (from `PROFILE_*`, `profileStorageKey`, `MEDIA_DATABASE`, `PRECACHE_PREFIX`, `RUNTIME_CACHE`, `DATA_CACHE`, `CacheStorageRecent.NAME`, `DATA_HOSTS`, `RUNTIME_HOSTS`); the technical list has every `WORKSPACE_KEYS` entry; every `orbitlab.*`/`orbitlab-*`/`orbitlab:*` string in `src/` is on the page or in `NOT_STORED` with a reason; only the known files touch `localStorage`/`sessionStorage`, `indexedDB.open` and `caches`; no beacons, sockets, XHR or cookies, and `fetch(` only in the four known files; the dataset hosts agree in all three lists; the page has no script and no outside resource; the route opens the page as itself and every other navigation as the app.
  - Shown failing: adding `orbitlab.newThing` to `WORKSPACE_KEYS` fails two cases ("technical list misses orbitlab.newThing", and the unknown-string case).
- `tests/browser/journeys/privacy-offline.mjs` (new): the page is in the precache; offline, for Thai, English and Russian, About's link points to `privacy.html#<lang>` and opens the statement (not the app) with that section's heading shown. Passed locally (Chromium 1194, 38 s). With the old route (`navigate` → `page`) it fails: "th: the link opened the app instead of the statement".
- `scripts/verification/change-map.json`: a `privacy-statement` rule (page, About, `src/pwa/**` → build, the unit test and the journey) and an additive `privacy-inventory` rule (`src/**`, `index.html` → the unit test). `node --test tests/verification/change-map.test.mjs`: 14/14.
- Typecheck clean; the full results are in the PR.

No existing test, assertion, tolerance or golden was changed.

## 5. Not done here

- M-LEARNING-045 (closed-network install guide), 046 (classroom kit) and M-PLATFORM-073 (Thai user guide) are later steps of ED-INST-1.
- The HU-1 information sheet and consent forms are separate study documents; the page only says they exist.
- When R1.6 PR10 adds `navigator.storage.persist()`, or M-PLAN-011 adds a report tool, the page must change in the same PR (the test catches new stores, hosts and sending APIs, not every change of behaviour).

## 6. For the owner to confirm (options; the first is what the branch has)

1. **The text** in Thai, English and Russian: approve, or note changes.
2. **Contact channel.** (a) GitHub Issues only; (b) add an email address you choose; (c) add the institution's contact for its own pilots.
3. **Delivery and precache room.** (a) precached page, +19.9 kB precache code, 6.1 kB left for the rest of K1; (b) not precached (on demand, like the landing pictures): 0 kB, but offline only after it was opened once online; (c) (a) now, and a later D-38 raise with a named offset if the room runs out.
4. **Legal claims (not checked by a lawyer).**
   - L1 "PDPA gives the right to access, correct and erase your data … you do it yourself": the page names no data controller and does not say the developer is not one. Keep, or add a sentence after legal advice.
   - L2 "Learners under 20 should use the app with a parent's or teacher's knowledge": 20 is the Thai age of majority; PDPA s. 20 sets consent rules for minors (guardian alone under 10). (a) keep as advice; (b) remove; (c) reword after advice.
   - L3 "A file given to a teacher or school is in the receiver's care": implies the receiver is responsible for it under the PDPA. Keep or reword.
   - L4 "GitHub Pages may log IP address, browser type and time under GitHub's policy": from GitHub's privacy statement, not verified for Pages specifically.
   - L5 "Safari on iPhone/iPad may delete data of a site not opened for about 7 days unless added to the Home Screen": WebKit's documented behaviour; browsers change.
5. **D-49 wording.** (a) "formative by default: for learning, not official grades"; (b) "formative by default; a teacher may decide otherwise for their class".
6. **WebMCP paragraph.** (a) keep (honest about a real path); (b) drop as too technical for students.
7. **About link label.** (a) one word ("ความเป็นส่วนตัว", saves i18n room); (b) the longer "ความเป็นส่วนตัว: ข้อมูลที่เก็บในเครื่องนี้" (+~0.2 kB i18n).
