# R1 integration / รายงานรวมและส่งต่องาน

วันที่: 2026-10-03 UTC. ฐาน main: `523b44eca0e31fd84fd4a3faa4e1b883428288ee`. Branch: `codex/r1-profiles-foundations`.

สถานะปัจจุบัน: **R1 และงานเล็กที่ระบุส่งมอบแล้ว** ผ่าน [PR71](https://github.com/ROYIN001/Orbitlab/pull/71) และ [PR72](https://github.com/ROYIN001/Orbitlab/pull/72). [Pages 37103651001](https://github.com/ROYIN001/Orbitlab/actions/runs/37103651001) ตรวจ source `472645fd57062c79d50c567028de220145006861` ครบและเผยแพร่ [เว็บไซต์](https://royin001.github.io/Orbitlab/) ที่ 2026-10-03T06:55:10Z; deployment ID `6824494621`. การแก้ test wait อยู่ใน [navigation follow-up](R1-release-navigation.md). อ่าน [PROGRESS.md](../PROGRESS.md) และรายงานรายแพ็กเกจก่อนเริ่มงานต่อ; R2–R7 ส่วนอื่นยังเป็นแผน.

## ขอบเขตที่ผู้ใช้อนุญาตและสิ่งที่ส่งมอบ

| งาน | ผลลัพธ์และรายงาน |
|---|---|
| R1.1 / U01 | หลายโปรไฟล์ในเครื่อง แยกงานทั้งหมดของผู้เรียน ย้ายข้อมูลเดิมโดยเก็บ raw bytes รีเซ็ตแยกการเรียน/ผลสอบ สำรอง JSON และไฟล์เสียงแยก; [storage](R1.1-storage.md) |
| R1.2 / U01 | เมนูผู้เรียนและชื่อผู้เรียนทั่วหน้าการเรียน/สอบ สร้าง–เปลี่ยนชื่อ–สลับ–ลบ reset/backup/import พร้อมยืนยันขอบเขต; [UI](R1.2-profiles-ui.md) |
| R1.3 / U07 | เลื่อนเนื้อหาด้วยเมาส์/สัมผัส/คีย์บอร์ดตามเจ้าของพื้นผิว ไม่ส่ง input ไปกล้องที่ถูกหน้าอื่นบัง; [gestures](R1.3-gestures.md) |
| R1.4 / U06,U15 | จำกัด main/RCS impulse และ torque ตาม fuel lifetime จริงใน step, coast หลัง fuel-out, ไม่อ้าง burn สำเร็จเมื่อ impulse ยังไม่ครบ; [fuel](R1.4-fuel.md) |
| R1.5 / U13 | discovery/union ของ tests, source/runtime/snapshot/dist identity, Pages gates ขนานและ publisher guard; [workflow](R1.5-workflows.md), [verification guide](../VERIFICATION.md) |
| งานเล็ก U08/U09/U16 | เอาปุ่มรีเซ็ตกล้องที่ผู้ใช้ระบุออก ซ่อนตัวเลือกตามภาษาแต่คง implicit default/explicit override และระบุ percentage ว่า command ทั้ง full/compact HUD/onboard; [small UI](R1-small-ui.md) |

แผนหลัก [PLAN.md](../PLAN.md) เวอร์ชัน 1.2 บันทึก authorization ใหม่. [ดาวน์โหลด Word ที่ตรวจแล้ว](https://raw.githubusercontent.com/ROYIN001/Orbitlab/f2d7e4804b7b6664b63b8cceb8bb4d0c1842e802/docs/development/PLAN.docx) เป็นสำเนาสาธารณะเดิมที่ตรึง commit; current main ไม่มี tracked DOCX ตาม repository policy. ดาวน์โหลดจริงแบบไม่ใช้ authentication ตรงกับต้นฉบับ **83,293 bytes**, SHA-256 `c15a3550627c2fa9d6d79341a748a22cbd75e7cb1ca86875a4b217609979768d`; Markdown SHA-256 `b37252efdb27fe62e6fcd031c2cfc7aaf4b847ad192a298ddf05033ae52d63dc`. DOCX ตรวจ OOXML/zip และ U01–U16 / A01–A05 ครบ R0–R7 แล้ว แต่ไม่ได้ render ด้วย Microsoft Word. การ upload Release asset รอบแรกได้ HTTP 403; รอบหลังเผยแพร่เว็บไซต์ได้ HTTP 400 Bad Content-Length แม้ระบุขนาด 83,293 bytes ตรงไฟล์. ใช้ลิงก์สำเนาที่ดาวน์โหลดและตรวจจริงเป็น handoff; ไม่มี Release asset ที่เผยแพร่จากงานนี้ และลบ empty drafts ทั้งสองแล้ว.

## สัญญาที่คนรับช่วงต้องรักษา

- Workspace ผูก profile ID + epoch แบบคงที่ต่อหนึ่ง document. ใช้ Web Lock ต่อ owner สำหรับ durable write; catalogue มี lock แยก. ไม่อ้างว่า unlocked localStorage read/modify/write เป็น transaction.
- สลับ/รีเซ็ต/import ที่เปลี่ยน owner ต้องบันทึกงานค้างสำเร็จก่อน seal แล้ว reload; ล้าง query/hash ของผู้เรียนเดิม. หาก quota/save ล้มเหลวต้องอยู่ owner เดิม. ไม่ได้เพิ่ม live-flight resume.
- เปิดหลายแท็บ owner เดียวกันเป็น read-only; คนละ owner ทำงานพร้อมกันได้. ไม่มี Web Locks/พื้นที่เก็บข้อมูลเป็น temporary ที่ระบุชัดและไม่เขียน durable แบบปลด lock. ยังส่งออก readable JSON เพื่อกู้ข้อมูลได้.
- ไม่เขียน fallback ทับ opaque/future primary เพียงเพราะเปิดดู สำรอง หรือสลับ. การแก้ไขจริงเก็บ raw recovery ตาม adapter; external malformed/future/recovery import เก็บ inert quarantine และ preview เตือน ไม่ activate rollback ที่มากับไฟล์.
- JSON 8 MB ระบุชัดว่าไม่รวมเสียง; เสียงเป็น bounded binary archive แยก. JSON/IndexedDB ไม่ใช่ transaction เดียว; deletion มี tombstone/startup recovery.
- ไม่ลด physics tolerance ไม่เปลี่ยน golden ไม่ลบ tests เพื่อให้ผ่าน. หลักฐาน named heavy R1.4 ไม่เท่ากับ full heavy inventory/fleet scientific acceptance.
- เมนูโปรไฟล์/strict archive/media management โหลดเมื่อจำเป็น; dictionary/catalog split เป็นการจัดกลุ่มไฟล์ ไม่ใช่หลักฐานว่า startup เร็วขึ้น. เพดาน bundle ที่เปลี่ยนต้องมีเหตุผลใน budgets.json.

## Acceptance / หลักฐาน

| Gate | Historical local evidence and final remote acceptance |
|---|---|
| Source review / contracts | storage, UI, gesture, fuel และ workflow ตรวจข้ามเจ้าของแล้ว; pending-only untouched-draft preservation รวมครบแล้ว |
| Storage/media/bootstrap/numeric | focused suites ผ่านตาม R1.1 รวม actual satellite pending/future cases; complete PR CI และ final Pages ผ่านแล้วตามหลักฐานด้านล่าง |
| Learning save quota / opaque progress | 2 regression tests ผ่าน; quota blocks switch, retry saves A then opens B; untouched future primary ไม่ถูกเขียนทับ |
| Gesture production browser | corrected-source journey ผ่าน / 30.3 s; wheel +450 px บน 6 surfaces พร้อม keyboard/touch/hidden camera checks และ actual #gl draws 612→0→612 เมื่อเปิด/ปิด opaque lessons |
| Profile two-tab/temporary/offline | corrected-source local production journey ผ่าน / 163.805 s; actual two windows, no Web Locks, untouched future drafts, first offline lazy dialog |
| Profile UI / JSON / binary ownership | original final local UI journey ผ่าน / 317.6 s; profile lifecycle/reset/JSON/binary audio ownership; legacy project backup journey ผ่านบน corrected source / 137.860 s; complete current-source CI และ final Pages ผ่านแล้ว |
| Workspace navigation / screenshots | corrected-source production journey ผ่าน / 83.610 s; Thai desktop/mobile screenshots, lazy failure/reload recovery and first open offline |
| Notation production browser | ผ่าน EN/RU/TH defaults, explicit override และ reload; complete PR CI และ final Pages ผ่านแล้วตามหลักฐานด้านล่าง |
| Fuel/runtime/session/replay/named heavy | 124 selected tests ผ่านหลัง conditional basis repair: 4 unchanged goldens + 87 focused + 10 named heavy + 23 session/replay; hashes สุดท้ายตรวจตรงกับ R1.4 report แล้ว |
| Verification infrastructure | 59 Node checks ผ่านรวม repo-hygiene preflight และ bounded metadata notices; actionlint ทั้ง 4 workflows ผ่าน |
| Type/build/budget | corrected application source `npm run build` และ budget พร้อม build-log guard ผ่าน; 69 files precached, manifest `0880ee57146283`; committed candidate / remote dist ต้องตรวจแยก |
| PR / required CI / merge | PR #71 merged หลัง CI 37099583981 ผ่านครบ 10,079 unit cases / 18 smoke journeys |
| Historical first Pages | Run 37100771200 ล้มเฉพาะ project-backups implicit navigation wait; publisher skipped ตามกฎ |
| PR72 / final Pages | CI 37102480388 ผ่าน 10,079 units / 18 smoke journeys ก่อน merge; Pages 37103651001 ผ่าน 10,079 units / 20 full journeys ก่อนเผยแพร่ exact source `472645fd57062c79d50c567028de220145006861` |

Initial CI failure evidence (historical run 37096708399): tracked DOCX violated existing hygiene; three removed DOM dependencies left stale exemptions; unconditional attitude-basis reconstruction changed normal-flight arithmetic and four historical fingerprints; browser profile-session-safety/project-backups/workspace-navigation exceeded step deadlines. Corrections were verified before PR71 merged; no golden rewrite, test omission or policy exception was used. Artifact blob downloads returned storage 403, so annotations/job metadata establish those initial failures but raw union counts, dist digest and CI Chromium version are not independently claimed for that historical run.

Policy correction verified locally: `npm test -- tests/repo-hygiene.test.ts tests/architecture.test.ts` **2 files / 15 tests passed** (3.64 s). Removed exactly the obsolete `dom:config/mission-file.ts`, `dom:design/design-store.ts` and `dom:provider/data-mode.ts` exemptions after confirming their persistence now goes through workspaceStorage; the remaining two exemptions and all architecture guards are unchanged. Preflight retains all existing tests in the default inventory. `node --test tests/verification/*.test.mjs tests/browser/shard.test.mjs` **53 passed / 0 skipped** after preflight correction; final metadata-notice source then passed **59/59**, with all four workflows passing actionlint.

Measured small rendering correction: the opaque lesson catalogue covered the launch canvas but `sceneCovered` omitted lesson-page state. Chromium **151.0.7922.173**, DPR **0.5**, submitted **2,790 #gl draw calls in 5.007 s** while lesson descendants were topmost; fonts were loaded and no external-font links were present. The viewport itself remained display:block/visible, so this was page occlusion rather than a hidden-canvas-size claim. Adding the existing lesson-page state to `sceneCovered` suppresses only covered rendering/gestures; physics/frame advancement is unchanged. This is not evidence that it caused all three CI deadlines. Corrected production build/budget passed with manifest `0880ee57146283`; production gesture journey **passed / 30.3 s**, requiring actual four-frame WebGL draw counts **612 visible → 0 covered → 612 resumed** alongside all earlier gesture checks.

Corrected affected browser batch: **3/3 passed** on manifest `0880ee57146283`, actual launched Chromium **151.0.7922.173**, Node **22.23.3**, render scale **0.5**. Profile-session-safety **163.805 s**, project-backups **137.860 s**, workspace-navigation **83.610 s**. Phase changes wait for DOMContentLoaded and existing app-ready state; screenshots disable CSS animation while retaining font readiness and visible UI capture. All original assertions, click deadlines, required journeys and backup actions remain. Project-backups' exact initial timeout selector was unavailable behind artifact/log storage 403 and was not reproduced locally; no unsupported cause or forced-click fix is claimed. Failure diagnostics now record bounded document/font/request/canvas state, and annotations retain the escaped full selector/action log/stack.

## GitHub acceptance and release identities

Corrected candidate `0fff61e47dc1afea735a9e1624153f4f6f2fa135` passed [PR CI 37099583981](https://github.com/ROYIN001/Orbitlab/actions/runs/37099583981), attempt 1, on synthetic PR checkout `893386211fd48a9d14119453186c583d53bb74aa`. Its source inventory matches the frozen candidate: **1,039 files**, SHA-256 `184ae552d57f374c5f338f2807a433871638f0aecf3aeb86bed341c8e90f7f3b`. Final metadata notice reports `ok=true`, **10,079/10,079 unit cases** and **18/18 smoke journeys**; missing/unexpected/duplicate/nonpassing are all zero. Actual remote Chromium **153.0.8010.12**, distinct from local **151.0.7922.173**. CI dist manifest SHA-256 `398ba7a77648f784df2bd2ac51a526e5f68560c0546b80fbd7a8f915e67c7247`. All required PR jobs passed before normal squash merge; no admin override was used.

[First Pages run 37100771200](https://github.com/ROYIN001/Orbitlab/actions/runs/37100771200), attempt 1, tested exact merged source `5eb18a27fbf579159e3351545216c801b26c7df5` with the same inventory hash. Refresh/validation/build/budget, typecheck and all units passed. Full coverage was **20/20 unique journeys**, no missing/unexpected/duplicate cases, but `project-backups` was nonpassing: the click finished, then Playwright's implicit scheduled-navigation barrier timed out. Final aggregate failed and publisher was skipped; **no deployment was created for this SHA**. Actual Chromium **153.0.8010.12**; refreshed dist SHA-256 `7f51ef68846babbbf476062f0b80c42292b5f44e567224e13ee7bf6a5b69f441` is a failed-release artifact, not a published one.

Evidence above was read from GitHub run/job/check-annotation APIs. One bounded final metadata notice provides the verified union/digest/version facts without claiming raw Azure artifacts were downloaded. Full source/runtime/refreshed-snapshot/dist guards ran inside workflows; signed artifact/log downloads from this environment still return storage HTTP 403. Local and CI/release dist hashes differ because build stamps and refreshed data differ; they are not claimed to be byte-identical.

See [release-navigation follow-up](R1-release-navigation.md) for the concrete correction, verified PR72 CI and final publication evidence. All publication status must come from a successful exact-source Pages run and deployment record, not this initial failed run or PR success alone.

## ขนาดไฟล์และข้อจำกัดด้านประสิทธิภาพ

Final local corrected-application checkpoint (manifest `0880ee57146283`): initial index **2572.9 kB**, CSS **166.2 kB**, offline precache **15729.9 kB** อยู่ใต้เพดานเดิมของ precache **15783 kB**. Index allowance เปลี่ยน **2572→2573 kB (+1 kB)** สำหรับ ownership/bootstrap/pending-only checks; shared catalog ที่ Rolldown แยกเป็น i18n/lesson-file/catalog ถูกนับแยกทุกไฟล์ ไม่มีไฟล์หายจาก budget. ปรับ lazy-feature ceilings ตามเหตุผลใน `budgets.json`; combined JS+other allowance เพิ่ม **19.5 kB (0.20%)**, worker ทุกตัวใช้เพดานเดิม.

การเพิ่ม profile functionality มีต้นทุน code; ไม่อ้างว่า startup bytes หรือ workflow เร็วขึ้นจากการจัดกลุ่ม chunk. เมนู/backup/strict import/media ownership management โหลดเมื่อจำเป็นและอยู่ใน offline precache. ต้องเก็บ 3–5 comparable workflow runs ก่อนสรุปการลดเวลา.

## งานระยะถัดไปที่ยังไม่ทำ

R2–R7 ส่วนอื่นยังเป็นแผน. เริ่มต่อจาก [PLAN.md](../PLAN.md) และรายงานรายแพ็กเกจ; ห้ามทำ R1 ซ้ำเพราะเห็น requirement เดิมในแผน. โดยเฉพาะ Engineer layout/live lifecycle, Watch CameraPolicy, preview ของยาน, cross-mode mission handoffs, actual per-engine telemetry/Max-Q programme validation, fleet realism, high-fidelity docking และ cockpit ยังไม่ได้เสร็จเพียงเพราะ R1 ผ่าน.

Local profiles เป็นการแยกงานใน browser ไม่ใช่บัญชีออนไลน์หรือ access control. ฟิสิกส์ rendezvous ยังใช้ estimated fixed inertia และ equivalent RCS torque arm ตามรายงาน R1.4; ไม่อ้าง hardware-perfect docking หรือความถูกต้องทุกสภาวะจาก green tests.

## Final exact-source publication / การเผยแพร่สุดท้าย

[PR72](https://github.com/ROYIN001/Orbitlab/pull/72) candidate `544a86ed5e09c457beaed6f4a1753611cbc26d58` passed [CI 37102480388](https://github.com/ROYIN001/Orbitlab/actions/runs/37102480388), attempt 1, on synthetic PR checkout `ab8703133b44d5389c61f5f888c5b8888aec37be`. All nine jobs passed; final notice: **10,079/10,079 unit cases / 18/18 smoke journeys**, all missing/unexpected/duplicate/nonpassing zero. CI dist manifest SHA-256 `b37704c1bc3877a527b3945262b8727c06699a37f67f003875e05b2a3775b3b6`. Normal squash merge at `472645fd57062c79d50c567028de220145006861` on 2026-10-03 06:36:59 UTC. The canceled same-head push run was superseded by this complete pull-request run; no admin override or acceptance-gate waiver was used.

[Final Pages 37103651001](https://github.com/ROYIN001/Orbitlab/actions/runs/37103651001), push / attempt 1, succeeded on exact merged source `472645fd57062c79d50c567028de220145006861`. Source inventory SHA-256 **`5eed56619df39d022bf633db5be253b43308a98864c10a36b12154fbcacfbb47`**, **1,039 files**, matches the frozen PR72 candidate independently of the historical PR71 inventory. **10,079/10,079 unit cases / 20/20 full journeys** passed, all missing/unexpected/duplicate/nonpassing zero. Actual launched remote Chromium **153.0.8010.12**; Node **22.23.3** is pinned by the workflows (local actual Node/V8 were separately recorded). All required jobs passed, including refreshed snapshot validation, build/budget, final union, publisher rehash/provenance and current-main-tip guard. The same refreshed artifact tested by full browser gates was published; it was not replaced with the PR artifact.

Published dist manifest SHA-256 **`8b1188bb4564a7f079c0783ae9497933aaafdd2d2a4648b32a96e8e966c4e1d0`**. GitHub deployment **`6824494621`**, environment `github-pages`, records source `472645fd57062c79d50c567028de220145006861`, state **success**, time **2026-10-03T06:55:10Z**, URL **https://royin001.github.io/Orbitlab/**. Exact source remained main's tip through publication. These facts come from GitHub API run/job/check metadata and deployment status; they do not claim raw Azure artifacts were downloaded. Direct production HTTP/build-info verification is recorded separately below if available.

The final report-only follow-up is unconsumed Markdown and intentionally does not trigger numerical/browser/redeployment gates. Website About/build info continues to show application commit **`472645f`** even when main advances for reports. PLAN.md v1.2 and its verified Word copy are unchanged; package reports now identify delivered scope and preserve their historical local evidence. The entire heavy/fleet programme and R2–R7 remain outside this completed release.

Production HTTP check: `https://royin001.github.io/Orbitlab/build-info.json` returned **200** with commit **`472645f`**, built at **2026-10-03T06:38:32.355Z**, matching the deployed application. Snapshot stamps: space weather `2026-10-03T03:00:00.000Z`, satellites `2026-10-03T00:05:01.692Z`, Earth orientation `2026-10-01T00:00:00Z`. This is a direct served build-info check; browser journeys tested the same published artifact in CI, not a repeated live-site browser run.
