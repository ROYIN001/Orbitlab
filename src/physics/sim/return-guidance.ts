/**
 * Flying a spent first stage back to where it should land.
 *
 * Shared by both flight models: the point-mass debris in `sim/debris.ts` and
 * the rigid returning body in `rigid/debris-runtime.ts` ask the same questions
 * here and act on the answers with their own actuators.
 *
 * - `predictDescent`: where the stage comes down if nothing but its own entry
 *   burn acts on it from now on — a point-mass integration of gravity, drag in
 *   the rotating atmosphere and the entry burn the stage is going to fly.
 * - `boostbackCommand`: which horizontal direction moves that point onto the
 *   target, and how much velocity it still takes. The miss is linear enough in
 *   the horizontal velocity to be solved with a two-by-two finite-difference
 *   Jacobian, re-evaluated every half second as the burn goes on.
 * - `divertAcceleration`: the horizontal acceleration of the landing burn that
 *   arrives over the target with no horizontal speed left (the zero-effort-miss
 *   / zero-effort-velocity law of Ebrahimi, Bahrami and Roshanian, 2008, with
 *   no gravity in the horizontal plane).
 *
 * The prediction stops at the landing surface and does not fly the landing
 * burn: the burn is short, starts a few kilometres up nearly straight down,
 * and its divert takes out what the ballistic point and the burn disagree on.
 */
import { MU_EARTH, OMEGA_EARTH, P0, R_EARTH } from '../constants';
import { type Vec3, v3, add, sub, scale, dot, cross, norm, normalize, addScaled } from '../vec3';
import { atmosphere } from '../atmosphere';
import { tumblingDragCoefficient } from '../aero';
import { gravity, gravityJ2 } from '../gravity';
import { enuFrame, groundPositionEci } from '../orbital';

/** A landing site fixed to the Earth. */
export interface ReturnTarget {
  /** a landing pad, a drone ship's deck, or a launch tower's catch arms */
  kind: 'pad' | 'droneShip' | 'tower';
  /** landing zone id, or 'droneShip' */
  id: string;
  /** rad */
  lat: number;
  lon: number;
  /** height of the landing surface above the mean sphere, m — for a tower, where the arms hold the booster's base */
  alt: number;
  /** radius of the landing surface, m (for a tower, the arms' catch envelope) */
  radius: number;
  /** a tower's catch point above the ground under it, m */
  catchHeight?: number;
}

/** What the returning stage is, as far as its descent is concerned. */
export interface DescentModel {
  /** blunt-body axial drag coefficient and its reference area, m² (the debris' own `cd`, `area`) */
  cd: number;
  area: number;
  /** J2 in the gravity field: the rigid body flies with it, the point-mass debris without */
  j2: boolean;
  /** the entry burn the stage will fly, if it has one */
  entry?: EntryBurnModel;
  /** the landing burn it will fly, if it has one: the prediction then ends where the burn stops it */
  landing?: LandingBurnModel;
}

export interface LandingBurnModel {
  /** one landing engine's thrust in vacuum and at sea level, N, and its flow, kg/s */
  thrustVac: number;
  thrustSL: number;
  mdot: number;
  /** how many of them there are */
  count: number;
  /** fraction of the burn's thrust the ignition is timed for */
  level: number;
  /** vertical speed the burn is flown down to, m/s */
  vTouch: number;
  /**
   * How the ignition is timed. `drag` (the point-mass stage): when the
   * drag-aware braking height at `level` is reached. `vacuum` (the rigid
   * stage, `rigid/debris-runtime.ts`): when a vacuum stop at full thrust, with
   * 15 % and 20 m to spare, is — and the burn then flies the constant
   * deceleration that leaves, which is what its throttle law does.
   */
  rule?: 'drag' | 'vacuum';
  /** engines the burn lights at a given mass (default `landingEngineCount`) */
  engines?: (mass: number) => number;
}

/**
 * Landing engines for a stage of mass `m`: as few as give a thrust-to-weight
 * of about three — a hoverslam is flown on as little thrust as will stop it.
 */
export function landingEngineCount(thrustSL: number, count: number, mass: number, g0 = 9.80665): number {
  return Math.max(1, Math.min(count, Math.ceil((3 * g0 * mass) / Math.max(1, thrustSL))));
}

