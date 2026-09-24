/**
 * The attitude loop, linearised (roadmap G04): the flight's own equations of
 * motion — rigid, or with P05's slosh and bending — differentiated numerically
 * about the state of a control step, one plane at a time, then closed with the
 * autopilot exactly as it runs: sampled every step, its moment held for the
 * step (zero-order hold), through the gimbals' first-order lag, the bending
 * filter and the aerodynamic feed-forward.
 *
 * Planes are the simulator's body axes: x roll; z the rotation that swings the
 * nose towards +y (the ascent's pitch), y the one that swings it towards −z.
 * Each plane's state: the rotation angle and rate, the lateral drift velocity
 * (pitch and yaw), and the slosh and bending coordinates in that plane. The
 * input is the moment the actuators deliver about the plane's axis.
 *
 * Left out: the rate, acceleration and gimbal-travel limits (a linear model has
 * none), the attitude thrusters while the engines steer (they hold a few
 * per cent of the gimbals' authority and saturate), cross-coupling between the
 * planes, and a quasi-static bending mode (too stiff to integrate).
 */
import { add, dot, scale, sub, v3, type Vec3 } from '../vec3';
import { quatFromAxisAngle, quatMultiply, quatRotate } from './math';
import type { RigidState } from './integrator';

export type LinearAxis = 'x' | 'y' | 'z';
export const LINEAR_AXES: readonly LinearAxis[] = ['x', 'y', 'z'];

export interface Biquad { b0: number; b1: number; b2: number; a1: number; a2: number }

export interface PlaneModel {
  axis: LinearAxis;
  n: number;
  /** State names: angle, rate, drift, slosh:<tank>, sloshRate:<tank>, bending, bendingRate. */
  states: string[];
  /** Continuous dynamics, row-major n×n and n×1: ẋ = A x + B M. */
  A: number[];
  B: number[];
  /** What the IMU reads (angle and rate about the axis) and the air's moment about it, 1×n. */
  cAngle: number[];
  cRate: number[];
  cAero: number[];
  actuator: 'engines' | 'jets' | 'none';
  /** Gimbal lag, s (0 for the jets). */
  tau: number;
  /** The controller's inertia about the axis, kg·m², and its gains, 1/s. */
  inertia: number;
  kTheta: number;
  kOmega: number;
  /** The bending filter on the moment demand (pitch and yaw, with P05's notch). */
  notch?: Biquad;
}

export interface PlaneMargins {
  /** False when nothing steers the plane (a coast with no gimbal or thruster): there is no loop to analyse. */
  active: boolean;
  /**
   * No closed-loop mode grows faster than 0.001 s⁻¹. The lateral drift is
   * neutral (in vacuum nothing restores it; guidance steers it out), so a
   * mode at exactly zero is not an attitude instability.
   */
  stable: boolean;
  /** The least damped closed-loop mode as a continuous rate, s⁻¹ (ln|λ|/T), and its frequency, rad/s. */
  growthRate: number;
  growthFrequency: number;
  /** Phase margin at the lowest gain crossover, deg, and its frequency, rad/s. */
  pmDeg?: number;
  wcRadS?: number;
  /** Gain margin above it (the smallest), dB, and its frequency. */
  gmDb?: number;
  wgRadS?: number;
  /** Gain-reduction margin below the crossover, dB (negative), where the phase crosses −180° there. */
  gmLowDb?: number;
  /**
   * Unstable poles of the loop's open-loop system (the plant with the feed-forward and the gimbals,
   * the autopilot's feedback cut): with any, the Bode margins need the Nyquist count to read them.
   */
  openLoopUnstable: number;
}

export interface LinearModel {
  /** Mission time of the step linearised, s, and the control step, s. */
  t: number;
  T: number;
  planes: Record<LinearAxis, PlaneModel>;
  /** Margins with the feed-forward exact. */
  margins: Record<LinearAxis, PlaneMargins>;
}

/** The standards' roll, pitch and yaw in the simulator's planes (pitch turns about its z). */
export const PLANE_OF = { roll: 'x', pitch: 'z', yaw: 'y' } as const satisfies Record<'roll' | 'pitch' | 'yaw', LinearAxis>;

/**
 * The newest linearisation carried by a telemetry sample at or before `cursor`; none when the
 * newest such sample is over 30 s back (the loop was not linearised then: before lift-off, on the
 * point-mass model, after the flight ended).
 */
export function linearModelAt(samples: readonly { t: number; rigid?: { linearModel?: LinearModel } }[], cursor: number): LinearModel | undefined {
  for (let i = samples.length - 1; i >= 0; i--) {
    const s = samples[i];
    if (s.t > cursor + 1e-9) continue;
    if (s.rigid?.linearModel) return s.rigid.linearModel;
    if (cursor - s.t > 30) return undefined;
  }
  return undefined;
}

// ─── linearisation ─────────────────────────────────────────────────────────

