"""PF-11 fixture: the IAU 2000B frame chain from ERFA (pnm00b, gst00b, gmst82, pom00, c2teqx, bp00), and c2t06a beside it.

    python3 -m venv astro-venv && astro-venv/bin/pip install -r tests/fixtures/astro/requirements.txt
    astro-venv/bin/python make_frames_fixture.py

25 instants: the first of January and July of 1990, 1995, ... 2040 (22) in time order, then 1969-07-16, 1961-04-12 and
2059-12-31; the k-th (k from 0) at k * 3456 s after 0 h UTC of its date, so that every time of day occurs.
Every date is a pair [a, b]: a half-integer day and a fraction of a day. TT is erfa.utctai then erfa.taitt. UT1 is UTC
with dut1 / 86400 added to its second part, as this base's utcToUt1 forms it; ERFA's utcut1 is not used, since in the
drift years it takes TAI - UTC at 0 h of the day (2.3 ms off at 1969-07-16, plan S20 amendment 12).
Earth orientation is constant: dut1 = -0.1 s, xp = 0.1 arcsecond, yp = 0.3 arcsecond (stored in radians).
A matrix is nine numbers, row-major, ERFA's r[i][j] at 3 * i + j: it maps a column vector v to r v.
ERFA warns of a "dubious year" outside its leap-second table's span: the warning is silenced by name.
"""
import json, math, warnings
from pathlib import Path
import erfa
import numpy as np

warnings.simplefilter('ignore', erfa.ErfaWarning)
OUT = Path(__file__).resolve().parent / 'erfa-frames.json'
ARCSEC = math.pi / (180 * 3600)
DUT1, XP, YP = -0.1, 0.1 * ARCSEC, 0.3 * ARCSEC

DATES = [(y, m, 1) for y in range(1990, 2041, 5) for m in (1, 7)] + [(1969, 7, 16), (1961, 4, 12), (2059, 12, 31)]
assert len(DATES) == 25


def flat(m):
    m = np.asarray(m, dtype=float)
    assert m.shape == (3, 3)
    return [float(v) for v in m.reshape(9)]


def angle(a, b):
    """The angle of the rotation a b^T, from its antisymmetric part (the sine of the angle)."""
    m = (np.asarray(a) @ np.asarray(b).T).reshape(9)
    return 0.5 * math.hypot(m[7] - m[5], m[2] - m[6], m[3] - m[1])


rb, _, _ = erfa.bp00(2451545.0, 0.0)          # the frame bias does not depend on the date
pom = erfa.pom00(XP, YP, 0.0)
instants, worst = [], 0.0
for k, (y, m, d) in enumerate(DATES):
    d1, d2 = erfa.cal2jd(y, m, d)
    utc = (float(d1 + d2), k * 3456 / 86400)  # 0 h is a half-integer Julian date, exact
    tt = tuple(float(x) for x in erfa.taitt(*erfa.utctai(*utc)))
    assert tt[0] == utc[0]
    ut1 = (utc[0], utc[1] + DUT1 / 86400)
    pnm = erfa.pnm00b(*tt)
    gst = float(erfa.gst00b(*ut1))
    c2t = erfa.c2teqx(pnm, gst, pom)
    full = erfa.c2t06a(*tt, *ut1, XP, YP)
    if 1990 <= y <= 2040:
        worst = max(worst, angle(c2t, full))
    instants.append(dict(date=f'{y:04d}-{m:02d}-{d:02d}', utc=list(utc), tt=list(tt), ut1=list(ut1),
                         pnm00b=flat(pnm), gst00b=gst, gmst82=float(erfa.gmst82(*ut1)), c2teqx=flat(c2t), c2t06a=flat(full)))
assert [i['utc'][0] for i in instants[:22]] == sorted(i['utc'][0] for i in instants[:22])
assert worst <= 9.7e-9, worst                 # 2 mas: the IAU 2000B chain against IAU 2006/2000A, 1990 to 2040

out = dict(generator=f'pyerfa {erfa.__version__} (ERFA {erfa.version.erfa_version}), numpy {np.__version__}: '
                     'cal2jd, utctai, taitt, pnm00b, gst00b, gmst82, pom00, c2teqx, bp00, c2t06a',
           script='make_frames_fixture.py', eop=dict(dut1=DUT1, xp=XP, yp=YP), pom00=flat(pom), rb=flat(rb), instants=instants)


def f17(o):
    if isinstance(o, float):
        return float(f'{o:.17g}')
    if isinstance(o, dict):
        return {k: f17(v) for k, v in o.items()}
    return [f17(v) for v in o] if isinstance(o, list) else o


OUT.write_text(json.dumps(f17(out), indent=1) + '\n')
print(OUT, len(instants), 'instants; IAU 2000B against IAU 2006/2000A, 1990-2040: worst', f'{worst:.3e} rad')
