import { describe, expect, it } from 'vitest';
import { compareRigidMissions, runRigidMissionConvergence } from './rigid-mission-convergence-harness';

describe('full 6DOF mission convergence at a fixed control clock', () => {
  for (const id of ['leo', 'iss'] as const) it(`${id}: reaches the actual target and preserves checkpoint/event accuracy`, () => {
    const runs = [0.01, 0.005].map(step => {
      const result = runRigidMissionConvergence(id, step,
        value => console.log('MISSION_CONVERGENCE_PROGRESS', JSON.stringify(value)));
      console.log('MISSION_CONVERGENCE_RUN', JSON.stringify(result));
      return result;
    });
    const comparison = compareRigidMissions(runs[0], runs[1]);
    console.log('MISSION_CONVERGENCE_COMPARISON', JSON.stringify(comparison));
    for (const run of runs) {
      expect(run.finite, `finite ${run.integrationStepS}s state`).toBe(true);
      expect(run.status, JSON.stringify(run.events.slice(-6))).toBe('orbit');
      expect(run.targetReached).toBe(true);
      expect(run.payloadSeparated).toBe(true);
      // Independent fleet bands and elements re-derived from raw r/v; checking
      // only the simulation's own target flag would grade its bookkeeping.
      expect(run.orbitMisses).toEqual([]);
      expect(run.maximumNormError).toBeLessThan(1e-8);
      expect(run.discontinuousCheckpoints).toEqual([]);
    }
    expect(comparison.sameClassification).toBe(true);
    expect(comparison.checkpoints.length).toBeGreaterThanOrEqual(6);
    for (const point of comparison.checkpoints) {
      expect(point.sameConfiguration, `body identity at T${point.t}`).toBe(true);
      expect(point.positionDeltaM, `position at T${point.t}`).toBeLessThan(10);
      expect(point.velocityDeltaMs, `velocity at T${point.t}`).toBeLessThan(0.1);
      expect(point.attitudeDeltaDeg, `attitude at T${point.t}`).toBeLessThan(0.1);
    }
    expect(comparison.nominalEventCount).toBe(comparison.referenceEventCount);
    for (const event of comparison.mainEvents) {
      expect(event.identity).toBe(event.referenceIdentity);
      expect(event.timeDeltaS).not.toBeNull();
      expect(Math.abs(event.timeDeltaS!), `event ${event.identity}`).toBeLessThan(0.02);
    }
  }, 900000);
});
