# การยืนยันสาเหตุ fingerprint ไม่ตรงจาก Node runtime

ตรวจวันที่ 29 กันยายน 2026 เวลา 21:58–22:05 น. Europe/Moscow ใน `audit-2026-09-29/source`

## ข้อสรุปที่พิสูจน์แล้ว

**D01 point-mass fingerprint ทั้ง 27 เที่ยวบินตรง golden เดิมเมื่อรันด้วย Node 22.23.3** โดยไม่แก้ source, dependencies หรือ golden ผลทั้งไฟล์คือ **28/28 tests ผ่าน, 0 failed, 0 skipped, exit 0** (27 เที่ยวบิน + 1 test ตรวจรายการ) ใช้เวลา Vitest 4.28 วินาที

**Rigid-flex golden ทั้ง 4 กรณีผ่านด้วย Node 22.23.3 เช่นกัน**: Falcon 9, Soyuz-2.1a และ Angara-A5 บิน 160 วินาทีตรง golden และ Falcon 9 เมื่อกำหนด flexible-body options ทุกตัวเป็น off ยังตรง golden เดิม ผล **4/4 passed, 0 failed, 0 skipped, exit 0** ใช้เวลา 53.12 วินาที (แต่ละกรณี 12.447 / 15.501 / 11.044 / 12.920 วินาที) worker พิมพ์ runtime จริงเป็น Node 22.23.3 / V8 12.4.254.21-node.57

รวมสองไฟล์นี้ตรวจใหม่ **32/32 tests ผ่าน** โดยมี fingerprint comparisons 31 กรณีและ completeness test 1 กรณี; ไม่ใช่ผล full standard suite

การเทียบกรณีเดิม `soyuz21a/leo/50` บนเครื่องและ checkout เดียวกัน ยืนยันว่าความไม่ตรงขึ้นกับ Node/V8 runtime:

| Runtime ของ worker จริง | วิธีรัน | hash | ผล |
| --- | --- | --- | --- |
| Node 24.19.0 / V8 13.6.233.17-node.51 | รันกรณีเดิมสองครั้ง | `a173338ebfab9d7b` ทั้งสองครั้ง | ไม่ตรง golden |
| Node 24.19.0 / V8 13.6.233.17-node.51 | worker `--jitless` | `a173338ebfab9d7b` | ไม่ตรง golden เช่นเดิม |
| Node 22.23.3 / V8 12.4.254.21-node.57 | รันกรณีเดิมสองครั้ง | `deef4d6e49a74ea0` ทั้งสองครั้ง | ตรง golden เดิม |

กรณี Node 22 ยืนยัน hash ด้วย assertion `toBe(D01_FINGERPRINTS[key])` เดิมที่ผ่านทั้งสองรอบ ไม่ได้แทน expected value ใหม่ ผลนี้ยืนยัน runtime-dependent exact-hash difference ในกรณีตัวแทน และยืนยันว่า D01 ทั้งกลุ่มผ่านบน Node 22; ยังไม่ได้แยกว่าความต่างเริ่มที่ฟังก์ชันคณิตศาสตร์หรือ state field ใด และไม่ได้วัดขนาดความต่าง trajectory ระหว่าง runtime

## แหล่งหลักฐานและที่มา

