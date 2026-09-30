# ตรวจต่อ: ความถูกต้องของบทเรียน แบบประเมิน และ snapshot — 29 กันยายน 2026

> เอกสารนี้เก็บ findings จาก source รอบก่อนรวมแก้เพื่ออธิบายที่มาของปัญหา สถานะการแก้และการตรวจล่าสุดอยู่ใน [รายงานหลัก](Orbitlab-acceptance-TH.md) รวม [การอ่านความหมายครบ 157 ข้อ](editorial-audit/bank-editorial-review-TH.md) และ [24 บทเรียน](editorial-audit/lesson-editorial-review-TH.md) ไม่ใช้ข้อความรอแก้ในประวัตินี้แทนผลปัจจุบัน


เอกสารนี้บันทึก **การตรวจอ่านอย่างเดียว** ของ `audit-2026-09-29/source` ซึ่งมีฐาน Git `0a6d1a709ffbf88e8e36f606d6993bd27e5c25e0` และ patch ที่ยังไม่ commit ในเครื่อง ไม่ใช่ผลตรวจรับ patch ล่าสุดจาก Cloud โค้ดที่ Cloud กำลังแก้ต้องตรวจเทียบอีกครั้งก่อนปิดแต่ละข้อ ผู้ตรวจเขียนเฉพาะรายงานฉบับนี้ ไม่แก้ source ไม่เปิด/เปลี่ยนเบราว์เซอร์ และไม่รัน heavy tests ซ้ำ

## 1. P2 — snapshot กรณีศึกษาคัดลอกข้อมูลเกินความจำเป็น

**ยืนยันจาก source และการคำนวณขนาดจริงใน Node:** `src/lessons/progress.ts:52–59` เก็บ `structuredClone(source)` ทุก case ซึ่งมี solar activity ทั้งชุด; `src/ui/orbit/sky-panel.ts:239–245` คืนทั้ง activity และ THEOS-2 ให้ทุก case ขณะที่ `src/lessons/progress.ts:159–160` เก็บผลผ่านครั้งแรกทั้งใน `last` และ `passedRecord` การ serialize JSON จะเขียนเนื้อหาสองครั้งแม้ object ในหน่วยความจำเป็นตัวเดียวกัน

คำนวณด้วย Node v24.19.0 จาก `measuredActivity(bundledHistory, null)` ไม่เรียก API ภายนอก ไม่รัน propagation และไม่เขียนผลลง browser storage:

| รายการ | ค่าที่วัดได้ |
|---|---:|
| จำนวนวันใน series | 48,486 |
| `JSON.stringify(series).length` | 1,904,970 ตัวอักษร |
| UTF-8 ของ series | 1,904,970 ไบต์ |
| UTF-16LE ของ series | 3,809,940 ไบต์ |
| ตัวอย่าง envelope `last` + `passedRecord` ที่ใส่ series เดียวกัน | 3,810,039 ตัวอักษร |
| UTF-16LE ของ envelope ดังกล่าว | 7,620,078 ไบต์ |

ตัวอย่าง envelope นี้ยังไม่มี worksheet/key, คำตอบ, ข้อมูล THEOS, assessment และผลบทอื่น ขนาดจึงเป็นเพียงส่วนหนึ่งของข้อมูลจริง โดยผลจาก provider ที่มีข้อมูลออนไลน์อาจมีขนาดต่างกัน **ยังไม่ได้วัด quota หรือทำให้เกิด storage failure ในเบราว์เซอร์จริงรอบนี้** ตัวเลข UTF-16 เป็นการเข้ารหัสสตริงเพื่อเปรียบเทียบขนาด ไม่ใช่การอ้างว่าทุก browser คิด quota แบบเดียวกัน ข้อที่ยืนยันได้คือขนาดและการทำซ้ำที่ไม่จำเป็น ซึ่งเพิ่มความเสี่ยงต่อ quota และต้นทุน stringify/save แบบ synchronous อย่างมาก

คำสั่งพิสูจน์แบบอ่านอย่างเดียวจากโฟลเดอร์ source (PowerShell):

```powershell
& 'C:/Program Files/nodejs/node.exe' --experimental-strip-types --input-type=module -e "import {readFileSync} from 'node:fs'; import {measuredActivity} from './src/physics/propagator/activity.ts'; const h=JSON.parse(readFileSync('./src/data/solar-daily.json','utf8')); const a=measuredActivity(h,null); const text=JSON.stringify(a.series); const one={snapshot:{source:{activity:a.series}}}; const duplicate=JSON.stringify({last:one,passedRecord:one}); console.log(JSON.stringify({days:a.series.f107.length,seriesCharacters:text.length,seriesUTF8Bytes:Buffer.byteLength(text,'utf8'),seriesUTF16Bytes:Buffer.byteLength(text,'utf16le'),firstPassedRecordEnvelopeCharacters:duplicate.length,firstPassedRecordEnvelopeUTF16Bytes:Buffer.byteLength(duplicate,'utf16le')}));"
```

