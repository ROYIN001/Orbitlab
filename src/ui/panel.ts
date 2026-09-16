/**
 * Mission setup panel: vehicle, payload, site, orbit, launch time, guidance,
 * failure injection and options. Keeps its own state and produces a
 * MissionConfig on demand.
 */
import type { MissionConfig, OrbitSpec, GuidanceParams, FailureConfig, FailureMode } from '../types';
import { VEHICLES, vehicleById } from '../data/vehicles';
import { SATELLITES, satelliteById } from '../data/satellites';
import { SITES, siteById } from '../data/sites';
import { ORBIT_PRESETS, orbitById } from '../data/orbits';
import { DEFAULT_GUIDANCE, DEFAULT_FAILURE } from '../physics/defaults';
import { liftoffMass, liftoffThrust, idealDeltaV, VehicleModel } from '../physics/vehicle';
import { planMission, launchWindows, resolveTarget } from '../physics/mission';
import { runAscent, DEFAULT_KICKS, DEFAULT_RATES, DEFAULT_LOFTS, needsLoftSearch, type TuneResult } from '../physics/autotune';
import { G0, RAD } from '../physics/constants';
import { t } from '../i18n';

export interface SetupCallbacks {
  onLaunch: (cfg: MissionConfig) => void;
  onReset: () => void;
  onChange?: (cfg: MissionConfig) => void;
}

interface SetupState {
  vehicleId: string;
  satelliteId: string;
  siteId: string;
  orbitId: string;
  orbit: OrbitSpec;
  launchTime: Date;
  guidance: GuidanceParams;
  failure: FailureConfig;
  boosterRecovery: boolean;
  payloadMass: number;
}

const FAILURE_MODES: FailureMode[] = ['none', 'engineOut', 'thrustLoss', 'prematureSep', 'fairingStuck', 'rangeSafety', 'random'];

function toDatetimeLocalUTC(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}T${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
}
function fromDatetimeLocalUTC(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(s);
  if (!m) return null;
  return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], 0));
}
const fmtUTC = (d: Date) => d.toISOString().replace('T', ' ').slice(0, 16) + ' UTC';

export class SetupPanel {
  readonly root: HTMLElement;
  private cb: SetupCallbacks;
  state: SetupState;
  private running = false;
  private tuning = false;
  private tuneMessage = '';

  constructor(root: HTMLElement, cb: SetupCallbacks) {
    this.root = root;
    this.cb = cb;
    const now = new Date();
    now.setUTCSeconds(0, 0);
    now.setUTCMinutes(Math.ceil(now.getUTCMinutes() / 5) * 5);
    this.state = {
      vehicleId: 'soyuz21a', satelliteId: 'crew', siteId: 'baikonur', orbitId: 'iss', orbit: { ...orbitById('iss') },
      launchTime: now, guidance: { ...DEFAULT_GUIDANCE }, failure: { ...DEFAULT_FAILURE }, boosterRecovery: false,
      payloadMass: satelliteById('crew').mass,
    };
    this.render();
  }

  getConfig(): MissionConfig {
    const s = this.state;
    return {
      vehicleId: s.vehicleId, satelliteId: s.satelliteId, siteId: s.siteId, orbit: { ...s.orbit },
      launchTime: new Date(s.launchTime.getTime()), guidance: { ...s.guidance }, failure: { ...s.failure },
      boosterRecovery: s.boosterRecovery, payloadMassOverride: s.payloadMass,
    };
  }

  setRunning(r: boolean): void {
    this.running = r;
    this.render();
  }

