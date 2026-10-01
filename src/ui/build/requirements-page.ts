/**
 * The requirements page (roadmap D07, docs/ROADMAP-PART2-3.md; Phase 4 map
 * §3): "Start from requirements" at the Build section's Engineer level, with
 * the satellite bench, at an address of its own, `#/build/engineer/requirements`
 * — a page beside the bench, not a seventh tab on it (six already fill a
 * phone's width, map §2.7).
 *
 * A student says what the mission needs — a place, the coarsest ground sample,
 * the longest wait between looks, by day or not, the node's local time, the
 * life, the solar activity (a fixed ECSS level, so the answer reproduces), the
 * data a day and the stations, the 25-year rule — and the page lists every
 * repeat-ground-track orbit that could fly it, what each asks of the satellite
 * and which requirement binds. The lifetime search and the table run in
 * workers, one after the other, with their progress and a Stop; the page says
 * how many rows and about how long before it runs, and runs no more than
 * `MAX_ROWS`. Two charts: the lifetime against the altitude (the search's own
 * P07 runs) and the aperture the GSD needs against the altitude.
 *
 * A row opens on the D06 bench as a design (`benchDesign`), where every figure
 * is worked out again by D06; the page keeps the row beside what the bench
 * gives (`compareWithBench`) and says why the numbers that differ differ. The
 * mass stays the template's, an estimate, and says so.
 *
 * The thin DOM part: everything it shows comes from
 * src/design/requirements-page.ts and the cores it calls.
 */
import { t } from '../../i18n';
import { drawChart, type Series } from '../charts';
import { runAltitudesJob } from '../../orbit/lifetime-altitude-job';
import type { AltitudeForLifetime } from '../../orbit/lifetime-altitude';
import { STATIONS } from '../../orbit/applications-setup';
import { DESIGN_ACTIVITY_LEVELS, type EcssLevel } from '../../orbit/satellite-air';
import { runTradesJob } from '../../design/requirement-trades-job';
import type { Requirement, TradeRow } from '../../design/requirement-trades';
import type { MissionRequirements } from '../../design/requirements';
import type { SatelliteDesign } from '../../design/satellite-spec';
import { TEMPLATE_TEXT, designFigures, newSatelliteId, type Fig } from '../../design/satellite-model';
import { wetMass } from '../../design/satellite-area';
import {
  MAX_ROWS, REQ_TARGETS, REQ_TEMPLATES, aperturePoints, benchDesign, candidateCycles, compareWithBench, cycleRange, cycleText, disposalState,
  errorKey, lifeState, lifetimeKey, lifetimePoints, lifetimeRequestFor, limitsOf, missionRequirements, otherNode, requirementsProblems,
  restoreForm, runCost, standing, templateDesign, tradeOptionsFor, type CompareLine, type ReqIssue, type ReqNumberField, type RequirementsForm,
  type Standing, type TargetId,
} from '../../design/requirements-page';
import { STATION_KEY } from '../orbit/applications-panel';
import { button, el, hhmm, num } from '../orbit/dom';
import { field, numberBox, select } from './explore-level';
import { toggle } from './satellite-controls';
import { sayFig } from './satellite-text';
import type { SatelliteWorkspace } from './satellite-workspace';
import './requirements.css';

export interface RequirementsPageHost {
  /** back to the satellite bench */
  toBench(): void;
  /** a row was opened: its design is on the workspace; show it on the bench, and say where it came from */
  opened(origin: { designId: string; cycle: string; altitude: number }): void;
}

/** Where this browser keeps the form: a convenience only (a blocked storage starts on the default). */
const FORM_KEY = 'orbitlab.build.requirements.v1';
/** Rows drawn at first, and added by each "show more". */
const PAGE_ROWS = 40;
const P = 'rq:';
const COLOURS = { line: '#8be5cd', asked: '#efd27e', rule: '#efa47e', template: '#6ec8ff' } as const;

const LEVEL_KEY: Record<EcssLevel, string> = { low: 'life.activity.low', moderate: 'life.activity.moderate', high: 'life.activity.high' };
const REQ_KEY: Record<Requirement, string> = {
  gsd: 'build.req.r.gsd', revisit: 'build.req.r.revisit', data: 'build.req.r.data', lifetime: 'build.req.r.lifetime', disposal: 'build.req.r.disposal',
};
const STANDING_KEY: Record<Exclude<Standing['kind'], 'ratio'>, string> = {
  neverSeen: 'build.req.st.neverSeen', noContact: 'build.req.st.noContact', noEngine: 'build.req.st.noEngine',
  notProvenLife: 'build.req.st.notProvenLife', notProvenDown: 'build.req.st.notProvenDown',
};
const FIELD_KEY: Record<ReqIssue['field'], string> = {
  template: 'build.req.f.template', lat: 'use.lat', lon: 'use.lon', gsd: 'build.req.f.gsd', revisitDays: 'build.req.f.revisit',
  ltan: 'build.sat.f.ltan', inclination: 'build.sat.f.inclination', lifeYears: 'build.sat.f.life', activity: 'build.sat.bench.level',
  dataGbit: 'build.req.f.data', stations: 'build.req.f.stations', minElDeg: 'build.sat.f.minEl', tiltDeg: 'build.req.f.tilt',
  minDays: 'build.req.f.minDays', maxDays: 'build.req.f.maxDays',
};
const TARGET_NAME = (id: TargetId): string => t(id === 'custom' ? 'use.st.custom' : STATION_KEY[id]);

