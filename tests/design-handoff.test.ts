/**
 * "Fly it" (roadmap D02, D03): a design handed to the Launch section as a
 * mission document, src/design/build-handoff.ts.
 *
 * The document is read by the Launch panel's own parser
 * (`parseMissionDocument`, the same one a file or a link goes through) and
 * must be taken whole — no issue, the vehicle restored field for field, the
 * dynamics point-mass unless the experimental six-DOF was asked for. Then one
 * remixed vehicle, handed off, is flown through `Simulation` as the panel
 * would configure it (`SetupPanel.getConfig`, restated below), point-mass, for
 * the first 60 s: it must lift off and climb, with no rigid-body model. The
 * checks are identities and "it happened" events; the one bound (a climb of
 * more than 3 km in 60 s, which every catalogue vehicle clears several times
 * over) was set before the first run.
 */
import { describe, expect, it } from 'vitest';
import { missionDocument, missionFileText, parseMissionDocument, type MissionState } from '../src/config/mission-file';
import { validateConfigInput } from '../src/config/validation';
import { orbitById } from '../src/data/orbits';
import { satelliteById } from '../src/data/satellites';
import { missionVehicle } from '../src/data/vehicles';
import { DEFAULT_FAILURE, guidanceForVehicle } from '../src/physics/defaults';
import { defaultDynamics } from '../src/physics/rigid/config';
import { Simulation } from '../src/physics/simulation';
import { HANDOFF_ORBIT, HANDOFF_SATELLITE, handoffDocument } from '../src/design/build-handoff';
import { partsDraft, partsResult, remixDraft, remixResult, type DesignResult } from '../src/design/explore-model';
import type { MissionConfig, VehicleSpec } from '../src/types';

/** The Launch panel's mission before the hand-off: its own default, the ISS crew flight on Soyuz. */
const onThePanel = (): MissionState => ({
  vehicleId: 'soyuz21a', satelliteId: 'crew', siteId: 'baikonur', orbitId: 'iss', orbit: { ...orbitById('iss') },
  launchTime: new Date('2026-09-28T09:00:00Z'), guidanceOverrides: {}, failure: { ...DEFAULT_FAILURE },
  boosterRecovery: false, payloadMass: satelliteById('crew').mass, dynamics: defaultDynamics('soyuz21a'),
  padId: 'site31', rendezvous: { profile: 'fourOrbit' },
});
const viaJson = (doc: unknown): unknown => JSON.parse(missionFileText(doc as ReturnType<typeof missionDocument>));
const built = (r: DesignResult): VehicleSpec => {
  if (!r.ok) throw new Error(`refused: ${JSON.stringify(r.refusal)}`);
  return r.spec;
};

/** `SetupPanel.getConfig`, for a restored mission state. */
function configOf(s: MissionState): MissionConfig {
  const spec = missionVehicle(s);
  return {
    vehicleId: s.vehicleId, satelliteId: s.satelliteId, siteId: s.siteId, orbit: { ...s.orbit },
    ...(s.vehicleSpec ? { vehicleSpec: structuredClone(s.vehicleSpec) } : {}),
    launchTime: new Date(s.launchTime.getTime()),
    guidance: { ...guidanceForVehicle(spec, undefined, s.dynamics?.model), ...s.guidanceOverrides },
    failure: { ...s.failure }, boosterRecovery: s.boosterRecovery, payloadMassOverride: s.payloadMass,
    guidanceResolved: true, dynamics: s.dynamics ? { ...s.dynamics } : undefined,
  };
}

function stretchedFalcon(): { spec: VehicleSpec; payload: number } {
  const d = remixDraft('falcon9', 'falcon-9-remix-t1', 'Falcon 9 remix');
  d.edit.stages[1].stretch = 1.2;
  return { spec: built(remixResult(d)), payload: d.payloadKg };
}

describe('Fly it: the hand-off to the Launch section', () => {
  it('is a mission document the Launch panel takes whole, the vehicle restored field for field, point-mass', () => {
    const designs: [string, VehicleSpec, number][] = [
      ['a remix', stretchedFalcon().spec, stretchedFalcon().payload],
      ['a parts design', built(partsResult(partsDraft('parts-t1', 'Parts'))), 5000],
    ];
    for (const [what, spec, payload] of designs) {
      const doc = handoffDocument(spec, payload, new Date('2026-10-01T12:00:00Z'));
      expect(doc.version, what).toBe(2);
      const parsed = parseMissionDocument(viaJson(doc), onThePanel());
      expect(parsed.usable, what).toBe(true);
      expect(parsed.issues, what).toEqual([]);
      const s = parsed.state;
      expect(s.vehicleId).toBe(spec.id);
      expect(s.vehicleSpec, what).toEqual(spec);
      expect(s.dynamics).toEqual({ model: 'pointMass', wind: 'calm', seed: 20260919 });
      expect(s.siteId).toBe(spec.sites[0]);
      expect(s.orbitId).toBe(HANDOFF_ORBIT);
      expect(s.satelliteId).toBe(HANDOFF_SATELLITE);
      expect(s.payloadMass).toBe(payload);
      expect(s.launchTime.toISOString()).toBe('2026-10-01T12:00:00.000Z');
      // nothing of the panel's last mission is left on a vehicle it does not belong to
      expect(s.padId).toBeUndefined();
      expect(s.rendezvous).toBeUndefined();
      expect(s.failure).toEqual(DEFAULT_FAILURE);
      expect(validateConfigInput(s)).toEqual([]);
    }
  });

  it('asks for six-DOF only when the experimental option is chosen, and the panel takes that too', () => {
    const { spec, payload } = stretchedFalcon();
    const parsed = parseMissionDocument(viaJson(handoffDocument(spec, payload, new Date(), 'sixDof')), onThePanel());
    expect(parsed.issues).toEqual([]);
    expect(parsed.state.dynamics?.model).toBe('sixDof');
  });

  it('carries at least the 1 kg an orbital mission must', () => {
    const { spec } = stretchedFalcon();
    const parsed = parseMissionDocument(viaJson(handoffDocument(spec, 0, new Date())), onThePanel());
    expect(parsed.issues).toEqual([]);
    expect(parsed.state.payloadMass).toBe(1);
  });

  it('flies the remix it handed off, point-mass: it lifts off and climbs', () => {
    const { spec, payload } = stretchedFalcon();
    const parsed = parseMissionDocument(viaJson(handoffDocument(spec, payload, new Date('2026-09-15T12:00:00Z'))), onThePanel());
    const sim = new Simulation(configOf(parsed.state), { headless: true });
    expect(sim.rigidRuntime).toBeUndefined();
    let guard = 0;
    while (!sim.done && sim.state.t < 60 && guard++ < 100000) sim.step(sim.suggestedDt());
    const keys = sim.events.map((e) => e.key);
    expect(keys).toContain('evt.liftoff');
    expect(keys).not.toContain('evt.noLiftoff');
    expect(sim.state.t).toBeGreaterThanOrEqual(60);
    expect(sim.state.altitude - sim.site.altitude).toBeGreaterThan(3000);
    expect(sim.state.status).not.toBe('failed');
  });
});
