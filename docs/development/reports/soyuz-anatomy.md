# Soyuz Anatomy: the owner's 3-D Soyuz models in Build and in flight / นำแบบจำลอง Soyuz 3 มิติของเจ้าของเข้าโปรแกรม

> **สรุปสำหรับเจ้าของ (ภาษาไทย)**
>
> - นำไฟล์ Soyuz ทั้ง 3 ไฟล์ที่คุณทำแยกไว้เข้ามาในโปรแกรมแบบไม่แก้ไขแม้แต่ไบต์เดียว (`public/anatomy/`): Soyuz-2.1a กับยาน Soyuz MS, Soyuz-2.1a กับ Progress MS-26 และ Soyuz-2.1b กับ Fregat
> - **โหมดสร้างจรวด (Build › พื้นฐาน)**: เมื่อเลือก Soyuz-2.1a หรือ 2.1b จะมีปุ่ม "ดูภายในแบบ 3 มิติ" เปิดหน้าของคุณทั้งหน้า (ถังเชื้อเพลิง เครื่องยนต์ ท่อทาง แยกชิ้นและผ่าดูได้ คำอธิบายภาษาไทยครบ) ในหน้าต่างเต็มจอ สลับ Soyuz MS / Progress ได้ ปิดแล้วหน้าถูกปลดออกเพื่อคืนหน่วยความจำกราฟิก
> - **การบิน**: Soyuz-2.1a และ 2.1b วาดจากผิวด้านนอกของแบบจำลองของคุณ — บูสเตอร์ แกนกลาง โครงถักระหว่างขั้น Blok I, Fregat, หัวครอบสองซีก หอหนีภัย และยาน Soyuz MS / Progress MS ชิ้นที่แยกตัวก็ยังเป็นรูปทรงจากแบบจำลอง Progress กางแผงโซลาร์ด้วยบานพับในไฟล์ของคุณเอง Soyuz MS ใช้ปีกโซลาร์ของโปรแกรม (ไฟล์ของคุณมีแต่แบบพับ) ส่วนภายใน (ถัง ท่อ) ไม่วาดตอนบินตามที่ขอ ฟิสิกส์ไม่เปลี่ยน
> - ไฟล์โหลดเมื่อใช้เท่านั้น ไม่เข้าแคชออฟไลน์ตอนติดตั้ง (หน้าเว็บละราว 4.5 MB, ไฟล์ผิวสำหรับการบินราว 1–1.4 MB) ถ้าออฟไลน์และยังไม่เคยโหลด จรวดจะถูกวาดแบบเดิม
> - **ต้องตัดสินใจ (D-38)**: โค้ดใหม่ทำให้ขนาดแอปเกินเพดาน 16.6 kB (index +12.2, CSS +1.3, ข้อความแปล +3.3) จึงขอขึ้นเพดาน precache code 14654 → 14671 kB (offset ที่ระบุ: EQ-7) PR นี้รอคุณอนุมัติใน Merge Desk
> - **ขอให้ยืนยัน**: ไฟล์ทั้งสามเป็นงานของคุณเองใช่ไหม (NOTICE.md เขียนไว้อย่างนั้น) และชุดเครื่องมือ "Anatomy kit" ที่ฝังอยู่ในไฟล์มีเงื่อนไขการใช้งานอย่างไร

```yaml
package: none in the plan (owner's request in chat, 2026-10-28)
item: the owner's Soyuz Anatomy pages in Build, and their outside in the flight
change_kind: feature (render, Build UI, PWA on-demand files); physics unchanged
owner_authorization: 'owner in chat, 2026-10-28: "สามารถนำไฟล์จรวด Soyuz ที่ทำแยกมาใส่ในโปรแกรมนี้ได้มั้ยครับ", then, asked how: "แบบที่มีโครงสร้างภายในเช่นถังเชื้อเพลิง เอาไปใส่ในโหมดการสร้างจรวด ส่วนของการบินให้เอาแต่จรวดที่เห็นจริง เช่นโครงสร้างภายนอกและตัวแคปซูลของจรวด"'
branch: claude/tender-archimedes-b5bnl9
base: 7263004
budget: raise (D-38) — measured below; offset EQ-7; waits for the owner
merge: waits for the owner (Merge Desk): a new feature and a ceiling raise
```

