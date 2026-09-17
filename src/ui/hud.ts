/**
 * Head-up display.
 *
 * Frame-driven: `update` takes the `VisualFrame` the user is looking at — the
 * live head or a seeked, interpolated frame — and the recorded event log, and
 * never touches the live `Simulation`. That is what lets the HUD scrub: the
 * numbers and the event ticker rewind with the timeline cursor. The only
 * mission-static thing it needs is the vehicle spec, for stage names
 * (`setVehicle`).
 *
 * Two changes in the design wave, both behavioural rather than decorative:
 *
 * - The phase narration moved out of here into `src/ui/narration.ts`, where it
 *   gets the viewport's bottom band, the mission clock and the latest callout.
 *   The HUD is instrumentation again.
 * - The boxes are built once and only `textContent` is written afterwards
 *   (audit B38). The old code re-parsed ~35 elements of `innerHTML` at 10 Hz
 *   and made the dictionaries an executable surface: a stray `<` in a Thai or
 *   Russian string could break the layout.
 */
import type { SimEvent } from '../physics/simulation';
import type { VisualFrame } from '../physics/frame';
import type { VehicleSpec } from '../types';
import { t } from '../i18n';
import { RAD } from '../physics/constants';
import { hasNextBurn } from './phase';
import { localizeEventParams, stageName } from './names';

export function fmtTime(sec: number): string {
  const sign = sec < 0 ? '-' : '+';
  const a = Math.abs(sec);
  const h = Math.floor(a / 3600);
  const m = Math.floor((a % 3600) / 60);
  const s = Math.floor(a % 60);
  const p = (n: number) => String(n).padStart(2, '0');
  return `T${sign}${h > 0 ? h + ':' : ''}${p(m)}:${p(s)}`;
}

/** How long a callout stays on the ticker, in mission-time seconds. */
const TICKER_WINDOW = 14;
const TICKER_ROWS = 4;

/**
 * The readouts are split by **what has to survive a short viewport**, not by
 * subsystem.
 *
 * The first grid is the primary flight instrument set: where the vehicle is,
 * how fast it is going, what orbit that adds up to and how much Δv is left. It
 * is never hidden while the HUD is on screen. The second grid is detail —
 * engine numbers, the atmospheric readouts, the slow orbital elements — and is
 * the half that gives way when the viewport is short (see the `scenefill`
 * container queries in style.css).
 *
 * The previous split was propulsion / trajectory, which meant a 1280x800
 * laptop showed throttle, thrust and mass and hid altitude, speed, apoapsis,
 * periapsis and Δv: the primary instruments of a launch simulator.
 */
const PRIMARY_ROWS = ['altitude', 'speed', 'vertical', 'q', 'apoapsis', 'periapsis', 'inclination', 'dv', 'stage', 'throttle'] as const;
/** Secondary detail; the first thing to go when the viewport is short. */
const SECONDARY_ROWS = ['thrust', 'mass', 'g', 'pitch', 'airspeed', 'mach', 'raan', 'period', 'downrange', 'latlon', 'warp'] as const;

interface Row {
  key: HTMLElement;
  value: HTMLElement;
  /** last string written, so an unchanged value writes nothing */
  shown: string;
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

export class Hud {
  private ticker: HTMLElement;
  private box: HTMLElement;
  private status: HTMLElement;
  private replayTag: HTMLElement;
  private note: HTMLElement;
  private rows: Record<string, Row> = {};
  private vehicle: VehicleSpec | null = null;
  private shownStatus = '';
  private shownNote = '';
  /** index range of the events currently on the ticker, so the DOM is only rebuilt when it changes */
  private tickFrom = -1;
  private tickTo = -1;

  constructor(root: HTMLElement, ticker: HTMLElement) {
    this.ticker = ticker;
    // One box, two four-column grids. Two stacked two-column boxes needed about
    // 370 px of viewport height, which a 1280x800 laptop does not have once the
    // narration band has its share, so the trajectory readouts were simply cut
    // off (the same failure mode as audit B31, one layer up).
    this.box = el('div', 'hud-box');
    this.status = el('span', 'status-main');
    this.replayTag = el('span', 'replay-tag');
    this.note = el('div', 'note hidden');
    const statusLine = el('div', 'status');
    statusLine.append(this.status, this.replayTag);
    const secondary = this.grid(SECONDARY_ROWS);
    secondary.classList.add('hud-secondary');
    this.box.append(statusLine, this.note, this.grid(PRIMARY_ROWS), el('div', 'hud-sep'), secondary);
    root.replaceChildren(this.box);
    this.applyLabels();
  }

  private grid(keys: readonly string[]): HTMLElement {
    const g = el('div', 'hud-grid');
    for (const k of keys) {
      const key = el('span', 'k');
      const value = el('span', 'v');
      this.rows[k] = { key, value, shown: '' };
      g.append(key, value);
    }
    return g;
  }

  /** Re-label after a language change (values are rewritten on the next frame). */
  applyLabels(): void {
    for (const k of Object.keys(this.rows)) this.rows[k].key.textContent = t(`hud.${k}`);
    this.shownStatus = '';
    this.shownNote = '';
    this.tickFrom = -1;
    this.tickTo = -1;
  }

