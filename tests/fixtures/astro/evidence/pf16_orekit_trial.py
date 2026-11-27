"""Pre-check for PF-16, made before the package started (S20 wave 2, Task 4): does Orekit run here, and how
far is it from the reference tools the base's modules are already held to?

Reference tools only (Orekit through orekit_jpype, pyerfa, Skyfield with DE421, and the two evaluations of
pf13_gravity_precheck.py); no app code.
  1. EGM2008 to degree and order 20, written as an ICGEM file from the head of the published one and loaded
     explicitly: the provider's GM and radius, and its acceleration (Holmes-Featherstone) against the
     Cunningham recursion in doubles.
  2. Orekit's GCRF to ITRF (IERS 2010 conventions) against ERFA's IAU 2000B chain fed Orekit's own UT1 - UTC
     and pole: the rotation between the two.
  3. Orekit's Sun and Moon (the DE-440 file of orekit-data) against DE421, and against the ERFA series the
     base ports.
  4. Two-body: Orekit's numerical propagation against its own Kepler orbit, and what each term adds in a day.
  5. The six orbits of the work plan: the reference's own noise and the size of each force term.

Run:  python pf16_orekit_trial.py <orekit-data-main.zip> <the first 60 kB of EGM2008.gfc> <a scratch folder>
in an environment with orekit_jpype 13.1.9.0, jpype1, pyerfa, numpy, mpmath, skyfield, and a Java 17+ runtime
(Java 21 was used); de421.bsp is read from, or downloaded to, the current folder. The data set is the archive
of https://gitlab.orekit.org/orekit/orekit-data at commit 2d6edc9118983d95c51303df05db16ada90b7ee2.

Found on 2026-11-27: the provider reports GM 398600441500000.0, radius 6378136.3, TIDE_FREE; its acceleration
is within 2.0e-15 relative of the Cunningham recursion; Orekit's GCRF to ITRF is within 0.52 mas of ERFA's
IAU 2000B chain; its Sun and Moon within 216 m and 3.2 m of DE421, ERFA's series within 3,323 km and 5.1 km
of Orekit's; level A is within 7.5e-6 m of a Kepler orbit on all six orbits; the station orbit's node under
J2 alone moves -5.0140 deg in a day against -5.0023 by the secular rate.
"""
import math, os, sys, time, warnings
import numpy as np, erfa
import jpype, orekit_jpype
import pf13_gravity_precheck as g13
warnings.simplefilter('ignore')
orekit_jpype.initVM()
from java.io import File
from org.orekit.data import DataContext, ZipJarCrawler, DirectoryCrawler
from org.orekit.frames import FramesFactory
from org.orekit.time import AbsoluteDate, TimeScalesFactory
from org.orekit.orbits import KeplerianOrbit, PositionAngleType, OrbitType
from org.orekit.propagation import SpacecraftState
from org.orekit.propagation.numerical import NumericalPropagator
from org.orekit.forces.gravity import HolmesFeatherstoneAttractionModel, ThirdBodyAttraction
from org.orekit.forces.gravity.potential import GravityFieldFactory, ICGEMFormatReader
from org.orekit.bodies import CelestialBodyFactory
from org.orekit.utils import IERSConventions
from org.hipparchus.geometry.euclidean.threed import Vector3D
from org.hipparchus.ode.nonstiff import DormandPrince853Integrator

data_zip, head, scratch = sys.argv[1], sys.argv[2], sys.argv[3]
N = 20
# the degree-20 file: the head's own lines, with max_degree rewritten
out = []
for line in open(head):
    p = line.split()
    if p and p[0] == 'max_degree': line = 'max_degree                  20\n'
    if p and p[0] == 'gfc' and int(p[1]) > N: continue
    out.append(line)
