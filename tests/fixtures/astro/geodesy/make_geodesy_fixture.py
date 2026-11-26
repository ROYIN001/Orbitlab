"""PF-12 fixture: WGS-84 geodetic <-> Earth-fixed points from ERFA, and normal gravity from
Moritz's closed forms in mpmath.

    python3 -m venv astro-venv && astro-venv/bin/pip install -r tests/fixtures/astro/requirements.txt
    astro-venv/bin/python make_geodesy_fixture.py
"""
import json, math
from pathlib import Path
import erfa, mpmath
from mpmath import mp, mpf

mp.dps = 50
OUT = Path(__file__).resolve().parent / 'erfa-geodesy.json'


def halton(i, base):
    f, r = 1.0, 0.0
    while i > 0:
        f /= base
        r += f * (i % base)
        i //= base
    return r


pts = []
for i in range(1, 201):
    u1, u2, u3 = halton(i, 2), halton(i, 3), halton(i, 5)
    pts.append((math.asin(2 * u1 - 1), math.pi * (2 * u2 - 1), -10e3 + (40e6 + 10e3) * u3 ** 2))
H = math.pi / 2
pts += [(H, 0.0, 0.0), (-H, 0.0, 0.0), (H, 0.0, 40e6), (-H, 0.0, 40e6),
        (0.0, 0.0, 0.0), (0.0, math.pi, 0.0), (0.0, -math.pi + 1e-12, 0.0),
        (0.7, 2.0, -10e3), (0.7, 2.0, 40e6),
        (H - 1e-9, 0.5, 500e3), (-(H - 1e-9), 0.5, 500e3),
        (1e-12, 0.3, 0.0), (-1e-12, 0.3, 0.0)]
assert len(pts) == 213

points = []
for lat, lon, h in pts:
    x, y, z = erfa.gd2gc(1, lon, lat, h)
    lonB, latB, hB = erfa.gc2gd(1, [x, y, z])
    points.append(dict(lat=lat, lon=lon, h=h, x=x, y=y, z=z, latBack=latB, lonBack=lonB, hBack=hB))

# Moritz's closed forms
a, finv, GM, w = mpf(6378137), mpf('298.257223563'), mpf('3.986004418e14'), mpf('7.292115e-5')
b = a * (1 - 1 / finv)
m = w ** 2 * a ** 2 * b / GM
ep = mpmath.sqrt(a ** 2 - b ** 2) / b
q0 = ((1 + 3 / ep ** 2) * mpmath.atan(ep) - 3 / ep) / 2
q0p = 3 * (1 + 1 / ep ** 2) * (1 - mpmath.atan(ep) / ep) - 1
ge = GM / (a * b) * (1 - m - m * ep * q0p / (6 * q0))
gp = GM / a ** 2 * (1 + m * ep * q0p / (3 * q0))
print('gamma_e', mpmath.nstr(ge, 15), 'gamma_p', mpmath.nstr(gp, 15))
assert mpmath.nstr(ge, 10) == '9.780325336' and mpmath.nstr(gp, 10) == '9.832184938', 'Moritz formulas off the published values'


def gamma(lat):
    c, s = mpmath.cos(lat), mpmath.sin(lat)
    return (a * ge * c ** 2 + b * gp * s ** 2) / mpmath.sqrt(a ** 2 * c ** 2 + b ** 2 * s ** 2)


gravity = [dict(lat=float(d * math.pi / 180), gamma=float(gamma(mp.pi * d / 180))) for d in (0, 15, 30, 45, 60, 75, 90)]

out = dict(generator=f'pyerfa {erfa.__version__}: gd2gc, gc2gd, ellipsoid n=1 (WGS84); mpmath {mpmath.__version__}',
           script='make_geodesy_fixture.py', points=points, gravity=gravity)


def f17(o):
    if isinstance(o, float):
        return float(f'{o:.17g}')
    if isinstance(o, dict):
        return {k: f17(v) for k, v in o.items()}
    return [f17(v) for v in o] if isinstance(o, list) else o


OUT.write_text(json.dumps(f17(out), indent=1) + '\n')
print(OUT, len(points), 'points', len(gravity), 'gravity rows')