export interface EntryBurnModel {
  /** thrust of the entry-burn engines in vacuum and at sea level, N */
  thrustVac: number;
  thrustSL: number;
  /** their propellant flow, kg/s */
  mdot: number;
  /** the burn ends at this airspeed, m/s */
  targetSpeed: number;
  /** propellant it may not touch (the landing burn's), kg */
  reserve: number;
}

/** The entry burn starts on the way down below this altitude… */
export const ENTRY_BURN_CEILING = 70e3;
/** …and never runs below this one. */
export const ENTRY_BURN_FLOOR = 25e3;

export interface DescentPrediction {
  /** ECI position where the descent meets the landing surface */
  r: Vec3;
  /** mission time it gets there, s */
  t: number;
  /** false when the integration ran out of time before landing */
  landed: boolean;
}

export interface DescentState {
  r: Vec3;
  v: Vec3;
  t: number;
  mass: number;
  propellant: number;
  /** where the stage is in its entry burn (`pending` when absent) */
  entry?: EntryState;
}

/**
 * The entry burn, step by step: `pending` until the stage is on its way down
 * below `ENTRY_BURN_CEILING`, then `armed`; it burns (`burning`) whenever the
 * airspeed is over the burn's target, and is `done` once it has burned the
 * speed down, reached `ENTRY_BURN_FLOOR` or the landing burn's propellant.
 *
 * Waiting `armed` is what a stage coming back from a boostback arc needs: it
 * crosses 70 km slower than its entry burn's target and only picks up speed
 * lower down. The downrange stage of the original model (`sim/debris.ts`'s
 * untargeted path) keeps its own rule, which ends the entry at the first
 * instant below the target.
 */
export type EntryState = 'pending' | 'armed' | 'burning' | 'done';

export function entryStep(state: EntryState, falling: boolean, alt: number, speed: number, fuel: number,
  burn: Pick<EntryBurnModel, 'targetSpeed' | 'reserve'>): { state: EntryState; burn: boolean } {
  if (state === 'done') return { state, burn: false };
  if (state === 'pending') {
    if (!(falling && alt < ENTRY_BURN_CEILING)) return { state, burn: false };
    state = 'armed';
  }
  if (alt <= ENTRY_BURN_FLOOR || fuel <= burn.reserve) return { state: 'done', burn: false };
  if (speed > burn.targetSpeed) return { state: 'burning', burn: true };
  return { state: state === 'burning' ? 'done' : 'armed', burn: false };
}

const OMEGA = v3(0, 0, OMEGA_EARTH);

/** Air-relative velocity with the Earth's atmosphere turning underneath. */
const airVelocity = (r: Vec3, v: Vec3): Vec3 => sub(v, cross(OMEGA, r));

/**
 * Where the stage comes down. Integrates with 1 s steps high up and 0.25 s
 * below 20 km, which is well inside the accuracy anything downstream of it
 * needs (a step of 0.5 s moves the point by a few metres).
 */
