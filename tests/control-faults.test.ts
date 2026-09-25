import { describe, expect, it } from 'vitest';
import { Simulation } from '../src/physics/simulation';
import { vehicleById } from '../src/data/vehicles';
import { orbitById } from '../src/data/orbits';
import { DEFAULT_FAILURE, DEFAULT_GUIDANCE, guidanceForVehicle } from '../src/physics/defaults';
import { DEG } from '../src/physics/constants';
import { v3, type Vec3 } from '../src/physics/vec3';
import { ControlFaults, FDIR, GARBAGE_ATTITUDE, ISO_AXIS } from '../src/physics/rigid/faults';
import { CONTROL_FAULT_KINDS, CONTROL_FAULT_PRESETS, FAULT_FIELDS, controlFaultProblems, controlFaultsProblems, resolveControlFaults } from '../src/physics/rigid/fault-config';
import type { EngineActuatorSpec, EngineActuatorState, RcsThrusterSpec } from '../src/physics/rigid/actuators';
import { buildRigidVehicle } from '../src/physics/rigid/mass';
import { VehicleModel } from '../src/physics/vehicle';
import { validateConfigInput } from '../src/config/validation';
import { buildTelemetryCsv } from '../src/ui/csv';
import { localizeEventParams } from '../src/ui/names';
import { setLang, t } from '../src/i18n';
import type { ControlFaultSpec, ControlFaultsConfig, MissionConfig } from '../src/types';
import { LAUNCH_TIME } from './fleet-harness';

const IDENTITY = { w: 1, x: 0, y: 0, z: 0 };
const engine = (index: number, extra: Partial<EngineActuatorSpec> = {}): EngineActuatorSpec => ({
  id: `s1.engine.${index}`, positionBody: v3(0, 0.5 * index, 0), directionBody: v3(1, 0, 0), maxThrust: 1e6,
  gimbalAxesBody: [v3(0, 1, 0), v3(0, 0, 1)], maxGimbalRad: 5 * DEG, maxGimbalRateRadS: 20 * DEG, timeConstantS: 0.1, engineIndex: index, ...extra,
} as EngineActuatorSpec);
const jet = (index: number): RcsThrusterSpec => ({ id: `s1.rcs.${index}`, positionBody: v3(10, 1, 0), directionBody: v3(0, 0, 1), maxThrust: 400, isp: 70 });
const faults = (list: ControlFaultSpec[], fdir: boolean) => {
  const f = new ControlFaults({ faults: list, fdir, seed: 7 });
  f.stageId = 's1';
  return f;
};
const none = new Map<string, EngineActuatorState>();

function mission(vehicleId: string, controlFaults?: ControlFaultsConfig, extra: object = {}): MissionConfig {
  return { vehicleId, satelliteId: 'cubesats', siteId: vehicleById(vehicleId).sites[0], orbit: orbitById('leo'), launchTime: LAUNCH_TIME,
    guidance: guidanceForVehicle(vehicleById(vehicleId), DEFAULT_GUIDANCE, 'sixDof'), guidanceResolved: true,
    failure: { ...DEFAULT_FAILURE }, boosterRecovery: false,
    dynamics: { model: 'sixDof', wind: 'calm', seed: 20260919, ...(controlFaults ? { controlFaults } : {}), ...extra } } as MissionConfig;
}
function flyTo(sim: Simulation, until: number): Simulation {
  while (!sim.done && sim.state.t < until && sim.state.status !== 'failed') sim.step(sim.suggestedDt());
  return sim;
}

