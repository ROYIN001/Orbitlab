/**
 * The attitude-loop inspector's analysis tabs (roadmap G04): the loop's
 * frequency response (Bode), its margins at the instant on screen and over the
 * flight, and its response to a 1° attitude step — from the linearisation the
 * runtime records once a second (src/physics/rigid/linear.ts), with a chosen
 * error in the aerodynamic feed-forward.
 */
import { t } from '../i18n';
import { RAD } from '../physics/constants';
import { bode, linearModelAt, margins, PLANE_OF, stepMetrics, stepResponse, type BodePoint, type LinearAxis, type LinearModel, type PlaneMargins, type PlaneModel, type StepResponse } from '../physics/rigid/linear';
import type { TelemetrySample } from '../physics/sim/types';
import { drawChart, type ChartMarker, type Series } from './charts';
import { fmtTime } from './hud';
import { axisLetter, type LoopAxis } from './loop-view';

const PLANE: Record<LoopAxis, LinearAxis> = PLANE_OF;
const AXIS_NAME = { roll: 'loop.axis.roll', pitch: 'loop.axis.pitch', yaw: 'loop.axis.yaw' } as const;
const ACTUATOR = { engines: 'freq.actuator.engines', jets: 'freq.actuator.jets', none: 'freq.actuator.none' } as const;
const STEP_RAD = 1 / RAD;
const STEP_S = 10;
const HISTORY_POINTS = 150;

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}
const fixed = (v: number | undefined, digits: number) => (v === undefined || !Number.isFinite(v) ? '—' : v.toFixed(digits));
/** Tick labels of a log₁₀ axis: 0.01, 0.3, 10, 300 … */
function logTick(x: number): string {
  const v = 10 ** x;
  return v >= 100 ? v.toFixed(0) : v >= 10 ? v.toFixed(0) : v >= 1 ? v.toFixed(1) : v >= 0.1 ? v.toFixed(2) : v.toFixed(3);
}

/** The newest sample at or before the cursor that carries a linearisation. */
export const modelAt = (samples: readonly TelemetrySample[], cursor: number): LinearModel | undefined => linearModelAt(samples, cursor);

export class LoopAnalysis {
  readonly frequencyPanel = el('section', 'la-panel');
  readonly stepPanel = el('section', 'la-panel');
  private ffError = 0;
  private ffInputs: HTMLInputElement[] = [];
  private ffOutputs: HTMLOutputElement[] = [];
  private ffLabels: HTMLElement[] = [];
  private atLines: HTMLElement[] = [];
  private freq = { mag: el('canvas'), phase: el('canvas'), history: el('canvas'), verdict: el('p', 'la-verdict'), table: el('dl', 'la-margins'), model: el('p', 'la-model'),
    none: el('p', 'la-none'), note: el('p', 'la-note'), historyNote: el('p', 'la-model') };
  private step = { angle: el('canvas'), moment: el('canvas'), table: el('dl', 'la-margins'), verdict: el('p', 'la-verdict'), none: el('p', 'la-none'), note: el('p', 'la-note') };
  private bodeCache = new WeakMap<PlaneModel, Map<number, BodePoint[]>>();
  private marginCache = new WeakMap<PlaneModel, Map<number, PlaneMargins>>();
  private stepCache = new WeakMap<PlaneModel, Map<number, StepResponse>>();
  private onChange: () => void = () => {};

  constructor() {
    for (const panel of [this.frequencyPanel, this.stepPanel]) {
      const bar = el('div', 'la-toolbar'), label = el('label', 'la-ff'), text = el('span'), input = el('input'), out = el('output');
      input.type = 'range'; input.min = '-100'; input.max = '100'; input.step = '5'; input.value = '0';
      input.addEventListener('input', () => { this.ffError = Number(input.value) / 100; this.syncFf(); this.onChange(); });
      label.append(text, input, out);
      const at = el('span', 'la-at');
      bar.append(label, at);
      this.ffInputs.push(input); this.ffOutputs.push(out); this.ffLabels.push(text); this.atLines.push(at);
      panel.append(bar);
    }
    const f = this.freq, plots = el('div', 'la-plots'), side = el('div', 'la-side'), grid = el('div', 'la-grid');
    plots.append(f.mag, f.phase);
    side.append(f.verdict, f.table, f.model, f.history, f.historyNote);
    grid.append(plots, side);
    this.frequencyPanel.append(f.none, grid, f.note);
    const s = this.step, plots2 = el('div', 'la-plots'), side2 = el('div', 'la-side'), grid2 = el('div', 'la-grid');
    plots2.append(s.angle, s.moment); side2.append(s.verdict, s.table);
    grid2.append(plots2, side2);
    this.stepPanel.append(s.none, grid2, s.note);
    this.syncFf();
  }

  /** Called when the feed-forward error changes, to redraw. */
  setOnChange(fn: () => void): void { this.onChange = fn; }

  private syncFf(): void {
    const pct = Math.round(this.ffError * 100);
    for (const input of this.ffInputs) input.value = String(pct);
    for (const out of this.ffOutputs) out.textContent = `${pct > 0 ? '+' : ''}${pct} %`;
  }

