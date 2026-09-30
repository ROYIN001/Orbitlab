# ตรวจทุกคู่ชิ้นส่วน–เครื่องยนต์ในขอบเขตจำกัดที่ทำซ้ำได้

ตรวจ `source-integrated` วันที่ 29 กันยายน 2026 เพิ่มเฉพาะ `tests/build-catalogue-matrix.test.ts` ไม่มี production edit จากการตรวจนี้ รอบยืนยัน **6,542/6,542 tests ผ่าน** ใช้ 193.68 วินาที เริ่ม 22:48:15 Moscow; TypeScript ผ่าน

## สิ่งที่ไล่ครบจริง

Catalogue มี 50 stage bodies, 14 booster bodies, 55 engines และ 17 fairings

| ขอบเขต | จำนวน | ยอมรับ | ปฏิเสธตามเงื่อนไข |
|---|---:|---:|---:|
| Stage body × engine: stage เดี่ยวติดบนฐาน | 2,750 | 349 | 2,401 |
| Stage body × engine: stage ที่ตรวจวางเหนือ s1 ของ Falcon 9 คงที่ | 2,750 | 614 | 2,136 |
| Booster body × engine: booster 2 ตัวติด s1 คงที่ | 770 | 86 | 684 |
| Fairing แต่ละแบบบน s1 | 17 | 17 | 0 |
| ขอบเขต dry mass / propellant / diameter / length ของ custom body | 28 | 8 | 20 |
| Payload 0, 0.001, 100,000, 500,000, −1, NaN, Infinity kg | 7 | 4 | 3 |
| Engine count ผิด 0, 0.5, 51, NaN สำหรับ engine ทั้ง 55 แบบ | 220 | 0 | 220 |
| **รวม** | **6,542** | **1,078** | **5,464** |

คู่ body–engine รวม **6,270 คู่: ผ่านเงื่อนไข 1,049 คู่ และปฏิเสธที่คาดไว้ 5,221 คู่** การปฏิเสธเกิดจาก vacuum engine บนฐาน, propellant family ไม่ตรง หรือการสลับ solid motor ซึ่งเป็นส่วนหนึ่งของ casing/grain ตามข้อกำหนดเดิม มิใช่ test failure

ใช้ engine count เดิมเมื่อเป็นเครื่องยนต์ของ body เอง; เมื่อเปลี่ยนเครื่องยนต์ใช้ count ที่บังคับสำหรับ cluster/lumped หรือ 1 สำหรับเครื่องยนต์ทั่วไป ค่านี้เรียกว่า canonical count ใน test ไม่ได้หมายถึงการไล่ count 1–50 ทุกค่า

## สิ่งที่ตรวจในแต่ละแบบที่ยอมรับ

- เรียก public builder จริง `partsResult`/`assemble` และ `vehicleSpecProblems`; ทุกรายการที่รับต้องผ่าน vehicle schema
- คำนวณ `vehicleFigures` และ `idealDeltaV` ที่ payload 0, 1,000 และ 100,000 kg; ตรวจ finite/nonnegative, Δv/TW ลดลงเมื่อ payload มากขึ้น และเทียบสมการจรวดโดยตรงสำหรับ stage เดี่ยวไม่มี fairing/boosters
- คำนวณ exploded/assembled geometry และ labels จริง ในกล่อง 343×440 และ 700×600: ชิ้นส่วนอยู่ในกรอบ ตัวเลข finite และ labels ไม่ซ้อนกัน
- เรียก `computedRatings` จริงสำหรับ 1,049 คู่ที่ยอมรับและ 17 fairings รวม **1,066 designs / 2,132 LEO–GTO ratings** ขีดจำกัด 16 probe flights ต่อ design, resolution 2.5% ของ ideal ceiling; เริ่มที่ budget 2 วินาที
- สอง designs หยุดที่ time budget: upper `fregat/l25` และ `e1/rutherford-vac` จึงรันสองรายการนี้ซ้ำด้วย budget 8 วินาที โดยไม่เปลี่ยน vehicle, resolution หรือ flight limit หลังซ้ำ **2,132 ratings converged ทั้งหมด**; ผลที่เก็บไว้รวม 3,629 probe flights มี LEO > 0 จำนวน 327 designs และ GTO > 0 จำนวน 302 designs ส่วนที่ได้ 0 มิได้ถูกนับว่าไปถึงวงโคจรได้

## ข้อค้นพบที่ยังต้องตรวจแบบจำลองต่อ

