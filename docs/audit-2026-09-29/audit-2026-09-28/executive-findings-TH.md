# สรุปผลตรวจ Orbit Lab — 28 กันยายน 2026

ตรวจความสอดคล้องจากรายงานที่มีอยู่ 4 ฉบับบน commit `0a6d1a709ffbf88e8e36f606d6993bd27e5c25e0` ได้แก่ [Build][build], [Lessons][lessons], [Assessment][assessment] และ [Source regressions][regressions] เอกสารนี้จัดลำดับผลกระทบต่อการเรียนและความน่าเชื่อถือของผลลัพธ์ ไม่ได้เพิ่มการทดสอบหรือแก้โค้ดผลิตภัณฑ์ รวมข้อมูล Launch เพิ่มเติมเรื่อง A6/A9 และตาราง Mission result ที่ผู้ตรวจหลักส่งมาแล้ว แต่ยังไม่รวมการเดินครบทุกเส้นทาง Launch/mobile

**ระบบพัฒนาไปมากจากรอบก่อน:** Build ใช้งานได้แล้วทั้ง Watch, Explore และ Engineer; มีบทเรียนครบ 24 บทและข้อสอบ 157 ข้อ ปัญหาหลักที่เหลืออยู่คือการรักษางานของผู้เรียน ความตรงกันของโจทย์กับเกณฑ์ผ่าน และการสื่อสารว่าผลใดเป็นข้อมูลปัจจุบันหรือข้อสรุปที่เชื่อถือได้เพียงใด

## 8 ประเด็นที่ควรจัดการก่อน

ทุกข้อด้านล่างเป็น P2 ตามรายงานต้นทาง จัดลำดับเพื่อวางงาน ไม่ใช่คะแนนความรุนแรงเชิงสถิติ คำว่า “ยืนยันในเบราว์เซอร์” หมายถึงผลของผู้ตรวจหลักที่รายงานต้นทางบันทึกไว้

