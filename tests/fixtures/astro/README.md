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
downloaded when a generator needs one, never committed: Skyfield's
`load('de421.bsp')` fetches the kernel (17 MB) from JPL into the current folder,
and a generator that uses it writes the file's SHA-256 into its fixture.

Python 3.13 was used; any version the pinned packages support will do.

The ERFA C sources (for a port, or to read how a reference works) are in the
pyerfa source archive, under `liberfa/erfa/src/`, with the licence beside them.
`pip download --no-binary` builds the package and does not return; fetch the
archive itself, outside the repository:

    URL=$(curl -s https://pypi.org/pypi/pyerfa/2.0.1.5/json | python3 -c "import json,sys; print([u['url'] for u in json.load(sys.stdin)['urls'] if u['packagetype'] == 'sdist'][0])")
    curl -sL "$URL" -o pyerfa-2.0.1.5.tar.gz && tar -xzf pyerfa-2.0.1.5.tar.gz pyerfa-2.0.1.5/liberfa/erfa

PyPI, JPL and the IERS were reachable from the cloud environment on 2026-11-26.

`evidence/` holds measurements that back a claim in plan S20 (the accuracy of
a reference, a held-out set, the pre-check of a bound). No test reads them;
its README says what each one shows.
