/**
 * The builder's warnings (roadmap D03), src/design/warnings.ts.
 *
 * Each warning is shown on one constructed design and its negation, and the
 * ones that restate something the flight or the planner decides are held to
 * that decision, not to a restatement of it: `noLiftoff` to the flight's own
 * `evt.noLiftoff` over a sweep of thrusts, `weakUpperStage` to `planMission`'s
 * `weakFinalStage`, `fixedThrustOverAccel` to the peak acceleration the whole
 * fleet flies. And no catalogue vehicle fails at half its rated payload.
 *
 * Tolerances are stated where they are used, with when they were set.
 */
import { describe, expect, it } from 'vitest';
import {
  designWarnings, holdDownRelease, DV_FLOOR, LIFTOFF_TW_FLOOR, PROPELLANT_FRACTION_RANGE, WEAK_STAGE_ACCEL, type DesignWarning,
} from '../src/design/warnings';
import { VEHICLES, vehicleById } from '../src/data/vehicles';
import { siteById } from '../src/data/sites';
import { orbitById } from '../src/data/orbits';
import { Simulation } from '../src/physics/simulation';
import { planMission } from '../src/physics/mission';
import { DEFAULT_FAILURE, DEFAULT_GUIDANCE, guidanceForVehicle } from '../src/physics/defaults';
import { defaultDynamics } from '../src/physics/rigid/config';
import { G0 } from '../src/physics/constants';
import { idealDeltaV, liftoffMass, liftoffThrust } from '../src/physics/vehicle';
import { copyOf } from './custom-vehicle-harness';
import type { MissionConfig, VehicleSpec } from '../src/types';

const LAUNCH = new Date(Date.UTC(2026, 8, 15, 12, 0, 0));
const codes = (w: DesignWarning[]) => w.map((x) => x.code);
const find = (w: DesignWarning[], code: DesignWarning['code']) => w.filter((x) => x.code === code);
const staticTw = (spec: VehicleSpec, payload: number) => liftoffThrust(spec) / (liftoffMass(spec, payload) * G0);

function mission(spec: VehicleSpec, payloadKg: number, extra: Partial<MissionConfig> = {}): MissionConfig {
  return {
    vehicleId: spec.id, vehicleSpec: spec, satelliteId: 'cubesats', siteId: spec.sites[0], orbit: orbitById('leo'), launchTime: LAUNCH,
    guidance: guidanceForVehicle(spec, DEFAULT_GUIDANCE), guidanceResolved: true, failure: { ...DEFAULT_FAILURE }, boosterRecovery: false,
    payloadMassOverride: payloadKg, dynamics: { ...defaultDynamics(spec), model: 'pointMass' }, ...extra,
  };
}

/** The first five seconds of a point-mass flight: T−10 s to T+5 s, the hold-down and its verdict. */
function padEvents(spec: VehicleSpec, payloadKg: number) {
  const sim = new Simulation(mission(spec, payloadKg), { headless: true });
  let guard = 0;
  while (!sim.done && sim.state.t < 5 && guard++ < 10000) sim.step(sim.suggestedDt());
  return sim.events;
}

/** Stage 0's engines and every strap-on's, thrust scaled by `k` at sea level and in vacuum alike. */
function scaledLiftoff(id: string, k: number): VehicleSpec {
  const spec = copyOf(id);
  const st = spec.stages[0];
  // a Set: the catalogue shares engine objects between groups, and a copy keeps that sharing
  for (const e of new Set([st.engine, ...(st.boosters ?? []).map((b) => b.engine)])) { e.thrustSL *= k; e.thrustVac *= k; }
  return spec;
}

