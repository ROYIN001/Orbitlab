"""PF-11 fixture: TEME to GCRS by Skyfield's TEME frame (skyfield.sgp4lib.TEME, AIAA 2006-6753 Appendix C).

    python3 -m venv astro-venv && astro-venv/bin/pip install -r tests/fixtures/astro/requirements.txt
    astro-venv/bin/python make_teme_fixture.py

20 instants (Halton base 2, index from 1) between 2020-01-01 and 2030-01-01 UTC; at each, the directions (1, 0, 0),
(0.3, -0.8, 0.52) and (-0.5, 0.5, 0.7071), each scaled to 7,000 km, as positions in TEME, and the same positions in
GCRS. The timescale is Skyfield's built-in one (load.timescale(builtin=True), no download); its t.dut1 is stored as
the UT1 - UTC of each instant. TEME to GCRS involves no polar motion. Every date is a pair [a, b]: a half-integer day
and a fraction of a day in [0, 1); the TT pair is Skyfield's own, kept to show which instant it used. Metres, seconds.
"""
import json, math
from pathlib import Path
import numpy as np
import skyfield
from skyfield.api import load
from skyfield.positionlib import ICRF
from skyfield.sgp4lib import TEME
from skyfield.units import Distance, Velocity

OUT = Path(__file__).resolve().parent / 'skyfield-teme.json'
R = 7.0e6
DIRECTIONS = [(1.0, 0.0, 0.0), (0.3, -0.8, 0.52), (-0.5, 0.5, 0.7071)]


def halton(i, base):
    f, r = 1.0, 0.0
    while i > 0:
        f /= base
        r += f * (i % base)
        i //= base
    return r


ts = load.timescale(builtin=True)
LO, HI = 2458849.5, 2462502.5                  # 2020-01-01 and 2030-01-01, 0 h UTC
assert HI - LO == 3653 and ts.utc(2020, 1, 1).utc_jpl() == 'A.D. 2020-Jan-01 00:00:00.0000 UTC'
vectors = [np.array(d) / np.linalg.norm(d) * R for d in DIRECTIONS]
instants = []
for i in range(1, 21):
    jd = LO + (HI - LO) * halton(i, 2)
    a = math.floor(jd - 0.5) + 0.5
    b = jd - a
    assert a + b == jd and 0 <= b < 1
    t = ts.utc(2020, 1, 1, 0, 0, (jd - LO) * 86400)
    tt = (float(t.whole), float(t.tt_fraction))
    rows = []
    for r in vectors:
        p = ICRF.from_time_and_frame_vectors(t, TEME, Distance(m=r), Velocity(km_per_s=np.zeros(3)))
        rows.append(dict(teme=[float(x) for x in r], gcrs=[float(x) for x in p.position.m]))
    instants.append(dict(utc=[a, b], tt=list(tt), dut1=float(t.dut1), vectors=rows))
assert sum(len(i['vectors']) for i in instants) == 60

out = dict(generator=f'Skyfield {skyfield.__version__} (TEME frame, load.timescale(builtin=True)), numpy {np.__version__}',
           script='make_teme_fixture.py', instants=instants)


def f17(o):
    if isinstance(o, float):
        return float(f'{o:.17g}')
    if isinstance(o, dict):
        return {k: f17(v) for k, v in o.items()}
    return [f17(v) for v in o] if isinstance(o, list) else o


OUT.write_text(json.dumps(f17(out), indent=1) + '\n')
print(OUT, len(instants), 'instants', 60, 'vectors')
