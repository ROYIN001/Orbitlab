## CHANGELOG

- Astro (PF-10): `src/astro/base/time.ts`, UTC, TAI, TT, UT1 and TDB on two-part Julian dates and the Earth-orientation lookup for the new physics base (not yet called by the app), held to ERFA's `dat`, `utctai`, `taitt` and `dtdb` and to the app's present `eopAt`.

## PROGRESS

| PF-10 (S20 wave 1, time scales) | Merged, waiting for publish (PR #N, CI run N on <sha>) | The time module with its ERFA fixture and test: TAI − UTC from ERFA's `dat.c` tables, two-part conversions, a two-term TDB − TT within 34 µs of ERFA, and Earth orientation equal to the app's present function. A non-finite input gives NaN in every number returned. 54 of 54 unit tests (the six files run), typecheck, bundle budget ok with nothing imported | [PF-10](reports/PF-10-time.md) |
