import { describe, expect, it } from 'vitest';
import { assessMissionResult, RESULT_COPY, type ResultInput } from '../src/ui/result-content';
import { DEG, R_EARTH } from '../src/physics/constants';
import { Simulation } from '../src/physics/simulation';
import { createFrameSimView } from '../src/replay/simview';
import { captureFrame } from '../src/physics/frame';
import { DEFAULT_GUIDANCE, DEFAULT_FAILURE } from '../src/physics/defaults';
import { orbitById } from '../src/data/orbits';

/** A known circular target: expected residuals do not come from the assessor. */
function fixture(): ResultInput {
  return {
    state: {
      t: 500, status: 'orbit', payloadSeparated: false,
      elements: {
        a: R_EARTH + 400e3, e: 0, i: 51.6 * DEG, raan: 0, argp: 0, nu: 0,
        energy: -29e6, h: 5.2e10, u: 0, period: 5500,
        periapsisAlt: 400e3, apoapsisAlt: 400e3,
      },
    },
    plan: { target: {
      perigee: 400e3, apogee: 400e3, a: R_EARTH + 400e3, e: 0,
      inclination: 51.6 * DEG, argp: 0, raan: null, raanMode: 'free',
    } },
    cfg: { boosterRecovery: false }, debris: [],
    events: [{ t: 500, key: 'evt.targetOrbit', severity: 'success' }],
  };
}

function booster(name = 'First stage'): ResultInput['debris'][number] {
  return {
    name, createdAt: 150,
    recovery: { propellant: 0, thrustVac: 0, thrustSL: 0, mdot: 0, landingReserve: 0, phase: 'coast', burning: false, landed: false },
  };
}

