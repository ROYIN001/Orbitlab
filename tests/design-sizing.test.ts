/**
 * Roadmap D05: parametric sizing (src/design/sizing.ts).
 *
 * Bounds, all fixed before the first run:
 * - the sized vehicle's ideal Δv (the flight model's own `idealDeltaV`)
 *   reproduces the design Δv to 1e-9 relative, and so does the sum of the
 *   optimal split;
 * - the planner's `ascentMargin` for it is `ASCENT_MARGIN_REQUIRED` to
 *   1e-6 m/s: the design Δv IS the planner's cost to the orbit plus its margin;
 * - it passes the custom-vehicle validator, and the design warnings raise no
 *   `fail`;
 * - every T/W at ignition is at least its target (`vehicleFigures`, the
 *   budget core's own figure);
 * - SANITY BOUNDS for a 1 t payload to the 500 km LEO preset from Kourou on
 *   two kerolox stages (Rutherford and Rutherford Vacuum, Electron's own
 *   structural ratios rounded: 0.08 and 0.09, 1.8 m, T/W 1.3 and 0.7). From
 *   launchers of that class — Firefly Alpha, 54 t at liftoff for about
 *   1 030 kg to LEO; Electron 13 t for 300 kg; Vega-C 210 t for 3.3 t —
 *   liftoff mass 20–80 t, payload fraction 1–5 %, liftoff T/W 1.3–2.6 (the
 *   target to the fleet's ceiling, tests/data-consistency.test.ts), upper
 *   T/W 0.7–2.6, at most 33 first-stage engines (Super Heavy, the fleet's
 *   most), height 15–60 m. These say "plausible", not "right".
 */
import { describe, expect, it } from 'vitest';
import { orbitById } from '../src/data/orbits';
import { siteById } from '../src/data/sites';
import { DEFAULT_FAILURE, DEFAULT_GUIDANCE } from '../src/physics/defaults';
import { ASCENT_MARGIN_REQUIRED, planMission } from '../src/physics/mission';
import { idealDeltaV } from '../src/physics/vehicle';
import { probeInsertion } from '../src/physics/autotune';
import { G0 } from '../src/physics/constants';
import { vehicleSpecProblems } from '../src/config/vehicle-spec';
import { vehicleFigures } from '../src/design/budget';
import { designWarnings } from '../src/design/warnings';
import { LENGTH_ALLOWANCE_DIAMETERS, SizingRefused, sizeVehicle, type SizingRequest } from '../src/design/sizing';
import type { MissionConfig } from '../src/types';

const LAUNCH = new Date(Date.UTC(2026, 8, 15, 12, 0, 0));
const SMALL: SizingRequest = {
  payloadKg: 1000, orbit: orbitById('leo'), siteId: 'kourou', id: 'sized-1t', name: 'Sized 1 t',
  stages: [
    { enginePart: 'rutherford', epsilon: 0.08, diameterM: 1.8, targetTW: 1.3 },
    { enginePart: 'rutherford-vac', epsilon: 0.09, diameterM: 1.8, targetTW: 0.7 },
  ],
};
const REQUESTS: SizingRequest[] = [
  SMALL,
  // a medium launcher to the station's plane from Baikonur: kerolox, then hydrolox
  { payloadKg: 8000, orbit: orbitById('iss'), siteId: 'baikonur', launchTime: LAUNCH,
    stages: [{ enginePart: 'rd191', epsilon: 0.07, diameterM: 3.6, targetTW: 1.35 }, { enginePart: 'rl10c11', epsilon: 0.1, diameterM: 3.6, targetTW: 0.6 }] },
  // three stages to sun-synchronous from Vandenberg
  { payloadKg: 3000, orbit: orbitById('sso'), siteId: 'vandenberg', launchTime: LAUNCH,
    stages: [
      { enginePart: 'merlin1d', epsilon: 0.06, diameterM: 3.66, targetTW: 1.3 },
      { enginePart: 'mvac', epsilon: 0.07, diameterM: 3.66, targetTW: 0.8 },
      { enginePart: 'rl10c1', epsilon: 0.12, diameterM: 3.05, targetTW: 0.4 },
    ] },
];

const missionFor = (req: SizingRequest, spec: ReturnType<typeof sizeVehicle>['spec']): MissionConfig => ({
  vehicleId: spec.id, vehicleSpec: spec, satelliteId: 'cubesats', siteId: req.siteId, orbit: req.orbit,
  launchTime: req.launchTime ?? LAUNCH, guidance: { ...DEFAULT_GUIDANCE }, failure: { ...DEFAULT_FAILURE },
  boosterRecovery: false, payloadMassOverride: req.payloadKg,
});

