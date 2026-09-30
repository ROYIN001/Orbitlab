/**
 * The builder's warnings, refusals and estimates in words (roadmap D02, D03),
 * src/design/warning-text.ts.
 *
 * Every code of every list has a sentence in all three dictionaries, and
 * every sentence gets exactly the numbers its placeholders ask for — checked
 * on constructed warnings of every code (both variants of the two codes that
 * have two sentences), on the warnings the whole catalogue really raises, and
 * on every refusal and estimate code. The level a warning is shown at is the
 * level `designWarnings` gave it. These are identities; no tolerance.
 */
import { describe, expect, it } from 'vitest';
import { en } from '../src/i18n/en';
import { ru } from '../src/i18n/ru';
import { th } from '../src/i18n/th';
import { WARNING_LEVEL, designWarnings, type DesignWarning, type WarningCode } from '../src/design/warnings';
import {
  BODY_FIELD_KEYS, ESTIMATE_KEYS, EXPLORE_CHECK_KEYS, REFUSAL_KEYS, WARNING_KEYS, estimateText, exploreCheckText, refusalText,
  subjectOf, uniqueEstimates, warningText, type DesignText, type EstimateCode, type RefusalCode,
} from '../src/design/warning-text';
import { VEHICLES } from '../src/data/vehicles';
import { watchPayload } from '../src/design/stage-table';
import { copyOf } from './custom-vehicle-harness';

const DICTS = { en, ru, th } as Record<string, Record<string, string>>;
const placeholders = (s: string): string[] => [...new Set((s.match(/\{[a-zA-Z0-9_]+\}/g) ?? []).map((m) => m.slice(1, -1)))].sort();

/** The sentence exists in every language and the values fill its placeholders, no more and no fewer. */
function expectSayable(text: DesignText): void {
  for (const [lang, dict] of Object.entries(DICTS)) {
    expect(dict[text.key], `${lang} ${text.key}`).toBeTypeOf('string');
    expect(placeholders(dict[text.key]), `${lang} ${text.key}`).toEqual(Object.keys(text.values).sort());
  }
  for (const v of Object.values(text.values)) {
    if (typeof v === 'object' && 'key' in v) for (const dict of Object.values(DICTS)) expect(dict[v.key], v.key).toBeTypeOf('string');
    if (typeof v === 'object' && 'value' in v) expect(Number.isFinite(v.value)).toBe(true);
  }
}

/** One warning of each code, with the params `designWarnings` documents for it. */
function constructed(): DesignWarning[] {
  const w = (code: WarningCode, params: Record<string, number>, where: Partial<DesignWarning> = {}): DesignWarning =>
    ({ code, level: WARNING_LEVEL[code], ...where, params });
  return [
    w('invalid', {}, { stage: 1, path: 'stages[1].engine.ispVac', field: 'stages.engine.ispVac' }),
    w('vacuumEngineOnPad', {}, { stage: 0, booster: 1 }),
    w('noLiftoff', { tw: 0.9, thrustN: 6.8e6, weightN: 7.5e6, releaseTw: 0.95 }, { stage: 0 }),
    w('lowLiftoffTW', { tw: 1.1, thrustN: 7e6, weightN: 6.4e6, floor: 1.15 }, { stage: 0 }),
    w('weakUpperStage', { accel: 1.2, floor: 1.6 }, { stage: 2 }),
    w('fixedThrustOverAccel', { accel: 62, limit: 50, strapOnPhase: 0 }, { stage: 1 }),
    w('fixedThrustOverAccel', { accel: 55, limit: 50, strapOnPhase: 1 }, { stage: 0 }),
    w('lowDv', { dv: 8000, floor: 9500 }),
    w('implausibleFraction', { fraction: 0.985, min: 0.51, max: 0.97 }, { stage: 1 }),
    w('implausibleFraction', { fraction: 0.4, min: 0.51, max: 0.97 }, { stage: 0, booster: 0 }),
    w('upperWiderThanFairing', { stageDiameter: 5.4, fairingDiameter: 4 }, { stage: 1 }),
  ];
}

