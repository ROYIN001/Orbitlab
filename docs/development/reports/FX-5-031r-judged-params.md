# FX-5 M-LAUNCH-031 residual: the verdict's numbers, unrounded / ผลภารกิจตัดสินจากค่าที่ไม่ปัดเศษ

> **สรุปสำหรับเจ้าของ (ภาษาไทย)**
>
> - **ปัญหา:** ตารางผลภารกิจตัดสินว่าแถวไหน "นอกเกณฑ์" จากค่าในเหตุการณ์ปิดภารกิจ ซึ่งถูกปัดเศษ (1 กม., 0.01°, 0.1°)
>   - เมื่อผล "ไม่ถึงเป้า" แต่ค่าที่ปัดแล้วกลับเข้าเกณฑ์ ตารางจะไปใช้วงโคจร ณ เวลาที่เลื่อนดู ซึ่งอาจเลื่อนไปแล้ว
>   - ผลคือติดธงผิดแถว ตัวอย่าง: ตัดสินที่ความเอียง 51.904° (เกินเกณฑ์ 0.3°) แต่ตารางติดธงที่ perigee/apogee แทน
> - **แก้:** เหตุการณ์ปิดภารกิจบันทึกค่าที่ใช้ตัดสินแบบไม่ปัดเศษเพิ่ม 4 ค่า และตารางตัดสินจากค่าเหล่านั้น
>   - ได้ผลตรงกับฟิสิกส์ทุกบิต
>   - บันทึกเก่าใช้วิธีเดิม
> - **ไม่เปลี่ยนการบิน:** harness EO-PHY-6, fingerprint ของ D01 และ golden ของ six-DOF ผ่านทั้งหมดโดยไม่แก้
> - **ไม่ได้แก้ assertion เดิม** และไม่ได้เพิ่มเพดานขนาด (index +0.2 kB, precache code +1.7 kB)
> - **ตรวจแล้ว:** มี second-agent physics review ผลคือ approve
> - **การ merge:** เข้าเกณฑ์อนุมัติถาวรสำหรับการแก้บั๊ก

```yaml
envelope: v2
package: FX-5
step: M-LAUNCH-031 residual
wave: K1
lane: P
items: [M-LAUNCH-031]
priority: P1
change_kind: bug-fix
execution_authorized: true
owner_authorization: {date: 2026-10-09, quote: "q08 option A: ทำใน K1 หลัง harness M-PHYSICS-002 merge", scope: "M-LAUNCH-031 residual, lane P, after #148"}
base_sha_verified_on: {sha: 74b540f, date: 2026-10-09}
oracle: [EO-PHY-6, EO-PHY-1, EO-PHY-2]
failing_before_fix: [4 tests on 74b540f (commit ffe29d9)]
reviewers: [second-agent (physics)]
report: docs/development/reports/FX-5-031r-judged-params.md
```

## What was wrong

`assessMissionResult` (`src/ui/result-content.ts`) re-judges which rows of an off-target verdict are outside the band. It reads the completion event's params for this, and they were rounded: `ap`/`pe` to 1 km, `inc` to 0.01°, `raan` to 0.1°. Sometimes the rounded numbers fall back inside the band. In that case the rows took the flags of the **displayed** (cursor) orbit (#117 review fallback), and that orbit may have drifted far from the judged one. HANDOVER-K1 §9 names the lasting fix: put unrounded values on the completion event.

**Failing case** (the new test): the verdict was judged at inclination 51.904°. That is 0.304° off a 51.6° target, and the band is 0.3°. The event records `inc: 51.9`. The cursor, later, shows 370 × 445 km with the inclination on target. On `74b540f` the table flagged `[perigee, apogee]`, two rows the verdict never judged, and left inclination unflagged.

## What changed

- **`src/physics/sim/burns.ts`**, `reachTargetOrbit`. `evt.targetOrbit` and `evt.offTargetOrbit` gain four params: `apJudgedM`, `peJudgedM`, `incJudgedRad` and `raanJudgedRad`. They hold the exact `el` that `orbitResiduals` judged; in six-DOF that `el` carries the physical apsides. They are recorded only: nothing in flight reads them. `apAltM` and `peAltM` keep their meaning ("physical apsides", basis `physical`) and their condition.
- **`src/physics/sim/ascent.ts`**, `finishSuborbital`. The suborbital pair gains the same four params.
- **`src/ui/result-content.ts`**. The judged values and flags come from the exact params when they are present. On the orbit path the re-judgement is bit-identical to the simulation's: same function, same inputs, `checkRaan = true`. The rounded fallback is kept only for older records, which lack these params. A record that has them never falls back. An exact off-target record that misses nothing was vetoed (a burn the simulation could not finish), and it now flags no row on purpose.

