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
import { RECEIPT_TOLERANCE, checkReceipt, eduSatelliteDesign, launchReceipt, massOf, type EduDesign, type HandoffReceipt } from '../src/structure/edusat-design';
import { satelliteDesignProblems } from '../src/config/satellite-design';
import { designDateJd, designHandoff } from '../src/design/satellite-model';
import { designLaunch, designMissionDocument, designMissionIssues, designSite } from '../src/design/satellite-launch';
import { handoffOrbit, heldFromHandoff } from '../src/orbit/playground-model';
import { craftFromHandoff, defaultCraft } from '../src/orbit/budget';
import { missionFileText, parseMissionDocument, type MissionState } from '../src/config/mission-file';
import { defaultMissionState } from '../src/lessons/config';
import { vehicleById } from '../src/data/vehicles';
import { orbitById } from '../src/data/orbits';

const DESIGNS: EduDesign[] = BATTERY_OPTIONS.flatMap((battery) => PAYLOAD_OPTIONS.map((payload) => ({ battery, payload })));
const FROM = new Date('2026-11-09T00:00:00Z');
const flight = { vehicle: vehicleById('soyuz21b'), siteId: 'vostochny', from: FROM };
/** a Launch panel on another mission than the default (another rocket, site, orbit and payload), so nothing it holds can pass for the hand-off's */
const ON_THE_PANEL = (): MissionState => ({
  ...defaultMissionState(), vehicleId: 'falcon9', siteId: 'cape', orbitId: 'gto', orbit: { ...orbitById('gto') }, payloadMass: 5000,
});

describe('EduSat-3U handed on to Orbit and Launch', () => {
  for (const d of DESIGNS) {
    it(`${d.battery} with ${d.payload}: a sound design, read back whole by both destinations`, () => {
      const sat = eduSatelliteDesign(d, 'test-edusat', 'EduSat-3U');
      expect(satelliteDesignProblems(sat)).toEqual([]);
      expect(Math.abs(sat.bus.dryMass - massOf(d))).toBeLessThan(RECEIPT_TOLERANCE.kg);
      expect([sat.propulsion, sat.payload, sat.kind]).toEqual([null, null, 'science']);

      // Orbit: what its playground holds, read as `heldHandoff` reads it (src/ui/orbit/playground.ts), on the orbit it loads
      const h = designHandoff(sat, designDateJd('2026-11-09')!, 'EduSat-3U');
      expect(h).not.toBeNull();
      const launchCraft = craftFromHandoff(h!); // null: no engine
      const atOrbit: HandoffReceipt = { ...heldFromHandoff(h!, handoffOrbit(h!), launchCraft, launchCraft), replaced: 0 };
      expect(checkReceipt(sat, atOrbit)).toEqual({ mass: true, orbit: true, whole: true, ok: true });
      expect(atOrbit.analysisMass).toBe(atOrbit.mass);
      // the learner's own spacecraft chosen in Orbit's planner: the satellite still arrived whole, and its analyses use the other mass
      const own = defaultCraft();
      const withOwn = heldFromHandoff(h!, handoffOrbit(h!), own, launchCraft);
      expect(checkReceipt(sat, { ...withOwn, replaced: 0 }).ok).toBe(true);
      expect(withOwn.analysisMass).toBe(own.mass);

      // Launch: Build's checks before "Fly it" pass, and the Launch section's parser takes every value
      expect(designLaunch(sat).problems).toEqual([]);
      expect(designMissionIssues(sat, flight)).toEqual([]);
      const parsed = parseMissionDocument(JSON.parse(missionFileText(designMissionDocument(sat, flight))), ON_THE_PANEL());
      expect(parsed.usable).toBe(true);
      expect(parsed.issues).toEqual([]);
      const atLaunch = launchReceipt(parsed.state, parsed.issues.length);
      expect(checkReceipt(sat, atLaunch).ok).toBe(true);
      expect([parsed.state.vehicleId, atLaunch.siteId]).toEqual(['soyuz21b', designSite(sat, flight)]);
      // what the panel held before is not what is read back
      expect(checkReceipt(sat, launchReceipt(ON_THE_PANEL(), 0)).ok).toBe(false);
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
