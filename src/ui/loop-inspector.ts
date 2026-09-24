/**
 * The attitude-loop inspector (roadmap G03): a window over the Engineer mode
 * that draws the six-DOF autopilot as a block diagram, with the values of the
 * control step on screen, and charts its recent history. It reads the
 * recording only — live, or wherever the replay cursor stands.
 *
 * Non-modal on purpose: the flight keeps running under it, the keyboard's
 * play/pause still works, and it can be dragged off the part of the scene the
 * user wants to watch.
 */
import { onLangChange, t } from '../i18n';
import type { VisualFrame } from '../physics/frame';
import { RAD } from '../physics/constants';
import { drawChart, type Series } from './charts';
import { fmtTime } from './hud';
import { axisLetter, LOOP_AXES, loopHistory, loopView, triple, type LoopAxis, type LoopView, type Triple } from './loop-view';
import { getNotation, onNotationChange, symbolNode, symbolText, type Quantity } from './notation';
import { LoopAnalysis } from './loop-analysis';
import { LoopTuning, type LoopTuningHost } from './loop-tuning';
import { LoopNavigation } from './loop-navigation';
import { LoopGuidance } from './loop-guidance';
import type { TelemetrySample } from '../physics/sim/types';
import type { ControlFaultRecord } from '../physics/rigid/faults';
import { FAULT_GROUP } from '../physics/rigid/fault-config';
import { faultKindName, faultTargetText } from './fault-names';
import './loop-inspector.css';

export interface LoopInspectorHost extends LoopTuningHost {
  /** Play or pause whatever the timeline is running (the live flight or the replay). */
  togglePlay(): void;
}

/** One colour per axis, the same in the diagram and the charts. */
export const AXIS_COLOR: Readonly<Record<LoopAxis, string>> = { roll: '#f2c14e', pitch: '#8be5cd', yaw: '#c792ea' };
const RATE_SYMBOL: Readonly<Record<LoopAxis, Quantity>> = { roll: 'rollRate', pitch: 'pitchRate', yaw: 'yawRate' };
const MOMENT_SYMBOL: Readonly<Record<LoopAxis, Quantity>> = { roll: 'rollMoment', pitch: 'pitchMoment', yaw: 'yawMoment' };
const WINDOWS_S = [10, 30, 120] as const;
type Tab = 'loop' | 'frequency' | 'step' | 'tuning' | 'test' | 'navigation' | 'guidance';
const TABS: readonly Tab[] = ['loop', 'frequency', 'step', 'tuning', 'test', 'navigation', 'guidance'];
const TAB_NAME: Readonly<Record<Tab, string>> = { loop: 'loop.tab.loop', frequency: 'loop.tab.frequency', step: 'loop.tab.step',
  tuning: 'loop.tab.tuning', test: 'loop.tab.test', navigation: 'loop.tab.navigation', guidance: 'loop.tab.guidance' };
const AXIS_NAME: Readonly<Record<LoopAxis, string>> = { roll: 'loop.axis.roll', pitch: 'loop.axis.pitch', yaw: 'loop.axis.yaw' };
const REFRESH_MS = 200;
const MINUS = '−';

