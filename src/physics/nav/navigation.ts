/**
 * Inertial navigation aided by GNSS and a star tracker (roadmap G02).
 *
 * At every control step the navigation takes the IMU's increments since the
 * previous step — the rotation Δθ and the specific-force velocity Δv the
 * gyros and accelerometers measure, with their errors (src/physics/nav/sensors.ts)
 * — and integrates them in a strapdown mechanisation in the Earth-centred
 * inertial frame, with the same J2 gravity the simulation flies. An
 * error-state extended Kalman filter carries the covariance of 21 errors —
 * position, velocity, attitude, and the gyros' and accelerometers' biases and
 * scale factors — and corrects
 * the solution with GNSS position and velocity fixes and star-tracker
 * attitudes when they come (Groves, *Principles of GNSS, Inertial, and
 * Multisensor Integrated Navigation Systems*, 2nd ed., §14.2 and §5.2).
 *
 * Errors are true less estimated: δr = r − r̂, δv = v − v̂, and the attitude
 * error φ an ECI rotation with C = (I + [φ×]) Ĉ; the biases and scale factors
 * likewise. The sensors' misalignment and the GNSS antenna's lever arm are
 * left out.
 */
import { add, cross, dot, norm, normalize, scale, sub, v3, type Vec3 } from '../vec3';
import { gravityJ2 } from '../gravity';
import { MU_EARTH, R_EARTH } from '../constants';
import { quatFromAxisAngle, quatMultiply, quatNormalize, quatRotate, quatSlerp, quatToMatrix, type Quat } from '../rigid/math';
import { BIAS_CORRELATION_S, DEG_PER_HOUR, DEG_PER_ROOT_HOUR, MICRO_G, MS_PER_ROOT_HOUR, NormalStream, type AidingSpec, type ImuSpec } from './sensors';

export interface NavigationOptions { imu: ImuSpec; aiding: AidingSpec; seed: number }
/**
 * G08: failures of the sensors the navigation takes (src/physics/rigid/faults.ts): the error the
 * failed IMU adds to the increments between two updates (a rotation, rad, and a velocity, m/s, in
 * body axes), and aiding that has failed.
 */
export interface NavigationFaultHooks {
  increment(t0: number, t1: number): { dTheta: Vec3; dV: Vec3 } | undefined;
  aidingLost(t: number): { gnss: boolean; starTracker: boolean };
}

/** What the navigation has done, for the telemetry: errors against the filter's own σ, and the aiding. */
export interface NavigationRecord {
  t: number;
  /** The estimate. */
  r: Vec3;
  v: Vec3;
  /** True less estimated position and velocity in the true orbit's radial, along-track and cross-track axes, m and m/s. */
  positionError: Vec3;
  velocityError: Vec3;
  /** The attitude error, rad, in body axes (x roll, y, z), and the filter's 1σ of each, in the same axes. */
  attitudeError: Vec3;
  positionSigma: Vec3;
  velocitySigma: Vec3;
  attitudeSigma: Vec3;
  /** Gyro bias, rad/s, and accelerometer bias, m/s², true and estimated (body axes). */
  gyroBias: Vec3;
  gyroBiasEstimate: Vec3;
  accelBias: Vec3;
  accelBiasEstimate: Vec3;
  gnss: 'fix' | 'outage' | 'off' | 'failed';
  starTracker: 'fix' | 'unavailable' | 'off' | 'failed';
  /** The latest innovations' sizes: GNSS position (m) and velocity (m/s), star tracker (rad). */
  innovation: { position?: number; velocity?: number; attitude?: number };
}