| ลำดับ | ปัญหาและหลักฐาน | จุดอ้างอิงใน source | เกณฑ์รับงานแก้ |
|---|---|---|---|
| **1 — คำตอบบทเรียนที่ยังไม่ส่งหายเมื่อขอ Hint หรือเปลี่ยนภาษา** (L1) | เบราว์เซอร์บท 6.1: พิมพ์ `0.986` แล้วกด Hint 1 ช่องว่างลง; พิมพ์ใหม่แล้ว EN → TH ก็หาย ฟอร์มเก็บคำตอบเฉพาะตอนส่ง จึงทำลายงานระหว่างขอความช่วยเหลือ | [lesson-mode.ts:437][lesson-submit], [การสร้างช่องใหม่ :603][lesson-input], [case :760][case-input] | เก็บข้อความดิบ/ตัวเลือกแยกจากผลตรวจตั้งแต่ input/change; ทุกช่องคงอยู่หลัง Hint, เปลี่ยนภาษา และกลับเข้าหน้า ทั้งบทบินและกรณีศึกษา โดยไม่ตรวจคะแนนทุก keystroke |
| **2 — Engineer ทดสอบแบบจรวดฉบับเก่าหลัง Save** (B1) | เบราว์เซอร์: บันทึก `Audit28 F9` 9 เครื่องยนต์ เลือก saved design ใน Engineer แล้วแก้เป็น 10 ใน Explore และ Save; กลับมา Engineer ยังแสดง 9 แหล่งข้อมูลนี้ใช้ร่วมกับ static fire, tunnel และ readiness | [engineer-level.ts:168][engineer-refresh], [โหลดเต็มเฉพาะตอนเลือก :220][engineer-pick] | edit → Save → Engineer ต้องใช้ revision ล่าสุดโดยไม่ต้องสลับชื่อเอง; ทั้งสามเครื่องมือและ Launch handoff ใช้แบบ 10 เครื่องยนต์เดียวกันและแสดงที่มาชัดเจน |
| **3 — Save แบบหนึ่งลบ record อื่นที่อ่านไม่ได้** (B3) | probe ใช้ source จริงกับ storage จำลอง: `[d1, unreadable]` กลายเป็น `[d1, d2]` หลัง Save แบบใหม่ เพราะอ่านแล้วกรอง record เสียก่อนเขียนทับทั้งหมด **ไม่ได้พบข้อมูลผู้ใช้จริงสูญหาย** แต่เป็นเส้นทางทำข้อมูลที่ยังอาจกู้คืนได้หาย | [design-store.ts:105][store-read], [Save :140][store-save], [Remove :153][store-remove] | การบันทึก/ลบ record ปกติต้องไม่ลบ raw record ที่ไม่รู้จักหรืออ่านไม่ได้; เก็บไว้แยก หรือหยุดเขียนพร้อมทางสำรอง/กู้คืน; ตรวจ version และกรณี list → unrelated Save ด้วย |
| **4 — คำตอบที่มีเหตุผลถูกตีความเป็นความเข้าใจผิด** (A28-01) | `g-zero-alpha`: ลดแรงต้านเป็นประโยชน์จริง แต่ระบบอนุมานว่าผู้เรียนไม่เข้าใจเรื่องโครงสร้าง; `c-maxq-margins`: แรงขับลดทำให้ TVC authority ลดได้ แต่ถูกอนุมานว่าเชื่อว่าเกิดจากแรงขับ “เท่านั้น” ปัญหาอยู่ทั้ง EN/RU/TH | [guidance.ts:99][zero-alpha], [control.ts:145][maxq] | ระบุกรอบคำถามให้จำเพาะ เช่น เหตุผลด้านแรงโครงสร้าง หรือใช้หลายคำตอบ; ห้ามสร้าง misconception ที่ไม่ได้ตามมาจากคำตอบที่เลือก; ตรวจทั้งสามภาษาและผล recommendation |
| **5 — ข้อความสอนบางจุดผิดหรือขาดเงื่อนไขสำคัญ** (A28-02/04/05, L3) | IGM “บินครั้งแรกบน Saturn V ปี 1967” ไม่มีตัวเลือกถูก—รายงานอ้าง NASA SA-9 ปี 1965; โจทย์ reliability ใช้ `p^n` โดยไม่ระบุ independence; คำอธิบาย catch-up ภาษาอังกฤษบอกเบรกเพื่อยกวงโคจรกลับ; บท 1.5 เสนอข้อจำกัด corridor ของโมเดลเป็นข้อห้ามจริงของ Cape ทั้งที่รายงานมีหลักฐาน polar launch จากแหล่งทางการ | [guidance.ts:89][igm], [failures.ts:246][reliability], [orbits.ts:146][catchup], [track1.ts:136][corridor] | แก้ประวัติพร้อมแหล่งอ้างอิง; ระบุ independent events; ระบุ prograde burn ตอนยกวงโคจรกลับ; ระบุว่า corridor เป็นข้อจำกัดของ simulator/ละ southern dogleg; ให้โจทย์ ตัวเลือก เฉลย และคำอธิบายทั้งสามภาษาสอดคล้องกัน |
| **6 — เกณฑ์ผ่านรับงานที่ต่างจากโจทย์** (L4/L5) | probe เที่ยวบิน point-mass ยืนยัน 5.3 ใช้ 100 kg แทน 83.6 kg ก็ผ่าน, 5.4 เปลี่ยน inclination เป็น 55° ก็ผ่าน, 5.5 ใช้ apogee 330,000 km แทน 370,000 km ก็ผ่าน; 3.1 เปลี่ยนเป็น PEG ผ่านโดยไม่มี broken lock ทั้งที่อนุญาตให้เปลี่ยน payload เท่านั้น | [track5.ts:103][sputnik], [track5.ts:134][vostok], [track5.ts:176][apollo], [grader.ts:178][locks] | ตัดสินให้ชัดว่าส่วนใดเป็นข้อบังคับหรือเพียงตัวอย่าง แล้วทำ brief/hint/controls/rubric ให้ตรงกัน; ถ้าบังคับต้องตรวจ payload, inclination, apogee band และ explicit guidance; supplied solutions ยังผ่าน และ off-task configurations ข้างต้นไม่ผ่านเงื่อนไขที่บังคับ |
| **7 — Show the answers ปิดทางผ่านบทเดิมถาวร** (L2; ข้อเสนอนโยบาย) | source และ tests ตั้งใจเก็บค่าที่เคยเฉลยข้าม Restart แล้วปฏิเสธคำตอบเดิมตลอดไป; บทที่คำตอบคงที่และตัวเลือก why ของทั้งสาม case จึงไม่มีทางประเมินใหม่ตาม flow ที่มี เป็น **นโยบายที่ทำงานตามโค้ด** ไม่ใช่ implementation ผิดจาก tooltip | [progress.ts:141][reveal-store], [grader.ts:224][reveal-grade], [case-grader.ts:23][reveal-case], [Restart :316][restart] | เปลี่ยนเป็นสถานะ “ทำสำเร็จโดยใช้คำแนะนำ” สำหรับ attempt นี้ พร้อมโจทย์ใหม่/ฝึกซ้ำ/ทางแสดงความสามารถใหม่; ประวัติการดูเฉลยยังอยู่ แต่ไม่ทำให้บทเรียนเป็นทางตัน; ผลกระทบต้องเห็นได้ก่อนกดบนจอสัมผัส |
| **8 — ผลสอบบอกว่าไม่มีเรื่องต้องทบทวน พร้อมแสดงบทที่ต้องทบทวน** (A28-03) | probe seed 11: 24 ข้อถูก, `b-launch-east` ผิด/Not sure → 97%, ทุก domain strong แต่บท 1.5 เป็น review และ `start:null`; headline และรายการจุดอ่อนจึงขัดกับคำแนะนำระดับบท | [score.ts:148][score-review], [เลือก start :166][score-start], [assessment-view.ts:450][score-ui] | review flag ระดับบทต้องมีผลต่อหัวข้อสรุป รายการที่ควรฝึก และจุดเริ่มต้น แม้คะแนนรวม/domain สูง; ชุด seed 11 เดิมต้องให้ข้อความและปุ่มนำทางสอดคล้องกัน |

