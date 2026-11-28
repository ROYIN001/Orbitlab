# A held-out set for the Kepler module (the gate of PF-15): cases the writers of the module never
# saw, from a seeded pseudo-random sampler (the fixture is a grid), with hard cases added by hand.
# Reference: the 80-digit classical route of pf15_kepler_precheck.py. A case is kept only where
# the pre-check's own universal-variable step in doubles is within a tenth of the bounds, so that
# an "out of bound" of this set is the module's and not the case's (HANDOVER-S20 section 5, trap 10).
# Run: python heldout_kepler.py <out.json>     (pf15_kepler_precheck.py beside this file)
import json, math, os, sys
import numpy as np
src = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'pf15_kepler_precheck.py')).read()
P = {}
exec(src.split("\nif len(sys.argv) == 3 and sys.argv[1] == '--write-inputs':")[0], P)   # the functions only
MU = P['MU']
rng = np.random.default_rng(2026112715)
f17 = lambda x: float(f'{float(x):.17g}')

def draw():
    kind = rng.integers(0, 4)
    if kind == 0: e = rng.uniform(0, 0.95)
    elif kind == 1: e = 1 - 10 ** rng.uniform(-13, -1.3)
    elif kind == 2: e = 1 + 10 ** rng.uniform(-13, -1.3)
    else: e = 1 + 10 ** rng.uniform(-1.3, 1.2)
    rp = math.exp(rng.uniform(math.log(6.4e6), math.log(1.0e8)))
    lim = math.pi if e < 1 else math.acos(-1 / e) - 0.2
    nu = rng.uniform(-lim, lim)
    dt = 10 ** rng.uniform(0, math.log10(259200)) * (1 if rng.random() < 0.75 else -1)
    return e, rp, nu, dt, (math.acos(rng.uniform(-1, 1)), rng.uniform(0, 2 * math.pi), rng.uniform(0, 2 * math.pi))

cases = [draw() for _ in range(1500)]
ang = (0.9, 0.4, 1.1)
cases += [(0.0, 7.0e6, 0.0, 5400.0, (0.0, 0.0, 0.0)), (0.0, 4.2164e7, 3.0, 86400.0, (1e-9, 0.0, 0.0)),
          (0.5, 6.6e6, math.pi - 1e-6, 30000.0, (math.pi, 1.0, 2.0)), (0.999999, 6.6e6, 0.0, 259200.0, ang),
          (1.0000001, 6.6e6, 1e-3, 100000.0, ang), (2.0, 6.6e6, -1.5, 1.0, ang), (0.3, 7.0e6, 0.5, 1e-3, ang),
          (0.3, 7.0e6, 0.5, -1e-3, ang), (0.7233, 2.0e7, 2.5, 200000.0, (math.pi / 2, 0.0, 0.0)), (15.0, 9.0e7, 0.2, 259200.0, ang)]
out, dropped, worst = [], 0, [0.0, 0.0]
for e, rp, nu, dt, (inc, raan, argp) in cases:
    r0, v0 = P['from_perifocal'](rp, e, nu, inc, raan, argp)
    r0, v0 = [float(x) for x in r0], [float(x) for x in v0]
    rr, vr = P['kepler_reference'](r0, v0, dt)
    rr, vr = np.array([float(x) for x in rr]), np.array([float(x) for x in vr])
    rd, vd = P['kepler_universal'](np.array(r0), np.array(v0), dt)
    dr, dv = float(np.linalg.norm(np.array(rd, float) - rr)), float(np.linalg.norm(np.array(vd, float) - vr))
    if not (dr <= 1e-4 and dv <= 1e-8): dropped += 1; continue
    worst = [max(worst[0], dr), max(worst[1], dv)]
    out.append({'e': f17(e), 'rp': f17(rp), 'nu': f17(nu), 'dt': f17(dt), 'r0': [f17(x) for x in r0], 'v0': [f17(x) for x in v0],
                'r': [f17(x) for x in rr], 'v': [f17(x) for x in vr]})
json.dump({'seed': 2026112715, 'mu': MU, 'cases': out}, open(sys.argv[1], 'w'))
print(len(out), 'cases kept,', dropped, 'dropped as ill-posed; the pre-check\'s doubles on the kept ones: worst', '%.2e m, %.2e m/s' % tuple(worst))
