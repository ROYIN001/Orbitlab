# Soyuz Anatomy: the owner's 3-D Soyuz models in Build and in flight / นำแบบจำลอง Soyuz 3 มิติของเจ้าของเข้าโปรแกรม

> **สรุปสำหรับเจ้าของ (ภาษาไทย)**
>
> - นำไฟล์ Soyuz ทั้ง 3 ไฟล์ที่คุณทำแยกไว้เข้ามาในโปรแกรมแบบไม่แก้ไขแม้แต่ไบต์เดียว (`public/anatomy/`): Soyuz-2.1a กับยาน Soyuz MS, Soyuz-2.1a กับ Progress MS-26 และ Soyuz-2.1b กับ Fregat
> - **โหมดสร้างจรวด (Build › พื้นฐาน)**: เมื่อเลือก Soyuz-2.1a หรือ 2.1b จะมีปุ่ม "ดูภายในแบบ 3 มิติ" เปิดหน้าของคุณทั้งหน้า (ถังเชื้อเพลิง เครื่องยนต์ ท่อทาง แยกชิ้นและผ่าดูได้ คำอธิบายภาษาไทยครบ) ในหน้าต่างเต็มจอ สลับ Soyuz MS / Progress ได้ ปิดแล้วหน้าถูกปลดออกเพื่อคืนหน่วยความจำกราฟิก ระหว่างที่หน้ากำลังสร้างแบบจำลอง (10–20 วินาทีบนเครื่องช้า แอปจะค้างช่วงนั้น) มีข้อความบอกไว้จนกว่าจะสร้างเสร็จ กด Tab เข้าไปใช้ปุ่มในหน้าได้ และหน้าต่างปิดเองเมื่อออกจาก Build หรือเปลี่ยนระดับ
> - **การบิน**: Soyuz-2.1a และ 2.1b วาดจากผิวด้านนอกของแบบจำลองของคุณ — บูสเตอร์ แกนกลาง โครงถักระหว่างขั้น Blok I, Fregat, หัวครอบสองซีก หอหนีภัย และยาน Soyuz MS / Progress MS ชิ้นที่แยกตัวก็ยังเป็นรูปทรงจากแบบจำลอง Progress กางแผงโซลาร์ด้วยบานพับในไฟล์ของคุณเอง Soyuz MS ใช้ปีกโซลาร์ของโปรแกรม (ไฟล์ของคุณมีแต่แบบพับ) ติดบานพับที่โคนแผงพับของแบบจำลอง ส่วนท้ายของขั้นที่ 3 (ตัวเครื่องยนต์ โครงรับแรงขับ ก้นถังออกซิเจน) วาดจากแบบจำลองด้วย เพราะมองเห็นได้จริงผ่านโครงถักและหลังสลัดกระโปรงท้าย ปลายลำตัวของ Blok A, Blok I และ Progress MS ปิดด้วยชิ้นภายในที่ปิดปลาย (ฐานรับแรงขับ โดมถัง) จึงไม่เป็นท่อกลวงที่มองทะลุได้อีก ปลายท่อไอพ่นของโปรแกรมย้ายไปต่อกับห้องเผาไหม้ของแบบจำลองพอดี ทั้งของขั้นที่ 3 และของ Fregat (S5.92) และไฟของหอหนีภัยตอนดึงตัวออกพุ่งจากหัวฉีด 12 ตัวของแบบจำลอง ส่วนภายในอื่น (ท่อ อุปกรณ์) ไม่วาดตอนบินตามที่ขอ ฟิสิกส์ไม่เปลี่ยน
> - ไฟล์โหลดเมื่อใช้เท่านั้น ไม่เข้าแคชออฟไลน์ตอนติดตั้ง (หน้าเว็บละราว 4.5 MB, ไฟล์ผิวสำหรับการบินบีบอัดแล้วเหลือ 0.17–0.31 MB จากเดิม 1.2–2 MB) ถ้าออฟไลน์และยังไม่เคยโหลด หรือเบราว์เซอร์คลายไฟล์บีบอัดไม่ได้ จรวดจะถูกวาดแบบเดิม
> - **ต้นทุนที่ควรตัดสินใจ**: ภารกิจเด่น (Soyuz พาลูกเรือไป ISS) เป็นภาพแรกของหน้าแรกและของโหมดดู และเป็นค่าเริ่มต้นของแผงภารกิจ แอปจึงโหลดแบบจำลอง Soyuz MS ทันทีที่ตั้งภารกิจ เกือบทุกคนที่เข้าครั้งแรกจึงโหลดไฟล์นี้ ตอนนี้ 305 kB (เดิมราว 2 MB) ถ้าไม่ต้องการ อีกทางคือโหลดเมื่อเริ่มบินเท่านั้น (จรวดบนฐานยิงจะเป็นแบบเดิมจนกว่าจะเริ่มบิน)
> - **ต้องตัดสินใจ (D-38)**: โค้ดใหม่ทำให้ขนาดแอปเกินเพดาน 21.4 kB (index +16.6, CSS +1.4, ข้อความแปล +3.5) จึงขอขึ้นเพดาน precache code 14654 → 14676 kB (offset ที่ระบุ: EQ-7) คุณอนุมัติแล้วในแชต 2026-10-28 ("1. อนุมัติ")
> - **รอบตรวจที่สอง**: แก้ตามที่ผู้ตรวจพบครบทุกข้อ (รายการในหัวข้อ "Second review round") รวมถึงหัวเชื่อมต่อ (docking probe) ของยาน Soyuz MS ที่เคยจมเข้าไปในพอร์ตของสถานีราว 1.0 m ตอนจับยึด (ตอนนี้ปลายหัวเชื่อมต่ออยู่ตรงที่ฟิสิกส์คำนวณ) และขั้นที่ใช้แล้ว (บูสเตอร์ Blok A Blok I Fregat) ที่เคยไม่มีปากท่อไอพ่น (ตอนนี้วาดปากท่อตามตำแหน่งห้องเผาไหม้ในแบบจำลอง)
> - **ขอให้ยืนยัน**: ไฟล์ทั้งสามเป็นงานของคุณเองใช่ไหม (NOTICE.md เขียนไว้อย่างนั้น) และชุดเครื่องมือ "Anatomy kit" ที่ฝังอยู่ในไฟล์มีเงื่อนไขการใช้งานอย่างไร