### ข้อมูลที่แต่ละ case ใช้จริง

เส้นทางแยกใน `src/worksheets/cases.ts:273–277` เป็นหลักฐานว่าไม่ต้องเก็บทุกส่วนของ `CaseSource` ในทุกผล:

| Case | Input ที่ต้องรักษาเพื่อทำซ้ำ key | สิ่งที่ไม่จำเป็นจาก source ปัจจุบัน |
|---|---|---|
| THEOS-2 | ElementSet เต็มที่เปิดใช้จริง, epoch/provenance, worksheet/key และเวลาที่สร้าง | solar activity ทั้งชุด |
| Iridium–Cosmos | ข้อมูล case คงที่ที่ใช้จริง หรือ immutable revision ของ `src/data/iridium33-cosmos2251.json` และ model/constants ที่ใช้; worksheet/key | THEOS-2 และ solar activity ไม่ถูกใช้ใน `iridiumSheet` |
| CZ-5B Y2 | ชุด element เริ่มต้นของ Y2, mass/geometry/Cd, วันตกจริง, activity ที่ใช้ในช่วงทำนาย, worksheet/key และ model/constants ที่ใช้ | THEOS-2; activity หลายสิบปีก่อน/หลังช่วงคำนวณ |

การเก็บ worksheet/key อย่างเดียวช่วยตรวจว่าครั้งนั้นให้คะแนนอะไร แต่ไม่แทน input ทั้งหมดสำหรับ rerun แบบจำลอง ส่วน static data ที่ยังอาศัยไฟล์ใน source ต้องอ้าง revision ที่หาได้จริงหากรายงานอ้างว่า reproducible ข้ามรุ่น ไม่จำเป็นต้องสร้างระบบ backup/restore ใหม่เพื่อแก้บั๊กขนาดครั้งนี้

### เงื่อนไขสำคัญหากตัดช่วง activity ของ CZ-5B

1. `cz5bWorked` ใช้ CZ-5B Y2 จาก epoch ใน `src/data/cz5b.ts` แล้วเรียก `predictReentry` ที่มีค่าเริ่มต้น **365 วัน** (`src/orbit/reentry.ts:80,116`) จึงควรครอบคลุมช่วง `[jd0, jd0 + 365]` รวมวันขอบที่ integrator อาจอ่าน ไม่ควรตัดตามวันตกจริงหรือผล prediction เดิมเพียงอย่างเดียว เพราะจะใช้คำตอบมาจำกัด input และอาจเสียพฤติกรรมเมื่อผลจำลองเปลี่ยน
2. ชุด `DailyActivity` ใช้ `from` เป็น Julian date ของวันแรก; ตำแหน่งวันคือ `floor(jd − from)` (`activity.ts:62–67`) ถ้าตัดเริ่มที่ index `k0` ต้องตั้ง `newFrom = oldFrom + k0` และ slice `f107`, `f107a`, `ap` ด้วยขอบเดียวกัน ความยาวต้องเท่ากันและไม่ว่าง ห้ามเปลี่ยน `from` เป็น `jd0` ที่มีเศษวันโดยไม่เลื่อนข้อมูลให้ตรง
3. ตัดจาก **series ที่คำนวณแล้ว** เพื่อรักษา `f107a` ค่าเฉลี่ย 81 วันและการเลื่อน F10.7 เป็นวันก่อนหน้า ห้ามตัด raw history ให้เหลือเฉพาะช่วงแล้วเรียก `measuredActivity` ใหม่โดยไม่รักษาข้อมูลรอบข้าง เพราะจะเปลี่ยนค่าเฉลี่ย/mean-cycle ที่ใช้เดิม (`activity.ts` ส่วนสร้าง `series` ท้ายฟังก์ชัน)
4. `indicesAt` clamp ไปค่าปลายชุดเมื่อวันที่อยู่นอกช่วง ขณะที่ `indicesOver` เฉลี่ยช่วงวัน (`activity.ts:70–79`) และ mean propagator อาจเฉลี่ย activity ตลอด step (`propagate.ts:268–270`) การตัดสั้นเกินจึงอาจยังให้เลข finite แต่ใช้ค่าปลายชุดผิดอย่างเงียบ ๆ ต้องทดสอบก่อน/บน/หลังขอบวันและช่วงเฉลี่ย ไม่ใช่ทดสอบแค่ว่า parse ผ่าน
5. หาก source เป็นดัชนีคงที่ `{f107,f107a,ap}` ให้คงรูปนั้นไว้; หาก epoch อยู่นอกช่วงข้อมูล ต้องรักษาพฤติกรรม clamp ที่ source เดิมมีอยู่ ไม่สร้างชุดว่างหรือดัชนีเลื่อนผิด

