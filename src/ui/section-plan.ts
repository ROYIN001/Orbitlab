/**
 * What the Orbit and Build sections hold and will hold (roadmap S01), taken
 * from docs/ROADMAP-PART2-3.md item for item, so no screen promises anything
 * the roadmap does not: each line is a roadmap item, named by its
 * identifier. The Orbit playground lists what it still lacks from it
 * (src/ui/orbit/playground.ts); the Build screen shows it where a level is
 * still being built (src/ui/build/build-screen.ts).
 *
 * DOM-free: tests/section-plan.test.ts holds it to the roadmap document and
 * the dictionaries, tests/orbit-playground.test.ts and
 * tests/build-screen.test.ts each section's built items.
 */
import type { AppLevel, AppSection } from './app-mode';

/** A section with a plan of roadmap items: both sections beyond the launch simulator, built or being built. */
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
export const BUILT_ITEMS: ReadonlySet<string> = new Set(['O01', 'O02', 'O03', 'O04', 'R01', 'R02', 'R03', 'R04', 'R05', 'M01', 'M02', 'M03']);

/**
 * The Build section's own (Phase 3 on). D01, the parts catalogue, is built:
 * the fleet is assembled from it and the Watch level draws its parts. The
 * Watch level itself, real rockets taken apart ("exploded views",
 * `plan.build.watch`), is not a numbered roadmap item. D02, the remix, is
 * built at the Explore level, its only level. D03, the parts builder, is built
 * at the Explore level too, but its Engineer face (designing from parts
 * there) is not, so it stays on the Engineer level's list of what is coming.
 */
export const BUILD_BUILT_ITEMS: ReadonlySet<string> = new Set(['D01', 'D02']);

/** The Build section's levels that are built; the others show what is coming to them. */
export const BUILD_READY_LEVELS: ReadonlySet<AppLevel> = new Set(['watch', 'explore']);

/**
 * What each Build level will offer, by roadmap item, as the roadmap and the
 * level lines (`plan.build.explore`, `plan.build.engineer`) divide it:
 * Explore remixes a real rocket (D02), builds one from parts (D03) and starts
 * a satellite from a template (D06); Engineer designs from parts (D03), tests
 * before flight (D04), sizes from a payload with optimal staging (D05) and
 * budgets a satellite (D06, D07).
 */
export const BUILD_LEVEL_ITEMS: Readonly<Record<Exclude<AppLevel, 'watch'>, readonly string[]>> = {
  explore: ['D02', 'D03', 'D06'],
  engineer: ['D03', 'D04', 'D05', 'D06', 'D07'],
};

/**
 * The level a section link opens a section at, from the level showing (or
 * last used): the same level, except that the Build section opens at a level
 * that is built, its Watch level, rather than at one that only says what is
 * coming. The level links still open any level.
 */
export function sectionLinkLevel(section: AppSection, level: AppLevel): AppLevel {
  return section === 'build' && !BUILD_READY_LEVELS.has(level) ? 'watch' : level;
}

export const isPlannedSection = (section: AppSection | null): section is PlannedSection =>
  section === 'orbit' || section === 'build';
