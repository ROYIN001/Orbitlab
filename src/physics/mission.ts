/**
 * Mission planning: resolves the target orbit, computes launch azimuth,
 * parking-orbit altitude, the post-ascent burn sequence and launch windows.
 */
import type { MissionConfig, OrbitSpec, SatelliteSpec, VehicleSpec } from '../types';
import type { SiteExtra } from '../data/sites';
import { satelliteById } from '../data/satellites';
import { DEG, R_EARTH, MU_EARTH, OMEGA_EARTH, SIDEREAL_DAY } from './constants';
import { VehicleModel } from './vehicle';
import {
  circularSpeed, visViva, inertialLaunchAzimuth, rotatingLaunchAzimuth, sunSyncInclination,
  raanFromLaunch, gmst, julianDate, sunRightAscension, nodalPrecessionRate, wrap2pi, wrapPi,
} from './orbital';

export interface ResolvedTarget {
  perigee: number;
  apogee: number;
  a: number;
  e: number;
  /** rad */
  inclination: number;
  /** rad */
  argp: number;
  /** desired RAAN, rad, or null if unconstrained */
  raan: number | null;
  raanMode: OrbitSpec['raanMode'];
  /** a trajectory back to the surface, not an orbit (`OrbitSpec.suborbital`) */
  suborbital?: boolean;
}

import type { AltitudeMeasure } from './rigid/orbit-prediction';
import type { SuborbitalAim } from './guidance';

export type BurnKind = 'raiseApoapsis' | 'shapeAtApoapsis' | 'circularize';

export interface BurnPlan {
  id: string;
  kind: BurnKind;
  /** where to burn for raiseApoapsis: argument of latitude (rad), the nearest node, or as soon as possible */
  atU: number | 'node' | 'asap';
  targetApoapsis?: number;
  targetPeriapsis?: number;
  targetInclination?: number;
  dvEstimate: number;
  done: boolean;
  /** planned maximum duration of the current pass, s (set when scheduled) */
  maxDuration?: number;
  /** apoapsis adjustment burns: true when the apoapsis has to come down (retrograde) */
  lowering?: boolean;
  /** Six-DOF corrective transfer targets a forecast physical apex, not the
   * current osculating conic. Metres above R_EARTH; legacy plans omit this. */
  physicalApoapsis?: number;
  /** Six-DOF final correction: aimed by J2 shooting at the lowest, highest or
   * mean altitude of the next revolution (`shootJ2Altitude`), metres above
   * R_EARTH. A shape burn flies it at the highest point, an apoapsis burn at
   * the lowest. */
  physicalObjective?: { measure: AltitudeMeasure; altitudeM: number };
}

export interface MissionPlan {
  target: ResolvedTarget;
  /** inclination flown during ascent, rad */
  ascentInclination: number;
  descending: boolean;
  /**
   * Yaw the ascent flies after leaving on the edge of the site's corridor,
   * deg; 0 when the target plane's own heading is inside it (see
   * `launchDirection`).
   */
  doglegDeg: number;
  azimuthInertial: number;
  azimuthRotating: number;
  insertionAltitude: number;
  /** apoapsis of the insertion orbit (== insertionAltitude for a circular parking orbit) */
  insertionApoapsis: number;
  /**
   * A suborbital target's ellipse, for the ascent guidance (`SuborbitalAim`):
   * the ascent is cut off near the insertion altitude, still climbing towards
   * the apogee. Absent for every orbit (flown level to its perigee speed).
   */
  suborbitalAim?: SuborbitalAim;
  /** the final stage is a low-thrust kick stage: insert into an ellipse and circularise at apogee */
  weakFinalStage: boolean;
  burns: BurnPlan[];
  launchTime: Date;
  jd0: number;
  gmst0: number;
  raanExpected: number;
  /** plane change performed at apogee, deg */
  planeChangeDeg: number;
  /**
   * Whether the target inclination is directly reachable from the site —
   * `inclinationCorridor(site, target.inclination) === 'ok'`, i.e. inside BOTH
   * ends of the site's range-safety corridor, not merely above its declared
   * minimum.
   */
  inclinationReachable: boolean;
  dvEstimateBurns: number;
  /**
   * Ideal delta-v the stages that have to fly the ascent have, minus what the
   * MISSION's own orbit costs them, m/s — see `ascentReaches` in `planMission`
   * for the formula and `ASCENT_LOSS_ALLOWANCE` for the loss term.
   *
   * Positive means the stack has the energy for the target on paper; the
   * planner treats +150 m/s as the threshold at which it is willing to aim at
   * it. It is reported on the plan so that a capability CLAIM — "this
   * combination is beyond the vehicle, not beyond the guidance" — can be
   * checked against the same arithmetic the planner used, instead of against a
   * figure typed into a comment and never re-measured (review follow-up:
   * tests/fleet-defaults.test.ts asserts every `BEYOND_CAPABILITY` row against
   * this number).
   */
  ascentMargin: number;
  /**
   * Ideal Δv the ascent stages are short of the INSERTION orbit — the orbit
   * they are actually aimed at — and therefore what a kick stage above them has
   * to make up, m/s. Zero when they are not short.
   *
   * `ascentMargin` is the same arithmetic against the MISSION's orbit, which is
   * the question a capability claim asks; this is the question the flight asks,
   * and the two differ by the cost of the transfer the kick stage exists to fly
   * (a 200 km parking orbit's perigee speed is 126 m/s ABOVE a 420 km circular
   * orbit's, so a stack aimed at a parking orbit owes more than its
   * `ascentMargin` suggests).
   */
  ascentMakeUp: number;
  /**
   * Thrust acceleration of the kick stage at its ignition, m/s² — 0 when the
   * stack has no kick stage (`weakFinalStage` false).
   */
  kickStageAccel: number;
  /**
   * How far the stack sinks while the kick stage makes up `ascentMakeUp`, m —
   * see `kickStageSink`. 0 when there is nothing to make up or no kick stage.
   *
   * The budget it has to fit inside is `insertionAltitude −
   * ORBIT_INSERTION_FLOOR`: the ascent hands the kick stage the insertion
   * altitude, and below the floor the stack is in air and is no longer going to
   * orbit. A sink larger than that is a stack that cannot be rescued by its own
   * kick stage however much ideal Δv the kick stage has left, which is the one
   * thing the Δv budget alone cannot see.
   */
  insertionSink: number;
}

/** ISS reference plane (approximate): RAAN at epoch and J2 regression. */
const ISS_EPOCH = Date.UTC(2026, 0, 1, 0, 0, 0);
const ISS_RAAN0 = 200 * DEG;
const ISS_A = R_EARTH + 420e3;
const ISS_INC = 51.64 * DEG;

export function issRaanAt(date: Date): number {
  const rate = nodalPrecessionRate(ISS_A, 0.0005, ISS_INC); // rad/s (negative)
  const dt = (date.getTime() - ISS_EPOCH) / 1000;
  return wrap2pi(ISS_RAAN0 + rate * dt);
}

/** RAAN for a given local time of ascending node (hours) at a date. */
export function raanFromLtan(date: Date, ltanHours: number): number {
  const alphaSun = sunRightAscension(julianDate(date));
  return wrap2pi(alphaSun + (ltanHours - 12) * 15 * DEG);
}

