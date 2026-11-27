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

Also held (plan S20 amendment 13):
- per instant, `gcrf_to_teme`: R3(gmst82)^T R3(gst00b) pnm00b, with R3 ERFA's rz (the pole cancels in this product);
- `wrap`: UT1 instants at which ERFA's gst00b or gmst82 returns exactly 2 pi (its anp adds 2 pi to a tiny negative
  angle), each asserted here. The three for gst00b were found by the plan's reviewer. Those for gmst82 come from a
  deterministic search: for each of 400 days, the wrap within the day is bisected to adjacent doubles and the doubles
  around it are tried. gmst82's argument reaches 2 pi only from below zero, and with the first part a half-integer the
  seconds of the day (86,400 (frac(d1) + frac(d2)) >= 43,200) step by 1.06e-15 rad there, too coarse to land within
  half an ulp of 2 pi; the search therefore splits the date at noon (first part an integer), which any split allows;
- `tables`: the row counts and checksums (the sum over rows i and columns j, both from 1, of i * j * x, in that order,
  in doubles) of the four series tables, NUT00B_LS (the 77 rows of x[] in nut00b.c, eleven numbers each),
  NUT00B_PLANETARY_OFFSET (DPPLAN and DEPLAN of nut00b.c in milliarcseconds, one row), EECT00_T0 and EECT00_T1 (e0[]
  and e1[] of eect00.c, ten numbers a row). With the environment variable ERFA_SRC naming the folder of the ERFA C
  sources, they are derived from nut00b.c and eect00.c (comments stripped) and asserted equal to the figures kept
  below; without it, the figures below are written.
