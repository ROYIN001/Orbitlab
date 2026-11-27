"""Pre-check of PF-13's bounds, made before the package started (S20 wave 2, Task 1).

Reference tools only (mpmath, numpy); no app code. The field is EGM2008 (tide free) to degree and
order 20, read from the head of the ICGEM file. Two evaluations of the acceleration:
  A. doubles, the recursion a port would use: Cunningham's V and W (Montenbruck & Gill, Satellite
     Orbits, 3.2.4-3.2.5) with unnormalized coefficients;
  B. mpmath at 40 digits, a different route: fully normalized associated Legendre functions and their
     derivatives, the gradient taken in spherical coordinates and turned to Cartesian.
It answers: can A meet 1e-10 relative against B at 16 points; does a degree-2, order-0 field equal the
app's closed-form J2 to 1e-13; what do the numerical checks of the potential leave.

Run:  python pf13_gravity_precheck.py <the first 60 kB of EGM2008.gfc>
(curl -r 0-60000 -o head.gfc https://icgem.gfz.de/getmodel/gfc/c50128797a9cb62e936337c890e4425f03f0461d7329b09a8cc8561504465340/EGM2008.gfc)

Found on 2026-11-27: A against B 1.1e-15 relative at 16 points, 9.0e-16 over a field cut at each degree;
the potential 1.4e-15; on the spin axis 1.0e-12 (B stands 1e-12 rad off it); J2 against gravityJ2 5.1e-16;
J2 to J4 against the propagator's zonal terms 6.5e-16; gradient 2.4e-11 and divergence 1.7e-11 at a
1,000 m step. At 35,786 km degree 20 is worth 9.5e-23; one coefficient 1 % wrong moves the acceleration at
300 km by 4e-10 to 5e-9. Its functions are imported by pf16_orekit_trial.py.
"""
import math, sys
import mpmath as mp
import numpy as np
mp.mp.dps = 40
N = 20

def read_gfc(path, nmax):
    gm = radius = None; C = {}; S = {}
    for line in open(path):
        p = line.split()
        if not p: continue
        if p[0] == 'earth_gravity_constant': gm = p[1]
        elif p[0] == 'radius': radius = p[1]
        elif p[0] == 'gfc' and int(p[1]) <= nmax:
            n, m = int(p[1]), int(p[2])
            C[(n, m)] = p[3].replace('d', 'e').replace('D', 'e'); S[(n, m)] = p[4].replace('d', 'e').replace('D', 'e')
    return gm, radius, C, S
def norm_factor(n, m):   # unnormalized = normalized * factor
    return math.sqrt((2 - (m == 0)) * (2 * n + 1) * math.factorial(n - m) / math.factorial(n + m))

