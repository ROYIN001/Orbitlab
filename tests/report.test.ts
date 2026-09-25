/**
 * Chart images and the flight report (roadmap U06): the report is built from
 * plain data, so its content — sections, figures, the mission's set-up, the
 * language — is checked here without a browser.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { setLang } from '../src/i18n';
import { buildFlightReport, reportFileName, type ReportFlight } from '../src/ui/report';
import { reportTelemetryCharts, ascentEnd } from '../src/ui/telemetry-charts';
import { chartFileName, snapshotChart } from '../src/ui/chart-export';
import { darken, PRINT_THEME, SCREEN_THEME } from '../src/ui/charts';
import { planMission } from '../src/physics/mission';
import { siteById } from '../src/data/sites';
import { vehicleById } from '../src/data/vehicles';
import { guidanceForVehicle, DEFAULT_FAILURE } from '../src/physics/defaults';
import { orbitById } from '../src/data/orbits';
import type { MissionConfig } from '../src/types';
import type { TelemetrySample } from '../src/physics/sim/types';
import type { MissionResultModel } from '../src/ui/result-content';

function withLang(lang: 'en' | 'ru' | 'th'): void {
  const g = globalThis as { document?: unknown };
  if (!g.document) g.document = { documentElement: {} };
  setLang(lang);
}
afterEach(() => withLang('en'));

function flight(): ReportFlight {
  const spec = vehicleById('falcon9');
  const cfg: MissionConfig = {
    vehicleId: 'falcon9', siteId: 'cape', satelliteId: 'cubesats', orbit: { ...orbitById('starlink') },
    launchTime: new Date('2026-10-01T13:37:00Z'), guidance: guidanceForVehicle(spec), guidanceResolved: true,
    failure: { ...DEFAULT_FAILURE }, boosterRecovery: false, payloadMassOverride: 5000,
    dynamics: {
      model: 'sixDof', wind: 'crosswind', seed: 1,
      explicitGuidance: { law: 'peg' }, navigation: { grade: 'mems' }, flex: { slosh: true, bending: false },
      controlFaults: { faults: [{ kind: 'gimbalHardover', time: 60, engine: 1, axis: 'pitch', sign: 1 }], fdir: true },
    },
  };
  const plan = planMission(cfg, siteById('cape'), spec);
  const telemetry: TelemetrySample[] = [];
  for (let t = -10; t <= 3000; t += 0.5) {
    telemetry.push({
      t, alt: Math.max(0, t) * 60, vInertial: 408 + Math.max(0, t) * 12, vAir: Math.max(0, t) * 10, q: t > 0 && t < 160 ? 30000 * Math.sin((t / 160) * Math.PI) : 0,
      mach: 0, gLoad: 1 + Math.max(0, Math.min(t, 500)) / 200, mass: 550000 - Math.max(0, Math.min(t, 520)) * 1000, thrust: 0, throttle: 1, pitch: 90 - Math.min(t, 500) / 6,
      ap: t > 500 ? 550e3 : 0, pe: t > 500 ? 548e3 : -6e6, inc: 53, dvRemaining: 9000 - Math.min(t, 520) * 16, downrange: 0, lat: 0, lon: 0, stage: 0, phase: 'ascent',
    });
  }
  return {
    cfg, vehicleSpec: spec, plan, telemetry,
    events: [
      { t: 0, key: 'evt.liftoff', severity: 'info' },
      { t: 72, key: 'evt.maxQ', severity: 'info', params: { q: '30' } },
      { t: 520, key: 'evt.targetOrbit', severity: 'success', params: { pe: '548', ap: '550', inc: '53.0' } },
    ] as ReportFlight['events'],
  };
}

const RESULT: MissionResultModel = {
  outcome: 'target', cause: 'target', displayedTime: 600, outcomeTime: 520, reviewTime: 520, recovery: 'notRequested',
  payloadSeparated: true, issPlaneOnly: false, aeroWarnings: [],
  metrics: [
    { key: 'perigee', target: 550, actual: 548, delta: -2, unit: 'km', outside: false },
    { key: 'apogee', target: 550, actual: 550.4, delta: 0.4, unit: 'km', outside: false },
    { key: 'inclination', target: 53, actual: 53.01, delta: 0.01, unit: 'deg', outside: false },
    { key: 'raan', target: null, actual: 120, delta: null, unit: 'deg', outside: null },
  ],
};

const FIGURE = { title: 'Altitude <h>', src: 'data:image/png;base64,AAAA' };

describe('flight report (U06)', () => {
  it('is one self-contained document: no scripts, nothing fetched', () => {
    const html = buildFlightReport({ flight: flight(), result: RESULT, figures: [FIGURE], link: null, generatedAt: new Date('2026-10-01T15:00:00Z') });
    expect(html.startsWith('<!doctype html>')).toBe(true);
    expect(html).not.toMatch(/<script|<link|@import|src="http/i);
    expect(html).toContain('@page { size: A4');
  });

  it('carries the set-up, the result, the key figures, the events and the numbered figures', () => {
    const html = buildFlightReport({ flight: flight(), result: RESULT, figures: [FIGURE, FIGURE], link: 'https://example.org/Orbitlab/?m=zAbc', generatedAt: new Date() });
    for (const text of ['Mission set-up', 'Result', 'Key figures', 'Flight events', 'Charts', 'Falcon 9', 'Target orbit reached',
      'PEG — Space Shuttle Powered Explicit Guidance', 'MEMS', 'Propellant slosh', 'FDIR', 'Crosswind', 'Full 6-DOF',
      '2026-10-01 13:37 UTC', 'Figure 1.', 'Figure 2.', 'https://example.org/Orbitlab/?m=zAbc', 'T+520.0 s']) {
      expect(html, text).toContain(text);
    }
    // the orbit table: target, actual and the signed difference
    expect(html).toContain('+0.4 km');
    expect(html).toContain('-2.0 km');
    expect(html).toContain('+0.01°');
  });

  it('escapes what it quotes', () => {
    const html = buildFlightReport({ flight: flight(), result: null, figures: [FIGURE], link: null, generatedAt: new Date() });
    expect(html).toContain('Altitude &lt;h&gt;');
    expect(html).not.toContain('Altitude <h>');
    expect(html).toContain('No result yet');
  });

  it.each([['ru', /Исходные данные миссии/, /Рисунок 1\./], ['th', /การตั้งค่าภารกิจ/, /รูปที่ 1/]] as const)('is written in the language on screen (%s)', (lang, heading, figure) => {
    withLang(lang);
    const html = buildFlightReport({ flight: flight(), result: RESULT, figures: [FIGURE], link: null, generatedAt: new Date() });
    expect(html).toMatch(heading);
    expect(html).toMatch(figure);
    expect(html).toContain(`<html lang="${lang}">`);
    expect(html).not.toContain('Mission set-up');
    expect(reportFileName(flight().cfg)).toBe(`orbitlab-report-falcon9-cape-2026-10-01-13-37-${lang}.html`);
  });
});

describe('report charts (U06)', () => {
  it('draws the ascent to 30 s after insertion and the apsides and Δv over the whole flight, decimated', () => {
    const f = flight();
    expect(ascentEnd(f.events, f.telemetry)).toBe(550);
    const charts = reportTelemetryCharts(f);
    expect(charts).toHaveLength(8);
    const altitude = charts[0], apsides = charts[6];
    expect(altitude.opt.xMax).toBe(550);
    expect(apsides.opt.xMax).toBe(3000);
    for (const c of charts) for (const s of c.series) expect(s.x.length).toBeLessThanOrEqual(1501);
    expect(apsides.opt.markers?.some((m) => m.x === 520)).toBe(true);
  });

  it('keeps a copy the panel cannot overwrite', () => {
    const x = [1, 2], y = [3, 4];
    const snap = snapshotChart([{ x, y, color: '#fff' }], { title: 'T', markers: [{ x: 1, color: '#fff' }] });
    x.length = 0; y.push(9);
    expect(snap.series[0].x).toEqual([1, 2]);
    expect(snap.series[0].y).toEqual([3, 4]);
  });

  it('names a PNG after its chart in any script, and darkens the panel colours for paper', () => {
    expect(chartFileName('Altitude h (km)')).toBe('orbitlab-altitude-h-km.png');
    expect(chartFileName('Высота h')).toBe('orbitlab-высота-h.png');
    expect(chartFileName('ความสูง h')).toBe('orbitlab-ความสูง-h.png');
    expect(chartFileName('///')).toBe('orbitlab-chart.png');
    expect(darken('#8be5cd')).toBe('#53897b');
    expect(PRINT_THEME.background).toBe('#ffffff');
    expect(SCREEN_THEME.ink('#8be5cd')).toBe('#8be5cd');
  });
});