/** What the runtime supplies about its step: the state, and pure evaluations of its own model. */
export interface LinearisationContext {
  time: number;
  T: number;
  state: RigidState;
  /** The full state derivative for a trial state, with optional engine states or an extra body moment. */
  derivative: (trial: RigidState, probe?: { engineStates?: unknown; extraMomentBody?: Vec3 }) => RigidState;
  /** The aerodynamic moment for a trial state, body axes. */
  aeroMoment: (trial: RigidState) => Vec3;
  /** Engine states delivering about `dM` more moment about the axis, and the moment they actually add; null without engines. */
  engineProbe: (axis: LinearAxis, dM: number) => { engineStates: unknown; momentChange: number } | null;
  /** Slosh tank ids in the flex state's order, and whether the bending mode is integrated. */
  tanks: readonly string[];
  bending: boolean;
  /** Bending mode slope at the IMU, 1/m (0 without bending). */
  imuSlope: number;
  hasJets: boolean;
  tau: number;
  inertia: Vec3;
  kTheta: Vec3;
  kOmega: Vec3;
  notch?: Biquad;
}

const E: Record<LinearAxis, Vec3> = { x: v3(1, 0, 0), y: v3(0, 1, 0), z: v3(0, 0, 1) };
/** The lateral axis a rotation swings the nose along, and the flex state's component for it (0: y, 1: z). */
const LATERAL: Record<'y' | 'z', { axis: 'y' | 'z'; component: 0 | 1; imuSign: 1 | -1 }> = {
  z: { axis: 'y', component: 0, imuSign: 1 },
  y: { axis: 'z', component: 1, imuSign: -1 },
};

type Perturb = (s: RigidState, h: number) => RigidState;
type Read = (d: RigidState) => number;

export function linearisePlane(axis: LinearAxis, ctx: LinearisationContext): PlaneModel {
  const s0 = ctx.state, q0 = s0.attitudeQ, ek = E[axis];
  const perturbs: { name: string; h: number; apply: Perturb }[] = [];
  const reads: Read[] = [];
  const rotate = (s: RigidState, h: number): RigidState => ({ ...s, attitudeQ: quatMultiply(s.attitudeQ, quatFromAxisAngle(ek, h)) });
  perturbs.push({ name: 'angle', h: 1e-4, apply: rotate });
  perturbs.push({ name: 'rate', h: 1e-4, apply: (s, h) => ({ ...s, omegaBody: add(s.omegaBody, scale(ek, h)) }) });
  reads.push(() => NaN); // the angle's rate is the rate state, set exactly below
  reads.push((d) => dot(d.omegaBody, ek));
  let lateralECI: Vec3 | undefined;
  if (axis !== 'x') {
    const lateral = LATERAL[axis];
    lateralECI = quatRotate(q0, E[lateral.axis]);
    const speed = Math.max(1, Math.hypot(s0.v.x, s0.v.y, s0.v.z));
    const le = lateralECI;
    perturbs.push({ name: 'drift', h: 1e-4 * speed, apply: (s, h) => ({ ...s, v: add(s.v, scale(le, h)) }) });
    reads.push((d) => dot(d.v, le));
    const flexAt = (index: number): Perturb => (s, h) => ({ ...s, flex: s.flex!.map((value, i) => (i === index ? value + h : value)) });
    ctx.tanks.forEach((tank, i) => {
      const u = 4 * i + lateral.component, du = 4 * i + 2 + lateral.component;
      perturbs.push({ name: `slosh:${tank}`, h: 1e-3, apply: flexAt(u) });
      perturbs.push({ name: `sloshRate:${tank}`, h: 1e-3, apply: flexAt(du) });
      reads.push((d) => d.flex![u]); reads.push((d) => d.flex![du]);
    });
    if (ctx.bending) {
      const at = 4 * ctx.tanks.length, eta = at + lateral.component, deta = at + 2 + lateral.component;
      perturbs.push({ name: 'bending', h: 1e-4, apply: flexAt(eta) });
      perturbs.push({ name: 'bendingRate', h: 1e-4, apply: flexAt(deta) });
      reads.push((d) => d.flex![eta]); reads.push((d) => d.flex![deta]);
    }
  }
  // One-sided differences about the step's own state: half the model evaluations of central ones,
  // at an error of order h (10⁻⁴ of each coordinate's scale), far below what the margins resolve.
  const n = perturbs.length, A = new Array<number>(n * n).fill(0), cAero = new Array<number>(n).fill(0);
  const d0 = ctx.derivative(s0), aero0 = ctx.aeroMoment(s0);
  perturbs.forEach((p, j) => {
    const plus = p.apply(s0, p.h), dp = ctx.derivative(plus);
    for (let i = 1; i < n; i++) A[i * n + j] = (reads[i](dp) - reads[i](d0)) / p.h;
    cAero[j] = dot(sub(ctx.aeroMoment(plus), aero0), ek) / p.h;
  });
  // The angle's rate is the rate: small rotations about a body axis.
  for (let j = 0; j < n; j++) A[j] = j === 1 ? 1 : 0;

  // Input: the moment the actuators deliver about the axis.
  let B = new Array<number>(n).fill(0), actuator: PlaneModel['actuator'] = 'none', tau = 0;
  const dM = Math.max(1, ctx.inertia[axis] * 1e-4);
  const up = ctx.engineProbe(axis, dM), down = ctx.engineProbe(axis, -dM);
  if (up && down && Math.abs(up.momentChange - down.momentChange) > 1e-6 * dM) {
    const dp = ctx.derivative(s0, { engineStates: up.engineStates }), dm = ctx.derivative(s0, { engineStates: down.engineStates });
    const span = up.momentChange - down.momentChange;
    B = reads.map((read, i) => (i === 0 ? 0 : (read(dp) - read(dm)) / span));
    actuator = 'engines'; tau = ctx.tau;
  } else if (ctx.hasJets) {
    const dp = ctx.derivative(s0, { extraMomentBody: scale(ek, dM) }), dm = ctx.derivative(s0, { extraMomentBody: scale(ek, -dM) });
    B = reads.map((read, i) => (i === 0 ? 0 : (read(dp) - read(dm)) / (2 * dM)));
    actuator = 'jets';
  }
  const cAngle = new Array<number>(n).fill(0), cRate = new Array<number>(n).fill(0);
  cAngle[0] = 1; cRate[1] = 1;
  if (axis !== 'x' && ctx.bending && ctx.imuSlope !== 0) {
    const sign = LATERAL[axis].imuSign, k = perturbs.findIndex((p) => p.name === 'bending');
    cAngle[k] = sign * ctx.imuSlope; cRate[k + 1] = sign * ctx.imuSlope;
  }
  return { axis, n, states: perturbs.map((p) => p.name), A, B, cAngle, cRate, cAero, actuator, tau,
    inertia: ctx.inertia[axis], kTheta: ctx.kTheta[axis], kOmega: ctx.kOmega[axis], ...(axis !== 'x' && ctx.notch ? { notch: ctx.notch } : {}) };
}

