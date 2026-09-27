/**
 * The maneuver planner (roadmap O02, docs/ROADMAP-PART2-3.md): impulsive
 * burns along the velocity, the orbit normal and the radius, and the
 * transfers every textbook works through — Hohmann, bi-elliptic, a plane
 * change at a node, circularising at apogee with the plane change folded in
 * (GTO→GEO, in one burn or split over several apogees), phasing, a deorbit
 * burn and Edelbaum's low-thrust spiral — plus Lambert's problem and the
 * porkchop grid of an Earth-orbit rendezvous for the Engineer level.
 *
 * A plan is built the way it would be flown: the orbit carried to the burn
 * (by `stateAt`, Kepler with J2's secular drift when asked), the burn added
 * to the velocity there, the orbit read off the new state. The closed forms
 * are kept beside the plans so the tests can hold one to the other and both
 * to worked examples (Vallado, *Fundamentals of Astrodynamics and
 * Applications*; Curtis, *Orbital Mechanics for Engineering Students*).
 *
 * DOM-free, SI units and radians, the simulator's ECI frame.
 */
import { MU_EARTH, R_EARTH } from '../physics/constants';
import { gmst, meanFromTrue, stateFromElements, wrap2pi } from '../physics/orbital';
import { add, cross, dot, norm, normalize, rotateAxis, scale, sub, v3, type Vec3 } from '../physics/vec3';
import { orbitFromState, secularRates, stateAt, type Orbit, type OrbitState } from './kepler';

const TWO_PI = 2 * Math.PI;
/** The height below which an orbit is taken to be re-entering, m: the entry interface. */
export const ENTRY_ALTITUDE = 100e3;

// ─── the burn's frame ───────────────────────────────────────────────────────

/** A burn in the orbit's own axes, m/s: along the velocity, along the angular momentum, and out from the Earth. */
export interface Vnb {
  prograde: number;
  normal: number;
  radial: number;
}

/**
 * The velocity–normal–binormal axes at a state: prograde along v, normal
 * along h = r × v, radial = prograde × normal, which is straight out from
 * the Earth on a circular orbit and leans with the flight-path angle on an
 * ellipse (the axes a spacecraft steers by, and those of KSP's nodes).
 */
export function vnbAxes(r: Vec3, v: Vec3): { prograde: Vec3; normal: Vec3; radial: Vec3 } {
  const prograde = normalize(v), normal = normalize(cross(r, v));
  return { prograde, normal, radial: cross(prograde, normal) };
}

export function toVnb(dv: Vec3, r: Vec3, v: Vec3): Vnb {
  const ax = vnbAxes(r, v);
  return { prograde: dot(dv, ax.prograde), normal: dot(dv, ax.normal), radial: dot(dv, ax.radial) };
}

export function fromVnb(b: Vnb, r: Vec3, v: Vec3): Vec3 {
  const ax = vnbAxes(r, v);
  return add(add(scale(ax.prograde, b.prograde), scale(ax.normal, b.normal)), scale(ax.radial, b.radial));
}

// ─── when ───────────────────────────────────────────────────────────────────

/** Below this eccentricity an orbit is a circle: it has no perigee to wait for, and a burn "at perigee" is made at once. */
export const CIRCULAR_E = 1e-4;

/** The first time at or after `t` that the satellite is at true anomaly `nu`, s after the orbit's epoch. */
export function timeToTrueAnomaly(o: Orbit, t: number, nu: number, j2: boolean): number {
  const n = secularRates(o, j2).meanMotion;
  const now = o.m0 + n * t;
  let dM = wrap2pi(meanFromTrue(wrap2pi(nu), o.e) - now);
  if (dM > TWO_PI - 1e-9) dM = 0;
  return t + dM / n;
}

export type BurnPoint = 'now' | 'perigee' | 'apogee' | 'ascendingNode' | 'descendingNode' | 'time';

