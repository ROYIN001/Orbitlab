## CHANGELOG

- Tests (bug fix): the smoke journey `launch-explore` waits for Explore's end-of-flight card and puts it aside before it presses the mission's Orbit step; the press used to race the card and timed out when the card came first.
- Records: the owner's answers of 2026-11-27 in DECISIONS (the S20 track taken over, PF-11's round-trip bounds, the launch-explore fix); HANDOVER-S20 brought up to date after PF-10 and PF-11.

## PROGRESS

| launch-explore smoke race (tests, lane T, no plan item) | Merged, waiting for publish ([PR #255](https://github.com/ROYIN001/Orbitlab/pull/255), CI run 46016143301 on `012f1d5e`, the rule-2 run: `launch-explore` 20 of 20, its shards red by design because the temporary commit departs from the plan) | The journey's Orbit-step click raced Explore's end card, which opens 2.5 s after the outcome and covers the steps (CI run 46010555149, `browser-smoke (3)`). Reproduced with a 4 s wait before the click (fails with CI's message), fixed by waiting for the card and using its "Keep watching"; both orders pass locally, and 20 of 20 on CI. Two checks added, none changed; no app code | [report](reports/smoke-launch-explore-race.md) |
| Records of 2026-11-27 (S20 track, Markdown only) | Merged, waiting for publish (PR #N) | DECISIONS gains "Decided 2026-11-27": the owner's eleven chat answers of the day, verbatim, with where each lands. HANDOVER-S20: PF-10 (#254) and PF-11 (#256) done, the first work plan complete; five rules and four traps learned from them; what the two packages cost. Repository hygiene 9 of 9; the relative links of the two files resolve | [HANDOVER-S20](../docs/development/HANDOVER-S20.md) |
