# แผนพัฒนา Orbitlab: ฟิสิกส์ ประสบการณ์ใช้งาน และภารกิจอวกาศ

> **Plan v2.0 index: [plan/README.md](plan/README.md).** The sections of plan v2.0 the owner approved for waves K0–K1 (S01, S05, S06, S08 set A, S18; owner, 2026-10-05) are in [`plan/`](plan/), and the index lists every section S00–S19 with its status. For anything v2.0 has not yet replaced, version 1.2 below remains the record. (CO-8 step 2, 2026-10-06.)\
> **ดัชนีแผน v2.0:** ส่วนที่เจ้าของรับรอง "ใช้สำหรับ K0–K1" อยู่ใน `plan/` เรื่องที่ v2.0 ยังไม่ได้แทน ให้ใช้ฉบับ 1.2 ด้านล่าง

เวอร์ชันเอกสาร: 1.2 — 3 ตุลาคม 2026\
ฐานที่ตรวจ: `ROYIN001/Orbitlab`, `main`, commit `523b44eca0e31fd84fd4a3faa4e1b883428288ee`\
สถานะ: **ผู้ใช้อนุญาต R1 และงานเล็กที่ระบุใน PROGRESS.md แล้ว; R2–R7 ส่วนอื่นยังเป็นแผน**

เอกสารนี้รวมข้อเสนอ 16 ข้อของผู้ใช้กับข้อเสนอ 5 ข้อของผู้ช่วย โดยตรวจโค้ดปัจจุบัน ประวัติ Soyuz และ GitHub Actions แบบอ่านอย่างเดียว จัดงานตามผลลัพธ์ที่ผู้ใช้ต้องการ และรวมงานที่แตะข้อมูลหรือไฟล์ร่วมกันไว้ภายใต้ผู้รับผิดชอบเดียว เวอร์ชัน 1.1 เพิ่มข้อสังเกตเรื่อง Soyuz แสดง 100% และการผ่อนเครื่องใกล้ Max-Q

**ข้อกำหนดสำหรับ AI ที่รับช่วง:** อ่านเอกสารนี้และ [รายงานสถานะ](PROGRESS.md) ก่อนเริ่มงาน ผู้ใช้สั่งให้เริ่ม R1 รวมงานเล็กที่แก้ไม่มาก และเปิด PR/merge main หลังตรวจเสร็จแล้วเมื่อ 3 ตุลาคม 2026 ให้ทำได้ในขอบเขต R1.1–R1.5 และ U08/U09/การแก้ชื่อค่า command ใน U16 ตามรายงาน ห้ามขยายเป็น R2–R7 ทั้งระยะโดยอัตโนมัติ ทุกงานต้องอัปเดตรายงานพร้อมหลักฐานและข้อจำกัด ไม่ถือว่า green tests รับรองฟิสิกส์ทุกกรณี

## สารบัญ

1. เป้าหมาย ลำดับความสำคัญ และขอบเขตหลักฐาน
2. สิ่งที่มีอยู่แล้วและปัญหาที่ต้องพิสูจน์
3. ตารางติดตามข้อเสนอทั้งหมด
4. การตัดสินใจและสัญญาข้อมูลร่วม
5. ระยะพัฒนา R0–R7 และรายละเอียดงาน
6. การแบ่งเจ้าของงานและป้องกันงานทับซ้อน
7. เส้นทางงานที่ต้องรอกันและแผนทำขนาน
8. มาตรฐานฟิสิกส์และแผนตรวจจรวดทั้งกลุ่ม
9. วิเคราะห์ workflow ที่ผ่านมาและการปรับวิธีทำงาน
10. เกณฑ์ตรวจรับ การเผยแพร่ และการย้อนกลับ
11. ความเสี่ยง คำถามที่รอคำตอบ และการประมาณงาน
12. รูปแบบส่งต่องานสำหรับ AI และแหล่งอ้างอิง

## 1. เป้าหมาย ลำดับความสำคัญ และขอบเขตหลักฐาน

เป้าหมายสูงสุดคือสร้างรากฐานที่ฟิสิกส์ ข้อมูลอ้างอิง และสถานะการจำลองสอดคล้องกัน เพื่อให้การสร้างยาน การปล่อย การโคจร การเชื่อมต่อ และโหมดนักบินอวกาศใช้ระบบเดียวกันได้อย่างน่าเชื่อถือ ความสวยงามของภาพต้องสะท้อนสถานะจริงของการจำลอง ไม่ใช้ภาพเคลื่อนไหวจัดฉากแทนกลไกที่ยังไม่มี

ลำดับการส่งมอบ:

1. **ให้ผู้ใช้จัดการข้อมูลการเรียนและผลสอบได้ก่อน** พร้อมรักษางานเดิมและแยกผู้เรียนอย่างชัดเจน
2. แก้การเลื่อนเมาส์และจัดหน้าปล่อยจรวดให้เห็นจรวดได้เต็มขึ้น พร้อมการควบคุมที่หาเจอ
3. เพิ่มภาพที่สัมพันธ์กับแบบจริงในหน้าสร้าง และเชื่อมการสร้าง–ตรวจ–ปล่อย–อ่านผล–แก้ไข
4. ปรับความสมจริงของจรวดตามหลักฐานทีละกลุ่ม โดยงานตรวจฐานฟิสิกส์เริ่มตั้งแต่ R0/R1 และดำเนินต่อเนื่อง ไม่รอให้ UI เสร็จทั้งหมด
5. ทำภารกิจไป ISS ให้ต่อเนื่องจนเชื่อมต่อ พร้อมแก้ข้อจำกัดของระบบ Docking ที่มีอยู่
6. เพิ่มโหมดนักบินอวกาศบนฐานสถานะและฟิสิกส์ที่ผ่านเกณฑ์แล้ว

การผ่านชุดทดสอบซอฟต์แวร์ การเทียบข้อมูลการบินจริง และการประเมินความเข้าใจของผู้ใช้เป็นหลักฐานคนละชนิด ต้องรายงานแยกกัน ไม่ใช้จำนวน tests ที่ผ่านรับรองความแม่นยำทุกโมเดล ไม่เปลี่ยน tolerance หรือข้อมูลอ้างอิงภายหลังเพียงเพื่อให้ผลผ่าน

คำว่า “ถูกต้องสมบูรณ์” ในการตรวจรับต้องแปลงเป็นขอบเขตที่ตรวจได้: กฎทางฟิสิกส์ที่ระบบต้องรักษา ปรากฏการณ์ที่รองรับ ช่วงสภาวะที่ตรวจแล้ว แหล่งข้อมูล ความไม่แน่นอน และกรณีที่ยังไม่ผ่าน เป้าหมายคือเพิ่มขอบเขตและความน่าเชื่อถืออย่างต่อเนื่อง ไม่ประกาศว่าทุกสภาวะผ่านโดยไม่มีหลักฐาน

การตรวจเพื่อจัดแผนครั้งนี้ไม่ได้รันการจำลองหรือชุดทดสอบใหม่ ไม่ได้ทำการศึกษากับผู้ใช้จริง และไม่ได้เปลี่ยนแอป ผลเดิมที่ยกมาเป็นหลักฐานย้อนหลังพร้อม commit/run ที่ระบุ

## 2. สิ่งที่มีอยู่แล้วและปัญหาที่ต้องพิสูจน์

| ประเด็น | สิ่งที่ตรวจพบ | ผลต่อแผน |
|---|---|---|
| ข้อมูลผู้เรียน | `orbitlab.lessons` เก็บความก้าวหน้า ผลสอบ และเนื้อหาที่นำเข้ารวมกัน; `orbitlab.student` เป็นชื่อเดียว | ต้องออกแบบโปรไฟล์ การรีเซ็ต การย้ายข้อมูล และ backup ร่วมกัน การลบ key ทั้งก้อนอาจลบบทเรียนของครู |
| เริ่มบทเรียนใหม่ | มีการเริ่ม session ใหม่ แต่ไม่ลบประวัติผ่าน คะแนน ความช่วยเหลือ หรือข้อสอบค้าง | ต้องแยก “เริ่มทำใหม่” กับ “ลบประวัติ” ใน UI และข้อมูล |
| Launch Engineer | desktop ใช้คอลัมน์ `320px / minmax(360px,1fr) / 330px`; จอสั้นยังแบ่งพื้นที่ให้ข้อมูลจำนวนมาก | มีสาเหตุเชิงโครงสร้างที่บีบภาพ ต้องวัด layout จริงและออกแบบลำดับความสำคัญใหม่ |
| หน้าต่างจัดเอง | HUD ลาก ย่อ ขยาย dock และจดจำตำแหน่งได้แล้ว | ขยายระบบเดิมไปยัง workspace แทนสร้าง window manager อีกชุด |
| เลื่อนเมาส์ | กล้อง Launch รับ wheel บน viewport ที่มี Build/Orbit ซ้อนอยู่; แผงข้อความบางส่วนไม่อยู่ในรายการยกเว้น | เป็นสมมติฐานสาเหตุที่มีหลักฐานจากโค้ด ต้องทำ reproducer ยืนยัน scroll และกล้องแต่ละตัวก่อนแก้ |
| กล้อง Watch | drag/zoom ในบางมุมมีอยู่ แต่ปุ่มเลือกมุมถูกซ่อนและ phase ใหม่สั่งกล้องอัตโนมัติซ้ำ | ต้องกำหนดเจ้าของกล้องแบบอัตโนมัติ/ผู้ใช้ ไม่ใช่แค่เปิดปุ่มที่ซ่อน |
| สัญลักษณ์ | มี Auto/ISO/GOST; Auto ใช้ GOST ใน RU และ ISO ใน EN/TH | เอา Auto ออกจากตัวเลือกที่มองเห็น ใช้เป็นค่าเริ่มต้นภายใน และย้าย display settings ออกจาก setup ที่จะซ่อน |
| ภาพ Build | จรวด Watch/Explore มี SVG ตามสัดส่วนแล้ว; จรวด Engineer ไม่มี preview; ดาวเทียมทั้งสองระดับไม่มีภาพตัวยาน | ใช้ฐานภาพจรวดเดิม เพิ่มภาพดาวเทียมที่อ่านแบบจริง และผูกกับช่องเทคนิค |
| renderer ดาวเทียม | ภาพในเที่ยวบินเป็น silhouette ตามชนิด มีแผง/จานสัดส่วนคงที่บางส่วน | ห้ามนำมาแสดงว่าเป็นแบบตรงตามทุกค่าของผู้ใช้ ต้องมี design geometry adapter และระบุสมมติฐาน |
| ความเชื่อมโยง | มี Build→Launch, Build→Orbit, Launch→Orbit แล้ว | เพิ่ม provenance สถานะแบบและเที่ยวบิน การกลับไปแก้ และตัวเชื่อมที่ตรงกับสิ่งที่บินจริง |
| ISS Docking | Soyuz-2.1a/Soyuz MS มี finite burns, Kurs, TORU, capture gates, 3 profiles และ 4 ports แล้ว | ตรวจเหตุที่ผู้ใช้ไม่เห็นขั้นตอนต่อเนื่อง ปรับการเข้าถึงและความสมจริง ไม่สร้างระบบ Soyuz Docking ซ้ำ |
| ข้อจำกัด ISS | สถานีเป็นวงโคจรอ้างอิงที่กำหนด phase ตามแผน; ไม่ใช่ live ISS; navigation ไม่มี error; station ถูกยึด attitude | แยก reference mission กับ ephemeris mission; เพิ่มขอบเขตฟิสิกส์และความไม่แน่นอนทีละขั้น |
| เชื้อเพลิง Docking | static code ใน `Rendezvous.integrate()` คำนวณแรง/torque ก่อน clamp เชื้อเพลิง; `stepBurn()` จำกัดด้วย planned Δv ก่อนตรวจ fuel | เป็นข้อสังเกตที่ต้องสร้าง regression พิสูจน์ทันทีใน R1 ห้ามอนุญาตแรงขับเมื่อเชื้อเพลิงหมด |
| Contact | หลัง capture ระบบตรึงยานกับ port pose ไม่มีการตอบสนองสองวัตถุอย่างเต็มรูปแบบ | วางงาน contact/free drift/impulse บนฐานกฎอนุรักษ์ และเปิดเผยค่าที่ประมาณ |
| Soyuz | #63 ปรับ load/engine/programme/hot staging; #64 แก้ลำดับ burn แต่ยังเหลือ Fregat RCS turn inefficiency | ใช้วิธีตรวจเดิมเป็นกระบวนการ ไม่คัดลอกค่าที่ fit ของ Soyuz ไปใช้กับทุกจรวด |
| Max-Q / แรงขับ 100% | ผู้ใช้รายงาน Soyuz; HUD/onboard อ่านคำสั่งคันเร่ง ไม่ใช่ระดับเครื่องยนต์จริง; โมเดล Soyuz-2 มี booster step 81% ที่ T+112 s แยกจากคำสั่ง guidance | แยก command / actual engine level / thrust N; ตรวจโปรแกรมตาม variant และหลักฐาน ไม่ใส่ Max-Q throttle bucket เดียวให้ทุกจรวด |
| ผลวิทยาศาสตร์เดิม | Vega-C rating ยังพลาดกรอบอ้างอิง; sizing/fairing และตัวอย่างดาวเทียมมีข้อจำกัดที่รายงานไว้ | สร้าง reproducer บนฐานปัจจุบันก่อนแก้ แยก design shortfall ออกจากข้อผิดพลาดของโมเดล |
| CI | มี 3 unit shards, 2 browser shards, branch concurrency, browser isolation และ main-tip deploy guard แล้ว | รักษาสิ่งที่แก้แล้ว ปรับ release parallelism, heavy inventory และหลักฐานผล แทนเสนอทำระบบเดิมซ้ำ |

หลักฐานหลัก: `src/lessons/progress.ts`, `src/ui/lessons/lesson-mode.ts`, `src/ui/lessons/assessment-view.ts`, `src/style.css`, `src/render/cameras.ts`, `src/ui/hudlayout.ts`, `src/ui/notation.ts`, `src/ui/build/*`, `src/orbit/handoff.ts`, `src/physics/sim/rendezvous.ts`, `docs/PHYSICS.md` §9.2 และ `docs/FLIGHT-PROFILE-METHOD.md` รายการอ้างอิงเต็มอยู่ท้ายเอกสาร

## 3. ตารางติดตามข้อเสนอทั้งหมด

รหัส U คือข้อเสนอของผู้ใช้ รหัส A คือข้อเสนอเดิมของผู้ช่วย ทุกข้อมีงานรับผิดชอบและเกณฑ์ตรวจในระยะที่ระบุ

