/**
 * The Engineer level's optimal staging page (roadmap D05, "the optimal
 * division of Δv among stages"): N serial stages, each with its specific
 * impulse and structural ratio, a Δv and a payload in; the division of the
 * Δv that lifts the payload with the least mass on the pad out — each
 * stage's share, its mass ratio and mass, the payload ratio — from the
 * Lagrange-multiplier solution (src/design/optimal-staging.ts, through
 * src/design/staging-model.ts).
 *
 * The stages are filled in from a real rocket's serial stages (Saturn V to
 * begin with) or from the vehicle on the bench, and then the student's to
 * change. When there is no answer the page says why in words: a Δv past what
 * any staging of these stages can reach, or a stage the best vehicle would
 * leave out. For two stages it draws the payload ratio against the split,
 * the optimum marked. "Compare with the real vehicle" sets the rocket's own
 * split beside the optimum at its own Δv and payload, and says plainly why
 * they differ: the optimum is loss-free and takes ε as fixed, while a real
 * rocket's gravity loss depends on the split (its high-thrust first stage
 * climbs out quickly; low-thrust upper stages lit sooner would lose more),
 * one reason a designer may give the first stage more (Saturn V's: about
 * 1.75 km/s optimal against its own 3.88). Not a rule: four of the six
 * catalogue vehicles compared give it less (staging-model.ts), and for them
 * the page says so and claims no reason.
 * Strap-ons are left out and said to be; the closed form does not describe
 * them.
 */
import { t } from '../../i18n';
import type { VehicleSpec } from '../../types';
import { VEHICLES, vehicleById } from '../../data/vehicles';
import { optimalStaging, splitPayloadRatio, stagingProblem, type OptimalStaging, type StagingStage } from '../../design/optimal-staging';
import {
  STAGING_LIMITS, STAGING_MAX_STAGES, STAGING_PROBLEM_KEYS, compareWithVehicle, problemValues, realSplit, sameInputs, splitCurve,
  stagingInputProblem, vehicleStaging, type StagingField, type StagingInputs, type VehicleStaging,
} from '../../design/staging-model';
import { pickerEntries } from '../../design/vehicle-picker';
import { watchPayload } from '../../design/stage-table';
import { drawChart, type ChartMarker } from '../charts';
import { button, el, num } from '../orbit/dom';
import { mass } from './figures';
import { field, numberBox, select } from './explore-level';

const BENCH = 'bench';
const DEFAULT_SOURCE = 'saturnv';
const COLOURS = { curve: '#8be5cd', optimum: '#efd27e', real: '#efa47e' } as const;
const BAD_KEY: Record<StagingField, string> = {
  count: 'build.eng.staging.bad.count', isp: 'build.eng.staging.bad.isp', epsilon: 'build.eng.staging.bad.epsilon',
  dv: 'build.eng.staging.bad.dv', payload: 'build.eng.staging.bad.payload',
};

const ms = (v: number): string => `${num(v)} ${t('u.ms')}`;
const kms = (v: number): string => `${num(v / 1000, 2)} ${t('u.kms')}`;
/** a payload ratio as a percentage: two decimals, or three significant digits for one under 0.1 % (near the limit) */
const pct = (f: number): string => {
  const p = f * 100;
  if (p >= 0.1 || p === 0) return `${num(p, 2)} %`;
  return `${num(p, Math.min(8, Math.max(2, 2 - Math.floor(Math.log10(p)))))} %`;
};

export class StagingPanel {
  readonly root = el('div', 'be-staging');
  private bench: { spec: VehicleSpec; name: string; payloadKg: number } | null = null;
  /** where the stages were filled from, and what it gave (null: the student's own since) */
  private sourceId = DEFAULT_SOURCE;
  private source: VehicleStaging;
  private inputs: StagingInputs;
  private compare = false;
  private visible = false;
  private queued = 0;

