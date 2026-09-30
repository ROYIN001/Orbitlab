# Build Watch: ตรวจภาพจริงครบ 21 แบบ × 2 โหมด

ตรวจวันที่ 30 กันยายน 2026 เสร็จเวลา 00:25 น. Europe/Moscow บน preview `http://127.0.0.1:4182/#/build/watch` ชุด final6 จาก commit `0b844f77f5f0ffdeb7274642ddf74a57c2ee230b`

**ผล: ตรวจภาพจริงครบ 42/42 มุมมองแล้ว** — จรวด catalogue ทั้ง 21 แบบในโหมด Assembled และ Taken apart ทุกคู่แสดงปุ่มเลือกและ geometry ตรงกัน ไม่พบภาพว่าง ชิ้นส่วนที่ควรแสดงหลุดกรอบ ป้ายชนกันจนอ่านไม่ได้ หรือข้อความ `NaN` ในพื้นที่ภาพที่ตรวจ ไม่มีมุมมองใน matrix นี้ที่เปิดไม่ได้ และไม่มี production edit จากรอบตรวจนี้

root agent ใช้ CUA ควบคุมแท็บ Build และเก็บ screenshot หลัง animation จบ จากนั้น graphics_quality agent เปิด **ไฟล์ภาพต้นฉบับทีละภาพครบทั้ง 42 ไฟล์** ผ่าน `view_image` และตรวจอิสระ ภาพ JPEG ขนาด 1280×720 ภาษาอังกฤษ ธีมมืด ไม่มีการแทนด้วย DOM หรือใช้เพียงภาพย่อรวมในการตัดสิน

## หลักฐาน

- [แฟ้มภาพและ capture manifest](browser-build-visual-final6-settled/capture-manifest.json): 42 รายการจากการเลือก UI จริง
- [review-matrix.json](browser-build-visual-final6-settled/review-matrix.json): 42 แถว มีขนาดไฟล์ ขนาดภาพ SHA-256 ผลตรวจ และ observation รายแบบ
- [independent-review-notes.json](browser-build-visual-final6-settled/independent-review-notes.json): บันทึกสิ่งที่ผู้ตรวจเห็นทั้ง 21 คู่
- [hash-reviewed-images.py](browser-build-visual-final6-settled/hash-reviewed-images.py): ตรวจความครบและ hash เท่านั้น ไม่ใช้อนุมานว่าภาพผ่าน
- 42 ไฟล์ภาพรวม **3,857,008 bytes**, hash ต่างกันครบ 42 ค่า; payload JPEG เดิมไม่ถูกแปลงหรือบีบอัดซ้ำ

ภาพใน `browser-build-visual-final6/` เป็นชุดเบื้องต้นที่เก็บระหว่าง animation และ **ไม่ใช้รับรองผล** เพราะปุ่มเปลี่ยนก่อนรูปทรงจะเคลื่อนเสร็จ (`src/ui/build/build-screen.ts`, animation 450 ms) จึงเก็บชุดใหม่ใน `browser-build-visual-final6-settled/` โดยแยกการเปลี่ยนโหมดกับการ capture คนละ tool call ข้อผิดพลาดนี้เป็นจังหวะเก็บหลักฐาน ไม่ใช่บั๊กที่ยืนยันในตัวผลิตภัณฑ์

## Matrix ที่เปิดดูจริง