describe('the failures layer (roadmap G08)', () => {
  it('flies bit for bit as a flight without it until the first failure strikes', () => {
    const plain = new Simulation(mission('falcon9'), { headless: true });
    const empty = new Simulation(mission('falcon9', { faults: [], fdir: true }), { headless: true });
    const later = new Simulation(mission('falcon9', { faults: [{ kind: 'gimbalHardover', time: 1e5, engine: 'all' }], fdir: true }), { headless: true });
    for (let i = 0; i < 1500; i++) { const dt = plain.suggestedDt(); plain.step(dt); empty.step(dt); later.step(dt); }
    for (const sim of [empty, later]) {
      expect(sim.state.r).toEqual(plain.state.r);
      expect(sim.state.v).toEqual(plain.state.v);
      expect(sim.state.rigid!.attitudeQ).toEqual(plain.state.rigid!.attitudeQ);
      expect(sim.events.map((e) => e.key)).toEqual(plain.events.map((e) => e.key));
    }
    expect(empty.state.rigid!.controlFaults).toMatchObject({ fdir: true, active: [], units: ['ok', 'ok', 'ok'], selected: [1, 2, 3], computer: 'primary' });
    expect(plain.state.rigid!.controlFaults).toBeUndefined();
  }, 60000);

  it('hands back the very objects it was given while nothing has struck', () => {
    const f = faults([], true), truth = { attitudeQ: IDENTITY, omegaBody: v3(0.01, 0, 0) };
    f.begin(0, [engine(0)], none, [jet(0)], truth.omegaBody);
    expect(f.sense(0.01, truth)).toBe(truth);
    const specs = [engine(0)], commands = [{ deflections: [0.01, 0], throttle: 1 }];
    const drive = f.drive(specs, commands);
    expect(drive.commands).toBe(commands);
    expect(drive.specs).toBe(specs);
    const jets = [jet(0), jet(1)];
    expect(f.usableJets(jets)).toBe(jets);
    const duties = [0.3, 0];
    expect(f.jetDuties(jets, jets, duties)).toEqual({ computer: duties, actual: duties });
    expect(f.reported([{ deflections: [0.01, 0], throttle: 1 }], specs)[0].deflections).toEqual([0.01, 0]);
  });
});

describe('sensor failures and the IMU vote', () => {
  const truth = { attitudeQ: IDENTITY, omegaBody: v3(0.02, -0.01, 0.005) };
  const run = (f: ControlFaults, steps: number) => {
    let out = truth as { attitudeQ: typeof IDENTITY; omegaBody: Vec3 };
    for (let i = 0; i < steps; i++) {
      f.begin(i * 0.01, [], none, [], truth.omegaBody);
      out = f.sense(0.01, truth);
      f.commit(i * 0.01, 0.01, { specs: [], drive: { specs: [], commands: [], computer: [], frozen: new Map() }, start: [], actual: [], jets: [], computerDuties: [], actualDuties: [], gas: false });
    }
    return out;
  };
  const bias = (units: number[] | 'all'): ControlFaultSpec => ({ kind: 'gyroBias', time: 0, units, axis: 'pitch', magnitude: 2 });

  it('without the FDIR flies IMU 1 alone, however wrong it reads', () => {
    const f = faults([bias([1])], false);
    const out = run(f, 50);
    // ISO pitch is the simulator's −z: a +2 °/s pitch bias reads 2 °/s less about z.
    expect(out.omegaBody.z).toBeCloseTo(truth.omegaBody.z - 2 * DEG, 12);
    expect(f.record().selected).toEqual([1]);
    // The unit integrates its own attitude from what it reads: 0.5 s at 2 °/s.
    expect(f.record().sensorAttitudeErrorBody!.z).toBeCloseTo(-2 * DEG * 0.49, 9);
    // A failure on IMU 2 does not reach a computer that reads IMU 1.
    expect(run(faults([bias([2])], false), 20).omegaBody).toEqual(truth.omegaBody);
  });

  it('with the FDIR outvotes one bad unit, but a bad majority outvotes the good one', () => {
    const one = faults([bias([1])], true);
    const out = run(one, 30);
    expect(out.omegaBody.z).toBeCloseTo(truth.omegaBody.z, 12);
    expect(one.record().units).toEqual(['isolated', 'ok', 'ok']);
    expect(one.record().selected).toEqual([2, 3]);
    const events = one.takeEvents();
    expect(events.map((e) => e.key)).toEqual(['evt.controlFault', 'evt.fdirImuIsolated']);
    expect(events[1].t).toBeCloseTo(FDIR.sensorPersistenceS - 0.01, 9);
    const two = faults([bias([1, 2])], true);
    expect(run(two, 30).omegaBody.z).toBeCloseTo(truth.omegaBody.z - 2 * DEG, 12);
    expect(two.record().units).toEqual(['faulty', 'faulty', 'isolated']);
  });

  it('cannot see a failure all three units share (Proton-M 2013)', () => {
    const f = faults([{ kind: 'rateInverted', time: 0, units: 'all', axis: 'yaw' }], true);
    const out = run(f, 30);
    // ISO yaw is the simulator's +y: only that component turns over.
    expect(out.omegaBody).toEqual({ x: truth.omegaBody.x, y: -truth.omegaBody.y, z: truth.omegaBody.z });
    expect(f.record().units).toEqual(['faulty', 'faulty', 'faulty']);
    expect(f.takeEvents().some((e) => e.key === 'evt.fdirImuIsolated')).toBe(false);
  });

  it('opens the loop when every unit has failed, and flies the garbage without the FDIR (Ariane 501)', () => {
    const on = faults([{ kind: 'imuFailure', time: 0, units: 'all' }], true);
    run(on, 2);
    expect(on.openLoop).toBe(true);
    expect(on.record()).toMatchObject({ units: ['failed', 'failed', 'failed'], selected: [], openLoop: true });
    const demand = { desiredRates: v3(), angularAcceleration: v3(), momentBody: v3(1, 2, 3), saturated: false };
    expect(on.demand(demand).momentBody).toEqual(v3());
    expect(on.takeEvents().map((e) => e.key)).toContain('evt.fdirImuLost');
    const off = faults([{ kind: 'imuFailure', time: 0, units: 'all' }], false);
    const out = run(off, 2);
    expect(off.openLoop).toBe(false);
    expect(out.omegaBody).toEqual(v3());
    expect(off.record().sensorAttitudeErrorBody).toEqual(GARBAGE_ATTITUDE);
  });

  it('isolates a unit that flags itself failed at once', () => {
    const f = faults([{ kind: 'imuFailure', time: 0, units: [3] }], true);
    run(f, 1);
    expect(f.record().units).toEqual(['ok', 'ok', 'failed']);
    expect(f.takeEvents().find((e) => e.key === 'evt.fdirImuIsolated')!.params).toEqual({ unit: 3, fdirReason: 'flag' });
  });
});