/** When the satellite next reaches a point of its orbit, at or after `t`. */
export function timeToPoint(o: Orbit, t: number, point: BurnPoint, j2: boolean): number {
  switch (point) {
    case 'now': case 'time': return t;
    case 'perigee': return o.e < CIRCULAR_E ? t : timeToTrueAnomaly(o, t, 0, j2);
    case 'apogee': return o.e < CIRCULAR_E ? t : timeToTrueAnomaly(o, t, Math.PI, j2);
    case 'ascendingNode': case 'descendingNode': {
      // the node is where the argument of latitude is 0 (or π); ω drifts under J2, so refine once
      const u = point === 'ascendingNode' ? 0 : Math.PI;
      let at = timeToTrueAnomaly(o, t, u - stateAt(o, t, j2).argp, j2);
      at = timeToTrueAnomaly(o, t, u - stateAt(o, at, j2).argp, j2);
      return at;
    }
  }
}

// ─── plans ──────────────────────────────────────────────────────────────────

export interface PlanBurn {
  /** s after the start orbit's epoch */
  t: number;
  /** the change of velocity, m/s, ECI, and in the orbit's axes just before the burn */
  dv: Vec3;
  vnb: Vnb;
  /** where on the orbit it is made */
  point: BurnPoint;
}

export interface PlanSegment {
  /** from this time on, s after the start orbit's epoch */
  t0: number;
  /** the orbit flown, its epoch at `t0` (the first segment's is the start orbit's own) */
  orbit: Orbit;
}

/** Edelbaum's spiral: circular orbits whose radius and inclination change continuously. */
export interface SpiralPath {
  t0: number;
  duration: number;
  /** thrust acceleration, m/s² */
  accel: number;
  v0: number;
  v1: number;
  beta0: number;
  i0: number;
  /** +1 or −1: which way the inclination goes */
  iSign: number;
  coplanar: boolean;
  raan: number;
  /** the argument of latitude along the way: at `times[k]`, `u[k]` */
  times: number[];
  u: number[];
}

export type ManeuverKind = 'hohmann' | 'biElliptic' | 'planeChange' | 'circularizeApogee' | 'phasing' | 'deorbit' | 'spiral' | 'manual' | 'rendezvous';

export interface Plan {
  kind: ManeuverKind;
  burns: PlanBurn[];
  segments: PlanSegment[];
  spiral?: SpiralPath;
  /** Σ|Δv|, m/s */
  totalDv: number;
  /** when the last burn ends (or the spiral), s after the start orbit's epoch */
  arrival: number;
  /** the orbit at the end */
  final: Orbit;
  /** deorbit: when the orbit comes down to the entry interface, s after the start orbit's epoch */
  entry?: number;
}

/** A plan that could not be made, and why (an i18n key's last part). */
export interface PlanError {
  error: 'notClosed' | 'hitsEarth' | 'badTarget' | 'notCircular' | 'noNode' | 'lambert';
}

export const isPlan = (p: Plan | PlanError): p is Plan => 'burns' in p;

/** Burn `dv` (ECI, m/s) at `t` s after the epoch of `o`: the orbit afterwards, its epoch at the burn. */
export function applyBurn(o: Orbit, t: number, dv: Vec3, j2: boolean): { orbit: Orbit; before: OrbitState } {
  const s = stateAt(o, t, j2);
  return { orbit: orbitFromState(s.r, add(s.v, dv), o.jd0 + t / 86400), before: s };
}

/** Build a plan by flying its burns one after another. Each burn's time is found on the orbit it is made from. */
class Builder {
  readonly burns: PlanBurn[] = [];
  readonly segments: PlanSegment[];
  constructor(readonly start: Orbit, readonly j2: boolean) {
    this.segments = [{ t0: 0, orbit: start }];
  }
  get orbit(): Orbit { return this.segments[this.segments.length - 1].orbit; }
  get t0(): number { return this.segments[this.segments.length - 1].t0; }
  /** A burn at time `t` (s after the start epoch): `dv` from the state then. */
  burn(t: number, point: BurnPoint, dvOf: (s: OrbitState) => Vec3): OrbitState {
    const local = t - this.t0;
    const s = stateAt(this.orbit, local, this.j2);
    const dv = dvOf(s);
    this.burns.push({ t, dv, vnb: toVnb(dv, s.r, s.v), point });
    this.segments.push({ t0: t, orbit: orbitFromState(s.r, add(s.v, dv), this.orbit.jd0 + local / 86400) });
    return s;
  }
  /** The next time the current orbit is at `point`, at or after `t`. */
  next(point: BurnPoint, t: number): number {
    return this.t0 + timeToPoint(this.orbit, t - this.t0, point, this.j2);
  }
  plan(kind: ManeuverKind, extra: Partial<Plan> = {}): Plan {
    const last = this.burns[this.burns.length - 1];
    return {
      kind, burns: this.burns, segments: this.segments,
      totalDv: this.burns.reduce((sum, b) => sum + norm(b.dv), 0),
      arrival: last ? last.t : this.t0, final: this.orbit, ...extra,
    };
  }
}