export function linearise(ctx: LinearisationContext): LinearModel {
  const planes = { x: linearisePlane('x', ctx), y: linearisePlane('y', ctx), z: linearisePlane('z', ctx) };
  return { t: ctx.time, T: ctx.T, planes, margins: { x: margins(planes.x, ctx.T, 0), y: margins(planes.y, ctx.T, 0), z: margins(planes.z, ctx.T, 0) } };
}

// ─── discrete-time loop ────────────────────────────────────────────────────

/** e^{M} for a small dense matrix (scaling and squaring, Taylor series). */
export function expm(M: readonly number[], n: number): number[] {
  let norm = 0;
  for (let i = 0; i < n; i++) { let row = 0; for (let j = 0; j < n; j++) row += Math.abs(M[i * n + j]); norm = Math.max(norm, row); }
  const squarings = norm > 0.5 ? Math.ceil(Math.log2(norm / 0.5)) : 0, k = 2 ** -squarings;
  const X = M.map((v) => v * k);
  let term = identity(n), sum = identity(n);
  for (let order = 1; order <= 18; order++) {
    term = matmul(term, X, n).map((v) => v / order);
    for (let i = 0; i < n * n; i++) sum[i] += term[i];
  }
  for (let s = 0; s < squarings; s++) sum = matmul(sum, sum, n);
  return sum;
}
function identity(n: number): number[] { const I = new Array<number>(n * n).fill(0); for (let i = 0; i < n; i++) I[i * n + i] = 1; return I; }
function matmul(a: readonly number[], b: readonly number[], n: number): number[] {
  const c = new Array<number>(n * n).fill(0);
  for (let i = 0; i < n; i++) for (let k = 0; k < n; k++) { const v = a[i * n + k]; if (v === 0) continue; for (let j = 0; j < n; j++) c[i * n + j] += v * b[k * n + j]; }
  return c;
}

/** The plant with its actuator, sampled with a zero-order hold over T: z⁺ = Φ z + Γ M_req. */
export interface Sampled { m: number; Phi: number[]; Gamma: number[]; cAngle: number[]; cRate: number[]; cAero: number[]; angleIndex: number; deliveredIndex?: number }

