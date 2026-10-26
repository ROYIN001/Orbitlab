# GK1: the K1 ceilings lowered to the measured size (q03 B, q03-1 B) / ลดเพดานขนาดของ K1 ลงเท่าขนาดที่วัดได้

> **สรุปสำหรับเจ้าของ (ภาษาไทย)**
>
> - PR นี้ทำตามที่คุณตัดสินไว้แล้วเมื่อ 2026-10-09: การ์ด q03 B "ปรับเพดานลงที่ GK1" และการ์ด q03-1 B "ลดพร้อมกันที่ GK1" — "ทำ PR เดียวพร้อมการปรับเพดานอื่นของ K1"
> - เปลี่ยนค่าเฉพาะใน `budgets.json` (ค่าเพดานและบันทึกใน `_notes`) และเพิ่มรายงานกับ fragment ไม่แตะโค้ดแอป ขนาดของแอปไม่เปลี่ยน
> - กลุ่มที่ขึ้นเพดานใน K1 มี 6 กลุ่ม ค่าใหม่คือขนาดที่วัดบน main `a05ae70` ปัดขึ้นเป็น kB เต็ม ตามที่ budgets.json ใช้มา ส่วน precache รวมเท่ากับ code + data/:
>   - `index-*.js` 2645 → 2635 kB (−10)
>   - `index-*.css` 178 → 177 kB (−1) กลับไปเท่าตอน GK0
>   - precache code 14724 → 14654 kB (−70)
>   - precache รวม 16123 → 16053 kB (−70)
>   - `i18n-*.js` คงที่ 1729 kB เพราะขนาดที่วัดได้ 1,728,991 B ปัดขึ้นแล้วเท่าเพดานเดิม (เหลือที่ว่าง 9 B)
>   - other chunks คงที่ 772 kB เพราะขนาดที่วัดได้ 771.4 kB ปัดขึ้นแล้วเท่าเพดานเดิม ค่านี้ต่างจากหน้าความพร้อม GK1 (771) เพราะหน้านั้นวัดที่ `11c4a7f` (770.8 kB) ก่อน #172, #173, #176 และ #177
> - ไม่มีกลุ่มใดขึ้น precache data/ คง 1399 kB เพราะไม่ได้ขึ้นใน K1 กลุ่มอื่นที่ไม่ได้ขึ้นใน K1 (worker ต่าง ๆ, catalog, lesson-file ฯลฯ) ไม่อยู่ในคำตัดสินนี้ จึงไม่แตะ คำว่า "ทุกกลุ่ม" ในหน้าความพร้อม GK1 หมายถึง 6 กลุ่มในตารางเพดานของหน้านั้น ("ค่าที่จะลดของที่ขึ้นใน K1")
> - หลังจากนี้ที่ว่างเหลือน้อยมาก precache code เหลือ 174 B และไฟล์ JS กับ CSS ทั้ง 34 ไฟล์อยู่ใน precache จึงเป็นเพดานของทุกกลุ่ม ภายในนั้น i18n เหลือ 9 B และ CSS 138 B ส่วน index (เหลือ 197 B) และ other chunks (เหลือ 583 B) เพิ่มได้ไม่เกิน 174 B งานที่เพิ่มขนาดต่อจากนี้ต้องขอขึ้นเพดานตาม D-38
> - ใช้ส่วนที่ขึ้นใน K1 ไปเท่าไร (HANDOVER-K1 §7) ตอบสองแบบ: ที่ `a05ae70` index ใช้ 12.8 จาก 23 kB และ precache code ไม่ใช้เลย แต่สูงสุดใน K1 index ใช้ 22.6 จาก 23 (2644.6 kB ที่ #154) และ precache code ใช้ 19.3 จาก 20 (14723.3 kB ที่ `23ede7f` ก่อน #126 ลดลง 35.1 kB)
> - การ merge: คำตัดสิน q03 B และ q03-1 B บอกว่าทำอะไร แต่ไม่ได้บอกว่าใคร merge การอนุมัติล่วงหน้าครอบเฉพาะงานแก้บั๊กและ PR บันทึกข้อเท็จจริง PR นี้ไม่ใช่ทั้งสองอย่าง จึงรอคุณอนุมัติใน Merge Desk (#146 ซึ่งเป็น PR งบขนาดเหมือนกัน merge ตามคำสั่งของคุณในแชต)

```yaml
package: GK1 (work order item 5 of the GK1 readiness doc)
item: D-38 GK1 ratchet of the K1 ceilings (cards q03 B and q03-1 B)
change_kind: gate (budgets.json only; no app code, the build's output does not change)
wave: K1 (GK1)
owner_authorization: 'owner, 2026-10-09, K1 decision page 2: card q03 option B, 2026-10-09T22:25:48Z: "วงเงินครั้งเดียวสำหรับงานแก้บั๊กและกันข้อมูลหายที่เหลือของ K1" — "... ปรับเพดานลงที่ GK1 ..."; card q03-1 option B, 2026-10-09T22:25:59Z: "ลดพร้อมกันที่ GK1" — "ทำ PR เดียวพร้อมการปรับเพดานอื่นของ K1" (DECISIONS "Decided 2026-10-09")'
allowed_write_paths: [budgets.json, docs/development/reports/GK1-ceilings-q03-1.md, changes/claude-happy-hawking-m71bk1-ceilings.md]
app_code: none
base_sha_verified_on: {sha: a05ae70, date: 2026-10-26}
branch: claude/happy-hawking-m71bk1-ceilings
merge: 'waits for the owner (Merge Desk); q03 B and q03-1 B decide the change and that it is one PR, and say nothing about its merge; the standing approval covers bug fixes and fact-only record PRs, and a lowered ceiling is neither'
```

## What the owner decided

DECISIONS, "Decided 2026-10-09", verbatim:

| Time (UTC) | Card | Answer |
|---|---|---|
| 2026-10-09T22:25:48.719Z | `q03` (ข้อ 3) นโยบายงบขนาดสำหรับงานที่เหลือของ K1 | B — "วงเงินครั้งเดียวสำหรับงานแก้บั๊กและกันข้อมูลหายที่เหลือของ K1" — i18n +2 kB, index +2 kB, CSS +1 kB, other chunks +1 kB ไม่เพิ่มเพดาน precache code ทุก PR ต้องแจ้งขนาดที่วัดได้ ปรับเพดานลงที่ GK1 (offset: EQ-6/EQ-7 ใน K2 และการรวม CSS ซ้ำของ CO-4 026) |
| 2026-10-09T22:25:59.849Z | `q03-1` (ข้อ 3.1) เพดาน precache code หลังการบีบภาพใน #126 | B — "ลดพร้อมกันที่ GK1" — ทำ PR เดียวพร้อมการปรับเพดานอื่นของ K1 |

What this PR reads from them:
- **Which groups.** q03-1 B lowers precache code "together with the other K1 ceiling adjustments" (การปรับเพดานอื่นของ K1). So the scope is every ceiling raised in K1, not every group. The records read it the same way: `budgets.json` `_notes` ("the precache code ceiling is lowered at GK1 in the same PR as the other K1 ceilings") and PROGRESS ("lowering every K1 ceiling, precache code included, at GK1 in one PR"). The GK1 readiness doc twice says "every group" (ทุกกลุ่ม), at its ceilings table and at work-order item 5. Its ceilings table, headed "ค่าที่จะลดของที่ขึ้นใน K1" (the values to lower for what rose in K1), lists only the six K1 groups, so "every group" there means those six.
- **Which groups were raised in K1.** `budgets.json` before K1's first raise, #104 (`cc0ad7d^`; unchanged since #84, so the same as at the GK0 candidate `06abb1f`), against main `a05ae70`: six groups differ, all upwards. Nothing else changed. They are `index-*.js`, `index-*.css`, other chunks, `i18n-*.js`, precache code and precache. The raises came in 7 PRs: #104, #111, #117, #128, #137, #146 and #154.
- **To what value.** Neither card gives a number. The GK1 readiness doc's ceilings table gives the rule: "ค่าหลังลด = ขนาดที่วัดได้ปัดขึ้นเป็น kB เต็ม ตามที่ budgets.json ใช้มา (precache data/ คง 1399 เพราะไม่ได้ขึ้นใน K1) เป็นการคำนวณ ไม่ใช่คำตัดสิน". The `budgets.json` notes for the #104 and #111 raises of precache code say the same: "the ceiling ratchets back to the measured size + rounding". The precache total follows its two groups, as every K1 note on it does.
- **The merge.** Neither card says how the PR is merged. See the `merge` line above.

Other notes:
- #154's raise of `index-*.js` (2638→2645) came from the owner's chat answer of 2026-10-15, "ขึ้นเพดานตามขนาดจริง". Its note says "Ratchets back at GK1", so it is lowered here with the rest.
- HANDOVER-K1 §7 asks GK1 to report how much of the D-38 K1 allowance was used. The table below answers it twice: use on `a05ae70`, and the K1 peak from the readiness doc.

## Measured on a05ae70

`npx vite build` on `a05ae70` (main after #177), then `node scripts/bundle-budget.mjs build.log`. Exact bytes come from the same grouping as the script.

| Group | GK0 ceiling (kB) | Ceiling before (kB) | Measured on `a05ae70` | New ceiling (kB) | Change (kB) | K1 raise used on `a05ae70` (kB) | K1 peak (kB, readiness doc) |
|---|---:|---:|---:|---:|---:|---|---|
| `index-*.js` | 2622 | 2645 | 2634.8 (2,634,803 B) | 2635 | −10 | 12.8 of 23 | 2644.6 at #154, 22.6 of 23 (2649.0 at `6b9d560`, over the ceiling of the time) |
| `index-*.css` | 177 | 178 | 176.9 (176,862 B) | 177 | −1 | 0 of 1 | 177.0 |
| other chunks | 765 | 772 | 771.4 (771,417 B) | 772 | 0 | 6.4 of 7 | about 770.8 (at `11c4a7f`, before #172–#177) |
| `i18n-*.js` | 1720 | 1729 | 1729.0 (1,728,991 B) | 1729 | 0 | 9.0 of 9 | 1729.0 |
| precache code | 14704 | 14724 | 14653.8 (14,653,826 B) | 14654 | −70 | 0 of 20 | 14723.3 at `23ede7f`, 19.3 of 20 |
| precache (total) | 16103 | 16123 | 15773.0 (15,773,027 B) | 16053 (14654 + 1399) | −70 | 0 of 20 | — |
| precache data/ (not raised in K1) | 1399 | 1399 | 1119.2 (committed snapshots) | 1399 | 0 | — | — |

Notes on the table:
- The GK0 ceilings are `budgets.json` at `cc0ad7d^`, which equals the GK0 candidate `06abb1f`.
- "Used on `a05ae70`" is the measured size minus the GK0 ceiling, or 0 when the size is under the GK0 ceiling.
- The K1 peak column is the readiness doc's "สูงสุดใน K1" column. Other chunks on `a05ae70` (771.4) is above the doc's figure, which was measured before #172–#177.
- `i18n-*.js` is 9 B under 1729 kB, so its measured size rounds up to the old ceiling and the new value equals the old one. Other chunks is the same case: 771.417 kB rounds up to 772.
- On `a05ae70`, precache code is 50.2 kB under its GK0 ceiling, so it uses none of the 20 kB raised in K1. K1 did use the raise: precache code peaked at 14723.3 kB at `23ede7f` (19.3 of 20), and then #126 (`600a2c3`) removed 35.1 kB by re-encoding three Earth textures.
- After this PR, precache code has 174 B of room. All 34 JS and CSS files in `dist/assets` are in the precache manifest, so those 174 B cap every chunk group. Within that, `i18n-*.js` has 9 B and CSS 138 B. Index (197 B under its own ceiling) and other chunks (583 B) can add at most 174 B. Any later PR that adds bytes to one of these groups needs a D-38 raise.

### Against the readiness doc and #177

| Group | Readiness doc (build of `11c4a7f`) | #177's PR description | `a05ae70` (this build) |
|---|---:|---:|---:|
| `index-*.js` | 2634.8 | 2634.8 | 2634.8 |
| `i18n-*.js` | 1729.0 | 1729.0 | 1729.0 |
| other chunks | 770.8 | 771.4 | 771.4 |
| `index-*.css` | 177.0 (176,994 B) | 176.9 | 176.9 (176,862 B) |
| precache code | 14653.3 | 14653.8 | 14653.8 |
| precache total | 15772.5 | 15773.0 | 15773.0 |

- The `11c4a7f` figures were measured again here, from the `dist/` of an `11c4a7f` build kept in a scratch worktree (built 2026-10-23). They match the doc: other chunks 770,756 B, precache code 14,653,301 B, CSS 176,994 B.
- Between `11c4a7f` and `a05ae70`, the source changes are #172 (`panel.ts`), #173 (`style.css`, `telemetry.ts`) and #176/#177 (the assessment files).
- In that span other chunks grew by 661 B and precache code by 525 B. That is why other chunks now rounds up to 772, where the doc expected 771.
- CSS fell by 132 B, from #173, as the doc notes. Its new value is still 177.
- The doc says every group matched Pages except the precache total, because Pages refreshes `data/` when it builds. The first Pages run after the merge prints the same table for this ceiling.

## The bundle budget with the new ceilings

On the same build, `node scripts/bundle-budget.mjs build.log` gives `bundle budget: ok` and `build log: no INEFFECTIVE_DYNAMIC_IMPORT`:

```
index-*.js                       2634.8     2635.0        -0.2  ok
index-*.css                       176.9      177.0        -0.1  ok
other chunks                      771.4      772.0        -0.6  ok
precache                        15773.0    16053.0      -280.0  ok
precache code                   14653.8    14654.0        -0.2  ok
precache data/                   1119.2     1399.0      -279.8  ok
i18n-*.js                        1729.0     1729.0        -0.0  ok
```

The 18 other groups did not change: every worker, `catalog-*.js`, `author-view-*.js`, `check-view-*.js`, both `workspace-content` groups and `lesson-file-*.js`. Their ceilings were set before K1. Neither card covers them, so they keep those ceilings. Their room varies: `flight.worker-*.js` is 570.4 kB against a 589 kB ceiling, set on 2026-10-01 at the measured size + 2 %, while `lifetime-altitude.worker-*.js` is 32 B under 122 kB and `requirement-trades.worker-*.js` 181 B under 136 kB.

## What changed in budgets.json

- Six values: `index-*.js` 2635, `index-*.css` 177, precache code 14654 and precache 16053. `i18n-*.js` stays 1729 and other chunks stays 772.
- Under `_notes.set`, one dated entry is added beside each of the six groups. Each entry quotes q03 B and q03-1 B, names `a05ae70` and gives the measured bytes. The entries for `i18n-*.js` and other chunks say why their value does not change.
- The edit is textual, so the rest of the file stays byte for byte. That includes its one escaped `→`.

## Checks

`node scripts/verification/select-checks.mjs --files budgets.json docs/development/reports/GK1-ceilings-q03-1.md changes/claude-happy-hawking-m71bk1-ceilings.md` selects the full set. `budgets.json` is in the rule `toolchain-and-public` (`all: true`).

Run here, on `a05ae70` with this change:
- `npx vite build` and `node scripts/bundle-budget.mjs build.log`: ok, as above.
- `npx vitest run tests/bundle-budget.test.ts`: 8 of 8 pass. This includes "the two ceilings and the data baseline … add up to no more than the total precache ceiling": 14654 + 1399 = 16053.
- `npm run -s typecheck`: clean.
- `node --test tests/verification/*.test.mjs tests/browser/shard.test.mjs`: 93 of 93 pass.
- `npx vitest run`: 333 files, 10 521 tests pass (2414 s on this 4-CPU machine). `tests/repo-hygiene.test.ts`, `tests/bundle-budget.test.ts` and `tests/budget.test.ts` were run again with the report and fragment in place: 33 of 33 pass.

Selected but not run here:
- The 43 browser journeys. PR CI runs its smoke set. Pages runs the 37 that are not held after the merge. The six held teaching-tool journeys (`TEACHER_TOOLS = false` in `src/ui/held.ts`) run once on a teaching-tools build in work-order item 6 (GK1 decision 7).
- Heavy (33 files) and the six-DOF fleet (6 files). They take hours on this machine, and no file under `tests/heavy/` or `tests/sixdof-fleet/` reads `budgets.json` or the bundle-budget script. Work-order item 6 runs the D-64 check of heavy and fleet on the frozen candidate, which is main after this PR.
