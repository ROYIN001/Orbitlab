## What this changes

<!-- One or two sentences: what the reader of the site or the code will notice. -->

## How it was tested

<!-- Name the targeted test files and commands you ran, with their pass counts. -->

## What reviewers should look at

<!-- The risky hunk, a judgement call, or anything you are unsure of. -->

## Checklist

- [ ] Built-in flights unchanged: no fingerprint or golden re-recorded, or re-recorded with the reason written beside the golden and a note in docs/VALIDATION.md §10
- [ ] en/ru/th dictionaries complete (tests/i18n.test.ts green)
- [ ] No new runtime dependency; a dev dependency only with a written reason
- [ ] A physics or data change cites its published source and adds or updates its test
- [ ] Docs updated where they describe the change (README, IMPLEMENTATION-STATUS, USER-GUIDE)
- [ ] Probe and scratch files deleted; no evidence binaries committed (no tracked file over 1 MB outside public/)
- [ ] Session notes under docs/history/<date>/ when the session produced findings
- [ ] One line added to CHANGELOG.md
- [ ] Targeted tests run and named above
- [ ] For a UI change, the affected browser journey passes
