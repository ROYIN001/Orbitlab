## CHANGELOG

- Storage (R1.6 PR2): one damaged learner profile, or one made by a newer version of the app, no longer hides every profile in the chooser or makes Export all and audio export fail; it is listed with an explanation and its stored data is kept unchanged, and you can save a copy of it, or delete it after confirming.

## PROGRESS

| R1.6 PR2 (M-PLATFORM-004, wave K1; builds on PR1) | In PR; not merged; not published | One unreadable or newer profile record no longer empties the chooser: `listWithStatus()` returns healthy rows plus rows marked unreadable/newer (bytes untouched); the chooser explains them and offers a raw copy, audio export, or delete on explicit confirmation; Export all exports the readable profiles and says which were left out; audio export reads only its target; EN/TH/RU strings in the profile mini-i18n; bug-fix, L (+L-UI strings) | [R1.6 PR2 report](reports/R1.6-pr2-unreadable-rows.md); `learner-profiles` journey to be run by the integration session; follow-up R1.6-FU-SEL (unreadable *selected* profile keeps the tab visit-only on reload) |
