import { describe, expect, it } from 'vitest';
import { Simulation } from '../src/physics/simulation';
import { vehicleById } from '../src/data/vehicles';
import { orbitById } from '../src/data/orbits';
import { DEFAULT_FAILURE, DEFAULT_GUIDANCE, guidanceForVehicle } from '../src/physics/defaults';
import { elementsFromState } from '../src/physics/orbital';
import { gravityJ2 } from '../src/physics/gravity';
import { R_EARTH } from '../src/physics/constants';
import { add, norm, scale, v3, type Vec3 } from '../src/physics/vec3';
import { quatFromAxisAngle, quatMultiply, quatRotate, type Quat } from '../src/physics/rigid/math';
import { NavigationSystem, type NavigationRecord } from '../src/physics/nav/navigation';
import { AIDING_DEFAULTS, DEG_PER_HOUR, IMU_PRESETS, MICRO_G, type ImuSpec } from '../src/physics/nav/sensors';
import { imuFor, navigationProblems, resolveNavigation } from '../src/physics/nav/config';
import { validateConfigInput } from '../src/config/validation';
import { buildTelemetryCsv } from '../src/ui/csv';
import type { MissionConfig, NavigationConfig } from '../src/types';
import { LAUNCH_TIME } from './fleet-harness';

const PERFECT: ImuSpec = { gyroBiasDegH: 0, gyroBiasInstabilityDegH: 0, gyroArwDegRtH: 0, gyroScalePpm: 0,
  accelBiasUg: 0, accelBiasInstabilityUg: 0, accelVrwMsRtH: 0, accelScalePpm: 0, alignmentDeg: 0 };
const NO_AIDING = { ...AIDING_DEFAULTS, gnss: false, starTracker: false };
const size = (v: Vec3) => Math.hypot(v.x, v.y, v.z);

/** A truth that thrusts along a slowly turning body axis, integrated finely (RK4 at 1 ms). */
function thrustingTruth(seconds: number, sample: number, visit: (t: number, r: Vec3, v: Vec3, q: Quat) => void): void {
  let r = v3(R_EARTH + 100e3, 0, 0), v = v3(0, 7000, 0), t = 0;
  const q0 = quatFromAxisAngle(v3(0, 0, 1), Math.PI / 2), rate = 0.01, h = 0.001;
  const attitude = (tt: number) => quatMultiply(q0, quatFromAxisAngle(v3(0, 0, 1), rate * tt));
  const accel = (tt: number, rr: Vec3) => add(gravityJ2(rr), quatRotate(attitude(tt), v3(20, 0, 0)));
  let next = 0;
  while (t <= seconds + 1e-9) {
    if (t >= next - 1e-9) { visit(t, r, v, attitude(t)); next += sample; }
    const a1 = accel(t, r), r2 = add(r, scale(v, h / 2)), v2 = add(v, scale(a1, h / 2));
    const a2 = accel(t + h / 2, r2), r3 = add(r, scale(v2, h / 2)), v3_ = add(v, scale(a2, h / 2));
    const a3 = accel(t + h / 2, r3), r4 = add(r, scale(v3_, h)), v4 = add(v, scale(a3, h)), a4 = accel(t + h, r4);
    r = add(r, scale(add(add(v, scale(add(v2, v3_), 2)), v4), h / 6));
    v = add(v, scale(add(add(a1, scale(add(a2, a3), 2)), a4), h / 6));
    t += h;
  }
}