describe('actuator failures and the gimbal monitor', () => {
  const step = (f: ControlFaults, specs: EngineActuatorSpec[], command: number[], steps: number, dt = 0.01) => {
    let states: EngineActuatorState[] = specs.map((s) => ({ deflections: s.gimbalAxesBody.map(() => 0), throttle: 1 }));
    const map = new Map<string, EngineActuatorState>();
    for (let i = 0; i < steps; i++) {
      specs.forEach((s, k) => map.set(s.id, states[k]));
      f.begin(i * dt, specs, map, [], v3());
      const commands = specs.map(() => ({ deflections: [...command], throttle: 1 }));
      const drive = f.drive(specs, commands);
      const next = f.actuate(drive, states, dt);
      f.commit(i * dt, dt, { specs, drive, start: states, actual: next, jets: [], computerDuties: [], actualDuties: [], gas: false });
      states = next;
    }
    return states;
  };

  it('drives a hard-over nozzle to its stop at its rate, and the FDIR shuts that engine down', () => {
    const specs = [engine(0), engine(1), engine(2)];
    const off = faults([{ kind: 'gimbalHardover', time: 0, engine: 1, axis: 'pitch', sign: 1 }], false);
    const states = step(off, specs, [0.001, 0], 150);
    // Pitch is about −z, the second hinge: +1 in pitch is −5° on it, slewed at 20 °/s, then the lag.
    expect(states[0].deflections[1]).toBeCloseTo(-5 * DEG, 6);
    expect(states[0].deflections[0]).toBeCloseTo(0, 9);
    expect(states[1].deflections).toEqual([expect.closeTo(0.001, 9), 0]);
    expect(off.takeShutdowns()).toEqual([]);
    const on = faults([{ kind: 'gimbalHardover', time: 0, engine: 1, axis: 'pitch', sign: 1 }], true);
    step(on, specs, [0.001, 0], 40);
    expect(on.takeShutdowns()).toEqual([{ stageId: 's1', engineIndex: 0, t: expect.closeTo(FDIR.gimbalPersistenceS + 0.02, 6) }]);
    expect(on.takeEvents().map((e) => e.key)).toEqual(['evt.controlFault', 'evt.fdirGimbalFailed']);
  });

  it('keeps a stuck nozzle where it stood and slows a slowed one', () => {
    const stuck = step(faults([{ kind: 'gimbalStuck', time: 0, engine: 'all' }], false), [engine(0)], [0.05, 0], 20);
    expect(stuck[0].deflections).toEqual([0, 0]);
    const slow = step(faults([{ kind: 'gimbalSlow', time: 0, engine: 'all', magnitude: 0.1 }], false), [engine(0)], [0.05, 0], 10);
    // 2 °/s for 0.1 s.
    expect(slow[0].deflections[0]).toBeCloseTo(0.2 * DEG, 6);
  });

  it('moves a miswired nozzle against its command, reads it backwards, and so the monitor sees nothing (Vega VV17)', () => {
    const specs = [engine(0), engine(1)];
    const f = faults([{ kind: 'actuatorPolarity', time: 0, engine: 'all' }], true);
    const states = step(f, specs, [0.02, -0.01], 150);
    expect(states[0].deflections[0]).toBeCloseTo(-0.02, 6);
    expect(states[0].deflections[1]).toBeCloseTo(0.01, 6);
    expect(f.reported(states, specs)[0].deflections[0]).toBeCloseTo(0.02, 6);
    expect(f.takeShutdowns()).toEqual([]);
    expect(f.takeEvents().map((e) => e.key)).toEqual(['evt.controlFault']);
  });

  it('shuts down no engine it cannot spare: a single engine, or every nozzle failed at once', () => {
    const single = faults([{ kind: 'gimbalHardover', time: 0, engine: 1 }], true);
    step(single, [engine(0)], [0, 0], 40);
    expect(single.takeShutdowns()).toEqual([]);
    expect(single.takeEvents().map((e) => e.key)).toContain('evt.fdirNoEngineOut');
    const all = faults([{ kind: 'gimbalHardover', time: 0, engine: 'all' }], true);
    step(all, [engine(0), engine(1), engine(2), engine(3)], [0, 0], 40);
    expect(all.takeShutdowns()).toEqual([]);
  });

  it('closes off a jet firing unasked and leaves out one that does not fire', () => {
    const jets = [jet(0), jet(1), jet(2)];
    const f = faults([{ kind: 'rcsStuckOn', time: 0, jet: 1 }, { kind: 'rcsFailedOff', time: 0, jet: 2 }], true);
    for (let i = 0; i < 40; i++) {
      f.begin(i * 0.01, [], none, jets, v3());
      const used = f.usableJets(jets);
      const duties = f.jetDuties(jets, used, used.map((j) => (j.id === 's1.rcs.1' ? 0.6 : 0)));
      if (i === 0) expect(duties.actual).toEqual([1, 0, 0]);
      f.commit(i * 0.01, 0.01, { specs: [], drive: { specs: [], commands: [], computer: [], frozen: new Map() }, start: [], actual: [], jets,
        computerDuties: duties.computer, actualDuties: duties.actual, gas: true });
    }
    expect(f.usableJets(jets).map((j) => j.id)).toEqual(['s1.rcs.2']);
    expect(f.jetDuties(jets, f.usableJets(jets), [0.5]).actual).toEqual([0, 0, 0.5]);
    expect(f.record().jets).toEqual([{ jet: 1, state: 'isolated' }, { jet: 2, state: 'excluded' }]);
  });
});