| รหัส | ข้อกำหนด | งานหลัก | ระยะ |
|---|---|---|---|
| U01 | รีเซ็ตข้อมูลเรียน/ผลสอบ และเพิ่ม–ลบโปรไฟล์ | R1.1–R1.2 | R1 |
| U02 | Launch Engineer กระชับ เป็นระเบียบ และภาพจรวดใหญ่ขึ้น | R2.1 | R2 |
| U03 | Watch เลือกและควบคุมมุมกล้องเองได้ | R2.2 | R2 |
| U04 | Build จรวด/ดาวเทียม Engineer มีภาพช่วยเข้าใจ | R3.2–R3.4 | R3 |
| U05 | แต่ละโหมดเชื่อมโยงกันมากขึ้น | R3.1, R3.5, R5.1 | R3/R5 |
| U06 | ภารกิจ ISS ดำเนินต่อจน Docking จริง | R1.4, R5.1–R5.4 | R1/R5 |
| U07 | เมาส์ wheel เลื่อนหน้าต่างและหน้าต่างย่อยได้ | R1.3 | R1 |
| U08 | เอาปุ่มรีเซ็ตกล้องออกจากภาพจำลองจรวด | R2.2 | R2 |
| U09 | เอาตัวเลือก “ตามภาษา” ออก และใช้ค่าเริ่มต้นตามภาษาปัจจุบัน | R2.1 | R2 |
| U10 | เลือกข้อมูลและจัดหน้าจอ Engineer เองได้ | R2.1, R2.3 | R2 |
| U11 | ซ่อน setup ซ้ายเมื่อเริ่มเที่ยวบิน | R2.1 | R2 |
| U12 | ใช้บทเรียน Soyuz พัฒนาท่าทาง/เส้นทางและจรวดอื่น | R0.1, R4.1–R4.4 | ต่อเนื่อง R0–R4 |
| U13 | ตรวจ workflow งานยาก งานช้า และงานซ้ำเพื่อปรับกระบวนการ | R0.3, R1.5, R7.2 | R0/R1/R7 |
| U14 | เพิ่มโหมดนักบินอวกาศที่สมจริง | R6.1–R6.3 | R6 |
| U15 | ฟิสิกส์เป็นรากฐานสูงสุดของทุกโหมด | R0.2, R1.4, R4, R5, R6, R7 | ทุกระยะ |
| U16 | ตรวจการผ่อนเครื่องใกล้ Max-Q และทำให้คำสั่งคันเร่ง ระดับเครื่องยนต์จริง และแรงขับแสดงอย่างถูกต้อง โดยเริ่มจาก Soyuz | R2.1, R4.2–R4.3; ข้อ 8.6 | R2/R4 |
| A01 | เริ่มทดลองเองได้จากหน้าแรก | R3.5 | R3 |
| A02 | คำแนะนำหลังบินพาไปแก้ค่าที่เกี่ยวข้องได้ | R3.5 | R3 |
| A03 | ปัญหา readiness พาไปแก้ชิ้นส่วนต้นเหตุได้ | R3.4 | R3 |
| A04 | ควบคุมการบินบนมือถือได้ขณะอ่านกราฟ | R2.1 | R2 |
| A05 | เลือกเหตุการณ์ซ้อนบน timeline ได้ตรงรายการ | R2.4 | R2 |

## 4. การตัดสินใจและสัญญาข้อมูลร่วม

### 4.1 เรื่องที่ต้องยืนยันก่อนงานที่เกี่ยวข้อง

ผู้ใช้ยืนยัน D01–D04 แล้วในวันที่ 3 ตุลาคม 2026:

- D01 — **ยืนยัน:** เก็บหลายโปรไฟล์ในเครื่องก่อน ใช้ออฟไลน์ได้; ระบบบัญชีออนไลน์/ซิงก์ข้ามเครื่องอยู่นอกขอบเขตระยะแรก
- D02 — **ยืนยัน:** เริ่มภารกิจ ISS ด้วย Soyuz แล้วขยายยานอื่นหลังมี spacecraft/port model ที่เหมาะสม
- D03 — **ยืนยัน:** นักบินอวกาศระยะแรกอยู่ในห้องนักบินและควบคุมการบินเอง; เดินในยาน/EVA เป็นการขยายภายหลัง

คำตอบ D01–D04 เป็นการยืนยันทิศทางก่อนเริ่มพัฒนา ต่อมาผู้ใช้อนุญาต R1 และงานเล็กตามสถานะเอกสารด้านบนแล้ว ถ้าผู้ใช้เปลี่ยนขอบเขตภายหลัง ให้ปรับ dependency และ effort ก่อนเริ่มงานที่ได้รับผลกระทบ

เรื่องที่ต้องตัดสินใจใน R0 เพิ่มเติม:

- D04 — **ยืนยัน:** แยกงานทั้งหมดของแต่ละคน ได้แก่เรียน/สอบ mission แบบจรวด/ดาวเทียม saved designs และ drafts สมุดทดลอง รวมถึงงานสร้าง/นำเข้าบทเรียนหรือใบงานของคนนั้น; bundled catalogue/lesson packs/assets เป็นข้อมูลอ่านอย่างเดียวร่วมกัน ข้อมูลที่ผู้ใช้สร้างไม่ถือเป็น library ร่วมโดยอัตโนมัติ
- D05: ขอบเขตรีเซ็ต — เสนอรายบทเรียน, เรียนทั้งหมด, สอบทั้งหมดรวมข้อสอบค้าง, ทั้งเรียนและสอบ, และลบโปรไฟล์
- D06: notation เมื่อเปลี่ยนภาษา — เสนอให้ค่าเริ่มต้นตามภาษาเปลี่ยนเฉพาะผู้ที่ไม่ได้ override ISO/GOST เอง
- D07: เป้าหมายความสมจริง — เลือกภารกิจอ้างอิงและช่วงสภาวะตรวจรับรายยาน; ระบุว่าต้องใช้ fixed historical ephemeris หรือ live snapshot ที่มีอายุข้อมูลและ uncertainty
- D08: layout — ยืนยัน wireframe จากภาพบน desktop/laptop/mobile; preset และขนาดภาพขั้นต่ำก่อนทำการลากหน้าต่างได้อย่างอิสระ
- D09: cockpit — เลือกยานรุ่นแรก ระดับระบบไฟฟ้า/เครื่องยนต์/การนำร่อง/เสียงที่ต้องจำลอง และ input devices; VR/EVA เป็นการขยายที่ต้องแยกขอบเขต

### 4.2 สัญญาที่ต้องใช้ร่วมกัน

**LearnerRepository / ProfileWorkspace:** stable profile ID แยกจากชื่อ, ข้อมูลงานทั้งหมดมี profile owner; bundled read-only teaching assets แยกจาก authored/imported personal content; revision/reset epoch, การย้ายข้อมูล, transaction และ export/import contract ป้องกัน stale tab หรือ worker เขียนข้อมูลที่รีเซ็ตกลับมา ทุก session/worker/export/restore ยึด profile ID ตอนเริ่ม ไม่อ่าน active profile ใหม่เมื่อ callback จบ

**FlightLifecycle:** แยกสถานะอิสระสามส่วน: (1) mission lifecycle `setup → running → completed/aborted → analysis → explicit return to setup`, (2) live simulation clock ที่กำลังเดินหรือพัก, (3) displayed cursor/live–replay และ playback clock ของภาพ ผู้ใช้ replay ขณะ live recorder เดินต่อได้ การพักหรือ replay ไม่ทำให้ setup กลับมาแก้ได้ และการจบที่ live head ไม่ดึง cursor/view ออกจาก replay โดยเงียบ แยก configuration controls จากคำสั่งที่ใช้จริงระหว่างบิน

**CameraPolicy:** selected view, follow target และ direction owner เป็นคนละค่า; ผู้ใช้เลือก manual แล้ว phase ใหม่ไม่แย่งกลับ จนกว่าจะเลือก cinematic เอง

**GestureOwnership:** แต่ละ canvas รับ drag/wheel ของตัวเอง; ข้อความ/แบบฟอร์ม/ตารางใช้ native scroll; surface ที่ซ่อนไม่รับ gesture; ป้องกันกล้องสองตัวประมวลผล wheel เดียวกัน

**CraftState/Handoff:** version, source design ID/revision, immutable flown inputs, build/model provenance, epoch/time, frame/units, `r/v`, attitude quaternion, angular velocity, mass/fuel, geometry, subsystem state, docking port และ destination intent ตามชนิดข้อมูลที่รองรับจริง

แยก intent อย่างชัดเจน: “แบบ → ตั้งภารกิจ”, “แบบ → วางในวงโคจรโดยตรง”, “เที่ยวบิน → ต่อจากสถานะที่แสดง”, “ผล → เปิดค่าต้นเหตุเพื่อแก้” ห้ามใช้ draft ปัจจุบันแทนเที่ยวบินที่บินไปแล้ว และห้ามนำสถานะในอนาคตมาใช้เมื่อผู้ใช้กำลัง replay

**DesignPreview:** ภาพและตัวเลขอ่าน design snapshot เดียวกัน; geometry ที่ไม่มีพารามิเตอร์จริงต้องมีสมมติฐานที่ระบุ; draft ไม่ถูกต้องแสดงปัญหา และภาพ last-valid ต้องมีสถานะว่าล้าสมัย

**ResultAction:** ใช้รหัสเหตุและ typed destination ไม่ parse ข้อความแปลเพื่อหาช่องแก้; ข้อเสนอเปลี่ยนค่าแสดงก่อน/หลัง และสร้าง draft ใหม่โดยผู้ใช้ตั้งใจ

**VerificationManifest:** source SHA/tree, base/head, lock/config/runtime hashes, selected tests/coverage, snapshot hashes, dist hash, ผล execution/reference acceptance และเวลา ใช้เป็นฐานของการรวมหลักฐานและการปรับ CI

## 5. ระยะพัฒนา R0–R7 และรายละเอียดงาน

ระยะ R0–R7 เป็นแผนใหม่ ไม่ใช่การทำ Stage 1–4 ที่ส่งมอบไปแล้วซ้ำ ลำดับหมายถึง dependency ของผลส่งมอบ งานเก็บหลักฐานและโมดูลที่ไม่ทับซ้อนสามารถทำขนานตามข้อ 7 ได้

### R0 — ตรึงโจทย์ สัญญาข้อมูล และหลักฐานก่อนเริ่มพัฒนา

**ผลที่ต้องได้:** ทุกงานรู้ว่ากำลังแก้อะไร ใช้ source ไหน ตรวจด้วยอะไร และใครเป็นเจ้าของส่วนร่วม

#### R0.1 — บันทึกฐานและทำ reproducer ที่ระบุสภาวะ

- เก็บ source commit, route, ภาษา, viewport/browser zoom, inputs, flight model, launch epoch, seed และ screenshot สำหรับหน้าที่ผู้ใช้รายงาน
- ตรวจ wheel บนข้อความ Build/Orbit/บทเรียน/ตาราง/modal โดยวัด scroll container และกล้องทั้งที่แสดง/ซ่อน
- เก็บ Engineer setup/flight/paused/replay/analysis, Watch phase transitions และ Build Engineer แต่ละ tab
- ทำ inventory ยานทุก ID จาก `VEHICLES` และ `HISTORICAL_VEHICLES`; ฐานที่ตรวจมี 21 + 4 IDs โดยบางชื่อเป็น family เดียวกัน ต้องแยก variant/mission ไม่ถือว่าชื่อเหมือนคือข้อมูลเดียวกัน
- อ่านก่อน/หลังของ Soyuz #63/#64 และตรวจว่า proposal ใน audit เดิมข้อใดลงโค้ดแล้วจริง
- **เจ้าของ:** Q (หลักฐาน/ตรวจรับ); ไม่แก้ source ของ feature ระหว่างเก็บ baseline
- **ตรวจรับ:** ปัญหาที่พิสูจน์ได้มีขั้นตอนทำซ้ำ; เรื่องที่ยังไม่ได้พิสูจน์ติดป้าย reported/hypothesis; ไม่อ้างว่า screenshot หรือ flight ใหม่มีแล้วก่อนรันจริง

#### R0.2 — ตัดสินใจ product และตรึง domain contracts

- ตอบ D01–D09 ตามงานที่จะเริ่ม และเขียน ADR/schemas สำหรับ learner, lifecycle, camera, gesture, handoff และ physical state
- D01–D04 ยืนยันแล้ว: local profiles, Soyuz first, cockpit/manual first และแยกงานทั้งหมด; inventory ต้องครอบคลุม persisted drafts กับ state ใน memory ที่สลับคนแล้วต้องเก็บ/ปิด/ล้างตาม policy
- แยก input data, derived, estimate, fitted และ acceptance reference ของแต่ละโมเดล
- กำหนดเกณฑ์ฟิสิกส์ขั้นต่ำและ compatibility ของข้อมูลเก่า ไม่กำหนด version ใหม่แทนผลวิเคราะห์ schema โดยอัตโนมัติ
- **เจ้าของ:** S (สัญญาข้อมูล) ร่วม L/P/U/C; app integration เป็น I คนเดียว
- **ตรวจรับ:** ตัวอย่าง valid/invalid/legacy state อธิบายได้; ผู้พัฒนาโมดูลสร้าง against contract ได้โดยไม่แตะไฟล์ร่วม

#### R0.3 — แผนตรวจและการจัดเจ้าของร่วม

- สร้าง change-to-check map และรายการ shared-file ownership; ระบุ PR dependency/base สำหรับแต่ละงาน
- บันทึกเวลาและสาเหตุของ workflow ย้อนหลัง แยก test defect, browser/environment failure, integration failure และ scientific regression
- กำหนดว่าจะใช้ fast checks, affected full flights, broad fleet และ release gates เมื่อใด
- **เจ้าของ:** T (workflow/test infrastructure) ร่วม Q/P
- **ตรวจรับ:** trial map เลือก tests ที่เคยพบปัญหา #63/#64/#68/#70 ได้; กรณีไม่รู้ผลกระทบ fallback เป็นชุด relevant เต็ม

**ทำขนานได้:** R0.1 evidence, ร่าง schema แต่ละ domain และ workflow inventory\
**ต้องรวม:** สรุป schema/acceptance และ shared-file ownership ก่อนมี feature PR\
**Gate G0:** ขอบเขตงานระยะแรกและคำถามที่จำเป็นของระยะนั้นได้รับคำตอบ; มีแผนตรวจและเจ้าของส่วนร่วม; ยังต้องมีคำสั่งเริ่มจากผู้ใช้

### R1 — จัดการผู้เรียนก่อน พร้อมแก้ฐานที่ทำให้ใช้งานหรือฟิสิกส์ผิด

**ผลที่ต้องได้:** รีเซ็ตและสลับผู้เรียนได้อย่างน่าเชื่อถือ เมาส์เลื่อนได้ และกลไกเชื้อเพลิง/คำสั่งไม่ละเมิด invariants

#### R1.1 — โปรไฟล์ทั้ง workspace รีเซ็ต ย้ายข้อมูล และ backup เป็นงานข้อมูลเดียว