ก่อนแก้/reorder ข้อสอบ ให้เพิ่ม bank revision หรือ snapshot ของโจทย์/เฉลยที่ใช้ตรวจ เพราะผลเก่าถูกคำนวณใหม่กับ bank ปัจจุบัน และ attempt ยังไม่มี version ([assessment-view.ts:48][regrade], [types.ts:129][attempt-types]) มิฉะนั้นการแก้ข้อ 4–5 อาจเปลี่ยนความหมายของคะแนนเก่าโดยไม่ตั้งใจ

## สิ่งที่แก้แล้วจากรอบก่อน และสิ่งที่ยังต้องแยกให้ชัด

- **เก้ารายการด้าน state/mission มี source fix และ focused tests ผ่าน:** A1 Home/reload/mission ownership; A2 mass/fuel ที่ไม่ถูกต้อง; A3 การยอมใช้ ideal destination ทั้งที่ fuel ไม่พอ; A4 ผล overflight ของเมืองเก่า; A5 ผล lifetime หลังเปลี่ยนค่า; A6 Launch handoff ขณะอยู่ Real satellites; A9 Watch จบก่อนภารกิจ orbital เสร็จ; A10 เปิด Monte Carlo run ด้วย mission อื่น; A14 ผล data provider รุ่นเก่ากลับมาทับรุ่นใหม่ ดูตำแหน่งโค้ดและขอบเขตของแต่ละข้อใน [ตาราง regression][regressions]
- **A6 และ A9 มีผล live เพิ่มเติมแล้ว:** ผู้ตรวจหลักบิน Bandwagon six-DOF ถึง payload release และยืนยัน Orbit handoff; การพบป้ายตารางผลไม่ตรงความหมายด้านล่างไม่ทำให้สอง regression นี้กลับมาเป็นปัญหาเดิม
- **Placement ดีขึ้นจริง:** draft หลังเปลี่ยนภาษา, บังคับเลือก confidence สำหรับคำตอบใหม่ และการเปิดเผยน้ำหนัก/ตัวหารคะแนนได้รับการแก้แล้ว ไม่ขัดกับข้อ 1 ซึ่งเป็นฟอร์มบทเรียนอีกชุดหนึ่ง
- **Flight export เก็บ flown configuration ครบขึ้น** และ round-trip ของทุก flight lesson ผ่าน; case export ยังขาดข้อมูล frozen dataset เต็มชุด การเปลี่ยนคำอธิบายให้ชัดว่า results export ใช้ restore ไม่ได้เป็นความคืบหน้า แต่ยังไม่ใช่ระบบ backup/restore
- **Storage warning แก้เพียงบางหน้า:** catalogue และ flight strip มีข้อความแล้ว; case strip และ placement ยังไม่มี ไม่ควรสรุปว่า silent-save failure แก้ครบ ระบบนี้แยกจาก design-store ในข้อ 3
- **บท 2.4 เปิดเผยเกณฑ์ที่ตรวจจริงแล้ว; บท 4.3 แก้ selection window/minimum hold แล้ว** แต่ยังไม่ได้ประเมิน Monte Carlo interpretation ทั้งชุด หรือ stimulus/baseline ตาม brief อย่างครบถ้วน
- **Build เป็นฟีเจอร์ใช้งานได้แล้ว** ไม่ควรยกข้อความ roadmap ของรอบเก่ามาใช้ ผู้ตรวจหลักยืนยัน Watch tour ทั้งห้าขั้นและ static fire vacuum/sea-level ตาม controls