export function sample(p: PlaneModel, T: number): Sampled {
  const lag = p.actuator === 'engines' && p.tau > 0, m = p.n + (lag ? 1 : 0), size = m + 1;
  const aug = new Array<number>(size * size).fill(0);
  for (let i = 0; i < p.n; i++) for (let j = 0; j < p.n; j++) aug[i * size + j] = p.A[i * p.n + j] * T;
  if (lag) {
    for (let i = 0; i < p.n; i++) aug[i * size + p.n] = p.B[i] * T;
    aug[p.n * size + p.n] = -T / p.tau;
    aug[p.n * size + m] = T / p.tau;
  } else for (let i = 0; i < p.n; i++) aug[i * size + m] = p.B[i] * T;
  const e = expm(aug, size);
  const Phi = new Array<number>(m * m), Gamma = new Array<number>(m);
  for (let i = 0; i < m; i++) { for (let j = 0; j < m; j++) Phi[i * m + j] = e[i * size + j]; Gamma[i] = e[i * size + m]; }
  const pad = (c: number[]) => (lag ? [...c, 0] : [...c]);
  return { m, Phi, Gamma, cAngle: pad(p.cAngle), cRate: pad(p.cRate), cAero: pad(p.cAero), angleIndex: 0, ...(lag ? { deliveredIndex: p.n } : {}) };
}

/** The closed loop's one-step matrix and command input: s⁺ = M s + g θ_c, s = [plant, actuator, notch]. */
export function closedLoop(p: PlaneModel, T: number, ffError: number): { dim: number; M: number[]; g: number[]; s: Sampled } {
  const s = sample(p, T), m = s.m, notch = p.notch, dim = m + (notch ? 2 : 0);
  // Moment demand: m_d = I K_ω (K_θ (θ_c − θ̂) − ω̂) = K·z + k θ_c.
  const K = s.cAngle.map((c, i) => -p.inertia * p.kOmega * (p.kTheta * c + s.cRate[i])), k = p.inertia * p.kOmega * p.kTheta;
  const ff = 1 + ffError, M = new Array<number>(dim * dim).fill(0), g = new Array<number>(dim).fill(0);
  const b0 = notch ? notch.b0 : 1;
  // M_req = b0 (K z + k θ_c) + w1 − (1+x) c_a z.
  const req = K.map((v, i) => b0 * v - ff * s.cAero[i]);
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < m; j++) M[i * dim + j] = s.Phi[i * m + j] + s.Gamma[i] * req[j];
    if (notch) M[i * dim + m] = s.Gamma[i];
    g[i] = s.Gamma[i] * b0 * k;
  }
  if (notch) {
    const c1 = notch.b1 - notch.a1 * notch.b0, c2 = notch.b2 - notch.a2 * notch.b0;
    for (let j = 0; j < m; j++) { M[m * dim + j] = c1 * K[j]; M[(m + 1) * dim + j] = c2 * K[j]; }
    M[m * dim + m] = -notch.a1; M[m * dim + m + 1] = 1; M[(m + 1) * dim + m] = -notch.a2;
    g[m] = c1 * k; g[m + 1] = c2 * k;
  }
  return { dim, M, g, s };
}

/**
 * The sampled plant in upper Hessenberg form (an orthogonal similarity, H = QᵀΦQ), so that each
 * frequency of the loop gain is an O(n²) solve rather than O(n³).
 */
export interface Prepared { s: Sampled; m: number; H: number[]; g: number[]; cA: number[]; cR: number[]; cF: number[] }
export function prepare(p: PlaneModel, T: number, sampled = sample(p, T)): Prepared {
  const m = sampled.m, H = sampled.Phi.slice(), Q = identity(m);
  for (let k = 0; k < m - 2; k++) {
    let norm = 0;
    for (let i = k + 1; i < m; i++) norm += H[i * m + k] ** 2;
    norm = Math.sqrt(norm);
    if (norm === 0) continue;
    const alpha = H[(k + 1) * m + k] > 0 ? -norm : norm, v = new Array<number>(m).fill(0);
    for (let i = k + 1; i < m; i++) v[i] = H[i * m + k];
    v[k + 1] -= alpha;
    const vv = v.reduce((a, x) => a + x * x, 0);
    if (vv === 0) continue;
    // H ← (I − 2vvᵀ/vᵀv) H (I − 2vvᵀ/vᵀv), Q ← Q (I − 2vvᵀ/vᵀv)
    for (let j = 0; j < m; j++) { let d = 0; for (let i = k + 1; i < m; i++) d += v[i] * H[i * m + j]; d *= 2 / vv; for (let i = k + 1; i < m; i++) H[i * m + j] -= d * v[i]; }
    for (let i = 0; i < m; i++) { let d = 0; for (let j = k + 1; j < m; j++) d += H[i * m + j] * v[j]; d *= 2 / vv; for (let j = k + 1; j < m; j++) H[i * m + j] -= d * v[j]; }
    for (let i = 0; i < m; i++) { let d = 0; for (let j = k + 1; j < m; j++) d += Q[i * m + j] * v[j]; d *= 2 / vv; for (let j = k + 1; j < m; j++) Q[i * m + j] -= d * v[j]; }
  }
  const g = new Array<number>(m).fill(0);
  for (let i = 0; i < m; i++) for (let j = 0; j < m; j++) g[i] += Q[j * m + i] * sampled.Gamma[j];
  const rowQ = (c: number[]) => { const out = new Array<number>(m).fill(0); for (let j = 0; j < m; j++) for (let i = 0; i < m; i++) out[j] += c[i] * Q[i * m + j]; return out; };
  return { s: sampled, m, H, g, cA: rowQ(sampled.cAngle), cR: rowQ(sampled.cRate), cF: rowQ(sampled.cAero) };
}