- stable opaque ID กับชื่อที่แก้ได้; รองรับสร้าง/เปลี่ยนชื่อ/สลับ/ลบ และชื่อซ้ำโดยข้อมูลยังแยกกัน
- ตาม D04 ที่ยืนยันแล้ว แยก learning/assessments, mission setup, rocket/satellite saved designs และ drafts, notebook, requirements forms, lesson authoring/imports และ worksheet drafts ของแต่ละคน
- สำรวจ storage ทุกจุด รวมข้อมูล recovery และ memory caches; 4 keys ของ archive เดิมไม่ใช่ inventory ของงานทั้งหมด ห้ามถือว่า migrationครบเพียงย้าย whitelistเดิม
- จุดที่ต้องเข้ารายการอย่างน้อย: `orbitlab.build.explore.v1`, `orbitlab.build.satellite.v1`, `orbitlab.build.requirements.v1`, `orbitlab.author.draft`, `orbitlab.author.design`, `orbitlab.author.kind`, `orbitlab.worksheets`; `orbitlab.designs`มีทั้งrocketและsatellite saved designs
- เสียงที่ผู้ใช้อัปโหลดอยู่ IndexedDB `orbitlab-soundtracks`/`tracks` และปัจจุบันผูกmission IDอย่างเดียว ต้องมีprofile ownershipและdelete/duplicate-name isolation; built-in audioเป็นassetร่วม การสำรองmediaให้เป็นส่วนoptionalที่manifestแจ้งครบและมีbounded binary export แยกจากJSON archive 8 MB ไม่ฝังbase64เพิ่มlimitเงียบ
- preferences/layout/notation/guide/last route/dataModeที่เป็นpersonalizationให้มีprofile scopeตามregistry; asset cache/service workerระดับอุปกรณ์ การdeleteใช้explicit owner allowlist ไม่ลบทุกkeyที่ขึ้นต้น`orbitlab.*`
- ข้อมูลdraftที่พิมพ์ค้างหรือinvalid numeric textต้องมีraw-text schemaไม่แปลง`NaN`เป็น`null`แล้วอ้างว่าเก็บครบ; stateในmemoryที่ยังไม่persistต้องระบุsave/discard policyก่อนswitch
- bundled lessons/catalogue/assets/cache เป็น read-onlyร่วม; authored/imported lessons/questions เป็นงานส่วนบุคคล การแชร์กับผู้อื่นใช้ export/import หรือ explicit share flow ที่มี ownership ไม่เปิดอ่านข้าม profile เงียบ
- เสนอ IndexedDB transaction หากต้องรองรับหลายโปรไฟล์และ cross-tab อย่างจริงจัง; ประเมิน asynchronous API, fallback/error และการย้ายจาก synchronous storage ก่อนเลือกสุดท้าย
- ย้าย `orbitlab.lessons`, `orbitlab.student`, mission/design/notebook และ persisted personal drafts ทั้งหมดเป็น initial profile ครั้งเดียว ตรวจ destinationก่อน marker; malformed/newer data ไม่ถูกแทนด้วยข้อมูลว่าง
- interruption ก่อน/หลัง destination write และ migration marker ต้องเปิดใหม่ต่อได้แบบ idempotent โดยรักษา source/recovery bytes; pending import recovery กับ reset/delete ต้องมีกฎไม่คืนประวัติที่ลบไปแล้ว
- ไม่เก็บ authoritative copies สองชุดที่ mirror ไปมา; ระบุพฤติกรรม app เก่าที่ service worker ยัง cache อยู่และ rollback/read-only policy
- รีเซ็ตการเรียน/สอบตามขอบเขตที่เลือก รวม attempts/pass evidence/hints/reveals/ข้อสอบค้าง โดยไม่ลบแบบจรวด/ดาวเทียม mission/notebook หรือ authored lessons ของคนเดียวกัน; การลบโปรไฟล์จึงลบงานทั้งหมดของเจ้าของนั้นตาม dialog ที่แจ้ง
- ควบคุม revision/epoch และ transaction; read-then-write `localStorage` อย่างเดียวไม่รับประกัน atomicity ข้ามแท็บ
- profile-aware archive/recovery/export ต้องอยู่ในงานเดียวกัน รองรับ active-profile archive และ multi-profile archiveที่ระบุ ownershipชัด; v1เดิมมี previewเลือก target/create new; Keep Existing default; archive versionใหม่ต้องรวม persisted drafts/metadataตาม scope ไม่แอบรับปาก restore running flight
- transactionไม่ครอบคลุมสองIndexedDB databasesพร้อมกันโดยอัตโนมัติ; ถ้าแยกmedia DBต้องมีmigration/delete recovery journalและownership checks หรือย้ายเข้าunified storeตามADRก่อนอ้างatomic full-profile operation
- ตรวจขนาดรวมและจำนวน profiles; ไม่เพิ่มขีดจำกัด archive 8 MB เดิมโดยไม่มีข้อมูลการใช้งาน; exported result/checksum format ที่เปลี่ยนความหมายต้อง version และยังอ่าน legacy ได้
- ลบ profile-owned recovery copies ตาม retention policy ที่แจ้งจริง ไม่ลบ unrelated projects และไม่แอบเก็บสำเนาถาวรของข้อมูลที่ผู้ใช้สั่งลบ
- กรณีลบ active/last profile ต้องแสดง chooser/สร้างผู้เรียนใหม่โดยตั้งใจ ไม่สลับไปคนอื่นหรือสร้างข้อมูลผู้เรียนที่ลบกลับมาเงียบ; local profile เป็นการแยกข้อมูล ไม่ใช่ authenticated identity และ checksum ผลสอบไม่ใช่ลายเซ็นรับรองตัวตน/คะแนน
- **เจ้าของ L; จุดร่วม:** progress/archive/validation, `src/design/design-store.ts`, mission storage, notebook, satellite/requirements/authoring draft adapters และ repository ใหม่; coordinate กับ S/I/B โดย Lเป็นwriter storageใน R1
- **ตรวจรับ:** งานทุกชนิดเดิมย้ายครบ; A/Bไม่ปนกันทั้งเรียน/design/mission/notebook/drafts/custom content; scoped resetไม่ลบงานอื่น; delete profileไม่มีงานของคนนั้นหลงในactive caches; reload/stale tab/quota/unsupported/archive/resultเก่าตรวจครบ

#### R1.2 — UI โปรไฟล์ทั้งแอป และ reset ที่ใช้ได้จากหน้าบทเรียน

- แสดงชื่อผู้เรียน active ในบทเรียน ข้อสอบ ผล และ export; เมนูโปรไฟล์หาเจอจากหน้าการเรียน ไม่บังคับเข้า My work
- แสดง profile context ใน Build/Launch/Orbit/notebook/backupด้วย; switch เปิดworkspaceของคนนั้น ไม่คงแบบหรือflightของคนก่อนในหน้าจอใหม่; per-window sessionผูกprofileชัดและไม่เปลี่ยนเจ้าของอีกแท็บเงียบ
- reset dialog ระบุชื่อ profile ขอบเขต จำนวนบท/ข้อสอบที่จะลบ และเสนอ export ก่อนลบ; ไม่ใช้คำว่าเริ่มใหม่แทนลบประวัติ
- ยึดทุก session/async check/grade/export กับ profile ID และ revision ตอนเริ่ม; switch/reset cancel หรือ suspend ตามกติกาที่แจ้ง
- worker completion ของ profile เก่าไม่ลงคะแนนให้ profile ใหม่; export snapshot ก่อน await; clear active drafts/recommendations/hints ให้ตรงข้อมูลที่ commit แล้ว
- handle storage change ข้ามแท็บและแสดง conflict/reload; ไม่มี stale completion สร้าง profile ที่ลบไปกลับมา
- switch ระหว่างเที่ยวบิน/สอบ/async sizingหรือdraftที่ไม่บันทึก ต้องบอกงานค้างและให้บันทึก/จบ/ยกเลิกตามชนิดก่อนเปลี่ยน; worker/sessionเก่าหยุดหรือเก็บภายใต้profileเดิม ไม่มีsilent saveเข้าคนใหม่
- debounced autosave/`pagehide`ของrocket/satellite editorต้องผูก `(profileId, sessionEpoch)`เดิม; flushงานAก่อนswitch, invalidate callbacks, dispose/reconstructหรือreloadตามpolicy; `hide()`ไม่เท่ากับยกเลิกtimer/worker และห้ามlate autosaveเขียนงานAเข้าคนB
- running trajectoryไม่เป็นข้อมูลrestoreโดยอัตโนมัติ; initial scopeเก็บinputs/recorded observationsที่รองรับจริง และแสดงขอบเขตก่อนหยุดบินเพื่อswitch ห้ามอ้างเก็บครบทุกframeถ้าไม่มีrecording persistence
- switch A→B→Aต้องตรวจทุกpersisted section/imported content/personal audio/layout; session/Orbit handoff/replayของAไม่โอนไปB การเก็บเต็มเที่ยวบินและresumephysicsเป็นcapabilityแยกที่ขึ้นกับrecording/CraftState/version contract ไม่ใช่ผลของการมีโปรไฟล์เพียงอย่างเดียว
- **เจ้าของ L-UI หลัง R1.1 contract; ไฟล์:** lesson/assessment UI, workspace/store injectionและprofile UI/i18nใหม่; Iรับ `main.ts`; Breview Build bindings แต่ไม่แก้storageแข่ง L
- **ตรวจรับ:** switch A/Bแล้วทุกworkspaceแสดงงานตนเอง; activeflight/drafts/worker/export/two-tabไม่รั่วเจ้าของ; reset/delete/find profileผ่านmouse/keyboard/touch; TH/EN/RU/offline/reload/storage failureครบ

#### R1.3 — เจ้าของ gesture และการเลื่อนทุกหน้า

- กล้อง Launch รับ gesture เฉพาะ surface ที่เป็นของตนและ visible; Build/Orbit overlays ไม่ทำให้ hidden launch camera zoom
- native scrolling สำหรับข้อความ/cards/ตาราง/modal; กล้อง Orbit รับ zoom เฉพาะ canvas และไม่ bubble ไปประมวลผลซ้ำ
- ตรวจ trackpad `deltaMode`, touch, scroll boundary, browser zoom และ focus; ใช้กติกากลางแทนเพิ่ม selector exclusions กระจัดกระจาย
- **เจ้าของ C; ไฟล์:** `render/cameras.ts`, `render/orbit-view.ts`, overlay gesture hooks; I รับ shell hooks; ทำก่อน Watch camera/new previews
- **ตรวจรับ:** actual wheel ทำให้ intended `scrollTop` เปลี่ยน กล้องที่ซ่อนไม่เปลี่ยน; zoom บน canvas ยังทำงาน; keyboard/PageDown/scrollbar/touch ใช้ได้

#### R1.4 — ฟิสิกส์ร่วม: เชื้อเพลิง ขั้นเวลา และคำสั่ง

- พิสูจน์ zero/near-zero fuel ของ main/RCS ใน rendezvous ด้วย failing regression ก่อนแก้; จำกัดแรง/torque และ burn duration ด้วย propellant ที่มีจริงในขั้นนั้น
- mass/flow/thrust/Isp สอดคล้องกัน; fuel ไม่ติดลบ; burn บางส่วนต้องส่งแรงเท่าที่มีเชื้อเพลิงแล้ว coast ต่อ ไม่แสดงว่า burn สำเร็จเพราะ tank หมดอย่างเดียว
- ตรวจ step boundary/command journal/live–replay/worker parity เมื่อเปลี่ยนส่วนร่วม; ไม่เพิ่ม state ที่ไม่ได้ถูกบันทึกใน replay
- จัดกลุ่ม shared planner/actuation invariant กับ P คนเดียว; Fregat pointing efficiency เป็น R4.3 หลัง invariant นี้
- **เจ้าของ P; ไฟล์:** `physics/sim/rendezvous.ts`, shared propulsion/rigid interfaces และ recorder contracts ที่จำเป็นร่วม S
- **ตรวจรับ:** zero fuel ไม่มี propulsive force/torque; partial fuel มี impulse/consumption สอดคล้อง; changing timestep ให้ผล converge; การจำลองซ้ำจาก commands สอดคล้องในกรอบที่ประกาศ

#### R1.5 — workflow และหลักฐาน: ปรับ infrastructure ภายใต้เจ้าของเดียว

- รวม verification manifest, duration summary, structured failure annotations และ artifact provenance
- reconcile heavy inventory ปัจจุบัน 33 files กับ audit expected 27; 6 files ที่ขาดต้อง reviewed แล้วเข้าระบบ discovery/coverage aggregation เดียว
- preserve current shards/concurrency/isolation/main-tip guard; แยก Pages unit shards ให้ขนานกับ snapshots/build และ full browser shards บน refreshed dist ชุดเดียว
- ปรับ schedule/push coordination ไม่ให้ refresh ที่ same SHA แย่งงาน release code ที่กำลังทำ; publisher เดียวและ main รุ่นใหม่ supersede รุ่นเก่าได้
- ใช้ change-to-check map เพื่อ fast feedback ก่อน broad gate; ไม่ตัด final coverage เพราะ PR เคยผ่าน และไม่ใช้ PR artifact แทน refreshed release artifact โดยไม่ตรวจ identity
- มาตรฐาน browser wait ใช้ resolved state; event listeners ลงก่อน action; รักษา real clicks/failure-sensitive timeout ไม่แก้ด้วย blind retries
- **เจ้าของ T; ไฟล์:** `.github/workflows/*`, audit manifests/scripts, browser runner; logical increments ต่อกันใน workstream เดียว
- **ตรวจรับ:** test union ครบ ไม่ซ้ำ ไม่ขาด; mixed-source/incomplete report fail; ทุก gate ผ่านก่อน deploy; เทียบเวลา 3–5 runs ที่เทียบกันได้ก่อนอ้างว่าลดเวลา

**ทำขนานได้:** L storage/learning, C gestures, P invariant และ T workflow เมื่อ contracts ตรึงแล้ว; Q เขียน test specifications/fixtures โดยไม่แก้ source ของแต่ละงาน\
**ต้องรวม:** profile/reset/archive เป็นงานเดียว; async learning UI ตาม storage contract; `main.ts` ของ learner/gesture จัดคิวผ่าน I; recorder changes ผ่าน S/P\
**Gate G1:** priority learner reset/profile ผ่าน, scroll reproducer ผ่าน และไม่มี critical fuel/state invariant miss ที่รู้แล้วในขอบเขตที่จะส่งมอบ

G1 เป็นการตรวจครบระยะ ไม่ใช่เหตุให้ learner-only release ที่ผ่าน acceptance ต้องรอ P/T ซึ่งไม่ได้เป็น dependency โดยตรง สามารถส่งมอบ R1.1/R1.2 ก่อนเมื่อ migration/release gates ของ package นั้นครบและไม่มี critical invariant ที่กระทบ release; R1.3/R1.4/R1.5 จัดคิวตาม scope ของตน

### R2 — Launch Engineer เห็นภาพชัดและเลือกการแสดงผลได้

**ผลที่ต้องได้:** layout เริ่มต้นดีโดยไม่ต้องจัดเอง ตั้งค่าซ่อนเมื่อบิน และกล้อง Watch อยู่ในการควบคุมของผู้ใช้ได้จริง

#### R2.1 — shell, lifecycle, compact panels, notation และ mobile controls รวมกัน

- ออกแบบสามสถานะ Setup / Flight / Analysis; จัดลำดับภาพจรวด คำสั่งสำคัญ เวลา/สถานะ และข้อมูลรอง
- เมื่อ launch commit สำเร็จ ซ่อน setup ซ้ายและคืนพื้นที่ให้ scene; paused/replay ยังอยู่ Flight; explicit กลับ setup/เริ่มเที่ยวใหม่จึงเปิด configuration อีกครั้ง
- ย้าย display-only preferences เช่น notation ออกไปใน settings ที่ใช้ได้ระหว่างบิน; เอา “ตามภาษา” ออกจากรายการ visible, ใช้ EN/TH→ISO และ RU→GOST โดย default ตาม D06
- migrate stored `auto`/invalid values และเคารพ explicit override; vectors/signs/axes/CSV ไม่ถูกเปลี่ยนผิดเพราะ relabel
- telemetry จัดเป็นกลุ่ม สรุปสำคัญก่อน รายละเอียดเปิดเพิ่มได้; ไม่ซ่อนสถานะที่สำคัญต่อการควบคุมใต้หน้าต่าง optional
- U16: ระบุคำสั่งคันเร่ง (%) ให้ต่างจากระดับ core/booster ที่ใช้จริง และแรงขับรวม (kN); ช่องคันเร่ง manual ที่ปิดใช้งานใน autopilot ต้องไม่ทำให้เข้าใจว่าเป็นค่า autopilot สด ดูข้อ 8.6
- command/playback band กระชับ; mobile มี compact status/play/pause ขณะเลื่อนดูกราฟ พร้อมชัดว่า live หรือ replay
- รักษาสอง clocks และ `Space` สำหรับ playback กับ `Shift+Space` สำหรับ live flight ตาม contractเดิม; focused native controls/modal/drag keyboard ไม่ส่งคำสั่งซ้ำให้ timeline หรือยาน
- preserve `ResizeObserver`/renderer resize/camera aspect; ไม่ยืด canvas ด้วย CSS แทนการ resize จริง
- **เจ้าของ U + I; ไฟล์ร่วม:** `main.ts`, `index.html`, `style.css`, `ui/modes.css`, `panel.ts`, HUD/telemetry shell; รวมเป็น integration workstream เดียว
- **ตรวจรับ:** หลังปล่อย setup หายและ scene ขยาย; config ของเที่ยวบินคงเป็น frozen input; pause/replay/layout ไม่ restart simulation; command manual/abort/TORU ที่เหมาะกับยานยังเข้าถึงได้; notation migration และสามภาษาไม่ผิด sign; ค่า command/actual/thrust ตรงกับ frame เดียวกันทั้ง live/replay และไม่ใช้ manual input แทน telemetry สด

#### R2.2 — CameraPolicy ของ Watch/Launch และเอาปุ่มรีเซ็ตกล้องออก

