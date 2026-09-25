import { describe, expect, it } from 'vitest';
import {
  MISSION_FORMAT, MISSION_FORMAT_VERSION, copyMission, decodeMissionParam, encodeMissionParam, loadStoredMission,
  missionDocument, missionFileName, missionFileText, parseMissionDocument, readMissionFileText, saveStoredMission,
  type MissionState,
} from '../src/config/mission-file';
import { validateConfigInput } from '../src/config/validation';
import { orbitById } from '../src/data/orbits';
import { satelliteById } from '../src/data/satellites';
import { DEFAULT_FAILURE } from '../src/physics/defaults';
import { defaultDynamics } from '../src/physics/rigid/config';
import { CONTROL_FAULT_PRESETS } from '../src/physics/rigid/fault-config';
import { quickstartMission } from '../src/ui/quickstart';
import { WATCH_MISSIONS, watchMissionSettings } from '../src/ui/watch-missions';

const FROM = new Date('2026-09-25T06:00:00Z');

const fallback = (): MissionState => ({
  vehicleId: 'soyuz21a', satelliteId: 'crew', siteId: 'baikonur', orbitId: 'iss', orbit: { ...orbitById('iss') },
  launchTime: new Date('2026-09-25T00:00:00Z'), guidanceOverrides: {}, failure: { ...DEFAULT_FAILURE },
  boosterRecovery: false, payloadMass: satelliteById('crew').mass, dynamics: defaultDynamics('soyuz21a'),
});

/** A mission with every option the panel offers switched on and moved off its default. */
const everything = (): MissionState => ({
  vehicleId: 'falcon9', satelliteId: 'cubesats', siteId: 'cape', orbitId: 'custom',
  orbit: { ...orbitById('custom'), perigee: 410e3, apogee: 620e3, inclination: 45.5, argPerigee: 30, raanMode: 'fixed', raan: 123.4 },
  launchTime: new Date('2026-10-01T13:37:00Z'),
  guidanceOverrides: { kickAngle: 4.5, pitchOverAltitude: 350 },
  failure: { mode: 'thrustLoss', time: 95, stage: 1 },
  boosterRecovery: true, recoveryPlan: { core: { kind: 'droneShip' } },
  payloadMass: 4321,
  dynamics: {
    model: 'sixDof', wind: 'shear', seed: 4242,
    flex: { slosh: true, bending: true, notch: false, sloshDamping: 0.05 },
    control: { pitchYaw: { attitudeGain: 2, rateGain: 3.5 }, feedForward: 0.5 },
    navigation: { grade: 'mems', gnss: true, gnssOutage: [100, 160] },
    controlFaults: { faults: [{ kind: 'gimbalHardover', time: 60, engine: 1, axis: 'pitch', sign: 1 }], fdir: true },
    explicitGuidance: { law: 'igm', cycleS: 1 },
  },
});

/** Through JSON, as a file or the stored copy would take it. */
const viaJson = (state: MissionState) => JSON.parse(missionFileText(missionDocument(state)));