```yaml
package: none in the plan (owner's request in chat, 2026-10-28)
item: the owner's Soyuz Anatomy pages in Build, and their outside in the flight
change_kind: feature (render, Build UI, PWA on-demand files); physics unchanged
owner_authorization: 'owner in chat, 2026-10-28: "สามารถนำไฟล์จรวด Soyuz ที่ทำแยกมาใส่ในโปรแกรมนี้ได้มั้ยครับ", then, asked how: "แบบที่มีโครงสร้างภายในเช่นถังเชื้อเพลิง เอาไปใส่ในโหมดการสร้างจรวด ส่วนของการบินให้เอาแต่จรวดที่เห็นจริง เช่นโครงสร้างภายนอกและตัวแคปซูลของจรวด"'
branch: claude/tender-archimedes-b5bnl9
base: 7263004
budget: raise (D-38) — measured below; offset EQ-7; approved by the owner in chat, 2026-10-28 ("1. อนุมัติ")
merge: the owner's (Merge Desk): a new feature; the ceiling raise approved in chat, 2026-10-28
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
and "Open in a new tab", and a loading note over the frame until the page has built its model. The
page is of the app's own origin, so it builds on the app's thread (10–20 s on a slow machine, the
app held still meanwhile); the note says so, and stays until the page's root drops its
`data-loading`. Each page gets a frame of its own, its address set before it is in the document,
and closing removes it: loading a page into a frame that had shown one would add a history entry
(Back would step the hidden frame), and removing it frees its WebGL context at once. The frame is
one of the dialog's Tab stops (`iframe` in the `Modal`'s focus trap), so the keyboard reaches the
page's own controls; Escape there re-homes the model's view (the page's own key), elsewhere it
closes the dialog. Leaving Build or changing its level closes the dialog. Build's view buttons wrap
on a 320 px phone instead of clipping "Inside, in 3-D". A modal, not an inline frame, so the page's
wheel zoom never takes the Build page's scroll.

## Flight: the outside only

`scripts/anatomy-meshes.mjs` (`npm run anatomy`) runs each page's own model code in a fresh `vm`
context, apart from the script's globals (`vm` is not a sandbox, so it is run only on the owner's
pages), and keeps the hosts seen from outside: `shell` and `structural` of the strap-ons
(booster-b only: the other three are it turned by 90°, checked by area, area-weighted centre and
box, worst mismatch 1.2×10⁻⁵ of the area and 0.16 mm), Blok A with its truss, Blok I (the 2.1b's
skirt panels as a part of their own), Fregat (all but its avionics boxes), the fairing in its two
halves, the escape tower and the spacecraft. It also keeps the few inside hosts that close each
body's ends (`CLOSURE`): the strap-ons' and Blok A's aft rim and thrust platform, Blok A's oxygen
tank (its dome under the truss) and the guidance deck over it, the Progress's aft thrust deck, and
Blok I's tanks. Without them Blok A, Blok I and the Progress MS were open tubes, seen through from
below or through the truss. Blok I's aft bay is kept too, as its own part `bay`: everything of
Blok I that reaches below the bottom of its lowest tank (the engine's body, thrust frame, the
oxygen tank's dome, the helium bottles), which the 2.1a shows through its open truss and the 2.1b
once its skirt is shed. The combustion chambers and their jackets are left to the flight, which
gimbals and lights its own; the script records where each chamber sits (bearing, radius, top and
exit) in its part's header (`nozzles`), so the flight sets its bells there: Blok I's chambers on
the `bay`, Fregat's S5.92 main chamber on `fregat`. The escape tower's 12 jettison nozzles, which
the model draws, are recorded the same way on `escape`, for the tower's jettison fire. Materials
are the page's `materialOf` (colour, roughness, metalness) times each detail's tone.

Output per page, welded and quantized (u16 positions over each mesh's box, i8 normals), format
version 2: the arrays laid out in byte planes (each axis's position steps from the vertex before,
low bytes then high bytes; the normals axis by axis; one code per index, 0 for the next new vertex,
else how far back from it), and the whole file gzip-compressed. The host sends a `.bin` as it is;
the app inflates it with `DecompressionStream` (`inflateAnatomy`), and a browser without it draws
the vehicle as before. Each file carries its page's SHA-256 (`tests/anatomy.test.ts` fails if a page
is replaced and the meshes are not remade).

| Mesh file | Triangles | Raw | As fetched (gzip) | At a8c58f3 (format 1, sent raw) |
| --- | ---: | ---: | ---: | ---: |
| Soyuz MS | 131,960 | 1,944.3 kB | 305.2 kB | 125,816 triangles, 1,977.3 kB |
| Progress MS-26 | 106,608 | 1,551.7 kB | 234.0 kB | 99,672 triangles, 1,543.8 kB |
| Fregat | 83,736 | 1,165.4 kB | 172.8 kB | 80,128 triangles, 1,188.8 kB |

The added triangles are those closing hosts. What the first visit costs: the featured launch (the
crewed Soyuz to the ISS, the landing page's and the viewer's first view, and the mission panel's
default) is a Soyuz-2.1a with a crew, so the app fetches the Soyuz MS model as soon as that
mission is set up, and nearly every first visit fetches that file: 305 kB now, about 2 MB before.
The other way is to load the model only when a flight starts (the rocket on the pad then drawn as
before until it does). Left as it is for the owner to decide.

`src/render/anatomy.ts` fits the parts into the physics' stack (`stackLayout`), render only:

| Part | Where | Scale along its axis |
| --- | --- | --- |
| Blok A + truss | stage 0, model base → 0, Blok I's base → the stage's height | 1.020 (2.1a), 1.029 (2.1b) |
| strap-ons | each unit, Blok A's map, less the unit's offset | as Blok A |
| Blok I, its aft bay and (2.1b) skirt | stage 1, its lowest point (2.1a: the bay, 2.1b: the skirt's rim) → 0, the next part's base → its 6.7 m | 0.957 (2.1a), 0.993 (2.1b) |
| spent Blok I | the debris, its top on the separation plane: on the 2.1a the model's adapter ring, 0.2 m above the physics' top (the spacecraft's seat), brought down to it (`stage3Spent`) | as Blok I |
| Fregat | stage 2, dropped onto Blok I's top (over the layout's adapter); its S5.92 chamber's place for the flight's bell (`fregatChambers`) | 1 |
| fairing halves | the fairing group, base on Blok I's top (2.1b: round Fregat, as ST flies) | 1 |
| escape tower | `CrewedTop.tower`, on the model's fairing; its jettison fire from the ring of the model's 12 jettison nozzles (`tower.jets`) | 1 |
| Soyuz MS / Progress MS | the payload, 0.20 m above Blok I's top as the model has it; the Soyuz MS's wings hinged at the foot of the model's folded arrays | 1 |
| mission's own satellite on 2.1b | on the model's Fregat (`seat` −2.13 m) | — |

`RocketView.mountAnatomy` hides the R-7's own bodies (and their pad frost), keeps the bells,
plumes and flash (the strap-ons' moved 0.36 m up and 0.2 m out to hang under the model's strap-ons;
Blok I's set on the model's chambers, `RocketView.refitChambers`: the 2.1a's four RD-0110 chambers
and four verniers, the 2.1b's four RD-0124 chambers and no verniers, so the simulator's two
verniers and their flames are dropped there; Fregat's set on the model's S5.92 chamber the same
way, `fit.fregatChambers`, where before the flight's bell stood 1.36 m up inside the model's
Fregat, through its structure), the aft skirt's timing (the 2.1b model's skirt falls away whole
when the flight sheds its own; the 2.1a model has none, so the simulator's petals stay, painted the
model's grey-green) and the tower's jettison, its fire moved onto the model's jettison nozzles
(`CrewedTop.replaceShape(shape, jets)`: the flame scaled to their ring and set at their exits,
where it had left the simulator's tower's nozzle ring about 1.2 m away). It takes the camera's
height and the Mach-1 collar from the model's fairing. The Soyuz MS's wings, the flight's own, are
hinged where the model's folded arrays are, at their foot 0.2 m above the service module's aft end,
not 1.6 m up as on the simulator's own Soyuz (`SOYUZ_MS_HINGE`). `DebrisView` draws spent
strap-ons, Blok A, Blok I, Fregat and the fairing halves from the model, the spent Blok I with its
top on the separation plane (on the 2.1a the departing Soyuz MS or Progress had started 0.2 m inside
it). `main.ts` loads the meshes when a matching mission is set up and mounts them when they arrive;
any other vehicle, a remix of a Soyuz (`derivedFrom`), a load still pending or a failed load
(offline before first fetch, or a browser without `DecompressionStream`) is drawn exactly as
before.

## The owner's report: the 2.1b's skirt shed

The owner sent a crop of the 2.1b at T+5:00, as Blok I sheds its aft skirt, with "ตรงนี้แก้ด้วยครับ"
(fix this too): orange petals and small dark pieces floating under Blok I. The petals were the
simulator's own skirt; the screenshot predates 9b1d870, where the model's skirt already falls in
their place on the 2.1b (on the 2.1a, whose model has no skirt, they stayed orange until now). The
dark pieces were the RD-0124's mounting collars and jackets, kept as structure while the engine they
hold was left out, so they hung in space with the simulator's bells and verniers well below them
(the fit put Blok I's base at its tanks' bottom, not at the skirt's rim). Fixed by keeping the whole
aft bay (above), putting Blok I's lowest point on the stage's base, setting the simulator's bells on
the model's chambers, dropping the two verniers the RD-0124 does not have, and painting the 2.1a's
petals the model's grey-green.

## The owner's answers (2026-10-28)

The owner, in chat, to the two questions this report asked: "1. อนุมัติ 2. โหลดเลย ใช้แบบ24ส่วน"
(1. approved; 2. load it at once, and use 24 segments). So the D-38 raise stands, the featured
launch keeps fetching the Soyuz MS meshes on a first visit, and the flight's meshes are to be made
at 24 radial segments instead of 16 (next commit: `RADIAL_SEGMENTS`, the meshes remade, sizes and
triangle counts measured again).

## Second review round

An adversarial review of the PR (ROYIN001/Orbitlab#184) after a8c58f3. What it found, and what was
done; render and Build UI only, the physics unchanged.

| Finding | What was done |
| --- | --- |
| The meshes were sent raw (1.98 MB for the Soyuz MS), and the featured launch mounts the Soyuz MS model, so nearly every first visit fetched about 2 MB | Format version 2 (byte planes, the whole file gzip-compressed, inflated with `DecompressionStream`): 305.2 / 234.0 / 172.8 kB as fetched. That the first visit fetches it at all is left for the owner (above) |
| Blok A, Blok I and the Progress MS were open tubes, seen through from below or through the truss | The hosts that close their ends kept (`CLOSURE`, Blok I's tanks); a test runs vertical lines near each body's axis and wall and finds that each meets it |
| The flight's Fregat bell stood 1.36 m up inside the model's Fregat, cutting its structure | Fregat's S5.92 chamber recorded (`fregat`'s `nozzles`); the bell, glow and flame set on it (`AnatomyFit.fregatChambers`, `RocketView.refitChambers`) |
| The tower's jettison fire left the simulator's tower's nozzle ring, about 1.2 m from the model's | The 12 jettison nozzles recorded (`escape`'s `nozzles`); one plume leaves each, canted out as the simulator's tower's (`CrewedTop.replaceShape(shape, jets)`) |
| (a check of the fixes) Fregat's flame kept the root radius made for the stage's own 0.84 m bell, about three times the S5.92's 0.35 m exit | `refitChambers` sizes each refitted stage's flames to its new bells, as the stage's own layout sizes them (`Plume.resize`) |
| The Soyuz MS's wings were hinged 1.6 m up the service module, apart from the model's folded arrays | Hinged at the arrays' foot, 0.2 m above the service module's aft end (`SOYUZ_MS_HINGE`) |
| On the 2.1a the departing Soyuz MS or Progress started 0.2 m inside the spent Blok I, whose adapter ring stands above the physics' top | The spent Blok I drawn with that ring on the separation plane (`AnatomyFit.stage3Spent`) |
| The loading note went when the page's file had arrived, though the page then builds its model on the app's thread for 10–20 s on a slow machine, holding the app still, and the note could be lost under the page's dark ground | The note sits over the frame until the page has built its model, and says the app may pause (en/ru/th `build.anatomy.loading`) |
| (a check of the fixes) A page whose script stopped before it mounted its viewer would never clear `data-loading`, leaving the opaque note up | The note goes at once when the page has no viewer at its `load` |
| (a check of the fixes) A mesh file that arrived but cannot be used (a browser without `DecompressionStream`, an older format still cached) was fetched again by every mission | Remembered for the visit; only a failed fetch is tried again |
| The page's frame was not one of the dialog's Tab stops | `iframe` added to the `Modal`'s focus trap |
| Build's view buttons clipped "Inside, in 3-D" on a 320 px phone | They wrap |
| The dialog stayed open when Build was left or its level changed | It closes then |
| Escape inside the model re-homes its view and does not close the dialog, which nothing said | The user guide says so |
| The journey took the page's title as the page open, before it had built its model | It waits for each page to build its 3-D model and checks the note, the Tab stop, close, history and focus |
| The 8.0 m model's docking probe goes about 1.0 m into the station's port at capture (0.48 m with the simulator's 7.48 m ship) | Flown by the rendezvous, whose physics hangs the drawing from a base `size.height − probe` below the CG, the ship is drawn moved by the difference between its drawn length and `size.height`, so its probe's tip, not its base, is where the physics docks it (render only; the simulator's own 7.48 m ship gains the same 0.48 m) |
| (the visual check) Spent stages drawn from the model carry no engine bells: a spent strap-on's base shows four empty sockets | The export records Blok A's and the strap-on's chambers too (`core` and `booster` `nozzles`), and `DebrisView` draws a bell (`bellGeometry`) at each recorded chamber of a spent strap-on, Blok A, Blok I and Fregat |

Not done here (follow-ups if wanted): the abort scenario's escaping head section
(`render/escape.ts`) is still the simulator's drawing; the fairing's flag and lettering (the
page's `paintOf`) are not baked into the meshes; the pad frost is not drawn on the model; the
Soyuz MS meshes are fetched when the featured launch is set up (for the owner to decide, above); the pages' own in-page
links (`#soyuz-anatomy`, `#knowledge-…`) add browser history entries inside the open dialog, so Back
first steps back through those jumps (as any page in a frame does).

