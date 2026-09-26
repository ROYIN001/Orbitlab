/**
 * Custom vehicles in a mission (roadmap S02).
 *
 * A mission may carry its vehicle inline (`MissionConfig.vehicleSpec`). The
 * acceptance: a custom spec that is a deep copy of a catalogue vehicle, under
 * an id of its own, flies a recording IDENTICAL to the catalogue vehicle's —
 * point-mass and six-DOF, Falcon 9 and Soyuz-2.1a — including through the
 * physics worker's structured-clone transport. And a spec that is not a
 * vehicle is refused with a message that says where and why.
 */
import { describe, expect, it } from 'vitest';
import { Simulation } from '../src/physics/simulation';
import { FlightRecorder } from '../src/replay/recorder';
import { SimCore } from '../src/session/core';
import { WorkerSession, type SessionWorker } from '../src/session/session';
import type { FromCore, ToCore } from '../src/session/protocol';
import { DEFAULT_FAILURE } from '../src/physics/defaults';
import { defaultDynamics, supportsRigid } from '../src/physics/rigid/config';
import { orbitById } from '../src/data/orbits';
import { VEHICLES, isCatalogueVehicle, missionVehicle, vehicleById, vehicleDataId } from '../src/data/vehicles';
import { assertVehicleSpec, vehicleSpecProblems } from '../src/config/vehicle-spec';
import { validateConfigInput, type ConfigInput } from '../src/config/validation';
import { getRigidVehicleGeometry } from '../src/physics/rigid/vehicle-data';
import { stageName } from '../src/ui/names';
import { rendezvousAvailable } from '../src/physics/rendezvous/profiles';
import type { VehicleSpec } from '../src/types';
import { LAUNCH, copyOf, fly, mission } from './custom-vehicle-harness';

describe('custom vehicles (S02): identical flights', () => {
  // six-DOF: tests/custom-vehicle-falcon9-sixdof.test.ts and tests/custom-vehicle-soyuz-sixdof.test.ts
  for (const id of ['falcon9', 'soyuz21a'] as const) {
    it(`flies a copy of ${id} exactly as ${id}, point mass`, () => {
      const original = fly(mission(id, 'pointMass'), 7200);
      const copy = fly(mission(id, 'pointMass', copyOf(id)), 7200);
      expect(original.flight.done).toBe(true);
      expect(original.flight.status).not.toBe('failed');
      expect(copy.flight).toEqual(original.flight);
    }, 240_000);
  }

  it('keeps a copy identical when its name changes, and through the worker transport', () => {
    // The name is the designer's; what flies is the hardware.
    const renamed = copyOf('falcon9', { name: 'My first rocket' });
    const original = fly(mission('falcon9', 'pointMass'), 400);
    const copy = fly(mission('falcon9', 'pointMass', renamed), 400);
    expect(copy.flight).toEqual(original.flight);
    expect([...copy.names]).toEqual(['My first rocket']);
    // The flight worker gets the spec inside the config, structured-cloned as postMessage does.
    const replies: FromCore[] = [];
    const core = new SimCore({ post: (m) => replies.push(structuredClone(m)), later: (fn) => fn(), now: () => 0 });
    const worker: SessionWorker = {
      onmessage: null, onerror: null, onmessageerror: null,
      postMessage: (m: ToCore) => core.handle(structuredClone(m)), terminate: () => {},
    };
    const session = new WorkerSession(mission('falcon9', 'pointMass', renamed), worker, 1, (m) => { throw new Error(m); });
    const flush = () => { while (replies.length) worker.onmessage?.({ data: replies.shift()! } as MessageEvent<FromCore>); };
    flush();
    for (let i = 0; i < 200; i++) { session.advance(2, 1e9); flush(); }
    const inWorker = (core as unknown as { sim: Simulation }).sim;
    expect(inWorker.vehicleSpec).toEqual(renamed);
    expect(session.sim.vehicleSpec.name).toBe('My first rocket');
    const mirrored = session.recorder.frames.map(({ vehicleName: _, ...frame }) => structuredClone(frame));
    expect(mirrored.length).toBeGreaterThan(50);
    expect(mirrored).toEqual(original.flight.frames.slice(0, mirrored.length));
  }, 120_000);
});

