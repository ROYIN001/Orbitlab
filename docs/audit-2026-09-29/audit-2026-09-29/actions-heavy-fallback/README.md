# GitHub Actions heavy acceptance — preparation record

> **สถานะสุดท้าย 29 กันยายน 2026, 22:09:55 UTC:** root ติดตั้งและ push workflow แล้ว รันจริงบน `0b844f77` จบ **246/246 assertions, 27/27 files, SUCCESS**; ตรวจ ZIP และ exact union อิสระครบ ดู [ผลยอมรับชุดหนัก](../actions-heavy-results/36631307401/final-heavy-acceptance-TH.md) และ [final-summary.json](../actions-heavy-results/36631307401/final-summary.json) เนื้อหาด้านล่างเป็นบันทึกขั้นเตรียม ไม่ใช่สถานะ pending ปัจจุบัน

root อนุมัติให้ติดตั้งชุดนี้ใน `source-integrated` เพื่อรัน acceptance ใหม่บน integration commit ที่ระบุได้ชัดเจนแล้ว โดยเก็บ Cloud เดิมไว้ครบและไม่สรุปว่าล้มเหลวจากสถานะที่ขัดแย้งกัน ผู้จัดทำชุดนี้ยัง **ไม่ได้ commit, push หรือ dispatch**; root เป็นผู้ตรวจและเริ่มงานจริง ไฟล์ในโฟลเดอร์นี้เป็นร่าง/หลักฐานประกอบ เวอร์ชันที่ติดตั้งและปรับการตรวจ provenance อยู่ใน `source-integrated/.github/workflows/heavy-audit.yml` และ `source-integrated/scripts/audit-heavy/`

ไฟล์ที่เตรียมให้ตรวจ:

| ไฟล์ร่าง | ตำแหน่งเมื่อ root อนุมัติใช้ |
| --- | --- |
| `heavy-audit.yml` | `.github/workflows/heavy-audit.yml` |
| `run-heavy-file.mjs` | `scripts/audit-heavy/run-heavy-file.mjs` |
| `check-heavy-union.mjs` | `scripts/audit-heavy/check-heavy-union.mjs` |
| `heavy-expected.json` | `scripts/audit-heavy/heavy-expected.json` |

Workflow ระบุทั้ง 27 ไฟล์อย่างชัดเจน แยกหนึ่งไฟล์ต่อ job, Node 22.22.2, worker หนึ่งตัว, `fail-fast: false`, พร้อมกันไม่เกิน 6 jobs และขีดจำกัด job 360 นาที ไม่เปลี่ยน assertion, golden, physics หรือ test timeout เดิม ตัว trigger แบบ push จำกัด branch ที่ตรวจพบจริง `codex/audit-acceptance` และ paths ของ workflow/เครื่องมือชุดนี้; การเพิ่มไฟล์ร่างเหล่านี้เข้าคอมมิตและ push จะเริ่ม workflow จึงต้องเป็นขั้นตอนตัดสินใจของ root อีกครั้ง

CI ปัจจุบันของ repository จะรัน standard/typecheck/build เมื่อ push feature branch ด้วย การเพิ่ม workflow นี้ไม่ได้ปิด CI เดิม และไม่ได้เรียก workflow deploy ซึ่งมี push trigger ที่ main เท่านั้น (schedule/manual ของ deploy เดิมยังเป็นเรื่องแยก)

Runner ตรวจว่ารายการ heavy files ยังตรง 27 ไฟล์ก่อนเริ่ม จด source commit/tree, lockfile/config hashes, runtime จริงทั้ง parent/worker, คำสั่ง, log, JSON, exit และเวลา Artifact จะเก็บทั้งกรณีผ่านและ assertion ล้มเหลว ตัวรวมผลตรวจชื่อและไฟล์ของ **246 กรณีจริง** พร้อม missing/extra/duplicate, failed/skipped, exit code, runtime และ source provenance; จะไม่ใช้เพียงยอดรวมเพื่อตัดสินครบ

