import { describe, it, expect } from 'vitest';
import { Simulation } from '../src/physics/simulation';
import { autotune, runAscent } from '../src/physics/autotune';
import { DEFAULT_GUIDANCE, DEFAULT_FAILURE } from '../src/physics/defaults';
import { orbitById } from '../src/data/orbits';
import { VEHICLES } from '../src/data/vehicles';
import { liftoffMass, liftoffThrust, idealDeltaV } from '../src/physics/vehicle';
import type { MissionConfig } from '../src/types';
import { G0 } from '../src/physics/constants';

const mk = (over: Partial<MissionConfig>): MissionConfig => ({
  vehicleId: 'falcon9', satelliteId: 'starlink', siteId: 'cape', orbit: orbitById('iss'),
  launchTime: new Date(Date.UTC(2026, 8, 15, 12, 0, 0)), guidance: { ...DEFAULT_GUIDANCE }, failure: { ...DEFAULT_FAILURE },
  boosterRecovery: false, ...over,
});

function flyToEnd(cfg: MissionConfig, maxTime: number): Simulation {
  const sim = new Simulation(cfg, { headless: true });
  let guard = 0;
  while (!sim.done && sim.state.t < maxTime && guard++ < 400000) sim.step(sim.suggestedDt());
  if (sim.state.status === 'orbit') sim.advance(120);
  return sim;
}

describe('vehicle sanity', () => {
  it('every vehicle has liftoff T/W > 1.1 and a plausible ideal delta-v', () => {
    for (const v of VEHICLES) {
      const m = liftoffMass(v, v.payloadLEO * 0.5);
      const twr = liftoffThrust(v) / (m * G0);
      expect(twr, `${v.name} T/W`).toBeGreaterThan(1.1);
      expect(twr, `${v.name} T/W`).toBeLessThan(2.6);
      const dv = idealDeltaV(v, v.payloadLEO * 0.5);
      expect(dv, `${v.name} dv`).toBeGreaterThan(9500);
      expect(dv, `${v.name} dv`).toBeLessThan(16000);
    }
  });
});

describe('ascent to parking orbit', () => {
  it('Falcon 9 reaches a 200 km parking orbit toward the ISS plane', () => {
    const cfg = mk({});
    const tuned = autotune(cfg);
    expect(tuned.best, JSON.stringify(tuned.results)).not.toBeNull();
    const r = tuned.best!;
    expect(r.success).toBe(true);
    expect(r.maxQ).toBeLessThan(40e3);
    expect(r.dvRemaining).toBeGreaterThan(300);
  });

  it('Soyuz-2.1a from Baikonur with a 7.15 t crew ship reaches orbit', () => {
    const cfg = mk({ vehicleId: 'soyuz21a', satelliteId: 'crew', siteId: 'baikonur' });
    const tuned = autotune(cfg);
    expect(tuned.best, JSON.stringify(tuned.results)).not.toBeNull();
    expect(tuned.best!.success).toBe(true);
  });

  it('Electron from Mahia with 200 kg to SSO reaches orbit', () => {
    const cfg = mk({ vehicleId: 'electron', satelliteId: 'cubesats', siteId: 'mahia', orbit: orbitById('sso'), payloadMassOverride: 200 });
    const tuned = autotune(cfg);
    expect(tuned.best, JSON.stringify(tuned.results)).not.toBeNull();
    expect(tuned.best!.success).toBe(true);
  });

  it('a hopeless payload does not reach orbit', () => {
    const cfg = mk({ vehicleId: 'electron', satelliteId: 'comsat', siteId: 'mahia', orbit: orbitById('leo'), payloadMassOverride: 5000 });
    const r = runAscent(cfg, 6);
    expect(r.success).toBe(false);
  });
});

describe('full missions', () => {
  it('Falcon 9 to the ISS orbit: parking orbit, Hohmann transfer, circularisation, payload separation', () => {
    const cfg = mk({});
    const tuned = autotune(cfg);
    const sim = flyToEnd({ ...cfg, guidance: { ...cfg.guidance, kickAngle: tuned.best!.kickAngle, maxTurnRate: tuned.best!.maxTurnRate, loftAltitude: tuned.best!.loftAltitude } }, 4 * 3600);
    const keys = sim.events.map((e) => e.key);
    expect(keys, keys.join(',')).toContain('evt.targetOrbit');
    expect(keys).toContain('evt.payloadSep');
    const el = sim.state.elements;
    expect(el.apoapsisAlt / 1000).toBeCloseTo(420, -1);
    expect(el.periapsisAlt / 1000).toBeCloseTo(420, -1);
    expect(el.i * 180 / Math.PI).toBeCloseTo(51.64, 0);
    expect(sim.state.status).toBe('orbit');
  });

  it('Proton-M/Briz-M from Baikonur delivers a comsat into GEO (plane change at apogee)', () => {
    const cfg = mk({ vehicleId: 'protonm', satelliteId: 'comsat', siteId: 'baikonur', orbit: orbitById('geo'), payloadMassOverride: 2500 });
    const tuned = autotune(cfg);
    expect(tuned.best).not.toBeNull();
    const sim = flyToEnd({ ...cfg, guidance: { ...cfg.guidance, kickAngle: tuned.best!.kickAngle, maxTurnRate: tuned.best!.maxTurnRate, loftAltitude: tuned.best!.loftAltitude } }, 4 * 86400);
    const keys = sim.events.map((e) => e.key);
    expect(keys, sim.events.map((e) => `${Math.round(e.t)}:${e.key}:${JSON.stringify(e.params)}`).join('\n')).toContain('evt.targetOrbit');
    const el = sim.state.elements;
    expect(el.i * 180 / Math.PI).toBeLessThan(1.5);
    expect(el.apoapsisAlt / 1000).toBeCloseTo(35786, -3);
    expect(el.periapsisAlt / 1000).toBeCloseTo(35786, -3);
  });
});
