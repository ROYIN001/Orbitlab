# Orbitlab — รายการตรวจนำเข้า/ส่งออกผ่านเบราว์เซอร์

วันที่ 29–30 กันยายน 2026 · รวม inventory จาก source และผลใช้งานจริงใน local production preview พร้อมผลส่งออกกรณีศึกษา 24 ไฟล์บน CI รุ่น `4cf7e3f` ช่องทางและ schema ตรวจเทียบกับ `source-integrated`; envelope ของผลการเรียนยังเป็น v1

**ผล browser จริงอยู่ในตาราง C01–C34 ส่วน 6** พร้อมชื่อหลักฐานและขอบเขตที่ตรวจได้บางส่วน ส่วน 1–4 เป็นทะเบียนช่องทางและแผนเดิม จึงไม่ใช้รายการเมนูแทนผลผ่าน ใช้ไฟล์ QA สังเคราะห์ ไม่ใช่ไฟล์ส่วนตัวหรือคะแนนของเจ้าของเว็บ

Path ในตารางต่อไปนี้อ้างจาก `audit-2026-09-29/source-integrated/` เว้นแต่ระบุเป็นอย่างอื่น ใช้บัญชี/โปรไฟล์ทดสอบ และชื่อสมมติ เช่น `QA-นำเข้า-Тест` เพื่อไม่ปะปนกับผลการเรียนจริงของเจ้าของเว็บ

## 1. ช่องทางนำเข้าไฟล์ที่พบครบทั้ง 7 กลุ่ม

| ID | เส้นทางเมนูและป้าย EN / TH | ไฟล์และ schema | Entry point / parser |
|---|---|---|---|
| I1 | Launch → Explore/Engineer → **Share & save the mission / แชร์และบันทึกภารกิจ** → **Open file / เปิดไฟล์** (`#btn-mission-open`) | `.orbitlab.json`, `.json`; `format: orbitlab.mission`, version 1/2 (เขียนใหม่ v2), `mission` object | `src/ui/mission-share.ts:100–114,174`; `src/config/mission-file.ts:265` → `validateConfigInput` |
| I2 | Launch → telemetry panel → **Compare with another flight / เทียบกับเที่ยวบินอื่น** → **Open flight / เปิดเที่ยวบิน** (`#btn-compare-open`) | `.orbitlab-flight.json`, `.json`; `format: orbitlab.flight`, version 1; `flight` มี label, mission, launchJd, telemetry, events, path | `src/ui/compare.ts:67–82`; `src/replay/reference.ts:97` |
| I3 | Build → Explore → **Your designs / แบบของคุณ** → **Import a file / นำเข้าไฟล์** (`data-k="store:import"`) | `.orbitlab.json`, `.json`; `format: orbitlab.design`, version 1, kind=`vehicle`, name, design=`VehicleSpec`; export มี created/updated | `src/ui/build/explore-store.ts:61–67,160`; `src/design/design-store.ts:222` → `designProblems` → `vehicleSpecProblems` |
| I4 | **Lessons / บทเรียน** → **Open lesson file… / เปิดไฟล์บทเรียน…** | `.orbitlab-lesson.json`, `.json`; `format: orbitlab.lessons`, version 1/2, lessons[] และ/หรือ questions[] | `src/ui/lessons/lesson-mode.ts:943–950,1073`; `src/lessons/lesson-file.ts:347` |
| I5 | Orbit → Explore/Engineer → **Real satellites / ดาวเทียมจริง** → ล่างแผงซ้าย **Read a file of element sets… / เปิดไฟล์ชุดค่าองค์ประกอบวงโคจร…** | `.txt,.tle,.3le,.2le,.json,.csv,.xml,.kvn`; TLE 2/3 บรรทัดหรือ OMM 4 รูปแบบ; ขนาดไม่เกิน **30 MiB** | `src/ui/orbit/sky-panel.ts:544–589`; `src/orbit/omm.ts:189,210` → `elementsFromOmm`; TLE → `src/orbit/tle.ts:parseTleFile` |
| I6 | Orbit → Real satellites → เลือกวัตถุที่ SGP4 คำนวณได้ → แผง **Close approaches / การเข้าใกล้กันของวัตถุในวงโคจร** → **A conjunction data message / ข้อความแจ้งการเข้าใกล้ (CDM)** → **Read a message (.cdm, KVN) / เปิดข้อความ (.cdm, KVN)** | `.cdm,.txt,.kvn`; CCSDS CDM แบบ KVN เท่านั้น; ขนาดไม่เกิน **2 MiB** | `src/ui/orbit/sky-panel.ts:1258–1283`; `src/orbit/cdm.ts:75` |
| I7 | Launch → Watch → เมนูเลือกเที่ยวบิน → ท้ายเมนู **Launch audio / เสียงการปล่อยจรวด** → แถวภารกิจ → **Add recording / เพิ่มไฟล์เสียง** | `audio/*`, `video/mp4`, `video/webm`; มีช่อง **Liftoff at / ทะยานขึ้นที่** รับวินาทีหรือ `MM:SS` / `HH:MM:SS` | `src/main.ts:501` ต่อ pickerFooter; `src/ui/soundtrack-panel.ts:34–80`; `src/audio/soundtrack.ts:saveUserSoundtrack` เก็บ Blob ใน IndexedDB |

