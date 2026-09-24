/**
 * The attitude-loop inspector's guidance tab (roadmap G01): the explicit ascent
 * guidance — PEG or IGM — in flight: its time and velocity to go, the pitch it
 * steers against the standard law's, and the orbit it predicts at cut-off
 * against the target, with its state at the instant on screen.
 */
import { t } from '../i18n';
import type { ExplicitGuidanceRecord } from '../physics/explicit-guidance';
import type { TelemetrySample } from '../physics/sim/types';
import { drawChart, type ChartMarker } from './charts';
import { fmtTime } from './hud';

const MAX_POINTS = 600;
const STATUS_NAME = { standby: 'guide.status.standby', engaged: 'guide.status.engaged', terminal: 'guide.status.terminal',
  short: 'guide.status.short', diverged: 'guide.status.diverged' } as const;
const LAW_NAME = { peg: 'guide.law.peg', igm: 'guide.law.igm' } as const;

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}
const fixed = (v: number | undefined, digits: number) => (v === undefined || !Number.isFinite(v) ? '—' : v.toFixed(digits));

export class LoopGuidance {
  readonly panel = el('section', 'la-panel');
  private charts = { toGo: el('canvas'), pitch: el('canvas'), orbit: el('canvas') };
  private status = el('p', 'la-verdict');
  private table = el('dl', 'la-margins');
  private none = el('p', 'la-none');
  private note = el('p', 'la-note');

  constructor() {
    const plots = el('div', 'la-plots'), side = el('div', 'la-side'), grid = el('div', 'la-grid');
    plots.append(this.charts.toGo, this.charts.pitch);
    side.append(this.status, this.table, this.charts.orbit);
    grid.append(plots, side);
    this.panel.append(this.none, grid, this.note);
  }

  render(samples: readonly TelemetrySample[], cursor: number): void {
    this.none.textContent = t('guide.none');
    this.note.textContent = t('guide.note');
    const picked: { s: TelemetrySample; g: ExplicitGuidanceRecord }[] = [];
    for (const s of samples) if (s.explicitGuidance && s.t <= cursor + 1e-9) picked.push({ s, g: s.explicitGuidance });
    const grid = this.charts.toGo.parentElement!.parentElement as HTMLElement;
    this.none.hidden = picked.length > 0;
    grid.hidden = picked.length === 0;
    if (!picked.length) return;
    const stride = Math.max(1, Math.ceil(picked.length / MAX_POINTS)), rows = picked.filter((_, i) => i % stride === 0 || i === picked.length - 1);
    const x = rows.map((r) => r.s.t);
    // Where it took over, and where it handed back.
    const markers: ChartMarker[] = [];
    let was = 'standby';
    for (const r of rows) {
      if (r.g.status !== was && markers.length < 12) markers.push({ x: r.s.t, color: r.g.status === 'short' || r.g.status === 'diverged' ? '#ff6b6b' : '#7ddba0', label: t(STATUS_NAME[r.g.status]) });
      was = r.g.status;
    }
    const base = { timeAxis: true, xLabel: t('tel.xAxis'), cursor, markers };
    const flying = rows.filter((r) => r.g.tGo !== undefined);
    drawChart(this.charts.toGo, [
      { x: flying.map((r) => r.s.t), y: flying.map((r) => r.g.tGo!), color: '#6ec8ff', label: t('guide.series.tGo') },
      { x: flying.map((r) => r.s.t), y: flying.map((r) => (r.g.vGo ?? NaN) / 10), color: '#efa47e', label: t('guide.series.vGo') },
    ], { ...base, title: t('guide.chart.toGo'), yMin: 0 });
    drawChart(this.charts.pitch, [
      { x, y: rows.map((r) => r.g.standardPitchDeg), color: '#8b98a8', label: t('guide.series.standard'), dash: [4, 3] },
      { x, y: rows.map((r) => r.g.pitchDeg ?? NaN), color: '#8be5cd', label: t(LAW_NAME[rows[0].g.law]) },
      { x, y: rows.map((r) => r.g.yawDeg ?? NaN), color: '#c792ea', label: t('guide.series.yaw') },
    ], { ...base, title: t('guide.chart.pitch') });
    const predicted = rows.filter((r) => r.g.predictedApoapsis !== undefined);
    const px = predicted.map((r) => r.s.t);
    drawChart(this.charts.orbit, [
      { x: px, y: predicted.map((r) => r.g.predictedApoapsis! / 1000), color: '#c792ea', label: t('guide.series.apoapsis') },
      { x: px, y: predicted.map((r) => r.g.predictedPeriapsis! / 1000), color: '#6ec8ff', label: t('guide.series.periapsis') },
      { x: px, y: predicted.map((r) => r.g.targetApoapsis / 1000), color: '#c792ea', dash: [3, 3] },
      { x: px, y: predicted.map((r) => r.g.targetPeriapsis / 1000), color: '#6ec8ff', dash: [3, 3] },
    ], { timeAxis: true, xLabel: t('tel.xAxis'), cursor, title: t('guide.chart.orbit') });
    // The instant on screen.
    const now = picked[picked.length - 1], g = now.g, bad = g.status === 'short' || g.status === 'diverged';
    this.status.className = `la-verdict ${bad ? 'bad' : g.status === 'standby' ? '' : 'ok'}`;
    this.status.textContent = `${t(LAW_NAME[g.law])}: ${t(STATUS_NAME[g.status])} · ${fmtTime(now.s.t)}`;
    const km = (m: number | undefined) => fixed(m === undefined ? undefined : m / 1000, 1);
    const out: [string, string][] = [
      [t('guide.row.tGo'), `${fixed(g.tGo, 1)} ${t('u.s')}`],
      [t('guide.row.vGo'), `${fixed(g.vGo, 0)} ${t('u.ms')}`],
      [t('guide.row.predicted'), t('guide.orbitValue', { pe: km(g.predictedPeriapsis), ap: km(g.predictedApoapsis) })],
      [t('guide.row.target'), t('guide.orbitValue', { pe: km(g.targetPeriapsis), ap: km(g.targetApoapsis) })],
      [t('guide.row.pitch'), `${fixed(g.pitchDeg, 2)}° / ${fixed(g.standardPitchDeg, 2)}°`],
      [t('guide.row.yaw'), `${fixed(g.yawDeg, 2)}°`],
      ...(g.miss !== undefined ? [[t('guide.row.miss'), `${fixed(g.miss, 2)} ${t('u.ms')}`] as [string, string]] : []),
      [t('guide.row.stages'), String(g.stages)],
    ];
    this.table.replaceChildren(...out.flatMap(([k, v]) => [el('dt', undefined, k), el('dd', undefined, v)]));
  }
}