def accel_cunningham(r, gm, radius, Cn, Sn, nmax, mmax=None):
    """A: doubles. Cn, Sn fully normalized, dict (n, m) -> float."""
    mmax = nmax if mmax is None else mmax
    x, y, z = r; r2 = x * x + y * y + z * z
    rho = radius * radius / r2
    x0, y0, z0 = radius * x / r2, radius * y / r2, radius * z / r2
    V = [[0.0] * (nmax + 3) for _ in range(nmax + 3)]; W = [[0.0] * (nmax + 3) for _ in range(nmax + 3)]
    V[0][0] = radius / math.sqrt(r2)
    V[1][0] = z0 * V[0][0]
    for n in range(2, nmax + 2):
        V[n][0] = ((2 * n - 1) * z0 * V[n - 1][0] - (n - 1) * rho * V[n - 2][0]) / n
    for m in range(1, nmax + 2):
        V[m][m] = (2 * m - 1) * (x0 * V[m - 1][m - 1] - y0 * W[m - 1][m - 1])
        W[m][m] = (2 * m - 1) * (x0 * W[m - 1][m - 1] + y0 * V[m - 1][m - 1])
        if m <= nmax:
            V[m + 1][m] = (2 * m + 1) * z0 * V[m][m]; W[m + 1][m] = (2 * m + 1) * z0 * W[m][m]
        for n in range(m + 2, nmax + 2):
            V[n][m] = ((2 * n - 1) * z0 * V[n - 1][m] - (n + m - 1) * rho * V[n - 2][m]) / (n - m)
            W[n][m] = ((2 * n - 1) * z0 * W[n - 1][m] - (n + m - 1) * rho * W[n - 2][m]) / (n - m)
    ax = ay = az = 0.0
    for m in range(0, min(mmax, nmax) + 1):
        for n in range(m, nmax + 1):
            c = Cn.get((n, m), 0.0) * norm_factor(n, m) if (n, m) != (0, 0) else 1.0
            s = Sn.get((n, m), 0.0) * norm_factor(n, m) if m else 0.0
            if n == 1: continue
            if m == 0:
                ax -= c * V[n + 1][1]; ay -= c * W[n + 1][1]
            else:
                fac = 0.5 * (n - m + 1) * (n - m + 2)
                ax += 0.5 * (-c * V[n + 1][m + 1] - s * W[n + 1][m + 1]) + fac * (c * V[n + 1][m - 1] + s * W[n + 1][m - 1])
                ay += 0.5 * (-c * W[n + 1][m + 1] + s * V[n + 1][m + 1]) + fac * (-c * W[n + 1][m - 1] + s * V[n + 1][m - 1])
            az += (n - m + 1) * (-c * V[n + 1][m] - s * W[n + 1][m])
    k = gm / (radius * radius)
    return np.array([k * ax, k * ay, k * az])

def potential_cunningham(r, gm, radius, Cn, Sn, nmax):
    x, y, z = r; r2 = x * x + y * y + z * z; rho = radius * radius / r2
    x0, y0, z0 = radius * x / r2, radius * y / r2, radius * z / r2
    V = [[0.0] * (nmax + 2) for _ in range(nmax + 2)]; W = [[0.0] * (nmax + 2) for _ in range(nmax + 2)]
    V[0][0] = radius / math.sqrt(r2); V[1][0] = z0 * V[0][0]
    for n in range(2, nmax + 1): V[n][0] = ((2 * n - 1) * z0 * V[n - 1][0] - (n - 1) * rho * V[n - 2][0]) / n
    for m in range(1, nmax + 1):
        V[m][m] = (2 * m - 1) * (x0 * V[m - 1][m - 1] - y0 * W[m - 1][m - 1]); W[m][m] = (2 * m - 1) * (x0 * W[m - 1][m - 1] + y0 * V[m - 1][m - 1])
        if m < nmax: V[m + 1][m] = (2 * m + 1) * z0 * V[m][m]; W[m + 1][m] = (2 * m + 1) * z0 * W[m][m]
        for n in range(m + 2, nmax + 1):
            V[n][m] = ((2 * n - 1) * z0 * V[n - 1][m] - (n + m - 1) * rho * V[n - 2][m]) / (n - m)
            W[n][m] = ((2 * n - 1) * z0 * W[n - 1][m] - (n + m - 1) * rho * W[n - 2][m]) / (n - m)
    u = V[0][0]
    for n in range(2, nmax + 1):
        for m in range(n + 1):
            f = norm_factor(n, m); u += Cn.get((n, m), 0.0) * f * V[n][m] + (Sn.get((n, m), 0.0) * f * W[n][m] if m else 0.0)
    return gm / radius * u