describe('the strapdown navigation (roadmap G02)', () => {
  it('follows the truth with perfect sensors, keeping the attitude exactly and its velocity error from the pad', () => {
    const nav = new NavigationSystem({ imu: PERFECT, aiding: NO_AIDING, seed: 7 });
    let first: NavigationRecord | undefined, last: NavigationRecord | undefined;
    thrustingTruth(120, 0.01, (t, r, v, q) => {
      nav.reading(t, r, v, q, v3(0, 0, 0.01));
      nav.advance(t, r, v, q, v3(0, 0, 0.01));
      if (!first) first = nav.record();
      last = nav.record();
    });
    expect(size(last!.attitudeError)).toBeLessThan(1e-9);
    // The pad's velocity error (1σ 1 cm/s) carries on; the INS adds under a millimetre per second in two minutes of thrust.
    expect(size(last!.velocityError) - size(first!.velocityError)).toBeLessThan(1e-3);
  });

  it('coasts through long steps (a held coast) as through short ones', () => {
    const run = (step: number) => {
      const nav = new NavigationSystem({ imu: PERFECT, aiding: NO_AIDING, seed: 3 });
      let r = v3(R_EARTH + 400e3, 0, 0), v = v3(0, 7670, 0), t = 0;
      const q = { w: 1, x: 0, y: 0, z: 0 };
      nav.reading(0, r, v, q, v3());
      // The truth in fine RK4 steps; the navigation sees it every `step` seconds.
      const h = 0.05;
      while (t < 600 - 1e-9) {
        const a1 = gravityJ2(r), r2 = add(r, scale(v, h / 2)), v2 = add(v, scale(a1, h / 2)), a2 = gravityJ2(r2);
        const r3 = add(r, scale(v2, h / 2)), v3_ = add(v, scale(a2, h / 2)), a3 = gravityJ2(r3), r4 = add(r, scale(v3_, h)), v4 = add(v, scale(a3, h));
        r = add(r, scale(add(add(v, scale(add(v2, v3_), 2)), v4), h / 6)); v = add(v, scale(add(add(a1, scale(add(a2, a3), 2)), gravityJ2(r4)), h / 6));
        t = Math.round((t + h) * 1000) / 1000;
        if (Math.abs(t / step - Math.round(t / step)) < 1e-6) nav.advance(t, r, v, q, v3());
      }
      return nav.record()!;
    };
    const fine = run(0.05), coarse = run(30);
    expect(Math.abs(size(coarse.positionError) - size(fine.positionError))).toBeLessThan(0.05);
  });

  it('reads the rate with the gyro\'s white noise, and says how much there is (for the jets\' deadband)', () => {
    const nav = new NavigationSystem({ imu: { ...PERFECT, gyroArwDegRtH: IMU_PRESETS.tactical.gyroArwDegRtH }, aiding: NO_AIDING, seed: 5 });
    const r = v3(R_EARTH + 400e3, 0, 0), v = v3(0, 7670, 0), q = { w: 1, x: 0, y: 0, z: 0 }, dt = 0.01;
    expect(nav.rateNoise).toBe(0);
    nav.reading(0, r, v, q, v3());
    expect(nav.rateNoise).toBe(0);
    const reads: number[] = [];
    for (let k = 1; k <= 4000; k++) reads.push(nav.reading(k * dt, r, v, q, v3()).omegaBody.y);
    // 0.05°/√h over 10 ms: 1.45e-4 rad/s, about 0.008°/s.
    const expected = IMU_PRESETS.tactical.gyroArwDegRtH * Math.PI / 180 / 60 / Math.sqrt(dt);
    expect(nav.rateNoise).toBeCloseTo(expected, 12);
    const sigma = Math.sqrt(reads.reduce((a, x) => a + x * x, 0) / reads.length);
    expect(sigma / expected).toBeGreaterThan(0.95);
    expect(sigma / expected).toBeLessThan(1.05);
  });

  it('draws the same errors from the same seed, and others from another', () => {
    const errors = (seed: number) => {
      const nav = new NavigationSystem({ imu: IMU_PRESETS.mems, aiding: NO_AIDING, seed });
      thrustingTruth(5, 0.01, (t, r, v, q) => { nav.reading(t, r, v, q, v3()); nav.advance(t, r, v, q, v3()); });
      return nav.record()!.positionError;
    };
    expect(errors(11)).toEqual(errors(11));
    expect(errors(12)).not.toEqual(errors(11));
  });

  /** Free fall at 400 km under J2 (RK4, 0.5 s), the navigation advanced every `step` seconds until `until`. */
  function inOrbit(nav: NavigationSystem, until: number, step = 1): void {
    let r = v3(R_EARTH + 400e3, 0, 0), v = v3(0, 7670 * Math.cos(0.9), 7670 * Math.sin(0.9)), t = 0;
    const q = { w: 1, x: 0, y: 0, z: 0 }, h = 0.5;
    nav.reading(0, r, v, q, v3());
    while (t < until - 1e-9) {
      for (let i = 0; i < step / h; i++) {
        const a1 = gravityJ2(r), r2 = add(r, scale(v, h / 2)), v2 = add(v, scale(a1, h / 2)), a2 = gravityJ2(r2);
        const r3 = add(r, scale(v2, h / 2)), v3_ = add(v, scale(a2, h / 2)), a3 = gravityJ2(r3), r4 = add(r, scale(v3_, h)), v4 = add(v, scale(a3, h));
        r = add(r, scale(add(add(v, scale(add(v2, v3_), 2)), v4), h / 6)); v = add(v, scale(add(add(a1, scale(add(a2, a3), 2)), gravityJ2(r4)), h / 6));
      }
      t += step;
      nav.advance(t, r, v, q, v3());
    }
  }
  const AXES = ['x', 'y', 'z'] as const;

  it('keeps each sensor\'s turn-on bias for the flight: at 1500 s the biases\' spread is the turn-on and in-run together', () => {
    // MEMS: 30 °/h and 5 mg at turn-on, 5 °/h and 0.2 mg in-run. Were the turn-on part to fade with the in-run's 300 s,
    // the spread would be about the in-run's alone by now.
    const s = IMU_PRESETS.mems;
    let gyro = 0, accel = 0, n = 0;
    for (let seed = 1; seed <= 200; seed++) {
      const nav = new NavigationSystem({ imu: s, aiding: NO_AIDING, seed });
      inOrbit(nav, 1500, 30);
      const rec = nav.record()!;
      for (const k of AXES) { gyro += rec.gyroBias[k] ** 2; accel += rec.accelBias[k] ** 2; n++; }
    }
    const gyroRms = Math.sqrt(gyro / n) / DEG_PER_HOUR, accelRms = Math.sqrt(accel / n) / MICRO_G;
    // 600 draws: the RMS within about 3 % (1σ) of the expected.
    expect(gyroRms / Math.hypot(s.gyroBiasDegH, s.gyroBiasInstabilityDegH)).toBeGreaterThan(0.9);
    expect(gyroRms / Math.hypot(s.gyroBiasDegH, s.gyroBiasInstabilityDegH)).toBeLessThan(1.15);
    expect(accelRms / Math.hypot(s.accelBiasUg, s.accelBiasInstabilityUg)).toBeGreaterThan(0.9);
    expect(accelRms / Math.hypot(s.accelBiasUg, s.accelBiasInstabilityUg)).toBeLessThan(1.15);
  }, 60_000);

  it('drifts through a long coast without aiding by as much as its σ says', () => {
    // Tactical, 1500 s in orbit, 200 seeds: per axis, the mean of (error/σ)² is χ²(200)/200 for a consistent filter,
    // inside [0.70, 1.36] with 99.9 % probability.
    const M = 200, sums = { position: [0, 0, 0], velocity: [0, 0, 0], attitude: [0, 0, 0] };
    for (let seed = 1; seed <= M; seed++) {
      const nav = new NavigationSystem({ imu: IMU_PRESETS.tactical, aiding: NO_AIDING, seed });
      inOrbit(nav, 1500, 5);
      const rec = nav.record()!;
      AXES.forEach((k, j) => {
        sums.position[j] += (rec.positionError[k] / rec.positionSigma[k]) ** 2;
        sums.velocity[j] += (rec.velocityError[k] / rec.velocitySigma[k]) ** 2;
        sums.attitude[j] += (rec.attitudeError[k] / rec.attitudeSigma[k]) ** 2;
      });
    }
    for (const [what, sum] of Object.entries(sums)) for (const x of sum) {
      expect(x / M, what).toBeGreaterThan(0.70);
      expect(x / M, what).toBeLessThan(1.36);
    }
  }, 90_000);

  it('tells the turn-on biases from the in-run biases with GNSS and the star tracker on, and finds them', () => {
    // Tactical, 2000 s in orbit with fixes, 20 seeds: the estimate of the part of each bias that stays converges to it,
    // to a fraction of its 1 °/h and 500 µg, and its error is the size of the filter's σ of it.
    let gyro = 0, accel = 0, gyroZ = 0, accelZ = 0, n = 0;
    for (let seed = 1; seed <= 20; seed++) {
      const nav = new NavigationSystem({ imu: IMU_PRESETS.tactical, aiding: AIDING_DEFAULTS, seed });
      inOrbit(nav, 2000);
      const b = nav.turnOnBiases;
      for (const k of AXES) {
        const eg = b.gyroEstimate[k] - b.gyro[k], ea = b.accelEstimate[k] - b.accel[k];
        gyro += eg ** 2; accel += ea ** 2; gyroZ += (eg / b.gyroSigma[k]) ** 2; accelZ += (ea / b.accelSigma[k]) ** 2; n++;
      }
    }
    expect(Math.sqrt(gyro / n) / DEG_PER_HOUR).toBeLessThan(0.25 * IMU_PRESETS.tactical.gyroBiasDegH);
    expect(Math.sqrt(accel / n) / MICRO_G).toBeLessThan(0.1 * IMU_PRESETS.tactical.accelBiasUg);
    expect(gyroZ / n).toBeLessThan(2);
    expect(accelZ / n).toBeLessThan(2);
  }, 60_000);

  it('carries its bias estimates as the biases themselves wander, so an outage drifts as far as its σ says', () => {
    // 100 s of fixes estimate the biases; through a 600 s outage the estimates of the in-run biases relax towards zero
    // (τ 300 s), as those biases do, and those of the turn-on biases hold, as those do. Estimates held where they were
    // put the filter's position error at many times its σ by the outage's end.
    let sum = 0, n = 0;
    for (let seed = 1; seed <= 20; seed++) {
      const nav = new NavigationSystem({ imu: IMU_PRESETS.tactical, aiding: { ...AIDING_DEFAULTS, starTracker: false, gnssOutages: [[100, 700]] }, seed });
      inOrbit(nav, 699);
      const rec = nav.record()!;
      expect(rec.gnss).toBe('outage');
      for (const k of ['x', 'y', 'z'] as const) { sum += (rec.positionError[k] / rec.positionSigma[k]) ** 2; n++; }
    }
    expect(sum / n).toBeLessThan(2);
  }, 30_000);
});

