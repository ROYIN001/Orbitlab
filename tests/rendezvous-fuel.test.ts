/** Finite-fuel actuator regressions, isolated from targeting and the ascent.
 * The white-box fixture puts a spacecraft at an orbital separation state;
 * it does not change production visibility or use a tuned flight outcome.
 */
import { describe, expect, it } from 'vitest';
import { Simulation } from '../src/physics/simulation';
import { orbitById } from '../src/data/orbits';
import { DEFAULT_FAILURE, DEFAULT_GUIDANCE } from '../src/physics/defaults';
import { G0, R_EARTH } from '../src/physics/constants';
import { gravityJ2 } from '../src/physics/gravity';
import { rk4Step } from '../src/physics/integrator';
import { SPACECRAFT } from '../src/physics/rendezvous/profiles';
import { circularState } from '../src/physics/rendezvous/station';
import { integrateRigidStep, type RigidState } from '../src/physics/rigid/integrator';
import { quatAngularDistance, quatInverseRotate, quatRotate, type Quat } from '../src/physics/rigid/math';
import { targetAttitude } from '../src/physics/rigid/runtime';
import { add, cross, dot, norm, scale, sub, v3, type Vec3 } from '../src/physics/vec3';
import { FlightRecorder } from '../src/replay/recorder';
import { ReplayPlayer } from '../src/replay/player';
import { captureFrame } from '../src/physics/frame';
import { SimCore } from '../src/session/core';
import type { FromCore } from '../src/session/protocol';

interface ActuatorFixture {
  propellant: number;
  burnLeft: number;
  burnDir: Vec3;
  body: RigidState | null;
  attitude: Quat;
  rateFeed: Vec3;
  integrate(dt: number, accel: Vec3, frameRate: Vec3): void;
  portNow(t: number): { p: Vec3; n: Vec3; v: Vec3; q: Quat; omega: Vec3 };
}
const IDENTITY: Quat = { w: 1, x: 0, y: 0, z: 0 };
const MAIN_FLOW = SPACECRAFT.mainThrust / (SPACECRAFT.mainIsp * G0);
const inertia = [SPACECRAFT.inertia[0], 0, 0, 0, SPACECRAFT.inertia[1], 0, 0, 0, SPACECRAFT.inertia[2]] as const;

function fixture(fuel: number, rigid = false) {
  const sim = new Simulation({
    vehicleId: 'soyuz21a', satelliteId: 'crew', siteId: 'baikonur', orbit: orbitById('iss'),
    launchTime: new Date('2026-09-20T00:00:00Z'), guidance: { ...DEFAULT_GUIDANCE },
    failure: { ...DEFAULT_FAILURE }, boosterRecovery: false,
    rendezvous: { profile: 'twoOrbit', port: 'rassvet' },
  }, { headless: true });
  const initial = circularState(R_EARTH + 220e3, 0.8, 1, 0.3);
  Object.assign(sim.state, { ...initial, t: 530, status: 'rendezvous', payloadSeparated: true });
  const spacecraft = sim.vehicle.stages.find((stage) => stage.spec.isSpacecraft)!;
  spacecraft.propellant = fuel;
  sim.rendezvous.start();
  const actuator = sim.rendezvous as unknown as ActuatorFixture;
  actuator.burnLeft = 20;
  actuator.burnDir = scale(initial.v, 1 / norm(initial.v));
  if (rigid) {
    actuator.body = { ...initial, attitudeQ: IDENTITY, omegaBody: v3() };
    actuator.attitude = IDENTITY;
    actuator.rateFeed = v3();
    sim.rendezvous.phase = 'final';
  } else sim.rendezvous.phase = 'burn';
  return { sim, rv: sim.rendezvous, actuator, dryMass: spacecraft.spec.dryMass, initial };
}

function closeVectors(actual: Vec3, expected: Vec3, tolerance: number): void {
  expect(norm(sub(actual, expected))).toBeLessThan(tolerance);
}

function atStationkeeping(f: ReturnType<typeof fixture>) {
  const port = f.actuator.portNow(f.sim.state.t);
  const q = targetAttitude(scale(port.n, -1), quatRotate(port.q, v3(1, 0, 0)));
  f.actuator.body = {
    r: add(port.p, scale(port.n, 150 + SPACECRAFT.probe)), v: port.v,
    attitudeQ: q, omegaBody: quatInverseRotate(q, port.omega),
  };
  f.actuator.attitude = q;
  f.sim.state.r = f.actuator.body.r; f.sim.state.v = f.actuator.body.v;
  f.rv.sync();
  return f;
}

