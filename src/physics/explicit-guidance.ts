/**
 * Explicit ascent guidance (roadmap G01): the Space Shuttle's Powered Explicit
 * Guidance and the Saturn V's Iterative Guidance Mode, for the stages that fly
 * out of the atmosphere into the insertion orbit.
 *
 * Both steer by the linear tangent law, the thrust direction
 *
 *   i_F(t) = unit(λ + λ̇·(t − t_λ)),
 *
 * whose small rotation leaves the velocity gained along λ (with t_λ = J/L) and
 * spends it on the position: λ̇ is what the terminal altitude and plane still
 * need. Both know the stages left — each stage's acceleration, exhaust velocity
 * and burn time, the acceleration ceiling, the staging gaps — through the thrust
 * integrals
 *
 *   L = ∫a dt,  J = ∫t·a dt,  S = ∫∫a,  Q = ∫∫t·a
 *
 * (Jaggers, *An Explicit Solution to the Exoatmospheric Powered Flight Guidance
 * and Trajectory Optimization Problem for Rocket Propelled Vehicles*, AIAA
 * 77-1051, 1977; Chandler & Smith, *Development of the Iterative Guidance Mode
 * with its Application to Various Vehicles and Missions*, J. Spacecraft 4,
 * 1967). They differ in how they know where they are going:
 *
 * - **PEG** carries the velocity to be gained v_go between cycles and corrects
 *   it with a prediction of the cut-off state — here integrated numerically,
 *   J2 gravity and the thrust law together — so its target is met in the
 *   gravity field the flight flies in (the predictor–corrector of the
 *   Shuttle's Unified Powered Flight Guidance).
 * - **IGM** solves in closed form in a terminal frame at the predicted cut-off
 *   point, with gravity taken as the mean of its value now and at the target,
 *   and the central angle to go estimated from the mean speed; in its last
 *   seconds it steers on the velocity alone (the Saturn's "χ̃ mode").
 *
 * The target is the insertion orbit's perigee: its radius, the perigee speed of
 * the insertion ellipse, a flight-path angle of zero, in the plane of the
 * mission's inclination through the vehicle's position. The cut-off itself is
 * still the ascent's (src/physics/sim/ascent.ts).
 */
import { MU_EARTH, R_EARTH } from './constants';
import { gravityJ2 } from './gravity';
import { add, cross, dot, norm, normalize, rotateAxis, scale, sub, v3, type Vec3 } from './vec3';
import { elementsFromState } from './orbital';
import { engineMassFlow, type VehicleModel } from './vehicle';

export type ExplicitLaw = 'peg' | 'igm';
/** A stretch of the burn ahead: constant thrust (the acceleration growing as the mass falls), constant acceleration (throttled at the ceiling), or a coast. */
export interface BurnSegment { kind: 'thrust' | 'accel' | 'coast'; a0: number; ve: number; tb: number; /** the stage it burns */ stage?: number }
export interface ThrustIntegrals { L: number; J: number; S: number; Q: number }

/** Seconds of t_go under which the laws stop re-solving and fly their last solution (PEG) or the velocity alone (IGM). */
export const PEG_TERMINAL_S = 8;
export const IGM_CHI_TILDE_S = 20;
export const IGM_TERMINAL_S = 3;
/** Seconds between two of the law's events about handing back and taking over. */
const EVENT_QUIET_S = 20;
/** Out of the atmosphere: the dynamic pressure, Pa, and the altitude, m, under and over which the laws may take over from the first stage. */
export const ENGAGE_Q_PA = 100;
export const ENGAGE_ALTITUDE_M = 70e3;
/** A PEG/IGM flight releases the ascent load relief (between 500 and 100 Pa) at this rate, rad/s — under the stack's own 5 °/s. */
export const LOAD_RELIEF_RELEASE_RATE = 4 * Math.PI / 180;
/** The largest steering the position constraint may add to the velocity's direction, rad. */
const MAX_TURN = 0.8;

// ------------------------------------------------------------------ the stages left
/**
 * The burn ahead, walking the stages still to fly as `VehicleModel.burnTimeFor`
 * does (the weak final stage left out when the ascent does not fly it): each
 * stage at vacuum thrust from its mass at ignition, capped at `maxAccel`, with
 * its staging gap. Null while strap-ons still burn: the laws take over after them.
 */
