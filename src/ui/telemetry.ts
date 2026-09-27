/**
 * Engineering telemetry panel: eight charts, the Δv budget, the flight plan,
 * spent stages, the event log and the CSV export.
 *
 * **Everything on the panel is the instant the rest of the app is showing.**
 * `update` takes the frame-backed `Simulation` view (`src/replay/simview.ts`),
 * not the live simulation, so the charts stop at the timeline cursor, the Δv
 * budget and the max-Q line are the frame's `losses`/`maxQ`, the spent-stage
 * list is the frame's debris, and the event log is truncated to the callouts
 * that had happened by then. Scrubbing back to T+02:00 shows the panel as it
 * stood at T+02:00 rather than the end of the flight over the top of a rewound
 * 3-D view. The one thing that legitimately wants the whole flight is the CSV
 * export, which is handed the live `Simulation` separately (`setExportSource`).
 *
 * Chart window (audit B11). The old panel cut the data at
 * `max(1500, t(parkingOrbit)) + 120` and drew every chart from the cut, so the
 * circularisation burn — where Δv-remaining drops and the periapsis rises to
 * meet the apoapsis, the pedagogically central moment — was off-chart on 149 of
 * 154 vehicle/orbit combinations, and the apsides chart ended mid-coast in an
 * ellipse that looked like a failure. The window is now the whole recorded
 * flight by default, with an **Ascent** zoom for the published-timeline view,
 * and it follows the timeline cursor: seeking past the end of the zoom extends
 * it rather than leaving the playhead off-screen.
 *
 * Cost. The panel updates twice a second and a six-hour recording holds tens of
 * thousands of telemetry samples, so nothing here is rebuilt from scratch:
 * every series is decimated into a reused array capped at `MAX_POINTS` (a chart
 * is ~300 px wide, so more points than that are invisible by construction), the
 * marker list and the `Series` objects are pooled, and the Δv/plan/debris rows
 * are elements created once and rewritten with `textContent`. A scrub through a
 * long recording therefore costs the same as a scrub through a short one.
 */
import type { Simulation, SimEvent } from '../physics/simulation';
import { drawChart, type ChartMarker, type Series } from './charts';
import { getLang, t } from '../i18n';
import { fmtTime } from './hud';
import { eventLabel } from './phase';
import { localizeEventParams, stageNameByLabel } from './names';
import { OMEGA_EARTH, R_EARTH, DEG } from '../physics/constants';
import { buildTelemetryCsv, telemetryCsvFilename } from './csv';
import type { TelemetrySample } from '../physics/sim/types';
import { symbolText } from './notation';
import { EquationsPanel } from './equations';
import type { EquationLevel } from './equations-model';
import type { VisualFrame } from '../physics/frame';
import { downloadBlob } from './download';
import { ASCENT_MARKERS, CHART_IDS, ORBIT_MARKERS, chartTitle, referenceSeries } from './telemetry-charts';
import { referenceWindow, type ReferenceFlight } from '../replay/reference';

type Range = 'mission' | 'ascent';

// --- P05: two more charts, only for a flight that modelled the flexible body
const FLEX_CHART_IDS = ['flex', 'load'] as const;
const FLEX_CHART_TITLES: Record<(typeof FLEX_CHART_IDS)[number], string> = { flex: 'tel.flex', load: 'tel.load' };

/** How close to the bottom the log has to be before an update re-pins it there, px. */
const LOG_STICK = 24;
/**
 * Most points handed to one chart. The canvases are 250-320 px wide, so two
 * samples per pixel is already more than the rasteriser can show; the cap is
 * what keeps a 30-minute recording as cheap to draw as a 3-minute one.
 */
const MAX_POINTS = 600;

/** A reused x/y pair for one chart series. */
interface Trace {
  x: number[];
  y: number[];
}

function trace(): Trace {
  return { x: [], y: [] };
}

