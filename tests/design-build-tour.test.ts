/**
 * The Build section's Watch level: its tour (src/design/build-tour.ts) and its
 * list of rockets (src/design/vehicle-picker.ts).
 *
 * Every step stands on a real catalogue vehicle and points at parts that
 * vehicle has, in words that exist in all three languages. Its figures must
 * mean what the step says, checked against bounds fixed before the first run
 * (each is a direction or an exact value, not a fitted number): staging buys
 * Δv; strap-ons carry a liftoff the core alone could not; an upper stage
 * lights below a thrust-to-weight of 1; the fairing's published jettison
 * time is the data's. The what-if Δv is also worked by hand, to 1e-12
 * relative.
 */
import { describe, expect, it } from 'vitest';
import { en } from '../src/i18n/en';
import { ru } from '../src/i18n/ru';
import { th } from '../src/i18n/th';
import { G0 } from '../src/physics/constants';
import { VEHICLES, vehicleById } from '../src/data/vehicles';
import { vehicleFigures, type PhaseBudget } from '../src/design/budget';
import { explodedView } from '../src/design/exploded';
import { watchPayload } from '../src/design/stage-table';
import { BUILD_TOUR, carriedDv, coreAloneTW, tourFigures } from '../src/design/build-tour';
import { isHistorical, pickerEntries, stepEntry } from '../src/design/vehicle-picker';

describe('the Build tour (Watch)', () => {
  it('has four or five steps, each on a real vehicle, in the three languages', () => {
    expect(BUILD_TOUR.length).toBeGreaterThanOrEqual(4);
    expect(BUILD_TOUR.length).toBeLessThanOrEqual(5);
    expect(new Set(BUILD_TOUR.map((s) => s.id)).size).toBe(BUILD_TOUR.length);
    for (const s of BUILD_TOUR) {
      expect(VEHICLES.some((v) => v.id === s.vehicle), s.id).toBe(true);
      for (const [name, dict] of Object.entries({ en, ru, th })) {
        expect(dict[s.titleKey], `${name} ${s.titleKey}`).toBeTruthy();
        expect(dict[s.textKey], `${name} ${s.textKey}`).toBeTruthy();
      }
    }
  });

  it('points only at parts its vehicle has, and shows every figure it names', () => {
    for (const s of BUILD_TOUR) {
      const refs = new Set(explodedView(vehicleById(s.vehicle)).parts.map((p) => p.ref));
      for (const ref of [...s.highlight, ...(s.select ? [s.select] : [])]) expect(refs.has(ref), `${s.id} ${ref}`).toBe(true);
      expect(tourFigures(s).map((f) => f.stat), s.id).toEqual([...s.stats]);
    }
  });

  it('covers what a stage is, staging, strap-ons, the upper stage and the fairing', () => {
    expect(BUILD_TOUR.map((s) => s.id)).toEqual(['stack', 'staging', 'strapons', 'upper', 'fairing']);
  });

  const figure = (id: string, stat: string) => tourFigures(BUILD_TOUR.find((s) => s.id === id)!).find((f) => f.stat === stat)!;

  it('a stack of three stages: Saturn V', () => {
    expect(figure('stack', 'stages').value).toBe(3);
    expect(figure('stack', 'height').value).toBe(vehicleById('saturnv').height);
  });

  it('staging buys Δv: the same propellant with the empty stage carried along gives less (an estimate)', () => {
    const staged = figure('staging', 'stagedDv'), carried = figure('staging', 'carriedDv');
    expect(staged.estimate).toBe(false);
    expect(carried.estimate).toBe(true);
    expect(carried.value).toBeLessThan(staged.value);
    expect(carried.value).toBeGreaterThan(0);
  });

  it('the strap-ons carry the liftoff: the core alone lifts less than its weight (an estimate)', () => {
    const tw = figure('strapons', 'liftoffTW'), core = figure('strapons', 'coreTW');
    expect(tw.value).toBeGreaterThan(1);
    expect(core.value).toBeLessThan(1);
    expect(core.estimate).toBe(true);
    expect(figure('strapons', 'parallelDv').value).toBeGreaterThan(0);
  });

  it('the upper stage lights below a thrust-to-weight of 1, the first stage above it', () => {
    expect(figure('upper', 'upperTW').value).toBeLessThan(1);
    expect(figure('upper', 'liftoffTW').value).toBeGreaterThan(1);
  });

  it('the fairing: its mass, length and published jettison time are the data\'s', () => {
    const f = vehicleById('ariane64').fairing!;
    expect(figure('fairing', 'fairingMass').value).toBe(f.mass);
    expect(figure('fairing', 'fairingLength').value).toBe(f.length);
    expect(figure('fairing', 'fairingJettison').value).toBe(f.sepTime);
  });
});