const N = 21, R = 0, V = 3, PHI = 6, BG = 9, BA = 12, SG = 15, SA = 18;
/** Velocity process noise per unit of specific force, 1/√s: the filter's tuning margin under thrust. */
const THRUST_NOISE = 1e-4;
const axes = (v: Vec3) => [v.x, v.y, v.z];
const vec = (a: ArrayLike<number>, i = 0): Vec3 => v3(a[i], a[i + 1], a[i + 2]);
const conj = (q: Quat): Quat => ({ w: q.w, x: -q.x, y: -q.y, z: -q.z });
/** The rotation vector of a unit quaternion. */
function rotationVector(q: Quat): Vec3 {
  const s = q.w < 0 ? -1 : 1, w = s * q.w, v = v3(s * q.x, s * q.y, s * q.z), n = norm(v);
  if (n < 1e-12) return scale(v, 2);
  return scale(v, 2 * Math.atan2(n, w) / n);
}
function expQ(phi: Vec3): Quat {
  const a = norm(phi);
  return a < 1e-15 ? { w: 1, x: phi.x / 2, y: phi.y / 2, z: phi.z / 2 } : quatFromAxisAngle(scale(phi, 1 / a), a);
}
/** Radial, along-track, cross-track unit vectors of a position and velocity. */
function rsw(r: Vec3, v: Vec3): [Vec3, Vec3, Vec3] {
  const rh = normalize(r), w = normalize(cross(r, v)), s = cross(w, rh);
  return [rh, s, w];
}

/** Free fall under J2 gravity from r, v over dt (RK4, steps of at most 0.5 s). */
function freeFall(r: Vec3, v: Vec3, dt: number): { r: Vec3; v: Vec3 } {
  const n = Math.max(1, Math.ceil(dt / 0.5)), h = dt / n;
  let rr = r, vv = v;
  for (let i = 0; i < n; i++) {
    const a1 = gravityJ2(rr), r2 = add(rr, scale(vv, h / 2)), v2 = add(vv, scale(a1, h / 2));
    const a2 = gravityJ2(r2), r3 = add(rr, scale(v2, h / 2)), v3_ = add(vv, scale(a2, h / 2));
    const a3 = gravityJ2(r3), r4 = add(rr, scale(v3_, h)), v4 = add(vv, scale(a3, h));
    const a4 = gravityJ2(r4);
    rr = add(rr, scale(add(add(vv, scale(add(v2, v3_), 2)), v4), h / 6));
    vv = add(vv, scale(add(add(a1, scale(add(a2, a3), 2)), a4), h / 6));
  }
  return { r: rr, v: vv };
}

export class NavigationSystem {
  private readonly noise: NormalStream;
  private readonly imu: ImuSpec;
  private readonly aiding: AidingSpec;
  // Truth of the sensors.
  private gyroBias: Vec3 = v3();
  private accelBias: Vec3 = v3();
  private gyroScale: Vec3 = v3();
  private accelScale: Vec3 = v3();
  // The solution.
  private t = NaN;
  private r: Vec3 = v3();
  private v: Vec3 = v3();
  private q: Quat = { w: 1, x: 0, y: 0, z: 0 };
  private bg: Vec3 = v3();
  private ba: Vec3 = v3();
  private sg: Vec3 = v3();
  private sa: Vec3 = v3();
  private omega: Vec3 = v3();
  /** 1σ of the white noise in `omega`, rad/s */
  private omegaNoise = 0;
  private readonly P = new Float64Array(N * N);
  private readonly F = new Float64Array(N * N);
  private readonly Phi = new Float64Array(N * N);
  private readonly work = new Float64Array(N * N);
  // The previous update's truth, for the IMU's increments.
  private last?: { t: number; r: Vec3; v: Vec3; q: Quat };
  private nextGnss = -Infinity;
  private nextStar = -Infinity;
  private status: { gnss: NavigationRecord['gnss']; star: NavigationRecord['starTracker'] } = { gnss: 'off', star: 'off' };
  private innovation: NavigationRecord['innovation'] = {};
  /** G08: the sensors' failures, when the flight carries any. */
  faults?: NavigationFaultHooks;

  constructor(options: NavigationOptions) {
    this.imu = { ...options.imu };
    this.aiding = { ...options.aiding, gnssOutages: options.aiding.gnssOutages.map((o) => [o[0], o[1]] as const) };
    this.noise = new NormalStream(options.seed);
  }

