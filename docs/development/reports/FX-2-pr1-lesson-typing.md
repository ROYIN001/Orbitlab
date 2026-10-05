# FX-2 PR1 — the answer field survives a design check / ช่องคำตอบไม่หายระหว่างการตรวจแบบ

Package FX-2 of plan v2.0 (S10 §10.5), PR1: M-LEARNING-001 (CR:P28).

```yaml
envelope: v2
package: FX-2
pr: 1
family: FX
wave: K1
lane: L-UI
items: [M-LEARNING-001]
sources: [CR:P28, review:P28]
change_kind: bug-fix
or_ids: [OR-2]
execution_authorized: true
owner_authorization: {date: 2026-10-05, quote: "เมื่อทำการ merge แล้วตรวจสอบว่าทุกอย่างเรียบร้อยแล้วในระยะ K0 ให้เริ่มทำระยะ K1 ในเซสชั่นใหม่ต่อได้เลยครับ ใช้ model opus5.5 high", scope: "D-65 K1"}
base_sha: 272a3b94ee3a51c0d04ba1685ac171386c5e762d
base_sha_verified_on: {sha: 272a3b9, date: 2026-10-05, recheck: "src/ui/lessons/lesson-mode.ts:464 progress callback `this.lastStripKey = ''; this.paintStrip();`; :1111 key holds Math.round(progress * 100); :1116 guard `typing && this.lastStripKey` — present"}
allowed_write_paths: [src/ui/lessons/lesson-mode.ts, src/ui/lessons/strip-progress.ts, tests/design-strip-progress.test.ts, tests/browser/journeys/fx2-design-check-focus.mjs, CHANGELOG.md, docs/development/PROGRESS.md, docs/development/reports/FX-2-pr1-lesson-typing.md]
oracle: []
failing_before_fix: [tests/design-strip-progress.test.ts (3 of 4 fail at the test commit)]
journey: {file: tests/browser/journeys/fx2-design-check-focus.mjs, status: "written; first run pending (integration session)"}
perf_evidence: none
kpi_targets: {KPI-14: "M-LEARNING-001 closed"}
reviewer: second agent (P1)
```

## Defect, as found on the base

