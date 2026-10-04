import { describe, expect, it } from 'vitest';
import { MISSION_STEPS, missionSteps, stepActionable } from '../src/ui/mission-steps';

describe('R3.5 mission steps', () => {
  it('a mission being set up is at Check until its inputs are usable, then at Launch', () => {
    expect(missionSteps({ stage: 'setup', valid: false, inOrbit: false })).toMatchObject({ build: 'done', check: 'current', launch: 'todo' });
    expect(missionSteps({ stage: 'setup', valid: true, inOrbit: false })).toMatchObject({ check: 'done', launch: 'current', result: 'todo' });
  });

  it('a flight is at Launch, a finished one at Result; Orbit is off only for a flight that ended out of orbit', () => {
    expect(missionSteps({ stage: 'flight', valid: true, inOrbit: true })).toMatchObject({ launch: 'current', result: 'todo', orbit: 'todo' });
    expect(missionSteps({ stage: 'analysis', valid: true, inOrbit: true })).toMatchObject({ launch: 'done', result: 'current', orbit: 'todo' });
    expect(missionSteps({ stage: 'analysis', valid: true, inOrbit: false }).orbit).toBe('off');
  });

  it('exactly one step is current, whatever the state', () => {
    for (const stage of ['setup', 'flight', 'analysis'] as const) for (const valid of [true, false]) for (const inOrbit of [true, false]) {
      const s = missionSteps({ stage, valid, inOrbit });
      expect(MISSION_STEPS.filter((k) => s[k] === 'current')).toHaveLength(1);
    }
  });

  it('a chip acts only where there is somewhere to go', () => {
    expect(stepActionable('build', { stage: 'flight', inOrbit: false })).toBe(true);
    expect(stepActionable('check', { stage: 'setup', inOrbit: false })).toBe(true);
    expect(stepActionable('check', { stage: 'flight', inOrbit: false })).toBe(false);
    expect(stepActionable('launch', { stage: 'setup', inOrbit: false })).toBe(false);
    expect(stepActionable('result', { stage: 'flight', inOrbit: false })).toBe(false);
    expect(stepActionable('result', { stage: 'analysis', inOrbit: false })).toBe(true);
    expect(stepActionable('orbit', { stage: 'flight', inOrbit: true })).toBe(true);
    expect(stepActionable('orbit', { stage: 'analysis', inOrbit: false })).toBe(false);
  });
});