open(os.path.join(scratch, 'egm2008-20.gfc'), 'w').writelines(out)
mgr = DataContext.getDefault().getDataProvidersManager()
mgr.addProvider(ZipJarCrawler(File(data_zip))); mgr.addProvider(DirectoryCrawler(File(scratch)))
GravityFieldFactory.clearPotentialCoefficientsReaders()
GravityFieldFactory.addPotentialCoefficientsReader(ICGEMFormatReader('egm2008-20.gfc', False))
prov = GravityFieldFactory.getNormalizedProvider(N, N)
print(f'1. provider: mu {prov.getMu()!r}, ae {prov.getAe()!r}, tide system {prov.getTideSystem().toString()}, degree {prov.getMaxDegree()}, order {prov.getMaxOrder()}')
utc = TimeScalesFactory.getUTC(); tt = TimeScalesFactory.getTT()
gcrf = FramesFactory.getGCRF(); itrf = FramesFactory.getITRF(IERSConventions.IERS_2010, True)
t0 = AbsoluteDate(2024, 3, 20, 12, 0, 0.0, utc)
hf = HolmesFeatherstoneAttractionModel(itrf, prov)
gm_s, R_s, Cs, Ss = g13.read_gfc(head, N); GM, R = float(gm_s), float(R_s)
Cn = {k: float(v) for k, v in Cs.items()}; Sn = {k: float(v) for k, v in Ss.items()}
w = 0.0
for i in range(1, 201):
    lat = math.asin(2 * g13.halton(i, 2) - 1); lon = math.pi * (2 * g13.halton(i, 3) - 1); rad = R + 200e3 + (36000e3 - 200e3) * g13.halton(i, 5) ** 2
    r = np.array([rad * math.cos(lat) * math.cos(lon), rad * math.cos(lat) * math.sin(lon), rad * math.sin(lat)])
    grad = np.array(hf.gradient(t0, Vector3D(float(r[0]), float(r[1]), float(r[2])), GM))      # the non-central part, body frame
    a_orekit = -GM * r / np.linalg.norm(r) ** 3 + grad
    a = g13.accel_cunningham(r, GM, R, Cn, Sn, N)
    w = max(w, np.linalg.norm(a - a_orekit) / np.linalg.norm(a))
print(f'   acceleration, Orekit (Holmes-Featherstone) against Cunningham in doubles, 200 points 200-36,000 km: worst relative {w:.2e}')

# 2. frames
eop = FramesFactory.getEOPHistory(IERSConventions.IERS_2010, True)
wr = wa = 0.0; rows = []
for k in range(0, 73):
    d = t0.shiftedBy(3600.0 * k)
    T = gcrf.getTransformTo(itrf, d).getRotation().getMatrix()          # applyTo(v): components in ITRF
    M = np.array([[T[i][j] for j in range(3)] for i in range(3)])
    dut1 = eop.getUT1MinusUTC(d); pc = eop.getPoleCorrection(d); xp, yp = pc.getXp(), pc.getYp()
    c = d.getComponents(utc); dd, tc = c.getDate(), c.getTime()
    u1, u2 = erfa.dtf2d('UTC', dd.getYear(), dd.getMonth(), dd.getDay(), tc.getHour(), tc.getMinute(), tc.getSecond())
    tai1, tai2 = erfa.utctai(u1, u2); tt1, tt2 = erfa.taitt(tai1, tai2); ut1, ut2 = u1, u2 + dut1 / 86400
    E = erfa.c2teqx(erfa.pnm00b(tt1, tt2), erfa.gst00b(ut1, ut2), erfa.pom00(xp, yp, 0.0))
    D = M @ E.T      # the small rotation between the two: half its antisymmetric part (an arccosine of the trace cannot resolve below 1.5e-8 rad)
    ang = float(np.linalg.norm([D[2][1] - D[1][2], D[0][2] - D[2][0], D[1][0] - D[0][1]])) / 2
    F = M @ erfa.c2t06a(tt1, tt2, ut1, ut2, xp, yp).T; wa = max(wa, float(np.linalg.norm([F[2][1] - F[1][2], F[0][2] - F[2][0], F[1][0] - F[0][1]])) / 2)
    wr = max(wr, ang); rows.append((dut1, xp, yp))
print(f'2. Orekit GCRF to ITRF against ERFA IAU 2000B with Orekit\'s UT1 - UTC ({rows[0][0]:+.4f} s) and pole ({math.degrees(rows[0][1])*3600:.3f}", {math.degrees(rows[0][2])*3600:.3f}"), 73 hourly instants from 2024-03-20: worst rotation {wr:.2e} rad = {math.degrees(wr)*3.6e6:.2f} mas = {wr*7e6*100:.1f} cm at 7,000 km; against the full IAU 2006/2000A chain {math.degrees(wa)*3.6e6:.2f} mas')

