## CHANGELOG

- Lessons (FX-2 step 2, M-LEARNING-004): when a worksheet form or lesson draft could not be saved (for example, storage was full), opening its tab again now shows that unsaved edit, and switching profiles no longer writes the older edit over a newer one saved since; opening the Worksheets tab again keeps the same class code, and the tabs no longer pile up a save hook on each opening.

## PROGRESS

| FX-2 step 2 (M-LEARNING-004, wave K1) | In PR; not merged; not published | The Worksheets and author tabs now keep one view per document (`keptForWorkspace` in `workspace/storage.ts`). A later opening reuses it, with its unsaved edits, class code and single flusher. Before, each opening added a flusher, and an older failed save could overwrite a newer edit at the profile switch. Regression `instructor-view-sessions` (real repository, storage double that fails then succeeds) failed 4/4 before the fix. Journeys `profile-session-safety`, `instructor-loading` and `case-worksheet-exports` pass. Precache code +0.19 kB; budget ok. L-UI, bug-fix, P2 | [FX-2 s2 report](reports/FX-2-s2-reopened-views.md) |
