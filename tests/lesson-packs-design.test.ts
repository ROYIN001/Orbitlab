/**
 * The lesson packs' design lessons (roadmap T03b; the T03 research's B6, P5,
 * P6, R6 and S6, written on T01's design kind): each is read from its
 * committed pack file, fixes its design date and ECSS level in the file,
 * locks all but the parts it names, and is graded through `gradeDesign` on the
 * D06 model's figures (`designValuesNow`; none asks for the lifetime, so no
 * run is flown). The worked solution passes every criterion with the answers
 * a student works out from the figures the bench shows; the start design
 * fails, and so do a wrong change and a change that breaks a lock.
 *
 * Bounds and tolerances are the lessons' own, fixed in the pack sources
 * before this file was first run (2026-10-01):
 * - B6 link margin ≥ 3 dB (the research's) and the typed margin ± 0.2 dB;
 * - P5 the dipole needed ≤ the example coil's NIA/3 = 0.02 A·m² (Starin &
 *   Eterno's 3–10 times, the lowest) and the typed D ± 5 %;
 * - P6 power margin ≥ 0 % (the research's), battery depth ≤ 30 % (the
 *   template's flown 30 %, where the research named DOD_GUIDANCE's 40 %: the
 *   design's own allowed depth is 30 %, and a 40 % bound would pass designs
 *   the designer warns about) and the eclipse ± 1 min;
 * - R6 wheel over need ≥ 1 and link ≥ 3 dB (the research's), the typed ratio
 *   ± 5 %;
 * - S6 wheel over need in [1, 2] (the research's ≥ 1, and the choice of the
 *   smallest wheel that is enough from a doubling series) and the typed D and
 *   ratio ± 5 %.
 * The worked designs — 100 W; a 0.01 A·m² residual dipole; 6.5 m² of cells
 * and 1 800 Wh; 0.01 A·m² and a 10 cm dish; an 8 N·m·s wheel — were chosen
 * from a probe of the model's figures before this file was written; the
 * figures the tests read are the model's, never tuned to them.
 */
import { describe, expect, it } from 'vitest';
import { designDateJd, designFigures, withValue, type SatelliteFigures } from '../src/design/satellite-model';
import { designOrbit } from '../src/design/satellite-handoff';
import { designLessonStart, designValuesNow } from '../src/design/design-lesson-key';
import { lifetimeNow } from '../src/orbit/lifetime-now';
import { stateAt } from '../src/orbit/kepler';
import { elevationOf } from '../src/orbit/coverage';
import { STATIONS } from '../src/orbit/applications-setup';
import { DEG } from '../src/physics/constants';
import { DESIGN_LOCK_KEYS, brokenDesignLocks, designLessonOptions, gradeDesign } from '../src/lessons/design-lesson';
import { BUNDLED_PACKS, packLessons, packPath, readPackText, type ResolvedPack } from '../src/lessons/packs';
import { designRecord } from '../src/lessons/progress';
import { checkRecord } from '../src/lessons/recheck';
import { allLessons } from '../src/lessons/catalog';
import { isDesignLesson, type DesignKey, type DesignLesson, type LessonGrade } from '../src/lessons/types';
import type { SatelliteDesign } from '../src/design/satellite-spec';