- `fingerprint-node24-probe-20260929.log/.json`: ตัวแทน Node 24 พร้อม repeat
- `fingerprint-node24-jitless-probe-20260929.log/.json`: ตัวแทน Node 24 ปิด JIT
- `fingerprint-node22-probe-20260929.log/.json`: ตัวแทน Node 22 พร้อม repeat
- `fingerprint-node22-d01-full-20260929.log/.json`: D01 ครบ 28/28 tests เวลา 22:02 น.
- `fingerprint-node22-rigid-flex-20260929.log/.json`: rigid-flex golden ครบ 4/4 tests เวลา 22:04–22:05 น.
- `fingerprint-worker-runtime-probe.cjs`: preload สำหรับพิมพ์ `process.version`, `process.versions.v8`, `process.execPath`, PID, architecture และ platform ของ Vitest worker จริง เพื่อไม่สับสนกับเวอร์ชัน launcher
- Node 22 มาจาก official npm package `node@22` แบบชั่วคราวใน npm cache: `C:/Users/Royin/AppData/Local/npm-cache/_npx/52027bd8fc0022aa/node_modules/node/bin/node.exe`; ไม่เปลี่ยน Node หลักของเครื่องหรือ package manifests
- ระบบ: Windows x64, Vitest 5.0.1, base Git HEAD `0a6d1a709ffbf88e8e36f606d6993bd27e5c25e0` พร้อมงานแก้ค้างของ audit; เมื่อเทียบ physics/data/harness/fingerprint tests กับ base พบ diff ใน physics เฉพาะ `monte-carlo-job.ts` ซึ่งจัดคิว workers ไม่ได้ถูกใช้ใน `flyCase` ที่ทดสอบนี้

## เหตุผลที่ตรวจ runtime ก่อนแก้ golden

ทั้ง D01, rigid-flex-golden, heavy/sixdof-fingerprint และ heavy/flex-golden ใช้ `tests/flex-golden-harness.ts` ร่วมกัน ตัว sampler hash JSON ของตัวเลข state, telemetry และ `[event key, time]` ด้วย SHA-256 โดยไม่ปัดเศษ สำหรับ 6-DOF ตัดเฉพาะ `attitudeLoop` กับ `linearModel` ออกจากข้อมูลที่ hash จึงไม่ใช่ raw text fixture ที่ LF/CRLF เปลี่ยนแล้วจะอธิบายผลได้

โครงการกำหนด Node 22 ใน `.github/workflows/ci.yml` และ `deploy.yml`; `docs/IMPLEMENTATION-STATUS.md:443–445` และ `docs/VALIDATION.md:2143–2144` เตือนตรง ๆ ว่า Node/V8 upgrade อาจทำให้ exact flight hashes ต่างแม้ code ไม่เปลี่ยน การทดลองนี้ยืนยันคำเตือนนั้นสำหรับกรณีที่เทียบ

## สิ่งที่ยังต้องยืนยันต่อ

1. ผล Node 22 ในเอกสารนี้ยังไม่ใช่การรัน `tests/heavy/sixdof-fingerprint.test.ts` 21 เที่ยวบิน หรือ `tests/heavy/flex-golden.test.ts` 3 เที่ยวบินใหม่ ห้ามเหมารวมว่าผ่านแล้ว ส่วน `tests/rigid-flex-golden.test.ts` 4 tests ตรวจใหม่ผ่านแล้วตามหลักฐานข้างต้น
2. ให้ Cloud บันทึกเวอร์ชัน worker และรันกลุ่มที่ล้มเหลวด้วย Node 22 ก่อน ไม่ regenerate golden เพื่อกลบ mismatch และไม่ตีความว่า fingerprint บน runtime ต่างกันพิสูจน์ physics regression โดยลำพัง
3. Full standard/heavy acceptance และการยืนยัน browser/UI เป็นงานแยกจาก exact-hash compatibility นี้ รายงานชุดใหญ่ต้องคงสถานะตามผลจริงของแต่ละชุด

คำสั่ง full D01 ที่ใช้ หลังเลือก executable Node 22 ที่ตรวจเวอร์ชันแล้ว:

```powershell
& $physicsNode22 node_modules/vitest/vitest.mjs run tests/d01-fleet-fingerprint.test.ts --maxWorkers=1 --execArgv=--require=C:/Users/Royin/OneDrive/Desktop/Royin/Orbitlab/audit-2026-09-29/fingerprint-worker-runtime-probe.cjs --reporter=verbose --reporter=json --outputFile.json=../fingerprint-node22-d01-full-20260929.json
```

งานรอบนี้ไม่มีการแก้ production, dependency manifests หรือ golden รันเฉพาะ D01 และ rigid-flex golden ที่ระบุ; ไม่เริ่ม full standard/heavy/fleet suite และไม่มีการ push/deploy
