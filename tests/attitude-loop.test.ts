import { afterEach, describe, expect, it } from 'vitest';
import { Simulation } from '../src/physics/simulation';
import { vehicleById } from '../src/data/vehicles';
import { orbitById } from '../src/data/orbits';
import { DEFAULT_FAILURE, DEFAULT_GUIDANCE, guidanceForVehicle } from '../src/physics/defaults';
import { DEG, RAD } from '../src/physics/constants';
import { v3 } from '../src/physics/vec3';
import { attitudeControl, rateControl, type ControlGains, type ControlTrace } from '../src/physics/rigid/control';
import { decodeLoopLimits, encodeLoopLimits, LOOP_LIMIT, type AttitudeLoopTelemetry } from '../src/physics/rigid/loop';
import { quatFromAxisAngle } from '../src/physics/rigid/math';
import { cloneRigidTelemetry, type RigidTelemetry } from '../src/physics/rigid/telemetry';
import { axisLetter, loopHistory, loopLimiterNames, loopView } from '../src/ui/loop-view';
import { buildTelemetryCsv } from '../src/ui/csv';
import { setLang } from '../src/i18n';
import type { DynamicsConfig, MissionConfig } from '../src/types';
import type { Mat3 } from '../src/physics/rigid/math';
import { LAUNCH_TIME } from './fleet-harness';

const GAINS: ControlGains = { attitudeGain: v3(1.5, 1.5, 1.5), rateGain: v3(3, 3, 3), maxRate: v3(8 * DEG, 5 * DEG, 5 * DEG),
  maxAngularAcceleration: v3(5 * DEG, 3 * DEG, 3 * DEG), responseDelayS: 0.1 };
const INERTIA = [2e5, 0, 0, 0, 4e7, 0, 0, 0, 4e7] as unknown as Mat3;
const trace = (): ControlTrace => ({ stoppingLimited: 0, rateLimited: 0, accelerationLimited: 0 });
function withLang(lang: 'en' | 'ru' | 'th'): void {
  const g = globalThis as { document?: unknown };
  if (!g.document) g.document = { documentElement: {} };
  setLang(lang);
}
afterEach(() => withLang('en'));
/** One CSV line's fields; quoted fields may hold commas and doubled quotes. */
function fields(line: string): string[] {
  const out: string[] = [];
  let field = '', quoted = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (quoted) {
      if (c === '"' && line[i + 1] === '"') { field += '"'; i++; } else if (c === '"') quoted = false; else field += c;
    } else if (c === '"') quoted = true; else if (c === ',') { out.push(field); field = ''; } else field += c;
  }
  out.push(field);
  return out;
}

describe('the control trace (roadmap G03)', () => {
  it('reads the controller without changing a single bit of its demand', () => {
    const cases = [
      { q: quatFromAxisAngle(v3(0, 1, 0), 0.002), w: v3(0.001, -0.002, 0.0005) },
      { q: quatFromAxisAngle(v3(0.3, 0.2, 0.9), 0.4), w: v3(0.02, 0.01, -0.03) },
      { q: quatFromAxisAngle(v3(1, 0, 0), 3.1), w: v3() },
    ];
    const target = { w: 1, x: 0, y: 0, z: 0 };
    for (const c of cases) {
      expect(attitudeControl(c.q, target, c.w, INERTIA, GAINS, trace())).toEqual(attitudeControl(c.q, target, c.w, INERTIA, GAINS));
      expect(rateControl(c.w, v3(), INERTIA, GAINS, trace())).toEqual(rateControl(c.w, v3(), INERTIA, GAINS));
    }
  });

  it('names the limiter that holds each axis', () => {
    // A small error: proportional, nothing limited.
    const small = trace();
    attitudeControl(quatFromAxisAngle(v3(0, 0, 1), 0.001), { w: 1, x: 0, y: 0, z: 0 }, v3(), INERTIA, GAINS, small);
    expect([small.stoppingLimited, small.rateLimited, small.accelerationLimited]).toEqual([0, 0, 0]);
    expect(small.attitudeError!.z).toBeCloseTo(-0.001, 12);
    // A large one about y: the stopping distance, then the acceleration limit, hold y only.
    const large = trace();
    attitudeControl(quatFromAxisAngle(v3(0, 1, 0), 0.5), { w: 1, x: 0, y: 0, z: 0 }, v3(), INERTIA, GAINS, large);
    expect(large.stoppingLimited).toBe(0b010);
    expect(large.accelerationLimited).toBe(0b010);
    // A manual rate beyond the rate limit about x.
    const manual = trace();
    rateControl(v3(20 * DEG, 0, 0), v3(20 * DEG, 0, 0), INERTIA, GAINS, manual);
    expect(manual.rateLimited).toBe(0b001);
    expect(manual.attitudeError).toBeUndefined();
  });

  it('packs and unpacks the limiter flags', () => {
    const bits = encodeLoopLimits({ stoppingLimited: 0b100, rateLimited: 0b001, accelerationLimited: 0b011 }, { gasBudget: true, gimbal: false, rcs: true });
    expect(bits & (1 << LOOP_LIMIT.gimbal)).toBe(0);
    expect(decodeLoopLimits(bits)).toEqual({ stopping: { x: false, y: false, z: true }, rate: { x: true, y: false, z: false },
      acceleration: { x: true, y: true, z: false }, gasBudget: true, gimbal: false, rcs: true });
  });
});

