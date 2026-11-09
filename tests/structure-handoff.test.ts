/**
 * EduSat-3U handed to the rest of Orbitlab (src/structure/edusat-design.ts):
 * every design the section can make is a sound `SatelliteDesign`, passes the
 * checks the Build section runs before it hands a design on, and arrives
 * whole — its mass, its orbit — as each destination reads it back with its
 * own code: the Orbit section's reading of the state vector and the mass its
 * lifetime analysis takes, and the Launch section's mission parser.
 */
import { describe, expect, it } from 'vitest';
import { BATTERY_OPTIONS, PAYLOAD_OPTIONS } from '../src/structure/edusat';
import { RECEIPT_TOLERANCE, checkReceipt, eduSatelliteDesign, massOf, type EduDesign, type HandoffReceipt } from '../src/structure/edusat-design';
import { satelliteDesignProblems } from '../src/config/satellite-design';
import { designDateJd, designHandoff } from '../src/design/satellite-model';
import { designLaunch, designMissionDocument, designMissionIssues, designSite } from '../src/design/satellite-launch';
import { handoffOrbit, playgroundLifetimeCraft } from '../src/orbit/playground-model';
import { craftFromHandoff } from '../src/orbit/budget';
import { orbitFacts } from '../src/orbit/kepler';
import { missionFileText, parseMissionDocument } from '../src/config/mission-file';
import { defaultMissionState } from '../src/lessons/config';
import { vehicleById } from '../src/data/vehicles';
import { RAD } from '../src/physics/constants';

const DESIGNS: EduDesign[] = BATTERY_OPTIONS.flatMap((battery) => PAYLOAD_OPTIONS.map((payload) => ({ battery, payload })));
const FROM = new Date('2026-11-09T00:00:00Z');
const flight = { vehicle: vehicleById('soyuz21b'), siteId: 'vostochny', from: FROM };

describe('EduSat-3U handed on to Orbit and Launch', () => {
  for (const d of DESIGNS) {
    it(`${d.battery} with ${d.payload}: a sound design, read back whole by both destinations`, () => {
      const sat = eduSatelliteDesign(d, 'test-edusat', 'EduSat-3U');
      expect(satelliteDesignProblems(sat)).toEqual([]);
      expect(Math.abs(sat.bus.dryMass - massOf(d))).toBeLessThan(RECEIPT_TOLERANCE.kg);
      expect([sat.propulsion, sat.payload, sat.kind]).toEqual([null, null, 'science']);

      // Orbit: the playground's own reading (src/ui/orbit/playground.ts `heldHandoff`)
      const h = designHandoff(sat, designDateJd('2026-11-09')!, 'EduSat-3U');
      expect(h).not.toBeNull();
      const o = handoffOrbit(h!), f = orbitFacts(o, false);
      const atOrbit: HandoffReceipt = {
        mass: playgroundLifetimeCraft(h!, craftFromHandoff(h!)).mass, perigeeAlt: f.perigeeAlt, apogeeAlt: f.apogeeAlt, inclination: o.i * RAD, replaced: 0,
      };
      expect(checkReceipt(sat, atOrbit)).toEqual({ mass: true, orbit: true, whole: true, ok: true });

      // Launch: Build's checks before "Fly it" pass, and the Launch section's parser takes every value
      expect(designLaunch(sat).problems).toEqual([]);
      expect(designMissionIssues(sat, flight)).toEqual([]);
      const parsed = parseMissionDocument(JSON.parse(missionFileText(designMissionDocument(sat, flight))), defaultMissionState());
      expect(parsed.usable).toBe(true);
      expect(parsed.issues).toEqual([]);
      const m = parsed.state;
      const atLaunch: HandoffReceipt = {
        mass: m.payloadMass, perigeeAlt: m.orbit.perigee, apogeeAlt: m.orbit.apogee, inclination: m.orbit.inclination, replaced: parsed.issues.length, siteId: m.siteId,
      };
      expect(checkReceipt(sat, atLaunch).ok).toBe(true);
      expect([m.vehicleId, m.siteId]).toEqual(['soyuz21b', designSite(sat, flight)]);
    });
  }

  it('flies from Vostochny, the site the section names', () => {
    expect(designSite(eduSatelliteDesign(DESIGNS[0], 'x', 'x'), flight)).toBe('vostochny');
  });

  it('calls a receipt wrong when the mass, the orbit or a replaced value says so', () => {
    const sat = eduSatelliteDesign(DESIGNS[0], 'x', 'x');
    const good: HandoffReceipt = { mass: sat.bus.dryMass, perigeeAlt: sat.orbit.perigee, apogeeAlt: sat.orbit.apogee, inclination: sat.orbit.inclination, replaced: 0 };
    expect(checkReceipt(sat, good).ok).toBe(true);
    expect(checkReceipt(sat, { ...good, inclination: 'sso' }).ok).toBe(true);
    expect(checkReceipt(sat, { ...good, mass: sat.bus.dryMass + 0.001 })).toMatchObject({ mass: false, ok: false });
    expect(checkReceipt(sat, { ...good, apogeeAlt: sat.orbit.apogee + 2000 })).toMatchObject({ orbit: false, ok: false });
    expect(checkReceipt(sat, { ...good, inclination: sat.orbit.inclination + 1 })).toMatchObject({ orbit: false, ok: false });
    expect(checkReceipt(sat, { ...good, inclination: 'site' })).toMatchObject({ orbit: false, ok: false });
    expect(checkReceipt(sat, { ...good, replaced: 1 })).toMatchObject({ whole: false, ok: false });
  });
});