  private el<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string): HTMLElementTagNameMap[K] {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  }

  private select(labelKey: string, options: { value: string; label: string }[], value: string, onChange: (v: string) => void): HTMLElement {
    const lab = this.el('label', 'field');
    lab.appendChild(this.el('span', undefined, t(labelKey)));
    const sel = this.el('select');
    for (const o of options) {
      const op = this.el('option', undefined, o.label);
      op.value = o.value;
      if (o.value === value) op.selected = true;
      sel.appendChild(op);
    }
    sel.disabled = this.running;
    sel.addEventListener('change', () => onChange(sel.value));
    lab.appendChild(sel);
    return lab;
  }

  private number(labelKey: string, value: number, onChange: (v: number) => void, step = 1, min?: number, max?: number): HTMLElement {
    const lab = this.el('label', 'field');
    lab.appendChild(this.el('span', undefined, t(labelKey)));
    const inp = this.el('input');
    inp.type = 'number';
    inp.value = String(+value.toFixed(3));
    inp.step = String(step);
    if (min !== undefined) inp.min = String(min);
    if (max !== undefined) inp.max = String(max);
    inp.disabled = this.running;
    inp.addEventListener('change', () => {
      const v = Number(inp.value);
      if (isFinite(v)) onChange(v);
    });
    lab.appendChild(inp);
    return lab;
  }

  private changed(): void {
    this.updateInfo();
    this.cb.onChange?.(this.getConfig());
  }

  /** Rebuild the whole panel from state. */
  render(): void {
    const s = this.state;
    const root = this.root;
    root.innerHTML = '';
    root.appendChild(this.el('h2', 'section', t('setup.title')));
    const vehicle = vehicleById(s.vehicleId);
    if (!vehicle.sites.includes(s.siteId)) s.siteId = vehicle.sites[0];

    // vehicle / payload / site
    root.appendChild(this.select('setup.vehicle', VEHICLES.map((v) => ({ value: v.id, label: `${v.name} (${v.country})` })), s.vehicleId, (v) => {
      s.vehicleId = v;
      const spec = vehicleById(v);
      if (!spec.sites.includes(s.siteId)) s.siteId = spec.sites[0];
      if (!spec.recoverable) s.boosterRecovery = false;
      this.render();
      this.changed();
    }));
    root.appendChild(this.select('setup.satellite', SATELLITES.map((x) => ({ value: x.id, label: x.name })), s.satelliteId, (v) => {
      s.satelliteId = v;
      const sat = satelliteById(v);
      s.payloadMass = sat.mass;
      const typical = orbitById(sat.typicalOrbit);
      s.orbitId = typical.id;
      s.orbit = { ...typical };
      this.render();
      this.changed();
    }));
    root.appendChild(this.number('setup.payloadMass', s.payloadMass, (v) => { s.payloadMass = Math.max(1, v); this.changed(); }, 10, 1));
    root.appendChild(this.select('setup.site', SITES.filter((x) => vehicle.sites.includes(x.id)).map((x) => ({ value: x.id, label: `${x.name} (${x.latitude.toFixed(1)}°)` })), s.siteId, (v) => { s.siteId = v; this.render(); this.changed(); }));

    // orbit
    root.appendChild(this.el('h2', 'section', t('setup.orbit')));
    root.appendChild(this.select('setup.orbit', ORBIT_PRESETS.map((o) => ({ value: o.id, label: o.name })), s.orbitId, (v) => {
      s.orbitId = v;
      s.orbit = { ...orbitById(v) };
      this.render();
      this.changed();
    }));
    const desc = this.el('div', 'small', s.orbit.description);
    root.appendChild(desc);
    const site = siteById(s.siteId);
    const target = resolveTarget(s.orbit, site, s.launchTime);
    const orbitRow = this.el('div', 'row');
    orbitRow.appendChild(this.number('setup.perigee', s.orbit.perigee / 1000, (v) => { this.customise(); s.orbit.perigee = Math.max(100, v) * 1000; this.render(); this.changed(); }, 10, 100));
    orbitRow.appendChild(this.number('setup.apogee', s.orbit.apogee / 1000, (v) => { this.customise(); s.orbit.apogee = Math.max(100, v) * 1000; this.render(); this.changed(); }, 10, 100));
    root.appendChild(orbitRow);
    const orbitRow2 = this.el('div', 'row');
    orbitRow2.appendChild(this.number('setup.inclination', target.inclination * RAD, (v) => { this.customise(); s.orbit.inclination = Math.max(0, Math.min(180, v)); this.render(); this.changed(); }, 0.1, 0, 180));
    orbitRow2.appendChild(this.number('setup.argPerigee', s.orbit.argPerigee, (v) => { this.customise(); s.orbit.argPerigee = ((v % 360) + 360) % 360; this.changed(); }, 1, 0, 360));
    root.appendChild(orbitRow2);
    root.appendChild(this.select('setup.raanMode', [
      { value: 'free', label: t('setup.raanFree') }, { value: 'fixed', label: t('setup.raanFixed') },
      { value: 'iss', label: t('setup.raanIss') }, { value: 'ltan', label: t('setup.raanLtan') },
    ], s.orbit.raanMode, (v) => { this.customise(); s.orbit.raanMode = v as OrbitSpec['raanMode']; this.render(); this.changed(); }));
    if (s.orbit.raanMode === 'fixed') root.appendChild(this.number('setup.raan', s.orbit.raan ?? 0, (v) => { s.orbit.raan = ((v % 360) + 360) % 360; this.render(); this.changed(); }, 1, 0, 360));
    if (s.orbit.raanMode === 'ltan') root.appendChild(this.number('setup.ltan', s.orbit.ltan ?? 10.5, (v) => { s.orbit.ltan = Math.max(0, Math.min(24, v)); this.render(); this.changed(); }, 0.25, 0, 24));

    // launch time
    const timeLab = this.el('label', 'field');
    timeLab.appendChild(this.el('span', undefined, t('setup.launchTime')));
    const timeInp = this.el('input');
    timeInp.type = 'datetime-local';
    timeInp.value = toDatetimeLocalUTC(s.launchTime);
    timeInp.disabled = this.running;
    timeInp.addEventListener('change', () => {
      const d = fromDatetimeLocalUTC(timeInp.value);
      if (d) { s.launchTime = d; this.render(); this.changed(); }
    });
    timeLab.appendChild(timeInp);
    root.appendChild(timeLab);
    const wins = s.orbit.raanMode === 'free' ? [] : launchWindows(s.orbit, site, new Date(s.launchTime.getTime() - 60e3), 3);
    const winBox = this.el('div', 'windows');
    if (s.orbit.raanMode === 'free') winBox.appendChild(this.el('div', undefined, t('setup.noWindow')));
    else {
      winBox.appendChild(this.el('div', 'k', t('setup.windowInfo') + ':'));
      for (const w of wins) {
        const row = this.el('div', undefined, `▸ ${fmtUTC(w.time)}  RAAN ${(w.raanTarget * RAD).toFixed(1)}°`);
        row.addEventListener('click', () => { if (this.running) return; s.launchTime = w.time; this.render(); this.changed(); });
        winBox.appendChild(row);
      }
      const btn = this.el('button', 'btn', t('setup.nextWindow'));
      btn.disabled = this.running;
      btn.addEventListener('click', () => { if (wins[0]) { s.launchTime = wins[0].time; this.render(); this.changed(); } });
      winBox.appendChild(btn);
    }
    root.appendChild(winBox);

    // info
    const info = this.el('div', 'info');
    info.id = 'vehicle-info';
    root.appendChild(info);

    // guidance
    const gd = this.el('details');
    const gsum = this.el('summary', undefined, t('setup.guidance'));
    gd.appendChild(gsum);
    const g = s.guidance;
    const r1 = this.el('div', 'row');
    r1.appendChild(this.number('setup.kickAngle', g.kickAngle, (v) => { g.kickAngle = v; this.changed(); }, 0.5, 0, 45));
    r1.appendChild(this.number('setup.maxTurnRate', g.maxTurnRate, (v) => { g.maxTurnRate = v; this.changed(); }, 0.05, 0.1, 3));
    gd.appendChild(r1);
    const r2 = this.el('div', 'row');
    r2.appendChild(this.number('setup.pitchOverAltitude', g.pitchOverAltitude, (v) => { g.pitchOverAltitude = v; this.changed(); }, 50, 20, 5000));
    r2.appendChild(this.number('setup.kickDuration', g.kickDuration, (v) => { g.kickDuration = v; this.changed(); }, 1, 1, 60));
    gd.appendChild(r2);
    const r3 = this.el('div', 'row');
    r3.appendChild(this.number('setup.loftAltitude', g.loftAltitude / 1000, (v) => { g.loftAltitude = v * 1000; this.changed(); }, 10, 0, 400));
    r3.appendChild(this.number('setup.gravityTurnEnd', g.gravityTurnEnd / 1000, (v) => { g.gravityTurnEnd = v * 1000; this.changed(); }, 5, 30, 150));
    gd.appendChild(r3);
    const r4 = this.el('div', 'row');
    r4.appendChild(this.number('setup.pitchMax', g.pitchMax, (v) => { g.pitchMax = v; this.changed(); }, 1, 0, 80));
    r4.appendChild(this.number('setup.pitchMin', g.pitchMin, (v) => { g.pitchMin = v; this.changed(); }, 1, -60, 0));
    gd.appendChild(r4);
    const r5 = this.el('div', 'row');
    r5.appendChild(this.number('setup.slewRate', g.slewRate, (v) => { g.slewRate = v; this.changed(); }, 0.5, 0.5, 20));
    r5.appendChild(this.number('setup.maxAccel', g.maxAccel, (v) => { g.maxAccel = v; this.changed(); }, 1, 0, 100));
    gd.appendChild(r5);
    gd.appendChild(this.number('setup.parkingAltitude', g.parkingAltitude / 1000, (v) => { g.parkingAltitude = v * 1000; this.changed(); }, 10, 0, 2000));
    const tuneBtn = this.el('button', 'btn', this.tuning ? t('setup.autotuning') : t('setup.autotune'));
    tuneBtn.disabled = this.running || this.tuning;
    tuneBtn.addEventListener('click', () => void this.autotune());
    gd.appendChild(tuneBtn);
    const tuneMsg = this.el('div', 'progress', this.tuneMessage);
    tuneMsg.id = 'tune-msg';
    gd.appendChild(tuneMsg);
    root.appendChild(gd);

    // failure
    const fd = this.el('details');
    fd.appendChild(this.el('summary', undefined, t('setup.failure')));
    fd.appendChild(this.select('setup.failureMode', FAILURE_MODES.map((m) => ({ value: m, label: t(`setup.fail.${m}`) })), s.failure.mode, (v) => { s.failure.mode = v as FailureMode; this.changed(); }));
    const fr = this.el('div', 'row');
    fr.appendChild(this.number('setup.failureTime', s.failure.time, (v) => { s.failure.time = Math.max(0, v); this.changed(); }, 5, 0, 2000));
    fr.appendChild(this.select('setup.failureStage', vehicle.stages.map((st, i) => ({ value: String(i), label: `${i + 1}: ${st.name}` })), String(Math.min(s.failure.stage, vehicle.stages.length - 1)), (v) => { s.failure.stage = Number(v); this.changed(); }));
    fd.appendChild(fr);
    root.appendChild(fd);

    // options
    root.appendChild(this.el('h2', 'section', t('setup.options')));
    const chk = this.el('label', 'checkbox');
    const cb = this.el('input');
    cb.type = 'checkbox';
    cb.checked = s.boosterRecovery;
    cb.disabled = this.running || !vehicle.recoverable;
    cb.addEventListener('change', () => { s.boosterRecovery = cb.checked; this.changed(); });
    chk.appendChild(cb);
    chk.appendChild(this.el('span', undefined, t('setup.boosterRecovery')));
    root.appendChild(chk);

    // actions
    const actions = this.el('div', 'actions');
    const launch = this.el('button', 'btn primary', t('setup.launch'));
    launch.disabled = this.running || this.tuning;
    launch.addEventListener('click', () => this.cb.onLaunch(this.getConfig()));
    const reset = this.el('button', 'btn', t('setup.reset'));
    reset.addEventListener('click', () => { this.running = false; this.render(); this.cb.onReset(); });
    actions.appendChild(launch);
    actions.appendChild(reset);
    root.appendChild(actions);
    this.updateInfo();
  }

  private customise(): void {
    if (this.state.orbitId !== 'custom') {
      this.state.orbitId = 'custom';
      this.state.orbit = { ...this.state.orbit, id: 'custom', name: orbitById('custom').name, description: orbitById('custom').description };
    }
  }

  private updateInfo(): void {
    const box = this.root.querySelector<HTMLElement>('#vehicle-info');
    if (!box) return;
    const s = this.state;
    const spec = vehicleById(s.vehicleId);
    const site = siteById(s.siteId);
    const sat = satelliteById(s.satelliteId);
    const cfg = this.getConfig();
    const m0 = liftoffMass(spec, s.payloadMass) + (sat.propulsion ? 0 : 0);
    const T0 = liftoffThrust(spec);
    const dv = idealDeltaV(spec, s.payloadMass);
    const vm = new VehicleModel(spec, s.payloadMass, s.boosterRecovery, sat);
    let plan;
    try { plan = planMission(cfg, site, spec); } catch { plan = null; }
    const lines: string[] = [];
    const row = (k: string, v: string, cls = '') => lines.push(`<span class="k">${k}</span> <span class="${cls}">${v}</span>`);
    row(t('setup.info.height'), `${spec.height} m`);
    row(t('setup.info.liftoffMass'), `${(m0 / 1000).toFixed(1)} t`);
    row(t('setup.info.liftoffThrust'), `${(T0 / 1000).toFixed(0)} kN`);
    row(t('setup.info.twr'), (T0 / (m0 * G0)).toFixed(2));
    row(t('setup.info.stages'), `${spec.stages.length}${sat.propulsion ? ' + s/c' : ''}`);
    row(t('setup.info.idealDv'), `${dv.toFixed(0)} m/s`);
    if (sat.propulsion) row(t('setup.info.spacecraftDv'), `${vm.spacecraftDeltaV().toFixed(0)} m/s`);
    row(t('setup.info.payloadLEO'), `${spec.payloadLEO} kg`);
    if (spec.payloadGTO) row(t('setup.info.payloadGTO'), `${spec.payloadGTO} kg`);
    if (plan) {
      row(t('setup.info.azimuth'), `${(plan.azimuthRotating * RAD).toFixed(1)}° (${plan.descending ? 'S' : 'N'})`);
      row(t('setup.info.ascentInclination'), `${(plan.ascentInclination * RAD).toFixed(2)}°`);
      row(t('setup.info.insertion'), `${(plan.insertionAltitude / 1000).toFixed(0)} × ${(plan.insertionApoapsis / 1000).toFixed(0)} km`);
      if (plan.planeChangeDeg > 0.05) row(t('setup.info.planeChange'), `${plan.planeChangeDeg.toFixed(1)}°`, 'warn');
      row(t('setup.info.burnsDv'), `${plan.dvEstimateBurns.toFixed(0)} m/s (${plan.burns.length})`);
      if (!plan.inclinationReachable) lines.push(`<span class="warn">${t('setup.info.unreachable')}</span>`);
    }
    box.innerHTML = lines.join('<br>');
  }

  /** Chunked auto-tune so the UI stays responsive. */
  private async autotune(): Promise<void> {
    if (this.tuning) return;
    this.tuning = true;
    this.tuneMessage = t('setup.autotuning');
    this.render();
    const cfg = this.getConfig();
    const lofts = needsLoftSearch(cfg) ? DEFAULT_LOFTS : [0];
    const combos: [number, number, number][] = [];
    for (const loft of lofts) for (const rate of DEFAULT_RATES) for (const k of DEFAULT_KICKS) combos.push([k, rate, loft]);
    const results: TuneResult[] = [];
    for (let i = 0; i < combos.length; i++) {
      const [k, rate, loft] = combos[i];
      results.push(runAscent(cfg, k, rate, loft));
      const msg = this.root.querySelector('#tune-msg');
      if (msg) msg.textContent = `${t('setup.autotuning')} ${i + 1}/${combos.length}`;
      if (i % 3 === 2) await new Promise((r) => setTimeout(r, 0));
    }
    const ok = results.filter((r) => r.success);
    let best: TuneResult | null = null;
    if (ok.length) best = ok.reduce((a, b) => (b.dvRemaining > a.dvRemaining ? b : a));
    this.tuning = false;
    if (best) {
      this.state.guidance.kickAngle = best.kickAngle;
      this.state.guidance.maxTurnRate = best.maxTurnRate;
      this.state.guidance.loftAltitude = best.loftAltitude;
      this.tuneMessage = t('setup.autotuneResult', { kick: best.kickAngle, rate: best.maxTurnRate, loft: best.loftAltitude / 1000, dv: Math.round(best.dvRemaining) });
    } else {
      this.tuneMessage = t('setup.autotuneFail');
    }
    this.render();
    this.changed();
  }
}
