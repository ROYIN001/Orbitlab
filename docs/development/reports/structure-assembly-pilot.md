# Structure & Assembly pilot / รุ่นนำร่องหมวด "โครงสร้างและการประกอบ"

> **สถานะปัจจุบัน (บันทึกเดียวที่เป็นปัจจุบัน — แก้ที่นี่ทุกครั้งที่สถานะเปลี่ยน)**
>
> - สาขา: `claude/trusting-cannon-oah00c` · ฐาน: `main` @ `3e1b48a` (2026-11-07, "Records: fold #214") · commit ของงานนี้: ดู §12
> - ช่วงงาน 1–5 ทำครบ: ตรวจซอร์ซ → viewer/ทางเข้า → ประกอบตามแบบ → แบบทดลองดาวเทียม → ส่งต่อ Orbit/Launch, ตรวจในเบราว์เซอร์จริง
> - **ยังไม่ push / merge / เผยแพร่** ตามคำสั่งเจ้าของ (2026-11-09) งานอยู่ใน commit ในเครื่องคลาวด์เท่านั้น
> - ผู้ทำงาน: Claude (ไม่ใช่ GPT-6.1 Sol) · ผู้ตรวจทาน: เอเจนต์ Claude แยกบริบท (ไม่ใช่ GPT-6 Astra ซึ่งเรียกจากที่นี่ไม่ได้) — §9
> - **รอเจ้าของตัดสิน:** (1) ขยายเพดานขนาดตาม D-38 (§8) (2) การแก้สำเนาอ้างอิง EO-STO-1 เพื่อรับคีย์ใหม่ (§7) (3) ขนาด PR เกินแนวทาง D-25 (§10) (4) ส่งชุดส่งมอบ Soyuz 2 พ.ย. มาให้เทียบ (§1)
>
> **สรุปสำหรับเจ้าของ (ภาษาไทย)**
>
> - เพิ่มหมวดที่ 4 "โครงสร้าง" ในแถบบน เปิดด้วยลิงก์ตรง `#/structure/<ระดับ>/<โมเดล>` เช่น `#/structure/explore/soyuz-st31` หรือ `#/structure/explore/edusat` ใช้ระดับ พื้นฐาน/ทดลอง/วิศวกร ของ Orbitlab เป็นระดับความลึก เปลี่ยนระดับแล้วชิ้นที่เลือก แบบ และความคืบหน้าคงอยู่
> - **Soyuz-2.1b/Fregat ST31** มาจากหน้า Anatomy ของคุณใน repo (รุ่น `family-v1-20261026`) ครบ 2,069 ชิ้นพร้อมรหัสเดิม คำอธิบาย ข้อมูล และแหล่งอ้างอิงภาษาไทยของหน้า แบ่งไฟล์เป็นเปลือกนอก/ภายใน/เครื่องยนต์ โหลดเฉพาะเมื่อใช้ เลือกชิ้นได้ทั้งจากภาพและรายการ ผ่าซีกตามครึ่งที่หน้าแบ่งไว้ ทำเปลือกโปร่ง แยกชิ้น เปิดหัวครอบ ซ่อน/แสดงเฉพาะ คืนสภาพ ระบายสีตามชนิดชิ้นส่วนหรือสถานะข้อมูล ประกอบชุดหลัก 11 ชุดตามแบบ (ลำดับ ตำแหน่ง ทิศทาง) มีถอด ย้อนกลับ เริ่มใหม่ และตรวจความครบจากความสัมพันธ์ ไม่เปิดให้ดัดแปลงจรวด
> - **EduSat-3U** ดาวเทียมแนว CubeSat ที่สร้างเพื่อการศึกษา (ระบุชัดว่าไม่ใช่ OneWeb) ประกอบได้ 13 ชุด แล้วสร้าง "แบบทดลองของฉัน" ได้ทันทีโดยไม่ต้องผ่านบทเรียน เปลี่ยนแบตเตอรี่ (1 หรือ 2 เซลล์) และกล้อง (กลางวัน/แสงไฟกลางคืน) ภาพ รายการ มวล และสมดุลพลังงาน 3 รอบวงโคจรเปลี่ยนจากข้อมูลชุดเดียวกัน กรณีตัวอย่าง: กล้องกลางคืน + แบต 1 เซลล์ → ไฟไม่พอ 10.9 นาทีต่อรอบ, + แบต 2 เซลล์ → ผ่านแต่หนักขึ้น 60 g
> - ส่งแบบทดลองไป **Orbit** ได้จริง (ใช้ `designHandoff` เดิม) และไป **Launch** เป็นสถานการณ์สมมติบน Soyuz-2.1b/Fregat จาก Vostochny (ใช้ `designMissionDocument` เดิม) ก่อนส่งแสดงค่าที่จะส่ง/ไม่ส่ง หลังส่งแสดงมวลที่ปลายทางรับไว้ ตรวจแล้ว 2.070 kg ตรงกัน ถ้าแก้แบบหลังส่งจะขึ้นเตือน
> - ตรวจแล้ว: ชุดทดสอบใหม่ 42 ข้อ, ชุดทดสอบเดิมที่เกี่ยวข้องผ่าน, browser journey ผ่านครบเส้นทางทั้งเดสก์ท็อปและจอมือถือแบบสัมผัส (รายละเอียด §6) **ค่าที่ยังไม่ผ่าน:** งบขนาดแอป (§8) ซึ่งต้องให้คุณอนุมัติตาม D-38

