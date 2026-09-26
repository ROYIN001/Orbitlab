/**
 * Phase narration data.
 *
 * Turns the frame the user is looking at (live or seeked) plus the recorded
 * event log into what a mission commentary needs: what is happening now, a
 * one-line explanation of it, the last callout and the next one. It returns
 * i18n keys and parameters only — no markup, no formatting, no DOM — so the
 * design wave can style the narration block however it likes, and so the same
 * data can drive a screen reader or a future caption track.
 */
import type { VisualFrame } from '../physics/frame';
import type { DescentPhase, SimEvent } from '../physics/simulation';
import type { EscapePhase } from '../physics/rigid/escape';
import { RAD } from '../physics/constants';
import { t } from '../i18n';
import { rendezvousBurnName } from './names';

export interface PlannedEvent {
  t: number;
  key: string;
  params?: Record<string, string | number>;
  /** true when this is a scheduled burn rather than something already recorded */
  planned: boolean;
}

export interface PhaseInfo {
  /** i18n key of the phase title ('Gravity turn', 'Orbital burn', …) */
  titleKey: string;
  /** i18n key of a one-sentence explanation of the phase */
  detailKey: string;
  /** substitution parameters for `detailKey` */
  params: Record<string, string | number>;
  /** the most recent event at or before the displayed instant */
  lastEvent: SimEvent | null;
  /** the next event: recorded when replaying behind the head, else the next planned burn */
  nextEvent: PlannedEvent | null;
}

const EMPTY: Record<string, string | number> = {};

/** Label of each part of a returning ship's descent. */
/** G06: a launch abort's progress (`EscapePhase`), as a title. */
export const ABORT_PHASE_KEYS: Readonly<Record<EscapePhase, string>> = {
  escape: 'hud.abort.escape', coast: 'hud.abort.coast', fall: 'hud.abort.fall', drogue: 'hud.abort.drogue', main: 'hud.abort.main', landed: 'hud.abort.landed',
};

export const DESCENT_PHASE_KEYS: Readonly<Record<DescentPhase, string>> = {
  coast: 'hud.descent.coast', entry: 'hud.descent.entry', bellyflop: 'hud.descent.bellyflop',
  flip: 'hud.descent.flip', landing: 'hud.descent.landing',
};

/** Phase title, detail and surrounding events for one instant of the flight. */
export function phaseInfo(frame: VisualFrame | null, events: readonly SimEvent[]): PhaseInfo {
  if (!frame) {
    return { titleKey: 'hud.status.prelaunch', detailKey: 'phase.detail.prelaunch', params: EMPTY, lastEvent: null, nextEvent: null };
  }
  let titleKey: string;
  let detailKey: string;
  const params: Record<string, string | number> = {};
  switch (frame.status) {
    case 'prelaunch':
      titleKey = 'hud.status.prelaunch';
      detailKey = 'phase.detail.prelaunch';
      params.t = Math.abs(frame.t).toFixed(0);
      break;
    case 'ascent':
      titleKey = frame.ascentPhase ? `hud.phase.${frame.ascentPhase}` : 'hud.status.ascent';
      detailKey = frame.ascentPhase ? `phase.detail.${frame.ascentPhase}` : 'phase.detail.ascent';
      params.alt = (frame.altitude / 1000).toFixed(1);
      params.speed = frame.speed.toFixed(0);
      break;
    case 'coast':
      titleKey = 'hud.status.coast';
      // nextBurnTime is -1 when nothing is scheduled, which is "greater than t"
      // for the whole count-down: a planned burn must also be in the future.
      detailKey = hasNextBurn(frame) ? 'phase.detail.coastToBurn' : 'phase.detail.coast';
      params.tgo = Math.max(0, frame.nextBurnTime - frame.t).toFixed(0);
      params.ap = fmtAlt(frame.elements.apoapsisAlt);
      break;
    case 'burn':
      titleKey = 'hud.status.burn';
      detailKey = 'phase.detail.burn';
      params.dv = frame.dvRemaining.toFixed(0);
      break;
    case 'rendezvous':
      rendezvousPhase(frame, params);
      titleKey = `hud.rv.${frame.rendezvous?.phase ?? 'separation'}`;
      detailKey = `phase.detail.rv.${frame.rendezvous?.phase ?? 'separation'}`;
      break;
    case 'orbit':
      if (frame.rendezvous && (frame.rendezvous.phase === 'docked' || frame.rendezvous.phase === 'aborted')) {
        rendezvousPhase(frame, params);
        titleKey = `hud.rv.${frame.rendezvous.phase}`;
        detailKey = `phase.detail.rv.${frame.rendezvous.phase}`;
        break;
      }
      titleKey = 'hud.status.orbit';
      detailKey = frame.payloadSeparated ? 'phase.detail.deployed' : 'phase.detail.orbit';
      params.ap = fmtAlt(frame.elements.apoapsisAlt);
      params.pe = fmtAlt(frame.elements.periapsisAlt);
      params.inc = (frame.elements.i * RAD).toFixed(2);
      break;
    case 'descent':
      titleKey = frame.descentPhase ? DESCENT_PHASE_KEYS[frame.descentPhase] : 'hud.status.descent';
      detailKey = 'phase.detail.descent';
      params.alt = (frame.altitude / 1000).toFixed(1);
      params.speed = frame.airspeed.toFixed(0);
      break;
    case 'abort':
      // C01: a capsule flying home from a suborbital flight is no abort
      titleKey = frame.abort?.kind === 'return' && frame.abort.phase === 'fall' ? 'hud.capsule.fall'
        : frame.abort ? ABORT_PHASE_KEYS[frame.abort.phase] : 'hud.status.abort';
      detailKey = frame.abort?.kind === 'return' ? 'phase.detail.capsule' : 'phase.detail.abort';
      params.alt = (frame.altitude / 1000).toFixed(1);
      params.speed = frame.airspeed.toFixed(0);
      params.g = frame.gLoad.toFixed(1);
      break;
    case 'landed':
      if (frame.abort) {
        // the crew's descent module, down after an abort — or a capsule home as planned (C01)
        const planned = frame.abort.kind === 'return';
        titleKey = planned ? 'hud.capsule.landed' : 'hud.abort.landed';
        detailKey = planned ? 'phase.detail.capsuleLanded' : 'phase.detail.abortLanded';
        params.km = (frame.downrange / 1000).toFixed(1);
        params.g = frame.abort.maxG.toFixed(1);
        break;
      }
      titleKey = 'hud.status.landed';
      detailKey = 'phase.detail.landed';
      params.lat = frame.lat.toFixed(2);
      params.lon = frame.lon.toFixed(2);
      break;
    default:
      titleKey = 'hud.status.failed';
      detailKey = 'phase.detail.failed';
      params.t = frame.t.toFixed(0);
      break;
  }
  let lastEvent: SimEvent | null = null;
  let nextEvent: PlannedEvent | null = null;
  for (const e of events) {
    if (e.t <= frame.t + 1e-6) lastEvent = e;
    else { nextEvent = { t: e.t, key: e.key, params: e.params, planned: false }; break; }
  }
  if (!nextEvent && hasNextBurn(frame)) {
    // a rendezvous names its next burn (the time is the burn's centre)
    const next = frame.rendezvous?.burns.find((b) => !b.done);
    nextEvent = next && frame.status === 'rendezvous'
      ? { t: next.t, key: 'evt.rendezvousBurn', params: { burn: next.id, dv: next.dv }, planned: true }
      : { t: frame.nextBurnTime, key: 'evt.burnStart', planned: true };
  }
  return { titleKey, detailKey, params, lastEvent, nextEvent };
}