const FILES = import.meta.glob('../public/lessons/packs/*.json', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
const PACKS: ResolvedPack[] = BUNDLED_PACKS.map((id) => readPackText(FILES[`../public/${packPath(id)}`], packPath(id))!);

/** A pack's design lesson as the app reads it: from the committed file. */
const lesson = (id: string): DesignLesson => {
  const l = packLessons(PACKS).find((x) => x.id === id);
  if (!l || !isDesignLesson(l)) throw new Error(`no design lesson ${id}`);
  return l;
};

/** The design's key as the page builds it: the model's figures on the lesson's day, and the locks it broke. */
const keyFor = (l: DesignLesson, d: SatelliteDesign): DesignKey => ({
  ...designValuesNow(d, designLessonOptions(l), lifetimeNow), lockBroken: brokenDesignLocks(l.locked, designLessonStart(l.start), d),
});
const grade = (l: DesignLesson, d: SatelliteDesign, answers: Record<string, number> = {}): LessonGrade => gradeDesign(l, keyFor(l, d), answers);
const states = (g: LessonGrade): Record<string, string> => Object.fromEntries(g.criteria.map((c) => [c.id, c.state]));
const figures = (l: DesignLesson, d: SatelliteDesign): SatelliteFigures => designFigures(d, designDateJd(l.designDate)!, { level: l.level });
/** A number as the bench prints a torque or a field: three significant figures. */
const shown = (v: number): number => Number(v.toPrecision(3));
/** Many changes at once, as a student types them. */
const set = (d: SatelliteDesign, changes: Record<string, number>): SatelliteDesign =>
  Object.entries(changes).reduce((x, [path, v]) => withValue(x, path, v), d);

describe('the packs\' design lessons (T03b)', () => {
  it('are B6, P5, P6, R6 and S6 in their packs, each fixing its day and air in the file and locking all but what it names', () => {
    const free = (l: DesignLesson) => DESIGN_LOCK_KEYS.filter((k) => !l.locked.includes(k));
    const expected: Array<[string, string, string, string[]]> = [
      ['ipst-basic', 'ipst-b-thaicom-link', 'explore', ['comms.txPowerW']],
      ['ipst-physics', 'ipst-p-magnetorquer', 'engineer', ['adcs.residualDipole', 'adcs.cpOffset']],
      ['ipst-physics', 'ipst-p-solar-power', 'explore', ['power.arrayArea', 'power.batteryWh']],
      ['rtaf-academy', 'rtaf-6u-adcs', 'engineer', ['adcs.residualDipole', 'adcs.cpOffset', 'comms.txAntennaD']],
      ['ru-24-05-06', 'ru-ka-oss', 'engineer', ['adcs.wheelH']],
    ];
    for (const [pack, id, mode, parts] of expected) {
      const l = lesson(id);
      expect(PACKS.find((p) => p.pack.id === pack)!.items.some((i) => i.lesson === l), id).toBe(true);
      expect([l.designDate, l.level, l.mode], id).toEqual(['2026-10-01', 'moderate', mode]);
      expect(free(l), id).toEqual(parts);
      expect(l.curriculum?.length, id).toBeGreaterThan(0);
    }
    expect(packLessons(PACKS).filter(isDesignLesson).map((l) => l.id)).toEqual(expected.map((e) => e[1]));
  });

  it('B6 a TV signal from 36 000 km: the satellite stands over 119.5° E, seen from Bangkok; 20 W fails, 100 W passes with the margin worked in decibels', () => {
    const l = lesson('ipst-b-thaicom-link');
    const start = designLessonStart(l.start);
    // where the brief says it is: over 119.5° E on the lesson's day, high in Bangkok's sky
    const jd = designDateJd(l.designDate)!;
    const o = designOrbit(start.orbit, jd);
    expect(stateAt(o, 0, true).lon / DEG).toBeCloseTo(119.5, 2);
    const bkk = STATIONS.find((s) => s.id === 'bangkok')!;
    expect(elevationOf(o, { lat: bkk.lat * DEG, lon: bkk.lon * DEG, h: 0 }, jd) / DEG).toBeGreaterThan(60);
    // the beam about 4° wide, as the brief says
    expect(figures(l, start).link.beamwidth!.value / DEG).toBeCloseTo(3.89, 2);
    const s0 = grade(l, start);
    expect(states(s0)).toEqual({ margin: 'fail', worked: 'pending' });
    const m0 = s0.criteria[0].value!;
    expect(m0).toBeLessThan(0);
    // the student's working: the 20 W margin as the strip shows it, plus 10·log₁₀(P/20 W)
    const solved = withValue(start, 'comms.txPowerW', 100);
    const worked = Number(m0.toFixed(2)) + 10 * Math.log10(100 / 20);
    const g = grade(l, solved, { worked });
    expect(g.verdict, JSON.stringify(g)).toBe('pass');
    // half that power is not enough; buying the margin with a slower stream breaks the lock on the data rate
    expect(grade(l, withValue(start, 'comms.txPowerW', 50), { worked: 0.9 }).verdict).toBe('fail');
    // (a fifth of the rate, +7 dB: the first run tried a quarter, +6.02 dB, which leaves 2.92 dB and fails on its own)
    const slower = grade(l, withValue(start, 'comms.dataRate', 6e6), { worked: m0 + 7 });
    expect(slower.criteria[0].state).toBe('pass');
    expect([slower.verdict, slower.lockBroken]).toEqual(['fail', ['comms.dataRate']]);
    // a margin worked as if the power added linearly (5 × −3.1 dB) is wrong
    expect(states(grade(l, solved, { worked: 5 * m0 })).worked).toBe('fail');
  }, 60_000);

  it('P5 a coil that turns a satellite: NAPA-2 needs more than a third of the coil\'s NIA; halving the residual dipole passes, centring the pressure does not', () => {
    const l = lesson('ipst-p-magnetorquer');
    expect(l.criteria[0]).toMatchObject({ kind: 'design', measure: 'sat.torquerDipole', max: 0.02 });
    const start = designLessonStart(l.start);
    expect(states(grade(l, start)).torquer).toBe('fail');
    const solved = withValue(start, 'adcs.residualDipole', 0.01);
    // D = T/B from the bench's rows, as printed
    const f = figures(l, solved);
    const need = shown(f.attitude.total.value) / shown(f.attitude.field.value);
    const g = grade(l, solved, { need });
    expect(g.verdict, JSON.stringify(g)).toBe('pass');
    // the magnetic torque is the largest of the four, as hint 2 says
    const a = figures(l, start).attitude;
    expect(a.magnetic.value).toBeGreaterThan(Math.max(a.gravityGradient.value, a.solar.value, a.aero.value));
    // the centre of pressure on the centre of mass removes only the small air and sunlight torques: not enough
    const centred = withValue(start, 'adcs.cpOffset', 0);
    expect(states(grade(l, centred, { need })).torquer).toBe('fail');
    // T × B in place of T / B fails the answer
    expect(states(grade(l, solved, { need: f.attitude.total.value * f.attitude.field.value })).need).toBe('fail');
    // a lighter inertia is not the student's to change
    expect(grade(l, withValue(solved, 'adcs.inertia.0', 0.05), { need }).lockBroken).toEqual(['adcs.inertia.0']);
  }, 60_000);

  it('P6 sunlight into electricity: a 550 W payload leaves the array and the battery short; 6.5 m² and 1 800 Wh pass; either alone fails', () => {
    const l = lesson('ipst-p-solar-power');
    const start = designLessonStart(l.start);
    expect(start.power.payloadW).toBe(550);
    expect(states(grade(l, start))).toEqual({ margin: 'fail', battery: 'fail', eclipse: 'pending' });
    const solved = set(start, { 'power.arrayArea': 6.5, 'power.batteryWh': 1800 });
    // the eclipse as "At a glance" prints it, to a tenth of a minute
    const eclipse = Number((figures(l, solved).eclipse.worst.value / 60).toFixed(1));
    const g = grade(l, solved, { eclipse });
    expect(g.verdict, JSON.stringify(g)).toBe('pass');
    expect(states(grade(l, withValue(start, 'power.arrayArea', 6.5), { eclipse })).battery).toBe('fail');
    expect(states(grade(l, withValue(start, 'power.batteryWh', 1800), { eclipse })).margin).toBe('fail');
    // hint 3: the closed form at β = 0 is a little more than this orbit's longest eclipse, which never has β = 0
    const e = figures(l, solved).eclipse;
    expect(e.atBetaZero!.value).toBeGreaterThan(e.worst.value);
    expect(e.atBetaZero!.value - e.worst.value).toBeLessThan(60);
    // the payload's power back down to the template's breaks a lock
    expect(grade(l, set(solved, { 'power.payloadW': 150 }), { eclipse }).lockBroken).toEqual(['power.payloadW']);
    // an eclipse of a whole third of the revolution is not the answer
    expect(states(grade(l, solved, { eclipse: figures(l, solved).orbit.nodalPeriod.value / 180 })).eclipse).toBe('fail');
  }, 60_000);

  it('R6 attitude control for a 6U: the 1 mN·m·s wheel and the 50 Mbit/s link both fall short; a cleaner dipole and a 10 cm dish pass', () => {
    const l = lesson('rtaf-6u-adcs');
    const start = designLessonStart(l.start);
    expect([start.adcs.wheelH, start.comms.dataRate, start.comms.txPowerW]).toEqual([0.001, 50e6, 1]);
    expect(states(grade(l, start))).toEqual({ wheel: 'fail', link: 'fail', ratio: 'pending' });
    const solved = set(start, { 'adcs.residualDipole': 0.01, 'comms.txAntennaD': 0.1 });
    // the cadet's working: h = 0.707·T·P/4 with T as printed and P = 5 720 s (the hint's)
    const f = figures(l, solved);
    const ratio = 0.001 / (0.707 * shown(f.attitude.total.value) * 5720 / 4);
    const g = grade(l, solved, { ratio });
    expect(g.verdict, JSON.stringify(g)).toBe('pass');
    expect(f.orbit.nodalPeriod.value).toBeCloseTo(5720, -1);
    // either change alone leaves the other criterion failed
    expect(states(grade(l, withValue(start, 'adcs.residualDipole', 0.01), { ratio }))).toMatchObject({ wheel: 'pass', link: 'fail' });
    expect(states(grade(l, withValue(start, 'comms.txAntennaD', 0.1), { ratio }))).toMatchObject({ wheel: 'fail', link: 'pass' });
    // a bigger wheel, or more transmitter power, is not the cadet's to choose
    expect(grade(l, set(solved, { 'adcs.wheelH': 0.01 }), { ratio }).lockBroken).toEqual(['adcs.wheelH']);
    expect(grade(l, set(start, { 'adcs.residualDipole': 0.01, 'comms.txPowerW': 4 }), { ratio }).lockBroken).toEqual(['comms.txPowerW']);
    // the hint's dish figures: some 16 dBi and a beam about 25° wide
    expect(f.link.txGain.value).toBeCloseTo(16.3, 1);
    expect(f.link.beamwidth!.value / DEG).toBeCloseTo(25.1, 1);
  }, 60_000);

  it('S6 disturbance torques and the choice of a wheel: of 4, 8, 16 and 32 N·m·s only 8 passes, and the template\'s 25 does not', () => {
    const l = lesson('ru-ka-oss');
    const start = designLessonStart(l.start);
    expect(start.adcs.wheelH).toBe(25);
    expect(states(grade(l, start)).wheel).toBe('fail');
    const verdicts = [4, 8, 16, 32].map((h) => states(grade(l, withValue(start, 'adcs.wheelH', h))).wheel);
    expect(verdicts).toEqual(['fail', 'pass', 'fail', 'fail']);
    const solved = withValue(start, 'adcs.wheelH', 8);
    // the student's working from the printed torques and field, and the period's 96.8 min (the hint's)
    const f = figures(l, solved);
    const total = shown(f.attitude.total.value);
    const answers = { dipole: total / shown(f.attitude.field.value), ratio: 8 / (0.707 * total * 96.8 * 60 / 4) };
    const g = grade(l, solved, answers);
    expect(g.verdict, JSON.stringify(g)).toBe('pass');
    // the gravity gradient is the largest torque, more than 20 times the magnetic, as the debrief says
    expect(f.attitude.gravityGradient.value / f.attitude.magnetic.value).toBeGreaterThan(20);
    // the hint's gravity gradient by hand: (3μ/2r³)·|I_z − I_y| at 45°, r = 6 978 km
    const [ix, iy] = [Math.max(...start.adcs.inertia), Math.min(...start.adcs.inertia)];
    expect(1.5 * 3.986e14 / 6978e3 ** 3 * (ix - iy)).toBeCloseTo(f.attitude.gravityGradient.value, 5);
    // the dipole with the field in µT taken for tesla is a million times off
    expect(states(grade(l, solved, { ...answers, dipole: answers.dipole / 1e6 })).dipole).toBe('fail');
    // balancing the body is not the choice asked for
    expect(grade(l, withValue(solved, 'adcs.cpOffset', 0), answers).lockBroken).toEqual(['adcs.cpOffset']);
  }, 60_000);

  /**
   * The instructor's check (T02 for designs) of a pack design lesson's
   * record: worked out again from the packs' lessons alone, with no lesson
   * file opened, it matches; without the packs the lesson is unknown.
   */
  it('re-checks a handed-in pack design to a match from the packs\' lessons, and knows no such lesson without them', () => {
    const l = lesson('ipst-p-solar-power');
    const design = set(designLessonStart(l.start), { 'power.arrayArea': 6.5, 'power.batteryWh': 1800 });
    const key = keyFor(l, design);
    const answers = { eclipse: Number((key.values['sat.eclipseMax']!).toFixed(1)) };
    const grade = gradeDesign(l, key, answers);
    expect(grade.verdict).toBe('pass');
    const record = designRecord({ at: new Date(Date.UTC(2026, 9, 1, 9)), grade, answers, hintsShown: 0, design, designDate: l.designDate, level: l.level, figures: key.values, app: 'test+build' });
    const job = { file: 0, student: null, lessonId: l.id, which: ['last' as const], record: JSON.parse(JSON.stringify(record)) };
    const check = checkRecord(job, allLessons(packLessons(PACKS)), 'test+build');
    expect([check.kind, check.status, check.recheckedVerdict], JSON.stringify(check)).toEqual(['design', 'match', 'pass']);
    expect(checkRecord(job, allLessons(), 'test+build').reason).toBe('noLesson');
  }, 60_000);
});
