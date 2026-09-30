/**
 * The translunar injection's steering (roadmap C01, docs/PHYSICS.md §13.9).
 *
 * The Saturn's iterative guidance aimed the S-IVB's second burn at five
 * elements of the conic for the Moon: its energy, eccentricity, inclination,
 * node and the direction of its perigee. So does this. In the conic's plane the
 * thrust is pitched by an angle that changes linearly with time, the two
 * numbers of that line solved, every guidance cycle, by Newton's method against
 * a prediction of the rest of the burn — the engine, its mixture shift and its
 * tail-off, the Earth with its J2 — so that the conic's perigee comes out at
 * the height and in the direction wanted; out of the plane, the thrust takes
 * the stack's distance from it and its speed across it to zero together at the
 * predicted cut-off. The energy, the tail-off counted, ends the burn.
 */
import { DEG, G0, MU_EARTH } from '../constants';
import { gravityJ2 } from '../gravity';
import { rk4Step } from '../integrator';
import { elementsFromState, planeNormal, wrapPi } from '../orbital';
import { add, cross, dot, norm, normalize, scale, sub, type Vec3 } from '../vec3';

/** The conic aimed at: energy (m²/s²), eccentricity, inclination, node and argument of perigee (rad). */
export interface TliTarget { c3: number; e: number; inc: number; raan: number; argp: number }

/** The engine through the burn: its operating points from their start times, its start-up and tail-off time constants. */
export interface TliEngine {
  ignition: number;
  startupS: number;
  tailoffS: number;
  points: { from: number; thrust: number; isp: number }[];
}

/** The pitch in the conic's plane above the horizontal, rad: p0 + p1 (t − t0). */
export interface PitchLaw { t0: number; p0: number; p1: number }

interface Point { t: number; r: Vec3; v: Vec3; m: number }

/** How often the steering is solved again, s (the LVDC's guidance cycle was about two seconds). */
export const TLI_CYCLE_S = 2;
/** The steering is held, no longer solved, in the last seconds before the predicted cut-off. */
const FREEZE_S = 8;
/** The prediction's step, s. */
const PREDICT_STEP_S = 1;

const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));
/** The start-up's rise, as the vehicle model's (`startupFactor`): smoothstep over its time. */
const rise = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));

export class TliGuidance {
  law: PitchLaw | null = null;
  /** the predicted cut-off, mission time, s */
  tCut = Infinity;
  private solvedAt = -Infinity;
  private readonly n: Vec3;
  private readonly rp: number;
  private readonly energy: number;

  constructor(readonly target: TliTarget, readonly engine: TliEngine) {
    this.n = planeNormal(target.inc, target.raan);
    const a = -MU_EARTH / target.c3;
    this.rp = a * (1 - target.e);
    this.energy = target.c3 / 2;
  }

  /** The engine's thrust (N) and mass flow (kg/s) at `t`, averaged over [t, t + dt]. */
  private engineAt(t: number, dt: number): { F: number; mdot: number } {
    const pts = this.engine.points;
    let p = pts[0];
    for (const q of pts) if (t >= q.from - 1e-9) p = q;
    const T = this.engine.startupS, x0 = (t - this.engine.ignition) / T, x1 = (t + dt - this.engine.ignition) / T;
    // the mean of the smoothstep over the step, as the vehicle model averages its start-up
    const I = (x: number) => (x <= 0 ? 0 : x >= 1 ? 0.5 + (x - 1) : x * x * x - 0.5 * x * x * x * x);
    const k = x0 >= 1 ? 1 : dt > 0 ? (I(x1) - I(x0)) / (x1 - x0) : rise(x0);
    return { F: p.thrust * k, mdot: (p.thrust / (p.isp * G0)) * k };
  }

  /** The tail-off's speed, m/s, at a cut-off with thrust `F` on mass `m` (the vehicle model's, to e⁻⁵). */
  private tailDv(F: number, m: number): number {
    return (F * this.engine.tailoffS * (1 - Math.exp(-5))) / m;
  }

  /** The thrust direction under `law`, with the yaw into the plane by `tCut`. */
  direction(t: number, r: Vec3, v: Vec3, aT: number, law: PitchLaw, tCut: number): Vec3 {
    const n = this.n;
    const y = dot(r, n), yd = dot(v, n);
    const up = normalize(sub(r, scale(n, y)));
    const hor = normalize(cross(n, up));
    const th = law.p0 + law.p1 * (t - law.t0);
    const inPlane = add(scale(hor, Math.cos(th)), scale(up, Math.sin(th)));
    const Tg = Math.max(20, tCut - t);
    const lat = aT > 0 ? clamp(-(6 * y / (Tg * Tg) + 4 * yd / Tg) / aT, -0.2, 0.2) : 0;
    return normalize(add(scale(inPlane, Math.sqrt(1 - lat * lat)), scale(n, lat)));
  }

