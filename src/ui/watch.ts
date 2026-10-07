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
import { autoWarp, flightEnding, groundSpeed, parkingMilestone, vostokLandings, watchBeat, watchReadout, watchSummary, WATCH_BEATS, type WatchBeat, type WatchEnding, type WatchSummary } from './watch-logic';
import { WATCH_MISSIONS, historicalDate, isHistorical, watchMissionById, type WatchMissionId } from './watch-missions';
import { FLOWN_LABEL, recentFlown } from './flown';
import { flownTable, fmtMissionTime } from './flown-view';
import { satelliteNameById, stageNameByLabel } from './names';

export interface WatchHost {
  /** load a viewer mission and launch it */
  start(id: WatchMissionId): void;
  togglePlay(): void;
  setWarp(warp: number): void;
  /** leave for the mission builder with the current mission loaded */
  explore(): void;
  /** R3.5: Explore on a copy of this launch to change, the launch here kept as it is */
  tryCopy?(id: WatchMissionId): void;
  /** S03: hand the orbit reached on to the Orbit section */
  continueInOrbit?(): void;
  /** point the camera at a stage flying home, or back at the rocket; C01: at Vostok-1's pilot, or back at the capsule */
  follow(target: FollowTarget): void;
  /** V01: shown under the launches, the launch audio each one plays */
  pickerFooter?(): HTMLElement | null;
}

/** What the follow button points the camera at. */
export type FollowTarget = 'booster' | 'rocket' | 'crew' | 'capsule';
/** The button's label for each target. */
const FOLLOW_LABEL: Record<FollowTarget, string> = {
  booster: 'watch.follow.booster', rocket: 'watch.follow.rocket', crew: 'watch.follow.pilot', capsule: 'watch.follow.capsule',
};

/** 'auto' or a fixed time warp */
export type WatchSpeed = 'auto' | number;
/** fixed speeds, all of them presets of the workspace's warp selector */
const SPEEDS: readonly WatchSpeed[] = ['auto', 1, 5, 25, 100];
/** How long the parking-orbit note stays up on its own, ms of real time (A9). */
const MILESTONE_MS = 12_000;
/** A parking orbit left within this many seconds is not worth a note: Falcon Heavy's lights again a second later, s. */
const MILESTONE_LEAD = 20;

