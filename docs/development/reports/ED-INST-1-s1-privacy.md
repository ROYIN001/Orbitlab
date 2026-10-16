# ED-INST-1 step 1: privacy statement and on-device inventory (M-LEARNING-047)

> **สรุปสำหรับเจ้าของ (ภาษาไทย)**
>
> - ทำหน้า "ความเป็นส่วนตัว" สามภาษา (ไทยก่อน แล้วอังกฤษ รัสเซีย) เป็นไฟล์ `public/privacy.html` เปิดจากปุ่ม About ได้
> - รายการในหน้านี้ไล่จากโค้ดจริง: key ใน localStorage, sessionStorage, IndexedDB, Cache Storage และ host ทุกตัวที่แอปติดต่อ ไม่มี analytics หรือ telemetry ในโค้ดเลย
> - มีเทสต์ที่ล้มทันทีถ้าโค้ดเพิ่ม key, ฐานข้อมูล, cache, host หรือช่องทางส่งข้อมูลใหม่โดยไม่ได้เขียนไว้ในหน้านี้
> - **คุณตอบครบ 7 ข้อแล้ว (2026-10-16)** และแก้ตามนั้นแล้ว:
>   - อนุมัติข้อความ
>   - ใส่อีเมล royinboeing001@gmail.com ทั้งสามภาษา
>   - ไม่ precache หน้านี้: โหลดจากเน็ตตามปกติ และเก็บสำเนาไว้หลังเปิดครั้งแรก จึงเปิดออฟไลน์ได้หลังจากนั้น ใช้ที่ precache code แค่ 0.3 kB
>   - ซ่อนประโยคเชิงกฎหมาย 4 ประโยค (ในแต่ละภาษา) ไว้ในไฟล์โดยไม่แสดง
>   - ข้อ 5–7 คงตามร่าง
> - ไม่ได้ขึ้นเพดานขนาดใด ๆ PR นี้รอให้คุณกด merge

- **Package:** ED-INST-1, item M-LEARNING-047 (P1, docs + feature), lane L-C (+T), wave K1.
- **Authorization:** owner, 2026-10-05 (D-65 K1): "เมื่อทำการ merge แล้วตรวจสอบว่าทุกอย่างเรียบร้อยแล้วในระยะ K0 ให้เริ่มทำระยะ K1 ในเซสชั่นใหม่ต่อได้เลยครับ" (as recorded in DECISIONS.md D-65 K1); the owner's instruction of 2026-10-09 to continue K1 in new sessions.
- **Decisions followed:** D-49 (scores formative by default) and D-60 (the app prepares data, the user sends it through GitHub or email; no automatic collection), [DECISIONS.md](../../DECISIONS.md). [USER-STUDY-HUF.md](../../USER-STUDY-HUF.md): no HU-1 session until this statement is merged and live.
- **Base:** started on `main` at `007b039`; `main` at `a667cf4` merged in on 2026-10-16. Branch `claude/lc-inst1-s1`.
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

**The owner's answer (2026-10-16, point 3 ข): "ใช้เน็ตโหลดปกติเลยครับ ดึงประสิทธิภาพออกมาเต็มที่".** So the page is not precached: `privacy.html` is listed in `ON_DEMAND_PREFIXES` (`src/pwa/manifest.ts`), so an install does not download it.

Before this change the service worker answered **every** navigation inside its scope with `index.html`, so a static page would have opened the app. `routeFor` (`src/pwa/sw-core.ts`) now routes a navigation to an `.html` file other than `index.html` like this:
- a precached page comes from the precache (no such page today);
- an on-demand page gets the new route `static`: network first, so a changed statement is read at once, with the copy kept in `orbitlab-runtime`. That copy opens the page offline once it has been seen online.

Every other navigation, with any query, still gets the app. `sw.js` is not a counted chunk.

The first version of this PR precached the page, which cost +20.9 kB of precache code (5.1 kB left of 26.0). That is gone now.

Measured with `npx vite build && node scripts/bundle-budget.mjs` (kB of 1000 B), against `main` at `a667cf4` built the same way:

| Group | `main` `a667cf4` | This branch | Ceiling | Room after |
|---|---|---|---|---|
| `index-*.js` | 2644.6 (2,644,641 B) | 2644.7 (2,644,722 B, +81 B: the About link) | 2645 | 278 B |
| `i18n-*.js` | 1726.4 (1,726,416 B) | 1726.6 (1,726,576 B, +160 B: three one-word labels) | 1729 | 2.4 |
| `index-*.css` | 177.0 | 177.0 (no CSS) | 178 | 1.0 |
| other chunks | 770.8 | 770.8 | 772 | 1.2 |
| precache code | 14709.2 | 14709.5 (+0.3: the link and labels; the page is not precached) | 14724 | 14.5 |

No ceiling is raised and `budgets.json` is untouched. The ceilings above are main's, after the owner's q03 allowance.

## 4. Tests

- `tests/privacy-inventory.test.ts` (new, 7 cases): each language section names every device store and host (from `PROFILE_*`, `profileStorageKey`, `MEDIA_DATABASE`, `PRECACHE_PREFIX`, `RUNTIME_CACHE`, `DATA_CACHE`, `CacheStorageRecent.NAME`, `DATA_HOSTS`, `RUNTIME_HOSTS`); the technical list has every `WORKSPACE_KEYS` entry; every `orbitlab.*`/`orbitlab-*`/`orbitlab:*` string in `src/` is on the page or in `NOT_STORED` with a reason; only the known files touch `localStorage`/`sessionStorage`, `indexedDB.open` and `caches`; no beacons, sockets, XHR or cookies, and `fetch(` only in the four known files; the dataset hosts agree in all three lists; the page has no script and no outside resource; the route opens the page as itself and every other navigation as the app.
  - Shown failing: adding `orbitlab.newThing` to `WORKSPACE_KEYS` fails two cases ("technical list misses orbitlab.newThing", and the unknown-string case).
