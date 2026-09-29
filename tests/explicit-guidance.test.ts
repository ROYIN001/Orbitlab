import { describe, expect, it } from 'vitest';
import { Simulation } from '../src/physics/simulation';
import { vehicleById } from '../src/data/vehicles';
import { orbitById } from '../src/data/orbits';
import { DEFAULT_FAILURE, DEFAULT_GUIDANCE, guidanceForVehicle } from '../src/physics/defaults';
import { MU_EARTH, R_EARTH } from '../src/physics/constants';
import { gravityJ2 } from '../src/physics/gravity';
import { elementsFromState } from '../src/physics/orbital';
import { planeNormalThrough } from '../src/physics/guidance';
import { VehicleModel } from '../src/physics/vehicle';
import { add, cross, norm, normalize, scale, v3 } from '../src/physics/vec3';
import {
  ExplicitGuidance, accelAt, burnProfile, explicitGuidanceProblems, explicitReady, insertionTarget, profileDeltaV, thrustIntegrals, timeToGain,
  type BurnSegment, type ExplicitLaw,
} from '../src/physics/explicit-guidance';
import { validateConfigInput } from '../src/config/validation';
import { buildTelemetryCsv } from '../src/ui/csv';
import { localizeEventParams } from '../src/ui/names';
import { setLang, t } from '../src/i18n';
import type { ExplicitGuidanceConfig, MissionConfig } from '../src/types';
import { LAUNCH_TIME } from './fleet-harness';

const PROFILE: BurnSegment[] = [
  { kind: 'thrust', a0: 12, ve: 3000, tb: 60 },
  { kind: 'coast', a0: 0, ve: 0, tb: 4 },
  { kind: 'thrust', a0: 6, ve: 3400, tb: 150 },
  { kind: 'accel', a0: 30, ve: 3400, tb: 20 },
];

function mission(vehicleId: string, model: 'sixDof' | 'pointMass', explicitGuidance?: ExplicitGuidanceConfig): MissionConfig {
  return { vehicleId, satelliteId: 'cubesats', siteId: vehicleById(vehicleId).sites[0], orbit: orbitById('leo'), launchTime: LAUNCH_TIME,
    guidance: guidanceForVehicle(vehicleById(vehicleId), DEFAULT_GUIDANCE, model), guidanceResolved: true,
    failure: { ...DEFAULT_FAILURE }, boosterRecovery: false,
    dynamics: { model, wind: 'calm', seed: 20260919, ...(explicitGuidance ? { explicitGuidance } : {}) } } as MissionConfig;
}
function flyAscent(sim: Simulation, until = Infinity): Simulation {
  while (!sim.done && (sim.state.status === 'ascent' || sim.state.status === 'prelaunch') && sim.state.t < until) sim.step(sim.suggestedDt());
  return sim;
}