/**
 * Lowest inclination a site can fly directly, rad — the shared definition
 * `resolveInclination` and `ascentInclinationFor` both use.
 *
 * They used to compute it separately, and differently: the `'site'` preset
 * returned `site.minInclination` while the ascent forced
 * `max(minInclination, |latitude| + 0.05°)`. Wherever a site's declared minimum
 * is below its own latitude — nine of the twelve sites, by construction — the
 * two disagreed permanently, so every `'site'` preset (which is what both the
 * `leo` and `gto` presets use, i.e. the app's most common configurations)
 * planned a spurious plane-change burn and showed a permanent "plane change
 * required" warning (audit item B18). The epsilon is part of the definition:
 * dropping it silences the burns but leaves `inclinationReachable` false,
 * because `reachable` compares with a 1e-6 tolerance.
 */
export function minInclinationFor(site: SiteExtra): number {
  return Math.max(site.minInclination * DEG, Math.abs(site.latitude) * DEG + 0.05 * DEG);
}

/**
 * Highest inclination the site's range-safety corridor reaches, rad.
 *
 * `maxInclination` is the retrograde end of the pair whose prograde end is
 * `minInclination`, measured from the site's own `azimuthMin`/`azimuthMax`
 * window with this module's `rotatingLaunchAzimuth` and re-measured by
 * `tests/data-consistency.test.ts`, so it cannot drift from the corridor it
 * describes. Reading the pair is the "bracket with this pair" half of audit
 * item B25 (see the field's doc comment in src/data/sites.ts) and is what lets
 * the planner test an inclination without re-deriving an azimuth.
 */
export function maxInclinationFor(site: SiteExtra): number {
  return site.maxInclination * DEG;
}

/**
 * Slack on either end of the corridor, rad.
 *
 * A resolved sun-synchronous inclination can land a hair outside a bound that
 * was quoted to one decimal, and the declared bounds are themselves quoted to
 * 0.1°. A quarter of a degree is below the 0.3° the mission is graded on.
 */
export const CORRIDOR_SLACK = 0.25 * DEG;

/** Why a target inclination is, or is not, flyable from a site. */
export type CorridorVerdict = 'ok' | 'belowMinimum' | 'aboveCorridor';

/**
 * Furthest a launch may head outside its site's corridor and still reach the
 * target plane, deg of azimuth: the ascent then leaves the pad on the corridor
 * edge and the closed-loop guidance yaws it back into the plane once it is out
 * of the dense air — a dogleg. Real launches fly exactly this where the direct
 * heading crosses land: a sun-synchronous Vega-C from Kourou leaves on the
 * 350° edge instead of 348.8°, an H-IIA from Tanegashima on 190° instead of
 * 192°. Five degrees admits those, and not Baikonur's 8.6° to a
 * sun-synchronous plane, which would cross Russia on a heading the site has
 * never flown, nor the 11° PSLV needs from Sriharikota to swing around Sri
 * Lanka, a dogleg deep enough that this model would not fly it honestly.
 */
export const DOGLEG_LIMIT_DEG = 5;
/** A heading this close outside the corridor counts as on its edge, deg. */
const AZIMUTH_SLACK_DEG = 0.25;
/** Orbit speed the direction is decided at, the same 300 km the site data is measured at. */
const DIRECTION_REFERENCE_SPEED = circularSpeed(R_EARTH + 300e3);

export interface LaunchDirection {
  /** fly the southbound solution (descending node over the site) */
  descending: boolean;
  /** the heading the ascent leaves the pad on, rotating frame, rad */
  azimuthRotating: number;
  /** yaw the ascent turns through after leaving on the corridor edge, deg (0 = direct) */
  doglegDeg: number;
  /** the plane can be flown from this site, directly or with a dogleg */
  allowed: boolean;
}

const wrapDeg = (deg: number): number => ((deg % 360) + 360) % 360;

/** Degrees a heading lies outside the site's corridor (0 inside), and the nearest edge. */
function corridorExcess(site: SiteExtra, azimuthRad: number): { excess: number; edgeDeg: number } {
  const deg = wrapDeg(azimuthRad / DEG);
  const lo = wrapDeg(site.azimuthMin), hi = wrapDeg(site.azimuthMax);
  const inside = lo <= hi ? deg >= lo && deg <= hi : deg >= lo || deg <= hi;
  if (inside) return { excess: 0, edgeDeg: deg };
  const gap = (a: number, b: number): number => { const d = wrapDeg(a - b); return Math.min(d, 360 - d); };
  const toLo = gap(deg, lo), toHi = gap(deg, hi);
  return toLo <= toHi ? { excess: toLo, edgeDeg: lo } : { excess: toHi, edgeDeg: hi };
}

/**
 * Which of the two launch solutions to fly, and on what heading.
 *
 * Every inclination above the site's latitude can be reached two ways — north
 * of east (ascending node over the site) or south of east (descending) — and a
 * range-safety corridor usually admits only one. The choice used to ignore the
 * corridor entirely: everything up to 75° flew the northbound solution, so an
 * ISS launch from Wallops, Wenchang, Tanegashima, Jiuquan, Sriharikota or
 * Mahia, and every prograde launch from Vandenberg and Taiyuan, left the pad
 * across the land its corridor exists to avoid while the verdict said
 * "ready". The site's corridor now decides: the solution inside it is flown;
 * when both are, the site's own preference (`descendingForPolar` above 75°,
 * northbound below) keeps what it was; when neither is but one is within
 * `DOGLEG_LIMIT_DEG`, the ascent leaves on that corridor edge and doglegs.
 */
export function launchDirection(site: SiteExtra, inc: number, vOrbit = DIRECTION_REFERENCE_SPEED): LaunchDirection {
  const lat = site.latitude * DEG;
  const prefer = inc > 75 * DEG ? site.descendingForPolar : false;
  const options = [prefer, !prefer].map(descending => {
    const azimuth = rotatingLaunchAzimuth(lat, inc, vOrbit, descending);
    return { descending, azimuth, ...(azimuth === null ? { excess: Infinity, edgeDeg: 0 } : corridorExcess(site, azimuth)) };
  });
  const direct = options.find(o => o.azimuth !== null && o.excess <= AZIMUTH_SLACK_DEG);
  if (direct) return { descending: direct.descending, azimuthRotating: direct.azimuth!, doglegDeg: 0, allowed: true };
  const nearest = options[1].excess < options[0].excess ? options[1] : options[0];
  if (nearest.azimuth !== null && nearest.excess <= DOGLEG_LIMIT_DEG) {
    return { descending: nearest.descending, azimuthRotating: nearest.edgeDeg * DEG, doglegDeg: nearest.excess, allowed: true };
  }
  const fallback = options[0];
  return { descending: fallback.descending, azimuthRotating: fallback.azimuth ?? Math.PI / 2, doglegDeg: 0, allowed: false };
}