/** L(e^{jωT}): the loop broken at the autopilot's (filtered) moment demand, feed-forward inside. */
export function loopGain(p: PlaneModel, T: number, ffError: number, omega: number, prepared = prepare(p, T)): { re: number; im: number } {
  const { m, H, g } = prepared, zr = Math.cos(omega * T), zi = Math.sin(omega * T);
  // (zI − H) v = g for Hessenberg H: elimination touches only the subdiagonal.
  const Ar = new Array<number>(m * m), Ai = new Array<number>(m * m);
  for (let i = 0; i < m; i++) for (let j = 0; j < m; j++) { Ar[i * m + j] = (i === j ? zr : 0) - H[i * m + j]; Ai[i * m + j] = i === j ? zi : 0; }
  const br = g.slice(), bi = new Array<number>(m).fill(0);
  for (let k = 0; k < m - 1; k++) {
    const r = k + 1;
    if (Ar[r * m + k] ** 2 + Ai[r * m + k] ** 2 > Ar[k * m + k] ** 2 + Ai[k * m + k] ** 2) {
      for (let j = k; j < m; j++) { [Ar[k * m + j], Ar[r * m + j]] = [Ar[r * m + j], Ar[k * m + j]]; [Ai[k * m + j], Ai[r * m + j]] = [Ai[r * m + j], Ai[k * m + j]]; }
      [br[k], br[r]] = [br[r], br[k]]; [bi[k], bi[r]] = [bi[r], bi[k]];
    }
    const pr = Ar[k * m + k], pi = Ai[k * m + k], pd = pr * pr + pi * pi || 1e-300, xr = Ar[r * m + k], xi = Ai[r * m + k];
    if (xr === 0 && xi === 0) continue;
    const fr = (xr * pr + xi * pi) / pd, fi = (xi * pr - xr * pi) / pd;
    for (let j = k; j < m; j++) {
      const ar = Ar[k * m + j], ai = Ai[k * m + j];
      Ar[r * m + j] -= fr * ar - fi * ai; Ai[r * m + j] -= fr * ai + fi * ar;
    }
    br[r] -= fr * br[k] - fi * bi[k]; bi[r] -= fr * bi[k] + fi * br[k];
  }
  const vr = new Array<number>(m).fill(0), vi = new Array<number>(m).fill(0);
  for (let r = m - 1; r >= 0; r--) {
    let sr = br[r], si = bi[r];
    for (let j = r + 1; j < m; j++) { sr -= Ar[r * m + j] * vr[j] - Ai[r * m + j] * vi[j]; si -= Ar[r * m + j] * vi[j] + Ai[r * m + j] * vr[j]; }
    const pr = Ar[r * m + r], pi = Ai[r * m + r], pd = pr * pr + pi * pi || 1e-300;
    vr[r] = (sr * pr + si * pi) / pd; vi[r] = (si * pr - sr * pi) / pd;
  }
  const dotc = (c: number[]) => ({ re: c.reduce((a, v, i) => a + v * vr[i], 0), im: c.reduce((a, v, i) => a + v * vi[i], 0) });
  const hA = dotc(prepared.cA), hR = dotc(prepared.cR), hF = dotc(prepared.cF);
  const gain = p.inertia * p.kOmega;
  let num = { re: gain * (p.kTheta * hA.re + hR.re), im: gain * (p.kTheta * hA.im + hR.im) };
  if (p.notch) num = cmul(num, biquadAt(p.notch, zr, zi));
  const den = { re: 1 + (1 + ffError) * hF.re, im: (1 + ffError) * hF.im };
  return cdiv(num, den);
}
const cmul = (a: { re: number; im: number }, b: { re: number; im: number }) => ({ re: a.re * b.re - a.im * b.im, im: a.re * b.im + a.im * b.re });
function cdiv(a: { re: number; im: number }, b: { re: number; im: number }) {
  const d = b.re * b.re + b.im * b.im;
  return { re: (a.re * b.re + a.im * b.im) / d, im: (a.im * b.re - a.re * b.im) / d };
}
/** H(z) = (b0 + b1 z⁻¹ + b2 z⁻²) / (1 + a1 z⁻¹ + a2 z⁻²). */
export function biquadAt(f: Biquad, zr: number, zi: number): { re: number; im: number } {
  const inv = cdiv({ re: 1, im: 0 }, { re: zr, im: zi }), inv2 = cmul(inv, inv);
  const num = { re: f.b0 + f.b1 * inv.re + f.b2 * inv2.re, im: f.b1 * inv.im + f.b2 * inv2.im };
  const den = { re: 1 + f.a1 * inv.re + f.a2 * inv2.re, im: f.a1 * inv.im + f.a2 * inv2.im };
  return cdiv(num, den);
}
// ─── frequency response and margins ────────────────────────────────────────

