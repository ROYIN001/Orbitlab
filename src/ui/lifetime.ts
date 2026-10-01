/**
 * "Orbit lifetime" (roadmap P07): after the flight reaches orbit, carry the
 * orbit on for days to decades with the long-term perturbations switched on
 * one by one — J2, J3/J4, drag in an atmosphere that swells with the Sun,
 * the Sun and the Moon, sunlight pressure — and see how the perigee and the
 * apogee fall and when the satellite comes down. An analysis beside the
 * flight: the flight and its verdict are not touched.
 *
 * R05: the Sun's activity is measured by default — GFZ's monthly history,
 * then the space-weather dataset (offline its snapshot, online NOAA SWPC),
 * then NOAA's forecast — or held at one of ECSS's levels; the result says
 * which, and how far the measurements and the forecast reach.
 */
import { Modal } from './dialogs';
import { t, getLang } from '../i18n';
import { drawChart } from './charts';
import { runLifetimeJob } from '../physics/lifetime-job';
import type { ForceModel, Spacecraft } from '../physics/propagator/forces';
import type { PropagationResult } from '../physics/propagator/propagate';
import { ECSS_LEVELS, loadSolarDaily, measuredActivity, type Activity, type EcssLevel, type ForecastSide } from '../physics/propagator/activity';
import { lifetimeSpacecraft, type OrbitHandoff } from '../orbit/handoff';
import type { Dataset, DataProvider } from '../provider/data-provider';
import type { SpaceWeather } from '../provider/space-weather';
import { positiveNumber, ResultSlot, type Freshness } from './result-slot';

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};


const HORIZONS = [30, 365, 5 * 365, 25 * 365] as const;

/** R05: measured then forecast (NOAA's expected, high or low side), or one of ECSS's fixed levels. */
export type ActivityChoice = 'measured' | 'measuredHigh' | 'measuredLow' | EcssLevel;
const ACTIVITY_CHOICES: readonly ActivityChoice[] = ['measured', 'measuredHigh', 'measuredLow', 'low', 'moderate', 'high'];
const ACTIVITY_KEY: Record<ActivityChoice, string> = {
  measured: 'life.activity.measured', measuredHigh: 'life.activity.measuredHigh', measuredLow: 'life.activity.measuredLow',
  low: 'life.activity.low', moderate: 'life.activity.moderate', high: 'life.activity.high',
};
const SIDE: Record<'measured' | 'measuredHigh' | 'measuredLow', ForecastSide> = { measured: 'expected', measuredHigh: 'high', measuredLow: 'low' };

export interface LifetimeDeps {
  /** the data mode's provider, for the space-weather dataset (R05) */
  data(): DataProvider;
}
const RAD = 180 / Math.PI;

type ForceKey = keyof Omit<ForceModel, 'activity'>;
const FORCE_KEYS: readonly ForceKey[] = ['j2', 'j3j4', 'drag', 'sun', 'moon', 'srp'];
const FORCE_LABEL: Record<ForceKey, string> = { j2: 'life.f.j2', j3j4: 'life.f.j3j4', drag: 'life.f.drag', sun: 'life.f.sun', moon: 'life.f.moon', srp: 'life.f.srp' };
type CraftKey = keyof Spacecraft;

/**
 * What a lifetime run is made from (audit 2026-09-27 A5): the orbit it starts
 * on, the forces, the Sun's activity, the method, how long, and the
 * spacecraft. Kept with the result, which is marked stale when the form no
 * longer says the same.
 */
export type LifetimeInputs = {
  /** the start's Julian date: another orbit handed on is another start */
  start: number;
  forces: Readonly<Record<ForceKey, boolean>>;
  activity: ActivityChoice;
  method: 'mean' | 'cowell';
  horizon: number;
  mass: number; area: number; cd: number; cr: number;
};

/** A lifetime run's inputs in words, for the line under its result. */
export function describeLifetime(i: Readonly<LifetimeInputs>): string[] {
  const n = (v: number, d = 2) => v.toLocaleString(getLang(), { maximumFractionDigits: d });
  const on = FORCE_KEYS.filter((k) => i.forces[k]).map((k) => t(FORCE_LABEL[k]));
  return [
    `${n(i.mass)} ${t('u.kg')}`, t('result.area', { v: n(i.area) }), `C_D ${n(i.cd)}`, `C_R ${n(i.cr)}`,
    `${t('life.forces')}: ${on.length ? on.join(', ') : '—'}`,
    t(i.method === 'mean' ? 'life.method.mean' : 'life.method.cowell'), formatDuration(i.horizon * 86400), t(ACTIVITY_KEY[i.activity]),
  ];
}

