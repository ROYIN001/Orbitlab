## CHANGELOG

- Launch (CO-4 s2, M-LAUNCH-011, P1): the camera-sequence dialog no longer says a manual view lasts only until the next phase; it says a manual choice lasts until you pick Cinematic (R2.2), in TH/EN/RU, and is shorter than before in each.

## PROGRESS

| CO-4 s2 (M-LAUNCH-011, P1, wave K1, lane I) | In PR; not merged; not published | The dialog's lead (`cam.intro`) still stated the pre-R2.2 rule ("A manual choice lasts until the next phase begins"). Now it names the Cinematic control by its label ("Cinematic" / “อัตโนมัติ” / «Авто»), which with the dialog's own switch is what ends a manual choice (ADR-CameraPolicy); 87→84, 77→75, 89→86 characters. New `tests/camera-dialog-copy.test.ts` renders the dialog in each language against a real `CameraPolicy` (10 tests; 6 failing first on `4de951f`); ad-hoc browser check of the dialog in EN/TH/RU on the branch build; no new strings, no CSS; i18n-*.js −18 B, every other group unchanged against `origin/main` 4de951f | [CO-4 s2 report](reports/CO-4-s2.md) |