describe('warnings in words', () => {
  it('has a sentence for every warning code, in en, ru and th', () => {
    const codes = Object.keys(WARNING_LEVEL) as WarningCode[];
    expect(Object.keys(WARNING_KEYS).sort()).toEqual([...codes].sort());
    for (const keys of Object.values(WARNING_KEYS)) for (const key of keys) for (const dict of Object.values(DICTS)) expect(dict[key], key).toBeTypeOf('string');
  });

  it('says every constructed warning, both variants included, at the level it was raised at', () => {
    const list = constructed();
    // every code is constructed, and every key of every code is reached
    expect(new Set(list.map((w) => w.code))).toEqual(new Set(Object.keys(WARNING_LEVEL)));
    const reached = new Set(list.map((w) => warningText(w).key));
    expect(reached).toEqual(new Set(Object.values(WARNING_KEYS).flat()));
    for (const w of list) {
      const text = warningText(w);
      expectSayable(text);
      expect(WARNING_KEYS[w.code]).toContain(text.key);
      expect(text.level).toBe(w.level);
    }
  });

  it('picks the sentence by the numbers: a fraction above the range, below it; the strap-on phase or a burnout', () => {
    const c = constructed();
    const burnout = c[5], strapOns = c[6], high = c[8], low = c[9];
    expect(warningText(burnout).key).toBe('build.warn.overAccel');
    expect(warningText(strapOns).key).toBe('build.warn.overAccelStrapOns');
    expect(warningText(high).key).toBe('build.warn.fractionHigh');
    expect(warningText(high).values.bound).toEqual({ value: 0.97, unit: 'percent' });
    expect(warningText(low).key).toBe('build.warn.fractionLow');
    expect(warningText(low).values.bound).toEqual({ value: 0.51, unit: 'percent' });
    expect(warningText(low).subject).toEqual({ kind: 'strapOns', n: 1 });
  });

  it('says what a warning is about: a stage by its number from 1, a strap-on group by its own', () => {
    expect(subjectOf({ stage: 0 })).toEqual({ kind: 'stage', n: 1 });
    expect(subjectOf({ stage: 2 })).toEqual({ kind: 'stage', n: 3 });
    expect(subjectOf({ stage: 0, booster: 1 })).toEqual({ kind: 'strapOns', n: 2 });
    expect(subjectOf({})).toBeNull();
    // the validator's path is shown as it is
    expect(warningText(constructed()[0]).detail).toBe('stages[1].engine.ispVac');
  });

  it('says every warning the catalogue really raises at half its rated payload, and the fails of a design that cannot lift off', () => {
    let n = 0;
    for (const v of VEHICLES) {
      for (const w of designWarnings(copyOf(v.id), watchPayload(v))) {
        const text = warningText(w);
        expectSayable(text);
        expect(text.level).toBe(w.level);
        n++;
      }
    }
    expect(n).toBeGreaterThan(0);
    const heavy = copyOf('falcon9');
    heavy.stages[0].engine = { ...heavy.stages[0].engine, thrustSL: heavy.stages[0].engine.thrustSL / 2, thrustVac: heavy.stages[0].engine.thrustVac / 2 };
    const texts = designWarnings(heavy, 10000).map(warningText);
    expect(texts.map((x) => x.key)).toContain('build.warn.noLiftoff');
    expect(texts.find((x) => x.key === 'build.warn.noLiftoff')!.level).toBe('fail');
    texts.forEach(expectSayable);
  });
});

describe('refusals and estimates in words', () => {
  it('has a sentence for every refusal code, and fills a field refusal with the field and its bound', () => {
    for (const code of Object.keys(REFUSAL_KEYS) as RefusalCode[]) {
      const text = refusalText({ code, stage: 1 });
      expect(text.level).toBe('fail');
      if (code !== 'fieldRange') expectSayable(text);
    }
    for (const field of Object.keys(BODY_FIELD_KEYS) as (keyof typeof BODY_FIELD_KEYS)[]) {
      const text = refusalText({ code: 'fieldRange', stage: 0, field, min: 0, max: 1e6 });
      expectSayable(text);
      expect(text.values.field).toEqual({ key: BODY_FIELD_KEYS[field] });
    }
    expect(refusalText({ code: 'unknownPart', fairing: true }).subject).toEqual({ kind: 'fairing' });
  });

  it('has a sentence for every estimate code, with the numbers and names it needs', () => {
    for (const code of Object.keys(ESTIMATE_KEYS) as EstimateCode[]) {
      const text = estimateText({ code, stage: 0 }, { baseName: 'Falcon 9', country: 'US' });
      // the country a design takes from its site is a default, not an estimate
      expect(text.level).toBe(code === 'countryDefault' ? 'default' : 'note');
      expectSayable(text);
    }
    expect(estimateText({ code: 'originRatings' }, { baseName: 'Falcon 9' }).values.name).toBe('Falcon 9');
    expect(uniqueEstimates([{ code: 'tankMassScaled', stage: 1 }, { code: 'tankMassScaled', stage: 1 }, { code: 'tankMassScaled', stage: 0 }]))
      .toEqual([{ code: 'tankMassScaled', stage: 1 }, { code: 'tankMassScaled', stage: 0 }]);
  });

  it('has a sentence for the Explore level\'s own check', () => {
    for (const code of Object.keys(EXPLORE_CHECK_KEYS) as (keyof typeof EXPLORE_CHECK_KEYS)[]) {
      const text = exploreCheckText({ code, level: 'warn', stage: 1, dryMass: 100, enginesMass: 5480 });
      expect(text.level).toBe('warn');
      expect(text.subject).toEqual({ kind: 'stage', n: 2 });
      expectSayable(text);
    }
  });
});
