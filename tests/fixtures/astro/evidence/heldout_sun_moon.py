# A held-out set for the Sun and Moon module (the gate of PF-14): instants the writers of the
# module never saw, from a seeded pseudo-random sampler (the fixtures use Halton sequences),
# with hard instants added by hand. References: pyerfa (moon98, plan94) for the port, and
# JPL DE421 through Skyfield for the accuracy bounds.
# Run: python heldout_sun_moon.py <folder holding de421.bsp> <out.json>
import json, math, sys
import numpy as np, erfa
from skyfield.api import Loader

AU, DAY, MU = 149597870700.0, 86400.0, 81.30056
rng = np.random.default_rng(2026112714)
f17 = lambda x: float(f'{float(x):.17g}')
B = erfa.bp00(2451545.0, 0.0)[0]

def states(a, b):
    m = erfa.moon98(a, b)
    e = erfa.plan94(a, b, 3)
    e = e[0] if isinstance(e, tuple) and len(e) == 2 and not hasattr(e[0], 'dtype') else e
    pv = lambda s: (np.array(s['p'], float) * AU, np.array(s['v'], float) * AU / DAY)
    mp, mv = pv(m); ep, ev = pv(e)
    sp = -(B.T @ ep - mp / (1 + MU)); sv = -(B.T @ ev - mv / (1 + MU))
    return [[f17(x) for x in v] for v in (mp, mv, ep, ev, sp, sv)]

def split(jd, how):
    if how == 0: a = math.floor(jd - 0.5) + 0.5; return a, jd - a
    if how == 1: return 2400000.5, jd - 2400000.5
    if how == 2: return jd, 0.0
    a = math.floor(jd); return a, jd - a

port = []
for k in range(3000):
    jd = rng.uniform(2415020.5, 2488069.5)            # 1900 to 2100
    port.append(split(jd, k % 4))
port += [(2451545.0, 0.0), (2451544.5, 0.5), (2400000.5, 51544.5), (2451545.0, -0.25),
         (2086302.5, 0.0), (2086302.5, 0.999), (2816787.5, 0.0), (2816788.5, 0.25),   # years 1000 and 3000, the ends of plan94's fit
         (2085936.5, 0.5), (2817153.5, 0.5), (1721057.5, 0.0), (2451545.0, 36525.0 * 30)]
out_port = [{'tt': [f17(a), f17(b)], 's': states(a, b)} for a, b in port]

load = Loader(sys.argv[1]); eph = load('de421.bsp'); ts = load.timescale()
de = []
for k in range(2000):
    jd = rng.uniform(2433282.5, 2469807.5)            # 1950 to 2050
    a, b = split(jd, 0); t = ts.tt_jd(jd)
    e = eph['earth'].at(t)
    row = {'tt': [f17(a), f17(b)]}
    for name in ('moon', 'sun'):
        o = eph[name].at(t)
        row[name] = [[f17(x) for x in o.position.m - e.position.m], [f17(x) for x in o.velocity.m_per_s - e.velocity.m_per_s]]
    de.append(row)
json.dump({'seed': 2026112714, 'port': out_port, 'de421': de}, open(sys.argv[2], 'w'))
print(len(out_port), 'instants against ERFA,', len(de), 'against DE421')