/** A signed reading: "+0.12", "−3.4", "0.00" (no sign on zero). */
export function signed(value: number, digits: number): string {
  if (!Number.isFinite(value)) return '—';
  const a = Math.abs(value), d = a >= 1000 ? 0 : a >= 100 ? Math.min(1, digits) : digits;
  const text = a.toFixed(d);
  return Number(text) === 0 ? text : (value < 0 ? MINUS : '+') + text;
}
function plain(value: number, digits: number): string {
  if (!Number.isFinite(value)) return '—';
  return Math.abs(value) >= 100 ? value.toFixed(Math.min(1, digits)) : value.toFixed(digits);
}
/** One value per axis, or one value when the three agree (a gain, a limit). */
function perAxis(values: Triple, digits: number): string {
  const { roll, pitch, yaw } = values;
  return roll === pitch && pitch === yaw ? plain(roll, digits) : `${plain(roll, digits)} / ${plain(pitch, digits)} / ${plain(yaw, digits)}`;
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

/** "K_θ 1.50 s⁻¹", its subscript lowered. */
function gain(sub: string, value: string): DocumentFragment {
  const f = document.createDocumentFragment(), k = el('var', 'notation-symbol', 'K'), s = el('sub', undefined, sub);
  k.append(s); f.append(k, ` ${value}`);
  return f;
}

interface Row { axis: LoopAxis; value: string; symbol?: Quantity; warn?: boolean; tag?: string; tagTitle?: string }
type BlockState = 'on' | 'warn' | 'off' | 'fault';

export class LoopInspector {
  readonly el: HTMLDialogElement;
  private head = el('header', 'li-head');
  private titleEl = el('h2', 'li-title');
  private eyebrow = el('span', 'eyebrow');
  private time = el('span', 'li-time');
  private tag = el('span', 'li-tag');
  private mode = el('span', 'li-mode');
  private play = el('button', 'btn li-play');
  private windowLabel = el('label', 'li-field');
  private windowSelect = el('select');
  private axisGroup = el('div', 'li-axes');
  private axisButtons = new Map<LoopAxis, HTMLButtonElement>();
  private closeBtn = el('button', 'dialog-close li-close');
  private intro = el('p', 'li-intro');
  private legend = el('div', 'li-legend');
  private forward = el('div', 'li-forward');
  private feedback = el('div', 'li-feedback');
  private none = el('p', 'li-none');
  private charts = { error: el('canvas'), rate: el('canvas'), moment: el('canvas'), actuators: el('canvas') };
  private axis: LoopAxis = 'pitch';
  /** G04: the loop, its frequency response, or its step response. */
  private tab: Tab = 'loop';
  private tabButtons = new Map<Tab, HTMLButtonElement>();
  private tabBar = el('div', 'li-tabs');
  private loopPanel = el('div', 'li-loop');
  private analysis = new LoopAnalysis();
  /** E04: tuning on the linearised loop, and attitude tests in flight. */
  private tuning: LoopTuning;
  /** G02: the navigation against the truth. */
  private navigation = new LoopNavigation();
  /** G01: the explicit ascent guidance. */
  private guidance = new LoopGuidance();
  private windowS: number = 30;
  private opener: HTMLElement | null = null;
  private lastRender = -Infinity;
  private lastKey = '';
  private args: { frame?: VisualFrame | null; frames: readonly VisualFrame[]; cursor: number; live: boolean; running: boolean; samples: readonly TelemetrySample[] }
    = { frames: [], cursor: 0, live: true, running: false, samples: [] };
  private drag: { dx: number; dy: number; id: number } | null = null;

  constructor(private host: LoopInspectorHost) {
    this.tuning = new LoopTuning(host);
    this.el = el('dialog', 'loop-inspector');
    this.el.setAttribute('aria-labelledby', 'loop-inspector-title');
    this.titleEl.id = 'loop-inspector-title';
    const heading = el('div', 'li-heading'); heading.append(this.eyebrow, this.titleEl);
    const status = el('div', 'li-status'); status.append(this.time, this.tag, this.mode);
    this.play.type = 'button';
    this.play.addEventListener('click', () => { this.host.togglePlay(); this.lastKey = ''; });
    for (const s of WINDOWS_S) { const o = el('option'); o.value = String(s); this.windowSelect.append(o); }
    this.windowSelect.value = String(this.windowS);
    this.windowSelect.addEventListener('change', () => { this.windowS = Number(this.windowSelect.value); this.refresh(true); });
    this.windowLabel.append(document.createTextNode(''), this.windowSelect);
    this.axisGroup.setAttribute('role', 'group');
    for (const axis of LOOP_AXES) {
      const b = el('button', 'li-axis'); b.type = 'button';
      b.style.setProperty('--axis', AXIS_COLOR[axis]);
      b.addEventListener('click', () => { this.axis = axis; this.refresh(true); });
      this.axisButtons.set(axis, b); this.axisGroup.append(b);
    }
    this.closeBtn.type = 'button'; this.closeBtn.textContent = '×';
    this.closeBtn.addEventListener('click', () => this.close());
    const tools = el('div', 'li-tools'); tools.append(this.play, this.windowLabel, this.axisGroup, this.closeBtn);
    this.head.append(heading, status, tools);
    const diagram = el('div', 'li-diagram'); diagram.append(this.forward, this.feedback);
    const chartGrid = el('div', 'li-charts');
    for (const canvas of Object.values(this.charts)) chartGrid.append(canvas);
    this.loopPanel.append(this.intro, this.legend, diagram, this.none, chartGrid);
    this.tabBar.setAttribute('role', 'tablist');
    for (const tab of TABS) {
      const b = el('button', 'li-tab'); b.type = 'button'; b.setAttribute('role', 'tab'); b.dataset.tab = tab;
      b.addEventListener('click', () => { this.tab = tab; this.refresh(true); });
      this.tabButtons.set(tab, b); this.tabBar.append(b);
    }
    this.analysis.setOnChange(() => this.refresh(true));
    this.tuning.setOnChange(() => this.refresh(true));
    this.el.append(this.head, this.tabBar, this.loopPanel, this.analysis.frequencyPanel, this.analysis.stepPanel, this.tuning.tuningPanel, this.tuning.testPanel,
      this.navigation.panel, this.guidance.panel);
    this.el.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.preventDefault(); this.close(); } });
    this.head.addEventListener('pointerdown', (e) => this.startDrag(e));
    this.head.addEventListener('pointermove', (e) => this.moveDrag(e));
    this.head.addEventListener('pointerup', () => { this.drag = null; });
    this.head.addEventListener('pointercancel', () => { this.drag = null; });
    document.body.append(this.el);
    onLangChange(() => { if (this.isOpen) this.refresh(true); });
    onNotationChange(() => { if (this.isOpen) this.refresh(true); });
  }

  get isOpen(): boolean { return this.el.open; }

  open(opener: HTMLElement | null = null): void {
    this.opener = opener;
    if (!this.el.open) { if (typeof this.el.show === 'function') this.el.show(); else this.el.setAttribute('open', ''); }
    this.refresh(true);
    this.closeBtn.focus();
  }

  close(): void {
    if (!this.el.open) return;
    if (typeof this.el.close === 'function') this.el.close(); else this.el.removeAttribute('open');
    const o = this.opener; this.opener = null;
    if (o && document.contains(o)) o.focus();
  }

  /** Called every rendered frame while open; draws at most five times a second, and only on a change. */
  update(frame: VisualFrame | null | undefined, frames: readonly VisualFrame[], cursor: number, live: boolean, running: boolean,
    samples: readonly TelemetrySample[] = []): void {
    this.args = { frame, frames, cursor, live, running, samples };
    if (this.isOpen) this.refresh(false);
  }

  private refresh(force: boolean): void {
    const now = performance.now();
    const { frame, frames, cursor, live, running, samples } = this.args;
    const key = `${cursor}|${live}|${running}|${frames.length}|${frame?.t}|${this.tab}|${samples.length}`;
    if (!force && (now - this.lastRender < REFRESH_MS || key === this.lastKey)) return;
    this.lastRender = now; this.lastKey = key;
    this.chrome();
    const view = loopView(frame?.rigid);
    this.time.textContent = frame ? fmtTime(frame.t) : '';
    this.tag.textContent = t(live ? 'loop.live' : 'loop.replay');
    this.tag.classList.toggle('replay', !live);
    this.mode.textContent = frame?.rigid ? t(frame.rigid.controlMode === 'manual' ? 'loop.mode.manual' : 'loop.mode.auto') : '';
    this.play.textContent = running ? '❚❚' : '▶';
    const playLabel = t(running ? 'ctl.pause' : 'ctl.play');
    this.play.title = playLabel; this.play.setAttribute('aria-label', playLabel);
    for (const [tab, b] of this.tabButtons) b.setAttribute('aria-selected', String(tab === this.tab));
    this.loopPanel.hidden = this.tab !== 'loop';
    this.analysis.frequencyPanel.hidden = this.tab !== 'frequency';
    this.analysis.stepPanel.hidden = this.tab !== 'step';
    this.tuning.tuningPanel.hidden = this.tab !== 'tuning';
    this.tuning.testPanel.hidden = this.tab !== 'test';
    this.navigation.panel.hidden = this.tab !== 'navigation';
    this.guidance.panel.hidden = this.tab !== 'guidance';
    this.windowLabel.hidden = this.tab !== 'loop';
    if (this.tab === 'frequency') { this.analysis.renderFrequency(this.axis, samples, cursor); return; }
    if (this.tab === 'step') { this.analysis.renderStep(this.axis, samples, cursor); return; }
    if (this.tab === 'tuning') { this.tuning.renderTuning(this.axis, samples, cursor, live); return; }
    if (this.tab === 'test') { this.tuning.renderTest(this.axis, samples, cursor, live); return; }
    if (this.tab === 'navigation') { this.navigation.render(samples, cursor); return; }
    if (this.tab === 'guidance') { this.guidance.render(samples, cursor); return; }
    this.diagram(view, frame);
    this.none.hidden = !!view;
    this.drawCharts(frames, cursor);
  }

  /** The localised, notation-dependent text that does not change with the flight. */
  private chrome(): void {
    const n = getNotation();
    this.eyebrow.textContent = t('loop.eyebrow');
    for (const [tab, b] of this.tabButtons) b.textContent = t(TAB_NAME[tab]);
    this.titleEl.textContent = t('loop.title');
    this.head.title = t('loop.drag');
    this.intro.textContent = t('loop.intro', { standard: n === 'gost' ? 'ГОСТ 20058-80' : 'ISO 1151' });
    (this.windowLabel.firstChild as Text).textContent = t('loop.window');
    for (const option of Array.from(this.windowSelect.options)) option.textContent = t('loop.window.s', { s: option.value });
    this.axisGroup.setAttribute('aria-label', t('loop.axis'));
    for (const [axis, b] of this.axisButtons) {
      b.textContent = t(AXIS_NAME[axis]);
      b.setAttribute('aria-pressed', String(axis === this.axis));
    }
    this.closeBtn.title = t('misc.close'); this.closeBtn.setAttribute('aria-label', t('misc.close'));
    this.none.textContent = t('loop.none');
    const items = LOOP_AXES.map((axis) => {
      const item = el('span', 'li-legend-item');
      const dot = el('i'); dot.style.background = AXIS_COLOR[axis];
      item.append(dot, `${t(AXIS_NAME[axis])} (${axisLetter(axis, n)})`);
      return item;
    });
    this.legend.replaceChildren(...items);
  }

  private rows(values: Triple | undefined, digits: number, options: { symbol?: Record<LoopAxis, Quantity>; limited?: (axis: LoopAxis) => { tag: string; title: string } | null } = {}): Row[] {
    return LOOP_AXES.map((axis) => {
      const limit = options.limited?.(axis) ?? null;
      return { axis, value: values ? signed(values[axis], digits) : '—', symbol: options.symbol?.[axis],
        ...(limit ? { warn: true, tag: limit.tag, tagTitle: limit.title } : {}) };
    });
  }

  private block(kind: string, titleKey: string, unit: string, rows: Row[], notes: (string | Node)[], state: BlockState): HTMLElement {
    const n = getNotation(), box = el('section', `li-block li-${kind}`);
    if (state !== 'on') box.classList.add(state);
    const h = el('h4'); h.append(t(titleKey));
    if (unit) h.append(' ', el('span', 'li-unit', unit));
    box.append(h);
    if (rows.length) {
      const list = el('div', 'li-rows');
      for (const row of rows) {
        const line = el('div', row.warn ? 'li-row warn' : 'li-row');
        const label = el('span', 'li-ax');
        label.style.color = AXIS_COLOR[row.axis];
        if (row.symbol) label.append(symbolNode(row.symbol, n)); else label.textContent = axisLetter(row.axis, n);
        line.append(label, el('span', 'li-val', row.value));
        if (row.tag) { const tag = el('span', 'li-flag', row.tag); if (row.tagTitle) tag.title = row.tagTitle; line.append(tag); }
        list.append(line);
      }
      box.append(list);
    }
    for (const note of notes) { const p = el('p', 'li-note'); p.append(note); box.append(p); }
    return box;
  }

  private diagram(view: LoopView | null, frame: VisualFrame | null | undefined): void {
    const deg = '°', degS = t('loop.unit.degS'), degS2 = t('loop.unit.degS2'), kNm = t('loop.unit.kNm'), perS = t('loop.unit.perS');
    const manual = view?.mode === 'manual';
    const stop = { tag: t('loop.limit.stopping'), title: t('loop.limit.stoppingTitle') }, max = { tag: t('loop.limit.max'), title: t('loop.limit.maxTitle') };
    const blocks: HTMLElement[] = [];
    // 1 guidance, with the ascent load relief
    const guidanceNotes = [view ? t(manual ? 'loop.guidance.manual' : 'loop.guidance.auto') : '—'];
    let guidanceRows: Row[] = [], guidanceState: BlockState = 'on';
    const relief = view?.loadReliefDeg;
    if (relief) {
      guidanceNotes.push(`${t('loop.relief.requested')} ${plain(relief.requested, 1)}° · ${t('loop.relief.limit')} ${plain(relief.limit, 1)}°`,
        `${t('loop.relief.applied')} ${plain(relief.applied, 2)}°`);
      if (relief.applied > 0.05) guidanceState = 'warn';
    } else if (view && !manual) guidanceNotes.push(t('loop.relief.off'));
    if (view && manual && frame?.rigid?.commandRatesBody) {
      guidanceRows = this.rows(triple(frame.rigid.commandRatesBody, getNotation(), RAD), 2, { symbol: RATE_SYMBOL });
    }
    blocks.push(this.block('guidance', 'loop.block.guidance', manual ? degS : '', guidanceRows, guidanceNotes, guidanceState));
    // 2 attitude error (summing junction)
    blocks.push(this.block('sum', 'loop.block.error', deg, manual ? [] : this.rows(view?.errorDeg, 3),
      manual ? [t('loop.error.manual')] : [], manual ? 'off' : 'on'));
    // 3 attitude loop: K_θ, stopping distance, rate limit
    const attitudeLimited = (axis: LoopAxis) => !view || manual ? null : view.limits.rate[axis] ? max : view.limits.stopping[axis] ? stop : null;
    const attitudeWarn = !!view && !manual && LOOP_AXES.some((axis) => attitudeLimited(axis));
    blocks.push(this.block('attitude', 'loop.block.attitude', degS, this.rows(view?.commandDegS, 3, { symbol: RATE_SYMBOL, limited: attitudeLimited }),
      view ? [gain('θ', `${perAxis(view.gains.attitude, 2)} ${perS}`), `|ω| ≤ ${perAxis(view.gains.maxRateDegS, 1)} ${degS}`] : [],
      manual ? 'off' : attitudeWarn ? 'warn' : 'on'));
    // 4 rate error
    blocks.push(this.block('sum', 'loop.block.rateError', degS, this.rows(view?.rateErrorDegS, 3), [], 'on'));
    // 5 rate loop: K_ω and the angular-acceleration limit the actuators allow
    const accelerationLimited = (axis: LoopAxis) => (view?.limits.acceleration[axis] || (manual && view?.limits.rate[axis]) ? max : null);
    blocks.push(this.block('rate', 'loop.block.rate', degS2, this.rows(view?.accelerationDegS2, 3, { limited: accelerationLimited }),
      view ? [gain('ω', `${perAxis(view.gains.rate, 2)} ${perS}`), `|ε| ≤ ${perAxis(view.gains.maxAccelerationDegS2, 2)} ${degS2}`] : [],
      view && LOOP_AXES.some((axis) => accelerationLimited(axis)) ? 'warn' : 'on'));
    // 6 moment
    blocks.push(this.block('moment', 'loop.block.moment', kNm, this.rows(view?.momentKNm.demand, 1, { symbol: MOMENT_SYMBOL }),
      [t('loop.moment.formula')], 'on'));
    // 7 bending filter (P05)
    const filtered = view?.momentKNm.filtered;
    blocks.push(this.block('filter', 'loop.block.filter', filtered ? kNm : '', filtered ? this.rows(filtered, 1, { symbol: MOMENT_SYMBOL }) : [],
      [view?.notchHz !== undefined ? t('loop.filter.notch', { hz: plain(view.notchHz, 2) }) : t('loop.filter.off')], filtered ? 'on' : 'off'));
    // 8 actuators: gimbals, then jets
    const delivered = view ? { roll: view.momentKNm.delivered.roll - view.momentKNm.aero.roll, pitch: view.momentKNm.delivered.pitch - view.momentKNm.aero.pitch,
      yaw: view.momentKNm.delivered.yaw - view.momentKNm.aero.yaw } : undefined;
    const unmet = view ? Math.hypot(view.momentKNm.unmet.roll, view.momentKNm.unmet.pitch, view.momentKNm.unmet.yaw) : 0;
    blocks.push(this.block('actuators', 'loop.block.actuators', kNm, this.rows(delivered, 1, { symbol: MOMENT_SYMBOL }),
      view ? [`${t('loop.actuators.tvc')} ${plain(view.gimbalUsePct, 0)} %${view.limits.gimbal && view.unmetSignificant ? ` · ${t('loop.actuators.atLimit')}` : ''}`,
        `${t('loop.actuators.rcs')} ${plain(view.rcsDutyPct, 0)} %${view.limits.gasBudget ? ` · ${t('loop.limit.gas')}` : ''}`,
        `${t('loop.actuators.unmet')} ${plain(unmet, 1)} ${kNm}`] : [],
      view?.unmetSignificant ? 'warn' : 'on'));
    // 9 the vehicle: measured rates, and the air's moment
    blocks.push(this.block('vehicle', 'loop.block.vehicle', degS, this.rows(view?.measuredDegS, 3, { symbol: RATE_SYMBOL }),
      view ? [`${t('loop.vehicle.aero')}: ${LOOP_AXES.map((axis) => signed(view.momentKNm.aero[axis], 1)).join(' / ')} ${kNm}`] : [], 'on'));
    // G08: the failed parts, marked.
    const faults = frame?.rigid?.controlFaults;
    if (faults) for (const b of blocks) this.markFaults(b, faults);
    const cells: HTMLElement[] = [];
    blocks.forEach((b, i) => { if (i) cells.push(el('div', 'li-arrow')); cells.push(b); });
    this.forward.replaceChildren(...cells);
    // The feedback path: the IMU under the vehicle, back to both junctions.
    const imu = this.block('imu', 'loop.block.imu', '', [],
      [view?.imuErrorDeg !== undefined ? t('loop.imu.bent', { deg: plain(Math.abs(view.imuErrorDeg), 3) }) : t('loop.imu.rigid')], 'on');
    const tap = (column: number, labelKey: string, first: boolean) => {
      const cell = el('div', first ? 'li-tap first' : 'li-tap');
      cell.style.gridColumn = String(column);
      cell.append(el('span', 'li-tap-label', `− ${t(labelKey)}`));
      return cell;
    };
    const line = (from: number, to: number) => { const cell = el('div', 'li-line'); cell.style.gridColumn = `${from} / ${to}`; return cell; };
    if (faults) this.markFaults(imu, faults);
    imu.style.gridColumn = '17';
    this.feedback.replaceChildren(tap(3, 'loop.feedback.attitude', true), line(4, 7), tap(7, 'loop.feedback.rate', false), line(8, 17), imu);
  }

  private drawCharts(frames: readonly VisualFrame[], cursor: number): void {
    const from = cursor - this.windowS, history = loopHistory(frames, from, cursor);
    const x = history.t, axis = this.axis, color = AXIS_COLOR[axis], axisName = t(AXIS_NAME[axis]);
    const pick = (f: (v: LoopView) => number | undefined) => history.views.map((v) => f(v) ?? NaN);
    const base = { xMin: from, xMax: cursor, cursor, timeAxis: true, xLabel: t('tel.xAxis') };
    drawChart(this.charts.error, LOOP_AXES.map((a): Series => ({ x, y: pick((v) => v.errorDeg?.[a]), color: AXIS_COLOR[a], label: axisLetter(a) })),
      { ...base, title: t('loop.chart.error') });
    const rate: Series[] = [
      { x, y: pick((v) => v.commandDegS[axis]), color, label: t('loop.series.command'), dash: [4, 3] },
      { x, y: pick((v) => v.measuredDegS[axis]), color: '#e7edf4', label: t('loop.series.measured') },
    ];
    if (history.views.some((v) => v.imuErrorDeg !== undefined || v.sensorFault)) rate.push({ x, y: pick((v) => v.sensedDegS[axis]), color: '#6ec8ff', label: t('loop.series.sensed') });
    drawChart(this.charts.rate, rate, { ...base, title: t('loop.chart.rate', { axis: axisName, symbol: symbolText(RATE_SYMBOL[axis]) }) });
    drawChart(this.charts.moment, [
      { x, y: pick((v) => (v.momentKNm.filtered ?? v.momentKNm.demand)[axis]), color, label: t('loop.series.demand'), dash: [4, 3] },
      { x, y: pick((v) => v.momentKNm.delivered[axis]), color: '#e7edf4', label: t('loop.series.delivered') },
      { x, y: pick((v) => v.momentKNm.aero[axis]), color: '#6ec8ff', label: t('loop.series.aero') },
    ], { ...base, title: t('loop.chart.moment', { axis: axisName, symbol: symbolText(MOMENT_SYMBOL[axis]) }) });
    drawChart(this.charts.actuators, [
      { x, y: pick((v) => v.gimbalUsePct), color: '#6ec8ff', label: t('loop.series.tvc') },
      { x, y: pick((v) => v.rcsDutyPct), color: '#efa47e', label: t('loop.series.rcs') },
    ], { ...base, title: t('loop.chart.actuators'), yMin: 0, yMax: 100 });
  }

  /**
   * G08: a block the failures struck, marked: the IMUs (sensor failures, each unit's state and the
   * vote), the actuators (nozzles and jets), and the control law (the flight computer).
   */
  private markFaults(box: HTMLElement, record: ControlFaultRecord): void {
    const kind = box.classList.contains('li-imu') ? 'sensor' : box.classList.contains('li-actuators') ? 'actuator' : box.classList.contains('li-moment') ? 'computer' : null;
    if (!kind) return;
    const struck = record.active.filter((a) => !a.missed && FAULT_GROUP[a.kind] === kind);
    const notes: string[] = struck.map((a) => {
      const target = faultTargetText({ engine: a.engines, jet: a.jets, units: a.units?.length === 3 ? 'all' : a.units, axis: a.axis });
      return `⚠ ${faultKindName(a.kind)}${target ? ` — ${target}` : ''}`;
    });
    if (kind === 'sensor') {
      if (record.units.some((u) => u !== 'ok') || struck.length) {
        notes.push(`${t('loop.fault.units')}: ${record.units.map((u, i) => `${i + 1} ${t(`loop.fault.unit.${u}`)}`).join(' · ')}`);
        notes.push(record.openLoop ? t('loop.fault.openLoop') : `${t('loop.fault.inUse')}: ${record.selected.join(', ')}`);
      }
    } else if (kind === 'actuator') {
      for (const e of record.engines) notes.push(`${t('fault.target.engine', { n: e.engine })}: ${t(`loop.fault.engine.${e.state}`)}`);
      for (const j of record.jets) notes.push(`${t('fault.target.jet', { n: j.jet })}: ${t(`loop.fault.jet.${j.state}`)}`);
    } else if (record.computer !== 'primary') notes.push(t(`loop.fault.computer.${record.computer}`));
    if (!notes.length) return;
    const failed = struck.length > 0 || (kind === 'sensor' && record.openLoop) || (kind === 'actuator' && (record.engines.length > 0 || record.jets.length > 0));
    box.classList.remove('warn', 'off');
    if (failed) box.classList.add('fault');
    const badge = el('span', 'li-fault-badge', t(record.fdir ? 'loop.fault.badgeFdir' : 'loop.fault.badge'));
    box.querySelector('h4')?.append(' ', badge);
    for (const note of notes) box.append(el('p', 'li-note li-fault-note', note));
  }

  private startDrag(e: PointerEvent): void {
    if ((e.target as HTMLElement).closest('button, select, label') || e.button !== 0) return;
    const rect = this.el.getBoundingClientRect();
    this.drag = { dx: e.clientX - rect.left, dy: e.clientY - rect.top, id: e.pointerId };
    this.head.setPointerCapture(e.pointerId);
  }
  private moveDrag(e: PointerEvent): void {
    if (!this.drag || e.pointerId !== this.drag.id) return;
    const rect = this.el.getBoundingClientRect();
    const left = Math.max(8 - rect.width + 120, Math.min(window.innerWidth - 120, e.clientX - this.drag.dx));
    const top = Math.max(0, Math.min(window.innerHeight - 48, e.clientY - this.drag.dy));
    this.el.style.left = `${left}px`; this.el.style.top = `${top}px`; this.el.style.transform = 'none';
  }
}
