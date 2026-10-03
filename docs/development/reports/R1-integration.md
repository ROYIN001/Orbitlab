# R1 integration / รายงานรวมและส่งต่องาน

วันที่: 2026-10-03 UTC. ฐาน main: `523b44eca0e31fd84fd4a3faa4e1b883428288ee`. Branch: `codex/r1-profiles-foundations`.

สถานะปัจจุบัน: implementation รวมแล้ว; กำลังปิด acceptance / final source / CI. **ยังไม่รายงานว่า merge หรือเผยแพร่สำเร็จ** จนมีหลักฐาน GitHub จริง. อ่าน [PROGRESS.md](../PROGRESS.md) และรายงานรายแพ็กเกจก่อนเริ่มงานต่อ.

## ขอบเขตที่ผู้ใช้อนุญาตและสิ่งที่ส่งมอบ

| งาน | ผลลัพธ์และรายงาน |
|---|---|
| R1.1 / U01 | หลายโปรไฟล์ในเครื่อง แยกงานทั้งหมดของผู้เรียน ย้ายข้อมูลเดิมโดยเก็บ raw bytes รีเซ็ตแยกการเรียน/ผลสอบ สำรอง JSON และไฟล์เสียงแยก; [storage](R1.1-storage.md) |
| R1.2 / U01 | เมนูผู้เรียนและชื่อผู้เรียนทั่วหน้าการเรียน/สอบ สร้าง–เปลี่ยนชื่อ–สลับ–ลบ reset/backup/import พร้อมยืนยันขอบเขต; [UI](R1.2-profiles-ui.md) |
| R1.3 / U07 | เลื่อนเนื้อหาด้วยเมาส์/สัมผัส/คีย์บอร์ดตามเจ้าของพื้นผิว ไม่ส่ง input ไปกล้องที่ถูกหน้าอื่นบัง; [gestures](R1.3-gestures.md) |
| R1.4 / U06,U15 | จำกัด main/RCS impulse และ torque ตาม fuel lifetime จริงใน step, coast หลัง fuel-out, ไม่อ้าง burn สำเร็จเมื่อ impulse ยังไม่ครบ; [fuel](R1.4-fuel.md) |
| R1.5 / U13 | discovery/union ของ tests, source/runtime/snapshot/dist identity, Pages gates ขนานและ publisher guard; [workflow](R1.5-workflows.md), [verification guide](../VERIFICATION.md) |
| งานเล็ก U08/U09/U16 | เอาปุ่มรีเซ็ตกล้องที่ผู้ใช้ระบุออก ซ่อนตัวเลือกตามภาษาแต่คง implicit default/explicit override และระบุ percentage ว่า command ทั้ง full/compact HUD/onboard; [small UI](R1-small-ui.md) |

แผนหลัก [PLAN.md](../PLAN.md) / [PLAN.docx](../PLAN.docx) เวอร์ชัน 1.2 บันทึก authorization ใหม่. DOCX ตรวจ OOXML/เนื้อหาครบทุกข้อเสนอและทุกระยะแล้ว แต่ไม่ได้ render ด้วย Microsoft Word.

## สัญญาที่คนรับช่วงต้องรักษา

- Workspace ผูก profile ID + epoch แบบคงที่ต่อหนึ่ง document. ใช้ Web Lock ต่อ owner สำหรับ durable write; catalogue มี lock แยก. ไม่อ้างว่า unlocked localStorage read/modify/write เป็น transaction.
- สลับ/รีเซ็ต/import ที่เปลี่ยน owner ต้องบันทึกงานค้างสำเร็จก่อน seal แล้ว reload; ล้าง query/hash ของผู้เรียนเดิม. หาก quota/save ล้มเหลวต้องอยู่ owner เดิม. ไม่ได้เพิ่ม live-flight resume.
- เปิดหลายแท็บ owner เดียวกันเป็น read-only; คนละ owner ทำงานพร้อมกันได้. ไม่มี Web Locks/พื้นที่เก็บข้อมูลเป็น temporary ที่ระบุชัดและไม่เขียน durable แบบปลด lock. ยังส่งออก readable JSON เพื่อกู้ข้อมูลได้.
- ไม่เขียน fallback ทับ opaque/future primary เพียงเพราะเปิดดู สำรอง หรือสลับ. การแก้ไขจริงเก็บ raw recovery ตาม adapter; external malformed/future/recovery import เก็บ inert quarantine และ preview เตือน ไม่ activate rollback ที่มากับไฟล์.
- JSON 8 MB ระบุชัดว่าไม่รวมเสียง; เสียงเป็น bounded binary archive แยก. JSON/IndexedDB ไม่ใช่ transaction เดียว; deletion มี tombstone/startup recovery.
- ไม่ลด physics tolerance ไม่เปลี่ยน golden ไม่ลบ tests เพื่อให้ผ่าน. หลักฐาน named heavy R1.4 ไม่เท่ากับ full heavy inventory/fleet scientific acceptance.
- เมนูโปรไฟล์/strict archive/media management โหลดเมื่อจำเป็น; dictionary/catalog split เป็นการจัดกลุ่มไฟล์ ไม่ใช่หลักฐานว่า startup เร็วขึ้น. เพดาน bundle ที่เปลี่ยนต้องมีเหตุผลใน budgets.json.