export function predictDescent(s: DescentState, model: DescentModel, surfaceAlt: number, maxTime = 1500): DescentPrediction {
  let r = s.r, v = s.v, t = s.t, mass = s.mass, fuel = s.propellant;
  let entry: EntryState = model.entry ? s.entry ?? 'pending' : 'done';
  const accel = (rr: Vec3, vv: Vec3, m: number, thrust: number): Vec3 => {
    let a = model.j2 ? gravityJ2(rr) : gravity(rr);
    const alt = norm(rr) - R_EARTH;
    const air = airVelocity(rr, vv), speed = norm(air);
    if (alt < 1000e3 && speed > 0.1) {
      const atm = atmosphere(alt);
      if (atm.rho > 0) {
        const drag = 0.5 * atm.rho * speed * speed * tumblingDragCoefficient(model.cd, speed / atm.a) * model.area;
        a = addScaled(a, air, -drag / (m * speed));
      }
      if (thrust > 0) a = addScaled(a, air, -thrust / (m * speed));
    }
    return a;
  };
  const end = s.t + maxTime;
  const lb = model.landing;
  let landingOn = false, landingEngines = 0, landingLevel = 0;
  while (t < end) {
    const alt = norm(r) - R_EARTH;
    let h = alt > 20e3 ? 1 : landingOn ? 0.1 : 0.25;
    const air = airVelocity(r, v), speed = norm(air);
    const falling = dot(air, r) < 0;
    // Step onto the entry burn's ceiling rather than across it: a burn that
    // starts up to a step late moves the landing point by a hundred metres,
    // and a prediction that jumps as the stage falls is no use to a Jacobian.
    if (entry === 'pending' && falling && alt > ENTRY_BURN_CEILING) {
      h = Math.min(h, Math.max(0.01, (alt - ENTRY_BURN_CEILING) / Math.max(1, -dot(air, normalize(r))) + 1e-3));
    }
    let thrust = 0, flow = 0;
    const e = model.entry;
    if (e && entry !== 'done') {
      const step = entryStep(entry, falling, alt, speed, fuel, e);
      entry = step.state;
      if (step.burn) {
        const p = Math.min(1, atmosphere(Math.max(0, alt)).p / P0);
        thrust = e.thrustVac - (e.thrustVac - e.thrustSL) * p;
        flow = e.mdot;
        // End the burn on its target speed, not up to a whole step past it.
        h = Math.min(h, Math.max(0.02, (speed - e.targetSpeed) / (thrust / mass)), Math.max(0.02, (fuel - e.reserve) / flow));
      }
    }
    if (lb && entry !== 'burning' && falling && fuel > 0) {
      const vDown = -dot(air, normalize(r));
      const height = alt - surfaceAlt;
      if (!landingOn && height < 20e3) {
        const n = lb.engines ? lb.engines(mass) : landingEngineCount(lb.thrustSL, lb.count, mass);
        const full = (y: number) => n * (lb.thrustVac - (lb.thrustVac - lb.thrustSL) * Math.min(1, atmosphere(Math.max(0, y)).p / P0));
        const g = MU_EARTH / (norm(r) ** 2);
        if (lb.rule === 'vacuum') {
          const stop = Math.max(0, (vDown * vDown - lb.vTouch ** 2) / (2 * Math.max(0.1, full(alt) / mass - g)));
          if (height < 1.15 * stop + 20) {
            landingOn = true;
            landingEngines = n;
            const decel = (vDown * vDown - lb.vTouch ** 2) / (2 * Math.max(1, height));
            landingLevel = Math.max(0, Math.min(1, (mass * (g + decel)) / Math.max(1, full(alt))));
          }
        } else {
          const thrustAt = (y: number) => lb.level * full(y);
          // Without drag the stop takes longest; only when even that is near
          // is the burn's real braking height worth integrating.
          const rough = (vDown * vDown) / (2 * Math.max(0.1, thrustAt(alt) / mass - g));
          if (height < 1.1 * rough + 10 && height < 1.1 * brakingHeight({ alt, surfaceAlt, vDown, vTouch: lb.vTouch, mass,
            thrust: thrustAt, flow: n * lb.level * lb.mdot, cd: model.cd, area: model.area, gravity: g }) + 10) {
            landingOn = true;
            landingEngines = n;
            landingLevel = lb.level;
          }
        }
      }
      if (landingOn) {
        if (vDown <= lb.vTouch) return { r, t, landed: true };
        const p = Math.min(1, atmosphere(Math.max(0, alt)).p / P0);
        thrust = landingEngines * landingLevel * (lb.thrustVac - (lb.thrustVac - lb.thrustSL) * p);
        flow = landingEngines * landingLevel * lb.mdot;
      }
    }
    // RK4 with the thrust and flow held over the step.
    const m0 = mass, m1 = Math.max(1, mass - flow * h / 2), m2 = Math.max(1, mass - flow * h);
    const k1v = accel(r, v, m0, thrust), k1r = v;
    const k2v = accel(addScaled(r, k1r, h / 2), addScaled(v, k1v, h / 2), m1, thrust), k2r = addScaled(v, k1v, h / 2);
    const k3v = accel(addScaled(r, k2r, h / 2), addScaled(v, k2v, h / 2), m1, thrust), k3r = addScaled(v, k2v, h / 2);
    const k4v = accel(addScaled(r, k3r, h), addScaled(v, k3v, h), m2, thrust), k4r = addScaled(v, k3v, h);
    const rNext = add(r, scale(add(add(k1r, scale(k2r, 2)), add(scale(k3r, 2), k4r)), h / 6));
    const vNext = add(v, scale(add(add(k1v, scale(k2v, 2)), add(scale(k3v, 2), k4v)), h / 6));
    const altNext = norm(rNext) - R_EARTH;
    if (altNext <= surfaceAlt) {
      // Linear in altitude across the last step.
      const f = alt > altNext ? Math.max(0, Math.min(1, (alt - surfaceAlt) / (alt - altNext))) : 1;
      return { r: add(r, scale(sub(rNext, r), f)), t: t + f * h, landed: true };
    }
    r = rNext; v = vNext; t += h;
    mass = m2; fuel = Math.max(0, fuel - flow * h);
  }
  return { r, t, landed: false };
}

