# ตรวจซ้ำและแก้ฉากดาว Orbit ที่จอแนวตั้งแคบ

29 กันยายน 2026 — follow-up หลัง commit `3eff70b` ใน `source-integrated`; ไม่แก้ฟิสิกส์การบิน

ยืนยันข้อผิดพลาดจากกล้องและ ray ของ Three.js: เปลือกดาวรัศมี 3000 แม้ย้ายตามกล้องแล้ว ก็ยังอยู่หน้าโลกได้เมื่อซูมออกสุดบนแคนวาสแคบ ระยะกล้องคือ `2000 × max(1, height/width)` ส่วนโลกมีรัศมี **6.378137 หน่วยฉาก** (`R_EARTH=6378137`, `S=1e-6`) ไม่ใช่ 63.71 ตามเลขใน draft review ก่อนหน้า หรือ 6.371 จากค่า mean radius ที่กล่าวระหว่างตรวจครั้งแรก ตัว probe และ regression นำค่าจาก production constants โดยตรง

| แคนวาสจริงที่คำนวณ | กล้องถึงศูนย์โลก | กล้องถึงผิวโลกด้านหน้า | ดาวเดิมอยู่หน้าโลกหรือไม่ |
|---|---:|---:|---|
| 288×480 | 3333.3333 | 3326.9552 | ใช่ |
| 240×480 | 4000 | 3993.6219 | ใช่ |
| 357.33×480 | 2686.5922 | 2680.2141 | ไม่ |
| 700×440 | 2000 | 1993.6219 | ไม่ |

ดาวเดิมอยู่ห่างกล้อง 3000 ทุกแถว ที่ 288×480 ค่า NDC depth ของดาวเดิม 0.9968868134 น้อยกว่าผิวโลก 0.9973238808 จึงผ่าน depth test และทับโลกได้ นี่เป็นหลักฐานคำนวณจากซอร์ส ไม่ใช่ภาพที่สังเกตจาก browser

แก้ `buildStarField` ให้เลือก background mode ได้ และให้เฉพาะ Orbit ใช้ mode นี้: vertex shader กำหนด `gl_Position.z = gl_Position.w` ทำให้ depth เป็นฉากหลัง (NDC=1) โดยคงทิศทางบนภาพ, depth test และไม่เขียน depth ไว้ตามเดิม ตั้ง `renderOrder=-1` ให้วาดดาวก่อน transparent orbit overlays ส่วน opaque Earth เขียน depth ไปแล้วจึงบังดาวได้ โดยไม่ขึ้นกับรัศมีเปลือกดาวหรืออัตราส่วนหน้าจอ Launch ใช้ mode เดิม

เพิ่ม regression 4 aspect ใน `tests/render-stars-regression.test.ts` ใช้ดาวจริงที่สร้างจาก production factory จัดแนวกล้องให้ดาวนั้นอยู่หลังศูนย์โลก ตรวจ 3 ระดับ zoom และการจัดภาพแบบกึ่งกลาง/เยื้อง รวม **24 configurations** ด้วยกล้อง PerspectiveCamera, ray–sphere intersection และสมการ depth ของ shader ที่ตั้งค่าจริง ตรวจ depth flags/ลำดับ transparent overlays และตรวจว่า Launch ไม่เปิด background mode ด้วย ยังคงเป็น CPU/source regression ไม่มีการอ้างว่าทดสอบ WebGL pixels

แก้ข้อความ `dlg.physics.limitsText` ภาษารัสเซียจากการกล่าวว่าไม่มี “нагрев” ทั้งหมด เป็น “детальный нагрев” ให้ตรงกับ EN “detailed heating” และ TH “ความร้อนโดยละเอียด” เพราะ `src/physics/sim/staging.ts` ยังใช้ heat flux แบบประมาณสำหรับ fairing release เพิ่ม regression qualifier ทั้ง 3 ภาษาใน `tests/i18n.test.ts`

ผลตรวจ:

- ก่อนแก้ production: regression ใหม่ **5 กรณีล้ม**, กรณีเดิม 22 ผ่าน (23:41:16 Moscow)
- หลังแก้: renderer+i18n **27/27 ผ่าน** (23:41:53, 5.58 s), `tsc --noEmit` ผ่าน และ `git diff --check` ผ่าน
- ยังต้อง build และดูภาพ Orbit จริงรอบนี้โดย root: ตรวจ canvas 288×480 หรือแคบกว่า, ซูมออกสุด, หมุนโลก/เยื้องภาพ และเปิดเส้นวงโคจร/sector ให้เห็นว่าดาวไม่ทับโลกและเส้นยังแสดงตามเดิม

หลักฐานคำนวณ: `orbit-background-depth-probe.mjs`, `orbit-background-depth-results.json` โดย probe ไม่เปิด browser หรือ server

ไฟล์ source/test ที่แก้ใน follow-up นี้มี 5 ไฟล์: `src/render/stars.ts`, `src/render/orbit-view.ts`, `src/i18n/ru.ts`, `tests/render-stars-regression.test.ts`, `tests/i18n.test.ts` ไม่ commit/push จากงานย่อยนี้


## ปิดการตรวจ build และภาพจริง — 29–30 กันยายน 2026

งานที่ระบุว่า “ยังต้อง build และดูภาพ” ด้านบนปิดแล้วในรอบ final5: [build log](integrated-build-final5.log) สร้าง `index-Bx23WbDF.js` สำเร็จและ exit 0 ตรง asset ที่หน้า browser โหลดตาม [หลักฐาน DOM/การใช้งาน](browser-orbit-narrow-final5.json) ผู้ประสานงานเปิดภาพและตรวจ Fit, ซูมออกสุด, หมุน, reset และ equal-time sectors แล้ว บันทึก console ว่าง

Canvas จริงรอบนี้มี rect **287.333×480 CSS pixels**, buffer **287×480** ใน viewport **320×844** และ DPR ประมาณ **1** ไม่ใช่ผล browser 240×480 ซึ่งเป็นหนึ่งในขนาดที่ใช้ CPU regression ด้านบน ดู [Fit](orbit-narrow-final5-fit.png), [ซูมออกสุด](orbit-narrow-final5-maxzoom.png), [sectors](orbit-narrow-final5-sectors.png) และ [Molniya sectors หลังภาพนิ่ง](orbit-final5-molniya-sectors.png) ภาพ Molniya เป็นสำเนาที่รอเฟรมเปลี่ยนและตรวจ bytes ที่บันทึกจริงแล้ว

หลักฐานภาพนี้แยกจาก CPU depth/ray regression และไม่ใช่การทดสอบ DPR 2, GPU หลายรุ่น หรืออุปกรณ์มือถือจริงหลายเครื่อง การแก้ rendering กับผลรับภาพข้างต้นคงอยู่ใน [รายงานตรวจรับล่าสุด](Orbitlab-acceptance-TH.md)