- เลือก exterior/onboard/space/map ตามความสามารถของ view; drag/zoom ของ exterior/space เทียบเท่าการใช้งานโหมดอื่น
- แยก follow target ออกจาก view และ automatic/manual ownership; phase/target transitions ไม่ทับ manual intent โดยเงียบ
- มีทางเลือก Cinematic เพื่อกลับสู่แผนกล้องอัตโนมัติ; target ที่หายไปมี fallback ที่ชัดเจน ไม่อ้างว่า track วัตถุที่ไม่มีแล้ว
- เอาปุ่ม reset camera ออกจากหน้าจอจำลองและ event binding ที่คาดว่าปุ่มยังอยู่; internal reset/framing ที่ใช้เปิดภารกิจหรือเปลี่ยนยานยังต้องออกแบบให้ถูกต้อง
- ไม่สับสน reset camera, reset mission และ reset layout; ตรวจ keyboard/input focus และ Watch speed/picker เดิม
- **เจ้าของ C หลัง R1.3; I รวม hooks กับ R2.1; ไม่ให้สอง branch แก้ `main.ts`/camera policy พร้อมกัน**
- **ตรวจรับ:** manual view อยู่ข้าม liftoff/staging/orbit; mouse/touch/keyboard เลือกมุมได้; Cinematic คืน automation; ไม่มี visible camera reset; เปิดภารกิจใหม่ frame ยานได้ถูกสัดส่วน

#### R2.3 — เลือก cards และจัด workspace เองแบบมีลำดับ

- ขั้นแรกเลือกชุดข้อมูลที่แสดงและ presets Flight / Dynamics / Orbit; Docking preset เพิ่มหลัง R5 มี schema ที่ตรวจแล้ว
- ขั้นต่อไป dock/resize/reorder โดยขยาย HUD layout controller เดิม และรองรับ keyboard alternatives
- save layout version, clamping เมื่อเปลี่ยนจอ/browser zoom, invalid layout fallback และ reset layout ที่คนละความหมายกับ reset camera
- mandatory controls/time/live status ไม่หายเพราะเลือก layout; hidden panel เปิดกลับมารับค่าของ displayed frame ปัจจุบัน
- **เจ้าของ U คนเดิม หลัง R2.1; ไม่สร้าง window manager แยกอีกตัว**
- **ตรวจรับ:** presets ใช้ได้ก่อน custom layout; save/reload/resize/mobile ไม่ทำ control หลุดจอ; การจัด panel ไม่เปลี่ยน inputs/clock/physics

#### R2.4 — Timeline event chooser

- กลุ่มเหตุการณ์ใกล้กันเปิดรายการชื่อและ T+ ให้เลือก แทนพึ่งการกดวนและ tooltip
- ใช้ event identity และ exact recorded time; list/keyboard/focus/Escape ใช้ได้ รวมกรณี recording ยังเพิ่ม
- ไม่ทำให้ replay เห็นผล/เหตุการณ์ในอนาคตก่อน cursor; keyboard ของ list ไม่ไป seek หรือควบคุมยานพร้อมกัน
- **เจ้าของ V (timeline module); I รวม shell/i18n เท่านั้น**
- **ตรวจรับ:** ทุก member เลือกได้จริงและ seek ถูกเวลา; TH/EN/RU ที่จอ 320/390 px ไม่ล้น; Event list และ controls ไม่แย่ง gesture

**ทำขนานได้:** pure layout model, camera policy module และ timeline chooser หลังตรึง APIs\
**ต้องรวม:** compact shell, hide setup, mobile controls, notation placement และ custom layout อยู่กับ U/I; R2.2 hooks รวมตามคิว ไม่ merge global UI สองชุดพร้อมกัน\
**Gate G2:** wireframe และ browser screenshots ตามสภาวะจริงผ่าน; layout default ไม่ต้องอาศัยการจัดเอง; controls และ camera contract ทำงานครบ

### R3 — เห็นแบบจริงและเชื่อมทุกขั้นของการทดลอง

**ผลที่ต้องได้:** ตัวเลขใน Build มีภาพอธิบาย และการส่งต่อระหว่างโหมดรักษาแบบ/สถานะ/ที่มาจริง

#### R3.1 — สัญญาส่งต่อข้อมูลและ provenance กลาง

- implement versioned envelopes จาก R0.2 โดยแยก design, configured mission, synthetic orbit, displayed flight continuation และ targeted edit
- รักษา design ID/revision, frozen flown inputs, epoch/frame, remaining propellant และ attitude/subsystems เท่าที่โมเดลรองรับ
- ตรวจ code observation ที่ origin ปัจจุบันอ่าน `panel.missionState()` แทน `sim.cfg`; reproducer ต้องแสดงกรณี draft ต่างจาก flown ก่อนแก้
- invalid/newer envelope ถูกปฏิเสธอย่างชัดเจน ไม่ fallback เป็นยาน default เงียบ; legacy mission/design/archive มี migration ตาม schema
- **เจ้าของ S ร่วม P; ไฟล์:** `types.ts`, mission schema, `orbit/handoff.ts`, design adapters และ import validators; L/T/I รับผ่าน contracts
- **ตรวจรับ:** Build→Launch→Orbit รักษาค่าที่เกี่ยวข้อง; replay handoff ใช้ cursor ไม่ใช่ live head; newer unsupported state ปฏิเสธ; old records อ่านได้ตามขอบเขตที่ประกาศ

#### R3.2 — ภาพจรวด Engineer จาก geometry เดียวกับแบบ

- reuse `StackSvg`, `explodedView`, `stackLayout` พร้อมประกอบ/แยกชิ้น, dimension/scale, stage/engine/fairing selection
- ภาพ bench ต้องเป็น selected design หรือ sized variant ที่กำลังตรวจจริง ไม่วางภาพ catalogue ข้างค่าที่แก้แล้ว
- เลือก part แล้วไปยัง technical tab/field ที่เกี่ยวข้อง; invalid draft มีสถานะชัด
- SVG เป็นผลส่งมอบแรก; 3D interaction เพิ่มจาก geometry เดิมหลัง lifecycle/context budget ชัด ไม่สร้าง WebGL renderer ทุก tab
- **เจ้าของ B-R (โมดูล rocket preview); B รวมเข้าหน้า Engineer**
- **ตรวจรับ:** dimensions/parts match `VehicleSpec` ที่ calculations/Launch ใช้; assemble/explode ไม่บิดภาพ; keyboard/touch selection; custom/remixed/sized variants ผ่าน

#### R3.3 — ภาพดาวเทียมและภาพอธิบาย subsystem

- view model อ่าน `SatelliteDesign` และ figures snapshot/revision เดียวกัน: bus size, array area/mount, antenna diameter, aperture, propulsion presence
- geometry ที่แบบไม่มี เช่น จำนวนปีก aspect ratio และตำแหน่งอุปกรณ์เป็น schematic assumption ที่ระบุ ไม่อ้างเป็นแบบโรงงานจริง
- แสดง assembled/deployed และ dimensions; เลือก power/propulsion/ADCS/radio/camera แล้ว highlight และเปิด controls
- diagrams อธิบาย sunlight/eclipse/power, antenna pointing/link, camera footprint และ attitude axes ตามโมเดลเดิม ไม่สร้างฟิสิกส์อีกชุดใน UI
- array=0, no propulsion, no camera และ body-mounted/tracking ต้องแสดงต่างกันจริง
- **เจ้าของ B-S (โมดูล satellite preview); B รวมเข้าหน้า Explore/Engineer; schema ส่งต่อร่วม S**
- **ตรวจรับ:** เปลี่ยนค่าแล้วภาพและ figures เป็น revision เดียวกัน; ไม่มีอุปกรณ์ที่แบบระบุว่าไม่มี; assumptions หาอ่านได้; invalid/stale preview แจ้งจริง

#### R3.4 — Build integration และพา readiness ไปแก้ต้นเหตุ

- B รวม R3.2/R3.3 เข้า shell ของ rocket/satellite Engineer และ responsive UI
- readiness issue เป็น typed target เช่น fairing fit→fairing/payload, weak liftoff→stage/engine/payload; ใช้ field/part ID ไม่ใช้ข้อความแปลเป็น logic
- เข้า tab/part/field แล้ว focus/scroll ไปจุดนั้น แสดงเหตุ ไม่ auto-tune หรือ silently apply
- กรณีหา cause เดียวไม่ได้ แสดงทางเลือกที่มีหลักฐาน; stale readiness ไม่ถูกใช้แทนแบบที่แก้แล้ว
- **เจ้าของ B; ไฟล์ร่วม:** `build-screen.ts`, `engineer-level.ts`, `satellite-level.ts`, `satellite-bench.ts`, `review-panel.ts`, Build CSS
- **ตรวจรับ:** preview อยู่กับแบบที่ตรวจ; targeted edit เข้า field ถูก; changing design invalidates stale checked revision; mouse/keyboard/touch และสามภาษาไม่ล้น

#### R3.5 — Journey integration: เริ่มง่าย ไปต่อ และย้อนแก้ได้

- Home “ลองปล่อยครั้งแรก” เปิด editable template พร้อมบอกสิ่งที่จะนำมาใช้; ไม่ทับ mission/draft เดิมแค่เพราะเปิด route
- compact mission context แสดงยาน/เป้าหมาย/source/revision และขั้น Build→Check→Launch→Result→Orbit→Docking ที่รองรับ
- Watch→สร้างสำเนาทดลองได้ โดย demo เดิมไม่ถูกแก้; Satellite Engineer save/open/send-to-Orbit ผ่าน shared workspace โดยตรง
- result→typed edit เปิด frozen inputs หรือเปรียบเทียบ current draft; suggested changes แสดง before/after และ apply โดยตั้งใจ
- รักษา lesson locks, return position และผลเที่ยวเก่า; “วางวงโคจรโดยตรง” กับ “ต่อจากเที่ยวบิน” ใช้ label ที่ต่างความหมายชัดเจน
- **เจ้าของ I หลัง R3.1; result action mapping ทำเป็น pure module; `main.ts`/routes/home/navigation ให้ I คนเดียว**
- **ตรวจรับ:** custom rocket+satellite ส่งไปบินตรง specs/mass/site/epoch/dynamics;ผลย้อนแก้ไม่แก้ recorded flight; draft เดิมปลอดภัย; ส่ง Orbit ที่ cursor ตรงและ fuel ไม่คืนเต็ม

**ทำขนานได้:** B-R rocket preview, B-S satellite preview และ typed action mapping หลัง R3.1 contract; งานอ่านแหล่งฟิสิกส์ R4 ทำพร้อมได้\
**ต้องรวม:** B รวม Build UI เท่านั้น; I รวม cross-mode shell; S เป็นเจ้าของ envelope/schema ที่เกี่ยวกับ Docking/astronaut ด้วย\
**Gate G3:** ผู้ใช้ทำ Build→Check→Launch→Result→Edit→Orbit ได้โดยรู้ว่ากำลังใช้แบบหรือเที่ยวบินใด; ภาพกับตัวเลขไม่ขัดกัน

### R4 — ปรับจรวดและฐานแบบจำลองให้สมจริงตามหลักฐาน

**ผลที่ต้องได้:** ใช้วิธี Soyuz ตรวจทุก family โดยรักษาข้อมูลอิสระ ไม่ปรับเพียงให้ดูสวยหรือได้เวลาเป้าหมาย

#### R4.1 — Catalogue และ source ledger ที่ไม่ตกหล่น

- reconcile 25 catalogue IDs ในฐานปัจจุบัน; แยก generic/historical/mission-specific IDs ของ R-7/Vostok/Saturn ไม่ลบ ID ที่ไฟล์เก่าอ้างโดยพลการ
- ทุก family มี evidence tier, supported variants, launch site/epoch/target และสถานะ: verified in scope / modelled with estimates / known miss / data insufficient
- ตรวจ audit 1 ตุลาคมรายข้อกับ source ปัจจุบัน; proposal ที่ยังไม่ applied ต้องไม่รายงานว่าแก้แล้ว
- **เจ้าของ P-D (data/evidence); source review ของต่าง family ทำขนาน แต่ writer ของ `data/parts.ts`/`data/vehicles.ts` มีคนเดียว**
- **ตรวจรับ:** ทุก ID มี owner/coverage/reference policy; alias/variant มีเหตุผล และ historical imports ยังคงความหมาย

#### R4.2 — Pipeline ราย family: data → propulsion → events → frames → guidance

- ปิด mass budget จาก published gross/usable/dry/residual/payload section ก่อนปรับเส้นทาง
- ตรวจ thrust/flow/Isp/vacuum/sea-level/throttle/startup/tail-off และ cutoff mechanism ว่า commanded หรือ depletion
- U16: ตรวจ Max-Q, throttle authority/minimum, booster/core schedules, acceleration/load relief ตามฮาร์ดแวร์และ variant; แยก programmed step จาก q-dependent throttle และแก้คำอธิบายที่เหมารวมว่าทุกจรวดต้องผ่อนเครื่องแบบเดียวกัน ดูข้อ 8.6
- event sequence: ignition/hot staging/separation/fairing/interstage และ payload-specific profile จาก source ที่เข้ากับ variant
- frame/datum/epoch/units ของ altitude/speed/pitch/roll ต้องประกาศก่อนเทียบ
- guidance structure ตามแหล่งข้อมูล; fit ได้เมื่อมี independent targets/checks พอ ไม่ยืม programme หรือ scalar ของ Soyuz ให้ยานที่ฮาร์ดแวร์ต่างกัน
- จรวดที่ไม่มีข้อมูล trajectory เพียงพอใช้ generic model ที่ระบุ พร้อมช่วง uncertainty ไม่เพิ่ม animation ที่แสดงว่าสมจริงโดยไม่มี source
- **เจ้าของ P-D/P; shared runtime change ให้ P คนเดียว; family review แยกได้ตามข้อ 8**
- **ตรวจรับ:** source ledger, held-out checks, before/after ทั้ง point mass/six-DOF, wind/payload/site bounds และทุก moved golden มีเหตุผลที่ตรวจได้

#### R4.3 — Shared attitude/upper-stage/control และ known misses

- Fregat: ตรวจ scheduled acceleration vs `allocateRcs`, gain scheduling, acceleration/rate-limited pre-orientation, overshoot/settling และ gas cost ตาม actuator จริง
- รักษา #64 in-band/out-of-band branch rule; มี neighbouring cases และ Monte Carlo band เดิมก่อน broader change
- ตรวจ J2 physical apsides vs osculating, burn order/finite burns, depletion/attitude fuel context และ weak-stage feasibility
- ตรวจ shared load-relief/guidance กับ actual engine clamps และ manual override ให้รักษาข้อจำกัด actuator; การแก้ common throttle logic ต้องประเมินทุก family ที่ใช้ร่วม รวม solid motors ซึ่งสั่งผ่อนเครื่องระหว่างเผาไหม้แบบเครื่องยนต์ของเหลวไม่ได้
- reproduce Vega-C payload rating miss, sizing/fairing target miss และ satellite budget observations บน clean current source
- แยก “แบบมีสมรรถนะไม่พอ” จาก “solver/assumptions/model ไม่ถูก”; ไม่เพิ่ม arbitrary Δv margin เพื่อซ่อน fairing/sizing issue
- satellite mass/area/power/propulsion/link/lifetime และ preview geometry ใช้ model contract เดียวเมื่อมี physical changes
- **เจ้าของ P; design core owners ร่วมเฉพาะโมดูลที่ได้รับผล; common planner changes serialized**
- **ตรวจรับ:** controls ไม่ใช้แรงเกิน actuator, fuel ไม่หมดเพราะการควบคุมที่เกินจำเป็นตามขอบเขตอ้างอิง, no unexplained branch regressions; reference miss ที่เหลือระบุ ไม่ล้างด้วย tolerance ใหม่

#### R4.4 — Fleet acceptance และ quality labels

- 3 ชั้น: physical invariants/numerical convergence, affected mission/held-out reference, broad regression/fleet/Monte Carlo
- flight realism ครอบคลุม attitude/rates/path/maxQ/α/qα/events/insertion/fuel/debris/recovery ตามภารกิจ ไม่วัดแค่ orbit reached
- source evidence ต้อง stable ก่อน/หลัง run; runtime/lock/config/snapshots ระบุ; exact coverage union ไม่มี skipped cases ที่ไม่แจ้ง
- update docs/reference report กับ build label ตามจริง; ส่งมอบเป็น wave ได้ ไม่ต้องรอ family ที่ยังหา source ไม่ได้เพื่อปล่อย UI
- **เจ้าของ P/Q/T; report aggregate คนเดียว; human/technical reviewer แยกจากผู้ fit**
- **ตรวจรับ:** accepted scope มีหลักฐานครบ; no hidden golden/tolerance updates; known misses มี named case/owner และไม่ถูกนับเป็น passed scientific acceptance

