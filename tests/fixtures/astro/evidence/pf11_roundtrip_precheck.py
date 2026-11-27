"""Pre-check of the state round trip and the velocity case of PF-11, made before the package started.

Reference tools only (pyerfa, numpy): the work plan's velocity formula on ERFA's own matrices
(pnm00b, gst00b, pom00), in doubles. No app code.

Run:  python pf11_roundtrip_precheck.py        (about two minutes)
Found on 2026-11-27 (pyerfa 2.0.1.5), instants from 1990 to 2040, positions at 7,000 km:
  - GCRF -> ITRF -> GCRF leaves up to 8.5e-9 m, and in velocity 2.9e-13 m/s for a point fixed in
    GCRF, 1.0e-11 m/s at 7.5 km/s and 1.7e-11 m/s at 11 km/s (40,000 states each);
  - ERFA's GCRF->ITRF matrices differ from a rotation by up to 1.2e-15 in an element of M Mt - I,
    which is 8.5e-9 m at 7,000 km: the round trip leaves exactly that;
  - the velocity formula for a point moving at 7.5 km/s is within 5.5e-5 m/s of the centred
    difference over 1 s (bound 2e-4), where dropping the M v term is off by the speed.
The bounds 1e-8 m and 1e-11 m/s sat at these figures; they are 1e-7 m and 1e-10 m/s
(plan S20, amendment 12).
"""
import math, warnings
import erfa, numpy as np
warnings.simplefilter('ignore')
rng = np.random.RandomState(7)
W = np.array([0.0, 0.0, 7.292115146706979e-5]); ARC = math.pi / (180 * 3600)
def chain(jd_utc, off=0.0):
    """GCRF -> PEF and the pole at a UTC instant; `off` (days) is added to the second part, so a 1 s step is not lost in a one-number date."""
    a = math.floor(jd_utc - 0.5) + 0.5; b = (jd_utc - a) + off
    t1, t2 = erfa.utctai(a, b); tt1, tt2 = erfa.taitt(t1, t2)
    gst = erfa.gst00b(a, b - 0.1 / 86400)
    M = erfa.rxr(erfa.rz(gst, np.eye(3)), erfa.pnm00b(tt1, tt2))        # GCRF -> PEF
    P = erfa.pom00(0.1 * ARC, 0.3 * ARC, 0.0)
    return np.array(M), np.array(P)
def fwd(M, P, r, v):
    rp = M @ r; vp = M @ v - np.cross(W, rp); return P @ rp, P @ vp
def back(M, P, r, v):
    rp = P.T @ r; vp = P.T @ v; return M.T @ rp, M.T @ (vp + np.cross(W, rp))
res = {}
for name, speed in (('a point fixed in GCRF (the test case)', 0.0), ('a circular-orbit speed, 7.5 km/s', 7546.0), ('escape-like, 11 km/s', 11000.0)):
    wr = wv = 0.0
    for _ in range(40000):
        M, P = chain(float(rng.uniform(2447892.5, 2466154.5)))
        u = rng.normal(size=3); r = 7.0e6 * u / np.linalg.norm(u)
        w = rng.normal(size=3); v = speed * w / np.linalg.norm(w) if speed else np.zeros(3)
        r2, v2 = back(M, P, *fwd(M, P, r, v))
        wr = max(wr, float(np.linalg.norm(r2 - r))); wv = max(wv, float(np.linalg.norm(v2 - v)))
    print(f'{name}: worst position {wr:.2e} m (bound 1e-8), worst velocity {wv:.2e} m/s (bound 1e-11)')

# the matrices' own departure from a rotation, which the transpose-as-inverse round trip inherits
wd = 0.0
for _ in range(20000):
    M, P = chain(float(rng.uniform(2447892.5, 2466154.5)))
    C = P @ M
    wd = max(wd, float(np.max(np.abs(C @ C.T - np.eye(3)))))
print(f'ERFA GCRF->ITRF matrices: worst |M Mt - I| element {wd:.2e}; times 7,000 km: {wd*7e6:.2e} m; the plan allows 1e-14, which is {1e-14*7e6:.1e} m')

# the velocity formula for a MOVING point: centred difference of the ITRF position of r0 + v0 t over 1 s
wm = 0.0
for _ in range(4000):
    jd = float(rng.uniform(2447892.5, 2466154.5))
    u = rng.normal(size=3); r0 = 7.0e6 * u / np.linalg.norm(u)
    w = rng.normal(size=3); v0 = 7546.0 * w / np.linalg.norm(w)
    M, P = chain(jd); _, v = fwd(M, P, r0, v0)
    h = 0.5 / 86400
    Mm, Pm = chain(jd, -h); Mp, Pp = chain(jd, +h)
    num = (Pp @ (Mp @ (r0 + 0.5 * v0)) - Pm @ (Mm @ (r0 - 0.5 * v0))) / 1.0
    wm = max(wm, float(np.linalg.norm(v - num)))
    # a wrong forward transform that drops M v would be off by the speed itself
print(f'moving point, 7.5 km/s: formula against centred difference over 1 s: worst {wm:.2e} m/s (bound 2e-4); dropping the M v term is off by 7.5e3 m/s')