describe('the navigation settings', () => {
  it('takes a grade, figures over it, and checks each against its range', () => {
    expect(imuFor({ grade: 'mems' })).toEqual(IMU_PRESETS.mems);
    expect(imuFor({ grade: 'custom', imu: { gyroBiasDegH: 2 } })).toEqual({ ...IMU_PRESETS.tactical, gyroBiasDegH: 2 });
    expect(resolveNavigation(undefined, 1)).toBeUndefined();
    expect(resolveNavigation({ seed: 5 }, 1)!.seed).toBe(5);
    expect(resolveNavigation({ gnssOutage: [10, 20] }, 1)!.aiding.gnssOutages).toEqual([[10, 20]]);
    expect(navigationProblems({ grade: 'tactical', imu: { gyroBiasDegH: 2 }, gnssOutage: [10, 20] })).toEqual([]);
    expect(navigationProblems({ grade: 'quantum' })).toEqual([{ field: 'setup.nav.grade', value: 'quantum' }]);
    expect(navigationProblems({ gnssOutage: [20, 10] })[0].field).toBe('setup.nav.outageEnd');
    expect(navigationProblems({ imu: { accelBiasUg: -1 } })[0]).toMatchObject({ field: 'setup.nav.accelBias' });
    const base = { vehicleId: 'falcon9', satelliteId: 'cubesats', siteId: 'cape', orbit: orbitById('leo'), launchTime: LAUNCH_TIME, payloadMass: 300,
      guidanceOverrides: {}, failure: { ...DEFAULT_FAILURE }, boosterRecovery: false };
    expect(validateConfigInput({ ...base, dynamics: { model: 'sixDof', wind: 'calm', seed: 1, navigation: { grade: 'mems' } } })).toEqual([]);
    expect(validateConfigInput({ ...base, dynamics: { model: 'sixDof', wind: 'calm', seed: 1, navigation: { gnssRateHz: 100 } } }))
      .toEqual([{ field: 'setup.nav.gnssRate', code: 'maximum', limit: 20 }]);
  });
});

