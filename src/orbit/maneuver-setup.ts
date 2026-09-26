/**
 * The maneuver planner's settings (roadmap O02): what the user chose — a
 * kind of maneuver and its numbers — and how that becomes a plan on the
 * orbit in the playground. The defaults are read off the orbit itself, so
 * a first press of a button already shows something sensible: a Hohmann
 * transfer from a low orbit goes to geostationary height, a plane change
 * takes ten degrees off, a deorbit burn aims at a 50 km perigee.
 *
 * DOM-free: src/ui/orbit/maneuver-panel.ts draws the settings,
 * tests/maneuver-setup.test.ts holds the defaults to plans that work.
 */
import { DEG, R_EARTH } from '../physics/constants';
import { orbitFacts, stateAt, type Orbit } from './kepler';
import {
  biElliptic, circularizeAtApogee, deorbit, hohmann, manual, phasing, planeChange, rendezvous, spiral,
  type ManualNode, type Plan, type PlanError,
} from './maneuvers';

export type PlannerKind = 'hohmann' | 'biElliptic' | 'planeChange' | 'circularizeApogee' | 'phasing' | 'deorbit' | 'spiral' | 'manual' | 'rendezvous';

/** The maneuvers of the Explore level; the Engineer's add the Lambert rendezvous. */
export const EXPLORE_KINDS: readonly PlannerKind[] = ['hohmann', 'biElliptic', 'planeChange', 'circularizeApogee', 'phasing', 'deorbit', 'spiral', 'manual'];
export const ENGINEER_KINDS: readonly PlannerKind[] = [...EXPLORE_KINDS, 'rendezvous'];

/** Your own burns: at most this many. */
export const MAX_NODES = 5;

/** The ranges the settings are held to (SI). */
export const MANEUVER_LIMITS = {
  altitude: { min: 150e3, max: 400_000e3 },
  perigee: { min: -200e3, max: 2000e3 },
  parts: { min: 1, max: 6 },
  phase: { min: -180 * DEG, max: 180 * DEG },
  revs: { min: 1, max: 20 },
  /** thrust acceleration, m/s²: an ion engine on a small satellite to a large Hall thruster on a light one */
  accel: { min: 1e-5, max: 1e-2 },
  burn: { min: -5000, max: 5000 },
  /** the time before a burn "after a while", s */
  after: { min: 0, max: 30 * 86400 },
} as const;

export interface ManeuverSettings {
  kind: PlannerKind;
  /** Hohmann, bi-elliptic and the spiral: the circle to end on, m above the equatorial radius */
  targetAlt: number;
  /** bi-elliptic: how far out the first ellipse goes, m */
  farAlt: number;
  /** plane change and spiral: the inclination to end at, rad */
  targetI: number;
  /** circularise at apogee: over how many apogees */
  parts: number;
  /** phasing: how far to move along the orbit (ahead positive), rad, and in how many revolutions */
  phase: number;
  revs: number;
  /** deorbit: the perigee to aim at, m */
  perigeeAlt: number;
  /** spiral: the thrust acceleration, m/s² */
  accel: number;
  /** your own burns */
  nodes: ManualNode[];
  /**
   * rendezvous: the target — a satellite on a circle in the chaser's own
   * plane, at `targetAlt`, `targetPhase` ahead of the chaser at the start
   * (rad). In its plane, as a real rendezvous is: a spacecraft is launched
   * into its target's plane, and what is left is height and phase.
   */
  targetPhase: number;
  /** rendezvous: leave after `dep` s and arrive `tof` s later */
  dep: number;
  tof: number;
}

