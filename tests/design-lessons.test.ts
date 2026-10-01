/**
 * Design lessons (roadmap T01, Phase 4 map §4.1): the lesson kind's file
 * format, the measures and their figures, the locks and the grader
 * (src/lessons/design-lesson.ts, src/design/design-lesson-key.ts).
 *
 * WHAT IS HELD, fixed before the first run:
 * - one number, one way: every closed-form measure equals the satellite
 *   model's figure (`designFigures`) in the measure's unit EXACTLY (`toBe`);
 *   the revisit and the data a day equal the D07 cores called directly on the
 *   design's orbit, exactly; the lifetime is the satellite bench's run — the
 *   same request field by field — and its answer exactly;
 * - for each of the fourteen measures, a pass and a fail on two designs that
 *   differ in one physical way (more cells, a heavier bus, a lower orbit, …),
 *   each premise said beside it (`PAIRS`);
 * - the reader takes a lesson written back byte for byte, at version 3, and
 *   refuses what no copy of the app could grade.
 * These are constructions, not validations against a reference: they show
 * the lesson reads the model, not that the model is right (the model's own
 * validation is tests/d06-*.test.ts).
 */
import { describe, expect, it } from 'vitest';
import { DEG } from '../src/physics/constants';
import {
  SATELLITE_FIELDS, designDateJd, designFigures, designFromTemplate, designHandoff, withChoice, withSso, withValue,
} from '../src/design/satellite-model';
import { lifetimeSpacecraft } from '../src/design/satellite-area';
import { designOrbit } from '../src/design/satellite-handoff';
import {
  DESIGN_WINDOW_DAYS, designLessonStart, designLifetimeRequest, designValuesNow, lifetimeHorizon,
} from '../src/design/design-lesson-key';
import { contactTime, revisitGaps } from '../src/orbit/coverage';
import { STATIONS } from '../src/orbit/applications-setup';
import { YEAR } from '../src/orbit/disposal';
import { levelActivity } from '../src/orbit/satellite-air';
import { lifetimeNow } from '../src/orbit/lifetime-now';
import { propagate } from '../src/physics/propagator/propagate';
import {
  DESIGN_LOCK_KEYS, DESIGN_MEASURE_IDS, DESIGN_MEASURES, brokenDesignLocks, designLessonOptions, gradeDesign, lockGroupKeys,
} from '../src/lessons/design-lesson';
import { isDesignDate, lessonFileText, lessonFileVersion, parseLessonFile, readDesignLesson, type FileIssue } from '../src/lessons/lesson-file';
import { designRecord } from '../src/lessons/progress';
import { boundDigits, designValueText } from '../src/ui/lessons/design-text';
import type { DesignCriterion, DesignKey, DesignLesson, DesignMeasureId } from '../src/lessons/types';
import type { SatelliteDesign } from '../src/design/satellite-spec';
import type { MissionRequirements } from '../src/design/requirements';

const DATE = '2026-10-01';
const JD = designDateJd(DATE)!;
const napa = designFromTemplate('napa2', 'n', 'NAPA-2');
const theos = designFromTemplate('theos2', 't', 'THEOS-2');
const at = (d: SatelliteDesign, path: string, v: number): SatelliteDesign => withValue(d, path, v);
const BANGKOK: MissionRequirements = {
  target: { lat: 13.7563, lon: 100.5018, name: 'Bangkok' }, gsd: 5, revisitDays: 7, daylightOnly: true, lifeYears: 3, activity: 'moderate',
  dataPerDay: 5e9, stations: ['bangkok'], minElDeg: 10, disposal: '25y',
};

/** A lesson with the criteria given, on NAPA-2, nothing locked. */
function lesson(criteria: DesignCriterion[], more: Partial<DesignLesson> = {}): DesignLesson {
  return {
    kind: 'design', id: 'class-design', track: 9, order: 1, mode: 'explore', domains: [6], title: { en: 'A design' }, brief: { en: 'Design it.' },
    start: { template: 'napa2' }, designDate: DATE, level: 'moderate', locked: [], criteria, hints: [], ...more,
  };
}

/** The key the page and the re-check build for a design. */
function keyFor(l: DesignLesson, design: SatelliteDesign): DesignKey {
  return { ...designValuesNow(design, designLessonOptions(l), lifetimeNow), lockBroken: brokenDesignLocks(l.locked, designLessonStart(l.start), design) };
}