function mission(dynamics: DynamicsConfig = { model: 'sixDof', wind: 'crosswind', seed: 20260919 }): MissionConfig {
  return { vehicleId: 'falcon9', satelliteId: 'cubesats', siteId: 'cape', orbit: orbitById('leo'), launchTime: LAUNCH_TIME,
    guidance: guidanceForVehicle(vehicleById('falcon9'), DEFAULT_GUIDANCE, 'sixDof'), guidanceResolved: true,
    failure: { ...DEFAULT_FAILURE }, boosterRecovery: false, dynamics };
}

describe('the recorded loop on a flying Falcon 9', () => {
  const sim = new Simulation(mission(), { headless: true });
  const loops: { t: number; rigid: RigidTelemetry }[] = [];
  while (sim.state.t < 60) {
    sim.step(sim.suggestedDt());
    if (sim.state.rigid?.attitudeLoop) loops.push({ t: sim.state.t, rigid: cloneRigidTelemetry(sim.state.rigid)! });
  }

  it('records every control step of the ascent, for the vehicle only', { timeout: 60_000 }, () => {
    expect(loops.length).toBeGreaterThan(5000);
    expect(loops[0].t).toBeLessThan(0.1);
    expect(sim.debris.every((body) => !body.rigid?.attitudeLoop)).toBe(true);
  });

  it('holds the cascade\'s own arithmetic: ω_d = K_θ·e and ε = K_ω·(ω_d − ω̂) wherever no limit acts', () => {
    let checked = 0;
    for (const { rigid } of loops) {
      const loop = rigid.attitudeLoop!, limits = decodeLoopLimits(loop.limits), e = loop.attitudeErrorBody!;
      for (const axis of ['x', 'y', 'z'] as const) {
        if (limits.stopping[axis] || limits.rate[axis] || limits.acceleration[axis]) continue;
        expect(loop.desiredRatesBody[axis]).toBeCloseTo(loop.gains.attitudeGain[axis] * e[axis], 12);
        expect(loop.angularAccelerationBody[axis]).toBeCloseTo(loop.gains.rateGain[axis] * (loop.desiredRatesBody[axis] - loop.sensedOmegaBody[axis]), 12);
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(10000);
  });

  it('records the load relief through the dense air, never turning the command past what it asked', () => {
    const dense = loops.filter(({ rigid }) => rigid.attitudeLoop!.loadRelief);
    expect(dense.length).toBeGreaterThan(1000);
    for (const { rigid } of dense) {
      const relief = rigid.attitudeLoop!.loadRelief!;
      expect(relief.limitRad).toBeGreaterThan(0);
      expect(relief.appliedRad).toBeLessThanOrEqual(Math.max(0, relief.requestedRad - relief.limitRad) + 1e-9);
    }
  });

  it('flies the same flight with the record off', { timeout: 60_000 }, () => {
    const off = new Simulation(mission(), { headless: true, rigidOptions: { recordLoop: false } });
    while (off.state.t < 30) off.step(off.suggestedDt());
    const on = new Simulation(mission(), { headless: true });
    while (on.state.t < 30) on.step(on.suggestedDt());
    expect(off.state.rigid!.attitudeLoop).toBeUndefined();
    const withoutLoop = (key: string, value: unknown) => (key === 'attitudeLoop' ? undefined : value);
    expect(JSON.stringify([on.state.r, on.state.v, on.state.rigid, on.telemetry], withoutLoop))
      .toBe(JSON.stringify([off.state.r, off.state.v, off.state.rigid, off.telemetry], withoutLoop));
  });

  it('shows the pitch-over in each standard\'s axes and signs', () => {
    const turn = loops.filter(({ t }) => t > 20 && t < 50);
    const iso = turn.map(({ rigid }) => loopView(rigid, 'iso')!), gost = turn.map(({ rigid }) => loopView(rigid, 'gost')!);
    const mean = (values: number[]) => values.reduce((a, b) => a + b, 0) / values.length;
    // Nose-down pitch command: negative q (ISO) and negative ω_z (ГОСТ), the same number.
    expect(mean(iso.map((v) => v.commandDegS.pitch))).toBeLessThan(-0.05);
    expect(mean(gost.map((v) => v.commandDegS.pitch))).toBeCloseTo(mean(iso.map((v) => v.commandDegS.pitch)), 12);
    // Yaw is the one axis whose sign differs; magnitudes agree.
    expect(gost[10].commandDegS.yaw).toBeCloseTo(-iso[10].commandDegS.yaw, 12);
    expect(gost[10].momentKNm.aero.yaw).toBeCloseTo(-iso[10].momentKNm.aero.yaw, 12);
    // The moment the controller asks for equals what the engines, jets and air give, less what is unmet.
    for (const v of iso.slice(0, 50)) {
      for (const axis of ['roll', 'pitch', 'yaw'] as const) {
        expect(v.momentKNm.delivered[axis] + v.momentKNm.unmet[axis]).toBeCloseTo((v.momentKNm.filtered ?? v.momentKNm.demand)[axis], 9);
      }
    }
    expect(['roll', 'pitch', 'yaw'].map((a) => axisLetter(a as 'roll', 'iso'))).toEqual(['x', 'y', 'z']);
    expect(['roll', 'pitch', 'yaw'].map((a) => axisLetter(a as 'roll', 'gost'))).toEqual(['x', 'z', 'y']);
  });

  it('maps a limiter on the simulator\'s z axis to pitch and on y to yaw', () => {
    const rigid = { ...loops[0].rigid, attitudeLoop: { ...loops[0].rigid.attitudeLoop!,
      limits: encodeLoopLimits({ stoppingLimited: 0b100, rateLimited: 0, accelerationLimited: 0b010 }, { gasBudget: false, gimbal: true, rcs: false }) } };
    const view = loopView(rigid, 'iso')!;
    expect(view.limits.stopping).toEqual({ roll: false, pitch: true, yaw: false });
    expect(view.limits.acceleration).toEqual({ roll: false, pitch: false, yaw: true });
    expect(loopLimiterNames(view)).toEqual(['stopping:pitch', 'acceleration:yaw', 'gimbals']);
  });

  it('gives the inspector a history window, one view per sample', () => {
    const history = loopHistory(loops, 10, 20, 'iso');
    expect(history.t[0]).toBeGreaterThanOrEqual(10);
    expect(history.t.at(-1)).toBeLessThanOrEqual(20);
    expect(history.views.length).toBe(history.t.length);
    expect(loopHistory(loops, 10, 20, 'iso').views[0]).toBe(history.views[0]);
    expect(loopView(undefined)).toBeNull();
    const { attitudeLoop: _dropped, ...legacy } = loops[0].rigid;
    expect(loopView(legacy as RigidTelemetry)).toBeNull();
  });

  it('writes the loop into the CSV in the standard of the interface', () => {
    withLang('ru');
    const [header, first] = buildTelemetryCsv(sim).split('\n');
    const columns = header.split(',');
    for (const name of ['gost_loop_attitude_error_pitch_rad', 'gost_loop_rate_command_yaw_rad_s', 'gost_loop_moment_aero_roll_n_m', 'loop_limiters', 'loop_rcs_duty'])
      expect(columns).toContain(name);
    expect(fields(first).length).toBe(columns.length);
    withLang('en');
    // One CSV line per telemetry sample, after the header.
    const index = sim.telemetry.findIndex((s) => s.t > 30 && s.rigid?.attitudeLoop), lines = buildTelemetryCsv(sim).split('\n');
    const cols = lines[0].split(','), row = fields(lines[1 + index]);
    const pitchError = Number(row[cols.indexOf('iso_loop_attitude_error_pitch_rad')]);
    expect(pitchError).toBeCloseTo(loopView(sim.telemetry[index].rigid, 'iso')!.errorDeg!.pitch / RAD, 9);
  });
});

describe('a loop record', () => {
  it('is copied, not shared, by the telemetry clone', () => {
    const loop: AttitudeLoopTelemetry = { targetQ: { w: 1, x: 0, y: 0, z: 0 }, attitudeErrorBody: v3(1, 2, 3), desiredRatesBody: v3(), sensedOmegaBody: v3(),
      angularAccelerationBody: v3(), momentDemandBody: v3(), aeroMomentBody: v3(), engineMomentBody: v3(), rcsMomentBody: v3(),
      gains: { ...GAINS, attitudeGain: { ...GAINS.attitudeGain } }, limits: 0, gimbalUse: 0.5, rcsDuty: 0, loadRelief: { requestedRad: 0.1, limitRad: 0.2, appliedRad: 0 } };
    const rigid = { attitudeLoop: loop, attitudeQ: { w: 1, x: 0, y: 0, z: 0 }, omegaBody: v3(), cgBody: v3(), inertiaBody: INERTIA, renderOffsetBody: v3(),
      windECI: v3(), engineDeflections: {} } as unknown as RigidTelemetry;
    const copy = cloneRigidTelemetry(rigid)!;
    expect(copy.attitudeLoop).toEqual(loop);
    copy.attitudeLoop!.attitudeErrorBody!.x = 9; copy.attitudeLoop!.gains.rateGain.y = 9; copy.attitudeLoop!.loadRelief!.appliedRad = 9;
    expect(loop.attitudeErrorBody!.x).toBe(1); expect(loop.gains.rateGain.y).toBe(3); expect(loop.loadRelief!.appliedRad).toBe(0);
  });
});
