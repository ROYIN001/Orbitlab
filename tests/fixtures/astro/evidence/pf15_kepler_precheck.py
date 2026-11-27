"""Pre-check of PF-15's Kepler bound, made before the package started (S20 wave 2, Task 3).

Reference tools only (mpmath, numpy); no app code. Can a universal-variable Kepler step in doubles
stay within 1 m of a 80-digit solution for hyperbolic, parabolic and near-parabolic orbits over hours?
  A. doubles: universal variable chi, Stumpff functions c2 and c3 (series near zero), Newton's method
     with a bisection guard (Vallado, Fundamentals of Astrodynamics, Algorithm 8 in outline);
  B. mpmath at 80 digits by the classical route, which shares nothing with A: elements from the state,
     then the hyperbolic anomaly (e sinh H - H = M), Barker's equation (e = 1) or the eccentric anomaly,
     and the state rebuilt in the perifocal frame.

Run:  python pf15_kepler_precheck.py
      python pf15_kepler_precheck.py --write-inputs cases.json      (states for today's elliptic path)
      python pf15_kepler_precheck.py --compare outputs.json         (today's outputs against 80 digits)
The two last modes measure the app's present `propagateKepler` below e = 1; the outputs file is written
by the scratch test kept beside this script as pf15_today_kepler_probe.ts.txt.

Found on 2026-11-27: the careful form is within 3.2e-6 m and 4.6e-10 m/s over 1,110 cases; the plain form
leaves 2.4e-2 m and 7.4e-7 m/s. Today's fallback for e >= 1 is 5.78 km off after 600 s and 61.3 km after an
hour at e = 1.04. Today's elliptic path: 9.0e-2 m at worst for e <= 0.99, 0.43 m at 1 - e = 1e-3,
29 m at 1e-6, 23 km at 1e-8, 13,000 km at 1e-10.
"""
import json, math, sys
import mpmath as mp
import numpy as np
mp.mp.dps = 80
MU = 3.986004418e14

CAREFUL = True

def stumpff(psi):
    """c2 and c3. The plain forms (1 - cos s)/psi and (s - sin s)/s^3 cancel as psi goes to zero: with a series
    only below |psi| = 1e-6 the step loses six digits just above it (CAREFUL = False shows that). The careful
    form uses the half angle for c2 and the series for c3 wherever |psi| < 1."""
    if not CAREFUL:
        if psi > 1e-6:
            s = math.sqrt(psi); return (1 - math.cos(s)) / psi, (s - math.sin(s)) / (s * psi)
        if psi < -1e-6:
            s = math.sqrt(-psi); return (1 - math.cosh(s)) / psi, (math.sinh(s) - s) / (s * -psi)
        return 0.5 - psi / 24 + psi * psi / 720, 1 / 6 - psi / 120 + psi * psi / 5040
    if abs(psi) < 1.0:
        c2 = c3 = 0.0; t2 = 0.5; t3 = 1 / 6
        for k in range(1, 12):
            c2 += t2; c3 += t3
            t2 *= -psi / ((2 * k + 1) * (2 * k + 2)); t3 *= -psi / ((2 * k + 2) * (2 * k + 3))
        return c2, c3
    if psi > 0:
        s = math.sqrt(psi); h = math.sin(s / 2); return 2 * h * h / psi, (s - math.sin(s)) / (s * psi)
    s = math.sqrt(-psi); h = math.sinh(s / 2); return -2 * h * h / psi, (math.sinh(s) - s) / (s * -psi)