describe('the design lesson kind (T01)', () => {
  it('locks every number the model lets a student type, its menus, its switch and whether it has an engine or a camera', () => {
    const want = new Set([...SATELLITE_FIELDS.map((f) => f.path), 'orbit.sso', 'power.mount', 'power.regulation', 'adcs.mode', 'comms.station', 'propulsion', 'payload']);
    expect(new Set(DESIGN_LOCK_KEYS)).toEqual(want);
    expect(DESIGN_LOCK_KEYS.length).toBe(want.size);
    // the writer's groups cover them all, once each (the orbit's take the design life)
    const grouped = (['orbit', 'bus', 'power', 'propulsion', 'adcs', 'comms', 'payload'] as const).flatMap(lockGroupKeys);
    expect(new Set(grouped)).toEqual(want);
    expect(grouped.length).toBe(want.size);
  });

  it('reads a design date as the satellite model does', () => {
    for (const v of ['2026-10-01', '2024-02-29', '2026-02-29', '1957-10-04', '1956-12-31', '2200-12-31', '2201-01-01', '2026-13-01', '26-10-01', '', ' 2026-10-01']) {
      expect(isDesignDate(v), v).toBe(designDateJd(v) !== null);
    }
    expect(isDesignDate(null)).toBe(false);
  });

  it('gives every measure a unit and a kind', () => {
    expect(DESIGN_MEASURE_IDS).toHaveLength(14);
    expect(DESIGN_MEASURE_IDS).toContain('sat.torquerDipole');
    for (const m of DESIGN_MEASURE_IDS) expect(['closed', 'eclipse', 'revisit', 'contact', 'lifetime', 'flag']).toContain(DESIGN_MEASURES[m].kind);
  });
});