ข้อควรรู้ของ parser:

- **I1 เป็น partial recovery**: ค่าภารกิจผิดจะถูก reset พร้อมแจ้งชื่อ field; ไฟล์ต่างชนิด/JSON เสียต้องไม่เปลี่ยนภารกิจ รุ่นใหม่กว่ารับเฉพาะส่วนที่รู้จักพร้อมเตือน `newerVersion` อย่าตั้งเกณฑ์ว่าต้อง reject ทั้งไฟล์เมื่อ payload ผิดเพียงช่องเดียว
- **I2 เป็น reference สำหรับเปรียบเทียบ** ไม่ใช่ import recording เพื่อเล่น replay เต็มรูปแบบ ข้อมูล telemetry มี `t,alt,vInertial,vAir,q,gLoad,mass,pitch,ap,pe,inc,dvRemaining,downrange`; `null` เป็นช่องว่างของ trace ได้; path=`{t:[],x:[],y:[],z:[]}` ยาวเท่ากัน หน่วย ECI เมตร
- **I3 เป็น vehicle-only**: ไม่เก็บ payload/ฐาน/เป้าหมายวงโคจร Import สร้าง record ใหม่ ไม่ควรคาดว่า record ID, created/updated เดิมจะคงเหมือนกันทุกตัวอักษร ชื่อรับ 1–80 ตัวอักษร; จรวดผิด schema ต้องปฏิเสธทั้งแบบ รุ่นใหม่กว่าจะเตือนถ้า design ยังอ่านได้
- **I4 รับบางรายการได้**: lessons/questions ที่ใช้ได้เข้าคลัง ส่วนรายการเสียต้องมีรายละเอียด issues; ID ซ้ำในไฟล์ต้องรายงาน ไม่ใช่รับซ้ำโดยเงียบ v1 รองรับ flight lessons, v2 เพิ่ม case lessons ส่วนการ export lesson package ไม่มีปุ่ม UI ในรุ่นนี้ แม้มี `lessonFileText()` ภายใน
- **I5 ตรวจจากเนื้อหา ไม่ใช่นามสกุล**; OMM JSON รับ object เดียวหรือ array และตัวเลขแบบ number หรือ string; keywords ที่ต้องมี: EPOCH, MEAN_MOTION, ECCENTRICITY, INCLINATION, RA_OF_ASC_NODE, ARG_OF_PERICENTER, MEAN_ANOMALY, NORAD_CAT_ID, BSTAR, MEAN_MOTION_DOT, MEAN_MOTION_DDOT รับ SGP4/SGP/SGP4; ephemeris 0/2/3; ปฏิเสธ SGP4-XP/type 4 รวมทั้ง e≥1, mean motion≤0, inclination นอก 0–180°
- **I6** ต้องมี CCSDS_CDM_VERS, TCA และ OBJECT สองรายการ แต่ละรายการมี X/Y/Z/X_DOT/Y_DOT/Z_DOT และ covariance CR_R/CT_R/CT_T/CN_R/CN_T/CN_N; frame ต้องตรงกันและเป็น EME2000/GCRF/ITRF ตำแหน่ง/ความเร็วในไฟล์ใช้ km และ km/s, covariance ใช้ m²; `COMMENT HBR = ...` เป็น optional
- **I7** file chooser filter ไม่ใช่การตรวจ codec จริง การขึ้นชื่อไฟล์ไม่ได้ยืนยันว่าเล่นได้ ต้องทดลองเล่นเสียงและ offset จริง; ข้อมูลเก็บในเครื่อง ไม่มี upload ไป service ใน code path นี้

## 2. ช่องทางส่งออกและ copy-link

