/**
 * The Engineer level's sizing page (roadmap D05, "size a vehicle from a
 * payload and an orbit"): a payload, an orbit and a launch site in, and per
 * stage an engine, a structural ratio ε, a diameter and a thrust-to-weight
 * at ignition; out, a launcher sized by src/design/sizing.ts — the planner's
 * own Δv for that orbit from that site, split among the stages as optimal
 * staging splits it, each stage's mass worked from the top down, as few
 * engines as meet the thrust-to-weight, lengths from the propellant's volume
 * — put together from parts (src/design/assemble.ts), drawn to scale, with
 * its figures, its warnings in the builder's words and what in it is an
 * estimate.
 *
 * The page says what the design Δv is, and is not: the planner's allowance,
 * the low end of what the fleet loses on the way up, and a real vehicle may
 * need more — the sizing's own finding, a 1 t launcher that ran out of
 * propellant short of orbit and needed about +500 m/s, most of it for the
 * fairing it carries into its second burn (tests/design-sizing.test.ts). The
 * page starts on that very launcher, and "Check readiness" flies it; "Extra
 * Δv" is there to add the difference. "Open in the builder" hands the sized
 * vehicle to the Explore level's parts builder, where it can be changed,
 * saved and flown.
 *
 * Sizing is quick (the optimum, the assembly, the design checks): it runs on
 * every change, once a frame.
 */
import { t } from '../../i18n';
import type { VehicleSpec } from '../../types';
import { FAIRING_PARTS, enginePart } from '../../data/parts';
import { VEHICLES } from '../../data/vehicles';
import { SITES, siteById } from '../../data/sites';
import { orbitById } from '../../data/orbits';
import { ASCENT_MARGIN_REQUIRED } from '../../physics/mission';
import type { SizingRequest } from '../../design/sizing';
import {
  SIZING_LIMITS, SIZING_MAX_STAGES, defaultSizingRequest, nextSizingStage, sizedReviewChoice, sizingEngines, sizingEstimateTexts, sizingOutcome,
  type SizingOutcome,
} from '../../design/sizing-model';
import { REVIEW_ORBITS, type ReviewChoice } from '../../design/review-model';
import { designChecks, newDesignId } from '../../design/explore-model';
import { stageTable } from '../../design/stage-table';
import type { DrawnPart } from '../../design/exploded';
import { localized, siteName, stageName } from '../names';
import { button, el, num } from '../orbit/dom';
import { StackSvg, type StackLabel } from './stack-svg';
import { figuresView, mass } from './figures';
import { designTextList } from './design-text';
import { field, numberBox, select } from './explore-level';

export interface SizingHost {
  /** load the sized launcher into the Explore level's parts builder, and go there */
  openInBuilder(spec: VehicleSpec, payloadKg: number): void;
  /** put the sized launcher on the bench and review it for the mission it was sized for */
  checkReadiness(spec: VehicleSpec, name: string, payloadKg: number, choice: ReviewChoice): void;
}

const AUTO = 'auto';
const NONE = 'none';

const ms = (v: number): string => `${num(v)} ${t('u.ms')}`;
const metres = (v: number): string => `${num(v, 1)} ${t('u.m')}`;
const orbitName = (id: string): string => localized(`orbit.${id}.name`, orbitById(id).name);
/** "9 × Merlin 1D", or the name alone for one engine. */
const engineLine = (count: number, name: string): string => (count > 1 ? `${count} × ${name}` : name);

export class SizingPanel {
  readonly root = el('div', 'be-sizing');
  private req: SizingRequest = defaultSizingRequest();
  private fairing: string = AUTO;
  private outcome: SizingOutcome;
  /** the last launcher sized, drawn while the request on screen is refused */
  private shown: Extract<SizingOutcome, { ok: true }> | null = null;
  private visible = false;
  private queued = 0;
  private drawQueued = 0;
  private message: string | null = null;

  private readonly ctrl = el('section', 'bs-panel be-ctrl');
  private readonly out = el('section', 'bs-panel be-out');
  private readonly plots = el('section', 'bs-panel be-plots');
  private readonly draw = el('div', 'bs-draw be-size-draw');
  private readonly stack = new StackSvg(() => undefined);
  private readonly ro: ResizeObserver | null;

