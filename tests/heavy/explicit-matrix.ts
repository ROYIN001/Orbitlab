/**
 * Every vehicle flown on its reference mission (tests/sixdof-fleet) with the
 * explicit ascent guidance of roadmap G01 — PEG and IGM — as a rigid six-DOF
 * vehicle in crosswind, and judged as the fleet is: the target orbit, the orbit
 * re-derived from the raw state and the insertion clock (tests/fleet-harness.ts).
 */
import { expect, it } from 'vitest';
import { Simulation } from '../../src/physics/simulation';
import { acceptanceFailures, caseKey } from '../fleet-harness';
import { fleetCaseConfig, referenceCase } from './flex-matrix';
import type { ExplicitLaw } from '../../src/physics/explicit-guidance';

export function explicitFleet(vehicles: readonly string[], laws: readonly ExplicitLaw[] = ['peg', 'igm']): void {
  for (const vehicle of vehicles) for (const law of laws) {
    const c = referenceCase(vehicle);
    if (!c) continue;
    it(`${caseKey(c)} reaches its target on ${law.toUpperCase()}`, () => {
      const base = fleetCaseConfig(c);
      const sim = new Simulation({ ...base, dynamics: { model: 'sixDof', wind: 'crosswind', seed: 20260919, explicitGuidance: { law } } }, { headless: true });
      const limit = c.orbit === 'gto' ? 30 * 3600 : 10 * 3600;
      let guard = 0;
      while (!sim.done && sim.state.t < limit && guard++ < 20_000_000) sim.step(sim.suggestedDt());
      const guidance = sim.events.filter((e) => e.key.startsWith('evt.guidance')).map((e) => `${e.key}@${e.t.toFixed(0)}`);
      // One line per flight for the record (docs/history/PARALLEL-GNC-2026-09.md, G01).
      console.log(`explicit ${law} ${caseKey(c)}: ${sim.state.status} ${guidance.join(' ')} Δv left ${sim.vehicle.deltaVRemaining().toFixed(0)} m/s`);
      const log = JSON.stringify(sim.events.slice(-6).map((e) => e.key));
      expect(acceptanceFailures(sim, c), log).toEqual([]);
    }, 3_600_000);
  }
}
