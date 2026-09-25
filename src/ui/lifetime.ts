/**
 * "Orbit lifetime" (roadmap P07): after the flight reaches orbit, carry the
 * orbit on for days to decades with the long-term perturbations switched on
 * one by one — J2, J3/J4, drag in an atmosphere that swells with the Sun,
 * the Sun and the Moon, sunlight pressure — and see how the perigee and the
 * apogee fall and when the satellite comes down. An analysis beside the
 * flight: the flight and its verdict are not touched.
 */
import { Modal } from './dialogs';
import { t, getLang } from '../i18n';
import { drawChart } from './charts';
import { runLifetimeJob } from '../physics/lifetime-job';
import type { ForceModel, Spacecraft } from '../physics/propagator/forces';
import type { PropagationResult } from '../physics/propagator/propagate';
import type { SolarActivity } from '../physics/propagator/density';
import type { V3 } from '../physics/propagator/ephemeris';

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};

/** Where the orbit starts: the state on screen, after insertion. */
export interface LifetimeStart { r: V3; v: V3; jd: number; spacecraft: Spacecraft; label: string }

const HORIZONS = [30, 365, 5 * 365, 25 * 365] as const;
const RAD = 180 / Math.PI;

/** Days, months or years, whichever reads best. */
export function formatDuration(seconds: number): string {
  const days = seconds / 86400;
  const n = (v: number, d = 0) => v.toLocaleString(getLang(), { maximumFractionDigits: d, minimumFractionDigits: d });
  if (days < 60) return t('life.days', { n: n(days, days < 10 ? 1 : 0) });
  if (days < 730) return t('life.months', { n: n(days / 30.44, 1) });
  return t('life.years', { n: n(days / 365.25, 1) });
}

export class LifetimeDialog extends Modal {
  private start: LifetimeStart | null = null;
  private forces: ForceModel = { j2: true, j3j4: true, drag: true, sun: true, moon: true, srp: true, activity: 'mean' };
  private method: 'mean' | 'cowell' = 'mean';
  private horizon: number = 25 * 365;
  private spacecraft: Spacecraft | null = null;
  private result: PropagationResult | null = null;
  private running: AbortController | null = null;
  private progress = 0;
  private message = '';

  constructor() {
    const dialog = document.createElement('dialog');
    dialog.className = 'dialog lifetime-dialog';
    (document.getElementById('app') ?? document.body).append(dialog);
    super(dialog);
    dialog.addEventListener('close', () => this.running?.abort());
  }

  /** Open on an orbit — or, with none (the flight is not in orbit yet), to say so. */
  openFor(start: LifetimeStart | null, opener: HTMLElement | null): void {
    this.start = start;
    this.spacecraft = start ? { ...start.spacecraft } : null;
    this.result = null;
    this.message = start ? '' : t('life.notInOrbit');
    this.open(opener);
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
      c.addEventListener('change', () => { this.forces[key] = c.checked; });
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
      s.addEventListener('change', () => set((typeof value === 'number' ? Number(s.value) : s.value) as T));
      s.setAttribute('aria-label', label);
      l.append(el('span', undefined, label), s);
      return l;
    };
    const number = (label: string, value: number, set: (v: number) => void) => {
      const l = el('label', 'field');
      const i = el('input');
      i.type = 'number';
      i.step = 'any';
      i.min = '0';
      i.value = String(value);
      i.addEventListener('change', () => { const v = Number(i.value); if (Number.isFinite(v) && v > 0) set(v); });
      i.setAttribute('aria-label', label);
      l.append(el('span', undefined, label), i);
      return l;
    };
    const settings = el('div', 'life-settings');
    settings.append(
      select<SolarActivity>(t('life.activity'), [['low', t('life.activity.low')], ['mean', t('life.activity.mean')], ['high', t('life.activity.high')]],
        this.forces.activity, (v) => { this.forces.activity = v; }),
      select<number>(t('life.horizon'), HORIZONS.map((d) => [d, formatDuration(d * 86400)] as [number, string]), this.horizon, (v) => { this.horizon = v; }),
      select<'mean' | 'cowell'>(t('life.method'), [['mean', t('life.method.mean')], ['cowell', t('life.method.cowell')]], this.method, (v) => { this.method = v; }),
    );
    const sc = this.spacecraft;
    if (sc) {
      settings.append(
        number(t('life.mass'), sc.mass, (v) => { sc.mass = v; }),
        number(t('life.area'), sc.area, (v) => { sc.area = v; }),
        number(t('life.cd'), sc.cd, (v) => { sc.cd = v; }),
        number(t('life.cr'), sc.cr, (v) => { sc.cr = v; }),
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
    if (this.result) b.append(...this.resultView(this.result));
  }

  private async run(): Promise<void> {
    if (!this.start || !this.spacecraft) return;
    const ctl = new AbortController();
    this.running = ctl;
    this.progress = 0;
    this.result = null;
    this.applyLanguage();
    try {
      const result = await runLifetimeJob({
        r0: this.start.r, v0: this.start.v, jd0: this.start.jd,
        options: {
          method: this.method, duration: this.horizon * 86400, forces: { ...this.forces }, spacecraft: { ...this.spacecraft },
          samples: 600, tolerance: 1e-9,
        },
      }, ctl.signal, (f) => {
        this.progress = f;
        const s = this.body.querySelector('.life-status');
        if (s) s.textContent = t('life.running', { p: Math.round(f * 100) });
      });
      this.result = result;
      this.message = '';
    } catch (e) {
      this.message = e instanceof DOMException && e.name === 'AbortError' ? t('life.cancelled') : String(e);
    } finally {
      this.running = null;
      if (this.el.open) this.applyLanguage();
    }
  }

  private resultView(res: PropagationResult): HTMLElement[] {
    const out: HTMLElement[] = [];
    const last = res.samples[res.samples.length - 1];
    const verdict = res.lifetime !== null
      ? t('life.reentry', { time: formatDuration(res.lifetime) })
      : t('life.stays', { time: formatDuration(last.t), pe: (last.perigeeAlt / 1000).toFixed(0), ap: (last.apogeeAlt / 1000).toFixed(0) });
    out.push(el('p', 'life-verdict', verdict));
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
