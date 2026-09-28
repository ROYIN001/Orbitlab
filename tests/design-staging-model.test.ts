/**
 * The Engineer level's optimal staging page (roadmap D05) as data,
 * src/design/staging-model.ts, on top of the Lagrange solution that
 * tests/design-optimal-staging.test.ts holds to closed forms, a brute-force
 * search and published worked examples.
 *
 * Identities, fixed before the first run: a vehicle's stages are the budget
 * core's Isp and ε and its Δv the model's ideal Δv; its real split is its own
 * phases, which add up to that Δv; the optimum at the same stages, Δv and
 * payload carries at least as much; the curve is the optimiser's own score
 * of a split, peaks within one sample of the optimum and never above it; the
 * stage `stageLeftOut` names is the one a search over the split leaves with
 * nothing.
 *
 * One pair of figures is a finding carried over, not an identity: Saturn V's
 * optimal first-stage share against its real one, 1.75 against 3.88 km/s in
 * the budget-and-staging report. The bounds (±0.05 km/s around those) were
 * set AFTER a probe run of this page's logic printed 1 747 and 3 882 m/s:
 * they hold the page to the report's figures, and would catch a change that
 * moved either.
 */
import { describe, expect, it } from 'vitest';
import { VEHICLES, vehicleById } from '../src/data/vehicles';
import { G0 } from '../src/physics/constants';
import { vehicleFigures } from '../src/design/budget';
import { watchPayload } from '../src/design/stage-table';
import { optimalStaging, splitPayloadRatio, stagingLimit, stagingProblem } from '../src/design/optimal-staging';
import {
  STAGING_LIMITS, STAGING_MAX_STAGES, STAGING_PROBLEM_KEYS, compareWithVehicle, problemValues, realSplit, sameInputs, splitCurve,
  stageLeftOut, stagingInputProblem, vehicleStaging,
} from '../src/design/staging-model';
import { expectSayable } from './sayable-harness';

const rel = (a: number, b: number): number => Math.abs(a - b) / Math.abs(b);

describe('a vehicle’s stages, as the optimiser takes them', () => {
  it('are each serial stage’s vacuum Isp and ε, at the vehicle’s own ideal Δv; strap-ons are left out and counted', () => {
    for (const v of VEHICLES) {
      const p = watchPayload(v);
      const f = vehicleFigures(v, p);
      const s = vehicleStaging(v, p);
      expect(s.stages.length, v.id).toBe(Math.min(v.stages.length, STAGING_MAX_STAGES));
      s.stages.forEach((st, i) => {
        expect(st.ispS).toBe(v.stages[i].engine.ispVac);
        expect(st.epsilon).toBe(f.stages[i].structuralRatio);
      });
      expect(s.dvMps).toBe(f.totalDv);
      expect(s.strapOnGroups).toBe(v.stages[0].boosters?.length ?? 0);
      expect(s.fairingKg).toBe(v.fairing?.mass ?? 0);
      expect(sameInputs(s, vehicleStaging(v, p))).toBe(true);
      expect(sameInputs(s, { ...s, dvMps: s.dvMps + 1 })).toBe(false);
    }
  });
});

describe('the real split beside the optimum', () => {
  it('exists exactly for the vehicles with no strap-ons, adds up to their Δv, and never beats the optimum', () => {
    let compared = 0;
    for (const v of VEHICLES) {
      const p = watchPayload(v);
      const real = realSplit(v, p);
      const strapOns = (v.stages[0].boosters?.length ?? 0) > 0;
      expect(real === null, v.id).toBe(strapOns);
      if (!real) continue;
      const f = vehicleFigures(v, p);
      expect(rel(real.stageDv.reduce((a, b) => a + b, 0), f.totalDv), v.id).toBeLessThan(1e-12);
      real.stageDv.forEach((dv, i) => expect(rel(dv, G0 * v.stages[i].engine.ispVac * Math.log(real.massRatio[i])), `${v.id} ${i}`).toBeLessThan(1e-9));
      expect(real.payloadRatio).toBe(f.payloadFraction);
      const cmp = compareWithVehicle(v, p);
      if (!cmp) {
        // the optimum has no answer for this vehicle's stages at its Δv: said, not compared
        expect(stagingProblem(vehicleStaging(v, p).stages, f.totalDv, p), v.id).not.toBeNull();
        continue;
      }
      compared++;
      expect(cmp.optimum.payloadRatio, v.id).toBeGreaterThanOrEqual(real.payloadRatio);
      expect(rel(cmp.optimum.stageDv.reduce((a, b) => a + b, 0), real.totalDv)).toBeLessThan(1e-9);
    }
    expect(compared).toBeGreaterThanOrEqual(5);
  });

  it('Saturn V: the optimum gives the first stage about 1.75 km/s, the real one takes 3.88 (bounds set after a probe run; see the file’s comment)', () => {
    const v = vehicleById('saturnv');
    const cmp = compareWithVehicle(v, watchPayload(v))!;
    expect(cmp.optimum.stageDv[0]).toBeGreaterThan(1700);
    expect(cmp.optimum.stageDv[0]).toBeLessThan(1800);
    expect(cmp.real.stageDv[0]).toBeGreaterThan(3830);
    expect(cmp.real.stageDv[0]).toBeLessThan(3930);
    expect(cmp.real.fairingKg).toBe(0);
  });

  it('finding, recorded not tuned: the real first stage takes more than the optimum on two vehicles and less on four', () => {
    // Found in review. The page said real first stages take more of the Δv than the loss-free optimum "usually",
    // and because they pay the losses. The catalogue says otherwise: of the six vehicles the comparison covers,
    // Saturn V and Proton-M give the first stage more, and Falcon 9, Long March 2D, Electron and Starship give it
    // less. Vega-C's stages have no optimum at its own Δv. These are the model's outcomes at half the rated LEO
    // payload, recorded after a probe run printed them; a change to the catalogue or the budget that moves one
    // shows here.
    const side: Record<string, string> = {};
    for (const v of VEHICLES) {
      const cmp = compareWithVehicle(v, watchPayload(v));
      if (cmp) side[v.id] = cmp.real.stageDv[0] > cmp.optimum.stageDv[0] ? 'more' : 'less';
      else if (realSplit(v, watchPayload(v))) side[v.id] = 'no optimum';
    }
    expect(side).toEqual({
      saturnv: 'more', protonm: 'more',
      falcon9: 'less', longmarch2d: 'less', electron: 'less', starship: 'less',
      vegac: 'no optimum',
    });
  });
});

