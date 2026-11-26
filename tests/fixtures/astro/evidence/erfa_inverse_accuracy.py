"""How accurate is ERFA's own inverse geodetic transform, gc2gd? (plan S20, amendment 7)

No app code is involved. For every point of a geodesy fixture the geodetic latitude and
height of the stored x, y, z are solved in 40-digit arithmetic (mpmath), and compared with
(a) the inputs that ERFA's forward transform gd2gc was given, and (b) what gc2gd returns.

Run:  python erfa_inverse_accuracy.py ../geodesy/erfa-geodesy.json [more.json ...]
Found on 2026-11-26 (pyerfa 2.0.1.5): the inputs are right to 2.1e-16 rad and 1.3e-8 m;
gc2gd, one pass of Halley's method, is off by up to 2.6e-11 rad near 20,000 km.
"""
import json
import math
import sys

from mpmath import mp, mpf, sqrt, sin, cos, findroot

mp.dps = 40
A = mpf(6378137)
F = 1 / mpf('298.257223563')
E2 = F * (2 - F)


def true_geodetic(x, y, z, lat0):
    p = sqrt(mpf(x) ** 2 + mpf(y) ** 2)
    z = mpf(z)
    f = lambda phi: p * sin(phi) - z * cos(phi) - E2 * A * sin(phi) * cos(phi) / sqrt(1 - E2 * sin(phi) ** 2)
    phi = findroot(f, mpf(lat0))
    h = p * cos(phi) + z * sin(phi) - A * sqrt(1 - E2 * sin(phi) ** 2)
    return phi, h


for name in sys.argv[1:]:
    data = json.load(open(name))
    points = data['points'] if isinstance(data, dict) else data
    rows = []
    for i, p in enumerate(points):
        if abs(abs(p['lat']) - math.pi / 2) < 1e-13:
            continue  # at the pole the latitude equation is solved by inspection
        phi, h = true_geodetic(p['x'], p['y'], p['z'], p['lat'])
        rows.append((i, p, float(abs(phi - mpf(p['lat']))), float(abs(phi - mpf(p['latBack']))),
                     float(abs(h - mpf(p['h']))), float(abs(h - mpf(p['hBack'])))))

    def worst(k):
        r = max(rows, key=lambda r: r[k])
        return f"{r[k]:.3e} at i={r[0]} lat={r[1]['lat']:.4f} h={r[1]['h'] / 1e3:.0f} km"

    print(name.split('/')[-1], len(rows), 'points; truth = 40-digit solution for the stored x, y, z')
    print('  input lat  against truth:', worst(2))
    print('  ERFA gc2gd against truth:', worst(3))
    print('  input h    against truth:', worst(4))
    print('  ERFA hBack against truth:', worst(5))
    for lo, hi in ((-1e9, 2e6), (2e6, 1e7), (1e7, 3e7), (3e7, 5e7)):
        sel = [r for r in rows if lo < r[1]['h'] <= hi]
        if sel:
            print(f"  h in ({lo / 1e3:.0f}, {hi / 1e3:.0f}] km: n={len(sel)}, "
                  f"ERFA lat error up to {max(r[3] for r in sel):.3e} rad, "
                  f"ERFA h error up to {max(r[5] for r in sel):.3e} m")
