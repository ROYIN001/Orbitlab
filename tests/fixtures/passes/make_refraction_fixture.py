"""P2.5 fixture: atmospheric refraction as Skyfield computes it (skyfield.earthlib.refract:
Bennett's formula, 1982, solved for the apparent altitude of a true one), at 10 °C and
1010 hPa, the conditions Meeus's formulae are for.

    python3 -m venv venv && venv/bin/pip install skyfield
    venv/bin/python make_refraction_fixture.py > skyfield-refraction.json
"""
import json
import skyfield
from skyfield.earthlib import refract

alts = [-0.5, 0, 0.25, 0.5, 1, 2, 3, 5, 7.5, 10, 15, 20, 30, 45, 60, 75, 89]
rows = [{'true': a, 'apparent': float(refract(a, 10.0, 1010.0))} for a in alts]
print(json.dumps({'generator': f'Skyfield {skyfield.__version__}, earthlib.refract, 10 C, 1010 hPa', 'rows': rows}, indent=1))
