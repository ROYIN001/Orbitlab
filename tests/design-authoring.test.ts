/**
 * The scenario writer's design lessons (roadmap T01, map §4.1; the writer is
 * src/lessons/authoring.ts `draftDesignLesson`): the design on the satellite
 * bench, with its design date and level, plus the form's locks and criteria,
 * written and read back through the lesson-file reader — what the page saves
 * is what every copy of the app reads — and refused where no student could
 * pass it. Exact constructions, fixed before the first run.
 */
import { describe, expect, it } from 'vitest';
import { designFromTemplate, withValue } from '../src/design/satellite-model';
import { designLessonStart, designValuesNow } from '../src/design/design-lesson-key';
import { lifetimeNow } from '../src/orbit/lifetime-now';
import { WRITER_DESIGN_MEASURES, draftDesignLesson, newDesignDraft, type DesignDesk, type DesignLessonDraft } from '../src/lessons/authoring';
import { brokenDesignLocks, designLessonOptions, gradeDesign, lockGroupKeys } from '../src/lessons/design-lesson';
import { lessonFileText, lessonFileVersion, parseLessonFile } from '../src/lessons/lesson-file';
import type { DesignLesson } from '../src/lessons/types';
import type { SatelliteDesign } from '../src/design/satellite-spec';

const napa = designFromTemplate('napa2', 's1', 'My NAPA-2');
const desk: DesignDesk = { design: napa, date: '2026-11-15', level: 'high' };
const text = (en: string, ru = '', th = '') => ({ en, ru, th });

function draft(more: Partial<DesignLessonDraft> = {}): DesignLessonDraft {
  return {
    ...newDesignDraft('class-power-up'), title: text('Power up', 'Мощность', 'กำลังไฟ'), brief: text('More power.', 'Больше мощности.', 'เพิ่มกำลังไฟ'),
    lockGroups: ['orbit', 'bus', 'comms'],
    criteria: [
      { kind: 'design', measure: 'sat.powerMargin', min: 15 },
      { kind: 'design', measure: 'sat.mass', target: 10, tol: 0.5 },
      { kind: 'answer', measure: 'sat.eclipseMax', tolPct: 3, prompt: text('Eclipse (min)', 'Тень (мин)', 'อุปราคา (นาที)') },
    ],
    ...more,
  };
}

const grade = (l: DesignLesson, d: SatelliteDesign, answers: Record<string, number> = {}) => {
  const key = { ...designValuesNow(d, designLessonOptions(l), lifetimeNow), lockBroken: brokenDesignLocks(l.locked, designLessonStart(l.start), d) };
  return { key, grade: gradeDesign(l, key, answers) };
};

describe('the scenario writer\'s design lessons (T01)', () => {
  // added when T03 met T01: a pack lesson's id is refused for a design lesson too, as for a flight lesson (tests/lesson-pack-format.test.ts)
  it('refuses a lesson pack\'s id as it refuses a built-in one', () => {
    const reserved = new Set(['ipst-b-forces']);
    const taken = draftDesignLesson(draft({ id: 'ipst-b-forces' }), desk, reserved);
    expect(taken.lesson).toBeNull();
    expect(taken.issues.filter((i) => i.level === 'error').map((i) => `${i.code} ${i.detail}`)).toEqual(['pack ipst-b-forces']);
    expect(draftDesignLesson(draft(), desk, reserved).lesson?.id).toBe('class-power-up');
  });

  it('writes the bench\'s design, its date and level, the groups locked and the criteria, as a version-3 file that reads back byte for byte', () => {
    const { lesson, issues } = draftDesignLesson(draft(), desk);
    expect(issues).toEqual([]);
    expect(lesson).not.toBeNull();
    const l = lesson!;
    expect([l.kind, l.id, l.track, l.designDate, l.level, l.mode]).toEqual(['design', 'class-power-up', 9, '2026-11-15', 'high', 'explore']);
    expect(l.start).toEqual({ design: napa });
    expect(l.locked).toEqual([...lockGroupKeys('orbit'), ...lockGroupKeys('bus'), ...lockGroupKeys('comms')]);
    expect(l.criteria.map((c) => [c.id, c.kind, c.measure])).toEqual([['c1', 'design', 'sat.powerMargin'], ['c2', 'design', 'sat.mass'], ['c3', 'answer', 'sat.eclipseMax']]);
    expect(lessonFileVersion([l])).toBe(3);
    const file = lessonFileText([l]);
    const back = parseLessonFile(JSON.parse(file), new Set());
    expect(back.issues).toEqual([]);
    expect(back.lessons).toEqual([l]);
    expect(lessonFileText(back.lessons)).toBe(file);
  });

  it('writes a lesson that grades the bench\'s design as it stands, and a better one', () => {
    const l = draftDesignLesson(draft(), desk).lesson!;
    const start = grade(l, napa);
    const e = start.key.values['sat.eclipseMax']!;
    expect(grade(l, napa, { c3: e }).grade.verdict).toBe('fail');
    expect(grade(l, withValue(napa, 'power.arrayArea', 0.08), { c3: e * 1.02 }).grade.verdict).toBe('pass');
    // the locks hold the groups ticked: a change of station breaks the radio's
    expect(grade(l, { ...napa, comms: { ...napa.comms, station: 'moscow' } }).key.lockBroken).toEqual(['comms.station']);
  });

  it('refuses what no student could pass, and a built-in lesson\'s id', () => {
    const refused = (d: DesignLessonDraft) => {
      const r = draftDesignLesson(d, desk);
      expect(r.lesson).toBeNull();
      return r.issues.filter((i) => i.level === 'error').map((i) => `${i.code}:${i.detail ?? ''}`);
    };
    expect(refused(draft({ criteria: [{ kind: 'design', measure: 'sat.mass', min: 12, max: 11 }] }))).toEqual(['invalid:range']);
    expect(refused(draft({ criteria: [{ kind: 'design', measure: 'sat.mass', target: 10, tol: -1 }] }))).toContain('invalid:negative');
    expect(refused(draft({ id: 'orbit-first' }))).toEqual(['builtinId:orbit-first']);
    expect(refused(draft({ criteria: [] }))).toEqual(['missing:']);
    // a design the checker refuses cannot start a lesson
    const bad = draftDesignLesson(draft(), { ...desk, design: withValue(napa, 'power.cellEff', 29.5) });
    expect(bad.lesson).toBeNull();
    expect(bad.issues.find((i) => i.level === 'error')?.where).toMatch(/start\.design$/);
  });

  it('says a text stood in for English, and offers every measure but the revisit', () => {
    const { lesson, issues } = draftDesignLesson(draft({ title: text('', 'Мощность', 'กำลังไฟ') }), desk);
    expect(lesson?.title.en).toBe('Мощность');
    expect(issues.map((i) => `${i.where}:${i.detail}`)).toEqual(['title:en=ru']);
    expect(WRITER_DESIGN_MEASURES).toHaveLength(13);
    expect(WRITER_DESIGN_MEASURES).not.toContain('sat.revisitMax');
  });
});