/** Independent finely stepped orbit oracle with force limited by tank lifetime. */
function referencePoint(initial: { r: Vec3; v: Vec3 }, mass0: number, force: Vec3, flow: number, powered: number, total: number) {
  let state = initial;
  const segments = [{ start: 0, end: powered, force }, { start: powered, end: total, force: v3() }];
  for (const segment of segments) {
    let t = segment.start;
    while (t < segment.end - 1e-12) {
      const h = Math.min(0.005, segment.end - t);
      state = rk4Step(t, state, h, (time, r) => add(gravityJ2(r), scale(segment.force, 1 / (mass0 - flow * Math.min(time, powered)))));
      t += h;
    }
  }
  return state;
}

describe('rendezvous main-engine finite fuel', () => {
  it('coasts without engine impulse at zero fuel and never completes the requested burn', () => {
    const { sim, rv, actuator, initial, dryMass } = fixture(0);
    const expected = rk4Step(0, initial, 0.5, (_t, r) => gravityJ2(r));
    rv.step(0.5);
    closeVectors(sim.state.r, expected.r, 1e-8);
    closeVectors(sim.state.v, expected.v, 1e-10);
    expect(actuator.burnLeft).toBe(20);
    expect(sim.state.mass).toBe(dryMass);
    expect(sim.state.thrust).toBe(0);
    expect(sim.state.throttle).toBe(0);
    expect(sim.state.gLoad).toBe(0);
    expect(rv.phase).toBe('aborted');
    expect(sim.state.note).toBe('rendezvousFuelDepleted');
    expect(sim.events.some((event) => event.key === 'evt.rendezvousBurnDone')).toBe(false);
    expect(sim.state.rendezvous!.burns[0].done).toBe(false);
    expect(sim.events.filter((event) => event.key === 'evt.rendezvousFuelDepleted')).toHaveLength(1);
    rv.step(0.5);
    expect(sim.events.filter((event) => event.key === 'evt.rendezvousFuelDepleted')).toHaveLength(1);
  });

  it('uses a partial tank for its physical burn time then coasts for the rest of the step', () => {
    const fuel = MAIN_FLOW * 0.125;
    const { sim, rv, actuator, initial, dryMass } = fixture(fuel);
    const dir = actuator.burnDir;
    const expected = referencePoint(initial, dryMass + fuel, scale(dir, SPACECRAFT.mainThrust), MAIN_FLOW, 0.125, 0.5);
    const delivered = SPACECRAFT.mainIsp * G0 * Math.log((dryMass + fuel) / dryMass);
    rv.step(0.5);
    closeVectors(sim.state.r, expected.r, 1e-7);
    closeVectors(sim.state.v, expected.v, 1e-8);
    expect(actuator.burnLeft).toBeCloseTo(20 - delivered, 10);
    expect(sim.state.rendezvous!.propellant).toBe(0);
    expect(sim.vehicle.stages.find((stage) => stage.spec.isSpacecraft)!.propellant).toBe(0);
    expect(sim.state.mass).toBe(dryMass);
    expect(sim.state.t).toBe(530.5);
    expect(rv.phase).toBe('aborted');
    expect(sim.events.some((event) => event.key === 'evt.rendezvousBurnDone')).toBe(false);
    expect(sim.state.rendezvous!.burns[0].done).toBe(false);
  });

  it('finishes a small requested impulse with the rocket-equation mass loss and retains unused fuel', () => {
    const { sim, rv, actuator, initial, dryMass } = fixture(50);
    const wanted = 0.08, mass0 = dryMass + 50;
    actuator.burnLeft = wanted;
    const consumed = mass0 * -Math.expm1(-wanted / (SPACECRAFT.mainIsp * G0));
    const expected = referencePoint(initial, mass0, scale(actuator.burnDir, SPACECRAFT.mainThrust), MAIN_FLOW, consumed / MAIN_FLOW, 0.5);
    rv.step(0.5);
    expect(rv.phase).toBe('coast');
    closeVectors(sim.state.r, expected.r, 1e-7);
    closeVectors(sim.state.v, expected.v, 1e-8);
    expect(sim.state.rendezvous!.propellant).toBeCloseTo(50 - consumed, 10);
    expect(sim.state.mass).toBeCloseTo(mass0 - consumed, 10);
    expect(sim.events.filter((event) => event.key === 'evt.rendezvousBurnDone')).toHaveLength(1);
    expect(sim.events.some((event) => event.key === 'evt.rendezvousFuelDepleted')).toBe(false);
    expect(sim.state.rendezvous!.burns[0].done).toBe(true);
  });

  it('converges when the last available impulse crosses different step boundaries', () => {
    const fly = (dt: number) => {
      const { sim, rv } = fixture(MAIN_FLOW * 0.375);
      for (let t = 0; t < 1 - 1e-10; t += dt) rv.step(Math.min(dt, 1 - t));
      return sim;
    };
    const coarse = fly(0.5), fine = fly(0.05), finer = fly(0.025);
    closeVectors(coarse.state.r, finer.state.r, 1e-7);
    closeVectors(coarse.state.v, finer.state.v, 1e-8);
    closeVectors(fine.state.r, finer.state.r, 1e-7);
    expect([coarse, fine, finer].map((sim) => sim.state.rendezvous!.propellant)).toEqual([0, 0, 0]);
  });

  it('distinguishes an exactly achieved tank-limited impulse from a near-empty unmet impulse', () => {
    const fuel = MAIN_FLOW * 0.125;
    const exact = fixture(fuel);
    exact.actuator.burnLeft = SPACECRAFT.mainIsp * G0 * Math.log1p(fuel / exact.dryMass);
    exact.rv.step(0.5);
    // Inverting exp/log at this exact boundary leaves at most float roundoff.
    expect(exact.sim.state.rendezvous!.propellant).toBeCloseTo(0, 15);
    expect(exact.sim.state.rendezvous!.burns[0].done).toBe(true);
    expect(exact.sim.events.some((event) => event.key === 'evt.rendezvousFuelDepleted')).toBe(false);
    const nearEmpty = fixture(1e-10);
    nearEmpty.rv.step(0.5);
    expect(nearEmpty.sim.state.rendezvous!.propellant).toBe(0);
    expect(nearEmpty.rv.phase).toBe('aborted');
    expect(nearEmpty.actuator.burnLeft).toBeGreaterThan(19.999999);
    expect(nearEmpty.sim.state.rendezvous!.burns[0].done).toBe(false);
  });
});

