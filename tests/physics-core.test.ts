import { describe, it, expect } from 'vitest';
import { atmosphere } from '../src/physics/atmosphere';
import { dragCoefficient, tumblingDragCoefficient } from '../src/physics/aero';
import {
  elementsFromState, stateFromElements, propagateKepler, gmst, julianDate,
  inertialLaunchAzimuth, rotatingLaunchAzimuth, sunSyncInclination, raanFromLaunch,
  timeToApoapsis, circularSpeed, sunDirectionEci, nodalPrecessionRate,
} from '../src/physics/orbital';
import { rk4Step } from '../src/physics/integrator';
import { gravity, gravityJ2 } from '../src/physics/gravity';
import { MU_EARTH, R_EARTH, DEG, RAD, P0, G0 } from '../src/physics/constants';
import { v3, norm, dot } from '../src/physics/vec3';
import { Simulation, mulberry32, FAIRING_HEAT_FLUX_LIMIT, FAIRING_Q_LIMIT } from '../src/physics/simulation';
import { DEFAULT_GUIDANCE } from '../src/physics/defaults';
import { orbitById } from '../src/data/orbits';
import type { MissionConfig, FailureMode, EngineSpec } from '../src/types';
import { VEHICLES } from '../src/data/vehicles';
import { solidProfile, deliveredIspSL, engineThrust, engineIsp, engineMassFlow } from '../src/physics/vehicle';

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

// ---------------------------------------------------------------------------
// Wave 2 / physics follow-up (docs/AUDIT-2026-09-16.md)
// ---------------------------------------------------------------------------

describe('atmosphere continuity (B29)', () => {
  /**
   * The old monotonicity guard stepped 1000 m at a time, which lands exactly on
   * every table node and therefore steps straight over a discontinuity AT one.
   * That is how a 6.4 % density INVERSION at 90 km survived: the 86 km row
   * decayed to 3.190e-6 there while the 90 km row started at 3.396e-6. Sampling
   * off-node — and explicitly a metre either side of every node — is what makes
   * the test capable of finding this class of bug at all.
   */
  const NODES = [86, 90, 100, 110, 120, 130, 140, 150, 180, 200, 250, 300, 350, 400, 450, 500, 600, 700, 800, 900, 1000];

  it('density is continuous across every table node', () => {
    for (const km of NODES) {
      const lo = atmosphere(km * 1000 - 1).rho;
      const hi = atmosphere(km * 1000 + 1).rho;
      const step = Math.abs(hi / lo - 1);
      expect(step, `${km} km: ${lo.toExponential(4)} -> ${hi.toExponential(4)} (${(step * 100).toFixed(2)} %)`)
        .toBeLessThan(0.005);
    }
  });

  it('density decays monotonically when sampled off the table nodes', () => {
    let prev = atmosphere(0).rho;
    // 137 m is coprime with every node spacing in the table, so the sweep never
    // repeatedly lands on one.
    for (let h = 137; h <= 1000e3; h += 137) {
      const rho = atmosphere(h).rho;
      expect(rho, `density rose at ${h} m`).toBeLessThanOrEqual(prev * 1.0000001);
      prev = rho;
    }
  });

  it('holds the mesopause temperature to 91 km, as USSA-76 does', () => {
    // The extension used to start rising the moment the USSA-76 branch ended at
    // 86 km; USSA-76 itself holds 186.87 K to 91 km.
    for (const km of [86, 88, 90, 91]) expect(atmosphere(km * 1000).T, `${km} km`).toBeCloseTo(186.9, 0);
    expect(atmosphere(120e3).T).toBeGreaterThan(300);
  });
});

describe('drag coefficient guards (B40)', () => {
  it('a non-finite Mach number does not return the smallest value in the curve', () => {
    // Every comparison with NaN is false, so an unguarded lookup falls through
    // the whole table and returns the hypersonic 0.22 — the least drag, exactly
    // when something has gone wrong.
    expect(dragCoefficient(NaN)).toBe(dragCoefficient(0));
    expect(dragCoefficient(-1)).toBe(dragCoefficient(0));
  });

  it('a tumbling body keeps its own drag coefficient, with a weak Mach dependence', () => {
    for (const cd0 of [1.2, 1.5, 2.2]) {
      expect(tumblingDragCoefficient(cd0, 0.3)).toBeCloseTo(cd0, 6);
      expect(tumblingDragCoefficient(cd0, 1.2) / cd0).toBeCloseTo(1.2, 6);
      // ...and never collapses to the slender-body curve, which is what the
      // unused `Debris.cd` field meant in practice (audit item B15).
      for (const m of [0.3, 1, 3, 8, 20]) {
        expect(tumblingDragCoefficient(cd0, m)).toBeGreaterThan(2 * dragCoefficient(m));
      }
    }
  });
});