describe('the two-stage curve', () => {
  it('is the optimiser’s score of each split, and peaks at the optimum within one sample', () => {
    for (const [id, dv] of [['falcon9', 9500], ['falcon9', 11100], ['longmarch2d', 10083], ['starship', 11549]] as const) {
      const stages = vehicleStaging(vehicleById(id), watchPayload(vehicleById(id))).stages;
      const samples = 400;
      const c = splitCurve(stages, dv, samples);
      expect(c.dv1.length).toBe(samples + 1);
      c.dv1.forEach((a, k) => expect(c.ratio[k]).toBe(splitPayloadRatio(stages, [a, dv - a])));
      const opt = optimalStaging(stages, dv, 1000)!;
      let arg = 0;
      c.ratio.forEach((r, k) => { if (r > c.ratio[arg]) arg = k; });
      expect(Math.abs(c.dv1[arg] - opt.stageDv[0]), id).toBeLessThanOrEqual(dv / samples);
      expect(c.ratio[arg]).toBeLessThanOrEqual(opt.payloadRatio * (1 + 1e-12));
      expect(c.flyable![0]).toBeLessThanOrEqual(opt.stageDv[0]);
      expect(c.flyable![1]).toBeGreaterThanOrEqual(opt.stageDv[0]);
    }
    expect(() => splitCurve(vehicleStaging(vehicleById('saturnv'), 1000).stages, 12000)).toThrow();
  });
});

describe('what stops an answer, in words', () => {
  it('names the stage an optimum would leave out: the one a search over the split gives nothing', () => {
    // a low-Isp heavy stage under a good one, at a Δv the good one makes alone
    const stages = [{ ispS: 220, epsilon: 0.2 }, { ispS: 450, epsilon: 0.08 }];
    const dv = 1500;
    expect(stagingProblem(stages, dv)).toBe('stageWithoutDv');
    expect(stageLeftOut(stages)).toBe(0);
    let best = -1, arg = -1;
    for (let a = 0; a <= dv; a += 1) {
      const r = splitPayloadRatio(stages, [a, dv - a]);
      if (r > best) { best = r; arg = a; }
    }
    expect(arg).toBe(0);
    expect(problemValues('stageWithoutDv', stages)).toEqual({ stage: 1 });
    // and the other way up
    expect(stageLeftOut([...stages].reverse())).toBe(1);
  });

  it('gives the limit beyond which no staging reaches', () => {
    const stages = vehicleStaging(vehicleById('falcon9'), 1000).stages;
    expect(problemValues('beyondLimit', stages)).toEqual({ limit: stagingLimit(stages) });
    expect(stagingProblem(stages, stagingLimit(stages) + 1)).toBe('beyondLimit');
  });

  it('says every problem in en, ru and th with the numbers it needs', () => {
    const stages = [{ ispS: 220, epsilon: 0.2 }, { ispS: 450, epsilon: 0.08 }];
    for (const [code, key] of Object.entries(STAGING_PROBLEM_KEYS)) {
      const v = problemValues(code as keyof typeof STAGING_PROBLEM_KEYS, stages);
      expectSayable({
        key, level: 'fail', subject: null,
        values: { ...(v.limit !== undefined ? { limit: { value: v.limit, unit: 'speed' } } : {}), ...(v.stage !== undefined ? { stage: { value: v.stage, unit: 'count' } } : {}) },
      });
    }
  });

  it('names the first input out of its bounds', () => {
    const ok = { stages: [{ ispS: 300, epsilon: 0.1 }, { ispS: 350, epsilon: 0.12 }], dvMps: 9000, payloadKg: 1000 };
    expect(stagingInputProblem(ok)).toBeNull();
    expect(stagingInputProblem({ ...ok, stages: [] })).toEqual({ field: 'count' });
    expect(stagingInputProblem({ ...ok, stages: Array.from({ length: STAGING_MAX_STAGES + 1 }, () => ok.stages[0]) })).toEqual({ field: 'count' });
    expect(stagingInputProblem({ ...ok, stages: [ok.stages[0], { ispS: Number.NaN, epsilon: 0.1 }] })).toEqual({ field: 'isp', stage: 1 });
    expect(stagingInputProblem({ ...ok, stages: [{ ispS: 300, epsilon: 0.9 }] })).toEqual({ field: 'epsilon', stage: 0 });
    expect(stagingInputProblem({ ...ok, dvMps: 0 })).toEqual({ field: 'dv' });
    expect(stagingInputProblem({ ...ok, payloadKg: -1 })).toEqual({ field: 'payload' });
    // every catalogue vehicle's own stages are inside the bounds
    for (const v of VEHICLES) expect(stagingInputProblem(vehicleStaging(v, watchPayload(v))), v.id).toBeNull();
    expect(STAGING_LIMITS.epsilon[0]).toBeGreaterThan(0);
  });
});