def accel_reference(r, nmax, gm_s, R_s, Cs, Ss):
    """B: mpmath; normalized Legendre functions of sin(lat) by the standard forward recursions, spherical gradient."""
    x, y, z = [mp.mpf(repr(float(c))) for c in r]
    gm, radius = mp.mpf(gm_s.replace('E', 'e')), mp.mpf(R_s.replace('E', 'e'))
    rr = mp.sqrt(x * x + y * y + z * z); p = mp.sqrt(x * x + y * y)
    sphi, cphi = z / rr, p / rr; lam = mp.atan2(y, x)
    P = [[mp.mpf(0)] * (nmax + 2) for _ in range(nmax + 2)]
    P[0][0] = mp.mpf(1); P[1][1] = mp.sqrt(3) * cphi
    for n in range(2, nmax + 1): P[n][n] = mp.sqrt(mp.mpf(2 * n + 1) / (2 * n)) * cphi * P[n - 1][n - 1]
    for m in range(0, nmax + 1):
        for n in range(m + 1, nmax + 1):
            a = mp.sqrt(mp.mpf((2 * n - 1) * (2 * n + 1)) / ((n - m) * (n + m)))
            b = mp.sqrt(mp.mpf((2 * n + 1) * (n + m - 1) * (n - m - 1)) / ((n - m) * (n + m) * (2 * n - 3))) if n - m >= 2 else mp.mpf(0)
            P[n][m] = a * sphi * P[n - 1][m] - b * (P[n - 2][m] if n - m >= 2 else 0)
    dUdr = -gm / rr**2; dUdphi = mp.mpf(0); dUdlam = mp.mpf(0)
    for n in range(2, nmax + 1):
        q = (radius / rr)**n
        for m in range(n + 1):
            c, s = mp.mpf(Cs[(n, m)]), mp.mpf(Ss[(n, m)])
            trig = c * mp.cos(m * lam) + s * mp.sin(m * lam)
            # dP/dphi for fully normalized functions
            k = mp.sqrt(mp.mpf((n - m) * (n + m + 1)) * (mp.mpf(1) / 2 if m == 0 else 1)) if m < n else mp.mpf(0)
            dP = (k * P[n][m + 1] if m < n else 0) - m * (sphi / cphi) * P[n][m]
            dUdr += -gm / rr**2 * (n + 1) * q * P[n][m] * trig
            dUdphi += gm / rr * q * dP * trig
            dUdlam += gm / rr * q * m * P[n][m] * (-c * mp.sin(m * lam) + s * mp.cos(m * lam))
    er = (x / rr, y / rr, z / rr); ephi = (-sphi * x / p, -sphi * y / p, cphi); elam = (-y / p, x / p, mp.mpf(0))
    return [dUdr * er[i] + dUdphi / rr * ephi[i] + dUdlam / (rr * cphi) * elam[i] for i in range(3)]

def potential_reference(r, nmax, gm_s, R_s, Cs, Ss):
    """B for the potential: the same normalized functions, summed at 40 digits."""
    x, y, z = [mp.mpf(repr(float(c))) for c in r]
    gm, radius = mp.mpf(gm_s.replace('E', 'e')), mp.mpf(R_s.replace('E', 'e'))
    rr = mp.sqrt(x * x + y * y + z * z); p = mp.sqrt(x * x + y * y); sphi, cphi = z / rr, p / rr; lam = mp.atan2(y, x)
    P = [[mp.mpf(0)] * (nmax + 2) for _ in range(nmax + 2)]
    P[0][0] = mp.mpf(1); P[1][1] = mp.sqrt(3) * cphi
    for n in range(2, nmax + 1): P[n][n] = mp.sqrt(mp.mpf(2 * n + 1) / (2 * n)) * cphi * P[n - 1][n - 1]
    for m in range(0, nmax + 1):
        for n in range(m + 1, nmax + 1):
            a = mp.sqrt(mp.mpf((2 * n - 1) * (2 * n + 1)) / ((n - m) * (n + m)))
            b = mp.sqrt(mp.mpf((2 * n + 1) * (n + m - 1) * (n - m - 1)) / ((n - m) * (n + m) * (2 * n - 3))) if n - m >= 2 else mp.mpf(0)
            P[n][m] = a * sphi * P[n - 1][m] - b * (P[n - 2][m] if n - m >= 2 else 0)
    u = mp.mpf(1)
    for n in range(2, nmax + 1):
        for m in range(n + 1):
            u += (radius / rr) ** n * P[n][m] * (mp.mpf(Cs[(n, m)]) * mp.cos(m * lam) + mp.mpf(Ss[(n, m)]) * mp.sin(m * lam))
    return gm / rr * u