describe('the thrust integrals (roadmap G01)', () => {
  it('match a fine numerical integration across stages, a coast and the acceleration ceiling', () => {
    for (const T of [30, 60, 100, 220, 234]) {
      // Midpoint sums of a, t·a and t²·a; S and Q are the double integrals ∫(T − t)·a and ∫(T − t)·t·a.
      let L = 0, J = 0, H = 0;
      const h = 1e-3;
      for (let k = 0; k * h < T - 1e-12; k++) {
        const tm = (k + 0.5) * h, a = accelAt(PROFILE, tm);
        L += a * h; J += tm * a * h; H += tm * tm * a * h;
      }
      const S = T * L - J, Q = T * J - H;
      const I = thrustIntegrals(PROFILE, T);
      expect(I.L).toBeCloseTo(L, 2);
      expect(I.J / J).toBeCloseTo(1, 6);
      expect(I.S / S).toBeCloseTo(1, 6);
      expect(I.Q / Q).toBeCloseTo(1, 6);
    }
  });

  it('turns a velocity into the time the stages take to give it, and knows when they cannot', () => {
    for (const dv of [100, 1500, 2400]) expect(thrustIntegrals(PROFILE, timeToGain(PROFILE, dv).t).L).toBeCloseTo(dv, 6);
    const all = profileDeltaV(PROFILE);
    expect(timeToGain(PROFILE, all + 50)).toEqual({ t: 234, short: true, deficit: expect.closeTo(50, 6) });
  });

  it('builds the burn ahead from the vehicle: its stages, the weak final stage left out, the ceiling', () => {
    const vehicle = new VehicleModel(vehicleById('falcon9'), 1000);
    const profile = burnProfile(vehicle, { excludeWeakFinal: false, maxAccel: 0 })!;
    expect(profile.map((s) => s.kind)).toEqual(['coast', 'thrust', 'coast', 'thrust']);
    // The ideal Δv of the stages, as the vehicle model counts it.
    expect(profileDeltaV(profile)).toBeCloseTo(vehicle.deltaVRemaining(), -1);
    const capped = burnProfile(vehicle, { excludeWeakFinal: false, maxAccel: 40 })!;
    expect(capped.some((s) => s.kind === 'accel' && s.a0 === 40)).toBe(true);
    expect(profileDeltaV(capped)).toBeCloseTo(profileDeltaV(profile), 3);
  });
});

describe('PEG and IGM in a vacuum ascent (roadmap G01)', () => {
  /** A single stage handed a climbing trajectory, steered by the law until the target's energy is reached. */
  function fly(law: ExplicitLaw, start: { altitude: number; speed: number; climb: number; a0: number; ve: number; dry: number }, target: { pe: number; ap: number }) {
    let r = v3(R_EARTH + start.altitude, 0, 0), v = add(v3(0, start.speed * Math.cos(0.45), start.speed * Math.sin(0.45)), v3(start.climb, 0, 0)), m = 1, t = 0;
    const { a0, ve } = start, mdot = a0 / ve, inc = 0.5, dt = 0.02;
    const goal = insertionTarget(target.pe, target.ap, inc);
    const guidance = new ExplicitGuidance({ law, cycleS: 1 }, goal, { periapsis: target.pe, apoapsis: target.ap });
    const energy = goal.speed ** 2 / 2 - MU_EARTH / goal.radius;
    while (t < 2000) {
      const profile = (): BurnSegment[] => [{ kind: 'thrust', a0: a0 / m, ve, tb: (m - start.dry) / mdot }];
      const iy = planeNormalThrough(normalize(r), inc, normalize(cross(r, v)));
      const dir = guidance.update({ t, r, v, ready: true, profile, iy, standardDir: normalize(v) })!;
      if (norm(v) ** 2 / 2 - MU_EARTH / norm(r) >= energy) break;
      const acc = (rr: typeof r) => add(gravityJ2(rr), scale(dir, a0 / m));
      const a1 = acc(r), r2 = add(r, scale(v, dt / 2)), v2 = add(v, scale(a1, dt / 2));
      const a2 = acc(r2), r3 = add(r, scale(v2, dt / 2)), v3_ = add(v, scale(a2, dt / 2));
      const a3 = acc(r3), r4 = add(r, scale(v3_, dt)), v4 = add(v, scale(a3, dt)), a4 = acc(r4);
      r = add(r, scale(add(add(v, scale(add(v2, v3_), 2)), v4), dt / 6));
      v = add(v, scale(add(add(a1, scale(add(a2, a3), 2)), a4), dt / 6));
      m -= mdot * dt; t += dt;
    }
    return { el: elementsFromState(r, v), guidance, t };
  }

  for (const law of ['peg', 'igm'] as const) {
    it(`${law.toUpperCase()} puts a stage into its orbit and plane from far off it`, () => {
      const cases = [
        { start: { altitude: 120e3, speed: 2500, climb: 800, a0: 8, ve: 3400, dry: 0.15 }, target: { pe: 200e3, ap: 200e3 } },
        { start: { altitude: 90e3, speed: 2000, climb: 1200, a0: 6, ve: 4400, dry: 0.12 }, target: { pe: 400e3, ap: 400e3 } },
        { start: { altitude: 120e3, speed: 2500, climb: 800, a0: 8, ve: 4400, dry: 0.1 }, target: { pe: 200e3, ap: 1000e3 } },
      ];
      for (const { start, target } of cases) {
        const { el, guidance } = fly(law, start, target);
        expect(el.periapsisAlt / 1000).toBeCloseTo(target.pe / 1000, -0.5);
        expect(Math.abs(el.apoapsisAlt - target.ap) / 1000).toBeLessThan(5);
        expect(el.i * 180 / Math.PI).toBeCloseTo(0.5 * 180 / Math.PI, 1);
        expect(guidance.record!.status).toBe('terminal');
      }
    });
  }

  it('hands back when the stages left cannot reach the target, and says so', () => {
    const goal = insertionTarget(200e3, 35_786e3, 0.5);
    const guidance = new ExplicitGuidance({ law: 'peg', cycleS: 1 }, goal, { periapsis: 200e3, apoapsis: 35_786e3 });
    const r = v3(R_EARTH + 150e3, 0, 0), v = v3(0, 3500, 0);
    const dir = guidance.update({ t: 0, r, v, ready: true, profile: () => [{ kind: 'thrust', a0: 10, ve: 3000, tb: 200 }], iy: v3(0, 0, 1), standardDir: normalize(v) });
    expect(dir).toBeUndefined();
    expect(guidance.record!.status).toBe('short');
    expect(guidance.takeEvents().map((e) => e.key)).toEqual(['evt.guidanceShort']);
  });

  it('takes over only when a later stage is lit, or the first is out of the atmosphere', () => {
    const base = { closedLoop: true, burning: true, activeIndex: 0, q: 5000, altitude: 40e3 };
    expect(explicitReady(base)).toBe(false);
    expect(explicitReady({ ...base, activeIndex: 1 })).toBe(true);
    expect(explicitReady({ ...base, q: 80, altitude: 75e3 })).toBe(true);
    expect(explicitReady({ ...base, activeIndex: 1, closedLoop: false })).toBe(false);
    expect(explicitReady({ ...base, activeIndex: 1, burning: false })).toBe(false);
  });
});

