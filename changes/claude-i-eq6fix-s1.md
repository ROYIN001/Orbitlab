## CHANGELOG

- Tests (fix after EQ-6 step 3): the privacy journey waits for a language switch to apply before it opens About. Since the app loads Russian and Thai on demand, a switch to a language not yet read applies a moment later; the journey had opened About in between and read the English link. No change to the app.

## PROGRESS

| Fix: `privacy-offline` after EQ-6 step 3 (bug fix, standing approval) | In review | Pages run 45902336879 (main `c0e2ca75`, #249) failed in `browser (5)`: "ru: About links to …privacy.html#en". Cause: offline after a reload in a controlled page only Thai is loaded, so the switch to Russian awaits its chunk from the worker's cache (`src/i18n/loader.ts`), and the journey opened About before it applied; the page was still English, so the English link was right. Fix: `tests/browser/journeys/privacy-offline.mjs` waits for `<html lang>` to change after each switch. No assertion changed, no ceiling raised; the app unchanged. Rule 2: see the PR. The other journeys that switch language were checked: they switch on a first-visit page (all three loaded) or already wait. | — |
