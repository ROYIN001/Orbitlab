# ED-LES-1 s1: the event log no longer shows the period a lesson asks for (M-LEARNING-012)

Package ED-LES-1 (Lesson integrity) of plan v2.0, item M-LEARNING-012: "Event log "Target orbit achieved ... period N min" gives away answers in pack lessons 11.2, 12.2, 13.1, 13.2".

```yaml
envelope: v2
package: ED-LES-1
step: s1
branch: claude/lc-les1-s1
wave: K1-K2
lane: L-C (+L-UI)
items: [M-LEARNING-012]
priority: {M-LEARNING-012: P2}
change_kind: bug-fix
owner_authorization: {decision: D-65, date: 2026-10-05, quote: "เมื่อทำการ merge แล้วตรวจสอบว่าทุกอย่างเรียบร้อยแล้วในระยะ K0 ให้เริ่มทำระยะ K1 ในเซสชั่นใหม่ต่อได้เลยครับ ใช้ model opus5.5 high"}
base_sha: 4de951f29023cb76988e64d671cc9ef771ffed00
commits: {failing_test: f2899a7, fix: ad16a9b}
app_code_changed: [src/lessons/measures.ts, src/ui/names.ts, src/ui/lessons/lesson-mode.ts]
tests_added: [tests/lesson-event-answers.test.ts, one new check in tests/browser/journeys/lesson-packs.mjs]
new_strings: none
not_touched: [src/physics/** (the event still carries the period), src/mcp.ts, the HUD's rows, CSS, budgets.json, existing assertions]
failing_before_fix: [tests/lesson-event-answers.test.ts 9 of 9 at f2899a7, journey lesson-packs (new check) on a build of 4de951f]
```

## What was wrong

When the flight reaches its target, `reachTargetOrbit` (`src/physics/sim/burns.ts:829`) emits `evt.targetOrbit` with `period: Math.round(el.period / 60)`. The dictionaries print it as "Target orbit achieved: {pe} × {ap} km, i = {inc}°, RAAN {raan}°, period {period} min" (en, th, ru). Every event line uses this text: the telemetry panel's log, the HUD ticker, the narration, the timeline tooltip, the report and the flight worksheet.

A lesson marks a number the student must work out as an `answer` criterion (`src/lessons/types.ts`). The value printed in the line is within half a minute of the period that is graded. That is inside the tolerance of the four lessons the audit names:

| lesson | id | answer tolerance on the period |
|---|---|---|
| 11.2 | ipst-b-falling-around | ±1 min |
| 12.2 | ipst-a-sun-clock | ±0.5 min |
| 13.1 | ipst-p-geo | ±5 min |
| 13.2 | ipst-p-starlink | ±0.5 min |

The same answer is asked in seven more lessons, so the line gave it away there too:

- built-in 1.1 orbit-first (±1 min) and 1.3 orbit-hohmann (±1 min);
- 5.3 adv-history and 5.4 adv-vostok (±0.2 min; the whole minute is a close hint there, not a pass);
- pack 12.1 ipst-a-kepler3 (±1 %, about ±6 min on the 631 min transfer orbit);
- pack 14.1 rtaf-napa1-sso (±0.2 min);
- pack 14.2 rtaf-elements (±0.5 %).

On main, the `lesson-packs` journey's flight of 12.1 printed: `T+09:09Target orbit achieved: 251 × 35716 km, i = 28.61°, RAAN 0.1°, period 631 min`.

## Failing before the fix

`tests/lesson-event-answers.test.ts` is committed alone in `f2899a7`. It reads the lessons from the pack files as the app does and finds them by number (11.2, 12.2, 13.1, 13.2). It checks the line as an event log in en, th and ru prints it, `tFor(lang, 'evt.targetOrbit', localizeEventParams(null, params))`, while such a lesson is open, then with no lesson, with a lesson that does not ask for the period (11.1, and built-in orbit-iss-plane), after the lesson is closed, and for an event without a period (the parking orbit). The wiring in `lesson-mode.ts` is checked in its source, as `tests/design-strip-progress.test.ts` does, because vitest runs in node here without a DOM.

Run at `f2899a7` (the API does not exist on main, so `npm run typecheck` also fails at that commit):

```
     × lesson 11.2 asks for the period, and while it is open the line prints "?" for it
     × lesson 12.2 asks for the period, and while it is open the line prints "?" for it
     × lesson 13.1 asks for the period, and while it is open the line prints "?" for it
     × lesson 13.2 asks for the period, and while it is open the line prints "?" for it
     × with no lesson open, the line prints the period as before
     × a lesson that does not ask for the period leaves the line as it was
     × only the period is withheld, and only where an event carries one
     × closing the lesson prints the period again
     × tellOrbit, called whenever the open lesson changes, sets the withheld params from the flight lesson open, or none
TypeError: answerEventParams is not a function       (4 tests)
TypeError: withholdEventParams is not a function     (2 tests)
AssertionError: expected '  private tellOrbit(): void {\n    co…' to match /withholdEventParams\(a && isFlightLes…/
      Tests  9 failed (9)
```

