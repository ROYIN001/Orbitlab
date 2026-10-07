## CHANGELOG

- Workspace (R1.6 PR 2c, M-PLAN-031, owner's card r16-2b-notice option a): while a stored mission from a newer version of Orbitlab, or one with settings put back to their defaults, is held, its notice also says that it is kept as it was stored until the learner changes it and that the first edit saves it in this app's format; the line goes once that edit is saved, and a mission of this version never shows it.

## PROGRESS

| R1.6 PR 2c (M-PLAN-031, r16-2b-notice option a, wave K1) | In PR; not merged; not published | New key `share.notice.held` (en, ru, th; th as the owner wrote it), shown as a second paragraph in the existing `.share-notice` element of the setup panel's "Share & save" section when `missionNotice(…, 'stored')` is the warn notice (newer version or settings reset); not for a link, a file or an unusable document. `WorkspaceMission.held` and `MissionShare.release()` drop the line on the first preview after the hold ends. Failing-first: 2 new tests in `tests/workspace-mission.test.ts` and 2 new checks in the `stored-mission-newer` journey fail on main and pass after; no existing assertion changed; no CSS; i18n chunk 1723.6 → 1724.2 kB, index chunk 2629.2 → 2629.5 kB, precache code 14688.1 → 14689.0 kB | `stored-mission-newer` journey passed locally |