```yaml
package: none in the plan (owner's request in chat, 2026-11-09)
item: a Structure & Assembly section — explore, assemble and modify (educational satellite only)
change_kind: feature (new section, render, UI, storage key, PWA on-demand files); physics unchanged
owner_authorization: 'owner in chat, 2026-11-09: "ฉันต้องการให้คุณเริ่มพัฒนาส่วน “โครงสร้างและการประกอบ” ใน Orbitlab ตามข้อกำหนดต่อไปนี้ ให้ทำจนได้รุ่นนำร่องที่ใช้งานจริง ตรวจสอบแล้ว และเปิดให้ฉันทดลองในเครื่องได้" … "ยังไม่อนุญาตให้ push, merge หรือเผยแพร่ขึ้นเว็บจริง"'
branch: claude/trusting-cannon-oah00c
base: 3e1b48a961c5d79b8dbd68e0471878567c10c748
budget: raise needed (D-38) — index-*.js +164.4 kB, index-*.css +7.9 kB, i18n-*.js +1.1 kB, precache code +175.1 kB; no ceiling raised; awaiting the owner
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
- **Code in the main bundle, not a chunk of its own.** Loaded lazily, the section made Vite/rolldown regroup the app's shared chunks (three new chunks, `lesson-file` cut from 345 to 76 kB, 220 kB moved out of `index`), which no budget group covers. Imported normally, no existing chunk moves (checked module by module against the base build); the cost is in the index groups (§8).
- **The section's words live with it** (`src/ui/structure/text.ts`, the `Record<Lang, …>` pattern of `help-content.ts`), held to the dictionaries' rules by `tests/structure-text.test.ts`; only the four section-switch keys are in the dictionaries.
- **3-D starts after the section is painted.** Creating a second WebGL context took 11.8 s the first time in this container's software GL (a bare `getContext('webgl2')` measured alone; 5 ms afterwards), so the section draws first with its loading note.
- **One renderer for the section's life.** Leaving the section aborts its fetches, frees every geometry, material and texture and stops drawing; the context is kept, because a browser drops the oldest context past about sixteen and that would raise the app's "view lost" note.

## 3. Acceptance criteria and results

| # | เกณฑ์ | ผล | หลักฐาน |
| --- | --- | --- | --- |
| A1 | เปิดหมวดใหม่ด้วยลิงก์ตรง และกลับไปส่วนเดิมได้ | ผ่าน | journey: `#/structure/explore/soyuz-st31` opens directly; Back from Launch returns to the finished assembly; `tests/structure-model.test.ts` (addresses) |
| A2 | เลือกจากภาพและรายการได้ตรงกัน ข้อมูลและกล้องตามชิ้นที่เลือก | ผ่าน | journey: list pick shows the core and its 5 relations; a press on the view picks a subsystem and the list marks it; the camera turns about the pick and frames list picks |
| A3 | เปิดภายใน แยกส่วน คืนสภาพ โดยโมเดลไม่เสียสถานะ | ผ่าน | journey: cutaway loads the inside layer; apart 100 %; Reset restores; assembly completion checks the view's own transforms (`viewAssembled`: every assembly visible, translation and rotation exactly zero) |
| A4 | ประกอบ Soyuz และดาวเทียมแบบตั้งต้นได้ จัดการติดตั้งผิด/ไม่ครบ | ผ่าน | `tests/structure-assembly.test.ts` (14 tests); journey: out of order, another block's place, wrong way round each refused with its reason; undo; 11/11 and 13/13 complete with the relational check |
| A5 | เปลี่ยนระดับแล้วแบบและความคืบหน้าคงเดิม | ผ่าน | journey: Fregat stays selected from ทดลอง to วิศวกร; the assembly and design are per section, not per level |
| A6 | เปลี่ยนแบต/อุปกรณ์แล้วภาพ รายการ มวล ผลพลังงานเปลี่ยนจากข้อมูลจริง | ผ่าน | one design object feeds `partsOf`, `edusatMeshes`, `eduFigures`, `eduSatelliteDesign`; journey checks mass 1.810 → 2.010 → 2.070 kg and the verdicts |
| A7 | มีกรณีผ่านและกรณีไม่พอที่อธิบายได้จากค่าที่แสดง | ผ่าน | §5 table; `tests/structure-power.test.ts` (10 tests, worked cases) |
| A8 | ส่งไป Launch หรือ Orbit ได้จริง ตรวจค่าที่ปลายทางได้รับ | ผ่าน | journey reads `window.orbitlab.handoff` (Orbit: 2.07 kg, kind science, no engine) and `panel.missionState()` (Launch: payload 2.07 kg, Soyuz-2.1b, Vostochny) |
| A9 | แก้แบบไม่แสดงผลเก่าเป็นของแบบใหม่ ไม่เขียนทับงานเดิม | ผ่าน | results carry `designKey` and are shown only for the current design; a change after sending is flagged; my experiment is a copy (reference frozen); stored under its own profile key; reload keeps it (journey) |
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