ยังมีปัญหานอก 8 กลุ่มแรกที่ควรเก็บในคิว: **B2** tunnel payload ติดลบ/ว่างไม่มี error และบาง control แสดงผลเก่าหรือคำนวณใหม่ต่างกัน (เบราว์เซอร์พบผล finite; **ไม่พบ NaN**); **A28-07** answer review ไม่แสดงภาพ/กราฟเดิม; **L7** model-limits บอกไม่มี flex ทั้งที่มีบทใช้ bending; **A17** inspector attitude Auto Tune ยังทำงาน synchronous; **A18** หากสร้าง worker ตัวหลังล้มเหลว worker ที่เริ่มก่อนหน้าไม่ถูก cleanup (fake-worker probe ยืนยันเงื่อนไขนี้ ไม่ใช่ทุก Monte Carlo run ล้มเหลว) Main launch-guidance tuner มี worker แล้วและไม่อยู่ใน A17

**ผล live เพิ่มเติม — P2 ป้าย Mission result ไม่ตรงค่าที่แสดง:** Bandwagon ที่ T+3272.45 s มี apogee ใน frame/telemetry/handoff ประมาณ 597.15 km แต่ตาราง “Orbit at the displayed time” แสดง 594.8 km โค้ด [result-content.ts:71][result-frozen] ใช้ apsides จาก outcome event (six-DOF เป็นค่าต่ำสุด/สูงสุดที่คาดการณ์ในรอบถัดไปภายใต้ J2) ปนกับ inclination/RAAN ของ frame ปัจจุบัน; ป้ายผิดความหมายทั้งสามภาษาที่ [result-content.ts:168][result-caption] จึงอธิบายได้จาก source โดยไม่รันทดสอบซ้ำ ควรแยก **ค่าที่ใช้ตัดสินผล ณ outcome** กับ **osculating orbit ณ เวลาที่กำลังดู** และตรวจให้ตารางชนิดหลังตรงกับ telemetry/handoff โดยเก็บ verdict เดิมไว้ รายละเอียดใน addendum ของ [source regressions][regressions]

## ความสอดคล้องและขอบเขตหลักฐาน

