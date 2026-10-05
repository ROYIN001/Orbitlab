/**
 * The bundle budget's fast half (scripts/bundle-budget.mjs checks the built
 * sizes after `npx vite build`): no build here, only the source and the file
 * of ceilings, read as text (`?raw`, as tests/i18n.test.ts does: no node types).
 */
import { describe, expect, it } from 'vitest';
import reportSource from '../src/ui/report.ts?raw';
import budgetsText from '../budgets.json?raw';

describe('bundle budget', () => {
  it('the flight report imports its chart and download helpers statically', () => {
    // those modules are in the main chunk anyway: an `await import()` of them splits nothing
    expect(reportSource).not.toContain('await import(');
  });

  it('budgets.json parses and every ceiling is a positive number of kB', () => {
    const budgets = JSON.parse(budgetsText) as Record<string, unknown>;
    const entries = Object.entries(budgets).filter(([key]) => !key.startsWith('_'));
    expect(entries.length).toBeGreaterThan(0);
    for (const [group, ceiling] of entries) {
      expect(typeof ceiling, group).toBe('number');
      expect(ceiling as number, group).toBeGreaterThan(0);
    }
    expect(Object.keys(budgets)).toEqual(expect.arrayContaining(['index-*.js', 'precache']));
  });
});

/**
 * CO-1 (M-PLATFORM-063, D-38): the precache is checked as two groups, the
 * app's code (every manifest entry outside `data/`) and the data snapshots
 * under `data/`, each with its own ceiling. The script is plain Node; its pure
 * functions are loaded by path so the test needs no node types.
 */
interface PrecacheGroups { code: number; data: number; total: number }
interface PrecacheLimits { code: number; data: number; dataBaseline: number }
interface PrecacheCheck { failures: string[]; warnings: string[] }
interface BudgetScript {
  DATA_PREFIX: string;
  groupPrecache(entries: { url: string; bytes: number }[]): PrecacheGroups;
  checkPrecacheSplit(groups: PrecacheGroups, limits: PrecacheLimits): PrecacheCheck;
  precacheLimits(budgets: Record<string, unknown>): PrecacheLimits;
}
const SCRIPT = '../scripts/bundle-budget.mjs';
const loadScript = async (): Promise<BudgetScript> => (await import(/* @vite-ignore */ SCRIPT)) as BudgetScript;

// a manifest shaped like the real one: code, textures, lessons and the three snapshots
const manifest = (dataBytes: [number, number, number], codeExtra = 0) => [
  { url: 'assets/index-AbCdEf12.js', bytes: 2_620_300 + codeExtra },
  { url: 'assets/flight.worker-AbCdEf12.js', bytes: 578_400 },
  { url: 'index.html', bytes: 17_567 },
  { url: 'lessons/pack-a.json', bytes: 120_000 },
  { url: 'textures/earth.jpg', bytes: 3_000_000 },
  { url: 'data/earth-orientation.json', bytes: dataBytes[0] },
  { url: 'data/satellites.json', bytes: dataBytes[1] },
  { url: 'data/space-weather.json', bytes: dataBytes[2] },
];
const codeBytes = 2_620_300 + 578_400 + 17_567 + 120_000 + 3_000_000; // 6 336 267 bytes = 6336.267 kB
// ceilings in kB: code at the measured code size rounded up to the whole kB; data with 280 kB of headroom over a 1126.9 kB baseline
const limits: PrecacheLimits = { code: 6337, data: 1406.9, dataBaseline: 1126.9 };

describe('bundle budget: the precache split into code and data/ (CO-1)', () => {
  it('counts every manifest entry once: code plus data equals the old single precache sum', async () => {
    const { groupPrecache, DATA_PREFIX } = await loadScript();
    expect(DATA_PREFIX).toBe('data/');
    const entries = manifest([75_123, 1_018_936, 25_142]);
    const g = groupPrecache(entries);
    expect(g.data).toBe(75_123 + 1_018_936 + 25_142);
    expect(g.code).toBe(codeBytes);
    expect(g.code + g.data).toBe(g.total);
    expect(g.total).toBe(entries.reduce((s, e) => s + e.bytes, 0));
    // only a path under data/ is data: a name that merely contains "data" stays code
    expect(groupPrecache([{ url: 'assets/data-AbCdEf12.js', bytes: 10 }, { url: 'lessons/data/x.json', bytes: 5 }]))
      .toEqual({ code: 15, data: 0, total: 15 });
  });

  it('passes when the data grows within its headroom', async () => {
    const { groupPrecache, checkPrecacheSplit } = await loadScript();
    // refreshed snapshots 1126.9 → 1200.0 kB: 73.1 of 280 kB headroom used (26 %)
    const r = checkPrecacheSplit(groupPrecache(manifest([75_123, 1_099_735, 25_142])), limits);
    expect(r.failures).toEqual([]);
    expect(r.warnings).toEqual([]);
  });

  it('warns, without failing, when the data has used more than 80 % of its headroom', async () => {
    const { groupPrecache, checkPrecacheSplit } = await loadScript();
    // 1126.9 + 0.85 × 280 = 1364.9 kB of data
    const r = checkPrecacheSplit(groupPrecache(manifest([75_123, 1_264_635, 25_142])), limits);
    expect(r.failures).toEqual([]);
    expect(r.warnings).toHaveLength(1);
    expect(r.warnings[0]).toMatch(/80 %/);
    expect(r.warnings[0]).toMatch(/data/);
  });

  it('fails with "data ceiling" when the data is over its ceiling, and says nothing of the code', async () => {
    const { groupPrecache, checkPrecacheSplit } = await loadScript();
    // 1410.0 kB of data against 1406.9 kB
    const r = checkPrecacheSplit(groupPrecache(manifest([75_123, 1_309_735, 25_142])), limits);
    expect(r.failures).toHaveLength(1);
    expect(r.failures[0]).toContain('data ceiling');
    expect(r.failures[0]).not.toContain('code ceiling');
  });

  it('fails with "code ceiling" when the code is over its ceiling, whatever the data', async () => {
    const { groupPrecache, checkPrecacheSplit } = await loadScript();
    // 1.0 kB more code than the code ceiling allows, with the committed (smaller) snapshots
    const r = checkPrecacheSplit(groupPrecache(manifest([75_123, 1_018_936, 25_142], 1_733)), limits);
    expect(r.failures).toHaveLength(1);
    expect(r.failures[0]).toContain('code ceiling');
    expect(r.failures[0]).not.toContain('data ceiling');
  });

  it('budgets.json gives the two ceilings and the data baseline, and they add up to no more than the total precache ceiling', async () => {
    const { precacheLimits } = await loadScript();
    const budgets = JSON.parse(budgetsText) as Record<string, unknown>;
    const l = precacheLimits(budgets);
    expect(l.code).toBeGreaterThan(0);
    expect(l.data).toBeGreaterThan(l.dataBaseline);
    expect(l.code + l.data).toBeLessThanOrEqual(budgets.precache as number);
  });
});