/** A run's answer, with the Sun's activity it used in words and, if the online source failed, why (R05, A5). */
interface LifetimeOutput { result: PropagationResult; activityNote: string; fallback?: string }

/** Days, months or years, whichever reads best. */
export function formatDuration(seconds: number): string {
  const days = seconds / 86400;
  const n = (v: number, d = 0) => v.toLocaleString(getLang(), { maximumFractionDigits: d, minimumFractionDigits: d });
  if (days < 60) return t('life.days', { n: n(days, days < 10 ? 1 : 0) });
  if (days < 730) return t('life.months', { n: n(days / 30.44, 1) });
  return t('life.years', { n: n(days / 365.25, 1) });
}

export class LifetimeDialog extends Modal {
  /** where the orbit starts: the state on screen, after insertion, handed on as the Orbit section gets it (S03) */
  private start: OrbitHandoff | null = null;
  private forces: Omit<ForceModel, 'activity'> = { j2: true, j3j4: true, drag: true, sun: true, moon: true, srp: true };
  private activity: ActivityChoice = 'measured';
  private method: 'mean' | 'cowell' = 'mean';
  private horizon: number = 25 * 365;
  private spacecraft: Spacecraft | null = null;
  /** A5: the spacecraft's boxes that do not hold a number above zero: the run waits until they do */
  private readonly invalid = new Set<CraftKey>();
  /** A5: the last run, with the inputs it was made from */
  private readonly slot = new ResultSlot<LifetimeInputs, LifetimeOutput>(describeLifetime);
  private running: AbortController | null = null;
  private progress = 0;
  private message = '';

  private readonly deps: LifetimeDeps | null;

  constructor(deps?: LifetimeDeps) {
    const dialog = document.createElement('dialog');
    dialog.className = 'dialog lifetime-dialog';
    (document.getElementById('app') ?? document.body).append(dialog);
    super(dialog);
    this.deps = deps ?? null;
    dialog.addEventListener('close', () => this.running?.abort());
  }

  /** Open on an orbit — or, with none (the flight is not in orbit yet), to say so. */
  openFor(start: OrbitHandoff | null, opener: HTMLElement | null): void {
    this.start = start;
    // the analysis's own copy of what it reads, which the form edits
    this.spacecraft = start ? lifetimeSpacecraft(start) : null;
    this.invalid.clear();
    this.slot.clear();
    this.message = start ? '' : t('life.notInOrbit');
    this.open(opener);
  }

  /** What a run now would be made from; null with no orbit. */
  inputs(): LifetimeInputs | null {
    const sc = this.spacecraft;
    if (!this.start || !sc) return null;
    return {
      start: this.start.jd, forces: { ...this.forces }, activity: this.activity, method: this.method, horizon: this.horizon,
      mass: sc.mass, area: sc.area, cd: sc.cd, cr: sc.cr,
    };
  }