describe('a design\'s figures (one number, one way)', () => {
  it('are the satellite model\'s, in the measures\' units, exactly', () => {
    for (const d of [napa, theos]) {
      const fig = designFigures(d, JD, { level: 'high' });
      const v = designValuesNow(d, { date: DATE, level: 'high', measures: [] }, lifetimeNow).values;
      expect(v['sat.mass']).toBe(fig.mass.wet.value);
      expect(v['sat.eclipseMax']).toBe(fig.eclipse.worst.value / 60);
      expect(v['sat.powerMargin']).toBe(fig.power.margin!.value * 100);
      expect(v['sat.batteryDod']).toBe(fig.power.depth.value * 100);
      expect(v['sat.dvMargin']).toBe(fig.dv.margin.value);
      expect(v['sat.linkMargin']).toBe(fig.link.margin.value);
      expect(v['sat.gsd']).toBe(fig.camera!.gsd.value);
      expect(v['sat.swath']).toBe(fig.camera!.swath!.value / 1000);
      expect(v['sat.wheelMargin']).toBe(fig.attitude.wheelMargin!.value);
      expect(v['sat.torquerDipole']).toBe(fig.attitude.torquerDipole.value);
      // the costly ones only when a criterion asks
      for (const m of ['sat.revisitMax', 'sat.dataPerDay', 'sat.lifetime', 'sat.disposal25y'] as const) expect(m in v, m).toBe(false);
    }
  });

  it('read the revisit and the data a day off the D07 cores, on the design\'s orbit, over the window', () => {
    const wide = at(napa, 'payload.focalLength', 0.05);
    const v = designValuesNow(wide, { date: DATE, level: 'moderate', measures: ['sat.revisitMax', 'sat.dataPerDay'], requirements: BANGKOK }, lifetimeNow).values;
    const fig = designFigures(wide, JD, { level: 'moderate' });
    const o = designOrbit(wide.orbit, JD);
    const rv = revisitGaps(o, { lat: BANGKOK.target.lat * DEG, lon: BANGKOK.target.lon * DEG, h: 0 }, fig.camera!.swath!.value / 2, JD, DESIGN_WINDOW_DAYS, true);
    expect(rv.looks.length).toBeGreaterThan(2);
    expect(v['sat.revisitMax']).toBe(Math.max(rv.maxGap, rv.firstAfter, rv.lastBefore));
    const st = STATIONS.find((s) => s.id === wide.comms.station)!;
    const heard = contactTime(o, [{ lat: st.lat * DEG, lon: st.lon * DEG, h: 0 }], wide.comms.minElDeg * DEG, JD, DESIGN_WINDOW_DAYS);
    expect(heard.passes.length).toBeGreaterThan(10);
    expect(v['sat.dataPerDay']).toBe((heard.perDay * wide.comms.dataRate) / 1e9);
    // a link without margin brings nothing down
    const deaf = at(napa, 'comms.txPowerW', 0.001);
    expect(designValuesNow(deaf, { date: DATE, level: 'moderate', measures: ['sat.dataPerDay'] }, lifetimeNow).values['sat.dataPerDay']).toBe(0);
  });

  it('fly the satellite bench\'s lifetime run, field by field', () => {
    // (moderate, where NAPA-2 comes down within the run; the first run asked at ECSS low, where it is still up
    // after 28 years and the run's answer is null: a premise changed after the first run, no bound)
    const req = designLifetimeRequest(napa, JD, 'moderate', napa.lifeYears + 25)!;
    const h = designHandoff(napa, JD, 'x')!;
    expect(req).toEqual({
      r0: h.r, v0: h.v, jd0: h.jd,
      options: {
        method: 'mean', duration: (napa.lifeYears + 25) * YEAR,
        forces: { j2: true, j3j4: true, drag: true, sun: false, moon: false, srp: false, activity: levelActivity('moderate') },
        spacecraft: lifetimeSpacecraft(napa), samples: 600, tolerance: 1e-9,
      },
    });
    const v = designValuesNow(napa, { date: DATE, level: 'moderate', measures: ['sat.lifetime'] }, lifetimeNow);
    expect(v.values['sat.lifetime']).toBe(propagate(req.r0, req.v0, req.jd0, req.options).lifetime! / YEAR);
    expect(v.lifetimeCapped).toBeUndefined();
  });

  it('say how long a satellite still up at the run\'s end lasts at least, and fly past every bound on it', () => {
    expect(lifetimeHorizon(napa)).toBe(napa.lifeYears + 25);
    expect(lifetimeHorizon(napa, 10)).toBe(napa.lifeYears + 25);
    expect(lifetimeHorizon(napa, 40.5)).toBe(42);
    const high = at(at(napa, 'orbit.perigee', 800e3), 'orbit.apogee', 800e3);
    const v = designValuesNow(high, { date: DATE, level: 'moderate', measures: ['sat.lifetime', 'sat.disposal25y'] }, lifetimeNow);
    expect(v.lifetimeCapped).toBe(true);
    expect(v.values['sat.lifetime']).toBe(high.lifeYears + 25);
    expect(v.values['sat.disposal25y']).toBe(0);
    expect(v.disposalLimit).toBe(high.lifeYears + 25);
    // the bound decides the run: a lesson that asks for 40 years flies 41
    const l = lesson([{ id: 'c1', kind: 'design', measure: 'sat.lifetime', min: 40 }]);
    expect(designLessonOptions(l).lifetimeBound).toBe(40);
  });

  it('refuse a design the checker refuses, and fail every criterion on it', () => {
    const bad = at(napa, 'power.cellEff', 29.5);
    const l = lesson([{ id: 'c1', kind: 'design', measure: 'sat.mass', max: 100 }]);
    const key = keyFor(l, bad);
    expect(key.refused).toBe(true);
    expect(gradeDesign(l, key).verdict).toBe('fail');
  });
});

/**
 * For each measure, a design that passes the criterion and one that fails
 * it, differing in one physical way (the premise beside each). Fixed before
 * the first run.
 */
