/**
 * The phase-6 delivered-orbit matrix: the two reference six-DOF missions
 * flown to payload separation under the weather and mass-flow variants that
 * the acceptance record lists (docs/SIXDOF-ACCEPTANCE.md, "delivered-orbit
 * matrix"). Each case is a complete flight at the 0.01 s control clock, which
 * takes minutes, so this file runs with `npm run test:heavy` and not with
 * `npm test`.
 *
 * A case passes on the same evidence the record used: an actual target-orbit
 * event, the payload separated, and no misses when the orbit is re-derived
 * independently from the raw position and velocity. The simulation's own
 * target flag is never enough on its own.
 */
import { expect, it } from 'vitest';
import { runRigidMissionConvergence, type MissionVariant } from '../rigid-mission-convergence-harness';

export interface MatrixCase { name: string; mission: 'leo' | 'iss'; variant: MissionVariant }

// Falcon 9 flies the 500 km quick start from the Cape, Soyuz-2.1a the ISS quick
// start from Baikonur (tests/rigid-harness.ts). The fixed-speed cases keep the
// declared constant profile (gust included) and replace only its east speed.
export const DELIVERED_MATRIX: readonly MatrixCase[] = [
  { name: 'Falcon 9 / quasi-steady / fixed 5 m/s', mission: 'leo', variant: { wind: 'crosswind', eastWindMs: 5 } },
  { name: 'Falcon 9 / quasi-steady / fixed 10 m/s', mission: 'leo', variant: { wind: 'crosswind', eastWindMs: 10 } },
  { name: 'Falcon 9 / quasi-steady / shear', mission: 'leo', variant: { wind: 'shear' } },
  { name: 'Soyuz-2.1a / quasi-steady / crosswind', mission: 'iss', variant: { wind: 'crosswind' } },
  { name: 'Soyuz-2.1a / quasi-steady / shear', mission: 'iss', variant: { wind: 'shear' } },
  { name: 'Falcon 9 / reduced flux / calm', mission: 'leo', variant: { massFlowModel: 'reducedFlux' } },
  { name: 'Soyuz-2.1a / reduced flux / calm', mission: 'iss', variant: { massFlowModel: 'reducedFlux' } },
];

/**
 * Register one matrix case as a test. The cases are spread over several files
 * because Vitest runs files in parallel and each flight is CPU-bound.
 */
export function deliveredCase(name: string): void {
  const c = DELIVERED_MATRIX.find(candidate => candidate.name === name);
  if (!c) throw new Error(`unknown matrix case ${name}`);
  it(c.name, () => {
    const run = runRigidMissionConvergence(c.mission, 0.01, undefined, c.variant);
    const { apoapsisAlt, periapsisAlt } = run.achievedElements;
    console.log('DELIVERED_MATRIX', JSON.stringify({ name: c.name, t: run.t, status: run.status,
      apogeeKm: +(apoapsisAlt / 1e3).toFixed(3), perigeeKm: +(periapsisAlt / 1e3).toFixed(3),
      misses: run.orbitMisses, windProfile: run.windProfile, massFlowModel: run.massFlowModel,
      dataRevision: run.dataRevision, ticks: run.ticks }));
    expect(run.finite, 'finite state').toBe(true);
    expect(run.status, JSON.stringify(run.events.slice(-6))).toBe('orbit');
    expect(run.targetReached, 'evt.targetOrbit').toBe(true);
    expect(run.payloadSeparated, 'payload separated').toBe(true);
    expect(run.orbitMisses).toEqual([]);
    expect(run.maximumNormError).toBeLessThan(1e-8);
    if (c.variant.massFlowModel) expect(run.massFlowModel).toBe(c.variant.massFlowModel);
    if (c.variant.eastWindMs !== undefined) expect(run.windProfile?.velocityENU?.x).toBe(c.variant.eastWindMs);
  }, 1_800_000);
}