export class TelemetryPanel {
  private root: HTMLElement;
  private charts: Record<string, HTMLCanvasElement> = {};
  private losses!: HTMLElement;
  private plan!: HTMLElement;
  private debris!: HTMLElement;
  private events!: HTMLElement;
  /**
   * The line inside the event log that says the log is empty.
   *
   * Before a mission is flown the log has no children, and `.events` has a
   * 132 px minimum height — so the EVENT LOG heading was followed by a blank
   * rectangle, which is how the user reported it ("the event log shows nothing
   * at all"). An empty box that says why it is empty is a state; one that says
   * nothing is indistinguishable from a broken panel.
   */
  private eventsEmpty!: HTMLElement;
  private note!: HTMLElement;
  private rangeBtns: HTMLButtonElement[] = [];
  private shownEvents = 0;
  private shownEventItems: SimEvent[] = [];
  /** the frame-backed view the panel draws */
  private view: Simulation | null = null;
  /** the live simulation, for the CSV export only */
  private live: Simulation | null = null;
  private range: Range = 'mission';
  /** mission time the rest of the app is showing */
  private cursor = 0;
  // ── reused buffers, so a 2 Hz update over a long recording allocates nothing
  private traces: Trace[] = [trace(), trace(), trace(), trace(), trace(), trace(), trace(), trace(), trace()];
  /** one- and two-series argument arrays, reused for every chart */
  private one: Series[] = [{ x: [], y: [], color: '' }];
  private two: Series[] = [{ x: [], y: [], color: '' }, { x: [], y: [], color: '' }];
  /** marker pool (never shrinks) and the exact-length view handed to the chart */
  private markerPool: ChartMarker[] = [];
  private markers: ChartMarker[] = [];
  private rowPools: Map<HTMLElement, { rows: HTMLElement[]; used: number }> = new Map();
  /** P05: bending, slosh and shell-stress traces, and their x */
  private flexTraces: Trace[] = [trace(), trace(), trace()];
  /**
   * Where the instrument card goes when it is docked (`src/ui/hud.ts`).
   *
   * Created once and re-appended by `build`, never re-created: `build` runs
   * again on every language change and starts with `replaceChildren`, so a slot
   * built inside it would throw the docked card out of the DOM the first time
   * the user switched to Russian. Appending the same node moves it and its
   * children back into place instead, which is also why the card survives a
   * rebuild without `Hud` having to be told one happened.
   */
  readonly dockHost: HTMLElement = el('div', 'telemetry-dock');
  /** G07: where the rendezvous's relative-motion plot goes (built once, like `dockHost`) */
  readonly rendezvousHost: HTMLElement = el('div', 'telemetry-rv');
  /** U02: where the app puts the comparison (src/ui/compare.ts); kept across rebuilds like the dock. */
  readonly compareHost: HTMLElement = el('div', 'telemetry-compare');
  /** U02: the reference flight every chart also draws, dashed. */
  private reference: ReferenceFlight | null = null;
  /** E02: the live equations, a second view of this panel; the frame on screen, and the mode's set. */
  private equations = new EquationsPanel();
  private viewMode: 'charts' | 'equations' = 'charts';
  private viewBtns: HTMLButtonElement[] = [];
  private frame: VisualFrame | null = null;
  private equationLevel: EquationLevel = 'explore';

  constructor(root: HTMLElement, onReport: (() => void) | null = null, onLifetime: (() => void) | null = null,
    onOrbit: (() => void) | null = null) {
    this.root = root;
    this.onReport = onReport;
    this.onLifetime = onLifetime;
    this.onOrbit = onOrbit;
    this.build();
  }

