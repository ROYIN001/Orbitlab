# ตรวจไฟล์ส่งออกกรณีศึกษาหลังแก้ข้อความ และแก้การจัดหน้า

รอบแรกส่งออกจริงจาก Chromium บน GitHub Actions สำเร็จ **24 ไฟล์** จาก 3 กรณี × TH/RU × ใบงาน/เฉลย × HTML/DOCX ที่ source `277f41dd6cbd46d1b03d97bcc060258ec8c7554a` ใน [run 36638419734](https://github.com/ROYIN001/Orbitlab/actions/runs/36638419734) ไม่ใช่การอนุมานจากข้อความสถานะใน Desktop IAB ดาวน์โหลด artifact แล้วตรวจ ZIP SHA256 ตรง GitHub API และตรวจขนาด/แฮชแต่ละไฟล์ตรง manifest ครบ 24 ไฟล์ รวม 366,162 bytes ทั้งสามหน้ากรณีศึกษาไม่มี console error หรือ uncaught error

ตรวจข้อความ/ภาษา/หน่วยและข้อความ editorial ใหม่ใน HTML และ OpenXML ผ่าน 24/24 ไฟล์ แล้วแปลง DOCX 12 ไฟล์ด้วย LibreOffice 26.8.0.3 แบบ headless และ Poppler 120 DPI ได้ **18 หน้า** เปิดดูภาพครบทุกหน้า: ใบงานแต่ละไฟล์ 2 หน้า เฉลยแต่ละไฟล์ 1 หน้า พบข้อผิดพลาดภาพจริง จึงไม่สรุปชุดแรกว่าผ่านทั้งหมด

## ข้อผิดพลาดจากภาพจริง

| ไฟล์ | หลักฐานก่อนแก้ | การแก้แคบที่ทำ |
|---|---|---|
| CZ5B TH/RU ใบงาน | ข้อ 6 และบรรทัดคำตอบอยู่หน้า 1 แต่กรอบวิธีทำหลุดไปต้นหน้า 2 | ต่อ `keepNext`/`keepLines` จากคำตอบเข้าสู่ตารางกรอบวิธีทำ โดยจบ chain ที่กรอบ ไม่ดึงข้อต่อไปติดกัน |
| Iridium RU ใบงาน | ข้อ 2 และคำตอบอยู่หน้า 1 แต่กรอบวิธีทำหลุดไปต้นหน้า 2 | แก้ด้วย renderer จุดเดียวกัน |
| Iridium TH/RU ใบงาน | ป้าย `3σ` ทับต้นคำ `Cosmos 2251` | วางป้ายที่ปลายแกนหลักด้านตรงข้ามวัตถุที่สอง เลือก anchor ออกจากวงรีและจำกัดตำแหน่งให้อยู่ในรูป รวมทั้งแยกจากเส้นแกน |

รูปวงรี รัศมี ระยะพลาด ค่าความน่าจะเป็น สูตร เฉลย tolerance และ grading ไม่เปลี่ยน ป้ายใช้ร่วมกับหน้า Orbit จึงตรวจทั้งสีจอและสีกระดาษกับข้อมูล Iridium จริง เฉลยทั้ง 6 ไฟล์และใบงาน THEOS-2 สองภาษาไม่พบข้อความตัด/อักขระขาด/ตัวเลือกข้ามหน้าจากภาพชุดแรก

## การพิสูจน์ก่อนและหลังแก้

- Regression numeric pagination ใหม่ 6 กรณีล้มเหลวก่อนแก้ (9 เดิมผ่าน); regression ป้าย 12 กรณีมี 8 ล้มเหลวก่อนแก้และ 4 ผ่าน ครอบคลุมข้อมูล Iridium จริงและขอบมุม/ด้านของ ellipse
- หลังแก้ ชุดเกี่ยวข้อง **82/82 tests ใน 7 files** ผ่าน พร้อม TypeScript และ build exit 0; runtime ของการตรวจ local รอบนี้ Node v24.19.0 ไม่ใช่ Node22 ของ CI
- สร้าง DOCX จาก public source module 6 ใบงาน/12 หน้า แปลงและเปิดดูครบ ยืนยันโจทย์–คำตอบ–กรอบย้ายพร้อมกัน และป้าย `3σ` แยกชัด ใน local proof ใช้ sharp/libvips แปลง SVG จึงแยกจากการดาวน์โหลดจริงของ Chromium ไม่ใช้แทน final acceptance
- ส่งออกจริงซ้ำหลัง commit การแก้ `4cf7e3fe6e5ef36bea37a4b1d275d3e56e7dd58c` และตรวจ DOCX ทุกหน้าอีกครั้งแล้ว ตามผลสุดท้ายด้านล่าง

## ผลสุดท้ายจากไฟล์ดาวน์โหลดจริงหลังแก้

[GitHub Actions run 36640532239](https://github.com/ROYIN001/Orbitlab/actions/runs/36640532239) ผ่านทุกขั้นที่ source `4cf7e3f` ใช้ Node **v22.23.2** และ Chromium **153.0.8010.12** ได้ 24 ไฟล์จริงรวม **367,489 bytes** ตรวจ SHA256 ตรง manifest ทุกไฟล์ และ ZIP **630,502 bytes** ตรง digest ของ GitHub (`66bad26107c174ec0060f4b4ac53165da93c2ac7e8da6774d84c62e53a4504d3`) ทั้งสามหน้าไม่มี uncaught error หรือ console error

แปลง DOCX ทั้ง **12 ไฟล์เป็น 18 หน้า** และเปิดตรวจภาพจริงครบทุกหน้าแล้ว **ผ่าน**: CZ5B TH/RU ข้อ 6 ย้ายพร้อมคำตอบและกรอบวิธีทำไปหน้า 2; Iridium RU ข้อ 2 ย้ายพร้อมกันเช่นเดียวกัน; Iridium TH และ THEOS-2 ยังจัดหน้าถูกต้อง ป้าย `3σ` ในภาพ Iridium ทั้งสองภาษาอยู่ซ้ายล่าง แยกจากชื่อดาวเทียมและเส้นแกนชัดเจน ไม่พบอักขระขาด ข้อความถูกตัด ป้ายทับกัน หรือตัวเลือก/กรอบวิธีทำหลุดจากคำถามในชุดนี้

ตรวจข้อความที่ดึงจาก HTML/OpenXML ก่อน–หลัง layout fix **เหมือนกันครบ 24 ไฟล์** ยืนยันว่ารอบนี้เปลี่ยนเฉพาะรูปแบบการแสดงผล ไม่มีคำถาม เฉลย ตัวเลข หรือหน่วยเปลี่ยน ชุด final อยู่ใน `browser-export-artifacts/editorial-layout-final/`; ชุด `editorial-final/` ชื่อเดิมเก็บเป็น before proof ของ source `277f41d` เท่านั้น ภาพ PNG หลังแก้ 18 ภาพรวม 2,099,288 bytes

## หลักฐาน

- [manifest และ SHA ของ 24 ดาวน์โหลดจริงก่อนแก้ layout](browser-export-artifacts/editorial-final/artifact-retrieval-verification.json)
- [ผลตรวจข้อความ 24 ไฟล์](browser-export-artifacts/editorial-final/editorial-structure-validation.json)
- [ภาพ/แฮชและผลเปิดตรวจครบ 18 หน้าก่อนแก้](browser-export-artifacts/editorial-final/visual-review.json)
- [source-module local proof และแฮช](browser-export-artifacts/editorial-layout-local/manifest.json)
- [ผล local render 6 ใบงาน/12 หน้า](browser-export-artifacts/editorial-layout-local/render-validation.json)
- [คำสั่ง runtime source hash และ exit ของ targeted tests/build](case-export-layout-focused-validation.json)
- [SHA และ provenance ของ 24 ดาวน์โหลดจริงหลังแก้](browser-export-artifacts/editorial-layout-final/artifact-retrieval-verification.json)
- [ผลตรวจภาพ final ครบ 12 DOCX/18 หน้าและแฮชภาพ](browser-export-artifacts/editorial-layout-final/visual-review.json)
- [ข้อความก่อน–หลังเหมือนกันครบ 24 ไฟล์](browser-export-artifacts/editorial-layout-final/text-content-preserved.json)

ไม่ใช้การทดสอบนี้รับรอง Microsoft Word/Google Docs ทุกรุ่นหรือ HTML print pagination ทุก browser; รูปแบบเอกสารที่ตรวจภาพคือ LibreOffice/Poppler ชุดที่ระบุ ไม่มีการแก้ไฟล์ DOCX ที่ดาวน์โหลด ไม่มีการใช้ Word COM หรือ native UI automation