The new check in the browser journey `lesson-packs` (12.1, flown live) fails on a build of main with the line quoted above:

```
[lesson-packs] FAIL: the event log's "Target orbit achieved" line: T+09:09Target orbit achieved: 251 × 35716 km, i = 28.61°, RAAN 0.1°, period 631 min
✗ lesson-packs (35.9 s)
```

## Fix (`ad16a9b`)

- `src/lessons/measures.ts`: new `answerEventParams(lesson)`. It returns `['period']` when the lesson has an `answer` criterion on `orbit.period`, and `[]` otherwise. It is DOM-free and reads only how the lesson marks its answers.
- `src/ui/names.ts`: new `withholdEventParams(keys)` keeps the list. `localizeEventParams`, which every event line goes through, prints `?` for each listed param the event carries. With nothing withheld, or an event without the param, it returns the same object as before, so nothing is allocated.
- `src/ui/lessons/lesson-mode.ts`: `tellOrbit` already runs each time the open lesson changes: in `startLesson`, `startDesign`, `startCase`, `gradeCase` and `exit`. It now calls `withholdEventParams` before its own dedupe, with the open flight lesson's params, or none.

On screen, the line reads "Target orbit achieved: 418 × 421 km, i = 51.64°, RAAN 123.4°, period ? min". In Thai it reads "… คาบ ? นาที", and in Russian "… период ? мин". The heights stay, because lessons 12.1 and 14.2 tell the student to read them from this line. The plane stays too. Nothing changes in free flight, or in a lesson that does not ask for the period. No string was added or changed. The event itself, its CSV export and WebMCP's `get_events` still carry the number. The journey relies on that `get_events` value to compute 12.1's answers.

### Where the code differs from the item text

The item names four lessons. The fix follows the answer field ("find how lessons mark answer fields"), so it covers all eleven lessons that ask for the period. This includes a teacher's own lesson file with such an answer. Limiting it to the four named lessons would leave the same giveaway in the other seven.

## Not in this step (seen while working)

- The HUD's full mode (an opt-in mode; the default is compact) has a "Period" row, `hud.ts:948`, which shows the live period to 0.1 min. Its primary rows show speed and inclination. Lesson 14.1 asks for the inclination, and the event line also prints `i = {inc}°` to 0.01°. These are live instruments rather than the event log, and none is in this item. Hiding any of them is a change in what the student sees, so the owner should decide it.
- WebMCP's `get_events` returns the raw params, including the period.

## Tests run

- `npm run -s typecheck`: clean.
- `npx vitest run tests/lesson-event-answers.test.ts`: 9/9 passed. Related files: `architecture`, `i18n`, `design-strip-progress`, `control-faults`, `control-tuning`, `explicit-guidance`, `d06-custom-satellite`, `design-stage-names`, `worksheets`, `panel-verdict`, `recheck-core`, `lessons-history`, `lesson-grading-end` (14 files, 161 tests) and `lesson-packs`, `lessons`, `lessons-round2`, `recheck-design` (4 files, 62 tests) all passed. The full suite was not run locally; CI runs it.
- `node --test tests/verification/*.test.mjs tests/browser/shard.test.mjs`: 73/73 passed.
- Browser journeys on the production build with the fix: `lesson-packs` ✓ (34 s, with the new check) and `launch-explore` ✓ (104 s, free flight).

## Size

`npx vite build; node scripts/bundle-budget.mjs`: **bundle budget: ok**. Bytes compared with a build of `origin/main` 4de951f on the same machine:

| chunk | main | this branch | delta | ceiling |
|---|---:|---:|---:|---:|
| `index-*.js` | 2,633,274 B | 2,633,460 B | +186 B | 2633.5 / 2634.0 kB |
| `lesson-file-*.js` (holds `measures.ts`) | 345,079 B | 345,190 B | +111 B | 345.2 / 347.0 kB |
| `catalog-*.js` | 172,767 B | 172,762 B | −5 B | 172.8 / 180.0 kB |
| `i18n-*.js` | 1,724,676 B | 1,724,676 B | 0 | 1724.7 / 1725.0 kB |
| `index-*.css` | 176,994 B | 176,994 B | 0 | 177.0 / 177.0 kB |
| precache code | 14693.3 kB | 14693.6 kB | +0.3 kB | 14724.0 kB |

No CSS or string was added, and `budgets.json` is unchanged.