**หลักฐานที่ยังต้องได้หลัง Cloud แก้:** เปรียบเทียบ `indicesAt`/`indicesOver` เดิมกับ cropped ในช่วงใช้งาน; key และเวลาทำนายเดิมเท่ากันภายใน tolerance ของ solver; snapshot ไม่แชร์ reference กับข้อมูลสด; JSON round-trip; ขนาดรวมหลังทำครบสาม case; save/reload ใน browser และข้อความเมื่อ storage ปฏิเสธการเขียน ทั้งหมดนี้เป็นเกณฑ์ตรวจรับที่ยังไม่ได้รันในรอบรายงานนี้

## 2. P2 — คำอธิบายฟิสิกส์ปฏิเสธ feature ที่มีจริง

`src/i18n/en.ts:582`, `ru.ts:565`, `th.ts:567` ใน `dlg.physics.limitsText` ระบุว่า 6-DOF ไม่รวม slosh และ structural flexibility แต่ `src/lessons/builtin/track4.ts:123` เปิด `flex.bending` และเกณฑ์ที่บรรทัด 127 ให้คะแนนว่ามี bending จริง นี่เป็นความขัดแย้งภายในที่ยืนยันได้โดยไม่ต้องเทียบฮาร์ดแวร์

**แก้ขั้นต่ำ:** ระบุว่ามีแบบจำลอง slosh/bending อย่างง่ายเมื่อเปิดใช้ และคงข้อจำกัด detailed heating/landing-leg dynamics ตามสิ่งที่โมเดลยังไม่ได้ทำ อย่าเปลี่ยนเป็นคำรับรองความแม่นยำของ flexibility เทียบจรวดจริง การทดสอบ flight/model หลังเปลี่ยนคำอธิบายเป็นอีกระดับหลักฐาน

## 3. P3 — นิยามคำตอบในโจทย์กรณีศึกษายังไม่ครบ

### CZ-5B: ความคลาดเคลื่อนมีเครื่องหมาย

Prompt `wsc.cz5b.q.error` ที่ `en.ts:3376`, `ru.ts:3355`, `th.ts:3356` ขอ error เป็นร้อยละ แต่ไม่ระบุว่าต้องมีเครื่องหมาย ขณะที่ `src/worksheets/cases.ts:192` คำนวณ `(predicted / actual − 1) × 100` และบรรทัด 217 ใช้ค่านี้ให้คะแนน ค่าบวกแบบ absolute error จึงอาจผิดแม้คำนวณขนาดคลาดเคลื่อนถูก

**แก้ขั้นต่ำทั้ง EN/RU/TH:** ใส่นิยาม `(เวลาทำนาย − เวลาจริง) ÷ เวลาจริง ×100` และระบุว่าค่าติดลบหมายถึงทำนายตกก่อนจริง ไม่เปลี่ยน key, tolerance หรือดัชนีคำตอบ

### Iridium–Cosmos: มุมในกรอบเฉื่อย

Prompt `wsc.iridium.q.angle` ที่ `en.ts:3342`, `ru.ts:3321`, `th.ts:3322` ไม่ระบุกรอบของความเร็ว แต่ตารางระบุ ITRF และ key ใน `src/worksheets/cases.ts:92–106,148` ใช้ความเร็วเฉื่อยผ่าน `inertialVelocity` ดังนั้นผู้เรียนควรได้รับข้อมูลแปลงก่อนตอบ ไม่ต้องเปิด hint เพื่อทราบว่าโจทย์หมายถึงกรอบใด