describe('Falcon 9 flying on its navigation', () => {
  function fly(navigation: NavigationConfig | undefined, until: number): Simulation {
    const sim = new Simulation({ vehicleId: 'falcon9', satelliteId: 'cubesats', siteId: 'cape', orbit: orbitById('leo'), launchTime: LAUNCH_TIME,
      guidance: guidanceForVehicle(vehicleById('falcon9'), DEFAULT_GUIDANCE, 'sixDof'), guidanceResolved: true, failure: { ...DEFAULT_FAILURE },
      boosterRecovery: false, dynamics: { model: 'sixDof', wind: 'crosswind', seed: 20260919, ...(navigation ? { navigation } : {}) } } as MissionConfig, { headless: true });
    while (!sim.done && sim.state.t < until) sim.step(sim.suggestedDt());
    return sim;
  }
  /** The orbit the navigation believes in, less the true one, at the last sample above 150 km in the parking orbit. */
  const insertion = (sim: Simulation) => {
    const s = [...sim.telemetry].reverse().find((x) => x.rigid?.navigation && x.phase !== 'ascent' && x.alt > 150e3)!;
    const e = elementsFromState(s.rigid!.navigation!.r, s.rigid!.navigation!.v);
    return { apoapsis: e.apoapsisAlt - s.ap, periapsis: e.periapsisAlt - s.pe };
  };

  it('keeps a tactical-grade, GNSS-aided navigation within the filter\'s 3σ through staging, and the orbit it believes in true', { timeout: 240_000 }, () => {
    const sim = fly({ grade: 'tactical' }, 520);
    expect(sim.events.some((e) => e.key === 'evt.parkingOrbit')).toBe(true);
    let nees = 0, n = 0, outside = 0;
    for (const s of sim.telemetry) {
      const r = s.rigid?.navigation;
      if (!r || s.t < 5) continue;
      for (const k of ['x', 'y', 'z'] as const) {
        const z = r.positionError[k] / r.positionSigma[k];
        nees += z * z; n++; if (Math.abs(z) > 3) outside++;
      }
    }
    expect(n).toBeGreaterThan(1500);
    expect(nees / n).toBeLessThan(2.5);
    expect(outside / n).toBeLessThan(0.02);
    const e = insertion(sim);
    expect(Math.abs(e.apoapsis)).toBeLessThan(500);
    expect(Math.abs(e.periapsis)).toBeLessThan(500);
    // The CSV and the telemetry carry it.
    const header = buildTelemetryCsv(sim).split('\n')[0];
    for (const col of ['nav_pos_err_radial_m', 'nav_vel_3sigma_cross_ms', 'iso_nav_att_err_pitch_deg', 'nav_gnss']) expect(header).toContain(col);
  });

  it('drifts through a GNSS outage by as much as its filter expects, and snaps back after it', { timeout: 240_000 }, () => {
    const sim = fly({ grade: 'tactical', gnssOutage: [60, 200] }, 230);
    const at = (t: number) => sim.telemetry.find((s) => s.t >= t && s.rigid?.navigation)!.rigid!.navigation!;
    const before = at(55), during = at(195), after = at(225);
    expect(during.gnss).toBe('outage'); expect(after.gnss).toBe('fix');
    expect(size(during.positionSigma)).toBeGreaterThan(10 * size(before.positionSigma));
    expect(size(during.positionError)).toBeGreaterThan(10);
    expect(size(during.positionError)).toBeLessThan(3 * size(during.positionSigma));
    expect(size(after.positionSigma)).toBeLessThan(size(during.positionSigma) / 10);
  });

  it('puts a MEMS unit without GNSS into a different orbit than it believes, and its star tracker finds the attitude in space', { timeout: 240_000 }, () => {
    const sim = fly({ grade: 'mems', gnss: false }, 520);
    expect(sim.events.some((e) => e.key === 'evt.parkingOrbit')).toBe(true);
    const e = insertion(sim);
    expect(Math.abs(e.apoapsis)).toBeGreaterThan(5000);
    const last = sim.telemetry.at(-1)!.rigid!.navigation!;
    expect(last.gnss).toBe('off');
    expect(last.starTracker).toBe('fix');
    expect(size(last.attitudeError)).toBeLessThan(1e-3);
    expect(size(last.positionError)).toBeGreaterThan(500);
  });

  it('leaves the flight alone without it: no record, and the true state steers', () => {
    const sim = fly(undefined, 5);
    expect(sim.rigidRuntime!.navigation).toBeUndefined();
    expect(sim.telemetry.every((s) => !s.rigid?.navigation)).toBe(true);
    expect(norm(sim.state.v)).toBeGreaterThan(0);
    // What the vehicle knows is the truth's very own objects.
    const known = sim.knownState();
    expect(known.r).toBe(sim.state.r); expect(known.v).toBe(sim.state.v); expect(known.dir).toBe(sim.state.dir); expect(known.elements).toBe(sim.state.elements);
  });

  it('hands burn logic the state the navigation knows', { timeout: 60_000 }, () => {
    const sim = fly({ grade: 'mems', gnss: false }, 30);
    const known = sim.knownState(), estimate = sim.rigidRuntime!.navigation!.estimate;
    expect(known.r).toBe(estimate.r); expect(known.v).toBe(estimate.v);
    expect(norm(add(known.r, scale(sim.state.r, -1)))).toBeGreaterThan(0);
    expect(known.elements.apoapsisAlt).toBeCloseTo(elementsFromState(estimate.r, estimate.v).apoapsisAlt, 6);
    expect(sim.knownState().elements).toBe(known.elements);
  });
});
