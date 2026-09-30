/**
 * Roadmap D06's acceptance for a satellite carried inline (Phase 4 map
 * §2.6 c), in six degrees of freedom: a deep copy of the comsat and of the
 * crew ship, each under an id of its own, flies a recording identical to the
 * catalogue satellite's — the comsat's first day from the Cape to its GEO
 * apogee burns, the crew ship from Baikonur to docking at the ISS. The rigid
 * body takes the satellite's size (its diameter and length), so this is where
 * a size the spec did not carry through would show. The criterion is fixed
 * before the run: `toEqual`, no tolerance, with only the events' `satId` set
 * apart (tests/custom-satellite-harness.ts). The point-mass half is in
 * tests/d06-custom-satellite.test.ts.
 */
import { describe, expect, it } from 'vitest';
import { SAT_FLIGHT_TIME, flySatellite, satelliteCopyOf, satelliteMission, type HarnessSatellite } from '../custom-satellite-harness';

describe('custom satellites (D06): identical six-DOF flights', () => {
  for (const id of ['comsat', 'crew'] as HarnessSatellite[]) {
    it(`flies a copy of ${id} exactly as ${id}, six-DOF`, () => {
      const original = flySatellite(satelliteMission(id, 'sixDof'), SAT_FLIGHT_TIME[id]);
      const copy = flySatellite(satelliteMission(id, 'sixDof', satelliteCopyOf(id)), SAT_FLIGHT_TIME[id]);
      expect(original.flight.status).not.toBe('failed');
      expect(original.flight.events.map((e) => e.key)).toContain('evt.payloadSep');
      expect(copy.flight).toEqual(original.flight);
      expect([...original.satIds]).toEqual([id]);
      expect([...copy.satIds]).toEqual([`${id}-copy`]);
    }, 3_600_000);
  }
});
