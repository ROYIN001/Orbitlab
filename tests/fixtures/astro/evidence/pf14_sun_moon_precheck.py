"""Pre-check of PF-14's bounds, made before the package started (S20 wave 2, Task 2).

Reference tools only (pyerfa, Skyfield with JPL DE421); no app code. Candidates for the base's
Sun and Moon: ERFA moon98 (Meeus 1998, from ELP2000-82; GCRS) and ERFA plan94 for the Earth-Moon
barycentre (Simon et al. 1994; mean equator and equinox of J2000), the Earth taken from the
barycentre with the Moon of moon98. Truth: the geometric geocentric position from DE421.

Run from a folder that holds de421.bsp (Skyfield downloads it there):  python pf14_sun_moon_precheck.py

Found on 2026-11-27: at 400 Halton epochs of 1950-2050 the Moon is within 0.00286 deg and 0.0024 % in
distance, the Sun within 0.00200 deg and 0.0008 %; at 20,001 epochs 0.00504 deg, 0.0034 % and 0.00215 deg,
0.0008 %. Without the Moon's term the Sun is 0.0039 deg off. As vectors: the Moon 31 km and 0.17 m/s, the
Sun 5,700 km and 2.1 m/s at worst.
"""
import math, warnings
import erfa, numpy as np
from skyfield.api import load
warnings.simplefilter('ignore')
AU = 149597870700.0
eph = load('de421.bsp'); ts = load.timescale(builtin=True)
EMRAT = 81.30056     # Earth/Moon mass ratio of DE421
rb, _, _ = erfa.bp00(2451545.0, 0.0)   # GCRS -> mean equator and equinox of J2000

def halton(i, b):
    f, r = 1.0, 0.0
    while i > 0: f /= b; r += f * (i % b); i //= b
    return r

def candidates(tt1, tt2):
    pvm = erfa.moon98(tt1, tt2); moon = np.array(pvm['p']) * AU; vmoon = np.array(pvm['v']) * AU / 86400
    pv = erfa.plan94(tt1, tt2, 3)
    emb = rb.T @ np.array(pv['p']) * AU       # heliocentric Earth-Moon barycentre, turned to GCRS axes
    vemb = rb.T @ np.array(pv['v']) * AU / 86400
    sun = -(emb - moon / (1 + EMRAT))
    sun_no_moon = -emb                                        # what leaving the barycentre uncorrected costs
    return moon, sun, sun_no_moon, vmoon, -(vemb - vmoon / (1 + EMRAT))

def truth(tt_jd):
    t = ts.tt_jd(tt_jd)
    e = eph['earth'].at(t); m = eph['moon'].at(t); su = eph['sun'].at(t)
    return m.position.m - e.position.m, su.position.m - e.position.m, m.velocity.m_per_s - e.velocity.m_per_s, su.velocity.m_per_s - e.velocity.m_per_s

def ang(a, b): return math.degrees(math.atan2(np.linalg.norm(np.cross(a, b)), float(np.dot(a, b))))

def scan(jds, label):
    wm = [0, 0, 0, 0]; wsun = [0, 0, 0, 0]; wsn = 0
    for jd in jds:
        a = math.floor(jd - 0.5) + 0.5
        moon, sun, sun_nm, vmoon, vsun = candidates(a, jd - a)
        tm, tsun, tvm, tvs = truth(jd)
        wm[2] = max(wm[2], np.linalg.norm(moon - tm)); wm[3] = max(wm[3], np.linalg.norm(vmoon - tvm))
        wsun[2] = max(wsun[2], np.linalg.norm(sun - tsun)); wsun[3] = max(wsun[3], np.linalg.norm(vsun - tvs))
        wm[0] = max(wm[0], ang(moon, tm)); wm[1] = max(wm[1], abs(np.linalg.norm(moon) / np.linalg.norm(tm) - 1))
        wsun[0] = max(wsun[0], ang(sun, tsun)); wsun[1] = max(wsun[1], abs(np.linalg.norm(sun) / np.linalg.norm(tsun) - 1))
        wsn = max(wsn, ang(sun_nm, tsun))
    print(f'{label}: Moon {wm[0]:.5f} deg, {wm[1]*100:.5f} % in distance (bounds 0.01 deg, 0.05 %); Sun {wsun[0]:.5f} deg, {wsun[1]*100:.5f} % (bounds 0.01 deg, 0.1 %); Sun without the Moon correction {wsn:.5f} deg')
    print(f'    as vectors: Moon {wm[2]/1000:.1f} km and {wm[3]:.3f} m/s; Sun {wsun[2]/1000:.0f} km and {wsun[3]:.3f} m/s')

J = lambda y, m, d: sum(erfa.cal2jd(y, m, d))
lo, hi = J(1950, 1, 1), J(2050, 1, 1)
scan([lo + (hi - lo) * halton(i, 2) for i in range(1, 401)], '400 Halton epochs, 1950-2050')
scan(np.linspace(lo, hi, 20001), '20,001 epochs, 1950-2050      ')
scan(np.linspace(J(1900, 1, 1), J(1950, 1, 1), 4001), '4,001 epochs, 1900-1950        ')
scan(np.linspace(J(2050, 1, 2), J(2053, 9, 1), 801), '801 epochs, 2050 to 2053-09 (the kernel ends there)')
# Skyfield's astrometric position (light time taken in the barycentric frame) against the geometric one used here
t = ts.tt_jd(2460000.5); e = eph['earth'].at(t)
print(f'geometric against Skyfield\'s astrometric position, Sun: {ang(eph["sun"].at(t).position.m - e.position.m, e.observe(eph["sun"]).position.m):.5f} deg; Moon: {ang(eph["moon"].at(t).position.m - e.position.m, e.observe(eph["moon"]).position.m):.6f} deg')