  private gauss(sigma: number): Vec3 { return v3(sigma * this.noise.next(), sigma * this.noise.next(), sigma * this.noise.next()); }
  private get sig() {
    const s = this.imu;
    return {
      gTurnOn: s.gyroBiasDegH * DEG_PER_HOUR, gInstab: s.gyroBiasInstabilityDegH * DEG_PER_HOUR, gArw: s.gyroArwDegRtH * DEG_PER_ROOT_HOUR,
      aTurnOn: s.accelBiasUg * MICRO_G, aInstab: s.accelBiasInstabilityUg * MICRO_G, aVrw: s.accelVrwMsRtH * MS_PER_ROOT_HOUR,
      align: s.alignmentDeg * Math.PI / 180,
    };
  }

  /** Aligned on the pad: the truth, with the alignment's and the survey's errors, and the sensors' turn-on errors drawn. */
  private initialise(t: number, r: Vec3, v: Vec3, q: Quat): void {
    const s = this.sig;
    this.gyroBias = this.gauss(Math.hypot(s.gTurnOn, s.gInstab));
    this.accelBias = this.gauss(Math.hypot(s.aTurnOn, s.aInstab));
    this.gyroScale = this.gauss(this.imu.gyroScalePpm * 1e-6);
    this.accelScale = this.gauss(this.imu.accelScalePpm * 1e-6);
    const posSigma = 1, velSigma = 0.01;
    this.t = t;
    this.r = add(r, this.gauss(posSigma));
    this.v = add(v, this.gauss(velSigma));
    this.q = quatNormalize(quatMultiply(expQ(this.gauss(s.align)), q));
    this.bg = v3(); this.ba = v3(); this.sg = v3(); this.sa = v3();
    this.P.fill(0);
    const diag = [posSigma, posSigma, posSigma, velSigma, velSigma, velSigma, s.align, s.align, s.align,
      ...Array(3).fill(Math.hypot(s.gTurnOn, s.gInstab)), ...Array(3).fill(Math.hypot(s.aTurnOn, s.aInstab)),
      ...Array(3).fill(this.imu.gyroScalePpm * 1e-6), ...Array(3).fill(this.imu.accelScalePpm * 1e-6)];
    diag.forEach((d, i) => { this.P[i * N + i] = Math.max(d * d, 1e-30); });
  }

  /**
   * What the autopilot reads at `t`: the navigation's attitude and bias-corrected rate. The first
   * call aligns the navigation; a later one after a gap (a held coast) first carries it over the gap.
   * `q` and `omegaBody` are the IMU case's own (with P05, the bent structure's at its station).
   */
  reading(t: number, r: Vec3, v: Vec3, q: Quat, omegaBody: Vec3): { attitudeQ: Quat; omegaBody: Vec3 } {
    if (!this.last) {
      this.initialise(t, r, v, q);
      this.omega = add(omegaBody, this.gyroBias);
      this.last = { t, r, v, q };
    } else if (t > this.last.t + 1e-9) this.advance(t, r, v, q, omegaBody);
    else if (r !== this.last.r || v !== this.last.v) {
      // The same instant, another state: a staging moved the centre of mass the flight is tracked
      // by. The vehicle knows its own geometry, so the solution moves with it.
      this.r = add(this.r, sub(r, this.last.r));
      this.v = add(this.v, sub(v, this.last.v));
      this.last = { t, r, v, q };
    }
    return { attitudeQ: this.q, omegaBody: this.omega };
  }

  /** Carry the solution to `t` with the IMU's increments since the last update, then take the aiding that is due. */
  advance(t: number, r: Vec3, v: Vec3, q: Quat, omegaBody: Vec3): void {
    if (!this.last || !(t > this.last.t)) return;
    this.propagate(t, v, q);
    this.aid(t, r, v, q, omegaBody);
    this.last = { t, r, v, q };
  }