/** The velocity along the current one, set to `speed` (a burn along the velocity at an apsis). */
const alongTo = (s: OrbitState, speed: number): Vec3 => scale(normalize(s.v), speed - norm(s.v));
const radius = (s: OrbitState): number => norm(s.r);
/** Vis-viva: the speed at radius r on an orbit with apsides r and `other`. */
const speedOnEllipse = (r: number, other: number): number => Math.sqrt(MU_EARTH * (2 / r - 2 / (r + other)));

function closedOrbit(o: Orbit): PlanError | null {
  if (!(o.e < 1) || !(o.a > 0)) return { error: 'notClosed' };
  return null;
}

/**
 * Hohmann: to a circle at `targetAlt`, in two burns along the velocity. The
 * first is at perigee (at apogee to go down below the perigee), setting the
 * far apsis at the target radius; the second, half an orbit on, circularises
 * there. From a circle this is the textbook transfer; from an ellipse it is
 * the same two burns from its apsis.
 */
export function hohmann(start: Orbit, t: number, targetAlt: number, j2: boolean): Plan | PlanError {
  const bad = closedOrbit(start);
  if (bad) return bad;
  const rt = R_EARTH + targetAlt;
  if (!(targetAlt > 0)) return { error: 'badTarget' };
  const b = new Builder(start, j2);
  const down = rt < start.a * (1 - start.e);
  const p1: BurnPoint = down ? 'apogee' : 'perigee';
  b.burn(b.next(p1, t), p1, (s) => alongTo(s, speedOnEllipse(radius(s), rt)));
  const p2: BurnPoint = rt >= b.orbit.a ? 'apogee' : 'perigee';
  b.burn(b.next(p2, b.t0 + 1), p2, (s) => alongTo(s, Math.sqrt(MU_EARTH / radius(s))));
  return b.plan('hohmann');
}

/** Bi-elliptic: out to `farAlt` first, raise the perigee to the target there, and circularise at the target. */
export function biElliptic(start: Orbit, t: number, farAlt: number, targetAlt: number, j2: boolean): Plan | PlanError {
  const bad = closedOrbit(start);
  if (bad) return bad;
  const rb = R_EARTH + farAlt, rt = R_EARTH + targetAlt;
  if (!(targetAlt > 0) || rb < rt || rb < start.a * (1 + start.e)) return { error: 'badTarget' };
  const b = new Builder(start, j2);
  b.burn(b.next('perigee', t), 'perigee', (s) => alongTo(s, speedOnEllipse(radius(s), rb)));
  b.burn(b.next('apogee', b.t0 + 1), 'apogee', (s) => alongTo(s, speedOnEllipse(radius(s), rt)));
  b.burn(b.next('perigee', b.t0 + 1), 'perigee', (s) => alongTo(s, Math.sqrt(MU_EARTH / radius(s))));
  return b.plan('biElliptic');
}

/**
 * A plane change at a node: the velocity turned about the radius, which
 * keeps the orbit's size and shape and turns its plane about the line of
 * nodes. Made at the node farther from the Earth, where the orbit is slower
 * and the turn cheaper: Δv = 2 v_h sin(Δi/2).
 */
