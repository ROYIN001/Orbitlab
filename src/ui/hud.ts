import type { Simulation } from '../physics/simulation';
import { t } from '../i18n';
import { RAD } from '../physics/constants';

export function fmtTime(sec: number): string {
  const sign = sec < 0 ? '-' : '+';
  const a = Math.abs(sec);
  const h = Math.floor(a / 3600);
  const m = Math.floor((a % 3600) / 60);
  const s = Math.floor(a % 60);
  const p = (n: number) => String(n).padStart(2, '0');
  return `T${sign}${h > 0 ? h + ':' : ''}${p(m)}:${p(s)}`;
}

/** Translated text of a simulation event (burn kinds inside params are translated too). */
export function eventText(e: { key: string; params?: Record<string, string | number> }): string {
  const p = e.params && typeof e.params.kind === 'string' ? { ...e.params, kind: t(`tel.burn.${e.params.kind}`) } : e.params;
  return t(e.key, p);
}

export class Hud {
  private ticker: HTMLElement;
  private left: HTMLElement;
  private right: HTMLElement;
  private shownEvents = 0;

  constructor(root: HTMLElement, ticker: HTMLElement) {
    this.ticker = ticker;
    this.left = document.createElement('div');
    this.left.className = 'hud-box';
    this.right = document.createElement('div');
    this.right.className = 'hud-box';
    root.appendChild(this.left);
    root.appendChild(this.right);
  }

  reset(): void {
    this.shownEvents = 0;
    this.ticker.innerHTML = '';
    this.left.innerHTML = '';
    this.right.innerHTML = '';
  }

  /** Drop the visible ticker entries (e.g. after a language change; they would stay untranslated). */
  clearTicker(): void {
    this.ticker.innerHTML = '';
  }

