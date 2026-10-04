/**
 * The Engineer level's test stand (roadmap D04, "a static fire"): an engine,
 * or a cluster of them, fired from ignition to the end of its tail-off, in a
 * vacuum chamber, at sea level or at a launch site's altitude.
 *
 * The thin DOM part of src/design/test-stand.ts, which runs the flight's own
 * engine model (src/design/static-fire.ts). The student picks an engine — one
 * the vehicle on the bench carries, or any part of the catalogue — how many,
 * the propellant, the throttle, an optional shutdown and the air, and reads
 * the curves of thrust, mass flow and Isp against time (src/ui/charts.ts),
 * the totals, and the catalogue's published figures beside the stand's, so
 * the model is seen against the data. The stand refuses what the model would
 * run and must not — a vacuum engine in air, a solid shut down — and says why
 * in words, with the way out. The start-up and the tail-off are labelled as
 * the model's estimates, drawn close up.
 *
 * Controls are rebuilt only when their shape changes (another engine, another
 * vehicle, the language); a number or the slider only fires again, so a drag
 * is never interrupted and the keyboard stays where it was.
 */
import { t } from '../../i18n';
import type { VehicleSpec } from '../../types';
import { SITES, siteById } from '../../data/sites';
import { PART_LIMITS } from '../../config/vehicle-spec';
import {
  STAND_AIRS, runStand, standComparison, standCatalogue, standCurves, standPressurePa, standThrottle, standTransients, transientWindows,
  vehicleStandEngines, type StandAir, type StandEngine, type StandFigure, type StandInputs, type StandRow, type StandRun,
} from '../../design/test-stand';
import { drawChart, type ChartMarker, type Series } from '../charts';
import { siteName } from '../names';
import { button, el, num } from '../orbit/dom';
import { mass } from './figures';
import { field, numberBox, select } from './explore-level';

const AIR_KEY: Record<StandAir, string> = {
  vacuum: 'build.eng.stand.air.vacuum', seaLevel: 'build.eng.stand.air.seaLevel', pad: 'build.eng.stand.air.pad',
};
const ROW_KEY: Record<StandFigure, string> = {
  thrustSL: 'build.eng.stand.row.thrustSL', thrustVac: 'build.eng.stand.row.thrustVac', thrustPad: 'build.eng.stand.row.thrustPad',
  meanSL: 'build.eng.stand.row.meanSL', meanVac: 'build.eng.stand.row.meanVac', meanPad: 'build.eng.stand.row.meanPad',
  peakVac: 'build.eng.stand.row.peakVac', ispSL: 'build.eng.stand.row.ispSL', ispVac: 'build.eng.stand.row.ispVac', ispPad: 'build.eng.stand.row.ispPad',
};
const COLOURS = { thrust: '#efa47e', mdot: '#6ec8ff', isp: '#8be5cd' } as const;

/** "9 × Merlin 1D", or the name alone for one engine. */
const engineLine = (name: string, count: number): string => (count > 1 ? `${count} × ${name}` : name);
const kN = (n: number): string => `${num(n / 1000, n < 1e4 ? 2 : n < 1e5 ? 1 : 0)} ${t('u.kN')}`;
const seconds = (s: number): string => `${num(s, s < 100 ? 2 : 1)} ${t('u.s')}`;
const ispText = (s: number): string => `${num(s, 1)} ${t('u.s')}`;
const kPa = (p: number): string => `${num(p / 1000, 1)} ${t('u.kPa')}`;
/** N·s as MN·s from a thousand kN·s up */
const impulse = (ns: number): string => (ns >= 1e9 ? `${num(ns / 1e6)} ${t('build.eng.u.MNs')}` : ns >= 1e6 ? `${num(ns / 1e6, 2)} ${t('build.eng.u.MNs')}` : `${num(ns / 1e3)} ${t('build.eng.u.kNs')}`);
/** a difference as a signed percentage; one that rounds to nothing (a last-digit rounding of equal figures) has no sign */
const signedPercent = (x: number): string => {
  const d = Math.abs(x) < 0.001 ? 2 : 1;
  const shown = Number((Math.abs(x) * 100).toFixed(d));
  return `${shown === 0 ? '' : x > 0 ? '+' : '−'}${num(shown, d)} %`;
};