export function planeChange(start: Orbit, t: number, targetI: number, j2: boolean): Plan | PlanError {
  const bad = closedOrbit(start);
  if (bad) return bad;
  if (!(targetI >= 0 && targetI <= Math.PI)) return { error: 'badTarget' };
  if (Math.sin(start.i) < 1e-6 && Math.abs(targetI - start.i) > 1e-9) return { error: 'noNode' };
  const b = new Builder(start, j2);
  const asc = b.next('ascendingNode', t), desc = b.next('descendingNode', t);
  const rAsc = norm(stateAt(start, asc, j2).r), rDesc = norm(stateAt(start, desc, j2).r);
  const useAsc = rAsc > rDesc + 1 || (Math.abs(rAsc - rDesc) <= 1 && asc <= desc);
  const at = useAsc ? asc : desc;
  b.burn(at, useAsc ? 'ascendingNode' : 'descendingNode', (s) => {
    // whichever way round the node line lands on the target inclination
    const di = targetI - start.i;
    const turned = [di, -di].map((angle) => rotateAxis(s.v, normalize(s.r), angle));
    const incl = (v: Vec3) => { const h = cross(s.r, v); return Math.acos(Math.max(-1, Math.min(1, h.z / norm(h)))); };
    const best = Math.abs(incl(turned[0]) - targetI) <= Math.abs(incl(turned[1]) - targetI) ? turned[0] : turned[1];
    return sub(best, s.v);
  });
  return b.plan('planeChange');
}

/**
 * Circularise at apogee, turning the plane as close to the equator as the
 * apogee's position allows — GTO to GEO when the apogee is at a node, as a
 * GTO's is. The one burn is the combined burn
 * Δv = √(v_a² + v_c² − 2 v_a v_c cos Δi). Split over `parts` apogees, each
 * burn is the same share of that vector: the satellite comes back to the
 * same point with the same velocity after each revolution, so the pieces
 * add up to the single burn, and the orbits between show the perigee rising
 * as real GEO satellites raise theirs, several burns apart.
 */
export function circularizeAtApogee(start: Orbit, t: number, parts: number, j2: boolean): Plan | PlanError {
  const bad = closedOrbit(start);
  if (bad) return bad;
  const n = Math.max(1, Math.min(8, Math.round(parts)));
  const b = new Builder(start, j2);
  let piece: Vec3 | null = null;
  for (let k = 0; k < n; k++) {
    const at = b.next('apogee', k === 0 ? t : b.t0 + 1);
    b.burn(at, 'apogee', (s) => {
      if (!piece) {
        const rhat = normalize(s.r), z = v3(0, 0, 1);
        // the plane through the radius that is nearest the equator: its normal is the pole's part square to the radius
        let hWant = sub(z, scale(rhat, dot(z, rhat)));
        if (norm(hWant) < 1e-9) hWant = normalize(cross(s.r, s.v));
        else hWant = normalize(hWant);
        if (dot(hWant, cross(s.r, s.v)) < 0 && Math.cos(start.i) < 0) hWant = scale(hWant, -1);
        const target = scale(normalize(cross(hWant, rhat)), Math.sqrt(MU_EARTH / norm(s.r)));
        piece = scale(sub(target, s.v), 1 / n);
      }
      return piece;
    });
  }
  return b.plan('circularizeApogee');
}

/**
 * Phasing: catch up (θ > 0, a target ahead) or fall back (θ < 0) by an angle
 * θ of mean anomaly along the same orbit, in `revs` revolutions of a phasing
 * orbit with the period T(1 − θ/2πk), then burn back onto the original orbit
 * at the same point. Burns at perigee (at once on a circle).
 */
export function phasing(start: Orbit, t: number, theta: number, revs: number, j2: boolean): Plan | PlanError {
  const bad = closedOrbit(start);
  if (bad) return bad;
  const k = Math.max(1, Math.round(revs));
  const T = TWO_PI / secularRates(start, j2).meanMotion;
  const Tph = T * (1 - theta / (TWO_PI * k));
  if (!(Tph > 0)) return { error: 'badTarget' };
  const aPh = Math.cbrt(MU_EARTH * (Tph / TWO_PI) ** 2);
  const b = new Builder(start, j2);
  const at = b.next('perigee', t);
  const s0 = b.burn(at, 'perigee', (s) => alongTo(s, Math.sqrt(MU_EARTH * (2 / radius(s) - 1 / aPh))));
  const ph = b.orbit;
  if (ph.a * (1 - ph.e) < R_EARTH + ENTRY_ALTITUDE) return { error: 'hitsEarth' };
  const speed0 = norm(s0.v);
  b.burn(at + k * (TWO_PI / secularRates(ph, j2).meanMotion), 'perigee', (s) => alongTo(s, speed0));
  return b.plan('phasing');
}