## Checks

| Check | Result |
| --- | --- |
| `npx tsc --noEmit` | clean |
| `tests/anatomy.test.ts` (new) | 20/20: on-demand routes; meshes gzip-compressed and matching their pages' SHA-256; parts per page (with the aft bay and its chambers: 4 + 4 on the 2.1a, 4 + 0 on the 2.1b; Fregat's S5.92; the tower's 12 jettison nozzles); each body closed at its ends (vertical lines near the axis and wall of Blok A, Blok I, a strap-on and the Progress MS each meet it); Blok I's lowest point on the stage's base, its bells on the model's chambers and its flame at their exits, no verniers on the 2.1b; Fregat's bell on its S5.92 chamber and its flame at the exit; the tower's jettison fire at the model's nozzles' ring; page choice per vehicle and payload (none for other vehicles and remixes); fit within a few per cent; 2.1b fairing round Fregat and satellite on Fregat; each variant mounted in a RocketView with its parts in place and its own bodies hidden, the 2.1b skirt shed at 14.06 s; Progress hinges against the page's own rotation order; Soyuz MS folded arrays → wings, hinged at the arrays' foot; the strap-ons' bells under the model's strap-ons; the camera height and Mach-1 collar on the model's fairing; spent Blok I recorded without its profile (point mass), its top at 0 (the separation plane), spent Fregat with its top on the separation plane, none on another vehicle; the flames of the refitted stages sized to their bells; one jettison plume per model nozzle; a failed fetch tried again, a file that arrived but cannot be used not; a docking ship drawn with its probe where the rendezvous docks it; spent Blok A, Blok I, strap-ons and Fregat with their bells |
| `tests/i18n.test.ts`, `tests/i18n-thai-terms.test.ts` | 23/23 |
| `tests/soyuz-render.test.ts`, `tests/vostok-render.test.ts`, `tests/privacy-inventory.test.ts`, `tests/pwa.test.ts`, `tests/architecture.test.ts` | green (privacy: `src/render/anatomy.ts` added to the files that fetch, same-origin files of the app) |
| journey `soyuz-anatomy` (new) | first round 1/1, 93 s; second round 1/1 twice in a row, 148 s and 154 s (the Build part under reduced motion: the page's idle tour redraws its 1.4-million-triangle model every frame, which software GL cannot finish before a screenshot's 30 s limit). Crewed 2.1a model mounted (core, 4 strap-ons, Blok I, both fairing halves, tower, Soyuz MS); 4 spent strap-ons drawn from the model after T+118 s; Progress model mounted; Build offers the pages for 2.1a and 2.1b and none for Falcon 9, opens both 2.1a pages and waits for each to build its 3-D model (its 3-D viewer shown, not the still image), the loading note gone once it has, the page's frame a Tab stop (Shift+Tab from ×), the frame removed on close with the history length unchanged, focus back; no console errors |
| `npx vite build` + `node scripts/bundle-budget.mjs` | ok with the raised ceilings below |
| Visual (SwiftShader, 1280×800) | pad, T+16, strap-ons away, fairing away, core separation, skirt shed, Soyuz MS and Progress MS in orbit with arrays out, 2.1b with the satellite on Fregat; Build dialog in Thai; after the owner's report, the 2.1b at T+302, 305 and 307 s (the skirt falling away whole, the RD-0124 on the bay, nothing loose) and the 2.1a at T+289, 297 and 300 s |

## Budget (D-38)

| Group | Ceiling | Measured with the change | Without | Delta |
| --- | ---: | ---: | ---: | ---: |
| `index-*.js` | 2635 → 2652 | 2651.4 kB (2,651,379 B) | 2634.8 | +16.6 |
| `index-*.css` | 177 → 179 | 178.3 kB (178,321 B) | 176.9 | +1.4 |
| `i18n-*.js` | 1729 → 1733 | 1732.5 kB (1,732,544 B) | 1729.0 | +3.5 |
| precache code | 14654 → 14676 | 14675.4 kB | 14654.0 | +21.4 |
| precache | 16053 → 16075 | 15794.6 kB (committed snapshots) | — | code +22 |

The second review round added 1.6 kB to `index-*.js` (the inflater and the byte-plane decoder, the
Fregat and tower refits, the dialog's wait) and 1.9 kB to precache code, so those two ceilings and
the precache total go 2 kB above the first round's (2649, 14673, 16072). The pages and meshes
(14.1 MB: pages 13.4, meshes 0.7) are in no ceiling: `anatomy/` is on demand. Without that entry
the build precaches them and fails the code ceiling by about 14 MB. Named offset: EQ-7 (split
the first-view code, K2). The raise stands only with the owner's approval.
