# Pre-check, with reference tools only, of the bounds for the cases the review of PF-15 adds:
# another mu and another orientation (heliocentric), and very short steps.
import math, os, sys
import numpy as np
src = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'pf15_kepler_precheck.py')).read()
P = {}; exec(src.split("\nif len(sys.argv) == 3 and sys.argv[1] == '--write-inputs':")[0], P)
MU_E = P['MU']; MU_S = 1.32712440018e20
def run(mu, cases, inc, raan, argp):
    P['MU'] = mu; wr = wv = wra = wva = 0.0; at = None
    for e, rp, nu, dt in cases:
        r0, v0 = P['from_perifocal'](rp, e, nu, inc, raan, argp)
        r0 = [float(x) for x in r0]; v0 = [float(x) for x in v0]
        if e == 1:
            s = math.sqrt(2 * mu / math.hypot(*r0)) / math.hypot(*v0); v0 = [x * s for x in v0]
        rr, vr = P['kepler_reference'](r0, v0, dt); rr = np.array([float(x) for x in rr]); vr = np.array([float(x) for x in vr])
        rd, vd = P['kepler_universal'](np.array(r0), np.array(v0), dt, mu)
        dr = float(np.linalg.norm(np.array(rd, float) - rr)); dv = float(np.linalg.norm(np.array(vd, float) - vr))
        if dr / np.linalg.norm(rr) > wr: wr = dr / float(np.linalg.norm(rr)); at = (e, rp, nu, dt)
        wv = max(wv, dv / float(np.linalg.norm(vr))); wra = max(wra, dr); wva = max(wva, dv)
    P['MU'] = MU_E
    return wr, wv, wra, wva, at
helio = [(e, rp, nu, dt) for e in (0.0167, 0.2, 0.9, 1, 1.5) for rp in (5e10, 1.5e11, 7.8e11) for nu in (-1.0, 0.5) for dt in (86400.0, 3e6, 3e8, -3e6)]
print(len(helio), 'heliocentric cases (mu of the Sun; raan 4.0, inc 2.5, argp 5.5): worst relative %.2e in position, %.2e in velocity; absolute %.2e m, %.2e m/s; at' % run(MU_S, helio, 2.5, 4.0, 5.5)[:4], run(MU_S, helio, 2.5, 4.0, 5.5)[4])
short = [(e, rp, nu, dt) for e in (0.001, 0.6, 1, 1.5) for rp in (6.578e6,) for nu in (0.0, 0.8) for dt in (1e-3, -1e-3, 1.0)]
r = run(MU_E, short, 0.9, 0.4, 1.1)
print(len(short), 'short steps (Earth): worst %.2e m, %.2e m/s' % (r[2], r[3]))
