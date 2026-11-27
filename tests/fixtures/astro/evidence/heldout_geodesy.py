"""A held-out set for the geodesy module: points its writers never saw (the gate of PF-12).

Different sampler from the fixture's (a seeded random generator, not Halton), the same
domain (-10 km to 40,000 km), with hard points added by hand: near the poles, near the
equator, near the +-pi seam. Reference: pyerfa gd2gc and gc2gd.

Run:  python heldout_geodesy.py heldout.json     (4,228 points; not committed)
Then: node check_geodesy.mjs <repository root> heldout.json
"""
import json
import math
import sys

import erfa
import numpy as np

rng = np.random.default_rng(20261126)
points = []


def add(lat, lon, h):
    xyz = erfa.gd2gc(1, lon, lat, h)
    lon_b, lat_b, h_b = erfa.gc2gd(1, xyz)
    points.append(dict(lat=float(lat), lon=float(lon), h=float(h),
                       x=float(xyz[0]), y=float(xyz[1]), z=float(xyz[2]),
                       latBack=float(lat_b), lonBack=float(lon_b), hBack=float(h_b)))


for _ in range(4000):
    u = rng.random(3)
    add(math.asin(2 * u[0] - 1), math.pi * (2 * u[1] - 1), -10e3 + (40e6 + 10e3) * u[2] ** 2)
for h in (-10e3, 0.0, 500e3, 40e6):
    for k in range(2, 14):
        for s in (1, -1):
            add(s * (math.pi / 2 - 10.0 ** -k), 1.0, h)
    for k in range(2, 16):
        for s in (1, -1):
            add(s * 10.0 ** -k, 1.0, h)
for k in range(6, 16):
    add(0.3, math.pi - 10.0 ** -k, 0.0)
    add(0.3, -math.pi + 10.0 ** -k, 0.0)
json.dump(points, open(sys.argv[1], 'w'))
print(len(points), 'points')
