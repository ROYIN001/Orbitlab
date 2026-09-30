# การตรวจฟิสิกส์เพิ่มเติมและจุดพักงาน — 29 กันยายน 2026

> บันทึกนี้เป็น checkpoint เวลา 02:53 น. ของรอบ Windows เดิม ไม่ใช่สถานะปัจจุบัน ผลฟิสิกส์หนักปิดแล้ว [246/246 ใน 27 ไฟล์บน Node 22](actions-heavy-results/36631307401/final-heavy-acceptance-TH.md) รวม 21 รุ่นและ 7 บท 6-DOF ส่วนผลตรวจรับล่าสุดทั้งหมดอยู่ใน [รายงานหลัก](Orbitlab-acceptance-TH.md)


สถานะ ณ 02:53 น. Europe/Moscow: **ยังไม่ครบและยังไม่ผ่านทั้งหมด** ต้องแยกผลที่จบแล้วจาก process ที่ยังทำงานอยู่ ห้ามใช้เอกสารนี้อ้างว่าผ่าน heavy/fleet ทั้งชุด ผู้ใช้เลือกย้ายงานไปแชต Codex Cloud ใหม่; agent หยุดงานใหม่เพื่อให้ย้าย snapshot ได้สม่ำเสมอ แต่ยังไม่ได้หยุด process ชุดเดิม

## แหล่งและสภาพแวดล้อม

- Source: `audit-2026-09-29/source`, Git HEAD `0a6d1a709ffbf88e8e36f606d6993bd27e5c25e0`; มีไฟล์แก้ค้างเดิมที่ต้องเก็บไว้
- Windows, Node `v24.19.0`, Vitest `5.0.1`
- `fleet-run.log` และ `heavy-run.log` มีการทำงานเริ่มก่อน agent ชุดนี้เข้ารับช่วงประมาณ 02:36–02:37 น. และยังเพิ่มข้อมูลต่อเนื่อง ไม่ได้เปิดรันซ้ำซ้อน
- Snapshot ตัวเลขและ process IDs: `physics-checkpoint.json`; PID อาจหมดอายุหรือถูกใช้ใหม่หลังปิดเครื่อง จึงต้องตรวจ process ใหม่ก่อนใช้

## ผลที่ยืนยันได้แล้ว

1. **วิธีทำบทเรียน 6-DOF ครบทั้ง 7 ผ่าน** จาก `lessons-sixdof-results.json` วันที่ 29 ก.ย. 2026: 3.2 FDIR, 2.3 navigation, 2.4 Monte Carlo, 4.1 control inspector, 4.2 margins, 4.3 step response, 4.4 notch filter
   - 4.3 ทดสอบ tuning เดิมที่ต้องไม่ผ่าน, ยังไม่ทำ step test ที่ต้องไม่ผ่าน และ retune ที่ต้องผ่าน
   - 2.4 เทียบ flight กับ Monte Carlo runner และทดสอบคำตอบ perigee ที่ผิด 5 km ว่าต้องไม่ผ่าน
   - รวม 7 tests, 7 passed, 0 failed; เป็น headless simulation ไม่ใช่การคลิกบทเรียนทั้ง 7 ผ่านเบราว์เซอร์
2. ณ snapshot `fleet-run.log`: **19 กรณีผ่าน, 0 ล้มเหลวที่รายงานแล้ว** แต่ยังไม่มี final summary; รวม Long March 2D ครบ 325/650/1170 kg, หลายกรณีของ Soyuz-2.1b และ reference crosswind หลายรุ่น
3. ณ snapshot `heavy-run.log`: **128 tests ผ่าน, 21 ล้มเหลวที่รายงานแล้ว** แต่ยังไม่มี final summary; หมวดที่จบรายกรณีแล้วมี historical missions, rendezvous, aborts และ reentry benchmark
4. **21 fingerprint tests ของยานทั้งแคตตาล็อกไม่ตรง baseline** ใน `tests/heavy/sixdof-fingerprint.test.ts` (flight 160 s)
   - ตัวอย่าง Soyuz-2.1a: คาด `6cffff9a7d35bbd0`, ได้ `2aea3578dafe3f17`
   - ตัวอย่าง Falcon 9: คาด `4e7814725cdd4e3b`, ได้ `b150fee2dd19df73`
   - ยังระบุสาเหตุไม่ได้; ห้ามเปลี่ยน hash เพื่อทำให้ผลเขียวโดยไม่พิสูจน์สาเหตุ และห้ามสรุปว่าเป็นเพียง LF/CRLF เพราะ fingerprint นี้ hash JSON ของ state/telemetry/events ไม่ใช่อ่าน raw fixture text
   - 21 failures ไม่เท่ากับพิสูจน์ว่ายาน 21 รุ่นบินผิด; ต้องแยก regression ของ trajectory/telemetry, platform floating-point และ baseline ที่ล้าสมัยด้วยหลักฐาน
