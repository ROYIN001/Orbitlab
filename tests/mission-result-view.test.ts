/**
 * M-LAUNCH-031, the view: a result row shows the number the verdict was
 * judged on as its primary value and delta, with the displayed (cursor)
 * value beside it as secondary, and one line says when and on what basis the
 * verdict was judged. Without a judged value (a failure, or a record that
 * lacks it) the row keeps showing the displayed orbit, with no secondary.
 */
import { describe, expect, it } from 'vitest';
import { assessMissionResult, judgedNote, resultRow, type ResultInput } from '../src/ui/result-content';
import { debriefValue } from '../src/ui/explore-debrief';
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

  it('flags the missed row of an off-target verdict whose recorded params round it back inside (review)', () => {
    const input = drifted({ pe: 400, ap: 400, inc: 51.9 });
    input.state.t = 500;
    input.state.elements.periapsisAlt = 400e3;
    input.state.elements.apoapsisAlt = 400e3;
    input.state.elements.i = 51.904 * DEG;
    input.events[0].key = 'evt.offTargetOrbit';
    input.events[0].severity = 'warn';
    const model = assessMissionResult(input)!;
    expect(model.outcome).toBe('offTarget');
    expect(model.metrics[2]).toMatchObject({ key: 'inclination', outside: true });
    expect(model.metrics.filter(m => m.outside).map(m => m.key)).toEqual(['inclination']);
  });

  it('flags the judged row from the unrounded values on the completion event, whatever the cursor shows (M-LAUNCH-031 residual)', () => {
    // judged at 51.904° (0.304° off, the band is 0.3°), recorded rounded as 51.9 — back inside the band
    const input = drifted({ pe: 400, ap: 400, inc: 51.9, raan: 0, peJudgedM: 400e3, apJudgedM: 400e3, incJudgedRad: 51.904 * DEG, raanJudgedRad: 0 });
    input.events[0].key = 'evt.offTargetOrbit';
    input.events[0].severity = 'warn';
    // the cursor, later, shows a drifted orbit: 370 × 445 km, inclination on target
    const model = assessMissionResult(input)!;
    expect(model.outcome).toBe('offTarget');
    expect(model.metrics.filter(m => m.outside).map(m => m.key)).toEqual(['inclination']);
    expect(model.metrics[2].judged).toBeCloseTo(51.904, 12);
    expect(model.metrics[0]).toMatchObject({ judged: 400, outside: false, actual: 370 });
    // the new values are not physical apsides: the basis stays as the record says
    expect(model.judgedBasis).toBe('osculating');
  });

  it('an off-target verdict whose unrounded values all sit inside flags no row, not the cursor\'s drift (M-LAUNCH-031 residual)', () => {
    // a burn that could not be completed vetoes the verdict with every number inside the band
    const input = drifted({ pe: 400, ap: 400, inc: 51.6, raan: 0, peJudgedM: 400e3, apJudgedM: 400e3, incJudgedRad: 51.6 * DEG, raanJudgedRad: 0 });
    input.events[0].key = 'evt.offTargetOrbit';
    input.events[0].severity = 'warn';
    const model = assessMissionResult(input)!;
    expect(model.metrics.filter(m => m.outside).map(m => m.key)).toEqual([]);
  });

  it('flags the RAAN row from the displayed plane when the verdict recorded no RAAN', () => {
    const input = drifted({ pe: 400, ap: 400, inc: 51.6 });
    input.state.t = 500;
    input.state.elements.periapsisAlt = 400e3;
    input.state.elements.apoapsisAlt = 400e3;
    input.state.elements.raan = 5 * DEG;
    input.plan.target.raanMode = 'fixed';
    input.plan.target.raan = 0;
    input.events[0].key = 'evt.offTargetOrbit';
    input.events[0].severity = 'warn';
    const model = assessMissionResult(input)!;
    expect(model.metrics[3]).toMatchObject({ key: 'raan', judged: null, outside: true });
  });

  it('the Explore debrief shows the judged number its flag was judged on (review)', () => {
    const model = assessMissionResult(drifted({ pe: 399, ap: 401, peAltM: 399e3, apAltM: 401e3 }))!;
    expect(debriefValue(model.metrics[1], model.metrics[1].actual)).toBe('445 km');
    expect(debriefValue(model.metrics[1])).toBe('401 km');
    expect(debriefValue(assessMissionResult(drifted())!.metrics[1])).toBe('445 km');
  });
});
