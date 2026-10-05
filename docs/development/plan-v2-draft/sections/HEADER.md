# แผนแม่บทการพัฒนา Orbitlab (Master Plan) — ฉบับรวม

| หัวข้อ | ค่า |
|---|---|
| เวอร์ชัน | 2.0 (ร่าง) — จะลงเป็น `docs/development/PLAN.md` แทน v1.2 ที่ path เดิมหลังเจ้าของอนุมัติเท่านั้น (CO-8, ดู S06) |
| วันที่ | 2026-10-04 |
| ฐานของแผน | `origin/main` = `da67341` (รวม R2, PR #74 squash-merge 2026-10-04 01:55 UTC); วัด PB และตรวจ code review บน `fbefa18`; วัด PB ซ้ำบน `5f9aa2e` (PB@5f9aa2e, เครื่องต่างกัน เทียบได้เฉพาะไบต์และจำนวน); as-of 2026-10-04 ~21:10Z: main `5f9aa2e` (#83), live `09cc2f5` ผ่าน Pages 37230585947; ส่วนต่างหลังฐาน (#75–#83; main `5f9aa2e`, live `09cc2f5`; R3 ครบตามคำเจ้าของ 2026-10-04 → G3) ดู S00 §00.1 และ S03 |
| สถานะ | เอกสารวางแผนเท่านั้น — **ไม่มีการแก้โค้ดจนกว่าเจ้าของจะอนุมัติ** (OR-5); ทุกแพ็กเกจ `execution_authorized: false` จนเจ้าของสั่งเป็นรายคลื่นหรือรายแพ็กเกจ (D-65) |
| แทนที่ | `docs/development/PLAN.md` v1.2 (แทนในที่เดิม); `docs/history/review-2026-09-30/DEVELOPMENT-PLAN-TH.md`; `docs/history/review-2026-09-30/REMAINING-WORK-TH.md`; `docs/history/review-2026-09-30/STATUS-INVENTORY-TH.md` และ `README.md` ของ review-2026-09-30; `docs/history/audit-2026-09-27/PLAN-2026-09-28.md`; ส่วน backlog ของ `docs/stage1-2026-10-02/README.md`; ตาราง Roadmap ใน `docs/IMPLEMENTATION-STATUS.md` (หมายเหตุ historical); PLAN v1.2 §4.1; และเอกสารอื่นตาม S19 App D (ติด banner เท่านั้น ไม่ลบหรือย้ายไฟล์ใด) |
| ไฟล์ประกอบ (`$F` และหลักฐาน) | `$F` คือโฟลเดอร์ตารางข้อมูลของแผน (`assignment.tsv`, `packages.tsv`, `decisions.tsv`, `kpis.tsv`, `folds.tsv`) ในชุดไฟล์ประกอบอยู่ที่ `data/`; ledger รวม (`unified-*.jsonl/.md`) อยู่ที่ `ledger/`; สคริปต์วัด `measure.mjs` และผล PB อยู่ที่ `perf-baseline/`; สคริปต์สร้างตาราง (`gen_final.py`, `gen_appendix.py`, `overrides_s05.py`, `overrides_s13.py`, `overrides_refresh.py`) อยู่ใน `$F` คู่กับตาราง; หลักฐานของ refresh 2026-10-04 (`r3-audit.tsv` ตาราง delta 58 แถว, `stale-facts.md`, `r3-code-review.md`, `finalize_r3_audit.py`) อยู่ที่ `refresh/` ไฟล์เหล่านี้เป็นหลักฐาน ไม่ commit เข้า `docs/` (กฎ repo-hygiene) จนกว่า R0.4 จะนำสคริปต์วัดเข้า repo |
| ไม่แทนที่ (คงรูปแบบเดิม เพราะโค้ด/เทสต์อ่าน) | `docs/ROADMAP-PART2-3.md`, `docs/SIXDOF-VEHICLE-DATA.md`, `docs/history/phase4-2026-10-01/T03-CURRICULA-RESEARCH.md`, `docs/history/AUDIT-2026-09-16.md`; แหล่งจริงรายเรื่องยังเป็น PROGRESS, DECISIONS, IMPLEMENTATION-STATUS, VERIFICATION (S00 §00.8) |