export function burnProfile(vehicle: VehicleModel, opts: { excludeWeakFinal: boolean; maxAccel: number }): BurnSegment[] | null {
  const act = vehicle.active;
  if (!act) return null;
  if (act.boosters.some((b) => b.attached && b.ignited && !b.burnedOut)) return null;
  let mass = vehicle.totalMass();
  let fairing = vehicle.fairingAttached && vehicle.spec.fairing ? vehicle.spec.fairing.mass : 0;
  if (fairing > 0 && act.index > 0) { mass -= fairing; fairing = 0; }
  const out: BurnSegment[] = [];
  const stages = vehicle.stages.filter((s) => s.attached && s.index >= act.index && !s.spec.isSpacecraft
    && !(opts.excludeWeakFinal && s.index === vehicle.lastLauncherIndex && s.index !== act.index));
  for (const st of stages) {
    // The gap before a stage lights.
    if (st !== act) out.push({ kind: 'coast', a0: 0, ve: 0, tb: (st.spec.sepDelay ?? 1) + (st.spec.ignitionDelay ?? 1) });
    else if (!st.ignited) out.push({ kind: 'coast', a0: 0, ve: 0, tb: st.spec.ignitionDelay ?? 1 });
    const e = st.spec.engine, flow = e.count * st.engineFraction * engineMassFlow(e), thrust = e.count * st.engineFraction * e.thrustVac;
    const prop = vehicle.usablePropellant(st);
    if (flow > 0 && prop > 0 && mass > prop) {
      const ve = thrust / flow, a0 = thrust / mass, tb = prop / flow;
      const cap = opts.maxAccel > 0 ? opts.maxAccel : Infinity;
      if (a0 >= cap) {
        out.push({ kind: 'accel', a0: cap, ve, tb: ve / cap * Math.log(mass / (mass - prop)), stage: st.index });
      } else {
        const tCap = cap < Infinity ? (ve / a0) * (1 - a0 / cap) : Infinity;
        if (tCap < tb) {
          out.push({ kind: 'thrust', a0, ve, tb: tCap, stage: st.index });
          const m = mass - flow * tCap, p = prop - flow * tCap;
          out.push({ kind: 'accel', a0: cap, ve, tb: ve / cap * Math.log(m / (m - p)), stage: st.index });
        } else out.push({ kind: 'thrust', a0, ve, tb, stage: st.index });
      }
    }
    mass -= prop + st.spec.dryMass + (st.propellant - prop);
    for (const b of st.boosters) if (b.attached) mass -= (b.spec.dryMass + b.propellant) * b.spec.count;
    if (fairing > 0) { mass -= fairing; fairing = 0; }
  }
  return out;
}

/** The velocity the profile can still give, m/s. */
export function profileDeltaV(profile: readonly BurnSegment[]): number {
  return profile.reduce((sum, s) => sum + segment(s, s.tb).L, 0);
}

/** One segment's integrals over its first T seconds (local time). */
function segment(s: BurnSegment, T: number): { L: number; J: number; H: number } {
  if (s.kind === 'coast' || T <= 0) return { L: 0, J: 0, H: 0 };
  if (s.kind === 'accel') return { L: s.a0 * T, J: s.a0 * T * T / 2, H: s.a0 * T * T * T / 3 };
  const tau = s.ve / s.a0, L = -s.ve * Math.log(Math.max(1e-12, 1 - T / tau));
  const J = tau * L - s.ve * T;
  return { L, J, H: tau * J - s.ve * T * T / 2 };
}

/** L, J, S, Q over [0, T] of the profile (S = T·L − J and Q = T·J − H, H = ∫t²·a). */
export function thrustIntegrals(profile: readonly BurnSegment[], T: number): ThrustIntegrals {
  let L = 0, J = 0, H = 0, t0 = 0;
  for (const s of profile) {
    if (t0 >= T) break;
    const dt = Math.min(s.tb, T - t0), g = segment(s, dt);
    H += g.H + 2 * t0 * g.J + t0 * t0 * g.L;
    J += g.J + t0 * g.L;
    L += g.L;
    t0 += s.tb;
  }
  return { L, J, S: T * L - J, Q: T * J - H };
}

