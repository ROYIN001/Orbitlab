# ตรวจไฟล์ผลกรณีศึกษาที่ส่งออกจาก UI จริง — 29 กันยายน 2026

ตรวจด้วย Node v22.23.3 และ API ของ source-integrated โดยใช้ข้อมูล frozen ในไฟล์จริง ไม่อ่าน/แก้ browser state; ขั้นตอนตรวจ export ไม่แก้ production ส่วนการแก้คำซ้ำสองจุดระบุท้ายรายงาน

- ไฟล์ต้นฉบับ: C:/Users/Royin/Downloads/orbitlab-QA-Test-2026-09-29-19-39.orbitlab-results.json
- สำเนาหลักฐาน: [orbitlab-QA-Test-2026-09-29-19-39.orbitlab-results.json](orbitlab-QA-Test-2026-09-29-19-39.orbitlab-results.json) — 135,093 bytes, เหมือนต้นฉบับทุกไบต์
- SHA-256 ของไฟล์: 59e3d2bb809df84aa34a8d2530b888a451f757c45249d6d337c12486a0b515d2
- checksum ที่ผลิตภัณฑ์บันทึก: 17ec95b5bed5612f340e02d79641db3ad51fd91f042b69e7463502f3d2a163af; verifyResults = **true**; สำเนาในหน่วยความจำที่เปลี่ยนชื่อถูกปฏิเสธ = **true**
- Exported at: 2026-09-29T19:39:48.200Z; ชื่อ QA-Test เป็นข้อมูลทดสอบสังเคราะห์ ไม่ใช่คะแนนความรู้ของเจ้าของเว็บ; ไม่มี assessment attempt ในไฟล์นี้

| บทเรียน | ตรวจคำตอบที่ UI บันทึกกับ key สร้างใหม่ | ขนาด caseData (JSON characters) | activity ที่เก็บ | การสร้าง key กลับ |
|---|---|---:|---|---|
| case-theos2 | 6/6 ผ่าน | 3,685 | ไม่ใช้ series | ดู numerical differences ใน JSON |
| case-cz5b | 8/8 ผ่าน | 13,102 | 366 วัน | ตรงทุกค่า |
| case-iridium | 8/8 ผ่าน | 5,732 | ไม่ใช้ series | ตรงทุกค่า |

ตรวจทั้ง first passedRecord และ last รวม 6 records: ผลผ่านตาม key ที่บันทึกและ key ที่สร้างใหม่ทั้งหมด = **true**. Worksheet ที่สร้างใหม่ตรงกับ snapshot ทั้งชุด = **false**. ตัวเลขแยกรายข้อ/ค่าคลาดเคลื่อน/ขนาด/frozen-input hash/epoch อยู่ใน [JSON evidence](ui-case-export-validation.json)

ความเท่ากันระดับทศนิยมทุกบิตต่างจากความเท่ากันในการให้คะแนน: THEOS มีค่าคลาดเคลื่อนสูงสุด 1.5916157281026244e-12 ในค่า reach หน่วย km (เทียบ tolerance 10 km); J₂ และ height ต่างเพียงเลขทศนิยมท้าย ๆ. ค่าทั้งหมดเทียบเท่าทางตัวเลขภายในเกณฑ์ 1e-10×max(1,|value|) = **true**. ส่วนข้อความ ตาราง คำตอบแสดง และรูปที่ serialize กลับมาโดยไม่เทียบ answer.value ดิบตรงทั้งหมด = **true**. ไม่เปลี่ยน key/tolerance เพื่อให้ผ่าน

Progress รวม first-pass และ last ที่ซ้ำกันใช้ 50,313 JSON characters (59,009 UTF-8 bytes). ทดสอบ loadProgress→saveProgress→loadProgress ใน storage จำลองแล้ว records ไม่เปลี่ยน = **true**. นี่ไม่ใช่การวัด quota ทุก browser และไม่ใช่ผล browser reload ซึ่งทีม UI บันทึกแยก

Checksum ไม่ใช่ลายเซ็นและไม่พิสูจน์ผู้ทำข้อสอบ; ผล export ยังไม่มี production importer สำหรับ restore. การตรวจนี้ยืนยันความครบและสร้างผลจาก frozen data กลับได้จริงของไฟล์ที่ดาวน์โหลดมา

ตรวจข้อความข้อสอบเพิ่มเติมแบบเจาะจุด: พบคำไทยซ้ำ อ่านค่าค่าพุ่งเกิน ใน c-read-overshoot และ อ่านค่าค่าเผื่อเฟส ใน c-read-pm (src/lessons/assessment/bank/control.ts). แก้เฉพาะคำซ้ำเป็น อ่านค่าพุ่งเกิน / อ่านค่าเผื่อเฟส แล้วตามที่ผู้ประสานงานอนุญาต ที่ source-integrated/src/lessons/assessment/bank/control.ts:167,174; ตรวจ occurrence ก่อนแก้ว่ามีอย่างละหนึ่งตำแหน่งและ git diff --check ผ่าน ไม่เปลี่ยน scoring/key/formula/policy และไม่ได้เพิ่มหรือรันทดสอบใหม่เฉพาะคำซ้ำ. การอ่านเจาะจุดนี้ไม่ใช่บรรณาธิกร TH/RU ทุกประโยคของคลัง157ข้อ
