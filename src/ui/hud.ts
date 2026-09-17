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
 *
 * Wave 5 made the card's *size* a mode rather than a constant. The full grid is
 * 21 readouts and about 390 px of an exterior shot that is often only 640 px
 * wide — reported as "the telemetry window covers too much of the picture", and
 * measurably true: it sat over the vehicle at every mainstream laptop size. The
 * default is now a seven-row compact card small enough to stay clear of the
 * centre line, the full grid is one keystroke away (`H`, or the chip on the
 * card), and nothing is lost either way because the telemetry panel beside the
 * viewport always carries everything. The three-state cycle and its persistence
 * live in `./hudmode.ts`, away from the DOM, and are unit-tested there.
 */
import type { SimEvent } from '../physics/simulation';
import type { VisualFrame } from '../physics/frame';
import type { VehicleSpec } from '../types';
import { t } from '../i18n';
import { RAD } from '../physics/constants';
import { hasNextBurn } from './phase';
import { localizeEventParams, stageName } from './names';
import { coerceHudMode, loadHudMode, nextHudMode, saveHudMode, type HudMode, type ModeStore } from './hudmode';

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

/**
 * The compact card: six rows and a status line, in two columns.
 *
 * It is the primary set condensed rather than a different set — the apsides
 * share a row (`250 × 180 km`, which is how an orbit is spoken anyway) and so
 * do the active stage and its throttle, because those two are read together.
 * The labels are their own dictionary keys, not the full ones: "Вертикальная
 * скорость" is 21 characters and would decide the width of the whole card.
 */
const COMPACT_ROWS: ReadonlyArray<readonly [id: string, labelKey: string]> = [
  ['c.altitude', 'hud.shortAltitude'],
  ['c.speed', 'hud.shortSpeed'],
  ['c.vertical', 'hud.shortVertical'],
  ['c.apsides', 'hud.shortApsides'],
  ['c.stage', 'hud.shortStage'],
  ['c.dv', 'hud.shortDv'],
];

/** Dictionary key naming each mode, for the toggle's tooltip and a11y name. */
const MODE_LABEL: Record<HudMode, string> = {
  compact: 'hud.cardCompact',
  full: 'hud.cardFull',
  hidden: 'hud.cardHidden',
};

/** Keep in step with the phone breakpoint in `style.css`. */
const PHONE_QUERY = '(max-width: 860px)';

interface Row {
  key: HTMLElement;
  value: HTMLElement;
  /** dictionary key of the label, so the compact rows can carry short ones */
  labelKey: string;
  /** last string written, so an unchanged value writes nothing */
  shown: string;
}

/** `localStorage`, or null where it is blocked (a private window throws here). */
function safeStorage(): ModeStore | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

export class Hud {
  private root: HTMLElement;
  private ticker: HTMLElement;
  private box: HTMLElement;
  private toggle: HTMLButtonElement;
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
  private store: ModeStore | null = safeStorage();
  private phoneQuery: MediaQueryList | null = null;
  private modeState: HudMode = 'compact';

  constructor(root: HTMLElement, ticker: HTMLElement) {
    this.root = root;
    this.ticker = ticker;
    // One card, three grids: the compact six and the full set's two
    // four-column halves. All three are built once and the mode decides which
    // is displayed, so switching costs nothing and no readout has to be
    // re-created. The full set stayed two four-column grids rather than four
    // two-column ones because stacked two-column boxes needed about 370 px of
    // viewport height, which a 1280x800 laptop does not have once the narration
    // band has its share (the same failure mode as audit B31, one layer up).
    this.box = el('div', 'hud-box');
    this.status = el('span', 'status-main');
    this.replayTag = el('span', 'replay-tag');
    this.note = el('div', 'note hidden');
    const statusLine = el('div', 'status');
    statusLine.append(this.status, this.replayTag);
    const compact = el('div', 'hud-grid hud-compact');
    for (const [id, labelKey] of COMPACT_ROWS) compact.append(...this.row(id, labelKey));
    const primary = this.grid(PRIMARY_ROWS);
    primary.classList.add('hud-primary');
    const secondary = this.grid(SECONDARY_ROWS);
    secondary.classList.add('hud-secondary');
    this.box.append(statusLine, this.note, compact, primary, el('div', 'hud-sep'), secondary);
    // The chip is a sibling of the card, not a child: in `hidden` mode the card
    // goes and the chip is the only way back.
    this.toggle = el('button', 'hud-toggle');
    this.toggle.type = 'button';
    this.toggle.append(el('span', 'hud-toggle-glyph', '▤'));
    this.toggle.addEventListener('click', () => this.cycleMode());
    root.replaceChildren(this.toggle, this.box);
    this.watchWidth();
    this.modeState = loadHudMode(this.store, this.phone);
    this.applyMode();
    this.applyLabels();
  }

