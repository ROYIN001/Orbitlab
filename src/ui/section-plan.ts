/**
 * What the Orbit and Build sections will hold (roadmap S01), for the screens
 * that stand in for them until they are built. Taken from
 * docs/ROADMAP-PART2-3.md, item for item, so the screen promises nothing the
 * roadmap does not: each line is a roadmap item, named by its identifier,
 * and none of it pretends to work yet.
 *
 * DOM-free: `src/ui/section-screen.ts` draws it, tests/section-plan.test.ts
 * holds it to the roadmap document and the dictionaries.
 */
import type { AppLevel, AppSection } from './app-mode';

/** A section that is not built yet. */
export type PlannedSection = Exclude<AppSection, 'launch'>;
export const PLANNED_SECTIONS: readonly PlannedSection[] = ['orbit', 'build'];

export interface PlannedItem {
  /** the roadmap identifier, O01 … */
  id: string;
  /** i18n key of its one-line description */
  key: string;
}

export interface PlannedPhase {
  /** the roadmap's phase number */
  phase: number;
  /** i18n key of the phase's title */
  titleKey: string;
  items: readonly PlannedItem[];
}

export interface SectionPlan {
  section: PlannedSection;
  /** i18n keys: the section's name, the screen's title and its lead paragraph */
  nameKey: string;
  titleKey: string;
  leadKey: string;
  /** i18n key of what each level will offer */
  levels: Readonly<Record<AppLevel, string>>;
  phases: readonly PlannedPhase[];
}

const item = (id: string, key: string): PlannedItem => ({ id, key });

export const SECTION_PLANS: Readonly<Record<PlannedSection, SectionPlan>> = {
  orbit: {
    section: 'orbit',
    nameKey: 'section.orbit',
    titleKey: 'plan.orbit.title',
    leadKey: 'plan.orbit.lead',
    levels: { watch: 'plan.orbit.watch', explore: 'plan.orbit.explore', engineer: 'plan.orbit.engineer' },
    phases: [
      { phase: 1, titleKey: 'plan.phase.1', items: [
        item('O01', 'plan.item.O01'), item('O02', 'plan.item.O02'), item('O03', 'plan.item.O03'), item('O04', 'plan.item.O04'),
      ] },
      { phase: 2, titleKey: 'plan.phase.2', items: [
        item('R01', 'plan.item.R01'), item('R02', 'plan.item.R02'), item('R03', 'plan.item.R03'), item('R04', 'plan.item.R04'),
        item('R05', 'plan.item.R05'), item('M01', 'plan.item.M01'), item('M02', 'plan.item.M02'), item('M03', 'plan.item.M03'),
      ] },
      { phase: 5, titleKey: 'plan.phase.5', items: [
        item('L01', 'plan.item.L01'), item('L02', 'plan.item.L02'), item('L03', 'plan.item.L03'), item('L04', 'plan.item.L04'),
        item('L05', 'plan.item.L05'),
      ] },
    ],
  },
  build: {
    section: 'build',
    nameKey: 'section.build',
    titleKey: 'plan.build.title',
    leadKey: 'plan.build.lead',
    levels: { watch: 'plan.build.watch', explore: 'plan.build.explore', engineer: 'plan.build.engineer' },
    phases: [
      { phase: 3, titleKey: 'plan.phase.3', items: [
        item('D01', 'plan.item.D01'), item('D02', 'plan.item.D02'), item('D03', 'plan.item.D03'), item('D04', 'plan.item.D04'),
        item('D05', 'plan.item.D05'),
      ] },
      { phase: 4, titleKey: 'plan.phase.4', items: [
        item('D06', 'plan.item.D06'), item('D07', 'plan.item.D07'),
      ] },
    ],
  },
};

/**
 * The roadmap items already built (Phase 1 on): the Orbit section's own
 * pages say what is still to come, and leave these out of that list.
 */
export const BUILT_ITEMS: ReadonlySet<string> = new Set(['O01', 'O02', 'O03', 'O04', 'R01', 'R02', 'R03', 'R04', 'R05', 'M01']);

export const isPlannedSection = (section: AppSection | null): section is PlannedSection =>
  section === 'orbit' || section === 'build';