# 3. Sun and Moon
from skyfield.api import load
eph = load('de421.bsp'); ts = load.timescale(builtin=True)
sun, moon = CelestialBodyFactory.getSun(), CelestialBodyFactory.getMoon()
AU = 149597870700.0; EMRAT = 81.30056; rb, _, _ = erfa.bp00(2451545.0, 0.0)
ws = wm = es = em = 0.0
for k in range(0, 73):
    d = t0.shiftedBy(3600.0 * k)
    ps = sun.getPVCoordinates(d, gcrf).getPosition(); pm = moon.getPVCoordinates(d, gcrf).getPosition()
    ps = np.array([ps.getX(), ps.getY(), ps.getZ()]); pm = np.array([pm.getX(), pm.getY(), pm.getZ()])
    c = d.getComponents(tt); dd, tc = c.getDate(), c.getTime()
    j1, j2 = erfa.dtf2d('TT', dd.getYear(), dd.getMonth(), dd.getDay(), tc.getHour(), tc.getMinute(), tc.getSecond())
    t = ts.tt_jd(j1 + j2); e = eph['earth'].at(t).position.m
    ws = max(ws, np.linalg.norm(ps - (eph['sun'].at(t).position.m - e))); wm = max(wm, np.linalg.norm(pm - (eph['moon'].at(t).position.m - e)))
    mo = np.array(erfa.moon98(j1, j2)['p']) * AU; su = -(rb.T @ np.array(erfa.plan94(j1, j2, 3)['p']) * AU - mo / (1 + EMRAT))
    es = max(es, np.linalg.norm(su - ps)); em = max(em, np.linalg.norm(mo - pm))
print(f'3. Orekit (DE-440) against DE421, 73 instants: Sun {ws:.0f} m, Moon {wm:.1f} m; the ERFA series against Orekit: Sun {es/1000:.0f} km, Moon {em/1000:.1f} km')

# 4. propagation
orb = KeplerianOrbit(6778137.0, 0.001, math.radians(51.6), 0.3, 1.0, 0.0, PositionAngleType.TRUE, gcrf, t0, prov.getMu())
def run(forces, ptol, days=1.0):
    tol = NumericalPropagator.tolerances(ptol, orb, OrbitType.CARTESIAN)
    integ = DormandPrince853Integrator(1e-3, 300.0, jpype.JArray(jpype.JDouble)(tol[0]), jpype.JArray(jpype.JDouble)(tol[1]))
    p = NumericalPropagator(integ); p.setOrbitType(OrbitType.CARTESIAN); p.setMu(prov.getMu()); p.setInitialState(SpacecraftState(orb))
    for f in forces: p.addForceModel(f)
    pv = p.propagate(t0.shiftedBy(days * 86400.0)).getPVCoordinates(gcrf).getPosition()
    return np.array([pv.getX(), pv.getY(), pv.getZ()])
tic = time.time()
ana = orb.shiftedBy(86400.0).getPVCoordinates(gcrf).getPosition(); ana = np.array([ana.getX(), ana.getY(), ana.getZ()])
tb = [ThirdBodyAttraction(sun), ThirdBodyAttraction(moon)]
for ptol in (1e-3, 1e-6, 1e-9):
    kep = run([], ptol); full = run([hf], ptol); all_ = run([hf] + tb, ptol)
    print(f'4. position tolerance {ptol:g} m: two-body numerical against Kepler after a day {np.linalg.norm(kep - ana):.2e} m; the field moves the state {np.linalg.norm(full - kep)/1000:.3f} km; Sun and Moon a further {np.linalg.norm(all_ - full):.3f} m')
    if ptol == 1e-6: f6, a6 = full, all_
    if ptol == 1e-9: print(f'   the same trajectory at 1e-6 m and at 1e-9 m: field {np.linalg.norm(full - f6):.2e} m, field with Sun and Moon {np.linalg.norm(all_ - a6):.2e} m')
print(f'   nine one-day propagations: {time.time() - tic:.1f} s')