"""
import json, math, os, re, warnings
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


# the series tables: rows (for the planetary offset, its two numbers) and checksums, as kept and as derived
TABLES = {
    'NUT00B_LS': dict(rows=77, checksum=-160332379.0),
    'NUT00B_PLANETARY_OFFSET': dict(rows=2, checksum=0.641),
    'EECT00_T0': dict(rows=33, checksum=1314.0255977900008),
    'EECT00_T1': dict(rows=1, checksum=4.99999217),
}
NUMBER = re.compile(r'[-+]?(?:\d+\.\d*|\.\d+|\d+)(?:[eE][-+]?\d+)?')


def checksum(rows):
    s = 0.0
    for i, row in enumerate(rows, 1):
        for j, x in enumerate(row, 1):
            s += i * j * x
    return s


def source(name):
    text = (Path(os.environ['ERFA_SRC']) / name).read_text()
    return re.sub(r'/\*.*?\*/', ' ', text, flags=re.S)


def array(text, opener, width):
    """The numbers of the static array that starts at `opener`, up to its closing brace and semicolon, `width` a row."""
    start = text.index(opener) + len(opener)
    body = text[start:text.index('};', start)]
    nums = [float(v) for v in NUMBER.findall(body)]
    assert len(nums) % width == 0 and body.count('{') == len(nums) // width * (1 if width == 11 else 2), opener
    return [nums[k:k + width] for k in range(0, len(nums), width)]


def derived():
    nut, eect = source('nut00b.c'), source('eect00.c')
    plan = [float(re.search(rf'{n}\s*=\s*({NUMBER.pattern})\s*\*\s*ERFA_DMAS2R', nut).group(1)) for n in ('DPPLAN', 'DEPLAN')]
    tables = dict(NUT00B_LS=array(nut, '} x[] = {', 11), NUT00B_PLANETARY_OFFSET=[plan],
                  EECT00_T0=array(eect, 'e0[] = {', 10), EECT00_T1=array(eect, 'e1[] = {', 10))
    return {k: dict(rows=len(t) if k != 'NUT00B_PLANETARY_OFFSET' else len(t[0]), checksum=checksum(t)) for k, t in tables.items()}


if 'ERFA_SRC' in os.environ:
    found = derived()
    assert found == TABLES, found

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
    g82 = float(erfa.gmst82(*ut1))
    teme = erfa.rz(g82, np.eye(3)).T @ erfa.rz(gst, np.eye(3)) @ pnm
    if 1990 <= y <= 2040:
        worst = max(worst, angle(c2t, full))
    instants.append(dict(date=f'{y:04d}-{m:02d}-{d:02d}', utc=list(utc), tt=list(tt), ut1=list(ut1),
                         pnm00b=flat(pnm), gst00b=gst, gmst82=g82, c2teqx=flat(c2t), c2t06a=flat(full),
                         gcrf_to_teme=flat(teme)))
assert [i['utc'][0] for i in instants[:22]] == sorted(i['utc'][0] for i in instants[:22])
assert worst <= 9.7e-9, worst                 # 2 mas: the IAU 2000B chain against IAU 2006/2000A, 1990 to 2040

# the wrap: instants at which ERFA returns exactly 2 pi
TWO_PI = 2 * math.pi
GST00B_WRAP = [(2451545.5, 0.7176188233457006), (2451767.5, 0.11146314398037875), (2451952.5, 0.6036030215393594)]


def wrap_search(fn, day, steps=1000, scan=3000):
    """Fractions of `day` at which fn(day, f) is exactly 2 pi: each downward jump through pi bisected to adjacent doubles, then the doubles around it tried."""
    g = lambda f: float(fn(day, f))
    hits = []
    for n in range(steps):
        lo, hi = n / steps, (n + 1) / steps
        if not (g(lo) > math.pi and g(hi) < math.pi):
            continue
        while np.nextafter(lo, 2.0) < hi:
            mid = 0.5 * (lo + hi)
            if not lo < mid < hi:
                break
            lo, hi = (mid, hi) if g(mid) > math.pi else (lo, mid)
        x = lo
        for _ in range(scan):
            x = float(np.nextafter(x, -1.0))
        for _ in range(2 * scan):
            if g(x) == TWO_PI:
                hits.append(x)
                break
            x = float(np.nextafter(x, 2.0))
    return hits


GMST82_WRAP = []
for n in range(400):                          # days from 2000-01-01 12 h UT1, split at noon
    GMST82_WRAP += [(2451545.0 + n, f) for f in wrap_search(erfa.gmst82, 2451545.0 + n)]
    if len(GMST82_WRAP) >= 3:
        break
wrap = []
for name, fn, pairs in (('gst00b', erfa.gst00b, GST00B_WRAP), ('gmst82', erfa.gmst82, GMST82_WRAP[:3])):
    for a, b in pairs:
        value = float(fn(a, b))
        assert value == TWO_PI, (name, a, b, value)
        wrap.append(dict(fn=name, ut1=[a, b], erfa=value))
assert sum(w['fn'] == 'gst00b' for w in wrap) == 3

out = dict(generator=f'pyerfa {erfa.__version__} (ERFA {erfa.version.erfa_version}), numpy {np.__version__}: '
                     'cal2jd, utctai, taitt, pnm00b, gst00b, gmst82, pom00, c2teqx, bp00, c2t06a, rz; tables from nut00b.c, eect00.c',
           script='make_frames_fixture.py', eop=dict(dut1=DUT1, xp=XP, yp=YP), pom00=flat(pom), rb=flat(rb), instants=instants,
           wrap=wrap, tables=TABLES)


def f17(o):
    if isinstance(o, float):
        return float(f'{o:.17g}')
    if isinstance(o, dict):
        return {k: f17(v) for k, v in o.items()}
    return [f17(v) for v in o] if isinstance(o, list) else o


OUT.write_text(json.dumps(f17(out), indent=1) + '\n')
print(OUT, len(instants), 'instants;', sum(w['fn'] == 'gst00b' for w in wrap), 'gst00b and',
      sum(w['fn'] == 'gmst82' for w in wrap), 'gmst82 at the wrap; tables', 'derived' if 'ERFA_SRC' in os.environ else 'as kept', ';')
print('IAU 2000B against IAU 2006/2000A, 1990-2040: worst', f'{worst:.3e} rad')
