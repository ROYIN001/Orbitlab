# Structure & Assembly pilot, second version / รุ่นนำร่องหมวด "โครงสร้างและการประกอบ" ฉบับที่ 2

> **สถานะปัจจุบัน (บันทึกเดียวที่เป็นปัจจุบัน — แก้ที่นี่ทุกครั้งที่สถานะเปลี่ยน)**
>
> - **ฉบับที่ 2 (ยกเครื่องทั้งหมวด ตามคำขอเจ้าของ 2026-11-10: "ตรวจเช็คโครงร่างที่ร่างมาตอนแรกแล้วร่างให้ดีกว่าเดิม … เอาให้ดีที่สุด")** สร้างต่อจากฉบับแรก (`be35eb7`) บนสาขา `claude/trusting-cannon-oah00c` · ฐาน: `main` @ `3e1b48a` · commit ของงาน: §13
> - **push แล้ว เป็น pull request แบบร่าง #217** ตามคำอนุญาตของเจ้าของ (2026-11-11: "อนุญาตให้ push สาขา claude/trusting-cannon-oah00c ขึ้น GitHub และเปิด pull request แบบร่าง") **ยังไม่ merge และยังไม่เผยแพร่ขึ้นเว็บจริง**
> - **ต้องแจ้งตรง ๆ — ข้อบกพร่องของฉบับแรกที่ส่งมอบไปแล้ว (E-01):** ไฟล์โมเดล Soyuz ของฉบับแรกติดป้ายชิ้นส่วนผิดให้สามเหลี่ยมราว 91 % (สคริปต์สร้างไฟล์บันทึกหมายเลขชิ้นต่อสามเหลี่ยมแต่อ่านต่อจุดยอด) ที่ระดับ "ชุดประกอบหลัก" ไม่เห็นผล แต่ต่ำกว่านั้น การเลือก การเน้น การผ่า และสีตามชนิด ชี้ผิดชิ้น ฉบับที่ 2 แก้แล้ว (ไฟล์รุ่น `.r2.` + การทดสอบที่จับข้อนี้ได้) ชุดส่งมอบฉบับแรกจึงไม่ควรใช้ต่อ — §2
> - ผู้ทำงาน: Claude (ไม่ใช่ GPT-6.1 Sol) · ผู้ตรวจทาน: เอเจนต์ Claude แยกบริบท · **ยังไม่ได้ตรวจโดย GPT-6 Astra** (เรียกจากที่นี่ไม่ได้ เตรียมบริบทส่งต่อไว้แล้ว) — §10
> - การตรวจฉบับแรกก่อนยกเครื่อง: ตั้งใจตรวจ 7 มุมมอง **ทำได้จริง 2 มุมมอง** (เป้าหมาย/การใช้งาน/การสำรวจ และ การประกอบ/ดาวเทียม) ได้ 29 ข้อ อีก 5 มุมมองหยุดเพราะโควตาการใช้งานของเซสชันเต็ม การตรวจทานฉบับที่ 2 ทำครบ 5 มุมมอง พบ 45 ข้อ แก้/ตอบครบแล้ว (ผู้หักล้างตรวจยืนยัน 27 ข้อของสามมุมมองหลัง ส่วน 18 ข้อของสองมุมมองแรก ผู้หักล้างหยุดเพราะโควตา ผมทำซ้ำด้วยสคริปต์ของผู้ตรวจเองแทน ซึ่งไม่ใช่การตรวจอิสระ) — §2, §10
> - **รอเจ้าของตัดสิน:** (0) หน้า Anatomy มีประโยคหนึ่งที่ขัดกับข้อมูลของหน้าเอง (ระบุ RD-0110 ในจรวดรุ่น 2.1b) — คำถามข้อ 5 ใน §11 (1) ~~งบขนาดตาม D-38~~ เจ้าของอนุมัติข้อเสนอใน §9 แล้ว (2026-11-12 เลือกแบบที่ 1: ไฟล์ของหมวดอยู่ใน precache) เพดานแก้ตามนั้นใน `budgets.json` พร้อมเหตุผล การตรวจงบผ่าน (2) ค่าตั้งต้นที่ผมเลือกแทนไปก่อน 12 ข้อ และคำถาม 5 ข้อ ใน §11 (3) ข้อความภาษาไทยที่เขียนใหม่ (การ์ดระดับพื้นฐาน คำอธิบายกลุ่ม ชิ้นส่วนดาวเทียม ตัวช่วย) ต้องให้เจ้าของอ่านรับรอง
> - ชุดส่งมอบ Soyuz 2 พ.ย.: เจ้าของเลือก "ใช้โมเดลในเว็บไปก่อน" (2026-11-10) จึง**ยังไม่ได้เทียบ**กับชุดนั้น
> - คำแปลอังกฤษและรัสเซียเป็น**ร่าง**ที่เอเจนต์แปลจากต้นฉบับไทย ยังไม่ผ่านเจ้าของภาษา (ขึ้นป้ายบอกบนจอ)
>
> **สรุปสำหรับเจ้าของ (ภาษาไทย)**
>
> - **ภาพโมเดลเป็นจุดหลักของหน้า** บนจอใหญ่หมวดนี้สูงพอดีจอเดียว ไม่ต้องเลื่อนหน้า ภาพสามมิติกิน 59 % ของหน้าต่าง (ฉบับแรก 46 % และต้องเลื่อน) แผงข้อมูลอยู่คอลัมน์ขวาและเลื่อนในตัวเอง บนโทรศัพท์ภาพอยู่บนสุด กินครึ่งหนึ่งของพื้นที่หมวด (42 % ของจอ 390×844; ฉบับแรก 22 %) และค้างอยู่ให้เห็นขณะเลื่อนอ่านแผง
> - **บนภาพมีชื่อ เส้นชี้ และมาตราส่วน** ชื่อชุดประกอบทุกชุดเป็นปุ่มกดเลือกได้ (อีกทางหนึ่งนอกจากกดที่ตัวโมเดลและรายการ) วางเมาส์มีชื่อขึ้น คำอธิบายสีกดเพื่อกรองได้
> - **สามระดับเปลี่ยนทั้งสิ่งที่เปิดเผยและเครื่องมือ** พื้นฐาน: ชุดประกอบหลัก 7 เครื่องมือ การ์ด "คืออะไร / ทำหน้าที่อะไร / ต่อกับอะไร" เป็นภาษาง่าย · ทดลอง: ระบบย่อย จุดต่อ (กด "ดูจุดต่อ" แล้วภาพชี้ให้) ซ่อน/แสดงเฉพาะ สีตามชนิด ระบบภายใน · วิศวกร: ชิ้นส่วนทีละชิ้นพร้อมรหัสถาวร ตำแหน่ง สิ่งที่ไหลผ่าน แหล่งข้อมูล และชั้นข้อมูลที่เลือกเปิดเอง — ข้อมูลชุดเดียวกัน เปลี่ยนระดับแล้วสิ่งที่เลือกยังอยู่
> - **ระบบภายในของ Soyuz** วงจรสารขับดันและแก๊ส 15 วงจรจากหน้า Anatomy (14 วงจรไล่ดูทีละขั้นได้ อีก 1 วงจรหน้า Anatomy ไม่ได้แบ่งขั้น จึงแสดงทั้งวงจร) ส่วนอื่นของจรวดจางและมองทะลุ · **ลำดับการบิน 10 ขั้น** ของหน้า Anatomy เป็น "ตัวช่วยทีละขั้น" ที่เลือกเปิดเอง ปิดได้ทุกเมื่อ ไม่ล็อกอะไร
> - **ประกอบ:** ระดับพื้นฐานเห็นโครงร่างแบบอ้างอิง ชิ้นถัดไปสว่าง กดครั้งเดียวติดตั้ง · ระดับทดลองขึ้นไปชิ้นส่วนวางแยก **ลากชิ้นส่วนบนภาพไปวางได้** (เมาส์และนิ้ว) หรือกดหยิบแล้วเลือกตำแหน่งจากป้ายหมายเลขที่บอกว่า "อยู่ตรงไหน" (ไม่ใช่ชื่อชิ้น) หมุนเองให้ถูกทิศ ทุกการปฏิเสธบอกเหตุผล ลำดับและเหตุผลมาจากตารางเดียวกับความสัมพันธ์ที่แสดง ประกอบครบแล้วพาไปดูข้างในและไปโมเดลถัดไป
> - **ดัดแปลงดาวเทียม ("แบบทดลองของฉัน"):** ชิ้นที่เปลี่ยนเป็นสีส้มบนภาพพร้อมป้ายชื่อตัวเลือก ผล (ไฟพอ/ไม่พอ พร้อมเหตุผลเป็นตัวเลข มวล ความจุ ประจุต่ำสุด กราฟ 3 รอบ) อยู่ใต้ภาพ (บนโทรศัพท์ บรรทัดผลไฟพอ/ไม่พอค้างอยู่ใต้ภาพขณะเลื่อนไปเลือกอุปกรณ์) ตัวเลือกแต่ละตัวบอก "เหมาะกับงานอะไร" และ "พอดีช่องไหม" มีตารางผลครบทั้ง 4 ชุดตัวเลือก รายการอุปกรณ์ และภาพอธิบายทิศการไหลของพลังงานที่ติดป้ายชัดว่า "ภาพอธิบาย ไม่ใช่ผลคำนวณ" · หน้า "สำรวจ" และ "ประกอบ" แสดงแบบอ้างอิงเสมอ
> - **EduSat-3U ตรงตามเอกสารที่อ่านจริง:** แกนและด้านตาม CDS Rev. 14.1 (แกนยาว Z ด้านข้าง ±X ±Y) มวลสูงสุดโดยทั่วไปของ 3U 6.00 กก. (ฉบับแรกใช้ 4.00 กก. ของ Rev. 13) ตรวจศูนย์กลางมวล ส่วนยื่น ความกว้างราง กับขอบเขตในเอกสาร เซลล์แสงอาทิตย์ตามเอกสารข้อมูล AZUR 3G30-Advanced แต่ละค่าบอกว่ามาจากเอกสาร ค่าทั่วไป หรือค่าที่กำหนดเอง
> - **โครงสร้างโค้ดรองรับโมเดลถัดไป:** หมวดเป็นชิ้นแยกที่โหลดเมื่อเปิดหมวดเท่านั้น (ผู้เข้าชมทั่วไปดาวน์โหลดเพิ่มตอนเริ่ม 10 kB แทน 196 kB) ทุกโมเดลอธิบายด้วยรูปข้อมูลเดียวกัน (รหัสถาวร แม่ จุดติดตั้ง หน่วย จุดหมุน พารามิเตอร์ แหล่งข้อมูล ระดับความแน่นอน) หน้าจอไม่รู้ว่ากำลังแสดงโมเดลใด เพิ่มโมเดลใหม่ = เพิ่มตัวปรับ (adapter) หนึ่งไฟล์และข้อความของมัน
> - **การตรวจทานอิสระของฉบับที่ 2 (5 มุมมอง) พบ 45 ข้อ แก้/ตอบครบแล้ว** ที่สำคัญ: ที่ระดับพื้นฐานของดาวเทียม ปุ่ม "ถอดออก" ถอดผิดชิ้น · บนโทรศัพท์ผลไฟพอ/ไม่พอหลุดจอขณะเลือกอุปกรณ์ และบนจอเตี้ยปุ่มเครื่องมือเอื้อมไม่ถึง · การลากชิ้นส่วนตามมือช้าเมื่อไม่ได้ปิดภาพเคลื่อนไหว · กฎ "Fregat ต้องหมุนให้ตรง" ไม่มีข้อมูลรองรับ (เอาออกแล้ว) · กลุ่ม "ถัง" ของ Fregat ไม่มีถังหลัก · ออฟไลน์แล้วกด "ลองอีกครั้ง" ทำให้ทั้งแอปหาย — รายการครบใน §10
> - ตรวจแล้ว: ชุดทดสอบของหมวด 201 ข้อ ใน 15 ไฟล์ (ก่อนการตรวจทานฉบับที่ 2: 157 ข้อ), ชุดทดสอบทั้งหมดของแอป 10,830 ข้อ (359 ไฟล์) ผ่านครบบนโค้ดชุดสุดท้าย, browser journey สองเส้นทางผ่าน (เดสก์ท็อป ลากด้วยเมาส์ ภาษาอังกฤษ โทรศัพท์แบบสัมผัส 390×844 และ 390×664 ลากด้วยนิ้ว กรณีโหลดล้มเหลวและออฟไลน์) และการตรวจงบขนาดผ่านหลังเจ้าของอนุมัติเพดานใหม่ (§9)

