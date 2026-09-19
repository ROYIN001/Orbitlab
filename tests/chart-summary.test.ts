import { afterEach, describe, expect, it, vi } from 'vitest';
import { chartDescription, chartStatistics, type Series } from '../src/ui/charts';
import { setLang } from '../src/i18n';

const series = (x: number[], y: number[], label?: string): Series => ({ x, y, label, color: '#fff' });

afterEach(() => {
  vi.stubGlobal('document', { documentElement: {} });
  setLang('en');
  vi.unstubAllGlobals();
});

describe('chart text alternatives', () => {
  it('reports only finite samples inside the displayed window and picks latest by time', () => {
    const data = series([-10, 1, 3, 2, 4, 99, NaN], [-100, 8, 12, 7, Infinity, 999, 500]);
    expect(chartStatistics([data], 0, 4)).toEqual([{ minimum: 7, maximum: 12, latest: 12, latestTime: 3 }]);
    expect(chartStatistics([data], 0, 2)).toEqual([{ minimum: 7, maximum: 8, latest: 7, latestTime: 2 }]);
  });

  it('distinguishes an unavailable series from a valid zero-valued reading', () => {
    const data = [series([1], [NaN]), series([1], [0])];
    expect(chartStatistics(data, 0, 5)).toEqual([null, { minimum: 0, maximum: 0, latest: 0, latestTime: 1 }]);
    const text = chartDescription(data, { title: 'Speed (m/s)', cursor: 2, seriesLabels: ['Inertial speed', 'Airspeed'] }, 0, 5);
    expect(text).toContain('Inertial speed: no plotted data');
    expect(text).toContain('Airspeed: latest plotted sample 0 at 1 s');
    expect(text).toContain('Cursor: 2 s');
  });

  it('describes empty plots and preserves the chart title and displayed range', () => {
    const text = chartDescription([], { title: 'Altitude (km)' }, -10, 60);
    expect(text).toContain('Altitude (km)');
    expect(text).toContain('-10 to 60 s');
    expect(text).toContain('No plotted data');
    expect(text).not.toContain('Cursor');
  });

  it('renders Russian and Thai summaries without unresolved substitutions', () => {
    vi.stubGlobal('document', { documentElement: {} });
    for (const [lang, script] of [['ru', /\p{Script=Cyrillic}/u], ['th', /\p{Script=Thai}/u]] as const) {
      setLang(lang);
      const text = chartDescription([series([10], [12.5])], { title: 'Δv', cursor: 10 }, 0, 20);
      expect(script.test(text)).toBe(true);
      expect(text).not.toMatch(/\{[a-z]+\}/);
      expect(text).not.toContain('tel.chart.');
    }
  });
});
