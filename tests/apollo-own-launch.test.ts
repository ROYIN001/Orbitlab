/**
 * Apollo 11's flight to the Moon belongs to Apollo 11's own launch (roadmap C01): its injection is the
 * one flown, timed and aimed for the Moon of range zero. Launched at another second, or with another
 * payload on another rocket, the flight is a different one (docs/USER-GUIDE.md) and stays in its
 * parking orbit; it used to fly the lunar profile anyway and log a lunar orbit insertion tens of
 * thousands of kilometres from the Moon.
 */
import { describe, expect, it } from 'vitest';
import { Simulation } from '../src/physics/simulation';
import { vehicleById } from '../src/data/vehicles';
import { RANGE_ZERO_MS } from '../src/data/apollo11';
import { guidanceForVehicle } from '../src/physics/defaults';
import { captureFrame } from '../src/physics/frame';
import { watchMissionById, watchMissionSettings } from '../src/ui/watch-missions';

const s = watchMissionSettings('apollo11');

function fly(change: { launchTime?: Date; vehicleId?: string; satelliteId?: string }, until: number): Simulation {
  const vehicleId = change.vehicleId ?? s.vehicleId;
  const sim = new Simulation({
    vehicleId, satelliteId: change.satelliteId ?? s.satelliteId, siteId: s.siteId, orbit: s.orbit,
    launchTime: change.launchTime ?? s.launchTime, padId: s.padId,
    ...(change.satelliteId ? {} : { payloadMassOverride: s.payloadMass }),
    guidance: guidanceForVehicle(vehicleById(vehicleId), undefined, 'pointMass'), guidanceResolved: true,
    failure: s.failure, boosterRecovery: false, dynamics: { model: 'pointMass', wind: 'calm', seed: 1 },
  }, { headless: true });
  while (!sim.done && !sim.isFailed() && sim.state.t < until - 1e-6) sim.advance(until - sim.state.t, 100_000);
  return sim;
}

const lunarKeys = ['evt.tli', 'evt.tliShort', 'evt.loi', 'evt.lunarOrbit'];

describe('Apollo 11\'s lunar profile flies from its own launch only', () => {
  it('counts from range zero, the second the flight was launched', () => {
    expect(RANGE_ZERO_MS).toBe(new Date(watchMissionById('apollo11')!.launchTime!).getTime());
  });

  it('starts from the parking orbit on the day as flown', () => {
    const sim = fly({}, 800);
    expect(sim.apollo.active).toBe(true);
    expect(sim.events.some((e) => e.key === 'evt.lunarProfileOff')).toBe(false);
  });

  for (const [name, change] of [
    ['launched in 2026', { launchTime: new Date('2026-07-16T13:32:00Z') }],
    ['launched an hour late, inside the Moon table\'s week', { launchTime: new Date('1969-07-16T14:32:00Z') }],
    ['flown on another Saturn V with another spacecraft', { vehicleId: 'saturnv', satelliteId: 'crew' }],
  ] as const) {
    it(`stays in its parking orbit, and says so, when ${name}`, () => {
      const sim = fly(change, 10_500);
      expect(sim.apollo.active).toBe(false);
      expect(sim.events.filter((e) => e.key === 'evt.lunarProfileOff')).toHaveLength(1);
      expect(sim.events.filter((e) => lunarKeys.includes(e.key))).toEqual([]);
      expect(captureFrame(sim).apollo).toBeUndefined();
    });
  }
});