/**
 * Velocity with which an unpowered stage falls through `altitude` on its way
 * down (air-relative, ECI), or undefined if it does not get there within
 * `maxTime`. What a stage that cannot turn during its coast must already be
 * pointing along when it gets there.
 */
export function airVelocityAtDescent(s: Pick<DescentState, 'r' | 'v' | 't' | 'mass'>, model: Pick<DescentModel, 'cd' | 'area' | 'j2'>,
  altitude: number, maxTime = 1500): Vec3 | undefined {
  const p = predictDescent({ ...s, propellant: 0, entry: 'done' }, { ...model }, altitude, maxTime);
  if (!p.landed) return undefined;
  // One more short step's worth of state is not needed: take the air
  // velocity from a finite difference of two predictions a moment apart.
  const q = predictDescent({ ...s, propellant: 0, entry: 'done' }, { ...model }, altitude - 50, maxTime);
  if (!q.landed || !(q.t > p.t)) return undefined;
  const v = scale(sub(q.r, p.r), 1 / (q.t - p.t));
  return sub(v, cross(OMEGA, p.r));
}

/** Where the target is, in ECI, at mission time `t`. */
export function targetPosition(target: ReturnTarget, gmst0: number, t: number): Vec3 {
  return groundPositionEci(target.lat, target.lon, target.alt, gmst0 + OMEGA_EARTH * t);
}

/**
 * The miss of a predicted landing point, as metres east and north of the
 * target in its own horizontal plane.
 */
export function missEastNorth(point: DescentPrediction, target: ReturnTarget, gmst0: number): { east: number; north: number } {
  const at = targetPosition(target, gmst0, point.t);
  const { east, north } = enuFrame(at);
  const d = sub(point.r, at);
  return { east: dot(d, east), north: dot(d, north) };
}

export interface BoostbackCommand {
  /** unit thrust direction, ECI (horizontal at the stage) */
  dir: Vec3;
  /** horizontal velocity the stage still needs, m/s (the burn ends when this is gone) */
  dvNeeded: number;
  /** predicted miss if the burn ended now, m */
  miss: number;
}

/** Velocity step of the finite-difference Jacobian, m/s. */
const JACOBIAN_STEP = 5;

/**
 * The horizontal velocity change that puts the predicted landing point on the
 * target: solve J·Δv = −miss with J the 2×2 sensitivity of the landing point
 * (east, north) to the stage's east and north velocity. Solving in the
 * horizontal plane only is deliberate: the full 2×3 minimum-norm answer uses
 * the vertical velocity too, and the cheapest way to shorten a flight is then
 * to thrust at the ground — locally right and globally a crash.
 */
export function boostbackCommand(s: DescentState, model: DescentModel, target: ReturnTarget, gmst0: number): BoostbackCommand {
  const base = predictDescent(s, model, target.alt);
  const m0 = missEastNorth(base, target, gmst0);
  const { east, north } = enuFrame(s.r);
  const column = (axis: Vec3) => {
    const p = predictDescent({ ...s, v: addScaled(s.v, axis, JACOBIAN_STEP) }, model, target.alt);
    const m = missEastNorth(p, target, gmst0);
    return { e: (m.east - m0.east) / JACOBIAN_STEP, n: (m.north - m0.north) / JACOBIAN_STEP };
  };
  const ce = column(east), cn = column(north);
  // [ce.e cn.e; ce.n cn.n] · [dvE; dvN] = −[m0.east; m0.north]
  const det = ce.e * cn.n - cn.e * ce.n;
  let dvE: number, dvN: number;
  if (Math.abs(det) > 1e-9) {
    dvE = (-m0.east * cn.n + m0.north * cn.e) / det;
    dvN = (-m0.north * ce.e + m0.east * ce.n) / det;
  } else {
    // Degenerate sensitivity (should not happen in flight): push straight at the miss.
    const scaleBack = -1 / Math.max(1, Math.hypot(ce.e, ce.n, cn.e, cn.n));
    dvE = m0.east * scaleBack; dvN = m0.north * scaleBack;
  }
  const dvNeeded = Math.hypot(dvE, dvN);
  const dir = dvNeeded > 1e-9 ? normalize(add(scale(east, dvE), scale(north, dvN))) : normalize(sub(v3(0, 0, 0), airVelocity(s.r, s.v)));
  return { dir, dvNeeded, miss: Math.hypot(m0.east, m0.north) };
}