def kepler_universal(r0, v0, dt, mu=MU):
    r0 = np.asarray(r0, float); v0 = np.asarray(v0, float)
    rn = np.linalg.norm(r0); vr = float(np.dot(r0, v0)); sq = math.sqrt(mu)
    alpha = 2 / rn - float(np.dot(v0, v0)) / mu
    def F(chi):
        psi = chi * chi * alpha; c2, c3 = stumpff(psi)
        r = chi * chi * c2 + vr / sq * chi * (1 - psi * c3) + rn * (1 - psi * c2)
        t = (chi ** 3 * c3 + vr / sq * chi * chi * c2 + rn * chi * (1 - psi * c3)) / sq
        return t - dt, r / sq, psi, c2, c3, r
    # bracket: the time is monotonic in chi
    lo, hi = (0.0, 1.0) if dt >= 0 else (-1.0, 0.0)
    if dt >= 0:
        while F(hi)[0] < 0: hi *= 2
    else:
        while F(lo)[0] > 0: lo *= 2
    chi = 0.5 * (lo + hi)
    for _ in range(200):
        f, df, psi, c2, c3, r = F(chi)
        if f > 0: hi = chi
        else: lo = chi
        step = f / df
        nxt = chi - step
        if not (lo < nxt < hi): nxt = 0.5 * (lo + hi)
        if abs(nxt - chi) <= 1e-15 * max(1.0, abs(chi)): chi = nxt; break
        chi = nxt
    f, df, psi, c2, c3, r = F(chi)
    fg = 1 - chi * chi / rn * c2; g = dt - chi ** 3 / sq * c3
    gd = 1 - chi * chi / r * c2; fd = sq / (r * rn) * chi * (psi * c3 - 1)
    return fg * r0 + g * v0, fd * r0 + gd * v0

def newton(f, df, x):
    """Newton's method at working precision; every function here is monotonic, so a guarded step is enough."""
    for _ in range(400):
        d = df(x)
        step = f(x) / d if d != 0 else mp.mpf(1)
        x -= step
        if abs(step) <= mp.mpf(10) ** (-60) * max(1, abs(x)): return x
    raise RuntimeError(f'reference did not converge: x={mp.nstr(x, 8)}, step={mp.nstr(step, 8)}')

def kepler_reference(r0, v0, dt):
    r0 = [mp.mpf(repr(float(x))) for x in r0]; v0 = [mp.mpf(repr(float(x))) for x in v0]; mu = mp.mpf(repr(MU)); dt = mp.mpf(repr(float(dt)))
    dot = lambda a, b: sum(x * y for x, y in zip(a, b)); cross = lambda a, b: [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]]
    nrm = lambda a: mp.sqrt(dot(a, a))
    h = cross(r0, v0); hn = nrm(h); rn = nrm(r0)
    evec = [c / mu - x / rn for c, x in zip(cross(v0, h), r0)]; e = nrm(evec); p = hn * hn / mu
    P = [x / e for x in evec] if e != 0 else [x / rn for x in r0]; W = [x / hn for x in h]; Q = cross(W, P)
    x0, y0 = dot(r0, P), dot(r0, Q); nu0 = mp.atan2(y0, x0)
    def state(nu):
        r = p / (1 + e * mp.cos(nu)); xr, yr = r * mp.cos(nu), r * mp.sin(nu)
        vx, vy = -mp.sqrt(mu / p) * mp.sin(nu), mp.sqrt(mu / p) * (e + mp.cos(nu))
        return [xr * P[i] + yr * Q[i] for i in range(3)], [vx * P[i] + vy * Q[i] for i in range(3)]
    if e == 1:
        D0 = mp.tan(nu0 / 2); n = 2 * mp.sqrt(mu / p ** 3); Mb = D0 + D0 ** 3 / 3 + n * dt
        D = newton(lambda d: d + d ** 3 / 3 - Mb, lambda d: 1 + d * d, D0); nu = 2 * mp.atan(D)
    elif e > 1:
        a = p / (e * e - 1); n = mp.sqrt(mu / a ** 3)
        H0 = 2 * mp.atanh(mp.sqrt((e - 1) / (e + 1)) * mp.tan(nu0 / 2)); M = e * mp.sinh(H0) - H0 + n * dt
        H = newton(lambda x: e * mp.sinh(x) - x - M, lambda x: e * mp.cosh(x) - 1, mp.asinh(M / e) if abs(M) > 1 else mp.sign(M) * mp.cbrt(6 * abs(M)))
        nu = 2 * mp.atan(mp.sqrt((e + 1) / (e - 1)) * mp.tanh(H / 2))
    else:
        a = p / (1 - e * e); n = mp.sqrt(mu / a ** 3)
        E0 = 2 * mp.atan(mp.sqrt((1 - e) / (1 + e)) * mp.tan(nu0 / 2)); M = E0 - e * mp.sin(E0) + n * dt
        E = newton(lambda x: x - e * mp.sin(x) - M, lambda x: 1 - e * mp.cos(x), M if e < mp.mpf('0.8') else mp.pi * mp.sign(M) if abs(M) > 1 else mp.sign(M) * mp.cbrt(6 * abs(M)))
        nu = 2 * mp.atan2(mp.sqrt(1 + e) * mp.sin(E / 2), mp.sqrt(1 - e) * mp.cos(E / 2))
    return state(nu)

