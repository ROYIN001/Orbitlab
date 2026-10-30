# Bug fixes found by the 2026-10-30 open-work audit / แก้บั๊กที่พบจากการตรวจงานค้าง

> **สรุปสำหรับเจ้าของ (ภาษาไทย)**
>
> - ที่มา: คุณสั่งในแชตวันที่ 2026-10-30 ว่า "ส่วนที่ยังทำงานไม่จบให้เริ่มทำได้เลยโดยเช็คสถานะของเว็บในปัจจุบันก่อนเริ่มทำงาน" ผมเช็คเว็บก่อน (เว็บจริง `dcfa065` ตรงกับ main ตอบ 200 ครบ รอบ Pages #200 ที่ล้มเป็นรอบ scheduled ที่ journey `r3-first-launch` หมดเวลา ส่วนรอบ push #199 บน SHA เดียวกันผ่าน จึงสันนิษฐานว่า runner ช้า แต่ยังไม่ได้พิสูจน์) แล้วให้ทีมตรวจ 7 เรื่องที่ค้างโดยมีผู้ตรวจแย้งอิสระต่อเรื่อง ผลคือเรื่องใหญ่ทุกเรื่องต้องรอคุณตัดสินใจ ส่วนที่ลงมือได้เลยคือบั๊กเล็กด้านล่าง คำสั่งของคุณไม่ได้ระบุชื่อ package ใด (D-65) จึงไม่ถือเป็นการอนุญาต package ใดโดยเฉพาะ งานทั้งหมดอยู่บน branch `claude/blissful-gauss-jt4xu8` ไม่มี PR ไม่มีการ merge
> - **1. Onboard แสดงข้อความดิบ `{alphaDeg}`:** มุมมอง Onboard พิมพ์เหตุการณ์ล่าสุดโดยข้ามขั้นแปลพารามิเตอร์ ทำให้เหตุการณ์ "เกินช่วงอากาศพลศาสตร์" ขึ้นเป็น "(α {alphaDeg}°, β {betaDeg}°)" ทั้ง en/ru/th แก้ 2 บรรทัด เทสต์ใหม่ล้มบน main 3 จาก 3 ผ่านหลังแก้
> - **2. ปุ่ม Play/Pause บนแถบควบคุมมือถือ (M-LAUNCH-008):** ป้ายชื่อปุ่มถูกเขียนเฉพาะตอนสัญลักษณ์เปลี่ยน เปลี่ยนภาษาแล้วป้ายค้างภาษาเก่า และบนมือถือจอเตี้ย (เช่น 360×520) ปุ่มที่เริ่มในสถานะหยุดไม่มีชื่อเลย แก้ให้เทียบกับป้ายชื่อโดยตรง ปิดเฉพาะอาการที่ผู้ใช้เห็น การออกแบบ cache ตามแผน S06 CO-4 ข้อ 2 (ไม่เรียก `t()` ไม่อ่าน DOM ทุกเฟรม ซึ่ง S09 EQ-3 พึ่งอยู่) ยังไม่ได้ทำ M-LAUNCH-008 จึงยังเปิดอยู่
> - **3. โฟกัสหลุดเมื่อเลือก notation (ส่วนหนึ่งของ M-LAUNCH-025):** เลือก notation กลางการบิน แผง telemetry ถูกสร้างใหม่ ตัวเลือกที่ใช้อยู่ถูกแทนที่และโฟกัสหลุดไปที่หน้า แก้ให้โฟกัสกลับไปที่ select ใหม่ ผลข้างเคียงที่ต้องรู้: ระหว่างที่ select ถือโฟกัส ปุ่มลัดของการบิน (Space, เลขกล้อง, warp) จะไม่ทำงานจนกว่าจะคลิกที่อื่น เหมือน select ภาษาและ warp อยู่แล้ว ส่วน applyLanguage ที่ทำงานซ้ำและการสร้างแผง setup ที่ซ่อนอยู่ใหม่ ยังเหลือ (ต้องทำ M-PLATFORM-037 4a ก่อนตาม D-63) M-LAUNCH-025 จึงยังเปิดอยู่
> - **4. ผลภารกิจ suborbital กับตารางไม่ตรงกัน (RAAN) — ห้าม merge จนกว่าคุณจะตัดสิน:** ภารกิจ suborbital ที่ขอระนาบวงโคจรแล้วยิงนอกหน้าต่างจบด้วย "Target trajectory reached" ทั้งที่ตารางผลแสดงแถว RAAN คลาด (outcome=target) เพราะ `finishSuborbital` เป็นจุดเดียวที่ตัดสินสุดท้ายโดยข้ามระนาบ แก้ 1 อาร์กิวเมนต์ (ตัวเลือก A) **แต่ผู้ตรวจพบว่าผลกระทบกว้างกว่าที่ผมเขียนไว้ตอนแรก:** ค่าเริ่มต้นของแอปคือ preset ISS (`raanMode: 'iss'`) และการติ๊ก "Suborbital test flight" ไม่ได้รีเซ็ตระนาบ ดังนั้นเส้นทางปกติ "เลือก Starship → ติ๊ก Suborbital → Launch" และสูตร Flight 5 ใน MCP จะบินด้วยระนาบ ISS ที่ผู้ใช้ไม่ได้เลือก ถ้าแก้แบบ A อย่างเดียว เที่ยวบินเหล่านี้จะจบด้วย "off target" แทบทุกเวลายิง (เดิมจบ "Target reached") ผมจึง**ไม่แนะนำ A อย่างเดียวแล้ว แนะนำ D** (A + รีเซ็ตระนาบที่ติดมาจาก preset เมื่อติ๊ก suborbital และเมื่อ MCP ส่ง `suborbital: true` โดยไม่ระบุ raanMode) ซึ่งเป็นการเปลี่ยนผลิตภัณฑ์เล็กน้อยที่ต้องให้คุณอนุญาต รายละเอียดอยู่หัวข้อ 4
> - งบ bundle: ทั้งห้า commit รวมกัน index-*.js 2,634,812 → 2,634,873 B (เหลือ 127 B ก่อนถึงเพดาน 2635.0 kB) precache code 14653.6 → 14653.5 kB (เพดาน 14654.0) ไม่ขึ้นเพดานใด ไม่มีข้อความใหม่
> - ผู้ตรวจอิสระ (agent ตัวที่สอง) อ่านทุก commit แล้ว: ไม่มี commit ใดมีข้อบกพร่องที่ขวางการใช้งาน ข้อสังเกตทั้งหมดอยู่ในหัวข้อ "Second-agent review"
> - ชุด unit ทั้งหมดผ่าน (338 ไฟล์ / 10,552 เทสต์) journey ที่เกี่ยวข้องผ่าน แต่ **ยังไม่ได้รัน** heavy ทั้งชุดกับ six-DOF fleet (รันเฉพาะ `starship-flight5` ผ่าน) และ CI ยังไม่ได้รันเพราะยังไม่มี PR
> - เรื่องที่ต้องการคำตอบจากคุณอยู่หัวข้อ "Questions for the owner" ท้ายไฟล์ และข้อความ CHANGELOG/PROGRESS ที่พร้อมแยกเป็น fragment ต่อ PR อยู่ในภาคผนวก

```yaml
items:
  - onboard callout shows {alphaDeg}: bug fix, no registry row; found while retaking the home pictures
  - M-LAUNCH-008 (registry.tsv:80 open; assignment.tsv:80 P1, XS): the label part only
  - M-LAUNCH-025 (registry.tsv:83 open; assignment.tsv:83 P1, M): the focus part only
  - suborbital RAAN verdict against the result table: bug fix, no registry row (GK1-handoffs.md K1-44 'NO OWNER, propose P', on unmerged #182)
change_kind: 'bug fix (wrong → right) x4, one commit each; no ceiling raised; no existing assertion changed; plus one script-only commit'
owner_authorization: 'owner in chat, 2026-10-30: "ส่วนที่ยังทำงานไม่จบให้เริ่มทำได้เลยโดยเช็คสถานะของเว็บในปัจจุบันก่อนเริ่มทำงาน" ("start the unfinished parts right away, checking the website''s current state first"). It names no package, so it is not a D-65 authorization of any of these; they are prepared on a branch and not merged. HANDOVER-K1.md:155 lists M-LAUNCH-008 and 025 as open P1 bugs that may merge under the standing approval if they stay under the ceilings'
base: {sha: dcfa065, date: 2026-10-30}
branch: claude/blissful-gauss-jt4xu8
commits: {onboard: 1ce0195a, M-LAUNCH-008: bd46ac85, M-LAUNCH-025-focus: 6fb61946, suborbital-raan: 2b9e28ad, shots-script: 39a0f3d5}
```

## How the work was chosen

The owner's instruction was to start the unfinished parts after checking the live site. The site was healthy: live build `dcfa065` = main, every probed URL 200. The one red scheduled Pages run (#200, on 1842a86) failed in journey `r3-first-launch` (189.9 s against its 120 s end-card wait); push run 199 on the same SHA passed, and later runs 201 and 202 passed it. The slow-runner cause is inferred from the diagnostics, not proved.

Seven open-work items were then investigated read-only, each by an investigator and an independent skeptic (14 agents, no repository edits). All seven came back "needs the owner": the logo and preview pictures (D-65; wait for #184), R1.6 PR5 (order, KPI-13 definition, WIP cap), the Argon4 re-baseline (parked by the owner), graphics realism (budget and D-65), audio-upgrade and radio phase 2 (no package, budget), branch clean-up (only the owner can delete), and the P1/P2 mismatches below. The fixes here are the parts of that list that need no new feature, fit inside the ceilings and overlap no open PR: none of the 15 open PRs touches `src/physics/sim/ascent.ts`, `syncMobileFlightBar`, `notationControl`, `src/ui/onboard.ts` or `result-content.ts` (checked against every head by the skeptic and again by the critic).

## 1. Onboard callout (1ce0195a)

`src/ui/onboard.ts` printed the last flight event with `t(last.key, last.params)`. The timeline, narration, event log, report and worksheets all pass the params through `localizeEventParams` (src/ui/names.ts), which also builds `alphaDeg` and `betaDeg` for `evt.aeroEnvelopeExceeded` from the event's angle pair. So the Onboard view showed "(α {alphaDeg}°, β {betaDeg}°)". Found by the picture retake: the Explore home picture showed the Onboard camera with that text. A grep of `src/` found no other event print that skips `localizeEventParams`.

Fix: `t(last.key, localizeEventParams(sim.vehicleSpec, last.params))`. It also hides params an open lesson withholds (`withholdEventParams`), as everywhere else.

Test: `tests/onboard-event-line.test.ts` draws the overlay on a recording canvas (Node has no 2-D canvas) and reads back the text. On main: 3 of 3 fail (en, ru, th: `{alphaDeg}` in the line). With the fix: 3 of 3 pass.

Known gap (nit, not a regression): the callout's cache is keyed on the event and the language, but `localizeEventParams` also reads the notation preference and the withheld set, so a notation change within the 12 s the line is shown leaves a stale line (the yaw sign under GOST). Before the fix the line ignored notation altogether. Left for a follow-up: a key with the notation costs bytes, and headroom is thin.

## 2. M-LAUNCH-008, the label (bd46ac85)

`syncMobileFlightBar` wrote the play button's `aria-label` and `title` only when its glyph changed. `index.html` ships the button as "▶" with no name, and "paused" is also "▶". Measured on a build of main: the paused label stays "Play" after switching to th, and the running label stays Thai after switching to ru. The unnamed first frame is reachable without a script on a short phone viewport (360×520), where the bar becomes active only after the flight is paused and the page scrolled (probe: label `null`, title empty on main; "Play" with the fix). At 390×844 the bar is active from launch and is named at once, so only the language half shows there. The commit message says "a bar that starts paused was never named" without that qualifier.

Fix (about 4 lines): the guard is the label itself (`getAttribute('aria-label') !== label`), and glyph, title and label are written together when it differs. `#mfb-play` has one writer.

Not done: the plan's cached design (S06 CO-4 step 2: outside the language-change frame, no `t()` and no DOM read, shown by a counter), which S09 EQ-3 on #183 depends on. This fix calls `t()` and `getAttribute` each frame, as `t('tl.live')` already does in the same function. So M-LAUNCH-008 stays open for that part.

Test: `tests/browser/journeys/r2-phone-bar-name.mjs` (phone viewport; resets the button to its shipped state; paused and running in en, th, ru). On main: 6 checks fail. With the fix it passes (3 of 3 runs by the author, 4 of 4 by the reviewer). It uses `press()`, not a plain click (flaky on software WebGL). Each check waits up to 5 s (a reviewer saw 1.1 s worst case on a loaded machine).

## 3. M-LAUNCH-025, the focus (6fb61946)

Choosing a notation calls `setNotationPreference`, which fans out synchronously to `app.applyLanguage()`; `tel.build()` calls `replaceChildren()`, so the select in use is replaced and the focus falls to the page. Fix (one handler): after the change, focus the rebuilt `.notation-section select` (the only such element in the app; `notationControl` has one caller).

Side effect to know: while a select has the focus, the app's key handler ignores the flight shortcuts (Space, camera digits, warp keys; `main.ts` typing guard). Before the fix the focus fell to the page, so they worked at once, mouse users included; now they stay off until the user clicks or tabs away. The language and warp selects already behave this way. Only Chromium was tested; screen-reader re-announcement and native pickers on iOS and Firefox are untested.

Not done: the fan-out (`applyLanguage` twice on an automatic notation change en→ru and ru→th, and the hidden setup panel rebuilt): D-63 puts M-PLATFORM-037 4a (identical-output) first, and HANDOVER-K1.md:154 puts P1 bugs first; the two statements conflict. M-LAUNCH-025 stays open.

Test: `tests/browser/journeys/r2-notation-focus.mjs`. On main: 2 checks fail (focus on the page after GOST and after ISO). With the fix: passes (3 of 3 runs by the author and by the reviewer). The existing `r2-flight-shell` (which asserts "the notation selector works mid-flight") and `r2-shell-smoke` pass with the fix (290.8 s and 50.8 s).

## 4. Suborbital RAAN (2b9e28ad): HOLD, awaiting the owner

`finishSuborbital` (src/physics/sim/ascent.ts) judged the cut-off with `orbitResiduals(plan.target, el, raanWasReachable())`. Every other final acceptance passes `true`: `reachTargetOrbit` (burns.ts), the result table (`result-content.ts`) and the autotuner's final check (`flyToTarget`; `runAscent` is a diagnostic and keeps the default). `mission.ts` and `simulation.ts` say in comments that final acceptance never skips a requested constraint. Only checks inside the flight that decide when to cut off or whether another burn is worth flying pass `raanWasReachable()`, because no burn rotates the plane.

Reproduced on main with Mercury-Redstone 3 and `raanMode: 'fixed'` 120° off the window, and with `iss` (−132.4°): verdict `evt.suborbitalTarget` ("Target trajectory reached"), table `outcome: target`, RAAN row off by 120° or more with `outside: false`. With the change: `evt.suborbitalOffTarget`, table `offTarget`, cause `window`, only the RAAN row flagged. The table's own outcome comes from the event key, so the mismatch is a label that disagrees with a number, not two gradings.

**Who reaches it (wider than the commit message says).** The app's default mission is the ISS preset (`raanMode: 'iss'`). Picking Starship and ticking "Suborbital test flight" sets only perigee and apogee (panel.ts `suborbitalOption`) and keeps the preset's plane, in Engineer and in Explore (which has no RAAN control). The Flight 5 `configure_mission` recipe in the WebMCP schema text (src/mcp.ts:691) does the same. Choosing SSO leaves `ltan`. So the ordinary path flies a plane the user never asked for. The RAAN window is about ±6 min a day (1.5° tolerance), so an ordinary launch time is nearly always off-window. Built-in flights are not affected: every Watch, lesson, assessment and fleet suborbital flight uses `raanMode: 'free'`, where `orbitResiduals` ignores the plane. A saved mission with a plane re-simulates to a new verdict; no stored verdict disagrees with a re-simulation.

**What A alone does to that default path** (probes by the reviewers, point-mass and six-DOF, on this commit): the ordinary Starship suborbital flight and the Flight 5 recipe end "off target, cause window" at the app's own suggested window and at +6 h, where main ended "Target trajectory reached" at any time but the window. Two defects that exist on main explain why even the "in-window" launch fails:
- Starship Flight 5 geometry (26.2° from Starbase, near-tangent to the site latitude): the flown RAAN stays about 15.6° from `raanExpected`, so the plane is reached only about +52 to +67 min after the window the panel offers, where the panel says "outside the launch window". Mechanism not verified. At 28.5°, 35° and 51.6° a window-aligned launch passes (−0.35°, −0.24°, −0.18°).
- `launchWindows` (src/physics/mission.ts) ignores `OrbitSpec.descending`, so MR-3's "next window" is 43.9° off the plane the sim flies (MR-3 sets `descending: true`; reachable only by copying the Watch mission into Engineer and choosing a RAAN mode).
Neither is caused by this commit and neither is reachable from a built-in flight, but both decide how usable option A is.

Strings: the off-target verdict line has no plane clause (as `evt.offTargetOrbit` has none), so a plane-only miss reads "off target" with every printed number on target; the result card's headline for it reads "Orbit reached, target missed", wrong for a lob (pre-existing strings). A clause is a wording choice with 9 B of i18n room.

Test: `tests/suborbital-plane.test.ts` (4 cases, MR-3 with a fixed plane): 2 of 4 fail on main (verdict `evt.suborbitalTarget` where `evt.suborbitalOffTarget` is expected), 4 of 4 pass with the fix; it flies MR-3 five times in about 0.6 s. It does not cover `iss`, `ltan`, Starship or an inherited-plane case. Nine existing files plus the new test (10 files, 122 tests) pass; so do `mcp`, `mission-file`, `live-stepping`, `config-validation`, `d06-satellite-spec` and `flown` (6 files, 213 tests) and the heavy `starship-flight5` (the only heavy file that flies a suborbital target; six-DOF, free plane; 224 s). `finishSuborbital` has one caller and no fleet row reaches it. Not run: the other 32 heavy files and the six-DOF fleet suite (the change map selects them for `ascent.ts`; none should move).

`docs/PHYSICS.md` ("Acceptance") said the opposite ("graded only when the launch was made into a window that could reach the target plane"). That contradicts the orbit path too, so the paragraph is rewritten. `docs/USER-GUIDE.md:984-989` still says an off-window launch "just costs a plane-change burn at apogee" (wrong for orbits already; not touched).

## Script-only commit (39a0f3d5)

`scripts/shots.ts`: the Explore home picture picks the exterior camera before the shot (the cinematic camera chose the onboard view at T+5:00). Run for `explore en`, and by a reviewer for `explore ru,th`: exterior view, the Soyuz in flight, no raw placeholder (the English picture is in the scratchpad, not in the repo). `scripts/` is outside `tsc` (tsconfig includes only `src` and `tests`), so the only checks are a parse (`node --experimental-strip-types --check`) and a look at the picture; the change map treats `scripts/shots.ts` as "unknown impact" and selects every check.

The pictures themselves are **not** retaken: their content last changed 2026-09-27 (branch history; they reached main with #120 on 2026-10-09), before the A1 logo of 2026-10-01, so all 16 show the old mark and top bar. #184 changes the Soyuz models and the retake needs the owner's go-ahead (D-65, a look change). Still true of the new Explore picture: an amber "aerodynamic range exceeded" line is the latest event at T+5:00, which the owner may not want in a public picture. No bundle change (`public/home/` and `public/social/` are on demand).

## Second-agent review

Six read-only reviewers (one per commit, two for the physics commit) tried to refute each commit; a seventh checked their findings, this report and the protocol. Everything was run in scratch worktrees; the repository was not touched.

| commit | verdict | what was found |
|---|---|---|
| 1ce0195a onboard | sound, nits | no blocking issue; the fix and the 3 of 3 fail/pass reproduced; no import cycle; callout cache ignores notation (stale up to 12 s, not a regression); the test does not guard the vehicle argument (a stage name that translates would); no other unlocalized event print in `src/` |
| bd46ac85 M-LAUNCH-008 | sound, nits | no breaking input; one writer of `#mfb-play`; unnamed first frame reproduced natively at 360×520 on main and fixed; journey 4 of 4; wait raised to 5 s; ru wording "Воспроизведение" is existing |
| 6fb61946 M-LAUNCH-025 | sound, nits | `notationControl` has one caller, `.notation-section` is unique, rebuild is synchronous, no focus theft or second rebuild in keyboard and auto-notation probes; unconditional `.focus()` would steal focus from a script-dispatched change event only; flight shortcuts stay off while the select has focus |
| 2b9e28ad RAAN, code | sound, 2 pre-existing defects | no input judged wrongly (units, wrap, free plane unchanged); the two defects above (`launchWindows` and `descending`; Flight 5 offset) |
| 2b9e28ad RAAN, reach | sound, report corrected | the default path reaches the changed verdict (now stated); the owner options missed the hybrid D; USER-GUIDE and the MCP recipe text need a line |
| 39a0f3d5 shots | sound, nits | `explore ru,th` run and viewed; no automated check possible; amber event line and wall-clock date in the Orbit picture are content questions |
| critic | — | re-verified the budget per commit, the fail/pass of both unit tests, `starship-flight5`; split test (each commit applies and builds alone on main, disjoint files); corrected this report (budget attribution, citations, the fragment layout) |

Per-commit budget, bytes in `index-*.js` on a clean build of dcfa065 (2,634,812 B, 188 B under the 2,635,000 B ceiling): 1ce0195a +18, bd46ac85 +5, 6fb61946 +63, 2b9e28ad −25; all together 2,634,873 B (127 B left). Precache code 14653.6 → 14653.5 kB. Each commit alone and all together print `bundle budget: ok`; i18n, css, lesson-file and other chunks are unchanged.

## Checks run

| check | result |
|---|---|
| `npx tsc --noEmit -p .` | clean (covers `src` and `tests` only) |
| new tests against main | `onboard-event-line` 3/3 fail; `suborbital-plane` 2/4 fail; `r2-phone-bar-name` 6 checks fail; `r2-notation-focus` 2 checks fail |
| new tests with the fixes | all pass; each journey 3 of 3 runs (author) and 3 to 4 of 4 (reviewers) |
| `r2-flight-shell`, `r2-shell-smoke` | pass |
| `npx vitest run` (all) | 338 files, 10,552 tests pass (run on 39a0f3d5 plus the records commit; hygiene, privacy-inventory and architecture re-run on e391d5a1) |
| `node --test tests/verification/*.test.mjs tests/browser/shard.test.mjs` | 93/93 (critic) |
| bundle budget | ok, numbers above |
| heavy | `starship-flight5` passes; the other 32 files **not run** |
| six-DOF fleet | **not run** |
| CI | none: the branch has no PR, and no workflow ran on it. Heavy suites have a `workflow_dispatch` trigger (`suite: both`); not dispatched, because the RAAN direction is undecided |

## Questions for the owner

1. **RAAN: which way?** (needed before 2b9e28ad can merge)
   - **A:** the verdict grades the requested plane, as for orbits (this commit). On its own it turns the ordinary Starship suborbital path and the Flight 5 recipe into "off target" at almost any time.
   - B: keep the verdict, stop grading the plane off-window. Collides with `tests/mission-result.test.ts:93-100` (which pins an off-window RAAN as "window"), contradicts the orbit path, and reports a plane miss as "Target reached".
   - C: force `raanMode: 'free'` for suborbital everywhere, including a plane the user explicitly asked for in Engineer, MCP or a file. That silently discards an explicit request; acceptable only if it rejects instead.
   - **D (recommended):** A, plus reset an inherited plane to `free` when the suborbital option is ticked (panel) and when MCP gets `suborbital: true` with no `raanMode` and no `orbitId`. An explicit plane is still graded. The tick already rewrites perigee and apogee to Flight 5's path, so a leftover preset plane is not something the user chose. A few lines in `panel.ts` and `mcp.ts` plus tests; a product change, so it needs your word. Even with D, a requested plane on the Flight 5 geometry passes only about an hour after the window the panel shows, until that offset is understood.
2. **RAAN owner and package:** a lane-P row and authorization (D-65), or fold it into an FX-5 follow-up, or leave it a known limitation? Separate tickets for `launchWindows` ignoring `descending` and for the Flight 5 offset?
3. **M-LAUNCH-008:** accept this label fix as closing the visible bug with the item left open for the cached design (recommended), or require the cached design in one PR (about 127 B left in the index chunk, may need a D-38 raise), or wait for K2 EQ-3?
4. **M-LAUNCH-025:** the focus fix now (this commit) with the fan-out left for 4a then 4b (and the shortcut side effect accepted), or follow the plan order only?
5. **PR slots and the merge hold:** does the hold H2 (recorded in unmerged #182; main has since taken #185, #187 and #193 on your chat approvals) still stand? S18 §18.6 allows 1 open PR per lane, 1 I-owned PR (CO-4 owns both 008 and 025) and 5 code PRs project-wide, and 11 are open, so the PRs here would be opened one at a time. Each commit is one PR (one change type each) with its own fragment (text in the appendix). Which first? Suggested order: onboard (no plan item, no owner question), then 008, then 025, then the shots script; RAAN waits for question 1.

## What each commit needs before it is a PR

| commit | standing approval (SESSION-PROTOCOL §1 step 3) | still needed |
|---|---|---|
| 1ce0195a onboard | applies (existing bug, failing-first test, no ceiling raise, no changed assertion) | CI green on the PR head; a free PR slot; fragment; PR body per the template |
| bd46ac85 008 | applies | the same, plus this review as "confirmed N of M" in the PR report (P1); the PR must say the item stays open |
| 6fb61946 025 | applies, if the owner accepts the order (question 4) | the same, plus the shortcut side effect in the PR body |
| 2b9e28ad RAAN | **does not apply**: physics, a changed verdict, the direction is the owner's | the ruling; registry row; the 33 heavy and 6 fleet files in CI; the physics second-agent review as "confirmed N of M" |
| 39a0f3d5 shots | does not apply (tooling, no failing-first test possible) | the owner's button; full CI selection |

## Not touched, for the record

The items the audit found that wait for the owner are in the session's chat report and not repeated here: the 16 stale pictures, R1.6 PR5, R4.2-RB, graphics, audio, branch clean-up. Follow-ups found on the way and not done: `launchWindows` ignoring `descending`; the Flight 5 plane offset; the onboard callout's cache key; the suborbital off-target headline on the result card; `docs/USER-GUIDE.md:984-989`, the MCP recipe text and `setup.suborbitalNote`, which say nothing about a preset's plane carrying into the suborbital option; `lesson-mode.ts:891` prints a raw criterion key (not checked as reachable). Stale records that belong to the integration session's records PRs: `registry.tsv:86` and `assignment.tsv:86` still say M-LAUNCH-032 is open although #172 fixed it; four `changes/` fragments on main are not folded yet.

## Appendix: fragment text, one per PR

Each PR takes its own lines and a file named after its own branch (`changes/<branch with / replaced by ->.md`); the state text is "In PR #N" while open and changes at merge.

**Onboard**

```markdown
## CHANGELOG

- Onboard (bug fix): the callout under the instruments prints the last flight event through `localizeEventParams`, as the timeline, narration and event log do; before, the aerodynamic-range event read "(α {alphaDeg}°, β {betaDeg}°)" in the onboard view, in every language.

## PROGRESS

| Onboard callout resolves the event's params (bug fix; found while retaking the home pictures) | In PR #N; not merged; not published | `src/ui/onboard.ts` passes the event through `localizeEventParams(sim.vehicleSpec, …)`. Failing first: tests/onboard-event-line.test.ts, 3 of 3 (en, ru, th) fail on main, pass with the fix. Bundle budget ok (index +18 B, precache code unchanged; no ceiling raised). | [report](reports/blissful-gauss-bug-fixes.md) |
```

**M-LAUNCH-008, label part**

```markdown
## CHANGELOG

- Launch (bug fix, M-LAUNCH-008, label part): the phone flight bar's play/pause button always carries the name of what it does in the language in force; before, its label was written only when the glyph changed, so a language change left the old language's label and, on a short phone, a bar that was paused when it appeared was never named. The cached-write design of the plan's step 2 is not done; the item stays open.

## PROGRESS

| M-LAUNCH-008 label (bug fix; the cached design of S06 CO-4 step 2 not done, item stays open) | In PR #N; not merged; not published | `syncMobileFlightBar` guards the write on the label instead of the glyph. Failing first: tests/browser/journeys/r2-phone-bar-name.mjs, 6 checks fail on main, pass; r2-flight-shell and r2-shell-smoke pass. Bundle budget ok (index +5 B; no ceiling raised). Second-agent review: no blocking finding. | [report](reports/blissful-gauss-bug-fixes.md) |
```

**M-LAUNCH-025, focus part**

```markdown
## CHANGELOG

- Telemetry (bug fix, M-LAUNCH-025, focus part): choosing a notation mid-flight keeps the keyboard focus on the notation select; before, the panel's rebuild replaced the select and the focus fell to the page. Flight shortcuts (Space, camera digits, warp keys) now stay off while the select has the focus, as for the language and warp selects. The fan-out part (`applyLanguage` twice, the hidden setup panel rebuilt) is not done; the item stays open.

## PROGRESS

| M-LAUNCH-025 focus (bug fix; the fan-out part stays open behind M-PLATFORM-037 4a) | In PR #N; not merged; not published | The notation select's change handler focuses the rebuilt select. Failing first: tests/browser/journeys/r2-notation-focus.mjs, 2 checks fail on main, pass; r2-flight-shell and r2-shell-smoke pass. Bundle budget ok (index +63 B; no ceiling raised). Second-agent review: no blocking finding. | [report](reports/blissful-gauss-bug-fixes.md) |
```

**Suborbital RAAN (only after the owner's ruling; the text assumes option D)**

```markdown
## CHANGELOG

- Suborbital (bug fix, physics): a suborbital flight's final verdict grades a plane it was asked for, as an orbit's does; before, a mission with `raanMode` fixed, iss or ltan launched off-window ended "Target trajectory reached" while its result table showed the plane out. The suborbital option no longer inherits the preset's plane. docs/PHYSICS.md's Acceptance paragraph is rewritten to match the code.

## PROGRESS

| Suborbital RAAN verdict against the result table (bug fix, physics; owner's ruling D) | In PR #N; not merged; not published | `finishSuborbital` passes `checkRaan = true` like every other final acceptance; the suborbital option and MCP reset an inherited plane. Failing first: tests/suborbital-plane.test.ts. Not run until the PR: heavy (33), six-DOF fleet (6), the physics second-agent review. | [report](reports/blissful-gauss-bug-fixes.md) |
```