| ID | ป้ายเมนู EN / TH | สิ่งที่ต้องได้และวิธีตรวจ | Source |
|---|---|---|---|
| E1 | I1 → **Save file / บันทึกไฟล์** (`#btn-mission-save`) | JSON `orbitlab.mission` v2 → เปิดกลับด้วย I1 และเทียบค่าภารกิจ | `mission-share.ts:168`; `config/mission-file.ts:348` |
| L1 | I1 → **Copy link / คัดลอกลิงก์** (`#btn-mission-link`) | URL query `m=` ขึ้นต้น `z` (deflate-raw base64url) หรือ `j` (JSON base64url); เปิดแท็บใหม่แล้วได้ mission เดิม หาก clipboard ไม่อนุญาตจะใส่ URL ใน address bar | `mission-share.ts:60,151`; `config/mission-file.ts:329–343`; `main.ts:884` |
| E2 | I2 → **Save flight / บันทึกเที่ยวบิน** (`#btn-compare-save`) | `.orbitlab-flight.json` ของเที่ยวบินบนจอ; เปิดกลับเป็น reference แล้วกราฟ/เส้นทางแบบ dashed และตารางเปรียบเทียบถูกต้อง | `ui/compare.ts:80`; `replay/reference.ts:89` |
| E3a | I3 → **Export this design / ส่งออกแบบนี้** (`data-k="store:export"`) | แบบที่อยู่บนจอ แม้ยังไม่ Save; `.orbitlab.json` format=`orbitlab.design` | `ui/build/explore-store.ts:153,195` |
| E3b | I3 → แถวแบบที่บันทึก → **Export / ส่งออก** | แบบจาก record ที่เลือก ไม่ใช่ draft ปัจจุบัน; import กลับแล้วชื่อ/ขั้น/เครื่องยนต์/มวล/มิติเดิม | `ui/build/explore-store.ts:139–150, item()` |
| E4 | Launch telemetry → **Export CSV / ส่งออก CSV** | CSV ของ **live flight ทั้งชุด** รวม telemetry และ event log; เปลี่ยน replay cursor แล้วไม่ควรตัดข้อมูลเหลือแค่ cursor; 6-DOF มี schema/model/body/actuator columns เพิ่ม | `ui/telemetry.ts:264,727`; `ui/csv.ts:buildTelemetryCsv` |
| E5 | Launch Engineer → Monte Carlo → **Download CSV / ดาวน์โหลด CSV** | `orbitlab_montecarlo_<vehicle>_<orbit>_seed<n>.csv`; จำนวนแถวสัมพันธ์กับ runs ที่เสร็จ และ seed/parameters ตรง UI | `ui/monte-carlo.ts:370`; `physics/monte-carlo-job.ts:157`; `physics/monte-carlo.ts:346` |
| E6 | เลื่อน pointer เหนือกราฟหรือ focus กราฟด้วย Tab → **PNG** | รูป PNG ที่เป็นกราฟจริง มีชื่อแกน หน่วย legend อ่านได้; default **2400×1200 px**; ครอบคลุมกราฟผ่าน `drawChart` ไม่ใช่ export ภาพ canvas 3-D ทุกอัน | `ui/chart-export.ts:42,62,93–140` |
| E7 | Launch telemetry → **Flight report / รายงานเที่ยวบิน** (`#btn-flight-report`) | HTML รายงานเที่ยวบิน มีภาพกราฟฝังในไฟล์ + ข้อมูลเที่ยวบิน + mission link; เปิดไฟล์ที่ดาวน์โหลดแบบ offline ได้; ชื่อ `orbitlab-report-...-<lang>.html` | `ui/report.ts:202–230`; `ui/telemetry.ts:270` |
| E8 | Lessons → **Export results / ส่งออกผลการเรียน** | `.orbitlab-results.json`, format=`orbitlab.results`, version=1, exportedAt, student?, progress, summary?, checksum SHA-256; ไม่มี UI นำกลับเป็น progress ในรุ่นนี้ | `ui/lessons/lesson-mode.ts:1096`; `lessons/progress.ts:ResultsFile,resultsFile,verifyResults` |
| E9 | Lessons → **Worksheets / ใบงาน** → **Format / รูปแบบไฟล์** → HTML หรือ Word → **Download the worksheets / ดาวน์โหลดใบงาน**, **Download the answer key / ดาวน์โหลดเฉลย** | HTML และ DOCX เป็นคนละ export branch ต้องลองทั้งคู่ ทั้งใบงานและเฉลย; เที่ยวบินต้อง ended จึงกดได้; case lesson ใช้ข้อมูลที่ตรึงไว้และ key มีเงื่อนไขเปิด | `ui/lessons/worksheet-view.ts:119–153,203–230`; `src/worksheets/` |
| E10 | Orbit → Real satellites → **Worksheets from real cases / ใบงานจากกรณีจริง** → Iridium/CZ-5B/THEOS-2 → **The sheet (HTML) / ใบงาน (HTML)**, **The answer key (HTML) / เฉลย (HTML)** | HTML กรณีจริงทั้ง 3 เคส; key เปิดเมื่อผ่าน/reveal ตามระบบ; ไม่ใช่การส่งออก OMM/CDM | `ui/orbit/sky-panel.ts:1364–1393` |
| L2 | แถบบทเรียนที่เปิด → **Copy link / คัดลอกลิงก์** | URL `?lesson=<id>` เปิดบทเรียนเดิม; ลิงก์บท custom มีเพียง ID ไม่บรรจุ lesson package จึงไม่ใช่วิธีแจกบทให้ browser ใหม่ที่ยังไม่ได้ import | `ui/lessons/lesson-mode.ts:820`; reader `:363` |

CSV, PNG, HTML, DOCX และ results JSON เป็น **export-only** ตาม UI ปัจจุบัน อย่าทดสอบนำกลับผ่านช่อง mission/design แล้วนับการปฏิเสธว่าเป็นบั๊ก ต้องใช้ parser ให้ตรงชนิด