  /** The navigation's solution, for guidance and the cut-off. */
  get estimate(): { t: number; r: Vec3; v: Vec3; attitudeQ: Quat } { return { t: this.t, r: this.r, v: this.v, attitudeQ: this.q }; }
  get aligned(): boolean { return !!this.last; }
  /** The bias-corrected body rate of the last step, rad/s. */
  get rate(): Vec3 { return this.omega; }
  /** 1σ of the white noise in that rate, rad/s: the gyro's random walk over the step it was read over. */
  get rateNoise(): number { return this.omegaNoise; }

  private propagate(t: number, v: Vec3, q: Quat): void {
    const last = this.last!, dt = t - last.t, s = this.sig;
    // The IMU: the true rotation and the true non-gravitational velocity change (the velocity
    // less free fall from the last state), with scale factor, bias and noise; the in-run biases wander.
    const dThetaTrue = rotationVector(quatMultiply(conj(last.q), q));
    const dvSfEci = sub(v, freeFall(last.r, last.v, dt).v);
    const dvTrue = quatRotate(conj(quatSlerp(last.q, q, 0.5)), dvSfEci);
    const mul = (a: Vec3, b: Vec3) => v3(a.x * b.x, a.y * b.y, a.z * b.z);
    let dTheta = add(add(add(dThetaTrue, mul(this.gyroScale, dThetaTrue)), scale(this.gyroBias, dt)), this.gauss(s.gArw * Math.sqrt(dt)));
    let dV = add(add(add(dvTrue, mul(this.accelScale, dvTrue)), scale(this.accelBias, dt)), this.gauss(s.aVrw * Math.sqrt(dt)));
    // G08: what a failed IMU adds.
    const fault = this.faults?.increment(last.t, t);
    if (fault) { dTheta = add(dTheta, fault.dTheta); dV = add(dV, fault.dV); }
    const decay = Math.exp(-dt / BIAS_CORRELATION_S), drive = Math.sqrt(1 - decay * decay);
    this.gyroBias = add(scale(this.gyroBias, decay), this.gauss(s.gInstab * drive));
    this.accelBias = add(scale(this.accelBias, decay), this.gauss(s.aInstab * drive));
    // Strapdown: attitude; the specific force at mid-step; position and velocity as free fall plus it.
    const dThetaHat = sub(sub(dTheta, scale(this.bg, dt)), mul(this.sg, dTheta)), dVHat = sub(sub(dV, scale(this.ba, dt)), mul(this.sa, dV));
    const qMid = quatMultiply(this.q, expQ(scale(dThetaHat, 0.5)));
    const q1 = quatNormalize(quatMultiply(this.q, expQ(dThetaHat)));
    const dvEci = quatRotate(qMid, dVHat), fall = freeFall(this.r, this.v, dt);
    const v1 = add(fall.v, dvEci), r1 = add(fall.r, scale(dvEci, dt / 2));
    // The covariance, in steps of at most a second: Φ = I + F h, plus Q h.
    const fb = axes(scale(dVHat, 1 / dt)), wb = axes(scale(dThetaHat, 1 / dt));
    const C = quatToMatrix(qMid), f = axes(scale(dvEci, 1 / dt)), rm = norm(this.r), gg = MU_EARTH / (rm * rm * rm), rh = axes(scale(this.r, 1 / rm));
    const F = this.F;
    F.fill(0);
    const set = (i: number, j: number, value: number) => { F[i * N + j] = value; };
    for (let k = 0; k < 3; k++) {
      set(R + k, V + k, 1);
      for (let j = 0; j < 3; j++) {
        set(V + k, R + j, gg * (3 * rh[k] * rh[j] - (k === j ? 1 : 0)));   // gravity gradient
        set(V + k, BA + j, -C[k * 3 + j]);                                  // δv̇ = … − C δb_a
        set(PHI + k, BG + j, -C[k * 3 + j]);                                // φ̇ = −C δb_g
        set(V + k, SA + j, -C[k * 3 + j] * fb[j]);                          //       − C diag(f) δs_a
        set(PHI + k, SG + j, -C[k * 3 + j] * wb[j]);                        //       − C diag(ω) δs_g
      }
      set(BG + k, BG + k, -1 / BIAS_CORRELATION_S);
      set(BA + k, BA + k, -1 / BIAS_CORRELATION_S);
    }
    // δv̇ = −[f×] φ
    set(V + 0, PHI + 1, f[2]); set(V + 0, PHI + 2, -f[1]);
    set(V + 1, PHI + 0, -f[2]); set(V + 1, PHI + 2, f[0]);
    set(V + 2, PHI + 0, f[1]); set(V + 2, PHI + 1, -f[0]);
    // The filter's tuning margin under thrust: velocity noise of 10⁻⁴ of the specific force per √s, for
    // what it leaves out (vibration, the step's discretisation, misalignment).
    const margin = (THRUST_NOISE * norm(dvEci) / dt) ** 2;
    const qd = [0, 0, 0, s.aVrw ** 2 + margin, s.aVrw ** 2 + margin, s.aVrw ** 2 + margin, s.gArw ** 2, s.gArw ** 2, s.gArw ** 2,
      ...Array(3).fill(2 * s.gInstab ** 2 / BIAS_CORRELATION_S), ...Array(3).fill(2 * s.aInstab ** 2 / BIAS_CORRELATION_S), 0, 0, 0, 0, 0, 0];
    const steps = Math.max(1, Math.ceil(dt / 1)), h = dt / steps, P = this.P, Phi = this.Phi, W = this.work;
    for (let i = 0; i < N * N; i++) Phi[i] = F[i] * h;
    for (let i = 0; i < N; i++) Phi[i * N + i] += 1;
    for (let step = 0; step < steps; step++) {
      W.fill(0);
      for (let i = 0; i < N; i++) for (let k = 0; k < N; k++) { const a = Phi[i * N + k]; if (a === 0) continue; for (let j = 0; j < N; j++) W[i * N + j] += a * P[k * N + j]; }
      P.fill(0);
      for (let i = 0; i < N; i++) for (let k = 0; k < N; k++) { const a = W[i * N + k]; if (a === 0) continue; for (let j = 0; j < N; j++) P[i * N + j] += a * Phi[j * N + k]; }
      qd.forEach((qq, i) => { P[i * N + i] += qq * h; });
    }
    this.q = q1; this.v = v1; this.r = r1; this.t = t;
    this.omega = scale(dThetaHat, 1 / dt);
    this.omegaNoise = s.gArw / Math.sqrt(dt);
  }