  applyLanguage(): void {
    super.applyLanguage();
    this.el.setAttribute('aria-label', t('life.title'));
    const b = this.body;
    b.replaceChildren();
    b.append(el('span', 'eyebrow', t('life.eyebrow')), el('h2', undefined, t('life.title')), el('p', 'lead', t('life.intro')));
    if (this.start) b.append(el('p', 'life-start', this.start.label));

    const form = el('div', 'life-form');
    const check = (key: keyof Omit<ForceModel, 'activity'>, label: string) => {
      const l = el('label', 'life-check');
      const c = el('input');
      c.type = 'checkbox';
      c.checked = this.forces[key];
      c.addEventListener('change', () => { this.forces[key] = c.checked; this.markFreshness(); });
      l.append(c, el('span', undefined, label));
      return l;
    };
    const forces = el('fieldset', 'life-forces');
    forces.append(el('legend', undefined, t('life.forces')),
      check('j2', t('life.f.j2')), check('j3j4', t('life.f.j3j4')), check('drag', t('life.f.drag')),
      check('sun', t('life.f.sun')), check('moon', t('life.f.moon')), check('srp', t('life.f.srp')));
    const select = <T extends string | number>(label: string, options: [T, string][], value: T, set: (v: T) => void) => {
      const l = el('label', 'field');
      const s = el('select');
      for (const [v, text] of options) { const o = el('option', undefined, text); o.value = String(v); o.selected = v === value; s.append(o); }
      s.addEventListener('change', () => { set((typeof value === 'number' ? Number(s.value) : s.value) as T); this.markFreshness(); });
      s.setAttribute('aria-label', label);
      l.append(el('span', undefined, label), s);
      return l;
    };
    // A5: a box that does not hold a number above zero says so beside it, and Run waits for it (before, the last good value was used unseen)
    const number = (key: CraftKey, label: string, sc: Spacecraft) => {
      const l = el('label', 'field');
      const i = el('input');
      i.type = 'number';
      i.step = 'any';
      i.min = '0';
      // shown to 12 significant figures, so a figure worked out (a designed satellite's drag area, D06) does not show
      // its floating-point tail ("0.061075000000000004"); the run flies `sc[key]` itself until the box is edited
      i.value = String(Number(sc[key].toPrecision(12)));
      i.setAttribute('aria-label', label);
      const why = el('span', 'field-note warn life-invalid', t('result.invalid'));
      why.hidden = true;
      i.addEventListener('input', () => {
        const v = positiveNumber(i.value);
        if (v === null) this.invalid.add(key);
        else { this.invalid.delete(key); sc[key] = v; }
        why.hidden = v !== null;
        i.setAttribute('aria-invalid', String(v === null));
        this.markFreshness();
      });
      l.append(el('span', undefined, label), i, why);
      return l;
    };
    const settings = el('div', 'life-settings');
    // W: the two menus whose choices are phrases ("Measured, then NOAA's forecast", "Mean elements (fast; J2 and drag)")
    // take a row each, first; at 1440 px half a row cut them. The horizon, a short figure, sits beside the mass.
    const wide = (l: HTMLLabelElement): HTMLLabelElement => { l.classList.add('life-wide'); return l; };
    settings.append(
      wide(select<ActivityChoice>(t('life.activity'), ACTIVITY_CHOICES.map((c) => [c, t(ACTIVITY_KEY[c])] as [ActivityChoice, string]),
        this.activity, (v) => { this.activity = v; })),
      wide(select<'mean' | 'cowell'>(t('life.method'), [['mean', t('life.method.mean')], ['cowell', t('life.method.cowell')]], this.method, (v) => { this.method = v; })),
      select<number>(t('life.horizon'), HORIZONS.map((d) => [d, formatDuration(d * 86400)] as [number, string]), this.horizon, (v) => { this.horizon = v; }),
    );
    const sc = this.spacecraft;
    if (sc) {
      this.invalid.clear();
      settings.append(
        number('mass', t('life.mass'), sc),
        number('area', t('life.area'), sc),
        number('cd', t('life.cd'), sc),
        number('cr', t('life.cr'), sc),
      );
    }
    form.append(forces, settings);
    b.append(form, el('p', 'field-note', t('life.methodNote')));

    const run = el('button', 'btn life-run', this.running ? t('life.cancel') : t('life.run'));
    run.type = 'button';
    run.id = 'btn-lifetime-run';
    run.disabled = !this.start;
    run.addEventListener('click', () => (this.running ? this.running.abort() : void this.run()));
    b.append(run);
    const status = el('p', 'life-status', this.running ? t('life.running', { p: Math.round(this.progress * 100) }) : this.message);
    status.setAttribute('role', 'status');
    b.append(status);
    // A5: the result with the inputs it was made from, marked when the form has moved on
    const out = this.slot.state === 'done' ? this.slot.result : null;
    if (this.slot.inputs && (out || this.running)) {
      const from = el('div', 'life-provenance');
      const result = el('div', 'life-result');
      if (out) result.append(...this.resultView(out));
      b.append(from, result);
    }
    this.markFreshness();
  }

  /**
   * A5: as the form is edited, without drawing it again: Run waits for every
   * box to hold a number, and the result on screen says whether it is for the
   * values set now — or what it was made from, dimmed, with a warning.
   */
  private markFreshness(): void {
    const b = this.body;
    const run = b.querySelector<HTMLButtonElement>('#btn-lifetime-run');
    if (run && !this.running) run.disabled = !this.start || this.invalid.size > 0;
    const status = b.querySelector('.life-status');
    if (status && !this.running) status.textContent = this.invalid.size ? t('result.fixFirst') : this.message;
    const from = b.querySelector('.life-provenance'), result = b.querySelector<HTMLElement>('.life-result');
    const current = this.inputs();
    if (!from || !result || !current) return;
    const fresh: Freshness = this.slot.status(current);
    const parts: HTMLElement[] = [];
    if (fresh === 'stale') {
      const warn = el('p', 'field-note warn life-stale', t(this.running ? 'result.staleRunning' : 'result.stale'));
      warn.setAttribute('role', 'status');
      parts.push(warn);
    }
    parts.push(el('p', 'field-note life-from', t(this.running ? 'result.runningFrom' : 'result.from', { inputs: this.slot.describe() })));
    from.replaceChildren(...parts);
    result.dataset.fresh = fresh;
    result.style.opacity = fresh === 'stale' ? '0.55' : '';
  }