/** How long the profile takes to give `dv` of velocity, s; `short` with its deficit when it cannot. */
export function timeToGain(profile: readonly BurnSegment[], dv: number): { t: number; short: boolean; deficit: number } {
  let t = 0, got = 0;
  for (const s of profile) {
    if (s.kind === 'coast') { t += s.tb; continue; }
    const full = segment(s, s.tb).L;
    if (got + full >= dv) {
      const need = dv - got;
      return { t: t + (s.kind === 'accel' ? need / s.a0 : (s.ve / s.a0) * (1 - Math.exp(-need / s.ve))), short: false, deficit: 0 };
    }
    got += full; t += s.tb;
  }
  return { t, short: true, deficit: dv - got };
}

/** The thrust acceleration t seconds ahead, m/s². */
export function accelAt(profile: readonly BurnSegment[], t: number): number {
  let t0 = 0;
  for (const s of profile) {
    if (t < t0 + s.tb) {
      if (s.kind === 'coast') return 0;
      return s.kind === 'accel' ? s.a0 : s.a0 / (1 - (t - t0) / (s.ve / s.a0));
    }
    t0 += s.tb;
  }
  return 0;
}

// ------------------------------------------------------------------ the target
export interface InsertionTarget {
  /** radius and speed at cut-off, m and m/s; flight-path angle, rad */
  radius: number;
  speed: number;
  gamma: number;
  inclination: number;
}
/** The insertion orbit's perigee as the target: its radius, the ellipse's perigee speed, level. */
export function insertionTarget(insertionAltitude: number, insertionApoapsis: number, inclination: number): InsertionTarget {
  const rp = R_EARTH + insertionAltitude, ra = R_EARTH + Math.max(insertionApoapsis, insertionAltitude);
  return { radius: rp, speed: Math.sqrt(MU_EARTH * (2 / rp - 2 / (rp + ra))), gamma: 0, inclination };
}
const desiredVelocity = (target: InsertionTarget, rHat: Vec3, iy: Vec3): Vec3 =>
  scale(add(scale(rHat, Math.sin(target.gamma)), scale(normalize(cross(iy, rHat)), Math.cos(target.gamma))), target.speed);
const inPlane = (v: Vec3, iy: Vec3): Vec3 => normalize(sub(v, scale(iy, dot(v, iy))));

// ------------------------------------------------------------------ one solution
export interface LawInput { t: number; r: Vec3; v: Vec3; profile: readonly BurnSegment[]; target: InsertionTarget; iy: Vec3 }
export interface LawSolution {
  ok: boolean;
  reason?: 'short' | 'diverged';
  tGo: number;
  vGo: number;
  /** the cut-off state it predicts */
  rPredicted?: Vec3;
  vPredicted?: Vec3;
  /** |v_d − v_p| of the last correction (PEG), m/s */
  miss?: number;
  iterations: number;
  terminal: boolean;
  /** the steering law from this solution's time on */
  steer: (t: number) => Vec3;
}

/** The linear tangent law of one solution: λ, λ̇ and t_λ, from `t0`. */
function tangentLaw(t0: number, lambda: Vec3, lambdaDot: Vec3, tLambda: number): (t: number) => Vec3 {
  return (t: number) => normalize(add(lambda, scale(lambdaDot, t - t0 - tLambda)));
}

/** λ̇ from the position still to gain across λ, bounded so the law never turns more than MAX_TURN away from λ. */
function turnRate(rGo: Vec3, lambda: Vec3, I: ThrustIntegrals, tLambda: number, tGo: number): Vec3 {
  // Negative: thrust spent early moves the cut-off point further than thrust spent late.
  const denominator = I.Q - I.S * tLambda;
  if (!(Math.abs(denominator) > 1e-6)) return v3();
  let rate = scale(sub(rGo, scale(lambda, I.S)), 1 / denominator);
  rate = sub(rate, scale(lambda, dot(rate, lambda)));
  const reach = Math.max(tLambda, tGo - tLambda), size = norm(rate) * reach;
  return size > MAX_TURN ? scale(rate, MAX_TURN / size) : rate;
}

/**
 * The flight from (r, v) over tGo on the law: J2 gravity and the thrust, RK4 in
 * steps of at most 2 s that break at every staging boundary; with the thrust's
 * own double integral, for PEG's gravity displacement.
 */
