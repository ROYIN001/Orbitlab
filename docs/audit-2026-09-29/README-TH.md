# Orbitlab: ชุดรายงานและหลักฐานที่คัดสำหรับเผยแพร่

ชุดนี้รวบรวมผลตรวจและการแก้ข้อผิดพลาดตามคำขอ โดยแยกงานพัฒนาใหม่ไว้เป็นข้อเสนอ เริ่มอ่านที่ [รายงานตรวจรับรวม](audit-2026-09-29/Orbitlab-acceptance-TH.md) แล้วตรวจหลักฐานรายเส้นทางใน [รายการ C01–C34](audit-2026-09-29/import-export-checklist-TH.md) รายงานต้นฉบับยังคงประวัติไว้ใน [ฉบับวันที่ 28 กันยายน พร้อมส่วนติดตาม](audit-2026-09-28/Orbitlab-audit-TH.md)

งานอยู่ใน [PR #41](https://github.com/ROYIN001/Orbitlab/pull/41) และ [branch codex/audit-acceptance](https://github.com/ROYIN001/Orbitlab/tree/codex/audit-acceptance) งานรวมใช้ checkout `source-integrated` แยกจาก `source` เดิมที่เก็บไว้ ไม่ได้นำ final changes ไปเขียนทับ checkout เก่า

**ผลล่าสุด:** source สุดท้าย `4cf7e3f` ผ่าน standard CI **9,259/9,259 รายการใน 191 ไฟล์** ทั้ง PR และ push พร้อม typecheck/build บน Node 22.23.3 ส่วน heavy ผ่านครบ **246/246 ใน 27/27 ไฟล์** บนฐาน numerical `0b844f7` มีการบินอ้างอิงครบ **21 รุ่น** และบทเรียน 6-DOF รันใหม่ผ่าน **7/7** อ่านความหมายครบ **ข้อสอบ 157 ข้อ + บทเรียน 24 บท** แล้ว Browser acceptance ผ่าน **4/4 เส้นทาง** บน `9737f21`; รุ่นสุดท้ายผ่าน smoke ใหม่ **3/3** และ case exports **24 ไฟล์ / 12 DOCX / 18 หน้าที่ตรวจภาพครบ**

การแก้ข้อความถึง `76534dc1` รวม **60 strings ใน 11 production files** มี AST อื่นเท่าเดิมเฉพาะรอบข้อความนี้ โดยรอบเนื้อหา 57 strings ผ่าน focused **165/165 ใน 13 ไฟล์** พร้อม typecheck/build exit 0 บน Node 22.23.3 การทดสอบ 165 นี้ใช้ working changes ที่ commit ต่อเป็น `c146a699`; ต่อมา `76534dc1` แก้ status export เพิ่ม 3 strings และผ่าน focused **29/29** กับ build exit 0 แยกใน [หลักฐาน status wording](audit-2026-09-29/editorial-audit/status-wording-tests.json) ส่วน `4cf7e3f` แก้ rendering/layout สองไฟล์ภายหลังและผ่าน full CI **9,259/9,259** แล้ว ไม่อยู่ในคำอ้าง AST text-only ของรอบก่อน จัดชุดเวลา UTC `2026-09-29T23:07:41.732303+00:00` การตรวจใน local preview และ CI ไม่ใช่หลักฐานว่าเว็บสาธารณะได้รับการ deploy แล้ว

| สิ่งที่ทำเสร็จ | ผลที่ตรวจได้ |
|---|---|
| แก้บั๊กบทเรียน แบบประเมิน และการเก็บข้อมูล | รักษาคำตอบเมื่อเปลี่ยนภาษา คืนรูปในหน้า review แก้เงื่อนไข rubric ที่ขัดกับโจทย์ และสำรองข้อมูล progress ที่อ่านไม่ได้ก่อนเขียนข้อมูลที่กู้กลับ ดู [รายงานรวม](audit-2026-09-29/Orbitlab-acceptance-TH.md) และ [การกู้ progress](audit-2026-09-29/progress-storage-recovery-TH.md) |
| แก้การส่งออกและกราฟิก | ชื่อไฟล์ตรงกรณีศึกษาเมื่อสลับเมนูเร็ว ใบงานคงภาษาเมื่อสลับ TH → RU ระหว่างรอส่งออก ตัวเลือกไม่แยกกลางข้อ กราฟ PNG อ่านป้ายได้ และภาพวงโคจรแสดงบนจอแคบได้ ดู [ใบงาน 8 ไฟล์และ 8 หน้าที่ตรวจ](audit-2026-09-29/browser-export-artifacts/docx-language-after/render-validation.json) และ [PNG จากการคลิกและแป้นพิมพ์](audit-2026-09-29/browser-export-artifacts/engineering-png-final6-validation.json); case exports รุ่นสุดท้าย [24 ไฟล์/18 หน้าผ่าน](audit-2026-09-29/worksheet-case-export-layout-TH.md) รวม workbox และป้าย 3σ ที่แก้ท้ายรอบ |
| ตรวจเส้นทางใช้งานจริง | กรณีศึกษา 3 บทผ่านการบันทึก เปิดใหม่ และส่งออก; [flight numeric/hint/language/focus](audit-2026-09-29/browser-flight-draft-final-TH.md) ตัวอย่างบท 1.1 ผ่านโดยคง raw text/caret; assessment ตอบตัวแทนครบ 5 รูปแบบ รวม multi และภาพ Starship โดยรักษา draft ข้ามภาษา; mission ผ่านไฟล์และลิงก์; Build แยกแบบบันทึกกับ draft ถูกต้อง; การปิดเฉลยตรวจเฉพาะ active Iridium และกรณียังไม่มีเที่ยวบินที่จบ ดู [C01–C34](audit-2026-09-29/import-export-checklist-TH.md) |
| ตรวจภาพ Build ครบ catalogue | เปิดดูภาพต้นฉบับครบ 21 แบบ × 2 โหมด รวม 42/42 ภาพที่เก็บหลัง animation จบ บน desktop 1280×720 ภาษาอังกฤษ ธีมมืด ไม่พบภาพว่าง ชิ้นส่วนหลุดกรอบ หรือป้ายอ่านไม่ได้ในขอบเขตที่ตรวจ ดู [รายงานและภาพทั้ง 42](audit-2026-09-29/build-visual-42-validation-TH.md) |
| แก้ข้อผิดพลาดเชิงตัวเลขที่ยืนยันได้ | Kepler ใกล้ e = 1 ผ่านชุดขอบเขต 108/108; Lambert คืนคำตอบ 72 กรณีและผ่านการตรวจ residual ทั้ง 72 ส่วน 48 กรณีที่คืน null ยังไม่ถือว่าพิสูจน์การไม่มีคำตอบ ดู [รายงาน solver](audit-2026-09-29/solver-boundary-validation-TH.md) |
| ตรวจความถดถอยหลังรวมการแก้ | [final6 JSON](audit-2026-09-29/integrated-final-regressions6.json) ผ่านทั้งหมดและ [build log](audit-2026-09-29/integrated-build-final6.log) จบด้วย exit 0; [การอ่าน diff รอบสุดท้าย](audit-2026-09-29/final-integration-review-TH.md) แยกจากการทดสอบจริง |

ผลที่ปิดช่องว่างเดิมและตรวจย้อนกลับได้:

- [Standard CI ของ source สุดท้าย](audit-2026-09-29/actions-heavy-results/ci-4cf-standard-summary.json): PR และ exact-head push บน `4cf7e3f` ผ่าน **9,259/9,259 ใน 191 ไฟล์** ทั้งคู่ บน Node 22.23.3 พร้อม typecheck/build; [PR log](audit-2026-09-29/actions-heavy-results/ci-36640538286-final-excerpt.log) และ [push log](audit-2026-09-29/actions-heavy-results/ci-36640532218-final-excerpt.log) ระบุ checkout และผลจริง รอบก่อน `76534dc1`, `c146a699` และ `0b844f7` ผ่าน 9,241/9,241 แยกไว้ในหลักฐาน ไม่บวกยอดรันซ้ำ
- [Browser acceptance](audit-2026-09-29/actions-heavy-results/browser-36634805813/audit-browser-logs/summary.md): launch-explore, mobile-smoke, pwa-offline และ watch-controls ผ่านครบ 4/4 บน `9737f21`; หลัง rendering รุ่นสุดท้าย `4cf7e3f` มี [smoke ใหม่ 3/3](audit-2026-09-29/actions-heavy-results/ci-36640538286-browser-smoke-excerpt.log) ผ่านอีกครั้ง แยกจาก full browser สี่เส้นทาง
- [Vehicle union](audit-2026-09-29/actions-heavy-results/36631307401/vehicle-coverage-union.json): 22 tests ครอบคลุม 21 รุ่นจริง แยกจาก fleet163 เดิมที่มี 18 รุ่น ไม่หมายถึงทุกภารกิจ on target
- [7 บท 6-DOF](audit-2026-09-29/actions-heavy-results/36631307401/collected-heavy/lessons-sixdof/result.json): รันใหม่ 7/7 ผ่านบน `0b844f7` และ worker Node 22.22.2 เป็น headless ไม่ใช่ browser 7 บท
- [Editorial bank 157 ข้อ](audit-2026-09-29/editorial-audit/bank-editorial-review-TH.md): อ่าน 926 triples / 2,778 strings ครบทุก prompt/options/misconceptions/explanations; [24 บทเรียน](audit-2026-09-29/editorial-audit/lesson-editorial-review-TH.md) อีก 528 strings พร้อม track labels 36 strings และ [ใบงานกรณีศึกษา](audit-2026-09-29/worksheet-case-editorial-TH.md) 99 keys / 297 strings
- [Focused หลังแก้ข้อความ](audit-2026-09-29/editorial-audit/final-focused.json) ผ่าน 165/165 และ [runtime/build/typecheck](audit-2026-09-29/editorial-audit/final-runtime.json) สำเร็จ รอบแรก 164/165 เก็บไว้โดยไม่ลบ: assertion ของ V1 fixture เทียบกับข้อความ builtin ใหม่ทั้งที่ parser รักษาข้อความเก่าถูกต้อง จึงแก้ test ให้เทียบต้นฉบับและคง exact roundtrip ไม่แก้ fixture/golden

[Heavy Actions จบครบแล้ว](audit-2026-09-29/actions-heavy-results/36631307401/final-heavy-acceptance-TH.md): [final union](audit-2026-09-29/actions-heavy-results/36631307401/final-union.json) ไม่มี missing/duplicate/skipped/failed ทุกไฟล์ exit 0, actual workers Node 22.22.2, source `0b844f7` การตรวจอิสระตรงกับ collector บน Actions ไม่เปลี่ยน golden เพื่อให้ผ่าน MC 170 เที่ยวบินมี 142 ตรงเป้า, 10 เข้าวงโคจรแต่คลาดเป้า และ 18 สูญเสียตาม [outcomes](audit-2026-09-29/actions-heavy-results/36631307401/monte-carlo-outcomes.json) จึงไม่ใช้ test ผ่านรับรองทุกเที่ยวบินหรือข้อมูลโลกจริง

การตรวจรับรอบนี้ปิดครบแล้ว ไม่มีผล CI ที่ยังรอ ส่วน [case exports หลังแก้ layout](audit-2026-09-29/worksheet-case-export-layout-TH.md) ยืนยัน **24 ไฟล์จริง / 12 DOCX / 18 หน้า** บน source `4cf7e3f` ตรวจ hashes และเปิดภาพครบทุกหน้า ผ่านทั้งหมด ข้อความเหมือนก่อนแก้ 24/24 ไฟล์ ดู [visual review](audit-2026-09-29/browser-export-artifacts/editorial-layout-final/visual-review.json) งานพัฒนาที่เสนอไว้และข้อจำกัดด้านอุปกรณ์จริงยังแยกตามรายงาน

เก็บความผิดพลาดก่อนแก้ไว้แยก: desktop ได้ไฟล์เดียวแล้วรายการถัดไปไม่มีไฟล์แม้ UI เดิมแจ้ง saved จึงไม่ใช้ป้ายสถานะรับรอง disk save; Actions รุ่น `277f41d` ดาวน์โหลด 24 ไฟล์ได้จริงและเนื้อหาผ่าน แต่พบ workbox แยกหน้า 3 จุดกับป้าย 3σ ทับ Cosmos 2251 ใน TH/RU ชุดก่อนแก้นี้ไม่ถูกเรียกว่าผ่าน layout ผลหลังแก้ใช้ Chromium ดาวน์โหลดจริงและ LibreOffice/Poppler ตรวจภาพ ไม่ใช่การรับรองทุกเวอร์ชันของ Word/Google Docs หรือการพิมพ์ HTML ทุก browser

ผลเก่าเก็บแยกเพื่อไม่ให้ตัวเลขชวนเข้าใจผิด: Cloud standard เดิมผ่าน 2,542 และไม่ผ่าน 2 จาก 2,544 รายการ; GitHub CI รอบก่อนผ่าน 9,187/9,188 โดยรายการเดียวที่ไม่ผ่านเป็นตัวตรวจ import type ใน architecture test ซึ่งแก้แล้วและทดสอบไฟล์นั้นแยกผ่าน 26/26 ผลรันซ้ำเหล่านี้ไม่ถูกบวกเป็นยอด unique ใหม่ ดู [ที่มาและการรับช่วง CI](audit-2026-09-29/actions-heavy-fallback/ci-architecture-diagnosis-TH.md)

ข้อเสนอที่ยังไม่ลงมือ ได้แก่ การเพิ่มหรือเปลี่ยนนโยบาย rubric การเปิดเฉลย การรับรองคุณภาพข้อสอบด้วยสถิติ และการขยายความสามารถ solver ที่ยังไม่มีคำตอบ ส่วนอุปกรณ์จริงหลายรุ่น การฟังและซิงก์เสียง การตรวจ screen reader เต็มรูปแบบ และการเทียบข้อมูลติดตามจริง ยังมีข้อจำกัดตามรายงาน การอ่านความหมายครบ 157 ข้อครั้งนี้ไม่ใช่การรับรองโดยคณะบรรณาธิการมนุษย์หรือคุณภาพข้อสอบทางสถิติ และผล QA ไม่ใช่คะแนนเจ้าของเว็บ

ไฟล์ขนาดใหญ่และต้นฉบับบางรายการคงไว้ในเครื่องเดิม โดยมีขนาดและ SHA256 ใน [ดัชนีหลักฐานเฉพาะในเครื่อง](LOCAL-EVIDENCE-INDEX.md) ชุดเผยแพร่ไม่รวม fixture ขนาด 30 MiB, node_modules, checkout ซ้อน หรือ CSV ที่ซ้ำกัน `artifact-manifest.json` ระบุเส้นทางสัมพัทธ์ ขนาด และ SHA256 ของทุกไฟล์ ส่วน `SHA256SUMS` รวม manifest ด้วย และ `.gitattributes` ภายในชุดนี้ปิดการเปลี่ยน line endings เฉพาะไฟล์หลักฐาน เพื่อรักษาไบต์และ SHA256 เมื่อนำเข้า Git โดยไม่เปลี่ยนกติกา source ของผลิตภัณฑ์ รายงาน checkpoint และบันทึกเก่าต้องอ่านคู่สถานะล่าสุดข้างต้น

รุ่นข้อความและสถานะคือ `76534dc1d171726cb3d5eadc82d1ac77b629376b` ซึ่งเปลี่ยนเพียง status export อีก 3 strings จาก `277f41d`; รุ่น `277f41d` เพิ่ม browser journey/workflow และมี production source เหมือน `c146a699` ทุกไบต์ ข้อความภายใน worksheet exports ไม่เปลี่ยนโดย status fix ผล numerical acceptance มาจาก `0b844f7`; ความสัมพันธ์ของแต่ละ source อยู่ใน [source provenance](audit-2026-09-29/actions-heavy-results/source-provenance-bridge.json) และ manifest ไม่เหมารวมว่าผลทุกชุดรันบน HEAD ล่าสุดโดยตรง

Source สุดท้ายคือ `4cf7e3fe6e5ef36bea37a4b1d275d3e56e7dd58c` เพิ่มการแก้สองไฟล์ rendering/layout และ tests สองไฟล์หลัง `76534dc1` เทียบ diff แล้ว ellipse/radius/simulation source คงเดิม แต่เป็นการเปลี่ยน code จึงไม่อยู่ในคำอ้าง text-only AST 60 strings ของรอบก่อน

การทดสอบผลิตภัณฑ์ให้ checkout source commit ที่ต้องการจาก repository ใช้ Node 22 ตาม runtime ของผลอ้างอิง และรันคำสั่งต่อไปนี้ **จาก root ของ repository ผลิตภัณฑ์** ไม่ใช่จากโฟลเดอร์รายงาน:

```sh
npm ci
npm run typecheck
npm test
npm run build
npm run test:heavy
```

`npm run test:heavy` เป็นชุดที่ใช้เวลานาน หากต้องทำซ้ำรูปแบบ GitHub Actions ให้ใช้ workflow และ `scripts/audit-heavy/` ที่อยู่ใน repository commit นั้น ซึ่งบันทึก exact source SHA, runtime ของ worker และคำสั่งจริงไว้แล้ว [หลักฐาน heavy](audit-2026-09-29/actions-heavy-results/36631307401/final-summary.json) จึงเป็นจุดอ้างอิง provenance ไม่ใช้เวลารันหรือจำนวนผ่านของเครื่องหนึ่งรับรองอีกเครื่องโดยอัตโนมัติ

สคริปต์ในชุด **evidence** เช่น `editorial-audit/extract-bank.mjs`, `extract-lessons.mjs`, `verify-text-only.mjs` และ helper บางชุดยังอ้างตำแหน่ง `../source-integrated` หรือเครื่องมือ/ไฟล์ใน workspace เดิม เก็บไว้เพื่ออธิบายและตรวจย้อนกลับวิธีทำ ไม่ได้อ้างว่าเป็นแพ็กเกจ standalone ที่ย้ายโฟลเดอร์แล้วรันทุกสคริปต์ได้ทันที ให้ใช้ source/runtime ที่ระบุและปรับ path ให้ตรงโครงสร้างจริงก่อนทำซ้ำ โดยคงผลเดิมและ SHA256 ไว้

หากต้องการตรวจเฉพาะความครบและแฮชของชุดรายงานนี้ สามารถใช้สคริปต์ที่ไม่พึ่ง source checkout โดยรันจาก root ของชุดรายงาน: `python audit-2026-09-29/verify-published-packet.py .` คำสั่งนี้ตรวจไฟล์ แฮช และลิงก์ภายใน ไม่รันทดสอบผลิตภัณฑ์และไม่ยืนยันข้อเท็จจริงแทนหลักฐานต้นทาง

ชุด case final มี 24 HTML/DOCX และ 18 PNG ครบในโฟลเดอร์ `editorial-layout-final` ส่วนชุดก่อนแก้ `editorial-final` เก็บเฉพาะ metadata และภาพแสดงข้อผิดพลาด 7 หน้าใน packet; metadata ของ before ยังบันทึกการตรวจเดิมครบ 18 หน้า ไฟล์ที่ไม่ได้คัดให้ใช้ [ดัชนี local-only](LOCAL-EVIDENCE-INDEX.md) ไม่สมมติว่าทุก path ใน JSON ของรอบก่อนมีไฟล์แนบอยู่ด้วย

ภาพ mission ใบงานชุดก่อนหน้าที่ตรวจ: [TH หน้า 1](audit-2026-09-29/browser-export-artifacts/docx-language-after/worksheets-th-1.png), [TH หน้า 2](audit-2026-09-29/browser-export-artifacts/docx-language-after/worksheets-th-2.png), [TH หน้า 3](audit-2026-09-29/browser-export-artifacts/docx-language-after/worksheets-th-3.png), [เฉลย TH](audit-2026-09-29/browser-export-artifacts/docx-language-after/key-th-1.png), [RU หน้า 1](audit-2026-09-29/browser-export-artifacts/docx-language-after/worksheets-ru-1.png), [RU หน้า 2](audit-2026-09-29/browser-export-artifacts/docx-language-after/worksheets-ru-2.png), [RU หน้า 3](audit-2026-09-29/browser-export-artifacts/docx-language-after/worksheets-ru-3.png), [เฉลย RU](audit-2026-09-29/browser-export-artifacts/docx-language-after/key-ru-1.png)
