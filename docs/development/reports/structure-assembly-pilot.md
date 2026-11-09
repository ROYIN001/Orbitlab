# Structure & Assembly pilot / รุ่นนำร่องหมวด "โครงสร้างและการประกอบ"

> **สถานะปัจจุบัน (บันทึกเดียวที่เป็นปัจจุบัน — แก้ที่นี่ทุกครั้งที่สถานะเปลี่ยน)**
>
> - สาขา: `claude/trusting-cannon-oah00c` · ฐาน: `main` @ `3e1b48a` (2026-11-07, "Records: fold #214") · commit ของงานนี้: ดู §12
> - ช่วงงาน 1–5 ทำครบ: ตรวจซอร์ซ → viewer/ทางเข้า → ประกอบตามแบบ → แบบทดลองดาวเทียม → ส่งต่อ Orbit/Launch, ตรวจในเบราว์เซอร์จริง
> - **ยังไม่ push / merge / เผยแพร่** ตามคำสั่งเจ้าของ (2026-11-09) งานอยู่ใน commit ในเครื่องคลาวด์เท่านั้น
> - ผู้ทำงาน: Claude (ไม่ใช่ GPT-6.1 Sol) · ผู้ตรวจทาน: เอเจนต์ Claude แยกบริบท (ไม่ใช่ GPT-6 Astra ซึ่งเรียกจากที่นี่ไม่ได้) — §9
> - **รอเจ้าของตัดสิน:** (1) งบขนาดตาม D-38: รวมในชุดหลักแบบตอนนี้ หรือโหลดแยกเมื่อเปิดหมวด (วัดไว้ทั้งสองแบบ §8) (2) ขนาด PR เกินแนวทาง D-25 (§10) (3) ส่งชุดส่งมอบ Soyuz 2 พ.ย. มาให้เทียบ (§1)
> - ผลตรวจทานรอบแรก (เอเจนต์ Claude): 15 ข้อ แก้แล้ว 13 ข้อ เหลือ 1 ข้อรอเจ้าของ (งบขนาด) และ 1 ข้อแก้ได้บางส่วน (ค่ามวล CDS Rev. 14.1 ยังไม่ได้ตรวจจากต้นฉบับ) — §9.1 สำเนาอ้างอิง EO-STO-1 กลับเป็นของเดิมทุกไบต์แล้วตามกฎ q04 B
>
> **สรุปสำหรับเจ้าของ (ภาษาไทย)**
>
> - เพิ่มหมวดที่ 4 "โครงสร้าง" ในแถบบน เปิดด้วยลิงก์ตรง `#/structure/<ระดับ>/<โมเดล>` เช่น `#/structure/explore/soyuz-st31` หรือ `#/structure/explore/edusat` ใช้ระดับ พื้นฐาน/ทดลอง/วิศวกร ของ Orbitlab เป็นระดับความลึก เปลี่ยนระดับแล้วชิ้นที่เลือก แบบ และความคืบหน้าคงอยู่
> - **Soyuz-2.1b/Fregat ST31** มาจากหน้า Anatomy ของคุณใน repo (รุ่น `family-v1-20261026`) ครบ 2,069 ชิ้นพร้อมรหัสเดิม คำอธิบาย ข้อมูล และแหล่งอ้างอิงภาษาไทยของหน้า แบ่งไฟล์เป็นเปลือกนอก/ภายใน/เครื่องยนต์ โหลดเฉพาะเมื่อใช้ เลือกชิ้นได้ทั้งจากภาพและรายการ ผ่าซีกตามครึ่งที่หน้าแบ่งไว้ ทำเปลือกโปร่ง แยกชิ้น เปิดหัวครอบ ซ่อน/แสดงเฉพาะ คืนสภาพ ระบายสีตามชนิดชิ้นส่วนหรือสถานะข้อมูล ประกอบชุดหลัก 11 ชุดตามแบบ (ลำดับ ตำแหน่ง ทิศทาง) มีถอด ย้อนกลับ เริ่มใหม่ และตรวจความครบจากความสัมพันธ์ ไม่เปิดให้ดัดแปลงจรวด
> - **EduSat-3U** ดาวเทียมแนว CubeSat ที่สร้างเพื่อการศึกษา (ระบุชัดว่าไม่ใช่ OneWeb) ประกอบได้ 13 ชุด แล้วสร้าง "แบบทดลองของฉัน" ได้ทันทีโดยไม่ต้องผ่านบทเรียน เปลี่ยนแบตเตอรี่ (1 หรือ 2 เซลล์) และกล้อง (กลางวัน/แสงไฟกลางคืน) ภาพ รายการ มวล และสมดุลพลังงาน 3 รอบวงโคจรเปลี่ยนจากข้อมูลชุดเดียวกัน กรณีตัวอย่าง: กล้องกลางคืน + แบต 1 เซลล์ → ไฟไม่พอ 10.9 นาทีต่อรอบ, + แบต 2 เซลล์ → ผ่านแต่หนักขึ้น 60 g
> - ส่งแบบทดลองไป **Orbit** ได้จริง (ใช้ `designHandoff` เดิม) และไป **Launch** เป็นสถานการณ์สมมติบน Soyuz-2.1b/Fregat จาก Vostochny (ใช้ `designMissionDocument` เดิม และผ่านการตรวจก่อนบินแบบเดียวกับปุ่มของส่วนสร้าง) ก่อนส่งแสดงค่าที่จะส่ง/ไม่ส่ง หลังส่งอ่านค่ากลับจากปลายทางเอง (มวล วงโคจร ความเอียง) แล้วเทียบกับที่ส่ง เช่น 2.070 kg, 500 × 500 km, 97.4° ตรงกัน ถ้าแก้แบบหลังส่งจะขึ้นเตือน ถ้าส่งไม่ได้จะบอกเหตุผลข้างปุ่ม
> - ตรวจแล้ว: ชุดทดสอบใหม่ 42 ข้อ, ชุดทดสอบเดิมที่เกี่ยวข้องผ่าน, browser journey ผ่านครบเส้นทางทั้งเดสก์ท็อปและจอมือถือแบบสัมผัส (รายละเอียด §6) **ค่าที่ยังไม่ผ่าน:** งบขนาดแอป (§8) ซึ่งต้องให้คุณอนุมัติตาม D-38