## 3. Fixtures สาธารณะที่อยู่ใน repo พร้อมใช้

| Fixture | Path | ใช้กับ |
|---|---|---|
| ISS, CelesTrak 3-line TLE | `tests/fixtures/gp/iss.tle` (168 bytes) | I5; ชื่อ ISS (ZARYA), NORAD 25544 |
| ISS 2-line TLE | `tests/fixtures/gp/iss.2le` (142 bytes) | I5; ไม่มีชื่อในไฟล์ เป็นปกติ |
| ISS OMM JSON | `tests/fixtures/gp/iss.json` (422 bytes) | I5; array หนึ่ง record, epoch 2026-09-26T09:35:46.493952 |
| ISS OMM CSV | `tests/fixtures/gp/iss.csv` (374 bytes) | I5 |
| ISS OMM XML | `tests/fixtures/gp/iss.xml` (1204 bytes) | I5 |
| ISS OMM KVN | `tests/fixtures/gp/iss.kvn` (632 bytes) | I5 |
| ที่มาของ 6 รูปแบบ | `tests/fixtures/gp/README.md`; `tests/omm.test.ts` | มี provenance เดียวกันและ expected equivalence; เป็นข้อมูลเก่า ไม่อ้างว่าเป็นตำแหน่ง ISS ปัจจุบัน |
| Lesson package v1 | `tests/fixtures/lessons/v1.orbitlab-lesson.json` | I4; มีบท `orbit-first` |
| NASA CARA numerical conjunction cases | `tests/fixtures/conjunction/cara-cases.json` | **ไม่อัปโหลด JSON นี้ตรง ๆ ใน I6**; สร้าง `.cdm` จาก case ตาม `kvn()` ใน `tests/cdm.test.ts:28` (CCSDS_CDM_VERS/TCA/2 objects/covariance) |
| เสียง Soyuz MS-27 ที่มากับแอป | `public/audio/soyuz-ms-27-nasa.mp3` (3,600,821 bytes); ที่มา `public/audio/CREDITS.txt` | I7; T-0 อยู่ที่ **60.0 s** จึงใช้ offset `1:00` |
| Mission/flight/design valid | สร้างด้วย **E1/E2/E3** จาก browser build ที่กำลังตรวจ | เป็น fixture roundtrip ที่ตรง schema จริง ดีกว่า hand-write โดยเดา fields |

ข้อมูลใน `public/data/satellites.json`, `space-weather.json`, `earth-orientation.json` เป็น envelope `format: orbitlab.snapshot`, version 1, dataset, source, asOf, fetched, data ไม่ใช่ไฟล์ I5 โดยตรง ถ้าต้องการ OMM จำนวนมากให้ดึง `data.groups[].sets[]` ออกเป็น array ใหม่ โดยไม่เปลี่ยนต้นฉบับ

**Space weather / EOP ไม่มี user file-upload UI ใน source นี้**: แหล่งข้อมูลเลือกผ่าน **Data sources / แหล่งข้อมูล** (`src/ui/data-dialog.ts:79–128`), provider โหลด snapshot/online/cache; NOAA ใช้ `parseSwpc`/`validSpaceWeather` (`provider/space-weather.ts`), IERS ใช้ `parseIersFinals`/`validEarthOrientation` (`provider/earth-orientation.ts`) การยืนยันสองชุดนี้ควรตรวจ data mode, source label, fallback และ consumers ไม่สร้างหัวข้อ “upload weather ผ่าน browser” ที่ไม่มีจริง

## 4. รายการตรวจรับแบบมีขอบเขต 34 ข้อ

ทุกข้อเริ่มสถานะ **ยังไม่ได้ตรวจใน checklist นี้** ให้บันทึกชื่อไฟล์, SHA-256, build/commit, browser/viewport, screenshot หรือผลอ่าน artifact ไว้ภายหลัง แยก downloaded สำเร็จออกจากเปิดอ่านแล้วถูกต้อง

