import { describe, it, expect } from 'vitest';
import { atmosphere } from '../src/physics/atmosphere';
import { dragCoefficient } from '../src/physics/aero';
import {
  elementsFromState, stateFromElements, propagateKepler, gmst, julianDate,
  inertialLaunchAzimuth, rotatingLaunchAzimuth, sunSyncInclination, raanFromLaunch,
  timeToApoapsis, circularSpeed, sunDirectionEci, nodalPrecessionRate,
} from '../src/physics/orbital';
import { rk4Step } from '../src/physics/integrator';
import { gravity, gravityJ2 } from '../src/physics/gravity';
import { MU_EARTH, R_EARTH, DEG, RAD } from '../src/physics/constants';
import { v3, norm, dot } from '../src/physics/vec3';
import { Simulation, mulberry32, FAIRING_HEAT_FLUX_LIMIT, FAIRING_Q_LIMIT } from '../src/physics/simulation';
import { DEFAULT_GUIDANCE } from '../src/physics/defaults';
import { orbitById } from '../src/data/orbits';
import type { MissionConfig, FailureMode } from '../src/types';

describe('atmosphere (USSA-76 + exponential)', () => {
  it('matches sea level standard values', () => {
    const a = atmosphere(0);
    expect(a.T).toBeCloseTo(288.15, 2);
    expect(a.p).toBeCloseTo(101325, 0);
    expect(a.rho).toBeCloseTo(1.225, 3);
    expect(a.a).toBeCloseTo(340.29, 1);
  });
  it('matches tabulated values at 11 km and 50 km', () => {
    // 11 km geometric ~ 10.98 km geopotential, so pressure sits just above the 22632 Pa layer base.
    const t = atmosphere(11000);
    expect(t.T).toBeCloseTo(216.65, 0);
    expect(t.p / 22632).toBeCloseTo(1, 1);
    const s = atmosphere(50000);
    expect(s.p).toBeCloseTo(79.78, 0);
  });
  it('is continuous across the 86 km boundary and decays monotonically', () => {
    const lo = atmosphere(85999).rho;
    const hi = atmosphere(86001).rho;
    expect(Math.abs(Math.log(lo / hi))).toBeLessThan(0.5);
    let prev = atmosphere(0).rho;
    for (let h = 1000; h <= 1000e3; h += 1000) {
      const rho = atmosphere(h).rho;
      expect(rho).toBeLessThanOrEqual(prev * 1.0001);
      prev = rho;
    }
    expect(atmosphere(400e3).rho).toBeCloseTo(3.725e-12, 14);
  });
});

describe('drag coefficient', () => {
  it('peaks in the transonic regime', () => {
    expect(dragCoefficient(0.3)).toBeCloseTo(0.3, 5);
    expect(dragCoefficient(1.2)).toBeGreaterThan(dragCoefficient(0.5));
    expect(dragCoefficient(1.2)).toBeGreaterThan(dragCoefficient(4));
    expect(dragCoefficient(50)).toBeCloseTo(0.22, 5);
  });
});

describe('orbital elements', () => {
  it('round-trips state -> elements -> state', () => {
    const a = 7000e3, e = 0.1, i = 51.6 * DEG, raan = 1.2, argp = 0.7, nu = 2.1;
    const s = stateFromElements(a, e, i, raan, argp, nu);
    const el = elementsFromState(s.r, s.v);
    expect(el.a).toBeCloseTo(a, -1);
    expect(el.e).toBeCloseTo(e, 8);
    expect(el.i).toBeCloseTo(i, 8);
    expect(el.raan).toBeCloseTo(raan, 8);
    expect(el.argp).toBeCloseTo(argp, 8);
    expect(el.nu).toBeCloseTo(nu, 8);
    expect(el.apoapsisAlt).toBeCloseTo(a * (1 + e) - R_EARTH, -1);
    expect(el.periapsisAlt).toBeCloseTo(a * (1 - e) - R_EARTH, -1);
  });
  it('gives a circular ISS-like orbit the right period', () => {
    const r = R_EARTH + 420e3;
    const s = stateFromElements(r, 0, 51.6 * DEG, 0, 0, 0);
    const el = elementsFromState(s.r, s.v);
    expect(el.period / 60).toBeCloseTo(92.8, 0);
    expect(norm(s.v)).toBeCloseTo(circularSpeed(r), 3);
  });
  it('Kepler propagation returns to the same point after one period', () => {
    const s = stateFromElements(8000e3, 0.2, 1.0, 0.3, 0.5, 0.1);
    const el = elementsFromState(s.r, s.v);
    const s2 = propagateKepler(s.r, s.v, el.period);
    expect(norm(s2.r)).toBeCloseTo(norm(s.r), -1);
    expect(s2.r.x).toBeCloseTo(s.r.x, -1);
    expect(s2.r.z).toBeCloseTo(s.r.z, -1);
  });
  it('time to apoapsis is half a period from periapsis', () => {
    const s = stateFromElements(8000e3, 0.2, 1.0, 0.3, 0.5, 0);
    const el = elementsFromState(s.r, s.v);
    expect(timeToApoapsis(el)).toBeCloseTo(el.period / 2, 3);
  });
});