export function predictCutoff(r: Vec3, v: Vec3, tGo: number, profile: readonly BurnSegment[], steer: (t: number) => Vec3): { r: Vec3; v: Vec3; rThrust: Vec3 } {
  const edges: number[] = [0];
  let t0 = 0;
  for (const s of profile) { t0 += s.tb; if (t0 < tGo) edges.push(t0); }
  edges.push(tGo);
  let rr = r, vv = v, rt = v3(), vt = v3();
  const thrust = (t: number) => scale(steer(t), accelAt(profile, Math.min(t, tGo - 1e-9)));
  for (let k = 0; k + 1 < edges.length; k++) {
    const span = edges[k + 1] - edges[k];
    if (span <= 0) continue;
    const n = Math.max(1, Math.ceil(span / 2)), h = span / n;
    for (let i = 0; i < n; i++) {
      // Inside a segment the thrust is smooth: sample it just inside the edges.
      const ta = edges[k] + i * h + 1e-9, tm = ta + h / 2, tb = Math.min(ta + h, edges[k + 1]) - 1e-9;
      const f1 = thrust(ta), f2 = thrust(tm), f4 = thrust(tb);
      const a1 = add(gravityJ2(rr), f1);
      const r2 = add(rr, scale(vv, h / 2)), v2 = add(vv, scale(a1, h / 2));
      const a2 = add(gravityJ2(r2), f2);
      const r3 = add(rr, scale(v2, h / 2)), v3_ = add(vv, scale(a2, h / 2));
      const a3 = add(gravityJ2(r3), f2);
      const r4 = add(rr, scale(v3_, h)), v4 = add(vv, scale(a3, h));
      const a4 = add(gravityJ2(r4), f4);
      rr = add(rr, scale(add(add(vv, scale(add(v2, v3_), 2)), v4), h / 6));
      vv = add(vv, scale(add(add(a1, scale(add(a2, a3), 2)), a4), h / 6));
      // The thrust alone, twice integrated (Simpson on each step).
      const dvt = scale(add(add(f1, scale(f2, 4)), f4), h / 6);
      rt = add(rt, add(scale(vt, h), scale(add(f1, scale(f2, 2)), h * h / 6)));
      vt = add(vt, dvt);
    }
  }
  return { r: rr, v: vv, rThrust: rt };
}

/**
 * Powered Explicit Guidance: a predictor–corrector on the velocity to be gained.
 * `vGo` and the gravity displacement carry from one cycle to the next.
 */
export class Peg {
  private vGo?: Vec3;
  private rGrav = v3();
  /** The desired cut-off position's direction, from the last prediction. */
  private rdHat?: Vec3;
  private last?: { t: number; v: Vec3 };
  private solution?: LawSolution;

  solve(input: LawInput, iterations: number): LawSolution {
    const { r, v, t, profile, target, iy } = input;
    if (this.solution?.terminal && this.last) return this.solution;
    if (!this.vGo) {
      this.vGo = sub(desiredVelocity(target, inPlane(r, iy), iy), v);
      this.rdHat = undefined;
      this.rGrav = scale(gravityJ2(r), 0.5 * (norm(this.vGo) / Math.max(1, profile.find((s) => s.kind !== 'coast')?.a0 ?? 10)) ** 2);
    } else if (this.last) {
      // What the engines gave since the last cycle: the velocity change less the gravity's.
      const dt = t - this.last.t;
      const gained = sub(sub(v, this.last.v), scale(add(gravityJ2(r), gravityJ2(sub(r, scale(v, dt)))), dt / 2));
      this.vGo = sub(this.vGo, gained);
    }
    this.last = { t, v };
    let result: LawSolution | undefined;
    for (let k = 0; k < iterations; k++) {
      const vGo = this.vGo!, L = norm(vGo);
      const time = timeToGain(profile, L);
      if (time.short) { result = { ok: false, reason: 'short', tGo: time.t, vGo: L, iterations: k + 1, terminal: false, steer: () => normalize(vGo) }; break; }
      const tGo = time.t, I = thrustIntegrals(profile, tGo), lambda = normalize(vGo), tLambda = I.J / I.L;
      // The position still to gain by thrust; free along the downrange axis. The cut-off point is
      // where the last prediction put it; at first, the central angle at the present speed ahead.
      const here = inPlane(r, iy);
      const rd = scale(this.rdHat ?? rotateAxis(here, iy, dot(v, normalize(cross(iy, here))) * tGo / norm(r)), target.radius);
      let rGo = sub(rd, add(add(r, scale(v, tGo)), this.rGrav));
      const iz = normalize(cross(rd, iy));
      const along = dot(lambda, iz);
      if (Math.abs(along) > 1e-3) {
        const rGoXY = sub(rGo, scale(iz, dot(iz, rGo)));
        rGo = add(rGoXY, scale(iz, (I.S - dot(lambda, rGoXY)) / along));
      }
      const lambdaDot = turnRate(rGo, lambda, I, tLambda, tGo);
      const steer = tangentLaw(t, lambda, lambdaDot, tLambda);
      const p = predictCutoff(r, v, tGo, profile, (s) => steer(t + s));
      this.rGrav = sub(sub(sub(p.r, r), scale(v, tGo)), p.rThrust);
      const rdHat = inPlane(p.r, iy), vd = desiredVelocity(target, rdHat, iy), miss = sub(vd, p.v);
      this.rdHat = rdHat;
      this.vGo = add(vGo, miss);
      const missSize = norm(miss);
      if (![missSize, tGo, this.vGo.x, this.vGo.y, this.vGo.z].every(Number.isFinite)) {
        this.vGo = undefined;
        this.rdHat = undefined;
        result = { ok: false, reason: 'diverged', tGo, vGo: L, iterations: k + 1, terminal: false, steer };
        break;
      }
      result = { ok: true, tGo, vGo: L, rPredicted: p.r, vPredicted: p.v, miss: missSize, iterations: k + 1, terminal: tGo < PEG_TERMINAL_S, steer };
      if (missSize < Math.max(0.2, 1e-3 * L)) break;
    }
    // A solution still far from its own prediction after its iterations has not converged.
    if (result?.ok && (result.miss ?? 0) > Math.max(50, 0.1 * result.vGo)) result = { ...result, ok: false, reason: 'diverged' };
    this.solution = result;
    return result!;
  }
}

