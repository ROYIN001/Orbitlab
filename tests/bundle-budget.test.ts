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
