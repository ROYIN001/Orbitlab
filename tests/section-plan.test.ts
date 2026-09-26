/**
 * S01: the Orbit and Build screens promise what the roadmap plans, no more.
 *
 * Every item on a screen is a roadmap item of docs/ROADMAP-PART2-3.md, in the
 * phase the roadmap puts it in, and every string the screens show exists in
 * all three dictionaries (tests/i18n.test.ts holds the dictionaries to each
 * other; this holds the screens to the dictionaries and the document).
 */
import { describe, expect, it } from 'vitest';
import { en } from '../src/i18n/en';
import { ru } from '../src/i18n/ru';
import { th } from '../src/i18n/th';
import { APP_LEVELS } from '../src/ui/app-mode';
import { PLANNED_SECTIONS, SECTION_PLANS, isPlannedSection } from '../src/ui/section-plan';

const DOCS = import.meta.glob('../docs/ROADMAP-PART2-3.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
const roadmap = Object.values(DOCS)[0] ?? '';

/** The roadmap's items by phase: `## Phase N` headings, then `| **X01** … |` rows. */
function roadmapPhases(): Map<number, Set<string>> {
  const phases = new Map<number, Set<string>>();
  let phase = -1;
  for (const line of roadmap.split('\n')) {
    const heading = /^## Phase (\d+)/.exec(line);
    if (heading) { phase = Number(heading[1]); phases.set(phase, new Set()); continue; }
    if (line.startsWith('## ')) { phase = -1; continue; }
    const row = /^\| \*\*([A-Z]\d\d)\*\*/.exec(line);
    if (row && phase >= 0) phases.get(phase)!.add(row[1]);
  }
  return phases;
}

describe('the sections being built (S01)', () => {
  it('reads the roadmap it is held to', () => {
    expect(roadmap.length).toBeGreaterThan(1000);
    expect([...roadmapPhases().keys()]).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });

  it('lists only roadmap items, each in the phase the roadmap gives it', () => {
    const phases = roadmapPhases();
    for (const section of PLANNED_SECTIONS) {
      for (const phase of SECTION_PLANS[section].phases) {
        const planned = phases.get(phase.phase);
        expect(planned, `phase ${phase.phase}`).toBeDefined();
        for (const item of phase.items) expect(planned!.has(item.id), `${section} ${item.id} in phase ${phase.phase}`).toBe(true);
      }
    }
  });

  it('shows every orbit and design item of the roadmap in its section', () => {
    const phases = roadmapPhases();
    const shown = (section: 'orbit' | 'build') => new Set(SECTION_PLANS[section].phases.flatMap((p) => p.items.map((i) => i.id)));
    const all = [...phases.values()].flatMap((s) => [...s]);
    expect(all.filter((id) => /^[ORML]/.test(id)).filter((id) => !shown('orbit').has(id))).toEqual([]);
    expect(all.filter((id) => /^D/.test(id)).filter((id) => !shown('build').has(id))).toEqual([]);
  });

  it('has every string in English, Russian and Thai', () => {
    const keys = PLANNED_SECTIONS.flatMap((section) => {
      const plan = SECTION_PLANS[section];
      return [plan.nameKey, plan.titleKey, plan.leadKey, ...APP_LEVELS.map((l) => plan.levels[l]),
        ...plan.phases.flatMap((p) => [p.titleKey, ...p.items.map((i) => i.key)])];
    });
    expect(keys.length).toBeGreaterThan(40);
    for (const [name, dict] of Object.entries({ en, ru, th })) {
      expect({ [name]: keys.filter((k) => !dict[k]) }).toEqual({ [name]: [] });
    }
  });

  it('names the item it describes in its key', () => {
    for (const section of PLANNED_SECTIONS) {
      for (const item of SECTION_PLANS[section].phases.flatMap((p) => p.items)) expect(item.key).toBe(`plan.item.${item.id}`);
    }
  });

  it('knows the launch section is not one of them', () => {
    expect(isPlannedSection('launch')).toBe(false);
    expect(isPlannedSection(null)).toBe(false);
    expect(isPlannedSection('orbit')).toBe(true);
    expect(isPlannedSection('build')).toBe(true);
  });
});
