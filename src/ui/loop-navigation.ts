/**
 * The attitude-loop inspector's navigation tab (roadmap G02): what the
 * flight's inertial navigation believes against the truth — position and
 * velocity errors in the orbit's radial, along-track and cross-track axes,
 * attitude errors in the notation's roll, pitch and yaw — each with the ±3σ
 * its Kalman filter claims; the orbit it believes in against the true one; and
 * the aiding: GNSS fixes and outages, star-tracker attitudes.
 */
import { t } from '../i18n';
import { RAD } from '../physics/constants';
import { elementsFromState } from '../physics/orbital';
import type { NavigationRecord } from '../physics/nav/navigation';
import type { TelemetrySample } from '../physics/sim/types';
import { drawChart, type ChartMarker, type Series } from './charts';
import { fmtTime } from './hud';
import { LOOP_AXES, triple } from './loop-view';
import { getNotation } from './notation';

const RSW_COLOR = ['#6ec8ff', '#8be5cd', '#efa47e'] as const;
/** The inspector's axis colours (loop-inspector.ts). */
const AXIS_COLOR = { roll: '#f2c14e', pitch: '#8be5cd', yaw: '#c792ea' } as const;
const RSW_NAME = ['nav.radial', 'nav.along', 'nav.cross'] as const;
const AXIS_NAME = { roll: 'loop.axis.roll', pitch: 'loop.axis.pitch', yaw: 'loop.axis.yaw' } as const;
const GNSS_NAME = { fix: 'nav.gnss.fix', outage: 'nav.gnss.outage', off: 'nav.gnss.off', failed: 'nav.failed' } as const;
const STAR_NAME = { fix: 'nav.star.fix', unavailable: 'nav.star.unavailable', off: 'nav.star.off', failed: 'nav.failed' } as const;
const MAX_POINTS = 600;

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}
const fixed = (v: number | undefined, digits: number) => (v === undefined || !Number.isFinite(v) ? '—' : v.toFixed(digits));
const size = (v: { x: number; y: number; z: number }) => Math.hypot(v.x, v.y, v.z);

export class LoopNavigation {
  readonly panel = el('section', 'la-panel');
  private charts = { position: el('canvas'), velocity: el('canvas'), attitude: el('canvas'), orbit: el('canvas') };
  private status = el('p', 'la-verdict');
  private table = el('dl', 'la-margins');
  private none = el('p', 'la-none');
  private note = el('p', 'la-note');

  constructor() {
    const plots = el('div', 'la-plots'), side = el('div', 'la-side'), grid = el('div', 'la-grid');
    plots.append(this.charts.position, this.charts.velocity, this.charts.attitude);
    side.append(this.status, this.table, this.charts.orbit);
    grid.append(plots, side);
    this.panel.append(this.none, grid, this.note);
  }

