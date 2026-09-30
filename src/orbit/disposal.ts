/**
 * The satellite builder's propellant budget (roadmap D06,
 * docs/ROADMAP-PART2-3.md; Phase 4 map §2.2 C): what a satellite's own
 * engine must give over its life — getting to the working orbit, holding it
 * against drag or the Sun's and the Moon's pull, and leaving it at the end —
 * set against what its tanks hold (`deltaVAvailable`, src/orbit/budget.ts).
 *
 * The end of life is a budget line of its own because the rules ask for it:
 * a low orbit is left to re-enter within 25 years or brought down, and a
 * geostationary satellite is raised out of the ring it worked in (IADC
 * Space Debris Mitigation Guidelines, IADC-02-01 Rev. 4, 2025; S.M. Hull,
 * "End of Mission Considerations", NTRS 20130000278, New SMAD ch. 30). A
 * student who spends every kilogram on the mission has no satellite left to
 * move out of the way, and the budget says so.
 *
 * Closed forms on a spherical Earth of radius R_EARTH, two-body speeds, and
 * impulsive burns; drag make-up reads the propagator's own drag rates, so the
 * figure the builder shows and the lifetime P07 flies come from one air.
 * DOM-free, SI units: m, s, kg, m/s, rad. tests/d06-disposal.test.ts holds
 * each function to the published figure the map names (V-V1–V-V4).
 */
import { G0, GEO_ALTITUDE, MU_EARTH, R_EARTH } from '../physics/constants';
import { dragRates } from '../physics/propagator/propagate';
import { indicesOver, type Activity } from '../physics/propagator/activity';
import type { ForceModel, Spacecraft } from '../physics/propagator/forces';
import { deltaVAvailable, type Craft } from './budget';
import type { Orbit } from './kepler';
import { hohmannDv, planeChangeDv } from './maneuvers';
import type { DisposalCore, DvAllocation, DvAllocationInput } from './satellite-cores';

/** A year of station keeping, s: the Julian year, the one the lifetime window counts in (src/ui/lifetime.ts). */
export const YEAR = 365.25 * 86400;

/**
 * The geostationary radius as IADC writes it, m: R_EARTH + 35 786 km, the
 * altitude its protected ring (±200 km) is centred on. It is 33 m inside the
 * sidereal-day circle `GEO_RADIUS` (src/orbit/applications.ts), 1e-6 of it.
 */
export const GEO_RADIUS_IADC = R_EARTH + GEO_ALTITUDE;

/** The speed on the geostationary circle, m/s (3 075). */
const V_GEO = Math.sqrt(MU_EARTH / GEO_RADIUS_IADC);

/**
 * IADC's re-orbit rule for a geostationary satellite (IADC-02-01 Rev. 4,
 * §5.3.1.1, doc p. 13): raise the perigee at least 235 km + 1000·C_R·A/m km
 * above the geostationary altitude, and leave e ≤ 0.003, so it stays out of
 * the ring for at least 100 years — 200 km, the ring's upper edge, plus
 * 35 km, the most a re-orbited satellite comes down under the luni-solar and
 * geopotential perturbations, plus a term for the sunlight pressure that
 * pumps a light, broad satellite's eccentricity (C_R "typically in the range
 * of about 1.2 to 1.5", A/m the aspect area over the dry mass).
 */
export const IADC_GEO_BASE = 235e3;
/** The sunlight term's scale, m per unit of C_R·A/m (C_R has no unit; A/m in m²/kg): 1000 km. */
export const IADC_GEO_SRP_SCALE = 1000e3;

/**
 * Hull's controlled re-entry: "a final perigee of less than 50 km, to prevent
 * atmospheric skip", in at least three burns (NTRS 20130000278, PDF p. 5).
 * Burns made at the same apogee add up to the one burn `perigeeLowerDv`
 * gives, so the closed-form checks lower the perigee to it at once (map
 * §2.2 C).
 */
export const CONTROLLED_REENTRY_PERIGEE = 50e3;

function finite(name: string, x: number, min = -Infinity): void {
  if (!(Number.isFinite(x) && x >= min)) throw new RangeError(`${name} must be a finite number of at least ${min}: ${x}`);
}

