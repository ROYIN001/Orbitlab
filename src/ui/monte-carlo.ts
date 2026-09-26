/**
 * The Monte Carlo window (roadmap G05): a non-modal window over the Engineer mode that flies the
 * mission in the setup panel many times in six-DOF, its vehicle and air dispersed, and shows how
 * accurately the ascent inserts — the orbits at cut-off per guidance law, their 3σ ellipse, the
 * spread of each element, and which dispersion drives it.
 *
 * It is also the app's Monte Carlo runner: WebMCP's `run_monte_carlo` starts, reads and stops the
 * same set (`McpMonteCarloHost`).
 */
import { onLangChange, t } from '../i18n';
import type { MissionConfig } from '../types';
import { missionVehicle } from '../data/vehicles';
import { siteById } from '../data/sites';
import { siteName } from './names';
import {
  cloneDispersions, DEFAULT_DISPERSIONS, DISPERSION_KEYS, DISPERSION_SIGMA_LIMITS, type DispersionKey,
} from '../physics/dispersion';
import {
  defaultMonteCarlo, histogram, MEASURE_POINTS, missionTargetsOf, monteCarloLaws, MONTE_CARLO_RUNS, OUTPUT_KEYS, runsAt, validMonteCarloConfig,
  type Ellipse, type GuidanceLaw, type InsertionTarget, type LawSummary, type MeasurePoint, type MonteCarloConfig, type MonteCarloRun, type OutputKey,
} from '../physics/monte-carlo';
import { MonteCarloJob } from '../physics/monte-carlo-job';
import type { McpMonteCarloHost } from '../mcp';
import './monte-carlo.css';

export interface MonteCarloWindowHost {
  /** The mission the setup panel would fly now. */
  config(): MissionConfig;
}

/** One hue per guidance law, fixed (validated against the chart surface, dark: CVD ΔE ≥ 16). */
export const LAW_COLOR: Readonly<Record<GuidanceLaw, string>> = { standard: '#3593d4', peg: '#d86f3a', igm: '#a674dc' };
const SHARE_COLOR = '#3593d4';
const OTHER_COLOR = '#56657a';
const SURFACE = '#101620';
const GRID = '#26303c';
const AXIS_TEXT = '#96a3b4';
const INK = '#e7edf4';
const LAW_NAME: Readonly<Record<GuidanceLaw, string>> = { standard: 'mc.law.standard', peg: 'guide.law.peg', igm: 'guide.law.igm' };
const OUTPUT_NAME: Readonly<Record<OutputKey, string>> = { perigeeKm: 'mc.out.perigee', apogeeKm: 'mc.out.apogee', inclinationDeg: 'mc.out.inclination', dvLeft: 'mc.out.dv' };
const OUTPUT_UNIT: Readonly<Record<OutputKey, string>> = { perigeeKm: 'km', apogeeKm: 'km', inclinationDeg: '°', dvLeft: 'm/s' };
const OUTPUT_DIGITS: Readonly<Record<OutputKey, number>> = { perigeeKm: 2, apogeeKm: 2, inclinationDeg: 3, dvLeft: 0 };
const REFRESH_MS = 300;

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}
const MINUS = '−';
function num(value: number, digits: number): string {
  if (!Number.isFinite(value)) return '—';
  const text = Math.abs(value).toFixed(digits);
  return (value < 0 && Number(text) !== 0 ? MINUS : '') + text;
}
function signedNum(value: number, digits: number): string {
  if (!Number.isFinite(value)) return '—';
  const text = Math.abs(value).toFixed(digits);
  return Number(text) === 0 ? text : (value < 0 ? MINUS : '+') + text;
}
/** "12 min", "1 h 05 min", "40 s". */
export function duration(seconds: number): string {
  if (!Number.isFinite(seconds)) return '—';
  const s = Math.max(0, Math.round(seconds));
  if (s < 90) return t('mc.time.s', { s });
  const m = Math.round(s / 60);
  if (m < 60) return t('mc.time.min', { m });
  return t('mc.time.h', { h: Math.floor(m / 60), m: String(m % 60).padStart(2, '0') });
}
/** The name of the event that lost a run, short. */
function reasonName(key: string): string {
  if (key.startsWith('error: ')) return t('mc.reason.error', { message: key.slice(7) });
  if (key === 'timeout') return t('mc.reason.timeout');
  const short = t(`tl.${key}`);
  return short !== `tl.${key}` ? short : key;
}