/**
 * The Iterative Guidance Mode: a closed-form solution in the terminal frame at
 * the predicted cut-off point, with the mean of today's and the target's gravity.
 */
export class Igm {
  private tGo = 0;
  private solution?: LawSolution;

  solve(input: LawInput): LawSolution {
    const { r, v, t, profile, target, iy } = input;
    if (this.solution?.terminal) return this.solution;
    const rm = norm(r), rHat = inPlane(r, iy);
    const vh = dot(v, normalize(cross(iy, rHat)));
    let tGo = this.tGo, eR = rHat, gAvg = v3(), dV = v3(), short = false, deficit = 0;
    for (let k = 0; k < 4; k++) {
      // The central angle to go at the mean horizontal speed and radius; the terminal frame there.
      const phi = tGo > 0 ? ((vh + target.speed * Math.cos(target.gamma)) / 2 * tGo) / ((rm + target.radius) / 2) : 0;
      eR = rotateAxis(rHat, iy, phi);
      gAvg = scale(add(scale(r, 1 / (rm * rm * rm)), scale(eR, 1 / (target.radius * target.radius))), -MU_EARTH / 2);
      const vT = desiredVelocity(target, eR, iy);
      dV = sub(sub(vT, v), scale(gAvg, tGo));
      const time = timeToGain(profile, norm(dV));
      short = time.short; deficit = time.deficit;
      tGo = time.t;
    }
    this.tGo = tGo;
    const u0 = normalize(dV), L = norm(dV);
    if (short) {
      this.solution = { ok: false, reason: 'short', tGo, vGo: L + deficit, iterations: 4, terminal: false, steer: () => u0 };
      return this.solution;
    }
    const I = thrustIntegrals(profile, tGo), tLambda = I.J / I.L;
    const rPred = add(add(add(r, scale(v, tGo)), scale(gAvg, tGo * tGo / 2)), scale(u0, I.S));
    // χ̃ mode near the end: the velocity alone.
    let lambdaDot = v3();
    if (tGo > IGM_CHI_TILDE_S) {
      // The terminal altitude and the plane, by the linear tangent terms (K1…K4 as one turn rate).
      const rGo = add(scale(eR, target.radius - dot(rPred, eR)), scale(iy, -dot(rPred, iy)));
      lambdaDot = turnRate(add(rGo, scale(u0, I.S)), u0, I, tLambda, tGo);
    }
    const steer = tangentLaw(t, u0, lambdaDot, tLambda);
    const rCut = add(rPred, scale(lambdaDot, I.Q - I.S * tLambda));
    const vCut = add(add(v, scale(gAvg, tGo)), scale(u0, L));
    const finite = [tGo, L, rCut.x, vCut.x].every(Number.isFinite);
    this.solution = finite
      ? { ok: true, tGo, vGo: L, rPredicted: rCut, vPredicted: vCut, iterations: 4, terminal: tGo < IGM_TERMINAL_S, steer }
      : { ok: false, reason: 'diverged', tGo, vGo: L, iterations: 4, terminal: false, steer };
    return this.solution;
  }
}