export interface BodePoint { omega: number; magDb: number; phaseDeg: number }

/** L over a logarithmic grid from 0.01 rad/s to just below the Nyquist frequency, phase unwrapped. */
export function bode(p: PlaneModel, T: number, ffError: number, points = 240): BodePoint[] {
  const s = prepare(p, T), lo = Math.log10(0.01), hi = Math.log10(0.98 * Math.PI / T), out: BodePoint[] = [];
  let last: number | undefined;
  for (let i = 0; i < points; i++) {
    const omega = 10 ** (lo + (hi - lo) * i / (points - 1)), L = loopGain(p, T, ffError, omega, s);
    let phase = Math.atan2(L.im, L.re) * 180 / Math.PI;
    if (last !== undefined) { while (phase - last > 180) phase -= 360; while (phase - last < -180) phase += 360; }
    last = phase;
    out.push({ omega, magDb: 20 * Math.log10(Math.hypot(L.re, L.im)), phaseDeg: phase });
  }
  // Shift the unwrapped curve by whole turns so that it starts in (−360°, 0°].
  const shift = out.length ? -360 * Math.ceil(out[0].phaseDeg / 360) : 0;
  for (const pt of out) pt.phaseDeg += shift;
  return out;
}

export function margins(p: PlaneModel, T: number, ffError: number): PlaneMargins {
  if (p.actuator === 'none') return { active: false, stable: false, growthRate: NaN, growthFrequency: NaN, openLoopUnstable: 0 };
  const { dim, M } = closedLoop(p, T, ffError);
  const eig = eigenvalues(M, dim);
  let growthRate = -Infinity, growthFrequency = 0;
  eig.re.forEach((re, i) => {
    const rate = Math.log(Math.hypot(re, eig.im[i])) / T;
    if (rate > growthRate) { growthRate = rate; growthFrequency = Math.abs(Math.atan2(eig.im[i], re)) / T; }
  });
  const curve = bode(p, T, ffError, 240), out: PlaneMargins = { active: true, stable: growthRate < 1e-3, growthRate, growthFrequency,
    openLoopUnstable: openLoopUnstable(p, T, ffError) };
  const at = (a: BodePoint, b: BodePoint, f: number) => ({ omega: 10 ** (Math.log10(a.omega) + f * (Math.log10(b.omega) - Math.log10(a.omega))),
    magDb: a.magDb + f * (b.magDb - a.magDb), phaseDeg: a.phaseDeg + f * (b.phaseDeg - a.phaseDeg) });
  const wrap = (deg: number) => { let x = ((deg % 360) + 360) % 360; if (x > 180) x -= 360; return x; };
  let firstCrossover: number | undefined;
  for (let i = 1; i < curve.length; i++) {
    const a = curve[i - 1], b = curve[i];
    if ((a.magDb > 0) !== (b.magDb > 0)) {
      const c = at(a, b, a.magDb / (a.magDb - b.magDb)), pm = wrap(c.phaseDeg + 180);
      firstCrossover ??= c.omega;
      if (out.pmDeg === undefined) { out.pmDeg = pm; out.wcRadS = c.omega; }
    }
  }
  for (let i = 1; i < curve.length; i++) {
    const a = curve[i - 1], b = curve[i];
    // A crossing of −180° + k·360°.
    const ka = Math.floor((a.phaseDeg + 180) / 360), kb = Math.floor((b.phaseDeg + 180) / 360);
    if (ka === kb) continue;
    const target = Math.max(ka, kb) * 360 - 180, c = at(a, b, (target - a.phaseDeg) / (b.phaseDeg - a.phaseDeg)), gm = -c.magDb;
    if (gm > 0 && (firstCrossover === undefined || c.omega > firstCrossover)) {
      if (out.gmDb === undefined || gm < out.gmDb) { out.gmDb = gm; out.wgRadS = c.omega; }
    } else if (gm < 0 && gm > -40 && firstCrossover !== undefined && c.omega < firstCrossover) {
      if (out.gmLowDb === undefined || gm > out.gmLowDb) out.gmLowDb = gm;
    }
  }
  return out;
}

/** Poles outside the unit circle (beyond a 0.001 s⁻¹ growth) of the plant closed only through the feed-forward. */
export function openLoopUnstable(p: PlaneModel, T: number, ffError: number): number {
  const s = sample(p, T), m = s.m, M = s.Phi.slice();
  for (let i = 0; i < m; i++) for (let j = 0; j < m; j++) M[i * m + j] -= s.Gamma[i] * (1 + ffError) * s.cAero[j];
  const e = eigenvalues(M, m);
  return e.re.filter((re, i) => Math.log(Math.hypot(re, e.im[i])) / T > 1e-3).length;
}