**16 designs ใน upper-stage matrix ได้ GTO rating มากกว่า LEO rating** เช่น `fregat/l25` ได้ LEO 0 และ GTO 313 kg โดย LEO หยุดด้วย `noInsertion`; `ulpm/le5b3` ได้ LEO 3,667 และ GTO 5,077 kg ตัวเลขเหล่านี้มาจาก probe/guidance ตาม orbit เป้าหมาย จึงอาจเป็นข้อจำกัดด้านการบินที่วิธีค้นหาค่าบรรทุกใช้ แต่รอบนี้ยังไม่ได้พิสูจน์สาเหตุ

การผ่าน compatibility/finite-value assertions และการค้นหา converged **ไม่ใช่การรับรอง payload capability ทางกายภาพ** บันทึก 16 รายการนี้ไว้ให้ตรวจ guidance/flight และวิธีคำนวณ ratings ต่อก่อนเพิ่มข้ออ้างด้านความแม่นยำ ไม่แก้ฟิสิกส์โดยเดาสาเหตุในรอบนี้ รายละเอียดอยู่ `modelObservations.gtoAboveLeo` ใน JSON

## หลักฐานและการทำซ้ำ

- `build-catalogue-matrix-results.json`: ทุกคู่, expected/outcome, figures, ratings, counts และ `validationEvidence` ซึ่งอธิบายที่มาของแต่ละ run
- `build-catalogue-matrix-run-final.txt`: รอบเต็มที่ผ่าน 6,542 tests
- `build-catalogue-matrix-run.txt`: ผลละเอียดรอบแรก รวมหนึ่ง assertion ที่ตั้ง tolerance แน่นเกินไปที่ dry mass 1 g: Δv ต่างจากสูตรตรง 6.21×10⁻⁷ m/s เพราะการลบ propellant ออกจาก total mass ใน floating point ปรับ test เป็น relative tolerance 10⁻⁹ และรันทั้ง matrix ยืนยันใหม่ ไม่มีการเปลี่ยน production เพื่อทำให้ผ่าน
- `build-catalogue-matrix-edge-confirm.txt`: เก็บ row ของขอบเขต 1 g ที่ผ่านหลังปรับ tolerance
- `build-catalogue-matrix-rating-followup.txt`: สอง rating searches ที่ยืนยันด้วย budget 8 วินาที

Vitest agent reporter ซ่อน console ของ test file ที่ผ่าน จึงใช้ detailed row capture รอบแรก เสริม row ที่แก้ tolerance และสอง rating follow-ups ใน JSON; ผล pass/fail อ้างจากรอบเต็มครั้งสุดท้ายโดยตรง ไม่สวมรอยว่า JSON ทั้งหมดมาจาก run เดียว

คำสั่งหลักจาก `source-integrated`:

```powershell
$env:VITE_ORBITLAB_MATRIX_REPORT='1'
node node_modules/vitest/vitest.mjs run tests/build-catalogue-matrix.test.ts --reporter=default --silent=false
```

Test นี้อยู่ใน regular suite และเพิ่ม 6,542 test cases ใช้เวลาประมาณ 2.5–3.3 นาทีบนเครื่องที่ตรวจ ข้อจำกัดเวลา rating ใช้ต่อ design มิใช่ต่อ suite

## ขอบเขตที่ยังไม่ได้อ้างว่าครบ

- ไม่ได้ทดสอบ Cartesian product ของ stage หลายชั้นทั้งหมด, ทุกจำนวนเครื่องยนต์/booster, ทุก fairing×stage×engine, ทุกขนาด custom body ต่อเนื่อง หรือทุก site/orbit/payload/wind/failure
- Upper matrix มี s1 คงที่เพียงฐานเดียว และ booster matrix ใช้ booster 2 ตัว จุดประสงค์คือให้ทุก body/engine ถูกตรวจในตำแหน่งที่ใช้ได้ ไม่ใช่รับรองจรวดทุกแบบที่ผู้ใช้สร้าง
- การทดสอบ layout เป็น geometry/model-level ไม่ใช่ browser click/keyboard/screen-reader หรือภาพ rasterized; Root ตรวจ browser และ import/export แยก
- Ratings เป็น point-mass model estimates ของกรอบนี้ ไม่ใช่ full six-DOF flight certification, recovery acceptance หรือเทียบ published data ของ custom designs
- การประกอบและคำนวณครบใน matrix นี้ไม่เท่ากับรับรอง feasibility ด้านวัสดุ/โครงสร้าง/thermal/engine integration ของจริง