/** A canvas sized to its box at the screen's pixel ratio, cleared to the chart surface. */
function prepare(canvas: HTMLCanvasElement): { g: CanvasRenderingContext2D; w: number; h: number } {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = canvas.clientWidth || 320, h = canvas.clientHeight || 200;
  if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) { canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); }
  const g = canvas.getContext('2d')!;
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.fillStyle = SURFACE; g.fillRect(0, 0, w, h);
  return { g, w, h };
}
/** Round tick values over [lo, hi]. */
export function ticks(lo: number, hi: number, count = 5): number[] {
  if (!(hi > lo)) return [lo];
  const raw = (hi - lo) / count, mag = 10 ** Math.floor(Math.log10(raw)), step = [1, 2, 2.5, 5, 10].map((k) => k * mag).find((s) => s >= raw) ?? raw;
  const out: number[] = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi + step * 1e-9; v += step) out.push(+v.toFixed(10));
  return out;
}
function tickText(v: number, span: number): string {
  const digits = span >= 50 ? 0 : span >= 5 ? 1 : span >= 0.5 ? 2 : 3;
  return num(v, digits);
}
/** The points of a k-σ ellipse, for drawing. */
export function ellipsePoints(e: Ellipse, n = 72): { x: number; y: number }[] {
  const c = Math.cos(e.angle), s = Math.sin(e.angle);
  return Array.from({ length: n + 1 }, (_, i) => {
    const th = 2 * Math.PI * i / n, u = e.a * Math.cos(th), v = e.b * Math.sin(th);
    return { x: e.cx + u * c - v * s, y: e.cy + u * s + v * c };
  });
}

interface Frame { x0: number; x1: number; y0: number; y1: number; padL: number; padT: number; pw: number; ph: number }
function axes(g: CanvasRenderingContext2D, w: number, h: number, x: [number, number], y: [number, number], xLabel: string, yLabel: string): Frame {
  const padL = 52, padR = 12, padT = 12, padB = 34, pw = w - padL - padR, ph = h - padT - padB;
  const f: Frame = { x0: x[0], x1: x[1], y0: y[0], y1: y[1], padL, padT, pw, ph };
  g.strokeStyle = GRID; g.lineWidth = 1; g.fillStyle = AXIS_TEXT; g.font = '10px ui-monospace, monospace';
  for (const v of ticks(y[0], y[1])) {
    const py = sy(f, v);
    g.beginPath(); g.moveTo(padL, py + 0.5); g.lineTo(padL + pw, py + 0.5); g.stroke();
    g.textAlign = 'right'; g.fillText(tickText(v, y[1] - y[0]), padL - 5, py + 3);
  }
  for (const v of ticks(x[0], x[1])) {
    const px = sx(f, v);
    g.beginPath(); g.moveTo(px + 0.5, padT); g.lineTo(px + 0.5, padT + ph); g.stroke();
    g.textAlign = 'center'; g.fillText(tickText(v, x[1] - x[0]), px, padT + ph + 13);
  }
  g.font = '11px system-ui, sans-serif'; g.textAlign = 'center'; g.fillText(xLabel, padL + pw / 2, h - 4);
  g.save(); g.translate(11, padT + ph / 2); g.rotate(-Math.PI / 2); g.fillText(yLabel, 0, 0); g.restore();
  return f;
}
const sx = (f: Frame, x: number) => f.padL + (x - f.x0) / (f.x1 - f.x0) * f.pw;
const sy = (f: Frame, y: number) => f.padT + (1 - (y - f.y0) / (f.y1 - f.y0)) * f.ph;
function padded(values: number[], frac = 0.08): [number, number] {
  const finite = values.filter(Number.isFinite);
  if (!finite.length) return [0, 1];
  let lo = Math.min(...finite), hi = Math.max(...finite);
  if (hi - lo < 1e-9) { lo -= 0.5; hi += 0.5; }
  const p = (hi - lo) * frac;
  return [lo - p, hi + p];
}

interface HoverPoint { x: number; y: number; text: string }