def from_perifocal(rp, e, nu, inc=0.9, raan=0.4, argp=1.1):
    p = rp * (1 + e); r = p / (1 + e * math.cos(nu))
    rpf = np.array([r * math.cos(nu), r * math.sin(nu), 0.0]); vpf = math.sqrt(MU / p) * np.array([-math.sin(nu), e + math.cos(nu), 0.0])
    cO, sO, ci, si, cw, sw = math.cos(raan), math.sin(raan), math.cos(inc), math.sin(inc), math.cos(argp), math.sin(argp)
    R = np.array([[cO*cw - sO*sw*ci, -cO*sw - sO*cw*ci, sO*si], [sO*cw + cO*sw*ci, -sO*sw + cO*cw*ci, -cO*si], [sw*si, cw*si, ci]])
    return R @ rpf, R @ vpf

if len(sys.argv) == 3 and sys.argv[1] == '--write-inputs':
    cases = []
    for e in (0.0, 0.001, 0.1, 0.6, 0.9, 0.99, 0.999, 1 - 1e-4, 1 - 1e-6, 1 - 1e-8, 1 - 1e-10, 1 - 1e-12):
        for rp in (6.578e6, 2.0e7):
            for nu0 in (-2.0, -0.3, 0.0, 0.8):
                r0, v0 = from_perifocal(rp, e, nu0)
                for dt in (600.0, 3600.0, 6 * 3600.0, 24 * 3600.0, -3600.0):
                    cases.append({'e': e, 'rp': rp, 'nu0': nu0, 'dt': dt, 'r': list(map(float, r0)), 'v': list(map(float, v0))})
    json.dump(cases, open(sys.argv[2], 'w')); print(len(cases), 'cases written'); sys.exit(0)
if len(sys.argv) == 3 and sys.argv[1] == '--compare':
    by_e = {}
    for c in json.load(open(sys.argv[2])):
        rb, vb = kepler_reference(c['r'], c['v'], c['dt'])
        if c['out'] is None or any(x is None for x in c['out']['r'] + c['out']['v']): by_e.setdefault(c['e'], []).append((float('nan'), float('nan'), c)); continue
        dr = float(mp.sqrt(sum((mp.mpf(repr(c['out']['r'][i])) - rb[i]) ** 2 for i in range(3))))
        dv = float(mp.sqrt(sum((mp.mpf(repr(c['out']['v'][i])) - vb[i]) ** 2 for i in range(3))))
        by_e.setdefault(c['e'], []).append((dr, dv, c))
    print("today's propagateKepler against 80 digits, worst over 40 cases for each eccentricity:")
    for e, rows in sorted(by_e.items()):
        bad = sum(1 for r in rows if not (r[0] == r[0])); fin = [r for r in rows if r[0] == r[0]]
        w = max(fin, key=lambda r: r[0]) if fin else None
        print(f'  1 - e = {1 - e:.0e}' if e > 0.9 else f'  e = {e}', f': {w[0]:.3e} m, {max(r[1] for r in fin):.3e} m/s (worst at rp={w[2]["rp"]:.3g}, nu0={w[2]["nu0"]}, dt={w[2]["dt"]})' if w else '', f'; {bad} not finite' if bad else '')
    sys.exit(0)