5. **Monte Carlo worker cleanup regression ใหม่ 5/5 ผ่าน** (`monte-carlo-job-failures-results.json` เวลา 02:52 น.): factory throw หลังสร้าง worker แรก, initial dispatch throw, dispatch ถัดไป throw, replacement worker สร้างไม่ได้ และ callback ค้างหลังสั่ง stop
   - เพิ่ม `source/tests/monte-carlo-job-failures.test.ts` เพื่อยืนยันการแก้ค้างเดิมใน `src/physics/monte-carlo-job.ts`; ไม่มีการเปลี่ยน physics runtime ใหม่ในงานของ agent นี้
   - แต่ละกรณียืนยัน worker termination/handler cleanup และสถานะ stopped/error; กรณี dispatch ภายหลังยังเก็บผลที่จบแล้วไว้

## ขอบเขตที่ชุดทดสอบออกแบบไว้

- Fleet acceptance: จรวดที่มีกรณีรองรับ × LEO/ISS/SSO/GTO ตาม capability/site corridor × payload 25/50/90%; แต่ละรุ่นใช้ฐานเริ่มต้นของรุ่นนั้น มี exclusions ระบุชื่อใน `tests/fleet-harness.ts`
- 6-DOF fleet: accepted fleet rows ในลม calm และ reference row ต่อรุ่นใน crosswind/shear, plus Long March 2D dedicated mission; Soyuz-2.1a มี dedicated crew-to-ISS ใน suite อื่น
- Heavy: flexible-body reference flights; PEG/IGM guidance reference flights; delivered-orbit weather/mass-flow variants; Monte Carlo sets; all 7 six-DOF lessons; rendezvous, historical flights, launch aborts, published-timeline validation และ reentry benchmarks
- Recovery: มี Falcon Heavy 3 cores (LZ-1/LZ-2/drone ship) และ Starship Flight 5 (tower catch/ship splashdown) ใน heavy; recovery permutations อื่นอยู่ใน standard tests
- เกณฑ์ fleet วัด orbit จาก position/velocity ใหม่, target event และ insertion time; ไม่เชื่อเฉพาะ flag target ของ simulation
- ทั้งหมดนี้ **ไม่ใช่ Cartesian product ของทุก vehicle × site × orbit × weather × failure × recovery plan** และไม่ใช่การรับรองข้อมูลจริงทุกภารกิจ

Inventory ที่เก็บด้วย Vitest collection จริงอยู่ใน `heavy-inventory.json` และ `fleet-inventory.json`:

| ชุด | จำนวน tests ที่รวบรวมได้ | รายละเอียด |
| --- | ---: | --- |
| sixdof-fleet | 163 | accepted calm matrix 126; reference crosswind/shear 34; Long March 2D dedicated 3 |
| heavy | 246 | 27 test files; รวม 7 lesson tests, 22 catalogue-fingerprint tests (21 flights + row completeness), 19 flexible reference tests, 32 PEG/IGM, 104 reentry benchmark tests, 5 Monte Carlo set tests และหมวดอื่น |

จำนวน inventory คือสิ่งที่ชุดตั้งใจรัน ไม่ใช่จำนวนผ่าน; 5 Monte Carlo set tests ภายในมีหลาย flight จึงห้ามเรียก 246 ว่า 246 เที่ยวบิน