// ------------------------------------------------------------------ in flight
export type ExplicitStatus = 'standby' | 'engaged' | 'terminal' | 'short' | 'diverged';
/** What the telemetry carries of the explicit guidance. */
export interface ExplicitGuidanceRecord {
  law: ExplicitLaw;
  status: ExplicitStatus;
  /** time and velocity to go, s and m/s */
  tGo?: number;
  vGo?: number;
  /** the orbit it predicts at cut-off, and the target, m (altitudes) */
  predictedApoapsis?: number;
  predictedPeriapsis?: number;
  targetApoapsis: number;
  targetPeriapsis: number;
  /** PEG's last correction, m/s */
  miss?: number;
  /** the explicit law's pitch and yaw out of the target plane, and the standard law's pitch, deg */
  pitchDeg?: number;
  yawDeg?: number;
  standardPitchDeg: number;
  /** the stages the solution burns through */
  stages: number;
}

export interface ExplicitGuidanceOptions { law: ExplicitLaw; cycleS: number }
export interface ExplicitEvent { key: string; params: Record<string, string | number> }

/**
 * The explicit law in flight: when it takes over, its guidance cycle, the
 * steering between cycles, and handing back to the standard law when the stages
 * left cannot reach the target (or it diverges) — and taking over again when
 * they can.
 */
export class ExplicitGuidance {
  private readonly peg = new Peg();
  private readonly igm = new Igm();
  private solution?: LawSolution;
  private nextCycle = -Infinity;
  private status: ExplicitStatus = 'standby';
  private stages = 0;
  private blend?: { from: (t: number) => Vec3; t0: number };
  private lastEventT = -Infinity;
  private readonly events: ExplicitEvent[] = [];
  record?: ExplicitGuidanceRecord;

  constructor(readonly options: ExplicitGuidanceOptions, private readonly target: InsertionTarget, private readonly insertion: { periapsis: number; apoapsis: number }) {}

  get engaged(): boolean { return this.status === 'engaged' || this.status === 'terminal'; }
  takeEvents(): ExplicitEvent[] { return this.events.splice(0); }

