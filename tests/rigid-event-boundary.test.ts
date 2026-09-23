import { describe, expect, it } from 'vitest';
import { Simulation } from '../src/physics/simulation';
import { captureFrame } from '../src/physics/frame';
import { FlightRecorder } from '../src/replay/recorder';
import { ReplayPlayer } from '../src/replay/player';
import { quatRotate } from '../src/physics/rigid/math';
import { groundPositionEci, groundVelocityEci } from '../src/physics/orbital';
import { DEG, OMEGA_EARTH } from '../src/physics/constants';
import { norm, sub } from '../src/physics/vec3';
import { rigidMission } from './rigid-harness';

describe('accepted scheduled-event recording', () => {
  it.each(['leo', 'iss'] as const)('%s records real pad ignition on arrival, with fuel consumed only afterwards', id => {
    const sim = new Simulation(rigidMission(id), { headless: true });
    const recorder = new FlightRecorder(); recorder.start(sim);
    const fuel = sim.vehicle.stages[0].propellant;
    recorder.advance(7.5);
    const ignition = sim.events.find(event => event.key === 'evt.ignition')!;
    expect(ignition).toBeDefined();
    expect(ignition.t).toBeCloseTo(-2.5, 9);
    expect(sim.state.t).toBeCloseTo(-2.5, 9);
    expect(sim.vehicle.stages[0].propellant).toBe(fuel);
    const player = new ReplayPlayer(recorder);
    const before = player.frameAt(ignition.t - 0.001)!;
    const exact = player.frameAt(ignition.t)!;
    expect(before.thrust).toBe(0);
    expect(Object.values(before.rigid!.engineThrottles!).every(value => value === 0)).toBe(true);
    expect(exact.thrust).toBeGreaterThan(1e6);
    const engines = sim.rigidRuntime!.snapshot!.engines;
    expect(engines.reduce((sum, engine) => sum + engine.thrustBudgetN, 0)).toBeCloseTo(exact.thrust, 4);
    for (const engine of engines) expect(exact.rigid!.engineThrottles![engine.id])
      .toBe(engine.thrustBudgetN > 0 ? engine.upstreamThrottle ?? 1 : 0);
    const datum = sub(exact.r, quatRotate(exact.rigid!.attitudeQ, exact.rigid!.cgBody));
    const pad = groundPositionEci(sim.site.latitude * DEG, sim.site.longitude * DEG, sim.site.altitude,
      sim.plan.gmst0 + OMEGA_EARTH * exact.t);
    expect(norm(sub(datum, pad))).toBeLessThan(1e-8);
    expect(norm(sub(exact.v, groundVelocityEci(exact.r)))).toBeLessThan(1e-8);
    expect(exact.liftoff).toBe(false);
    recorder.advance(0.01);
    expect(sim.vehicle.stages[0].propellant).toBeLessThan(fuel);
    expect(player.frameAt(ignition.t)).toEqual(exact);
  });

  it('pins the actual stage partition at its scheduled time before any later physical motion', () => {
    const sim = new Simulation(rigidMission(), { headless: true });
    sim.state.t = 0; sim.step(0); // drain countdown before the boundary fixture
    sim.state.status = 'coast'; sim.state.liftoff = true; sim.state.t = 100;
    // Isolate event/recorder chronology. The real stage partition and all frame
    // capture/interpolation code run; continuous dynamics are verified elsewhere.
    sim.stepFlight = dt => { sim.state.t += dt; return dt; };
    sim.debrisTracker.stepDebris = () => {};
    sim.staging.stageTo(1, false);
    const delay = sim.vehicle.stages[1].spec.sepDelay ?? 2;
    const recorder = new FlightRecorder(4); recorder.start(sim);
    recorder.advance(delay);
    const event = sim.events.find(item => item.key === 'evt.stageSep')!;
    expect(event.t).toBeCloseTo(100 + delay, 9);
    const actual = captureFrame(sim);
    expect(actual.stages[0].attached).toBe(false);
    expect(actual.debris).toHaveLength(1);
    recorder.advance(0.02);
    const player = new ReplayPlayer(recorder);
    expect(player.frameAt(event.t)).toMatchObject(actual);
    expect(player.frameAt(event.t - 0.001)!.stages[0].attached).toBe(true);
    expect(player.frameAt(event.t - 0.001)!.debris).toHaveLength(0);
  });

  it('captures an already-due transition before integration, including a zero-time failure', () => {
    const sim = new Simulation(rigidMission(), { headless: true });
    const recorder = new FlightRecorder(); recorder.start(sim);
    sim.schedule(sim.state.t, 'fixture-failure', () => {
      sim.state.status = 'failed'; sim.state.destroyed = true;
      sim.events.push({ t: sim.state.t, key: 'evt.vehicleLost', severity: 'fail' });
    });
    const before = captureFrame(sim);
    expect(recorder.advance(1)).toBe(0);
    expect(recorder.head!.t).toBe(before.t);
    expect(recorder.head!.r).toEqual(before.r);
    expect(recorder.head!.v).toEqual(before.v);
    expect(recorder.head!.destroyed).toBe(true);
  });
});