/**
 * Whether a target inclination lies inside the site's range-safety corridor,
 * and if not, which end it falls outside.
 *
 * The single definition of that question for the whole app: `planMission`
 * reports it as `MissionPlan.inclinationReachable` and the setup panel's
 * pre-flight verdict reads the same function, so the verdict and the planner
 * cannot disagree about what a site can fly (review 2, major #2).
 *
 * Both ends are real. A site cannot fly below its own latitude, nor below the
 * inclination its corridor allows — that is `minInclinationFor`. It equally
 * cannot fly ABOVE the corridor: Starbase's 80–110° window reaches 31.8° and
 * Xichang's 94–104° window reaches 31°, so an ISS or sun-synchronous plane
 * from either is a heading range safety does not licence. Until this wave only
 * the lower bound was tested anywhere in `src/`, and the app flew a 51.64°
 * mission out of Starbase and called it nominal.
 *
 * A retrograde target is measured against the lower bound as 180° − i, which
 * is the same geometric constraint seen from the south — a 97.8°
 * sun-synchronous orbit is an 82.2° plane, reachable from every site below
 * that latitude — while the upper bound is stated, like the data, as the
 * inclination itself.
 */
export function inclinationCorridor(site: SiteExtra, inc: number): CorridorVerdict {
  if (inc > maxInclinationFor(site) + CORRIDOR_SLACK && !launchDirection(site, inc).allowed) return 'aboveCorridor';
  const effective = inc > Math.PI / 2 ? Math.PI - inc : inc;
  if (effective < minInclinationFor(site) - CORRIDOR_SLACK) return 'belowMinimum';
  return 'ok';
}

export function resolveInclination(orbit: OrbitSpec, site: SiteExtra): number {
  const a = R_EARTH + (orbit.perigee + orbit.apogee) / 2;
  if (orbit.inclination === 'sso') return sunSyncInclination(a, Math.abs(orbit.apogee - orbit.perigee) / (2 * a));
  if (orbit.inclination === 'site') return minInclinationFor(site);
  return orbit.inclination * DEG;
}

export function resolveTarget(orbit: OrbitSpec, site: SiteExtra, launchTime: Date): ResolvedTarget {
  const perigee = Math.min(orbit.perigee, orbit.apogee);
  const apogee = Math.max(orbit.perigee, orbit.apogee);
  const rp = R_EARTH + perigee;
  const ra = R_EARTH + apogee;
  const a = (rp + ra) / 2;
  const e = (ra - rp) / (ra + rp);
  const inclination = resolveInclination(orbit, site);
  let raan: number | null = null;
  switch (orbit.raanMode) {
    case 'fixed': raan = (orbit.raan ?? 0) * DEG; break;
    case 'iss': raan = issRaanAt(launchTime); break;
    case 'ltan': raan = raanFromLtan(launchTime, orbit.ltan ?? 10.5); break;
    default: raan = null;
  }
  return { perigee, apogee, a, e, inclination, argp: orbit.argPerigee * DEG, raan, raanMode: orbit.raanMode,
    ...(orbit.suborbital ? { suborbital: true } : {}) };
}

/** Lowest inclination the site can reach directly (prograde), rad. */
export function ascentInclinationFor(target: ResolvedTarget, site: SiteExtra): { inc: number; reachable: boolean } {
  const lat = Math.abs(site.latitude) * DEG;
  const it = target.inclination;
  if (it <= Math.PI / 2) {
    const minInc = minInclinationFor(site);
    return { inc: Math.max(it, minInc), reachable: it >= minInc - 1e-6 };
  }
  const maxInc = Math.PI - lat - 0.05 * DEG;
  return { inc: Math.min(it, maxInc), reachable: it <= maxInc + 1e-6 };
}

/**
 * Altitude the ascent aims its periapsis at, m.
 *
 * Audit item B17 asked for this to insert directly at `target.perigee` "when
 * `target.perigee` ≲ 800 km AND a real delta-v / reachability check passes",
 * taking the `VehicleSpec` so the check could be made, and for the `soyuz21a`
 * exclusions to be deleted afterwards. That is **not** what is implemented and
 * B17 is only partially closed (review follow-up): the ceiling is 300 km, the
 * signature still takes only the target, and the 300–800 km band does not
 * close — measured, a single continuous burn stops arriving on a circular orbit
 * somewhere around 250 km, which is a property of the trajectory rather than of
 * the delta-v. The reachability half of B17 *is* implemented, in `planMission`,
 * where a single-shot stack is aimed at the mission's own orbit if `dvStrong`
 * says it can get there. See `DIRECT_INSERTION_CEILING` for the measurement.
 */
export function insertionAltitudeFor(target: ResolvedTarget): number {
  return target.perigee <= DIRECT_INSERTION_CEILING ? target.perigee : 200e3;
}

/**
 * Ascent losses (gravity + drag + steering) a launcher spends getting to the
 * perigee speed of its insertion orbit, m/s.
 *
 * Measured this wave across the sixteen 50 %-payload LEO rows that reach orbit
 * (tests/probe, `state.losses` at insertion): 1 684 to 2 633 m/s, median
 * 1 970 — gravity 889–1 454, steering 658–1 363, drag 9–114.
 *
 * The constant is 1 750: the low end of that spread, not the middle, and the
 * asymmetry is deliberate. The decision it feeds is "aim at the transfer
 * ellipse or at the parking orbit", and a stack that aims at the ellipse and
 * falls a little short is picked up by the re-planner and the following burns,
 * while one that aims low leaves performance on the table on every flight.
 *
 * It used to be 1 450, which was below the measured spread entirely — i.e.
 * exactly the figure the doc comment around it called the bug. That was
 * defensible only while moving it cost accepted cases; re-measured after this
 * wave's guidance fixes, 1 450, 1 750 and 1 850 all give the same 149 of 201
 * fleet rows, so the number that matches the measurement is free and is the one
 * that ships. The fleet gate quotes the same constant so the two cannot drift.
 */
export const ASCENT_LOSS_ALLOWANCE = 1750;

/**
 * Margin on top of `ASCENT_LOSS_ALLOWANCE` the planner wants before it aims an
 * ascent at an orbit, m/s.
 *
 * It is also the line the fleet gate draws between "beyond this vehicle" and
 * "the guidance lost it": a stack whose `MissionPlan.ascentMargin` is below
 * this had no business reaching the orbit in the first place, and one whose
 * margin is above it and which still ends up destroyed or short is a defect.
 * Exported so that the gate cannot quote a different number from the planner.
 */
export const ASCENT_MARGIN_REQUIRED = 150;

/**
 * Lowest perigee the sequencer will treat as an orbit, m.
 *
 * It is the one number behind three separate rules, and they are the same rule:
 *
 *  - the ascent may cut off on a transfer ellipse at this perigee, because a
 *    perigee this high coasts a revolution without decaying and the burn at
 *    apogee sets the real one (`Simulation.checkAscent`);
 *  - a stack that is still meant to reach orbit is never flown BELOW it — no
 *    burn is commanded and no coast accepted whose perigee is under it while
 *    the vehicle is sinking back into measurable air. A stack in that state has
 *    failed to insert, and the mission ends saying so
 *    (`Simulation.abandonInsertion`);
 *  - nothing under it is reported as a parking orbit. A "parking orbit
 *    94 × 94 km" is not a parking orbit, and reporting one is how an insertion
 *    that failed came to look like an insertion that worked.
 *
 * The defect that put it here: Proton-M/Briz-M with the 7.15 t crew ship cut
 * its third stage off at 199 × −1 649 km, 664 m/s short of orbital, and the
 * `nearApo` clause in `onCoreBurnout` accepted that as "at the insertion
 * apoapsis, coast and circularise". The Briz-M then thrust for 666 s against a
 * target that sank with the vehicle, from 199 km down to 45 km, where the
 * structural placard broke the stack up at 46 kPa — 668 s after a reported
 * SECO. With 1.4 t less payload the same path "succeeded" by declaring a
 * 94 × 94 km parking orbit, which is the same defect with a quieter symptom.
 */