  update(sim: Simulation | null, warp: number): void {
    if (!sim) {
      this.left.innerHTML = `<div class="big">${fmtTime(-10)}</div><div class="status">${t('hud.status.prelaunch')}</div>`;
      this.right.innerHTML = '';
      return;
    }
    const s = sim.state;
    const el = s.elements;
    const statusKey = `hud.status.${s.status}`;
    let phase = '';
    if (s.status === 'ascent' && s.ascentPhase) phase = t(`hud.phase.${s.ascentPhase}`);
    else if (s.status === 'coast' && s.nextBurnTime > s.t) phase = `${t('hud.nextBurn')} ${fmtTime(s.nextBurnTime - s.t).slice(2)}`;
    else if (s.status === 'burn' && s.currentBurn) phase = t(`tel.burn.${s.currentBurn.kind}`);
    let note = '';
    let noteCls = '';
    if (s.status === 'orbit' || s.status === 'failed') {
      const raw = t(`hud.note.${s.note}`);
      note = raw.startsWith('hud.note.') ? '' : raw;
      noteCls = s.status === 'failed' ? 'fail' : s.note === 'orbitOffTarget' ? 'warn' : '';
    }
    const stage = sim.vehicle.active;
    const stageName = stage ? `${stage.index + 1}/${sim.vehicle.stages.length} ${stage.spec.name}` : '—';
    this.left.innerHTML = `
      <div class="big">${fmtTime(s.t)}</div>
      <div class="status">${t(statusKey)}${phase ? ' · ' + phase : ''}</div>
      ${note ? `<div class="note ${noteCls}">${note}</div>` : ''}`;
    const km = t('u.km'), ms = t('u.ms');
    const apo = isFinite(el.apoapsisAlt) ? (el.apoapsisAlt / 1000).toFixed(0) : '∞';
    const dvLeft = (s.payloadSeparated ? sim.vehicle.spacecraftDeltaV() : sim.vehicle.deltaVRemaining()).toFixed(0);
    this.left.innerHTML += `
      <div class="hud-grid">
        <span class="k">${t('hud.stage')}</span><span class="v">${stageName}</span>
        <span class="k">${t('hud.throttle')}</span><span class="v">${(s.throttle * 100).toFixed(0)} %</span>
        <span class="k lo">${t('hud.thrust')}</span><span class="v lo">${(s.thrust / 1000).toFixed(0)} ${t('u.kN')}</span>
        <span class="k lo">${t('hud.mass')}</span><span class="v lo">${(s.mass / 1000).toFixed(1)} ${t('u.t')}</span>
        <span class="k">${t('hud.g')}</span><span class="v">${s.gLoad.toFixed(2)} g</span>
        <span class="k">${t('hud.pitch')}</span><span class="v">${s.pitchCmd.toFixed(1)}°</span>
        <span class="k lo">${t('hud.warp')}</span><span class="v lo">${warp}×</span>
      </div>
      <div class="hud-grid hud-compact">
        <span class="k">${t('hud.altitude')}</span><span class="v">${(s.altitude / 1000).toFixed(1)} ${km}</span>
        <span class="k">${t('hud.speed')}</span><span class="v">${s.speed.toFixed(0)} ${ms}</span>
        <span class="k">${t('hud.apoapsis')}</span><span class="v">${apo} ${km}</span>
        <span class="k">${t('hud.periapsis')}</span><span class="v">${(el.periapsisAlt / 1000).toFixed(0)} ${km}</span>
        <span class="k">${t('hud.dv')}</span><span class="v">${dvLeft} ${ms}</span>
      </div>`;
    this.right.innerHTML = `
      <div class="hud-grid">
        <span class="k">${t('hud.altitude')}</span><span class="v">${(s.altitude / 1000).toFixed(1)} ${km}</span>
        <span class="k">${t('hud.speed')}</span><span class="v">${s.speed.toFixed(0)} ${ms}</span>
        <span class="k">${t('hud.airspeed')}</span><span class="v">${s.airspeed.toFixed(0)} ${ms}</span>
        <span class="k">${t('hud.vertical')}</span><span class="v">${s.vz.toFixed(0)} ${ms}</span>
        <span class="k">${t('hud.q')}</span><span class="v">${(s.q / 1000).toFixed(1)} ${t('u.kPa')}</span>
        <span class="k">${t('hud.mach')}</span><span class="v">${s.altitude < 120e3 ? s.mach.toFixed(2) : '—'}</span>
        <span class="k">${t('hud.apoapsis')}</span><span class="v">${apo} ${km}</span>
        <span class="k">${t('hud.periapsis')}</span><span class="v">${(el.periapsisAlt / 1000).toFixed(0)} ${km}</span>
        <span class="k">${t('hud.inclination')}</span><span class="v">${(el.i * RAD).toFixed(2)}°</span>
        <span class="k">${t('hud.raan')}</span><span class="v">${(el.raan * RAD).toFixed(1)}°</span>
        <span class="k">${t('hud.period')}</span><span class="v">${isFinite(el.period) ? (el.period / 60).toFixed(1) + ' ' + t('u.min') : '—'}</span>
        <span class="k">${t('hud.dv')}</span><span class="v">${dvLeft} ${ms}</span>
        <span class="k">${t('hud.downrange')}</span><span class="v">${(s.downrange / 1000).toFixed(0)} ${km}</span>
        <span class="k">${t('hud.latlon')}</span><span class="v">${s.lat.toFixed(2)}° ${s.lon.toFixed(2)}°</span>
      </div>`;
    // ticker: new events
    while (this.shownEvents < sim.events.length) {
      const e = sim.events[this.shownEvents++];
      const d = document.createElement('div');
      d.className = e.severity;
      d.textContent = `${fmtTime(e.t)}  ${eventText(e)}`;
      this.ticker.appendChild(d);
      while (this.ticker.children.length > 5) this.ticker.removeChild(this.ticker.firstChild!);
      setTimeout(() => { if (d.parentNode) d.parentNode.removeChild(d); }, 14000);
    }
  }
}
