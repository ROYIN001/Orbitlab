# FX-3 PR1 — honest figures in the Orbit playground (M-ORBIT-002, 003, 008)

## Envelope

| Field | Value |
|---|---|
| Package | FX-3 PR1 (plan v2.0 S10 §10.6) |
| Items | M-ORBIT-002 (P1), M-ORBIT-003 (P1), M-ORBIT-008 (P2) |
| Wave / lane | K1 / O |
| change_kind | bug-fix (false results shown) |
| owner_authorization | D-65 K1, 2026-10-05, verbatim: "เมื่อทำการ merge แล้วตรวจสอบว่าทุกอย่างเรียบร้อยแล้วในระยะ K0 ให้เริ่มทำระยะ K1 ในเซสชั่นใหม่ต่อได้เลยครับ ใช้ model opus5.5 high" |
| Principle | S10 §10.1 item 6: a stale value is never shown as current; an incomplete result never as a result |
| Base | `272a3b9` (origin/main) |
| Branch | `claude/o-fx3-s1` |
| Review | P1: a second agent reviews before merge |
| Status | In PR; not merged; not published |
| Left out | The `ui/orbit/dom.ts` part of M-BUILD-029 (decimal entry), as instructed |

## Defects confirmed on `272a3b9`

- **M-ORBIT-002.** `thaiId` was cleared only by `handoffEntry()`
  (`src/orbit/playground-model.ts:117`). `choosePreset`, the sliders, the
  repeat tool and an adopted plan all go through `setOrbit`, which kept it,
  and `appsSection()` passed `thai?.repeat?.revs` to `eoReport()`. After
  "show THEOS-2" and then a preset, the EO report still described THEOS-2's
  385-revolution repeat. NAPA-2's re-entry case (`sky-panel.ts`) was a bare
  field, not tied to the data mode, so it stayed on screen as current after
  the mode changed.
- **M-ORBIT-003.** `renderTour()` wrote the period once, and at the Watch
  level `renderFacts()` (called on every burn by `frame()`) reset
  `this.live = {}` before its early return. After the Hohmann step's burns
  the card kept the LEO period beside a 35 786 km altitude, and the
  altitude and speed readouts also stopped updating.
- **M-ORBIT-008.** `repeatTool()` set `r.revs = Number(i.value)` unchecked;
  0, a blank, 14.5 or 501 was searched and answered "No circular orbit
  between 150 and 5 000 km repeats like that."

## What changed

`src/orbit/playground-model.ts` (DOM-free rules):

- `appsOnOrbit(apps, thaiId = null)`: the settings as the playground takes an
  orbit; the Thai satellite is named only with its own orbit. `handoffEntry`
  uses it (its tests are unchanged).
- `thaiRepeatRevs(apps)`: the named satellite's published revolutions, or null.
- `flownAt(plan, orbit, t, j2)`: moved from the view, unchanged in behaviour.
- `REPEAT_LIMITS` and `repeatCount(text, field)`: whole numbers only (digits,
  so independent of the decimal format), 1–500 revolutions, 1–60 days.

`src/ui/orbit/playground.ts`:

- `setOrbit(next, presetId, thaiId = null)` applies `appsOnOrbit`; `showThai`
  passes its id through it; `loadHandoff` and `applyTourStep` forget it too.
  The EO report reads `thaiRepeatRevs(a)`.
- The tour card's period is `this.live.period`, updated in `updateLive()`
  (every 0.2 s) from the orbit flown; `renderFacts()` returns at the Watch
  level before it resets the readouts; `renderTour()` resets them instead.
  No `renderTour()` per frame.
- The repeat tool's fields check on input: an invalid count shows
  `pg.rep.invalid` beside the field (`aria-invalid`), keeps the last good
  value and disables "Find the orbit". `min`, `max`, `step` and the existing
  messages are kept.

`src/ui/orbit/sky-panel.ts`: NAPA-2's case is `results.napaCase`, a
`ResultSlot<CaseInputs, …>` like the Long March 5B case: a late answer to an
earlier run is dropped, and when the data mode changes the result is marked
stale (`result.staleData`) with the run button shown again.

Strings: `pg.rep.invalid` in EN, RU and TH ("Enter a whole number from {min}
to {max}.").

## Tests

Written first and committed alone (`e88c6df`); a correction to the M-ORBIT-003
test followed in `0320c27` (the first burn is at t = 0, so the test reads the
transfer between the burns instead of a segment before them), still failing
before the fix.

Failing before the fix (`e88c6df`, `npx vitest run tests/orbit-playground.test.ts tests/result-slot.test.ts`):

```
× forgets the Thai satellite once the orbit on show is another, ...        TypeError: appsOnOrbit is not a function
× after a preset, the Earth-observation report no longer uses THEOS-2's ... TypeError: appsOnOrbit is not a function
× every way the playground takes another orbit goes through it (DOM part) expected '  private setOrbit(…' to match /appsOnOrbit\(this\.apps/
× flies the Hohmann step past burn 2 onto the geostationary orbit's period TypeError: flownAt is not a function
× the tour card keeps its period a live readout, ... (the DOM part)       expected '  private renderTour(…' to match /this\.live\.period = stat\(/
× refuses 0, blank, NaN, 14.5, 501 revolutions and 61 days                expected undefined to deeply equal { revs: …, days: … }
× takes a valid count as it is, and the answer to it is the same          TypeError: repeatCount is not a function
× says so beside the field, and "no orbit" only for a valid N and D       expected '  private repeatTool(…' to match /repeatCount\(/
× NAPA-2: fresh in the mode it ran in, stale once the mode changes        TypeError: Cannot read properties of undefined (reading 'status')
Tests  9 failed | 37 passed (46)
```

Passing after (the fix commits `3729a07` and the burn follow-up after it; rerun on the branch head):

- `tests/orbit-playground.test.ts` + `tests/result-slot.test.ts`: 46/46.
- With `tests/i18n.test.ts`, `tests/i18n-counts.test.ts`, `tests/repo-hygiene.test.ts`,
  `tests/architecture.test.ts`, `tests/applications.test.ts`, `tests/budget.test.ts`,
  `tests/maneuvers.test.ts`, `tests/maneuver-setup.test.ts`, `tests/orbit-handoff.test.ts`,
  `tests/d06-build-orbit-handoff.test.ts`, `tests/sky-import.test.ts`, `tests/sky-tour.test.ts`,
  `tests/section-plan.test.ts`, `tests/case-export-race.test.ts`: 16 files, 185/185.
- `npm run typecheck`: clean.
- `node --test tests/verification/*.test.mjs tests/browser/shard.test.mjs`: 64/64.

No browser journey or build was run (CPU reserved for this session). The
view wiring is held by source checks in `tests/orbit-playground.test.ts`
(the test environment has no DOM); the behaviour is held by the pure model
tests.

## Limits and follow-ups

- S10 also lists, under M-ORBIT-003, the real-satellite tour step saying
  "this is where the ISS is at this moment" while the clock runs warped.
  Not in this PR; it stays open under M-ORBIT-003 for FX-3 PR2.
- A maneuver planned from a Thai satellite's orbit keeps the satellite named
  (the plan starts from its orbit), but the EO report uses its repeat only
  while the orbit flown is still the start segment; once a burn is made the
  repeat is not reported. This branch of `appsSection()` has no unit test
  (DOM only); adopting the plan forgets the satellite through `setOrbit`.
- The `ui/orbit/dom.ts` part of M-BUILD-029 is left for its own change.
