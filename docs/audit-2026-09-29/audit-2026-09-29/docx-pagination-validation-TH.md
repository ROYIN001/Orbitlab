# แก้การแยกตัวเลือกกลางข้อในใบงาน Word

พบจากไฟล์ DOCX ที่ส่งออกผ่าน browser จริง: ข้อ8มีโจทย์และตัวเลือกa,bที่ท้ายหน้า2 แต่ตัวเลือกc,dอยู่ต้นหน้า3 ภาพก่อนแก้คือ `browser-export-artifacts/worksheet-render/page-2.png` และ `page-3.png` การตรวจภาพนี้ยืนยันปัญหาจัดหน้า ไม่เกี่ยวกับคำตอบหรือคะแนน

แก้เฉพาะ `source-integrated/src/worksheets/docx.ts` โดยกำหนด `w:keepNext` และ `w:keepLines` ให้ prompt, รูป/คำบรรยาย, hint และตัวเลือกภายในข้อ ตัด keepNext ที่ตัวเลือกสุดท้ายเพื่อให้ข้อถัดไปย้ายหน้าได้อิสระ หลักการตรงกับ [Microsoft Open XML keepNext](https://learn.microsoft.com/en-us/dotnet/api/documentformat.openxml.wordprocessing.keepnext?view=openxml-3.0.1) และ [Word: keep text together](https://support.microsoft.com/en-us/word/keep-text-together-in-word) ถ้าทั้งข้อสูงเกินหนึ่งหน้าจริง ตัวประมวลผลเอกสารยังจำเป็นต้องแบ่งหน้า ไม่ใช้ข้อความนี้รับรองทุกความยาวของ custom content

## หลักฐานโปรแกรม

- `tests/docx-pagination.test.ts`: 9กรณี = choice/multi/order × EN/TH/RU มีรูปและcaption ตรวจchainต่อเนื่องทั้งข้อ, keepLinesภายในparagraph, schema order และหยุดchainก่อนข้อถัดไป
- ก่อนแก้: `docx-pagination-before.json` 0ผ่าน/9ไม่ผ่าน
- หลังแก้: `docx-pagination-after.json` **15/15ผ่าน** ประกอบด้วย9ใหม่และ6เดิมใน `worksheets.test.ts`; testเดิมตรวจZIP/CRC, media relationships, XML และลำดับproperty
- Node22.23.3, TypeScript `tsc --noEmit` exit0; `git diff --check` ผ่าน
- ไม่แก้โจทย์ ตัวเลือก keys หรือคะแนน และไม่แก้กราฟPNGซึ่งอยู่ในงานตรวจแยก

## การ render หลังแก้

ตรวจแล้วจากไฟล์ใหม่ที่ส่งออกผ่าน production browser4179 หลังรวมการแก้:

- `orbitlab-worksheets-mission-falcon9-cape-2026-09-30T18-08-18-046Z-QA20260929-en.docx`: 348,751bytes; SHA-256 `b175486c05e31abfdfe9805b35803c93539b95638d7c75f9d82291f2d8cedc4b`
- `orbitlab-key-mission-falcon9-cape-2026-09-30T18-08-18-046Z-QA20260929-en.docx`: 13,967bytes; SHA-256 `3290b72b7f91ad6d12ac7c52fd89d310914be1579315b744e12b6a0ac4aa61d1`
- เก็บสำเนาเหมือนต้นฉบับ, manifest, PDF และภาพใน `browser-export-artifacts/docx-after-pagination/`
- Renderด้วยLibreOffice headlessแล้วใช้Poppler pdftoppm100dpi; **ไม่ใช้ Word COM** ตรวจภาพครบ3หน้าใบงาน+1หน้าเฉลย: ข้อ7–8พร้อมตัวเลือกครบอยู่หน้า2, ข้อ9–10พร้อมตัวเลือกครบอยู่หน้า3 ไม่เห็นข้อความ/ตัวอักษรถูกตัด ภาพกราฟและเฉลยอ่านได้
- หลักฐานละเอียด: `render-validation.json` และ `worksheet-1.png` ถึง `worksheet-3.png`, `key-1.png` ในโฟลเดอร์ดังกล่าว

ไฟล์ใหม่เป็นpoint-mass Falcon9 payload1,000kg/crewed spacecraft, target500km, QA Student/codeQA20260929 การบินรอบใหม่ทำให้worksheet drawต่างจากไฟล์เดิม จึงไม่เรียกว่าทำซ้ำโจทย์ข้อ8เดิมทุกตัวอักษร แต่ยืนยันการส่งออกจริงหลังแก้ร่วมกับregressionที่ตรวจchain ครบchoice/multi/order วันที่30ก.ย.ในชื่อไฟล์เป็นmission epochจำลอง ไม่ใช่วันรันทดสอบซึ่งเป็น29ก.ย.

ชุดregressionรวมล่าสุด `integrated-final-regressions2.json` **195/195ผ่านใน16ไฟล์**,success=true รวมการแก้DOCXและchart exportท้ายรอบ ตัวเลขนี้มี15worksheet testsอยู่ภายใน ไม่บวกซ้ำ