describe('flight-computer failures', () => {
  const hold = (fdir: boolean) => {
    const f = faults([{ kind: 'computerHold', time: 0.1, magnitude: 1 }], fdir), specs = [engine(0)];
    const sent: number[] = [];
    let states: EngineActuatorState[] = [{ deflections: [0, 0], throttle: 1 }];
    for (let i = 0; i < 150; i++) {
      f.begin(i * 0.01, specs, none, [], v3());
      const drive = f.drive(specs, [{ deflections: [0.001 * i, 0], throttle: 1 }]);
      sent.push(drive.commands[0].deflections[0]);
      const next = f.actuate(drive, states, 0.01);
      f.commit(i * 0.01, 0.01, { specs, drive, start: states, actual: next, jets: [], computerDuties: [], actualDuties: [], gas: false });
      states = next;
    }
    return { f, sent };
  };
  it('freezes the outputs through a hold, or for 0.2 s until the backup takes over', () => {
    const plain = hold(false);
    expect(plain.sent[50]).toBeCloseTo(0.009, 12);
    expect(plain.sent[110]).toBeCloseTo(0.110, 12);
    expect(plain.f.takeEvents().map((e) => e.key)).toEqual(['evt.controlFault', 'evt.computerResumed']);
    const backed = hold(true);
    expect(backed.sent[25]).toBeCloseTo(0.009, 12);
    expect(backed.sent[40]).toBeCloseTo(0.040, 12);
    expect(backed.f.record().computer).toBe('backup');
    expect(backed.f.takeEvents().map((e) => e.key)).toEqual(['evt.controlFault', 'evt.fdirBackupComputer']);
  });

  it('reverses the control moment about the axis whose gain has the wrong sign', () => {
    const f = faults([{ kind: 'gainSign', time: 0, axis: 'pitch' }], true);
    f.begin(0, [], none, [], v3());
    const demand = { desiredRates: v3(), angularAcceleration: v3(), momentBody: v3(1, 2, 3), saturated: false };
    expect(f.demand(demand).momentBody).toEqual(v3(1, 2, -3));
    expect(ISO_AXIS.pitch).toEqual(v3(0, 0, -1));
  });
});

