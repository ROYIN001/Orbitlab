/**
 * G02 with G05's finding: a flight on a tactical or MEMS navigation reaches its target orbit. Their
 * gyro noise, read as rate, used to fire the jets until the second stage's cold gas was gone by
 * T+250 s, and the stack could not turn for its circularisation burn (`evt.burnAlignmentTimeout`).
 * The jets' rate deadband (`JET_RATE_DEADBAND_SIGMA`, src/physics/rigid/runtime.ts) leaves the
 * noise to the nozzles.
 */
import { describe, expect, it } from 'vitest';
import type { MissionConfig } from '../../src/types';
import { Simulation } from '../../src/physics/simulation';
import { fleetCaseConfig, referenceCase } from './flex-matrix';

describe('Falcon 9 to its reference orbit on a tactical and a MEMS navigation', () => {
  for (const grade of ['tactical', 'mems'] as const) {
    it(`${grade}: the burns align and the target orbit is reached, gas to spare`, () => {
      const cfg: MissionConfig = { ...fleetCaseConfig(referenceCase('falcon9')!),
        dynamics: { model: 'sixDof', wind: 'crosswind', seed: 20260919, navigation: { grade } } };
      const sim = new Simulation(cfg, { headless: true, equations: false, rigidOptions: { recordLoop: false } });
      let guard = 0, gasAt480 = NaN;
      while (!sim.done && sim.state.t < 6 * 3600 && guard++ < 20_000_000) {
        sim.step(sim.suggestedDt());
        if (Number.isNaN(gasAt480) && sim.state.t >= 480) gasAt480 = sim.rigidRuntime!.consumed.s2 ?? 0;
      }
      const keys = sim.events.map((e) => e.key);
      expect(keys).not.toContain('evt.burnAlignmentTimeout');
      expect(keys).toContain('evt.targetOrbit');
      // 30 kg on board: 4.4 kg (tactical) and 2.1 kg (MEMS) to T+480 s (the parking orbit); 16.4 and 14.7 kg to the end.
      expect(gasAt480).toBeLessThan(10);
      expect(sim.rigidRuntime!.consumed.s2).toBeLessThan(25);
    }, 1_800_000);
  }
});