  build(): void {
    const r = this.root;
    r.setAttribute('aria-label', t('a11y.telemetryPanel'));
    r.replaceChildren();
    this.rowPools.clear();
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
    // E02: charts or the live equations.
    const views = el('div', 'tel-view-toggle');
    views.setAttribute('role', 'group');
    views.setAttribute('aria-label', t('tel.view'));
    this.viewBtns = [];
    for (const [mode, key] of [['charts', 'tel.view.charts'], ['equations', 'tel.view.equations']] as const) {
      const b = el('button', undefined, t(key)) as HTMLButtonElement;
      b.type = 'button';
      b.dataset.view = mode;
      b.setAttribute('aria-pressed', String(this.viewMode === mode));
      b.addEventListener('click', () => this.setView(mode));
      views.append(b);
      this.viewBtns.push(b);
    }
    r.append(views);
    r.classList.toggle('view-equations', this.viewMode === 'equations');
    // First block under the heading: the docked instrument card, when the user
    // has put it there. Empty (and collapsed by `:empty` in style.css) when the
    // card is floating over the picture.
    r.append(this.dockHost);
    r.append(this.rendezvousHost);
    r.append(this.equations.root);
    this.note = el('p', 'chart-note hidden');
    r.append(this.note);
    for (const id of CHART_IDS) {
      const c = document.createElement('canvas');
      c.className = 'chart';
      r.append(c);
      this.charts[id] = c;
      c.setAttribute('role', 'img');
      c.setAttribute('aria-label', `${chartTitle(id)} ${t('tel.chart.noData')}`);
    }
    for (const id of FLEX_CHART_IDS) {
      const c = document.createElement('canvas');
      c.className = 'chart hidden';
      r.append(c);
      this.charts[id] = c;
      c.setAttribute('role', 'img');
      c.setAttribute('aria-label', t(FLEX_CHART_TITLES[id]));
    }
    // `headCls` exists for the event log alone: at the two-column breakpoint the
    // panel is a ~300 px scrolling strip, and the log needs a class its heading
    // shares so flex `order` can lift the pair to the top of it (style.css).
    const mk = (titleKey: string, cls: string, headCls?: string): HTMLElement => {
      r.append(el('h3', headCls ? `section ${headCls}` : 'section', t(titleKey)));
      const box = el('div', cls);
      r.append(box);
      return box;
    };
    this.losses = mk('tel.losses', 'list info');
    this.plan = mk('tel.plan', 'list info plan');
    this.debris = mk('tel.debris', 'list info');
    r.append(this.compareHost);
    this.events = mk('tel.events', 'events', 'events-head');
    this.eventsEmpty = el('div', 'events-empty', t('tel.noEvents'));
    this.events.append(this.eventsEmpty);
    const btn = el('button', 'btn export-btn', t('tel.export')) as HTMLButtonElement;
    btn.type = 'button';
    btn.addEventListener('click', () => this.exportCsv());
    r.append(btn);
    // U06: the flight report, which the app assembles (it holds the result and the link)
    if (this.onReport) {
      const report = el('button', 'btn export-btn', t('report.button')) as HTMLButtonElement;
      report.type = 'button';
      report.id = 'btn-flight-report';
      report.addEventListener('click', () => this.onReport?.());
      r.append(report);
    }
    // P07: the orbit carried on for years, once the flight is in orbit
    if (this.onLifetime) {
      const life = el('button', 'btn export-btn', t('life.button')) as HTMLButtonElement;
      life.type = 'button';
      life.id = 'btn-orbit-lifetime';
      life.addEventListener('click', () => this.onLifetime?.());
      r.append(life);
    }
    // S03: the orbit handed on to the Orbit section
    if (this.onOrbit) {
      const orbit = el('button', 'btn export-btn', t('handoff.continue')) as HTMLButtonElement;
      orbit.type = 'button';
      orbit.id = 'btn-continue-orbit';
      orbit.addEventListener('click', () => this.onOrbit?.());
      r.append(orbit);
    }
    this.shownEvents = 0;
    this.shownEventItems.length = 0;
    if (this.view) this.update(this.view, this.cursor);
  }

  /**
   * P05: bending deflection and the largest slosh displacement (cm), and the
   * shell stress against its allowable (%), for a flight that modelled them.
   */
  private drawFlex(tel: readonly TelemetrySample[], lo: number, hi: number, stride: number, xMin: number, xMax: number, xLabel: string): void {
    const has = tel.some((s) => !!s.rigid?.flex);
    for (const id of FLEX_CHART_IDS) this.charts[id].classList.toggle('hidden', !has);
    if (!has) return;
    const [fx, bend, slosh] = this.flexTraces, load = trace();
    fx.x.length = 0; bend.y.length = 0; slosh.y.length = 0;
    const push = (s: TelemetrySample): void => {
      const flex = s.rigid?.flex;
      fx.x.push(s.t);
      bend.y.push(flex?.bending ? flex.bending.deflectionM * 100 : NaN);
      const tanks = flex?.slosh?.tanks ?? [];
      slosh.y.push(flex?.slosh ? (tanks.length ? Math.max(...tanks.map((tank) => tank.displacementM)) * 100 : 0) : NaN);
      load.y.push(flex?.bending ? flex.bending.loadRatio * 100 : NaN);
    };
    for (let i = lo; i < hi; i += stride) push(tel[i]);
    if (hi - lo > 0 && (hi - 1 - lo) % stride !== 0) push(tel[hi - 1]);
    const series = (y: number[], color: string, label?: string): Series => ({ x: fx.x, y, color, label });
    drawChart(this.charts.flex, [series(bend.y, '#ffb86b', 'w'), series(slosh.y, '#6ec8ff', 's')], {
      title: t(FLEX_CHART_TITLES.flex), markers: this.markers, xMin, xMax, cursor: this.cursor, timeAxis: true, xLabel, yMin: 0,
      seriesLabels: [t('tel.chart.bending'), t('tel.chart.slosh')],
    });
    drawChart(this.charts.load, [series(load.y, '#ff7b7b')], {
      title: t(FLEX_CHART_TITLES.load), markers: this.markers, xMin, xMax, cursor: this.cursor, timeAxis: true, xLabel, yMin: 0,
    });
  }

