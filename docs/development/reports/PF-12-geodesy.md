# PF-12 step 1: WGS-84 geodesy, held to ERFA

Package PF-12 of plan S20 (the physics-foundation track), first module of the new base `src/astro/`. Nothing in the app imports it yet, so the app does not change. PF-02 (the area's rules) is part of the same commit.

## What was built

- `src/astro/base/geodesy.ts`: `geodeticFromEcef`, `ecefFromGeodetic`, `ellipsoidNormal`, `enuBasis`, `normalGravity`, and the constants `WGS84_A`, `WGS84_F`, `WGS84_B`, `WGS84_E2`. Radians, metres. It imports nothing.
- The inverse is Bowring's iteration, run to convergence under a cap of 12 passes. It stops early when the reduced latitude moves by less than 1e-16. The cap ends the loop for every input: NaN never satisfies the stop test, so it runs 12 passes and returns NaN. The worst fixture point needs 4 passes. Height is `p cos(lat) + z sin(lat) - a sqrt(1 - e2 sin2(lat))`, which holds at the poles. Longitude comes back in (-pi, pi].
- `normalGravity` is Somigliana's formula with the published constants.
- The rule `astro` in `scripts/verification/change-map.json` (its own tests only, plus the app build), and the fixture folder is excluded from the `test-harnesses` rule.
- `tests/architecture.test.ts`: `astro` joins `CORE_DIRS`; a new case fails if a file in `src/astro` imports from another `src` folder.

## The reference's inverse

This is the controller's measurement, not mine. Against a 40-digit mpmath solution for the stored x, y, z (4,429 points), the fixture's inputs `lat`, `lon`, `h` are right to 2.1e-16 rad and 1.3e-8 m. ERFA's own `gc2gd` is one pass of Halley's method (no loop in `gc2gde.c`). It is off by up to 2.6e-11 rad in latitude near 20,000 km (2.5e-12 below 2,000 km) and 1.4e-8 m in height. So the test compares the inverse with the fixture's inputs; `latBack` is recorded, not asserted. No bound was loosened (plan S20 amendment 7). My own inverse differs from `latBack` by up to 2.6e-11 rad, as expected.

## Worst measured difference per case

| Case | Bound | Measured worst |
|---|---|---|
| geodetic to Earth-fixed, distance to ERFA | 1e-6 m | 4.2e-9 m |
| Earth-fixed to geodetic, lat vs input | 1e-11 rad | 2.2e-16 rad |
| same, h vs input | 1e-6 m | 1.1e-8 m |
| same, lon vs input | 1e-11 rad | 4.4e-16 rad |
| same, h vs `hBack` | 1e-6 m | 1.1e-8 m |
| same, lon vs `lonBack` | 1e-11 rad | 4.4e-16 rad |
| round trip | 1e-6 m | 1.1e-8 m |
| normal: height change over a 1,000 m step | 1e-6 m | 1.1e-8 m |
| normal: lat and lon change | 1e-11 rad | 1.1e-16 rad |
| local frame: unit length and perpendicularity | 1e-15 | 2.2e-16 |
| app's present geodesy below 2,000 km: lat | 1e-9 rad | 2.2e-16 rad |
| same: h | 1e-3 m | 1.9e-9 m |
| normal gravity, relative | 5e-10 | 4.5e-13 |

Longitude range and degenerate inputs are pass or fail; both pass.

## The deliberate break

`WGS84_F` set to 0, test file run once, then restored. Three cases failed: `matches ERFA: geodetic to Earth-fixed`, `matches ERFA: Earth-fixed to geodetic` and `agrees with the app's present geodesy below 2,000 km`. Five passed: round trip, the normal, normal gravity (its constants are literals), longitude range and degenerate inputs. The round trip and the normal pass because they compare the module with itself. After the restore, 8 of 8 pass.

## Runs (Node v22.23.5; the project reference is 22.23.3)

- `npx vitest run tests/astro-geodesy.test.ts tests/architecture.test.ts`: 2 files, 15 of 15 pass.
- `npm run typecheck`: clean.
- `npx vite build && node scripts/bundle-budget.mjs`: `bundle budget: ok`. It printed `initial load 7 files, 5126.8 KB, 1443.9 gzip, 1134.6 brotli`. Nothing imports the new module; the figures were not compared with main.
- `node --test tests/verification/*.test.mjs`: 93 of 93 pass.
- `select-checks.mjs` for the geodesy file and fixture: `unit (5/369)` holding `tests/astro-geodesy.test.ts` and `tests/architecture.test.ts`, `heavy (0/34)`, `sixdof-fleet (0/6)`.

## Not checked

The full default, heavy and fleet suites (not selected for this change). Behaviour below -10 km or above 40,000 km. Inputs other than NaN, the centre and 1e12 m for the end-of-loop guarantee. No browser run: the app does not call the module.