/** A distance for the rendezvous narration: kilometres to 2 decimals from 1 km out, metres inside. */
export function rendezvousRange(m: number): { range: string; unit: string } {
  return m >= 1000 ? { range: (m / 1000).toFixed(m >= 100e3 ? 0 : 2), unit: t('rv.unit.km') } : { range: m.toFixed(0), unit: t('rv.unit.m') };
}

/** The parameters of a rendezvous's phase detail. */
function rendezvousPhase(frame: VisualFrame, params: Record<string, string | number>): void {
  const rv = frame.rendezvous;
  if (!rv) return;
  Object.assign(params, rendezvousRange(rv.range));
  params.rate = rv.rangeRate.toFixed(2);
  params.ap = fmtAlt(frame.elements.apoapsisAlt);
  params.pe = fmtAlt(frame.elements.periapsisAlt);
  const next = rv.burns.find((b) => !b.done);
  params.tgo = next ? fmtDuration(next.t - frame.t) : '—';
  const burn = rv.burn ? rv.burns.find((b) => b.id === rv.burn) : undefined;
  params.burn = burn ? rendezvousBurnName(burn.id) : '';
  params.dv = burn ? burn.dv.toFixed(1) : '0';
  params.axial = rv.axial !== undefined ? Math.max(0, rv.axial).toFixed(1) : '—';
  params.lateral = rv.lateral !== undefined ? rv.lateral.toFixed(2) : '—';
  params.port = t(`rv.port.${rv.port}`);
  if (rv.dockedAt !== undefined) params.hours = (rv.dockedAt / 3600).toFixed(2);
}

/** A span of time as h:mm:ss or m:ss. */
function fmtDuration(s: number): string {
  const x = Math.max(0, Math.round(s));
  const h = Math.floor(x / 3600), m = Math.floor((x % 3600) / 60), sec = x % 60;
  const p = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${p(m)}:${p(sec)}` : `${m}:${p(sec)}`;
}

/** A burn is scheduled and still ahead of this frame. */
export function hasNextBurn(frame: VisualFrame): boolean {
  return frame.nextBurnTime > 0 && frame.nextBurnTime > frame.t;
}

function fmtAlt(m: number): string {
  return isFinite(m) ? (m / 1000).toFixed(0) : '∞';
}

/**
 * Short, chip-sized label for an event ("MECO", "Booster sep"), falling back to
 * the full callout when no short form is defined for that key. `t` returns the
 * key itself for a missing entry, which is how the fallback is detected.
 */
export function eventLabel(key: string, params?: Record<string, string | number>): string {
  const short = `tl.${key}`;
  const s = t(short);
  return s === short ? t(key, params) : s;
}
