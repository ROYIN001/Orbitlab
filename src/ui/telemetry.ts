/**
 * Engineering telemetry panel: eight charts, the Δv budget, the flight plan,
 * spent stages, the event log and the CSV export.
 *
 * Chart window (audit B11). The old panel cut the data at
 * `max(1500, t(parkingOrbit)) + 120` and drew every chart from the cut, so the
 * circularisation burn — where Δv-remaining drops and the periapsis rises to
 * meet the apoapsis, the pedagogically central moment — was off-chart on 149 of
 * 154 vehicle/orbit combinations, and the apsides chart ended mid-coast in an
 * ellipse that looked like a failure. The window is now the whole recorded
 * flight by default, with an **Ascent** zoom for the published-timeline view,
 * and it follows the timeline cursor: seeking past the end of the zoom extends
 * it rather than leaving the playhead off-screen. The burn events are marked in
 * both ranges.
 */
import type { Simulation } from '../physics/simulation';
import { drawChart, type ChartMarker } from './charts';
import { t } from '../i18n';
import { fmtTime } from './hud';
import { eventLabel } from './phase';
import { localizeEventParams, stageNameByLabel } from './names';
import { OMEGA_EARTH, R_EARTH, DEG } from '../physics/constants';

type Range = 'mission' | 'ascent';

/** Events worth a dashed line on every chart. */
const ASCENT_MARKERS = ['evt.maxQ', 'evt.meco', 'evt.stageSep', 'evt.seco', 'evt.fairingSep'];
const ORBIT_MARKERS = ['evt.parkingOrbit', 'evt.burnStart', 'evt.burnComplete', 'evt.targetOrbit'];

const CHART_IDS = ['altitude', 'velocity', 'q', 'g', 'apsides', 'dv', 'pitch', 'mass'] as const;
/** Dictionary key for each chart's title, so `reset()` can redraw them empty. */
const CHART_TITLES: Record<(typeof CHART_IDS)[number], string> = {
  altitude: 'tel.altitude', velocity: 'tel.velocity', q: 'tel.q', g: 'tel.g',
  apsides: 'tel.apsides', dv: 'tel.dv', pitch: 'tel.pitch', mass: 'tel.mass',
};
/** How close to the bottom the log has to be before an update re-pins it there, px. */
const LOG_STICK = 24;

export class TelemetryPanel {
  private root: HTMLElement;
  private charts: Record<string, HTMLCanvasElement> = {};
  private losses!: HTMLElement;
  private plan!: HTMLElement;
  private debris!: HTMLElement;
  private events!: HTMLElement;
  private note!: HTMLElement;
  private rangeBtns: HTMLButtonElement[] = [];
  private shownEvents = 0;
  private sim: Simulation | null = null;
  private range: Range = 'mission';
  /** mission time the rest of the app is showing */
  private cursor = 0;

  constructor(root: HTMLElement) {
    this.root = root;
    this.build();
  }

  build(): void {
    const r = this.root;
    r.setAttribute('aria-label', t('a11y.telemetryPanel'));
    r.replaceChildren();
    const head = el('div', 'telemetry-heading');
    const headLeft = el('div');
    headLeft.append(el('span', 'eyebrow', t('tel.eyebrow')), el('h2', undefined, t('tel.title')));
    head.append(headLeft);
    const toggle = el('div', 'range-toggle');
    toggle.setAttribute('role', 'group');
    toggle.setAttribute('aria-label', t('tel.range'));
    this.rangeBtns = [];
    for (const mode of ['mission', 'ascent'] as Range[]) {
      const b = el('button', this.range === mode ? 'active' : undefined, t(`tel.range.${mode}`)) as HTMLButtonElement;
      b.type = 'button';
      b.dataset.range = mode;
      b.setAttribute('aria-pressed', String(this.range === mode));
      b.addEventListener('click', () => this.setRange(mode));
      toggle.append(b);
      this.rangeBtns.push(b);
    }
    head.append(toggle);
    r.append(head);
    this.note = el('p', 'chart-note hidden');
    r.append(this.note);
    for (const id of CHART_IDS) {
      const c = document.createElement('canvas');
      c.className = 'chart';
      r.append(c);
      this.charts[id] = c;
    }
    const mk = (titleKey: string, cls: string): HTMLElement => {
      r.append(el('h3', 'section', t(titleKey)));
      const box = el('div', cls);
      r.append(box);
      return box;
    };
    this.losses = mk('tel.losses', 'list info');
    this.plan = mk('tel.plan', 'list info plan');
    this.debris = mk('tel.debris', 'list info');
    this.events = mk('tel.events', 'events');
    const btn = el('button', 'btn export-btn', t('tel.export')) as HTMLButtonElement;
    btn.type = 'button';
    btn.addEventListener('click', () => this.exportCsv());
    r.append(btn);
    this.shownEvents = 0;
    if (this.sim) this.update(this.sim, this.cursor);
  }

  private setRange(mode: Range): void {
    this.range = mode;
    for (const b of this.rangeBtns) {
      const on = b.dataset.range === mode;
      b.classList.toggle('active', on);
      b.setAttribute('aria-pressed', String(on));
    }
    if (this.sim) this.update(this.sim, this.cursor);
  }

