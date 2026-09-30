# แก้ภาษาปะปนระหว่างส่งออกใบงาน

พบจากไฟล์browserจริง `docx-multilang-final/orbitlab-worksheets-…-th.docx`: หัวข้อ/โจทย์/กราฟเป็นไทย แต่ป้ายName/Code/Date,Answer/Working,hintและfooterกลายเป็นรัสเซีย เมื่อกดส่งออกแล้วเปลี่ยนUIเป็นรัสเซียระหว่างรอสร้างภาพ. ภาพก่อนแก้ครบ3หน้าอยู่ใน `browser-export-artifacts/docx-multilang-final/worksheets-th-1.png` ถึง `worksheets-th-3.png`. THkeyและRUworksheet/keyภาษาตรง ส่วนpaginationผ่านทั้ง8หน้าที่render; ไม่ใช่ปัญหาฟอนต์หรือตัวอักษรถูกตัด

สาเหตุคือworksheetเก็บ`lang`และข้อความแล้ว แต่rendererเรียกตัวแปลภาษาของUIหลัง`await`โหลด/สร้างภาพ แก้เฉพาะการคงบริบทของการส่งออก:

- เพิ่ม `tFor(lang,key,params)` ใน `src/i18n/index.ts`; `t()`เดิมใช้APIเดิมและส่งต่อให้ตัวแปลเดียวกัน
- HTML/DOCXrendererใช้`sheet.lang`กับป้ายทั้งหมด รวมkeytitle/footer ไม่เปลี่ยนภาษาUIหรือเขียนlanguage preference
- `src/ui/lessons/worksheet-view.ts`จับfilenameซึ่งรวมmission/case/classcode/language/formatก่อนรอภาพ ป้องกันเปลี่ยนฟอร์มหรือภารกิจแล้วชื่อไฟล์ผิดกับเนื้อหา

หลักฐานregression:

- `worksheet-language.test.ts`: 3sheetlanguages×3UIlanguages รวม9กรณี ก่อนแก้3ผ่าน/6ไม่ผ่าน; ครอบคลุมHTML/DOCX worksheet/key และยืนยันUIlanguageไม่ถูกเปลี่ยน
- `worksheet-export-race.test.ts`: เรียกWorksheetView exportจริง หน่วงphoto fetch แล้วเปลี่ยนภาษาTH→RU,classcodeและmissionพร้อมกัน; ตรวจทั้งHTML/DOCXให้ชื่อเดิมและป้ายไทยครบ
- รวมกับpagination/worksheets/i18n/case-exportrace **46/46ผ่าน** ใน `worksheet-language-after.json`; TypeScriptและdiffcheckผ่าน
- ชุดนี้ตรวจสิ่งที่ส่งออกและเหตุการณ์asyncด้วยmockphoto ไม่ใช่ทดสอบnetworkจริงหรือrenderWordทุกเวอร์ชัน

ตรวจรับจากbrowserหลังbuild4แล้ว: ไฟล์QAFINAL4 epoch2026-09-29T20:00Z ทั้ง8HTML/DOCXอยู่ใน `browser-export-artifacts/docx-language-after/` พร้อมSHA256ในmanifest.json. ผู้ตรวจสั่งTHDOCXเวลา23:35:24แล้วเปลี่ยนUIเป็นRUทันที; ไฟล์เสร็จ23:35:31. ข้อความภายในทั้ง8ไฟล์ตรงภาษา และTHไม่มีป้ายรัสเซียที่เคยผิด

LibreOffice26.8.0.3 headlessแปลง4DOCX exit0 แล้วPoppler100dpiสร้าง8ภาพ: TH/RUworksheetภาษาละ3หน้าและkeyภาษาละ1หน้า. ตรวจภาพครบ8หน้าแล้ว ป้ายชื่อ/รหัส/วันที่/คำตอบ/วิธีทำ/footerตรงภาษา โจทย์และตัวเลือกอยู่หน้าเดียวกัน ไม่พบอักษรตัดหรือข้อความล้น. ดู `docx-language-after/render-validation.json` และ `browser-fixtures/verify-worksheet-language-after.py`. เป็นการตรวจหนึ่งชุดโจทย์จากflightจริงต่อภาษาในLibreOffice ไม่ใช่รับรองWordทุกเวอร์ชันหรือทุกชุดสุ่ม

หลักฐานก่อนแก้8HTML/DOCXพร้อมhashยังอยู่ใน `docx-multilang-final/manifest.json` และ `before-language-fix-validation.json` ไม่ถูกแทนที่ด้วยไฟล์หลังแก้