interface UpdateState {
  /** the live flight is advancing */
  playing: boolean;
  /** the vehicle the frame belongs to (a custom one included, roadmap S02) */
  vehicle: VehicleSpec | null;
  /**
   * a stage flown home is in the frame, and whether the camera is on it; C01:
   * with `crew`, what can be followed is Vostok-1's pilot on his own, and
   * `booster` says the camera is on him rather than on the capsule
   */
  follow?: { available: boolean; booster: boolean; crew?: boolean };
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

/** A span of time, "45:52", for a sentence. */
function fmtSpan(sec: number): string {
  return fmtClock(Math.max(0, sec)).replace(/^T\+/, '');
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
  private endFrame: { frame: VisualFrame; ending: WatchEnding; summary: WatchSummary } | null = null;
  /** the vehicle on screen, for the names of the stages it flew home */
  private vehicle: VehicleSpec | null = null;
  /** the flight was paused under its end card, so "keep watching" plays it on */
  private pausedAtEnd = false;
  /**
   * A9: the parking-orbit note. It is shown once a flight, over the top of the
   * scene rather than across it, and goes by itself, when closed, or when the
   * next burn lights.
   */
  private milestone: HTMLElement;
  private milestoneText: HTMLElement;
  private milestoneEyebrow: HTMLElement;
  private milestoneClose: HTMLButtonElement;
  private milestoneShown = false;
  private milestoneTimer: ReturnType<typeof setTimeout> | null = null;
  private caption: HTMLElement;
  private beatLabel: HTMLElement;
  private beatText: HTMLElement;
  /** C01: what the real flight did at the moment just passed */
  private realLine: HTMLElement;
  /** D-11 (M-ORBIT-029): while the Moon is drawn, how far it is modelled — Apollo 11's week only */
  private moonNote: HTMLElement;
  private realShown = '';
  private lastEvents: readonly SimEvent[] = [];
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
    this.realLine = el('p', 'watch-real');
    this.realLine.hidden = true;
    this.caption.append(this.beatLabel, this.beatText, this.realLine);
    // outside the caption's live region: a standing label, not news; styled here (the CSS is at its budget)
    this.moonNote = el('p', 'watch-moon');
    this.moonNote.hidden = true;
    Object.assign(this.moonNote.style, { margin: '-8px 0 0', fontSize: '12.5px', color: '#9fb3c4', textShadow: '0 1px 10px rgba(0, 0, 0, 0.7)' });

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
    this.followBtn.addEventListener('click', () => {
      const target = this.followBtn.dataset.target;
      this.host.follow(target === 'booster' || target === 'crew' || target === 'capsule' ? target : 'rocket');
    });
    const controls = el('div', 'watch-controls');
    controls.append(this.playBtn, this.speedGroup, this.followBtn, this.missionsBtn);

    const bar = el('div', 'watch-bar');
    bar.append(stats, controls);
    const bottom = el('div', 'watch-bottom');
    bottom.append(this.caption, this.moonNote, bar);

    this.picker = el('section', 'watch-card watch-picker');
    this.picker.hidden = true;
    this.picker.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.stopPropagation(); this.closePicker(); } });
    this.endCard = el('section', 'watch-card watch-end');
    this.endCard.hidden = true;
    // A9: the card styles belong to src/ui/modes.css, which is not this
    // change's to edit; the note borrows the cards' look and sits at the top.
    this.milestone = el('section', 'watch-card watch-milestone');
    this.milestone.hidden = true;
    this.milestone.setAttribute('role', 'status');
    Object.assign(this.milestone.style, { top: '16px', transform: 'translateX(-50%)', width: 'min(460px, calc(100% - 32px))', padding: '12px 14px 14px' });
    const milestoneHead = el('div', 'watch-card-head');
    this.milestoneEyebrow = el('span', 'eyebrow');
    this.milestoneClose = el('button', 'watch-close', '×');
    this.milestoneClose.type = 'button';
    this.milestoneClose.addEventListener('click', () => this.hideMilestone());
    milestoneHead.append(this.milestoneEyebrow, this.milestoneClose);
    this.milestoneText = el('p');
    Object.assign(this.milestoneText.style, { margin: '2px 0 0', fontSize: '14.5px', lineHeight: '1.5', color: '#c8d6e2' });
    this.milestone.append(milestoneHead, this.milestoneText);
    root.replaceChildren(bottom, this.picker, this.endCard, this.milestone);
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
    this.pausedAtEnd = false;
    this.beat = null;
    this.lastWarp = 0;
    this.endCard.hidden = true;
    this.hideMilestone();
    this.milestoneShown = false;
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
    this.hideMilestone();
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
    const w = autoWarp(this.lastFrame, this.beat ?? 'countdown', this.lastEvents);
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
    this.vehicle = state.vehicle;
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
    this.lastEvents = events;
    // C01: a historical flight says when the real one did what was just seen
    const flown = this.missionId ? watchMissionById(this.missionId)?.flown : undefined;
    const row = flown && frame ? recentFlown(flown, events, frame.t) : null;
    const real = row ? t('watch.real', { event: t(FLOWN_LABEL[row.key]), real: `${row.approx ? '≈ ' : ''}${fmtMissionTime(row.real)}`, model: fmtMissionTime(row.sim!) }) : '';
    if (real !== this.realShown) {
      this.realShown = real;
      this.realLine.textContent = real;
      this.realLine.hidden = !real;
    }
    // the Moon is drawn exactly while the frame carries Apollo's state (main.ts, scene.setMoon)
    const moonDrawn = !!frame?.apollo;
    if (moonDrawn === this.moonNote.hidden) this.moonNote.hidden = !moonDrawn;
    const clock = frame ? fmtClock(frame.t) : fmtClock(-10);
    // above the ground, so the pad reads 0 rather than the site's elevation
    const subject = state.subject;
    const readout = frame ? watchReadout(frame) : null;
    // C01: at the Moon, the readouts are the Moon's — and its last kilometre in metres, as the call-outs gave it
    const moon = !subject && !!readout?.moon;
    const metres = moon && readout!.altitude < 1000;
    const alt = subject ? fmtAltitude(subject.altitude) : metres ? num(Math.max(0, readout!.altitude))
      : readout ? fmtAltitude(readout.altitude) : fmtAltitude(0);
    // a pad abort never lifts off, but its crew does (T-10-1)
    const moving = !!frame && (frame.liftoff || !!frame.abort);
    const speed = subject ? num(subject.speed * 3.6) : readout ? num(moving ? readout.speed * 3.6 : 0) : num(0);
    if (moon !== this.readoutMoon) { this.readoutMoon = moon; this.applyStatLabels(); }
    if (metres !== this.readoutMetres) { this.readoutMetres = metres; this.applyUnits(); }
    if (clock !== this.shown.clock) { this.clockValue.textContent = clock; this.shown.clock = clock; }
    if (alt !== this.shown.alt) { this.altValue.textContent = alt; this.shown.alt = alt; }
    if (speed !== this.shown.speed) { this.speedValue.textContent = speed; this.shown.speed = speed; }
    if (state.playing !== this.shown.playing) this.syncPlay(state.playing);
    this.syncFollow(state.follow);
    if (this.speed === 'auto' && state.playing) this.applyAutoWarp();
    this.syncMilestone(frame, events);
    if (!this.ended && frame) {
      const ending = flightEnding(frame, events);
      if (ending) {
        this.ended = true;
        this.hideMilestone();
        this.showEnd(frame, ending, watchSummary(frame, events));
        // A9: the flight stops under its card rather than running on behind it
        if (!this.endCard.hidden && state.playing) { this.pausedAtEnd = true; this.host.togglePlay(); }
      }
    }
  }

  /**
   * A9: a parking orbit is a milestone, not the end: say so, with the orbit
   * and the time to the burn that leaves it, and count that time down.
   */
  private syncMilestone(frame: VisualFrame | null, events: readonly SimEvent[]): void {
    const m = this.ended ? null : parkingMilestone(frame, events);
    if (!m) { this.hideMilestone(); return; }
    if (this.milestone.hidden) {
      if (this.milestoneShown || !this.picker.hidden || m.tgo < MILESTONE_LEAD) return;
      this.milestoneShown = true;
      this.milestone.hidden = false;
      this.milestoneTimer = setTimeout(() => this.hideMilestone(), MILESTONE_MS);
    }
    const text = t('watch.parking.text', { pe: num(m.pe), ap: num(m.ap), tgo: fmtSpan(m.tgo) });
    if (this.milestoneText.textContent !== text) this.milestoneText.textContent = text;
  }

  private hideMilestone(): void {
    if (this.milestoneTimer !== null) { clearTimeout(this.milestoneTimer); this.milestoneTimer = null; }
    this.milestone.hidden = true;
  }

  /** The follow button offers the other subject: the stage or the rocket; Vostok-1's pilot or the capsule (C01). */
  private syncFollow(follow: UpdateState['follow']): void {
    const key: FollowTarget | '' = !follow || (!follow.available && !follow.booster) ? ''
      : follow.crew ? (follow.booster ? 'capsule' : 'crew')
      : follow.booster ? 'rocket' : 'booster';
    if (key === this.shown.follow) return;
    this.shown.follow = key;
    this.followBtn.hidden = !key;
    this.followBtn.dataset.target = key;
    if (key) this.followBtn.textContent = t(FOLLOW_LABEL[key]);
  }

  private syncPlay(playing: boolean): void {
    this.shown.playing = playing;
    this.playBtn.textContent = playing ? '❚❚' : '▶';
    const title = t(playing ? 'ctl.pause' : 'ctl.play');
    this.playBtn.title = title;
    this.playBtn.setAttribute('aria-label', title);
  }

  private showEnd(frame: VisualFrame, ending: WatchEnding, summary: WatchSummary): void {
    const success = ending !== 'failed';
    this.endFrame = { frame, ending, summary };
    if (!this.picker.hidden) return;
    const card = this.endCard;
    card.replaceChildren();
    card.classList.toggle('failed', !success);
    const title = el('h2', undefined, t(ending === 'orbit' ? 'watch.end.title' : ending === 'splashdown' ? (frame.apollo ? 'watch.end.apolloSplashTitle' : frame.abort?.capsule === 'vostok' ? 'watch.end.vostokLandingTitle' : 'watch.end.splashTitle')
      : ending === 'crewSafe' ? 'watch.end.crewSafeTitle' : ending === 'docked' ? 'watch.end.dockedTitle'
      : 'watch.fail.title'));
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
      for (const line of this.summaryLines(summary, frame, false)) card.append(el('p', 'watch-end-fact', line));
    } else if (ending === 'splashdown' && frame.apollo) {
      // C01: Apollo 11 home, the whole flight in a paragraph
      const ap = frame.apollo, l = ap.landed, at = (key: string) => this.lastEvents.find((e) => e.key === key)?.t ?? frame.t;
      const clock = (x: number) => fmtClock(x).replace(/^T\+/, '');
      const sp = ap.splash ?? { lat: 0, lon: 0, t: frame.t };
      card.append(el('p', undefined, t('watch.end.apolloSplashText', {
        time: clock(sp.t), lat: Math.abs(sp.lat).toFixed(2), lon: Math.abs(sp.lon).toFixed(2), landed: clock(l?.t ?? 0), miss: num(Math.round(l?.miss ?? 0)),
        docked: clock(at('evt.lmDocked')), g: (ap.entry?.maxLoad ?? 0).toFixed(1), mass: num(Math.round(frame.mass)),
      })));
      card.append(el('p', 'watch-end-fact', t('watch.end.apolloSplashFact')));
    } else if (ending === 'splashdown' && frame.abort?.kind === 'return' && frame.abort.capsule === 'vostok') {
      this.vostokEnd(card, frame);
    } else if (ending === 'splashdown') {
      // C01: timed at the splashdown itself, not at the card, which waits for the moment to be seen
      const down = [...this.lastEvents].reverse().find((e) => e.key === 'evt.capsuleSplashdown' || e.key === 'evt.capsuleLanding' || e.key === 'evt.shipSplashdown');
      const since = (down?.t ?? frame.t) - Math.max(0, frame.liftoffT ?? 0);
      // C01: a capsule, not a ship
      card.append(el('p', undefined, frame.abort?.kind === 'return'
        ? t('watch.end.capsuleSplashText', { time: fmtClock(since).replace(/^T\+/, ''), km: num(frame.downrange / 1000), g: num(frame.abort.maxG) })
        : t('watch.end.splashText', { time: fmtClock(since).replace(/^T\+/, '') })));
    } else if (success) {
      // A9: the time to the final orbit, not to the card
      const since = (summary.orbit?.at ?? frame.t) - Math.max(0, frame.liftoffT ?? 0);
      const period = frame.elements.period;
      card.append(el('p', undefined, t('watch.end.text', {
        time: fmtClock(since).replace(/^T\+/, ''),
        alt: num(Math.max(0, frame.altitudeAGL) / 1000),
        speed: num(groundSpeed(frame) * 3.6),
      })));
      for (const line of this.summaryLines(summary, frame, true)) card.append(el('p', 'watch-end-fact', line));
      if (isFinite(period) && period > 0) card.append(el('p', 'watch-end-fact', t('watch.end.fact', { min: num(period / 60) })));
    } else {
      card.append(el('p', undefined, t('watch.fail.text', { time: fmtClock(frame.t) })));
    }
    // C01: the real flight beside this one
    const flown = this.missionId ? watchMissionById(this.missionId)?.flown : undefined;
    if (flown) card.append(flownTable(flown, this.lastEvents));
    const actions = el('div', 'watch-end-actions');
    const button = (key: string, cls: string, action: () => void): void => {
      const b = el('button', cls, t(key));
      b.type = 'button';
      b.addEventListener('click', action);
      actions.append(b);
    };
    if (success) button('watch.end.continue', 'watch-btn primary', () => {
      card.hidden = true;
      if (this.pausedAtEnd && !this.shown.playing) this.host.togglePlay();
      this.pausedAtEnd = false;
    });
    const id = this.missionId;
    if (id) button('watch.end.again', 'watch-btn', () => this.host.start(id));
    button('watch.end.other', 'watch-btn', () => this.openPicker());
    // S03: an orbit reached, or the station's, can be carried on in the Orbit section
    if ((ending === 'orbit' || ending === 'docked') && this.host.continueInOrbit) button('handoff.continue', 'watch-btn', () => this.host.continueInOrbit?.());
    if (id && this.host.tryCopy) button('watch.end.copy', 'watch-btn', () => this.host.tryCopy?.(id));
    button('watch.end.explore', 'watch-btn link', () => this.host.explore());
    card.append(actions);
    card.hidden = false;
  }

  /**
   * C01: Vostok-1 home, the sphere and Gagarin each on their own: when and
   * where each came down and how far apart, timed at the landings, not at the
   * card. Then the real flight's: the sphere at 10:48 Moscow time (OKB-1's
   * preliminary report of 3 May 1961), Gagarin at 10:55 by the official
   * account, the 108 minutes (10:53 in the report), at 51°16′14″ N 45°59′50″ E
   * near Smelovka — Gagarin's place, where his monument stands, not the
   * sphere's — about 1.5 km from the sphere (OKB-1's preliminary report),
   * "about 4 km" by Gagarin's own post-flight report (as Pervushin prints
   * it). The narration tells those as 1961's; the model's own times, places
   * and distance are the card's first paragraph.
   */
  private vostokEnd(card: HTMLElement, frame: VisualFrame): void {
    const liftoff = Math.max(0, frame.liftoffT ?? 0);
    const { sphere, pilot } = vostokLandings(frame, this.lastEvents);
    const at = { time: fmtSpan(sphere.t - liftoff), lat: num(sphere.lat, 2), lon: num(sphere.lon, 2), g: num(frame.abort?.maxG ?? 0, 1) };
    card.append(el('p', undefined, pilot
      ? t('watch.end.vostokLandingText', {
        ...at, pilotTime: fmtSpan(pilot.t - liftoff), plat: num(pilot.lat, 2), plon: num(pilot.lon, 2),
        km: pilot.km !== null ? num(pilot.km, pilot.km < 1 ? 2 : 1) : '—',
      })
      // a recording made before Gagarin flew on his own: the sphere alone
      : t('watch.end.vostokSphereText', at)));
    if (this.missionId === 'vostok1') card.append(el('p', 'watch-end-fact', t('watch.end.vostokFact')));
  }

  /**
   * A9: the end card's summary, a line each — the orbit the flight ended in,
   * the payload, every stage flown home, a docking called off. `orbit` is
   * false on the docking card, which names the station instead.
   */
  private summaryLines(s: WatchSummary, frame: VisualFrame, orbit: boolean): string[] {
    const lines: string[] = [];
    const liftoff = Math.max(0, frame.liftoffT ?? 0);
    if (orbit && s.orbit) {
      lines.push(t(s.orbit.onTarget ? 'watch.end.orbit' : 'watch.end.orbitOff', { pe: num(s.orbit.pe), ap: num(s.orbit.ap), inc: num(s.orbit.inc, 1) }));
    }
    if (orbit && s.payloadAt !== null) {
      const key = this.missionId ? watchMissionById(this.missionId)?.payloadKey : undefined;
      const name = key ? t(key) : s.payloadId ? satelliteNameById(s.payloadId) : null;
      const time = fmtSpan(s.payloadAt - liftoff);
      lines.push(name ? t('watch.end.payload', { name, time }) : t('watch.end.payloadAny', { time }));
    }
    for (const r of s.recovery) {
      const name = stageNameByLabel(this.vehicle, r.name);
      lines.push(r.outcome === 'zone' ? t('watch.end.recovery.zone', { name, zone: r.zone ?? '' })
        : r.outcome === 'ship' ? t('watch.end.recovery.ship', { name })
          : r.outcome === 'tower' ? t('watch.end.recovery.tower', { name })
            : r.outcome === 'landed' ? t('watch.end.recovery.landed', { name })
              : t('watch.end.recovery.lost', { name }));
    }
    if (s.dockingAborted) lines.push(t('watch.end.rvAborted'));
    return lines;
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
    const grid = (historical: boolean): HTMLElement => {
      const g = el('div', 'watch-mission-grid');
      for (const m of WATCH_MISSIONS.filter((x) => isHistorical(x) === historical)) {
        const b = el('button', 'watch-mission');
        b.type = 'button';
        b.dataset.mission = m.id;
        if (m.id === this.missionId) b.classList.add('current');
        const spec = vehicleById(m.vehicleId);
        const tag = m.launchTime ? `${spec.name} · ${historicalDate(m.launchTime)}` : `${spec.name} · ${spec.country}`;
        b.append(el('span', 'watch-mission-vehicle', tag), el('strong', undefined, t(m.titleKey)), el('span', 'watch-mission-blurb', t(m.blurbKey)));
        b.addEventListener('click', () => this.host.start(m.id));
        g.append(b);
      }
      return g;
    };
    const history = el('h3', 'watch-pick-group', t('watch.pick.history'));
    card.replaceChildren(head, el('p', 'watch-pick-lead', t('watch.pick.lead')), grid(false),
      history, el('p', 'watch-pick-lead', t('watch.pick.historyLead')), grid(true));
    const footer = this.host.pickerFooter?.();
    if (footer) card.append(footer);
  }

  private readoutMoon = false;
  private readoutMetres = false;
  private applyUnits(): void {
    const units = [this.readoutMetres ? 'u.m' : 'u.km', 'watch.unit.kmh'];
    this.unitLabels.forEach((node, i) => { node.textContent = ` ${t(units[i])}`; });
  }

  private applyStatLabels(): void {
    const labels = this.readoutMoon ? ['watch.stat.time', 'watch.stat.moonAltitude', 'watch.stat.moonSpeed']
      : ['watch.stat.time', 'watch.stat.altitude', 'watch.stat.speed'];
    this.statLabels.forEach((node, i) => { node.textContent = t(labels[i]); });
  }

  applyLanguage(): void {
    this.applyStatLabels();
    this.applyUnits();
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
    if (!this.endCard.hidden && this.endFrame) this.showEnd(this.endFrame.frame, this.endFrame.ending, this.endFrame.summary);
    this.milestoneEyebrow.textContent = t('watch.parking.eyebrow');
    this.moonNote.textContent = t('watch.moonScope');
    this.milestoneClose.setAttribute('aria-label', t('watch.pick.close'));
    this.milestoneClose.title = t('watch.pick.close');
    // the note's sentence is rewritten on the next update
    this.milestoneText.textContent = '';
  }
}
