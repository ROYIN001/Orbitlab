# FX-5 PR2: what the result and the equations panel are based on / ผลภารกิจและแผงสมการบอกที่มาของค่า

```yaml
envelope: v2
package: FX-5 (launch analysis correctness: displayed vs live), PR2
step: 2
wave: K1
lane: U (physics lane reviews)
items: [M-LAUNCH-060 (done), M-LAUNCH-031 UI part (HELD, see below)]
priority: [P2 (060), P1 (031)]
change_kind: bug-fix; tests added first
owner_authorization: {date: 2026-10-05, quote: "เมื่อทำการ merge แล้วตรวจสอบว่าทุกอย่างเรียบร้อยแล้วในระยะ K0 ให้เริ่มทำระยะ K1 ในเซสชั่นใหม่ต่อได้เลยครับ ใช้ model opus5.5 high", scope: "wave K1 (D-65)"}
assertion_approval: {date: 2026-10-06T16:45Z, page: K1 decision page, card: fx5-031-assert, option: a, quote: "อนุญาต: แก้เฉพาะ 3 บรรทัดนี้ ตามสัญญาในแผน", scope: "the three `outside` assertions in 'keeps recorded success separate from subsequent osculating-orbit drift', tests/mission-result.test.ts"}
base_sha_verified_on: {sha: c1aae45, date: 2026-10-06}
files: [src/ui/equations-model.ts, src/i18n/en.ts, src/i18n/th.ts, src/i18n/ru.ts, tests/equations.test.ts]
not_touched: [src/physics, recorder, tests/mission-result.test.ts, src/ui/mission-result.ts, CSS]
held_branch: claude/u-fx5-s2-031-held (local; a78933e tests, 025b44a model)
```

## M-LAUNCH-060: the equations panel's "no air" reason (done)

**What was wrong.** Drag (`equations-model.ts:84` on `origin/main`) and the
aerodynamic angles (`:153`) gave the one reason `eq.none.noAir`, "No air to
act on at this height", whenever the step was not integrated or the airspeed
was at most 1 m/s. So the panel said there was no air on the pad, after a
landing and in a flown frame that carries no equation record.

**What changed.** `airReason(frame, needsRecord)` in
`src/ui/equations-model.ts` picks the reason from the frame's state:

| Frame state | Reason | EN text |
|---|---|---|
| on the pad, calm (`!liftoff` or `prelaunch`, airspeed ≤ 1 m/s) | `eq.none.stillAir` | At rest in the air: no airflow over the vehicle. |
| on the pad, a wind blowing (airspeed > 1 m/s) | `eq.none.prelaunch` (existing) | Before liftoff. |
| landed (`status === 'landed'`) | `eq.none.stillAir` | as above |
| flown frame, no equation record (drag only; α/β read the frame) | `eq.none.noRecord` | This replayed instant carries no equation record. |
| in the air, airspeed ≤ 1 m/s | `eq.none.stillAir` | as above |
| no air (density 0, or a coast step flown without it) | `eq.none.noAir` (unchanged) | No air to act on at this height. |

The pad-wind row was found by the first test run: the six-DOF crosswind
mission has 5+ m/s of wind over the pad, and α/β are (rightly) available
there from the frame, so "still air" would have been false for drag.
Two new keys in TH/EN/RU (`eq.none.stillAir`, `eq.none.noRecord`). The
recorder and the physics are not changed; the equations still read the same
fields.

**Tests** (`tests/equations.test.ts`, `why the panel has no air term
(M-LAUNCH-060)`), one per state, committed first in `1b3c871`:

Before (tests on the code of `origin/main`):

```
× says the air is still on the pad, before liftoff, and that a wind there is not flown yet
× says the air is still after a landing
× says a replayed frame carries no record, not that there is no air
+   "reason": "eq.none.noAir",   (all three)
Tests  3 failed | 1 passed | 11 skipped (15)
```

After:

```
npx vitest run tests/equations.test.ts tests/i18n.test.ts tests/i18n-counts.test.ts tests/repo-hygiene.test.ts
Test Files  4 passed (4)
Tests  50 passed (50)
```


### Second-agent review (2026-10-06) and what changed

The physics-lane review of #113 found two wrong reasons. Tests were written first, and they failed on the reviewed code:

1. **Frames with no record were said to have no record, even in vacuum.** The orbit, escape and rendezvous paths never write `eom`. So a live orbit frame's drag row said there was "no record", where "no air" is correct.
   - Now `noAir` is given when the air is too thin to push: q = ½ρV² below 1 Pa. At 400 km and 7.6 km/s, q is about 1e-4 Pa. The atmosphere model's density is never exactly 0 above the pad, so a threshold is needed.
   - `noRecord` is kept for air that does push, such as an abort through dense air.
   - The text no longer says "replayed", because live frames lack the record too.
2. **A landed six-DOF vehicle in a wind was labelled "still air".** Its airspeed is the scenario wind. Landed frames now go through the same airspeed check as flown frames: they get `stillAir` at 1 m/s or less, and `noRecord` above that.