export class MonteCarloWindow implements McpMonteCarloHost {
  readonly el: HTMLDialogElement;
  job: MonteCarloJob | null = null;
  private config: MonteCarloConfig = defaultMonteCarlo();
  /** the law the histograms and the sensitivity show */
  private law: GuidanceLaw = 'standard';
  /** where the runs' orbits are read: the end of the mission, or the ascent's cut-off */
  private point: MeasurePoint = 'final';
  private pointBar = el('div', 'mc-points');
  private pointNote = el('p', 'mc-note');
  private head = el('header', 'mc-head');
  private eyebrow = el('span', 'eyebrow');
  private titleEl = el('h2', 'mc-title');
  private statusEl = el('span', 'mc-status');
  private closeBtn = el('button', 'dialog-close mc-close');
  private intro = el('p', 'mc-intro');
  private mission = el('p', 'mc-mission');
  private form = el('fieldset', 'mc-form');
  private runsInput = el('input');
  private seedInput = el('input');
  private compareInput = el('input');
  private dispersionRows = new Map<DispersionKey, { enabled: HTMLInputElement; sigma: HTMLInputElement; row: HTMLTableRowElement }>();
  private defaultsBtn = el('button', 'btn mc-defaults');
  private startBtn = el('button', 'btn primary mc-start');
  private stopBtn = el('button', 'btn mc-stop');
  private progress = el('progress', 'mc-progress');
  private progressText = el('span', 'mc-progress-text');
  private formError = el('p', 'mc-error');
  private results = el('div', 'mc-results');
  private empty = el('p', 'mc-empty');
  private summaryTable = el('table', 'mc-summary');
  private legend = el('div', 'mc-legend');
  private scatter = el('canvas', 'mc-scatter');
  private scatterTitle = el('h3', 'mc-chart-title');
  private lawBar = el('div', 'mc-laws');
  private histTitle = el('h3', 'mc-chart-title');
  private hists = Object.fromEntries(OUTPUT_KEYS.map((k) => [k, el('canvas', 'mc-hist')])) as Record<OutputKey, HTMLCanvasElement>;
  private sensTitle = el('h3', 'mc-chart-title');
  private sensNote = el('p', 'mc-note');
  private sens = el('div', 'mc-sens');
  private lost = el('p', 'mc-lost');
  private csvBtn = el('button', 'btn mc-csv');
  private tooltip = el('div', 'mc-tooltip');
  private hover = new Map<HTMLCanvasElement, HoverPoint[]>();
  private opener: HTMLElement | null = null;
  private lastRender = -Infinity;
  private pending = false;
  private drag: { dx: number; dy: number; id: number } | null = null;

