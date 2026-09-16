import type { Simulation } from '../physics/simulation';
import { drawChart } from './charts';
import { t } from '../i18n';
import { fmtTime, eventText } from './hud';
import { OMEGA_EARTH, R_EARTH, DEG } from '../physics/constants';

export class TelemetryPanel {
  private root: HTMLElement;
  private charts: Record<string, HTMLCanvasElement> = {};
  private losses!: HTMLElement;
  private plan!: HTMLElement;
  private debris!: HTMLElement;
  private events!: HTMLElement;
  private shownEvents = 0;
  private sim: Simulation | null = null;

  constructor(root: HTMLElement) {
    this.root = root;
    this.build();
  }

  build(): void {
    const r = this.root;
    r.innerHTML = '';
    const h = document.createElement('h2');
    h.className = 'section';
    h.textContent = t('tel.title');
    r.appendChild(h);
    for (const id of ['altitude', 'velocity', 'q', 'g', 'apsides', 'dv', 'pitch', 'mass']) {
      const c = document.createElement('canvas');
      c.className = 'chart';
      c.setAttribute('role', 'img');
      c.setAttribute('aria-label', t(`tel.${id}`));
      r.appendChild(c);
      this.charts[id] = c;
    }
    const mk = (titleKey: string, cls: string) => {
      const hh = document.createElement('h2');
      hh.className = 'section';
      hh.textContent = t(titleKey);
      r.appendChild(hh);
      const box = document.createElement('div');
      box.className = cls;
      r.appendChild(box);
      return box;
    };
    this.losses = mk('tel.losses', 'list info');
    this.plan = mk('tel.plan', 'list info plan');
    this.debris = mk('tel.debris', 'list info');
    this.events = mk('tel.events', 'events');
    const btn = document.createElement('button');
    btn.className = 'btn';
    btn.textContent = t('tel.export');
    btn.style.marginTop = '8px';
    btn.addEventListener('click', () => this.exportCsv());
    r.appendChild(btn);
    this.shownEvents = 0;
    if (this.sim) this.update(this.sim, true);
  }

  reset(): void {
    this.shownEvents = 0;
    this.events.innerHTML = '';
    this.sim = null;
  }

