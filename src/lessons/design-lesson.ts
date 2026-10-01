/**
 * Design lessons (roadmap T01, Phase 4 map §4.1, "Design a satellite that
 * meets these requirements"): the measures a design is graded on, the parts
 * of it a lesson can lock, and the grader. DOM-free and pure, like the case
 * lessons' grader (src/lessons/case-grader.ts): the design's figures come in
 * as data, a `DesignKey` built outside src/lessons from the D06 satellite
 * model and the lifetime run (src/design/design-lesson-key.ts), so nothing
 * here predicts or propagates, and src/lessons keeps clear of the propagator
 * (tests/propagator.test.ts).
 *
 * A design is graded when the student asks ("Check") and when they hand it
 * in: there is no flight to wait for, so a grade is final at once, and open
 * only while a typed answer is awaited — the rules the flight lessons'
 * answers follow (`verdictOf`, `answerMatches`, `wasRevealed`), "Passed with
 * help" (owner decision D-6) included. A locked part the design changed fails
 * the lesson, as a broken lock fails a flight.
 */
import { answerMatches, verdictOf, wasRevealed, type LessonAnswers, type RevealedAnswers } from './grader';
import type { SatelliteDesign } from '../design/satellite-spec';
import type { DesignFigureOptions } from '../design/design-lesson-key';
import type { CriterionGrade, DesignBound, DesignKey, DesignLesson, DesignLockKey, DesignMeasureId, LessonGrade } from './types';

/** How a measure is worked out, which sets the re-check's engine tolerance (src/lessons/recheck.ts `designTolerance`). */
export type DesignMeasureKind = 'closed' | 'eclipse' | 'revisit' | 'contact' | 'lifetime' | 'flag';

export interface DesignMeasure {
  /** the unit a lesson file's bounds are in, as src/lessons/text.ts `unitText` prints it ('' for a plain number) */
  unit: string;
  /** decimals shown */
  digits: number;
  kind: DesignMeasureKind;
}

/**
 * Every design measure, its unit and how it is worked out (map §4.1's table,
 * plus the torquer dipole). The figures are the D06 model's
 * (src/design/satellite-model.ts `designFigures`), converted to these units
 * by src/design/design-lesson-key.ts:
 * - `sat.mass`: the wet mass; `sat.eclipseMax`: the year's longest eclipse
 *   from the design date (`worstEclipse`, sampled, edges to 1 ms);
 * - `sat.powerMargin`: the array's margin over its need at the end of life,
 *   through the longest eclipse; `sat.batteryDod`: how deep that eclipse
 *   drains the battery;
 * - `sat.dvMargin`: the tanks' Δv over the budget's; `sat.linkMargin`: the
 *   downlink's at the worst range;
 * - `sat.dataPerDay`: the design's rate × the time its station hears it a day
 *   (over 30 days from the design date; nothing when the link does not close);
 * - `sat.gsd`, `sat.swath`: the camera's, straight down from the perigee;
 * - `sat.revisitMax`: the longest wait between looks at the requirements'
 *   place within half the swath, over 30 days from the design date;
 * - `sat.lifetime`: P07's mean-element run from the design orbit on the
 *   design date at the lesson's ECSS level, as the bench runs it;
 *   `sat.disposal25y`: 1 when that run comes down within IADC's 25 years of
 *   the mission's end (the bench's rule: life + 25 years with no engine, 25
 *   with one), in the low region only;
 * - `sat.wheelMargin`: the wheel's momentum over the need;
 *   `sat.torquerDipole`: the magnetic torquer's dipole the disturbances need.
 */