While a design lesson's lifetime run reports progress (~100 ticks a check,
`propagate.ts`), the callback in `checkDesign` set `lastStripKey = ''` and
called `paintStrip()`. With the key empty, `paintDesign`'s typing guard
(`if (typing && this.lastStripKey) return`) let the call through, and the key
itself held `Math.round(progress * 100)`, so it differed every tick anyway.
Each tick therefore ran `strip.replaceChildren(...)`: the answer input the
learner was typing in was replaced, losing focus and caret (the typed value
was restored from `a.drafts`, but mid-typing keystrokes and the Hand-in
button's focus were lost). The same happened with the learner not typing
(keyboard focus on a strip button).

## Fix

- `src/ui/lessons/strip-progress.ts` (new, DOM-free): `checkingKeyPart` — the
  running check adds only whether it hands in to the strip key, not its
  progress; `stripRebuilds` — the rebuild decision with the typing guard, as
  before, now shared by the case and design strips; `CheckProgressLine` —
  writes the progress line in place.
- `lesson-mode.ts`: the progress callback only calls `checkLine.set(f)` (for
  the active lesson's current job); it no longer clears the key or repaints.
  The strip is built at the start of a check and at its result, failure or
  abort, as S10 asks. The progress line is `<p class="lesson-note">` with an
  `aria-hidden` span updated every tick (same words,
  `lesson.design.strip.lifetime` / `lesson.design.strip.checking`) and an
  `sr-only` `role=status` span updated in 10 % steps (≤ 11 announcements a
  check; the status is kept, not removed).
- R1 contract (S10 §10.1): rendering writes no storage; nothing here touches
  progress or the workspace.

## Tests

No DOM environment in vitest (`environment: 'node'`, no jsdom/happy-dom
installed), so the decision is extracted into pure functions and unit-tested;
the callback wiring is checked against the source text. The test commit
(`bdb7ff0`) moves the decision out unchanged, so its failures are the base's
behaviour:

```
 FAIL  tests/design-strip-progress.test.ts > … > a progress tick is not something the strip key holds
AssertionError: expected [ true, 1 ] to deeply equal [ true, +0 ]
 FAIL  tests/design-strip-progress.test.ts > … > ticks build the strip again zero times, with the learner typing or not
AssertionError: expected 100 to be +0 // Object.is equality
 FAIL  tests/design-strip-progress.test.ts > … > the progress callback neither forgets the strip key nor builds the strip
AssertionError: expected ' job.progress = f; this.lastStripKey …' not to match /lastStripKey\s*=/
      Tests  3 failed | 1 passed (4)
```

After the fix (`a88ce05`), with a fifth test for the in-place line (101
writes of the visible text, ≤ 11 of the status, same words).

### Review follow-up (second agent, on `d783323`)

- The progress callback is now a named method, `onCheckTick(a, job, f)`. The
  source-text tests assert the callback is exactly
  `(f) => this.onCheckTick(a, job, f)`, that `onCheckTick` calls
  `this.checkLine?.set(f)` and does not set `lastStripKey`, call `paintStrip`,
  `paintDesign` or `replaceChildren`, and that `paintDesign`'s key holds
  `checkingKeyPart(d.checking)` and no `progress` term.
- Mutations, each applied alone to `lesson-mode.ts` and reverted (vitest
  `tests/design-strip-progress.test.ts`, 6 tests):
  - callback `(f) => this.tick(f)` → 1 failed, 5 passed (the onCheckTick test);
  - `d.checking?.progress,` added to the `paintDesign` key → 1 failed, 5
    passed (the key test);
  - `onCheckTick` body replaced by `this.lastStripKey = ''; this.paintStrip();`
    → 1 failed, 5 passed (the onCheckTick test).
- `checkLine` is also cleared when a case or flight strip is built.
- DOM proof (S10 §10.5): new journey
  `tests/browser/journeys/fx2-design-check-focus.mjs` (not smoke). No bundled
  design lesson asks for `sat.lifetime` (the only measure with progress), so
  it opens a one-lesson file made from the re-check fixture's `class-theos`,
  starts the check, types `123.4` into the answer field, moves the caret, marks
  the element, waits until the visible progress text has changed at least
  twice, and asserts the same element still has focus, value `123.4` and caret
  3–3, and that the `role=status` line is not empty. **Written, not run**
  (CPU reserved; the integration session runs browser journeys) — its first
  run is pending. `node --check` passes.

### Runs after the follow-up

- `npx vitest run --maxWorkers=2 --testTimeout=30000` on exactly these 11
  files: `tests/design-strip-progress.test.ts`, `tests/repo-hygiene.test.ts`,
  `tests/design-lessons.test.ts`, `tests/lessons-ui-core.test.ts`,
  `tests/case-lessons.test.ts`, `tests/lessons.test.ts`,
  `tests/lesson-packs.test.ts`, `tests/lesson-packs-design.test.ts`,
  `tests/lesson-grading-end.test.ts`, `tests/i18n.test.ts`,
  `tests/architecture.test.ts` → 11 files, 173 passed. With the default 5 s
  timeout and all workers, on a machine at load ~16 (other sessions), runs
  showed 1–3 timeouts in CPU-heavy physics tests (`design-lessons` lifetime
  run, `lessons` 1.2, `lesson-packs` B5) that pass alone; none touch the
  changed code.
- `npm run typecheck`: clean.
- `node --test tests/verification/*.test.mjs tests/browser/shard.test.mjs`:
  64 tests, 64 passed, 0 failed.

Not run: browser journeys (including the new one) and the build.

## Limits

- The strip is still rebuilt when the check finishes (the grade has to show);
  a learner typing at that moment keeps the value (`a.drafts`) but not focus,
  as on the base. Not in M-LEARNING-001's scope. **Follow-up under
  M-LEARNING-002** (shared answer form): after the result rebuild, restore
  focus and caret to the same criterion's field.
