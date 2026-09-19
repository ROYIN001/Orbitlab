import { describe, expect, it } from 'vitest';
import { Simulation } from '../src/physics/simulation';
import { launchWindows, orbitResiduals, planMission } from '../src/physics/mission';
import { DEFAULT_FAILURE, guidanceForVehicle } from '../src/physics/defaults';
import { orbitById } from '../src/data/orbits';
import { siteById } from '../src/data/sites';
import { vehicleById } from '../src/data/vehicles';
import { satelliteById } from '../src/data/satellites';
import { missionVerdict } from '../src/ui/panel';
import { DEG } from '../src/physics/constants';
import type { MissionConfig } from '../src/types';

const spec = vehicleById('soyuz21a');
const site = siteById('baikonur');
const epoch = new Date('2026-09-19T11:55:00Z');
const config = (launchTime = epoch): MissionConfig => ({
  vehicleId: spec.id, siteId: site.id, satelliteId: 'crew',
  orbit: { ...orbitById('iss') }, launchTime,
  guidance: guidanceForVehicle(spec), guidanceResolved: true,
  failure: { ...DEFAULT_FAILURE }, boosterRecovery: false,
});
function fly(cfg: MissionConfig): Simulation {
  const sim = new Simulation(cfg, { headless: true });
  for (let step = 0; !sim.done && sim.state.t < 7200 && step < 100000; step++) {
    sim.step(sim.suggestedDt());
  }
  return sim;
}
function verdict(cfg: MissionConfig) {
  const satellite = satelliteById(cfg.satelliteId);
  const plan = planMission(cfg, site, spec);
  return missionVerdict({ spec, site, satellite, orbit: cfg.orbit,
    payloadMass: satellite.mass, inclinationDeg: plan.target.inclination / DEG,
    plan, failureMode: 'none', siteReassigned: false });
}

describe('requested mission plane', () => {
  it('warns before an off-window launch and never awards target success in another plane', () => {
    const cfg = config();
    expect(verdict(cfg).text).toContain('Outside the launch window');
    const sim = fly(cfg);
    expect(sim.state.status).toBe('orbit');
    expect(sim.state.note).toBe('orbitOffTarget');
    expect(sim.events.some(e => e.key === 'evt.targetOrbit')).toBe(false);
    expect(sim.events.some(e => e.key === 'evt.offTargetOrbit')).toBe(true);
    const result = orbitResiduals(sim.plan.target, sim.state.elements, true);
    expect(result.misses.map(m => m.param)).toEqual(['raan']);
    expect(Math.abs(result.raan!)).toBeGreaterThan(150);
  });

  it('accepts the same vehicle and payload in the next actual launch window', () => {
    const window = launchWindows(orbitById('iss'), site, epoch, 1)[0];
    expect(window).toBeDefined();
    const cfg = config(window.time);
    expect(verdict(cfg).text).not.toContain('Outside the launch window');
    const sim = fly(cfg);
    expect(sim.events.some(e => e.key === 'evt.targetOrbit')).toBe(true);
    expect(orbitResiduals(sim.plan.target, sim.state.elements, true).misses).toEqual([]);
  });

  it('leaves unconstrained planes free and handles the 0/360 degree boundary', () => {
    const plan = planMission(config(), site, spec);
    const el = { periapsisAlt: plan.target.perigee, apoapsisAlt: plan.target.apogee,
      i: plan.target.inclination, raan: 0.2 * DEG, e: 0 };
    expect(orbitResiduals({ ...plan.target, raan: null }, el, true).onTarget).toBe(true);
    expect(orbitResiduals({ ...plan.target, raan: 359.8 * DEG }, el, true).onTarget).toBe(true);
    expect(orbitResiduals(plan.target, { ...el, raan: NaN }, true).onTarget).toBe(false);
  });
});