  /**
   * Are we at phone width? `full` is not offered there.
   *
   * Queried, never cached. A cached flag was wrong the first time it was tested:
   * the media query's `change` event does not always arrive when the viewport is
   * resized under emulation, and a stale `false` offered the 21-row grid on a
   * 375 px screen. `matches` is a live value and costs nothing to read.
   */
  private get phone(): boolean {
    return this.phoneQuery?.matches ?? false;
  }

  /**
   * Re-apply the mode when the breakpoint is crossed.
   *
   * The mode that was *stored* is re-read rather than the one on screen, so
   * widening the window again restores the user's real choice instead of
   * leaving them in the compact card they were forced into. `resize` backs the
   * media query up for the same reason the getter exists.
   */
  private watchWidth(): void {
    if (typeof window.matchMedia !== 'function') return;
    this.phoneQuery = window.matchMedia(PHONE_QUERY);
    const onChange = (): void => {
      // With site data blocked there is no stored preference to re-read; the
      // in-memory choice is the preference, so a resize must not reset it.
      const next = this.store ? loadHudMode(this.store, this.phone) : this.modeState;
      if (next === this.modeState && this.root.dataset.mode === coerceHudMode(next, this.phone)) return;
      this.modeState = next;
      this.applyMode();
    };
    if (typeof this.phoneQuery.addEventListener === 'function') this.phoneQuery.addEventListener('change', onChange);
    // `resize` fires continuously during a window drag; coalesce to one check per frame.
    let pending = 0;
    window.addEventListener('resize', () => {
      if (pending) return;
      pending = requestAnimationFrame(() => { pending = 0; onChange(); });
    });
  }

  /** The mode currently on screen. */
  get mode(): HudMode {
    return this.modeState;
  }

  /** compact → full → hidden → compact (no `full` at phone width). */
  cycleMode(): void {
    this.modeState = nextHudMode(this.modeState, this.phone);
    saveHudMode(this.store, this.modeState);
    this.applyMode();
  }

  private applyMode(): void {
    const mode = coerceHudMode(this.modeState, this.phone);
    this.root.dataset.mode = mode;
    const label = `${t('hud.card')}: ${t(MODE_LABEL[mode])} · H`;
    this.toggle.title = label;
    this.toggle.setAttribute('aria-label', label);
  }

  /** One label/value pair, registered under `id` and labelled from `labelKey`. */
  private row(id: string, labelKey: string): [HTMLElement, HTMLElement] {
    const key = el('span', 'k');
    const value = el('span', 'v');
    this.rows[id] = { key, value, labelKey, shown: '' };
    return [key, value];
  }

  private grid(keys: readonly string[]): HTMLElement {
    const g = el('div', 'hud-grid');
    for (const k of keys) g.append(...this.row(k, `hud.${k}`));
    return g;
  }

  /**
   * Blank the verdict line, in the DOM as well as in the "what is on screen"
   * cache.
   *
   * Clearing `shownNote` alone was a real defect twice over. `update` only
   * writes the element when the computed note differs from `shownNote`, so
   * after a reset both were `''` while the element still carried the previous
   * mission's text: a green "Target orbit achieved" sat over the *next*
   * vehicle from T-10 s onwards and survived the whole ascent, because the
   * branch that would have rewritten it never fired again. The same applied to
   * a language change: the note stayed in the language it was written in until
   * the computed note happened to change.
   */
  private clearNote(): void {
    this.note.textContent = '';
    this.note.className = 'note hidden';
    this.shownNote = '';
  }

  /** Re-label after a language change (values are rewritten on the next frame). */
  applyLabels(): void {
    for (const k of Object.keys(this.rows)) this.rows[k].key.textContent = t(this.rows[k].labelKey);
    this.applyMode(); // the toggle's tooltip and accessible name are translated too
    this.shownStatus = '';
    this.clearNote();
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
    this.clearNote();
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
    // The compact card. Written unconditionally: `set` compares against what is
    // on screen, so the rows that are not displayed cost one string compare
    // each at 10 Hz, and switching modes needs no refresh path.
    this.set('c.altitude', `${(frame.altitude / 1000).toFixed(1)} km`);
    this.set('c.speed', `${frame.speed.toFixed(0)} m/s`);
    this.set('c.vertical', `${frame.vz.toFixed(0)} m/s`);
    const apo = isFinite(elm.apoapsisAlt) ? (elm.apoapsisAlt / 1000).toFixed(0) : '∞';
    this.set('c.apsides', `${apo} × ${(elm.periapsisAlt / 1000).toFixed(0)} km`);
    // Same guard as the full grid's `stage` row: once the last launcher stage has
    // separated there is no active stage, and the card must say so rather than
    // keep naming the stage that just left.
    this.set('c.stage', active && stages
      ? `${frame.activeStageIndex + 1}/${stages.length} · ${(frame.throttle * 100).toFixed(0)} %`
      : '—');
    this.set('c.dv', `${frame.dvRemaining.toFixed(0)} m/s`);
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