  /** The rest of the burn under `law`, to the cut-off: the state then, the tail-off added along the thrust. */
  predict(p0: Point, law: PitchLaw, tCut: number): Point | null {
    let p = p0;
    const energyOf = (q: Point, dir: Vec3, F: number) => {
      const vv = add(q.v, scale(dir, this.tailDv(F, q.m)));
      return { e: dot(vv, vv) / 2 - MU_EARTH / norm(q.r), vv };
    };
    for (let i = 0; i < 2000; i++) {
      // a step never straddles the mixture shift
      let h = PREDICT_STEP_S;
      for (const q of this.engine.points) if (q.from > p.t + 1e-9 && q.from < p.t + h) h = q.from - p.t;
      const eng = this.engineAt(p.t, h);
      const aT = eng.F / p.m;
      const dir = this.direction(p.t, p.r, p.v, aT, law, tCut);
      const acc = (tt: number, r: Vec3): Vec3 => add(gravityJ2(r), scale(dir, eng.F / Math.max(1, p.m - eng.mdot * (tt - p.t))));
      const next = rk4Step(p.t, { r: p.r, v: p.v }, h, (tt, r) => acc(tt, r));
      const q: Point = { t: p.t + h, r: next.r, v: next.v, m: p.m - eng.mdot * h };
      const e1 = energyOf(q, dir, eng.F);
      if (e1.e >= this.energy) {
        // the crossing, by the energy's line over the step, flown again to it
        const e0 = energyOf(p, dir, eng.F).e;
        const f = clamp((this.energy - e0) / Math.max(1e-9, e1.e - e0), 0, 1);
        const part = rk4Step(p.t, { r: p.r, v: p.v }, h * f, (tt, r) => acc(tt, r));
        const m = p.m - eng.mdot * h * f;
        return { t: p.t + h * f, r: part.r, v: add(part.v, scale(dir, this.tailDv(eng.F, m))), m };
      }
      if (!(q.m > 0)) return null;
      p = q;
    }
    return null;
  }

  /** How far a predicted cut-off misses: perigee radius (per 10 km) and argument of perigee (per 0.1°). */
  private miss(end: Point): [number, number] {
    const el = elementsFromState(end.r, end.v);
    return [(el.a * (1 - el.e) - this.rp) / 10e3, wrapPi(el.argp - this.target.argp) / (0.1 * DEG)];
  }

  /**
   * Solve the pitch law again from the stack's state now, if a guidance cycle
   * has passed and the cut-off is not close: Newton's method on the two
   * misses, the Jacobian by differences, from the last law (or a level one).
   * Returns false when no law was found.
   */
  update(t: number, r: Vec3, v: Vec3, m: number): boolean {
    if (this.law && (t - this.solvedAt < TLI_CYCLE_S - 1e-6 || this.tCut - t < FREEZE_S)) return true;
    const now: Point = { t, r, v, m };
    let law: PitchLaw = this.law ? { t0: t, p0: this.law.p0 + this.law.p1 * (t - this.law.t0), p1: this.law.p1 } : { t0: t, p0: 0, p1: 0 };
    let tCut = this.law ? this.tCut : t + 400;
    const iterations = this.law ? 2 : 20;
    for (let k = 0; k < iterations; k++) {
      const end = this.predict(now, law, tCut);
      if (!end) return !!this.law;
      tCut = end.t;
      const f = this.miss(end);
      if (Math.abs(f[0]) < 0.01 && Math.abs(f[1]) < 0.02) break;
      const d0 = 0.1 * DEG, d1 = 0.001 * DEG;
      const a = this.predict(now, { ...law, p0: law.p0 + d0 }, tCut), b = this.predict(now, { ...law, p1: law.p1 + d1 }, tCut);
      if (!a || !b) return !!this.law;
      const fa = this.miss(a), fb = this.miss(b);
      const J = [[(fa[0] - f[0]) / d0, (fb[0] - f[0]) / d1], [(fa[1] - f[1]) / d0, (fb[1] - f[1]) / d1]];
      const det = J[0][0] * J[1][1] - J[0][1] * J[1][0];
      if (!(Math.abs(det) > 1e-12)) return !!this.law;
      let dp0 = (-f[0] * J[1][1] + f[1] * J[0][1]) / det, dp1 = (-f[1] * J[0][0] + f[0] * J[1][0]) / det;
      // no more than 5° and 0.05°/s a step: far from the answer the misses are far from linear
      const s = Math.min(1, (5 * DEG) / Math.abs(dp0), (0.05 * DEG) / Math.abs(dp1));
      dp0 *= s; dp1 *= s;
      law = { t0: t, p0: clamp(law.p0 + dp0, -40 * DEG, 40 * DEG), p1: clamp(law.p1 + dp1, -0.5 * DEG, 0.5 * DEG) };
    }
    this.law = law;
    this.tCut = tCut;
    this.solvedAt = t;
    return true;
  }

  /** The thrust direction now, under the law last solved. */
  steer(t: number, r: Vec3, v: Vec3, aT: number): Vec3 | null {
    return this.law ? this.direction(t, r, v, aT, this.law, this.tCut) : null;
  }
}