/**
 * Horizontal acceleration of the landing burn, ECI, m/s²: zero-effort miss and
 * velocity with the time to go `tgo`, `a = 6·ZEM/t² − 2·ZEV/t`, which in the
 * horizontal plane is `6·Δr/t² − 4·v/t`. The caller bounds its size by the tilt
 * the burn can afford.
 */
export function divertAcceleration(r: Vec3, v: Vec3, target: ReturnTarget, gmst0: number, t: number, tgo: number): Vec3 {
  const at = targetPosition(target, gmst0, t);
  const up = normalize(r);
  const horizontal = (x: Vec3) => sub(x, scale(up, dot(x, up)));
  const dr = horizontal(sub(at, r));
  const vGround = horizontal(sub(v, cross(OMEGA, r)));
  const tg = Math.max(1, tgo);
  return add(scale(dr, 6 / (tg * tg)), scale(vGround, -4 / tg));
}

/**
 * Seconds of a landing burn flown upright at the end: the divert aims to be
 * over the target this long before touchdown and its lean fades out over the
 * same time, so the stage arrives vertical and not still sliding sideways —
 * which a tower's arms, catching at under 5° and 2 m/s, cannot take.
 */
export const UPRIGHT_S = 3;

/**
 * Shortest time-to-go the divert is solved over, s. The law's gains grow as
 * 1/t², and a divert asked to finish in a few seconds outruns the attitude
 * loop that has to lean the stage for it: a Super Heavy over the arms was
 * leaning 19° within three seconds, chasing its own overshoot. At 8 s the
 * horizontal loop closes at about 0.3 rad/s with a damping of 0.8, well
 * inside the attitude loop's bandwidth.
 */
export const DIVERT_MIN_TGO = 8;

/**
 * The landing burn's divert: the zero-effort-miss law aimed `UPRIGHT_S`
 * seconds early (over no less than `DIVERT_MIN_TGO`), held to `maxTilt` off
 * the vertical deceleration `aV`, and faded to nothing over the last
 * `UPRIGHT_S` seconds.
 */
export function landingDivert(r: Vec3, v: Vec3, target: ReturnTarget, gmst0: number, t: number,
  tgo: number, aV: number, maxTilt: number): Vec3 {
  const a = divertAcceleration(r, v, target, gmst0, t, Math.max(DIVERT_MIN_TGO, tgo - UPRIGHT_S));
  const fade = Math.max(0, Math.min(1, (tgo - 0.5) / (UPRIGHT_S - 0.5)));
  const cap = aV * Math.tan(maxTilt) * fade;
  const size = norm(a);
  return size > cap ? scale(a, cap / Math.max(1e-12, size)) : a;
}

/** Horizontal distance from the target, m. */
export function distanceFromTarget(r: Vec3, target: ReturnTarget, gmst0: number, t: number): number {
  const at = targetPosition(target, gmst0, t);
  const up = normalize(at);
  const d = sub(r, at);
  return norm(sub(d, scale(up, dot(d, up))));
}

/**
 * Height a falling stage needs to brake from `vDown` to `vTouch` at a steady
 * `thrust`, with the drag of the air it falls through, m. A one-dimensional
 * vertical integration with the density of each height on the way down: from
 * 15 km up the air takes most of the speed off by itself, and a stopping
 * distance without drag starts the landing burn tens of seconds early.
 */
export function brakingHeight(p: {
  alt: number; surfaceAlt: number; vDown: number; vTouch: number; mass: number;
  thrust: (alt: number) => number; flow: number; cd: number; area: number; gravity: number;
}): number {
  let y = p.alt, v = p.vDown, m = p.mass;
  const h = 0.05;
  for (let i = 0; i < 4000 && v > p.vTouch; i++) {
    const atm = atmosphere(Math.max(0, y));
    const drag = atm.rho > 0 ? 0.5 * atm.rho * v * v * tumblingDragCoefficient(p.cd, v / atm.a) * p.area : 0;
    const a = p.gravity - (p.thrust(y) + drag) / m;
    y -= v * h + 0.5 * a * h * h;
    v += a * h;
    m = Math.max(1, m - p.flow * h);
  }
  return p.alt - y;
}

/** Local gravity magnitude, m/s². */
export const localGravity = (r: Vec3): number => MU_EARTH / (norm(r) ** 2);
