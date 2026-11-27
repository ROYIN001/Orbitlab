## CHANGELOG

- Astro (PF-14): `src/astro/base/sun-moon.ts` with its series tables in `sun-moon-tables.ts`, the Moon by ERFA's `moon98`, the Earth–Moon barycentre by `plan94` and the geocentric Sun formed from the two, for the new physics base (not yet called by the app), held to ERFA and to JPL DE421.

## PROGRESS

| PF-14 (S20 wave 2, the Sun and the Moon) | In review (PR and CI run to be filled in) | The Sun and Moon module and its ERFA and DE421 fixtures and test: an ERFA port of `moon98`, `plan94` (body 3) and their helpers, every term kept; equal to ERFA at the 65 instants (Moon 6.7e-8 m and 2.3e-13 m/s, bounds 1e-3 m and 1e-8 m/s; barycentre and Sun 1.4e-4 m and 2.7e-11 m/s, bounds 1e-1 m and 1e-6 m/s); against DE421 at 400 instants the Moon 0.00286°, 0.00243 %, 0.120 m/s, the Sun 0.00200°, 0.00076 %, 1.917 m/s. Two deliberate breaks (the Moon's term out of the Sun; the E factor out of the Moon) each failed two cases (made on the 8-case version). The review round added the node case and five instants with a non-dyadic second part, and named the two new files in NOTICE's licence sentence. A non-finite input gives NaN in every number returned. 80 of 80 unit tests (the eight files run, 8 cases in the Sun and Moon test; 9 of 9 in it after the review round), typecheck, bundle budget ok with nothing imported | [PF-14](reports/PF-14-sun-moon.md) |
