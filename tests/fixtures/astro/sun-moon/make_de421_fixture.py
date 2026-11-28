"""PF-14 fixture: the geometric geocentric Moon and Sun from JPL DE421 through Skyfield.

    python3 -m venv astro-venv && astro-venv/bin/pip install -r tests/fixtures/astro/requirements.txt
    astro-venv/bin/python make_de421_fixture.py [folder]

The kernel de421.bsp is read from `folder` (default: the current folder); Skyfield's loader downloads it there from
JPL when it is missing. Keep that folder outside the repository: the kernel is never committed. The script checks its
size (16,788,480 bytes) and SHA-256, and the fixture carries both.

400 TT instants, jd = 2433282.5 + 36525 H2(i) for i from 1 to 400 (1950 to 2050; H2 is the Halton value in base 2),
each stored as a pair [a, b] with a = floor(jd - 0.5) + 0.5, b = jd - a. At each, with t = ts.tt_jd(jd):
eph[body].at(t).position.m - eph['earth'].at(t).position.m, and the same for .velocity.m_per_s, for the Moon and the
Sun: where the body is at the instant, with no light time and no aberration, on ICRS (GCRS) axes. Metres, m/s.
"""
import hashlib, json, math, sys
from pathlib import Path
import jplephem
import numpy as np
import skyfield
from skyfield.api import Loader

OUT = Path(__file__).resolve().parent / 'de421-sun-moon.json'
KERNEL = 'de421.bsp'
BYTES = 16788480
SHA256 = 'a20a7139da04cbc462454634918e9a9ca69127044e2cc9d4f9c16e238d2deedc'


def halton(i, base):
    f, r = 1.0, 0.0
    while i > 0:
        f /= base
        r += f * (i % base)
        i //= base
    return r


folder = Path(sys.argv[1] if len(sys.argv) > 1 else '.').resolve()
load = Loader(str(folder))
eph = load(KERNEL)
data = (folder / KERNEL).read_bytes()
assert len(data) == BYTES, len(data)
assert hashlib.sha256(data).hexdigest() == SHA256
ts = load.timescale(builtin=True)
earth, moon, sun = eph['earth'], eph['moon'], eph['sun']


def state(body, t):
    e, x = earth.at(t), body.at(t)
    return dict(r=[float(c) for c in x.position.m - e.position.m], v=[float(c) for c in x.velocity.m_per_s - e.velocity.m_per_s])


instants = []
for i in range(1, 401):
    jd = 2433282.5 + 36525 * halton(i, 2)
    a = math.floor(jd - 0.5) + 0.5
    b = jd - a
    assert a + b == jd and 0 <= b < 1
    t = ts.tt_jd(jd)
    instants.append(dict(tt=[a, b], moon=state(moon, t), sun=state(sun, t)))
assert len(instants) == 400

out = dict(generator=f'Skyfield {skyfield.__version__}, jplephem {jplephem.__version__}, numpy {np.__version__}; '
                     'JPL DE421 (load.timescale(builtin=True), ts.tt_jd)',
           script='make_de421_fixture.py', kernel=dict(name=KERNEL, bytes=BYTES, sha256=SHA256), instants=instants)


def f17(o):
    if isinstance(o, float):
        return float(f'{o:.17g}')
    if isinstance(o, dict):
        return {k: f17(v) for k, v in o.items()}
    return [f17(v) for v in o] if isinstance(o, list) else o


OUT.write_text(json.dumps(f17(out), indent=1) + '\n')
print(OUT, len(instants), 'instants')
