# หลักฐานตรวจไฟล์ที่ส่งออกจากเบราว์เซอร์จริง

ตรวจวันที่ 29 กันยายน 2026 จาก local integrated preview โดย root ใช้ UI ดาวน์โหลดไฟล์ และงานย่อยนี้อ่านเฉพาะไฟล์ QA ที่ระบุไว้ เก็บสำเนาเดิมพร้อมขนาด/SHA-256 ใน `artifact-structure-validation.json` ไม่ใช้ชื่อไฟล์หรือ metadata เพียงอย่างเดียวตัดสินว่าเนื้อหาถูกต้อง

## ผลตรวจ

| รายการ | ผลที่ตรวจได้จริง |
|---|---|
| Flight JSON 353,377 bytes | อ่านด้วย production `parseFlightFile` แล้ว serialize ด้วย `flightFileText` และอ่านกลับ ได้ข้อมูลเท่ากันทุก field: telemetry 1,194 samples, 24 events, path 2,466 points, เวลา −10 ถึง 4,941.375 s; path ทุกค่า finite |
| Live CSV และ Replay CSV ที่ cursor 600 s | ไฟล์ `(1)` และ `(2)` ขนาด 2,120,591 bytes **เหมือนกันทุก byte**; 116 columns, 1,194 telemetry rows, 24 event rows; เวลาถึง 4,941.375 s ทั้งคู่ จึงไม่ตัด export เหลือแค่ cursor; ตรวจ CSV quoting และ JSON ของ event details |
| GOST CSV จาก UI `(3)` | 1,194×116, 24 events และเวลา 4,941.375 s ตรง ISO; 84 columns ที่ไม่ขึ้นกับ notation เหมือนทุกค่า; ตรวจ 32 mapped columns รวม 38,208 cells ผ่าน โดย ISO p=GOST ωx, q=ωz, r=−ωy; command/loop yaw เปลี่ยนเครื่องหมายตามเดียวกัน ส่วน roll/pitch/α/β คงเดิม; มี nonzero negations 7,933 ค่า |
| Point-mass Live/Replay CSV `(4)`/`(5)` | **เหมือนกันทุก byte** ขนาด 483,696 bytes; 2,925 rows/20 columns/20 events, −10 ถึง 49,174.43 s; ไม่มี rigid/notation columns และไม่ตัดข้อมูลตาม replay cursor 600 s; เป็นคนละ flight กับ six-DOF ด้านบน |
| Monte Carlo 20 runs | สถานะ done=total=20, seed 20260929, standard law; run indices 0–19 และ derived seeds ไม่ซ้ำ; ค่าการกระจาย 220 ค่าใน CSV ตรง production `drawDispersion` ที่ 4 ตำแหน่งทศนิยม; inserted/onTarget 20, lost 0 ตรง summary |
| Flight report HTML | UTF-8/EN, 4 tables, 8 embedded PNG มี header/ขนาดถูกต้อง ไม่มี script; ไม่ใช่หลักฐานว่าตารางทุกค่าเทียบกับ flight independently ครบ |
| Worksheet/key HTML และ DOCX เดิม | HTML parse ได้และภาพฝังอยู่ในไฟล์; DOCX ZIP CRC ผ่าน XML ทุกส่วนอ่านได้ มี QA Student/QA-20260929/Falcon 9; worksheet มี 9 tables/7 embedded PNG, key ไม่มีภาพ |
| PNG เดิม | 2,400×1,200; พบ label ทับกันจริงบริเวณ MECO/Stage sep/Fairing และกลุ่ม SECO/Orbit/Burn จึงแก้ exporter |
| PNG หลังแก้จาก UI จริง | `orbitlab-altitude-h-km-after-browser.png` มาจาก Downloads `orbitlab-altitude-h-km (2).png`, 165,160 bytes; 2,400×1,200; **ตรวจภาพแล้ว labels ทั้ง 5 อ่านได้ ไม่มีซ้อน/ถูกตัด** โดย MECO กับ Stage sep อยู่คนละบรรทัด |
| Assessment export | อ่านรายงานจาก learning agent ที่ `../ui-assessment-export-validation.json`: checksum ผ่านและสำเนาที่แก้ข้อมูลถูกปฏิเสธ; QA-Test มี 25 items, ตอบถูก 5/ข้าม 20, คะแนนถ่วงน้ำหนัก 7/37 = 19%; เป็น synthetic QA ไม่ใช่คะแนนเจ้าของเว็บ |

`production-parser-validation.json` บันทึกผล Flight/Monte Carlo ผ่าน production functions ส่วน `artifact-structure-validation.json` บันทึกการตรวจโครงสร้างและ hash ของไฟล์จริง

`csv-notation-validation.json` และ `check-csv-notation.py` บันทึกทุก mapping ของ GOST และ point-mass byte comparison. ตรวจ α/β จาก raw body angles เพิ่ม 2,388 ค่า คลาดจาก rounding ไม่เกิน 9.50×10⁻¹³ rad. นี่เป็นการตรวจ contract ของ app กับข้อมูล raw ที่ไม่เปลี่ยน ไม่ใช่การรับรองมาตรฐาน ISO/GOST โดยหน่วยงานภายนอก