/** The table's columns, in order: each a header key and how a row fills it. */
type Column = { key: string; cell: (r: TradeRow, x: Ctx) => string | HTMLElement; num?: boolean; words?: true };
interface Ctx { lifetime: AltitudeForLifetime[] | null; req: MissionRequirements }

const fig = (value: number, unit: Fig['unit'], digits?: number): string => sayFig({ value, unit }, digits);
const days = (d: number): string => `${num(d, 2)} ${t('build.req.u.days')}`;

/**
 * A sentence with figures in it, each figure kept whole on a line: a Thai
 * sentence breaks between its words, and "ม./วินาที" is two of them.
 */
function phrase(key: string, values: Record<string, string>): HTMLElement {
  const marks: Record<string, string> = {};
  for (const k of Object.keys(values)) marks[k] = `\u0000${k}\u0000`;
  const out = el('span', 'brq-words');
  t(key, marks).split(/\u0000(\w+)\u0000/).forEach((part, i) => {
    if (i % 2) out.append(el('span', 'bsat-nw', values[part] ?? ''));
    else if (part) out.append(part);
  });
  return out;
}

/** A requirement's standing on a row, in words: its share of what is allowed or carried, or why it has none. */
function standingText(s: Standing): string {
  if (s.kind !== 'ratio') return t(STANDING_KEY[s.kind]);
  const p = s.value * 100;
  return `${num(p, p < 1 ? 1 : 0)} %`;
}

const COLUMNS: readonly Column[] = [
  { key: 'build.req.col.h', cell: (r) => fig(r.altitude, 'm'), num: true },
  { key: 'build.req.col.i', cell: (r) => fig(r.inclination, 'rad', 2), num: true },
  { key: 'build.req.col.cycle', cell: (r) => cycleText(r), num: true },
  { key: 'build.req.col.focal', cell: (r) => fig(r.focalLength, 'm'), num: true },
  { key: 'build.req.col.aperture', cell: (r) => fig(r.aperture, 'm'), num: true },
  { key: 'build.req.col.swath', cell: (r) => fig(r.swath, 'm'), num: true },
  { key: 'build.req.col.revisit', cell: (r) => (Number.isFinite(r.revisit.maxGap) ? days(r.revisit.maxGap) : t('build.req.st.neverSeen')), num: true },
  { key: 'build.req.col.contact', cell: (r) => `${num(r.contactPerDay / 60, 1)} ${t('u.min')}`, num: true },
  { key: 'build.req.col.maxRate', cell: (r) => fig(r.maxRate, 'bit/s'), num: true },
  { key: 'build.req.col.data', cell: (r) => fig(r.dataPerDay, 'bit'), num: true },
  { key: 'build.req.col.eclipse', cell: (r) => fig(r.power.eclipse, 's'), num: true },
  { key: 'build.req.col.array', cell: (r) => fig(r.power.arrayArea, 'm2'), num: true },
  { key: 'build.req.col.battery', cell: (r) => fig(r.power.batteryWh * 3600, 'J'), num: true },
  {
    key: 'build.req.col.life', words: true, cell: (r, x) => {
      const s = lifeState(r, x.lifetime);
      if (s.kind === 'none') return '—';
      if (s.kind === 'lasts') return t('build.req.life.lasts', { years: num(x.req.lifeYears, x.req.lifeYears % 1 ? 1 : 0) });
      return phrase(s.kind === 'held' ? 'build.req.life.held' : 'build.req.life.notProven', { dv: fig(s.holdDv, 'm/s') });
    },
  },
  {
    key: 'build.req.col.disposal', words: true, cell: (r, x) => {
      const s = disposalState(r, x.lifetime);
      if (s.kind === 'none') return '—';
      if (s.kind === 'inTime') return t('build.req.disp.inTime');
      return phrase(s.kind === 'burn' ? 'build.req.disp.burn' : 'build.req.disp.notProven', { low: fig(s.dvLow, 'm/s'), high: fig(s.dvHigh, 'm/s') });
    },
  },
  {
    key: 'build.req.col.binds', cell: (r, x) => {
      const box = el('span', 'brq-binds');
      const bind = el('span', 'brq-bind', `${t(REQ_KEY[r.binds])}: ${standingText(standing(r, r.binds, x.lifetime))}`);
      box.append(bind);
      if (r.meets) box.append(el('span', 'brq-meets', `✓ ${t('build.req.meets')}`));
      else {
        box.append(el('span', 'brq-unmet', `✕ ${t('build.req.unmet', {
          list: r.unmet.map((k) => (Number.isFinite(r.ratios[k]) ? t(REQ_KEY[k]) : `${t(REQ_KEY[k])} (${standingText(standing(r, k, x.lifetime))})`)).join(', '),
        })}`));
      }
      return box;
    },
  },
];

/** A finished run: what it was run on, and what it found. */
interface Result {
  formKey: string;
  req: MissionRequirements;
  template: SatelliteDesign;
  jd: number;
  lifetime: AltitudeForLifetime[];
  rows: TradeRow[];
}

/** The row last opened on the bench, set beside what the bench gives. */
interface Opened {
  cycle: string;
  altitude: number;
  lines: CompareLine[];
  txRaised: boolean;
}

