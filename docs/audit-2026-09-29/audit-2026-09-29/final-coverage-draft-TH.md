# ร่างตารางความครอบคลุมก่อนตรวจรับสุดท้าย — 29 กันยายน 2026

> เอกสารนี้เป็นบันทึกระหว่างงานตามวันที่ของแต่ละช่วง สถานะตรวจรับปัจจุบันอยู่ใน [รายงานตรวจรับล่าสุด](Orbitlab-acceptance-TH.md) ข้อความ “รอผล” ในประวัติด้านล่างไม่ใช้แทนสถานะล่าสุด

เอกสารนี้สังเคราะห์รายงานเดิม 28 ก.ย. และหลักฐานที่อ่านได้จริงในเครื่อง ณ รอบตรวจรับ 29 ก.ย. ไม่ใช่คำรับรองว่าทดสอบครบทุกค่า หรือว่ารุ่นแก้เผยแพร่แล้ว Source สำหรับตรวจรับล่าสุดคือ `audit-2026-09-29/source-integrated` ที่รวมผล Cloud และการแก้เฉพาะจุดในเครื่อง; ผลเก่าจาก `source` แยกไว้ตามตาราง ไม่มีการรัน heavy/browser เพิ่มในการทำเอกสารนี้

**สิ่งที่เปลี่ยนจากช่องว่างในภาพแนบ:** วิธีทำ 6-DOF ทั้ง 7 บทมีผลรันผ่านแล้ว; fleet 163 รายการมี final JSON ผ่านครบ; D01 และ rigid-flex fingerprints ผ่านบน Node 22 โดยไม่เปลี่ยน golden. ส่วน full standard/heavy รุ่นสุดท้ายและเส้นทางเบราว์เซอร์หลังรวมแพตช์ยังต้องอ้างหลักฐานที่จบจริงรายรายการ

## ตารางปิดช่องว่างของรายงานเดิม

