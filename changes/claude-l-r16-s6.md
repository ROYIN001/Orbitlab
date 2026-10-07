## CHANGELOG

- Storage (R1.6 PR6): a learner workspace backup close to the 8 MB limit is now always a file the app can restore (it is saved in compact form when the indented form would be over the limit; normal-size backups are byte for byte the same as before), and deleting a profile is refused in visit-only mode, so it can never remove the saved profile's audio.

## PROGRESS

| R1.6 PR6 (M-PLATFORM-008, M-PLATFORM-009, wave K1) | In PR; not merged; not published | Export and Export all make the saved text once, check that exact text against the 8 MB import limit and download the same text (indented as before, compact when only that fits, `oversize` when neither fits); no second stringify/clone in `exportProfile`/`exportAll`; `delete()` in visit-only mode throws `locked` before media is touched; normal-size export bytes compared with main's in a fixture test; bug-fix, L | [R1.6 PR6 report](reports/R1.6-pr6-backup-safety.md); `learner-profiles` and `profile-session-safety` journeys passed locally |