## What the owner's files are

Each page is a self-contained viewer: a gzip+base64 "semantic scene" of the vehicle's solids
(`#anatomy-3d-data`, 0.1 m units, z up; 1,939–2,069 hosts), its Thai content and guide
(`#anatomy-content`), its build's source archive, two preview images rendered from the model,
and the viewer's own code (pose math, scene codec, mesher `buildSoyuzMeshes`, a WebGL renderer
with `materialOf`). It makes no outside request and uses no storage (checked: no `fetch`,
`localStorage`, `indexedDB`, CDN or external `src`/`href` but its source links). Built at
48 radial segments it is 1.41–1.44 million triangles, which takes the page 10–20 s of CPU to build;
that rules out building it during a launch.

| Page | File | Bytes | SHA-256 |
| --- | --- | ---: | --- |
| Soyuz-2.1a + Soyuz MS ("Realism v5") | `soyuz-2-1a-soyuz-ms.html` | 4,269,424 | `0cb367fe…843ceb7` |
| Soyuz-2.1a + Progress MS-26 | `soyuz-2-1a-progress-ms-26.html` | 4,593,665 | `ed93aba0…df13990a` |
| Soyuz-2.1b + Fregat, ST fairing | `soyuz-2-1b-fregat-st31.html` | 4,550,173 | `b63220e1…9393bf4c` |

## Build: the pages whole

`src/ui/build/anatomy-dialog.ts`: on the Watch level, "Inside, in 3-D" (th "ดูภายในแบบ 3 มิติ",
ru "Внутри, в 3D") at the end of the view buttons, for `soyuz21a` (both pages) and `soyuz21b`.
A full-size modal (the app's `Modal`: focus trap, Escape, focus back to the button) with the page
in an iframe, the payload switch, a note that the guide is Thai and the model loads on demand,
and "Open in a new tab", and a loading note until the page has arrived. Each page gets a frame of
its own, its address set before it is in the document, and closing removes it: loading a page into
a frame that had shown one would add a history entry (Back would step the hidden frame), and
removing it frees its WebGL context at once. A modal, not an inline frame, so the page's wheel zoom
never takes the Build page's scroll.

## Flight: the outside only

`scripts/anatomy-meshes.mjs` (`npm run anatomy`) runs each page's own model code in an empty
`vm` context and keeps the hosts seen from outside: `shell` and `structural` of the strap-ons
(booster-b only: the other three are it turned by 90°, checked by area, area-weighted centre and
box, worst mismatch 1.2×10⁻⁵ of the area and 0.16 mm), Blok A with its truss, Blok I (the 2.1b's
skirt panels as a part of their own), Fregat (all but its avionics boxes), the fairing in its two
halves, the escape tower and the spacecraft. The engine bells are left to the flight, which
gimbals and lights its own. Materials are the page's `materialOf` (colour, roughness, metalness)
times each detail's tone. Output per page, welded and quantized (u16 positions over each mesh's
box, i8 normals): 83,400 / 57,256 / 63,096 triangles, 1,419 / 996 / 971 kB (0.62 / 0.40 / 0.43 MB
gzip), each carrying its page's SHA-256 (`tests/anatomy.test.ts` fails if a page is replaced and
the meshes are not remade).

`src/render/anatomy.ts` fits the parts into the physics' stack (`stackLayout`), render only:

| Part | Where | Scale along its axis |
| --- | --- | --- |
| Blok A + truss | stage 0, model base → 0, Blok I's base → the stage's height | 1.020 (2.1a), 1.022 (2.1b) |
| strap-ons | each unit, Blok A's map, less the unit's offset | as Blok A |
| Blok I | stage 1, base → 0, the next part's base → its 6.7 m | 0.957 (2.1a), 1.025 (2.1b) |
| Fregat | stage 2, dropped onto Blok I's top (over the layout's adapter) | 1 |
| fairing halves | the fairing group, base on Blok I's top (2.1b: round Fregat, as ST flies) | 1 |
| escape tower | `CrewedTop.tower`, on the model's fairing | 1 |
| Soyuz MS / Progress MS | the payload, 0.20 m above Blok I's top as the model has it | 1 |
| mission's own satellite on 2.1b | on the model's Fregat (`seat` −2.13 m) | — |

