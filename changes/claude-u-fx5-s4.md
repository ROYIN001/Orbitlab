## CHANGELOG

- Launch (FX-5, M-LAUNCH-034; D-45): the Monte Carlo CSV download now goes through the app's shared download (the file's link is kept 5 s, not 1 s, so a large file is not cut off); a CSV text cell holding a carriage return is quoted; a text cell starting with = + - or @ gets a leading ' so a spreadsheet keeps it as text, not a formula, in the Monte Carlo and flight-data CSVs as already in the lesson re-check CSV (one shared writer, `src/csv-text.ts`); numbers are written as before.

## PROGRESS

| FX-5 step 4 (M-LAUNCH-034, P2 bug-fix; plan wave K2, done in the K1 overnight run) | In PR; not merged; not published | Monte Carlo CSV used its own download (URL revoked after 1 s), did not quote `\r` and had no formula guard; the flight-data CSV had no guard either. One text-cell writer `src/csv-text.ts` (the re-check CSV's, moved unchanged) now serves the Monte Carlo, flight-data and re-check CSVs; Monte Carlo download through `downloadBlob` (5 s). New `tests/csv-export-cells.test.ts`: 4 of 6 fail on `1a7960e`, 6/6 after; a real six-DOF flight CSV (1 916 876 bytes) is byte-identical before and after; precache code 14723.3 → 14723.0 kB on main `1a7960e` (ceiling 14724), CSS and i18n unchanged; physics-lane review wanted for the 2-line change in `src/physics/monte-carlo.ts` | [FX-5 step 4 report](reports/FX-5-s4-csv-export.md) |
