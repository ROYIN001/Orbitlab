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
  The bisection order is unchanged (the default 8 s budget of
  `computedRatings` still serves its other callers; the validation scripts
  already pass `Infinity`).
- **The 40-flight limit cannot bind in practice.** Each rating is a
  bisection to 0.5 % of the ceiling, at most about 9 flights per orbit, so at
  most about 18 in all (the reviewer measured at most 18 across the 21
  catalogue vehicles). The "not finished" path is therefore defensive: it
  covers a stop that should not happen (and the time-budget variant, which
  the Build search no longer uses), so no rating that did not converge can
  ever be stored or shown as one.
- **Fallback without a module worker (review should-fix 1).** The search used
  to run there in one synchronous call; with no time budget that blocks the
  page for the whole search (reviewer's measurement: up to 18 flights / 8.9 s
  on the review machine across the 21 catalogue vehicles; likely 30–45 s on a
  slow tablet) and Stop could not be pressed. `src/design/ratings.ts` now
  offers `ratingsSearch`, the same search as a generator that pauses after
  every probe flight (same flights, same order, same result; `computedRatings`
  runs it to the end). The fallback in `ratings-job.ts` steps it one flight
  per `setTimeout(0)`, so the progress line is drawn and Stop cancels between
  flights. Each flight still blocks for its own 7–95 ms (`probeInsertion`).
  No file under `src/physics/**` changed.
- **Unconverged is not a rating.** Pure helpers in `src/ui/build/ratings-job.ts`:
  `unfinishedRatings(res)` (null when both ratings converged, else `stoppedBy`,
  flights, and the payloads delivered so far), `ratingsRecord(signature, res)`
  (null for an unfinished search) and `unfinishedRatingsText(u)`. The Explore
  level stores `draft.ratings` only from `ratingsRecord`; the review panel calls
  `host.rated` only when the search finished. An unfinished search shows
  "Not finished: the search stopped at its limit of N test flights. To low
  orbit: X kg (found). To geostationary transfer orbit: at least Y kg, not
  found exactly / not found. Neither is kept as a rating." (EN/TH/RU; a
  time-limit variant for completeness). A converged rating is said as found,
  an unconverged one with a delivered payload as "at least", one with none as
  "not found". Both ratings or neither: a converged LEO beside a stopped GTO
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

- `tests/build-ratings-unfinished.test.ts` 5/5 after review (adds: a
  converged rating beside an unconverged one is said as found; without a
  worker, Stop after the first flight rejects with `AbortError` and no further
  flight is flown; the two-search test has a 60 s timeout). With
  `tests/design-ratings.test.ts`, `tests/i18n.test.ts` and
  `tests/repo-hygiene.test.ts`: 4 files, 38 tests passed.
- `tests/design-ratings.test.ts`, `build-screen`, `explore`,
  `design-explore-model`, `design-review-model`, `design-explore-drafts`:
  63/63 (two long tests timed out once under parallel CPU load and passed on
  rerun alone, unchanged files).
- `npm run typecheck`: clean.
- `node --test tests/verification/*.test.mjs tests/browser/shard.test.mjs`: 64/64.
- Browser journeys and builds not run (CPU reserved); the M-BUILD-024 journey
  step that checks the stored value after Stop stays with that item.

## Left open

- **KPI-14 for M-BUILD-006 is partial after this PR:** ratings stored before
  it carry no `converged` flag, so a stored 0 or lower bound cannot be told
  apart (plan v2.0 S10, stored-data item 4). The "computed by an earlier version,
  recompute" label is a follow-up that needs the owner's sign-off and
  possibly a reader-first PR (schema rule 9).
