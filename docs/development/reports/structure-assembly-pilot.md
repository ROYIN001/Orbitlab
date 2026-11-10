# Structure & Assembly pilot / รุ่นนำร่องหมวด "โครงสร้างและการประกอบ"

> **สถานะปัจจุบัน (บันทึกเดียวที่เป็นปัจจุบัน — แก้ที่นี่ทุกครั้งที่สถานะเปลี่ยน)**
>
> - สาขา: `claude/trusting-cannon-oah00c` · ฐาน: `main` @ `3e1b48a` (2026-11-07, "Records: fold #214") · commit ของงานนี้: ดู §12
> - ช่วงงาน 1–5 ทำครบ: ตรวจซอร์ซ → viewer/ทางเข้า → ประกอบตามแบบ → แบบทดลองดาวเทียม → ส่งต่อ Orbit/Launch, ตรวจในเบราว์เซอร์จริง
> - **ยังไม่ push / merge / เผยแพร่** ตามคำสั่งเจ้าของ (2026-11-09) งานอยู่ใน commit ในเครื่องคลาวด์เท่านั้น
> - ผู้ทำงาน: Claude (ไม่ใช่ GPT-6.1 Sol) · ผู้ตรวจทาน: เอเจนต์ Claude แยกบริบท (ไม่ใช่ GPT-6 Astra ซึ่งเรียกจากที่นี่ไม่ได้) — §9
> - **รอเจ้าของตัดสิน:** (1) งบขนาดตาม D-38: รวมในชุดหลักแบบตอนนี้ หรือโหลดแยกเมื่อเปิดหมวด (วัดไว้ทั้งสองแบบ §8) (2) ขนาด PR เกินแนวทาง D-25 (§10) (3) ส่งชุดส่งมอบ Soyuz 2 พ.ย. มาให้เทียบ (§1)
> - ผลตรวจทานรอบแรก (เอเจนต์ Claude): 15 ข้อ แก้แล้ว 13 ข้อ เหลือ 1 ข้อรอเจ้าของ (งบขนาด) และ 1 ข้อแก้ได้บางส่วน (ค่ามวล CDS ยังไม่ได้ตรวจจากต้นฉบับ) — §9.1 สำเนาอ้างอิง EO-STO-1 กลับเป็นของเดิมทุกไบต์แล้วตามกฎ q04 B
> - ผลตรวจทานรอบสอง (เอเจนต์ Claude 4 มุมมอง ตรวจการแก้ของรอบแรก): 22 ข้อ ระดับ P2 ทั้งหมด แก้ครบ ผู้หักล้างยืนยันว่าจริง 11 ข้อ อีก 11 ข้อพบว่าแก้แล้วตอนตรวจ ไม่มีข้อใดถูกหักล้างด้วยเหตุผล — §9.2
>
> **สรุปสำหรับเจ้าของ (ภาษาไทย)**
>
> - เพิ่มหมวดที่ 4 "โครงสร้าง" ในแถบบน เปิดด้วยลิงก์ตรง `#/structure/<ระดับ>/<โมเดล>` เช่น `#/structure/explore/soyuz-st31` หรือ `#/structure/explore/edusat` ใช้ระดับ พื้นฐาน/ทดลอง/วิศวกร ของ Orbitlab เป็นระดับความลึก เปลี่ยนระดับแล้วชิ้นที่เลือก แบบ และความคืบหน้าคงอยู่
> - **Soyuz-2.1b/Fregat ST31** มาจากหน้า Anatomy ของคุณใน repo (รุ่น `family-v1-20261026`) ครบ 2,069 ชิ้นพร้อมรหัสเดิม คำอธิบาย ข้อมูล และแหล่งอ้างอิงภาษาไทยของหน้า แบ่งไฟล์เป็นเปลือกนอก/ภายใน/เครื่องยนต์ โหลดเฉพาะเมื่อใช้ เลือกชิ้นได้ทั้งจากภาพและรายการ ผ่าซีกตามครึ่งที่หน้าแบ่งไว้ ทำเปลือกโปร่ง แยกชิ้น เปิดหัวครอบ ซ่อน/แสดงเฉพาะ คืนสภาพ ระบายสีตามชนิดชิ้นส่วนหรือสถานะข้อมูล ประกอบชุดหลัก 11 ชุดตามแบบ (ลำดับ ตำแหน่ง ทิศทาง) มีถอด ย้อนกลับ เริ่มใหม่ และตรวจความครบจากความสัมพันธ์ ไม่เปิดให้ดัดแปลงจรวด
> - **EduSat-3U** ดาวเทียมแนว CubeSat ที่สร้างเพื่อการศึกษา (ระบุชัดว่าไม่ใช่ OneWeb) ประกอบได้ 13 ชุด แล้วสร้าง "แบบทดลองของฉัน" ได้ทันทีโดยไม่ต้องผ่านบทเรียน เปลี่ยนแบตเตอรี่ (1 หรือ 2 เซลล์) และกล้อง (กลางวัน/แสงไฟกลางคืน) ภาพ รายการ มวล และสมดุลพลังงาน 3 รอบวงโคจรเปลี่ยนจากข้อมูลชุดเดียวกัน กรณีตัวอย่าง: กล้องกลางคืน + แบต 1 เซลล์ → ไฟไม่พอ 10.9 นาทีต่อรอบ, + แบต 2 เซลล์ → ผ่านแต่หนักขึ้น 60 g
> - ส่งแบบทดลองไป **Orbit** ได้จริง (ใช้ `designHandoff` เดิม) และไป **Launch** เป็นสถานการณ์สมมติบน Soyuz-2.1b/Fregat จาก Vostochny (ใช้ `designMissionDocument` เดิม และผ่านการตรวจก่อนบินแบบเดียวกับปุ่มของส่วนสร้าง) ก่อนส่งแสดงค่าที่จะส่ง/ไม่ส่ง หลังส่งอ่านค่ากลับจากปลายทางเอง (มวล วงโคจร ความเอียง) แล้วเทียบกับที่ส่ง เช่น 2.070 kg, 500 × 500 km, 97.4° ตรงกัน ถ้าแก้แบบหลังส่งจะขึ้นเตือน ถ้าส่งไม่ได้จะบอกเหตุผลข้างปุ่ม
> - ตรวจแล้ว: ชุดทดสอบใหม่ 59 ข้อ, ชุดทดสอบทั้งหมดของแอป (10,688 ข้อ) ผ่าน, browser journey ผ่านครบเส้นทางทั้งเดสก์ท็อปและจอมือถือแบบสัมผัส และตรวจการแก้แต่ละข้อของผู้ตรวจทานในเบราว์เซอร์อีก 42 ข้อ (รายละเอียด §6) **ค่าที่ยังไม่ผ่าน:** งบขนาดแอป (§8) ซึ่งต้องให้คุณตัดสินตาม D-38
> - ส่งไป Launch แล้วนำภารกิจเดิมของ Launch (ฉบับที่บันทึกไว้ ตรงทุกไบต์) กลับมาได้ด้วยปุ่มเดียว ตราบที่ Launch ยังถือภารกิจที่ส่งไปและยังไม่ปิดหน้า เพื่อรักษาภารกิจของผู้ใช้