describe('the FDIR shutting an engine down', () => {
  it('takes the shut engine\'s share, and the rest of any loss from the lowest index as before', () => {
    const vehicle = new VehicleModel(vehicleById('falcon9'), 1000);
    vehicle.igniteStage(vehicle.stages[0], 0);
    const thrust = () => buildRigidVehicle(vehicle, { coreThrottle: 1, time: 1 }).engines.filter((e) => e.id.startsWith('s1.')).map((e) => e.thrustBudgetN);
    const full = thrust();
    vehicle.stages[0].engineFraction = 8 / 9;
    const legacy = thrust();
    expect(legacy[0]).toBeCloseTo(0, 6);
    vehicle.stages[0].shutEngines = [4];
    const shut = thrust();
    expect(shut[4]).toBeCloseTo(0, 6);
    expect(shut[0]).toBeCloseTo(full[0], 6);
    expect(shut.reduce((a, b) => a + b, 0)).toBeCloseTo(legacy.reduce((a, b) => a + b, 0), 3);
  });
});

describe('accidents re-created (roadmap G08)', () => {
  const fly = (key: keyof typeof CONTROL_FAULT_PRESETS, fdir: boolean, until: number) => {
    const p = CONTROL_FAULT_PRESETS[key];
    return flyTo(new Simulation(mission(p.vehicleId, { faults: [...p.faults], fdir }), { headless: true }), until);
  };
  it('Ariane 501: every IMU fails at T+36.7 s and the vehicle breaks up about two seconds later, FDIR or not', () => {
    for (const fdir of [false, true]) {
      const sim = fly('ariane501', fdir, 60);
      const breakup = sim.events.find((e) => e.key === 'evt.aeroBreakup');
      expect(breakup, `fdir ${fdir}`).toBeDefined();
      expect(breakup!.t).toBeGreaterThan(37.5);
      expect(breakup!.t).toBeLessThan(43);
      expect(sim.events.some((e) => e.key === 'evt.fdirImuLost')).toBe(fdir);
    }
  }, 60000);

  it('Proton-M 2013: yaw rate read backwards from lift-off; the vehicle is lost within twenty seconds', () => {
    const sim = fly('proton2013', true, 40);
    expect(sim.state.status).toBe('failed');
    expect(sim.state.t).toBeLessThan(20);
    expect(sim.events.some((e) => e.key === 'evt.fdirImuIsolated')).toBe(false);
  }, 60000);

  it('a Falcon 9 nozzle hard-over at T+60 s: the FDIR shuts the engine down within 0.3 s and the flight goes on', () => {
    const sim = fly('falconGimbal', true, 110);
    const shut = sim.events.find((e) => e.key === 'evt.fdirEngineShutdown');
    expect(shut).toBeDefined();
    expect(shut!.t).toBeGreaterThan(60);
    expect(shut!.t).toBeLessThan(60.35);
    expect(shut!.params).toMatchObject({ engine: 1, n: 8, total: 9 });
    expect(sim.vehicle.stages[0].shutEngines).toEqual([0]);
    expect(sim.state.status).toBe('ascent');
  }, 90000);

  it('reads an injected failure live, from the next step', () => {
    const sim = flyTo(new Simulation(mission('falcon9'), { headless: true }), 20);
    expect(sim.rigidRuntime!.faults).toBeUndefined();
    expect(sim.injectControlFault({ kind: 'gyroBias', time: 0, units: [2], axis: 'yaw', magnitude: 3 }, true)).toBe('injected');
    expect(sim.injectControlFault({ kind: 'gnssLoss', time: 0 })).toBe('invalid');
    flyTo(sim, 21);
    expect(sim.events.filter((e) => /controlFault|fdir/.test(e.key)).map((e) => e.key)).toEqual(['evt.controlFault', 'evt.fdirImuIsolated']);
    expect(sim.state.rigid!.controlFaults!.units).toEqual(['ok', 'isolated', 'ok']);
    expect(new Simulation(mission('falcon9'), { headless: true }).injectControlFault({ kind: 'gainSign', time: 0 }) ).toBe('injected');
  }, 60000);

  it('feeds the sensor failures to the navigation, whose attitude drifts with the IMU it reads', () => {
    const sim = flyTo(new Simulation(mission('falcon9', { faults: [{ kind: 'gyroBias', time: 10, units: 'all', axis: 'roll', magnitude: 0.5 }] },
      { navigation: { grade: 'navigation', gnss: false, starTracker: false } }), { headless: true }), 20);
    const nav = sim.telemetry.at(-1)!.rigid!.navigation!;
    // 10 s at 0.5 °/s about the roll axis: the navigation believes it rolled 5° less than it did.
    expect(Math.abs(nav.attitudeError.x) / DEG).toBeGreaterThan(4);
    expect(Math.abs(nav.attitudeError.x) / DEG).toBeLessThan(6);
  }, 60000);
});

