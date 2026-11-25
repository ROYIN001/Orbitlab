# FX-4 step 1 — the lifetime job honours a Stop / งานคำนวณอายุวงโคจรหยุดได้จริงเมื่อกดหยุด

Package FX-4 of the master plan v2.0 (S10 §10.7), step 1 only: the lifetime job's part of M-ORBIT-005 (a stopped run must not resolve a cut-off result) and of M-PLATFORM-035 (a Stop given before the job listens). Both items stay **partial**. The shared runner, `serveJob`, the fake-Worker kit and the other job wrappers are later steps.

**Status (2026-11-25, the records PR after #234 and #233):** merged (PR #233, `3dd334c7`, 2026-11-25T13:11:12Z, CI 45582570542 on the final head `5cc0d43`, 12 of 12 jobs, under the standing bug-fix approval); published (Pages 45621018552 at `3dd334c7`, 2026-11-25T13:36:42Z; every job passed, 13 of 13; unit 10,899 of 10,899). / สถานะ: merge แล้วและเผยแพร่แล้ว

```yaml
envelope: v2
package: FX-4
step: 1
family: FX
wave: K2
lane: P            # FX-4 is T+P; P writes its src/physics/** part (S10:309); all of this step's source is in P's write set (S18:69)
items: [M-ORBIT-005, M-PLATFORM-035]   # both in part
change_kind: bug-fix
or_ids: [OR-2]
execution_authorized: true
owner_authorization:
  - {date: 2026-10-28, quote: "รับรองและอนุญาต K2", scope: "D-65 K2 (chat, 02:54:22Z)"}
  - {date: 2026-11-25, quote: "FX-4 ปุ่ม Stop และผลที่ถูกตัด", scope: "this package now (chat form, answered just before 07:22:19Z)"}
base_sha_verified_on: {sha: 844319e, date: 2026-11-25, recheck: "runLifetimeJob makes a worker for an aborted signal; its inline path resolves propagate()'s result after a Stop — present"}
allowed_write_paths: [src/physics/lifetime-job.ts, tests/lifetime-job.test.ts, changes/claude-p-fx4-s1.md, docs/development/reports/FX-4-s1-lifetime-stop.md]
borrowed_paths: none
hook_requests: none
oracle: []
failing_before_fix: [unit "a Stop before the run begins › rejects with an AbortError and makes no worker", unit "… › rejects where no module worker can be made, without running a step", unit "a Stop part-way where no module worker can be made › rejects with an AbortError, not the orbit as far as the run got"]
perf_evidence: none
rollback: {method: revert, data_compat: "nothing stored or handed on changes", verified_by: tests/lifetime-job.test.ts}
reviewers: [second-agent, owner]
report: docs/development/reports/FX-4-s1-lifetime-stop.md
```

## The defect, on `844319e`

`runLifetimeJob` (`src/physics/lifetime-job.ts`) had two holes:

1. **A Stop before the job listens is never heard.** The job made a worker and then added its `abort` listener. For a signal that had already aborted, the listener never fires, so the run went to its end and resolved. The case a user can reach: pressing Cancel in the lifetime window while the first measured-activity run imports its solar history (`src/ui/lifetime.ts:273-282`), after which a second Cancel does nothing.
2. **Where no module worker can be made, a stopped run resolved its cut-off orbit.** On the inline path `onProgress` returns `false` once the signal aborts, `propagate` breaks out of its loop (`src/physics/propagator/propagate.ts:189-191`, `:285-287`), and the job resolved that partial result as the answer. Its readers take it as final: the lifetime window (`src/ui/lifetime.ts:294`, verdict at `:327-329`), the satellite bench (`src/ui/build/satellite-bench.ts:556-557`) and a design lesson's key (`src/ui/lessons/design-key.ts:17`). On this path `propagate` runs in one task, so the Stop a user can give lands before the run's timer fires, or the signal was already aborted: the run then stopped at its first progress tick and resolved that, which reads "Still in orbit after <that time>" (`life.stays`), about 5 days of a year's run. The test that aborts at 20 % (16 samples, about 75 of 365 days) stands for any stop part-way.

## The fix

Inside `runLifetimeJob` only:

- `if (signal.aborted) { cancelled(); return; }` before any worker is made;
- on the inline path, `if (signal.aborted) cancelled(); else resolve(result);` after `propagate` returns;
- the worker path's stop uses the same `cancelled()` (unchanged behaviour).

No UI file changes: all three readers already show "cancelled" or "stopped" for an AbortError (`src/ui/lifetime.ts:295-298`; `src/ui/build/satellite-bench.ts:525`, `:558-560`; `src/ui/lessons/lesson-mode.ts:482-485`). No i18n key, stored format, hand-off or worker file changes.

## Tests

Test-first. `tests/lifetime-job.test.ts` (new, 5 tests; Node has no `Worker`, so a test stubs one: a constructor that throws stands for a browser without module workers, and `FakeWorker` for a worker the test answers itself):

| Test | On `844319e` | With the fix |
|---|---|---|
| a Stop before the run begins › rejects with an AbortError and makes no worker | fails (a worker is made and the job resolves) | passes |
| … › rejects where no module worker can be made, without running a step | fails (resolves a cut-off result) | passes |
| a Stop part-way where no module worker can be made › rejects, not the orbit as far as the run got | fails (resolves 16 samples, about 75 of 365 days) | passes |
| runs that are not stopped › inline: the propagator's own answer, its progress rising | passes | passes |
| … › in a worker: the request sent, progress passed on, the answer, a failure and a Stop | passes | passes |

Sabotage: without the pre-abort guard the first two tests fail; with `resolve(result)` unconditional the third fails; rejecting with a plain `Error` named AbortError instead of the `DOMException` the readers test for fails four.

Also run: `npm run -s typecheck` (exit 0); `npx vite build` and `node scripts/bundle-budget.mjs` (exit 0). The full unit suite, the browser journeys, heavy and the six-DOF fleet run in CI; their run ids are in the PR.

## Budget

Measured by building `844319e` with and without the fix:

| Group | Before | After | Ceiling | Headroom after |
|---|---|---|---|---|
| `index-*.js` | 2,669,324 B | 2,669,385 B | 2,669,500 B | 115 B |
| `precache code` | 15,196,912 B | 15,196,973 B | 15,197,000 B | 27 B |

`lifetime.worker-*.js` is byte-identical (it imports only types from `lifetime-job.ts`) and no other file changes size; lazy chunks change only in the hashed names they import. The totals that contain the entry chunk grow by the same 61 B: `precache` (16,316,113 → 16,316,174 B of 16,596,000 B) and the report-only initial load. No ceiling is raised.

## What this step does not do

- `src/orbit/reentry-job.ts` has the same cut-off result on its inline path (`:58-63`); its only caller drops that answer (`src/ui/orbit/sky-panel.ts`), so users do not see it. Its fix goes with the runner step: added here it measured +122 B, 34 B over the precache-code ceiling.
- The pre-abort check is still missing in reentry, screening and the ratings worker path (S10:318).
- On the inline path `propagate` still runs in one task, so a Stop click is only handled after the run ends. This step makes the answer honest; it does not make the inline run stoppable mid-way.

## Corrections for the later steps

S10:318 (and the session's status audit of 2026-11-24, shared in chat and not in the repo) says the altitude and trade jobs also return cut-off results. On `844319e` they do not: `lifetimeAt` throws an AbortError when stopped (`src/orbit/lifetime-altitude.ts:118-123`) and `tradeTable` does too (`src/design/requirement-trades.ts:342`), and their stop tests pass (`tests/d07-lifetime-altitude.test.ts:133-140`, `tests/d07-trades.test.ts:365-377`). Of the 12 `new Worker(` sites, the cut-off-result bug is in two jobs (lifetime and reentry).

## Review

Second agent (an independent review, 2026-11-25): **confirmed 8 of 8**, no blocking finding. It re-ran the failing-before tests on `844319e`, the passing tests and the sabotages on the head, the typecheck and both builds, and probed the races (a Stop between the check and the worker, after the result, before the inline timer): none. Its three minor findings are fixed in this PR: the Stop assertions now require a `DOMException`, as the readers do (a plain `Error` named AbortError passed all five tests and now fails four); the budget note above names the totals that grow; and the defect above names the stop a user can reach on the inline path.