- ทั้งสี่รายงานอ้าง commit เดียวกัน ปรับคำเปิดใน `source-regressions.md` จาก Eight เป็น **Nine** ให้ตรงกับ 9 แถวที่แก้แล้ว; A17 = inspector tuner, A18 = worker startup, A14 = provider generation แยกกัน ไม่มี product edit
- คงความต่างระหว่าง **ผล browser**, **headless model/test/probe**, และ **ข้อสังเกตจาก source** ไว้ โดยเฉพาะ storage quota, GUI warnings และ conditional worker failure ห้ามอ้างว่าได้ทดสอบ live แล้วจาก passing unit tests
- Build: focused tests **164 ผ่าน/17 ไฟล์**; source regressions **126 ผ่าน/10 ไฟล์**; lessons: **53 ผ่าน/1 ไม่ผ่าน** ในชุด UI/case และ **29 ผ่าน/7 นอก filter** ในชุด lesson flights; assessment: **44 ผ่าน** และ **1 flight test ผ่าน** ตัวเลขเหล่านี้เป็นผลที่รายงานเดิมบันทึก **ห้ามบวกรวมตรง ๆ** เพราะ `lessons-ui-core` ซ้ำข้ามงาน
- หนึ่ง test failure ของ Windows คือ LF/CRLF fixture equality (`tests/case-lessons.test.ts:183`) โดย parsed round-trip ผ่าน จึงไม่ใช่หลักฐานว่า production lesson importer เสีย
- อ่านเนื้อหา **24 บทครบ**; worked paths ของ **14 point-mass lessons** ผ่าน headless; case keys ทั้งสามตรวจแล้วและผู้ตรวจหลักเปิดผ่านในเบราว์เซอร์; **7 six-DOF lessons ยังไม่ได้รัน heavy worked-flight tests ใหม่** การตรวจ synthetic window ของ 4.3 ไม่เท่ากับบินจริง
- สำรวจ **157 ข้อครบ**, ตัวเลข **25 families / 31,639 combinations** ผ่าน independent calculation และ grader checks ตามรายงานเดิม; อ่าน EN ครบและเปรียบเทียบ TH/RU prompt/key ครบ แต่คำอธิบาย/distractor TH/RU ตรวจเชิงความหมายแบบเจาะจง ไม่ใช่รับรองการแปลทุกประโยคหรือ psychometric validity
- ไม่รัน full suite, ไม่ติดตั้ง dependencies, ไม่ deploy และไม่รับรองแบบจำลองด้วยข้อมูลการบินจริง การเขียนสรุปนี้ไม่ได้รันทดสอบซ้ำ; ผล Launch/mobile เพิ่มเติมให้รวมจากผู้ตรวจหลักภายหลัง