**ทำขนานได้:** source research/ledger/report ของ family ที่ไม่แชร์ฮาร์ดแวร์, held-out reference preparation และ render audits\
**ต้องรวม:** engines/stage data ที่แชร์, runtime/control/planner, golden re-recording และ report aggregate; wave ใหม่เริ่มบน integrated source ที่ตรึงแล้ว\
**Gate G4:** spacecraft/vehicle ที่จะใช้ใน ISS/astronaut ผ่าน scope ที่จำเป็น; family ที่เหลือเดินต่อเป็น waves พร้อม label ไม่กีดกันทุก release

### R5 — ภารกิจ ISS ต่อเนื่องจนเชื่อมต่อ พร้อมฟิสิกส์ contact ที่น่าเชื่อถือ

**ผลที่ต้องได้:** ผู้ใช้เริ่มจาก mission ที่รองรับ แล้วดูหรือควบคุม ascent→rendezvous→approach→contact→hard dock ได้ ไม่จบแค่ “ถึงระนาบวงโคจร ISS”

#### R5.1 — ทำภารกิจเดิมให้เข้าถึงและต่อเนื่องชัดเจน

- inventory trigger/config ของ Soyuz MS rendezvous profile กับ Watch/Explore/Engineer และ lessons; ตรวจว่า mission “ISS plane” ใดไม่ได้หมายถึง rendezvous
- selection บอกยานที่รองรับ profile/port, estimated duration และ phase; time warp/skip-to-event ใช้ physical state ของการจำลอง ไม่ teleport ไป dock
- แสดง milestone และ separate verdict: orbit insertion, rendezvous, capture, hooks/hard dock; ไม่ใช้ orbit success แทน docking success
- scene/camera/telemetry/live controls เปลี่ยนตาม lifecycle โดยรักษา recorder และ craft state
- **เจ้าของ I/P บน R3.1; U/C รับ docking preset/camera hook ผ่าน APIs**
- **ตรวจรับ:** supported mission launch จน `docked`; aborted/retreat/fuel failure มีผลจริง; unsupported payload/port แจ้งก่อนเริ่ม; replay ทุก phase ตรง recorded state

#### R5.2 — Target orbit/phasing จาก reference ไปสู่ ephemeris

- คง deterministic reference mission เดิมสำหรับบทเรียน/verification พร้อม label
- เพิ่ม fixed-epoch reference ISS state ที่มี provenance ก่อนทำ live snapshot; initial geometry/phase ไม่ถูกจัดใหม่ย้อนหลังเพียงให้แผน dock ได้
- solve launch window/phasing/finite transfer/braking จาก achieved insertion และ target ephemeris; จัด feasibility/fuel/time horizon/uncertainty
- live snapshot หากเลือกใช้ต้องบอก age/frame/model; SGP4 target กับ numerical chaser ต้องมีข้อกำหนด consistency และ error ไม่ใช้เปรียบเทียบอย่างไร้ datum
- SGP4/TLE ให้สถานะใน TEME ซึ่งไม่ใช่ ECI frame ของ Launch โดยตรง; แปลง frame/time scale/Earth orientation และ km→m ตามสัญญาที่ตรวจแล้วก่อนใช้ร่วมกัน
- **เจ้าของ P; targeting/station/profile/planner shared files เป็น workstream เดียว**
- **ตรวจรับ:** เปลี่ยน phase/insertion แล้วแผนเปลี่ยนตามฟิสิกส์; outside-window mission ไม่แสร้งสำเร็จ; independent mission/reference cases มี epoch/frame/tolerances ตรึงก่อน

#### R5.3 — Approach, fuel, sensing และ contact dynamics

- ใช้ R1.4 fuel limit ต่อถึง RCS/TORU; spacecraft inertia/CG/thruster layout และ sensor/latency/error ระบุ source หรือ estimate
- capture ตรวจ tip position/velocity/rates/attitude และ timestep/contact root ไม่ทะลุ port ระหว่าง step
- เพิ่ม station free drift และ two-body momentum/impulse/constraint response แบบ bounded model; stiffness/damping/restitution ที่ไม่มีข้อมูลเปิดต้องระบุ estimate/sensitivity
- หลัง hard dock ต้องมี combined-body mass/CG/inertia และ constraints ที่ชัดเจน; stationkeeping forces/torques ภายนอกแยกจาก contact impulse ไม่ใช่เปลี่ยน pose โดยไม่มีบัญชี momentum
- collision/keep-out/failed capture/retreat/abort ไม่มี warp bypass; ต่อ soft capture→hooks→hard dock ตามเหตุ ไม่เพียงจับ pose ทันทีแล้วนับเวลา
- **เจ้าของ P + render geometry adapter ผ่าน S; ไม่ทำ cinematic animation แยกจาก physical contact**
- **ตรวจรับ:** zero fuel fail ตามจริง; collision ไม่ docking success; momentum/energy response ใน isolated contact case สอดคล้อง tolerance; contact limits เดิมและ failure cases ตรวจครบ

#### R5.4 — ภาพยาน/สถานี/port และการขยาย spacecraft

- port geometry/body axes/TV alignment/lighting/occlusion ต้องสอดคล้อง physical model; viewer/manual camera ใช้ CameraPolicy เดียว
- ship model + telemetry แสดง relative distance/velocity/alignment/fuel/contact state จาก frame เดียว
- Soyuz crew onboard manual control กับ Progress TORU ไม่ใช่ operator เดียวกัน ต้องใช้คำและ control model ตรงยานจริง; ระบบเดิมที่ใช้ TORU กับ crew ต้องทบทวน source/semantics
- Progress/Dragon เพิ่มตาม D02 โดยมี propulsion/navigation/docking mechanism/port compatibility ของตนเอง ไม่ใช้ค่าหรือ probe ของ Soyuz ตรง ๆ
- **เจ้าของ render P-R/B และ P; I รวม UI; spacecraft expansion เริ่มหลัง first validated mission**
- **ตรวจรับ:** ภาพ probe/port ตรง contact geometry; replayภาพไม่ล้ำเวลาฟิสิกส์; manual/autopilot transfer journal/re-fly ได้; family ใหม่ผ่าน reference/failure scope ของตน

**ทำขนานได้:** station/ship geometry และ source research ระหว่าง P พัฒนา pure targeting; UI ใช้ frozen frame fixtures\
**ต้องรวม:** target propagation/finite burns/approach/contact/ship state มี P คนเดียว; physics integration เสร็จก่อน broad docking run\
**Gate G5:** first spacecraft ภารกิจครบจน hard dock ผ่านอ้างอิงและ failure tests; limitation labels กับ control role ตรงจริง

### R6 — โหมดนักบินอวกาศจากสถานะจริง

**ผลที่ต้องได้:** ประสบการณ์เหมือนควบคุมยานจากที่นั่งนักบิน โดยสิ่งที่เห็น/ได้ยิน/กดสัมพันธ์กับระบบที่จำลอง

#### R6.1 — ขอบเขตยาน ห้องนักบิน และระบบที่ต้องมี

- ยืนยัน D03/D09; proposal แรกคือ cockpit ของ first validated spacecraft จาก R5
- กำหนด seat/camera geometry, instruments, translational/attitude controls, automatic/manual modes, procedures และระดับ subsystem fidelity
- reuse manual six-DOF/crew abort/control interfaces ที่มีจริง; ไม่เรียก TORU ทุกยานว่า cockpit control
- ถ้าต้องเพิ่ม power/propulsion valves/navigation modes/sensor state ให้ทำใน domain physics/system package ก่อนผูกสวิตช์
- **เจ้าของ P/S สำหรับระบบ และ A สำหรับ cockpit/view modules; I รับ route/mode integration**
- **ตรวจรับ:** specification ระบุว่าสวิตช์แต่ละตัวเปลี่ยน physical/system state อะไร ไม่เป็นปุ่มตกแต่ง; cockpit มี source/assumption ledger

#### R6.2 — มุมมอง เครื่องมือ เสียง และการรับรู้แรง

- viewport ห้องนักบินอ่าน frame เดียวกับ exterior/telemetry; instruments/unit/frame/notation ตรงกับยานและไม่ใช้ future live data ใน replay
- effects ของ vibration/rotation/acceleration ใช้ simulated state/proper acceleration ตามกรอบที่ระบุ; แยก camera comfort option จากค่าฟิสิกส์
- เสียงเครื่องยนต์/valves/alarms/radio มี trigger จาก event/system และควร mute/captions/ระดับเสียงได้
- manual controls/autopilot handover/dead zones/rate limits เป็นจริงตาม actuator; keyboard/mouse เป็น baseline, gamepad/VR เป็น separate scope ถ้าอนุมัติ
- **เจ้าของ A/render; P เป็นเจ้าของ dynamics; camera policy ผ่าน C และ shell ผ่าน I**
- **ตรวจรับ:** cockpit/exterior/recorded telemetry ตรงเวลา; สั่งแล้วถูก actuator limits และ fuel; pause/warp/replay ไม่เพิ่ม forces; accessibility/comfort controls ใช้ได้

#### R6.3 — ภารกิจนักบินและการขยายต่อ

- flight training: instrument familiarization, attitude/translation control, rendezvous manual approach, retreat และ docking จากภารกิจที่ validated
- checklist/feedback อ้าง recorded state และขอบเขตความสามารถ ไม่ให้คะแนนจาก animation completion
- ทดสอบใช้งานจริงเพื่อดูความเข้าใจและ motion comfort; แยก human feedback จาก physics reference
- เดินในยาน/EVA เป็น phase extension หลัง cockpit หาก D03 เลือกให้เป็นระยะแรก ต้องเขียนใหม่สำหรับ body/suit collision, constraints, RCS/oxygen/thermal และ frame transitions พร้อม acceptance ไม่แอบรวมใน cockpit scope
- **เจ้าของ A/Q/learning L ผ่าน contracts; no direct edits shared progress จาก cockpit agent**
- **ตรวจรับ:** จบ first manual mission ได้ด้วย actual controls และ re-fly command journal; ระบบไม่ช่วยแอบจนแสดง false success; learning record เข้าสู่ profile ที่ถูกต้อง

**ทำขนานได้:** cockpit geometry/assets, instrument widgets, sound event mapping และ scenario instructions บน frozen contracts\
**ต้องรวม:** spacecraft systems และ dynamics ผ่าน P; input/camera/route ผ่าน I/C; scoring/profile ผ่าน L\
**Gate G6:** cockpit mission scope ตรวจฟิสิกส์/controls/UX แล้ว และคุณภาพประสบการณ์วัดจากผู้ใช้จริงก่อนขยายอุปกรณ์หรือ EVA

### R7 — ตรวจรวม เผยแพร่ และจัดระบบดูแลต่อเนื่อง

#### R7.1 — ตรวจ journey ข้ามระบบบน release candidate เดียว

- learner migration/reset/export→Build→Launch→result→Orbit→Docking→cockpit ตาม scope ที่ส่งมอบ
- สถานะ old/new builds, offline service worker, import recovery, profile switching, async callbacks และ malformed files
- ตรวจ geometry/layout/wheel/keyboard ในทุกระดับและสามภาษา พร้อม readonly/snapshot provenance
- full relevant unit/browser/heavy/fleet/reference gates ตาม change map และ coverage manifest; ไม่รวมผลคนละ source แล้วเรียกทั้งชุดว่าผ่าน
- **เจ้าของ Q/T; feature owners triage เป็น defect domain ไม่แก้ทับกัน**
- **ตรวจรับ:** blockers เป็นศูนย์ใน supported scope; known limitations มี named cases; evidence execution/reference/human แยกชัด

#### R7.2 — PR/merge/release และ retrospective

- PR เล็กตาม unit ownership/dependencies พร้อม before/after, exact CI และ scientific effect; queue integration changes บน base ปัจจุบัน
- freeze source ก่อน long acceptance; เปลี่ยน source/base/model ที่กระทบหลักฐานแล้วต้อง rerun เฉพาะ affected evidence ไม่ใช้ผลเก่าข้ามอย่างเงียบ
- final release artifact เป็นสิ่งที่ full browser ตรวจจริงพร้อม refreshed snapshot hashes; deploy หลัง gates และ main-tip guard
- ยืนยัน deployed SHA จาก deployment record แยก merged SHA; UI About/build info ช่วยผู้ใช้ตรวจรุ่นและ service worker activation
- migration rollback แยกจาก code rollback; schema ใหม่ที่ app เก่าอ่านไม่ได้ต้องมี export/recovery/read-only compatibility ไม่แก้ด้วย deploy source เก่าอย่างเดียว
- retrospective เทียบ failure categories, queue/run durations, repeated checks และ escaped defects เพื่อแก้ change map ไม่ลด gates แค่เพื่อทำตัวเลขเวลาให้สวย
- **เจ้าของ I/T/L/P ตาม rollback responsibility**
- **ตรวจรับ:** release evidence link ครบ, app/version/storage state สอดคล้อง, ไม่รายงาน “เผยแพร่แล้ว” เมื่อมีเพียง merge และวิธีคืนสภาพผ่านกรณีที่รองรับ

**Gate G7:** ส่งมอบพร้อมหลักฐาน source/build/deploy และรายการ scope/limitations ที่คนใช้เข้าใจได้

## 6. การแบ่งเจ้าของงานและป้องกันงานทับซ้อน

เจ้าของหมายถึงผู้ที่มีสิทธิ์เขียนส่วนร่วมในรอบงานนั้น คนอื่นเสนอ interface/patch หรือพัฒนาโมดูลแยกได้ แต่ไม่แก้ไฟล์ hotspot พร้อมกัน

| เจ้าของ | ส่วนที่รับผิดชอบ | ส่วนที่ต้องเข้าคิว |
|---|---|---|
| I — application integration | `main.ts`, `index.html`, app routes, shared shell/global CSS และจุดต่อ modules | learner injection, layout, cameras, Build/Orbit links, ISS/cockpit routes |
| U — workspace UI | layout/lifecycle/cards/HUD/telemetry UI และ scoped styles | setup hide, notation placement, mobile controls, layout customization เป็น workstream เดียว |
| C — camera/gesture | `render/cameras.ts`, Orbit gesture boundary, CameraPolicy | wheel fix มาก่อน Watch manual; phase/follow/drag semantics รวมกัน |
| V — timeline | event chooser, event identity/seek/focus ใน `ui/timeline.ts` | shell/keyboard integration ผ่าน I/U; ไม่แก้ recorderหรือclock contractเอง |
| L — profile/workspace storage | progress/designs/mission/notebook/drafts/repository/reset/migration/archive/recovery | profilesทั้งแอป, backup version และ async jobsทุกdomainเป็น ownershipงานข้อมูลเดียว |
| S — domain contracts | mission/handoff/state schemas, validators และ provenance | profile archive contract, Docking/cockpit state compatibility ร่วมเจ้าของ domain |
| B — Build integration | Build shell/Engineer/Satellite UI/Build CSS | rocket/satellite preview และ readiness-to-edit รวมผ่าน B |
| B-R / B-S | pure rocket/satellite preview modules | ไม่แก้ Build shell/global styles/physics core เอง |
| P — shared physics | simulation, burns, rigid runtime/control, rendezvous/contact | fuel/step/pointing/planner changes serialized และตรวจทุก affected family |
| P-D — shared vehicle data | engines/parts/vehicles/source ledger writer | family research ทำขนาน แต่ shared file edits รวมโดยคนเดียว |
| T — workflow infrastructure | YAML, audit manifests, test discovery/runner/aggregation | CI speed changes, trigger policy และ coverage rules อยู่ stream เดียว |
| Q — verification | reproducer specs, independent references, evidence/review | ไม่แก้ source ขณะเก็บ baseline; defect ส่งกลับ domain owner |
| A — astronaut presentation | cockpit/instruments/audio/scenarios | systems→P; learner scores→L; cameras/routes→C/I |

