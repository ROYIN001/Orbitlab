# FX-1 s5 — a new start over unsaved changes asks first / เริ่มแบบใหม่ทับงานที่ยังไม่บันทึกต้องถามก่อน (M-BUILD-007)

```yaml
envelope: v2
package: FX-1 (Build data safety)
step: s5
wave: K1
lane: B
items: [M-BUILD-007]
priority: {M-BUILD-007: P1 (data loss)}
change_kind: bug-fix; failing regressions committed first
owner_authorization: {date: 2026-10-05, quote: "เมื่อทำการ merge แล้วตรวจสอบว่าทุกอย่างเรียบร้อยแล้วในระยะ K0 ให้เริ่มทำระยะ K1 ในเซสชั่นใหม่ต่อได้เลยครับ ใช้ model opus5.5 high", scope: "wave K1 (D-65)"; continued by the owner in chat on 2026-10-09}
decisions_used: [D-75 ("A rating-only recompute does not count as a design edit; design identity follows the parts."), D-63, D-38]
plan: plan v2.0 S10 §10.4 (FX-1), acceptance "no path in Build drops an unsaved design without asking"; the paths listed in the FX-1 s3 report, "Not in this item"
base_sha_verified_on: {sha: 007b039, date: 2026-10-09}
branch: claude/b-fx1-s5
files: [src/ui/build/explore-store.ts, src/ui/build/explore-level.ts, src/ui/build/satellite-level.ts, tests/build-unsaved-open.test.ts, tests/browser/journeys/build-unsaved-open.mjs, changes/claude-b-fx1-s5.md]
not_touched: [src/i18n/**, CSS, src/design/**, src/physics/**, stored formats, budgets.json, existing tests' assertions]
failing_before_fix: [unit 6 of the 9 new tests on 007b039, journey build-unsaved-open 8 failures on a build of 007b039]
size: {against: "a build of 007b039, same machine", index_js_kB: "2635.4 → 2635.9 (+0.5; ceiling 2636, not raised)", i18n_js_kB: "1726.4 → 1726.4", index_css_kB: "177.0 → 177.0", precache_code_kB: "14698.0 → 14698.5 (ceiling 14724)"}
review: second agent (P1) — 0 blocking findings; 4 non-blocking and 3 test gaps (below)
```

## What was wrong (on `007b039`)

