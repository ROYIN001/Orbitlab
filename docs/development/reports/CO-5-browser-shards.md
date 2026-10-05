# CO-5 (T part) — a third Pages browser shard

```yaml
envelope: v2
package: CO-5
step: 0 (T lane: shard balance, allowed by CO-5 "scripts/verification/* if shards need rebalancing")
family: CO
wave: K0
lane: T
items: [M-LAUNCH-020 (prerequisite)]
change_kind: quality-improving   # CI topology only; no app code, no journey or assertion changed
execution_authorized: true
owner_authorization: {date: 2026-10-05, quote: "D-65 (ก): wave K0 authorized", scope: "wave K0 (answer sheet A-1)"}
base_sha_verified_on: {sha: 5f9aa2e, date: 2026-10-05}
report: docs/development/reports/CO-5-browser-shards.md
```

## Why

Pages runs every browser journey in two shards. Each shard is a job with a 30-minute limit (`deploy.yml` `browser: timeout-minutes: 30`). On Pages run [37230585947](https://github.com/ROYIN001/Orbitlab/actions/runs/37230585947) (`09cc2f5`), shard 1 took 18m47s (12 journeys, 1126.3 s) and shard 2 took 23m23s (12 journeys, 1401.7 s).

The G2 matrix journey of CO-3 (#90, `r2-viewport-matrix`) adds about 417 s on a 4-core machine, and up to about 835 s at CI speed. An independent review of #90 projected the shard it lands in at 29.6–36.5 min with two shards. A Pages failure blocks publishing, and the first full run would be the one after merge, since PR CI runs smoke journeys only. So #90 must not merge before the browser work is split further.

## What changes

- `scripts/verification/create-plan.mjs`: the Pages plan creates three browser gates (`browser-1of3…3of3`). PR CI keeps two smoke gates.
- `.github/workflows/deploy.yml`: the Pages `browser` matrix is `[1, 2, 3]` and runs `browser-${shard}of3`. The timeout is unchanged at 30 min.
- `tests/verification/workflow-paths.test.mjs`: a new test checks that each workflow runs exactly the browser shards its plan creates (CI: 2 smoke; Pages: 3). It passes, and fails when the Pages matrix is set back to `[1, 2]` (checked by hand, not committed).
- `docs/development/VERIFICATION.md`: "two full browser shards" becomes three.

Journeys are assigned as before (`tests/browser/shard.mjs`, index modulo the shard count over the sorted names). No journey, assertion or timeout changes, and every journey still runs exactly once per Pages run; the union and aggregate checks are unchanged and take the gate list from the plan.

## Projected shard times (from the measured per-journey times in Pages 37230585947)

| | Shard 1 | Shard 2 | Shard 3 |
|---|---|---|---|
| Now, 24 journeys in 3 shards | ~17.7 min | ~13.9 min | ~10.5 min |
| With #90's matrix journey at a CI-worst 835 s | ~16.3 min | ~18.4 min | ~21.3 min |

The six journeys whose individual times were not in the log are counted at their shard's average. These figures are a projection, not a measurement; the first Pages run after merge measures them. Even before #90, the longest Pages browser job drops from 23.4 min to about 18 min. It uses one more runner per Pages run, which adds no runner minutes for the same journeys.

## Tests actually run

- `node --test tests/verification/*.test.mjs tests/browser/shard.test.mjs`: 60/60 (59 before plus the new test).
- The new test with the Pages matrix sabotaged back to `[1, 2]`: fails as expected.
- `node scripts/verification/create-plan.mjs pages` on this branch: 9 gates; browser `1/3, 2/3, 3/3`; 24 journeys; 10,139 unit cases (collection 86.3 s).

## Limits and handoff

- The real shard times are recorded on the first Pages run after merge (run id goes into this report and PROGRESS).
- Merge order: this PR before #90.
- The CO-5 smoke slice (R2 journey in PR CI, with sabotage runs) is the next CO-5 step, after CO-3.