describe('design warnings · each on one design and its negation', () => {
  const f9 = () => copyOf('falcon9');
  const PAYLOAD = 8000;

  it('a clean copy of a catalogue vehicle warns of nothing, as the catalogue entry itself does not', () => {
    expect(designWarnings(f9(), PAYLOAD)).toEqual([]);
    // the catalogue's own object is not put through the validator (it refuses
    // catalogue ids by design) and gives the same answer as its copy
    for (const v of VEHICLES) {
      expect(designWarnings(copyOf(v.id), 0.5 * v.payloadLEO), v.id).toEqual(designWarnings(v, 0.5 * v.payloadLEO));
    }
  });

  it('invalid: a validator finding, located by stage and keyed by its field', () => {
    const spec = f9();
    spec.stages[1].engine.ispVac = 3000;
    const w = designWarnings(spec, PAYLOAD);
    expect(w).toEqual([{ code: 'invalid', level: 'fail', path: 'stages[1].engine.ispVac', field: 'stages.engine.ispVac', stage: 1, params: {} }]);
    const b = copyOf('ariane64');
    b.stages[0].boosters![0].engine.count = 0;
    expect(designWarnings(b, 10000)).toEqual([{ code: 'invalid', level: 'fail', path: 'stages[0].boosters[0].engine.count',
      field: 'stages.boosters.engine.count', stage: 0, booster: 0, params: {} }]);
    // and a spec that reuses a catalogue id is invalid, even with every value the catalogue's
    expect(codes(designWarnings({ ...structuredClone(vehicleById('falcon9')) }, PAYLOAD))).toEqual(['invalid']);
  });

  it('vacuumEngineOnPad: a vacuum-only engine lit on the pad, said once, and not for an air-lit strap-on', () => {
    const core = f9();
    core.stages[0].engine.vacuumOnly = true;
    expect(designWarnings(core, PAYLOAD)).toEqual([{ code: 'vacuumEngineOnPad', level: 'fail', stage: 0, params: {} }]);
    const strapOn = copyOf('ariane64');
    strapOn.stages[0].boosters![0].engine.vacuumOnly = true;
    expect(designWarnings(strapOn, 10000)).toEqual([{ code: 'vacuumEngineOnPad', level: 'fail', stage: 0, booster: 0, params: {} }]);
    // PSLV-XL's second strap-on group lights in the air (igniteAt 25 s): the validator allows it there
    const airLit = copyOf('pslvxl');
    expect(airLit.stages[0].boosters![1].igniteAt).toBeGreaterThan(0);
    // A copy of its own: the two groups share one PSOM-XL object in the
    // catalogue, and `structuredClone` keeps that sharing inside the copy, so
    // setting the flag through one group would set it on the ground-lit one
    // too (found by the first run of this test).
    airLit.stages[0].boosters![1].engine = { ...airLit.stages[0].boosters![1].engine, vacuumOnly: true };
    expect(airLit.stages[0].boosters![0].engine.vacuumOnly).toBeUndefined();
    expect(codes(designWarnings(airLit, 1000))).not.toContain('vacuumEngineOnPad');
    expect(codes(designWarnings(airLit, 1000))).not.toContain('invalid');
  });

  it('noLiftoff: Falcon 9 with its sea-level thrust halved stays on the pad, here and in a 5-s flight', () => {
    const weak = f9();
    weak.stages[0].engine.thrustSL /= 2;
    const w = designWarnings(weak, PAYLOAD);
    expect(codes(w)).toEqual(['noLiftoff']);
    expect(w[0].params.tw).toBeCloseTo(staticTw(weak, PAYLOAD), 12);
    expect(w[0].params.releaseTw).toBeLessThan(1);
    expect(padEvents(weak, PAYLOAD).map((e) => e.key)).toContain('evt.noLiftoff');
    // the negation: as built it lifts off, here and in flight
    expect(codes(designWarnings(f9(), PAYLOAD))).not.toContain('noLiftoff');
    const flown = padEvents(f9(), PAYLOAD).map((e) => e.key);
    expect(flown).toContain('evt.liftoff');
    expect(flown).not.toContain('evt.noLiftoff');
  });

  it('lowLiftoffTW: under the fleet’s 1.15 but off the pad; not at 1.2', () => {
    const k = (target: number) => target / staticTw(copyOf('falcon9'), PAYLOAD);
    const slow = scaledLiftoff('falcon9', k(1.08));
    const w = designWarnings(slow, PAYLOAD);
    expect(codes(w)).toEqual(['lowLiftoffTW']);
    expect(w[0].params.tw).toBeCloseTo(1.08, 9);
    expect(w[0].params.floor).toBe(LIFTOFF_TW_FLOOR);
    expect(codes(designWarnings(scaledLiftoff('falcon9', k(1.2)), PAYLOAD))).toEqual([]);
  });

  it('weakUpperStage: an upper stage under 1.6 m/s² at ignition, exactly where the planner calls it a kick stage', () => {
    const at = (accel: number) => {
      const spec = f9();
      const s2 = spec.stages[1];
      const e = s2.engine;
      const k = accel * (s2.dryMass + s2.propellantMass + PAYLOAD + 1500) / (e.count * e.thrustVac);
      e.thrustVac *= k; e.thrustSL *= k;
      return spec;
    };
    for (const [accel, weak] of [[1.5, true], [1.59, true], [1.61, false], [1.7, false]] as const) {
      const spec = at(accel);
      const w = find(designWarnings(spec, PAYLOAD), 'weakUpperStage');
      expect(w.length, `${accel} m/s²`).toBe(weak ? 1 : 0);
      if (weak) {
        expect(w[0].stage).toBe(1);
        expect(w[0].params.accel).toBeCloseTo(accel, 9);
        expect(w[0].params.floor).toBe(WEAK_STAGE_ACCEL);
      }
      const plan = planMission(mission(spec, PAYLOAD), siteById(spec.sites[0]), spec);
      expect(plan.weakFinalStage, `${accel} m/s²: the planner`).toBe(weak);
    }
  });

  it('fixedThrustOverAccel: a stage that cannot throttle below the limit at burnout; not with a deep enough throttle', () => {
    const spec = f9();
    const s2 = spec.stages[1];
    spec.maxAccel = 40;
    delete s2.engine.minThrottle;
    const burnout = s2.engine.count * s2.engine.thrustVac / (s2.dryMass + PAYLOAD);
    expect(burnout).toBeGreaterThan(40);
    const w = find(designWarnings(spec, PAYLOAD), 'fixedThrustOverAccel');
    expect(w).toEqual([{ code: 'fixedThrustOverAccel', level: 'warn', stage: 1, params: { accel: burnout, limit: 40, strapOnPhase: 0 } }]);
    s2.engine.minThrottle = 0.9 * 40 / burnout;
    expect(find(designWarnings(spec, PAYLOAD), 'fixedThrustOverAccel')).toEqual([]);
    // the programme's own maxAccel, when it sets one, is the limit the flight flies
    spec.guidanceDefaults = { ...spec.guidanceDefaults, maxAccel: 30 };
    expect(find(designWarnings(spec, PAYLOAD), 'fixedThrustOverAccel').map((x) => x.params.limit)).toEqual([30]);
  });

  it('lowDv: under 9 500 m/s at the design payload; not above', () => {
    const spec = f9();
    // (30 t was tried first and still gave 10 231 m/s: the construction, not a bound)
    spec.stages[1].propellantMass = 12000;
    const dv = idealDeltaV(spec, PAYLOAD);
    expect(dv).toBeLessThan(DV_FLOOR);
    expect(find(designWarnings(spec, PAYLOAD), 'lowDv')).toEqual([{ code: 'lowDv', level: 'warn', params: { dv, floor: DV_FLOOR } }]);
    expect(idealDeltaV(f9(), PAYLOAD)).toBeGreaterThan(DV_FLOOR);
    expect(find(designWarnings(f9(), PAYLOAD), 'lowDv')).toEqual([]);
  });

  it('implausibleFraction: a stage or a strap-on outside the catalogue’s range; not inside it', () => {
    const [min, max] = PROPELLANT_FRACTION_RANGE;
    const heavy = f9();
    heavy.stages[1].dryMass = 120000;           // 108 t / 228 t = 0.47
    expect(find(designWarnings(heavy, PAYLOAD), 'implausibleFraction')).toEqual([
      { code: 'implausibleFraction', level: 'warn', stage: 1, params: { fraction: 108000 / 228000, min, max } }]);
    const light = copyOf('ariane64');
    light.stages[0].boosters![0].dryMass = 2000; // 142 t / 144 t = 0.986
    expect(find(designWarnings(light, 10000), 'implausibleFraction')).toEqual([
      { code: 'implausibleFraction', level: 'warn', stage: 0, booster: 0, params: { fraction: 142000 / 144000, min, max } }]);
  });

  it('upperWiderThanFairing: a fairing narrower than the widest stage it sits on; not as wide', () => {
    const spec = f9();
    spec.fairing!.diameter = 3.0;
    expect(find(designWarnings(spec, PAYLOAD), 'upperWiderThanFairing')).toEqual([
      { code: 'upperWiderThanFairing', level: 'warn', stage: 1, params: { stageDiameter: 3.66, fairingDiameter: 3.0 } }]);
    spec.fairing!.diameter = 3.66;
    expect(find(designWarnings(spec, PAYLOAD), 'upperWiderThanFairing')).toEqual([]);
  });
});

