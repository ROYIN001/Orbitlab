/**
 * The launch viewer: the scene, three numbers and one sentence.
 *
 * Everything technical is out of the way — no setup form, no telemetry panel,
 * no instrument card — and what is left is written for someone who has never
 * watched a launch: the mission clock, the height in kilometres, the speed in
 * km/h, and a plain-language caption of what the rocket is doing now
 * (ui/watch-logic.ts). Playback runs at an automatic pace unless the viewer
 * picks a speed, and the flight ends on a card that offers the next step:
 * watch again, pick another launch, or build a mission of their own.
 */
import { getLang, t } from '../i18n';
import type { VisualFrame } from '../physics/frame';
import type { VehicleSpec } from '../types';
import type { SimEvent } from '../physics/simulation';
import { vehicleById, vehicleDataId } from '../data/vehicles';
import { exhaustKind } from '../render/exhaust';
import { fmtTime } from './hud';
import { autoWarp, flightEnding, groundSpeed, watchBeat, WATCH_BEATS, type WatchBeat, type WatchEnding } from './watch-logic';
import { WATCH_MISSIONS, type WatchMissionId } from './watch-missions';

export interface WatchHost {
  /** load a viewer mission and launch it */
  start(id: WatchMissionId): void;
  togglePlay(): void;
  setWarp(warp: number): void;
  /** leave for the mission builder with the current mission loaded */
  explore(): void;
  /** point the camera at a stage flying home, or back at the rocket */
  follow(target: 'booster' | 'rocket'): void;
  /** V01: shown under the launches, the launch audio each one plays */
  pickerFooter?(): HTMLElement | null;
}

/** 'auto' or a fixed time warp */
export type WatchSpeed = 'auto' | number;
/** fixed speeds, all of them presets of the workspace's warp selector */
const SPEEDS: readonly WatchSpeed[] = ['auto', 1, 5, 25, 100];

interface UpdateState {
  /** the live flight is advancing */
  playing: boolean;
  /** the vehicle the frame belongs to (a custom one included, roadmap S02) */
  vehicle: VehicleSpec | null;
  /** a stage flown home is in the frame, and whether the camera is on it */
  follow?: { available: boolean; booster: boolean };
  /**
   * The stage the camera follows instead of the rocket: the height and speed
   * on screen are its own, or they would read 200 km and 27,000 km/h under a
   * landing.
   */
  subject?: { altitude: number; speed: number };
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined) node.textContent = text;
  return node;
}

function num(value: number, digits = 0): string {
  try {
    return value.toLocaleString(getLang(), { minimumFractionDigits: digits, maximumFractionDigits: digits });
  } catch {
    return value.toFixed(digits);
  }
}

/** Height for the big readout: a decimal while it is small enough to move visibly. */
function fmtAltitude(m: number): string {
  const km = Math.max(0, m) / 1000;
  return km < 100 ? num(km, 1) : num(km, 0);
}

/** "T+02:14" with a real minus sign for the count-down. */
function fmtClock(sec: number): string {
  return fmtTime(sec).replace('-', '−');
}

export class WatchView {
  private missionId: WatchMissionId | null = null;
  private speed: WatchSpeed = 'auto';
  private lastWarp = 0;
  /** the end card has been shown for this flight (it is not shown twice) */
  private ended = false;
  private beat: WatchBeat | null = null;
  private lastFrame: VisualFrame | null = null;
  /** the frame the end card was written for, so a language change rewrites the same card */
  private endFrame: { frame: VisualFrame; ending: WatchEnding } | null = null;
  private caption: HTMLElement;
  private beatLabel: HTMLElement;
  private beatText: HTMLElement;
  private clockValue: HTMLElement;
  private altValue: HTMLElement;
  private speedValue: HTMLElement;
  private statLabels: HTMLElement[] = [];
  private unitLabels: HTMLElement[] = [];
  private playBtn: HTMLButtonElement;
  private speedGroup: HTMLElement;
  private missionsBtn: HTMLButtonElement;
  private followBtn: HTMLButtonElement;
  private picker: HTMLElement;
  private endCard: HTMLElement;
  private shown = { label: '', text: '', clock: '', alt: '', speed: '', playing: false, follow: '' };

