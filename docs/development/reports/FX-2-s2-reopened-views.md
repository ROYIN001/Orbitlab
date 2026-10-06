# FX-2 step 2: worksheets and author tabs opened again keep the newer edit

Package FX-2 of plan v2.0 (S10 §10.5), item M-LEARNING-004 (CR:B8 + NEW-storage-6).

```yaml
envelope: v2
package: FX-2
step: s2
branch: claude/lui-fx2-s2
family: FX
wave: K1
lane: L-UI
items: [M-LEARNING-004]
priority: {M-LEARNING-004: P2}
change_kind: bug-fix
or_ids: [OR-2]
owner_authorization: {decision: D-65, date: 2026-10-05, quote: "เมื่อทำการ merge แล้วตรวจสอบว่าทุกอย่างเรียบร้อยแล้วในระยะ K0 ให้เริ่มทำระยะ K1 ในเซสชั่นใหม่ต่อได้เลยครับ ใช้ model opus5.5 high"}
base_sha: 6fea83fe26174d8f19247db4f61ba0ca354ce465
commits: {failing_test: d7a43e2, fix: f2b2686}
app_code_changed: [src/ui/lessons/worksheet-view.ts, src/ui/lessons/author-view.ts, src/workspace/storage.ts]
new_strings: none
failing_before_fix: [tests/instructor-view-sessions.test.ts (4 of 4 fail at d7a43e2)]
```

## What failed

On the base, each opening of the Worksheets tab (`showWorksheets`, `lesson-mode.ts:1659-1673`) or the author tab (`showAuthor`, `:1709-1726`) built a new view. Each new view registered a new workspace flusher, and the view stayed alive until `pagehide` (`worksheet-view.ts:105-108`, `author-view.ts:181-185`). This caused three problems:

- **Data loss.** Say an edit's save fails, for example on a full quota. The edit is pending only in that opening's view. The next opening reads the stored bytes, which are older, so it shows the older form or draft. A newer edit made there saves. At the profile switch, `prepareChange()` runs the flushers in the order they were registered. The older view's flusher now succeeds and writes its edit over the newer one.
- **Flushers pile up.** There was one more flusher and one more retained view for every opening.
- **Class code changes.** A worksheet form that was never saved got a new random class code (`worksheet-view.ts:47`) at every opening.

## Failing before the fix

`tests/instructor-view-sessions.test.ts` uses the real `WorkspaceRepository` over a storage double that fails while denied and succeeds afterwards. The switch is a real `repo.select(other)`. On commit `d7a43e2`, which adds only the test, the result is:

```
 FAIL  … > keeps one flusher per document however often the tabs are opened
AssertionError: expected 4 to be 2 // Object.is equality
 FAIL  … > carries a worksheet edit whose save failed to the next opening, and a newer edit there survives the profile switch
AssertionError: expected '' to be 'Older class list' // Object.is equality
AssertionError: expected 'Older class list' to be 'Newer class list' // Object.is equality
 FAIL  … > carries an author edit whose save failed to the next opening, and a newer edit there survives the profile switch
AssertionError: expected 'class-lesson-249gs' to be 'class-older-edit' // Object.is equality
AssertionError: expected 'class-older-edit' to be 'class-newer-edit' // Object.is equality
 FAIL  … > keeps one class code when the worksheets are opened twice without an edit, and writes nothing
AssertionError: expected '9100' to be '1900' // Object.is equality
      Tests  4 failed (4)
```

The second assertion of each "carries" test shows the overwrite itself: after the switch, the profile holds the older edit. The first assertion in those tests is `expect.soft`, so the run continues to the switch.

## Fix

