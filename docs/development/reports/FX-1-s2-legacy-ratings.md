# FX-1 s2 — ratings kept before FX-1 PR1 are computed again when the design is opened (M-BUILD-006)

## Envelope

| Field | Value |
|---|---|
| Package | FX-1, s2 (wave K1, lane B), stacked on PR #99 (FX-1 PR1) |
| Item | M-BUILD-006 (P1; RW:B-03), stored-data part (plan v2.0 S10, stored-data item 4) |
| change_kind | bug-fix (false stored result shown) + data-safety (record field added beside the design) |
| owner_authorization | K1 decision page, 2026-10-06, card `fx1-legacy-ratings`, option (b), verbatim: "คำนวณใหม่ให้อัตโนมัติเมื่อเปิดแบบจรวด". The page stated the cost: several seconds of extra work when the design opens, and the learner's value changes without the learner asking. |
| Decisions | DEC:D-67 (a) (flight-count bound, via PR #99); DEC:D-75: "A rating-only recompute does not count as a design edit; design identity follows the parts." |
| Review | P1 next to physics ratings: second-agent review required (D-25 reviewer) |
| Base | `7d9dcb6` (`origin/claude/b-fx1-s1`, PR #99, not merged) |
| Branch | `claude/b-fx1-s2` (local; not pushed) |
| Status | Committed locally; no PR; not merged; not published |

## The defect

PR #99 keeps only a finished search, but it marks nothing: a finished rating
is simply what is kept. A rocket design saved before #99 may hold the lower
end of an unfinished search, or 0 kg, in its `VehicleSpec.payloadLEO` /
`payloadGTO`. Opening it in the Build section (`draftFromSpec`) shows those
figures as computed ratings, and Launch reads them, so a rocket that can fly
is said not to. Nothing in the record tells such a record from a newer one.

## The fix

- **The completion mark.** `DesignRecord.ratingsFinal?: true`
  (`src/design/design-store.ts`): the record's payload ratings are final —
  kept by a build that keeps only a finished search, or there are none of the
  design's own. It sits on the record beside the design, not in the
  `VehicleSpec` and not in the `.orbitlab.json` file, so the design and its
  file are unchanged; the strict `VehicleSpec` reader is not touched.
  Compatibility: an older build's store reader (`isRecord`) and the project
  and workspace archive validators (`validDesigns`) check only the record's
  known fields, so they accept it; an older build that saves that record
  again drops the mark, which costs one more search on the next open in this
  build, not data. Store version stays 1.
- **Save.** The Explore level marks a saved record final when the ratings on
  screen are a finished search's (`computeRatings`), the readiness review's
  (`adoptRatings`), or those of a record that already had the mark; when they
  are published or none (nothing computed); not when they are a remix base's
  carried ratings or ratings restored from the browser's kept drafts (not
  known final), which are then searched again at the next open. Rename keeps
  the mark. An imported file has none, so its ratings are searched once.
- **Open** (`ExploreLevel.openRecord`). The design opens at once as before.
  Then, if its ratings open as computed and the record has no mark
  (`ratingsNeedRecompute`), `recomputeKeptRatings` (`src/ui/build/ratings-job.ts`)
  runs the existing search through `computeRatings`: the ratings worker
  (`ratings.worker.ts`, with PR #99's 40-flight, no-time-limit bound), the
  existing progress line and Stop. A search for the design shown before is
  stopped first and waited for.
- **Write.** A finished search replaces the ratings on screen and in the
  record through the new `DesignStore.rerate(id, design)`: one write, which
  refuses (writes nothing) unless the design differs from the kept one in its
  ratings only (`payloadLEO`, `payloadGTO`, `payloadSSO`), keeps `created` and
  `updated` (the revision, `src/design/design-ref.ts`) and sets the mark. The
  design written is the one the page then flies, so `designRefFor` reads it
  as the same revision, not edited (D-75).
- **Unfinished.** An unfinished search (PR #99's "Not finished" message), a
  Stop, an edit or another design opened during the search (which stop it),
  or a failed worker or storage write: nothing is written, the old figures
  stay, the record keeps no mark, and the next open tries again.
- No new screen text (the existing "Computed in N test flights." and PR #99's
  "Not finished" message say what happened). Not touched: `src/physics/**`,
  the ratings search itself, the design file format.

## Tests

Failing first (commit `de9ffa7`, test only; run against the base `src/`):

```
× a record without the mark is searched again: the finished result replaces the kept ratings, in one write
× a record whose ratings carry the mark is not searched again, and nothing is written
× a design whose ratings are not computed ones (published, a base's, none) is not searched
× a search that cannot finish leaves the kept ratings and no mark, and is tried again at the next open
× D-75: the recompute is not a design edit — the revision stays, and the design does not read as edited
× the store's rating-only write refuses anything but the ratings, and a design it does not keep
TypeError: ratingsNeedRecompute is not a function
AssertionError: expected undefined to be true // Object.is equality
TypeError: recomputeKeptRatings is not a function
TypeError: s.rerate is not a function
Tests  6 failed | 1 passed (7)
```

(The one that passes on the base, "an ordinary save drops the mark unless it
is given", guards the save path once the mark exists.)

Passing after: `tests/build-legacy-ratings.test.ts` 7/7. With the affected
suites (`design-store`, `design-explore-model`, `design-explore-drafts`,
`build-ratings-unfinished`, `design-ref`, `build-screen`, `design-ratings`,
`repo-hygiene`, `i18n`): 10 files, 93 tests passed; `app-mode`,
`d06-satellite-date`, `project-archive`, `workspace-*`, `phase4-walk`,
`historical-vehicles`: 11 files, 145 tests passed. `npm run typecheck` clean.
`node --test tests/verification/*.test.mjs tests/browser/shard.test.mjs`: 64/64.

Browser: no existing journey opens a saved rocket design, so a new one,
`tests/browser/journeys/build-legacy-ratings.mjs` (not in the smoke set),
saves an Electron copy through the page, replaces its saved bytes with an
old record (LEO 120 kg, GTO 0, no mark), reloads and opens it: the progress
line with Stop appears, the record is rewritten once with the finished
ratings (LEO 120 → 315 kg, GTO 0 → 137 kg) and the mark, `created`/`updated`
unchanged, nothing else of the design changed; opened again, no search and no
write. Passed in 26.0–26.5 s on this build (twice); on the base build it fails
(3 failures: no mark on save, no search on open, no mark kept).

## Bundle budget

`npm run build && node scripts/bundle-budget.mjs`, against the base built the
same way (`npx vite build` of `7d9dcb6`'s `src/`):

| Group | Base | This | Δ | Ceiling now | K1 allowance (#104, not merged) |
|---|---|---|---|---|---|
| precache code | 14707.0 | 14708.5 | +1.5 | 14704 — FAIL (base already +3.0) | 14714 — ok |
| i18n-*.js | 1721.0 | 1721.0 | 0 | 1720 — FAIL (base already +1.0) | 1725 — ok |
| index-*.js | 2621.6 | 2623.1 | +1.5 | 2622 — **FAIL, new (+1.1)** | not raised by #104 — FAIL |

The index chunk had 0.4 kB of headroom after PR #99; this change adds 1.5 kB
of minified code to it, which counts in precache code too. No ceiling is
raised here.

## Left open

- **index-*.js ceiling.** #104 raises precache code and i18n, not the index
  chunk's own 2622 kB ceiling. This change goes over it by 1.1 kB; the owner
  or the budget package decides (raise it under the K1 allowance, or another
  offset).
- **Kept drafts.** Ratings in the browser's kept drafts (restored at page
  load, not opened from the store) are not searched again; they are not
  marked final either, so saving them leaves the record unmarked and the
  next open searches. A legacy 0/0 (no rating at all) opens as "unknown",
  not as computed, and is not searched.
- **Engineer bench.** The Engineer level's bench takes a kept design as it
  is; only the Explore level searches on open.
- **D-75 elsewhere.** `designRefFor` still counts any difference in ratings
  as an edit (e.g. ratings computed by hand and not saved); this package
  keeps the record and the screen equal after a recompute and leaves that
  rule to R3.1r (M-PLAN-028).