| ID | การทดสอบ | เกณฑ์รับ |
|---|---|---|
| C01 | E1→เปลี่ยน payload/ฐาน→I1 เปิดไฟล์เดิม | mission เดิมกลับครบ รวม UTC, guidance, recovery/dynamics ถ้ามี |
| C02 | I1 ด้วย exported mission ที่เปลี่ยน payloadMass เป็น -1 | แจ้ง warning field; reset ตาม validator; ไม่สร้าง mission ผิดเงียบ ๆ |
| C03 | I1 ด้วย `{broken`, `{}`, และไฟล์ design จาก E3 | แจ้งอ่านไม่ได้/format; mission เดิมไม่เสีย |
| C04 | L1 เปิด URL ที่คัดลอกในแท็บใหม่ + `?m=invalid` | valid คืน mission; invalid ไม่ crash และมี notice |
| C05 | E2 หลังเที่ยวบินจบ→I2 เปิดไฟล์เดียวกัน | reference label/table/dashed traces/path ถูก; flight ปัจจุบันยังอยู่ |
| C06 | I2 malformed JSON, path arrays ยาวไม่เท่ากัน, mission-file ผิดชนิด | ปฏิเสธ พร้อมข้อความ; reference ที่ยอมรับครั้งก่อนยังใช้ได้ |
| C07 | I2 แก้ `path.x[0]` เป็น literal JSON `1e309`; อีกไฟล์แก้ event.t แบบเดียวกัน | ต้องไม่ทำให้กราฟ/WebGL เป็นค่าไม่ finite; บันทึกเป็น bug หาก parser ยอมรับจนภาพเสีย |
| C08 | E4 point-mass หลังบินเสร็จและขณะเลื่อน Replay กลับกลางเที่ยว | CSV ทั้งเที่ยว, เวลา/หน่วย/แถว event ตรงข้อมูลจริง ไม่ถูกตัดตาม cursor |
| C09 | E4 6-DOF + notation ISO/Russian | columns กายแข็ง/actuator และ notation ที่ส่งออกตรงตัวเลือก, JSON cells quote ถูก |
| C10 | E5 batch ขนาดเล็กหนึ่งชุด | CSV เปิดได้ จำนวน completed runs ตรง UI, seed และ run IDs ถูก |
| C11 | E6 hover และ Tab→PNG ของ telemetry และ engineering chart | เกิด download จริง ขนาด 2400×1200, ชื่อแกน/หน่วย/legend ไม่ถูกตัด |
| C12 | E7 หลังมี flight และ chart | HTML เปิด offline ได้ มีรูป/ผล/ชื่อภารกิจของเที่ยวเดียวกัน |
| C13 | E3a draft ที่ยังไม่ save→I3 | geometry/engine counts/name กลับตรง draft |
| C14 | E3b saved record A ขณะเปิด draft B→I3 | export ได้ A; import record ใหม่ ไม่ทับ B หรือ saved เดิม |
| C15 | I3 กับ E1 mission, malformed JSON, kind=satellite, stages=[] | ปฏิเสธทั้งแบบ และข้อมูล saved เดิมยังอยู่; mission-file มีคำบอกให้เปิดใน Launch |
| C16 | I3 version=999 แต่ vehicle valid | ยอมรับตาม parser พร้อม warning newerVersion; ค่าที่รู้จักคงเดิม |
| C17 | I3 valid สองครั้ง + cancel file picker + เลือกไฟล์เดิมซ้ำ | cancel ไม่เปลี่ยน state; handler ทำงานซ้ำ; record ใหม่สอดคล้องสัญญา import |
| C18 | I5 import ISS `.tle` | อ่าน 1 record, NORAD/epoch ถูก, เลือกแล้ว 3-D/ground track/facts ใช้ได้ |
| C19 | I5 import ISS `.2le` | เช่น C18; ไม่มีชื่อในต้นฉบับไม่ถือเป็น defect |
| C20 | I5 import ISS `.json` | เช่น C18; กลุ่ม Your file แสดง filename/จำนวนถูก |
| C21 | I5 import ISS `.csv` | ค่า/ตำแหน่ง ณ epoch เดียวกันเท่ากับ JSON ภายใน precision |
| C22 | I5 import ISS `.xml` | ค่า/ตำแหน่งเท่ากับ JSON |
| C23 | I5 import ISS `.kvn` | ค่า/ตำแหน่งเท่ากับ JSON |
| C24 | I5 JSON `[valid, missing BSTAR, valid]` และ SGP4-XP/type4 | mixed รับสอง record พร้อมรายงานตำแหน่งรายการเสีย; theory ผิดถูกปฏิเสธ |
| C25 | หลัง valid I5 → `[not json`, `hello`, checksum TLE ผิด | error อ่านง่าย; accepted scene/selection และ provenance ต้องไม่กลายเป็นข้อมูลคนละไฟล์ |
| C26 | I5 ไฟล์ข้อความสังเคราะห์ >30 MiB และ I6 >2 MiB | แจ้ง limit โดยไม่ parse/เปลี่ยน accepted data; ใช้ไฟล์สังเคราะห์ ไม่ใช่เอกสารผู้ใช้ |
| C27 | I6 `.cdm` จาก CARA fixture case แรกตาม helper | ชื่อสองวัตถุ/TCA/HBR อ่านได้; Pc เทียบกับ expected ของ fixtureตาม tolerance เดิม 0.5% |
| C28 | I6 เอา OBJECT2 ออก, ลบ CN_N, frame=TOD, JSON ผิดชนิด | ข้อความ error เจาะสาเหตุ; ไม่แสดง Pc ของไฟล์เก่าเป็นผลใหม่ |
| C29 | I4 fixture v1 + เปิดบทที่ import + เปลี่ยน TH/EN | คลังมี custom lesson และโจทย์/locks/ข้อความถูก; reload แล้วอยู่ |
| C30 | I4 malformed JSON, `{format:"orbitlab.lessons",version:1}`, และ package มีหนึ่ง valid/หนึ่งเสีย/ID ซ้ำ | ไม่ crash; unusable ไม่เปลี่ยนคลัง; partial issues แสดงและไม่มีรายการเสียแอบเข้าคลัง |
| C31 | E8 ชื่อสมมติหลังมี lesson/assessment sample | JSON มี progress/summary/checksum ถูก `verifyResults`; ไม่กล่าวว่าเป็นคะแนนเจ้าของเว็บ; พยายามเปิดผ่าน I4 ต้องถูกปฏิเสธต่าง format |
| C32 | E9 flight worksheet+key ทั้ง HTML/DOCX; case worksheet+key เมื่ออนุญาต | เปิดจริง ตรวจภาพ ตาราง ไทย/รัสเซีย สมการ และคำตอบ; key ที่ยังล็อกต้องไม่ดาวน์โหลดได้ |
| C33 | E10 3 กรณี Iridium/CZ-5B/THEOS-2 + L2 บท built-in | HTML case ข้อมูลตรง case; key gating; lesson link เปิดบทถูก โดยไม่บรรจุ custom package โดยปริยาย |
| C34 | I7 MP3 bundled offset 1:00→ดูเที่ยวบิน→reload→Remove; offset `bad`/ไฟล์ไม่ใช่เสียง | ชื่อ/offset/เสียงเล่นจริงและอยู่ข้าม reload; remove กลับ bundled/synthetic; input ผิดไม่แสร้งว่าพร้อมเล่น |