describe('custom vehicles (S02): one resolver', () => {
  it('resolves the inline spec, else the catalogue', () => {
    const custom = copyOf('electron');
    expect(missionVehicle({ vehicleId: 'electron' })).toBe(vehicleById('electron'));
    expect(missionVehicle({ vehicleId: custom.id, vehicleSpec: custom })).toBe(custom);
    expect(() => missionVehicle({ vehicleId: 'electron', vehicleSpec: custom })).toThrow(/electron-copy/);
    expect(() => missionVehicle({ vehicleId: 'nothing' })).toThrow(/Unknown vehicle/);
    expect(isCatalogueVehicle('electron')).toBe(true);
    expect(isCatalogueVehicle(custom.id)).toBe(false);
  });

  it('reads id-keyed data through the origin, and gives an origin-less vehicle the generic ones', () => {
    const soyuz = copyOf('soyuz21a');
    expect(vehicleDataId(soyuz)).toBe('soyuz21a');
    expect(getRigidVehicleGeometry(soyuz).vehicleId).toBe('soyuz21a');
    expect(rendezvousAvailable(vehicleDataId(soyuz), 'crew', orbitById('iss'))).toBe(true);
    const scratch: VehicleSpec = { ...copyOf('soyuz21a'), id: 'scratch', derivedFrom: undefined, escapeSystem: undefined };
    expect(vehicleDataId(scratch)).toBe('scratch');
    expect(rendezvousAvailable(vehicleDataId(scratch), 'crew', orbitById('iss'))).toBe(false);
    // the flexible body's stage roles come from the spec itself, not a catalogue lookup
    const geometry = getRigidVehicleGeometry(scratch);
    expect(geometry.launcherStageIds).toEqual(['blokA', 'blokI']);
    expect(geometry.solidPropellantIds).toEqual([]);
    expect(getRigidVehicleGeometry(vehicleById('vegac')).solidPropellantIds).toEqual(['p120c', 'z40', 'z9']);
    expect(supportsRigid(scratch)).toBe(true);
    expect(supportsRigid('scratch')).toBe(false);
  });

  it('borrows the origin\'s translated stage names only for parts the designer kept', () => {
    const f9 = copyOf('falcon9');
    const renamed = copyOf('falcon9');
    renamed.stages[1] = { ...renamed.stages[1], name: 'Kick stage' };
    expect(stageName(f9, 's2', f9.stages[1].name)).toBe(stageName(vehicleById('falcon9'), 's2', f9.stages[1].name));
    expect(stageName(renamed, 's2', 'Kick stage')).toBe('Kick stage');
    const scratch = { ...f9, id: 'scratch', derivedFrom: undefined };
    expect(stageName(scratch, 's2', 'Upper')).toBe('Upper');
  });

  it('flies an origin-less vehicle on the generic behaviour', () => {
    const scratch: VehicleSpec = { ...copyOf('falcon9'), id: 'scratch-f9', name: 'Scratch', derivedFrom: undefined };
    const cfg = { ...mission('falcon9', 'sixDof', scratch) };
    const sim = new Simulation(cfg, { headless: true });
    const rec = new FlightRecorder();
    rec.start(sim);
    while (sim.state.t < 60 && !sim.done) rec.advance(2, 1e9);
    expect(sim.state.t).toBeGreaterThanOrEqual(60);
    expect(sim.state.status).not.toBe('failed');
    expect(sim.state.altitude).toBeGreaterThan(1000);
  }, 120_000);
});

