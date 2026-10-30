# Four bug fixes found by the 2026-10-30 open-work audit / แก้บั๊ก 4 ข้อที่พบจากการตรวจงานค้าง

> **สรุปสำหรับเจ้าของ (ภาษาไทย)**
>
> - ที่มา: คุณสั่งในแชตวันที่ 2026-10-30 ว่า "ส่วนที่ยังทำงานไม่จบให้เริ่มทำได้เลยโดยเช็คสถานะของเว็บในปัจจุบันก่อนเริ่มทำงาน" ผมเช็คเว็บก่อน (เว็บจริงคือ `dcfa065` ตรงกับ main ตอบ 200 ครบ รอบ Pages #200 ที่ล้มเป็นเพราะ runner ช้า ไม่ใช่บั๊กของโปรแกรม) แล้วให้ทีมตรวจ 7 เรื่องที่ค้างโดยมีผู้ตรวจแย้งอิสระต่อเรื่อง ผลคือเรื่องใหญ่ทุกเรื่องต้องรอคุณตัดสินใจ ส่วนที่ลงมือได้เลยคือบั๊กเล็กสี่ข้อด้านล่าง คำสั่งของคุณไม่ได้ระบุชื่อ package ใด (D-65) จึงไม่ถือเป็นการอนุญาต package ใดโดยเฉพาะ งานทั้งหมดอยู่บน branch `claude/blissful-gauss-jt4xu8` ไม่มี PR ไม่มีการ merge
> - **1. Onboard แสดงข้อความดิบ `{alphaDeg}`:** มุมมอง Onboard พิมพ์เหตุการณ์ล่าสุดโดยข้ามขั้นแปลพารามิเตอร์ ทำให้เหตุการณ์ "เกินช่วงอากาศพลศาสตร์" ขึ้นเป็น "(α {alphaDeg}°, β {betaDeg}°)" ทั้ง en/ru/th แก้ 2 บรรทัด เทสต์ใหม่ล้มบน main 3 จาก 3 ผ่านหลังแก้
> - **2. ปุ่ม Play/Pause บนแถบควบคุมมือถือ (M-LAUNCH-008):** ป้ายชื่อปุ่มถูกเขียนเฉพาะตอนสัญลักษณ์เปลี่ยน ทำให้เปลี่ยนภาษาแล้วป้ายค้างภาษาเก่า (หยุดอยู่แต่ขึ้น "Play" หลังเปลี่ยนเป็นไทย) และปุ่มที่เริ่มในสถานะหยุดไม่มีชื่อเลย แก้ให้เทียบกับป้ายชื่อโดยตรง จุดเดียว 4 บรรทัด ปิดเฉพาะอาการที่ผู้ใช้เห็น ส่วนการออกแบบ cache ตามแผน S06 CO-4 ข้อ 2 (ไม่เรียก `t()` และไม่อ่าน DOM ทุกเฟรม ซึ่ง S09 EQ-3 พึ่งอยู่) ยังไม่ได้ทำ M-LAUNCH-008 จึงยังเปิดอยู่
> - **3. โฟกัสหลุดเมื่อเลือก notation (ส่วนหนึ่งของ M-LAUNCH-025):** เลือก notation กลางการบิน แผง telemetry ถูกสร้างใหม่ select ที่ใช้อยู่ถูกแทนที่และโฟกัสหลุดไปที่หน้า (คนใช้คีย์บอร์ดหรือ screen reader เสียตำแหน่ง) แก้ 1 บรรทัดให้โฟกัสกลับไปที่ select ใหม่ ส่วน applyLanguage ที่ทำงานซ้ำและการสร้างแผง setup ที่ซ่อนอยู่ใหม่ ยังเหลือ ต้องทำ M-PLATFORM-037 4a ก่อน (D-63) M-LAUNCH-025 จึงยังเปิดอยู่
> - **4. ผลภารกิจ suborbital กับตารางไม่ตรงกัน (RAAN) — รอคุณตัดสินว่าฝั่งไหนถูก:** ภารกิจ suborbital ที่ขอระนาบวงโคจร (raanMode fixed/iss/ltan) แล้วยิงนอกหน้าต่าง จบด้วย "Target trajectory reached" ทั้งที่ตารางผลของมันเองแสดงแถว RAAN คลาด 120° (outcome=target) สาเหตุคือ `finishSuborbital` เป็นจุดเดียวที่ตัดสินสุดท้ายโดยข้ามระนาบถ้าอยู่นอกหน้าต่าง ทุกที่อื่นตัดสินโดยนับระนาบเสมอ แก้ 1 อาร์กิวเมนต์ + เขียนย่อหน้า Acceptance ใน PHYSICS.md ใหม่ (ย่อหน้าเดิมขัดกับโค้ดของเส้นทาง orbit ด้วย) เที่ยวบินในตัวทั้งหมด (Watch, บทเรียน, fleet) ใช้ระนาบอิสระ จึงไม่เปลี่ยน แต่ภารกิจที่ผู้ใช้บันทึกไว้อาจเปลี่ยนผลเมื่อบินซ้ำ ยังไม่ได้รัน heavy กับ six-DOF fleet และยังไม่มี registry row (GK1-handoffs K1-44 "NO OWNER") **commit นี้ห้าม merge จนกว่าคุณจะเลือก A/B/C ด้านล่าง**
> - งบ bundle: index-*.js 2634.8 → 2634.9 kB (เพดาน 2635.0) precache code 14653.6 → 14653.5 kB (เพดาน 14654.0) กลุ่มอื่นไม่เปลี่ยน ไม่ขึ้นเพดานใด i18n ไม่เปลี่ยน (ไม่มีข้อความใหม่)
> - ยังไม่ครบเงื่อนไขอนุมัติถาวรสำหรับการแก้บั๊ก (SESSION-PROTOCOL §1 ข้อ 3): CI ยังไม่ได้รันบน PR, ผู้ตรวจ agent ตัวที่สองและผลของมันอยู่ในหัวข้อ "Second-agent review" ด้านล่าง, M-LAUNCH-008 และ 025 ยังเปิดอยู่บางส่วน

```yaml
items:
  - onboard callout shows {alphaDeg}: bug fix, no registry row; found while retaking the home pictures
  - M-LAUNCH-008 (registry.tsv:80, open, P1, XS): the label part only
  - M-LAUNCH-025 (registry.tsv:83, open, P1, M): the focus part only
  - suborbital RAAN verdict against the result table: bug fix, no registry row (docs/development/reports/GK1-handoffs.md K1-44 'NO OWNER, propose P' on unmerged #182)
change_kind: 'bug fix (wrong → right) x4, one commit each; no ceiling raised; no existing assertion changed; plus one script-only commit'
owner_authorization: 'owner in chat, 2026-10-30: "ส่วนที่ยังทำงานไม่จบให้เริ่มทำได้เลยโดยเช็คสถานะของเว็บในปัจจุบันก่อนเริ่มทำงาน" ("start the unfinished parts right away, checking the website''s current state first"). It names no package, so it is not a D-65 authorization of any of these; they are bug fixes prepared on a branch, not merged'
base: {sha: dcfa065, date: 2026-10-30}
branch: claude/blissful-gauss-jt4xu8
commits: {onboard: 1ce0195a, M-LAUNCH-008: bd46ac85, M-LAUNCH-025-focus: 6fb61946, suborbital-raan: 2b9e28ad, shots-script: 39a0f3d5}
```

## How the work was chosen

The owner's instruction was to start the unfinished parts after checking the live site. The site was healthy (live build `dcfa065` = main; every probed URL 200; the one red scheduled Pages run, #200 on 1842a86, failed in journey `r3-first-launch` on a slow runner and push run 199 on the same SHA passed 37 of 37). Seven open-work items were then investigated read-only, each by an investigator and an independent skeptic (14 agents, no repository edits). All seven came back "needs the owner": the logo/preview pictures (D-65, wait for #184), R1.6 PR5 (order and KPI-13 definition), the Argon4 re-baseline (parked by the owner), graphics realism (budget and D-65), audio-upgrade and radio phase 2 (no package, budget), branch clean-up (the owner deletes), and the three P1/P2 mismatches below. The four fixes here are the parts of that list that need no new feature, fit inside the ceilings and overlap no open PR: none of the 15 open PRs touches `src/physics/sim/ascent.ts`, `syncMobileFlightBar`, `notationControl`, `src/ui/onboard.ts` or `result-content.ts` (checked by the skeptic against every head).

## 1. Onboard callout (1ce0195a)

`src/ui/onboard.ts` printed the last flight event with `t(last.key, last.params)`. The timeline, the narration, the event log, the report and the worksheets all pass the params through `localizeEventParams` (src/ui/names.ts), which also builds `alphaDeg` and `betaDeg` for `evt.aeroEnvelopeExceeded` from the event's angle pair. So the Onboard view showed "(α {alphaDeg}°, β {betaDeg}°)". It was found by the picture retake: the Explore home picture showed the Onboard camera with that text.

Fix: `t(last.key, localizeEventParams(sim.vehicleSpec, last.params))`. Also hides params that an open lesson withholds (`withholdEventParams`), as everywhere else.

Test: `tests/onboard-event-line.test.ts` draws the overlay on a recording canvas (Node has no 2-D canvas) and reads back the text. On main: 3 of 3 fail (en, ru, th: `{alphaDeg}` in the line). With the fix: 3 of 3 pass, and the line carries the figures `aeroAngles` gives.

## 2. M-LAUNCH-008, the label (bd46ac85)

`syncMobileFlightBar` wrote the play button's `aria-label` and `title` only when its glyph changed. `index.html` ships the button as "▶" with no name, and "paused" is also "▶", so a bar that starts paused was never named; and a language change with the glyph unchanged left the old language's label. Measured on a build of main: paused label stays "Play" after switching to th; running label stays Thai after switching to ru.

Fix (4 lines): the guard is the label itself (`getAttribute('aria-label') !== label`), and the glyph, title and label are written together when it differs.

Not done: the plan's cached design (S06 CO-4 step 2: outside the language-change frame, no `t()` and no DOM read, shown by a counter), which S09 EQ-3 on #183 depends on. This fix calls `t()` and `getAttribute` each frame, as `t('tl.live')` already does. So M-LAUNCH-008 stays open for that part. Options for the owner are in the questions below.

Test: `tests/browser/journeys/r2-phone-bar-name.mjs` (phone viewport; resets the button to its shipped state; paused and running in en, th, ru). On main: 6 checks fail. With the fix: passes 3 of 3 runs. It uses `press()`, not a plain click, which was flaky on software WebGL.

## 3. M-LAUNCH-025, the focus (6fb61946)

Choosing a notation calls `setNotationPreference`, which fans out to `app.applyLanguage()`; `tel.build()` calls `replaceChildren()`, so the select in use is replaced and the focus falls to the page. Fix (1 line): after the change, focus the rebuilt `.notation-section select`.

Not done: the fan-out (`applyLanguage` twice on an automatic notation change en→ru and ru→th, and the hidden setup panel rebuilt): D-63 puts M-PLATFORM-037 4a (identical-output) first, and HANDOVER-K1.md:154 puts P1 bugs first; the two statements conflict. M-LAUNCH-025 stays open.

Test: `tests/browser/journeys/r2-notation-focus.mjs`. On main: 2 checks fail (focus on BODY after GOST and after ISO). With the fix: passes 3 of 3 runs. The existing `r2-flight-shell` (which asserts "the notation selector works mid-flight") and `r2-shell-smoke` pass with the fix (290.8 s and 50.8 s).

## 4. Suborbital RAAN (2b9e28ad): awaiting the owner

`finishSuborbital` (src/physics/sim/ascent.ts) judged the cut-off with `orbitResiduals(plan.target, el, raanWasReachable())`. Every other final acceptance passes `true`: `reachTargetOrbit` (burns.ts), the result table (`result-content.ts`), the autotuner; and `mission.ts` and `simulation.ts` say in comments that final acceptance never skips a requested constraint. Only the checks inside the flight that decide whether a correction burn is worth planning pass `raanWasReachable()`, because no burn rotates the plane.

Reproduced on main with Mercury-Redstone 3 and `raanMode: 'fixed'` 120° off the window, and (skeptic) with `raanMode: 'iss'`: verdict `evt.suborbitalTarget` ("Target trajectory reached"), table `outcome: target`, RAAN row delta −120.5° (−132.4° for `iss`) with `outside: false`. With the change: `evt.suborbitalOffTarget`, table `offTarget`, cause `window`, only the RAAN row flagged.

Who reaches it: the Engineer RAAN select with the suborbital option; **also Explore, which has no RAAN control**, because the suborbital option keeps the preset's `raanMode` (the ISS preset is `iss`, SSO is `ltan`; src/ui/panel.ts `suborbitalOption`); WebMCP `configure_mission`; mission files. No built-in flight reaches it: every Watch, lesson and fleet suborbital flight uses `raanMode: 'free'`, where `orbitResiduals` ignores the plane (so the change is byte-identical for them).

`docs/PHYSICS.md` ("Acceptance") said the opposite ("graded only when the launch was made into a window that could reach the target plane"). That contradicts the orbit path too, so the paragraph is rewritten to say what the code does.

Test: `tests/suborbital-plane.test.ts` (4 cases): 2 of 4 fail on main (verdict `evt.suborbitalTarget` where `evt.suborbitalOffTarget` is expected), 4 of 4 pass with the fix. `target-plane`, `fx5-031-judged-params`, `mission-result`, `mission-result-view`, `panel-verdict`, `ship-descent`, `historical-vehicles`, `watch-logic` and `onboard-event-line` pass with it (10 files, 122 tests).

Not done: heavy and six-DOF fleet runs (SESSION-PROTOCOL rule 7 and the change map select them for `ascent.ts`; the fleet flights should be unchanged since none is a suborbital mission with a plane), the second-agent physics review (D-25), a registry row (K1-44 'NO OWNER').

Effect on stored work: a saved suborbital mission with a requested plane and an off-window launch time changes its verdict when flown again (`evt.suborbitalTarget` → `evt.suborbitalOffTarget`). The off-target text has no plane clause (as `evt.offTargetOrbit`), so the table carries the explanation; adding a clause is a wording choice and needs strings in three languages with 9 B of i18n room.

## Script-only commit (39a0f3d5)

`scripts/shots.ts`: the Explore home picture picks the exterior camera before the shot (the cinematic camera chose the onboard view at T+5:00). Run for `explore en` and the picture looked at: exterior view, the Soyuz in flight, no raw placeholder. The pictures themselves are **not** retaken here: they show the old logo and top bar and are stale (all 16 last committed 2026-09-27, before the logo of 2026-10-01), but #184 changes the Soyuz models and the retake needs the owner's go-ahead (D-65, look change). No bundle change (`public/home/` and `public/social/` are on demand).

## Budget

`npx vite build && node scripts/bundle-budget.mjs` on the five commits together, against main (dcfa065):

| group | main | here | ceiling |
|---|---|---|---|
| index-*.js | 2634.8 | 2634.9 | 2635.0 |
| precache code | 14653.6 | 14653.5 | 14654.0 |
| tune.worker | 542.7 | 542.6 | 561.0 |
| i18n, css, lesson-file, other chunks | unchanged | unchanged | unchanged |

No ceiling raised, no offset needed; 0.1 kB is left in the index chunk, so merge order against #184 and #195 (which raise the same ceilings) matters.

## Checks run

| check | result |
|---|---|
| `npx tsc --noEmit -p .` | clean |
| new tests against main | `onboard-event-line` 3/3 fail; `suborbital-plane` 2/4 fail; `r2-phone-bar-name` 6 checks fail; `r2-notation-focus` 2 checks fail |
| new tests with the fixes | all pass; the two journeys 3 of 3 runs each |
| related unit tests | 10 files, 122 tests pass |
| `r2-flight-shell`, `r2-shell-smoke` | pass |
| bundle budget | ok, numbers above |
| `npx vitest run` (all) | see "Full run" below |
| heavy, six-DOF fleet | **not run** |
| CI on the branch | see "CI" below |

## Questions for the owner

1. **RAAN: which side is right** (needed before this commit can merge)?
   - **A (recommended):** the verdict grades the requested plane, as for orbits; this commit. Off-window suborbital flights end "off target", cause `window`.
   - B: keep the verdict, change the table not to grade the plane off-window. Contradicts the orbit path and `tests/target-plane.test.ts`, and reports a 120° plane miss as "Target reached".
   - C: a suborbital arc has no plane: force `raanMode: 'free'` when the suborbital option is on (as every Watch preset does) and in MCP and mission files. A product change; keeps every verdict as it is and removes the mismatch at the source.
2. **RAAN owner and package:** a lane-P row and authorization (D-65), or fold it into an FX-5 follow-up, or leave it a known limitation?
3. **M-LAUNCH-008:** accept this label fix as closing the visible bug with the item left open for the cached design (recommended), or require the cached design in one PR (about 0.1 kB left in the index chunk, may need a D-38 raise), or wait for K2 EQ-3?
4. **M-LAUNCH-025:** the focus fix now (this commit) with the fan-out left for 4a then 4b, or follow the plan order only?
5. **Does the merge hold H2 still stand** (recorded in unmerged #182; main has since taken #185, #187 and #193 on your chat approvals), and may a draft of these be opened as PRs while 11 code PRs are open (the 5-PR cap, S18 §18.6)? These are in one branch; if you want PRs, each commit is one PR (one change type each), with its own fragment.

## Not touched, for the record

The items the audit found that wait for the owner are in the session's report and not repeated here: the 16 stale pictures, R1.6 PR5, R4.2-RB, graphics, audio, branch clean-up. The records that are stale (`registry.tsv:86` and `assignment.tsv:86` still say M-LAUNCH-032 is open although #172 fixed it; four `changes/` fragments on main not yet folded) belong to the integration session's records PRs.