  constructor(private readonly host: SizingHost) {
    this.ctrl.setAttribute('aria-labelledby', 'be-size-title');
    this.out.setAttribute('aria-labelledby', 'be-size-out-title');
    this.plots.setAttribute('aria-labelledby', 'be-size-plots-title');
    this.draw.append(this.stack.root);
    this.root.append(this.ctrl, this.out, this.plots);
    this.outcome = this.size();
    this.ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => this.queueDrawing()) : null;
    this.ro?.observe(this.draw);
  }

  show(): void {
    this.visible = true;
    this.render();
  }

  hide(): void {
    this.visible = false;
  }

  // ─── the model ────────────────────────────────────────────────────────────

  /** The launcher's name, in the language it is sized in. */
  private name(): string {
    return t('build.eng.size.name', { payload: mass(Number.isFinite(this.req.payloadKg) ? this.req.payloadKg : 0) });
  }

  private request(): SizingRequest {
    return {
      ...this.req, id: 'sized-launcher', name: this.name(),
      ...(this.fairing === AUTO ? {} : { fairing: this.fairing === NONE ? null : this.fairing }),
    };
  }

  private size(): SizingOutcome {
    const out = sizingOutcome(this.request());
    if (out.ok) this.shown = out;
    return out;
  }

  private changed(): void {
    this.message = null;
    if (this.queued) return;
    this.queued = requestAnimationFrame(() => {
      this.queued = 0;
      this.outcome = this.size();
      this.renderOut();
      this.renderPlots();
    });
  }

  /** The stages changed shape (one added or taken off, another engine): new controls too. */
  private reshaped(): void {
    this.message = null;
    this.outcome = this.size();
    this.render();
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
    const title = el('h2', 'bx-h2', t('build.eng.size.title'));
    title.id = 'be-size-title';
    const parts: HTMLElement[] = [title, el('p', 'bx-note', t('build.eng.size.lead'))];
    const r = this.req;

    const payload = numberBox('size:payload', r.payloadKg, { min: SIZING_LIMITS.payload[0], max: SIZING_LIMITS.payload[1], step: 1 }, (v) => { r.payloadKg = v; this.changed(); });
    const payRow = el('span', 'bx-with-unit');
    payRow.append(payload, el('span', 'bx-unit', t('u.kg')));
    parts.push(field(t('build.ex.payload'), payRow));
    parts.push(field(t('build.eng.review.orbit'), select('size:orbit', REVIEW_ORBITS.map((o) => ({ value: o.id, label: orbitName(o.id) })), r.orbit.id, (v) => {
      r.orbit = { ...orbitById(v) };
      this.changed();
    })));
    parts.push(field(t('setup.site'), select('size:site', SITES.map((s) => ({ value: s.id, label: siteName(s) })), r.siteId, (v) => {
      r.siteId = v;
      this.changed();
    })));
    const fairings = [
      { value: AUTO, label: t('build.eng.size.fairingAuto') }, { value: NONE, label: t('build.ex.fairing.none') },
      ...FAIRING_PARTS.map((f) => ({
        value: f.id, label: t('build.ex.fairing.option', { name: VEHICLES.find((v) => v.id === f.id)?.name ?? f.id, d: num(f.diameter, 2), l: num(f.length, 1) }),
      })),
    ];
    parts.push(field(t('build.ex.fairing'), select('size:fairing', fairings, this.fairing, (v) => { this.fairing = v; this.changed(); })));
    const extra = numberBox('size:extra', r.extraDvMps ?? 0, { min: SIZING_LIMITS.extraDv[0], max: SIZING_LIMITS.extraDv[1], step: 10 }, (v) => { r.extraDvMps = v; this.changed(); });
    const extraRow = el('span', 'bx-with-unit');
    extraRow.append(extra, el('span', 'bx-unit', t('u.ms')));
    parts.push(field(t('build.eng.size.extra'), extraRow), el('p', 'bx-note small', t('build.eng.size.extraNote')));

    // the stages
    const n = r.stages.length;
    const stepper = el('div', 'bx-stepper');
    const count = el('output', 'be-count', String(n));
    const minus = button('bs-step', '−', () => { r.stages.pop(); this.reshaped(); });
    const plus = button('bs-step', '+', () => { r.stages.push(nextSizingStage(r.stages[r.stages.length - 1])); this.reshaped(); });
    minus.setAttribute('aria-label', t('build.eng.staging.fewer'));
    plus.setAttribute('aria-label', t('build.eng.staging.more'));
    minus.dataset.k = 'size:minus';
    plus.dataset.k = 'size:plus';
    minus.disabled = n <= 1;
    plus.disabled = n >= SIZING_MAX_STAGES;
    stepper.append(minus, count, plus);
    const countField = el('div', 'bx-field');
    countField.append(el('span', 'bx-field-name', t('build.eng.staging.count', { max: SIZING_MAX_STAGES })), stepper);
    parts.push(countField);

    r.stages.forEach((st, i) => {
      const card = el('fieldset', 'be-stage-in be-size-stage');
      card.append(el('legend', 'bx-h3', t('build.label.stage', { n: i + 1 })));
      const engines = sizingEngines(i);
      const opts = engines.map((p) => ({
        value: p.id,
        label: `${p.name} · ${num(p.thrustVac / 1000)} ${t('u.kN')}${p.vacuumOnly ? ` · ${t('build.ex.engine.vacuum')}` : ''}${p.historical ? ` · ${t('build.ex.engine.historical')}` : ''}`,
      }));
      const eng = select(`size:engine:${i}`, opts, st.enginePart, (v) => { st.enginePart = v; this.reshaped(); });
      const engField = field(t('build.ex.engine'), eng, 'bx-field be-wide');
      const eps = numberBox(`size:eps:${i}`, st.epsilon, { min: SIZING_LIMITS.epsilon[0], max: SIZING_LIMITS.epsilon[1], step: 0.005 }, (v) => { st.epsilon = v; this.changed(); });
      const dia = numberBox(`size:dia:${i}`, st.diameterM, { min: SIZING_LIMITS.diameter[0], max: SIZING_LIMITS.diameter[1], step: 0.05 }, (v) => { st.diameterM = v; this.changed(); });
      const diaRow = el('span', 'bx-with-unit');
      diaRow.append(dia, el('span', 'bx-unit', t('u.m')));
      const tw = numberBox(`size:tw:${i}`, st.targetTW, { min: SIZING_LIMITS.tw[0], max: SIZING_LIMITS.tw[1], step: 0.05 }, (v) => { st.targetTW = v; this.changed(); });
      card.append(engField, field(t('build.fig.eps'), eps), field(t('build.ex.own.diameter'), diaRow),
        field(t(i === 0 ? 'build.eng.size.twLiftoff' : 'build.eng.size.twIgnition'), tw, 'bx-field be-wide'));
      parts.push(card);
    });
    const again = button('watch-btn', t('build.eng.size.reset'), () => { this.req = defaultSizingRequest(); this.fairing = AUTO; this.reshaped(); });
    again.dataset.k = 'size:reset';
    parts.push(again);
    this.ctrl.replaceChildren(...parts);
  }

  private renderOut(): void {
    const title = el('h2', 'bx-h2', t('build.eng.size.out'));
    title.id = 'be-size-out-title';
    const parts: HTMLElement[] = [title];
    const o = this.outcome;
    if (!o.ok) {
      parts.push(designTextList([o.refusal]));
      if (this.shown) parts.push(el('p', 'bx-note', t('build.eng.size.refusedKept')));
      this.out.replaceChildren(...parts);
      return;
    }
    const s = o.sizing;
    const req = this.request();

    // the design Δv, and what it is not
    const dl = el('dl', 'be-tiles');
    const tile = (label: string, value: string, estimate = false): void => {
      const box = el('div', 'be-tile');
      const dt = el('dt', undefined, label);
      if (estimate) dt.append(' ', el('em', 'bs-est', t('build.stat.estimate')));
      box.append(dt, el('dd', undefined, value));
      dl.append(box);
    };
    const table = stageTable(s.spec, req.payloadKg);
    tile(t('build.eng.size.designDv'), ms(s.designDv));
    tile(t('build.fig.liftoffMass'), mass(table.liftoffMass));
    tile(t('build.stat.liftoffTW'), num(table.liftoffTW, 2));
    tile(t('build.stat.height'), metres(s.spec.height), true);
    tile(t('build.fig.payloadFraction'), `${num(table.payloadFraction * 100, 2)} %`);
    parts.push(dl);
    const dvParts = el('p', 'bx-note small', t('build.eng.size.dvParts', {
      cost: ms(s.ascentCost), credit: ms(s.rotationCredit), margin: ms(ASCENT_MARGIN_REQUIRED), extra: ms(req.extraDvMps ?? 0),
      orbit: orbitName(req.orbit.id), site: siteName(siteById(req.siteId)),
    }));
    const warn = el('p', 'bx-note be-size-finding', t('build.eng.size.dvNote'));
    parts.push(dvParts, warn);

    // each stage
    const tb = el('table', 'bs-table be-compare be-size-table');
    tb.append(el('caption', 'bs-sr', t('build.eng.size.caption')));
    const head = el('tr');
    for (const [k, cls] of [['build.fig.stage', ''], ['build.eng.staging.col.dv', 'num'], ['build.eng.size.col.engines', ''], ['build.fig.tw', 'num'],
      ['build.eng.staging.col.mass', 'num'], ['build.eng.size.col.length', 'num be-diff']] as const) {
      const th = el('th', cls || undefined, t(k));
      if (k === 'build.eng.size.col.length') th.append(' ', el('em', 'bs-est', t('build.stat.estimate')));
      th.scope = 'col';
      head.append(th);
    }
    const thead = el('thead');
    thead.append(head);
    const tbody = el('tbody');
    s.stages.forEach((st, i) => {
      const tr = el('tr');
      const th = el('th', undefined, t('build.label.stage', { n: i + 1 }));
      th.scope = 'row';
      const m = el('td', 'num', mass(st.mass));
      m.append(el('small', 'be-sub', t('build.eng.staging.propIn', { m: mass(st.propellantMass) })));
      // a phone has no room for the length column: it goes under the mass (engineer.css)
      m.append(el('small', 'be-diff-in', t('build.eng.size.lengthIn', { l: metres(st.length) })));
      tr.append(th, el('td', 'num', ms(st.dv)), el('td', undefined, engineLine(st.engines, enginePart(req.stages[i].enginePart).name)),
        el('td', 'num', num(st.tw, 2)), m, el('td', 'num be-diff', metres(st.length)));
      tbody.append(tr);
    });
    tb.append(thead, tbody);
    const wrap = el('div', 'be-table');
    wrap.append(tb);
    parts.push(wrap);

    // warnings, then estimates and defaults
    const said = designChecks(s.spec, req.payloadKg, req.siteId);
    const est = sizingEstimateTexts(s, req);
    parts.push(el('h3', 'bx-h3', t('build.ex.checks')), said.length ? designTextList(said) : el('p', 'bx-clear bx-note', t('build.ex.checks.clear')));
    parts.push(el('h3', 'bx-h3', t('build.ex.estimates')), designTextList(est));

    // on to the builder, or the review
    const actions = el('div', 'be-size-actions');
    const open = button('watch-btn', t('build.eng.size.open'), () => this.host.openInBuilder(this.handed(), req.payloadKg));
    open.dataset.k = 'size:open';
    const check = button('watch-btn primary', `${t('build.eng.size.check')} ›`, () => this.host.checkReadiness(this.handed(), this.name(), req.payloadKg, sizedReviewChoice(req)));
    check.dataset.k = 'size:check';
    actions.append(check, open);
    parts.push(actions, el('p', 'bx-note small', t('build.eng.size.actionsNote')));
    if (this.message) parts.push(el('p', 'bx-note', this.message));
    this.out.replaceChildren(...parts);
  }

  /** The sized launcher handed on, under an id of its own (the builder's ids: src/design/explore-model.ts). */
  private handed(): VehicleSpec {
    const o = this.outcome;
    if (!o.ok) throw new Error('nothing sized');
    return { ...structuredClone(o.sizing.spec), id: newDesignId(o.sizing.spec.name) };
  }

  // ─── the drawing and the figures ──────────────────────────────────────────

  private renderPlots(): void {
    const title = el('h2', 'bx-h2', t('build.eng.size.drawn'));
    title.id = 'be-size-plots-title';
    const shown = this.shown;
    if (!shown) { this.plots.replaceChildren(title); return; }
    const spec = shown.sizing.spec;
    const payload = Number.isFinite(this.req.payloadKg) ? this.req.payloadKg : 0;
    const row = el('div', 'be-size-row');
    const figs = el('div', 'be-size-figs');
    figs.append(el('p', 'bs-fig-note', t('build.ex.figNote', { payload: mass(payload) })), figuresView(spec, stageTable(spec, payload)));
    row.append(this.draw, figs);
    this.plots.replaceChildren(title, row);
    this.draw.classList.toggle('stale', !this.outcome.ok);
    this.renderDrawing();
  }

  private queueDrawing(): void {
    if (this.drawQueued || !this.visible) return;
    this.drawQueued = requestAnimationFrame(() => { this.drawQueued = 0; this.renderDrawing(); });
  }

  private label(spec: VehicleSpec, p: DrawnPart): StackLabel {
    const st = spec.stages[p.stageIndex];
    if (p.kind === 'stage') {
      const role = t('build.label.stage', { n: p.stageIndex + 1 });
      return { lines: [role, engineLine(st.engine.count, st.engine.name)], name: `${role}: ${stageName(spec, st.id, st.name)}` };
    }
    const role = t(p.kind === 'fairing' ? 'build.label.fairing' : p.kind === 'booster' ? 'build.label.boosters' : 'build.label.interstage', { n: 1 });
    return { lines: [role], name: role };
  }

  private renderDrawing(): void {
    if (!this.visible || !this.shown) return;
    const w = this.draw.clientWidth, h = this.draw.clientHeight;
    if (w < 10 || h < 10) return;
    const spec = this.shown.sizing.spec;
    this.stack.render({
      spec, explode: 0, selected: null, highlight: null,
      label: (p) => this.label(spec, p), title: t('build.drawing.title', { name: spec.name }),
    }, w, h);
  }
}
