/** Gravity-consistent coast forecasts for the 6DOF planner. These are advisory
 * states, never replacements for the integrated vehicle. Cowell propagation
 * integrates Cartesian r/v with the same central+J2 acceleration as the plant.
 * No thrust, drag or RCS translation is assumed during the forecast interval.
 * Cache at burn/replan boundaries: this is not a per-controller-tick function.
 * Osculating conic elements describe one instant, not a future J2 trajectory:
 * https://naif.jpl.nasa.gov/pub/naif/toolkit_docs/C/cspice/oscelt_c.html
 */
import { MU_EARTH, R_EARTH } from '../constants';
import { gravityJ2 } from '../gravity';
import { rk4Step, type PointState } from '../integrator';
import { dot, norm, normalize, scale, type Vec3 } from '../vec3';

export type ApsisKind = 'apoapsis' | 'periapsis';
export interface J2CoastOptions {
  /** Maximum RK4 step. Default 10 s; use finer steps for convergence checks. */
  stepS?: number;
}
export interface J2ApsisOptions extends J2CoastOptions {
  /** Finite search horizon. Default 1.5 osculating periods, capped at 2 days. */
  maxTimeS?: number;
  /** Normally skip an apsis at t=0 and find the next one. */
  includeInitial?: boolean;
  timeToleranceS?: number;
}
export interface J2Apsis extends PointState {
  kind: ApsisKind;
  timeS: number;
  radiusM: number;
  radialSpeedMS: number;
}

const MAX_DURATION = 172800;
const MAX_STEPS = 500000;
const finiteVector = (v: Vec3) => [v.x, v.y, v.z].every(Number.isFinite);
const copy = (state: PointState): PointState => ({ r: { ...state.r }, v: { ...state.v } });
const radialSpeed = (state: PointState) => dot(state.r, state.v) / norm(state.r);
const step = (state: PointState, dt: number) => rk4Step(0, state, dt, (_t, r) => gravityJ2(r));

function checkedStep(state: PointState, options: J2CoastOptions): number {
  if (!finiteVector(state.r) || !finiteVector(state.v) || !(norm(state.r) > R_EARTH)) throw new RangeError('Coast forecast requires a finite state above the surface');
  const dt = options.stepS ?? 10;
  if (!Number.isFinite(dt) || !(dt > 0) || dt > 60) throw new RangeError('Coast forecast step must be in (0, 60] seconds');
  return dt;
}

function checkedDuration(duration: number, dt: number): void {
  if (!Number.isFinite(duration) || duration < 0 || duration > MAX_DURATION || Math.ceil(duration / dt) > MAX_STEPS) {
    throw new RangeError('Coast forecast exceeds its finite duration/step budget');
  }
}

/** A null result means the ballistic path intersects the spherical surface. */
export function propagateJ2Coast(initial: PointState, durationS: number, options: J2CoastOptions = {}): PointState | null {
  const dt = checkedStep(initial, options);
  checkedDuration(durationS, dt);
  let state = copy(initial);
  for (let time = 0; time < durationS;) {
    const h = Math.min(dt, durationS - time);
    state = step(state, h);
    if (!(norm(state.r) > R_EARTH)) return null;
    time += h;
  }
  return state;
}

/** Locate a physical radius extremum using r·v/|r|, rather than a Kepler
 * anomaly. Refine the crossing by reintegrating from its bracketing state;
 * interpolation of osculating apsides would retain the original mismatch.
 * Returns null when no requested apsis occurs before impact/search horizon.
 */
export function nextJ2Apsis(initial: PointState, kind: ApsisKind, options: J2ApsisOptions = {}): J2Apsis | null {
  const dt = checkedStep(initial, options);
  const energy = dot(initial.v, initial.v) / 2 - MU_EARTH / norm(initial.r);
  const semimajor = energy < 0 ? -MU_EARTH / (2 * energy) : Infinity;
  const period = Number.isFinite(semimajor) ? 2 * Math.PI * Math.sqrt(semimajor ** 3 / MU_EARTH) : 28800;
  const duration = options.maxTimeS ?? Math.min(MAX_DURATION, 1.5 * period);
  checkedDuration(duration, dt);
  const tolerance = options.timeToleranceS ?? 1e-5;
  if (!Number.isFinite(tolerance) || !(tolerance > 0) || tolerance > dt) throw new RangeError('Invalid apsis root time tolerance');
  const sign = kind === 'apoapsis' ? 1 : -1;
  const result = (state: PointState, timeS: number): J2Apsis => ({ ...state, kind, timeS, radiusM: norm(state.r), radialSpeedMS: radialSpeed(state) });
  let state = copy(initial), radial = radialSpeed(state);
  const radialAcceleration = (dot(state.v, state.v) + dot(state.r, gravityJ2(state.r)) - radial ** 2) / norm(state.r);
  if (options.includeInitial && Math.abs(radial) < 1e-7 && sign * radialAcceleration < -1e-9) return result(state, 0);
  // A circular orbit with numerical radial noise must not create a fake apsis.
  let armed = sign * radial > 1e-7;
  for (let time = 0; time < duration;) {
    const h = Math.min(dt, duration - time), after = step(state, h);
    if (!(norm(after.r) > R_EARTH)) return null;
    const afterRadial = radialSpeed(after);
    if (armed && sign * radial > 0 && sign * afterRadial <= 0) {
      let low = 0, high = h;
      while (high - low > tolerance) {
        const mid = (low + high) / 2;
        if (sign * radialSpeed(step(state, mid)) > 0) low = mid;
        else high = mid;
      }
      const offset = (low + high) / 2;
      return result(step(state, offset), time + offset);
    }
    if (sign * afterRadial > 1e-7) armed = true;
    state = after; radial = afterRadial; time += h;
  }
  return null;
}

