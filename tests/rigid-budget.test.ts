import { expect, it } from 'vitest';
import { Simulation } from '../src/physics/simulation';
import { rigidMission } from './rigid-harness';
import { norm } from '../src/physics/vec3';

it('closes the six-DOF ascent speed budget using actual vector forces', () => {
  const sim = new Simulation(rigidMission('leo'), { headless: true });
  while (sim.state.status === 'prelaunch') sim.step(sim.suggestedDt());
  const initialSpeed = norm(sim.state.v);
  // Before any discrete separation; such impulses are a separate speed jump.
  while (sim.state.t < 40) sim.step(sim.suggestedDt());
  const budget = sim.state.losses;
  const predicted = budget.dvThrust - budget.gravity - budget.drag - budget.steering;
  expect(sim.state.status).toBe('ascent');
  expect(budget.dvThrust).toBeGreaterThan(500);
  expect(budget.drag).toBeGreaterThan(0);
  expect(Math.abs(predicted - (norm(sim.state.v) - initialSpeed))).toBeLessThan(0.1);
}, 30000);