export const ORBIT_INSERTION_FLOOR = 140e3;

/**
 * Height a suborbital target's ascent is cut off at, m (or its apogee, if
 * lower). Starship's ship shuts down at about 150 km on its test flights and
 * climbs on to an apogee some 60° of arc downrange; cutting off at the apogee
 * instead would put the whole coast a quarter of a revolution short, and
 * Flight 5's splashdown in the Atlantic rather than the Indian Ocean.
 */
export const SUBORBITAL_CUTOFF_ALTITUDE = 150e3;

/**
 * How far a stack sinks while a low-thrust kick stage makes up an ascent
 * shortfall, m.
 *
 * This is the question a Δv budget cannot answer, and it is the question that
 * decides every Proton-M, Angara-A5 and Soyuz-2.1b/Fregat mission in this
 * model: those stacks always carry their kick stage, so their ascent stages
 * hand it a trajectory that is short of orbital, and whether the mission
 * happens depends on whether the kick stage can close that gap before the
 * trajectory does. A Briz-M has 3.6 km/s of ideal Δv aboard and 0.67 m/s² to
 * spend it with.
 *
 * While the stack is short of the local circular speed by Δv the centrifugal
 * term no longer balances gravity, so it falls at
 *
 *     g_eff = g − v_h²/r = g[1 − (1 − Δv/v_c)²] ≈ 2 g Δv / v_c      (Δv ≪ v_c)
 *
 * The kick stage closes the shortfall at a constant acceleration a, so
 * Δv(t) = Δv₀ − a t over T = Δv₀/a, and the drop over the whole burn is
 *
 *     ∫₀ᵀ (T − t) g_eff(t) dt = (2g/v_c)(Δv₀T²/2 − aT³/6) = 2 g Δv₀³ / (3 v_c a²)
 *
 * The shape is the useful part: the sink is CUBIC in the shortfall and inverse
 * square in the thrust, so a stack twice as short sinks eight times as far and
 * a kick stage with half the thrust four times as far. That is why the boundary
 * between a Proton mission that flies and one that is destroyed is a few
 * hundred kilograms of payload rather than a broad band, and why "the upper
 * stage has to make up the difference" is only true up to a difference.
 *
 * It is used by the LOFTED HAND-OFF (`AscentGuidance`), where it answers "how
 * much apex does the stage below have to leave the kick stage?", and it is fed
 * the LIVE shortfall the guidance can see rather than the plan's estimate of
 * it. That distinction matters: the plan's `ascentMakeUp` is built on a
 * fleet-wide loss allowance whose spread is ±500 m/s, and the sink is cubic in
 * the shortfall, so the same arithmetic on the plan's number is out by an order
 * of magnitude either way (Proton-M's real losses are 240 m/s above the
 * allowance, Angara-A5's well below it). This is why the pre-flight verdict
 * does not use it and flies the insertion instead.
 *
 * The closed form above is OPEN LOOP: it assumes the kick stage thrusts
 * horizontally throughout and never re-plans. A flown insertion pitches the
 * thrust up as the stack sinks — the velocity-to-be-gained command reaches 68°
 * by the end of a Briz-M insertion — and that vertical component cancels a
 * large part of g_eff, so the real sink is about half of it. Measured on the
 * flight this was calibrated against (Proton-M/Briz-M, 5 750 kg, the
 * hand-over state the guidance actually sees): 236 km open loop against 104 km
 * flown, a factor of 0.44. `SINK_FLOWN_FRACTION` is that measurement, and the
 * value returned here is the FLOWN estimate — the one a control law should
 * plan against.
 */
export const SINK_FLOWN_FRACTION = 0.5;

export function kickStageSink(makeUp: number, vCirc: number, aKick: number, g: number): number {
  if (!(makeUp > 0) || !(aKick > 0) || !(vCirc > 0)) return 0;
  return (SINK_FLOWN_FRACTION * 2 * g * makeUp * makeUp * makeUp) / (3 * vCirc * aKick * aKick);
}

/**
 * Apsis error the burn planner will fly a correction for, m.
 *
 * Bounded on BOTH sides against the acceptance band (audit items B5/B6): it has
 * to be tighter than `apsisTolerance`, or a residual the mission is judged on
 * would never be corrected, and it must not be so tight that a trim which
 * cannot deliver that accuracy is re-planned forever — the old
 * max(8 km, 1.8 % of the target apogee) was 9 km at a 500 km target, tighter
 * than an apsis trim can hold, and 644 km at GTO, looser than the mission is
 * judged on. 80 % of the acceptance band, capped at 150 km.
 */
export const apsisPlanTolerance = (h: number): number => Math.min(0.8 * Math.max(10e3, 0.02 * h), 150e3);

// ---------------------------------------------------------------------------
// Acceptance: is the orbit that was achieved the orbit that was asked for?
// ---------------------------------------------------------------------------

/**
 * Two-sided acceptance band on an apsis, m: 10 km or 2 % of the target
 * altitude, whichever is larger.
 *
 * Deliberately a *single* band for both apsides and for both circular and
 * transfer targets. An earlier revision gave an elliptical target's perigee its
 * own max(40 km, 15 %) band, which is 40 km at a 250 km GTO perigee against the
 * few kilometres a real geostationary transfer injection holds (Arianespace and
 * ULA both publish perigee dispersions of a handful of kilometres), and it was
 * sized to the model's error rather than to the mission's requirement. A band
 * that is widened until the measurement fits inside it has stopped being a test.
 */
export const apsisTolerance = (h: number): number => Math.max(10e3, 0.02 * h);

/**
 * Two-sided acceptance band on the PERIGEE of a transfer orbit, m.
 *
 * A geostationary transfer is the one case where the apsis the mission is
 * judged on is not the one the ascent controls. The apogee is flown to by a
 * burn at perigee and lands within a few tens of kilometres of 35 786 km; the
 * perigee is simply wherever the vehicle was when its apogee reached the
 * target, and nothing after that touches it — a trim at apogee moves it by a
 * kilometre per 0.1 m/s, so correcting 12 km costs a whole 10½-hour revolution
 * for an error the mission does not care about.
 *
 * Measured spread over the fleet this wave, every GTO row: −13 km to +11 km
 * about the 250 km reference, which is the model's own insertion accuracy. The
 * band is max(15 km, 5 %) — TWO-SIDED, so over-performing into a high perigee
 * is as much a miss as under-performing, and 2.7× tighter than the max(40 km,
 * 15 %) it replaces, which had been widened until the measurement fitted inside
 * it. It is still looser than a real injection: Arianespace and ULA both quote
 * GTO perigee dispersions of a few kilometres, so this is a recorded limitation
 * of the model, not a target.
 */
