"""PF-10 fixture: UTC, TAI, TT and TDB - TT from ERFA (dat, utctai, taitt, dtdb).

    python3 -m venv astro-venv && astro-venv/bin/pip install -r tests/fixtures/astro/requirements.txt
    astro-venv/bin/python make_time_fixture.py

Every date is a pair [a, b]: a half-integer day and a fraction of a day in [0, 1). Every dat and dtdb is in seconds.
ERFA warns of a "dubious year" after 2028 and returns 37 s there, which is the value wanted: the warning is silenced by name.
"""
import json, math, warnings
from pathlib import Path
import erfa

warnings.simplefilter('ignore', erfa.ErfaWarning)
OUT = Path(__file__).resolve().parent / 'erfa-time.json'


def halton(i, base):
    f, r = 1.0, 0.0
    while i > 0:
        f /= base
        r += f * (i % base)
        i //= base
    return r


def day(y, m, d):
    d1, d2 = erfa.cal2jd(y, m, d)
    return float(d1 + d2)          # 0 h UTC, a half-integer Julian date


def dat(a, b):
    """ERFA's TAI - UTC at the UTC instant (a, b), through its calendar date and day fraction."""
    y, m, d, _ = erfa.jd2cal(a, b)
    fd = (a - day(int(y), int(m), int(d))) + b
    return float(erfa.dat(int(y), int(m), int(d), fd))


def entry(a, b):
    return dict(utc=[a, b], dat=dat(a, b))


first = entry(day(1960, 1, 1), 0.0)
assert first['dat'] == float(erfa.dat(1960, 1, 1, 0.0))

# the changes of TAI - UTC from 1972-07-01 on: the value one second before 0 h, and at 0 h
leap = []
for y in range(1972, 2031):
    for m in range(1, 13):
        a = day(y, m, 1)
        if a < day(1972, 7, 1):
            continue
        before, at = entry(a - 1, 86399 / 86400), entry(a, 0.0)
        if before['dat'] != at['dat']:
            leap.append(dict(before=before, at=at))
assert len(leap) == 27 and leap[0]['at']['utc'][0] == day(1972, 7, 1) and leap[-1]['at']['utc'][0] == day(2017, 1, 1)
assert leap[-1]['at']['dat'] == 37.0

# the first day of each of the fifteen entries of dat.c from 1960-01-01 to 1972-01-01, then the 15th of every month 1960-1971
ENTRIES = [(1960, 1), (1961, 1), (1961, 8), (1962, 1), (1963, 11), (1964, 1), (1964, 4), (1964, 9), (1965, 1), (1965, 3),
           (1965, 7), (1965, 9), (1966, 1), (1968, 2), (1972, 1)]
drift = [entry(day(y, m, 1), 0.5) for (y, m) in ENTRIES] + [entry(day(y, m, 15), 0.5) for y in range(1960, 1972) for m in range(1, 13)]
assert len(drift) == 159

# 40 Halton instants (base 2) from 1972-01-01 to 2060-01-01, none within a day of a leap second
lo, hi = day(1972, 1, 1), day(2060, 1, 1)
steps = [l['at']['utc'][0] for l in leap]
scales, i = [], 0
while len(scales) < 40:
    i += 1
    jd = lo + (hi - lo) * halton(i, 2)
    if any(abs(jd - s) < 1 for s in steps):
        continue
    a = math.floor(jd - 0.5) + 0.5
    b = jd - a
    assert a + b == jd and 0 <= b < 1
    tai = erfa.utctai(a, b)
    tt = erfa.taitt(*tai)
    scales.append(dict(utc=[a, b], tai=[float(tai[0]), float(tai[1])], tt=[float(tt[0]), float(tt[1])]))

# 200 Halton instants (base 3) on TT from 1960-01-01 to 2060-01-01
lo, hi = day(1960, 1, 1), day(2060, 1, 1)
tdb = []
for i in range(1, 201):
    jd = lo + (hi - lo) * halton(i, 3)
    a = math.floor(jd - 0.5) + 0.5
    b = jd - a
    assert a + b == jd and 0 <= b < 1
    tdb.append(dict(tt=[a, b], dtdb=float(erfa.dtdb(a, b, 0.0, 0.0, 0.0, 0.0))))

out = dict(generator=f'pyerfa {erfa.__version__} (ERFA {erfa.version.erfa_version}): dat, utctai, taitt, dtdb',
           script='make_time_fixture.py', first=first, leap=leap, drift=drift, scales=scales, tdb=tdb)


def f17(o):
    if isinstance(o, float):
        return float(f'{o:.17g}')
    if isinstance(o, dict):
        return {k: f17(v) for k, v in o.items()}
    return [f17(v) for v in o] if isinstance(o, list) else o


OUT.write_text(json.dumps(f17(out), indent=1) + '\n')
print(OUT, len(leap), 'leap', len(drift), 'drift', len(scales), 'scales', len(tdb), 'tdb')
