/**
 * M-LAUNCH-031, the view: a result row shows the number the verdict was
 * judged on as its primary value and delta, with the displayed (cursor)
 * value beside it as secondary, and one line says when and on what basis the
 * verdict was judged. Without a judged value (a failure, or a record that
 * lacks it) the row keeps showing the displayed orbit, with no secondary.
 */
import { describe, expect, it } from 'vitest';
import { assessMissionResult, judgedNote, resultRow, type ResultInput } from '../src/ui/result-content';
import { DEG, R_EARTH } from '../src/physics/constants';

function drifted(params?: Record<string, number>): ResultInput {
  return {
    state: {
      t: 6000, status: 'orbit', payloadSeparated: false,
      elements: {
        a: R_EARTH + 400e3, e: 0, i: 51.6 * DEG, raan: 0, argp: 0, nu: 0,
        energy: -29e6, h: 5.2e10, u: 0, period: 5500,
        periapsisAlt: 370e3, apoapsisAlt: 445e3,
      },
    },
    plan: { target: {
      perigee: 400e3, apogee: 400e3, a: R_EARTH + 400e3, e: 0,
      inclination: 51.6 * DEG, argp: 0, raan: null, raanMode: 'free',
    } },
    cfg: { boosterRecovery: false }, debris: [],
    events: [{ t: 500, key: 'evt.targetOrbit', severity: 'success', params }],
  };
}

describe('mission result view (M-LAUNCH-031)', () => {
  it('shows the judged value and delta first, and the displayed value as secondary', () => {
    const model = assessMissionResult(drifted({ pe: 399, ap: 401, peAltM: 399e3, apAltM: 401e3 }))!;
    expect(resultRow(model.metrics[0])).toEqual({ value: 399, delta: -1, now: 370 });
    expect(resultRow(model.metrics[1])).toEqual({ value: 401, delta: 1, now: 445 });
    expect(judgedNote(model, 'en')).toBe('Judged at T+500.0 s (physical apsides)');
  });

  it('names the osculating basis when the record has no physical apsides', () => {
    const model = assessMissionResult(drifted({ pe: 399, ap: 401 }))!;
    expect(model.judgedBasis).toBe('osculating');
    expect(judgedNote(model, 'en')).toBe('Judged at T+500.0 s (osculating orbit)');
    for (const lang of ['th', 'ru'] as const) {
      const note = judgedNote(model, lang);
      expect(note).toContain('500.0');
      expect(note).not.toBe(judgedNote(model, 'en'));
    }
  });

  it('keeps the displayed orbit, with no secondary or judged line, when nothing was judged', () => {
    const model = assessMissionResult(drifted())!;
    expect(resultRow(model.metrics[0])).toEqual({ value: 370, delta: -30, now: null });
    expect(judgedNote(model, 'en')).toBe('');
    const failed = drifted();
    failed.state.status = 'failed';
    failed.events = [{ t: 120, key: 'evt.engineOut', severity: 'fail' }];
    const lost = assessMissionResult(failed)!;
    expect(lost.outcome).toBe('failed');
    expect(lost.metrics.every(m => resultRow(m).now === null)).toBe(true);
    expect(judgedNote(lost, 'en')).toBe('');
  });
});