กติกางานร่วม:

1. แต่ละ task ระบุ owner, allowed files, dependencies, source/base SHA และ expected output ก่อนเริ่ม
2. งานที่แชร์ `main.ts`, global CSS, schemas หรือ physics runtime ต้องรวม integration batch หรือจัดคิว ห้ามเชื่อว่าคนละ feature แปลว่าไม่ชนไฟล์
3. i18n ใช้ feature modules แล้วให้เจ้าของ composition รวม EN/TH/RU ครั้งเดียว; browser runner และ shared manifest ให้ T รวม
4. shared physics contract ลงก่อน dependent rendering/UI; schema/archive migration ลงก่อน profile integration
5. ห้าม agent ใด re-record golden, loosen tolerance, bump budgets หรือ drop tests ของ domain อื่นเอง ต้องมี reason/effect/evidence review
6. tests ของ feature เขียนในไฟล์เฉพาะได้ แต่ config/discovery/shared fixture format ผ่าน T/S
7. integration candidate ตรึงก่อน long heavy run; changes ที่กระทบ evidence ทำให้รายงานเดิมเป็น historical ไม่ใช่ exact-source current proof

## 7. เส้นทางงานที่ต้องรอกันและแผนทำขนาน

| Wave | งานที่ทำพร้อมกันได้ | งานรวม/จุดรอ |
|---|---|---|
| W0 | UI/scroll baseline, learner inventory, physics source research, workflow audit | G0: product/schema/acceptance/ownership freeze |
| W1 | L all-work profiles/storage adapters, C gesture, P fuel invariants, T CI infrastructure | learner/workspace UIรอrepository; Iรวมswitch/injection/hooks; Build preview rewriteรอstorage seams; G1 |
| W2 | U layout module, C CameraPolicy, V timeline chooser, continued vehicle source research | I รวม shell + lifecycle + notation + camera; custom layout รอ default; G2 |
| W3 | B-R rocket preview, B-S satellite preview, pure readiness/result actions | S handoff contract มาก่อน; B รวม Build; I รวม journey; G3 |
| W4 | per-family source/held-out checks/render comparisons ของคนละ hardware family | P-D รวม data; P shared dynamics ครั้งละหนึ่ง change; broad acceptance บน stable source; G4 |
| W5 | ISS ship/station visuals, pure target solver tests, docking UI fixture work | P รวม targeting/approach/contact; I/C/U รวม presentation หลัง frame contract; G5 |
| W6 | cockpit/assets/instrument/audio/scenarios | systems/actuation ผ่าน P; profile/learning ผ่าน L; I รวม; G6 |
| W7 | domain review/translation/browser/physics evidence บน source เดียว | release aggregate แล้ว deploy; G7 |

เส้นทาง profile priority: `R0.2 → R1.1 → R1.2 → G1` รวมข้อมูลส่วนบุคคลทุกworkspaceตาม D04 ไม่ต้องรอ fleet realismทั้งหมด

เส้นทาง UI: `R0 → R1.3 → R2.1/R2.2 → R2.3 → G2` และ `R2.4` พัฒนาแยกโมดูลได้

เส้นทาง linked design: `R0.2 + R1.4 → R3.1 → R3.2/R3.3 → R3.4/R3.5 → G3`

เส้นทางความสมจริงสำหรับนักบิน: `R0 physics contract → R1.4 → R4 (ยานที่เลือก) → R5.2/R5.3 → R6 → G7`

R4 source research เริ่ม W0 และ family waves เดินขนาน UI ได้ แต่ shared runtime/code integration ของ P ไม่ทำพร้อมกับ docking dynamics อีก branch งานที่ยังไม่มีข้อมูลอ้างอิงไม่ถูกบังคับ fit ให้เสร็จตาม wave

## 8. มาตรฐานฟิสิกส์และแผนตรวจจรวดทั้งกลุ่ม

### 8.1 วิธีจาก Soyuz ที่ต้องใช้ซ้ำ

1. Mass closure: payload section, dry/usable/residual, pressurant/propellant และ prelaunch burn แยกให้ถูก
2. Propulsion: thrust/flow/Isp และ throttle/startup/tail-off ก่อน fitting trajectory
3. Events: commanded/depletion cutoff, hot/cold staging, delays และ jettison ตาม mission variant
4. Frames: ECI/ECEF/body/local horizon, datum/epoch และ speed definition ก่อนเทียบกราฟ
5. Guidance structure: programme/generic turn/closed loop ตาม source
6. Fitting: จำนวน parameters จำกัดตามข้อมูล, targets แยกจาก held-out checks, flyability bounds ไม่ถูกฝืน
7. Validation: independent state points, event/attitude/path/load/fuel ทั้ง two flight models และ disturbances
8. Record: ledger, before/after, changed fingerprints/goldens, source-stability และ named disagreements

กรณี #64 สอนว่าการแก้หนึ่งภารกิจอาจทำ neighbouring branch แย่ลง: rule แรกทำ perigee 3σ 9.1 km เกินกรอบ 8 km จึงต้องแยก apex inside/outside judged band ไม่ใช้ “ถึงวงโคจรแล้ว” เป็นเกณฑ์เดียว

### 8.2 กลุ่มยานและลำดับความลึก

ตารางนี้เป็นลำดับเสนอจากหลักฐานใน repository ไม่ใช่การรับรอง source ใหม่ในรอบนี้ tier ต้องตรวจอีกครั้งเมื่อเริ่ม R4

| กลุ่ม | จุดเริ่มตรวจและเป้าหมาย | ข้อจำกัด/จุดร่วม |
|---|---|---|
| Soyuz-2.1a / 2.1b / Fregat | รักษา programme/hot staging/profile ที่แก้แล้ว; crew/cargo/SSO, RCS coast efficiency และ held-out path | shared R-7 hardware; 2.1b transfer ไม่ได้แปลว่าทุก mission ใช้ 2.1a programme ได้อย่างไม่มีขอบเขต |
| Saturn V / AS-506 | ตรวจ generic vs mission-specific IDs, published loads/tilt/event/insertion/TLI ตาม scope | correction AS-506 มีแล้ว ต้องไม่เสนอว่าเริ่มจากศูนย์; input programme แยกจาก fit |
| Falcon 9 / Falcon Heavy | data/throttle/maxQ/accel/reserve/recovery/programme และ variant-specific loads | Falcon 9 มี trace มากกว่า; Falcon Heavy ไม่ได้มี independent trajectory evidence เท่ากัน |
| Vega-C / Electron | rating miss และ stage load/engine/motor/event consistency ก่อน guidance | Vega-C 4,330 vs 3,300 kg จาก report เดิม; Electron audit stage-load proposals ต้องตรวจ source/variant ก่อนใช้ |
| Atlas V / H-IIA / Proton / Angara | data, cutoff, boosters, fairing, upper-stage burns และ uncertainty | evidence times-only หลายกรณีไม่พอให้ fit trajectory; shared boosters/Briz files รวม owner |
| Ariane 64 / H3 / PSLV | source data/events ก่อน; หา second-flight/independent trajectory data สำหรับเพิ่ม tier | audit มี proposals ที่ยังไม่ applied; ห้ามถือว่า engine/load/event timeline ของคนละ flight เหมือนกัน |
| Long March 2D/3B/5 / Vulcan / Starship | ปิด basic data/mechanisms และ published bounds; labelled generic guidance เมื่อ data insufficient | model configuration/รุ่น/mission เปลี่ยนเร็ว; ห้ามทำภาพ path ที่อ้างเป็นการบินจริงโดยไม่มีข้อมูล |
| R-7 historical / Vostok / Mercury | reconcile duplicate-family IDs, historical engines/events/abort/reentry และ source scope | historical mission-specific physics มีแล้วบางส่วน; ไม่ลบ legacy ID หรืออ้างทุก profile ว่า validated |

### 8.3 เกณฑ์ทางฟิสิกส์ข้ามโมเดล

- Fuel/actuation: mass/fuel ไม่ติดลบ, zero fuel ไม่มีแรงขับ, actuator saturation/lag/geometry สอดคล้องกับ impulse และ consumption
- Dynamics: gravity/drag/non-grav acceleration/frame transformations, angular momentum/quaternion normalization, mass/CG/inertia transitions ตามระบบที่รองรับ
- Numerics: timestep convergence, stable coast and event roots, contact/capture ไม่ข้าม gate จาก coarse time warp, invariants ตรวจในกรณีที่ไม่มี external force/torque ตามสมมติฐาน
- Guidance: command/actual attitude/rates, q/α/qα/mach table bounds, thrust pointing, fuel-aware coast และ feasible finite burns
- Lifecycle/state: onboard/exterior/telemetry/replay/worker ใช้ state เดียวและ command journal ตรง step boundary
- Reference acceptance: fix source configuration/datum/tolerance ก่อน fitting; source ขาดหรือขัดกันเป็น “inconclusive/data insufficient” ไม่ใช่ pass
- Rendering fidelity: orientation/scales/staging/port contact/ground datum ตรง physical state; camera motion ไม่ใช้ปลอมท่าทางยาน
- Satellite systems: geometry/power/ADCS/link/thermal/lifetime models ใช้ inputs/provenanceเดียว; subsystem illustration ไม่เป็น calculation engine อีกตัว

ค่าตัวเลข tolerance ใหม่ต้องออกจาก source uncertainty + numerical error study ใน R0/R4 ไม่ตั้งเปอร์เซ็นต์เดียวใช้กับทุกจรวดหรือทุกผลลัพธ์

### 8.4 Dossier รายยาน: จุดตรวจแรกและแหล่งใน repository

รายชื่อทั้งหมดใช้ ID เพื่อให้ AI ไม่พลาด variant ที่ชื่อคล้ายกัน แหล่งที่ระบุเป็นแหล่งที่เอกสาร/โค้ดเดิมอ้าง ต้องเปิดตรวจ version/page/configuration อีกครั้งก่อนนำตัวเลขมาแก้ ไม่อ้างว่าได้อ่าน external publication ใหม่ในการจัดแผนนี้

| ID | จุดตรวจและหลักฐานที่ต้องใช้ | งานร่วมที่ต้องระวัง |
|---|---|---|
| `soyuz21a` | MS-25/Progress MS-19 cyclograms, crew/cargo load/programme/hot staging, insertion/drop zones และ flown height/speed | R-7 shared stages, fairing/escape/recorder |
| `soyuz21b` | Arianespace CSG acceleration/profile เป็น transfer check; Plesetsk 4 t SSO; J2 apsides/RCS margin | Fregat planner/pointing; programme จาก shared hardware มีขอบเขต |
| `falcon9` | webcast traces; fit set CRS-16/Iridium-8/GPS-III แยก holdouts SSO-A/Bangabandhu; throttle/maxQ/reserve/recovery | Merlin/MVac/shared Falcon data |
| `falconheavy` | Arabsat-6A timeline และ Falcon guide ที่ระบุรุ่น; ไม่สร้าง throttle schedule ที่ไม่มี source | Falcon 9/Heavy และ booster recovery |
| `atlasv551` | Juno กับ GEM-63-era flight; แยก AJ-60A/GEM-63 และ RL10 variants ก่อนเทียบ | shared boosters/engines; audit proposals ต้องตรวจ variant |
| `vulcan` | ULA stage/engine/GEM-63XL evidence; generic guidance จนมี independent flight trace | Centaur/RL10/solid parts |
| `ariane64` | VA267/VA268 launch kits เป็น planned timelines; core/Vulcain loads ก่อน guidance fit | P120C ที่แชร์ Vega-C |
| `vegac` | VV25/Avio/ESA motor curves และ rating miss; stage-event sequence/solid profile | P120C และ P80/P120 source roles |
| `protonm` | ILS/Telstar-14R, loads/thrust/Isp/vernier/hot-stage/cutoff | Briz-M ที่แชร์ Angara |
| `angaraa5` | Flight-2 timeline/manufacturer data, upper composite and cutoff | Briz-M ร่วม Proton; generic guidance label |
| `h2a202` | JAXA/MHI/F50; แยก SRB high-pressure/long-burn configurations | ไม่ใช้ F50 ตรวจ motor variant ที่ไม่ตรง |
| `h3` | JAXA F3/ALOS-4 state points และหา second flight ก่อน fit; pin flat trajectory finding | source uncertainty/LE-9/SRB configuration |
| `pslvxl` | ISRO C52 event/state table ระบุ inertial speeds; หา second flight; steep/slow first-stage finding | air-lit boosters/solid thrust curve |
| `electron` | Rocket Lab PUG/No Time Toulouse; resolve S2 published approximate load กับ burn ที่ยาว | ไม่แก้ด้วย unsourced throttle curve |
| `longmarch2d` | engine/mass/capability/flight architecture; generic guidance ที่ระบุ | direct-insertion exclusionsและcustom design paths |
| `longmarch3be` | variant-specific loads/events/fairing/site corridor | restartable upper-stage/shared engine changes |
| `longmarch5` | configuration-specific stage/engine/mission boundsก่อน profile claim | ไม่ยืม fitted programme จาก launcher อื่น |
| `starship` | ระบุ flight/hardware block/engine configuration ก่อนใช้ telemetry | changing prototypes ไม่เป็น timeless profile เดียว |
| `sputnik8k71ps` | generic fleet R-7 configuration/reference mission | เทียบกับ `r7sputnik` โดยไม่รวม IDs เงียบ |
| `r7sputnik` | historical Sputnik mission engines/events/orbit evidence | historical vs generic recordsและlegacy IDs |
| `vostok8k72k` | generic fleet configuration และ published orbit/mass | เทียบ `vostokk`; datum/engine versions |
| `vostokk` | FAI/TASS mission timing/orbit/descent; ambiguous speed frame ไม่ grade จน resolve | historical abort/reentry/crew recording |
| `saturnv` | generic configuration and selected payload/mission scope | ไม่ใช้ AS-506 input time เป็น independent prediction |
| `saturnv506` | AS-506 FER/postflight states/maxQ/later cutoff/orbit/tilt programme ที่มีแล้ว | shared F-1/J-2; fit role vs held-out checks |
| `mercuryredstone` | MR-3 trajectory/recovery/landingและfitted pitch-floor provenance | suborbital scope ไม่อ้าง orbital capability |

### 8.5 เกณฑ์ที่มีอยู่และเกณฑ์ใหม่ที่ต้องตรึง

เกณฑ์เดิมใน tests เป็น baseline ทางการศึกษา/การถดถอย ไม่ใช่ความแม่นยำของฮาร์ดแวร์ทุกภารกิจ:

| เกณฑ์เดิม | ค่าใน repository | ความหมาย |
|---|---|---|
| Published event time | `max(3 s, 10% × reference time)` | comparison กว้าง; timed command inputไม่ถือเป็น predicted time |
| Published speed | `10% × reference + 5 m/s` | ใช้เมื่อรู้ speed frame |
| Published altitude | `15% × reference + 1 km` | ใช้เมื่อรู้ datum |
| Fleet apsides | `max(10 km, 2% × target altitude)` | capability verification |
| Transfer perigee | `max(15 km, 5% × target)` | capability verification |
| Inclination / constrained RAAN | `0.3° / 1.5°` | RAAN ยังต้องตรวจในภารกิจที่บังคับ plane |
| Full-mission refinement | position <10 m, velocity <0.1 m/s, attitude <0.1°, event time <0.02 s | numerical agreement; กรอบ 10 m ไม่พอพิสูจน์ docking capture 0.34 m |
| Soyuz capture envelope | closing 0.1–0.35 m/s; lateral speed ≤0.1 m/s; offset ≤0.34 m; pitch/yaw ≤7°; roll ≤10°; rate ≤0.6°/s | repositoryอ้าง SoyCOM; ต้องตรวจ variant/sourceก่อนขยายยาน |
| Profile contact timing | two/four-orbit ±8 min; two-day ±20 min | consistencyกับprofile source; ไม่ใช่ all-port/all-ascent cross-product certification |

