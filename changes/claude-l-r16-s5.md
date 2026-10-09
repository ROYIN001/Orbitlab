## CHANGELOG

- Learner profiles (R1.6 PR4, M-PLATFORM-003/005/006): start-up, the profile list and the learner's name in the top bar read each stored learner once instead of several times, with no change to what is shown or stored. Measured in Node on five 1.3 MB learners: one list render 249 → about 35 ms, start-up 16 → 10 ms, the name 11.7 → 7.2 ms (median of 25, three runs each; no perf gate exists yet).

## PROGRESS

| R1.6 PR4 (M-PLATFORM-003/005/006, identical-output, wave K1) | In PR; not merged; not published | Start-up's legacy cleanup reads the record without a deep copy; the chooser snapshot reads the catalogue once and each record once (`rows()`), and a dialog render uses one snapshot (`canClose()`/`close()` still read live); the top-bar name comes from the record alone. Failing-first counters (`tests/workspace-read-counts.test.ts`): legacy record parses 4 → 3 at start-up, storage reads per snapshot 18/16 → 4 (5N+3 → N+1), name parses of the lessons value 1 → 0; the snapshot equals 007b039's algorithm byte for byte (durable, chooser, read-only, visit-only). EO-STO-1 unchanged, `tests/eo-sto/ref/` untouched; index chunk +241 B, profile-menu chunk +53 B, no ceiling raised; L | [R1.6 PR4 report](reports/R1.6-pr4-read-once.md) |