- `src/workspace/storage.ts`: new `keptForWorkspace(page, make)`. It returns the one instance a page keeps for this document's workspace binding. The instance is made at the first opening and returned at every later one. The key is the bound storage object, so a new binding (a test's, or the next document after a switch-and-reload) starts afresh. If no storage can be had (vitest without `localStorage`), it uses one module key.
- `worksheet-view.ts` and `author-view.ts`: `renderWorksheets` and `renderAuthor` use it, and a new `reopen(host, container)` points the same view at the new host and container.
  - The view keeps its form or drafts, its pending set and its class code, so the next opening shows the unsaved edit, which is the newer data.
  - The view clears only what a new view used to start without: the worksheets' "file made" note and the author tab's result box (file saved / link).
  - The flusher is registered once, in the constructor. The per-view `pagehide` detach is removed; it existed only to release the per-opening views.
- Rendering still writes nothing (rule R1.1). The fourth test checks this: no disk write across two openings and a `prepareChange()`, and no stored key.

### Where the code differs from the plan text

S10 asks for "flusher ที่ทำงานอยู่หนึ่งตัวต่อเอกสาร; dispose view ได้หลัง `savePending` สำเร็จเท่านั้น; รหัสห้องเก็บในหน่วยความจำต่อเอกสาร". In the code, the simplest way to get that is one view per document, so no older view exists to dispose. The unsaved edit stays in that one view until a save succeeds, and the class code is in its memory.

Two behaviours differ from the base because of this:

- **Stored drafts are not re-read at each opening.** In a writable document these views are the only writers of their keys. The profile lock is exclusive, and `importArchive` into the active profile raises the epoch, so the document must reload. The kept form therefore equals the stored bytes whenever nothing is pending. Only a read-only second tab of the same profile would show the drafts as they were at its first opening, rather than the writer tab's later save. That tab cannot save anyway.
- **The author tab keeps "id typed by hand" (`idEdited`) across openings.** The base recomputed it from the draft at each opening.

## Tests run

- `npm run -s typecheck`: clean.
- `npx vitest run tests/instructor-view-sessions.test.ts tests/instructor-profile-flush.test.ts tests/worksheet-export-race.test.ts`: 3 files, 9 tests passed. No existing test or assertion was changed.
- Related files: `architecture`, `case-export-race`, `case-lessons`, `case-worksheets`, `design-authoring`, `design-strip-progress`, `i18n`, `lessons-ui-core`, `teacher-lessons`, `worksheet-language`, `worksheets`, `learner-profile-flush`, `workspace-draft-flush`, `workspace-numeric-drafts`, `workspace-profiles`, `scenario-link`, `phase4-walk`. 17 files, 174 tests passed. The full suite was not run locally; CI runs it.
- `node --test tests/verification/*.test.mjs tests/browser/shard.test.mjs`: 66/66 passed.
- Browser journeys on the production build with the fix: `profile-session-safety` ✓ (121 s), `instructor-loading` ✓ (35 s) and `case-worksheet-exports` ✓ (56 s, 24/24 downloads).

## Size

`npx vite build; node scripts/bundle-budget.mjs`: **bundle budget: ok**. Bytes compared with a build of `origin/main` sources on the same machine:

| chunk | main | this branch | delta | ceiling |
|---|---:|---:|---:|---:|
| `author-view-*.js` | 26,358 B | 26,388 B | +30 B | 26.5 kB (26.4 shown) |
| `worksheet-view-*.js` (other chunks) | 18,292 B | 18,312 B | +20 B | other chunks 769.9 / 771.0 kB |
| `i18n-*.js` (holds `workspace/storage.ts`) | 1,723,438 B | 1,723,581 B | +143 B | 1723.6 / 1725.0 kB |
| `index-*.js` | 2,629,116 B | 2,629,121 B | +5 B | 2629.1 / 2632.0 kB |
| precache code | 14723.0 kB | 14723.2 kB | +0.19 kB (193 B) | 14724.0 kB |

No CSS was added and `budgets.json` is unchanged.

An earlier draft kept per-document state objects with re-reads and accessors. It put `author-view-*.js` at 26.8 kB, over its 26.5 kB ceiling, so this smaller design replaced it.

## Not in this step

M-LEARNING-003 (the worksheet number fields' typed text against the parsed value) was planned for the same PR because it is in the same file. It stays a separate item and step. This change does not touch the `number()` fields or `numeric-drafts`.