  private cached<T>(cache: WeakMap<PlaneModel, Map<number, T>>, plane: PlaneModel, compute: () => T): T {
    let byFf = cache.get(plane);
    if (!byFf) { byFf = new Map(); cache.set(plane, byFf); }
    let value = byFf.get(this.ffError);
    if (value === undefined) { value = compute(); byFf.set(this.ffError, value); }
    return value;
  }
  private marginsOf(model: LinearModel, axis: LinearAxis): PlaneMargins {
    return this.ffError === 0 ? model.margins[axis] : this.cached(this.marginCache, model.planes[axis], () => margins(model.planes[axis], model.T, this.ffError));
  }

  private chrome(axis: LoopAxis, model: LinearModel | undefined): void {
    for (const label of this.ffLabels) label.textContent = t('freq.ff');
    for (const input of this.ffInputs) input.title = t('freq.ffNote');
    const at = model ? t('freq.at', { t: fmtTime(model.t), axis: `${t(AXIS_NAME[axis])} (${axisLetter(axis)})` }) : '';
    for (const line of this.atLines) line.textContent = at;
    this.freq.none.textContent = t('freq.none');
    this.step.none.textContent = t('freq.none');
    this.freq.note.textContent = t('freq.assumptions');
    this.step.note.textContent = t('step.note');
    this.freq.historyNote.textContent = t('freq.historyNote');
  }

  renderFrequency(axis: LoopAxis, samples: readonly TelemetrySample[], cursor: number): void {
    const model = modelAt(samples, cursor), f = this.freq, active = !!model && model.planes[PLANE[axis]].actuator !== 'none';
    this.chrome(axis, model);
    if (model && !active) f.none.textContent = t('freq.noActuator');
    f.none.hidden = active;
    (f.mag.parentElement!.parentElement as HTMLElement).hidden = !active;
    if (!model || !active) return;
    const planeAxis = PLANE[axis], plane = model.planes[planeAxis], T = model.T;
    const curve = this.cached(this.bodeCache, plane, () => bode(plane, T, this.ffError));
    const m = this.marginsOf(model, planeAxis);
    const x = curve.map((p) => Math.log10(p.omega)), markers: ChartMarker[] = [];
    if (m.wcRadS) markers.push({ x: Math.log10(m.wcRadS), color: '#8be5cd', label: 'ω_c' });
    if (m.wgRadS) markers.push({ x: Math.log10(m.wgRadS), color: '#efa47e', label: 'ω_g' });
    const flat = (value: number): Series => ({ x: [x[0], x[x.length - 1]], y: [value, value], color: '#3e5165' });
    const base = { xMin: x[0], xMax: x[x.length - 1], xFormat: logTick, xLabel: t('freq.xAxis'), markers };
    drawChart(f.mag, [flat(0), { x, y: curve.map((p) => p.magDb), color: '#6ec8ff', label: '|L|' }], { ...base, title: t('freq.mag') });
    // Phase is defined up to whole turns: draw it with the crossover's phase in (−360°, 0], so the
    // margin reads off against the −180° line under ω_c (and the gain margin's crossing at ω_g).
    const anchor = m.wcRadS ?? m.wgRadS;
    let shift = 0;
    if (anchor !== undefined) {
      let near = 0;
      for (let i = 1; i < curve.length; i++) if (Math.abs(x[i] - Math.log10(anchor)) < Math.abs(x[near] - Math.log10(anchor))) near = i;
      shift = -360 * Math.ceil(curve[near].phaseDeg / 360 - 1e-9);
    }
    const phases = curve.map((p) => p.phaseDeg + shift), lowest = Math.min(...phases), highest = Math.max(...phases);
    const lines: Series[] = [];
    for (let k = Math.ceil((lowest + 180) / 360); -180 + 360 * k <= highest; k++) lines.push(flat(-180 + 360 * k));
    if (!lines.length) lines.push(flat(-180));
    drawChart(f.phase, [...lines, { x, y: phases, color: '#c792ea', label: '∠L' }], { ...base, title: t('freq.phase') });
    // The verdict and the margins.
    f.verdict.className = `la-verdict ${m.stable ? 'ok' : 'bad'}`;
    f.verdict.textContent = `${m.stable ? '✓' : '✗'} ${t(m.stable ? 'freq.stable' : 'freq.unstable')} — ${t('freq.growth', { sigma: fixed(m.growthRate, 3), omega: fixed(m.growthFrequency, 2) })}`;
    const hz = (w?: number) => (w === undefined ? '—' : (w / (2 * Math.PI)).toFixed(2));
    const rows: [string, string][] = [
      [t('freq.pm'), m.pmDeg === undefined ? '—' : `${fixed(m.pmDeg, 1)}° ${t('freq.crossover', { omega: fixed(m.wcRadS, 2), hz: hz(m.wcRadS) })}`],
      [t('freq.gm'), m.gmDb === undefined ? '∞' : `${fixed(m.gmDb, 1)} ${t('freq.dB')} ${t('freq.crossover', { omega: fixed(m.wgRadS, 1), hz: hz(m.wgRadS) })}`],
      ...(m.gmLowDb !== undefined ? [[t('freq.gmLow'), `${fixed(m.gmLowDb, 1)} ${t('freq.dB')}`] as [string, string]] : []),
      [t('freq.openLoop'), String(m.openLoopUnstable)],
    ];
    f.table.replaceChildren(...rows.flatMap(([k, v]) => [el('dt', undefined, k), el('dd', undefined, v)]));
    const count = (prefix: string) => plane.states.filter((s) => s.startsWith(prefix)).length / (prefix === 'slosh' ? 2 : 1);
    const parts = [t('freq.states.rigid'), ...(count('drift') ? [t('freq.states.drift')] : []),
      ...(count('slosh') ? [t('freq.states.slosh', { n: count('slosh') })] : []), ...(count('bending') ? [t('freq.states.bending')] : [])];
    f.model.textContent = t('freq.model', { n: plane.n, states: parts.join(', '), actuator: t(ACTUATOR[plane.actuator]), tau: fixed(plane.tau, 2),
      kt: fixed(plane.kTheta, 2), kw: fixed(plane.kOmega, 2) }) + (plane.notch ? ` · ${t('freq.notch')}` : '');
    // The margins over the flight, up to the cursor.
    const models: LinearModel[] = [];
    let last: LinearModel | undefined;
    for (const s of samples) { const lm = s.rigid?.linearModel; if (lm && lm !== last && lm.t <= cursor) { models.push(lm); last = lm; } }
    const stride = Math.max(1, Math.ceil(models.length / HISTORY_POINTS)), picked = models.filter((_, i) => i % stride === 0 || i === models.length - 1);
    const hx: number[] = [], pm: number[] = [], gm: number[] = [], bad: ChartMarker[] = [];
    for (const lm of picked) {
      const mm = this.marginsOf(lm, planeAxis);
      hx.push(lm.t); pm.push(mm.pmDeg ?? NaN); gm.push(mm.gmDb ?? NaN);
      if (mm.active && !mm.stable && bad.length < 40) bad.push({ x: lm.t, color: '#ff6b6b' });
    }
    drawChart(f.history, [{ x: hx, y: pm, color: '#8be5cd', label: t('freq.series.pm') }, { x: hx, y: gm, color: '#efa47e', label: t('freq.series.gm') }],
      { title: t('freq.history'), timeAxis: true, xLabel: t('tel.xAxis'), cursor, markers: bad, yMin: 0 });
  }