- `tests/browser/journeys/privacy-offline.mjs` (new; reworked on 2026-10-16 for the owner's point 3):
  - the page is **not** in the precache;
  - online, About's link opens the statement (not the app) from the network;
  - with the network cut, for Thai, English and Russian, the link points to `privacy.html#<lang>` and opens the statement from its kept copy, with that section's heading shown and no held sentence visible.
  - Passed locally (Chromium 1194), together with `pwa-offline`, on the merged branch.
  - The first version (precached) failed with the old route (`navigate` → `page`): "th: the link opened the app instead of the statement".
- Inventory test, 2026-10-16: 8 cases. Two cases were added:
  - the route and the worker's answer: network first, a changed page read at once, the kept copy used offline, stored only in `orbitlab-runtime`;
  - the held legal sentences: there are 12 spans, they are hidden, and every store, host and the email address stay visible.
  - `tests/privacy-inventory.test.ts` and `tests/pwa.test.ts`: 32/32.
- `scripts/verification/change-map.json`: a `privacy-statement` rule (page, About, `src/pwa/**` → build, the unit test and the journey) and an additive `privacy-inventory` rule (`src/**`, `index.html` → the unit test). `node --test tests/verification/change-map.test.mjs`: 14/14.
- `npx tsc --noEmit` clean. `npx vitest run` passed 312 files and 10,354 tests on `25de8fa`; on the merged branch of 2026-10-16 (main `a667cf4` in, the owner's answers applied) it passed 324 files and 10,435 tests. After the review fixes, which changed only the page text and the inventory test, `tests/privacy-inventory.test.ts` was re-run (7/7) and so were the build, the budget and the `privacy-offline` journey. `pwa-offline` also passes with the new route. `node --test tests/verification/*.test.mjs tests/browser/shard.test.mjs`: 93/93.

No existing test, assertion, tolerance or golden was changed.

## 4a. Second-agent review

A second agent reviewed commit `25de8fa` against the code. It found **no blocking findings** and confirmed 17 of 17 claims, including the routing change being safe (only `privacy.html` changes route) and the three languages stating the same facts. It made seven non-blocking findings:

1. Fixed: a recording from before profiles that could not be moved into one (D-68) is not deleted with any profile. The tables now say it stays until site data is cleared.
2. Fixed: reopening a closed tab can restore `sessionStorage`. The tables now say so; this matters on shared computers.
3. Fixed: the WebMCP tools also operate the app, not only read it. The text now says so.
4. **For the owner** (question 2): "by email" has no address, because the repository has none.
5. Fixed: a link to a lesson the teacher wrote carries the lesson text. The text now says so.
6. Fixed: the test now checks every `caches.open(` argument in the two files that open caches. A cache with a new name fails it.
7. Recorded as a known gap: the test catches a new outside host only through the dataset lists and the `fetch(` file list. A new `img.src`/`<link>`/`<script>` to an outside host, or a new outside URL fetched from one of the four allowed files, would pass. Every `img.src` today is same-origin. Closing the gap needs an allowlist of citation-only hosts, which is left for later.

## 5. Not done here

- M-LEARNING-045 (closed-network install guide), 046 (classroom kit) and M-PLATFORM-073 (Thai user guide) are later steps of ED-INST-1.
- The HU-1 information sheet and consent forms are separate study documents; the page only says they exist.
- When R1.6 PR10 adds `navigator.storage.persist()`, or M-PLAN-011 adds a report tool, the page must change in the same PR (the test catches new stores, hosts and sending APIs, not every change of behaviour).

## 6. The owner's answers (2026-10-16), and what changed

The owner answered all seven points in chat; they are recorded in [DECISIONS.md](../../DECISIONS.md) ("Decided 2026-10-16").

| # | Point | Owner's answer | Done |
|---|---|---|---|
| 1 | The text | "อนุมัติ" | — |
| 2 | Contact | "ข. อีเมล royinboeing001@gmail.com" | The address, as a `mailto:` link, next to GitHub in the D-60 sentence, in all three languages |
| 3 | Delivery | "ข. ใช้เน็ตโหลดปกติเลยครับ ดึงประสิทธิภาพออกมาเต็มที่" | Not precached; route `static` (§3) |
| 4 | Legal claims L1–L5 | "เก็บไว้ก่อนยังไม่ต้องโชว์ … ไม่ต้องลบไฟล์แค่ซ่อนไว้ก่อนเฉยๆ" | Four sentences per language wrapped in `<span hidden data-held="legal">`. The fifth claim, L2, shares a sentence group with L1, so 12 spans in all. The headings "…and your rights" became "Scores and problem reports". The sentence on the user studies' consent form stays visible. README no longer mentions host logs. |
| 5 | D-49 wording | "ก." | Unchanged |
| 6 | WebMCP paragraph | "ก" | Unchanged |
| 7 | About label | "ก." | Unchanged (one word) |

**To show the held sentences later,** delete the `hidden data-held="legal"` spans' attributes, or the spans themselves. Then update the test case "keeps the sentences the owner held back", which counts the spans and checks that they stay hidden.

**Consequence of point 4.** Plan S16 lists, among the acceptance criteria of M-LEARNING-047, that the hosting provider may keep logs under its own policy. That sentence (L4) is now hidden, so this criterion is not met until the owner shows it again. The other S16 criteria are met: data stays local and the keys are named; profiles on a shared device have no password; online mode contacts only the listed hosts; deleting and exporting; no analytics; the report channel; the formative statement.