describe('rendezvous RCS finite fuel', () => {
  it('applies neither translation nor control torque with an empty tank', () => {
    const { sim, rv, actuator, initial, dryMass } = fixture(0, true);
    actuator.rateFeed = v3(1, 1, 1);
    const expected = integrateRigidStep(530, actuator.body!, 0.25, (_t, body) => ({
      mass: dryMass, inertiaBody: inertia, forceECI: v3(), momentBody: v3(), externalAccelerationECI: gravityJ2(body.r),
    })).state;
    actuator.integrate(0.25, v3(1, 1, 1), v3());
    rv.sync();
    closeVectors(sim.state.r, expected.r, 1e-8);
    closeVectors(sim.state.v, expected.v, 1e-10);
    closeVectors(actuator.body!.omegaBody, v3(), 1e-12);
    expect(quatAngularDistance(actuator.body!.attitudeQ, IDENTITY)).toBeLessThan(1e-12);
    expect(norm(sub(sim.state.v, initial.v))).toBeGreaterThan(0); // gravity still acts
    expect(sim.state.rendezvous!.propellant).toBe(0);
    expect(rv.phase).toBe('aborted');
  });

  it('limits translation and torque by the same shared propellant, then preserves the angular impulse in coast', () => {
    const flow = (SPACECRAFT.translationAxial + SPACECRAFT.torque / 3) / (SPACECRAFT.thrusterIsp * G0);
    const powered = 0.125, total = 0.5;
    const { sim, rv, actuator, initial, dryMass } = fixture(flow * powered, true);
    actuator.rateFeed = v3(1, 0, 0); // saturated roll torque, no pitch/yaw
    const expected = referencePoint(initial, dryMass + flow * powered, v3(SPACECRAFT.translationAxial, 0, 0), flow, powered, total);
    actuator.integrate(total, v3(1, 0, 0), v3());
    rv.sync();
    closeVectors(sim.state.r, expected.r, 1e-7);
    closeVectors(sim.state.v, expected.v, 1e-8);
    const omega = SPACECRAFT.torque / SPACECRAFT.inertia[0] * powered;
    expect(actuator.body!.omegaBody.x).toBeCloseTo(omega, 12);
    const angle = SPACECRAFT.torque / SPACECRAFT.inertia[0] * (powered ** 2 / 2 + powered * (total - powered));
    expect(2 * Math.atan2(actuator.body!.attitudeQ.x, actuator.body!.attitudeQ.w)).toBeCloseTo(angle, 10);
    expect(sim.state.rendezvous!.propellant).toBe(0);
    expect(sim.state.mass).toBe(dryMass);
    expect(rv.phase).toBe('aborted');
    const before = actuator.body!.omegaBody.x;
    rv.step(0.25);
    expect(actuator.body!.omegaBody.x).toBeCloseTo(before, 12);
    expect(dot(sim.state.dir, v3(0, 1, 0))).toBeCloseTo(0, 12);
  });

  it('consumes only requested RCS flow when fuel remains and repeats deterministically', () => {
    const run = () => {
      const { sim, rv, actuator } = fixture(2, true);
      const mass = sim.state.mass;
      const acceleration = v3(10 / mass, 20 / mass, 30 / mass);
      actuator.integrate(0.25, acceleration, v3());
      rv.sync();
      return sim;
    };
    const first = run(), second = run();
    expect(first.state.rendezvous!.propellant).toBeCloseTo(2 - 60 / (SPACECRAFT.thrusterIsp * G0) * 0.25, 12);
    expect(first.state).toEqual(second.state);
    expect(first.events).toEqual(second.events);
  });

  it('does not cancel an already captured docking mechanism just because the RCS tank is empty', () => {
    const f = fixture(0, true);
    f.rv.phase = 'capture';
    f.actuator.rateFeed = v3(1, 0, 0);
    f.actuator.integrate(0.05, v3(), v3());
    f.rv.sync();
    expect(f.rv.phase).toBe('capture');
    closeVectors(f.actuator.body!.omegaBody, v3(), 1e-12);
    expect(f.sim.state.rendezvous!.propellant).toBe(0);
    expect(f.sim.events.some((event) => event.key === 'evt.rendezvousFuelDepleted')).toBe(false);
  });

  it('keeps a successful contact reached in the same empty-fuel step', () => {
    const f = atStationkeeping(fixture(0, true)), port = f.actuator.portNow(f.sim.state.t);
    const r = add(port.p, scale(port.n, SPACECRAFT.probe - 1e-6));
    const v = sub(add(port.v, cross(port.omega, sub(r, port.p))), scale(port.n, 0.12));
    f.actuator.body!.r = r; f.actuator.body!.v = v;
    f.sim.state.r = r; f.sim.state.v = v;
    f.rv.sync();
    f.rv.step(0.05);
    expect(f.sim.state.rendezvous!.contact!.captured).toBe(true);
    expect(f.rv.phase).toBe('capture');
    expect(f.sim.state.rendezvous!.propellant).toBe(0);
    expect(f.sim.events.filter((event) => event.key === 'evt.contact')).toHaveLength(1);
    expect(f.sim.events.some((event) => event.key === 'evt.rendezvousFuelDepleted')).toBe(false);
  });

  it('converges for a combined translation/roll cutoff across different step boundaries', () => {
    const flow = (SPACECRAFT.translationAxial + SPACECRAFT.torque / 3) / (SPACECRAFT.thrusterIsp * G0);
    const run = (dt: number) => {
      const f = fixture(flow * 0.375, true);
      f.actuator.rateFeed = v3(1, 0, 0);
      for (let t = 0; t < 1 - 1e-10; t += dt) {
        const h = Math.min(dt, 1 - t);
        if (f.rv.phase === 'aborted') f.rv.step(h);
        else f.actuator.integrate(h, v3(1, 0, 0), v3());
      }
      f.rv.sync();
      return f;
    };
    const coarse = run(0.5), fine = run(0.05), finer = run(0.025);
    for (const candidate of [coarse, fine]) {
      closeVectors(candidate.sim.state.r, finer.sim.state.r, 1e-7);
      closeVectors(candidate.sim.state.v, finer.sim.state.v, 1e-8);
      closeVectors(candidate.actuator.body!.omegaBody, finer.actuator.body!.omegaBody, 1e-12);
      expect(quatAngularDistance(candidate.actuator.body!.attitudeQ, finer.actuator.body!.attitudeQ)).toBeLessThan(1e-7);
      expect(candidate.sim.state.rendezvous!.propellant).toBe(0);
    }
  });

  it('records a manual TORU fuel-out without hidden force or a divergent replay frame', () => {
    const live = atStationkeeping(fixture(0, true)), repeated = atStationkeeping(fixture(0, true));
    const cmd = { translate: v3(0.3, 0, 0), rotate: v3(0.001, 0, 0) };
    const recorder = new FlightRecorder(); recorder.start(live.sim);
    expect(live.sim.commandToru(cmd)).toBe(true);
    const action = live.sim.actions.at(-1)!;
    expect(action.kind).toBe('commandToru');
    expect(repeated.sim.commandToru(cmd)).toBe(true);
    recorder.advance(0.05);
    repeated.sim.step(0.05);
    expect(captureFrame(live.sim)).toEqual(captureFrame(repeated.sim));
    expect(live.sim.actions).toEqual(repeated.sim.actions);
    expect(live.sim.state.rendezvous!.phase).toBe('aborted');
    expect(live.sim.state.rendezvous!.manual).toBe(false);
    const event = recorder.events.find((entry) => entry.key === 'evt.rendezvousFuelDepleted')!;
    expect(event.t).toBe(live.sim.state.t);
    expect(event.state!.t).toBe(event.t);
    expect(event.state!.r).toEqual(live.sim.state.r);
    const player = new ReplayPlayer(recorder);
    player.seek(event.t);
    // Replay also annotates availability of attitude-history tracks; every
    // physical field of this exact recorded frame must still agree.
    expect(player.frame()).toMatchObject(recorder.recordNow()!);
    expect(player.frame()!.rendezvous!.propellant).toBe(0);
    expect(player.frame()!.note).toBe('rendezvousFuelDepleted');
    expect(player.frame()!.rigid!.rcsPropellantKg).toBe(0);
  });
});