ข้อเสนอสำหรับ R5 numerical study: ใช้ target refinement ใกล้ contact ประมาณ 0.01 m / 0.001 m/s / 0.01° / 0.01 s และ conservation/error floors ที่คำนึง floating-point/frame scales ต้องยืนยัน feasibility และตรึงใน R0/R5 ก่อน implementation เป็น **proposed engineering criteria** ไม่ใช่ hardware accuracies หรือผลที่ทำได้แล้ว

แหล่ง baseline thresholds: `tests/validation/reference-data.ts`, `tests/fleet-harness.ts`, `tests/rigid-mission-convergence.test.ts`, `src/physics/rendezvous/profiles.ts` และ `tests/heavy/historical-docking.test.ts` จำนวน cases ที่ผ่านเดิมต้องอ่าน exact test inventory ไม่อ้างว่าครบทุก combination

### 8.6 Max-Q และความหมายของค่าแรงขับ: ข้อสังเกต Soyuz (U16)

**สิ่งที่ผู้ใช้รายงาน:** ใช้จรวด Soyuz และเห็นค่า 100% ตลอดเที่ยวบิน โดยคาดว่าจะผ่อนเครื่องใกล้ Max-Q ยังไม่ได้ระบุ Soyuz variant, โหมด, จุดที่เห็นตัวเลข หรือเวลา T+; การตรวจครั้งนี้อ่านโค้ดเท่านั้น ไม่ได้สร้าง trajectory หรือยืนยันว่าเที่ยวบินที่ผู้ใช้เห็นมี q/throttle เท่าใด

**หลักฟิสิกส์และขอบเขตการอ้าง:** Max-Q คือค่าสูงสุดของ dynamic pressure `q = ½ρv_air²` ระหว่างเที่ยวบิน ต้องใช้ความเร็วสัมพัทธ์อากาศ ไม่ใช่ความเร็ว inertial โดยตรง การจัดการโหลดขึ้นกับฮาร์ดแวร์ เส้นทางบิน การควบคุม และข้อจำกัดของแต่ละยาน บางยานมี throttle bucket ใกล้ Max-Q แต่ห้ามสรุปว่า Soyuz ทุก variant ต้องทำเหมือน Falcon 9 หรือว่าระดับคันเร่ง 100% แปลว่าแรงขับเป็น N คงที่ แรงขับยังขึ้นกับความดันบรรยากาศ เครื่องยนต์ที่กำลังทำงาน และโปรแกรมรายเครื่อง

**หลักฐานจากฐานปัจจุบัน:**

- `soyuz21a`/`soyuz21b` ไม่มี `maxQThrottle` bucket ที่ตั้งไว้แบบ Falcon 9; ยังใช้ shared load relief/acceleration limiting ใน guidance ซึ่งต้องตรวจความเหมาะสมกับฮาร์ดแวร์ ไม่ใช่ถือว่าถูกต้องเพราะมี limiter
- โมเดลบูสเตอร์ Soyuz-2 มี programme step เหลือ 81% ที่ T+112.0 s ตามการตีความ CSG acceleration trace ในเอกสาร repository; นี่เป็น event ตามเวลา แยกจาก throttle bucket ตาม q และไม่ใช่หลักฐานว่า Soyuz ทุกภารกิจใช้โปรแกรมนี้ ไม่มีการตรวจสิ่งพิมพ์ภายนอกซ้ำในรอบนี้
- `SimState.throttle` เป็นคำสั่ง guidance; `coreThrottle`/`boosterThrottle` เป็นระดับเครื่องยนต์หลัง clamp/programme/fuel constraints; `thrust` เป็นแรงขับรวมที่คำนวณได้ ปัจจุบัน HUD เต็ม/ย่อและ onboard แสดงเปอร์เซ็นต์จากคำสั่ง จึงอาจเห็น 100% แม้ระดับบูสเตอร์เปลี่ยน
- ช่องคันเร่งในแผง 6-DOF เป็น manual input เริ่มต้น 100% และปิดใช้งานเมื่อเลือก autopilot; ไม่ได้ตามค่า autopilot แบบสด ต้องออกแบบ label/visibility/readout ให้เข้าใจความหมาย
- CSV มาตรฐานมี `throttle` เป็นคำสั่ง และ `thrust_n` เป็นแรงขับจริง แต่ไม่มี actual core/booster แยกในคอลัมน์มาตรฐาน; ต้องกำหนดหน่วยและ schema ที่สอดคล้องกับ HUD, onboard, recorder และผลวิเคราะห์

**งานที่รวมในแพ็กเกจเดิม:** R2.1 รับผิดชอบ semantics/labels/readouts ของ UI; R4.2 รับผิดชอบหลักฐานและโปรแกรมราย variant; R4.3 รับผิดชอบ common guidance/actuation ผ่าน physics owner คนเดียว ไม่ตั้ง branch ฟิสิกส์ Max-Q อีกชุดที่แก้ไฟล์ร่วมพร้อมกัน การเปลี่ยน frame/recording/CSV schema ต้องผ่าน contract owner และ integration candidate เดียว

**เกณฑ์ตรวจรับที่ต้องตรึงก่อนพัฒนา:**

1. เก็บกรณีรายงานให้ครบ variant/mission/payload/site/model/autopilot หรือ manual และตำแหน่ง UI; บันทึก `t`, `q`, command, actual core/booster, thrust N และ propellant flow ในช่วงก่อน–ระหว่าง–หลัง Max-Q รวม programme steps/cutoff ทั้ง point-mass และ 6-DOF ที่รองรับ
2. แยก configured q threshold, measured peak q และ structural/load limit ไม่เรียกทั้งสามว่า Max-Q ตัวเดียวกัน ตรวจ limiter กับ source uncertainty, engine minimum/throttle authority, solid profiles, startup/tail-off และ pressure dependence; ไม่บังคับ bucket ให้ยานที่ฮาร์ดแวร์ไม่รองรับ
3. HUD/onboard/CSV/recording อ่าน accepted frame และ engine state เดียวกัน; replay แสดงค่าประวัติ ไม่อ่าน manual input หรือ live head มาทับ ดู programme step ของบูสเตอร์และกรณี core clamp แม้ command ยังเป็น 100% ได้โดยไม่เกิดความกำกวม
4. ตรวจ source-supported profile และ held-out trajectory/load checks หลังปรับ ภายใต้ payload/wind/site bounds ที่ประกาศ การลด q ต้องไม่แลกกับแรงขับ เชื้อเพลิง acceleration หรือ insertion ที่ผิดข้อจำกัด; shared changes ผ่านทุก affected family ไม่ขยับ tolerance เพื่อซ่อน known miss
5. รายงานแยก UI semantic issue, programme ที่มีอยู่, physics discrepancy ที่พิสูจน์ได้ และ evidence gap ค่า 100% ที่ผู้ใช้รายงานเพียงอย่างเดียวยังไม่พิสูจน์ว่าไม่มีการผ่อนเครื่องหรือว่าฟิสิกส์ถูกต้องตลอดเที่ยวบิน

หลักฐานโค้ดสำหรับ AI: `src/ui/hud.ts`, `src/ui/onboard.ts`, `src/ui/rigid-controls.ts`, `src/ui/csv.ts`, `src/i18n/th.ts`, `src/data/vehicles.ts`, `src/physics/guidance.ts`, `src/physics/simulation.ts`, `src/physics/vehicle.ts`, `src/physics/sim/types.ts`, `src/physics/frame.ts`, `docs/FLIGHT-PROFILE-METHOD.md` และ `tests/r7-sequence.test.ts` ที่ commit ฐานของเอกสาร

## 9. วิเคราะห์ workflow ที่ผ่านมาและการปรับวิธีทำงาน

### 9.1 หลักฐานที่ตรวจย้อนหลัง

ระยะเวลาระดับ run คือเวลาตั้งแต่สร้าง run ถึงผลสุดท้าย รวม scheduling/queue/overhead บางส่วน ระยะเวลา steps ที่ระบุแยกคือเวลาใน step นั้น ไม่ใช้แทนกัน

| เหตุการณ์ | หลักฐาน | บทเรียน |
|---|---|---|
| Soyuz #63 budget | CI `36884215504` build/budget failed; รอบ `36884357092` ผ่านประมาณ 16 นาที | เช็ก type/build/budget เร็วก่อน physics sweep แพง |
| #63 deploy failure | Pages `36886828921` ล้มเหลวหลัง 50:05; `npm test` 32:49, browser 16:01, worksheet click timeout | การพบ UI export failure ช้าทำให้เสียเวลาชุด physics ที่ผ่านแล้ว; bring affected export check earlier |
| Soyuz #64 | CI `36918069063` ผ่าน 12:42; history มี fleet rerun ก่อน/หลังรวม hot staging และ merge main เพิ่ม | สอง physics branches/shared base ทำให้ integration และ broad runs ซ้ำ; freeze integration candidate |
| Stage 2 | PR CI `37063706462` ผ่าน 10:45 แต่ scheduled Pages `37066834767` ล้มใน 21:43 ด้วย export timeout | PR pass ≠ live release; push/schedule same-source overlap ต้องจัดคิว |
| WebGL/browser | CI `37070737313` timeout action; `37073349169` `Target crashed` | failure annotation ต้องเจาะจง action; isolate browser เป็นมาตรการที่ทำแล้ว แต่ crash cause ยังไม่พิสูจน์ |
| Stage 3–4 รอบแรก | CI `37080233899` unit pass แต่ RU 320 px overflow และ waiting worker assertion fail | มีทั้ง product regression และ asynchronous test defect ต้องแยกประเภท |
| Stage 3–4 รอบสุดท้าย | CI `37081940631` ผ่าน 14:05; browser steps 11:39/11:06 | browser เป็น critical path PR หลัง sharding ที่ทำแล้ว |
| Release ปัจจุบัน | Pages `37084189532` ผ่าน 39:24; unit 20:08 แล้ว browser 17:45 แบบ serial | parallel independent gates เป็นโอกาสลดเวลาที่ชัดที่สุดโดยรักษา coverage |
| Heavy | run `36804343856` 46:55, Soyuz Monte Carlo 41:31; `36942933112` 60:45 | scientific sweeps ใช้เวลาจริง ต้องทำ short branch gates ก่อนและตรึง source ไม่ใช่เพิ่ม retries |
| Inventory drift | `tests/heavy` 33 files แต่ audit expected 27; normal workflow/audit coverage machinery แยกกัน | รวม discovery/manifest/aggregator และทำ drift guard ในทางใช้งานจริง |

### 9.2 งานปรับกระบวนการที่ต้องทำ

1. **Fast feedback ตามผลกระทบ:** toolbar/i18n→320 px ทุกภาษา; storage→migration/quota/stale; export→download journey; PWA→exact worker/cache; physics→branch + affected flights + wind/Monte Carlo
2. **หนึ่งหลักฐานหนึ่ง source:** บันทึก tree/config/runtime/snapshots/dist และ exact coverage; mixed-source results ไม่ aggregate เป็น all-pass
3. **Discovery ไม่ตกหล่น:** heavy/fleet/browser expected vs actual union; duplicates/missing/skipped/incomplete failures แสดงใน summary
4. **Release ขนาน:** unit shards กับ snapshot/build branch เริ่มขนาน; full browser shards ตรวจ refreshed artifact เดียว; aggregate แล้ว publish เท่านั้น
5. **Run coordination:** เก็บหนึ่ง publisher, ไม่ให้ same-SHA refresh ขัด release code, newer main supersede stale release; branch concurrency ที่มีแล้วไม่ต้องสร้างซ้ำ
6. **Failure evidence อ่านได้:** structured JSON + annotations/summary ทั้งสำเร็จและล้มเหลว เพราะ log/artifact download ผ่าน storage gateway เคยถูกปฏิเสธ; มี fallback metadata ไม่อ้างว่าดูภาพแล้วเมื่อโหลดไม่ได้
7. **Browser determinism:** await resolved installed/controller state, listeners ก่อน action, explicit readiness; no blind retry/timeout inflationเพื่อกลบ race
8. **Scientific gate ก่อน golden:** fix physical acceptance ก่อน code; update fingerprints พร้อมเหตุผลและ before/after; execution pass กับ scientific miss แสดงแยก
9. **ลดการทดสอบซ้ำอย่างมีเงื่อนไข:** reuse results ได้ต่อเมื่อพิสูจน์ identity ของ relevant source/tests/runtime; squash SHA ต่างกันและ snapshot refresh ทำให้ artifactต่าง จึงไม่ลบ main gates เพียงเพราะ PR ผ่าน
10. **ประเมินผล process:** median/p90 feedback time, release time, duplicate run minutes, escaped regressions และ stale/mixed evidence ต่อ 3–5 runs ที่เทียบกันได้; ยังไม่สัญญา % speedup ก่อนวัด

สิ่งที่ไม่ควรทำ: ลดจำนวน cases, ยืด timeout เป็นการแก้หลัก, rerun blind, ตัด heavy ของ shared physics, ตัด browser ของ migration/PWA, ผสมผล source เก่า/ใหม่ หรือเพิ่ม budget โดยไม่ระบุสาเหตุ

## 10. เกณฑ์ตรวจรับ การเผยแพร่ และการย้อนกลับ

### 10.1 Matrix การใช้งานที่ต้องครอบคลุม

- Desktop/laptop: 1024×700, 1280×800, 1366×768, 1920×1080; tablet: 768×1024; phone: 320×740 และ 390×844; browser zoom 125%/150% สำหรับ layout ที่เกี่ยวข้อง; เพิ่ม boundary checks รอบ breakpoint 860/861 และ 1180/1181 px เมื่อแก้ grid
- TH/EN/RU; Chromium automated gates และ Edge จริงบนเครื่องผู้ใช้สำหรับ camera/scroll/WebGL เมื่อมีอุปกรณ์; Safari/mobile browser เป็น coverage ตามอุปกรณ์ที่มีและรายงานตรงจริง
- Mouse wheel/trackpad, touch, keyboard; input/button/modal focus ไม่ส่ง keyboard ไปควบคุมกล้อง/timeline/flight โดยไม่ตั้งใจ
- Setup/live/paused/replay/completed/analysis; Build/Orbit/Lessons overlays; offline/denied storage/quota/stale tab/old waiting service worker

เป้าหมาย layout เสนอ: desktop flight เมื่อ setup ซ่อน ให้ scene ใช้ไม่น้อยกว่าประมาณ 60% ของ workspace width โดยไม่ทำ control สำคัญหลุดจอ; ตัวเลขนี้ต้องยืนยันจาก wireframe/จอเตี้ย ไม่ใช่ผลที่วัดแล้ว และอาจต้องใช้ preset เมื่อเปิด diagnostic หลายแผง

### 10.2 เกณฑ์ผ่านก่อนแต่ละ PR

- task scope/contracts/dependencies ตรงเอกสารล่าสุดและผู้ใช้อนุญาตเริ่มแล้ว
- focused meaningful checks, type/build/budget และ translation parity ตามผลกระทบ
- browser journey ใช้ actual controls สำหรับ UI ที่เปลี่ยน; physics change มี reference/invariantและaffected mission evidence
- no data loss/stale callback, no silent fallback, no accidental changes to other vehicle goldens
- PR อธิบาย trigger→before/after, validation, exact source และ remaining limitations; shared owners review
- **ก่อน merge:** required CI และ domain acceptance ที่เกี่ยวข้องต้องผ่านบน candidate/base ปัจจุบัน; pending/failed/cancelled checks และหลักฐานที่หมดอายุหลัง source/base เปลี่ยนใช้แทนไม่ได้ ห้าม merge ก่อนโดยตั้งใจไปตรวจส่วนที่จำเป็นภายหลังใน R7

### 10.3 เกณฑ์ release และ rollback

