import { afterEach, describe, expect, it } from 'vitest';
import { Simulation } from '../src/physics/simulation';
import { vehicleById } from '../src/data/vehicles';
import { orbitById } from '../src/data/orbits';
import { DEFAULT_FAILURE, DEFAULT_GUIDANCE, guidanceForVehicle } from '../src/physics/defaults';
import { DEG } from '../src/physics/constants';
import { FLIGHT_CONTROL_GAINS } from '../src/physics/rigid/runtime';
import { CONTROL_DEFAULTS, controlProblems, resolveControl, validControlConfig } from '../src/physics/rigid/control-config';
import { margins, stepMetrics, stepResponse, type LinearModel, type PlaneModel } from '../src/physics/rigid/linear';
import { autoTune, flownGains, trialMargins, tuneCases } from '../src/physics/rigid/tuning';
import { attitudeTestAt, attitudeTestDuration, attitudeTestOffset, limiterShares, predictAttitudeTest, pulseMetrics, responseMismatch,
  type AttitudeTestRecord, type AttitudeTestSpec } from '../src/physics/rigid/attitude-test';
import { validateConfigInput } from '../src/config/validation';
import { localizeEventParams } from '../src/ui/names';
import { setLang, t } from '../src/i18n';
import { setNotationPreference } from '../src/ui/notation';
import type { ControlConfig, FlexConfig, MissionConfig } from '../src/types';
import { LAUNCH_TIME } from './fleet-harness';

const T = 0.01;
function falcon9(extra: { flex?: FlexConfig; control?: ControlConfig } = {}): Simulation {
  return new Simulation({ vehicleId: 'falcon9', satelliteId: 'cubesats', siteId: 'cape', orbit: orbitById('leo'), launchTime: LAUNCH_TIME,
    guidance: guidanceForVehicle(vehicleById('falcon9'), DEFAULT_GUIDANCE, 'sixDof'), guidanceResolved: true, failure: { ...DEFAULT_FAILURE },
    boosterRecovery: false, dynamics: { model: 'sixDof', wind: 'crosswind', seed: 20260919, ...extra } } as MissionConfig, { headless: true });
}
const flyTo = (sim: Simulation, t: number) => { while (!sim.done && sim.state.t < t) sim.step(sim.suggestedDt()); return sim; };
const modelsOf = (sim: Simulation) => [...new Set(sim.telemetry.map((s) => s.rigid?.linearModel).filter((m): m is LinearModel => !!m))];
const withoutRecords = (key: string, value: unknown) => (key === 'attitudeLoop' || key === 'linearModel' ? undefined : value);
function withLang(lang: 'en' | 'ru' | 'th'): void {
  const g = globalThis as { document?: unknown };
  if (!g.document) g.document = { documentElement: {} };
  setLang(lang);
}
afterEach(() => { withLang('en'); setNotationPreference('auto'); });

