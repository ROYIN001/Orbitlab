"""Pre-check of the UT1 the PF-11 fixture must use, made before the package started.

Reference tools only (pyerfa). The work plan's framesAt(utc, eop) forms UT1 = UTC + dut1
(utcToUt1 of PF-10). ERFA's utcut1 forms UT1 = TAI + dut1 - (TAI - UTC at 0 h of the day).

Run:  python pf11_ut1_precheck.py
Found on 2026-11-27 (pyerfa 2.0.1.5), at the fixture's 25 instants:
  - from 1972 on the two agree to 5e-12 s, and the GCRF->ITRF matrices are identical;
  - at 1969-07-16 they differ by 2.28 ms and at 1961-04-12 by 1.19 ms, the drift accumulated
    since 0 h, which is 1.6e-7 and 8.6e-8 in a matrix element (the bound is 1e-11);
  - TT by utctai and taitt agrees with UTC + (TAI - UTC at the instant) + 32.184 s to 1e-11 s.
The generator forms UT1 as the base does (plan S20, amendment 12).
"""
import math, warnings
import erfa, numpy as np
warnings.simplefilter('ignore')
ARCSEC = math.pi / (180 * 3600)
DUT1, XP, YP = -0.1, 0.1 * ARCSEC, 0.3 * ARCSEC
dates = [(y, m, 1) for y in range(1990, 2041, 5) for m in (1, 7)] + [(1969, 7, 16), (1961, 4, 12), (2059, 12, 31)]
assert len(dates) == 25
worst = {}
for k, (y, m, d) in enumerate(dates):
    d1, d2 = erfa.cal2jd(y, m, d)
    u1, u2 = d1 + d2, k * 3456 / 86400            # UTC in two parts
    t1, t2 = erfa.utctai(u1, u2); tt1, tt2 = erfa.taitt(t1, t2)
    # TT by the work plan's rule: UTC + (TAI - UTC at the instant) + 32.184 s
    dat_inst = float(erfa.dat(y, m, d, u2)) if y >= 1960 else None
    tt_plan = u2 + dat_inst / 86400 + 32.184 / 86400
    e1, e2 = erfa.utcut1(u1, u2, DUT1)             # ERFA's UT1
    p1, p2 = u1, u2 + DUT1 / 86400                 # the plan's UT1
    dut = ((e1 - p1) + (e2 - p2)) * 86400
    rbpn = erfa.pnm00b(tt1, tt2); rpom = erfa.pom00(XP, YP, 0.0)
    A = erfa.c2teqx(rbpn, erfa.gst00b(e1, e2), rpom)
    B = erfa.c2teqx(rbpn, erfa.gst00b(p1, p2), rpom)
    era = '1972 on' if y >= 1972 else 'drift years'
    w = worst.setdefault(era, [0, 0, 0])
    w[0] = max(w[0], abs(dut)); w[1] = max(w[1], float(np.max(np.abs(A - B)))); w[2] = max(w[2], abs((tt2 - tt_plan) * 86400))
    if y < 1972:
        print(f'{y}-{m:02d}-{d:02d} +{k*3456} s: ERFA utcut1 minus (UTC + dut1) = {dut:.6e} s; GCRF->ITRF elements differ by {np.max(np.abs(A-B)):.3e}; TT (utctai) minus plan TT = {(tt2-tt_plan)*86400:.3e} s')
for era, w in worst.items():
    print(f'{era}: UT1 difference up to {w[0]:.3e} s, matrix elements up to {w[1]:.3e}, TT difference up to {w[2]:.3e} s')