describe('the what-if figures, by hand', () => {
  it('carries every dropped mass on to the end', () => {
    const phases: PhaseBudget[] = [
      { stageIndex: 0, stageId: 'a', phase: 'serial', m0: 100, mf: 40, ve: 3000, dv: 3000 * Math.log(100 / 40), burnTime: 100 },
      // 10 kg dropped between the phases
      { stageIndex: 1, stageId: 'b', phase: 'serial', m0: 30, mf: 12, ve: 3500, dv: 3500 * Math.log(30 / 12), burnTime: 100 },
    ];
    const want = 3000 * Math.log(100 / 40) + 3500 * Math.log(40 / 22);
    expect(Math.abs(carriedDv(phases) - want) / want).toBeLessThanOrEqual(1e-12);
    // nothing dropped: the staged total itself
    const f9 = vehicleFigures(vehicleById('falcon9'), 0);
    expect(carriedDv(f9.phases)).toBeLessThan(f9.totalDv);
  });

  it('weighs the core\'s own sea-level thrust against the whole vehicle', () => {
    const v = vehicleById('soyuz21a');
    const m0 = vehicleFigures(v, watchPayload(v)).liftoffMass;
    const e = v.stages[0].engine;
    const want = (e.count * e.thrustSL) / (m0 * G0);
    expect(Math.abs(coreAloneTW(v, m0) - want) / want).toBeLessThanOrEqual(1e-12);
  });
});

describe('the list of rockets', () => {
  it('offers all 21, today\'s fleet first, then the historical ones', () => {
    const entries = pickerEntries(VEHICLES);
    expect(entries.length).toBe(21);
    expect(new Set(entries.map((e) => e.id))).toEqual(new Set(VEHICLES.map((v) => v.id)));
    // historical: every engine it flies is a historical catalogue part (D01)
    expect(entries.filter((e) => e.group === 'historical').map((e) => e.id)).toEqual(['h2a202', 'sputnik8k71ps', 'vostok8k72k', 'saturnv']);
    expect(entries.findIndex((e) => e.group === 'historical')).toBe(17);
    expect(isHistorical(vehicleById('falcon9'))).toBe(false);
    expect(entries.find((e) => e.id === 'falcon9')!.label).toBe('Falcon 9 Block 5 (US)');
  });

  it('adds designs after the catalogue, and steps round in both directions', () => {
    const design = { ...structuredClone(vehicleById('falcon9')), id: 'my-f9', name: 'My Falcon' };
    const entries = pickerEntries(VEHICLES, [design]);
    expect(entries[entries.length - 1]).toEqual({ id: 'my-f9', label: 'My Falcon (US)', group: 'design' });
    const ids = entries.map((e) => e.id);
    expect(stepEntry(entries, ids[0], -1)).toBe(ids[ids.length - 1]);
    expect(stepEntry(entries, ids[ids.length - 1], 1)).toBe(ids[0]);
    expect(stepEntry(entries, ids[3], 2)).toBe(ids[5]);
    expect(stepEntry([], 'x', 1)).toBe('x');
    expect(stepEntry(entries, 'not-a-rocket', 1)).toBe(ids[0]);
    expect(stepEntry(entries, 'not-a-rocket', -1)).toBe(ids[ids.length - 1]);
  });
});