- full relevant gates บน release candidate/source ที่ชัด; updated snapshots validated; full browser ตรวจ dist ที่จะเผยแพร่จริง
- storage migration และ old-cache compatibility ผ่านก่อนเปิดรุ่นที่เปลี่ยน data schema
- deployment API success สำหรับ exact merged commit; About/build stamp ตรวจได้ และ stale service worker มี flow reload ที่ถูก
- rollback แยก code/data/physics evidence: ไม่ลบ profile data ใหม่หรือข้าม schemaด้วย appเก่า; source rollback แล้ว reference reports ต้องแสดง historical provenance
- สถานะ ณ เวอร์ชัน 1.1 เป็นข้อเสนอและยังไม่มี implementation; เวอร์ชัน 1.2 เริ่ม R1 ที่ผู้ใช้อนุญาตแล้ว ให้ตรวจสถานะ implementation / PR / merge / deploy ล่าสุดจาก [PROGRESS.md](PROGRESS.md) และรายงานประกอบ

## 11. ความเสี่ยง คำถามที่รอคำตอบ และการประมาณงาน

### 11.1 ความเสี่ยงที่มีหลักฐานหรือเกิดจาก dependency โดยตรง

| ความเสี่ยง | วิธีจัดการในแผน |
|---|---|
| resetลบงานอื่นหรือstale tabเขียนผลคืน; switchแสดงdesign/flightของคนก่อน | all-work profile ownership, bundled/personal content separation + transaction/epoch + async cancellation + cache invalidation/two-tab acceptance |
| appเก่าจาก cacheเขียน schemaเก่าหลัง migration | compatibility/version lock/read-only policy; validate waiting-worker behavior |
| hide setup ทำ live controls หาย | lifecycle state และแยก commands/display settingsก่อนซ่อน |
| drag/window/keyboard/wheel แย่งกัน | surface ownership + focus-aware input + shared layout/camera contracts |
| ภาพดาวเทียมสวยแต่ผิดแบบ | geometry จาก actual design, assumptions labels และ exact revision |
| handoff เติม fuel/ใช้ draftหรือ future state | immutable flown state, displayed cursor, versioned physical envelope |
| shared physics changeทำยานอื่นแย่ลง | named branches/affected fleet/held-out checks + one runtime owner |
| sourceไม่พอสำหรับ realism | evidence tiers, uncertainty, no ungrounded fit; independent reference research |
| Docking สวยแต่ไม่มี physical failure | fuel/contact/collision/conservation gates และ event-driven presentation |
| heavy evidenceคนละ sourceหรือ inventoryขาด | exact manifests/union aggregationและsource freeze |
| asset/previewหลายตัวทำ WebGL contextsหมด | shared render lifecycle/context budget; SVG first; GPU cleanup/pause hidden views |

### 11.2 งานที่ต้องรอคำตอบก่อนลงมือในส่วนนั้น

- D05 ก่อน finalize reset granularity; D01 local profilesและD04แยกงานทั้งหมดยืนยันแล้ว ขยายmigration/backup/draftsตามนี้
- D06/D08 ก่อน commit notation/layout contract
- D07 ก่อน select ISS ephemeris/reference scope; D02 เริ่ม Soyuz ยืนยันแล้ว
- D09 ก่อน cockpit systems/assets/input development; D03 cockpit/manual first ยืนยันแล้ว และ EVA เป็นส่วนขยาย

คำถามที่ยังไม่ตอบไม่ใช่ approval การทำเอกสารทำต่อได้ แต่ implementation ที่ขึ้นกับคำตอบต้องเก็บเป็น blocked/pending decision จนได้คำตอบหรือผู้ใช้มอบอำนาจให้ใช้สมมติฐานอย่างชัดเจน

### 11.3 การประมาณงาน

ยังไม่กำหนดวันส่งมอบปฏิทิน เพราะ R0 ต้องวัด effort, design prototype และ availability ของ reference data ก่อน ให้ใช้ขนาดงานเพื่อจัดคิว:

| ระยะ | ขนาดประมาณ | สิ่งที่อาจเพิ่มงาน |
|---|---|---|
| R0 | เล็ก–กลาง | reproduction และคำตอบ product |
| R1 | ใหญ่มาก | all-work profile migration/drafts, cross-domain stale state, archive/recovery และshared fuel fixes; ขอบเขตเพิ่มตาม D04ที่ยืนยัน |
| R2 | กลาง–ใหญ่ | responsive redesign และ custom window interaction |
| R3 | ใหญ่ | exact satellite geometry และ domain handoff compatibility |
| R4 | ต่อเนื่องเป็น waves | source scarcity, shared physics consequences, long Monte Carlo |
| R5 | ใหญ่มาก | true target phasing, sensing/contact/free-drift และ spacecraft-specific mechanisms |
| R6 | ใหญ่มาก | cockpit subsystem fidelity/assets/input; EVAเพิ่มขอบเขตอีกระดับ |
| R7 | กลาง | cross-system failuresและschema compatibility |

ประเมินใหม่หลังแต่ละ gate ด้วยงานที่เสร็จจริง/หลักฐาน ไม่เริ่มหลาย wave ที่แชร์ไฟล์เพียงเพื่อให้ดูเหมือนทำขนานมาก

## 12. รูปแบบส่งต่องานสำหรับ AI และแหล่งอ้างอิง

### 12.1 Task envelope

ตัวอย่างขอบเขต R1.1 ที่ผู้ใช้อนุญาตแล้ว; ผู้รับงานต้องอ่านสถานะจริงจาก PROGRESS.md ก่อน ห้ามใช้ตัวอย่างนี้สั่งทำส่วนที่เสร็จซ้ำหรือขยาย authorization ไปยังระยะอื่น:

```yaml
task_id: R1.1
status: see_PROGRESS.md
execution_authorized: true
baseline_commit: 523b44eca0e31fd84fd4a3faa4e1b883428288ee
requirement_ids: [U01]
owner: learner_storage
dependencies: [R0.2, G0]
pending_decisions: [] # R1 reset defaults documented in PROGRESS.md
allowed_write_paths:
  - src/workspace/
  - src/lessons/progress.ts
  - src/projects/archive.ts
  - src/projects/validation.ts
  - src/design/design-store.ts
  - profile_owned_workspace_storage_adapters
shared_edits_via_owner:
  - main.ts -> application_integration
  - shared_schema -> domain_contract
inputs:
  - approved_ADR
  - legacy_fixtures
deliverables:
  - repository_and_migration
  - reset_and_revision_contract
  - archive_compatibility
  - all_personal_workspace_and_draft_isolation
acceptance:
  - legacy_data_preserved
  - learner_isolation
  - reset_survives_reload_and_stale_tab
  - import_export_recovery
evidence:
  - source_and_runtime_manifest
  - selected_checks_and_coverage
  - remaining_limitations
```

สถานะที่ใช้: proposed → ready (decisions/depsครบ) → authorized → in_progress → review → verified → merged → published โดย merged และ published เป็นคนละสถานะ scientific acceptance มี status แยกจาก execution tests

### 12.2 Definition of ready / done

Ready: ผู้ใช้สั่งเริ่มส่วนนี้, pending decisions ที่จำเป็นตอบแล้ว, dependencies/owner/allowed paths/contracts/acceptance/baseline ตรึง

Done: behavior ตรงข้อกำหนด, meaningful checksและreference gatesที่เกี่ยวข้องผ่าน, source evidenceตรง, reviewแล้ว, docs/compatibility/limitationsครบ; merge/publishตามสิทธิ์ที่มีในเวลานั้นและยืนยันผลจริง ไม่ข้าม gate ด้วยการเปลี่ยน status เอง

### 12.3 แหล่งอ้างอิงโค้ดและเอกสาร

ทุก repository link ด้านล่าง pin ที่ baseline `523b44e` เพื่อไม่ให้ความหมายเปลี่ยนตาม main ภายหลัง:

- Learners/progress: [progress.ts](https://github.com/ROYIN001/Orbitlab/blob/523b44eca0e31fd84fd4a3faa4e1b883428288ee/src/lessons/progress.ts), [lesson-mode.ts](https://github.com/ROYIN001/Orbitlab/blob/523b44eca0e31fd84fd4a3faa4e1b883428288ee/src/ui/lessons/lesson-mode.ts), [assessment-view.ts](https://github.com/ROYIN001/Orbitlab/blob/523b44eca0e31fd84fd4a3faa4e1b883428288ee/src/ui/lessons/assessment-view.ts)
- Backup/schema: [archive.ts](https://github.com/ROYIN001/Orbitlab/blob/523b44eca0e31fd84fd4a3faa4e1b883428288ee/src/projects/archive.ts), [validation.ts](https://github.com/ROYIN001/Orbitlab/blob/523b44eca0e31fd84fd4a3faa4e1b883428288ee/src/projects/validation.ts)
- Shell/camera: [main.ts](https://github.com/ROYIN001/Orbitlab/blob/523b44eca0e31fd84fd4a3faa4e1b883428288ee/src/main.ts), [style.css](https://github.com/ROYIN001/Orbitlab/blob/523b44eca0e31fd84fd4a3faa4e1b883428288ee/src/style.css), [cameras.ts](https://github.com/ROYIN001/Orbitlab/blob/523b44eca0e31fd84fd4a3faa4e1b883428288ee/src/render/cameras.ts), [hudlayout.ts](https://github.com/ROYIN001/Orbitlab/blob/523b44eca0e31fd84fd4a3faa4e1b883428288ee/src/ui/hudlayout.ts), [notation.ts](https://github.com/ROYIN001/Orbitlab/blob/523b44eca0e31fd84fd4a3faa4e1b883428288ee/src/ui/notation.ts), [timeline.ts](https://github.com/ROYIN001/Orbitlab/blob/523b44eca0e31fd84fd4a3faa4e1b883428288ee/src/ui/timeline.ts)
- Build: [engineer-level.ts](https://github.com/ROYIN001/Orbitlab/blob/523b44eca0e31fd84fd4a3faa4e1b883428288ee/src/ui/build/engineer-level.ts), [satellite-bench.ts](https://github.com/ROYIN001/Orbitlab/blob/523b44eca0e31fd84fd4a3faa4e1b883428288ee/src/ui/build/satellite-bench.ts), [stack-svg.ts](https://github.com/ROYIN001/Orbitlab/blob/523b44eca0e31fd84fd4a3faa4e1b883428288ee/src/ui/build/stack-svg.ts), [satellite-spec.ts](https://github.com/ROYIN001/Orbitlab/blob/523b44eca0e31fd84fd4a3faa4e1b883428288ee/src/design/satellite-spec.ts), [satellite-launch.ts](https://github.com/ROYIN001/Orbitlab/blob/523b44eca0e31fd84fd4a3faa4e1b883428288ee/src/design/satellite-launch.ts)
- Handoff/results: [handoff.ts](https://github.com/ROYIN001/Orbitlab/blob/523b44eca0e31fd84fd4a3faa4e1b883428288ee/src/orbit/handoff.ts), [result-content.ts](https://github.com/ROYIN001/Orbitlab/blob/523b44eca0e31fd84fd4a3faa4e1b883428288ee/src/ui/result-content.ts), [mission-result.ts](https://github.com/ROYIN001/Orbitlab/blob/523b44eca0e31fd84fd4a3faa4e1b883428288ee/src/ui/mission-result.ts)
- Physics/Docking: [PHYSICS.md](https://github.com/ROYIN001/Orbitlab/blob/523b44eca0e31fd84fd4a3faa4e1b883428288ee/docs/PHYSICS.md), [VALIDATION.md](https://github.com/ROYIN001/Orbitlab/blob/523b44eca0e31fd84fd4a3faa4e1b883428288ee/docs/VALIDATION.md), [rendezvous.ts](https://github.com/ROYIN001/Orbitlab/blob/523b44eca0e31fd84fd4a3faa4e1b883428288ee/src/physics/sim/rendezvous.ts)
- Flight-profile method: [FLIGHT-PROFILE-METHOD.md](https://github.com/ROYIN001/Orbitlab/blob/523b44eca0e31fd84fd4a3faa4e1b883428288ee/docs/FLIGHT-PROFILE-METHOD.md), [audit 2026-10-01](https://github.com/ROYIN001/Orbitlab/blob/523b44eca0e31fd84fd4a3faa4e1b883428288ee/docs/history/audit-2026-10-01-flight-profile.md), [burn-order notes](https://github.com/ROYIN001/Orbitlab/blob/523b44eca0e31fd84fd4a3faa4e1b883428288ee/docs/history/2026-10-01-soyuz21b-sso-burn-order.md)
- Scientific baseline: [Stage1 validation summary](https://github.com/ROYIN001/Orbitlab/blob/523b44eca0e31fd84fd4a3faa4e1b883428288ee/docs/stage1-2026-10-02/validation-summary.json), [Stage3–4 record](https://github.com/ROYIN001/Orbitlab/blob/523b44eca0e31fd84fd4a3faa4e1b883428288ee/docs/history/2026-10-03/STAGE3-4.md)
- Workflows: [ci.yml](https://github.com/ROYIN001/Orbitlab/blob/523b44eca0e31fd84fd4a3faa4e1b883428288ee/.github/workflows/ci.yml), [deploy.yml](https://github.com/ROYIN001/Orbitlab/blob/523b44eca0e31fd84fd4a3faa4e1b883428288ee/.github/workflows/deploy.yml), [heavy.yml](https://github.com/ROYIN001/Orbitlab/blob/523b44eca0e31fd84fd4a3faa4e1b883428288ee/.github/workflows/heavy.yml)

### 12.4 PR และ workflow ที่ใช้วิเคราะห์

- [Soyuz #63](https://github.com/ROYIN001/Orbitlab/pull/63) และ [Soyuz burn planner #64](https://github.com/ROYIN001/Orbitlab/pull/64)
- [#63 first CI](https://github.com/ROYIN001/Orbitlab/actions/runs/36884215504), [#63 final CI](https://github.com/ROYIN001/Orbitlab/actions/runs/36884357092), [#63 Pages](https://github.com/ROYIN001/Orbitlab/actions/runs/36886828921)
- [#64 CI](https://github.com/ROYIN001/Orbitlab/actions/runs/36918069063)
- [Stage2 CI](https://github.com/ROYIN001/Orbitlab/actions/runs/37063706462), [Stage2 scheduled Pages](https://github.com/ROYIN001/Orbitlab/actions/runs/37066834767)
- [WebGL timeout CI](https://github.com/ROYIN001/Orbitlab/actions/runs/37070737313), [browser crash CI](https://github.com/ROYIN001/Orbitlab/actions/runs/37073349169)
- [Stage3–4 first CI](https://github.com/ROYIN001/Orbitlab/actions/runs/37080233899), [final CI](https://github.com/ROYIN001/Orbitlab/actions/runs/37081940631), [published Pages](https://github.com/ROYIN001/Orbitlab/actions/runs/37084189532)
- [Heavy run](https://github.com/ROYIN001/Orbitlab/actions/runs/36804343856), [fleet run](https://github.com/ROYIN001/Orbitlab/actions/runs/36942933112)

## บันทึกสถานะเอกสาร

- 1.2: บันทึกคำสั่งเริ่ม R1/งานเล็กและส่งแผนเข้ repository; สถานะงานจริงอยู่ PROGRESS.md และรายงานรายแพ็กเกจ ไม่ถือว่าอนุญาตระยะถัดไปทั้งหมด
- 1.1: เพิ่ม U16 จากรายงาน Soyuz 100%; แยกคำสั่งคันเร่ง ระดับเครื่องยนต์จริง และแรงขับ; รวมงาน UI ใน R2.1 และงาน propulsion/load programme ใน R4.2–R4.3 พร้อมข้อ 8.6 โดยไม่เพิ่ม physics branch ที่ชนกัน ยังไม่ได้รันการจำลองหรือแก้แอป
- 1.0: รวม U01–U15 และ A01–A05, read-only code/history/workflow audit, R0–R7, task ownership/dependencies/acceptance; ผู้ใช้ยืนยัน D01 local profiles, D02 Soyuz first, D03 cockpit/manual first และ D04แยกงานทั้งหมดของแต่ละคนแล้ว
- ไม่มี application changes, commits, PRs, workflow reruns/cancellations, data resets หรือ migrations ในการจัดทำแผนครั้งนี้
- เอกสาร `.md` เป็นแหล่งข้อความหลักสำหรับ AI และ `.docx` ใช้ข้อความเดียวกันพร้อมจัดหน้าอ่านสำหรับคน
