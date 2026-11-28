# PF-15: Kepler propagation for every conic, held to an 80-digit solution

The work package is Task 3 of [S20-wave2.md](../plan/S20-wave2.md). The reference author's commits `96c98cc` (the two generators, the two fixtures and the three test files) and `5694add` (the count of the two-step cases written as 296) hold the reference side; this report covers the implementation. The implementer was blocked once, because `tests/astro-kepler.test.ts` asserted `n > 300` for a count that is 296 in the fixture, and `5694add` resolved it.

## What was built

- `src/astro/base/kepler.ts` (106 lines): `keplerUniversal(s, dt, mu)`, one universal-variable step for the ellipse, the parabola and the hyperbola, and `KEPLER_MAX_ITER`. It imports `State` from `./frames` as a type only, holds no mutable state, and each call returns a fresh object.
- Stumpff functions c2 and c3 with the series (twelve terms) wherever |psi| < 1; beyond, c2 in its half-angle form 2 sin^2(z/2)/z^2 (sinh for psi < 0) and c3 as (z - sin z)/z^3 (sinh for psi < 0).
- The solver: F(chi) = t(chi) - dt, which is monotonic in chi (its slope is r/sqrt(mu)). A bracket [0, w] (or [-w, 0] for dt < 0) is grown by doubling from min(sqrt(r0), sqrt(mu)|dt|/r0), so that sin and sinh stay finite; then Newton's method from chi = sqrt(mu)·dt/r0 clipped into the bracket, bisecting whenever a step leaves the bracket. It stops when the Newton step is 4 eps of chi or less, or when the bracket is 64 eps of chi wide (below that, rounding noise in t(chi) decides), or at the cap.
- The state is f·r + g·v and f'·r + g'·v with f = 1 - chi^2 c2/r0, g = dt - chi^3 c3/sqrt(mu), f' = sqrt(mu) chi (psi c3 - 1)/(r r0), g' = 1 - chi^2 c2/r, r taken from the norm of the new position.
- `dt = 0` returns a copy of the input, number for number. r = 0, mu <= 0 (or NaN), or any non-finite number in the state, dt or mu gives NaN in every number, whatever dt is, zero included. Nothing throws.
- Iteration cap: 100 passes of the solver (the doubling of the bracket has a cap of its own, 2,200). The most passes any of the 888 fixture cases took is 12; the most any call of the there-and-back runs took (the return legs from e = 10) is 22. 100 is four times the worst seen and costs 100 evaluations of two series at most. If the cap is ever reached, the function returns the state at the last iterate of chi, which is inside the bracket, with finite numbers; it does not return NaN and does not throw.

## Worst measured difference per case

Measured by a throwaway script over the fixture rows the test reads, not committed.

| Case | Bound | Measured worst |
|---|---|---|
| equals the 80-digit solution, 888 cases | 1e-3 m, 1e-7 m/s | 2.8e-6 m, 1.2e-9 m/s |
| there and back, 296 cases | 1e-2 m, 1e-5 m/s | 5.2e-5 m, 5.8e-8 m/s |
| angular momentum, 296 cases | 1e-11 relative | 3.7e-14 |
| energy, 296 cases | 1e-11 of mu/\|r0\| | 2.2e-14 |
| agrees with today's elliptic path, 240 cases | 0.5 m, 5e-4 m/s | 9.0e-2 m, 7.1e-5 m/s |
| ends on extreme inputs | six finite numbers, 200 ms | e = 10, dt = 1e12: 7 passes, 0.05 ms; e = 0.001, dt = +-1e9: 4 passes, 0.02 ms |

The step of zero, the bad-input case, the pin of today's elliptic path and the integrator tests pass as pass-or-fail cases.

## The deliberate breaks

Each made once on `kepler.ts`, the test file run, then restored (`cmp` against the saved copy shows no difference). The size of each miss over all 888 cases was measured by the same throwaway script.

