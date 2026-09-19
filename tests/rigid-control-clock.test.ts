import { describe, expect, it, vi } from 'vitest';
import { Simulation } from '../src/physics/simulation';
import { rigidMission } from './rigid-harness';

describe('fixed flight-control cadence', () => {
  it('keeps guidance/controller tick times identical for every maximum RK step', () => {
    const clocks = [0.005, 0.01, 0.02].map(rigidDt => {
      const sim = new Simulation(rigidMission(), { headless: true, rigidDt });
      expect(sim.suggestedDt()).toBe(0.01);
      expect(sim.rigidRuntime!.integrationStepS).toBe(rigidDt);
      const updates = vi.spyOn(sim.rigidRuntime!, 'step');
      while (sim.state.t < 0.2 && !sim.isFailed()) sim.step(sim.suggestedDt());
      expect(sim.isFailed()).toBe(false);
      const clock = updates.mock.calls.map(call => ({ t: call[0], dt: call[2] }));
      expect(clock.length).toBeGreaterThan(10);
      expect(clock.every(tick => Math.abs(tick.dt - 0.01) < 1e-12)).toBe(true);
      return clock;
    });
    expect(clocks[1]).toEqual(clocks[0]);
    expect(clocks[2]).toEqual(clocks[0]);
  });
});