/**
 * A deorbit burn: retrograde at apogee (at once on a circle), down to a
 * perigee at `perigeeAlt`; the plan says when the orbit reaches the entry
 * interface, 100 km, on the way down.
 */
export function deorbit(start: Orbit, t: number, perigeeAlt: number, j2: boolean): Plan | PlanError {
  const bad = closedOrbit(start);
  if (bad) return bad;
  const b = new Builder(start, j2);
  const at = b.next('apogee', t);
  const ra = norm(stateAt(start, at, j2).r), rp = R_EARTH + perigeeAlt;
  if (!(rp < ra)) return { error: 'badTarget' };
  b.burn(at, 'apogee', (s) => alongTo(s, speedOnEllipse(radius(s), rp)));
  const o = b.orbit, rEntry = R_EARTH + ENTRY_ALTITUDE;
  let entry: number | undefined;
  if (rp < rEntry && o.a * (1 + o.e) > rEntry) {
    const p = o.a * (1 - o.e * o.e);
    const nuEntry = TWO_PI - Math.acos(Math.max(-1, Math.min(1, (p / rEntry - 1) / o.e)));
    entry = b.t0 + timeToTrueAnomaly(o, 0, nuEntry, j2);
  }
  return b.plan('deorbit', { entry });
}

/** A burn of the Explore level's own: at a point of the orbit, in the orbit's axes. */
export interface ManualNode {
  point: BurnPoint;
  /** for `point: 'time'`, s after the previous burn (or after the start) */
  after?: number;
  vnb: Vnb;
}

export function manual(start: Orbit, t: number, nodes: readonly ManualNode[], j2: boolean): Plan | PlanError {
  const bad = closedOrbit(start);
  if (bad) return bad;
  const b = new Builder(start, j2);
  let from = t;
  for (const node of nodes) {
    if (closedOrbit(b.orbit)) break; // an escape: nothing more to plan on
    const at = node.point === 'time' ? from + Math.max(0, node.after ?? 0) : b.next(node.point, from);
    b.burn(at, node.point, (s) => fromVnb(node.vnb, s.r, s.v));
    from = at + 1;
  }
  return b.plan('manual');
}

/** Where the satellite is at `t` on a plan. */
export function stateOnPlan(plan: Plan, t: number, j2: boolean): OrbitState {
  const sp = plan.spiral;
  if (sp && t > sp.t0 && t < sp.t0 + sp.duration) return spiralState(sp, t, plan.segments[0].orbit, t);
  const seg = segmentAt(plan, t);
  const s = stateAt(seg.orbit, t - seg.t0, j2);
  return { ...s, t };
}

/** The segment flown at `t`. */
export function segmentAt(plan: Plan, t: number): PlanSegment {
  let seg = plan.segments[0];
  for (const s of plan.segments) if (s.t0 <= t) seg = s;
  return seg;
}

// ─── closed forms ───────────────────────────────────────────────────────────

/** Hohmann between circles of radius r1 and r2: the two burns, m/s, and the time, s. */
export function hohmannDv(r1: number, r2: number): { dv1: number; dv2: number; total: number; time: number } {
  const at = (r1 + r2) / 2;
  const dv1 = Math.abs(Math.sqrt(MU_EARTH / r1) * (Math.sqrt(2 * r2 / (r1 + r2)) - 1));
  const dv2 = Math.abs(Math.sqrt(MU_EARTH / r2) * (1 - Math.sqrt(2 * r1 / (r1 + r2))));
  return { dv1, dv2, total: dv1 + dv2, time: Math.PI * Math.sqrt(at ** 3 / MU_EARTH) };
}

/** Bi-elliptic between circles r1 and r2 through rb: the three burns, m/s, and the time, s. */
export function biEllipticDv(r1: number, r2: number, rb: number): { dv1: number; dv2: number; dv3: number; total: number; time: number } {
  const dv1 = Math.sqrt(MU_EARTH / r1) * (Math.sqrt(2 * rb / (r1 + rb)) - 1);
  const dv2 = Math.sqrt(2 * MU_EARTH / rb) * (Math.sqrt(r2 / (r2 + rb)) - Math.sqrt(r1 / (r1 + rb)));
  const dv3 = Math.sqrt(MU_EARTH / r2) * (Math.sqrt(2 * rb / (r2 + rb)) - 1);
  const a1 = (r1 + rb) / 2, a2 = (r2 + rb) / 2;
  return { dv1, dv2, dv3, total: Math.abs(dv1) + Math.abs(dv2) + Math.abs(dv3), time: Math.PI * (Math.sqrt(a1 ** 3 / MU_EARTH) + Math.sqrt(a2 ** 3 / MU_EARTH)) };
}

