# Evidence scripts of the physics-foundation track (plan S20)

Measurements made by the orchestrating session, kept so that a claim in the plan can be
run again. They are not fixtures and no test reads them. They use the Python environment
of `../requirements.txt` (see `../README.md`) and are run by hand.

| Script | What it shows | Where it is cited |
|---|---|---|
| `erfa_inverse_accuracy.py` | ERFA's inverse geodetic transform against a 40-digit solution: off by up to 2.6e-11 rad near 20,000 km, while the inputs of its forward transform are right to 2.1e-16 rad | S20 amendment 7; `tests/astro-geodesy.test.ts` |
| `heldout_geodesy.py`, `check_geodesy.mjs` | a held-out set for the geodesy module (4,228 seeded points, hard points near the poles, the equator and the ±π seam) and its checker | the gate of PF-12 (`docs/development/reports/PF-12-geodesy.md`, HANDOVER-S20 §4) |
| `heldout_time.py`, `check_time.mjs` | a held-out set for the time module (seeded instants from pyerfa: 4,377 for TAI − UTC with both sides of every step, round trips, 2,000 for UTC→TT, 4,000 for TDB − TT, Earth-orientation instants) and its checker, which also compares the Earth orientation with today's arithmetic on the app's data file | the gate of PF-10 (`docs/development/reports/PF-10-time.md`) |
| `heldout_sun_moon.py`, `check_sun_moon.mjs` | a held-out set for the Sun and Moon module (3,012 seeded instants from pyerfa `moon98` and `plan94` over 1900 to 2100, the date split four ways, with the ends of `plan94`'s fitted span by hand; 2,000 instants from JPL DE421 over 1950 to 2050) and its checker | the gate of PF-14 (`docs/development/reports/PF-14-sun-moon.md`) |
| `pf10_pf11_prechecks.py` | whether a correct implementation can meet three bounds of the next two packages: the check against today's `temeToItrf` (it could not at 1e-4 m), the velocity formula, the two-term TDB − TT | S20 amendment 8; S20-wave1 Tasks 2 and 3 |
| `pf11_chain_choice.py` | why PF-11 uses the IAU 2000B chain: it is within 1.1 mas of the full IAU 2006/2000A chain, where the 1976/1980 chain is 0.05 to 0.12 arcsecond off; and the planned TEME is within 0.6 mas of Skyfield's | S20 amendments 1 and 2 |
| `pf10_roundtrip_precheck.py` | the round trip UTC→TAI→UTC by the work plan's one correction pass, beside every step of TAI − UTC from 1961 to 2017: within 1e-11 s at the leap seconds, up to 3.2e-9 s in the seconds before a step of the drift table | S20 amendment 10; S20-wave1 Task 2 |
| `pf11_ut1_precheck.py` | which UT1 the frames fixture must use: ERFA's `utcut1` and this base's UTC + dut1 agree from 1972 on and differ by up to 2.3 ms at the fixture's two drift-year instants | S20 amendment 12; S20-wave1 Task 3 |
| `pf11_roundtrip_precheck.py` | what a state's round trip GCRF→ITRF→GCRF leaves on ERFA's own matrices (8.5e-9 m, 1.0e-11 m/s at orbital speed), and the velocity formula for a moving point (5.5e-5 m/s) | S20 amendment 12; S20-wave1 Task 3 |
| `pf13_gravity_precheck.py` | PF-13's bounds before the work: a Cunningham recursion in doubles against a 40-digit evaluation of EGM2008 to degree and order 20 (1.1e-15), the spin axis, a field cut at each degree, the potential, J2 and J2 to J4 against the app's two closed forms (5.1e-16, 6.5e-16), the numerical gradient and divergence, and what the bound cannot see | S20 amendment 14; S20-wave2 Task 1 |
| `pf14_sun_moon_precheck.py` | which series for the Sun and the Moon: ERFA `moon98` and `plan94` against DE421 over 1950 to 2050 (Moon 0.0051°, Sun 0.0022° at worst), and the Sun without the Moon's pull on the Earth (0.0039°) | S20 amendment 14; S20-wave2 Task 2 |
| `pf15_kepler_precheck.py`, `pf15_today_kepler_probe.ts.txt` | a universal-variable Kepler step in doubles against an 80-digit classical solution for every conic (3.2e-6 m with careful Stumpff functions, 2.4e-2 m with the textbook forms); today's fallback for e ≥ 1 (5.8 km in ten minutes); today's elliptic path as e nears 1 (29 m at 1 − e = 1e-6) | S20 amendment 14; S20-wave2 Task 3 |
| `pf15_integrator_precheck.ts.txt` | what today's integrators give against exact solutions: `rk4Step` is fourth order (ratios 16.0 to 16.5), Dormand–Prince answers to its tolerance, and the point-mass step schedule converges at about first order | S20 amendment 14; S20-wave2 Task 3 |
| `pf16_orekit_trial.py` | Orekit 13.1.9 runs here; its EGM2008 field, its Earth-fixed frame, its Sun and Moon against the reference tools the base is held to; the six orbits of the work plan at every level of force model, with the size of each term in position and velocity and the reference's own noise | S20 amendment 14; S20-wave2 Task 4 |
| `pf04_precheck.ts.txt` | PF-04's two suspects with the app's own code: the Lambert rendezvous planned and flown with one J2 flag arrives 15 to 60 km from its target; the station transfer's solver converges on sixteen nominal flights | S20 amendment 14; S20-wave2 Task 6 |

## How to run them

From this folder, with the virtual environment of `../README.md` (Python 3.13 was used) and
Node 22 for the one `.mjs` file. Each script's first lines say what it found, on 2026-11-26 or on 2026-11-27 for those of the second work plan;
a run should print the same figures.

    VENV=/path/to/astro-venv/bin/python
    $VENV erfa_inverse_accuracy.py ../geodesy/erfa-geodesy.json    # about 10 s
    $VENV heldout_geodesy.py /tmp/heldout.json                     # writes 4,228 points
    node check_geodesy.mjs "$(git rev-parse --show-toplevel)" /tmp/heldout.json   # ends "all inside the bounds"
    $VENV heldout_time.py /tmp/heldout-time.json                   # a few seconds
    node check_time.mjs "$(git rev-parse --show-toplevel)" /tmp/heldout-time.json   # ends "all inside the bounds"
    $VENV heldout_sun_moon.py /path/to/the/folder/of/de421.bsp /tmp/heldout-sun-moon.json   # about a minute; the kernel as pf14_sun_moon_precheck.py downloads it
    node_modules/.bin/rolldown <an entry that re-exports src/astro/base/sun-moon.ts> --format esm --file /tmp/sun-moon.mjs   # from the repository root (HANDOVER-S20 section 5, trap 9)
    node check_sun_moon.mjs /tmp/sun-moon.mjs /tmp/heldout-sun-moon.json                    # ends "all inside the bounds"
    $VENV pf10_pf11_prechecks.py                                   # about 1 minute
    $VENV pf10_roundtrip_precheck.py                               # about 5 s
    $VENV pf11_ut1_precheck.py                                    # a second
    $VENV pf11_roundtrip_precheck.py                              # about two minutes
    $VENV pf11_chain_choice.py                                     # a few seconds; Skyfield's bundled timescale, no download
    $VENV pf13_gravity_precheck.py head.gfc                        # about 20 s; head.gfc is the first 60 kB of EGM2008.gfc (the script's first lines give the command)
    $VENV pf14_sun_moon_precheck.py                                # about a minute; downloads de421.bsp (17 MB) to the current folder
    $VENV pf15_kepler_precheck.py                                  # about 20 s
    OREKIT=/path/to/orekit-venv/bin/python                         # orekit_jpype 13.1.9.0 with the pins of ../requirements.txt, and Java 17 or later
    $OREKIT pf16_orekit_trial.py orekit-data-main.zip head.gfc /tmp/orekit-scratch   # about 20 s; the archive of orekit-data at the commit the script names

The three `.ts.txt` files are scratch tests of the app's own code, kept as text so that no suite picks
them up. Their first lines say how to run one: copy it to `tests/` under a `.test.ts` name, run that one
file with vitest, delete the copy.

A held-out set is useful only while the writers of a module have not seen it. For a new
module the orchestrating session writes a new one and commits it after the package merges.