describe('RK4 integrator', () => {
  it('conserves energy on a circular orbit over one revolution', () => {
    const r = R_EARTH + 300e3;
    let s = stateFromElements(r, 0, 0.5, 0, 0, 0);
    const E0 = dot(s.v, s.v) / 2 - MU_EARTH / norm(s.r);
    const el = elementsFromState(s.r, s.v);
    const dt = 1;
    const steps = Math.round(el.period / dt);
    for (let k = 0; k < steps; k++) s = rk4Step(k * dt, s, dt, (_t, rr) => gravity(rr));
    const E1 = dot(s.v, s.v) / 2 - MU_EARTH / norm(s.r);
    expect(Math.abs((E1 - E0) / E0)).toBeLessThan(1e-9);
    expect(norm(s.r)).toBeCloseTo(r, -2);
  });
  it('J2 makes the node regress westward for a prograde orbit', () => {
    const a = R_EARTH + 500e3, i = 60 * DEG;
    let s = stateFromElements(a, 0.001, i, 1.0, 0, 0);
    const el0 = elementsFromState(s.r, s.v);
    const dt = 2;
    const T = el0.period * 10;
    for (let t = 0; t < T; t += dt) s = rk4Step(t, s, dt, (_t, rr) => gravityJ2(rr));
    const el1 = elementsFromState(s.r, s.v);
    const dRaan = ((el1.raan - el0.raan + 3 * Math.PI) % (2 * Math.PI)) - Math.PI;
    expect(dRaan).toBeLessThan(0);
    const predicted = nodalPrecessionRate(a, 0.001, i) * T;
    expect(dRaan / predicted).toBeCloseTo(1, 1);
  });
});

describe('time & launch geometry', () => {
  it('GMST at J2000 epoch is ~280.46 deg', () => {
    const jd = julianDate(new Date(Date.UTC(2000, 0, 1, 12, 0, 0)));
    expect(jd).toBeCloseTo(2451545.0, 6);
    expect(gmst(jd) * RAD).toBeCloseTo(280.46, 1);
  });
  it('Baikonur (45.96N) to 51.6 deg needs ~63 deg inertial azimuth', () => {
    const b = inertialLaunchAzimuth(45.96 * DEG, 51.6 * DEG)!;
    expect(b * RAD).toBeCloseTo(63.4, 0);
    const br = rotatingLaunchAzimuth(45.96 * DEG, 51.6 * DEG, 7800)!;
    expect(br * RAD).toBeLessThan(b * RAD); // Earth's eastward rotation lets you aim more northerly
    expect(inertialLaunchAzimuth(45.96 * DEG, 30 * DEG)).toBeNull();
  });
  it('sun-synchronous inclination for 600 km is ~97.8 deg', () => {
    expect(sunSyncInclination(R_EARTH + 600e3) * RAD).toBeCloseTo(97.8, 0);
  });
  it('RAAN from an equatorial site equals the launch longitude', () => {
    expect(raanFromLaunch(0, 1.0, 45 * DEG)).toBeCloseTo(1.0, 8);
  });
  it('RAAN from launch matches the elements of the resulting orbit', () => {
    // Build a state at Baikonur heading along the inertial azimuth and compare.
    const lat = 45.96 * DEG, lonI = 0.8, inc = 51.6 * DEG;
    const beta = inertialLaunchAzimuth(lat, inc)!;
    const r = v3(R_EARTH * Math.cos(lat) * Math.cos(lonI), R_EARTH * Math.cos(lat) * Math.sin(lonI), R_EARTH * Math.sin(lat));
    const up = v3(r.x / R_EARTH, r.y / R_EARTH, r.z / R_EARTH);
    const east = v3(-Math.sin(lonI), Math.cos(lonI), 0);
    const north = v3(up.y * east.z - up.z * east.y, up.z * east.x - up.x * east.z, up.x * east.y - up.y * east.x);
    const dir = v3(Math.cos(beta) * north.x + Math.sin(beta) * east.x, Math.cos(beta) * north.y + Math.sin(beta) * east.y, Math.cos(beta) * north.z + Math.sin(beta) * east.z);
    const vel = v3(dir.x * 7800, dir.y * 7800, dir.z * 7800);
    const el = elementsFromState(r, vel);
    expect(el.i).toBeCloseTo(inc, 6);
    expect(el.raan).toBeCloseTo(raanFromLaunch(lat, lonI, inc), 6);
  });
  it('sun direction is a unit vector near the ecliptic', () => {
    const s = sunDirectionEci(julianDate(new Date(Date.UTC(2026, 5, 21))));
    expect(norm(s)).toBeCloseTo(1, 6);
    expect(Math.asin(s.z) * RAD).toBeCloseTo(23.4, 0); // June solstice: declination ~ +23.4
  });
});