describe('displayed mission result', () => {
  it('retains visible aerodynamic warnings without changing a successful orbit or revealing future debris limits', () => {
    const input = fixture();
    const warning = { t: 90, key: 'evt.aeroEnvelopeExceeded', severity: 'warn' as const,
      params: { scope: 'vehicle', angleOfAttackRad: 35 * DEG, sideslipRad: -2 * DEG } };
    input.events = [...input.events, warning,
      { ...warning, t: 700, key: 'evt.debrisSeparated', severity: 'info' as const,
        params: { ...warning.params, scope: 'debris', angleOfAttackRad: 160 * DEG } }];
    const early = assessMissionResult(input)!;
    expect(early.outcome).toBe('target');
    expect(early.cause).toBe('target');
    expect(early.aeroWarnings).toEqual([{ time: 90, scope: 'vehicle', angleOfAttackRad: 35 * DEG, sideslipRad: -2 * DEG }]);
    input.state.t = 800;
    expect(assessMissionResult(input)!.aeroWarnings.map(w => [w.time, w.scope])).toEqual([[90, 'vehicle'], [700, 'debris']]);
    input.state.t = 500;
    expect(assessMissionResult(input)!.aeroWarnings).toEqual(early.aeroWarnings);
    expect(assessMissionResult(fixture())!.aeroWarnings).toEqual([]);
  });

  it('does not blame payload capacity when an unignited trim timed out acquiring orientation', () => {
    const input = fixture();
    input.state.elements.periapsisAlt = 385e3;
    input.events = [
      { t: 499, key: 'evt.burnAlignmentTimeout', severity: 'warn', params: { seconds: 240 } },
      { t: 500, key: 'evt.offTargetOrbit', severity: 'warn' },
    ];
    expect(assessMissionResult(input)).toMatchObject({ outcome: 'offTarget', cause: 'pointing', reviewTime: 499 });
    input.events = [input.events[1], { ...input.events[0], t: 600 }];
    expect(assessMissionResult(input)!.cause).toBe('shape');
    input.events = [{ t: 499, key: 'evt.burnPredictionUnavailable', severity: 'warn' }, input.events[0]];
    expect(assessMissionResult(input)).toMatchObject({ cause: 'prediction', reviewTime: 499 });
  });

  it('does not treat a parking orbit or a future success as a completed mission', () => {
    const input = fixture();
    input.state.status = 'coast';
    input.state.t = 300;
    input.events = [
      { t: 250, key: 'evt.parkingOrbit', severity: 'success' },
      { t: 500, key: 'evt.targetOrbit', severity: 'success' },
    ];
    expect(assessMissionResult(input)).toBeNull();
  });

  it('shows a confirmed target before payload separation, with all four numeric comparisons', () => {
    const result = assessMissionResult(fixture())!;
    expect(result.outcome).toBe('target');
    expect(result.payloadSeparated).toBe(false);
    expect(result.outcomeTime).toBe(500);
    expect(result.metrics.map(row => [row.key, row.target, row.actual, row.delta])).toEqual([
      ['perigee', 400, 400, 0], ['apogee', 400, 400, 0],
      ['inclination', 51.6, 51.6, 0], ['raan', null, 0, null],
    ]);
    expect(result.metrics.every(row => row.outside !== true)).toBe(true);
  });

  it('identifies an off-window plane and wraps the RAAN difference across 360 degrees', () => {
    const input = fixture();
    input.plan.target.raanMode = 'fixed';
    input.plan.target.raan = 1 * DEG;
    input.state.elements.raan = 359 * DEG;
    input.events = [{ t: 500, key: 'evt.offTargetOrbit', severity: 'warn' }];
    const result = assessMissionResult(input)!;
    expect(result.outcome).toBe('offTarget');
    expect(result.cause).toBe('window');
    expect(result.metrics.find(row => row.key === 'raan')?.delta).toBeCloseTo(-2, 9);
    expect(result.metrics.find(row => row.key === 'raan')?.outside).toBe(true);
  });

  it('does not invent a RAAN target for a free-plane mission', () => {
    const input = fixture();
    input.state.elements.raan = 2.9;
    const row = assessMissionResult(input)!.metrics.find(metric => metric.key === 'raan')!;
    expect(row.target).toBeNull();
    expect(row.delta).toBeNull();
    expect(row.outside).toBeNull();
    expect(row.actual).toBeCloseTo(2.9 / DEG, 8);
  });

  it('reports signed apsis errors from the displayed orbit even when completion carries unrounded judged apsides', () => {
    const input = fixture();
    input.state.t = 800;
    input.state.elements.periapsisAlt = 370123;
    input.state.elements.apoapsisAlt = 450456;
    input.events = [{ t: 500, key: 'evt.offTargetOrbit', severity: 'warn',
      params: { pe: 369, ap: 450, peAltM: 369250, apAltM: 449750 } }];
    const result = assessMissionResult(input)!;
    expect(result.cause).toBe('shape');
    expect(result.displayedTime).toBe(800);
    expect(result.outcomeTime).toBe(500);
    expect(result.metrics[0].actual).toBe(370.123);
    expect(result.metrics[1].actual).toBe(450.456);
    expect(result.metrics[0].delta).toBeCloseTo(-29.877, 8);
    expect(result.metrics[1].delta).toBeCloseTo(50.456, 8);
    expect(result.metrics[0].outside).toBe(true);
  });

  it('keeps recorded success separate from subsequent osculating-orbit drift', () => {
    const input = fixture();
    input.state.t = 6000;
    input.plan.target.raanMode = 'fixed';
    input.plan.target.raan = 0;
    input.state.elements.raan = 5 * DEG;
    input.state.elements.periapsisAlt = 370e3;
    input.state.elements.apoapsisAlt = 445e3;
    input.events = [{ t: 500, key: 'evt.targetOrbit', severity: 'success',
      params: { pe: 399, ap: 401, peAltM: 399e3, apAltM: 401e3 } }];
    const result = assessMissionResult(input)!;
    expect(result.outcome).toBe('target');
    expect(result.cause).toBe('target');
    expect(result.metrics[0]).toMatchObject({ actual: 370, delta: -30, outside: false });
    expect(result.metrics[1]).toMatchObject({ actual: 445, delta: 45, outside: false });
    expect(result.metrics[3].outside).toBe(false);
    expect(result.outcomeTime).toBe(500);
  });

  it('flags a row from the set the verdict was judged on, and keeps the osculating value beside it (M-LAUNCH-031)', () => {
    const input = fixture();
    input.state.t = 6000;
    input.state.elements.periapsisAlt = 370e3;
    input.state.elements.apoapsisAlt = 445e3;
    input.events = [{ t: 500, key: 'evt.offTargetOrbit', severity: 'warn',
      params: { pe: 369, ap: 401, inc: 51.6, peAltM: 369250, apAltM: 401e3 } }];
    const missed = assessMissionResult(input)!;
    expect(missed.judgedTime).toBe(500);
    expect(missed.judgedBasis).toBe('physical');
    // Perigee missed on the judged 369.25 km; the apogee, judged at 401 km, did not, though it reads 445 km now.
    expect(missed.metrics[0]).toMatchObject({ judged: 369.25, outside: true });
    expect(missed.metrics[0].judgedDelta).toBeCloseTo(-30.75, 9);
    expect(missed.metrics[1]).toMatchObject({ judged: 401, judgedDelta: 1, outside: false, actual: 445 });
    input.events = [{ t: 500, key: 'evt.targetOrbit', severity: 'success',
      params: { pe: 399, ap: 401, peAltM: 399e3, apAltM: 401e3 } }];
    const reached = assessMissionResult(input)!;
    expect(reached.outcome).toBe('target');
    expect(reached.metrics.filter(row => row.target !== null).every(row => row.outside === false)).toBe(true);
    expect(reached.metrics[0]).toMatchObject({ judged: 399, actual: 370 });
  });

  it('moves completed-result metrics with the replay cursor without changing the recorded outcome or the live orbit', () => {
    const sim = new Simulation({
      vehicleId: 'falcon9', satelliteId: 'cubesats', siteId: 'cape', orbit: orbitById('leo'),
      launchTime: new Date('2026-09-19T12:00:00Z'), guidance: { ...DEFAULT_GUIDANCE },
      failure: { ...DEFAULT_FAILURE }, boosterRecovery: false,
    }, { headless: true });
    expect(sim.plan.target.perigee).toBe(500e3);
    expect(sim.plan.target.apogee).toBe(500e3);
    sim.state.status = 'orbit';
    sim.events.push({ t: 500, key: 'evt.targetOrbit', severity: 'success',
      params: { pe: 500, ap: 500, peAltM: 500e3, apAltM: 500e3 } });
    // Deliberately different cursor, completion and live apsides. No full
    // flight is needed to exercise the actual capture/view/replay boundary.
    sim.state.t = 600;
    sim.state.elements.periapsisAlt = 488e3;
    sim.state.elements.apoapsisAlt = 511e3;
    const early = captureFrame(sim);
    sim.state.t = 900;
    sim.state.elements.periapsisAlt = 515e3;
    sim.state.elements.apoapsisAlt = 530e3;
    const later = captureFrame(sim);
    const view = createFrameSimView(sim);

    view.setFrame(early);
    const first = assessMissionResult(view.sim)!;
    expect(first).toMatchObject({ outcome: 'target', cause: 'target', displayedTime: 600, outcomeTime: 500, reviewTime: 500 });
    expect(first.metrics[0]).toMatchObject({ actual: 488, delta: -12, outside: false });
    expect(first.metrics[1]).toMatchObject({ actual: 511, delta: 11, outside: false });
    view.setFrame(later);
    const next = assessMissionResult(view.sim)!;
    expect(next).toMatchObject({ outcome: 'target', displayedTime: 900, outcomeTime: 500 });
    expect(next.metrics[0]).toMatchObject({ actual: 515, delta: 15, outside: false });
    expect(next.metrics[1]).toMatchObject({ actual: 530, delta: 30, outside: false });
    view.setFrame(early);
    expect(assessMissionResult(view.sim)).toEqual(first);
    expect(sim.state.t).toBe(900);
    expect(sim.state.elements.periapsisAlt).toBe(515e3);
    expect(sim.state.elements.apoapsisAlt).toBe(530e3);
  });

  it('uses the observed engine-out event for failure guidance and never a future event', () => {
    const input = fixture();
    input.state.t = 170;
    input.state.status = 'failed';
    input.events = [
      { t: 90, key: 'evt.engineOut', severity: 'warn' },
      { t: 170, key: 'evt.impact', severity: 'fail' },
      { t: 170, key: 'evt.vehicleLost', severity: 'fail' },
      { t: 500, key: 'evt.targetOrbit', severity: 'success' },
      { t: 700, key: 'evt.ftsCommanded', severity: 'fail' },
    ];
    const result = assessMissionResult(input)!;
    expect(result.outcome).toBe('failed');
    expect(result.cause).toBe('engine');
    expect(result.reviewTime).toBe(90);
    expect(result.outcomeTime).toBe(170);
  });

  it('does not misreport a lost recovery booster as failure of a successful payload mission', () => {
    const input = fixture();
    input.cfg.boosterRecovery = true;
    input.debris = [{ ...booster(), outcome: 'impact' }];
    input.events = [...input.events, { t: 450, key: 'evt.stageImpact', severity: 'info', params: { name: 'First stage' } }];
    const result = assessMissionResult(input)!;
    expect(result.outcome).toBe('target');
    expect(result.recovery).toBe('failed');
  });

  it('does not reveal a future booster landing even if a caller supplied a future landed flag', () => {
    const input = fixture();
    input.cfg.boosterRecovery = true;
    const body = booster();
    body.recovery!.landed = true;
    body.outcome = 'landed';
    input.debris = [body];
    input.events = [...input.events, { t: 700, key: 'evt.boosterLanded', severity: 'success', params: { name: body.name } }];
    expect(assessMissionResult(input)!.recovery).toBe('flying');
    input.state.t = 700;
    expect(assessMissionResult(input)!.recovery).toBe('landed');
  });

  it('does not treat expendable stage impacts as requested recovery', () => {
    const input = fixture();
    input.events = [...input.events, { t: 450, key: 'evt.stageImpact', severity: 'info', params: { name: 'First stage' } }];
    expect(assessMissionResult(input)!.recovery).toBe('notRequested');
  });

  it('never represents an unbound/invalid apogee as zero', () => {
    const input = fixture();
    input.state.elements.e = 1.2;
    input.state.elements.apoapsisAlt = Infinity;
    input.events = [{ t: 500, key: 'evt.offTargetOrbit', severity: 'warn' }];
    const row = assessMissionResult(input)!.metrics.find(metric => metric.key === 'apogee')!;
    expect(row.actual).toBeNull();
    expect(row.delta).toBeNull();
    expect(row.outside).toBe(true);
  });

  it('identifies the ISS result as an orbital-plane target in every language', () => {
    const input = fixture();
    input.plan.target.raanMode = 'iss';
    expect(assessMissionResult(input)!.issPlaneOnly).toBe(true);
    expect(RESULT_COPY.en.iss).toContain('not confirmed');
    expect(RESULT_COPY.th.iss).toContain('ไม่ได้ยืนยัน');
    expect(RESULT_COPY.ru.iss).toContain('не подтверждает');
  });

  it('stays hidden in an actual frame-backed view when the live simulation has a later terminal result', () => {
    const sim = new Simulation({
      vehicleId: 'falcon9', satelliteId: 'starlink', siteId: 'cape', orbit: orbitById('iss'),
      launchTime: new Date('2026-09-19T12:00:00Z'), guidance: { ...DEFAULT_GUIDANCE },
      failure: { ...DEFAULT_FAILURE }, boosterRecovery: false,
    }, { headless: true });
    const early = captureFrame(sim);
    // Later live state and events, without paying for a full flight to test a
    // replay-information boundary. The actual view must shadow both.
    sim.state.t = 500;
    sim.state.status = 'orbit';
    sim.events.push({ t: 500, key: 'evt.targetOrbit', severity: 'success' });
    const view = createFrameSimView(sim);
    view.setFrame(early);
    expect(assessMissionResult(sim)?.outcome).toBe('target');
    expect(assessMissionResult(view.sim)).toBeNull();
    expect(sim.state.status).toBe('orbit');
  });
});
