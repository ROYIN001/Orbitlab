"""Pre-check of the round-trip claim of PF-10, made before the package started.

Reference tools only (pyerfa): the work plan's two formulas for UTC -> TAI and TAI -> UTC
are written onto erfa.dat, so no app code is imported and no new code is tested.
S20-wave1 Task 2 said taiToUtc(utcToTai(u)) returns u within 1e-9 s for every UTC instant
from 1960 on that is not within one second of a step of the drift table.

Run:  python pf10_roundtrip_precheck.py
Found on 2026-11-27 (pyerfa 2.0.1.5), every 10 ms from 20 s before to 20 s after each step,
the second on either side of the step left out:
  - the 27 leap seconds from 1972-07-01 on: within 1e-11 s;
  - a step of the drift table with a jump: up to 1.5e-9 s (0.1 s steps of 1963-1965),
    3.0e-9 s (1968-02-01) and 3.2e-9 s (1972-01-01), always closer to the step than
    TAI - UTC itself. The sentence is corrected (plan S20, amendment 10).
"""
import math, warnings
import erfa
warnings.simplefilter('ignore')

def dat(a, b):
    x = (a - 2400000.5) + b
    mjd = math.floor(x)
    fd = x - mjd
    y, m, d, _ = erfa.jd2cal(2400000.5, float(mjd))
    if y < 1960:
        return float(erfa.dat(1960, 1, 1, 0.0))
    return float(erfa.dat(int(y), int(m), int(d), fd))

def utc_to_tai(a, b): return a, b + dat(a, b) / 86400
def tai_to_utc(a, b):
    u0 = b - dat(a, b) / 86400
    return a, b - dat(a, u0) / 86400

STEPS = [(1961,1),(1961,8),(1962,1),(1963,11),(1964,1),(1964,4),(1964,9),(1965,1),(1965,3),(1965,7),(1965,9),(1966,1),(1968,2),(1972,1),
         (1972,7),(1973,1),(1974,1),(1975,1),(1976,1),(1977,1),(1978,1),(1979,1),(1980,1),(1981,7),(1982,7),(1983,7),(1985,7),(1988,1),
         (1990,1),(1991,1),(1992,7),(1993,7),(1994,7),(1996,1),(1997,7),(1999,1),(2006,1),(2009,1),(2012,7),(2015,7),(2017,1)]
rows = []
for (y, m) in STEPS:
    d1, d2 = erfa.cal2jd(y, m, 1)
    a = d1 + d2            # 0 h of the step day, a half-integer JD
    before = dat(a - 1, 86399.5 / 86400); after = dat(a, 0.0)
    worst = (0, None)
    for k in range(-2000, 2001):          # -20 s .. +20 s, every 10 ms
        off = k / 100.0
        if abs(off) < 1.0:
            continue
        ua, ub = (a - 1, 1 + off / 86400) if off < 0 else (a, off / 86400)
        ta, tb = utc_to_tai(ua, ub)
        ba, bb = tai_to_utc(ta, tb)
        err = abs((ba - ua) + (bb - ub)) * 86400
        if err > worst[0]:
            worst = (err, off)
    rows.append((y, m, before, after, worst))
for y, m, b4, af, (err, off) in rows:
    flag = '' if err <= 1e-9 else '   <-- over 1e-9 s'
    print(f'{y}-{m:02d}-01  dat {b4:.7f} -> {af:.7f} (jump {af-b4:+.7f})  worst round trip {err:.3e} s at {off:+.2f} s{flag}')