| ขอบเขต | ยืนยันแล้วจากหลักฐาน | ยังไม่ควรกล่าวอ้าง / งานตรวจรับที่เหลือ |
|---|---|---|
| 24 บทเรียน | รายงาน 28 ก.ย. อ่าน brief/criteria/locks/hints/debrief EN/TH/RU ครบ 24; 14 point-mass มี worked flights; 7 six-DOF มีผลรันใหม่ 7/7; 3 cases เคยผ่าน browser บนเว็บรุ่นเดิม | รวมกันเป็นหลักฐาน solvability ของบทเรียน 24 บทคนละชนิดและคนละ revision ไม่ใช่ browser 24/24 หลังแก้; historical rubric ที่เข้มขึ้นต้องมี worked flight และ counterexample ของรุ่นใหม่ |
| 7 บท 6-DOF | `lessons-sixdof-results.json`: success=true, 7 passed, 0 failed/pending; ดูรายการครบด้านล่าง | ผล headless Windows/Node 24 จาก `source` ก่อนรวม Cloud ไม่ใช่ browser flights หรือผล heavy suite รุ่นสุดท้าย |
| กรณีศึกษา/การบันทึก | integrated `case-lessons.test.ts` 23/23: เฉพาะ input ที่ใช้, snapshot/save/load/legacy/malformed, immutability, ขอบเขต 365 วัน/ดัชนีและ endpoint; รวม 3 cases ที่ serialize first-pass+last ใช้ <500,000 ตัวอักษร | ต้องตรวจ UI save→reload→review จริง; ไม่ได้วัด quota ทุก browser/device; คำว่า “ไม่ทำให้ localStorage ล้น” ในรายงาน Cloud กว้างเกินผลทดสอบ |
| 157 ข้อสอบ | inventory ครบ 157; EN อ่าน prompt/options/explanations, TH/RU เทียบโจทย์/คำตอบ; 25 numeric families รวม 31,639 ชุดค่า; draw 1,000 คู่ครอบคลุมทุก ID/ไม่มี pre-post ซ้ำ; 926 text triples ไม่มีช่องว่าง/placeholder mismatch | ไม่ได้บรรณาธิกรอิสระ TH/RU ทุก distractor/explanation ครบ 157 ข้อใหม่ในรอบนี้; ไม่ใช่ psychometric validation; browser 25-question workflow เก่าไม่เท่ากับดูครบ 157 ข้อหลังแก้ |
| การให้คะแนน/ความต่อเนื่อง | `learning-bank-compatibility.json`: 157→157, scoringStructureChanged=[]; การแก้ถ้อยคำคง key/index/tolerance/formula; recommendation กับ review figures/save warning มี source fixes | ข้อความของ attempt เก่ายังอ่านจาก bank ปัจจุบัน; immutable question-bank history/backup เป็นงานพัฒนา; ต้องตรวจ browser review ของ figure/photo/observe และ explicit review flag ที่คะแนนรวมสูง |
| ยาน/การบิน | `fleet-results.json`: 6 ไฟล์, 163/163 passed, pending 0, success=true; calm 126 + crosswind/shear 34 + Long March 2D dedicated 3 | เป็น finite accepted fleet matrix ใช้ฐานเริ่มต้นและ exclusions ไม่ใช่ 21 ยาน × ทุกฐาน × ทุกวงโคจร × ทุกแผนลงจอด; recovery ยังเป็นโมเดลทดลอง |
| Node/runtime | Node 22.23.3 ทำให้ D01 28/28 และ rigid-flex 4/4 ตรง golden เดิม; worker/runtime logs อยู่จริง | ยังไม่ใช้ผล 32 นี้แทน heavy fingerprints 21 เที่ยวบิน + heavy flex-golden 3 เที่ยวบิน; ไม่ตีความ Node 24 hash mismatch เพียงอย่างเดียวว่า trajectory ผิด |
| full standard/heavy | source-integrated มี 177 standard files + 27 heavy + 6 fleet = 210 test files; heavy collection เดิม 246 tests, fleet 163 | inventory ไม่ใช่ pass count. ณ รับมอบงานนี้ Cloud numerical แบ่ง standard เป็น 8 shards บน Node 22 และยังไม่มี final result ส่งมา; heavy Windows log เดิมไม่มี final summary (180 passed/24 failed) จึงยังไม่ปิด |
| Orbit solvers | รายงาน 28 ก.ย. เดิน 15-step tour, maneuver menus ทุกชนิด, Lambert/porkchop/lifetime/catalogue/overflight/conjunction/CZ-5B/NAPA-2; มี test families ตาม inventory ด้านล่าง | ไม่มีหลักฐาน final browser normal/invalid/boundary ทุก solver หลังรวม; ไม่มีคำรับรองความแม่นยำทุก real-tracking prediction |
| Build | รายงานเดิมเดิน 5-step tour และ 5 benches, save/edit/fly; integrated focused bench-refresh 3/3 + design-store 11/11 | ยังไม่ปิดทุกชิ้นส่วน/เครื่องยนต์ที่รองรับและ incompatible classes ผ่าน UI; browser synthetic import/export roundtrip, 21 diagrams assembled/exploded, invalid tunnel ต้องตรวจล่าสุด |
| UI/กราฟิก/มือถือ | source มี shared stars/DPR, Orbit camera-relative stars และ sectors disposal; มีภาพ before-fix Orbit desktop/mobile ที่ `browser-before-focused-fixes-TH.md` | ภาพ before ไม่ใช่ after acceptance; Cloud browser ไม่มี executable และ download HTTP 403 มี log จริง; local browser acceptance ของ integrated ต้องรายงานแยก. ไม่ใช่มือถือจริงหลายรุ่นหรือ screen reader เต็มรูปแบบ |

## หลักฐานทดสอบหลังรวมที่อ่านผลจริง

`integrated-focused-results.json` **74/74 ผ่าน, 0 failed, 0 pending, success=true**: case-lessons 23, mission-result 16, i18n 16, design-store 11, Monte Carlo worker failures 5, Build bench refresh 3. Node 22 และ build ผ่านตามการรันของผู้ประสานงาน; JSON นี้ตรวจอ่านตัวเลขโดยตรงแล้ว

`case-snapshot-acceptance-results.json` 23/23 และ `mission-result-cursor-regression-20260929.json` 16/16 เป็นการรันย่อยที่ซ้ำใน 74 ข้างต้น **ห้ามบวกเป็น 113**. เช่นเดียวกัน focused Cloud 70/70 (`source-integrated/audit-2026-09-29/logs/focused-cloud.log`) เป็นผลก่อน acceptance corrections และถูกแทนในขอบเขตนี้ด้วย 74/74. Cloud build/typecheck และ browser executable/HTTP 403 มี log ภายใต้โฟลเดอร์เดียวกัน ไม่ใช่ `source-integrated/logs`

