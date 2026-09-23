/**
 * One mission flown with a recovery plan until every recovered body is down,
 * for the return tests (tests/recovery-return.test.ts,
 * tests/rigid-return.test.ts, tests/heavy/falcon-heavy-returns.test.ts).
 */
import { Simulation } from '../src/physics/simulation';
import { vehicleById } from '../src/data/vehicles';
import { DEFAULT_FAILURE, guidanceForVehicle } from '../src/physics/defaults';
import { defaultDynamics } from '../src/physics/rigid/config';
import type { MissionConfig, RecoveryPlan } from '../src/types';

export function flyWithReturns(p: {
  vehicleId: string; siteId?: string; payload: number; orbit: MissionConfig['orbit']; plan?: RecoveryPlan;
  model: 'pointMass' | 'sixDof'; tMax?: number;
}): Simulation {
  const spec = vehicleById(p.vehicleId);
  const dynamics = p.model === 'sixDof' ? defaultDynamics(p.vehicleId) : undefined;
  const sim = new Simulation({
    vehicleId: p.vehicleId, satelliteId: 'cubesats', siteId: p.siteId ?? 'cape', orbit: p.orbit,
    launchTime: new Date('2026-09-22T15:00:00Z'), payloadMassOverride: p.payload,
    guidance: guidanceForVehicle(spec, undefined, dynamics?.model), guidanceResolved: true,
    failure: { ...DEFAULT_FAILURE }, boosterRecovery: true, recoveryPlan: p.plan, ...(dynamics ? { dynamics } : {}),
  }, { headless: true });
  const tMax = p.tMax ?? 1200;
  while (sim.state.t < tMax && !sim.isFailed()) {
    sim.step(sim.suggestedDt());
    const returning = sim.debris.filter((d) => d.recovery);
    if (returning.length && returning.every((d) => !d.alive) && sim.state.t > 300) break;
  }
  return sim;
}