describe('explicit guidance in flight (roadmap G01)', () => {
  it('flies Falcon 9 to its insertion orbit on PEG and IGM, from the second stage, on no more propellant', () => {
    const standard = flyAscent(new Simulation(mission('falcon9', 'pointMass'), { headless: true }));
    for (const law of ['peg', 'igm'] as const) {
      const sim = flyAscent(new Simulation(mission('falcon9', 'pointMass', { law }), { headless: true }));
      const engaged = sim.events.find((e) => e.key === 'evt.guidanceEngaged')!;
      expect(engaged.params!.law).toBe(law.toUpperCase());
      expect(engaged.t).toBeGreaterThan(140);
      const parking = sim.events.find((e) => e.key === 'evt.parkingOrbit')!;
      expect(Math.abs(Number(parking.params!.pe) - 200)).toBeLessThanOrEqual(3);
      expect(Math.abs(Number(parking.params!.ap) - 500)).toBeLessThanOrEqual(3);
      expect(sim.vehicle.deltaVRemaining()).toBeGreaterThan(standard.vehicle.deltaVRemaining() - 5);
      const record = sim.telemetry.filter((s) => s.explicitGuidance).at(-1)!.explicitGuidance!;
      expect(record).toMatchObject({ law, targetPeriapsis: 200e3, targetApoapsis: 500e3 });
      expect(['engaged', 'terminal']).toContain(record.status);
    }
    expect(standard.telemetry.some((s) => s.explicitGuidance)).toBe(false);
  }, 60000);

  // The standard flight's swing was 24° before Falcon 9's six-DOF pitch programme
  // was fitted to webcast telemetry (docs/VALIDATION.md, F5); the earlier turn
  // leaves less for the load relief to hold back, and it is 15° now.
  it('releases the six-DOF load relief smoothly, where the standard flight swings 15° at 500 Pa', () => {
    const worst = (sim: Simulation) => {
      let max = 0;
      while (!sim.done && sim.state.t < 150) {
        sim.step(sim.suggestedDt());
        const e = sim.state.rigid?.attitudeLoop?.attitudeErrorBody;
        if (e && sim.state.t > 110) max = Math.max(max, Math.hypot(e.x, e.y, e.z) * 180 / Math.PI);
      }
      return max;
    };
    expect(worst(new Simulation(mission('falcon9', 'sixDof'), { headless: true }))).toBeGreaterThan(12);
    expect(worst(new Simulation(mission('falcon9', 'sixDof', { law: 'peg' }), { headless: true }))).toBeLessThan(8);
  }, 120000);

  it('exports the guidance in the CSV', () => {
    const sim = flyAscent(new Simulation(mission('falcon9', 'pointMass', { law: 'igm', cycleS: 2 }), { headless: true }), 200);
    const lines = buildTelemetryCsv(sim).split('\n'), cols = lines[0].split(',');
    const last = lines[lines.indexOf('') - 1].split(',');
    const at = (name: string) => last[last.length - (cols.length - cols.indexOf(name))];
    expect(at('guide_law')).toBe('igm');
    expect(at('guide_status')).toBe('engaged');
    expect(Number(at('guide_tgo_s'))).toBeGreaterThan(100);
  }, 60000);
});