describe('D05 sizing: the design Δv', () => {
  it('sizes vehicles whose ideal Δv is the design Δv, and whose planner margin is the planner’s own', () => {
    for (const req of REQUESTS) {
      const r = sizeVehicle(req);
      const dv = idealDeltaV(r.spec, req.payloadKg);
      expect([req.siteId, Math.abs(dv - r.designDv) / r.designDv < 1e-9]).toEqual([req.siteId, true]);
      expect(Math.abs(r.staging.stageDv.reduce((a, b) => a + b, 0) - r.designDv) / r.designDv).toBeLessThan(1e-9);
      expect(r.designDv).toBe(r.ascentCost + ASCENT_MARGIN_REQUIRED);
      const plan = planMission(missionFor(req, r.spec), siteById(req.siteId), r.spec);
      expect(plan.weakFinalStage).toBe(false);
      expect(Math.abs(plan.ascentMargin - ASCENT_MARGIN_REQUIRED)).toBeLessThan(1e-6);
    }
  });

  it('gives each stage its share of the split, with the fairing on the first stage, and meets every T/W target', () => {
    for (const req of REQUESTS) {
      const r = sizeVehicle(req);
      const figures = vehicleFigures(r.spec, req.payloadKg);
      // the rocket equation per stage, the fairing carried through the first stage only
      const fairing = r.spec.fairing?.mass ?? 0;
      let above = req.payloadKg;
      for (let i = r.stages.length - 1; i >= 0; i--) {
        const st = r.spec.stages[i];
        const lifted = above + (i === 0 ? fairing : 0);
        const dv = G0 * st.engine.ispVac * Math.log((lifted + st.dryMass + st.propellantMass) / (lifted + st.dryMass));
        expect(Math.abs(dv - r.staging.stageDv[i]) / r.staging.stageDv[i]).toBeLessThan(1e-9);
        above += st.dryMass + st.propellantMass;
        expect(figures.stages[i].twIgnition).toBeGreaterThanOrEqual(req.stages[i].targetTW * (1 - 1e-12));
        expect(Math.abs(figures.stages[i].structuralRatio - req.stages[i].epsilon)).toBeLessThan(1e-12);
      }
      expect(vehicleSpecProblems(r.spec)).toEqual([]);
      expect(designWarnings(r.spec, req.payloadKg, req.siteId).filter((w) => w.level === 'fail')).toEqual([]);
    }
  });
});

describe('D05 sizing: a 1 t launcher from Kourou', () => {
  it('is a plausible vehicle (sanity bounds, fixed first)', () => {
    const r = sizeVehicle(SMALL);
    const f = vehicleFigures(r.spec, SMALL.payloadKg);
    const summary = {
      designDv: Math.round(r.designDv), split: r.staging.stageDv.map(Math.round), liftoffKg: Math.round(f.liftoffMass),
      payloadFraction: +f.payloadFraction.toFixed(4), engines: r.stages.map((s) => s.engines), tw: f.stages.map((s) => +s.twIgnition.toFixed(3)),
      lengths: r.stages.map((s) => +s.length.toFixed(2)), height: +r.spec.height.toFixed(2), fairing: r.spec.fairing?.diameter,
    };
    console.log(`sizing, 1 t to LEO from Kourou: ${JSON.stringify(summary)}`);
    expect(f.liftoffMass).toBeGreaterThanOrEqual(20e3);
    expect(f.liftoffMass).toBeLessThanOrEqual(80e3);
    expect(f.payloadFraction).toBeGreaterThanOrEqual(0.01);
    expect(f.payloadFraction).toBeLessThanOrEqual(0.05);
    expect(f.liftoffTW).toBeGreaterThanOrEqual(1.3);
    expect(f.liftoffTW).toBeLessThanOrEqual(2.6);
    expect(f.stages[1].twIgnition).toBeGreaterThanOrEqual(0.7);
    expect(f.stages[1].twIgnition).toBeLessThanOrEqual(2.6);
    expect(r.stages[0].engines).toBeLessThanOrEqual(33);
    expect(r.spec.height).toBeGreaterThanOrEqual(15);
    expect(r.spec.height).toBeLessThanOrEqual(60);
    expect(r.estimates.map((e) => e.code)).toEqual(expect.arrayContaining(['lengthFromVolume', 'lengthAllowance', 'fairingChosen', 'lastStageRestartable', 'noRatings']));
    expect(r.spec.stages[1].restartable).toBe(true);
  });
});

