# Satellite data: the daily refresh keeps the groups that answered (bug fix)

> **สรุปสำหรับเจ้าของ (ภาษาไทย)**
> NAPA-1 กลับเข้าสู่บรรยากาศเมื่อ 2 พ.ย. 2026 และตั้งแต่ 3 พ.ย. (อย่างช้า 22:31Z) CelesTrak ตอบคำค้น `NAME=NAPA` ว่า 404 ("No GP data found") คำค้นเดียวนี้ทำให้การดึงข้อมูลดาวเทียมรายวันล้มทั้งชุด นับจากนั้นทุก build ที่เผยแพร่บน Pages จึงใช้ชุดข้อมูลวงโคจรของวันที่ 26 ก.ย.
> หลังการแก้ คำค้นที่ตอบ 404 จะคงไว้เฉพาะกลุ่มของตัวเองจากไฟล์ที่ commit ไว้ พร้อมคำเตือนใน log ส่วนอีกห้ากลุ่ม (สถานีอวกาศ นำทาง อุตุนิยมวิทยา สำรวจโลก และเศษซาก) จะได้ข้อมูลใหม่ทุกวันอีกครั้ง
> แอปที่ build ออกมาไม่มีโค้ดใหม่ (build ด้วย commit stamp เดียวกับ main แล้วทุกไฟล์ใน dist/ เหมือนของ main ทุกไบต์ ยกเว้น `build-info.json` (เวลาที่ build) และ `SHA256SUMS` (hash ของไฟล์นั้นด้วย) ชื่อไฟล์ asset ขึ้นกับ stamp): ไม่เปลี่ยนข้อความ ไม่แก้ assertion เดิม และไม่ขยายเพดาน budget ผู้ตรวจที่เป็น agent ตรวจทุกรอบที่แก้ ตั้งแต่รอบแรกจนถึงสิ่งที่แก้หลัง `8876c89` ไม่พบข้อที่ขวางการ merge ข้อที่รอบก่อน ๆ พบแก้หรือตอบไว้แล้ว (หัวข้อ Second-agent review) ส่วนรอบสุดท้าย (`8876c89..e7b41c8`) พบข้อย่อย 2 ข้อและข้อเล็กน้อย 6 ข้อ: ข้อในรายงานและบันทึก 5 ข้อแก้ใน records PR หลัง #234 และ #233 ข้อเกี่ยวกับเทสต์ 1 ข้อไปอยู่ใน PR ส่วน B และคำผิดในคำอธิบาย PR แก้ที่นั่น (2026-11-25) จำนวนข้อที่ผู้ตรวจรอบหลัง ๆ ยืนยันได้อยู่ในคำอธิบายของ PR #234
> **เจ้าของอนุมัติแล้ว ให้ทำใน PR ติดตามผลแยกต่างหาก (ส่วน B):** การทำเครื่องหมายว่า NAPA-1 กลับเข้าสู่บรรยากาศแล้ว ต้องแก้ assertion ใน `tests/applications.test.ts` เอา 46320 และคำค้น `NAME=NAPA` ออกจาก `THAI_NORAD_IDS` และคำค้นของกลุ่มไทย และตัดชุดข้อมูลของ NAPA-1 ออกจาก `public/data/satellites.json` งานนี้จึงอยู่นอกการอนุมัติถาวรสำหรับการแก้บั๊ก เจ้าของตอบว่า "เอาตามที่คุณแนะนำครับ" (2026-11-25 เวลา 11:56:29Z) ต่อคำถามของ session เมื่อ 10:55:00Z ซึ่งแนะนำให้ทำใน PR แยก (ส่วน B) และไม่ใส่วันที่ในประโยค ระหว่างที่ PR ส่วน B ยังไม่ merge จะเป็นดังนี้ (2026-11-25: records PR หลัง #234 และ #233 แก้ถ้อยคำประโยคนี้ ตามข้อที่ผู้ตรวจรอบสุดท้ายของ #234 พบ):
> - แอปยังแสดง NAPA-1 ว่าอยู่ในวงโคจร SGP4 ของแอปวางชุดข้อมูลวันที่ 25 ก.ย. ไว้ที่ราว 63–100 กม. เหนือรัศมีที่เส้นศูนย์สูตร ในวันที่ 25 พ.ย. แผงจะเริ่มขึ้นว่า "SGP4 ระบุตำแหน่งของมันในขณะนี้ไม่ได้: มันตกกลับสู่ชั้นบรรยากาศแล้ว วงโคจรอยู่ภายในโลก" เป็นช่วง ๆ ตั้งแต่ 2 ธ.ค. และตลอดเวลาหลัง 00:05Z ของ 5 ธ.ค.
> - กลุ่มดาวเทียมไทยยังใช้ข้อมูลวันที่ 26 ก.ย. ชุดข้อมูลของ THEOS-2 ซึ่งทัวร์ของ Watch (ขั้น theos2) กรณีศึกษา theos2 กับเวลาที่ดาวผ่าน และ journey fx3-thai-in-sky ใช้ จะเก่าขึ้นวันละหนึ่งวัน การคัดกรองการเข้าใกล้ (screening) กับ THEOS ก็ใช้ชุดเก่าในกลุ่มไทย แม้กลุ่มสำรวจโลกจะมีชุดใหม่ของ THEOS (ข้อ 1 ใน Follow-ups)
> - บรรทัด "ชุดค่าองค์ประกอบวงโคจร ณ …" ของ Real satellites จะแสดงวันที่ใหม่ ทั้งที่กลุ่มไทยยังเป็นของ 26 ก.ย. โหมดออนไลน์มีหมายเหตุว่ากลุ่มไทยใช้ข้อมูลที่มากับแอป แต่โหมดออฟไลน์ไม่มีหมายเหตุนี้ (ข้อ 5 ใน Follow-ups)

| Field | Value |
|---|---|
| Package | none: a bug found in the audit of 2026-11-24/25 (the live site's `data/satellites.json` dated 2026-09-26T16:10:54Z, 59 days old) |
| Items | none closed; no plan item |
| change_kind | bug fix (the snapshot script `scripts/refresh-snapshots.ts` and a helper in `src/provider/satellites.ts` that the app does not use; no new code in the built app: built with main's commit stamp, every file under `dist/` but `build-info.json` and `SHA256SUMS` is byte-identical to main's; no ceiling, no assertion changed) |
| Authorization | the standing bug-fix approval (owner in chat to the K1 integration session, 2026-10-06, verbatim in [SESSION-PROTOCOL.md](../SESSION-PROTOCOL.md) §1 step 3); this session's request, 2026-11-25 at 06:52:53Z, verbatim: "มาเริ่มทำงานลำดับถัดไปเลยครับ ผมต้องทำอะไรบ้าง" (let's start the next item; what do I need to do?) |
| Base | main `844319e` (the records PR #232) |
| Branch | `claude/beautiful-shannon-l4s4za` |
| Status | Merged (PR #234, `9b224ece`, 2026-11-25T12:36:30Z, CI 45612239962 on the final head `e7b41c80`, 12 of 12 jobs, under the standing bug-fix approval); published (Pages 45615392290 at `9b224ece`, 2026-11-25T13:04:34Z; its build refreshed five groups and kept the Thai group, as expected). The next build, #233's Pages 45621018552 (13:36:42Z), met a 503 from CelesTrak and kept the whole snapshot, so the live sets are those of 2026-09-26 again until a later build refreshes them (2026-11-25, the records PR after #234 and #233). Before the merge: in PR #234 (`0e29723` tests first, then the fix) |

## The bug

The Pages build runs `npm run snapshots` before it builds, so the site
carries element sets fetched about a day before. Every build published
since 2026-11-03 has carried the catalogue of 2026-09-26 instead.

NAPA-1 (NORAD 46320, COSPAR 2020-061BA), the Royal Thai Air Force's 6U
CubeSat, re-entered on 2026-11-02. CelesTrak's SATCAT, read on 2026-11-25,
gives `DECAY_DATE` 2026-11-02 and `OPS_STATUS_CODE` D. Since 2026-11-03
(by 22:31Z; the Pages run at 00:03Z that day still got its set) CelesTrak
answers `gp.php?NAME=NAPA&FORMAT=json`, one of the Thai group's four queries,
with HTTP 404, `text/plain`, "No GP data found". The Pages log first had
this line in run 41731265523 (2026-11-03, a run that failed for two other
reasons, the debris-replay timeout (fixed by #204) and r3-first-launch
(fixed by #209)), and every build published since has carried the old set:

> `::warning::satellites: kept the snapshot already in public/data/ (https://celestrak.org/NORAD/elements/gp.php?NAME=NAPA&FORMAT=json answered 404)`

## The cause

`scripts/refresh-snapshots.ts` built the catalogue as
`parseCelestrakGp(await all(SATELLITE_URLS))`. `all()` asks the nine queries
one after another and rejects at the first failure. `text()` throws on any
status that is not ok, and never retries it. So each build fetched stations
and THEOS, threw at NAPA, and never asked the other six queries (THAICOM,
`CATNR=40141`, gnss, weather, resource, Fengyun-1C debris). The refresh's
catch kept the committed file, every group of it.

The app's online mode already falls back group by group (P2.5):
`mergeCelestrakGp` keeps the snapshot's sets for a group whose answer failed
(null) and parses the rest. The snapshot script never used it.

## The fix

- `src/provider/satellites.ts`: a new `refreshCelestrakGp(answers, kept)`.
  If an answer is null, it is `mergeCelestrakGp(answers, kept())`, so that
  group keeps the snapshot's sets and is named in `parts`. With every answer
  in, it is `parseCelestrakGp(answers)` as before, and `kept` is never called.
  The app does not import it, and the build drops it: built with main's
  commit stamp, every file under `dist/` but `build-info.json` and
  `SHA256SUMS` is byte-identical to main's (below).
- `scripts/refresh-snapshots.ts`:
  - A 404 throws `NotFound`, a `Refused`, so it is still not asked again.
  - The satellites refresh asks each query in turn, as before. It takes a
    `NotFound` as null and builds with `refreshCelestrakGp`, which reads the
    committed `public/data/satellites.json` only when needed.
  - The existing `validSatelliteCatalog` check still runs on the result. A
    kept group is named in a line of its own, with every query that
    answered 404:
    `::warning::satellites: thai kept from the snapshot already in public/data/ (…NAME=NAPA&FORMAT=json answered 404)`.
  - Every other failure keeps the whole snapshot, as before: a network
    error after its two retries, a 403 or 429, a 5xx, a body that is not
    JSON, or a malformed list, a body of `null` among them (only a 404 is
    a missing answer). Those are the host, not the query. Asking on would
    send more requests to a CelesTrak that is refusing; the online mode
    stops asking a host after a 403 or 429 for the same reason. Nine
    timed-out queries at 3 × 60 s would also approach the build job's
    30-minute limit. An answer in a group already kept for a 404 is not
    read, as online: a malformed one there, `null` aside, goes unnoticed,
    and that group is the snapshot's either way.
  - If every group has a query that answers 404 (every query's 404 among
    them), no group is left to fetch: the refresh keeps the file, as the
    online mode does, and names every 404. Online names only its first
    failure (`src/provider/data-provider.ts`), or "Invalid time value"
    where some queries answered (`mergeCelestrakGp` has no date to give).
  - The header now says that a query that finds nothing keeps only its own
    group.

A 404 must count as a missing answer, not as an empty list. As an empty
list, the fresh Thai group would hold 6 sets against the 7 in
`THAI_NORAD_IDS`. The test "has Thailand's seven satellites in orbit" in
`tests/satellite-catalogue.test.ts`, which the Pages job runs on the
refreshed file before it builds, would then fail, and nothing would
publish.

## Checks

**Failing before.** Three new tests:

| Test | Before the fix | With the fix |
|---|---|---|
| `tests/satellite-catalogue.test.ts`, "keeps the snapshot's group only where a query found nothing, and the rest fresh": each of the nine queries in turn answers nothing; only its group is the snapshot's, the others equal `parseCelestrakGp`'s, the catalogue is valid; with every answer in, the snapshot is not read | fails: `TypeError: refreshCelestrakGp is not a function` | passes |
| `tests/refresh-snapshots.test.ts` (new file), "asks every query, and keeps from the snapshot only the groups whose query found nothing": the script and its three imports are copied, with the committed `satellites.json`, to a temporary folder and run there by `node --experimental-strip-types`, `fetch` stubbed: `NAME=NAPA` answers 404, the other eight a new set each, gnss's dated 2026-09-01 and the rest 2026-08-01 (both older than each committed group's newest set), NOAA and the IERS 503; then, from the committed file again, a 404 from every query but debris's, eight in five groups | fails: `expected 3 to be 9` (main's script asked 3 of the 9 queries and wrote nothing) | passes: 9 asked; the Thai group is the committed one and the other five are the stub's; the file's `asOf` is gnss's epoch (2026-09-01), the newest set fetched, not a kept set's or the oldest (2026-11-25, the records PR after #234 and #233: the cell had named debris's epoch, a point of #234's last review); the warning names NAPA's query; with the eight 404s, those five groups are the committed ones, debris is the stub's, and the warning names the five groups and the eight 404s |
| the same file, "keeps the whole snapshot otherwise, and asks no more after a refusal": THAICOM answers 403 after NAPA's 404 (4 asked); every query answers 404 (9 asked, the warning names all nine); a 404 in every group while THEOS, THAICOM and `CATNR=40141` answer (9 asked, the warning names the six); a body of `null` (9 asked); NAPA's 404 with a snapshot whose groups are out of order (9 asked, the catalogue check). Each leaves the file as it was, byte for byte | fails: `expected 3 to be 4` | passes |

3 of 3 fail on main's code and pass with the fix. Before the fix, `tsc`
also fails on the import (TS2724, no exported member `refreshCelestrakGp`).
The script test runs in PR CI's unit shards, in a file of its own: the
Pages job's snapshot check still runs the same four files. It fetches
nothing and never writes the repo's `public/data/` (its checksums were
the same before and after every run here). Under CI's runtime preload
(`scripts/verification/run-vitest.mjs`), the script's processes report the
same runtime as the test workers. It replaces the first round's check,
the script's text matched against `/refreshCelestrakGp\(/`, which a
script with the original bug also passed.

Wrong versions, each in a scratch copy and never merged, all caught:
- the script asking through `all(SATELLITE_URLS)` again, with the fixed
  helper: both script tests fail;
- every refusal taken as a missing answer: the 403 case asks 9 queries,
  not 4;
- a 404 thrown as a plain `Refused` again: both fail;
- without the `null` check, or without the nothing-found check: the second
  test fails;
- in the helper (first round): one that never merges, one that always
  reads the snapshot, and one that takes a missing answer as an empty
  list, each caught by the first test;
- found by the fixed round's re-check, and caught since: a kept catalogue
  dated 1970 (the first script test's `asOf`), the script without its
  `validSatelliteCatalog` check, and the nothing-found check on answers
  rather than groups (both by the second script test);
- found by the review of those changes, and caught since by the first
  script test: the nothing-found check stopping at two groups or at five
  (a 404 in five groups kept the whole file; the tests had 404s in one
  group and in six), and the file dated by every group, kept ones
  included, in the helper's kept branch or in the script (the stub's sets
  were dated after the committed ones, so both dates agreed);
- found by the check of the changes made for that review, and caught
  since by the first script test: the nothing-found check counting 404s
  against the number of groups (the five-group run had one 404 in each
  group), and `mergeCelestrakGp` dating the file by the oldest set
  fetched, not the newest (the stub's sets all had one date);
- found by the second check of those changes, and caught since by the
  first script test: the file dated by the last set fetched, not the
  newest (only the last query's set was the newest).

The fifteen caught by the script tests were run again on this round's
version of the file: each still fails it.

**Dry run on CelesTrak's real answers (no network, the repo's data
untouched).** Copies of main's script and of the fixed one ran in a
scratch folder, with `fetch` stubbed by CelesTrak's answers saved on
2026-11-25 (NAPA 404) and 503 for NOAA and the IERS. Each wrote only into
that folder. The `sha256sum` of the repo's three `public/data/*.json`
files was the same before and after.

- Main's script: the Pages log's line above. It asked 3 of the 9 queries
  and did not write `satellites.json`.
- The fixed script (run again on this round's version) asked all 9,
  printed the `thai kept` warning, and wrote:
  `stations 17, thai 7, gnss 154, weather 75, imaging 167, debris 1992, as of 2026-11-25T00:15:20.921Z`.
  That is 1,023,541 B against the committed 1,018,936 B. The Thai group is
  identical to the committed one, and the other five are new.
- The four files the Pages job runs before it builds passed on that
  output, 59 of 59 (60 of 60 in the first round, with the text check this
  round removed): `tests/data-provider`, `satellite-catalogue`,
  `earth-orientation` and `activity`. A probe confirmed they read the
  dry-run file.

**Also run on this tree:**
- `npm run typecheck`: passed.
- `node --experimental-strip-types --check scripts/refresh-snapshots.ts`:
  passed. `tsc` does not check `scripts/`.
- `npm run build`, with main's commit stamp `844319e`: every asset under
  `dist/` keeps the name and size of main's build. `index-C9YcO2QV.js` is
  2,669,324 B, and no chunk contains the helper. Asset names follow the
  stamp (`__ORBITLAB_BUILD__`, `vite.config.ts`), so a build of the
  branch's own commit names them anew. `build-info.json` holds the build
  time (`builtAt`; `SOURCE_DATE_EPOCH` is set nowhere) and `SHA256SUMS`
  hashes it, so those two differ between any two builds.
- `npm run budget`: the report is identical to main's (below).
- The 18 unit files that import `src/provider/satellites.ts`,
  `datasets.ts` or `data-provider.ts`, `tests/applications.test.ts` and
  `tests/refresh-snapshots.test.ts`: 20 files, 310 of 310.
- The 10 files that read source text (`tests/architecture`, `i18n`,
  `i18n-thai-terms`, `lesson-packs`, `repo-hygiene` and others): 101 of 101.
- Node verification (`node --test tests/verification/*.test.mjs tests/browser/shard.test.mjs`): 98 of 98.
- The full unit suite (`npx vitest run`): 365 files, 10,894 of 10,894
  (started before the script test's last edit, which only renamed the
  index of the query that answers 404; that file passed again on its own).
- After the re-check's changes (below), only: `tests/refresh-snapshots`
  and `satellite-catalogue`, 14 of 14, with `tests/repo-hygiene`, `architecture` and
  `structure-boundary`, 34 of 34 in all; 3 of 3 still fail on main's
  script and helper; `npm run typecheck` and the `--check` above. The
  rest of this list, and the dry run above, were run before them; the
  script's NAPA-only path did not change.
- After the review of those changes, and again after each check of the
  changes made for it (below), only: `tests/refresh-snapshots`,
  `satellite-catalogue`, `fx3-catalogue-load`, `data-provider`,
  `repo-hygiene` and `architecture`, 49 of 49; 3 of 3 still fail on
  main's script and helper, with the messages in the table above; the
  wrong versions above, each caught (twelve after the review, fourteen
  after the first check, fifteen after the second); `npm run typecheck`, the
  `--check` above and `git diff --check`. This round changed only the
  script test and the records.

**Not checked here:**
- CelesTrak's live answers, beyond those saved in the audit on 2026-11-25.
- The browser journeys (CI runs them), and the heavy and six-DOF fleet
  suites. `scripts/refresh-snapshots.ts` falls under no rule of
  `scripts/verification/change-map.json`, so the map selects the full set.
- A real Pages run: the first one after the merge is the script's first
  run against the network.

## Size

| Group | Before | After | Ceiling |
|---|---|---|---|
| `index-*.js` | 2669.3 kB (2,669,324 B) | 2669.3 kB (2,669,324 B) | 2669.5 kB |
| precache code | 15196.9 kB | 15196.9 kB | 15197.0 kB |
| precache data/ (PR CI, committed files) | 1119.2 kB | 1119.2 kB | 1399.0 kB |

Unchanged. After the merge, the Pages job measures a refreshed
`satellites.json` again. On the 2026-11-25 answers that is about
+4.6 kB: about 1,123.8 kB of `data/`, below its 1,126.9 kB baseline.

## Not in this change

- **NAPA-1 marked re-entered (part B).** It changes an existing assertion,
  so it waited for the owner, who approved it on 2026-11-25 (11:56:29Z,
  "เอาตามที่คุณแนะนำครับ") for a follow-up PR (part B), with no date in the sentence. The
  change is `reentered: '2026-11-02'` on NAPA-1 in
  `src/data/thai-satellites.ts`, as NAPA-2 has. It forces three more changes:
  - 46320 and `NAME=NAPA` out of `THAI_NORAD_IDS` and the Thai queries:
    `tests/fx3-thai-moon-labels.test.ts` wants Real satellites to offer
    exactly the ids in that list.
  - NAPA-1's set taken out of the committed `public/data/satellites.json`,
    for the test "has Thailand's seven satellites in orbit".
  - `tests/applications.test.ts` line 218, `toBeUndefined()` changed to
    `toBe('2026-11-02')`.

  Until then:
  - The app shows NAPA-1 as up, with no badge and a "Show in Real
    satellites" button. With the repo's SGP4 (`skyState`, sampled each
    minute), its 2026-09-25 set is 63 to 100 km above the equatorial
    radius on 2026-11-25. SGP4 first gives error 6 at 2026-12-02T07:49Z,
    and at every moment after 2026-12-05T00:05Z. From then the panel says
    "SGP4 cannot place it at this moment: it has decayed — its orbit is
    inside the Earth."
  - The Thai group keeps its 2026-09-26 sets, with a warning in every Pages
    log. THEOS-2's set grows a day older every day. It is the satellite of
    the Watch tour's `theos2` step (`src/orbit/sky-tour.ts:34`), of the
    `theos2` case with its overflights (`src/worksheets/case-ids.ts:42`),
    and of the `fx3-thai-in-sky` journey.
  - THEOS (33396) is in both the Thai and the Earth-imaging groups, so the
    file now holds two epochs for it. A screening keeps the first set it
    meets for each number (`candidates`, `src/orbit/screening.ts:154`), and
    the panel's catalogue lists the stations, then the Thai group
    (`src/ui/orbit/sky-panel.ts:1198`). So screenings against THEOS use the
    Thai group's old set, although imaging holds a new one. In the
    committed file both copies are from 2026-09-26 (11:53Z and 15:16Z).
  - Real satellites' "data as of" line gives the fresh date. Online, the
    `data.partial` note says the Thai group is the bundled data's; offline
    nothing does, and only the per-set epoch and age rows show that its
    sets are older.
- **R7.4** (a failed refresh fails the build; an in-app data-age warning):
  not done. A failed refresh still does not fail the build, and the app
  says nothing new about kept groups. A kept group no longer shows in the
  snapshot's `asOf`: `mergeCelestrakGp` dates the file by the groups
  fetched (2026-11-25T00:15:20.921Z in the dry run, while the Thai sets
  are from 2026-09-25/26), and the file does not record which groups were
  kept; only the `::warning::` line says so. M-ORBIT-040's staleness gate
  (S17 §17.4, red when the satellites' `asOf` is over 3 days old) must
  therefore check each group's newest epoch, or a recorded list of kept
  groups, not `asOf` alone; otherwise it never sees a kept group.
- **`asOf` and the bundled-catalogue test.** `tests/satellite-catalogue.test.ts`,
  which the Pages job runs on the refreshed file, wants `asOf` to be the
  newest set of every group. Dated by the fetched groups only, the file
  would fail it if a kept group ever held the newest set, and nothing
  would publish. That needs a baseline refreshed hours before a run in
  which that group's query answers 404; today's kept Thai sets are older.
  Left as it is.
- **Online, a kept 404 stops CelesTrak for two hours.** `src/provider/data-provider.ts`
  turns any status it kept from an earlier load into a `Refusal`. So a
  second load within two hours of a 404 asks CelesTrak nothing, and five
  groups come from the snapshot. A separate bug; part B removes today's
  trigger.
- **Wording.** These texts go stale once NAPA-1 is shown as down:
  - NAPA-1's about text, "it has sunk to about 310 km", in EN, RU and TH;
  - `sky.about.thai`, which names NAPA-1 among Real satellites' Thai group;
  - the test title "has Thailand's seven satellites in orbit".

  Not changed: the owner's choice.

## Second-agent review

Two second-agent lenses, correctness and protocol, reviewed the first round
on 2026-11-25 (the working tree at `844319e`, nothing committed), running
their own mutants and dry runs. No
blocking finding; 6 minor findings and 11 nits, several of them the same
point twice. This round handles them:

- **The script's 404 path was not tested** (2 minor): a script with the
  original bug passed every test. Fixed by `tests/refresh-snapshots.test.ts`
  (above), which runs the script, in place of the text check. The reviewer's
  other option, more regular expressions on the script's text, was not
  taken: the script test catches the same wrong versions by what they do.
- **A kept group and `asOf`** (2 minor, 1 nit): no code change, as the
  reviewer proposed. Recorded under R7.4 and "`asOf` and the
  bundled-catalogue test" above, and as follow-up 5.
- **The record** (2 minor, 5 nits): run 41731265523's two other failures;
  "fetched at most a day before"; the owner's message time filled in; the
  PROGRESS row's lifecycle written as #230's was, "Merged, waiting for
  publish (PR #…)", without the CI run, head and job count, and the PR
  number left for when the PR exists; what the old Thai sets cost
  (THEOS-2, THEOS); NAPA-1's dates under SGP4; this section.
- **The script's messages** (5 nits): every 404 is named, not only the
  first; nothing found anywhere keeps the file, as online, and names the queries; a body of
  `null` keeps the whole snapshot; a full stop.

NAPA-1's dates differ from a reviewer's (78.8 to 79.8 km on 2026-11-25,
error 6 from about 2026-12-07): the figures above are `skyState`'s, minute
by minute, as the panel draws it.

**The fixed round's re-check.** Independent verifiers in three lenses
(correctness, records, pipeline) re-checked the committed head `2fe311c`
on 2026-11-25, with their own mutants, probes and builds: no blocking
finding; 4 minor findings and 19 nits. Applied in `8876c89`:
- the script: a 404 in every group keeps the file and names each 404
  (it said "Invalid time value"); the header says that no status that is
  not ok is retried;
- the script test: the file's `asOf` on the kept path and a kept group
  that fails the catalogue's check (two wrong versions had passed); the
  temporary folder made only when the tests run (`vitest list`, as CI's
  plan job runs it, left one behind); a `package.json` of
  `"type": "module"` beside the copy; a child stopped after 20 s;
- the record: the first 404 by 22:31Z on 2026-11-03 (the 00:03Z run still
  got NAPA-1's set); "every build published"; "about a day" (scheduled
  runs drift, up to 28.7 h apart); the commit stamp; two first-round
  agents; the PROGRESS row's CI pointer; SGP4's last minute; what online
  names; a malformed answer in a kept group.

Not applied, each for a reason:
- part B itself, NAPA-1 marked re-entered: it changes an existing
  assertion (`tests/applications.test.ts:218`) and wording, so it waited
  for the owner, who approved it on 2026-11-25 for a follow-up PR (part B, above);
  recording the kept groups in the snapshot is R7.4's (follow-up 5);
- a script test that the snapshot is read only when needed: optional.
  The committed snapshot is always there where the script runs, and the
  helper's test checks that it is not read when every query answers;
- `asOf` when a kept group holds the newest set: not reachable today,
  and it fails safe: the Pages snapshot check stops that build
  ("`asOf` and the bundled-catalogue test" above);
- an empty kept group written: not reachable, since the committed file
  is tested to have sets in every group, and the same test in the Pages
  snapshot check would stop such a build; optional.

Three more were about the PR's description and were fixed there. The
re-check's "confirmed N of M" is in PR #234.

**The review of the re-check's changes.** A second agent reviewed
`2fe311c..8876c89` on 2026-11-25: no blocking finding; 3 minor findings
and 4 nits. Applied in this round, and checked by a verifier (below):
- the script test: the stub's sets dated before each committed group's
  newest set (2026-08-01, gnss's 2026-09-01, below), so the `asOf` check
  tells a file dated by the groups fetched from one dated by every group,
  and a 404 in five
  groups, between the one and the six tested (for each, two wrong
  versions had passed); the copy put back to the committed text after
  the second test; its warning check labelled;
- the record: the four findings above not applied, each with its reason;
  "every hashed asset is byte-identical", not every file (made exact by
  the second check, below); the PROGRESS
  row in this report's words.

Its "confirmed N of M" is in PR #234.

**The check of the changes made for that review.** A verifier checked
them on 2026-11-25 (the working tree at `8876c89`, nothing committed):
no blocking finding; 1 minor finding and 2 nits. Applied in this round,
and checked again (below):
- the script test: in the five-group run every query but debris's
  answers 404, eight in five groups, so a nothing-found check counting
  404s against the number of groups fails it; one stub set (debris's then,
  gnss's now) dated after the other sets fetched, so a file dated by the
  oldest set fetched fails the `asOf` check (both wrong versions had passed);
- the record: this check named here, in follow-up 4, in the Thai summary
  and in the PROGRESS row; the same finding's points on PR #234's
  description were fixed there.

**The second check of those changes.** A verifier checked them again on
2026-11-25 (the working tree at `8876c89`): no blocking finding; 1 minor
finding, on PR #234's description, fixed there, and 5 nits, applied: the
newest stub set moved to a middle query (gnss), so a file dated by the
last set fetched fails the `asOf` check (that wrong version had passed);
"every file under `dist/` but `build-info.json` and `SHA256SUMS`", in
English and Thai; the stub's dates and the count of wrong versions
here. The checks made after this one, with their counts, are in PR #234's
description.

## Follow-ups

1. **Mark NAPA-1 re-entered (part B above).** It changes one assertion and
   edits the committed data by hand; the refresh script is not run.
   Alternatively, the owner commits a fresh baseline. Until then THEOS-2's
   set, which the Watch tour, the `theos2` case and `fx3-thai-in-sky` use,
   grows a day older every day, screenings against THEOS use its old Thai
   set, and from 2026-12-05 SGP4 cannot place NAPA-1 at all. Part B removes
   the only 404, and the Thai group refreshes again.
   *Owner:* approved on 2026-11-25 (11:56:29Z, "เอาตามที่คุณแนะนำครับ"),
   for a follow-up PR (part B); the session's order puts it after the GK1
   candidate's Pages run and #233, both now published (2026-11-25, the
   records PR after #234 and #233: "for a follow-up PR" in place of "as the
   next PR", a point of #234's last review).
2. **NAPA-1's texts in EN, RU and TH**, to say that it has come down, as
   NAPA-2's does, but with no date (NAPA-2's reads "came down on 5 July
   2026"), and `sky.about.thai` (2026-11-25, the records PR after #234 and
   #233: worded so, a point of #234's last review).
   *Owner:* decided with part B, in the same answer: no date in the
   sentence (the panel's Status row and badge give 2026-11-02).
3. **The online kept-404 stop.** Only a kept 403 or 429 would count as a
   refusal; `tests/fx3-catalogue-load.test.ts`'s kept-503 case would need
   re-checking.
   *Owner (proposal):* a separate bug fix, after part B.
4. **Second-agent review.** Two second-agent lenses reviewed the first
   round, three verifier lenses re-checked `2fe311c`, a second agent
   reviewed the changes made for the re-check, and a verifier checked
   the changes made for that review, twice (above): nothing blocking;
   the counts of the later checks are in PR #234's description.
   A review is required if the data pipeline counts as storage work
   (D-25). The records use "storage work" for the app's saved data
   ([DECISIONS.md](../../DECISIONS.md), 2026-10-28, K0-13: "R1.6's storage
   work (one more storage write)"), and the plan rates the stale-data item
   M-ORBIT-040 P2.
   *Owner (proposal):* say whether it counts.
5. **Kept groups in the snapshot.** Should the refreshed file record which
   groups it kept, for M-ORBIT-040's gate and for an in-app note (R7.4)?
   *Owner (proposal):* decide with R7.4; nothing in this PR.