describe('explicit guidance settings', () => {
  it('checks the law and the cycle', () => {
    expect(explicitGuidanceProblems({ law: 'peg' })).toEqual([]);
    expect(explicitGuidanceProblems({ law: 'lunar' }).map((p) => p.field)).toEqual(['setup.explicit.law']);
    expect(explicitGuidanceProblems({ law: 'igm', cycleS: 10 })).toEqual([{ field: 'setup.explicit.cycle', value: 10, limits: [0.1, 4] }]);
    expect(explicitGuidanceProblems({ law: 'igm', pitch: 1 })[0].field).toBe('setup.explicit.title');
    const base = { vehicleId: 'falcon9', satelliteId: 'cubesats', siteId: 'cape', orbit: orbitById('leo'), launchTime: LAUNCH_TIME, payloadMass: 1000,
      guidanceOverrides: {}, failure: { ...DEFAULT_FAILURE }, boosterRecovery: false };
    expect(validateConfigInput({ ...base, dynamics: { model: 'pointMass', wind: 'calm', seed: 1, explicitGuidance: { law: 'peg', cycleS: 0 } } }))
      .toEqual([{ field: 'setup.explicit.cycle', code: 'minimum', limit: 0.1 }]);
    expect(() => new Simulation(mission('falcon9', 'pointMass', { law: 'x' } as unknown as ExplicitGuidanceConfig), { headless: true })).toThrow(/Invalid dynamics/);
  });

  it('writes the guidance events in every language', () => {
    const g = globalThis as { document?: unknown };
    if (!g.document) g.document = { documentElement: {} };
    for (const lang of ['en', 'th', 'ru'] as const) {
      setLang(lang);
      for (const [key, params] of [['evt.guidanceEngaged', { law: 'PEG', tGo: 320, vGo: 5468 }], ['evt.guidanceShort', { law: 'IGM', vGo: 900 }]] as const) {
        expect(t(key, localizeEventParams(null, params))).not.toMatch(/\{[a-zA-Z]+\}/);
      }
    }
    setLang('en');
    expect(t('evt.guidanceEngaged', { law: 'PEG', tGo: 320, vGo: 5468 })).toBe('PEG guidance takes over: 320 s and 5468 m/s to go');
  });
});
