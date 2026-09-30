# สาเหตุ CI และการแก้ตัวตรวจขอบเขต runtime

ตรวจ [CI run 36628517818](https://github.com/ROYIN001/Orbitlab/actions/runs/36628517818) ของ PR 41, head `3eff70baf71f0484570466c9b1a0869bd795c7de`, checkout merge `e1a4bfac2a62c95eb4a703e18549187b9b21d0b5` ผ่าน GitHub connector job/steps/log API โดยตรง ไม่ได้อนุมานจากสถานะรวม

- job `test` ใช้ Node 22.23.2, Vitest 5.0.1; npm ci และ typecheck ผ่าน; npm test จบใน 915.34 วินาทีด้วย **9,187 ผ่าน / 9,188 tests**, 186/187 files ผ่าน; build step ใน job นี้ถูกข้ามหลัง failure
- job `browser-smoke` ผ่าน รวม build และ browser smoke; เป็นผลของ commit ข้างต้นเท่านั้น
- ไม่ใช่ job timeout: assertion เดียวที่ล้มคือ `tests/propagator.test.ts` ตรวจ boundary แล้วรายงาน `lessons/progress.ts` เพราะ regex เดิมนับ `import type { Activity, DailyActivity } from '../physics/propagator/activity'` ว่าเป็น runtime dependency ทั้งที่ TypeScript ลบ declaration นี้ตอน compile

แก้เฉพาะ `tests/propagator.test.ts`: อ่าน TypeScript AST ผ่าน parser ของ Vite ที่เป็น dependency เดิม แยก type-only declarations จาก value imports โดยไม่ขยาย allowlist ตัวตรวจยังจับ value, mixed, side-effect imports, re-exports และ dynamic imports ได้ เพิ่ม counterexamples 11 กรณีที่ยืนยันความแตกต่างดังกล่าว ไม่มี production, physics assertion, golden หรือ timeout เปลี่ยนจากการแก้ CI นี้

หลักฐานก่อนแก้: `architecture-before.json/.log/.exit` ใช้ Node 22.23.3 รันทดสอบ boundary เดียว เกิด failure เดียวกันจริง หลังแก้ `architecture-after.json/.log/.exit` ผ่าน 12/12 selected tests (อีก 14 ไม่เลือกในรอบนี้); จากนั้นรัน **ทั้งไฟล์ 26/26 ผ่าน, exit 0**, 11.58 วินาที ใน `propagator-after.json/.log/.exit` และ `tsc --noEmit` ผ่าน ต้องรอ final CI บน commit ใหม่เพื่ออ้างว่า acceptance รอบสุดท้ายผ่าน

จำนวน tests เพิ่มจาก Cloud handoff 2,544 เป็น CI 9,188 เพราะ **6,644 cases ใหม่/เพิ่มใน integrated source** ไม่ใช่ discover handoff หรือ scratch: catalogue matrix 6,542 cases บวก regressions อื่น 102 cases รวม 10 ไฟล์ใหม่และ 4 ไฟล์ที่ขยาย รายการเปรียบเทียบจากผลจริงทั้งสองรอบอยู่ใน `ci-count-difference.json`; config ยัง exclude `tests/heavy`, `tests/sixdof-fleet`, `tests/probe` ตามเดิม

หลักฐานจาก GitHub: `ci-36628517818-summary.json` มี runtime, source, file counts ครบ 187 ไฟล์ และ `ci-36628517818-failure-excerpt.log` เป็นช่วง failure/final summary ที่ตัดจาก log จริง ไม่ใช่ full log ทั้ง job