  private outage(t: number): boolean { return this.aiding.gnssOutages.some(([a, b]) => t >= a && t < b); }

  /** GNSS fixes and star-tracker attitudes that are due, as scalar updates; then the correction folded in. */
  private aid(t: number, r: Vec3, v: Vec3, q: Quat, omegaBody: Vec3): void {
    const a = this.aiding, x = new Float64Array(N);
    let updated = false;
    const lost = this.faults?.aidingLost(t);
    const update = (index: number, residual: number, variance: number) => {
      const P = this.P, S = P[index * N + index] + variance, pi = new Float64Array(N);
      for (let k = 0; k < N; k++) pi[k] = P[k * N + index];
      const z = residual - x[index];
      for (let k = 0; k < N; k++) x[k] += (pi[k] / S) * z;
      for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) P[i * N + j] -= pi[i] * pi[j] / S;
      updated = true;
    };
    this.status.gnss = !a.gnss ? 'off' : lost?.gnss ? 'failed' : this.outage(t) ? 'outage' : 'fix';
    if (a.gnss && !lost?.gnss && t + 1e-9 >= this.nextGnss) {
      this.nextGnss = t + 1 / a.gnssRateHz;
      if (!this.outage(t)) {
        const dr = sub(add(r, this.gauss(a.gnssPositionM)), this.r), dv = sub(add(v, this.gauss(a.gnssVelocityMs)), this.v);
        this.innovation = { ...this.innovation, position: norm(dr), velocity: norm(dv) };
        axes(dr).forEach((z, k) => update(R + k, z, a.gnssPositionM ** 2));
        axes(dv).forEach((z, k) => update(V + k, z, a.gnssVelocityMs ** 2));
      }
    }
    const high = norm(r) - R_EARTH >= a.starTrackerMinAltitudeKm * 1000, slow = norm(omegaBody) <= a.starTrackerMaxRateDegS * Math.PI / 180;
    this.status.star = !a.starTracker ? 'off' : lost?.starTracker ? 'failed' : high && slow ? 'fix' : 'unavailable';
    if (a.starTracker && !lost?.starTracker && high && slow && t + 1e-9 >= this.nextStar) {
      this.nextStar = t + 1 / a.starTrackerRateHz;
      const sigma = a.starTrackerArcsec * Math.PI / 180 / 3600;
      const measured = quatMultiply(q, expQ(this.gauss(sigma)));
      const phi = rotationVector(quatMultiply(measured, conj(this.q)));
      this.innovation = { ...this.innovation, attitude: norm(phi) };
      axes(phi).forEach((z, k) => update(PHI + k, z, sigma * sigma));
    }
    if (!updated) return;
    // Symmetrise, then fold the estimated errors into the solution.
    const P = this.P;
    for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) { const m = (P[i * N + j] + P[j * N + i]) / 2; P[i * N + j] = m; P[j * N + i] = m; }
    this.r = add(this.r, vec(x, R));
    this.v = add(this.v, vec(x, V));
    this.q = quatNormalize(quatMultiply(expQ(vec(x, PHI)), this.q));
    this.bg = add(this.bg, vec(x, BG));
    this.ba = add(this.ba, vec(x, BA));
    this.sg = add(this.sg, vec(x, SG));
    this.sa = add(this.sa, vec(x, SA));
  }

  /** The telemetry's record of this instant. */
  record(): NavigationRecord | undefined {
    const truth = this.last;
    if (!truth || !Number.isFinite(this.t)) return undefined;
    const [rh, sh, wh] = rsw(truth.r, truth.v), P = this.P;
    const inAxes = (d: Vec3, a: Vec3[]) => v3(dot(d, a[0]), dot(d, a[1]), dot(d, a[2]));
    const sigmaIn = (offset: number, a: Vec3[]) => v3(...a.map((u) => {
      const ua = axes(u);
      let s = 0;
      for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) s += ua[i] * P[(offset + i) * N + offset + j] * ua[j];
      return Math.sqrt(Math.max(0, s));
    }) as [number, number, number]);
    // Attitude error: C = (I + [φ×]) Ĉ, so φ = rotvec(q q̂⁻¹); in body axes through Ĉᵀ.
    const phi = rotationVector(quatMultiply(truth.q, conj(this.q)));
    const body = [quatRotate(this.q, v3(1, 0, 0)), quatRotate(this.q, v3(0, 1, 0)), quatRotate(this.q, v3(0, 0, 1))];
    return {
      t: this.t, r: { ...this.r }, v: { ...this.v },
      positionError: inAxes(sub(truth.r, this.r), [rh, sh, wh]), velocityError: inAxes(sub(truth.v, this.v), [rh, sh, wh]),
      attitudeError: inAxes(phi, body),
      positionSigma: sigmaIn(R, [rh, sh, wh]), velocitySigma: sigmaIn(V, [rh, sh, wh]), attitudeSigma: sigmaIn(PHI, body),
      gyroBias: { ...this.gyroBias }, gyroBiasEstimate: { ...this.bg }, accelBias: { ...this.accelBias }, accelBiasEstimate: { ...this.ba },
      gnss: this.status.gnss, starTracker: this.status.star, innovation: { ...this.innovation },
    };
  }
}

/** The latest navigation record carried by a telemetry sample at or before `cursor`. */
export function navigationAt(samples: readonly { t: number; rigid?: { navigation?: NavigationRecord } }[], cursor: number): NavigationRecord | undefined {
  for (let i = samples.length - 1; i >= 0; i--) {
    const s = samples[i];
    if (s.t > cursor + 1e-9) continue;
    if (s.rigid?.navigation) return s.rigid.navigation;
  }
  return undefined;
}