```yaml
package: none in the plan (owner's requests in chat, 2026-11-09 and 2026-11-10)
item: a Structure & Assembly section — explore, assemble and modify (educational satellite only); second version, the whole section rebuilt
change_kind: feature (new section, render, UI, storage key, PWA on-demand files); physics unchanged
owner_authorization: 'owner in chat, 2026-11-09: "ฉันต้องการให้คุณเริ่มพัฒนาส่วน “โครงสร้างและการประกอบ” ใน Orbitlab ตามข้อกำหนดต่อไปนี้ …" · 2026-11-10: "ลองตรวจเช็คโครงร่างที่ร่างมาตอนแรกแล้วร่างให้ดีกว่าเดิมครับ เอาให้ดีที่สุดเท่าที่จะทำได้เลยครับ"; scope "ยกเครื่องทั้งหมวด"; budget "แยกโหลดเมื่อเปิดหมวด"; Soyuz delivery "ใช้โมเดลในเว็บไปก่อน" · standing: "ยังไม่อนุญาตให้ push, merge หรือเผยแพร่ขึ้นเว็บจริง"'
branch: claude/trusting-cannon-oah00c
base: 3e1b48a961c5d79b8dbd68e0471878567c10c748
budget: approved by the owner in chat, 2026-11-12 (D-38; variant 1 of §9: the section's files in the precache) — four named groups for the section's chunks (275 + 27 + 62 + 97 kB), index-*.js 2655→2664, i18n-*.js 1733→1735, precache code 14679→15148, precache 16078→16547 kB; each with its reason in budgets.json _notes
merge: not requested (owner allowed the push and a draft pull request, #217; no merge)
```

## 1. Sources checked

| What | Where | Found | Used |
| --- | --- | --- | --- |
| Default branch | `origin/main` | `3e1b48a` (2026-11-07) | base of this branch |
| Soyuz-2.1b/Fregat ST31 model in the web | `public/anatomy/soyuz-2-1b-fregat-st31.html` (4,550,173 B, SHA-256 `b63220e1…9393bf4c`) | build `family-v1-20261026`, 2,069 parts, 15 circuits, a 10-step flight sequence | yes: the one source of geometry and Thai content |
| Owner's delivery of 2026-11-02 `Soyuz_Family_Engine_Interior_20261102`, the older integration kit, Saturn V/Apollo `components.json`, Anatomy `sources/` | owner's computer | not reachable from this cloud session (the folder is under the hidden `.codex` folder, which Remote Control does not serve) | **no.** The owner chose on 2026-11-10 to carry on with the web model; the comparison of units, axes, part ids and pivots with the newest delivery is **not done**. Nothing was read, moved or written there |
| CubeSat Design Specification Rev. 14.1 (Cal Poly, Feb 2022) | nasa.gov PDF | **read in the document** (2026-11-10, after the owner allowed the host): 3U typical maximum mass 6.00 kg (Table 1); centre of gravity ±2 cm X/Y, ±7 cm Z (Table 2); long axis Z, −Z inserted first; protrusion ≤ 6.5 mm; rails ≥ 8.5 mm; switches, RBF pin, 30 and 45 minute waits | EduSat's frame, bounds and piece notes |
| CubeSat Design Specification Rev. 13 (2014) | unoosa.org PDF | read: 3U 4.00 kg (§3.2.13), stored chemical energy ≤ 100 Wh (§3.1.6) | the earlier bound, shown as such |
| AZUR SPACE TJ 3G30-Advanced 4×8 data sheet (April 2025) | azurspace.com PDF | read: 40 × 80 mm, 30.18 cm², 29.5 % bare / 29.2 % with cover glass, 2.411 V × 0.504 A at the maximum-power point | EduSat's cells |
| NASA State-of-the-Art of Small Spacecraft Technology, Power, Table 3-1 | nasa.gov page | read: the same cell at 29.5 % | confirms the value Orbitlab's satellite builder already uses |
| 18650 cell (3.6 V × 2.6 Ah, about 45 g) | — | **not read in a maker's document**: a typical figure | labelled "typical, not checked against a maker's document" on screen |

What each document says, with page and section, is kept in the session's notes and summarised in the adapters' source lists (`EDUSAT_SOURCES`, `src/structure/edusat.ts`); every EduSat figure on screen says whether it is read from a document, taken as Orbitlab already uses it, typical, or set by this section.

## 2. Why a second version: the first one, checked against the brief

The owner asked for the first draft to be checked and bettered. It was looked at afresh against the brief, clause by clause, in a real browser (a screenshot atlas of every level, model and activity, with measured layout), by Claude agents with their own context. **Seven lenses were planned; two finished** (goal, use and exploring; assembly and the satellite) before the session's usage limit stopped the other five (data and physics, architecture and budget, accessibility, text, tests) and the challenge round. Their scope was folded into the review of the second version (§10). The two lenses reported 29 findings; each was checked before it was taken up, and E-01 was reproduced independently before anything else was done.