describe('D05 sizing: flown', () => {
  it('records what a point-mass probe flight of the 1 t launcher does (a finding, recorded after the run)', () => {
    // NOT a bound fixed in advance: the Phase 3 map expected the sized
    // vehicle to reach orbit in the readiness probe. Flown (point mass, calm,
    // the default guidance programme, failures off), it does NOT at the
    // planner's own design Δv: it runs out of propellant on a 250 km-apoapsis
    // arc. The planner's loss allowance is the low end of what the fleet
    // spends (ASCENT_LOSS_ALLOWANCE), and this small vehicle on an untuned
    // programme spends more. With `extraDvMps` it was measured: +220 m/s (the
    // fleet's median loss over the allowance) still runs out, +500 m/s reaches
    // orbit. Recorded here so that a change to the sizing, the planner or the
    // flight that moves it is seen; not tuned away.
    //
    // Measured at review: most of the shortfall is the fairing, not the loss
    // allowance. The shroud chosen for a 1.8 m stage is Vostok's 800 kg one;
    // the design Δv drops it at the first staging (as `idealDeltaV` and the
    // planner count it), but the flight carries it to 115 km, well into the
    // second stage's burn. With no fairing the same request reaches orbit at
    // +200 m/s (+0 still runs out, its best perigee −164 km); with Sputnik's
    // 300 kg shroud it takes +400.
    const fly = (extraDvMps: number, fairing?: string | null) => {
      const r = sizeVehicle({ ...SMALL, extraDvMps, ...(fairing !== undefined ? { fairing } : {}) });
      return probeInsertion({ ...missionFor(SMALL, r.spec), dynamics: { model: 'pointMass', wind: 'calm', seed: 20260919 } });
    };
    const bare = fly(0);
    expect([bare.reachesOrbit, bare.endedWith]).toEqual([false, 'evt.outOfPropellant']);
    const median = fly(220);
    expect([median.reachesOrbit, median.endedWith]).toEqual([false, 'evt.outOfPropellant']);
    const margin = fly(500);
    expect([margin.reachesOrbit, margin.tInsertion > 0]).toEqual([true, true]);
    expect([fly(0, null).reachesOrbit, fly(200, null).reachesOrbit]).toEqual([false, true]);
  });

  it('adds extra Δv on request, and the planner sees exactly that much more margin', () => {
    const r = sizeVehicle({ ...SMALL, extraDvMps: 500 });
    expect(r.designDv).toBe(r.ascentCost + ASCENT_MARGIN_REQUIRED + 500);
    const plan = planMission(missionFor(SMALL, r.spec), siteById(SMALL.siteId), r.spec);
    expect(Math.abs(plan.ascentMargin - (ASCENT_MARGIN_REQUIRED + 500))).toBeLessThan(1e-6);
  });
});

describe('D05 sizing: what it refuses, and its estimates', () => {
  it('refuses solid motors, lumped engines, a vacuum engine on the pad and a Δv past the stages’ limit', () => {
    const code = (req: SizingRequest): string => {
      try { sizeVehicle(req); return 'accepted'; } catch (e) { return e instanceof SizingRefused ? e.code : `threw ${(e as Error).message}`; }
    };
    const one = (s: Partial<SizingRequest['stages'][number]>): SizingRequest => ({ ...SMALL, stages: [{ ...SMALL.stages[0], ...s }, SMALL.stages[1]] });
    expect(code(one({ enginePart: 'p120c' }))).toBe('solidMotor');
    expect(code(one({ enginePart: 'yf21c' }))).toBe('lumpedEngine');
    expect(code(one({ enginePart: 'mvac' }))).toBe('vacuumEngineOnPad');
    expect(code(one({ enginePart: 'nothing' }))).toBe('unknownPart');
    expect(code(one({ epsilon: 1.2 }))).toBe('badInput');
    expect(code({ ...SMALL, stages: [{ ...SMALL.stages[0], epsilon: 0.3 }] })).toBe('beyondLimit');
    expect(code({ ...SMALL, payloadKg: 0 })).toBe('badInput');
    expect(code({ ...SMALL, extraDvMps: -1 })).toBe('badInput');
    expect(code({ ...SMALL, siteId: 'atlantis' })).toBe('unknownSite');
    expect(code({ ...SMALL, fairing: 'nothing' })).toBe('unknownPart');
  });

  it('allows for engines and structure beyond the tanks by the catalogue’s median, a recorded estimate', () => {
    // recorded, not a bound: today's catalogue gives this many diameters
    expect(+LENGTH_ALLOWANCE_DIAMETERS.toFixed(4)).toBe(LENGTH_ALLOWANCE_DIAMETERS_RECORDED);
  });
});

/**
 * Recorded from the catalogue (src/data/parts.ts): 1.466 when the allowance was
 * written, 1.4648 since main's F11 gave Falcon Heavy's core Falcon 9's 410 900 kg
 * of propellant in the same 42 m (its tanks now fill more of the stage).
 */
const LENGTH_ALLOWANCE_DIAMETERS_RECORDED = 1.4648;
