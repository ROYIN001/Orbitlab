# FX-5 PR1: the Compare table follows the replay cursor / ตารางเปรียบเทียบตามเคอร์เซอร์ย้อนดู

```yaml
envelope: v2
package: FX-5 (launch analysis correctness: displayed vs live), PR1
step: 1
wave: K1
lane: U
items: [M-LAUNCH-029]
priority: P2
change_kind: bug-fix; tests added first
owner_authorization: {date: 2026-10-05, quote: "เมื่อทำการ merge แล้วตรวจสอบว่าทุกอย่างเรียบร้อยแล้วในระยะ K0 ให้เริ่มทำระยะ K1 ในเซสชั่นใหม่ต่อได้เลยครับ ใช้ model opus5.5 high", scope: "wave K1 (D-65)"}
base_sha_verified_on: {sha: b2215da, date: 2026-10-06}
files: [src/main.ts (ComparePanel hook only), src/ui/compare.ts, tests/compare-cursor.test.ts]
not_touched: [physics, recorder]
```

## What was wrong

The Compare section's table (U02) has a "This flight" column. Its host
callback in `src/main.ts` returned `this.tel.exportSource()`, which is the
**live** simulation (the telemetry panel keeps it for the CSV export of the
whole flight). Everything else on screen — the HUD, the telemetry charts, the
event log — reads the frame-backed view at the timeline cursor
(`this.simView.sim`, `src/replay/simview.ts`). So after scrubbing back in a
replay, the table still showed the live head: max g, Δv left, the end orbit
and event times of the latest frame, not of the instant on screen.

## What changed

- `src/ui/compare.ts`: `flightOnScreen(live, liveRun, atCursor)` returns the
  live run while live and the frame-backed view otherwise.
- `src/main.ts`, the ComparePanel hook only:
  `current: () => flightOnScreen(this.player.live, this.tel.exportSource(), this.simView?.sim ?? null)`.

In the live run the table reads exactly the same object as before, so its DOM
is unchanged. The table is refreshed at the telemetry panel's 2 Hz cadence,
which runs while paused, so a scrub shows within half a second. "Pin as
reference" and "Save" still take the whole flight (`currentAsReference()`),
unchanged.

## Tests (`tests/compare-cursor.test.ts`)

1. Replay: with the cursor at T+60 s the column shows the figures recorded by
   T+60 s (max g 1.20 g, Δv left 8,940 m/s), after scrubbing to T+120 s it shows
   1.40 g and 8,880 m/s, and never the live head's 2.97 g.
2. Wiring: the ComparePanel hook in `src/main.ts` passes `this.player.live`,
   the live run and the frame-backed view to `flightOnScreen`.
3. Live: the panel's whole DOM with the new wiring equals the DOM with the old
   wiring (always the live run).

Failing before (fix reverted to `origin/main`, `b2215da`):

```
× in replay, the current column is the flight at the cursor, not the live head, and moves with it
× the app hands the panel the flight on screen: live run while live, the frame-backed view otherwise
FAIL … AssertionError: compare.ts exports flightOnScreen: expected undefined to be type of 'function'
FAIL … AssertionError: expected 'new ComparePanel({\n      currentAsRe…' to match /current:\s*\(\)\s*=>\s*flightOnScreen…/
      Tests  2 failed | 1 passed (3)
```

Passing after:

```
✓ … in replay, the current column is the flight at the cursor, not the live head, and moves with it
✓ … the app hands the panel the flight on screen: live run while live, the frame-backed view otherwise
✓ … in the live run, the DOM is exactly what the panel drew before the fix
npx vitest run tests/compare-cursor.test.ts tests/compare.test.ts tests/repo-hygiene.test.ts tests/i18n.test.ts
 Test Files  4 passed (4)
      Tests  79 passed (79)
```

Also: `npm run typecheck` clean; `node --test tests/verification/*.test.mjs
tests/browser/shard.test.mjs` 66/66. No browser journey covers the Compare
panel (`requirements.mjs` matches `.brq-compare`, the requirement trades
table), so none was run.

## Budget

`npm run build && node scripts/bundle-budget.mjs`, same machine, committed
data snapshots:

| | precache code | main chunk `index-*.js` |
|---|---|---|
| `b2215da` (main) | 14703.0 kB | 2,621,571 B |
| this PR | 14703.1 kB | 2,621,656 B |
| delta | +0.1 kB | +85 B |

Ceiling 14704 kB: ok, no raise needed (the 14714 kB K1 allowance of PR #104
is not used).
