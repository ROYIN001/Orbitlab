---
package: FX-3
step: s3 (plan v2.0 S10 §10.6, PR order item 3)
items: [M-ORBIT-007]
priority: {M-ORBIT-007: P2}
change_kind: quality-improving (S10 §10.6 order item 3), tests written first and failing as for a bug-fix
owner_authorization: 'D-65, owner, 2026-10-05: "เมื่อทำการ merge แล้วตรวจสอบว่าทุกอย่างเรียบร้อยแล้วในระยะ K0 ให้เริ่มทำระยะ K1 ในเซสชั่นใหม่ต่อได้เลยครับ ใช้ model opus5.5 high"'
decisions: []
base: 3d4ecfe (claude/o-fx3-s2, FX-3 step 2; that branch is on 6fea83f)
main_measured: 23ede7f (origin/main at the time of the size check)
branch: claude/o-fx3-s3
wave_lane: K1 / O
status: In PR; not merged; not published
---

# FX-3 step 3 — the catalogue's load state and Try again (M-ORBIT-007)

## What was wrong on `3d4ecfe`

- **The Watch tour's real-satellite steps were blank.** `renderTour()`
  (`src/ui/orbit/playground.ts`) adds a real satellite's readouts only when
  `RealSky.liveNow()` gives some, and that is null until the catalogue is in.
  While it loaded, or after it failed, the card showed only the step's title
  and text. The line that says "Loading the element sets…" or "could not be
  loaded: {reason}" is drawn in `RealSky.controls()`, the left panel, which
  `playground.css` hides at the Watch level.
- **No Retry.** The panel said `sky.failed` and offered nothing. The only ways
  to load again were moving to another real-satellite step
  (`showForTour()` → `load()`), downloading a case sheet (`caseInput()`), or
  changing the data mode.
- **Online, once per page.** In online mode the catalogue is fetched once per
  page and kept. The two-hour rule for CelesTrak is already in the data
  provider (`OnlineProvider`, `SATELLITES_MIN_INTERVAL_MS`): it keeps each
  query's answer or refusal for two hours. The plan asks that any Retry go
  through the provider, so that rule and the snapshot fallback still hold.

## The fix

- `RealSky.loadState()` (`src/ui/orbit/sky-panel.ts`) returns the
  catalogue's state while it is not in. While loading it returns the existing
  `sky.loading` line. After a failure it returns the existing `sky.failed`
  line (`pg-warn`) and a **Try again** button (`watch-btn`). Once the
  catalogue is in it returns null. Both the panel (`controls()`) and the tour
  card (`renderTour()`, real-satellite steps only) use it. The tour card sets
  its top margin inline, so no CSS is added: the main CSS chunk is at its
  ceiling.
- `RealSky.retry()` calls `load()` again only from the failed state, and
  redraws the panels and the card at once, so they say "Loading…". It does
  nothing while a load is out: a second press asks for nothing more. The
  load goes through `host.provider()`, the same `DataProvider` as before. In
  online mode that means CelesTrak's kept answers and refusals (two hours)
  and the snapshot behind them.
- One new key, `sky.retry`: "Try again" / "ลองอีกครั้ง" / "Повторить". The
  state lines reuse `sky.loading` and `sky.failed`, as the task asks. The
  plan's wording "กำลังโหลดแคตตาล็อก" is covered by the existing
  "กำลังโหลดชุดค่าองค์ประกอบวงโคจร…".

## Where the plan and the code differ (the code was followed)

- **Line numbers.** S10 cites `sky-panel.ts:206-226` (`load()`) and `:492`
  (`sky.failed`). On `3d4ecfe` these are at `:207-227` and `:493`. Same code.
- **"Online mode fetches once per page" (RW:ORB-05: no refresh in online
  mode).** The plan's acceptance asks for two things: a Retry through the
  provider, and at most one request to CelesTrak in two hours. It does not
  ask for a refresh of a catalogue that has already loaded. In online mode, a
  CelesTrak failure does not end in the failed state. The provider falls back
  to the snapshot, and the panel already says why (`data.fallback`). So Try
  again is offered only in the failed state, which is reached only when the
  snapshot itself failed. No "load again" was added for a catalogue that is
  in. There are two reasons:
  - It would be a new control.
  - The provider records answers and refusals, not requests that got no
    answer: a network error, a cross-origin refusal, or a timeout. A
    "load again" after such a failure would ask CelesTrak again within the
    two hours, and such a request may already have reached CelesTrak (P2.5:
    CelesTrak answered some requests without the cross-origin header).

  A follow-up outside FX-3's files (`src/provider/data-provider.ts`): if a
  refresh for online data is wanted, the provider should first count those
  unanswered requests.
- **Moving between steps still loads again.** After a failure, moving to
  another real-satellite step loads again (`showForTour()` → `load()`), as
  before. Unchanged. The unit test and the journey check that nothing else
  asks again by itself: not frames, not redrawing the card, not waiting on
  the step.

## Tests

Written first and committed alone (`348dad7`). Then one test-only correction
(`a952667`): the journey's last check looked for "Altitude" in the card's
`innerText`. `playground.css` sets the readout labels in capitals, and
`innerText` returns "ALTITUDE", so the check failed in EN and RU. It now
compares without case. The check that fails on `3d4ecfe` comes before it in
the journey and was not changed.

`tests/fx3-catalogue-load.test.ts` uses a fetch double (counting every
request), the bundled snapshot, the real `OfflineProvider` and
`OnlineProvider`, the real `RealSky`, and the playground's own
`applyTourStep()`, `renderTour()` and `skyFrame()`. It covers:

