import { describe, expect, it } from 'vitest';
import { Simulation } from '../src/physics/simulation';
import { atmosphere } from '../src/physics/atmosphere';
import { captureFrame } from '../src/physics/frame';
import { FlightRecorder } from '../src/replay/recorder';
import { ReplayPlayer } from '../src/replay/player';
import { v3 } from '../src/physics/vec3';
import type { FailureMode } from '../src/types';
import type { StageState } from '../src/physics/vehicle';
import { rigidMission } from './rigid-harness';

function flying(mode: FailureMode = 'none', time = 0.11) {
  const cfg = rigidMission(); cfg.failure = { mode, time, stage: 0 };
  const sim = new Simulation(cfg, { headless: true });
  sim.state.t = 0.1; sim.step(0); // Drain countdown, with no integration or fuel consumption.
  sim.setRigidCommand({ mode: 'manual', throttle: 0.7, rates: v3(0.01, 0.02, -0.01) });
  return sim;
}

function fuel(sim: Simulation) {
  return { stages: sim.vehicle.stages.map(stage => ({ propellant: stage.propellant,
    boosters: stage.boosters.map(booster => booster.propellant) })), rcs: { ...sim.rigidRuntime!.consumed } };
}

describe('accepted in-flight propulsion failures', () => {
  it.each(['engineOut', 'thrustLoss', 'rangeSafety'] as const)('%s is reflected in the exact event frame', mode => {
    const sim = flying(mode), nominal = flying();
    const recorder = new FlightRecorder(); recorder.start(sim);
    recorder.advance(0.01); nominal.step(sim.state.t - nominal.state.t);
    const event = sim.events.find(item => item.key === (mode === 'rangeSafety' ? 'evt.ftsCommanded' : `evt.${mode}`))!;
    expect(event.t).toBeCloseTo(0.11, 10);
    const exact = new ReplayPlayer(recorder).frameAt(event.t)!;
    const expected = mode === 'rangeSafety' ? 0 : sim.vehicle.thrust(sim.state.t, atmosphere(sim.state.altitude).p, 0.7).thrust;
    expect(exact.thrust).toBeCloseTo(expected, 5);
    const engines = sim.rigidRuntime!.snapshot!.engines;
    expect(engines.reduce((sum, engine) => sum + engine.thrustBudgetN, 0)).toBeCloseTo(expected, 5);
    for (const engine of engines) expect(exact.rigid!.engineThrottles![engine.id])
      .toBe(engine.thrustBudgetN > 0 ? engine.upstreamThrottle ?? 1 : 0);
    expect(exact.rigid!.engineThrottles!['s1.engine.0']).toBe(0);
    if (mode !== 'engineOut') expect(Object.values(exact.rigid!.engineThrottles!).every(value => value === 0)).toBe(true);
    // The action happens after the same accepted physical interval as the
    // nominal flight: no second fuel charge, motion, or gimbal update occurs.
    expect(sim.state.r).toEqual(nominal.state.r); expect(sim.state.v).toEqual(nominal.state.v);
    expect(sim.state.rigid!.attitudeQ).toEqual(nominal.state.rigid!.attitudeQ);
    expect(sim.state.rigid!.omegaBody).toEqual(nominal.state.rigid!.omegaBody);
    expect(sim.state.rigid!.engineDeflections).toEqual(nominal.state.rigid!.engineDeflections);
    expect(fuel(sim)).toEqual(fuel(nominal));
    const saved = exact.rigid!.engineThrottles;
    recorder.advance(0.01);
    expect(new ReplayPlayer(recorder).frameAt(event.t)!.rigid!.engineThrottles).toEqual(saved);
  });

  it('refreshes an already-due failure without consuming fuel or moving finite gimbals', () => {
    const sim = flying('thrustLoss', 100); sim.step(0.01);
    const boundary = sim as unknown as { schedule(t: number, label: string, action: () => void): void;
      applyFailure(): void; processScheduledActions(): boolean };
    const before = captureFrame(sim), beforeFuel = fuel(sim);
    expect(Object.values(before.rigid!.engineDeflections).flat().some(angle => angle !== 0)).toBe(true);
    boundary.schedule(sim.state.t, 'fixture-thrust-loss', () => boundary.applyFailure());
    expect(boundary.processScheduledActions()).toBe(true);
    const after = captureFrame(sim);
    for (const key of ['t', 'r', 'v', 'mass'] as const) expect(after[key]).toEqual(before[key]);
    for (const key of ['attitudeQ', 'omegaBody', 'engineDeflections', 'cgBody', 'inertiaBody'] as const)
      expect(after.rigid![key]).toEqual(before.rigid![key]);
    expect(fuel(sim)).toEqual(beforeFuel);
    expect(after.thrust).toBe(0);
    expect(Object.values(after.rigid!.engineThrottles!).every(value => value === 0)).toBe(true);
  });

  it('stops processing later due actions after range safety destroys the vehicle', () => {
    const sim = flying('rangeSafety', 0.11);
    const boundary = sim as unknown as { schedule(t: number, label: string, action: () => void): void };
    let ran = false;
    boundary.schedule(0.11, 'fixture-after-destruction', () => { ran = true; });
    sim.step(0.01);
    expect(sim.isFailed()).toBe(true); expect(ran).toBe(false);
    expect(Object.values(sim.state.rigid!.engineThrottles!).every(value => value === 0)).toBe(true);
  });

  it.each(['ascent', 'burn'] as const)('accepts an upper-stage ignition in %s while preserving the orbital alignment gate', status => {
    const sim = flying();
    const boundary = sim as unknown as { detachStage(stage: StageState): void;
      schedule(t: number, label: string, action: () => void): void; processScheduledActions(): boolean };
    boundary.detachStage(sim.vehicle.stages[0]);
    sim.state.status = status; sim.state.throttle = 0;
    sim.rigidRuntime!.setCommand({ mode: 'auto', throttle: 1, rates: v3() });
    const before = captureFrame(sim), beforeFuel = fuel(sim), next = sim.vehicle.active!;
    expect(next.ignited).toBe(false);
    boundary.schedule(sim.state.t, 'fixture-upper-ignition', () => sim.vehicle.igniteStage(next, sim.state.t));
    boundary.processScheduledActions();
    const after = captureFrame(sim);
    expect(next.ignited).toBe(true);
    if (status === 'ascent') {
      expect(after.thrust).toBeGreaterThan(1e5);
      expect(Object.values(after.rigid!.engineThrottles!).some(value => value > 0)).toBe(true);
    } else {
      expect(after.thrust).toBe(0);
      expect(Object.values(after.rigid!.engineThrottles!).every(value => value === 0)).toBe(true);
    }
    expect(after.r).toEqual(before.r); expect(after.v).toEqual(before.v);
    expect(after.rigid!.attitudeQ).toEqual(before.rigid!.attitudeQ);
    expect(after.rigid!.omegaBody).toEqual(before.rigid!.omegaBody);
    expect(after.rigid!.engineDeflections).toEqual(before.rigid!.engineDeflections);
    expect(fuel(sim)).toEqual(beforeFuel);
  });
});