  /**
   * Blank the panel for a new mission.
   *
   * Everything goes, not only the event log: between `reset()` and the first
   * 0.5 s update tick the panel used to show the previous mission's Δv budget,
   * flight plan, spent stages and rasterised charts under the new mission's
   * heading, which reads as telemetry for a flight that has not happened.
   */
  reset(): void {
    this.shownEvents = 0;
    this.events.replaceChildren();
    this.losses.replaceChildren();
    this.plan.replaceChildren();
    this.debris.replaceChildren();
    this.note.textContent = '';
    this.note.classList.add('hidden');
    this.cursor = 0;
    for (const id of CHART_IDS) {
      drawChart(this.charts[id], [], { title: t(CHART_TITLES[id]), xMin: -10, xMax: 60, timeAxis: true, xLabel: t('tel.xAxis') });
    }
    this.sim = null;
  }

  update(sim: Simulation, cursor?: number): void {
    this.sim = sim;
    if (cursor !== undefined) this.cursor = cursor;
    const tel = sim.telemetry;
    // Drawn even with no samples yet: eight empty framed charts with their
    // titles read as "nothing has happened", eight blank canvases read as broken.
    const ascentEnd = sim.events.find((e) => e.key === 'evt.parkingOrbit')?.t;
    const last = tel.length ? tel[tel.length - 1].t : 0;
    const zoomEnd = Math.max(120, (ascentEnd ?? Math.min(last, 900)) + 120);
    // 'Full mission' spans the whole recording. 'Ascent' keeps the ascent's
    // *duration* and slides it to contain the timeline cursor, so zooming in
    // does not lose the playhead the moment the flight coasts past SECO.
    let xMin = -10;
    let xMax = Math.max(last, this.cursor, 60);
    if (this.range === 'ascent') {
      const span = zoomEnd + 10;
      xMax = zoomEnd;
      if (this.cursor > xMax) {
        xMax = Math.min(Math.max(last, this.cursor), this.cursor + span * 0.15);
        xMin = xMax - span;
      }
    }
    const truncated = this.range === 'ascent' && (last > xMax + 1 || xMin > -10);
    this.note.textContent = truncated ? t('tel.truncated', { t: fmtTime(last) }) : '';
    this.note.classList.toggle('hidden', !truncated);

    const keys = this.range === 'mission' ? [...ASCENT_MARKERS, ...ORBIT_MARKERS] : ASCENT_MARKERS;
    const markers: ChartMarker[] = [];
    for (const e of sim.events) {
      if (!keys.includes(e.key)) continue;
      markers.push({ x: e.t, color: ORBIT_MARKERS.includes(e.key) ? '#5c7d76' : '#3a4a5c', label: eventLabel(e.key, e.params) });
    }
    // Only the samples inside the window are handed to the renderer: a GTO
    // mission records tens of thousands of them and the ascent zoom needs a
    // few hundred.
    const cut = tel.filter((s) => s.t >= xMin - 1 && s.t <= xMax + 1);
    const cx = cut.map((s) => s.t);
    const common = { markers, xMin, xMax, cursor: this.cursor, timeAxis: true, xLabel: t('tel.xAxis') };
    drawChart(this.charts.altitude, [{ x: cx, y: cut.map((s) => s.alt / 1000), color: '#6ec8ff' }], { title: t('tel.altitude'), ...common });
    drawChart(this.charts.velocity, [
      { x: cx, y: cut.map((s) => s.vInertial), color: '#8be5cd', label: 'v' },
      { x: cx, y: cut.map((s) => s.vAir), color: '#96a3b4', label: 'v_air' },
    ], { title: t('tel.velocity'), ...common });
    drawChart(this.charts.q, [{ x: cx, y: cut.map((s) => s.q / 1000), color: '#efa47e' }], { title: t('tel.q'), ...common, yMin: 0 });
    drawChart(this.charts.g, [{ x: cx, y: cut.map((s) => s.gLoad), color: '#7ddba0' }], { title: t('tel.g'), ...common, yMin: 0 });
    drawChart(this.charts.apsides, [
      { x: cx, y: cut.map((s) => (s.ap > 0 && s.ap < 5e7 ? s.ap / 1000 : NaN)), color: '#6ec8ff', label: 'ap' },
      { x: cx, y: cut.map((s) => (s.pe > -2000e3 ? s.pe / 1000 : NaN)), color: '#8be5cd', label: 'pe' },
    ], { title: t('tel.apsides'), ...common, yMin: 0 });
    drawChart(this.charts.dv, [{ x: cx, y: cut.map((s) => s.dvRemaining), color: '#c3a6ff' }], { title: t('tel.dv'), ...common, yMin: 0 });
    drawChart(this.charts.pitch, [{ x: cx, y: cut.map((s) => s.pitch), color: '#ffd28a' }], { title: t('tel.pitch'), ...common });
    drawChart(this.charts.mass, [{ x: cx, y: cut.map((s) => s.mass / 1000), color: '#9be7ff' }], { title: t('tel.mass'), ...common, yMin: 0 });

    // Δv budget
    const L = sim.state.losses;
    const site = sim.site;
    const vRot = OMEGA_EARTH * R_EARTH * Math.cos(site.latitude * DEG);
    this.losses.replaceChildren();
    const lossRow = (k: string, v: string): void => { this.losses.append(kvRow(k, v)); };
    lossRow(t('tel.loss.thrust'), `${L.dvThrust.toFixed(0)} m/s`);
    lossRow(t('tel.loss.gravity'), `${L.gravity.toFixed(0)} m/s`);
    lossRow(t('tel.loss.drag'), `${L.drag.toFixed(0)} m/s`);
    lossRow(t('tel.loss.steering'), `${L.steering.toFixed(0)} m/s`);
    lossRow(t('tel.loss.rotation'), `${(vRot * Math.sin(sim.plan.azimuthInertial)).toFixed(0)} m/s`);
    lossRow(t('tel.maxQ'), `${(sim.state.maxQ.value / 1000).toFixed(1)} kPa · ${(sim.state.maxQ.alt / 1000).toFixed(1)} km · ${fmtTime(sim.state.maxQ.t)}`);

    // flight plan
    this.plan.replaceChildren();
    this.plan.append(kvRow(t('setup.info.insertion'), `${(sim.plan.insertionAltitude / 1000).toFixed(0)} × ${(sim.plan.insertionApoapsis / 1000).toFixed(0)} km`));
    for (const b of sim.plan.burns) {
      const row = kvRow(t(`tel.burn.${b.kind}`), `${b.dvEstimate.toFixed(0)} m/s · ${b.done ? t('tel.burn.done') : t('tel.burn.pending')}`);
      row.className = b.done ? 'done' : 'pending';
      this.plan.append(row);
    }

    // spent stages
    this.debris.replaceChildren();
    let any = false;
    for (const d of sim.debris) {
      if (d.visual.kind === 'fairing') continue;
      any = true;
      let st: string;
      if (!d.alive) st = t(`tel.debris.${d.outcome ?? 'impact'}`);
      else if (d.recovery?.burning) st = d.recovery.phase === 'entry' ? t('tel.debris.entryBurn') : t('tel.debris.landingBurn');
      else if (d.outcome === 'orbit') st = t('tel.debris.orbit');
      else st = t('tel.debris.falling');
      const alt = Math.max(0, (Math.hypot(d.r.x, d.r.y, d.r.z) - R_EARTH) / 1000);
      let v = st;
      if (d.alive) v += ` · ${alt.toFixed(0)} km`;
      if (d.impact) v += ` · ${d.impact.lat.toFixed(1)}°, ${d.impact.lon.toFixed(1)}°`;
      this.debris.append(kvRow(stageNameByLabel(sim.vehicleSpec, d.name), v));
    }
    if (!any) this.debris.append(kvRow(t('misc.none'), ''));

    // Event log. The box is only re-pinned to the bottom when it was already
    // there: forcing the scroll on every 0.5 s tick made it impossible to read
    // back through the log while a flight was running.
    const log = this.events;
    const atBottom = log.scrollHeight - log.scrollTop - log.clientHeight <= LOG_STICK;
    while (this.shownEvents < sim.events.length) {
      const e = sim.events[this.shownEvents++];
      const div = el('div', e.severity);
      div.append(el('span', 't', fmtTime(e.t)), document.createTextNode(t(e.key, localizeEventParams(sim.vehicleSpec, e.params))));
      log.append(div);
    }
    if (atBottom) log.scrollTop = log.scrollHeight;
  }