# 5. the six orbits of the work plan: the reference's own noise, and the size of each term
from org.orekit.forces.radiation import SolarRadiationPressure, IsotropicRadiationSingleCoefficient
from org.orekit.forces.drag import DragForce, IsotropicDrag
from org.orekit.models.earth.atmosphere import SimpleExponentialAtmosphere
from org.orekit.bodies import OneAxisEllipsoid
earth = OneAxisEllipsoid(6378137.0, 1 / 298.257223563, itrf)
prov2 = GravityFieldFactory.getNormalizedProvider(2, 0)
srp = SolarRadiationPressure(sun, earth, IsotropicRadiationSingleCoefficient(10.0, 1.5))
drag = DragForce(SimpleExponentialAtmosphere(earth, 3.0e-12, 400e3, 60e3), IsotropicDrag(10.0, 2.2))
ORBITS = [  # name, a (m), e, i, raan, argp, true anomaly (deg), days
    ('station', 6778137.0, 0.001, 51.6, 20.0, 60.0, 0.0, 1), ('sun-synchronous', 7078137.0, 0.001, 98.19, 80.0, 90.0, 0.0, 1),
    ('GPS', 26559800.0, 0.01, 55.0, 120.0, 30.0, 0.0, 3), ('geostationary', 42164170.0, 0.0003, 0.05, 0.0, 0.0, 200.0, 3),
    ('transfer', 24396137.0, 0.728312, 27.0, 10.0, 178.0, 0.0, 2), ('Molniya', 26554000.0, 0.72, 63.4, 250.0, 270.0, 180.0, 2)]
def fly(o, forces, ptol):
    tol = NumericalPropagator.tolerances(ptol, o, OrbitType.CARTESIAN)
    integ = DormandPrince853Integrator(1e-3, 300.0, jpype.JArray(jpype.JDouble)(tol[0]), jpype.JArray(jpype.JDouble)(tol[1]))
    p = NumericalPropagator(integ); p.setOrbitType(OrbitType.CARTESIAN); p.setMu(GM); p.setInitialState(SpacecraftState(o).withMass(1000.0))
    for f in forces: p.addForceModel(f)
    return p
def pos(p, d):
    q = p.propagate(d).getPVCoordinates(gcrf).getPosition(); return np.array([q.getX(), q.getY(), q.getZ()])
tic = time.time()
print('5. orbit: two-body numerical against Kepler | the same trajectory at 1e-6 m and 1e-9 m (all terms) | what each term adds by the end: J2, the rest of the field, Sun and Moon, radiation pressure, drag (station and transfer only)')
for name, a, e, inc, raan, argp, nu, days in ORBITS:
    o = KeplerianOrbit(a, e, math.radians(inc), math.radians(argp), math.radians(raan), math.radians(nu), PositionAngleType.TRUE, gcrf, t0, GM)
    end = t0.shiftedBy(days * 86400.0)
    ana = o.shiftedBy(days * 86400.0).getPVCoordinates(gcrf).getPosition(); ana = np.array([ana.getX(), ana.getY(), ana.getZ()])
    levels = [[], [HolmesFeatherstoneAttractionModel(itrf, prov2)], [hf], [hf] + tb, [hf] + tb + [srp]]
    if name in ('station', 'transfer'): levels.append([hf] + tb + [srp, drag])
    ends = [pos(fly(o, f, 1e-9), end) for f in levels]
    noise = np.linalg.norm(pos(fly(o, levels[-1], 1e-6), end) - ends[-1])
    steps = [np.linalg.norm(ends[k] - ends[k - 1]) for k in range(1, len(ends))]
    print(f'   {name:16s} {days} d: {np.linalg.norm(ends[0] - ana):.1e} m | {noise:.1e} m | ' + ', '.join(f'{x:.4g} m' for x in steps))
# the node of the station orbit under J2 alone against the first-order secular rate
name, a, e, inc, raan, argp, nu, days = ORBITS[0]
o = KeplerianOrbit(a, e, math.radians(inc), math.radians(argp), math.radians(raan), math.radians(nu), PositionAngleType.TRUE, gcrf, t0, GM)
s = fly(o, [HolmesFeatherstoneAttractionModel(itrf, prov2)], 1e-9).propagate(t0.shiftedBy(86400.0))
ko = KeplerianOrbit(s.getOrbit()); d_raan = ko.getRightAscensionOfAscendingNode() - math.radians(raan)
J2 = -prov2.onDate(t0).getNormalizedCnm(2, 0) * math.sqrt(5.0)
rate = -1.5 * math.sqrt(GM / a ** 3) * J2 * (R / (a * (1 - e * e))) ** 2 * math.cos(math.radians(inc))
print(f'   station orbit, J2 alone: the node moves {math.degrees(d_raan):.4f} deg in a day; the secular rate gives {math.degrees(rate * 86400):.4f} deg ({(d_raan / (rate * 86400) - 1) * 100:+.2f} %)')
print(f'   section 5: {time.time() - tic:.1f} s')