ผลเดิมที่ยังมีประโยชน์แต่ต้องระบุ revision: `learning-focused-results.json` 63/63, `learning-bank-compatibility.json`, `lessons-sixdof-results.json`, `fleet-results.json`, `fingerprint-node22-d01-full-20260929.json` 28/28 และ `fingerprint-node22-rigid-flex-20260929.json` 4/4. ไม่รวมทั้งหมดเป็นยอด unique suite

## บทเรียนทั้ง 24 และขอบเขต 7 heavy tests

| กลุ่ม | บท | หลักฐาน / ความหมาย |
|---|---|---|
| Point-mass 14 | 1.1–1.5, 2.1–2.2, 3.1, 3.3, 5.1–5.5 | `audit-2026-09-28/lesson-flight-tests.json`: worked solution coverage ตาม `lessons-review.md`; 29 passed/7 intentionally skipped ในคำสั่งกรอง (7 skipped คือ six-DOF ที่แยกรันภายหลัง) |
| 6-DOF 7 | 2.3 INS; 2.4 Monte Carlo; 3.2 stuck gyro/FDIR; 4.1 loop inspector; 4.2 margins; 4.3 step response; 4.4 bending/notch | `lessons-sixdof-results.json` ยืนยันแต่ละชื่อ assertion และผ่านทั้ง 7; 4.3 มี fast tuning ไม่ผ่าน/default tuning ผ่าน; 2.4 ตรวจ selected dispersed run และตัวเลข ไม่ได้พิสูจน์ความเข้าใจ 3σ เชิงสถิติ |
| Cases 3 | 6.1 THEOS-2, 6.2 CZ-5B, 6.3 Iridium–Cosmos | browser pass บนเว็บเดิม + integrated snapshot/key/grade tests; ต้องเปิด review ของ snapshot ใหม่และ reload ผ่าน UI |

ข้อที่ยังเป็นการพัฒนา/นโยบาย: reveal ข้าม attempts, assisted-pass/retry, bank versioning, backup/restore, attempt history, MC batch provenance และ baseline/change comparison. บท 4.3 ยังสั่ง 2°/8 s และ baseline/retune แต่ grader รับ step สุดท้ายที่อยู่ใน 30 s หลัง max-Q และ hold≥5 s โดยไม่ตรวจ amplitude/baseline; ไม่ควรเรียกว่า rubric ตรงทุกคำสั่งแล้ว การชี้แจง “ค่าทดลองแนะนำ” ทำได้แยกจากการออกแบบ policy ใหม่

## Inventory ของ simulation / solver ที่มีอยู่

ตารางนี้เป็นรายชื่อชนิดการคำนวณและไฟล์ทดสอบที่รองรับ **ไม่ใช่ประกาศว่าทุกไฟล์ผ่านในรุ่นรวม** ให้ผูกผล standard/heavy สุดท้ายกลับเข้าตารางแทนใช้จำนวนเมนูเป็น coverage