/**
 * The Δv to lower the perigee of a circular orbit at altitude `h` to altitude
 * `hp` (both m over R_EARTH) with one burn against the motion, m/s: the
 * circle's speed less the speed at the apogee of the ellipse from R+hp to
 * R+h. It is the first burn of a controlled re-entry (to 50 km) or the one
 * burn that shortens the life to 25 years (map V-V2b); it equals the O02
 * planner's `deorbit` burn on a circle (tests hold the two together).
 */
export function perigeeLowerDv(h: number, hp: number): number {
  finite('h', h, 0);
  finite('hp', hp, -R_EARTH + 1);
  if (hp > h) throw new RangeError(`the new perigee (${hp} m) is above the orbit (${h} m): that is a raise, not a lowering`);
  const r = R_EARTH + h, rp = R_EARTH + hp;
  const vCircle = Math.sqrt(MU_EARTH / r);
  const vApogee = Math.sqrt((2 * MU_EARTH * rp) / (r * (r + rp)));
  return vCircle - vApogee;
}

/**
 * IADC's re-orbit of a geostationary satellite for a radiation-pressure
 * coefficient `cr` and an area-to-mass ratio `areaToMass`, m²/kg (the dry
 * mass, as Hull writes it: the tanks are empty by then): the rise
 * ΔH = 235 km + 1000 km·C_R·A/m, m, and its Δv, m/s.
 *
 * The Δv is the two-burn Hohmann transfer to the circle ΔH higher (IADC asks
 * for e ≤ 0.003 there), by `hohmannDv`. The map writes it ≈ v·ΔH/(2a), the
 * first term of the same thing; that linear form is higher by the factor
 * 1/(1 − ¾·ΔH/a), 0.44 % at 247 km, which puts it 0.04 m/s off the 8.97 m/s
 * the map computes, so the exact transfer is the one used (V-V3).
 */
export function graveyardRaise(cr: number, areaToMass: number): { dh: number; dv: number } {
  finite('cr', cr, 0);
  finite('areaToMass', areaToMass, 0);
  const dh = IADC_GEO_BASE + IADC_GEO_SRP_SCALE * cr * areaToMass;
  return { dh, dv: hohmannDv(GEO_RADIUS_IADC, GEO_RADIUS_IADC + dh).total };
}

/**
 * North–south station keeping of a geostationary satellite, m/s a year,
 * against the inclination the Sun's and the Moon's pull builds up, `di` rad
 * a year: the plane turned back each year at the geostationary speed,
 * 2v·sin(Δi/2) (`planeChangeDv`). The drift itself is not the builder's to
 * choose, and no figure for it is kept here: tests/propagator.test.ts holds
 * the propagator's own Sun and Moon between 0.6 and 1.2° a year, and 0.85°
 * a year reproduces TU Delft Fig. 11's ten-year average of 45.5 m/s a year
 * (V-V4), so a template gives the drift with its source.
 */
export function nsskPerYear(di: number): number {
  finite('di', di, 0);
  return planeChangeDv(V_GEO, di);
}

/**
 * The Δv a year that makes up the drag of a satellite held at orbit `o`, m/s
 * a year: μ·|ȧ|/(2a²·v_p)·1 year, with ȧ the drag rate of the semi-major
 * axis the lifetime propagator itself uses (`dragRates` in
 * src/physics/propagator/propagate.ts: NRLMSISE-00 at each point of the
 * revolution, the air turning with the Earth), and v_p = √(μ(1+e)/(a(1−e)))
 * the speed at perigee. On a circle v_p = v = √(μ/a) and it is (v/2a)·|ȧ|.
 *
 * Why that is the make-up: a small push along the motion at speed v raises a
 * at da/dv = 2a²v/μ (vis-viva), so each metre per second buys back that much
 * of the decay. On a circle that is 2a/v, and the figure is the orbit's mean
 * drag deceleration times the year (tests hold it to ½ρC_D(A/m)v_r² averaged
 * round an equatorial orbit). On an eccentric orbit the air is met near the
 * perigee, so the push goes there: where a metre per second buys the most,
 * and where it gives back what the drag took, raising the apogee the drag
 * lowered. The figure is again the drag's own impulse (tests hold it to that
 * within 1 % up to e 0.73); the circle's v would give v_p/v times too much,
 * 11 % at e 0.11 and 2.5 times at e 0.73. The orbit is held, so its height
 * stays that of the epoch all year; the air reads the activity's mean over
 * the year, as the propagator's long steps do (`indicesOver`). With a
 * measured series, the year after the epoch; with an ECSS level, that level.
 *
 * The Sun's place and the season are the epoch's too: the revolution is
 * read once, at `o.jd0`, where the propagator reads it every step. Over a
 * year at 500 km the node's drift and the season move the figure some
 * ±30 % about its mean, and the epoch's lay within 6 % of that mean at
 * inclinations 0 to 97° (a review probe from 2026-01-01).
 *
 * An estimate: the density model's own error (some 20 % on the spheres of
 * R05, docs/VALIDATION.md §6) and the drag area's (a tumbling mean,
 * src/design/satellite-area.ts) both go straight into it.
 */
