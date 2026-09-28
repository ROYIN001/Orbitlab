/**
 * The test stand's bench (roadmap D04), src/design/test-stand.ts: the engines
 * it offers, the air it fires in, and the published figures it sets beside
 * the firing.
 *
 * The firing is src/design/static-fire.ts, validated on its own in
 * tests/design-static-fire.test.ts; what is checked here is that the bench
 * feeds it the right inputs and reads it back honestly. The references are
 * the catalogue's data (src/data/parts.ts), worked out in the test from the
 * data rather than through the model, a published figure where one exists
 * (P120C's 4 323 kN peak, Vega C), and for the pad's air the standard
 * barometric formula of the troposphere.
 *
 * Every tolerance was fixed before the comparison it bounds was first run:
 * the 1e-12/1e-9 bounds are rounding, the solid-peak bounds are
 * tests/design-static-fire.test.ts's own (0.5 % data, 1 % stand), and the
 * pressure bound 0.1 % covers the geometric-to-geopotential height difference
 * the barometric formula ignores (under 0.03 % at 1.8 km).
 */
import { describe, expect, it } from 'vitest';
import {
  STAND_AIRS, catalogueStandEngine, runStand, standComparison, standCatalogue, standCurves, standPressurePa, standStep, standThrottle,
  standTransients, transientWindows, vehicleStandEngines, type StandInputs,
} from '../src/design/test-stand';
import { staticFire } from '../src/design/static-fire';
import { ENGINE_PARTS, STAGE_BODIES, enginePart, engineSpec } from '../src/data/parts';
import { VEHICLES, vehicleById } from '../src/data/vehicles';
import { SITES } from '../src/data/sites';
import { G0, P0 } from '../src/physics/constants';

const rel = (a: number, b: number): number => Math.abs(a / b - 1);
const inputs = (o: Partial<StandInputs> & Pick<StandInputs, 'count' | 'propellantKg'>): StandInputs => ({ air: 'vacuum', padAltitudeM: 0, throttle: 1, ...o });

describe('the engines on offer', () => {
  it('lists each stage and one strap-on of each group, with the load it burns there', () => {
    const f9 = vehicleById('falcon9');
    const e = vehicleStandEngines(f9);
    expect(e.map((x) => x.key)).toEqual(['stage:0', 'stage:1']);
    expect(e[0].engine).toBe(f9.stages[0].engine);
    expect(e[0].count).toBe(9);
    expect(e[0].part?.id).toBe('merlin1d');
    expect(e[0].propellantKg).toBe(f9.stages[0].propellantMass);
    expect(e[1].part?.id).toBe('mvac');

    const a6 = vehicleById('ariane64');
    const b = vehicleStandEngines(a6).find((x) => x.key === 'booster:0:0')!;
    expect(b.part?.id).toBe('p120c');
    expect(b.count).toBe(1);
    expect(b.propellantKg).toBe(a6.stages[0].boosters![0].propellantMass);
    // every catalogue vehicle's every engine is found in the catalogue
    for (const v of VEHICLES) for (const x of vehicleStandEngines(v)) expect(x.part, `${v.id} ${x.key}`).not.toBeNull();
  });

  it('gives a catalogue engine its share of the first body that flies it, so it burns as long as there', () => {
    const one = catalogueStandEngine(enginePart('merlin1d'));
    const body = STAGE_BODIES.find((b) => b.engine.part === 'merlin1d')!;
    expect(one.count).toBe(1);
    expect(one.propellantKg).toBeCloseTo(body.propellantMass / body.engine.count, 6);
    const alone = staticFire(one.engine, { count: 1, propellantKg: one.propellantKg, pressurePa: 0, throttle: 1, dt: 0.01 });
    const stage = staticFire(one.engine, { count: body.engine.count, propellantKg: body.propellantMass, pressurePa: 0, throttle: 1, dt: 0.01 });
    expect(Math.abs(alone.burnTime - stage.burnTime)).toBeLessThan(0.011);
  });

  it('keeps a lumped entry at the count the data gives it, and lets any other count change', () => {
    expect(standCatalogue()).toHaveLength(ENGINE_PARTS.length);
    for (const s of standCatalogue()) {
      expect(s.countLocked, s.key).toBe(s.part!.kind === 'lumped');
      if (s.countLocked) {
        const body = STAGE_BODIES.find((b) => b.engine.part === s.part!.id);
        if (body) expect(s.count, s.key).toBe(body.engine.count);
      } else expect(s.count, s.key).toBe(1);
      expect(s.propellantKg, s.key).toBeGreaterThan(0);
    }
  });
});