  /** Mission-static data the frames do not carry (stage names). */
  setVehicle(spec: VehicleSpec | null): void {
    this.vehicle = spec;
  }

  reset(): void {
    this.tickFrom = -1;
    this.tickTo = -1;
    this.ticker.replaceChildren();
    for (const k of Object.keys(this.rows)) { this.rows[k].value.textContent = '—'; this.rows[k].shown = '—'; }
    this.shownStatus = '';
    this.shownNote = '';
  }

  private set(key: string, value: string): void {
    const row = this.rows[key];
    if (!row || row.shown === value) return;
    row.shown = value;
    row.value.textContent = value;
  }

  update(frame: VisualFrame | null, events: SimEvent[], warp: number, replay = false): void {
    this.replayTag.textContent = replay ? t('ctl.replay') : '';
    if (!frame) {
      if (this.shownStatus !== 'prelaunch') {
        this.status.textContent = t('hud.status.prelaunch');
        this.shownStatus = 'prelaunch';
      }
      return;
    }
    const elm = frame.elements;
    let phase = '';
    if (frame.status === 'ascent' && frame.ascentPhase) phase = t(`hud.phase.${frame.ascentPhase}`);
    else if (frame.status === 'coast' && hasNextBurn(frame)) phase = `${t('hud.nextBurn')} ${fmtTime(frame.nextBurnTime - frame.t).slice(2)}`;
    const status = `${t(`hud.status.${frame.status}`)}${phase ? ' · ' + phase : ''}`;
    if (status !== this.shownStatus) { this.status.textContent = status; this.shownStatus = status; }
    let note = '';
    let noteCls = 'note';
    if (frame.status === 'orbit' || frame.status === 'failed') {
      note = t(`hud.note.${frame.note}`);
      noteCls = `note ${frame.status === 'failed' ? 'fail' : frame.note === 'orbitOffTarget' ? 'warn' : 'ok'}`;
    }
    if (note !== this.shownNote) {
      this.note.textContent = note;
      this.note.className = noteCls;
      this.note.classList.toggle('hidden', note === '');
      this.shownNote = note;
    }
    const stages = this.vehicle?.stages;
    const active = stages && frame.activeStageIndex < stages.length ? stages[frame.activeStageIndex] : null;
    this.set('stage', active && stages && this.vehicle ? `${frame.activeStageIndex + 1}/${stages.length} ${stageName(this.vehicle.id, active.id, active.name)}` : '—');
    this.set('throttle', `${(frame.throttle * 100).toFixed(0)} %`);
    this.set('thrust', `${(frame.thrust / 1000).toFixed(0)} kN`);
    this.set('mass', `${(frame.mass / 1000).toFixed(1)} t`);
    this.set('g', `${frame.gLoad.toFixed(2)} g`);
    this.set('pitch', `${frame.pitchCmd.toFixed(1)}°`);
    this.set('warp', `${warp}×`);
    this.set('altitude', `${(frame.altitude / 1000).toFixed(1)} km`);
    this.set('speed', `${frame.speed.toFixed(0)} m/s`);
    this.set('airspeed', `${frame.airspeed.toFixed(0)} m/s`);
    this.set('vertical', `${frame.vz.toFixed(0)} m/s`);
    this.set('q', `${(frame.q / 1000).toFixed(1)} kPa`);
    this.set('mach', frame.altitude < 120e3 ? frame.mach.toFixed(2) : '—');
    this.set('apoapsis', `${isFinite(elm.apoapsisAlt) ? (elm.apoapsisAlt / 1000).toFixed(0) : '∞'} km`);
    this.set('periapsis', `${(elm.periapsisAlt / 1000).toFixed(0)} km`);
    this.set('inclination', `${(elm.i * RAD).toFixed(2)}°`);
    this.set('raan', `${(elm.raan * RAD).toFixed(1)}°`);
    this.set('period', isFinite(elm.period) ? `${(elm.period / 60).toFixed(1)} min` : '—');
    this.set('dv', `${frame.dvRemaining.toFixed(0)} m/s`);
    this.set('downrange', `${(frame.downrange / 1000).toFixed(0)} km`);
    this.set('latlon', `${frame.lat.toFixed(2)}° ${frame.lon.toFixed(2)}°`);
    this.updateTicker(frame.t, events);
  }

  /**
   * Callouts for the displayed instant. The window is mission time, not wall
   * time: scrubbing back to T+150 s brings back the callouts that were on
   * screen at T+150 s, which a `setTimeout`-driven ticker could never do.
   */
  private updateTicker(now: number, events: SimEvent[]): void {
    let to = 0;
    while (to < events.length && events[to].t <= now + 1e-6) to++;
    let from = to;
    while (from > 0 && now - events[from - 1].t <= TICKER_WINDOW) from--;
    if (to - from > TICKER_ROWS) from = to - TICKER_ROWS;
    if (from === this.tickFrom && to === this.tickTo) return;
    this.tickFrom = from;
    this.tickTo = to;
    const rows: HTMLElement[] = [];
    for (let i = from; i < to; i++) {
      const e = events[i];
      const div = el('div', e.severity);
      div.append(el('span', 'tick-t', fmtTime(e.t)), document.createTextNode(t(e.key, localizeEventParams(this.vehicle, e.params))));
      rows.push(div);
    }
    this.ticker.replaceChildren(...rows);
  }
}