7 บทเรียน 6-DOF อยู่ใน `tests/heavy/lessons-sixdof.test.ts`: 3.2 `fail-gyro-fdir`, 2.3 `guid-nav`, 2.4 `guid-monte-carlo`, 4.1 `ctl-inspector`, 4.2 `ctl-margins`, 4.3 `ctl-step`, 4.4 `ctl-notch` รวมกรณีคำตอบผิดในบท 2.4 และกรณี tuning ผิด/ไม่ทำ step test ในบท 4.3 ภายใน tests เดิม Monte Carlo อีกห้า set tests รวม 170 flights; ไม่ควรนับ 246 tests เป็น 246 เที่ยวบิน

ตรวจ syntax ของ scripts ด้วย Node 22.23.3 ผ่าน และตรวจตัวรวมผลด้วยข้อมูล **สังเคราะห์เท่านั้น** 6 กรณี: ครบ 246/27, ขาดกรณี, runtime ผิด, exit ไม่เป็นศูนย์, source ปะปน และผลซ้ำ ผ่านตามคาดทั้งหมด ดู `script-self-check.json` โฟลเดอร์ `.synthetic-self-check/` เป็น fixtures ปลอมที่ติดป้าย `SYNTHETIC_ONLY` ใช้ทดสอบตัวรวมผล ไม่ใช่หลักฐานฟิสิกส์ และไม่ต้องนำไปติดตั้งใน repository

GitHub-hosted runners จำกัดแต่ละ job ที่ 6 ชั่วโมง และ matrix ไม่เกิน 256 jobs ตาม [GitHub Actions limits](https://docs.github.com/en/actions/reference/limits) แม้ใช้ `if: always()` ก็ไม่ควรรับรองว่า upload จะสำเร็จหาก runner ถูกยุติที่ขีดจำกัดเวลา จึงเลือกแยกต่อไฟล์เพื่อลดงานที่ต้องเริ่มใหม่ ดู [workflow timeout และ matrix syntax](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax) สำหรับค่าที่กำหนดในร่าง

หลังติดตั้งตรวจ matrix ตรง source 27/27 ไฟล์และ expected names 246 รายการไม่ซ้ำ, Node 22 syntax checks ผ่าน และ collector ที่ติดตั้งผ่านข้อมูลสังเคราะห์ 10/10 กรณี (`installed-script-self-check.json`) เพิ่มการตรวจ actual worker runtime, inventory hash และ workflow provenance ไฟล์สังเคราะห์ติดป้ายชัดเจนและไม่ใช่ผลฟิสิกส์ Workflow มีสิทธิ์เพียง `contents: read`, ปิด persist checkout credentials, ไม่มี deploy step, จำกัด push trigger เฉพาะ branch และสี่ paths ของชุดนี้

ตรวจ preload กับ Vitest worker จริงโดยรันทดสอบชั่วคราวนอก repo 1/1 ผ่าน, exit 0: `worker-runtime-probe/summary.json` พร้อม `result.json`, `worker-runtime.jsonl`, `run.log`, `exit.txt` พบสอง process records และ worker argv `vitest/dist/workers/forks.js` ตรงกับ predicate ที่ใช้ตรวจ ไม่ใช่การจำลองข้อมูล worker ข้อนี้ยังไม่ใช่ physics acceptance

การวิเคราะห์ CI เดิมที่ล้มเหลวแยกไว้ใน `ci-architecture-diagnosis-TH.md`; อย่านำผล CI เก่า, targeted closure และ heavy ที่ยังไม่จบมารวมเป็นคำกล่าวว่า final acceptance ผ่านครบแล้ว

root commit/push ชุดที่ตรวจพร้อม final physics ที่ `0b844f77f5f0ffdeb7274642ddf74a57c2ee230b` แล้ว: [Heavy acceptance run 36631307401](https://github.com/ROYIN001/Orbitlab/actions/runs/36631307401), [PR CI 36631312923](https://github.com/ROYIN001/Orbitlab/actions/runs/36631312923), [push CI 36631307359](https://github.com/ROYIN001/Orbitlab/actions/runs/36631307359) ตรวจ GitHub jobs API ณ 2026-09-29 21:10:32 UTC พบ heavy 6 jobs อยู่ขั้นคำนวณและ 21 jobs queued; CI ทั้งสองอยู่ขั้น npm test จึงยังไม่ใช่ผลสำเร็จสุดท้าย
