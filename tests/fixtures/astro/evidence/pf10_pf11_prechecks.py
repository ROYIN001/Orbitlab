"""Pre-checks of the bounds of PF-10 and PF-11, made before either package started.

Reference tools only (pyerfa); today's two app functions are transcribed operation for
operation, so no app code is imported and no new code is tested. Each block answers:
can a correct implementation meet the bound the work plan sets?

Run:  python pf10_pf11_prechecks.py
Found on 2026-11-26 (pyerfa 2.0.1.5):
  1. Today's temeToItrf against the exact IAU-1982 definition, 7,000 km: 16.9 mm with
     UT1-UTC = -0.1 s, 9.4 mm with 0. The work plan's 1e-4 m could not be met; the bound
     is 3e-2 m (plan S20, amendment 8).
  2. The velocity formula of PF-11 against the centred difference of the full chain:
     5.8e-5 m/s (bound 2e-4 m/s).
  3. The two-term TDB-TT of PF-10 against ERFA dtdb, 1960-2060: 37.5 us (bound 50 us).
"""
import math
import warnings

import erfa
import numpy as np

warnings.simplefilter('ignore')  # ERFA's "dubious year" after 2028 and before 1960
DEG = math.pi / 180
ARCSEC = math.pi / (180 * 3600)
TWO_PI = 2 * math.pi
R = 7.0e6  # m


def gmst_today(jd):
    """gmst() of src/physics/orbital.ts, same operation order."""
    T = (jd - 2451545.0) / 36525
    s = 280.46061837 + 360.98564736629 * (jd - 2451545.0) + 0.000387933 * T * T - (T * T * T) / 38710000
    a = math.fmod(s * DEG, TWO_PI)
    return a + TWO_PI if a < 0 else a


def teme_to_itrf_today(r, jd, dut1, xp, yp):
    """temeToItrf() of src/orbit/earth-orientation.ts; xp, yp in rad."""
    th = gmst_today(jd + dut1 / 86400)
    c, s = math.cos(th), math.sin(th)
    px, py, pz = c * r[0] + s * r[1], -s * r[0] + c * r[1], r[2]
    return np.array([px + xp * pz, py - yp * pz, pz - xp * px + yp * py])


def teme_to_itrf_exact(r, jd_day, frac, dut1, xp, yp):
    th = erfa.gmst82(jd_day, frac + dut1 / 86400)
    return erfa.pom00(xp, yp, 0.0) @ erfa.rz(th, np.eye(3)) @ r


# 1. TEME -> ITRF: today's function against the definition
dates = [(y, m, 1) for y in range(1990, 2041, 5) for m in (1, 7)] + [(1969, 7, 16), (1961, 4, 12), (2059, 12, 31)]
vectors = [np.array(v) / np.linalg.norm(v) * R for v in ([1, 0, 0], [0.3, -0.8, 0.52], [-0.5, 0.5, 0.7071])]
xp, yp = 0.1 * ARCSEC, 0.3 * ARCSEC
for dut1 in (-0.1, 0.0):
    worst = (0.0, None)
    for (y, m, d) in dates:
        for frac in (0.0, 0.123456789, 0.5, 0.987654321):
            d1, d2 = erfa.cal2jd(y, m, d)
            jd_day = d1 + d2          # exact: a half-integer
            jd = jd_day + frac        # the one number today's code is given
            frac_used = jd - jd_day   # the instant that number really is
            for r in vectors:
                e = np.linalg.norm(teme_to_itrf_today(r, jd, dut1, xp, yp) - teme_to_itrf_exact(r, jd_day, frac_used, dut1, xp, yp))
                if e > worst[0]:
                    worst = (e, (y, m, d, frac))
    print(f"1. TEME->ITRF, today's function against the IAU-1982 definition, UT1-UTC = {dut1:+.1f} s: worst {worst[0] * 1e3:.2f} mm at {worst[1]}")
exact_rate = 360 + 8640184.812866 / 36525 / 240  # degrees per day
step = float(np.spacing(2460000.5)) * 86400
print(f"   rate today 360.98564736629 deg/day, definition {exact_rate:.15f}: {abs(360.98564736629 - exact_rate) * 21915 * DEG * R * 1e3:.2f} mm by 2060")
print(f"   a Julian date in one number steps by {step * 1e6:.1f} us; half a step turns the Earth by {step / 2 * 7.292115e-5 * R * 1e3:.2f} mm at this radius")
print(f"   constant today 280.46061837 deg, definition 280.460618375: {5e-9 * DEG * R * 1e3:.2f} mm")
for y in (1961, 1990, 2025, 2040, 2059):
    d1, d2 = erfa.cal2jd(y, 7, 1)
    tt = erfa.taitt(*erfa.utctai(d1, d2))
    w = lambda a: (a + math.pi) % TWO_PI - math.pi
    g82 = erfa.gmst82(d1, d2)
    print(f"   what a 3 cm bound still separates, {y}: GMST-2000 in place of GMST-82 is {abs(w(erfa.gmst00(d1, d2, *tt) - g82)) * R:.2f} m; "
          f"an equation of the equinoxes added by mistake is {abs(w(erfa.gst00b(d1, d2) - g82)) * R:.0f} m")

# 2. Velocity: v = -omega x r in the Earth-fixed frame of date, against the centred difference of the chain
OMEGA = 7.292115146706979e-5


def gcrf_to_itrf(utc1, utc2, dut1):
    tt1, tt2 = erfa.taitt(*erfa.utctai(utc1, utc2))
    rbpn = erfa.pnm00b(tt1, tt2)
    gst = erfa.gst00b(utc1, utc2 + dut1 / 86400)
    rpom = erfa.pom00(xp, yp, 0.0)
    return erfa.c2teqx(rbpn, gst, rpom), rpom, erfa.rz(gst, np.eye(3)) @ rbpn


rng = np.random.default_rng(7)
worst = 0.0
for _ in range(1500):
    jd_day = math.floor(2436934.5 + rng.random() * 36525) + 0.5   # 1960 to 2060
    frac = rng.random()
    if abs(frac - 0.5) > 0.49:
        continue
    r = rng.normal(size=3)
    r = r / np.linalg.norm(r) * R
    h = 0.5 / 86400
    m_plus, _, _ = gcrf_to_itrf(jd_day, frac + h, -0.1)
    m_minus, _, _ = gcrf_to_itrf(jd_day, frac - h, -0.1)
    _, rpom, pef = gcrf_to_itrf(jd_day, frac, -0.1)
    v_numeric = m_plus @ r - m_minus @ r   # over 1 s
    v_formula = rpom @ (-np.cross([0, 0, OMEGA], pef @ r))
    worst = max(worst, float(np.linalg.norm(v_numeric - v_formula)))
print(f"2. velocity of a point fixed in GCRF: formula against centred difference over 1 s: worst {worst:.2e} m/s (bound 2e-4)")

# 3. TDB - TT by two terms against ERFA dtdb
worst = 0.0
for jd in np.linspace(2436934.5, 2473459.5, 200001):
    g = math.radians(357.53 + 0.98560028 * (jd - 2451545.0))
    worst = max(worst, abs(0.001657 * math.sin(g) + 0.000014 * math.sin(2 * g) - erfa.dtdb(jd, 0.0, 0.0, 0.0, 0.0, 0.0)))
print(f"3. TDB-TT, two terms against ERFA dtdb at 200,001 instants 1960-2060: worst {worst * 1e6:.1f} us (bound 50)")
