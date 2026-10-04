import { describe, expect, it } from 'vitest';
import { resultSetting, resultSuggestion, type SuggestionContext } from '../src/ui/result-actions';

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

describe('R3.5 suggested changes, before and after', () => {
  const LAUNCH = new Date('2026-10-04T12:00:00Z');
  const base = (over: Partial<SuggestionContext> = {}): SuggestionContext => ({
    ...ctx(), failureMode: 'none', payloadMass: 1000, ratedPayload: 22800, launchTime: LAUNCH, nearestWindow: () => null, ...over,
  });

  it('a failure armed that struck: the nominal flight', () => {
    const s = resultSuggestion('separation', base({ failureArmed: true, events: [{ key: 'evt.prematureSep', t: 20 }], failureMode: 'prematureSep' }));
    expect(s).toEqual({ field: 'setup.failureMode', before: 'prematureSep', after: 'none' });
  });

  it('ran dry or never lifted off over its rating: the published rating; within it: nothing to suggest', () => {
    expect(resultSuggestion('fuel', base({ payloadMass: 30000 }))).toEqual({ field: 'setup.payloadMass', before: 30000, after: 22800 });
    expect(resultSuggestion('liftoff', base({ payloadMass: 9000, ratedPayload: 8210.6 }))).toEqual({ field: 'setup.payloadMass', before: 9000, after: 8210 });
    expect(resultSuggestion('fuel', base({ payloadMass: 20000 }))).toBeNull();
    expect(resultSuggestion('fuel', base({ payloadMass: 30000, ratedPayload: null }))).toBeNull();
  });

  it('the wrong plane: the nearest window, asked for only then and only when it is a different time', () => {
    let asked = 0;
    const later = new Date(LAUNCH.getTime() + 3 * 3600e3);
    const nearestWindow = () => { asked++; return later; };
    expect(resultSuggestion('fuel', base({ nearestWindow }))).toBeNull();
    expect(asked).toBe(0);
    expect(resultSuggestion('window', base({ nearestWindow }))).toEqual({ field: 'setup.launchTime', before: LAUNCH, after: later });
    expect(resultSuggestion('window', base({ nearestWindow: () => new Date(LAUNCH.getTime() + 30_000) }))).toBeNull();
    expect(resultSuggestion('window', base())).toBeNull();
  });

  it('no suggestion where the result points at nothing one figure answers', () => {
    for (const cause of ['target', 'shape', 'inclination', 'incomplete', 'engine', 'structure', 'range', 'impact'] as const) {
      expect(resultSuggestion(cause, base({ payloadMass: 99999 }))).toBeNull();
    }
  });
});