export interface PhysicalApsides {
  periapsisAlt: number;
  apoapsisAlt: number;
  /** from the initial state to the lowest and to the highest point, s */
  periapsisTimeS: number;
  apoapsisTimeS: number;
}

/**
 * The lowest and highest altitude of the next revolution under J2, m: the
 * apsides a six-DOF orbit is judged on. The osculating ellipse of one instant
 * swings several kilometres around them in low orbit — a 500 km circle reads
 * anywhere from 501 to 515 km of apoapsis round one revolution — so a mission
 * judged on it passes or fails by where on the orbit its last burn ended.
 * Sampled at the forecast step and refined to the apsis on either side of each
 * extreme sample. Null when the path is unbound, reaches the surface, or
 * takes longer than the forecast budget to go round.
 */
export function physicalApsides(initial: PointState, options: J2CoastOptions = {}): PhysicalApsides | null {
  const dt = checkedStep(initial, options);
  const energy = dot(initial.v, initial.v) / 2 - MU_EARTH / norm(initial.r);
  if (!(energy < 0)) return null;
  const period = 2 * Math.PI * Math.sqrt((-MU_EARTH / (2 * energy)) ** 3 / MU_EARTH);
  // A revolution longer than the forecast budget (Apollo 11's translunar
  // ellipse, ten days) is not sampled: the caller keeps the osculating
  // apsides, which J2 barely moves that far out.
  if (period > MAX_DURATION || Math.ceil(period / dt) > MAX_STEPS) return null;
  checkedDuration(period, dt);
  let state = copy(initial);
  // Each extreme sample keeps the state one step before it (the initial
  // state for the starting point itself) and when that was.
  let low = { radius: norm(state.r), before: state, beforeTime: 0, time: 0 }, high = low;
  for (let time = 0; time < period;) {
    const h = Math.min(dt, period - time), after = step(state, h), radius = norm(after.r);
    if (!(radius > R_EARTH)) return null;
    if (radius < low.radius) low = { radius, before: state, beforeTime: time, time: time + h };
    if (radius > high.radius) high = { radius, before: state, beforeTime: time, time: time + h };
    state = after; time += h;
  }
  const refined = (sample: typeof low, kind: ApsisKind) => {
    const found = nextJ2Apsis(sample.before, kind, { stepS: dt, maxTimeS: 2 * dt, includeInitial: true });
    const better = found && (kind === 'apoapsis' ? found.radiusM > sample.radius : found.radiusM < sample.radius);
    return better ? { radius: found.radiusM, time: sample.beforeTime + found.timeS } : sample;
  };
  const lowest = refined(low, 'periapsis'), highest = refined(high, 'apoapsis');
  return { periapsisAlt: lowest.radius - R_EARTH, apoapsisAlt: highest.radius - R_EARTH,
    periapsisTimeS: lowest.time, apoapsisTimeS: highest.time };
}

/** What a six-DOF correction aims at: the lowest, the highest, or the mean of the two altitudes of the next revolution. */
export type AltitudeMeasure = 'lowest' | 'highest' | 'mean';

/**
 * The speed along `direction` that puts one measure of the next revolution
 * under J2 at `targetAltM`. Every measure rises with the speed, so the scan
 * brackets the first crossing and bisects it. The mean of the lowest and
 * highest altitude is what a correction to a circular target aims at: a J2
 * orbit through the burn point rises and falls by kilometres whatever the
 * speed (Electron's 600 km sun-synchronous "circle" ran 599.6–616.5 km), so
 * its lowest point cannot be put AT the target from the top of that swing, but
 * its middle always can. Null when no crossing lies in the bracket.
 */