[build]: C:/Users/Royin/OneDrive/Desktop/Royin/Orbitlab/audit-2026-09-28/build-review.md
[lessons]: C:/Users/Royin/OneDrive/Desktop/Royin/Orbitlab/audit-2026-09-28/lessons-review.md
[assessment]: C:/Users/Royin/OneDrive/Desktop/Royin/Orbitlab/audit-2026-09-28/assessment-review.md
[regressions]: C:/Users/Royin/OneDrive/Desktop/Royin/Orbitlab/audit-2026-09-28/source-regressions.md
[lesson-submit]: C:/Users/Royin/OneDrive/Desktop/Royin/Orbitlab/audit-2026-09-28/source/src/ui/lessons/lesson-mode.ts:437
[lesson-input]: C:/Users/Royin/OneDrive/Desktop/Royin/Orbitlab/audit-2026-09-28/source/src/ui/lessons/lesson-mode.ts:603
[case-input]: C:/Users/Royin/OneDrive/Desktop/Royin/Orbitlab/audit-2026-09-28/source/src/ui/lessons/lesson-mode.ts:760
[engineer-refresh]: C:/Users/Royin/OneDrive/Desktop/Royin/Orbitlab/audit-2026-09-28/source/src/ui/build/engineer-level.ts:168
[engineer-pick]: C:/Users/Royin/OneDrive/Desktop/Royin/Orbitlab/audit-2026-09-28/source/src/ui/build/engineer-level.ts:220
[store-read]: C:/Users/Royin/OneDrive/Desktop/Royin/Orbitlab/audit-2026-09-28/source/src/design/design-store.ts:105
[store-save]: C:/Users/Royin/OneDrive/Desktop/Royin/Orbitlab/audit-2026-09-28/source/src/design/design-store.ts:140
[store-remove]: C:/Users/Royin/OneDrive/Desktop/Royin/Orbitlab/audit-2026-09-28/source/src/design/design-store.ts:153
[zero-alpha]: C:/Users/Royin/OneDrive/Desktop/Royin/Orbitlab/audit-2026-09-28/source/src/lessons/assessment/bank/guidance.ts:99
[maxq]: C:/Users/Royin/OneDrive/Desktop/Royin/Orbitlab/audit-2026-09-28/source/src/lessons/assessment/bank/control.ts:145
[igm]: C:/Users/Royin/OneDrive/Desktop/Royin/Orbitlab/audit-2026-09-28/source/src/lessons/assessment/bank/guidance.ts:89
[reliability]: C:/Users/Royin/OneDrive/Desktop/Royin/Orbitlab/audit-2026-09-28/source/src/lessons/assessment/bank/failures.ts:246
[catchup]: C:/Users/Royin/OneDrive/Desktop/Royin/Orbitlab/audit-2026-09-28/source/src/lessons/assessment/bank/orbits.ts:146
[corridor]: C:/Users/Royin/OneDrive/Desktop/Royin/Orbitlab/audit-2026-09-28/source/src/lessons/builtin/track1.ts:136
[sputnik]: C:/Users/Royin/OneDrive/Desktop/Royin/Orbitlab/audit-2026-09-28/source/src/lessons/builtin/track5.ts:103
[vostok]: C:/Users/Royin/OneDrive/Desktop/Royin/Orbitlab/audit-2026-09-28/source/src/lessons/builtin/track5.ts:134
[apollo]: C:/Users/Royin/OneDrive/Desktop/Royin/Orbitlab/audit-2026-09-28/source/src/lessons/builtin/track5.ts:176
[locks]: C:/Users/Royin/OneDrive/Desktop/Royin/Orbitlab/audit-2026-09-28/source/src/lessons/grader.ts:178
[reveal-store]: C:/Users/Royin/OneDrive/Desktop/Royin/Orbitlab/audit-2026-09-28/source/src/lessons/progress.ts:141
[reveal-grade]: C:/Users/Royin/OneDrive/Desktop/Royin/Orbitlab/audit-2026-09-28/source/src/lessons/grader.ts:224
[reveal-case]: C:/Users/Royin/OneDrive/Desktop/Royin/Orbitlab/audit-2026-09-28/source/src/lessons/case-grader.ts:23
[restart]: C:/Users/Royin/OneDrive/Desktop/Royin/Orbitlab/audit-2026-09-28/source/src/ui/lessons/lesson-mode.ts:316
[score-review]: C:/Users/Royin/OneDrive/Desktop/Royin/Orbitlab/audit-2026-09-28/source/src/lessons/assessment/score.ts:148
[score-start]: C:/Users/Royin/OneDrive/Desktop/Royin/Orbitlab/audit-2026-09-28/source/src/lessons/assessment/score.ts:166
[score-ui]: C:/Users/Royin/OneDrive/Desktop/Royin/Orbitlab/audit-2026-09-28/source/src/ui/lessons/assessment-view.ts:450
[regrade]: C:/Users/Royin/OneDrive/Desktop/Royin/Orbitlab/audit-2026-09-28/source/src/ui/lessons/assessment-view.ts:48
[attempt-types]: C:/Users/Royin/OneDrive/Desktop/Royin/Orbitlab/audit-2026-09-28/source/src/lessons/assessment/types.ts:129
[result-frozen]: C:/Users/Royin/OneDrive/Desktop/Royin/Orbitlab/audit-2026-09-28/source/src/ui/result-content.ts:71
[result-caption]: C:/Users/Royin/OneDrive/Desktop/Royin/Orbitlab/audit-2026-09-28/source/src/ui/result-content.ts:168