Reference: 1 cell + day camera, **1.810 kg**. Pilot mass bound 4.00 kg (CDS Rev. 13 for a 3U; later revisions and launch providers differ — said on screen).

### 4.3 Sources and figures not opened directly

nasa.gov and azurspace.com could not be fetched from this session (network policy). The cell's 30.18 cm² is confirmed by search results of AZUR's 4×8 datasheet; 29.5 % efficiency is the figure Orbitlab already cites (NASA SST-SoA Table 3-1, `src/data/satellite-templates.ts`); the CDS 3U envelope by search results citing Rev. 14.1, the 4.00 kg limit by secondary sources citing Rev. 13 (Rev. 14's own limit was not verified); the 18650 figures by search results of the cell's specification copies. The remaining EduSat figures are assumptions of the scenario and are labelled so.

## 5. The energy balance

Scenario (on screen): circular 500 km, β = 0° (the longest shadow: 35.75 min of a 94.62 min orbit, `eclipseDuration`/`circularPeriod`), starting at sunrise with a full battery, three orbits. Panels in sunlight S·A·η·I_d/π = 1361 × 0.0845 × 0.295 × 0.77 / π = **8.32 W** (a slow spin about the long axis, square to the Sun: Orbitlab's `MOUNT_FACTOR.spinner`), × X_d = 0.8 to the bus = 6.65 W. Surplus charges the battery at η = X_e/(X_d·η_BAT) = 0.833; the battery gives back at η_BAT = 0.9. Full at capacity (more is shed), floor at 30 % depth of discharge (below it, loads go unpowered: a shortfall). Integrated exactly per stretch of constant power.

| Design | Mass | Battery | Shadow draw | Usable | Result |
| --- | ---: | ---: | ---: | ---: | --- |
| 1 cell + day camera (reference) | 1.810 kg | 9.36 Wh | 0.86 Wh | 2.81 Wh | all powered; lowest 8.50 Wh (91 %) |
| 1 cell + night camera | 2.010 kg | 9.36 Wh | 3.64 Wh | 2.81 Wh | **short 10.9 min each orbit, 0.75 Wh** at the end of the shadow |
| 2 cells + day camera | 1.870 kg | 18.72 Wh | 0.86 Wh | 5.62 Wh | all powered |
| 2 cells + night camera | 2.070 kg | 18.72 Wh | 3.64 Wh | 5.62 Wh | all powered; lowest 15.08 Wh (81 %); full again before each shadow |

Checks (`tests/structure-power.test.ts`): a constant load drains P·t/η_BAT; the floor and the unpowered energy after it; a full battery sheds exactly the sunlit surplus; at the array power `arrayPowerRequired` asks for and a battery of `batteryCapacity`, an orbit balances exactly and the battery reaches its depth of discharge exactly at the end of the shadow (the SMAD identity X_e = X_d·η_charge·η_BAT); the EduSat cases above, worked apart. The steady-state SMAD check is also shown at the วิศวกร depth (array 7.78 W needed vs 8.32 W; battery 12.13 Wh needed with the night camera). Not modelled: temperatures, stresses, attitude changes while imaging, battery ageing, voltages, real mission life.

The bench's balance uses this closed-form shadow; Orbit computes light and shadow from the Sun's position at the date — two separate calculations, said on the hand-off panel. The orbit handed on (500 km sun-synchronous, node at 12:00) keeps β near 0 all year, so the two shadows are close.

## 6. Checks run

| Check | Result |
| --- | --- |
| `npx tsc --noEmit` | pass |
| `npx vite build` | pass |
| New unit tests `tests/structure-{assembly,power,model,progress,text}.test.ts` | 42/42 pass |
| Existing tests touched by the change (i18n, app-mode, section-nav-model, section-plan, architecture, privacy-inventory, pwa, repo-hygiene, workspace-profiles, anatomy, i18n-thai-terms, workspace-eo-sto-1) | pass (EO-STO-1 after §7) |
| `node --test tests/verification/*.test.mjs tests/browser/shard.test.mjs` | 93/93 pass |
| Full `npx vitest run` | see §12 (run on the final tree) |
| Browser journey `structure-assembly` (`node tests/browser/run.mjs structure-assembly`, built `dist`, Chromium 153, SwiftShader) | pass (desktop 1440×900 Thai; phone 390×844 touch, reduced motion) |
| `node scripts/bundle-budget.mjs` | **fails** — §8 |

## 7. Storage

`orbitlab.structure.v1` in the learner's profile (registered in `WORKSPACE_KEYS`, quarantined before an unreadable overwrite like the other versioned keys, named on the privacy page): the model and activity last open, each model's placements, when each was first completed, "my experiment" and which design is shown. A damaged or newer record is never written over. Nothing else of the profile is touched. Sending to Launch or Orbit replaces the mission or orbit open there, as Build's own "Fly it" and "Send to Orbit" do, and the panel says so; saved designs and files are not changed.

**For review (EO-STO-1):** `tests/workspace-eo-sto-1.test.ts` compares storage against byte copies of main's files at 23ede7f; reading every registered key through the reference copy failed on the new key. `tests/eo-sto/ref/workspace/registry.ts` was given the one new key (nothing else) in its own commit; its harness says such a change is the review's to decide. Older Orbitlab builds refuse a backup that contains a key they do not know (`parseWorkspaceArchive`), as for any new key.

## 8. Budget (D-38) — awaiting the owner

Measured against the committed ceilings (`node scripts/bundle-budget.mjs` on this tree; base build for comparison):

| Group | Base | This tree | Ceiling | Over |
| --- | ---: | ---: | ---: | ---: |
| `index-*.js` | 2654.2 kB | 2819.4 kB | 2655.0 kB | +164.4 kB |
| `index-*.css` | 178.3 kB | 186.9 kB | 179.0 kB | +7.9 kB |
| `i18n-*.js` | 1732.5 kB | 1734.1 kB | 1733.0 kB | +1.1 kB |
| precache code | 14678.8 kB | 14854.1 kB | 14679.0 kB | +175.1 kB |

No ceiling was raised: D-38 needs the measured size (above), the feature (this section), a named identical-output offset (none found in this pilot) and the owner's approval. About half of the JS is the section's text in three languages (Thai 31 kB, Russian 26 kB, English 17 kB of source). Ways to bring it down, each the owner's choice: (a) the section's text as on-demand files beside the model files (about −60 kB of precache, but the section's words then need the network the first time, as its Soyuz model already does); (b) a chunk of its own once the bundle's chunk groups are reworked so a lazy section does not regroup them (about −165 kB from the first download, not from the installed size); (c) fewer words at the พื้นฐาน depth. The model files (1.9 MB) are on demand and not precached.

## 9. Review

The owner asked for GPT-6.1 Sol to build and GPT-6 Astra to review. Neither is available here: the work was done by Claude, and the review by a second Claude agent with its own context, read-only, given the owner's review checklist (mass counted once, units/axes/pivots, one design behind picture/list/figures, hand-off values, stale results, reference vs experiment, user work preserved, claims within the model). **This is not a review by Astra.** Findings and what was done with each: §9.1 (filled in after the review).

### 9.1 Findings

(pending — see §12)

### 9.2 To hand this to Astra

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
