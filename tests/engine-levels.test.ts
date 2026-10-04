import { describe, expect, it } from 'vitest';
import type { BoosterFrame, StageFrame } from '../src/physics/frame';
import { engineLevels, formatEngineLevels } from '../src/ui/engine-levels';

const stage = (index: number, burning: boolean, effectiveThrottle?: number): StageFrame =>
  ({ id: `s${index}`, index, attached: true, burning, propellantFraction: 1, isSpacecraft: false, effectiveThrottle });
const booster = (id: string, burning: boolean, effectiveThrottle?: number): BoosterFrame =>
  ({ id, stageId: 's0', attached: true, burning, propellantFraction: 1, effectiveThrottle });
const words = { core: 'core', boosters: 'strap-ons' };

describe('U16 actual engine levels', () => {
  it('reads Soyuz strap-ons at their programme step while the command stays 100 %', () => {
    // The frame's command is not an input: only the recorded per-engine levels are.
    const levels = engineLevels({ stages: [stage(0, true, 1), stage(1, false, 0)], boosters: ['a', 'b', 'c', 'd'].map((id) => booster(id, true, 0.81)) });
    expect(levels).toEqual({ stages: [1], boosters: { min: 0.81, max: 0.81 } });
    expect(formatEngineLevels(levels, words)).toBe('core 100 % · strap-ons 81 %');
  });

  it('shows a core clamped below the command', () => {
    const levels = engineLevels({ stages: [stage(0, true, 0.3)], boosters: [booster('a', true, 1)] });
    expect(formatEngineLevels(levels, words)).toBe('core 30 % · strap-ons 100 %');
  });

  it('lists both stages during hot staging, lowest first, and a range of differing strap-ons', () => {
    const levels = engineLevels({ stages: [stage(1, true, 0.6), stage(0, true, 0.2)], boosters: [booster('a', true, 0.5), booster('b', true, 0.9), booster('c', false, 1)] });
    expect(formatEngineLevels(levels, words)).toBe('core 20 % / 60 % · strap-ons 50–90 %');
  });

  it('says nothing is running in a coast', () => {
    const levels = engineLevels({ stages: [stage(0, false, 0)], boosters: [booster('a', false, 0)] });
    expect(levels).toEqual({ stages: [], boosters: null });
    expect(formatEngineLevels(levels, words)).toBe('—');
  });
});