/** Turning a velocity v through Δi: 2 v sin(Δi/2). */
export const planeChangeDv = (v: number, di: number): number => 2 * v * Math.sin(Math.abs(di) / 2);

/** Changing speed from v1 to v2 and turning through Δi in one burn: the law of cosines. */
export const combinedDv = (v1: number, v2: number, di: number): number => Math.sqrt(v1 * v1 + v2 * v2 - 2 * v1 * v2 * Math.cos(di));

// ─── Edelbaum's low-thrust spiral ──────────────────────────────────────────

/**
 * Edelbaum's transfer between circular orbits under a small constant
 * acceleration, the thrust's yaw out of the plane held constant over each
 * revolution and switched at the antinodes (T. N. Edelbaum, "Propulsion
 * requirements for controllable satellites", ARS Journal 31, 1961; in the
 * form of Kéchichian, JGCD 20, 1997):
 * Δv = √(v₀² + v₁² − 2 v₀ v₁ cos(πΔi/2)), tan β₀ = sin(πΔi/2) / (v₀/v₁ − cos(πΔi/2)),
 * v(t) = √(v₀² − 2 v₀ f t cos β₀ + f² t²),
 * Δi(t) = (2/π)[atan((f t − v₀ cos β₀)/(v₀ sin β₀)) + π/2 − β₀].
 */
export function edelbaumDv(v0: number, v1: number, di: number): { dv: number; beta0: number } {
  const c = Math.cos((Math.PI / 2) * Math.abs(di)), s = Math.sin((Math.PI / 2) * Math.abs(di));
  return { dv: Math.sqrt(Math.max(0, v0 * v0 + v1 * v1 - 2 * v0 * v1 * c)), beta0: Math.atan2(s, v0 / v1 - c) };
}

/** The spiral's speed and inclination change `t` s in (0 ≤ t ≤ its duration). */
export function edelbaumAt(sp: Pick<SpiralPath, 'v0' | 'accel' | 'beta0' | 'coplanar'>, t: number): { v: number; di: number } {
  const { v0, accel: f, beta0 } = sp;
  const v = Math.sqrt(Math.max(0, v0 * v0 - 2 * v0 * f * t * Math.cos(beta0) + f * f * t * t));
  if (sp.coplanar) return { v, di: 0 };
  const di = (2 / Math.PI) * (Math.atan((f * t - v0 * Math.cos(beta0)) / (v0 * Math.sin(beta0))) + Math.PI / 2 - beta0);
  return { v, di };
}

/**
 * A low-thrust spiral from the (circular) start orbit to a circle at
 * `targetAlt`, inclination `targetI`, at a constant acceleration `accel`
 * (m/s²; an electric thruster gives 10⁻⁵ to 10⁻³). The node stays; the
 * satellite winds round circles of slowly changing radius and inclination.
 */