  update(sim: Simulation, force = false): void {
    this.sim = sim;
    const tel = sim.telemetry;
    if (tel.length < 2 && !force) return;
    const ascentEnd = sim.events.find((e) => e.key === 'evt.parkingOrbit')?.t;
    const markers = sim.events.filter((e) => ['evt.maxQ', 'evt.meco', 'evt.stageSep', 'evt.seco', 'evt.fairingSep'].includes(e.key)).map((e) => ({ x: e.t, color: '#3a4a6a' }));
    // charts show the ascent window; once a post-insertion burn has started (apogee raising,
    // circularisation, plane change) they widen to the whole flight so those burns are visible
    const ascentCut = Math.max(1500, ascentEnd ?? 0) + 120;
    const burnStarted = sim.events.some((e) => e.key === 'evt.burnStart' && e.t > ascentCut);
    const cut = burnStarted ? tel : tel.filter((s) => s.t <= ascentCut);
    const cx = cut.map((s) => s.t);
    drawChart(this.charts.altitude, [{ x: cx, y: cut.map((s) => s.alt / 1000), color: '#4aa3ff' }], { title: t('tel.altitude'), markers });
    drawChart(this.charts.velocity, [
      { x: cx, y: cut.map((s) => s.vInertial), color: '#f2b134', label: t('tel.legend.v') },
      { x: cx, y: cut.map((s) => s.vAir), color: '#8d9bb5', label: t('tel.legend.vAir') },
    ], { title: t('tel.velocity'), markers });
    drawChart(this.charts.q, [{ x: cx, y: cut.map((s) => s.q / 1000), color: '#ff7a7a' }], { title: t('tel.q'), markers, yMin: 0 });
    drawChart(this.charts.g, [{ x: cx, y: cut.map((s) => s.gLoad), color: '#4cd97b' }], { title: t('tel.g'), markers, yMin: 0 });
    drawChart(this.charts.apsides, [
      { x: cx, y: cut.map((s) => (s.ap > 0 && s.ap < 5e7 ? s.ap / 1000 : NaN)), color: '#4aa3ff', label: t('tel.legend.ap') },
      { x: cx, y: cut.map((s) => Math.max(s.pe, -50e3) / 1000), color: '#f2b134', label: t('tel.legend.pe') },
    ], { title: t('tel.apsides'), markers, yMin: 0 });
    drawChart(this.charts.dv, [{ x: cx, y: cut.map((s) => s.dvRemaining), color: '#c39bff' }], { title: t('tel.dv'), markers, yMin: 0 });
    drawChart(this.charts.pitch, [{ x: cx, y: cut.map((s) => s.pitch), color: '#ffd166' }], { title: t('tel.pitch'), markers });
    drawChart(this.charts.mass, [{ x: cx, y: cut.map((s) => s.mass / 1000), color: '#9be7ff' }], { title: t('tel.mass'), markers, yMin: 0 });
    // dv budget
    const L = sim.state.losses;
    const site = sim.site;
    const vRot = OMEGA_EARTH * R_EARTH * Math.cos(site.latitude * DEG);
    const row = (k: string, v: string) => `<div><span class="k">${k}</span> ${v}</div>`;
    const ms = t('u.ms'), km = t('u.km');
    this.losses.innerHTML =
      row(t('tel.loss.thrust'), `${L.dvThrust.toFixed(0)} ${ms}`) +
      row(t('tel.loss.gravity'), `${L.gravity.toFixed(0)} ${ms}`) +
      row(t('tel.loss.drag'), `${L.drag.toFixed(0)} ${ms}`) +
      row(t('tel.loss.steering'), `${L.steering.toFixed(0)} ${ms}`) +
      row(t('tel.loss.rotation'), `${(vRot * Math.sin(sim.plan.azimuthInertial)).toFixed(0)} ${ms}`) +
      row(t('tel.maxQ'), `${(sim.state.maxQ.value / 1000).toFixed(1)} ${t('u.kPa')} @ ${(sim.state.maxQ.alt / 1000).toFixed(1)} ${km}, ${fmtTime(sim.state.maxQ.t)}`);
    // plan
    let planHtml = `<div><span class="k">${t('setup.info.insertion')}</span><span>${(sim.plan.insertionAltitude / 1000).toFixed(0)} × ${(sim.plan.insertionApoapsis / 1000).toFixed(0)} ${km}</span></div>`;
    for (const b of sim.plan.burns) {
      planHtml += `<div class="${b.done ? 'done' : 'pending'}"><span>${t(`tel.burn.${b.kind}`)}</span><span>${b.dvEstimate.toFixed(0)} ${ms} · ${b.done ? t('tel.burn.done') : t('tel.burn.pending')}</span></div>`;
    }
    this.plan.innerHTML = planHtml;
    // debris
    let dHtml = '';
    for (const d of sim.debris) {
      if (d.visual.kind === 'fairing') continue;
      let st: string;
      if (!d.alive) st = t(`tel.debris.${d.outcome ?? 'impact'}`);
      else if (d.recovery?.burning) st = d.recovery.phase === 'entry' ? t('tel.debris.entryBurn') : t('tel.debris.landingBurn');
      else if (d.outcome === 'orbit') st = t('tel.debris.orbit');
      else st = t('tel.debris.falling');
      const alt = Math.max(0, (Math.hypot(d.r.x, d.r.y, d.r.z) - R_EARTH) / 1000);
      dHtml += `<div><span class="k">${d.name}</span> ${st}${d.alive ? ` · ${alt.toFixed(0)} ${km}` : ''}${d.impact ? ` · ${d.impact.lat.toFixed(1)}°, ${d.impact.lon.toFixed(1)}°` : ''}</div>`;
    }
    this.debris.innerHTML = dHtml || `<div class="k">${t('misc.none')}</div>`;
    // events: auto-scroll only when something new arrived and the user was already at the bottom
    const atBottom = this.events.scrollTop + this.events.clientHeight >= this.events.scrollHeight - 8;
    let added = false;
    while (this.shownEvents < sim.events.length) {
      const e = sim.events[this.shownEvents++];
      const div = document.createElement('div');
      div.className = e.severity;
      div.innerHTML = `<span class="t">${fmtTime(e.t)}</span>${eventText(e)}`;
      this.events.appendChild(div);
      added = true;
    }
    if (added && (atBottom || force)) this.events.scrollTop = this.events.scrollHeight;
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