  private async run(): Promise<void> {
    const inputs = this.inputs();
    if (!this.start || !inputs || this.invalid.size) return;
    const start = this.start;
    const ctl = new AbortController();
    this.running = ctl;
    this.progress = 0;
    // A5: the run is made from this frozen copy, whatever the form says by the time it ends
    const gen = this.slot.start(inputs);
    const ran = this.slot.inputs!;
    this.message = '';
    this.applyLanguage();
    try {
      const { series, note, fallback } = await this.activityFor(ran.activity, ctl.signal);
      const result = await runLifetimeJob({
        r0: start.r, v0: start.v, jd0: start.jd,
        options: {
          method: ran.method, duration: ran.horizon * 86400, forces: { ...ran.forces, activity: series },
          spacecraft: { mass: ran.mass, area: ran.area, cd: ran.cd, cr: ran.cr },
          samples: 600, tolerance: 1e-9,
        },
      }, ctl.signal, (f) => {
        this.progress = f;
        const s = this.body.querySelector('.life-status');
        if (s) s.textContent = t('life.running', { p: Math.round(f * 100) });
      });
      this.slot.accept(gen, { result, activityNote: note, ...(fallback ? { fallback } : {}) });
    } catch (e) {
      const cancelled = e instanceof DOMException && e.name === 'AbortError';
      this.message = cancelled ? t('life.cancelled') : String(e);
      if (cancelled) this.slot.stop(gen); else this.slot.fail(gen, String(e));
    } finally {
      this.running = null;
      if (this.el.open) this.applyLanguage();
    }
  }

  /** R05: the indices for the choice, what they are in words, and — online — why the snapshot answered instead (kept with the result, A5). */
  private async activityFor(choice: ActivityChoice, signal: AbortSignal): Promise<{ series: Activity; note: string; fallback?: string }> {
    if (choice === 'low' || choice === 'moderate' || choice === 'high') {
      return { series: ECSS_LEVELS[choice], note: t('life.sw.fixed', { level: t(ACTIVITY_KEY[choice]) }) };
    }
    let set: Dataset<SpaceWeather> | null = null;
    try {
      set = (await this.deps?.data().load('spaceWeather', signal)) ?? null;
    } catch (e) {
      if (signal.aborted) throw e;
    }
    const m = measuredActivity(await loadSolarDaily(), set?.data ?? null, SIDE[choice]);
    const note = m.forecastTo
      ? t('life.sw.measured', { measured: m.measuredTo, forecast: m.forecastTo, repeat: m.repeatFrom, date: set ? set.asOf.slice(0, 10) : '' })
      : t('life.sw.history', { measured: m.measuredTo, repeat: m.repeatFrom });
    return { series: m.series, note, ...(set?.fallback ? { fallback: set.fallback } : {}) };
  }

  private resultView(out0: LifetimeOutput): HTMLElement[] {
    const res = out0.result;
    const out: HTMLElement[] = [];
    const last = res.samples[res.samples.length - 1];
    const verdict = res.lifetime !== null
      ? t('life.reentry', { time: formatDuration(res.lifetime) })
      : t('life.stays', { time: formatDuration(last.t), pe: (last.perigeeAlt / 1000).toFixed(0), ap: (last.apogeeAlt / 1000).toFixed(0) });
    out.push(el('p', 'life-verdict', verdict));
    if (out0.activityNote) out.push(el('p', 'field-note life-activity', out0.activityNote));
    if (out0.fallback) out.push(el('p', 'field-note warn', t('data.fallback', { reason: out0.fallback })));
    const days = res.samples.map((s) => s.t / 86400);
    const alt = el('canvas', 'chart life-chart');
    const plane = el('canvas', 'chart life-chart');
    out.push(alt, plane);
    requestAnimationFrame(() => {
      drawChart(alt, [
        { x: days, y: res.samples.map((s) => s.apogeeAlt / 1000), color: '#6ec8ff', label: 'ap' },
        { x: days, y: res.samples.map((s) => s.perigeeAlt / 1000), color: '#8be5cd', label: 'pe' },
      ], { title: t('life.chart.alt'), xLabel: t('life.chart.days'), yMin: 0, seriesLabels: [t('tel.chart.apogee'), t('tel.chart.perigee')] });
      drawChart(plane, [
        { x: days, y: res.samples.map((s) => s.i * RAD), color: '#ffd28a', label: 'i' },
        { x: days, y: res.samples.map((s) => s.e * 1000), color: '#c3a6ff', label: 'e×1000' },
      ], { title: t('life.chart.shape'), xLabel: t('life.chart.days') });
    });
    return out;
  }
}