describe('the air', () => {
  it('is 0 in the vacuum chamber, P0 at sea level, and the standard atmosphere at a pad', () => {
    expect(standPressurePa('vacuum', 5000)).toBe(0);
    expect(standPressurePa('seaLevel', 5000)).toBe(P0);
    expect(standPressurePa('pad', 0)).toBeCloseTo(P0, 6);
    // the barometric formula of the troposphere: p = P0 (1 − 2.25577e-5 h)^5.25588
    for (const site of SITES) {
      const expected = P0 * (1 - 2.25577e-5 * site.altitude) ** 5.25588;
      expect(rel(standPressurePa('pad', site.altitude), expected), site.id).toBeLessThan(1e-3);
    }
    expect(STAND_AIRS).toEqual(['vacuum', 'seaLevel', 'pad']);
  });

  it('blends the thrust linearly between the sea-level and vacuum figures at a pad (Xichang, 1 825 m)', () => {
    const m1d = enginePart('merlin1d');
    const one = catalogueStandEngine(m1d);
    const run = runStand(one.engine, inputs({ count: 1, propellantKg: one.propellantKg, air: 'pad', padAltitudeM: 1825 }));
    const p = run.pressurePa;
    expect(p).toBeGreaterThan(0.8 * P0);
    expect(p).toBeLessThan(0.82 * P0);
    const expected = m1d.thrustVac - (m1d.thrustVac - m1d.thrustSL) * p / P0;
    expect(rel(run.result.peakThrust, expected)).toBeLessThan(1e-12);
    const rows = standComparison(one.engine, 1, 'pad', run);
    expect(rows.find((r) => r.figure === 'thrustPad')).toMatchObject({ published: null, difference: null });
    expect(rel(rows.find((r) => r.figure === 'thrustPad')!.stand!, expected)).toBeLessThan(1e-12);
  });
});

describe('the throttle', () => {
  it('follows the flight model: a solid at 1, a liquid no lower than its minimum, a fixed engine at 1', () => {
    expect(standThrottle(engineSpec('p120c', 1), 0.5)).toEqual({ level: 1, why: 'solid' });
    expect(standThrottle(engineSpec('p120c', 1), 1)).toEqual({ level: 1, why: null });
    expect(standThrottle(engineSpec('merlin1d', 1), 0.7)).toEqual({ level: 0.7, why: null });
    expect(standThrottle(engineSpec('merlin1d', 1), 0.2)).toEqual({ level: 0.4, why: 'minimum' });
    expect(standThrottle(engineSpec('rl10c1', 1), 0.5)).toEqual({ level: 1, why: 'fixed' });
  });

  it('fires at the level it says', () => {
    const one = catalogueStandEngine(enginePart('merlin1d'));
    const run = runStand(one.engine, inputs({ count: 1, propellantKg: one.propellantKg, throttle: 0.2 }));
    expect(run.level).toBe(0.4);
    expect(rel(run.result.peakThrust, 0.4 * enginePart('merlin1d').thrustVac)).toBeLessThan(1e-12);
  });
});

