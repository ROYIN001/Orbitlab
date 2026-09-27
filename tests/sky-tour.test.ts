/**
 * The Watch level's tour of real satellites (roadmap P2.5): every step's
 * group is in the bundled catalogue and its satellite in that group, the
 * words are in all three languages, and each step shows something the
 * catalogue has (tests/i18n.test.ts holds the dictionaries themselves).
 */
import { describe, expect, it } from 'vitest';
import { SKY_TOUR } from '../src/orbit/sky-tour';
import { PG_WARPS } from '../src/orbit/playground-model';
import { parseSnapshot } from '../src/provider/data-provider';
import { en } from '../src/i18n/en';
import { ru } from '../src/i18n/ru';
import { th } from '../src/i18n/th';

const SNAPSHOT_FILE = import.meta.glob('../public/data/satellites.json', { import: 'default', eager: true }) as Record<string, unknown>;
const snap = parseSnapshot(Object.values(SNAPSHOT_FILE)[0], 'satellites');

describe('the tour of real satellites (P2.5)', () => {
  it.each(SKY_TOUR.map((s) => [s.id, s] as const))('%s has its group and satellite in the catalogue, and its words', (_, s) => {
    const group = snap.data.groups.find((g) => g.id === s.group);
    expect(group, s.group).toBeTruthy();
    expect(group!.sets.length).toBeGreaterThan(0);
    if (s.satnum !== undefined) expect(group!.sets.some((r) => r.NORAD_CAT_ID === s.satnum), `${s.satnum} in ${s.group}`).toBe(true);
    for (const dict of [en, ru, th]) {
      expect(dict[s.titleKey], s.titleKey).toBeTruthy();
      expect(dict[s.textKey], s.textKey).toBeTruthy();
    }
    expect(s.warp).toBeGreaterThan(0);
  });

  it('has each step once, shows the passes and a case study, at paces the clock offers', () => {
    expect(new Set(SKY_TOUR.map((s) => s.id)).size).toBe(SKY_TOUR.length);
    expect(SKY_TOUR.some((s) => s.show === 'reentryCase')).toBe(true);
    expect(SKY_TOUR.some((s) => s.show === 'passes')).toBe(true);
    for (const s of SKY_TOUR) expect(PG_WARPS, s.id).toContain(s.warp);
  });
});