// ---------------------------------------------------------------------------
// Determinism and the fairing placard (wave 1 / physics)
// ---------------------------------------------------------------------------

describe('deterministic failure injection', () => {
  const mk = (launchTime: Date, mode: FailureMode): MissionConfig => ({
    vehicleId: 'falcon9', satelliteId: 'cubesats', siteId: 'cape', orbit: orbitById('leo'),
    launchTime, guidance: { ...DEFAULT_GUIDANCE }, failure: { mode, time: 60, stage: 0 },
    boosterRecovery: false, payloadMassOverride: 5000,
  });
  const failureEvents = (sim: Simulation): string[] =>
    sim.events.filter((e) => e.severity === 'fail' || e.severity === 'warn').map((e) => `${e.t.toFixed(2)}:${e.key}`);

  it('the same configuration always injects the same random failure', () => {
    const t0 = new Date(Date.UTC(2026, 8, 15, 12, 0, 0));
    const runs = [0, 1].map(() => {
      const sim = new Simulation(mk(t0, 'random'), { headless: true });
      let guard = 0;
      while (!sim.done && sim.state.t < 1200 && guard++ < 200000) sim.step(sim.suggestedDt());
      return failureEvents(sim);
    });
    expect(runs[0].length).toBeGreaterThan(0);
    expect(runs[0]).toEqual(runs[1]);
  });

  it('a different launch epoch can select a different failure', () => {
    const seen = new Set<string>();
    for (let k = 0; k < 8; k++) {
      const sim = new Simulation(mk(new Date(Date.UTC(2026, 8, 15, 12, k, 0)), 'random'), { headless: true });
      let guard = 0;
      while (!sim.done && sim.state.t < 200 && guard++ < 50000) sim.step(sim.suggestedDt());
      seen.add(failureEvents(sim).join(','));
    }
    // the seed depends on the epoch, so the set of outcomes is not a single value
    expect(seen.size).toBeGreaterThan(1);
  });

  it('mulberry32 is stable and uniform enough to pick a failure mode', () => {
    const a = mulberry32(12345);
    const b = mulberry32(12345);
    const xs = Array.from({ length: 500 }, () => a());
    expect(xs.slice(0, 5)).toEqual(Array.from({ length: 5 }, () => b()));
    expect(Math.min(...xs)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...xs)).toBeLessThan(1);
    expect(xs.reduce((s, x) => s + x, 0) / xs.length).toBeCloseTo(0.5, 1);
  });
});

describe('fairing jettison placard', () => {
  it('drops the fairing where the free-molecular heating falls below the limit', () => {
    const cfg: MissionConfig = {
      vehicleId: 'falcon9', satelliteId: 'starlink', siteId: 'cape', orbit: orbitById('iss'),
      launchTime: new Date(Date.UTC(2026, 8, 15, 12, 0, 0)), guidance: { ...DEFAULT_GUIDANCE },
      failure: { mode: 'none', time: 0, stage: 0 }, boosterRecovery: false, payloadMassOverride: 15600,
    };
    const sim = new Simulation(cfg, { headless: true });
    let guard = 0;
    let heatAtSep = Infinity;
    let qAtSep = Infinity;
    while (!sim.done && sim.state.t < 600 && guard++ < 200000) {
      const attached = sim.vehicle.fairingAttached;
      sim.step(sim.suggestedDt());
      if (attached && !sim.vehicle.fairingAttached) {
        const atm = atmosphere(Math.max(0, sim.state.altitude));
        heatAtSep = 0.5 * atm.rho * sim.state.airspeed ** 3;
        qAtSep = sim.state.q;
      }
    }
    const sep = sim.events.find((e) => e.key === 'evt.fairingSep');
    expect(sep, 'fairing never jettisoned').toBeDefined();
    // 190–230 s on a real Falcon 9 ISS-class mission
    expect(sep!.t).toBeGreaterThan(185);
    expect(sep!.t).toBeLessThan(235);
    expect(heatAtSep).toBeLessThanOrEqual(FAIRING_HEAT_FLUX_LIMIT);
    expect(qAtSep).toBeLessThanOrEqual(FAIRING_Q_LIMIT);
    expect(Number(sep!.params?.alt)).toBeGreaterThanOrEqual(80);
  });
});