/** Settings for `kind` that make sense on `o`. */
export function defaultSettings(kind: PlannerKind, o: Orbit): ManeuverSettings {
  const apogeeAlt = o.a * (1 + o.e) - R_EARTH;
  const f = orbitFacts(o, false);
  return {
    kind,
    targetAlt: kind === 'spiral' || apogeeAlt < 20_000e3 ? 35_786e3 : 500e3,
    farAlt: 300_000e3,
    targetI: kind === 'spiral' ? 0 : o.i >= 10 * DEG ? o.i - 10 * DEG : o.i + 10 * DEG,
    parts: 1,
    phase: 20 * DEG,
    revs: 3,
    perigeeAlt: 50e3,
    accel: 1e-3,
    nodes: [{ point: 'now', vnb: { prograde: 100, normal: 0, radial: 0 } }],
    targetPhase: 30 * DEG,
    dep: 0,
    tof: 0.45 * f.period,
    ...(kind === 'biElliptic' ? { targetAlt: 120_000e3 } : {}),
    // a rendezvous: a station 300 km above a low orbit, or 300 km below a high one
    ...(kind === 'rendezvous' ? { targetAlt: Math.max(200e3, (apogeeAlt < 2000e3 ? 300e3 : -300e3) + o.a - R_EARTH) } : {}),
  };
}

/** The rendezvous target: on a circle at `targetAlt` in the chaser's plane, `targetPhase` ahead of it at the chaser's epoch. */
export function rendezvousTarget(s: Pick<ManeuverSettings, 'targetAlt' | 'targetPhase'>, chaser: Orbit): Orbit {
  const c = stateAt(chaser, 0, false);
  return { a: R_EARTH + s.targetAlt, e: 0, i: chaser.i, raan: chaser.raan, argp: 0, m0: c.argp + c.nu + s.targetPhase, jd0: chaser.jd0 };
}

/** The plan the settings make on `start`, from `t0` s after its epoch. */
export function makePlan(s: ManeuverSettings, start: Orbit, t0: number, j2: boolean): Plan | PlanError {
  switch (s.kind) {
    case 'hohmann': return hohmann(start, t0, s.targetAlt, j2);
    case 'biElliptic': return biElliptic(start, t0, s.farAlt, s.targetAlt, j2);
    case 'planeChange': return planeChange(start, t0, s.targetI, j2);
    case 'circularizeApogee': return circularizeAtApogee(start, t0, s.parts, j2);
    case 'phasing': return phasing(start, t0, s.phase, s.revs, j2);
    case 'deorbit': return deorbit(start, t0, s.perigeeAlt, j2);
    case 'spiral': return spiral(start, t0, s.targetAlt, s.targetI, s.accel, j2);
    case 'manual': return manual(start, t0, s.nodes, j2);
    case 'rendezvous': return rendezvous(start, rendezvousTarget(s, start), t0 + s.dep, s.tof, j2);
  }
}

/**
 * The porkchop plot's axes for a rendezvous. Departures over one synodic
 * period — the time the two take to come back to the same relative
 * position, so the cheapest geometry is always in the window — but at least
 * two revolutions and at most a day; flights from a tenth of the shorter
 * period to one of the longer: every single-revolution transfer worth
 * looking at.
 */
export function porkchopAxes(chaser: Orbit, target: Orbit, cols = 64, rows = 48): { deps: number[]; tofs: number[] } {
  const tc = orbitFacts(chaser, false).period, tt = orbitFacts(target, false).period;
  const long = Math.max(tc, tt), short = Math.min(tc, tt);
  const synodic = 1 / Math.abs(1 / tc - 1 / tt);
  const window = Math.min(86400, Math.max(2 * long, Number.isFinite(synodic) ? synodic : 0));
  const deps = Array.from({ length: cols }, (_, k) => (k / (cols - 1)) * window);
  const tofs = Array.from({ length: rows }, (_, k) => 0.1 * short + (k / (rows - 1)) * (long - 0.1 * short));
  return { deps, tofs };
}

/** The cheapest cell of a porkchop grid: its indices and Δv, or null when every cell is empty. */
export function porkchopMinimum(grid: readonly (readonly number[])[]): { i: number; j: number; dv: number } | null {
  let best: { i: number; j: number; dv: number } | null = null;
  grid.forEach((row, i) => row.forEach((dv, j) => {
    if (Number.isFinite(dv) && (!best || dv < best.dv)) best = { i, j, dv };
  }));
  return best;
}