`RocketView.mountAnatomy` hides the R-7's own bodies (and their pad frost), keeps the bells,
plumes and flash (the strap-ons' moved 0.36 m up and 0.2 m out to hang under the model's strap-ons),
the aft skirt's timing (the 2.1b model's skirt falls away whole when the flight sheds its own) and
the tower's jettison, and takes the camera's height and the Mach-1 collar from the model's fairing; `DebrisView` draws spent strap-ons, Blok A, Blok I, Fregat and the fairing halves
from the model. `main.ts` loads the meshes when a matching mission is set up and mounts them when
they arrive; any other vehicle, a remix of a Soyuz (`derivedFrom`), a load still pending or a
failed load (offline before first fetch) is drawn exactly as before.

Not done here (follow-ups if wanted): the abort scenario's escaping head section
(`render/escape.ts`) is still the simulator's drawing; the fairing's flag and lettering (the
page's `paintOf`) are not baked into the meshes; the pad frost is not drawn on the model.

## Checks

| Check | Result |
| --- | --- |
| `npx tsc --noEmit` | clean |
| `tests/anatomy.test.ts` (new) | 16/16: on-demand routes; meshes match their pages' SHA-256; parts per page; page choice per vehicle and payload (none for other vehicles and remixes); fit within a few per cent; 2.1b fairing round Fregat and satellite on Fregat; each variant mounted in a RocketView with its parts in place and its own bodies hidden, the 2.1b skirt shed at 14.06 s; Progress hinges against the page's own rotation order; Soyuz MS folded arrays → wings; the strap-ons' bells under the model's strap-ons; the camera height and Mach-1 collar on the model's fairing; spent Blok I recorded without its profile (point mass), spent Fregat with its top on the separation plane, none on another vehicle |
| `tests/i18n.test.ts`, `tests/i18n-thai-terms.test.ts` | 23/23 |
| `tests/soyuz-render.test.ts`, `tests/vostok-render.test.ts`, `tests/privacy-inventory.test.ts`, `tests/pwa.test.ts`, `tests/architecture.test.ts` | green (privacy: `src/render/anatomy.ts` added to the files that fetch, same-origin files of the app) |
| journey `soyuz-anatomy` (new) | 1/1, 93 s: crewed 2.1a model mounted (core, 4 strap-ons, Blok I, both fairing halves, tower, Soyuz MS); 4 spent strap-ons drawn from the model after T+118 s; Progress model mounted; Build offers the pages for 2.1a and 2.1b and none for Falcon 9, opens both 2.1a pages, removes the frame on close with the history length unchanged, focus back; no console errors |
| `npx vite build` + `node scripts/bundle-budget.mjs` | ok with the raised ceilings below |
| Visual (SwiftShader, 1280×800) | pad, T+16, strap-ons away, fairing away, core separation, skirt shed, Soyuz MS and Progress MS in orbit with arrays out, 2.1b with the satellite on Fregat; Build dialog in Thai |

## Budget (D-38)

| Group | Ceiling | Measured with the change | Without | Delta |
| --- | ---: | ---: | ---: | ---: |
| `index-*.js` | 2635 → 2647 | 2647.0 kB (2,646,971 B) | 2634.8 | +12.2 |
| `index-*.css` | 177 → 179 | 178.2 kB (178,227 B) | 176.9 | +1.3 |
| `i18n-*.js` | 1729 → 1733 | 1732.3 kB (1,732,276 B) | 1729.0 | +3.3 |
| precache code | 14654 → 14671 | 14670.6 kB | 14654.0 | +16.6 |
| precache | 16053 → 16070 | 15789.8 kB (committed snapshots) | — | code +17 |

The pages and meshes (16.9 MB) are in no ceiling: `anatomy/` is on demand. Without that entry the
build precaches them and fails the code ceiling by 16.9 MB (measured). Named offset: EQ-7 (split
the first-view code, K2). The raise stands only with the owner's approval.
