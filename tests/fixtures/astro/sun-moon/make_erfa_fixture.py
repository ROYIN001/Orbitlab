"""PF-14 fixture: the Moon, the Earth-Moon barycentre and the Sun from ERFA (moon98, plan94, bp00, dtf2d).

    python3 -m venv astro-venv && astro-venv/bin/pip install -r tests/fixtures/astro/requirements.txt
    astro-venv/bin/python make_erfa_fixture.py
    ERFA_SRC=<pyerfa-2.0.1.5/liberfa/erfa/src> astro-venv/bin/python make_erfa_fixture.py   # also checks the C sources

65 TT instants, each a pair [a, b]. For i from 1 to 50, jd = 2415020.5 + 73049 H2(i) (1900 to 2100; H2 is the Halton
value in base 2, index from 1), stored as a = floor(jd - 0.5) + 0.5, b = jd - a. Then ten by hand: {2451545.0, 0},
{2451545.0, 0.5}, {2400000.5, 51544.5}, and seven calendar instants as erfa.dtf2d('TT', ...) splits them, among them
the years 999 and 3001, outside the years plan94 is fitted to (its status is 1 there; the numbers are kept). Then
five more by hand whose second part is not a dyadic fraction, so that a date whose two parts are added before J2000 is
taken off is seen: {2451545.0, 0.1}, {2460000.5, 0.123456789}, {2400000.5, 60310.3371}, {2440423.5, 0.7},
{2469807.5, 0.31415926}.

At each: moon = moon98 (geocentric, GCRS); emb = plan94 with np = 3 (heliocentric Earth-Moon barycentre, mean equator
and equinox of J2000); sun = -(rb^T emb - moon / (1 + mu)), the same for the velocity, with rb from
erfa.bp00(2451545.0, 0.0) and mu = 81.30056, the Earth/Moon mass ratio. The time argument is TT for all three.
Astronomical units and days are turned to metres and seconds with AU = 149597870700 m and 86400 s. Metres, m/s.

With ERFA_SRC set, the script asserts from moon98.c and plan94.c the smallest non-zero coefficients of moon98's series
(0.000294 deg in longitude, 0.000107 deg in latitude, 1117 m in distance), and plan94's amas and the third row of omega
(the barycentre's node), which the fixture also carries.
"""
import json, math, os, re, warnings
from pathlib import Path
import erfa
import numpy as np

warnings.simplefilter('ignore', erfa.ErfaWarning)
OUT = Path(__file__).resolve().parent / 'erfa-sun-moon.json'
AU = 149597870700.0
DAY = 86400.0
EMRAT = 81.30056
AMAS_EMB = 328900.5
OMEGA_EMB = [174.87317577, -8679.27034, 15.34191]


def halton(i, base):
    f, r = 1.0, 0.0
    while i > 0:
        f /= base
        r += f * (i % base)
        i //= base
    return r


def check_sources(src):
    src = Path(src)
    moon = (src / 'moon98.c').read_text()
    plan = (src / 'plan94.c').read_text()
    num = r'(-?\d+(?:\.\d*)?)'
    lr = re.findall(r'\{\s*(-?\d+),\s*(-?\d+),\s*(-?\d+),\s*(-?\d+),\s*' + num + r',\s*' + num + r'\s*\}',
                    moon.split('tlr[] =')[1].split(';')[0])
    tb = re.findall(r'\{\s*(-?\d+),\s*(-?\d+),\s*(-?\d+),\s*(-?\d+),\s*' + num + r'\s*\}',
                    moon.split('tb[] =')[1].split(';')[0])
    assert len(lr) == 60 and len(tb) == 60, (len(lr), len(tb))
    smallest = lambda xs: min(abs(float(x)) for x in xs if float(x) != 0.0)
    assert smallest(r[4] for r in lr) == 0.000294
    assert smallest(r[4] for r in tb) == 0.000107
    assert smallest(r[5] for r in lr) == 1117.0
    amas = [float(x) for x in re.findall(r'(\d+\.\d*)', plan.split('amas[] =')[1].split(';')[0])]
    assert len(amas) == 8 and amas[2] == AMAS_EMB, amas
    omega = re.findall(r'\{\s*' + num + r',\s*' + num + r',\s*' + num + r'\s*\}', plan.split('omega[][3] =')[1].split(';')[0])
    assert len(omega) == 8 and [float(x) for x in omega[2]] == OMEGA_EMB, omega
    print('ERFA_SRC: the smallest coefficients of moon98.c, and amas and the third row of omega of plan94.c, are as stated')