  /** E02: the charts, or the live equations. */
  setView(mode: 'charts' | 'equations'): void {
    this.viewMode = mode;
    this.root.classList.toggle('view-equations', mode === 'equations');
    for (const b of this.viewBtns) b.setAttribute('aria-pressed', String(b.dataset.view === mode));
    if (this.view) this.update(this.view, this.cursor);
    else this.equations.update(null, null, this.equationLevel, getLang());
  }

  /** E02: the Explore mode's equations or the Engineer mode's fuller set. */
  setEquationLevel(level: EquationLevel): void {
    if (level === this.equationLevel) return;
    this.equationLevel = level;
    if (this.viewMode === 'equations') this.setView('equations');
  }

  private setRange(mode: Range): void {
    this.range = mode;
    for (const b of this.rangeBtns) {
      const on = b.dataset.range === mode;
      b.classList.toggle('active', on);
      b.setAttribute('aria-pressed', String(on));
    }
    if (this.view) this.update(this.view, this.cursor);
  }

  /**
   * The live simulation, kept only so the CSV export can write the whole
   * flight. Nothing on screen reads it.
   */
  setExportSource(sim: Simulation | null): void {
    this.live = sim;
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
    this.shownEventItems.length = 0;
    // The empty-state line goes back in, not out: a reset log is exactly the
    // case it exists for.
    this.events.replaceChildren(this.eventsEmpty);
    this.eventsEmpty.classList.remove('hidden');
    this.clearRows(this.losses);
    this.clearRows(this.plan);
    this.clearRows(this.debris);
    this.note.textContent = '';
    this.note.classList.add('hidden');
    this.cursor = 0;
    for (const id of CHART_IDS) {
      drawChart(this.charts[id], [], { title: chartTitle(id), xMin: -10, xMax: 60, timeAxis: true, xLabel: t('tel.xAxis') });
    }
    for (const id of FLEX_CHART_IDS) this.charts[id].classList.add('hidden');
    this.view = null;
    this.live = null;
  }