describe('mission document (U01)', () => {
  it('keeps the pad (V05) and the flight to the station (G07), and drops them with the mission they belong to', () => {
    const state: MissionState = { ...fallback(), padId: 'site1', rendezvous: { profile: 'fourOrbit', port: 'poisk' } };
    expect(validateConfigInput(state)).toEqual([]);
    const back = parseMissionDocument(viaJson(state), fallback());
    expect(back.issues).toEqual([]);
    expect(back.state.padId).toBe('site1');
    expect(back.state.rendezvous).toEqual({ profile: 'fourOrbit', port: 'poisk' });
    // a document naming a mission without them has none, whatever the page held
    const plain = parseMissionDocument(viaJson(fallback()), state);
    expect(plain.state.padId).toBeUndefined();
    expect(plain.state.rendezvous).toBeUndefined();
    // one the rules refuse goes back to none, with the field named
    const bad = viaJson(state);
    bad.mission.rendezvous = { profile: 'oneOrbit' };
    const fixed = parseMissionDocument(bad, fallback());
    expect(fixed.issues.map((i) => i.field)).toContain('setup.rendezvous');
    expect(fixed.state.rendezvous).toBeUndefined();
  });

  it('names its format and version', () => {
    const doc = missionDocument(fallback());
    expect(doc.format).toBe(MISSION_FORMAT);
    expect(doc.version).toBe(MISSION_FORMAT_VERSION);
    expect(doc.mission.launchTime).toBe('2026-09-25T00:00:00.000Z');
  });

  it('keeps every option the panel offers: PEG/IGM, INS/Kalman, slosh/bending, gains, faults, recovery', () => {
    const state = everything();
    expect(validateConfigInput(state)).toEqual([]);
    const back = parseMissionDocument(viaJson(state), fallback());
    expect(back.issues).toEqual([]);
    expect(back.usable).toBe(true);
    expect(back.state).toEqual(state);
  });

  it('keeps a Starship suborbital test flight', () => {
    const state: MissionState = {
      ...fallback(), vehicleId: 'starship', siteId: 'starbase', satelliteId: 'none', payloadMass: 0, orbitId: 'custom',
      orbit: { ...orbitById('custom'), perigee: -15e3, apogee: 213e3, inclination: 26.5, suborbital: true },
      dynamics: defaultDynamics('starship'),
    };
    if (validateConfigInput(state).length) state.satelliteId = satelliteById('cubesats').id;
    expect(validateConfigInput(state)).toEqual([]);
    const back = parseMissionDocument(viaJson(state), fallback());
    expect(back.issues).toEqual([]);
    expect(back.state.orbit.suborbital).toBe(true);
    expect(back.state).toEqual(state);
  });

  it.each(Object.entries(CONTROL_FAULT_PRESETS))('keeps the %s control-system failure preset', (_, preset) => {
    const state: MissionState = { ...fallback(), vehicleId: preset.vehicleId, dynamics: { ...defaultDynamics(preset.vehicleId), controlFaults: { faults: [...preset.faults] } } };
    const spec = parseMissionDocument(viaJson({ ...state, siteId: 'x' }), fallback());
    // the site is reset to the vehicle's first; everything else survives
    expect(spec.state.dynamics?.controlFaults).toEqual(state.dynamics?.controlFaults);
  });

  it.each(['leo', 'iss', 'gto'] as const)('round-trips the %s quick start', (id) => {
    const state = quickstartMission(id, FROM);
    expect(parseMissionDocument(viaJson(state), fallback())).toMatchObject({ issues: [], usable: true, state });
  });

  it.each(WATCH_MISSIONS.map((m) => m.id))('round-trips the %s watch mission', (id) => {
    const state = watchMissionSettings(id, FROM);
    const back = parseMissionDocument(viaJson(state), fallback());
    expect(back.issues).toEqual([]);
    expect(back.state).toEqual({ ...state, dynamics: state.dynamics ?? back.state.dynamics });
  });

  it('resets only the values that are invalid, and names each one', () => {
    const doc = viaJson(everything());
    doc.mission.orbit.perigee = 900e3; // above the apogee
    doc.mission.dynamics.control.pitchYaw.attitudeGain = 1e6;
    doc.mission.guidanceOverrides.kickAngle = -5;
    doc.mission.launchTime = 'yesterday';
    const back = parseMissionDocument(doc, fallback());
    expect(back.usable).toBe(true);
    expect(validateConfigInput(back.state)).toEqual([]);
    const fields = back.issues.map((i) => i.field);
    expect(fields).toEqual(expect.arrayContaining(['setup.perigee', 'setup.launchTime', 'setup.kickAngle']));
    expect(fields.some((f) => f.startsWith('setup.control.'))).toBe(true);
    // the orbit goes back to its preset, the gains to the autopilot's defaults
    expect(back.state.orbit).toEqual(orbitById('custom'));
    expect(back.state.dynamics?.control).toBeUndefined();
    expect(back.state.guidanceOverrides).toEqual({ pitchOverAltitude: 350 });
    expect(back.state.launchTime).toEqual(fallback().launchTime);
    // and what was valid is kept
    expect(back.state.dynamics?.navigation).toEqual(everything().dynamics?.navigation);
    expect(back.state.dynamics?.explicitGuidance).toEqual({ law: 'igm', cycleS: 1 });
    expect(back.state.failure).toEqual({ mode: 'thrustLoss', time: 95, stage: 1 });
  });

  it('starts an unknown vehicle over from the page mission', () => {
    const doc = viaJson(everything());
    doc.mission.vehicleId = 'saturnV';
    const back = parseMissionDocument(doc, fallback());
    expect(back.issues.map((i) => i.field)).toContain('setup.vehicle');
    expect(back.state.vehicleId).toBe('soyuz21a');
    expect(validateConfigInput(back.state)).toEqual([]);
  });

  it('moves a site the vehicle does not fly from to its own first site', () => {
    const doc = viaJson(everything());
    doc.mission.siteId = 'baikonur';
    doc.mission.recoveryPlan = undefined;
    const back = parseMissionDocument(doc, fallback());
    expect(back.issues.map((i) => i.field)).toContain('setup.site');
    expect(back.state.siteId).toBe('cape');
  });

  it('rejects what is not a mission document, keeping the page mission', () => {
    for (const raw of [null, 42, 'text', {}, { format: 'other', version: 1, mission: {} }, { format: MISSION_FORMAT, version: 'one', mission: {} }, { format: MISSION_FORMAT, version: 1 }]) {
      const back = parseMissionDocument(raw, fallback());
      expect(back.usable).toBe(false);
      expect(back.issues).toEqual([{ field: 'document', code: 'format' }]);
      expect(back.state).toEqual(fallback());
    }
  });

  it('reads a newer version as far as it can, and says so', () => {
    const doc = viaJson(everything());
    doc.version = MISSION_FORMAT_VERSION + 1;
    doc.mission.somethingNew = { x: 1 };
    const back = parseMissionDocument(doc, fallback());
    expect(back.usable).toBe(true);
    expect(back.issues).toEqual([{ field: 'document', code: 'newerVersion' }]);
    expect(back.state).toEqual(everything());
  });

  it('survives values of the wrong type without throwing', () => {
    const doc = viaJson(everything());
    Object.assign(doc.mission, { orbit: 'low', failure: 3, guidanceOverrides: [], dynamics: 'rigid', payloadMass: 'heavy', boosterRecovery: 'yes' });
    const back = parseMissionDocument(doc, fallback());
    expect(back.usable).toBe(true);
    expect(validateConfigInput(back.state)).toEqual([]);
  });

  it('does not share objects with the mission it came from', () => {
    const state = everything();
    const copy = copyMission(state);
    copy.dynamics!.flex!.slosh = false;
    copy.launchTime.setUTCFullYear(2000);
    expect(state.dynamics?.flex?.slosh).toBe(true);
    expect(state.launchTime.getUTCFullYear()).toBe(2026);
  });
});