export const DESIGN_MEASURES: Readonly<Record<DesignMeasureId, DesignMeasure>> = {
  'sat.mass': { unit: 'kg', digits: 2, kind: 'closed' },
  'sat.eclipseMax': { unit: 'min', digits: 2, kind: 'eclipse' },
  'sat.powerMargin': { unit: '%', digits: 1, kind: 'closed' },
  'sat.batteryDod': { unit: '%', digits: 1, kind: 'closed' },
  'sat.dvMargin': { unit: 'm/s', digits: 1, kind: 'closed' },
  'sat.linkMargin': { unit: 'dB', digits: 2, kind: 'closed' },
  'sat.dataPerDay': { unit: 'Gbit', digits: 2, kind: 'contact' },
  'sat.gsd': { unit: 'm', digits: 3, kind: 'closed' },
  'sat.swath': { unit: 'km', digits: 2, kind: 'closed' },
  'sat.revisitMax': { unit: 'd', digits: 2, kind: 'revisit' },
  'sat.lifetime': { unit: 'yr', digits: 2, kind: 'lifetime' },
  'sat.wheelMargin': { unit: '', digits: 2, kind: 'closed' },
  'sat.disposal25y': { unit: '', digits: 0, kind: 'flag' },
  'sat.torquerDipole': { unit: 'A·m²', digits: 4, kind: 'closed' },
};
export const DESIGN_MEASURE_IDS = Object.keys(DESIGN_MEASURES) as DesignMeasureId[];

/** The measures only the lifetime run gives (a worker job of seconds): worked out only when a criterion asks for one. */
export const LIFETIME_MEASURES: readonly DesignMeasureId[] = ['sat.lifetime', 'sat.disposal25y'];

/**
 * Every part of a design a lesson can lock: each number the satellite model
 * lets a student type (src/design/satellite-model.ts `SATELLITE_FIELDS`,
 * tests/design-lessons.test.ts holds the two lists equal), its menus, the
 * sun-synchronous switch, and whether it has an engine or a camera at all.
 */
export const DESIGN_LOCK_KEYS: readonly DesignLockKey[] = [
  'orbit.perigee', 'orbit.apogee', 'orbit.inclination', 'orbit.ltan', 'orbit.raan', 'orbit.sso', 'lifeYears',
  'bus.dryMass', 'bus.size.width', 'bus.size.height', 'bus.size.depth', 'bus.cd', 'bus.cr',
  'power.payloadW', 'power.busW', 'power.arrayArea', 'power.cellEff', 'power.Id', 'power.degPerYear', 'power.batteryWh', 'power.dod', 'power.batteryEff',
  'power.mount', 'power.regulation',
  'propulsion', 'propulsion.thrust', 'propulsion.isp', 'propulsion.propellant', 'propulsion.insertionDv',
  'adcs.mode', 'adcs.pointingDeg', 'adcs.inertia.0', 'adcs.inertia.1', 'adcs.inertia.2', 'adcs.wheelH', 'adcs.residualDipole', 'adcs.cpOffset',
  'comms.txPowerW', 'comms.frequency', 'comms.txAntennaD', 'comms.lineLoss', 'comms.dataRate', 'comms.requiredEbN0', 'comms.station', 'comms.minElDeg',
  'comms.rxAntennaD', 'comms.rxNoiseK', 'comms.losses',
  'payload', 'payload.focalLength', 'payload.pixelPitch', 'payload.pixels', 'payload.aperture', 'payload.bits', 'payload.wavelength',
];

/** The groups the writer offers locks by (src/ui/lessons/author-view.ts): each locks every part whose path starts with it. */
export const DESIGN_LOCK_GROUPS = ['orbit', 'bus', 'power', 'propulsion', 'adcs', 'comms', 'payload'] as const;
export type DesignLockGroup = (typeof DESIGN_LOCK_GROUPS)[number];
/** The parts a group locks: the orbit's include the design life, which sets the end-of-life figures with it. */
export const lockGroupKeys = (g: DesignLockGroup): DesignLockKey[] =>
  DESIGN_LOCK_KEYS.filter((k) => k === g || k.startsWith(`${g}.`) || (g === 'orbit' && k === 'lifeYears'));

/** What a locked part is in a design: a number, a word, or (for `propulsion`, `payload`) whether there is one. */
export function lockValue(design: SatelliteDesign, key: DesignLockKey): unknown {
  if (key === 'propulsion' || key === 'payload') return design[key] !== null;
  let at: unknown = design;
  for (const part of key.split('.')) {
    if (at === null || typeof at !== 'object') return undefined;
    at = (at as Record<string, unknown>)[part];
  }
  return at;
}

