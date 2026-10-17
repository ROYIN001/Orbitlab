/**
 * Inertial navigation aided by GNSS and a star tracker (roadmap G02).
 *
 * At every control step the navigation takes the IMU's increments since the
 * previous step — the rotation Δθ and the specific-force velocity Δv the
 * gyros and accelerometers measure, with their errors (src/physics/nav/sensors.ts)
 * — and integrates them in a strapdown mechanisation in the Earth-centred
 * inertial frame, with the same J2 gravity the simulation flies. An
 * error-state extended Kalman filter carries the covariance of 27 errors —
 * position, velocity, attitude, and the gyros' and accelerometers' turn-on
 * biases, in-run biases and scale factors — and corrects the solution with
 * GNSS position and velocity fixes and star-tracker attitudes when they come
 * (Groves, *Principles of GNSS, Inertial, and Multisensor Integrated
 * Navigation Systems*, 2nd ed., §14.2 and §5.2).
 *
 * Each sensor's bias is the sum of two, in the truth and in the filter alike
 * (Groves ch. 4 and §14.2): the turn-on bias, drawn at power-up and constant
 * through the flight (a random constant: no dynamics, no process noise), and
 * the in-run bias, a first-order Gauss–Markov process of the bias
 * instability's size with τ = 300 s. Between fixes the filter holds its
 * estimate of the first and relaxes its estimate of the second with e^(−dt/τ).
 *
 * Errors are true less estimated: δr = r − r̂, δv = v − v̂, and the attitude
 * error φ an ECI rotation with C = (I + [φ×]) Ĉ; the biases and scale factors
 * likewise. The sensors' misalignment and the GNSS antenna's lever arm are
 * left out.
 */
import { add, cross, dot, norm, normalize, scale, sub, v3, type Vec3 } from '../vec3';
import { gravityJ2 } from '../gravity';
import { MU_EARTH } from '../constants';
import { geodeticHeight } from '../geodesy';
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
  /** Gyro bias, rad/s, and accelerometer bias, m/s², true and estimated (body axes): turn-on and in-run together. */
  gyroBias: Vec3;
  gyroBiasEstimate: Vec3;
  accelBias: Vec3;
  accelBiasEstimate: Vec3;
  gnss: 'fix' | 'outage' | 'off' | 'failed';
  starTracker: 'fix' | 'unavailable' | 'off' | 'failed';
  /** The latest innovations' sizes: GNSS position (m) and velocity (m/s), star tracker (rad). */
  innovation: { position?: number; velocity?: number; attitude?: number };
}