describe('mission link and file (U01)', () => {
  it('carries the whole mission in a compact URL-safe parameter', async () => {
    const doc = missionDocument(everything());
    const param = await encodeMissionParam(doc);
    expect(param).toMatch(/^z[A-Za-z0-9_-]+$/);
    expect(param.length).toBeLessThan(1200);
    expect(await decodeMissionParam(param)).toEqual(JSON.parse(JSON.stringify(doc)));
  });

  it('refuses a parameter that is not a mission link', async () => {
    await expect(decodeMissionParam('xabc')).rejects.toThrow();
    await expect(decodeMissionParam('z!!!')).rejects.toThrow();
  });

  it('reads back a saved file, and nothing from a file that is not JSON', () => {
    const state = everything();
    const text = missionFileText(missionDocument(state));
    expect(parseMissionDocument(readMissionFileText(text), fallback()).state).toEqual(state);
    expect(readMissionFileText('not json')).toBeNull();
    expect(missionFileName(state)).toBe('falcon9-cape-2026-10-01-13-37.orbitlab.json');
  });

  it('keeps the last mission in the page store, and survives a store that throws', () => {
    const map = new Map<string, string>();
    const store = { getItem: (k: string) => map.get(k) ?? null, setItem: (k: string, v: string) => { map.set(k, v); } };
    saveStoredMission(everything(), store);
    expect(parseMissionDocument(loadStoredMission(store), fallback()).state).toEqual(everything());
    const broken = { getItem: () => { throw new Error('denied'); }, setItem: () => { throw new Error('denied'); } };
    expect(() => saveStoredMission(everything(), broken)).not.toThrow();
    expect(loadStoredMission(broken)).toBeNull();
  });
});