  render(samples: readonly TelemetrySample[], cursor: number): void {
    this.none.textContent = t('nav.none');
    this.note.textContent = t('nav.note');
    const picked: { s: TelemetrySample; n: NavigationRecord }[] = [];
    for (const s of samples) { const n = s.rigid?.navigation; if (n && s.t <= cursor + 1e-9) picked.push({ s, n }); }
    const grid = this.charts.position.parentElement!.parentElement as HTMLElement;
    this.none.hidden = picked.length > 0;
    grid.hidden = picked.length === 0;
    if (!picked.length) return;
    const stride = Math.max(1, Math.ceil(picked.length / MAX_POINTS)), rows = picked.filter((_, i) => i % stride === 0 || i === picked.length - 1);
    const x = rows.map((r) => r.s.t), n = getNotation();
    const envelope = (color: string, sigma: number[]): Series[] => [
      { x, y: sigma.map((v) => 3 * v), color, dash: [3, 3] }, { x, y: sigma.map((v) => -3 * v), color, dash: [3, 3] }];
    // Outages and star-tracker fixes as markers on the time axis.
    const markers: ChartMarker[] = [];
    let wasOutage = false;
    for (const r of rows) {
      const outage = r.n.gnss === 'outage';
      if (outage !== wasOutage && markers.length < 20) markers.push({ x: r.s.t, color: outage ? '#ff6b6b' : '#7ddba0', label: t(outage ? 'nav.mark.outage' : 'nav.mark.fix') });
      wasOutage = outage;
    }
    const rsw = (pick: (r: NavigationRecord) => { x: number; y: number; z: number }, sigma: (r: NavigationRecord) => { x: number; y: number; z: number }) =>
      (['x', 'y', 'z'] as const).flatMap((k, i): Series[] => [
        { x, y: rows.map((r) => pick(r.n)[k]), color: RSW_COLOR[i], label: t(RSW_NAME[i]) },
        ...envelope(RSW_COLOR[i], rows.map((r) => sigma(r.n)[k])),
      ]);
    const base = { timeAxis: true, xLabel: t('tel.xAxis'), cursor, markers };
    drawChart(this.charts.position, rsw((r) => r.positionError, (r) => r.positionSigma), { ...base, title: t('nav.chart.position') });
    drawChart(this.charts.velocity, rsw((r) => r.velocityError, (r) => r.velocitySigma), { ...base, title: t('nav.chart.velocity') });
    // Attitude in the notation's roll, pitch and yaw; σ as magnitudes on the same axes.
    const sigmaAxes = { roll: 'x', pitch: 'z', yaw: 'y' } as const;
    drawChart(this.charts.attitude, LOOP_AXES.flatMap((axis): Series[] => [
      { x, y: rows.map((r) => triple(r.n.attitudeError, n, RAD)[axis]), color: AXIS_COLOR[axis], label: t(AXIS_NAME[axis]) },
      ...envelope(AXIS_COLOR[axis], rows.map((r) => r.n.attitudeSigma[sigmaAxes[axis]] * RAD)),
    ]), { ...base, title: t('nav.chart.attitude') });
    // The orbit the navigation believes in, less the true one.
    const orbitRows = rows.filter((r) => r.s.alt > 50e3);
    drawChart(this.charts.orbit, [
      { x: orbitRows.map((r) => r.s.t), y: orbitRows.map((r) => (elementsFromState(r.n.r, r.n.v).apoapsisAlt - r.s.ap) / 1000), color: '#c792ea', label: t('nav.series.apoapsis') },
      { x: orbitRows.map((r) => r.s.t), y: orbitRows.map((r) => (elementsFromState(r.n.r, r.n.v).periapsisAlt - r.s.pe) / 1000), color: '#6ec8ff', label: t('nav.series.periapsis') },
    ], { timeAxis: true, xLabel: t('tel.xAxis'), cursor, title: t('nav.chart.orbit') });
    // The instant on screen.
    const now = picked[picked.length - 1], r = now.n;
    const inside = (e: { x: number; y: number; z: number }, s: { x: number; y: number; z: number }) =>
      Math.abs(e.x) <= 3 * s.x && Math.abs(e.y) <= 3 * s.y && Math.abs(e.z) <= 3 * s.z;
    const ok = inside(r.positionError, r.positionSigma) && inside(r.velocityError, r.velocitySigma) && inside(r.attitudeError, r.attitudeSigma);
    this.status.className = `la-verdict ${ok ? 'ok' : 'bad'}`;
    this.status.textContent = `${ok ? '✓' : '✗'} ${t(ok ? 'nav.consistent' : 'nav.inconsistent')} · ${fmtTime(r.t)}`;
    const believed = elementsFromState(r.r, r.v), m = t('u.m'), ms = t('u.ms');
    const rowsOut: [string, string][] = [
      [t('nav.row.gnss'), t(GNSS_NAME[r.gnss])],
      [t('nav.row.star'), t(STAR_NAME[r.starTracker])],
      [t('nav.row.position'), `${fixed(size(r.positionError), 2)} ${m}  (3σ ${fixed(3 * size(r.positionSigma), 2)} ${m})`],
      [t('nav.row.velocity'), `${fixed(size(r.velocityError), 3)} ${ms}  (3σ ${fixed(3 * size(r.velocitySigma), 3)} ${ms})`],
      [t('nav.row.attitude'), `${fixed(size(r.attitudeError) * RAD * 3600, 0)}″  (3σ ${fixed(3 * size(r.attitudeSigma) * RAD * 3600, 0)}″)`],
      [t('nav.row.orbit'), now.s.alt > 50e3 ? t('nav.orbitValue', { pe: fixed(believed.periapsisAlt / 1000, 1), ap: fixed(believed.apoapsisAlt / 1000, 1),
        tpe: fixed(now.s.pe / 1000, 1), tap: fixed(now.s.ap / 1000, 1) }) : '—'],
      [t('nav.row.gyroBias'), `${fixed(size(r.gyroBias) * RAD * 3600, 3)} / ${fixed(size(r.gyroBiasEstimate) * RAD * 3600, 3)} ${t('nav.unit.degH')}`],
      [t('nav.row.accelBias'), `${fixed(size(r.accelBias) / 9.80665e-6, 0)} / ${fixed(size(r.accelBiasEstimate) / 9.80665e-6, 0)} µg`],
      [t('nav.row.innovation'), `${fixed(r.innovation.position, 2)} ${m} · ${fixed(r.innovation.velocity, 3)} ${ms} · ${fixed(r.innovation.attitude === undefined ? undefined : r.innovation.attitude * RAD * 3600, 1)}″`],
    ];
    this.table.replaceChildren(...rowsOut.flatMap(([k, v]) => [el('dt', undefined, k), el('dd', undefined, v)]));
  }
}