describe('failure settings', () => {
  it('knows every kind, and what each takes', () => {
    expect(CONTROL_FAULT_KINDS).toHaveLength(16);
    for (const kind of CONTROL_FAULT_KINDS) expect(controlFaultProblems({ kind, time: 1 }, { navigation: true })).toEqual([]);
    expect(FAULT_FIELDS.gyroBias).toEqual(['units', 'axis', 'magnitude']);
  });

  it('names each problem by its setup field', () => {
    expect(controlFaultProblems({ kind: 'warp', time: 0 })).toEqual([{ field: 'setup.faults.kind', value: 'warp' }]);
    expect(controlFaultProblems({ kind: 'gyroBias', time: -1, units: [0], magnitude: 200 }).map((p) => p.field))
      .toEqual(['setup.faults.time', 'setup.faults.units', 'setup.faults.magnitude']);
    expect(controlFaultProblems({ kind: 'gnssLoss', time: 0 }, { navigation: false })).toEqual([{ field: 'setup.faults.kind', value: 'gnssLoss' }]);
    expect(controlFaultProblems({ kind: 'gyroBias', time: 0, engine: 1 })).toEqual([{ field: 'setup.faults.title', value: 'engine' }]);
    expect(controlFaultsProblems({ faults: Array(9).fill({ kind: 'gainSign', time: 0 }) })[0].field).toBe('setup.faults.title');
    expect(controlFaultsProblems({ faults: [], preset: 'titanic' })).toEqual([{ field: 'setup.faults.preset', value: 'titanic' }]);
  });

  it('checks the failures with the rest of the mission, and needs navigation for the navigation\'s sensors', () => {
    const base = { vehicleId: 'falcon9', satelliteId: 'cubesats', siteId: 'cape', orbit: orbitById('leo'), launchTime: LAUNCH_TIME, payloadMass: 1000,
      guidanceOverrides: {}, failure: { ...DEFAULT_FAILURE }, boosterRecovery: false };
    const issues = validateConfigInput({ ...base, dynamics: { model: 'sixDof', wind: 'calm', seed: 1, controlFaults: { faults: [{ kind: 'accelBias', time: 0 }, { kind: 'gyroNoise', time: 0, magnitude: 100 }] } } });
    expect(issues).toEqual([{ field: 'setup.faults.kind', code: 'selection' }, { field: 'setup.faults.magnitude', code: 'maximum', limit: 90 }]);
    expect(validateConfigInput({ ...base, dynamics: { model: 'sixDof', wind: 'calm', seed: 1, navigation: {}, controlFaults: { faults: [{ kind: 'accelBias', time: 0 }] } } })).toEqual([]);
    expect(() => new Simulation(mission('falcon9', { faults: [{ kind: 'gnssLoss', time: 0 }] }), { headless: true })).toThrow(/Invalid dynamics/);
  });

  it('resolves to the runtime\'s options, the FDIR off by default and the seed from the dynamics seed', () => {
    expect(resolveControlFaults(undefined, 1)).toBeUndefined();
    const out = resolveControlFaults({ faults: [{ kind: 'imuFailure', time: 3, units: [1, 2] }] }, 5)!;
    expect(out.fdir).toBe(false);
    expect(out.seed).toBe((5 ^ 0x67303866) >>> 0);
    expect(resolveControlFaults({ faults: [], fdir: true, seed: 9 }, 5)).toEqual({ faults: [], fdir: true, seed: 9 });
  });

  it('keeps each preset valid on its own vehicle', () => {
    for (const p of Object.values(CONTROL_FAULT_PRESETS)) {
      expect(controlFaultsProblems({ faults: p.faults })).toEqual([]);
      expect(vehicleById(p.vehicleId)).toBeDefined();
    }
  });
});