  /**
   * The explicit direction this step, or undefined for the standard law's. `ready` says whether
   * it may take over (the first stage out of the atmosphere, or a later stage lit).
   */
  update(input: { t: number; r: Vec3; v: Vec3; ready: boolean; profile: () => BurnSegment[] | null; iy: Vec3; standardDir: Vec3 }): Vec3 | undefined {
    const up = normalize(input.r), standardPitch = Math.asin(Math.max(-1, Math.min(1, dot(input.standardDir, up)))) * 180 / Math.PI;
    if (this.status === 'standby' && !input.ready) {
      this.record = { law: this.options.law, status: 'standby', targetApoapsis: this.insertion.apoapsis, targetPeriapsis: this.insertion.periapsis, standardPitchDeg: standardPitch, stages: 0 };
      return undefined;
    }
    const terminal = this.solution?.ok && this.solution.terminal;
    if (input.t + 1e-9 >= this.nextCycle && !terminal) {
      const profile = input.profile();
      if (profile) {
        this.stages = new Set(profile.filter((s) => s.kind !== 'coast').map((s, i) => s.stage ?? i)).size;
        const lawInput = { t: input.t, r: input.r, v: input.v, profile, target: this.target, iy: input.iy };
        const first = this.status === 'standby';
        // The last solution's law, blended into the new one over the cycle: a fresh solution never
        // steps the command (at a cycle's rate, steps of a few hundredths of a degree kept the
        // attitude thrusters firing the whole burn).
        this.blend = this.engaged && this.solution?.ok ? { from: this.solution.steer, t0: input.t } : undefined;
        this.solution = this.options.law === 'peg' ? this.peg.solve(lawInput, first ? 12 : 3) : this.igm.solve(lawInput);
        const next: ExplicitStatus = this.solution.ok ? (this.solution.terminal ? 'terminal' : 'engaged') : this.solution.reason!;
        const law = this.options.law.toUpperCase();
        // A law that hands back and takes over again on successive cycles says so once in a while, not every cycle.
        const quiet = input.t - this.lastEventT < EVENT_QUIET_S;
        if ((next === 'engaged' || next === 'terminal') && !this.engaged && (first || !quiet)) {
          this.events.push({ key: first ? 'evt.guidanceEngaged' : 'evt.guidanceResumed', params: { law, tGo: Math.round(this.solution.tGo), vGo: Math.round(this.solution.vGo) } });
          this.lastEventT = input.t;
        } else if ((next === 'short' || next === 'diverged') && next !== this.status && !quiet) {
          this.events.push({ key: next === 'short' ? 'evt.guidanceShort' : 'evt.guidanceDiverged', params: { law, vGo: Math.round(this.solution.vGo) } });
          this.lastEventT = input.t;
        }
        this.status = next;
      }
      this.nextCycle = input.t + this.options.cycleS;
    }
    const s = this.solution;
    let dir = this.engaged && s ? s.steer(input.t) : undefined;
    if (dir && this.blend) {
      const w = (input.t - this.blend.t0) / this.options.cycleS;
      if (w >= 1) this.blend = undefined;
      else { const k = w * w * (3 - 2 * w); dir = normalize(add(scale(this.blend.from(input.t), 1 - k), scale(dir, k))); }
    }
    const el = s?.rPredicted && s.vPredicted ? elementsFromState(s.rPredicted, s.vPredicted) : undefined;
    this.record = {
      law: this.options.law, status: this.status,
      ...(s ? { tGo: Math.max(0, s.tGo - (input.t - (this.nextCycle - this.options.cycleS))), vGo: s.vGo } : {}),
      ...(el && el.e < 1 ? { predictedApoapsis: el.apoapsisAlt, predictedPeriapsis: el.periapsisAlt } : {}),
      targetApoapsis: this.insertion.apoapsis, targetPeriapsis: this.insertion.periapsis,
      ...(s?.miss !== undefined ? { miss: s.miss } : {}),
      ...(dir ? { pitchDeg: Math.asin(Math.max(-1, Math.min(1, dot(dir, up)))) * 180 / Math.PI, yawDeg: Math.asin(Math.max(-1, Math.min(1, dot(dir, input.iy)))) * 180 / Math.PI } : {}),
      standardPitchDeg: standardPitch, stages: this.stages,
    };
    return dir;
  }
}

/** The engage rule (G01, the owner's choice): a later stage lit, or the first out of the atmosphere. */
export function explicitReady(input: { closedLoop: boolean; burning: boolean; activeIndex: number; q: number; altitude: number }): boolean {
  return input.closedLoop && input.burning && (input.activeIndex >= 1 || (input.q < ENGAGE_Q_PA && input.altitude > ENGAGE_ALTITUDE_M));
}

// ------------------------------------------------------------------ settings
export const EXPLICIT_LAWS: readonly ExplicitLaw[] = ['peg', 'igm'];
export const CYCLE_LIMITS = [0.1, 4] as const;
export const EXPLICIT_FIELD_KEYS = { title: 'setup.explicit.title', law: 'setup.explicit.law', cycleS: 'setup.explicit.cycle' } as const;

/** Every problem with an `explicitGuidance` object. */
export function explicitGuidanceProblems(value: unknown): { field: string; value: unknown; limits?: readonly [number, number] }[] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return [{ field: EXPLICIT_FIELD_KEYS.title, value }];
  const c = value as Record<string, unknown>, out: { field: string; value: unknown; limits?: readonly [number, number] }[] = [];
  for (const key of Object.keys(c)) if (key !== 'law' && key !== 'cycleS') out.push({ field: EXPLICIT_FIELD_KEYS.title, value: key });
  if (!(EXPLICIT_LAWS as readonly unknown[]).includes(c.law)) out.push({ field: EXPLICIT_FIELD_KEYS.law, value: c.law });
  if (c.cycleS !== undefined && !(typeof c.cycleS === 'number' && Number.isFinite(c.cycleS) && c.cycleS >= CYCLE_LIMITS[0] && c.cycleS <= CYCLE_LIMITS[1])) {
    out.push({ field: EXPLICIT_FIELD_KEYS.cycleS, value: c.cycleS, limits: CYCLE_LIMITS });
  }
  return out;
}
export const validExplicitGuidanceConfig = (value: unknown): boolean => explicitGuidanceProblems(value).length === 0;
