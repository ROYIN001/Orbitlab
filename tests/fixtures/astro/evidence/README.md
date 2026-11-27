# Evidence scripts of the physics-foundation track (plan S20)

Measurements made by the orchestrating session, kept so that a claim in the plan can be
run again. They are not fixtures and no test reads them. They use the Python environment
of `../requirements.txt` (see `../README.md`) and are run by hand.

| Script | What it shows | Where it is cited |
|---|---|---|
| `erfa_inverse_accuracy.py` | ERFA's inverse geodetic transform against a 40-digit solution: off by up to 2.6e-11 rad near 20,000 km, while the inputs of its forward transform are right to 2.1e-16 rad | S20 amendment 7; `tests/astro-geodesy.test.ts` |
| `heldout_geodesy.py`, `check_geodesy.mjs` | a held-out set for the geodesy module (4,228 seeded points, hard points near the poles, the equator and the ±π seam) and its checker | the gate of PF-12 (`docs/development/reports/PF-12-geodesy.md`, HANDOVER-S20 §4) |
| `heldout_time.py`, `check_time.mjs` | a held-out set for the time module (seeded instants from pyerfa: 4,377 for TAI − UTC with both sides of every step, round trips, 2,000 for UTC→TT, 4,000 for TDB − TT, Earth-orientation instants) and its checker, which also compares the Earth orientation with today's arithmetic on the app's data file | the gate of PF-10 (`docs/development/reports/PF-10-time.md`) |
| `pf10_pf11_prechecks.py` | whether a correct implementation can meet three bounds of the next two packages: the check against today's `temeToItrf` (it could not at 1e-4 m), the velocity formula, the two-term TDB − TT | S20 amendment 8; S20-wave1 Tasks 2 and 3 |
| `pf11_chain_choice.py` | why PF-11 uses the IAU 2000B chain: it is within 1.1 mas of the full IAU 2006/2000A chain, where the 1976/1980 chain is 0.05 to 0.12 arcsecond off; and the planned TEME is within 0.6 mas of Skyfield's | S20 amendments 1 and 2 |
| `pf10_roundtrip_precheck.py` | the round trip UTC→TAI→UTC by the work plan's one correction pass, beside every step of TAI − UTC from 1961 to 2017: within 1e-11 s at the leap seconds, up to 3.2e-9 s in the seconds before a step of the drift table | S20 amendment 10; S20-wave1 Task 2 |
| `pf11_ut1_precheck.py` | which UT1 the frames fixture must use: ERFA's `utcut1` and this base's UTC + dut1 agree from 1972 on and differ by up to 2.3 ms at the fixture's two drift-year instants | S20 amendment 12; S20-wave1 Task 3 |
| `pf11_roundtrip_precheck.py` | what a state's round trip GCRF→ITRF→GCRF leaves on ERFA's own matrices (8.5e-9 m, 1.0e-11 m/s at orbital speed), and the velocity formula for a moving point (5.5e-5 m/s) | S20 amendment 12; S20-wave1 Task 3 |

## How to run them

From this folder, with the virtual environment of `../README.md` (Python 3.13 was used) and
Node 22 for the one `.mjs` file. Each script's first lines say what it found on 2026-11-26;
a run should print the same figures.

    VENV=/path/to/astro-venv/bin/python
    $VENV erfa_inverse_accuracy.py ../geodesy/erfa-geodesy.json    # about 10 s
    $VENV heldout_geodesy.py /tmp/heldout.json                     # writes 4,228 points
    node check_geodesy.mjs "$(git rev-parse --show-toplevel)" /tmp/heldout.json   # ends "all inside the bounds"
    $VENV heldout_time.py /tmp/heldout-time.json                   # a few seconds
    node check_time.mjs "$(git rev-parse --show-toplevel)" /tmp/heldout-time.json   # ends "all inside the bounds"
    $VENV pf10_pf11_prechecks.py                                   # about 1 minute
    $VENV pf10_roundtrip_precheck.py                               # about 5 s
    $VENV pf11_ut1_precheck.py                                    # a second
    $VENV pf11_roundtrip_precheck.py                              # about two minutes
    $VENV pf11_chain_choice.py                                     # a few seconds; Skyfield's bundled timescale, no download

A held-out set is useful only while the writers of a module have not seen it. For a new
module the orchestrating session writes a new one and commits it after the package merges.