const PAIRS: ReadonlyArray<{ m: DesignMeasureId; bound: Partial<Record<'min' | 'max' | 'target' | 'tol', number>>; pass: SatelliteDesign; fail: SatelliteDesign; req?: MissionRequirements; why: string }> = [
  { m: 'sat.mass', bound: { max: 11 }, pass: napa, fail: at(napa, 'bus.dryMass', 12), why: 'a 12 kg bus is heavier than 11 kg' },
  { m: 'sat.eclipseMax', bound: { max: 30 }, pass: at(napa, 'orbit.ltan', 6), fail: napa,
    why: 'a dawn–dusk plane rides the terminator; NAPA-2\'s 22:30 node crosses the shadow for some 35 min' },
  { m: 'sat.powerMargin', bound: { min: 10 }, pass: at(napa, 'power.arrayArea', 0.08), fail: napa, why: 'NAPA-2 has +6.8 %; 0.08 m² of cells gives some +26 %' },
  { m: 'sat.batteryDod', bound: { max: 20 }, pass: napa, fail: at(napa, 'power.batteryWh', 20), why: 'half the battery is drained twice as deep: 13 % → 26 %' },
  { m: 'sat.dvMargin', bound: { min: 0 }, pass: theos, fail: at(theos, 'propulsion.propellant', 1), why: 'THEOS-2\'s tanks hold its budget; 1 kg of hydrazine does not' },
  { m: 'sat.linkMargin', bound: { min: 3 }, pass: napa, fail: at(napa, 'comms.txPowerW', 0.1), why: 'a tenth of the power is 10 dB less: 8.4 → −1.6 dB' },
  { m: 'sat.dataPerDay', bound: { min: 5 }, pass: napa, fail: at(napa, 'comms.dataRate', 1e6), why: '12.5 Mbit/s over its passes a day, against 1 Mbit/s' },
  { m: 'sat.gsd', bound: { max: 5 }, pass: napa, fail: at(napa, 'payload.focalLength', napa.payload!.focalLength / 2), why: 'half the focal length, twice the ground sample' },
  { m: 'sat.swath', bound: { min: 15 }, pass: napa, fail: at(napa, 'payload.pixels', napa.payload!.pixels / 2), why: 'half the pixels across, half the swath' },
  // changed after the first two runs, premise and bound (a construction, not a validation): a 5 cm lens's 235 km
  // swath waits 10 days at Bangkok by day, and a 1 cm lens's 1 241 km one sees it daily but for a 6-day hole a week
  { m: 'sat.revisitMax', bound: { max: 7 }, pass: at(napa, 'payload.focalLength', 0.01), fail: napa, req: BANGKOK,
    why: 'a 1 cm lens\'s 1 241 km swath sees Bangkok by day at least once a week; NAPA-2\'s 20 km swath not once in 30 days' },
  { m: 'sat.lifetime', bound: { min: 5 }, pass: napa, fail: at(at(napa, 'orbit.perigee', 400e3), 'orbit.apogee', 420e3), why: 'NAPA-2 lasts some 6.8 years from 520 × 540 km; from 400 × 420 km about one' },
  { m: 'sat.wheelMargin', bound: { min: 1 }, pass: napa, fail: at(napa, 'adcs.wheelH', 1e-5), why: 'a wheel of 10 µN·m·s holds less than the torques build up' },
  { m: 'sat.disposal25y', bound: { min: 1 }, pass: napa, fail: at(at(napa, 'orbit.perigee', 800e3), 'orbit.apogee', 800e3), why: 'down in some 7 years from 530 km; still up after 28 from 800 km' },
  { m: 'sat.torquerDipole', bound: { max: 0.05 }, pass: napa, fail: at(napa, 'adcs.residualDipole', 0.1), why: 'a residual dipole of 0.1 A·m² takes a torquer at least as strong' },
];