  exportCsv(): void {
    if (!this.sim) return;
    const cols = ['t_s', 'alt_m', 'v_inertial_ms', 'v_air_ms', 'q_pa', 'mach', 'g_load', 'mass_kg', 'thrust_n', 'throttle', 'pitch_deg', 'apoapsis_m', 'periapsis_m', 'inclination_deg', 'dv_remaining_ms', 'downrange_m', 'lat_deg', 'lon_deg', 'stage', 'phase'];
    const lines = [cols.join(',')];
    for (const s of this.sim.telemetry) {
      lines.push([s.t, s.alt, s.vInertial, s.vAir, s.q, s.mach, s.gLoad, s.mass, s.thrust, s.throttle, s.pitch, s.ap, s.pe, s.inc, s.dvRemaining, s.downrange, s.lat, s.lon, s.stage, s.phase].map((v) => (typeof v === 'number' ? (Number.isInteger(v) ? String(v) : v.toPrecision(7)) : String(v))).join(','));
    }
    lines.push('');
    lines.push('# events');
    lines.push('t_s,event,details');
    for (const e of this.sim.events) lines.push(`${e.t.toFixed(1)},${e.key},"${JSON.stringify(e.params ?? {}).replace(/"/g, '""')}"`);
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `orbitlab_${this.sim.vehicleSpec.id}_${this.sim.cfg.orbit.id}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

/** A key/value line. `textContent` only: a dictionary string is never markup. */
function kvRow(k: string, v: string): HTMLElement {
  const row = el('div');
  row.append(el('span', 'k', k), el('span', 'v', v));
  return row;
}
