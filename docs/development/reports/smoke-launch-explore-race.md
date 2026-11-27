# Smoke race in launch-explore: the Orbit step pressed under Explore's end card

The smoke journey `tests/browser/journeys/launch-explore.mjs` failed in CI on a pull request whose diff could not reach it, and passes locally. This report gives the cause, a reproduction that fails every time, and the fix. Tests only; no app code.

```yaml
change_kind: bug-fix (tests)
lane: T
items: []            # CI flake, no plan item
failing_before_fix: [a scratch copy of the journey with a 4 s wait before its Orbit-step click, 1 of 1 on main d7abc2a0's app]
allowed_write_paths: [tests/browser/journeys/launch-explore.mjs, docs/development/reports/smoke-launch-explore-race.md, changes/claude-pf-10-repo-questions-ocp0qu.md]
app_code: none
rollback: {method: revert, data_compat: "no app, manifest or stored-data change"}
```

Authorization: the owner, in chat on 2026-11-27, asked how to unblock pull request #254 and given three options, chose "แก้เทสต์ก่อน (แนะนำ)" (fix the test first, in a small pull request of its own); asked who merges that pull request, chose "คุณเป็นคนสั่ง merge" (the owner orders the merge).

## The failure, on CI

CI run 46010555149 (PR #254, head `e0328fb9`), job `browser-smoke (3)`, journey `launch-explore`, 2026-11-27T13:56:17Z:

```
FAIL: threw: locator.click: Timeout 30000ms exceeded.
  - waiting for locator('#mission-steps [data-step="orbit"] button')
    - locator resolved to <button type="button">Orbit</button>
  - attempting click action
      - element is visible, enabled and stable
      - <h2 id="explore-debrief-title">Falcon 9 Block 5 · Crewed spacecraft</h2> from <div id="explore-debrief">…</div> subtree intercepts pointer events
    at Module.launchExplore (tests/browser/journeys/launch-explore.mjs:91:21)
```

That head differs from `d90a37a4`, which passed all 12 jobs of run 46007207863, by one line of a change fragment. The pull request adds a module under `src/astro` that nothing in the app imports.

## Root cause

Explore shows a card at the end of a flight (`src/ui/explore-debrief.ts`). It opens `SETTLE_MS` = 2,500 ms after the flight's outcome is first seen, while the displayed instant is the live head and Explore is on screen. Its host `#explore-debrief` fills the viewport above the picture (`src/ui/modes.css`, `inset: 0; z-index: 4`), and the card lies over the mission's steps.

The journey flies to orbit, exports the flight as CSV, and then clicked the mission's Orbit step. Nothing in it knew of the card. So the click worked only when it arrived before the card:

- The journey learns of the orbit from a poll every 2 s, so it is up to 2 s behind the app's first sight of the outcome.
- In the failed run it logged the orbit at 13:55:45.70 and the export at 13:55:47.08, and the click, which timed out at 13:56:17.25, began 30 s before that: about 1.5 s after the journey read the orbit, which is 1.5 to 3.5 s after the app saw it. The card opens at 2.5 s.

Once the card is up it stays, so Playwright retried the click for its whole 30 s. The app behaved as designed. The race was in the test, which treated the step as reachable at any time after the orbit.

Two other journeys press a mission step after a flight and cannot meet this: `r3-result-setting` runs at the Engineer level, where the card is never offered, and `r7-cross-system` presses the step from a replay cursor, where the displayed instant is not the live head.

## Reproduction (failing first)

Two scratch copies of the journey as it is on main, run against one build of main `d7abc2a0`'s app, differing only in a wait placed before the Orbit-step click (and a log line that reads `#explore-debrief`'s `hidden`):

| Wait before the click | Card hidden at the click | Result |
|---|---|---|
| 0 ms | true | the click works; the journey passes |
| 4,000 ms | false | `locator.click` times out with `explore-debrief-title … subtree intercepts pointer events`, CI's message |

One run each. The second is the failing-first evidence: the same journey, made to arrive after the card as a slow runner makes it.

## The fix

Before the Orbit step, the journey now waits for the end card (up to 30 s) and puts it aside with the card's own "Keep watching", then checks that the card has given way to its tab. The tab sits at the top centre of the picture, clear of the steps. The Orbit step is then pressed as before, and everything after it is unchanged.

Two checks are added ("the flight in orbit never showed its end card", "Keep watching did not put the end card aside"). No existing check is changed or removed and no existing timeout is lengthened. The journey no longer depends on which comes first: it always goes by way of the card.

## After the fix

| Run | Card when the journey reaches it | Result |
|---|---|---|
| `node tests/browser/run.mjs launch-explore`, as committed | not yet shown (the journey waits for it) | passes, 76.0 s |
| a scratch copy with a 4 s wait before the new lines | already shown (`hidden` false) | passes |

Local runs are on this machine's software WebGL, Node 22.23.5; CI is the evidence.

## Rule 2: twenty runs on CI

A changed journey runs 20 times on CI before merge (HANDOVER-K2 §1, the five rules). A temporary commit on this branch makes CI's five smoke shards run only `launch-explore`, four times each; it is reverted before merge and the result is recorded in the pull request.

## Not checked

Whether the end card could fail to appear at all in this journey on a runner slower than any seen: the new wait is 30 s against the card's 2.5 s. The heavy and fleet suites (not selected). Other journeys were read for the same pattern, not run.