- The textbook Stumpff forms, (1 - cos z)/psi, (z - sin z)/z^3 and their hyperbolic counterparts, with the series below |psi| = 1e-6 only: 3 failed, 5 passed. Failed: `equals the 80-digit solution` (first failure the velocity at e = 0.999999, r_p = 6.578e6, nu = -2, dt = 3,600: 5.5e-7 m/s against 1e-7), `there and back` (e = 0.999999, nu = -2, dt = 86,400: 1.4e-2 m against 1e-2) and `keeps angular momentum and energy` (same orbit, dt = 3,600: 1.4e-11 against 1e-11). Over all rows 58 cases are beyond the bound of the first case, the worst 1.55e-2 m and 1.24e-6 m/s (at e = 0.999999, nu = -0.3, dt = 86,400). The plan's pre-check named other rows for this form (2.4e-2 m at e = 1 + 1e-6, 7.4e-7 m/s); the sizes measured here are those above.
- The leading term of c3, the 1/6, halved to 1/12: 4 failed, 4 passed. Failed: `equals the 80-digit solution` (first failure e = 0, r_p = 6.578e6, nu = -2, dt = 600: 1.9e5 m), `there and back` (1.2e6 m), `keeps angular momentum and energy` (angular momentum 5.1e-2) and `agrees with the app's present elliptic path`. 633 of the 888 cases are beyond the bound, the worst 9.7e8 m and 1.0e4 m/s.

## Size

`kepler.ts` is 106 lines, 4,451 bytes; minified with rolldown it is 1,425 bytes (824 gzip -9). Nothing outside `src/astro` imports it, so the app's bundle cannot change.

The pull request's lines by part (`git diff --stat` of the two reference commits plus this one): `kepler.ts` 106, `tests/astro-kepler.test.ts` 135, `tests/kepler-elliptic-pin.test.ts` 21, `tests/integrator-convergence.test.ts` 131, `mpmath-kepler.json` 23,098, `today-elliptic.json` 210, `make_kepler_fixture.py` 132, `make_elliptic_pin.mjs` 57, this report, the change fragment. The source is 106 lines, under the 400 the plan names, so no reason to pass it is needed.

## Runs (once each before hand-off)

- `npx vitest run tests/astro-kepler.test.ts tests/kepler-elliptic-pin.test.ts tests/integrator-convergence.test.ts`: 13 of 13 pass (3 files).
- `npm run -s typecheck`: clean.
- `select-checks.mjs` for the four files lists 11 unit files (`tests/architecture.test.ts`, `astro-frames`, `astro-geodesy`, `astro-kepler`, `astro-sun-moon`, `astro-time`, `bundle-budget`, `integrator-convergence`, `kepler-elliptic-pin`, `privacy-inventory`, `repo-hygiene`), browser 0 of 54, heavy 0 of 34, fleet 0 of 6. Run on exactly those files: 94 of 94 pass (11 files).
- `npx vite build && node scripts/bundle-budget.mjs`: `bundle budget: ok`.

## Findings about today's code that this task does not change

These are the plan's pre-checked findings (`pf15_kepler_precheck.py`, `pf15_today_kepler_probe.ts.txt`, `pf15_integrator_precheck.ts.txt`), not measurements of this task, except where the table above says otherwise (the 240-case agreement is measured here).

- A universal-variable step in doubles with careful Stumpff functions against the 80-digit route, 1,776 cases: worst 1.0e-5 m and 3.1e-9 m/s; the textbook forms give 5.1e-2 m and 7.4e-7 m/s. Angular momentum kept to 9.8e-14, energy to 4.0e-14 of mu/r0; there and back leaves 7.9e-5 m and 9.4e-8 m/s.
- Today's e >= 1 fallback, transcribed: 5.78 km off after 600 s and 61.3 km after an hour, for e = 1.04 from a 200 km perigee.
- Today's elliptic path against the 80-digit solution, worst over 40 cases for each eccentricity: e <= 0.1, 8.1e-7 m; e = 0.6, 9.0e-2 m; e = 0.9, 8.8e-7 m; 1 - e = 1e-2, 4.9e-5 m; 1e-3 and 1e-4, 0.43 m; 1e-6, 29 m; 1e-8, 23 km; 1e-10, 13,000 km. Where the switch at e = 1 should sit is a question for W-O's plan, because moving it changes elliptic outputs.
- The point-mass step schedule converges at about first order, not fourth: halving the step again divides the difference by 1.4 to 2.4. The integrator itself is fourth order.

## Not checked

The default, heavy and fleet suites (not selected). No browser run: the app does not call the module. A state with r parallel to v is outside the contract and was not tried. Many revolutions (dt of 1e9 s on a low orbit) return finite numbers; their accuracy was not measured.
