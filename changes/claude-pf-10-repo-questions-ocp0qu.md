## CHANGELOG

- Tests (bug fix): the smoke journey `launch-explore` waits for Explore's end-of-flight card and puts it aside before it presses the mission's Orbit step; the press used to race the card and timed out when the card came first.

## PROGRESS

| launch-explore smoke race (tests, lane T, no plan item) | Merged, waiting for publish ([PR #255](https://github.com/ROYIN001/Orbitlab/pull/255), CI run 46016143301 on `012f1d5e`, the rule-2 run: `launch-explore` 20 of 20, its shards red by design because the temporary commit departs from the plan) | The journey's Orbit-step click raced Explore's end card, which opens 2.5 s after the outcome and covers the steps (CI run 46010555149, `browser-smoke (3)`). Reproduced with a 4 s wait before the click (fails with CI's message), fixed by waiting for the card and using its "Keep watching"; both orders pass locally, and 20 of 20 on CI. Two checks added, none changed; no app code | [report](reports/smoke-launch-explore-race.md) |