Monte Carlo CSV ในโฟลเดอร์นี้ **สกัดจาก field `csv` ของ browser status JSON** ไม่ใช่ไฟล์ที่อ้างว่าดาวน์โหลดด้วยปุ่ม UI ข้อมูล 20 runs รอบนี้ไม่ใช่การรับรองความเที่ยงตรงทางสถิติทุก vehicle/law

## การแก้กราฟและขอบเขตภาพเปรียบเทียบ

แก้ `src/ui/charts.ts` ให้จัด event labels ลงบรรทัดที่ไม่ชนกันและอยู่ในกรอบเมื่อ export; `src/ui/chart-export.ts` เปิดใช้เฉพาะ export path ส่วน interactive plot ใช้พฤติกรรมเดิม ไม่เปลี่ยน series, scale หรือ physics

`tests/chart-marker-export.test.ts` จำลองกลุ่มเวลาที่ชนจริง รวมข้อความยาว/ขอบกราฟ พร้อมตรวจเส้นทาง `chartImage` ที่ผลิต canvas 2,400×1,200; รวม existing chart/report tests **14/14 ผ่าน**, TypeScript ผ่าน

ภาพ UI ก่อน/หลังมาจากคนละ snapshot: ภาพก่อนมี reference/orbit overlay ขณะที่ภาพหลังมี ascent markers 5 รายการ จึงไม่อ้างว่าเป็น pixel-equivalent comparison สำหรับทุก marker. ภาพ `chart-reconstructed-before.png` / `chart-reconstructed-after.png` สร้างด้วย production painter จาก Flight JSON เดิมและ `@napi-rs/canvas`; ตรวจกลุ่ม SECO/Parking orbit/Burn/Burn done แล้วแยกกัน 4 บรรทัด แต่ font fallback ต่างจากเบราว์เซอร์และไม่มี reference overlay จึงระบุเป็น **ภาพสร้างซ้ำสำหรับ regression** โดยตรง

## DOCX: ข้อบกพร่องเดิมและผลตรวจหลังแก้

ภาพเดิม `worksheet-render/page-1.png` ถึง `page-3.png` และ `key-render/page-1.png` ตรวจครบ 4 หน้า พบ worksheet Q8 แยกหลังตัวเลือก b ระหว่างหน้า 2/3; ส่วนอื่นไม่พบข้อความทับหรือตัด glyph จึงส่งให้ learning agent แก้ pagination

ที่มาภาพเดิม: packaged `render_docx.py` หา LibreOffice ใน PATH ไม่พบ; มีการแปลง read-only ด้วย Microsoft Word for Microsoft 365 ผ่าน COM แล้วใช้ bundled Poppler ก่อนคำห้ามจาก root มาถึง ได้แจ้ง root และหยุด native-app calls หลังจากนั้น ไม่มีการแก้ไฟล์ DOCX เดิม ข้อมูลนี้ไม่ปกปิดว่าเป็นการเรนเดอร์จาก Word

หลักฐาน **หลังแก้** โดย learning agent อยู่ `docx-after-pagination/`: ใช้ LibreOffice 26.8.0.3 headless + Poppler ไม่มี Word COM; worksheet 3 หน้า/key 1 หน้า และตรวจ PNG ครบแล้ว คำถามและตัวเลือกอยู่ด้วยกันตาม `render-validation.json` ไฟล์ใหม่มาจาก point-mass flight/draw คนละชุดกับ DOCX เดิม ไม่อ้างว่า rerender คำถามเดิมทุกข้อ และไม่รับรองทุก Word version/ภาษา/คำถาม custom ยาวผิดปกติ

## ชุดหลักฐานสำหรับเก็บใน Git

รายการที่แน่นอนอยู่ `curated-evidence-manifest.json` (relative paths + bytes + SHA-256):

- README นี้, validation JSON, parser/build scripts และ run log
- ไฟล์ที่ export จริง: Flight JSON, Live/Replay CSV ทั้งคู่, HTML report, worksheet/key HTML+DOCX, assessment result, PNG ก่อน/หลัง
- Browser Monte Carlo status JSON และ CSV ที่สกัด
- ภาพ chart regression พร้อม snapshot และ script เพื่อทำซ้ำ
- DOCX PNG/PDF ก่อนแก้ และ `docx-after-pagination` เฉพาะ DOCX/PDF/PNG/manifest/render-validation

ไม่รวม `qa-production-imports.mjs` ซึ่งเป็น bundle ที่สร้างใหม่ได้ และไม่รวม LibreOffice profile/cache/logs. รายงาน catalogue matrix และ graphics อยู่ `../build-catalogue-matrix-TH.md` กับ `../graphics-validation-TH.md`; ผล browser Build 21 vehicles × 2 รูปแบบอยู่ `../browser-build-21-diagrams.json`

การตรวจทั้งหมดนี้เป็น local acceptance ยังไม่ใช่หลักฐาน deployment บนเว็บจริงหรือ GPU/อุปกรณ์จริงหลายรุ่น