C32 และ C33 เป็นกลุ่มย่อยแบบตายตัว (2 format × 2 output + case, และ 3 cases) ไม่ใช่ตัวเลข unique automated tests และอย่าอ้างว่า 34 ข้อนี้ผ่านจนมีหลักฐานทุกแถว

## 5. ประเด็นที่พบจากsource และสถานะหลังตรวจ

1. เส้นทางsatelliteimportที่เคยเปลี่ยนmetadataเมื่อไฟล์ใหม่ถูกปฏิเสธแก้แล้ว และbrowserยืนยันacceptedISSเดิมยังอยู่ ดูC24–C26และ `browser-import-evidence.json`
2. ReferenceJSONoverflow `1e309` เคยผ่านการตรวจชนิดnumber: แก้finitevalidationแล้ว regression48/48และC06–C07browserยืนยันerrorพร้อมเก็บreferenceเดิม
3. File.text()/IndexedDB failure ของบาง importer ยังไม่มี catch ครอบทั้ง event handler; ต้องแยก “ผู้ใช้ยกเลิก picker” ออกจาก “อ่านไฟล์/เขียน storage ไม่สำเร็จ” และไม่ตีความชื่อไฟล์ที่ขึ้นแล้วว่า save/playback สำเร็จ
4. อย่าปรับคะแนน/เฉลยหรือกด reveal ในโปรไฟล์ส่วนตัวเพื่อผ่าน export-key gate ใช้โปรไฟล์ QA และบันทึกว่าข้อมูลเป็นการทดสอบ
5. ไม่มีช่องนำเข้า results/progress backup, CSV telemetry, PNG/HTML/DOCX, spaceweather/EOP; สิ่งเหล่านี้เป็นขอบเขตพัฒนาใหม่หากต้องการเพิ่ม ไม่ใช่บั๊กจากปุ่มที่ไม่มี

การแก้productionและผลตรวจแต่ละจุดสรุปในรายงานตรวจรับรวม; เอกสารนี้คงIDเดิมเพื่อเทียบแผนกับผลจริงได้

## 6. ผล browser ที่ตรวจเพิ่ม — ใช้ตารางนี้แทนสถานะ inventory ด้านบน

อัปเดต30ก.ย.จากไฟล์หลักฐานที่รันจริงบนlocalproductionpreviewถึงfinal6 ไม่ใช่เว็บสาธารณะ คำว่า“บางส่วน”หมายถึงมีเส้นทางย่อยที่ยังไม่มีหลักฐาน ไม่บวก34แถวนี้เป็นจำนวนautomatedtests