describe('solid motor thrust profile (wave-1 hand-off c)', () => {
  it('the regressive ramp does not change the burn time, whatever the peak', () => {
    // t_burn = (m/mdot) * integral(df / p(f)); the profile is normalised so that
    // integral is exactly 1, or the published burn time the mean thrust was
    // derived from would not be reproduced.
    for (const peak of [1.0, 1.16, 1.2, 1.22, 1.52, 2.0]) {
      const N = 200000;
      let acc = 0;
      for (let k = 0; k < N; k++) acc += 1 / solidProfile((k + 0.5) / N, peak);
      expect(acc / N, `peak ${peak}`).toBeCloseTo(1, 3);
      expect(solidProfile(0, peak), `peak ${peak} head`).toBeCloseTo(Math.max(1, peak), 6);
    }
  });

  it('is regressive: thrust falls monotonically as the grain burns', () => {
    for (const peak of [1.2, 1.52]) {
      let prev = solidProfile(0, peak);
      for (let f = 0.01; f <= 1; f += 0.01) {
        const p = solidProfile(f, peak);
        expect(p).toBeLessThanOrEqual(prev);
        expect(p).toBeGreaterThan(0);
        prev = p;
      }
    }
  });
});

describe('delivered engine performance (B27)', () => {
  /**
   * Mass flow is a property of the pump, not of the ambient pressure, so
   * F_vac/(g0·Isp_vac) and F_SL/(g0·Isp_SL) are the same number. The model takes
   * the vacuum pair as authoritative and back-solves the sea-level Isp; this
   * asserts the DATA agrees with what is then delivered, for the engines that
   * are really lit at sea level. A vacuum-only engine has no such operating
   * point and is excluded by name, through its own flag.
   */
  it('thrust, mass flow and Isp are one consistent set at every altitude', () => {
    // The identity the model now guarantees, and the one the old code broke by
    // taking mass flow from the vacuum pair while quoting `ispSL` as the
    // sea-level performance: F(p) = mdot * g0 * Isp(p), for every engine and
    // every pressure.
    for (const v of VEHICLES) {
      for (const st of v.stages) {
        for (const e of [st.engine, ...(st.boosters ?? []).map((b) => b.engine)]) {
          const mdot = engineMassFlow(e);
          for (const p of [0, 0.25 * P0, P0]) {
            expect(engineThrust(e, p) / (mdot * G0), `${v.id} ${e.name} at ${Math.round(p)} Pa`)
              .toBeCloseTo(engineIsp(e, p), 6);
          }
          expect(engineIsp(e, 0), `${v.id} ${e.name} vacuum`).toBeCloseTo(e.ispVac, 6);
        }
      }
    }
  });

  /**
   * DATA DEVIATION, recorded rather than asserted away.
   *
   * With mass flow taken from the vacuum pair, the sea-level Isp an engine
   * DELIVERS is thrustSL/(mdot·g0), which is not always the `ispSL` the file
   * quotes — the pair is over-determined and several are internally
   * inconsistent. The model no longer reads `ispSL` at all, so nothing flies on
   * the wrong number, but the discrepancy is real data and belongs on the
   * record: the audit named RD-108A (Soyuz core sustainer, +6.9 %) and
   * Vulcain 2.1 (Ariane 6 core, +5.3 %) as the two that move a timeline.
   *
   * The bound is 8 %, which is the measured worst case. Tightening it is a data
   * change (correct thrustSL or ispSL so the pair closes) and belongs to the
   * fleet-data owner; when that lands, this number comes down.
   */
  it('records how far each ground-lit engine is from its quoted sea-level Isp', () => {
    const off: string[] = [];
    for (const v of VEHICLES) {
      const st = v.stages[0];
      for (const e of [st.engine, ...(st.boosters ?? []).map((b) => b.engine)]) {
        if (e.vacuumOnly) continue;
        const err = Math.abs(deliveredIspSL(e) / e.ispSL - 1);
        expect(err, `${v.id} ${e.name}: delivers ${deliveredIspSL(e).toFixed(1)} s against a quoted ${e.ispSL} s`)
          .toBeLessThan(0.08);
        if (err > 0.02) off.push(`${e.name} ${(err * 100).toFixed(1)} %`);
      }
    }
    // The audit named the two that move a timeline; this is the full list at a
    // 2 % threshold, so a new inconsistency cannot slip in unnoticed.
    expect([...new Set(off)].sort())
      .toEqual(['RD-108A 6.9 %', 'Raptor 2 2.4 %', 'Rutherford 2.6 %', 'Vulcain 2.1 5.0 %']);
  });

  it('a vacuum-only engine never uses its placeholder sea-level figures', () => {
    const e: EngineSpec = { name: 'probe', count: 1, thrustSL: 1, thrustVac: 100, ispSL: 1, ispVac: 400, vacuumOnly: true };
    expect(engineThrust(e, P0)).toBe(100);
    expect(engineIsp(e, P0)).toBeCloseTo(400, 6);
    const real: EngineSpec = { ...e, vacuumOnly: false, thrustSL: 80, ispSL: 320 };
    expect(engineThrust(real, P0)).toBe(80);
  });
});

