/**
 * `fairing.sepAfterIgnition`: Proton-M and Angara-A5 drop the fairing a fixed
 * time after their third stage lights (ILS; docs/VALIDATION.md, F14), not on
 * the heating placard.
 */
import { describe, expect, it } from 'vitest';
import { flyMission } from './validation/flight-harness';
import { PROTON_T14R, ANGARA_F2 } from './validation/reference-data';
import { vehicleById } from '../src/data/vehicles';

describe('fairing jettison after a stage ignites', () => {
  it.each([['protonm', PROTON_T14R, 'p3', 10], ['angaraa5', ANGARA_F2, 'urm2', 9]] as const)('%s', { timeout: 60_000 }, (_, ref, stage, delay) => {
    expect(vehicleById(ref.mission.vehicleId).fairing?.sepAfterIgnition).toEqual({ stage, delay });
    const f = flyMission(ref.mission, 'pointMass', { until: 400 });
    expect(f.failed).toBe(false);
    const stageIndex = vehicleById(ref.mission.vehicleId).stages.findIndex((s) => s.id === stage);
    // that stage's ignition is the stageIndex-th `evt.ignition` (the first is lift-off)
    const ignitions = f.events.filter((e) => e.key === 'evt.ignition').map((e) => e.t);
    const lit = ignitions[stageIndex];
    const sep = f.eventTime('evt.fairingSep')!;
    expect(sep - lit).toBeGreaterThanOrEqual(delay);
    expect(sep - lit).toBeLessThan(delay + 1);
  });
});