| ID | สถานะตรวจรับปัจจุบัน | หลักฐาน/สิ่งที่ยังขาด |
|---|---|---|
| C01 | ผ่านnormalroundtripหนึ่งภารกิจ | ไฟล์จริงfalcon9-cape-2026-09-29-19-47.orbitlab.jsonนำเข้าผ่านUI; ถอดmissionURLหลังimportเทียบต้นฉบับครบ24leaf/empty-containerpathsตรงทุกค่า รวมUTC19:47:18.006Z, emptyguidance,recoveryfalseและsixDOFwind/seed. `browser-mission-roundtrip-validation.json`; ไม่อ้างทุกmissioncombination |
| C02 | ผ่านกรณีที่กำหนด | negativepayload,unknownvehicle,version999ให้partialrecovery/warningถูกต้องใน `browser-boundary-validation.json` |
| C03 | ผ่าน | brokenJSON,emptyobject,wrongformatถูกปฏิเสธโดยmissionเดิมยังอยู่; boundaryJSON |
| C04 | ผ่านvalid/invalidlink; ไม่ใช่clipboardpass | แชร์ใช้address-barfallbackตามUI แล้วเปิดURLในแท็บใหม่แจ้งMissionloadedfromlink;46MissionSetupcontrolsตรงกันและdecodedpayloadตรงไฟล์ต้นฉบับทุกfield. `browser-mission-link-roundtrip.json`, `browser-mission-roundtrip-validation.json`; `?m=invalid`แจ้งใช้ไม่ได้/missionเดิมไม่เปลี่ยนใน `browser-invalid-mission-link.json` |
| C05 | ผ่านเส้นทางเปรียบเทียบ | actualflightJSONimport/referenceและzero-delta roundtrip; `browser-export-artifacts/production-parser-validation.json`, `launch-space-final.png` |
| C06 | ผ่าน | brokenJSON,missionwrongformat,pathlengthmismatchถูกปฏิเสธและreferenceเดิมยังอยู่; boundaryJSON |
| C07 | ผ่าน | path/event literal1e309ถูกปฏิเสธ; `reference-overflow.json`, boundaryJSONและreference48regression |
| C08 | ผ่าน | pointmassCSV(4)/(5)live/replay600เหมือนทุกไบต์,2,925rows/20events; `browser-export-artifacts/csv-notation-validation.json` |
| C09 | ผ่าน | sixDOFISO/GOST20058-80,1,194rows/116cols;84commoncolsตรง,32mappedcolumns/38,208cellsผ่าน รวม7,933nonzero sign flips; csv-notation-validation.json |
| C10 | ผ่าน | MC20runs/20onTarget/20uniqueindices+seeds;220drawvaluesตรงsummaryCSV; production-parser-validation.json |
| C11 | ผ่านการดาวน์โหลด telemetry และ engineering PNG รวมเส้นทางแป้นพิมพ์ที่ตรวจ | กราฟ telemetry ขนาด 2400×1200 แก้ป้ายซ้อนและตรวจภาพแล้ว; final6 ส่งออก Mass flow ภาษาไทยด้วยการคลิกได้ไฟล์ 127,037 bytes และ Specific impulse ด้วย Tab → Enter ได้ไฟล์ 98,553 bytes ขนาด 2400×1200 ตรวจภาพชื่อ หน่วย และเส้นกราฟครบ ดู `browser-export-artifacts/engineering-png-final6-validation.json` และ `browser-png-keyboard-final6.json` การกด Return ครั้งก่อนที่ไม่มี download ไม่ใช้วินิจฉัยสาเหตุ |
| C12 | บางส่วน/ข้อจำกัดเครื่องมือ | actualHTMLreportมี4tables/8embeddedPNGและโครงสร้างofflineตรวจแล้ว; การเปิดไฟล์จริงด้วยfile://ถูกbrowsersecuritypolicyของเครื่องมือปฏิเสธ ไม่หาวิธีเลี่ยงและไม่ใช้structuralcheckอ้างว่าเปิดofflinebrowserสำเร็จ |
| C13 | ผ่าน | draftBส่งออก8enginesและนำกลับUIได้ชื่อQA-Draft-B/8; `browser-build-export-selection.json`, boundaryJSONท้ายไฟล์ |
| C14 | ผ่าน | ขณะdraftB8activeexportSavedAยัง9จริง; importAกลับเปิด9และเพิ่มrecordใหม่ จากนั้นเปิดBยัง8ไม่ถูกทับ. `browser-build-saved-a-roundtrip.json`checksทั้ง3true พร้อมไฟล์จริง/parserchecksเดิม |
| C15 | ผ่าน | missionwrongformat,brokenJSON,satellitekind,emptystagesปฏิเสธพร้อมsavedเดิม; boundaryJSON |
| C16 | ผ่าน | version999validdesignนำเข้าได้พร้อมwarning; boundaryJSON |
| C17 | บางส่วน | เลือกversion999ไฟล์เดิมสองครั้งสร้างrecordsได้; cancelpickerยังไม่มีหลักฐานแยก |
| C18 | ผ่านรูปแบบ/ค่าที่แสดง | TLEอ่านISSได้; `browser-six-element-formats.json` |
| C19 | ผ่านรูปแบบ/ค่าที่แสดง | 2LEอ่านได้ ไม่มีชื่อไม่ใช่bug; JSONเดียวกัน |
| C20 | ผ่านรูปแบบ/ค่าที่แสดง | OMMJSONอ่านได้; JSONเดียวกัน |
| C21 | ผ่านรูปแบบ/ค่าที่แสดง | CSVอ่านได้และ12factsตรงรูปแบบอื่นณเวลาpausedเดียวกัน |
| C22 | ผ่านรูปแบบ/ค่าที่แสดง | XMLอ่านได้และ12factsตรง |
| C23 | ผ่านรูปแบบ/ค่าที่แสดง | KVNอ่านได้และ12factsตรง; ทั้ง6รูปแบบตรงทุกfieldที่ตรวจ ไม่ใช่proofความแม่นยำtrackingจริง |
| C24 | ผ่าน | mixedรับ2/rejectrecord2missingBSTAR,SGP4-XP/type4ปฏิเสธ; boundaryJSON |
| C25 | ตรวจแล้ว มีข้อจำกัดเดิม | malformed/plaintextปฏิเสธและรักษาข้อมูลเดิม แต่badchecksumTLEยอมรับโดยออกแบบ`requireChecksum=false`; readElementFileไม่ส่งwarningออกมา จึงไม่ผ่านเกณฑ์strictchecksumเดิมในchecklist ไม่เปลี่ยนนโยบายนี้โดยเงียบ |
| C26 | ผ่าน | synthetic30MiB+1OMMและ2MiB+1CDMแสดงsizeguardก่อนparse; boundaryJSON |
| C27 | ผ่าน | validAlfano1CDMให้Pc0.147ตรงfixture0.1467495ภายในtolerance; `browser-import-evidence.json` |
| C28 | ผ่าน | missingOBJECT2,missingCN_N,TOD,JSONwrongformatปฏิเสธและไม่แสดงPcเก่าเป็นผลใหม่; import-evidence+boundaryJSON |
| C29 | ผ่านtitle/locks/import/reload | customv1import/reloadและเปิดEN→TH→ENยืนยันtitle+Falcon/site locksทุกครั้งใน `browser-custom-lesson-language.json`; ไม่ใช่บรรณาธิกรทุกข้อความUIสามภาษา |
| C30 | ผ่าน | broken/missingarrayไม่เพิ่มคลัง; valid+invalid+duplicateเพิ่ม1บทพร้อมissuesครบ; boundaryJSON |
| C31 | ผ่าน | ผลส่งออกจริงตรวจ checksum, สร้าง case keys ใหม่ และตรวจคะแนนซ้ำแล้ว; assessment ในไฟล์ส่งออกรอบนั้นได้ 19% ตรงคะแนนถ่วงน้ำหนัก 7/37 นำเข้าผ่าน I4 ถูกปฏิเสธและ library 25 บทยังคงเดิม ดู ui-case/assessment-export-validation และ boundary JSON ส่วนผล multi รอบ final6 ที่ได้ 4% เป็น QA อีกครั้งและไม่ได้ใช้แทนหลักฐานไฟล์เดิม |
| C32 | ผ่านส่งออก/ภาษา/ภาพตามชุดจริง และ activeIridium/noflightgates | EN/TH/RU mission HTML/DOCX+key ตรวจไฟล์/ภาพแล้ว; case TH/RU หลัง editorial/layout `4cf7e3f` มี 24 actual downloads และ 12 DOCX/18 pages ตรวจภาพครบผ่าน ดู [final case exports](worksheet-case-export-layout-TH.md); activeIridiumก่อนตอบ keyHTMLและworksheetkeydisabledแต่sheetenabled; ไม่มีendedflightทำให้flightsheet/keydisabled. หลังrevealIridiumรอบนั้นไม่ผ่านและkeyenabled. `browser-key-gating-final6.json`. TH→RUasyncยังป้ายTHตรง; ไม่อ้างnegativegateครบ3cases |
| C33 | ผ่านcaseoutputs+lessonlink; gateตามscopeC32 | 3 cases×sheet/key 6 EN HTML ชื่อ/titleตรงหลัง race fix; final case TH/RU ทั้ง HTML/DOCX 24 ไฟล์และภาพ 18 หน้าผ่านบน `4cf7e3f` ตาม [หลักฐาน](worksheet-case-export-layout-TH.md); built-inorbit-firstcopy-link→newtabเปิดบท1.1และlocksCape/Falconตรงใน `browser-lesson-link.json`. GateตรวจactiveIridiumในC32; keysของcaseอื่นขณะIridiumactiveตั้งใจเปิดตามcaseAnswersShownpolicy ไม่ใช่globalgate |
| C34 | ผ่านoffset/invalid/reload/remove; audibility/codecยังค้าง | ป้อนด้วยnativekeyboardได้1:00และอยู่หลังreload; bad/310digitsแสดงerrorโดยเก็บ1:00เดิม; RemoveกลับbundledNASA. `browser-audio-validation.json` และ `browser-audio-final4-{keyboard-reopen,invalid,reload-confirmed,removed}.txt`. การfillที่ไม่emitnativechangeไม่นับเป็นบั๊ก. ยังไม่รับรองเสียงได้ยิน/จังหวะจริงหรือไฟล์codecผิด |

Boundaryfixtures24ไฟล์ที่ใช้สร้างจากข้อมูลทดสอบและไฟล์QAเท่านั้น อยู่ใน `browser-fixtures/boundaries/manifest.json`; ตรวจparser/sizepreconditionsใน `parser-validation.json`. ชุดนี้ไม่ใช้เอกสารส่วนตัว/ไม่uploadไปserviceภายนอก และคำว่าparserผ่านไม่แทนbrowserผลในตาราง