/** The error state: position, velocity, attitude; the gyros' and accelerometers' turn-on biases, in-run biases, scale factors. */
const N = 27, R = 0, V = 3, PHI = 6, BG_ON = 9, BA_ON = 12, BG_RUN = 15, BA_RUN = 18, SG = 21, SA = 24;
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
  // Truth of the sensors: each bias a turn-on part, constant, and an in-run part that wanders.
  private gyroBiasOn: Vec3 = v3();
  private gyroBiasRun: Vec3 = v3();
  private accelBiasOn: Vec3 = v3();
  private accelBiasRun: Vec3 = v3();
  private gyroScale: Vec3 = v3();
  private accelScale: Vec3 = v3();
  // The solution.
  private t = NaN;
  private r: Vec3 = v3();
  private v: Vec3 = v3();
  private q: Quat = { w: 1, x: 0, y: 0, z: 0 };
  private bgOn: Vec3 = v3();
  private bgRun: Vec3 = v3();
  private baOn: Vec3 = v3();
  private baRun: Vec3 = v3();
  private sg: Vec3 = v3();
  private sa: Vec3 = v3();
  private omega: Vec3 = v3();
  /** 1σ of the white noise in `omega`, rad/s */
  private omegaNoise = 0;
  private readonly P = new Float64Array(N * N);
  private readonly F = new Float64Array(N * N);
  private readonly work = new Float64Array(N * N);
  /** Φ's non-zero entries row by row (at most 99 of its 729), and the process noise's diagonal. */
  private readonly phiRow = new Int32Array(N + 1);
  private readonly phiCol = new Int32Array(N * N);
  private readonly phiVal = new Float64Array(N * N);
  private readonly qd = new Float64Array(N);
  /** The scalar updates' correction, and the covariance's column they work with. */
  private readonly dx = new Float64Array(N);
  private readonly column = new Float64Array(N);
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

  /**
   * Aligned on the pad: the truth, with the alignment's and the survey's errors, and the sensors' errors drawn —
   * the turn-on biases for the whole flight, the in-run biases from their steady spread.
   */
  private initialise(t: number, r: Vec3, v: Vec3, q: Quat): void {
    const s = this.sig;
    this.gyroBiasOn = this.gauss(s.gTurnOn);
    this.accelBiasOn = this.gauss(s.aTurnOn);
    this.gyroScale = this.gauss(this.imu.gyroScalePpm * 1e-6);
    this.accelScale = this.gauss(this.imu.accelScalePpm * 1e-6);
    const posSigma = 1, velSigma = 0.01;
    this.t = t;
    this.r = add(r, this.gauss(posSigma));
    this.v = add(v, this.gauss(velSigma));
    this.q = quatNormalize(quatMultiply(expQ(this.gauss(s.align)), q));
    this.gyroBiasRun = this.gauss(s.gInstab);
    this.accelBiasRun = this.gauss(s.aInstab);
    this.bgOn = v3(); this.bgRun = v3(); this.baOn = v3(); this.baRun = v3(); this.sg = v3(); this.sa = v3();
    this.P.fill(0);
    const sigma0: [number, number][] = [[R, posSigma], [V, velSigma], [PHI, s.align], [BG_ON, s.gTurnOn], [BA_ON, s.aTurnOn],
      [BG_RUN, s.gInstab], [BA_RUN, s.aInstab], [SG, this.imu.gyroScalePpm * 1e-6], [SA, this.imu.accelScalePpm * 1e-6]];
    for (const [at, d] of sigma0) for (let i = at; i < at + 3; i++) this.P[i * N + i] = Math.max(d * d, 1e-30);
  }

  /** The true biases: turn-on and in-run together. */
  private get gyroBias(): Vec3 { return add(this.gyroBiasOn, this.gyroBiasRun); }
  private get accelBias(): Vec3 { return add(this.accelBiasOn, this.accelBiasRun); }

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
  /**
   * The turn-on biases alone, true and estimated, with the filter's 1σ of each estimate (body axes; rad/s for the
   * gyros, m/s² for the accelerometers): how far the filter has told the part that stays from the part that wanders.
   */
  get turnOnBiases(): { gyro: Vec3; gyroEstimate: Vec3; gyroSigma: Vec3; accel: Vec3; accelEstimate: Vec3; accelSigma: Vec3 } {
    const sigma = (at: number) => v3(Math.sqrt(this.P[at * N + at]), Math.sqrt(this.P[(at + 1) * N + at + 1]), Math.sqrt(this.P[(at + 2) * N + at + 2]));
    return { gyro: { ...this.gyroBiasOn }, gyroEstimate: { ...this.bgOn }, gyroSigma: sigma(BG_ON),
      accel: { ...this.accelBiasOn }, accelEstimate: { ...this.baOn }, accelSigma: sigma(BA_ON) };
  }

  private propagate(t: number, v: Vec3, q: Quat): void {
    const last = this.last!, dt = t - last.t, s = this.sig;
    // The IMU: the true rotation and the true non-gravitational velocity change (the velocity
    // less free fall from the last state), with scale factor, bias and noise; the in-run biases wander
    // (exactly for any step: decay e^(−dt/τ), and noise that keeps their spread at the instability).
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
    this.gyroBiasRun = add(scale(this.gyroBiasRun, decay), this.gauss(s.gInstab * drive));
    this.accelBiasRun = add(scale(this.accelBiasRun, decay), this.gauss(s.aInstab * drive));
    // Strapdown: attitude; the specific force at mid-step; position and velocity as free fall plus it.
    const bg = add(this.bgOn, this.bgRun), ba = add(this.baOn, this.baRun);
    const dThetaHat = sub(sub(dTheta, scale(bg, dt)), mul(this.sg, dTheta)), dVHat = sub(sub(dV, scale(ba, dt)), mul(this.sa, dV));
    // The estimates follow the model: the turn-on biases' are held, the in-run biases' relax as those biases do
    // (the filter's δḃ = −δb/τ holds only if b̂ follows b̂˙ = −b̂/τ).
    this.bgRun = scale(this.bgRun, decay); this.baRun = scale(this.baRun, decay);
    const qMid = quatMultiply(this.q, expQ(scale(dThetaHat, 0.5)));
    const q1 = quatNormalize(quatMultiply(this.q, expQ(dThetaHat)));
    const dvEci = quatRotate(qMid, dVHat), fall = freeFall(this.r, this.v, dt);
    const v1 = add(fall.v, dvEci), r1 = add(fall.r, scale(dvEci, dt / 2));
    // The covariance, in steps of at most a second: Φ = I + F h, plus Q h. Both parts of a bias enter alike.
    const fb = axes(scale(dVHat, 1 / dt)), wb = axes(scale(dThetaHat, 1 / dt));
    const C = quatToMatrix(qMid), f = axes(scale(dvEci, 1 / dt)), rm = norm(this.r), gg = MU_EARTH / (rm * rm * rm), rh = axes(scale(this.r, 1 / rm));
    const F = this.F;
    F.fill(0);
    const set = (i: number, j: number, value: number) => { F[i * N + j] = value; };
    for (let k = 0; k < 3; k++) {
      set(R + k, V + k, 1);
      for (let j = 0; j < 3; j++) {
        set(V + k, R + j, gg * (3 * rh[k] * rh[j] - (k === j ? 1 : 0)));   // gravity gradient
        set(V + k, BA_ON + j, -C[k * 3 + j]);                               // δv̇ = … − C (δb_a,on + δb_a,run)
        set(V + k, BA_RUN + j, -C[k * 3 + j]);
        set(PHI + k, BG_ON + j, -C[k * 3 + j]);                             // φ̇ = −C (δb_g,on + δb_g,run)
        set(PHI + k, BG_RUN + j, -C[k * 3 + j]);
        set(V + k, SA + j, -C[k * 3 + j] * fb[j]);                          //       − C diag(f) δs_a
        set(PHI + k, SG + j, -C[k * 3 + j] * wb[j]);                        //       − C diag(ω) δs_g
      }
      set(BG_RUN + k, BG_RUN + k, -1 / BIAS_CORRELATION_S);                // δḃ_run = −δb_run/τ; δḃ_on = 0
      set(BA_RUN + k, BA_RUN + k, -1 / BIAS_CORRELATION_S);
    }
    // δv̇ = −[f×] φ
    set(V + 0, PHI + 1, f[2]); set(V + 0, PHI + 2, -f[1]);
    set(V + 1, PHI + 0, -f[2]); set(V + 1, PHI + 2, f[0]);
    set(V + 2, PHI + 0, f[1]); set(V + 2, PHI + 1, -f[0]);
    // The filter's tuning margin under thrust: velocity noise of 10⁻⁴ of the specific force per √s, for
    // what it leaves out (vibration, the step's discretisation, misalignment).
    const margin = (THRUST_NOISE * norm(dvEci) / dt) ** 2, qd = this.qd;
    for (let k = 0; k < 3; k++) {
      qd[V + k] = s.aVrw ** 2 + margin;
      qd[PHI + k] = s.gArw ** 2;
      qd[BG_RUN + k] = 2 * s.gInstab ** 2 / BIAS_CORRELATION_S;
      qd[BA_RUN + k] = 2 * s.aInstab ** 2 / BIAS_CORRELATION_S;
    }
    const steps = Math.max(1, Math.ceil(dt / 1)), h = dt / steps, P = this.P, W = this.work;
    const row = this.phiRow, col = this.phiCol, val = this.phiVal;
    let nz = 0;
    for (let i = 0; i < N; i++) {
      row[i] = nz;
      for (let j = 0; j < N; j++) { const a = F[i * N + j] * h + (i === j ? 1 : 0); if (a !== 0) { col[nz] = j; val[nz++] = a; } }
    }
    row[N] = nz;
    for (let step = 0; step < steps; step++) {
      // W = Φ P, then P = W Φᵀ over Φ's non-zero entries: the upper triangle, mirrored, for P is symmetric.
      W.fill(0);
      for (let i = 0; i < N; i++) for (let p = row[i]; p < row[i + 1]; p++) { const a = val[p], k = col[p] * N; for (let j = 0; j < N; j++) W[i * N + j] += a * P[k + j]; }
      for (let i = 0; i < N; i++) for (let j = i; j < N; j++) {
        let sum = 0;
        for (let p = row[j]; p < row[j + 1]; p++) sum += W[i * N + col[p]] * val[p];
        P[i * N + j] = sum; P[j * N + i] = sum;
      }
      for (let i = 0; i < N; i++) P[i * N + i] += qd[i] * h;
    }
    this.q = q1; this.v = v1; this.r = r1; this.t = t;
    this.omega = scale(dThetaHat, 1 / dt);
    this.omegaNoise = s.gArw / Math.sqrt(dt);
  }

  private outage(t: number): boolean { return this.aiding.gnssOutages.some(([a, b]) => t >= a && t < b); }

  /** GNSS fixes and star-tracker attitudes that are due, as scalar updates; then the correction folded in. */
  private aid(t: number, r: Vec3, v: Vec3, q: Quat, omegaBody: Vec3): void {
    const a = this.aiding, x = this.dx.fill(0), pi = this.column;
    let updated = false;
    const lost = this.faults?.aidingLost(t);
    const update = (index: number, residual: number, variance: number) => {
      const P = this.P, S = P[index * N + index] + variance;
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
    const high = geodeticHeight(r) >= a.starTrackerMinAltitudeKm * 1000, slow = norm(omegaBody) <= a.starTrackerMaxRateDegS * Math.PI / 180;
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
    this.bgOn = add(this.bgOn, vec(x, BG_ON));
    this.bgRun = add(this.bgRun, vec(x, BG_RUN));
    this.baOn = add(this.baOn, vec(x, BA_ON));
    this.baRun = add(this.baRun, vec(x, BA_RUN));
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
      gyroBias: this.gyroBias, gyroBiasEstimate: add(this.bgOn, this.bgRun), accelBias: this.accelBias, accelBiasEstimate: add(this.baOn, this.baRun),
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
