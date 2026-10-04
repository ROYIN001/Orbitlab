import { describe, expect, it } from 'vitest';
import { resultSetting } from '../src/ui/result-actions';

const ctx = (failureArmed = false, events: { key: string; t: number }[] = [], outcomeTime = 600) => ({ failureArmed, events, outcomeTime });

describe('R3.5 result to setting', () => {
  it('maps typed causes to the setup field that answers them', () => {
    expect(resultSetting('window', ctx())).toBe('setup.launchTime');
    expect(resultSetting('shape', ctx())).toBe('setup.perigee');
    expect(resultSetting('inclination', ctx())).toBe('setup.inclination');
    expect(resultSetting('fuel', ctx())).toBe('setup.payloadMass');
    expect(resultSetting('liftoff', ctx())).toBe('setup.payloadMass');
  });

  it('points at an armed failure that fired before the outcome, whatever the outcome', () => {
    const fired = [{ key: 'evt.prematureSep', t: 20 }];
    expect(resultSetting('incomplete', ctx(true, fired))).toBe('setup.failureMode');
    expect(resultSetting('separation', ctx(true, fired))).toBe('setup.failureMode');
    expect(resultSetting('shape', ctx(true, fired))).toBe('setup.failureMode');
  });

  it('does not blame a failure that was not armed, or struck after the outcome', () => {
    expect(resultSetting('engine', ctx(false, [{ key: 'evt.engineOut', t: 30 }]))).toBeNull();
    expect(resultSetting('shape', ctx(true, [{ key: 'evt.engineOut', t: 700 }], 600))).toBe('setup.perigee');
    expect(resultSetting('engine', ctx(true, []))).toBeNull();
  });

  it('offers nothing where no single setting answers the result', () => {
    for (const cause of ['target', 'incomplete', 'pointing', 'prediction', 'range', 'impact', 'reentry', 'structure'] as const) {
      expect(resultSetting(cause, ctx())).toBeNull();
    }
    expect(resultSetting('target', ctx(true, [{ key: 'evt.engineOut', t: 10 }]))).toBeNull();
  });
});
