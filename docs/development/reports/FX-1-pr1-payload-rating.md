# FX-1 PR1 — an unfinished payload-rating search is not a rating (M-BUILD-006, D-67 (ก))

## Envelope

| Field | Value |
|---|---|
| Package | FX-1, PR1 (wave K1, lane B) |
| Item | M-BUILD-006 (P1; RW:B-03) |
| change_kind | bug-fix (false result shown and stored) |
| owner_authorization | 2026-10-05 (D-65 K1): "เมื่อทำการ merge แล้วตรวจสอบว่าทุกอย่างเรียบร้อยแล้วในระยะ K0 ให้เริ่มทำระยะ K1 ในเซสชั่นใหม่ต่อได้เลยครับ ใช้ model opus5.5 high" |
| Decision | DEC:D-67 (docs/DECISIONS.md): "An unconverged Build rating is bounded by flight count (the existing 40 flights). — (ก) จำกัดด้วยจำนวนเที่ยวบิน (40 เที่ยว ที่มีอยู่แล้ว)" |
| Review | P1 next to physics ratings: second-agent review required (D-25 reviewer) |
| Base | `272a3b9` (origin/main) |
| Branch | `claude/b-fx1-s1` |
| Status | In PR; not merged; not published |

## The defect (confirmed on the base)

`computedRatings` (`src/design/ratings.ts:230-284`) stops on an 8,000 ms
wall-clock budget or 40 probe flights and then returns `converged: false` with
`stoppedBy`; `kg` is then the bracket's lower end, or 0 when the budget ran out
before the empty stack flew. Nothing in `src/ui` read `converged`/`stoppedBy`:
`explore-level.ts:705` stored `res.payloadLEO.kg`/`payloadGTO.kg` as
`draft.ratings`, and `review-panel.ts:406` passed them to `host.rated()`. On a
slow device a design got 0 kg or a lower bound as its rating, and Launch said
it could not fly.

## The fix

- **D-67 (ก), the bound.** The Build search (worker, and the main-thread
  fallback when no module worker exists) runs with
  `BUILD_RATING_OPTIONS = { timeBudgetMs: Infinity, maxFlights: 40 }`
  (`src/ui/build/ratings-budget.ts`). The result no longer depends on device
  speed; a slow device waits longer with the existing progress line and Stop.
  The bisection order and `src/design/ratings.ts` are unchanged (its default
  budget still serves the validation scripts, which already pass `Infinity`).
- **Unconverged is not a rating.** Pure helpers in `src/ui/build/ratings-job.ts`:
  `unfinishedRatings(res)` (null when both ratings converged, else `stoppedBy`,
  flights, and the payloads delivered so far), `ratingsRecord(signature, res)`
  (null for an unfinished search) and `unfinishedRatingsText(u)`. The Explore
  level stores `draft.ratings` only from `ratingsRecord`; the review panel calls
  `host.rated` only when the search finished. An unfinished search shows
  "Not finished: the search stopped at its limit of N test flights … at least
  X kg … not kept as the ratings" (EN/TH/RU; a time-limit variant for
  completeness). Both ratings or neither: a converged LEO beside a stopped GTO
  is not stored either.
- **Stored format unchanged.** No field added to `RatingsRecord` or any
  persisted record (schema rule 9 not triggered). Not touched: `src/physics/**`.

## Tests

Failing before (commit `2a8f146`, test only, on the base code):

```
× a search stopped by the time budget is not kept, and says what stopped it
× a search stopped by the flight budget is not kept, and says what stopped it
× D-67 (a): the Build search has no wall-time budget, and a converged result is kept unchanged
TypeError: ratingsRecord is not a function
TypeError: ratingsRecord is not a function
AssertionError: expected [ false, false ] to deeply equal [ true, true ]
Tests  3 failed (3)
```

The third failure is the defect itself: with a clock that reads 20 s later at
every call (a slow device), the base search stops unconverged.

Passing after:

- `tests/build-ratings-unfinished.test.ts` 3/3; with `tests/i18n.test.ts` and
  `tests/repo-hygiene.test.ts`: 3 files, 31 tests passed.
- `tests/design-ratings.test.ts`, `build-screen`, `explore`,
  `design-explore-model`, `design-review-model`, `design-explore-drafts`:
  63/63 (two long tests timed out once under parallel CPU load and passed on
  rerun alone, unchanged files).
- `npm run typecheck`: clean.
- `node --test tests/verification/*.test.mjs tests/browser/shard.test.mjs`: 64/64.
- Browser journeys and builds not run (CPU reserved); the M-BUILD-024 journey
  step that checks the stored value after Stop stays with that item.

## Left open

- Ratings stored before this fix carry no `converged` flag, so a stored 0 or
  lower bound cannot be told apart (plan v2.0 S10, stored-data item 4). Their handling ("computed
  by an earlier version, recompute") needs B's exact bound and the owner's
  sign-off; not in this PR.
- Without a module worker the uncapped-in-time search runs on the main thread
  (at most 40 flights, about 0.3–4 s on a laptop), as before but no longer cut
  at 8 s.