if os.environ.get('ERFA_SRC'):
    check_sources(os.environ['ERFA_SRC'])

rb = np.array(erfa.bp00(2451545.0, 0.0)[0])


def state(p, v):
    return dict(r=[float(x) for x in p], v=[float(x) for x in v])


def entry(label, a, b):
    a, b = float(a), float(b)
    pvm = erfa.ufunc.moon98(a, b)
    moon_r = np.array(pvm[0]) * AU
    moon_v = np.array(pvm[1]) * AU / DAY
    pve, status = erfa.ufunc.plan94(a, b, 3)
    emb_r = np.array(pve[0]) * AU
    emb_v = np.array(pve[1]) * AU / DAY
    sun_r = -(rb.T @ emb_r - moon_r / (1 + EMRAT))
    sun_v = -(rb.T @ emb_v - moon_v / (1 + EMRAT))
    return dict(label=label, tt=[a, b], status=int(status), moon=state(moon_r, moon_v), emb=state(emb_r, emb_v),
                sun=state(sun_r, sun_v))


instants = []
for i in range(1, 51):
    jd = 2415020.5 + 73049 * halton(i, 2)
    a = math.floor(jd - 0.5) + 0.5
    b = jd - a
    assert a + b == jd and 0 <= b < 1
    instants.append(entry(f'H2({i})', a, b))
instants.append(entry('J2000', 2451545.0, 0.0))
instants.append(entry('J2000 + 0.5 d', 2451545.0, 0.5))
instants.append(entry('MJD 51544.5', 2400000.5, 51544.5))
CALENDAR = [(1950, 1, 1, 0, 0), (2050, 1, 1, 0, 0), (1969, 7, 20, 20, 17), (2026, 9, 15, 12, 0), (2024, 3, 20, 12, 0),
            (999, 1, 1, 0, 0), (3001, 1, 1, 0, 0)]
for (y, m, d, h, mi) in CALENDAR:
    a, b = erfa.dtf2d('TT', y, m, d, h, mi, 0)
    instants.append(entry(f'{y:04d}-{m:02d}-{d:02d} {h:02d}:{mi:02d} TT', a, b))
assert len(instants) == 60
for (a, b) in [(2451545.0, 0.1), (2460000.5, 0.123456789), (2400000.5, 60310.3371), (2440423.5, 0.7),
               (2469807.5, 0.31415926)]:
    instants.append(entry(f'{a} + {b}', a, b))
assert len(instants) == 65
assert [s['status'] for s in instants] == [0] * 58 + [1, 1] + [0] * 5

out = dict(generator=f'pyerfa {erfa.__version__} (ERFA {erfa.version.erfa_version}): moon98, plan94, bp00, dtf2d; '
                     f'numpy {np.__version__}',
           script='make_erfa_fixture.py', au=AU, earth_moon_mass_ratio=EMRAT, amas_emb=AMAS_EMB,
           omega_emb=OMEGA_EMB,
           rb=[float(x) for x in rb.ravel()], instants=instants)


def f17(o):
    if isinstance(o, float):
        return float(f'{o:.17g}')
    if isinstance(o, dict):
        return {k: f17(v) for k, v in o.items()}
    return [f17(v) for v in o] if isinstance(o, list) else o


OUT.write_text(json.dumps(f17(out), indent=1) + '\n')
print(OUT, len(instants), 'instants')
