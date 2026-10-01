/**
 * What the top bar's section switch shows (owner, 2026-10-01): one tab per
 * section, the level shown as a badge on the current one, and a menu of the
 * section's levels under each tab (a single button that opens a table of
 * sections × levels on a phone). Since the section × level shell
 * (src/ui/app-mode.ts) a level is the same three everywhere — watch, explore,
 * engineer — but what it is called depends on the section: only the launch
 * section's first level is watching alone ("รับชม"); the other sections'
 * first level is where they begin ("พื้นฐาน" in Thai). The route keys stay
 * watch / explore / engineer, so no link changes.
 *
 * A section still to come stands in the switch as a tab of its own, marked as
 * coming, whose menu says what the roadmap brings to it; it has no route and
 * no levels until it is built.
 *
 * DOM-free: tests/section-nav-model.test.ts holds it to the dictionaries and
 * to docs/ROADMAP-PART2-3.md.
 */
import { APP_LEVELS, type AppLevel, type AppSection } from './app-mode';

/** A section still to come: in the switch, not yet a route. */
export type FutureSection = 'campaign';
export type NavSection = AppSection | FutureSection;

export interface NavEntry {
  id: NavSection;
  glyph: string;
  /** i18n key of the section's name */
  nameKey: string;
  /** a section still to come: no route, no levels, its menu lists its roadmap items */
  future: boolean;
}

export const NAV_SECTIONS: readonly NavEntry[] = [
  { id: 'launch', glyph: '▲', nameKey: 'section.launch', future: false },
  { id: 'orbit', glyph: '⊕', nameKey: 'section.orbit', future: false },
  { id: 'build', glyph: '⚙︎', nameKey: 'section.build', future: false },
  { id: 'campaign', glyph: '⚑', nameKey: 'section.campaign', future: true },
];

export interface FuturePlan {
  /** the roadmap's phase number */
  phase: number;
  /** roadmap identifiers and the i18n key of each one's line */
  items: readonly { id: string; key: string }[];
}

/** What a section still to come will hold, item for item from the roadmap. */
export const FUTURE_PLANS: Readonly<Record<FutureSection, FuturePlan>> = {
  campaign: { phase: 6, items: [{ id: 'X01', key: 'plan.item.X01' }, { id: 'X02', key: 'plan.item.X02' }] },
};

export const LEVEL_GLYPHS: Readonly<Record<AppLevel, string>> = { watch: '▷', explore: '◎', engineer: '⌬' };

/** i18n key of a level's name in a section: the launch section's first level is watching, the others' is the basics. */
export function levelNameKey(section: AppSection, level: AppLevel): string {
  if (level === 'watch') return section === 'launch' ? 'mode.watch' : 'mode.basics';
  return level === 'explore' ? 'mode.explore' : 'mode.engineer';
}

/** i18n key of the one line under a level in the section's menu. */
export function levelDescKey(section: AppSection, level: AppLevel): string {
  return `nav.level.${section}.${level}`;
}

/** Every i18n key the switch reads, for the dictionary test. */
export function navKeys(): string[] {
  const keys = ['section.nav', 'mode.home', 'nav.levelsOf', 'nav.pick', 'nav.choose', 'nav.future', 'nav.future.phase'];
  for (const s of NAV_SECTIONS) {
    keys.push(s.nameKey);
    if (s.future) keys.push(...FUTURE_PLANS[s.id as FutureSection].items.map((i) => i.key));
    else for (const l of APP_LEVELS) keys.push(levelNameKey(s.id as AppSection, l), levelDescKey(s.id as AppSection, l));
  }
  return [...new Set(keys)];
}