export class StandPanel {
  readonly root = el('div', 'be-stand');
  private spec: VehicleSpec | null = null;
  private vehicleName = '';
  private engines: StandEngine[] = [];
  private readonly catalogue = standCatalogue();
  private choice!: StandEngine;
  private count = 1;
  private propellantKg = 0;
  private throttle = 1;
  private cutoffOn = false;
  private cutoffS = 60;
  private air: StandAir = 'seaLevel';
  private siteId = 'cape';
  private run: StandRun | null = null;
  /** why the inputs cannot be fired at all (an empty box, no propellant) */
  private invalid: string | null = null;
  private visible = false;
  private queued = 0;

  private readonly ctrl = el('section', 'bs-panel be-ctrl');
  private readonly out = el('section', 'bs-panel be-out');
  private readonly plots = el('section', 'bs-panel be-plots');
  private readonly canvases = {
    thrust: el('canvas'), mdot: el('canvas'), isp: el('canvas'), startup: el('canvas'), tailoff: el('canvas'),
  };
  private readonly transientNote = el('p', 'bx-note');
  private readonly ro: ResizeObserver | null;

  constructor() {
    this.ctrl.setAttribute('aria-labelledby', 'be-stand-title');
    this.out.setAttribute('aria-labelledby', 'be-stand-out-title');
    // not a live region: a throttle drag redraws it every frame, and a screen reader would read it out every frame; a refusal is an alert of its own
    this.plots.setAttribute('aria-labelledby', 'be-stand-plots-title');
    this.root.append(this.ctrl, this.out, this.plots);
    this.ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => this.queueCharts()) : null;
    this.ro?.observe(this.plots);
  }

  /** A new vehicle on the bench: its first stage's engines on the stand, loaded as it flies them. */
  setVehicle(spec: VehicleSpec, name: string): void {
    this.spec = spec;
    this.vehicleName = name;
    this.engines = vehicleStandEngines(spec);
    this.siteId = spec.sites[0] ?? 'cape';
    this.choose(this.engines[0] ?? this.catalogue[0]);
    // drawn now even behind another tab, so the tab opens on this vehicle's controls; its curves are drawn once it is in sight
    this.render();
  }

  /**
   * R3.2: put the engines of one stage or strap-on group of the vehicle on the
   * bench on the stand (a part picked on the bench's drawing), loaded as it
   * flies them. False when the bench vehicle has no engines at `key`.
   */
  selectEngine(key: string): boolean {
    const e = this.engines.find((x) => x.key === key);
    if (!e) return false;
    this.choose(e);
    this.render();
    return true;
  }

  show(): void {
    this.visible = true;
    this.renderOutput();
  }

  hide(): void {
    this.visible = false;
  }

  private choose(e: StandEngine): void {
    this.choice = e;
    this.count = e.count;
    this.propellantKg = e.propellantKg;
    this.fire();
  }

  private inputs(): StandInputs {
    return {
      count: this.count, propellantKg: this.propellantKg, air: this.air, padAltitudeM: siteById(this.siteId).altitude,
      throttle: this.throttle, ...(this.cutoffOn ? { cutoffS: this.cutoffS } : {}),
    };
  }

  /** Fire with what is set, or say which input stops it. */
  private fire(): void {
    this.invalid = null;
    this.run = null;
    if (!Number.isInteger(this.count) || this.count < 1 || this.count > PART_LIMITS.engineCount) this.invalid = t('build.eng.stand.bad.count', { max: PART_LIMITS.engineCount });
    else if (!(this.propellantKg > 0) || this.propellantKg > PART_LIMITS.stagePropellantMass) this.invalid = t('build.eng.stand.bad.propellant', { max: mass(PART_LIMITS.stagePropellantMass) });
    else if (this.cutoffOn && !(this.cutoffS > 0)) this.invalid = t('build.eng.stand.bad.cutoff');
    if (this.invalid) return;
    this.run = runStand(this.choice.engine, this.inputs());
  }

  /** An input changed its value: fire again, once a frame. */
  private changed(): void {
    if (this.queued) return;
    this.queued = requestAnimationFrame(() => {
      this.queued = 0;
      this.fire();
      this.renderOutput();
      this.renderThrottleNote();
    });
  }

  // ─── drawing ──────────────────────────────────────────────────────────────

  render(): void {
    if (!this.spec) return;
    const active = document.activeElement as HTMLElement | null;
    const key = active && this.root.contains(active) ? active.dataset.k ?? null : null;
    this.renderControls();
    this.renderOutput();
    if (key && !this.root.contains(document.activeElement)) this.root.querySelector<HTMLElement>(`[data-k="${CSS.escape(key)}"]`)?.focus();
  }

  private engineLabel(e: StandEngine): string {
    const line = engineLine(e.engine.name, e.count);
    if (e.group === undefined) return t('build.eng.stand.stageEngine', { n: (e.stageIndex ?? 0) + 1, engine: line });
    const groups = this.spec?.stages[e.stageIndex ?? 0]?.boosters?.length ?? 1;
    return groups > 1 ? t('build.eng.stand.boosterGroup', { g: e.group + 1, engine: line }) : t('build.eng.stand.boosterOne', { engine: line });
  }

  private renderControls(): void {
    const title = el('h2', 'bx-h2', t('build.eng.stand.title'));
    title.id = 'be-stand-title';
    const parts: HTMLElement[] = [title, el('p', 'bx-note', t('build.eng.stand.lead'))];

    const onVehicle = t('build.eng.stand.onVehicle', { name: this.vehicleName });
    const catalogueGroup = t('build.eng.stand.catalogue');
    const tags = (e: StandEngine): string => `${e.engine.vacuumOnly ? ` · ${t('build.ex.engine.vacuum')}` : ''}${e.part?.historical ? ` · ${t('build.ex.engine.historical')}` : ''}`;
    const options = [
      ...this.engines.map((e) => ({ value: e.key, label: `${this.engineLabel(e)}${tags(e)}`, group: onVehicle })),
      ...this.catalogue.map((e) => ({ value: e.key, label: `${e.engine.name}${tags(e)}`, group: catalogueGroup })),
    ];
    const engine = select('engine', options, this.choice.key, (v) => {
      const next = [...this.engines, ...this.catalogue].find((e) => e.key === v);
      if (!next) return;
      this.choose(next);
      this.render();
    });
    parts.push(field(t('build.eng.stand.engine'), engine));

    // how many
    const stepper = el('div', 'bx-stepper');
    const box = numberBox('count', this.count, { min: 1, max: PART_LIMITS.engineCount, step: 1 }, (n) => { this.count = n; this.changed(); });
    box.setAttribute('aria-label', t('build.eng.stand.count'));
    const step = (by: number): void => {
      const n = Math.min(PART_LIMITS.engineCount, Math.max(1, (Number(box.value) || 1) + by));
      box.value = String(n);
      this.count = n;
      this.changed();
    };
    const minus = button('bs-step', '−', () => step(-1));
    const plus = button('bs-step', '+', () => step(1));
    minus.setAttribute('aria-label', t('build.ex.countMinus'));
    plus.setAttribute('aria-label', t('build.ex.countPlus'));
    minus.dataset.k = 'count-';
    plus.dataset.k = 'count+';
    for (const c of [box, minus, plus]) c.disabled = this.choice.countLocked;
    stepper.append(minus, box, plus);
    const countLabel = el('div', 'bx-field');
    countLabel.append(el('span', 'bx-field-name', t('build.eng.stand.count')), stepper);
    parts.push(countLabel);
    if (this.choice.countLocked) parts.push(el('p', 'bx-note small', t('build.ex.locked.lumped')));

    // propellant
    const prop = numberBox('propellant', this.propellantKg, { min: 1, max: PART_LIMITS.stagePropellantMass, step: 1 }, (v) => { this.propellantKg = v; this.changed(); });
    const propRow = el('span', 'bx-with-unit');
    propRow.append(prop, el('span', 'bx-unit', t('u.kg')));
    parts.push(field(t('build.eng.stand.propellant'), propRow));

    // throttle
    const e = this.choice.engine;
    const range = el('input', 'be-range');
    range.type = 'range';
    range.min = '1';
    range.max = '100';
    range.step = '1';
    range.value = String(Math.round(this.throttle * 100));
    range.dataset.k = 'throttle';
    const out = el('output', 'be-range-out', `${range.value} %`);
    range.addEventListener('input', () => {
      this.throttle = Number(range.value) / 100;
      out.textContent = `${range.value} %`;
      range.setAttribute('aria-valuetext', `${range.value} %`);
      this.changed();
    });
    range.setAttribute('aria-valuetext', `${range.value} %`);
    const fixed = !!e.solid || e.minThrottle === undefined;
    range.disabled = fixed;
    const throttleRow = el('span', 'be-range-row');
    throttleRow.append(range, out);
    parts.push(field(t('build.eng.stand.throttle'), throttleRow), el('p', 'bx-note small be-throttle-note'));

    // shutdown
    const cut = el('input');
    cut.type = 'checkbox';
    cut.checked = this.cutoffOn;
    cut.dataset.k = 'cutoff-on';
    const cutBox = numberBox('cutoff', this.cutoffS, { min: 0.1, max: 1e5, step: 0.1 }, (v) => { this.cutoffS = v; this.changed(); });
    cutBox.disabled = !this.cutoffOn;
    cutBox.setAttribute('aria-label', t('build.eng.stand.cutoffAt'));
    cut.addEventListener('change', () => {
      this.cutoffOn = cut.checked;
      cutBox.disabled = !cut.checked;
      this.changed();
    });
    const cutLabel = el('label', 'bx-check');
    cutLabel.append(cut, el('span', undefined, t('build.eng.stand.cutoff')));
    const cutRow = el('span', 'bx-with-unit be-cut');
    cutRow.append(cutBox, el('span', 'bx-unit', t('u.s')));
    const cutField = el('div', 'bx-field');
    cutField.append(cutLabel, cutRow);
    parts.push(cutField);
    if (e.solid) parts.push(el('p', 'bx-note small', t('build.eng.stand.solidNote')));

    // the air
    const airs = el('fieldset', 'be-air');
    airs.append(el('legend', 'bx-field-name', t('build.eng.stand.air')));
    for (const a of STAND_AIRS) {
      const r = el('input');
      r.type = 'radio';
      r.name = 'be-air';
      r.value = a;
      r.checked = a === this.air;
      r.dataset.k = `air:${a}`;
      r.addEventListener('change', () => { if (r.checked) { this.air = a; this.fire(); this.render(); } });
      const l = el('label', 'bx-check');
      l.append(r, el('span', undefined, t(AIR_KEY[a])));
      airs.append(l);
    }
    parts.push(airs);
    if (this.air === 'pad') {
      const site = select('site', SITES.map((s) => ({ value: s.id, label: `${siteName(s)} · ${num(s.altitude)} ${t('u.m')}` })), this.siteId, (v) => {
        this.siteId = v;
        this.fire();
        this.render();
      });
      parts.push(field(t('build.eng.stand.site'), site));
    }
    const s = siteById(this.siteId);
    const p = standPressurePa(this.air, s.altitude);
    parts.push(el('p', 'bx-note small', this.air === 'pad'
      ? t('build.eng.stand.padPressure', { h: num(s.altitude), p: kPa(p) })
      : t('build.eng.stand.pressure', { p: kPa(p) })));
    this.ctrl.replaceChildren(...parts);
    this.renderThrottleNote();
  }

  private renderThrottleNote(): void {
    const note = this.ctrl.querySelector<HTMLElement>('.be-throttle-note');
    if (!note) return;
    const e = this.choice.engine;
    const { why } = standThrottle(e, this.throttle);
    const text = e.solid ? t('build.eng.stand.throttleSolid')
      : e.minThrottle === undefined ? t('build.eng.stand.throttleFixed')
        : t(why === 'minimum' ? 'build.eng.stand.throttleClamped' : 'build.eng.stand.throttleMin', { p: num(e.minThrottle * 100) });
    note.textContent = text;
    note.classList.toggle('warn', why === 'minimum');
  }

  private renderOutput(): void {
    if (!this.spec) return;
    const title = el('h2', 'bx-h2', t('build.eng.stand.results'));
    title.id = 'be-stand-out-title';
    const parts: HTMLElement[] = [title];
    const e = this.choice.engine;
    const run = this.run;
    if (this.invalid) {
      parts.push(this.refusalBox(this.invalid, null));
    } else if (run?.result.refused) {
      const vac = run.result.refused === 'vacuumOnlyAtPressure';
      const text = vac ? t('build.eng.stand.refuse.vacuumOnly', { engine: e.name }) : t('build.eng.stand.refuse.solidShutdown');
      const fix = vac
        ? button('watch-btn primary', t('build.eng.stand.toVacuum'), () => { this.air = 'vacuum'; this.fire(); this.render(); this.focus('air:vacuum'); })
        : button('watch-btn primary', t('build.eng.stand.letBurn'), () => { this.cutoffOn = false; this.fire(); this.render(); this.focus('cutoff-on'); });
      fix.dataset.k = 'fix';
      parts.push(this.refusalBox(text, fix));
    } else if (run) {
      parts.push(this.figures(run));
    }
    if (run && !this.invalid) parts.push(...this.comparison(run));
    this.out.replaceChildren(...parts);
    this.renderPlots();
  }

  private focus(k: string): void {
    this.root.querySelector<HTMLElement>(`[data-k="${CSS.escape(k)}"]`)?.focus();
  }

  private refusalBox(text: string, fix: HTMLButtonElement | null): HTMLElement {
    const box = el('div', 'bd-say bd-say-fail be-refused');
    box.setAttribute('role', 'alert');
    const tag = el('span', 'bd-say-tag');
    const glyph = el('span', 'bd-say-glyph', '✕');
    glyph.setAttribute('aria-hidden', 'true');
    tag.append(glyph, ` ${t('build.eng.stand.refused')}`);
    box.append(tag, el('span', 'bd-say-body', text));
    if (fix) box.append(fix);
    return box;
  }

  /** The totals, and how the firing ended. */
  private figures(run: StandRun): HTMLElement {
    const r = run.result;
    const wrap = el('div');
    const dl = el('dl', 'be-tiles');
    const tile = (label: string, value: string, estimate = false): void => {
      const box = el('div', 'be-tile');
      const dt = el('dt', undefined, label);
      if (estimate) dt.append(' ', el('em', 'bs-est', t('build.stat.estimate')));
      box.append(dt, el('dd', undefined, value));
      dl.append(box);
    };
    tile(t('build.eng.stand.impulse'), impulse(r.impulse));
    tile(t('build.eng.stand.burnTime'), seconds(r.burnTime));
    tile(t('build.eng.stand.peak'), kN(r.peakThrust));
    tile(t('build.eng.stand.isp'), ispText(run.deliveredIsp));
    tile(t('build.eng.stand.used'), mass(r.propellantUsed));
    wrap.append(dl);
    // a shutdown set later than the propellant lasts never comes: the tanks ran dry first
    const commanded = this.cutoffOn && Math.abs(r.burnTime - this.cutoffS) < 1e-6;
    const ended = commanded
      ? t('build.eng.stand.endCutoff', { t: seconds(r.burnTime), left: mass(run.leftKg), end: seconds(r.duration) })
      : t('build.eng.stand.endDepletion', { t: seconds(r.burnTime), end: seconds(r.duration) });
    wrap.append(el('p', 'bx-note', ended));
    if (run.level < 1) wrap.append(el('p', 'bx-note', t('build.eng.stand.firedAt', { p: num(run.level * 100) })));
    return wrap;
  }

  /** The published figures beside the stand's, and what the differences mean. */
  private comparison(run: StandRun): HTMLElement[] {
    const e = this.choice.engine;
    const rows = standComparison(e, this.count, this.air, run);
    const own = !this.choice.part;
    const h = el('h3', 'bx-h3', t('build.eng.stand.compare'));
    const lead = el('p', 'bx-note', t(own ? 'build.eng.stand.compareOwn' : 'build.eng.stand.compareLead'));
    const table = el('table', 'bs-table be-compare');
    const cap = el('caption', 'bs-sr', t('build.eng.stand.compareCaption', { engine: engineLine(e.name, this.count) }));
    const head = el('tr');
    for (const k of ['build.eng.stand.col.figure', own ? 'build.eng.stand.col.data' : 'build.eng.stand.col.published', 'build.eng.stand.col.stand', 'build.eng.stand.col.diff']) {
      const th = el('th', k.endsWith('figure') ? undefined : k.endsWith('diff') ? 'num be-diff' : 'num', t(k));
      th.scope = 'col';
      head.append(th);
    }
    const thead = el('thead');
    thead.append(head);
    const tbody = el('tbody');
    const p = kPa(run.pressurePa);
    const value = (row: StandRow, v: number | null, published: boolean): string => {
      if (v === null) return published ? (row.notData ? t('build.eng.stand.notData') : t('build.eng.stand.notPublished')) : '—';
      return row.unit === 'N' ? kN(v) : ispText(v);
    };
    for (const row of rows) {
      const tr = el('tr');
      if (row.stand !== null) tr.classList.add('fired');
      const th = el('th', undefined, t(ROW_KEY[row.figure], { p }));
      th.scope = 'row';
      const pub = el('td', 'num', value(row, row.published, true));
      if (row.published === null) pub.classList.add('be-none');
      const diff = row.difference === null ? null : signedPercent(row.difference);
      // a phone has no room for a fourth column: the difference goes under the stand's figure (engineer.css)
      const stand = el('td', 'num', value(row, row.stand, false));
      if (diff) stand.append(el('small', 'be-diff-in', diff));
      tr.append(th, pub, stand, el('td', 'num be-diff', diff ?? '—'));
      tbody.append(tr);
    }
    table.append(cap, thead, tbody);
    const scroll = el('div', 'be-table');
    scroll.append(table);

    const notes: string[] = [];
    if (this.air === 'pad' && !run.result.refused) notes.push(t('build.eng.stand.note.pad'));
    if (e.solid) {
      notes.push(t('build.eng.stand.note.solidMean'));
      notes.push(t('build.eng.stand.note.solidPeak', { f: num(e.peakFactor ?? 1.2, 2) }));
      if (this.air !== 'vacuum') notes.push(t('build.eng.stand.note.peakVacuum'));
    } else if (run.level < 1 && !run.result.refused) notes.push(t('build.eng.stand.note.throttled', { p: num(run.level * 100) }));
    if (this.air === 'seaLevel' && !e.vacuumOnly && !run.result.refused) notes.push(t('build.eng.stand.note.ispSL'));
    if (e.vacuumOnly) notes.push(t('build.eng.stand.note.vacuumOnly'));
    return [h, lead, scroll, ...notes.map((n) => el('p', 'bx-note small', n))];
  }

  // ─── the curves ───────────────────────────────────────────────────────────

  private queueCharts(): void {
    if (!this.visible) return;
    requestAnimationFrame(() => this.drawCharts());
  }

  private renderPlots(): void {
    const title = el('h2', 'bx-h2', t('build.eng.stand.plots'));
    title.id = 'be-stand-plots-title';
    const fired = !!this.run && !this.run.result.refused && !this.invalid;
    const box = (c: HTMLCanvasElement, cls = 'be-chart'): HTMLElement => {
      const d = el('div', cls);
      d.append(c);
      return d;
    };
    const tr = standTransients(this.choice.engine);
    const est = el('h3', 'bx-h3', t('build.eng.stand.transients'));
    est.append(' ', el('em', 'bs-est', t('build.stat.estimate')));
    this.transientNote.textContent = t(tr.generic ? 'build.eng.stand.transientsNote' : 'build.eng.stand.transientsOwn', {
      s: num(tr.startupS, 2), tau: num(tr.tailoffTauS, 2), span: num(tr.tailoffSpanS, 2),
    });
    const main = el('div', 'be-charts');
    main.append(box(this.canvases.thrust), box(this.canvases.mdot), box(this.canvases.isp));
    const close = el('div', 'be-charts two');
    close.append(box(this.canvases.startup), box(this.canvases.tailoff));
    if (!fired) {
      this.plots.replaceChildren(title, el('p', 'bx-note', t('build.eng.stand.noCurves')));
      return;
    }
    this.plots.replaceChildren(title, main, est, this.transientNote, close);
    this.drawCharts();
  }

  private drawCharts(): void {
    const run = this.run;
    if (!this.visible || !run || run.result.refused || this.invalid || !this.plots.contains(this.canvases.thrust)) return;
    const r = run.result;
    const whole = standCurves(r);
    const line = (x: number[], y: number[], color: string): Series[] => [{ x, y, color }];
    const shutdown: ChartMarker = { x: r.burnTime, color: '#96a3b4', label: t('build.eng.chart.shutdown') };
    const common = { xLabel: t('u.s'), yMin: 0 };
    const firing = { ...common, xMin: 0, xMax: r.duration };
    // the whole firing's shutdown is near its right edge, where a label would be cut off: the line alone, the close-up names it
    drawChart(this.canvases.thrust, line(whole.t, whole.thrustKN, COLOURS.thrust), { ...firing, title: t('build.eng.chart.thrust'), markers: [{ x: r.burnTime, color: shutdown.color }] });
    drawChart(this.canvases.mdot, line(whole.t, whole.mdot, COLOURS.mdot), { ...firing, title: t('build.eng.chart.mdot') });
    drawChart(this.canvases.isp, line(whole.t, whole.isp, COLOURS.isp), { ...firing, title: t('build.eng.chart.isp') });
    // a close-up spans a second or two: its ticks need the decimals the whole firing's do not
    const close = (a: number, b: number) => ({ ...common, xMin: a, xMax: b, xFormat: (x: number) => x.toFixed(b - a < 4 ? 2 : 1) });
    const w = transientWindows(this.choice.engine, r);
    const tr = standTransients(this.choice.engine);
    const up = standCurves(r, w.startup[0], w.startup[1], 600);
    drawChart(this.canvases.startup, line(up.t, up.thrustKN, COLOURS.thrust), {
      ...close(w.startup[0], w.startup[1]), title: t('build.eng.chart.startup'),
      markers: [{ x: tr.startupS, color: '#96a3b4', label: t('build.eng.chart.full') }],
    });
    if (w.tailoff) {
      const down = standCurves(r, w.tailoff[0], w.tailoff[1], 600);
      drawChart(this.canvases.tailoff, line(down.t, down.thrustKN, COLOURS.thrust), {
        ...close(w.tailoff[0], w.tailoff[1]), title: t('build.eng.chart.tailoff'), markers: [shutdown],
      });
    }
  }
}