export function shootJ2Altitude(initial: PointState, direction: Vec3, measure: AltitudeMeasure, targetAltM: number,
  options: J2ShootingOptions): { velocity: Vec3; speedMS: number; altitudeM: number } | null {
  checkedStep(initial, options);
  if (!finiteVector(direction) || !(norm(direction) > 0) || !Number.isFinite(targetAltM)
    || !(options.minSpeedMS > 0) || !(options.maxSpeedMS > options.minSpeedMS)) throw new RangeError('Invalid altitude shooting bracket');
  const tolerance = options.radiusToleranceM ?? 0.5;
  const unit = normalize(direction);
  const evaluate = (speedMS: number) => {
    const velocity = scale(unit, speedMS), apsides = physicalApsides({ r: initial.r, v: velocity }, options);
    if (!apsides) return null;
    const altitudeM = measure === 'lowest' ? apsides.periapsisAlt : measure === 'highest' ? apsides.apoapsisAlt
      : (apsides.periapsisAlt + apsides.apoapsisAlt) / 2;
    return { velocity, speedMS, altitudeM, missM: altitudeM - targetAltM };
  };
  let left: ReturnType<typeof evaluate> = null, right: ReturnType<typeof evaluate> = null;
  for (let index = 0; index <= 8; index++) {
    const candidate = evaluate(options.minSpeedMS + (options.maxSpeedMS - options.minSpeedMS) * index / 8);
    if (candidate && Math.abs(candidate.missM) <= tolerance) return candidate;
    if (left && candidate && Math.sign(left.missM) !== Math.sign(candidate.missM)) { right = candidate; break; }
    left = candidate;
  }
  if (!left || !right) return null;
  for (let iteration = 0; iteration < 40; iteration++) {
    const mid = evaluate((left.speedMS + right.speedMS) / 2);
    if (!mid) return null;
    if (Math.abs(mid.missM) <= tolerance) return mid;
    if (Math.sign(mid.missM) === Math.sign(left.missM)) left = mid;
    else right = mid;
  }
  return null;
}

export interface J2ApsisShot {
  /** An advisory desired velocity, not an impulse applied to vehicle state. */
  velocity: Vec3;
  speedMS: number;
  apsis: J2Apsis;
  missM: number;
}
export interface J2ShootingOptions extends J2ApsisOptions {
  minSpeedMS: number;
  maxSpeedMS: number;
  radiusToleranceM?: number;
}

/** Bounded scalar shooting along a caller-supplied inertial direction. Searches
 * for a bracket on the first requested physical apsis, then bisects it. Null
 * means no feasible continuous bracket/converged solution was found; callers
 * must replan or report that limitation, never apply a fabricated velocity.
 * The direction can already include a planned plane change. Finite-duration
 * engine performance and attitude feasibility remain the caller's problem.
 */
export function shootJ2ApsisVelocity(initial: PointState, direction: Vec3, targetRadiusM: number,
  kind: ApsisKind, options: J2ShootingOptions): J2ApsisShot | null {
  checkedStep(initial, options);
  if (!finiteVector(direction) || !(norm(direction) > 0) || !Number.isFinite(targetRadiusM) || !(targetRadiusM > R_EARTH)
    || !Number.isFinite(options.minSpeedMS) || !Number.isFinite(options.maxSpeedMS)
    || !(options.minSpeedMS > 0) || !(options.maxSpeedMS > options.minSpeedMS)) throw new RangeError('Invalid apsis shooting bracket');
  const tolerance = options.radiusToleranceM ?? 0.5;
  if (!Number.isFinite(tolerance) || !(tolerance > 0)) throw new RangeError('Invalid apsis shooting radius tolerance');
  const unit = normalize(direction);
  const evaluate = (speedMS: number): J2ApsisShot | null => {
    const velocity = scale(unit, speedMS);
    const apsis = nextJ2Apsis({ r: initial.r, v: velocity }, kind, { ...options, includeInitial: false });
    return apsis ? { velocity, speedMS, apsis, missM: apsis.radiusM - targetRadiusM } : null;
  };
  let left: J2ApsisShot | null = null, right: J2ApsisShot | null = null;
  // Invalid/impact samples break continuity; never bracket across them.
  for (let index = 0; index <= 8; index++) {
    const candidate = evaluate(options.minSpeedMS + (options.maxSpeedMS - options.minSpeedMS) * index / 8);
    if (candidate && Math.abs(candidate.missM) <= tolerance) return candidate;
    if (left && candidate && Math.sign(left.missM) !== Math.sign(candidate.missM)) { right = candidate; break; }
    left = candidate;
  }
  if (!left || !right) return null;
  for (let iteration = 0; iteration < 40; iteration++) {
    const mid = evaluate((left.speedMS + right.speedMS) / 2);
    if (!mid) return null;
    if (Math.abs(mid.missM) <= tolerance) return mid;
    if (Math.sign(mid.missM) === Math.sign(left.missM)) left = mid;
    else right = mid;
  }
  return null;
}