describe('design warnings · agree with the flight', () => {
  /**
   * `noLiftoff` against the flight's own verdict, over thrusts that put the
   * static T/W from 0.90 to 1.06 on five vehicles of four kinds (liquid,
   * liquid with liquid strap-ons, solid first stage, liquid with solid
   * strap-ons). The hold-down replay has to give the flight's answer wherever
   * its release T/W is more than 0.5 % from 1 — a band fixed before this
   * comparison was first run, for the one-step difference in where the two
   * put T+0 — and where the flight lifts off, the release T/W it logs
   * (`evt.liftoff`, rounded to 0.01) within 0.01 of the replay's.
   */
  it('noLiftoff is the flight’s evt.noLiftoff, across the edge of liftoff', () => {
    let compared = 0, total = 0;
    for (const id of ['falcon9', 'soyuz21a', 'vegac', 'h3', 'electron']) {
      const payload = 0.5 * vehicleById(id).payloadLEO;
      const tw0 = staticTw(copyOf(id), payload);
      for (let target = 0.9; target < 1.065; target += 0.01) {
        const spec = scaledLiftoff(id, target / tw0);
        const replay = holdDownRelease(spec, payload, siteById(spec.sites[0]).altitude);
        const warned = codes(designWarnings(spec, payload)).includes('noLiftoff');
        expect(warned, `${id} at static T/W ${target.toFixed(2)}`).toBe(!replay.released);
        const events = padEvents(spec, payload);
        const failed = events.some((e) => e.key === 'evt.noLiftoff');
        total++;
        if (Math.abs(replay.tw - 1) <= 0.005) continue;
        compared++;
        expect(warned, `${id} at static T/W ${target.toFixed(2)}: replay ${replay.tw.toFixed(4)}`).toBe(failed);
        const liftoff = events.find((e) => e.key === 'evt.liftoff');
        if (liftoff) expect(Math.abs(Number(liftoff.params!.twr) - replay.tw), `${id} ${target.toFixed(2)}: release T/W`).toBeLessThanOrEqual(0.01);
      }
    }
    // the band must not swallow the comparison
    expect(compared).toBeGreaterThanOrEqual(0.8 * total);
  }, 60_000);

  /**
   * `fixedThrustOverAccel` against the peak thrust acceleration each stage
   * reaches in a point-mass flight to low orbit at half the rated payload,
   * for the whole fleet: a stage is warned exactly when the flight takes it
   * more than 2 % over the limit. The 2 % was set AFTER a probe of these
   * flights had shown every unwarned stage at most 0.5 % over (the guidance's
   * throttle lags its measurement by a step) and every warned one at least
   * 5.8 % over. It says what the warning is about: the flight cannot hold the
   * limit there; a stage cut off before its burnout (as Long March 2D's second
   * is, at orbit) may never reach the burnout figure itself.
   */
  it('fixedThrustOverAccel names exactly the stages the fleet flies over its acceleration limit', () => {
    for (const v of VEHICLES) {
      const payload = 0.5 * v.payloadLEO;
      const sim = new Simulation({ ...mission(v, payload), vehicleId: v.id, vehicleSpec: undefined }, { headless: true });
      const peak = new Map<number, number>();
      let guard = 0;
      while (!sim.done && guard++ < 400000 && (sim.state.status === 'prelaunch' || sim.state.status === 'ascent')) {
        sim.step(sim.suggestedDt());
        if (sim.state.status === 'ascent') {
          const i = sim.vehicle.activeIndex;
          peak.set(i, Math.max(peak.get(i) ?? 0, sim.state.thrust / sim.state.mass));
        }
      }
      const programme = guidanceForVehicle(v).maxAccel;
      const limit = programme > 0 ? programme : v.maxAccel;
      const over = [...peak].filter(([, a]) => a > 1.02 * limit).map(([i]) => i).sort();
      const warned = [...new Set(find(designWarnings(v, payload), 'fixedThrustOverAccel').map((x) => x.stage!))].sort();
      expect(warned, `${v.id}: flight peaks ${[...peak].map(([i, a]) => `${i}: ${a.toFixed(1)}`).join(', ')} against ${limit}`).toEqual(over);
    }
  }, 60_000);
});