ในแบบจำลองการหมุนโลกที่ใช้ที่นี่ ความเร็วเฉื่อย **เมื่อยังเขียนองค์ประกอบบนแกนยึดโลก ณ ขณะเดียวกัน** คือ `v_inertial|fixed = v_fixed + ω × r_fixed` ถ้าต้องการองค์ประกอบ ECI ต้องคูณเมทริกซ์หมุนเดียวกันต่อด้วย สำหรับมุมระหว่างเวกเตอร์สองตัว ณ เวลาเดียวกัน การหมุนร่วมไม่เปลี่ยน dot product หรือ norm จึงใช้เวกเตอร์ที่บวกเทอมหมุนแล้วในฐานร่วมนี้หา angle ได้ สูตรและคำอธิบายนี้สอดคล้องกับข้อกำหนดการแปลง state ของ [NASA/JPL NAIF: xf2rav_c](https://naif.jpl.nasa.gov/pub/naif/toolkit_docs/C/cspice/xf2rav_c.html) ซึ่งอธิบายเทอมความเร็วจากผลคูณเวกเตอร์ของ angular velocity กับตำแหน่ง; การนำมารวมกับความเร็วสัมพัทธ์เป็นการใช้ transport theorem กับโจทย์นี้

**แก้ขั้นต่ำ:** ระบุ “มุมระหว่างความเร็วในกรอบเฉื่อย”, ให้ `ω = (0,0,7.2921159×10⁻⁵) rad/s` ตาม `src/physics/constants.ts:13` และบอกสูตรข้างต้นโดยใช้หน่วยตำแหน่ง/ความเร็วให้สอดคล้องกัน การแก้นี้ไม่ควรอ้างว่าเป็นการแปลง ITRF→GCRS ความแม่นยำสูงครบ polar motion/precession/nutation; key ปัจจุบันใช้แบบจำลองการหมุนอย่างง่าย

## 4. P3 — ข้อสอบไฮโดรเจนจัดตัวอย่าง main stage เป็น upper stage

`src/lessons/assessment/bank/rockets.ts:262–264` ใน `r-hydrogen-first` ทั้ง EN/RU/TH ยก “Centaur, Ariane core with boosters, Shuttle with SRBs” ต่อจากคำว่า upper stages การจัดกลุ่มนี้ทำให้ผู้เรียนเข้าใจผิดว่า main propulsion ของ Ariane/Shuttle เป็นตัวอย่างท่อนบนแบบเดียวกับ Centaur

Centaur เป็นตัวอย่าง upper stage ที่ใช้ hydrogen/oxygen ได้ตรงตามการจัดกลุ่มเดิม NASA ระบุทั้งชื่อ upper stage และคู่เชื้อเพลิงนี้โดยตรง [NASA: Centaur — A NASA Workhorse](https://www.nasa.gov/image-article/centaur-nasa-workhorse/)

ESA แยก EPC ของ Ariane 5 เป็น **cryogenic main stage** ซึ่งใช้ hydrogen/oxygen และต่อกับ upper stage ที่อยู่เหนือขึ้นไปอย่างชัดเจน จึงไม่ควรเรียก EPC ว่าท่อนบนในประโยคนี้ [ESA: Ariane 5 cryogenic main stage](https://www.esa.int/Enabling_Support/Space_Transportation/Ariane/Ariane_5_cryogenic_main_stage_EPC)

รายงานคณะกรรมาธิการของ NASA อธิบายว่าเครื่องยนต์หลักสามเครื่องของ Shuttle ใช้ hydrogen/oxygen จาก External Tank และมีแรงขับตั้งแต่ liftoff ร่วมกับ SRBs ก่อนทำงานต่อหลัง booster separation จึงเป็นตัวอย่างการใช้ไฮโดรเจนในระบบขับดันหลักขณะไต่ระดับ ไม่ใช่ตัวอย่าง upper stage ที่เริ่มทำงานหลังทิ้งท่อนล่าง [NASA: Rogers Commission, Chapter I, Main Engines / Solid Rocket Boosters](https://www.nasa.gov/history/rogersrep/v1ch1.htm)

**แก้ขั้นต่ำโดยคง scoring:** แยกประโยคเป็น “ใช้ในท่อนบน เช่น Centaur และใช้ในระบบขับดันหลักที่มี boosters ช่วยยกตัว เช่น Ariane 5 และ Shuttle” ไม่ต้องเปลี่ยนคำตอบที่ถูกหรือเพิ่มคำถามใหม่

## 5. บท 4.3: ขั้นตอนที่สั่งกับเกณฑ์ให้คะแนนยังต่างกัน

`src/lessons/builtin/track4.ts:80–82` สั่ง pitch step 2° ค้าง 8 s และให้บิน baseline/retune แต่ `src/lessons/measures.ts:79–91` ตรวจ axis/kind, window 30 s หลัง max-Q, hold ≥5 s, finished/not-aborted แล้วเลือกครั้งสุดท้าย ไม่มีการตรวจ magnitude=2°, hold=8 s หรือคู่ baseline/retune นี่เป็นข้อเท็จจริงจาก source; **รอบนี้ไม่ได้บินตัวอย่างนอกโจทย์เพื่ออ้างว่า pass จริง**

ถ้า scope ปัจจุบันยังไม่เพิ่มการเก็บคู่ทดลอง ให้แก้ brief เป็นคำแนะนำการทดลอง 2°/8 s และบอกเกณฑ์ที่ให้คะแนนจริงอย่างตรงไปตรงมา การบังคับ baseline/retune และตรวจทุกองค์ประกอบของการทดลองเป็นงานพัฒนาที่แยกไว้ก่อน อย่าเปลี่ยนนโยบาย reveal/retry โดยรวมตามรายงานนี้

## 6. ข้อเดิมที่ patch ในเครื่องแก้ทาง source แล้ว

| ข้อเดิม | หลักฐาน source ปัจจุบัน | ขอบเขตคำยืนยัน |
|---|---|---|
| draft หายเมื่อ hint/เปลี่ยนภาษา | `lesson-mode.ts:609–610,769–770,782–783`; `answer-drafts.ts` | มี raw draft สำหรับ flight numeric และ case numeric/radio; ต้องตรวจ browser ต่อ |
| save warning ไม่ขึ้นใน case/assessment | `lesson-mode.ts:695,911` | มีจุด render แล้ว; ยังต้องจำลอง write refusal จริง |
| review ไม่มีรูป/กราฟ | `assessment-view.ts:517–529` | เรียก figure/observe จาก prepared values แล้ว; browser visual/layout ยังแยกตรวจ |
| คำแนะนำบอกไม่มีจุดอ่อนทั้งที่สั่ง review | `score.ts:175–184`, `assessment-view.ts:455–459` | มี explicit-review fallback และแสดงใน weak list |
| Sputnik/Vostok/Apollo rubric กว้างเกิน | `track5.ts:106,143,180` | เพิ่ม payload/inclination/apogee bands แล้ว; counterexample ใหม่ต้องรันตามเกณฑ์ |
| guidance lock ไม่ตรวจ PEG/IGM | `grader.ts:184` | เพิ่ม explicitGuidance comparison แล้ว |
| เนื้อหาคลังข้อสอบที่ผิดในรายงานแรก | ดู `learning-validation-TH.md` | แก้ข้อความโดยคง key/index/formula; ไม่ใช่รับรอง bank ทั้งชุดทุกมิติ |

หลักฐานทดสอบที่มีอยู่จากช่วงก่อนรายงานฉบับนี้คือ `learning-focused-results.json` **63/63 ผ่าน** และ `learning-bank-compatibility.json` ที่แสดงว่า scoring structure ทั้ง **157 ข้อ** ไม่เปลี่ยน พร้อมตรวจโครงสร้าง **926 text triples / 2,778 strings** ไม่พบข้อความหายหรือ placeholder ต่างกัน **ไม่ได้รัน suites เหล่านี้ซ้ำใน follow-up นี้ และไม่ใช่ผลตรวจ patch ของ Cloud**

## 7. ขอบเขตการตรวจภาษาและคุณภาพข้อสอบ

รายงาน 28 ก.ย. มี inventory ครบ 157 ข้อ อ่าน EN prompt/options/explanations และเทียบ TH/RU prompt กับคำตอบที่ทำเครื่องหมายไว้ แต่ TH/RU explanation/distractor ได้ตรวจเจาะจุดตาม findings ไม่ใช่บรรณาธิกรอิสระทุกประโยค รายงาน follow-up นี้ตรวจจุดผิดที่ยืนยันได้และความสอดคล้องของ patch ไม่ได้ขยายคำกล่าวอ้างเป็น “ตรวจภาษา/วิชาการครบทุกประโยคของทุกข้อแล้ว”

การตรวจ schema, placeholder, numeric combinations, deterministic draws, unit tests หรือ browser completion **ไม่รับรองความยาก/อำนาจจำแนก/ความเที่ยง/ความตรงเชิงสถิติของข้อสอบ** ไม่มีการอ้างคะแนนจากการตอบทดสอบว่าเป็นคะแนนความรู้ของเจ้าของเว็บไซต์ ให้คงผลทดสอบของแต่ละชั้นแยกจากการรับรองคุณภาพการวัดผลและการรับรองโมเดลเทียบข้อมูลบินจริง

จุดที่ยังรอหลักฐานจาก Cloud/ทีมหลัก: diff ที่แก้จริง, focused regressions ของ snapshot/case prompts, browser save/reload/refusal, draft/radio persistence, figure review และผลการทดลองที่เคยขาด ไม่ควรปิด findings เพียงเพราะมีการส่งคำขอแก้ไปแล้ว