describe('custom vehicles (S02): validation', () => {
  it('accepts a copy of every catalogue vehicle', () => {
    for (const v of VEHICLES) {
      expect({ [v.id]: vehicleSpecProblems(copyOf(v.id)) }).toEqual({ [v.id]: [] });
      // and without an origin, unless it claims the Soyuz escape system
      const { derivedFrom: _, escapeSystem, ...plain } = copyOf(v.id);
      expect({ [v.id]: vehicleSpecProblems(plain) }).toEqual({ [v.id]: [] });
      if (escapeSystem) expect(vehicleSpecProblems({ ...plain, escapeSystem }).map((i) => i.path)).toEqual(['escapeSystem']);
    }
  });

  const problems = (mutate: (spec: Record<string, any>) => void): string[] => {
    const spec = structuredClone(copyOf('falcon9')) as unknown as Record<string, any>;
    mutate(spec);
    return vehicleSpecProblems(spec).map((i) => `${i.path} ${i.message}`);
  };

  it('rejects NaN and Infinity, naming the field', () => {
    expect(problems((s) => { s.stages[1].engine.ispVac = NaN; })).toEqual(['stages[1].engine.ispVac must be a finite number (got NaN)']);
    expect(problems((s) => { s.stages[0].propellantMass = Infinity; })).toEqual(['stages[0].propellantMass must be a finite number (got Infinity)']);
    expect(problems((s) => { s.fairing.mass = -Infinity; })).toEqual(['fairing.mass must be a finite number (got -Infinity)']);
    expect(problems((s) => { s.maxQ = '35000'; })).toEqual(['maxQ must be a finite number (got string)']);
    // JSON has no NaN: a file that meant one says null
    expect(problems((s) => { s.stages[0].dryMass = null; })).toEqual(['stages[0].dryMass must be a finite number (got null)']);
  });

  it('rejects masses and dimensions that are not positive', () => {
    expect(problems((s) => { s.stages[0].dryMass = 0; })).toEqual(['stages[0].dryMass must be more than 0 (got 0)']);
    expect(problems((s) => { s.stages[1].propellantMass = -5; })).toEqual(['stages[1].propellantMass must be more than 0 (got -5)']);
    expect(problems((s) => { s.stages[0].diameter = 0; })).toEqual(['stages[0].diameter must be more than 0 (got 0)']);
    expect(problems((s) => { s.height = -70; })).toEqual(['height must be more than 0 (got -70)']);
    expect(problems((s) => { s.fairing.length = 0; })).toEqual(['fairing.length must be more than 0 (got 0)']);
  });

  it('rejects engines no chemical engine is', () => {
    expect(problems((s) => { s.stages[1].engine.ispVac = 3000; })).toEqual(['stages[1].engine.ispVac must be at most 480 (got 3000)']);
    expect(problems((s) => { s.stages[0].engine.thrustSL = s.stages[0].engine.thrustVac * 1.1; }))
      .toEqual([expect.stringMatching(/^stages\[0\]\.engine\.thrustSL must not exceed thrustVac/)]);
    expect(problems((s) => { s.stages[0].engine.ispSL = 0; }))
      .toEqual(['stages[0].engine lights on the pad, so it needs a sea-level thrust and specific impulse above zero']);
    expect(problems((s) => { s.stages[0].engine.count = 2.5; })).toEqual(['stages[0].engine.count must be a whole number (got 2.5)']);
    expect(problems((s) => { s.stages[0].engine.count = 0; })).toEqual(['stages[0].engine.count must be at least 1 (got 0)']);
    expect(problems((s) => { s.stages[1].engine.minThrottle = 1.5; })).toEqual(['stages[1].engine.minThrottle must be at most 1 (got 1.5)']);
  });

  it('rejects a stack the model does not fly', () => {
    expect(problems((s) => { s.stages = []; })).toEqual(['stages must be a list of 1 to 6 stages']);
    expect(problems((s) => { s.stages = Array.from({ length: 7 }, (_, i) => ({ ...s.stages[1], id: `u${i}` })); }))
      .toEqual(['stages must have at most 6 stages (got 7)']);
    expect(problems((s) => { s.stages[1].id = 's1'; })).toEqual(['stages "s1" names two parts: every stage and strap-on group needs its own id']);
    expect(problems((s) => { s.stages[1].id = 'spacecraft'; })).toEqual(['stages "spacecraft" is an id the vehicle model uses for itself']);
    expect(problems((s) => { s.stages[1].boosters = [structuredClone(vehicleById('falconheavy').stages[0].boosters![0])]; }))
      .toEqual(['stages[1].boosters strap-ons are flown on the first stage only']);
    expect(problems((s) => { s.fairing = 'none'; })).toEqual(['fairing must be a fairing, or null for an integrated payload bay (got string)']);
    expect(problems((s) => { s.fairing = null; })).toEqual([]);
  });

  it('rejects ids, sites and fields it does not know', () => {
    expect(problems((s) => { s.id = 'falcon9'; })).toEqual(['id "falcon9" is a catalogue vehicle\'s id: a custom vehicle needs an id of its own']);
    expect(problems((s) => { s.id = 'My Rocket'; })).toEqual([expect.stringMatching(/^id must be Latin letters, digits/)]);
    expect(problems((s) => { s.sites = ['moonbase']; })).toEqual(['sites[0] must be a launch site\'s id (got "moonbase")']);
    expect(problems((s) => { s.derivedFrom = 'saturn5'; })).toEqual(['derivedFrom must name a catalogue vehicle (got "saturn5")']);
    expect(problems((s) => { s.stages[0].propelantMass = 1; })).toEqual(['stages[0].propelantMass is not a field of this version']);
    expect(problems((s) => { s.guidanceDefaults.kickAngel = 3; })).toEqual(['guidanceDefaults.kickAngel is not a field of this version']);
    expect(vehicleSpecProblems(null)).toEqual([{ path: '', message: 'must be a vehicle (got null)' }]);
    expect(() => assertVehicleSpec({ ...copyOf('falcon9'), maxAccel: 0 })).toThrow('Invalid custom vehicle: maxAccel must be more than 0 (got 0)');
  });

  it('holds a mission with a custom vehicle to the same checks as any other', () => {
    const custom = copyOf('falcon9');
    const input = (spec: unknown, extra: Partial<ConfigInput> = {}): ConfigInput => ({
      vehicleId: custom.id, vehicleSpec: spec as VehicleSpec, satelliteId: 'starlink', siteId: 'cape', orbit: orbitById('starlink'),
      launchTime: LAUNCH, payloadMass: 15600, guidanceOverrides: {}, failure: { ...DEFAULT_FAILURE }, boosterRecovery: false,
      dynamics: defaultDynamics(custom), ...extra,
    });
    expect(validateConfigInput(input(custom))).toEqual([]);
    const bad = validateConfigInput(input({ ...custom, maxQ: NaN }));
    expect(bad).toEqual([{ field: 'setup.vehicle', code: 'vehicleSpec', detail: 'maxQ must be a finite number (got NaN)' }]);
    expect(validateConfigInput(input(custom, { vehicleId: 'other' }))).toEqual([
      { field: 'setup.vehicle', code: 'vehicleSpec', detail: 'id is "falcon9-copy", but the mission names vehicle "other"' }]);
    // the vehicle's own sites, recovery and six-DOF are its own
    expect(validateConfigInput(input(custom, { siteId: 'baikonur' }))).toEqual([{ field: 'setup.site', code: 'selection' }]);
    expect(validateConfigInput(input({ ...custom, recoverable: false }, { boosterRecovery: true })))
      .toEqual([{ field: 'setup.boosterRecovery', code: 'selection' }]);
  });
});