describe('design warnings · the catalogue', () => {
  /**
   * Every catalogue vehicle at half its rated LEO payload: no `fail`, which is
   * what the fleet's T/W (1.15–2.6) and Δv (9 500–16 000 m/s) bands already
   * say. The `warn`s it does raise are recorded here as measured when this was
   * written — four kick stages under the planner's 1.6 m/s², and five places
   * where a stage that cannot throttle deep enough is flown past the vehicle's
   * acceleration limit (which the test above confirms in flight) — so that a
   * data change that adds or removes one is seen.
   */
  it('raises no fail at 50 % payload, and exactly the recorded warnings', () => {
    const seen: string[] = [];
    for (const v of VEHICLES) {
      for (const w of designWarnings(v, 0.5 * v.payloadLEO)) {
        expect(w.level, `${v.id}: ${w.code}`).toBe('warn');
        seen.push(`${v.id} ${w.code} ${w.stage}${w.params.strapOnPhase ? ' strap-on phase' : ''}`);
      }
    }
    expect(seen).toEqual([
      'protonm weakUpperStage 3',
      'angaraa5 weakUpperStage 2',
      'vegac weakUpperStage 3',
      'longmarch2d fixedThrustOverAccel 0',
      'longmarch2d fixedThrustOverAccel 1',
      'longmarch5 fixedThrustOverAccel 0 strap-on phase',
      'electron weakUpperStage 2',
      'sputnik8k71ps fixedThrustOverAccel 0',
      'saturnv fixedThrustOverAccel 0',
    ]);
  });

  it('holds the catalogue inside its own propellant-fraction range, rounded outward by at most 0.01', () => {
    const fractions = VEHICLES.flatMap((v) => v.stages.flatMap((st) => [st, ...(st.boosters ?? [])]))
      .map((p) => p.propellantMass / (p.dryMass + p.propellantMass));
    const [min, max] = PROPELLANT_FRACTION_RANGE;
    const lo = Math.min(...fractions), hi = Math.max(...fractions);
    expect(lo).toBeGreaterThanOrEqual(min);
    expect(hi).toBeLessThanOrEqual(max);
    expect(lo - min).toBeLessThan(0.01);
    expect(max - hi).toBeLessThan(0.01);
  });
});
