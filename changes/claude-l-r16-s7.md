## CHANGELOG

- Storage (R1.6 PR7, M-PLATFORM-010, D-68): uploaded audio from before learner profiles now moves to the first learner one recording at a time, so one recording that collides with the learner's own audio no longer keeps all the others hidden; both colliding copies are kept unchanged (the original stays in place, unowned), the learner is told once in three languages, and later starts no longer re-run the migration.

## PROGRESS

| R1.6 PR7 (M-PLATFORM-010, wave K1) | In PR; not merged; not published | `migrateLegacyMedia` moves each legacy track in its own IndexedDB transaction and leaves a colliding original in place, unowned (ADR amendment to R1.1 per D-68, in the report); the migration is marked done when every non-colliding track moved, with a one-time "both copies kept" notice (en/th/ru); a failed move keeps that original, does not undo the others, and is retried at the next start; catalogue format unchanged; the one R1.1 abort assertion changed per D-68; bug-fix, L | [R1.6 PR7 report](reports/R1.6-pr7-media-migration.md); IDB double (1 colliding + 2 non-colliding) and the new `legacy-media-migration` journey failed before and pass after; `learner-profiles` and `profile-session-safety` passed locally; precache code +1,139 B, 217 B over the code ceiling (owner decides under D-38; `budgets.json` not edited) |