describe('the model beside the data', () => {
  const f9 = vehicleById('falcon9');
  const s1 = vehicleStandEngines(f9)[0];
  const m1d = enginePart('merlin1d');

  it('Merlin 1D ×9 at sea level: the catalogue thrust exactly, and the sea-level Isp the model works out', () => {
    const run = runStand(s1.engine, inputs({ count: 9, propellantKg: s1.propellantKg, air: 'seaLevel' }));
    const rows = standComparison(s1.engine, 9, 'seaLevel', run);
    const row = (f: string) => rows.find((r) => r.figure === f)!;
    expect(row('thrustSL').published).toBe(9 * m1d.thrustSL);
    expect(Math.abs(row('thrustSL').difference!)).toBeLessThan(1e-12);
    expect(row('thrustVac')).toMatchObject({ published: 9 * m1d.thrustVac, stand: null, difference: null });
    // the model's sea-level Isp, from the data: ṁ = F_vac/(g0·Isp_vac), Isp_SL = F_SL/(g0·ṁ) = Isp_vac·F_SL/F_vac
    const isp = m1d.ispVac * m1d.thrustSL / m1d.thrustVac;
    expect(rel(row('ispSL').stand!, isp)).toBeLessThan(1e-9);
    expect(row('ispSL').published).toBe(m1d.ispSL);
    expect(row('ispSL').difference!).toBeCloseTo(isp / m1d.ispSL - 1, 9);
    // the invariant the stand's figures rest on: impulse = propellant burned × g0 · Isp
    expect(rel(run.result.impulse, run.result.propellantUsed * G0 * isp)).toBeLessThan(1e-9);
    expect(rel(run.deliveredIsp, isp)).toBeLessThan(1e-9);
    expect(run.leftKg).toBeLessThan(1e-6 * s1.propellantKg);
  });

  it('Merlin 1D ×9 in vacuum: the catalogue thrust and Isp exactly', () => {
    const run = runStand(s1.engine, inputs({ count: 9, propellantKg: s1.propellantKg }));
    const rows = standComparison(s1.engine, 9, 'vacuum', run);
    for (const f of ['thrustVac', 'ispVac']) expect(Math.abs(rows.find((r) => r.figure === f)!.difference!), f).toBeLessThan(1e-9);
    expect(rows.find((r) => r.figure === 'thrustSL')!.stand).toBeNull();
  });

  it('does not compare a throttled thrust with a full-thrust figure, but does compare its Isp', () => {
    const run = runStand(s1.engine, inputs({ count: 9, propellantKg: s1.propellantKg, throttle: 0.6 }));
    const rows = standComparison(s1.engine, 9, 'vacuum', run);
    expect(rows.find((r) => r.figure === 'thrustVac')!.difference).toBeNull();
    expect(rel(rows.find((r) => r.figure === 'thrustVac')!.stand!, 0.6 * 9 * m1d.thrustVac)).toBeLessThan(1e-12);
    expect(Math.abs(rows.find((r) => r.figure === 'ispVac')!.difference!)).toBeLessThan(1e-9);
  });

  it('refuses a vacuum engine in air, and says its sea-level pair is not data', () => {
    const s2 = vehicleStandEngines(f9)[1];
    for (const air of ['seaLevel', 'pad'] as const) {
      const run = runStand(s2.engine, inputs({ count: 1, propellantKg: s2.propellantKg, air, padAltitudeM: 3 }));
      expect(run.result.refused).toBe('vacuumOnlyAtPressure');
      const rows = standComparison(s2.engine, 1, air, run);
      expect(rows.every((r) => r.stand === null && r.difference === null)).toBe(true);
      expect(rows.filter((r) => r.notData).map((r) => r.figure)).toEqual(['thrustSL', 'ispSL']);
      expect(rows.find((r) => r.figure === 'thrustSL')!.published).toBeNull();
    }
    expect(runStand(s2.engine, inputs({ count: 1, propellantKg: s2.propellantKg })).result.refused).toBeUndefined();
  });

  it('P120C: the published peak from the catalogue, the stand\'s peak beside it, and no shutdown', () => {
    const p120 = vehicleStandEngines(vehicleById('ariane64')).find((x) => x.key === 'booster:0:0')!;
    const run = runStand(p120.engine, inputs({ count: 1, propellantKg: p120.propellantKg }));
    const rows = standComparison(p120.engine, 1, 'vacuum', run);
    const peak = rows.find((r) => r.figure === 'peakVac')!;
    // 4 323 kN published (Vega C); the catalogue keeps it as mean × peak/mean
    expect(rel(peak.published!, 4323e3)).toBeLessThan(0.005);
    expect(rel(peak.stand!, 4323e3)).toBeLessThan(0.01);
    // a solid's catalogue thrust is its mean; the stand's mean is impulse over burn time
    const mean = rows.find((r) => r.figure === 'meanVac')!;
    expect(mean.published).toBe(enginePart('p120c').thrustVac);
    expect(mean.stand).toBe(run.meanThrust);
    expect(rows.some((r) => r.figure === 'thrustVac')).toBe(false);
    expect(runStand(p120.engine, inputs({ count: 1, propellantKg: p120.propellantKg, cutoffS: 60 })).result.refused).toBe('solidShutdown');
    // at sea level it fires, and its peak row stays a vacuum figure with nothing beside it
    const sl = runStand(p120.engine, inputs({ count: 1, propellantKg: p120.propellantKg, air: 'seaLevel' }));
    expect(sl.result.refused).toBeUndefined();
    expect(standComparison(p120.engine, 1, 'seaLevel', sl).find((r) => r.figure === 'peakVac')!.stand).toBeNull();
  });

  it('a commanded cut-off leaves the rest in the tanks', () => {
    const run = runStand(s1.engine, inputs({ count: 9, propellantKg: s1.propellantKg, cutoffS: 60 }));
    expect(run.result.burnTime).toBe(60);
    expect(run.leftKg).toBeGreaterThan(0.5 * s1.propellantKg);
    expect(rel(run.leftKg + run.result.propellantUsed, s1.propellantKg)).toBeLessThan(1e-12);
  });
});

