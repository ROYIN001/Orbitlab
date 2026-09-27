/**
 * The cases from the record (roadmap P2.5) by name: the three cases and
 * each sheet's questions.
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
  cz5b: ['area', 'b', 'early', 'late', 'actual', 'error', 'broadside', 'why'],
  theos2: ['required', 'j2', 'height', 'reach', 'lst', 'why'],
};

/** The questions answered by picking one option; the rest are numbers. */
export const CASE_CHOICE_ITEMS: readonly string[] = ['why'];

/** The Long March 5B stage the case is about: the one that launched Tianhe (GCAT's name, src/data/cz5b.ts). */
export const CZ5B_CASE_STAGE = 'CZ-5B Y2';
