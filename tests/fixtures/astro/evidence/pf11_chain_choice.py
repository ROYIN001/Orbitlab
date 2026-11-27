"""Why PF-11 uses the IAU 2000B chain, and how close its TEME is to Skyfield's (plan S20, amendments 1 and 2).

Reference tools only (pyerfa, Skyfield with its bundled timescale data); no app code.

Run:  python pf11_chain_choice.py
Found on 2026-11-26 (pyerfa 2.0.1.5, Skyfield 1.55), GCRF -> ITRF with UT1-UTC = -0.1 s and a
pole of (0.1, 0.3) arcseconds, first of January and July, 12 h UTC, 1990 to 2055:
  1. IAU 2000B (pnm00b, gst00b, pom00, c2teqx) against the full IAU 2006/2000A chain (c2t06a):
     worst 1.1 mas. The bound of the work plan is 2 mas.
  2. The IAU 1976/1980 chain (pnm80, gst94), which the first draft had chosen, against the same:
     the orientation of the inertial frame (the bias-precession-nutation matrix) is 0.069 arcsecond
     off in 2025 (2.4 m at 7,000 km) and 0.120 in 2040 (4.1 m); the complete GCRF -> ITRF, where part
     of that cancels against sidereal time, is 0.046 arcsecond off in 2025 (1.6 m) and 0.067 in 2040.
  3. The planned TEME, R3(gst00b - gmst82) . pnm00b, against Skyfield's TEME frame, 2020 to 2030:
     worst 0.6 mas (2.1 cm at 7,000 km). The bound of the work plan is 0.2 m.
"""
import math
import warnings

import erfa
import numpy as np
from skyfield.api import load
from skyfield.sgp4lib import TEME

warnings.filterwarnings('ignore')  # ERFA's "dubious year" after 2028
MAS = math.radians(1 / 3.6e6)
R = 7.0e6


def angle(a, b):
    """The angle of the rotation that takes b to a, from the antisymmetric part (an arccosine of the trace loses it)."""
    r = a @ b.T
    return float(np.linalg.norm([r[2, 1] - r[1, 2], r[0, 2] - r[2, 0], r[1, 0] - r[0, 1]]) / 2)


xp, yp = math.radians(0.1 / 3600), math.radians(0.3 / 3600)
worst_b, old = 0.0, {}
for year in range(1990, 2056):
    for month in (1, 7):
        d1, d2 = erfa.dtf2d('UTC', year, month, 1, 12, 0, 0.0)
        tt1, tt2 = erfa.taitt(*erfa.utctai(d1, d2))
        ut1, ut2 = erfa.utcut1(d1, d2, -0.1)
        pole = erfa.pom00(xp, yp, 0.0)
        full = erfa.c2t06a(tt1, tt2, ut1, ut2, xp, yp)
        chain_b = erfa.c2teqx(erfa.pnm00b(tt1, tt2), erfa.gst00b(ut1, ut2), pole)
        chain_80 = erfa.c2teqx(erfa.pnm80(tt1, tt2), erfa.gst94(ut1, ut2), pole)
        worst_b = max(worst_b, angle(chain_b, full))
        if month == 1 and year in (2025, 2040):
            old[year] = (angle(erfa.pnm80(tt1, tt2), erfa.pnm06a(tt1, tt2)), angle(chain_80, full))
print(f"1. IAU 2000B against IAU 2006/2000A, 1990-2055: worst {worst_b / MAS:.2f} mas ({worst_b * R * 100:.1f} cm at 7,000 km)")
for year, (npb, chain) in old.items():
    print(f"2. IAU 1976/1980 against IAU 2006/2000A, {year}: inertial orientation {npb / MAS / 1000:.3f} arcsecond ({npb * R:.1f} m at 7,000 km); "
          f"complete GCRF->ITRF {chain / MAS / 1000:.3f} arcsecond ({chain * R:.1f} m)")

ts = load.timescale(builtin=True)
worst = 0.0
for year in range(2020, 2031):
    for month in (1, 4, 7, 10):
        t = ts.utc(year, month, 1, 6, 0, 0.0)
        ut = (t.whole, t.ut1_fraction)
        tt = (t.whole, t.tt_fraction)
        planned = erfa.rz(erfa.gst00b(*ut) - erfa.gmst82(*ut), np.eye(3)) @ erfa.pnm00b(*tt)
        worst = max(worst, angle(planned, np.array(TEME.rotation_at(t))))
print(f"3. planned TEME against Skyfield's, 2020-2030: worst {worst / MAS:.2f} mas ({worst * R * 100:.1f} cm at 7,000 km)")