Wording, as the reviewer suggested:
- EN "At rest relative to the air".
- TH "ยาน" (vehicle) instead of "จรวด" (rocket), because capsules use this panel too.
- The `noRecord` text in all three languages now says that the air moves past the vehicle, but no flight step computed its force.

New tests:
- orbit frame → `noAir`;
- live escape in dense air → `noRecord`;
- landed in a 6 m/s wind → `noRecord`;
- a flown frame at 0.5 m/s in real air → `stillAir`.

precache code is now 14713.3 kB on main `c41bf4a`.

## M-LAUNCH-031: the result row's basis (HELD, not in this branch)

The fix cannot be made inside the approval. Done on the local side branch
`claude/u-fx5-s2-031-held` to find out:

1. Tests first (`a78933e`): a new test that a row's `outside` follows the
   judged set (recorded completion params `peAltM`/`apAltM`/`pe`/`ap`/`inc`/
   `raan`) and carries the judged value and its difference beside the
   osculating one; plus the three approved lines, changed only in `outside`
   (`actual`/`delta` unchanged):

   ```diff
   -    expect(result.metrics[0]).toMatchObject({ actual: 370, delta: -30, outside: true });
   -    expect(result.metrics[1]).toMatchObject({ actual: 445, delta: 45, outside: true });
   -    expect(result.metrics[3].outside).toBe(true);
   +    expect(result.metrics[0]).toMatchObject({ actual: 370, delta: -30, outside: false });
   +    expect(result.metrics[1]).toMatchObject({ actual: 445, delta: 45, outside: false });
   +    expect(result.metrics[3].outside).toBe(false);
   ```

   Before the model change: 2 failed | 15 passed.
2. Model (`025b44a`, `src/ui/result-content.ts`): `outside` from the judged
   set (a target verdict is inside on every row; an off-target one is graded
   by `orbitResiduals` on the recorded numbers, the displayed orbit filling a
   number the event does not carry); new `judged`, `judgedDelta`,
   `judgedTime`, `judgedBasis` ('physical' when the event carries
   `peAltM`/`apAltM`). `actual`/`delta` stay the displayed orbit.
   After it: 1 failed | 16 passed. The failure is the test
   `moves completed-result metrics with the replay cursor without changing the
   recorded outcome or the live orbit`, lines 201, 202, 206 and 207 on that
   branch (`outside: true` beside `outcome: 'target'` judged on 500 × 500 km
   for a 500 km target). Those four assertions lock the same contradiction
   and are not in the approval, so they were not touched and the work stops
   here.

Also outside the allowed files: `outside` is computed in
`src/ui/result-content.ts` (`assessMissionResult`), and the result copy
(`RESULT_COPY`, where "judged at T+x (physical apsides)" would go) lives there
too, not in `src/i18n`. The view part (`src/ui/mission-result.ts`,
`explore-debrief.ts`) is not written. Physics is not touched on either
branch.

## Checks (this branch)

- `npm run typecheck`: clean.
- `node --test tests/verification/*.test.mjs tests/browser/shard.test.mjs`:
  66/66. (In this worktree two `union.test.mjs` tests first failed reading
  `node_modules/vitest/package.json` and `node_modules/playwright/package.json`
  by the worktree's own path, where the install is not; with those two
  packages linked from the main checkout for the run, 66/66.)
- No browser journey shows the equations panel (`grep -rl
  "equations\|eq-reason\|eq.none" tests/browser/journeys`: none), so none was
  run. `r3-result-setting` shows the mission result; it was not run because
  031 is held.
- `git diff --stat origin/main` shows nothing under `src/physics`.

## Budget

`npm run build && node scripts/bundle-budget.mjs`, same machine:

| | precache code | `index-*.js` | `index-*.css` | `i18n-*.js` |
|---|---|---|---|---|
| `c1aae45` (main) | 14709.2 kB | 2624.4 kB | 177.0 kB | 1721.2 kB |
| this branch | 14710.2 kB | 2624.7 kB | 177.0 kB | 1721.9 kB |
| delta | +1.0 kB | +0.3 kB | 0 (no CSS) | +0.7 kB |

Ceilings 14714 / 2632 / 177 / 1725 kB: ok.

## Open questions for the owner

1. M-LAUNCH-031: approve the four further `outside: true` → `false`
   assertions in the replay-cursor test (lines 201, 202, 206, 207 on the held
   branch; `actual`/`delta` unchanged), or rule otherwise.
2. Allow `src/ui/result-content.ts` (the model and its `RESULT_COPY`
   dictionary) in the PR's files, since the flag and the result copy live
   there.
3. M-LAUNCH-060: wording of `eq.none.stillAir` / `eq.none.noRecord` in TH and
   RU to be read by a native reviewer; the pad-wind case reuses
   `eq.none.prelaunch` ("Before liftoff").