export const transferPerigeeTolerance = (h: number): number => Math.max(15e3, 0.05 * h);

/** The band an achieved apsis is judged against, m. */
export function perigeeTolerance(target: ResolvedTarget): number {
  const elliptical = target.apogee - target.perigee > 50e3;
  return elliptical ? transferPerigeeTolerance(target.perigee) : apsisTolerance(target.perigee);
}

/** Acceptance band on inclination, rad. */
export const INCLINATION_TOLERANCE = 0.3 * DEG;

/**
 * Acceptance band on RAAN, rad — only meaningful when the target constrains it.
 * A 420 km circular orbit in the wrong plane is a failed ISS mission, but the
 * plane the launcher can reach is set by the launch time, so the band is the
 * ~1.5° a real rendezvous plane-matching allows for.
 */
export const RAAN_TOLERANCE = 1.5 * DEG;

/**
 * How long after liftoff the orbital plane is actually established, s.
 *
 * The plane of the orbit is fixed by the position and velocity vectors, and for
 * the first minutes of an ascent the velocity is mostly vertical — the plane is
 * only really set once the horizontal speed dominates, by which time the site
 * has rotated east underneath it. Measured on this model: the RAAN reached from
 * Baikonur, the Cape, Vostochny and Mahia is 0.63-0.94° east of the RAAN
 * computed from the liftoff longitude, against 0.84° for 200 s of Earth
 * rotation. Both the expected RAAN and the launch-window search use the offset,
 * so a window opened here puts the flown plane on the target plane rather than
 * a degree behind it.
 */
export const T_PLANE = 200;

/**
 * Plane error the burn planner will fly a correction for, rad.
 *
 * Derived from the acceptance band exactly the way `apsisPlanTolerance` is
 * derived from `apsisTolerance`, and for the same reason: a plane error the
 * mission is GRADED on must be inside the band a correction is PLANNED for, or
 * a flight can end up to the acceptance limit off plane with no burn in the
 * plan to fix it. Expressed as a fraction of `INCLINATION_TOLERANCE` rather
 * than as its own number so the two cannot drift apart — this was a bare
 * `0.2 * DEG` literal sitting just under a 0.3° acceptance band, with nothing
 * tying the two together (review follow-up).
 *
 * Two thirds of the acceptance band — 0.2° against 0.3° — is the same trade the
 * 0.8 above makes: tight enough that the planner reacts well before the mission
 * would be judged to have missed, loose enough that a plane change no node burn
 * can deliver is not planned and re-planned forever. It was a sixth of the band
 * (0.05°) before this wave, which planned a plane change for errors an ascent
 * cannot steer out and a node burn cannot close.
 */
export const PLANE_PLAN_TOLERANCE = (2 / 3) * INCLINATION_TOLERANCE;

/**
 * As `PLANE_PLAN_TOLERANCE`, for `replanBurns`: five sixths of the acceptance
 * band. The re-planner runs on the orbit the ascent actually achieved, so it
 * only has to decide whether the residual is worth another revolution.
 */
export const PLANE_REPLAN_TOLERANCE = (5 / 6) * INCLINATION_TOLERANCE;

/** The orbital parameters `orbitResiduals` grades. */
export type OrbitMissParam = 'apogee' | 'perigee' | 'inclination' | 'raan';

/**
 * One parameter that is outside its acceptance band, as NUMBERS.
 *
 * This used to be a pre-joined English sentence (`apogee 480 vs 420 km`,
 * `inclination 0.42° off`) built inside the physics module and shipped through
 * the event stream as an `evt.offTargetOrbit` parameter (review follow-up).
 * That broke the architecture contract twice over: physics is not allowed to
 * produce user-visible strings, and the string was English in an application
 * that renders its events in en, ru and th — no dictionary declared the
 * placeholder, so the clause was dead payload that would have shown up as an
 * English fragment inside a Russian or Thai sentence the moment one did.
 *
 * The presentation layer already has everything it needs to write that
 * sentence: `evt.offTargetOrbit` carries the achieved `ap` / `pe` / `inc` /
 * `raan`, and `sim.plan.target` carries what they were aimed at.
 *
 * `achieved` and `target` are metres for the two apsides and degrees for the
 * two angles.
 */
export interface OrbitMiss {
  param: OrbitMissParam;
  achieved: number;
  target: number;
}

export interface OrbitResiduals {
  /** signed errors: achieved − target */
  apogee: number;
  perigee: number;
  /** deg */
  inclination: number;
  /** deg, or null when the target does not constrain RAAN */
  raan: number | null;
  onTarget: boolean;
  /** the parameters that are outside their band, as numbers — never as prose */
  misses: OrbitMiss[];
}

/**
 * Compare an achieved orbit with the mission's target.
 *
 * This is the acceptance test the simulation itself applies before it declares
 * `evt.targetOrbit`. Before it existed the event was emitted unconditionally
 * from four call sites (audit item B5) and the de-facto criterion was whatever
 * `planBurns` happened to consider worth a correction burn — a one-sided,
 * uncapped band that let a 345 × 35 737 km orbit and a 0.25° plane error be
 * reported to the user as "target orbit achieved".
 *
 * `bandScale` narrows the apsis bands for a caller that has to decide something
 * stricter than acceptance. The only one is `Simulation.singleShotCutoff`,
 * which asks "is the orbit already the mission's?" of a stage it can never
 * relight: answering that at the EDGE of the acceptance band stops the burn the
 * first instant the orbit is barely legal, which is how Soyuz-2.1a's flagship
 * direct insertion came out 9.6 km inside a 10 km band (review follow-up). It
 * does not widen: `bandScale > 1` would loosen acceptance and no caller passes
 * it.
 */
export function orbitResiduals(
  target: ResolvedTarget,
  el: { periapsisAlt: number; apoapsisAlt: number; i: number; raan: number; e: number },
  checkRaan = false,
  bandScale = 1,
): OrbitResiduals {
  const misses: OrbitMiss[] = [];
  const dAp = (isFinite(el.apoapsisAlt) ? el.apoapsisAlt : Infinity) - target.apogee;
  const dPe = el.periapsisAlt - target.perigee;
  const dInc = (el.i - target.inclination) / DEG;
  const apTol = bandScale * apsisTolerance(target.apogee);
  const peTol = bandScale * perigeeTolerance(target);
  if (!(Math.abs(dAp) <= apTol)) misses.push({ param: 'apogee', achieved: el.apoapsisAlt, target: target.apogee });
  if (!(Math.abs(dPe) <= peTol)) misses.push({ param: 'perigee', achieved: el.periapsisAlt, target: target.perigee });
  if (!(Math.abs(dInc) <= INCLINATION_TOLERANCE / DEG)) {
    misses.push({ param: 'inclination', achieved: el.i / DEG, target: target.inclination / DEG });
  }
  // RAAN is a LAUNCH WINDOW property, not a guidance one: the plane an ascent
  // reaches is fixed by the moment of liftoff, and nothing in the burn plan
  // rotates it (a RAAN change at these altitudes costs kilometres per second).
  // Final mission acceptance passes checkRaan=true even off-window: a stable
  // orbit in another plane has not met the requested target. Intermediate
  // steering/insertion checks may omit it because a burn cannot fix the
  // launch-time error; that omission must never grant final mission success.
  let dRaan: number | null = null;
  if (target.raan !== null) {
    dRaan = wrapPi(el.raan - target.raan) / DEG;
    if (checkRaan && !(Math.abs(dRaan) <= RAAN_TOLERANCE / DEG)) {
      misses.push({ param: 'raan', achieved: el.raan / DEG, target: target.raan / DEG });
    }
  }
  return { apogee: dAp, perigee: dPe, inclination: dInc, raan: dRaan, onTarget: misses.length === 0, misses };
}

