## CHANGELOG

- Astro (PF-15): `src/astro/base/kepler.ts`, `keplerUniversal`, one universal-variable Kepler step for the ellipse, the parabola and the hyperbola, held to an 80-digit solution at 888 cases; a pin of today's elliptic path and convergence tests for the integrators (not yet called by the app).

## PROGRESS

| PF-15 (S20 wave 2, Kepler propagation for every conic) | In review (PR and CI run to be filled in) | `keplerUniversal` with Stumpff functions that keep their digits near zero and Newton's method inside a bracket (cap 100 passes, at most 12 taken by a fixture case); equal to the 80-digit solution at 888 cases within 2.8e-6 m and 1.2e-9 m/s (bounds 1e-3 m, 1e-7 m/s). Two deliberate breaks (textbook Stumpff forms; the 1/6 of c3 halved) failed 3 and 4 cases. 13 of 13 in the three test files, 94 of 94 in the 11 selected unit files, typecheck, bundle budget ok with nothing imported | [PF-15](reports/PF-15-kepler.md) |