describe('grading a design (gradeDesign)', () => {
  it.each(PAIRS.map((p) => [p.m, p] as const))('passes and fails %s', (_m, p) => {
    const l = lesson([{ id: 'c1', kind: 'design', measure: p.m, ...p.bound }], p.req ? { requirements: p.req } : {});
    const pass = gradeDesign(l, keyFor(l, p.pass));
    const fail = gradeDesign(l, keyFor(l, p.fail));
    expect(pass.final).toBe(true);
    expect([pass.verdict, fail.verdict], `${p.why}: ${pass.criteria[0].value} / ${fail.criteria[0].value}`).toEqual(['pass', 'fail']);
    expect(pass.criteria[0].value).not.toBeNull();
  }, 60_000);

  it('takes a target and a tolerance', () => {
    const l = lesson([{ id: 'c1', kind: 'design', measure: 'sat.mass', target: 10.5, tol: 0.5 }]);
    expect(gradeDesign(l, keyFor(l, napa)).verdict).toBe('pass');
    expect(gradeDesign(l, keyFor(l, at(napa, 'bus.dryMass', 11.01))).verdict).toBe('fail');
  });

  it('checks a typed answer against the design\'s own figure, and passes one shown only with help', () => {
    const l = lesson([{ id: 'c1', kind: 'answer', measure: 'sat.eclipseMax', tol: 0.5, prompt: { en: 'Longest eclipse (min)' } }]);
    const key = keyFor(l, napa);
    const e = key.values['sat.eclipseMax']!;
    expect(gradeDesign(l, key).verdict).toBe('open');
    expect(gradeDesign(l, key).criteria[0]).toMatchObject({ state: 'pending', expected: e });
    expect(gradeDesign(l, key, { c1: e + 0.4 }).verdict).toBe('pass');
    expect(gradeDesign(l, key, { c1: e + 0.6 }).verdict).toBe('fail');
    expect(gradeDesign(l, key, { c1: e }, { c1: [e] }).verdict).toBe('passedWithHelp');
  });

  it('fails a design that changed a locked part, but lets a sun-synchronous inclination follow the height', () => {
    const l = lesson([{ id: 'c1', kind: 'design', measure: 'sat.mass', max: 100 }], { locked: [...lockGroupKeys('orbit'), 'power.payloadW', 'propulsion'] });
    expect(gradeDesign(l, keyFor(l, at(napa, 'power.arrayArea', 0.1))).verdict).toBe('pass');
    const moved = gradeDesign(l, keyFor(l, at(napa, 'power.payloadW', 1)));
    expect([moved.verdict, moved.lockBroken]).toEqual(['fail', ['power.payloadW']]);
    expect(keyFor(l, withChoice(napa, 'station', 'moscow')).lockBroken).toEqual([]);
    const free = lesson([{ id: 'c1', kind: 'design', measure: 'sat.mass', max: 100 }], { locked: ['orbit.inclination'] });
    // the height freed, the locked inclination follows it (the model's SSO inclination), and is kept
    expect(keyFor(free, at(napa, 'orbit.perigee', 500e3)).lockBroken).toEqual([]);
    expect(keyFor(free, withSso(napa, false)).lockBroken).toEqual([]);
    expect(keyFor(free, at(withSso(napa, false), 'orbit.inclination', 45)).lockBroken).toEqual(['orbit.inclination']);
  });
});

describe('a figure shown beside its bound (the strip)', () => {
  it('is shown to as many decimals as keep it on the side of the bound it was graded on', () => {
    const min10 = { id: 'c1', kind: 'design' as const, measure: 'sat.powerMargin' as const, min: 10 };
    // NAPA-2 with 0.07 m² of cells: 9.957 %, a fail, never shown as "10 %"
    const margin = designValuesNow(at(napa, 'power.arrayArea', 0.07), { date: DATE, level: 'moderate', measures: [] }, lifetimeNow).values['sat.powerMargin']!;
    const l = lesson([min10]);
    expect(gradeDesign(l, keyFor(l, at(napa, 'power.arrayArea', 0.07))).verdict).toBe('fail');
    expect(boundDigits(min10, margin)).toBe(2);
    expect(designValueText('sat.powerMargin', margin, { digits: boundDigits(min10, margin) })).toBe('9.96\u00a0%');
    // far from the bound, the measure's own decimals
    expect(boundDigits(min10, 25.665)).toBe(1);
    expect(boundDigits({ id: 'c', kind: 'design', measure: 'sat.mass', max: 11 }, 11.004)).toBe(3);
    expect(boundDigits({ id: 'c', kind: 'design', measure: 'sat.mass', target: 10.5, tol: 0.5 }, 10.9999)).toBe(2);
    expect(boundDigits({ id: 'c', kind: 'design', measure: 'sat.mass', target: 10.5, tol: 0.5 }, 11.0001)).toBe(4);
  });
});