describe('failures on the page', () => {
  it('writes the failure and the FDIR\'s events in every language, with no placeholder left', () => {
    const g = globalThis as { document?: unknown };
    if (!g.document) g.document = { documentElement: {} };
    const cases: [string, Record<string, string | number>][] = [
      ['evt.controlFault', { faultKind: 'gimbalHardover', engine: '1', faultAxis: 'pitch' }],
      ['evt.controlFault', { faultKind: 'rateInverted', units: 'all', faultAxis: 'yaw' }],
      ['evt.controlFault', { faultKind: 'computerHold' }],
      ['evt.fdirImuIsolated', { unit: 2, fdirReason: 'vote' }],
      ['evt.fdirEngineShutdown', { stage: 'First stage', engine: 1, n: 8, total: 9 }],
      ['evt.fdirJetExcluded', { jet: '3,4' }],
      ['evt.aeroBreakup', { qAlpha: 301, alphaDeg: 6.1, q: 48.9 }],
    ];
    for (const lang of ['en', 'th', 'ru'] as const) {
      setLang(lang);
      for (const [key, params] of cases) {
        const text = t(key, localizeEventParams(null, params));
        expect(text, `${lang} ${key}`).not.toMatch(/\{[a-zA-Z]+\}/);
        expect(text).not.toMatch(/gimbalHardover|rateInverted|computerHold|\bvote\b/);
      }
    }
    setLang('en');
    expect(t('evt.controlFault', localizeEventParams(null, cases[0][1]))).toBe('CONTROL FAILURE: Nozzle hard-over (engine 1 · Pitch)');
  });

  it('exports the failures and the FDIR\'s state in the CSV', () => {
    const sim = flyTo(new Simulation(mission('falcon9', { faults: [{ kind: 'gyroBias', time: 1, units: [1], axis: 'pitch', magnitude: 2 }], fdir: true }), { headless: true }), 3);
    const lines = buildTelemetryCsv(sim).split('\n');
    const cols = lines[0].split(',');
    expect(cols).toContain('imu_in_use');
    // The failure columns come last (quoted cells earlier in the row hold commas).
    const last = lines[lines.indexOf('') - 1].split(',');
    const at = (name: string) => last[last.length - (cols.length - cols.indexOf(name))];
    expect(at('faults_struck')).toBe('gyroBias');
    expect(at('imu_units')).toBe('isolated ok ok');
    expect(at('imu_in_use')).toBe('2 3');
    expect(at('computer')).toBe('primary');
  }, 60000);
});