| # | Finding in the first version | In the second version |
| --- | --- | --- |
| E-01 | **A defect, delivered with v1:** the Soyuz files named the wrong part for about 91 % of the triangles (the generator recorded the part per triangle and read it per vertex). At the assembly grain nothing showed; below it the pick, the highlight, the cutaway and the colour views were wrong | **Fixed.** `scripts/structure-meshes.mjs` marks every vertex; the files are revision 2 (`*.r2.*`, the revision in the name, the header and the reader, so a kept copy of the old files is never read); `tests/structure-model.test.ts` holds every part's stated centre to within 10 cm of its own geometry (largest 7.5 cm) and the cutaway to the right side |
| E-02 | A thing chosen from the list was often not visible; focus flew into the skin | What covers the thing picked is seen through; a part or group picked inside an assembly shows through the rest of that assembly; focus frames exactly, with at least a sixth of the assembly round a small part; a view asked for while a layer is still being fetched is taken up when it arrives |
| E-03 | No optional guide; the page's own tour and flight sequence dropped | "ตัวช่วยทีละขั้น": closed until asked for, closable at any step, locks nothing. A tour of each model, the page's ten-step flight sequence, and an energy walk-through of the experiment |
| E-04 | The 15 circuits through 1,164 parts could not be explored | "ระบบภายใน": each circuit by its engine, followed step by step (14 of the 15; the page gives Fregat's generator drive no steps, so it is shown whole), its parts painted by what flows, everything else dimmed and seen through, with the page's own confidence and limitation notes |
| E-05 | The three depths changed the list and the panel, not the tools | Tools by depth: 7 at a first look; the middle depth adds the sliders, hide, isolate, the see-through shell, colour by kind, the systems tab and the search; the deepest adds colour by data status and the layers by name |
| E-06 | Below the assembly the panel did not say what the thing is or does | At a first look a card in plain words (what it is, what it does, what it meets); every group of the page has a sentence of what it is; every part its kind, status, medium, engine, own id, place, what it joins and the circuits through it. `tests/structure-content.test.ts` walks every thing at every depth |
| E-07 | The model was not the centre of the page (46 % of a desktop window with the page scrolling, 22 % of a phone's) | One screen tall on a wide display, the picture 59 % of the window (56 % with the middle depth's two rows of tools, 45 % with the experiment's results under it); on a phone half of what the section has under the app's header (42 % of a 390×844 window, 40 % of 390×664), first and kept in sight |
| E-08 | Nothing on the model said what anything is | Names with leaders (buttons, laid out so none lies over another), a name under a resting pointer, a scale bar in round lengths, a one-line hint |
| E-09 | Relations were words between assemblies; joints never shown | "ดูจุดต่อ" frames the joint's own parts with a third of the unit round it and names it on the picture; the satellite's power, data and radio paths are followable systems (marked as illustrations) |
| E-10 | Kinds of part rested on a colour menu and an unpressable legend | The legend's entries are buttons that pick one kind out (the rest dimmed), each with what it means; the rules' counts are measured and the classification is tested on known parts |
| E-11 | The path was three unlabelled chips; the activity not in the address | Activities are tabs with their state (3/11, complete, has a design) and addresses of their own (`#/structure/<level>/<model>/<activity>`), so Back works between them |
| E-12 | Not shaped to take another model: 54 model branches in one 1,764-line class | A shared description (`src/structure/model.ts`) and one adapter per model; the screens never test the model's id; `tests/structure-tree.test.ts` holds the models, their addresses and their words together. **Still tied to one page:** the generator script |
| E-13 | Taking apart, hiding and cutting were all-or-nothing | Any node can be hidden and shown again from the list; isolate; show all. **Not done:** taking one assembly apart alone, and a cut other than the page's own halves |
| E-14 | Thai wording departed from Orbitlab's vocabulary | Orbitlab's own unit words and terms (กก., วัตต์-ชม., เซลล์แสงอาทิตย์, เงาโลก, ศูนย์กลางมวล); the Soyuz model keeps the Anatomy page's own terms, with a line that says how they map |
| E-15 | The section can be reached only from the top bar (beyond the brief) | **Not done** — it touches Home, Launch and Build and the first-download budget; a question for the owner (§11) |
| AE-01 | Assembly started on an empty stage; loose parts were names in a tray | At a first look the reference's outline with the next part lit; deeper, the parts themselves laid out apart |
| AE-02 | Choosing a place was matching a name to the same name | Places are named for where they are ("ยอดแกนกลาง", "ช่องที่ 3"), numbered, and marked on the picture with a line to the spot |
| AE-03 | The part in hand and its way round could not be read | The part in hand is drawn at the place chosen, as it would be fitted, turned as it is; the bar says how far it is turned from the reference |
| AE-04 | Feedback and controls far from the model; off-screen on a phone | The part in hand, its controls and the message are in the bar under the picture; on a phone that bar stays under the picture while the panels scroll |
| AE-05 | Guidance one line of small text, the same at every depth | A first look is led one step at a time with why it comes now; the middle depth says what each waiting part waits for and why; the deepest lists every relation with its kind and what it carries |
| AE-06 | Order rules and shown relations were two tables that disagreed | One table (`SOYUZ_RELATIONS`/`SOYUZ_ORDER`, `EDUSAT_…`); `relationProblems` holds what mounts to wait for what carries it, and the assembly's rules to be exactly the order's; the joints made are listed |
| AE-07 | A finished assembly led nowhere | Complete → "look inside what you built" (the cutaway), on to the next model or to the experiment; the tab keeps the mark |
| AE-08 | Dragging, the brief's first gesture, was a desktop drag of a text chip | **The part itself is dragged on the picture** (mouse and finger): it follows the pointer, settles on the free place it is over, and letting go fits it or is refused there with the reason. Pressing "install" stays, for touch and keys |
| AE-09 | EduSat opened as a closed box | It opens with two side panels swung off; five subsystems named on the picture; the stack, boards, cells, camera, rods and rails are modelled piece by piece |
| AE-10 | In the experiment the choice and what follows were never in one view | The changed parts are painted and named on the picture; the verdict, four figures and the charge curve are under it; the options beside it |
| AE-11 | Reference and experiment blurred | A badge on the picture says which design is shown; exploring and assembling always show the reference; the reference's options cannot be changed |
| AE-12 | The reason to choose, the fixed places and the size limits were not where the learner chooses | Each option says what it is for, its figures and how it fits its bay |
| AE-13 | Sources and assumptions only at the deepest depth, partly in English | What each figure rests on is said from the first look, in the interface language; the documents themselves, with links, at the deepest depth (a circuit's own sources from the middle depth) |
| AE-14 | Offer the real integration order as a second sequence | **Not done** — a question for the owner (§11); the screen says the order shown is by load path, for learning, and how a launch site really does it |

## 3. What the second version is

| Area | Files | What it does |
| --- | --- | --- |
| Model files | `scripts/structure-meshes.mjs` → `public/structure/soyuz-2-1b-fregat-st31.r2.{json,outer.bin,inner.bin,engine.bin}` | The page's own mesher. Every vertex carries its part's index; three layers fetched only when asked for (outer 395 kB, inner 251 kB, engine 560 kB, already compressed); content 633 kB (67 kB gzip) with, per part, its circuits and steps, medium, pivots, mounts, ends and evidence, and the page's circuits, flight sequence and notes. Units m, +Y up |
| Shared description | `src/structure/model.ts` | What every model is described by: a tree of the things it can show at the three depths (permanent id, parent, tier, the picture's parts, unit, kind, certainty), how units meet (`ModelRelation`), the order they go together in with the reason (`OrderRule`), the places they mount at (`MountPoint`), where a unit stands (`Pose`). DOM-free |
| The two models | `src/structure/{soyuz,soyuz-content,edusat,edusat-design,power-balance,assembly,progress,handoff,env,types}.ts` | Their descriptions, the assembly state machine, EduSat's parts list down to its pieces, its design, checks against the specification, the energy balance, stored progress, the hand-off's plain record. DOM-free, and importing nothing of the app (§3.1) |
| App side | `src/structure-host/{power-env,satellite,handoff}.ts`, `src/ui/structure-loader.ts` | What the app gives the section: its power model, its satellite model, the doors to Orbit and Launch, the learner's storage; and the loader, with its loading, failed and retry states |
| Render | `src/render/{structure-mesh,structure-viewer,edusat-model}.ts` | Decoder; the viewer (per-part state in a texture: hidden, seen through, selected, related, dimmed, outline, target, paint; a solid pass and a blended one; unit poses moved over a moment; exact framing; picking; a part dragged; hover); EduSat drawn from its pieces |
| Screen | `src/ui/structure/{structure,screen,store,picture,stage,overlay,bars,panels,assembly-panel,labels,charts,dom,palette,env}.ts`, `structure.css` | `store` (state and every action, no DOM) → `picture` (what the view must show, derived in one place) → `stage` (hands it to the viewer, fetches layers, moves the camera) with `overlay` (names, places, scale, legend, badge) and `bars` (tools by depth, the part in hand, the experiment's result); `panels` draw what an adapter describes |
| Per model | `src/ui/structure/models/{types,index,soyuz,edusat,edusat-experiment}.ts` | `ModelAdapter`: one per model, the only code that knows it. `InfoDoc` (what is said of a thing, as data), `ModelSystem`, `ModelGuide`, `ExperimentUi` |
| Text | `src/ui/structure/{text,structure-en,structure-ru}.ts` | Thai, the source (778 keys); English and Russian drafts, each fetched when its language is on screen |
| Tests | `tests/structure-{assembly,boundary,content,edusat,handoff,labels,loader,model,picture,power,progress,storage,store,text,tree}.test.ts`, `structure-harness.ts`, `tests/browser/journeys/structure-{assembly,failures}.mjs` | 201 unit tests in 15 files; two browser journeys |

### 3.1 How it is kept apart, for the models to come

- **A part of its own.** The section's files (`src/structure/**`, `src/ui/structure/**`, `src/render/structure-*.ts`, `src/render/edusat-model.ts`) import at run time only `three` and each other; everything of the app comes through `StructureEnv`. The app's side imports the section's files as types only, except the one dynamic `import()` that loads it. `tests/structure-boundary.test.ts` holds both directions. Measured module by module: the section is one new chunk (plus its style sheet and the two language drafts), and every other chunk of the app holds exactly the modules it held before.
- **A new model** is: its id in `STRUCTURE_MODELS`, a description and an adapter, its addresses in `APP_PAGES`, its words. `tests/structure-tree.test.ts` fails if one of the four is missing; `relationProblems` checks its relations against its assembly rules; `tests/structure-content.test.ts` walks whatever it describes.
- **Computed and illustrative kept apart.** What is worked out (`eduFigures`, `simulatePower`, `specChecks`) is shown as figures with their method; what only explains (the energy-flow picture, the satellite's three paths, the cutaway's walls, the exploded distances, the flight sequence) says so where it is shown.

### 3.2 Decisions taken while building

- **The picture leads; text follows it.** One row above the picture (model, activity), one bar under it (the activity's tools or result), a column beside it (who the thing is). On a phone the same order, the picture kept in sight.
- **A whole assembly picked fetches nothing more.** Its inside layers (810 kB) are fetched when something asks for them: a group or a part of it, a circuit, a joint, the cutaway, the see-through shell, or the layer's own switch.
- **The cutaway uses the page's own halves**, as before; the screen says the walls and thicknesses are illustrations.
- **Assembly order** is by what rests on what, standing up, and the screen says how a launch site really does it. Strap-ons are block-specific; EduSat's four side panels are interchangeable; a part's way round matters for the strap-ons (quarter turns), the camera and the panels (a flip); Fregat goes in one way (its spheres and posts line up at every quarter turn in the page's data, so the first writing's rule that refused a turned one had nothing behind it — the second review, §10).
- **The view is not moved for the learner more than needed:** a first look fits parts without moving it; deeper, choosing a place brings it close, and fitting, putting down or picking up the next part brings back the whole.
- **3-D starts after the section is painted** (held by a flag since the second review, which found the first drawing of the section making the WebGL context itself; measured now: one animation frame passes before the context is asked for), one renderer for the section's life, fetches cancelled and GPU resources freed on leaving, as before. New: the viewer draws at once after its box changes size — found by looking at the real page (a finished assembly's picture stayed empty when the bar under it grew).

## 4. Acceptance criteria and results

| # | เกณฑ์ | ผล | หลักฐาน |
| --- | --- | --- | --- |
| A1 | เปิดหมวดด้วยลิงก์ตรง และกลับไปส่วนเดิมได้ | ผ่าน | journey: nothing of the section is fetched at Home; `#/structure/watch/soyuz-st31` opens it; each activity has its address; Back from Launch returns to the finished assembly, drawn |
| A2 | เลือกจากภาพและรายการได้ตรงกัน ข้อมูลและกล้องตามชิ้นที่เลือก | ผ่าน | journey: three assemblies picked by their names on the picture, one by a press on the model, a group from the list, a single part; `tests/structure-store.test.ts` (one selection read at each depth) |
| A3 | เปิดภายใน แยกส่วน คืนสภาพ โดยโมเดลไม่เสียสถานะ | ผ่าน | journey: cutaway on and drawn, apart 100 %, reset; `tests/structure-picture.test.ts` (what the view is told to show, case by case) |
| A4 | ประกอบ Soyuz และดาวเทียมแบบตั้งต้นได้ จัดการติดตั้งผิด/ไม่ครบ | ผ่าน | journey: 11/11 at a first look by single presses; from the middle depth out of order, another block's place and the wrong way round each refused with its reason, undo, a part that cannot come off, complete (every unit in a place and a way round the reference allows, on what it rests on; its 15 relations listed); EduSat 13/13 with two panels on other faces; `tests/structure-assembly.test.ts`, `structure-tree.test.ts` |
| A5 | เปลี่ยนระดับแล้วแบบและความคืบหน้าคงเดิม | ผ่าน | journey: the core stays selected from พื้นฐาน to ทดลอง, Fregat to วิศวกร; the assembly and the design are per model, not per level |
| A6 | เปลี่ยนแบต/อุปกรณ์แล้วภาพ รายการ มวล ผลพลังงานเปลี่ยนจากข้อมูลจริง | ผ่าน | one design feeds the pieces drawn, the equipment list, the figures and the record handed on; journey: 1.810 → 2.010 → 2.070 kg, the changed camera painted and named on the picture, the list's total 2.07 |
| A7 | มีกรณีผ่านและกรณีไม่พอที่อธิบายได้จากค่าที่แสดง | ผ่าน | §6; the verdict says the two figures it rests on (3.64 Wh needed in the shadow, 2.81 Wh usable); `tests/structure-power.test.ts` |
| A8 | ส่งไป Launch หรือ Orbit ได้จริง ตรวจค่าที่ปลายทางได้รับ | ผ่าน | journey: Orbit's playground and Launch's mission each hold 2.070 kg, read back and checked; `tests/structure-handoff.test.ts` |
| A9 | แก้แบบไม่แสดงผลเก่าเป็นของแบบใหม่ ไม่เขียนทับงานเดิม | ผ่าน | figures are a function of the design; a change after sending is flagged; my experiment is a copy; Launch's earlier mission is put back; reload keeps the experiment (journey); damaged and newer records (`structure-store.test.ts`, `structure-storage.test.ts`) |
| A10 | ใช้ได้บนเดสก์ท็อป จอแคบ แตะ แป้นพิมพ์ ไม่ต้องลากอย่างเดียว | ผ่าน (โทรศัพท์แบบจำลอง) | journey at 390×844 and 390×664, touch, reduced motion: no sideways scroll, every model, activity and first-look tool within the screen's width, the picture kept in sight while the panels scroll, the verdict and what is in hand kept under it, assembly by taps, a finger's drag, keys on the view; every control has a name; Escape lets go; the keyboard's focus goes on to the next thing to do. A phone on its side is cramped (§11) |
| B1 | บทเรียนเป็นตัวช่วยเสริมที่ผู้ใช้เลือกเปิดได้ | ผ่าน | journey: the helper is closed until asked for; with it open another part can still be picked; closing it takes off the picture what its steps put there |
| B2 | ระดับความลึกเปลี่ยนสิ่งที่เปิดเผยและเครื่องมือที่ใช้ บนข้อมูลชุดเดียว | ผ่าน | journey: the tools present and absent at each depth; `structure-content.test.ts` (what each depth says of the same thing) |
| B3 | พื้นที่แสดงโมเดลเป็นจุดสนใจหลัก | ผ่าน | journey: the page does not scroll on a wide display; the picture is more than 55 % of the window and 58 % of the section, half of what the section has on a phone (42 % of a 390×844 window) |
| B4 | แยกส่วนพัฒนาได้ รองรับโมเดลรุ่นอื่น | ผ่าน | `tests/structure-boundary.test.ts`, `structure-tree.test.ts`; §3.1 |
| B5 | ผลคำนวณแยกจากภาพอธิบาย | ผ่าน | §3.1; the journey reads figures only from the results strip and the equipment list |
| B6 | โมเดลหนักโหลดแบบ lazy พร้อมสถานะ loading/failed/retry | ผ่าน | journey `structure-assembly`: the model and its layers are fetched when asked for and not before; journey `structure-failures`: a failed fetch of the section's code, a model's data, its 3-D or a layer is said where the picture would be, with a retry that works (offline with no worker to answer, the retry of the section's code keeps the note and the app rather than loading a page that cannot be had); a language's copy that cannot be fetched leaves the Thai showing and is said in the app's own words for that language, with the page loaded again as the way out |

## 5. The models' data

### 5.1 Soyuz-2.1b / Fregat ST31

The page's 2,069 parts in 11 assemblies: core (363), four strap-ons (292 each), interstage (28), Block I (279), Fregat (171), payload envelope (16), fairing halves (22 each); under each its groups as the page lists them (a part under the group that names it most closely, a group that says what is seen from outside coming after those that say what a part is, so Fregat's six spheres are its tanks and equipment bays; a group every part of which another names — the page's "whole engine", Fregat's outer surface — stands for its whole list and says so beside its count), under each group its parts by the page's own ids. Fifteen circuits by engine (RD-107A/108A six, RD0124 five, Fregat four), 1,164 parts on a circuit and 920 on one of its steps; ten flight steps. Kind of part and certainty come from rules over the page's kinds, roles and ids — this section's reading of the page, said as such on screen (propulsion 1,146, mounts 362, load-bearing 252, walls 182, mechanisms 88, equipment 39). No part's *shape* is called documented. The unsourced overall height shown in the first version (46.3 m) was removed. The payload envelope is labelled a stand-in; ST31 carried 36 OneWeb satellites.

### 5.2 EduSat-3U (a concept for learning)

In the CubeSat Design Specification's own frame (long axis Z, side faces ±X and ±Y, −Z into the dispenser first, and the face turned to the Earth while the camera works). The rails are drawn as angles, with the boards, the rods and the antenna module inside them. Thirteen units in five subsystems (structure; power; computer and attitude control; communications; the mission payload), 77 pieces in the reference design.

| Unit | Mass (kg) | Load | How known |
| --- | ---: | --- | --- |
| 3U frame (four rails drawn as angles, two end frames, two deployment switches, RBF pin) | 0.30 | — | mass estimated; envelope, rail width, switches and pin: CDS Rev. 14.1 |
| Board stack hardware (rods, spacers, base plate, harness) | 0.14 | — | estimated |
| Battery, 1 cell / 2 cells | 0.09 / 0.15 | 9.36 / 18.72 Wh | 18650 cell 3.6 V × 2.6 Ah, typical; board estimated |
| EPS | 0.10 | 0.15 W always | set by this section |
| Attitude control | 0.18 | 0.5 W always | set by this section |
| OBC | 0.06 | 0.4 W always | set by this section |
| UHF radio | 0.08 | 0.25 W always + 3.5 W × 8 min in sunlight | set by this section |
| Deployable antenna | 0.08 | — | estimated; deploys no sooner than 30 min after ejection (CDS §2.4.4) |
| Side panels × 4 | 0.12 each | 28 cells (7 a panel) × 30.18 cm² = 0.0845 m², 29.5 % | AZUR 3G30-Advanced data sheet (bare cell); panel mass estimated |
| Day camera / night camera | 0.30 / 0.50 | 2.5 W × 10 min in sunlight / 6 W × 25 min in the shadow | set by this section |

Reference: 1 cell + day camera, **1.810 kg**. Checked on screen at the deepest depth against the specification's bounds for a 3U (Rev. 14.1): the envelope, the typical maximum mass 6.00 kg, the centre of mass within ±2 cm in X and Y and ±7 cm in Z, protrusion from the rails ≤ 6.5 mm (the sun sensors', 1.5 mm, is what stands furthest out), rails ≥ 8.5 mm (this model's own dimension), and Rev. 13's 100 Wh of stored energy — with the note that passing these is not certification (materials, venting, inhibits and tests are not modelled, and the launch provider's own limits rule).

## 6. The energy balance

The model is unchanged from the first version, and still checked by a brute-force one-second integration written apart from it. Two rows of the ledger on screen were renamed for what they show (the energy from the panels that reaches the bus; the energy the loads ask for).

Scenario (on screen): circular 500 km, β = 0° (the longest shadow: 35.75 min of a 94.62 min orbit), starting at sunrise with a full battery, three orbits. Panels in sunlight S·A·η·I_d/π = 1361 × 0.0845 × 0.295 × 0.77 / π = **8.32 W**, × X_d = 0.8 to the bus = 6.65 W. Surplus charges the battery at η = X_e/(X_d·η_BAT) = 0.833; the battery gives back at η_BAT = 0.9. Full at capacity, floor at 30 % depth of discharge (below it loads go unpowered: a shortfall). Integrated exactly per stretch of constant power.

| Design | Mass | Battery | Shadow draw | Usable | Result |
| --- | ---: | ---: | ---: | ---: | --- |
| 1 cell + day camera (reference) | 1.810 kg | 9.36 Wh | 0.86 Wh | 2.81 Wh | all powered; lowest 8.50 Wh (91 %) |
| 1 cell + night camera | 2.010 kg | 9.36 Wh | 3.64 Wh | 2.81 Wh | **short 10.9 min each orbit, 0.75 Wh** at the end of the shadow |
| 2 cells + day camera | 1.870 kg | 18.72 Wh | 0.86 Wh | 5.62 Wh | all powered |
| 2 cells + night camera | 2.070 kg | 18.72 Wh | 3.64 Wh | 5.62 Wh | all powered; lowest 15.08 Wh (81 %) |

The balance is worked out in this section only; the hand-off does not carry it and Orbit neither receives nor recomputes it — said on the hand-off panel. Not modelled: temperatures, stresses, attitude changes while imaging, battery ageing, voltages, real mission life.

**One assumption that the pictures cannot both keep (second review, T-3):** the balance turns the satellite about its long axis square to the Sun through the whole sunlit arc, the day camera's ten minutes included; a camera held on the ground through those minutes (β = 0°, near orbit noon) would leave the side panels about a third of that light, about 2.4 W at the bus against 3.8 W asked for, some 0.26 Wh from the battery. None of the four verdicts changes (2.81 Wh is usable), but the screen no longer says the day camera is powered directly by the panels, and the note under the ledger says the balance does not work this out.

## 7. Checks run

| Check | Result |
| --- | --- |
| `npx tsc --noEmit` | pass |
| `npx vite build` | pass |
| The section's unit tests, `tests/structure-*.test.ts` | 201/201 pass in 15 files: assembly 16, boundary 5, content 20, edusat 9, handoff 12, labels 8, loader 6, model 16, picture 23, power 11, progress 9, storage 8, store 34, text 9, tree 15 (157 in 13 files before the second review) |
| Tests of the app the change touches (architecture, privacy inventory, repo hygiene, app-mode, section-nav-model, section-plan, i18n, i18n-thai-terms, pwa, EO-STO-1) | 99/99 pass; `tests/eo-sto/ref/` byte-identical to main |
| `node --test tests/verification/*.test.mjs tests/browser/shard.test.mjs` (the change map's entry now names the app's side of the section and both journeys) | 93/93 pass |
| Full `npx vitest run` | 359 files, 10,830 tests, all pass (19 min in this container), on the final tree `b62dad8`. A run one commit earlier had one failure: the privacy inventory test caught a request the loader's new offline check made (a fetch not on the privacy page's list); the request was taken out, and the suite run again |
| Browser journey `structure-assembly` (`node tests/browser/run.mjs structure-assembly`, built `dist`, Chromium 153, software WebGL) | pass, 161 s: desktop 1440×900 in Thai (the section not fetched until opened; exploring at the three depths; a circuit; the flight guide; assembly at a first look and from the middle depth, with mouse drags, one sampled with motion on to see the part keep with the hand; the browser's own keys left alone; EduSat; my experiment; Orbit and Launch with read-back receipts; reload), English 1280×800 (the draft fetched and marked), phone 390×844 with touch and reduced motion (taps, a finger's drag, keys), and a small phone 390×664 (everything within the screen's width, the verdict under the picture beside the option chosen, a refusal read under the picture, the tools reached) |
| Browser journey `structure-failures` | pass, 101 s: each fetch failed in turn — the section's code (and its retry while still offline: the app is kept), a model's data, its 3-D alone, one layer, a language's copy (said, and brought by loading the page again) — a model switched away from while it loads, and no WebGL; what the page then says and offers |
| The same failures probed first with a script outside the repo (sent with this report) | 25/25 pass on the final build (run again after every batch of fixes), after it found four defects of the rebuilt stage, now fixed: the retry of the section's own code answered with the browser's remembered failure for ever (it now loads the page again at the same address, as the lesson pages do); the note and retry for a failed 3-D were inside the hidden picture box; a model switched away from while it loaded stayed "loading" and could not be opened again; without WebGL a model that needs no fetch was brought again without end |
| `node scripts/bundle-budget.mjs` | pass, with the ceilings the owner approved on 2026-11-12 (§9); it failed until then, on the pull request's first CI run too |

Looking at the real page found what the tests had not: the picture left empty after its box changed size; place marks lying over one another along a rocket's axis; names cut off on a phone; a view left close after a place was looked at, so the other places could not be chosen; a name on the picture taking the press meant for a part; every inside layer fetched when an assembly was merely picked. Each is fixed, and the journey now holds the first five. Failing each fetch in turn found four more (the row above). The second review (§10) then found 45 more, most of them by trying the built page in ways the journeys had not: with motion on, on a short phone, with the keyboard alone, offline, with a record kept from the first version.

### 7.1 Performance

Measured on the final build with the container idle (4 cores, **software WebGL** — SwiftShader, no GPU), a first visit with nothing cached and no service worker, Chromium 153:

| Case | The section's place on screen | 3-D ready | A frame while turning | Opened again |
| --- | ---: | ---: | ---: | ---: |
| Desktop 1440×900, Soyuz, middle depth | 0.03 s | 3.9 s | 0.28 s (outside only), 0.47 s with every layer | 1.0 s |
| Desktop 1440×900, EduSat | 0.04 s | 3.6 s | 0.017 s | 0.4 s |
| Phone 390×844 at 3× pixels (emulated), Soyuz, first look | 0.04 s | 3.3 s | not measured | 1.0 s |

"3-D ready" is from the address changing to the model drawn: the section's own code fetched (77 kB gzip), the WebGL context made, the model's content and first layer fetched and decoded. The Soyuz's two further layers arrive in about 0.35 s when asked for. All three layers are 633,416 triangles in 71 draw calls; the page's heap is 55 MB with the Soyuz in, 43 MB with EduSat, 71 MB on the emulated phone. The Soyuz's frame time is the software renderer's: nothing here says what a real GPU or a real phone does, and neither was measured.

## 8. Storage

`orbitlab.structure.v1` in the learner's profile, as in the first version, with one field more: whether the helper is open. A record kept from the first version is read with today's names for the satellite's ±Y side panels and faces (the first version named them by the picture's z), so an assembly finished then is still whole. The model and activity last open, each model's placements, when each was first completed, "my experiment" and which design is shown. A record that cannot be read is set aside by the profile before it is written over, and the section says it started afresh; a newer version's record is never written over, and the section says its work is not being saved; a save the profile or the browser refuses is said too (`tests/structure-store.test.ts`, `structure-storage.test.ts`). Sending to Launch or Orbit replaces the mission or orbit open there, as Build's own buttons do, and the panel says so before the press; Launch's earlier mission is kept in memory and can be put back while Launch still holds what was sent. `tests/eo-sto/ref/` is unchanged (owner's rule q04 B).

## 9. Budget (D-38) — approved by the owner, 2026-11-12

The owner chose on 2026-11-10 to load the section when it opens. Measured on this tree with `npx vite build` and `node scripts/bundle-budget.mjs`, against main's build at `3e1b48a`:

| Group | Main | First version | This version | Ceiling | Over |
| --- | ---: | ---: | ---: | ---: | ---: |
| `index-*.js` | 2654.2 kB | 2840.2 kB | 2663.0 kB | 2655.0 kB | +8.0 kB |
| `index-*.css` | 178.3 kB | 186.9 kB | 178.3 kB | 179.0 kB | within |
| `i18n-*.js` | 1732.5 kB | 1734.1 kB | 1734.1 kB | 1733.0 kB | +1.1 kB |
| other chunks | 771.5 kB | — | 1229.6 kB | 772.0 kB | +457.6 kB |
| precache code | 14678.8 kB | 14874.9 kB | 15147.4 kB | 14679.0 kB | +468.4 kB |
| precache | — | — | 16266.6 kB | 16078.0 kB | +188.6 kB |
| first download (index.html and what it loads) | 5101.1 kB (1430.1 gzip) | 5297.2 kB | 5111.5 kB (1438.7 gzip) | — | +10.4 kB on main |

The section's own files, fetched when it opens: `structure-*.js` 274.1 kB (76.7 gzip; about 109 kB of it the Thai text), `structure-*.css` 26.1 kB, and for the language on screen `structure-en-*.js` 61.3 kB (19.1 gzip) or `structure-ru-*.js` 96.7 kB (24.4 gzip) — each some 4 % larger than before the second review's fixes. They are what "other chunks" is over by: no other chunk of the app changed (checked module by module). `index-*.js` grows by the loader, the app's side of the hand-off and the composite addresses; `i18n-*.js` by the four section-switch keys in three languages.

No ceiling was raised until the owner chose. Put the two variants below on the pull request, the owner answered "1" on 2026-11-12: the proposal as written, with the section's files in the precache. The ceilings are now, each with its measured size, its reason and that approval in `budgets.json` `_notes.set`:

```json
"structure-*.js": 275,
"structure-*.css": 27,
"structure-en-*.js": 62,
"structure-ru-*.js": 97,
"index-*.js": 2664,
"i18n-*.js": 1735,
"precache code": 15148,
"precache": 16547
```

One figure differs from the proposal as first written, which said 16267 for the precache total: by the file's own rule the total follows its two groups (code 15148 + data/ 1399), so that a larger data snapshot, which `precache data/` allows, does not fail the total. The raise is the same 469 kB of code; the data headroom is what it was.

with a note under `_notes.set` naming this section, and "other chunks" left at 772 (it then measures 771.5 kB again, as on main). One choice inside it: the service worker downloads every file under `assets/` in the background, so the section's 458 kB join the precache, and the section's code — with EduSat, which needs no model file — then works offline from the first visit. The other way is to fetch the section's files on demand, as its Soyuz model files already are (`src/pwa/manifest.ts`): the precache ceilings then stay as they are, and the section needs the network the first time it is opened. Both are a line of configuration; the owner decides.

## 10. Review

The owner asked for GPT-6.1 Sol to build and GPT-6 Astra to review. Neither is available here: the work was done by Claude, and every review by Claude agents with their own context. **None of it is a review by Astra**; the context to hand to Astra is sent with this report.

- **First version, two rounds** (15 findings, then 22): the tables are kept in Appendix A.
- **The first version against the brief** (the audit before this rebuild): two of seven lenses, 29 findings — §2.
- **Translations:** two more agents drafted the English and the Russian from the Thai. The Russian translator's notes led to changes in all three languages (a nozzle and an injector told apart in the Thai, a joint's name after a colon, the cells' area, units and per cent by the language, a name of its own for the colour legend). The English translator's notes were lost with the session's usage limit; its text passed the same mechanical checks and was read in part.
- **Second version:** five lenses over the second version (data and physics; state, logic and the 3-D view; use and accessibility; text and claims; architecture, loading, storage and tests), each read-only, each told to report what is wrong, unsafe or untrue with evidence from the built page. **45 findings: 3 P1 by the rule that a brief requirement must be met and the report's claims be true, 1 more P1 for an untrue claim, 20 P2, 21 P3; no P0.** All 45 are fixed or answered in commits `c429ac8`, `fdf11d6` and `85f3843`; what is not fully done is said in the last column and in §11.

How far the findings were checked by someone else: for the last three lenses (27 findings) a second agent was given each finding and told to refute it; it confirmed all 27, lowering one from P2 to P3. For the first two lenses (18 findings) that second pass **did not run**: the session's usage limit stopped it. Those 18 were instead reproduced by me, with the reviewers' own scripts, on the build before the fix and again after it — which is not an independent check. The three later lenses read a frozen copy of the tree as it was before any of these fixes, so the fixes themselves have been checked by the tests and journeys in §7, not by a reviewer.

| # | Sev. | Found | Done |
| --- | --- | --- | --- |
| D-1 | P2 | Fregat's "tanks" group held three small vessels; its four propellant tanks and two equipment bays were filed under "shell and insulation" | a group that says what is seen from outside comes after those that say what a part is; the tanks group holds all nine; test of what each group holds |
| D-2 | P2 | "ดูจุดต่อ" for the fairing's seam lit a ring round the barrel and called it the line where the halves meet | the seam is named without parts to light (the page draws none); test of what every joint lights |
| D-3 | P3 | Group counts overlapped (the "whole engine" row beside the six groups it is made of) and some cards contradicted the page's own count | a row whose parts narrower groups name says so beside its count; a card says what the page's count covers (both halves; parts named elsewhere); a row reads hidden when other rows hide all of it |
| D-4 | P3 | No test held the centre of gravity, the specification checks, the frame convention, the joints or a group's contents; one test used the first version's 4 kg | `tests/structure-edusat.test.ts` (the four centres of gravity worked by hand, the eight checks and that they can fail, the frame, what is drawn); the mass bound from the code |
| D-5 | P3 | The protrusion figure left out the sun sensor; the rail check could not fail; rods and board corners were drawn inside the rails | the protrusion is the sensor's 1.5 mm; the rails are drawn as angles with the boards, rods and (found by the new test) the antenna module inside them; the rail's width is the model's own figure against the bound |
| D-6 | P3 | Two rows of the energy ledger were not the quantities their labels said | the rows are named for what they show (energy from the panels that reaches the bus; energy the loads ask for), in three languages |
| D-7 | P3 | Three statements of this report did not match the model | corrected (28 cells; two switches; 14 of 15 circuits step by step) |
| S-1 | P2 | With motion on, a dragged part and the sliders lagged: every move began a 380 ms ease again | what follows a hand is drawn where the hand has it, also on the move that takes a part off a place; the journey samples a drag with motion on |
| S-2 | P2 | A joint shown outlived a circuit or a guide step chosen next: the circuit was neither framed nor fetched | a system followed takes the joint's place, in the store and in the picture; test |
| S-3 | P2 | Closing or finishing the helper left a followed system on the picture, with no control to stop it at a first look | leaving a guide takes off what its steps put on (system, joint, flight step, the view's switches as they were); the bar's note has a stop button at every depth; test |
| S-4 | P2 | The search box was rebuilt on every keystroke (caret to the end; a composing keyboard's text doubled) | the box stays and only its results are redrawn; reproduced fixed with a composition through the debugging protocol |
| S-5 | P2 | The focused view swallowed Ctrl/⌘ +, −, 0, Alt+← and Ctrl+R | combinations with Ctrl, ⌘ or Alt are left to the browser; journey check |
| S-6 | P1 | This report said the 3-D starts after the section is painted; the WebGL context was made inside the first draw | made true: nothing that draws the section makes the 3-D until a frame has been painted (measured: one animation frame before the context is asked for) |
| S-7 | P2 | A selection could be on something not drawn (shown alone elsewhere, under a hidden row, a system followed), and the view framed where it would be | picking a thing shows it (what else was hidden stays hidden); hiding a thing drops a selection under it; a part picked while a system is followed is lit among its parts; the view frames what is drawn. Left as it is: a flight-guide step selects the assembly that has just left, to show its card |
| S-8 | P3 | Undo could leave in hand a part that was fitted again | cleared; test |
| S-9 | P3 | One model's assembly message was shown under the other's, with raw ids | cleared when the model changes; test |
| S-10 | P3 | After a change of depth the colour view, the shell or a hidden part stayed on with no control for it | a change of depth puts back what the new depth has no tool for, and puts down a part in hand; test |
| S-11 | P3 | The rocket's circuits kept the language they were first listed in | the list is made again when the language changes |
| U-1 | P1 | EduSat at a first look: picking a fitted part acted on the first part of its subsystem (the wrong part offered for removal, and removed) | assembling takes the unit from the selection itself, not from the depth's node; test |
| U-2 | P1 | On a phone the verdict was not under the picture while options were chosen (this report said it always was) | on a narrow screen the verdict stays under the picture while the page scrolls; journey check at 390×664 |
| U-3 | P2 | On common phone heights the picture and the bar that stays took the whole section; the tools could not be reached | the picture takes half of what the section has (not of the window); only what is in hand and what was last said of it stays; journey check at 390×664 |
| U-4 | P2 | Folded readings forgot their state on every redraw (the energy picture's own switch closed it) | a fold stays as the learner left it; test |
| U-5 | P2 | The keyboard's focus was lost to the page after the section's own navigation and after following a system | the heading the focus falls back to survives the redraw and shows its focus; the focus goes on to the next thing to do (a place to choose, the next part, the tab gone to); test |
| U-6 | P2 | What exploring did to the view (taken apart, coloured by kind, parts hidden) carried into "ดัดแปลง", which has no control to undo it | changing a design looks at the model as it is; test |
| U-7 | P2 | On a phone the rows that scroll sideways hid the third activity and the reset with no sign | the activities stand in a row of their own, all in sight; a first look's tools on two rows with reset beside the whole view; a scrolling row keeps its place and fades at the edge more lies beyond; journey check |
| U-8 | P2 | A phone on its side: the picture 92 px tall | the picture keeps at least 150 px and the bar scrolls inside itself. Still cramped: said as a limit (§11) |
| U-9 | P2 | On the narrow layout a control reached by moving backwards lay under the picture that stays | scroll padding of the picture's height |
| U-10 | P3 | At a first look the line on the picture told the learner to drag parts, which does nothing there | the hint follows what the view does; the bar no longer says "in the side panel". Not done: naming the loose parts on the picture at the middle depth (a name could take the press meant to drag a part; the list names them) |
| U-11 | P3 | The view's keys only in its long accessible name; the live region silent for several changes; small touch targets; two low-contrast texts | a short name, the keys as its description and shown on the picture while it has the focus; a part in hand, its place and turn, and a system followed are said; groups instead of toolbars (no arrow-key roving was added); one label for the eye button; larger names, marks and rows for a finger; the hint and path in the lighter grey |
| T-1 | P1 | Fregat was refused when turned, for a reason the model itself contradicts (its spheres and posts line up at every quarter turn) | Fregat goes in one way; the rule and its sentence are gone; test |
| T-2 | P1 | The interstage's panel says RD-0110 lights on this Soyuz-2.1b: the Anatomy page's own sentence, wrong for the 2.1b | the page's words are the owner's and are shown as they are, followed by this section's remark naming RD0124; the remark goes when the page is corrected; test. **A question for the owner (§11)** |
| T-3 | P3 | "The camera points at the Earth" and "the panels stay square to the Sun" cannot both hold; the day camera was said to be "powered directly by the panels" | the option says only that it works where the panels produce power; the balance's note says it does not work out what pointing the camera at the Earth costs the panels; §6 |
| T-4 | P2 | This report said the documents themselves are shown from the middle depth; they are at the deepest | corrected (§2, AE-13) |
| T-5 | P3 | "ตรวจแล้ว" on a finished assembly named two things nothing checks | the line says what is checked; the unused parameter is gone |
| T-6 | P3 | Group sentences for Block I and Fregat described parts not in the group | a sentence for each stage's own groups, in three languages |
| T-7 | P3 | Thai: one thing with two names, one word for two things, a wrong technical word | boards are แผงวงจร and solar panels แผงเซลล์ throughout; ข้อกำหนดคิวบ์แซต; energy in the battery, not charge; per cent as %; hard anodising; the node's local time as Orbitlab writes it |
| T-8 | P3 | Russian named the middle depth differently from the app's own switch; English used "Explore" for a depth and an activity | the Russian draft uses the app's word; the English activity is "Inspect" (a draft: the owner or a native reader picks) |
| T-9 | P3 | The cutaway note said "every part"; the rocket's "confirmed from documents" was not said to be the page's citing; a count in this report | the note says which parts are cut; an assembly's facts say what the badge rests on there; the count corrected |
| A-1 | P2 | "Try again" after a failed code load put the browser's error page in the app's place when still offline with no worker | the page is loaded again only when the browser says it is online or a worker can answer for it; else the note stays and the app goes on; unit test and journey check. (A first writing probed with a request of its own; the project's privacy test caught that as a fetch not on the privacy page's list, and it was taken out) |
| A-2 | P1 | A language copy that failed to load was never said and never retried, and this report claimed every failed fetch had a note and a working retry | said in the app's own words for that language, with the page loaded again as the way out; journey check; §4 B6 reworded |
| A-3 | P2 | 22 of 34 targeted mutations of the section's logic passed all 157 unit tests (among them the cut's side and the helper's stored state) | tests added for what they showed unheld (the cut's side from the model's own geometry, the stored helper state, a flight step's dropped parts and moved stage, the shell, a place already taken, starting again with a part in hand, a completion's date, an order-free restore); eight of the mutations run again here, each now caught. The reviewer's whole list was not run again |
| A-4 | P3 | The loader and the app's side of storage had no unit test; two tests exercised something other than the production path | `tests/structure-loader.test.ts`; the storage test goes through the storage the app hands the section; the loader's page-name rule is exported and held to the section's |
| A-5 | P3 | A record stored by the first version lost its ±Y side-panel placements silently | it is read with today's names; test; §8 |
| A-6 | P3 | Nothing forced a new data revision when the model files' bytes change | the four files' SHA-256 are pinned to their revision in a test |
| A-7 | P3 | Comments naming files that do not exist, six exports nothing used, a count in this report | corrected and removed |

## 11. Limits, open items and questions for the owner

**Choices made in the owner's place, to overrule if wrong:**

1. The helper's guides live inside this section; they are not lessons of Orbitlab's Lessons.
2. The third activity is called "ดัดแปลง" on its tab; the thing made in it is "แบบทดลองของฉัน", as the brief names it.
3. Strap-ons are block-specific; EduSat's side panels are interchangeable.
4. Exploring and assembling always show the reference design; only "ดัดแปลง" shows the learner's.
5. The Soyuz model keeps the Anatomy page's own Thai terms (ขั้น, หัวครอบ, สัมภาระ), with a line saying they are Orbitlab's ท่อน, ฝาครอบหัวจรวด and น้ำหนักบรรทุก; EduSat's text uses Orbitlab's own terms and unit words.
6. The Cyrillic block letters are given Thai readings (Б เบ, В เว, Г เก, Д เด).
7. A first look assembles on the reference's outline with one press a part; from the middle depth the parts lie apart and the place and the way round are the learner's to choose.
8. A whole assembly picked does not fetch its inside; a part, a group, a circuit, a joint, the cutaway or the see-through shell does.
9. The section's files are left in the service worker's precache (works offline after the first visit), which is what the precache part of §9's proposal pays for.
10. Fregat goes into the assembly one way: the page's data gives no reason to refuse it turned (§10, T-1).
11. A passage of the Anatomy page that its own data contradicts is shown as the page has it, followed by a remark of this section's, rather than changed or left out (question 5).
12. In the English draft the first activity is "Inspect" (the depth is "Explore", the app's word); in the Russian draft the middle depth is «Исследование», as the app has it.

**Questions:**

1. ~~Budget (§9)~~ — answered 2026-11-12: the proposal as written (the section's files in the precache).
2. **The Thai written for this version** (the first-look cards of the seven kinds of assembly, a sentence for each of the page's groups, EduSat's pieces and their specification notes, the three guides, the reasons for the order): please read them; they are mine, not the Anatomy page's.
3. **Ways in from the rest of Orbitlab (E-15):** a card on Home, a link from Build's Anatomy window and from Launch's Soyuz-2.1b? It touches three other sections and the first download.
4. **A second assembly sequence, as a launch site does it (AE-14)** — horizontal, the upper composite put together first — and a third model: which next?
5. **A sentence of the Anatomy page (conflicting sources):** the interstage's text says "RD-0110 เริ่มทำงานก่อนแกนกลางสิ้นสุดการทำงาน". The page's own Block I card, circuits and flight step give this Soyuz-2.1b the RD0124; RD-0110 is the 2.1a's engine. I did not change the page (it is yours, and the model files carry its hash): the section shows the sentence followed by its own remark, which goes by itself once the page says RD0124 and `npm run structure` is run. Should the page be corrected?

**Limits:**

- The 2026-11-02 delivery was not compared (owner's choice, §1).
- English and Russian are drafts by a translating agent, marked on screen; the Soyuz page's own text, groups and circuit notes are shown in Thai in every language, and the screen says so.
- Phone checks are Chromium's emulation (390×844 and 390×664, touch events through the debugging protocol) in this container, not a real phone; a pen was not tried. Measurements are with software WebGL on a 4-core container. A phone on its side leaves the picture about 150 px of a 390 px window (the app's own header takes 89): usable, not comfortable. No screen reader was listened to: names, states and the live region's words were read from the page.
- From the second review, left as they are: the loose parts are not named on the picture at the middle depth (the list names them, and a press picks one up); a flight-guide step selects the assembly that has just left, to show its card, so nothing of it is on the picture; the tools' rows are groups without arrow-key roving.
- The second review's refuting pass ran for three of its five lenses (§10); a reviewer has not read the fixes themselves.
- Not done from the audit: taking one assembly apart alone and a free cutting plane (E-13), the generator still reads one page (E-12), E-15 and AE-14 above.
- D-25 asks for about 400 changed source lines per PR; this section is about 12,000 lines of source (about 2,450 of them its text in three languages) and 4,300 of tests. A split for merging: (1) the model files, the pure core and their tests; (2) the viewer; (3) the shared description, the screen and the adapters; (4) the experiment and the hand-offs; (5) the language drafts. The owner decides.
- Not in this pilot (as asked): changing Soyuz, a vehicle library, a CAD tool, strength analysis, accounts, a large curriculum.

## 12. Trying it

On a machine with the repository at this branch: `npm ci`, then `npm run dev` and open `http://localhost:5173/#/structure/watch/soyuz-st31` (or `…/explore/edusat`, `…/explore/edusat/assemble`, `…/explore/edusat/experiment`). A built copy: `npm run build && npm run preview`, then `http://localhost:4173/#/structure/watch/soyuz-st31`. The browser journey: `npm run build && node tests/browser/run.mjs structure-assembly`. After replacing the Anatomy page: `npm run structure`, then `npx vitest run tests/structure-model.test.ts`.

## 13. Revisions

On `claude/trusting-cannon-oah00c`, from `main` @ `3e1b48a`; pushed on 2026-11-11 with the owner's word, as draft pull request #217; not merged:

| Commit | What |
| --- | --- |
| `a8b6aaa` … `be35eb7` | the first version (six commits; its report is this file's history) |
| `6785362` | a section of its own: loaded when it opens, given what it needs of the app (`StructureEnv`), the boundary test |
| `8c14c8d` | the model files, revision 2: every vertex marked with its own part (E-01), the page's circuits, steps and flight sequence carried |
| `7e49f02` | one description for every model, the stage-first screen, tools by depth, names on the picture, internal systems, the helper, assembly and experiment rebuilt, EduSat by CDS Rev. 14.1, Thai source text and the English draft |
| `ebff90a` | a part dragged onto its place, names for places and joints, see-through rules, the Russian draft, the unit tests and the journey for the section as it is now |
| `b691d76` | what the stage does when a fetch fails (four defects found by probing) |
| `fa7defc` | the failure journey; the change map |
| `23a0a4f` | this report, as first written |
| `c429ac8` | the second review's data-and-physics and state-and-logic lenses: 18 findings |
| `fdf11d6` | its text and use lenses: 20 findings, the narrow layout reworked |
| `85f3843` | its architecture lens: 7 findings, the loader and storage tests |
| `b62dad8` | the loader asks the browser whether the page can be had (no request of its own: the privacy test) |
| `48294ad` | this report, with the review's results, the final checks and measurements |
| the commit after it | the budget's ceilings as the owner approved them, and this report brought up to date |

The commits follow the work, not mergeable steps, and only the tip was checked in full. The tip passes everything in §7.

## Appendix A. The first version's reviews (kept as a record)

### A.1 First review: findings and what was done

| # | Finding (the reviewer's priority) | Outcome | Evidence after the fix |
| --- | --- | --- | --- |
| 1 | P0 — the bundle budget fails CI: `index-*.js`, `index-*.css`, `i18n-*.js` and precache code over their ceilings; three comments said the section had a chunk of its own | **Owner's decision (D-38), not changed.** Both ways measured (first version, by then §8); the comments corrected | §8 |
| 2 | P1 — a side panel put on another face was drawn on its own face, and the place buttons then looked wrong | **Fixed.** A part in place is drawn in the slot it went into (`panelTurn`); `viewAssembled` expects that slot's turn (without it, the first fix would have kept a valid assembly from ever showing "complete" — the reviewer saw this in the work in progress); a drop on the model chooses a free slot by its occupant | unit test: each panel on each face lands on that face as three.js turns it (fails if a face's sign is flipped); journey: the +X panel's centre at the −Z face, EduSat complete with two panels on other faces |
| 3 | P1 — receipts: Orbit's read back the object just sent; after a change it said "the current design's mass" beside "changed after sending"; a refused send was still recorded as sent and its reason (in English) was drawn only in the Assemble panel; Launch skipped the checks Build's "Fly it" runs | **Fixed.** Read back from Orbit's playground (`heldHandoff`: its orbit from the state vector, the mass its lifetime analysis takes) and from Launch's mission after its checks; `checkReceipt` holds mass (0.5 g), apsides (1 km), inclination (0.05°) and values put back (none); worded as held when sent; Build's checks run first; a refusal is said beside the send buttons, translated, and nothing is recorded | `tests/structure-handoff.test.ts` (all four designs through Orbit's and Launch's own code; a wrong receipt is caught); journey; browser probe |
| 4 | P1 — switching model while the other loads left the old model drawn and pickable under the new name; a failed load left it on screen | **Fixed.** The viewer is cleared when the load starts, picks come only from the model shown, the canvas goes when the model's 3-D failed | probe: 0 triangles and no pick while Soyuz loads, Soyuz shown after |
| 5 | P2 — the cutaway camera looked 90° off, at the cut edge-on | **Fixed.** `cutawayAzimuth` from the page's own halves (135°) | unit test against every unit's halves; probe |
| 6 | P2 — saving stopped silently after a damaged or newer record | **Fixed.** Damaged: written over, the profile sets the old copy aside; newer: left alone; both said in the section's head; a refused save said too | unit test; probe (damaged copy in the profile's quarantine, progress kept across a reload; newer record unchanged) |
| 7 | P2 — a failed inside/engine layer was silent in Explore | **Fixed.** Said on the stage with a retry; its switch let go | probe: note, retry, layer loaded after |
| 8 | P2 — "the parts list still works" was said when the model's data itself failed | **Fixed.** Two messages: data failed; 3-D failed (list and side view work). The PWA comment corrected | probe for both |
| 9 | P2 — the power model's "balances exactly" comment lacked its precondition | **Fixed.** Stated, with the shortfall a sunlit peak causes | `power-balance.ts`, §6 |
| 10 | P2 — the CubeSat mass bound's context (Rev. 14.1 cited, Rev. 13 used) | **Partly.** Said on screen that the bound is the lesson's, later revisions and providers differ, and Rev. 14.1 was not checked; the value itself could not be checked (hosts blocked) | §4.2, §4.3 |
| 11 | P2 — "Back to the reference" overwrote my experiment | **Fixed.** Worded "Reset my experiment to the reference" (Thai and Russian alike) | text |
| 12 | P2 — accessibility: no keyboard path to a placed part after taking one off; no keyboard pan; `role="img"` on an interactive canvas; a live region recreated on each render; the no-WebGL side view ignored the assembly | **Fixed.** Parts in place listed as buttons; Shift + arrows pan (said in the canvas's name); `role="application"`; one live region that stays and says the selection; the side view shows what is in place, where | probe; journey |
| 13 | P2 — tests weaker than their names (an always-true nav check, keys not checked, a 0.5 kg tolerance, a results test that checked only keys, no check of the drawn placement) | **Fixed.** Nav marks this section; each key moves the view and 0 brings back the overview; Orbit's own rounded kilograms checked as such (the read-back carries the value); results are a function of the design; drawn placement checked | journey; tests |
| 14 | P2 — the EO-STO-1 reference copy was edited | **Fixed.** Restored byte for byte; the commit dropped from the (unpushed) history; the step reads the reference's keys and a test pins the one difference (§8) | EO-STO-1 7/7 |
| 15 | Minor — `clear()` kept the state texture; a comment named a file that does not exist; a hard-coded "Model" label; Launch is set live before the mission is checked | First three fixed; the last is the order Build's "Fly it" uses, kept | — |

Verified correct by the reviewer (unchanged): mass counted once, from the parts list to Orbit's and Launch's figures (1.810, 2.010, 1.870, 2.070 kg); all four designs pass Orbitlab's satellite checks and the Launch checks; `toFlight` is a proper rotation; strap-on axes a quarter turn apart; the preview's turns follow three.js; the power integration, η_charge = 0.833, the SMAD identities and the shortfall accounting; the Soyuz facts spot-checked; reference and experiment kept apart; fetches cancelled and GPU resources freed on leaving.

### A.2 Second round: the fixes checked

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