export function spiral(start: Orbit, t: number, targetAlt: number, targetI: number, accel: number, j2: boolean): Plan | PlanError {
  const bad = closedOrbit(start);
  if (bad) return bad;
  if (start.e > 0.01) return { error: 'notCircular' };
  if (!(targetAlt > 0) || !(accel > 0) || !(targetI >= 0 && targetI <= Math.PI)) return { error: 'badTarget' };
  const s0 = stateAt(start, t, j2);
  const r0 = norm(s0.r), r1 = R_EARTH + targetAlt;
  const v0 = Math.sqrt(MU_EARTH / r0), v1 = Math.sqrt(MU_EARTH / r1);
  const di = targetI - start.i;
  const coplanar = Math.abs(di) < 1e-9;
  const { dv, beta0 } = edelbaumDv(v0, v1, di);
  const duration = dv / accel;
  const sp: SpiralPath = {
    t0: t, duration, accel, v0, v1, beta0: coplanar ? (v0 > v1 ? 0 : Math.PI) : beta0,
    i0: start.i, iSign: Math.sign(di) || 1, coplanar, raan: s0.raan, times: [], u: [],
  };
  // the argument of latitude, integrated along: du/dt = v³/μ on a circle (Simpson's rule, a step a few minutes long at most)
  const steps = Math.min(200_000, Math.max(400, Math.ceil(duration / 120)));
  const h = duration / steps;
  const rate = (tt: number) => edelbaumAt(sp, tt).v ** 3 / MU_EARTH;
  let u = wrap2pi(s0.argp + s0.nu);
  sp.times.push(0); sp.u.push(u);
  for (let k = 0; k < steps; k++) {
    const a = k * h;
    u += (h / 6) * (rate(a) + 4 * rate(a + h / 2) + rate(a + h));
    sp.times.push(a + h); sp.u.push(u);
  }
  const end = spiralState(sp, t + duration, start, t + duration);
  const final = orbitFromState(end.r, end.v, start.jd0 + (t + duration) / 86400);
  return {
    kind: 'spiral', burns: [], segments: [{ t0: 0, orbit: start }, { t0: t + duration, orbit: final }],
    spiral: sp, totalDv: dv, arrival: t + duration, final,
  };
}

/** Where the satellite is `t` s after the start epoch while it spirals (`shownT` is the time reported). */
function spiralState(sp: SpiralPath, t: number, start: Pick<Orbit, 'jd0'>, shownT: number): OrbitState {
  const tt = Math.max(0, Math.min(sp.duration, t - sp.t0));
  const { v, di } = edelbaumAt(sp, tt);
  const r = MU_EARTH / (v * v), i = sp.i0 + sp.iSign * di;
  // the argument of latitude from the table
  const times = sp.times;
  let lo = 0, hi = times.length - 1;
  while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (times[mid] <= tt) lo = mid; else hi = mid; }
  const f = (tt - times[lo]) / (times[hi] - times[lo] || 1);
  const u = sp.u[lo] + (sp.u[hi] - sp.u[lo]) * f;
  const st = stateFromElements(r, 0, i, sp.raan, 0, u);
  const gm = gmst(start.jd0 + shownT / 86400);
  const rm = norm(st.r);
  const lon = Math.atan2(st.r.y, st.r.x) - gm;
  return {
    t: shownT, r: st.r, v: st.v, nu: wrap2pi(u), raan: sp.raan, argp: 0, theta: gm,
    lat: Math.asin(st.r.z / rm), lon: Math.atan2(Math.sin(lon), Math.cos(lon)), alt: rm - R_EARTH,
  };
}

// ─── Lambert's problem ──────────────────────────────────────────────────────

/** Stumpff's functions C(ψ) and S(ψ). */
function stumpff(psi: number): { c2: number; c3: number } {
  if (psi > 1e-6) {
    const sp = Math.sqrt(psi);
    return { c2: (1 - Math.cos(sp)) / psi, c3: (sp - Math.sin(sp)) / (sp * psi) };
  }
  if (psi < -1e-6) {
    const sp = Math.sqrt(-psi);
    return { c2: (1 - Math.cosh(sp)) / psi, c3: (Math.sinh(sp) - sp) / Math.sqrt(-psi * psi * psi) };
  }
  return { c2: 1 / 2 - psi / 24 + psi * psi / 720, c3: 1 / 6 - psi / 120 + psi * psi / 5040 };
}

/**
 * Lambert's problem by universal variables, solved by bisection on ψ
 * (Vallado, Algorithm 58): the orbit from r1 to r2 in `dt` seconds, less
 * than one revolution, the short way or the long way. Returns null where no
 * such orbit exists or the geometry is degenerate (r1 and r2 opposite).
 */