  private readonly ctrl = el('section', 'bs-panel be-ctrl');
  private readonly out = el('section', 'bs-panel be-out');
  private readonly plots = el('section', 'bs-panel be-plots');
  private readonly canvas = el('canvas');
  private readonly ro: ResizeObserver | null;

  constructor() {
    this.ctrl.setAttribute('aria-labelledby', 'be-staging-title');
    this.out.setAttribute('aria-labelledby', 'be-staging-out-title');
    this.plots.setAttribute('aria-labelledby', 'be-staging-plots-title');
    this.root.append(this.ctrl, this.out, this.plots);
    const v = vehicleById(DEFAULT_SOURCE);
    this.source = vehicleStaging(v, watchPayload(v));
    this.inputs = this.copy(this.source);
    this.ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => this.queueChart()) : null;
    this.ro?.observe(this.plots);
  }

  /** The vehicle on the bench, offered as a source; the stages on screen are kept. */
  setVehicle(spec: VehicleSpec, name: string, payloadKg: number): void {
    this.bench = { spec, name, payloadKg };
    if (this.sourceId === BENCH) this.fill(BENCH);
    else this.render();
  }

  show(): void {
    this.visible = true;
    this.render();
  }

  hide(): void {
    this.visible = false;
  }

  private copy(s: StagingInputs): StagingInputs {
    return { stages: s.stages.map((x) => ({ ...x })), dvMps: s.dvMps, payloadKg: s.payloadKg };
  }

  private sourceSpec(): { spec: VehicleSpec; payloadKg: number } | null {
    if (this.sourceId === BENCH) return this.bench ? { spec: this.bench.spec, payloadKg: this.bench.payloadKg } : null;
    const v = VEHICLES.find((x) => x.id === this.sourceId);
    return v ? { spec: v, payloadKg: watchPayload(v) } : null;
  }

  /** Fill the stages, Δv and payload from a vehicle: the bench's, or a catalogue one. */
  private fill(id: string): void {
    this.sourceId = id;
    const s = this.sourceSpec();
    if (!s) return;
    this.source = vehicleStaging(s.spec, s.payloadKg);
    this.inputs = this.copy(this.source);
    this.render();
  }

  private changed(): void {
    if (this.queued) return;
    this.queued = requestAnimationFrame(() => {
      this.queued = 0;
      this.renderOut();
      this.renderPlots();
    });
  }

  // ─── drawing ──────────────────────────────────────────────────────────────

  render(): void {
    const active = document.activeElement as HTMLElement | null;
    const key = active && this.root.contains(active) ? active.dataset.k ?? null : null;
    this.renderControls();
    this.renderOut();
    this.renderPlots();
    if (key && !this.root.contains(document.activeElement)) this.root.querySelector<HTMLElement>(`[data-k="${CSS.escape(key)}"]`)?.focus();
  }

  private renderControls(): void {
    const title = el('h2', 'bx-h2', t('build.eng.staging.title'));
    title.id = 'be-staging-title';
    const parts: HTMLElement[] = [title, el('p', 'bx-note', t('build.eng.staging.lead'))];

    const benchOption = this.bench ? [{ value: BENCH, label: t('build.eng.staging.fromBench', { name: this.bench.name }) }] : [];
    const groups: Record<string, string> = { current: t('build.pick.current'), historical: t('build.pick.historical') };
    const from = select('staging:from', [
      ...benchOption,
      ...pickerEntries(VEHICLES).map((e) => ({ value: e.id, label: e.label, group: groups[e.group] })),
    ], this.sourceId, (v) => this.fill(v));
    const fromRow = el('div', 'be-from');
    fromRow.append(field(t('build.eng.staging.from'), from));
    parts.push(fromRow);
    const s = this.source;
    const left: string[] = [];
    if (s.strapOnGroups) left.push(t('build.eng.staging.strapOnsOut', { n: s.strapOnGroups }));
    if (s.stagesLeftOut) left.push(t('build.eng.staging.stagesOut', { n: s.stagesLeftOut, max: STAGING_MAX_STAGES }));
    if (left.length) parts.push(el('p', 'bx-note small warn', left.join(' ')));
    parts.push(el('p', 'bx-note small', t('build.eng.staging.fromNote')));

    // how many stages
    const n = this.inputs.stages.length;
    const stepper = el('div', 'bx-stepper');
    const count = el('output', 'be-count', String(n));
    count.setAttribute('aria-live', 'polite');
    const minus = button('bs-step', '−', () => { this.inputs.stages.pop(); this.render(); });
    const plus = button('bs-step', '+', () => { this.inputs.stages.push({ ...this.inputs.stages[this.inputs.stages.length - 1] }); this.render(); });
    minus.setAttribute('aria-label', t('build.eng.staging.fewer'));
    plus.setAttribute('aria-label', t('build.eng.staging.more'));
    minus.dataset.k = 'staging:minus';
    plus.dataset.k = 'staging:plus';
    minus.disabled = n <= 1;
    plus.disabled = n >= STAGING_MAX_STAGES;
    stepper.append(minus, count, plus);
    const countField = el('div', 'bx-field');
    countField.append(el('span', 'bx-field-name', t('build.eng.staging.count', { max: STAGING_MAX_STAGES })), stepper);
    parts.push(countField);

    // each stage: Isp and ε
    const list = el('div', 'be-stage-inputs');
    this.inputs.stages.forEach((st, i) => {
      const row = el('fieldset', 'be-stage-in');
      row.append(el('legend', 'bx-h3', t('build.label.stage', { n: i + 1 })));
      const isp = numberBox(`staging:isp:${i}`, st.ispS, { min: STAGING_LIMITS.isp[0], max: STAGING_LIMITS.isp[1], step: 1 }, (v) => { st.ispS = v; this.changed(); });
      const ispRow = el('span', 'bx-with-unit');
      ispRow.append(isp, el('span', 'bx-unit', t('u.s')));
      const eps = numberBox(`staging:eps:${i}`, st.epsilon, { min: STAGING_LIMITS.epsilon[0], max: STAGING_LIMITS.epsilon[1], step: 0.001, digits: 4 }, (v) => { st.epsilon = v; this.changed(); });
      row.append(field(t('build.eng.staging.isp'), ispRow), field(t('build.fig.eps'), eps));
      list.append(row);
    });
    parts.push(list);

    const dv = numberBox('staging:dv', this.inputs.dvMps, { min: STAGING_LIMITS.dv[0], max: STAGING_LIMITS.dv[1], step: 10, digits: 0 }, (v) => { this.inputs.dvMps = v; this.changed(); });
    const dvRow = el('span', 'bx-with-unit');
    dvRow.append(dv, el('span', 'bx-unit', t('u.ms')));
    const pay = numberBox('staging:payload', this.inputs.payloadKg, { min: 0, max: STAGING_LIMITS.payload[1], step: 1, digits: 0 }, (v) => { this.inputs.payloadKg = v; this.changed(); });
    const payRow = el('span', 'bx-with-unit');
    payRow.append(pay, el('span', 'bx-unit', t('u.kg')));
    const pair = el('div', 'be-pair');
    pair.append(field(t('build.eng.staging.dv'), dvRow), field(t('build.ex.payload'), payRow));
    parts.push(pair, el('p', 'bx-note small', t('build.eng.staging.dvNote')));
    this.ctrl.replaceChildren(...parts);
  }

  /** The optimum for the inputs on screen, or what stops it, in words. */
  private solve(): { optimum: OptimalStaging } | { say: string } {
    const bad = stagingInputProblem(this.inputs);
    if (bad) {
      const lim = bad.field === 'isp' ? STAGING_LIMITS.isp : bad.field === 'epsilon' ? STAGING_LIMITS.epsilon : bad.field === 'dv' ? STAGING_LIMITS.dv : STAGING_LIMITS.payload;
      return { say: t(BAD_KEY[bad.field], { n: (bad.stage ?? 0) + 1, min: num(lim[0], bad.field === 'epsilon' ? 2 : 0), max: num(lim[1], bad.field === 'epsilon' ? 2 : 0), stages: STAGING_MAX_STAGES }) };
    }
    const { stages, dvMps, payloadKg } = this.inputs;
    const optimum = optimalStaging(stages, dvMps, payloadKg);
    if (optimum) return { optimum };
    const problem = stagingProblem(stages, dvMps, payloadKg) ?? 'invalid';
    const v = problemValues(problem, stages);
    return { say: t(STAGING_PROBLEM_KEYS[problem], { ...(v.limit !== undefined ? { limit: ms(v.limit) } : {}), ...(v.stage !== undefined ? { stage: v.stage } : {}) }) };
  }

  private renderOut(): void {
    const title = el('h2', 'bx-h2', t('build.eng.staging.out'));
    title.id = 'be-staging-out-title';
    const parts: HTMLElement[] = [title];
    const solved = this.solve();
    if ('say' in solved) {
      const box = el('div', 'bd-say bd-say-fail be-refused');
      box.setAttribute('role', 'alert');
      const tag = el('span', 'bd-say-tag');
      const glyph = el('span', 'bd-say-glyph', '✕');
      glyph.setAttribute('aria-hidden', 'true');
      tag.append(glyph, ` ${t('build.eng.staging.noAnswer')}`);
      box.append(tag, el('span', 'bd-say-body', solved.say));
      parts.push(box);
    } else parts.push(...this.optimumView(solved.optimum));
    parts.push(...this.compareView());
    this.out.replaceChildren(...parts);
  }

  private optimumView(o: OptimalStaging): HTMLElement[] {
    const dl = el('dl', 'be-tiles');
    const tile = (label: string, value: string): void => {
      const box = el('div', 'be-tile');
      box.append(el('dt', undefined, label), el('dd', undefined, value));
      dl.append(box);
    };
    tile(t('build.eng.staging.pi'), pct(o.payloadRatio));
    tile(t('build.eng.staging.gross'), mass(o.grossMass));
    tile(t('build.eng.staging.dv'), ms(o.stageDv.reduce((a, b) => a + b, 0)));

    const table = el('table', 'bs-table be-compare be-staging-table');
    table.append(el('caption', 'bs-sr', t('build.eng.staging.caption')));
    const head = el('tr');
    // a phone has room for three columns: there the mass ratio goes under the Δv and the propellant under the mass (engineer.css)
    for (const [k, cls] of [['build.fig.stage', ''], ['build.eng.staging.col.dv', 'num'], ['build.eng.staging.col.n', 'num be-diff'], ['build.eng.staging.col.mass', 'num'], ['build.eng.staging.col.prop', 'num be-diff']] as const) {
      const th = el('th', cls || undefined, t(k));
      th.scope = 'col';
      head.append(th);
    }
    const thead = el('thead');
    thead.append(head);
    const tbody = el('tbody');
    o.stageDv.forEach((dv, i) => {
      const tr = el('tr');
      const th = el('th', undefined, t('build.label.stage', { n: i + 1 }));
      th.scope = 'row';
      const m = el('td', 'num', mass(o.stageMass[i]));
      m.append(el('small', 'be-diff-in', t('build.eng.staging.propIn', { m: mass(o.propellantMass[i]) })));
      const d = el('td', 'num', ms(dv));
      d.append(el('small', 'be-diff-in', t('build.eng.staging.nIn', { n: num(o.massRatio[i], 2) })));
      tr.append(th, d, el('td', 'num be-diff', num(o.massRatio[i], 2)), m, el('td', 'num be-diff', mass(o.propellantMass[i])));
      tbody.append(tr);
    });
    table.append(thead, tbody);
    const wrap = el('div', 'be-table');
    wrap.append(table);
    const notes = [t('build.eng.staging.note')];
    if (o.stageDv.length > 1) notes.push(t('build.eng.staging.noteSplit'));
    return [dl, wrap, ...notes.map((n) => el('p', 'bx-note small', n))];
  }

  /** "Compare with the real vehicle": its own split beside the optimum at its own stages, Δv and payload. */
  private compareView(): HTMLElement[] {
    const src = this.sourceSpec();
    if (!src) return [];
    const h = el('h3', 'bx-h3 be-compare-title', t('build.eng.staging.compare'));
    const toggle = el('input');
    toggle.type = 'checkbox';
    toggle.checked = this.compare;
    toggle.dataset.k = 'staging:compare';
    toggle.addEventListener('change', () => { this.compare = toggle.checked; this.renderOut(); this.renderPlots(); });
    const label = el('label', 'bx-check');
    label.append(toggle, el('span', undefined, t('build.eng.staging.compareWith', { name: src.spec.name })));
    const parts: HTMLElement[] = [h, label];
    if (!this.compare) return parts;
    const cmp = compareWithVehicle(src.spec, src.payloadKg);
    if (!cmp) {
      const why = realSplit(src.spec, src.payloadKg) ? 'build.eng.staging.compareNone' : 'build.eng.staging.compareStrapOns';
      parts.push(el('p', 'bx-note warn', t(why, { name: src.spec.name })));
      return parts;
    }
    const { real, optimum } = cmp;
    parts.push(el('p', 'bx-note', t('build.eng.staging.compareLead', { name: src.spec.name, dv: ms(real.totalDv), payload: mass(src.payloadKg) })));
    const table = el('table', 'bs-table be-compare');
    table.append(el('caption', 'bs-sr', t('build.eng.staging.compareCaption', { name: src.spec.name })));
    const head = el('tr');
    for (const [k, cls] of [['build.fig.stage', ''], ['build.eng.staging.col.optimum', 'num'], ['build.eng.staging.col.real', 'num']] as const) {
      const th = el('th', cls || undefined, t(k));
      th.scope = 'col';
      head.append(th);
    }
    const thead = el('thead');
    thead.append(head);
    const tbody = el('tbody');
    real.stageDv.forEach((dv, i) => {
      const tr = el('tr');
      const th = el('th', undefined, t('build.label.stage', { n: i + 1 }));
      th.scope = 'row';
      tr.append(th, el('td', 'num', kms(optimum.stageDv[i])), el('td', 'num', kms(dv)));
      tbody.append(tr);
    });
    const foot = el('tr', 'fired');
    const fth = el('th', undefined, t('build.eng.staging.pi'));
    fth.scope = 'row';
    foot.append(fth, el('td', 'num', pct(optimum.payloadRatio)), el('td', 'num', pct(real.payloadRatio)));
    tbody.append(foot);
    table.append(thead, tbody);
    const wrap = el('div', 'be-table');
    wrap.append(table);
    // the usual case, a real first stage taking more than the loss-free optimum, and the other one, said as it is
    const more = real.stageDv[0] > optimum.stageDv[0];
    parts.push(wrap, el('p', 'bx-note be-why', t(more ? 'build.eng.staging.why' : 'build.eng.staging.whyLess', { opt: kms(optimum.stageDv[0]), real: kms(real.stageDv[0]) })));
    if (real.fairingKg > 0) parts.push(el('p', 'bx-note small', t('build.eng.staging.fairingNote', { m: mass(real.fairingKg) })));
    if (!sameInputs(this.inputs, this.source)) parts.push(el('p', 'bx-note small', t('build.eng.staging.compareEdited', { name: src.spec.name })));
    return parts;
  }

  // ─── the two-stage curve ──────────────────────────────────────────────────

  private queueChart(): void {
    if (!this.visible) return;
    requestAnimationFrame(() => this.drawCurve());
  }

  private renderPlots(): void {
    const title = el('h2', 'bx-h2', t('build.eng.staging.plot'));
    title.id = 'be-staging-plots-title';
    const two = this.inputs.stages.length === 2 && !stagingInputProblem(this.inputs);
    if (!two) {
      this.plots.replaceChildren(title, el('p', 'bx-note', t('build.eng.staging.plotTwo')));
      return;
    }
    const box = el('div', 'be-chart be-chart-tall');
    box.append(this.canvas);
    const key = el('div', 'be-key');
    const item = (colour: string, text: string, dashed = false): HTMLElement => {
      const s = el('span', 'be-key-item');
      const sw = el('span', `be-swatch${dashed ? ' dashed' : ''}`);
      sw.style.borderTopColor = colour;
      s.append(sw, text);
      return s;
    };
    key.append(item(COLOURS.curve, t('build.eng.staging.plotCurve')), item(COLOURS.optimum, t('build.eng.staging.optimum')));
    const real = this.realOnCurve();
    if (real !== null) key.append(item(COLOURS.real, t('build.eng.staging.real')));
    // the marked splits in words, for a reader who does not see the chart and where the two marks sit close
    const read = el('div', 'be-plot-read');
    const { stages, dvMps, payloadKg } = this.inputs;
    const o = optimalStaging(stages, dvMps, payloadKg);
    if (o) read.append(el('p', 'bx-note small', t('build.eng.staging.plotRead', { opt: kms(o.stageDv[0]), pi: pct(o.payloadRatio) })));
    if (real !== null) {
      const r = splitPayloadRatio(stages, [real, dvMps - real]);
      read.append(el('p', 'bx-note small', t('build.eng.staging.plotReadReal', { real: kms(real), pi: pct(r) })));
    }
    this.plots.replaceChildren(title, el('p', 'bx-note', t('build.eng.staging.plotLead', { dv: ms(this.inputs.dvMps) })), box, key, read);
    this.drawCurve();
  }

  /** The real split is drawn on the curve when the curve is the real vehicle's own problem. */
  private realOnCurve(): number | null {
    if (!this.compare || !sameInputs(this.inputs, this.source)) return null;
    const src = this.sourceSpec();
    const real = src ? realSplit(src.spec, src.payloadKg) : null;
    return real && real.stageDv.length === 2 ? real.stageDv[0] : null;
  }

  private drawCurve(): void {
    if (!this.visible || !this.plots.contains(this.canvas)) return;
    const { stages, dvMps, payloadKg } = this.inputs;
    if (stages.length !== 2) return;
    const curve = splitCurve(stages as [StagingStage, StagingStage], dvMps, 300);
    const o = optimalStaging(stages, dvMps, payloadKg);
    const [lo, hi] = curve.flyable ?? [0, dvMps];
    const pad = Math.max(50, (hi - lo) * 0.05);
    // the two marks are named in the key and in words under the chart; labels drawn on them would sit on top of each other
    const markers: ChartMarker[] = [];
    const real = this.realOnCurve();
    if (o) markers.push({ x: o.stageDv[0] / 1000, color: COLOURS.optimum, ...(real === null ? { label: t('build.eng.staging.optimum') } : {}) });
    if (real !== null) markers.push({ x: real / 1000, color: COLOURS.real });
    // the curve is named in the key under the chart, not on it: a phone's chart has no room for both a title and a legend
    drawChart(this.canvas, [{ x: curve.dv1.map((v) => v / 1000), y: curve.ratio.map((r) => r * 100), color: COLOURS.curve }], {
      title: t('build.eng.staging.plotTitle'), xLabel: t('u.kms'), yMin: 0, seriesLabels: [t('build.eng.staging.plotCurve')],
      xMin: Math.max(0, lo - pad) / 1000, xMax: Math.min(dvMps, hi + pad) / 1000, markers,
      xFormat: (x) => x.toFixed(1),
    });
  }
}