/**
 * Highest apoapsis a launcher will fly straight out of the ascent instead of
 * reaching it with a separate transfer burn.
 */
export const DIRECT_APOAPSIS_CAP = 2000e3;

/**
 * Highest orbit the ascent is aimed straight at when nothing can burn after
 * cut-off, m.
 *
 * Every launcher without a restart does exactly this in reality — one burn,
 * cut-off on the mission orbit — but only up to the altitude a continuous burn
 * can actually ARRIVE at. That is not a delta-v question and the delta-v test
 * below cannot answer it: the stage has to reach the target altitude with its
 * horizontal speed still short of orbital, and once it reaches orbital speed
 * lower down, every further second of thrust raises the apoapsis instead of the
 * vehicle.
 *
 * The grid behind the 300 km figure is measured, and it is measured in exactly
 * ONE place: the `single-shot direct insertion` section of
 * tests/fleet-defaults.test.ts. It used to be quoted here as well, and the two
 * copies disagreed by 31 000 km of apoapsis on the 300 km row because this one
 * was never re-measured after the guidance changed under it (review follow-up).
 * A constant whose justification is a measurement should point at the
 * measurement, not carry a snapshot of it, so that is what this does.
 *
 * The shape of the result is the part that belongs here: 200 km closes, 250 km
 * is where the profile stops closing, 300 km is well past it. Above the
 * ceiling the launcher is aimed at the transfer orbit it CAN fly accurately
 * (200 × target), reaches it with propellant to spare and ends `off target`
 * with the perigee low — which is what such a stack does in reality, and why
 * the real vehicles fly a Fregat, a Briz-M or a vernier phase this model does
 * not have.
 */
export const DIRECT_INSERTION_CEILING = 300e3;

/** Apoapsis of the insertion ellipse a kick stage is handed (capped). */
export function insertionApoapsisFor(target: ResolvedTarget, hIns: number): number {
  return Math.max(hIns, Math.min(target.apogee, DIRECT_APOAPSIS_CAP));
}

/**
 * Direction-independent estimate of the post-ascent burn sequence to go from an
 * insertion orbit hIns × haIns at inclination `ascentInc` to the target orbit.
 *
 * `haIns` may be above or below the target apoapsis: an overshoot (the ascent
 * cut off late, or the apoapsis guard fired) is corrected by the same burn with
 * a retrograde impulse, which is why the burn kind is `raiseApoapsis` in both
 * cases.
 */
export function planBurns(target: ResolvedTarget, ascentInc: number, hIns: number, haIns = hIns, incTol = PLANE_PLAN_TOLERANCE): BurnPlan[] {
  const burns: BurnPlan[] = [];
  const rIns = R_EARTH + hIns;
  const rA = R_EARTH + target.apogee;
  const rP = R_EARTH + target.perigee;
  const needPlane = Math.abs(target.inclination - ascentInc) > incTol;
  const circularTarget = Math.abs(target.apogee - target.perigee) < 1e3;
  const aIns = (rIns + R_EARTH + haIns) / 2;
  let vAtApo = visViva(R_EARTH + haIns, aIns);
  let rApo = R_EARTH + haIns;
  // Apoapsis adjustment at periapsis. Needed when the target apoapsis is above
  // the insertion apoapsis, and also when the insertion apoapsis overshot the
  // target by more than the tolerance (then the burn is retrograde).
  // The threshold matches the accuracy the mission is judged on (about 2 % or
  // 10 km): chasing a smaller error costs more than it buys and, on a nearly
  // circular orbit, there is no well-defined periapsis to burn at.
  const apoMismatch = target.apogee - haIns;
  if (Math.abs(apoMismatch) > apsisPlanTolerance(target.apogee)) {
    const aT = (rIns + rA) / 2;
    const dv = Math.abs(visViva(rIns, aT) - visViva(rIns, aIns));
    burns.push({
      id: 'raise', kind: 'raiseApoapsis',
      atU: needPlane ? 'node' : circularTarget ? 'asap' : target.argp,
      targetApoapsis: target.apogee, dvEstimate: dv, done: false,
    });
    vAtApo = visViva(rA, aT);
    rApo = rA;
  }
  // The periapsis is judged on the same accuracy the mission is judged on as
  // the apoapsis above. Chasing a 5 km shortfall costs a whole revolution —
  // the burn is flown at the apoapsis — for a correction the target tolerance
  // does not ask for, which is how a mission that inserted on target ended up
  // deploying its payload 45 minutes later than it had to.
  // TWO-SIDED (audit item B5): an insertion whose perigee overshot is as much a
  // miss as one that fell short, and `desiredVelocity` has always been able to
  // fly the correction — it is the same burn at the apoapsis with a retrograde
  // impulse. The one-sided test was why every GTO mission in the fleet could
  // come out with a perigee up to 95 km high and still be reported on target.
  // The planner's band is 80 % of the band the mission is judged on, so a
  // residual that matters is always corrected and one that does not is never
  // chased round another revolution.
  const peTol = 0.8 * perigeeTolerance(target);
  if (Math.abs(target.perigee - hIns) > peTol || needPlane) {
    const aF = (rApo + rP) / 2;
    const v2 = visViva(rApo, aF);
    const di = target.inclination - ascentInc;
    const dv = Math.sqrt(Math.max(0, vAtApo * vAtApo + v2 * v2 - 2 * vAtApo * v2 * Math.cos(di)));
    burns.push({
      id: 'shape', kind: 'shapeAtApoapsis', atU: 0,
      targetPeriapsis: target.perigee, targetInclination: target.inclination, dvEstimate: dv, done: false,
    });
  }
  // A trim that has to bring the apoapsis *down* is flown at the periapsis. If
  // the periapsis still has to be raised as well, raising it first is half a
  // revolution closer than waiting for the current, low periapsis to come round
  // again — so the shape burn goes first in that case.
  if (burns.length === 2 && apoMismatch < 0) burns.reverse();
  return burns;
}

/**
 * Re-plan the remaining burns from an orbit that was actually achieved. Called
 * after every cut-off so that a short, long or lofted ascent is corrected by
 * the following burns instead of flying a plan that was made before liftoff.
 */
export function replanBurns(target: ResolvedTarget, el: { periapsisAlt: number; apoapsisAlt: number; i: number }): BurnPlan[] {
  if (!isFinite(el.apoapsisAlt)) return [];
  // A plane error smaller than the accuracy the mission is judged on is not
  // worth a burn — and near the equator the closest reachable plane through the
  // current position may not even be the target inclination, so such a burn
  // would be a no-op that the re-planner then schedules again forever.
  return planBurns(target, el.i, el.periapsisAlt, Math.max(el.periapsisAlt, el.apoapsisAlt), PLANE_REPLAN_TOLERANCE);
}

