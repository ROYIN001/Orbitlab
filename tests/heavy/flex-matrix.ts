/**
 * Every vehicle flown with the whole flexible body of roadmap P05 — slosh, the
 * first bending mode with its shell loads, and the bending filter — each on its
 * reference mission in crosswind, and judged as the rigid fleet is: the target
 * orbit, the orbit re-derived from the raw state and the insertion clock
 * (tests/fleet-harness.ts), with no shell loaded past its allowable.
 */
import { expect, it } from 'vitest';
import { VEHICLES, vehicleById } from '../../src/data/vehicles';
import { orbitById } from '../../src/data/orbits';
import { siteById } from '../../src/data/sites';
import { Simulation } from '../../src/physics/simulation';
import { DEFAULT_FAILURE, DEFAULT_GUIDANCE, guidanceForVehicle } from '../../src/physics/defaults';
import { launchWindows, resolveTarget } from '../../src/physics/mission';
import { RAD } from '../../src/physics/constants';
import { acceptanceFailures, achievedElements, caseKey, fleetCases, LAUNCH_TIME, type FleetCase } from '../fleet-harness';
import { rigidMission } from '../rigid-harness';
import type { DynamicsConfig, FlexConfig, MissionConfig } from '../../src/types';

export const FULL_FLEX: FlexConfig = { slosh: true, bending: true, notch: true };
const DYNAMICS: DynamicsConfig = { model: 'sixDof', wind: 'crosswind', seed: 20260919, flex: FULL_FLEX };

export interface FlexFlight { sim: Simulation; maxLoad: number; maxDeflection: number; maxSlosh: number }

/** Fly a mission to its end, keeping the flexible body's extremes. */
export function flyFlexible(cfg: MissionConfig, maxTime: number, rigidDt?: number): FlexFlight {
  const sim = new Simulation(cfg, { headless: true, ...(rigidDt ? { rigidDt } : {}) });
  let guard = 0, maxLoad = 0, maxDeflection = 0, maxSlosh = 0;
  while (!sim.done && sim.state.t < maxTime && guard++ < 20_000_000) {
    sim.step(sim.suggestedDt());
    const flex = sim.state.rigid?.flex;
    if (flex?.bending) { maxLoad = Math.max(maxLoad, flex.bending.loadRatio); maxDeflection = Math.max(maxDeflection, flex.bending.deflectionM); }
    for (const tank of flex?.slosh?.tanks ?? []) maxSlosh = Math.max(maxSlosh, tank.displacementM);
  }
  // One line per flight for the acceptance record (docs/SIXDOF-ACCEPTANCE.md).
  console.log(`flexible ${cfg.vehicleId}: ${sim.state.status}, shell load ${(maxLoad * 100).toFixed(0)} %, `
    + `bending ${(maxDeflection * 100).toFixed(1)} cm, slosh ${(maxSlosh * 100).toFixed(0)} cm, t ${sim.state.t.toFixed(0)} s`);
  return { sim, maxLoad, maxDeflection, maxSlosh };
}

/** A vehicle's reference case: its first accepted fleet row (tests/sixdof-fleet/wind.test.ts). */
export function referenceCase(vehicle: string): FleetCase | undefined {
  return fleetCases().find((c) => c.vehicle === vehicle);
}

export function fleetCaseConfig(c: FleetCase): MissionConfig {
  const orbit = orbitById(c.orbit);
  const window = orbit.raanMode === 'free' ? undefined : launchWindows(orbit, siteById(c.site), LAUNCH_TIME, 1)[0];
  return { vehicleId: c.vehicle, satelliteId: 'cubesats', siteId: c.site, orbit, launchTime: window?.time ?? LAUNCH_TIME,
    guidance: guidanceForVehicle(vehicleById(c.vehicle), DEFAULT_GUIDANCE, 'sixDof'), guidanceResolved: true,
    failure: { ...DEFAULT_FAILURE }, boosterRecovery: false, payloadMassOverride: c.mass, dynamics: DYNAMICS };
}

/** The flexible reference case of each of `vehicles`, as one test each. */
export function flexibleFleet(vehicles: readonly string[]): void {
  for (const vehicle of vehicles) {
    if (vehicle === 'soyuz21a') { soyuzCrewMission(); continue; }
    if (vehicle === 'longmarch2d') { longMarchSso(); continue; }
    const c = referenceCase(vehicle)!;
    it(`${caseKey(c)} reaches its target as a flexible vehicle`, () => {
      const flight = flyFlexible(fleetCaseConfig(c), c.orbit === 'gto' ? 30 * 3600 : 10 * 3600);
      const log = JSON.stringify(flight.sim.events.slice(-6).map((e) => e.key));
      expect(acceptanceFailures(flight.sim, c), log).toEqual([]);
      expect(flight.maxLoad, log).toBeLessThan(0.8);
    }, 3_600_000);
  }
}

/** Soyuz-2.1a's reference mission: the crewed spacecraft to the station orbit. */
function soyuzCrewMission(): void {
  it('soyuz21a/iss (crew) reaches the station orbit as a flexible vehicle', () => {
    const cfg = { ...rigidMission('iss'), dynamics: DYNAMICS };
    const flight = flyFlexible(cfg, 10 * 3600);
    const keys = flight.sim.events.map((e) => e.key), log = JSON.stringify(flight.sim.events.slice(-6).map((e) => e.key));
    expect(keys, log).toContain('evt.targetOrbit');
    expect(keys, log).not.toContain('evt.bendingFailure');
    expect(flight.maxLoad, log).toBeLessThan(0.8);
  }, 3_600_000);
}

/** Long March 2D's: an Earth-observation satellite to the 600 km sun-synchronous orbit. */
function longMarchSso(): void {
  it('longmarch2d/sso/650 kg reaches its orbit as a flexible vehicle', () => {
    const orbit = orbitById('sso'), site = siteById('jiuquan');
    const flight = flyFlexible({ vehicleId: 'longmarch2d', satelliteId: 'earthObs', siteId: 'jiuquan', orbit,
      launchTime: launchWindows(orbit, site, LAUNCH_TIME, 1)[0].time,
      guidance: guidanceForVehicle(vehicleById('longmarch2d'), DEFAULT_GUIDANCE, 'sixDof'), guidanceResolved: true,
      failure: { ...DEFAULT_FAILURE }, boosterRecovery: false, payloadMassOverride: 650, dynamics: DYNAMICS }, 24 * 3600);
    const keys = flight.sim.events.map((e) => e.key), log = JSON.stringify(flight.sim.events.slice(-6).map((e) => e.key));
    expect(keys, log).toContain('evt.targetOrbit');
    expect(keys, log).not.toContain('evt.bendingFailure');
    const el = achievedElements(flight.sim);
    expect(Math.abs(el.periapsisAlt - 600e3) / 1e3, log).toBeLessThanOrEqual(15);
    expect(Math.abs(el.i - resolveTarget(orbit, site, LAUNCH_TIME).inclination) * RAD, log).toBeLessThanOrEqual(0.3);
    expect(flight.maxLoad, log).toBeLessThan(0.8);
  }, 3_600_000);
}

export const ALL_VEHICLES = VEHICLES.map((v) => v.id);
