import { describe, expect, it } from 'vitest';
import { readinessTarget } from '../src/design/review-model';

describe('R3.4 readiness targets', () => {
  it('points at the part from typed fields, never from text', () => {
    expect(readinessTarget({ code: 'invalid', path: 'stages[1].engine.ispVac' })).toBe('stage:1');
    expect(readinessTarget({ code: 'invalid', path: 'stages[0].boosters[2].propellantMass' })).toBe('booster:0:2');
    expect(readinessTarget({ code: 'invalid', path: 'fairing.diameter' })).toBe('fairing');
    expect(readinessTarget({ code: 'upperWiderThanFairing' })).toBe('fairing');
    expect(readinessTarget({ code: 'implausibleFraction', stage: 0, booster: 1 })).toBe('booster:0:1');
    expect(readinessTarget({ code: 'weakUpperStage', stage: 2 })).toBe('stage:2');
  });

  it('has no target for the vehicle or the mission as a whole', () => {
    for (const code of ['lowDv', 'noPlan', 'capability', 'probeFailed', 'sixDofExperimental']) expect(readinessTarget({ code })).toBeNull();
    expect(readinessTarget({ code: 'invalid', path: 'name' })).toBeNull();
  });
});