## งานค้างที่ต้องทำก่อนสรุปตรวจครบ

1. เก็บ final exit/result ของ heavy และ sixdof-fleet; ถ้าปิดเครื่องก่อนจบ ให้ถือชุดที่ไม่จบเป็น incomplete แม้ log บางกรณีผ่าน
2. ใช้ inventory ข้างต้นเทียบ completed tests และสร้างตาราง coverage ของ vehicle/site/orbit/wind/failure/recovery แบบระบุชื่อจริง
3. สืบหาสาเหตุ 21 fingerprint mismatches; ตรวจ rerun deterministic และ baseline source/runtime ก่อนแก้ physics
4. ตรวจแผน recovery ทุกประเภทที่ UI รองรับกับ standard tests และเพิ่มเฉพาะช่องว่างที่มี invariant ชัดเจน
5. Monte Carlo worker cleanup regressions ใหม่ผ่านแล้ว 5/5; รวมไว้ใน standard-suite rerun หลังรวบรวมงานทุก agent
6. รวบรวมผล standard suite จาก root agent โดยไม่บวกซ้ำกับบทเรียนหรือ tests ที่รันเฉพาะหมวด

## วิธีทำต่อหลังเปิดเครื่อง

จาก PowerShell ที่ `audit-2026-09-29/source` ตรวจ `git status --short`, วันที่/ท้าย log และ Node processes ก่อนเริ่ม เพื่อตรวจว่า run เดิมจบแล้วหรือยัง ห้ามฆ่า node ทั้งเครื่อง

```powershell
node node_modules/vitest/vitest.mjs run --config vitest.sixdof-fleet.config.ts --maxWorkers=2 --reporter=verbose --reporter=json --outputFile.json=../fleet-resume-results.json *> ../fleet-resume.log
node node_modules/vitest/vitest.mjs run --config vitest.heavy.config.ts --maxWorkers=2 --reporter=verbose --reporter=json --outputFile.json=../heavy-resume-results.json *> ../heavy-resume.log
```

รันสองคำสั่งนี้ตามลำดับเพื่อลดการแย่ง CPU; อาจใช้เวลาหลายชั่วโมง และต้องเปิดเครื่องไว้ ไฟล์ผลใช้ชื่อใหม่จึงไม่ทับหลักฐาน run ก่อนหน้า หากพบรายงานผลจบชุดเดิมแล้ว ให้รันซ้ำเฉพาะกรณีที่ไม่ผ่าน/ได้รับผลกระทบแทน

คำสั่ง reproduce fingerprint ที่ไม่ผ่านเพียงหนึ่งกรณี (ยังไม่เริ่มรันซ้ำ เพื่อหยุดที่ snapshot ตามคำสั่งย้าย Cloud):

```powershell
node node_modules/vitest/vitest.mjs run --config vitest.heavy.config.ts tests/heavy/sixdof-fingerprint.test.ts --testNamePattern=soyuz21a --maxWorkers=1 --reporter=verbose
```

ก่อนแก้ baseline ให้รันสองครั้งใน runtime เดียวกัน และตรวจบน clean HEAD ใน runtime เดียวกัน: diff ที่มีอยู่ใน physics ตอนตรวจจำกัดที่ `monte-carlo-job.ts` ซึ่งจัดคิว workers ไม่ได้แก้ `Simulation` หรือ trajectory math หาก Cloud ใช้ Linux/Node คนละรุ่นให้บันทึกไว้และเทียบด้วย

Process ตอนรับช่วงที่ใช้ CPU หนัก: IDs 3264, 7956, 12684, 14004 เริ่มประมาณ 02:36 น.; IDs ทั้งหมดและ CPU snapshot อยู่ใน `physics-checkpoint.json` ยังระบุ parent/command line ไม่ได้เพราะ `Get-CimInstance Win32_Process` ถูกปฏิเสธการเข้าถึง จึงไม่ควรฆ่า process จาก PID โดยไม่ตรวจ ownership ใหม่

ยังไม่มีการแก้ physics ใหม่ ไม่มีการ push หรือ deploy จากงานตรวจนี้
