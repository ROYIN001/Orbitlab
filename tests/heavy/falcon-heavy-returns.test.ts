/**
 * Falcon Heavy's three cores flown home as rigid bodies — Arabsat-6A's
 * profile: the side boosters back to Landing Zones 1 and 2, the centre core to
 * a drone ship some 900 km downrange. About two and a half minutes.
 */
import { describe, expect, it } from 'vitest';
import { flyWithReturns } from '../return-harness';
import { orbitById } from '../../src/data/orbits';

describe('six-DOF Falcon Heavy returns', () => {
  it('lands both side boosters on LZ-1 and LZ-2 and the core on the drone ship', { timeout: 900_000 }, () => {
    const sim = flyWithReturns({ vehicleId: 'falconheavy', payload: 6465, model: 'sixDof', orbit: orbitById('gto'),
      plan: { core: { kind: 'droneShip' }, boosters: [{ kind: 'landingZone', zoneId: 'lz1' }, { kind: 'landingZone', zoneId: 'lz2' }] } });
    const zones = sim.events.filter((e) => e.key === 'evt.boosterLandedZone').map((e) => e.params?.zone).sort();
    expect(zones).toEqual(['LZ-1', 'LZ-2']);
    expect(sim.events.some((e) => e.key === 'evt.boosterLandedShip')).toBe(true);
    for (const d of sim.debris.filter((b) => b.recovery)) {
      expect(d.outcome).toBe('landed');
      expect(d.recovery!.missDistance!).toBeLessThan(d.recovery!.target!.radius);
    }
    expect(sim.isFailed()).toBe(false);
  });
});