def halton(i, b):
    f, r = 1.0, 0.0
    while i > 0: f /= b; r += f * (i % b); i //= b
    return r

def main():
    gm_s, R_s, Cs, Ss = read_gfc(sys.argv[1], N)
    assert all((n, m) in Cs for n in range(2, N + 1) for m in range(n + 1))
    GM, R = float(gm_s), float(R_s)
    Cn = {k: float(v) for k, v in Cs.items()}; Sn = {k: float(v) for k, v in Ss.items()}
    pts = []
    for i in range(1, 13):
        lat = math.asin(2 * halton(i, 2) - 1); lon = math.pi * (2 * halton(i, 3) - 1); h = 300e3 + (36000e3 - 300e3) * halton(i, 5) ** 2
        pts.append((lat, lon, h))
    pts += [(math.radians(89.99), 0.3, 300e3), (math.radians(-89.99), 2.0, 800e3), (0.0, math.radians(-14.7), 35786e3), (math.radians(51.6), math.radians(100.0), 420e3)]
    assert len(pts) == 16
    worst = 0.0
    for lat, lon, h in pts:
        rad = R + h; r = (rad * math.cos(lat) * math.cos(lon), rad * math.cos(lat) * math.sin(lon), rad * math.sin(lat))
        a = accel_cunningham(r, GM, R, Cn, Sn, N); b = accel_reference(r, N, gm_s, R_s, Cs, Ss)
        err = mp.sqrt(sum((mp.mpf(repr(float(a[i]))) - b[i])**2 for i in range(3))) / mp.sqrt(sum(c * c for c in b))
        worst = max(worst, float(err))
    print(f'1. acceleration, doubles (Cunningham) against 40 digits (normalized Legendre, spherical gradient), 16 points 300-36,000 km: worst relative {worst:.2e} (bound 1e-10)')

    wu = max(abs(mp.mpf(repr(potential_cunningham(q, GM, R, Cn, Sn, N))) / potential_reference(q, N, gm_s, R_s, Cs, Ss) - 1) for q in
             [((R + h) * math.cos(la) * math.cos(lo), (R + h) * math.cos(la) * math.sin(lo), (R + h) * math.sin(la)) for la, lo, h in pts])
    print(f'   potential, the same two routes, the same points: worst relative {float(wu):.2e}')
    # the spin axis: A at the exact pole against B a hair off it (B's spherical gradient cannot stand on the axis)
    for sign in (1, -1):
        rad = R + 500e3; eps = 1e-12
        a = accel_cunningham((0.0, 0.0, sign * rad), GM, R, Cn, Sn, N)
        b = accel_reference((rad * math.sin(eps) * math.cos(0.7), rad * math.sin(eps) * math.sin(0.7), sign * rad * math.cos(eps)), N, gm_s, R_s, Cs, Ss)
        err = mp.sqrt(sum((mp.mpf(repr(float(a[i]))) - b[i])**2 for i in range(3))) / mp.sqrt(sum(c * c for c in b))
        print(f'   on the spin axis at 500 km ({"north" if sign > 0 else "south"}), against 40 digits 1e-12 rad off it: relative {float(err):.2e}; the horizontal part there is {math.hypot(a[0], a[1]):.2e} m/s^2')
    # each degree and a cut in order, at four low points
    low = [(0.3, 0.5, 300e3), (-1.1, 2.5, 300e3), (0.9, -2.0, 350e3), (-0.2, -0.6, 400e3)]
    wt = 0.0
    for la, lo, h in low:
        r = ((R + h) * math.cos(la) * math.cos(lo), (R + h) * math.cos(la) * math.sin(lo), (R + h) * math.sin(la))
        for n in range(2, N + 1):
            a = accel_cunningham(r, GM, R, Cn, Sn, n); b = accel_reference(r, n, gm_s, R_s, Cs, Ss)
            wt = max(wt, float(mp.sqrt(sum((mp.mpf(repr(float(a[i]))) - b[i])**2 for i in range(3))) / mp.sqrt(sum(c * c for c in b))))
    smallest = min(np.linalg.norm(accel_cunningham(r, GM, R, Cn, Sn, n) - accel_cunningham(r, GM, R, Cn, Sn, n - 1)) / np.linalg.norm(accel_cunningham(r, GM, R, Cn, Sn, n)) for n in range(2, N + 1))
    print(f'   a field cut at each degree from 2 to 20, four points at 300-400 km, the two routes: worst relative {wt:.2e}; the smallest step from one degree to the next at the last point is {smallest:.1e}')
    # one wrong coefficient: what can the bound see?
    r = ((R + 300e3) * math.cos(0.3) * math.cos(0.5), (R + 300e3) * math.cos(0.3) * math.sin(0.5), (R + 300e3) * math.sin(0.3))
    base = accel_cunningham(r, GM, R, Cn, Sn, N); seen = []
    for (n, m) in ((20, 7), (20, 20), (15, 3), (9, 9)):
        C2 = dict(Cn); C2[(n, m)] = Cn[(n, m)] * 1.01
        seen.append(f'({n},{m}) {np.linalg.norm(accel_cunningham(r, GM, R, C2, Sn, N) - base) / np.linalg.norm(base):.1e}')
    print('   one coefficient 1 % wrong moves the acceleration at 300 km by, relative: ' + ', '.join(seen))
    # how much of the field do the higher terms carry at the lowest point: is 1e-10 sharp enough to see them?
    r = (R + 300e3, 0.0, 0.0)
    full = accel_cunningham(r, GM, R, Cn, Sn, N)
    for n in (2, 4, 10, 19):
        part = accel_cunningham(r, GM, R, Cn, Sn, n)
        print(f'   at 300 km, a field cut at degree {n} differs from degree 20 by {np.linalg.norm(full - part) / np.linalg.norm(full):.1e} relative')
    r = (R + 35786e3, 0.0, 0.0); full = accel_cunningham(r, GM, R, Cn, Sn, N)
    print(f'   at 35,786 km, degree 19 differs from degree 20 by {np.linalg.norm(full - accel_cunningham(r, GM, R, Cn, Sn, 19)) / np.linalg.norm(full):.1e}; degree 4 by {np.linalg.norm(full - accel_cunningham(r, GM, R, Cn, Sn, 4)) / np.linalg.norm(full):.1e}')

    # 2. J2 only against the app's closed form (src/physics/gravity.ts gravityJ2, transcribed operation for operation)
    MU_APP, R_APP, J2_APP = 3.986004418e14, 6378137.0, 1.08262668e-3
    def gravity_j2(r):
        x, y, z = r; r2 = x * x + y * y + z * z; rm = math.sqrt(r2)
        f = -MU_APP / (rm * r2); k = (1.5 * J2_APP * MU_APP * R_APP * R_APP) / (rm * r2 * r2); five = (5 * z * z) / r2
        return np.array([x * f + k * x * (five - 1), y * f + k * y * (five - 1), z * f + k * z * (five - 3)])
    c20 = {(2, 0): -J2_APP / math.sqrt(5)}
    w = 0.0
    rng = np.random.RandomState(13)
    for _ in range(2000):
        u = rng.normal(size=3); u /= np.linalg.norm(u); r = (R_APP + rng.uniform(150e3, 4e7)) * u
        a = accel_cunningham(r, MU_APP, R_APP, c20, {}, 2, 0); b = gravity_j2(r)
        w = max(w, np.linalg.norm(a - b) / np.linalg.norm(b))
    print(f"2. degree 2, order 0 with the app's GM, radius and J2 against gravityJ2, 2,000 points: worst relative {w:.2e} (bound 1e-13)")

    # 2b. J2, J3 and J4 against the propagator's zonal terms (src/physics/propagator/forces.ts gravityAcceleration, transcribed)
    J3_APP, J4_APP = -2.53265649e-6, -1.61962159e-6
    def gravity_zonal(r):
        x, y, z = r; r2 = x * x + y * y + z * z; rr = math.sqrt(r2); mu, Rr = MU_APP, R_APP
        k = -mu / (r2 * rr); ax, ay, az = k * x, k * y, k * z; zr2 = (z * z) / r2
        c = (-1.5 * J2_APP * mu * Rr * Rr) / (r2 * r2 * rr)
        ax += c * x * (1 - 5 * zr2); ay += c * y * (1 - 5 * zr2); az += c * z * (3 - 5 * zr2)
        r7 = r2 * r2 * r2 * rr; c3 = (-2.5 * J3_APP * mu * Rr * Rr * Rr) / r7; f3 = 3 * z - (7 * z * z * z) / r2
        ax += c3 * x * f3; ay += c3 * y * f3; az += c3 * (6 * z * z - (7 * z * z * z * z) / r2 - 0.6 * r2)
        c4 = (1.875 * J4_APP * mu * Rr ** 4) / r7; f4 = 1 - 14 * zr2 + 21 * zr2 * zr2
        ax += c4 * x * f4; ay += c4 * y * f4; az += c4 * z * (5 - (70 / 3) * zr2 + 21 * zr2 * zr2)
        return np.array([ax, ay, az])
    cz = {(2, 0): -J2_APP / math.sqrt(5), (3, 0): -J3_APP / math.sqrt(7), (4, 0): -J4_APP / 3.0}
    w = 0.0; rng = np.random.RandomState(14)
    for _ in range(2000):
        u = rng.normal(size=3); u /= np.linalg.norm(u); r = (R_APP + rng.uniform(150e3, 4e7)) * u
        a = accel_cunningham(r, MU_APP, R_APP, cz, {}, 4, 0); b = gravity_zonal(r)
        w = max(w, np.linalg.norm(a - b) / np.linalg.norm(b))
    print(f"2b. degrees 2 to 4, order 0 with the app's J2, J3, J4 against the propagator's zonal terms, 2,000 points: worst relative {w:.2e}")

    # 3. the potential: gradient and Laplace's equation by central differences (fourth order)
    def grad_num(f, r, h):
        g = []
        for i in range(3):
            e = np.zeros(3); e[i] = h
            g.append((-f(r + 2 * e) + 8 * f(r + e) - 8 * f(r - e) + f(r - 2 * e)) / (12 * h))
        return np.array(g)
    for h in (100.0, 1000.0, 10000.0):
        wg = wd = 0.0
        for lat, lon, alt in pts:
            rad = R + alt; r = np.array([rad * math.cos(lat) * math.cos(lon), rad * math.cos(lat) * math.sin(lon), rad * math.sin(lat)])
            a = accel_cunningham(r, GM, R, Cn, Sn, N)
            g = grad_num(lambda q: potential_cunningham(q, GM, R, Cn, Sn, N), r, h)
            wg = max(wg, np.linalg.norm(g - a) / np.linalg.norm(a))
            div = sum(grad_num(lambda q, i=i: accel_cunningham(q, GM, R, Cn, Sn, N)[i], r, h)[i] for i in range(3))
            wd = max(wd, abs(div) / (GM / rad**3))
        print(f'3. step {h:7.0f} m: gradient of the potential against the acceleration, worst relative {wg:.1e}; divergence of the acceleration over GM/r^3, worst {wd:.1e}')
    nums = sum(1 for n in range(2, N + 1) for m in range(n + 1)) + sum(1 for n in range(2, N + 1) for m in range(1, n + 1))
    print(f'4. size: {nums} numbers to degree and order 20; about {nums * 24} bytes as text')

if __name__ == '__main__':
    main()