| กลุ่ม | รายการที่ต้องครอบคลุม | Test families / หลักฐาน inventory |
|---|---|---|
| Launch dynamics | point-mass, rigid six-DOF, optional slosh/bending; gravity/J2, atmosphere, aero, engine transients, staging, sensors/navigation, guidance/actuator/control/FDIR, Monte Carlo | `physics-core`, `ascent`, `rigid-*`, `engine-transients`, `navigation`, `control-faults`, `monte-carlo*`; heavy delivered wind/flux 7, explicit PEG/IGM 32, flex reference 19, flex golden 3, MC sets 5, navigation burns 2 |
| Launch missions | fleet presets LEO/ISS/SSO/GTO × payload 25/50/90% ที่ capability/corridor รองรับ; rendezvous/docking, crew abort/history; replay/handoff/result | fleet163 ตามข้างต้น; heavy rendezvous8, Soyuz abort2, historical3, published Falcon9 validation6/timeline12; `mission`, `replay`, `mission-result`, `orbit-handoff` |
| Recovery | downrange, droneShip, landingZone, expended; Falcon9 KSC/Cape LZ-1/LZ-2, Vandenberg ไม่มี zone; FalconHeavy core/สอง boosters แยกแผน; SuperHeavy tower OLM; ship descent/splashdown | `recovery-panel`, `recovery-return`, `rigid-recovery`, `rigid-return`, `ship-descent`; heavy FalconHeavy returns1 + StarshipFlight5 1. ต้องแยกผ่าน orbital mission จากผ่าน landing |
| Orbit ideal propagation | Kepler elliptic/hyperbolic, optional secular J2, apsides/state/ground track, SSO inclination/node local time/repeat orbit, Newton cannon impact/orbit/escape | `kepler`, `orbit-playground`, `applications`, `target-plane`, `reference-frames` |
| Maneuver 9 ชนิด | Hohmann, bi-elliptic, plane change, circularize at apogee, phasing, deorbit, low-thrust spiral, manual, Lambert rendezvous (+porkchop grid) | `src/orbit/maneuver-setup.ts`: Explore8, Engineer9; `maneuvers`, `maneuver-setup`, `budget`. Manual nodes≤5; burn timing now/perigee/apogee/ascendingNode/descendingNode/time |
| Catalogue / actual orbit data | TLE/OMM parsing, SGP4 near/deep-space, TEME/ECEF/Earth orientation, catalogue freshness/provider race | `sgp4`, `omm`, `earth-orientation`, `satellite-catalogue`, `data-provider`, `data-consistency`; synthetic valid/malformed upload UI ยังต้องตรวจ |
| Visibility / passes | sky look angles, sunlight/shadow, magnitude, refraction, pass finding/overflight, sensor filters | `passes`, `overflights`, `visibility`, `real-sky`, `sensors`, `sky-tour`; เมือง/epoch/input เปลี่ยนต้องติด stale label ให้ถูก |
| Lifetime / reentry | numerical propagator + atmospheric MSIS/activity, ballistic fitting จาก decay rate/element sets, uncertainty, CZ-5B และ NAPA-2 worksheets | `propagator`, `msis`, `activity`, `ballistic`, `reentry`, `uncertainty`, `worksheets`; heavy reentry-agencies104; ไม่ใช่การรับรองเวลาตกจริงทุก object |
| Conjunction | close-approach search, broadphase screening, encounter plane/covariance/Pc, CDM input, Iridium–Cosmos case | `conjunction`, `screening-filter`, `cdm`, `case-worksheets`; heavy screening12; เปลี่ยน input/ยกเลิกต้องไม่ใช้ผลเก่า |
| Build | catalogue/parts, remix/assemble, saved revision, raw unreadable records, assembled/exploded SVG; Static fire/Wind tunnel/Readiness/Optimal staging/Sizing | `parts*`, `custom-vehicle*`, `design-*`, `build-*`; Readiness เป็น initial point-mass insertion ตามขอบเขต ไม่ใช่รับรอง full six-DOF mission |
| Lessons / Assessment | lesson24, grading/locks/progress/export, case snapshots, placement157, all5questiontypes and figure/observe review | `lessons*`, `case-*`, `assessment*`, `i18n`; original157 = choice109 + multi11 + numeric25 + order10 + vehicle2 |

แคตตาล็อก 21 รุ่นจาก `src/data/vehicles.ts`: Soyuz-2.1a, Soyuz-2.1b/Fregat-M, Proton-M/Briz-M, Angara-A5/Briz-M, Falcon9, FalconHeavy, AtlasV551, VulcanVC4, Ariane64, Vega-C, LongMarch2D, LongMarch3B/E, H-IIA202, LongMarch5, H3-22, PSLV-XL, Electron, Starship, Sputnik8K71PS, Vostok-K8K72K, SaturnV. การมีชื่อใน catalogue หรือ snapshot160s ไม่ได้แปลว่าบินจบทุกภารกิจ

Finite fault inventory จาก `src/types.ts`: FailureMode11 ค่า (รวม none/random): engineOut, thrustLoss, prematureSep, fairingStuck, rangeSafety, launchAbort, padFire, boosterCollision, stagingFailure; ControlFaultKind16: gimbalStuck, gimbalHardover, gimbalSlow, actuatorPolarity, rcsStuckOn, rcsFailedOff, rateInverted, gyroStuck, gyroBias, gyroNoise, imuFailure, accelBias, gnssLoss, starTrackerLoss, computerHold, gainSign. ต้องเทียบ completed test names กับชนิดเหล่านี้; ไม่อ้างว่าลองทุกเวลาฉีด fault/ทุกลม/ทุกยาน

## Browser paths ที่ควรตรวจต่อก่อน (finite และคุ้มค่าที่สุด)

