## CHANGELOG

- Tests (debris replay): the Falcon Heavy case of `tests/debris-replay.test.ts`, which flies the whole mission to T+1320 s, gets an explicit 30 s timeout, as the repo's other whole-flight unit tests have. It takes about 2 s on its own but ran past the default 5 s on CI's loaded `test (1)` shard, which turned main's scheduled Pages runs red on 2026-11-01, 11-02 and 11-03 (41351606271, 41549816410, 41731265523) and stopped the daily refresh from publishing. No assertion, app or budget change.

## PROGRESS

| Test timeout (debris replay, Falcon Heavy case; lane T; bug fix, not a plan package) | Merged, waiting for publish (PR #…, CI run …) | `tests/debris-replay.test.ts`'s Falcon Heavy case timed out at vitest's default 5000 ms in `test (1)` of every scheduled Pages run on main `0fa25ad` since 2026-11-01 (41351606271, 41549816410, 41731265523) and in CI 41887336923 on PR #203. Alone it takes 2.0–2.3 s (local). It now has `30_000`, the value `tests/ascent.test.ts` and `tests/activity.test.ts` use for whole-flight cases. No assertion changed. | — |