describe('the step and the curves', () => {
  const s1 = vehicleStandEngines(vehicleById('falcon9'))[0];

  it('fires at 0.01 s up to about 400 s, and coarser beyond, never more than 40 000 steps', () => {
    expect(standStep(s1.engine, inputs({ count: 9, propellantKg: s1.propellantKg }))).toBe(0.01);
    const long = inputs({ count: 1, propellantKg: 5e6 });
    const dt = standStep(s1.engine, long);
    expect(dt).toBeGreaterThan(0.01);
    expect(runStand(s1.engine, long).result.samples.length).toBeLessThanOrEqual(40_001);
  });

  it('draws step means at their middles, from the zero of ignition, thinned to the points asked for', () => {
    const run = runStand(s1.engine, inputs({ count: 9, propellantKg: s1.propellantKg }));
    const all = run.result.samples;
    const c = standCurves(run.result, 0, Infinity, 1000);
    expect(c.t[0]).toBe(0);
    expect(c.thrustKN[0]).toBe(0);
    expect(Number.isNaN(c.isp[0])).toBe(true);
    expect(c.t[1]).toBeCloseTo(all[0].t + all[0].dt / 2, 12);
    expect(c.t.length).toBeLessThanOrEqual(1002);
    const last = all[all.length - 1];
    expect(c.t[c.t.length - 1]).toBeCloseTo(last.t + last.dt / 2, 12);
    expect(c.thrustKN[c.t.length - 1]).toBeCloseTo(last.thrust / 1000, 9);
    for (let i = 1; i < c.t.length; i++) expect(c.t[i]).toBeGreaterThan(c.t[i - 1]);
  });

  it('frames the start-up and the tail-off, the model\'s generic transients', () => {
    const run = runStand(s1.engine, inputs({ count: 9, propellantKg: s1.propellantKg }));
    const tr = standTransients(s1.engine);
    expect(tr).toEqual({ startupS: 1, tailoffTauS: 0.25, tailoffSpanS: 1.25, generic: true });
    const w = transientWindows(s1.engine, run.result);
    expect(w.startup).toEqual([0, 2]);
    expect(w.tailoff![1]).toBe(run.result.duration);
    expect(w.tailoff![0]).toBeLessThan(run.result.burnTime);
    const up = standCurves(run.result, ...w.startup);
    // the rise reaches the steady thrust by 1 s and holds it
    const steady = 9 * enginePart('merlin1d').thrustVac / 1000;
    expect(up.thrustKN[up.thrustKN.length - 1]).toBeCloseTo(steady, 6);
    expect(Math.max(...up.thrustKN.filter((_, i) => up.t[i] < 0.5))).toBeLessThan(0.6 * steady);
    const solid = standTransients(engineSpec('p120c', 1));
    expect(solid).toMatchObject({ startupS: 0.3, tailoffTauS: 1, generic: true });
  });
});