1. **เส้นทาง Lessons จากแต่ละ workspace**: Launch/Orbit/Build → Lessons → case/flight → Back; hash/visible panel/focus ต้องเปลี่ยนถูก. ผู้ประสานงานยืนยันว่า Enter บนปุ่ม Lessons จาก integrated Orbit Engineer เปิด `#/lessons` ได้ไม่มี error; click จาก automation ก่อนหน้านั้นไม่เปลี่ยนหน้า จึงยังต้องตรวจ click ซ้ำ ไม่ใช่หลักฐานพอว่า production routing มีบั๊ก
2. **Draft + case persistence**: flight numeric และ case numeric/radio ที่ยังไม่ Check → Hint → EN/TH/RU → ปิด/เปิด; 6.1/6.2/6.3 Check→reload→review. ตรวจค่าที่แสดงของ worksheet/key ไม่เปลี่ยนเมื่อ live data เปลี่ยน; save refusal ต้องเตือนทั้ง case และ assessment
3. **Assessment5ชนิด + review**: choice/multi/order/numeric/vehicle; confidence blocking; locale switch; จบ25ข้อ→review อย่างน้อย diagram/chart/photo/observe; seed11 wrong-basic/high-total ต้องแนะนำบททบทวนตรงกัน. 157-item scoring ทำโมดูลได้ครบ แต่ต้องไม่เทียบกับ UI all157โดยอัตโนมัติ
4. **Build critical loop**: Saveแบบ9engines→Engineer→แก้10แล้วSave→กลับbench; ค่าต้องใหม่และผลเก่าถูกล้าง. Wind tunnel valid→blank/negative/nonfinite→valid และเปลี่ยนangle range ระหว่างinvalid; ไม่มี usable stale plot/raw translation key
5. **File roundtrip แบบสังเคราะห์**: mission/design/lesson (ตามชนิด import ที่ UI รองรับ), TLE/OMM/CDM; valid export→import→เทียบ identity/ค่าที่จำเป็น; malformed/wrongversion/empty/duplicate. ไม่ต้องใช้ไฟล์ส่วนตัวและอย่าสัญญาว่า results-export มี restore หากไม่มี
6. **Orbit9maneuvers + engineer solvers**: อย่างน้อย normal และ invalid/boundary case ต่อชนิด; budget0/fuel>mass, manual limit5nodes, Lambertไม่เกิดคำตอบ, changed-input/cancel. Lifetime/screening/overflight ต้องไม่แสดงผลเก่าเป็นผลปัจจุบัน
7. **ผล mission ณ replay cursor**: ก่อน/ที่/หลัง target event กับ signed error; failure/recovery outcomes คง boundaryเดิม; Launch→Orbit ตรงframeที่ส่ง. โมดูล16/16ผ่านแล้วแต่ยังควรตรวจ caption/units บนหน้า
8. **ภาพหลังแก้**: Launch/Orbit desktop+390×844, DPR1/2, near/far zoom ขณะpaused, resize และ sectors on/off ซ้ำ; ดาวคงทิศเมื่อcameraถอย, โลกบังดาวถูก, labelsอ่านได้, ไม่มี WebGL errors. Build21รุ่น × assembled/exploded =42ภาพสถานะตรวจ label/selection/keyboard. ไม่ต้องคูณทุกlocale×ทุกภาพถ้าเลือก pairwise และบันทึกตัวอย่างชัด

ตรวจ navigation/menus/modals/keyboard ภาษา EN/TH/RU ครบชนิด control; แยก simulated viewport ออกจาก real-device/screen-reader. Browser Cloudถูกบล็อกไม่ใช่เหตุให้ผล Local CUAที่กำลังตรวจเป็น blockedโดยอัตโนมัติ ให้เติมหลักฐาน after-fix เมื่อเสร็จโดยระบุ URL/revision/runtime/screenshot และ console

## วิธีใช้ร่างนี้ในรายงานสุดท้าย

แทนช่อง “ยังรอ” ด้วย final JSON/log ของ source/runtimeที่ตรงเท่านั้น; รักษาผลเก่าเป็น historical evidence. อย่าคัดลอกสถานะ Thinking/Retry/partialจากรายงานส่งต่อมาเป็นสถานะปัจจุบัน. ข้อความ primary-source content corrections และข้อจำกัดการตรวจภาษาอยู่ใน `learning-followup-review-TH.md`; ฉบับนี้ไม่ทำ scientific source review ใหม่และไม่รับรองคุณภาพข้อสอบเชิงสถิติ