FX-1 s3 (#128) made Open, import and a requirements row ask before they replace a design with unsaved changes. Four other paths still replaced the design at once, with no question:

- the rocket designer's **vehicle picker** (`ExploreLevel.pickBase`): a new remix in place of the remix draft;
- the rocket designer's **"Start again"** (`startOver`): the draft on screen started again;
- the Engineer level's **"open in Explore"** for a sized launcher (`openDesign`, called from `build-screen.ts`): it replaced the draft of its kind, usually the parts design;
- the satellite designer's **template picker** and **"Start again from the template"** (`SatelliteLevel.pickTemplate`).

A student who had changed a design and then used any of these lost the change, unless they had saved it first.

## The fix

All four go through the store, as Open does: `ExploreStore.start(name, still, go)`.

- **When it asks.** It uses #128's own test (`ExploreStore.unsaved()` over the designer's `replacing()`). It does not ask when the design that would be replaced is as saved (payload ratings aside, D-75), or was never saved and is as it started, including its default name. It asks when that design was changed since it was saved, when its record is gone, or when it was never saved and was changed or renamed.
- **The question.** It is `askReplace` with the existing strings: "The design on screen has changes that are not saved. Open "{name}" in its place?", then **Save it, then open** (where the keyboard starts), **Open without saving**, and **Cancel** (Escape also cancels). `{name}` is the new design's name, such as "Electron remix", "My NAPA-2 (6U CubeSat)" or the sized launcher's name.
- **Where it shows.** It shows in "Your designs", at the top of its list, where #128's Open question also shows. Each designer's question code would not fit in `index-*.js`'s room: a first version with the question in the designer's head measured +1.8 kB against 0.6 kB of room. In the store, both designers share one copy of the code.
- **"Save it, then open".** For the rocket, the draft the question was about is the one saved (`ExploreLevel.target`, read by `replacing()`), even if the student switched to the other tab before answering. That is the same rule as #128's review round. Then the new design is put on screen.
- **A question left open.** It is dropped when its design was replaced meanwhile, by an Open, an import, a lesson or a requirements row (`still()`). A later new start replaces it.
- **The pickers.** Until the student answers, the vehicle picker and the template picker show the design's own vehicle or template again.
- **Design lessons.** During a lesson, "Start again" still restarts the lesson's design (`restartLesson`, unchanged), and the template picker is disabled as before.

**No new string**, no CSS, and no stored format changed. About 60 source lines were added and 35 removed: `pickBase`, `startOver` and `openDesign` now share `ExploreLevel.begin`.

### For the owner (a choice I made; the brief said to pick the safer one)

- **"Start again" now asks** when the design has unsaved changes. The other choice was to treat "Start again" as a deliberate discard and not ask. I chose to ask (the safer behaviour). A design that is as saved, or untouched, starts again at once.
- **The question shows in "Your designs"**, not next to the picker or button. The size ceiling was the reason, as explained above. The keyboard moves to the question, and the question is a `role="alert"`, so screen readers announce it. If you would rather have it next to the control, that needs about 1.2 kB more in `index-*.js` (a ceiling raise under D-38).

## Tests

### Failing first

Test-only commits before the fix commit `555dc4a`:

- `01c7f92` added 9 tests to `tests/build-unsaved-open.test.ts` and new steps to journey `build-unsaved-open`.
- `1840c37` changed only the unit harness: it reads the question from the store, where the fix keeps it. The journey looks for the question in `.bx-store` (keys `new:save`, `new:open`, `new:cancel`). No test body changed, and the 6 still fail on `007b039`.

Unit, against `007b039`'s `src/` (the 3 that pass are the "at once" cases the fix must keep):

```
× the vehicle picker asks before a new remix replaces a changed remix never saved; Cancel keeps it, "Open without saving" replaces it
× "Start again" asks over a saved design changed since; "Save it, then open" keeps the change in its record, then starts again
× a launcher sized on the Engineer level asks before it replaces a changed parts design; "Open without saving" opens it with its payload
× a question left open is about its draft only: once Open replaced that draft, "Open without saving" replaces nothing
× the template picker asks before a template replaces a design with unsaved changes; Cancel keeps it, "Open without saving" puts the template on
× "Start again from the template" asks too; "Save it, then open" keeps the design first
AssertionError: the changed remix was replaced without asking: expected { kind: 'catalogue', id: 'electron' } to deeply equal { kind: 'catalogue', id: 'falcon9' }
AssertionError: the changed design was started again without asking: expected 1 to be 1.1
AssertionError: the changed parts design was replaced without asking: expected [] to have a length of 1 but got +0
AssertionError: the changed design was replaced without asking: expected 'theos2' to be 'napa2'
AssertionError: the changed design was started again without asking: expected 0.068 to be 0.33
      Tests  6 failed | 21 passed (27)
```

Journey `build-unsaved-open` against a build of `007b039`:

```
[build-unsaved-open] FAIL: "Start again" over a renamed design did not ask
[build-unsaved-open] FAIL: "Start again" replaced the design without asking: "My rocket"
[build-unsaved-open] FAIL: the vehicle picker over a stretched remix did not ask
[build-unsaved-open] FAIL: the vehicle picker replaced the stretched remix without asking: 100 %
[build-unsaved-open] FAIL: the template picker over unsaved changes did not ask
[build-unsaved-open] FAIL: the template picker replaced the design without asking: array 0.068
[build-unsaved-open] FAIL: "Start again from the template" over unsaved changes did not ask
[build-unsaved-open] FAIL: "Start again from the template" replaced the design without asking: array 0.068
✗ build-unsaved-open (68.5 s)
```

The Engineer level's "open in Explore" is covered by the unit tests only. Getting a sized launcher in the page needs the sizing panel's whole run, so the journey does not drive it.

**Changed in the fix commit** (both are tests added in this branch, not existing assertions): the "still start at once" test and the second half of the sized-launcher test now await the store's answer, a microtask. The rocket designer's decision goes through the store even when there is nothing to lose, which saved the bytes of a second "as it started" check.

### After the fix

- `npx vitest run tests/build-unsaved-open.test.ts`: 28/28, including the review-gap test below.
- `node scripts/verification/select-checks.mjs origin/main..HEAD` selects typecheck, build and budget; 76 unit files; 8 journeys; 1 heavy test.
- `npm run -s typecheck`: clean.
- The 76 unit files: 7390/7390 pass.
- Journeys `build-unsaved-open` (40.9 s), `build-legacy-ratings`, `build-newer-file`, `fx2-design-check-focus`, `lesson-packs`, `r3-bench-drawings`, `requirements`, `satellite`: 8/8 pass. `launch-explore`, `stage2-preflight` and the heavy `custom-satellite-sixdof` results are in the PR.

## Size

`npx vite build; node scripts/bundle-budget.mjs` on the same machine:

| Group | `007b039` | this branch | change | ceiling |
|---|---|---|---|---|
| `index-*.js` | 2635.4 kB | 2635.9 kB (2 635 930 B) | +0.5 kB | 2636 (ok, 70 B left) |
| `i18n-*.js` | 1726.4 kB | 1726.4 kB | 0 | 1727 |
| `index-*.css` | 177.0 kB | 177.0 kB | 0 | 177 |
| precache code | 14698.0 kB | 14698.5 kB | +0.5 kB | 14724 |

No ceiling is raised. `index-*.js` has 70 bytes left after this PR, so the next PR that adds code to the main chunk will need an offset or the owner's decision (D-38).

## Second-agent review (P1)

An independent agent reviewed `git diff origin/main..HEAD` after the fix: **0 blocking findings, so 0 of 0 to confirm.** Its checks:

- every rocket draft assignment and every `ws.replace` now goes through a guarded path;
- answering two questions at once (Open's and a new start's), in either order, never saves or replaces the wrong draft;
- the requirements page is unaffected;
- no existing assertion changed;
- no stored format changed.

Non-blocking findings, left as they are (none loses data today):

1. `ExploreLevel.target` is never cleared. Today every caller of the rocket store's `unsaved()`/`saveFirst()` without a record sets it first. It would trap a future caller.
2. `go` runs after an `await` without checking `still()` again. With `LocalDesignStore` the gap is microtasks, so no one can act in it. It matters if the store becomes truly asynchronous (IndexedDB). Note that `still()` compares the draft's identity, not its content.
3. After Cancel the keyboard goes to "Save". When the design on screen is refused by the checker, "Save" is disabled and the keyboard falls to the page. After "Open without saving" no control takes the keyboard. #128's Open question gives it back to Open.
4. A question asked in one language and answered after a language switch gives the new design its name in the old language, until the next `syncNames`.

Each fix costs bytes the main chunk does not have (70 B left). They are candidates for the next FX-1 step, with an offset.

Test gaps the reviewer named:

- **Closed** in `be36022`: a sized launcher's "Save it, then open" after the remix is shown keeps the parts design asked about. It passes on the fix.
- **Open:** a lesson's "Start again" with no question, and two questions at once. Both paths are unchanged or re-checked in code; the `lesson-packs` journey passes.
