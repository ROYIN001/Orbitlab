# Orbitlab — รายงานตรวจละเอียดและผลแก้ไข 29–30 กันยายน 2026

**ผลตรวจรับล่าสุด:** standard CI ของ source สุดท้าย `4cf7e3f` ผ่าน **9,259/9,259 รายการใน 191 ไฟล์** ทั้ง PR และ push บน Node 22.23.3 พร้อม typecheck และ build สำเร็จ ไม่บวกยอดรันซ้ำ ส่วน **heavy ผ่าน 246/246 ใน 27 ไฟล์** บนฐาน numerical `0b844f7` มีการบินอ้างอิงครบ **21 รุ่น** และบทเรียน 6-DOF รันใหม่ผ่าน **7/7** อ่านความหมาย EN/TH/RU ครบ **ข้อสอบ 157 ข้อ + บทเรียน 24 บท** แล้ว Browser acceptance ผ่าน **4/4 เส้นทาง** บน `9737f21`; รุ่นสุดท้ายผ่าน smoke ใหม่ **3/3** และส่งออกกรณีศึกษา **24 ไฟล์ / 12 DOCX / 18 หน้าที่ตรวจภาพครบ**

| ขอบเขตที่ปิดแล้ว | หลักฐานหลัก |
|---|---|
| Heavy 246/246 ใน 27 ไฟล์ | [ผลจบจริง](actions-heavy-results/36631307401/final-heavy-acceptance-TH.md), [final union](actions-heavy-results/36631307401/final-union.json); ไม่มี missing/duplicate/skip/failed, worker Node 22.22.2 |
| Standard 9,259/9,259 และ build/typecheck | [CI ของ source สุดท้าย 4cf7](actions-heavy-results/ci-4cf-standard-summary.json), [PR log](actions-heavy-results/ci-36640538286-final-excerpt.log) และ [push log](actions-heavy-results/ci-36640532218-final-excerpt.log); ทั้งสองรันผ่าน 191 ไฟล์ บน Node 22.23.3 |
| Browser 4/4: Launch, Mobile, PWA offline, Watch | [Browser acceptance](actions-heavy-results/browser-36634805813/audit-browser-logs/summary.md); source `9737f21`, Node 22.23.2 ไม่ใช่การ deploy |
| บินอ้างอิง 21 รุ่น และบทเรียน 6-DOF 7 บท | [Vehicle union](actions-heavy-results/36631307401/vehicle-coverage-union.json), [7/7 lessons](actions-heavy-results/36631307401/collected-heavy/lessons-sixdof/result.json) |
| อ่านข้อสอบและบทเรียนทุกข้อความสามภาษาในขอบเขตที่ระบุ | [157 ข้อ](editorial-audit/bank-editorial-review-TH.md), [24 บท](editorial-audit/lesson-editorial-review-TH.md), [ข้อความใบงานกรณีศึกษา](worksheet-case-editorial-TH.md) |
| ใช้งาน export/import และตรวจกราฟิกจริง | [C01–C34](import-export-checklist-TH.md), [ภาพ Build 42/42](build-visual-42-validation-TH.md), [ไฟล์และใบงานจริง](browser-export-artifacts/README-TH.md) |

ข้อจำกัดที่ยังมีเป็นเรื่องอุปกรณ์จริงหลายรุ่น, screen reader, เสียงที่ได้ยินจริง, ไฟล์ส่วนตัว, การเทียบข้อมูลติดตามจริง และคุณภาพข้อสอบเชิงสถิติ ไม่ใช้ข้อจำกัดเหล่านี้กลบช่องว่างที่ตรวจปิดแล้ว รายงานต้นฉบับยังคงประวัติเดิมไว้ การตรวจ local preview และ CI ไม่ใช่หลักฐานว่าเว็บสาธารณะได้รับการ deploy

ตรวจตามคำขอของผู้ใช้ให้ทดสอบช่องว่างในรายงานเดิม แก้ข้อผิดพลาดแน่ชัด รวมถึงเนื้อหา เมนู และกราฟิกที่มีอยู่ ส่วนงานพัฒนาใหม่หรือเปลี่ยนนโยบายการเรียนให้บันทึกไว้ก่อน เอกสารแนบใช้เป็นบริบทและหลักฐาน ไม่ใช้แทนคำอนุญาตจากผู้ใช้

## 1. แหล่งงานและข้อสรุปที่ใช้ได้ขณะนี้