describe('the autopilot tuning a mission sets (roadmap E04)', () => {
  it('has the runtime\'s own defaults, and flies them when nothing is set', () => {
    expect(CONTROL_DEFAULTS.roll.attitudeGain).toBe(FLIGHT_CONTROL_GAINS.attitudeGain.x);
    expect(CONTROL_DEFAULTS.pitchYaw.rateGain).toBe(FLIGHT_CONTROL_GAINS.rateGain.z);
    expect(CONTROL_DEFAULTS.roll.maxRateDegS * DEG).toBe(FLIGHT_CONTROL_GAINS.maxRate.x);
    expect(CONTROL_DEFAULTS.pitchYaw.maxAccelerationDegS2 * DEG).toBe(FLIGHT_CONTROL_GAINS.maxAngularAcceleration.y);
    expect(resolveControl(undefined)).toBeUndefined();
    expect(resolveControl({})).toBeUndefined();
    expect(resolveControl({ roll: {} })).toBeUndefined();
    const all = resolveControl({ roll: { ...CONTROL_DEFAULTS.roll }, pitchYaw: { ...CONTROL_DEFAULTS.pitchYaw } })!;
    expect(all.gains).toEqual(FLIGHT_CONTROL_GAINS);
    expect(all.feedForward).toBe(1);
  });

  it('flies pitch–yaw gains set by hand as set, and leaves the flexible-vehicle cap to the defaults', () => {
    expect(resolveControl({ roll: { attitudeGain: 2 } })!.capPitchYawGains).toBe(true);
    expect(resolveControl({ pitchYaw: { maxRateDegS: 3 } })!.capPitchYawGains).toBe(true);
    expect(resolveControl({ pitchYaw: { rateGain: 2 } })!.capPitchYawGains).toBe(false);
  });

  it('checks every setting against its range, in the panel\'s and the tools\' terms', () => {
    expect(validControlConfig({ roll: { attitudeGain: 2 }, pitchYaw: { maxRateDegS: 3 }, feedForward: 0.5 })).toBe(true);
    expect(validControlConfig({ roll: { attitudeGain: 0 } })).toBe(false);
    expect(validControlConfig({ feedForward: 1.2 })).toBe(false);
    expect(validControlConfig({ yaw: {} })).toBe(false);
    expect(validControlConfig({ roll: { gain: 1 } })).toBe(false);
    expect(controlProblems({ pitchYaw: { rateGain: 99 } })).toEqual([{ field: 'setup.control.pitchYawRateGain', value: 99, limits: [0.1, 30] }]);
    const base = { vehicleId: 'falcon9', satelliteId: 'cubesats', siteId: 'cape', orbit: orbitById('leo'), launchTime: LAUNCH_TIME, payloadMass: 300,
      guidanceOverrides: {}, failure: { ...DEFAULT_FAILURE }, boosterRecovery: false };
    expect(validateConfigInput({ ...base, dynamics: { model: 'sixDof', wind: 'calm', seed: 1, control: { feedForward: 0.3 } } })).toEqual([]);
    expect(validateConfigInput({ ...base, dynamics: { model: 'sixDof', wind: 'calm', seed: 1, control: { feedForward: 1.5 } } }))
      .toEqual([{ field: 'setup.control.feedForward', code: 'maximum', limit: 100 }]);
  });

  it('flies the defaults bit for bit when they are set explicitly on a rigid vehicle', { timeout: 60_000 }, () => {
    const plain = flyTo(falcon9(), 20), set = flyTo(falcon9({ control: { roll: { ...CONTROL_DEFAULTS.roll }, pitchYaw: { ...CONTROL_DEFAULTS.pitchYaw }, feedForward: 1 } }), 20);
    expect(JSON.stringify([set.state.r, set.state.v, set.state.rigid, set.telemetry], withoutRecords))
      .toBe(JSON.stringify([plain.state.r, plain.state.v, plain.state.rigid, plain.telemetry], withoutRecords));
  });

  it('feeds the air\'s moment forward at the weight set, which the linearised loop then carries', { timeout: 60_000 }, () => {
    const sim = flyTo(falcon9({ control: { feedForward: 0.5 } }), 30), m = modelsOf(sim).at(-1)!;
    expect(sim.rigidRuntime!.feedForward).toBe(0.5);
    expect(m.planes.z.feedForward).toBe(0.5);
    // A weight w and a feed-forward error x enter the loop as w·(1 + x).
    const full = { ...m.planes.z, feedForward: undefined };
    const a = margins(m.planes.z, T, 0), b = margins(full, T, -0.5);
    expect(a.pmDeg).toBeCloseTo(b.pmDeg!, 9);
    expect(a.gmDb).toBeCloseTo(b.gmDb!, 9);
  });
});