```yaml
package: none in the plan (owner's request in chat, 2026-11-09)
item: a Structure & Assembly section — explore, assemble and modify (educational satellite only)
change_kind: feature (new section, render, UI, storage key, PWA on-demand files); physics unchanged
owner_authorization: 'owner in chat, 2026-11-09: "ฉันต้องการให้คุณเริ่มพัฒนาส่วน “โครงสร้างและการประกอบ” ใน Orbitlab ตามข้อกำหนดต่อไปนี้ ให้ทำจนได้รุ่นนำร่องที่ใช้งานจริง ตรวจสอบแล้ว และเปิดให้ฉันทดลองในเครื่องได้" … "ยังไม่อนุญาตให้ push, merge หรือเผยแพร่ขึ้นเว็บจริง"'
branch: claude/trusting-cannon-oah00c
base: 3e1b48a961c5d79b8dbd68e0471878567c10c748
budget: owner's decision (D-38) — as built index-*.js +185.2 kB, index-*.css +7.9 kB, i18n-*.js +1.1 kB, precache code +195.9 kB over their ceilings; a lazy-loaded variant measured (§8); no ceiling raised
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
| A10 | ใช้ได้บนเดสก์ท็อป จอแคบ แตะ แป้นพิมพ์ ไม่ต้องลากอย่างเดียว | ผ่าน (มือถือแบบจำลอง) | journey: 390×844 touch, reduced motion: no sideways scroll, list taps, assembly by taps; keyboard on the view: each of ← ↑ Shift+→ + − moves it and 0 brings back the overview; every function has a button (the parts in place too); drag onto the view is optional; the selection is said in a live region |

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
| New unit tests `tests/structure-{assembly,power,model,progress,text,handoff,storage}.test.ts` | 59/59 pass (assembly 16, power 11 incl. a brute-force 1 s integration written apart, model 9, progress 6, text 4, handoff 6, storage 7); the placement test fails if a face's sign is flipped, the storage test if the key leaves the repository's quarantine table |
| Existing tests touched by the change (i18n, app-mode, section-nav-model, section-plan, architecture, privacy-inventory, pwa, repo-hygiene, workspace-profiles, anatomy, i18n-thai-terms, orbit-playground, workspace-eo-sto-1) | pass; EO-STO-1 7/7 with `tests/eo-sto/ref/` byte-identical to main (§7) |
| `node --test tests/verification/*.test.mjs tests/browser/shard.test.mjs` (the change map's rule covers the new tests through `tests/structure-*.test.ts`) | 93/93 pass |
| Browser probes of each review fix (a script outside the repo, sent with this report: failed layers, model switch while loading, failed model data or 3-D, damaged and newer records, a refused send, receipts, put back (bytes, panel, language, a changed Launch), pan direction, messages following the language, focus after Remove, the parts-in-place buttons and live region, the cutaway's angle) | 42/42 pass on the final build |
| Full `npx vitest run` (on `f2de409`; the last commit changes one line of the screen after it, covered by the typecheck, the section's unit tests and the journey) | 351 files, 10,688 tests, all pass (25 min in this container) |
| Browser journey `structure-assembly` (`node tests/browser/run.mjs structure-assembly`, built `dist`, Chromium 153, SwiftShader) | pass, 79 s on the final build (desktop 1440×900 Thai: Soyuz explore, cutaway, assembly with refusals and undo, EduSat assembly with two panels on other faces, my experiment, Orbit and Launch with read-back receipts, Launch's earlier mission put back, reload; phone 390×844 touch, reduced motion: taps and keys) |
| `node scripts/bundle-budget.mjs` | **fails** — §8 |

### 6.1 Performance (measured 2026-11-10, idle machine)

Production build served by `vite preview` on localhost; each case a fresh browser context (a first visit, nothing cached); a script outside the repo (sent with this report). Machine: Linux container, Intel Xeon @ 2.10 GHz × 4, 16 GB, load average 0.7 at the start; Chrome for Testing 153.0.8010.12, headless, **software WebGL (SwiftShader), no GPU**.

| Measure | Desktop 1440×900, Soyuz (ทดลอง) | Desktop 1440×900, EduSat | Phone emulation 390×844 ×3, touch, Soyuz (พื้นฐาน) |
| --- | ---: | ---: | ---: |
| Section on screen after the address changes | 20 ms | 23 ms | 23 ms |
| 3-D ready (WebGL context made, model fetched, decoded and drawn) | 5.0 s | 4.8 s | 3.0 s |
| Turning the view by drag, time per frame, median / 90th percentile | 217 / 233 ms | 33 / 50 ms | not measured: the emulated touch page took no mouse drag, so its 17 ms frames were idle |
| Inside and engine layers fetched and drawn | 1.4 s | — | 1.3 s |
| Turning with all three layers, 90th percentile frame | 483 ms | — | — |
| JS heap after the above | 53 MB | 40 MB | 72 MB |
| Opening again after leaving (model and viewer kept) | 2 ms | 1 ms | 2 ms |

SwiftShader draws on the CPU: these are a worst case, not what a learner with a GPU sees (a GPU draws the 257,000-triangle outside in milliseconds). With all layers the median frame interval reads 0 ms (frames stacked while the main thread was busy), so only its 90th percentile is given. Not measured: a real GPU, a real phone, render cost on a phone.

## 7. Storage

`orbitlab.structure.v1` in the learner's profile (registered in `WORKSPACE_KEYS`, quarantined before an unreadable overwrite like the other versioned keys, named on the privacy page): the model and activity last open, each model's placements, when each was first completed, "my experiment" and which design is shown. A record that cannot be read is written over at the next save — the profile's repository sets the old copy aside first (`preserveUnreadableOverwrite`, the quarantine of the other versioned keys) — and the section says it started afresh; a newer version's record is never written over, and the section says its work is not being saved; a save the browser refuses is said too. Nothing else of the profile is touched. Sending to Launch or Orbit replaces the mission or orbit open there, as Build's own "Fly it" and "Send to Orbit" do, and the panel says so before the press; saved designs and files are not changed. To keep the learner's own Launch mission, the section keeps what Launch had before its first send — the panel's mission and the stored copy's exact text (in memory, until the page is closed; a second send keeps that first one while Launch still holds the last send) — and, while Launch still holds what was sent, offers **Put back the mission Launch had before**: the stored copy goes back into the panel and into storage byte for byte (its design reference too), or, with none stored, the panel's mission, and storage is left empty as it was. It is not offered once the learner has made another mission in Launch. Orbit's hand-off lives in memory only, as Build's does; the flight it came from is still in Launch.

**EO-STO-1:** `tests/workspace-eo-sto-1.test.ts` compares storage against byte copies of main's files at 23ede7f; its step "every workspace key read" failed on the new key, which the reference refuses as unknown. A first proposal edited the reference copy; the review pointed out the owner's standing rule q04 B (a reference changes only in a bug-fix PR whose byte change is the fix), so that commit was dropped and `tests/eo-sto/ref/` is byte-identical to main (same blob). As #153 did for its one intended difference, the step now reads the reference's own key list, and a new test pins the difference to exactly `orbitlab.structure.v1`; every stored byte on every step is still compared. Older Orbitlab builds refuse a backup that contains a key they do not know (`parseWorkspaceArchive`), as for any new key.

## 8. Budget (D-38) — awaiting the owner

Measured on the final tree with `npx vite build` and `node scripts/bundle-budget.mjs`, against main's build at `3e1b48a` (same Vite):

| Group | Main | This tree | Ceiling | Over |
| --- | ---: | ---: | ---: | ---: |
| `index-*.js` | 2654.2 kB | 2840.2 kB | 2655.0 kB | +185.2 kB |
| `index-*.css` | 178.3 kB | 186.9 kB | 179.0 kB | +7.9 kB |
| `i18n-*.js` | 1732.5 kB | 1734.1 kB | 1733.0 kB | +1.1 kB |
| precache code | 14678.8 kB | 14874.9 kB | 14679.0 kB | +195.9 kB |
| first download (index.html and what it loads) | 5101.1 kB (1430.1 gzip) | 5297.2 kB (1486.6 gzip) | — | +196.1 kB (+56.5 gzip) |

CI runs this check (`ci.yml`, `deploy.yml`), so as it stands the branch would fail there. No ceiling was raised: D-38 needs the measured size, the feature, a named identical-output offset (none found) and the owner's approval.

**The other way, measured (not applied; on this branch before the review's fixes, which added about 9 kB, nearly all of it in the section's own code): the section loaded when it first opens** (`import()` in `main.ts`, the rest unchanged): `index-*.js` 2434.4 kB (−220 kB), `index-*.css` back to main's 178.3 kB, first download 5107.0 kB (+5.9 kB on main), the section's own chunk 166.6 kB of JS and 8.6 kB of CSS fetched when the section opens. But Rolldown then regroups shared code into new chunks that still load at start (`satellite-templates` 269.5 kB, `escape` 175.5 kB, `presets` 45.6 kB and three small ones; `lesson-file` 345 → 76 kB), so "other chunks" goes 668 kB over its 772 kB ceiling; precache code is still +181 kB (the service worker downloads the section's chunk in the background), and `i18n-*.js` +1.1 kB. It needs, besides the code (a loading and a failed-to-load state with a retry), the regrouped chunks named in `budgets.json` with `index`'s ceiling lowered by as much — a classification, as R1 did on 2026-10-03 — and the precache raise; or the section's chunk on demand (`src/pwa/manifest.ts`), which takes the raise away but makes the section need the network the first time, as its Soyuz model already does.

The owner's choice, then: (A) as it is — one file, every visitor downloads +196 kB (+57 kB gzip) at start; or (B) lazy — +6 kB at start, a `budgets.json` reclassification, and precache or on-demand for the section's chunk. Either way about half of the section's JS is its text in three languages (Thai 38 kB, Russian 33 kB, English 20 kB of source), which could also go into on-demand files. The model files (1.9 MB) are on demand and not precached.

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

Four more Claude agents, each with one lens on the fixes (the 3-D and assembly logic; the hand-offs; storage and tests; text and accessibility), read-only, then one more agent per finding trying to refute it. Of the 22 findings (all P2), the refuters confirmed 11 in the code reviewed and found the other 11 already fixed at the tip by the time they looked; none was refuted on its merits. Their findings and what was done:

| Lens | Finding | Outcome |
| --- | --- | --- |
| hand-offs | P2 — if the learner had chosen their own spacecraft in Orbit's planner, the read-back reported that craft's mass as what Orbit held, and called the hand-off wrong | **Fixed.** The receipt reports the satellite's mass as Orbit's hand-off panel shows it, and separately the mass Orbit's analyses use, with a note when they differ (`heldFromHandoff`) |
| hand-offs | P2 — the tests built the receipts themselves instead of calling the code the app uses; the journey's "Orbit holds" read the object the section sent | **Fixed.** The read-backs are pure functions (`heldFromHandoff` in `src/orbit/playground-model.ts`, `launchReceipt`), called by the playground, by `main.ts` and by the test, which adds a learner-chosen spacecraft and a Launch panel on another mission; the journey reads the playground's held values |
| hand-offs | P2 — "put back" could replace a mission the learner made in Launch after the send, and restored the panel's mission, not the stored one (at the Watch level the panel holds a viewer's launch) | **Fixed.** Offered only while Launch still holds what was sent; it puts back the stored mission byte for byte (with its design reference), or, with none stored, the panel's and leaves storage empty |
| hand-offs | P2 — notes stored already translated (a language switch left them in the old language) and never cleared; a put-back failure said "Could not send"; a read-back missing after Orbit had the satellite was called a refusal; Build's own design check was missing before Launch | **Fixed.** Notes are put into words when drawn and cleared when the design or the shown design changes; the put-back failure has its own words; a missing read-back is said as such; `satelliteDesignProblems` runs with the other checks |
| 3-D and assembly | P2 — when the Soyuz data itself failed, an empty "side view" panel was shown | **Fixed.** The side view is shown only when it has parts to draw |
| 3-D and assembly | P2 — an old comment above `viewAssembled` still stated the pre-fix rule | **Fixed** (removed) |
| 3-D and assembly | P2 — a new comment said a layer load carries on behind EduSat (it is cancelled and fetched again) | **Fixed** (reworded) |
| storage and tests | P2 — every failed save was blamed on full or blocked browser storage, also in a read-only second tab (the profile's `locked`), after a change in another tab (`stale`) or with no learner chosen | **Fixed.** Those say the profile is open read-only here or none is chosen; full or blocked storage keeps its own words |
| storage and tests | P2 — no test showed that the profile sets a damaged record aside before the section writes over it (dropping the key from the repository's table left every test green) | **Fixed.** `tests/structure-storage.test.ts` writes over five damaged forms through `workspaceStorage()`, as the section does, and finds each in the quarantine byte for byte; it fails, 5 of 7, with the key dropped from the table; a newer record is left alone; a read-only tab's write is the profile's `locked` |
| storage and tests | P2 — the storage note (and the send and assembly messages) were live regions made afresh on every render, against the fix's own rule | **Fixed.** Shown without a live role; said once, when they change, by the one live region that stays |
| text and accessibility | P2 — Shift + ↑/↓ panned against the arrow (← → and Shift-drag went with it) | **Fixed** |
| text and accessibility | P2 — the live region re-read the storage note with every message, stayed silent on a repeated refusal, and the energy verdict was still a live region rebuilt each render | **Fixed.** Each message is said once each time it is made (a repeat too), the storage note once when it changes, the verdict once for each design |
| text and accessibility | P2 — focus fell to the page after Remove and after a layer's Retry | **Fixed.** Focus goes to the part's tray button, to the layer's switch, else to the panel's heading |
| text and accessibility | P2 — "Checked … inclination within 0.05°" also for Launch, which holds a sun-synchronous target, not degrees | **Fixed.** "both sun-synchronous" there |
| text and accessibility | P2 — the put-back text promised the button until the page closes; the newer-record note did not say nothing is saved; the canvas's key list left out Space; the Thai selection read as an instruction; the mass-bound note did not say Rev. 13's value was unchecked too | **Fixed** in Thai, English and Russian |
| text and accessibility | P2 — the sections were called "Orbit"/"Launch"/"Build" in Thai and Russian, where the app's own tabs say วงโคจร/ปล่อยจรวด and «Орбита»/«Запуск»/«Конструктор» | **Fixed.** The app's own names |
| text and accessibility | P2 — without WebGL, a failed Soyuz data load pointed to a list and side view that were not there and offered no retry; messages and load reasons stored as finished text did not follow a language switch; an English-only error reached the load notes | **Fixed.** The failure and its retry also without WebGL; messages and reasons put into words when drawn; the files-from-two-versions case has its own words |

### 9.3 To hand this to Astra

Branch `claude/trusting-cannon-oah00c`, base `3e1b48a`; the files in §2; how to reproduce: §11; the checklist above; the open decisions in the status box. The points most worth a second pair of eyes: `previewMatrix` and `unitAxis` (pivots of turned strap-ons and panels), `simulatePower`'s splitting of stretches at full and at the floor, and the classification rules in `src/structure/soyuz.ts`.

## 10. Limits and open items

- The 2026-11-02 delivery was not reachable: the web model (2026-10-26) is the one used (§1).
- EN and RU text is a draft (marked on screen in those languages); the Soyuz part descriptions are the page's Thai only (said on screen).
- Phone checks are Chromium's emulation (390×844, touch) in this container, not a real phone; render cost on phones was not measured.
- Launch's earlier mission is kept in memory only: after a reload the button to put it back is gone (Launch then holds the EduSat mission, as after Build's "Fly it"). Orbit's earlier hand-off is not kept (it lives in memory, as Build's does).
- All measurements are with software WebGL (SwiftShader) on a 4-core Intel Xeon 2.1 GHz container (§6.1): a frame of the full Soyuz outside takes about 0.2 s there, 0.5 s with every layer (a real GPU draws it in milliseconds); creating the section's WebGL context took up to 12 s the first time while the machine was busy, about 5 s with it idle.
- D-25 asks for about 400 changed source lines per PR; this pilot adds about 6,000 lines of source (about 1,000 of them the section's text in three languages) and 1,100 of tests. A proposed split for merging: (1) model files, pure core and their tests; (2) viewer; (3) section, routing and text; (4) experiment and hand-offs. The owner decides.
- Not in this pilot (as asked): changing Soyuz, a vehicle library, a CAD tool, strength analysis, accounts, a large curriculum.

## 11. Trying it

On a machine with the repository at this branch: `npm ci`, then `npm run dev` and open `http://localhost:5173/#/structure/explore/soyuz-st31` (or `…/edusat`). A built copy: `npm run build && npm run preview`, then `http://localhost:4173/#/structure/explore/edusat`. The browser journey: `npm run build && node tests/browser/run.mjs structure-assembly`. After replacing the Anatomy page: `npm run structure`, then `npx vitest run tests/structure-model.test.ts`.

## 12. Revisions

On `claude/trusting-cannon-oah00c`, from `main` @ `3e1b48a`; committed in the cloud session only, **not pushed** (owner, 2026-11-09):

| Commit | What |
| --- | --- |
| `a8b6aaa` | the Soyuz-2.1b/Fregat model files (`npm run structure`), the section's pure core and its unit tests |
| `c1343a7` | the section: 3-D viewer, explore, assemble, my experiment, hand-offs, routing, text, journey, report |
| `caa92f9` | self-review fixes: an overstated Orbit claim corrected, more independent checks |
| `81c94b5` | the first review's fixes (§9.1), the put-back of Launch's mission |
| `f2de409` | the second review round's fixes (§9.2) |
| the commit after it | the information panel names the slot a part went into (a panel on another face); this report's final figures (checks, budget, performance, review) |

The commits follow the work, not mergeable steps, and only the tip was checked in full: `c1343a7` and `caa92f9` fail EO-STO-1's key step, which `81c94b5` makes compare the reference's own keys (§7); an earlier commit that edited the EO-STO-1 reference copy was dropped from this unpushed history, so `tests/eo-sto/ref/` is never changed. The branch's tip passes everything in §6 except the budget (§8).
