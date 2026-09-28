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
import { APOLLO_AT_MOON } from '../physics/sim/apollo';
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
      if (frame.apollo) {
        // C01: Apollo from its parking orbit
        titleKey = `hud.apollo.${frame.apollo.phase}`;
        detailKey = `phase.detail.apollo.${frame.apollo.phase}`;
        params.ap = fmtAlt(frame.elements.apoapsisAlt);
        params.pe = fmtAlt(frame.elements.periapsisAlt);
        params.tgo = fmtClockShort(Math.max(0, frame.apollo.tliTime - frame.t));
        params.speed = Math.round(frame.speed).toString();
        params.alt = Math.round(frame.altitude / 1000).toString();
        // on the way to the Moon: how far off it is and how fast it comes, the closest approach and when
        const ap = frame.apollo;
        params.moon = Math.round(ap.moon.alt / 1000).toString();
        params.mspeed = Math.round(ap.moon.speed).toString();
        params.peri = ap.perilune ? Math.round(ap.perilune.alt / 1000).toString() : '—';
        params.arr = ap.perilune ? fmtClockShort(Math.max(0, ap.perilune.t - frame.t)) : '—';
        params.dv = ap.mcc ? ap.mcc.dv.toFixed(1) : '—';
        // coming down: the program flying it, the height over the ground (m), the distance to go (km), the speeds
        if (ap.descent) {
          const d = ap.descent;
          params.program = d.phase === 'braking' ? 'P63' : d.phase === 'approach' ? 'P64' : 'P66';
          params.galt = Math.round(Math.max(0, d.alt)).toString();
          params.range = (d.range / 1000).toFixed(1);
          params.vh = Math.round(d.vh).toString();
          params.vz = Math.round(-d.vz).toString();
          params.thr = Math.round(d.throttle * 100).toString();
        }
        if (ap.landed) { params.lat = ap.landed.lat.toFixed(3); params.lon = ap.landed.lon.toFixed(3); }
        // back to Columbia: the range to it (km), the rate it closes at (m/s), the height between the orbits (km), its elevation
        if (ap.rendezvous) {
          const r = ap.rendezvous;
          params.rng = r.range >= 10e3 ? Math.round(r.range / 1000).toString() : (r.range / 1000).toFixed(r.range >= 1e3 ? 1 : 2);
          params.rdot = r.closing.toFixed(1);
          params.dh = (r.dh / 1000).toFixed(1);
          params.el = r.elevation.toFixed(1);
          params.rngm = Math.round(r.range).toString();
        }
        // home: the entry ahead, the entry itself, the parachutes
        if (ap.interfaceAhead) {
          params.fpa = ap.interfaceAhead.fpa.toFixed(2);
          params.eta = fmtClockShort(Math.max(0, ap.interfaceAhead.t - frame.t));
        }
        if (ap.entry) {
          params.bank = Math.round(Math.abs(ap.entry.bank)).toString();
          params.side = ap.entry.bank >= 0 ? t('phase.detail.apollo.right') : t('phase.detail.apollo.left');
          params.load = ap.entry.load.toFixed(1);
          params.maxg = ap.entry.maxLoad.toFixed(1);
          params.ekm = Math.round(frame.altitude / 1000).toString();
          params.em = Math.round(frame.altitude).toString();
          params.espeed = Math.round(frame.airspeed).toString();
        }
        if (ap.splash) { params.slat = Math.abs(ap.splash.lat).toFixed(2); params.slon = Math.abs(ap.splash.lon).toFixed(2); }
        // in lunar orbit, the orbit is the Moon's: above the landing site's radius, against its equator
        if (ap.lunar) {
          params.ap = Math.round(ap.lunar.ap / 1000).toString();
          params.pe = Math.round(ap.lunar.pe / 1000).toString();
          params.inc = ap.lunar.inc.toFixed(1);
        }
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

/** A countdown as h:mm:ss (m:ss under an hour). */
function fmtClockShort(s: number): string {
  const total = Math.round(s), h = Math.floor(total / 3600), m = Math.floor((total % 3600) / 60), sec = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
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

/**
 * The status the HUD and the narration print: the simulation's own, save for
 * Apollo on its way (C01), which is not "in orbit" between the Earth and the
 * Moon, in lunar orbit, coming down to the Moon or on it.
 */
export function statusKey(frame: VisualFrame): string {
  const ap = frame.apollo;
  if (ap?.phase === 'splashdown') return 'hud.status.splashdown';
  if (ap && frame.status === 'orbit') {
    if (ap.phase === 'landed') return 'hud.status.onMoon';
    if (ap.phase === 'descent') return 'hud.status.lunarDescent';
    if (ap.phase === 'ascent') return 'hud.status.lunarAscent';
    if (ap.phase === 'transearth' || ap.phase === 'returnMidcourse') return 'hud.status.homeward';
    if (ap.phase === 'cmSeparated' || ap.phase === 'entry') return 'hud.status.entry';
    if (ap.phase === 'drogues' || ap.phase === 'mains') return 'hud.status.descent';
    if (APOLLO_AT_MOON.includes(ap.phase) && ap.phase !== 'approach') return 'hud.status.lunarOrbit';
    if (ap.phase !== 'parking' && ap.phase !== 'tli') return 'hud.status.translunar';
  }
  return `hud.status.${frame.status}`;
}