export function lambert(r1: Vec3, r2: Vec3, dt: number, longWay = false): { v1: Vec3; v2: Vec3 } | null {
  const r1m = norm(r1), r2m = norm(r2);
  const cosDnu = Math.max(-1, Math.min(1, dot(r1, r2) / (r1m * r2m)));
  const tm = longWay ? -1 : 1;
  const A = tm * Math.sqrt(r1m * r2m * (1 + cosDnu));
  if (Math.abs(A) < 1e-9 || !(dt > 0)) return null;
  const sqrtMu = Math.sqrt(MU_EARTH);
  let psiLow = -4 * Math.PI, psiUp = 4 * Math.PI * Math.PI, psi = 0;
  let { c2, c3 } = stumpff(psi);
  let y = 0;
  for (let k = 0; k < 300; k++) {
    y = r1m + r2m + A * (psi * c3 - 1) / Math.sqrt(c2);
    if (A > 0 && y < 0) {
      // too far down: move the lower bound up until y is positive
      psiLow = psi;
      psi = (psi + psiUp) / 2;
      ({ c2, c3 } = stumpff(psi));
      continue;
    }
    const chi = Math.sqrt(y / c2);
    const dtNow = (chi ** 3 * c3 + A * Math.sqrt(y)) / sqrtMu;
    if (Math.abs(dtNow - dt) < 1e-11 * dt) break;
    if (dtNow <= dt) psiLow = psi; else psiUp = psi;
    psi = (psiUp + psiLow) / 2;
    ({ c2, c3 } = stumpff(psi));
    if (psiUp - psiLow < 1e-14) return null;
  }
  if (!(y > 0)) return null;
  const f = 1 - y / r1m, gdot = 1 - y / r2m, g = A * Math.sqrt(y / MU_EARTH);
  return { v1: scale(sub(r2, scale(r1, f)), 1 / g), v2: scale(sub(scale(r2, gdot), r1), 1 / g) };
}

/**
 * Whether the transfer from r1 to r2 goes the long way round, for a transfer
 * turning the same way as angular momentum `h` (the chaser's): the short way
 * when r1 × r2 points along h.
 */
export const longWayFor = (r1: Vec3, r2: Vec3, h: Vec3): boolean => dot(cross(r1, r2), h) < 0;

/**
 * A two-burn rendezvous found by Lambert: leave the chaser's orbit at `dep`,
 * arrive on the target's at `dep + tof`, matching its velocity. Both orbits'
 * times are s after the chaser's epoch; the target's own epoch may differ.
 */
export function rendezvous(chaser: Orbit, target: Orbit, dep: number, tof: number, j2: boolean): Plan | PlanError {
  const tgtOffset = (chaser.jd0 - target.jd0) * 86400;
  const c = stateAt(chaser, dep, j2), tg = stateAt(target, dep + tof + tgtOffset, j2);
  const sol = lambert(c.r, tg.r, tof, longWayFor(c.r, tg.r, cross(c.r, c.v)));
  if (!sol) return { error: 'lambert' };
  const b = new Builder(chaser, j2);
  b.burn(dep, 'time', () => sub(sol.v1, c.v));
  // a transfer that passes a perigee inside the atmosphere on the way is no transfer
  if (dipsOnTheWay(b.orbit, tof)) return { error: 'hitsEarth' };
  b.burn(dep + tof, 'time', (s) => sub(tg.v, s.v));
  return b.plan('rendezvous');
}

/** The porkchop grid: total Δv (m/s, NaN where there is no transfer) for every departure × time of flight. */
export function porkchop(chaser: Orbit, target: Orbit, departures: readonly number[], tofs: readonly number[], j2: boolean): number[][] {
  const tgtOffset = (chaser.jd0 - target.jd0) * 86400;
  return departures.map((dep) => {
    const c = stateAt(chaser, dep, j2), h = cross(c.r, c.v);
    return tofs.map((tof) => {
      const tg = stateAt(target, dep + tof + tgtOffset, j2);
      const sol = lambert(c.r, tg.r, tof, longWayFor(c.r, tg.r, h));
      if (!sol) return NaN;
      if (dipsOnTheWay(orbitFromState(c.r, sol.v1, chaser.jd0), tof)) return NaN;
      return norm(sub(sol.v1, c.v)) + norm(sub(tg.v, sol.v2));
    });
  });
}

/** Whether the orbit comes down through its perigee, below the entry interface, within `dt` s of its epoch. */
function dipsOnTheWay(o: Orbit, dt: number): boolean {
  if (!(o.e < 1 && o.a > 0)) return false;
  if (o.a * (1 - o.e) >= R_EARTH + ENTRY_ALTITUDE) return false;
  return wrap2pi(-o.m0) <= Math.sqrt(MU_EARTH / o.a ** 3) * dt;
}
