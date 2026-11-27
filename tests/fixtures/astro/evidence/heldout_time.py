"""Held-out set for the time-scale module of src/astro (PF-10), made by the orchestrating session.

Seeded pseudo-random instants (numpy, seed 20261127), a different sampler from the fixture's
Halton sequence, plus hard instants by hand: each side of every step of TAI - UTC, the ends
of the table, far dates. Values from pyerfa only. Writes the JSON named on the command line.

    python heldout_time.py /tmp/heldout-time.json
"""
import json, math, sys, warnings
import erfa, numpy as np
warnings.simplefilter('ignore')
rng = np.random.RandomState(20261127)
J = lambda y, m, d: sum(erfa.cal2jd(y, m, d))

def dat(a, b):
    """TAI - UTC of the work plan: ERFA dat on the UTC day and fraction; the 1960-01-01 value before 1960."""
    x = (a - 2400000.5) + b
    mjd = math.floor(x)
    y, m, d, _ = erfa.jd2cal(2400000.5, float(mjd))
    if y < 1960:
        return float(erfa.dat(1960, 1, 1, 0.0))
    return float(erfa.dat(int(y), int(m), int(d), x - mjd))

def split(jd):
    a = math.floor(jd - 0.5) + 0.5
    return [a, jd - a]

STEPS = [(1961,1),(1961,8),(1962,1),(1963,11),(1964,1),(1964,4),(1964,9),(1965,1),(1965,3),(1965,7),(1965,9),(1966,1),(1968,2),(1972,1),
         (1972,7),(1973,1),(1974,1),(1975,1),(1976,1),(1977,1),(1978,1),(1979,1),(1980,1),(1981,7),(1982,7),(1983,7),(1985,7),(1988,1),
         (1990,1),(1991,1),(1992,7),(1993,7),(1994,7),(1996,1),(1997,7),(1999,1),(2006,1),(2009,1),(2012,7),(2015,7),(2017,1)]
step_jd = [J(*s, 1) for s in STEPS]

# 1. TAI - UTC: random instants 1950..2075 and both sides of every step
pts = [split(float(x)) for x in rng.uniform(J(1950,1,1), J(2075,1,1), 4000)]
for s in step_jd:
    for off in (-86400.0, -30.0, -1.0, -1e-3, 0.0, 1e-3, 1.0, 30.0, 43200.0):
        pts.append([s - 1, 1 + off / 86400] if off < 0 else [s, off / 86400])
pts += [[J(1960,1,1), 0.0], [J(1960,1,1) - 1, 0.999999], [J(1900,1,1), 0.5], [J(2200,1,1), 0.25],
        [2400000.5, 51544.5], [2451545.0, 0.0], [2451545.0, -0.5], [2451544.5, 1.75]]   # unusual splits too
dat_rows = [{'utc': p, 'dat': dat(*p)} for p in pts]

# 2. round trip UTC -> TAI -> UTC: where the corrected sentence promises 1e-9 s
def near_drift_step(a, b, window):
    t = a + b
    return any(abs(t - s) * 86400 < window for s in step_jd[:14])
rt = [p for p in pts if p[0] + p[1] >= J(1960,1,1) and not near_drift_step(*p, 11.0)]
rt_drift = []          # inside the window before a drift step: the 3.3e-9 s statement
for s in step_jd[:14]:
    for off in np.arange(-10.9, -1.0, 0.37):
        rt_drift.append([s - 1, 1 + float(off) / 86400])

# 3. UTC -> TAI and TT against ERFA, 1972..2060, a day away from any leap second
sc = []
while len(sc) < 2000:
    jd = float(rng.uniform(J(1972,1,2), J(2060,1,1)))
    if any(abs(jd - s) < 1.0 for s in step_jd):
        continue
    u = split(jd)
    t1, t2 = erfa.utctai(u[0], u[1]); tt1, tt2 = erfa.taitt(t1, t2)
    sc.append({'utc': u, 'tai': [float(t1), float(t2)], 'tt': [float(tt1), float(tt2)]})

# 4. TDB - TT, 1960..2060
tdb = []
for jd in rng.uniform(J(1960,1,1), J(2060,1,1), 4000):
    t = split(float(jd))
    tdb.append({'tt': t, 'dtdb': float(erfa.dtdb(t[0], t[1], 0.0, 0.0, 0.0, 0.0))})

# 5. instants for the Earth-orientation comparison (the checker computes today's values itself)
eop_jd = [float(x) for x in rng.uniform(J(2018,6,1), J(2028,6,1), 3000)]

out = {'generator': f'pyerfa {erfa.__version__} (ERFA {erfa.version.erfa_version}); numpy {np.__version__}, RandomState(20261127)',
       'dat': dat_rows, 'roundTrip': rt, 'roundTripDriftWindow': rt_drift, 'scales': sc, 'tdb': tdb, 'eopJd': eop_jd}
with open(sys.argv[1], 'w') as f:
    json.dump(out, f, separators=(',', ':'))
    f.write('\n')
print({k: (len(v) if isinstance(v, list) else v) for k, v in out.items()})
