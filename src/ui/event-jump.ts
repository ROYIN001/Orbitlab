/**
 * R2.6 (M-LAUNCH-062): the event-jump menu's list, DOM-free.
 *
 * Explore and Engineer list one entry per kind of key event in a menu opened
 * from the playback controls (`Timeline` builds it); choosing one seeks to
 * `JUMP_LEAD_S` before the event's recorded time (`App.seekToEvent`). A jump
 * does not choose a view. A view you picked stays. With Cinematic on, the
 * camera programme shows its own view for the phase you land in.
 *
 * Only recorded events are ever passed in, so nothing past the recording's
 * head is listed.
 */
import type { SimEvent } from '../physics/simulation';
import { INSERTION } from '../replay/reference';

/** How far before the event a jump lands, s. */
export const JUMP_LEAD_S = 5;

/** The kinds of key event a jump goes to. */
export const JUMP_KINDS = ['failure', 'liftoff', 'maxQ', 'staging', 'insertion', 'fairing', 'landing'] as const;
export type JumpKind = typeof JUMP_KINDS[number];

export const KEYS: Record<Exclude<JumpKind, 'failure'>, readonly string[]> = {
  liftoff: ['evt.liftoff'],
  maxQ: ['evt.maxQ'],
  staging: ['evt.boosterSep', 'evt.stageSep'],
  insertion: INSERTION,
  fairing: ['evt.fairingSep'],
  // every landing, splashdown or touchdown the simulation records (src/physics)
  landing: ['evt.boosterLanded', 'evt.boosterLandedZone', 'evt.boosterLandedShip', 'evt.boosterCaught', 'evt.shipSplashdown',
    'evt.capsuleSplashdown', 'evt.capsuleLanding', 'evt.escapeLanded', 'evt.cmSplashdown', 'evt.pilotLanding', 'evt.lunarLanding'],
};

export interface QuickEvent {
  kind: JumpKind;
  event: SimEvent;
}

function kindOf(e: SimEvent): JumpKind | null {
  if (e.severity === 'fail') return 'failure';
  for (const k of JUMP_KINDS) if (k !== 'failure' && KEYS[k].includes(e.key)) return k;
  return null;
}

/**
 * How much of the transport row gives way (`App.bindControls` measures,
 * src/style.css applies): 0 nothing, 1 the row's two column gaps narrow, 2 the
 * warp control's word as well, 3 the jump opener's word as well. `heightAt`
 * measures the row's height at a level; the lowest level at which the row is
 * least tall (to 0.5 px) is kept: the first one-line level where there is one,
 * and elsewhere a word stays unless hiding it saves height (a line, or the
 * clock kept on the first line).
 */
export function fitLevel(heightAt: (level: number) => number): number {
  const h = [0, 1, 2, 3].map(heightAt);
  return h.findIndex((x) => x <= Math.min(...h) + 0.5);
}

/** The earliest recorded event of each kind, in time order. */
export function quickEvents(events: readonly SimEvent[]): QuickEvent[] {
  const first = new Map<JumpKind, SimEvent>();
  for (const e of events) {
    const k = kindOf(e);
    if (k && (!first.has(k) || e.t < first.get(k)!.t)) first.set(k, e);
  }
  return [...first].map(([kind, event]) => ({ kind, event })).sort((a, b) => a.event.t - b.event.t);
}