  constructor(private host: MonteCarloWindowHost) {
    this.el = el('dialog', 'monte-carlo');
    this.el.setAttribute('aria-labelledby', 'monte-carlo-title');
    this.titleEl.id = 'monte-carlo-title';
    const heading = el('div', 'mc-heading'); heading.append(this.eyebrow, this.titleEl);
    this.closeBtn.type = 'button'; this.closeBtn.textContent = '×';
    this.closeBtn.addEventListener('click', () => this.close());
    this.head.append(heading, this.statusEl, this.closeBtn);
    this.buildForm();
    const controls = el('div', 'mc-controls');
    for (const b of [this.startBtn, this.stopBtn, this.defaultsBtn, this.csvBtn]) b.type = 'button';
    this.startBtn.addEventListener('click', () => this.startFromForm());
    this.stopBtn.addEventListener('click', () => this.stop());
    this.defaultsBtn.addEventListener('click', () => { this.config = defaultMonteCarlo(); this.fillForm(); this.render(true); });
    this.csvBtn.addEventListener('click', () => this.downloadCsv());
    this.progress.max = 1; this.progress.value = 0;
    controls.append(this.startBtn, this.stopBtn, this.progress, this.progressText);
    const scatterBox = el('div', 'mc-chart'); scatterBox.append(this.scatterTitle, this.legend, this.scatter);
    const histBox = el('div', 'mc-chart'); const histGrid = el('div', 'mc-hists');
    for (const k of OUTPUT_KEYS) histGrid.append(this.hists[k]);
    histBox.append(this.histTitle, this.lawBar, histGrid);
    const sensBox = el('div', 'mc-chart mc-sens-box'); sensBox.append(this.sensTitle, this.sensNote, this.sens);
    const grid = el('div', 'mc-grid'); grid.append(scatterBox, histBox);
    const actions = el('div', 'mc-actions'); actions.append(this.csvBtn);
    this.pointBar.setAttribute('role', 'group');
    this.results.append(this.pointBar, this.pointNote, this.summaryTable, grid, sensBox, this.lost, actions);
    this.el.append(this.head, this.intro, this.mission, this.form, this.formError, controls, this.empty, this.results, this.tooltip);
    this.el.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.preventDefault(); this.close(); } });
    this.head.addEventListener('pointerdown', (e) => this.startDrag(e));
    this.head.addEventListener('pointermove', (e) => this.moveDrag(e));
    this.head.addEventListener('pointerup', () => { this.drag = null; });
    this.head.addEventListener('pointercancel', () => { this.drag = null; });
    for (const canvas of [this.scatter, ...Object.values(this.hists)]) {
      canvas.addEventListener('pointermove', (e) => this.showTip(canvas, e));
      canvas.addEventListener('pointerleave', () => { this.tooltip.hidden = true; });
    }
    this.tooltip.hidden = true;
    document.body.append(this.el);
    onLangChange(() => { if (this.isOpen) this.render(true); });
  }

  get isOpen(): boolean { return this.el.open; }

  open(opener: HTMLElement | null = null): void {
    this.opener = opener;
    if (!this.el.open) { if (typeof this.el.show === 'function') this.el.show(); else this.el.setAttribute('open', ''); }
    if (!this.job || this.job.state !== 'running') this.fillForm();
    this.render(true);
    this.closeBtn.focus();
  }

  close(): void {
    if (!this.el.open) return;
    if (typeof this.el.close === 'function') this.el.close(); else this.el.removeAttribute('open');
    this.tooltip.hidden = true;
    const o = this.opener; this.opener = null;
    if (o && document.contains(o)) o.focus();
  }

  // --- the runner (McpMonteCarloHost) ---

  settings(): MonteCarloConfig {
    return { ...this.config, dispersions: cloneDispersions(this.config.dispersions) };
  }

  start(mc: MonteCarloConfig): MonteCarloJob | string {
    if (this.job?.state === 'running') return t('mc.busy');
    if (!validMonteCarloConfig(mc)) return t('mc.invalid');
    const cfg = this.host.config();
    if (cfg.orbit.suborbital) return t('mc.suborbital');
    try {
      this.config = { ...mc, dispersions: cloneDispersions(mc.dispersions) };
      this.job = new MonteCarloJob(cfg, this.config, { onChange: () => this.schedule() });
    } catch (error) {
      return error instanceof Error ? error.message : String(error);
    }
    this.law = this.job.laws[0];
    if (this.isOpen) { this.fillForm(); this.render(true); }
    return this.job;
  }

  stop(): void {
    this.job?.stop();
    this.render(true);
  }

  // --- the form ---

  private buildForm(): void {
    const top = el('div', 'mc-form-top');
    const field = (label: HTMLElement, input: HTMLElement) => { const l = el('label', 'mc-field'); l.append(label, input); return l; };
    this.runsInput.type = 'number'; this.runsInput.min = String(MONTE_CARLO_RUNS.min); this.runsInput.max = String(MONTE_CARLO_RUNS.max); this.runsInput.step = '1';
    this.seedInput.type = 'number'; this.seedInput.min = '0'; this.seedInput.max = '4294967295'; this.seedInput.step = '1';
    this.compareInput.type = 'checkbox';
    const compare = el('label', 'mc-check'); compare.append(this.compareInput, el('span'));
    top.append(field(el('span'), this.runsInput), field(el('span'), this.seedInput), compare);
    const table = el('table', 'mc-dispersions');
    const headRow = el('tr');
    for (let i = 0; i < 4; i++) headRow.append(el('th'));
    table.append(el('thead'), el('tbody'));
    table.tHead!.append(headRow);
    for (const key of DISPERSION_KEYS) {
      const row = el('tr'), enabled = el('input'), sigma = el('input');
      enabled.type = 'checkbox';
      sigma.type = 'number'; sigma.step = key === 'isp' ? '0.1' : '0.5';
      sigma.min = String(DISPERSION_SIGMA_LIMITS[key][0]); sigma.max = String(DISPERSION_SIGMA_LIMITS[key][1]);
      const name = el('td', 'mc-q'), on = el('td'), sig = el('td'), unit = el('td', 'mc-unit');
      on.append(enabled);
      if (key === 'imu') sig.append(el('span', 'mc-dash', '—')); else sig.append(sigma);
      row.append(name, on, sig, unit);
      table.tBodies[0].append(row);
      this.dispersionRows.set(key, { enabled, sigma, row });
    }
    this.form.append(el('legend'), top, table, this.defaultsBtn);
  }

  private fillForm(): void {
    const c = this.config;
    this.runsInput.value = String(c.runs); this.seedInput.value = String(c.seed); this.compareInput.checked = c.compareLaws;
    for (const [key, r] of this.dispersionRows) { r.enabled.checked = c.dispersions[key].enabled; r.sigma.value = String(c.dispersions[key].sigma); }
    this.formError.hidden = true;
  }

  private readForm(): MonteCarloConfig | string {
    const runs = Number(this.runsInput.value), seed = Number(this.seedInput.value);
    if (!Number.isInteger(runs) || runs < MONTE_CARLO_RUNS.min || runs > MONTE_CARLO_RUNS.max) return t('mc.err.runs', { min: MONTE_CARLO_RUNS.min, max: MONTE_CARLO_RUNS.max });
    if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) return t('mc.err.seed');
    const dispersions = cloneDispersions(DEFAULT_DISPERSIONS);
    for (const [key, r] of this.dispersionRows) {
      const [lo, hi] = DISPERSION_SIGMA_LIMITS[key];
      const sigma = key === 'imu' ? 0 : Number(r.sigma.value);
      if (!Number.isFinite(sigma) || sigma < lo || sigma > hi) return t('mc.err.sigma', { name: t(`mc.q.${key}`), min: lo, max: hi });
      dispersions[key] = { enabled: r.enabled.checked, sigma };
    }
    return { runs, seed, compareLaws: this.compareInput.checked, dispersions };
  }

  private startFromForm(): void {
    const mc = this.readForm();
    const started = typeof mc === 'string' ? mc : this.start(mc);
    this.formError.hidden = typeof started !== 'string';
    if (typeof started === 'string') this.formError.textContent = started;
    this.render(true);
  }

  private downloadCsv(): void {
    const job = this.job;
    if (!job) return;
    const blob = new Blob([job.csv()], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `orbitlab_montecarlo_${job.cfg.vehicleId}_${job.cfg.orbit.id}_seed${job.mc.seed}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  // --- rendering ---

  private schedule(): void {
    if (!this.isOpen || this.pending) return;
    this.pending = true;
    const wait = Math.max(0, REFRESH_MS - (performance.now() - this.lastRender));
    setTimeout(() => { this.pending = false; this.render(false); }, wait);
  }

  private render(force: boolean): void {
    if (!this.isOpen) return;
    const now = performance.now();
    if (!force && now - this.lastRender < REFRESH_MS) { this.schedule(); return; }
    this.lastRender = now;
    this.chrome();
    const job = this.job, running = job?.state === 'running';
    this.form.disabled = running;
    this.startBtn.disabled = running;
    this.stopBtn.disabled = !running;
    this.csvBtn.disabled = !job?.runs.length;
    const p = job?.progress();
    this.progress.value = p ? p.done / p.total : 0;
    this.progressText.textContent = job && p ? t(running ? 'mc.progress.running' : `mc.progress.${job.state}`, {
      done: p.done, total: p.total, workers: job.workerCount, eta: p.etaS === null ? '…' : duration(p.etaS),
    }) : '';
    this.statusEl.textContent = job ? t(`mc.state.${job.state}`) : '';
    this.statusEl.dataset.state = job?.state ?? '';
    this.renderMission();
    const summary = job?.runs.length ? job.summary() : null;
    this.empty.hidden = !!summary;
    this.results.hidden = !summary;
    if (!summary || !job) return;
    if (!job.laws.includes(this.law)) this.law = job.laws[0];
    const point = this.point, target = summary.targets[point];
    this.renderPointBar();
    this.renderTable(summary.laws, target);
    this.renderLegend(job.laws);
    this.drawScatter(runsAt(job.runs, point), summary.laws, target);
    this.renderLawBar(job.laws);
    const lawRuns = runsAt(job.runs.filter((r) => r.law === this.law), point);
    for (const k of OUTPUT_KEYS) this.drawHistogram(this.hists[k], k, lawRuns, target);
    this.renderSensitivity(summary.laws.find((l) => l.law === this.law));
    this.renderLost(summary.laws);
  }

  /** The localised text that does not change with the results. */
  private chrome(): void {
    this.eyebrow.textContent = t('mc.eyebrow');
    this.titleEl.textContent = t('mc.title');
    this.head.title = t('loop.drag');
    this.closeBtn.title = t('misc.close'); this.closeBtn.setAttribute('aria-label', t('misc.close'));
    this.intro.textContent = t('mc.intro');
    (this.form.querySelector('legend') as HTMLLegendElement).textContent = t('mc.settings');
    const labels = this.form.querySelectorAll('.mc-field > span');
    labels[0].textContent = t('mc.runs'); labels[1].textContent = t('mc.seed');
    (this.compareInput.nextElementSibling as HTMLElement).textContent = t('mc.compare');
    const heads = this.form.querySelectorAll('.mc-dispersions th');
    ['mc.col.quantity', 'mc.col.on', 'mc.col.sigma', 'mc.col.unit'].forEach((k, i) => { heads[i].textContent = t(k); });
    const nav = !!this.host.config().dynamics?.navigation;
    for (const [key, r] of this.dispersionRows) {
      const cells = r.row.cells;
      cells[0].textContent = t(`mc.q.${key}`);
      cells[0].title = t(`mc.q.${key}.about`);
      cells[3].textContent = key === 'wind' ? t('mc.unit.wind') : key === 'imu' ? (nav ? t('mc.unit.imu') : t('mc.unit.noImu')) : '%';
      r.enabled.setAttribute('aria-label', t(`mc.q.${key}`));
      r.sigma.setAttribute('aria-label', `${t(`mc.q.${key}`)} — ${t('mc.col.sigma')}`);
    }
    this.defaultsBtn.textContent = t('mc.defaults');
    this.startBtn.textContent = t('mc.start');
    this.stopBtn.textContent = t('mc.stop');
    this.csvBtn.textContent = t('mc.csv');
    this.empty.textContent = t('mc.empty');
    this.scatterTitle.textContent = t('mc.chart.scatter');
    this.histTitle.textContent = t('mc.chart.hist');
    this.sensTitle.textContent = t('mc.chart.sens');
  }

  private renderMission(): void {
    const job = this.job, cfg = job?.cfg ?? this.host.config();
    let targets: Record<MeasurePoint, InsertionTarget> | null = job?.targets ?? null;
    if (!targets && !cfg.orbit.suborbital) { try { targets = missionTargetsOf(cfg); } catch { targets = null; } }
    const laws = job?.laws ?? monteCarloLaws(cfg, { compareLaws: this.compareInput.checked });
    const km = (v: number | undefined) => (v === undefined ? '—' : num(v, 0));
    this.mission.textContent = t('mc.mission', {
      vehicle: missionVehicle(cfg).name, site: siteName(siteById(cfg.siteId)),
      pe: km(targets?.final.perigeeKm), ap: km(targets?.final.apogeeKm), inc: targets ? num(targets.final.inclinationDeg, 2) : '—',
      ipe: km(targets?.cutoff.perigeeKm), iap: km(targets?.cutoff.apogeeKm),
      laws: laws.map((l) => t(LAW_NAME[l])).join(', '),
    });
  }

  /** The end of the mission, or the ascent's cut-off. */
  private renderPointBar(): void {
    this.pointBar.setAttribute('aria-label', t('mc.point.label'));
    this.pointBar.replaceChildren(...MEASURE_POINTS.map((point) => {
      const b = el('button', 'mc-point-btn', t(`mc.point.${point}`)); b.type = 'button';
      b.setAttribute('aria-pressed', String(point === this.point));
      b.addEventListener('click', () => { this.point = point; this.render(true); });
      return b;
    }));
    this.pointNote.textContent = t(`mc.point.about.${this.point}`);
  }

  private renderTable(laws: readonly LawSummary[], target: InsertionTarget): void {
    const head = el('tr');
    head.append(el('th', undefined, t('mc.col.law')), el('th', undefined, t('mc.col.runs')), el('th', undefined, t('mc.col.inserted')),
      el('th', undefined, t('mc.col.onTarget')));
    for (const k of OUTPUT_KEYS) {
      const th = el('th', undefined, `${t(OUTPUT_NAME[k])} (${OUTPUT_UNIT[k]})`);
      if (k !== 'dvLeft') th.title = t('mc.col.target', { v: num(k === 'perigeeKm' ? target.perigeeKm : k === 'apogeeKm' ? target.apogeeKm : target.inclinationDeg, OUTPUT_DIGITS[k]) });
      head.append(th);
    }
    const rows = laws.map((l) => {
      const tr = el('tr'), name = el('td', 'mc-law');
      const dot = el('i'); dot.style.background = LAW_COLOR[l.law];
      name.append(dot, t(LAW_NAME[l.law]));
      tr.append(name, el('td', 'mc-num', String(l.runs)),
        el('td', 'mc-num', `${num(100 * l.inserted / Math.max(1, l.runs), 1)} %`),
        el('td', 'mc-num', `${num(100 * l.onTarget / Math.max(1, l.runs), 1)} %`));
      for (const k of OUTPUT_KEYS) {
        const s = l.points[this.point].stats[k], d = OUTPUT_DIGITS[k] + (k === 'dvLeft' ? 0 : 1);
        const cell = el('td', 'mc-num');
        if (!s.n) { cell.textContent = '—'; tr.append(cell); continue; }
        cell.append(el('span', 'mc-mean', num(s.mean, OUTPUT_DIGITS[k])), el('span', 'mc-sigma', ` ± ${num(3 * s.sigma, d)}`));
        if (s.bias !== undefined) cell.append(el('span', 'mc-bias', ` (${signedNum(s.bias, d)})`));
        tr.append(cell);
      }
      return tr;
    });
    const caption = el('caption', undefined, t(`mc.table.caption.${this.point}`));
    this.summaryTable.replaceChildren(caption, el('thead'), el('tbody'));
    this.summaryTable.tHead!.append(head);
    this.summaryTable.tBodies[0].append(...rows);
  }

  private renderLegend(laws: readonly GuidanceLaw[]): void {
    const items = laws.map((law) => {
      const item = el('span', 'mc-legend-item'), dot = el('i');
      dot.style.background = LAW_COLOR[law];
      item.append(dot, t(LAW_NAME[law]));
      return item;
    });
    const target = el('span', 'mc-legend-item'), cross = el('b', 'mc-cross', '+');
    target.append(cross, t(`mc.target.${this.point}`));
    const ellipse = el('span', 'mc-legend-item', t('mc.ellipse'));
    this.legend.replaceChildren(...items, target, ellipse);
  }

  private renderLawBar(laws: readonly GuidanceLaw[]): void {
    this.lawBar.hidden = laws.length < 2;
    if (laws.length < 2) { this.lawBar.replaceChildren(); return; }
    this.lawBar.setAttribute('role', 'group');
    this.lawBar.setAttribute('aria-label', t('mc.col.law'));
    this.lawBar.replaceChildren(...laws.map((law) => {
      const b = el('button', 'mc-law-btn', t(LAW_NAME[law])); b.type = 'button';
      b.style.setProperty('--law', LAW_COLOR[law]);
      b.setAttribute('aria-pressed', String(law === this.law));
      b.addEventListener('click', () => { this.law = law; this.render(true); });
      return b;
    }));
  }

  private drawScatter(runs: readonly MonteCarloRun[], laws: readonly LawSummary[], target: InsertionTarget): void {
    const { g, w, h } = prepare(this.scatter);
    const point = this.point, inserted = runs.filter((r) => Number.isFinite(r[point]!.apogeeKm));
    const ellipses = laws.filter((l) => l.points[point].ellipse).map((l) => ({ law: l.law, pts: ellipsePoints(l.points[point].ellipse!) }));
    const xs = [...inserted.map((r) => r[point]!.perigeeKm), target.perigeeKm, ...ellipses.flatMap((e) => e.pts.map((p) => p.x))];
    const ys = [...inserted.map((r) => r[point]!.apogeeKm), target.apogeeKm, ...ellipses.flatMap((e) => e.pts.map((p) => p.y))];
    const f = axes(g, w, h, padded(xs), padded(ys), t('mc.axis.perigee'), t('mc.axis.apogee'));
    g.save(); g.beginPath(); g.rect(f.padL, f.padT, f.pw, f.ph); g.clip();
    for (const e of ellipses) {
      g.beginPath();
      e.pts.forEach((p, i) => (i ? g.lineTo(sx(f, p.x), sy(f, p.y)) : g.moveTo(sx(f, p.x), sy(f, p.y))));
      g.fillStyle = `${LAW_COLOR[e.law]}1a`; g.fill();
      g.strokeStyle = LAW_COLOR[e.law]; g.lineWidth = 2; g.lineJoin = 'round'; g.stroke();
    }
    const hover: HoverPoint[] = [];
    for (const r of inserted) {
      const o = r[point]!, px = sx(f, o.perigeeKm), py = sy(f, o.apogeeKm);
      g.beginPath(); g.arc(px, py, 4, 0, 2 * Math.PI);
      g.fillStyle = LAW_COLOR[r.law]; g.fill();
      g.lineWidth = 2; g.strokeStyle = SURFACE; g.stroke();
      hover.push({ x: px, y: py, text: t('mc.tip.run', { n: r.index + 1, law: t(LAW_NAME[r.law]), pe: num(o.perigeeKm, 2), ap: num(o.apogeeKm, 2),
        inc: num(o.inclinationDeg, 3), dv: num(o.dvLeft, 0) }) });
    }
    const tx = sx(f, target.perigeeKm), ty = sy(f, target.apogeeKm);
    g.strokeStyle = INK; g.lineWidth = 2;
    g.beginPath(); g.moveTo(tx - 7, ty); g.lineTo(tx + 7, ty); g.moveTo(tx, ty - 7); g.lineTo(tx, ty + 7); g.stroke();
    g.restore();
    this.hover.set(this.scatter, hover);
    this.scatter.setAttribute('role', 'img');
    this.scatter.setAttribute('aria-label', t('mc.chart.scatter'));
  }

  private drawHistogram(canvas: HTMLCanvasElement, key: OutputKey, runs: readonly MonteCarloRun[], target: InsertionTarget): void {
    const { g, w, h } = prepare(canvas);
    const values = runs.map((r) => r[this.point]![key]).filter(Number.isFinite);
    const aim = key === 'perigeeKm' ? target.perigeeKm : key === 'apogeeKm' ? target.apogeeKm : key === 'inclinationDeg' ? target.inclinationDeg : undefined;
    const bins = Math.max(6, Math.min(24, Math.round(Math.sqrt(values.length) * 1.5)));
    const [lo, hi] = padded([...values, ...(aim !== undefined ? [aim] : [])], 0.04);
    const hist = values.length ? histogram(values, bins, lo, hi) : { lo, hi, counts: new Array<number>(bins).fill(0) };
    const top = Math.max(1, ...hist.counts);
    const f = axes(g, w, h, [lo, hi], [0, top * 1.1], `${t(OUTPUT_NAME[key])} (${OUTPUT_UNIT[key]})`, t('mc.axis.runs'));
    const bw = f.pw / bins, color = LAW_COLOR[this.law], hover: HoverPoint[] = [];
    hist.counts.forEach((c, i) => {
      const x0 = f.padL + i * bw + 1, width = Math.min(24, Math.max(1, bw - 2)), x = x0 + (bw - 2 - width) / 2;
      const y = sy(f, c), base = sy(f, 0);
      if (c > 0) {
        const r = Math.min(4, width / 2, base - y);
        g.beginPath(); g.moveTo(x, base); g.lineTo(x, y + r); g.quadraticCurveTo(x, y, x + r, y); g.lineTo(x + width - r, y);
        g.quadraticCurveTo(x + width, y, x + width, y + r); g.lineTo(x + width, base); g.closePath();
        g.fillStyle = color; g.fill();
      }
      const from = lo + (hi - lo) * i / bins, to = lo + (hi - lo) * (i + 1) / bins;
      hover.push({ x: x0 + bw / 2, y: (y + base) / 2, text: t('mc.tip.bin', { n: c, from: num(from, OUTPUT_DIGITS[key] + 1), to: num(to, OUTPUT_DIGITS[key] + 1), unit: OUTPUT_UNIT[key] }) });
    });
    if (aim !== undefined) {
      const px = sx(f, aim);
      g.strokeStyle = INK; g.globalAlpha = 0.7; g.lineWidth = 1;
      g.beginPath(); g.moveTo(px + 0.5, f.padT); g.lineTo(px + 0.5, f.padT + f.ph); g.stroke();
      g.globalAlpha = 1; g.fillStyle = AXIS_TEXT; g.font = '10px system-ui, sans-serif'; g.textAlign = px > f.padL + f.pw - 50 ? 'right' : 'left';
      g.fillText(t(`mc.target.${this.point}`), px + (g.textAlign === 'right' ? -4 : 4), f.padT + 10);
    }
    this.hover.set(canvas, hover);
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', `${t('mc.chart.hist')}: ${t(OUTPUT_NAME[key])}`);
  }

  private renderSensitivity(law: LawSummary | undefined): void {
    if (!law) { this.sens.replaceChildren(); return; }
    const sensitivity = law.points[this.point].sensitivity, anyOk = OUTPUT_KEYS.some((k) => sensitivity[k].ok);
    this.sensNote.textContent = t(anyOk ? 'mc.sens.note' : 'mc.sens.few', { law: t(LAW_NAME[law.law]) });
    this.sens.replaceChildren(...OUTPUT_KEYS.map((k) => {
      const s = sensitivity[k], box = el('div', 'mc-sens-out');
      box.append(el('h4', undefined, t(OUTPUT_NAME[k])));
      if (!s.ok) { box.append(el('p', 'mc-note', '—')); return box; }
      const rows = (Object.entries(s.shares) as [DispersionKey, number][]).sort((a, b) => b[1] - a[1]);
      const list: [string, number, string][] = [...rows.map(([q, v]) => [t(`mc.q.${q}`), v, SHARE_COLOR] as [string, number, string]), [t('mc.sens.other'), s.other, OTHER_COLOR]];
      for (const [name, value, color] of list) {
        const row = el('div', 'mc-bar-row'), bar = el('span', 'mc-bar'), fill = el('i');
        fill.style.width = `${Math.max(0, Math.min(100, value * 100))}%`; fill.style.background = color;
        bar.append(fill);
        row.append(el('span', 'mc-bar-name', name), bar, el('span', 'mc-bar-val', `${num(value * 100, 0)} %`));
        box.append(row);
      }
      box.append(el('p', 'mc-note', t('mc.sens.r2', { r2: num(s.rSquared, 2) })));
      return box;
    }));
  }

  private renderLost(laws: readonly LawSummary[]): void {
    const parts = laws.filter((l) => l.lost + l.short > 0).map((l) => {
      const reasons = Object.entries(l.reasons).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${reasonName(k)} × ${n}`).join(', ');
      return t('mc.lost.law', { law: t(LAW_NAME[l.law]), lost: l.lost, short: l.short, reasons: reasons || '—' });
    });
    this.lost.hidden = !parts.length;
    this.lost.textContent = parts.join(' · ');
  }

  private showTip(canvas: HTMLCanvasElement, e: PointerEvent): void {
    const points = this.hover.get(canvas) ?? [];
    const box = canvas.getBoundingClientRect(), x = e.clientX - box.left, y = e.clientY - box.top;
    let best: HoverPoint | null = null, bestD = canvas === this.scatter ? 12 : Infinity;
    for (const p of points) {
      const d = canvas === this.scatter ? Math.hypot(p.x - x, p.y - y) : Math.abs(p.x - x);
      if (d < bestD) { bestD = d; best = p; }
    }
    if (!best) { this.tooltip.hidden = true; return; }
    const host = this.el.getBoundingClientRect();
    this.tooltip.textContent = best.text;
    this.tooltip.hidden = false;
    this.tooltip.style.left = `${box.left - host.left + this.el.scrollLeft + best.x + 12}px`;
    this.tooltip.style.top = `${box.top - host.top + this.el.scrollTop + best.y - 10}px`;
  }

  private startDrag(e: PointerEvent): void {
    if ((e.target as HTMLElement).closest('button, input, select')) return;
    const r = this.el.getBoundingClientRect();
    this.drag = { dx: e.clientX - r.left, dy: e.clientY - r.top, id: e.pointerId };
    this.head.setPointerCapture?.(e.pointerId);
  }
  private moveDrag(e: PointerEvent): void {
    if (!this.drag || e.pointerId !== this.drag.id) return;
    const w = this.el.offsetWidth, x = Math.max(8 - w + 80, Math.min(window.innerWidth - 80, e.clientX - this.drag.dx));
    const y = Math.max(0, Math.min(window.innerHeight - 40, e.clientY - this.drag.dy));
    this.el.style.left = `${x}px`; this.el.style.top = `${y}px`; this.el.style.transform = 'none';
  }
}
