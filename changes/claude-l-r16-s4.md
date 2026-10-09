## CHANGELOG

- Learner profiles (R1.6-FU-SEL, P1 fix): when the learner chosen in a tab cannot be read (damaged, from a newer version, or gone), Orbitlab opens the list of learners, where that learner's row offers a copy of its stored data and delete. It used to open a temporary visit-only workspace that saved nothing, on every reload, and even in a new tab when it was the device's only learner.

## PROGRESS

| R1.6-FU-SEL (follow-up of R1.6 PR2, P1 bug-fix, wave K1) | In PR; not merged; not published | `initialize()`: an `invalid`/`newer`/`missing` selected record releases the owner lock, records the code as a notice, clears the tab's selection and opens the chooser instead of visit-only; stored bytes untouched. Failing-first `tests/workspace-selected-unreadable.test.ts` (4 cases fail on 007b039, pass after); the existing M-PLATFORM-001 assertion `'ephemeral'` → `'chooser'` in its own commit, approved by the owner (decision card q15, option A, 2026-10-09); EO-STO-1 unchanged, `tests/eo-sto/ref/` untouched; USER-GUIDE and IMPLEMENTATION-STATUS updated; index chunk +261 B, no ceiling raised; L | [R1.6-FU-SEL report](reports/R1.6-fu-sel-selected-unreadable.md) |