describe('finite-fuel worker transport parity', () => {
  it.each(['main-empty', 'main-partial', 'toru-empty', 'toru-partial'])('%s matches inline frames, fuel-out events and commands', (kind) => {
    const toru = kind.startsWith('toru'), fuel = kind.endsWith('empty') ? 0 : toru ? 1e-4 : MAIN_FLOW * 0.125;
    const prepare = () => toru ? atStationkeeping(fixture(fuel, true)) : fixture(fuel);
    const inline = prepare(), remote = prepare();
    const recorder = new FlightRecorder(); recorder.start(inline.sim);
    const replies: FromCore[] = [];
    const core = new SimCore({ post: (message) => replies.push(structuredClone(message)), later: () => {}, now: () => 0 });
    core.handle({ type: 'start', session: 1, cfg: remote.sim.cfg });
    // Seed the same physical boundary on each side, retaining actual command,
    // advance, delta and structured-clone behavior of the production core.
    const seeded = core as unknown as { sim: Simulation; recorder: FlightRecorder };
    seeded.sim = remote.sim;
    seeded.recorder = new FlightRecorder(); seeded.recorder.start(remote.sim);
    replies.length = 0;
    if (toru) {
      const cmd = { translate: v3(0.3, 0, 0), rotate: v3(0.001, 0, 0) };
      expect(inline.sim.commandToru(cmd)).toBe(true);
      recorder.captureChangedState();
      core.handle(structuredClone({ type: 'toru' as const, session: 1, cmd }));
    }
    const seconds = toru ? 0.05 : 0.5;
    recorder.advance(seconds);
    core.handle({ type: 'advance', session: 1, id: 1, seconds, maxSteps: 100, budgetMs: 1e9 });
    const result = replies.at(-1)!;
    expect(result.type).toBe('delta');
    if (result.type !== 'delta') throw new Error(result.message);
    expect(result.delta.live).toEqual(recorder.recordNow());
    expect(captureFrame(remote.sim)).toEqual(captureFrame(inline.sim));
    expect(remote.sim.events).toEqual(inline.sim.events);
    expect(remote.sim.actions).toEqual(inline.sim.actions);
    expect(result.delta.live.rendezvous!.propellant).toBe(0);
    expect(result.delta.live.note).toBe('rendezvousFuelDepleted');
    expect(remote.sim.state.rendezvous!.burns[0].done).toBe(false);
  });
});