  renderStep(axis: LoopAxis, samples: readonly TelemetrySample[], cursor: number): void {
    const model = modelAt(samples, cursor), s = this.step, active = !!model && model.planes[PLANE[axis]].actuator !== 'none';
    this.chrome(axis, model);
    if (model && !active) s.none.textContent = t('freq.noActuator');
    s.none.hidden = active;
    (s.angle.parentElement!.parentElement as HTMLElement).hidden = !active;
    if (!model || !active) return;
    const plane = model.planes[PLANE[axis]], T = model.T;
    const r = this.cached(this.stepCache, plane, () => stepResponse(plane, T, this.ffError, STEP_RAD, STEP_S));
    const m = this.marginsOf(model, PLANE[axis]), metrics = stepMetrics(r, STEP_RAD);
    const deg = (v: number[]) => v.map((x) => x * RAD), kNm = (v: number[]) => v.map((x) => x / 1000);
    drawChart(s.angle, [
      { x: [0, STEP_S], y: [1, 1], color: '#8193a6', label: t('step.series.command'), dash: [5, 4] },
      { x: r.t, y: deg(r.angle), color: '#e7edf4', label: t('step.series.true') },
      ...(plane.cAngle.some((c, i) => i > 0 && c !== 0) ? [{ x: r.t, y: deg(r.sensed), color: '#6ec8ff', label: t('step.series.imu') }] : []),
    ], { title: t('step.angle'), xLabel: t('step.xAxis'), yMin: 0 });
    drawChart(s.moment, [
      { x: r.t, y: kNm(r.demand), color: '#8be5cd', label: t('step.series.demand'), dash: [4, 3] },
      { x: r.t, y: kNm(r.delivered), color: '#e7edf4', label: t('step.series.delivered') },
    ], { title: t('step.moment'), xLabel: t('step.xAxis') });
    s.verdict.className = `la-verdict ${m.stable ? 'ok' : 'bad'}`;
    s.verdict.textContent = m.stable ? `✓ ${t('step.title')}` : `✗ ${t('step.unstable')}`;
    const rows: [string, string][] = [
      [t('step.rise'), metrics.riseS === undefined ? '—' : `${fixed(metrics.riseS, 2)} ${t('u.s')}`],
      [t('step.overshoot'), `${fixed(metrics.overshootPct, 1)} %`],
      [t('step.settling'), metrics.settlingS === undefined ? `> ${STEP_S} ${t('u.s')}` : `${fixed(metrics.settlingS, 2)} ${t('u.s')}`],
      [t('step.final'), `${fixed(metrics.final, 3)}°`],
    ];
    s.table.replaceChildren(...rows.flatMap(([k, v]) => [el('dt', undefined, k), el('dd', undefined, v)]));
  }
}