describe('delta-v budget closes (B14)', () => {
  /**
   * The identity the telemetry panel and docs/PHYSICS.md §4 promise:
   *
   *   d|v|/dt = a_T·v̂ − (μ/r²)(r̂·v̂) − (D/m)(v̂_air·v̂)
   *
   * i.e. Δ|v| over the ascent = dvThrust − gravity − drag − steering. It only
   * holds if every term is projected on the SAME axis, and the axis the
   * identity is written in is the INERTIAL velocity. Measuring the steering
   * loss against the air-relative velocity below 100 km — which is what the
   * model used to do — mixes frames: early in flight v_air is nearly vertical
   * while v is dominated by the 320-465 m/s of eastward rotation velocity, so
   * cos(alpha) reads ~1 against v_air and the steering loss came out six times
   * too small, leaving 485 m/s of the budget unaccounted for on a Soyuz ascent.
   *
   * The tolerance is a FEW m/s, not one: the losses are accumulated with
   * left-rectangle quadrature against an RK4 trajectory, and there are short
   * unpowered gaps inside the ascent window (staging) that the thrust term does
   * not see. 1 % of the delivered thrust delta-v is the bound.
   */
  const budget = (vehicleId: string, siteId: string, satelliteId: string, mass: number): { closes: number; dvThrust: number; detail: string } => {
    const spec = VEHICLES.find((v) => v.id === vehicleId)!;
    const cfg: MissionConfig = {
      vehicleId, satelliteId, siteId, orbit: orbitById('iss'),
      launchTime: new Date(Date.UTC(2026, 8, 15, 12, 0, 0)),
      guidance: { ...DEFAULT_GUIDANCE, ...(spec.guidanceDefaults ?? {}) }, guidanceResolved: true,
      failure: { mode: 'none', time: 0, stage: 0 }, boosterRecovery: false, payloadMassOverride: mass,
    };
    const sim = new Simulation(cfg, { headless: true });
    const v0 = norm(sim.state.v);
    let guard = 0;
    while (sim.state.status !== 'orbit' && sim.state.status !== 'failed' && guard++ < 200000) {
      sim.step(sim.suggestedDt());
      if (sim.events.some((e) => e.key === 'evt.seco')) break;
    }
    const l = sim.state.losses;
    const dSpeed = norm(sim.state.v) - v0;
    const residual = l.dvThrust - (dSpeed + l.gravity + l.drag + l.steering);
    return {
      closes: Math.abs(residual),
      dvThrust: l.dvThrust,
      detail: `${vehicleId}: thrust ${l.dvThrust.toFixed(1)} = dV ${dSpeed.toFixed(1)} + grav ${l.gravity.toFixed(1)}`
        + ` + drag ${l.drag.toFixed(1)} + steer ${l.steering.toFixed(1)}, residual ${residual.toFixed(1)} m/s`,
    };
  };

  it('thrust delta-v equals the speed gained plus the losses, to within 1 %', () => {
    for (const [v, site, sat, m] of [
      ['soyuz21a', 'baikonur', 'crew', 7150],
      ['falcon9', 'cape', 'starlink', 15600],
      ['h3', 'tanegashima', 'cubesats', 5000],
      ['electron', 'mahia', 'cubesats', 200],
    ] as [string, string, string, number][]) {
      const b = budget(v, site, sat, m);
      expect(b.closes, b.detail).toBeLessThan(0.01 * b.dvThrust);
    }
  });

  it('the steering loss is measured against the inertial velocity, so it is not near zero', () => {
    // The symptom of the frame mix: a Soyuz ascent reported 102 m/s of steering
    // loss where the inertial figure is ~650 m/s.
    const b = budget('soyuz21a', 'baikonur', 'crew', 7150);
    expect(b.detail).toMatch(/steer \d\d\d\./);
  });
});
