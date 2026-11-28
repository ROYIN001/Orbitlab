"""PF-15 fixture: the two-body state dt seconds later, solved at 80 digits by the classical route.

    python3 -m venv astro-venv && astro-venv/bin/pip install -r tests/fixtures/astro/requirements.txt
    astro-venv/bin/python -I make_kepler_fixture.py

The route shares nothing with the universal variable: elements from the state; then the hyperbolic anomaly from
e sinh H - H = M, Barker's equation for e = 1, or the eccentric anomaly from E - e sin E = M, each by Newton's method
to 1e-60; the state rebuilt in the perifocal frame. Eighty digits, because that route loses as many digits as 1 - e
has zeros. mu = 3.986004418e14 m^3/s^2.

Cases: every combination of e in {0, 0.001, 0.1, 0.6, 0.9, 0.99, 0.999, 1 - 1e-6, 1 - 1e-9, 1 - 1e-12, 1, 1 + 1e-12,
1 + 1e-9, 1 + 1e-6, 1.001, 1.04, 1.5, 3, 10}, perigee radius in {6.578e6, 2.0e7} m, true anomaly at the start in
{-2, -0.3, 0, 0.8} rad and dt in {600, 3600, 21600, 86400, 259200, -3600} s, loops in that order (e outermost, dt
innermost). For e >= 1 a true anomaly within 0.2 rad of the asymptote, |nu| >= acos(-1/e) - 0.2, is left out: that is
nu = -2 for e = 3 and e = 10 (2 values of e x 2 radii x 6 steps = 24 cases), so 19 x 2 x 4 x 6 - 24 = 888 cases.
The state is built in doubles from p = r_p (1 + e), r = p / (1 + e cos nu), position (r cos nu, r sin nu) and velocity
sqrt(mu/p) (-sin nu, e + cos nu) in the orbit's own plane (x towards the perigee), then placed in space by
Omega = 0.4, i = 0.9, omega = 1.1 rad: a plane vector (x, y) becomes x P + y Q. For e = 1 the speed is then scaled to
sqrt(2 mu / r), as parabolic as doubles allow; the reference takes the state as stored, whatever its exact
eccentricity. Each case stores the nominal e, r_p, nu, the input vectors r and v, dt and the output vectors r1 and v1,
17 significant digits. Metres, metres per second, seconds.
"""
import json, math
from pathlib import Path
import mpmath as mp
import numpy as np

mp.mp.dps = 80
OUT = Path(__file__).resolve().parent / 'mpmath-kepler.json'
MU = 3.986004418e14
RAAN, INC, ARGP = 0.4, 0.9, 1.1
ECC = [0.0, 0.001, 0.1, 0.6, 0.9, 0.99, 0.999, 1 - 1e-6, 1 - 1e-9, 1 - 1e-12, 1.0, 1 + 1e-12, 1 + 1e-9, 1 + 1e-6,
       1.001, 1.04, 1.5, 3.0, 10.0]
RP = [6.578e6, 2.0e7]
NU = [-2.0, -0.3, 0.0, 0.8]
DT = [600.0, 3600.0, 21600.0, 86400.0, 259200.0, -3600.0]


def from_perifocal(rp, e, nu, inc=INC, raan=RAAN, argp=ARGP, mu=MU):
    p = rp * (1 + e)
    r = p / (1 + e * math.cos(nu))
    rpf = np.array([r * math.cos(nu), r * math.sin(nu), 0.0])
    vpf = math.sqrt(mu / p) * np.array([-math.sin(nu), e + math.cos(nu), 0.0])
    cO, sO, ci, si, cw, sw = (math.cos(raan), math.sin(raan), math.cos(inc), math.sin(inc), math.cos(argp),
                              math.sin(argp))
    P = np.array([cO * cw - sO * sw * ci, sO * cw + cO * sw * ci, sw * si])
    Q = np.array([-cO * sw - sO * cw * ci, -sO * sw + cO * cw * ci, cw * si])
    return rpf[0] * P + rpf[1] * Q, vpf[0] * P + vpf[1] * Q


