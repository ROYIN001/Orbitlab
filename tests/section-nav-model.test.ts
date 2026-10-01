/**
 * The top bar's section switch (owner, 2026-10-01; src/ui/section-nav-model.ts).
 *
 * What a level is called depends on the section — only the launch section's
 * first level is watching alone — every string the switch shows is in all
 * three dictionaries, a section still to come promises only roadmap items of
 * the phase the roadmap gives them, and the Thai text says "ทดลอง" for the
 * second level wherever it names one, so text written before the rename and
 * merged after it does not bring the old name back.
 */
import { describe, expect, it } from 'vitest';
import { en } from '../src/i18n/en';
import { ru } from '../src/i18n/ru';
import { th } from '../src/i18n/th';
import { APP_SECTIONS } from '../src/ui/app-mode';
import { FUTURE_PLANS, NAV_SECTIONS, levelNameKey, navKeys } from '../src/ui/section-nav-model';

const DOCS = import.meta.glob('../docs/ROADMAP-PART2-3.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
const roadmap = Object.values(DOCS)[0] ?? '';
// Thai text outside the dictionaries: the help, the lessons and the worksheets
const SRC = import.meta.glob(['../src/ui/**/*.ts', '../src/lessons/**/*.ts', '../src/worksheets/**/*.ts'], { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

describe('the section switch', () => {
  it('has a tab for every section, the ones still to come after them', () => {
    const built = NAV_SECTIONS.filter((s) => !s.future).map((s) => s.id);
    expect(built).toEqual([...APP_SECTIONS]);
    const firstFuture = NAV_SECTIONS.findIndex((s) => s.future);
    expect(NAV_SECTIONS.slice(firstFuture).every((s) => s.future)).toBe(true);
  });

  it('calls the first level "watching" in the launch section only', () => {
    expect(levelNameKey('launch', 'watch')).toBe('mode.watch');
    expect(levelNameKey('orbit', 'watch')).toBe('mode.basics');
    expect(levelNameKey('build', 'watch')).toBe('mode.basics');
    for (const s of APP_SECTIONS) {
      expect(levelNameKey(s, 'explore')).toBe('mode.explore');
      expect(levelNameKey(s, 'engineer')).toBe('mode.engineer');
    }
    expect([th['mode.watch'], th['mode.basics'], th['mode.explore'], th['mode.engineer']]).toEqual(['รับชม', 'พื้นฐาน', 'ทดลอง', 'วิศวกร']);
  });

  it('shows only strings all three dictionaries have', () => {
    for (const key of navKeys()) {
      for (const [lang, dict] of Object.entries({ en, ru, th })) {
        expect(dict[key], `${lang}: ${key}`).toBeTruthy();
      }
    }
  });

  it('promises a section still to come only the roadmap items of its phase', () => {
    for (const plan of Object.values(FUTURE_PLANS)) {
      const phase = roadmap.split(/\n## /).find((part) => part.startsWith(`Phase ${plan.phase}:`));
      expect(phase, `roadmap phase ${plan.phase}`).toBeTruthy();
      for (const item of plan.items) expect(phase).toContain(`**${item.id}**`);
    }
  });

  it('leaves no Thai text naming a level by its old name', () => {
    const old = /โหมดสำรวจ|ระดับสำรวจ|สำรวจภารกิจ|ระดับรับชม/;
    const hits = Object.entries(th).filter(([, v]) => old.test(v)).map(([k]) => k);
    for (const [file, text] of Object.entries(SRC)) if (old.test(text)) hits.push(file);
    // this file's own pattern is not in src/
    expect(hits).toEqual([]);
  });
});
