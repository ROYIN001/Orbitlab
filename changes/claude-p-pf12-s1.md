## CHANGELOG

- Astro (PF-12): `src/astro/base/geodesy.ts`, WGS-84 geodesy for the new physics base (not yet called by the app), held to ERFA and to closed-form normal gravity; the new area's change-map rule and import boundary.

## PROGRESS

| PF-12 step 1 + PF-02 (S20 wave 1, geodesy and the area's rules) | Merged, waiting for publish ([PR #251](https://github.com/ROYIN001/Orbitlab/pull/251), CI run 45899788467 on `a2a51be6`) | The geodesy module with its ERFA fixture, test and the `astro` rule in the change map and architecture test; the branch also carries two plan amendments, aa6010d2 (amendment 6, two bounds set at what double precision can resolve), f33db4b7 (amendment 7, the inverse judged against the fixture's inputs, since ERFA's one-pass inverse is off by up to 2.6e-11 rad) and 61b79d1a (the plan's table brought in line with its review focus). A non-finite input gives NaN in every number returned. 41 of 41 unit tests (the five files the change map selects), typecheck, 93 of 93 verification tests, bundle budget ok with nothing imported | [PF-12](reports/PF-12-geodesy.md) |
