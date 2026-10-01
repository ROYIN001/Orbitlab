/**
 * The cases from the record (roadmap P2.5, graded as lessons in E03's track
 * 6) by name: the three cases, each sheet's questions, where a case lesson
 * opens the Orbit section, and when the section may show a case's answers.
 *
 * No imports, on purpose: the lesson reader and the case grader
 * (src/lessons/) name a case and its questions from here, without importing
 * the sheets themselves (src/worksheets/cases.ts), which predict a re-entry
 * with the propagator — and nothing in src/lessons may import that
 * (tests/propagator.test.ts).
 */

export type CaseId = 'iridium' | 'cz5b' | 'theos2';
export const CASE_IDS: readonly CaseId[] = ['iridium', 'cz5b', 'theos2'];

/**
 * Each case sheet's questions, in the sheet's order. An id is the last part
 * of the question's i18n key (`wsc.<case>.q.<id>`); tests/case-worksheets
 * holds the sheets to this list.
 */
export const CASE_ITEM_IDS: Readonly<Record<CaseId, readonly string[]>> = {
  iridium: ['miss', 'speed', 'angle', 'radius', 'sigma', 'nsigma', 'why', 'times'],
  // `storm` (T03b, the research's B5): the re-entry sooner through a geomagnetic storm
  cz5b: ['area', 'b', 'early', 'late', 'actual', 'error', 'broadside', 'storm', 'why'],
  theos2: ['required', 'j2', 'height', 'reach', 'lst', 'why'],
};

/** The questions answered by picking one option; the rest are numbers. */
export const CASE_CHOICE_ITEMS: readonly string[] = ['why'];

/** The Long March 5B stage the case is about: the one that launched Tianhe (GCAT's name, src/data/cz5b.ts). */
export const CZ5B_CASE_STAGE = 'CZ-5B Y2';

/**
 * Where a case lesson opens Real satellites: the group, the satellite picked
 * (by catalogue number, as the Watch tour picks one: src/orbit/sky-tour.ts),
 * the view, and the tool opened. THEOS-2's overflights of Bangkok; for the
 * Long March 5B, the station, low enough for the re-entry tool that holds
 * the stages' case study; for Iridium–Cosmos, the close approaches.
 */
export const CASE_FOCUS: Readonly<Record<CaseId, { group: 'thai' | 'stations'; satnum: number; view: '3d' | 'track'; open: 'over' | 'reentry' | 'conj' }>> = {
  theos2: { group: 'thai', satnum: 58016, view: 'track', open: 'over' },
  cz5b: { group: 'stations', satnum: 25544, view: 'track', open: 'reentry' },
  iridium: { group: 'stations', satnum: 25544, view: '3d', open: 'conj' },
};

/** The case lesson open now, as the Orbit section is told of it. */
export interface CaseLessonState {
  case: CaseId;
  /** the lesson is passed, or its answers were shown: nothing is left to give away */
  answersOpen: boolean;
}

/**
 * Whether the Orbit section may show this case's answers ready-made (its
 * answer key): not while the case's lesson is open and still to be
 * answered.
 */
export function caseAnswersShown(open: CaseLessonState | null, id: CaseId): boolean {
  return !open || open.case !== id || open.answersOpen;
}

/**
 * Whether the re-entry case study may print a stage's prediction error. For
 * the stage of Tianhe that error, to 0.1 %, is the answer lesson 6.2 asks
 * for (the sheet's "error"), so it waits like the key (`caseAnswersShown`);
 * the other stages' errors are not asked and are shown.
 */
export function caseStudyErrorShown(stage: string, open: CaseLessonState | null): boolean {
  return stage !== CZ5B_CASE_STAGE || caseAnswersShown(open, 'cz5b');
}