def newton(f, df, x):
    for _ in range(400):
        d = df(x)
        step = f(x) / d if d != 0 else mp.mpf(1)
        x -= step
        if abs(step) <= mp.mpf(10) ** (-60) * max(1, abs(x)):
            return x
    raise RuntimeError(f'reference did not converge: x={mp.nstr(x, 8)}, step={mp.nstr(step, 8)}')


def kepler_reference(r0, v0, dt, MU=MU):
    r0 = [mp.mpf(repr(float(x))) for x in r0]
    v0 = [mp.mpf(repr(float(x))) for x in v0]
    mu = mp.mpf(repr(MU))
    dt = mp.mpf(repr(float(dt)))
    dot = lambda a, b: sum(x * y for x, y in zip(a, b))
    cross = lambda a, b: [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
    nrm = lambda a: mp.sqrt(dot(a, a))
    h = cross(r0, v0)
    hn = nrm(h)
    rn = nrm(r0)
    evec = [c / mu - x / rn for c, x in zip(cross(v0, h), r0)]
    e = nrm(evec)
    p = hn * hn / mu
    P = [x / e for x in evec] if e != 0 else [x / rn for x in r0]
    W = [x / hn for x in h]
    Q = cross(W, P)
    nu0 = mp.atan2(dot(r0, Q), dot(r0, P))

    def state(nu):
        r = p / (1 + e * mp.cos(nu))
        xr, yr = r * mp.cos(nu), r * mp.sin(nu)
        vx, vy = -mp.sqrt(mu / p) * mp.sin(nu), mp.sqrt(mu / p) * (e + mp.cos(nu))
        return [xr * P[i] + yr * Q[i] for i in range(3)], [vx * P[i] + vy * Q[i] for i in range(3)]

    if e == 1:
        D0 = mp.tan(nu0 / 2)
        n = 2 * mp.sqrt(mu / p ** 3)
        Mb = D0 + D0 ** 3 / 3 + n * dt
        D = newton(lambda d: d + d ** 3 / 3 - Mb, lambda d: 1 + d * d, D0)
        nu = 2 * mp.atan(D)
    elif e > 1:
        a = p / (e * e - 1)
        n = mp.sqrt(mu / a ** 3)
        H0 = 2 * mp.atanh(mp.sqrt((e - 1) / (e + 1)) * mp.tan(nu0 / 2))
        M = e * mp.sinh(H0) - H0 + n * dt
        H = newton(lambda x: e * mp.sinh(x) - x - M, lambda x: e * mp.cosh(x) - 1,
                   mp.asinh(M / e) if abs(M) > 1 else mp.sign(M) * mp.cbrt(6 * abs(M)))
        nu = 2 * mp.atan(mp.sqrt((e + 1) / (e - 1)) * mp.tanh(H / 2))
    else:
        a = p / (1 - e * e)
        n = mp.sqrt(mu / a ** 3)
        E0 = 2 * mp.atan(mp.sqrt((1 - e) / (1 + e)) * mp.tan(nu0 / 2))
        M = E0 - e * mp.sin(E0) + n * dt
        E = newton(lambda x: x - e * mp.sin(x) - M, lambda x: 1 - e * mp.cos(x),
                   M if e < mp.mpf('0.8') else mp.pi * mp.sign(M) if abs(M) > 1 else mp.sign(M) * mp.cbrt(6 * abs(M)))
        nu = 2 * mp.atan2(mp.sqrt(1 + e) * mp.sin(E / 2), mp.sqrt(1 - e) * mp.cos(E / 2))
    return state(nu)


def f17(x):
    return float(f'{float(x):.17g}')


cases = []
for e in ECC:
    for rp in RP:
        for nu in NU:
            if e >= 1 and abs(nu) >= math.acos(-1 / e) - 0.2:
                continue
            r0, v0 = from_perifocal(rp, e, nu)
            if e == 1.0:
                v0 = v0 * (math.sqrt(2 * MU / np.linalg.norm(r0)) / np.linalg.norm(v0))
            for dt in DT:
                r1, v1 = kepler_reference(r0, v0, dt)
                cases.append(dict(e=e, rp=rp, nu=nu, r=[f17(x) for x in r0], v=[f17(x) for x in v0], dt=dt,
                                  r1=[f17(x) for x in r1], v1=[f17(x) for x in v1]))
assert len(cases) == 888, len(cases)


def build(rp, e, nu, mu, raan, inc, argp):
    r0, v0 = from_perifocal(rp, e, nu, inc, raan, argp, mu)
    if e == 1.0:
        v0 = v0 * (math.sqrt(2 * mu / np.linalg.norm(r0)) / np.linalg.norm(v0))
    return r0, v0


def case(e, rp, nu, mu, raan, inc, argp, dt):
    r0, v0 = build(rp, e, nu, mu, raan, inc, argp)
    r1, v1 = kepler_reference(r0, v0, dt, mu)
    return dict(e=e, rp=rp, nu=nu, r=[f17(x) for x in r0], v=[f17(x) for x in v0], dt=dt,
                r1=[f17(x) for x in r1], v1=[f17(x) for x in v1])


# Block `heliocentric`: another mu and another orientation. mu = 1.32712440018e20, Omega = 4.0, i = 2.5, omega = 5.5 rad;
# e in {0.0167, 0.2, 0.9, 1, 1.5} x perihelion in {5e10, 1.5e11, 7.8e11} m x nu in {-1, 0.5} rad x dt in
# {86400, 3e6, 3e8, -3e6} s = 120 cases, built as the main block is built (for e = 1 the speed scaled to sqrt(2 mu / r)).
MU_SUN = 1.32712440018e20
helio = [case(e, rp, nu, MU_SUN, 4.0, 2.5, 5.5, dt)
         for e in [0.0167, 0.2, 0.9, 1.0, 1.5] for rp in [5e10, 1.5e11, 7.8e11] for nu in [-1.0, 0.5]
         for dt in [86400.0, 3e6, 3e8, -3e6]]
assert len(helio) == 120
# Block `short`: very short steps, Earth's mu and the main block's orientation: e in {0.001, 0.6, 1, 1.5},
# r_p = 6.578e6 m, nu in {0, 0.8} rad, dt in {1e-3, -1e-3, 1} s = 24 cases.
short = [case(e, 6.578e6, nu, MU, RAAN, INC, ARGP, dt)
         for e in [0.001, 0.6, 1.0, 1.5] for nu in [0.0, 0.8] for dt in [1e-3, -1e-3, 1.0]]
assert len(short) == 24
# Block `extreme`: the three inputs of the test `ends on extreme inputs`, solved at 120 digits instead of 80 (the
# route loses about 6 digits to 190,000 revolutions and a few to the deep hyperbola); `check_dps` is the largest
# difference between the 120-digit and a 160-digit solution, a measure of the reference against itself.
extreme = []
check = 0.0
for e, dt in [(10.0, 1e12), (0.001, 1e9), (0.001, -1e9)]:
    mp.mp.dps = 120
    c = case(e, 6.578e6, 0.0, MU, RAAN, INC, ARGP, dt)
    r0, v0 = build(6.578e6, e, 0.0, MU, RAAN, INC, ARGP)
    r120, v120 = kepler_reference(r0, v0, dt)
    mp.mp.dps = 160
    r160, v160 = kepler_reference(r0, v0, dt)
    d = max(abs(a_ - b_) / abs(b_) for a_, b_ in zip(r120 + v120, r160 + v160))
    check = max(check, float(d))
    mp.mp.dps = 120
    extreme.append(c)
mp.mp.dps = 80
assert check < 1e-15, check
print('extreme block: 120 digits against 160 digits, worst relative difference', check)
out = dict(generator=f'mpmath {mp.__version__} at {mp.mp.dps} digits; numpy {np.__version__}',
           script='make_kepler_fixture.py', mu=MU, raan=RAAN, inc=INC, argp=ARGP, cases=cases,
           heliocentric=dict(mu=MU_SUN, raan=4.0, inc=2.5, argp=5.5, cases=helio), short=dict(cases=short),
           extreme=dict(dps=120, cases=extreme))
OUT.write_text(json.dumps(out, indent=1) + '\n')
print(OUT, len(cases), 'cases', len(helio), 'heliocentric', len(short), 'short', len(extreme), 'extreme')