  /**
   * Draw the panel for one instant.
   *
   * @param view   the frame-backed simulation view for the displayed frame
   * @param cursor mission time the rest of the app is showing
   */
  update(view: Simulation, cursor?: number, frame?: VisualFrame | null): void {
    this.view = view;
    if (cursor !== undefined) this.cursor = cursor;
    if (frame !== undefined) this.frame = frame;
    // E02: the equations view draws no charts.
    if (this.viewMode === 'equations') {
      const vehicle = view.vehicle;
      this.equations.update(this.frame, { siteLatitudeDeg: view.site.latitude, siteAltitudeM: view.site.altitude,
        activeStage: vehicle.active, usablePropellant: (stage) => vehicle.usablePropellant(stage) }, this.equationLevel, getLang());
      return;
    }
    // Truncated to the cursor by the frame view, so `last` is the newest sample
    // that had been taken by the displayed instant.
    const tel = view.telemetry;
    const events = view.events;
    // Drawn even with no samples yet: eight empty framed charts with their
    // titles read as "nothing has happened", eight blank canvases read as broken.
    let ascentEnd: number | undefined;
    for (const e of events) if (e.key === 'evt.parkingOrbit') { ascentEnd = e.t; break; }
    const last = tel.length ? tel[tel.length - 1].t : 0;
    const zoomEnd = Math.max(120, (ascentEnd ?? Math.min(last, 900)) + 120);
    // 'Full mission' spans the recording up to the cursor. 'Ascent' keeps the
    // ascent's *duration* and slides it to contain the cursor, so zooming in
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
    const noteText = truncated ? t('tel.truncated', { t: fmtTime(last) }) : '';
    if (this.note.textContent !== noteText) {
      this.note.textContent = noteText;
      this.note.classList.toggle('hidden', !truncated);
    }

    const wantOrbit = this.range === 'mission';
    let nMarkers = 0;
    for (const e of events) {
      const orbit = ORBIT_MARKERS.includes(e.key);
      if (!(orbit ? wantOrbit : ASCENT_MARKERS.includes(e.key))) continue;
      let m = this.markerPool[nMarkers];
      if (!m) { m = { x: 0, color: '' }; this.markerPool.push(m); }
      m.x = e.t;
      m.color = orbit ? '#5c7d76' : '#3a4a5c';
      m.label = eventLabel(e.key, localizeEventParams(view.vehicleSpec, e.params));
      this.markers[nMarkers++] = m;
    }
    this.markers.length = nMarkers;

    // Only the samples inside the window are handed to the renderer, decimated
    // to at most MAX_POINTS: a GTO mission records tens of thousands of them
    // and a 300 px canvas can show a few hundred.
    let lo = 0;
    while (lo < tel.length && tel[lo].t < xMin - 1) lo++;
    let hi = tel.length;
    while (hi > lo && tel[hi - 1].t > xMax + 1) hi--;
    const n = hi - lo;
    const stride = n > MAX_POINTS ? Math.ceil(n / MAX_POINTS) : 1;
    const [cx, alt, vIn, vAir, q, gL, ap, pe, dv] = this.traces;
    // `pitch` and `mass` reuse two of the traces above once their own chart has
    // been drawn, so the buffer set stays at nine.
    cx.x.length = 0;
    for (const tr of this.traces) tr.y.length = 0;
    for (let i = lo; i < hi; i += stride) {
      const s = tel[i];
      cx.x.push(s.t);
      alt.y.push(s.alt / 1000);
      vIn.y.push(s.vInertial);
      vAir.y.push(s.vAir);
      q.y.push(s.q / 1000);
      gL.y.push(s.gLoad);
      ap.y.push(s.ap > 0 && s.ap < 5e7 ? s.ap / 1000 : NaN);
      pe.y.push(s.pe > -2000e3 ? s.pe / 1000 : NaN);
      dv.y.push(s.dvRemaining);
    }
    // Always include the newest sample, or the trace stops up to `stride`
    // samples short of the cursor and the charts lag the rest of the app.
    if (n > 0 && (hi - 1 - lo) % stride !== 0) {
      const s = tel[hi - 1];
      cx.x.push(s.t);
      alt.y.push(s.alt / 1000);
      vIn.y.push(s.vInertial);
      vAir.y.push(s.vAir);
      q.y.push(s.q / 1000);
      gL.y.push(s.gLoad);
      ap.y.push(s.ap > 0 && s.ap < 5e7 ? s.ap / 1000 : NaN);
      pe.y.push(s.pe > -2000e3 ? s.pe / 1000 : NaN);
      dv.y.push(s.dvRemaining);
    }
    const xs = cx.x;
    const xLabel = t('tel.xAxis');
    const refRows = this.reference ? referenceWindow(this.reference.telemetry, xMin, xMax) : null;
    const draw = (id: (typeof CHART_IDS)[number], list: Series[], yMin?: number, seriesLabels?: string[]): void => {
      if (refRows) list = [...list, ...referenceSeries(id, refRows, list)];
      drawChart(this.charts[id], list, {
        title: chartTitle(id),
        markers: this.markers, xMin, xMax, cursor: this.cursor, timeAxis: true, xLabel, yMin, seriesLabels,
      });
    };
    const set = (list: Series[], i: number, y: number[], color: string, label?: string): void => {
      const s = list[i];
      s.x = xs;
      s.y = y;
      s.color = color;
      s.label = label;
    };
    set(this.one, 0, alt.y, '#6ec8ff');
    draw('altitude', this.one);
    set(this.two, 0, vIn.y, '#8be5cd', 'v');
    set(this.two, 1, vAir.y, '#96a3b4', symbolText('airspeed'));
    draw('velocity', this.two, undefined, [t('tel.chart.inertial'), t('tel.chart.airspeed')]);
    set(this.one, 0, q.y, '#efa47e');
    draw('q', this.one, 0);
    set(this.one, 0, gL.y, '#7ddba0');
    draw('g', this.one, 0);
    set(this.two, 0, ap.y, '#6ec8ff', 'ap');
    set(this.two, 1, pe.y, '#8be5cd', 'pe');
    draw('apsides', this.two, 0, [t('tel.chart.apogee'), t('tel.chart.perigee')]);
    set(this.one, 0, dv.y, '#c3a6ff');
    draw('dv', this.one, 0);
    // pitch and mass reuse two traces whose charts are already rasterised
    alt.y.length = 0;
    vIn.y.length = 0;
    for (let i = lo; i < hi; i += stride) { alt.y.push(tel[i].pitch); vIn.y.push(tel[i].mass / 1000); }
    if (n > 0 && (hi - 1 - lo) % stride !== 0) { alt.y.push(tel[hi - 1].pitch); vIn.y.push(tel[hi - 1].mass / 1000); }
    set(this.one, 0, alt.y, '#ffd28a');
    draw('pitch', this.one);
    set(this.one, 0, vIn.y, '#9be7ff');
    draw('mass', this.one, 0);
    this.drawFlex(tel, lo, hi, stride, xMin, xMax, xLabel);

    // Δv budget — the frame's own loss book-keeping, so it rewinds.
    const L = view.state.losses;
    const site = view.site;
    const vRot = OMEGA_EARTH * R_EARTH * Math.cos(site.latitude * DEG);
    this.beginRows(this.losses);
    this.row(this.losses, t('tel.loss.thrust'), `${L.dvThrust.toFixed(0)} m/s`);
    this.row(this.losses, t('tel.loss.gravity'), `${L.gravity.toFixed(0)} m/s`);
    this.row(this.losses, t('tel.loss.drag'), `${L.drag.toFixed(0)} m/s`);
    this.row(this.losses, t('tel.loss.steering'), `${L.steering.toFixed(0)} m/s`);
    this.row(this.losses, t('tel.loss.rotation'), `${(vRot * Math.sin(view.plan.azimuthInertial)).toFixed(0)} m/s`);
    const mq = view.state.maxQ;
    this.row(this.losses, t('tel.maxQ'), mq.value > 0
      ? `${(mq.value / 1000).toFixed(1)} kPa · ${(mq.alt / 1000).toFixed(1)} km · ${fmtTime(mq.t)}`
      : '—');
    this.endRows(this.losses);

    // Flight plan. `BurnPlan.done` is live state with no frame equivalent, so
    // the panel counts the `evt.burnComplete` callouts that had fired by the
    // displayed instant instead — which is the same fact, taken from the log
    // that does rewind.
    let completed = 0;
    for (const e of events) if (e.key === 'evt.burnComplete') completed++;
    this.beginRows(this.plan);
    this.row(this.plan, t('setup.info.insertion'), `${(view.plan.insertionAltitude / 1000).toFixed(0)} × ${(view.plan.insertionApoapsis / 1000).toFixed(0)} km`);
    let bi = 0;
    for (const b of view.plan.burns) {
      const done = bi++ < completed;
      this.row(this.plan, t(`tel.burn.${b.kind}`), `${b.dvEstimate.toFixed(0)} m/s · ${done ? t('tel.burn.done') : t('tel.burn.pending')}`, done ? 'done' : 'pending');
    }
    this.endRows(this.plan);

    // Spent stages, from the frame's debris list.
    this.beginRows(this.debris);
    let any = false;
    for (const d of view.debris) {
      if (d.visual.kind === 'fairing') continue;
      any = true;
      let st: string;
      if (!d.alive) st = t(`tel.debris.${d.outcome ?? 'impact'}`);
      else if (d.recovery?.burning) {
        st = d.recovery.phase === 'entry' ? t('tel.debris.entryBurn') : d.recovery.phase === 'boostback' ? t('tel.debris.boostback')
          : d.recovery.phase === 'flip' ? t('tel.debris.flip') : t('tel.debris.landingBurn');
      }
      else if (d.outcome === 'orbit') st = t('tel.debris.orbit');
      else st = t('tel.debris.falling');
      const alt2 = Math.max(0, (Math.hypot(d.r.x, d.r.y, d.r.z) - R_EARTH) / 1000);
      let v = st;
      if (d.alive) v += ` · ${alt2.toFixed(0)} km`;
      if (d.impact) v += ` · ${d.impact.lat.toFixed(1)}°, ${d.impact.lon.toFixed(1)}°`;
      this.row(this.debris, stageNameByLabel(view.vehicleSpec, d.name), v);
    }
    if (!any) this.row(this.debris, t('misc.none'), '');
    this.endRows(this.debris);

    // Event log. Appended while the cursor moves forwards and trimmed when it
    // moves back, so the log always ends at the displayed instant. The box is
    // only re-pinned to the bottom when it was already there: forcing the
    // scroll on every tick made it impossible to read back through the log
    // while a flight was running.
    const log = this.events;
    const atBottom = log.scrollHeight - log.scrollTop - log.clientHeight <= LOG_STICK;
    let common = 0;
    while (common < this.shownEvents && common < events.length && this.shownEventItems[common] === events[common]) common++;
    // Preserve the unchanged prefix and rebuild only the suffix affected by a
    // seek or a late event inserted into the chronology (for example max Q).
    while (this.shownEvents > common) {
      log.lastChild?.remove();
      this.shownEvents--;
      this.shownEventItems.pop();
    }
    while (this.shownEvents < events.length) {
      const e = events[this.shownEvents++];
      this.shownEventItems.push(e);
      const div = el('div', e.severity);
      div.append(el('span', 't', fmtTime(e.t)), document.createTextNode(t(e.key, localizeEventParams(view.vehicleSpec, e.params))));
      log.append(div);
    }
    // Scrubbing back to T-10 empties the log again, so this is not a first-run
    // state: it is re-evaluated on every pass.
    this.eventsEmpty.classList.toggle('hidden', events.length > 0);
    if (atBottom) log.scrollTop = log.scrollHeight;
  }