/** Two numbers the same to the model's own 1e-9 (the satellite model's `fieldOrigin`), anything else by its JSON. */
const sameValue = (a: unknown, b: unknown): boolean =>
  typeof a === 'number' && typeof b === 'number' ? Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(b)) : JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

/**
 * The locked parts `design` does not keep from the lesson's `start`. A
 * sun-synchronous orbit's inclination follows its size (the model works it
 * out; the student cannot type it), so a lock on it holds only while the
 * orbit is not sun-synchronous.
 */
export function brokenDesignLocks(locked: readonly DesignLockKey[], start: SatelliteDesign, design: SatelliteDesign): DesignLockKey[] {
  return locked.filter((k) => {
    if (k === 'orbit.inclination' && design.orbit.sso && start.orbit.sso) return false;
    return !sameValue(lockValue(design, k), lockValue(start, k));
  });
}

/** The measures a lesson's criteria ask about. */
export const lessonMeasures = (lesson: Pick<DesignLesson, 'criteria'>): DesignMeasureId[] => [...new Set(lesson.criteria.map((c) => c.measure))];

/**
 * What a design is worked out for in this lesson (src/design/design-lesson-key.ts):
 * its fixed date and ECSS level, the measures its criteria ask about, its
 * requirements, and the largest bound it puts on the lifetime, so the
 * lifetime run lasts past every bound and a satellite still up at its end is
 * graded right.
 */
export function designLessonOptions(lesson: DesignLesson): DesignFigureOptions {
  const bounds: number[] = [];
  for (const c of lesson.criteria) {
    if (c.measure !== 'sat.lifetime') continue;
    if (c.kind === 'design') bounds.push(...[c.min, c.max, c.target === undefined ? undefined : c.target + (c.tol ?? 0)].filter((v): v is number => v !== undefined));
  }
  return {
    date: lesson.designDate, level: lesson.level, measures: lessonMeasures(lesson),
    ...(lesson.requirements ? { requirements: lesson.requirements } : {}),
    ...(bounds.length ? { lifetimeBound: Math.max(...bounds) } : {}),
  };
}

/** Whether a value lies within a bound; a value that does not apply (null) never does. */
export function withinDesignBound(value: number | null | undefined, b: DesignBound): boolean {
  if (value === null || value === undefined || !Number.isFinite(value)) return false;
  if (b.min !== undefined && value < b.min) return false;
  if (b.max !== undefined && value > b.max) return false;
  if (b.target !== undefined && Math.abs(value - b.target) > (b.tol ?? 0)) return false;
  return true;
}

/**
 * Grade a design (T01; map §4.1 `gradeDesign(lesson, key)`): each criterion
 * against the design's figures in `key`, the typed answers against the
 * figures they ask for (an answer shown with "Show the answers" passes only
 * with help, D-6), and the locks. Final at once; open only while an answer is
 * awaited. A design the checker refuses fails every criterion: there is no
 * figure to hold it to.
 */
export function gradeDesign(lesson: DesignLesson, key: DesignKey, answers: LessonAnswers = {}, revealed: RevealedAnswers = {}): LessonGrade {
  const criteria: CriterionGrade[] = lesson.criteria.map((c) => {
    const raw = key.refused ? null : key.values[c.measure];
    const value = raw === undefined || raw === null || !Number.isFinite(raw) ? null : raw;
    if (c.kind === 'design') return { id: c.id, state: withinDesignBound(value, c) ? 'pass' : 'fail', value };
    const shown = wasRevealed(c, value, revealed[c.id]) ? { revealed: true } : {};
    const typed = answers[c.id];
    if (typed === undefined || !Number.isFinite(typed)) return { id: c.id, state: 'pending', value: null, expected: value, ...shown };
    const ok = value !== null && answerMatches(typed, value, c.tol, c.tolPct);
    return { id: c.id, state: ok ? 'pass' : 'fail', value: typed, expected: value, ...shown };
  });
  return { lessonId: lesson.id, final: true, verdict: verdictOf(criteria, key.lockBroken, true), criteria, lockBroken: [...key.lockBroken], t: 0 };
}