export class RequirementsPage {
  readonly root = el('div', 'brq-grid');
  readonly titleId = 'brq-title';
  private visible = false;
  private form: RequirementsForm;
  private job: { controller: AbortController; phase: 'lifetime' | 'table'; fraction: number; weights: { lifetime: number; table: number } } | null = null;
  private result: Result | null = null;
  private message: { key: string; error: boolean } | null = null;
  private kept: { key: string; results: AltitudeForLifetime[] } | null = null;
  private onlyMeeting = false;
  private shown = PAGE_ROWS;
  private opened: Opened | null = null;
  /** the row the bench could not take, and why: said in that row, under its button */
  private refused: { cycle: string; text: string } | null = null;
  private readonly head = el('header', 'bs-panel brq-head');
  private readonly formPanel = el('section', 'bs-panel brq-form');
  private readonly runPanel = el('div', 'brq-run');
  private readonly results = el('section', 'bs-panel brq-results');
  private readonly charts = el('section', 'bs-panel brq-charts');
  private readonly lifeCanvas = el('canvas');
  private readonly apertureCanvas = el('canvas');
  private readonly ro: ResizeObserver | null;
  private drawQueued = 0;

  constructor(private readonly ws: SatelliteWorkspace, private readonly host: RequirementsPageHost) {
    let kept: string | null = null;
    try { kept = localStorage.getItem(FORM_KEY); } catch { /* storage blocked: the default form */ }
    this.form = restoreForm(kept);
    this.results.setAttribute('aria-labelledby', 'brq-results-title');
    this.charts.setAttribute('aria-labelledby', 'brq-charts-title');
    this.root.append(this.head, this.formPanel, this.results, this.charts);
    this.ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => this.queueCharts()) : null;
    this.ro?.observe(this.charts);
  }

  show(): void {
    this.visible = true;
    this.ws.readDate();
    this.render();
  }

  hide(): void {
    this.visible = false;
  }

  // ─── the form ─────────────────────────────────────────────────────────────

  private set(patch: Partial<RequirementsForm>, redraw = false): void {
    this.form = { ...this.form, ...patch };
    try { localStorage.setItem(FORM_KEY, JSON.stringify(this.form)); } catch { /* full or blocked: kept for this visit */ }
    if (redraw) this.renderForm();
    else this.renderRun();
    this.renderStale();
  }

  private render(): void {
    if (!this.visible) return;
    this.renderHead();
    this.renderForm();
    this.renderResults();
    this.renderCharts();
  }

  private renderHead(): void {
    const eyebrow = el('span', 'eyebrow bs-eyebrow', `${t('section.build')} · ${t('mode.engineer')}`);
    const title = el('h1', 'bs-title', t('build.req.title'));
    title.id = this.titleId;
    const text = el('div', 'be-head-text');
    text.append(eyebrow, title, el('p', 'bs-lead', t('build.req.lead')));
    const back = button('watch-btn', t('build.req.toBench'), () => this.host.toBench());
    back.dataset.k = `${P}toBench`;
    const side = el('div', 'brq-head-side');
    side.append(back);
    this.head.replaceChildren(text, side);
  }

  /** A number box with its label and unit, its bounds the checker's, marked when the checker refuses it. */
  private numberField(f: ReqNumberField, labelKey: string, unit: string, value: number, step: number, onChange: (v: number) => void,
    more: { placeholder?: string; hint?: string; hintKey?: string } = {}): HTMLElement {
    const [min, max] = limitsOf(f);
    const box = numberBox(`${P}${f}`, value, { min, max, step }, onChange);
    box.dataset.field = f;
    if (more.placeholder !== undefined) box.placeholder = more.placeholder;
    const row = el('span', 'bx-with-unit');
    row.append(box);
    if (unit) row.append(el('span', 'bx-unit', unit));
    const label = field(t(labelKey), row, 'bx-field bsat-field');
    label.append(el('small', 'brq-bounds', t('build.req.bounds', { min: num(min, min % 1 ? 2 : 0), max: num(max, max % 1 ? 2 : 0) })));
    if (more.hint) {
      const hint = el('small', 'brq-hint', more.hint);
      if (more.hintKey) hint.dataset.k = more.hintKey;
      label.append(hint);
    }
    return label;
  }

  private renderForm(): void {
    const f = this.form;
    const groups = el('div', 'brq-groups');
    /** One group of the form: its heading, then its parts. */
    const group = (titleKey: string, ...children: HTMLElement[]): void => {
      const g = el('section', 'brq-group');
      g.append(el('h3', 'bx-h3', t(titleKey)), ...children);
      groups.append(g);
    };

    // where it starts from, and what stays the template's
    const start = el('div', 'bsat-fields');
    const tpl = select(`${P}template`, REQ_TEMPLATES.map((id) => ({ value: id, label: t(TEMPLATE_TEXT[id]?.name ?? id) })), f.template,
      (v) => this.set({ template: v }, true));
    start.append(field(t('build.req.f.template'), tpl, 'bx-field bsat-field'));
    const target = select(`${P}target`, REQ_TARGETS.map((id) => ({ value: id, label: TARGET_NAME(id) })), f.target,
      (v) => this.set({ target: v as TargetId }, true));
    start.append(field(t('build.req.f.target'), target, 'bx-field bsat-field'));
    if (f.target === 'custom') {
      start.append(
        this.numberField('lat', 'use.lat', '°', f.lat, 0.1, (v) => this.set({ lat: v })),
        this.numberField('lon', 'use.lon', '°', f.lon, 0.1, (v) => this.set({ lon: v })),
      );
    }
    const mass = wetMass(templateDesign(f.template));
    const note = el('p', 'bx-note small');
    note.append(t('build.req.massNote', { mass: fig(mass, 'kg') }), ' ', el('em', 'bs-est', t('build.stat.estimate')));
    group('build.req.form.start', start, note);

    // what the camera must do
    const see = el('div', 'bsat-fields');
    see.append(
      this.numberField('gsd', 'build.req.f.gsd', t('u.m'), f.gsd, 0.1, (v) => this.set({ gsd: v })),
      this.numberField('revisitDays', 'build.req.f.revisit', t('build.req.u.days'), f.revisitDays, 1, (v) => {
        this.set({ revisitDays: v });
        // the longest cycle tried follows the revisit asked until one is typed
        if (!Number.isFinite(v)) return;
        const auto = cycleRange({ ...this.form, maxDays: null }).max;
        const box = this.formPanel.querySelector<HTMLInputElement>(`[data-k="${P}maxDays"]`);
        if (box) box.placeholder = String(auto);
        const hint = this.formPanel.querySelector<HTMLElement>(`[data-k="${P}maxDaysHint"]`);
        if (hint) hint.textContent = t('build.req.f.maxDaysHint', { n: num(auto) });
      }),
      this.numberField('tiltDeg', 'build.req.f.tilt', '°', f.tiltDeg, 5, (v) => this.set({ tiltDeg: v }), { hint: t('build.req.f.tiltHint') }),
    );
    group('build.req.form.see', see,
      toggle(`${P}daylight`, 'build.req.f.daylight', f.daylightOnly, (on) => this.set({ daylightOnly: on }), 'build.req.f.daylightNote'));

    // the orbit's plane
    const plane = el('div', 'bsat-fields');
    if (f.sso) {
      plane.append(this.numberField('ltan', 'build.sat.f.ltan', t('build.sat.u.h'), f.ltan, 0.25, (v) => {
        this.set({ ltan: v });
        const hint = this.formPanel.querySelector<HTMLElement>(`[data-k="${P}ltdn"]`);
        if (hint) hint.textContent = Number.isFinite(v) ? t('build.req.f.ltdn', { time: hhmm(otherNode(v)), ltan: hhmm(v) }) : '';
      }, { hint: t('build.req.f.ltdn', { time: hhmm(otherNode(f.ltan)), ltan: hhmm(f.ltan) }), hintKey: `${P}ltdn` }));
    } else {
      plane.append(this.numberField('inclination', 'build.sat.f.inclination', '°', f.inclination, 0.1, (v) => this.set({ inclination: v }),
        { hint: t('build.req.f.nodeHint') }));
    }
    group('build.req.form.plane', toggle(`${P}sso`, 'build.sat.sso', f.sso, (on) => this.set({ sso: on }, true), 'build.req.f.ssoNote'), plane);

    // the life and its end
    const life = el('div', 'bsat-fields');
    life.append(this.numberField('lifeYears', 'build.sat.f.life', t('build.sat.u.years'), f.lifeYears, 1, (v) => this.set({ lifeYears: v })));
    const level = select(`${P}activity`, DESIGN_ACTIVITY_LEVELS.map((l) => ({ value: l, label: t(LEVEL_KEY[l]) })), f.activity,
      (v) => this.set({ activity: v as EcssLevel }));
    // the two menus' choices are long: each takes the group's width
    life.append(field(t('build.sat.bench.level'), level, 'bx-field bsat-field brq-wide'));
    const disposal = select(`${P}disposal`, [
      { value: '25y', label: t('build.req.disposal.25y') }, { value: 'none', label: t('build.req.disposal.none') },
    ], f.disposal, (v) => this.set({ disposal: v === 'none' ? 'none' : '25y' }));
    life.append(field(t('build.req.f.disposal'), disposal, 'bx-field bsat-field brq-wide'));
    group('build.req.form.life', life);

    // the data and the stations
    const data = el('div', 'bsat-fields');
    data.append(
      this.numberField('dataGbit', 'build.req.f.data', t('build.req.u.gbitDay'), f.dataGbit, 10, (v) => this.set({ dataGbit: v })),
      this.numberField('minElDeg', 'build.sat.f.minEl', '°', f.minElDeg, 1, (v) => this.set({ minElDeg: v })),
    );
    const stations = el('fieldset', 'brq-stations');
    stations.append(el('legend', 'bx-field-name', t('build.req.f.stations')));
    for (const s of STATIONS) {
      const label = el('label', 'bx-check');
      const box = el('input');
      box.type = 'checkbox';
      box.checked = f.stations.includes(s.id);
      box.dataset.k = `${P}st:${s.id}`;
      box.addEventListener('change', () => {
        const next = STATIONS.map((x) => x.id).filter((id) => (id === s.id ? box.checked : this.form.stations.includes(id)));
        this.set({ stations: next });
      });
      label.append(box, el('span', undefined, t(STATION_KEY[s.id])));
      stations.append(label);
    }
    stations.append(el('small', 'brq-hint', t('build.req.f.stationsNote')));
    group('build.req.form.data', data, stations);

    // which orbits to try
    const cycles = el('div', 'bsat-fields');
    const auto = cycleRange({ ...f, maxDays: null }).max;
    cycles.append(
      this.numberField('minDays', 'build.req.f.minDays', t('build.req.u.days'), f.minDays, 1, (v) => this.set({ minDays: v })),
      this.numberField('maxDays', 'build.req.f.maxDays', t('build.req.u.days'), f.maxDays ?? Number.NaN, 1, (v) => {
        const box = this.formPanel.querySelector<HTMLInputElement>(`[data-k="${P}maxDays"]`);
        this.set({ maxDays: box && box.value.trim() === '' ? null : v });
      // with no revisit typed yet there is no default to name
      }, Number.isFinite(auto)
        ? { placeholder: String(auto), hint: t('build.req.f.maxDaysHint', { n: num(auto) }), hintKey: `${P}maxDaysHint` }
        : { placeholder: '', hint: ' ', hintKey: `${P}maxDaysHint` }),
    );
    group('build.req.form.cycles', cycles);

    const focus = this.formPanel.contains(document.activeElement) ? (document.activeElement as HTMLElement).dataset.k : undefined;
    this.formPanel.replaceChildren(el('h2', 'bx-h2', t('build.req.form.title')), el('p', 'bx-note', t('build.req.form.lead')), groups, this.runPanel);
    if (focus) this.formPanel.querySelector<HTMLElement>(`[data-k="${CSS.escape(focus)}"]`)?.focus();
    this.renderRun();
  }

  // ─── the run ──────────────────────────────────────────────────────────────

  private issues(): ReqIssue[] {
    return requirementsProblems(this.form);
  }

  private renderRun(): void {
    const parts: HTMLElement[] = [];
    const issues = this.issues();
    for (const box of this.formPanel.querySelectorAll<HTMLInputElement>('input[data-field]')) {
      box.setAttribute('aria-invalid', String(issues.some((i) => i.field === box.dataset.field)));
    }
    if (issues.length) {
      const list = el('ul', 'bd-say-list');
      for (const i of issues) {
        const li = el('li', 'bd-say bd-say-fail');
        const values: Record<string, string> = {};
        for (const [k, v] of Object.entries(i.values ?? {})) values[k] = num(v, v % 1 ? 2 : 0);
        li.append(el('span', 'bd-say-body', `${t(FIELD_KEY[i.field])}: ${t(i.key, values)}`));
        list.append(li);
      }
      parts.push(list);
    }
    const cycles = issues.length ? [] : candidateCycles(this.form);
    const template = issues.length ? null : templateDesign(this.form.template);
    const keptLife = template ? this.keptLifetime(template) : null;
    const cost = runCost(cycles, keptLife ? 0 : this.form.disposal === '25y' ? 2 : 1);
    if (!issues.length) {
      if (!cost.rows) parts.push(el('p', 'bx-note warn', t('build.req.noRows')));
      else {
        parts.push(el('p', 'bx-note', t('build.req.cost', {
          rows: num(cost.rows), min: num(cost.minDays), max: num(cost.maxDays), table: num(Math.max(1, Math.round(cost.tableSeconds))),
        })));
        parts.push(el('p', 'bx-note', keptLife ? t('build.req.costKept')
          : t('build.req.costLife', { life: num(Math.max(1, Math.round(cost.lifetimeSeconds))) })));
        parts.push(el('p', 'bx-note small', t('build.req.costTablet')));
        if (cost.tooMany) parts.push(el('p', 'bx-note warn', t('build.req.tooMany', { rows: num(cost.rows), max: num(MAX_ROWS) })));
      }
    }
    const job = this.job;
    if (job) {
      const line = el('div', 'bx-progress');
      line.setAttribute('role', 'status');
      const bar = el('progress');
      bar.max = 1;
      bar.value = this.overall();
      bar.setAttribute('aria-label', t('build.req.title'));
      line.append(bar, el('span', 'brq-progress-text', this.progressText()));
      const stop = button('watch-btn', t('build.req.stop'), () => job.controller.abort());
      stop.dataset.k = `${P}stop`;
      line.append(stop);
      parts.push(line);
    } else {
      const go = button('watch-btn primary', t('build.req.run'), () => this.run());
      go.dataset.k = `${P}run`;
      go.disabled = issues.length > 0 || !cost.rows || cost.tooMany;
      parts.push(go);
    }
    if (this.message) {
      const p = el('p', `bx-note${this.message.error ? ' bx-msg-error' : ''}`, t(this.message.key));
      p.setAttribute('role', 'status');
      parts.push(p);
    }
    const hadFocus = this.runPanel.contains(document.activeElement);
    this.runPanel.replaceChildren(...parts);
    if (hadFocus) this.runPanel.querySelector<HTMLElement>(`[data-k="${P}${job ? 'stop' : 'run'}"]`)?.focus();
  }

  /** The lifetime search's answers kept from the last run, where this form would ask the same search. */
  private keptLifetime(template: SatelliteDesign): AltitudeForLifetime[] | null {
    if (!this.kept) return null;
    return this.kept.key === lifetimeKey(lifetimeRequestFor(template, this.form, this.ws.jd())) ? this.kept.results : null;
  }

  private overall(): number {
    const j = this.job;
    if (!j) return 0;
    const total = j.weights.lifetime + j.weights.table;
    const done = j.phase === 'lifetime' ? j.fraction * j.weights.lifetime : j.weights.lifetime + j.fraction * j.weights.table;
    return total > 0 ? done / total : 0;
  }

  private progressText(): string {
    const j = this.job!;
    return t(j.phase === 'lifetime' ? 'build.req.running.life' : 'build.req.running.table', { p: Math.round(j.fraction * 100) });
  }

  private progress(phase: 'lifetime' | 'table', fraction: number): void {
    const j = this.job;
    if (!j) return;
    j.phase = phase;
    j.fraction = fraction;
    const bar = this.runPanel.querySelector('progress');
    if (bar) bar.value = this.overall();
    const text = this.runPanel.querySelector('.brq-progress-text');
    if (text) text.textContent = this.progressText();
  }

  /** Run the lifetime search (unless its answers are kept), then the table, each in its worker; a Stop ends whichever is running. */
  private async run(): Promise<void> {
    if (this.job || this.issues().length) return;
    const form = structuredClone(this.form);
    const formKey = JSON.stringify(form);
    this.ws.readDate();
    const jd = this.ws.jd();
    const template = templateDesign(form.template);
    const req = missionRequirements(form);
    const cycles = candidateCycles(form);
    const lifeReq = lifetimeRequestFor(template, form, jd);
    const kept = this.keptLifetime(template);
    const cost = runCost(cycles, kept ? 0 : lifeReq.years.length);
    if (!cycles.length || cost.tooMany) return;
    const controller = new AbortController();
    this.job = { controller, phase: kept ? 'table' : 'lifetime', fraction: 0, weights: { lifetime: cost.lifetimeSeconds, table: cost.tableSeconds } };
    this.message = null;
    this.renderRun();
    try {
      const lifetime = kept ?? await runAltitudesJob(lifeReq, controller.signal, (f) => this.progress('lifetime', f));
      this.kept = { key: lifetimeKey(lifeReq), results: lifetime };
      this.progress('table', 0);
      // the D06 bench's own figures for the template give the link and camera the rows use
      const opts = tradeOptionsFor(template, form, jd, lifetime, designFigures(template, jd, { level: form.activity }));
      const rows = await runTradesJob({ req, template, opts }, controller.signal, (f) => this.progress('table', f));
      this.result = { formKey, req, template, jd, lifetime, rows };
      this.shown = PAGE_ROWS;
      this.opened = null;
      this.refused = null;
    } catch (e) {
      const key = errorKey(e);
      this.message = { key, error: key !== 'build.req.err.stopped' };
    } finally {
      this.job = null;
      if (this.visible) {
        this.renderRun();
        this.renderResults();
        this.renderCharts();
      }
    }
  }

  // ─── the table ────────────────────────────────────────────────────────────

  private renderStale(): void {
    const note = this.results.querySelector<HTMLElement>('.brq-stale');
    if (note) note.hidden = !this.result || this.result.formKey === JSON.stringify(this.form);
  }

  private renderResults(): void {
    const r = this.result;
    const title = el('h2', 'bx-h2', t('build.req.table.title'));
    title.id = 'brq-results-title';
    if (!r) {
      this.results.replaceChildren(title, el('p', 'bx-note', t('build.req.table.empty')));
      return;
    }
    const parts: HTMLElement[] = [title];
    const meeting = r.rows.filter((x) => x.meets).length;
    const date = new Date((r.jd - 2440587.5) * 86400e3).toISOString().slice(0, 10);
    parts.push(el('p', 'bx-note', t('build.req.table.summary', {
      rows: num(r.rows.length), meet: num(meeting), date, level: t(LEVEL_KEY[r.req.activity]),
    })));
    const stale = el('p', 'bx-note warn brq-stale', t('build.req.table.stale'));
    stale.hidden = r.formKey === JSON.stringify(this.form);
    parts.push(stale);
    if (this.opened) parts.push(this.compareBox(this.opened));
    parts.push(toggle(`${P}only`, 'build.req.table.only', this.onlyMeeting, (on) => { this.onlyMeeting = on; this.shown = PAGE_ROWS; this.renderResults(); }));
    const rows = this.onlyMeeting ? r.rows.filter((x) => x.meets) : r.rows;
    if (!rows.length) parts.push(el('p', 'bx-note', t(r.rows.length ? 'build.req.table.noneMeet' : 'build.req.noRows')));
    else {
      parts.push(this.table(rows.slice(0, this.shown), r));
      if (rows.length > this.shown) {
        const more = button('watch-btn', t('build.req.table.more', { n: num(Math.min(PAGE_ROWS, rows.length - this.shown)), total: num(rows.length) }), () => {
          this.shown += PAGE_ROWS;
          this.renderResults();
          this.results.querySelector<HTMLElement>(`[data-k="${P}more"]`)?.focus();
        });
        more.dataset.k = `${P}more`;
        parts.push(more);
      }
    }
    const notes = el('ul', 'brq-notes');
    for (const key of ['build.req.note.binds', 'build.req.note.gsd', 'build.req.note.rate', 'build.req.note.power', 'build.req.note.life',
      'build.req.note.disposal', 'build.req.note.revisit', 'build.req.note.mass'] as const) {
      const li = el('li', undefined, t(key));
      if (key === 'build.req.note.mass' || key === 'build.req.note.power') li.append(' ', el('em', 'bs-est', t('build.stat.estimate')));
      notes.append(li);
    }
    parts.push(notes);
    const hadFocus = this.results.contains(document.activeElement) ? (document.activeElement as HTMLElement).dataset.k : undefined;
    this.results.replaceChildren(...parts);
    if (hadFocus) this.results.querySelector<HTMLElement>(`[data-k="${CSS.escape(hadFocus)}"]`)?.focus();
  }

  private table(rows: readonly TradeRow[], r: Result): HTMLElement {
    const wrap = el('div', 'brq-table-wrap');
    const table = el('table', 'bs-table brq-table');
    table.append(el('caption', 'brq-caption', t('build.req.table.caption')));
    const head = el('tr');
    for (const c of COLUMNS) {
      const th = el('th', c.num ? 'num' : undefined, t(c.key));
      th.scope = 'col';
      head.append(th);
    }
    const thead = el('thead');
    thead.append(head);
    const body = el('tbody');
    const ctx: Ctx = { lifetime: r.lifetime, req: r.req };
    for (const row of rows) {
      const tr = el('tr', row.meets ? 'meets' : 'unmet');
      if (this.opened?.cycle === cycleText(row)) tr.classList.add('opened');
      COLUMNS.forEach((c, k) => {
        const cell = k === 0 ? el('th') : el('td');
        if (k === 0) (cell as HTMLTableCellElement).scope = 'row';
        if (c.num) cell.classList.add('num');
        cell.dataset.label = t(c.key);
        // a figure never parts from its unit; a sentence (the lifetime, the disposal) wraps between its words, each figure in it kept whole
        const v = c.cell(row, ctx);
        if (typeof v === 'string') cell.append(el('span', c.words ? 'brq-words' : 'bsat-nw', v)); else cell.append(v);
        // the row's action sits in its header cell, under the altitude: a column of its own does not fit a laptop's width in Russian
        if (k === 0) {
          const b = button('watch-btn brq-open', t('build.req.open'), () => this.openRow(row));
          b.dataset.k = `${P}open:${cycleText(row)}`;
          b.setAttribute('aria-label', t('build.req.openRow', { cycle: cycleText(row), h: fig(row.altitude, 'm') }));
          cell.append(b);
        }
        tr.append(cell);
      });
      body.append(tr);
      // why the bench could not take it, on a line of its own under the row
      if (this.refused?.cycle === cycleText(row)) {
        const line = el('tr', 'brq-refused-row');
        const td = el('td');
        td.colSpan = COLUMNS.length;
        const why = el('span', 'brq-refused bx-msg-error', this.refused.text);
        why.setAttribute('role', 'status');
        td.append(why);
        line.append(td);
        body.append(line);
      }
    }
    table.append(thead, body);
    wrap.append(table);
    return wrap;
  }

  // ─── a row on the bench ───────────────────────────────────────────────────

  private openRow(row: TradeRow): void {
    const r = this.result;
    if (!r) return;
    const cycle = cycleText(row);
    const name = t('build.req.designName', { cycle, h: fig(row.altitude, 'm') });
    const b = benchDesign(r.template, row, r.req, r.jd, r.req.activity, newSatelliteId(), name);
    if (!b.ok) {
      this.refused = { cycle, text: t(b.key, { field: b.field ? t(b.field) : '' }) };
      this.renderResults();
      return;
    }
    this.opened = { cycle, altitude: row.altitude, lines: compareWithBench(row, r.req, r.template, b), txRaised: b.txRaised };
    this.refused = null;
    // the bench reads the air at the level the table was worked out for, as the lifetime search did
    this.ws.setLevel(r.req.activity);
    this.ws.replace({ design: b.design, recordId: null, defaultName: '' });
    this.host.opened({ designId: b.design.id, cycle, altitude: row.altitude });
  }

  /** The row last opened beside what the bench gives for its design: each figure both show, and why the ones that differ differ. */
  private compareBox(o: Opened): HTMLElement {
    const box = el('section', 'brq-compare');
    box.setAttribute('aria-labelledby', 'brq-compare-title');
    const h = el('h3', 'bx-h3', t('build.req.cmp.title', { cycle: o.cycle, h: fig(o.altitude, 'm') }));
    h.id = 'brq-compare-title';
    box.append(h, el('p', 'bx-note small', t('build.req.cmp.lead')));
    const table = el('table', 'bs-table be-compare brq-compare-table');
    const head = el('tr');
    for (const k of ['build.req.cmp.figure', 'build.req.cmp.row', 'build.req.cmp.bench'] as const) {
      const th = el('th', undefined, t(k));
      th.scope = 'col';
      head.append(th);
    }
    const thead = el('thead');
    thead.append(head);
    const body = el('tbody');
    for (const l of o.lines) {
      const tr = el('tr', l.same ? 'same' : 'differs');
      const th = el('th', undefined, t(l.key));
      th.scope = 'row';
      if (!l.same && l.why) th.append(el('small', 'brq-why', t(l.why)));
      // as the bench writes the same figure: an inclination to 0.01°, the rest in their unit's own digits
      const digits = l.row.unit === 'rad' ? 2 : undefined;
      const rowCell = el('td', 'num', sayFig(l.row, digits));
      const benchCell = el('td', 'num', `${sayFig(l.bench, digits)}${l.same ? ' =' : ' ≠'}`);
      // a phone shows each line as its name, then the two figures each beside its column's name
      rowCell.dataset.label = t('build.req.cmp.row');
      benchCell.dataset.label = t('build.req.cmp.bench');
      tr.append(th, rowCell, benchCell);
      body.append(tr);
    }
    table.append(thead, body);
    const wrap = el('div', 'be-table');
    wrap.append(table);
    box.append(wrap, el('p', 'bx-note small', t('build.req.cmp.life')));
    const toBench = button('watch-btn', t('build.req.toBench'), () => this.host.toBench());
    toBench.dataset.k = `${P}cmpBench`;
    box.append(toBench);
    return box;
  }

  // ─── the charts ───────────────────────────────────────────────────────────

  private renderCharts(): void {
    const title = el('h2', 'bx-h2', t('build.req.chart.title'));
    title.id = 'brq-charts-title';
    const r = this.result;
    if (!r) {
      this.charts.replaceChildren(title, el('p', 'bx-note', t('build.req.chart.empty')));
      return;
    }
    const key = (items: [string, string, boolean][]): HTMLElement => {
      const k = el('div', 'be-key');
      for (const [colour, text, dashed] of items) {
        const s = el('span', 'be-key-item');
        const sw = el('span', `be-swatch${dashed ? ' dashed' : ''}`);
        sw.style.borderTopColor = colour;
        s.append(sw, text);
        k.append(s);
      }
      return k;
    };
    const plot = (canvas: HTMLCanvasElement, keyItems: [string, string, boolean][], read: string[]): HTMLElement => {
      const p = el('div', 'be-plot');
      const box = el('div', 'be-chart be-chart-tall');
      box.append(canvas);
      p.append(box, key(keyItems), ...read.map((s) => el('p', 'bx-note small', s)));
      return p;
    };
    const [life, down] = r.lifetime;
    const lifeRead = [life.outcome === 'found'
      ? t('build.req.chart.lifeFound', { years: num(life.years, life.years % 1 ? 1 : 0), h: fig(life.altitude!, 'm') })
      : t(life.outcome === 'belowRange' ? 'build.req.chart.lifeBelow' : 'build.req.chart.lifeAbove', { years: num(life.years, life.years % 1 ? 1 : 0) })];
    if (down) {
      lifeRead.push(down.outcome === 'found'
        ? t('build.req.chart.downFound', { years: num(down.years, down.years % 1 ? 1 : 0), h: fig(down.altitude!, 'm') })
        : t(down.outcome === 'belowRange' ? 'build.req.chart.lifeBelow' : 'build.req.chart.lifeAbove', { years: num(down.years, down.years % 1 ? 1 : 0) }));
    }
    const lifeKey: [string, string, boolean][] = [
      [COLOURS.line, t('build.req.chart.lifeRuns'), false],
      [COLOURS.asked, t('build.req.chart.lifeAsked', { years: num(r.req.lifeYears, r.req.lifeYears % 1 ? 1 : 0) }), true],
    ];
    if (down) lifeKey.push([COLOURS.rule, t('build.req.chart.life25', { years: num(down.years, down.years % 1 ? 1 : 0) }), true]);
    const cam = r.template.payload!;
    const apPts = aperturePoints(r.rows);
    const over = apPts.find((p) => p.aperture > cam.aperture);
    const apRead = [over
      ? t('build.req.chart.apertureOver', { h: fig(over.altitude, 'm'), d: fig(cam.aperture, 'm') })
      : t('build.req.chart.apertureUnder', { d: fig(cam.aperture, 'm') })];
    this.charts.replaceChildren(
      title,
      el('p', 'bx-note', t('build.req.chart.lead')),
      el('div', 'be-charts two brq-plots'),
    );
    this.charts.querySelector('.brq-plots')!.append(
      plot(this.lifeCanvas, lifeKey, lifeRead),
      plot(this.apertureCanvas, [[COLOURS.line, t('build.req.chart.apertureRows'), false], [COLOURS.template, t('build.req.chart.apertureTemplate', { d: fig(cam.aperture, 'm') }), true]], apRead),
    );
    this.queueCharts();
  }

  private queueCharts(): void {
    if (!this.visible || this.drawQueued) return;
    this.drawQueued = requestAnimationFrame(() => { this.drawQueued = 0; this.drawCharts(); });
  }

  private drawCharts(): void {
    const r = this.result;
    if (!this.visible || !r || !this.charts.contains(this.lifeCanvas)) return;
    const km = (m: number): number => m / 1000;
    const pts = lifetimePoints(r.lifetime);
    const years = [r.req.lifeYears, ...(r.lifetime[1] ? [r.lifetime[1].years] : [])];
    const top = Math.max(...years) * 1.25;
    const shown = pts.filter((p) => p.years <= top * 1.6);
    const xMax = Math.max(...shown.map((p) => km(p.altitude)), ...r.lifetime.filter((x) => x.outcome === 'found').map((x) => km(x.hi))) * 1.08;
    const xMin = Math.min(...shown.map((p) => km(p.altitude)));
    const life: Series[] = [{ x: shown.map((p) => km(p.altitude)), y: shown.map((p) => p.years), color: COLOURS.line }];
    life.push({ x: [xMin, xMax], y: [r.req.lifeYears, r.req.lifeYears], color: COLOURS.asked, dash: [5, 4] });
    if (r.lifetime[1]) life.push({ x: [xMin, xMax], y: [r.lifetime[1].years, r.lifetime[1].years], color: COLOURS.rule, dash: [5, 4] });
    drawChart(this.lifeCanvas, life, {
      title: t('build.req.chart.life'), xLabel: t('u.km'), yMin: 0, yMax: top, xMin, xMax,
      seriesLabels: [t('build.req.chart.lifeRuns'), t('build.req.chart.lifeAsked', { years: num(r.req.lifeYears) }),
        ...(r.lifetime[1] ? [t('build.req.chart.life25', { years: num(r.lifetime[1].years) })] : [])],
      xFormat: (x) => num(x),
    });
    const ap = aperturePoints(r.rows);
    const cam = r.template.payload!;
    const ax = ap.map((p) => km(p.altitude));
    drawChart(this.apertureCanvas, [
      { x: ax, y: ap.map((p) => p.aperture), color: COLOURS.line },
      { x: [Math.min(...ax), Math.max(...ax)], y: [cam.aperture, cam.aperture], color: COLOURS.template, dash: [5, 4] },
    ], {
      title: t('build.req.chart.aperture'), xLabel: t('u.km'), yMin: 0,
      seriesLabels: [t('build.req.chart.apertureRows'), t('build.req.chart.apertureTemplate', { d: fig(cam.aperture, 'm') })],
      xFormat: (x) => num(x),
    });
  }
}
