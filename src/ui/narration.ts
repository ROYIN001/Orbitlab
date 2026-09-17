/**
 * Phase narration for the viewport.
 *
 * Mission commentary rather than instrumentation: an eyebrow with the flight
 * status, the name of what is happening, one sentence explaining it, and the
 * latest callout. It is driven entirely by `phaseInfo` (src/ui/phase.ts), which
 * takes the frame the user is looking at — live head or seeked replay frame —
 * so the narration rewinds with the timeline cursor like everything else.
 *
 * The mission clock, the clock context line and the "SIMULATING / PAUSED /
 * REPLAY" chip are written from here too: all four are the same story told at
 * different lengths, and keeping them in one place is what stops the chip from
 * saying "PAUSED" while the clock is still running.
 *
 * Every write is `textContent` on a node built once in the constructor. No
 * `innerHTML`, so a dictionary string is never parsed as markup (audit B38).
 */
import type { VisualFrame } from '../physics/frame';
import type { SimEvent } from '../physics/simulation';
import type { VehicleSpec } from '../types';
import { t } from '../i18n';
import { fmtTime } from './hud';
import { localizeEventParams } from './names';
import { phaseInfo } from './phase';

export interface NarrationState {
  /** the cursor is behind the recording head */
  replay: boolean;
  /** whatever is moving (live flight or replay cursor) is running */
  playing: boolean;
  /** a mission exists at all */
  armed: boolean;
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  return e;
}

export class Narration {
  private label: HTMLElement;
  private title: HTMLElement;
  private detail: HTMLElement;
  private eventLabel: HTMLElement;
  private eventText: HTMLElement;
  private clock: HTMLElement | null;
  private clockContext: HTMLElement | null;
  private stateText: HTMLElement | null;
  private missionName: HTMLElement | null;
  private missionEyebrow: HTMLElement | null;
  private vehicleName = '';
  private payloadName = '';
  /** the flying vehicle, for the stage names the latest callout carries */
  private vehicle: VehicleSpec | null = null;
  /** last rendered strings, so a 10 Hz update writes nothing when nothing moved */
  private shown = { label: '', title: '', detail: '', event: '', clock: '', ctx: '', state: '' };

  constructor(root: HTMLElement) {
    root.className = 'narration';
    this.label = el('span', 'eyebrow phase-label');
    this.title = el('h3', 'phase-title');
    this.detail = el('p', 'phase-detail');
    const evt = el('div', 'latest-event');
    this.eventLabel = el('span', 'eyebrow');
    this.eventText = el('p');
    this.eventText.setAttribute('aria-live', 'polite');
    evt.append(this.eventLabel, this.eventText);
    root.replaceChildren(this.label, this.title, this.detail, evt);
    this.clock = document.getElementById('clock');
    this.clockContext = document.getElementById('clock-context');
    this.stateText = document.getElementById('sim-state-text');
    this.missionName = document.getElementById('mission-name');
    this.missionEyebrow = document.getElementById('mission-eyebrow');
    this.applyLanguage();
  }

  /**
   * The mission whose events the latest-callout line is rendering.
   *
   * The callout is `t(event.key, params)`, and those params carry stage and
   * booster names written in English by the physics; without the spec they
   * printed untranslated inside a Russian or Thai sentence, the same defect
   * release review 2 raised for the spacecraft name (major #1). The spacecraft
   * itself resolves from the event's own `satId` and needs no spec.
   */
  setVehicle(spec: VehicleSpec | null): void {
    if (spec === this.vehicle) return;
    this.vehicle = spec;
    this.shown.event = ''; // force the callout to be written again
  }

  /** Proper names, which stay untranslated (audit B38: vehicles and sites are proper nouns). */
  setMission(vehicleName: string, payloadName: string): void {
    this.vehicleName = vehicleName;
    this.payloadName = payloadName;
    this.renderMissionName();
  }

  private renderMissionName(): void {
    if (!this.missionName) return;
    this.missionName.replaceChildren();
    this.missionName.append(document.createTextNode(this.vehicleName));
    const sep = el('span');
    sep.textContent = '/';
    this.missionName.append(sep, document.createTextNode(this.payloadName));
  }

  applyLanguage(): void {
    this.eventLabel.textContent = t('narr.latestEvent');
    if (this.missionEyebrow) this.missionEyebrow.textContent = t('narr.mission');
    this.shown = { label: '', title: '', detail: '', event: '', clock: '', ctx: '', state: '' };
    this.renderMissionName();
  }

  reset(): void {
    this.shown = { label: '', title: '', detail: '', event: '', clock: '', ctx: '', state: '' };
  }

  update(frame: VisualFrame | null, events: SimEvent[], st: NarrationState): void {
    const info = phaseInfo(frame, events);
    const label = frame ? t(`hud.status.${frame.status}`) : t('hud.status.prelaunch');
    const title = t(info.titleKey);
    const detail = t(info.detailKey, info.params);
    const last = info.lastEvent;
    const event = last ? `${fmtTime(last.t)} · ${t(last.key, localizeEventParams(this.vehicle, last.params))}` : t('narr.standby');
    // The title and the status can be the same word ("Countdown", "In orbit").
    // Printing it twice reads as a stutter, so the eyebrow yields to the title.
    const eyebrow = label === title ? t('narr.mission') : label;
    if (eyebrow !== this.shown.label) { this.label.textContent = eyebrow; this.shown.label = eyebrow; }
    if (title !== this.shown.title) { this.title.textContent = title; this.shown.title = title; }
    if (detail !== this.shown.detail) { this.detail.textContent = detail; this.shown.detail = detail; }
    if (event !== this.shown.event) {
      this.eventText.textContent = event;
      this.eventText.className = last ? last.severity : '';
      this.shown.event = event;
    }
    const tNow = frame ? frame.t : -10;
    const clock = fmtTime(tNow);
    if (this.clock && clock !== this.shown.clock) { this.clock.textContent = clock; this.shown.clock = clock; }
    const ctx = st.replay ? t('clock.replay') : tNow < 0 ? t('clock.countdown') : t('clock.met');
    if (this.clockContext && ctx !== this.shown.ctx) { this.clockContext.textContent = ctx; this.shown.ctx = ctx; }
    const state = this.simState(frame, st);
    if (this.stateText && state !== this.shown.state) { this.stateText.textContent = state; this.shown.state = state; }
  }

  private simState(frame: VisualFrame | null, st: NarrationState): string {
    if (!st.armed || !frame) return t('sim.standby');
    if (frame.status === 'failed') return t('sim.ended');
    if (st.replay) return t('sim.replay');
    if (frame.status === 'prelaunch' && !st.playing) return t('sim.standby');
    if (!st.playing) return t('sim.paused');
    if (frame.status === 'orbit') return t('sim.orbit');
    return t('sim.simulating');
  }
}