describe('the lesson file (T01)', () => {
  const full = lesson([
    { id: 'c1', kind: 'design', measure: 'sat.powerMargin', min: 10 },
    { id: 'c2', kind: 'answer', measure: 'sat.eclipseMax', tol: 0.5, prompt: { en: 'Eclipse (min)', ru: 'Тень (мин)', th: 'อุปราคา (นาที)' } },
  ], { requirements: BANGKOK, locked: ['orbit.perigee', 'payload'], title: { en: 'A design', ru: 'Проект', th: 'แบบ' }, brief: { en: 'Design it.', ru: 'Спроектируйте.', th: 'ออกแบบ' } });

  it('writes a design lesson as version 3 and reads it back as it was, byte for byte', () => {
    expect(lessonFileVersion([full])).toBe(3);
    const first = parseLessonFile(JSON.parse(lessonFileText([full])), new Set());
    expect(first.issues).toEqual([]);
    expect(first.lessons).toEqual([full]);
    // the reader's own order of fields, written once, reads back and writes again the same
    const text = lessonFileText(first.lessons);
    expect(lessonFileText(parseLessonFile(JSON.parse(text), new Set()).lessons)).toBe(text);
    // a design of the file's own, too
    const own = { ...full, start: { design: at(napa, 'power.arrayArea', 0.09) } };
    expect(parseLessonFile(JSON.parse(lessonFileText([own])), new Set()).lessons).toEqual([own]);
  });

  it('refuses what no copy of the app could grade, and names it', () => {
    const refused = (edit: Record<string, unknown>): string[] => {
      const issues: FileIssue[] = [];
      const read = readDesignLesson({ ...JSON.parse(JSON.stringify(full)), ...edit }, 'x', issues);
      expect(read).toBeNull();
      return issues.filter((i) => i.level === 'error').map((i) => `${i.code}:${i.detail ?? ''}`);
    };
    expect(refused({ start: { template: 'nope' } })).toEqual(['invalid:template']);
    expect(refused({ start: { design: { ...napa, power: { ...napa.power, cellEff: 29.5 } } } })[0]).toMatch(/^invalid:power\.cellEff/);
    expect(refused({ designDate: '2026-02-30' })).toEqual(['invalid:designDate']);
    // the measured series is never a lesson's: a grade must come out the same later
    expect(refused({ level: 'measured' })).toEqual(['invalid:level']);
    expect(refused({ criteria: [{ id: 'c1', kind: 'design', measure: 'sat.nope', min: 1 }] })).toEqual(['invalid:measure']);
    expect(refused({ criteria: [{ id: 'c1', kind: 'design', measure: 'sat.mass' }] })).toEqual(['missing:bound']);
    expect(refused({ criteria: [{ id: 'c1', kind: 'answer', measure: 'sat.mass', prompt: { en: 'm' } }] })).toEqual(['missing:tol']);
    expect(refused({ criteria: [{ id: 'c1', kind: 'measure', measure: 'sat.mass', min: 1 }] })).toEqual(['invalid:kind']);
    expect(refused({ requirements: undefined, criteria: [{ id: 'c1', kind: 'design', measure: 'sat.revisitMax', max: 3 }] })).toEqual(['missing:requirements']);
    expect(refused({ requirements: { ...BANGKOK, stations: ['atlantis'] } })).toEqual(['invalid:stations']);
  });

  it('keeps a lock it does not know out, with a warning, and warns of a flight lesson\'s fields', () => {
    const issues: FileIssue[] = [];
    const read = readDesignLesson({ ...JSON.parse(JSON.stringify(full)), locked: ['orbit.perigee', 'warp.drive'], mission: {} }, 'x', issues);
    expect(read?.locked).toEqual(['orbit.perigee']);
    expect(issues.map((i) => `${i.level}:${i.code}`)).toEqual(['warn:invalid', 'warn:invalid']);
  });
});

describe('the record of a design handed in (T01, T02)', () => {
  it('keeps the design, the day, the air and the figures, as JSON keeps them', () => {
    const l = lesson([{ id: 'c1', kind: 'design', measure: 'sat.powerMargin', min: 10 }]);
    const key = keyFor(l, napa);
    const grade = gradeDesign(l, key);
    const rec = designRecord({ at: new Date(Date.UTC(2026, 9, 1, 8)), grade, answers: {}, hintsShown: 1, design: napa, designDate: DATE, level: 'moderate', figures: key.values, app: '0.1.0+x' });
    expect(rec).toMatchObject({ verdict: 'fail', design: napa, designDate: DATE, level: 'moderate', app: '0.1.0+x', hintsShown: 1 });
    expect(rec.figures!['sat.powerMargin']).toBe(key.values['sat.powerMargin']);
    expect(JSON.parse(JSON.stringify(rec))).toEqual(rec);
    expect(rec.mission).toBeUndefined();
  });
});