// ─── step response ─────────────────────────────────────────────────────────

export interface StepResponse { t: number[]; angle: number[]; sensed: number[]; rate: number[]; demand: number[]; delivered: number[] }

/** The closed loop's response to a step of the attitude command, rad, over `duration` s. */
export function stepResponse(p: PlaneModel, T: number, ffError: number, stepRad: number, duration: number): StepResponse {
  const { dim, M, g, s } = closedLoop(p, T, ffError), out: StepResponse = { t: [], angle: [], sensed: [], rate: [], demand: [], delivered: [] };
  let x = new Array<number>(dim).fill(0);
  const steps = Math.round(duration / T), m = s.m;
  const K = s.cAngle.map((c, i) => -p.inertia * p.kOmega * (p.kTheta * c + s.cRate[i])), k = p.inertia * p.kOmega * p.kTheta;
  for (let step = 0; step <= steps; step++) {
    const z = x.slice(0, m), demand = K.reduce((a, v, i) => a + v * z[i], 0) + k * stepRad;
    out.t.push(step * T); out.angle.push(z[0]); out.sensed.push(s.cAngle.reduce((a, v, i) => a + v * z[i], 0));
    out.rate.push(s.cRate.reduce((a, v, i) => a + v * z[i], 0)); out.demand.push(demand);
    const req = (p.notch ? p.notch.b0 * demand + x[m] : demand) - (1 + ffError) * s.cAero.reduce((a, v, i) => a + v * z[i], 0);
    out.delivered.push(s.deliveredIndex !== undefined ? z[s.deliveredIndex] : req);
    const next = new Array<number>(dim).fill(0);
    for (let i = 0; i < dim; i++) { let v = g[i] * stepRad; for (let j = 0; j < dim; j++) v += M[i * dim + j] * x[j]; next[i] = v; }
    x = next;
    if (!x.every(Number.isFinite)) break;
  }
  return out;
}

/** Rise (10–90 %) and settling (within 2 % of the command) times, s — absent if never reached in the run — overshoot, and the final angle over the step. */
export interface StepMetrics { riseS?: number; overshootPct: number; settlingS?: number; final: number }
export function stepMetrics(r: StepResponse, stepRad: number): StepMetrics {
  const y = r.angle.map((v) => v / stepRad), final = y[y.length - 1];
  const i10 = y.findIndex((v) => v >= 0.1), i90 = y.findIndex((v) => v >= 0.9);
  let last = -1;
  for (let i = y.length - 1; i >= 0; i--) if (!(Math.abs(y[i] - 1) <= 0.02)) { last = i; break; }
  const settled = last + 1 < y.length;
  return { ...(i10 >= 0 && i90 >= 0 ? { riseS: r.t[i90] - r.t[i10] } : {}), overshootPct: Math.max(0, (Math.max(...y) - 1) * 100),
    ...(settled ? { settlingS: r.t[last + 1] } : {}), final };
}

// ─── eigenvalues (Hessenberg reduction and shifted QR, after EISPACK hqr) ─