Source change: 3 files, +17/−6 lines.

## Tests

The tests came first, in commit `ffe29d9`, and 4 of them failed on `74b540f`:

- `tests/fx5-031-judged-params.test.ts`:
  - **Orbit** (Falcon 9 `leo/50`, point-mass): the four values are present. They round to the printed ones. `orbitResiduals` on them gives the recorded verdict. There is no `apAltM`.
  - **Suborbital** (Mercury-Redstone 3): `incJudgedRad` and `raanJudgedRad` are present. `apJudgedM`/`peJudgedM` equal `apAltM`/`peAltM`.
- `tests/mission-result-view.test.ts`, 2 new tests:
  - the 51.904° case flags only `inclination`, and the basis stays `osculating`;
  - the vetoed case flags nothing.

No existing assertion was changed.

After the fix these suites pass with Node 22.23.3, 13 files and 155/155 tests:
- the new tests;
- `mission-result`, `mission-result-view`, `report`, `explore`, `lesson-event-answers`, `watch-logic`, `vostok-viewer`;
- **EO-PHY-6** (18/18);
- **EO-PHY-1** (`d01-fleet-fingerprint`, 27 flights);
- `rigid-flex-golden`.

Heavy, run locally: `tests/heavy/sixdof-fingerprint.test.ts` and `tests/heavy/flex-golden.test.ts`. The results are in "Checks" below. `npx tsc --noEmit` is clean.

**Why no trajectory can change.** The change adds keys to an event's params object, and only after the verdict has been made. The fingerprints hash events as `[key, t]`. EO-PHY-6 hashes Apollo's params from TLI on, and the only verdict event in that flight (the parking orbit) comes before TLI.

## Who else sees the new params

The second agent grepped every reader of these params:

- **Unchanged:** `phase.ts:252` and `watch-logic.ts:903` read only `apAltM`/`peAltM`/`ap`/`pe`/`inc`. The i18n templates use only `{pe} {ap} {inc} {raan} {period}`. `withholdEventParams` hides only `period`.
- **Visible, cosmetic:** the events CSV (`src/ui/csv.ts:200`) and the MCP export (`mcp.ts:668`) write all params, so these exports now show the four keys too, as they already show `apAltM`.

## Size

Built with `npx vite build`, measured with `node scripts/bundle-budget.mjs`, against main `74b540f` built the same way:

| Group | Change |
|---|---|
| `index-*.js` | +0.2 kB |
| each worker | +0.1 to +0.4 kB |
| precache code | +1.7 kB (14700.5 of 14724) |

Every group is ok, and no ceiling is raised. CSS and i18n are unchanged.

## Second-agent review (physics)

Verdict: **approve with nits**, nothing blocking. It confirmed four things:
- Flight behaviour is unchanged.
- The orbit-path re-judgement is bit-identical.
- Six-DOF `el.i`/`el.raan` are the conic values the verdict used, since only the apsides are replaced.
- No fingerprint changes.

Its nits:

1. **Taken:** the vetoed case is now explained in a code comment, so no one "fixes" it back.
2. **Left (already there before this change, not made worse):** the suborbital verdict judges with `checkRaan = raanWasReachable()`, while the result table uses `true`. When a target's node could not be reached, the table can flag a RAAN row the verdict did not judge. Before this change the table had the same behaviour from the cursor's RAAN. `finishSuborbital` also goes against `mission.ts:830` ("final acceptance passes checkRaan=true even off-window"). **Follow-up for lane P:** a separate ticket.
3. **Left:** a hyperbolic orbit's `apoapsisAlt` is `Infinity`, which `num()` rejects (JSON would save it as `null` anyway). Such a record falls back as before. This has little value: `reachTargetOrbit`'s callers need e < 1.

## Checks

- The 13 unit files named above: 155/155 (Node 22.23.3).
- Heavy, run locally (no CI dispatch; the owner approves machine time): `tests/heavy/sixdof-fingerprint.test.ts` and `tests/heavy/flex-golden.test.ts`, 25/25 in 315 s. These are the six-DOF fingerprints and flex goldens of EO-PHY-2, unchanged.
- `npx tsc --noEmit -p .`: clean.
- `npm run budget` on a fresh build: every group ok.
- The full unit suite, the remaining heavy files and the six-DOF fleet: CI runs the unit suite. The change-map rule `physics-shared` also selects all heavy and fleet files; I have not dispatched those runs, because the owner approves machine time. The only physics change adds event params, and the local EO-PHY-1, EO-PHY-2 and EO-PHY-6 runs show every trajectory is unchanged.
