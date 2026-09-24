/**
 * The navigation sensors of roadmap G02: the inertial measurement unit's error
 * model and its grades, the GNSS receiver and the star tracker.
 *
 * Gyro and accelerometer per axis: a turn-on bias, an in-run bias that wanders
 * as a first-order Gauss–Markov process (the "bias instability"), a scale-factor
 * error, and white noise given as angle and velocity random walk. The grades
 * are textbook orders of magnitude (Groves, *Principles of GNSS, Inertial, and
 * Multisensor Integrated Navigation Systems*, 2nd ed., ch. 4): a ring-laser
 * navigation-grade unit, a fibre-optic tactical-grade unit, a MEMS unit.
 */
export type ImuGrade = 'navigation' | 'tactical' | 'mems';
export const IMU_GRADES: readonly ImuGrade[] = ['navigation', 'tactical', 'mems'];

/** An IMU's errors, in the units data sheets give them. */
export interface ImuSpec {
  /** gyro: turn-on bias, deg/h (1σ); in-run bias instability, deg/h, with its correlation time, s */
  gyroBiasDegH: number;
  gyroBiasInstabilityDegH: number;
  /** angle random walk, deg/√h */
  gyroArwDegRtH: number;
  /** scale-factor error, ppm (1σ) */
  gyroScalePpm: number;
  /** accelerometer: turn-on bias and bias instability, µg; velocity random walk, m/s/√h; scale factor, ppm */
  accelBiasUg: number;
  accelBiasInstabilityUg: number;
  accelVrwMsRtH: number;
  accelScalePpm: number;
  /** the attitude the launch pad aligns the platform to, deg (1σ per axis) */
  alignmentDeg: number;
}

export const IMU_PRESETS: Readonly<Record<ImuGrade, Readonly<ImuSpec>>> = {
  navigation: { gyroBiasDegH: 0.005, gyroBiasInstabilityDegH: 0.002, gyroArwDegRtH: 0.002, gyroScalePpm: 5,
    accelBiasUg: 30, accelBiasInstabilityUg: 10, accelVrwMsRtH: 0.01, accelScalePpm: 50, alignmentDeg: 0.005 },
  tactical: { gyroBiasDegH: 1, gyroBiasInstabilityDegH: 0.3, gyroArwDegRtH: 0.05, gyroScalePpm: 100,
    accelBiasUg: 500, accelBiasInstabilityUg: 50, accelVrwMsRtH: 0.05, accelScalePpm: 300, alignmentDeg: 0.05 },
  mems: { gyroBiasDegH: 30, gyroBiasInstabilityDegH: 5, gyroArwDegRtH: 0.3, gyroScalePpm: 1000,
    accelBiasUg: 5000, accelBiasInstabilityUg: 200, accelVrwMsRtH: 0.2, accelScalePpm: 2000, alignmentDeg: 0.3 },
};
/** Correlation time of the in-run biases, s. */
export const BIAS_CORRELATION_S = 300;

/** Accepted ranges of each figure (the panel's and the tools'). */
export const IMU_LIMITS: Readonly<Record<keyof ImuSpec, readonly [number, number]>> = {
  gyroBiasDegH: [0, 1000], gyroBiasInstabilityDegH: [0, 100], gyroArwDegRtH: [0, 10], gyroScalePpm: [0, 20000],
  accelBiasUg: [0, 50000], accelBiasInstabilityUg: [0, 5000], accelVrwMsRtH: [0, 5], accelScalePpm: [0, 20000], alignmentDeg: [0, 5],
};

/** GNSS position and velocity fixes, and the star tracker's attitude, with their availability. */
export interface AidingSpec {
  gnss: boolean;
  /** fix noise, m and m/s (1σ per axis), and rate, Hz */
  gnssPositionM: number;
  gnssVelocityMs: number;
  gnssRateHz: number;
  /** mission times without fixes, s: [start, end) */
  gnssOutages: ReadonlyArray<readonly [number, number]>;
  starTracker: boolean;
  /** attitude noise, arcsec (1σ per axis); rate, Hz; it sees stars above this altitude and below this body rate */
  starTrackerArcsec: number;
  starTrackerRateHz: number;
  starTrackerMinAltitudeKm: number;
  starTrackerMaxRateDegS: number;
}

export const AIDING_DEFAULTS: Readonly<AidingSpec> = {
  gnss: true, gnssPositionM: 5, gnssVelocityMs: 0.05, gnssRateHz: 1, gnssOutages: [],
  starTracker: true, starTrackerArcsec: 10, starTrackerRateHz: 1, starTrackerMinAltitudeKm: 150, starTrackerMaxRateDegS: 1,
};

export const DEG_PER_HOUR = Math.PI / 180 / 3600;
export const DEG_PER_ROOT_HOUR = Math.PI / 180 / 60;
export const MICRO_G = 9.80665e-6;
export const MS_PER_ROOT_HOUR = 1 / 60;

/**
 * A seeded normal generator (mulberry32 and Box–Muller): the navigation's own stream, so that
 * turning it on never moves the wind's random numbers.
 */
export class NormalStream {
  private state: number;
  private spare: number | undefined;
  constructor(seed: number) { this.state = (seed >>> 0) ^ 0x9e3779b9; }
  private uniform(): number {
    let t = (this.state = (this.state + 0x6d2b79f5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return (((t ^ (t >>> 14)) >>> 0) + 0.5) / 4294967296;
  }
  next(): number {
    if (this.spare !== undefined) { const s = this.spare; this.spare = undefined; return s; }
    const u = this.uniform(), v = this.uniform(), r = Math.sqrt(-2 * Math.log(u));
    this.spare = r * Math.sin(2 * Math.PI * v);
    return r * Math.cos(2 * Math.PI * v);
  }
}