for CAREFUL in (False, True):
    print('careful Stumpff functions:' if CAREFUL else 'plain Stumpff functions with a series only below |psi| = 1e-6:')
    rows = []
    for e in (1.0, 1.0 + 1e-12, 1.0 + 1e-9, 1.0 + 1e-6, 1.001, 1.04, 1.5, 3.0, 10.0, 1.0 - 1e-12, 1.0 - 1e-9, 1.0 - 1e-6, 0.999, 0.99, 0.9, 0.6, 0.1, 0.001, 0.0):
        for rp in (6.578e6, 2.0e7, 1.0e8):
            for nu0 in (-2.0, -0.3, 0.0, 0.8):
                if e >= 1 and abs(nu0) >= math.acos(-1 / e) - 0.2: continue
                r0, v0 = from_perifocal(rp, e, nu0)
                if e == 1.0:  # make the orbit exactly parabolic in doubles as nearly as they allow: scale the speed to escape speed
                    v0 = v0 * math.sqrt(2 * MU / np.linalg.norm(r0)) / np.linalg.norm(v0)
                for dt in (600.0, 3600.0, 6 * 3600.0, 24 * 3600.0, -3600.0):
                    ra, va = kepler_universal(r0, v0, dt)
                    rb, vb = kepler_reference(r0, v0, dt)
                    dr = float(mp.sqrt(sum((mp.mpf(repr(float(ra[i]))) - rb[i]) ** 2 for i in range(3))))
                    dv = float(mp.sqrt(sum((mp.mpf(repr(float(va[i]))) - vb[i]) ** 2 for i in range(3))))
                    rows.append((dr, dv, e, rp, nu0, dt, float(mp.sqrt(sum(x * x for x in rb)))))
    rows.sort(reverse=True)
    print(f'{len(rows)} cases; worst position {rows[0][0]:.3e} m (bound 1 m), at e={rows[0][2]!r}, rp={rows[0][3]:.3g} m, nu0={rows[0][4]}, dt={rows[0][5]} s, |r| then {rows[0][6]:.3e} m')
    wv = max(rows, key=lambda x: x[1]); print(f'worst velocity {wv[1]:.3e} m/s, at e={wv[2]!r}, rp={wv[3]:.3g}, nu0={wv[4]}, dt={wv[5]}')
    for lab, sel in (('e >= 1', lambda x: x[2] >= 1), ('0.999 <= e < 1', lambda x: 0.999 <= x[2] < 1), ('e < 0.999', lambda x: x[2] < 0.999)):
        s = [x for x in rows if sel(x)]; print(f'{lab}: {len(s)} cases, worst {max(x[0] for x in s):.3e} m, {max(x[1] for x in s):.3e} m/s; worst relative to |r| {max(x[0]/x[6] for x in s):.2e}')
# invariants and the round trip of the careful form, in doubles only
CAREFUL = True
wh = we = wrt = wvt = 0.0
for e in (0.0, 0.1, 0.6, 0.99, 1 - 1e-9, 1.0 + 1e-9, 1.04, 3.0):
    for rp in (6.578e6, 2.0e7):
        for nu0 in (-2.0, 0.0, 0.8):
            if e >= 1 and abs(nu0) >= math.acos(-1 / e) - 0.2: continue
            r0, v0 = from_perifocal(rp, e, nu0)
            for dt in (3600.0, 86400.0):
                r1, v1 = kepler_universal(r0, v0, dt); r2, v2 = kepler_universal(r1, v1, -dt)
                h0, h1 = np.cross(r0, v0), np.cross(r1, v1)
                wh = max(wh, np.linalg.norm(h1 - h0) / np.linalg.norm(h0))
                en = lambda r, v: float(np.dot(v, v)) / 2 - MU / np.linalg.norm(r)
                we = max(we, abs(en(r1, v1) - en(r0, v0)) / (MU / np.linalg.norm(r0)))
                wrt = max(wrt, np.linalg.norm(r2 - r0)); wvt = max(wvt, np.linalg.norm(v2 - v0))
print(f'careful form: angular momentum kept to {wh:.1e} relative, energy to {we:.1e} of GM/r0; there and back leaves {wrt:.1e} m, {wvt:.1e} m/s')
# today's fallback, transcribed from src/physics/orbital.ts: a chain of second-order steps of at most 10 s
def fallback(r0, v0, dt):
    steps = max(1, math.ceil(abs(dt) / 10)); h = dt / steps; rr = np.array(r0, float); vv = np.array(v0, float)
    acc = lambda q: -MU * q / np.linalg.norm(q) ** 3
    for _ in range(steps):
        a1 = acc(rr); a2 = acc(rr + vv * h / 2); rr = rr + vv * h + a1 * h * h / 2; vv = vv + (a1 + a2) * h / 2
    return rr, vv
r0, v0 = from_perifocal(6.578e6, 1.04, 0.0)
for dt in (600.0, 3600.0):
    rf, _ = fallback(r0, v0, dt); rb, _ = kepler_reference(r0, v0, dt)
    print(f"today's fallback, e = 1.04 from a 200 km perigee, {dt:.0f} s: {float(mp.sqrt(sum((mp.mpf(repr(float(rf[i]))) - rb[i]) ** 2 for i in range(3))))/1000:.2f} km off")