describe('tuning on the linearised loop', () => {
  const I = 1e7;
  const plant: PlaneModel = { axis: 'z', n: 2, states: ['angle', 'rate'], A: [0, 1, 0, 0], B: [0, 1 / I], cAngle: [1, 0], cRate: [0, 1], cAero: [0, 0],
    actuator: 'engines', tau: 0.1, inertia: I, kTheta: 1.5, kOmega: 3 };

  it('reads a trial at the flown gains exactly as the recorded margins', () => {
    const a = margins(plant, T, 0), b = trialMargins(plant, T, flownGains(plant));
    expect(b.stable).toBe(a.stable);
    expect(b.pmDeg).toBeCloseTo(a.pmDeg!, 12);
    expect(b.gmDb).toBeCloseTo(a.gmDb!, 12);
    expect(b.wcRadS).toBeCloseTo(a.wcRadS!, 12);
    expect(b.growthRate).toBeCloseTo(a.growthRate, 12);
  });

  it('finds the widest attitude bandwidth that keeps both margins, with the rate loop at least twice as fast', () => {
    const r = autoTune([{ t: 0, plane: plant }], T, { pmDeg: 45, gmDb: 6 }, 1);
    expect(r.feasible).toBe(true);
    const ratio = r.gains.kTheta / r.gains.kOmega;
    expect(ratio).toBeGreaterThanOrEqual(0.25 - 1e-9); expect(ratio).toBeLessThanOrEqual(0.5 + 1e-9);
    const m = trialMargins(plant, T, r.gains);
    expect(m.stable).toBe(true);
    expect(m.pmDeg!).toBeGreaterThanOrEqual(45); expect(m.gmDb!).toBeGreaterThanOrEqual(6);
    // It is the widest: 5 % more K_θ at the same ratio loses a margin.
    const more = trialMargins(plant, T, { ...r.gains, kTheta: r.gains.kTheta * 1.05, kOmega: r.gains.kOmega * 1.05 });
    expect((more.pmDeg ?? 0) < 45 || (more.gmDb ?? Infinity) < 6).toBe(true);
    // A step with those gains is well damped.
    expect(stepMetrics(stepResponse({ ...plant, kTheta: r.gains.kTheta, kOmega: r.gains.kOmega }, T, 0, DEG, 10), DEG).overshootPct).toBeLessThan(15);
  });

  it('says when no gains can meet the targets, and gives the nearest', () => {
    const r = autoTune([{ t: 0, plane: plant }], T, { pmDeg: 88, gmDb: 6 }, 1);
    expect(r.feasible).toBe(false);
    expect(r.worst.stable).toBe(true);
  });

  it('meets its targets in the flight it tunes: Falcon 9 with P05, flown again with the gains it found', { timeout: 240_000 }, () => {
    const flex = { slosh: true, bending: true, notch: true };
    const models = modelsOf(flyTo(falcon9({ flex }), 60));
    const targets = { pmDeg: 40, gmDb: 4 };
    const r = autoTune(tuneCases(models, ['y', 'z'], 16), T, targets, 1, tuneCases(models, ['y', 'z'], Infinity));
    expect(r.feasible).toBe(true);
    expect(r.cases).toBeGreaterThan(200);
    // The default flexible autopilot misses the gain margin; the tuned one keeps it through max-q.
    const flownGm = Math.min(...models.filter((m) => m.t > 1).map((m) => m.margins.z.gmDb ?? Infinity));
    expect(flownGm).toBeLessThan(targets.gmDb);
    const tuned = flyTo(falcon9({ flex, control: { pitchYaw: { attitudeGain: r.gains.kTheta, rateGain: r.gains.kOmega } } }), 90);
    expect(tuned.state.status).toBe('ascent');
    const again = modelsOf(tuned).filter((m) => m.t > 1);
    expect(again.every((m) => m.margins.z.stable && m.margins.y.stable)).toBe(true);
    expect(Math.min(...again.map((m) => m.margins.z.gmDb ?? Infinity))).toBeGreaterThan(targets.gmDb - 0.3);
    expect(Math.min(...again.map((m) => m.margins.z.pmDeg ?? Infinity))).toBeGreaterThan(targets.pmDeg);
  });
});