/**
 * Whether the launch azimuth needed for `inc` lies inside the site's
 * range-safety window. `minInclination` only constrains prograde launches, so
 * this is what decides whether a site can fly a retrograde (sun-synchronous)
 * mission at all.
 */
export function azimuthAllowedFor(site: SiteExtra, inc: number): boolean {
  return launchDirection(site, inc).allowed;
}

/**
 * Whether anything at all can light an engine after the ascent cuts off: the
 * stage that flies the ascent restarts, a kick stage sits above it, or the
 * spacecraft carries its own propulsion.
 *
 * This is the plan-time counterpart of `Simulation.canReigniteAfterCutoff`, and
 * it decides the shape of the insertion orbit: a stack that cannot burn again
 * has to be aimed at the orbit the mission actually wants, because the orbit it
 * is in at cut-off is final. Soyuz-2.1a with an inert payload is exactly that
 * case — aiming it at a 200 km parking orbit leaves it sitting there with
 * kilometres per second of Blok I propellant and no way to spend it.
 */
export function canBurnAfterAscent(vehicle: VehicleSpec, satellite: SatelliteSpec, weakFinalStage: boolean): boolean {
  if (weakFinalStage) return true;
  const last = vehicle.stages[vehicle.stages.length - 1];
  if (last.restartable) return true;
  const p = satellite.propulsion;
  return !!p && p.propellantFraction > 0 && p.thrust > 0;
}

export function planMission(cfg: MissionConfig, site: SiteExtra, _vehicle: VehicleSpec): MissionPlan {
  const target = resolveTarget(cfg.orbit, site, cfg.launchTime);
  const { inc: ascentInclination } = ascentInclinationFor(target, site);
  const direction = launchDirection(site, ascentInclination);
  const descending = direction.descending;
  const lat = site.latitude * DEG;
  const parkingOverride = cfg.guidance.parkingAltitude > 0 ? cfg.guidance.parkingAltitude : 0;
  const azimuthInertial = inertialLaunchAzimuth(lat, ascentInclination, descending) ?? Math.PI / 2;
  const jd0 = julianDate(cfg.launchTime);
  const gmst0 = gmst(jd0);
  const raanExpected = raanFromLaunch(lat, site.longitude * DEG + gmst0 + OMEGA_EARTH * T_PLANE, ascentInclination, descending);
  // A final stage that cannot even hold altitude near orbital speed (Fregat, Briz-M,
  // Curie...) is treated as an orbital-manoeuvring stage: the strong stages insert
  // into an ellipse whose apogee is the target (capped) and the kick stage finishes.
  const last = _vehicle.stages[_vehicle.stages.length - 1];
  const satellite = satelliteById(cfg.satelliteId);
  // No override means "fly the spacecraft that was selected", exactly as
  // `Simulation` and the auto-tuner already read it. Defaulting to zero here
  // made the plan — the weak-final-stage test, the ideal Δv of the strong
  // stages, and therefore the shape of the insertion orbit — describe a
  // launcher carrying nothing, for any caller that does not fill the field in
  // (the WebMCP tools and every direct `planMission` call; the setup panel
  // always sets it, which is why this never showed up in the app).
  const payload = cfg.payloadMassOverride ?? satellite.mass;
  const lastMass = last.dryMass + last.propellantMass + payload + 1500;
  const aLast = (last.engine.count * last.engine.thrustVac) / lastMass;
  const weakFinalStage = _vehicle.stages.length > 1 && aLast < 1.6;
  const restartable = canBurnAfterAscent(_vehicle, satellite, weakFinalStage);
  // Ideal delta-v of the stages that have to deliver the perigee speed of the
  // insertion orbit: everything except a final stage too weak to fly the ascent
  // (Fregat, Briz-M, Curie...), which is an orbital-manoeuvring stage instead.
  const strongSpec = weakFinalStage ? { ..._vehicle, stages: _vehicle.stages.slice(0, -1) } : _vehicle;
  const carried = weakFinalStage ? last.dryMass + last.propellantMass : 0;
  const dvStrong = new VehicleModel(strongSpec, payload + carried, cfg.boosterRecovery, undefined, cfg.recoveryPlan).deltaVRemaining();
  const vRot = OMEGA_EARTH * R_EARTH * Math.cos(lat) * Math.sin(azimuthInertial);
  /**
   * Ideal delta-v an ascent straight into the orbit h × ha costs these stages:
   * the perigee speed of that orbit + typical ascent losses − the
   * Earth-rotation credit.
   *
   * The loss allowance is `ASCENT_LOSS_ALLOWANCE`, the low end of the
   * 1 684–2 633 m/s the fleet actually spends (see its own doc comment for the
   * measurement, for the value, and for why the flat 1 450 m/s it replaces was
   * wrong — the number is deliberately not repeated here, because a figure
   * typed next to the constant it copies is a figure that will be left behind
   * when the constant moves).
   */
  const ascentCost = (h: number, ha: number): number => {
    const rIns = R_EARTH + h;
    return visViva(rIns, (rIns + R_EARTH + ha) / 2) + ASCENT_LOSS_ALLOWANCE - vRot;
  };
  /**
   * Whether those stages can fly that ascent, with `ASCENT_MARGIN_REQUIRED` of
   * margin on top.
   *
   * Under-estimating the cost is not symmetric: aiming a stack at an ellipse it
   * cannot reach ends the flight suborbital, where the circular parking orbit
   * it could have reached would have been a mission.
   */
  const ascentReaches = (h: number, ha: number): boolean =>
    dvStrong - ascentCost(h, ha) >= ASCENT_MARGIN_REQUIRED;

  let insertionAltitude = target.suborbital ? Math.min(target.apogee, SUBORBITAL_CUTOFF_ALTITUDE) : Math.max(parkingOverride, insertionAltitudeFor(target));
  // The ascent flies straight into the transfer ellipse whose apogee is the
  // target (capped): that is what most launchers do, it saves a restart, and —
  // more importantly for the guidance — it gives the closed loop and the
  // apoapsis guard a target apoapsis that is the one the mission actually
  // needs, instead of a 200 km ceiling that a weak upper stage cannot respect.
  //
  // It is only flown when the stages that have to reach the perigee speed of
  // that ellipse can actually do so. Aiming a stack at an ellipse it cannot
  // reach is strictly worse than aiming it at the circular parking orbit it
  // can: the ascent burns to depletion short of both and ends suborbital,
  // where the parking orbit would have been reached and the remaining burns
  // (or the spacecraft's own engine) would have raised it. Soyuz-2.1a with a
  // crew ship to the ISS is exactly that case.
  //
  // A CREWED launch is the exception: it is flown into a low circular parking
  // orbit, not a transfer ellipse, because the crew's abort options depend on
  // the orbit being one they can stay in. Soyuz MS inserts at 200 × 240 km and
  // the spacecraft raises itself to the station over the following orbits; the
  // launcher's own margin is not spent shaping a transfer. Without this the
  // corrected delta-v accounting (audit item B13, which lifts every
  // booster-equipped launcher by 5–19 %) flips the R-7 onto a 200 × 417 km
  // ellipse — more efficient on paper, and not a crewed profile.
  const crewed = satellite.crewed === true;
  const haCandidate = insertionApoapsisFor(target, insertionAltitude);
  let insertionApoapsis = insertionAltitude;
  if (!target.suborbital && !crewed && haCandidate > insertionAltitude + 1e3 && ascentReaches(insertionAltitude, haCandidate)) {
    insertionApoapsis = haCandidate;
  }
  // A suborbital target is cut off on its way up, at the height the ascent
  // flies to, climbing at the rate of the target ellipse there.
  const suborbitalAim: SuborbitalAim | undefined = target.suborbital ? { a: target.a, p: target.a * (1 - target.e * target.e) } : undefined;
  if (target.suborbital) insertionApoapsis = target.apogee;
  // Single-shot stack: nothing can light an engine after the ascent cuts off,
  // so a parking orbit is not a parking orbit — it is the final orbit. Aim the
  // ascent at the mission's own orbit instead, exactly as a real launcher
  // without a restartable upper stage does (direct insertion). The same
  // delta-v test as above decides: if the stack cannot reach the target
  // directly it is aimed at the parking orbit it can reach, which at least
  // leaves the payload in a stable orbit rather than in the sea.
  // Single-shot stack: nothing can light an engine after the ascent cuts off,
  // so a "parking orbit" is not a parking orbit — it is the final orbit. Both
  // the 200 km insertion altitude and the 2000 km apoapsis cap exist to hand a
  // restartable stage a sensible transfer; applied to a stack with no restart
  // they strand the payload. So the ascent is aimed at the mission's own orbit,
  // perigee AND apogee, exactly as a real single-burn direct insertion is
  // (Soyuz-2.1a, Long March 2D). The same ideal-delta-v test as above decides:
  // a stack that cannot reach the target directly is aimed at the parking orbit
  // it can reach, which at least leaves the payload in a stable orbit.
  if (!target.suborbital && !restartable && parkingOverride <= 0 && target.perigee <= DIRECT_INSERTION_CEILING) {
    const hFinal = target.perigee;
    const haFinal = Math.max(hFinal, target.apogee);
    if (ascentReaches(hFinal, haFinal)) {
      insertionAltitude = hFinal;
      insertionApoapsis = haFinal;
    }
  }
  const vOrb = circularSpeed(R_EARTH + insertionAltitude);
  // A dogleg leaves on the corridor edge; the closed loop turns into the plane.
  const azimuthRotating = direction.doglegDeg > 0 ? direction.azimuthRotating
    : rotatingLaunchAzimuth(lat, ascentInclination, vOrb, descending) ?? azimuthInertial;
  // A suborbital target is flown to its apogee and cut off there, when the
  // periapsis has risen to the target's (`AscentMonitor.checkAscent`): there
  // is no orbit to shape afterwards, so no burns, and what the ascent owes is
  // the target ellipse's own speed at that apogee.
  const burns = target.suborbital ? [] : planBurns(target, ascentInclination, insertionAltitude, insertionApoapsis);
  const insertionCost = target.suborbital
    ? visViva(R_EARTH + insertionAltitude, target.a) + ASCENT_LOSS_ALLOWANCE - vRot
    : ascentCost(insertionAltitude, insertionApoapsis);
  // What the kick stage is left holding, and whether it can hold it. The ascent
  // stages' shortfall against the orbit they are AIMED at is what a kick stage
  // has to make up; `kickStageSink` turns that into the altitude the stack
  // loses making it up, which is the term the Δv budget cannot see.
  const ascentMakeUp = Math.max(0, insertionCost - dvStrong);
  const kickStageAccel = weakFinalStage ? aLast : 0;
  const rIns = R_EARTH + insertionAltitude;
  const insertionSink = kickStageSink(
    ascentMakeUp,
    visViva(rIns, (rIns + R_EARTH + insertionApoapsis) / 2),
    kickStageAccel,
    MU_EARTH / (rIns * rIns),
  );
  return {
    target, ascentInclination, descending, doglegDeg: direction.doglegDeg, azimuthInertial, azimuthRotating, insertionAltitude, insertionApoapsis, weakFinalStage, burns,
    launchTime: cfg.launchTime, jd0, gmst0, raanExpected,
    planeChangeDeg: Math.abs(target.inclination - ascentInclination) / DEG,
    // Both ends of the corridor, not just the declared minimum: the ascent
    // itself is unchanged (an inclination above the corridor is still flyable
    // geometrically, and the guidance flies it), but the plan now REPORTS that
    // the site may not launch on that heading, which is what the pre-flight
    // verdict reads.
    inclinationReachable: inclinationCorridor(site, target.inclination) === 'ok',
    dvEstimateBurns: burns.reduce((s, b) => s + b.dvEstimate, 0),
    // The same arithmetic as `ascentReaches`, evaluated against the MISSION's
    // own orbit rather than against whatever the planner ended up aiming at:
    // that is the question a capability claim asks.
    ascentMargin: dvStrong - (target.suborbital ? insertionCost : ascentCost(target.perigee, target.apogee)),
    ascentMakeUp, kickStageAccel, insertionSink,
    ...(suborbitalAim ? { suborbitalAim } : {}),
  };
}