export function dragMakeupPerYear(o: Orbit, sc: Spacecraft, activity: Activity): number {
  finite('a', o.a, R_EARTH);
  finite('e', o.e, 0);
  if (!(o.e < 1)) throw new RangeError(`e must be below 1, a closed orbit, to be held: ${o.e}`);
  finite('perigee radius', o.a * (1 - o.e), R_EARTH);
  if (!(Number.isFinite(sc.mass) && sc.mass > 0)) throw new RangeError(`the spacecraft's mass must be above zero: ${sc.mass}`);
  finite('area', sc.area, 0);
  finite('cd', sc.cd, 0);
  const forces: ForceModel = { j2: true, j3j4: false, drag: true, sun: false, moon: false, srp: false, activity };
  const el = { a: o.a, e: o.e, i: o.i, raan: o.raan, argp: o.argp, M: o.m0 };
  const { da } = dragRates(el, o.jd0, forces, sc, indicesOver(activity, o.jd0, o.jd0 + YEAR / 86400));
  const vp = Math.sqrt((MU_EARTH * (1 + o.e)) / (o.a * (1 - o.e)));
  return (MU_EARTH / (2 * o.a * o.a * vp)) * Math.abs(da) * YEAR;
}

/**
 * The aerodynamic drag on a body, N: ½ρ·v²·C_D·A (TU Delft, *Spacecraft bus
 * design and sizing*, 2020, Eq. [101], p. 137), ρ in kg/m³, v the speed
 * through the air in m/s, A the area the flow sees in m². TU Delft's example
 * (p. 138: 500 km, 5 m², C_D 2) gives 142 µN; the builder shows it beside the
 * drag area, and the drag make-up above is this force over the mass, a year.
 */
export function dragForce(rho: number, cd: number, area: number, v: number): number {
  return 0.5 * rho * v * v * cd * area;
}

/**
 * The propellant a craft of mass `mass` (kg, tanks and all) burns to make
 * `dv` m/s with an engine of specific impulse `isp` s, kg: the rocket
 * equation, m·(1 − e^(−Δv/(Isp·g₀))). The inverse of `deltaVAvailable`: a
 * craft carrying exactly this much has exactly `dv` in its tanks (V-V1).
 */
export function propellantFor(mass: number, dv: number, isp: number): number {
  finite('mass', mass, 0);
  finite('dv', dv, 0);
  if (!(Number.isFinite(isp) && isp > 0)) throw new RangeError(`isp must be above zero: ${isp}`);
  return mass * (1 - Math.exp(-dv / (isp * G0)));
}

/**
 * A satellite's Δv budget against its tanks (map §2.2 C): the insertion, the
 * station keeping and drag make-up of each year over the years of life, and
 * the disposal, summed, and what the tanks hold (`deltaVAvailable`); the
 * margin is the difference, below zero a shortfall. `craft` null is a
 * satellite without an engine, whose tanks hold nothing. Every line is m/s,
 * none may be negative; the craft must pass `craftProblem` (budget.ts), as it
 * must for the planner, or this throws.
 */
export function dvAllocation(i: DvAllocationInput, craft: Craft | null): DvAllocation {
  finite('insertion', i.insertion, 0);
  finite('disposal', i.disposal, 0);
  finite('stationKeepingPerYear', i.stationKeepingPerYear, 0);
  finite('years', i.years, 0);
  const stationKeeping = i.stationKeepingPerYear * i.years;
  const required = i.insertion + stationKeeping + i.disposal;
  const available = craft ? deltaVAvailable(craft) : 0;
  return { ...i, stationKeeping, required, available, margin: available - required };
}

export const disposalCore = {
  perigeeLowerDv, graveyardRaise, nsskPerYear, dragMakeupPerYear, dvAllocation, dragForce, propellantFor,
} satisfies DisposalCore;
