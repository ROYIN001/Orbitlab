/**
 * The Build section's own rules in src/ui/section-plan.ts (Phase 3): which of
 * its roadmap items are built, which level shows what is coming, and where
 * its section link leads. The Orbit section's BUILT_ITEMS stays the Orbit
 * section's (tests/orbit-playground.test.ts).
 */
import { describe, expect, it } from 'vitest';
import { APP_LEVELS } from '../src/ui/app-mode';
import { BUILD_BUILT_ITEMS, BUILD_LEVEL_ITEMS, BUILD_READY_LEVELS, BUILT_ITEMS, SECTION_PLANS, sectionLinkLevel } from '../src/ui/section-plan';

const buildItems = SECTION_PLANS.build.phases.flatMap((p) => p.items.map((i) => i.id));

describe('the Build section (Phase 3)', () => {
  it('counts D01, the parts catalogue, and D02, the remix, as built, and nothing outside its own plan', () => {
    expect([...BUILD_BUILT_ITEMS]).toEqual(['D01', 'D02']);
    for (const id of BUILD_BUILT_ITEMS) expect(buildItems).toContain(id);
    for (const id of BUILD_BUILT_ITEMS) expect(BUILT_ITEMS.has(id)).toBe(false);
  });

  it('has its Watch and Explore levels built, and shows Engineer what is coming to it', () => {
    expect([...BUILD_READY_LEVELS]).toEqual(['watch', 'explore']);
    for (const level of ['explore', 'engineer'] as const) {
      expect(BUILD_LEVEL_ITEMS[level].length).toBeGreaterThan(0);
      for (const id of BUILD_LEVEL_ITEMS[level]) expect(buildItems, `${level} ${id}`).toContain(id);
    }
    // the level still to be built promises nothing already built
    for (const id of BUILD_LEVEL_ITEMS.engineer) expect(BUILD_BUILT_ITEMS.has(id), `engineer ${id}`).toBe(false);
    // what Explore offers is built there, but for the satellite templates of Phase 4 (D06)
    expect(BUILD_LEVEL_ITEMS.explore.filter((id) => !BUILD_BUILT_ITEMS.has(id))).toEqual(['D03', 'D06']);
    // every item still to come is promised to some level
    const promised = new Set([...BUILD_LEVEL_ITEMS.explore, ...BUILD_LEVEL_ITEMS.engineer]);
    expect(buildItems.filter((id) => !BUILD_BUILT_ITEMS.has(id) && !promised.has(id))).toEqual([]);
  });

  it('opens the Build section at a level that is built; the other sections at the level showing', () => {
    for (const level of APP_LEVELS) {
      expect(sectionLinkLevel('build', level)).toBe(BUILD_READY_LEVELS.has(level) ? level : 'watch');
      expect(sectionLinkLevel('launch', level)).toBe(level);
      expect(sectionLinkLevel('orbit', level)).toBe(level);
    }
  });
});