- งานส่งมอบอยู่ใน [PR #41](https://github.com/ROYIN001/Orbitlab/pull/41) บน [branch codex/audit-acceptance](https://github.com/ROYIN001/Orbitlab/tree/codex/audit-acceptance)
- การรวมและตรวจใช้ `audit-2026-09-29/source-integrated`; เก็บ checkout `audit-2026-09-29/source` เดิมไว้ ไม่ได้นำงานรวมท้ายรอบไปเขียนทับ checkout เก่า
- เว็บอ้างอิง: [Orbitlab](https://royin001.github.io/Orbitlab/) และ [repository](https://github.com/ROYIN001/Orbitlab)
- ฐานงาน: commit `0a6d1a709ffbf88e8e36f606d6993bd27e5c25e0`; แพ็กเกจส่งต่ออยู่บน branch `codex/cloud-audit-handoff-2026-09-29` ที่ `64757b34fb4cfe0547e274df244bf4946297f051`
- Checkout ตรวจรับ: `audit-2026-09-29/source-integrated`; ฐานของผล CI และ heavy คือ `0b844f77f5f0ffdeb7274642ddf74a57c2ee230b` รวมการแก้จาก Cloud และการแก้กราฟิก การเก็บ progress, Kepler, Lambert และ architecture test ท้ายรอบแล้ว ส่วน `3eff70b` เป็นที่มาของ CI รอบก่อน
- รอบเพิ่ม browser journey และ workflow ส่งออกกรณีศึกษาคือ `277f41dd6cbd46d1b03d97bcc060258ec8c7554a`: production source เหมือน `c146a699` ทุกไบต์ ส่วน `c146a699` แก้ข้อความ 57 strings และ test fixture assertion โดย AST numerical/rubric เท่าฐาน `0b844f7` ตามหลักฐาน ไม่กล่าวว่ารัน heavy บน commit ใหม่โดยตรง ดู [source provenance bridge](actions-heavy-results/source-provenance-bridge.json)
- รุ่นข้อความและสถานะคือ `76534dc1d171726cb3d5eadc82d1ac77b629376b`: แก้สถานะ export อีก 3 strings ให้เป็น “File prepared / Файл подготовлен / เตรียมไฟล์แล้ว” เพราะการสั่งดาวน์โหลดไม่ยืนยันว่าเขียนไฟล์ลง disk แล้ว รวมรอบ editorial/status เป็น 60 strings ใน 11 production files; ข้อความภายใน worksheet exports ไม่เปลี่ยนจาก `277f41d`
- Source สุดท้ายหลังแก้การแสดงผลคือ `4cf7e3fe6e5ef36bea37a4b1d275d3e56e7dd58c` (src tree `f8513353f67c0f59637429df5b8129fa6bf565a1`): เปลี่ยน `src/worksheets/docx.ts` และ `src/orbit/encounter-plane.ts` พร้อม tests สองไฟล์ แก้ numeric workbox แยกหน้าและตำแหน่งป้าย 3σ; ไม่เปลี่ยนสมการ ellipse, radius หรือ simulation source ตาม independent diff review ของผู้ประสานงานและผู้ตรวจฟิสิกส์ รอบนี้เป็น rendering/layout change ไม่อยู่ในคำอ้าง AST text-only 60 strings ถึง `76534dc1`
- Local production previews ใช้พอร์ต 4176–4182 ตามรุ่นที่ตรวจ โดย final6 อยู่ที่ `http://127.0.0.1:4182/` หลักฐานแต่ละรอบระบุ build และพอร์ตของตนเอง เพื่อไม่สับสนกับเว็บสาธารณะ
- หลักฐานแต่ละชุดแยก Windows/Cloud, Node 22/24, headless/browser และ source ก่อน/หลังรวมแพตช์ ไม่บวกผลรันซ้ำเป็นยอด unique tests

สิ่งที่แก้เสร็จและมีหลักฐาน ได้แก่ การรักษาคำตอบเมื่อเปลี่ยนภาษา การคืนรูปในหน้า review การกู้ข้อมูล progress ที่ผิดชนิด การนำเข้าไฟล์โดยไม่ทำข้อมูลเดิมหาย ชื่อและภาษาของไฟล์ส่งออกที่ตรงกับเนื้อหา การแบ่งหน้าใบงาน และกราฟิกบนจอแคบ นอกจากนี้ได้แก้ข้อผิดพลาดเชิงตัวเลขของ Kepler ใกล้ e = 1 และ Lambert ใกล้มุม 180° ซึ่งมีการตรวจด้วยการอินทิเกรต RK4 แยกจากตัว solver

กรณีศึกษาทั้ง 3 บททำผ่าน UI ของรุ่นรวมจริง และผ่านการบันทึก เปิดหน้าใหม่ และส่งออก ส่วน Build ผ่านการแจกแจงชิ้นส่วน–เครื่องยนต์และข้อมูลผิดเงื่อนไข **6,542/6,542 รายการ** พร้อมวงจรบันทึก–ส่งออก–นำเข้าผ่าน UI ยอดนี้รับรองเงื่อนไขที่ทดสอบ ไม่รับรองว่าค่า payload rating ทุกแบบถูกต้องทางฟิสิกส์

บทเรียน 6-DOF ทั้ง 7 บท **รันใหม่ผ่าน 7/7 บน commit `0b844f7` และ worker Node 22.22.2 แล้ว** เป็นผล headless ที่มี result, runtime, log และ exit 0 แยกจากผล Windows เดิม จึงปิดช่องว่าง “ยังไม่รันทั้ง 7 บท” ได้ heavy ทั้งชุดปิดผ่าน 246/246 ใน 27 ไฟล์แล้วตาม [final acceptance](actions-heavy-results/36631307401/final-heavy-acceptance-TH.md) ส่วนชุด standard เดิมบน Cloud ครบ 8 shards มี **2,542 ผ่าน และ 2 ไม่ผ่าน จาก 2,544 รายการใน 177 ไฟล์** การตรวจซ้ำกลุ่มที่เกี่ยวข้องผ่าน 35/35 บน integrated โดยคงผลเดิมไว้ ส่วน CI รอบก่อนและ CI ล่าสุดแยกอธิบายในหัวข้อ 6 จึงยังไม่สรุปว่า “ทุกอย่างผ่านทั้งหมด”

## 2. บั๊กที่แก้ และระดับการตรวจรับ

| ปัญหา | สิ่งที่แก้ | หลักฐานและข้อจำกัด |
|---|---|---|
| Draft บทเรียนหายเมื่อเปิดคำใบ้/เปลี่ยนภาษา | เก็บ raw numeric text และ radio draft แยกจากคำตอบที่ตรวจแล้ว | `src/lessons/answer-drafts.ts`, `src/ui/lessons/lesson-mode.ts`; focused regression, case UI และ flight lesson 1.1 ตัวอย่างจริงผ่าน: raw spaces, 1e ที่ยังพิมพ์ไม่ครบ, hint, TH→RU→EN และ focus/caret คงเดิม ดู [draft UI](browser-flight-draft-final-TH.md); ไม่ครอบคลุมทุกบท ทุกลำดับ หรือ draft ข้าม reload |
| Rubric ประวัติศาสตร์รับภารกิจคนละเงื่อนไข | Sputnik จำกัด payload 83.5–83.7 kg; Vostok จำกัด inclination 64.85–65.05°; Apollo จำกัด apogee 360,000–380,000 km | `src/lessons/builtin/track5.ts`; worked solutions และ counterexamples ของรุ่นแก้ผ่านใน focused 165 และ full standard/heavy ที่จบแล้ว ดู `editorial-audit/final-focused.json` และ `actions-heavy-results/36631307401/final-union.json`; ไม่อ้างว่าเปิด browser บินครบ 24 บท |
| Guidance lock ไม่ตรวจ explicit PEG/IGM | รวม explicit guidance ในการตรวจ lock | `src/lessons/grader.ts`; ไม่ได้เปลี่ยน locks เป็นขอบเขตความปลอดภัยหรือออกแบบ grader ใหม่ |
| หน้าคำแนะนำ assessment ขัดกับธง review | รวมบทที่ถูกสั่งทบทวนโดยตรงในจุดเริ่ม/รายการที่ต้องทบทวน แม้ aggregate domain อยู่ระดับ strong | `src/lessons/assessment/score.ts`, `src/ui/lessons/assessment-view.ts`; logic มี regression และผ่าน focused/full standard; UI กรณีคะแนนรวมสูงแต่ผิดพื้นฐานไม่ได้ทดสอบแยกในรอบ browser นี้ จึงไม่อ้างว่ามี visual acceptance ของกรณีนั้น |
| Review ข้อสอบหายรูป/กราฟ/observed comparison | Render รูปเดิมจาก prepared item และค่าที่เก็บไว้ | `assessment-view.ts`; focused tests ผ่าน; browser จบ25ข้อและเห็น3σ ellipse/step-responseในreview ไม่เหมารวมว่าดู review ของทุก157ข้อแล้ว |
| Save warning ไม่ถึง case/assessment | แสดงสถานะบันทึกในบริบทที่ผู้เรียนใช้อยู่ | `lesson-mode.ts`; export/persistence ปกติมีหลักฐานจริง; ไม่ได้จำลอง browser storage refusal ทุกหน้า ผลทดสอบการกู้และการปฏิเสธเขียนที่ชั้น storage แยกอยู่ใน focused suite |
| Snapshot กรณีศึกษามีข้อมูล solar ย้อนหลังเกินจำเป็น | THEOS เก็บ element set; Iridium ไม่เก็บ solar/THEOS; CZ-5B เก็บ daily series ครบ horizon365วัน พร้อม UTC และ clamp ขอบที่ถูกต้อง | `src/lessons/progress.ts`; case23/23 ผ่าน รวม daily boundaries, interval means, immutable data, legacy/malformed. ไม่คำนวณ crop cutoff จากคำตอบ predicted reentry อีกต่อไป |
| Engineer ใช้แบบเก่าหลัง Save รายการเดิม | ตรวจ revision ของ saved design แล้วโหลดใหม่/ล้างผลเก่า | `src/ui/build/engineer-level.ts`; bench refresh3/3 และ browser ยืนยัน Engineer เห็นแบบที่แก้แล้ว |
| Wind tunnel รับ payload ว่าง/ติดลบแล้วคงกราฟเก่า | ใช้ validation ที่สอดคล้องกัน ล้างผลที่ใช้ไม่ได้ และเพิ่มข้อความ EN/TH/RU ที่ขาด | `src/ui/build/tunnel-panel.ts`, dictionaries; browser blank/negative ยืนยันข้อความไทยและกราฟถูกล้าง |
| Save design ทิ้ง raw record ที่รุ่นนี้อ่านไม่ได้ | เก็บ raw unreadable records ระหว่างเขียนรายการใหม่ | `src/design/design-store.ts`; design-store11/11 ผ่าน ไม่ได้อ้างว่าพบข้อมูลจริงของผู้ใช้สูญหาย |
| Mission result ไม่ตรง orbit ณ replay cursor | แสดง actual apsides/signed differences จาก frame ที่กำลังดู; outcome/time boundaries ยังคงอิงเหตุการณ์เดิม | `src/ui/result-content.ts`; 16/16 regression ผ่าน; ค่าตัดสินภารกิจอิงเหตุการณ์เดิม ขณะที่ osculating orbit อิง cursor ที่กำลังดู |
| JSON reference รับเลขไม่ finite เช่น1e309 | ปฏิเสธค่าที่กลายเป็น Infinity ใน20เส้นทางข้อมูล | `src/replay/reference.ts`; final regression48/48 ผ่าน; browser valid→overflow แสดง error และรักษา reference เดิม |
| นำเข้า satellite ไฟล์เสียแล้วทำข้อมูลเก่าหาย/ที่มาปะปน | เก็บ accepted data/selection/provenance และแสดงข้อผิดพลาดไฟล์ใหม่แยก | `src/ui/orbit/sky-panel.ts`, `tests/sky-import.test.ts`; browser origin4177 ยืนยัน accepted ISS ยังอยู่หลัง rejected JSON; related tests ผ่าน |
| ชื่อไฟล์ case worksheet/key ผิดกรณีเมื่อสลับเมนูระหว่างรอข้อมูล | จับ case ID เมื่อกด แล้วใช้ ID เดียวทั้งเนื้อหาและชื่อไฟล์; ภาษาใช้ภาษาบน UI ตอนสร้างเนื้อหาเสร็จอย่างสอดคล้องกัน | `sky-panel.ts`; ก่อนแก้ regression2fail/1pass, หลังแก้รวม case-export3 + sky-import5 =8/8 และ TypeScript ผ่าน. Browser4178ตรวจซ้ำครบ3cases×worksheet/key=6ไฟล์ ชื่อตรงหัวข้อทั้งหมด |
| สถานะ “Saved” อ้างบันทึกสำเร็จทั้งที่ทราบเพียงว่าสั่งดาวน์โหลด | เปลี่ยนข้อความสถานะเป็น “เตรียมไฟล์แล้ว” ทั้ง EN/TH/RU ไม่กล่าวอ้างผลจาก disk | commit `76534dc1`; [focused 29/29](editorial-audit/status-wording-tests.json) และ [build exit 0](editorial-audit/status-wording-build.log); ไม่สรุปสาเหตุที่ desktop บางรายการไม่มีไฟล์ และไม่ใช้ status label แทน download evidence |
| กรอบวิธีทำ numeric หลุดไปหน้าถัดไปใน case DOCX | เชื่อม prompt/answer/workbox โดยจบ keepNext chain ที่กรอบ | พบ CZ-5B TH/RU ข้อ 6 และ Iridium RU ข้อ 2 จากไฟล์จริง; [หลังแก้ source 4cf7](worksheet-case-export-layout-TH.md) ส่งออกใหม่ 24 ไฟล์และตรวจ 12 DOCX/18 หน้าผ่านครบ โดยข้อความเหมือนก่อนแก้ทั้ง 24 ไฟล์ |
| ป้าย 3σ ทับ Cosmos 2251 ใน Iridium TH/RU | ย้ายป้ายไปฝั่งตรงข้ามวัตถุที่สอง แยกจากเส้นแกนและคงในกรอบ | shared SVG ไม่เปลี่ยน ellipse/radius/Pc; regression ป้ายและชุดเกี่ยวข้องผ่าน 82/82 และภาพ final Iridium ทั้งสองภาษาชัดเจน ดู [visual review](browser-export-artifacts/editorial-layout-final/visual-review.json) |
| ตัวเลือกใบงาน Word แยกไปหน้าถัดไปกลางข้อ | ใช้keepNextและkeepLinesกับprompt/figure/caption/hint/options จบchainที่ตัวเลือกสุดท้ายเพื่อไม่ดึงข้อต่อไปติดกัน | `src/worksheets/docx.ts`; newregressionก่อนแก้9fail หลังแก้รวมกับworksheetเดิม15/15ผ่าน. FreshbrowserDOCX4179→LibreOffice→PNGตรวจครบ3worksheetpages+1keypage ตัวเลือกครบในหน้าเดียวกับข้อ7–10 ไม่มีclippedtextที่เห็น |
| ใบงานไทยมีป้ายรัสเซียเมื่อเปลี่ยนภาษาระหว่างexport | Rendererใช้ภาษาของsheetที่ตรึงไว้ และจับfilenameก่อนawaitรูป โดยไม่เปลี่ยนUIlanguage | [worksheet-language-validation-TH.md](worksheet-language-validation-TH.md); before3pass/6fail,หลังแก้รวมasyncUIregressionและชุดเกี่ยวข้อง46/46. browserQAFINAL4TH→RUระหว่างexportผ่าน; ตรวจทั้ง8ไฟล์/8DOCXpagesแล้ว |
| ข้อมูลlesson progressผิดชนิดทำให้grade/revealหยุด | ตรวจชนิดlesson entry/counts/revealedขณะอ่าน; คงvalidlegacyและเก็บrawต้นฉบับก่อนบันทึกข้อมูลที่กู้ หากสำรองไม่ได้จะไม่เขียนทับ | [progress-storage-recovery-TH.md](progress-storage-recovery-TH.md); reproducerเกิดTypeErrorก่อนแก้; หลังแก้56/56ใน4focusedfiles,TypeScriptผ่าน. ไม่ใช่browserstorageจริงหรือvalidatorครบทุกcustomcontent |
| Lambertใกล้มุม180°คืนคำตอบพลาดเป้าหมายหลายพันkm | ใช้crossproductคำนวณพารามิเตอร์มุมป้าน และแยกvelocityเป็นradial/transverseเพื่อลดการหักล้าง | [solver-boundary-validation-TH.md](solver-boundary-validation-TH.md); independentRK4และstep-halvingยืนยัน. Matrix120casesคืน72คำตอบ/72ผ่าน≤1m/1mm/s;48nullแยกไว้ ไม่เหมาว่าไม่มีคำตอบทางคณิตศาสตร์ |
| Keplerใกล้e=1คลาดเคลื่อนระดับkmและเสียphaseขณะhandoff | แก้เฉพาะnear1ให้รักษาsignedphase ใช้stableanomalyและCartesianconversion;ไม่เพิ่มexactparabolicfeature | Kepler108/108, independentRK4/analyticapsidesและ6roundtripsสูงสุด2.05e−8m. relatedsuite91/91; ไม่อ้าง108independentoraclesหรือทุกค่าของsolver |
| Monte Carlo สร้าง/dispatch worker ไม่สำเร็จแล้วค้างทรัพยากร | หยุดและเก็บกวาด workers/handlers ที่สร้างไปแล้ว รักษาผลสำเร็จเดิมตามกรณี | `src/physics/monte-carlo-job.ts`; failure cleanup5/5 ผ่าน |

ไฟล์ HTML ที่ดาวน์โหลดจริงก่อนแก้ race ยืนยันปัญหา: ชื่อ `orbitlab-case-iridium-key-en.html` มีหัวข้อ THEOS-2; ชื่อ `orbitlab-case-cz5b-key-en.html` มีหัวข้อ Iridium. เก็บสำเนาชื่อขึ้นต้น `before-race-` ใน `browser-fixtures/` แล้ว การแก้ใช้ callback จริงใน regression ไม่ใช่ทดสอบฟังก์ชันชื่อไฟล์จำลองที่แยกจาก UI

การแก้ DOCX ใช้ความหมาย [keepNext ของ Microsoft Open XML](https://learn.microsoft.com/en-us/dotnet/api/documentformat.openxml.wordprocessing.keepnext?view=openxml-3.0.1) และ [การเก็บข้อความไว้ด้วยกันใน Word](https://support.microsoft.com/en-us/word/keep-text-together-in-word): เชื่อมย่อหน้าภายในข้อและไม่แยกบรรทัดภายในตัวเลือก แต่ปล่อยจุดแบ่งหน้าหลังตัวเลือกสุดท้าย ไม่เปลี่ยนเนื้อหาหรือเกณฑ์คำตอบ

## 3. เนื้อหาและภาษา

แก้ข้อความที่ยืนยันว่าผิดหรือกำกวม โดยคง IDs, ลำดับตัวเลือก, correct flags, สูตรและ tolerance ของคลังเดิม ไม่แปลงการเกลาภาษาเป็นการออกแบบคะแนนใหม่:

- PEG/IGM เปลี่ยนข้อกล่าวอ้าง “ใช้ครั้งแรกบน Saturn V” เป็นความสัมพันธ์ที่มีหลักฐานรองรับ และอธิบาย Saturn I/S-IV ปี1965ก่อน Saturn V
- ตัวลวงเรื่อง near-zero AoA และ max-Q ระบุข้ออ้างแบบ “เป็นเหตุผลเดียว/ไม่มีผลต่อโครงสร้างหรือเสถียรภาพ” ให้ชัด ไม่ตีตราประโยชน์รองที่มีเหตุผลจริงเป็น misconception
- Series reliability ระบุ independence; catch-up ระบุ prograde burn ตอนกลับสู่วงโคจรสูง; Hohmann จำกัดขอบเขตสอง impulse; plane ของ ISS “แทบคงที่ช่วงสั้น” และ stuck gyro ระบุค่า+5°/sขณะต้องการอัตราศูนย์
- Apollo13 แยกความร้อนจาก heater ระหว่างงานภาคพื้นซึ่งทำลายฉนวน กับ short circuit ใน fan wiring ตอนกวนถัง; Vulcan อธิบายสีตรงภาพที่จัดส่ง; Kármán เป็นขอบเขตตามข้อตกลง; ค่าg0ในโจทย์ตรงสูตร
- บท1.5 ระบุข้อจำกัดทางเดินบินอย่างง่ายของ simulator แทนเหมารวมว่า Cape ปล่อย polar ไม่ได้; THEOS ระบุ descending node; แก้ประธานของประโยค booster landing ให้ตรงสิ่งที่ลงจอด
- ข้อจำกัด6-DOF ระบุ optional simplified slosh/first bending mode ที่มีจริง โดยคงข้อจำกัด detailed modes/heating/landing-leg dynamics
- CZ-5B error ระบุสูตรมีเครื่องหมาย `(predicted−actual)/actual×100`; Iridium ระบุมุมความเร็วเฉื่อยและ `u = v_ITRF + ω×r`, `ω=(0,0,7.2921159×10⁻⁵) rad/s`. เวกเตอร์uทั้งคู่ยังแสดงด้วยแกนร่วมที่ตรง ITRF ณ encounter epoch จึงหามุมเดียวกับในกรอบเฉื่อยได้ ไม่เรียกองค์ประกอบนี้ว่า ECI โดยไม่หมุนแกน
- ข้อไฮโดรเจนแยก Centaur upper stage ออกจาก Ariane core/เครื่องยนต์ orbiter ของ Shuttle ที่มี boosters ช่วยตอนยกตัว
- แก้ไวยากรณ์รัสเซียบางจุดและคำไทยเรื่องค่าเผื่อเฟส/ค่าพุ่งเกิน; รอบตรวจท้ายแก้คำซ้ำสองตำแหน่งใน `control.ts:167,174` โดยไม่แตะสูตรหรือ key
- รอบตรวจท้ายพบ `r-tsiolkovsky-calc` ภาษาไทยใส่g0=9.80665ขณะที่สูตร/EN/RUใช้9.81 จึงแก้เฉพาะข้อความไทยเป็น9.81; `r-liftoff-accel`ยัง9.80665ตรงสูตร. Assessment+i18n47/47ผ่าน และ `learning-bank-final-compatibility.json`ยืนยัน157IDs/ลำดับ/โครงสร้างคะแนนเดิมไม่เปลี่ยน,25numericfamilies/31,639ค่ารวมให้finitepositive พร้อมตัวอย่างTsiolkovskyคำนวณอิสระ. ไม่เรียกgridนี้ว่าindependentsolutionทุกสูตร

แหล่งปฐมภูมิที่ใช้ตรวจประเด็นเฉพาะ ได้แก่ [NASA SA-9](https://ntrs.nasa.gov/api/citations/19650014966/downloads/19650014966.pdf), [NASA Apollo13](https://nssdc.gsfc.nasa.gov/planetary/lunar/ap13acc.html), [ESA Ariane5 main stage](https://www.esa.int/Enabling_Support/Space_Transportation/Ariane/Ariane_5_cryogenic_main_stage_EPC), [NASA Centaur](https://www.nasa.gov/image-article/centaur-nasa-workhorse/), [NASA Shuttle](https://www.nasa.gov/history/rogersrep/v1ch1.htm) และ [JPL/NAIF frame transformation](https://naif.jpl.nasa.gov/pub/naif/toolkit_docs/C/cspice/xf2rav_c.html). ขอบเขตการอ่านแต่ละแหล่งและเหตุผลเชิงสูตรอยู่ใน [learning follow-up](learning-followup-review-TH.md); ไม่อ้างว่าอ่านเอกสารหลักทุกหน้าหรือรับรองทุกข้อเท็จจริงในคลังใหม่ทั้งหมด

คลังข้อสอบมี choice 109, multi 11, numeric 25, order 10 และ vehicle 2 รวม 157 ข้อ รอบ editorial ล่าสุดอ่านเปรียบเทียบ EN/TH/RU ทุก prompt, option, misconception, explanation และ ordering item ครบ **926 triples / 2,778 strings** แบ่งผู้ตรวจ 104 และ 53 ข้อโดยไม่ซ้ำ แก้ 29 strings ใน 8 IDs โดยคง key/params/formula/order ส่วนบทเรียน 24 บทอ่านครบ 176 triples / 528 strings และ track labels 12 triples / 36 strings ดู [บัญชีและข้อแก้ bank](editorial-audit/bank-editorial-review-TH.md), [รายงานบทเรียน](editorial-audit/lesson-editorial-review-TH.md) และ [AST verifier](editorial-audit/text-only-verification.json) การอ่านใหม่นี้ปิดช่องว่างการตรวจความหมายครบชุดที่ระบุ แต่ไม่ใช่การรับรองจากคณะบรรณาธิการมนุษย์หรือการรับรองข้อสอบเชิงสถิติ และไม่ได้อ้างว่าตรวจเอกสารปฐมภูมิใหม่ทุกค่าทางประวัติศาสตร์

## 4. ผลใช้งาน browser และไฟล์จริง

| เส้นทาง | ผลที่ทำจริง | หลักฐาน |
|---|---|---|
| Cases Iridium/CZ-5B/THEOS | กรอกคำตอบทดสอบผ่าน8/8,8/8,6/6 ตามลำดับ; บันทึก3passes | `cz5b-browser-pass.png`, `lessons-three-cases-saved.png`, `browser-import-evidence.json`; คำตอบสังเคราะห์/คำนวณเพื่อQA ไม่ใช่คะแนนเจ้าของเว็บ |
| เปิดหน้าใหม่และคงผล | หน้าใหม่แสดง “3 of 25 passed”, THEOS/CZ-5B/Iridiumผ่าน และมี QA Imported Lesson | `browser-persistence-dom.txt`; จำนวน25คือ built-in24 + custom lessonที่นำเข้าทดสอบ1 ไม่ใช่เพิ่มบทเรียนผลิตภัณฑ์ใหม่ |
| Results exportจริง | ไฟล์QA-Test135,093bytes; checksumผ่าน; สร้างworksheet/keyกลับจาก frozen input และให้ผลผ่านทั้ง6 first/latest records | [export evidence](ui-case-export-validation-TH.md), `ui-case-export-validation.json`, สำเนา `orbitlab-QA-Test-2026-09-29-19-39.orbitlab-results.json` |
| Assessment 25 ข้อและ draft ข้ามภาษา รอบแรก | ตอบ 5 ข้อแรกถูก อีก 20 ข้อตั้งใจข้าม; order ที่จัดบางส่วนคงอยู่ EN → TH, radio + Sure คงอยู่ EN → RU และ numeric 8.948396… คงอยู่ EN → TH; หน้า review แสดง 3σ ellipse และ step-response | `browser-assessment-path.json`, `browser-assessment-review-dom.txt`; รอบนี้มี choice/order/numeric ที่ตอบจริง ส่วน multi ตรวจเพิ่มเติมในรอบ final6 ด้านล่าง และยังไม่มี vehicle ใน draw นี้ |
| Assessment แบบเลือกหลายคำตอบ รอบ final6 | ข้อ 7 เลือก period, energy และ apogee รวม 3 จาก 5 ตัวเลือก พร้อม Sure; เปลี่ยน EN → TH → EN แล้วค่า ARIA checked ของคำตอบและความมั่นใจตรงก่อนเปลี่ยนภาษา จากนั้นส่งคำตอบและตั้งใจข้ามอีก 24 ข้อ | `browser-assessment-multi-final6.json`; ผลหน้า UI ถูก 1/25 ข้อ คะแนนถ่วงน้ำหนัก 4% และ misconceptions 0 เป็น QA คนละรอบกับผล 19% เดิม ไม่ใช่คะแนนเจ้าของเว็บ และไม่อ้างว่าทดสอบ multi ทั้ง 11 ข้อผ่าน UI แล้ว |
| Assessment แบบภาพจรวด รอบ final6 | ใน post-test ข้อ 1 ภาพ Starship โหลดสำเร็จ ขนาดต้นฉบับ 542×720; เลือก Starship แล้วเปลี่ยน EN → RU → EN ค่า ARIA checked ของ radio คงเดิม ส่งคำตอบและตั้งใจข้ามอีก 24 ข้อ หน้า review แสดงถูกและให้เครดิต Hotel Pika · CC BY-SA 2.0 | `browser-assessment-vehicle-final6.json`, [ภาพ UI](assessment-vehicle-photo-final6.jpg); ผลถูก 1/25 ข้อ คะแนนถ่วงน้ำหนัก 3% และ misconceptions 0 เป็น QA อีกครั้ง แยกจาก 4% และ 19% เดิม ปิดเฉพาะภาพและรูปแบบ UI นี้ ไม่รับรองรูปจรวดทุกภาพหรือคุณภาพข้อสอบทางสถิติ |
| Assessment results exportจริง | ไฟล์143,023bytesเก็บ3casepassesและ1assessment; verifyResultsผ่าน, negativecontrolถูกปฏิเสธ; scoreAttemptคำนวณซ้ำ5correct/20skipped=19% ตรงsummary | `ui-assessment-export-validation.json`, สำเนา `orbitlab-QA-Test-2026-09-29-19-56.orbitlab-results.json`; คะแนนถ่วงน้ำหนัก7/37ปัดเป็น19% ไม่ใช่ค่าเฉลี่ย5/25 ไม่ใช่คะแนนเจ้าของเว็บ |
| Case exportหลังแก้race | กดส่งออกแล้วสลับcaseเร็ว ทั้ง3cases×worksheet/key รวม6HTML ชื่อกับtitleตรงทั้งหมด | `case-export-race-browser-after.json` เก็บขนาด/SHA256/titleและชื่อสำเนา `browser-fixtures/after-race-*`; origin4178 build `index-B6cCeHuf` |
| Fresh DOCXหลังแก้pagination | Point-mass Falcon9/1,000kg/target500km; ใบงาน3หน้า+key1หน้าจัดข้อและตัวเลือกครบ ไม่เห็นclippedtext | [DOCX evidence](docx-pagination-validation-TH.md); `browser-export-artifacts/docx-after-pagination/` มีต้นฉบับ/hash/PDF/PNG/manifest. Missionepoch30ก.ย.ในชื่อไฟล์ไม่ใช่วันรัน29ก.ย.; เป็นflight/drawใหม่จาก4179 |
| TH/RUworksheetexports | หลังแก้ส่งออกQAFINAL4ใหม่8HTML/DOCX; สั่งTHDOCXแล้วเปลี่ยนRUทันที ยังคงป้ายไทยครบ. render4DOCXและตรวจภาพครบ8หน้า:ภาษาตรง โจทย์/ตัวเลือกไม่แยกหน้า ไม่มีข้อความตัดที่สังเกตพบ | `browser-export-artifacts/docx-language-after/{manifest,render-validation}.json`; LibreOffice26.8.0.3/Poppler100dpi. ชุดก่อนแก้ `docx-multilang-final/` ยังเก็บเป็นหลักฐานความผิดพลาด ไม่เรียกว่าผ่านภาษา |
| กรณีศึกษา TH/RU หลัง editorial และ layout final | 3 cases × worksheet/key × HTML/DOCX × TH/RU ได้ 24 downloads จริง; 12 DOCX/18 หน้าตรวจภาพครบหลังแก้ พร้อมข้อความตรงก่อนแก้ทุกไฟล์ | [หลักฐาน source 4cf7](worksheet-case-export-layout-TH.md); ชุด before277 เก็บความผิดพลาดแยก ไม่ถือว่า layout ก่อนแก้ผ่าน |
| Activecase/noflightkeygates | activeIridiumก่อนตอบkeyHTML/worksheetkeydisabledแต่sheetenabled; หลังrevealแจ้งรอบไม่ผ่านและเปิดkey. ยังไม่มีendedflightทำให้flightworksheet/keydisabled | `browser-key-gating-final6.json`; caseอื่นขณะIridiumactiveตั้งใจเปิดตามpolicy ไม่ใช่globalgate และไม่เหมาว่าทดสอบnegativegateครบ3cases |
| Engineering PNG จากการคลิกและแป้นพิมพ์ | final6 พอร์ต 4182 ส่งออก Mass flow ภาษาไทยด้วยการคลิก ได้ไฟล์ 127,037 bytes; Tab → Enter ที่ Specific impulse ได้ไฟล์ 98,553 bytes ทั้งคู่ขนาด 2400×1200 และตรวจภาพจริงแล้ว | `browser-export-artifacts/engineering-png-final6-validation.json`, `browser-png-keyboard-final6.json`; การกด Return รอบก่อนที่ไม่มี event ไม่ใช้เป็นข้อสรุปว่ามีบั๊กหรือปัญหา permission |
| Boundaryimports | missionpartialrecovery/version999; flightinvalid/overflow; designinvalid/newerversion; OMMmixed/type4/oversize; CDMinvalid/oversize; lessonpartial/duplicateทำผ่านUI | `browser-boundary-validation.json`; TLEbadchecksumรับตามcompatibilityเดิมและไม่มีwarning ถือเป็นข้อจำกัด ไม่สรุปstrictchecksumผ่าน |
| Missionfile/linknormalroundtrip | ไฟล์จริงนำเข้าUI→แชร์ผ่านaddress-barfallback→เปิดแท็บใหม่;46MissionSetupcontrolsตรงกัน. IndependentrawDEFLATEdecodeเทียบต้นฉบับครบ24leaf/empty-containerpathsไม่มีmissing/extra/diff รวมUTCmillisecond | `browser-mission-roundtrip-validation.json`, `browser-mission-link-roundtrip.json`, `browser-mission-roundtrip.json`; ไม่อ้างclipboardwriteสำเร็จหรือทุกmissioncombination |
| Builddraft/savedexport | DraftB8enginesส่งออก/นำกลับ8; exportSavedAขณะBactiveยัง9engines; importAกลับเปิด9/เพิ่มrecordใหม่และกลับBยัง8 | `browser-build-export-selection.json`, `browser-build-saved-a-roundtrip.json`,boundaryJSON; ไฟล์จริงสองชุดเก็บแยกพร้อมSHA256 |
| Lesson import | v1สังเคราะห์เข้าคลังและคงอยู่เมื่อเปิดหน้าใหม่; JSONเสียถูกปฏิเสธ; EN→TH→ENยังคงtitleและFalcon/site locks | `browser-fixtures/custom-lesson.json`, `browser-persistence-dom.txt`, `browser-custom-lesson-language.json` |
| Build Save/Export/Import | QA-Falcon-Aบันทึก/ส่งออก2,334bytes/นำกลับได้; JSONเสียปฏิเสธ; Engineerเห็นแบบแก้ใหม่; Wind tunnelว่าง/ติดลบล้างกราฟ | ผล UI ใน `RESUME-CHECKPOINT-TH.md` ช่วง 22:48 และวงจรไฟล์จริง/SHA256 ใน `browser-build-export-selection.json`, `browser-build-saved-a-roundtrip.json`; ไม่ใช้ป้าย saved เพียงอย่างเดียวเป็นหลักฐานไฟล์ |
| Reference import | ไฟล์validเป็นreference; overflow JSONถูกปฏิเสธและreferenceที่รับไว้ยังอยู่ | fixtures `valid-reference.orbitlab-flight.json`, `reference-overflow.json`; UIผู้ประสานงานยืนยันหลังแก้; regression48/48 |
| Satellite import | ISS JSONและTLE/2LE/CSV/XML/KVNเข้าผ่านUI; ไฟล์2LEไม่มีชื่อแสดง(no name)ตามข้อมูล; rejected JSONไม่ทำaccepted ISSหาย | `browser-import-evidence.json`; format arrayมี5รูปแบบ ส่วนJSON/after-invalidยืนยันในDOMรอบใหม่ตามหมายเหตุ ไม่ตีความ arrayว่างว่าได้ตรวจหรือว่าล้มเหลว |
| CDM | Alfano1ให้Pcแสดง0.147 เทียบfixture0.1467495; ลบOBJECT2แล้วerrorและไม่แสดงPcเก่า | `browser-import-evidence.json` มีทั้งข้อความสำเร็จ/ล้มเหลวและข้อมูลplane |
| Maneuver menus | หลักฐานรอบใหม่8ชนิดนอกHohmannแสดงผลplan/errorที่ตรงเงื่อนไข; ไม่มีerrorsตามบันทึกของผู้ตรวจ | `browser-maneuver-smoke.json`: bi-elliptic, plane change, circularise, phasing, deorbit, spiral, manual, Lambert; เป็นsmokeไม่ใช่boundary matrixทุกค่า |
| Full flight/exports/replay | UIบินถึงtarget achievedที่3220.2sและเก็บข้อมูลต่อถึง4941.375s; flightJSONผ่านproductionparser/roundtripตรง,1,194rows/24events/2,466pathpoints; replay600→900→600ให้apsidesกลับค่าเดิม | `browser-export-artifacts/production-parser-validation.json`, `browser-replay-600-900-600.json`; CSVlive/replayเหมือนทุกไบต์,116columns,รายงานHTML4tables/8embeddedPNGตรวจในartifact-structure-validation.json |
| Monte Carlo | browser20runsจากseed20260929จบ:20inserted/20onTarget/0lost; JSON/CSVsummaryตรง และเทียบdraw values220ค่ากับ20derivedseedsตรงสี่ตำแหน่ง | `browser-monte-carlo-20.json`, `browser-export-artifacts/production-parser-validation.json`; ไม่ใช้batch20นี้รับรองทุกseed/dispersionหรือสถิติความน่าเชื่อถือ |
| ภาพ Build ครบ 21 แบบ × 2 โหมด | เก็บภาพจริงหลัง animation จบ และผู้ตรวจกราฟิกเปิดดูต้นฉบับครบ 42/42 ภาพ โหมด Assembled/Taken apart ตรงกัน ไม่พบภาพว่าง ชิ้นส่วนที่ควรแสดงหลุดกรอบ หรือป้ายชนจนอ่านไม่ได้ | [รายงานภาพ Build](build-visual-42-validation-TH.md), `browser-build-visual-final6-settled/review-matrix.json`; ตรวจ desktop 1280×720 ภาษาอังกฤษ ธีมมืด ไม่ใช้ DOM เดิมแทน visual proof และไม่อ้างครอบคลุมทุกภาษา ขนาดจอ หรือ part card |

SHA-256 ของ results export จริงคือ `59e3d2bb809df84aa34a8d2530b888a451f757c45249d6d337c12486a0b515d2`. `verifyResults` คืนtrue และสำเนาทดลองที่เปลี่ยนชื่อถูกปฏิเสธ. CZ-5B/Iridium keyสร้างกลับตรงทุกค่า; THEOSต่างทศนิยมท้ายสูงสุด1.59×10⁻¹²km ในreach ซึ่งเล็กกว่าtolerance10kmมาก ข้อความ/ตาราง/คำตอบที่แสดงตรงทั้งหมด และคำตอบที่UIบันทึกยังผ่าน6/6 ไม่แก้toleranceเพื่อให้ผลผ่าน

Progressรวม first/latestใช้50,313JSONcharacters/59,009UTF-8bytes. CZ-5Bเก็บ366daily entriesเพื่อครอบคลุม horizon365วัน; THEOS/Iridiumไม่แบก solar series ที่ไม่ได้ใช้. การส่งออกมีchecksumสำหรับตรวจการเปลี่ยนแปลง ไม่ใช่ลายเซ็น และไม่มี production importerสำหรับrestoreผลนี้ การทดสอบload/saveในmemoryไม่ถูกเรียกว่าฟีเจอร์restore

ไฟล์assessmentรอบหลังมีSHA-256 `f8d77fbd03fee1128e8bdf0bfc025bbf2b622b5a573c2061fab949c2560442c1`; เก็บสำเนาต้นฉบับทั้งสองรอบไว้แยกกัน ไม่เขียนทับหลักฐานกรณีศึกษารอบแรก

Audiooffsetท้ายรอบ4ตรวจด้วยnativekeyboardได้1:00และคงหลังreload; bad/310digitsถูกปฏิเสธโดยค่าบันทึกเดิมไม่หาย; RemoveกลับbundledNASA ดู `browser-audio-validation.json` และ `browser-audio-final4-{keyboard-reopen,invalid,reload-confirmed,removed}.txt`. ยังไม่รับรองaudibility/การซิงก์เสียงจริงหรือinvalidcodec. การเปิดHTMLreportจริงด้วยfile://ถูกbrowsersecuritypolicyของเครื่องมือปฏิเสธ ไม่หาวิธีเลี่ยงและคงC12เป็นstructural-only

## 5. กราฟิกและ Build catalogue

ตรวจfollowupfinal5เพิ่มที่viewport320×844, canvasจริง287.333×480/buffer287×480,DPR1: fit/zoommax/rotate/reset/equal-time sectorsและMolniya600×39,750km/11h58แสดงได้ ตรวจภาพหลังรอเฟรมsettleแล้ว; `browser-orbit-narrow-final5.json` logsว่างและภาพ `orbit-narrow-final5-{fit,maxzoom,sectors}.png`, `orbit-final5-molniya-sectors.png`. การแก้background depthเพิ่มinvariantไม่ให้ดาวอยู่หน้าEarthที่portraitmaxzoomอยู่ใน `orbit-background-followup-TH.md`. ที่zoommaxEarthมีเพียงไม่กี่pixel จึงใช้source/rayregressionsประกอบ ไม่อ้างpixelproofเกินภาพ. เครื่องมือviewportรอบนี้ไม่มีDPR2override

LaunchและOrbitใช้โมดูลดาวร่วม ขอบนุ่ม สีและความสว่างหลายระดับ แก้ขนาดดาวให้สัมพันธ์กับCSS pixels/DPR และปรับDPRเมื่อเปลี่ยนจอ Orbitย้ายดาวตามตำแหน่งกล้องให้คงทิศของฉากไกล แก้disposeทั้งgeometry/materialเมื่อสร้าง/ปิด equal-time sectors. ไม่ได้เปลี่ยนtrajectory physicsจากการปรับภาพเหล่านี้ และดาวเป็นภาพประกอบ ไม่ใช่แคตตาล็อกตำแหน่งดาวจริง

Regressionหลังรวม **50/50** ใน `render-stars-regression.test.ts` กับ `design-stack-drawing.test.ts` ผ่าน และTypeScriptผ่าน: attributesดาว6,000ดวงfinite/deterministic; กล้อง50→2,000คงทิศดาว; aspectมือถือใช้canvasจริง357.33/480; DPR1→3→1.25ถูกcapที่2; Launch renderer/composer/staruniformสอดคล้อง; sectorsเก่าถูกdispose. เป็น production-method testsที่stub renderer ไม่ใช่หลักฐานshader/GPU/rasterized appearance

หลักฐานภาพก่อนแก้ Orbit desktop/mobile/zoom อยู่ใน `browser-before-focused-fixes-TH.md` และภาพ3ไฟล์ที่ลิงก์ไว้; `orbit-desktop-final.png` เห็นEarth/orbit/starsจริง และ `launch-space-final.png` เห็นLaunch space/replay/reference. ภาพmobileรอบแก้viewportแล้วที่ตรวจด้วยตาคือ `orbit-mobile-final.png` (390×844), `launch-mobile-final.png`, `build-mobile-final.png` และ `build-saturn-mobile-final.png`: Earth/วงโคจร, Launch replay/controlsและBuildอ่านได้ในพื้นที่แคบ ผู้ตรวจbrowserยืนยันไม่มีhorizontaloverflow. ต่อมาเก็บภาพ Build final6 หลัง animation จบ และเปิดดูต้นฉบับครบ 42 ภาพของ 21 รุ่น × 2 โหมดแล้ว ดู [รายงานภาพ Build](build-visual-42-validation-TH.md) ขอบเขตคือ desktop 1280×720 ภาษาอังกฤษ ธีมมืด ไม่ใช่การตรวจทุกขนาดจอหรือทุกภาษา. DPR/resize/near-farมีregressionระดับproductionmethodตามข้างต้น ไม่ใช้ภาพviewportเดียวแทนอุปกรณ์จริงหลายDPR/GPU. ไม่แก้BuildSVGเพียงเพื่อให้มีdiff

Build matrixแบบแจกแจงจบด้วยexit0: **6,542/6,542 ผ่าน**,193.68s. รายละเอียดที่นับจริง:

| กลุ่ม | จำนวนและผล |
|---|---|
| Stage body50 × engine55 × pad/upper2 | 5,500คู่; padรับ349,upperรับ614 ที่เหลือปฏิเสธตามfamily/solid/vacuum-on-pad |
| Booster body14 × engine55 | 770คู่; รับ86 ที่เหลือปฏิเสธตามข้อจำกัด |
| รวมbody–engine | 6,270คู่ = รับ1,049 + expected rejection5,221 |
| Fairing/body/payload/count boundaries | 17 +28 +7 +220 =272 รวมทั้งหมด6,542 |
| Design payload ratings | 1,066แบบ × LEO/GTO2 =2,132ratingsคำนวณจบ; ค่าความสามารถเป็นบวก327LEO/302GTO ไม่ใช่ทุกแบบบินได้ |

`build-catalogue-matrix-results.json` มี3,629probe flightsในผลที่เก็บ; บันทึกอย่างโปร่งใสว่ารอบแรกมีการยก toleranceเชิงวิเคราะห์เพื่อรองรับ cancellationที่dryMass0.001และรันทั้งชุดซ้ำผ่าน โดยไม่แก้production; 2ratingsที่ติดtime budgetตรวจซ้ำด้วย8sแล้วจบ. ไม่แปลงexpected rejectionเป็นbug และไม่ใช้ชุดmodelนี้แทนการคลิกประกอบทุกคู่ผ่านUI. ดู `validationEvidence` ในJSONและ `build-catalogue-matrix-run-final.txt`

**ข้อจำกัดที่พบเพิ่ม:** มี16upper-stage designsที่GTO ratingมากกว่าLEO เช่นfregat/l25ให้LEO0เนื่องจากnoInsertionแต่GTO313kg. ชุด6,542ตรวจcompatibility/finitevaluesและsearchconvergence จึงยังผ่านตามassertionที่ตั้งไว้ แต่ไม่รับรองphysicalpayloadratingทุกแบบ ประเด็นนี้ต้องตรวจguidance/acceptanceของratingก่อนตัดสินว่าเป็นbugและแก้ ไม่แก้physicsด้วยการคาดเดา

## 6. ฟิสิกส์ บทเรียน และผลทดสอบที่จบจริง

### Runtime fingerprint ที่เคยไม่ตรง

Repository CIกำหนดNode22. ในcheckoutเดิมและsourceเดิม ตัวแทนSoyuz2.1a/LEO/50บนNode24.19.0ให้hash `a173338ebfab9d7b` ซ้ำสองครั้งและเมื่อปิดJIT; เปลี่ยนเฉพาะruntimeเป็นNode22.23.3ให้ `deef4d6e49a74ea0` ตรงgoldenทั้งสองครั้ง โดยไม่เปลี่ยนbaseline

รันเต็มfamilyแล้ว **D01 28/28** ผ่าน (27point-mass flights +1completeness) และ **rigid-flex 4/4** ผ่านบนNode22.23.3/V8 12.4.254.21-node.57 รวม32tests/31fingerprint comparisons. จึงยืนยันruntime-dependent exact numerical hashingสำหรับกรณีตัวแทนและสองfamilyนี้ ไม่ใช่LF/CRLF และไม่ใช่การพิสูจน์ว่าทุกheavy mismatchหายแล้ว. ไม่ได้วัดว่าความต่างtrajectoryระหว่างruntimesเริ่มที่fieldใด/มีขนาดเท่าใด

Cloud numericalใช้Node22.22.2/V8 12.4.254.21-node.39 Linuxx64 พร้อมworker runtime log. แยกpatchversionของNodeแต่ละเครื่องในหลักฐานไว้ ตาม [runtime report](runtime-fingerprint-validation-TH.md) ห้ามregenerategoldenเพื่อปิดfailureโดยไม่อธิบายสาเหตุ

### ทะเบียนผลที่จบแล้ว

| ชุด | ผลจบจริง | ขอบเขตและไฟล์หลักฐาน |
|---|---:|---|
| Integrated focused | 74/74 | `integrated-focused-results.json`: case23,mission16,i18n16,design-store11,worker5,bench3 |
| Integrated regressionรอบท้ายก่อนDOCX/chartท้ายรอบ | 166/166 | `integrated-final-regressions.json`,11files,Node22; เป็นชุดรวมที่ซ้ำกับfocusedด้านล่าง ไม่บวกยอดซ้ำ |
| Integrated regressionหลังDOCX/chartท้ายรอบ | 195/195 | `integrated-final-regressions2.json`,16files,Node22,success=true; supersedes166สำหรับชุดรวมเฉพาะทางนี้ ไม่ใช่fullstandard |
| Integrated regressionหลังlocale/audioท้ายรอบ | 259/259 | `integrated-final-regressions4.json`,22files,Node22,0skip,success=true; ชุดรวมล่าสุดนี้แทน195ในระดับfocused ไม่บวกยอดเก่าซ้ำ |
| Integrated final5หลังprogress/portrait/RUfollowup | 280/280 | `integrated-final-regressions5.json`,23files,Node22,0skip,success=true,testexit0; buildexit0ใน `integrated-build-final5.log/.exit`. แทน259ในระดับfocusedรวม ไม่บวกยอดซ้ำ |
| Integrated final6หลังKepler/Lambertboundaryfix | 301/301 | `integrated-final-regressions6.json`,25files,0skip,success=true,testexit0และbuildexit0; supersedes280สำหรับfocusedนี้ ไม่ใช่fullCIหรือheavyผลจบ |
| GitHubActionsCIรอบPR41เดิม | 9,187pass/1fail จาก9,188 | run36628517818,head3eff70b/mergee1a4bfa,Node22.23.2,187files. Failureเดียวเป็นarchitecture-regexนับimporttypeเป็นruntimeผิด; testเปลี่ยนเป็นTSASTและfullpropagator26/26ผ่านแยก. ผลรอบเก่าคงไว้ตามจริง; รอบแก้ผ่าน 9,241/9,241 ตาม summary ของ 0b และ c146 ไม่แก้ผลเก่าเป็น green |
| Reference nonfinite final | 48/48 | `reference-overflow-after-fixed-fixture-20260929.json/.log`; ไม่ใช้ไฟล์afterรอบที่fixtureยังผิด |
| Export race + sky import | 8/8 | `case-export-race-after.json`; raceใหม่3,sky-import5; TypeScriptผ่าน |
| DOCX pagination + worksheet | 15/15 | `docx-pagination-after.json`; ใหม่9 +เดิม6,Node22; XML/ZIP/APIและfreshbrowserartifact renderผ่านแยกกัน |
| Graphics/drawing | 50/50 | `graphics-validation-TH.md` ส่วนตรวจintegrated; model-levelไม่ใช่WebGLbrowserทั้งหมด |
| Build finite matrix | 6,542/6,542 | `build-catalogue-matrix-results.json`, `build-catalogue-matrix-run-final.txt` |
| Node22 D01/rigid-flex | 28/28 +4/4 | `fingerprint-node22-d01-full-20260929.json`, `fingerprint-node22-rigid-flex-20260929.json` |
| Windows six-DOF fleet | 163/163 | `fleet-results.json`,success=true,0pending; 126calm+34crosswind/shear+3LongMarch2D; sourceก่อนรวมCloud |
| บทเรียน 6-DOF รันใหม่บน integration | 7/7 | [ผลใหม่](actions-heavy-results/36631307401/collected-heavy/lessons-sixdof/result.json), provenance และ worker runtime ยืนยัน `0b844f7` / Node 22.22.2, exit 0; เป็น headless ไม่ใช่ browser ทั้ง 7 บท ผล Windows เดิม `lessons-sixdof-results.json` เก็บแยก |
| Assessmentโครงสร้างเดิม | 157ข้อ scoringไม่เปลี่ยน | `learning-bank-compatibility.json`; ผลก่อนCloudข้อความล่าสุด ไม่ใช่immutablebankversion |
| Assessmentตัวเลขเดิม | 25families/31,639combinations | `audit-2026-09-28/assessment-systematic-results.json`; independent numeric check/draw1000คู่ ไม่ใช่psychometrics |

**ไม่บวกทุกแถวเป็นยอดunique tests**: case23,mission16,worker5ฯลฯรันซ้ำในfocused74 และหลายไฟล์เป็นส่วนหนึ่งของstandard/heavyอีกครั้ง Build matrix เพิ่มหลัง snapshot ของ Cloud standard เดิม แต่ปัจจุบันอยู่ใน regular standard suite และรวมในยอด CI 9,241 แล้ว จึงห้ามบวก 6,542 ซ้ำอีกครั้ง

### Coverageของยาน21รุ่นกับบทเรียน24บท

แคตตาล็อก21รุ่นคือ Soyuz2.1a/2.1b, Proton-M, Angara-A5, Falcon9/Heavy, AtlasV551, VulcanVC4, Ariane64, Vega-C, LongMarch2D/3B-E/5, H-IIA202, H3-22, PSLV-XL, Electron, Starship, Sputnik8K71PS, Vostok-K และSaturnV. Fleet163ใช้accepted mission rowsที่ฐานเริ่มต้น/capability/corridorรองรับ ไม่ใช่cartesianทุกยาน–ฐาน–วงโคจร–ลม–failure–recovery

Fleet163ครอบคลุม **18unique vehicles** จากชื่อassertionจริง: Proton-M (7), Ariane64 (14), H-IIA202 (14), Starship (7), Falcon9 (8), Vega-C (11), LongMarch5 (11), Electron (11), Angara-A5 (7), AtlasV551 (11), H3 (14), PSLV-XL (7), Soyuz2.1b (9), FalconHeavy (8), Vulcan (11), LongMarch3B-E (8), SaturnV (2), LongMarch2D (3). ตัวเลขในวงเล็บคือจำนวนtestsรวม163; สามรุ่นที่อยู่นอกfleetชุดนี้คือSoyuz2.1a,SputnikและVostok ซึ่งมีหลักฐานรันใหม่ครบแล้วใน [vehicle coverage union](actions-heavy-results/36631307401/vehicle-coverage-union.json): 22 tests จาก flex-fleet 1–4 และ history-sixdof ครอบคลุม 21 รุ่นไม่ซ้ำบน source `0b844f7` พร้อมชื่อ assertion และ hash ของหลักฐาน ไม่ใช้ fleet163 เพียงชุดเดียวอ้างครบ 21 รุ่น และไม่เหมาว่าทุกเที่ยวบิน on target เพราะ Vostok มีเงื่อนไข J2 off-target ที่ test ระบุไว้

ชุดheavy catalogue fingerprintมีครบ21รุ่นจริง แต่บินเฉพาะ160sแรกที่LEO50%/crosswind; ไม่ใช่ครบmission. Historical six-DOF Sputnik/Vostok/Apolloอยู่ในheavyแยก ไม่ควรอ้างว่าfleet163รับรองครบ21รุ่นทุกภารกิจโดยตัวมันเอง. Recoveryมีdownrange/droneShip/landingZone/expended; FalconHeavyแยกcore/boostersและSuperHeavyมีtowercatch แต่orbital passกับlanding passต้องแยก โมเดลrecoveryยังเป็นexperimental

บทเรียน 24 บทแบ่งเป็น 14 point-mass (1.1–1.5, 2.1–2.2, 3.1, 3.3, 5.1–5.5), 7 six-DOF และ 3 กรณีศึกษา ผล heavy lesson ใหม่ทั้ง 7 assertions บน `0b844f7` ผ่านครบ โดยครอบคลุม:

| บท | สิ่งที่กรณีผ่านยืนยัน |
|---|---|
| 2.3 | tactical INSควบคุมpositionerrorก่อนMECOภายใน500m |
| 2.4 | selected dispersed runของseed1บินได้และperigeeตรงผลrun; ไม่ใช่รับรองความเข้าใจสถิติ3σ |
| 3.2 | FDIRแยกIMUที่stuckgyroและภารกิจผ่าน |
| 4.1 | อ่านcrossover/phase marginที่max-Qตรงเกณฑ์ |
| 4.2 | gainsที่เลือกให้phase≥30°/gain≥6dBตามโมเดลและยานรอด |
| 4.3 | fast tuningovershootเกินเกณฑ์/default gainsผ่าน, มีการทดสอบจริงในflight |
| 4.4 | เปิดbendingกับnotchแล้วยานผ่านmax-Qตามเกณฑ์ |

### ประวัติ Cloud เดิม — ไม่ได้ใช้ปิด acceptance ชุดสุดท้าย

| งาน | ผลหรือข้อจำกัดของรอบเดิม | หลักฐานและการรับช่วง |
|---|---|---|
| standard1/8 | 315passed,0failed | finalJSON/logได้อยู่ในcheckpointpatch |
| standard2/8 | 224passed,0failed | เช่นเดียวกัน |
| standard3/8 | 259passed,0failed | finalJSON/logในrecovered-parent-3-4 |
| standard4/8 | 326passed,0failed | finalJSON/logในrecovered-parent-3-4 |
| standard5/8 | 314passed,0failed | เช่นเดียวกัน |
| standard6/8–8/8 | จบแล้ว; เมื่อนับทั้ง8shards=2,542pass/2fail | union2,544unique assertions/177files,0duplicate/skip; รายละเอียดด้านล่าง |
| heavy1/3 | ไม่มี final result ที่ใช้รับรอง | รับช่วงด้วย GitHub Actions ซึ่งปิดครบ 246/246 แล้ว |
| heavy2/3 | ไม่มี final result ที่ใช้รับรอง | รับช่วงด้วย GitHub Actions โดยคงประวัติ Cloud แยก |
| heavy3/3 | ไม่มี final result ที่ใช้รับรอง | รับช่วงด้วย GitHub Actions โดยคงประวัติ Cloud แยก |

ยอดstandardครบ8shardsคือ **2,542passed/2failed จาก2,544unique assertions/177files**. `cloud-numerical-shards/standard-coverage-union.json`ตรวจunionไม่มีซ้ำ/skip พร้อมsource/runtimeที่ใช้. FailureแรกคือCloudsourceยังขาด `build.eng.tunnel.invalidPayload` ซึ่งintegratedแก้แล้ว; อีกกรณีSoyuz `heaviestPassing` ใช้5653msเกินtimeout5000ms. รันทั้งไฟล์i18n+exploreบนintegratedด้วยNode22.23.3ได้ **35/35ผ่าน**,กรณีSoyuzใช้644msโดยไม่เปลี่ยนassertionsหรือdefaulttimeout ดู `cloud-numerical-shards/standard-failures-focused.{json,log,exit}`. Cloudtaskเดิมแยกรันexploreทั้งไฟล์อีกครั้งได้ **19/19ผ่าน**,กรณีเดียวกัน1238.4msบนLinuxNode22.22.2/sourceเดิม/timeoutเดิม อยู่ใน `recovered-standard-explore-followup/.../explore-isolated-rerun/`. ไม่แก้ผลCloudเดิมเป็นallgreenและไม่บวกการรันซ้ำเป็นunique tests

Dispatch manifest ของ Cloud เดิมอยู่ใน `cloud-numerical-shards/manifest.json`; session heavy ของ Cloud ชุดนั้นไม่มี final result ที่ใช้ปิดงาน จึงไม่นับเป็นผลผ่าน การตรวจรับครบชุดใช้ GitHub Actions ที่จบแล้วด้านล่างแทน โดยเก็บประวัติ Cloud ไว้. ชุดheavyเดิมWindowsมี180pass/24hashfailและไม่มีfinalsummary จึงใช้แทนผลใหม่ไม่ได้. Inventoryเดิมคือstandard177files,heavy27files/246tests,fleet6files/163tests; ชุด focused final6 คือ 301/301 ข้างต้น ส่วนชุดหลังแก้ข้อความล่าสุด 165/165 เป็นอีกขอบเขตหนึ่ง ไม่บวกยอดซ้ำ

GitHub Actions บน commit `0b844f77f5f0ffdeb7274642ddf74a57c2ee230b` ปิด **standard 9,241/9,241 tests, 190/190 files** แล้วทั้ง [PR CI](https://github.com/ROYIN001/Orbitlab/actions/runs/36631312923) และ [push CI](https://github.com/ROYIN001/Orbitlab/actions/runs/36631307359) โดย npm ci/typecheck/test/build สำเร็จ ทั้งสองรันเป็นชุดเดียวกันและไม่บวกยอด Node ที่รัน test คือ 22.23.2 และ 22.23.3 ตามลำดับ ดู [summary และ logs](actions-heavy-results/ci-final-standard-summary.json) Browser acceptance รุ่น workflow ครบสี่เส้นทางผ่าน 4/4 บน `9737f21` ตาม [ผลจริง](actions-heavy-results/browser-36634805813/audit-browser-logs/summary.md) ส่วน [heavy run](https://github.com/ROYIN001/Orbitlab/actions/runs/36631307401) จบ SUCCESS เวลา 22:09:55 UTC วันที่ 29 กันยายน ใช้เวลา 61 นาที 1 วินาที: [final summary](actions-heavy-results/36631307401/final-summary.json) และ [union](actions-heavy-results/36631307401/final-union.json) ยืนยันครบ 246/246 ใน 27 ไฟล์ ไม่มี missing/duplicate/unexpected/skipped/failed ทุกไฟล์ exit 0 และ actual workers Node 22.22.2 ทั้ง collector บน Actions และการตรวจ ZIP อิสระตรงกัน ไม่ใช้ workflow, worker probe หรือ synthetic collector tests เป็นผลฟิสิกส์

รอบตรวจข้อความล่าสุดแก้ 57 localized strings ใน 11 production files โดย AST ส่วนอื่นตรง baseline ทุกส่วน การรัน focused ครั้งแรกมี 164/165 ผ่าน: test fixture ของ V1 lesson ยังเทียบข้อความกับ builtin ที่แก้สำนวนแล้ว ทั้งที่ parser รักษาข้อความไฟล์เดิมถูกต้อง จึงปรับเฉพาะ assertion ให้เทียบกับ JSON ต้นฉบับและคง exact LF roundtrip; ไม่เปลี่ยน fixture/golden ผลก่อนแก้เก็บใน `editorial-audit/focused-before-fixture-expectation-fix.json` หลังแก้รันใหม่ **165/165 ใน 13 ไฟล์ผ่าน** พร้อม typecheck/build exit 0 บน Node 22.23.3 ดู [final runtime](editorial-audit/final-runtime.json), [ผลทดสอบ](editorial-audit/final-focused.json) และ [build](editorial-audit/final-build.log) source exact hashes อยู่ใน AST verification; ขณะรัน HEAD ยังเป็น `9737f21` พร้อม working changes ที่ถูก commit ต่อเป็น `c146a699f01bb5d299af39e3ca9742445442b474` ต่อมา PR full CI ของ `c146a699` ผ่าน 9,241/9,241 แล้วตามหลักฐานด้านล่าง ไม่ใช้ผลนี้แทน CI ของ status wording commit `76534dc1`

ผล test ผ่านไม่ได้หมายถึงเที่ยวบินกระจายค่าทุกเที่ยวบินสำเร็จ ชุด Monte Carlo หนักครบ 5 ชุดรวม **170 เที่ยวบิน: 152 เข้าวงโคจร, 142 ตรงเป้า, 10 เข้าวงโคจรแต่คลาดเป้า และ 18 สูญเสีย** (Falcon structural 12; Soyuz aerodynamic breakup 3 และเชื้อเพลิงหมด 3) ดู [outcomes](actions-heavy-results/36631307401/monte-carlo-outcomes.json) ซึ่งคง baseline acceptance เดิม ไม่ใช่รับรองว่าความสูญเสียตรงโลกจริง ส่วน validation-timelines ตรวจให้ความต่าง 41 published metrics ตรงชุดที่บันทึก ไม่ใช่ยืนยันว่าค่าจำลองตรงข้อมูลจริงทั้งหมด การบินขึ้นสู่วงโคจรและการกู้ booster แบบทดลองจึงต้องแยกข้อสรุป

หลัง desktop probe พบว่า “Saved” เป็นเพียงข้อความหลังสั่ง `a.click()` จึงแก้สถานะเพิ่ม 3 strings เป็น “File prepared / Файл подготовлен / เตรียมไฟล์แล้ว” ใน commit `76534dc1` รวม **60 strings / 11 production files** โดย [AST ของรอบข้อความถึง 765](editorial-audit/text-only-verification.json) ส่วนอื่นเท่าเดิม; หลักฐานนี้ไม่ครอบคลุมการแก้ rendering/layout ที่พบภายหลัง มี [29/29 tests](editorial-audit/status-wording-tests.json) ใน 3 ไฟล์ผ่านและ [build](editorial-audit/status-wording-build.log) exit 0 ส่วน [AST 57 strings ของ c146](editorial-audit/text-only-verification-c146.json) และผล 165/165 เก็บเป็น snapshot ของรอบก่อน ไม่เปลี่ยนผลย้อนหลังหรือกล่าวว่าตรวจทั้ง 165 ใหม่บน 765

CIเก่า9,188testsต่างจากCloud2,544ด้วยcataloguematrix6,542และregressions102รวม6,644 ไม่ใช่ค้นพบhandoff/scratchเพิ่มโดยไม่ตั้งใจ; `actions-heavy-fallback/ci-count-difference.json` แสดงรายไฟล์. Failureเดิมเป็นตัวตรวจimporttypeผิด: [การวิเคราะห์และ26/26closure](actions-heavy-fallback/ci-architecture-diagnosis-TH.md). คงผลเก่า9,187pass/1failและbrowser-smokeผ่านของhead3eff70bไว้แยกจากCIรอบใหม่

ผล browser smoke หลัง commit ข้อความ `c146a699` ผ่านใหม่ **3/3 เส้นทาง** ใน PR run `36637128631` บน merge `3da3517`, Node 22.23.2, 187.4 s และ build สำเร็จ ดู [log หลังแก้ข้อความ](actions-heavy-results/ci-36637128631-browser-smoke-excerpt.log) แยกจาก full browser 4/4 ซึ่งรวม PWA offline บน `9737f21`; PR full standard ของ `c146a699` ผ่านแล้ว ส่วน status wording `76534dc1` ผ่าน full CI แล้วตามผลด้านล่าง

Browser smoke ของ status wording รุ่นสุดท้าย `76534dc1` ผ่านใหม่ **3/3 เส้นทาง** ใน PR run `36638705308` บน merge `c55bf15`, Node 22.23.2, 258.5 s พร้อม build สำเร็จ ดู [latest browser smoke](actions-heavy-results/ci-36638705308-browser-smoke-excerpt.log) ไม่ใช้แทนเส้นทาง PWA offline ที่ตรวจแยกบน `9737f21`

Full standard หลังแก้เนื้อหา `c146a699` ยืนยันใหม่ **9,241/9,241 ใน 190 ไฟล์** ใน PR run `36637128631` บน merge `3da3517`, Node 22.23.2, 1,121.67 s พร้อม typecheck/build สำเร็จ ดู [summary](actions-heavy-results/ci-c146-standard-summary.json) และ [actual log](actions-heavy-results/ci-36637128631-final-excerpt.log) push run `36637123429` ผ่านชุดเดียวกัน 9,241/9,241 อีกครั้งใน 1,593.53 s บน Node 22.23.2 ดู [push log](actions-heavy-results/ci-36637123429-final-excerpt.log) ไม่บวกยอดรันซ้ำ เป็นการปิด acceptance ของเนื้อหา 57 strings แยกจากผลก่อนแก้ ส่วน CI ของ status wording `76534dc1` ผ่านแยกแล้วตามผลด้านล่าง

Full CI หลัง status wording `76534dc1` ผ่าน **9,241/9,241 ใน 190 ไฟล์** ใน PR run `36638705308`, merge `c55bf15`, Node 22.23.2, 961.77 s พร้อม typecheck/build และ browser smoke 3/3 ดู [summary](actions-heavy-results/ci-765-standard-summary.json) และ [actual log](actions-heavy-results/ci-36638705308-final-excerpt.log) push run `36638699357` ผ่านชุดเดียวกัน 9,241/9,241 อีกครั้งใน 1,596.59 s ตาม [push log](actions-heavy-results/ci-36638699357-final-excerpt.log) ไม่บวกยอดซ้ำและไม่ใช้ผลนี้แทน full CI ของ rendering/layout commit `4cf7e3f` ที่ตามมาภายหลัง

Browser smoke หลัง rendering source `4cf7e3f` ผ่านใหม่ **3/3** ใน PR run `36640538286`, Node 22.23.2, 318.5 s ดู [latest smoke log](actions-heavy-results/ci-36640538286-browser-smoke-excerpt.log) และ [merge provenance](actions-heavy-results/ci-4cf-merge-provenance.json): merge `b75b607f` มี src tree และ tests tree ตรงกับ head `4cf7e3f` ทุกประการ

**Full standard ของ source สุดท้ายปิดครบแล้ว:** PR run `36640538286` และ exact-head push run `36640532218` ผ่าน **9,259/9,259 รายการใน 191 ไฟล์** ทั้งคู่ บน Node 22.23.3 พร้อม typecheck/test/build สำเร็จ PR ใช้เวลา 1,592.54 s และ push 1,585.86 s ดู [final summary](actions-heavy-results/ci-4cf-standard-summary.json), [PR actual log](actions-heavy-results/ci-36640538286-final-excerpt.log) และ [push actual log](actions-heavy-results/ci-36640532218-final-excerpt.log) จำนวน unique คือ 9,259 ไม่ใช่ผลบวกสองรัน ผล 9,241 ของรุ่นก่อนและ heavy บน `0b844f7` ยังคง attribution เดิม ไม่มีผล CI ที่ต้องรอก่อนปิดการตรวจรับรอบนี้

## 7. Solver inventory และขอบเขตที่ยังไม่ครอบคลุม

| พื้นที่ | ชนิดที่มีอยู่และต้องคงcoverage |
|---|---|
| Orbit mechanics | Keplerelliptic/hyperbolic,J2/groundtrack,SSO/repeat orbit/node local time,Newton cannonimpact/orbit/escape |
| Maneuver | Hohmann,bi-elliptic,plane change,circularise atapogee,phasing,deorbit,spiral,manual≤5nodes,Lambertrendezvous+porkchop |
| Real satellites | TLE/OMM6fileformats,SGP4near/deep-space,TEME/ECEF/Earthorientation,catalogue/providerfreshness |
| Visibility | lookangles,shadow,refraction,magnitude,passes/overflight,sensorfilters |
| Lifetime | numericalpropagator/MSIS/activity,ballistic fitting,uncertainty,reentry,CZ-5B/NAPA-2 |
| Conjunction | closeapproach,screening,covariance/encounterplane/Pc,CDM,Iridium |
| Build | remix/assemble/save/import/export,staticfire,windtunnel,readiness,optimalstaging,sizing |

การตรวจครบรายชื่อ solver และเส้นทางที่กำหนดไม่ได้พิสูจน์คำตอบทุกค่า ขอบเขตต่อไปนี้แยกผลที่ปิดแล้วกับสิ่งที่ไม่ได้ตรวจ ไม่ใช้เป็นคำประกาศว่าทุก combination ผ่าน:

1. Standard รุ่นสุดท้าย `4cf7e3f` ผ่าน 9,259/9,259 ใน 191 ไฟล์ทั้ง PR และ push แล้ว ส่วนผล 9,241 ของ `0b844f7`, `c146a699` และ `76534dc1` เก็บแยก ไม่บวกซ้ำ Heavy 246 ผ่านบน `0b844f7`; AST ยืนยันรอบข้อความถึง `76534dc1` และ diff review แยกการเปลี่ยน rendering สองไฟล์ของ `4cf7e3f` โดยไม่กล่าวว่าชุดหนักรันบน HEAD ล่าสุดโดยตรง
2. Buildfinal6ผ่านใน `integrated-build-final6.log`; telemetryและengineeringPNGตรวจไฟล์จริงแล้ว และTH/RUQAFINAL4ส่งออก/ตรวจครบ8ไฟล์8หน้า รวมTH→RUระหว่างasync. Caseexportraceผ่านbrowserครบ6ไฟล์; negativegatesตรวจactiveIridium/noflightตามC32แล้ว คงขอบเขตการตรวจ gate เฉพาะที่ระบุ; ส่วน keyboard download ยืนยันด้วยไฟล์ Specific impulse ในรอบ final6 แล้ว
หลังแก้ข้อความกรณีศึกษา desktop ได้ THEOS-2 TH HTML จริงหนึ่งไฟล์ แต่รายการถัดไปไม่มี download event/ไฟล์แม้ UI เดิมแจ้ง saved จึงไม่อ้างว่า desktop ผ่าน 24 ไฟล์และไม่สรุปสาเหตุ Browser journey บน Actions รับช่วงได้ 24 ไฟล์จริงที่ `277f41d` เนื้อหาผ่านแต่ภาพพบ numeric workbox แยกหน้า 3 จุด และป้าย 3σ ทับชื่อดาวเทียม 2 ภาษา จากนั้นแก้ renderer ใน `4cf7e3f` และ **ส่งออกใหม่ผ่านครบ 24 ไฟล์ รวม 367,489 bytes**; ZIP/hash ตรง GitHub และทุกไฟล์ตรง manifest แปลง **12 DOCX เป็น 18 หน้าแล้วเปิดตรวจครบ ผ่านทั้งหมด** ทั้ง root และผู้ตรวจกราฟิกยืนยันภาพจุดแก้ แยกจาก local proof 82/82 บน Windows Node 24.19.0; การส่งออกจริงใช้ Node 22.23.2/Chromium 153.0.8010.12/LibreOffice 26.8.0.3/Poppler 120 DPI ดู [รายงานภาพ](worksheet-case-export-layout-TH.md), [final manifest](browser-export-artifacts/editorial-layout-final/manifest.json), [visual review](browser-export-artifacts/editorial-layout-final/visual-review.json) และ [ข้อความตรงเดิม 24/24](browser-export-artifacts/editorial-layout-final/text-content-preserved.json) ไม่ใช้ mission 8 หน้าเดิมแทนผล case ใหม่ และไม่รับรองการจัดหน้าของ Word/Google Docs ทุกเวอร์ชัน

3. Assessment ผ่าน flow 25 ข้อจนถึง review และตรวจการตอบครบทั้ง 5 รูปแบบ ได้แก่ choice/order/numeric/multi/vehicle รวม draft ข้ามภาษาตามหลักฐานแต่ละรอบแล้ว การตรวจ vehicle ใช้ภาพ Starship หนึ่งภาพ; ไม่มี UI acceptance แยกสำหรับ observe และ recommendation กรณีคะแนนสูงแต่ผิดพื้นฐาน ส่วน flight numeric/hint/language/focus มี [ตัวอย่าง 1.1 ที่ตรวจผ่านแล้ว](browser-flight-draft-final-TH.md) แต่ไม่ครอบคลุมทุกบทหรือลำดับ และ case radio ไม่ได้ทดสอบทุกลำดับ ไม่เรียกตัวแทนแต่ละรูปแบบว่าครอบคลุม 157 ข้อหรือรูปทุกภาพ
4. UIboundaryfinal6ตรวจfuel0แสดง0kg/shortfall3,846m/s, fuel999999ที่mass1800clamp1799, manualnodes2→5ไม่มีAdd/ลดเป็น4ได้Addกลับ และLambertTOF0clamp1minfinite; consoleว่าง ดู `browser-maneuver-boundary-final6.json`. Kepler/Lambertnumericalboundaryมีผลแยกใน [solverreport](solver-boundary-validation-TH.md). ไม่ได้พิสูจน์ existence ของ Lambert null ทุกสาขาหรือตรวจ lifetime/screening cancel และ stale result ทุกเส้นทาง ไม่ใช้เพียงfiniteค่าหน้าจอรับรองความถูกต้องทุกinput
5. ภาพafter-fixLaunch/Orbitdesktop/mobileและBuildตัวแทนตรวจแล้ว; Orbitfinal5viewport320×844มีfit/zoommax/rotate/reset/equal-timeและMolniyasectorsพร้อมlogsว่าง. DPRจริงรอบนี้1; DPR2/browserGPUหลายรุ่นยังไม่ตรวจ ส่วน Build ตรวจภาพต้นฉบับครบ 42/42 ภาพบน desktop 1280×720 EN dark แล้ว แต่ยังไม่ครอบคลุมทุกขนาดจอ ภาษา และการเปิด part card
6. Source และรายงานต้นฉบับอัปเดตตาม provenance ของแต่ละรอบแล้ว Full standard, heavy และ case exports/render ปิดครบตามขอบเขตที่ระบุ ไม่มีผลทดสอบที่ยังรอสำหรับการตรวจรับรอบนี้ ส่วนการ merge/deploy และการตรวจเว็บสาธารณะเป็นขั้นตอนแยก

## 8. งานพัฒนาที่บันทึกไว้ก่อน และข้อจำกัดที่ยังเป็นจริง

ไม่ลงมือเปลี่ยน revealให้เป็นassisted-pass/สร้างretryโจทย์ใหม่, bankversion/history, resultsbackup/restore, completeattempthistory, MCbatchprovenance, feedbackพาไปgraph/time, baseline/changecomparison, scenepresets/undoหรือsatellitebuilder. สิ่งเหล่านี้เป็นการพัฒนา/นโยบายตามที่ผู้ใช้ให้รายงานก่อน

บท4.3ยังสั่ง2°/8sและbaseline/retune แต่graderรับstepสุดท้ายที่hold≥5sใน30sหลังmax-Qโดยไม่ตรวจamplitudeหรือว่าบันทึกbaselineแล้ว จึงยังไม่อ้างว่าคำสั่งกับrubricตรงทุกเงื่อนไข. อาจแยก“ค่าทดลองแนะนำ”ออกจากpassingcriterionด้วยข้อความ ก่อนพิจารณาออกแบบgraderใหม่

โมเดลและข้อมูลเหมาะกับการเรียนภายใต้สมมติฐาน ไม่ใช่การรับรองhardware/flightreadinessจริง, ความแม่นยำทุกtracking/reentryprediction, landingทุกสภาพ, ความเที่ยง/ความตรง/อำนาจจำแนกของข้อสอบ, อุปกรณ์จริงหลายรุ่น หรือscreenreaderเต็มรูปแบบ. การตรวจbrowserใช้viewportจำลองและprofileทดสอบ; ผ่านunit/headless/CIแต่ละชั้นมีความหมายเฉพาะขอบเขตของชั้นนั้น

เอกสารประกอบที่ใช้ตรวจย้อนกลับ: [coverage draft](final-coverage-draft-TH.md), [learning review](learning-followup-review-TH.md), [actual export](ui-case-export-validation-TH.md), [DOCX pagination](docx-pagination-validation-TH.md), [runtime](runtime-fingerprint-validation-TH.md), [graphics](graphics-validation-TH.md), [Build matrix](build-catalogue-matrix-TH.md), [imports](import-export-checklist-TH.md), [checkpoint](RESUME-CHECKPOINT-TH.md). รายงาน checkpoint เก็บประวัติหลายช่วงและอาจมีสถานะเก่า ให้ใช้ผลตรวจรับล่าสุดและ provenance ในฉบับนี้เป็นสถานะปัจจุบัน