export function eigenvalues(M: readonly number[], n: number): { re: number[]; im: number[] } {
  const a: number[][] = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => M[i * n + j]));
  // Balance first (Parlett–Reinsch, powers of two): the loop's matrix mixes angles in radians with
  // filter states in newton-metres, and QR on such a matrix loses the small eigenvalues' accuracy.
  for (let converged = false; !converged;) {
    converged = true;
    for (let i = 0; i < n; i++) {
      let r = 0, c = 0;
      for (let j = 0; j < n; j++) if (j !== i) { c += Math.abs(a[j][i]); r += Math.abs(a[i][j]); }
      if (c === 0 || r === 0) continue;
      const s0 = c + r;
      let f = 1, g = r / 2;
      while (c < g) { f *= 2; c *= 4; }
      g = r * 2;
      while (c > g) { f /= 2; c /= 4; }
      if ((c + r) / f < 0.95 * s0) {
        converged = false;
        for (let j = 0; j < n; j++) a[i][j] /= f;
        for (let j = 0; j < n; j++) a[j][i] *= f;
      }
    }
  }
  // Reduce to upper Hessenberg form by elimination with pivoting.
  for (let m = 1; m < n - 1; m++) {
    let x = 0, i = m;
    for (let j = m; j < n; j++) if (Math.abs(a[j][m - 1]) > Math.abs(x)) { x = a[j][m - 1]; i = j; }
    if (i !== m) {
      for (let j = m - 1; j < n; j++) [a[i][j], a[m][j]] = [a[m][j], a[i][j]];
      for (let j = 0; j < n; j++) [a[j][i], a[j][m]] = [a[j][m], a[j][i]];
    }
    if (x !== 0) for (i = m + 1; i < n; i++) {
      let y = a[i][m - 1];
      if (y !== 0) {
        y /= x; a[i][m - 1] = y;
        for (let j = m; j < n; j++) a[i][j] -= y * a[m][j];
        for (let j = 0; j < n; j++) a[j][m] += y * a[j][i];
      }
    }
  }
  for (let i = 2; i < n; i++) for (let j = 0; j < i - 1; j++) a[i][j] = 0;
  const wr = new Array<number>(n).fill(0), wi = new Array<number>(n).fill(0);
  let anorm = 0;
  for (let i = 0; i < n; i++) for (let j = Math.max(i - 1, 0); j < n; j++) anorm += Math.abs(a[i][j]);
  let nn = n - 1, t = 0;
  while (nn >= 0) {
    let its = 0, l: number;
    do {
      for (l = nn; l >= 1; l--) {
        const s = Math.abs(a[l - 1][l - 1]) + Math.abs(a[l][l]) || anorm;
        if (Math.abs(a[l][l - 1]) + s === s) { a[l][l - 1] = 0; break; }
      }
      const x = a[nn][nn];
      if (l === nn) { wr[nn] = x + t; wi[nn] = 0; nn--; }
      else {
        const y = a[nn - 1][nn - 1], w = a[nn][nn - 1] * a[nn - 1][nn];
        if (l === nn - 1) {
          const p = 0.5 * (y - x), q = p * p + w, z = Math.sqrt(Math.abs(q));
          const xx = x + t;
          if (q >= 0) {
            const zz = p + (p >= 0 ? z : -z);
            wr[nn - 1] = wr[nn] = xx + zz;
            if (zz) wr[nn] = xx - w / zz;
            wi[nn - 1] = wi[nn] = 0;
          } else { wr[nn - 1] = wr[nn] = xx + p; wi[nn - 1] = -(wi[nn] = z); }
          nn -= 2;
        } else {
          if (its === 60) throw new Error('eigenvalues: no convergence');
          let xs = x, ys = y, ws = w;
          if (its === 10 || its === 20) {
            t += xs;
            for (let i = 0; i <= nn; i++) a[i][i] -= xs;
            const s = Math.abs(a[nn][nn - 1]) + Math.abs(a[nn - 1][nn - 2]);
            ys = xs = 0.75 * s; ws = -0.4375 * s * s;
          }
          ++its;
          let m: number, p = 0, q = 0, r = 0;
          for (m = nn - 2; m >= l; m--) {
            const z = a[m][m], rr = xs - z, ss = ys - z;
            p = (rr * ss - ws) / a[m + 1][m] + a[m][m + 1]; q = a[m + 1][m + 1] - z - rr - ss; r = a[m + 2][m + 1];
            const s = Math.abs(p) + Math.abs(q) + Math.abs(r);
            p /= s; q /= s; r /= s;
            if (m === l) break;
            const u = Math.abs(a[m][m - 1]) * (Math.abs(q) + Math.abs(r));
            const v = Math.abs(p) * (Math.abs(a[m - 1][m - 1]) + Math.abs(z) + Math.abs(a[m + 1][m + 1]));
            if (u + v === v) break;
          }
          for (let i = m + 2; i <= nn; i++) { a[i][i - 2] = 0; if (i !== m + 2) a[i][i - 3] = 0; }
          for (let k = m; k <= nn - 1; k++) {
            let xx = 0;
            if (k !== m) {
              p = a[k][k - 1]; q = a[k + 1][k - 1]; r = 0;
              if (k !== nn - 1) r = a[k + 2][k - 1];
              xx = Math.abs(p) + Math.abs(q) + Math.abs(r);
              if (xx !== 0) { p /= xx; q /= xx; r /= xx; }
            }
            const s = (p >= 0 ? 1 : -1) * Math.sqrt(p * p + q * q + r * r);
            if (s === 0) continue;
            if (k === m) { if (l !== m) a[k][k - 1] = -a[k][k - 1]; } else a[k][k - 1] = -s * xx;
            p += s;
            const x2 = p / s, y2 = q / s, z2 = r / s;
            q /= p; r /= p;
            for (let j = k; j <= nn; j++) {
              let pp = a[k][j] + q * a[k + 1][j];
              if (k !== nn - 1) { pp += r * a[k + 2][j]; a[k + 2][j] -= pp * z2; }
              a[k + 1][j] -= pp * y2; a[k][j] -= pp * x2;
            }
            const mmin = nn < k + 3 ? nn : k + 3;
            for (let i = l; i <= mmin; i++) {
              let pp = x2 * a[i][k] + y2 * a[i][k + 1];
              if (k !== nn - 1) { pp += z2 * a[i][k + 2]; a[i][k + 2] -= pp * r; }
              a[i][k + 1] -= pp * q; a[i][k] -= pp;
            }
          }
        }
      }
    } while (l < nn - 1);
  }
  return { re: wr, im: wi };
}