- **Tour card, offline.** idle/loading → failed → Try again pressed twice →
  loading → ready. Each try requests the snapshot exactly once. Ten frames
  and a redraw in the failed state ask for nothing.
- **Panel, in EN, TH and RU.** The panel says why, Try again loads, and the
  button's word is the language's own.
- **Online.** CelesTrak answers 503 and the snapshot fails twice. Try again
  is pressed a minute later and again an hour later. Each of the
  `SATELLITE_URLS` is asked at most once. The catalogue ends on the snapshot,
  with `fallback` naming the 503.

Failing before the fix (`348dad7` on `3d4ecfe`, `npx vitest run tests/fx3-catalogue-load.test.ts`):

```
× goes loading → failed → Try again → loading → ready, saying so on the card, the snapshot asked once a try
× says why, and Try again loads the catalogue (en)
× says why, and Try again loads the catalogue (th)
× says why, and Try again loads the catalogue (ru)
× asks each CelesTrak query at most once in two hours, through failure and retries, and ends on the snapshot
AssertionError: loading: expected 'Step 8 of 15 · Real satellitesThe Int…' to contain 'Loading the element sets…'
AssertionError: a "sky.retry" button: expected [] to have a length of 1 but got +0
AssertionError: a Try again button: expected [] to have a length of 1 but got +0
Tests  5 failed | 1 passed (6)
```

The test that passes before the fix is a guard: the tour's first
real-satellite step is still the ISS in the stations group.

New journey `tests/browser/journeys/fx3-catalogue-retry.mjs` (not smoke). In
EN, TH and RU, with the service worker blocked so the route sees the page's
requests:

1. Open `#/orbit/watch` and go seven steps on to the ISS.
2. The snapshot is refused. The card must say why and show Try again.
3. Nothing may ask for the snapshot again within 2 s.
4. Press Try again. The snapshot answers 1.5 s late. The card must say
   "Loading…", then show the ISS's readouts.
5. Try again must make exactly one request, and no request may go to
   CelesTrak (offline mode).

On the step 2 build (`3d4ecfe`):

```
FAIL: en: the tour card shows no "The element sets could not be loaded: …" and "Try again" while the catalogue is refused: STEP 8 OF 15 · REAL SATELLITES The International Space Station, right now This is where the ISS is at this mom…
FAIL: th: the tour card shows no "โหลดชุดค่าองค์ประกอบวงโคจรไม่ได้: …" and "ลองอีกครั้ง" while the catalogue is refused: ขั้นที่ 8 จาก 15 · ดาวเทียมจริง …
FAIL: ru: the tour card shows no "Элементы орбит не удалось загрузить: …" and "Повторить" while the catalogue is refused: ШАГ 8 ИЗ 15 · НАСТОЯЩИЕ СПУТНИКИ …
✗ fx3-catalogue-retry (233.6 s)
```

After the fix (branch build): `✓ fx3-catalogue-retry (90.5 s)`.

Run on the branch head:

- `npx vitest run tests/fx3-catalogue-load.test.ts tests/i18n.test.ts tests/i18n-counts.test.ts
  tests/architecture.test.ts tests/case-export-race.test.ts tests/case-lessons.test.ts tests/data-provider.test.ts
  tests/fx3-thai-moon-labels.test.ts tests/orbit-playground.test.ts tests/orbit-handoff.test.ts tests/real-sky.test.ts
  tests/repo-hygiene.test.ts tests/result-slot.test.ts tests/section-plan.test.ts tests/sky-import.test.ts
  tests/sky-tour.test.ts tests/sky.test.ts tests/profiles-i18n.test.ts`: 18 files, 188/188.
- `npm run typecheck`: clean.
- `node --test tests/verification/*.test.mjs tests/browser/shard.test.mjs`: 66/66.
- Journeys on the branch build: `fx3-catalogue-retry` ✓ (90.5 s), `pwa-offline` ✓
  (77.0 s; the offline journey is unchanged, as S10 asks), `fx3-thai-in-sky` ✓ (60.5 s).
- CelesTrak requests: 0 in every journey (offline mode). In the online unit
  test, at most 1 per query within two hours.
- Screenshots for the owner (local, not committed): the tour card failed, loading and ready in TH, EN and RU,
  from the journey.

## Size

`npx vite build; node scripts/bundle-budget.mjs`. Each build's own numbers:

| group | main `23ede7f` | step 2 `3d4ecfe` | branch | this step |
|---|---|---|---|---|
| index-*.js | 2 629 199 B | 2 629 814 B | 2 630 069 B | +255 B |
| i18n-*.js | 1 723 581 B | 1 723 625 B | 1 723 730 B | +105 B |
| index-*.css | 176 994 B | 176 994 B | 176 994 B | 0 |
| workers | — | — | — | 0 |
| precache code | 14 723.2 kB | 14 723.9 kB | 14 724.2 kB | +0.3 kB |

Against `origin/main` (`23ede7f`), the branch, with step 2, is +1.0 kB of
precache code. Main and the branches started from different commits (step 2
is on `6fea83f`), so this figure also includes main's own changes since then.

**Budget: over.** The budget check fails:

```
bundle budget: precache code is 14724.2 kB, over its code ceiling of 14724.0 kB by 0.2 kB
```

Step 2 left 0.1 kB under the ceiling, and this step adds 0.36 kB. The
added code is the state line, the button and one key in three languages,
and no smaller form of it fits in 0.1 kB. `budgets.json` was not edited:
the owner decides the ceiling.

## Records

Not edited: `CHANGELOG.md`, `docs/development/PROGRESS.md`. The fragment is
`changes/claude-o-fx3-s3.md`.
