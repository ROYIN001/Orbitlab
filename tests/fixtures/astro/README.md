# Reference fixtures for src/astro

Each fixture here is written by the generator script beside it, never by hand,
and the JSON names that script and the library versions that made it. The
references are independent implementations: ERFA (through pyerfa), Skyfield,
sgp4, jplephem, and mpmath for closed forms at 50 digits.

    python3 -m venv astro-venv            # keep it outside the repository
    astro-venv/bin/pip install -r tests/fixtures/astro/requirements.txt
    astro-venv/bin/python tests/fixtures/astro/geodesy/make_geodesy_fixture.py

A generator writes its JSON next to itself. Units are radians, metres,
seconds; floats carry 17 significant digits. JPL kernels (e.g. DE421) are
downloaded when a generator needs one, never committed.