## Acceptance / หลักฐาน

| Gate | สถานะ ณ จุดบันทึกนี้ |
|---|---|
| Source review / contracts | storage, UI, gesture, fuel และ workflow ตรวจข้ามเจ้าของแล้ว; pending-only untouched-draft preservation รวมครบแล้ว |
| Storage/media/bootstrap/numeric | focused suites ผ่านตาม R1.1 รวม actual satellite pending/future cases; final CI ตรวจรวม |
| Learning save quota / opaque progress | 2 regression tests ผ่าน; quota blocks switch, retry saves A then opens B; untouched future primary ไม่ถูกเขียนทับ |
| Gesture production browser | ผ่าน 1 journey / 22.2 s; wheel +450 px บน 6 surfaces พร้อม keyboard/touch/hidden camera checks |
| Profile two-tab/temporary/offline | ผ่าน 1 journey / 177.6 s บน checkpoint ก่อน final flusher; final rerun รอ candidate |
| Profile UI / JSON / binary ownership | final production journey รอ candidate; intermediate runs ไม่ใช้แทน final acceptance |
| Notation production browser | ผ่าน EN/RU/TH defaults, explicit override และ reload; final CI ตรวจรวม |
| Fuel/runtime/session/replay/named heavy | 120 selected tests ผ่านบน frozen physics hashes ใน R1.4 report; ตรวจ hash ตรงอีกครั้งแล้ว |
| Verification infrastructure | 52 Node checks ผ่านหลัง consumed-doc policy refinement; actionlint ทั้ง 4 workflows ผ่าน |
| Type/build/budget | frozen-source `npm run build` และ budget พร้อม build-log guard ผ่าน; 69 files precached, manifest `0480437d28c62c` |
| PR / required CI / merge / Pages | ยังไม่เกิด; ต้องบันทึก URL / source identity และตรวจจริงก่อนรายงานเสร็จ |

## ขนาดไฟล์และข้อจำกัดด้านประสิทธิภาพ

Production checkpoint: initial index **2572.8 kB**, CSS **166.2 kB**, offline precache **15729.7 kB** อยู่ใต้เพดานเดิมของ precache **15783 kB**. Index allowance เปลี่ยน **2572→2573 kB (+1 kB)** สำหรับ ownership/bootstrap/pending-only checks; shared catalog ที่ Rolldown แยกเป็น i18n/lesson-file/catalog ถูกนับแยกทุกไฟล์ ไม่มีไฟล์หายจาก budget. ปรับ lazy-feature ceilings ตามเหตุผลใน `budgets.json`; combined JS+other allowance เพิ่ม **19.5 kB (0.20%)**, worker ทุกตัวใช้เพดานเดิม.

การเพิ่ม profile functionality มีต้นทุน code; ไม่อ้างว่า startup bytes หรือ workflow เร็วขึ้นจากการจัดกลุ่ม chunk. เมนู/backup/strict import/media ownership management โหลดเมื่อจำเป็นและอยู่ใน offline precache. ต้องเก็บ 3–5 comparable workflow runs ก่อนสรุปการลดเวลา.

## งานระยะถัดไปที่ยังไม่ทำ

R2–R7 ส่วนอื่นยังเป็นแผน. เริ่มต่อจาก [PLAN.md](../PLAN.md) และรายงานรายแพ็กเกจ; ห้ามทำ R1 ซ้ำเพราะเห็น requirement เดิมในแผน. โดยเฉพาะ Engineer layout/live lifecycle, Watch CameraPolicy, preview ของยาน, cross-mode mission handoffs, actual per-engine telemetry/Max-Q programme validation, fleet realism, high-fidelity docking และ cockpit ยังไม่ได้เสร็จเพียงเพราะ R1 ผ่าน.

Local profiles เป็นการแยกงานใน browser ไม่ใช่บัญชีออนไลน์หรือ access control. ฟิสิกส์ rendezvous ยังใช้ estimated fixed inertia และ equivalent RCS torque arm ตามรายงาน R1.4; ไม่อ้าง hardware-perfect docking หรือความถูกต้องทุกสภาวะจาก green tests.