```yaml
package: none in the plan (owner's request in chat, 2026-11-09)
item: a Structure & Assembly section — explore, assemble and modify (educational satellite only)
change_kind: feature (new section, render, UI, storage key, PWA on-demand files); physics unchanged
owner_authorization: 'owner in chat, 2026-11-09: "ฉันต้องการให้คุณเริ่มพัฒนาส่วน “โครงสร้างและการประกอบ” ใน Orbitlab ตามข้อกำหนดต่อไปนี้ ให้ทำจนได้รุ่นนำร่องที่ใช้งานจริง ตรวจสอบแล้ว และเปิดให้ฉันทดลองในเครื่องได้" … "ยังไม่อนุญาตให้ push, merge หรือเผยแพร่ขึ้นเว็บจริง"'
branch: claude/trusting-cannon-oah00c
base: 3e1b48a961c5d79b8dbd68e0471878567c10c748
budget: owner's decision (D-38) — as built index-*.js +176.0 kB, index-*.css +7.9 kB, i18n-*.js +1.1 kB, precache code +186.7 kB over their ceilings; a lazy-loaded variant measured (§8); no ceiling raised
merge: not requested (owner: no push, no merge)
```

## 1. Sources checked at the start (2026-11-09)

| What | Where | Found | Used |
| --- | --- | --- | --- |
| Default branch | `origin/main` | `3e1b48a` (2026-11-07) | base of this branch |
| Soyuz-2.1b/Fregat ST31 model in the web | `public/anatomy/soyuz-2-1b-fregat-st31.html` (4,550,173 B, SHA-256 `b63220e1…9393bf4c`) | build `family-v1-20261026`, app `soyuz-family-20261026`, 2,069 parts, scene `cd6b3f3f…` | yes: the one source of geometry and Thai content |
| Owner's delivery of 2026-11-02 `Soyuz_Family_Engine_Interior_20261102` | owner's computer, `C:/Users/Royin/.codex/.chatgpt-projects/…` | **not reachable** from this cloud session: the "Anatomy" Remote Control folder on FalconX001 is listed but not served to cloud sessions (it is under the hidden `.codex` folder) | no — the comparison asked for (units, axes, part ids, pivots, mechanisms between the web model and the newest delivery) is **not done** |
| Older integration kit `Soyuz_OrbitLab_Integration_Kit` (2026-10-28) | same | not reachable | no |
| Saturn V/Apollo `components.json` | same | not reachable | no (the data layout follows the page's own) |
| Anatomy `sources/` (read only) | same | not reachable; nothing was read, moved or written there | — |
| Web pages of the EduSat sources | nasa.gov, azurspace.com | blocked by this session's network (search results only) | figures cross-checked through search results and Orbitlab's own cited values (§4.3) |

To compare with the 2026-11-02 delivery: put a copy in a folder outside the hidden `.codex` folder and share it through Remote Control, or add the page to the repository; `npm run structure` then rebuilds the section's files from it, and `tests/structure-model.test.ts` checks the ids, units and assemblies against it.

## 2. What was built

| Area | Files | What it does |
| --- | --- | --- |
| Model files | `scripts/structure-meshes.mjs` → `public/structure/soyuz-2-1b-fregat-st31.{json,outer.bin,inner.bin,engine.bin}` | Runs the page's own mesher (as `scripts/anatomy-meshes.mjs` does). Keeps every part's page id; each vertex carries its part's index so merged meshes still pick and assemble per part; three layers (outer 257,460 triangles, 472 kB; inner 117,240, 287 kB; engine 258,716, 647 kB; gzip) fetched only when needed; content JSON 547 kB (59 kB gzip on the wire). Units m, +Y up (page z), +X page x, +Z page −y — the flight's exterior meshes' convention. Each file records the page's SHA-256. |
| Pure core | `src/structure/{types,assembly,soyuz,soyuz-content,edusat,edusat-design,power-balance,progress}.ts` | Assembly state machine; Soyuz units, relations, kind-of-part and certainty rules; EduSat-3U parts list and options; time-stepped energy balance; design → `SatelliteDesign`; stored progress. DOM-free (added to `tests/architecture.test.ts`'s core). |
| Render | `src/render/structure-mesh.ts`, `structure-viewer.ts`, `edusat-model.ts` | Decoder; a three.js viewer of its own (per-part state in a texture read by the vertex shader: hidden, see-through (screen door), selected, related, dimmed; colour by material, kind or certainty; picking with three's `Raycaster`; camera by drag, wheel, pinch and keys); EduSat drawn from its parts list. |
| Screen | `src/ui/structure/{structure-screen,charts,text}.ts`, `structure.css` | The section: model switch, activity (explore, assemble, experiment), depth links, toolbar, parts list (assembly → group → part), information panel, assembly panel, experiment panel, energy chart, hand-off panel, side-view fallback without WebGL. Text in Thai (source), English and Russian (drafts, marked on screen). |
| Wiring | `src/main.ts`, `src/ui/app-mode.ts`, `section-nav-model.ts`, `section-plan.ts`, `index.html`, `src/i18n/{th,en,ru}.ts` (4 keys each), `src/workspace/{registry,repository}.ts`, `src/pwa/manifest.ts`, `public/privacy.html` | A fourth section `structure` with model pages valid at every level; host callbacks `toOrbit`/`toLaunch` as Build's; storage key `orbitlab.structure.v1`; `structure/` fetched on demand. |

### 2.1 Decisions taken while building (within the brief)

- **One section, three depths.** Orbitlab's levels are the depths (พื้นฐาน, ทดลอง, วิศวกร): a press picks the assembly, its group or the part; the selection is kept as its most specific form and shown at the depth's grain.
- **The cutaway uses the page's own halves.** The model's parts come split into front and back halves with closed cut faces; hiding the front halves is what the page itself does ("ผ่าซีก"). A clipping plane would show hollow, uncapped walls, so it was not used; the screen says the walls and thicknesses are illustrations.
- **Assembly order** follows the vertical load path (core → strap-ons/truss → Block I → Fregat → payload → fairing halves) and says so: at a launch site Soyuz is assembled horizontally and the upper composite is put together first (Arianespace, Soyuz User's Manual 2012). Strap-ons are block-specific (the reference's positions); EduSat's four side panels are interchangeable. A part's way round matters for the strap-ons and Fregat (quarter turns) and the camera and panels (flip); parts come off the tray turned, so the learner sets them.
- **Code in the main bundle, not a chunk of its own — for the owner to confirm (§8).** Loaded lazily, the section made Vite/rolldown regroup the app's shared chunks (new chunks for `satellite-templates`, `escape`, `presets` and three small ones, `lesson-file` cut from 345 to 76 kB, 220 kB moved out of `index`), which the budget groups do not describe. Imported normally, no existing chunk moves (checked module by module against the base build); the cost is in the index groups. Both were measured (§8); which one is the owner's D-38 decision.
- **The section's words live with it** (`src/ui/structure/text.ts`, the `Record<Lang, …>` pattern of `help-content.ts`), held to the dictionaries' rules by `tests/structure-text.test.ts`; only the four section-switch keys are in the dictionaries.
- **3-D starts after the section is painted.** Creating a second WebGL context took 11.8 s the first time in this container's software GL (a bare `getContext('webgl2')` measured alone; 5 ms afterwards), so the section draws first with its loading note.
- **One renderer for the section's life.** Leaving the section aborts its fetches, frees every geometry, material and texture and stops drawing; the context is kept, because a browser drops the oldest context past about sixteen and that would raise the app's "view lost" note.

## 3. Acceptance criteria and results

| # | เกณฑ์ | ผล | หลักฐาน |
| --- | --- | --- | --- |
| A1 | เปิดหมวดใหม่ด้วยลิงก์ตรง และกลับไปส่วนเดิมได้ | ผ่าน | journey: `#/structure/explore/soyuz-st31` opens directly; Back from Launch returns to the finished assembly; `tests/structure-model.test.ts` (addresses) |
| A2 | เลือกจากภาพและรายการได้ตรงกัน ข้อมูลและกล้องตามชิ้นที่เลือก | ผ่าน | journey: list pick shows the core and its 5 relations; a press on the view picks a subsystem and the list marks it; the camera turns about the pick and frames list picks |
| A3 | เปิดภายใน แยกส่วน คืนสภาพ โดยโมเดลไม่เสียสถานะ | ผ่าน | journey: cutaway loads the inside layer and turns the camera to the opened side (`cutawayAzimuth`, 135°, tested against the page's halves); apart 100 %; Reset restores; assembly completion checks the view's own transforms (`viewAssembled`: every assembly visible, no translation, no rotation but the one its slot asks — a side panel on another face); a failed layer is said on the stage with a retry |
| A4 | ประกอบ Soyuz และดาวเทียมแบบตั้งต้นได้ จัดการติดตั้งผิด/ไม่ครบ | ผ่าน | `tests/structure-assembly.test.ts` (16 tests, every option inside its slot's size limits, a panel on another face lands on that face as the viewer turns it); journey: out of order, another block's place, wrong way round each refused with its reason; undo; 11/11 complete; EduSat 13/13 complete with two panels on other faces, the +X panel drawn at the −Z face; the parts in place are listed as buttons (select, take off) |
| A5 | เปลี่ยนระดับแล้วแบบและความคืบหน้าคงเดิม | ผ่าน | journey: Fregat stays selected from ทดลอง to วิศวกร; the assembly and design are per section, not per level |
| A6 | เปลี่ยนแบต/อุปกรณ์แล้วภาพ รายการ มวล ผลพลังงานเปลี่ยนจากข้อมูลจริง | ผ่าน | one design object feeds `partsOf`, `edusatMeshes`, `eduFigures`, `eduSatelliteDesign`; journey checks mass 1.810 → 2.010 → 2.070 kg and the verdicts |
| A7 | มีกรณีผ่านและกรณีไม่พอที่อธิบายได้จากค่าที่แสดง | ผ่าน | §5 table; `tests/structure-power.test.ts` (10 tests, worked cases) |
| A8 | ส่งไป Launch หรือ Orbit ได้จริง ตรวจค่าที่ปลายทางได้รับ | ผ่าน | the section reads back from each destination: Orbit's playground (`heldHandoff`: its own orbit from the state vector, the mass its lifetime analysis takes) and Launch's mission after its checks (payload mass, target, values put back); `checkReceipt` holds them to what was sent (0.5 g, 1 km, 0.05°, nothing replaced); `tests/structure-handoff.test.ts` runs all four designs through Orbit's and Launch's own code; the journey checks the read-back receipts (2.070 kg) and the destinations' own state |
| A9 | แก้แบบไม่แสดงผลเก่าเป็นของแบบใหม่ ไม่เขียนทับงานเดิม | ผ่าน | the figures are a function of the design, worked out again on every change (tested), and carry `designKey`, which the screen checks before showing them; a change after sending is flagged; my experiment is a copy (reference frozen); stored under its own profile key; reload keeps it (journey); a damaged record is set aside by the profile and a newer one is never written over, each said on screen |
| A10 | ใช้ได้บนเดสก์ท็อป จอแคบ แตะ แป้นพิมพ์ ไม่ต้องลากอย่างเดียว | ผ่าน (มือถือแบบจำลอง) | journey: 390×844 touch, reduced motion: no sideways scroll, list taps, assembly by taps; keyboard on the view (arrows, + − 0); every function has a button; drag onto the view is optional |

## 4. The models' data

### 4.1 Soyuz-2.1b / Fregat ST31

The page's 2,069 parts in 11 assemblies: core (363), four strap-ons (292 each), interstage (28), Block I (279), Fregat (171), payload envelope (16), fairing halves (22 each). Each assembly's "apart" offset and the fairing halves' opening offset are the page's own (`move`, `reveal`). Kind of part (wall, load-bearing, mount/joint, mechanism, equipment, propulsion) and certainty (from photographs / estimated for learning) come from rules over the page's kinds, roles and ids (`src/structure/soyuz.ts`) — this pilot's reading of the page's notes, said as such on screen. No part's *shape* is called documented: the page says none is a production drawing; documented figures are the page's facts with its sources (2.95 m core, 4.110 m × 11.433 m fairing, engine counts, thrusts). The payload envelope is labelled a stand-in; ST31 carried 36 OneWeb satellites.

### 4.2 EduSat-3U (a concept for learning)

| Unit | Mass (kg) | Load | How known |
| --- | ---: | --- | --- |
| 3U frame | 0.30 | — | typical (estimated); envelope 100 × 100 × 340.5 mm (CDS) |
| Mounting plates, rods, wiring | 0.14 | — | estimated |
| Battery, 1 cell / 2 cells | 0.09 / 0.15 | 9.36 / 18.72 Wh | 18650 cell 3.6 V × 2.6 Ah (Samsung ICR18650-26J class), board estimated |
| EPS | 0.10 | 0.15 W always | assumed |
| Attitude control | 0.18 | 0.5 W always | assumed |
| OBC | 0.06 | 0.4 W always | assumed |
| UHF radio | 0.08 | 0.25 W always + 3.5 W × 8 min in sunlight | assumed |
| Deployable antenna | 0.08 | — | estimated |
| Side panels × 4 | 0.12 each | 7 cells × 30.18 cm² each = 0.0845 m² | AZUR 3G30C 4×8 cm cell area |
| Day camera / night camera | 0.30 / 0.50 | 2.5 W × 10 min in sunlight / 6 W × 25 min in shadow | assumed |

Reference: 1 cell + day camera, **1.810 kg**. Pilot mass bound 4.00 kg (CDS Rev. 13 for a 3U). On screen: the bound is the lesson's, later CDS revisions and each launch provider set their own, and Rev. 14.1's value was not checked against the document (the review recalled 6.00 kg; search results conflict).

### 4.3 Sources and figures not opened directly

nasa.gov, azurspace.com, unoosa.org and cubesat.org could not be fetched from this session (network policy). The cell's 30.18 cm² is confirmed by search results of AZUR's 4×8 datasheet; 29.5 % efficiency is the figure Orbitlab already cites (NASA SST-SoA Table 3-1, `src/data/satellite-templates.ts`); the CDS 3U envelope by search results citing Rev. 14.1, the 4.00 kg limit by secondary sources citing Rev. 13 (Rev. 14's own limit was not verified); the 18650 figures by search results of the cell's specification copies. The remaining EduSat figures are assumptions of the scenario and are labelled so.

## 5. The energy balance

Scenario (on screen): circular 500 km, β = 0° (the longest shadow: 35.75 min of a 94.62 min orbit, `eclipseDuration`/`circularPeriod`), starting at sunrise with a full battery, three orbits. Panels in sunlight S·A·η·I_d/π = 1361 × 0.0845 × 0.295 × 0.77 / π = **8.32 W** (a slow spin about the long axis, square to the Sun: Orbitlab's `MOUNT_FACTOR.spinner`), × X_d = 0.8 to the bus = 6.65 W. Surplus charges the battery at η = X_e/(X_d·η_BAT) = 0.833; the battery gives back at η_BAT = 0.9. Full at capacity (more is shed), floor at 30 % depth of discharge (below it, loads go unpowered: a shortfall). Integrated exactly per stretch of constant power.

| Design | Mass | Battery | Shadow draw | Usable | Result |
| --- | ---: | ---: | ---: | ---: | --- |
| 1 cell + day camera (reference) | 1.810 kg | 9.36 Wh | 0.86 Wh | 2.81 Wh | all powered; lowest 8.50 Wh (91 %) |
| 1 cell + night camera | 2.010 kg | 9.36 Wh | 3.64 Wh | 2.81 Wh | **short 10.9 min each orbit, 0.75 Wh** at the end of the shadow |
| 2 cells + day camera | 1.870 kg | 18.72 Wh | 0.86 Wh | 5.62 Wh | all powered |
| 2 cells + night camera | 2.070 kg | 18.72 Wh | 3.64 Wh | 5.62 Wh | all powered; lowest 15.08 Wh (81 %); full again before each shadow |

Checks (`tests/structure-power.test.ts`): a brute-force one-second integration, written apart from the code from the scenario's own words, agrees on all four designs (lowest and final charge to 0.01 Wh, unpowered energy to 0.01 Wh, shortfall time to a step); a constant load drains P·t/η_BAT; the floor and the unpowered energy after it; a full battery sheds exactly the sunlit surplus; at the array power `arrayPowerRequired` asks for and a battery of `batteryCapacity`, an orbit balances exactly and the battery reaches its depth of discharge exactly at the end of the shadow (the SMAD identity X_e = X_d·η_charge·η_BAT); the EduSat cases above, worked apart. The steady-state SMAD check is also shown at the วิศวกร depth (array 7.78 W needed vs 8.32 W; battery 12.13 Wh needed with the night camera). The exact balance at SMAD's array holds only while no sunlit load needs more than the panels give through the regulator: a sunlit peak above it draws the excess D from the battery, and the orbit ends D·(1/η_BAT − η_charge) short (the review measured −0.405 Wh for a 20 W, 5-minute spike); the four designs' sunlit peak is 4.8 W against 6.65 W. Not modelled: temperatures, stresses, attitude changes while imaging, battery ageing, voltages, real mission life.

The balance is worked out on the bench only, with this closed-form shadow; the hand-off does not carry it, and Orbit neither receives nor recomputes it (Orbit draws the Earth's day and night from the Sun's position, but computes no eclipse or power for the satellite) — two separate sources, said on the hand-off panel. The orbit handed on (500 km sun-synchronous, node at 12:00) keeps β near 0 all year, so the two shadows are close.

## 6. Checks run

| Check | Result |
| --- | --- |
| `npx tsc --noEmit` | pass |
| `npx vite build` | pass |
| New unit tests `tests/structure-{assembly,power,model,progress,text}.test.ts` | 44/44 pass (assembly 15, power 11 incl. a brute-force 1 s integration written apart, model 8, progress 6, text 4) |
| Existing tests touched by the change (i18n, app-mode, section-nav-model, section-plan, architecture, privacy-inventory, pwa, repo-hygiene, workspace-profiles, anatomy, i18n-thai-terms, workspace-eo-sto-1) | pass (EO-STO-1 after §7) |
| `node --test tests/verification/*.test.mjs tests/browser/shard.test.mjs` | 93/93 pass |
| Full `npx vitest run` | see §12 (run on the final tree) |
| Browser journey `structure-assembly` (`node tests/browser/run.mjs structure-assembly`, built `dist`, Chromium 153, SwiftShader) | pass (desktop 1440×900 Thai; phone 390×844 touch, reduced motion) |
| `node scripts/bundle-budget.mjs` | **fails** — §8 |

## 7. Storage

`orbitlab.structure.v1` in the learner's profile (registered in `WORKSPACE_KEYS`, quarantined before an unreadable overwrite like the other versioned keys, named on the privacy page): the model and activity last open, each model's placements, when each was first completed, "my experiment" and which design is shown. A record that cannot be read is written over at the next save — the profile's repository sets the old copy aside first (`preserveUnreadableOverwrite`, the quarantine of the other versioned keys) — and the section says it started afresh; a newer version's record is never written over, and the section says its work is not being saved; a save the browser refuses is said too. Nothing else of the profile is touched. Sending to Launch or Orbit replaces the mission or orbit open there, as Build's own "Fly it" and "Send to Orbit" do, and the panel says so before the press; saved designs and files are not changed. To keep the learner's own Launch mission, the section keeps the one Launch had before its first send (in memory, until the page is closed; a second send keeps that first one while Launch still holds the last send) and offers **Put back the mission Launch had before**, which restores it in Launch as a stored mission is read (no "loaded from" notice). Orbit's hand-off lives in memory only, as Build's does; the flight it came from is still in Launch.

**EO-STO-1:** `tests/workspace-eo-sto-1.test.ts` compares storage against byte copies of main's files at 23ede7f; its step "every workspace key read" failed on the new key, which the reference refuses as unknown. A first proposal edited the reference copy; the review pointed out the owner's standing rule q04 B (a reference changes only in a bug-fix PR whose byte change is the fix), so that commit was dropped and `tests/eo-sto/ref/` is byte-identical to main (same blob). As #153 did for its one intended difference, the step now reads the reference's own key list, and a new test pins the difference to exactly `orbitlab.structure.v1`; every stored byte on every step is still compared. Older Orbitlab builds refuse a backup that contains a key they do not know (`parseWorkspaceArchive`), as for any new key.

## 8. Budget (D-38) — awaiting the owner

Measured on the final tree with `npx vite build` and `node scripts/bundle-budget.mjs`, against main's build at `3e1b48a` (same Vite):

| Group | Main | This tree | Ceiling | Over |
| --- | ---: | ---: | ---: | ---: |
| `index-*.js` | 2654.2 kB | 2831.0 kB | 2655.0 kB | +176.0 kB |
| `index-*.css` | 178.3 kB | 186.9 kB | 179.0 kB | +7.9 kB |
| `i18n-*.js` | 1732.5 kB | 1734.1 kB | 1733.0 kB | +1.1 kB |
| precache code | 14678.8 kB | 14865.7 kB | 14679.0 kB | +186.7 kB |
| first download (index.html and what it loads) | 5101.1 kB (1430.1 gzip) | 5288.1 kB (1484.3 gzip) | — | +187.0 kB (+54.2 gzip) |

CI runs this check (`ci.yml`, `deploy.yml`), so as it stands the branch would fail there. No ceiling was raised: D-38 needs the measured size, the feature, a named identical-output offset (none found) and the owner's approval.

**The other way, measured (not applied): the section loaded when it first opens** (`import()` in `main.ts`, the rest unchanged): `index-*.js` 2434.4 kB (−220 kB), `index-*.css` back to main's 178.3 kB, first download 5107.0 kB (+5.9 kB on main), the section's own chunk 166.6 kB of JS and 8.6 kB of CSS fetched when the section opens. But Rolldown then regroups shared code into new chunks that still load at start (`satellite-templates` 269.5 kB, `escape` 175.5 kB, `presets` 45.6 kB and three small ones; `lesson-file` 345 → 76 kB), so "other chunks" goes 668 kB over its 772 kB ceiling; precache code is still +181 kB (the service worker downloads the section's chunk in the background), and `i18n-*.js` +1.1 kB. It needs, besides the code (a loading and a failed-to-load state with a retry), the regrouped chunks named in `budgets.json` with `index`'s ceiling lowered by as much — a classification, as R1 did on 2026-10-03 — and the precache raise; or the section's chunk on demand (`src/pwa/manifest.ts`), which takes the raise away but makes the section need the network the first time, as its Soyuz model already does.

The owner's choice, then: (A) as it is — one file, every visitor downloads +187 kB (+54 kB gzip) at start; or (B) lazy — +6 kB at start, a `budgets.json` reclassification, and precache or on-demand for the section's chunk. Either way about half of the section's JS is its text in three languages (Thai 31 kB, Russian 26 kB, English 17 kB of source), which could also go into on-demand files. The model files (1.9 MB) are on demand and not precached.

## 9. Review

The owner asked for GPT-6.1 Sol to build and GPT-6 Astra to review. Neither is available here: the work was done by Claude, and the review by a second Claude agent with its own context, read-only, given the owner's review checklist (mass counted once, units/axes/pivots, one design behind picture/list/figures, hand-off values, stale results, reference vs experiment, user work preserved, claims within the model). It built main and this branch, ran the tests and the journey, and probed the behaviour it suspected in a browser. **This is not a review by Astra.** Its findings and what was done with each are in §9.1; the fixes were then checked by a second round (§9.2).

### 9.1 Findings of the first review and what was done

| # | Finding (the reviewer's priority) | Outcome | Evidence after the fix |
| --- | --- | --- | --- |
| 1 | P0 — the bundle budget fails CI: `index-*.js`, `index-*.css`, `i18n-*.js` and precache code over their ceilings; three comments said the section had a chunk of its own | **Owner's decision (D-38), not changed.** Both ways measured (§8); the comments corrected | §8 |
| 2 | P1 — a side panel put on another face was drawn on its own face, and the place buttons then looked wrong | **Fixed.** A part in place is drawn in the slot it went into (`panelTurn`); `viewAssembled` expects that slot's turn (without it, the first fix would have kept a valid assembly from ever showing "complete" — the reviewer saw this in the work in progress); a drop on the model chooses a free slot by its occupant | unit test: each panel on each face lands on that face as three.js turns it (fails if a face's sign is flipped); journey: the +X panel's centre at the −Z face, EduSat complete with two panels on other faces |
| 3 | P1 — receipts: Orbit's read back the object just sent; after a change it said "the current design's mass" beside "changed after sending"; a refused send was still recorded as sent and its reason (in English) was drawn only in the Assemble panel; Launch skipped the checks Build's "Fly it" runs | **Fixed.** Read back from Orbit's playground (`heldHandoff`: its orbit from the state vector, the mass its lifetime analysis takes) and from Launch's mission after its checks; `checkReceipt` holds mass (0.5 g), apsides (1 km), inclination (0.05°) and values put back (none); worded as held when sent; Build's checks run first; a refusal is said beside the send buttons, translated, and nothing is recorded | `tests/structure-handoff.test.ts` (all four designs through Orbit's and Launch's own code; a wrong receipt is caught); journey; browser probe |
| 4 | P1 — switching model while the other loads left the old model drawn and pickable under the new name; a failed load left it on screen | **Fixed.** The viewer is cleared when the load starts, picks come only from the model shown, the canvas goes when the model's 3-D failed | probe: 0 triangles and no pick while Soyuz loads, Soyuz shown after |
| 5 | P2 — the cutaway camera looked 90° off, at the cut edge-on | **Fixed.** `cutawayAzimuth` from the page's own halves (135°) | unit test against every unit's halves; probe |
| 6 | P2 — saving stopped silently after a damaged or newer record | **Fixed.** Damaged: written over, the profile sets the old copy aside; newer: left alone; both said in the section's head; a refused save said too | unit test; probe (damaged copy in the profile's quarantine, progress kept across a reload; newer record unchanged) |
| 7 | P2 — a failed inside/engine layer was silent in Explore | **Fixed.** Said on the stage with a retry; its switch let go | probe: note, retry, layer loaded after |
| 8 | P2 — "the parts list still works" was said when the model's data itself failed | **Fixed.** Two messages: data failed; 3-D failed (list and side view work). The PWA comment corrected | probe for both |
| 9 | P2 — the power model's "balances exactly" comment lacked its precondition | **Fixed.** Stated, with the shortfall a sunlit peak causes | `power-balance.ts`, §5 |
| 10 | P2 — the CubeSat mass bound's context (Rev. 14.1 cited, Rev. 13 used) | **Partly.** Said on screen that the bound is the lesson's, later revisions and providers differ, and Rev. 14.1 was not checked; the value itself could not be checked (hosts blocked) | §4.2, §4.3 |
| 11 | P2 — "Back to the reference" overwrote my experiment | **Fixed.** Worded "Reset my experiment to the reference" (Thai and Russian alike) | text |
| 12 | P2 — accessibility: no keyboard path to a placed part after taking one off; no keyboard pan; `role="img"` on an interactive canvas; a live region recreated on each render; the no-WebGL side view ignored the assembly | **Fixed.** Parts in place listed as buttons; Shift + arrows pan (said in the canvas's name); `role="application"`; one live region that stays and says the selection; the side view shows what is in place, where | probe; journey |
| 13 | P2 — tests weaker than their names (an always-true nav check, keys not checked, a 0.5 kg tolerance, a results test that checked only keys, no check of the drawn placement) | **Fixed.** Nav marks this section; each key moves the view and 0 brings back the overview; Orbit's own rounded kilograms checked as such (the read-back carries the value); results are a function of the design; drawn placement checked | journey; tests |
| 14 | P2 — the EO-STO-1 reference copy was edited | **Fixed.** Restored byte for byte; the commit dropped from the (unpushed) history; the step reads the reference's keys and a test pins the one difference (§7) | EO-STO-1 7/7 |
| 15 | Minor — `clear()` kept the state texture; a comment named a file that does not exist; a hard-coded "Model" label; Launch is set live before the mission is checked | First three fixed; the last is the order Build's "Fly it" uses, kept | — |

Verified correct by the reviewer (unchanged): mass counted once, from the parts list to Orbit's and Launch's figures (1.810, 2.010, 1.870, 2.070 kg); all four designs pass Orbitlab's satellite checks and the Launch checks; `toFlight` is a proper rotation; strap-on axes a quarter turn apart; the preview's turns follow three.js; the power integration, η_charge = 0.833, the SMAD identities and the shortfall accounting; the Soyuz facts spot-checked; reference and experiment kept apart; fetches cancelled and GPU resources freed on leaving.

### 9.2 Second round: the fixes checked

(filled in after the check)

### 9.3 To hand this to Astra

Branch `claude/trusting-cannon-oah00c`, base `3e1b48a`; the files in §2; how to reproduce: §11; the checklist above; the open decisions in the status box. The points most worth a second pair of eyes: `previewMatrix` and `unitAxis` (pivots of turned strap-ons and panels), `simulatePower`'s splitting of stretches at full and at the floor, and the classification rules in `src/structure/soyuz.ts`.

## 10. Limits and open items

- The 2026-11-02 delivery was not reachable: the web model (2026-10-26) is the one used (§1).
- EN and RU text is a draft (marked on screen in those languages); the Soyuz part descriptions are the page's Thai only (said on screen).
- Phone checks are Chromium's emulation (390×844, touch) in this container, not a real phone; render cost on phones was not measured.
- All measurements are with software WebGL (SwiftShader) on a 4-core Intel Xeon 2.1 GHz container: a frame of the full Soyuz outside takes about 0.2–0.4 s there (a real GPU draws it in milliseconds), and creating the section's WebGL context took about 12 s the first time.
- D-25 asks for about 400 changed source lines per PR; this pilot is about 5,500 new lines of source. A proposed split for merging: (1) model files, pure core and their tests; (2) viewer; (3) section, routing and text; (4) experiment and hand-offs. The owner decides.
- Not in this pilot (as asked): changing Soyuz, a vehicle library, a CAD tool, strength analysis, accounts, a large curriculum.

## 11. Trying it

On a machine with the repository at this branch: `npm ci`, then `npm run dev` and open `http://localhost:5173/#/structure/explore/soyuz-st31` (or `…/edusat`). A built copy: `npm run build && npm run preview`, then `http://localhost:4173/#/structure/explore/edusat`. The browser journey: `npm run build && node tests/browser/run.mjs structure-assembly`. After replacing the Anatomy page: `npm run structure`, then `npx vitest run tests/structure-model.test.ts`.

## 12. Revisions

(filled in at commit time)