  constructor(private root: HTMLElement, private host: WatchHost) {
    root.classList.add('watch-ui');
    this.caption = el('div', 'watch-caption');
    this.caption.setAttribute('aria-live', 'polite');
    this.beatLabel = el('span', 'eyebrow watch-beat');
    this.beatText = el('p', 'watch-say');
    this.caption.append(this.beatLabel, this.beatText);

    const stats = el('div', 'watch-stats');
    this.clockValue = el('span', 'watch-num');
    this.altValue = el('span', 'watch-num');
    this.speedValue = el('span', 'watch-num');
    for (const [value, unit] of [[this.clockValue, false], [this.altValue, true], [this.speedValue, true]] as const) {
      const stat = el('div', 'watch-stat');
      const label = el('small');
      this.statLabels.push(label);
      const strong = el('strong');
      strong.append(value);
      if (unit) {
        const u = el('em');
        this.unitLabels.push(u);
        strong.append(u);
      }
      stat.append(label, strong);
      stats.append(stat);
    }

    this.playBtn = el('button', 'watch-play');
    this.playBtn.type = 'button';
    this.playBtn.addEventListener('click', () => this.host.togglePlay());
    this.speedGroup = el('div', 'watch-speeds');
    this.speedGroup.setAttribute('role', 'group');
    for (const speed of SPEEDS) {
      const b = el('button', 'watch-speed');
      b.type = 'button';
      b.dataset.speed = String(speed);
      b.addEventListener('click', () => this.setSpeed(speed));
      this.speedGroup.append(b);
    }
    this.missionsBtn = el('button', 'watch-missions-btn');
    this.missionsBtn.type = 'button';
    this.missionsBtn.addEventListener('click', () => this.openPicker());
    // Shown while a stage is flying home: the camera goes to it on its own for
    // the landing, and this takes it there (or back) whenever the viewer likes.
    this.followBtn = el('button', 'watch-follow-btn');
    this.followBtn.type = 'button';
    this.followBtn.hidden = true;
    this.followBtn.addEventListener('click', () => this.host.follow(this.followBtn.dataset.target === 'booster' ? 'booster' : 'rocket'));
    const controls = el('div', 'watch-controls');
    controls.append(this.playBtn, this.speedGroup, this.followBtn, this.missionsBtn);

    const bar = el('div', 'watch-bar');
    bar.append(stats, controls);
    const bottom = el('div', 'watch-bottom');
    bottom.append(this.caption, bar);

    this.picker = el('section', 'watch-card watch-picker');
    this.picker.hidden = true;
    this.picker.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.stopPropagation(); this.closePicker(); } });
    this.endCard = el('section', 'watch-card watch-end');
    this.endCard.hidden = true;
    root.replaceChildren(bottom, this.picker, this.endCard);
    this.applyLanguage();
  }

  /**
   * A new flight was loaded and launched from the viewer. It starts at the
   * automatic pace: a speed picked for the last flight's coast would skip this
   * one's liftoff.
   */
  begin(id: WatchMissionId): void {
    this.reset();
    this.missionId = id;
    this.speed = 'auto';
    this.syncSpeedButtons();
    this.closePicker();
  }

  /**
   * Forget the flight on screen: a new one is on the pad. Whatever put it there
   * — the viewer's own list, or the mission builder — `begin` is what names it
   * as a viewer launch, so "watch again" never replays a different flight.
   */
  reset(): void {
    this.missionId = null;
    this.ended = false;
    this.endFrame = null;
    this.beat = null;
    this.lastWarp = 0;
    this.endCard.hidden = true;
    this.shown.label = '';
  }

  /** The viewer was opened with nothing flying: offer the launches. */
  enter(idle: boolean): void {
    this.lastWarp = 0;
    if (idle) this.openPicker();
  }

  openPicker(): void {
    this.renderPicker();
    this.endCard.hidden = true;
    this.picker.hidden = false;
    this.root.classList.add('picking');
    this.picker.querySelector<HTMLElement>('.watch-mission')?.focus({ preventScroll: true });
  }

  closePicker(): void {
    this.picker.hidden = true;
    this.root.classList.remove('picking');
  }

  private setSpeed(speed: WatchSpeed): void {
    this.speed = speed;
    this.lastWarp = 0;
    if (speed !== 'auto') this.host.setWarp(speed);
    else if (this.beat) this.applyAutoWarp();
    this.syncSpeedButtons();
  }

  private syncSpeedButtons(): void {
    for (const b of this.speedGroup.querySelectorAll<HTMLButtonElement>('.watch-speed')) {
      const on = b.dataset.speed === String(this.speed);
      b.classList.toggle('active', on);
      b.setAttribute('aria-pressed', String(on));
    }
  }

  private applyAutoWarp(): void {
    const w = autoWarp(this.lastFrame, this.beat ?? 'countdown');
    if (w !== this.lastWarp) {
      this.lastWarp = w;
      this.host.setWarp(w);
    }
  }

  /** V03: whether a vehicle's strap-ons are solid motors (cached by spec). */
  private solidBoosters(spec: VehicleSpec | null): boolean {
    if (this.solidFor?.spec !== spec) {
      this.solidFor = { spec, solid: !!spec?.stages.some((st) => (st.boosters ?? []).some((b) => exhaustKind(b) === 'solid')) };
    }
    return this.solidFor.solid;
  }
  private solidFor?: { spec: VehicleSpec | null; solid: boolean };

  /** Called at the HUD's 10 Hz with the frame on screen. */
  update(frame: VisualFrame | null, events: readonly SimEvent[], state: UpdateState): void {
    this.lastFrame = frame;
    // Four strap-ons leaving together is the Soyuz "Korolev cross".
    const cross = !!state.vehicle && vehicleDataId(state.vehicle).startsWith('soyuz');
    const beat = watchBeat(frame, events, cross, this.solidBoosters(state.vehicle));
    this.beat = beat;
    const copy = WATCH_BEATS[beat];
    const label = t(copy.label);
    const text = t(copy.text);
    if (label !== this.shown.label || text !== this.shown.text) {
      this.beatLabel.textContent = label;
      this.beatText.textContent = text;
      this.shown.label = label;
      this.shown.text = text;
      this.caption.dataset.beat = beat;
    }
    const clock = frame ? fmtClock(frame.t) : fmtClock(-10);
    // above the ground, so the pad reads 0 rather than the site's elevation
    const subject = state.subject;
    const alt = subject ? fmtAltitude(subject.altitude) : frame ? fmtAltitude(frame.altitudeAGL) : fmtAltitude(0);
    // a pad abort never lifts off, but its crew does (T-10-1)
    const moving = !!frame && (frame.liftoff || !!frame.abort);
    const speed = subject ? num(subject.speed * 3.6) : frame ? num(moving ? groundSpeed(frame) * 3.6 : 0) : num(0);
    if (clock !== this.shown.clock) { this.clockValue.textContent = clock; this.shown.clock = clock; }
    if (alt !== this.shown.alt) { this.altValue.textContent = alt; this.shown.alt = alt; }
    if (speed !== this.shown.speed) { this.speedValue.textContent = speed; this.shown.speed = speed; }
    if (state.playing !== this.shown.playing) this.syncPlay(state.playing);
    this.syncFollow(state.follow);
    if (this.speed === 'auto' && state.playing) this.applyAutoWarp();
    if (!this.ended && frame) {
      const ending = flightEnding(frame, events);
      if (ending) { this.ended = true; this.showEnd(frame, ending); }
    }
  }

  private syncFollow(follow: UpdateState['follow']): void {
    const key = !follow || (!follow.available && !follow.booster) ? '' : follow.booster ? 'rocket' : 'booster';
    if (key === this.shown.follow) return;
    this.shown.follow = key;
    this.followBtn.hidden = !key;
    this.followBtn.dataset.target = key;
    if (key) this.followBtn.textContent = t(key === 'booster' ? 'watch.follow.booster' : 'watch.follow.rocket');
  }

  private syncPlay(playing: boolean): void {
    this.shown.playing = playing;
    this.playBtn.textContent = playing ? '❚❚' : '▶';
    const title = t(playing ? 'ctl.pause' : 'ctl.play');
    this.playBtn.title = title;
    this.playBtn.setAttribute('aria-label', title);
  }

  private showEnd(frame: VisualFrame, ending: WatchEnding): void {
    const success = ending !== 'failed';
    this.endFrame = { frame, ending };
    if (!this.picker.hidden) return;
    const card = this.endCard;
    card.replaceChildren();
    card.classList.toggle('failed', !success);
    const title = el('h2', undefined, t(ending === 'orbit' ? 'watch.end.title' : ending === 'splashdown' ? 'watch.end.splashTitle'
      : ending === 'crewSafe' ? 'watch.end.crewSafeTitle' : ending === 'docked' ? 'watch.end.dockedTitle' : 'watch.fail.title'));
    title.id = 'watch-end-title';
    card.setAttribute('aria-labelledby', title.id);
    card.append(el('span', 'eyebrow', t(ending === 'crewSafe' ? 'watch.end.crewSafeEyebrow' : success ? 'watch.end.eyebrow' : 'watch.fail.eyebrow')), title);
    if (ending === 'crewSafe') {
      // G06: the rocket was lost, the crew was not
      const since = frame.t - (frame.abort?.t0 ?? frame.t);
      card.append(el('p', undefined, t('watch.end.crewSafeText', {
        km: num(frame.downrange / 1000), g: num(frame.abort?.maxG ?? 0), time: fmtClock(since).replace(/^T\+/, ''),
      })));
    } else if (ending === 'docked') {
      // G07: at the station
      const rv = frame.rendezvous!;
      const since = (rv.contact?.t ?? frame.t) - Math.max(0, frame.liftoffT ?? 0);
      card.append(el('p', undefined, t('watch.end.dockedText', {
        port: t(`rv.port.${rv.port}`), time: fmtClock(since).replace(/^T\+/, ''), burns: num(rv.burns.length),
      })));
      card.append(el('p', 'watch-end-fact', t('watch.end.dockedFact')));
    } else if (ending === 'splashdown') {
      const since = frame.t - Math.max(0, frame.liftoffT ?? 0);
      card.append(el('p', undefined, t('watch.end.splashText', { time: fmtClock(since).replace(/^T\+/, '') })));
    } else if (success) {
      const since = frame.t - Math.max(0, frame.liftoffT ?? 0);
      const period = frame.elements.period;
      card.append(el('p', undefined, t('watch.end.text', {
        time: fmtClock(since).replace(/^T\+/, ''),
        alt: num(Math.max(0, frame.altitudeAGL) / 1000),
        speed: num(groundSpeed(frame) * 3.6),
      })));
      if (isFinite(period) && period > 0) card.append(el('p', 'watch-end-fact', t('watch.end.fact', { min: num(period / 60) })));
    } else {
      card.append(el('p', undefined, t('watch.fail.text', { time: fmtClock(frame.t) })));
    }
    const actions = el('div', 'watch-end-actions');
    const button = (key: string, cls: string, action: () => void): void => {
      const b = el('button', cls, t(key));
      b.type = 'button';
      b.addEventListener('click', action);
      actions.append(b);
    };
    if (success) button('watch.end.continue', 'watch-btn primary', () => { card.hidden = true; });
    const id = this.missionId;
    if (id) button('watch.end.again', 'watch-btn', () => this.host.start(id));
    button('watch.end.other', 'watch-btn', () => this.openPicker());
    button('watch.end.explore', 'watch-btn link', () => this.host.explore());
    card.append(actions);
    card.hidden = false;
  }

  private renderPicker(): void {
    const card = this.picker;
    const head = el('div', 'watch-card-head');
    const title = el('h2', undefined, t('watch.pick.title'));
    title.id = 'watch-pick-title';
    card.setAttribute('aria-labelledby', title.id);
    const close = el('button', 'watch-close', '×');
    close.type = 'button';
    close.setAttribute('aria-label', t('watch.pick.close'));
    close.title = t('watch.pick.close');
    close.addEventListener('click', () => this.closePicker());
    head.append(title, close);
    const grid = el('div', 'watch-mission-grid');
    for (const m of WATCH_MISSIONS) {
      const b = el('button', 'watch-mission');
      b.type = 'button';
      b.dataset.mission = m.id;
      if (m.id === this.missionId) b.classList.add('current');
      const spec = vehicleById(m.vehicleId);
      b.append(el('span', 'watch-mission-vehicle', `${spec.name} · ${spec.country}`), el('strong', undefined, t(m.titleKey)), el('span', 'watch-mission-blurb', t(m.blurbKey)));
      b.addEventListener('click', () => this.host.start(m.id));
      grid.append(b);
    }
    card.replaceChildren(head, el('p', 'watch-pick-lead', t('watch.pick.lead')), grid);
    const footer = this.host.pickerFooter?.();
    if (footer) card.append(footer);
  }

  applyLanguage(): void {
    const labels = ['watch.stat.time', 'watch.stat.altitude', 'watch.stat.speed'];
    this.statLabels.forEach((node, i) => { node.textContent = t(labels[i]); });
    const units = ['u.km', 'watch.unit.kmh'];
    this.unitLabels.forEach((node, i) => { node.textContent = ` ${t(units[i])}`; });
    this.speedGroup.setAttribute('aria-label', t('watch.speed'));
    for (const b of this.speedGroup.querySelectorAll<HTMLButtonElement>('.watch-speed')) {
      b.textContent = b.dataset.speed === 'auto' ? t('watch.speed.auto') : `${b.dataset.speed}×`;
      if (b.dataset.speed === 'auto') b.title = t('watch.speed.autoTitle');
    }
    this.syncSpeedButtons();
    this.missionsBtn.textContent = t('watch.missions');
    this.syncPlay(this.shown.playing);
    // numbers are re-formatted in the new locale on the next update
    this.shown = { ...this.shown, label: '', text: '', clock: '', alt: '', speed: '', follow: '' };
    if (!this.picker.hidden) this.renderPicker();
    if (!this.endCard.hidden && this.endFrame) this.showEnd(this.endFrame.frame, this.endFrame.ending);
  }
}