| จรวด | Assembled | Taken apart | จุดที่ตรวจเพิ่มเติม |
|---|---|---|---|
| Soyuz-2.1a | ผ่าน | ผ่าน | Fairing, สอง stage, interstage และ strap-ons อยู่ครบในกรอบ |
| Soyuz-2.1b / Fregat-M | ผ่าน | ผ่าน | ป้าย Fregat และ interstage หลายชั้นในภาพประกอบยังแยกอ่านได้ |
| Proton-M / Briz-M | ผ่าน | ผ่าน | ป้ายสี่ stage และท่อนบนที่เรียงชิดกันไม่ชนข้อความ |
| Angara-A5 / Briz-M | ผ่าน | ผ่าน | สาม stage, interstages และ strap-ons แยกถูกโหมด |
| Falcon 9 Block 5 | ผ่าน | ผ่าน | Fairing สองซีกและ interstage แยกจากสอง stage ชัดเจน |
| Falcon Heavy | ผ่าน | ผ่าน | แกนกลางและ side cores อยู่ในกรอบทั้งสองโหมด |
| Atlas V 551 | ผ่าน | ผ่าน | แกนสีส้ม, Centaur, fairing และป้าย strap-ons ×5 อ่านได้ |
| Vulcan Centaur VC4 | ผ่าน | ผ่าน | สอง stage และ strap-ons ×4 ไม่ทับป้ายเครื่องยนต์ |
| Ariane 64 | ผ่าน | ผ่าน | Fairing กว้างและ boosters ยังอยู่ในกรอบ |
| Vega-C | ผ่าน | ผ่าน | สี่ stage/interstages ที่เรียงชิดกันยังมีป้ายแยก |
| Long March 2D | ผ่าน | ผ่าน | ชื่อเครื่องยนต์ยาวยังไม่หลุดกรอบ |
| Long March 3B/E | ผ่าน | ผ่าน | สาม stage, interstages และ boosters แยกอ่านได้ |
| H-IIA 202 (historical) | ผ่าน | ผ่าน | แกนสีส้ม, upper stage, interstage และ boosters ×2 |
| Long March 5 | ผ่าน | ผ่าน | แกนและ boosters กว้างไม่ทับป้าย |
| H3-22 | ผ่าน | ผ่าน | สอง stage และ boosters ×2 ตรงกับโหมดที่เลือก |
| PSLV-XL | ผ่าน | ผ่าน | สี่ stage และป้าย booster สองกลุ่ม ×4/×2 แยกกัน |
| Electron | ผ่าน | ผ่าน | ลำตัวสีดำอ่านรูปผ่านเส้นขอบเทา; ทั้งสาม stage รวม Curie แสดงครบ |
| Starship (Super Heavy) | ผ่าน | ผ่าน | สอง stage และช่องแยกอยู่ในกรอบ; drawing นี้ไม่มี fairing แยก |
| Sputnik (R-7 8K71PS) | ผ่าน | ผ่าน | Fairing สั้น, แกนและ strap-ons ×4 รวม nozzle ไม่ถูกตัด |
| Vostok-K (8K72K) | ผ่าน | ผ่าน | สอง stage, interstage สีเขียวและ strap-ons อยู่ครบ |
| Saturn V | ผ่าน | ผ่าน | สาม stage และ interstage อยู่ในกรอบ; ยาน Apollo/escape tower ไม่ได้วาดตามคำอธิบายใน tour |

ไฟล์แต่ละคู่ใช้ชื่อ `{vehicleId}-assembled.jpg` และ `{vehicleId}-exploded.jpg`; mapping id และ hash อยู่ใน review matrix

## ขอบเขตที่ยังไม่ควรขยายคำรับรอง

นี่เป็นการตรวจภาพ schematic ของ Build Watch บน desktop ตาม 42 มุมมองที่กำหนด ไม่ใช่การรับรองภาพ CAD รายละเอียดลวดลาย หรือรูปทรงฮาร์ดแวร์จริงทุกชิ้น Strap-ons แสดงเป็น side-view schematic และใช้ตัวเลข ×n กำกับ ไม่ได้วาดจำนวนด้านหลังทั้งหมดให้แยกเห็น

ไม่ได้ตรวจซ้ำทุกขนาดจอ ทุกภาษา หรือทุก browser ใน matrix นี้ ไม่ได้เปิดทุก part card หรืออ่านตาราง stage ที่อยู่นอก screenshot ส่วน tour ขั้นที่ 1 อธิบาย Saturn V แม้เลือกลำอื่น โดยมีข้อความ “This step is about Saturn V. Show it” กำกับ จึงไม่ใช้ตัวเลข tour เป็นข้อมูลของจรวดที่เลือก

root รายงาน console warning/error ว่างหลัง capture ครบชุด; ผู้ตรวจภาพอิสระไม่ได้ query console เอง ไม่มีการรัน numerical tests ใหม่ในรอบนี้ การทดสอบ catalogue compatibility 6,542 cases อยู่ใน `build-catalogue-matrix-TH.md` เป็นหลักฐานคนละประเภท

ข้อจำกัดเดิมที่มีเพียง 42 แถว DOM selected-state จึงปิดได้ **เฉพาะช่องว่างภาพ desktop 21×2 ที่ตรวจนี้** ไม่ควรย้อนเรียก DOM evidence เดิมว่าเป็น visual proof