  /**
   * Key/value lists are written through a row pool: the elements are created
   * once and then rewritten, so a 2 Hz update does not churn ~20 elements a
   * second through the DOM (which also reset each list's scroll position and
   * made the panel flicker under a scrub).
   */
  private beginRows(box: HTMLElement): void {
    let pool = this.rowPools.get(box);
    if (!pool) { pool = { rows: [], used: 0 }; this.rowPools.set(box, pool); }
    pool.used = 0;
  }

  private row(box: HTMLElement, k: string, v: string, cls?: string): void {
    const pool = this.rowPools.get(box)!;
    let r = pool.rows[pool.used];
    if (!r) {
      r = el('div');
      r.append(el('span', 'k'), el('span', 'v'));
      pool.rows.push(r);
      box.append(r);
    }
    const kEl = r.firstChild as HTMLElement;
    const vEl = r.lastChild as HTMLElement;
    if (kEl.textContent !== k) kEl.textContent = k;
    if (vEl.textContent !== v) vEl.textContent = v;
    const want = cls ?? '';
    if (r.className !== want) r.className = want;
    pool.used++;
  }

  /** Hide the rows of `box` that this pass did not write. */
  private endRows(box: HTMLElement): void {
    const pool = this.rowPools.get(box);
    if (!pool) return;
    for (let i = pool.used; i < pool.rows.length; i++) pool.rows[i].classList.add('hidden');
  }

  private clearRows(box: HTMLElement): void {
    box.replaceChildren();
    this.rowPools.delete(box);
  }

  /** U06: set by the app to offer the flight report beside the CSV export. */
  onReport: (() => void) | null = null;
  /** P07: set by the app to offer the orbit-lifetime analysis. */
  onLifetime: (() => void) | null = null;
  /** S03: set by the app to hand the orbit on to the Orbit section. */
  onOrbit: (() => void) | null = null;

  /** U02: draw a reference flight on every chart, dashed (null: none). */
  setReference(ref: ReferenceFlight | null): void {
    this.reference = ref;
    if (this.view) this.update(this.view, this.cursor);
  }

  /** The whole flight the CSV and the report are made from. */
  exportSource(): Simulation | null {
    return this.live;
  }

  /** The panel's own charts, which the report redraws over the whole flight. */
  chartCanvases(): Set<HTMLCanvasElement> {
    return new Set(Object.values(this.charts));
  }

  exportCsv(): void {
    const sim = this.live;
    if (!sim) return;
    const csv = buildTelemetryCsv(sim);
    downloadBlob(new Blob([csv], { type: 'text/csv' }), telemetryCsvFilename(sim));
  }
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}
