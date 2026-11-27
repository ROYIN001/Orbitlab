# privacy-offline after EQ-6 step 3: About opened before the language switch applied

Since #249 (EQ-6 step 3, the language loader) every "Deploy to GitHub Pages" run has failed in the browser journey `tests/browser/journeys/privacy-offline.mjs`, so nothing has been published since #247 (`4b55982`). This report gives the cause, the evidence before and after, and the fix. Tests only; no app code.

```yaml
change_kind: bug-fix (tests)
lane: I
items: [M-PLATFORM-031]   # EQ-6 step 3's follow-up
failing_before_fix: [browser journey privacy-offline on main c9378217, 1 of 1 locally; Pages runs 45902336879, 46004994688, 46032866391, 46036316514, 46045368062]
allowed_write_paths: [tests/browser/journeys/privacy-offline.mjs, docs/development/reports/privacy-offline-language-switch.md, changes/claude-i-eq6fix-s1.md]
app_code: none
rollback: {method: revert, data_compat: "no app, manifest or stored-data change"}
```

The fix and its fragment were written on 2026-11-26 by the session that did EQ-6 step 3 (pull request #253, left as a draft with its twenty-run commit in place). On 2026-11-27 the owner told the session that orchestrates the S20 track, in chat, "รับช่วงทำ #253 ให้จบได้เลย" (take #253 over and finish it); that session added this report, the review, the local runs and the merge.

## The failure

```
[privacy-offline] FAIL: ru: About links to http://127.0.0.1:<port>/Orbitlab/privacy.html#en
```

in `browser (5)` of Pages runs 45902336879 (#249), 46004994688 (#252), 46032866391 (#255), 46036316514 (#254) and 46045368062 (#256). The journey is not a smoke journey (`smoke = false`), so pull-request CI does not run it and only the Pages run showed the failure.

## Cause

Since EQ-6 step 3 only English is in the main bundle; Russian and Thai are chunks read on demand (`src/i18n/loader.ts`). A language switch is therefore asynchronous: the select's `change` handler calls `ensureLang(l)` and, when the dictionary has been read, `setLang(l)` and `applyLanguage()` (`src/main.ts`). Under Orbitlab's own controlling service worker the start loads only the language in use. The journey opens in Thai, reloads with the network cut, and then asks for Thai, English and Russian in turn. Russian has to come from the worker's cache, and the journey opened About straight after `selectOption`, while the page was still in English. About builds its link from the current language when it opens (`src/ui/dialogs.ts`), so the English link was the right one for that moment. The app behaved as designed; the test read too early.

`setLang` sets the current language and `<html lang>` in one synchronous step, so `<html lang>` cannot change before the link's language does.

## Fix

After each `selectOption` the journey waits (up to 15 s) for `document.documentElement.lang` to equal the language asked for, then opens About. Three lines added. No existing check changed or removed, no existing timeout lengthened.

## Before and after

| Where | Without the fix | With the fix |
|---|---|---|
| This machine, one build of main `c9378217`, `node tests/browser/run.mjs privacy-offline` | fails, with the message above (28.3 s) | passes (27.6 s) |
| CI | the five Pages runs above | rule 2, below |

The first session reported that the journey passed locally before and after; on this machine, on 2026-11-27, it failed before and passed after, one run each.

## Rule 2: twenty runs on CI

The temporary commit `256f349d` made CI's five smoke shards run only `privacy-offline`, four times each (CI run 45906584569); it is reverted in this branch.

| Shard | Passed | Seconds per run |
|---|---|---|
| browser-smoke (1) | 4 of 4 | 121.5, 108.4, 104.6, 109.0 |
| browser-smoke (2) | 4 of 4 | 110.6, 113.6, 106.5, 112.0 |
| browser-smoke (3) | 4 of 4 | 113.0, 103.2, 104.5, 108.8 |
| browser-smoke (4) | 4 of 4 | 121.0, 110.2, 115.7, 112.2 |
| browser-smoke (5) | 4 of 4 | 81.3, 82.7, 87.0, 84.5 |

20 of 20, with no `FAIL:` line in any log. Each shard's job is red in that run for one reason, the same in all five, `Executed browser journeys differs from the verification plan`: the verification contract noticing that the temporary commit ran other journeys than the plan lists.

## Review

A second agent read the change against `src/main.ts`, `src/i18n/loader.ts`, `src/i18n/index.ts` and `src/ui/dialogs.ts`: pass, no Critical or Important finding. It confirmed the cause, that the wait is a sufficient condition, that a failed load offline resets the select to the language in use (so the select and the page never disagree), and that the other journeys that switch language do so on a first-visit page with all three dictionaries loaded, with the service worker blocked, or already wait. Its Minor points: a timeout of the new wait would carry Playwright's generic message rather than one naming the language (not changed: a change to the journey would need its twenty runs again), and the wait would also pass if the page were already in the language asked for, which the link's own check still covers.

## Not checked

Whether the worker serves the Russian chunk from its cache offline is the subject of the journey `i18n-loader`, not of this one. The other journeys that switch language were read, not run. The Pages run after this merge is the first that can show the journey passing where it failed.