describe('an attitude test flown in the loop', () => {
  const step: AttitudeTestSpec = { axis: 'x', sign: 1, kind: 'step', amplitudeRad: DEG, holdS: 3 };

  it('shapes a step and a doublet', () => {
    const doublet = { ...step, kind: 'doublet' as const, holdS: 1 };
    expect([0, 2.99, 3, 7].map((t) => attitudeTestOffset(step, t))).toEqual([DEG, DEG, 0, 0]);
    expect([0, 0.99, 1, 1.99, 2].map((t) => attitudeTestOffset(doublet, t))).toEqual([DEG, DEG, -DEG, -DEG, 0]);
    expect(attitudeTestDuration(step)).toBe(8);
    expect(attitudeTestDuration(doublet)).toBe(7);
  });

  it('refuses what it cannot fly', { timeout: 60_000 }, () => {
    const sim = falcon9();
    expect(sim.startAttitudeTest(step)).toBe('notFlying');
    flyTo(sim, 10);
    sim.setRigidCommand({ mode: 'manual', throttle: 1, rates: { x: 0, y: 0, z: 0 } });
    expect(sim.startAttitudeTest(step)).toBe('manual');
    sim.setRigidCommand({ mode: 'auto', throttle: 1, rates: { x: 0, y: 0, z: 0 } });
    expect(typeof sim.startAttitudeTest(step)).toBe('object');
    expect(sim.startAttitudeTest(step)).toBe('running');
    expect(() => sim.startAttitudeTest({ ...step, amplitudeRad: 1 })).toThrow(RangeError);
    const point = new Simulation({ ...falcon9().cfg, dynamics: { model: 'pointMass', wind: 'calm', seed: 1 } }, { headless: true });
    expect(point.startAttitudeTest(step)).toBe('notSixDof');
  });

  it('records a roll step as the linear loop predicts it, and says so on the telemetry', { timeout: 120_000 }, () => {
    const sim = flyTo(falcon9(), 40);
    const record = sim.startAttitudeTest(step) as AttitudeTestRecord;
    expect(record.model!.t).toBeGreaterThan(sim.state.t - 1);
    flyTo(sim, 44);
    // While it runs the telemetry carries a stub.
    const stub = sim.telemetry.at(-1)!.rigid!.attitudeTest!;
    expect(stub.done).toBe(false); expect(stub.t).toEqual([]); expect(stub.progressS).toBeGreaterThan(3);
    flyTo(sim, 50);
    expect(record.done).toBe(true);
    expect(record.t.length).toBe(Math.round(attitudeTestDuration(step) / T));
    expect(record.response[0]).toBeCloseTo(0, 12);
    const withRecord = sim.telemetry.filter((s) => s.rigid?.attitudeTest === record);
    expect(withRecord.length).toBe(1);
    // A replay inside the test's window finds the whole record.
    expect(attitudeTestAt(sim.telemetry, record.startS + 2)).toBe(record);
    const prediction = predictAttitudeTest(record)!;
    expect(responseMismatch(record.response, prediction.response, step.amplitudeRad)).toBeLessThan(0.02);
    const measured = pulseMetrics(record.t, record.response, step), predicted = pulseMetrics(prediction.t, prediction.response, step);
    expect(measured.riseS!).toBeCloseTo(predicted.riseS!, 1);
    expect(sim.events.find((e) => e.key === 'evt.attitudeTestStep')!.params).toEqual({ testAxis: 'roll', amplitudeDeg: 1, holdS: 3 });
  });

  it('shows the limiters the linear loop leaves out on a larger yaw step', { timeout: 120_000 }, () => {
    const sim = flyTo(falcon9(), 40);
    const record = sim.startAttitudeTest({ axis: 'y', sign: 1, kind: 'step', amplitudeRad: 3 * DEG, holdS: 5 }) as AttitudeTestRecord;
    flyTo(sim, 52);
    const prediction = predictAttitudeTest(record)!;
    const measured = pulseMetrics(record.t, record.response, record.spec), predicted = pulseMetrics(prediction.t, prediction.response, record.spec);
    expect(measured.riseS!).toBeGreaterThan(predicted.riseS! * 1.3);
    const shares = limiterShares(record);
    expect(shares.stopping + shares.rate + shares.acceleration).toBeGreaterThan(0.05);
  });

  it('writes the event in the language and the standard\'s sense', () => {
    withLang('th');
    const params = localizeEventParams(null, { testAxis: 'yaw', amplitudeDeg: 2, holdS: 3 })!;
    expect(params.testAxis).toBe(t('loop.axis.yaw'));
    expect(t('evt.attitudeTestStep', params)).toContain(t('loop.axis.yaw'));
    setNotationPreference('gost');
    expect(localizeEventParams(null, { testAxis: 'yaw', amplitudeDeg: 2, holdS: 3 })!.amplitudeDeg).toBe(-2);
    expect(localizeEventParams(null, { testAxis: 'pitch', amplitudeDeg: 2, holdS: 3 })!.amplitudeDeg).toBe(2);
  });
});