export interface LaunchWindow {
  time: Date;
  descending: boolean;
  raanTarget: number;
}

/**
 * Next launch windows (up to `count`) after `from` for which the ascent plane
 * matches the target RAAN. Returns an empty list when RAAN is unconstrained.
 */
export function launchWindows(orbit: OrbitSpec, site: SiteExtra, from: Date, count = 4): LaunchWindow[] {
  const lat = site.latitude * DEG;
  const lon = site.longitude * DEG;
  const t0 = resolveTarget(orbit, site, from);
  if (t0.raan === null) return [];
  const { inc } = ascentInclinationFor(t0, site);
  const descending = launchDirection(site, inc).descending;
  const out: LaunchWindow[] = [];
  // Δλ between ascending node and site along the orbit is fixed for given lat/inc.
  // Δλ is the offset between the site's inertial longitude and the node of the
  // orbit it reaches from there, so it is built from the unshifted longitude;
  // `T_PLANE` then enters exactly once, as the head start the liftoff needs.
  const dlam = wrapPi(lon + gmst(julianDate(from)) - raanFromLaunch(lat, lon + gmst(julianDate(from)), inc, descending));
  let t = new Date(from.getTime());
  for (let k = 0; k < count; k++) {
    // iterate twice because the target RAAN itself drifts slowly with time
    let cand = t;
    for (let it = 0; it < 3; it++) {
      const tgt = resolveTarget(orbit, site, cand);
      const raanT = tgt.raan ?? 0;
      const lonINeeded = raanT + dlam;
      const g = gmst(julianDate(t)) + lon;
      const dtheta = wrap2pi(lonINeeded - g);
      // liftoff is T_PLANE before the moment the site has to be under the plane
      let dt = dtheta / OMEGA_EARTH - T_PLANE;
      if (dt < 60) dt += SIDEREAL_DAY;
      cand = new Date(t.getTime() + dt * 1000);
    }
    out.push({ time: cand, descending, raanTarget: resolveTarget(orbit, site, cand).raan ?? 0 });
    t = new Date(cand.getTime() + 120 * 1000);
  }
  return out;
}
