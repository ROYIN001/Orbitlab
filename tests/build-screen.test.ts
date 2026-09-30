/**
 * The Build section's own rules in src/ui/section-plan.ts (Phase 3): which of
 * its roadmap items are built, which level shows what is coming, and where
 * its section link leads. The Orbit section's BUILT_ITEMS stays the Orbit
 * section's (tests/orbit-playground.test.ts).
 */
import { describe, expect, it } from 'vitest';
import { APP_LEVELS } from '../src/ui/app-mode';
import { BUILD_BUILT_ITEMS, BUILD_ITEM_OPEN_AT, BUILD_LEVEL_ITEMS, BUILD_READY_LEVELS, BUILT_ITEMS, SECTION_PLANS, sectionLinkLevel } from '../src/ui/section-plan';

const buildItems = SECTION_PLANS.build.phases.flatMap((p) => p.items.map((i) => i.id));

describe('the Build section (Phase 3)', () => {
  it('counts D01 (the parts catalogue), D02 (the remix), D04 (the test facilities), D05 (sizing, optimal staging), D06 (the satellite builder) and D07 (design from requirements) as built, and nothing outside its own plan', () => {
    expect([...BUILD_BUILT_ITEMS]).toEqual(['D01', 'D02', 'D04', 'D05', 'D06', 'D07']);
    for (const id of BUILD_BUILT_ITEMS) expect(buildItems).toContain(id);
    for (const id of BUILD_BUILT_ITEMS) expect(BUILT_ITEMS.has(id)).toBe(false);
  });

  it('has all three levels built, each listing what is still coming to it', () => {
    expect([...BUILD_READY_LEVELS]).toEqual(['watch', 'explore', 'engineer']);
    for (const level of ['explore', 'engineer'] as const) {
      expect(BUILD_LEVEL_ITEMS[level].length).toBeGreaterThan(0);
      for (const id of BUILD_LEVEL_ITEMS[level]) expect(buildItems, `${level} ${id}`).toContain(id);
    }
    // what Engineer offers is built there, but for D03's Engineer face (the satellite bench, D06, and the requirements page, D07, are built)
    expect(BUILD_LEVEL_ITEMS.engineer.filter((id) => !BUILD_BUILT_ITEMS.has(id))).toEqual(['D03']);
    // what Explore offers is built there, the satellite designer (D06) too; D03 is built there, and listed for its Engineer face
    expect(BUILD_LEVEL_ITEMS.explore.filter((id) => !BUILD_BUILT_ITEMS.has(id))).toEqual(['D03']);
    // an item one level still lists as coming but another already offers (D03's parts builder, at Explore) says where
    expect([...BUILD_ITEM_OPEN_AT]).toEqual([['D03', 'explore']]);
    for (const [id, level] of BUILD_ITEM_OPEN_AT) {
      expect(BUILD_BUILT_ITEMS.has(id)).toBe(false);
      expect(BUILD_READY_LEVELS.has(level)).toBe(true);
      expect(BUILD_LEVEL_ITEMS.engineer).toContain(id);
    }
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
